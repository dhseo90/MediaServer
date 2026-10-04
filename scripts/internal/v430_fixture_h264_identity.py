#!/usr/bin/env python3
# 파일 용도: 개발 UI fixture의 H.264 식별자를 확장하고 원본 보존을 검증한다.
"""개발 UI fixture 전용 H.264 CAVLC frame_num 확장. 제품 입력/decoder로 사용하지 않는다."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re

VERSION = "v430-fixture-h264-cavlc-frame-num12-v1"
CAP_BYTES = 16 * 1024 * 1024
HIGH_PROFILES = {100, 110, 122, 244, 44, 83, 86, 118, 128, 138, 139, 134, 135}


def require(value, reason):
    if not value:
        raise ValueError(reason)


def sha(value):
    return hashlib.sha256(value).hexdigest()


def bit_text(value):
    require(0 < len(value) <= 2 * 1024 * 1024, "nal-size")
    return format(int.from_bytes(value, "big"), f"0{len(value)*8}b")


def ue_bits(value):
    require(isinstance(value, int) and 0 <= value < 2**31, "ue-output-range")
    binary = bin(value + 1)[2:]
    return "0" * (len(binary) - 1) + binary


def se_bits(value):
    return ue_bits(2 * value - 1 if value > 0 else -2 * value)


def rbsp_bytes(bits):
    require(bits and "1" in bits, "rbsp-empty")
    bits += "1"
    bits += "0" * (-len(bits) % 8)
    return int(bits, 2).to_bytes(len(bits) // 8, "big")


class Bits:
    def __init__(self, value):
        self.bits = bit_text(value)
        self.position = 0

    def u(self, count):
        require(0 <= count <= 32 and self.position + count <= len(self.bits), "truncated-bits")
        value = int(self.bits[self.position:self.position + count], 2) if count else 0
        self.position += count
        return value

    def ue(self, cap=2**31 - 1):
        count = 0
        while self.u(1) == 0:
            count += 1
            require(count <= 30, "ue-too-long")
        value = (1 << count) - 1 + self.u(count)
        require(value <= cap, "ue-range")
        return value

    def se(self, minimum=-2**30, maximum=2**30):
        value = self.ue()
        signed = (value + 1) // 2 if value & 1 else -(value // 2)
        require(minimum <= signed <= maximum, "se-range")
        return signed

    def more(self):
        suffix = self.bits[self.position:]
        return not (1 <= len(suffix) <= 8 and suffix == "1" + "0" * (len(suffix) - 1))

    def finish(self):
        require(not self.more(), "rbsp-trailing-bits")


def unescape(value):
    result = bytearray()
    zeros = 0
    i = 0
    while i < len(value):
        byte = value[i]
        if zeros == 2:
            if byte == 3:
                require(i + 1 < len(value) and value[i + 1] <= 3, "invalid-epb")
                zeros = 0
                i += 1
                continue
            require(byte > 2, "missing-epb")
        result.append(byte)
        zeros = zeros + 1 if byte == 0 else 0
        i += 1
    require(result and result[-1] != 0, "rbsp-final-zero")
    return bytes(result)


def escape(value):
    result = bytearray()
    zeros = 0
    for byte in value:
        if zeros == 2 and byte <= 3:
            result.append(3)
            zeros = 0
        result.append(byte)
        zeros = zeros + 1 if byte == 0 else 0
    return bytes(result)


def nals(value):
    require(0 < len(value) <= CAP_BYTES, "annexb-size")
    starts = list(re.finditer(b"\x00\x00(?:\x00)?\x01", value))
    require(starts and not value[:starts[0].start()].strip(b"\0"), "annexb-prefix")
    result = []
    for i, match in enumerate(starts):
        end = starts[i + 1].start() if i + 1 < len(starts) else len(value)
        nal = value[match.end():end].rstrip(b"\0")
        require(len(nal) >= 2 and len(nal) <= 2 * 1024 * 1024 and not nal[0] & 128, "nal-header-size")
        payload = unescape(nal[1:])
        require(escape(payload) == nal[1:], "noncanonical-epb")
        result.append((nal[0], payload))
    require(len(result) <= 1024, "nal-count")
    return result


def parse_sps(value):
    b = Bits(value)
    profile = b.u(8)
    require(b.u(8) & 3 == 0, "sps-reserved-bits")
    level = b.u(8)
    identifier = b.ue(31)
    require(profile in HIGH_PROFILES, "sps-lossless-profile")
    chroma, depth_luma, depth_chroma = 1, 0, 0
    if profile in HIGH_PROFILES:
        chroma = b.ue(3)
        require(chroma == 1, "sps-chroma420")
        depth_luma, depth_chroma = b.ue(6), b.ue(6)
        require(depth_luma == depth_chroma == 0, "sps-8bit")
        require(b.u(1) == 1, "sps-lossless-transform-bypass")
        require(b.u(1) == 0, "sps-scaling-matrix")
    begin = b.position
    require(b.ue(12) == 0, "sps-frame-num4")
    end = b.position
    require(b.ue(2) == 2, "sps-poc2")
    require(b.ue(16) == 1, "sps-reference1")
    require(b.u(1) == 0, "sps-gaps")
    width_mbs, height_map = b.ue(1023) + 1, b.ue(1023) + 1
    require(b.u(1) == 1, "sps-progressive")
    b.u(1)  # direct_8x8_inference_flag
    crop = [0, 0, 0, 0]
    if b.u(1):
        crop = [b.ue(16384) for _ in range(4)]
    width = width_mbs * 16 - 2 * (crop[0] + crop[1])
    height = height_map * 16 - 2 * (crop[2] + crop[3])
    require(width == 1280 and height == 720, "sps-1280x720")
    if b.u(1):
        if b.u(1):
            if b.u(8) == 255:
                require(b.u(16) > 0 and b.u(16) > 0, "vui-aspect-ratio")
        if b.u(1):
            b.u(1)
        if b.u(1):
            b.u(3)
            b.u(1)
            if b.u(1):
                b.u(8); b.u(8); b.u(8)
        if b.u(1):
            b.ue(5); b.ue(5)
        if b.u(1):
            units, scale = b.u(32), b.u(32)
            b.u(1)
            require(units > 0 and scale == 60 * units, "vui-30fps")
        require(b.u(1) == 0 and b.u(1) == 0, "vui-hrd-unsupported")
        require(b.u(1) == 0, "vui-pic-struct")
        if b.u(1):
            b.u(1)
            b.ue(16); b.ue(16); b.ue(16); b.ue(16)
            require(b.ue(16) == 0 and b.ue(16) == 1, "vui-reorder-dpb1")
    b.finish()
    stop = b.position
    rewritten = rbsp_bytes(b.bits[:begin] + ue_bits(8) + b.bits[end:stop])
    return {"id": identifier, "profile": profile, "level": level, "width": width, "height": height,
            "oldFrameNumBits": 4, "newFrameNumBits": 12, "pocType": 2}, rewritten


def parse_pps(value, sps):
    b = Bits(value)
    identifier = b.ue(255)
    require(b.ue(31) == sps["id"], "pps-sps-id")
    require(b.u(1) == 0, "pps-cavlc")
    require(b.u(1) == 0, "pps-bottom-field-order")
    require(b.ue(7) == 0, "pps-fmo")
    require(b.ue(31) == 0 and b.ue(31) == 0, "pps-default-reference1")
    require(b.u(1) == 0 and b.u(2) == 0, "pps-weighted-pred-unsupported")
    qp = b.se(-26, 25)
    b.se(-26, 25)
    require(b.se(-12, 12) == 0, "pps-chroma-qp")
    deblock = b.u(1)
    require(b.u(1) == 0 and b.u(1) == 0, "pps-constrained-redundant")
    if b.more():
        require(b.u(1) == 0 and b.u(1) == 0, "pps-8x8-scaling-unsupported")
        require(b.se(-12, 12) == 0, "pps-second-chroma-qp")
    b.finish()
    return {"id": identifier, "qp": qp, "deblockPresent": deblock}


def parse_slice(header, value, pps, ordinal):
    kind, reference = header & 31, (header >> 5) & 3
    require(reference > 0, "slice-nonreference")
    require((ordinal == 1 and kind == 5) or (ordinal > 1 and kind == 1), "slice-single-initial-idr")
    b = Bits(value)
    require(b.ue(100000) == 0, "slice-first-mb-single-slice")
    slice_type = b.ue(9) % 5
    require(slice_type == (2 if ordinal == 1 else 0), "slice-idr-i-or-reference-p")
    require(b.ue(255) == pps["id"], "slice-pps-id")
    begin = b.position
    old = b.u(4)
    end = b.position
    require(old == (ordinal - 1) % 16, "slice-sequential-frame-num")
    if kind == 5:
        b.ue(65535)
    if slice_type == 0:
        if b.u(1):
            require(b.ue(31) == 0, "slice-active-reference1")
        require(b.u(1) == 0, "slice-reference-list-change")
    if kind == 5:
        require(b.u(1) == 0 and b.u(1) == 0, "slice-idr-output-longterm")
    else:
        require(b.u(1) == 0, "slice-adaptive-mmco")
    delta = b.se(-51, 51)
    require(26 + pps["qp"] + delta == 0, "slice-qp0")
    if pps["deblockPresent"]:
        disabled = b.ue(2)
        if disabled != 1:
            b.se(-6, 6); b.se(-6, 6)
    header_end = b.position
    require(b.bits.rfind("1") >= header_end, "slice-empty-suffix")
    # +8bit이므로 I_PCM 내부 정렬과 기존 RBSP stop/padding까지 같은 byte phase로 보존한다.
    rewritten_bits = b.bits[:begin] + format(ordinal - 1, "012b") + b.bits[end:]
    require(len(rewritten_bits) == len(b.bits) + 8, "slice-byte-phase")
    suffix = b.bits[header_end:]
    require(rewritten_bits[header_end + 8:] == suffix, "slice-opaque-suffix-exact")
    rewritten = int(rewritten_bits, 2).to_bytes(len(rewritten_bits) // 8, "big")
    return {"ordinal": ordinal, "oldFrameNum": old, "newFrameNum": ordinal - 1,
            "nalType": kind, "nalRefIdc": reference, "suffixSha256": sha(suffix.encode("ascii")),
            "opaqueSuffixBits": len(suffix), "bytePhasePreserved": True}, rewritten


def transform(value):
    output = bytearray()
    sps, pps, samples = None, None, []
    for header, rbsp in nals(value):
        kind = header & 31
        if kind == 7:
            require(sps is None and not samples, "sps-middle-or-multiple")
            sps, rewritten = parse_sps(rbsp)
        elif kind == 8:
            require(sps is not None and pps is None and not samples, "pps-middle-or-multiple")
            pps = parse_pps(rbsp, sps)
            rewritten = rbsp
        elif kind in {1, 5}:
            require(sps is not None and pps is not None and len(samples) < 240, "slice-parameters-count")
            sample, rewritten = parse_slice(header, rbsp, pps, len(samples) + 1)
            samples.append(sample)
        elif kind in {6, 9}:
            rewritten = rbsp
        else:
            raise ValueError("unsupported-nal-type")
        output += b"\0\0\0\1" + bytes([header]) + escape(rewritten)
    require(len(samples) == 240 and sps is not None and pps is not None, "exact-240-reference-au")
    require(len(output) <= CAP_BYTES, "output-size")
    return bytes(output), {"transformVersion": VERSION, "developmentFixtureOnly": True, "sourceSha256": sha(value),
                           "transformedSha256": sha(output), "sps": sps, "pps": pps, "samples": samples,
                           "referenceAuCount": 240, "allOpaqueSuffixesExact": True, "allBytePhasesPreserved": True}


def self_test():
    # 규격 field 순서로 만든 parser 문법 fixture이며, 실제 media/decoded pixel 검증을 대체하지 않는다.
    sps_bits = format(244, "08b") + "00000000" + format(31, "08b") + ue_bits(0) + ue_bits(1)
    sps_bits += ue_bits(0) + ue_bits(0) + "10" + ue_bits(0) + ue_bits(2) + ue_bits(1) + "0"
    sps_bits += ue_bits(79) + ue_bits(44) + "1100"
    sps_rbsp = rbsp_bytes(sps_bits)
    sps, _ = parse_sps(sps_rbsp)
    pps_bits = ue_bits(0) + ue_bits(0) + "00" + ue_bits(0) + ue_bits(0) + ue_bits(0) + "000"
    pps_bits += se_bits(-26) + se_bits(0) + se_bits(0) + "100" + "00" + se_bits(0)
    pps_rbsp = rbsp_bytes(pps_bits)
    pps = parse_pps(pps_rbsp, sps)
    def slice_value(ordinal, first_mb=0, slice_type=None, old=None, mmco=False):
        first = ordinal == 1
        prefix = ue_bits(first_mb) + ue_bits((2 if first else 0) if slice_type is None else slice_type) + ue_bits(0)
        prefix += format((ordinal - 1) % 16 if old is None else old, "04b")
        prefix += ue_bits(0) + "00" if first else "00" + ("1" if mmco else "0")
        prefix += se_bits(0) + ue_bits(1)
        return rbsp_bytes(prefix + "010101101101101")
    def nal(header, value):
        return b"\0\0\0\1" + bytes([header]) + escape(value)
    stream = nal(0x67, sps_rbsp) + nal(0x68, pps_rbsp)
    stream += b"".join(nal(0x65 if i == 1 else 0x41, slice_value(i)) for i in range(1, 241))
    checks = []
    def reject(identifier, call):
        try:
            call()
        except ValueError as error:
            checks.append({"id": identifier, "status": "PASS", "expected": "reject", "actual": str(error)})
        else:
            raise AssertionError(identifier + " did not reject")
    reject("truncated-ue", lambda: Bits(b"\0").ue())
    reject("overlong-ue", lambda: Bits(b"\0" * 5).ue())
    reject("truncated-epb", lambda: unescape(b"\0\0\x03"))
    reject("invalid-epb-next", lambda: unescape(b"\0\0\x03\x04"))
    reject("missing-epb", lambda: unescape(b"\0\0\x02\x80"))
    reject("middle-sps", lambda: transform(stream + nal(0x67, sps_rbsp)))
    reject("middle-pps", lambda: transform(stream + nal(0x68, pps_rbsp)))
    reject("unknown-nal", lambda: transform(nal(0x6c, b"\x80") + stream))
    reject("b-slice", lambda: parse_slice(0x41, slice_value(2, slice_type=1), pps, 2))
    reject("nonreference", lambda: parse_slice(0x01, slice_value(2), pps, 2))
    reject("multiple-slice-first-mb", lambda: parse_slice(0x41, slice_value(2, first_mb=1), pps, 2))
    reject("multiple-first-slice-frame-num", lambda: parse_slice(0x41, slice_value(2), pps, 3))
    reject("adaptive-mmco", lambda: parse_slice(0x41, slice_value(2, mmco=True), pps, 2))
    reject("nonsequential-frame-num", lambda: parse_slice(0x41, slice_value(2, old=2), pps, 2))
    reject("later-idr", lambda: parse_slice(0x65, slice_value(2), pps, 2))
    reject("truncated-sps", lambda: parse_sps(sps_rbsp[:-1]))
    reject("truncated-pps", lambda: parse_pps(pps_rbsp[:-1], sps))
    reject("source-au-count239", lambda: transform(stream[:stream.rfind(b"\0\0\0\1")]))
    transformed, summary = transform(stream)
    require(summary["samples"][-1]["newFrameNum"] == 239 and summary["allBytePhasesPreserved"], "golden-12bit-last-frame")
    require(len(nals(transformed)) == 242 and summary["allOpaqueSuffixesExact"], "golden-count-suffix")
    transformed_nals = nals(transformed)
    require(bit_text(transformed_nals[2][1])[5:17] == "000000000000" and
            bit_text(transformed_nals[-1][1])[3:15] == "000011101111", "independent-golden-frame-fields")
    checks.append({"id": "grammar-positive-240-with-opaque-suffix", "status": "PASS", "expected": 239, "actual": 239})
    return {"transformVersion": VERSION, "status": "PASS", "scope": "grammar rejection/byte preservation only; no actual codec/pixel claim", "checks": checks}


def exclusive_write(path, value):
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, "wb") as output:
        output.write(value)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--input", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    if args.self_test:
        require(args.input is None and args.output is None and args.report is None, "self-test-paths")
        print(json.dumps(self_test(), separators=(",", ":")))
        return
    require(args.input is not None and args.output is not None and args.report is not None, "required-owned-paths")
    source, target, report = args.input.absolute(), args.output.absolute(), args.report.absolute()
    root = source.parent.parent
    require(root.name.startswith("media-server-visual-ui-") and root.resolve() == root and root.stat().st_uid == os.getuid()
            and source.parent.name == "input" and target.parent == source.parent and report.parent == root,
            "owned-fixture-paths")
    require(not source.is_symlink() and source.resolve() == source and source.is_file() and source.stat().st_size <= CAP_BYTES,
            "input-admission")
    require(not target.exists() and not target.is_symlink() and not report.exists() and not report.is_symlink(), "fresh-output")
    before = source.read_bytes()
    transformed, summary = transform(before)
    summary["transformCodeSha256"] = sha(Path(__file__).read_bytes())
    require(source.read_bytes() == before, "input-unchanged")
    exclusive_write(target, transformed)
    exclusive_write(report, (json.dumps(summary, separators=(",", ":")) + "\n").encode())
    print(json.dumps({"status": "TRANSFORMED", "transformVersion": VERSION, "referenceAuCount": 240,
                      "sourceSha256": summary["sourceSha256"], "transformedSha256": summary["transformedSha256"],
                      "allOpaqueSuffixesExact": True, "allBytePhasesPreserved": True}, separators=(",", ":")))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, AssertionError) as error:
        print(json.dumps({"status": "FAIL", "reason": str(error)}, separators=(",", ":")))
        raise SystemExit(1)

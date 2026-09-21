#!/usr/bin/env python3
"""검사 전용 opt-in 진단. URL/debug 원문 대신 고정 상태만 소유 JSONL에 남긴다."""
import json
import math
import os
import re
import selectors
import stat
import subprocess
import sys
import time
from urllib.parse import urlsplit

LIMIT = 8 * 1024 * 1024
METHODS = ("OPTIONS", "DESCRIBE", "SETUP", "PLAY", "TEARDOWN")


def integer(value, low=0, high=2147483647):
    if isinstance(value, bool) or not isinstance(value, int) or not low <= value <= high:
        raise ValueError("integer")
    return value


def owned_dir(root):
    if not root or not os.path.isabs(root) or os.path.realpath(root) != root:
        raise ValueError("directory")
    fd = os.open(root, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        info = os.fstat(fd)
        if not stat.S_ISDIR(info.st_mode) or stat.S_IMODE(info.st_mode) != 0o700 or info.st_uid != os.getuid():
            raise ValueError("directory")
        return fd
    except BaseException:
        os.close(fd)
        raise


def append(root, record):
    # 생산자별 record는 이 모듈만 구성한다. 임의 dict/원문을 CLI로 받지 않는다.
    allowed = {"kind", "phase", "case", "route", "pid", "alive", "listening", "readiness_curl_exit", "attempt",
               "wait_status", "wait_signal_candidate", "wait_signal_confirmed", "requests", "response_classes",
               "sdp_media_lines", "discovered_stream_lines", "unknown_lines", "partial_line",
               "request_response_correlation", "product_prepare_stage", "outcome", "output_bytes",
               "process_returncode", "elapsed_ns", "original_exit", "response_observation", "stdout_stream_lines"}
    enums = {"kind": ("launcher", "probe", "diagnostic"), "phase": ("initialized", "start", "ready", "failure", "stop", "finish"),
             "outcome": ("completed", "timeout", "output-limit", "spawn-error"),
             "request_response_correlation": ("unknown",), "product_prepare_stage": ("unknown",),
             "response_observation": ("observed", "not-observed", "incomplete")}
    mappings = {"requests": set(METHODS), "response_classes": {"1xx", "2xx", "3xx", "4xx", "5xx", "other"},
                "sdp_media_lines": {"audio", "video"}, "discovered_stream_lines": {"audio", "video"},
                "stdout_stream_lines": {"audio", "video"}}
    if not isinstance(record, dict) or set(record) - allowed:
        raise ValueError("record-fields")
    for key, value in record.items():
        if key in enums:
            if value not in enums[key]:
                raise ValueError("record-enum")
        elif key in mappings:
            if not isinstance(value, dict) or set(value) != mappings[key]:
                raise ValueError("record-map")
            for count in value.values():
                integer(count, 0, LIMIT)
        elif value is not None and not isinstance(value, (bool, int)):
            raise ValueError("record-number")
    row = dict(record, schema=1, monotonic_ns=time.monotonic_ns())
    payload = (json.dumps(row, separators=(",", ":"), sort_keys=True) + "\n").encode()
    if len(payload) > 4096:
        raise ValueError("record-size")
    directory = owned_dir(root)
    try:
        fd = os.open("codec-diagnostics.jsonl", os.O_WRONLY | os.O_APPEND | os.O_CREAT | os.O_NOFOLLOW,
                     0o600, dir_fd=directory)
        try:
            info = os.fstat(fd)
            if not stat.S_ISREG(info.st_mode) or stat.S_IMODE(info.st_mode) != 0o600 or info.st_uid != os.getuid() or info.st_nlink != 1:
                raise ValueError("file")
            if info.st_size + len(payload) > LIMIT:
                raise ValueError("file-limit")
            if os.write(fd, payload) != len(payload):
                raise OSError("short-write")
        finally:
            os.close(fd)
    finally:
        os.close(directory)


def launcher_record(phase, case, pid, alive, listening, curl_exit, attempt, wait_exit):
    if phase not in ("start", "ready", "failure", "stop"):
        raise ValueError("phase")
    for value in (alive, listening):
        integer(value, -1, 1)
    integer(curl_exit, -1, 255)
    integer(wait_exit, -1, 255)
    return {"kind": "launcher", "phase": phase, "case": integer(case, 1, 10000),
            "pid": integer(pid), "alive": alive, "listening": listening,
            "readiness_curl_exit": curl_exit, "attempt": integer(attempt, 0, 40),
            "wait_status": wait_exit, "wait_signal_candidate": wait_exit - 128 if wait_exit > 128 else None,
            "wait_signal_confirmed": False}


class Trace:
    def __init__(self):
        self.pending = b""
        self.discard = False
        self.requests = {method: 0 for method in METHODS}
        self.responses = {str(code): 0 for code in ("1xx", "2xx", "3xx", "4xx", "5xx", "other")}
        self.sdp = {"audio": 0, "video": 0}
        self.streams = {"audio": 0, "video": 0}
        self.unknown = 0
        self.partial = False
        self.incomplete = False

    def line(self, raw):
        text = raw.decode("ascii", "replace").strip()
        # FFmpeg category/object prefix는 제거만 하며 저장하지 않는다.
        text = re.sub(r"^\[[A-Za-z0-9_]+ @ 0x[0-9a-fA-F]+\]\s*", "", text)
        request = re.fullmatch(r"(OPTIONS|DESCRIBE|SETUP|PLAY|TEARDOWN) [^\s]+ RTSP/1\.0", text)
        # FFmpeg 8.0.1 rtsp.c의 line='%s' 바깥 wrapper만 제거한다.
        # 임의 prefix/suffix, 중첩 quote, 잘린 wrapper를 응답으로 복구하지 않는다.
        wrapped = re.fullmatch(r"line='([^'\r\n]*)'", text)
        response_text = wrapped[1] if wrapped else text
        response = re.fullmatch(r"RTSP/1\.0 ([0-9]{3})(?: [\x20-\x7e]*)?", response_text)
        media = re.match(r"m=(audio|video) [0-9]+ [^\s]+(?: |$)", text)
        stream = re.match(r"Stream #[0-9]+:[0-9]+(?:\([^)]*\))?(?:\[[^]]*\])?: (Audio|Video):", text)
        if request:
            self.requests[request[1]] += 1
        elif response:
            code = int(response[1])
            key = str(code // 100) + "xx" if 100 <= code < 600 else "other"
            self.responses[key] += 1
        elif media:
            self.sdp[media[1]] += 1
        elif stream:
            self.streams[stream[1].lower()] += 1
        elif text:
            self.unknown += 1
            if "RTSP/" in text:
                self.incomplete = True

    def feed(self, chunk):
        for part in chunk.splitlines(keepends=True):
            ending = part.endswith((b"\n", b"\r"))
            if len(self.pending) + len(part) > 4096:
                self.pending = b""
                self.discard = True
            if not self.discard:
                self.pending += part
            if ending:
                if self.discard:
                    self.unknown += 1
                    self.incomplete = True
                else:
                    self.line(self.pending)
                self.pending = b""
                self.discard = False

    def finish(self, complete=True):
        if self.pending or self.discard:
            self.partial = True
            self.unknown += 1
        self.pending = b""
        observation = ("incomplete" if self.partial or self.incomplete or not complete else
                       "observed" if sum(self.responses.values()) else "not-observed")
        return {"requests": self.requests, "response_classes": self.responses,
                "response_observation": observation,
                "sdp_media_lines": self.sdp, "discovered_stream_lines": self.streams,
                "unknown_lines": self.unknown, "partial_line": self.partial,
                "request_response_correlation": "unknown", "product_prepare_stage": "unknown"}


def stdout_stream_lines(output):
    # codec stdout 자체는 변경하지 않는다. 이 계수는 stderr의 발견 로그와 별개다.
    counts = {"audio": 0, "video": 0}
    for row in re.finditer(rb"(?m)^[0-9]+\|[a-zA-Z0-9_]{1,64}\|(audio|video)\r?$", output):
        counts[row[1].decode("ascii")] += 1
    return counts


def collect(command, timeout, limit=LIMIT):
    """실제 subprocess만 관측하며 추가 네트워크 요청은 하지 않는다."""
    trace = Trace()
    output = bytearray()
    total = 0
    status = "completed"
    started = time.monotonic_ns()
    process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    selector = selectors.DefaultSelector()
    try:
        for pipe in (process.stdout, process.stderr):
            os.set_blocking(pipe.fileno(), False)
            selector.register(pipe, selectors.EVENT_READ)
        deadline = time.monotonic() + timeout
        while selector.get_map():
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                status = "timeout"
                break
            for key, _ in selector.select(min(remaining, 0.1)):
                chunk = os.read(key.fd, 65536)
                if not chunk:
                    selector.unregister(key.fileobj)
                    continue
                total += len(chunk)
                if total > limit:
                    status = "output-limit"
                    break
                if key.fileobj is process.stdout:
                    output.extend(chunk)
                else:
                    trace.feed(chunk)
            if status != "completed":
                break
        if status != "completed":
            process.kill()
        remaining = max(0.001, deadline - time.monotonic())
        try:
            code = process.wait(timeout=remaining)
        except subprocess.TimeoutExpired:
            status = "timeout"
            process.kill()
            code = process.wait()
    finally:
        if process.poll() is None:
            process.kill()
            process.wait()
        selector.close()
        process.stdout.close()
        process.stderr.close()
    code = 124 if status == "timeout" else 2 if status == "output-limit" else code
    return bytes(output), code, dict(trace.finish(complete=status == "completed"),
                                   stdout_stream_lines=stdout_stream_lines(output), outcome=status, output_bytes=total,
                                   process_returncode=process.returncode,
                                   elapsed_ns=time.monotonic_ns() - started)


def diagnosed_exit(original, recorded):
    return original if original != 0 or recorded else 2


def probe(root, case, route, timeout_us, url):
    integer(case, 1, 10000)
    integer(route, 1, 10000)
    timeout = max(10, min(120, math.ceil(timeout_us / 1000000) + 10))
    command = ["ffprobe", "-v", "trace", "-rtsp_transport", "tcp", "-rw_timeout", str(timeout_us),
               "-show_entries", "stream=index,codec_name,codec_type", "-of", "compact=p=0:nk=1", url]
    try:
        append(root, {"kind": "probe", "phase": "start", "case": case, "route": route})
    except (OSError, ValueError):
        return 2
    try:
        output, code, facts = collect(command, timeout)
    except OSError:
        output, code, facts = b"", 2, {"outcome": "spawn-error"}
    sys.stdout.buffer.write(output)
    recorded = True
    try:
        append(root, dict(facts, kind="probe", phase="finish", case=case, route=route, original_exit=code))
    except (OSError, ValueError):
        recorded = False
    if code or not recorded:
        # 원문 stderr/debug 및 URL은 출력하지 않는다.
        sys.stderr.write("codec probe failure; diagnostic_status=" + ("recorded" if recorded else "unavailable") + "\n")
    return diagnosed_exit(code, recorded)


def provider_config(mode, root, data):
    if mode != "1" or not root:
        raise ValueError("provider-mode")
    sources = data.get("sources")
    if not isinstance(sources, list) or not 1 <= len(sources) <= 8:
        raise ValueError("providers")
    ports = set()
    names = set()
    for source in sources:
        launcher = source.get("launcher", {})
        url = urlsplit(source.get("source", ""))
        name, directory = source.get("name", ""), launcher.get("root", "")
        if (source.get("source_kind") != "http" or source.get("enabled", True) is not True or
                source.get("requires_network", False) is not False or launcher.get("type") != "local_http" or
                url.scheme != "http" or url.hostname != "127.0.0.1" or url.username or url.password or url.query or url.fragment or
                url.port != launcher.get("port") or not re.fullmatch(r"[A-Za-z0-9_-]{1,96}", name) or name in names or
                not isinstance(directory, str) or not directory or os.path.isabs(directory) or ".." in directory.split("/")):
            raise ValueError("provider-config")
        port = integer(launcher.get("port"), 1024, 65535)
        if port in ports:
            raise ValueError("provider-port")
        ports.add(port)
        names.add(name)
    return sources


def main(args):
    try:
        action, root = args[:2]
        if action == "init" and len(args) == 2:
            append(root, {"kind": "diagnostic", "phase": "initialized"})
            return 0
        if action == "launcher" and len(args) == 10:
            append(root, launcher_record(args[2], *map(int, args[3:])))
            return 0
        if action == "probe" and len(args) == 6:
            return probe(root, int(args[2]), int(args[3]), int(args[4]), args[5])
        if action == "providers" and len(args) == 4:
            with open(args[3], "rb") as source:
                raw = source.read(1024 * 1024 + 1)
            if len(raw) > 1024 * 1024:
                raise ValueError("config-size")
            provider_config(args[2], root, json.loads(raw))
            return 0
        raise ValueError("arguments")
    except (OSError, ValueError, TypeError, KeyError, AttributeError):
        sys.stderr.write("codec diagnostic preparation failed\n")
        return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

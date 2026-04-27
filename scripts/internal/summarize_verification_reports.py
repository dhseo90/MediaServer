#!/usr/bin/env python3
# 파일 용도: /tmp에 남은 MediaServer 검증 summary JSON/NDJSON을 짧은 Markdown 리포트로 변환한다.
# 동작 요약: 여러 검증 스크립트의 서로 다른 summary schema를 읽어 pass/fail/skip과 핵심 상태만 표로 요약한다.

from __future__ import annotations

import argparse
import glob
import json
import pathlib
from typing import Any


# CLI 인자를 해석해 입력 glob과 출력 파일 경로를 결정한다.
def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="MediaServer 검증 summary Markdown 리포트 생성")
    parser.add_argument("paths", nargs="*", help="summary JSON/NDJSON 파일 또는 glob")
    parser.add_argument("--output", "-o", help="Markdown 출력 파일. 생략하면 stdout")
    parser.add_argument(
        "--default-glob",
        default="/tmp/media_server_*summary*json*",
        help="입력 path가 없을 때 사용할 glob",
    )
    return parser.parse_args()


# 사용자가 넘긴 glob을 실제 파일 목록으로 확장하고 중복을 제거한다.
def expand_paths(raw_paths: list[str], default_glob: str) -> list[pathlib.Path]:
    patterns = raw_paths or [default_glob]
    resolved: list[pathlib.Path] = []
    seen: set[str] = set()
    for pattern in patterns:
        matches = glob.glob(pattern)
        if not matches:
            matches = [pattern]
        for match in matches:
            path = pathlib.Path(match)
            key = str(path)
            if key in seen or not path.exists() or not path.is_file():
                continue
            seen.add(key)
            resolved.append(path)
    return sorted(resolved, key=lambda item: item.stat().st_mtime, reverse=True)


# JSON 또는 NDJSON 파일을 읽어 schema 차이를 숨긴 payload 목록으로 반환한다.
def load_payloads(path: pathlib.Path) -> list[dict[str, Any]]:
    text = path.read_text(encoding="utf-8", errors="replace").strip()
    if not text:
        return []
    try:
        payload = json.loads(text)
        if isinstance(payload, dict):
            return [payload]
        if isinstance(payload, list):
            return [item for item in payload if isinstance(item, dict)]
        return []
    except json.JSONDecodeError:
        payloads: list[dict[str, Any]] = []
        for line in text.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                item = json.loads(line)
            except json.JSONDecodeError:
                continue
            if isinstance(item, dict):
                payloads.append(item)
        return payloads


# 파일명과 payload key를 조합해 어떤 검증 리포트인지 추정한다.
def detect_report_kind(path: pathlib.Path, payload: dict[str, Any]) -> str:
    name = path.name
    if "multichannel" in name:
        return "multichannel"
    if "predev" in name:
        return "predev"
    if "evtpost" in name or payload.get("kind") == "event-post":
        return "event-post"
    if "uri-longrun" in name:
        return "uri-longrun"
    if "webrtc-ice" in name:
        return "webrtc-ice"
    if "tracker-stability" in name:
        return "tracker"
    if "adaptive" in name:
        return "adaptive"
    if "yolo-layouts" in name:
        return "yolo-layouts"
    if "image" in name:
        return "image-analysis"
    if "pass" in payload or "fail" in payload:
        return "generic"
    return "ndjson"


# payload에서 공통 pass/fail/skip 값을 꺼낸다.
def extract_counts(payloads: list[dict[str, Any]]) -> tuple[int | str, int | str, int | str]:
    if not payloads:
        return "-", "-", "-"
    first = payloads[0]
    if all(key in first for key in ("pass", "fail", "skip")):
        return first.get("pass", "-"), first.get("fail", "-"), first.get("skip", "-")
    if all(key in first for key in ("pass", "fail")):
        return first.get("pass", "-"), first.get("fail", "-"), first.get("skip", "-")
    return len(payloads), 0, 0


# 각 검증 유형별로 Markdown 표에 넣을 핵심 detail 문장을 만든다.
def summarize_details(kind: str, payloads: list[dict[str, Any]]) -> str:
    if not payloads:
        return "empty"
    first = payloads[0]
    if kind == "multichannel":
        cases = first.get("cases") if isinstance(first.get("cases"), list) else []
        decoded = 0
        for case in cases:
            for report in case.get("clientReports", []):
                decoded += int(((report.get("stats") or {}).get("inboundVideoFramesDecoded") or 0))
        return f"cases={len(cases)} decodedFrames={decoded} final={first.get('finalStatus', {}).get('sessionManager', {})}"
    if kind == "event-post":
        return f"mode={first.get('mode')} received={first.get('receivedCount')} paths={first.get('receivedPathCounts', {})}"
    if kind == "predev":
        steps = first.get("steps") if isinstance(first.get("steps"), list) else []
        failed = [step.get("name") for step in steps if step.get("result") != "pass"]
        return f"durationSec={first.get('durationSec')} steps={len(steps)} failed={','.join(str(item) for item in failed)}"
    if kind == "uri-longrun":
        failures = first.get("failureClassifications") if isinstance(first.get("failureClassifications"), list) else []
        classes = sorted({",".join(item.get("classification", [])) for item in failures if isinstance(item, dict)})
        return f"iterations={first.get('iterations')} external={first.get('includeExternal')} failures={len(failures)} classes={','.join(classes)} advisory={first.get('advisory', '')}"
    if kind == "webrtc-ice":
        candidates = first.get("candidateTypes") or first.get("candidates") or {}
        return f"mode={first.get('mode')} requireRelay={first.get('requireRelay')} candidates={candidates}"
    if kind == "tracker":
        ratios = [item.get("fragmentationRatio") for item in payloads if "fragmentationRatio" in item]
        overlap = [item.get("overlapFragmentationRatio") for item in payloads if "overlapFragmentationRatio" in item]
        return f"iterations={len(payloads)} fragmentation={ratios} overlap={overlap}"
    if kind == "adaptive":
        return ", ".join(key for key in ("downshift", "inputSize", "upshift") if key in first) or "adaptive summary"
    if kind == "yolo-layouts":
        labels = [item.get("case") or item.get("label") for item in payloads]
        return f"cases={','.join(str(item) for item in labels if item)}"
    return ", ".join(f"{key}={value}" for key, value in list(first.items())[:4])


# Markdown table에서 깨지지 않도록 cell 안의 줄바꿈과 파이프 문자를 정리한다.
def escape_cell(value: Any) -> str:
    return str(value).replace("|", "\\|").replace("\n", " ")


# 전체 파일 목록을 하나의 Markdown 리포트로 렌더링한다.
def render_markdown(paths: list[pathlib.Path]) -> str:
    rows = [
        "# MediaServer 검증 요약",
        "",
        "| 파일 | 유형 | pass | fail | skip | 핵심 detail |",
        "| --- | --- | ---: | ---: | ---: | --- |",
    ]
    for path in paths:
        payloads = load_payloads(path)
        kind = detect_report_kind(path, payloads[0] if payloads else {})
        passed, failed, skipped = extract_counts(payloads)
        detail = summarize_details(kind, payloads)
        rows.append(
            "| "
            + " | ".join(
                escape_cell(item)
                for item in (str(path), kind, passed, failed, skipped, detail)
            )
            + " |"
        )
    if len(rows) == 4:
        rows.append("| - | - | - | - | - | summary 파일 없음 |")
    rows.append("")
    return "\n".join(rows)


# 진입점: Markdown을 stdout 또는 지정 파일로 내보낸다.
def main() -> int:
    args = parse_args()
    paths = expand_paths(args.paths, args.default_glob)
    markdown = render_markdown(paths)
    if args.output:
        pathlib.Path(args.output).write_text(markdown, encoding="utf-8")
    else:
        print(markdown)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

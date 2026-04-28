#!/usr/bin/env python3
# 파일 용도: /tmp에 남은 MediaServer 검증 summary JSON/NDJSON을 짧은 Markdown 리포트로 변환한다.
# 동작 요약: 여러 검증 스크립트의 서로 다른 summary schema를 읽어 pass/fail/skip과 핵심 상태만 표로 요약한다.

from __future__ import annotations

import argparse
import glob
import html
import json
import pathlib
from typing import Any


# CLI 인자를 해석해 입력 glob과 출력 파일 경로를 결정한다.
def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="MediaServer 검증 summary Markdown 리포트 생성")
    parser.add_argument("paths", nargs="*", help="summary JSON/NDJSON 파일 또는 glob")
    parser.add_argument("--output", "-o", help="Markdown 출력 파일. 생략하면 stdout")
    parser.add_argument("--html-output", help="HTML 출력 파일. Lab 리포트 뷰어에서 상세 리포트로 확인할 때 사용")
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
    return sorted(resolved, key=lambda item: safe_mtime(item), reverse=True)


# 삭제 중인 /tmp 파일이나 권한 문제로 stat가 실패해도 리포트 전체 생성을 중단하지 않는다.
def safe_mtime(path: pathlib.Path) -> float:
    try:
        return path.stat().st_mtime
    except OSError:
        return 0.0


# JSON 또는 NDJSON 파일을 읽어 schema 차이를 숨긴 payload 목록으로 반환한다.
def load_payloads(path: pathlib.Path) -> list[dict[str, Any]]:
    try:
        text = path.read_text(encoding="utf-8", errors="replace").strip()
    except OSError as exc:
        return [{"kind": "read-error", "status": "fail", "pass": 0, "fail": 1, "skip": 0, "error": str(exc)}]
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
    if "evtpost-longrun" in name or payload.get("kind") == "event-post-longrun":
        return "event-post-longrun"
    if "evtpost" in name or payload.get("kind") == "event-post":
        return "event-post"
    if "uri-longrun" in name:
        return "uri-longrun"
    if "va-events" in name:
        return "va-events"
    if "route-profile" in name or "route-profiles" in name:
        return "route-profiles"
    if "rule-ui" in name:
        return "rule-ui"
    if "codec" in name:
        return "codec-matrix"
    if "category" in name:
        return "va-category"
    if "webrtc-ice" in name:
        return "webrtc-ice"
    if "redaction" in name or payload.get("kind") == "redaction":
        return "redaction"
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


# fail count와 명시 status를 합쳐 사람이 훑기 쉬운 상태 문자열로 만든다.
def extract_status(payloads: list[dict[str, Any]]) -> str:
    if not payloads:
        return "empty"
    first = payloads[0]
    status = first.get("status")
    if isinstance(status, str) and status:
        return status
    failed = first.get("fail")
    if isinstance(failed, int):
        return "fail" if failed > 0 else "pass"
    return "info"


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
    if kind == "event-post-longrun":
        return f"status={first.get('status', '-')} iterations={first.get('iterations')} modes={first.get('modes')} durationSec={first.get('durationSec', '-')}"
    if kind == "predev":
        steps = first.get("steps") if isinstance(first.get("steps"), list) else []
        failed = [step.get("name") for step in steps if step.get("result") == "fail"]
        skipped = [step.get("name") for step in steps if step.get("result") == "skip"]
        return (
            f"durationSec={first.get('durationSec')} steps={len(steps)} "
            f"failed={','.join(str(item) for item in failed)} skipped={','.join(str(item) for item in skipped)}"
        )
    if kind == "uri-longrun":
        failures = first.get("failureClassifications") if isinstance(first.get("failureClassifications"), list) else []
        classes = sorted({",".join(item.get("classification", [])) for item in failures if isinstance(item, dict)})
        return f"iterations={first.get('iterations')} external={first.get('includeExternal')} failures={len(failures)} classes={','.join(classes)} advisory={first.get('advisory', '')}"
    if kind == "webrtc-ice":
        candidates = first.get("candidateTypes") or first.get("candidates") or {}
        return f"mode={first.get('mode')} requireRelay={first.get('requireRelay')} candidates={candidates}"
    if kind == "redaction":
        redaction = first.get("redaction") if isinstance(first.get("redaction"), dict) else {}
        steps = first.get("steps") if isinstance(first.get("steps"), list) else []
        failed = [step.get("name") for step in steps if isinstance(step, dict) and step.get("result") == "fail"]
        return f"mode={redaction.get('mode', '-')} classes={redaction.get('classes', '-')} steps={len(steps)} failed={','.join(str(item) for item in failed)}"
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


# 검증 유형별 원본 payload에서 표 밖에 둘 상세 항목을 추려낸다.
def detail_lines(kind: str, payloads: list[dict[str, Any]]) -> list[str]:
    if not payloads:
        return ["- payload 없음"]
    first = payloads[0]
    lines: list[str] = []
    if kind == "predev":
        lines.append(f"- durationSec: `{first.get('durationSec', '-')}`")
        lines.append(f"- soakMinutes: `{first.get('soakMinutes', '-')}`")
        for step in first.get("steps", [])[:40]:
            if not isinstance(step, dict):
                continue
            lines.append(
                f"- step `{step.get('name', '-')}`: `{step.get('result', '-')}` "
                f"duration=`{step.get('durationSec', '-')}` log=`{step.get('logFile', '-')}`"
            )
        return lines
    if kind == "multichannel":
        for case in first.get("cases", [])[:20]:
            if not isinstance(case, dict):
                continue
            lines.append(
                f"- case `{case.get('name') or case.get('case') or '-'}`: "
                f"clients=`{case.get('expectedClients', '-')}` streams=`{case.get('expectedStreams', '-')}`"
            )
            for report in case.get("clientReports", [])[:8]:
                stats = report.get("stats") or {}
                lines.append(
                    f"- client `{report.get('index', '-')}` file=`{report.get('fileName', '-')}` "
                    f"frames=`{stats.get('inboundVideoFramesDecoded', 0)}` bytes=`{stats.get('inboundVideoBytes', 0)}`"
                )
        return lines or ["- multichannel case 없음"]
    if kind == "event-post":
        lines.append(f"- mode: `{first.get('mode', '-')}`")
        lines.append(f"- receivedCount: `{first.get('receivedCount', '-')}`")
        lines.append(f"- receivedPathCounts: `{first.get('receivedPathCounts', {})}`")
        lines.append(f"- status: `{first.get('status', first.get('dispatcherStatus', {}))}`")
        return lines
    if kind == "redaction":
        lines.append(f"- videoFile: `{first.get('videoFile', '-')}`")
        lines.append(f"- imageAsset: `{first.get('imageAsset', '-')}`")
        lines.append(f"- redaction: `{first.get('redaction', {})}`")
        for step in first.get("steps", [])[:30]:
            if not isinstance(step, dict):
                continue
            lines.append(
                f"- step `{step.get('name', '-')}`: `{step.get('result', '-')}` "
                f"duration=`{step.get('durationSec', '-')}` log=`{step.get('logFile', '-')}`"
            )
        return lines
    if kind == "event-post-longrun":
        lines.append(f"- iterations: `{first.get('iterations', '-')}`")
        lines.append(f"- modes: `{first.get('modes', [])}`")
        for step in first.get("steps", [])[:40]:
            if isinstance(step, dict):
                lines.append(
                    f"- step `{step.get('name', '-')}`: `{step.get('result', '-')}` "
                    f"duration=`{step.get('durationSec', '-')}` log=`{step.get('logFile', '-')}`"
                )
        return lines
    if kind == "uri-longrun":
        lines.append(f"- iterations: `{first.get('iterations', '-')}`")
        lines.append(f"- includeExternal: `{first.get('includeExternal', '-')}`")
        lines.append(f"- externalConfig: `{first.get('externalConfig', '')}`")
        for failure in first.get("failureClassifications", [])[:20]:
            if isinstance(failure, dict):
                lines.append(
                    f"- failure `{failure.get('label', '-')}` iteration=`{failure.get('iteration', '-')}` "
                    f"classification=`{failure.get('classification', [])}` log=`{failure.get('logFile', '-')}`"
                )
        return lines
    if kind == "webrtc-ice":
        for key in (
            "mode",
            "requireRelay",
            "requestedIceTransportPolicy",
            "iceTransportPolicy",
            "relayPolicyFallback",
            "hasStun",
            "hasTurn",
            "candidateTypes",
        ):
            lines.append(f"- {key}: `{first.get(key, '-')}`")
        return lines
    if kind == "tracker":
        for item in payloads[:20]:
            lines.append(
                f"- iteration `{item.get('iteration', '-')}` fragmentation=`{item.get('fragmentationRatio', '-')}` "
                f"overlap=`{item.get('overlapFragmentationRatio', '-')}` idSwitchRisk=`{item.get('idSwitchRiskScore', '-')}`"
            )
        return lines
    return [f"- {key}: `{value}`" for key, value in list(first.items())[:12]]


# 전체 파일 목록을 하나의 Markdown 리포트로 렌더링한다.
def render_markdown(paths: list[pathlib.Path]) -> str:
    rows = [
        "# MediaServer 검증 요약",
        "",
        "| 파일 | 유형 | 상태 | pass | fail | skip | 핵심 detail |",
        "| --- | --- | --- | ---: | ---: | ---: | --- |",
    ]
    for path in paths:
        payloads = load_payloads(path)
        kind = detect_report_kind(path, payloads[0] if payloads else {})
        status = extract_status(payloads)
        passed, failed, skipped = extract_counts(payloads)
        detail = summarize_details(kind, payloads)
        rows.append(
            "| "
            + " | ".join(
                escape_cell(item)
                for item in (str(path), kind, status, passed, failed, skipped, detail)
            )
            + " |"
        )
    if len(rows) == 4:
        rows.append("| - | - | empty | - | - | - | summary 파일 없음 |")
    rows.append("")
    rows.append("## 상세")
    rows.append("")
    for path in paths:
        payloads = load_payloads(path)
        kind = detect_report_kind(path, payloads[0] if payloads else {})
        rows.append(f"### {path.name}")
        rows.append("")
        rows.extend(detail_lines(kind, payloads))
        rows.append("")
    return "\n".join(rows)


# Markdown과 같은 payload를 간단한 단일 HTML 문서로 렌더링한다.
def render_html(paths: list[pathlib.Path]) -> str:
    escaped = html.escape(render_markdown(paths))
    return (
        '<!doctype html><html lang="ko"><head><meta charset="utf-8">'
        "<title>MediaServer 검증 리포트</title>"
        "<style>body{font-family:-apple-system,BlinkMacSystemFont,'Noto Sans KR',sans-serif;"
        "margin:24px;line-height:1.5;color:#17202a;background:#f8fafc;}"
        "pre{white-space:pre-wrap;background:#fff;border:1px solid #d8dee9;border-radius:8px;padding:16px;}"
        "</style></head><body><pre>"
        + escaped
        + "</pre></body></html>"
    )


# 진입점: Markdown을 stdout 또는 지정 파일로 내보낸다.
def main() -> int:
    args = parse_args()
    paths = expand_paths(args.paths, args.default_glob)
    markdown = render_markdown(paths)
    if args.output:
        pathlib.Path(args.output).write_text(markdown, encoding="utf-8")
    else:
        print(markdown)
    if args.html_output:
        pathlib.Path(args.html_output).write_text(render_html(paths), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

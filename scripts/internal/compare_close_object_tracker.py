#!/usr/bin/env python3
# 파일 용도: 동일한 tracker-stability sample로 close-object guard mode별 결과를 비교한다.
"""off/diagnostic/enforce mode를 같은 입력으로 실행해 tracker 안정성 차이를 리포트한다."""

from __future__ import annotations

import argparse
import collections
import datetime as dt
import json
import os
import pathlib
import re
import socket
import subprocess
import time
import urllib.error
import urllib.request
from typing import Any


ROOT_DIR = pathlib.Path(__file__).resolve().parents[2]
DEFAULT_FILE = "imports/va_tracking_event_1280x720_30fps_h264.mp4"
VALID_MODES = {"off", "diagnostic", "enforce"}
STABLE_EVENT_STATE_KEYS = {"activeEventStates"}
STABLE_SCENARIO_STATE_KEYS = {"activeScenarios"}
QUALITY_RISK_KEYS = {
    "trackerAssociationRiskScore",
    "fragmentationRatio",
    "overlapFragmentationRatio",
}
OBSERVED_RISK_KEYS = {
    "idSwitchRiskScore",
    "ptsRegressionCount",
    "stalePtsRatio",
    "maxOverlapRisk",
    "lostCount",
    "reacquiredCount",
    "missedFrameSpikeCount",
    "directionChangeSpikeCount",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="close-object guard off/diagnostic/enforce mode의 tracker 안정성 리포트를 비교합니다."
    )
    parser.add_argument("--file", default=DEFAULT_FILE, help="video root 기준 sample file token입니다.")
    parser.add_argument("--modes", default="off,diagnostic,enforce", help="쉼표로 구분한 mode 목록입니다.")
    parser.add_argument("--output-dir", default="", help="리포트 출력 디렉터리입니다.")
    parser.add_argument("--long", action="store_true", help="verify-tracker-stability에 --long을 전달합니다.")
    parser.add_argument("--overlap-focus", action="store_true", help="verify-tracker-stability에 --overlap-focus를 전달합니다.")
    parser.add_argument("--duration", default="", help="verify-tracker-stability에 전달할 --duration 초입니다.")
    parser.add_argument("--repeat", default="", help="verify-tracker-stability에 전달할 --repeat 횟수입니다.")
    parser.add_argument("--interval", default="", help="verify-tracker-stability에 전달할 --interval 초입니다.")
    parser.add_argument("--poll-count", default="", help="verify-tracker-stability에 전달할 --poll-count 횟수입니다.")
    parser.add_argument("--class-whitelist", default="", help="verify-tracker-stability에 전달할 --class-whitelist CSV입니다.")
    parser.add_argument("--max-fragmentation", default="", help="verify-tracker-stability에 전달할 --max-fragmentation입니다.")
    parser.add_argument("--max-overlap-fragmentation", default="", help="verify-tracker-stability에 전달할 --max-overlap-fragmentation입니다.")
    parser.add_argument("--max-id-switch-risk", default="", help="verify-tracker-stability에 전달할 --max-id-switch-risk입니다.")
    parser.add_argument("--no-long-sample", action="store_true", help="verify-tracker-stability에 --no-long-sample을 전달합니다.")
    parser.add_argument("--use-existing-server", action="store_true", help="이미 실행 중인 서버를 사용합니다. 기본은 mode별 격리 서버를 시작합니다.")
    parser.add_argument("--http-base", default="", help="--use-existing-server에서 사용할 HTTP base입니다.")
    parser.add_argument("--http-port-base", default="8181", help="mode별 격리 서버 HTTP port 탐색 시작값입니다.")
    parser.add_argument("--rtsp-port-base", default="8651", help="mode별 격리 서버 RTSP port 탐색 시작값입니다.")
    parser.add_argument("--startup-timeout", default="20", help="mode별 격리 서버 health 대기 시간(초)입니다.")
    return parser.parse_args()


def mode_list(raw: str) -> list[str]:
    modes = [item.strip().lower() for item in raw.split(",") if item.strip()]
    if not modes:
        raise SystemExit("modes must not be empty")
    invalid = [mode for mode in modes if mode not in VALID_MODES]
    if invalid:
        raise SystemExit(f"invalid mode(s): {', '.join(invalid)}")
    return modes


def tracker_args(args: argparse.Namespace) -> list[str]:
    out = ["verify-tracker-stability", "--file", args.file]
    if args.long:
        out.append("--long")
    if args.overlap_focus:
        out.append("--overlap-focus")
    for attr, flag in [
        ("duration", "--duration"),
        ("repeat", "--repeat"),
        ("interval", "--interval"),
        ("poll_count", "--poll-count"),
        ("class_whitelist", "--class-whitelist"),
        ("max_fragmentation", "--max-fragmentation"),
        ("max_overlap_fragmentation", "--max-overlap-fragmentation"),
        ("max_id_switch_risk", "--max-id-switch-risk"),
    ]:
        value = getattr(args, attr)
        if value:
            out.extend([flag, str(value)])
    if args.no_long_sample:
        out.append("--no-long-sample")
    return out


def find_available_port(start_port: int) -> int:
    for port in range(max(1, start_port), max(1, start_port) + 200):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                sock.bind(("127.0.0.1", port))
            except OSError:
                continue
            return port
    raise RuntimeError(f"available localhost port not found from {start_port}")


def wait_for_health(http_base: str, timeout_s: float) -> None:
    deadline = time.monotonic() + max(1.0, timeout_s)
    last_error = ""
    while time.monotonic() < deadline:
        try:
            with urllib.request.urlopen(f"{http_base}/health", timeout=1.5) as response:
                if 200 <= response.status < 500:
                    return
        except (OSError, urllib.error.URLError) as error:
            last_error = str(error)
        time.sleep(0.25)
    raise RuntimeError(f"server health timeout: {http_base}/health ({last_error})")


def stop_server(process: subprocess.Popen[str] | None) -> None:
    if process is None or process.poll() is not None:
        return
    process.terminate()
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=5)


def start_mode_server(mode: str,
                      args: argparse.Namespace,
                      output_dir: pathlib.Path,
                      index: int) -> tuple[subprocess.Popen[str], Any, str, str]:
    http_base_port = int(args.http_port_base) + index * 10
    rtsp_base_port = int(args.rtsp_port_base) + index * 10
    http_port = find_available_port(http_base_port)
    rtsp_port = find_available_port(rtsp_base_port)
    http_base = f"http://127.0.0.1:{http_port}"
    log_path = output_dir / f"server-{mode}.log"
    log_handle = log_path.open("w", encoding="utf-8")
    env = os.environ.copy()
    env.update({
        "MEDIA_SERVER_SKIP_LOCAL_ENV": "1",
        "MEDIA_SERVER_SKIP_BUILD": "1",
        "MEDIA_SERVER_AUTH_MODE": "off",
        "MEDIA_SERVER_LISTEN_ADDRESS": "127.0.0.1",
        "MEDIA_SERVER_HTTP_LISTEN_ADDRESS": "127.0.0.1",
        "MEDIA_SERVER_LISTEN_PORT": str(rtsp_port),
        "MEDIA_SERVER_HTTP_LISTEN_PORT": str(http_port),
        "MEDIA_SERVER_ANALYSIS_TRACKING_CLOSE_OBJECT_GUARD_MODE": mode,
    })
    process = subprocess.Popen(
        [str(ROOT_DIR / "server.sh"), "foreground"],
        cwd=ROOT_DIR,
        env=env,
        text=True,
        stdout=log_handle,
        stderr=subprocess.STDOUT,
    )
    try:
        wait_for_health(http_base, float(args.startup_timeout))
    except Exception:
        stop_server(process)
        log_handle.close()
        raise
    return process, log_handle, http_base, str(log_path)


def mode_effective(mode: str, payload: dict[str, Any]) -> bool:
    if mode == "off":
        return True
    guard_counts = payload.get("guardDecisionCounts") or {}
    if isinstance(guard_counts, dict) and guard_counts:
        return True
    return bool(payload.get("closeObjectGuardAppliedCount") or payload.get("rejectedByCloseObjectGuardCount"))


def run_tracker(mode: str, args: argparse.Namespace, output_dir: pathlib.Path, index: int) -> dict[str, Any]:
    env = os.environ.copy()
    env["MEDIA_SERVER_ANALYSIS_TRACKING_CLOSE_OBJECT_GUARD_MODE"] = mode
    server_process: subprocess.Popen[str] | None = None
    server_log_handle = None
    managed_server = not args.use_existing_server
    server_log_path = ""
    try:
        if managed_server:
            server_process, server_log_handle, http_base, server_log_path = start_mode_server(
                mode, args, output_dir, index)
            env["MEDIA_SERVER_VERIFY_TRACKER_HTTP_BASE"] = http_base
        elif args.http_base:
            env["MEDIA_SERVER_VERIFY_TRACKER_HTTP_BASE"] = args.http_base.rstrip("/")
    except Exception as error:
        aggregate = aggregate_iterations([])
        aggregate.update({
            "mode": mode,
            "ok": False,
            "exitCode": 1,
            "command": "server startup",
            "summaryPath": "",
            "logPath": "",
            "iterationCount": 0,
            "managedServer": managed_server,
            "serverLogPath": server_log_path,
            "modeEffective": False,
            "error": str(error),
        })
        mode_summary_path = output_dir / f"summary-{mode}.json"
        mode_report_path = output_dir / f"report-{mode}.md"
        aggregate["modeSummaryPath"] = str(mode_summary_path)
        aggregate["modeReportPath"] = str(mode_report_path)
        mode_summary_path.write_text(json.dumps(aggregate, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        write_mode_report(mode, aggregate, mode_report_path)
        return aggregate

    command = [str(ROOT_DIR / "server.sh"), *tracker_args(args)]
    command_display = (
        f"MEDIA_SERVER_ANALYSIS_TRACKING_CLOSE_OBJECT_GUARD_MODE={mode} "
        + " ".join(command)
    )
    try:
        completed = subprocess.run(
            command,
            cwd=ROOT_DIR,
            env=env,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            check=False,
        )
        log_path = output_dir / f"tracker-stability-{mode}.log"
        log_path.write_text(completed.stdout, encoding="utf-8")
        summary_path = extract_summary_path(completed.stdout)
        iterations = read_ndjson(summary_path) if summary_path else []
        aggregate = aggregate_iterations(iterations)
        aggregate.update(
            {
                "mode": mode,
                "ok": completed.returncode == 0,
                "exitCode": completed.returncode,
                "command": command_display,
                "summaryPath": str(summary_path) if summary_path else "",
                "logPath": str(log_path),
                "iterationCount": len(iterations),
                "managedServer": managed_server,
                "serverLogPath": server_log_path,
            }
        )
        aggregate["modeEffective"] = mode_effective(mode, aggregate)
        if completed.returncode != 0:
            aggregate["error"] = last_error_line(completed.stdout)
    finally:
        stop_server(server_process)
        if server_log_handle is not None:
            server_log_handle.close()
    mode_summary_path = output_dir / f"summary-{mode}.json"
    mode_report_path = output_dir / f"report-{mode}.md"
    aggregate["modeSummaryPath"] = str(mode_summary_path)
    aggregate["modeReportPath"] = str(mode_report_path)
    mode_summary_path.write_text(json.dumps(aggregate, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    write_mode_report(mode, aggregate, mode_report_path)
    return aggregate


def extract_summary_path(text: str) -> pathlib.Path | None:
    matches = re.findall(r"summary=(\S+)", text)
    if not matches:
        matches = re.findall(r"summary log:\s*(\S+)", text)
    if not matches:
        return None
    path = pathlib.Path(matches[-1])
    return path if path.exists() else None


def read_ndjson(path: pathlib.Path | None) -> list[dict[str, Any]]:
    if not path or not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def number_values(items: list[dict[str, Any]], key: str) -> list[float]:
    values: list[float] = []
    for item in items:
        value = item.get(key)
        if isinstance(value, (int, float)):
            values.append(float(value))
    return values


def counter_sum(items: list[dict[str, Any]], key: str) -> dict[str, int]:
    counter: collections.Counter[str] = collections.Counter()
    for item in items:
        payload = item.get(key) or {}
        if isinstance(payload, dict):
            for name, value in payload.items():
                if isinstance(value, (int, float)):
                    counter[str(name)] += int(value)
    return dict(sorted(counter.items()))


def aggregate_iterations(items: list[dict[str, Any]]) -> dict[str, Any]:
    def max_value(key: str, default: float = 0.0) -> float:
        values = number_values(items, key)
        return round(max(values), 6) if values else default

    def min_value(key: str) -> float | None:
        values = number_values(items, key)
        return round(min(values), 6) if values else None

    guard_counts = counter_sum(items, "guardDecisionCounts")
    issue_counts = counter_sum(items, "trackingIssueCounts")
    event_signature = latest_signature(items)
    fragmentation_ratio = max_value("fragmentationRatio")
    overlap_fragmentation_ratio = max_value("overlapFragmentationRatio")
    tracker_association_risk = round(
        max(0.0, fragmentation_ratio - 1.0) +
        max(0.0, overlap_fragmentation_ratio - 1.0),
        6,
    )
    track_rows: list[dict[str, Any]] = []
    for item in items:
        for row in item.get("trackIssueTable") or []:
            if len(track_rows) >= 200:
                break
            if isinstance(row, dict):
                row = dict(row)
                row["iteration"] = item.get("iteration")
                track_rows.append(row)

    return {
        "idSwitchRiskScore": max_value("idSwitchRiskScore"),
        "trackerAssociationRiskScore": tracker_association_risk,
        "fragmentationRatio": fragmentation_ratio,
        "overlapFragmentationRatio": overlap_fragmentation_ratio,
        "ptsRegressionCount": int(max_value("ptsRegressionCount", 0)),
        "stalePtsRatio": max_value("stalePtsRatio"),
        "minAssociationConfidence": min_value("minAssociationConfidence"),
        "maxOverlapRisk": max_value("maxOverlapRisk"),
        "maxCenterJump": max_value("maxCenterJump"),
        "lostCount": int(max_value("lostCount", 0)),
        "reacquiredCount": int(max_value("reacquiredCount", 0)),
        "missedFrameSpikeCount": sum(int(item.get("missedFrameSpikeCount") or 0) for item in items),
        "directionChangeSpikeCount": sum(int(item.get("directionChangeSpikeCount") or 0) for item in items),
        "guardDecisionCounts": guard_counts,
        "closeObjectGuardAppliedCount": sum(int(item.get("closeObjectGuardAppliedCount") or 0) for item in items),
        "rejectedByCloseObjectGuardCount": sum(int(item.get("rejectedByCloseObjectGuardCount") or 0) for item in items),
        "trackingIssueCounts": issue_counts,
        "eventScenarioSignature": event_signature,
        "trackIssueTable": track_rows,
    }


def latest_signature(items: list[dict[str, Any]]) -> dict[str, Any]:
    for item in reversed(items):
        signature = item.get("eventScenarioSignature")
        if isinstance(signature, dict):
            return signature
    return {"eventState": {}, "scenarioState": {}}


def stable_event_scenario_signature(payload: dict[str, Any]) -> dict[str, Any]:
    signature = payload.get("eventScenarioSignature") or {}
    event_state = signature.get("eventState") or {}
    scenario_state = signature.get("scenarioState") or {}
    return {
        "eventState": {
            key: event_state.get(key)
            for key in sorted(STABLE_EVENT_STATE_KEYS)
            if key in event_state
        },
        "scenarioState": {
            key: scenario_state.get(key)
            for key in sorted(STABLE_SCENARIO_STATE_KEYS)
            if key in scenario_state
        },
    }


def last_error_line(text: str) -> str:
    for line in reversed(text.splitlines()):
        if "ERROR:" in line or "[fail]" in line:
            return line.strip()
    return "tracker stability command failed"


def compute_deltas(modes: dict[str, dict[str, Any]], baseline_mode: str = "off") -> dict[str, Any]:
    baseline = modes.get(baseline_mode, {})
    deltas: dict[str, Any] = {}
    for mode, payload in modes.items():
        if mode == baseline_mode:
            continue
        delta: dict[str, Any] = {}
        for key in [
            "idSwitchRiskScore",
            "trackerAssociationRiskScore",
            "fragmentationRatio",
            "overlapFragmentationRatio",
            "ptsRegressionCount",
            "stalePtsRatio",
            "maxOverlapRisk",
            "maxCenterJump",
            "lostCount",
            "reacquiredCount",
            "missedFrameSpikeCount",
            "directionChangeSpikeCount",
            "closeObjectGuardAppliedCount",
            "rejectedByCloseObjectGuardCount",
        ]:
            left = payload.get(key)
            right = baseline.get(key)
            if isinstance(left, (int, float)) and isinstance(right, (int, float)):
                delta[key] = round(float(left) - float(right), 6)
        delta["eventScenarioDelta"] = stable_event_scenario_signature(payload) != stable_event_scenario_signature(
            baseline
        )
        delta["eventScenarioObservedDelta"] = payload.get("eventScenarioSignature") != baseline.get(
            "eventScenarioSignature"
        )
        deltas[f"{mode}Vs{baseline_mode.capitalize()}"] = delta
    return deltas


def overall_judgement(mode_payloads: dict[str, dict[str, Any]], deltas: dict[str, Any]) -> tuple[str, list[str]]:
    reasons: list[str] = []
    for mode, payload in mode_payloads.items():
        if not payload.get("ok"):
            reasons.append(f"{mode} tracker stability failed")
        if not payload.get("modeEffective", mode == "off"):
            reasons.append(f"{mode} close-object guard mode was not observed")
    if reasons:
        return "fail", reasons

    warnings: list[str] = []
    observed_warnings: list[str] = []
    for name, delta in deltas.items():
        if delta.get("eventScenarioDelta"):
            reasons.append(f"{name} event/scenario signature changed")
        for key in sorted(QUALITY_RISK_KEYS):
            value = delta.get(key)
            if isinstance(value, (int, float)) and value > 0.001:
                warnings.append(f"{name} {key} increased by {value:.3f}")
        for key in sorted(OBSERVED_RISK_KEYS):
            value = delta.get(key)
            if isinstance(value, (int, float)) and value > 0.001:
                observed_warnings.append(f"{name} observed {key} changed by {value:.3f}")
    if reasons:
        return "hold", reasons
    if warnings:
        return "warning", warnings
    if observed_warnings:
        return "warning", observed_warnings
    return "pass", ["mode comparison completed; default-on remains deferred"]


def quality_gate(judgement: str, deltas: dict[str, Any]) -> dict[str, Any]:
    event_delta = any(bool(delta.get("eventScenarioDelta")) for delta in deltas.values())
    observed_event_delta = any(bool(delta.get("eventScenarioObservedDelta")) for delta in deltas.values())
    increased_risk: dict[str, dict[str, float]] = {}
    observed_increased_risk: dict[str, dict[str, float]] = {}
    for name, delta in deltas.items():
        risk_delta = {
            key: value
            for key, value in delta.items()
            if key in QUALITY_RISK_KEYS and isinstance(value, (int, float)) and value > 0.001
        }
        if risk_delta:
            increased_risk[name] = risk_delta
        observed_delta = {
            key: value
            for key, value in delta.items()
            if key in OBSERVED_RISK_KEYS and isinstance(value, (int, float)) and value > 0.001
        }
        if observed_delta:
            observed_increased_risk[name] = observed_delta
    default_on_candidate = judgement == "pass" and not event_delta and not increased_risk
    if event_delta:
        recommendation = "hold: event/scenario output changed; keep guard opt-in"
    elif increased_risk:
        recommendation = "observe: association risk metric increased; keep guard default off"
    elif observed_increased_risk:
        recommendation = "observe: live tracking counters changed; repeat and keep guard default off"
    elif judgement == "pass" and observed_event_delta:
        recommendation = (
            "candidate: stable event/scenario state unchanged and risk keys did not increase; "
            "observed counters varied, so keep collecting samples"
        )
    elif judgement == "pass":
        recommendation = "candidate: no event delta or risk increase observed; still require more field samples"
    else:
        recommendation = "hold: comparison did not pass cleanly"
    return {
        "eventScenarioUnchanged": not event_delta,
        "eventScenarioObservedUnchanged": not observed_event_delta,
        "riskKeys": sorted(QUALITY_RISK_KEYS),
        "observedRiskKeys": sorted(OBSERVED_RISK_KEYS),
        "riskNonIncreasing": not increased_risk,
        "observedRiskNonIncreasing": not observed_increased_risk,
        "increasedRisk": increased_risk,
        "observedIncreasedRisk": observed_increased_risk,
        "defaultOnCandidate": default_on_candidate,
        "recommendation": recommendation,
    }


def write_mode_report(mode: str, payload: dict[str, Any], path: pathlib.Path) -> None:
    lines = [
        f"# Close-object Tracker Mode: {mode}",
        "",
        f"- ok: `{payload.get('ok')}`",
        f"- mode effective: `{payload.get('modeEffective')}`",
        f"- managed server: `{payload.get('managedServer')}`",
        f"- command: `{payload.get('command')}`",
        f"- server log: `{payload.get('serverLogPath') or '-'}`",
        f"- tracker summary: `{payload.get('summaryPath') or '-'}`",
        f"- tracker log: `{payload.get('logPath') or '-'}`",
        "",
        "## Metrics",
        "",
        "| metric | value |",
        "| --- | --- |",
    ]
    for key in [
        "idSwitchRiskScore",
        "trackerAssociationRiskScore",
        "fragmentationRatio",
        "overlapFragmentationRatio",
        "ptsRegressionCount",
        "stalePtsRatio",
        "minAssociationConfidence",
        "maxOverlapRisk",
        "maxCenterJump",
        "lostCount",
        "reacquiredCount",
        "missedFrameSpikeCount",
        "directionChangeSpikeCount",
        "closeObjectGuardAppliedCount",
        "rejectedByCloseObjectGuardCount",
    ]:
        lines.append(f"| {key} | {format_cell(payload.get(key))} |")
    lines.extend(["", "## Counters", ""])
    lines.append(f"- guard decisions: `{json.dumps(payload.get('guardDecisionCounts') or {}, ensure_ascii=False)}`")
    lines.append(f"- tracking issues: `{json.dumps(payload.get('trackingIssueCounts') or {}, ensure_ascii=False)}`")
    lines.extend(["", "## Track Issue Rows", ""])
    lines.append("| iteration | source | track | class | type | assoc | overlap | centerJump | applied | rejected |")
    lines.append("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |")
    rows = payload.get("trackIssueTable") or []
    if not rows:
        lines.append("| - | - | - | - | no issue rows | - | - | - | - | - |")
    for row in rows[:80]:
        lines.append(
            "| {iteration} | {source} | {track} | {class_name} | {typ} | {assoc} | {overlap} | {jump} | {applied} | {rejected} |".format(
                iteration=format_cell(row.get("iteration")),
                source=format_cell(row.get("source")),
                track=format_cell(row.get("trackId")),
                class_name=format_cell(row.get("className")),
                typ=format_cell(row.get("type")),
                assoc=format_cell(row.get("associationConfidence")),
                overlap=format_cell(row.get("overlapRisk") or row.get("closeObjectRisk")),
                jump=format_cell(row.get("centerJump")),
                applied=format_cell(row.get("guardApplied")),
                rejected=format_cell(row.get("rejected")),
            )
        )
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_report(summary: dict[str, Any], path: pathlib.Path) -> None:
    modes = summary["modes"]
    gate = summary.get("qualityGate") or {}
    lines = [
        "# Close-object Tracker Guard Comparison",
        "",
        f"- sample: `{summary['sample']}`",
        f"- modes: `{', '.join(modes.keys())}`",
        f"- baseline: `{summary.get('baselineMode', 'off')}`",
        f"- judgement: `{summary['overallJudgement']}`",
        f"- default-on candidate: `{gate.get('defaultOnCandidate')}`",
        f"- recommendation: {gate.get('recommendation') or '-'}",
        "",
        "## Mode Summary",
        "",
        "| mode | ok | mode effective | association risk | idSwitchRisk | pts regression/stale | fragmentation | overlap fragmentation | min assoc | max overlap | max centerJump | lost/reacq | guard applied/rejected |",
        "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    for mode, payload in modes.items():
        lines.append(
            "| {mode} | {ok} | {effective} | {assoc_risk} | {risk} | {pts}/{stale} | {frag} | {overlap_frag} | {assoc} | {overlap} | {jump} | {lost}/{reacq} | {applied}/{rejected} |".format(
                mode=mode,
                ok="PASS" if payload.get("ok") else "FAIL",
                effective="yes" if payload.get("modeEffective") else "no",
                assoc_risk=format_cell(payload.get("trackerAssociationRiskScore")),
                risk=format_cell(payload.get("idSwitchRiskScore")),
                pts=format_cell(payload.get("ptsRegressionCount")),
                stale=format_cell(payload.get("stalePtsRatio")),
                frag=format_cell(payload.get("fragmentationRatio")),
                overlap_frag=format_cell(payload.get("overlapFragmentationRatio")),
                assoc=format_cell(payload.get("minAssociationConfidence")),
                overlap=format_cell(payload.get("maxOverlapRisk")),
                jump=format_cell(payload.get("maxCenterJump")),
                lost=format_cell(payload.get("lostCount")),
                reacq=format_cell(payload.get("reacquiredCount")),
                applied=format_cell(payload.get("closeObjectGuardAppliedCount")),
                rejected=format_cell(payload.get("rejectedByCloseObjectGuardCount")),
            )
        )
    lines.extend(["", "## Guard Decisions", ""])
    lines.append("| mode | decisions | tracking issues |")
    lines.append("| --- | --- | --- |")
    for mode, payload in modes.items():
        lines.append(
            f"| {mode} | `{json.dumps(payload.get('guardDecisionCounts') or {}, ensure_ascii=False)}` | `{json.dumps(payload.get('trackingIssueCounts') or {}, ensure_ascii=False)}` |"
        )
    lines.extend(["", "## Quality Gate", ""])
    lines.append("| check | value |")
    lines.append("| --- | --- |")
    lines.append(f"| event/scenario stable unchanged | `{gate.get('eventScenarioUnchanged')}` |")
    lines.append(f"| event/scenario observed unchanged | `{gate.get('eventScenarioObservedUnchanged')}` |")
    lines.append(f"| risk non-increasing | `{gate.get('riskNonIncreasing')}` |")
    lines.append(f"| risk keys | `{json.dumps(gate.get('riskKeys') or [], ensure_ascii=False)}` |")
    lines.append(f"| observed risk non-increasing | `{gate.get('observedRiskNonIncreasing')}` |")
    lines.append(f"| observed risk keys | `{json.dumps(gate.get('observedRiskKeys') or [], ensure_ascii=False)}` |")
    lines.append(f"| default-on candidate | `{gate.get('defaultOnCandidate')}` |")
    lines.append(f"| recommendation | {gate.get('recommendation') or '-'} |")
    increased_risk = gate.get("increasedRisk") or {}
    if increased_risk:
        lines.append(f"| increased risk | `{json.dumps(increased_risk, ensure_ascii=False)}` |")
    observed_increased_risk = gate.get("observedIncreasedRisk") or {}
    if observed_increased_risk:
        lines.append(f"| observed increased risk | `{json.dumps(observed_increased_risk, ensure_ascii=False)}` |")
    lines.extend(["", "## Event / Scenario Delta", ""])
    lines.append("| comparison | stable delta | observed delta | numeric delta |")
    lines.append("| --- | --- | --- | --- |")
    for name, delta in summary.get("delta", {}).items():
        numeric = {
            key: value
            for key, value in delta.items()
            if key not in {"eventScenarioDelta", "eventScenarioObservedDelta"}
        }
        lines.append(
            f"| {name} | `{delta.get('eventScenarioDelta')}` | `{delta.get('eventScenarioObservedDelta')}` | `{json.dumps(numeric, ensure_ascii=False)}` |"
        )
    lines.extend(["", "## Track Issue Rows", ""])
    lines.append("| mode | iteration | source | track | class | type | assoc | overlap | centerJump | applied | rejected |")
    lines.append("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |")
    for mode, payload in modes.items():
        rows = payload.get("trackIssueTable") or []
        if not rows:
            lines.append(f"| {mode} | - | - | - | - | no issue rows | - | - | - | - | - |")
            continue
        for row in rows[:40]:
            lines.append(
                "| {mode} | {iteration} | {source} | {track} | {class_name} | {typ} | {assoc} | {overlap} | {jump} | {applied} | {rejected} |".format(
                    mode=mode,
                    iteration=format_cell(row.get("iteration")),
                    source=format_cell(row.get("source")),
                    track=format_cell(row.get("trackId")),
                    class_name=format_cell(row.get("className")),
                    typ=format_cell(row.get("type")),
                    assoc=format_cell(row.get("associationConfidence")),
                    overlap=format_cell(row.get("overlapRisk") or row.get("closeObjectRisk")),
                    jump=format_cell(row.get("centerJump")),
                    applied=format_cell(row.get("guardApplied")),
                    rejected=format_cell(row.get("rejected")),
                )
            )
    lines.extend(["", "## Notes", ""])
    for reason in summary.get("reasons") or []:
        lines.append(f"- {reason}")
    lines.append("- close-object guard default-on is not changed by this report.")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def format_cell(value: Any) -> str:
    if value is None or value == "":
        return "-"
    if isinstance(value, float):
        return f"{value:.3f}"
    return str(value).replace("|", "\\|")


def main() -> int:
    args = parse_args()
    modes = mode_list(args.modes)
    output_dir = pathlib.Path(args.output_dir) if args.output_dir else pathlib.Path(
        f"/tmp/media_server_close_object_tracker_{int(dt.datetime.now().timestamp())}_{os.getpid()}"
    )
    output_dir.mkdir(parents=True, exist_ok=True)

    mode_payloads = {mode: run_tracker(mode, args, output_dir, index)
                     for index, mode in enumerate(modes)}
    baseline_mode = "off" if "off" in mode_payloads else modes[0]
    deltas = compute_deltas(mode_payloads, baseline_mode)
    judgement, reasons = overall_judgement(mode_payloads, deltas)
    gate = quality_gate(judgement, deltas)
    summary = {
        "kind": "close-object-tracker-comparison",
        "ok": judgement != "fail",
        "sample": args.file,
        "baselineMode": baseline_mode,
        "modes": mode_payloads,
        "delta": deltas,
        "overallJudgement": judgement,
        "reasons": reasons,
        "qualityGate": gate,
        "defaultOnCandidate": gate["defaultOnCandidate"],
        "createdAt": dt.datetime.now(dt.timezone.utc).isoformat(),
    }
    summary_path = output_dir / "summary.json"
    report_path = output_dir / "report.md"
    summary["summaryPath"] = str(summary_path)
    summary["reportPath"] = str(report_path)
    write_report(summary, report_path)
    summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"[summary-json] {summary_path}")
    print(f"[report] {report_path}")
    print(f"[judgement] {judgement}")
    print(f"[default-on-candidate] {gate['defaultOnCandidate']}")
    print(f"[recommendation] {gate['recommendation']}")
    for reason in reasons:
        print(f"[reason] {reason}")
    return 0 if judgement != "fail" else 1


if __name__ == "__main__":
    raise SystemExit(main())

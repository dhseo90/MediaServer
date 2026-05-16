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
import errno
import re
import shutil
import socket
import statistics
import subprocess
import time
import urllib.error
import urllib.request
from typing import Any


ROOT_DIR = pathlib.Path(__file__).resolve().parents[2]
DEFAULT_FILE = "imports/va_tracking_event_1280x720_30fps_h264.mp4"
DEFAULT_FILE_ROOT = "video"
VALID_MODES = {"off", "diagnostic", "enforce"}
FIXTURE_MATRIX = [
    {
        "id": "tracking-event",
        "file": DEFAULT_FILE,
        "description": "default close-object tracking event sample",
        "classWhitelist": "person",
        "qualityPreset": "close-object-live",
    },
    {
        "id": "tracking-event-long",
        "file": "imports/va_tracking_event_long_1280x720_30fps_h264.mp4",
        "description": "longer close-object tracking event sample",
        "classWhitelist": "person",
        "qualityPreset": "close-object-live",
    },
    {
        "id": "tracking-event-slow-long",
        "file": "imports/va_tracking_event_slow_long_1280x720_30fps_h264.mp4",
        "description": "slow long close-object tracking event sample",
        "classWhitelist": "person",
        "qualityPreset": "close-object-live",
    },
    {
        "id": "four-scene-control",
        "file": "va_four_scene_sample.mp4",
        "description": "general VA control sample for non-close-object drift",
        "classWhitelist": "person",
        "qualityPreset": "control-live",
    },
    {
        "id": "field-new-york-driving",
        "file": "imports/NewYorkDriving.mp4",
        "description": "field-like driving sample for vehicle-heavy close-object drift",
        "classWhitelist": "car,truck,bus,motorcycle",
        "qualityPreset": "field-driving-live",
        "maxFragmentation": "6.0",
        "maxOverlapFragmentation": "6.0",
        "maxIdSwitchRisk": "8.0",
    },
]
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
QUALITY_EPSILON = 0.001
REPEAT_STAT_KEYS = sorted(
    QUALITY_RISK_KEYS |
    OBSERVED_RISK_KEYS |
    {
        "maxCenterJump",
        "closeObjectGuardAppliedCount",
        "rejectedByCloseObjectGuardCount",
    }
)
QUALITY_PRESETS = {
    "strict": {
        "description": "direct compare default; any positive hard/observed risk delta warns",
        "riskTolerances": {},
        "observedRiskTolerances": {},
    },
    "close-object-live": {
        "description": "close-object live fixture tolerance for polling jitter",
        "riskTolerances": {
            "trackerAssociationRiskScore": 0.10,
            "fragmentationRatio": 0.05,
            "overlapFragmentationRatio": 0.05,
        },
        "observedRiskTolerances": {
            "idSwitchRiskScore": 0.10,
            "ptsRegressionCount": 1.0,
            "stalePtsRatio": 0.05,
            "maxOverlapRisk": 0.25,
            "lostCount": 1.0,
            "reacquiredCount": 1.0,
            "missedFrameSpikeCount": 5.0,
            "directionChangeSpikeCount": 60.0,
        },
    },
    "control-live": {
        "description": "control sample tolerance; close-object decisions should stay mostly observational",
        "riskTolerances": {},
        "observedRiskTolerances": {
            "idSwitchRiskScore": 0.05,
            "ptsRegressionCount": 1.0,
            "stalePtsRatio": 0.05,
            "maxOverlapRisk": 0.30,
            "lostCount": 1.0,
            "reacquiredCount": 1.0,
            "missedFrameSpikeCount": 5.0,
            "directionChangeSpikeCount": 80.0,
        },
    },
    "field-driving-live": {
        "description": "vehicle-heavy field fixture tolerance; event/scenario gate remains strict",
        "riskTolerances": {
            "trackerAssociationRiskScore": 0.30,
            "fragmentationRatio": 0.15,
            "overlapFragmentationRatio": 0.15,
        },
        "observedRiskTolerances": {
            "idSwitchRiskScore": 0.50,
            "ptsRegressionCount": 1.0,
            "stalePtsRatio": 0.05,
            "maxOverlapRisk": 0.30,
            "lostCount": 8.0,
            "reacquiredCount": 4.0,
            "missedFrameSpikeCount": 80.0,
            "directionChangeSpikeCount": 400.0,
        },
    },
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="close-object guard off/diagnostic/enforce mode의 tracker 안정성 리포트를 비교합니다."
    )
    parser.add_argument("--file", default=DEFAULT_FILE, help="video root 기준 sample file token입니다.")
    parser.add_argument("--modes", default="off,diagnostic,enforce", help="쉼표로 구분한 mode 목록입니다.")
    parser.add_argument("--output-dir", default="", help="리포트 출력 디렉터리입니다.")
    parser.add_argument("--history-dir", default="", help="matrix report history index를 갱신할 디렉터리입니다.")
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
    parser.add_argument("--fixture-matrix", action="store_true", help="내장 close-object fixture matrix를 순차 실행합니다.")
    parser.add_argument("--fixture-ids", default="", help="--fixture-matrix에서 실행할 fixture id CSV입니다.")
    parser.add_argument("--max-fixtures", default="", help="--fixture-matrix에서 실행할 최대 fixture 수입니다.")
    parser.add_argument("--list-fixtures", action="store_true", help="내장 fixture matrix와 파일 존재 여부를 JSON으로 출력합니다.")
    parser.add_argument("--fail-on-missing-fixtures", action="store_true", help="matrix fixture 파일 누락을 실패로 처리합니다.")
    parser.add_argument("--fail-on-hold", action="store_true", help="matrix fixture judgement=hold를 실패로 처리합니다.")
    parser.add_argument(
        "--quality-preset",
        default="strict",
        choices=sorted(QUALITY_PRESETS),
        help="quality gate threshold preset입니다. direct compare 기본값은 strict입니다.",
    )
    parser.add_argument("--list-quality-presets", action="store_true", help="quality gate preset 목록을 JSON으로 출력합니다.")
    return parser.parse_args()


def mode_list(raw: str) -> list[str]:
    modes = [item.strip().lower() for item in raw.split(",") if item.strip()]
    if not modes:
        raise SystemExit("modes must not be empty")
    invalid = [mode for mode in modes if mode not in VALID_MODES]
    if invalid:
        raise SystemExit(f"invalid mode(s): {', '.join(invalid)}")
    return modes


def clone_args(args: argparse.Namespace, **updates: Any) -> argparse.Namespace:
    payload = vars(args).copy()
    payload.update(updates)
    return argparse.Namespace(**payload)


def video_root_path() -> pathlib.Path:
    raw_root = os.environ.get("MEDIA_SERVER_FILE_ROOT") or DEFAULT_FILE_ROOT
    root = pathlib.Path(raw_root)
    return root if root.is_absolute() else ROOT_DIR / root


def fixture_file_path(file_token: str) -> pathlib.Path:
    path = pathlib.Path(file_token)
    return path if path.is_absolute() else video_root_path() / path


def fixture_rows() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for fixture in FIXTURE_MATRIX:
        path = fixture_file_path(str(fixture["file"]))
        row = dict(fixture)
        row["path"] = str(path)
        row["exists"] = path.exists()
        rows.append(row)
    return rows


def quality_preset_rows() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for name, preset in QUALITY_PRESETS.items():
        row = dict(preset)
        row["id"] = name
        rows.append(row)
    return rows


def quality_preset(name: str) -> dict[str, Any]:
    preset = QUALITY_PRESETS.get(name)
    if preset is None:
        raise SystemExit(f"unknown quality preset: {name}")
    return {
        "id": name,
        "description": preset.get("description", ""),
        "riskTolerances": dict(preset.get("riskTolerances") or {}),
        "observedRiskTolerances": dict(preset.get("observedRiskTolerances") or {}),
    }


def positive_delta_map(delta: dict[str, Any], keys: set[str], tolerances: dict[str, Any]) -> dict[str, float]:
    out: dict[str, float] = {}
    for key, value in delta.items():
        if key not in keys or not isinstance(value, (int, float)):
            continue
        tolerance = float(tolerances.get(key, 0.0) or 0.0)
        if value > tolerance + QUALITY_EPSILON:
            out[key] = float(value)
    return out


def tolerance_note(key: str, tolerances: dict[str, Any]) -> str:
    tolerance = float(tolerances.get(key, 0.0) or 0.0)
    if tolerance <= 0:
        return ""
    return f" over tolerance {tolerance:.3f}"


def selected_fixtures(args: argparse.Namespace) -> list[dict[str, Any]]:
    rows = fixture_rows()
    if args.fixture_ids:
        wanted = [item.strip() for item in args.fixture_ids.split(",") if item.strip()]
        known = {str(item["id"]) for item in rows}
        unknown = [item for item in wanted if item not in known]
        if unknown:
            raise SystemExit(f"unknown fixture id(s): {', '.join(unknown)}")
        rows = [item for item in rows if str(item["id"]) in wanted]
    if args.max_fixtures:
        max_fixtures = int(args.max_fixtures)
        if max_fixtures <= 0:
            raise SystemExit("--max-fixtures must be positive")
        rows = rows[:max_fixtures]
    return rows


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
    permission_denied_detected = False
    last_error = ""
    for port in range(max(1, start_port), max(1, start_port) + 200):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                sock.bind(("127.0.0.1", port))
            except OSError as error:
                last_error = str(error)
                if error.errno in {errno.EACCES, errno.EPERM}:
                    permission_denied_detected = True
                continue
            return port
    if permission_denied_detected:
        raise RuntimeError(
            f"local TCP bind is blocked (socket error: {last_error}); "
            f"available localhost port not found from {start_port}. "
            "If this environment forbids local bind (e.g. sandbox), run with --use-existing-server "
            "and provide --http-base for a running server."
        )
    raise RuntimeError(f"available localhost port not found from {start_port} (all candidates in use)")


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
        value = metric_value(item, key)
        if isinstance(value, (int, float)):
            values.append(float(value))
    return values


def metric_value(item: dict[str, Any], key: str) -> float | int | None:
    if key == "trackerAssociationRiskScore":
        fragmentation = item.get("fragmentationRatio")
        overlap_fragmentation = item.get("overlapFragmentationRatio")
        if isinstance(fragmentation, (int, float)) and isinstance(overlap_fragmentation, (int, float)):
            return round(
                max(0.0, float(fragmentation) - 1.0) +
                max(0.0, float(overlap_fragmentation) - 1.0),
                6,
            )
        return None
    value = item.get(key)
    return value if isinstance(value, (int, float)) else None


def metric_stats(items: list[dict[str, Any]], keys: list[str]) -> dict[str, dict[str, float | int]]:
    stats: dict[str, dict[str, float | int]] = {}
    for key in keys:
        values = number_values(items, key)
        if not values:
            continue
        mean_value = statistics.mean(values)
        variance = statistics.pvariance(values) if len(values) > 1 else 0.0
        stats[key] = {
            "count": len(values),
            "min": round(min(values), 6),
            "max": round(max(values), 6),
            "mean": round(mean_value, 6),
            "variance": round(variance, 6),
            "stdev": round(variance ** 0.5, 6),
        }
    return stats


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
        "metricStats": metric_stats(items, REPEAT_STAT_KEYS),
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


def overall_judgement(mode_payloads: dict[str, dict[str, Any]],
                      deltas: dict[str, Any],
                      preset: dict[str, Any]) -> tuple[str, list[str]]:
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
    risk_tolerances = preset.get("riskTolerances") or {}
    observed_risk_tolerances = preset.get("observedRiskTolerances") or {}
    for name, delta in deltas.items():
        if delta.get("eventScenarioDelta"):
            reasons.append(f"{name} event/scenario signature changed")
        for key, value in sorted(positive_delta_map(delta, QUALITY_RISK_KEYS, risk_tolerances).items()):
            warnings.append(f"{name} {key} increased by {value:.3f}{tolerance_note(key, risk_tolerances)}")
        for key, value in sorted(positive_delta_map(delta, OBSERVED_RISK_KEYS, observed_risk_tolerances).items()):
            observed_warnings.append(
                f"{name} observed {key} changed by {value:.3f}{tolerance_note(key, observed_risk_tolerances)}"
            )
    if reasons:
        return "hold", reasons
    if warnings:
        return "warning", warnings
    if observed_warnings:
        return "warning", observed_warnings
    return "pass", ["mode comparison completed; default-on remains deferred"]


def quality_gate(judgement: str, deltas: dict[str, Any], preset: dict[str, Any]) -> dict[str, Any]:
    event_delta = any(bool(delta.get("eventScenarioDelta")) for delta in deltas.values())
    observed_event_delta = any(bool(delta.get("eventScenarioObservedDelta")) for delta in deltas.values())
    risk_tolerances = preset.get("riskTolerances") or {}
    observed_risk_tolerances = preset.get("observedRiskTolerances") or {}
    increased_risk: dict[str, dict[str, float]] = {}
    observed_increased_risk: dict[str, dict[str, float]] = {}
    for name, delta in deltas.items():
        risk_delta = positive_delta_map(delta, QUALITY_RISK_KEYS, risk_tolerances)
        if risk_delta:
            increased_risk[name] = risk_delta
        observed_delta = positive_delta_map(delta, OBSERVED_RISK_KEYS, observed_risk_tolerances)
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
        "qualityPreset": preset.get("id", "strict"),
        "qualityPresetDescription": preset.get("description", ""),
        "eventScenarioUnchanged": not event_delta,
        "eventScenarioObservedUnchanged": not observed_event_delta,
        "riskKeys": sorted(QUALITY_RISK_KEYS),
        "observedRiskKeys": sorted(OBSERVED_RISK_KEYS),
        "riskTolerances": risk_tolerances,
        "observedRiskTolerances": observed_risk_tolerances,
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
    append_metric_stats(lines, payload.get("metricStats") or {})
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


def append_metric_stats(lines: list[str], stats: dict[str, Any]) -> None:
    if not stats:
        return
    lines.extend(["", "## Repeat Metric Stats", ""])
    lines.append("| metric | count | mean | stdev | variance | min | max |")
    lines.append("| --- | --- | --- | --- | --- | --- | --- |")
    for key in REPEAT_STAT_KEYS:
        row = stats.get(key)
        if not isinstance(row, dict):
            continue
        lines.append(
            "| {metric} | {count} | {mean} | {stdev} | {variance} | {minv} | {maxv} |".format(
                metric=key,
                count=format_cell(row.get("count")),
                mean=format_cell(row.get("mean")),
                stdev=format_cell(row.get("stdev")),
                variance=format_cell(row.get("variance")),
                minv=format_cell(row.get("min")),
                maxv=format_cell(row.get("max")),
            )
        )


def write_report(summary: dict[str, Any], path: pathlib.Path) -> None:
    modes = summary["modes"]
    gate = summary.get("qualityGate") or {}
    lines = [
        "# Close-object Tracker Guard Comparison",
        "",
        f"- sample: `{summary['sample']}`",
        f"- modes: `{', '.join(modes.keys())}`",
        f"- baseline: `{summary.get('baselineMode', 'off')}`",
        f"- quality preset: `{summary.get('qualityPreset', gate.get('qualityPreset', 'strict'))}`",
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
    lines.extend(["", "## Repeat Metric Stats", ""])
    lines.append("| mode | metric | count | mean | stdev | variance | min | max |")
    lines.append("| --- | --- | --- | --- | --- | --- | --- | --- |")
    has_stats = False
    for mode, payload in modes.items():
        stats = payload.get("metricStats") or {}
        if not isinstance(stats, dict):
            continue
        for key in REPEAT_STAT_KEYS:
            row = stats.get(key)
            if not isinstance(row, dict):
                continue
            has_stats = True
            lines.append(
                "| {mode} | {metric} | {count} | {mean} | {stdev} | {variance} | {minv} | {maxv} |".format(
                    mode=mode,
                    metric=key,
                    count=format_cell(row.get("count")),
                    mean=format_cell(row.get("mean")),
                    stdev=format_cell(row.get("stdev")),
                    variance=format_cell(row.get("variance")),
                    minv=format_cell(row.get("min")),
                    maxv=format_cell(row.get("max")),
                )
            )
    if not has_stats:
        lines.append("| - | - | - | - | - | - | - | - |")
    lines.extend(["", "## Quality Gate", ""])
    lines.append("| check | value |")
    lines.append("| --- | --- |")
    lines.append(f"| quality preset | `{gate.get('qualityPreset') or 'strict'}` |")
    lines.append(f"| preset description | {gate.get('qualityPresetDescription') or '-'} |")
    lines.append(f"| event/scenario stable unchanged | `{gate.get('eventScenarioUnchanged')}` |")
    lines.append(f"| event/scenario observed unchanged | `{gate.get('eventScenarioObservedUnchanged')}` |")
    lines.append(f"| risk non-increasing | `{gate.get('riskNonIncreasing')}` |")
    lines.append(f"| risk keys | `{json.dumps(gate.get('riskKeys') or [], ensure_ascii=False)}` |")
    lines.append(f"| risk tolerances | `{json.dumps(gate.get('riskTolerances') or {}, ensure_ascii=False)}` |")
    lines.append(f"| observed risk non-increasing | `{gate.get('observedRiskNonIncreasing')}` |")
    lines.append(f"| observed risk keys | `{json.dumps(gate.get('observedRiskKeys') or [], ensure_ascii=False)}` |")
    lines.append(f"| observed risk tolerances | `{json.dumps(gate.get('observedRiskTolerances') or {}, ensure_ascii=False)}` |")
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


def emit_summary(summary: dict[str, Any]) -> None:
    gate = summary.get("qualityGate") or {}
    print(f"[summary-json] {summary.get('summaryPath')}")
    print(f"[report] {summary.get('reportPath')}")
    print(f"[judgement] {summary.get('overallJudgement')}")
    print(f"[default-on-candidate] {gate.get('defaultOnCandidate')}")
    print(f"[recommendation] {gate.get('recommendation')}")
    for reason in summary.get("reasons") or []:
        print(f"[reason] {reason}")


def run_comparison(args: argparse.Namespace,
                   modes: list[str],
                   output_dir: pathlib.Path,
                   fixture_id: str = "") -> dict[str, Any]:
    output_dir.mkdir(parents=True, exist_ok=True)
    mode_payloads = {mode: run_tracker(mode, args, output_dir, index)
                     for index, mode in enumerate(modes)}
    baseline_mode = "off" if "off" in mode_payloads else modes[0]
    deltas = compute_deltas(mode_payloads, baseline_mode)
    preset = quality_preset(args.quality_preset)
    judgement, reasons = overall_judgement(mode_payloads, deltas, preset)
    gate = quality_gate(judgement, deltas, preset)
    summary = {
        "kind": "close-object-tracker-comparison",
        "ok": judgement != "fail",
        "sample": args.file,
        "fixtureId": fixture_id,
        "qualityPreset": preset["id"],
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
    return summary


def write_matrix_report(matrix: dict[str, Any], path: pathlib.Path) -> None:
    lines = [
        "# Close-object Tracker Fixture Matrix",
        "",
        f"- modes: `{', '.join(matrix.get('modes') or [])}`",
        f"- ok: `{matrix.get('ok')}`",
        f"- output: `{matrix.get('outputDir')}`",
    ]
    history = matrix.get("history") or {}
    if history:
        lines.append(f"- history index: `{history.get('indexPath')}`")
        lines.append(f"- history report: `{history.get('indexReportPath')}`")
    lines.extend([
        "",
        "| fixture | status | preset | tracker limits | file | judgement | default-on candidate | recommendation | report |",
        "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ])
    for item in matrix.get("fixtures") or []:
        lines.append(
            "| {fixture} | {status} | {preset} | `{limits}` | `{file}` | {judgement} | {candidate} | {recommendation} | `{report}` |".format(
                fixture=format_cell(item.get("id")),
                status=format_cell(item.get("status")),
                preset=format_cell(item.get("qualityPreset")),
                limits=format_cell(json.dumps(item.get("trackerLimits") or {}, ensure_ascii=False)),
                file=format_cell(item.get("file")),
                judgement=format_cell(item.get("judgement")),
                candidate=format_cell(item.get("defaultOnCandidate")),
                recommendation=format_cell(item.get("recommendation")),
                report=format_cell(item.get("reportPath")),
            )
        )
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def resolve_output_path(raw_path: str) -> pathlib.Path:
    path = pathlib.Path(raw_path)
    return path if path.is_absolute() else ROOT_DIR / path


def history_run_id(created_at: str) -> str:
    safe = re.sub(r"[^0-9A-Za-z._-]+", "-", created_at).strip("-")
    return f"{safe}-{os.getpid()}"


def prepare_matrix_history(matrix: dict[str, Any], raw_history_dir: str) -> dict[str, Any]:
    root = resolve_output_path(raw_history_dir)
    run_id = history_run_id(str(matrix.get("createdAt") or dt.datetime.now(dt.timezone.utc).isoformat()))
    run_dir = root / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    return {
        "runId": run_id,
        "historyDir": str(root),
        "runDir": str(run_dir),
        "summaryPath": str(run_dir / "matrix-summary.json"),
        "reportPath": str(run_dir / "matrix-report.md"),
        "indexPath": str(root / "index.json"),
        "indexReportPath": str(root / "index.md"),
    }


def matrix_history_entry(matrix: dict[str, Any], history: dict[str, Any]) -> dict[str, Any]:
    fixtures = matrix.get("fixtures") or []
    return {
        "runId": history.get("runId"),
        "createdAt": matrix.get("createdAt"),
        "ok": matrix.get("ok"),
        "fixtureCount": len(fixtures),
        "failedCount": sum(1 for item in fixtures if item.get("status") in {"fail", "missing"}),
        "holdCount": sum(1 for item in fixtures if item.get("judgement") == "hold"),
        "warningCount": sum(1 for item in fixtures if item.get("judgement") == "warning"),
        "summaryPath": history.get("summaryPath"),
        "reportPath": history.get("reportPath"),
    }


def write_history_index_report(index_payload: dict[str, Any], path: pathlib.Path) -> None:
    lines = [
        "# Close-object Tracker Fixture Matrix History",
        "",
        f"- updated: `{index_payload.get('updatedAt')}`",
        f"- history dir: `{index_payload.get('historyDir')}`",
        "",
        "| run | created | ok | fixtures | failed | hold | warnings | report |",
        "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    for item in index_payload.get("runs") or []:
        lines.append(
            "| {run} | {created} | {ok} | {fixtures} | {failed} | {hold} | {warnings} | `{report}` |".format(
                run=format_cell(item.get("runId")),
                created=format_cell(item.get("createdAt")),
                ok=format_cell(item.get("ok")),
                fixtures=format_cell(item.get("fixtureCount")),
                failed=format_cell(item.get("failedCount")),
                hold=format_cell(item.get("holdCount")),
                warnings=format_cell(item.get("warningCount")),
                report=format_cell(item.get("reportPath")),
            )
        )
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def archive_matrix_history(matrix: dict[str, Any], summary_path: pathlib.Path, report_path: pathlib.Path) -> None:
    history = matrix.get("history") or {}
    if not history:
        return
    summary_copy = pathlib.Path(str(history["summaryPath"]))
    report_copy = pathlib.Path(str(history["reportPath"]))
    index_path = pathlib.Path(str(history["indexPath"]))
    index_report_path = pathlib.Path(str(history["indexReportPath"]))
    shutil.copy2(summary_path, summary_copy)
    shutil.copy2(report_path, report_copy)

    existing_runs: list[dict[str, Any]] = []
    if index_path.exists():
        try:
            existing = json.loads(index_path.read_text(encoding="utf-8"))
            if isinstance(existing.get("runs"), list):
                existing_runs = [item for item in existing["runs"] if isinstance(item, dict)]
        except json.JSONDecodeError:
            existing_runs = []
    entry = matrix_history_entry(matrix, history)
    runs = [item for item in existing_runs if item.get("runId") != entry.get("runId")]
    runs.append(entry)
    runs.sort(key=lambda item: str(item.get("createdAt") or ""), reverse=True)
    index_payload = {
        "kind": "close-object-tracker-fixture-matrix-history",
        "historyDir": history.get("historyDir"),
        "updatedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
        "runs": runs,
    }
    index_path.write_text(json.dumps(index_payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    write_history_index_report(index_payload, index_report_path)


def run_fixture_matrix(args: argparse.Namespace, modes: list[str], output_dir: pathlib.Path) -> int:
    output_dir.mkdir(parents=True, exist_ok=True)
    fixtures = selected_fixtures(args)
    results: list[dict[str, Any]] = []
    failed = False
    for fixture in fixtures:
        fixture_id = str(fixture["id"])
        file_token = str(fixture["file"])
        if not fixture.get("exists"):
            status = "missing" if args.fail_on_missing_fixtures else "skipped"
            failed = failed or args.fail_on_missing_fixtures
            results.append({
                "id": fixture_id,
                "file": file_token,
                "path": fixture.get("path"),
                "qualityPreset": fixture.get("qualityPreset", args.quality_preset),
                "status": status,
                "reason": "fixture file missing",
            })
            print(f"[fixture] {fixture_id} {status}: {file_token}")
            continue
        fixture_args = clone_args(
            args,
            file=file_token,
            quality_preset=fixture.get("qualityPreset", args.quality_preset),
            class_whitelist=args.class_whitelist or fixture.get("classWhitelist", ""),
            max_fragmentation=args.max_fragmentation or fixture.get("maxFragmentation", ""),
            max_overlap_fragmentation=args.max_overlap_fragmentation or fixture.get("maxOverlapFragmentation", ""),
            max_id_switch_risk=args.max_id_switch_risk or fixture.get("maxIdSwitchRisk", ""),
        )
        tracker_limits = {
            key: value for key, value in {
                "maxFragmentation": fixture_args.max_fragmentation,
                "maxOverlapFragmentation": fixture_args.max_overlap_fragmentation,
                "maxIdSwitchRisk": fixture_args.max_id_switch_risk,
            }.items() if value
        }
        fixture_output_dir = output_dir / fixture_id
        summary = run_comparison(fixture_args, modes, fixture_output_dir, fixture_id)
        gate = summary.get("qualityGate") or {}
        judgement = str(summary.get("overallJudgement") or "")
        if judgement == "fail":
            status = "fail"
        elif judgement == "hold":
            status = "hold"
        elif judgement == "warning":
            status = "warning"
        else:
            status = "ok"
        failed = failed or status == "fail" or (args.fail_on_hold and status == "hold")
        results.append({
            "id": fixture_id,
            "file": file_token,
            "path": fixture.get("path"),
            "qualityPreset": summary.get("qualityPreset"),
            "trackerLimits": tracker_limits,
            "status": status,
            "judgement": judgement,
            "defaultOnCandidate": gate.get("defaultOnCandidate"),
            "recommendation": gate.get("recommendation"),
            "summaryPath": summary.get("summaryPath"),
            "reportPath": summary.get("reportPath"),
        })
        print(
            f"[fixture] {fixture_id} {status}: judgement={summary.get('overallJudgement')} "
            f"default-on-candidate={gate.get('defaultOnCandidate')}"
        )
    matrix = {
        "kind": "close-object-tracker-fixture-matrix",
        "ok": not failed,
        "modes": modes,
        "outputDir": str(output_dir),
        "fixtures": results,
        "createdAt": dt.datetime.now(dt.timezone.utc).isoformat(),
    }
    summary_path = output_dir / "matrix-summary.json"
    report_path = output_dir / "matrix-report.md"
    matrix["summaryPath"] = str(summary_path)
    matrix["reportPath"] = str(report_path)
    if args.history_dir:
        matrix["history"] = prepare_matrix_history(matrix, args.history_dir)
    write_matrix_report(matrix, report_path)
    summary_path.write_text(json.dumps(matrix, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if matrix.get("history"):
        archive_matrix_history(matrix, summary_path, report_path)
        history = matrix["history"]
        print(f"[matrix-history-index] {history.get('indexPath')}")
        print(f"[matrix-history-report] {history.get('indexReportPath')}")
    print(f"[matrix-summary-json] {summary_path}")
    print(f"[matrix-report] {report_path}")
    print(f"[matrix-ok] {matrix['ok']}")
    return 0 if matrix["ok"] else 1


def main() -> int:
    args = parse_args()
    if args.list_quality_presets:
        print(json.dumps({"qualityPresets": quality_preset_rows()}, ensure_ascii=False, indent=2))
        return 0
    if args.list_fixtures:
        print(json.dumps({"fixtures": fixture_rows()}, ensure_ascii=False, indent=2))
        return 0

    modes = mode_list(args.modes)
    output_dir = pathlib.Path(args.output_dir) if args.output_dir else pathlib.Path(
        f"/tmp/media_server_close_object_tracker_{int(dt.datetime.now().timestamp())}_{os.getpid()}"
    )
    if args.fixture_matrix:
        return run_fixture_matrix(args, modes, output_dir)

    summary = run_comparison(args, modes, output_dir)
    emit_summary(summary)
    return 0 if summary.get("overallJudgement") != "fail" else 1


if __name__ == "__main__":
    raise SystemExit(main())

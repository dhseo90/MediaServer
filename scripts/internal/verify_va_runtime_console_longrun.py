#!/usr/bin/env python3
# 파일 용도: VA Metadata Runtime Console을 장시간 구동하며 cleanup과 resource 안정성을 검증한다.
"""선택형 soak test로 local server와 consumer를 지정 시간 유지한 뒤 정리 상태를 확인한다."""

from __future__ import annotations

import argparse
import json
import os
import re
import signal
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

KB_PER_MB = 1024.0
DEFAULT_RSS_WARMUP_MINUTES = 5.0
DEFAULT_RSS_LARGE_DROP_MB = 20.0
DEFAULT_IDLE_SAMPLE_INTERVAL_SECONDS = 30.0
REPRESENTATIVE_CLEANUP_PORTS = [8080, 8081, 8554, 8555]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="VA Runtime Console 장시간 검증")
    parser.add_argument("--duration-minutes", type=float, default=float(os.environ.get("MEDIA_SERVER_VERIFY_VA_RUNTIME_LONGRUN_MINUTES", "30")))
    parser.add_argument("--clients", type=int, default=int(os.environ.get("MEDIA_SERVER_VERIFY_VA_RUNTIME_LONGRUN_CLIENTS", "1")))
    parser.add_argument("--include-rtsp", action="store_true", default=os.environ.get("MEDIA_SERVER_VERIFY_VA_RUNTIME_LONGRUN_INCLUDE_RTSP", "0") == "1")
    parser.add_argument("--include-sidechannel", action="store_true", default=os.environ.get("MEDIA_SERVER_VERIFY_VA_RUNTIME_LONGRUN_INCLUDE_SIDECHANNEL", "1") != "0")
    parser.add_argument("--include-dashboard", action="store_true", default=os.environ.get("MEDIA_SERVER_VERIFY_VA_RUNTIME_LONGRUN_INCLUDE_DASHBOARD", "1") != "0")
    parser.add_argument("--no-sidechannel", action="store_true")
    parser.add_argument("--no-dashboard", action="store_true")
    parser.add_argument("--skip-build", action="store_true")
    parser.add_argument("--file", default=os.environ.get("MEDIA_SERVER_VERIFY_VA_RUNTIME_LONGRUN_FILE", "sample_h264.mp4"))
    parser.add_argument("--rtsp-port", type=int, default=int(os.environ.get("MEDIA_SERVER_VERIFY_VA_RUNTIME_LONGRUN_RTSP_PORT", "8555")))
    parser.add_argument("--http-port", type=int, default=int(os.environ.get("MEDIA_SERVER_VERIFY_VA_RUNTIME_LONGRUN_HTTP_PORT", "8081")))
    parser.add_argument("--poll-interval-seconds", type=float, default=float(os.environ.get("MEDIA_SERVER_VERIFY_VA_RUNTIME_LONGRUN_POLL_SECONDS", "5")))
    parser.add_argument("--work-dir", default=os.environ.get("MEDIA_SERVER_VERIFY_VA_RUNTIME_LONGRUN_WORK_DIR", ""))
    parser.add_argument("--summary-file", default=os.environ.get("MEDIA_SERVER_VERIFY_VA_RUNTIME_LONGRUN_SUMMARY", ""))
    parser.add_argument("--report-file", default=os.environ.get("MEDIA_SERVER_VERIFY_VA_RUNTIME_LONGRUN_REPORT", ""))
    parser.add_argument("--auth-mode", default=os.environ.get("MEDIA_SERVER_VERIFY_VA_RUNTIME_LONGRUN_AUTH_MODE", "off"))
    parser.add_argument("--rss-warmup-minutes", type=float, default=float(os.environ.get("MEDIA_SERVER_VERIFY_VA_RUNTIME_LONGRUN_RSS_WARMUP_MINUTES", str(DEFAULT_RSS_WARMUP_MINUTES))))
    parser.add_argument("--rss-large-drop-mb", type=float, default=float(os.environ.get("MEDIA_SERVER_VERIFY_VA_RUNTIME_LONGRUN_RSS_LARGE_DROP_MB", str(DEFAULT_RSS_LARGE_DROP_MB))))
    parser.add_argument("--idle-after-cleanup-minutes", type=float, default=float(os.environ.get("MEDIA_SERVER_VERIFY_VA_RUNTIME_LONGRUN_IDLE_AFTER_CLEANUP_MINUTES", "0")))
    parser.add_argument("--idle-sample-interval-seconds", type=float, default=float(os.environ.get("MEDIA_SERVER_VERIFY_VA_RUNTIME_LONGRUN_IDLE_SAMPLE_SECONDS", str(DEFAULT_IDLE_SAMPLE_INTERVAL_SECONDS))))
    return parser.parse_args()


def log(message: str) -> None:
    print(message, flush=True)


def request_json(base: str, method: str, path: str, timeout: float = 5.0) -> dict[str, Any]:
    url = f"{base.rstrip('/')}{path}"
    request = urllib.request.Request(url, method=method)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            text = response.read().decode("utf-8", errors="replace")
            return json.loads(text or "{}")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {path} HTTP {exc.code}: {body}") from exc


def wait_health(base: str, timeout_s: float) -> None:
    deadline = time.monotonic() + timeout_s
    last_error = ""
    while time.monotonic() < deadline:
        try:
            payload = request_json(base, "GET", "/health", 2.0)
            if payload.get("status") == "ok":
                return
        except Exception as exc:  # noqa: BLE001
            last_error = str(exc)
        time.sleep(0.5)
    raise RuntimeError(f"server health did not become ready: {last_error}")


def run_command(command: list[str], cwd: Path, log_path: Path, env: dict[str, str] | None = None) -> int:
    with log_path.open("w", encoding="utf-8") as handle:
        proc = subprocess.run(command, cwd=cwd, env=env, stdout=handle, stderr=subprocess.STDOUT, text=True)
    return int(proc.returncode)


def popen_command(command: list[str], cwd: Path, log_path: Path, env: dict[str, str] | None = None) -> subprocess.Popen[str]:
    handle = log_path.open("w", encoding="utf-8")
    proc = subprocess.Popen(command, cwd=cwd, env=env, stdout=handle, stderr=subprocess.STDOUT, text=True)
    setattr(proc, "_log_handle", handle)
    return proc


def close_process(proc: subprocess.Popen[str], timeout_s: float = 10.0) -> int:
    handle = getattr(proc, "_log_handle", None)
    try:
        return proc.wait(timeout=timeout_s)
    except subprocess.TimeoutExpired:
        proc.terminate()
        try:
            return proc.wait(timeout=5.0)
        except subprocess.TimeoutExpired:
            proc.kill()
            return proc.wait(timeout=5.0)
    finally:
        if handle is not None:
            handle.close()


def terminate_process(proc: subprocess.Popen[str], timeout_s: float = 10.0) -> int:
    if proc.poll() is not None:
        return close_process(proc, 0.1)
    proc.terminate()
    return close_process(proc, timeout_s)


def process_metrics(pid: int) -> dict[str, Any]:
    try:
        output = subprocess.check_output(
            ["ps", "-p", str(pid), "-o", "rss=", "-o", "%cpu=", "-o", "etime="],
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
    except subprocess.SubprocessError:
        return {"rssKb": 0, "cpuPercent": 0.0, "etime": ""}
    parts = output.split(None, 2)
    if len(parts) < 2:
        return {"rssKb": 0, "cpuPercent": 0.0, "etime": output}
    return {
        "rssKb": int(float(parts[0] or 0)),
        "cpuPercent": float(parts[1] or 0.0),
        "etime": parts[2] if len(parts) > 2 else "",
    }


def create_dashboard_tap(base: str, file_token: str) -> str:
    query = urllib.parse.urlencode(
        {
            "file": file_token,
            "va": "1",
            "profileId": f"runtime-console-longrun-{int(time.time())}",
        }
    )
    payload = request_json(base, "POST", f"/lab/analysis/taps?{query}", 10.0)
    tap_id = str(payload.get("tapId") or "")
    if not tap_id:
        raise RuntimeError(f"analysis tap creation failed: {payload}")
    return tap_id


def delete_tap(base: str, tap_id: str) -> None:
    if tap_id:
        try:
            request_json(base, "DELETE", f"/lab/analysis/taps/{urllib.parse.quote(tap_id)}", 5.0)
        except Exception as exc:  # noqa: BLE001
            log(f"[warn] dashboard tap cleanup failed: {exc}")


def runtime_counts(payload: dict[str, Any]) -> dict[str, int]:
    session = payload.get("sessionManager") if isinstance(payload.get("sessionManager"), dict) else {}
    webrtc = payload.get("webrtcHttp") if isinstance(payload.get("webrtcHttp"), dict) else {}
    metadata = webrtc.get("metadataSideChannel") if isinstance(webrtc.get("metadataSideChannel"), dict) else {}
    return {
        "activeSessions": int(session.get("activeSessions", 0) or 0),
        "resourceActiveStreams": int(session.get("resourceActiveStreams", 0) or 0),
        "registryActiveStreams": int(session.get("registryActiveStreams", 0) or 0),
        "activeAnalysisTaps": int(session.get("activeAnalysisTaps", 0) or 0),
        "egressSessions": int(webrtc.get("egressSessions", 0) or 0),
        "publishSessions": int(webrtc.get("publishSessions", 0) or 0),
        "activeSseClients": int(metadata.get("activeSseClients", 0) or 0),
        "activeWebSocketClients": int(metadata.get("activeWebSocketClients", 0) or 0),
    }


def runtime_debug_counters(payload: dict[str, Any]) -> dict[str, int]:
    counters = payload.get("debugCounters") if isinstance(payload.get("debugCounters"), dict) else {}
    return {str(key): int(value or 0) for key, value in counters.items() if isinstance(value, (int, float))}


def collect_sample(base: str, pid: int, tap_id: str) -> dict[str, Any]:
    runtime = request_json(base, "GET", "/lab/runtime/status", 5.0)
    sample: dict[str, Any] = {
        "timestampMs": int(time.time() * 1000),
        "process": process_metrics(pid),
        "runtime": runtime_counts(runtime),
    }
    counters = runtime_debug_counters(runtime)
    if counters:
        sample["debugCounters"] = counters
    if tap_id:
        metrics = request_json(base, "GET", f"/lab/analysis/taps/{urllib.parse.quote(tap_id)}/metrics", 5.0)
        tap_state = metrics.get("tapState") if isinstance(metrics.get("tapState"), dict) else {}
        track_state = metrics.get("trackState") if isinstance(metrics.get("trackState"), dict) else {}
        report = metrics.get("metricsReport") if isinstance(metrics.get("metricsReport"), dict) else {}
        sample["tapMetrics"] = {
            "decodedFrames": int(tap_state.get("decodedFrames", 0) or 0),
            "sampledFrames": int(tap_state.get("sampledFrames", 0) or 0),
            "analyzedPackets": int(tap_state.get("analyzedPackets", 0) or 0),
            "pendingFrames": int(tap_state.get("pendingFrames", 0) or 0),
            "peakPendingFrames": int(tap_state.get("peakPendingFrames", 0) or 0),
            "inferenceMs": float(tap_state.get("averageInferenceMs", 0) or 0.0),
            "activeTracks": int(track_state.get("activeTracks", 0) or 0),
            "lostTracks": int(track_state.get("lostTracks", 0) or 0),
            "scenarioInstances": int((report.get("scenarioInstances") or report.get("activeScenarioCount") or 0) or 0),
            "eventEmittedCount": int((report.get("eventEmittedCount") or report.get("eventsEmitted") or 0) or 0),
            "eventDedupCount": int((report.get("eventDedupCount") or 0) or 0),
        }
    return sample


def wait_runtime_idle(base: str, timeout_s: float, samples: list[dict[str, Any]]) -> tuple[bool, dict[str, int]]:
    deadline = time.monotonic() + timeout_s
    latest: dict[str, int] = {}
    while time.monotonic() < deadline:
        try:
            latest = runtime_counts(request_json(base, "GET", "/lab/runtime/status", 5.0))
            samples.append({"timestampMs": int(time.time() * 1000), "runtime": latest, "phase": "cleanup"})
            if all(value == 0 for value in latest.values()):
                return True, latest
        except Exception:
            pass
        time.sleep(1.0)
    return False, latest


def active_streams(counts: dict[str, Any]) -> int:
    resource_streams = int(counts.get("resourceActiveStreams", 0) or 0)
    registry_streams = int(counts.get("registryActiveStreams", 0) or 0)
    return max(resource_streams, registry_streams)


def runtime_count_max(samples: list[dict[str, Any]], key: str) -> int:
    maximum = 0
    for sample in samples:
        runtime = sample.get("runtime") if isinstance(sample.get("runtime"), dict) else {}
        if key == "activeStreams":
            value = active_streams(runtime)
        else:
            value = int(runtime.get(key, 0) or 0)
        maximum = max(maximum, value)
    return maximum


def latest_debug_counters(samples: list[dict[str, Any]]) -> dict[str, int]:
    for sample in reversed(samples):
        counters = sample.get("debugCounters") if isinstance(sample.get("debugCounters"), dict) else {}
        if counters:
            return {str(key): int(value or 0) for key, value in counters.items() if isinstance(value, (int, float))}
    return {}


RTSP_GSTREAMER_DEBUG_COUNTER_KEYS = [
    "rtspPendingQueuePeak",
    "rtspPendingQueueSizeAtStop",
    "rtspPendingQueueSizeAtDestroy",
    "rtspPendingQueueFlushedCount",
    "rtspPendingQueueDroppedCount",
    "appsrcPushAfterStopCount",
    "rtspAppsrcPushOkCount",
    "rtspAppsrcPushFailCount",
    "rtspAppsrcFlowErrorCount",
    "rtspAppsrcFlowFlushingCount",
    "rtspAppsrcFlowEosCount",
    "rtspAppsrcFlowErrorReturnCount",
    "rtspAppsrcFlowNotLinkedCount",
    "rtspAppsrcFlowNotNegotiatedCount",
    "rtspAppsrcFlowOtherErrorCount",
    "rtspAppsrcFlowErrorAfterStopCount",
    "rtspAppsrcFlowErrorDuringActiveCount",
    "rtspAppsrcFlowErrorDuringStoppingCount",
    "rtspAppsrcLastFlowReturn",
    "rtspAppsrcLastFlowReturnPhase",
    "rtspPipelineNullTransitionCount",
    "busWatchCreatedCount",
    "busWatchDestroyedCount",
    "appsrcEosSentCount",
    "appsrcClearedCount",
    "overlayProbeAttachedCount",
    "overlayProbeRemovedCount",
]


RTSP_FLOW_RETURN_LABELS = {
    0: "OK",
    -1: "NOT_LINKED",
    -2: "FLUSHING",
    -3: "EOS",
    -4: "NOT_NEGOTIATED",
    -5: "ERROR",
    -6: "NOT_SUPPORTED",
}


RTSP_FLOW_PHASE_LABELS = {
    0: "not-started",
    1: "active",
    2: "stopping",
    3: "stopped",
}


def rtsp_flow_return_label(value: Any) -> str:
    numeric = int(value or 0)
    return RTSP_FLOW_RETURN_LABELS.get(numeric, f"UNKNOWN({numeric})")


def rtsp_flow_phase_label(value: Any) -> str:
    numeric = int(value or 0)
    return RTSP_FLOW_PHASE_LABELS.get(numeric, f"unknown({numeric})")


def rtsp_gstreamer_report_value(key: str, value: Any) -> str:
    if key == "rtspAppsrcLastFlowReturn":
        return f"{markdown_value(value)} ({rtsp_flow_return_label(value)})"
    if key == "rtspAppsrcLastFlowReturnPhase":
        return f"{markdown_value(value)} ({rtsp_flow_phase_label(value)})"
    return markdown_value(value)


def rtsp_gstreamer_debug_counters(counters: dict[str, Any]) -> dict[str, int]:
    if not isinstance(counters, dict):
        return {}
    return {
        key: int(counters.get(key, 0) or 0)
        for key in RTSP_GSTREAMER_DEBUG_COUNTER_KEYS
        if key in counters
    }


def rtsp_gstreamer_warning_details(counters: dict[str, Any]) -> list[dict[str, Any]]:
    focus = rtsp_gstreamer_debug_counters(counters)
    details: list[dict[str, Any]] = []

    def add(condition: bool, counter: str, severity: str, reason: str) -> None:
        if condition:
            details.append(
                {
                    "counter": counter,
                    "value": int(focus.get(counter, 0) or 0),
                    "severity": severity,
                    "reason": reason,
                }
            )

    add(
        int(focus.get("rtspPendingQueueSizeAtStop", 0) or 0) > 0,
        "rtspPendingQueueSizeAtStop",
        "WARNING",
        "RTSP egress Stop 시점에 pending queue 잔여가 관측됨",
    )
    add(
        int(focus.get("rtspPendingQueueSizeAtDestroy", 0) or 0) > 0,
        "rtspPendingQueueSizeAtDestroy",
        "WARNING_OR_HOLD_CANDIDATE",
        "RTSP egress destroy 시점에 pending queue 잔여가 관측됨",
    )
    add(
        int(focus.get("appsrcPushAfterStopCount", 0) or 0) > 0,
        "appsrcPushAfterStopCount",
        "WARNING",
        "Stop 이후 appsrc push/enqueue 시도가 관측됨",
    )
    add(
        int(focus.get("rtspAppsrcFlowErrorAfterStopCount", 0) or 0) > 0,
        "rtspAppsrcFlowErrorAfterStopCount",
        "WARNING",
        "Stop 이후 appsrc flow error 또는 push 시도가 관측됨",
    )
    add(
        int(focus.get("busWatchCreatedCount", 0) or 0) != int(focus.get("busWatchDestroyedCount", 0) or 0),
        "busWatchCreatedCount",
        "WARNING",
        "bus watch create/destroy count mismatch",
    )
    add(
        int(focus.get("overlayProbeAttachedCount", 0) or 0) != int(focus.get("overlayProbeRemovedCount", 0) or 0),
        "overlayProbeAttachedCount",
        "WARNING",
        "overlay probe attach/remove count mismatch",
    )
    add(
        int(focus.get("rtspAppsrcPushFailCount", 0) or 0) > 0,
        "rtspAppsrcPushFailCount",
        "WARNING",
        "appsrc push failure가 관측됨",
    )

    typed_flow_total = sum(
        int(focus.get(key, 0) or 0)
        for key in [
            "rtspAppsrcFlowFlushingCount",
            "rtspAppsrcFlowEosCount",
            "rtspAppsrcFlowErrorReturnCount",
            "rtspAppsrcFlowNotLinkedCount",
            "rtspAppsrcFlowNotNegotiatedCount",
            "rtspAppsrcFlowOtherErrorCount",
        ]
    )
    add(
        int(focus.get("rtspAppsrcFlowErrorDuringActiveCount", 0) or 0) > 0,
        "rtspAppsrcFlowErrorDuringActiveCount",
        "WARNING",
        "RTSP active 구간에서 non-OK GstFlowReturn이 관측됨",
    )
    add(
        int(focus.get("rtspAppsrcFlowErrorReturnCount", 0) or 0) > 0,
        "rtspAppsrcFlowErrorReturnCount",
        "WARNING",
        "GstFlowReturn ERROR가 관측됨",
    )
    add(
        int(focus.get("rtspAppsrcFlowNotLinkedCount", 0) or 0) > 0,
        "rtspAppsrcFlowNotLinkedCount",
        "WARNING",
        "GstFlowReturn NOT_LINKED가 관측됨",
    )
    add(
        int(focus.get("rtspAppsrcFlowNotNegotiatedCount", 0) or 0) > 0,
        "rtspAppsrcFlowNotNegotiatedCount",
        "WARNING",
        "GstFlowReturn NOT_NEGOTIATED가 관측됨",
    )
    add(
        int(focus.get("rtspAppsrcFlowOtherErrorCount", 0) or 0) > 0,
        "rtspAppsrcFlowOtherErrorCount",
        "WARNING",
        "분류되지 않은 non-OK GstFlowReturn이 관측됨",
    )
    add(
        int(focus.get("rtspAppsrcFlowErrorCount", 0) or 0) > 0 and typed_flow_total == 0,
        "rtspAppsrcFlowErrorCount",
        "WARNING",
        "GStreamer appsrc flow error가 관측됐지만 종류별 counter가 없음",
    )
    return details


def rtsp_gstreamer_stop_destroy_snapshot(counters: dict[str, Any]) -> dict[str, Any]:
    focus = rtsp_gstreamer_debug_counters(counters)
    stop_size = int(focus.get("rtspPendingQueueSizeAtStop", 0) or 0)
    destroy_size = int(focus.get("rtspPendingQueueSizeAtDestroy", 0) or 0)
    return {
        "rtspPendingQueueSizeAtStop": stop_size,
        "rtspPendingQueueSizeAtDestroy": destroy_size,
        "appsrcPushAfterStopCount": int(focus.get("appsrcPushAfterStopCount", 0) or 0),
        "rtspAppsrcFlowErrorAfterStopCount": int(focus.get("rtspAppsrcFlowErrorAfterStopCount", 0) or 0),
        "appsrcEosSentCount": int(focus.get("appsrcEosSentCount", 0) or 0),
        "appsrcClearedCount": int(focus.get("appsrcClearedCount", 0) or 0),
        "rtspAppsrcLastFlowReturn": int(focus.get("rtspAppsrcLastFlowReturn", 0) or 0),
        "rtspAppsrcLastFlowReturnLabel": rtsp_flow_return_label(focus.get("rtspAppsrcLastFlowReturn", 0)),
        "rtspAppsrcLastFlowReturnPhase": int(focus.get("rtspAppsrcLastFlowReturnPhase", 0) or 0),
        "rtspAppsrcLastFlowReturnPhaseLabel": rtsp_flow_phase_label(
            focus.get("rtspAppsrcLastFlowReturnPhase", 0)
        ),
        "pendingQueueRemaining": stop_size > 0 or destroy_size > 0,
    }


def observe_idle_after_cleanup(base: str, pid: int, duration_s: float, interval_s: float) -> list[dict[str, Any]]:
    samples: list[dict[str, Any]] = []
    deadline = time.monotonic() + duration_s
    interval = max(interval_s, 1.0)
    while True:
        sample = collect_sample(base, pid, "")
        sample["phase"] = "idle-after-cleanup"
        samples.append(sample)
        counts = sample.get("runtime", {})
        rss = sample.get("process", {}).get("rssKb", 0)
        log(
            "[idle-sample] "
            f"rssKb={rss} activeSessions={counts.get('activeSessions', 0)} "
            f"streams={active_streams(counts)} "
            f"taps={counts.get('activeAnalysisTaps', 0)} "
            f"sse={counts.get('activeSseClients', 0)} ws={counts.get('activeWebSocketClients', 0)} "
            f"rtspConsumers={counts.get('egressSessions', 0)}"
        )
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            break
        time.sleep(min(interval, remaining))
    return samples


def summarize_idle_after_cleanup(
    enabled: bool,
    requested_duration_s: int,
    sample_interval_s: float,
    cleanup_ok: bool,
    samples: list[dict[str, Any]],
) -> dict[str, Any]:
    rss_samples = build_rss_samples(samples)
    rss_values = [int(sample.get("rssKb", 0) or 0) for sample in rss_samples]
    first = rss_samples[0] if rss_samples else {}
    last = rss_samples[-1] if rss_samples else {}
    observed_minutes = 0.0
    rss_delta_mb = 0.0
    rss_delta_per_minute_mb = 0.0
    if first and last:
        observed_minutes = max(
            0.0,
            (float(last.get("elapsedSec", 0.0) or 0.0) - float(first.get("elapsedSec", 0.0) or 0.0)) / 60.0,
        )
        rss_delta_mb = mb_from_kb(int(last.get("rssKb", 0) or 0) - int(first.get("rssKb", 0) or 0))
        rss_delta_per_minute_mb = rate_per_minute(rss_delta_mb, observed_minutes)

    active_sessions_max = runtime_count_max(samples, "activeSessions")
    active_streams_max = runtime_count_max(samples, "activeStreams")
    active_taps_max = runtime_count_max(samples, "activeAnalysisTaps")
    sse_clients_max = runtime_count_max(samples, "activeSseClients")
    ws_clients_max = runtime_count_max(samples, "activeWebSocketClients")
    rtsp_consumers_max = runtime_count_max(samples, "egressSessions")
    active_count_reappeared = any(
        value > 0
        for value in [
            active_sessions_max,
            active_streams_max,
            active_taps_max,
            sse_clients_max,
            ws_clients_max,
            rtsp_consumers_max,
        ]
    )

    judgement = "DISABLED"
    reason = "idle-after-cleanup disabled"
    if enabled and not cleanup_ok:
        judgement = "HOLD"
        reason = "cleanup did not reach idle before idle observation"
    elif enabled and active_count_reappeared:
        judgement = "HOLD"
        reason = "runtime counts reappeared during idle observation"
    elif enabled and not rss_samples:
        judgement = "WARNING"
        reason = "idle observation produced no RSS samples"
    elif enabled and rss_delta_mb > 0:
        judgement = "WARNING"
        reason = "RSS increased during idle observation"
    elif enabled:
        judgement = "PASS"
        reason = "RSS stayed flat or decreased during idle observation"

    return {
        "enabled": enabled,
        "durationSeconds": requested_duration_s,
        "sampleIntervalSeconds": sample_interval_s,
        "sampleCount": len(samples),
        "rssSampleCount": len(rss_samples),
        "rssFirstMb": first.get("rssMb"),
        "rssLastMb": last.get("rssMb"),
        "rssMaxMb": mb_from_kb(max(rss_values)) if rss_values else None,
        "rssDeltaMb": rss_delta_mb if rss_samples else None,
        "rssDeltaPerMinuteMb": rss_delta_per_minute_mb if rss_samples else None,
        "observedMinutes": round(observed_minutes, 3),
        "activeSessionsMax": active_sessions_max,
        "activeStreamsMax": active_streams_max,
        "activeAnalysisTapsMax": active_taps_max,
        "sseClientsMax": sse_clients_max,
        "wsClientsMax": ws_clients_max,
        "rtspConsumersMax": rtsp_consumers_max,
        "activeCountReappeared": active_count_reappeared,
        "judgement": judgement,
        "reason": reason,
        "rssSamples": rss_samples,
    }


def ports_clean(ports: list[int]) -> bool:
    for port in sorted(set(ports)):
        result = subprocess.run(
            ["lsof", "-nP", f"-iTCP:{port}", "-sTCP:LISTEN"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            text=True,
        )
        if result.returncode == 0:
            return False
    return True


def enabled_env_flag(name: str) -> bool:
    return os.environ.get(name, "").strip().lower() in {"1", "true", "yes", "on"}


def cleanup_ports(run_ports: list[int]) -> list[int]:
    ports = list(run_ports)
    if enabled_env_flag("MEDIA_SERVER_VERIFY_VA_RUNTIME_LONGRUN_CHECK_REPRESENTATIVE_PORTS") or enabled_env_flag(
        "MEDIA_SERVER_VERIFY_RUNTIME_LONGRUN_CHECK_REPRESENTATIVE_PORTS"
    ):
        ports.extend(REPRESENTATIVE_CLEANUP_PORTS)
    return sorted(set(ports))


def load_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001
        return {}


def parse_metadata_log(server_log: Path) -> dict[str, int]:
    totals = {"metadataMessagesSent": 0, "metadataMessagesDropped": 0, "metadataSendFailures": 0}
    if not server_log.exists():
        return totals
    pattern = re.compile(r"\[webrtc-metadata\] close .* sent=(\d+) dropped=(\d+) failures=(\d+)")
    for line in server_log.read_text(encoding="utf-8", errors="replace").splitlines():
        match = pattern.search(line)
        if not match:
            continue
        totals["metadataMessagesSent"] += int(match.group(1))
        totals["metadataMessagesDropped"] += int(match.group(2))
        totals["metadataSendFailures"] += int(match.group(3))
    return totals


def mb_from_kb(value: int | float) -> float:
    return round(float(value) / KB_PER_MB, 2)


def rate_per_minute(delta_mb: float, elapsed_minutes: float) -> float:
    if elapsed_minutes <= 0:
        return 0.0
    return round(delta_mb / elapsed_minutes, 3)


def build_rss_samples(samples: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rss_samples: list[dict[str, Any]] = []
    first_timestamp_ms: int | None = None
    for sample in samples:
        process = sample.get("process") if isinstance(sample.get("process"), dict) else {}
        rss_kb = int(process.get("rssKb", 0) or 0)
        if rss_kb <= 0:
            continue
        timestamp_ms = int(sample.get("timestampMs", 0) or 0)
        if first_timestamp_ms is None:
            first_timestamp_ms = timestamp_ms
        elapsed_sec = max(0.0, (timestamp_ms - first_timestamp_ms) / 1000.0)
        rss_samples.append(
            {
                "timestampMs": timestamp_ms,
                "elapsedSec": round(elapsed_sec, 3),
                "elapsedMinutes": round(elapsed_sec / 60.0, 3),
                "rssKb": rss_kb,
                "rssMb": mb_from_kb(rss_kb),
                "cpuPercent": float(process.get("cpuPercent", 0.0) or 0.0),
                "etime": str(process.get("etime", "")),
            }
        )
    return rss_samples


def compact_rss_sample(sample: dict[str, Any] | None) -> dict[str, Any]:
    if not sample:
        return {}
    return {
        "timestampMs": sample.get("timestampMs"),
        "elapsedSec": sample.get("elapsedSec"),
        "elapsedMinutes": sample.get("elapsedMinutes"),
        "rssKb": sample.get("rssKb"),
        "rssMb": sample.get("rssMb"),
    }


def summarize_rss_window(name: str, samples: list[dict[str, Any]], start_minute: float, end_minute: float) -> dict[str, Any]:
    selected = [
        sample
        for sample in samples
        if float(sample.get("elapsedMinutes", 0.0) or 0.0) >= start_minute
        and float(sample.get("elapsedMinutes", 0.0) or 0.0) <= end_minute
    ]
    if not selected:
        return {
            "name": name,
            "startMinute": round(start_minute, 3),
            "endMinute": round(end_minute, 3),
            "available": False,
            "sampleCount": 0,
            "observedMinutes": 0.0,
            "rssStartMb": None,
            "rssEndMb": None,
            "rssMaxMb": None,
            "rssDeltaMb": None,
            "rssDeltaPerMinuteMb": None,
        }

    start = selected[0]
    end = selected[-1]
    max_sample = max(selected, key=lambda item: int(item.get("rssKb", 0) or 0))
    observed_minutes = max(0.0, (float(end.get("elapsedSec", 0.0) or 0.0) - float(start.get("elapsedSec", 0.0) or 0.0)) / 60.0)
    delta_mb = mb_from_kb(int(end.get("rssKb", 0) or 0) - int(start.get("rssKb", 0) or 0))
    return {
        "name": name,
        "startMinute": round(start_minute, 3),
        "endMinute": round(end_minute, 3),
        "available": True,
        "sampleCount": len(selected),
        "observedMinutes": round(observed_minutes, 3),
        "startElapsedMinutes": start.get("elapsedMinutes"),
        "endElapsedMinutes": end.get("elapsedMinutes"),
        "rssStartMb": start.get("rssMb"),
        "rssEndMb": end.get("rssMb"),
        "rssMaxMb": max_sample.get("rssMb"),
        "rssDeltaMb": delta_mb,
        "rssDeltaPerMinuteMb": rate_per_minute(delta_mb, observed_minutes),
    }


def find_large_rss_drops(samples: list[dict[str, Any]], threshold_mb: float) -> list[dict[str, Any]]:
    drops: list[dict[str, Any]] = []
    run_start: dict[str, Any] | None = None
    run_end: dict[str, Any] | None = None

    def flush() -> None:
        nonlocal run_start, run_end
        if run_start and run_end:
            delta_mb = mb_from_kb(int(run_end.get("rssKb", 0) or 0) - int(run_start.get("rssKb", 0) or 0))
            if delta_mb <= -abs(threshold_mb):
                elapsed_minutes = max(
                    0.0,
                    (float(run_end.get("elapsedSec", 0.0) or 0.0) - float(run_start.get("elapsedSec", 0.0) or 0.0)) / 60.0,
                )
                drops.append(
                    {
                        "startElapsedMinutes": run_start.get("elapsedMinutes"),
                        "endElapsedMinutes": run_end.get("elapsedMinutes"),
                        "observedMinutes": round(elapsed_minutes, 3),
                        "rssStartMb": run_start.get("rssMb"),
                        "rssEndMb": run_end.get("rssMb"),
                        "rssDeltaMb": delta_mb,
                        "rssDeltaPerMinuteMb": rate_per_minute(delta_mb, elapsed_minutes),
                    }
                )
        run_start = None
        run_end = None

    for index in range(1, len(samples)):
        previous = samples[index - 1]
        current = samples[index]
        if int(current.get("rssKb", 0) or 0) < int(previous.get("rssKb", 0) or 0):
            if run_start is None:
                run_start = previous
            run_end = current
        else:
            flush()
    flush()
    return drops


def analyze_rss(samples: list[dict[str, Any]], warmup_minutes: float, large_drop_mb: float) -> dict[str, Any]:
    if not samples:
        return {
            "unit": "MiB",
            "sampleCount": 0,
            "warmupMinutes": warmup_minutes,
            "largeDropThresholdMb": large_drop_mb,
            "firstSample": {},
            "lastSample": {},
            "warmupBaselineSample": {},
            "firstToLast": {},
            "warmupToLast": {},
            "windows": [],
            "largeDrops": [],
        }

    first = samples[0]
    last = samples[-1]
    warmup_baseline = next(
        (sample for sample in samples if float(sample.get("elapsedMinutes", 0.0) or 0.0) >= warmup_minutes),
        last,
    )
    total_minutes = max(0.0, (float(last.get("elapsedSec", 0.0) or 0.0) - float(first.get("elapsedSec", 0.0) or 0.0)) / 60.0)
    warmup_minutes_observed = max(
        0.0,
        (float(last.get("elapsedSec", 0.0) or 0.0) - float(warmup_baseline.get("elapsedSec", 0.0) or 0.0)) / 60.0,
    )
    first_delta_mb = mb_from_kb(int(last.get("rssKb", 0) or 0) - int(first.get("rssKb", 0) or 0))
    warmup_delta_mb = mb_from_kb(int(last.get("rssKb", 0) or 0) - int(warmup_baseline.get("rssKb", 0) or 0))
    last_elapsed_minute = float(last.get("elapsedMinutes", 0.0) or 0.0)
    windows = [
        summarize_rss_window("0-30m", samples, 0.0, 30.0),
        summarize_rss_window("30-60m", samples, 30.0, 60.0),
        summarize_rss_window("60-90m", samples, 60.0, 90.0),
        summarize_rss_window("90-120m", samples, 90.0, 120.0),
        summarize_rss_window("last-30m", samples, max(0.0, last_elapsed_minute - 30.0), last_elapsed_minute),
        summarize_rss_window("last-10m", samples, max(0.0, last_elapsed_minute - 10.0), last_elapsed_minute),
    ]
    return {
        "unit": "MiB",
        "sampleCount": len(samples),
        "warmupMinutes": warmup_minutes,
        "largeDropThresholdMb": large_drop_mb,
        "firstSample": compact_rss_sample(first),
        "lastSample": compact_rss_sample(last),
        "warmupBaselineSample": compact_rss_sample(warmup_baseline),
        "firstToLast": {
            "observedMinutes": round(total_minutes, 3),
            "rssDeltaMb": first_delta_mb,
            "rssDeltaPerMinuteMb": rate_per_minute(first_delta_mb, total_minutes),
        },
        "warmupToLast": {
            "observedMinutes": round(warmup_minutes_observed, 3),
            "rssDeltaMb": warmup_delta_mb,
            "rssDeltaPerMinuteMb": rate_per_minute(warmup_delta_mb, warmup_minutes_observed),
        },
        "windows": windows,
        "largeDrops": find_large_rss_drops(samples, large_drop_mb),
    }


def markdown_value(value: Any) -> str:
    if value is None:
        return "-"
    if isinstance(value, bool):
        return "true" if value else "false"
    return str(value)


def write_report(report_file: Path, summary: dict[str, Any]) -> None:
    rss_analysis = summary.get("rssAnalysis") if isinstance(summary.get("rssAnalysis"), dict) else {}
    idle = summary.get("idleAfterCleanup") if isinstance(summary.get("idleAfterCleanup"), dict) else {}
    debug_counters = summary.get("debugCounters") if isinstance(summary.get("debugCounters"), dict) else {}
    first_sample = rss_analysis.get("firstSample") if isinstance(rss_analysis.get("firstSample"), dict) else {}
    last_sample = rss_analysis.get("lastSample") if isinstance(rss_analysis.get("lastSample"), dict) else {}
    warmup_sample = rss_analysis.get("warmupBaselineSample") if isinstance(rss_analysis.get("warmupBaselineSample"), dict) else {}
    first_to_last = rss_analysis.get("firstToLast") if isinstance(rss_analysis.get("firstToLast"), dict) else {}
    warmup_to_last = rss_analysis.get("warmupToLast") if isinstance(rss_analysis.get("warmupToLast"), dict) else {}
    lines = [
        "# VA Runtime Console Long-run Report",
        "",
        f"- status: `{summary['status']}`",
        f"- durationSec: `{summary['durationSec']}`",
        f"- clients: `{summary['clients']}`",
        f"- includeRtsp: `{summary['includeRtsp']}`",
        f"- includeSideChannel: `{summary['includeSideChannel']}`",
        f"- includeDashboard: `{summary['includeDashboard']}`",
        f"- summary: `{summary['summaryFile']}`",
        f"- workDir: `{summary['workDir']}`",
        "",
        "## Metrics",
        "",
        f"- maxRssKb: `{summary['metrics']['maxRssKb']}`",
        f"- maxCpuPercent: `{summary['metrics']['maxCpuPercent']}`",
        f"- dashboardPollingCount: `{summary['metrics']['dashboardPollingCount']}`",
        f"- sseMessageCount: `{summary['metrics']['sseMessageCount']}`",
        f"- webrtcMetadataMessageCount: `{summary['metrics']['webrtcMetadataMessageCount']}`",
        f"- metadataMessagesSent: `{summary['metrics']['metadataMessagesSent']}`",
        f"- metadataMessagesDropped: `{summary['metrics']['metadataMessagesDropped']}`",
        f"- metadataSendFailures: `{summary['metrics']['metadataSendFailures']}`",
        "",
        "## RSS Trend",
        "",
        f"- rssSampleCount: `{rss_analysis.get('sampleCount', 0)}`",
        f"- firstSample: elapsedMin=`{first_sample.get('elapsedMinutes', '-')}` rssMb=`{first_sample.get('rssMb', '-')}`",
        f"- warmupBaselineSample: warmupMinutes=`{rss_analysis.get('warmupMinutes', '-')}` elapsedMin=`{warmup_sample.get('elapsedMinutes', '-')}` rssMb=`{warmup_sample.get('rssMb', '-')}`",
        f"- lastSample: elapsedMin=`{last_sample.get('elapsedMinutes', '-')}` rssMb=`{last_sample.get('rssMb', '-')}`",
        f"- firstToLast: deltaMb=`{first_to_last.get('rssDeltaMb', '-')}` slopeMbPerMin=`{first_to_last.get('rssDeltaPerMinuteMb', '-')}` observedMin=`{first_to_last.get('observedMinutes', '-')}`",
        f"- warmupToLast: deltaMb=`{warmup_to_last.get('rssDeltaMb', '-')}` slopeMbPerMin=`{warmup_to_last.get('rssDeltaPerMinuteMb', '-')}` observedMin=`{warmup_to_last.get('observedMinutes', '-')}`",
        "",
        "| window | samples | observedMin | rssStartMb | rssEndMb | rssMaxMb | rssDeltaMb | rssDeltaPerMinuteMb |",
        "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ]
    for window in rss_analysis.get("windows", []):
        if not isinstance(window, dict):
            continue
        lines.append(
            "| "
            + " | ".join(
                [
                    markdown_value(window.get("name")),
                    markdown_value(window.get("sampleCount")),
                    markdown_value(window.get("observedMinutes")),
                    markdown_value(window.get("rssStartMb")),
                    markdown_value(window.get("rssEndMb")),
                    markdown_value(window.get("rssMaxMb")),
                    markdown_value(window.get("rssDeltaMb")),
                    markdown_value(window.get("rssDeltaPerMinuteMb")),
                ]
            )
            + " |"
        )
    lines.extend(
        [
            "",
            "## RSS Large Drops",
            "",
            f"- thresholdMb: `{rss_analysis.get('largeDropThresholdMb', '-')}`",
        ]
    )
    large_drops = [item for item in rss_analysis.get("largeDrops", []) if isinstance(item, dict)]
    if large_drops:
        lines.extend(
            [
                "",
                "| startElapsedMin | endElapsedMin | observedMin | rssStartMb | rssEndMb | rssDeltaMb | rssDeltaPerMinuteMb |",
                "| ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
            ]
        )
        for drop in large_drops:
            lines.append(
                "| "
                + " | ".join(
                    [
                        markdown_value(drop.get("startElapsedMinutes")),
                        markdown_value(drop.get("endElapsedMinutes")),
                        markdown_value(drop.get("observedMinutes")),
                        markdown_value(drop.get("rssStartMb")),
                        markdown_value(drop.get("rssEndMb")),
                        markdown_value(drop.get("rssDeltaMb")),
                        markdown_value(drop.get("rssDeltaPerMinuteMb")),
                    ]
                )
                + " |"
            )
    else:
        lines.append("- none")
    if debug_counters:
        lines.extend(["", "## Runtime Debug Counters", ""])
        for key in sorted(debug_counters):
            lines.append(f"- {key}: `{debug_counters[key]}`")
    rtsp_counters = summary.get("rtspGstreamerDebugCounters") if isinstance(summary.get("rtspGstreamerDebugCounters"), dict) else {}
    rtsp_stop_destroy = (
        summary.get("rtspGstreamerStopDestroySnapshot")
        if isinstance(summary.get("rtspGstreamerStopDestroySnapshot"), dict)
        else {}
    )
    warning_details = (
        summary.get("rtspGstreamerWarningDetails")
        if isinstance(summary.get("rtspGstreamerWarningDetails"), list)
        else []
    )
    if rtsp_counters:
        lines.extend(
            [
                "",
                "## RTSP/GStreamer Debug Counters",
                "",
                "| counter | value |",
                "| --- | ---: |",
            ]
        )
        for key in RTSP_GSTREAMER_DEBUG_COUNTER_KEYS:
            if key in rtsp_counters:
                lines.append(f"| {key} | {rtsp_gstreamer_report_value(key, rtsp_counters[key])} |")
    if rtsp_stop_destroy:
        lines.extend(
            [
                "",
                "## RTSP/GStreamer Stop/Destroy Snapshot",
                "",
                f"- rtspPendingQueueSizeAtStop: `{rtsp_stop_destroy.get('rtspPendingQueueSizeAtStop', 0)}`",
                f"- rtspPendingQueueSizeAtDestroy: `{rtsp_stop_destroy.get('rtspPendingQueueSizeAtDestroy', 0)}`",
                f"- appsrcPushAfterStopCount: `{rtsp_stop_destroy.get('appsrcPushAfterStopCount', 0)}`",
                (
                    "- rtspAppsrcFlowErrorAfterStopCount: "
                    f"`{rtsp_stop_destroy.get('rtspAppsrcFlowErrorAfterStopCount', 0)}`"
                ),
                f"- appsrcEosSentCount: `{rtsp_stop_destroy.get('appsrcEosSentCount', 0)}`",
                f"- appsrcClearedCount: `{rtsp_stop_destroy.get('appsrcClearedCount', 0)}`",
                (
                    "- rtspAppsrcLastFlowReturn: "
                    f"`{rtsp_stop_destroy.get('rtspAppsrcLastFlowReturn', 0)}` "
                    f"({rtsp_stop_destroy.get('rtspAppsrcLastFlowReturnLabel', 'OK')})"
                ),
                (
                    "- rtspAppsrcLastFlowReturnPhase: "
                    f"`{rtsp_stop_destroy.get('rtspAppsrcLastFlowReturnPhase', 0)}` "
                    f"({rtsp_stop_destroy.get('rtspAppsrcLastFlowReturnPhaseLabel', 'not-started')})"
                ),
                f"- pendingQueueRemaining: `{rtsp_stop_destroy.get('pendingQueueRemaining', False)}`",
            ]
        )
    lines.extend(["", "## RTSP/GStreamer Warning Details", ""])
    if warning_details:
        lines.append(json.dumps(warning_details, ensure_ascii=False, indent=2))
    else:
        lines.append("[]")
    lines.extend(
        [
            "",
            "## Idle After Cleanup",
            "",
            f"- enabled: `{idle.get('enabled', False)}`",
            f"- durationSec: `{idle.get('durationSeconds', 0)}`",
            f"- sampleIntervalSec: `{idle.get('sampleIntervalSeconds', '-')}`",
            f"- judgement: `{idle.get('judgement', 'DISABLED')}`",
            f"- reason: `{idle.get('reason', '-')}`",
            f"- rssFirstMb: `{idle.get('rssFirstMb', '-')}`",
            f"- rssLastMb: `{idle.get('rssLastMb', '-')}`",
            f"- rssMaxMb: `{idle.get('rssMaxMb', '-')}`",
            f"- rssDeltaMb: `{idle.get('rssDeltaMb', '-')}`",
            f"- rssDeltaPerMinuteMb: `{idle.get('rssDeltaPerMinuteMb', '-')}`",
            f"- activeSessionsMax: `{idle.get('activeSessionsMax', 0)}`",
            f"- activeStreamsMax: `{idle.get('activeStreamsMax', 0)}`",
            f"- activeAnalysisTapsMax: `{idle.get('activeAnalysisTapsMax', 0)}`",
            f"- sseClientsMax: `{idle.get('sseClientsMax', 0)}`",
            f"- wsClientsMax: `{idle.get('wsClientsMax', 0)}`",
            f"- rtspConsumersMax: `{idle.get('rtspConsumersMax', 0)}`",
            "",
            "## Cleanup",
            "",
            f"- runtimeIdle: `{summary['cleanup']['runtimeIdle']}`",
            f"- portsClean: `{summary['cleanup']['portsClean']}`",
            f"- finalRuntime: `{summary['cleanup']['finalRuntime']}`",
            "",
            "## Steps",
            "",
        ]
    )
    for step in summary["steps"]:
        lines.append(f"- `{step['name']}`: `{step['status']}` log=`{step.get('logFile', '')}`")
    report_file.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    args = parse_args()
    if args.duration_minutes <= 0:
        raise SystemExit("--duration-minutes must be greater than 0")
    if args.clients <= 0:
        raise SystemExit("--clients must be greater than 0")
    if args.rss_warmup_minutes < 0:
        raise SystemExit("--rss-warmup-minutes must be greater than or equal to 0")
    if args.rss_large_drop_mb < 0:
        raise SystemExit("--rss-large-drop-mb must be greater than or equal to 0")
    if args.idle_after_cleanup_minutes < 0:
        raise SystemExit("--idle-after-cleanup-minutes must be greater than or equal to 0")
    if args.idle_sample_interval_seconds <= 0:
        raise SystemExit("--idle-sample-interval-seconds must be greater than 0")
    if args.no_sidechannel:
        args.include_sidechannel = False
    if args.no_dashboard:
        args.include_dashboard = False

    root = Path(__file__).resolve().parents[2]
    run_id = f"va-runtime-longrun-{int(time.time())}-{os.getpid()}"
    work_dir = Path(args.work_dir or f"/tmp/media_server_{run_id}")
    work_dir.mkdir(parents=True, exist_ok=True)
    summary_file = Path(args.summary_file or f"/tmp/media_server_{run_id}_summary.json")
    report_file = Path(args.report_file or f"/tmp/media_server_{run_id}_report.md")
    server_log = work_dir / "server.log"
    http_base = f"http://127.0.0.1:{args.http_port}"
    rtsp_base = f"rtsp://127.0.0.1:{args.rtsp_port}/dhseo"
    duration_sec = int(args.duration_minutes * 60)
    duration_ms = duration_sec * 1000

    steps: list[dict[str, Any]] = []
    samples: list[dict[str, Any]] = []
    idle_samples: list[dict[str, Any]] = []
    children: list[tuple[str, subprocess.Popen[str], Path]] = []
    server_proc: subprocess.Popen[str] | None = None
    dashboard_tap_id = ""
    idle_enabled = args.idle_after_cleanup_minutes > 0
    idle_duration_sec = max(1, int(round(args.idle_after_cleanup_minutes * 60))) if idle_enabled else 0
    idle_interval_sec = max(args.idle_sample_interval_seconds, 1.0)

    def step(name: str, status: str, log_path: Path | str = "", extra: dict[str, Any] | None = None) -> None:
        record = {"name": name, "status": status, "logFile": str(log_path)}
        if extra:
            record.update(extra)
        steps.append(record)
        log(f"[{status}] {name}" + (f" log={log_path}" if log_path else ""))

    try:
        if not args.skip_build:
            build_log = work_dir / "build.log"
            code = run_command(["./server.sh", "build"], root, build_log)
            step("build", "pass" if code == 0 else "fail", build_log, {"exitCode": code})
            if code != 0:
                raise RuntimeError("build failed")
        else:
            step("build", "skip")

        env = os.environ.copy()
        env.update(
            {
                "MEDIA_SERVER_SKIP_BUILD": "1",
                "MEDIA_SERVER_LISTEN_ADDRESS": "127.0.0.1",
                "MEDIA_SERVER_HTTP_LISTEN_ADDRESS": "127.0.0.1",
                "MEDIA_SERVER_LISTEN_PORT": str(args.rtsp_port),
                "MEDIA_SERVER_HTTP_LISTEN_PORT": str(args.http_port),
                "MEDIA_SERVER_SKIP_LOCAL_ENV": os.environ.get("MEDIA_SERVER_VERIFY_VA_RUNTIME_LONGRUN_SKIP_LOCAL_ENV", "1"),
                "MEDIA_SERVER_AUTH_MODE": args.auth_mode,
                "MEDIA_SERVER_FORCE_RTSP_TCP": "1",
                "MEDIA_SERVER_WEBRTC_TRACE": "1",
            }
        )
        server_proc = popen_command(["./server.sh", "foreground"], root, server_log, env)
        wait_health(http_base, 30.0)
        step("server-start", "pass", server_log, {"pid": server_proc.pid})

        if args.include_dashboard:
            dashboard_tap_id = create_dashboard_tap(http_base, args.file)
            step("dashboard-tap-create", "pass", "", {"tapId": dashboard_tap_id})
        else:
            step("dashboard", "skip")

        for index in range(args.clients):
            summary = work_dir / f"webrtc-client-{index + 1}-summary.json"
            log_path = work_dir / f"webrtc-client-{index + 1}.log"
            command = [
                "./server.sh",
                "verify-webrtc-va-metadata",
                "--http-base",
                http_base,
                "--file",
                args.file,
                "--timeout-ms",
                str(duration_ms + 45000),
                "--hold-ms",
                str(duration_ms),
                "--summary-file",
                str(summary),
                "--debug-port",
                str(9233 + index),
            ]
            children.append((f"webrtc-client-{index + 1}", popen_command(command, root, log_path), log_path))
            step(f"webrtc-client-{index + 1}-start", "pass", log_path)

        if args.include_sidechannel:
            sse_summary = work_dir / "sse-sidechannel-summary.json"
            sse_log = work_dir / "sse-sidechannel.log"
            command = [
                "./server.sh",
                "verify-va-metadata-sidechannel",
                "--http-base",
                http_base,
                "--file",
                args.file,
                "--timeout-ms",
                str(duration_ms + 30000),
                "--interval-ms",
                "500",
                "--max-messages",
                "0",
                "--stream-max-duration-ms",
                str(duration_ms),
                "--skip-cleanup-count-check",
                "--summary-file",
                str(sse_summary),
            ]
            children.append(("sse-sidechannel", popen_command(command, root, sse_log), sse_log))
            step("sse-sidechannel-start", "pass", sse_log)
        else:
            step("sse-sidechannel", "skip")

        if args.include_rtsp:
            rtsp_log = work_dir / "rtsp-overlay.log"
            encoded_file = urllib.parse.quote(args.file, safe="")
            rtsp_url = f"{rtsp_base}?file={encoded_file}&va=1"
            command = [
                "ffmpeg",
                "-hide_banner",
                "-loglevel",
                "error",
                "-rtsp_transport",
                "tcp",
                "-fflags",
                "+genpts+igndts",
                "-use_wallclock_as_timestamps",
                "1",
                "-i",
                rtsp_url,
                "-t",
                str(duration_sec),
                "-an",
                "-f",
                "null",
                "-",
            ]
            children.append(("rtsp-overlay", popen_command(command, root, rtsp_log), rtsp_log))
            step("rtsp-overlay-start", "pass", rtsp_log, {"url": rtsp_url})
        else:
            step("rtsp-overlay", "skip")

        deadline = time.monotonic() + duration_sec
        dashboard_poll_count = 0
        while time.monotonic() < deadline:
            try:
                sample = collect_sample(http_base, server_proc.pid, dashboard_tap_id if args.include_dashboard else "")
                samples.append(sample)
                dashboard_poll_count += 1 if args.include_dashboard else 0
                counts = sample.get("runtime", {})
                rss = sample.get("process", {}).get("rssKb", 0)
                log(
                    "[sample] "
                    f"rssKb={rss} activeSessions={counts.get('activeSessions', 0)} "
                    f"taps={counts.get('activeAnalysisTaps', 0)} "
                    f"sse={counts.get('activeSseClients', 0)} ws={counts.get('activeWebSocketClients', 0)}"
                )
            except Exception as exc:  # noqa: BLE001
                step("poll-sample", "fail", "", {"error": str(exc)})
            time.sleep(max(args.poll_interval_seconds, 1.0))

        child_results = []
        for name, proc, log_path in children:
            code = close_process(proc, 30.0)
            status = "pass" if code == 0 else "fail"
            step(name, status, log_path, {"exitCode": code})
            child_results.append({"name": name, "exitCode": code, "logFile": str(log_path)})

        delete_tap(http_base, dashboard_tap_id)
        dashboard_tap_id = ""
        runtime_idle, final_runtime = wait_runtime_idle(http_base, 30.0, samples)
        step("runtime-cleanup", "pass" if runtime_idle else "fail", "", {"finalRuntime": final_runtime})
        if idle_enabled:
            if runtime_idle and server_proc is not None and server_proc.poll() is None:
                idle_samples = observe_idle_after_cleanup(http_base, server_proc.pid, idle_duration_sec, idle_interval_sec)
                idle_preview = summarize_idle_after_cleanup(True, idle_duration_sec, idle_interval_sec, True, idle_samples)
                step(
                    "idle-after-cleanup",
                    "pass",
                    "",
                    {
                        "judgement": idle_preview["judgement"],
                        "reason": idle_preview["reason"],
                        "sampleCount": idle_preview["sampleCount"],
                    },
                )
            else:
                idle_preview = summarize_idle_after_cleanup(True, idle_duration_sec, idle_interval_sec, False, [])
                step("idle-after-cleanup", "pass", "", {"judgement": idle_preview["judgement"], "reason": idle_preview["reason"]})
    except Exception as exc:  # noqa: BLE001
        step("longrun", "fail", "", {"error": str(exc)})
    finally:
        if dashboard_tap_id:
            delete_tap(http_base, dashboard_tap_id)
        for _name, proc, _log_path in children:
            if proc.poll() is None:
                terminate_process(proc, 5.0)
        if server_proc is not None and server_proc.poll() is None:
            server_proc.send_signal(signal.SIGTERM)
            close_process(server_proc, 10.0)

    checked_ports = cleanup_ports([args.http_port, args.rtsp_port])
    port_ok = ports_clean(checked_ports)
    step("ports-clean", "pass" if port_ok else "fail")

    webrtc_message_count = 0
    sse_message_count = 0
    for path in work_dir.glob("*summary.json"):
        payload = load_json(path)
        if payload.get("kind") == "webrtc-va-metadata":
            webrtc_message_count += int(payload.get("metadataMessageCount", 0) or 0)
        elif payload.get("kind") == "va-metadata-sidechannel":
            sse_message_count += int(payload.get("metadataMessageCount", 0) or 0)

    rss_samples = build_rss_samples(samples)
    rss_analysis = analyze_rss(rss_samples, args.rss_warmup_minutes, args.rss_large_drop_mb)
    rss_values = [int(sample.get("rssKb", 0) or 0) for sample in rss_samples]
    cpu_values = [float(sample.get("cpuPercent", 0.0) or 0.0) for sample in rss_samples]
    server_metadata = parse_metadata_log(server_log)
    failed_steps = [item for item in steps if item.get("status") == "fail"]
    cleanup_ok = not any(item.get("name") == "runtime-cleanup" and item.get("status") == "fail" for item in steps)
    idle_summary = summarize_idle_after_cleanup(idle_enabled, idle_duration_sec, idle_interval_sec, cleanup_ok, idle_samples)
    first_to_last = rss_analysis.get("firstToLast") if isinstance(rss_analysis.get("firstToLast"), dict) else {}
    warmup_baseline = rss_analysis.get("warmupBaselineSample") if isinstance(rss_analysis.get("warmupBaselineSample"), dict) else {}
    warmup_to_last = rss_analysis.get("warmupToLast") if isinstance(rss_analysis.get("warmupToLast"), dict) else {}
    debug_counters = latest_debug_counters(idle_samples) or latest_debug_counters(samples)
    rtsp_gstreamer_counters = rtsp_gstreamer_debug_counters(debug_counters)
    rtsp_gstreamer_warnings = rtsp_gstreamer_warning_details(debug_counters)
    summary = {
        "kind": "va-runtime-console-longrun",
        "status": "fail" if failed_steps else "pass",
        "ok": not failed_steps,
        "pass": len([item for item in steps if item.get("status") == "pass"]),
        "fail": len(failed_steps),
        "skip": len([item for item in steps if item.get("status") == "skip"]),
        "durationSec": duration_sec,
        "durationMinutes": args.duration_minutes,
        "clients": args.clients,
        "includeRtsp": bool(args.include_rtsp),
        "includeSideChannel": bool(args.include_sidechannel),
        "includeDashboard": bool(args.include_dashboard),
        "httpBase": http_base,
        "rtspBase": rtsp_base,
        "file": args.file,
        "workDir": str(work_dir),
        "summaryFile": str(summary_file),
        "reportFile": str(report_file),
        "idleAfterCleanupEnabled": idle_summary["enabled"],
        "idleDurationSeconds": idle_summary["durationSeconds"],
        "idleRssFirstMb": idle_summary["rssFirstMb"],
        "idleRssLastMb": idle_summary["rssLastMb"],
        "idleRssMaxMb": idle_summary["rssMaxMb"],
        "idleRssDeltaMb": idle_summary["rssDeltaMb"],
        "idleRssDeltaPerMinuteMb": idle_summary["rssDeltaPerMinuteMb"],
        "idleActiveSessionsMax": idle_summary["activeSessionsMax"],
        "idleActiveStreamsMax": idle_summary["activeStreamsMax"],
        "idleActiveAnalysisTapsMax": idle_summary["activeAnalysisTapsMax"],
        "idleSseClientsMax": idle_summary["sseClientsMax"],
        "idleWsClientsMax": idle_summary["wsClientsMax"],
        "idleRtspConsumersMax": idle_summary["rtspConsumersMax"],
        "idleJudgement": idle_summary["judgement"],
        "metrics": {
            "sampleCount": len(samples),
            "rssSampleCount": len(rss_samples),
            "maxRssKb": max(rss_values) if rss_values else 0,
            "firstRssKb": rss_values[0] if rss_values else 0,
            "lastRssKb": rss_values[-1] if rss_values else 0,
            "rssDeltaMb": first_to_last.get("rssDeltaMb", 0.0),
            "rssDeltaPerMinuteMb": first_to_last.get("rssDeltaPerMinuteMb", 0.0),
            "warmupRssKb": warmup_baseline.get("rssKb", 0),
            "warmupRssElapsedMinutes": warmup_baseline.get("elapsedMinutes", 0.0),
            "warmupRssDeltaMb": warmup_to_last.get("rssDeltaMb", 0.0),
            "warmupRssDeltaPerMinuteMb": warmup_to_last.get("rssDeltaPerMinuteMb", 0.0),
            "maxCpuPercent": max(cpu_values) if cpu_values else 0.0,
            "dashboardPollingCount": len([item for item in samples if "tapMetrics" in item]),
            "webrtcMetadataMessageCount": webrtc_message_count,
            "sseMessageCount": sse_message_count,
            **server_metadata,
        },
        "debugCounters": debug_counters,
        "rtspGstreamerDebugCounters": rtsp_gstreamer_counters,
        "rtspGstreamerStopDestroySnapshot": rtsp_gstreamer_stop_destroy_snapshot(debug_counters),
        "rtspGstreamerWarningDetails": rtsp_gstreamer_warnings,
        "cleanup": {
            "runtimeIdle": cleanup_ok,
            "portsClean": port_ok,
            "checkedPorts": checked_ports,
            "finalRuntime": next((item.get("finalRuntime") for item in reversed(steps) if item.get("name") == "runtime-cleanup"), {}),
        },
        "idleAfterCleanup": idle_summary,
        "steps": steps,
        "rssAnalysis": rss_analysis,
        "rssSamples": rss_samples,
        "idleSamples": idle_samples,
        "samples": samples[-120:],
    }
    summary_file.write_text(json.dumps(summary, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    write_report(report_file, summary)
    log(f"[summary-json] {summary_file}")
    log(f"[report-md] {report_file}")
    log(f"[summary] pass={summary['pass']} fail={summary['fail']} skip={summary['skip']}")
    return 0 if summary["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Connect/disconnect cycle verification for VA Runtime Console consumers."""

from __future__ import annotations

import argparse
import json
import os
import re
import signal
import time
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import verify_va_runtime_console_longrun as longrun


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="VA Runtime Console connect/disconnect cycle verification")
    parser.add_argument("--cycles", type=int, default=int(os.environ.get("MEDIA_SERVER_VERIFY_VA_RUNTIME_CYCLES", "10")))
    parser.add_argument("--active-minutes", type=float, default=float(os.environ.get("MEDIA_SERVER_VERIFY_VA_RUNTIME_CYCLE_ACTIVE_MINUTES", "5")))
    parser.add_argument("--idle-minutes", type=float, default=float(os.environ.get("MEDIA_SERVER_VERIFY_VA_RUNTIME_CYCLE_IDLE_MINUTES", "2")))
    parser.add_argument("--clients", type=int, default=int(os.environ.get("MEDIA_SERVER_VERIFY_VA_RUNTIME_CYCLE_CLIENTS", "1")))
    parser.add_argument("--include-rtsp", action="store_true", default=os.environ.get("MEDIA_SERVER_VERIFY_VA_RUNTIME_CYCLE_INCLUDE_RTSP", "0") == "1")
    parser.add_argument("--include-sidechannel", action="store_true", default=os.environ.get("MEDIA_SERVER_VERIFY_VA_RUNTIME_CYCLE_INCLUDE_SIDECHANNEL", "1") != "0")
    parser.add_argument("--include-dashboard", action="store_true", default=os.environ.get("MEDIA_SERVER_VERIFY_VA_RUNTIME_CYCLE_INCLUDE_DASHBOARD", "1") != "0")
    parser.add_argument("--no-sidechannel", action="store_true")
    parser.add_argument("--no-dashboard", action="store_true")
    parser.add_argument("--skip-build", action="store_true")
    parser.add_argument("--file", default=os.environ.get("MEDIA_SERVER_VERIFY_VA_RUNTIME_CYCLE_FILE", "sample_h264.mp4"))
    parser.add_argument("--rtsp-port", type=int, default=int(os.environ.get("MEDIA_SERVER_VERIFY_VA_RUNTIME_CYCLE_RTSP_PORT", "8555")))
    parser.add_argument("--http-port", type=int, default=int(os.environ.get("MEDIA_SERVER_VERIFY_VA_RUNTIME_CYCLE_HTTP_PORT", "8081")))
    parser.add_argument("--active-sample-interval-seconds", type=float, default=float(os.environ.get("MEDIA_SERVER_VERIFY_VA_RUNTIME_CYCLE_ACTIVE_SAMPLE_SECONDS", "5")))
    parser.add_argument("--idle-sample-interval-seconds", type=float, default=float(os.environ.get("MEDIA_SERVER_VERIFY_VA_RUNTIME_CYCLE_IDLE_SAMPLE_SECONDS", "30")))
    parser.add_argument("--work-dir", default=os.environ.get("MEDIA_SERVER_VERIFY_VA_RUNTIME_CYCLE_WORK_DIR", ""))
    parser.add_argument("--summary-file", default=os.environ.get("MEDIA_SERVER_VERIFY_VA_RUNTIME_CYCLE_SUMMARY", ""))
    parser.add_argument("--report-file", default=os.environ.get("MEDIA_SERVER_VERIFY_VA_RUNTIME_CYCLE_REPORT", ""))
    parser.add_argument("--rss-warmup-minutes", type=float, default=float(os.environ.get("MEDIA_SERVER_VERIFY_VA_RUNTIME_CYCLE_RSS_WARMUP_MINUTES", str(longrun.DEFAULT_RSS_WARMUP_MINUTES))))
    parser.add_argument("--rss-large-drop-mb", type=float, default=float(os.environ.get("MEDIA_SERVER_VERIFY_VA_RUNTIME_CYCLE_RSS_LARGE_DROP_MB", str(longrun.DEFAULT_RSS_LARGE_DROP_MB))))
    return parser.parse_args()


def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def log(message: str) -> None:
    print(message, flush=True)


def log_step(steps: list[dict[str, Any]], name: str, status: str, log_path: Path | str = "", extra: dict[str, Any] | None = None) -> None:
    record = {"name": name, "status": status, "logFile": str(log_path)}
    if extra:
        record.update(extra)
    steps.append(record)
    log(f"[{status}] {name}" + (f" log={log_path}" if log_path else ""))


def read_log_lines(path: Path) -> list[str]:
    if not path.exists():
        return []
    return path.read_text(encoding="utf-8", errors="replace").splitlines()


def parse_metadata_close(lines: list[str]) -> dict[str, int]:
    totals = {"sent": 0, "dropped": 0, "failures": 0}
    pattern = re.compile(r"\[webrtc-metadata\] close .* sent=(\d+) dropped=(\d+).* failures=(\d+)")
    for line in lines:
        match = pattern.search(line)
        if not match:
            continue
        totals["sent"] += int(match.group(1))
        totals["dropped"] += int(match.group(2))
        totals["failures"] += int(match.group(3))
    return totals


def rss_value(samples: list[dict[str, Any]], mode: str) -> float | None:
    rss_samples = longrun.build_rss_samples(samples)
    if not rss_samples:
        return None
    if mode == "first":
        return rss_samples[0].get("rssMb")
    if mode == "last":
        return rss_samples[-1].get("rssMb")
    if mode == "max":
        return longrun.mb_from_kb(max(int(sample.get("rssKb", 0) or 0) for sample in rss_samples))
    return None


def runtime_field(counts: dict[str, Any], key: str) -> int:
    if key == "activeStreams":
        return longrun.active_streams(counts)
    return int(counts.get(key, 0) or 0)


def final_count(counts: dict[str, Any], key: str) -> int:
    return runtime_field(counts, key)


def load_child_summary(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    return longrun.load_json(path)


def wait_children(children: list[tuple[str, Any, Path]], steps: list[dict[str, Any]], cycle_index: int) -> list[dict[str, Any]]:
    results = []
    for name, proc, log_path in children:
        code = longrun.close_process(proc, 30.0)
        status = "pass" if code == 0 else "fail"
        step_name = f"cycle-{cycle_index}-{name}"
        log_step(steps, step_name, status, log_path, {"exitCode": code})
        results.append({"name": name, "exitCode": code, "logFile": str(log_path), "status": status})
    return results


def build_webrtc_command(root: Path, http_base: str, file_token: str, duration_ms: int, summary: Path, debug_port: int) -> list[str]:
    return [
        "./server.sh",
        "verify-webrtc-va-metadata",
        "--http-base",
        http_base,
        "--file",
        file_token,
        "--timeout-ms",
        str(duration_ms + 45000),
        "--hold-ms",
        str(duration_ms),
        "--summary-file",
        str(summary),
        "--debug-port",
        str(debug_port),
    ]


def build_sse_command(http_base: str, file_token: str, duration_ms: int, summary: Path) -> list[str]:
    return [
        "./server.sh",
        "verify-va-metadata-sidechannel",
        "--http-base",
        http_base,
        "--file",
        file_token,
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
        str(summary),
    ]


def build_rtsp_command(rtsp_url: str, active_sec: int) -> list[str]:
    return [
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
        str(active_sec),
        "-an",
        "-f",
        "null",
        "-",
    ]


def sample_active(
    http_base: str,
    pid: int,
    tap_id: str,
    cycle_index: int,
    duration_s: int,
    interval_s: float,
) -> list[dict[str, Any]]:
    samples: list[dict[str, Any]] = []
    deadline = time.monotonic() + duration_s
    interval = max(interval_s, 1.0)
    while time.monotonic() < deadline:
        sample = longrun.collect_sample(http_base, pid, tap_id)
        sample["phase"] = "cycle-active"
        sample["cycleIndex"] = cycle_index
        samples.append(sample)
        counts = sample.get("runtime", {})
        rss = sample.get("process", {}).get("rssKb", 0)
        log(
            "[cycle-sample] "
            f"cycle={cycle_index} rssKb={rss} activeSessions={counts.get('activeSessions', 0)} "
            f"streams={longrun.active_streams(counts)} taps={counts.get('activeAnalysisTaps', 0)} "
            f"sse={counts.get('activeSseClients', 0)} ws={counts.get('activeWebSocketClients', 0)} "
            f"rtspConsumers={counts.get('egressSessions', 0)}"
        )
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            break
        time.sleep(min(interval, remaining))
    return samples


def summarize_cycle(
    cycle_index: int,
    active_samples: list[dict[str, Any]],
    idle_samples: list[dict[str, Any]],
    cleanup_counts: dict[str, int],
    child_results: list[dict[str, Any]],
    data_channel: dict[str, int],
    sse_summary: dict[str, Any],
    cleanup_ok: bool,
    idle_summary: dict[str, Any],
) -> dict[str, Any]:
    active_sessions_max = longrun.runtime_count_max(active_samples, "activeSessions")
    active_streams_max = longrun.runtime_count_max(active_samples, "activeStreams")
    active_taps_max = longrun.runtime_count_max(active_samples, "activeAnalysisTaps")
    sse_clients_max = longrun.runtime_count_max(active_samples, "activeSseClients")
    ws_clients_max = longrun.runtime_count_max(active_samples, "activeWebSocketClients")
    rtsp_consumers_max = longrun.runtime_count_max(active_samples, "egressSessions")
    debug_counters = longrun.latest_debug_counters(idle_samples) or longrun.latest_debug_counters(active_samples)
    return {
        "cycleIndex": cycle_index,
        "activeStartRssMb": rss_value(active_samples, "first"),
        "activePeakRssMb": rss_value(active_samples, "max"),
        "activeEndRssMb": rss_value(active_samples, "last"),
        "idleStartRssMb": idle_summary.get("rssFirstMb"),
        "idleEndRssMb": idle_summary.get("rssLastMb"),
        "idlePeakRssMb": idle_summary.get("rssMaxMb"),
        "idleDeltaMb": idle_summary.get("rssDeltaMb"),
        "activeSessionsMax": active_sessions_max,
        "activeStreamsMax": active_streams_max,
        "activeAnalysisTapsMax": active_taps_max,
        "sseClientsMax": sse_clients_max,
        "wsClientsMax": ws_clients_max,
        "rtspConsumersMax": rtsp_consumers_max,
        "cleanupActiveSessions": final_count(cleanup_counts, "activeSessions"),
        "cleanupActiveStreams": final_count(cleanup_counts, "activeStreams"),
        "cleanupActiveAnalysisTaps": final_count(cleanup_counts, "activeAnalysisTaps"),
        "cleanupSseClients": final_count(cleanup_counts, "activeSseClients"),
        "cleanupWsClients": final_count(cleanup_counts, "activeWebSocketClients"),
        "cleanupRtspConsumers": final_count(cleanup_counts, "egressSessions"),
        "dataChannelSent": data_channel["sent"],
        "dataChannelDropped": data_channel["dropped"],
        "dataChannelFailures": data_channel["failures"],
        "sseSent": int(sse_summary.get("metadataMessageCount", 0) or 0),
        "sseDropped": None,
        "wsSent": 0,
        "wsDropped": None,
        "dashboardPollingCount": len([item for item in active_samples if "tapMetrics" in item]),
        "debugCounters": debug_counters,
        "rtspGstreamerDebugCounters": longrun.rtsp_gstreamer_debug_counters(debug_counters),
        "rtspGstreamerStopDestroySnapshot": longrun.rtsp_gstreamer_stop_destroy_snapshot(debug_counters),
        "rtspGstreamerWarningDetails": longrun.rtsp_gstreamer_warning_details(debug_counters),
        "cleanupOk": cleanup_ok,
        "idleJudgement": idle_summary.get("judgement"),
        "idleActiveCountReappeared": bool(idle_summary.get("activeCountReappeared", False)),
        "childResults": child_results,
    }


def idle_baseline_trend(cycle_reports: list[dict[str, Any]]) -> dict[str, Any]:
    values = [
        float(item["idleEndRssMb"])
        for item in cycle_reports
        if item.get("idleEndRssMb") is not None
    ]
    deltas = [round(value - values[0], 2) for value in values] if values else []
    monotonic = len(values) > 1 and all(values[index] > values[index - 1] for index in range(1, len(values)))
    max_delta = max(deltas) if deltas else 0.0
    return {
        "idleEndRssMb": values,
        "idleEndRssDeltas": deltas,
        "maxIdleEndRssDeltaMb": max_delta,
        "monotonicIdleRssIncrease": monotonic,
    }


def write_report(report_file: Path, summary: dict[str, Any]) -> None:
    trend = summary.get("rssBaselineTrend", {})
    lines = [
        "# VA Runtime Console Cycle Report",
        "",
        f"- status: `{summary['status']}`",
        f"- judgement: `{summary['judgement']}`",
        f"- cycles: `{summary['cycles']}`",
        f"- activeMinutes: `{summary['activeMinutes']}`",
        f"- idleMinutes: `{summary['idleMinutes']}`",
        f"- startedAt: `{summary['startedAt']}`",
        f"- finishedAt: `{summary['finishedAt']}`",
        f"- summary: `{summary['summaryFile']}`",
        f"- workDir: `{summary['workDir']}`",
        f"- portClean: `{summary['portClean']}`",
        "",
        "## RSS Baseline Trend",
        "",
        f"- idleEndRssDeltas: `{summary['idleEndRssDeltas']}`",
        f"- maxIdleEndRssDeltaMb: `{summary['maxIdleEndRssDeltaMb']}`",
        f"- monotonicIdleRssIncrease: `{summary['monotonicIdleRssIncrease']}`",
        f"- idleEndRssMb: `{trend.get('idleEndRssMb', [])}`",
        "",
        "## Cycles",
        "",
        "| cycle | activeStart | activePeak | activeEnd | idleStart | idleEnd | idleDelta | activeSessionsMax | tapsMax | sseMax | wsMax | rtspMax | cleanupOk | dataSent | dataDropped | dataFailures | dashboardPolls |",
        "| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: |",
    ]
    for cycle in summary.get("cycleReports", []):
        lines.append(
            "| "
            + " | ".join(
                [
                    str(cycle.get("cycleIndex")),
                    longrun.markdown_value(cycle.get("activeStartRssMb")),
                    longrun.markdown_value(cycle.get("activePeakRssMb")),
                    longrun.markdown_value(cycle.get("activeEndRssMb")),
                    longrun.markdown_value(cycle.get("idleStartRssMb")),
                    longrun.markdown_value(cycle.get("idleEndRssMb")),
                    longrun.markdown_value(cycle.get("idleDeltaMb")),
                    longrun.markdown_value(cycle.get("activeSessionsMax")),
                    longrun.markdown_value(cycle.get("activeAnalysisTapsMax")),
                    longrun.markdown_value(cycle.get("sseClientsMax")),
                    longrun.markdown_value(cycle.get("wsClientsMax")),
                    longrun.markdown_value(cycle.get("rtspConsumersMax")),
                    longrun.markdown_value(cycle.get("cleanupOk")),
                    longrun.markdown_value(cycle.get("dataChannelSent")),
                    longrun.markdown_value(cycle.get("dataChannelDropped")),
                    longrun.markdown_value(cycle.get("dataChannelFailures")),
                    longrun.markdown_value(cycle.get("dashboardPollingCount")),
                ]
            )
            + " |"
        )
    debug_counters = summary.get("debugCounters") if isinstance(summary.get("debugCounters"), dict) else {}
    rtsp_counters = summary.get("rtspGstreamerDebugCounters") if isinstance(summary.get("rtspGstreamerDebugCounters"), dict) else {}
    warning_details = summary.get("rtspGstreamerWarningDetails") if isinstance(summary.get("rtspGstreamerWarningDetails"), list) else []
    if debug_counters:
        lines.extend(["", "## Runtime Debug Counters", ""])
        for key in sorted(debug_counters):
            lines.append(f"- {key}: `{debug_counters[key]}`")
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
        for key in longrun.RTSP_GSTREAMER_DEBUG_COUNTER_KEYS:
            if key in rtsp_counters:
                lines.append(f"| {key} | {longrun.rtsp_gstreamer_report_value(key, rtsp_counters[key])} |")
    lines.extend(
        [
            "",
            "## RTSP/GStreamer Cycle Snapshots",
            "",
            "| cycle | pendingPeak | stopSize | destroySize | flushed | dropped | pushAfterStop | pushOk | pushFail | flowError | flushing | eos | error | notLinked | notNegotiated | other | activeFlow | stoppingFlow | afterStopFlow | lastFlow | lastPhase | busWatch | appsrcEos | appsrcCleared | overlayProbe | warningDetails |",
            "| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | ---: | ---: | --- | --- |",
        ]
    )
    for cycle in summary.get("cycleReports", []):
        counters = cycle.get("rtspGstreamerDebugCounters") if isinstance(cycle.get("rtspGstreamerDebugCounters"), dict) else {}
        details = cycle.get("rtspGstreamerWarningDetails") if isinstance(cycle.get("rtspGstreamerWarningDetails"), list) else []
        lines.append(
            "| "
            + " | ".join(
                [
                    longrun.markdown_value(cycle.get("cycleIndex")),
                    longrun.markdown_value(counters.get("rtspPendingQueuePeak")),
                    longrun.markdown_value(counters.get("rtspPendingQueueSizeAtStop")),
                    longrun.markdown_value(counters.get("rtspPendingQueueSizeAtDestroy")),
                    longrun.markdown_value(counters.get("rtspPendingQueueFlushedCount")),
                    longrun.markdown_value(counters.get("rtspPendingQueueDroppedCount")),
                    longrun.markdown_value(counters.get("appsrcPushAfterStopCount")),
                    longrun.markdown_value(counters.get("rtspAppsrcPushOkCount")),
                    longrun.markdown_value(counters.get("rtspAppsrcPushFailCount")),
                    longrun.markdown_value(counters.get("rtspAppsrcFlowErrorCount")),
                    longrun.markdown_value(counters.get("rtspAppsrcFlowFlushingCount")),
                    longrun.markdown_value(counters.get("rtspAppsrcFlowEosCount")),
                    longrun.markdown_value(counters.get("rtspAppsrcFlowErrorReturnCount")),
                    longrun.markdown_value(counters.get("rtspAppsrcFlowNotLinkedCount")),
                    longrun.markdown_value(counters.get("rtspAppsrcFlowNotNegotiatedCount")),
                    longrun.markdown_value(counters.get("rtspAppsrcFlowOtherErrorCount")),
                    longrun.markdown_value(counters.get("rtspAppsrcFlowErrorDuringActiveCount")),
                    longrun.markdown_value(counters.get("rtspAppsrcFlowErrorDuringStoppingCount")),
                    longrun.markdown_value(counters.get("rtspAppsrcFlowErrorAfterStopCount")),
                    longrun.rtsp_gstreamer_report_value(
                        "rtspAppsrcLastFlowReturn",
                        counters.get("rtspAppsrcLastFlowReturn"),
                    ),
                    longrun.rtsp_gstreamer_report_value(
                        "rtspAppsrcLastFlowReturnPhase",
                        counters.get("rtspAppsrcLastFlowReturnPhase"),
                    ),
                    f"{longrun.markdown_value(counters.get('busWatchCreatedCount'))}/{longrun.markdown_value(counters.get('busWatchDestroyedCount'))}",
                    longrun.markdown_value(counters.get("appsrcEosSentCount")),
                    longrun.markdown_value(counters.get("appsrcClearedCount")),
                    f"{longrun.markdown_value(counters.get('overlayProbeAttachedCount'))}/{longrun.markdown_value(counters.get('overlayProbeRemovedCount'))}",
                    longrun.markdown_value(len(details)),
                ]
            )
            + " |"
        )
    lines.extend(["", "## RTSP/GStreamer Warning Details", ""])
    if warning_details:
        lines.append(json.dumps(warning_details, ensure_ascii=False, indent=2))
    else:
        lines.append("[]")
    lines.extend(
        [
            "",
            "## Cleanup Failures",
            "",
            json.dumps(summary.get("cleanupFailures", []), ensure_ascii=False, indent=2),
        ]
    )
    report_file.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    args = parse_args()
    if args.cycles <= 0:
        raise SystemExit("--cycles must be greater than 0")
    if args.active_minutes <= 0:
        raise SystemExit("--active-minutes must be greater than 0")
    if args.idle_minutes < 0:
        raise SystemExit("--idle-minutes must be greater than or equal to 0")
    if args.clients <= 0:
        raise SystemExit("--clients must be greater than 0")
    if args.active_sample_interval_seconds <= 0:
        raise SystemExit("--active-sample-interval-seconds must be greater than 0")
    if args.idle_sample_interval_seconds <= 0:
        raise SystemExit("--idle-sample-interval-seconds must be greater than 0")
    if args.rss_warmup_minutes < 0:
        raise SystemExit("--rss-warmup-minutes must be greater than or equal to 0")
    if args.rss_large_drop_mb < 0:
        raise SystemExit("--rss-large-drop-mb must be greater than or equal to 0")
    if args.no_sidechannel:
        args.include_sidechannel = False
    if args.no_dashboard:
        args.include_dashboard = False

    root = Path(__file__).resolve().parents[2]
    run_id = f"va-runtime-cycles-{int(time.time())}-{os.getpid()}"
    work_dir = Path(args.work_dir or f"/tmp/media_server_{run_id}")
    work_dir.mkdir(parents=True, exist_ok=True)
    summary_file = Path(args.summary_file or f"/tmp/media_server_{run_id}_summary.json")
    report_file = Path(args.report_file or f"/tmp/media_server_{run_id}_report.md")
    server_log = work_dir / "server.log"
    http_base = f"http://127.0.0.1:{args.http_port}"
    rtsp_base = f"rtsp://127.0.0.1:{args.rtsp_port}/dhseo"
    active_sec = max(1, int(round(args.active_minutes * 60)))
    idle_sec = max(0, int(round(args.idle_minutes * 60)))
    active_ms = active_sec * 1000
    steps: list[dict[str, Any]] = []
    cycle_reports: list[dict[str, Any]] = []
    cleanup_failures: list[dict[str, Any]] = []
    child_failures: list[dict[str, Any]] = []
    server_proc = None
    active_children: list[tuple[str, Any, Path]] = []
    dashboard_tap_id = ""
    started_at = iso_now()

    try:
        if not args.skip_build:
            build_log = work_dir / "build.log"
            code = longrun.run_command(["./server.sh", "build"], root, build_log)
            log_step(steps, "build", "pass" if code == 0 else "fail", build_log, {"exitCode": code})
            if code != 0:
                raise RuntimeError("build failed")
        else:
            log_step(steps, "build", "skip")

        env = os.environ.copy()
        env.update(
            {
                "MEDIA_SERVER_SKIP_BUILD": "1",
                "MEDIA_SERVER_LISTEN_ADDRESS": "127.0.0.1",
                "MEDIA_SERVER_HTTP_LISTEN_ADDRESS": "127.0.0.1",
                "MEDIA_SERVER_LISTEN_PORT": str(args.rtsp_port),
                "MEDIA_SERVER_HTTP_LISTEN_PORT": str(args.http_port),
                "MEDIA_SERVER_FORCE_RTSP_TCP": "1",
                "MEDIA_SERVER_WEBRTC_TRACE": "1",
            }
        )
        server_proc = longrun.popen_command(["./server.sh", "foreground"], root, server_log, env)
        longrun.wait_health(http_base, 30.0)
        log_step(steps, "server-start", "pass", server_log, {"pid": server_proc.pid})

        for cycle_index in range(1, args.cycles + 1):
            log(f"[cycle] start index={cycle_index}")
            log_marker = len(read_log_lines(server_log))
            dashboard_tap_id = ""
            active_children = []
            active_samples: list[dict[str, Any]] = []
            idle_samples: list[dict[str, Any]] = []
            cleanup_samples: list[dict[str, Any]] = []
            sse_summary_path = work_dir / f"cycle-{cycle_index}-sse-sidechannel-summary.json"

            if args.include_dashboard:
                dashboard_tap_id = longrun.create_dashboard_tap(http_base, args.file)
                log_step(steps, f"cycle-{cycle_index}-dashboard-tap-create", "pass", "", {"tapId": dashboard_tap_id})

            for client_index in range(args.clients):
                client_number = client_index + 1
                summary = work_dir / f"cycle-{cycle_index}-webrtc-client-{client_number}-summary.json"
                log_path = work_dir / f"cycle-{cycle_index}-webrtc-client-{client_number}.log"
                command = build_webrtc_command(root, http_base, args.file, active_ms, summary, 9300 + cycle_index * 10 + client_index)
                active_children.append((f"webrtc-client-{client_number}", longrun.popen_command(command, root, log_path), log_path))
                log_step(steps, f"cycle-{cycle_index}-webrtc-client-{client_number}-start", "pass", log_path)

            if args.include_sidechannel:
                sse_log = work_dir / f"cycle-{cycle_index}-sse-sidechannel.log"
                command = build_sse_command(http_base, args.file, active_ms, sse_summary_path)
                active_children.append(("sse-sidechannel", longrun.popen_command(command, root, sse_log), sse_log))
                log_step(steps, f"cycle-{cycle_index}-sse-sidechannel-start", "pass", sse_log)

            if args.include_rtsp:
                rtsp_log = work_dir / f"cycle-{cycle_index}-rtsp-overlay.log"
                encoded_file = urllib.parse.quote(args.file, safe="")
                rtsp_url = f"{rtsp_base}?file={encoded_file}&va=1"
                active_children.append(("rtsp-overlay", longrun.popen_command(build_rtsp_command(rtsp_url, active_sec), root, rtsp_log), rtsp_log))
                log_step(steps, f"cycle-{cycle_index}-rtsp-overlay-start", "pass", rtsp_log, {"url": rtsp_url})

            active_samples = sample_active(
                http_base,
                server_proc.pid,
                dashboard_tap_id if args.include_dashboard else "",
                cycle_index,
                active_sec,
                args.active_sample_interval_seconds,
            )
            child_results = wait_children(active_children, steps, cycle_index)
            child_failures.extend([{"cycleIndex": cycle_index, **result} for result in child_results if result.get("status") == "fail"])
            active_children = []
            longrun.delete_tap(http_base, dashboard_tap_id)
            dashboard_tap_id = ""
            cleanup_ok, final_runtime = longrun.wait_runtime_idle(http_base, 30.0, cleanup_samples)
            cleanup_zero = all(int(value or 0) == 0 for value in final_runtime.values())
            cleanup_ok = cleanup_ok and cleanup_zero
            if not cleanup_ok:
                cleanup_failures.append({"cycleIndex": cycle_index, "finalRuntime": final_runtime})
            log_step(steps, f"cycle-{cycle_index}-runtime-cleanup", "pass" if cleanup_ok else "fail", "", {"finalRuntime": final_runtime})

            if idle_sec > 0 and server_proc.poll() is None:
                idle_samples = longrun.observe_idle_after_cleanup(http_base, server_proc.pid, idle_sec, args.idle_sample_interval_seconds)
            idle_summary = longrun.summarize_idle_after_cleanup(idle_sec > 0, idle_sec, args.idle_sample_interval_seconds, cleanup_ok, idle_samples)
            if idle_summary.get("activeCountReappeared"):
                cleanup_failures.append({"cycleIndex": cycle_index, "idleActiveCountReappeared": True})

            server_lines = read_log_lines(server_log)
            data_channel = parse_metadata_close(server_lines[log_marker:])
            sse_summary = load_child_summary(sse_summary_path)
            cycle_reports.append(
                summarize_cycle(
                    cycle_index,
                    active_samples,
                    idle_samples,
                    final_runtime,
                    child_results,
                    data_channel,
                    sse_summary,
                    cleanup_ok,
                    idle_summary,
                )
            )
            log(f"[cycle] end index={cycle_index} cleanupOk={cleanup_ok} idleJudgement={idle_summary.get('judgement')}")
    except Exception as exc:  # noqa: BLE001
        log_step(steps, "cycles", "fail", "", {"error": str(exc)})
    finally:
        if dashboard_tap_id:
            longrun.delete_tap(http_base, dashboard_tap_id)
        for _name, proc, _log_path in active_children:
            if proc.poll() is None:
                longrun.terminate_process(proc, 5.0)
        if server_proc is not None and server_proc.poll() is None:
            server_proc.send_signal(signal.SIGTERM)
            longrun.close_process(server_proc, 10.0)

    port_clean = longrun.ports_clean([args.http_port, args.rtsp_port, 8080, 8081, 8554, 8555])
    log_step(steps, "ports-clean", "pass" if port_clean else "fail")
    finished_at = iso_now()
    trend = idle_baseline_trend(cycle_reports)
    failed_steps = [item for item in steps if item.get("status") == "fail"]
    judgement = "PASS"
    if not port_clean:
        judgement = "FAIL"
    elif child_failures or any(item.get("name") == "cycles" for item in failed_steps):
        judgement = "FAIL"
    elif cleanup_failures:
        judgement = "HOLD"
    elif trend["monotonicIdleRssIncrease"] and trend["maxIdleEndRssDeltaMb"] > 0:
        judgement = "WARNING"
    status = "pass" if judgement in {"PASS", "WARNING"} else "fail"
    summary = {
        "kind": "va-runtime-console-cycles",
        "status": status,
        "judgement": judgement,
        "cycles": args.cycles,
        "activeMinutes": args.active_minutes,
        "idleMinutes": args.idle_minutes,
        "clients": args.clients,
        "includeRtsp": bool(args.include_rtsp),
        "includeSideChannel": bool(args.include_sidechannel),
        "includeDashboard": bool(args.include_dashboard),
        "workDir": str(work_dir),
        "startedAt": started_at,
        "finishedAt": finished_at,
        "summaryFile": str(summary_file),
        "reportFile": str(report_file),
        "cycleReports": cycle_reports,
        "rssBaselineTrend": trend,
        "idleEndRssDeltas": trend["idleEndRssDeltas"],
        "maxIdleEndRssDeltaMb": trend["maxIdleEndRssDeltaMb"],
        "monotonicIdleRssIncrease": trend["monotonicIdleRssIncrease"],
        "debugCounters": cycle_reports[-1].get("debugCounters", {}) if cycle_reports else {},
        "rtspGstreamerDebugCounters": (
            cycle_reports[-1].get("rtspGstreamerDebugCounters", {}) if cycle_reports else {}
        ),
        "rtspGstreamerStopDestroySnapshot": (
            cycle_reports[-1].get("rtspGstreamerStopDestroySnapshot", {}) if cycle_reports else {}
        ),
        "rtspGstreamerWarningDetails": (
            cycle_reports[-1].get("rtspGstreamerWarningDetails", []) if cycle_reports else []
        ),
        "cleanupFailures": cleanup_failures,
        "childFailures": child_failures,
        "portClean": port_clean,
        "steps": steps,
    }
    summary_file.write_text(json.dumps(summary, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    write_report(report_file, summary)
    log(f"[summary-json] {summary_file}")
    log(f"[report-md] {report_file}")
    log(f"[summary] judgement={judgement} cycles={len(cycle_reports)} cleanupFailures={len(cleanup_failures)} portClean={port_clean}")
    return 0 if judgement in {"PASS", "WARNING"} else 1


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
# 파일 용도: VA Runtime Console의 dashboard-facing endpoint를 빠르게 검증한다.
"""media pipeline, event payload 형식, rule 저장 schema는 변경하지 않고 조회 endpoint만 확인한다."""

from __future__ import annotations

import argparse
import http.client
import json
import os
import sys
import time
from typing import Any
from urllib.parse import urlencode, urlparse


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="VA Runtime Console smoke")
    parser.add_argument("--http-base", default=os.environ.get("MEDIA_SERVER_VERIFY_VA_RUNTIME_HTTP_BASE", "http://127.0.0.1:8080"))
    parser.add_argument("--file", default=os.environ.get("MEDIA_SERVER_VERIFY_VA_RUNTIME_FILE", "sample_h264.mp4"))
    parser.add_argument("--timeout-ms", type=int, default=int(os.environ.get("MEDIA_SERVER_VERIFY_VA_RUNTIME_TIMEOUT_MS", "12000")))
    parser.add_argument("--poll-interval-ms", type=int, default=int(os.environ.get("MEDIA_SERVER_VERIFY_VA_RUNTIME_POLL_INTERVAL_MS", "500")))
    parser.add_argument(
        "--summary-file",
        default=os.environ.get(
            "MEDIA_SERVER_VERIFY_VA_RUNTIME_SUMMARY",
            f"/tmp/media_server_va_runtime_console_summary_{int(time.time())}.json",
        ),
    )
    return parser.parse_args()


def log_pass(message: str) -> None:
    print(f"[pass] {message}")


def fail(message: str) -> None:
    raise RuntimeError(message)


def connection_for(base: str, timeout_s: float) -> tuple[http.client.HTTPConnection, str]:
    parsed = urlparse(base)
    scheme = parsed.scheme or "http"
    if scheme not in {"http", "https"}:
        fail(f"unsupported scheme: {scheme}")
    host = parsed.hostname or "127.0.0.1"
    port = parsed.port or (443 if scheme == "https" else 80)
    conn_cls = http.client.HTTPSConnection if scheme == "https" else http.client.HTTPConnection
    return conn_cls(host, port, timeout=timeout_s), parsed.path.rstrip("/")


def request_json(base: str, method: str, path: str, timeout_s: float) -> dict[str, Any]:
    conn, prefix = connection_for(base, timeout_s)
    try:
        conn.request(method, f"{prefix}{path}")
        response = conn.getresponse()
        body = response.read().decode("utf-8", errors="replace")
        if response.status < 200 or response.status >= 300:
            fail(f"{method} {path} HTTP {response.status}: {body}")
        return json.loads(body or "{}")
    finally:
        conn.close()


def require_dict(payload: Any, label: str) -> dict[str, Any]:
    if not isinstance(payload, dict):
        fail(f"{label} is not a JSON object")
    return payload


def wait_for_tap_ready(args: argparse.Namespace, tap_id: str, summary: dict[str, Any]) -> dict[str, Any]:
    timeout_s = max(args.timeout_ms / 1000.0, 1.0)
    started_at = time.monotonic()
    last_payload: dict[str, Any] = {}
    while time.monotonic() - started_at < timeout_s:
        payload = request_json(args.http_base, "GET", f"/lab/analysis/taps/{tap_id}", timeout_s)
        last_payload = payload
        tap = payload.get("tap") if isinstance(payload.get("tap"), dict) else payload
        decoded = int(tap.get("decodedFrames", 0) or 0)
        analyzed = int(tap.get("analyzedPackets", 0) or 0)
        pending = int(tap.get("pendingFrames", 0) or 0)
        print(f"[tap] decoded={decoded} analyzed={analyzed} pending={pending}")
        if decoded > 0 or analyzed > 0:
            summary["decodedFrames"] = decoded
            summary["analyzedPackets"] = analyzed
            summary["pendingFrames"] = pending
            return require_dict(payload, "tap status")
        time.sleep(max(args.poll_interval_ms / 1000.0, 0.1))
    fail(f"analysis tap did not start before timeout: {json.dumps(last_payload, ensure_ascii=False)}")


def write_summary(path: str, summary: dict[str, Any]) -> None:
    if not path:
        return
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(summary, handle, ensure_ascii=False, indent=2, sort_keys=True)
        handle.write("\n")
    print(f"[summary-json] {path}")


def run(args: argparse.Namespace, summary: dict[str, Any]) -> None:
    timeout_s = max(args.timeout_ms / 1000.0, 1.0)
    request_json(args.http_base, "GET", "/health", timeout_s)
    log_pass("HTTP health ok")

    query = urlencode({"file": args.file, "va": "1", "profileId": f"runtime-console-smoke-{int(time.time())}"})
    created = request_json(args.http_base, "POST", f"/lab/analysis/taps?{query}", timeout_s)
    tap_id = str(created.get("tapId") or "")
    if not tap_id:
        fail(f"analysis tap creation failed: {created}")
    summary["tapId"] = tap_id
    log_pass(f"analysis tap 생성: {tap_id}")

    try:
        wait_for_tap_ready(args, tap_id, summary)

        metrics = request_json(args.http_base, "GET", f"/lab/analysis/taps/{tap_id}/metrics", timeout_s)
        require_dict(metrics, "metrics")
        for key in ("tapState", "trackState", "metricsReport"):
            if key not in metrics:
                fail(f"metrics endpoint missing {key}")
        summary["metricsKeys"] = sorted(metrics.keys())
        summary["hasTrackingIssueReport"] = "trackingIssueReport" in metrics
        log_pass("metrics endpoint tapState/trackState/metricsReport 확인")

        state_dump = request_json(args.http_base, "GET", f"/lab/analysis/taps/{tap_id}/state-dump", timeout_s)
        require_dict(state_dump, "state-dump")
        if "tap" not in state_dump and "state" not in state_dump and "analyticsState" not in state_dump:
            fail("state-dump endpoint did not expose tap/state/analyticsState")
        summary["stateDumpKeys"] = sorted(state_dump.keys())
        log_pass("state-dump endpoint JSON 확인")

        event_post = request_json(args.http_base, "GET", "/lab/analysis/event-post/status", timeout_s)
        require_dict(event_post, "event-post status")
        summary["eventPostKeys"] = sorted(event_post.keys())
        log_pass("event POST status endpoint 확인")

        event_storage = request_json(args.http_base, "GET", "/lab/analysis/event-storage/status", timeout_s)
        require_dict(event_storage, "event-storage status")
        summary["eventStorageKeys"] = sorted(event_storage.keys())
        log_pass("event storage status endpoint 확인")

        runtime_status = request_json(args.http_base, "GET", "/lab/runtime/status", timeout_s)
        require_dict(runtime_status, "runtime status")
        summary["runtimeStatusKeys"] = sorted(runtime_status.keys())
        log_pass("runtime status endpoint 확인")
    finally:
        if summary.get("tapId"):
            request_json(args.http_base, "DELETE", f"/lab/analysis/taps/{summary['tapId']}", timeout_s)
            log_pass("analysis tap cleanup 확인")


def main() -> int:
    args = parse_args()
    summary: dict[str, Any] = {
        "ok": False,
        "kind": "va-runtime-console",
        "httpBase": args.http_base,
        "file": args.file,
        "timeoutMs": args.timeout_ms,
        "checks": [
            "health",
            "dashboardTapPolling",
            "metricsEndpoint",
            "stateDumpEndpoint",
            "eventPostStatusEndpoint",
            "eventStorageStatusEndpoint",
            "runtimeStatusEndpoint",
            "tapCleanup",
        ],
    }
    try:
        run(args, summary)
        summary["ok"] = True
        summary["pass"] = 8
        summary["fail"] = 0
        print("[summary] pass=8 fail=0")
        return 0
    except Exception as exc:  # noqa: BLE001
        summary["error"] = str(exc)
        summary["pass"] = 0
        summary["fail"] = 1
        print(f"[fail] {exc}", file=sys.stderr)
        return 1
    finally:
        write_summary(args.summary_file, summary)


if __name__ == "__main__":
    raise SystemExit(main())

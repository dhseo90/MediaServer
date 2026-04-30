#!/usr/bin/env python3
"""VA metadata SSE side-channel smoke test.

The script validates the metadata stream only. RTSP playback is verified by
ffplay/ffprobe/VLC separately because general RTSP players do not consume this
side-channel.
"""

from __future__ import annotations

import argparse
import http.client
import json
import os
import sys
import time
from typing import Any
from urllib.parse import urlencode, urlparse


SCHEMA = "media-server.va.runtime-metadata.v1"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="VA metadata SSE side-channel smoke")
    parser.add_argument("--http-base", default="http://127.0.0.1:8080")
    parser.add_argument("--file", default="sample_h264.mp4")
    parser.add_argument("--tap-id", default="")
    parser.add_argument("--timeout-ms", type=int, default=8000)
    parser.add_argument("--interval-ms", type=int, default=100)
    parser.add_argument("--max-messages", type=int, default=1)
    parser.add_argument("--stream-max-duration-ms", type=int, default=0)
    parser.add_argument("--max-message-bytes", type=int, default=65536)
    parser.add_argument("--skip-cleanup-count-check", action="store_true")
    parser.add_argument(
        "--summary-file",
        default=os.environ.get(
            "MEDIA_SERVER_VERIFY_VA_METADATA_SIDECHANNEL_SUMMARY",
            f"/tmp/media_server_va_metadata_sidechannel_summary_{int(time.time())}.json",
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


def request_json(base: str, path: str, timeout_s: float) -> dict[str, Any]:
    conn, prefix = connection_for(base, timeout_s)
    try:
        conn.request("GET", f"{prefix}{path}")
        response = conn.getresponse()
        body = response.read().decode("utf-8", errors="replace")
        if response.status < 200 or response.status >= 300:
            fail(f"{path} HTTP {response.status}: {body}")
        return json.loads(body)
    finally:
        conn.close()


def build_stream_path(args: argparse.Namespace) -> str:
    max_duration_ms = args.stream_max_duration_ms or max(args.timeout_ms - 1000, 1000)
    common = {
        "intervalMs": str(args.interval_ms),
        "maxMessages": str(max(args.max_messages, 0)),
        "maxMessageBytes": str(args.max_message_bytes),
        "streamMaxDurationMs": str(max_duration_ms),
    }
    if args.tap_id:
        query = urlencode(common)
        return f"/lab/analysis/taps/{args.tap_id}/metadata/stream?{query}"
    query_params = {
        **common,
        "file": args.file,
        "va": "1",
    }
    query = urlencode(query_params)
    return f"/lab/analysis/metadata/stream?{query}"


def read_sse_metadata(base: str, path: str, timeout_s: float, max_messages: int) -> dict[str, Any]:
    conn, prefix = connection_for(base, timeout_s)
    started_at = time.monotonic()
    messages: list[dict[str, Any]] = []
    comments = 0
    latest_payload: dict[str, Any] | None = None
    try:
        conn.request("GET", f"{prefix}{path}", headers={"Accept": "text/event-stream"})
        response = conn.getresponse()
        content_type = response.getheader("Content-Type", "")
        if response.status != 200:
            body = response.read(4096).decode("utf-8", errors="replace")
            fail(f"SSE endpoint HTTP {response.status}: {body}")
        if "text/event-stream" not in content_type:
            fail(f"unexpected content-type: {content_type}")
        log_pass("SSE endpoint content-type 확인")

        event_name = ""
        data_lines: list[str] = []
        while time.monotonic() - started_at < timeout_s:
            raw = response.readline()
            if raw == b"":
                break
            line = raw.decode("utf-8", errors="replace").rstrip("\r\n")
            if not line:
                if event_name == "metadata" and data_lines:
                    latest_payload = json.loads("\n".join(data_lines))
                    messages.append(latest_payload)
                    if max_messages > 0 and len(messages) >= max_messages:
                        break
                event_name = ""
                data_lines = []
                continue
            if line.startswith(":"):
                comments += 1
                continue
            if line.startswith("event:"):
                event_name = line.split(":", 1)[1].strip()
            elif line.startswith("data:"):
                data_lines.append(line.split(":", 1)[1].strip())
        if latest_payload is None:
            fail("metadata event was not received before timeout")
        return {
            "latest": latest_payload,
            "messageCount": len(messages),
            "commentCount": comments,
            "durationMs": int((time.monotonic() - started_at) * 1000),
        }
    finally:
        conn.close()


def assert_metadata(payload: dict[str, Any]) -> None:
    if payload.get("schema") != SCHEMA:
        fail(f"unexpected schema: {payload.get('schema')}")
    for field in ("tracks", "events", "scenarios"):
        if not isinstance(payload.get(field), list):
            fail(f"missing array field: {field}")
    if not isinstance(payload.get("metrics"), dict):
        fail("missing metrics object")


def write_summary(path: str, summary: dict[str, Any]) -> None:
    if not path:
        return
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(summary, handle, ensure_ascii=False, indent=2, sort_keys=True)
        handle.write("\n")
    print(f"[summary-json] {path}")


def run(args: argparse.Namespace, summary: dict[str, Any]) -> None:
    timeout_s = max(args.timeout_ms / 1000.0, 1.0)
    request_json(args.http_base, "/health", timeout_s)
    log_pass("HTTP health ok")

    before_taps = request_json(args.http_base, "/lab/analysis/taps", timeout_s)
    before_active_taps = int(before_taps.get("activeTaps", 0) or 0)
    summary["activeTapsBefore"] = before_active_taps

    stream_path = build_stream_path(args)
    summary["streamPath"] = stream_path
    sse_result = read_sse_metadata(args.http_base, stream_path, timeout_s, args.max_messages)
    payload = sse_result["latest"]
    assert_metadata(payload)
    summary["schema"] = payload.get("schema", "")
    summary["trackCount"] = len(payload.get("tracks") or [])
    summary["eventCount"] = len(payload.get("events") or [])
    summary["scenarioCount"] = len(payload.get("scenarios") or [])
    summary["metadataMessageCount"] = sse_result["messageCount"]
    summary["sseCommentCount"] = sse_result["commentCount"]
    summary["streamDurationMs"] = sse_result["durationMs"]
    log_pass("SSE metadata schema/tracks/events/scenarios/metrics 확인")

    after_taps: dict[str, Any] = {}
    after_active_taps = before_active_taps
    cleanup_deadline = time.monotonic() + min(max(timeout_s, 1.0), 5.0)
    while True:
        time.sleep(0.3)
        after_taps = request_json(args.http_base, "/lab/analysis/taps", timeout_s)
        after_active_taps = int(after_taps.get("activeTaps", 0) or 0)
        if args.tap_id or after_active_taps <= before_active_taps or time.monotonic() >= cleanup_deadline:
            break
    summary["activeTapsAfter"] = after_active_taps
    if not args.tap_id and not args.skip_cleanup_count_check and after_active_taps > before_active_taps:
        fail(
            "temporary SSE analysis tap was not cleaned up: "
            f"before={before_active_taps} after={after_active_taps}"
        )
    if args.skip_cleanup_count_check:
        log_pass("SSE cleanup count check 생략 - 상위 longrun cleanup에서 확인")
    else:
        log_pass("SSE 임시 analysis tap cleanup 확인")


def main() -> int:
    args = parse_args()
    summary: dict[str, Any] = {
        "ok": False,
        "kind": "va-metadata-sidechannel",
        "httpBase": args.http_base,
        "file": args.file,
        "tapId": args.tap_id,
        "timeoutMs": args.timeout_ms,
        "intervalMs": args.interval_ms,
        "maxMessages": args.max_messages,
        "streamMaxDurationMs": args.stream_max_duration_ms,
        "checks": [
            "health",
            "sseContentType",
            "metadataSchema",
            "tracksEventsScenariosMetrics",
            "disconnectCleanup",
        ],
        "skipCleanupCountCheck": args.skip_cleanup_count_check,
    }
    try:
        run(args, summary)
        summary["ok"] = True
        summary["pass"] = 5
        summary["fail"] = 0
        print("[summary] pass=5 fail=0")
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

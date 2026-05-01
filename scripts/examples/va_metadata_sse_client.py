#!/usr/bin/env python3
"""Minimal custom client for the VA metadata SSE side-channel.

This example receives metadata only. Play the RTSP raw video separately with
VLC or ffplay, then use the JSON payloads printed here to build a custom
client-side overlay.
"""

from __future__ import annotations

import argparse
import http.client
import json
import socket
import sys
import time
from typing import Any
from urllib.parse import urlparse


SCHEMA = "media-server.va.runtime-metadata.v1"
DEFAULT_SSE_URL = (
    "http://127.0.0.1:8080/lab/analysis/metadata/stream"
    "?vaRule=1&intervalMs=500&maxMessageBytes=65536"
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Receive VA runtime metadata from an SSE side-channel."
    )
    parser.add_argument(
        "sse_url",
        nargs="?",
        default=DEFAULT_SSE_URL,
        help=f"SSE metadata URL. Default: {DEFAULT_SSE_URL}",
    )
    parser.add_argument("--max-messages", type=int, default=5, help="0 means keep reading.")
    parser.add_argument("--timeout-ms", type=int, default=15000)
    parser.add_argument(
        "--preview-bytes",
        type=int,
        default=1200,
        help="Maximum JSON preview bytes per metadata message.",
    )
    parser.add_argument("--pretty", action="store_true", help="Pretty-print the preview JSON.")
    return parser.parse_args()


def open_sse(url: str, timeout_s: float) -> tuple[http.client.HTTPConnection, http.client.HTTPResponse]:
    parsed = urlparse(url)
    scheme = parsed.scheme or "http"
    if scheme not in {"http", "https"}:
        raise ValueError(f"unsupported SSE URL scheme: {scheme}")
    host = parsed.hostname or "127.0.0.1"
    port = parsed.port or (443 if scheme == "https" else 80)
    path = parsed.path or "/"
    if parsed.query:
        path = f"{path}?{parsed.query}"
    conn_cls = http.client.HTTPSConnection if scheme == "https" else http.client.HTTPConnection
    conn = conn_cls(host, port, timeout=timeout_s)
    conn.request("GET", path, headers={"Accept": "text/event-stream"})
    response = conn.getresponse()
    if response.status != 200:
        body = response.read(4096).decode("utf-8", errors="replace")
        conn.close()
        raise RuntimeError(f"SSE endpoint HTTP {response.status}: {body}")
    content_type = response.getheader("Content-Type", "")
    if "text/event-stream" not in content_type:
        conn.close()
        raise RuntimeError(f"unexpected content-type: {content_type}")
    return conn, response


def validate_metadata(payload: dict[str, Any]) -> list[str]:
    warnings: list[str] = []
    if payload.get("schema") != SCHEMA:
        warnings.append(f"schema={payload.get('schema')!r}, expected {SCHEMA!r}")
    for name in ("tracks", "events", "scenarios"):
        if not isinstance(payload.get(name), list):
            warnings.append(f"{name} is not an array")
    if not isinstance(payload.get("metrics"), dict):
        warnings.append("metrics is not an object")
    return warnings


def compact_preview(payload: dict[str, Any], pretty: bool, limit: int) -> str:
    if pretty:
        text = json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True)
    else:
        text = json.dumps(payload, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    if limit <= 0 or len(text.encode("utf-8")) <= limit:
        return text
    encoded = text.encode("utf-8")[:limit]
    return encoded.decode("utf-8", errors="ignore") + "...<truncated>"


def print_metadata(payload: dict[str, Any], message_count: int, args: argparse.Namespace) -> None:
    warnings = validate_metadata(payload)
    tracks = payload.get("tracks") if isinstance(payload.get("tracks"), list) else []
    events = payload.get("events") if isinstance(payload.get("events"), list) else []
    scenarios = payload.get("scenarios") if isinstance(payload.get("scenarios"), list) else []
    timestamp_ms = payload.get("timestampMs") or payload.get("timestamp")
    print(
        "[metadata] "
        f"#{message_count} schema={payload.get('schema', '-')} "
        f"tracks={len(tracks)} events={len(events)} scenarios={len(scenarios)} "
        f"timestampMs={timestamp_ms if timestamp_ms is not None else '-'}"
    )
    if warnings:
        print("[schema-warning] " + "; ".join(warnings), file=sys.stderr)
    print("[preview]")
    print(compact_preview(payload, args.pretty, args.preview_bytes))


def read_loop(response: http.client.HTTPResponse, args: argparse.Namespace) -> int:
    message_count = 0
    comment_count = 0
    event_name = ""
    data_lines: list[str] = []
    deadline = time.monotonic() + max(args.timeout_ms / 1000.0, 1.0)
    while time.monotonic() < deadline:
        try:
            raw = response.readline()
        except socket.timeout:
            break
        if raw == b"":
            break
        line = raw.decode("utf-8", errors="replace").rstrip("\r\n")
        if not line:
            if event_name == "metadata" and data_lines:
                payload = json.loads("\n".join(data_lines))
                message_count += 1
                print_metadata(payload, message_count, args)
                if args.max_messages > 0 and message_count >= args.max_messages:
                    break
            event_name = ""
            data_lines = []
            continue
        if line.startswith(":"):
            comment_count += 1
            continue
        if line.startswith("event:"):
            event_name = line.split(":", 1)[1].strip()
            continue
        if line.startswith("data:"):
            data_lines.append(line.split(":", 1)[1].strip())
    print(f"[summary] metadataMessages={message_count} comments={comment_count}")
    if message_count == 0:
        raise RuntimeError("metadata event was not received before timeout")
    return message_count


def main() -> int:
    args = parse_args()
    timeout_s = max(args.timeout_ms / 1000.0, 1.0)
    print(f"[connect] {args.sse_url}")
    conn: http.client.HTTPConnection | None = None
    try:
        conn, response = open_sse(args.sse_url, timeout_s)
        read_loop(response, args)
        return 0
    except Exception as exc:  # noqa: BLE001
        print(f"[error] {exc}", file=sys.stderr)
        return 1
    finally:
        if conn is not None:
            conn.close()


if __name__ == "__main__":
    raise SystemExit(main())

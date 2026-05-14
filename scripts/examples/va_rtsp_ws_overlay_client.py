#!/usr/bin/env python3
# 파일 용도: RTSP 영상과 VA 메타데이터 WebSocket을 함께 사용해 client-side overlay를 그리는 예제다.
"""일반 RTSP 플레이어가 처리하지 않는 WebSocket 메타데이터 overlay 동작을 custom client 형태로 보여준다."""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import socket
import ssl
import struct
import sys
import threading
import time
from dataclasses import dataclass, field
from typing import Any
from urllib.parse import urlparse

from va_metadata_sse_client import SCHEMA, validate_metadata
from va_rtsp_sse_overlay_client import (
    MetadataCache,
    RenderStats,
    draw_overlay,
    draw_stale_badge,
    load_cv2,
    maybe_print_status,
    open_rtsp,
)

CONTROL_SCHEMA = "media-server.va.metadata-control.v1"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "RTSP 원본 stream과 WebSocket 메타데이터를 함께 받아 "
            "bbox/trackId/className을 client-side에서 그립니다."
        )
    )
    parser.add_argument("--rtsp-url", required=True, help="RTSP 영상 URL입니다.")
    parser.add_argument("--metadata-url", required=True, help="VA runtime 메타데이터 WebSocket URL입니다.")
    parser.add_argument("--max-seconds", type=float, default=0.0, help="0이면 중지할 때까지 실행합니다.")
    parser.add_argument(
        "--headless",
        "--no-window",
        dest="headless",
        action="store_true",
        help="OpenCV 창을 열지 않고 frame decode와 overlay 적용만 수행합니다.",
    )
    parser.add_argument("--print-json", action="store_true", help="수락된 메타데이터 payload를 매번 출력합니다.")
    parser.add_argument("--stale-ms", type=int, default=2000, help="최신 메타데이터가 오래되면 bbox overlay를 지웁니다.")
    parser.add_argument(
        "--connect-timeout-seconds",
        type=float,
        default=10.0,
        help="WebSocket 연결과 최초 RTSP open 확인 timeout입니다.",
    )
    parser.add_argument("--status-interval-seconds", type=float, default=2.0, help="주기적 통계 출력 간격입니다.")
    parser.add_argument("--window-name", default="VA RTSP WS Overlay", help="OpenCV 창 제목입니다.")
    parser.add_argument(
        "--subscribe-json",
        default="",
        help="연결 후 보낼 WebSocket subscribe command JSON입니다. 예: '{\"type\":\"subscribe\",\"includeMetrics\":false}'",
    )
    return parser.parse_args()


@dataclass
class WsCounters:
    lock: threading.Lock = field(default_factory=threading.Lock)
    control_ack_count: int = 0
    ws_error: str = ""

    def increment_control_ack(self) -> None:
        with self.lock:
            self.control_ack_count += 1

    def mark_error(self, message: str) -> None:
        with self.lock:
            self.ws_error = message

    def snapshot(self) -> dict[str, Any]:
        with self.lock:
            return {
                "controlAckCount": self.control_ack_count,
                "wsError": self.ws_error,
            }


class WebSocketClient:
    def __init__(self, url: str, timeout_s: float) -> None:
        self.url = url
        self.timeout_s = max(timeout_s, 1.0)
        self.sock: socket.socket | ssl.SSLSocket | None = None

    def connect(self) -> None:
        parsed = urlparse(self.url)
        if parsed.scheme not in {"ws", "wss"}:
            raise RuntimeError("metadata URL must use ws:// or wss://")
        host = parsed.hostname or ""
        if not host:
            raise RuntimeError("metadata URL host is empty")
        port = parsed.port or (443 if parsed.scheme == "wss" else 80)
        raw_sock = socket.create_connection((host, port), timeout=self.timeout_s)
        raw_sock.settimeout(self.timeout_s)
        if parsed.scheme == "wss":
            self.sock = ssl.create_default_context().wrap_socket(raw_sock, server_hostname=host)
        else:
            self.sock = raw_sock

        path = parsed.path or "/"
        if parsed.query:
            path += "?" + parsed.query
        key = base64.b64encode(os.urandom(16)).decode("ascii")
        host_header = host if parsed.port is None else f"{host}:{port}"
        request = (
            f"GET {path} HTTP/1.1\r\n"
            f"Host: {host_header}\r\n"
            "Upgrade: websocket\r\n"
            "Connection: Upgrade\r\n"
            f"Sec-WebSocket-Key: {key}\r\n"
            "Sec-WebSocket-Version: 13\r\n"
            "\r\n"
        )
        self._send_all(request.encode("ascii"))
        header = self._read_http_header()
        status_line = header.split("\r\n", 1)[0]
        if " 101 " not in status_line:
            raise RuntimeError(f"WebSocket handshake failed: {status_line}")
        expected_accept = base64.b64encode(
            hashlib.sha1((key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").encode("ascii")).digest()
        ).decode("ascii")
        if f"sec-websocket-accept: {expected_accept.lower()}" not in header.lower():
            raise RuntimeError("WebSocket handshake accept key mismatch")

    def close(self) -> None:
        try:
            if self.sock is not None:
                self.sock.close()
        finally:
            self.sock = None

    def send_text(self, payload: str) -> None:
        self._send_frame(0x1, payload.encode("utf-8"))

    def send_pong(self, payload: bytes) -> None:
        self._send_frame(0xA, payload)

    def receive_text(self) -> str | None:
        while True:
            opcode, payload = self._read_frame()
            if opcode == 0x1:
                return payload.decode("utf-8", errors="replace")
            if opcode == 0x8:
                return None
            if opcode == 0x9:
                self.send_pong(payload)

    def _read_http_header(self) -> str:
        data = bytearray()
        deadline = time.monotonic() + self.timeout_s
        while b"\r\n\r\n" not in data:
            if time.monotonic() > deadline:
                raise RuntimeError("WebSocket handshake timed out")
            chunk = self._recv_exact(1)
            data.extend(chunk)
            if len(data) > 32768:
                raise RuntimeError("WebSocket handshake header too large")
        return data.decode("iso-8859-1", errors="replace")

    def _read_frame(self) -> tuple[int, bytes]:
        header = self._recv_exact(2)
        opcode = header[0] & 0x0F
        masked = (header[1] & 0x80) != 0
        length = header[1] & 0x7F
        if length == 126:
            length = struct.unpack("!H", self._recv_exact(2))[0]
        elif length == 127:
            length = struct.unpack("!Q", self._recv_exact(8))[0]
        mask = self._recv_exact(4) if masked else b""
        payload = self._recv_exact(length) if length else b""
        if masked:
            payload = bytes(byte ^ mask[index % 4] for index, byte in enumerate(payload))
        return opcode, payload

    def _send_frame(self, opcode: int, payload: bytes) -> None:
        mask = os.urandom(4)
        length = len(payload)
        frame = bytearray([0x80 | (opcode & 0x0F)])
        if length <= 125:
            frame.append(0x80 | length)
        elif length <= 65535:
            frame.append(0x80 | 126)
            frame.extend(struct.pack("!H", length))
        else:
            frame.append(0x80 | 127)
            frame.extend(struct.pack("!Q", length))
        frame.extend(mask)
        frame.extend(byte ^ mask[index % 4] for index, byte in enumerate(payload))
        self._send_all(bytes(frame))

    def _recv_exact(self, size: int) -> bytes:
        if self.sock is None:
            raise RuntimeError("WebSocket is not connected")
        data = bytearray()
        while len(data) < size:
            chunk = self.sock.recv(size - len(data))
            if chunk == b"":
                raise RuntimeError("WebSocket closed")
            data.extend(chunk)
        return bytes(data)

    def _send_all(self, data: bytes) -> None:
        if self.sock is None:
            raise RuntimeError("WebSocket is not connected")
        self.sock.sendall(data)


def ws_reader(
    url: str,
    timeout_s: float,
    subscribe_json: str,
    cache: MetadataCache,
    counters: WsCounters,
    stop_event: threading.Event,
    print_json: bool,
) -> None:
    client = WebSocketClient(url, timeout_s)
    try:
        client.connect()
        cache.mark_connected()
        if subscribe_json.strip():
            json.loads(subscribe_json)
            client.send_text(subscribe_json)
        while not stop_event.is_set():
            raw = client.receive_text()
            if raw is None:
                counters.mark_error("WebSocket closed by server")
                return
            handle_ws_payload(raw, cache, counters, print_json)
    except Exception as exc:  # noqa: BLE001
        message = f"WebSocket connect/read failed: {exc}"
        cache.mark_error(message)
        counters.mark_error(message)
    finally:
        client.close()


def handle_ws_payload(raw_json: str, cache: MetadataCache, counters: WsCounters, print_json: bool) -> None:
    try:
        payload = json.loads(raw_json)
    except json.JSONDecodeError:
        cache.increment_parse_error()
        return
    if not isinstance(payload, dict):
        cache.increment_schema_error("metadata payload is not an object")
        return
    if payload.get("schema") == CONTROL_SCHEMA:
        counters.increment_control_ack()
        if print_json:
            print(json.dumps(payload, ensure_ascii=False, sort_keys=True))
        return
    try:
        validate_metadata(payload)
    except RuntimeError as exc:
        cache.increment_schema_error(str(exc))
        return
    cache.update(payload)
    if print_json:
        print(json.dumps(payload, ensure_ascii=False, sort_keys=True))


def wait_for_ws(cache: MetadataCache, timeout_s: float) -> None:
    deadline = time.monotonic() + max(timeout_s, 1.0)
    while time.monotonic() < deadline:
        connected, error = cache.ready_or_error()
        if connected:
            print(f"[ws] connected schema={SCHEMA}")
            return
        if error:
            raise RuntimeError(error)
        time.sleep(0.05)
    raise RuntimeError("WebSocket connect timed out")


def render_loop(args: argparse.Namespace) -> int:
    cv2 = load_cv2(args.headless)
    stop_event = threading.Event()
    cache = MetadataCache()
    counters = WsCounters()
    reader = threading.Thread(
        target=ws_reader,
        args=(
            args.metadata_url,
            args.connect_timeout_seconds,
            args.subscribe_json,
            cache,
            counters,
            stop_event,
            args.print_json,
        ),
        name="va-metadata-ws-reader",
        daemon=True,
    )
    print(f"[ws] connect {args.metadata_url}")
    reader.start()
    wait_for_ws(cache, args.connect_timeout_seconds)

    print(f"[rtsp] open {args.rtsp_url}")
    capture = open_rtsp(cv2, args.rtsp_url)
    print("[rtsp] opened")

    stats = RenderStats()
    deadline = time.monotonic() + args.max_seconds if args.max_seconds and args.max_seconds > 0.0 else None
    next_status_at = time.monotonic() + max(args.status_interval_seconds, 0.0)
    try:
        while not stop_event.is_set():
            if deadline is not None and time.monotonic() >= deadline:
                break
            ok, frame = capture.read()
            if not ok:
                stats.rtsp_read_failures += 1
                if stats.frame_count == 0:
                    raise RuntimeError("RTSP read failed before any frame was received")
                break
            stats.frame_count += 1
            payload, age_ms, stale = cache.snapshot(args.stale_ms)
            if payload is not None and not stale:
                draw_overlay(cv2, frame, payload, stats)
            else:
                stats.stale_frame_count += 1
                if not args.headless:
                    draw_stale_badge(cv2, frame, age_ms)
            if not args.headless:
                cv2.imshow(args.window_name, frame)
                key = cv2.waitKey(1) & 0xFF
                if key in {ord("q"), 27}:
                    break
            next_status_at = maybe_print_status(cache, stats, next_status_at, args.status_interval_seconds)
    finally:
        stop_event.set()
        capture.release()
        if not args.headless:
            cv2.destroyAllWindows()
        reader.join(timeout=1.0)
    print_summary(cache, counters, stats)
    return 0


def print_summary(cache: MetadataCache, counters: WsCounters, stats: RenderStats) -> None:
    metadata = cache.counters()
    ws = counters.snapshot()
    print(
        "[summary] "
        f"frames={stats.frame_count} rtspReadFailures={stats.rtsp_read_failures} "
        f"overlayFrames={stats.overlay_frame_count} overlayTracks={stats.overlay_track_count} "
        f"invalidBboxes={stats.invalid_bbox_count} staleFrames={stats.stale_frame_count} "
        f"metadataMessages={metadata['messageCount']} controlAcks={ws['controlAckCount']} "
        f"parseErrors={metadata['parseErrorCount']} schemaErrors={metadata['schemaErrorCount']}"
    )
    if metadata["sseError"]:
        print(f"[ws] lastError={metadata['sseError']}")
    if ws["wsError"] and ws["wsError"] != metadata["sseError"]:
        print(f"[ws] controlError={ws['wsError']}")


def main() -> int:
    args = parse_args()
    try:
        return render_loop(args)
    except KeyboardInterrupt:
        print("[stop] interrupted")
        return 130
    except Exception as exc:  # noqa: BLE001
        print(f"[error] {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

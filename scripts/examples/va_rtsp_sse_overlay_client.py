#!/usr/bin/env python3
"""Custom RTSP + VA metadata SSE client-side overlay example.

This is an optional custom client example. VLC, ffplay, and IINA do not
automatically consume the SSE side-channel or draw these overlays.
"""

from __future__ import annotations

import argparse
import json
import socket
import sys
import threading
import time
from dataclasses import dataclass, field
from typing import Any

from va_metadata_sse_client import SCHEMA, open_sse, validate_metadata


Color = tuple[int, int, int]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Custom RTSP + SSE metadata overlay renderer. This example opens an RTSP "
            "raw stream, receives VA runtime metadata from a separate SSE side-channel, "
            "and draws bbox/trackId/className client-side. General VLC/ffplay/IINA "
            "clients do not automatically overlay this metadata."
        )
    )
    parser.add_argument("--rtsp-url", required=True, help="RTSP video URL.")
    parser.add_argument("--metadata-url", required=True, help="VA runtime metadata SSE URL.")
    parser.add_argument("--max-seconds", type=float, default=0.0, help="0 means run until stopped.")
    parser.add_argument(
        "--headless",
        "--no-window",
        dest="headless",
        action="store_true",
        help="Decode frames and apply overlays without opening an OpenCV window.",
    )
    parser.add_argument("--print-json", action="store_true", help="Print each accepted metadata payload.")
    parser.add_argument(
        "--stale-ms",
        type=int,
        default=2000,
        help="Clear bbox overlay when latest metadata is older than this age.",
    )
    parser.add_argument(
        "--connect-timeout-seconds",
        type=float,
        default=10.0,
        help="Timeout for SSE connect and initial RTSP open checks.",
    )
    parser.add_argument(
        "--status-interval-seconds",
        type=float,
        default=2.0,
        help="Periodic stats print interval. 0 disables periodic stats.",
    )
    parser.add_argument("--window-name", default="VA RTSP SSE Overlay", help="OpenCV window title.")
    return parser.parse_args()


@dataclass
class MetadataCache:
    lock: threading.Lock = field(default_factory=threading.Lock)
    connected: bool = False
    latest_payload: dict[str, Any] | None = None
    latest_received_at: float = 0.0
    message_count: int = 0
    comment_count: int = 0
    parse_error_count: int = 0
    schema_error_count: int = 0
    sse_error: str = ""

    def mark_connected(self) -> None:
        with self.lock:
            self.connected = True

    def mark_error(self, message: str) -> None:
        with self.lock:
            self.sse_error = message

    def increment_comment(self) -> None:
        with self.lock:
            self.comment_count += 1

    def increment_parse_error(self) -> None:
        with self.lock:
            self.parse_error_count += 1

    def increment_schema_error(self, message: str) -> None:
        with self.lock:
            self.schema_error_count += 1
            self.sse_error = message

    def update(self, payload: dict[str, Any]) -> None:
        with self.lock:
            self.latest_payload = payload
            self.latest_received_at = time.monotonic()
            self.message_count += 1

    def ready_or_error(self) -> tuple[bool, str]:
        with self.lock:
            return self.connected, self.sse_error

    def snapshot(self, stale_ms: int) -> tuple[dict[str, Any] | None, float | None, bool]:
        with self.lock:
            payload = self.latest_payload
            received_at = self.latest_received_at
        if payload is None or received_at <= 0:
            return None, None, True
        age_ms = (time.monotonic() - received_at) * 1000.0
        return payload, age_ms, age_ms > max(stale_ms, 0)

    def counters(self) -> dict[str, Any]:
        with self.lock:
            return {
                "connected": self.connected,
                "messageCount": self.message_count,
                "commentCount": self.comment_count,
                "parseErrorCount": self.parse_error_count,
                "schemaErrorCount": self.schema_error_count,
                "sseError": self.sse_error,
            }


@dataclass
class RenderStats:
    frame_count: int = 0
    overlay_frame_count: int = 0
    overlay_track_count: int = 0
    stale_frame_count: int = 0
    rtsp_read_failures: int = 0
    invalid_bbox_count: int = 0


def load_cv2(headless: bool) -> Any:
    try:
        import cv2  # type: ignore[import-not-found]
    except ImportError as exc:
        package = "opencv-python-headless" if headless else "opencv-python"
        raise RuntimeError(
            "OpenCV is required for this example. Install it with: "
            f"python3 -m pip install {package}"
        ) from exc
    return cv2


def sse_reader(
    url: str,
    timeout_s: float,
    cache: MetadataCache,
    stop_event: threading.Event,
    print_json: bool,
) -> None:
    conn = None
    try:
        conn, response = open_sse(url, max(timeout_s, 1.0))
        cache.mark_connected()
        event_name = ""
        data_lines: list[str] = []
        while not stop_event.is_set():
            try:
                raw = response.readline()
            except socket.timeout:
                continue
            if raw == b"":
                cache.mark_error("SSE stream closed by server")
                return
            line = raw.decode("utf-8", errors="replace").rstrip("\r\n")
            if not line:
                if event_name == "metadata" and data_lines:
                    handle_sse_payload("\n".join(data_lines), cache, print_json)
                event_name = ""
                data_lines = []
                continue
            if line.startswith(":"):
                cache.increment_comment()
                continue
            if line.startswith("event:"):
                event_name = line.split(":", 1)[1].strip()
                continue
            if line.startswith("data:"):
                data_lines.append(line.split(":", 1)[1].strip())
    except Exception as exc:  # noqa: BLE001
        cache.mark_error(f"SSE connect/read failed: {exc}")
    finally:
        if conn is not None:
            conn.close()


def handle_sse_payload(raw_json: str, cache: MetadataCache, print_json: bool) -> None:
    try:
        payload = json.loads(raw_json)
    except json.JSONDecodeError:
        cache.increment_parse_error()
        return
    if not isinstance(payload, dict):
        cache.increment_schema_error("metadata payload is not an object")
        return
    try:
        validate_metadata(payload)
    except RuntimeError as exc:
        cache.increment_schema_error(str(exc))
        return
    cache.update(payload)
    if print_json:
        print(json.dumps(payload, ensure_ascii=False, sort_keys=True))


def wait_for_sse(cache: MetadataCache, timeout_s: float) -> None:
    deadline = time.monotonic() + max(timeout_s, 1.0)
    while time.monotonic() < deadline:
        connected, error = cache.ready_or_error()
        if connected:
            print(f"[sse] connected schema={SCHEMA}")
            return
        if error:
            raise RuntimeError(error)
        time.sleep(0.05)
    raise RuntimeError("SSE connect timed out")


def open_rtsp(cv2: Any, rtsp_url: str) -> Any:
    capture = cv2.VideoCapture(rtsp_url)
    if not capture.isOpened():
        capture.release()
        raise RuntimeError(
            "RTSP open failed. Check --rtsp-url and OpenCV FFmpeg/GStreamer RTSP support."
        )
    return capture


def normalized_bbox_to_pixels(
    bbox: Any,
    frame_width: int,
    frame_height: int,
) -> tuple[int, int, int, int] | None:
    if not isinstance(bbox, dict):
        return None
    try:
        x = float(bbox["x"])
        y = float(bbox["y"])
        width = float(bbox["width"])
        height = float(bbox["height"])
    except (KeyError, TypeError, ValueError):
        return None
    if width <= 0.0 or height <= 0.0:
        return None
    # The VA runtime metadata contract uses normalized-frame coordinates.
    if x > 1.0 or y > 1.0 or width > 1.5 or height > 1.5:
        return None
    x1 = clamp_int(round(x * frame_width), 0, max(frame_width - 1, 0))
    y1 = clamp_int(round(y * frame_height), 0, max(frame_height - 1, 0))
    x2 = clamp_int(round((x + width) * frame_width), 0, max(frame_width - 1, 0))
    y2 = clamp_int(round((y + height) * frame_height), 0, max(frame_height - 1, 0))
    if x2 <= x1 or y2 <= y1:
        return None
    return x1, y1, x2, y2


def clamp_int(value: float, lower: int, upper: int) -> int:
    return max(lower, min(upper, int(value)))


def track_color(track_id: Any) -> Color:
    try:
        seed = int(track_id)
    except (TypeError, ValueError):
        seed = 0
    return (
        80 + ((seed * 53) % 160),
        80 + ((seed * 97) % 160),
        80 + ((seed * 193) % 160),
    )


def format_label(track: dict[str, Any]) -> str:
    track_id = track.get("trackId", "-")
    class_name = track.get("className") or track.get("label") or "object"
    confidence = track.get("confidence")
    if isinstance(confidence, (int, float)):
        return f"#{track_id} {class_name} {confidence:.2f}"
    return f"#{track_id} {class_name}"


def draw_text_box(cv2: Any, frame: Any, text: str, origin: tuple[int, int], color: Color) -> None:
    font = cv2.FONT_HERSHEY_SIMPLEX
    scale = 0.5
    thickness = 1
    x, y = origin
    (text_width, text_height), baseline = cv2.getTextSize(text, font, scale, thickness)
    top = max(0, y - text_height - baseline - 6)
    cv2.rectangle(
        frame,
        (x, top),
        (min(frame.shape[1] - 1, x + text_width + 8), y),
        color,
        -1,
    )
    cv2.putText(frame, text, (x + 4, y - 5), font, scale, (0, 0, 0), thickness, cv2.LINE_AA)


def draw_overlay(cv2: Any, frame: Any, payload: dict[str, Any], stats: RenderStats) -> int:
    tracks = payload.get("tracks") if isinstance(payload.get("tracks"), list) else []
    frame_height, frame_width = frame.shape[:2]
    drawn = 0
    for track in tracks:
        if not isinstance(track, dict):
            continue
        bbox = normalized_bbox_to_pixels(track.get("bbox"), frame_width, frame_height)
        if bbox is None:
            stats.invalid_bbox_count += 1
            continue
        x1, y1, x2, y2 = bbox
        color = track_color(track.get("trackId"))
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
        draw_text_box(cv2, frame, format_label(track), (x1, max(y1, 18)), color)
        drawn += 1
    if drawn:
        stats.overlay_frame_count += 1
        stats.overlay_track_count += drawn
    return drawn


def draw_stale_badge(cv2: Any, frame: Any, age_ms: float | None) -> None:
    text = "metadata stale"
    if age_ms is not None:
        text = f"metadata stale {age_ms:.0f}ms"
    cv2.putText(
        frame,
        text,
        (16, 28),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        (0, 0, 255),
        2,
        cv2.LINE_AA,
    )


def maybe_print_status(
    cache: MetadataCache,
    stats: RenderStats,
    next_status_at: float,
    interval_s: float,
) -> float:
    if interval_s <= 0.0 or time.monotonic() < next_status_at:
        return next_status_at
    counters = cache.counters()
    print(
        "[status] "
        f"frames={stats.frame_count} overlays={stats.overlay_frame_count} "
        f"overlayTracks={stats.overlay_track_count} metadataMessages={counters['messageCount']} "
        f"parseErrors={counters['parseErrorCount']} schemaErrors={counters['schemaErrorCount']} "
        f"staleFrames={stats.stale_frame_count}"
    )
    return time.monotonic() + interval_s


def render_loop(args: argparse.Namespace) -> int:
    cv2 = load_cv2(args.headless)
    stop_event = threading.Event()
    cache = MetadataCache()
    reader = threading.Thread(
        target=sse_reader,
        args=(
            args.metadata_url,
            args.connect_timeout_seconds,
            cache,
            stop_event,
            args.print_json,
        ),
        name="va-metadata-sse-reader",
        daemon=True,
    )
    print(f"[sse] connect {args.metadata_url}")
    reader.start()
    wait_for_sse(cache, args.connect_timeout_seconds)

    print(f"[rtsp] open {args.rtsp_url}")
    capture = open_rtsp(cv2, args.rtsp_url)
    print("[rtsp] opened")

    stats = RenderStats()
    deadline = (
        time.monotonic() + args.max_seconds
        if args.max_seconds and args.max_seconds > 0.0
        else None
    )
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
            next_status_at = maybe_print_status(
                cache,
                stats,
                next_status_at,
                args.status_interval_seconds,
            )
    finally:
        stop_event.set()
        capture.release()
        if not args.headless:
            cv2.destroyAllWindows()
        reader.join(timeout=1.0)
    print_summary(cache, stats)
    return 0


def print_summary(cache: MetadataCache, stats: RenderStats) -> None:
    counters = cache.counters()
    print(
        "[summary] "
        f"frames={stats.frame_count} rtspReadFailures={stats.rtsp_read_failures} "
        f"overlayFrames={stats.overlay_frame_count} overlayTracks={stats.overlay_track_count} "
        f"invalidBboxes={stats.invalid_bbox_count} staleFrames={stats.stale_frame_count} "
        f"metadataMessages={counters['messageCount']} sseComments={counters['commentCount']} "
        f"parseErrors={counters['parseErrorCount']} schemaErrors={counters['schemaErrorCount']}"
    )
    if counters["sseError"]:
        print(f"[sse] lastError={counters['sseError']}")


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

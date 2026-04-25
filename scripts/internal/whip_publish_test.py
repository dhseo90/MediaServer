#!/usr/bin/env python3
# 파일 용도: GStreamer testsrc를 WHIP endpoint로 publish하는 로컬 WebRTC source 검증 도구다.
import argparse
import json
import signal
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

import gi

gi.require_version("Gst", "1.0")
gi.require_version("GstSdp", "1.0")
gi.require_version("GstWebRTC", "1.0")
from gi.repository import GLib, Gst, GstSdp, GstWebRTC


class WhipPublisher:
    def __init__(self, http_base: str, source_id: str, duration_s: int) -> None:
        self.http_base = http_base.rstrip("/")
        self.source_id = source_id
        self.duration_s = duration_s
        self.loop = GLib.MainLoop()
        self.pipeline = None
        self.webrtc = None
        self.session_id = None
        self.poll_stop = threading.Event()
        self.poll_thread = None
        self.timer_thread = None
        self.negotiation_done = threading.Event()
        self.negotiation_error = None
        self.stop_timer = threading.Event()
        self.stop_requested = threading.Event()

    def build_pipeline(self) -> str:
        return (
            "webrtcbin name=webrtc bundle-policy=max-bundle "
            "videotestsrc is-live=true pattern=ball ! "
            "video/x-raw,width=640,height=360,framerate=15/1 ! "
            "videoconvert ! x264enc tune=zerolatency speed-preset=ultrafast bitrate=512 key-int-max=30 byte-stream=true ! "
            "h264parse config-interval=-1 ! rtph264pay pt=96 config-interval=1 ! application/x-rtp,media=video,encoding-name=H264,payload=96 ! webrtc. "
            "audiotestsrc is-live=true wave=sine ! audioconvert ! audioresample ! "
            "opusenc bitrate=64000 ! rtpopuspay pt=111 ! application/x-rtp,media=audio,encoding-name=OPUS,payload=111 ! webrtc."
        )

    def http_json(self, method: str, path: str, body: bytes | None = None, headers: dict | None = None):
        url = f"{self.http_base}{path}"
        req = urllib.request.Request(url, data=body, method=method)
        for key, value in (headers or {}).items():
            req.add_header(key, value)
        with urllib.request.urlopen(req, timeout=10) as response:
            payload = response.read()
            return response.status, dict(response.headers), payload

    def start(self) -> None:
        Gst.init(None)
        self.pipeline = Gst.parse_launch(self.build_pipeline())
        self.webrtc = self.pipeline.get_by_name("webrtc")
        if self.webrtc is None:
            raise RuntimeError("missing webrtc element")

        self.webrtc.connect("on-negotiation-needed", self.on_negotiation_needed)
        self.webrtc.connect("on-ice-candidate", self.on_local_ice_candidate)

        bus = self.pipeline.get_bus()
        bus.add_signal_watch()
        bus.connect("message", self.on_bus_message)

        if self.pipeline.set_state(Gst.State.PLAYING) == Gst.StateChangeReturn.FAILURE:
            raise RuntimeError("failed to start publisher pipeline")

        if self.duration_s > 0:
            self.timer_thread = threading.Thread(target=self.run_timer, daemon=True)
            self.timer_thread.start()
        try:
            self.loop.run()
        finally:
            self.cleanup()

    def run_timer(self):
        if not self.stop_timer.wait(self.duration_s):
            print(f"[publisher] duration expired after {self.duration_s}s", file=sys.stderr)
            GLib.idle_add(self.loop.quit)

    def request_stop(self, reason: str) -> None:
        if self.stop_requested.is_set():
            return
        self.stop_requested.set()
        print(f"[publisher] stopping: {reason}", file=sys.stderr)
        GLib.idle_add(self.loop.quit)

    def on_bus_message(self, _bus, message):
        if message.type == Gst.MessageType.ERROR:
            err, dbg = message.parse_error()
            self.negotiation_error = err.message if err else "unknown bus error"
            print(f"[publisher] bus error: {self.negotiation_error}", file=sys.stderr)
            if dbg:
                print(f"[publisher] debug: {dbg}", file=sys.stderr)
            self.loop.quit()
        elif message.type == Gst.MessageType.EOS:
            print("[publisher] bus eos", file=sys.stderr)
            self.loop.quit()

    def on_negotiation_needed(self, _element):
        promise = Gst.Promise.new_with_change_func(self.on_offer_created, None, None)
        self.webrtc.emit("create-offer", None, promise)

    def on_offer_created(self, promise: Gst.Promise, *_args):
        reply = promise.get_reply()
        offer = reply.get_value("offer") if reply is not None else None
        if offer is None:
            self.negotiation_error = "failed to create offer"
            self.loop.quit()
            return

        local_desc_promise = Gst.Promise.new()
        self.webrtc.emit("set-local-description", offer, local_desc_promise)
        local_desc_promise.interrupt()

        sdp_text = offer.sdp.as_text()
        try:
            status, _headers, payload = self.http_json(
                "POST",
                f"/whip/publish?sourceId={urllib.parse.quote(self.source_id, safe='')}",
                body=sdp_text.encode("utf-8"),
                headers={"Content-Type": "application/sdp"},
            )
            if status < 200 or status >= 300:
                raise RuntimeError(f"unexpected status {status}")
            response = json.loads(payload.decode("utf-8"))
            self.session_id = response["sessionId"]
            answer_sdp = response["answer"]
            self.set_remote_answer(answer_sdp)
            self.start_ice_poll()
            self.negotiation_done.set()
            print(f"[publisher] session created: {self.session_id} sourceId={response['sourceId']}")
        except Exception as exc:  # noqa: BLE001
            self.negotiation_error = str(exc)
            self.loop.quit()

    def set_remote_answer(self, sdp_text: str):
        _, sdpmsg = GstSdp.SDPMessage.new()
        result = GstSdp.sdp_message_parse_buffer(sdp_text.encode("utf-8"), sdpmsg)
        if result != GstSdp.SDPResult.OK:
            raise RuntimeError("failed to parse remote SDP answer")
        answer = GstWebRTC.WebRTCSessionDescription.new(GstWebRTC.WebRTCSDPType.ANSWER, sdpmsg)
        promise = Gst.Promise.new()
        self.webrtc.emit("set-remote-description", answer, promise)
        promise.interrupt()

    def on_local_ice_candidate(self, _element, sdp_mline_index: int, candidate: str):
        if not self.session_id or not candidate:
            return
        payload = json.dumps({"sdpMLineIndex": int(sdp_mline_index), "candidate": candidate}).encode("utf-8")
        try:
            self.http_json(
                "POST",
                f"/whip/publish/session/{urllib.parse.quote(self.session_id, safe='')}/ice",
                body=payload,
                headers={"Content-Type": "application/json"},
            )
        except Exception as exc:  # noqa: BLE001
            print(f"[publisher] failed to POST ICE: {exc}", file=sys.stderr)

    def start_ice_poll(self):
        if self.poll_thread is not None:
            return

        def poll():
            while not self.poll_stop.wait(1.0):
                if not self.session_id:
                    continue
                try:
                    _status, _headers, payload = self.http_json(
                        "GET", f"/whip/publish/session/{urllib.parse.quote(self.session_id, safe='')}/ice"
                    )
                    response = json.loads(payload.decode("utf-8"))
                    for item in response.get("candidates", []):
                        self.webrtc.emit(
                            "add-ice-candidate",
                            int(item.get("sdpMLineIndex", 0)),
                            item.get("candidate", ""),
                        )
                except Exception:
                    pass

        self.poll_thread = threading.Thread(target=poll, daemon=True)
        self.poll_thread.start()

    def cleanup(self):
        self.poll_stop.set()
        self.stop_timer.set()
        if self.poll_thread is not None and self.poll_thread.is_alive():
            self.poll_thread.join(timeout=2)
        if self.timer_thread is not None and self.timer_thread.is_alive():
            self.timer_thread.join(timeout=2)
        if self.pipeline is not None:
            self.pipeline.set_state(Gst.State.NULL)
        if self.session_id:
            try:
                self.http_json("DELETE", f"/whip/publish/session/{urllib.parse.quote(self.session_id, safe='')}")
            except Exception:
                pass


def main():
    parser = argparse.ArgumentParser(description="Local WHIP publish test for media_server")
    parser.add_argument("--http-base", default="http://127.0.0.1:8081", help="media_server HTTP base URL")
    parser.add_argument("--source-id", default="publisher-demo", help="published WebRTC source id")
    parser.add_argument("--duration", type=int, default=20, help="publish duration in seconds (0 means until stopped)")
    args = parser.parse_args()

    publisher = WhipPublisher(args.http_base, args.source_id, args.duration)
    signal.signal(signal.SIGTERM, lambda *_: publisher.request_stop("SIGTERM"))
    signal.signal(signal.SIGINT, lambda *_: publisher.request_stop("SIGINT"))
    try:
        publisher.start()
        if publisher.negotiation_error:
            print(f"[publisher] failed: {publisher.negotiation_error}", file=sys.stderr)
            return 1
    except KeyboardInterrupt:
        publisher.cleanup()
        return 130
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        print(f"[publisher] HTTP error {exc.code}: {body}", file=sys.stderr)
        return 1
    except Exception as exc:  # noqa: BLE001
        print(f"[publisher] failed: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

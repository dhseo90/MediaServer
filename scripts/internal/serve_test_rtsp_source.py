#!/usr/bin/env python3
# 파일 용도: 로컬 샘플 파일을 RTSP test source로 제공하는 검증용 서버를 실행한다.

import argparse
import pathlib
import sys

import gi

gi.require_version("Gst", "1.0")
gi.require_version("GstRtspServer", "1.0")
from gi.repository import GLib, Gst, GstRtspServer


def build_video_branch(codec: str) -> str:
    if codec == "h265":
        return "demux.video_0 ! queue ! h265parse config-interval=-1 ! rtph265pay name=pay0 pt=96"
    return "demux.video_0 ! queue ! h264parse config-interval=-1 ! rtph264pay name=pay0 pt=96 config-interval=1"


def build_audio_branch(codec: str) -> str:
    if codec == "aac":
        return "demux.audio_0 ! queue ! aacparse ! rtpmp4gpay name=pay1 pt=97"
    if codec == "opus":
        return (
            "demux.audio_0 ! queue ! decodebin ! audioconvert ! audioresample "
            "! audio/x-raw,rate=48000,channels=1 ! opusenc ! rtpopuspay name=pay1 pt=97"
        )
    if codec == "pcmu":
        return (
            "demux.audio_0 ! queue ! decodebin ! audioconvert ! audioresample "
            "! audio/x-raw,rate=8000,channels=1 ! mulawenc ! rtppcmupay name=pay1 pt=0"
        )
    if codec == "pcma":
        return (
            "demux.audio_0 ! queue ! decodebin ! audioconvert ! audioresample "
            "! audio/x-raw,rate=8000,channels=1 ! alawenc ! rtppcmapay name=pay1 pt=8"
        )
    raise ValueError(f"unsupported audio codec: {codec}")


def build_launch(input_path: pathlib.Path, video_codec: str, audio_codec: str) -> str:
    return (
        f'( filesrc location="{input_path}" ! qtdemux name=demux '
        f"{build_video_branch(video_codec)} "
        f"{build_audio_branch(audio_codec)} "
        ")"
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Serve a local MP4 as a test RTSP source.")
    parser.add_argument("--port", required=True)
    parser.add_argument("--mount", required=True)
    parser.add_argument("--input", required=True)
    parser.add_argument("--video-codec", choices=["h264", "h265"], required=True)
    parser.add_argument("--audio-codec", choices=["aac", "opus", "pcmu", "pcma"], required=True)
    args = parser.parse_args()

    input_path = pathlib.Path(args.input).resolve()
    if not input_path.is_file():
        print(f"input not found: {input_path}", file=sys.stderr)
        return 1

    Gst.init(None)

    server = GstRtspServer.RTSPServer()
    server.set_address("127.0.0.1")
    server.set_service(str(args.port))

    factory = GstRtspServer.RTSPMediaFactory()
    factory.set_shared(True)
    factory.set_launch(build_launch(input_path, args.video_codec, args.audio_codec))

    mounts = server.get_mount_points()
    mounts.add_factory(args.mount, factory)
    server.attach(None)

    print(
        f"test rtsp source ready: rtsp://127.0.0.1:{args.port}{args.mount} "
        f"video={args.video_codec} audio={args.audio_codec}",
        flush=True,
    )
    GLib.MainLoop().run()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

# Development Guide

Korean detailed guide: [../development-guide.md](../development-guide.md)

## Requirements

| Area | Requirement |
| --- | --- |
| OS | macOS or Linux |
| Compiler/build | C++17, CMake 3.16+ |
| Media runtime | GStreamer 1.0, gst-rtsp-server, WebRTC plugins |
| Optional AI | ONNX Runtime, YOLO ONNX model, labels |
| Tools | Node.js, Python 3, ffmpeg/ffprobe, curl |

## Setup

```bash
./server.sh install
./server.sh build
```

`install` prepares local dependencies, optional ONNX Runtime assets, YOLO labels/models, and local environment files. It is not a lightweight command.

Build streaming-only mode without AI:

```bash
MEDIA_SERVER_ENABLE_AI=0 ./server.sh build
```

## Running

```bash
./server.sh start
./server.sh status
./server.sh urls
```

Open:

```text
http://127.0.0.1:8081/
```

Foreground logs:

```bash
./server.sh foreground
```

Stop:

```bash
./server.sh stop
```

## Authentication

The default auth mode is `MEDIA_SERVER_AUTH_MODE=auto`.

- If no users file or `admin.passwordHash` exists, the first browser visit opens `/setup`.
- There is no production default admin password.
- Test documents and automation use the shared test password `qweasd0-`.

## Common Checks

```bash
./server.sh build
./server.sh verify-script-inventory
./server.sh verify-code-comments
./server.sh verify-docs-links
./server.sh verify-actions-security
```

Use the full regression only when the change touches streaming, analysis, auth, or release behavior:

```bash
./server.sh test
```

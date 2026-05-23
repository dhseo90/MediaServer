# Media Server

[![Preflight](https://github.com/dhseo90/MediaServer/actions/workflows/preflight.yml/badge.svg?branch=main)](https://github.com/dhseo90/MediaServer/actions/workflows/preflight.yml)
[![Licensing and Artifact Guardrails](https://github.com/dhseo90/MediaServer/actions/workflows/licensing-artifact-guardrails.yml/badge.svg?branch=main)](https://github.com/dhseo90/MediaServer/actions/workflows/licensing-artifact-guardrails.yml)
[![Source Release](https://img.shields.io/badge/source--only%20release-v1.8.0-blue)](https://github.com/dhseo90/MediaServer/releases/tag/v1.8.0)

Media Server is a C++17 RTSP/WebRTC live stream relay. It can add YOLO/ONNX
video analytics overlays and rule/scenario live events when analytics are enabled.

The current product boundary is **live source onboarding, live source health, and
live VA event quality**. Long-term recording, VMS/NVR, playback/search, and
runtime/model bundle distribution are outside the default release scope.

- Korean documentation: [README.md](README.md)
- Documentation index: [docs/README.md](docs/README.md)
- Source-only release baseline: [v1.8.0](https://github.com/dhseo90/MediaServer/releases/tag/v1.8.0)
- v1.8.0 release close-out preparation: [docs/development-backlog.md](docs/development-backlog.md)

## At a Glance

- **Streaming**: exposes file, RTSP pull, WHEP pull, WHIP publish, and HTTP/HLS
  sources through RTSP and WebRTC/WHEP outputs.
- **Video analytics**: supports `va=1` overlays, saved rules through
  `vaRule=<id>`, Rule/Profile/Scenario models, live Event POST, and runtime
  metadata. EventRecord, snapshot, and clip hooks are short event evidence
  helpers, not the central product message.
- **Product UI**: routes users to Ops or Client views based on account
  permissions. There is no Lab product screen; lab endpoints remain available
  for API and verification workflows.
- **Auth and scopes**: supports first-admin setup, session login, role/scope,
  admin user management, and viewer invite/request approval.
- **Verification**: `./server.sh` provides UI/Auth smoke tests, VA replay checks,
  runtime state checks, backup/restore rehearsal, and RC gate artifact checks.
- **Distribution boundary**: the default public release contains source code and
  documentation. Binary, runtime, and model bundles are not published unless
  separate guardrails pass.

## Runtime Requirements

| Area | Requirement |
| --- | --- |
| OS | macOS or Linux |
| Build | C++17, CMake 3.16+ |
| Media runtime | GStreamer 1.0, gst-rtsp-server, WebRTC-related GStreamer plugins |
| Optional AI | ONNX Runtime, YOLO ONNX model, label file |
| Helper tools | Node.js, Python 3, FFmpeg/ffprobe, curl |
| Defaults | RTSP route `dhseo`, file root `video/` |

Exact local versions and model hashes are recorded in [DEPENDENCY_SNAPSHOT.md](DEPENDENCY_SNAPSHOT.md). Regenerate it before a release or binary bundle with:

```bash
./server.sh dependency-snapshot
```

The default binary bundle does not include FFmpeg, libav, x264/x265, or GStreamer GPL-risk plugin binaries. Check release bundles with:

```bash
./server.sh verify-bundle-policy --bundle-dir <release_bundle_dir>
```

Use `./server.sh test --basic --ffmpeg-free` when CI or public verification should avoid depending on the FFmpeg CLI.

## Quick Start

```bash
./server.sh install
./server.sh build
./server.sh start
./server.sh status
./server.sh urls
```

Open:

```text
http://127.0.0.1:8081/
```

Stop:

```bash
./server.sh stop
```

For foreground logs:

```bash
./server.sh foreground
```

If you only need the streaming path without AI:

```bash
MEDIA_SERVER_ENABLE_AI=0 ./server.sh build
```

The default auth mode is `MEDIA_SERVER_AUTH_MODE=auto`. If no users file or
`admin.passwordHash` exists, the first browser visit redirects to `/setup`.
There is no default production admin password.

## Sample and Asset Scope

Tracked `video/*.mp4` files and the allowlisted
`video/imports/va_tracking_event_1280x720_30fps_h264.mp4` are generated
verification fixtures. Customer media, operations evidence, YOLO model binaries,
FFmpeg/GStreamer runtime binaries, logs, and auth stores are not public
repository content.

See [docs/sample-fixture-provenance.md](docs/sample-fixture-provenance.md) for
fixture provenance and public-release decisions. English readers should start
from the consolidated [docs/en/README.md](docs/en/README.md).

## Documentation Guide

This README is the product overview. Detailed policies, verification history, and
release evidence live in dedicated docs.

- Full index: [docs/README.md](docs/README.md)
- Setup, build, and run: [docs/development-guide.md](docs/development-guide.md)
- Ops and Client UI: [docs/ui-guide.md](docs/ui-guide.md)
- RTSP/WebRTC/VA architecture:
  [docs/media-server-architecture.md](docs/media-server-architecture.md)
- Video analytics and scenarios: [docs/video-analysis.md](docs/video-analysis.md)
- Verification commands: [docs/stream-verification.md](docs/stream-verification.md)
- Release/version policy: [docs/release-policy.md](docs/release-policy.md),
  [docs/versioning-policy.md](docs/versioning-policy.md)
- v1.8.0 close-out preparation: [docs/development-backlog.md](docs/development-backlog.md)

## UI Preview

**Ops Home**

![Ops home](docs/assets/ui/en/ops-home.png)

**Ops Channels**

![Ops channels](docs/assets/ui/en/ops-channels.png)

**Ops Rules**

![Ops rules](docs/assets/ui/en/ops-rules.png)

**Rule Preview Editor**

![Rule preview editor](docs/assets/ui/en/ops-rules-preview.png)

**Ops Users**

![Ops users](docs/assets/ui/en/ops-users.png)

**Client Live**

![Client live](docs/assets/ui/en/client-live.png)

## Account Views

- First run, or an empty account store, opens the admin password setup view.
- `admin` and `operator` users see Ops screens for channels, rules, users, and diagnostics.
- `viewer` users see only assigned Client screens. Raw source URLs, internal diagnostic JSON, and rule/profile editors are not exposed.
- `integrator` is intended for scoped API integration rather than daily UI operation.

## Testing Summary

Broad default regression:

```bash
./server.sh test
```

For documentation or release metadata changes, start with the fast checks:

```bash
git diff --check
./server.sh verify-release-metadata
./server.sh verify-docs-links
```

Release-local baseline:

```bash
./server.sh test --full
```

See [docs/stream-verification.md](docs/stream-verification.md) for UI/Auth/VA,
longrun, and release gate commands. Do not put real customer URLs, credentials,
or operation media paths into docs or artifacts.

## Pipeline

```text
File / RTSP Pull / WHEP Pull / WHIP Publish / HTTP-HLS URI
        -> Media Server
        -> RTSP Output / WebRTC Output
        -> optional VA overlay / rule events / scenario events / runtime metadata
```

VA flow:

```text
YOLO Detection
  -> Direction-Based Tracker
  -> TrackStateManager
  -> SceneContextBuilder
  -> RuleEventEngine / ScenarioEngine
  -> EventManager
  -> Overlay / Runtime Metadata / Event POST / EventRecord
```

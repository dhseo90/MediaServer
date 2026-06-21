# Media Server

[![Preflight](https://github.com/dhseo90/MediaServer/actions/workflows/preflight.yml/badge.svg?branch=main)](https://github.com/dhseo90/MediaServer/actions/workflows/preflight.yml)
[![Licensing and Artifact Guardrails](https://github.com/dhseo90/MediaServer/actions/workflows/licensing-artifact-guardrails.yml/badge.svg?branch=main)](https://github.com/dhseo90/MediaServer/actions/workflows/licensing-artifact-guardrails.yml)
[![Published Release](https://img.shields.io/badge/published-v3.0.0-blue)](https://github.com/dhseo90/MediaServer/releases/tag/v3.0.0)
![Source Version](https://img.shields.io/badge/source-3.1.0-informational)

Media Server is a C++17 RTSP/WebRTC live stream relay. It can add YOLO/ONNX
video analytics overlays and rule/scenario live events when analytics are enabled.

The current product boundary is **live source onboarding, live source health, and
live VA event quality**. Long-term recording, VMS/NVR, playback/archive search,
and runtime/model bundle distribution are outside the default public release.

- Korean documentation: [README.md](README.md)
- Documentation index: [docs/README.md](docs/README.md)
- Latest published GitHub Release: [v3.0.0](https://github.com/dhseo90/MediaServer/releases/tag/v3.0.0)
- Current source version: `3.1.0`
- v3.0.0 public status: source-only GitHub Release. Binary, runtime, and model bundles are not included.
- Current source roadmap: `v3.1.0 Encoded Event Clip and Safe Sharing Expansion`

## At a Glance

- **Live relay**: exposes file, RTSP pull, WHEP pull, WHIP publish, and HTTP/HLS
  sources through RTSP and WebRTC/WHEP outputs.
- **Product UI**: `/ops` is the operator console, `/client` is the viewer live
  surface, and `/lab/analysis/*` is for verification/integration APIs.
- **Video analytics**: supports `va=1` overlays, saved rules through
  `vaRule=<id>`, Rule/Profile/Scenario models, live Event POST, and runtime metadata.
- **Incident memory**: the current source tree projects EventRecord, audit, source
  health, and alert dry-run data into `/ops/events` search, timelines, explainable
  briefs, and similar-incident lookup.
- **Out of scope**: VMS/NVR, long-term recording, broad archive playback/search, VLM
  default-on, model/runtime bundle distribution, and guaranteed real-device or
  external-provider success are not included in the default public release.

## v3.1 Encoded Event Clip And Safe Sharing Baseline

Latest published version `3.0.0` is the Event Evidence Search MVP source-only
GitHub Release. The current `3.1.0` source tree publishes the v3.1 Encoded Event
Clip and Safe Sharing Expansion source-of-truth baseline. The current source tree
includes V310-S01 encoded event clip contract docs, fixture, and verifier
evidence. The encoder pipeline, replay timeline, client-safe digest, scoped
integrator API, operator correction, optional vector search, and retention/export
hardening are complete only after their own V310 code/UI/API/verifier evidence
exists.

The primary v3.1 choice is `Encoded Event Clip and Safe Sharing Expansion`. The
fallback is `Encoded Clip Foundation`; safe sharing/API/correction/vector work is
promoted only with step-level evidence. Existing Event POST, WebRTC DataChannel,
SSE/WS metadata schemas, and RTSP/WebRTC media paths remain unchanged unless
explicitly requested.

The 2.x runway is intentionally narrow: `2.8.0` is for action readiness under
existing contracts, `2.9.0` is the final stabilization and 3.0 transition release,
and `3.0.0` is the line for approved major route/API/config/schema, storage,
auth/scope, and media-path changes.

Model recommendation is based on both PC capability and privacy mode. The current
baseline is `Qwen/Qwen3-VL-8B-Instruct` for local standard hardware,
`Qwen/Qwen3-VL-4B-Instruct` as the low-spec fallback,
`Qwen/Qwen3-VL-30B-A3B-Instruct` as a high-tier evaluation candidate, and
`gemini-2.5-flash` as the explicit cloud opt-in fallback. Real model/runtime
installation, guaranteed cloud provider success, model/runtime bundle
distribution, and default-on promotion are outside the default release.

Related docs:

- Model selection: [docs/vlm-model-selection.md](docs/vlm-model-selection.md)
- PC-based recommendation engine: [docs/vlm-recommendation-engine.md](docs/vlm-recommendation-engine.md)
- Install/connection dry-run: [docs/vlm-install-connection-dry-run.md](docs/vlm-install-connection-dry-run.md)
- Ops review UI flow: [docs/vlm-ops-event-review-ui.md](docs/vlm-ops-event-review-ui.md)

## Runtime Requirements

| Area | Requirement |
| --- | --- |
| OS | macOS or Linux |
| Build | C++17, CMake 3.16+ |
| Media runtime | GStreamer 1.0, gst-rtsp-server, WebRTC-related GStreamer plugins |
| Optional AI | ONNX Runtime, YOLO ONNX model, label file |
| Helper tools | Node.js, Python 3, FFmpeg/ffprobe, curl |
| Defaults | RTSP route `dhseo`, file root `video/` |

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

This README is the product overview. Detailed policies and internal verification
records live in dedicated docs.

- Full index: [docs/README.md](docs/README.md)
- Setup, build, and run: [docs/development-guide.md](docs/development-guide.md)
- Ops and Client UI: [docs/ui-guide.md](docs/ui-guide.md)
- RTSP/WebRTC/VA architecture:
  [docs/media-server-architecture.md](docs/media-server-architecture.md)
- Video analytics and scenarios: [docs/video-analysis.md](docs/video-analysis.md)
- Verification commands: [docs/stream-verification.md](docs/stream-verification.md)
- Release/version policy: [docs/release-policy.md](docs/release-policy.md),
  [docs/versioning-policy.md](docs/versioning-policy.md)
- Release roadmap/archive: [docs/development-backlog.md](docs/development-backlog.md)
- Latest published release notes: [v3.0.0](https://github.com/dhseo90/MediaServer/releases/tag/v3.0.0)
- Current source roadmap: `v3.0.0 Event Evidence Search MVP` in
  [docs/development-backlog.md](docs/development-backlog.md)

## UI Preview

These images are documentation preview assets. They are not UI fulltest PASS
evidence, GitHub Release publish evidence, or a replacement for current UI review.
The Public docs/assets baseline is managed by `config/docs_ui_assets.json` and
`./server.sh verify-docs-ui-assets`. The S07 public docs/assets refresh keeps the
current representative screenshots; replacing images requires direct image review
plus link/asset verification and a separate record.

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

After publishing a GitHub Release, run `./server.sh verify-release-metadata --published`
to check GitHub Latest Release and the remote tag.

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

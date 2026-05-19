# Media Server

[![Preflight](https://github.com/dhseo90/MediaServer/actions/workflows/preflight.yml/badge.svg?branch=main)](https://github.com/dhseo90/MediaServer/actions/workflows/preflight.yml)
[![Licensing and Artifact Guardrails](https://github.com/dhseo90/MediaServer/actions/workflows/licensing-artifact-guardrails.yml/badge.svg?branch=main)](https://github.com/dhseo90/MediaServer/actions/workflows/licensing-artifact-guardrails.yml)
[![Source Release](https://img.shields.io/badge/source--only%20release-v1.5.0-blue)](https://github.com/dhseo90/MediaServer/releases/tag/v1.5.0)

Media Server is a C++17 RTSP/WebRTC live stream relay with optional YOLO/ONNX video analytics overlays and rule/scenario live events. The current main product boundary focuses on live source onboarding, live source health, and live VA event quality rather than long-term recording, VMS, or NVR scope.

Korean documentation: [README.md](README.md)
Latest source-only release: [v1.5.0](https://github.com/dhseo90/MediaServer/releases/tag/v1.5.0)
The v1.5.0 source-only minor close-out and tracker/Re-ID opt-in stabilization follow-up closure are tracked separately in
[docs/development-backlog.md](docs/development-backlog.md) and
[docs/v1.5.0-follow-up-closure.md](docs/v1.5.0-follow-up-closure.md).
The v1.6.0 stabilization release evidence dashboard separates confirmed,
not-run, and unverified checks in
[docs/v1.6.0-release-evidence-dashboard.md](docs/v1.6.0-release-evidence-dashboard.md);
verify it with `./server.sh verify-v160-release-evidence-dashboard`.

## At a Glance

- **Streaming**: exposes file, RTSP pull, WHEP pull, WHIP publish, and HTTP/HLS sources through RTSP and WebRTC/WHEP outputs.
- **Video analytics**: supports `va=1` overlays, saved rules through `vaRule=<id>`, Rule/Profile/Scenario models, live Event POST, and runtime metadata. EventRecord, snapshot, and clip hooks are short event evidence helpers, not the central product message.
- **Product UI**: the main URL routes users to Ops or Client views based on account permissions. `/lab` UI routes stay disabled; lab endpoints remain available for API and verification workflows.
- **Auth and scopes**: supports first-admin setup, session login, role/scope, admin user management, and viewer invite/request approval.
- **Verification**: `./server.sh` provides UI/Auth smoke tests, VA replay checks, runtime state checks, backup/restore rehearsal, and RC gate artifact checks.
- **Distribution boundary**: the default public release contains source code and documentation. Binary, runtime, and model bundles are not published unless separate guardrails pass.

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

The default auth mode is `MEDIA_SERVER_AUTH_MODE=auto`. If no users file or `admin.passwordHash` exists, the first browser visit redirects to `/setup`. There is no default production admin password.

## Sample and Asset Scope

Tracked `video/*.mp4` files and the allowlisted `video/imports/va_tracking_event_1280x720_30fps_h264.mp4` are generated verification fixtures. Customer media, operations evidence, YOLO model binaries, FFmpeg/GStreamer runtime binaries, logs, and auth stores are not public repository content.

See [docs/sample-fixture-provenance.md](docs/sample-fixture-provenance.md) for fixture provenance and public-release decisions. English readers should start from the consolidated [docs/en/README.md](docs/en/README.md).

## Documentation Map

| Need | Document |
| --- | --- |
| English documentation index | [docs/en/README.md](docs/en/README.md) |
| Setup, build, foreground/background execution | [docs/development-guide.md](docs/development-guide.md) |
| Auth, Ops, Client UI flow | [docs/ui-guide.md](docs/ui-guide.md) |
| RTSP/WebRTC pipeline, source/session, VA layer | [docs/media-server-architecture.md](docs/media-server-architecture.md) |
| YOLO, tracking, scenarios, live events, short evidence | [docs/video-analysis.md](docs/video-analysis.md) |
| Re-ID default-off research continuation | [docs/reid-default-off-research-continuation.md](docs/reid-default-off-research-continuation.md) |
| OC-SORT benchmark/sandbox boundary | [docs/oc-sort-benchmark-boundary.md](docs/oc-sort-benchmark-boundary.md) |
| BoT-SORT/DeepSORT research boundary | [docs/bot-sort-deepsort-research-boundary.md](docs/bot-sort-deepsort-research-boundary.md) |
| Integrator Event/WebRTC/SSE/WS sample bundle | [docs/integrator-contract-artifact.md](docs/integrator-contract-artifact.md) |
| Current product boundary, v1.5.0 close-out, v1.6.0 stabilization roadmap, and separate phase candidates | [docs/development-backlog.md](docs/development-backlog.md) |
| Historical v1.2.1 follow-up closure | [docs/v1.2.1-follow-up-closure.md](docs/v1.2.1-follow-up-closure.md) |
| v1.3.0 follow-up closure | [docs/v1.3.0-follow-up-closure.md](docs/v1.3.0-follow-up-closure.md) |
| v1.4.0 follow-up closure | [docs/v1.4.0-follow-up-closure.md](docs/v1.4.0-follow-up-closure.md) |
| v1.5.0 follow-up closure | [docs/v1.5.0-follow-up-closure.md](docs/v1.5.0-follow-up-closure.md) |
| v1.6.0 release evidence dashboard | [docs/v1.6.0-release-evidence-dashboard.md](docs/v1.6.0-release-evidence-dashboard.md) |
| Verification commands and release checks | [docs/stream-verification.md](docs/stream-verification.md) |
| Bundle/container/runtime distribution policy | [docs/distribution-policy.md](docs/distribution-policy.md) |
| Release scope and tag strategy | [docs/release-policy.md](docs/release-policy.md) |
| Version meaning and tag rules | [docs/versioning-policy.md](docs/versioning-policy.md) |
| Final private-to-public checklist | [docs/public-repo-final-review.md](docs/public-repo-final-review.md) |
| Backup and restore operations | [docs/ops-backup-recovery.md](docs/ops-backup-recovery.md) |
| Starting thresholds for field scenarios | [docs/analysis-threshold-baselines.md](docs/analysis-threshold-baselines.md) |
| YouTube import/source experiment | [docs/youtube-import.md](docs/youtube-import.md) |
| Historical manual UI v1.2.1 evidence | [docs/manual-ui-v1.2.1-result.md](docs/manual-ui-v1.2.1-result.md) |
| ONVIF no-device and field-smoke boundary | [docs/onvif-no-device-verification.md](docs/onvif-no-device-verification.md) |
| Re-ID warning/default-on boundary | [docs/reid-fixture-default-on-candidates.md](docs/reid-fixture-default-on-candidates.md) |

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

Default regression:

```bash
./server.sh test
```

Fast public/document/UI/auth checks:

```bash
./server.sh build
git diff --check -- README.md README.en.md NOTICE THIRD_PARTY_NOTICES.md DEPENDENCY_SNAPSHOT.md .github config docs scripts src include
./server.sh verify-script-inventory
./server.sh verify-code-comments
./server.sh verify-release-metadata
./server.sh verify-docs-links
./server.sh verify-docs-ui-assets
./server.sh verify-manual-ui-evidence
./server.sh verify-actions-security
./server.sh write-dependency-notice --check
./server.sh verify-public-repo-readiness --report /tmp/media_server_public_repo_readiness.md
./server.sh verify-post-release-reconciliation
./server.sh verify-release-closeout-helper --dry-run --report /tmp/media_server_release_closeout_helper.md
./server.sh dependency-snapshot --stable --output /tmp/media_server_dependency_snapshot.md --no-linked-libs
./server.sh verify-bundle-policy --output /tmp/media_server_bundle_policy.md --json-output /tmp/media_server_bundle_policy.json
./server.sh verify-release-bundle-dry-run
./server.sh source-offer-checklist --stable --bundle-policy-report /tmp/media_server_bundle_policy.json
```

UI smoke commands that attach to a running server:

```bash
MEDIA_SERVER_AUTH_MODE=off ./server.sh foreground
./server.sh verify-ops-client-ui
./server.sh verify-ops-click-e2e
./server.sh verify-ops-tables-layout
./server.sh verify-rule-ui
./server.sh verify-ops-rules-roundtrip
```

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

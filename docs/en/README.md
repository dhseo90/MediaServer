# English Documentation

This is the English entry point for Media Server. The detailed documentation is
maintained in Korean under `docs/`; this page keeps the English path short and
points to the current public sources.

## Current Status

- Latest published GitHub Release: [v4.0.0](https://github.com/dhseo90/MediaServer/releases/tag/v4.0.0)
- Latest published baseline: `v4.0.0 Local Operations Policy and Stabilization`
- Previous published baseline: `v3.9.1 Release Correctness and Public Repository Hygiene`
- Current source version: `4.0.0`
- v4.0.0 public status: source-only GitHub Release. Binary, runtime, and model bundles are not included.
- Current source roadmap: `v4.0.0 Local Operations Policy and Stabilization`
- Next source development roadmap: `v4.1.0` new-feature candidates. Not implemented in 4.0.0
- Default public distribution: source-only
- Representative screenshots were recaptured on 2026-08-31 for source `4.0.0` /
  published `v4.0.0`, using the v3.8.0 uncropped composition. They are managed
  by `config/docs_ui_assets.json` and `./server.sh verify-docs-ui-assets`. They
  are not UI fulltest or GitHub Release evidence. Policy and English PNG review
  notes live in [../assets/ui/README.md](../assets/ui/README.md).

## Start Here

| Need | Document |
| --- | --- |
| Product overview | [../../README.en.md](../../README.en.md) |
| Korean product overview | [../../README.md](../../README.md) |
| Full documentation index | [../README.md](../README.md) |
| Setup, build, and run | [../development-guide.md](../development-guide.md) |
| Configuration | [../config-reference.md](../config-reference.md) |
| Ops and Client UI | [../ui-guide.md](../ui-guide.md) |
| RTSP/WebRTC/VA architecture | [../media-server-architecture.md](../media-server-architecture.md) |
| Video analytics and scenarios | [../video-analysis.md](../video-analysis.md) |
| Verification commands | [../stream-verification.md](../stream-verification.md) |
| Release/version policy | [../release-policy.md](../release-policy.md), [../versioning-policy.md](../versioning-policy.md) |
| Current roadmap summary | [../development-backlog.md](../development-backlog.md) |

## Product Boundary

- The main product boundary is live source onboarding, live source health, and
  live VA event quality.
- The current source tree tracks the `v4.0.0 Local Operations Policy and Stabilization`
  roadmap. Latest published is `v4.0.0`. v3.9.1 remains the previous published baseline.
- Binary, runtime, and model bundles are excluded from the default public release.
- Long-term recording, VMS/NVR, playback/archive search, ONVIF Profile G
  recording/replay, Re-ID default-on, tracker default-on, and VLM default-on
  remain out of scope.
- Real cloud provider calls, external TURN/WHEP credential operations, and real
  ONVIF device success are not default release PASS evidence.

## Verification Entry Points

Use these commands for documentation-oriented checks:

```bash
git diff --check
./server.sh verify-docs-links
./server.sh verify-docs-ui-assets
./server.sh verify-release-metadata
```

`./server.sh verify-release-metadata --published` is only for a real GitHub
Release publish check. It should not be used to claim UI fulltest, 30-minute,
or 120-minute coverage unless those test areas were actually executed.

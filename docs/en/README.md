# English Documentation

This is the English entry point for Media Server. The detailed documentation is
maintained in Korean under `docs/`; this page keeps the English path short and
points to the current public sources.

## Current Status

- Latest published GitHub Release: [v3.8.0](https://github.com/dhseo90/MediaServer/releases/tag/v3.8.0)
- Latest published baseline: `v3.8.0 Operator-Gated Action Pilot & Outcome Loop`
- Previous published baseline: `v3.7.0 Site-Aware Operations and Safe Runbook Control Plane`
- Current source version: `3.9.0`
- v3.9.0 preparation status: source-only preparation branch. Binary, runtime, and model bundles are not included.
- Current source roadmap: `v3.9.0 Feature Completion, Structure Stabilization, and Test Model Preparation`
- Default public distribution: source-only
- Public docs/assets baseline: `README.md`, `README.en.md`, `docs/README.md`,
  `docs/en/README.md`, `docs/ui-guide.md`, and `docs/assets/ui/README.md`
  separate the v3.9 source roadmap from the latest published v3.8 baseline while
  keeping the v3.7 baseline as historical reference. Representative
  screenshots are managed by `config/docs_ui_assets.json` and
  `./server.sh verify-docs-ui-assets`; replacements require a separate direct
  image review record.

## v3.9 Source Roadmap

- Latest published release: `v3.8.0` Operator-Gated Action Pilot & Outcome Loop, source-only.
- Current source: `3.9.0` Feature Completion, Structure Stabilization, and Test Model Preparation.
- The v3.9 roadmap audits exposed, promised, and partially implemented functionality from v1.0.0 through v3.8.0, completes necessary feature gaps before v4.0.0, then prepares structure stabilization and the new test model.
- Latest published baseline: v3.8.0 Operator-Gated Action Pilot & Outcome Loop. v3.9.0 is a preparation branch with no publish evidence yet.

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
- The current source tree tracks the `v3.9.0 Feature Completion, Structure Stabilization, and Test Model Preparation`
  roadmap baseline. Feature completion still requires the corresponding v3.9
  code/UI/API/verifier evidence.
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

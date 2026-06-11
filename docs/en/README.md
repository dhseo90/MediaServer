# English Documentation

This is the English entry point for Media Server. The detailed source-of-truth
documents are maintained in Korean under `docs/`; this page keeps the English
path short enough to scan. The full index is `docs/README.md`.

## Start Here

| Need | Document |
| --- | --- |
| Product overview | [../../README.en.md](../../README.en.md) |
| Full documentation index | [../README.md](../README.md) |
| Setup, build, and run | [../development-guide.md](../development-guide.md) |
| Ops and Client UI | [../ui-guide.md](../ui-guide.md) |
| RTSP/WebRTC/VA architecture | [../media-server-architecture.md](../media-server-architecture.md) |
| Video analytics and scenarios | [../video-analysis.md](../video-analysis.md) |
| Verification commands | [../stream-verification.md](../stream-verification.md) |
| Release/version policy | [../release-policy.md](../release-policy.md), [../versioning-policy.md](../versioning-policy.md) |

## Current Boundary

- Latest published release: [v2.3.0](https://github.com/dhseo90/MediaServer/releases/tag/v2.3.0).
- Current release target: [v2.4.0](https://github.com/dhseo90/MediaServer/releases/tag/v2.4.0).
- v2.4.0 active roadmap is tracked in
  [../development-backlog.md](../development-backlog.md).
- v2.3.0 completed roadmap is tracked in
  [../development-backlog.md](../development-backlog.md) as Operational Evidence
  & Contract Baseline.
- The main product boundary is live source onboarding, live source health, and
  live VA event quality.
- v2.4.0 keeps the stability, 30-minute, 120-minute, and UI fulltest areas as
  the only test areas. Field/provider/longrun triggers are recorded inside those
  areas or as exclusions, not as a fifth test category.
- v2.3.0 S02 evidence consistency is checked by
  `./server.sh verify-v230-test-evidence-consistency`; it does not execute
  30-minute, 120-minute, or UI fulltest runs.
- Binary, runtime, and model bundles are excluded from the default release.
- Long-term recording, VMS/NVR, playback/search, ONVIF Profile G
  recording/replay, Re-ID default-on, and tracker default-on remain out of scope.

v2.3.0 branch-level close-out evidence and historical in-app browser UI
fulltest summaries are tracked in
[../release-evidence-index.md](../release-evidence-index.md).
Script stability, 30-minute soak, UI fulltest, and 120-minute longrun evidence do
not replace one another. Real cloud provider calls, external TURN field gates,
and VLM model/runtime bundles remain outside the default v2.4.0 target evidence.

v2.4.0 active roadmap details are in [../development-backlog.md](../development-backlog.md).
For the v2.4.0 documentation baseline, UI preview images are
documentation assets only. QA-registry-heavy recaptures, unapproved Chrome/CDP
fallback captures, and screenshot-only artifacts are not promoted to
representative images or UI fulltest evidence without in-app browser review.

## Public Repository Boundary

- Public content: Apache-2.0 source, documentation, configuration examples,
  scripts, and allowlisted generated fixtures.
- Excluded content: runtime binaries, YOLO model binaries, customer media,
  operations evidence, local auth stores, credentials, and logs.
- Repository visibility changes are owner-only operations.

## Verification Entry Points

```bash
./server.sh verify-docs-links
./server.sh verify-release-metadata
./server.sh verify-v230-test-evidence-consistency
./server.sh verify-manual-ui-evidence
./server.sh verify-public-repo-readiness --report /tmp/media_server_public_repo_readiness.md
./server.sh verify-bundle-policy --output /tmp/media_server_bundle_policy.md --json-output /tmp/media_server_bundle_policy.json
```

The full verification list is maintained in [../stream-verification.md](../stream-verification.md).
Published release metadata is checked with `./server.sh verify-release-metadata --published`.

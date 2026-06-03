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

- v2.1.0 is the latest published source-only release target:
  <https://github.com/dhseo90/MediaServer/releases/tag/v2.1.0>.
- v2.1.0 release close-out is tracked in
  [../development-backlog.md](../development-backlog.md).
- v2.2.0 active roadmap is tracked in
  [../development-backlog.md](../development-backlog.md) as Responsive UI
  Foundation.
- The main product boundary is live source onboarding, live source health, and
  live VA event quality.
- Binary, runtime, and model bundles are excluded from the default release.
- Long-term recording, VMS/NVR, playback/search, ONVIF Profile G
  recording/replay, Re-ID default-on, and tracker default-on remain out of scope.

v2.1.0 branch-level close-out evidence is tracked in
[../release-evidence-index.md](../release-evidence-index.md). The 2026-06-03
in-app browser UI fulltest result is tracked in
[../manual-ui-result-2026-06-03-v210-inapp-fulltest.md](../manual-ui-result-2026-06-03-v210-inapp-fulltest.md).
Script stability, 30-minute soak, UI fulltest, and 120-minute longrun evidence do
not replace one another. Real cloud provider calls, external TURN field gates,
and VLM model/runtime bundles remain outside the v2.1.0 completion evidence.

v2.1.0 release close-out details are in [../development-backlog.md](../development-backlog.md).
For the active v2.2.0 documentation baseline, UI preview images are
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
./server.sh verify-manual-ui-evidence --result docs/manual-ui-result-2026-05-25-ui-fulltest-restart.md
./server.sh verify-public-repo-readiness --report /tmp/media_server_public_repo_readiness.md
./server.sh verify-bundle-policy --output /tmp/media_server_bundle_policy.md --json-output /tmp/media_server_bundle_policy.json
```

The full verification list is maintained in [../stream-verification.md](../stream-verification.md).
Published release metadata is checked with `./server.sh verify-release-metadata --published`.

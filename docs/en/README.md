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

- v1.6.0 is published as the current source-only release.
- The main product boundary is live source onboarding, live source health, and
  live VA event quality.
- Binary, runtime, and model bundles are excluded from the default release.
- Long-term recording, VMS/NVR, playback/search, ONVIF Profile G
  recording/replay, Re-ID default-on, and tracker default-on remain out of scope.

v1.6.0 release close-out details are in [../development-backlog.md](../development-backlog.md)
and [../v1.6.0-release-evidence-dashboard.md](../v1.6.0-release-evidence-dashboard.md).

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
./server.sh verify-public-repo-readiness --report /tmp/media_server_public_repo_readiness.md
./server.sh verify-bundle-policy --output /tmp/media_server_bundle_policy.md --json-output /tmp/media_server_bundle_policy.json
```

The full verification list is maintained in [../stream-verification.md](../stream-verification.md).

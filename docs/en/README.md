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

- v1.9.0 is the current source-only release baseline for release preparation.
- The main product boundary is live source onboarding, live source health, and
  live VA event quality.
- Binary, runtime, and model bundles are excluded from the default release.
- Long-term recording, VMS/NVR, playback/search, ONVIF Profile G
  recording/replay, Re-ID default-on, and tracker default-on remain out of scope.

v1.9.0 branch-level close-out evidence is tracked in
[../release-evidence-index.md](../release-evidence-index.md). The previous
manual UI result remains historical evidence until the current release UI gate
is rerun or explicitly recorded as not-run. The 120-minute longrun, main merge,
release tag, and GitHub Release publish gate are still not-run manual close-out
steps.

Latest v2.0.0 test evidence is tracked in
[../release-evidence-index.md](../release-evidence-index.md) and
[../v200-test-record-2026-05-31.md](../v200-test-record-2026-05-31.md).
As of 2026-06-01, the stability test, 30-minute soak, in-app browser UI
fulltest, and 120-minute predev longrun each have separate PASS evidence. They
do not replace one another. `verify-va-runtime-console-longrun --duration-minutes
120`, real cloud provider calls, external TURN field gates, main merge, release
tagging, and GitHub Release publishing are still separate not-run gates.

v1.9.0 release close-out preparation details are in [../development-backlog.md](../development-backlog.md).

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
After the tag and GitHub Release are published, run
`./server.sh verify-release-metadata --published`.

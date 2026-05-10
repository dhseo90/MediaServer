# English Documentation

This directory contains concise English guides for the public documentation set. The Korean documents remain the detailed working reference, and each English page links back to its Korean counterpart when useful.

## Start Here

| Need | English document |
| --- | --- |
| Project overview | [../../README.en.md](../../README.en.md) |
| Setup and development | [development-guide.md](./development-guide.md) |
| UI and account views | [ui-guide.md](./ui-guide.md) |
| Architecture | [media-server-architecture.md](./media-server-architecture.md) |
| Video analytics | [video-analysis.md](./video-analysis.md) |
| v1.1.0 live-only roadmap | [v1.1.0-roadmap.md](./v1.1.0-roadmap.md) |
| v1.1.0 alpha.1 live-only checklist | [../v1.1.0-alpha1-checklist.md](../v1.1.0-alpha1-checklist.md) |
| v1.1.0 live-only glossary | [../v1.1.0-glossary.md](../v1.1.0-glossary.md) |
| Verification | [stream-verification.md](./stream-verification.md) |
| Distribution policy | [distribution-policy.md](./distribution-policy.md) |
| Release policy | [release-policy.md](./release-policy.md) |
| Versioning policy | [versioning-policy.md](./versioning-policy.md) |
| Public repo checklist | [public-repo-final-review.md](./public-repo-final-review.md) |
| Backup and restore | [ops-backup-recovery.md](./ops-backup-recovery.md) |
| Scenario thresholds | [analysis-threshold-baselines.md](./analysis-threshold-baselines.md) |
| Backlog | [development-backlog.md](./development-backlog.md) |
| Sample fixture provenance | [sample-fixture-provenance.md](./sample-fixture-provenance.md) |
| YouTube import experiment | [youtube-import.md](./youtube-import.md) |

## Public Repository Boundary

- The public repository includes Apache-2.0 source code, documentation, configuration examples, scripts, and allowlisted generated fixtures.
- Runtime binaries, YOLO model binaries, customer media, operations evidence, local auth stores, and logs are excluded.
- Only the repository owner should change repository visibility.

## v1.1.0 Product Boundary

- v1.1.0 targets live operations: ONVIF-assisted live source onboarding, live source health, and live VA event quality.
- It does not expand Media Server into long-term recording, VMS/NVR, playback/search, or ONVIF Profile G recording/replay scope.
- EventRecord, snapshot, and clip hooks remain short event evidence or diagnostics helpers unless a later phase changes the product boundary.

## Verification Entry Points

```bash
./server.sh verify-docs-links
./server.sh verify-actions-security
./server.sh verify-public-repo-readiness --report /tmp/media_server_public_repo_readiness.md
./server.sh verify-bundle-policy --output /tmp/media_server_bundle_policy.md --json-output /tmp/media_server_bundle_policy.json
```

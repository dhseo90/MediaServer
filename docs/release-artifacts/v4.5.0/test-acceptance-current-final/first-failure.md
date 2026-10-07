# v3.9.0 Acceptance First Failure

schema: media-server.v390-acceptance-first-failure.v1
recordedAt: 2026-10-07T05:20:55.693Z
runId: v390-test-acceptance-20261007051606-99926
sourceCommitSha: 7f2448bcd4de90e69559cbd8786ac56f420ba4a0
failedStage: feature-gates
testcaseId: docs-ui-assets
error: [pass] English README uses English UI screenshots | [pass] UI guide keeps product screenshots in the shared asset set | [pass] docs UI asset policy documents capture rules | [fail] managed UI asset manifest stays complete: docs UI asset manifest source version drifted | [pass] capture script owns every documented UI asset | [pass] docs capture covers current screenshots | [pass] representative screenshot docs do not point at stale visual baselines | [pass] docs UI asset directory contains managed PNG files | [pass] VA documentation images keep full video frame bounds | == Docs UI asset verification summary == | - pass: 9 | - fail: 1
logPath: /Users/dhseo/Workspace/mediaServer/docs/release-artifacts/v4.5.0/test-acceptance-current-final/runs/v390-test-acceptance-20261007051606-99926/feature-gates-30-docs-ui-assets.log
failedCommand: ./server.sh verify-docs-ui-assets
reproductionCommand: ./test_release.sh
context: [pass] English README uses English UI screenshots | [pass] UI guide keeps product screenshots in the shared asset set | [pass] docs UI asset policy documents capture rules | [fail] managed UI asset manifest stays complete: docs UI asset manifest source version drifted | [pass] capture script owns every documented UI asset | [pass] docs capture covers current screenshots | [pass] representative screenshot docs do not point at stale visual baselines | [pass] docs UI asset directory contains managed PNG files | [pass] VA documentation images keep full video frame bounds | == Docs UI asset verification summary == | - pass: 9 | - fail: 1
childFailurePhase: not-recorded
childFailureCase: not-recorded
childCleanupStatus: not-recorded

## Diagnostic artifact snapshots

### /Users/dhseo/Workspace/mediaServer/docs/release-artifacts/v4.5.0/test-acceptance-current-final/runs/v390-test-acceptance-20261007051606-99926/feature-gates-30-docs-ui-assets.log

bytes: 682
sha256: edb925e0d9b3659d3d4c95c333768ea227b348e619b4635fa4d4a84f7416ecbe

```text
[pass] README uses only representative product UI screenshots
[pass] English README uses English UI screenshots
[pass] UI guide keeps product screenshots in the shared asset set
[pass] docs UI asset policy documents capture rules
[fail] managed UI asset manifest stays complete: docs UI asset manifest source version drifted
[pass] capture script owns every documented UI asset
[pass] docs capture covers current screenshots
[pass] representative screenshot docs do not point at stale visual baselines
[pass] docs UI asset directory contains managed PNG files
[pass] VA documentation images keep full video frame bounds
== Docs UI asset verification summary ==
- pass: 9
- fail: 1
```

# v3.9.0 Acceptance First Failure

schema: media-server.v390-acceptance-first-failure.v1
recordedAt: 2026-08-13T21:28:16.844Z
runId: v390-test-acceptance-20260813175844-9840
sourceCommitSha: 08ad8b3ee70391be84cdf21de07215ec7ce0f070
failedStage: final-integrity
testcaseId: final-integrity
error: [pass] canonical artifacts contain no duplicate screenshots or video placeholders | [pass] top-level cleanup is measured | [pass] actual child evidence uses measured cleanup | == v3.9.0 final evidence integrity summary == | - summary: /Users/dhseo/Workspace/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/summary.json | - executionMode: actual | - finalEvidenceEligible: true | - uiFulltestPass: true | - qualifiedCaseCount: 424 | - sourceCommitSha: 08ad8b3ee70391be84cdf21de07215ec7ce0f070 | - pass: 11 | - fail: 1
logPath: /Users/dhseo/Workspace/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260813175844-9840/final-integrity.log
failedCommand: ./server.sh verify-v390-final-evidence-integrity --summary /Users/dhseo/Workspace/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/summary.json
reproductionCommand: ./test_release.sh
context: [pass] canonical artifacts contain no duplicate screenshots or video placeholders | [pass] top-level cleanup is measured | [pass] actual child evidence uses measured cleanup | == v3.9.0 final evidence integrity summary == | - summary: /Users/dhseo/Workspace/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/summary.json | - executionMode: actual | - finalEvidenceEligible: true | - uiFulltestPass: true | - qualifiedCaseCount: 424 | - sourceCommitSha: 08ad8b3ee70391be84cdf21de07215ec7ce0f070 | - pass: 11 | - fail: 1
childFailurePhase: not-recorded
childFailureCase: not-recorded
childCleanupStatus: not-recorded

## Diagnostic artifact snapshots

### /Users/dhseo/Workspace/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260813175844-9840/final-integrity.log

bytes: 1183
sha256: d9a18568afb66963e440c12b381f66a87f9111931417deb3ddb4065b552ed0d4

```text
[fail] canonical parent, child census, Policy source, and cleanup form one run: canonical final binding failed: final-policy-independent-evaluation-mismatch
[pass] acceptance summary and actual eligibility
[pass] canonical summary report and child evidence manifest are direct and hash-bound
[pass] source provenance and command ledger are complete
[pass] canonical command set is exact and hash-bound
[pass] acceptance and child summary paths are contained by the current artifact root
[pass] Policy v4 evaluation is bound to its actual source summary
[pass] first failure record matches summary state
[pass] recovered retry preserves its earliest first failure
[pass] canonical artifacts contain no duplicate screenshots or video placeholders
[pass] top-level cleanup is measured
[pass] actual child evidence uses measured cleanup
== v3.9.0 final evidence integrity summary ==
- summary: /Users/dhseo/Workspace/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/summary.json
- executionMode: actual
- finalEvidenceEligible: true
- uiFulltestPass: true
- qualifiedCaseCount: 424
- sourceCommitSha: 08ad8b3ee70391be84cdf21de07215ec7ce0f070
- pass: 11
- fail: 1
```

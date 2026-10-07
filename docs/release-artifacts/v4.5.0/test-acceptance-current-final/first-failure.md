# v3.9.0 Acceptance First Failure

schema: media-server.v390-acceptance-first-failure.v1
recordedAt: 2026-10-07T09:55:09.111Z
runId: v390-test-acceptance-20261007084159-15681
sourceCommitSha: ea7d8aca940fb917c439cd8e958976b6321c504d
failedStage: ui-fulltest-qualification
testcaseId: ui-fulltest-qualification
error: == Policy v4 UI fulltest evidence qualification == | - policySchema: media-server.ui-fulltest-evidence-policy.v4 | - policyValidationResult: PASS | - currentEvidenceStatus: non-current-or-contract-evidence | - currentCoverage: {"exactUiTestIds":424,"nativeExecutablePositive":423,"negativeRouteExecutable":1,"unsupported":0,"executedPass":424,"notRun":0} | - evidenceEligibility: ineligible | - qualifiedCaseCount: 424 | - uiFulltestPass: false | - reasonCount: 2 |   - actual-evidence-current-source-binding-missing |   - source-binding-worktreePatchSha256-drift
logPath: /Users/dhseo/Workspace/mediaServer/docs/release-artifacts/v4.5.0/test-acceptance-current-final/runs/v390-test-acceptance-20261007084159-15681/ui-fulltest-qualification.log
failedCommand: ./server.sh verify-ui-fulltest-evidence-policy-v4 --summary /Users/dhseo/Workspace/mediaServer/docs/release-artifacts/v4.5.0/test-acceptance-current-final/runs/v390-test-acceptance-20261007084159-15681/ui-exact-424/policy-v4-summary.json --output-dir /Users/dhseo/Workspace/mediaServer/docs/release-artifacts/v4.5.0/test-acceptance-current-final/runs/v390-test-acceptance-20261007084159-15681/ui-fulltest-qualification --require-eligible
reproductionCommand: ./test_release.sh
context: == Policy v4 UI fulltest evidence qualification == | - policySchema: media-server.ui-fulltest-evidence-policy.v4 | - policyValidationResult: PASS | - currentEvidenceStatus: non-current-or-contract-evidence | - currentCoverage: {"exactUiTestIds":424,"nativeExecutablePositive":423,"negativeRouteExecutable":1,"unsupported":0,"executedPass":424,"notRun":0} | - evidenceEligibility: ineligible | - qualifiedCaseCount: 424 | - uiFulltestPass: false | - reasonCount: 2 |   - actual-evidence-current-source-binding-missing |   - source-binding-worktreePatchSha256-drift
childFailurePhase: not-recorded
childFailureCase: not-recorded
childCleanupStatus: not-recorded

## Diagnostic artifact snapshots

### /Users/dhseo/Workspace/mediaServer/docs/release-artifacts/v4.5.0/test-acceptance-current-final/runs/v390-test-acceptance-20261007084159-15681/ui-fulltest-qualification.log

bytes: 544
sha256: c7c8b122b32113bcd6e953abb977ef7fdc58e8567b9e6c0e26ee5f9d0ce84bf8

```text
== Policy v4 UI fulltest evidence qualification ==
- policySchema: media-server.ui-fulltest-evidence-policy.v4
- policyValidationResult: PASS
- currentEvidenceStatus: non-current-or-contract-evidence
- currentCoverage: {"exactUiTestIds":424,"nativeExecutablePositive":423,"negativeRouteExecutable":1,"unsupported":0,"executedPass":424,"notRun":0}
- evidenceEligibility: ineligible
- qualifiedCaseCount: 424
- uiFulltestPass: false
- reasonCount: 2
  - actual-evidence-current-source-binding-missing
  - source-binding-worktreePatchSha256-drift
```

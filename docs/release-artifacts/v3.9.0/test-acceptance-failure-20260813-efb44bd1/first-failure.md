# v3.9.0 Acceptance First Failure

schema: media-server.v390-acceptance-first-failure.v1
recordedAt: 2026-08-13T17:02:21.100Z
runId: v390-test-acceptance-20260813154309-10950
sourceCommitSha: efb44bd1b20517297a22dd17956fb514f26ebbf0
failedStage: ui-fulltest-qualification
testcaseId: ui-fulltest-qualification
error: == Policy v4 UI fulltest evidence qualification == | - policySchema: media-server.ui-fulltest-evidence-policy.v4 | - policyValidationResult: PASS | - currentEvidenceStatus: actual-current-source-evidence | - currentCoverage: {"exactUiTestIds":424,"nativeExecutablePositive":423,"negativeRouteExecutable":1,"unsupported":0,"executedPass":424,"notRun":0} | - evidenceEligibility: ineligible | - qualifiedCaseCount: 424 | - uiFulltestPass: false | - reasonCount: 1 |   - unapproved-console-message-present
logPath: ${REPO_ROOT}/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260813154309-10950/ui-fulltest-qualification.log
failedCommand: ./server.sh verify-ui-fulltest-evidence-policy-v4 --summary ${REPO_ROOT}/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260813154309-10950/ui-exact-424/policy-v4-summary.json --output-dir ${REPO_ROOT}/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260813154309-10950/ui-fulltest-qualification --require-eligible
reproductionCommand: ./test_release.sh
context: == Policy v4 UI fulltest evidence qualification == | - policySchema: media-server.ui-fulltest-evidence-policy.v4 | - policyValidationResult: PASS | - currentEvidenceStatus: actual-current-source-evidence | - currentCoverage: {"exactUiTestIds":424,"nativeExecutablePositive":423,"negativeRouteExecutable":1,"unsupported":0,"executedPass":424,"notRun":0} | - evidenceEligibility: ineligible | - qualifiedCaseCount: 424 | - uiFulltestPass: false | - reasonCount: 1 |   - unapproved-console-message-present
childFailurePhase: not-recorded
childFailureCase: not-recorded
childCleanupStatus: not-recorded

## Diagnostic artifact snapshots

### ${REPO_ROOT}/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260813154309-10950/ui-fulltest-qualification.log

bytes: 485
sha256: ba1bd1844d23493b6c4593f5fa21f8a1bea7e86036583663e7ed462f826e3ae5

```text
== Policy v4 UI fulltest evidence qualification ==
- policySchema: media-server.ui-fulltest-evidence-policy.v4
- policyValidationResult: PASS
- currentEvidenceStatus: actual-current-source-evidence
- currentCoverage: {"exactUiTestIds":424,"nativeExecutablePositive":423,"negativeRouteExecutable":1,"unsupported":0,"executedPass":424,"notRun":0}
- evidenceEligibility: ineligible
- qualifiedCaseCount: 424
- uiFulltestPass: false
- reasonCount: 1
  - unapproved-console-message-present
```

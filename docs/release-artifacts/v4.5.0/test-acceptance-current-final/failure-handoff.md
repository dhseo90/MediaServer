# User Test Failure Handoff

- suite: release
- sourceCommit: ea7d8aca940fb917c439cd8e958976b6321c504d
- sourceBranch: v4.5.0
- sourceWorktreeClean: false
- failureStage: ui-fulltest-qualification
- testcaseId: ui-fulltest-qualification
- command: ./server.sh verify-ui-fulltest-evidence-policy-v4 --summary /Users/dhseo/Workspace/mediaServer/docs/release-artifacts/v4.5.0/test-acceptance-current-final/runs/v390-test-acceptance-20261007084159-15681/ui-exact-424/policy-v4-summary.json --output-dir /Users/dhseo/Workspace/mediaServer/docs/release-artifacts/v4.5.0/test-acceptance-current-final/runs/v390-test-acceptance-20261007084159-15681/ui-fulltest-qualification --require-eligible
- exitCode: 1
- error: == Policy v4 UI fulltest evidence qualification == | - policySchema: media-server.ui-fulltest-evidence-policy.v4 | - policyValidationResult: PASS | - currentEvidenceStatus: non-current-or-contract-evidence | - currentCoverage: {"exactUiTestIds":424,"nativeExecutablePositive":423,"negativeRouteExecutable":1,"unsupported":0,"executedPass":424,"notRun":0} | - evidenceEligibility: ineligible | - qualifiedCaseCount: 424 | - uiFulltestPass: false | - reasonCount: 2 | - actual-evidence-current-source-binding-missing | - source-binding-worktreePatchSha256-drift
- logPath: /Users/dhseo/Workspace/mediaServer/docs/release-artifacts/v4.5.0/test-acceptance-current-final/runs/v390-test-acceptance-20261007084159-15681/ui-fulltest-qualification.log
- reproductionCommand: ./test_release.sh
- cleanup: pass

## Later Not Run

- stage:longrun-120-decision — not run after ui-fulltest-qualification failure
- stage:server-longrun-120 — not run after ui-fulltest-qualification failure
- stage:ui-final-integrity — not selected by release suite
- longrun30-delegated-step:longrun30/build
- longrun30-delegated-step:longrun30/external-turn-hard-gate

Compact JSON: /Users/dhseo/Workspace/mediaServer/docs/release-artifacts/v4.5.0/test-acceptance-current-final/test-run-summary.json
Source summary: /Users/dhseo/Workspace/mediaServer/docs/release-artifacts/v4.5.0/test-acceptance-current-final/summary.json

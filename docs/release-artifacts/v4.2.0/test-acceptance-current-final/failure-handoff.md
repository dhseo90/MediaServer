# User Test Failure Handoff

- suite: release
- sourceCommit: 4ad2fe20ae03dd676cab1c4c8bf3e1f0f71238e3
- sourceBranch: v4.2.0
- sourceWorktreeClean: true
- failureStage: feature-gates
- testcaseId: project-inventory
- command: ./server.sh verify-project-inventory
- exitCode: 1
- error: [pass] manual UI seed tracker Re-ID pair bytetrack/off | [pass] manual UI seed tracker Re-ID pair lite/assist | [pass] manual UI seed tracker Re-ID pair kalman-lite/assist | [pass] manual UI seed tracker Re-ID pair bytetrack/assist | [pass] manual UI seed invalid policy tracker none Re-ID assist | [pass] manual UI seed final state minimum vaRules | [pass] manual UI VA seed matrix covers required current release cases | == Project feature/test inventory summary == | - featureRows: 986 | - seedFixture: test/fixtures/manual_ui_fulltest_va_seed_matrix.json | - pass: 17 | - fail: 1
- logPath: /Users/dhseo/Workspace/mediaServer/docs/release-artifacts/v4.2.0/test-acceptance-current-final/runs/v390-test-acceptance-20261003033950-82694/feature-gates-32-project-inventory.log
- reproductionCommand: ./test_release.sh
- cleanup: pass

## Later Not Run

- check:feature-gates/feature-inventory-coverage
- check:feature-gates/release-evidence-index
- check:feature-gates/script-inventory
- check:feature-gates/git-diff-check
- stage:server-longrun-30 — not run after feature-gates failure
- stage:ui-environment-bootstrap — not run after feature-gates failure
- stage:ui-exact-424 — not run after feature-gates failure
- stage:ui-fulltest-qualification — not run after feature-gates failure
- stage:longrun-120-decision — not run after feature-gates failure
- stage:server-longrun-120 — not run after feature-gates failure
- stage:ui-final-integrity — not selected by release suite

Compact JSON: /Users/dhseo/Workspace/mediaServer/docs/release-artifacts/v4.2.0/test-acceptance-current-final/test-run-summary.json
Source summary: /Users/dhseo/Workspace/mediaServer/docs/release-artifacts/v4.2.0/test-acceptance-current-final/summary.json


# User Test Failure Handoff

- suite: release
- sourceCommit: 7caa36efbfba6ab243d70ae8be22184554ad0d5d
- sourceBranch: v4.1.1
- sourceWorktreeClean: false
- failureStage: feature-gates
- testcaseId: project-inventory
- command: ./server.sh verify-project-inventory
- exitCode: 1
- error: [pass] current feature expansion rows exist | [pass] manual UI docs reference inventory | [pass] manual checklist references seed fixture | [pass] manual result template references seed fixture | [pass] VA seed inventory commands select the latest published baseline explicitly | [pass] AGENTS links current individual feature test definitions | [fail] manual UI VA seed matrix covers required current release cases: seed fixture must target current source v4.1.1 | == Project feature/test inventory summary == | - featureRows: 986 | - seedFixture: test/fixtures/manual_ui_fulltest_va_seed_matrix.json | - pass: 16 | - fail: 2
- logPath: /Users/dhseo/Workspace/mediaServer/docs/release-artifacts/v4.1.1/test-acceptance-current-final/runs/v390-test-acceptance-20261001032647-85902/feature-gates-32-project-inventory.log
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

Compact JSON: /Users/dhseo/Workspace/mediaServer/docs/release-artifacts/v4.1.1/test-acceptance-current-final/test-run-summary.json
Source summary: /Users/dhseo/Workspace/mediaServer/docs/release-artifacts/v4.1.1/test-acceptance-current-final/summary.json

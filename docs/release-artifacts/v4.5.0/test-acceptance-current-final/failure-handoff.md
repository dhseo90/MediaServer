# User Test Failure Handoff

- suite: release
- sourceCommit: 7f2448bcd4de90e69559cbd8786ac56f420ba4a0
- sourceBranch: v4.5.0
- sourceWorktreeClean: true
- failureStage: feature-gates
- testcaseId: docs-ui-assets
- command: ./server.sh verify-docs-ui-assets
- exitCode: 1
- error: [pass] English README uses English UI screenshots | [pass] UI guide keeps product screenshots in the shared asset set | [pass] docs UI asset policy documents capture rules | [fail] managed UI asset manifest stays complete: docs UI asset manifest source version drifted | [pass] capture script owns every documented UI asset | [pass] docs capture covers current screenshots | [pass] representative screenshot docs do not point at stale visual baselines | [pass] docs UI asset directory contains managed PNG files | [pass] VA documentation images keep full video frame bounds | == Docs UI asset verification summary == | - pass: 9 | - fail: 1
- logPath: /Users/dhseo/Workspace/mediaServer/docs/release-artifacts/v4.5.0/test-acceptance-current-final/runs/v390-test-acceptance-20261007051606-99926/feature-gates-30-docs-ui-assets.log
- reproductionCommand: ./test_release.sh
- cleanup: pass

## Later Not Run

- check:feature-gates/feature-implementation-evidence
- check:feature-gates/project-inventory
- check:feature-gates/feature-inventory-coverage
- check:feature-gates/release-evidence-index
- check:feature-gates/script-inventory
- check:feature-gates/v450-search
- check:feature-gates/v450-evidence
- check:feature-gates/v450-search-lifetime
- check:feature-gates/v450-review-release
- check:feature-gates/v450-A-confirmed
- check:feature-gates/v450-A-observations
- check:feature-gates/v450-A-bound
- check:feature-gates/v450-A-http
- check:feature-gates/v450-A-ui-state
- check:feature-gates/v450-registration
- check:feature-gates/v450-materials
- check:feature-gates/v450-release-http
- check:feature-gates/git-diff-check
- stage:server-longrun-30 — not run after feature-gates failure
- stage:ui-environment-bootstrap — not run after feature-gates failure
- stage:ui-exact-424 — not run after feature-gates failure
- stage:ui-fulltest-qualification — not run after feature-gates failure
- stage:longrun-120-decision — not run after feature-gates failure
- stage:server-longrun-120 — not run after feature-gates failure
- stage:ui-final-integrity — not selected by release suite

Compact JSON: /Users/dhseo/Workspace/mediaServer/docs/release-artifacts/v4.5.0/test-acceptance-current-final/test-run-summary.json
Source summary: /Users/dhseo/Workspace/mediaServer/docs/release-artifacts/v4.5.0/test-acceptance-current-final/summary.json

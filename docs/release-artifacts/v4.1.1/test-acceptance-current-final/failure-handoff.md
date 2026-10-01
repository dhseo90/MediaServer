# User Test Failure Handoff

- suite: release
- sourceCommit: c41e18913127da24f267d039ea27b57b037e1816
- sourceBranch: v4.1.1
- sourceWorktreeClean: true
- failureStage: feature-gates
- testcaseId: script-inventory
- command: ./server.sh verify-script-inventory
- exitCode: 1
- error: scripts/internal/verify_v390_finalizer_screenshot_dedup_contract.mjs | [pass] project inventory delegates script file inventory to this verifier | [pass] project inventory maps verifier families without duplicating dispatch details | [pass] CMake does not define a separate untracked CTest registry | [pass] test entry scripts are reachable from test_all | [pass] auth verifier has no hardcoded test password defaults | [pass] VA EventRecord dispatch verifier fails early and dispatches every poll by default | [pass] critical verifier pass output avoids grouped feature-result wording | [pass] user-facing JS option parsers reject unknown options | == Script inventory verification summary == | - pass: 11 | - fail: 1
- logPath: /Users/dhseo/Workspace/mediaServer/docs/release-artifacts/v4.1.1/test-acceptance-current-final/runs/v390-test-acceptance-20261001045321-8453/feature-gates-35-script-inventory.log
- reproductionCommand: ./test_release.sh
- cleanup: pass

## Later Not Run

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

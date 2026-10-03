# User Test Failure Handoff

- suite: release
- sourceCommit: f99eeda950194f76fc01e056cadbd61d32b617d6
- sourceBranch: v4.2.0
- sourceWorktreeClean: true
- failureStage: feature-gates
- testcaseId: code-comments
- command: ./server.sh verify-code-comments
- exitCode: 1
- error: [fail] 상단 용도 주석 누락 | - docs/release-artifacts/v4.2.0/release-execution-20261003/check-owner-tamper.mjs | == Code comment policy summary == | - files: 1330 | - missing headers: 1 | - english-only comments: 0
- logPath: /Users/dhseo/Workspace/mediaServer/docs/release-artifacts/v4.2.0/test-acceptance-current-final/runs/v390-test-acceptance-20261003033811-81290/feature-gates-01-code-comments.log
- reproductionCommand: ./test_release.sh
- cleanup: pass

## Later Not Run

- check:feature-gates/v390-ui-native-exact-cases-contract
- check:feature-gates/v390-stabilization-release-readiness
- check:feature-gates/v390-entry-baseline
- check:feature-gates/v390-feature-completion-inventory
- check:feature-gates/v390-user-review-gate
- check:feature-gates/manual-ui-evidence
- check:feature-gates/v390-evidence-test-gate-prep
- check:feature-gates/v390-onvif-credential-provider-status
- check:feature-gates/v390-onvif-live-import-persist-decision
- check:feature-gates/v390-vlm-rule-suggestion-draft-bridge
- check:feature-gates/v390-vlm-incident-rule-provenance
- check:feature-gates/v390-vlm-evaluation-promotion-guard
- check:feature-gates/v390-vlm-promotion-trust-boundary
- check:feature-gates/v390-backup-recovery-handoff-validation
- check:feature-gates/v390-action-execution-deferral-decision
- check:feature-gates/v390-deferred-product-owner-signoff
- check:feature-gates/v390-conditional-field-ai-decisions
- check:feature-gates/v390-reid-readiness-consistency
- check:feature-gates/v390-onvif-source-view-atomicity
- check:feature-gates/v390-structure-stabilization-handoff
- check:feature-gates/v390-structure-stabilization-readiness
- check:feature-gates/v390-external-field-smoke-no-device-closure
- check:feature-gates/v390-truthfulness-status-vocabulary
- check:feature-gates/v390-analysis-registry-durable-write
- check:feature-gates/v390-ui-policy-v4-producer-contract
- check:feature-gates/v390-ui-visual-evidence-contract
- check:feature-gates/release-metadata
- check:feature-gates/docs-links
- check:feature-gates/docs-ui-assets
- check:feature-gates/feature-implementation-evidence
- check:feature-gates/project-inventory
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


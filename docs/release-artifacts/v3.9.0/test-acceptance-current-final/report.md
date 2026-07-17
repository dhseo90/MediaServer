# v3.9.0 Test Acceptance Bundle

schema: media-server.v390-test-acceptance-bundle.v1
result: FAIL
executionMode: actual
dryRun: false
sourceCommitSha: 99f6f110643fb47498edd75c311e3d0491baaba0
sourceBranch: v3.9.0
sourceWorktreeClean: true
failedStage: feature-gates
firstFailureCommand: ./server.sh verify-v390-structure-stabilization-handoff
firstFailureContext: - schema: media-server.v390-structure-stabilization-handoff.v1 | - command: verify-v390-structure-stabilization-handoff | - plan: docs/superpowers/plans/2026-07-08-v390-structure-stabilization-handoff.md | - structureExecution: test/fixtures/v390_structure_stabilization_execution.json | - actualCurrentSourceGraph: verify-v390-review4-structure-stabilization-execution --graph-only | - structureImplementation: not-run-by-this-command | - uiFulltest: not-run-by-this-command | - longrun30m120m: not-run-by-this-command | - publishedMetadata: not-run-by-this-command | - releaseActions: not-run-by-this-command | - pass: 6 | - fail: 1
automatedAcceptanceStatus: failed
evidenceBoundary: actual automated acceptance is not Codex in-app manual UI fulltest, published metadata, or release-action evidence

| stage | status | command | log/summary |
| --- | --- | --- | --- |
| preflight | PASS | validate actual bundle inputs | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717130122-44713/preflight.log |
| build | PASS | ./server.sh build | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717130122-44713/build.log |
| feature-gates | FAIL | 34 current feature commands |  |
| server-longrun-30 | not-run |  | not run after feature-gates failure |
| ui-environment-bootstrap | not-run |  | not run after feature-gates failure |
| ui-exact-424 | not-run |  | not run after feature-gates failure |
| ui-server-cleanup | PASS | stop exact UI throwaway server and verify ports | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717130122-44713/ui-server-cleanup.log |
| ui-fulltest-qualification | not-run |  | not run after feature-gates failure |
| longrun-120-decision | not-run |  | not run after feature-gates failure |
| server-longrun-120 | not-run |  | not run after feature-gates failure |
| cleanup | PASS | validate child cleanup and preserved evidence | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717130122-44713/cleanup.log |
| report | PASS | write acceptance summary/report | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717130122-44713/report.log |
| final-integrity | not-run |  | not run after feature-gates failure |

## Known UI closure blockers

- acceptance-execution-not-pass
- policy-evaluation-schema-mismatch
- policy-validation-not-pass
- policy-source-evidence-schema-mismatch
- policy-evidence-not-eligible
- policy-ui-fulltest-not-pass
- qualified-case-count-not-424
- qualified-case-id-list-not-424
- qualified-case-id-list-has-duplicates
- qualified-case-id-list-not-canonical
- full-suite-not-actual-browser-execution
- requested-exact-case-count-not-424
- full-suite-pass-count-not-424
- full-suite-fail-not-zero
- full-suite-notRun-not-zero
- full-suite-unsupported-not-zero
- full-suite-unapprovedExclusions-not-zero
- full-suite-manualIntervention-not-zero
- policy-source-summary-hash-missing

## Executed command ledger

| stage | id | status | command | exit | log |
| --- | --- | --- | --- | ---: | --- |
| preflight | preflight | PASS | validate actual bundle inputs | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717130122-44713/preflight.log |
| build | build | PASS | ./server.sh build | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717130122-44713/build.log |
| feature-gates | feature-gates | FAIL | 34 current feature commands | 1 |  |
| feature-gates | v390-stabilization-release-readiness | PASS | ./server.sh verify-v390-stabilization-release-readiness | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717130122-44713/feature-gates-01-v390-stabilization-release-readiness.log |
| feature-gates | v390-entry-baseline | PASS | ./server.sh verify-v390-entry-baseline | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717130122-44713/feature-gates-02-v390-entry-baseline.log |
| feature-gates | v390-feature-completion-inventory | PASS | ./server.sh verify-v390-feature-completion-inventory | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717130122-44713/feature-gates-03-v390-feature-completion-inventory.log |
| feature-gates | v390-user-review-gate | PASS | ./server.sh verify-v390-user-review-gate | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717130122-44713/feature-gates-04-v390-user-review-gate.log |
| feature-gates | manual-ui-evidence | PASS | ./server.sh verify-manual-ui-evidence | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717130122-44713/feature-gates-05-manual-ui-evidence.log |
| feature-gates | v390-evidence-test-gate-prep | PASS | ./server.sh verify-v390-evidence-test-gate-prep | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717130122-44713/feature-gates-06-v390-evidence-test-gate-prep.log |
| feature-gates | v390-onvif-credential-provider-status | PASS | ./server.sh verify-v390-onvif-credential-provider-status | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717130122-44713/feature-gates-07-v390-onvif-credential-provider-status.log |
| feature-gates | v390-onvif-live-import-persist-decision | PASS | ./server.sh verify-v390-onvif-live-import-persist-decision | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717130122-44713/feature-gates-08-v390-onvif-live-import-persist-decision.log |
| feature-gates | v390-vlm-rule-suggestion-draft-bridge | PASS | ./server.sh verify-v390-vlm-rule-suggestion-draft-bridge | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717130122-44713/feature-gates-09-v390-vlm-rule-suggestion-draft-bridge.log |
| feature-gates | v390-vlm-incident-rule-provenance | PASS | ./server.sh verify-v390-vlm-incident-rule-provenance | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717130122-44713/feature-gates-10-v390-vlm-incident-rule-provenance.log |
| feature-gates | v390-vlm-evaluation-promotion-guard | PASS | ./server.sh verify-v390-vlm-evaluation-promotion-guard | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717130122-44713/feature-gates-11-v390-vlm-evaluation-promotion-guard.log |
| feature-gates | v390-vlm-promotion-trust-boundary | PASS | ./server.sh verify-v390-vlm-promotion-trust-boundary | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717130122-44713/feature-gates-12-v390-vlm-promotion-trust-boundary.log |
| feature-gates | v390-backup-recovery-handoff-validation | PASS | ./server.sh verify-v390-backup-recovery-handoff-validation | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717130122-44713/feature-gates-13-v390-backup-recovery-handoff-validation.log |
| feature-gates | v390-action-execution-deferral-decision | PASS | ./server.sh verify-v390-action-execution-deferral-decision | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717130122-44713/feature-gates-14-v390-action-execution-deferral-decision.log |
| feature-gates | v390-deferred-product-owner-signoff | PASS | ./server.sh verify-v390-deferred-product-owner-signoff | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717130122-44713/feature-gates-15-v390-deferred-product-owner-signoff.log |
| feature-gates | v390-conditional-field-ai-decisions | PASS | ./server.sh verify-v390-conditional-field-ai-decisions | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717130122-44713/feature-gates-16-v390-conditional-field-ai-decisions.log |
| feature-gates | v390-reid-readiness-consistency | PASS | ./server.sh verify-v390-reid-readiness-consistency | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717130122-44713/feature-gates-17-v390-reid-readiness-consistency.log |
| feature-gates | v390-onvif-source-view-atomicity | PASS | ./server.sh verify-v390-onvif-source-view-atomicity | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717130122-44713/feature-gates-18-v390-onvif-source-view-atomicity.log |
| feature-gates | v390-structure-stabilization-handoff | FAIL | ./server.sh verify-v390-structure-stabilization-handoff | 1 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717130122-44713/feature-gates-19-v390-structure-stabilization-handoff.log |
| feature-gates | v390-structure-stabilization-readiness | not-run | ./server.sh verify-v390-structure-stabilization-readiness |  |  |
| feature-gates | v390-external-field-smoke-no-device-closure | not-run | ./server.sh verify-v390-external-field-smoke-no-device-closure |  |  |
| feature-gates | v390-truthfulness-status-vocabulary | not-run | ./server.sh verify-v390-truthfulness-status-vocabulary |  |  |
| feature-gates | v390-analysis-registry-durable-write | not-run | ./server.sh verify-v390-analysis-registry-durable-write |  |  |
| feature-gates | v390-ui-policy-v4-producer-contract | not-run | ./server.sh verify-v390-ui-policy-v4-producer-contract |  |  |
| feature-gates | v390-ui-visual-evidence-contract | not-run | ./server.sh verify-v390-ui-visual-evidence-contract |  |  |
| feature-gates | release-metadata | not-run | ./server.sh verify-release-metadata |  |  |
| feature-gates | docs-links | not-run | ./server.sh verify-docs-links |  |  |
| feature-gates | docs-ui-assets | not-run | ./server.sh verify-docs-ui-assets |  |  |
| feature-gates | feature-implementation-evidence | not-run | ./server.sh verify-feature-implementation-evidence |  |  |
| feature-gates | project-inventory | not-run | ./server.sh verify-project-inventory |  |  |
| feature-gates | feature-inventory-coverage | not-run | ./server.sh verify-feature-inventory-coverage |  |  |
| feature-gates | release-evidence-index | not-run | ./server.sh verify-release-evidence-index |  |  |
| feature-gates | script-inventory | not-run | ./server.sh verify-script-inventory |  |  |
| feature-gates | git-diff-check | not-run | git diff --check |  |  |
| ui-server-cleanup | ui-server-cleanup | PASS | stop exact UI throwaway server and verify ports | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717130122-44713/ui-server-cleanup.log |
| cleanup | cleanup | PASS | validate child cleanup and preserved evidence | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717130122-44713/cleanup.log |
| report | report | PASS | write acceptance summary/report | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717130122-44713/report.log |

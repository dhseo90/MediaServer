# v3.9.0 Test Acceptance Bundle

schema: media-server.v390-test-acceptance-bundle.v1
result: FAIL
executionMode: actual
dryRun: false
sourceCommitSha: 6127e64f773a8d06cea8d37fdd0c898bd20c407d
sourceBranch: v4.4.0
sourceWorktreeClean: true
failedStage: feature-gates
firstFailureCommand: ./server.sh verify-project-inventory
firstFailureContext: [pass] current feature expansion rows exist | [pass] manual UI docs reference inventory | [pass] manual checklist references seed fixture | [pass] manual result template references seed fixture | [pass] VA seed inventory commands select the latest published baseline explicitly | [pass] AGENTS links current individual feature test definitions | [fail] manual UI VA seed matrix covers required current release cases: seed fixture must target current source v4.4.0 | == Project feature/test inventory summary == | - featureRows: 986 | - seedFixture: test/fixtures/manual_ui_fulltest_va_seed_matrix.json | - pass: 16 | - fail: 2
reproductionCommand: ./test_release.sh
automatedAcceptanceStatus: failed
evidenceBoundary: actual automated acceptance is not Codex in-app manual UI fulltest, published metadata, or release-action evidence
exactUiCoverage: not-run

| stage | status | command | log/summary |
| --- | --- | --- | --- |
| preflight | PASS | validate actual bundle inputs | <repo>/docs/release-artifacts/v4.4.0/test-acceptance-current-final/runs/v390-test-acceptance-20261004131647-71763/preflight.log |
| build | PASS | ./server.sh build | <repo>/docs/release-artifacts/v4.4.0/test-acceptance-current-final/runs/v390-test-acceptance-20261004131647-71763/build.log |
| feature-gates | FAIL | 36 current feature commands |  |
| server-longrun-30 | not-run |  | not run after feature-gates failure |
| ui-environment-bootstrap | not-run |  | not run after feature-gates failure |
| ui-exact-424 | not-run |  | not run after feature-gates failure |
| ui-server-cleanup | PASS | stop exact UI throwaway server and verify ports | <repo>/docs/release-artifacts/v4.4.0/test-acceptance-current-final/runs/v390-test-acceptance-20261004131647-71763/ui-server-cleanup.log |
| ui-fulltest-qualification | not-run |  | not run after feature-gates failure |
| longrun-120-decision | not-run |  | not run after feature-gates failure |
| server-longrun-120 | not-run |  | not run after feature-gates failure |
| cleanup | PASS | validate child cleanup and preserved evidence | <repo>/docs/release-artifacts/v4.4.0/test-acceptance-current-final/runs/v390-test-acceptance-20261004131647-71763/cleanup.log |
| ui-final-integrity | not-run |  | not selected by release suite |
| report | PASS | write acceptance summary/report | <repo>/docs/release-artifacts/v4.4.0/test-acceptance-current-final/runs/v390-test-acceptance-20261004131647-71763/report.log |
| final-integrity | FAIL | ./server.sh verify-v390-final-evidence-integrity --summary <repo>/docs/release-artifacts/v4.4.0/test-acceptance-current-final/summary.json | <repo>/docs/release-artifacts/v4.4.0/test-acceptance-current-final/summary.json |

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
| preflight | preflight | PASS | validate actual bundle inputs | 0 | <repo>/docs/release-artifacts/v4.4.0/test-acceptance-current-final/runs/v390-test-acceptance-20261004131647-71763/preflight.log |
| build | build | PASS | ./server.sh build | 0 | <repo>/docs/release-artifacts/v4.4.0/test-acceptance-current-final/runs/v390-test-acceptance-20261004131647-71763/build.log |
| feature-gates | feature-gates | FAIL | 36 current feature commands | 1 |  |
| feature-gates | code-comments | PASS | ./server.sh verify-code-comments | 0 | <repo>/docs/release-artifacts/v4.4.0/test-acceptance-current-final/runs/v390-test-acceptance-20261004131647-71763/feature-gates-01-code-comments.log |
| feature-gates | v390-ui-native-exact-cases-contract | PASS | ./server.sh verify-v390-ui-native-exact-cases-contract | 0 | <repo>/docs/release-artifacts/v4.4.0/test-acceptance-current-final/runs/v390-test-acceptance-20261004131647-71763/feature-gates-02-v390-ui-native-exact-cases-contract.log |
| feature-gates | v390-stabilization-release-readiness | PASS | ./server.sh verify-v390-stabilization-release-readiness | 0 | <repo>/docs/release-artifacts/v4.4.0/test-acceptance-current-final/runs/v390-test-acceptance-20261004131647-71763/feature-gates-03-v390-stabilization-release-readiness.log |
| feature-gates | v390-entry-baseline | PASS | ./server.sh verify-v390-entry-baseline | 0 | <repo>/docs/release-artifacts/v4.4.0/test-acceptance-current-final/runs/v390-test-acceptance-20261004131647-71763/feature-gates-04-v390-entry-baseline.log |
| feature-gates | v390-feature-completion-inventory | PASS | ./server.sh verify-v390-feature-completion-inventory | 0 | <repo>/docs/release-artifacts/v4.4.0/test-acceptance-current-final/runs/v390-test-acceptance-20261004131647-71763/feature-gates-05-v390-feature-completion-inventory.log |
| feature-gates | v390-user-review-gate | PASS | ./server.sh verify-v390-user-review-gate | 0 | <repo>/docs/release-artifacts/v4.4.0/test-acceptance-current-final/runs/v390-test-acceptance-20261004131647-71763/feature-gates-06-v390-user-review-gate.log |
| feature-gates | manual-ui-evidence | PASS | ./server.sh verify-manual-ui-evidence | 0 | <repo>/docs/release-artifacts/v4.4.0/test-acceptance-current-final/runs/v390-test-acceptance-20261004131647-71763/feature-gates-07-manual-ui-evidence.log |
| feature-gates | v390-evidence-test-gate-prep | PASS | ./server.sh verify-v390-evidence-test-gate-prep | 0 | <repo>/docs/release-artifacts/v4.4.0/test-acceptance-current-final/runs/v390-test-acceptance-20261004131647-71763/feature-gates-08-v390-evidence-test-gate-prep.log |
| feature-gates | v390-onvif-credential-provider-status | PASS | ./server.sh verify-v390-onvif-credential-provider-status | 0 | <repo>/docs/release-artifacts/v4.4.0/test-acceptance-current-final/runs/v390-test-acceptance-20261004131647-71763/feature-gates-09-v390-onvif-credential-provider-status.log |
| feature-gates | v390-onvif-live-import-persist-decision | PASS | ./server.sh verify-v390-onvif-live-import-persist-decision | 0 | <repo>/docs/release-artifacts/v4.4.0/test-acceptance-current-final/runs/v390-test-acceptance-20261004131647-71763/feature-gates-10-v390-onvif-live-import-persist-decision.log |
| feature-gates | v390-vlm-rule-suggestion-draft-bridge | PASS | ./server.sh verify-v390-vlm-rule-suggestion-draft-bridge | 0 | <repo>/docs/release-artifacts/v4.4.0/test-acceptance-current-final/runs/v390-test-acceptance-20261004131647-71763/feature-gates-11-v390-vlm-rule-suggestion-draft-bridge.log |
| feature-gates | v390-vlm-incident-rule-provenance | PASS | ./server.sh verify-v390-vlm-incident-rule-provenance | 0 | <repo>/docs/release-artifacts/v4.4.0/test-acceptance-current-final/runs/v390-test-acceptance-20261004131647-71763/feature-gates-12-v390-vlm-incident-rule-provenance.log |
| feature-gates | v390-vlm-evaluation-promotion-guard | PASS | ./server.sh verify-v390-vlm-evaluation-promotion-guard | 0 | <repo>/docs/release-artifacts/v4.4.0/test-acceptance-current-final/runs/v390-test-acceptance-20261004131647-71763/feature-gates-13-v390-vlm-evaluation-promotion-guard.log |
| feature-gates | v390-vlm-promotion-trust-boundary | PASS | ./server.sh verify-v390-vlm-promotion-trust-boundary | 0 | <repo>/docs/release-artifacts/v4.4.0/test-acceptance-current-final/runs/v390-test-acceptance-20261004131647-71763/feature-gates-14-v390-vlm-promotion-trust-boundary.log |
| feature-gates | v390-backup-recovery-handoff-validation | PASS | ./server.sh verify-v390-backup-recovery-handoff-validation | 0 | <repo>/docs/release-artifacts/v4.4.0/test-acceptance-current-final/runs/v390-test-acceptance-20261004131647-71763/feature-gates-15-v390-backup-recovery-handoff-validation.log |
| feature-gates | v390-action-execution-deferral-decision | PASS | ./server.sh verify-v390-action-execution-deferral-decision | 0 | <repo>/docs/release-artifacts/v4.4.0/test-acceptance-current-final/runs/v390-test-acceptance-20261004131647-71763/feature-gates-16-v390-action-execution-deferral-decision.log |
| feature-gates | v390-deferred-product-owner-signoff | PASS | ./server.sh verify-v390-deferred-product-owner-signoff | 0 | <repo>/docs/release-artifacts/v4.4.0/test-acceptance-current-final/runs/v390-test-acceptance-20261004131647-71763/feature-gates-17-v390-deferred-product-owner-signoff.log |
| feature-gates | v390-conditional-field-ai-decisions | PASS | ./server.sh verify-v390-conditional-field-ai-decisions | 0 | <repo>/docs/release-artifacts/v4.4.0/test-acceptance-current-final/runs/v390-test-acceptance-20261004131647-71763/feature-gates-18-v390-conditional-field-ai-decisions.log |
| feature-gates | v390-reid-readiness-consistency | PASS | ./server.sh verify-v390-reid-readiness-consistency | 0 | <repo>/docs/release-artifacts/v4.4.0/test-acceptance-current-final/runs/v390-test-acceptance-20261004131647-71763/feature-gates-19-v390-reid-readiness-consistency.log |
| feature-gates | v390-onvif-source-view-atomicity | PASS | ./server.sh verify-v390-onvif-source-view-atomicity | 0 | <repo>/docs/release-artifacts/v4.4.0/test-acceptance-current-final/runs/v390-test-acceptance-20261004131647-71763/feature-gates-20-v390-onvif-source-view-atomicity.log |
| feature-gates | v390-structure-stabilization-handoff | PASS | ./server.sh verify-v390-structure-stabilization-handoff | 0 | <repo>/docs/release-artifacts/v4.4.0/test-acceptance-current-final/runs/v390-test-acceptance-20261004131647-71763/feature-gates-21-v390-structure-stabilization-handoff.log |
| feature-gates | v390-structure-stabilization-readiness | PASS | ./server.sh verify-v390-structure-stabilization-readiness | 0 | <repo>/docs/release-artifacts/v4.4.0/test-acceptance-current-final/runs/v390-test-acceptance-20261004131647-71763/feature-gates-22-v390-structure-stabilization-readiness.log |
| feature-gates | v390-external-field-smoke-no-device-closure | PASS | ./server.sh verify-v390-external-field-smoke-no-device-closure | 0 | <repo>/docs/release-artifacts/v4.4.0/test-acceptance-current-final/runs/v390-test-acceptance-20261004131647-71763/feature-gates-23-v390-external-field-smoke-no-device-closure.log |
| feature-gates | v390-truthfulness-status-vocabulary | PASS | ./server.sh verify-v390-truthfulness-status-vocabulary | 0 | <repo>/docs/release-artifacts/v4.4.0/test-acceptance-current-final/runs/v390-test-acceptance-20261004131647-71763/feature-gates-24-v390-truthfulness-status-vocabulary.log |
| feature-gates | v390-analysis-registry-durable-write | PASS | ./server.sh verify-v390-analysis-registry-durable-write | 0 | <repo>/docs/release-artifacts/v4.4.0/test-acceptance-current-final/runs/v390-test-acceptance-20261004131647-71763/feature-gates-25-v390-analysis-registry-durable-write.log |
| feature-gates | v390-ui-policy-v4-producer-contract | PASS | ./server.sh verify-v390-ui-policy-v4-producer-contract | 0 | <repo>/docs/release-artifacts/v4.4.0/test-acceptance-current-final/runs/v390-test-acceptance-20261004131647-71763/feature-gates-26-v390-ui-policy-v4-producer-contract.log |
| feature-gates | v390-ui-visual-evidence-contract | PASS | ./server.sh verify-v390-ui-visual-evidence-contract | 0 | <repo>/docs/release-artifacts/v4.4.0/test-acceptance-current-final/runs/v390-test-acceptance-20261004131647-71763/feature-gates-27-v390-ui-visual-evidence-contract.log |
| feature-gates | release-metadata | PASS | ./server.sh verify-release-metadata | 0 | <repo>/docs/release-artifacts/v4.4.0/test-acceptance-current-final/runs/v390-test-acceptance-20261004131647-71763/feature-gates-28-release-metadata.log |
| feature-gates | docs-links | PASS | ./server.sh verify-docs-links | 0 | <repo>/docs/release-artifacts/v4.4.0/test-acceptance-current-final/runs/v390-test-acceptance-20261004131647-71763/feature-gates-29-docs-links.log |
| feature-gates | docs-ui-assets | PASS | ./server.sh verify-docs-ui-assets | 0 | <repo>/docs/release-artifacts/v4.4.0/test-acceptance-current-final/runs/v390-test-acceptance-20261004131647-71763/feature-gates-30-docs-ui-assets.log |
| feature-gates | feature-implementation-evidence | PASS | ./server.sh verify-feature-implementation-evidence | 0 | <repo>/docs/release-artifacts/v4.4.0/test-acceptance-current-final/runs/v390-test-acceptance-20261004131647-71763/feature-gates-31-feature-implementation-evidence.log |
| feature-gates | project-inventory | FAIL | ./server.sh verify-project-inventory | 1 | <repo>/docs/release-artifacts/v4.4.0/test-acceptance-current-final/runs/v390-test-acceptance-20261004131647-71763/feature-gates-32-project-inventory.log |
| feature-gates | feature-inventory-coverage | not-run | ./server.sh verify-feature-inventory-coverage |  |  |
| feature-gates | release-evidence-index | not-run | ./server.sh verify-release-evidence-index |  |  |
| feature-gates | script-inventory | not-run | ./server.sh verify-script-inventory |  |  |
| feature-gates | git-diff-check | not-run | git diff --check |  |  |
| ui-server-cleanup | ui-server-cleanup | PASS | stop exact UI throwaway server and verify ports | 0 | <repo>/docs/release-artifacts/v4.4.0/test-acceptance-current-final/runs/v390-test-acceptance-20261004131647-71763/ui-server-cleanup.log |
| cleanup | cleanup | PASS | validate child cleanup and preserved evidence | 0 | <repo>/docs/release-artifacts/v4.4.0/test-acceptance-current-final/runs/v390-test-acceptance-20261004131647-71763/cleanup.log |
| report | report | PASS | write acceptance summary/report | 0 | <repo>/docs/release-artifacts/v4.4.0/test-acceptance-current-final/runs/v390-test-acceptance-20261004131647-71763/report.log |
| final-integrity | final-integrity | FAIL | ./server.sh verify-v390-final-evidence-integrity --summary <repo>/docs/release-artifacts/v4.4.0/test-acceptance-current-final/summary.json | 1 | <repo>/docs/release-artifacts/v4.4.0/test-acceptance-current-final/runs/v390-test-acceptance-20261004131647-71763/final-integrity.log |

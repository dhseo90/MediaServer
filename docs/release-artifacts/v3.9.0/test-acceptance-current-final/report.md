# v3.9.0 Test Acceptance Bundle

schema: media-server.v390-test-acceptance-bundle.v1
result: FAIL
executionMode: actual
dryRun: false
sourceCommitSha: bac8cb50ef7015869afabfbf9793316a95a379e5
sourceBranch: v3.9.0
sourceWorktreeClean: true
failedStage: feature-gates
firstFailureCommand: ./server.sh verify-v390-stabilization-release-readiness
firstFailureContext: [pass] Step 20 gate keeps release actions and long UI/soak evidence separate | == v3.9.0 stabilization/release readiness summary == | - schema: media-server.v390-stabilization-release-readiness.v1 | - step: v3.9.0 (20) | - scope: local stabilization gate wiring, release evidence records, AGENTS test category judgment, not-run boundaries | - uiFulltest: not-run-by-this-command | - longrun30m120m: not-run-by-this-command | - publishedMetadata: not-run-by-this-command | - releaseActions: not-run-by-this-command | - fieldSmoke: not-run-by-this-command | - pass: 6 | - fail: 1
automatedAcceptanceStatus: failed
evidenceBoundary: actual automated acceptance is not Codex in-app manual UI fulltest, published metadata, or release-action evidence

| stage | status | command | log/summary |
| --- | --- | --- | --- |
| preflight | PASS | validate actual bundle inputs | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717090508-77605/preflight.log |
| build | PASS | ./server.sh build | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717090508-77605/build.log |
| feature-gates | FAIL | 34 current feature commands |  |
| server-longrun-30 | not-run |  | not run after feature-gates failure |
| ui-environment-bootstrap | not-run |  | not run after feature-gates failure |
| ui-exact-424 | not-run |  | not run after feature-gates failure |
| ui-server-cleanup | PASS | stop exact UI throwaway server and verify ports | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717090508-77605/ui-server-cleanup.log |
| ui-fulltest-qualification | not-run |  | not run after feature-gates failure |
| longrun-120-decision | not-run |  | not run after feature-gates failure |
| server-longrun-120 | not-run |  | not run after feature-gates failure |
| cleanup | PASS | validate child cleanup and preserved evidence | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717090508-77605/cleanup.log |
| report | PASS | write acceptance summary/report | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717090508-77605/report.log |
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
| preflight | preflight | PASS | validate actual bundle inputs | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717090508-77605/preflight.log |
| build | build | PASS | ./server.sh build | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717090508-77605/build.log |
| feature-gates | feature-gates | FAIL | 34 current feature commands | 1 |  |
| feature-gates | v390-stabilization-release-readiness | FAIL | ./server.sh verify-v390-stabilization-release-readiness | 1 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717090508-77605/feature-gates-01-v390-stabilization-release-readiness.log |
| feature-gates | v390-entry-baseline | not-run | ./server.sh verify-v390-entry-baseline |  |  |
| feature-gates | v390-feature-completion-inventory | not-run | ./server.sh verify-v390-feature-completion-inventory |  |  |
| feature-gates | v390-user-review-gate | not-run | ./server.sh verify-v390-user-review-gate |  |  |
| feature-gates | manual-ui-evidence | not-run | ./server.sh verify-manual-ui-evidence |  |  |
| feature-gates | v390-evidence-test-gate-prep | not-run | ./server.sh verify-v390-evidence-test-gate-prep |  |  |
| feature-gates | v390-onvif-credential-provider-status | not-run | ./server.sh verify-v390-onvif-credential-provider-status |  |  |
| feature-gates | v390-onvif-live-import-persist-decision | not-run | ./server.sh verify-v390-onvif-live-import-persist-decision |  |  |
| feature-gates | v390-vlm-rule-suggestion-draft-bridge | not-run | ./server.sh verify-v390-vlm-rule-suggestion-draft-bridge |  |  |
| feature-gates | v390-vlm-incident-rule-provenance | not-run | ./server.sh verify-v390-vlm-incident-rule-provenance |  |  |
| feature-gates | v390-vlm-evaluation-promotion-guard | not-run | ./server.sh verify-v390-vlm-evaluation-promotion-guard |  |  |
| feature-gates | v390-vlm-promotion-trust-boundary | not-run | ./server.sh verify-v390-vlm-promotion-trust-boundary |  |  |
| feature-gates | v390-backup-recovery-handoff-validation | not-run | ./server.sh verify-v390-backup-recovery-handoff-validation |  |  |
| feature-gates | v390-action-execution-deferral-decision | not-run | ./server.sh verify-v390-action-execution-deferral-decision |  |  |
| feature-gates | v390-deferred-product-owner-signoff | not-run | ./server.sh verify-v390-deferred-product-owner-signoff |  |  |
| feature-gates | v390-conditional-field-ai-decisions | not-run | ./server.sh verify-v390-conditional-field-ai-decisions |  |  |
| feature-gates | v390-reid-readiness-consistency | not-run | ./server.sh verify-v390-reid-readiness-consistency |  |  |
| feature-gates | v390-onvif-source-view-atomicity | not-run | ./server.sh verify-v390-onvif-source-view-atomicity |  |  |
| feature-gates | v390-structure-stabilization-handoff | not-run | ./server.sh verify-v390-structure-stabilization-handoff |  |  |
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
| ui-server-cleanup | ui-server-cleanup | PASS | stop exact UI throwaway server and verify ports | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717090508-77605/ui-server-cleanup.log |
| cleanup | cleanup | PASS | validate child cleanup and preserved evidence | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717090508-77605/cleanup.log |
| report | report | PASS | write acceptance summary/report | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717090508-77605/report.log |

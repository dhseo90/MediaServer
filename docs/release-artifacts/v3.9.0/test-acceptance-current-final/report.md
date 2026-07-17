# v3.9.0 Test Acceptance Bundle

schema: media-server.v390-test-acceptance-bundle.v1
result: FAIL
executionMode: actual
dryRun: false
sourceCommitSha: 911446e802a5eb984843d929238715563722261a
sourceBranch: v3.9.0
sourceWorktreeClean: true
failedStage: ui-exact-424
firstFailureCommand: ./server.sh run-v390-ui-native-exact-cases --output-dir /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/ui-exact-424 --http-base http://127.0.0.1:61811 --role-state-map /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_v390_ui-UEUuvZ/role-state-map.json --server-log /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_v390_ui-UEUuvZ/media-server.log --runtime-descriptor /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_v390_ui-UEUuvZ/runtime-descriptor.json --build-path build-gst-onnx/media_server
firstFailureContext: file:///Users/dhseo/Desktop/workspace/codexTest/mediaServer/scripts/internal/v390_ui_native_exact_cases_lib.mjs:3013 |   if (!condition) throw new Error(message); |                         ^ | Error: implementation source binding drift |     at assert (file:///Users/dhseo/Desktop/workspace/codexTest/mediaServer/scripts/internal/v390_ui_native_exact_cases_lib.mjs:3013:25) |     at validateNativeExactManifest (file:///Users/dhseo/Desktop/workspace/codexTest/mediaServer/scripts/internal/v390_ui_native_exact_cases_lib.mjs:1387:3) |     at file:///Users/dhseo/Desktop/workspace/codexTest/mediaServer/scripts/internal/run_v390_ui_native_exact_cases.mjs:65:20 |     at ModuleJob.run (node:internal/modules/esm/module_job:413:25) |     at process.processTicksAndRejections (node:internal/process/task_queues:103:5) |     at async onImport.tracePromise.__proto__ (node:internal/modules/esm/loader:660:26) |     at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:101:5) | Node.js v24.13.0
automatedAcceptanceStatus: failed
evidenceBoundary: actual automated acceptance is not Codex in-app manual UI fulltest, published metadata, or release-action evidence

| stage | status | command | log/summary |
| --- | --- | --- | --- |
| preflight | PASS | validate actual bundle inputs | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/preflight.log |
| build | PASS | ./server.sh build | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/build.log |
| feature-gates | PASS | 35 current feature commands |  |
| server-longrun-30 | PASS | ./server.sh verify-v390-server-longrun --duration-minutes 30 --output-dir /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/server-longrun-30 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/server-longrun-30/summary.json |
| ui-environment-bootstrap | PASS | bootstrap acceptance-owned throwaway server/auth roles/Playwright storage-state | /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_v390_ui-UEUuvZ/runtime-descriptor.json |
| ui-exact-424 | FAIL | ./server.sh run-v390-ui-native-exact-cases --output-dir /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/ui-exact-424 --http-base http://127.0.0.1:61811 --role-state-map /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_v390_ui-UEUuvZ/role-state-map.json --server-log /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_v390_ui-UEUuvZ/media-server.log --runtime-descriptor /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_v390_ui-UEUuvZ/runtime-descriptor.json --build-path build-gst-onnx/media_server | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/ui-exact-424/summary.json |
| ui-server-cleanup | PASS | stop exact UI throwaway server and verify ports | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/ui-server-cleanup.log |
| ui-fulltest-qualification | not-run |  | not run after ui-exact-424 failure |
| longrun-120-decision | not-run |  | not run after ui-exact-424 failure |
| server-longrun-120 | not-run |  | not run after ui-exact-424 failure |
| cleanup | FAIL | cleanup validation | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/cleanup.log |
| report | PASS | write acceptance summary/report | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/report.log |
| final-integrity | not-run |  | not run after ui-exact-424 failure |

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
| preflight | preflight | PASS | validate actual bundle inputs | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/preflight.log |
| build | build | PASS | ./server.sh build | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/build.log |
| feature-gates | feature-gates | PASS | 35 current feature commands | 0 |  |
| feature-gates | code-comments | PASS | ./server.sh verify-code-comments | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/feature-gates-01-code-comments.log |
| feature-gates | v390-stabilization-release-readiness | PASS | ./server.sh verify-v390-stabilization-release-readiness | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/feature-gates-02-v390-stabilization-release-readiness.log |
| feature-gates | v390-entry-baseline | PASS | ./server.sh verify-v390-entry-baseline | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/feature-gates-03-v390-entry-baseline.log |
| feature-gates | v390-feature-completion-inventory | PASS | ./server.sh verify-v390-feature-completion-inventory | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/feature-gates-04-v390-feature-completion-inventory.log |
| feature-gates | v390-user-review-gate | PASS | ./server.sh verify-v390-user-review-gate | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/feature-gates-05-v390-user-review-gate.log |
| feature-gates | manual-ui-evidence | PASS | ./server.sh verify-manual-ui-evidence | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/feature-gates-06-manual-ui-evidence.log |
| feature-gates | v390-evidence-test-gate-prep | PASS | ./server.sh verify-v390-evidence-test-gate-prep | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/feature-gates-07-v390-evidence-test-gate-prep.log |
| feature-gates | v390-onvif-credential-provider-status | PASS | ./server.sh verify-v390-onvif-credential-provider-status | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/feature-gates-08-v390-onvif-credential-provider-status.log |
| feature-gates | v390-onvif-live-import-persist-decision | PASS | ./server.sh verify-v390-onvif-live-import-persist-decision | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/feature-gates-09-v390-onvif-live-import-persist-decision.log |
| feature-gates | v390-vlm-rule-suggestion-draft-bridge | PASS | ./server.sh verify-v390-vlm-rule-suggestion-draft-bridge | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/feature-gates-10-v390-vlm-rule-suggestion-draft-bridge.log |
| feature-gates | v390-vlm-incident-rule-provenance | PASS | ./server.sh verify-v390-vlm-incident-rule-provenance | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/feature-gates-11-v390-vlm-incident-rule-provenance.log |
| feature-gates | v390-vlm-evaluation-promotion-guard | PASS | ./server.sh verify-v390-vlm-evaluation-promotion-guard | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/feature-gates-12-v390-vlm-evaluation-promotion-guard.log |
| feature-gates | v390-vlm-promotion-trust-boundary | PASS | ./server.sh verify-v390-vlm-promotion-trust-boundary | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/feature-gates-13-v390-vlm-promotion-trust-boundary.log |
| feature-gates | v390-backup-recovery-handoff-validation | PASS | ./server.sh verify-v390-backup-recovery-handoff-validation | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/feature-gates-14-v390-backup-recovery-handoff-validation.log |
| feature-gates | v390-action-execution-deferral-decision | PASS | ./server.sh verify-v390-action-execution-deferral-decision | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/feature-gates-15-v390-action-execution-deferral-decision.log |
| feature-gates | v390-deferred-product-owner-signoff | PASS | ./server.sh verify-v390-deferred-product-owner-signoff | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/feature-gates-16-v390-deferred-product-owner-signoff.log |
| feature-gates | v390-conditional-field-ai-decisions | PASS | ./server.sh verify-v390-conditional-field-ai-decisions | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/feature-gates-17-v390-conditional-field-ai-decisions.log |
| feature-gates | v390-reid-readiness-consistency | PASS | ./server.sh verify-v390-reid-readiness-consistency | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/feature-gates-18-v390-reid-readiness-consistency.log |
| feature-gates | v390-onvif-source-view-atomicity | PASS | ./server.sh verify-v390-onvif-source-view-atomicity | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/feature-gates-19-v390-onvif-source-view-atomicity.log |
| feature-gates | v390-structure-stabilization-handoff | PASS | ./server.sh verify-v390-structure-stabilization-handoff | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/feature-gates-20-v390-structure-stabilization-handoff.log |
| feature-gates | v390-structure-stabilization-readiness | PASS | ./server.sh verify-v390-structure-stabilization-readiness | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/feature-gates-21-v390-structure-stabilization-readiness.log |
| feature-gates | v390-external-field-smoke-no-device-closure | PASS | ./server.sh verify-v390-external-field-smoke-no-device-closure | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/feature-gates-22-v390-external-field-smoke-no-device-closure.log |
| feature-gates | v390-truthfulness-status-vocabulary | PASS | ./server.sh verify-v390-truthfulness-status-vocabulary | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/feature-gates-23-v390-truthfulness-status-vocabulary.log |
| feature-gates | v390-analysis-registry-durable-write | PASS | ./server.sh verify-v390-analysis-registry-durable-write | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/feature-gates-24-v390-analysis-registry-durable-write.log |
| feature-gates | v390-ui-policy-v4-producer-contract | PASS | ./server.sh verify-v390-ui-policy-v4-producer-contract | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/feature-gates-25-v390-ui-policy-v4-producer-contract.log |
| feature-gates | v390-ui-visual-evidence-contract | PASS | ./server.sh verify-v390-ui-visual-evidence-contract | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/feature-gates-26-v390-ui-visual-evidence-contract.log |
| feature-gates | release-metadata | PASS | ./server.sh verify-release-metadata | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/feature-gates-27-release-metadata.log |
| feature-gates | docs-links | PASS | ./server.sh verify-docs-links | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/feature-gates-28-docs-links.log |
| feature-gates | docs-ui-assets | PASS | ./server.sh verify-docs-ui-assets | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/feature-gates-29-docs-ui-assets.log |
| feature-gates | feature-implementation-evidence | PASS | ./server.sh verify-feature-implementation-evidence | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/feature-gates-30-feature-implementation-evidence.log |
| feature-gates | project-inventory | PASS | ./server.sh verify-project-inventory | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/feature-gates-31-project-inventory.log |
| feature-gates | feature-inventory-coverage | PASS | ./server.sh verify-feature-inventory-coverage | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/feature-gates-32-feature-inventory-coverage.log |
| feature-gates | release-evidence-index | PASS | ./server.sh verify-release-evidence-index | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/feature-gates-33-release-evidence-index.log |
| feature-gates | script-inventory | PASS | ./server.sh verify-script-inventory | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/feature-gates-34-script-inventory.log |
| feature-gates | git-diff-check | PASS | git diff --check | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/feature-gates-35-git-diff-check.log |
| server-longrun-30 | server-longrun-30 | PASS | ./server.sh verify-v390-server-longrun --duration-minutes 30 --output-dir /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/server-longrun-30 | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/server-longrun-30.log |
| ui-environment-bootstrap | ui-environment-bootstrap | PASS | bootstrap acceptance-owned throwaway server/auth roles/Playwright storage-state | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/ui-environment-bootstrap.log |
| ui-environment-bootstrap | dependency-bootstrap-attestation | PASS |  |  |  |
| ui-environment-bootstrap | role-storage-state-generated-by-acceptance | PASS |  |  |  |
| ui-environment-bootstrap | self-contained-pid-port-artifact-ownership | PASS |  |  |  |
| ui-exact-424 | ui-exact-424 | FAIL | ./server.sh run-v390-ui-native-exact-cases --output-dir /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/ui-exact-424 --http-base http://127.0.0.1:61811 --role-state-map /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_v390_ui-UEUuvZ/role-state-map.json --server-log /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_v390_ui-UEUuvZ/media-server.log --runtime-descriptor /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_v390_ui-UEUuvZ/runtime-descriptor.json --build-path build-gst-onnx/media_server | 1 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/ui-exact-424.log |
| ui-server-cleanup | ui-server-cleanup | PASS | stop exact UI throwaway server and verify ports | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/ui-server-cleanup.log |
| cleanup | cleanup | FAIL | cleanup validation | 1 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/cleanup.log |
| report | report | PASS | write acceptance summary/report | 0 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717153927-36826/report.log |

# v3.9.0 Feature Completion Inventory

독자: MediaServer 개발/검증 에이전트. Lifecycle: v3.9.0 feature completion discovery와 개발 close-out 동안 유지되는 상세 source-of-truth. Source-of-truth 관계: `AGENTS.md`가 권한/테스트/보고 규칙을 우선하고, `docs/development-backlog.md`는 큰 phase 상태판이며, 이 문서는 작은 기능 단위의 완료 여부를 추적한다.

## Purpose

이 문서는 v1.0.0부터 v3.8.0까지 노출, 약속, 부분 구현된 기능 중 v4.0.0 구조 안정화 전에 닫아야 할 기능 gap을 전수 추적한다.

이 문서는 구현 완료 evidence가 아니다. 각 행은 해당 route/API/UI/function/verifier/test evidence가 생기고 통과해야 닫힌다.

## Disposition Vocabulary

| Disposition | 의미 | 개발 전 사용자 승인 |
| --- | --- | --- |
| required-development | v3.9 기능 완성 단계에서 반드시 개발해야 하는 항목 | discovery 보고 승인 후 진행 |
| candidate-development | 제품 완성도상 유용하지만 필수 여부를 사용자에게 확인해야 하는 항목 | 개별 승인 후 진행 |
| structure-stabilization-handoff | 기능 개발이 아니라 구조 안정화/리팩토링 단계로 넘길 항목 | 구조 안정화 계획 승인 후 진행 |
| excluded-non-scope | v3.9 범위 밖이거나 제품 경계/불변 조건을 넘는 항목 | 개발하지 않음 |
| closed-with-evidence | 구현/검증/evidence가 모두 확인되어 닫힌 항목 | 추가 개발 없음 |

## Test Area Vocabulary

테스트 영역은 AGENTS 기준 네 가지 `안정화`, `30분`, `120분`, `UI`만 사용한다.
wrapper, preflight, dry-run, field smoke, external credential, no-device는 별도 테스트 영역이 아니다.

| Stabilization | 30min | 120min | UI Fulltest |
| --- | --- | --- | --- |
| required/conditional/not-run/excluded | required/conditional/not-run/excluded | required/conditional/not-run/excluded | required/conditional/not-run/excluded |

## Discovery Table

| Feature ID | Source | Current State | Required Development | Completion Condition | Stabilization | 30min | 120min | UI Fulltest | v3.9 Disposition | Invariant Impact | Evidence / Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| V390-DISCOVERY-000 | approved design | inventory seed row | Create and verify this inventory before adding feature candidates | `verify-v390-feature-completion-inventory` passes and discovery rows are added before development | required | not-run | not-run | not-run | required-development | none | This seed row prevents an empty inventory from being mistaken for completed discovery. |
| V390-CLOSED-001 | `VERSION`, `CMakeLists.txt`, public entry docs, release metadata verifier | v3.9.0 source-only baseline and v3.8.0 latest-published boundary are wired | None for feature completion; keep the source/published boundary intact through later work | `verify-release-metadata`, `verify-v390-entry-baseline`, `verify-script-inventory`, and `git diff --check` pass after later inventory edits | required | not-run | not-run | not-run | closed-with-evidence | version/source boundary only | Closed setup item. Current source baseline is v3.9.0; latest published release remains v3.8.0. Published metadata verification is not run without approval. |
| V390-CLOSED-002 | `server.sh`, `scripts/internal/verify_v390_feature_completion_inventory.mjs`, release records/evidence | feature completion inventory scaffold and verifier command exist | None for scaffold; actual candidate approval and development remain separate | `verify-v390-feature-completion-inventory` passes and records state that feature discovery, implementation, UI fulltest, 30-minute, 120-minute, and published metadata are not run by this command | required | not-run | not-run | not-run | closed-with-evidence | no runtime/API/media behavior change | Closed setup item. This row is not evidence that any candidate feature below is implemented. |
| V390-REQ-001 | `docs/manual-ui-fulltest.md`, `docs/manual-ui-checklist.md`, `docs/manual-ui-result-template.md` | manual UI standards/checklist/template now identify v3.9.0 as current source/UI baseline and mark older v2.x/v3.x material as historical bridge | None | Manual UI docs identify v3.9.0 as the current source-only preparation baseline, old v2.x blocks are not used as current gates, and `verify-manual-ui-evidence` enforces the current gate | required | not-run | not-run | conditional | closed-with-evidence | docs/test evidence wording only | Closed by Required Closeout Step 4. Evidence: `docs/manual-ui-fulltest.md`, `docs/manual-ui-checklist.md`, `docs/manual-ui-result-template.md`, `scripts/internal/verify_manual_ui_evidence.mjs`. This is documentation/test-source completion, not UI execution. |
| V390-REQ-002 | `docs/manual-ui-fulltest.md`, `docs/manual-ui-checklist.md`, `docs/manual-ui-result-template.md`, `docs/v390-feature-completion-inventory.md` | long-test start conditions now reference v3.9 feature completion inventory, current project inventory, user approval, and AGENTS 7.6.2 conditions | None | Start-condition sections point to v3.9 inventory/release records/current UI mapping; old v2.x conditions are historical and no longer presented as current long-test start criteria | required | not-run | conditional | conditional | closed-with-evidence | test gate wording only | Closed by Required Closeout Step 5. 30/120/UI execution remains approval-gated and was not run by this closeout. |
| V390-REQ-003 | manual UI docs plus `docs/project-feature-test-inventory.md` | manual UI docs now delegate v3.5.0-v3.8.0 route/control/action UI surfaces to current project feature inventory rows | None | Manual UI docs and linked inventory cover v3.5-v3.8 UI/control/action IDs including v3.8 action pilot rows, and stale coverage cannot be mistaken for current UI execution evidence | required | not-run | not-run | conditional | closed-with-evidence | UI test-source coverage only | Closed by Required Closeout Step 6. Evidence bridge covers v3.5 `UI-080` through v3.8 `UI-107` plus related `CLIENT-*` rows. |
| V390-CAND-001 | `docs/onvif-credential-reference-policy.md`, `/ops/api/onvif/credential-provider-status`, `/ops/sources` | Ops-only sanitized credential provider status summary exists; primary provider `none`, fallback `in-memory-fixture`, persistent/external stores deferred | Closed with `sanitized-credential-provider-status-summary`: expose provider readiness/redaction status only, with no credential lookup, source/view write, persistent secret store, or external secret manager | `verify-v390-onvif-credential-provider-status` proves route/UI/artifact docs, provider readiness/redaction state, no secret/reference leakage, and docs/inventory/release-record wiring | required | not-run | not-run | conditional | closed-with-evidence | credential secrecy and redaction boundary | Closed by v3.9.0 (11). Evidence: `OpsV390OnvifCredentialProviderStatusSummaryJson`, `/ops/api/onvif/credential-provider-status`, `renderOnvifCredentialProviderStatus`, `UI-108`/`SRC-065`/`SAFE-203`/`OPS-170`. Credential lookup, source/view write, persistent secret store, external secret manager, UI fulltest, 30-minute/120-minute longrun, and field credential success were not run. |
| V390-CAND-002 | `src/ingress/onvif_live_import.cpp`, `src/ingress/product_ui_ops_sources_script.cpp`, `src/ingress/source_view_registry.cpp`, `src/ingress/webrtc_http_server.cpp` | ONVIF live import validates/form-applies a draft and reports `notSaved:true`; explicit source/view persistence is a separate operator flow | Closed with `manual-form-save-handoff` and hardened by V390-ADD1-05: operator save uses one `source:write` paired route with full prevalidation and compensating rollback instead of sequential source/view PUT | `verify-v390-onvif-source-view-atomicity` proves committed create/retry, invalid zero-write, injected second-file failure source rollback, concurrency no-mix, restart consistency and temp cleanup; decision verifier preserves notSaved/oneShot=false | required | not-run | not-run | conditional | closed-with-evidence | source registry write semantics | Hardened by V390-ADD1-05. Evidence: `UpsertOnvifSourceView`, `/ops/api/onvif/channels/{channelId}`, `saveChannelSourceViewPair`, `UI-109`/`SRC-066`/`SAFE-204`/`OPS-171`. Process-crash atomicity, ONVIF field success, UI fulltest, and longrun were not run. |
| V390-CAND-003 | `docs/vlm-rule-suggestion-candidates.md`, `/ops/api/vlm/rule-suggestion-drafts`, `/ops/api/vlm/rule-suggestion-draft-bridge`, `/lab/analysis/rules/{id}` | VLM rule suggestion workflow remains draft-only/manual-save; Development 15 now carries incident, candidate, and observation-context evaluation provenance through the generated rule document and save API | Closed with `ops-review-to-rule-draft-bridge` and hardened by Development 15 `incident-to-rule-provenance`: the optional server-validated `vlmProvenance` joins event/candidate/evaluation source with the generated rule ID and exact PUT route without automatic registry write | `verify-v390-vlm-incident-rule-provenance` proves actual candidate fetch, rule PUT/readback/registry preservation, generated ID/route mismatch no-write, privacy-field rejection boundary, while the existing draft verifiers preserve manual-save/no-provider-call behavior | required | not-run | not-run | conditional | closed-with-evidence | rule write/manual-approval and provenance integrity boundary | Hardened by v3.9.0 (17) Development 15. Evidence: `AppendVlmRuleSuggestionCandidateJson`, `opsRulesReadEventTemplateForm`, `ValidateVlmIncidentRuleProvenanceContract`, `UI-110`/`RULE-112`/`LAB-126`/`SAFE-213`/`OPS-180`. `evaluationSource.status=observation-context-only` does not claim a provider evaluation; auto save/apply, provider/runtime call, UI fulltest, 30-minute/120-minute longrun were not run. |
| V390-CAND-004 | `src/ingress/vlm_evaluation_promotion.cpp`, `docs/vlm-evaluation-result-workflow.md`, `docs/vlm-profile-storage.md`, `/ops/vlm` | evaluation API와 profile 저장이 동일 server-owned catalog를 사용하고 client-owned result/status를 허용하지 않음 | Closed with `server-verified-evaluation-promotion`: client request는 candidate ID/revision/digest만 제출하고 서버가 candidate result/provenance와 option/model/prompt binding을 검증·canonicalize한 뒤 저장하며 reload provenance 불일치 profile은 quarantine | `verify-v390-vlm-promotion-trust-boundary`가 14개 실제 HTTP positive/negative case, 1개 restart quarantine, canonical readback, rejected update no-write를 확인하고 `verify-v390-vlm-evaluation-promotion-guard`가 route/UI boundary를 확인 | required | not-run | not-run | conditional | closed-with-evidence | VLM evaluation integrity/default-off/provider-call boundary | Upgraded by V390-ADD1-03. Evidence: `ValidateVlmEvaluationPromotion`, `CanonicalizeStoredVlmProfileLocked`, `VlmEvaluationResultWorkflowJson`, `/ops/api/vlm/evaluation-results`, `/ops/api/vlm/profiles`, read-only `opsVlmEvaluationStatus`, `UI-111`/`LAB-123`/`SAFE-206`/`OPS-173`. Runtime/provider/sidecar call, UI fulltest, longrun were not run. |
| V390-CAND-005 | `docs/ops-backup-recovery.md`, source reliability handoff route/UI | source reliability handoff is an operator input, not production restore/cutover or automatic recovery evidence | Closed with `staging-restore-validation-checklist-result-handoff`: Ops handoff now exposes a staging restore checklist/result artifact contract for source registry, PublishedView, source health, and viewer scope validation | `verify-v390-backup-recovery-handoff-validation` proves `/ops/api/source-registry/staging-restore-validation-handoff`, `/ops/sources`, v3.3 handoff route, v3.4 staging harness command, no production restore, no automatic recovery, no registry/view write, and docs/inventory wiring are present | required | not-run | not-run | conditional | closed-with-evidence | backup/restore evidence boundary | Closed by v3.9.0 (15). Evidence: `OpsV390StagingRestoreValidationHandoffJson`, `/ops/api/source-registry/staging-restore-validation-handoff`, `renderStagingRestoreValidationHandoff`, `UI-112`/`SRC-067`/`SAFE-207`/`OPS-174`. Staging run result artifact, production restore, automatic recovery, UI fulltest, and longrun were not run. |
| V390-CAND-006 | v3.8 action/read-model routes in `src/ingress/webrtc_http_server.cpp` and v3.8 verification docs | v3.8 operator action system is a read-only pilot; source recheck, notice send, and rule apply are contract-only/not-run | Closed with `defer-all-action-writes`: approval-gated limited execution is not enabled in v3.9 Step 16, and all selected action writes remain deferred until a separately approved execution roadmap exists | `verify-v390-action-execution-deferral-decision` proves `/ops/api/actions/execution-deferral-decision`, `/ops` Action Control Workspace deferral UI, v3.8 action workspace/default-off explanation refs, no action execution, no source recheck, no client notice send, no rule apply, no request/approval/readiness/outcome/receipt persist, and docs/inventory wiring are present | required | not-run | not-run | conditional | closed-with-evidence | operator mutation and external side-effect boundary | Closed by v3.9.0 (16). Evidence: `OpsV390ActionExecutionDeferralDecisionJson`, `/ops/api/actions/execution-deferral-decision`, `renderV390ActionExecutionDeferralDecision`, `UI-113`/`EVT-087`/`SAFE-208`/`OPS-175`. Source recheck execution, client notice send, rule apply, external delivery, UI fulltest, and longrun were not run. |
| V390-CAND-007 | `scripts/internal/verify_ui_fulltest_one_shot.mjs`, `docs/manual-ui-fulltest.md` | closed with evidence/test gate schema wording | None | Wrapper output and docs make it impossible to read wrapper PASS as UI fulltest PASS, 30-minute PASS, 120-minute PASS, or manual evidence PASS | required | not-run | not-run | conditional | closed-with-evidence | test evidence truthfulness | Closed by v3.9.0 (7). Evidence: `scripts/internal/verify_ui_fulltest_one_shot.mjs` writes `wrapperResult`, `resultScope`, `uiFulltestEvidenceStatus`, `manualResultStatus`, `longrunStatus`, `evidenceBoundary`; `docs/manual-ui-fulltest.md` documents the boundary; `verify-v390-evidence-test-gate-prep` checks it. |
| V390-CAND-008 | `scripts/internal/verify_feature_inventory_coverage.mjs`, `docs/project-feature-test-inventory.md` | closed with covered/missing mapping wording | None | Inventory coverage verifier and docs state mapping coverage separately from execution PASS, and release reports do not use mapping coverage as runtime/test evidence | required | not-run | not-run | not-run | closed-with-evidence | test evidence truthfulness | Closed by v3.9.0 (8). Evidence: `scripts/internal/verify_feature_inventory_coverage.mjs` writes `coverageStatus: covered/missing` and `executionEvidenceStatus: not-execution-evidence`; `docs/project-feature-test-inventory.md` records the same boundary; `verify-v390-evidence-test-gate-prep` checks it. |
| V390-CLOSED-003 | `docs/stream-verification.md`, `scripts/internal/verify_v390_evidence_test_gate_prep.mjs` | 30-minute/120-minute AI-minimized runner criteria recorded | None | Longrun runner criteria specify one command, fixed phase order, stop-on-first-fail, later phase not-run, failure evidence fields, reproducible fixtures, cleanup/artifact policy, and no fifth AGENTS test category | required | not-run | not-run | not-run | closed-with-evidence | test evidence truthfulness | Closed by v3.9.0 (9). This is criteria/test-source evidence only; no 30-minute or 120-minute longrun was executed by this step. |
| V390-CLOSED-004 | `docs/manual-ui-fulltest.md`, `scripts/internal/verify_v390_evidence_test_gate_prep.mjs` | free UI automation adapter criteria recorded | None | UI automation criteria identify Playwright first, Selenium fallback, image fallback only for visual gaps, and route/viewport/theme/account-role/action/expected-actual/screenshot/trace-console/log/cleanup/manual-intervention failure report fields | required | not-run | not-run | conditional | closed-with-evidence | UI test evidence truthfulness | Closed by v3.9.0 (10). This is adapter criteria evidence only; no UI fulltest direct manipulation was executed by this step. |
| V390-CAND-009 | field smoke routes/docs, release evidence | field credential/endpoint/provider paths are redacted and approval-gated; successful real field smoke is not a default release feature | Closed with `approval-only-minimal-field-evidence-bridge`: external endpoint/credential/provider field runs are represented as approval-required minimal evidence contracts, and not-run/failed states cannot become release PASS | `verify-v390-conditional-field-ai-decisions` proves `/ops/api/field-evidence/bridge-decision`, `/ops` Field Evidence Bridge UI, ONVIF/external WHEP-TURN/cloud-VLM bridge decisions, minimal evidence fields, no field smoke, no endpoint/credential probe, no provider call, no raw material, and docs/inventory wiring are present | required | not-run | not-run | conditional | closed-with-evidence | external credential/endpoint/provider boundary | Closed by v3.9.0 (17). Evidence: `OpsV390FieldEvidenceBridgeDecisionJson`, `/ops/api/field-evidence/bridge-decision`, `renderV390FieldEvidenceBridgeDecision`, `UI-114`/`SRC-068`/`MEDIA-027`/`LAB-124`/`SAFE-209`/`OPS-176`. Field smoke, endpoint/credential probe, provider call, UI fulltest, and longrun were not run. |
| V390-CAND-010 | Re-ID appearance assist code/UI | Re-ID assist can be selected but default/fallback behavior remains no-op unless model/config/provenance is provided | Closed with `explicit-opt-in-provenance-gated-assist` and hardened by V390-ADD1-04: factory/API share server-owned regular-file, SHA format/read/match, trim provenance, OpenSSL·ONNX Runtime preflight and show deterministic NoOp reason when incomplete | `verify-v390-reid-readiness-consistency` runs no-OpenSSL/no-ONNX C++ capability matrices and 10 actual HTTP cases; `verify-v390-conditional-field-ai-decisions`, `verify-reid-advanced-tracking`, `verify-analysis-state` preserve opt-in/privacy/default-off boundaries | required | not-run | not-run | conditional | closed-with-evidence | model/runtime bundle and privacy boundary | Hardened by V390-ADD1-04. Evidence: `AppearanceModelReadiness`, `InspectAppearanceModelReadiness`, `OpsV390ReidAssistDecisionJson`, `/ops/api/analysis/reid-assist-decision`, `renderV390ReidAssistDecision`, `UI-115`/`LAB-125`/`SAFE-210`/`OPS-177`. Actual ONNX session success, identity search, UI fulltest, and longrun were not run. |
| V390-STRUCT-001 | `src/ingress/webrtc_http_server.cpp` | HTTP API, product UI route glue, auth, event helpers, source/action/VLM routes are concentrated in a 41,399-line translation unit | Move to structure stabilization as behavior-preserving route/API/UI ownership extraction | Stabilization plan defines extraction seams, existing routes/contracts remain byte-compatible where required, and current verifiers pass after each extraction slice | conditional | not-run | not-run | conditional | structure-stabilization-handoff | high API/UI/media-path regression risk | Direct evidence: `wc -l src/ingress/webrtc_http_server.cpp` reports 41,399 lines; file header states HTTP API and product UI are bundled. |
| V390-STRUCT-002 | `src/ingress/product_ui_page_scripts.cpp`, product UI script fragments | product UI workspaces for dashboard, commands, simulations, runtime, action/vlm/source panels are spread across large script generation units | Move to structure stabilization as behavior-preserving UI workspace/module split | UI script modules keep stable test IDs, no visible route/control regressions, and manual/UI static verifiers cover each split workspace | conditional | not-run | not-run | conditional | structure-stabilization-handoff | UI route/control regression risk | Direct evidence: `src/ingress/product_ui_page_scripts.cpp:576`, `:792` plus product UI source inventory. |
| V390-STRUCT-003 | source registry/read-model routes and `product_ui_ops_sources_script.cpp` | source registry, PublishedView, source health, handoff, and read-model status boundaries are spread across route/UI code | Move to structure stabilization as source registry read-model naming/status consolidation | Source registry write/read/PublishedView/health/handoff contracts have named modules and verifiers prove no route/schema drift | conditional | conditional | conditional | conditional | structure-stabilization-handoff | source registry and viewer-scope boundary | Direct evidence: `src/ingress/product_ui_ops_sources_script.cpp:1184`, `src/ingress/webrtc_http_server.cpp:39403`. |
| V390-STRUCT-004 | `docs/manual-ui-result-template.md` | historical v2.2/v2.4/v2.7/v2.9 result sections live in one current-looking template | Move to stabilization/docs cleanup as historical split or archive extraction | Current result template contains only current gate fields plus links to historical archives; old sections are not copied into new release results by accident | conditional | not-run | not-run | conditional | structure-stabilization-handoff | test evidence clarity | Direct evidence: `docs/manual-ui-result-template.md:87`, `:132`, `:354`. |
| V390-STRUCT-005 | VLM default-off/profile/runtime/provider docs | VLM default-off, profile storage, local runtime, cloud provider, and field smoke boundaries are documented across many files | Move to structure stabilization as a consolidated VLM contract index without changing runtime behavior | One VLM contract index links default-off, profile storage, provider field smoke, dry-run, and exclusion boundaries; verifiers still distinguish dry-run/default-off from real provider PASS | conditional | not-run | conditional | conditional | structure-stabilization-handoff | VLM provider/default-on boundary | Direct evidence: `docs/vlm-runtime-opt-in-contract.md:52-54`, `docs/vlm-cloud-provider-field-smoke-gate.md:73-91`, `docs/vlm-install-connection-dry-run.md:91-112`. |
| V390-EXCL-001 | ONVIF credential policy | persistent ONVIF credential/secret store is explicitly outside the current reference policy | Do not implement in v3.9 feature completion | Docs keep reference value/secret material out of API/UI/artifacts; any persistent secret store requires separate security design | excluded | excluded | excluded | excluded | excluded-non-scope | credential secrecy | Direct evidence: `docs/onvif-credential-reference-policy.md:34`, `:95`. |
| V390-EXCL-002 | README and VLM runtime/provider docs | binary/runtime/model bundle and VLM default-on are explicitly excluded from the public baseline | Do not implement model/runtime bundle or default-on VLM in v3.9 | README/docs continue to say source-only, default-off, no bundle/default-on/provider success guarantee | excluded | excluded | excluded | excluded | excluded-non-scope | model/runtime/provider boundary | Direct evidence: `README.md:12`, `:19`, `:32-44`, `docs/vlm-runtime-opt-in-contract.md:36-54`. |
| V390-EXCL-003 | v3.8 action pilot docs/routes | automatic source recheck, client notice send, and rule apply are not part of the current pilot | Do not add automatic mutation without explicit product approval | Any action mutation remains candidate-only; read-only pilot docs are clear and no automatic side effect is introduced | excluded | excluded | excluded | excluded | excluded-non-scope | external side-effect boundary | Direct evidence: `src/ingress/webrtc_http_server.cpp:11840-12320`, `docs/stream-verification.md:64-77`. |
| V390-EXCL-004 | client action notice preview and viewer-facing scripts/routes | client/viewer surfaces intentionally avoid raw/debug/action internals | Do not expose raw debug JSON, source URLs, credentials, or action internals to viewer/client UI | Viewer/client routes continue to expose only scoped/sanitized metadata; Ops-only internals remain behind Ops/admin scopes | excluded | excluded | excluded | excluded | excluded-non-scope | viewer privacy and scope boundary | Direct evidence: `src/ingress/webrtc_http_server.cpp:5561`, `:6635`, `src/ingress/product_ui_client_scripts.cpp:480`, `:952`. |
| V390-EXCL-005 | Lab evidence API | destructive lab evidence delete remains policy-disabled | Do not implement evidence delete as a v3.9 feature | Evidence retention/delete policy remains explicit; disabled delete route is not treated as an unfinished product gap | excluded | excluded | excluded | excluded | excluded-non-scope | evidence retention boundary | Direct evidence: `src/ingress/webrtc_http_server.cpp:40255`. |
| V390-EXCL-006 | release evidence and field smoke policy | external endpoint/provider/credential success is not a default release PASS | Do not report field smoke success unless a user-approved field run actually executes | Release evidence keeps field smoke as 미실행/조건부/제외 unless explicit approval and sanitized run evidence exist | excluded | excluded | excluded | excluded | excluded-non-scope | release evidence truthfulness | Direct evidence: `docs/release-evidence-index.md` v3.9 not-run rows and `docs/vlm-cloud-provider-field-smoke-gate.md:89-91`. |

## Discovery Sources To Check

| Source Group | Files / Targets | Status | Notes |
| --- | --- | --- | --- |
| Public entry docs | `README.md`, `README.en.md`, `docs/README.md`, `docs/en/README.md` | checked | v3.9.0 source-only and v3.8.0 latest-published boundary are now covered by baseline rows; bundle/default-on exclusions remain explicit. |
| Roadmap and policy | `docs/development-backlog.md`, `docs/release-policy.md`, `docs/versioning-policy.md` | checked | v3.9 board and release/test authority were checked; candidate rows above separate development, structure stabilization, and excluded scope. |
| Test source-of-truth | `docs/stream-verification.md`, `docs/project-feature-test-inventory.md`, `docs/release-test-records.md`, `docs/release-evidence-index.md` | checked | v3.9 verifier records exist; mapping PASS and wrapper PASS are tracked as evidence-wording candidates where they could be overread. |
| Product UI docs | `docs/ui-guide.md`, `docs/manual-ui-fulltest.md`, `docs/manual-ui-checklist.md`, `docs/manual-ui-result-template.md` | checked | Manual UI docs now pin v3.9.0 current target, long/UI start conditions, and the v3.5-v3.8 UI coverage bridge; `V390-REQ-001` through `V390-REQ-003` are closed-with-evidence. |
| Server routes/API | `src/ingress/webrtc_http_server.cpp`, `src/ingress/*.cpp`, `include/ingress/*.h` | checked | High-risk route/API clusters were scanned directly; the 41,399-line route/UI translation unit is assigned to structure stabilization, not feature completion. |
| Product UI source | `src/ingress/product_ui_*.cpp`, `src/ingress/product_ui_*.h` | checked | Product UI workspace/source/client script surfaces were scanned for partial panels, old controls, and scope boundaries. |
| Analysis/core/media | `src/analysis/*`, `include/analysis/*`, `src/core/*`, `include/core/*` | checked | Analysis/VLM/Re-ID hooks were scanned for model/runtime/provider gaps; model/runtime bundle and default-on behavior remain excluded. |
| Verifier dispatch | `server.sh`, `scripts/internal/verify_*.mjs`, `scripts/internal/verify_*.sh`, `scripts/internal/verify_*.py` | checked | v3.9 command dispatch, script inventory, feature inventory coverage, UI wrapper, and release metadata boundaries were checked. |

## User Review Output

Review-ready status: `ready-for-user-review`
Approval status at review gate: `pending-user-approval`
Feature development status at review gate: `blocked-before-user-approval`

Required development list: `V390-REQ-001`, `V390-REQ-002`, `V390-REQ-003`

Original candidate development review list: `V390-CAND-001`, `V390-CAND-002`, `V390-CAND-003`, `V390-CAND-004`, `V390-CAND-005`, `V390-CAND-006`, `V390-CAND-007`, `V390-CAND-008`, `V390-CAND-009`, `V390-CAND-010`

Current active candidate development list: `없음`

Closed candidate development list: `V390-CAND-001`, `V390-CAND-002`, `V390-CAND-003`, `V390-CAND-004`, `V390-CAND-005`, `V390-CAND-006`, `V390-CAND-007`, `V390-CAND-008`, `V390-CAND-009`, `V390-CAND-010`

Structure handoff list: `V390-STRUCT-001`, `V390-STRUCT-002`, `V390-STRUCT-003`, `V390-STRUCT-004`, `V390-STRUCT-005`

Excluded/non-scope list: `V390-EXCL-001`, `V390-EXCL-002`, `V390-EXCL-003`, `V390-EXCL-004`, `V390-EXCL-005`, `V390-EXCL-006`

Next development order after approval: `V390-REQ-001` -> `V390-REQ-002` -> `V390-REQ-003`

Future candidate-development rows remain blocked until the user approves each candidate or approves a candidate batch.

## Required Closeout Output

Required closeout status: `closed-with-evidence`

Closed required development list: `V390-REQ-001`, `V390-REQ-002`, `V390-REQ-003`

Next development order after Required Closeout: roadmap상 바로 다음 항목은 `V390-CAND-007`입니다. 그 이후 항목은 사용자가 다음 카테고리 또는 번호를 별도로 승인한 경우에만 진행합니다.

Future candidate-development rows remain blocked until the user approves each candidate or approves a candidate batch.

## Evidence/Test Gate and Test Model Prep Output

Approved scope: `/goal v3.9.0 (3) Evidence/Test Gate, Test Model Prep`

Closed approved items: `V390-CAND-007`, `V390-CAND-008`, `V390-CLOSED-003`, `V390-CLOSED-004`

Verifier: `./server.sh verify-v390-evidence-test-gate-prep`

Boundaries:

- UI wrapper/result schema closeout is not UI 풀테스트 직접 조작 evidence.
- Feature inventory coverage wording closeout is not runtime/test execution evidence.
- AI-minimized server longrun runner criteria are not 30분/120분 longrun execution evidence.
- UI automation adapter criteria are not UI 풀테스트 PASS evidence.

## Structure Stabilization Handoff Output

Structure handoff status: `handoff-planned-with-evidence`

Handoff plan: `docs/superpowers/plans/2026-07-08-v390-structure-stabilization-handoff.md`

Verifier: `./server.sh verify-v390-structure-stabilization-handoff`

Handoff list: `V390-STRUCT-001`, `V390-STRUCT-002`, `V390-STRUCT-003`, `V390-STRUCT-004`, `V390-STRUCT-005`

Structure implementation status: `not-run-by-this-step`

Development 17 readiness status: `ready-after-v3.9-release-and-explicit-approval`

Execution branch: `v4.0.0`

Branch creation status: `not-performed`

Readiness contract: `test/fixtures/v390_structure_stabilization_readiness.json`

Readiness verifier: `./server.sh verify-v390-structure-stabilization-readiness`

Boundary:

- Do not treat this handoff as route/API/UI extraction completion.
- Do not treat this handoff as manual UI template archive split completion.
- Do not treat this handoff as VLM contract index implementation completion.
- This handoff is not UI 풀테스트 직접 조작, 30분/120분 longrun, published metadata, PR/main/tag/GitHub Release evidence.
- Development 17 readiness is not actual route/API/UI extraction or a created `v4.0.0` branch.

## Review Gate

Discovery is not complete until:

- every source group above is marked checked
- every candidate has one of the approved dispositions
- required/candidate development rows have concrete completion conditions
- test area columns are filled with `required`, `conditional`, `not-run`, or `excluded`
- invariant impact is explicitly recorded
- the user reviews and approves the required/candidate development list

Until this review gate passes, this file remains a discovery tracking scaffold only. It must not be cited as proof that discovery is complete, that a feature is implemented, or that any test area has passed.

The review-ready output above does not mean the user has approved feature development.

## Deferred Product Owner Sign-off (Development 16)

Approval authority: `user-approved-owner-role-assignment`

Approval source: `/goal v3.9.0 (17) Development 16`

Approval date: `2026-07-11`

Owner identity policy: owner role은 개인 이름을 추정하지 않고 제품 책임 역할로 고정합니다.
실제 개인 배정이 필요한 조직 운영 작업은 이 저장소의 완료 주장 범위가 아닙니다.

| Deferred item | Owner role | v3.9 decision | 직접 근거 | 재개 조건 요약 |
| --- | --- | --- | --- | --- |
| `action-execution` | `Product Owner` | `excluded-from-v3.9` | v3.8/v3.9 action workspace는 read-only/default-off이며 source recheck, client notice send, rule apply의 rollback·audit·authorization 제품 계약이 없음 | 실행형 roadmap, Security 승인, execution/rollback/UI/longrun evidence 계획 |
| `persistent-credential-store` | `Security Owner` | `excluded-from-v3.9` | sanitized provider status와 in-memory fixture만 존재하고 persistent secret backend threat model·rotation·audit·recovery 정책이 미승인 | secret backend/threat model, rotation·audit·recovery, 비노출 negative/integration test 승인 |
| `real-external-field-smoke` | `Release Owner` | `deferred-until-approved-field-run` | TURN/WHEP endpoint·credential, ONVIF 실기기, 외부 provider 환경이 제공되지 않아 실제 접속 미실행 | endpoint/실기기/credential, 실행 승인, sanitized artifact·cleanup·실패 중단 기준 |
| `external-vlm-provider-call` | `Privacy and Security Owner` | `excluded-from-v3.9` | privacy transfer·retention·redaction·비용·provider 장애 정책과 credential이 미승인 | privacy/security 승인, provider 환경, redaction negative와 field 계획 |
| `model-backed-reid-session` | `Product and ML Owner` | `excluded-from-v3.9` | provenance-gated preflight와 deterministic no-op만 보장하고 model bundle·license/privacy·정확도·실환경 기준이 미확정 | model/license/accuracy, privacy 경계, 실제 ONNX session/performance/field 계획 |

Machine-readable source: `test/fixtures/v390_deferred_product_owner_signoff.json`

Decision boundary: 모든 항목에서 `implementationExecuted=false`, `fieldPassClaimed=false`,
`releasePassClaimed=false`입니다. 이 owner sign-off는 구현·field smoke·UI 풀테스트·30분/120분
longrun·published metadata·release action PASS가 아닙니다.

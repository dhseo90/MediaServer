# v3.9.0 Structure Stabilization Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** v3.9.0에서 닫은 기능 동작을 바꾸지 않고 REVIEW4-64 구조 안정화를 현재 v3.9.0 branch에서 실행할 route/API/UI/docs/VLM 경계를 작업 가능한 단위로 고정한다.

**Architecture:** 이 계획은 behavior-preserving stabilization handoff다. 새 product route, write path, UI control, schema, media path를 만들지 않고, 기존 대형 translation unit과 문서 source-of-truth를 작은 소유권 단위로 나누기 위한 순서와 검증만 정의한다.

**Tech Stack:** C++17, GStreamer/ONNX 기반 MediaServer, `server.sh` verifier dispatch, Node.js static verifier, Markdown release/test evidence.

---

## Handoff Boundary

이 문서는 `V390-STRUCT-001`~`V390-STRUCT-005`의 실행 계획이며 구조 안정화 구현 완료 evidence가 아닙니다. 최신 사용자 승인에 따라 REVIEW4-50~63을 모두 닫은 뒤 현재 `v3.9.0` branch에서 REVIEW4-64의 각 task를 TDD로 실행합니다.

대상 구조 항목:

- `V390-STRUCT-001`: `src/ingress/webrtc_http_server.cpp` route/API/UI ownership extraction
- `V390-STRUCT-002`: product UI script workspace split
- `V390-STRUCT-003`: source registry read-model naming/status consolidation
- `V390-STRUCT-004`: manual UI result template archive split
- `V390-STRUCT-005`: VLM contract index consolidation

불변 조건: do not change Event POST payload, WebRTC DataChannel, SSE/WS metadata, RTSP/WebRTC media path, Auth/Role/Scope, SourceRegistry/PublishedView, or Rule/Profile payload contracts.

Evidence boundary: UI 풀테스트 직접 조작, 30분/120분 longrun, published metadata, PR/main/tag/GitHub Release evidence가 아닙니다.

## Development 17 Structure Stabilization Readiness

Execution branch: `v3.9.0`

Source release: `v3.9.0`

Current v3.9 refactor execution: `not-run`

Branch creation: `not-performed`

Required start authority: `approved-by-latest-user-instruction`

새 branch는 만들지 않습니다. 사용자는 REVIEW4-50~63 완료 뒤 현재 `v3.9.0` branch에서 64번
actual refactor를 실행하고 v4.0.0 이관을 취소하도록 명시 승인했습니다. Base decision commit은
`027678bab9ef75f809c1aeac2061d785c5f6f8b2`이며, 50~63의 모든 후속 commit, clean worktree,
baseline build·exact inventory·9개 preserved contract verifier·`git diff --check` PASS가 공통
entry 조건입니다. 64 완료 뒤에만 승인된 REVIEW4-65 final independent acceptance를 실행합니다.

Machine-readable target/readiness source: `test/fixtures/v390_structure_stabilization_readiness.json`

Machine-readable actual graph source: `test/fixtures/v390_actual_module_dependency_graph.json`

### Current actual graph baseline (V390-REVIEW3-48)

현재 graph는 목표 architecture를 이미 만족한다는 선언이 아닙니다. `src`/`include`의 C++ 148개
파일을 ordered exact-owner rule로 9개 owner에 모두 연결하고, CMake의 production cpp는 선언 74개,
기본 YouTube OFF active 73개가 하나의 `media_server` executable target에 들어가는 상태를 기록합니다. Internal module library/target
separation은 `false`입니다.

| Actual graph 항목 | 직접 확인 값 | 경계 |
| --- | ---: | --- |
| production C++ file | 148 | test/docs 제외, `.cpp`/`.h` actual path |
| CMake production cpp | declared 74/default active 73 | optional YouTube source 경계를 포함해 중복/누락 0 |
| declared/actual owner | 9/9 | 각 owner에 actual file 1개 이상 |
| CMake target | 1 | `media_server`; 9 owner가 한 executable에 혼재 |
| observed cross-module include direction | 32 | direction별 witness count/hash 고정 |
| target architecture 위반 direction | 25 | current debt baseline이며 허용 완료가 아님 |
| legacy core 역의존 exact edge | 3 | session/source factory에서 transport/application/domain으로 향함 |
| SCC | 8-owner 1개 | Ops route owner만 SCC 밖; refactor 미실행 |

`webrtc_http_server.cpp` 42,897줄은 transport primary owner에 있으나 Ops/application/domain/UI/DTO
책임을 함께 포함하고, `product_ui_page_scripts.cpp` 10,217줄은 product UI primary owner 안에서 여러
workspace를 함께 포함합니다. 이 mixed ownership은 숨기지 않고 actual graph debt로 기록합니다.

각 6개 slice는 `sliceBindings`의 actual entry owner와 exit graph rule에 연결됩니다. 새 target-violation
direction, witness count/hash drift, CMake source/link/target drift, SCC drift, unclassified file이 생기면
readiness verifier가 실패합니다. Current 25개 위반과 8-owner SCC는 refactor 완료 evidence가 아닙니다.

### Structure execution scope decision (V390-REVIEW4-51)

Decision: `execute-actual-refactor-in-v3.9.0-after-review4-50-63`

v3.9 mode: `approved-actual-refactor-after-review4-50-63`

Decision status: `approved-scheduled`

Implementation status: `not-executed`

Machine-readable decision: `test/fixtures/v390_structure_execution_scope_decision.json`

Actual graph는 target 위반 direction 25개, 8-owner SCC, internal target separation false이며 가장 큰 mixed
owner 파일은 42,897줄입니다. 기존 release-line threshold(위반 0, SCC 1 owner, mixed file 15,000줄,
separated target 필요)를 모두 넘는 고위험 상태를 숨기지 않습니다. 사용자는 이 위험을 6개 독립 slice,
stop-on-first-fail, rollback commit, preserved contract hard gate로 통제하는 조건으로 v3.9 실행을
명시 승인했습니다.

REVIEW4-50~63 완료 뒤 behavior-preserving production source extraction, CMake internal target separation,
legacy dependency 제거, route/API/UI handler relocation을 아래 6개 slice 안에서 허용합니다. Public API,
EventRecord/Event POST, WebRTC DataChannel, SSE/WS, RTSP/WebRTC media path, Auth/Role/Scope,
SourceRegistry/PublishedView, Rule/Profile, product route/control/DOM/user workflow 변화는 금지합니다.
이 결정 완료는 refactor 실행이나 REVIEW4-65 acceptance PASS evidence가 아닙니다.

## Module Boundary and Dependency Direction

| Module owner | 책임 | 허용 의존성 방향 |
| --- | --- | --- |
| transport/auth adapter | HTTP parsing, principal guard, status/cache/error response | application service interface, stable DTO로만 향함 |
| Ops route groups | ONVIF/VLM/action/field/source/rule route adapter | application service interface, stable DTO로만 향함 |
| product UI workspaces | HTML/JS renderer, route string, DOM ID, `data-testid` | stable DTO/route contract로만 향함 |
| application services | HTTP/DOM을 모르는 use-case orchestration | domain/registry owner와 analysis service로만 향함 |
| domain/registry owners | SourceRegistry, PublishedView, Rule/Profile persistence invariant | core utility로만 향함 |
| analysis services | VLM observation, VA, tracking, Re-ID | domain/registry와 core media interface로만 향함 |
| core media interfaces | RTSP/WebRTC/GStreamer lifecycle | core utility로만 향함 |
| stable contract DTOs | route/payload/media contract value | 다른 production owner에 의존하지 않음 |
| core utilities | process/stream key/shared primitive | 다른 production owner에 의존하지 않음 |

허용 방향은 UI/transport → application service → domain·analysis → core입니다.
analysis/core/media -> ingress/product UI 의존 금지, domain/registry → HTTP·DOM type 의존 금지,
product UI → persistence file/registry internal 의존 금지, production → test fixture/docs 의존 금지를
강제합니다. 역방향 또는 circular dependency가 생기면 해당 slice는 즉시 실패합니다.

## Contract Preservation Matrix

| Contract ID | 보존 기준 | 대표 gate |
| --- | --- | --- |
| `event-post-payload` | field/type/freeze payload 변경 금지 | `verify-event-post`, `verify-v290-final-contract-freeze` |
| `webrtc-datachannel-metadata` | DataChannel metadata schema 변경 금지 | `verify-webrtc-va-metadata`, `verify-v290-final-contract-freeze` |
| `sse-ws-metadata` | SSE/WS metadata field/type 변경 금지 | `verify-sse-metadata`, `verify-ws-metadata` |
| `rtsp-webrtc-media-path` | GStreamer/RTSP/WebRTC lifecycle·codec path 변경 금지 | `build`, `verify-va-replay` |
| `auth-role-scope` | principal guard, role, scope 결과 변경 금지 | `verify-auth-regression-matrix` |
| `source-registry-published-view` | registry/view identity, paired write, restart 의미 변경 금지 | `verify-v390-onvif-source-view-atomicity`, backup/recovery gate |
| `rule-profile-payload` | Rule/Profile optional/required payload와 validation 의미 변경 금지 | provenance/promotion trust gate |
| `http-route-status-error` | route, method, status, cache, error body 의미 변경 금지 | route별 HTTP verifier |
| `product-ui-dom-test-id` | route label, control behavior, DOM ID, `data-testid` 변경 금지 | Ops/rule/static/coverage gate |

각 contract는 `changeAllowed=false`입니다. 구조 이동이 response/status/payload/UI contract를 바꾸어야
한다면 리팩터링 slice가 아니라 별도 product change로 중단하고 사용자 승인을 다시 받습니다.

## Fixed Refactoring Slice Order

| 순서 | Slice ID | 범위 | 완료 경계 |
| ---: | --- | --- | --- |
| 1 | `baseline-and-ownership-map` | route/module owner catalog와 golden baseline만 추가 | handler/response 이동 없음, baseline PASS |
| 2 | `pure-json-builder-extraction` | side effect 없는 JSON/DTO builder 한 family | route guard/status/schema byte 의미 보존 |
| 3 | `route-handler-group-extraction` | 한 번에 한 Ops route group | auth/cache/error/write owner 보존 |
| 4 | `product-ui-workspace-split` | 한 번에 한 renderer family와 상태 | route string/DOM/test ID 보존 |
| 5 | `source-read-model-boundary` | source read owner와 write owner 명명/분리 | 새 write route/file owner 금지 |
| 6 | `docs-template-and-vlm-index` | current/historical UI template 경계와 단일 VLM index | historical evidence 보존, policy 중복 금지 |

순서를 건너뛰거나 여러 route/renderer family를 한 커밋에 섞지 않습니다. 각 slice는 이전 slice의
검증·기록·사용자 커밋 승인이 닫힌 뒤에만 시작합니다.

## Entry, Exit, and Stop Gates

공통 entry gate:

- 최신 사용자 `approved-by-latest-user-instruction`, REVIEW4-50~63 완료, clean `v3.9.0` branch
- v3.9.0 correctness를 포함한 base commit, clean worktree, 한 slice의 allowed file set
- baseline build, exact inventory, 해당 contract verifier, 테스트 필요성 판정표 PASS

공통 exit gate:

- allowed file set과 한 module/route/renderer family만 변경
- build, slice별 targeted verifier, contract freeze, `git diff --check` PASS
- 임시 산출물/port/process cleanup, roadmap/evidence와 영향·회귀 가능성 기록

stop gate:

- schema/payload/status/auth/media/DOM/test ID/registry write 의미 drift
- forbidden/circular dependency 또는 새 write owner
- build/verifier/cleanup/diff failure

`first failure stops every later slice`. 실패 뒤 단계는 모두 `건너뜀`으로 기록하며 현재
Development 17은 readiness만 확정하고 실제 source extraction이나 branch 생성은 하지 않습니다.

## File Structure

- Modify later: `src/ingress/webrtc_http_server.cpp`
  - Current route/API/UI glue concentration owner. Future work extracts named route groups and JSON builders without changing responses.
- Modify later: `src/ingress/product_ui_page_scripts.cpp`
  - Ops dashboard/rules/VLM/action workspace script concentration owner. Future work splits stable workspace renderers while preserving test IDs.
- Modify later: `src/ingress/product_ui_ops_sources_script.cpp`
  - Source registry, PublishedView, source health, restore/field handoff UI concentration owner.
- Modify later: `docs/manual-ui-result-template.md`
  - Current manual UI result fields remain current-only; historical v2.x/v3.x material moves behind archive links or appendix boundaries.
- Modify later: VLM docs under `docs/vlm-*.md`
  - A single contract index should link default-off, profile storage, provider field smoke, dry-run, and exclusion boundaries.
- Verify now: `scripts/internal/verify_v390_structure_stabilization_handoff.mjs`
  - Static gate for this handoff plan and release/test records.

### Task 1: Route/API Ownership Extraction Map

**Files:**
- Modify later: `src/ingress/webrtc_http_server.cpp`
- Verify before/after: existing v3.9 verifier family and `./server.sh verify-v390-structure-stabilization-handoff`

- [ ] **Step 1: Write the failing ownership-map test**

```js
// scripts/internal/verify_v400_route_ownership_map.mjs
assertIncludes(routeCatalog, "/ops/api/onvif/credential-provider-status", "ONVIF route group");
assertIncludes(routeCatalog, "/ops/api/vlm/rule-suggestion-draft-bridge", "VLM route group");
assertIncludes(routeCatalog, "/ops/api/actions/execution-deferral-decision", "actions route group");
assertIncludes(routeCatalog, "/ops/api/field-evidence/bridge-decision", "field evidence route group");
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `node scripts/internal/verify_v400_route_ownership_map.mjs`

Expected: FAIL because no route ownership map module exists yet.

- [ ] **Step 3: Extract only named ownership metadata**

Create a read-only route catalog helper or comments-backed catalog first. Do not move handler logic until the catalog passes.

- [ ] **Step 4: Verify behavior is unchanged**

Run: `./server.sh verify-v390-onvif-credential-provider-status`, `./server.sh verify-v390-vlm-rule-suggestion-draft-bridge`, `./server.sh verify-v390-action-execution-deferral-decision`, `./server.sh verify-v390-conditional-field-ai-decisions`, `git diff --check`.

Expected: all PASS; response schema and route guards unchanged.

### Task 2: Product UI Workspace Split Map

**Files:**
- Modify later: `src/ingress/product_ui_page_scripts.cpp`
- Modify later: focused `src/ingress/product_ui_*` script units if the split is approved

- [ ] **Step 1: Write a failing UI workspace split verifier**

```js
assertIncludes(scriptModules, "renderV390ActionExecutionDeferralDecision", "action workspace renderer");
assertIncludes(scriptModules, "renderV390FieldEvidenceBridgeDecision", "field evidence renderer");
assertIncludes(scriptModules, "renderV390ReidAssistDecision", "Re-ID renderer");
assertIncludes(scriptModules, "stable test id preservation", "test id boundary");
```

- [ ] **Step 2: Run the verifier and confirm RED**

Run: `node scripts/internal/verify_v400_product_ui_workspace_split.mjs`

Expected: FAIL because the module split catalog is not present yet.

- [ ] **Step 3: Split one renderer family at a time**

Move one renderer family and its state variables together. Keep DOM IDs, `data-testid`, route labels, and status text unchanged unless a later test explicitly requires a change.

- [ ] **Step 4: Verify UI static gates**

Run: `./server.sh verify-ops-client-ui`, `./server.sh verify-rule-ui`, relevant v3.9 verifier, and `git diff --check`.

Expected: all PASS. This is not UI 풀테스트 직접 조작 evidence.

### Task 3: Source Registry Read-model Boundary Map

**Files:**
- Modify later: `src/ingress/product_ui_ops_sources_script.cpp`
- Modify later: source registry route helpers under the existing ingress ownership boundary

- [ ] **Step 1: Write a failing source read-model verifier**

```js
assertIncludes(sourceBoundary, "SourceRegistry read", "source read boundary");
assertIncludes(sourceBoundary, "PublishedView read", "published view read boundary");
assertIncludes(sourceBoundary, "source health read", "source health boundary");
assertIncludes(sourceBoundary, "handoff read-only", "handoff boundary");
```

- [ ] **Step 2: Run the verifier and confirm RED**

Run: `node scripts/internal/verify_v400_source_registry_read_model_boundary.mjs`

Expected: FAIL because the boundary map has not been created.

- [ ] **Step 3: Create the boundary map before extraction**

Define read/write ownership names and map each existing route/UI panel to one owner. Do not create a new write route.

- [ ] **Step 4: Verify no write/schema drift**

Run: `./server.sh verify-v390-onvif-live-import-persist-decision`, `./server.sh verify-v390-backup-recovery-handoff-validation`, `./server.sh verify-feature-inventory-coverage`, `git diff --check`.

Expected: all PASS.

### Task 4: Manual UI Result Template Archive Plan

**Files:**
- Modify later: `docs/manual-ui-result-template.md`
- Modify later if approved: historical archive docs under `docs/release-artifacts/` or a stable docs appendix

- [ ] **Step 1: Write a failing archive-boundary verifier**

```js
assertIncludes(template, "current gate fields only", "current template boundary");
assertIncludes(template, "historical archive link", "historical archive boundary");
assertNotIncludes(currentTemplateSection, "v2.2");
assertNotIncludes(currentTemplateSection, "v2.4");
```

- [ ] **Step 2: Run the verifier and confirm RED**

Run: `node scripts/internal/verify_v400_manual_ui_result_template_archive.mjs`

Expected: FAIL until the template exposes a current-only section and archive boundary.

- [ ] **Step 3: Split historical material without deleting evidence**

Keep historical evidence discoverable, but prevent old sections from being copied into new current release results.

- [ ] **Step 4: Verify docs and manual UI gates**

Run: `./server.sh verify-manual-ui-evidence`, `./server.sh verify-docs-links`, `./server.sh verify-feature-inventory-coverage`, `git diff --check`.

Expected: all PASS.

### Task 5: VLM Contract Index Consolidation Plan

**Files:**
- Modify later: `docs/vlm-runtime-opt-in-contract.md`
- Modify later: `docs/vlm-profile-storage.md`
- Modify later: `docs/vlm-cloud-provider-field-smoke-gate.md`
- Modify later: `docs/vlm-install-connection-dry-run.md`
- Create later only if approved: `docs/vlm-contract-index.md`

- [ ] **Step 1: Write a failing VLM contract index verifier**

```js
assertIncludes(vlmIndex, "default-off", "runtime default boundary");
assertIncludes(vlmIndex, "profile storage", "profile boundary");
assertIncludes(vlmIndex, "field smoke", "provider field boundary");
assertIncludes(vlmIndex, "dry-run is not provider PASS", "dry-run boundary");
```

- [ ] **Step 2: Run the verifier and confirm RED**

Run: `node scripts/internal/verify_v400_vlm_contract_index.mjs`

Expected: FAIL because the consolidated index is not present yet.

- [ ] **Step 3: Add the index or consolidate links in an existing source-of-truth**

Prefer a single stable index only if it avoids duplication. Do not copy long policy text into multiple files.

- [ ] **Step 4: Verify VLM boundary gates**

Run: `./server.sh verify-v390-vlm-rule-suggestion-draft-bridge`, `./server.sh verify-v390-vlm-evaluation-promotion-guard`, `./server.sh verify-v390-conditional-field-ai-decisions`, `./server.sh verify-docs-links`, `git diff --check`.

Expected: all PASS.

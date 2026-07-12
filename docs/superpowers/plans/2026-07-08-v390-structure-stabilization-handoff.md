# v3.9.0 Structure Stabilization Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** v3.9.0에서 닫은 기능 동작을 바꾸지 않고 REVIEW4-64 구조 안정화를 현재 v3.9.0 branch에서 실행할 route/API/UI/docs/VLM 경계를 작업 가능한 단위로 고정한다.

**Architecture:** 이 계획은 behavior-preserving stabilization handoff다. 새 product route, write path, UI control, schema, media path를 만들지 않고, 기존 대형 translation unit과 문서 source-of-truth를 작은 소유권 단위로 나누기 위한 순서와 검증만 정의한다.

**Execution status:** `approved-scheduled-after-review4-50-63`; actual REVIEW4-64 implementation은 `not-executed`입니다.

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

`first failure stops every later slice`. 실패 뒤 단계는 모두 `건너뜀`으로 기록합니다. 과거
Development 17은 readiness만 확정했고 실제 source extraction이나 branch 생성을 하지 않았습니다.
최신 결정은 새 branch 없이 현재 `v3.9.0`에서 REVIEW4-64를 실행하는 것이지만, 50~63 완료와
공통 entry gate 전에는 여전히 `not-executed`이며 이 계획 자체도 refactor 완료 evidence가 아닙니다.

## File Structure

- REVIEW4-64 future production owner: `src/ingress/webrtc_http_server.cpp` and focused
  composition-root/DTO/route units created by one approved slice at a time.
- REVIEW4-64 future UI owner: `src/ingress/product_ui_page_scripts.cpp` and focused
  `src/ingress/product_ui_*` units, with route strings, DOM IDs, `data-testid`, and behavior preserved.
- REVIEW4-64 future source read-model owner: `src/ingress/product_ui_ops_sources_script.cpp`
  and the existing SourceRegistry/PublishedView route boundary, without a new write owner.
- REVIEW4-64 future docs/VLM owner: `docs/manual-ui-result-template.md` and current
  `docs/vlm-*.md`; historical evidence remains discoverable and current policy text is not duplicated.
- Current decision/readiness owners: `test/fixtures/v390_structure_execution_scope_decision.json`,
  `test/fixtures/v390_structure_stabilization_readiness.json`,
  `test/fixtures/v390_actual_module_dependency_graph.json`,
  `scripts/internal/verify_v390_review4_structure_scope_decision.mjs`,
  `scripts/internal/verify_v390_structure_stabilization_readiness.mjs`, and
  `scripts/internal/verify_v390_structure_stabilization_handoff.mjs`.

The three current verifiers above own authorization, baseline debt, contract preservation, slice order,
and entry/exit/stop boundaries only. REVIEW4-64 must register each slice's actual changed symbols and
targeted regression tests before RED; no planned verifier name is treated as an existing command.

### REVIEW4-64 Slice 1: `baseline-and-ownership-map`

- [ ] Record the exact allowed file set, current handler/renderer/write owners, graph hash, and rollback
  point before moving production code.
- [ ] Re-run `verify-v390-review4-structure-scope-decision`,
  `verify-v390-structure-stabilization-readiness`, and
  `verify-v390-structure-stabilization-handoff` as the entry boundary.
- [ ] Keep this slice metadata-only: no handler/response/UI behavior relocation and no refactor-complete claim.

### REVIEW4-64 Slice 2: `pure-json-builder-extraction`

- [ ] Select one side-effect-free JSON/DTO builder family from
  `src/ingress/webrtc_http_server.cpp` and register exact symbol/output baselines before RED.
- [ ] Extract only that family, preserving serialized field/type/status/cache/error meaning byte-for-byte.
- [ ] Run the relevant existing route verifier plus contract-freeze, build, graph, and diff gates; a new
  target or source file must be reflected in CMake and the actual graph evidence.

### REVIEW4-64 Slice 3: `route-handler-group-extraction`

- [ ] Select exactly one Ops route family and bind its method/path, principal guard, request parsing,
  response/status, mutation owner, and readback verifier before RED.
- [ ] Move the selected handler family without changing public API, Auth/Role/Scope, registry writes,
  EventRecord, metadata, or media behavior.
- [ ] Run that route family's existing HTTP/auth verifier, the nine preserved-contract gates, build,
  dependency graph, cleanup, and `git diff --check` before considering another family.

### REVIEW4-64 Slice 4: `product-ui-workspace-split`

- [ ] Select one renderer/workspace family from `product_ui_page_scripts.cpp` with its state and exact
  route/control/DOM/test-ID baseline.
- [ ] Move only that family; preserve visible behavior, labels, selectors, local transitions, requests,
  readbacks, and existing CSS ownership.
- [ ] Run `verify-ops-client-ui`, `verify-rule-ui`, the relevant v3.9 product verifier, exact-case contract,
  build, graph, and diff gates. Static PASS is not actual UI fulltest evidence.

### REVIEW4-64 Slice 5: `source-read-model-boundary`

- [ ] Map each selected SourceRegistry, PublishedView, and source-health read to its existing read/write
  owner before extraction; do not add a route, file format, or write owner.
- [ ] Preserve source/view identity, paired-write, restart, retry, mode, and error semantics.
- [ ] Run `verify-v390-onvif-live-import-persist-decision`,
  `verify-v390-onvif-source-view-atomicity`, the backup/recovery gate, feature inventory, build, graph,
  cleanup, and diff checks.

### REVIEW4-64 Slice 6: `docs-template-and-vlm-index`

- [ ] Separate current manual UI result fields from historical archive material without deleting evidence.
- [ ] Consolidate VLM contract links only where one current owner avoids duplication; preserve default-off,
  profile storage, privacy, field-smoke, dry-run, and provider-not-PASS boundaries.
- [ ] Run `verify-manual-ui-evidence`, `verify-docs-links`, feature inventory, the existing VLM boundary
  verifiers, and `git diff --check`.

Each slice remains `not-executed` until its own implementation, targeted verification, cleanup, evidence
record, and approved commit boundary are complete. Only after all six slices close may REVIEW4-64 be
reported complete and REVIEW4-65 independent acceptance begin.

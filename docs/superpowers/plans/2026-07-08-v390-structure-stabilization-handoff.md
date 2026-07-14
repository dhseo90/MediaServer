# v3.9.0 Structure Stabilization Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** v3.9.0에서 닫은 기능 동작을 바꾸지 않고 REVIEW4-64 구조 안정화를 현재 v3.9.0 branch에서 실행할 route/API/UI/docs/VLM 경계를 작업 가능한 단위로 고정한다.

**Architecture:** 이 계획은 behavior-preserving stabilization handoff다. 새 product route, write path, UI control, schema, media path를 만들지 않고, 기존 대형 translation unit과 문서 source-of-truth를 작은 소유권 단위로 나누기 위한 순서와 검증만 정의한다.

**Execution status:** `in-progress`; historical Slice 1~5와 current continuation Slice 1~9를 완료했고 최종 architecture/evidence 기준은 아직 미달입니다.

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

## REVIEW4-64 Current Execution Ledger

Development 17의 readiness와 REVIEW4-51 decision/graph는 승인 당시 historical record로 보존합니다.
현재 실행 source-of-truth는 `test/fixtures/v390_structure_stabilization_execution.json`, current graph는
`test/fixtures/v390_structure_stabilization_current_graph.json`, verifier는
`./server.sh verify-v390-review4-structure-stabilization-execution`입니다.

Current REVIEW4-64 status: `current-continuation-8-completed-slice-6-deferred`

| 순서 | Current Slice | 상태 | 직접 경계 |
| ---: | --- | --- | --- |
| 1 | `composition-root` | 완료 | `src/main.cpp`를 8줄 delegate로 축소하고 `media_server::application::RunMediaServerApplication`이 shared SessionManager, RTSP→HTTP start, HTTP→RTSP→EventStorage cleanup, auth-user CLI를 소유 |
| 2 | `route-api-handler` | 완료 | `ops_action_execution_deferral`이 exact GET path/status/body/no-store를 소유하고 outer principal guard와 non-GET fallback은 transport에 보존 |
| 3 | `registry-domain` | 완료 | registry는 transport-neutral `ClientViewAccessAuthorizer`만 소비하고 기존 role/scope 판정은 HTTP adapter에 보존; write/persistence/paired transaction 불변 |
| 4 | `ui-script-css` | 완료 | action execution deferral HTML/renderer를 focused product UI owner로 이동하고 shared CSS byte·DOM/route/test-ID·read-only 의미 보존 |
| 5 | `vlm-parser` | 완료 | strict JSON을 core utility로 이동하고 VLM provenance validator를 application-service owner로 분리; actual save/restart/no-write와 profile/promotion 계약 보존 |
| 6 | `verifier-docs` | 미착수·deferred | production continuation source/graph가 안정된 뒤 execution evidence, manual UI archive, VLM index를 final review; generated evidence는 그 전까지 parked 상태 |

Current policy v1 graph는 production 163파일/C++ 80개/owner 10개, target 위반 direction
10개(승인 baseline 25개), 최대 SCC 0, production CMake target 2개입니다. `main.cpp` mixed composition debt는
245→8줄, selected action route owner는 server 43,266→43,186줄로 닫았고 registry→transport auth edge와 product UI→transport/Auth edge를 제거했습니다. Transport는 현재 40,840줄이며 mixed-owner debt는 남아 있으므로 REVIEW4-64 완료가
아닙니다. Historical v2 order와 current order의 전환 범위는 slice identifier/order뿐이며 current branch,
50~63 prerequisite, 9 preserved contract, 64 뒤 65 acceptance 경계는 유지합니다. Policy v1은
application-service→core와 transport→Ops/UI를 temporary debt로 기록하며 위반 계산에서 제외하지 않습니다.
Ops server page renderer와 principal adapter 경계 이동에 이어 shared source request parser를
`ingress/request_parser`에서 `core/source_request_parser`로 byte-equivalent 이동했습니다. SessionManager create/attach와
RTSP configure만 core owner를 사용하며 HTTP server의 unused include를 제거했습니다. Transport monolith는 40,832줄,
policy-v1 target direction은 19개, 최대 SCC는 6으로 감소했습니다. 이어서 `media_server` composition executable은
`main.cpp`와 application composition root 2개만, `media_server_runtime` STATIC library는 나머지 77개
(기본 활성 76개)를 소유하도록 분리해 actual internal target separation을 true로 만들었습니다.

`verify-feature-implementation-evidence`는 Slice 1~3 source 이동 뒤 current line/context/blob trust binding
8,752건을 거부했고 negative fixture는 15/15를 통과했습니다. 이 FAIL은 PASS로 사용하지 않으며 ordered
Slice 6 `verifier-docs`의 current evidence 재결속 entry blocker입니다.

### REVIEW4-64 Current Continuation Boundary

Historical REVIEW4-51의 6-slice decision/readiness/graph는 승인 당시 SHA로 불변 보존합니다. 그 6개 Slice를
완료하는 것만으로 current architecture 최종 기준을 만족했다고 간주하지 않습니다. 별도 current policy는
`test/fixtures/v390_structure_stabilization_current_architecture_policy.json`, current source/CMake graph는
`test/fixtures/v390_structure_stabilization_current_graph.json`입니다.

첫 continuation Slice `completion-oracle-and-ops-ui-renderer`는 completion oracle과 byte-stable Ops product UI
server renderer owner 이동을 함께 결속하고 targeted gate를 통과해 `completed`입니다. 전체 current continuation은
두 번째 Slice `product-ui-principal-view-boundary`도 transport-neutral `ProductUiPrincipalView`와 transport-only
adapter로 Auth principal 의존을 제거하고 완료했습니다. `product_ui_auth_pages`/`product_ui_server_pages`에는
`http_auth.h`, `auth::Principal`, `RequireRole`, `IsAdmin`이 남지 않으며, transport adapter가 기존
`IsAdmin`/`RequireRole(operator)` 결과를 사전 계산합니다. Auth bootstrap/users/routes 19/0·72/0·146/0,
15개 HTML byte baseline, static UI 28/0을 확인했고 실제 사용자 registry는 모든 Auth run 전후 동일했습니다.
세 번째 Slice `source-request-parser-owner-boundary`는 parser 구현의 정규화 SHA와 compiled route/file/source-kind/error
matrix를 결속하고 codec 67/0/3, route profile 8/0, analysis 181/0, Event POST 9/0, WebRTC 8/0,
SSE 5/0, WS 9/0을 통과했습니다. 전체 current continuation은 남은 architecture debt 때문에 `in-progress`이며 generated Review4 evidence는
독립 승인·apply·negative 검증 전까지 parked/non-final입니다. Current graph의 위반 17, SCC 3, 최대 mixed
owner 40,832줄은 남아 있습니다. 네 번째 Slice `cmake-internal-target-separation`은 source include graph를
바꾸지 않고 executable 2개 source와 runtime library 77개 source를 분리했습니다. Focused 5/0, build 100%,
start mode 10/0, codec 67/0/3, route 8/0, analysis 181/0으로 compile/link/runtime 동등성을 확인했습니다.
Actual CMake internal target separation은 true지만 나머지 architecture 최종 기준은 미달이므로 `refactorComplete=false`,
`completionClaimed=false`이고 REVIEW4-65 acceptance를 시작할 완료 evidence가 아닙니다.

다섯 번째 Slice `stable-contract-leaf-boundary`는 `analysis_types`/`media_types`/RTSP request DTO가
`stdafx`를 통하지 않고 표준 의존을 직접 선언하도록 바꿨습니다. `AnalysisEvent`는 field/order/default 그대로
contract owner로 이동했고 VA metadata header는 event rule service를 더 이상 include하지 않습니다. Transitive
AppConfig와 decoder 표준 include를 실제 소비자에 명시해 build 100%, analysis 181/0, Event POST/WebRTC/SSE/WS
9/0·8/0·5/0·9/0을 통과했습니다. Stable DTO의 analysis/core 역방향 두 개가 사라져 위반은 17, SCC는 3입니다.

여섯 번째 current continuation Slice `analysis-query-owner-boundary`는 rollback `d23db847` 기준으로
완료했습니다. `analysis_query` header/source를 public `ingress` namespace와 5개 API, query alias/default/clamp,
profile/rule/overlay timing 의미 그대로 analysis owner로 물리 이동합니다. SessionManager, GStreamer RTSP,
WebRTC HTTP exact 세 consumer와 tracker/discovery verifier도 새 current source에 결속했습니다. Focused 5/0,
build 100%, analysis 181/0, route 8/0, overlay/metadata 6/0·8/0, tracker 12/0·10/0, discovery 7/0,
structure 15/0입니다. 위반은 15, SCC는 2이며 이는 남은 core↔analysis inversion과 40,832줄 server 분해,
parked evidence finalization을 대체하지 않습니다.

일곱 번째 current continuation Slice `core-media-analysis-port-inversion`을 완료했습니다.
`AnalysisSessionService`가 tap/runtime과 RTSP analysis binding을 소유하고 SessionManager에는 generic auxiliary
stream acquire/start/release/provider만 남겼습니다. RTSP/WebRTC egress는 generic pipeline attachment,
GStreamer RTSP는 analysis-neutral `MediaAnalysisPort`만 소비합니다. 후속 검토의 동시성 4건은 attach/detach
transaction, 통합 registry per-reference lease, shutdown drain, provider close-and-wait, final-lease-only file cleanup으로 수정했습니다. Focused 11/0과
실제 격리 source mutation 24건 rejection, build/runtime/media/metadata/CMake 회귀를 통과했고 actual graph는
production 162/C++ 80, 위반 14, SCC 0, server 40,840줄입니다. 나머지 direction/server/evidence debt는 open입니다.

여덟 번째 current continuation Slice `stable-contract-owner-realignment`을 완료했습니다. Public contract bytes를
보존하면서 analysis/media/RTSP contract를 실제 Policy v1 owner로 정렬하고 raw decoder에는 core-media facade를
추가했습니다. Focused 6/0, predecessor 5/0·11/0, build 100%, analysis 181/0, Event/RTSP/WebRTC/SSE/WS
9/0·6/0·8/0·5/0·9/0을 통과했습니다. Actual graph는 production 163/C++ 80, 위반 10, SCC 0,
server 40,840줄입니다. 남은 direction/server/evidence debt 때문에 전체 REVIEW4-64는 계속 `in-progress`입니다.

아홉 번째 current continuation Slice `public-contract-interface-owner-realignment`을 완료했습니다. Product UI
public presentation contract/interface 9개와 ONVIF/Ops/VLM public contract surface를 implementation owner와
분리해 분류하고, generic strict JSON header/source는 `include/domain`/`src/domain`으로 물리 이동했습니다.
Strict JSON header는 byte-identical, parser는 include 경로 정규화 기준 rollback-equivalent이며 두 consumer와
CMake만 새 domain 경계를 사용합니다. Focused gate는 선등록 2/4 RED에서 6/0으로 전환했고 격리 mutation
7건을 거부했습니다. Build 100%, VLM HTTP save/restart/no-write, ONVIF, action, UI renderer, frozen contract
회귀를 통과했습니다. Actual graph는 production 163/C++ 80, edge 20, Policy v1 위반 6, SCC 0입니다.
10→6은 하나의 physical domain path와 public interface classifier 정렬의 합이며 광범위한 source dependency
감소 주장이 아닙니다. 40,840줄 server와 parked final evidence 때문에 전체 REVIEW4-64는 계속 `in-progress`입니다.

열 번째 current continuation Slice `core-media-registry-rule-port`를 완료했습니다. WebRTC published-source
registry header/source를 `include/core`/`src/core`로 물리 이동하고, GStreamer RTSP의 rule lookup을
`MediaAnalysisPort::PrepareRtspRequest`로 역전했습니다. Header bytes, source include-normalized bytes,
vaRule error와 URL-build→rule→codec/source-parse→analysis-prepare 순서를 보존합니다. Focused 5/0과
early-return/reorder/hidden-edge mutations, build 100%, core/public predecessor 11/0·6/0, analysis 181/0,
auth-off codec 67/0/3, route 8/0, overlay/WebRTC 6/0·8/0, freeze 10/0을 통과했습니다. Actual graph는
production 163/C++80, edge19, 위반5, SCC0입니다. 40,840줄 server와 parked final evidence 때문에 전체
REVIEW4-64는 계속 `in-progress`입니다.

## Development 17 Structure Stabilization Readiness

Execution branch: `v3.9.0`

Source release: `v3.9.0`

Historical readiness snapshot execution: `not-run`

Current v3.9 refactor continuation: `in-progress` (Slice 10까지 실행, final target 미충족)

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

### REVIEW4-64 Slice 5: `vlm-parser`

- [x] Move generic strict JSON parsing from the transport owner to core utility ownership without changing
  duplicate-key, decoding, nesting, number, or trailing-byte behavior.
- [x] Move `ValidateVlmIncidentRuleProvenanceContract` to an application-service owner while preserving
  server-record readback, generated rule ID/PUT route, reload quarantine, privacy, and no-write semantics.
- [x] Run provenance actual restart/no-write, promotion trust, draft, profile, build, graph, cleanup, and diff
  gates. The SAFE-025 implementation-evidence binding failure remains a Slice 6 blocker, not a PASS.

### REVIEW4-64 Slice 6: `verifier-docs`

- [ ] Rebuild current content-addressed implementation evidence and its canonical consumers without rewriting
  historical approval/readiness/graph records.
- [ ] Separate current manual UI result fields from historical archive material and consolidate the VLM
  contract index while preserving default-off, privacy, field-smoke, dry-run, and provider-not-PASS boundaries.
- [ ] Run feature evidence/inventory, runtime opt-in, manual UI evidence, docs links, VLM boundary, graph,
  cleanup, and `git diff --check` gates.

Each slice remains `not-executed` until its own implementation, targeted verification, cleanup, evidence
record, and approved commit boundary are complete. Only after all six slices close may REVIEW4-64 be
reported complete and REVIEW4-65 independent acceptance begin.
owner 40,810줄, actual CMake internal target separation false가 모두 남아 있으므로 `refactorComplete=false`,
owner 40,814줄, actual CMake internal target separation false가 모두 남아 있으므로 `refactorComplete=false`,

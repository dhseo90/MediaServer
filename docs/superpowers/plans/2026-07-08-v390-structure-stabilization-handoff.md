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

Current REVIEW4-64 status: `current-continuation-slice-25-completed-final-targets-unmet`

| 순서 | Current Slice | 상태 | 직접 경계 |
| ---: | --- | --- | --- |
| 1 | `composition-root` | 완료 | `src/main.cpp`를 8줄 delegate로 축소하고 `media_server::application::RunMediaServerApplication`이 shared SessionManager, RTSP→HTTP start, HTTP→RTSP→EventStorage cleanup, auth-user CLI를 소유 |
| 2 | `route-api-handler` | 완료 | `ops_action_execution_deferral`이 exact GET path/status/body/no-store를 소유하고 outer principal guard와 non-GET fallback은 transport에 보존 |
| 3 | `registry-domain` | 완료 | registry는 transport-neutral `ClientViewAccessAuthorizer`만 소비하고 기존 role/scope 판정은 HTTP adapter에 보존; write/persistence/paired transaction 불변 |
| 4 | `ui-script-css` | 완료 | action execution deferral HTML/renderer를 focused product UI owner로 이동하고 shared CSS byte·DOM/route/test-ID·read-only 의미 보존 |
| 5 | `vlm-parser` | 완료 | strict JSON을 core utility로 이동하고 VLM provenance validator를 application-service owner로 분리; actual save/restart/no-write와 profile/promotion 계약 보존 |
| 6 | `verifier-docs` | 미착수·deferred | production continuation source/graph가 안정된 뒤 execution evidence, manual UI archive, VLM index를 final review; generated evidence는 그 전까지 parked 상태 |

Current policy v1 graph는 production 173파일/C++ 85개/owner 10개, target 위반 direction
3개(승인 baseline 25개), 최대 SCC 0, production CMake target 2개입니다. `main.cpp` mixed composition debt는
245→8줄, selected action route owner는 server 43,266→43,186줄로 닫았고 registry→transport auth edge와 product UI→transport/Auth edge를 제거했습니다. Transport monolith는 5개 구현 TU와 private detail header로 분할됐고 tracked mixed owner 최대는 10,160줄입니다. Slice 13은 utility 소유 compile-time 값을 `analysis_runtime_port.h`의 공식 `analysis_runtime_defaults` re-export로만 analysis에 노출하고 exact 133-default/148-field manifest를 고정했습니다. Slice 14는 exact 68-field WebRTC HTTP runtime snapshot을 composition에서 매핑·주입해 transport→core-utilities 방향을 제거했습니다. 위반 3개와 parked evidence가 남아 있으므로 REVIEW4-64 완료가
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

### Current continuation Slice 11: `webrtc-http-server-source-bundle`

- [x] Bind rollback `e5df05f3` direct consumers to 170 files, 188 expressions, and a sorted-path SHA.
- [x] Replace each direct monolith read with one ordered, fixture-aware source bundle while preserving the
  current 1,974,239 bytes, 40,840 lines, and production graph exactly.
- [x] Reject legacy/missing imports, callback removal/live-tree fallback, empty/duplicate layouts,
  missing/ambiguous token resolution, continuation frontier overclaim, and graph drift; pass 170 syntax
  checks, build, focused and registered regression gates.

This non-production continuation is the prerequisite for the physical server split. It does not satisfy
the 15,000-line mixed-owner limit, remove the remaining five dependency directions, finalize parked
evidence, or authorize a REVIEW4-64/65 completion claim.

### Current continuation Slice 12: `webrtc-http-server-physical-split`

- [x] Split the rollback `2e4a4d7e` monolith into five independently compiled implementation units and
  one private detail header; preserve all 1,151 type/enum and 1,000 function definitions, default
  arguments, constexpr values, shared-state singleton ownership, and public/runtime contracts.
- [x] Reconstruct the original logical declaration/function order from physical origin markers so all
  170 source-bundle consumers retain their previous extraction semantics; delete the one-shot generator.
- [x] Bind all implementation files to `media_server_runtime`, exact target source digests, owner
  classification, actual line counts, and isolated enum/default/constexpr/ODR/CMake/graph mutations.
- [x] Pass build, focused 6/0, bundle 6/0, public/core/action/UI/VLM, analysis 181/0, authenticated codec
  67/0 with three configured external skips, route 8/0, overlay 6/0, WebRTC metadata 8/0, and freeze 10/0.

Runtime cleanup found that an earlier wildcard server still owned the first verification ports, so that
evidence was not retained. The current split binary was restarted on isolated 18081/18555 ports for the
full authenticated codec rerun and on clean 8081/8555 ports for route, VA/RTSP overlay, and WebRTC
metadata. The reruns passed, 2.1 MiB of run-scoped Auth/HLS/log/image/summary artifacts was removed, and
8081/8555/18081/18555/8654-8656 were confirmed listener-free.

The current graph is production 168/C++ 84, edge 19, Policy v1 violations 5, SCC 0, targets 2 with
internal separation, and largest mixed owner 10,156 lines. The line threshold is closed, but the five
dependency directions and parked final evidence keep REVIEW4-64 and REVIEW4-65 open.

### Current continuation Slice 13: `analysis-runtime-port-boundary`

- [x] Move the complete 148-field analysis configuration contract and every compile-time analysis default
  to dependency-free core ownership; keep `AppConfig` compatibility through inheritance without shadow fields.
- [x] Replace analysis-owned direct config, command, runtime diagnostic, and stream-key utility references
  with the exact `analysis_runtime_port` contract and adapter delegations.
- [x] Reject direct `app_config::` references, transitive `stdafx` exposure, field/default/type drift,
  AppConfig shadowing, diagnostic target swaps, graph-description drift, and isolated source/graph mutations.
- [x] Update standalone analysis/replay harness link inventories for the new port implementation and preserve
  product build, analysis state, ReID readiness, replay, VA event, and frozen metadata/media contracts.

The first implementation changed only include paths and therefore hid direct `app_config::kDefaultAnalysis*`
symbol use behind a transitive header. Independent review correctly rejected that false PASS. The final boundary
owns defaults in `analysis_runtime_defaults.h`, has zero `app_config::` references in analysis owners, binds all
148 fields by a normalized manifest digest, checks every adapter delegation and removes duplicate includes.
Current graph is production 172/C++ 85, edge 18, Policy v1 violations 4, SCC 0, targets 2 with internal
separation, and largest mixed owner 10,156 lines. The four remaining transport directions and parked final
evidence keep REVIEW4-64/65 open.

### Current continuation Slice 14: `transport-runtime-config-boundary`

- [x] Add a dependency-free 68-field `WebRtcHttpRuntimeConfig` owned by the transport boundary and map
  every consumed `AppConfig` field exactly once in the composition root.
- [x] Inject auth mode, metadata, registry/file paths, analysis readiness/tracking values, runtime debug JSON,
  and stream-key construction without direct transport dependency on AppConfig or core utility headers.
- [x] Preserve the fourteen-field appearance readiness normalization, Auth bootstrap/Role/Scope behavior,
  source-bundle logical order, physical split ODR rules, and frozen payload/media contracts.
- [x] Reject transitive include, type alias, owner relabel, missing/duplicate/misdirected mapping, callback swap,
  graph relaxation, and temporary-debt exception false PASS mutations.

The initial build exposed that the shared readiness overload could no longer accept the transport snapshot;
the implementation now constructs the same normalized `AppearanceExtractorOptions` explicitly. The first
Auth run was sandbox-blocked on loopback and the approved permissioned throwaway run passed 146/0 without
persisting plaintext credentials. Focused 5/0, build, source bundle 6/0, physical split 6/0, ReID 12/0 and
actual C++2/HTTP10, analysis state 181/0, freeze 10/0, and structure 15/0 pass. Current graph is production
173/C++ 85, edge 17, Policy v1 violations 3, SCC 0, targets 2 with internal separation, and largest mixed
owner 10,160 lines. Transport→analysis/core-media/domain and parked final evidence keep REVIEW4-64/65 open.

Independent review rejected a mutable process-global replacement because a second server instance could overwrite
the first instance while its requests were active. The constructor now acquires the transport snapshot exactly once
for the process lifetime and every later construction fails closed before Start. The focused gate also binds the exact
Auto/Off/Token/Session plus unknown-fallback mapping and rejects lease/mapping bypass mutations.

### Current continuation Slice 15: `vlm-profile-json-document-boundary`

- [x] Hide `StrictJsonObjectDocument` and every concrete strict parser call behind an opaque application-service
  VLM profile document API.
- [x] Preserve recursive forbidden-key lookup, top-level field distinction, null/absent handling, strict duplicate,
  nested duplicate, trailing-byte, and type rejection semantics.
- [x] Reject umbrella includes, aliases, owner relabeling, source hiding, policy exceptions, and graph overclaims.
- [ ] Rebind the parked SAFE-025 runtime verifier evidence during final generated-evidence closure.

Focused 5/0, build 100%, profile storage 6/0, privacy guard 6/0, and structure 15/0 pass. Runtime opt-in
product checks pass 4/4, while its implementation-evidence command binding remains explicitly deferred to the
parked final evidence slice. Current graph is production 175/C++ 86, edge 17, violations 3, SCC 0; only the
transport-to-domain witness count changes from three to two, so this slice does not claim direction closure.

### Current continuation Slice 16: `source-view-application-boundary`

- [x] Add a dependency-free application result plus exact Source 16-field, PublishedView 12-field, and
  client-access DTOs without exposing registry storage, locks, or transaction ownership.
- [x] Preserve all fifteen registry operations, exact status/body mapping, null outputs, and success-only
  caller-output replacement through a compiled fake-domain harness.
- [x] Remove concrete Source/View registry types from transport and ONVIF public boundaries while preserving
  the atomic pair lifecycle and existing product contracts.
- [x] Require GStreamer 1.28+, serialize DataChannel cleanup, and require the peer `close` promise to reply
  before pipeline NULL teardown so local-description ICE work cannot race the HTTP Stop path.
- [x] Replace raw callback ownership with weak/shared bindings, drain active callbacks before close, serialize
  external signaling with Stop, and prove accepted ICE versus DELETE concurrency through MEDIA-026.
- [x] Bound peer-close and remote-description promises to five seconds, interrupt timeout paths, and reject
  every non-`REPLIED` result so Stop cannot hold the signaling lifecycle mutex indefinitely.
- [x] Transfer a non-`REPLIED` peer/pipeline to an explicit process-lifetime quarantine and fail every later
  WebRTC Start with restart-required; one recursive lifecycle mutex precedes signaling locks and binds whole
  Start/Stop calls to quarantine registration without detached workers, retry loops, unsafe unref, TOCTOU, or lock inversion.

Focused verification passed 5/0 after the production-before-oracle 0/4 RED. Build, ONVIF atomicity 19/0,
source lifecycle, public/transport/bundle/physical/structure gates, and the full SRC-001~068 actual command
passed; the full source-registry command passed five consecutive isolated runs after the WebRTC fix. Eleven
split companion verifiers were rebound to exact function/UI owners without product schema or handler changes.
Current graph is production 178/C++ 87, edge 17, violations 3, SCC 0, and transport-to-domain witnesses 2→1.
Transport-to-analysis/core-media/domain directions and parked generated evidence keep REVIEW4-64/65 open.

### Current continuation Slice 26: `analysis-query-overlay-application-boundary`

Canonical profile/query construction, context resolution, overlay request/options/timing, and concrete overlay attachment now live behind the existing analysis frame application service. Transport keeps PTS resolution, matched-to-snapshot-to-missing fallback, and EventRecord-to-POST-to-metadata order. Independent review found and fixed an empty-provider fail-open semantic change and added null-output defense plus exact provider/order mutations. Focused6, build100, query-owner5, core inversion11, runtime-port5, actual WebRTC metadata8, RTSP overlay6, analysis181, source-bundle6, and physical6 pass. The first WebRTC attempts used the wrong default port and Auth auto; the approved Auth-off 8081 rerun passed. Temporary summaries/logs/build output and listeners were removed. Current graph is production198/C++97, edge16, violations2, SCC0; transport-to-analysis witnesses reduce 6→4 while core-media4 stays exact. Remaining directions and parked evidence keep REVIEW4-64/65 open.

### Current continuation Slice 27: `event-feature-search-application-boundary`

Canonical Event Feature Search index rebuild, Search DSL conversion, query window resolution, valid-only search, and result projection now live behind `event_feature_search_application_service.h/.cpp`. Transport keeps event JSON parsing, timestamp fallback, seven-feature construction, Auth/view scope, retry filtering, and Ops/Integrator JSON assembly. Independent review found three P0 false-PASS gaps and the focused gate now executes exact query/read-limit/response, timestamp/feature/serializer, full DTO/two-record ordering, and ten named privacy/wiring mutations. Focused6, build100, feature index7, DSL7, scoped Integrator8, analysis181, source-bundle6, physical6, and structure15 pass. The first build exposed stale private-detail declarations and was corrected. The current 4.6MB analysis smoke output and dependency scan were removed; an unrelated pre-existing smoke directory was not touched and both listener ports are clear. Current graph is production200/C++98, edge16, violations2, SCC0; transport-to-analysis witnesses reduce 4→3 while core-media4 stays exact. Remaining directions and parked evidence keep REVIEW4-64/65 open.

### Current continuation Slice 19: `vlm-observation-application-boundary`

- [x] Add dependency-free VLM observation query/result and summary/rule candidate request DTOs.
- [x] Own the canonical default store path and all field mapping in the application implementation.
- [x] Preserve raw observation JSON, candidate report bytes, pagination, corrupt-line, privacy, and manual-only contracts.
- [x] Remove direct observation store include/type/function calls from all ten transport files.

Focused verification moved from expected 0/5 RED to 5/0. Build, actual LAB core, provenance, analysis181, sidecar,
Ops review, draft workflow, v260 review, predecessor, bundle, and physical gates passed. Current graph is
production184/C++90, edge17, violations3, SCC0; transport-to-analysis witnesses are 16→15. Parked generated manifest
checks and the remaining violation directions keep REVIEW4-64/65 open.

### Current continuation Slice 21: `event-post-application-boundary`

- [x] Add dependency-free canonical dispatcher source/event/action/bbox and status DTOs.
- [x] Preserve the exact dispatcher source bytes, payload schema, queue/dedupe/cooldown behavior, and async worker.
- [x] Preserve Record→Post→Ops alert/metadata order at all three transport call sites.
- [x] Remove raw Event POST dispatcher include/snapshot/dispatch access from transport.

Focused verification moved from expected 0/6 RED through 5/1 graph RED to 6/0. Build, analysis181, actual disabled/schema/queue/recovery,
WebRTC metadata, RTSP overlay, final contract, core-port, VLM UI companions, predecessor, bundle, and physical gates passed. Recovery was
rerun on a clean max-queue16 server after a preceding slow queue backlog caused the first attempt to miss sentCount. Current graph is
production188/C++92, edge17, violations3, SCC0; transport-to-analysis witnesses are 14→13. Parked generated evidence and remaining
violation directions keep REVIEW4-64/65 open.

### Current continuation Slice 22: `image-codec-application-boundary`

Image decode and JPEG encode now cross `image_codec_application_service.h/.cpp` through dependency-free frame and encoded-image DTOs. Five pixel formats, frame metadata, PTS, raw/JPEG binary bytes, null/error behavior, one decode and four encode call sites are exact-oracle bound. Path containment and HTTP response policy remain transport-owned and rollback-equivalent. Focused 5/1 graph RED→6/0 after independent P1 oracle hardening; build, actual image20, lab core, redaction4/0, analysis181, final contract10, Event POST/bundle/physical gates pass. Current graph is production190/C++93, edge17, violations3, SCC0; transport-to-analysis witnesses are 13→11. Parked generated evidence and remaining directions keep final completion closed.

### Current continuation Slice 23: `analysis-rule-domain-port-boundary`

The first declaration-only shim was rejected by independent review because it removed only an include edge while analysis still linked to canonical symbols defined in transport. The corrected Slice makes `analysis_rule_registry.cpp` the canonical four-symbol domain owner, installs a transport backend through `analysis_rule_application_service.h/.cpp`, and makes transport consume only application wrappers. The compiled harness binds incomplete/same/different configuration, pre-bound conflict no-change, exact callback order, canonical/application mapping, null, and preserved exception propagation; a source mutation oracle rejects actual profile/rule/VA backend swaps. Focused5, build, durable-write actual, analysis181, public/source-view/final-contract/image/Event POST/bundle/physical/structure gates pass. Current graph is production194/C++95, edge16, violations2, SCC0; transport-to-domain closes from one witness to zero without a hidden analysis-to-transport link. Transport-to-analysis11/core-media4 and parked generated evidence keep REVIEW4-64/65 open.

### Current continuation Slice 24: `analysis-frame-application-boundary`

Concrete detector Start/Analyze/Stop, one-shot tracker runtime14/kind/class mapping, close-object projection, and static/live overlay query/timing/debug/render moved to `analysis_frame_application_service.h/.cpp`. Transport direct detector/object-tracker/overlay-renderer includes and concrete calls are zero. Focused6, build, actual image20, redaction4, tracker3, and analysis181 pass. The close-object default-on matrix remains a separate non-gate report with four pre-existing comparison failures and a missing external NewYorkDriving fixture. Current graph is production196/C++96, edge16, violations2, SCC0; transport-to-analysis witnesses reduce 11→8 while core-media4 stays exact. Remaining directions and parked evidence keep REVIEW4-64/65 open.

### Current continuation Slice 25: `va-metadata-application-boundary`

Subscription filter9, sync11, runtime build options, canonical runtime/WebRTC/missing serialization, and the maximum-sixteen-attempt events-first byte-budget loop moved to `va_metadata_application_service.h/.cpp`. Query/control parsing, sequence and current-time ownership, Record→Post→publish order, and fallback selection remain in transport. Focused exact mapping/body/call-order and paired-swap/early-return/missing-PTS mutations pass after independent-review hardening. Build100, actual SSE5, side-channel5, WS9, WebRTC DataChannel8, and analysis181 pass. Current graph is production198/C++97, edge16, violations2, SCC0; transport-to-analysis witnesses reduce 8→6 while core-media4 stays exact. Bounded filter/frame/string copies add a documented allocation risk and exceptions still propagate. Remaining directions and parked evidence keep REVIEW4-64/65 open.
### Current continuation Slice 20: `incident-memory-application-boundary`

- [x] Add dependency-free projection, search request/result, hit, and release-safe DTOs.
- [x] Own canonical event/audit projection, forbidden-material rejection, forced local fallback index, search, and highlights.
- [x] Preserve empty index paths, no-provider behavior, fail-soft errors, deterministic hit/highlight order, and output schema bytes.
- [x] Remove direct incident-memory include/type/function calls from all ten transport files.

Focused verification moved from expected 0/5 RED to 7/0 with a compiled fake-analysis matrix, Upsert fail-soft call-order ledger,
exact route limit/event-audit assembly, ordered two-hit/multi-value vector mapping, and literal-preserving rollback Ops/evidence JSON output-emission parity. Build, canonical projection/index,
semantic search, similar incident, owner readiness, VLM productization, predecessor, bundle, and physical gates passed. Current graph is
production186/C++91, edge17, violations3, SCC0; transport-to-analysis witnesses are 15→14. Parked generated evidence and the
remaining violation directions keep REVIEW4-64/65 open.

### Current continuation Slice 18: `category-catalog-application-boundary`

- [x] Add a dependency-free seven-field category catalog DTO and exact canonical mapping.
- [x] Move the final compact JSON renderer behind the application boundary without changing route bytes.
- [x] Bind all ten ordered catalog entries, seven ordered JSON keys, final UTF-8 SHA, and actual capabilities readback.
- [x] Scan all ten transport files and reject direct analysis include/type/call reintroduction.

Focused verification recorded 0/5 initial RED and 4/1 hardened-byte RED before reaching 5/0. Build, actual lab core API,
analysis181, predecessor appearance5, transport5, source bundle6, physical6, and structure15 passed. Current graph is
production182/C++89, edge17, violations3, SCC0; transport-to-analysis witnesses are 17→16. Remaining violation directions
and parked generated evidence keep REVIEW4-64/65 open.

### Current continuation Slice 17: `appearance-readiness-application-boundary`

- [x] Add dependency-free raw 14-input and redacted 14-output readiness DTOs.
- [x] Move lower/trim/min normalization and canonical analysis inspection out of transport.
- [x] Preserve the Ops schema, authority text, privacy/no-execution boundary, compiled capability matrices, and ten actual HTTP cases.
- [x] Bind exact successor edges and reject direct analysis include reintroduction without claiming direction closure.

Focused verification moved from expected 0/5 RED to 5/0. Build, compiled2/HTTP10 readiness, advanced12,
analysis181, conditional9, transport5, source bundle6, physical6, contract10, and structure15 passed.
Current graph is production180/C++88, edge17, violations3, SCC0; transport-to-analysis witnesses are 18→17.
Transport-to-analysis/core-media/domain directions and parked generated evidence keep REVIEW4-64/65 open.

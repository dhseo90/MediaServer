# v2.5.0 인시던트 메모리 S06-S09 설계

## 범위

이 설계는 승인된 v2.5.0 roadmap 항목만 다룹니다.

- V250-S06 유사 인시던트 조회
- V250-S07 클라이언트 안전 인시던트 요약
- V250-S08 마스킹된 인시던트 증거 묶음
- V250-S09 소유 경계 분리와 릴리즈 준비성

작업은 현재 `v2.5.0 Semantic Incident Memory` 경계 안에만 둡니다. Event POST payload,
WebRTC DataChannel schema, SSE/WS metadata schema, RTSP/WebRTC media path,
Auth/session/scope 계약, Rule/Profile 저장 payload는 변경하지 않습니다. 외부 embedding
provider나 VLM provider 호출도 기본 dependency로 추가하지 않습니다.

## 현재 맥락

현재 branch에는 v2.5.0 S01-S05 구현 커밋이 이미 있습니다. 범위는 인시던트 텍스트
투영, 로컬 메모리 색인, `/ops/events` semantic search UI, 인시던트 timeline graph,
설명 가능한 인시던트 brief입니다. 현재 `/ops/api/events/reviews` 응답에는
`memorySearch`, `timelineGraph`, `incidentBrief`라는 마스킹된 Ops-only 뷰 모델이
들어갑니다. `/ops/events` 화면은 `product_ui_page_scripts.cpp`에서 이 뷰 모델을
렌더링하고, S03-S05 정적 verifier는 서버 마크업, 뷰 모델 field, UI 렌더링 marker,
CSS, 기능 inventory row, coverage 등록, `server.sh` 명령 등록을 확인합니다.

현재 `docs/development-backlog.md`는 S03-S05를 아직 `예정`으로 표시하고 있습니다. 실제
구현 커밋이 존재하므로 S09에서 이 source-of-truth drift를 release readiness 정리
범위로 바로잡습니다. 단, 이 정리는 v2.5.0 incident memory 범위 안에서만 수행합니다.

## 선택한 접근

S06과 S08은 기존 `/ops/api/events/reviews` Ops-only 응답을 확장합니다. S07은 기존
client viewer summary 렌더링 경로를 사용합니다. 이 방식은 S03-S05 패턴과 맞고, 새
public incident API surface를 만들지 않습니다.

제외한 접근:

- 새 `/ops/api/incidents/*` endpoint 추가: 구조는 깔끔하지만 API surface를 넓히고,
  새 public incident API를 피하는 기존 S04/S05 guard 패턴과 충돌할 수 있습니다.
- verifier/docs-only gate만 추가: S06-S08은 실제 제품 view model과 UI surface가
  필요하므로 개발 요청 범위를 충족하지 못합니다.

## V250-S06 유사 인시던트 조회

S06은 `/ops/events`에 Ops-only similar incident lookup panel을 추가하고,
`/ops/api/events/reviews`에 redacted `similarIncidents` view model을 추가합니다.

view model은 기존 EventRecord JSON과 Ops review state만 사용해 deterministic local
similarity를 계산합니다.

- rule match
- scenario 또는 event type match
- source match
- EventRecord status match
- incident status match
- operator action target match

각 similar incident group에는 base event, bounded related incident 목록, numeric
score, 설명 term을 포함합니다. 설명 term은 `rule`, `scenario`, `source`,
`event-status`, `incident-status`, `action-target`처럼 판정 이유를 보여주는 안전한
값만 사용합니다. 렌더러는 event ID, incident ID, safe source ID, status label,
explanation term만 표시합니다. raw JSON, source locator, debug counter, BBox
diagnostics, auth material, provider internals, model material은 렌더링하지 않습니다.

예상 schema marker는 `media-server.ops.similar-incident-lookup.v1`입니다. 이 단계의
verifier는 `verify-v250-similar-incident-lookup`입니다.

## V250-S07 클라이언트 안전 인시던트 요약

S07은 기존 client summary 화면에 viewer-safe incident digest를 추가합니다. Ops review
internal을 viewer route에 노출하지 않고, 기존 client dashboard/live safe summary 흐름을
재사용합니다.

digest에는 안전한 aggregate/status data만 포함합니다.

- active 또는 recent incident count
- latest safe event/status label
- locator를 포함하지 않는 source health wording
- top safe event category
- redacted source label과 status만 가진 bounded incident digest row

digest에는 raw EventRecord JSON, source URL, Developer URL, debug counter, BBox
diagnostics, rule/profile editor detail, prompt/raw response/provider credential/model
internals, raw evidence path를 넣지 않습니다. Admin preview도 같은 viewer-safe digest만
보여주며, 추가 민감 정보를 표시하지 않습니다.

예상 contract marker는 `media-server.client.safe-incident-digest.v1`입니다. 이 단계의
verifier는 `verify-v250-client-safe-incident-digest`입니다.

## V250-S08 마스킹된 인시던트 증거 묶음

S08은 `/ops/events`와 Ops review 응답에 release-safe redacted incident evidence bundle
view를 추가합니다. 이 산출물은 raw evidence archive 확장이 아니라 manifest 중심의 제품
view model입니다.

bundle manifest는 아래 내용을 요약합니다.

- 선택된 incident memory search query와 filter
- bounded search/timeline/brief/similarity result reference
- 포함되는 안전 artifact: event ID, incident ID, status, safe summary, redacted
  highlight, graph label
- 제외되는 material 목록: raw evidence, source URL, credential, auth/session,
  provider internals, raw JSON, debug counter, BBox diagnostics, model material
- source-only release safety, no long recording, no external provider dependency,
  no Event POST payload change, no viewer client exposure를 명시하는 export policy field

기존 `/lab/analysis/events/evidence/bundle-token` raw evidence bundle 경로는 변경하지
않고 분리된 상태로 유지합니다. S08은 lab evidence archive를 viewer-safe로 승격하지
않고, long recording을 추가하지 않으며, product UI에 raw file path를 노출하지 않습니다.

예상 schema marker는 `media-server.ops.redacted-incident-evidence-bundle.v1`입니다. 이
단계의 verifier는 `verify-v250-redacted-incident-evidence-bundle`입니다.

## V250-S09 소유 경계 분리와 릴리즈 준비성

S09는 v2.5.0 incident memory owner/readiness mapping을 닫습니다. push, PR, main merge,
tag 생성, GitHub Release 생성, 30분 soak, 120분 longrun, UI fulltest 실행 같은 release
close-out action은 수행하지 않습니다.

S09에서 추가 또는 갱신할 항목은 아래와 같습니다.

- incident memory review/search/timeline/brief/similarity/bundle surface의 route owner 선언
- S06-S09 feature inventory row
- S06-S09 coverage verifier 등록
- 구현된 S03-S09 backlog status 정리. 단, UI fulltest나 longrun 실행을 완료처럼 쓰지 않음
- stabilization verifier PASS와 UI fulltest, 30분 soak, 120분 longrun, published metadata,
  PR, tag, GitHub Release, push를 분리하는 release policy/evidence note
- `/ops/events`, `/client/dashboard`, `/client/live` manual UI 기준. 단, 해당 UI 확인을
  실행한 것처럼 표시하지 않음

예상 readiness marker는 `media-server.v250-incident-memory-release-readiness.v1`입니다.
이 단계의 verifier는 `verify-v250-incident-memory-release-readiness`입니다.

## 구성 요소

### 서버 뷰 모델

`src/ingress/webrtc_http_server.cpp`는 현재 Ops review response view model의 source입니다.
S06과 S08은 기존 incident memory helper 근처에 작은 helper를 추가합니다.

- `OpsSimilarIncidentLookupViewJson`
- `OpsRedactedIncidentEvidenceBundleViewJson`

S07은 기존 client summary 생성 경로를 사용하고, viewer-safe digest JSON 또는 기존
dashboard/live summary payload 안의 안전 digest block을 추가합니다. Ops-only review note는
safe count/status label로 축약된 값이 아닌 한 client digest에 사용하지 않습니다.

### 제품 UI

`src/ingress/webrtc_http_server.cpp`는 `/ops/events` shell에 S06과 S08 section을 추가합니다.
기존 client shell markup은 viewer-first 상태를 유지하고 viewer 화면에 Ops navigation을
추가하지 않습니다.

`src/ingress/product_ui_page_scripts.cpp`는 아래 renderer를 추가합니다.

- `renderSimilarIncidentLookup`
- `renderRedactedIncidentEvidenceBundle`

`src/ingress/product_ui_client_scripts.cpp`는 기존 client-safe summary 영역 안에서 S07 digest를
렌더링합니다.

`src/ingress/product_ui_css.cpp`와 `src/ingress/product_ui_client_css.cpp`는 새 panel의
responsive style을 추가합니다. card 안에 card를 중첩하거나 raw/debug presentation을 만들지
않습니다.

### 소유 경계와 검증 파일

`include/ingress/ops_event_route_owner.h`와 `src/ingress/ops_event_route_owner.cpp`는 owner
classification과 boundary comment만 갱신합니다. payload나 media path에 영향을 주는 routing
behavior 변경은 하지 않습니다.

새 verifier script는 `scripts/internal/` 아래에 두고 기존 S03-S05 패턴을 따릅니다. 각
verifier는 `server.sh`에 등록합니다.

## 데이터 흐름

1. `/ops/events`가 기존 event status와 review data를 새로고침합니다.
2. `/ops/api/events/reviews`가 EventRecord storage와 Ops review state를 조회합니다.
3. 응답에는 기존 `memorySearch`, `timelineGraph`, `incidentBrief`와 함께 S06
   `similarIncidents`, S08 `redactedEvidenceBundle`이 포함됩니다.
4. Ops 화면은 새 view model을 redacted summary로 렌더링합니다.
5. Client dashboard/live summary payload에는 기존 safe event/status/source health summary
   field에서 파생된 S07 safe digest data가 포함됩니다.
6. Client script는 raw JSON/debug/source/provider detail 없이 digest content를 렌더링합니다.

## 오류 처리

EventRecord query나 review state load가 실패하면 기존 `/ops/api/events/reviews` 오류 처리를
source-of-truth로 유지합니다. 새 S06/S08 helper는 eligible data가 없을 때 empty bounded array와
명시적인 status field를 반환합니다. file path, source URL, credential, provider internals를
포함할 수 있는 raw error detail은 노출하지 않습니다.

Client digest source data가 없으면 client UI는 `최근 viewer-safe incident 없음` 같은 안전한
empty state를 표시합니다. digest data가 없다는 사실을 source health 성공 evidence로 쓰지
않습니다.

## 검증 계획

각 roadmap item은 순서대로 독립적으로 닫습니다.

S06:

- 먼저 `verify_v250_similar_incident_lookup.mjs`를 작성하고 실행해 RED failure를 확인합니다.
- server shell, view model, script rendering, CSS, inventory, coverage, `server.sh` 등록을 구현합니다.
- `./server.sh verify-v250-similar-incident-lookup`을 실행합니다.
- `git diff --check`를 실행합니다.
- S06 변경 파일만 커밋합니다.

S07:

- 먼저 `verify_v250_client_safe_incident_digest.mjs`를 작성하고 실행해 RED failure를 확인합니다.
- client-safe digest payload/rendering/styling, inventory, coverage, `server.sh` 등록을 구현합니다.
- `./server.sh verify-v250-client-safe-incident-digest`를 실행합니다.
- AGENTS.md가 요구하는 auth verifier 환경변수가 있을 때만 `./server.sh verify-auth-routes`를
  실행합니다. 환경변수가 없으면 auth test는 시작하지 않고 미실행으로 보고합니다.
- `git diff --check`를 실행합니다.
- S07 변경 파일만 커밋합니다.

S08:

- 먼저 `verify_v250_redacted_incident_evidence_bundle.mjs`를 작성하고 실행해 RED failure를
  확인합니다.
- redacted bundle manifest view model/rendering/styling, inventory, coverage, `server.sh`
  등록을 구현합니다.
- `./server.sh verify-v250-redacted-incident-evidence-bundle`을 실행합니다.
- `git diff --check`를 실행합니다.
- S08 변경 파일만 커밋합니다.

S09:

- 먼저 `verify_v250_incident_memory_release_readiness.mjs`를 작성하고 실행해 RED failure를
  확인합니다.
- owner mapping, backlog status, release policy/evidence, inventory, coverage, `server.sh`
  등록을 갱신합니다.
- `./server.sh verify-v250-incident-memory-release-readiness`를 실행합니다.
- `./server.sh verify-release-metadata`, `./server.sh verify-release-evidence-index`,
  `./server.sh verify-feature-inventory-coverage`, `./server.sh verify-script-inventory`,
  `./server.sh verify-docs-links`, `git diff --check`를 실행합니다.
- S09 변경 파일만 커밋합니다.

컴파일되는 C++ 파일을 수정하므로 최종 완료 전 build 검증도 필요합니다. 30분/120분 장시간
테스트, UI fulltest, push, PR, main merge, tag, GitHub Release는 사용자 명시 지시 없이
실행하지 않습니다.

## 완료 경계

정적 verifier PASS는 해당 verifier가 선언한 범위의 PASS만 뜻합니다. 브라우저 UI fulltest
PASS, 30분 soak PASS, 120분 longrun PASS, external provider 성공, real ONVIF 성공,
published release metadata, GitHub Release 생성, push 완료를 증명하지 않습니다.

최종 보고는 아래 항목을 분리해야 합니다.

- 완료한 구현과 직접 evidence
- 실제 실행한 테스트
- 실행하지 않은 테스트
- 직접 열어보지 않은 UI 화면
- 변경하지 않은 제품 계약
- 생성한 커밋
- 푸시 가능 여부와 푸시 수행 여부

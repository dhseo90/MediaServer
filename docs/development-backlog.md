# Development Backlog

이 문서는 `main` 기준의 현재 제품 상태, release close-out 판정, 현재/차기 roadmap을
관리합니다.
완료된 상세 개발 이력은 [history/development-history.md](./history/development-history.md),
검증 이력은 [history/verification-history.md](./history/verification-history.md)를 봅니다.

## 문서 정리 기준

v1.2.0이 `main`으로 들어가면 v1.2.0 개발 브랜치의 상세 작업 목록은 더 이상 별도
source-of-truth가 아닙니다. 현재 기준은 이 문서와 기능별 상세 문서로 나눕니다.
새 active roadmap은 기본적으로 `docs/vX.Y.Z-roadmap.md` 같은 단독 버전 파일로
추가하지 않고 이 문서에 관리합니다. 버전별 수동 검수, follow-up closure, release
증적 문서는 필요할 때 historical evidence로 남길 수 있지만 active roadmap
source-of-truth로 쓰지 않습니다.
로드맵 표기 순서는 현재 기준, 활성 차기 버전, 완료 버전 최신순, 과거 준비/체크리스트
순서로 둡니다. 새 버전 내용은 상단의 활성 roadmap에 두고, 완료된 버전 close-out은
최신 버전부터 과거 버전으로 내려갑니다.

- 현재 버전/비범위 기준: [versioning-policy.md](./versioning-policy.md)
- ONVIF live source: [onvif-live-source-support.md](./onvif-live-source-support.md)
- Live source health: [live-source-health.md](./live-source-health.md)
- Live event/metadata contract: [live-event-metadata-contracts.md](./live-event-metadata-contracts.md)
- Scenario timeline/debug: [scenario-timeline-debug.md](./scenario-timeline-debug.md)
- 검증 명령 기준: [stream-verification.md](./stream-verification.md)

## 상태 표기

- `예정`: 아직 구현하지 않은 작업
- `진행`: 현재 정리 또는 검토 중인 작업
- `실험`: 기본 비활성 또는 제한된 조건에서만 확인한 작업
- `보류`: 외부 credential, 모델, 운영 정책 등 선행 조건이 필요한 작업
- `조건부 Gate`: release candidate 또는 고위험 변경에서만 실행하는 검증/작업
- `완료`: 이 문서에 명시한 범위의 구현과 단기/해당 smoke 검증 완료

`완료`는 운영 배포 ready, 장기 안정성 보장, 외부 연동 ready를 뜻하지 않습니다.

## 현재 기준: v1.7.0 Source Release Baseline

v1.7.0은 v1.6.0까지 닫은 source-only/live-only 제품 범위를 유지하면서 Client Live
workspace, source tree/dock event feed, tile disconnect, event review, source
group/site, tile info overlay, saved layout, incident timeline, alert delivery,
scenario builder, Ops/Client declutter를 닫은 source-only UI-first release입니다.

핵심 완료 범위:

- live source: file, RTSP pull, HTTP/HLS URI, WHEP pull, WHIP publish, ONVIF live source
- output: RTSP, WebRTC/WHEP, URL copy parity, SourceRegistry/PublishedView 기반 redaction
- VA: `va=1`, `vaRule=<id>`, Rule/Profile/Scenario, live Event POST, runtime metadata
- Ops/Client: source health, runtime console, tracker warning summary, Client Live
  workspace, source tree/dock, event review, source group/site, saved layout,
  incident timeline, viewer debug/source 비노출
- Auth: setup/login/session, role/scope, admin user console, invite/request approval
- Release: source-only readiness, bundle/license guardrail, release evidence, manual UI evidence
- Research boundary: Re-ID/tracker default-off, OC-SORT manifest-only sandbox, YouTube lab-only 유지

명시적 비범위:

- 장기 녹화, MP4 recorder, VMS/NVR archive, playback/search
- ONVIF Profile G recording/replay, persistent credential store, Digest/WS-Security 운영 보장
- Re-ID default-on, tracker default-on, OC-SORT/BoT-SORT/DeepSORT runtime tracker 승격
- binary/runtime/model bundle release
- 외부 TURN/WHEP credential 운영 보장, 실장비 ONVIF 성공 보장
- field sample scheduler, dataset ingest, tracker replacement benchmark 실행
- 별도 Phase의 실제 기능 개발, tracker replacement product review

세부 종료 증적은 아래 v1.7.0 UI-first Close-out 섹션을 봅니다. v1.6.0 release
evidence 문서는 historical evidence로 유지합니다.

## v1.7.0 UI-first Close-out

v1.7.0은 Client Live workspace와 Ops workflow 보강을 완료 기준으로 둡니다.
기존 Client 화면을 “라이브 월 추가”가 아니라 `/client/live` 대체로 정리했고,
버튼을 늘리는 대신 source tree, drag/drop, 선택 상태, hover/focus context action,
overlay, saved layout으로 조작합니다.

UI 원칙:

- 항상 보이는 버튼은 최소화합니다. 화면당 primary action은 하나 수준으로 제한하고,
  반복 tile/card마다 같은 텍스트 버튼을 늘어놓지 않습니다.
- 카메라 연결은 버튼 나열이 아니라 source tree에서 workspace로 드래그앤드롭하는
  흐름을 기본으로 둡니다.
- 개별 카메라 연결 해제는 tile의 delete/remove action 하나로 정리합니다.
- 전체 연결 해제는 상시 노출 버튼이 아니라 workspace-level danger action으로 분리하고,
  실수 방지 확인을 둡니다.
- 영상 정보, 재생 상태, 최근 이벤트는 사용자가 tile을 선택하거나 정보 overlay를 켰을
  때만 영상 위에 표시합니다.
- overlay는 DOM/SVG layer로 두고 native `<video>` 재생을 유지합니다. 브라우저 HW
  decode를 제품에서 강제한다고 표현하지 않습니다.
- client/viewer에는 source URL, Developer URL, raw JSON, debug counter, SDP/ICE detail,
  rule/profile editor, model/auth material을 노출하지 않습니다.

비추적 참고 스케치:

- 생성 이미지:
  `/Users/dhseo/.codex/generated_images/019e420b-cef3-7f61-b1ea-21871970833c/ig_0bb74733c1b2305d016a0e2cda80408191a587085340d69179.png`
- 이 PNG는 roadmap 방향 참고용이며 git에 포함하지 않습니다.
- 구현 시 참고할 구조는 compact top bar, 좌/우 전환 가능한 source/event dock,
  drag/drop video workspace, tile별 최소 context action, 선택 시에만 보이는 영상 정보
  overlay입니다.

완료 범위:

1. Client 화면 대체와 버튼 축소 기준을 닫았습니다.
2. 이벤트 검토, source group/site, layout 저장을 붙여 실제 운영 흐름을 닫았습니다.
3. 알림 연동, Scenario Builder, Incident Timeline을 기본 UI 위에 확장했습니다.

| ID | 우선순위 | 영역 | 목표 | 예상 검증 |
| --- | --- | --- | --- | --- |
| V170-P0-01 | P0 | Client action reduction baseline | `/client/live`와 Client shell의 버튼/CTA를 inventory로 세고, 항상 보이는 버튼을 필수 action만 남깁니다. text button 반복은 drag/drop, tile selection, icon-only contextual action, keyboard shortcut으로 대체합니다. | UI inventory review, `verify-ops-client-ui --screenshots`, 수동 브라우저 검수 |
| V170-P0-02 | P0 | Client Live workspace replacement | 기존 2x2 Client Live monitor를 source tree + drag/drop workspace로 대체합니다. 여러 live source를 동시에 보되 새 route를 추가하지 않고 기존 `/client/live`를 바꿉니다. | 브라우저 drag/drop 수동 검수, `verify-ops-client-ui --screenshots`, `verify-auth-routes` |
| V170-P0-03 | P0 | Source tree and dock event feed | 카메라 목록은 group/site/floor/source tree로 표현합니다. dock 하단에는 viewer-safe event feed를 두고, 사용자는 dock을 왼쪽/오른쪽으로 전환할 수 있습니다. | `verify-ops-client-ui --screenshots`, `verify-webrtc-va-metadata`, event redaction review |
| V170-P0-04 | P0 | Tile disconnect contract | tile delete/remove는 해당 카메라 WebRTC 연결만 끊고 layout slot 상태를 정리합니다. 전체 연결 해제는 workspace-level action으로만 제공하고 개별 action과 혼동하지 않게 합니다. | 수동 개별/전체 disconnect 검수, `verify-webrtc-ice`, `verify-ops-client-ui --screenshots` |
| V170-P0-05 | P0 | Rule Event Review Inbox | Rule/Scenario event를 운영자가 확인, 분류, 메모, 상태 변경할 수 있는 review inbox를 추가합니다. Event POST payload는 변경하지 않고 내부 review state를 별도로 둡니다. | `verify-va-events`, review state roundtrip smoke, audit/redaction review |
| V170-P1-01 | P1 | Source Group / Site Management | source를 site/group/floor/zone 단위로 묶어 source tree와 client scope 선택에 연결합니다. 기존 auth/session/scope 계약은 깨지 않습니다. | `verify-auth-users`, `verify-auth-routes`, source group roundtrip smoke |
| V170-P1-02 | P1 | Tile info overlay and playback health | 사용자가 tile을 선택하거나 정보 표시를 켰을 때만 카메라 이름, 연결 상태, FPS/bitrate/dropped frame, freeze/reconnect, VA/event badge를 영상 위에 overlay합니다. | 브라우저 overlay 수동 검수, WebRTC stats smoke, `verify-ops-client-ui --screenshots` |
| V170-P1-03 | P1 | Saved Views / Layout Presets | 운영자와 viewer가 workspace layout, dock 위치, filter, selected sources, overlay 기본값을 저장할 수 있게 합니다. user preference와 권한별 preset을 분리합니다. | preference roundtrip smoke, `verify-auth-routes`, 수동 새로고침 검수 |
| V170-P1-04 | P1 | Operator Incident Timeline | event, source health, rule warning, runtime 상태를 incident 단위 timeline으로 묶습니다. 단순 dashboard polish가 아니라 운영자가 원인/영향/다음 조치를 따라가는 workflow로 설계합니다. | `verify-va-runtime-console`, `verify-ops-source-health-bulk`, 수동 Ops click 검수 |
| V170-P2-01 | P2 | Alert Delivery Integrations | Rule event 발생 시 webhook/email/Slack류 알림을 보낼 수 있게 합니다. 기존 Event POST 계약과 분리하고 retry, audit, masking을 포함합니다. | delivery fixture smoke, `verify-event-post`, audit/export masking review |
| V170-P2-02 | P2 | Scenario Builder UI | 기존 Rule/Profile/Scenario를 운영자가 더 쉽게 조합하는 builder UI를 추가합니다. ScenarioEngine 판단 로직 변경은 별도 review 전까지 하지 않습니다. | `verify-rule-ui`, `verify-ops-rules-roundtrip`, scenario preview smoke |
| V170-P2-03 | P2 | Ops/Client shared UI declutter | Client에서 정리한 action reduction 기준을 Ops table/detail/toolbar에도 적용합니다. 기능 삭제가 아니라 상시 노출 action을 context/detail panel로 이동하는 정리입니다. | `verify-ops-client-ui --screenshots`, 수동 Ops click 검수 |

v1.7.0 완료 기준:

- `/client/live`는 버튼 중심 2x2 monitor가 아니라 drag/drop live workspace로 동작합니다.
- source tree, event feed, tile info overlay, 개별/전체 disconnect 규칙이 브라우저에서
  직접 검증됩니다.
- Rule Event Review Inbox와 Source Group/Site가 최소 운영 workflow로 연결됩니다.
- Saved layout/preset은 새로고침 뒤에도 유지됩니다.
- client/viewer에는 source/debug/raw/model/auth material이 노출되지 않습니다.

v1.7.0 비범위:

- 새 장기 녹화, MP4 recorder, VMS/NVR archive, playback/search 기능
- source URL, raw JSON, debug counter, SDP/ICE detail을 client/viewer에 노출
- WebRTC DataChannel, Event POST, SSE/WS metadata schema 변경
- 서버 media path를 Client UI 개편과 함께 변경
- 브라우저 HW decode를 제품에서 강제한다고 표현
- OC-SORT/BoT-SORT/DeepSORT runtime tracker 승격
- alert delivery를 Event POST payload 변경으로 구현
- ScenarioEngine 판단 로직 변경을 builder UI와 같은 단계에 포함

## v1.6.0 Stabilization Close-out

v1.6.0은 새 제품 기능을 여는 minor release가 아니라, v1.5.0까지 닫은 현재 기능을
다음 기능 개발 사이클 전에 안정화하고 release-grade 증적, verifier, 문서 경계를
정리하는 stabilization release입니다. 기능 방향은 후속 기능 개발 브랜치에서 다시 결정합니다.

기본 원칙:

- v1.5.0까지 구현된 live-only/source-only 제품 범위와 rule-level tracker/Re-ID
  opt-in 경계를 유지합니다.
- 새 runtime tracker, Re-ID default-on, tracker default-on, recorder/VMS/NVR,
  model/runtime/binary bundle release를 열지 않습니다.
- 현재 기능의 smoke, release evidence, docs drift, client/viewer debug 비노출,
  audit/export masking, field evidence boundary를 안정화합니다.
- 실제 field evidence, model bundle, tracker benchmark는 제품 승격 근거가 아니라
  review gate와 report boundary로만 정리합니다.
- 후속 기능 후보는 이 문서에서 확정하지 않습니다. v1.6.0은 후보를 정리하더라도
  implementation roadmap으로 승격하지 않습니다.

공통 완료 조건:

- 현재 기능 기준 release metadata, README, versioning, release policy, backlog,
  English docs 사이에 drift가 없어야 합니다.
- client/viewer 화면과 API 응답에서 source URL, raw JSON, debug counter,
  credential/auth/session material, model path/checksum/provenance, crop, embedding이
  노출되지 않아야 합니다.
- 장시간 soak, 실장비 field smoke, YouTube real URL relay, 외부 TURN/WHEP credential
  운영 검증은 실행한 경우에만 pass로 기록하고, 미실행이면 release evidence에서
  명확히 분리합니다.
- Event POST, WebRTC DataChannel, SSE/WS metadata schema, RTSP/WebRTC media path,
  auth/session contract는 별도 review 없이는 변경하지 않습니다.
- 각 항목은 해당 verifier와 `git diff --check` 통과 후에만 완료로 처리합니다.

| ID | 우선순위 | 영역 | 목표 | 예상 검증 |
| --- | --- | --- | --- | --- |
| V160-P0-01 | P0 | Release evidence dashboard cleanup | v1.5.0까지 흩어진 release 증적, verifier report, 미실행 항목, PR/Actions 결과를 한곳에서 추적 가능하게 정리합니다. | `verify-docs-links`, release evidence checks, `git diff --check` |
| V160-P0-02 | P0 | Stability verification gate cleanup | 현재 기능 기준 smoke 묶음을 정리하고 flaky, 중복, 미사용 verifier를 분리합니다. 실패/미실행 항목을 release pass처럼 보이지 않게 합니다. | `verify-script-inventory`, 주요 smoke suite, `git diff --check` |
| V160-P0-03 | P0 | Client/Ops debug exposure regression guard | viewer/client에 source URL, raw JSON, debug counter, rule/profile editor, model/source/auth material이 노출되지 않도록 회귀 guard를 강화합니다. | `verify-ops-client-ui`, `verify-auth-routes`, client redaction checks |
| V160-P0-04 | P0 | Tracker/Re-ID opt-in stabilization close-out | rule-level tracker/Re-ID opt-in, warning, fallback, privacy guard를 default-off 안정화 상태로 닫고 default-on 승격과 분리합니다. | `verify-v150-follow-up-closure`, tracker/Re-ID stability matrix verifier |
| V160-P1-01 | P1 | ONVIF field smoke evidence reconciliation | 실장비 성공 보장이 아니라 field smoke summary/report/history boundary와 release evidence 연결 기준을 정리합니다. | field smoke summary verifier, docs guard |
| V160-P1-02 | P1 | Audit/export masking regression hardening | audit 조회, CSV/JSON/Diff export에서 model/source/auth/raw material masking 회귀를 막습니다. | audit export verifier, `verify-ops-audit-trail` |
| V160-P1-03 | P1 | Runtime/model bundle RC policy | v1.6.0에는 bundle을 포함하지 않고, 향후 RC에서 model/runtime을 올릴 수 있는 조건과 차단 기준만 확정합니다. | provenance/fallback verifier, privacy verifier, bundle policy checks |
| V160-P1-04 | P1 | Manual UI release checklist closure | `/setup`, `/login`, `/ops`, `/client` 주요 화면 수동 검수 템플릿과 evidence 경계를 현재 기능 기준으로 정리합니다. | manual UI checklist, screenshots when run, `verify-docs-ui-assets` |
| V160-P2-01 | P2 | Public docs consistency polish | README, versioning, release policy, backlog, English docs 사이의 현재 기능/비범위 표현을 정리합니다. | `verify-release-metadata`, `verify-docs-links`, `git diff --check` |
| V160-P2-02 | P2 | Tracker benchmark harness planning only | OC-SORT 등 실제 adapter 비교는 별도 기능 개발 Phase 후보로 넘기고, v1.6.0에서는 harness 요구사항과 비승격 경계만 정리합니다. | docs guard, no runtime adapter change, `git diff --check` |

### V160-P0-01 Release evidence dashboard cleanup 정리 기준

`Release evidence dashboard cleanup`은 v1.5.0까지 흩어진 release 증적, verifier
report, PR/Actions 결과, 미실행 항목을 [v1.6.0 Release Evidence Dashboard](./v1.6.0-release-evidence-dashboard.md)
한곳에서 추적하게 만드는 안정화 작업입니다. 목표는 실제 실행한 검증과
장시간/실장비/외부 credential/Actions 미확인 항목을 release pass처럼 섞어 쓰지
않는 것입니다.

확인됨:

- release evidence는 `확인됨`, `미실행`, `미확인`을 분리해 기록합니다.
- 장시간 soak, `verify-predev`, ONVIF 실장비 field smoke, YouTube real URL relay,
  외부 TURN/WHEP credential 운영 검증은 실행한 경우에만 pass로 기록하고,
  미실행이면 `NOT RUN`으로 유지합니다.
- PR/Actions, tag, push, GitHub Release는 로컬 검증과 분리하고 링크가 없으면
  `UNVERIFIED`로 남깁니다.
- evidence dashboard에는 source URL, credential, auth/session material, raw media,
  raw diagnostic JSON, crop, embedding, model path/checksum/provenance를 포함하지
  않습니다.

검증 기준:

- `./server.sh verify-v160-release-evidence-dashboard`
- `./server.sh verify-docs-links`
- `./server.sh verify-script-inventory`
- `git diff --check`

이번 항목의 범위 밖:

- V160-P0-02 Stability verification gate cleanup
- V160-P0-03 Client/Ops debug exposure regression guard
- V160-P0-04 Tracker/Re-ID opt-in stabilization close-out
- V160-P1-01~V160-P1-04, V160-P2-01~V160-P2-02
- 새 제품 기능, 장시간 테스트 실행, 실장비 field smoke 성공 보장, tag/push/GitHub
  Release 생성
- Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경
- RTSP/WebRTC media path 변경 또는 media pipeline blocking 정책 변경

후속 분류:

- 미분류 P0~P1 후속 이슈: 없음. 이번 항목에서 발견한 release evidence drift
  위험은 dashboard 문서와 verifier로 닫습니다.
- 같은 P0 안정화 페이즈의 V160-P0-02~V160-P0-04는 별도 순서 항목이므로 이 작업에서
  완료로 판정하지 않습니다.
- P1/P2 및 별도 Phase 후보는 V160-P0-01의 즉시 후속 이슈로 끌어오지 않습니다.

### V160-P0-02 Stability verification gate cleanup 정리 기준

`Stability verification gate cleanup`은 현재 기능 기준 smoke 묶음과
flaky/attached/longrun/external gate를
[v1.6.0 Stability Verification Gates](./v1.6.0-stability-verification-gates.md)에
분리하는 안정화 작업입니다. 목표는 실패/미실행/환경 의존 항목이 release pass처럼
보이지 않도록 verifier와 문서 기준을 정리하는 것입니다.

확인됨:

- static/docs gate, P0 stabilization gate, attached UI/Auth gate, Runtime/VA metadata
  gate, Tracker/Re-ID carry-over gate, flaky/cleanup isolation gate, longrun/external
  gate를 분리합니다.
- `verify-script-inventory`는 documented command, dispatch target, executable bit,
  사용자 노출 JS option validation을 확인하는 gate로 유지합니다.
- `verify-ops-client-ui --screenshots`, `verify-ops-click-e2e`,
  `verify-ops-tables-layout`처럼 브라우저/attached 환경이 필요한 smoke는 실행 URL,
  screenshot 여부, cleanup 결과를 따로 기록합니다.
- `verify-predev`, 장시간 soak, 실장비 ONVIF field smoke, 외부 TURN/WHEP credential
  운영 검증은 사용자 명시 요청 없이 실행하지 않고 `NOT RUN`으로 분리합니다.

검증 기준:

- `./server.sh verify-v160-stability-verification-gate`
- `./server.sh verify-script-inventory`
- `./server.sh verify-docs-links`
- `git diff --check`

이번 항목의 범위 밖:

- V160-P0-03 Client/Ops debug exposure regression guard
- V160-P0-04 Tracker/Re-ID opt-in stabilization close-out
- V160-P1-01~V160-P1-04, V160-P2-01~V160-P2-02
- 장시간 테스트 실행, 실장비 field smoke 성공 보장, flaky verifier를 제품 PASS로
  임의 승격
- Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경
- RTSP/WebRTC media path 변경 또는 media pipeline blocking 정책 변경

후속 분류:

- 미분류 P0~P1 후속 이슈: 없음. 이번 항목에서 발견한 gate drift 위험은 stability
  gate 문서와 verifier로 닫습니다.
- V160-P0-03과 V160-P0-04는 같은 P0 안정화 페이즈의 별도 항목이므로 이 작업에서
  완료로 판정하지 않습니다.
- P1/P2 및 별도 Phase 후보는 V160-P0-02의 즉시 후속 이슈로 끌어오지 않습니다.

### V160-P0-03 Client/Ops debug exposure regression guard 정리 기준

`Client/Ops debug exposure regression guard`는 viewer/client 화면과 scoped API에
source URL, raw JSON, debug counter, rule/profile editor, model/source/auth material이
노출되지 않도록 [v1.6.0 Client/Ops Debug Exposure Regression Guard](./v1.6.0-debug-exposure-regression-guard.md)
문서와 `verify-ops-client-ui` forbidden matrix를 강화하는 작업입니다.

확인됨:

- client page HTML, rendered DOM, clipboard text, client scoped API JSON key traversal에서
  source/debug/rule/model/auth material을 금지합니다.
- `verify-ops-client-ui`의 client forbidden text/key matrix에 `modelPath`,
  `modelSha256`, `modelChecksum`, `modelProvenance`, `modelUrl`, `crop`, `embedding`,
  `appearanceCrop`, `appearanceEmbedding`, `passwordHistory`, `credentialRef`,
  capability material을 추가합니다.
- Ops 화면의 운영자 debug/details와 client/viewer surface를 분리하고, raw JSON은
  운영자 debug details 접힘 영역에만 둡니다.
- removed UI route(`/lab`, `/lab/rules`, `/lab/import`, `/webrtc/test`)는 닫힌 상태를
  유지합니다.

검증 기준:

- `./server.sh verify-v160-debug-exposure-regression-guard`
- `./server.sh verify-auth-routes`
- `./server.sh verify-ops-client-ui`
- `./server.sh verify-script-inventory`
- `git diff --check`

이번 항목의 범위 밖:

- V160-P0-04 Tracker/Re-ID opt-in stabilization close-out
- V160-P1-02 Audit/export masking regression hardening
- V160-P1-01, V160-P1-03~V160-P1-04, V160-P2-01~V160-P2-02
- audit/export CSV/JSON/Diff hardening 전체 재작업, 새 Ops debug 화면 추가,
  client/viewer 기능 추가
- Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경
- RTSP/WebRTC media path 변경 또는 media pipeline blocking 정책 변경

후속 분류:

- 미분류 P0~P1 후속 이슈: 없음. 이번 항목에서 발견한 client redaction guard 빈칸은
  forbidden matrix와 전용 verifier로 닫습니다.
- V160-P0-04는 같은 P0 안정화 페이즈의 별도 항목이므로 이 작업에서 완료로 판정하지
  않습니다.
- P1/P2 및 별도 Phase 후보는 V160-P0-03의 즉시 후속 이슈로 끌어오지 않습니다.

### V160-P0-04 Tracker/Re-ID opt-in stabilization close-out 정리 기준

`Tracker/Re-ID opt-in stabilization close-out`은 v1.5.0까지 닫은 rule-level
tracker/Re-ID opt-in, warning, fallback, privacy guard를
[v1.6.0 Tracker/Re-ID Opt-in Stabilization Close-out](./v1.6.0-tracker-reid-opt-in-closeout.md)
기준으로 default-off 안정화 상태에 묶는 작업입니다. 목표는 default-on 승격,
runtime tracker 승격, model/runtime bundle release와 P0 안정화 완료를 분리하는
것입니다.

확인됨:

- 사용자가 rule/vaRule에서 명시 선택한 `analysis.trackingPolicy.tracker`와
  `analysis.trackingPolicy.reid`만 적용합니다.
- `trackingPolicy`가 없는 기존 rule은 runtime에서 `tracker=lite`, `reid=off`,
  `source=rule-default`로 해석하며 저장 문서를 자동 migration하지 않습니다.
- tracker/Re-ID matrix는 사용자 opt-in 품질 참고이며 default-on 승인 근거가
  아닙니다.
- Re-ID model provenance/checksum/fallback gate는 missing/invalid/mismatched model을
  `NoOp fallback`으로 닫고, crop/embedding/model path/checksum/provenance를 외부
  metadata나 client/viewer 화면에 노출하지 않습니다.
- v1.6.0 P0 안정화 페이즈의 미분류 P0~P1 후속 이슈는 없음으로 분류합니다.

검증 기준:

- `./server.sh verify-v160-tracker-reid-opt-in-closeout`
- `./server.sh verify-v150-follow-up-closure`
- `./server.sh verify-v150-tracker-reid-stability-matrix`
- `./server.sh verify-v150-reid-provenance-fallback-approval`
- `./server.sh verify-script-inventory`
- `git diff --check`

이번 항목의 범위 밖:

- V160-P1-01~V160-P1-04, V160-P2-01~V160-P2-02
- Re-ID default-on, tracker default-on, product default tracker 변경
- OC-SORT, BoT-SORT, DeepSORT runtime tracker 승격
- 실제 Re-ID model artifact, model card, dataset provenance, model/runtime/binary bundle
- Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경
- RTSP/WebRTC media path 변경 또는 media pipeline blocking 정책 변경

후속 분류:

- 미분류 P0~P1 후속 이슈: 없음. 이번 P0 안정화 페이즈에서 발견한 P0/P1 빈칸은
  V160-P0-01~V160-P0-04 verifier와 문서 guard로 닫습니다.
- V160-P1-01~V160-P1-04, V160-P2-01~V160-P2-02, 별도 Phase 후보는 이번 P0
  close-out의 즉시 구현 후속으로 끌어오지 않습니다.

### V160-P1-01 ONVIF field smoke evidence reconciliation 정리 기준

`ONVIF field smoke evidence reconciliation`은 실장비 ONVIF 성공을 보장하는 기능
개발이 아니라, 기존 field smoke gate와 release evidence dashboard가 같은 상태
언어로 실행/미실행/미확인 결과를 기록하게 만드는 안정화 작업입니다.
[v1.6.0 ONVIF Field Smoke Evidence Reconciliation](./v1.6.0-onvif-field-smoke-evidence-reconciliation.md)
기준으로 field smoke summary/report/history boundary와 redacted sample bundle
review를 연결합니다.

확인됨:

- `verify-onvif-no-device-suite` 통과는 fixture/parser/loopback/redaction 개발
  검증이며 실제 field smoke `PASS` 또는 `realDeviceEndpointSuccess=pass`가 아닙니다.
- 실제 장비를 사용하지 않았으면 `gateDecision=not-run`,
  `realDeviceTestPerformed=false`, `realDeviceEndpointSuccess=unverified`,
  `playbackStatus=skipped`로 release evidence에 기록합니다.
- field smoke 공유 evidence는 sanitized summary/report/history index와
  `redactionArtifactReview`, `fieldSmokeReportReview` 상태만 보존합니다.
- endpoint URL, source URL/URI/file, RTSP/RTSPS stream URI, credential/auth/session
  material, raw SOAP/header/diagnostic JSON, raw media/frame, crop, embedding,
  model path/checksum/provenance는 공유 evidence와 release dashboard에 남기지
  않습니다.
- 외부 승인 링크, GitHub Actions, tag/push/GitHub Release가 없으면 `UNVERIFIED`,
  실제 field smoke를 실행하지 않았으면 `NOT RUN`으로 유지합니다.

검증 기준:

- `./server.sh verify-v160-onvif-field-smoke-evidence-reconciliation`
- `./server.sh verify-onvif-field-smoke-gate`
- `./server.sh verify-onvif-field-smoke-sample-bundle`
- `./server.sh verify-docs-links`
- `./server.sh verify-script-inventory`
- `git diff --check`

이번 항목의 범위 밖:

- 실제 ONVIF camera endpoint 성공 보장 또는 field smoke 실행
- persistent credential store, Digest, WS-Security, WS-Discovery 자동 검색,
  Profile G / Recording / Replay 구현
- V160-P1-02 Audit/export masking regression hardening
- V160-P1-03 Runtime/model bundle RC policy
- V160-P1-04 Manual UI release checklist closure
- V160-P2-01~V160-P2-02, 별도 Phase 후보
- Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경
- RTSP/WebRTC media path 변경 또는 media pipeline blocking 정책 변경

후속 분류:

- 미분류 P0~P1 후속 이슈: 없음. 이번 항목의 field evidence drift 위험은
  reconciliation 문서와 전용 verifier로 닫습니다.
- V160-P1-02~V160-P1-04는 같은 v1.6.0 안정화 페이즈의 별도 항목이므로 이 작업에서
  완료로 판정하지 않습니다.
- P2 및 별도 Phase 후보는 V160-P1-01의 즉시 구현 후속으로 끌어오지 않습니다.

### V160-P1-02 Audit/export masking regression hardening 정리 기준

`Audit/export masking regression hardening`은 `/ops/api/audit` 조회와
JSON/CSV/Diff JSON export에서 source/model/auth/raw material이 다시 노출되지 않도록
[v1.6.0 Audit Export Masking Regression Hardening](./v1.6.0-audit-export-masking-regression-hardening.md)
기준으로 기존 audit redaction guard를 release gate에 연결하는 작업입니다.

확인됨:

- `RedactAuditJsonFragment`는 저장된 audit body와 조회/export record에 다시 적용됩니다.
- JSON export, CSV export, Diff JSON export는 같은 redacted entry set을 사용합니다.
- `AuditSensitiveKey`와 `AuditSensitiveStringValue`는 source URL/URI/file,
  endpoint/stream URI, model path/checksum/provenance, raw media/frame, crop,
  embedding, password/token/hash/secret/credential/capability material을 masking
  대상으로 유지합니다.
- Ops UI는 Tracker/Re-ID 설정 변경과 model/fallback status-only review chip을
  표시하되 model/source/auth/raw material 원문을 표시하지 않습니다.
- client/viewer surface에는 audit export controls, raw JSON, source/debug/model/auth
  material을 노출하지 않습니다.

검증 기준:

- `./server.sh verify-v160-audit-export-masking-regression-hardening`
- `./server.sh verify-v150-audit-export-review-hardening`
- `./server.sh verify-ops-audit-trail`
- `./server.sh verify-docs-links`
- `./server.sh verify-script-inventory`
- `git diff --check`

이번 항목의 범위 밖:

- V160-P1-03 Runtime/model bundle RC policy
- V160-P1-04 Manual UI release checklist closure
- V160-P2-01~V160-P2-02, 별도 Phase 후보
- 새 Ops debug 화면 추가, client/viewer audit export 기능 추가
- Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경
- RTSP/WebRTC media path 변경 또는 media pipeline blocking 정책 변경

후속 분류:

- 미분류 P0~P1 후속 이슈: 없음. 이번 항목의 audit/export masking drift 위험은
  전용 verifier와 기존 audit export/ops audit trail guard로 닫습니다.
- V160-P1-03~V160-P1-04는 같은 v1.6.0 안정화 페이즈의 별도 항목이므로 이 작업에서
  완료로 판정하지 않습니다.
- P2 및 별도 Phase 후보는 V160-P1-02의 즉시 구현 후속으로 끌어오지 않습니다.

### V160-P1-03 Runtime/model bundle RC policy 정리 기준

`Runtime/model bundle RC policy`는 v1.6.0 기본 release에 runtime/model bundle을
추가하는 작업이 아니라, 향후 별도 RC에서 포함 배포를 검토할 때 필요한 승인 조건과
차단 기준을 [v1.6.0 Runtime/Model Bundle RC Policy](./v1.6.0-runtime-model-bundle-rc-policy.md)에
고정하는 작업입니다.

확인됨:

- v1.6.0 기본 release는 source/doc 중심이며 FFmpeg, FFprobe, libav*, x264/x265,
  GStreamer GPL-risk plugin, ONNX Runtime package, YOLO/Re-ID/model binary를 release
  asset에 포함하지 않습니다.
- Re-ID opt-in model은 model path/checksum/provenance가 명시되고 검증을 통과할 때만
  runtime 사용 후보가 되며, missing/invalid/mismatched model은 NoOp fallback으로
  닫습니다.
- model path/checksum/provenance, crop, embedding, appearance profile은 Event POST,
  WebRTC DataChannel, SSE/WS metadata, client/viewer surface에 노출하지 않습니다.
- 향후 runtime/model bundle RC는 `verify-bundle-policy`, `verify-release-bundle-dry-run`,
  `source-offer-checklist`, upstream license text, attribution, model card/license,
  checksum manifest, privacy/redaction review를 evidence로 요구합니다.
- tag, push, GitHub Release, binary upload는 수동 승인 전까지 수행하지 않습니다.

검증 기준:

- `./server.sh verify-v160-runtime-model-bundle-rc-policy`
- `./server.sh verify-v150-reid-provenance-fallback-approval`
- `./server.sh verify-bundle-policy`
- `./server.sh verify-docs-links`
- `./server.sh verify-script-inventory`
- `git diff --check`

이번 항목의 범위 밖:

- 실제 runtime/model/binary bundle 생성 또는 release asset 업로드
- ONNX Runtime package, YOLO/Re-ID/model binary repo 포함
- V160-P1-04 Manual UI release checklist closure
- V160-P2-01~V160-P2-02, 별도 Phase 후보
- Re-ID default-on, tracker default-on, product default tracker 변경
- Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경
- RTSP/WebRTC media path 변경 또는 media pipeline blocking 정책 변경

후속 분류:

- 미분류 P0~P1 후속 이슈: 없음. 이번 항목의 runtime/model bundle RC drift 위험은
  전용 verifier와 기존 Re-ID provenance/fallback, bundle policy guard로 닫습니다.
- V160-P1-04는 같은 v1.6.0 안정화 페이즈의 별도 항목이므로 이 작업에서 완료로
  판정하지 않습니다.
- P2 및 별도 Phase 후보는 V160-P1-03의 즉시 구현 후속으로 끌어오지 않습니다.

### V160-P1-04 Manual UI release checklist closure 정리 기준

`Manual UI release checklist closure`는 실제 수동 UI 검수를 수행했다고 기록하는
작업이 아니라, v1.6.0 현재 제품 화면 기준으로 수동 검수 템플릿과 evidence 경계를
[v1.6.0 Manual UI Release Checklist Closure](./v1.6.0-manual-ui-release-checklist-closure.md)에
고정하는 작업입니다.

확인됨:

- 수동 검수 대상은 `/setup`, `/login`, `/password/change`, `/ops/home`,
  `/ops/dashboard`, `/ops/sources`, `/ops/rules`, `/ops/users`, `/ops/events`,
  `/client/live`, `/client/dashboard`, `/client/request-access`입니다.
- `/lab`, `/lab/rules`, `/lab/import`, `/webrtc/test`는 제품 UI로 되살리지 않고 닫힌
  route 상태를 확인 대상으로만 둡니다.
- Client 화면은 Live/Dashboard primary nav만 허용하며 Ops/Lab primary navigation,
  source URL, Developer URL, raw JSON, debug counter, BBox diagnostics,
  rule/profile editor를 노출하지 않습니다.
- screenshot, 수동 검수 결과, GitHub Actions/link는 실제 실행하거나 확보한
  artifact/link만 기록합니다.
- 자동 smoke, raw JSON 확인, screenshot 생성만으로 수동 클릭 검수를 완료했다고 쓰지
  않습니다.

검증 기준:

- `./server.sh verify-v160-manual-ui-release-checklist-closure`
- `./server.sh verify-manual-ui-evidence`
- `./server.sh verify-docs-ui-assets`
- `./server.sh verify-docs-links`
- `./server.sh verify-script-inventory`
- `git diff --check`

이번 항목의 범위 밖:

- 실제 브라우저 수동 검수 실행 또는 screenshot 재생성
- V160-P2-01 Public docs consistency polish
- V160-P2-02 Tracker benchmark harness planning only
- 새 UI route/nav 추가, `/lab` 화면 route 재개방
- Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경
- RTSP/WebRTC media path 변경 또는 media pipeline blocking 정책 변경

후속 분류:

- 미분류 P0~P1 후속 이슈: 없음. 이번 항목의 manual UI evidence drift 위험은
  전용 verifier와 기존 manual UI/docs UI asset guard로 닫습니다.
- V160-P2-01~V160-P2-02는 같은 v1.6.0 안정화 페이즈의 별도 항목이므로 이 작업에서
  완료로 판정하지 않습니다.
- 별도 Phase 후보는 V160-P1-04의 즉시 구현 후속으로 끌어오지 않습니다.

### V160-P2-01 Public docs consistency polish 정리 기준

`Public docs consistency polish`는 v1.6.0 source-only release 기준이 public
README, README.en, docs/en/README, versioning policy, release policy, development
backlog에서 같은 방식으로 보이도록
[v1.6.0 Public Docs Consistency Polish](./v1.6.0-public-docs-consistency-polish.md)에
고정하는 작업입니다.

확인됨:

- 현재 published source-only release tag는 `v1.6.0`입니다.
- v1.6.0은 source-only stabilization release이며 runtime/model/binary bundle release가 아닙니다.
- public 첫 진입점은 세부 v1.6.0 guard 문서를 전부 나열하지 않고, `docs/README.md`
  및 release evidence 대표 링크로 연결합니다. latest source-only release는
  `v1.6.0`으로 표시합니다.
- release/versioning 정책은 source-only/live-only 경계, binary/runtime/model bundle
  제외, 실장비/장시간/외부 credential gate 미실행 분리를 유지합니다.
- VMS/NVR, long-term recording/playback/search, ONVIF Profile G recording/replay,
  Re-ID/tracker default-on, OC-SORT/BoT-SORT/DeepSORT runtime promotion을 현재 제품
  범위로 쓰지 않습니다.

검증 기준:

- `./server.sh verify-v160-public-docs-consistency-polish`
- `./server.sh verify-release-metadata`
- `./server.sh verify-docs-links`
- `./server.sh verify-script-inventory`
- `git diff --check`

이번 항목의 범위 밖:

- VERSION/CMake release version 변경
- tag, push, GitHub Release 생성
- V160-P2-02 Tracker benchmark harness planning only
- 별도 Phase 후보 구현
- Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경
- RTSP/WebRTC media path 변경 또는 media pipeline blocking 정책 변경

후속 분류:

- 미분류 P0~P1 후속 이슈: 없음. 이번 항목의 public docs drift 위험은 전용 verifier와
  release metadata/docs links guard로 닫습니다.
- V160-P2-02는 같은 v1.6.0 안정화 페이즈의 별도 항목이므로 이 작업에서 완료로
  판정하지 않습니다.
- 별도 Phase 후보는 V160-P2-01의 즉시 구현 후속으로 끌어오지 않습니다.

### V160-P2-02 Tracker benchmark harness planning only 정리 기준

`Tracker benchmark harness planning only`는 실제 OC-SORT adapter나 새 runtime
tracker를 구현하는 작업이 아니라, 별도 기능 개발 Phase에서 benchmark를 열 때 필요한
harness 요구사항과 비승격 경계를
[v1.6.0 Tracker Benchmark Harness Planning](./v1.6.0-tracker-benchmark-harness-planning.md)에
고정하는 작업입니다.

확인됨:

- `analysis.trackingPolicy.tracker` 허용값은 `none`, `lite`, `kalman-lite`,
  `bytetrack`에 머뭅니다.
- `/ops/rules` tracker selector, rule validation, `AnalysisProfile`,
  `ObjectTrackerKind`, `verify-tracker-stability`, `compare-close-object-tracker`에
  OC-SORT, BoT-SORT, DeepSORT runtime tracker 선택값을 추가하지 않습니다.
- `compare-close-object-tracker --experimental-sandbox oc-sort`는 metadata-only sandbox
  manifest를 남길 수 있지만 tracker stability 실행 인자로 전달하지 않습니다.
- benchmark planning은 Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경이나
  RTSP/WebRTC media path 변경의 근거가 아닙니다.
- tracker/Re-ID default-on, product default tracker 변경, model/runtime bundle 포함
  결정을 이 항목에서 내리지 않습니다.

검증 기준:

- `./server.sh verify-v160-tracker-benchmark-harness-planning`
- `./server.sh verify-oc-sort-benchmark-boundary`
- `./server.sh verify-bot-sort-deepsort-research-boundary`
- `./server.sh verify-docs-links`
- `./server.sh verify-script-inventory`
- `git diff --check`

이번 항목의 범위 밖:

- 실제 OC-SORT algorithm adapter 구현
- BoT-SORT/DeepSORT adapter 구현
- dataset benchmark report 실행 또는 field sample benchmark 수행
- tracker replacement product review
- Re-ID default-on, tracker default-on, product default tracker 변경
- Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경
- RTSP/WebRTC media path 변경 또는 media pipeline blocking 정책 변경

후속 분류:

- 미분류 P0~P1 후속 이슈: 없음. 이번 항목의 tracker benchmark planning drift 위험은
  전용 verifier와 기존 OC-SORT/BoT-SORT/DeepSORT boundary guard로 닫습니다.
- 실제 adapter, dataset benchmark report, tracker replacement product review는
  별도 Phase 후보로 남깁니다.
- 별도 Phase 후보는 V160-P2-02의 즉시 구현 후속으로 끌어오지 않습니다.

### v1.6.0 비범위

- 새 제품 기능 추가
- Re-ID default-on 또는 tracker default-on
- OC-SORT, BoT-SORT, DeepSORT runtime tracker 승격
- 실제 Re-ID model/runtime/binary bundle release
- 장기 녹화, MP4 recorder, VMS/NVR archive, playback/search
- ONVIF Profile G recording/replay
- YouTube 운영 기능 승격 또는 실제 URL relay 성공 보장
- Event POST, WebRTC DataChannel, SSE/WS metadata schema 변경
- RTSP/WebRTC media path 또는 media pipeline blocking 정책 변경

### v1.6.0 완료 기준

v1.6.0은 기능 확장보다 현재 기능 마무리를 완료 기준으로 둡니다.

- v1.5.0까지의 기능/문서/검증 drift 정리
- 현재 기능 smoke와 release evidence guard 안정화
- 미실행 장시간/실장비/외부 credential 검증의 release note 분리
- client/viewer debug/source/raw/model/auth material 비노출 회귀 방지
- Tracker/Re-ID opt-in을 default-off 안정화 상태로 닫기
- 후속 기능 후보를 확정 roadmap으로 쓰지 않고 별도 후보 목록으로만 유지

## 별도 Phase 후보

v1.6.0 stabilization 이후에도 기능 개발로 확정하지 않은 항목은 별도 기능 개발
Phase gate 후보로 남깁니다. 각 후보는 source-only/live-only 경계,
schema/media-path review, privacy/redaction review, release/field/manual approval
gate를 통과할 때만 명시적 opt-in 기능이나 배포 범위 검토로 연결합니다.

- field sample history review workflow
- tracker experimental benchmark harness
- actual OC-SORT algorithm adapter and dataset benchmark report
- ByteTrack/Kalman-lite/OC-SORT fixture matrix comparison history
- field sample based tracker replacement product review
- Re-ID privacy retention guard
- runtime/model bundle RC policy
- ONVIF field smoke evidence reconciliation
- release evidence dashboard cleanup

## v1.5.0 Minor Close-out

v1.5.0은 v1.4.0의 rule-level tracker/Re-ID opt-in 경계를 유지하면서 사용자가
명시적으로 선택한 tracker/Re-ID 조합의 테스트, 안정화, 운영 피드백을 보강하는
minor release로 닫았습니다. 제품 기본 tracker/Re-ID를 바꾸지 않고, global
default-on, 자동 migration, 암묵적 Re-ID 활성화는 열지 않습니다.

기본 원칙:

- tracker와 Re-ID는 사용자가 룰별 설정에서 명시적으로 선택한 경우에만 적용
- `analysis.trackingPolicy`가 없는 기존 rule/vaRule은 계속 `tracker=lite`,
  `reid=off`로 해석
- global/default-on, 자동 migration, field evidence 기반 기본값 승격은 비범위
- Re-ID는 사용자가 켠 경우에도 model provenance, checksum, privacy, retention,
  NoOp fallback gate가 통과한 범위에서만 보조 association으로 사용
- Tracker/Re-ID 안정화는 반복 fixture, warning drift, VA event replay, runtime
  fallback, metadata 비노출 검증까지 포함
- Event POST, WebRTC DataChannel, SSE/WS metadata schema와 RTSP/WebRTC media
  path는 별도 review 전까지 변경하지 않음

공통 완료 조건:

- Tracker/Re-ID off 기본 경로가 기존 rule과 client/viewer 노출 계약을 깨지 않음
- `lite`, `kalman-lite`, `bytetrack`, Re-ID assist 조합별 반복 테스트 결과를 기록
- missing/invalid Re-ID model은 실패 전파 없이 NoOp/fallback으로 수렴
- warning은 기본값 승격 근거가 아니라 사용자 설정/튜닝 참고로만 표시
- raw media, crop, embedding, model path, auth/source material은 public docs,
  release asset, client/viewer metadata에 노출하지 않음
- 각 항목은 해당 verifier와 `git diff --check` 통과 후에만 완료로 처리

| ID | 우선순위 | 영역 | 목표 | 예상 검증 |
| --- | --- | --- | --- | --- |
| V150-P0-01 | P0 | Explicit opt-in tracker/Re-ID policy guard | 사용자가 룰별로 선택한 tracker/Re-ID만 적용되고 global/default-on/자동 migration이 생기지 않도록 저장, runtime, UI, docs guard를 고정합니다. | `verify-rule-ui`, `verify-ops-rules-roundtrip`, `verify-analysis-state`, tracker/Re-ID off 기본 회귀 테스트 |
| V150-P0-02 | P0 | Tracker/Re-ID stability matrix | `lite`, `kalman-lite`, `bytetrack`, Re-ID assist 조합별 반복 fixture와 warning drift를 안정화합니다. close-object/field-driving 결과는 사용자 opt-in 품질 참고로만 기록합니다. | `verify-tracker-stability`, `compare-close-object-tracker --fixture-matrix`, `verify-va-replay`, `verify-va-events` |
| V150-P0-03 | P0 | Re-ID opt-in model provenance and fallback approval | 사용자가 Re-ID를 켤 때만 model provenance/checksum/privacy/retention 조건을 확인하고, missing/invalid model은 NoOp fallback으로 처리합니다. | `verify-reid-advanced-tracking`, invalid/missing model fixture, metadata 비노출 guard |
| V150-P1-01 | P1 | Ops Dashboard tracker warning next-action refinement | tracker/Re-ID warning을 기본값 승격 근거가 아니라 사용자 설정/튜닝 참고로 표시하고, 운영자가 다음 조치를 고를 수 있게 summary와 action copy를 정리합니다. | `verify-ops-client-ui --screenshots`, tracker warning fixture smoke, `verify-va-runtime-console` |
| V150-P1-02 | P1 | Audit export review hardening | tracker/Re-ID 설정 변경, model/fallback 상태, export masking 흐름을 운영 감사 UX에서 검토 가능하게 강화합니다. 민감정보와 model/source material은 조회/export 응답에 노출하지 않습니다. | `verify-ops-audit-trail`, `verify-auth-users`, 민감정보 masking regression |
| V150-P1-03 | P1 | Field smoke summary evidence boundary | raw media 없이 tracker/Re-ID summary/report/history index evidence만 보존하는 절차를 정리하고, release 문서에서 완료/미확인/비범위를 분리합니다. | docs guard, report archive policy verifier, `compare-close-object-tracker --history-dir` |
| V150-P2-01 | P2 | OC-SORT experimental sandbox | OC-SORT는 제품 기본 tracker 후보가 아니라 사용자가 명시 선택하는 실험/비교 sandbox로만 검토합니다. runtime tracker 승격과 schema/media path 변경은 별도 review로 분리합니다. | experimental fixture, `compare-close-object-tracker`, runtime tracker boundary verifier |

### V150-P0-01 Explicit opt-in tracker/Re-ID policy guard 정리 기준

`Explicit opt-in tracker/Re-ID policy guard`는 v1.4.0에서 열린
rule-level `analysis.trackingPolicy` 경계를 더 엄격히 고정하는 작업입니다.
목표는 사용자가 rule/vaRule에서 명시적으로 선택한 tracker/Re-ID 조합만 적용하고,
global default-on, 자동 migration, tracker 없는 Re-ID assist 활성화를 막는
것입니다.

확인됨:

- `analysis.trackingPolicy`가 없는 기존 rule/vaRule은 저장 문서를 자동 migration하지
  않고 runtime에서 `tracker=lite`, `reid=off`, `source=rule-default`로 해석합니다.
- tracker 없는 `reid=assist` 저장 요청은 거부합니다. Re-ID assist는
  `tracker=lite`, `tracker=kalman-lite`, `tracker=bytetrack`처럼 명시적으로 선택된
  tracker field와 함께 있을 때만 유효합니다.
- runtime은 tracker field가 없는 `trackingPolicy`를 rule-level opt-in으로 해석하지
  않음으로써 legacy/hand-edited 문서가 Re-ID assist를 암묵 활성화하지 않게 합니다.
- `/ops/rules` UI는 tracker/Re-ID select를 통해 `trackingPolicy.tracker`와
  `trackingPolicy.reid`를 함께 저장하고, `tracker=none`이면 Re-ID를 `off`로
  고정합니다.
- internal analysis reuse key는 tracker/Re-ID policy를 포함해 tap을 분리하지만,
  외부 Event POST/WebRTC/SSE/WS metadata의 `profileKey`에는 policy token을 추가하지
  않습니다.

검증 기준:

- `./server.sh build`
- `./server.sh verify-v150-opt-in-tracking-policy`
- `./server.sh verify-rule-ui`
- `./server.sh verify-ops-rules-roundtrip`
- `./server.sh verify-analysis-state`
- `git diff --check`

이번 항목의 범위 밖:

- V150-P0-02 Tracker/Re-ID stability matrix
- V150-P0-03 Re-ID opt-in model provenance and fallback approval
- V150-P1-01 Ops Dashboard tracker warning next-action refinement
- V150-P1-02 Audit export review hardening
- V150-P1-03 Field smoke summary evidence boundary
- tracker/Re-ID global default-on, 기존 rule/source/profile 자동 migration,
  Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경, RTSP/WebRTC media path 변경

후속 분류:

- 미분류 P0~P1 후속 이슈: 없음. 이번 guard에서 발견한 tracker 없는 Re-ID assist
  암묵 활성화 위험은 저장 검증, runtime fallback, UI validation, verifier로 닫습니다.
- V150-P0-02~V150-P1-03은 같은 v1.5.0 minor roadmap의 별도 항목이므로 이 작업에서
  구현 완료로 판정하지 않습니다.
- OC-SORT experimental sandbox와 별도 Phase 후보는 아래 roadmap 경계를 따르며,
  V150-P0-01의 후속 이슈로 끌어오지 않습니다.

### V150-P0-02 Tracker/Re-ID stability matrix 정리 기준

`Tracker/Re-ID stability matrix`는 v1.4.0에서 열린 rule-level tracker/Re-ID
opt-in 후보를 제품 기본값으로 승격하지 않고, 사용자가 명시 선택한 조합의 반복
fixture 결과와 warning drift를 같은 기준으로 읽게 하는 안정화 작업입니다.

확인됨:

- 최소 matrix 조합은 `lite/off`, `kalman-lite/off`, `bytetrack/off`,
  `lite/assist`, `kalman-lite/assist`, `bytetrack/assist`입니다.
  `tracker=none/reid=off`는 opt-in guard 회귀로 다루며 tracker stability 품질
  matrix의 ID continuity 후보로 보지 않습니다.
- `verify-tracker-stability`는 `--tracker-policy`와 `--reid-policy`로 임시
  vaRule을 만들고 tap의 `trackingPolicy.tracker`, `trackingPolicy.reid`,
  `effectiveTracker`가 요청한 rule-level opt-in 값과 맞는지 확인합니다.
- `compare-close-object-tracker --fixture-matrix`는 각 fixture row에
  `trackerPolicy`, `reidPolicy`, `warningCount`, `defaultOnDecision`,
  `productDefaultOn`, `defaultOnReason`을 남겨 `matrix-ok`와 제품 default-on
  판단을 분리합니다.
- `--history-dir`는 summary/report/index만 보존하며 raw media, crop, embedding,
  model path, auth/source material을 archive 범위에 포함하지 않습니다.
- close-object/field-driving 결과는 사용자 opt-in 품질 참고와 threshold 튜닝
  후보일 뿐이며, 제품 default tracker/Re-ID 변경 근거가 아닙니다.
- Re-ID assist model provenance/checksum/fallback 승인 자체는 V150-P0-03에서
  다루며, 이 matrix는 policy 조합 적용과 warning drift 판독 경계만 닫습니다.
- 미분류 P0~P1 후속 이슈: 없음. 이번 항목에서 발견한 빈칸은 전용 verifier와
  문서화된 조합 matrix로 닫습니다.

검증 기준:

- `./server.sh build`
- `./server.sh verify-v150-tracker-reid-stability-matrix`
- `./server.sh verify-tracker-stability --tracker-policy lite --reid-policy off`
- `./server.sh verify-tracker-stability --tracker-policy kalman-lite --reid-policy off`
- `./server.sh verify-tracker-stability --tracker-policy bytetrack --reid-policy off`
- `./server.sh verify-tracker-stability --tracker-policy lite --reid-policy assist`
- `./server.sh verify-tracker-stability --tracker-policy kalman-lite --reid-policy assist`
- `./server.sh verify-tracker-stability --tracker-policy bytetrack --reid-policy assist`
- `./server.sh compare-close-object-tracker --fixture-matrix --tracker-policy bytetrack --reid-policy assist --history-dir /private/tmp/media_server_v150_tracker_reid_stability_matrix`
- `./server.sh verify-va-replay`
- `./server.sh verify-va-events`
- `git diff --check`

이번 항목의 범위 밖:

- V150-P0-03 Re-ID opt-in model provenance and fallback approval
- V150-P1-01 Ops Dashboard tracker warning next-action refinement
- V150-P1-02 Audit export review hardening
- V150-P1-03 Field smoke summary evidence boundary
- V150-P2-01 OC-SORT experimental sandbox
- 제품 default tracker/Re-ID 변경, global/default-on, 기존 rule/source/profile 자동
  migration
- 실제 Re-ID model artifact, model card, dataset provenance, runtime/model bundle
  release asset 포함
- Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경
- RTSP/WebRTC media path 변경 또는 media pipeline blocking 정책 변경

### V150-P0-03 Re-ID opt-in model provenance and fallback approval 정리 기준

`Re-ID opt-in model provenance and fallback approval`은 Re-ID assist가 명시적으로
선택된 룰에서도 실제 ONNX Re-ID extractor를 무조건 켜지 않고, model provenance,
checksum, privacy/retention approval 조건이 통과한 경우에만 후보로 보는
gate입니다. 목표는 missing/invalid/mismatched model을 제품 오류나 media path
실패로 전파하지 않고 `NoOp fallback`으로 닫는 것입니다.

확인됨:

- Re-ID assist는 rule/vaRule의 `analysis.trackingPolicy.reid=assist`와 선택된
  tracker가 함께 있을 때만 association 보조 hook 후보가 됩니다.
- 실제 ONNX extractor 후보는 `MEDIA_SERVER_ANALYSIS_APPEARANCE_MODEL`,
  `MEDIA_SERVER_ANALYSIS_APPEARANCE_MODEL_SHA256`,
  `MEDIA_SERVER_ANALYSIS_APPEARANCE_MODEL_PROVENANCE`가 모두 채워지고, model path
  존재, SHA-256 형식, checksum 일치, OpenSSL checksum 검증, ONNX Runtime 빌드가
  통과한 경우로 제한합니다.
- missing/invalid/mismatched model, checksum 누락/형식 오류/불일치, provenance
  누락, OpenSSL 또는 ONNX Runtime 미지원은 모두 `NoOp fallback`으로 닫습니다.
- privacy/retention approval은 bounded async queue, per-stream rate limit, global
  queue limit, stale job drop, raw crop/embedding/model path/checksum/provenance
  외부 비노출을 통과해야 합니다.
- `analysis_state_smoke`는 missing model, checksum/provenance 누락, invalid
  checksum, missing provenance, checksum mismatch fixture를 NoOp fallback으로
  고정합니다.
- Event POST/WebRTC DataChannel/SSE/WS metadata와 client/viewer 화면에는 embedding,
  crop, model path, checksum, provenance, track-linked appearance profile을
  노출하지 않습니다.

검증 기준:

- `./server.sh build`
- `./server.sh verify-v150-reid-provenance-fallback-approval`
- `./server.sh verify-reid-advanced-tracking`
- `./server.sh verify-analysis-state`
- `./server.sh verify-webrtc-va-metadata`
- `./server.sh verify-va-metadata-sidechannel`
- `git diff --check`

이번 항목의 범위 밖:

- V150-P1-01 Ops Dashboard tracker warning next-action refinement
- V150-P1-02 Audit export review hardening
- V150-P1-03 Field smoke summary evidence boundary
- V150-P2-01 OC-SORT experimental sandbox
- Re-ID default-on 제품 결정, tracker default-on, 기존 rule/source/profile 자동
  migration
- 실제 Re-ID model artifact, model card, dataset provenance, Re-ID model/runtime binary
  bundle, release asset 업로드, container/offline package 포함
- Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경
- RTSP/WebRTC media path 변경 또는 media pipeline blocking 정책 변경

후속 분류:

- 미분류 P0~P1 후속 이슈: 없음. 이번 항목에서 발견한 P0 빈칸은 전용 verifier,
  문서화된 approval gate, invalid/missing model fixture 보강으로 닫습니다.
- V150-P1-01~V150-P1-03은 같은 v1.5.0 minor roadmap의 별도 항목이므로 이 작업에서
  구현 완료로 판정하지 않습니다.
- Re-ID privacy retention guard와 runtime/model bundle RC policy는 아래 별도 Phase
  후보이며, V150-P0-03의 즉시 후속 이슈로 끌어오지 않습니다.

별도 Phase 후보로 기록:

- P2 이상 tracker experimental benchmark harness와 field sample history review workflow
- Re-ID privacy retention guard와 runtime/model bundle RC policy
- OC-SORT/BoT-SORT/DeepSORT algorithm adapter 또는 benchmark report

### V150-P1-01 Ops Dashboard tracker warning next-action refinement 정리 기준

`Ops Dashboard tracker warning next-action refinement`는 Runtime Operations
Readout과 Tracking Issues 영역에서 tracker/Re-ID warning을 제품 기본값 승격
근거가 아니라 사용자 opt-in 튜닝 참고로 읽게 하는 UI 안정화 작업입니다. 목표는
운영자가 다음 조치를 고를 수 있게 type/class/track,
association/overlap/missed/direction 값을 보여주되, 새 backend API나 metadata
schema를 추가하지 않는 것입니다.

확인됨:

- Runtime Operations Readout의 TrackHealth next action은 type/class/track을
  먼저 확인하고 `/ops/rules`에서 선택 룰의 Tracker/Re-ID opt-in 조합, geometry,
  입력 FPS를 함께 조정하라고 안내합니다. 이 warning은 default-on 근거가 아닙니다.
- Tracking Issues 그룹은 issue type, track list, class, association, overlap,
  missed, direction count, 선택 tap의 trackingPolicy를 함께 보여주고
  `사용자 opt-in 튜닝 참고 · default-on 근거 아님` 경계를 표시합니다.
- issue type별 next action은 overlap-risk, missed/lost/reacquired,
  direction/association instability를 나누어 `/ops/rules` 튜닝, source frame
  continuity, FPS, lost-buffer, 룰 단위 Tracker/Re-ID 조합 비교로 연결합니다.
- `test/fixtures/v150_ops_tracker_warning_next_action.json`은 tracker warning fixture
  smoke로 유지하며 raw media, source URL, crop, embedding, model path, credential
  material을 포함하지 않습니다.
- Event POST/WebRTC DataChannel/SSE/WS metadata schema, RTSP/WebRTC media path,
  ScenarioEngine 판단 로직, tracker/Re-ID runtime 선택 계약은 변경하지 않습니다.

검증 기준:

- `./server.sh build`
- `./server.sh verify-v150-ops-tracker-warning-next-action`
- `./server.sh verify-ops-root-cause-panel`
- `./server.sh verify-ops-client-ui --screenshots`
- `./server.sh verify-va-runtime-console`
- `git diff --check`

이번 항목의 범위 밖:

- V150-P1-02 Audit export review hardening
- V150-P1-03 Field smoke summary evidence boundary
- V150-P2-01 OC-SORT experimental sandbox
- audit export 응답/마스킹 UX 강화, field smoke summary evidence 절차 정리
- tracker/Re-ID global/default-on, Re-ID default-on, tracker default-on, 기존
  rule/source/profile 자동 migration
- Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경
- RTSP/WebRTC media path 변경 또는 media pipeline blocking 정책 변경

후속 분류:

- 미분류 P0~P1 후속 이슈: 없음. 이번 항목에서 발견한 P1 빈칸은 Dashboard
  next-action copy, tracker warning fixture smoke, 전용 verifier로 닫습니다.
- V150-P1-02와 V150-P1-03은 같은 v1.5.0 minor roadmap의 별도 항목이므로 이
  작업에서 구현 완료로 판정하지 않습니다.
- P2 이상 OC-SORT sandbox, tracker experimental benchmark harness, field sample
  history review workflow는 아래 별도 Phase 후보이며 V150-P1-01의 즉시 후속으로
  끌어오지 않습니다.

### V150-P1-02 Audit export review hardening 정리 기준

`Audit export review hardening`은 V130-P1-03에서 만든 서버 감사 로그
조회/export 흐름을 v1.5.0 tracker/Re-ID opt-in 운영 검토에 맞게 더 단단히
잠그는 작업입니다. 목표는 tracker/Re-ID 설정 변경, Re-ID model/fallback 상태,
export masking 흐름을 운영자가 같은 감사 UX에서 검토하되, 민감정보와
model/source material을 조회/JSON/CSV/Diff JSON export 응답에 노출하지 않는
것입니다.

확인됨:

- `/ops/api/audit`는 저장 시점의 redaction에 더해 조회/export 시점에도
  `password`, token/hash/secret/credential/capability와 model path/checksum/
  provenance, source URL/URI/file, raw media/crop/embedding 값을 다시 마스킹합니다.
  즉 조회/JSON/CSV/Diff JSON export 응답에서 다시 마스킹하는 것을 완료 조건으로
  둡니다.
- `/ops/rules` 변경 이력은 `analysis.trackingPolicy.tracker`와
  `analysis.trackingPolicy.reid`의 전/후 값을 review chip으로 표시해
  tracker/Re-ID 설정 변경을 감사 화면에서 바로 확인할 수 있게 합니다.
- model/fallback 상태는 status-only 값만 review chip에 표시합니다. model path,
  checksum, provenance, crop, embedding, raw source material은 audit detail,
  JSON/CSV/Diff JSON export, 브라우저 fallback cache에 남기지 않습니다.
- `test/fixtures/v150_audit_export_review_hardening.json`은 raw sample과 sanitized
  export 기대값을 분리해 민감정보 masking regression을 고정합니다.
- 이 항목은 audit export review와 마스킹 강화만 다루며 Event POST/WebRTC
  DataChannel/SSE/WS metadata schema, RTSP/WebRTC media path, tracker runtime
  선택 계약은 변경하지 않습니다.

검증 기준:

- `./server.sh build`
- `./server.sh verify-v150-audit-export-review-hardening`
- `./server.sh verify-ops-audit-trail`
- `./server.sh verify-ops-audit-persistence`
- `./server.sh verify-auth-users`
- `git diff --check`

이번 항목의 범위 밖:

- V150-P1-03 Field smoke summary evidence boundary
- V150-P2-01 OC-SORT experimental sandbox
- raw media/history archive 절차, field smoke summary evidence 보존 정책 정리
- tracker/Re-ID global/default-on, Re-ID default-on, tracker default-on, 기존
  rule/source/profile 자동 migration
- Re-ID model/runtime binary, model card, release asset, container/offline package 포함
- Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경
- RTSP/WebRTC media path 변경 또는 pipeline blocking 정책 변경

후속 분류:

- 미분류 P0~P1 후속 이슈: 없음. 이번 항목에서 발견한 audit export의
  model/source material 마스킹 빈칸은 서버 redaction, UI fallback cache redaction,
  review chip, 전용 verifier/fixture로 닫습니다.
- V150-P1-03은 같은 v1.5.0 minor roadmap의 별도 항목이므로 이 작업에서 구현
  완료로 판정하지 않습니다.
- OC-SORT sandbox, field sample history review workflow, runtime/model bundle RC
  policy는 아래 별도 Phase 후보이며 V150-P1-02의 즉시 후속으로 끌어오지 않습니다.

### V150-P1-03 Field smoke summary evidence boundary 정리 기준

`Field smoke summary evidence boundary`는 v1.5.0 Tracker/Re-ID field-like sample
관찰 결과를 release evidence로 남길 때 raw media를 보존하지 않고
summary/report/history index evidence만 남기는 경계 작업입니다. 목표는
`compare-close-object-tracker --history-dir` 산출물을 tracker/Re-ID opt-in 튜닝
참고로 보존하되, 제품 default-on, 실장비 ONVIF field smoke 성공, 고객 영상 보관,
release asset 업로드로 해석하지 않게 하는 것입니다.

확인됨:

- `compare-close-object-tracker` 단일 비교와 fixture matrix history는
  `summary.json`, `report.md`, `matrix-summary.json`, `matrix-report.md`,
  `index.json`, `index.md`만 retained evidence로 표시합니다.
- history archive는 `field-smoke-summary-evidence` boundary를 함께 기록하고,
  summary/report/history index evidence만 보존합니다.
- raw media, crop, embedding, model path/checksum/provenance, source URL/URI/file,
  credential/auth/session material은 report/history evidence 범위에서 제외합니다.
- `matrix-ok`, `defaultOnCandidate`, `productDefaultOn`, `defaultOnDecision`은
  제품 default tracker/Re-ID 변경 근거가 아니라 사용자 opt-in 튜닝 참고와
  후보 상태를 분리하기 위한 필드입니다.
- release 문서에서 완료/미확인/비범위를 분리합니다. v1.5.0 P1-03은 evidence
  archive 절차와 verifier 경계를 고정하지만, 실제 field endpoint 성공,
  ONVIF field smoke reconciliation, 장기 field sample workflow는 완료로 쓰지
  않습니다.

검증 기준:

- `./server.sh build`
- `./server.sh verify-v150-field-smoke-summary-evidence-boundary`
- `./server.sh verify-v140-report-archive-policy`
- `./server.sh verify-v150-tracker-reid-stability-matrix`
- `./server.sh verify-script-inventory`
- `./server.sh verify-docs-links`
- `git diff --check`

이번 항목의 범위 밖:

- V150-P2-01 OC-SORT experimental sandbox
- field sample history review workflow
- ONVIF field smoke evidence reconciliation
- release evidence dashboard cleanup
- tracker/Re-ID global/default-on, Re-ID default-on, tracker default-on, 기존
  rule/source/profile 자동 migration
- raw field media, crop, embedding, auth/source material 저장 또는 public archive
- Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경
- RTSP/WebRTC media path 변경 또는 pipeline blocking 정책 변경

후속 분류:

- 미분류 P0~P1 후속 이슈: 없음. 이번 항목에서 발견한 P1 빈칸은
  `field-smoke-summary-evidence` metadata, report/index copy, 문서화된
  완료/미확인/비범위 분리, 전용 verifier로 닫습니다.
- field sample history review workflow, ONVIF field smoke evidence reconciliation,
  release evidence dashboard cleanup은 아래 별도 Phase 후보이며 V150-P1-03의
  즉시 후속으로 끌어오지 않습니다.
- P2 이상 tracker experimental benchmark harness와 OC-SORT sandbox는 roadmap
  후속 Phase 후보로 유지합니다.

### V150-P2-01 OC-SORT experimental sandbox 정리 기준

`OC-SORT experimental sandbox`는 OC-SORT를 제품 runtime tracker로 승격하지 않고,
명시적 비교 sandbox metadata로만 추적하는 v1.5.0 P2 작업입니다. 목표는 사용자가
실험을 열 때 `compare-close-object-tracker --experimental-sandbox oc-sort`처럼
명시적으로 sandbox를 선택하게 하고, 실제 runtime tracker policy와 제품 UI/API
계약은 계속 `none`, `lite`, `kalman-lite`, `bytetrack` 경계 안에 두는 것입니다.

확인됨:

- `compare-close-object-tracker`는 `--experimental-sandbox oc-sort`와
  `--list-experimental-sandboxes`를 제공해 report/matrix/history에
  `experimentalSandbox` manifest를 남깁니다. 이 manifest는 `manifest-only`,
  `algorithmAdapter=false`, `runtimeTrackerPolicy=""`, `productDefaultOn=false`
  상태입니다.
- sandbox flag는 `verify-tracker-stability`로 전달되지 않습니다. 실제 비교는
  현재 허용된 runtime tracker policy(`lite`, `kalman-lite`, `bytetrack`) 중
  사용자가 명시한 값으로만 실행합니다.
- `--tracker-policy oc-sort`, `analysis.trackingPolicy.tracker=oc-sort`,
  `/ops/rules` tracker option, `ObjectTrackerKind` enum 추가는 모두 이 항목의
  완료 조건이 아니라 금지/별도 review 조건입니다.
- `test/fixtures/v150_oc_sort_experimental_sandbox.json`은 allowed/rejected tracker,
  retained/excluded evidence, 후속 분류를 manifest fixture로 고정합니다.
- report/history evidence는 summary/report/index와 sandbox manifest만 보존하며,
  raw media, crop, embedding, model/source/auth material은 보존하지 않습니다.
- Event POST/WebRTC DataChannel/SSE/WS metadata schema, RTSP/WebRTC media path,
  ScenarioEngine 판단 로직, tracker/Re-ID runtime 선택 계약은 변경하지 않습니다.

검증 기준:

- `./server.sh build`
- `./server.sh verify-v150-oc-sort-experimental-sandbox`
- `./server.sh verify-oc-sort-benchmark-boundary`
- `./server.sh compare-close-object-tracker --list-experimental-sandboxes`
- 필요 시
  `./server.sh compare-close-object-tracker --fixture-matrix --experimental-sandbox oc-sort --tracker-policy bytetrack --max-fixtures 1`
- `./server.sh verify-script-inventory`
- `git diff --check`

이번 항목의 범위 밖:

- 실제 OC-SORT algorithm adapter와 dataset benchmark report
- OC-SORT를 `analysis.trackingPolicy.tracker` 허용값 또는 `/ops/rules` 선택값으로 추가
- OC-SORT 결과를 제품 tracker 교체, tracker default-on, Re-ID default-on 근거로 사용
- ByteTrack/Kalman-lite/OC-SORT 장기 fixture matrix history를 제품 review로 승격
- BoT-SORT/DeepSORT/Re-ID model artifact/privacy/bundle review와 결합
- Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경
- RTSP/WebRTC media path 변경 또는 media pipeline blocking 정책 변경

후속 분류:

- 미분류 P0~P1 후속 이슈: 없음. 이번 항목에서 발견한 빈칸은 명시적 sandbox
  manifest, compare harness metadata, 전용 verifier, fixture로 닫습니다.
- 실제 OC-SORT algorithm adapter, dataset benchmark report,
  ByteTrack/Kalman-lite/OC-SORT fixture matrix comparison history, field sample 기반
  tracker replacement product review는 아래 별도 Phase 후보이며 V150-P2-01의
  즉시 후속으로 끌어오지 않습니다.

v1.5.0 비범위:

- tracker/Re-ID global default-on 또는 제품 기본값 변경
- 기존 rule/source/profile 자동 migration
- tracker warning, fixture matrix, field evidence를 기본값 승격 근거로 표시
- Re-ID model/runtime binary bundle, release asset 업로드, container/offline package 포함
- raw field media, crop, embedding, auth/source material 저장 또는 public archive
- OC-SORT/BoT-SORT/DeepSORT를 기본 runtime tracker로 승격
- Event POST/WebRTC DataChannel/SSE/WS metadata payload 무심사 변경
- RTSP/WebRTC media path 또는 pipeline blocking 정책 변경

### v1.5.0 Follow-up Closure

v1.5.0 roadmap 구현 뒤 남은 후속 항목은
[v1.5.0 Follow-up Closure](./v1.5.0-follow-up-closure.md)에 분리합니다.
`verify-v150-follow-up-closure`는 명시 opt-in guard, stability matrix,
Re-ID provenance/fallback approval, Ops warning next-action, audit export review,
field smoke summary evidence boundary, OC-SORT experimental sandbox가 각각 닫은
항목과 별도 Phase gate를 구분합니다.

2026-05-19 KST 기준 추가 기능 개발로 처리할 v1.5.0 후속 이슈는 남기지 않습니다.
field sample history review workflow, tracker experimental benchmark harness,
actual OC-SORT algorithm adapter and dataset benchmark report, runtime/model bundle
RC policy, ONVIF field smoke evidence reconciliation, release evidence dashboard
cleanup은 v1.5.0 잔여가 아니라 별도 Phase gate입니다.

## v1.4.0 Minor Close-out

v1.4.0은 v1.2.x의 source-only/live-only 경계를 유지하면서 운영 흐름과 현장
검증 밀도를 닫은 v1.3.0 위에 rule-level tracker/Re-ID opt-in을 추가한 minor
release로 닫았습니다. Re-ID와 tracker를 전역 기본값으로 바꾸지 않고, 룰 설정에서
명시적으로 선택하는 분석 정책으로만 엽니다. 기존 룰과 source/profile은 자동
migration하지 않으며, 선택하지 않은 룰은 현재 lightweight tracker 동작을
유지합니다.

기본 원칙:

- 전체/global 기본 활성화 없음
- 기존 Lite tracker를 기본 호환 경로로 유지
- tracker와 Re-ID는 룰별 설정에서 각각 선택
- Re-ID는 기본 `off`이며, model/provenance/privacy gate가 통과한 경우에만 opt-in
- Event POST, WebRTC DataChannel, SSE/WS metadata schema와 RTSP/WebRTC media
  path는 별도 review 전까지 변경하지 않음
- embedding, crop, model path, track-linked appearance profile은 client/viewer,
  외부 metadata, release artifact에 노출하지 않음

| ID | 우선순위 | 영역 | 목표 | 예상 검증 |
| --- | --- | --- | --- | --- |
| V140-P0-01 | P0 | Rule-level tracking policy contract | 룰 payload와 runtime policy에 tracker/Re-ID 선택값을 추가하되 기존 룰은 Lite tracker와 Re-ID `off`로 해석합니다. tracker 후보는 `none`, `lite`, `kalman-lite`, `bytetrack`를 v1.4.0 대상 후보로 둡니다. | `verify-rule-ui`, `verify-ops-rules-roundtrip`, `verify-analysis-state`, metadata schema review |
| V140-P0-02 | P0 | Ops Rules tracker/Re-ID selection UI | `/ops/rules`에서 Tracker와 Re-ID를 별도 control로 선택하고 저장/불러오기/preview/roundtrip을 검증합니다. `tracker=none`이면 Re-ID 선택은 비활성 또는 `off`로 강제합니다. | `verify-rule-ui`, `verify-ops-rules-roundtrip`, `verify-ops-client-ui --screenshots` |
| V140-P0-03 | P0 | Privacy and runtime fallback gate | Re-ID model path/checksum/provenance, NoOp fallback, bounded async worker, rate limit, stale drop, 외부 metadata 비노출 guard를 v1.4.0 opt-in gate로 묶습니다. | `verify-reid-advanced-tracking`, privacy/docs review, `verify-webrtc-va-metadata`, `verify-va-metadata-sidechannel` |
| V140-P1-01 | P1 | Kalman-lite tracker | 현재 direction-based/lightweight tracker에 motion prediction/lost buffer 보강을 추가해 짧은 누락, bbox jitter, reacquire 후보 선택을 개선합니다. Re-ID/model dependency 없이 룰별 opt-in으로 제공합니다. | `verify-tracker-stability`, `compare-close-object-tracker`, `verify-va-replay`, `verify-va-events` |
| V140-P1-02 | P1 | ByteTrack tracker | YOLO detection 결과의 high/low confidence association을 분리해 track 끊김을 줄이는 ByteTrack 계열 tracker를 추가 tracker 후보로 구현합니다. low-confidence bbox가 event/zone/line 판단을 흔들지 않도록 quality gate를 둡니다. | `compare-close-object-tracker --fixture-matrix`, `verify-tracker-stability`, `verify-va-replay`, `verify-va-events` |
| V140-P1-03 | P1 | Re-ID assist 고도화 | Re-ID를 독립 default tracker가 아니라 selected tracker의 association 보조 옵션으로 제한합니다. model artifact는 repo/release asset에 포함하지 않고, missing/invalid model은 NoOp으로 fallback합니다. | `verify-reid-advanced-tracking`, `compare-close-object-tracker`, privacy review |
| V140-P2-01 | P2 | OC-SORT 후순위 benchmark | OC-SORT는 v1.4.0 필수 구현이 아니라 ByteTrack/Kalman-lite 이후 비교 benchmark 또는 experimental 후보로 낮춥니다. Re-ID 없이 motion/observation 중심 비교를 수행하되 제품 tracker 교체 근거로 과장하지 않습니다. | 별도 benchmark report, `compare-close-object-tracker`, docs review |
| V140-P2-02 | P2 | BoT-SORT/DeepSORT research boundary | BoT-SORT/DeepSORT 계열은 Re-ID/model/privacy 부담이 커서 v1.4.0 기본 구현 후보가 아니라 research note와 dependency/privacy 검토 대상으로 유지합니다. | `verify-bot-sort-deepsort-research-boundary`, `verify-reid-advanced-tracking`, privacy/bundle docs review |

v1.4.0 비범위:

- 전체/global tracker 기본값 변경
- 기존 룰/source/profile 자동 migration
- Re-ID 또는 ByteTrack/OC-SORT/BoT-SORT/DeepSORT를 선택하지 않은 룰에 자동 적용
- Event POST/WebRTC DataChannel/SSE/WS metadata payload 무심사 변경
- RTSP/WebRTC media path 또는 pipeline blocking 정책 변경
- Re-ID model/runtime binary bundle, release asset 업로드, container/offline package 포함
- field sample scheduler, dataset ingest, 고객/현장 영상 보존 자동화

v1.4.0 close-object/field-driving report 보존 기준은
[Close-object Report Archive Policy](./close-object-report-archive-policy.md)에 둡니다.
이 정책은 summary/report/history index를 검증 evidence로 보존하는 범위이며,
제품 default-on 승격이나 raw media/image archive를 열지 않습니다.
Ops Dashboard의 트래킹 이슈 그룹은 warning을 default-on 근거로 과장하지 않도록
샘플 message와 association/overlap/missed/direction 요약을 함께 표시합니다.
v1.4.0 범위 안 후속 이슈 종료 판정은
[v1.4.0 Follow-up Closure](./v1.4.0-follow-up-closure.md)에 분리합니다.
`verify-v140-follow-up-closure`는 Re-ID warning history, report archive policy,
tracker warning dashboard summary가 닫혔고 default-on/benchmark gate가 별도
Phase로 남는지 확인합니다.

### V140-P0-01 Rule-level tracking policy contract 정리 기준

`Rule-level tracking policy contract`는 tracker/Re-ID를 전역 기본값으로 켜지 않고
저장 rule 또는 vaRule의 `analysis.trackingPolicy`에서만 선택하는 계약입니다.

계약 필드:

```json
{
  "analysis": {
    "classes": ["person", "vehicle"],
    "trackingPolicy": {
      "tracker": "lite",
      "reid": "off"
    }
  }
}
```

- `tracker` 허용값은 `none`, `lite`, `kalman-lite`, `bytetrack`입니다.
- `reid` 허용값은 `off`, `assist`입니다.
- 기존 rule/vaRule처럼 `analysis.trackingPolicy`가 없으면 runtime은
  `tracker=lite`, `reid=off`로 해석하고 저장 문서를 자동 migration하지
  않습니다.
- `tracker=none`이면 runtime tracking을 끄며 `reid=assist` 조합은 API 저장에서
  거부합니다.
- `kalman-lite`는 v1.4.0 P1 opt-in runtime tracker로 제공하며,
  `effectiveTracker=kalman-lite`로 표시합니다.
- `bytetrack`은 v1.4.0 P1 opt-in runtime tracker로 제공하며,
  `effectiveTracker=bytetrack`으로 표시합니다. low-confidence association은
  internal continuity 보강에만 사용하고 event/zone/line 판단용 public track으로
  승격하지 않습니다.
- Re-ID `assist`는 선택값 계약일 뿐이며 model artifact, embedding, crop, model
  path, checksum/provenance는 외부 Event POST/WebRTC/SSE/WS metadata 또는
  client/viewer 화면에 노출하지 않습니다.
- 외부 payload의 `source.profileKey` 문자열도 policy token을 추가하지 않고 기존
  profile 식별 역할을 유지합니다. policy 구분은 internal analysis reuse key와
  `/ops/api/runtime/status`의 operator runtime status에서만 확인합니다.

검증 기준:

- `./server.sh build`
- `./server.sh verify-rule-ui`
- `./server.sh verify-ops-rules-roundtrip`
- `./server.sh verify-analysis-state`
- `git diff --check`

이번 항목의 범위 밖:

- `/ops/rules` tracker/Re-ID 선택 control 추가
- ByteTrack tracker 구현
- Re-ID model/provenance runtime gate 고도화
- Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경
- RTSP/WebRTC media path 또는 pipeline blocking 정책 변경

### V140-P0-03 Privacy and runtime fallback gate 정리 기준

`Privacy and runtime fallback gate`는 Re-ID `assist`가 선택되더라도 model identity
material과 appearance profile을 외부 payload로 내보내지 않고, 실제 model runtime은
명시적인 opt-in gate를 통과할 때만 켜는 경계입니다.

확인됨:

- Re-ID model runtime은 `MEDIA_SERVER_ANALYSIS_APPEARANCE_MODEL`,
  `MEDIA_SERVER_ANALYSIS_APPEARANCE_MODEL_SHA256`,
  `MEDIA_SERVER_ANALYSIS_APPEARANCE_MODEL_PROVENANCE`가 모두 있을 때만 실제
  ONNX extractor 후보가 됩니다.
- model 파일 없음, checksum 누락/형식 오류/불일치, provenance 누락, OpenSSL 없는
  checksum 검증 불가, ONNX Runtime 미빌드는 모두 NoOp fallback으로 닫습니다.
- appearance worker는 bounded async queue, per-stream rate limit, global queue
  limit, stale job drop을 유지하며 media pipeline을 blocking하지 않습니다.
- runtime/operator status는 aggregate appearance count와 extractor counter만
  사용하고 model path, checksum, provenance, embedding, crop, appearance profile은
  Event POST/WebRTC DataChannel/SSE/WS metadata와 client/viewer 화면에 노출하지
  않습니다.

검증 기준:

- `./server.sh build`
- `./server.sh verify-reid-advanced-tracking`
- `./server.sh verify-analysis-state`
- `./server.sh verify-webrtc-va-metadata`
- `./server.sh verify-va-metadata-sidechannel`
- `git diff --check`

이번 항목의 범위 밖:

- 실제 Re-ID model artifact, model card, dataset provenance를 repo/release asset에 포함
- Re-ID default-on 제품 결정
- Kalman-lite/ByteTrack/OC-SORT/BoT-SORT/DeepSORT tracker 구현 또는 benchmark 실행
- Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경
- RTSP/WebRTC media path 또는 pipeline blocking 정책 변경
- runtime/model bundle RC policy, container/offline/binary package 포함

### V140-P1-01 Kalman-lite tracker 종료 판정

`Kalman-lite tracker`는 기존 Lite tracker를 전역 기본값으로 바꾸지 않고
저장 rule/vaRule의 `analysis.trackingPolicy.tracker=kalman-lite`에서만 켜는
opt-in runtime tracker입니다.

확인됨:

- `kalman-lite`는 runtime fallback 없이 `effectiveTracker=kalman-lite`로
  해석합니다.
- tracker 내부에 bounded constant-velocity Kalman-lite state를 두고, 짧은
  missed gap에서는 예측 bbox를 association 후보로 사용합니다.
- 매칭된 detection bbox는 Kalman-lite correction 결과로 보정해 bbox jitter를
  줄입니다.
- Re-ID/model dependency, embedding/crop/model path, 외부 metadata field는
  추가하지 않습니다.
- `verify-tracker-stability`와 `compare-close-object-tracker`는
  `--tracker-policy kalman-lite` 옵션으로 임시 vaRule을 만들어 rule-level opt-in
  경로를 직접 검증할 수 있습니다.

검증 기준:

- `./server.sh build`
- `./server.sh verify-analysis-state`
- `./server.sh verify-tracker-stability --tracker-policy kalman-lite`
- `./server.sh compare-close-object-tracker --tracker-policy kalman-lite`
- `./server.sh verify-va-replay`
- `./server.sh verify-va-events`
- `git diff --check`

이번 항목의 범위 밖:

- Lite tracker의 전역/default 동작 변경
- ByteTrack, OC-SORT, BoT-SORT, DeepSORT 구현
- Re-ID assist 고도화, Re-ID default-on, model/runtime bundle 포함
- Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경
- RTSP/WebRTC media path 또는 pipeline blocking 정책 변경

### V140-P1-02 ByteTrack tracker 종료 판정

`ByteTrack tracker`는 기존 Lite tracker를 전역 기본값으로 바꾸지 않고
저장 rule/vaRule의 `analysis.trackingPolicy.tracker=bytetrack`에서만 켜는
opt-in runtime tracker입니다.

확인됨:

- `bytetrack`은 runtime fallback 없이 `effectiveTracker=bytetrack`으로
  해석합니다.
- tracker 내부에서 high-confidence detection을 먼저 association하고,
  unmatched track에 한해서 low-confidence detection을 2차 association 후보로
  사용합니다.
- low-confidence detection은 기존 track continuity를 내부적으로 이어줄 수 있지만
  새 public track을 만들지 않고, event/zone/line 판단용 track metadata로도
  승격하지 않습니다.
- ByteTrack은 vehicle-heavy/field-driving fixture에서 짧은 detection gap을
  흡수하도록 bounded lost buffer floor를 내부적으로 적용하지만, 이 설정은
  `tracker=bytetrack` opt-in rule에만 적용하며 제품 default-on 승격 근거로
  사용하지 않습니다.
- Re-ID/model dependency, embedding/crop/model path, 외부 metadata field는
  추가하지 않습니다.
- `verify-tracker-stability`와 `compare-close-object-tracker`는
  `--tracker-policy bytetrack` 옵션으로 임시 vaRule을 만들어 rule-level opt-in
  경로를 직접 검증할 수 있습니다.

검증 기준:

- `./server.sh build`
- `./server.sh verify-analysis-state`
- `./server.sh compare-close-object-tracker --fixture-matrix --tracker-policy bytetrack`
- `./server.sh verify-tracker-stability --tracker-policy bytetrack`
- `./server.sh verify-va-replay`
- `./server.sh verify-va-events`
- `git diff --check`

이번 항목의 범위 밖:

- Lite tracker의 전역/default 동작 변경
- OC-SORT, BoT-SORT, DeepSORT 구현 또는 benchmark 실행
- Re-ID assist 고도화, Re-ID default-on, model/runtime bundle 포함
- Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경
- RTSP/WebRTC media path 또는 pipeline blocking 정책 변경

### V140-P1-03 Re-ID assist 고도화 종료 판정

`Re-ID assist 고도화`는 Re-ID를 독립 tracker나 제품 기본값으로 승격하지 않고,
저장 rule/vaRule의 `analysis.trackingPolicy.reid=assist`가 명시된 경우에만
선택된 tracker의 association 보조 hook으로 제한하는 범위입니다.

확인됨:

- Re-ID assist는 `tracker=lite`, `tracker=kalman-lite`, `tracker=bytetrack` 같은
  selected tracker가 있는 rule-level opt-in에서만 의미가 있습니다.
- `tracker=none` 조합에서는 API 저장 단계에서 `reid=assist`를 거부하고 runtime은
  `reid=off` fallback 경계를 유지합니다.
- appearance hook은 TrackStateManager의 TrackCreated, ReacquireCandidate,
  LowConfidenceAssociation, 제한적 Periodic trigger에서만 실행 후보를 만들며
  track id를 독립 생성하거나 selected tracker의 public event/scene-visible
  metadata를 대체하지 않습니다.
- `verify-tracker-stability`와 `compare-close-object-tracker`는
  `--reid-policy assist` 옵션으로 임시 vaRule을 만들고 tap runtime의
  `trackingPolicy.reid=assist` 적용을 확인할 수 있습니다.
- 단일 close-object 비교의 `--history-dir`는 Re-ID assist warning/counter drift
  추세를 summary/report/index로 남깁니다. 이 history는 관찰 evidence이며
  Re-ID assist default-on 또는 제품 tracker 교체 완료 근거로 사용하지 않습니다.
- Re-ID model artifact는 repo/release asset에 포함하지 않습니다. model missing,
  checksum/provenance 누락 또는 불일치, ONNX Runtime 미빌드는 NoOp fallback으로
  닫습니다.
- embedding, crop, model path, checksum/provenance, track-linked appearance profile은
  Event POST/WebRTC DataChannel/SSE/WS metadata와 client/viewer 화면에 노출하지
  않습니다.

검증 기준:

- `./server.sh build`
- `./server.sh verify-reid-advanced-tracking`
- `./server.sh verify-analysis-state`
- `./server.sh compare-close-object-tracker --tracker-policy bytetrack --reid-policy assist --history-dir /private/tmp/media_server_v140_reid_assist_warning_trend`
- `git diff --check`

이번 항목의 범위 밖:

- Re-ID default-on 제품 결정
- 실제 Re-ID model artifact, model card, dataset provenance를 repo/release asset에 포함
- Re-ID embedding similarity로 ObjectTracker association score를 직접 변경
- OC-SORT, BoT-SORT, DeepSORT 구현 또는 benchmark 실행
- Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경
- RTSP/WebRTC media path 또는 pipeline blocking 정책 변경

### V140-P2-01 OC-SORT 후순위 benchmark 종료 판정

`OC-SORT 후순위 benchmark`는 OC-SORT를 v1.4.0 runtime tracker나
rule-level 선택값으로 추가하지 않고, Kalman-lite/ByteTrack opt-in 결과 이후의
비교 benchmark 후보로만 남기는 범위입니다.

확인됨:

- `analysis.trackingPolicy.tracker` 허용값에 추가하지 않습니다. 현재 허용값은
  `none`, `lite`, `kalman-lite`, `bytetrack`입니다.
- `/ops/rules` UI, rule validation, `AnalysisProfile` runtime policy,
  `ObjectTrackerKind`, `verify-tracker-stability`, `compare-close-object-tracker`는
  OC-SORT/ocsort token을 제품 tracker로 받지 않습니다.
- OC-SORT 비교를 열 때도 Re-ID 없이 motion/observation 중심으로만 비교하며,
  embedding/crop/model path, appearance profile, model/runtime bundle을 함께
  열지 않습니다.
- ByteTrack/Kalman-lite 이후 benchmark report는 기존
  `compare-close-object-tracker` fixture matrix와 `defaultOnDecision`,
  `productDefaultOn`, `candidateCount`, `defaultOnReason` 필드를 사용해
  `matrix-ok`와 제품 default-on/교체 판단을 분리해야 합니다.
- Event POST/WebRTC DataChannel/SSE/WS metadata schema, Event POST payload,
  RTSP/WebRTC media path, client/viewer 노출 정보는 이 항목에서 변경하지
  않습니다.
- 미분류 P0~P1 후속 이슈: 없음.

검증 기준:

- `./server.sh verify-oc-sort-benchmark-boundary`
- `./server.sh verify-reid-advanced-tracking`
- `./server.sh verify-script-inventory`
- `./server.sh verify-docs-links`
- `git diff --check`

이번 항목의 범위 밖:

- 실제 OC-SORT algorithm 구현 또는 runtime tracker 선택값 추가
- OC-SORT benchmark 실행 결과를 제품 tracker 교체 근거로 과장
- OC-SORT와 Re-ID/BoT-SORT/DeepSORT/model artifact/privacy review를 한 작업으로
  묶기
- Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경
- RTSP/WebRTC media path 또는 pipeline blocking 정책 변경

별도 Phase 후보로 기록:
세부 후보의 source-of-truth는
[OC-SORT Benchmark Boundary](oc-sort-benchmark-boundary.md#후속-분류)입니다.
이 backlog에서는 `실제 OC-SORT algorithm adapter와 dataset benchmark report`를
대표 후보로만 참조하고, fixture history와 field product review 목록은 전용 문서에서
관리합니다.

### V140-P2-02 BoT-SORT/DeepSORT research boundary 종료 판정

`BoT-SORT/DeepSORT research boundary`는 appearance/Re-ID 의존성이 큰 tracker를
v1.4.0 runtime tracker, rule-level 선택값, 제품 default-on 후보로 승격하지 않고
research note와 dependency/privacy 검토 대상으로만 남기는 범위입니다.

확인됨:

- `analysis.trackingPolicy.tracker` 허용값에 BoT-SORT/DeepSORT를 추가하지
  않습니다. 현재 허용값은 `none`, `lite`, `kalman-lite`, `bytetrack`입니다.
- `/ops/rules` UI, rule validation, `AnalysisProfile` runtime policy,
  `ObjectTrackerKind`, `verify-tracker-stability`, `compare-close-object-tracker`는
  BoT-SORT/botsort/DeepSORT/deepsort token을 제품 tracker로 받지 않습니다.
- BoT-SORT/DeepSORT 연구는 appearance/Re-ID model, embedding/crop,
  camera motion compensation, dataset provenance, model/runtime bundle policy,
  retention/redaction policy를 별도 privacy/dependency review로 분리합니다.
- Event POST/WebRTC DataChannel/SSE/WS metadata schema, Event POST payload,
  RTSP/WebRTC media path, client/viewer 노출 정보는 이 항목에서 변경하지
  않습니다.
- 미분류 P0~P1 후속 이슈: 없음.

검증 기준:

- `./server.sh verify-bot-sort-deepsort-research-boundary`
- `./server.sh verify-reid-advanced-tracking`
- `./server.sh verify-script-inventory`
- `./server.sh verify-docs-links`
- `git diff --check`

이번 항목의 범위 밖:

- 실제 BoT-SORT/DeepSORT algorithm 구현 또는 runtime tracker 선택값 추가
- BoT-SORT/DeepSORT benchmark 실행 결과를 제품 tracker 교체 근거로 과장
- Re-ID model artifact, embedding store, crop retention, model/runtime bundle 포함
- OC-SORT benchmark와 BoT-SORT/DeepSORT privacy/dependency review를 한 작업으로
  묶기
- Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경
- RTSP/WebRTC media path 또는 pipeline blocking 정책 변경

별도 Phase 후보로 기록:
세부 후보의 source-of-truth는
[BoT-SORT/DeepSORT Research Boundary](bot-sort-deepsort-research-boundary.md#후속-분류)입니다.
이 backlog에서는 `BoT-SORT/DeepSORT dependency/privacy threat model`과
`runtime/model bundle RC policy`를 대표 후보로만 참조하고, model card, crop
retention, dataset benchmark 세부 목록은 전용 문서에서 관리합니다.

## v1.3.0 Minor Close-out

v1.3.0은 v1.2.x의 source-only/live-only 경계를 유지하면서 운영 흐름과 현장
연동 검증 밀도를 높인 minor release로 닫았습니다. 새 항목은 기존 API/schema,
Event POST payload, WebRTC DataChannel, SSE/WS metadata, auth/session contract,
RTSP/WebRTC media path를 기본적으로 유지합니다. 이 계약을 바꾸는 작업은 아래
범위 안에 있어도 별도 schema/media-path review를 먼저 열어야 합니다.

| ID | 우선순위 | 영역 | 목표 | 예상 검증 |
| --- | --- | --- | --- | --- |
| V130-P0-01 | P0 | Runtime operations console | Runtime Dashboard, scenario timeline, TrackHealth, recent EventRecord를 운영자가 한 화면에서 원인/영향/다음 조치 순서로 읽을 수 있게 정리합니다. schema 변경 없이 기존 runtime/state/event buffer를 재구성합니다. | `verify-va-runtime-console`, `verify-webrtc-va-metadata`, `verify-va-metadata-sidechannel`, `verify-ops-client-ui --screenshots` |
| V130-P0-02 | P0 | ONVIF field smoke gate | 실장비 ONVIF camera smoke를 release 개발 완료로 과장하지 않으면서 endpoint, credential, RTSP/RTSPS playback, redaction artifact를 별도 gate로 기록하는 절차를 [ONVIF Field Smoke Gate](./onvif-field-smoke-gate.md)에 고정합니다. persistent credential store와 Digest/WS-Security 구현은 열지 않습니다. | `verify-onvif-no-device-suite`, `verify-onvif-field-smoke-gate`, `verify-onvif-field-smoke-redaction`, field smoke report review |
| V130-P0-03 | P0 | Source health incident workflow | source health root-cause, retryable-only 재검증, partial failure/rollback 이력을 incident 단위로 추적하고 운영자 next-action을 더 직접적으로 연결합니다. client에는 sanitized summary만 유지합니다. | `verify-ops-source-health-bulk`, `verify-ops-audit-trail`, `verify-ops-client-ui --screenshots` |
| V130-P1-01 | P1 | Client Live accessibility/mobile polish | viewer Live/Dashboard에서 tile 상태, empty/loading/error 문구, focus, mobile density를 보강합니다. source URL, raw JSON, debug counter, rule/profile editor는 계속 숨깁니다. | `verify-ops-client-ui --screenshots`, client accessibility DOM snapshot, `verify-auth-routes` |
| V130-P1-02 | P1 | Rule/Scenario preset quality | Loitering/ZoneOccupancy/LineCrossing 시작 preset과 warning copy를 field sample replay 기준으로 정리합니다. ScenarioEngine 판단 로직과 event type/payload는 별도 review 전까지 변경하지 않습니다. | `verify-rule-ui`, `verify-va-replay`, `verify-va-events`, docs review |
| V130-P1-03 | P1 | Audit trail operations | server audit persistence를 운영자가 검색/export/review할 수 있는 최소 흐름으로 연결합니다. 민감 토큰, passwordHash, credential reference 원문은 UI/API 응답에 노출하지 않습니다. | `verify-auth-users`, `verify-auth-routes`, `verify-ops-audit-trail` |
| V130-P2-01 | P2 | Release and visual baseline automation | v1.2.x에서 만든 release close-out helper, visual artifact policy, screenshot review 결과를 PR/release 준비 단계에서 누락 없이 요약하도록 묶습니다. tag/push/GitHub Release는 계속 수동 승인 gate입니다. | `verify-release-closeout-helper`, `verify-docs-ui-assets`, `verify-ui-visual-artifact-index`, `git diff --check` |
| V130-P2-02 | P2 | Re-ID default-off research continuation | close-object tracker 비교와 privacy 문구를 유지하면서 Re-ID default-on 근거가 충분한지 별도 research로만 관찰합니다. 제품 기본 활성화나 대형 tracker 교체는 포함하지 않습니다. | `compare-close-object-tracker`, `verify-reid-advanced-tracking`, privacy/docs review |

v1.3.0 비범위:

- 장기 녹화, MP4 recorder, NVR/VMS archive, playback/search
- ONVIF Profile G recording/replay, WS-Discovery 자동 검색의 제품 기본 승격
- ONVIF credential store, Digest, WS-Security 구현 착수
- Event POST/WebRTC DataChannel/SSE/WS metadata payload의 무심사 변경
- RTSP/WebRTC media path 또는 pipeline blocking 정책 변경
- Re-ID default-on, 대형 tracker 교체, runtime/model binary bundle 포함
- YouTube 운영 기능 승격 또는 실제 YouTube URL relay 성공 gate

### V130-P0-01 Runtime operations console 정리 기준

`Runtime operations console`은 `/ops/dashboard` 안에서 운영자가 같은 화면에서
원인, 영향, 다음 조치를 읽는 판독 계층으로 유지합니다.

- 새 backend API, metadata schema, Event POST payload, WebRTC DataChannel,
  SSE/WS schema, RTSP/WebRTC media path는 열지 않습니다.
- `/ops/api/runtime/status`, `/lab/analysis/taps/{tapId}/state-dump`,
  `/lab/analysis/taps/{tapId}/metrics`, `/ops/api/events/status`의 기존
  runtime/state/event buffer를 client-side에서 재구성합니다.
- 표시 순서는 `원인`(scenario phase, TrackHealth, high-water),
  `영향`(active track, timeline, recent EventRecord, event failure),
  `다음 조치`(operator action)입니다.
- 장시간 안정성 판정은 `verify-va-runtime-console-longrun` 또는
  `verify-predev` 실행 결과를 별도로 기록할 때만 완료 evidence로 취급합니다.

### V130-P0-02 ONVIF field smoke gate 정리 기준

`ONVIF field smoke gate`는 release 개발 완료와 별도 field gate 결과를 분리하는
절차입니다. 실제 ONVIF camera endpoint 성공은 field gate report에만 기록하고,
no-device suite 통과를 실장비 성공으로 승격하지 않습니다.

- 기준 문서: [ONVIF Field Smoke Gate](./onvif-field-smoke-gate.md)
- 개발 산출물: gate 상태값, 실행 절차, redaction artifact review, field smoke
  report review, sample bundle gate decision field, 정적 verifier
- 개발 종료 판정: `verify-onvif-field-smoke-gate`,
  `verify-onvif-field-smoke-redaction`, `verify-onvif-field-smoke-sample-bundle`,
  `verify-onvif-no-device-suite`, `git diff --check` 통과
- 실장비 endpoint 성공 미확인, 실제 credential handshake 미확인, 실제 RTSP/RTSPS
  playback 미확인은 이 gate report의 `unverified` 상태로 남기며 개발 완료 판정과
  섞지 않습니다.
- persistent credential store, Digest/WS-Security, WS-Discovery, Profile G /
  Recording / Replay는 이 카테고리에서 구현하지 않습니다.
- 2026-05-17 기준 이 카테고리의 개발 가능한 후속 이슈는 없음으로 판정하려면
  위 verifier와 no-device suite가 모두 통과해야 합니다.

### V130-P0-03 Source health incident workflow 종료 판정

2026-05-17 기준 V130-P0-03은 기존 source health API/bulk/audit 계약을
유지하면서 Dashboard incident 단위 추적을 보강하는 범위에서 종료합니다.

확인됨:

- `/ops/dashboard`의 `최근 인시던트 흐름`은 source health 단서를
  `source-health:<sourceId>:<status>:<reason>` UI incident ID로 표시하고
  검색 대상에 포함합니다.
- Source Health 인시던트 항목의 `관련 화면`은 `/ops/sources` 변경 이력의
  `Source Health 변경` preset, `source-health-state-change` action,
  `source:<sourceId>` target으로 바로 이동합니다.
- Dashboard source health next-action은 기존 bulk `check`와
  `retryBody.sourceIds` 기반 retryable-only 재검증을 유지합니다.
- partial failure는 실패 source 구성 확인 대상으로 남기며, source health bulk는
  registry를 변경하지 않는 dry-run이라 rollback 대상이 없다는 경계를 유지합니다.
- client/viewer에는 incident ID, source locator, raw diagnostics, bulk result를
  노출하지 않습니다.

검증 기준:

- `./server.sh verify-ops-source-health-bulk`
- `./server.sh verify-ops-audit-trail`
- `./server.sh verify-ops-client-ui --screenshots`
- `./server.sh verify-ops-root-cause-panel`
- `git diff --check`

범위 밖:

- `/ops/api/source-health`, `/ops/api/source-health/bulk`, Event POST,
  WebRTC DataChannel, SSE/WS metadata schema 변경
- RTSP/WebRTC media path 또는 pipeline blocking 정책 변경
- `/ops/sources`에 별도 source health bulk panel/table/detail 추가
- client/viewer source URL, raw diagnostic JSON, debug counter 노출

### V130-P1-02 Rule/Scenario preset quality 정리 기준

`Rule/Scenario preset quality`는 `/ops/rules` 이벤트 템플릿 작성 단계에서
현장 preset을 확정값이 아니라 field sample replay 기준 시작값으로 설명하고,
Loitering/ZoneOccupancy/LineCrossing의 저장 payload 계약을 유지하는 범위입니다.

- LineCrossing은 기본 이벤트이므로 preset label을 새 field로 저장하지 않고
  `event.minConfidence`, direction, 2점 line geometry만 기존 payload에 남깁니다.
- Loitering preset은 dwell/radius/trajectory/cooldown 시작값과 TrackHealth
  불안정 시 dwell부터 늘리는 warning copy를 제공합니다.
- ZoneOccupancy preset은 threshold/min dwell/cooldown 시작값과 polygon 병목 전제,
  정상 피크 반복 시 threshold를 올리는 warning copy를 제공합니다.
- 개발 종료 판정은 `verify-rule-ui`, `verify-ops-scenario-presets`,
  `verify-ops-rules-roundtrip`, `verify-analysis-state`, `verify-va-replay`,
  `verify-va-events`, `git diff --check` 통과 기준입니다.

범위 밖:

- ScenarioEngine 판단 로직 변경
- event type 추가/변경
- Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경
- RTSP/WebRTC media path 변경
- 다음 카테고리인 Audit trail operations 개발

### V130-P1-03 Audit trail operations 종료 판정

2026-05-17 기준 V130-P1-03은 서버 감사 로그를 운영자가 검색/export/review하는
최소 흐름으로 연결하는 범위에서 종료합니다.

확인됨:

- `/ops/api/audit`는 서버 JSONL 감사 로그를 `area`, `actor`, `user`,
  `target`, `action`, `q`, `fromMs`, `toMs`, `offset`, `limit`으로 조회하고
  JSON/CSV/Diff JSON export를 제공합니다.
- `/ops/sources`, `/ops/rules`, `/ops/users` 하단 변경 이력 패널은 서버 감사
  로그를 기본으로 읽고, 서버 저장/조회 실패 시 브라우저 캐시 기록으로 후퇴합니다.
- 변경 이력 패널은 작업자/사용자/대상/action/기간/검색 필터, 이전/다음
  페이지, 상세 diff 모달, JSON/CSV/Diff JSON export를 제공합니다.
- audit 시간 표시는 서버가 직접 남긴 `receivedAtMs`를 우선 사용해 source health
  또는 evidence export audit도 `Invalid Date` 없이 검토할 수 있습니다.
- 비밀번호, token/hash, credential reference, capability 필드는 저장 전과
  조회/export 응답에서 전/후 값이 다시 마스킹됩니다.
- audit persistence verifier는 모바일 UI 계약에 맞춰 `YYYY-MM-DD HH:mm` text
  입력을 검증하며, native `datetime-local`로 되돌리지 않습니다.

검증 기준:

- `./server.sh build`
- `./server.sh verify-auth-users`
- `./server.sh verify-auth-routes`
- `./server.sh verify-ops-audit-trail`
- `./server.sh verify-ops-audit-persistence`
- `./server.sh verify-ops-client-ui`
- `./server.sh verify-ops-client-ui --screenshots`
- `./server.sh verify-rule-ui`
- `./server.sh verify-ui-copy-i18n-parity`
- `git diff --check`

범위 밖:

- audit event payload schema 변경
- Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경
- RTSP/WebRTC media path 변경
- ONVIF credential store, Digest, WS-Security 구현
- recorder/NVR/VMS archive/search/playback
- 다음 카테고리인 Release and visual baseline automation 개발

2026-05-17 기준 이 카테고리의 개발 가능한 후속 이슈는 위 검증 통과 시 남기지
않습니다.

### V130-P2-01 Release and visual baseline automation 정리 기준

2026-05-17 기준 release close-out helper가 PR/release 준비에서 visual baseline
자동화 누락 여부까지 함께 요약합니다.

확인됨:

- `./server.sh verify-release-closeout-helper --dry-run --report <report.md> --json-report <report.json>`가 release local verifier, tag/push 수동 gate, visual artifact policy, screenshot review 체크포인트를 한 dry-run report로 묶습니다.
- JSON report는 `media-server.release-visual-baseline-automation.v1` schema의 visual automation 요약을 포함합니다.
- preflight CI는 `media-server-release-closeout-helper-dry-run` artifact를 업로드하고, 기존 `media-server-ui-visual-baseline-diff`, `media-server-ui-visual-maintenance-dry-run` artifact와 함께 PR summary에서 확인하게 합니다.
- PR template의 `Release / Visual Baseline Readiness` 섹션이 release close-out helper report, baseline diff/comment artifact, maintenance dry-run artifact, manual/not-run release action 구분을 요구합니다.
- tag, push, GitHub Release, accepted baseline 채택, 320/390/760/1180px screenshot review는 실제 실행과 링크가 없으면 pass로 쓰지 않습니다.
- schema, media path, auth/session, WebRTC/DataChannel/SSE/WS metadata 계약은 변경하지 않았습니다.

검증 기준:

- `./server.sh verify-release-closeout-helper`
- `./server.sh verify-docs-ui-assets`
- `./server.sh verify-ui-visual-artifact-index`
- `./server.sh verify-ui-release-baseline-approval-log`
- `./server.sh verify-actions-security`
- `git diff --check`

범위 밖:

- tag 생성, push, GitHub Release 생성
- release baseline artifact를 public release asset 또는 candidate pass proof로 승격
- 실제 UI screenshot 수동 승인 없이 baseline 채택 완료로 기록
- RTSP/WebRTC media path, Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경
- 다음 카테고리인 Re-ID default-off research continuation 개발

2026-05-17 기준 이 카테고리의 개발 가능한 후속 이슈는 위 검증 통과 시 남기지
않습니다.

### V130-P2-02 Re-ID default-off research continuation 종료 판정

2026-05-17 기준 V130-P2-02는 close-object tracker 비교와 Re-ID privacy
boundary를 default-off 연구 산출물로 유지하는 범위에서 종료합니다.

확인됨:

- 기준 문서: [Re-ID Default-off Research Continuation](./reid-default-off-research-continuation.md)
- `compare-close-object-tracker --fixture-matrix --history-dir <dir>`는 matrix
  history index에 `defaultOnDecision`, `productDefaultOn`, `candidateCount`,
  `defaultOnReason`을 남겨 회차별 default-on 판단 흐름을 보존합니다.
- `productDefaultOn`은 제품 기본 활성화 여부이며, 이 연구 범위에서는 `False`로
  유지합니다. `review-required`도 제품 default-on 완료가 아니라 별도 review
  필요 상태입니다.
- `verify-reid-advanced-tracking`은 v1.3.0 (8) 문서, default-off/privacy,
  benchmark/history boundary, 외부 metadata identity material 미노출을 정적으로
  검증합니다.
- `tracking-event`, `tracking-event-long`, `tracking-event-slow-long`,
  `four-scene-control` 단독 후보와 `field-new-york-driving=warning` 판정은
  제품 default-on 근거로 과장하지 않습니다.

검증 기준:

- `./server.sh compare-close-object-tracker --fixture-matrix --history-dir <dir>`
- `./server.sh verify-close-object-fixture-matrix`
- `./server.sh verify-reid-advanced-tracking`
- `git diff --check`

범위 밖:

- Re-ID default-on
- Kalman/ByteTrack/BoT-SORT 같은 대형 tracker 교체
- 실제 Re-ID model artifact를 release asset 또는 runtime bundle에 포함
- Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경
- RTSP/WebRTC media path 변경
- client/viewer source URL, raw JSON, debug/identity material 노출

2026-05-17 기준 이 카테고리의 개발 가능한 후속 이슈는 위 검증 통과 시 남기지
않습니다. 실제 Re-ID model/field sample 기반 default-on 결정, 대형 tracker 교체,
runtime/model bundle 포함은 별도 Phase 후보이며 이 항목의 잔여가 아닙니다.

### v1.3.0 Follow-up Closure

v1.3.0 roadmap 기능 개발 이후 남은 후속 항목은
[v1.3.0 Follow-up Closure](./v1.3.0-follow-up-closure.md)에 분리합니다.
`verify-v130-follow-up-closure`는 실제 Re-ID model field review, field sample
반복 수집 정책, tracker 교체 후보 조사, model/runtime bundle 정책, Re-ID privacy
threat model을 별도 Phase gate 또는 release/field/manual approval gate로
분리하고, v1.3.0 안에 개발 가능한 후속 이슈가 남지 않았는지 정적으로 확인합니다.

2026-05-17 기준 추가 기능 개발로 처리할 v1.3.0 후속 이슈는 남기지 않습니다.
Re-ID default-on, tracker 교체, runtime/model bundle 포함, field sample scheduler,
dataset ingest는 이 closure에서 수행하지 않았습니다. tag/push/GitHub Release는
기능 개발 closure 범위가 아니라 별도 release 운영 gate로 분리합니다.

## v1.2.1 Patch Close-out

v1.2.1은 v1.2.0 release 이후 안정화 patch로 닫았습니다. 새 product scope를 열지 않고
문서/version drift, release close-out 자동화, flaky 검증, UI 수동 검수 보강을
우선합니다. schema, Event POST payload, WebRTC DataChannel, SSE/WS metadata,
RTSP/WebRTC media path, auth/session contract 변경은 별도 review 없이는 포함하지
않습니다.

| ID | 우선순위 | 영역 | 목표 | 예상 검증 |
| --- | --- | --- | --- | --- |
| V121-P0-01 | P0 | Release metadata consistency guard | `VERSION`, `CMakeLists.txt`, README, release/versioning/backlog 문서가 같은 release 기준을 말하는지 자동 점검합니다. v1.2.0에서 발견된 문서 drift를 patch gate로 막습니다. | `git diff --check`, `verify-release-metadata`, `verify-docs-links` |
| V121-P0-02 | P0 | Post-release smoke reconciliation | GitHub Actions 결과, 로컬 close-out 검증, 미실행 장시간/실장비 항목을 verification history에 분리 기록합니다. 통과하지 않은 항목을 release PASS처럼 쓰지 않는 보고 형식을 고정합니다. | `verify-public-repo-readiness`, `verify-docs-links`, `verify-post-release-reconciliation`, verification history review |
| V121-P0-03 | P0 | Manual UI full-test evidence | `/setup`, `/login`, `/ops/*`, `/client/*` 주요 흐름을 스크립트 결과가 아니라 수동 조작 기록으로 남기는 release checklist를 채웁니다. 발견된 작은 UI 문제만 patch 범위로 다룹니다. | `docs/manual-ui-checklist.md`, `docs/manual-ui-result-template.md`, `verify-manual-ui-evidence`, 수동 브라우저 검수 |
| V121-P1-01 | P1 | Flaky verifier stabilization | Access approval, rule preview save, clipboard fallback, fixture cleanup, browser route smoke의 재현성 문제를 좁은 test/guard 보강으로 정리합니다. | `verify-ops-click-e2e`, `verify-rule-ui`, `verify-fixture-cleanup-contracts`, `verify-flaky-verifiers` |
| V121-P1-02 | P1 | Re-ID WARNING guard hardening | `matrix-ok=True`와 제품 default-on 안정 판정을 혼동하지 않도록 docs/script 출력과 fixture candidate 문구를 더 강하게 고정합니다. | `compare-close-object-tracker`, `verify-reid-advanced-tracking`, docs review |
| V121-P1-03 | P1 | ONVIF field smoke readiness polish | 실장비 성공을 구현 완료로 말하지 않으면서 field smoke redaction template, operator checklist, failure wording을 정리합니다. credential store나 Digest/WS-Security는 열지 않습니다. | `verify-onvif-no-device-suite`, `verify-onvif-field-smoke-redaction`, `verify-onvif-protocol-support-matrix` |
| V121-P1-04 | P1 | Release close-out helper | release 전 version/doc/check/tag 준비 상태를 한 번에 요약하는 helper를 추가하거나 기존 verifier를 묶습니다. 실제 tag/push는 수동 승인 후에만 수행합니다. | `verify-public-repo-readiness`, `verify-release-bundle-dry-run`, `verify-release-closeout-helper` |
| V121-P2-01 | P2 | Korean/English doc drift cleanup | 통합 영어 index와 한국어 source-of-truth 사이의 링크/용어 차이를 줄이고, obsolete release 문구를 정리합니다. | `verify-docs-links`, `verify-docs-ui-assets`, text search |
| V121-P2-02 | P2 | UI polish from manual findings | 수동 UI 풀테스트에서 발견된 버튼 문구, overflow, focus, empty/loading/error copy 같은 작은 문제만 수정합니다. 제품 nav나 route 구조는 바꾸지 않습니다. | 수동 브라우저 검수, `verify-ops-client-ui --screenshots`, `verify-ui-copy-i18n-parity` |
| V121-P2-03 | P2 | Dependency and artifact housekeeping | dependency snapshot, UI visual artifact retention, sample fixture provenance를 release 후 상태에 맞춰 정리합니다. runtime/model/binary bundle은 포함하지 않습니다. | `dependency-snapshot`, `verify-ui-visual-artifact-index`, `verify-bundle-policy` |

### v1.2.1 Follow-up Closure

v1.2.1 roadmap 완료 뒤 남은 후속 항목은
[v1.2.1 Follow-up Closure](./v1.2.1-follow-up-closure.md)에 분리합니다.
`verify-v121-follow-up-closure`는 release 운영 gate, 외부 장비/credential gate,
수동 승인 gate를 개발 완료로 과장하지 않으면서 로드맵 내 개발 가능한 후속 이슈가
남지 않았는지 확인합니다.
2026-05-17 보강 UI 점검에서 확인한 320px product shell overflow/toolbar 정렬
risk는 v1.2.1 UI polish 범위 안에서 닫았고, 제품 nav/route/API/schema는
변경하지 않았습니다.

v1.2.1 비범위:

- ONVIF Profile G/Recording/Replay, WS-Discovery 자동 검색
- ONVIF persistent credential store, HTTP Digest, WS-Security UsernameToken
- Re-ID default-on, 대형 tracker 교체, 모델/runtime bundle 포함
- YouTube 운영 기능 승격, 실제 YouTube URL 성공 gate
- 장기 녹화, VMS/NVR archive, playback/search

## v1.2.0 Roadmap 종료 판정

v1.2.0은 v1.1.0 live-only 경계를 유지하면서 실제 현장 운영과 제품화 밀도를 높이는
minor release로 종료합니다. 아래 항목은 v1.2.0 close-out 기준입니다.

| 우선순위 | 영역 | 목표 | 예상 검증 |
| --- | --- | --- | --- |
| P0 | ONVIF Profile S/T live source 현장 연동 | Profile S/T 계열 카메라의 수동 입력 Device service endpoint 기준 HTTP SOAP probe, Media/Media2 profile 조회, live RTSP/RTSPS URI draft, credential reference/redaction 정책을 live source 등록 흐름과 연결. WS-Discovery 자동 검색과 Profile G/Recording/Replay는 후순위/비범위 | `verify-onvif-live-import-contract`, `verify-onvif-probe-fixture-contract`, `verify-onvif-no-device-suite`, 수동 camera smoke(실장비 확보 시 별도) |
| P0 | UI visual regression + ERP-style visual refresh | Ops/Client/Auth 화면을 운영 콘솔형 밀도와 공통 design token으로 정리하고, 320/390/760/1180 기준 screenshot review를 release gate 산출물로 고정 | `verify-ops-client-ui --screenshots`, `verify-auth-bootstrap` visual smoke, 수동 artifact review |
| P0 | Source health operator workflow | source health 변화 이력, retryable-only 재검증, 운영자 next action, source health bulk dry-run/partial failure/rollback 경계 정리 | `verify-ops-source-health-bulk`, `verify-ops-audit-trail`, 수동 Ops click E2E |
| P1 | Client live/dashboard polish | viewer용 multi-view 비교, event/status copy, empty/error/loading 문구, mobile tile 조작 개선 | `verify-ops-click-e2e`, `verify-client-dashboard-polish`, screenshot review |
| P1 | Rule/Scenario field tuning | 실제 현장 샘플 기반 threshold preset, Loitering/ZoneOccupancy 기본값, scenario issue wording 정리 | `verify-va-replay`, `verify-rule-ui`, field sample replay |
| P1 | Integrator contract artifact | Event POST/WebRTC/SSE/WS contract를 OpenAPI/JSON Schema 또는 sample bundle로 배포하되 payload schema 변경은 별도 review로 제한 | `verify-event-post`, `verify-webrtc-va-metadata`, `verify-ws-metadata` |
| P1 | Account lifecycle policy | invite expiry, password reset 운영 문구, user audit export, account disable/restore 절차 polish | `verify-auth-users`, `verify-auth-routes`, users UI screenshot review |
| P2 | Release packaging rehearsal | source-only 기준은 유지하되 container/offline/binary bundle 후보를 policy gate 안에서 dry-run | `verify-bundle-policy`, `verify-release-bundle-dry-run` |
| P2 | Re-ID/advanced tracking experiment | Re-ID extractor hook과 association 보강을 default-off benchmark로만 비교 | `compare-close-object-tracker`, `verify-va-replay`, privacy review |
| P2 | YouTube experiment decision | YouTube import/source 실험을 lab-only 현상 유지로 결정하고 기본 빌드에서는 제외. 추가 개발/실제 YouTube 성공 검증은 중단 | docs review |

## v1.2.0 착수 게이트

상태: `완료`

2026-05-15 기준 0번 착수 게이트 결과:

- 기준 브랜치: `v1.2.0`
- 착수 당시 release 기준 tag: local `v1.1.0`
- baseline gate: `./server.sh test --basic --ffmpeg-free`
  - sandbox 내부 실행은 local port bind 차단으로 실패
  - 권한 밖 재실행 기준 통과
  - 결과: 통과 9, 실패 0, 건너뜀 14
  - 로그: `.media_server.test/20260515-074302`
- 이 baseline은 short smoke 기준입니다. `--full`, RC longrun, UI screenshot review,
  외부 camera smoke, TURN/WHEP credential 운영 검증을 대체하지 않습니다.

0번에서 확정한 착수 규칙:

- v1.2.0은 v1.1.0 live-only 경계를 유지합니다.
- schema, Event POST payload, WebRTC DataChannel, SSE/WS runtime metadata,
  RTSP/WebRTC media path 변경은 roadmap scope와 분리해 별도 review 이슈로만 다룹니다.
- client/viewer에는 source URL, ONVIF endpoint, credential reference,
  raw diagnostic JSON, 내부 session/debug 정보를 노출하지 않습니다.
- 장기 녹화, VMS/NVR archive, playback/search, ONVIF Profile G recording/replay,
  Re-ID default-on, binary/runtime/model bundle release는 v1.2.0 기본 scope에서 제외합니다.

## v1.2.0 Scope Issue Split

아래 항목은 GitHub issue 생성 전 문서상 분리 기준입니다.
실제 이슈 번호와 milestone은 PR/issue 생성 시 연결합니다.

| ID | 우선순위 | 영역 | 상태 | 1차 완료 조건 | 별도 review 필요 조건 |
| --- | --- | --- | --- | --- | --- |
| V120-P0-01 | P0 | ONVIF Profile S/T live source 현장 연동 | 완료(실장비 제외) | 수동 입력 Device service endpoint 기반 HTTP SOAP probe, Media/Media2 profile 조회, RTSP/RTSPS source draft, credential reference/redaction 정책을 `/ops/sources` 등록 draft와 연결. 2026-05-15 기준 no-device suite, local simulator, fixture/loopback/redaction, Ops UI draft/round-trip 검증으로 종료 | WS-Discovery 자동 검색, Profile G/Recording/Replay, SourceRegistry/PublishedView 저장 schema 변경, client ONVIF endpoint 노출, 실장비 camera smoke 성공 증적 |
| V120-P0-02 | P0 | UI visual regression + ERP-style visual refresh | 완료 | Ops/Client/Auth 주요 화면 320/390/760/1180 screenshot artifact와 수동 review 기준 고정. 공통 product shell, nav/account header, metric/card/table/form/badge 밀도를 운영 콘솔형으로 정리 | 제품 nav 구조 변경, `/lab` 화면 route 재개방 |
| V120-P0-03 | P0 | Source health operator workflow | 완료 | 상태 변화 이력, retryable-only 재검증, Dashboard next action, source health bulk dry-run/partial failure/rollback 경계 정리 | top-level health 상태 모델 추가, client raw diagnostic 노출 |
| V120-P1-01 | P1 | Client live/dashboard polish | 완료 | multi-view 비교, event/status copy, empty/error/loading 문구, mobile tile 조작 개선 | client wrapper API schema 변경, viewer source locator 노출 |
| V120-P1-02 | P1 | Rule/Scenario field tuning | 완료 | 현장 샘플 기반 threshold preset, Loitering/ZoneOccupancy 기본값, scenario issue wording 정리 | ScenarioEngine 판단 로직, event type, payload schema 변경 |
| V120-P1-03 | P1 | Integrator contract artifact | 완료 | Event POST/WebRTC/SSE/WS contract JSON Schema와 synthetic sample bundle 제공. 2026-05-16 기준 artifact manifest/schema/sample 정적 검증과 문서 연결로 종료 | payload field 추가/삭제, schema identifier 변경 |
| V120-P1-04 | P1 | Account lifecycle policy | 완료 | `/ops/users` 계정 라이프사이클 정책 영역, password reset UI/문구, invite expiry 표시, user audit export 안내, disable/restore 절차 polish를 기존 auth/session 계약 안에서 종료 | auth store migration, password/session/token contract 변경 |
| V120-P2-01 | P2 | Release packaging rehearsal | 완료 | source-only 기준 유지와 container/offline/binary 후보 dry-run 정책 gate 확인 | runtime/model binary를 실제 release asset에 포함 |
| V120-P2-02 | P2 | Re-ID/advanced tracking experiment | WARNING(실험 유지) | default-off/privacy/static guard는 유지. 2026-05-17 KST 재검증에서 close-object fixture matrix는 `matrix-ok=True`이나 `field-new-york-driving=warning/defaultOnCandidate=false`가 남아 제품 default-on 근거로 닫지 않음 | Re-ID default-on, 대형 tracker 교체, media pipeline blocking risk |
| V120-P2-03 | P2 | YouTube experiment decision | 완료(현상 유지) | YouTube import/source는 lab-only 실험 기능으로 현상 유지하되 기본 빌드에서는 제외. v1.2.0에서는 추가 개발, `verify-youtube-import` 신설, 실제 YouTube URL 다운로드/relay 성공 검증을 진행하지 않음. 제품 경계 검증은 `/lab/import` 404, 제품 UI 미노출, 기본 빌드 비활성 상태 확인으로 제한 | 운영 기본 기능 승격, 실제 YouTube URL 성공 gate, 장시간 import job 정책 도입 |

### V120-P2-03 종료 판정

2026-05-16 기준 V120-P2-03은 lab-only 현상 유지 결정으로 종료합니다.

확인됨:

- YouTube import/source는 운영 기본 기능으로 승격하지 않습니다.
- `source=youtube` 직접 표출은 기본 빌드에서 제외하고, opt-in 빌드에서도 runtime 기본 비활성 상태를 유지합니다.
- `/lab/import` 화면 route는 제품 UI에서 닫힌 상태를 유지합니다.
- v1.2.0에서는 YouTube 실험 기능의 추가 개발, 별도 `verify-youtube-import`
  신설, 실제 YouTube URL 다운로드/relay 성공 검증을 진행하지 않습니다.
- 운영 기능 승격, 실제 URL 검증, resolver 운영, import job 정책은
  [`youtube-import.md`](./youtube-import.md)의 승인 gate가 열릴 때만 다룹니다.

미확인:

- 실제 YouTube URL 다운로드/relay 성공 여부
- resolver 최신 버전별 호환성
- 장시간 import job timeout/cancel/retry/cleanup 정책

후속으로만 다룰 조건:

- 운영 기본 기능 승격
- YouTube 또는 권리자의 명시 허가/정책 검토에 기반한 실제 URL 검증
- 장시간 import job과 `video/imports` 보존/삭제/용량 제한 정책

### V120-P0-01 종료 판정

2026-05-15 기준 V120-P0-01은 실장비 없는 조건에서 종료합니다.

확인됨:

- `verify-onvif-no-device-suite` completed 27/27, failed 0
- HTTP/HTTPS SOAP transport fixture, Media/Media2 parser/adapter, local simulator,
  RTSP/RTSPS draft, Profile S/T synthetic vendor fixture, SOAP fault/malformed
  redaction, unsupported API guard
- `/ops/sources` ONVIF draft preview, source/view round-trip, client locator redaction
- credential reference, provider Basic boundary, Digest/WS-Security design-only matrix,
  persistent credential store 후속 gate 결정

미확인:

- 실제 ONVIF camera endpoint 성공
- 실제 camera 인증 및 Media/Media2 호환성
- 실제 camera RTSP/RTSPS 재생 성공

미확인 항목은 실장비 확보 후 field smoke 후속으로 다루며, 현재 (2) 스텝의 잔여로
보지 않습니다.

### V120-P0-02 종료 판정

2026-05-16 기준 V120-P0-02는 1차 제품 UI refresh와 visual regression gate 고정 범위에서 종료합니다.

확인됨:

- Ops/Client product shell에 compact brand/nav/account header를 적용했습니다.
- 공통 design token을 slate 단일 톤에서 graphite 기반 neutral palette와 semantic accent로 정리했습니다.
- metric card, section card, table, badge, form control, client tile의 기본 밀도를 운영 콘솔형으로 낮췄습니다.
- README/UI guide 대표 screenshot asset은 현재 UI 기준 한국어/영어 모두 재캡처했습니다.
- visual regression artifact 기준 경로는 `verify-ops-client-ui --screenshots --visual-widths 320,390,760,1180 --output-dir <artifact-dir>`입니다.
- visual regression artifact는 `<artifact-dir>/visual-regression-manifest.json`과 `<artifact-dir>/index.md`로 screenshot 목록, viewport, page mapping을 함께 고정합니다.
- 2026-05-16 로컬 검증에서 `/ops/home`, `/ops/dashboard`, `/ops/rules`, `/ops/sources`, `/ops/users`, `/client/live`, `/client/dashboard` screenshot smoke가 overflow 0으로 통과했습니다.
- `/lab`, `/lab/rules`, `/lab/import`, `/webrtc/test` 화면 route는 계속 닫힌 상태로 검증했습니다.

범위 밖:

- 제품 nav 정보 구조 변경
- `/lab` 화면 route 재개방
- Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경
- RTSP/WebRTC media path 변경
- viewer/client source URL, ONVIF endpoint, raw diagnostic JSON 노출

### V120-P0-03 종료 판정

2026-05-16 기준 V120-P0-03은 source health 운영자 next action과 bulk retry 경계 고정 범위에서 종료합니다.

확인됨:

- `/ops/dashboard` 문제 원인 패널의 `라이브 소스 상태` 다음 조치가 `/ops/api/source-health/bulk` dry-run check를 호출합니다.
- 재검증 버튼은 bulk 응답의 `retryBody.sourceIds`만 `operation=retry`로 다시 보내 retryable-only 흐름을 유지합니다.
- check/retry 결과는 `/ops/sources` 변경 이력의 `소스 상태 변경` audit preset으로 바로 이동할 수 있습니다.
- source health bulk는 SourceRegistry/PublishedView를 변경하지 않는 dry-run으로 문서화했고, rollback 대상이 없음을 channel bulk mutation rollback 계약과 분리했습니다.
- `/ops/sources`에는 source health bulk panel/table/detail을 추가하지 않고, 상태 변화 이력은 기존 `Source Health 변경` audit preset으로 확인합니다.

범위 밖:

- top-level health 상태 모델 추가
- client/viewer raw diagnostic 또는 source locator 노출
- RTSP/WebRTC media path 변경
- Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경

### V120-P1-02 종료 판정

2026-05-16 기준 V120-P1-02는 Rule/Scenario field tuning 범위에서 종료합니다.

확인됨:

- Loitering runtime 기본값을 field baseline 기본 preset과 맞췄습니다:
  dwell 30000ms, movement radius 0.08, trajectory points 4, cooldown 12000ms.
- ZoneOccupancy runtime 기본값을 field baseline 기본 preset과 맞췄습니다:
  threshold 4, minimum dwell 7000ms, cooldown 12000ms.
- `/ops/rules` scenario preset smoke는 default/parking/platform 계열 payload round-trip을 검증합니다.
- TrackHealth issue message는 raw counter 나열 대신 운영자 확인 지점과 핵심 metric 요약을 함께 제공합니다.
- `verify-analysis-state`, `verify-va-replay`, `verify-va-events`,
  `verify-rule-ui`, `verify-ops-rules-roundtrip`,
  `verify-ops-scenario-presets`를 완료 기준으로 고정했습니다.

범위 밖:

- ScenarioEngine 판단 로직 변경
- event type 추가/변경
- Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경
- RTSP/WebRTC media path 변경
- 실제 고객/운영 카메라 영상 artifact 저장

실제 현장별 추가 재튜닝은 운영 데이터 확보 후 preset 숫자 조정으로 다루며,
현재 V120-P1-02의 잔여 이슈로 보지 않습니다.

### V120-P1-03 종료 판정

2026-05-16 기준 V120-P1-03은 Integrator contract artifact 1차 배포 범위에서
종료합니다.

확인됨:

- `test/fixtures/integrator_contract_artifact/manifest.json`에
  `media-server.integrator-contract-artifact.v1` artifact manifest를 추가했습니다.
- Event POST, WebRTC DataChannel, SSE runtime metadata, WebSocket runtime
  metadata, WebSocket control ack sample과 JSON Schema를 같은 bundle에 묶었습니다.
- sample은 `sample_h264.mp4`, `demo-client`, `fixture` 같은 합성 값만 사용하고,
  고객/운영 source URL, LAN IP, credential 원문, token/hash, RTSP/RTSPS URL을
  포함하지 않는 정책으로 고정했습니다.
- `docs/integrator-contract-artifact.md`에서 artifact layout, sample data policy,
  runtime smoke와 artifact 검증의 차이를 분리했습니다.
- artifact bundle 안에 README, changelog, field index, schema review checklist를
  추가해 범주 내 배포/검토 gap을 닫았습니다.
- `./server.sh verify-integrator-contract-artifact`가 manifest/schema/sample 일치,
  field index, schema review checklist, 금지 노출 후보, 문서/entrypoint 연결을
  정적 검증합니다.

범위 밖:

- Event POST/WebRTC DataChannel/SSE/WS metadata payload field 추가/삭제
- schema identifier 또는 DataChannel label 변경
- EventRecord/snapshot/clip/evidence bundle을 주요 integration contract로 승격
- client/viewer source locator, raw JSON, debug counter 노출
- OpenAPI 기반 VMS/NVR archive/playback/search API

Runtime delivery smoke는 artifact 자체 검증과 분리합니다. Event POST, WebRTC,
SSE, WebSocket 전송 재검증 여부는 각 verification matrix 명령 실행 결과로만
보고합니다.

V120-P1-03 범주 안의 잔여 이슈는 남기지 않습니다. OpenAPI 기반 archive/playback,
release packaging, 계정 lifecycle, integrator auth scope 고도화는 이 항목의
잔여가 아니라 별도 로드맵 범주입니다.

### V120-P1-04 종료 판정

2026-05-16 기준 V120-P1-04는 Account lifecycle policy 범위에서 종료합니다.

확인됨:

- `/ops/users` 상단에 계정 라이프사이클 정책 영역을 추가해 초대 기본 만료 24시간,
  비밀번호 초기화 후 다음 로그인 변경, disable/restore, 사용자 감사 export를
  한 화면에서 확인합니다.
- 사용자 상세 패널에서 기존 `reset-password` API를 호출하는 비밀번호 초기화
  UI를 추가했습니다. 성공 시 기존 세션 회수와 `mustChangePassword=true`
  흐름은 기존 서버 계약을 그대로 사용하며, 원문 비밀번호는 audit 전/후 값에
  남기지 않습니다.
- 접근 요청 승인 출력에 invite `expiresAt`을 함께 표시해 초대 링크 만료 전
  설정해야 함을 운영자에게 노출합니다.
- 사용자 행의 disable/restore 문구와 상태 안내를 세션 차단, lockout/실패 횟수
  초기화 절차 기준으로 정리했습니다.
- `/ops/users` 변경 이력 안내가 사용자 감사 JSON/CSV/Diff JSON export를 명시합니다.
- `verify-auth-users`, `verify-ops-client-ui`, `verify-ops-audit-trail`,
  `verify-ui-copy-i18n-parity`가 lifecycle policy selector/copy, reset-password
  audit action, invite expiry 표시, audit export 문구를 검증합니다.

범위 밖:

- auth store migration
- password/session/token contract 변경
- self-signup 자동 승인
- 새 role/scope 모델 또는 integrator scope 고도화
- P2 release packaging, Re-ID/advanced tracking, YouTube experiment

V120-P1-04 범주 안의 잔여 이슈는 남기지 않습니다. 위 범위 밖 항목은 이 항목의
잔여가 아니라 별도 로드맵 범주입니다.

### V120-P2-01 종료 판정

2026-05-16 기준 V120-P2-01은 Release packaging rehearsal 조건부 gate
범위에서 종료합니다.

확인됨:

- `verify-release-bundle-dry-run`이 source-only, local-binary,
  offline-package, container-root 후보를 임시 생성하고 각 후보에
  `verify-bundle-policy`를 실행합니다.
- dry-run 후보는 FFmpeg/ffprobe, libav*, x264/x265, GStreamer GPL-risk
  plugin, ONNX Runtime package, YOLO/model binary, 고객/현장 영상,
  auth store, log, snapshot, evidence bundle을 release asset으로 복사하지
  않는 기준을 manifest와 scope 문서로 남깁니다.
- negative fixture는 binary 후보의 `ffmpeg`, offline 후보의 model binary,
  container 후보의 ONNX Runtime package와 GStreamer GPL-risk plugin이
  bundle policy gate에서 차단되는지 확인합니다.
- `config/bundle_distribution_policy.json`은 기존 FFmpeg/GStreamer/x264/x265
  차단 규칙에 ONNX Runtime package와 model binary 차단 규칙을 추가했습니다.
- `docs/release-policy.md`, `docs/distribution-policy.md`,
  `docs/stream-verification.md`, `CONTRIBUTING.md`에 release packaging
  rehearsal 명령과 container/offline/binary 후보 gate 기준을 연결했습니다.

범위 밖:

- runtime/model binary를 실제 release asset에 포함하는 작업
- container image build/push, registry publishing, offline installer 생성
- source archive/tag/release note 작성 또는 GitHub Release 업로드
- RTSP/WebRTC media path, Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경
- Re-ID/advanced tracking experiment, YouTube experiment decision

V120-P2-01 범주 안의 잔여 이슈는 남기지 않습니다. runtime/model 포함 배포,
registry publish, installer 제작은 이 항목의 잔여가 아니라 별도 review가 필요한
배포 결정입니다.

### V120-P2-02 WARNING 판정

2026-05-17 KST 재검증 기준 V120-P2-02는 Re-ID/advanced tracking experiment 범위에서
종료하지 않고 WARNING(실험 유지)로 둡니다. 2026-05-16의 `tracking-event`
HOLD는 현재 fixture matrix에서 재현되지 않았지만, vehicle-heavy field fixture의
association risk warning이 남아 close-object guard default-on 또는 제품 안정 완료
근거로 사용하지 않습니다.

확인됨:

- `AppearanceProfile`/`IAppearanceExtractor` hook은 기본 비활성이고 기본
  extractor는 `NoOpAppearanceExtractor`입니다.
- 실험용 `onnx-reid` extractor는 명시 설정과 모델 파일이 있을 때만 사용하며,
  모델 파일 누락, ONNX Runtime 미빌드, 시작 실패 시 NoOp으로 fallback합니다.
- appearance 실행은 async queue, per-stream rate limit, global queue 상한,
  stale job drop, extractor `try_to_lock`으로 media pipeline blocking risk를
  기본 경로에 전파하지 않도록 제한합니다.
- `compare-close-object-tracker`와 `verify-close-object-fixture-matrix`가
  default-off와 diagnostic 관찰 경계를 benchmark로 비교합니다. enforce mode는
  opt-in 실험 비교로만 보고 clean gate에 섞지 않습니다.
- `field-new-york-driving` fixture는 vehicle-heavy baseline 난이도와 guard
  mode delta를 분리하기 위해 fixture 전용 tracker-stability 상한을 사용합니다:
  maxFragmentation 6.0, maxOverlapFragmentation 6.0, maxIdSwitchRisk 8.0.
  이 상한은 mode별 tracker-stability 명령 통과 기준일 뿐이고,
  default-on 후보 판정의 event/scenario stable 기준은 완화하지 않습니다. hard
  risk는 fixture별 jitter tolerance 안에서만 통과시킵니다.
- `verify-reid-advanced-tracking`이 Re-ID/advanced tracking privacy review,
  default-off 기본값, 외부 metadata payload의 embedding/crop/model path 미노출,
  benchmark command/fixture matrix 연결을 정적 검증합니다.
- `verify-analysis-state`가 appearance crop 전달, NoOp fallback, missing model
  fallback, queue/rate-limit budget을 단위 smoke로 검증합니다.

검증 판정:

- `verify-close-object-fixture-matrix`는 hold 없이 `matrix-ok=True`로 끝났지만,
  warning fixture가 있으면 제품 default-on 또는 안정 완료 gate로 사용하지 않습니다.
- 2026-05-17 KST 재검증에서 `verify-close-object-fixture-matrix --history-dir
  /private/tmp/media_server_reid_full_matrix_20260517`는 `matrix-ok=True`로 끝났습니다.
  `tracking-event=pass`, `tracking-event-long=pass`, `tracking-event-slow-long=pass`,
  `four-scene-control=pass`, `field-new-york-driving=warning`입니다.
- `field-new-york-driving` warning은 event/scenario delta가 아니라
  `diagnosticVsOff` hard association risk 증가입니다:
  `trackerAssociationRiskScore +0.486`, `fragmentationRatio +0.243`,
  `overlapFragmentationRatio +0.243`.
- `hold`는 event/scenario output delta 또는 주요 association risk 증가가 있어
  default-on 검토를 중단해야 하는 상태입니다.
- `warning`은 live polling observed risk 변동 또는 반복 검증 필요를 뜻하며,
  default-on 근거로 사용하지 않습니다.

범위 밖:

- Re-ID default-on
- Kalman/ByteTrack/BoT-SORT 같은 대형 tracker 교체
- 실제 Re-ID model artifact를 release asset 또는 runtime bundle에 포함
- Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경
- RTSP/WebRTC media path 변경
- client/viewer 화면에 source URL, raw JSON, debug/identity material 노출

V120-P2-02 범주 안에는 잔여 이슈를 남깁니다. `tracking-event` historical hold와
2026-05-17 KST 해소 재검증은
[`reid-tracking-event-hold-analysis.md`](./reid-tracking-event-hold-analysis.md)에
별도 기록합니다. 현재 남은 `field-new-york-driving` warning과 matrix gate 기준은
[`stream-verification.md`](./stream-verification.md)와
[`video-analysis.md`](./video-analysis.md)에 정의해 warning을 안정 판정으로
닫지 않도록 고정했습니다. fixture별 default-on 후보 판정은
[`reid-fixture-default-on-candidates.md`](./reid-fixture-default-on-candidates.md)에
분리해 개별 fixture 후보가 제품 default-on 완료 근거로
해석되지 않도록 고정했습니다. 실제 모델/현장 샘플 기반 default-on 결정, 대형
tracker 교체, runtime/model bundle 포함은 여전히 별도 review가 필요한
제품/배포 결정입니다.

별도 Phase 후보로 기록:

- Re-ID default-on
- 실제 Re-ID 모델 번들/배포
- ByteTrack/BoT-SORT/Kalman 같은 대형 tracker 교체
- 추가 field/model review 기반 제품 결정

### V120-P1-08 Ops Dashboard incident timeline 종료 판정

2026-05-16 기준 Ops Dashboard incident timeline은 운영자 UI 표시 범위에서 종료합니다.

확인됨:

- `/ops/dashboard`에 `최근 인시던트 흐름` 패널을 추가해 문제 원인, EventRecord, source health, `.media_server.log` tail 단서를 한 목록으로 묶습니다.
- 타임라인은 기존 `/ops/api/runtime/status`, `/ops/api/events/status`, `/ops/api/source-health`, `/ops/api/diagnostics/log-tail` 응답만 사용합니다.
- 각 항목은 확인 필요 수, EventRecord 수, source health 이슈 수, 관련 화면 이동 링크를 제공합니다.

범위 밖:

- Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경
- RTSP/WebRTC media path 변경
- source health top-level 상태 모델 추가
- client/viewer raw diagnostic 노출

### Ops Dashboard incident timeline filter 후속 종료 판정

2026-05-16 기준 Ops Dashboard incident timeline 필터/검색은 client-side UI 범위에서 종료합니다.

확인됨:

- `/ops/dashboard`의 `최근 인시던트 흐름` 패널에 검색 input과 출처 필터를 추가했습니다.
- 필터 대상은 문제 원인, EventRecord, Source Health, Log tail 단서이며 API schema와 payload는 변경하지 않았습니다.
- 필터 결과 badge와 no-match empty copy를 추가했고, 390px/1180px click E2E에서 검색/출처 필터 조작을 확인했습니다.
- 검색/출처 필터는 `incidentQ`, `incidentSource` hash parameter로 저장되어 새로고침과 직접 링크에서 같은 필터 상태를 복원합니다.
- `verify-ops-root-cause-panel`, `verify-ops-client-ui`, `verify-ops-client-ui --screenshots`, `verify-ops-click-e2e`가 필터 selector와 overflow를 검증합니다.

범위 밖:

- `/ops/api/events/status`, source health, diagnostics log-tail 응답 schema 변경
- Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경
- client/viewer raw diagnostic 노출

### Ops incident filter 공유 링크 후속 종료 판정

2026-05-16 기준 Ops Dashboard incident timeline 필터 상태를 공유 링크로 복사할 수 있습니다.

확인됨:

- `/ops/dashboard`의 `최근 인시던트 흐름` 필터 영역에 `링크 복사` 버튼을 추가했습니다.
- 버튼은 현재 검색/출처 필터를 `incidentQ`, `incidentSource` hash parameter로 먼저 반영한 뒤 현재 dashboard URL을 복사합니다.
- `verify-ops-root-cause-panel`이 버튼, hash share helper, responsive CSS를 정적으로 확인합니다.
- `verify-ops-click-e2e`가 검색/출처 필터를 포함한 share URL data와 해당 URL 재진입 후 필터 복원을 확인합니다.
- schema, media path, auth/session, WebRTC/DataChannel/SSE/WS metadata 계약은 변경하지 않았습니다.

### Ops incident filter 공유 링크 복원 E2E 후속 종료 판정

2026-05-16 기준 incident timeline 공유 링크를 실제 재진입 URL로 사용해 필터 복원까지 E2E에서 고정했습니다.

확인됨:

- `verify-ops-click-e2e`가 `incidentQ=event`, `incidentSource=event-record`를 포함한 share URL을 생성합니다.
- 생성된 URL로 `/ops/dashboard`에 다시 진입한 뒤 검색 input과 출처 select 값이 복원되는지 검증합니다.
- hash parameter 제거 흐름도 기존처럼 확인합니다.
- schema, media path, auth/session, WebRTC/DataChannel/SSE/WS metadata 계약은 변경하지 않았습니다.

### Ops incident share link clipboard fallback E2E 후속 종료 판정

2026-05-16 기준 incident filter 공유 링크 복사 실패 fallback 문구를 E2E에서 고정했습니다.

확인됨:

- clipboard/execCommand 실패 시 `클립보드 복사 실패. 주소창의 필터 링크를 직접 복사하세요.` toast를 표시합니다.
- 실패해도 `data-incident-share-url`에는 복원 가능한 dashboard hash URL을 남깁니다.
- `verify-ops-click-e2e`가 clipboard 실패를 주입하고 fallback toast를 확인합니다.
- `verify-ui-copy-i18n-parity`가 fallback 문구의 English translation을 확인합니다.
- schema, media path, auth/session, WebRTC/DataChannel/SSE/WS metadata 계약은 변경하지 않았습니다.

### V120-P1-01 종료 판정

2026-05-16 기준 V120-P1-01은 viewer/client shell polish 범위에서 종료합니다.

확인됨:

- `/client/dashboard`는 현장 요약, 채널 비교, 필터/정렬, 프리셋 설정, loading/empty/error 문구를 유지합니다.
- `/client/live`는 빈 PublishedView 상태에서 viewer가 `/client/request-access`로 이동할 수 있고, admin preview는 `/ops/sources`로 이동합니다.
- live monitor에는 `전체 시작`을 추가해 표시 중인 타일을 순차 시작할 수 있습니다.
- `/client/dashboard`와 `/client/live` 선택 tile detail은 source locator 없이 sanitized 상태/이벤트 요약을 복사할 수 있습니다.
- client shell/API에는 source URL, ONVIF endpoint, raw diagnostic JSON, rule/profile editor를 노출하지 않습니다.

범위 밖:

- client wrapper API schema 변경
- viewer source locator 노출
- WebRTC/DataChannel/SSE/WS metadata schema 변경
- RTSP/WebRTC media path 변경

### Rule preview fixture parity 후속 종료 판정

2026-05-16 기준 문서 screenshot의 `ops-rules-preview` 캡처와 `verify-rule-ui` smoke가
같은 rule/profile fixture helper를 사용하도록 정리했습니다.

확인됨:

- `scripts/internal/rule_preview_fixture_helpers.mjs`가 profile, event template, optional VA rule prerequisite payload를 소유합니다.
- `capture_docs_ui_assets.mjs`는 `ops-rules-preview` 캡처 전에 같은 helper로 optional VA rule까지 준비하고 종료 시 cleanup합니다.
- `verify_ops_rules_embed_smoke.mjs`는 같은 helper로 profile/event template prerequisite을 준비해 rule UI smoke와 문서 캡처 drift를 줄입니다.

### Rule preview geometry mobile polish 종료 판정

2026-05-16 기준 `/ops/rules` VA rule geometry preview는 모바일 편집 안정화 범위에서 종료합니다.

확인됨:

- 390px viewport에서 preview stage 높이를 제한하고, geometry status card와 control toolbar가 viewport 안에 머무르는지 `verify-rule-ui`가 확인합니다.
- SVG point에는 보이지 않는 touch target을 추가해 작은 화면에서 기존 점 선택/drag 여유를 넓혔습니다.
- 변경은 `/ops/rules` UI/CSS와 smoke 검증에 한정했고 Rule/Profile 저장 payload 계약은 변경하지 않았습니다.

### Client live tile keyboard/accessibility 종료 판정

2026-05-16 기준 `/client/live` 타일 keyboard/accessibility pass는 viewer UI 범위에서 종료합니다.

확인됨:

- 각 live tile은 keyboard focus 대상이며 Enter/Space 선택, Arrow/Home/End 타일 이동을 지원합니다.
- 반복되는 channel/mode select와 start/restart/stop button에는 타일 번호가 포함된 `aria-label`을 부여했습니다.
- `verify-ops-client-ui --screenshots`는 390px/1180px에서 live tile focus 이동, selected 상태, control accessible name을 확인합니다.

### Empty/loading/error copy matrix 종료 판정

2026-05-16 기준 empty/loading/error copy matrix는 문서 계약과 정적 검증 범위에서 종료합니다.

확인됨:

- `docs/ui-empty-loading-error-copy-matrix.md`에 Client/Ops 주요 화면별 Empty, Loading, Error, CTA 문구를 정리했습니다.
- `verify-ui-copy-matrix`가 matrix 문서와 구현 스니펫, server entrypoint, script inventory를 검증합니다.
- viewer/client 화면의 source URL, raw JSON, debug counter, Developer URL 비노출 원칙을 matrix에 명시했습니다.

### UI copy Korean/English parity 종료 판정

2026-05-16 기준 UI copy Korean/English parity는 translation map/pattern 검증 범위에서 종료합니다.

확인됨:

- 최근 추가한 incident timeline, source health audit link, client live tile keyboard aria-label 문구의 English map을 보강했습니다.
- `verify-ui-copy-i18n-parity`가 translation map, 반복 tile aria-label pattern, matrix 문서, server entrypoint를 검증합니다.
- `test/fixtures/client_live_tile_a11y_i18n_snapshot.json`으로 Client Live tile 숨김 접근성 문구의 한국어/영어 기대값을 고정합니다.
- 제품 API schema, Event POST/WebRTC DataChannel/SSE/WS metadata schema는 변경하지 않았습니다.

### Product shell component examples 후속 종료 판정

2026-05-16 기준 product shell component examples는 문서 예시와 정적 검증 범위에서 종료합니다.

확인됨:

- `docs/product-shell-component-examples.md`에 product shell, metric/section card, dense table, detail/audit panel, client live tile 예시를 추가했습니다.
- 예시는 기존 `ProductUiCss()`, `ProductSharedUiScript()`, `ClientShellCss()` class/helper 사용을 우선하도록 정리했습니다.
- `/ops/events`는 primary nav가 아니라 direct/diagnostic route로 취급하고, client/viewer shell debug/source/raw 정보 비노출 원칙을 다시 고정했습니다.
- `verify-product-shell-examples`가 예시 문서, UI guide 연결, server entrypoint, script inventory를 검증합니다.
- 제품 API schema, Event POST/WebRTC DataChannel/SSE/WS metadata schema는 변경하지 않았습니다.

### Ops Events direct route cleanup 후속 종료 판정

2026-05-16 기준 `/ops/events`는 primary nav 밖 direct/diagnostic route로 유지하는 범위에서 종료합니다.

확인됨:

- `/ops/events` page에 `data-route-scope="direct-diagnostic"` 표식을 추가하고, route 설명 copy를 direct/diagnostic 기준으로 정리했습니다.
- `verify-ops-route-boundaries`와 `verify-ops-client-ui`가 Ops primary nav 안에 `/ops/events` link가 들어오면 실패하도록 보강했습니다.
- `/ops/events` route와 `/ops/api/events/status` API는 유지했으며, 이벤트 조건 설정은 `/ops/rules`, 운영 요약은 `/ops/dashboard` 기준으로 둡니다.
- 제품 API schema, Event POST/WebRTC DataChannel/SSE/WS metadata schema는 변경하지 않았습니다.

### Runtime Dashboard long-run evidence template 후속 종료 판정

2026-05-16 기준 Runtime Dashboard 장시간 evidence는 템플릿/정적 검증 범위에서 종료합니다.

확인됨:

- `docs/runtime-dashboard-longrun-evidence-template.md`에 command, artifact, dashboard polling, metadata, cleanup, RSS/CPU, judgement 기록 필드를 추가했습니다.
- PASS/WARNING/HOLD/FAIL 기준을 cleanup count, DataChannel failure, idle judgement, port cleanup 기준으로 분리했습니다.
- `verify-runtime-dashboard-longrun-template`가 템플릿 문서, stream verification 연결, server entrypoint, script inventory를 검증합니다.
- 장시간 `verify-va-runtime-console-longrun`, `verify-predev`는 실행하지 않았습니다.
- 제품 API schema, Event POST/WebRTC DataChannel/SSE/WS metadata schema는 변경하지 않았습니다.

### Visual QA issue template 후속 종료 판정

2026-05-16 기준 visual regression 보고용 GitHub issue template을 추가했습니다.

확인됨:

- `.github/ISSUE_TEMPLATE/ui_visual_qa.yml`에 화면, viewport, artifact directory, manifest/index, baseline diff, 실제/기대 결과, 실행/미실행 검증 필드를 추가했습니다.
- Client/viewer screenshot의 source URL, Developer URL, raw JSON/debug counter, BBox diagnostics, rule/profile editor 비노출 확인을 issue template에 포함했습니다.
- `verify-ui-visual-artifact-index`가 PR visual review checklist와 UI visual QA issue template의 artifact evidence 문구를 함께 검증합니다.
- 제품 API schema, Event POST/WebRTC DataChannel/SSE/WS metadata schema는 변경하지 않았습니다.

### Design token/component inventory 후속 종료 판정

2026-05-16 기준 v1.2.0 UI visual regression 후속에서 도입한
design token, 공통 컴포넌트, Ops/Client 전용 surface, visual artifact gate의
문서 inventory를 추가했습니다.

확인됨:

- `docs/ui-guide.md`에 `ProductDesignTokensCss()`, `ProductUiCss()`, Ops data surface, Client surface, visual artifact 계층별 source/계약/검증 guard를 정리했습니다.
- 새 UI 색상, 버튼, badge, table, detail panel, mobile overflow, client debug 비노출, screenshot artifact 갱신 기준을 변경 체크리스트로 남겼습니다.
- schema, media path, auth/session, WebRTC/DataChannel/SSE/WS metadata 계약은 변경하지 않았습니다.

### PR visual artifact review checklist 후속 종료 판정

2026-05-16 기준 UI 변경 PR에서 visual artifact evidence를 남기도록
PR template과 정적 verifier를 연결했습니다.

확인됨:

- `.github/PULL_REQUEST_TEMPLATE.md`에 `UI Visual Review` 섹션을 추가해 artifact directory, manifest schema, `index.md`, 320/390/760/1180px review, client debug/source 비노출 확인을 기록하게 했습니다.
- `docs/stream-verification.md`의 수동 screenshot review 체크리스트가 PR template의 `UI Visual Review` 섹션과 같은 artifact evidence를 요구합니다.
- `verify-ui-visual-artifact-index`가 PR template의 visual review checklist 핵심 문구를 정적 검증합니다.
- schema, media path, auth/session, WebRTC/DataChannel/SSE/WS metadata 계약은 변경하지 않았습니다.

### CSS token drift 검사 후속 종료 판정

2026-05-16 기준 product UI CSS의 색상 drift를 막는 정적 검증을 추가했습니다.

확인됨:

- `ProductDesignTokensCss()`에 client selection ring, modal backdrop, rule preview gloss/shadow/badge stroke token을 추가했습니다.
- `ProductUiCss()`와 `ClientShellCss()` 본문에서 기존 raw hex/rgb 색상을 semantic/overlay token 참조로 교체했습니다.
- `./server.sh verify-product-ui-token-drift`가 `ProductDesignTokensCss()` 밖 raw hex/rgb 색상 추가를 실패로 처리하고, 관련 docs/command inventory 연결을 확인합니다.
- schema, media path, auth/session, WebRTC/DataChannel/SSE/WS metadata 계약은 변경하지 않았습니다.

### Visual baseline diff tooling 후속 종료 판정

2026-05-16 기준 screenshot artifact baseline과 candidate를 비교하는 manifest 기반 diff CLI를 추가했습니다.

확인됨:

- `./server.sh compare-ui-visual-baseline --baseline-dir <baseline-artifact-dir> --candidate-dir <candidate-artifact-dir>` 명령을 추가했습니다.
- baseline/candidate의 `visual-regression-manifest.json`을 읽어 screenshot 파일명을 매칭하고 누락/추가/차원 변경을 실패로 보고합니다.
- 다른 PNG는 픽셀 단위 changed pixel 비율, max channel delta, sha256을 계산해 `visual-baseline-diff.json`과 `visual-baseline-diff.md`로 남깁니다.
- diff report schema는 `media-server.ui-visual-baseline-diff.v1`입니다.
- schema, media path, auth/session, WebRTC/DataChannel/SSE/WS metadata 계약은 변경하지 않았습니다.

### Screenshot artifact retention 정책 후속 종료 판정

2026-05-16 기준 UI screenshot artifact의 보존 기간과 공유 전 검토 기준을 manifest/PR template/docs에 고정했습니다.

확인됨:

- `visual-regression-manifest.json`에 `media-server.ui-visual-artifact-retention.v1` retention policy를 함께 기록합니다.
- PR screenshot artifact 기본 보존은 14 days, release baseline artifact 보존은 45 days로 문서화했습니다.
- client/source/debug/raw JSON 비노출 검토 전에는 공유 보관소에 screenshot artifact를 올리지 않는 기준을 PR template과 문서에 추가했습니다.
- `verify-ui-visual-artifact-index`가 manifest retention policy와 PR/docs 문구를 정적으로 확인합니다.
- schema, media path, auth/session, WebRTC/DataChannel/SSE/WS metadata 계약은 변경하지 않았습니다.

### Account lifecycle UX polish 후속 종료 판정

2026-05-16 기준 `/ops/users` 계정 라이프사이클 조작을 목록과 상세에서 더 명확하게 보이도록 다듬었습니다.

확인됨:

- 사용자 목록 행에 `비활성화`/`복구` quick action을 연결해 기존 enable/disable API를 화면에서 바로 사용할 수 있습니다.
- 사용자 상태 셀과 상세 panel에 활성/비활성, 잠금 만료, 다음 로그인 비밀번호 변경 요구 상태를 lifecycle summary로 표시합니다.
- 비활성화는 확인 dialog를 거치며, 마지막 admin 방지와 세션 회수는 기존 서버 auth 계약을 그대로 사용합니다.
- `verify-auth-users`와 `verify-ops-client-ui`가 lifecycle summary/action hook을 확인합니다.
- schema, media path, auth/session, WebRTC/DataChannel/SSE/WS metadata 계약은 변경하지 않았습니다.

### Client access approval flow polish 후속 종료 판정

2026-05-16 기준 client 접근 요청 접수부터 Ops 승인/초대 설정 전까지의 상태 문구를 정리했습니다.

확인됨:

- `/client/request-access` 제출 성공 메시지가 request id를 표시하고, 승인 전에는 로그인/채널 접근이 열리지 않음을 명시합니다.
- `/ops/users` 승인 대기 표가 pending/approved/rejected 상태별 lifecycle note를 함께 표시합니다.
- 승인 후 출력되는 초대 링크 안내에 초대 설정 완료 전까지 세션/채널 권한이 열리지 않는다는 문구를 추가했습니다.
- `verify-auth-users`와 `verify-ops-client-ui`가 접근 요청 lifecycle 문구를 확인합니다.
- schema, media path, auth/session, WebRTC/DataChannel/SSE/WS metadata 계약은 변경하지 않았습니다.

### Client debug/source leakage smoke 강화 후속 종료 판정

2026-05-16 기준 client/viewer 화면과 scoped API의 debug/source 비노출 smoke를 강화했습니다.

확인됨:

- `verify-ops-client-ui`의 client forbidden text/key matrix에 source URL 계열, raw diagnostic, Developer URL, BBox diagnostics, `analysisTapId`, rule/profile editor selector, Ops source/view API 경로를 추가했습니다.
- Chrome이 있는 환경에서는 `/client/live`, `/client/dashboard`, `/client/events`를 렌더링한 뒤 visible text, JSON script, DOM selector에서 금지 항목을 다시 검사합니다.
- client scoped API는 기존처럼 raw source URL, storage path, token/hash/debug key를 노출하지 않는지 JSON key traversal로 확인합니다.
- schema, media path, auth/session, WebRTC/DataChannel/SSE/WS metadata 계약은 변경하지 않았습니다.

### Auth shell visual regression gate 후속 종료 판정

2026-05-16 기준 auth shell screenshot smoke도 visual artifact index/manifest gate에 포함했습니다.

확인됨:

- `verify_auth_ui_smoke.mjs`가 screenshot 실행 시 `visual-regression-manifest.json`과 `index.md`를 생성합니다.
- auth visual 기본 viewport 폭을 320/390/760/1180px로 맞춰 setup/login/request-access/password-change shell의 모바일/데스크톱 회귀를 같은 기준으로 봅니다.
- PR template과 stream verification 문서에 auth shell 변경 시 `MEDIA_SERVER_VERIFY_AUTH_VISUAL=1 MEDIA_SERVER_VERIFY_AUTH_SCREENSHOTS=1 ./server.sh verify-auth-bootstrap` 실행 기준을 추가했습니다.
- `verify-ui-visual-artifact-index`가 auth screenshot smoke의 artifact index 연결을 정적 검증합니다.
- schema, media path, auth/session, WebRTC/DataChannel/SSE/WS metadata 계약은 변경하지 않았습니다.

### Ops Rules 저장 전 validation e2e 보강 후속 종료 판정

2026-05-16 기준 `/ops/rules` 저장 전 validation을 실제 브라우저 저장 클릭 흐름에서 확인하도록 보강했습니다.

확인됨:

- `verify-rule-ui`가 채널 분석 설정 추가 화면에서 존재하지 않는 profile option을 주입하고 저장 버튼을 클릭합니다.
- 잘못된 draft는 `/lab/analysis/va-rules/*` write request 없이 `저장 전 검증 실패` 상태 메시지로 차단되는지 확인합니다.
- `verify-ops-rule-conflict-ui`가 해당 browser e2e guard snippet을 정적 검증합니다.
- schema, media path, auth/session, WebRTC/DataChannel/SSE/WS metadata 계약은 변경하지 않았습니다.

### Ops table responsive coverage 확대 후속 종료 판정

2026-05-16 기준 Ops 채널/룰/사용자 table layout smoke의 반응형 검증 범위를 넓혔습니다.

확인됨:

- `verify-ops-tables-layout` 기본 viewport 폭에 320px을 추가했습니다.
- 룰 화면은 shared rule preview fixture helper로 VA rule row를 보장해 실제 row action/detail panel 상태를 확인합니다.
- 채널/룰/사용자 각 화면에서 첫 상세 panel을 열고 toolbar/action/form control이 panel과 viewport 밖으로 밀리지 않는지 검사합니다.
- audit filter, preset, toolbar control이 모바일 폭에서 audit panel과 viewport 안에 머무르는지 함께 검사합니다.
- schema, media path, auth/session, WebRTC/DataChannel/SSE/WS metadata 계약은 변경하지 않았습니다.

### Client Live 타일 상태 접근성 문구 후속 종료 판정

2026-05-16 기준 `/client/live` 타일 상태가 키보드/스크린리더 흐름에서도 같은 상태 요약을 읽도록 보강했습니다.

확인됨:

- 각 live tile은 `aria-describedby`로 숨김 상태 요약을 연결합니다.
- 숨김 상태 요약은 `aria-live="polite"`와 `aria-atomic="true"`로 연결, 트랙, 이벤트, metadata, 재시도 상태 변경을 함께 알립니다.
- i18n parity 검증이 타일 상태 요약의 반복 문구 패턴을 확인합니다.
- `verify-ops-client-ui`가 client live tile 접근성 hook을 정적 smoke 대상으로 확인합니다.
- schema, media path, auth/session, WebRTC/DataChannel/SSE/WS metadata 계약은 변경하지 않았습니다.

### Visual QA issue artifact link helper 후속 종료 판정

2026-05-16 기준 visual screenshot artifact를 GitHub issue template에 붙일 Markdown 링크 블록으로 변환하는 보조 명령을 추가했습니다.

확인됨:

- `./server.sh write-ui-visual-qa-issue-links --artifact-dir <artifact-dir>`가 `visual-regression-manifest.json`과 `index.md`를 읽어 issue용 링크 블록을 생성합니다.
- baseline diff artifact가 있으면 `visual-baseline-diff.json`과 `visual-baseline-diff.md` 링크를 함께 출력합니다.
- issue/PR template과 UI 검증 문서에 helper 명령을 연결했습니다.
- `verify-ui-visual-artifact-index`가 helper wiring과 fixture 출력물을 정적 검증합니다.
- schema, media path, auth/session, WebRTC/DataChannel/SSE/WS metadata 계약은 변경하지 않았습니다.

### Runtime longrun evidence sample fixture 후속 종료 판정

2026-05-16 기준 Runtime Dashboard longrun evidence template의 sample-only fixture를 추가했습니다.

확인됨:

- `test/fixtures/runtime_dashboard_longrun_evidence_sample/sample_record.json`은 evidence field shape를 JSON으로 고정합니다.
- `sample_report.md`는 release checklist나 verification history에 붙일 record 형태를 sample-only로 보여줍니다.
- fixture는 `sampleOnly=true`, `longrunExecuted=false`, `evidenceStatus=sample-only-not-executed`로 실제 longrun PASS evidence가 아님을 명시합니다.
- `verify-runtime-dashboard-longrun-template`가 sample fixture와 non-execution 경계를 검증합니다.
- 장시간 `verify-va-runtime-console-longrun`, `verify-predev`는 실행하지 않았습니다.
- schema, media path, auth/session, WebRTC/DataChannel/SSE/WS metadata 계약은 변경하지 않았습니다.

### Visual baseline candidate 비교 정책 후속 종료 판정

2026-05-16 기준 visual baseline diff report가 candidate 판정을 pass/fail만이 아니라 review 상태까지 구분합니다.

확인됨:

- `compare-ui-visual-baseline` report에 `media-server.ui-visual-baseline-candidate-policy.v1` 정책 블록을 추가했습니다.
- summary는 `decision=pass|review|fail`, `reviewRequired`, `extraAllowed`, `changedWithinThreshold`, `dimensionMismatches`를 분리합니다.
- candidate-only screenshot은 기본 실패이며, `--allow-extra`를 쓰면 실패가 아니라 review-required로 남습니다.
- `--fail-on-review` 옵션으로 review-required candidate도 gate 실패로 다룰 수 있습니다.
- `verify-ui-visual-artifact-index`가 strict/allow-extra policy fixture를 검증합니다.
- schema, media path, auth/session, WebRTC/DataChannel/SSE/WS metadata 계약은 변경하지 않았습니다.

### UI artifact 보관/정리 명령 후속 종료 판정

2026-05-16 기준 UI visual artifact retention policy를 기준으로 dry-run, archive, cleanup을 수행하는 보조 명령을 추가했습니다.

확인됨:

- `./server.sh ui-visual-artifact-maintenance --artifact-root <artifact-root>` 명령을 추가했습니다.
- 기본은 dry-run이며, 실제 archive/copy와 cleanup 삭제는 `--apply`가 있을 때만 수행합니다.
- `visual-regression-manifest.json`의 retention policy와 generatedAt을 읽어 만료 여부를 계산합니다.
- JSON/Markdown report schema는 `media-server.ui-visual-artifact-maintenance.v1`입니다.
- Markdown report에는 PR 본문에 붙일 `PR Summary` 섹션을 포함해 decision, mode, expired artifact 수, archive/cleanup 예정 수를 요약합니다.
- `--apply` archive 생성 시 `media-server.ui-visual-artifact-archive-index.v1` schema의 `ui-visual-artifact-archive-index.json`과 Markdown index를 archive directory에 남깁니다.
- archive index는 apply 실행 `history`를 누적하고, 중복 archive directory 이름은 숫자 suffix와 `archiveSequence`, `duplicateOf`로 기록합니다.
- `verify-ui-visual-artifact-index`가 dry-run/apply fixture를 임시 디렉터리에서 검증합니다.
- preflight CI가 `--apply` 없이 dry-run report를 만들고 `media-server-ui-visual-maintenance-dry-run` artifact로 업로드합니다.
- schema, media path, auth/session, WebRTC/DataChannel/SSE/WS metadata 계약은 변경하지 않았습니다.

### UI artifact maintenance PR summary 후속 종료 판정

2026-05-16 기준 UI visual artifact maintenance Markdown report에 PR 본문용 요약 섹션을 추가했습니다.

확인됨:

- `maintenance-report.md` 상단에 `PR Summary` 섹션을 추가했습니다.
- summary는 `Decision`, dry-run/apply mode, expired artifact 수, archive/cleanup 예정 수, 다음 조치를 포함합니다.
- JSON summary에는 중복 action 수와 분리된 `expiredArtifacts` 값을 추가했습니다.
- `verify-ui-visual-artifact-index`가 dry-run/apply fixture Markdown의 PR summary 출력을 검증합니다.
- schema, media path, auth/session, WebRTC/DataChannel/SSE/WS metadata 계약은 변경하지 않았습니다.

### UI artifact maintenance archive index 후속 종료 판정

2026-05-16 기준 UI visual artifact maintenance apply가 archive directory index를 함께 생성합니다.

확인됨:

- `--apply`로 archive가 생성되면 `ui-visual-artifact-archive-index.json`과 `ui-visual-artifact-archive-index.md`를 archive directory에 씁니다.
- archive index schema는 `media-server.ui-visual-artifact-archive-index.v1`입니다.
- index entry는 archive dir, manifest path, 원본 artifact dir, generatedAt, ageDays, screenshot count, retention policy를 포함합니다.
- maintenance report Markdown도 생성된 archive index 경로를 표시합니다.
- `verify-ui-visual-artifact-index`가 apply fixture에서 archive index JSON/Markdown을 검증합니다.
- schema, media path, auth/session, WebRTC/DataChannel/SSE/WS metadata 계약은 변경하지 않았습니다.

### UI artifact archive index 누적/중복 정책 후속 종료 판정

2026-05-16 기준 archive index가 apply 실행 이력과 중복 archive name 처리 내역을 함께 남깁니다.

확인됨:

- archive index JSON/Markdown에 apply 실행 `history`를 누적합니다.
- 같은 artifact directory 이름이 이미 archive에 있으면 기존 archive를 덮어쓰지 않고 숫자 suffix를 붙입니다.
- index entry는 `archiveBaseName`, `archiveSequence`, `duplicateOf`, `firstArchivedAt`, `lastIndexedAt`을 포함합니다.
- `verify-ui-visual-artifact-index`가 `expired-artifact`와 `expired-artifact-2` fixture로 중복 정책을 검증합니다.
- schema, media path, auth/session, WebRTC/DataChannel/SSE/WS metadata 계약은 변경하지 않았습니다.

### Visual baseline PR comment generator 후속 종료 판정

2026-05-16 기준 visual baseline diff report를 PR/issue comment용 Markdown으로 요약하는 helper를 추가했습니다.

확인됨:

- `./server.sh write-ui-visual-baseline-comment --diff-report <visual-baseline-diff.json>` 명령을 추가했습니다.
- comment에는 `decision`, summary metric, policy schema, failed/review-required attention item table을 포함합니다.
- screenshot artifact URL base가 있으면 attention item 파일명을 link로 출력합니다.
- `verify-ui-visual-artifact-index`가 review-required fixture에서 comment helper 출력을 검증합니다.
- schema, media path, auth/session, WebRTC/DataChannel/SSE/WS metadata 계약은 변경하지 않았습니다.

### Visual baseline diff preflight artifact 후속 종료 판정

2026-05-16 기준 preflight CI가 visual baseline diff/comment 산출물을 PR artifact로 업로드합니다.

확인됨:

- preflight는 `verify-ui-visual-artifact-index` fixture가 만든 `baseline-diff` 결과를 `artifacts/ui-visual-baseline-diff`에 복사합니다.
- `write-ui-visual-baseline-comment`로 `visual-baseline-comment.md`를 생성합니다.
- Actions artifact 이름은 `media-server-ui-visual-baseline-diff`이며 `visual-baseline-diff.json`, `visual-baseline-diff.md`, `visual-baseline-comment.md`를 포함합니다.
- 이 preflight artifact는 helper 출력 형식 검증용이며, 실제 화면 candidate 비교는 별도 `compare-ui-visual-baseline` 산출물로 남깁니다.
- `verify-ui-visual-artifact-index`와 `verify-actions-security`가 workflow 연결을 정적으로 검증합니다.
- schema, media path, auth/session, WebRTC/DataChannel/SSE/WS metadata 계약은 변경하지 않았습니다.

### UI visual PR summary 자동 게시 후속 종료 판정

2026-05-16 기준 preflight CI가 visual baseline comment helper 결과를 Actions step summary에 자동 게시합니다.

확인됨:

- preflight에 `Publish UI visual baseline PR summary` 단계를 추가했습니다.
- `visual-baseline-comment.md`가 있으면 `GITHUB_STEP_SUMMARY`에 붙이고, 없으면 미생성 상태를 명시합니다.
- `actions/upload-artifact@v4`의 `artifact-url` output을 사용해 summary에 artifact download 링크를 함께 표시합니다.
- workflow 권한은 `contents: read`만 유지하며 `pull-requests: write`를 열지 않았습니다.
- `verify-ui-visual-artifact-index`와 `verify-actions-security`가 summary 게시 연결과 권한 경계를 검증합니다.
- schema, media path, auth/session, WebRTC/DataChannel/SSE/WS metadata 계약은 변경하지 않았습니다.

### Release baseline approval log CI presence 후속 종료 판정

2026-05-16 기준 release baseline approval log template이 CI 정적 gate에서 직접 검증됩니다.

확인됨:

- `./server.sh verify-ui-release-baseline-approval-log` 명령을 추가했습니다.
- verifier는 approval template의 baseline identity, replacement reason, comparison evidence, manual review, approval, not-run/limitation 필드를 확인합니다.
- preflight CI가 `UI release baseline approval log presence` 단계에서 verifier를 실행합니다.
- workflow 권한은 `contents: read`만 유지하며 쓰기 권한을 열지 않았습니다.
- schema, media path, auth/session, WebRTC/DataChannel/SSE/WS metadata 계약은 변경하지 않았습니다.

### Release baseline approval log sample fixture 후속 종료 판정

2026-05-16 기준 release baseline approval log 작성본 예시를 sample-only fixture로 추가했습니다.

확인됨:

- `test/fixtures/ui_visual_release_baseline_approval_log_sample.md`를 추가했습니다.
- sample fixture는 `sample-only`, no-command-executed, 실제 approval/pass evidence 아님을 명시합니다.
- `verify-ui-release-baseline-approval-log`가 sample fixture의 baseline identity, comparison evidence, manual review, approval, not-run/limitation 필드를 검증합니다.
- schema, media path, auth/session, WebRTC/DataChannel/SSE/WS metadata 계약은 변경하지 않았습니다.

### Release baseline artifact role 후속 종료 판정

2026-05-16 기준 release baseline artifact의 역할을 release/visual review 문서와 PR template에 명시했습니다.

확인됨:

- release baseline artifact는 승인된 release/RC 화면 상태를 다음 candidate와 비교하는 approved comparator로 정의했습니다.
- release baseline artifact는 public release asset 또는 candidate 통과 증빙이 아니며, baseline 교체 시 accepted baseline run, 교체 이유, 수동 비노출 검토 결과를 연결하도록 정리했습니다.
- PR template의 `UI Visual Review` 섹션에 release baseline 생성/교체 체크 항목을 추가했습니다.
- `docs/ui-visual-release-baseline-approval-template.md`에 baseline identity, replacement reason, comparison evidence, manual review, approval, not-run/limitations 기록 필드를 추가했습니다.
- `verify-ui-visual-artifact-index`가 release baseline artifact role 문구를 정적으로 검증합니다.
- schema, media path, auth/session, WebRTC/DataChannel/SSE/WS metadata 계약은 변경하지 않았습니다.

### Client Live 접근성 e2e 확대 후속 종료 판정

2026-05-16 기준 Client Live keyboard smoke가 타일 접근성 상태 요약까지 확인하도록 보강했습니다.

확인됨:

- `verify-ops-client-ui --screenshots`의 client live keyboard smoke가 `aria-describedby` 연결을 확인합니다.
- 숨김 상태 요약의 `data-role="a11y-status"`, `aria-live="polite"`, `aria-atomic="true"`, `sr-only` 스타일을 검사합니다.
- 상태 요약에 타일 번호, 상태, 연결, 트랙, 이벤트, metadata, 재시도 문구가 포함되는지 확인합니다.
- schema, media path, auth/session, WebRTC/DataChannel/SSE/WS metadata 계약은 변경하지 않았습니다.

### Client Live 접근성 문구 다국어 snapshot 후속 종료 판정

2026-05-16 기준 Client Live tile 숨김 접근성 상태 문구의 한국어/영어 기대값을 snapshot fixture로 고정했습니다.

확인됨:

- `test/fixtures/client_live_tile_a11y_i18n_snapshot.json`에 기본 offline 타일과 live normal, stale reconnecting, error failed 상태 요약의 Korean/English copy를 기록했습니다.
- `채널 미선택`, 상태, 연결, 트랙, 이벤트, 메타데이터, 재시도 문구가 English translation map/pattern으로 유지되는지 `verify-ui-copy-i18n-parity`가 확인합니다.
- `docs/ui-empty-loading-error-copy-matrix.md`가 해당 snapshot fixture와 검증 명령을 연결합니다.
- schema, media path, auth/session, WebRTC/DataChannel/SSE/WS metadata 계약은 변경하지 않았습니다.

### Client Live 접근성 문구 다국어 snapshot 확장 후속 종료 판정

2026-05-16 기준 Client Live tile 숨김 접근성 상태 문구 snapshot을 주요 상태 변형까지 확장했습니다.

확인됨:

- snapshot fixture에 `offline-empty`, `live-normal`, `stale-reconnecting`, `error-failed` scenario를 추가했습니다.
- 각 scenario는 타일 번호, 상태, 연결, 트랙, 이벤트, 메타데이터, 재시도 문구의 Korean/English 기대값을 포함합니다.
- `verify-ui-copy-i18n-parity`가 scenario 수, 필수 Korean/English field, Live/Connected/Normal/Stale/Connecting/Failed/Error 상태 번역을 검증합니다.
- schema, media path, auth/session, WebRTC/DataChannel/SSE/WS metadata 계약은 변경하지 않았습니다.

### Client Live 접근성 DOM 추출 snapshot 후속 종료 판정

2026-05-16 기준 Client Live tile 숨김 접근성 문구 snapshot을 실제 DOM smoke와 연결했습니다.

확인됨:

- `client_live_tile_a11y_i18n_snapshot.json`에 `domExtraction` 기준을 추가했습니다.
- `verify-ops-client-ui --screenshots`의 client live keyboard smoke가 실제 `[data-role="a11y-status"]` DOM 텍스트를 snapshot 기준으로 검사합니다.
- `verify-ui-copy-i18n-parity`가 snapshot fixture와 UI smoke 연결을 정적으로 검증합니다.
- schema, media path, auth/session, WebRTC/DataChannel/SSE/WS metadata 계약은 변경하지 않았습니다.

### Client Live aria-live 언어/모바일 touch target 후속 종료 판정

2026-05-17 기준 Client Live tile 숨김 상태 요약과 모바일 타일 조작 밀도를 v1.3.0 (4) 범위에서 보강했습니다.

확인됨:

- tile 숨김 상태 요약은 `translateText`를 통해 현재 UI 언어로 직접 생성되어 English 화면에서 `aria-live` 갱신이 한국어 중간 문자열에 의존하지 않습니다.
- `client_live_tile_a11y_i18n_snapshot.json`의 `offline-empty` DOM 기대값을 실제 미수집 상태와 맞춰 track/event를 `미제공`/`Not provided`로 고정했습니다.
- `verify-ops-client-ui --screenshots`의 Client Live keyboard smoke는 한국어/영어 `/client/live?lang=...` DOM을 모두 열고 snapshot과 실제 `[data-role="a11y-status"]` 텍스트를 비교합니다.
- 560px 이하 모바일 폭에서 tile channel/mode control은 단일 열로 전환되고 start/reconnect/stop button은 44px 이상 touch target을 유지합니다.
- source URL, raw JSON, debug counter, rule/profile editor, schema, media path, auth/session, WebRTC/DataChannel/SSE/WS metadata 계약은 변경하지 않았습니다.

## v1.2.0 시작 전 체크리스트

- [x] v1.1.0 PR이 `main`에 merge됨
- [x] release tag/GitHub Release 여부 결정 (`v1.1.0` tag 생성, GitHub Release는 별도 보류)
- [x] `main` 기준 `./server.sh test` 또는 지정 release gate 결과 확인
- [x] v1.2.0 scope 이슈를 P0/P1/P2로 분리
- [x] schema/media path 변경 가능성이 있는 항목은 별도 migration/review 이슈로 분리

## 문서/검증 유지 규칙

- README는 진입점과 현재 제품 범위만 유지합니다.
- 기능별 상세는 `docs/*.md` 한 곳에 둡니다.
- 완료된 장문 close-out 내역은 history 문서로만 보관합니다.
- 장시간 테스트는 새 RC 또는 고위험 변경에서만 명시적으로 실행합니다.
- `./server.sh verify-predev --soak-minutes 120`은 상시 실행하지 않고 release candidate 또는 고위험 변경 gate로만 실행합니다.
- `./server.sh verify-va-runtime-console-longrun --duration-minutes 120`도 release candidate 또는 고위험 Runtime Console 변경 gate로만 실행합니다.
- client/viewer 문서에는 source URL, ONVIF endpoint, raw diagnostic JSON 노출을
  제품 기능처럼 쓰지 않습니다.

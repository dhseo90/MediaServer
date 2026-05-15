# Development Backlog

이 문서는 `main` 기준의 현재 제품 상태와 다음 minor 개발 후보만 관리합니다.
완료된 상세 개발 이력은 [history/development-history.md](./history/development-history.md),
검증 이력은 [history/verification-history.md](./history/verification-history.md)를 봅니다.

## 문서 정리 기준

v1.1.0이 `main`으로 들어가면 v1.1.0 전용 분리 roadmap은 더 이상 별도
source-of-truth가 아닙니다. 현재 기준은 이 문서와 기능별 상세 문서로 나눕니다.

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

## 현재 기준: v1.1.0 Main Baseline

v1.1.0은 live-only source release입니다. 중심 범위는 live source onboarding,
live source health, live VA event quality입니다.

완료 범위:

- [x] file, RTSP pull, HTTP/HLS URI, WHEP pull, WHIP publish source를 RTSP/WebRTC/WHEP output으로 제공
- [x] ONVIF live source를 일반 채널 source type으로 취급하고 `/ops/sources`에서 등록
- [x] 기본 seed 채널에 `Public ONVIF Stream Sample` 제공
- [x] 채널/룰 URL copy UI의 ONVIF RTSP/WHEP/WebRTC parity
- [x] SourceRegistry/PublishedView 기반 Ops 채널 관리와 client redaction
- [x] Rule/Profile/Scenario, `vaRule=<id>`, live Event POST, runtime metadata
- [x] Live Source Health API, Ops Dashboard root-cause panel, client sanitized health summary
- [x] Scenario timeline/debug, TrackHealth issue grouping, live VA event quality panel
- [x] Auth setup/login/session, role/scope, admin user console, invite/request approval
- [x] `/ops`와 `/client` 제품 UI 분리, `/lab` 화면 route 404 유지
- [x] source-only public readiness, bundle policy, license/artifact guardrail

비범위:

- [ ] 장기 녹화, MP4 recorder, NVR/VMS archive, playback timeline, 영상 검색
- [ ] ONVIF Profile G recording/replay
- [ ] Re-ID default-on 또는 대형 tracker 교체
- [ ] binary/runtime/model bundle release
- [ ] 외부 TURN/WHEP credential 운영 보장

## v1.2.0 Roadmap 후보

v1.2.0은 v1.1.0 live-only 경계를 유지하면서 실제 현장 운영과 제품화 밀도를 높이는
minor release로 제안합니다. 아래 항목은 PR 전 제안 기준이며, 실제 v1.2.0 scope는
이슈화 후 다시 확정합니다.

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
| P2 | YouTube experiment decision | YouTube import/source 실험을 유지/축소/제거 중 하나로 결정 | `verify-youtube-import`, docs review |

## v1.2.0 착수 게이트

상태: `완료`

2026-05-15 기준 0번 착수 게이트 결과:

- 기준 브랜치: `v1.2.0`
- release 기준 tag: local `v1.1.0`
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
| V120-P1-02 | P1 | Rule/Scenario field tuning | 예정 | 현장 샘플 기반 threshold preset, Loitering/ZoneOccupancy 기본값, scenario issue wording 정리 | ScenarioEngine 판단 로직, event type, payload schema 변경 |
| V120-P1-03 | P1 | Integrator contract artifact | 예정 | Event POST/WebRTC/SSE/WS contract sample bundle 또는 schema artifact 제공 | payload field 추가/삭제, schema identifier 변경 |
| V120-P1-04 | P1 | Account lifecycle policy | 예정 | invite expiry, password reset 문구, user audit export, disable/restore 절차 polish | auth store migration, password/session/token contract 변경 |
| V120-P2-01 | P2 | Release packaging rehearsal | 조건부 Gate | source-only 기준 유지와 container/offline/binary 후보 dry-run 정책 gate 확인 | runtime/model binary를 실제 release asset에 포함 |
| V120-P2-02 | P2 | Re-ID/advanced tracking experiment | 실험 | default-off benchmark와 privacy review 기준으로 close-object association 비교 | Re-ID default-on, 대형 tracker 교체, media pipeline blocking risk |
| V120-P2-03 | P2 | YouTube experiment decision | 보류 | 유지/축소/제거 중 하나로 결정하고 docs/test 범위 정리 | 운영 기본 기능 승격, 장시간 import job 정책 도입 |

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

### V120-P1-01 종료 판정

2026-05-16 기준 V120-P1-01은 viewer/client shell polish 범위에서 종료합니다.

확인됨:

- `/client/dashboard`는 현장 요약, 채널 비교, 필터/정렬, 프리셋 설정, loading/empty/error 문구를 유지합니다.
- `/client/live`는 빈 PublishedView 상태에서 viewer가 `/client/request-access`로 이동할 수 있고, admin preview는 `/ops/sources`로 이동합니다.
- live monitor에는 `전체 시작`을 추가해 표시 중인 타일을 순차 시작할 수 있습니다.
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
- 제품 API schema, Event POST/WebRTC DataChannel/SSE/WS metadata schema는 변경하지 않았습니다.

### Design token/component inventory 후속 종료 판정

2026-05-16 기준 v1.2.0 UI visual regression 후속에서
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
- client/viewer 문서에는 source URL, ONVIF endpoint, raw diagnostic JSON 노출을
  제품 기능처럼 쓰지 않습니다.

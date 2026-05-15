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
| P0 | Source health operator workflow | source health 변화 이력, failed-only retry, 운영자 next action, bulk 작업 partial rollback 계약 정리 | `verify-ops-source-health-bulk`, `verify-ops-audit-trail`, 수동 Ops click E2E |
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
| V120-P0-03 | P0 | Source health operator workflow | 예정 | 상태 변화 이력, failed-only retry, next action, bulk partial failure/rollback 계약 정리 | top-level health 상태 모델 추가, client raw diagnostic 노출 |
| V120-P1-01 | P1 | Client live/dashboard polish | 예정 | multi-view 비교, event/status copy, empty/error/loading 문구, mobile tile 조작 개선 | client wrapper API schema 변경, viewer source locator 노출 |
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
- 2026-05-16 로컬 검증에서 `/ops/home`, `/ops/dashboard`, `/ops/rules`, `/ops/sources`, `/ops/users`, `/client/live`, `/client/dashboard` screenshot smoke가 overflow 0으로 통과했습니다.
- `/lab`, `/lab/rules`, `/lab/import`, `/webrtc/test` 화면 route는 계속 닫힌 상태로 검증했습니다.

범위 밖:

- 제품 nav 정보 구조 변경
- `/lab` 화면 route 재개방
- Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경
- RTSP/WebRTC media path 변경
- viewer/client source URL, ONVIF endpoint, raw diagnostic JSON 노출

다음 진행 스텝은 `V120-P0-03 Source health operator workflow`입니다.

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

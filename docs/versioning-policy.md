# Versioning Policy

이 문서는 Media Server의 버전 의미와 tag 기준을 고정합니다.

## 현재 기준

- 현재 기준 버전: `v2.1.0`
- `VERSION` 파일과 `CMakeLists.txt`의 `project(... VERSION ...)` 값은 같은 값을 유지합니다.
- `v2.1.0`은 직전 release까지 닫은 source-only/live-only 제품 경계를 유지하면서
  VLM을 이벤트 해석/리뷰 보조 계층과 runtime/provider opt-in stabilization 범위로
  닫는 source-only release입니다.
  Client Live workspace, source tree/dock event feed, tile disconnect, event review,
  source group/site, tile info overlay, saved layout, incident timeline, alert delivery,
  scenario builder, Ops/Client declutter는 현재 UI-first 제품 baseline으로 유지합니다.
- 현재 제품 경계와 v2.1.0 종료 판정은 [development-backlog.md](./development-backlog.md)를
  기준으로 합니다. 이전 release evidence는 현재 release pass/fail 기준으로
  재사용하지 않습니다.

## `v2.1.0`에 포함되는 범위

- Apache-2.0 소스 코드
- 문서, 설정 예시, 검증 스크립트
- allowlist된 생성 sample fixture
- RTSP/WebRTC relay, Ops/Client UI, Auth/Role/Scope, Rule/Profile/Scenario, EventRecord/evidence 1차 기능
- public readiness, Actions, license/artifact guardrail
- ONVIF Profile S/T live source no-device/fixture/simulator 기반 onboarding
- live source health operator workflow와 retryable-only 재검증 경계
- ERP-style Ops/Client/Auth visual refresh와 visual regression artifact gate
- Client live/dashboard polish, account lifecycle policy, Rule/Scenario field tuning
- Event POST, WebRTC DataChannel, SSE, WebSocket metadata/event contract sample bundle
- source-only release packaging rehearsal과 bundle policy dry-run
- Re-ID/advanced tracking default-off 실험 guard
- YouTube import/source lab-only 현상 유지 결정
- runtime operations console, ONVIF field smoke gate, source health incident workflow,
  Client Live accessibility/mobile polish, Rule/Scenario preset quality, audit trail
  operations, release/visual baseline automation, Re-ID default-off research
  continuation과 follow-up closure
- rule-level `analysis.trackingPolicy`와 Ops Rules tracker/Re-ID 선택 UI
- Kalman-lite/ByteTrack rule-level opt-in tracker
- Re-ID assist default-off runtime fallback, warning history, privacy/release guard
- close-object report archive policy와 tracker warning dashboard summary
- rule-level tracker/Re-ID follow-up closure
- explicit tracker/Re-ID opt-in guard
- Tracker/Re-ID stability matrix와 default-on 비승격 경계
- Re-ID opt-in model provenance/checksum/fallback approval
- Ops Dashboard tracker warning next-action refinement
- Audit export review hardening과 model/source material masking
- Field smoke summary evidence boundary
- OC-SORT manifest-only experimental sandbox
- tracker/Re-ID follow-up closure
- release evidence dashboard와 stability gate cleanup
- Client/Ops debug exposure regression guard
- Tracker/Re-ID opt-in stabilization close-out
- ONVIF field smoke evidence reconciliation
- Audit/export masking regression hardening
- Runtime/model bundle RC policy
- Manual UI release checklist closure
- Public docs consistency polish
- Tracker benchmark harness planning-only boundary
- Client Live source tree + drag/drop workspace
- Client source dock event feed와 dock 좌/우 전환
- Tile disconnect와 workspace-level disconnect 계약
- Rule Event Review Inbox
- Source Group / Site Management
- Tile info overlay and playback health 표시
- Saved Views / Layout Presets
- Operator Incident Timeline
- Alert Delivery Integrations
- Scenario Builder UI
- Ops/Client shared UI declutter
- GitHub Latest Release verification gate
- Docs screenshot freshness gate
- Manual UI evidence checklist hardening
- Release close-out runbook
- Docs source-of-truth dedupe
- English UI visual copy QA
- Release evidence index
- Feature scope decision gate
- GitHub Actions warning annotation gate와 Node 24 action baseline
- UI fulltest evidence runner와 one-shot wrapper
- Feature inventory coverage gate와 fixture cleanup contract gate
- v2.0.0 entry contract/schema freeze gate
- CI/local gate parity와 release close-out one-shot dry-run gate
- Published release evidence fallback policy와 auth/session/scope regression matrix
- v1.9.0 final baseline and v2.0.0 entry report
- VLM 도입 경계, 모델 선택 기준, PC capability detector, 추천 엔진
- `/ops/vlm` 설치/연결 dry-run UI, VLM profile 저장, Privacy/전송 guard
- VLM evaluation fixture harness, event evidence reference, VLMObservation sidecar
- 이벤트 설명/오탐 힌트, Ops 이벤트 리뷰 UI의 VLM review detail
- VLM summary 검색 후보와 Rule 추천 보조 후보
- VLM 테스트 리허설, 장시간/UI 기준, close-out readiness와 2026-06-01 안정화/30분/UI/120분 evidence
- VLM runtime opt-in contract, local runtime smoke gate, cloud provider field smoke
  gate, queue/backpressure stability, runtime status UI, evaluation result workflow,
  review action workflow, Rule suggestion draft workflow, VA coverage evidence,
  external TURN/WHEP field gate, runtime/model bundle RC rehearsal, UI fulltest
  evidence runner hardening과 2026-06-03 UI fulltest evidence

## `v2.1.0`에 포함하지 않는 범위

- FFmpeg/GStreamer/ONNX Runtime/YOLO model binary bundle
- VLM model/runtime bundle, VLM default-on, production runtime/provider 성공 보장
- cloud provider API 호출 성공 보장, credential 저장, provider logging 운영 승인
- container image, offline package, app bundle
- 고객/현장 영상, 운영 evidence, auth store, log
- 장기 운영 SLA, 외부 TURN credential 운영 보장, 장기 녹화/VMS/NVR 범위
- binary/runtime 포함 release의 법무/배포 검토 완료 상태
- ONVIF 실장비 성공 보장, WS-Discovery, Profile G recording/replay
- ONVIF persistent credential store, HTTP Digest, WS-Security UsernameToken
- Re-ID default-on, ByteTrack default-on, OC-SORT/BoT-SORT/DeepSORT runtime tracker 승격
- YouTube 운영 기능 승격 또는 실제 URL relay 성공 보장
- field sample scheduler, dataset ingest, tracker replacement benchmark 실행
- OC-SORT actual algorithm adapter, dataset benchmark report, tracker replacement product review
- field sample history review workflow
- 별도 Phase의 실제 기능 개발, tracker replacement product review, runtime/model
  bundle 배포 승인

## 다음 minor에도 기본 제외되는 범위

- 장기 녹화, MP4 recorder, NVR/VMS archive, playback timeline, 영상 검색
- ONVIF Profile G recording/replay 기능
- Re-ID default-on 또는 대형 tracker 교체
- binary/runtime/model bundle release

## Semantic Versioning 기준

- `PATCH`: 문서, 테스트, bug fix, UI 문구, guardrail 보강처럼 공개 API/설정 호환성을 깨지 않는 변경
- `MINOR`: 호환성을 유지하는 source type, rule, UI, 운영 기능 추가
- `MAJOR`: route/API/config/schema, registry, auth/scope, evidence 저장 형식처럼 사용자 migration이 필요한 변경

## Tag와 release 기준

- 현재 source-only release 기준 tag는 `v2.1.0`입니다.
- tag는 `main`의 public readiness, bundle policy, required Actions가 통과한 커밋에만 붙입니다.
- 다음 신규 release tag는 signed annotated tag로 생성합니다. unsigned annotated tag와
  lightweight tag는 새 release tag로 사용하지 않습니다.
- signed tag evidence는 GitHub Tags/Releases의 Verified 표시 또는 GitHub API tag
  verification `verified=true`/`reason=valid`로 확인합니다.
- source-only release에는 sample/model/runtime binary를 추가 업로드하지 않습니다.
- binary/container/offline bundle은 별도 RC gate와 bundle policy 검토를 통과한 뒤 별도 release로 다룹니다.

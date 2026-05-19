# Versioning Policy

이 문서는 Media Server의 버전 의미와 tag 기준을 고정합니다.

## 현재 기준

- 현재 기준 버전: `v1.5.0`
- `VERSION` 파일과 `CMakeLists.txt`의 `project(... VERSION ...)` 값은 같은 값을 유지합니다.
- `v1.5.0`은 v1.2.x의 source-only/live-only release 경계를 유지하면서 v1.4.0
  rule-level tracker/Re-ID opt-in 위에 명시 opt-in guard, Tracker/Re-ID stability
  matrix, Re-ID provenance/fallback approval, Ops warning next action, audit export
  masking, field smoke summary evidence boundary, OC-SORT manifest-only sandbox와
  후속 closure를 닫은 source-only minor release입니다.
- 현재 제품 경계와 v1.5.0 종료 판정은 [development-backlog.md](./development-backlog.md)와
  [v1.5.0-follow-up-closure.md](./v1.5.0-follow-up-closure.md)를 기준으로 합니다.

## `v1.5.0`에 포함되는 범위

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
- v1.3.0 runtime operations console, ONVIF field smoke gate, source health incident
  workflow, Client Live accessibility/mobile polish, Rule/Scenario preset quality,
  audit trail operations, release/visual baseline automation, Re-ID default-off
  research continuation과 follow-up closure
- rule-level `analysis.trackingPolicy`와 Ops Rules tracker/Re-ID 선택 UI
- Kalman-lite/ByteTrack rule-level opt-in tracker
- Re-ID assist default-off runtime fallback, warning history, privacy/release guard
- close-object report archive policy와 tracker warning dashboard summary
- v1.4.0 follow-up closure
- v1.5.0 explicit tracker/Re-ID opt-in guard
- Tracker/Re-ID stability matrix와 default-on 비승격 경계
- Re-ID opt-in model provenance/checksum/fallback approval
- Ops Dashboard tracker warning next-action refinement
- Audit export review hardening과 model/source material masking
- Field smoke summary evidence boundary
- OC-SORT manifest-only experimental sandbox
- v1.5.0 follow-up closure

## `v1.5.0`에 포함하지 않는 범위

- FFmpeg/GStreamer/ONNX Runtime/YOLO model binary bundle
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
- field sample history review workflow, ONVIF field smoke evidence reconciliation,
  release evidence dashboard cleanup

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

- 현재 published source-only release tag 기준은 `v1.5.0`입니다.
- tag는 `main`의 public readiness, bundle policy, required Actions가 통과한 커밋에만 붙입니다.
- source-only release에는 sample/model/runtime binary를 추가 업로드하지 않습니다.
- binary/container/offline bundle은 별도 RC gate와 bundle policy 검토를 통과한 뒤 별도 release로 다룹니다.

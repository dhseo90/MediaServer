# Versioning Policy

이 문서는 Media Server의 버전 의미와 tag 기준을 고정합니다.

## 현재 기준

- 현재 기준 버전: `v1.1.0`
- 다음 minor 개발 목표: `v1.2.0`
- `VERSION` 파일과 `CMakeLists.txt`의 `project(... VERSION ...)` 값은 같은 값을 유지합니다.
- `v1.1.0`은 live-only source release 기준입니다.
- 현재 제품 경계와 다음 minor 후보는 [development-backlog.md](./development-backlog.md)를 기준으로 합니다.

## `v1.1.0`에 포함되는 범위

- Apache-2.0 소스 코드
- 문서, 설정 예시, 검증 스크립트
- allowlist된 생성 sample fixture
- RTSP/WebRTC relay, Ops/Client UI, Auth/Role/Scope, Rule/Profile/Scenario, EventRecord/evidence 1차 기능
- public readiness, Actions, license/artifact guardrail
- ONVIF-assisted live source onboarding 1차 구현
- live source health, reconnect, stale/offline 운영 요약
- live VA event 품질, scenario timeline/debug, TrackHealth tuning
- Event POST, WebRTC DataChannel, SSE, WebSocket metadata/event contract 정리

## `v1.1.0`에 포함하지 않는 범위

- FFmpeg/GStreamer/ONNX Runtime/YOLO model binary bundle
- container image, offline package, app bundle
- 고객/현장 영상, 운영 evidence, auth store, log
- 장기 운영 SLA, 외부 TURN credential 운영 보장, 장기 녹화/VMS/NVR 범위
- binary/runtime 포함 release의 법무/배포 검토 완료 상태

## `v1.2.0` 개발 준비 범위

- `v1.1.0` release tag/main merge 이후 [development-backlog.md](./development-backlog.md)의
  v1.2.0 후보를 이슈로 분리해 확정합니다.
- v1.1.0 live-only 경계를 깨지 않는 운영/현장 고도화, ONVIF 현장 연동,
  source health workflow, client dashboard polish, integrator contract artifact를 우선 검토합니다.

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

- 현재 source-only release tag 기준은 `v1.1.0`입니다.
- tag는 `main`의 public readiness, bundle policy, required Actions가 통과한 커밋에만 붙입니다.
- source-only release에는 sample/model/runtime binary를 추가 업로드하지 않습니다.
- binary/container/offline bundle은 별도 RC gate와 bundle policy 검토를 통과한 뒤 별도 release로 다룹니다.

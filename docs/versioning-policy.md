# Versioning Policy

이 문서는 Media Server의 소스 버전, 공개 GitHub Release, release tag 기준을 분리해
정의합니다.

## 현재 기준

- 현재 소스 버전: `2.5.0`
- 현재 문서 재정리 기준: `v2.5.0 Semantic Incident Memory`
- 최신 공개 GitHub Release: `v2.4.0 Operator Event Review & Action Workflow`
- v2.5.0 공개 상태: GitHub Release와 tag는 취소되어 현재 공개 릴리즈가 아님
- `VERSION` 파일과 `CMakeLists.txt`의 `project(... VERSION ...)` 값은 같은 값을 유지합니다.

현재 소스 트리의 `2.5.0` 기능은 v2.4.0 source-only/live-only baseline 위에서
EventRecord, audit, source health, alert dry-run을 local incident memory/search workflow로
정리합니다. 이 상태는 공개 GitHub Release가 아니라 source tree 상태입니다.

## 2.5.0 소스 포함 범위

- Apache-2.0 source code, 문서, 설정 예시, 검증 스크립트
- RTSP/WebRTC relay, Ops/Client UI, Auth/Role/Scope, Rule/Profile/Scenario
- EventRecord/evidence 보조 기능
- Semantic Incident Memory: Event/incident text projection, local incident memory index,
  `/ops/events` search UI, incident timeline graph, explainable incident brief,
  similar incident lookup, client-safe digest, redacted evidence bundle
- GitHub Actions warning annotation gate, feature inventory coverage gate, docs/release
  metadata gate

## 기본 제외 범위

- FFmpeg/GStreamer/ONNX Runtime/YOLO/VLM model/runtime binary bundle
- VLM default-on, production runtime/provider 성공 보장, real cloud provider call 성공 보장
- container image, offline package, app bundle, 고객/현장 영상, 운영 evidence, auth store, log
- 장기 녹화, VMS/NVR, playback archive/search, ONVIF Profile G recording/replay
- ONVIF 실장비 성공 보장, external TURN/WHEP credential operation 성공 보장
- Re-ID/tracker default-on, OC-SORT/BoT-SORT/DeepSORT runtime tracker 승격
- LLM/VLM embedding provider를 기본 의존성으로 두는 semantic search
- 실기기/외부 endpoint 성공을 release PASS로 쓰는 것

## Semantic Versioning 기준

- `PATCH`: 문서, 테스트, bug fix, UI 문구, guardrail 보강처럼 공개 API/설정 호환성을 깨지 않는 변경
- `MINOR`: 호환성을 유지하는 source type, rule, UI, 운영 기능 추가
- `MAJOR`: route/API/config/schema, registry, auth/scope, evidence 저장 형식처럼 사용자 migration이 필요한 변경

## Tag와 GitHub Release 기준

- 현재 공개 release tag 기준: `v2.4.0`
- `v2.5.0` tag와 GitHub Release는 현재 공개 기준으로 존재하지 않습니다.
- 다음 신규 release tag는 signed annotated tag로 생성합니다.
- unsigned annotated tag와 lightweight tag는 새 release tag로 사용하지 않습니다.
- tag는 `main`의 public readiness, bundle policy, required Actions가 통과한 커밋에만 붙입니다.
- signed tag evidence는 GitHub Tags/Releases의 Verified 표시 또는 GitHub API tag
  verification `verified=true`/`reason=valid`로 확인합니다.
- source-only release에는 sample/model/runtime binary를 추가 업로드하지 않습니다.
- binary/container/offline bundle은 별도 RC gate와 bundle policy 검토를 통과한 뒤 별도 release로 다룹니다.

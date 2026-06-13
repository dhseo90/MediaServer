# Versioning Policy

이 문서는 Media Server의 현재 버전 의미와 tag 기준만 고정합니다. 과거 release별 상세 내역은 `docs/release-evidence-index.md`와 `docs/development-backlog.md`의 완료 roadmap 요약으로 보관합니다.

## 현재 기준

- 현재 기준 버전: `v2.5.0`
- 현재 release branch 기준: `v2.5.0 Semantic Incident Memory`
- 최신 공개 release 기준: `v2.4.0 Operator Event Review & Action Workflow`
- `VERSION` 파일과 `CMakeLists.txt`의 `project(... VERSION ...)` 값은 같은 값을 유지합니다.
- `v2.5.0`은 직전 `v2.4.0` source-only/live-only baseline 위에서 EventRecord, audit, source health, alert dry-run을 local incident memory/search workflow로 정리하는 active target입니다.
- 현재 제품 경계와 종료 판정은 `docs/development-backlog.md`, 기능별 테스트 기준은 `docs/project-feature-test-inventory.md`, release 실행/미실행 증적은 `docs/release-evidence-index.md`를 봅니다.

## v2.5.0 포함 범위

- Apache-2.0 source code, 문서, 설정 예시, 검증 스크립트
- RTSP/WebRTC relay, Ops/Client UI, Auth/Role/Scope, Rule/Profile/Scenario, EventRecord/evidence 기능
- Semantic Incident Memory: Event/incident text projection, local incident memory index, `/ops/events` search UI, incident timeline graph, explainable incident brief, similar incident lookup, client-safe digest, redacted evidence bundle, owner decomposition/release readiness
- GitHub Actions warning annotation gate, feature inventory coverage gate, docs/release metadata gate

## v2.5.0 제외 범위

- FFmpeg/GStreamer/ONNX Runtime/YOLO/VLM model/runtime binary bundle
- VLM default-on, production runtime/provider 성공 보장, real cloud provider call 성공 보장
- container image, offline package, app bundle, 고객/현장 영상, 운영 evidence, auth store, log
- 장기 녹화, VMS/NVR, playback archive/search, ONVIF Profile G recording/replay
- ONVIF 실장비 성공 보장, external TURN/WHEP credential operation 성공 보장
- Re-ID/tracker default-on, OC-SORT/BoT-SORT/DeepSORT runtime tracker 승격
- LLM/VLM embedding provider를 기본 의존성으로 두는 semantic search
- 실기기/외부 endpoint 성공을 v2.5.0 release PASS로 쓰는 것

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

- 현재 source-only release 기준 tag는 `v2.5.0`입니다.
- tag는 `main`의 public readiness, bundle policy, required Actions가 통과한 커밋에만 붙입니다.
- 다음 신규 release tag는 signed annotated tag로 생성합니다. unsigned annotated tag와 lightweight tag는 새 release tag로 사용하지 않습니다.
- signed tag evidence는 GitHub Tags/Releases의 Verified 표시 또는 GitHub API tag
  verification `verified=true`/`reason=valid`로 확인합니다.
- source-only release에는 sample/model/runtime binary를 추가 업로드하지 않습니다.
- binary/container/offline bundle은 별도 RC gate와 bundle policy 검토를 통과한 뒤 별도 release로 다룹니다.

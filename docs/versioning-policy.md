# Versioning Policy

이 문서는 Media Server의 소스 버전, 공개 GitHub Release, release tag 기준을 분리해
정의합니다.

## 현재 기준

- 현재 소스 버전: `3.2.0`
- 현재 source roadmap: `v3.2.0 Operations Resolution Workspace`
- 최신 공개 GitHub Release: `v3.2.0 Operations Resolution Workspace`
- v3.2.0 공개 상태: source-only GitHub Release. Binary, runtime, model bundle은 포함하지 않음
- source-only release 기준 tag는 published tag `v3.2.0`와 현재 source tag `v3.2.0`를 함께 기록합니다.
- `VERSION` 파일과 `CMakeLists.txt`의 `project(... VERSION ...)` 값은 같은 값을 유지합니다.

현재 소스 트리의 `3.2.0` roadmap은 v3.2.0 Operations Resolution Workspace
source-only/live-only active source baseline이자 최신 published baseline입니다. v3.1.0
previous published evidence와 v3.2 기능별 완료 evidence는 계속 분리해 기록합니다. 기본 공개 형태는 계속 source-only이며
binary/runtime/model bundle을 공개 asset으로 포함하지 않습니다.

## 2.x runway / 3.0 전환 정책

- 2.x 라인은 `2.8.0`과 `2.9.0`까지만 유지합니다.
- `2.8.0`은 기존 route/API/config/schema, Event POST/WebRTC/SSE/WS metadata,
  RTSP/WebRTC media path, Auth/Role/Scope, Rule/Profile payload 계약을 유지한
  operator-supervised action readiness release입니다.
- `2.9.0`은 2.x의 마지막 source-of-truth 정렬, contract freeze, v2.8 기능군 회귀
  묶음, compatibility gate, release evidence 정리를 수행하는 release입니다.
- `3.0.0`은 route/API/config/schema, registry/storage, auth/scope, evidence 저장 형식,
  RTSP/WebRTC media path 같은 대규모 변경을 별도 설계와 명시 승인 후 다루는 major
  line입니다.
- `3.1.0`은 v3.0 Event Evidence Search MVP 위에서 event-centered encoded clip,
  safe sharing, scoped integration, operator correction, optional vector search를
  단계별 local evidence로 확장하는 minor line입니다.
- `3.2.0`은 v3.1 Encoded Event Clip and Safe Sharing Expansion 위에서 `/ops/events`
  중심의 resolution state, evidence quality, source context, AI review quality,
  operator closure flow를 하나의 운영 작업공간으로 묶는 minor line입니다.
- 3.0 전에는 자동 Rule/Profile 적용, 외부 알림 실제 발송 보장, VLM default-on,
  runtime/model bundle default 배포를 2.x 완료 조건으로 승격하지 않습니다.

## 3.2.0 active source roadmap 범위

- v3.2.0 source-of-truth 정렬
- Resolution State Contract
- Unified Ops Events Workspace
- Evidence Quality Layer
- Source Reliability Context
- AI Review Quality Context
- Operator Resolution Flow
- Action Readiness Checklist
- Client-safe Resolution Digest
- Resolution Search & Metrics
- Stabilization and Release Readiness

위 항목은 구현과 검증 evidence가 생긴 뒤에만 `완료`로 기록합니다. GitHub Release,
tag, 30분/120분 장시간 테스트, UI 풀테스트, 외부 field smoke는 별도 실행 evidence가
있을 때만 완료로 씁니다.

`v3.2.0 source-of-truth 정렬`은 `README.md`, `README.en.md`, `docs/README.md`,
`docs/en/README.md`, `docs/ui-guide.md`, `docs/assets/ui/README.md`,
release/version policy가 source `3.2.0`, current roadmap
`v3.2.0 Operations Resolution Workspace`, latest published `v3.2.0`를 분리 정렬하는지
확인하는 local gate입니다. v3.2 published baseline은 최신 공개 기준입니다. 대표 UI 이미지는 `config/docs_ui_assets.json`의 managed
asset list로 관리하며, image recapture, 직접 브라우저 검수 PASS, UI 풀테스트,
published metadata, tag/push/GitHub Release는 source baseline 정렬 PASS로 대체하지
않습니다.

## v3.1.0 previous published source-only release 범위

- v3.1.0 source-of-truth 정렬
- Encoded Event Clip Contract
- Event Clip Encoder Pipeline
- Replay Timeline UI
- Client-safe Event Digest
- Scoped Integrator Search API
- Operator Feature Correction
- Optional Vector Search
- Retention/Export Hardening
- Stabilization and Release Readiness

위 항목은 직전 published baseline입니다. v3.0.0 baseline은 historical 공개 기준으로 보존합니다.

## v3.0.0 historical published source-only release 범위

- v3.0.0 source-of-truth 정렬
- Event Evidence Contract
- Frame Bundle Extraction
- Feature Schema and Privacy Policy
- VLM Feature Queue
- Feature-only Retention
- Search DSL and Query Convert
- Feature/Search Index
- Ops Events UI
- Retention/Pin/Cleanup
- Stabilization and Release Readiness

위 항목은 historical published baseline이며, v3.1.0 신규 기능 완료 근거가 아닙니다.

## v2.7.0 historical published source-only release 범위

- v2.7.0 source-of-truth/bootstrap 정렬
- Incident Triage Board
- Incident Decision Scorecard
- Operational Action Pack
- Rule What-if Preview
- Operator outcome memory
- v2.7.0 owner release readiness

위 항목은 historical published baseline이며, v2.8.0 신규 기능 완료 근거가 아닙니다.

## v2.6.0 historical published source-only release 포함 범위

- v2.6.0 source-of-truth/bootstrap 정렬
- VLM summary candidate의 Ops-only incident memory productization
- Rule suggestion 후보의 manual review/draft workflow 연결
- ONVIF credential binding/store gate 설계와 redaction guard
- Runtime dashboard baseline/sparkline 고도화 후보
- ScenarioEngine cross-zone re-entry 후보

위 항목은 historical baseline이며, v2.8.0 신규 기능 완료 근거가 아닙니다.

## v2.5.0 historical published source-only release 포함 범위

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

- 현재 공개 release tag 기준: `v3.2.0`
- 현재 source tag 기준: `v3.2.0`
- `v3.2.0` release tag는 signed annotated tag로 생성했습니다.
- 6월 정책상 GitHub Actions가 disabled여서 required Actions check는 생성되지 않았고,
  main ruleset required checks를 임시 제거해 PR merge 후 원복했습니다.
- 다음 신규 release tag는 signed annotated tag로 생성합니다.
- unsigned annotated tag와 lightweight tag는 새 release tag로 사용하지 않습니다.
- tag는 `main`의 public readiness, bundle policy, required Actions가 통과한 커밋에만 붙입니다.
- signed tag evidence는 GitHub Tags/Releases의 Verified 표시 또는 GitHub API tag
  verification `verified=true`/`reason=valid`로 확인합니다.
- source-only release에는 sample/model/runtime binary를 추가 업로드하지 않습니다.
- binary/container/offline bundle은 별도 RC gate와 bundle policy 검토를 통과한 뒤 별도 release로 다룹니다.

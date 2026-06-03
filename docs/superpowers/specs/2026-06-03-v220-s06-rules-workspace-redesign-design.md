# v2.2.0 S06 Rules Workspace Redesign Design

## 목적

`V220-S06 Rules workspace redesign`은 `/ops/rules`의 rule/profile/scenario 편집,
preview, smoke selector, 저장 feedback을 S02 responsive task shell과 S04 component
primitive 기준에 맞춰 재배치합니다. 이 단계는 기존 룰/프로파일/이벤트 템플릿
payload를 바꾸지 않고, 운영자가 “무엇을 준비하고, 무엇을 편집하고, 저장 전 무엇이
막히는지”를 작은 화면에서도 순서대로 따라갈 수 있게 만드는 작업입니다.

## 범위

이번 단계에서 변경하는 화면은 `/ops/rules`입니다.

- 준비 상태: validation, channel/profile/template/VA rule prerequisite
- 초안 보조: scenario builder, VLM rule draft
- 작업 선택: channel analysis, event template, profile mode selector
- 목록/편집: VA rule, event template, analysis profile table과 detail editor
- 확인/기록: save feedback, preview/geometry, audit trail

`/ops/home`, `/ops/dashboard`, `/ops/events`, `/ops/sources`, `/ops/users`, `/client`,
`/setup`, `/login`의 전면 재배치는 이번 단계 범위가 아닙니다.

## UI 방향

1. 첫 화면은 “저장 가능성”을 먼저 보여줍니다. validation panel과 prerequisite cards를
   상단 readiness 영역으로 묶습니다.
2. scenario builder와 VLM draft는 자동 적용이 아니라 편집 폼 초안 보조로만 둡니다.
3. mode selector는 smoke selector 역할을 유지하고, 선택 후 table/detail editor로
   이어지는 작업 흐름을 보장합니다.
4. detail editor는 desktop에서는 작업대 아래 dock처럼 보이고, mobile에서는 full-width
   step editor처럼 보이게 합니다.
5. geometry preview와 developer coordinate details는 기존 control id와 저장 흐름을
   유지합니다.

## 구현 경계

- `src/ingress/webrtc_http_server.cpp`의 `AppendOpsRulesPage` HTML 구조에 S06
  workspace class와 grouping wrapper를 추가합니다.
- `src/ingress/product_ui_css.cpp`에 Rules workspace 전용 layout class를 추가합니다.
- `docs/v220-rules-workspace-redesign.md`를 S06 산출물로 추가합니다.
- `scripts/internal/verify_v220_rules_workspace_redesign.mjs`를 추가하고 `server.sh`에
  `verify-v220-rules-workspace-redesign` 명령을 연결합니다.
- 기존 `id`, `data-testid`, `data-*` contract, button id, form control id는 유지합니다.

## 변경 금지

S06는 아래 contract를 변경하지 않습니다.

- Rule/Profile/VA Rule/Event template payload schema
- `/ops/rules` smoke selector와 저장 roundtrip
- Event POST/WebRTC/SSE/WS metadata schema
- RTSP/WebRTC media path
- Auth/session/scope contract
- VLM draft 자동 저장 또는 자동 적용
- client/viewer source URL, Developer URL, raw JSON, debugCounters, BBox diagnostics,
  rule/profile editor 비노출 정책

## 검증 기준

S06 완료는 아래 evidence로만 판정합니다.

- `./server.sh build`
- `./server.sh verify-v220-rules-workspace-redesign`
- `./server.sh verify-rule-ui`
- `./server.sh verify-ops-rules-roundtrip`
- `./server.sh verify-ops-rule-conflict-ui`
- `./server.sh verify-ops-rule-validation-matrix`
- `./server.sh verify-ops-client-ui --screenshots`
- `git diff --check`

브라우저 UI 풀테스트, 30분 soak, 120분 longrun, published metadata 재검증은 S06 완료
근거가 아니며, 실행하지 않으면 미실행으로 보고합니다.

## 완료 정의

- `/ops/rules`에 `rules-workspace`와 readiness/assist/catalog/detail layout class가
  존재합니다.
- 기존 smoke selector, 저장 버튼, validation panel, scenario builder, VLM draft,
  geometry preview, audit trail hook이 유지됩니다.
- 320/390/760/1180+ viewport에서 table/detail/action overflow를 막는 CSS 기준이
  존재합니다.
- verifier와 기존 Rules smoke가 실제로 통과합니다.

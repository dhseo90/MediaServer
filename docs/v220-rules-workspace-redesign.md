# v2.2.0 Rules Workspace Redesign

이 문서는 `V220-S06 Rules workspace redesign`의 산출물입니다. 목적은 `/ops/rules`의
rule/profile/scenario 편집, preview, smoke selector, 저장 feedback을 S02 responsive
task shell, S03 design token, S04 component primitive 기준으로 재배치하는 것입니다.

S06은 `/ops/rules` route의 visual hierarchy와 responsive workspace 구조를 다룹니다.
`/ops/home`, `/ops/dashboard`, `/ops/events`, `/ops/sources`, `/ops/users`, `/client`,
`/setup`, `/login`의 전면 재배치는 이번 단계 범위가 아닙니다. 브라우저 UI 풀테스트
PASS, 30분 soak, 120분 longrun, published metadata 재검증은 S06 완료 근거가 아닙니다.

## Route Scope

| 영역 | Primary task | S06 배치 기준 |
| --- | --- | --- |
| readiness | 저장 가능성 확인 | validation panel과 prerequisite card를 상단에서 먼저 확인 |
| assist | 초안 보조 | scenario builder와 VLM draft를 자동 적용이 아닌 편집 보조 흐름으로 배치 |
| catalog | 작업 선택과 목록 확인 | channel analysis, event template, profile selector와 table을 한 작업대 안에 배치 |
| detail | 편집/preview/save | detail editor, geometry preview, save feedback, audit trail을 저장 직전 흐름으로 배치 |

## Responsive 기준

| Viewport | 기준 |
| --- | --- |
| 320px | mode select -> step editor -> preview 순서, action/control full-width, horizontal overflow 없음 |
| 390px | readiness와 assist가 single-column으로 쌓이고 긴 validation 문구가 줄바꿈됨 |
| 760px | editor와 preview가 stacked panel로 유지되고 table/detail 전환이 가능함 |
| 1180px+ | table, detail editor, preview, audit trail을 dense 운영 작업 흐름으로 scan/compare/action |

## Component 사용

- S04 `ProductUiSegmentedControlHtml`, `ProductUiDetailsPanelHtml`,
  `ProductUiTableShellHtml` 계열 helper로 후속 치환 가능한 class 경계를 유지합니다.
- 기존 JS가 참조하는 `id`, `data-testid`, `data-*`, form control id, button id는
  유지합니다.
- route별 새 class는 `ops-workspace`, `rules-workspace`입니다.
- responsive layout class는 `rules-workspace-readiness-grid`,
  `rules-workspace-assist-grid`, `rules-workspace-catalog-grid`,
  `rules-workspace-detail-panel`입니다.

## 변경 금지 경계

S06은 아래를 변경하지 않습니다.

- Rule/Profile/VA Rule/Event template payload schema
- `/ops/rules` smoke selector와 저장 roundtrip
- Event POST/WebRTC/SSE/WS metadata schema
- RTSP/WebRTC media path
- Auth/session/scope contract
- VLM draft 자동 저장 또는 자동 적용
- client/viewer source URL, Developer URL, raw JSON, debugCounters, BBox diagnostics,
  rule/profile editor 비노출 정책

## 검증

S06 완료 evidence:

```bash
./server.sh build
./server.sh verify-v220-rules-workspace-redesign
./server.sh verify-rule-ui
./server.sh verify-ops-rules-roundtrip
./server.sh verify-ops-rule-conflict-ui
./server.sh verify-ops-rule-validation-matrix
./server.sh verify-ops-client-ui --screenshots
git diff --check
```

이 검증은 S06 route/CSS/문서 연결과 기존 Rules smoke를 확인합니다. 브라우저 UI
풀테스트, 30분 soak, 120분 longrun, published metadata 재검증은 실행하지 않으면
미실행으로 분리합니다.

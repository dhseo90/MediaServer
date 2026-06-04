# v2.2.0 Ops Workspace Redesign

이 문서는 `V220-S05 Ops workspace redesign`의 산출물입니다. 목적은 `/ops/home`,
`/ops/dashboard`, `/ops/events`를 운영자 작업 흐름에 맞게 재배치하고, S02 responsive
task shell, S03 design token, S04 component primitive를 실제 Ops route에 적용하는
것입니다.

S05는 `/ops/sources`, `/ops/rules`, `/ops/users`, `/client`, `/setup`, `/login`의 전면
재배치 단계가 아닙니다. 브라우저 UI 풀테스트 PASS, 30분 soak, 120분 longrun,
published metadata 재검증은 S05 완료 근거가 아닙니다.

## Route Scope

| Route | Primary task | S05 배치 기준 |
| --- | --- | --- |
| `/ops/home` | 운영 상태 요약과 다음 조치 선택 | 구성/런타임/위험 신호/바로가기 action을 첫 화면에서 스캔 |
| `/ops/dashboard` | source/runtime/event 원인 판독 | root cause, incident timeline, runtime operations, VA quality를 진단 흐름으로 배치 |
| `/ops/events` | event review와 filtering | 상태 요약, alert delivery, review inbox, recent records를 event workbench 흐름으로 배치 |

## Responsive 기준

| Viewport | 기준 |
| --- | --- |
| 320px | single-column, primary task first, action/control full-width, horizontal overflow 없음 |
| 390px | compact toolbar와 status cards stack, 긴 문구 줄바꿈 보장 |
| 760px | stacked two-panel 느낌의 section grouping, filter/action은 inline 접근 가능 |
| 1180px+ | dense 운영 콘솔, metric/action/diagnostic panel을 한 화면에서 scan/compare/action |

## Component 사용

- S04 `ProductUiToolbarHtml`, `ProductUiSectionCardHtml`, `ProductUiBadgeRowHtml`,
  `ProductUiEmptyStateHtml` 소비를 유지합니다.
- 기존 JS가 참조하는 `id`, `data-testid`, form control id, button id는 유지합니다.
- route별 새 class는 `ops-workspace`, `ops-workspace-home`,
  `ops-workspace-dashboard`, `ops-workspace-events`입니다.
- responsive layout class는 `ops-workspace-hero`, `ops-workspace-action-grid`,
  `ops-workspace-diagnostic-grid`, `ops-workspace-event-grid`입니다.

## 변경 금지 경계

S05는 아래를 변경하지 않습니다.

- Event POST/WebRTC/SSE/WS metadata schema
- RTSP/WebRTC media path
- Auth/session/scope contract
- Rule/Profile payload schema
- `/ops/rules` smoke selector와 저장 roundtrip
- client/viewer source URL, Developer URL, raw JSON, debugCounters, BBox diagnostics,
  rule/profile editor 비노출 정책

## 검증

S05 완료 evidence:

```bash
./server.sh build
./server.sh verify-v220-ops-workspace-redesign
./server.sh verify-v220-component-primitives
./server.sh verify-product-ui-token-drift
./server.sh verify-ops-click-e2e
./server.sh verify-ops-client-ui --screenshots
./server.sh verify-rule-ui
git diff --check
```

이 검증은 S05 route/CSS/문서 연결과 기존 Ops UI smoke를 확인합니다. 브라우저 UI
풀테스트, 30분 soak, 120분 longrun, published metadata 재검증은 실행하지 않으면
미실행으로 분리합니다.

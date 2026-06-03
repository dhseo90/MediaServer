# v2.2.0 Responsive Task Shell

이 문서는 `V220-S02 Responsive task shell`의 산출물입니다. 목적은 v2.2.0 UI 구현에
들어가기 전 `/ops`, `/client`, `/setup`, `/login`의 route별 primary task,
secondary action, drawer/panel 전환 기준을 고정하는 것입니다.

S02는 설계 계약 단계입니다. 실제 HTML/CSS/JavaScript 재배치, visual redesign
mockup, 브라우저 UI 풀테스트 PASS는 S02 완료 근거가 아닙니다.

## 기본 정책

1. 기능을 숨기지 않습니다. 작은 화면에서는 secondary action을 drawer, details,
   단계형 editor로 옮기되 접근 경로는 유지합니다.
2. route마다 하나의 primary task를 첫 화면의 중심으로 둡니다.
3. table은 작은 화면에서 record/card flow로 전환할 수 있어야 합니다.
4. detail/edit panel은 desktop에서는 side panel, tablet에서는 inline panel,
   mobile에서는 drawer 또는 step panel로 전환합니다.
5. client/viewer 화면에는 source URL, Developer URL, raw JSON, debugCounters,
   BBox diagnostics, rule/profile editor를 노출하지 않습니다.
6. `/ops/rules` smoke selector와 Rule/Profile 저장 roundtrip은 유지합니다.
7. Event POST/WebRTC/SSE/WS metadata schema, Auth/session/scope, RTSP/WebRTC media
   path는 변경하지 않습니다.

## Viewport 완료 기준

| Viewport | 기준 | Shell 배치 | 완료 조건 |
| --- | --- | --- | --- |
| 320px | 최소 모바일 | single-column, primary task first, secondary action은 drawer/details | horizontal overflow 없음, 버튼/긴 단어 잘림 없음, form row가 부모 폭 안에 머묾 |
| 390px | 일반 모바일 | single-column + compact toolbar, table은 record/card flow | primary task가 첫 화면에 보이고 secondary action은 접근 가능 |
| 760px | tablet/panel | primary + inline detail 또는 stacked two-panel | table/detail 전환이 가능하고 drawer 없이 주요 편집 task가 유지됨 |
| 1180px+ | desktop ops console | dense table + side/detail panel + toolbar | 반복 운영 작업을 한 화면에서 scan/compare/action 가능 |

## Route별 Task 계약

| Route group | Primary task | Secondary action | 320/390 정책 | 760 정책 | 1180+ 정책 |
| --- | --- | --- | --- | --- | --- |
| `/setup` | 최초 admin 설정 완료 | theme/language, password hint | form만 먼저, hint는 접힘/아래 배치 | form + policy hint | centered auth form |
| `/login` | 로그인 완료 | access request, theme/language | username/password/submit 우선 | form + secondary links | compact auth card |
| `/password/change` | 비밀번호 변경 완료 | policy hint, logout | 현재/새 비밀번호 순서 유지 | form + hint | auth form + account context |
| `/client/request-access` | 접근 요청 제출 | message state, theme/language | form + result message | form + status | auth form pattern |
| `/ops/home` | 운영 상태 요약과 다음 조치 선택 | shortcut, status badges | summary cards stack, action은 full-width | summary + shortcuts | metric cards + action cluster |
| `/ops/dashboard` | source/runtime/event 원인 판독 | incident filter, share/copy, VA quality drilldown | root cause/status 먼저, filter는 drawer/details | root cause + filters stacked | dense dashboard panels |
| `/ops/events` | event review와 filtering | alert delivery, review action, archive/export | event list 먼저, filters/action drawer | list + inline filter panel | table/list + side review panel |
| `/ops/sources` | source 상태 확인과 source/view 관리 | ONVIF draft, WHEP/WHIP, group/site, bulk action | source list 먼저, detail/edit drawer | list + inline detail | table + side detail panel |
| `/ops/rules` | rule/profile/scenario 작성과 preview/save | validation, VLM draft, smoke selector | mode select -> step editor -> preview 순서 | editor + preview stacked | table + detail editor + preview |
| `/ops/users` | user/invite/access request 관리 | reset/disable/audit style action | user list 먼저, destructive action은 confirm panel | list + inline detail | table + side admin panel |
| `/client/live` | live video 시청과 source 선택 | layout preset, overlay, event dock | video first, source tree/dock은 drawer | video + dock stacked | video grid + source tree/dock |
| `/client/dashboard` | viewer-safe 상태 요약 | safe event/status details | status cards stack | cards + event summary | dashboard cards |
| `/client/events` | viewer-safe event review | filter, event detail | event feed first, detail drawer | feed + inline detail | feed/table + side detail |

## Shell Primitive 계약

| Primitive | 역할 | Responsive rule |
| --- | --- | --- |
| `ResponsiveTaskShell` | route별 primary/secondary/detail 영역을 배치 | 320/390 single-column, 760 stacked panel, 1180+ split/dense |
| `PrimaryTaskRegion` | 사용자가 지금 해야 할 핵심 task | 모든 viewport에서 secondary보다 먼저 렌더링 |
| `SecondaryActionDrawer` | filter, bulk action, import, admin action | mobile에서 drawer/details, desktop에서 toolbar/side panel |
| `DetailDrawerPanel` | selected row/detail/edit/save | mobile drawer, tablet inline, desktop side panel |
| `ResponsiveTable` | list/table/card 전환 | 1040 이하 record/card flow 허용, action overflow 금지 |
| `FormGrid` | auth/rules/source/user form | field min-width 0, label/help/error wrap 보장 |
| `ViewerSafeDock` | client source/event dock | viewer redaction 유지, source/debug/raw 노출 금지 |

## S03/S04 입력값

- S03 design token refresh는 이 문서의 viewport 정책을 token/spacing/density 기준으로
  풀어야 합니다.
- S04 component primitive는 `ResponsiveTaskShell`, `DetailDrawerPanel`,
  `ResponsiveTable`, `FormGrid`, `SecondaryActionDrawer`를 우선 후보로 삼습니다.
- S05~S08 route redesign은 위 route별 primary task를 구현 완료 조건으로 사용합니다.

## 검증

S02 완료 evidence:

```bash
./server.sh verify-v220-responsive-task-shell
./server.sh verify-ops-client-ui --browser-mode static
./server.sh verify-docs-links
./server.sh verify-script-inventory
git diff --check
```

이 검증은 route별 task shell 계약과 기존 shell static contract를 확인합니다. 실제
브라우저 UI 풀테스트, screenshot evidence, visual redesign mockup, 30분 soak,
120분 longrun은 실행하지 않습니다.

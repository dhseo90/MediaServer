# v2.2.0 UI Architecture Inventory

이 문서는 `V220-S01 UI architecture inventory`의 산출물입니다. 목적은 v2.2.0 UI
전면 개편을 바로 구현하지 않고, 현재 C++ 문자열 기반 UI가 어디에 모여 있고 어떤
route/template/helper 경계로 나뉘는지 먼저 고정하는 것입니다.

## 확인 범위

확인일: 2026-06-03

확인됨:

- UI 구현은 별도 SPA가 아니라 C++ 문자열 HTML/CSS/JavaScript 생성 구조입니다.
- 제품 UI의 큰 축은 `src/ingress/webrtc_http_server.cpp`,
  `src/ingress/product_ui_css.cpp`, `src/ingress/product_ui_page_scripts.cpp`,
  `src/ingress/product_ui_js.cpp`, `src/ingress/product_ui_assets.cpp`에 있습니다.
- `/ops`, `/client`, `/setup`, `/login`은 같은 제품 token/script 일부를 공유하지만,
  template HTML과 page script 경계는 아직 큰 함수와 긴 문자열에 강하게 묶여 있습니다.
- 이 inventory는 route/API/schema/Event POST/WebRTC/SSE/WS metadata/RTSP-WebRTC media
  path 변경을 포함하지 않습니다.

미확인:

- 실제 visual redesign 품질
- 320/390/760/1180+ 화면별 최종 task flow
- 각 helper 분리의 구체 구현 난이도와 변경량
- 브라우저 UI 풀테스트 PASS

## 파일 Inventory

| 파일 | 현재 역할 | 확인된 크기/경계 | S02 이후 분리 후보 |
| --- | --- | --- | --- |
| `src/ingress/webrtc_http_server.cpp` | HTTP routing, auth/ops/client HTML template, API handler, WebRTC/lab endpoint가 섞인 중심 파일 | 약 16.7k lines. `AppendOpsShellStart`, `AppendAuthShellStart`, `OpsShellPageHtml`, `ClientShellPageHtml`, route dispatch가 같은 파일에 있음 | route별 page renderer, shell/chrome helper, API handler와 HTML renderer 분리 |
| `src/ingress/product_ui_css.cpp` | design token, Ops 공통 CSS, Client shell CSS | 약 4.7k lines. `ProductDesignTokensCss`, `ProductUiCss`, `ClientShellCss`가 있음 | token/base/component/page CSS 구획 분리 |
| `src/ingress/product_ui_page_scripts.cpp` | Client/Ops page script 문자열 생성 | 약 10.4k lines. `AppendClientShellScript`, `AppendOpsShellScript`, `AppendOpsSourcesPageScript`, `AppendOpsUsersPageScript`가 있음 | route별 controller script, shared UI behavior, data adapter 분리 |
| `src/ingress/product_ui_js.cpp` | theme boot, shared UI script | 약 1.6k lines. `ProductThemeBootScript`, `ProductSharedUiScript`, `AppendProductThemeScript`가 있음 | theme/storage/language/shared control helper 분리 |
| `src/ingress/product_ui_assets.cpp` | theme button, language select, brand/nav/avatar SVG/HTML | 약 55 lines. `ProductThemeToggleButtonHtml`, `ProductLanguageSelectHtml`, `ProductBrandMarkSvg`, `ProductNavIconSvg`, `ProductAccountAvatarSvg`가 있음 | icon/helper registry와 button primitive 후보 |
| `include/ingress/product_ui_css.h` | CSS 생성 public API | `ProductDesignTokensCss`, `ProductUiCss`, `ClientShellCss` 선언 | CSS module API boundary |
| `include/ingress/product_ui_js.h` | theme/shared JS public API | `ProductThemeBootScript`, `ProductSharedUiScript`, `AppendProductThemeScript` 선언 | shared JS module API boundary |
| `include/ingress/product_ui_page_scripts.h` | page script public API | client/access/ops/sources/users script append 함수 선언 | route controller API boundary |
| `include/ingress/product_ui_assets.h` | asset/helper public API | theme/language/brand/nav/avatar helper 선언 | product primitive API boundary |

## Public Helper API

| 영역 | 함수 | 의미 |
| --- | --- | --- |
| Design token/CSS | `ProductDesignTokensCss()` | theme-aware CSS token 생성 |
| Design token/CSS | `ProductUiCss()` | Ops/Auth/Product 공통 CSS 생성 |
| Client CSS | `ClientShellCss()` | Client viewer shell 전용 CSS 생성 |
| Shared JS | `ProductThemeBootScript()` | theme 초기 적용 boot script |
| Shared JS | `ProductSharedUiScript()` | 공통 UI 동작 script |
| Shared JS | `AppendProductThemeScript(out)` | theme/language script 삽입 |
| Page JS | `AppendClientAccessRequestScript(out)` | client access request page script |
| Page JS | `AppendClientShellScript(out)` | client live/dashboard/events shell script |
| Page JS | `AppendOpsShellScript(out, active, stream_route, rtsp_port)` | ops home/dashboard/events/vlm shell script |
| Page JS | `AppendOpsSourcesPageScript(out, stream_route_json, rtsp_port)` | ops sources page script |
| Page JS | `AppendOpsUsersPageScript(out)` | ops users page script |
| Assets | `ProductThemeToggleButtonHtml()` | theme toggle button HTML |
| Assets | `ProductLanguageSelectHtml()` | language select HTML |
| Assets | `ProductBrandMarkSvg()` | product brand mark |
| Assets | `ProductNavIconSvg(key)` | product nav icon |
| Assets | `ProductAccountAvatarSvg()` | account avatar icon |

## Route/Template Boundary

| Surface | Routes | 현재 template/render 경계 | S02 primary task 입력 |
| --- | --- | --- | --- |
| Auth/setup | `/setup`, `/invite/setup`, `/login`, `/password/change`, `/client/request-access` | `AppendAuthShellStart/End`, `LoginPageHtml`, `SetupPageHtml`, `InviteSetupPageHtml`, `PasswordChangePageHtml`, `ClientAccessRequestPageHtml` | setup/login/password/access request를 같은 responsive form primitive로 정리 |
| Ops overview shell | `/ops`, `/ops/home`, `/ops/dashboard`, `/ops/events`, `/ops/vlm` | `IsOpsOverviewShellRoute`, `OpsOverviewActiveForPath`, `OpsShellPageHtml`, `AppendOpsShellStart/End`, `AppendOpsHomePage`, `AppendOpsDashboardPage`, `AppendOpsEventsPage`, `AppendOpsVlmInstallConnectionPage` | 운영자가 오늘 볼 상태, 이벤트, 원인, VLM 상태를 한 shell 안에서 task별로 이동 |
| Ops sources | `/ops/sources` | `BuildOpsSourcesPageHtml`, `AppendOpsSourcesPageScript` | source/channel/site/group/onvif/whep/whip 관리를 table + detail panel로 분리 |
| Ops rules | `/ops/rules` | `AppendOpsRulesPage`, ops rules script는 `AppendOpsShellScript`에 포함 | rule/profile/scenario 작성 flow를 table/list/detail/preview 단계로 분리 |
| Ops users | `/ops/users` | `BuildOpsUsersPageHtml`, `AppendOpsUsersPageScript` | admin user/invite/request approval을 auth shell과 같은 form primitive로 정리 |
| Client shell | `/client`, `/client/live`, `/client/dashboard`, `/client/events` | `IsClientShellRoute`, `ClientShellActiveForPath`, `ClientShellPageHtml`, `AppendClientShellScript` | viewer-first live video, dashboard, event review를 작은 화면에서도 source/debug 노출 없이 이동 |
| Product APIs | `/ops/api/*`, `/client/api/*`, `/lab/*`, `/webrtc/*`, `/whep`, `/whip/publish`, `/ws/va-metadata` | `webrtc_http_server.cpp` route dispatch 안에서 처리 | S01/S02 범위에서는 payload/schema 변경 금지, UI data adapter 관찰만 허용 |

## Component Primitive 후보

S03/S04에서 실제 helper로 분리할 후보입니다. 이 단계에서는 이름과 책임만 고정합니다.

| 후보 | 현재 증상 | 분리 책임 |
| --- | --- | --- |
| `ProductShell` | Ops/Client/Auth shell 구조와 theme/language/account controls가 여러 문자열에 반복됨 | page chrome, topbar, nav, account menu, theme/language controls |
| `PageSection` | `section-card`, `panel`, toolbar 조합이 반복됨 | title, subtitle, actions, status/empty slot |
| `ActionToolbar` | primary/secondary/context action 밀도와 위치가 route마다 다름 | action group, compact toolbar, icon/text policy |
| `ResponsiveTable` | table-wrap, responsive table class, action column이 반복됨 | table shell, empty/loading/error row, mobile label contract |
| `DetailDrawerPanel` | rules/source/users detail panel이 inline section-card에 묶임 | mobile drawer, desktop side panel, close/save state |
| `FormGrid` | auth/setup/rules/source form row가 route별 문자열에 흩어짐 | label/help/error, field row, generated id display |
| `StatusBadgeRow` | chip/badge row가 dashboard/rules/source/client에 반복됨 | status tone, count, warning, skeleton/loading |
| `EmptyLoadingErrorState` | "로딩 중", empty, failure copy가 JS와 HTML에 섞임 | route-neutral empty/loading/error copy matrix 연결 |
| `DebugDetails` | raw/debug details는 ops-only 접힘 영역이어야 함 | ops-only details, viewer/client redaction guard |
| `ResponsiveTaskShell` | 320/390/760/1180+에서 task별 재배치 기준이 아직 route별로 고정되지 않음 | S02 primary task, secondary action, drawer/panel breakpoint |

## 변경 금지 경계

S01은 아래를 변경하지 않습니다.

- Event POST payload
- WebRTC DataChannel payload
- SSE/WS metadata schema
- RTSP/WebRTC media path
- Auth/session/scope contract
- Rule/Profile payload schema
- `/ops/rules` smoke selector와 저장 roundtrip 흐름
- client/viewer source URL, Developer URL, raw JSON, debugCounters, BBox diagnostics,
  rule/profile editor 비노출 정책

## S02 입력값

S02에서는 이 inventory를 입력으로 삼아 route별 primary task를 확정합니다.

| Route group | S02에서 결정할 primary task |
| --- | --- |
| `/ops/home` | 운영 상태 요약과 다음 조치 |
| `/ops/dashboard` | source/runtime/event 원인 판독 |
| `/ops/events` | event review, filter, alert delivery |
| `/ops/sources` | source 등록/상태/그룹 관리 |
| `/ops/rules` | rule/profile/scenario 작성과 preview/save |
| `/ops/users` | user/invite/access request 관리 |
| `/client/live` | viewer-first live video와 source tree/dock |
| `/client/dashboard` | viewer-safe 상태 요약 |
| `/client/events` | viewer-safe event review |
| `/setup`, `/login`, `/password/change` | 인증/초기 설정 form task |

## 검증

S01 완료 evidence:

```bash
./server.sh verify-v220-ui-architecture-inventory
./server.sh verify-ops-client-ui --browser-mode static
./server.sh verify-docs-links
./server.sh verify-script-inventory
git diff --check
```

이 검증은 구조 inventory와 정적 UI shell contract를 확인합니다. 실제 브라우저 UI
풀테스트, visual redesign mockup, 30분 soak, 120분 longrun은 실행하지 않습니다.

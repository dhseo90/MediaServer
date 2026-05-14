# UI Guide

이 문서는 Auth, Ops, Client 제품 UI의 현재 화면 구조와 운영 기준을 설명합니다.
서버 실행/검증 명령은 [development-guide.md](./development-guide.md),
VA 내부 구조는 [video-analysis.md](./video-analysis.md)를 봅니다.
`/lab` 화면 route는 제품 UI에서 제거했고 개발/검증 API만 유지합니다.

## 1. UI 개요

| 화면 | URL | 용도 |
| --- | --- | --- |
| Root entry | `http://127.0.0.1:8080/` | auth mode와 role에 따른 진입점 |
| 최초 관리자 설정 | `http://127.0.0.1:8080/setup` | setup required 상태에서 admin password bootstrap |
| 로그인 | `http://127.0.0.1:8080/login` | session mode에서 계정 로그인과 role별 landing 이동 |
| 운영 콘솔 | `http://127.0.0.1:8080/ops` 또는 `/ops/home` | admin/operator용 운영 화면과 운영 홈 요약 |
| 운영 Dashboard | `http://127.0.0.1:8080/ops/dashboard` | runtime status를 card/detail UI로 표시 |
| 운영 Events 직접 route | `http://127.0.0.1:8080/ops/events` | primary nav에서 숨긴 후속/진단 route |
| 채널 관리 | `http://127.0.0.1:8080/ops/sources` | admin/operator용 숫자 채널 목록과 SourceRegistry/PublishedView 연결 관리 |
| 계정 관리 | `http://127.0.0.1:8080/ops/users` | admin 전용 사용자 목록, 상세, 상태 관리 |
| 클라이언트 포털 | `http://127.0.0.1:8080/client` 또는 `/client/live` | viewer/operator/admin용 client 화면과 2x2 live monitor |
| 클라이언트 Dashboard | `http://127.0.0.1:8080/client/dashboard` | scoped PublishedView 상태 요약 |
| 접근 요청 | `http://127.0.0.1:8080/client/request-access` | pending client access request 제출 |
| 룰 관리 | `http://127.0.0.1:8080/ops/rules` | 채널 분석 설정, 이벤트 템플릿, 분석 프로파일 관리 |
| 개발/검증 API | `http://127.0.0.1:8080/lab/analysis/*` | session, stream, analysis tap, event storage JSON API |

실제 host/port는 `./server.sh status` 또는 `./server.sh urls` 출력값을 우선합니다.

UI는 light/dark theme-aware design token을 사용합니다.
card, button, form, table, badge는 같은 semantic color 규칙을 공유합니다.
기본 화면은 요약과 주요 액션을 먼저 보여주고,
운영자용 내부 진단 응답과 개발자용 URL 같은 세부 정보는
제품 shell에 직접 노출하지 않고 API와 검증 명령에서 확인합니다.
client/viewer shell에는 내부 진단 응답, debug 정보, developer/source URL을 노출하지 않습니다.

액션 계층은 다음 기준을 따릅니다.

- 저장, 검색, 보기 시작 같은 primary action은 fill 버튼으로 표시합니다.
- 목록으로, 재시작, 좌표 초기화, 복사 같은 보조 작업은 weak/ghost 버튼으로 표시합니다.
- 삭제, 중단처럼 되돌리기 어렵거나 위험한 작업에만 danger 버튼을 사용합니다.
- status badge는 `success`, `warning`, `danger`, `info`, `neutral` 의미를 구분하고 한 줄에 과도하게 늘어놓지 않습니다.

내장 HTTP UI는 아직 C++ 문자열 렌더링 기반이지만, 제품 shell 쪽은 다음 공통 helper를 기준으로 유지합니다.

- `include/ingress/product_ui_assets.h`, `src/ingress/product_ui_assets.cpp`:
  theme toggle button, nav/account SVG asset처럼
  route data에 의존하지 않는 product UI asset을 보관합니다.
- `include/ingress/product_ui_css.h`, `src/ingress/product_ui_css.cpp`: Auth/Ops/Client가 공유하는 design token, 제품 shell CSS, client shell 전용 CSS를 보관합니다.
- `include/ingress/product_ui_js.h`, `src/ingress/product_ui_js.cpp`: theme boot/apply script와 product route 공통 JS helper를 보관합니다.
- `include/ingress/product_ui_page_scripts.h`,
  `src/ingress/product_ui_page_scripts.cpp`:
  `/client`, `/client/request-access`, `/ops` shell overview pages,
  `/ops/sources`, `/ops/users`의 route별 page script를 보관합니다.
- `ProductDesignTokensCss()`: Auth/Ops/Client가 공유하는 light/dark semantic token 원천입니다.
- `ProductUiCss()`: 제품 shell 공통 card/button/form/table/badge 스타일입니다.
- `ProductSharedUiScript()`:
  product route에서 공유하는 `escapeHtml`, `requestJson`, selector,
  form-data, feedback, badge 렌더링,
  select/table DOM helper, row/action/detail helper, role/scope visibility helper입니다.
- 채널/룰/사용자 목록은 `ops-responsive-table`, `ops-row-actions`,
  `ops-detail-panel` 공통 class와 `opsRowActionsHtml`,
  `opsTableRowHtml`, `setOpsDetailPanelOpen` helper를 사용합니다.
  모바일에서는 같은 카드형 row 규칙으로 전환되며, 셀 내용과 action
  버튼은 자기 칸 밖으로 밀려나지 않아야 합니다.
- `/ops/sources`와 `/ops/users`의 변경 이력 필터는 table 아래의
  감사 로그 패널 안에 머물러야 합니다. 320/390px에서는 검색, 작업자,
  사용자, 대상, 동작, 시작, 종료, 페이지 크기 control이 부모 폭 안에서
  줄바꿈되고, native date/time input 자체가 화면 오른쪽 밖으로
  튀어나가지 않아야 합니다.
- `ClientShellCss()`: client shell 전용 CSS를 `ClientShellPageHtml()` 밖에서 관리합니다.
- `AppendOpsShellStart/End`, `AppendAuthShellStart/End`: 운영 shell과 setup/login auth shell의 공통 document/header/footer를 렌더링합니다.
- `AppendProductAccountMenu()`: theme toggle, user role, logout 영역을 Ops/Client에서 동일하게 렌더링합니다.
- `AppendOpsHomePage()`, `AppendOpsDashboardPage()`, `AppendOpsRulesPage()`, `AppendOpsEventsPage()`: `/ops` shell 내부 page markup을 route별 helper로 분리합니다.
- `AppendClientShellScript()`, `AppendOpsShellScript()`,
  `AppendOpsSourcesPageScript()`, `AppendOpsUsersPageScript()`:
  page markup과 route별 JS 동작을 물리적으로 분리합니다.
  API schema와 payload는 기존 endpoint 계약을 그대로 사용합니다.
- `HtmlPageResponse()`: browser page route의 `text/html`/`no-store` 응답 포장을 공통화합니다.
- `IsOpsOverviewShellRoute()`, `IsClientShellRoute()`: route handler의 shell path 판별을 한 곳에서 관리합니다.

UI ownership 기준:

- Product assets: `product_ui_assets.*`
  - 책임: theme toggle button, nav/account SVG
  - 주의: route data나 API fetch를 넣지 않습니다.
- Product CSS: `product_ui_css.*`
  - 책임: design token, product shell CSS, client shell CSS
  - 주의: 색상/spacing/radius는 semantic token 우선으로 유지합니다.
- Product JS: `product_ui_js.*`
  - 책임: `MediaServerUi` helper, theme persistence, iframe theme sync
  - 주의: API schema나 route별 payload를 넣지 않습니다.
- Product page scripts: `product_ui_page_scripts.*`
  - 책임: route별 Ops/Client form/table/live monitor script
  - 주의: backend payload 계약과 selector를 유지합니다.
- Auth shell: `AppendAuthShellStart/End`
  - 책임: `/setup`, `/login`, `/password/change`, invite/request shell
  - 주의: password policy와 session 동작은 auth backend 계약을 따릅니다.
- Ops shell: `AppendOpsShellStart/End`, `AppendOps*Page*`, `AppendOpsShellScript`
  - 책임: admin/operator navigation, page markup, overview script
  - 주의: 제품 화면에 내부 진단 JSON을 노출하지 않습니다.
- Client shell: `ClientShellPageHtml`, `AppendClientShellScript`
  - 책임: scoped viewer live/dashboard UI
  - 주의: source URL, 내부 counter, Developer URL, rule/profile editor를 노출하지 않습니다.
- Smoke:
  - 파일: `verify_ops_client_ui_smoke.mjs`, `verify_ops_tables_layout.mjs`,
    `verify_ops_rules_embed_smoke.mjs`, `verify_auth_ui_smoke.mjs`,
    `verify_auth_workflow.sh`, `verify_ops_rules_roundtrip.mjs`
  - 책임: selector, screenshot, auth UI, 채널/룰/사용자 테이블 layout,
    `/ops/rules` 회귀와 이벤트 템플릿 round-trip 확인
  - 주의: visible text보다 stable selector와 금지 항목 중심으로 유지합니다.

`/ops/rules`는 채널 분석 설정, 이벤트 템플릿,
분석 프로파일을 제품 운영 화면에서 직접 관리합니다.
`/lab/rules` iframe이나 이전 Lab 3탭을 embed하지 않습니다.

룰 화면의 저장 전 검증 패널은 다음 오류를 표시합니다.

- source mismatch
- 중복 ID
- 누락된 프로파일/이벤트 템플릿/PublishedView 룰 참조

저장 버튼도 같은 기준으로 draft payload를 확인해
잘못된 source 연결이나 빈 프로파일을 서버 요청 전에 차단합니다.

대표 제품 화면:

README에는 첫 인상용으로 가장 읽기 쉬운 overview 화면만 둡니다.
분석 상세 화면은 이 가이드에서 따로 봅니다.

- Ops Home

![운영 홈](assets/ui/ops-home.png)

- Ops Sources

![운영 채널 관리](assets/ui/ops-channels.png)

- Ops Rules

![운영 룰 관리](assets/ui/ops-rules.png)

- Ops Rules Preview

![룰 영상/영역 편집](assets/ui/ops-rules-preview.png)

- Ops Users

![운영 사용자 관리](assets/ui/ops-users.png)

- Client Live

![클라이언트 라이브](assets/ui/client-live.png)

운영/개발 진단 화면은 아래 상세 섹션에서 따로 다룹니다.

## 2. Login / Session

기본 `MEDIA_SERVER_AUTH_MODE=auto`에서는
최초 users file/admin password 상태를 먼저 확인합니다.
users file이 없거나 `admin.passwordHash`가 없으면
`/setup`에서 기본 username `admin`의 비밀번호를 처음 설정합니다.
admin 기본 비밀번호는 없고, passwordless admin login도 허용하지 않습니다.
setup 완료 후 `/setup`은 `/login`으로 돌아가며,
이후에는 `/login`에서 계정으로 로그인해
role/scope snapshot을 담은 HttpOnly session cookie를 받습니다.

![로그인 화면](assets/ui/auth-login.png)

로컬 QA, 수동 smoke, 자동 auth smoke의 표준 테스트 계정 비밀번호는
`qweasd0-`로 통일합니다.
이는 검증 중 계정 상태를 일관되게 맞추기 위한 테스트 규칙이며,
운영 배포나 제품 기본 비밀번호로 사용하지 않습니다.

Password policy 기본값은 `kr-privacy`입니다.
`/setup`과 `/password/change`는 동일한 정책을 적용합니다.

- 3종류 조합 최소 8자
- 2종류 조합 최소 10자
- username 포함 금지
- 반복 문자, 연속 숫자, 키보드 배열 금지
- 흔한 비밀번호와 history 재사용 금지

로그인 실패가 반복되면 계정별 lockout 메시지를 표시합니다.
`mustChangePassword=true` 계정은 로그인 후 `/password/change`로 이동합니다.

`MEDIA_SERVER_AUTH_MODE=off`는 기존 개발 자동화를 위한 명시 모드입니다.
이 모드에서도 `/lab`, `/lab/rules`, `/lab/import` 화면 route는 404로 닫습니다.
개발/검증 API만 `/lab/analysis/*` 아래에서 유지합니다.

Role별 이동:

- `admin`, `operator`: `/ops/home`
- `viewer`: `/client/live`
- `integrator`: UI landing 없이 `/client/api/views/{viewId}/events`와 `/client/api/views/{viewId}/metadata` 연동용 token/session 사용을 우선합니다.

Login page는 username/password 입력,
실패/lockout 메시지,
현재 사용자/role 표시,
logout 버튼만 제공하는 인증 화면입니다.

`/` 이동 규칙:

- setup required 상태: `/setup`
- auth off: `MEDIA_SERVER_UI_DEFAULT_HOME`에 따라 `/ops/home` 또는 `/client/live`
- auth on + admin/operator: `/ops/home`
- auth on + viewer: `/client/live`
- 미인증 요청: `/login`

비밀번호 변경에 성공하면 기존 session은 폐기되고,
`/login`에서 다시 로그인합니다.

클라이언트 계정의 1차 정책은 admin 수동 생성/승인입니다.

- admin은 `/ops/users`에서 username, role, viewId 또는 직접 scopes,
  초기 비밀번호를 입력해 계정을 만듭니다.
- pending access request도 같은 화면에서 승인/거절합니다.
- invite/setup API와 CLI는 검증 및 운영 보조 흐름으로 유지합니다.
- self-signup 자동 승인은 제공하지 않습니다.
- `/client/request-access`는 pending request만 저장합니다.
- public API는 body/field 길이, 숫자 viewId, 중복 pending,
  peer rate-limit을 통과한 요청만 저장합니다.
- admin 승인 후에도 password setup invite가 수락되기 전에는
  계정 생성, session login, view 접근을 허용하지 않습니다.

PublishedView 단위 접근은 다음 scope로 제한합니다.

- `view:read:{viewId}`
- `event:read:{viewId}`
- `metadata:read:{viewId}`
- `dashboard:read:{viewId}`

Route 역할:

- `/ops`:
  admin/operator 전용 운영 shell이며 `ops:read` scope가 필요합니다.
  채널/PublishedView 변경 API는 `source:write`를 추가로 요구합니다.
  Primary nav는 홈, 대시보드, 채널, 룰, 사용자(admin),
  클라이언트 미리보기 순서입니다.

  - `/ops/home`: 운영 overview
  - `/ops/dashboard`:
    `/ops/api/runtime/status` 기반 운영 카드와 문제 원인 패널입니다.
    source lifecycle, stale tap, reconnect/cleanup, auth/config를
    최근 EventRecord, POST/storage 오류, ICE 설정, `.media_server.log` tail,
    correlation id와 함께 확인합니다.
    다음 조치 버튼은 source 재검증, registry diff, Event/evidence 진단,
    auth/config 확인, log correlation 필터를 즉시 실행합니다.
    Live VA Event Quality panel은 active analysis tap의 state-dump/metrics를
    읽어 Scenario Timeline과 TrackHealth issue grouping을 표시합니다.
    phase elapsed, cooldown, dedupe/emitted count는 운영자 debug summary로만
    보여주며 Event POST/WebRTC/SSE/WS metadata schema를 바꾸지 않습니다.
  - `/ops/sources`:
    숫자 채널 목록, 상세 패널, 채널 추가 폼, URL copy 영역,
    채널 변경 이력을 제공합니다.
    ONVIF는 별도 import 패널이 아니라 `ONVIF 카메라` source 유형으로 표시합니다.
    Live URL/VA URL copy 버튼은 file/RTSP/HTTP/WHEP/Published WebRTC와 같은
    테이블 규칙을 쓰며, ONVIF 채널은 `ONVIF RTSP`, `ONVIF WHEP` 버튼을 표시합니다.
    live source health 초안은 [live-source-health.md](./live-source-health.md)를
    기준으로 `/ops/dashboard`와 source health API에서 다루며, client/viewer에는
    sanitized dashboard summary만 노출합니다.
    원본 source URL, ONVIF endpoint, raw diagnostic JSON은 viewer/client에 숨깁니다.
  - `/ops/rules`: 채널 분석 설정, 이벤트 템플릿, 분석 프로파일 목록

  룰 편집 미리보기는 선택한 PublishedView에 대해 `va-overlay` 우선으로 열고,
  `재생/재연결/정지` 버튼으로 제어합니다. 내부 진단 JSON은 제품 화면에 직접 노출하지 않습니다.
- `/client`:
  viewer/operator/admin 접근 shell입니다.
  `/client/api/views` 기준으로 할당된 PublishedView만 표시하며
  원본 source URL, debug/developer URL은 노출하지 않습니다.
  integrator는 shell/live/dashboard UI가 아니라
  scoped events/metadata API만 접근합니다.
- `/lab/analysis/*`:
  admin/operator 또는 `lab:read` scope용 개발/검증 API입니다.
  viewer/client 기본 계정은 접근할 수 없고,
  rule/profile/vaRule 변경 API는 `rule:write` scope를 추가로 요구합니다.
  `/lab`, `/lab/rules`, `/lab/import` 화면 route는 404로 닫습니다.
- `/webrtc/test`:
  초기 브라우저 테스트 화면은 404로 닫고 제품 UI 진입점으로 사용하지 않습니다.

![운영 대시보드](assets/ui/ops-dashboard.png)

Shell navigation은 server-side principal로 1차 렌더링하고,
`/auth/whoami` 응답으로 admin-only menu를 다시 숨깁니다.
Client shell의 primary nav는 viewer용 라이브/대시보드만 유지합니다.
admin/operator가 client 화면을 열면 메뉴 아래에 `Ops로 돌아가기`를 표시하고,
viewer에게는 Ops/Lab nav와 debug/developer URL을 숨깁니다.
Guard 실패 시 browser shell route는 login 또는 forbidden page를 보여주고,
API route는 JSON `401`/`403`을 반환합니다.

Auth UI/route 회귀는 다음 명령으로 확인합니다.

- `./server.sh verify-auth-bootstrap`
- `./server.sh verify-auth-users`
- `./server.sh verify-auth-routes`

이 smoke는 `/setup`, `/login`, `/password/change`, `/invite/setup`,
`/client/request-access`의 auth shell과 핵심 form selector를 검사합니다.
route smoke에서는
unauth/viewer/readonly-operator/integrator/public access request matrix로
Ops/Client/Lab API guard를 확인합니다.

추가 확인:

- auth shell screenshot이 필요하면
  `MEDIA_SERVER_VERIFY_AUTH_VISUAL=1 MEDIA_SERVER_VERIFY_AUTH_SCREENSHOTS=1`
  을 붙입니다.
- Ops/Client selector와 client debug/source 비노출은
  `./server.sh verify-ops-client-ui`로 확인합니다.
- 실제 클릭 흐름과 채널/룰/사용자 테이블 반응형 침범 검증은
  `./server.sh verify-ops-click-e2e`,
  `./server.sh verify-ops-tables-layout`로 확인합니다.
- 화면 회귀까지 보려면
  `./server.sh verify-ops-client-ui --screenshots`를 사용합니다. 기본 screenshot 폭은
  320/390/760/1180px이며, Chrome DevTools 수동 리뷰 체크박스는
  [stream-verification.md](./stream-verification.md)에 유지합니다.

### 2.1 Live VA Event Quality

`/ops/dashboard`의 Live VA Event Quality panel은 현재 live-only 범위의
운영자용 VA 품질 확인 영역입니다.

표시 항목:

- Scenario Timeline: scenario name, rule id, track id, phase,
  phase elapsed, cooldown remaining, emitted/dedupe count
- TrackHealth issue grouping: issue type별 retained/total 요약,
  rate-limited count, 대표 track context
- Filter: scenario/rule/track/phase/issue 키워드로 timeline과
  TrackHealth grouping을 같은 입력에서 좁혀 봅니다.
- Empty/error state: active analysis tap이 없거나 state-dump/metrics를
  읽지 못할 때 운영자가 원인을 구분할 수 있는 짧은 상태

이 panel은 `/lab/analysis/taps/{tapId}/state-dump`,
`/lab/analysis/taps/{tapId}/metrics`를 operator route에서만 읽습니다.
client/viewer shell과 client API에는 source URL, raw JSON, debug counter,
`analysisTapId`, Scenario Timeline debug object를 노출하지 않습니다.
raw JSON이 필요한 경우에도 운영자 debug details 접힘 영역 또는
개발/검증 API에서만 확인합니다.

## 3. Admin User Management

`/ops/users`는 admin 전용 계정 관리 화면입니다.
공통 Ops shell 안에서 사용자 목록 table과 접근 요청 table을 먼저 보여주고,
필요한 계정을 상세 패널로 열어 확인하거나 수정합니다.
`passwordHash`, `passwordHistory`, `tokenHash`, invite `tokenHash`는
UI/API 응답에 노출하지 않습니다.

지원 동작:

- 계정 생성:
  admin이 username, displayName, role, viewId 또는 직접 scopes와
  초기 비밀번호를 입력해 사용자를 생성합니다.
  권한 템플릿 버튼으로 role/viewId 기준 scope를 적용할 수 있습니다.
  새 계정은 기본 활성화 상태이며 `mustChangePassword`를 켤 수 있습니다.
- 계정 수정: displayName, role, scopes, enabled, mustChangePassword를 변경합니다.
- 비밀번호 초기화: API/CLI smoke 경로에서 reset-password를 지원합니다. Ops UI 기본 화면은 사용자 생성/수정/활성화 관리에 집중합니다.
- enable/disable: hard delete 대신 disable을 사용합니다. 마지막 활성 admin 계정은 비활성화하거나 다른 role로 변경할 수 없습니다.
- viewer UX:
  `role=viewer` 또는 `integrator` 선택 시 view/scope assignment 영역을 보여줍니다.
  `채널 범위 적용`은 PublishedView별 scope 묶음을 생성합니다.
  PublishedView가 아직 연결되지 않은 환경에서는 `viewId` 또는
  `view:read:{viewId}` 같은 문자열 scope를 직접 입력할 수 있습니다.
  viewer에는 debug/lab/ops/source/rule 관리 scope를 부여하지 않습니다.
- invite:
  admin API/CLI가 setup invite token을 발급하면 원문 token은
  생성 응답에서 한 번만 표시됩니다.
  저장소에는 `tokenHash`, 만료 시각, 사용 여부,
  수락 시 적용할 role/scope snapshot만 남습니다.
  기존 enabled user invite는 수락 전 현재 role/scope/session을 바꾸지 않습니다.
  `/invite/setup`에서 비밀번호 설정이 끝나면 token hash와 이전 session을 폐기합니다.
- request:
  `/client/request-access` 또는 `POST /client/api/access-requests` 요청은
  `pending`으로 저장됩니다.
  `/ops/users` 접근 요청 table에서 admin이 승인하면 password setup invite를 발급합니다.
  token/setup URL은 승인 응답에서 한 번만 표시합니다.
  user row는 invite 수락 시점에 만들거나 갱신합니다.
  거절은 request 상태만 `rejected`로 바꾸며 user/session/view scope를 만들지 않습니다.
- audit:
  `/ops/sources`, `/ops/rules`, `/ops/users` 변경은 서버 감사 로그
  `/ops/api/audit`, `.media_server.ops_audit.jsonl`에 영속 저장합니다.
  하단 변경 이력 패널에도 표시합니다.
  작업자 정보는 `/auth/whoami`/서버 principal 기준입니다.
  비밀번호/token/hash/capability 필드는 전/후 값에서 마스킹합니다.
  서버 저장에 실패하면 브라우저 캐시 기록으로 후퇴합니다.
  변경 이력 패널은 검색, 작업자/사용자/대상/action/기간 필터,
  offset 기반 이전/다음 페이지, JSON/CSV export, Diff JSON export,
  전/후 diff 상세 모달을 공통으로 제공합니다.
  채널/사용자 변경 이력 필터는 작은 화면에서 table/action 영역을
  침범하지 않는 별도 responsive contract입니다. 320/390px 기준으로
  시작/종료 input은 `min-width: 0` 흐름 안에서 한 줄 또는 다음 줄로
  내려가야 하며, 필터 grid가 viewport보다 넓은 고정폭을 만들면
  regression으로 봅니다.
  서버는 `MEDIA_SERVER_OPS_AUDIT_RETENTION_DAYS` 기준으로 오래된
  `.media_server.ops_audit.jsonl` 항목을 조회/저장 시 정리합니다.
  응답에는 case-insensitive search index metadata, `receivedAtMs` date range field,
  interactive limit cap, `exportLimitMax`가 포함됩니다.

Role별 scope template:

- `admin`: `*`
- `operator`: `ops:read`, `rule:write`, `source:write`, `dashboard:read:*`, `event:read:*`
- `viewer`: `view:read:{viewId}`, `dashboard:read:{viewId}`,
  `event:read:{viewId}`, `metadata:read:{viewId}`.
  viewId가 비어 있으면 실제 view 권한을 주지 않는
  `__unassigned__` placeholder scope를 사용합니다.
- `integrator`: `metadata:read:{viewId}`, `event:read:{viewId}`. UI shell은 열지 않고 scoped API만 사용합니다.

CLI도 같은 C++ password hash/password policy 경로를 사용합니다.
Password는 기본적으로 prompt로 입력하고, 자동 smoke에서는 `--password-stdin`을 사용할 수 있습니다.

```bash
./server.sh auth-user list
./server.sh auth-user add --username client-a --role viewer --view-id 1
./server.sh auth-user reset-password --username client-a
./server.sh auth-user disable --username client-a
```

## 4. SourceRegistry / PublishedView

`/ops/sources`는 운영자가 실제 source를 등록하고,
클라이언트에는 PublishedView 단위로 공개하기 위한 운영 화면입니다.
제품 UI에서는 SourceRegistry/PublishedView를 따로 노출하지 않고
`채널` 개념으로 묶어 보여줍니다.

화면 구성:

- 숫자 ID 기반 채널 목록:
  저장 상태와 PublishedView 연결 상태를 함께 표시합니다.
- 채널 추가/상세 패널:
  입력 형식은 추가 또는 수정 화면 안에서만 선택합니다.

채널 액션:

- 목록 상단: `채널 추가`
- 행 액션: `상세`, `라이브 보기`, `삭제`
- 상세 패널 읽기 상태: `수정`, `닫기`
- 상세 패널 편집 상태: `저장`, `닫기`

기본 registry가 비어 있으면 `sample_h264.mp4`,
VA test file, 검증된 공개 RTSP/HLS URL을 숫자 채널로 seed합니다.
기존 registry 파일에 malformed record나 깨진 PublishedView source 참조가 있으면
운영 화면/API는 조용히 누락하거나 seed로 덮지 않고 오류를 반환합니다.

추가/수정 화면의 입력 종류 차이:

- `kind=whep`, `whepUrl`:
  외부 WHEP playback endpoint를 서버 pull source로 등록
- `kind=webrtc`, `webrtcSourceId`:
  외부 URL이 아니라 `/whip/publish`로 먼저 등록된 sourceId를 연결

채널 테이블은 라이브 URL과 VA URL을 분리해 표시하고,
각 영역에서 RTSP/WHEP 복사 버튼을 제공합니다.
브라우저 재생은 `/client/live`에서 확인합니다.
운영자용 registry 원문은 제품 화면에 노출하지 않고 `/ops/api/sources`, `/ops/api/views` 같은 API 응답과 검증 명령에서 확인합니다.

### 4.1 Client scoped dashboard

`/client/dashboard`는 viewer가 접근 가능한 PublishedView의 상태 요약만
보여주는 client dashboard입니다.
view 목록은 `/client/api/views`의 scoped 결과를 사용하고,
선택된 view의 상세 상태와 접근 가능한 view들의 비교 요약은
`/client/api/views/{viewId}/dashboard`에서 가져옵니다. 화면은 현장 상태,
영상 신호, 데이터 지연, 이벤트 확인 필요 여부를 viewer 문구로 표시합니다.

![클라이언트 대시보드](assets/ui/client-dashboard.png)

채널 비교는 전체/확인 필요/이벤트 있음/라이브 필터와
경고 우선/이벤트 많은 순/이름순 정렬을 제공하며,
각 카드에 source tag, owner group, 채널명, 최근 event type에서 추론한
현장 preset 문구와 우선순위 점수를 함께 표시합니다.
Preset 설정에서는 운영자가 장소 타입, 이벤트 유형, 태그 매칭 term,
우선순위 weight를 JSON으로 조정할 수 있고, 사용자 설정은 브라우저
localStorage의 `mediaServerClientDashboardPresetConfig.v1`에 저장되어
기본 preset보다 먼저 적용됩니다.
`/client/events`는 primary nav에서 제거했고,
이벤트 요약은 dashboard 안에서 sanitized summary로만 표시합니다.
Integrator 연동은
`/client/api/views/{viewId}/events?limit=...`,
`/client/api/views/{viewId}/metadata`를 사용하며
각각 `event:read:{viewId}`, `metadata:read:{viewId}`가 필요합니다.

표시 범위:

- view health: view name, live/offline, connection status, video frame status, metadata status, stale 여부
- analysis summary: track count, active event count, scenario count, latest event time
- event summary: 최근 event, event type별 count, warning badge
- connection: WebRTC connected/disconnected, stale metadata age, last frame age

값이 없거나 아직 수집되지 않은 항목은 UI에서 `미제공`으로 표시합니다.
Client dashboard,
`/client/api/views/{viewId}/events?limit=...`,
`/client/api/views/{viewId}/metadata`는
source 원본 URL, Developer URL, 내부 진단 응답,
`analysisTapId`, internal session id, rule/profile editor,
Event POST 설정, SSE/WS 전체 endpoint를 노출하지 않습니다.
운영자용 세부 runtime/debug 확인은
`/ops/dashboard` 요약과 `/lab/runtime/status` API에서 수행합니다.

### 4.2 Client Live Monitor

`/client/live`는 viewer가 접근 가능한 PublishedView만
live monitor grid에 배치합니다.
Tile은 viewer 기본 최대 4개, Ops preview 최대 9개이며,
표준/고밀도 density와 live/connecting/stale/offline summary,
타일별 재연결/전체 재연결 control을 제공합니다.

각 PublishedView의 `maxTiles`는
UI의 채널 배정/시작 버튼과
`/client/api/views/{viewId}/webrtc/session` wrapper에서
같은 principal+view의 동시 client session 상한으로 강제합니다.
Browser PeerConnection은 `/webrtc/config`의 `peerConnectionConfig`를 사용합니다.
생성 응답은 client session alias만 반환하고,
answer/ICE/delete는
`/client/api/views/{viewId}/webrtc/session/{clientSessionId}` 아래에서만 이어집니다.

Client route는 viewId만 받습니다.
source 원본 URL, file/url/source override,
내부 generic session id/token, Developer URL, BBox diagnostics,
내부 진단 응답, rule/profile 수정 UI는 노출하지 않습니다.
`va-rule` mode는 PublishedView의 `allowedRuleIds`와
rule source 일치 검증을 모두 통과해야 합니다.
viewer/client 계정은 직접 `/webrtc/session`, `/whep`, `/whip/publish`
생성 route를 호출할 수 없습니다.

Tile별 기능:

- assigned view 선택
- PublishedView의 `allowedOverlayModes` 안에서 `raw`, `va-overlay`, `va-rule` 선택
- tile start / tile stop / all stop
- PublishedView `maxTiles` 초과 시 tile 선택/시작을 막고 wrapper API는 `409`를 반환
- live/offline, stale, track count, event count, connection status 표시
- 선택된 tile만 dashboard/detail을 갱신

Hidden tab, route leave, tile stop 시
PeerConnection, DataChannel, server WebRTC session을 정리합니다.
모든 tile에 BBox diagnostics를 켜는 동작은 제공하지 않습니다.

## 5. 룰 관리 목록

이 장부터는 `/ops/rules` 기준 설명입니다.

룰 관리는 세 가지 목록을 같은 운영 화면에서 관리합니다.

- 채널 분석 설정: 실제 채널에 적용되는 `vaRule`
- 이벤트 템플릿: 채널 분석 설정을 만들기 위한 선수 항목
- 분석 프로파일: 채널 분석 설정을 만들기 위한 선수 항목

`vaRule`은 숫자 ID이며, 사용자가 직접 ID를 입력하지 않습니다.

목록에서 확인하는 정보:

- 채널 분석 설정 수
- 이벤트 템플릿 수
- 분석 프로파일 수
- 다음 자동 번호
- 각 항목의 ID, 적용 채널/종류/프로파일, 영역/라인, 출력 URL, 상태

주요 동작:

- 이벤트 템플릿 추가: 기본 이벤트 또는 시나리오 종류와 판단 조건을 저장합니다.
- 분석 프로파일 추가: detector, fps, queue, 입력 해상도 같은 분석 실행 값을 저장합니다.
- 채널 분석 설정 추가: 채널, 이벤트 템플릿, 분석 프로파일을 고르고 영역/라인을 지정합니다.
- 상세/수정/삭제: 각 행의 작업 버튼에서만 제공합니다.
- 적용 상태: 채널 분석 설정에만 존재하며 이벤트 템플릿과 분석 프로파일에는 활성/비활성이 없습니다.

목록은 다중 선택 기반 toolbar를 사용하지 않습니다.
보기/수정/삭제는 각 행의 작업 버튼에만 노출합니다.
필터 결과 수는 요약 배지로 작게 표시합니다.

사용자가 rule number를 직접 입력하지 않습니다. 서버/UI가 빈 숫자 ID를 자동 배정하고, URL에서는 `vaRule=<숫자>`만 사용합니다.

## 6. 채널 분석 설정 흐름

채널 분석 설정 추가 또는 수정 시 같은 페이지 안의 편집 panel을 사용합니다.
저장 완료 후에는 상세 상태로 돌아가는 흐름을 기본으로 합니다.

편집 화면은 5개 섹션입니다.

| 섹션 | 설명 |
| --- | --- |
| 기본 정보 | 이름, 적용 상태 |
| 채널/템플릿/Profile | 채널, 이벤트 템플릿, 분석 프로파일 선택 |
| 채널 미리보기와 영역/라인 | 선택 채널 영상 위에 polygon/line 지정 |
| 출력 | 테이블에서 RTSP/WHEP 라이브와 VA URL 복사 |
| 저장 전 검토 | 현재 설정 요약과 validation 결과 |

편집 화면 상단의 룰 이름, 저장 상태, 저장/목록 버튼,
섹션 이동 영역은 스크롤 중에도 따라다닙니다.
일반 폭에서는 섹션 이동을 버튼 탭으로 표시합니다.
버튼 텍스트를 읽기 어려운 매우 좁은 폭에서는 드롭다운으로 전환합니다.

저장하지 않은 변경사항이 있더라도 탭 이동은 막지 않습니다.
채널/사용자 탭과 동일하게 편집 panel은 닫기 동작으로 정리됩니다.
저장/삭제 성공 또는 실패는 feedback으로 표시됩니다.

저장 전 검증은 다음 항목을 차단합니다.

- 중복 ID
- 누락/비활성 이벤트 템플릿/Profile
- source mismatch
- 비활성 채널/PublishedView 연결
- Client 노출 권한이 없는 PublishedView
- `va-rule` 모드가 허용되지 않은 PublishedView
- 허용 룰 목록에 없는 기존 연결
- 같은 채널/priority의 룰 충돌
- 이벤트 템플릿과 룰/Profile 대상 클래스 충돌

PublishedView가 raw/overlay 전용이면 채널 탭에서
보기 방식과 허용 룰 목록을 먼저 정리한 뒤 룰을 저장합니다.

Rule validation matrix는 inactive profile/template, priority conflict,
unauthorized view, VA class mismatch, source mismatch를 fixture 기준으로 고정합니다.
UI 저장 전 차단과 서버 저장 API 차단 메시지가 따로 흔들리지 않도록
`verify-ops-rule-validation-matrix`에서 검증합니다.

## 7. 분석 Profile

룰 편집 화면의 profile 흐름:

- 먼저 profile 선택과 요약을 보여줍니다.
- 새 profile이 필요할 때만 `새 Profile 설정`을 시작합니다.
- 세부 설정은 `고급 Profile 설정` 접힘 영역에서 다룹니다.
- 룰 작성 흐름에서는 `Profile 저장`과 `닫기`만 노출합니다.
- 기존 profile 삭제 같은 관리 동작은 기본 작성 흐름에 노출하지 않습니다.

Profile 항목:

- Detector: `YOLO/ONNX` 또는 `개발용 더미(검증용)`
- FPS: 분석 sampling FPS
- Queue: detector 앞 queue 크기
- Confidence: detection confidence threshold
- NMS: non-maximum suppression threshold
- Input size: model input width/height
- Tracking category: track ID와 event 판단에 사용할 category

`YOLO/ONNX`는 실제 객체 검출입니다.
`개발용 더미`는 모델 없이 pipeline과 UI를 확인하기 위한 검증용 옵션입니다.
운영 설정에는 보통 사용하지 않습니다.

Tracking category가 비어 있으면 profile 저장을 막습니다. 전체 추적이 필요하면 UI의 전체 선택 또는 API의 `*` 토큰을 사용합니다.

## 8. 기본 이벤트

기본 이벤트는 기존 rule event engine을 사용하며, 외부 event JSON/API/POST 형식을 유지합니다.

지원 이벤트:

| 이벤트 | 의미 |
| --- | --- |
| `presence` | 영역 안에 대상 객체가 감지됨 |
| `enter` | 대상 객체가 영역 밖에서 안으로 진입 |
| `exit` | 대상 객체가 영역 안에서 밖으로 이탈 |
| `line-crossing` | 대상 객체가 line을 통과 |

`line-crossing`은 방향을 선택할 수 있습니다.

- `any`: 양방향
- `forward`: 선분 시작점에서 끝점으로 향하는 기준의 정방향
- `reverse`: 반대 방향

라인 모드에서는 영역/라인 캔버스의 선 중앙에
현재 설정 방향을 나타내는 작은 화살표를 표시합니다.
`any`는 양방향, `forward`/`reverse`는 선택한 한 방향만 표시합니다.

## 9. 시나리오 이벤트

Scenario는 여러 frame에 걸친 시간 조건과 상태 전이를 판단하는 이벤트입니다.
기존 기본 이벤트를 끄거나 바꾸지 않고 별도 scenario event로 동작합니다.

현재 상태:

| 시나리오 | 엔진/검증 상태 | UI 템플릿 상태 |
| --- | --- | --- |
| Intrusion Dwell | 구현됨 | 룰 편집 UI에서 선택 가능 |
| ReEntry | 구현됨 | 룰 편집 UI에서 선택 가능 |
| WrongDirection | 구현됨 | 룰 편집 UI에서 선택 가능 |
| IntrusionAfterLineCrossing | 구현됨 | 룰 편집 UI에서 선택 가능 |
| Loitering | 구현됨 | 룰 편집 UI에서 선택 가능 |
| ZoneOccupancyScenario | 구현됨 | 룰 편집 UI에서 선택 가능, 대기열/로비/승강장/출입구/승강기 홀 tuning preset 제공 |

현재 UI가 제공하는 시나리오 템플릿:

| 템플릿 | 설정 항목 | event |
| --- | --- | --- |
| Intrusion Dwell · 제한구역 체류 | zone, 후보 시간, 체류 시간, cooldown | scenario event |
| ReEntry · 이탈 후 재진입 | polygon zone, 재진입 window, 재진입 zone, cooldown | `re-entry` |
| WrongDirection · 금지 방향 통과 | line 2점 geometry, 허용 방향, cooldown | `wrong-direction` |
| IntrusionAfterLineCrossing · line 후 zone 침입 | trigger line, crossing direction, target zone, zone entry timeout, dwell, cooldown | `intrusion-after-line-crossing` |
| Loitering · 배회 감지 | target zone, 현장 프리셋, minimum dwell, movement radius, trajectory points, cooldown | `loitering` |
| Zone Occupancy · 구역 점유 수 | target zone, occupancy threshold, minimum dwell, cooldown | `zone-occupancy` |

ReEntry UI 정책:

- 같은 track이 polygon zone을 이탈한 뒤 `reEntryWindowMs` 안에 같은 zone으로 다시 들어오면 `re-entry` scenario event를 1회 발생시킵니다.
- `같은 zone`은 현재 그린 polygon 또는 `targetZoneIds`로 저장된 zone을 그대로 사용합니다.
- `지정 zone`은 `targetZoneIds`/`reEntryZoneIds`에 대상 zone 목록을 명시합니다.
  현재 1차 UI는 같은-zone 재진입을 명시하는 용도입니다.
  cross-zone A→B 재진입 판단은 후속 ScenarioEngine 확장 범위입니다.
- Event POST payload schema, WebRTC/SSE/WS metadata schema, ScenarioEngine 판단 로직은 변경하지 않습니다.

WrongDirection UI 정책:

- 허용 방향은 `forward` 또는 `reverse`를 사용합니다.
- `any`는 위반 방향을 정의할 수 없으므로 WrongDirection 템플릿에서 사용하지 않습니다.
- 기존 `line-crossing` 기본 이벤트는 유지합니다.
- WrongDirection은 별도 `wrong-direction` scenario event로 발생합니다.
- Event POST payload schema, WebRTC/SSE/WS metadata schema, ScenarioEngine 판단 로직은 변경하지 않습니다.

IntrusionAfterLineCrossing UI 정책:

- 기존 `line-crossing` 기본 이벤트와 별도 `intrusion-after-line-crossing` scenario event로 발생합니다.
- target zone은 영역/라인 캔버스의 polygon으로 저장하고, trigger line은 전용 설정 영역의 line id/direction/정규화 좌표로 저장합니다.
- `any`, `forward`, `reverse` crossing direction을 모두 사용할 수 있습니다. `any`는 WrongDirection과 달리 정상 trigger 방향입니다.
- UI의 `zoneEntryTimeout(ms)`는 저장 payload의 `maxDelayAfterCrossingMs`로 runtime에 전달합니다.
- Event POST payload schema, WebRTC/SSE/WS metadata schema, ScenarioEngine 판단 로직은 변경하지 않습니다.

Loitering UI 정책:

- target zone은 영역/라인 캔버스의 polygon으로 저장하고, zone 이름은 `targetZoneIds`에 저장합니다.
- `최소 체류 시간(ms)`은 저장 payload의 `minDwellTimeMs`로 runtime에 전달합니다.
- `최대 이동 반경`과 `최소 trajectory point`는 각각 `maxMovementRadius`, `minTrajectoryPoints`로 저장합니다.
- optional ground-plane 이동 반경 사용 여부는 `useGroundPlaneMovementRadius`로 저장합니다.
- 현장 시작 threshold는
  [Analysis Threshold Baselines](analysis-threshold-baselines.md)의
  retail/lobby/platform/doorway/parking 기준값에서 고릅니다.
  preset은 dwell/radius/trajectory뿐 아니라 cooldown 시작값도 함께 채웁니다.
- Event POST payload schema, WebRTC/SSE/WS metadata schema, ScenarioEngine 판단 로직은 변경하지 않습니다.

Intrusion Dwell UI 항목:

- 후보 판단 시간(ms)
- 체류 확정 시간(ms)
- 재알림 대기 시간(ms)
- 제한구역 이름
- 대상 객체
- 불안정 track 제외
- 상태 흐름 미리보기

ReEntry UI 항목:

- 재진입 window(ms)
- 재알림 대기 시간(ms)
- 재진입 zone: 같은 zone 또는 지정 zone
- 대상 객체
- 불안정 track 제외
- Inside → Exited → ReEntryCandidate → Confirmed → Cooldown → Ended 상태 흐름 미리보기

IntrusionAfterLineCrossing UI 항목:

- trigger line 이름과 x1/y1 → x2/y2 좌표
- crossing direction: any, forward, reverse
- target zone polygon과 zone 이름
- zoneEntryTimeout(ms) / dwell 또는 observe time(ms)
- 재알림 대기 시간(ms)
- 대상 객체와 불안정 track 제외
- Idle → LineCrossed → ZoneEntered → Observing → Confirmed → Cooldown → Ended 상태 흐름 미리보기

Loitering UI 항목:

- target zone polygon과 zone 이름
- 최소 체류 시간(ms)
- 최대 이동 반경
- 최소 trajectory point
- ground-plane 이동 반경 사용 여부
- 재알림 대기 시간(ms)
- 대상 객체와 불안정 track 제외
- Idle → InsideZone → TrajectoryStable → DwellSatisfied → Confirmed → Cooldown → Ended 상태 흐름 미리보기

실제 scenario engine 활성화와 기본값은 서버 설정과 함께 동작합니다. 환경변수는 [config-reference.md](./config-reference.md)를 봅니다.
ZoneOccupancy 현장 시작 threshold도 [Analysis Threshold Baselines](analysis-threshold-baselines.md)에 정리되어 있습니다.

## 10. 영역/라인 캔버스

영역/라인 설정 섹션에서 영상 프레임을 보면서 polygon 또는 line을 지정합니다.

캔버스 규칙:

- polygon은 최소 3점이 필요합니다.
- line-crossing은 2점짜리 line이 필요합니다.
- 최대 polygon 점 수는 현재 UI 기준 12개입니다.
- 기존 점 근처를 드래그하면 새 점을 만들지 않고 점 위치를 이동합니다.
- 마지막 점 삭제, 전체 영역 초기화, 되돌리기 버튼을 제공합니다.
- 점 번호는 캔버스 안에 표시됩니다.
- 좌표 목록은 접힘 영역에서 확인합니다.
- 저장 전 검토에 영역 저장 가능 여부가 반영됩니다.
- 저장 가능 여부는 `저장 가능: polygon 4개 점`, `저장 불가: line은 점 2개 필요`처럼 현재 geometry 조건을 직접 설명합니다.

좌표는 기존 payload 구조와 같이 normalized 0~1 비율로 저장됩니다. 캔버스 크기가 바뀌어도 저장 좌표 비율은 유지됩니다.

## 11. 이벤트 발생 시 동작

이벤트 동작 섹션에서 event 발생 시 후처리를 정합니다.

지원 UI:

- overlay blink: 이벤트 객체를 overlay에서 깜빡임으로 강조
- 깜빡임 시간(ms)
- POST URL
- payload preview 접힘 영역

POST URL은 형식 검증을 거칩니다. 실제 외부 전송은 서버가 `MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED=1`로 실행된 경우에만 수행됩니다.

EventRecord/snapshot/clip hook:

- EventRecord 저장은 서버 설정으로 켜는 기능이며, 룰 편집 UI의 기본 입력 항목은 아닙니다.
- snapshot/clip hook은 이벤트 시점 snapshot media와 짧은 pre/post frame bundle manifest를 EventRecord의 `snapshotPath`/`clipPath`에 연결합니다.
- clip bundle은 운영 evidence용 frame 묶음이며 장기 녹화/MP4 플레이어 기능은 아닙니다.
- 상태 확인은 `/lab/analysis/event-storage/status` API와 관련 metrics를 사용합니다.

## 12. 미리보기와 메타데이터 확인

운영 화면에서는 `/ops/rules`의 채널 미리보기와 `/client/live`로 설정을 확인합니다.
개발/검증용 metadata 확인은 `/lab/analysis/*` API와 전용 검증 명령으로 수행합니다.

보기 모드:

| 모드 | 설명 |
| --- | --- |
| 실시간 스트리밍 | 선택한 영상의 원본 프레임만 확인 |
| 영상 + VA 오버레이 | 선택한 영상에 기본 `va=1` 객체 검출 overlay 적용 |
| 영상 + VA 룰 | 저장된 `vaRule` ID를 선택하고, 해당 룰에 묶인 source/profile/rule을 사용 |
| WebRTC 메타데이터 | WebRTC simple signaling 영상과 `vaMetadata=1` DataChannel 수신 JSON을 확인 |

`영상 + VA 룰` 모드에서는 source를 따로 선택하지 않습니다. 선택한 rule ID에 저장된 source가 자동으로 고정됩니다.

영상 영역 아래에는 두 줄의 보조 정보를 표시합니다.

| Row | 내용 | 표시 정책 |
| --- | --- | --- |
| compact status row | 재생/연결 상태 | 짧은 상태 문구 중심 |
| 영상 spec row | source, codec, resolution, fps | 고정 값과 갱신 값을 분리 |

source/codec은 왼쪽 그룹에 둡니다.
재생 중 갱신될 수 있는 resolution/fps는 오른쪽 그룹에 둡니다.
FPS는 반올림한 정수만 표시합니다.
일시적으로 새 값이 없을 때는 마지막 유효 FPS를 유지합니다.

`WebRTC 메타데이터` 모드는 WebRTC video와 `vaMetadata=1` DataChannel을 함께 점검하는 화면입니다.

한눈에 보는 구성:

| 영역 | 확인하는 것 | 해석 |
| --- | --- | --- |
| DataChannel 상태 | `va-metadata` 연결과 수신 상태 | metadata 경로가 열렸는지 확인 |
| Latest JSON | 마지막 metadata payload | schema, track/event/scenario count 확인 |
| Client overlay | 브라우저 canvas bbox/label | WebRTC 전용 client-side overlay 확인 |
| BBox 진단 | DataChannel, detector, tracker bbox 비교 | 좌표 문제와 tracker ID 문제를 분리 |
| 상태 패널 | buffer/drop/frame matching/stale 값 | 수신과 실제 draw가 분리되어 동작하는지 확인 |

DataChannel 상태:

| 상태 | 의미 |
| --- | --- |
| `비활성` | metadata channel을 요청하지 않음 |
| `연결 중` | WebRTC session 또는 channel 연결 대기 |
| `열림` | channel은 열렸지만 아직 metadata 수신 전 |
| `수신 중` | metadata JSON을 정상 수신 중 |
| `지연` | 수신 age가 커져 overlay stale 가능성이 있음 |
| `닫힘` | session 종료 또는 channel close |
| `오류` | channel 생성, 수신, JSON parse 중 오류 |

영상 재생과 metadata channel은 별도 상태로 봅니다.
DataChannel이 열리지 않거나 JSON parse에 실패해도
video track 재생 자체가 곧바로 실패로 전파되면 안 됩니다.

Overlay 정책:

| 항목 | 정책 |
| --- | --- |
| 적용 범위 | WebRTC browser viewer 전용. RTSP 일반 viewer에는 적용되지 않음 |
| 영상 입력 | 서버가 bbox를 합성하지 않은 원본 video track |
| 그리기 방식 | 브라우저 canvas가 현재 관측 중인 track만 그림 |
| 표시 옵션 | 박스, 라벨, Track ID, 시나리오, 이벤트 highlight, TrackHealth, 현재 Zone, 체류 시간 |
| stale 처리 | metadata가 일정 시간 갱신되지 않으면 stale 표시와 흐린 overlay 적용 |
| video stall | video frame callback이 멈추면 DataChannel이 열려 있어도 overlay를 갱신하지 않음 |

Frame sync 정책:

| 상황 | 동작 |
| --- | --- |
| metadata 수신 | 즉시 그리지 않고 현재 video frame에 가장 가까운 metadata를 선택 |
| frame에 맞는 metadata 없음 | `프레임 매칭 실패`로 분리 표시 |
| 짧은 mismatch | grace window 동안 마지막 overlay를 유지해 깜빡임 완화 |
| `fallback-latest` payload | 기본 overlay에서는 `missing`으로 처리 |
| fallback 확인 필요 | `fallback metadata 표시(opt-in)`을 켜서 별도 확인 |
| 파일 loop timestamp 되감김 | overlay buffer와 PTS 보정을 초기화 |
| 파일 loop 경계 | tap의 tracker/track-state도 새 playback cycle로 정리 |

`fallback-latest`를 기본 표시하지 않는 이유는 오래된 bbox가 새 loop의 실제 객체와 다른 위치에 그려지는 일을 막기 위해서입니다.

`BBox 진단 갱신`은 자동 polling 없이 한 번만 조회합니다.

- 기존 tap을 찾은 뒤 `/lab/analysis/taps/<tapId>/bbox-diagnostics?ptsMs=...`를 호출합니다.
- WebRTC DataChannel track bbox와 near-PTS detector/tracker bbox를 비교합니다.
- `Detector 원본 bbox`를 켜면 tracker smoothing 전 box를 점선으로 겹쳐 봅니다.

진단 table 읽는 법:

| 열 | 의미 |
| --- | --- |
| `DC selected` | DataChannel overlay가 선택한 bbox |
| `detector raw` | detector 원본 bbox |
| `track` | tracker 보정 bbox |
| `det↔DC`, `track↔DC` | IoU와 center distance 비교 |
| `continuity` | center jump와 같은 class 근접 후보 확인 |
| `TrackHealth` | association confidence, overlapRisk, missed/lost/reacquired 확인 |
| `close-object guard` | 가까운 같은 class 객체 구간의 association 진단 |

`close-object guard` 해석:

| 값 | 해석 |
| --- | --- |
| `guard off` | 기본 정책. 기존 tracking 동작 유지 |
| `diagnostic-only` | score 변경 없이 후보 진단만 수집 |
| `enforce` | 실험적 opt-in score 보정 skeleton 적용 가능 |
| `closeObjectGuardApplied=false` | `enforce`여도 해당 row ranking score는 보정되지 않음 |
| `미제공` | direct tap/source tap 또는 실제 tracker 진단 없음 |

진단값은 다음 항목을 포함할 수 있습니다.

- `closeObjectRisk`
- `nearestSameClassTrackId`
- best/second score
- `scoreMargin`
- `centerJump`
- direction conflict
- would-penalize/hold-reacquire
- `guardMode`
- `guardDecision`

default on 전환은 보류 상태입니다.

문제 판단 팁:

| 증상 | 먼저 볼 후보 |
| --- | --- |
| overlay가 초 단위로 늦게 따라옴 | metadata selector 또는 PTS sync |
| bbox는 맞는데 ID만 흔들림 | tracker association 또는 ID continuity |
| `det↔DC`, `track↔DC`가 높음 | 좌표 변환보다 tracker continuity 쪽 |
| `detector raw`부터 어긋남 | detector 후처리, model box format, coordinate transform |
| DataChannel은 수신 중인데 화면이 멈춤 | video frame callback stall 또는 stale clear |

상태 패널에서는 다음 값을 함께 봅니다.

- `Metadata 수신`
- `Metadata buffer`
- `Metadata drop`
- `프레임 매칭 실패`
- `표시 video frame`
- `Overlay draw`
- `마지막 video frame`
- `마지막 metadata`
- `영상 멈춤`

WebRTC 메타데이터 확인 순서:

1. `/ops/rules`에서 저장된 채널 분석 설정을 확인합니다.
2. `/client/live`에서 `va-rule` 모드로 영상을 엽니다.
3. 개발 검증은 `./server.sh verify-webrtc-va-metadata --http-base ...`로 `vaMetadata=1` DataChannel 수신을 확인합니다.
4. 필요하면 `/lab/analysis/taps/{tapId}/metadata/stream` 또는 `/lab/analysis/metadata/stream?vaRule=<id>` SSE API를 사용합니다.
5. `보기 중지`를 누르면 WebRTC session과 metadata channel이 닫히고 overlay canvas가 정리됩니다.

연결 상태:

- 대기
- 연결 중
- 재생 중
- 중지됨
- 오류

요청 URL은 일반 화면에 크게 노출하지 않고 개발/검증용 접힘 영역에 둡니다.
이 패널은 일반 사용자 문서의 핵심 제품 화면으로 취급하지 않습니다.
custom client 점검이 필요한 경우에만 별도로 확인합니다.

URL 규칙:

- 실시간 스트리밍: source query만 사용
- 영상 + VA 오버레이: `va=1` 추가
- 영상 + VA 룰: `vaRule=<숫자>`만 사용
- WebRTC 메타데이터: WebRTC simple signaling URL에 `vaMetadata=1`을 명시적으로 추가
- `vaRule` 요청에는 `file/url/source` override를 함께 쓰지 않음

출력 방식 정책:

| 출력 방식 | 용도 | 주의 |
| --- | --- | --- |
| WebRTC 메타데이터 뷰어 | WebRTC video와 DataChannel metadata를 브라우저가 받아 client-side overlay 표시 | RTSP client에서는 동작하지 않음 |
| RTSP 서버 오버레이 | VLC/ffplay/IINA 같은 일반 RTSP client에서 VA overlay 영상 확인 | 서버가 영상 위에 직접 bbox/label을 그린 결과 |
| RTSP 원본 스트림 | overlay 없는 원본 RTSP 출력 | metadata UI 없음 |
| 커스텀 메타데이터 사이드채널 | custom client가 RTSP video와 SSE metadata stream을 함께 처리 | VLC/ffplay는 side-channel metadata를 표시하지 못함 |

개발자 요청 URL 패널은 두 그룹으로 나뉩니다.

- 일반 확인용: WebRTC metadata viewer, RTSP server overlay처럼 브라우저 또는 일반 RTSP viewer에서 바로 확인하는 URL
- Custom client용: RTSP raw stream, SSE metadata stream, WS metadata stream처럼 custom client가 영상과 metadata를 직접 조합할 때 쓰는 URL

Custom client 영역은 custom client가 같이 사용해야 하는 값을 한 번에 보여줍니다.

- RTSP 원본 스트림: custom client가 재생할 overlay 없는 영상
- SSE 메타데이터 스트림: 같은 source 또는 `vaRule`에 대한 runtime metadata JSON
- RTSP 서버 오버레이: 일반 RTSP viewer에서 바로 확인할 때 쓰는 대체 URL

현재 Lab에서 바로 복사 가능한 custom side-channel URL은 SSE endpoint입니다.

- 기존 active tap: `/lab/analysis/taps/{tapId}/metadata/stream`
- rule 기반 임시 tap: `/lab/analysis/metadata/stream?vaRule=<id>`

Side-channel endpoint 구분:

| Endpoint | 주 용도 | 비고 |
| --- | --- | --- |
| SSE metadata | Lab URL 패널에서 기본 표시 | custom client/dashboard 연동 |
| WebSocket metadata | 직접 URL로 사용 | `/ws/va-metadata?tapId=<id>` 또는 `?vaRule=<id>` |
| 일반 RTSP viewer | side-channel 미지원 | VLC/ffplay/IINA가 자동 overlay하지 않음 |

`/ws/va-metadata`는 `/lab` prefix가 없지만 Lab/custom-client 권한 경계를 따릅니다.
Auth on에서는 admin/operator 또는 `lab:read` scope가 필요합니다.
viewer/client 제품 계정은 `/client` wrapper와 WebRTC DataChannel 흐름을 사용합니다.

SSE/WS side-channel은 구독 query로 payload 범위를 줄일 수 있습니다.

- 필터:
  `eventType`, `scenarioName`, `trackId`, `zoneId`, `lineId`,
  `classId`, `className`, `ruleId`, `status`
- 목록 구분:
  쉼표 또는 세미콜론
- 큰 진단 필드 제외:
  `includeSource=0`, `includeScenarios=0`, `includeMetrics=0`,
  `includeTrackingIssueReport=0`
- WebRTC metadata viewer:
  같은 filter query를 전달해 DataChannel `tracks`/`events` 범위를 줄입니다.
- WebSocket client:
  연결 후 `subscribe`/`unsubscribe`/`resume`/`status`/`reset`
  text command로 filter를 재설정하거나 현재 구독 상태를 확인합니다.

SSE 수신만 확인하는 최소 custom client 예제는 `scripts/examples/va_metadata_sse_client.py`입니다.

| 확인 항목 | 설명 |
| --- | --- |
| metadata event | `event: metadata` 수신 |
| schema | `media-server.va.runtime-metadata.v1` 확인 |
| context | `streamId/channelId` 출력 |
| count | `tracks/events/scenarios` count 출력 |
| freshness | latest timestamp와 message count 출력 |
| 제외 범위 | RTSP player와 overlay renderer는 포함하지 않음 |

```bash
python3 scripts/examples/va_metadata_sse_client.py \
  --url 'http://127.0.0.1:8080/lab/analysis/metadata/stream?vaRule=1&intervalMs=500&maxMessageBytes=65536' \
  --max-messages 5 \
  --timeout-seconds 15
```

payload 본문까지 확인하려면 `--print-json`을 추가합니다. RTSP 영상은 별도 player로 확인합니다.

```bash
ffplay -rtsp_transport tcp 'rtsp://127.0.0.1:8554/dhseo?file=sample_h264.mp4'
```

RTSP 원본 스트림과 SSE metadata를 직접 조합하려면 optional OpenCV 예제 `scripts/examples/va_rtsp_sse_overlay_client.py`를 사용합니다.

| 입력 | 역할 |
| --- | --- |
| `--rtsp-url` | 서버 실행 출력 또는 `./server.sh urls`의 RTSP 주소 |
| `--metadata-url` | `/lab/analysis/metadata/stream` SSE 주소 |
| OpenCV window/headless | bbox, trackId, className client-side draw 또는 smoke 확인 |

```bash
python3 scripts/examples/va_rtsp_sse_overlay_client.py \
  --rtsp-url 'rtsp://127.0.0.1:8554/dhseo?file=sample_h264.mp4' \
  --metadata-url 'http://127.0.0.1:8080/lab/analysis/metadata/stream?file=sample_h264.mp4&va=1&intervalMs=500&maxMessageBytes=65536' \
  --max-seconds 15 \
  --headless
```

RTSP overlay 방식 차이:

| 방식 | 일반 RTSP viewer 표시 | 설명 |
| --- | --- | --- |
| RTSP 서버 오버레이 | 가능 | 서버가 bbox/label을 영상에 합성 |
| Custom client overlay | 불가 | client가 RTSP raw frame과 SSE JSON을 직접 조합 |

OpenCV dependency는 예제 실행 전 다음 명령으로 확인합니다.

```bash
python3 -c "import cv2; print(cv2.__version__)"
```

로컬 서버가 `8081/8555`처럼 보정 포트로 떠 있으면
`./server.sh status` 또는 `./server.sh urls`의 실제 host/port를 CLI에 넣습니다.

현재 상태:

- 구현 완료: WebRTC 메타데이터 뷰어, DataChannel 수신 상태 표시, latest JSON preview, client-side overlay canvas/toggle
- 구현 완료: 런타임 대시보드의 metrics/state dump/tracking issue report 표시
- 구현 완료: SSE metadata side-channel과 Lab의 custom pairing URL 표시
- 구현 완료: WebSocket metadata side-channel 최소 subscribe/stream endpoint
- 구현 완료: SSE metadata side-channel 수신 중심 custom client 예제
- 구현 완료: OpenCV 기반 Custom RTSP + SSE metadata overlay renderer 예제
- 구현 완료: OpenCV 기반 Custom RTSP + WebSocket metadata overlay renderer 예제
- 구현 완료: WebSocket command/filter/subscribe-unsubscribe 제어

검증용 smoke:

```bash
./server.sh verify-webrtc-va-metadata --http-base http://127.0.0.1:8080
./server.sh verify-sse-metadata --http-base http://127.0.0.1:8080
./server.sh verify-ws-metadata --http-base http://127.0.0.1:8080
```

## 13. VA 런타임 대시보드

VA 런타임 대시보드는 현재 분석 서버 상태를 한 화면에서 보는 운영용 탭입니다.

| 상태 | 화면 동작 |
| --- | --- |
| active tap 있음 | Health Summary부터 Debug까지 현재 runtime 상태 표시 |
| active tap 없음 | 본문을 낮은 visual weight로 표시하고 보기 시작 안내 |
| Dashboard tab 닫힘 | polling 중지 |
| 자동 갱신 사용 | 최소 2초 이상 간격으로 제한 |

문서용 screenshot은 긴 dashboard 전체를 한 장으로 축소하지 않습니다.
active analysis tap 데이터가 들어간 상태에서 구간별로 나눠 캡처합니다.
각 이미지는 바로 위의 확인 포인트와 함께 읽습니다.

| Screenshot | 확인 포인트 |
| --- | --- |
| Health Summary / Controls | active stream/tap, rule, refresh, stale, cleanup, guard 상태 요약 |
| Warnings / Trend detail | 최근 sample 수, delta/min/max, warning badge |
| Metadata / Backpressure | WebRTC/SSE/WS metadata, payload, DataChannel buffer |
| Runtime Detail / vaRule Debug | 선택 tap/rule/source/profile/event/scenario runtime 관계 |
| Tracks | track lifecycle, zone/dwell, TrackHealth |
| Scenarios / Events | scenario phase/timeline, recent event buffer |
| Event Records | 자동 polling 없는 수동 검색 UI와 active JSON Lines 조회 범위 |
| Tracking Issues | tracking issue report와 close-object diagnostics |

### 13.1. Health Summary / Controls

대시보드 제목, tap/rule 선택, refresh 정책, Health Summary를 함께 봅니다.
source는 문서용으로 상대 표시하며 개인 절대경로를 노출하지 않습니다.

### 13.2. Metadata / Backpressure

WebRTC DataChannel, SSE/WS side-channel, payload size, queue/drop/fail counter를 확인합니다. 값이 endpoint에서 제공되지 않으면 `미제공`으로 표시합니다.

### 13.3. Runtime Detail / vaRule Debug

선택 rule과 active tap의 source/profile/event/scenario/region 관계를 읽기 전용으로 표시합니다.
Event POST payload, metadata schema, ScenarioEngine 판단 로직은 변경하지 않습니다.

### 13.4. Tracks

trackId, class, lifecycle, currentZone, dwellTimeMs, TrackHealth를 state-dump 기반으로 확인합니다.

### 13.5. Scenarios / Events

scenario phase, timeline, recent event buffer를 한 구간에서 확인합니다. 이벤트가 없으면 빈 상태 이유를 짧게 표시합니다.

### 13.6. Event Records

Event Records는 자동 polling하지 않습니다.
검색 버튼을 눌렀을 때 active JSON Lines의 metadata를 조회하고,
`archive 포함`을 켜면 rotated archive까지 조회합니다.

지원 동작:

- `evidence` 필터는 snapshot, clip manifest, snapshot+clip,
  evidence 없음 조건을 같은 records API query에 넣습니다.
- `offset` 기반 이전/다음 페이지 버튼은 archive가 많은 경우에도
  현재 filter를 유지한 채 탐색합니다.
- EventRecord detail은 snapshot path, clip manifest path,
  clip bundle directory를 분리해 표시합니다.
- 안전한 preview route는 snapshot inline preview와
  clip manifest/frame link를 보여줍니다.
- Evidence export는 개별 snapshot/clip manifest 다운로드와
  signed token zip bundle 다운로드를 제공합니다.
- Bundle 다운로드는 Ops audit trail에 `export-bundle`로 기록됩니다.
  Bundle 링크는 `signed-token-expiresAtMs` 기반 24시간 만료 정책과
  `token-expiry-no-server-file` cleanup 정책을 사용합니다.
- evidence 원본 파일 DELETE는 policy상 모든 role에서 차단됩니다.
- `compaction snapshot`은 기존 파일을 수정하지 않는 compacted JSON Lines
  사본을 생성하며 현재 검색 필터와 evidence 조건을 그대로 사용합니다.
- `snapshot 목록`은 compacted snapshot의 file/size/modified를 표시하고,
  `keepNewest` cleanup으로 오래된 compacted snapshot만 정리합니다.

### 13.7. Tracking Issues

tracking issue report와 close-object diagnostics를 분리해 봅니다.
이 영역은 진단 비중이 높아 대표 제품 화면보다는 운영/분석 보조 자료에 가깝습니다.

표시 항목:

- Health Summary: sessions, streams, analysis taps, SSE/WS clients, RTSP consumers, cleanup warning, metadata stale, guard mode
- Warnings: dashboard sample, runtime delta, cleanup watch, stale metadata/backpressure를 badge 중심으로 표시
- Metadata / Backpressure: WebRTC sent/drop/fail, SSE/WS client/message, metadata JSON build/payload size, DataChannel bufferedAmount
- Tracking / Scenario: Tracks, Tracking Issues, Scenarios, Scenario Timeline
- Event Records: 자동 polling 없이 검색 버튼으로만 조회하는 저장 event metadata table
- 진단: vaRule runtime 상태, tracking issue detail, API 원문 확인

선택 UI:

- 분석 Tap: 현재 활성 tap 중 하나를 선택합니다.
- 룰: 저장된 rule ID를 기준으로 관련 tap을 우선 선택할 때 사용합니다.
- 갱신 주기: 수동, 2초, 5초, 10초 중 선택합니다.

drill-down 사용법:

| 영역 | 주요 확인 항목 | 주의 |
| --- | --- | --- |
| Overview | session/stream/tap 수, FPS, queue, inference latency, event POST/storage | 빠른 상태 요약 |
| vaRule Runtime Debug | 선택 rule과 active tap 관계, source/profile/event/scenario/region, recent event | `rule mismatch`는 실제 ruleId가 다를 때만 표시 |
| Tracks | trackId, class, lifecycle, currentZone, dwellTimeMs, TrackHealth | state-dump debug track 기반 |
| Scenarios | scenarioName, phase, zone, line, elapsed, cooldown | 값이 없으면 짧은 empty reason 표시 |
| Scenario Timeline | phase chip, event emitted, dedup count, recent event 연결 | 판단 로직 변경 없이 읽기 전용 |
| Events | 선택 tap의 `/events` buffer | 선택 rule이 있으면 해당 rule recent event만 반영 |
| Event Records | EventRecord 수동 검색과 detail JSON | 영상 재생, snapshot 추출, clip recorder 없음 |
| Metadata / Backpressure | DataChannel, SSE/WS client, queue, payload size, RTSP lifecycle | 불균형, cleanup 잔여, failure는 warning badge |
| Trend / Stale / Cleanup | 최근 60개 dashboard sample의 count/age/delta/min/max/잔류 상태 | 새 backend endpoint 없이 client buffer만 사용 |
| RSS 표시 | live 보조 관찰 | longrun report를 대체하지 않음 |

Trend / Stale / Cleanup 1차 기준:

| 범주 | 표시 대상 | warning 기준 |
| --- | --- | --- |
| Runtime trend | activeSessions, activeStreams, activeAnalysisTaps, SSE/WS clients, RTSP consumers | 최근 60개 sample window에서 증가/감소/유지, min/max 표시 |
| Metadata trend | WebRTC sent/drop/fail, metadataJsonBuildCount, payload avg/max, DataChannel bufferedAmount | drop/fail 증가, bufferedAmount가 session limit의 80% 초과 |
| Analysis/Event trend | tracking issue count, close-object risk count, event send/store/drop | issue/risk 양수, Event POST/EventRecord fail/drop 관찰 |
| Stale | metadata receive age, video frame age, overlay draw age, tap metrics progress | metadata 미수신/3초 초과, video/draw 지연, tap metrics 정체 |
| Cleanup | 보기 중지 또는 dashboard 비활성 후 active session/stream/tap/SSE/WS/RTSP 잔류 | 10초 grace 이후 잔류가 있으면 badge 표시 |

Trend detail은 기본 접힘 영역입니다.
값이 endpoint에 없으면 `미제공`으로 표시합니다.
Runtime Dashboard polling interval, WebRTC DataChannel/SSE/WS metadata schema, Event POST payload schema는 변경하지 않습니다.

Event Records 검색 filter:

- `eventType`, `streamId`, `channelId`, `trackId`
- `scenarioName`, `status`
- `startTimeMs`, `endTimeMs`, `limit`

Event Records 결과 table은 eventId, eventType, startTime/status, stream/channel, track/class, zone/line, scenario/phase, snapshot/clip 저장 문자열을 보여줍니다.

Runtime Dashboard의 RSS 표시는 장시간 검증 결과나 longrun report를 대체하지 않습니다.
Runtime Console은 stable 승격 가능 상태로 정리하되 active 구간 high-water 관찰 메모는 유지합니다.

vaRule Runtime Debug와 Scenario Timeline은 새 backend API 없이 기존 metrics/state-dump/event buffer를 사용합니다.
phase entered time 같은 세부 시각 값은 현재 state-dump에 노출된 값이 있을 때만 표시합니다.
원본 JSON은 `상태 덤프 / tracking issue report` 접힘 영역에서 확인할 수 있습니다.

VA 런타임 확인 순서:

1. 서버 실행 후 `/ops/dashboard`에서 runtime 요약을 확인합니다.
2. `/ops/rules` 미리보기 또는 `/client/live`로 analysis tap을 만들거나 저장 rule을 선택합니다.
3. 세부 확인은 `/lab/runtime/status`, `/metrics`, `/state-dump`, `/events` API를 조회합니다.
4. UI polling은 제품 화면 요약에 한정하고, 긴 진단은 검증 명령과 API로 수행합니다.

재사용 endpoint:

```bash
curl -fsS 'http://127.0.0.1:8080/lab/runtime/status'
curl -fsS 'http://127.0.0.1:8080/lab/analysis/taps'
curl -fsS 'http://127.0.0.1:8080/lab/analysis/taps/{tapId}/metrics'
curl -fsS 'http://127.0.0.1:8080/lab/analysis/taps/{tapId}/state-dump'
curl -fsS 'http://127.0.0.1:8080/lab/analysis/taps/{tapId}/events'
curl -fsS 'http://127.0.0.1:8080/lab/analysis/event-post/status'
curl -fsS 'http://127.0.0.1:8080/lab/analysis/events/records?limit=100'
curl -fsS 'http://127.0.0.1:8080/lab/analysis/event-storage/status'
```

장시간 검증:

```bash
./server.sh verify-va-runtime-console-longrun \
  --duration-minutes 30 \
  --clients 1 \
  --include-sidechannel \
  --include-dashboard \
  --include-rtsp
```

이 검증은 선택 longrun입니다. 기본 `./server.sh test`에는 포함하지 않습니다.

## 14. 자주 발생하는 오류

| 오류 | 원인 | 처리 |
| --- | --- | --- |
| polygon 점 부족 | polygon 이벤트인데 점이 3개 미만 | 캔버스에서 최소 3점을 추가 |
| line 좌표 부족 | line-crossing인데 line 점이 2개가 아님 | line 모드에서 2점을 지정 |
| category 미선택 | 분석 대상 객체 category가 비어 있음 | 기본 또는 전체 선택으로 category 지정 |
| Profile tracking category 미선택 | profile의 tracking category가 비어 있음 | profile 고급 설정에서 category 선택 |
| POST URL 오류 | POST URL 형식이 올바르지 않음 | `http://` 또는 `https://` URL 입력 |
| `vaRule`과 source override 충돌 | `vaRule=<id>`에 `file`, `url`, `source`를 함께 붙임 | 저장된 rule source만 쓰도록 `vaRule=<id>`만 사용 |
| 영상 프레임 로딩 실패 | 파일 없음, source 접근 실패, 서버 상태 오류 | `./server.sh status`, source token, `/lab/files` 목록 확인 |

## Screenshot 자산

Screenshot 관리 정책:

| 항목 | 정책 |
| --- | --- |
| 보관 위치 | `docs/assets/ui/` |
| 파일명 | 역할 기반 이름 사용 |
| 기본 theme | dark mode 대표 화면 |
| 링크 정책 | 새 이미지가 없으면 broken link 대신 “이미지 추가 예정” 문구 사용 |
| 현재 대표 이미지 | 2026-05-09 dark mode 제품 UI 기준 재캡처 |
| 재캡처 | `node scripts/internal/capture_docs_ui_assets.mjs --http-base http://127.0.0.1:8082` |
| 기준 검증 | `./server.sh verify-docs-ui-assets` |

문서용 screenshot 촬영 기준:

- 버튼, 입력, 카드 제목, table row가 화면 경계에서 반쯤 잘리지 않게 자릅니다.
- section 경계 또는 대표 상태가 온전히 보이는 지점을 사용합니다.
- 영상 화면은 실제 객체가 보이는 `va_four_scene_sample.mp4` 4신 영상 기준으로 캡처합니다.
- VA overlay가 가능한 화면은 객체 bbox/label이 표출된 상태로 캡처합니다.
- 영상 프레임 하단이 온전히 보이도록 하며, 상하좌우 공백이 과하게 크거나 한쪽으로 치우친 컷은 다시 촬영합니다.
- 긴 화면은 한 장에 모두 넣지 않고 핵심 section 대표 screenshot을 우선합니다.

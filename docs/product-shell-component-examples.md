# 제품 UI 공통 구성요소 예시

schema: `media-server.product-shell-component-examples.v1`

Auth·Ops·Client 화면을 수정하는 개발자를 위한 공통 helper와 HTML 구조 안내입니다.
사용 흐름·권한은 [UI 가이드](ui-guide.md), 상태 문구는
[빈 상태·로딩·오류 문구](ui-empty-loading-error-copy-matrix.md)를 기준으로 봅니다.
새 class나 색상을 추가하기 전에 기존 helper와 의미별 CSS 변수(semantic token)를 확인합니다.

아래 코드는 구조를 설명하는 축약 예시이며 완전한 페이지나 동작하는 runtime 구현이 아닙니다.
실제 화면에는 값의 escape, 권한에 따른 출력, 이벤트 연결, 상태 갱신과 세션 정리가 함께 필요합니다.

## 구현 위치와 공통 경계

제품 UI는 별도 SPA가 아니라 C++에서 HTML/CSS/JavaScript 문자열을 조립하는 구조입니다.
renderer·CSS·controller를 나눈 이유는 긴 문자열의 중복과 layout drift를 줄이고,
화면 변경을 HTTP 권한·API 처리·미디어 signaling과 분리해 검토하기 위해서입니다.
모든 route가 별도 renderer로 이동한 것은 아니며, 다음은 현재 소유 경계입니다.

| 영역 | 실제 구현 | 재사용 기준 |
| --- | --- | --- |
| Ops shell·페이지 | [product_ui_server_pages.cpp](../src/ingress/product_ui_server_pages.cpp)의 `OpsShellPageHtml`, `AppendOpsShellStart/End`, `AppendProductAccountMenu` | `app-chrome`, `app-brand`, `image-nav-tabs`, `account-menu`와 Home/Dashboard/Events/Rules/VLM HTML |
| Auth shell·페이지 | [product_ui_auth_pages.cpp](../src/ingress/product_ui_auth_pages.cpp)의 내부 `AppendAuthShellStart/End`와 공개 page renderer | 로그인·초기 설정·초대·접근 요청·비밀번호 변경·권한 안내 HTML |
| Client shell | [webrtc_http_server.cpp](../src/ingress/webrtc_http_server.cpp)의 `ClientShellPageHtml()` | 허용된 view와 미리보기 여부를 전달하고 Client 메뉴 구성 |
| Channels·Users HTML | 같은 `webrtc_http_server.cpp`의 `BuildOpsSourcesPageHtml`, `BuildOpsUsersPageHtml` | 공통 Ops shell을 사용하지만 page HTML은 이 파일에 남음 |
| 공통 스타일 | [product_ui_css.cpp](../src/ingress/product_ui_css.cpp)의 `ProductUiCss()`, `ProductDesignTokensCss()` | light/dark 공통 token, 버튼, `section-card`, `metric-card`, 반응형 표 |
| C++ 구성요소 | [product_ui_components.cpp](../src/ingress/product_ui_components.cpp) | `ProductUiToolbarHtml`, `ProductUiSectionCardHtml`, `ProductUiStatusBadgeHtml`, `ProductUiTableShellHtml`, `ProductUiDetailsPanelHtml`, `ProductUiEmptyStateHtml` |
| 공통 JS | [product_ui_js.cpp](../src/ingress/product_ui_js.cpp)의 `ProductSharedUiScript()` | `window.MediaServerUi`의 번역·상태·표·상세·감사 helper |
| Client 라이브 | [product_ui_client_scripts.cpp](../src/ingress/product_ui_client_scripts.cpp)의 `AppendClientShellScript()`, [product_ui_client_css.cpp](../src/ingress/product_ui_client_css.cpp)의 `ClientShellCss()` | `live-monitor`, `live-source-tree`, `live-workspace`, `tile`을 같은 shell 안에서 구성 |
| Ops controller | [product_ui_page_scripts.cpp](../src/ingress/product_ui_page_scripts.cpp), [product_ui_ops_sources_script.cpp](../src/ingress/product_ui_ops_sources_script.cpp), [product_ui_ops_users_script.cpp](../src/ingress/product_ui_ops_users_script.cpp) | 공통 Ops 화면과 채널·사용자 controller를 분리 |
| 공통 자산 | [product_ui_assets.cpp](../src/ingress/product_ui_assets.cpp) | 테마·언어 control과 brand/nav/avatar HTML·SVG |

[CMakeLists.txt](../CMakeLists.txt)는 위 renderer·CSS·controller·helper 소스를 빌드합니다.
HTTP route 호출과 권한 gate는 [webrtc_http_server_runtime.cpp](../src/ingress/webrtc_http_server_runtime.cpp)에서
각 renderer로 연결됩니다. Auth의 공개 renderer 선언은
[product_ui_auth_pages.h](../include/ingress/product_ui_auth_pages.h), Ops shell 선언은
[product_ui_server_pages.h](../include/ingress/product_ui_server_pages.h)에 있습니다.

### 공통 생성 API

아래는 C++ 호출 경계입니다. 파일 분리와 UI 재배치 시 이름·인자와 소비자 연결을 함께 유지합니다.

| 선언 위치 | API | 책임 |
| --- | --- | --- |
| [product_ui_css.h](../include/ingress/product_ui_css.h) | `ProductDesignTokensCss()`, `ProductUiCss()`, `ClientShellCss()` | 의미별 변수, 공통/Ops 스타일, Client 전용 스타일 |
| [product_ui_js.h](../include/ingress/product_ui_js.h) | `ProductThemeBootScript()`, `ProductSharedUiScript()`, `AppendProductThemeScript(out)` | 초기 테마, 공통 동작, 테마·언어 script 삽입 |
| [product_ui_page_scripts.h](../include/ingress/product_ui_page_scripts.h) | `AppendClientAccessRequestScript(out)`, `AppendClientShellScript(out)` | Client 파일에서 접근 요청 form과 live/dashboard/events controller 생성 |
| 같은 page script 선언 | `AppendOpsShellScript(out, active, stream_route, rtsp_port)` | 선택 Ops 화면의 controller 생성 |
| 같은 page script 선언 | `AppendOpsSourcesPageScript(out, stream_route_json, rtsp_port)`, `AppendOpsUsersPageScript(out)` | 채널·사용자별 controller 생성 |
| [product_ui_assets.h](../include/ingress/product_ui_assets.h) | `ProductThemeToggleButtonHtml()`, `ProductLanguageSelectHtml()` | 테마·언어 control |
| 같은 asset 선언 | `ProductBrandMarkSvg()`, `ProductNavIconSvg(key)`, `ProductAccountAvatarSvg()` | brand·메뉴·계정 아이콘 |

### 구성요소 API

[product_ui_components.h](../include/ingress/product_ui_components.h)의 helper는 정적 markup을
생성합니다. Auth form과 Ops toolbar/card 등에서 재사용하지만 JS runtime renderer의 모든
문자열을 자동 대체하지는 않습니다.

| API | 생성 구조·사용 경계 |
| --- | --- |
| `ProductUiSectionCardHtml` | `section-card`에 선택적인 toolbar와 body 삽입 |
| `ProductUiToolbarHtml` | title/subtitle과 `actions` 묶음 |
| `ProductUiNavTabsHtml` | `nav-tabs` 안의 링크 또는 버튼 |
| `ProductUiSegmentedControlHtml` | `rule-mode-grid`, `role="group"` 안의 mode 버튼 |
| `ProductUiTableShellHtml` | `table-wrap`, 열 머리글과 body; 반응형 cell 의미는 호출자가 유지 |
| `ProductUiDetailsPanelHtml` | `collapsed-editor`인 `<details>`와 summary/body; modal drawer 구현은 아님 |
| `ProductUiFormRowHtml` | `form-grid` label/control과 선택적인 `form-note` |
| `ProductUiStatusBadgeHtml`, `ProductUiBadgeRowHtml` | `chip`과 tone, `badge-row` |
| `ProductUiEmptyStateHtml`, `ProductUiLoadingStateHtml`, `ProductUiErrorStateHtml` | empty/loading은 `empty`, error는 `message error`; loading은 empty helper 재사용 |

일반 label/text는 escape하지만 `body_html`, `actions_html`, `control_html`, raw `attributes`는
호출자가 안전하게 구성해야 합니다. helper 사용만으로 입력 검증·권한·redaction이 성립하지 않습니다.

위 소스의 공통 스타일·selector와 route별 controller를 함께 대조합니다.
버튼의 `button-primary`, `button-secondary`, `ghost`, `danger`는 CSS 표현이며,
위험 작업에만 `danger`를 사용합니다. 스타일 class나 숨김 속성이 API 권한 검사를 대신하지 않습니다.

레이아웃 변경은 Event POST payload, WebRTC DataChannel·SSE/WS metadata schema,
RTSP/WebRTC media path, Auth/session/scope, Rule/Profile 저장 payload를 바꾸지 않습니다.
`/ops/rules`의 smoke selector와 저장 roundtrip, Client/viewer 정보 비노출도 유지합니다.
`/ops/api/*`, `/client/api/*`, `/lab/*`, `/webrtc/*`, `/whep`, `/whip/publish`,
`/ws/va-metadata`의 API·미디어 처리는 UI helper의 책임이 아닙니다.
프로젝트 불변 계약과 변경 승인은 [AGENTS](../AGENTS.md)를 따릅니다.

## 토큰과 반응형 작업 배치

`ProductDesignTokensCss()`를 공통 token 정의의 기준으로 삼고 light/dark를 함께 검토합니다.

| Token family | 역할 |
| --- | --- |
| `--color-*`, `--overlay-*` | surface·상태·media·overlay의 의미별 색상과 효과 |
| `--space-*`, `--radius-*`, `--shadow-*` | 여백·모서리·그림자 |
| `--font-ui`, `--font-mono`, `--font-size-*`, `--line-height-*` | UI와 운영 code/debug 문구의 글꼴·크기·행간 |
| `--control-height-*`, `--icon-button-size`, `--panel-padding`, `--card-padding` | control과 panel/card 밀도 |
| `--button-*`, `--input-*`, `--table-*`, `--badge-*`, `--debug-details-*` | 버튼·입력·표·상태·접힌 진단 영역의 공통 치수·표현 |

button/input/select/textarea, table cell, chip/badge, 허용된 운영 진단 `pre`는 해당 token을
재사용합니다. 글자 크기는 viewport 폭에 따라 흔들리는 `font-size: clamp(...vw...)`로
정하지 않고, panel·표·form의 배치를 조정합니다.

| 확인 폭 | 작업 배치 의도 | 확인할 조건 |
| --- | --- | --- |
| 320px | 한 열에서 주 작업을 먼저, 보조 작업은 접근 가능한 details·단계형 panel로 배치 | 가로 넘침·버튼/긴 단어 잘림 없이 입력·행 작업이 부모 폭 안에 머묾 |
| 390px | compact toolbar와 카드형 행, form·상태를 한 열로 배치 | 주 작업이 먼저 보이고 보조 작업을 계속 찾을 수 있음 |
| 760px | 주 영역과 inline detail 또는 위아래 panel 조합 | 목록·상세·편집 전환과 주요 작업을 유지 |
| 1180px+ | 표·toolbar·side/detail panel을 함께 배치 | 반복 작업의 상태 비교·선택·수정을 빠르게 수행 |

이 폭은 검토 기준이지 모든 CSS module의 breakpoint가 같다는 뜻은 아닙니다.
작은 화면에서 기능을 없애거나 영상·overlay·control·상태를 잘라 맞추지 않습니다.
표는 열 의미를 유지하는 record/card 형태로, form은 `min-width: 0`과 label/help/error
줄바꿈으로 대응합니다. 실제 적용 여부는 route별 CSS와 화면에서 확인해야 합니다.

설계 용어 `ProductShell`, `PageSection`, `ActionToolbar`, `StatusBadgeRow`,
`EmptyLoadingErrorState`, `DebugDetails`는 공통 책임을 분류한 이름입니다.
`ResponsiveTaskShell`, `PrimaryTaskRegion`, `SecondaryActionDrawer`, `DetailDrawerPanel`,
`ResponsiveTable`, `FormGrid`, `ViewerSafeDock`도 배치 의도이며 동명의 구현 API가 아닙니다.
실제 호출은 위 helper와 route별 controller를 사용하며, 모든 상세 영역에 drawer가 구현됐다고 해석하지 않습니다.

### Route별 작업과 renderer

주 작업과 보조 작업은 배치·검토의 우선순위입니다. 메뉴·버튼의 실제 사용법과 권한은
[UI 가이드](ui-guide.md)를 따르며, 직접 route가 있다는 이유로 primary nav에 추가하지 않습니다.

| Route | 주 작업 | 보조 작업 | HTML renderer 경계 |
| --- | --- | --- | --- |
| `/setup` | 최초 관리자 비밀번호 설정 | 정책 안내·테마·언어 | Auth `SetupPageHtml` |
| `/invite/setup` | 초대 수락과 비밀번호 설정 | 정책·오류 안내 | Auth `InviteSetupPageHtml` |
| `/login` | 로그인 | 테마·언어·오류 안내 | Auth `LoginPageHtml` |
| `/password/change` | 현재/새 비밀번호 순서로 변경 | 정책·오류 안내 | Auth `PasswordChangePageHtml` |
| `/client/request-access` | pending 접근 요청 제출 | 결과·상태 안내 | Auth `ClientAccessRequestPageHtml` + Client request script |
| `/ops`, `/ops/home` | 운영 상태와 다음 조치 선택 | 바로가기·상태 요약 | `OpsShellPageHtml` → `AppendOpsHomePage` |
| `/ops/dashboard` | source/runtime/event 원인 판독 | 인시던트 필터·복사·VA 진단 | 같은 shell → `AppendOpsDashboardPage` |
| `/ops/events` | 이벤트 검토와 조회 | 필터·전송·증거·녹화 확인 | 같은 shell → `AppendOpsEventsPage` |
| `/ops/vlm` | Ops 보조 후보·profile 상태 검토 | privacy·default-off·접힌 진단 | 같은 shell → `AppendOpsVlmInstallConnectionPage` |
| `/ops/sources` | 채널 상태·source/view 관리 | 입력 준비·site/group·감사 확인 | `BuildOpsSourcesPageHtml` + Sources script |
| `/ops/rules` | rule/profile/scenario 편집·preview·save | 검증·초안 보조·감사 확인 | `OpsShellPageHtml` → `AppendOpsRulesPage` |
| `/ops/users` | 사용자·초대·접근 요청 관리 | role/scope·초기화·disable·감사 | `BuildOpsUsersPageHtml` + Users script |
| `/client`, `/client/live` | 영상 시청·할당 view 선택 | layout·보기 모드·viewer-safe dock | `ClientShellPageHtml` + Client script |
| `/client/dashboard` | viewer-safe 상태 요약 | 채널 비교·이벤트 요약 | 같은 Client shell/script |
| `/client/events` | viewer-safe 이벤트 확인 | 채널 선택·상세 요약 | 같은 Client shell/script의 직접 route |

Ops의 페이지별 `AppendOps*Page` 함수는 renderer 내부 구현이며 공개 API가 아닙니다.
Client는 `IsClientShellRoute`/`ClientShellActiveForPath`, Ops overview는
`IsOpsOverviewShellRoute`/`OpsOverviewActiveForPath`로 화면을 선택하고,
Rules·Channels·Users와 Events 경로도 실제 route guard를 거쳐 연결됩니다.

## 공통 화면 틀과 메뉴

Ops의 메뉴 역할은 `Home`, `Dashboard`, `Channels`, `Rules`, `Users`, `Client Preview`입니다.
실제 한국어 표시는 홈·대시보드·채널·룰·사용자·클라이언트이며, Users는 admin에게만 출력합니다.
`/ops/events`는 primary nav가 아니라 Dashboard 내부 섹션 또는 직접 진단 route입니다.
Client primary nav는 Live/Dashboard 두 항목이며 `/client/events`는 직접 route로 남습니다.
viewer에게 Ops/Lab nav를 노출하지 않고, 관리자 Client 미리보기 표시는 일반 viewer 화면과 구분합니다.

다음은 관리자용 shell의 축약 구조입니다. 실제 계정 메뉴에는 테마·언어 선택도 포함됩니다.

```html
<header class="app-chrome">
  <div class="app-header-top">
    <div class="app-nav-cluster">
      <div class="app-brand">Media Server</div>
      <nav class="image-nav-tabs" aria-label="운영 메뉴">
        <a class="image-nav" href="/ops/home">홈</a>
        <a class="image-nav" href="/ops/dashboard">대시보드</a>
        <a class="image-nav" href="/ops/sources">채널</a>
        <a class="image-nav" href="/ops/rules">룰</a>
        <a class="image-nav" href="/ops/users" data-admin-only>사용자</a>
        <a class="image-nav" href="/client/live">클라이언트</a>
      </nav>
    </div>
    <div class="account-menu" aria-label="현재 계정">
      <div class="account-menu-top"><div class="account-identity">관리자</div></div>
      <form method="post" action="/logout">
        <button class="button-secondary" type="submit">로그아웃</button>
      </form>
    </div>
  </div>
</header>
```

shell markup을 route별 script에 복사하기보다 기존 helper를 확장합니다.
route별 API payload나 schema 변환은 shell helper에 넣지 않습니다.

## 지표와 작업 영역

`metric-card`는 빠른 요약, `section-card`는 작업 영역입니다. 장식만을 위한 card 중첩이나
과도한 badge를 피하고, 빈 상태는 `ProductUiEmptyStateHtml`, `setTableEmpty` 또는 Client의
`emptyState`로 다음 행동을 안내합니다. 아래 숫자는 예시 값입니다.

```html
<section class="section-card" aria-labelledby="source-health-title">
  <div class="toolbar">
    <div><h2 id="source-health-title">라이브 소스 상태</h2></div>
    <div class="actions"><button class="button-secondary" type="button">새로고침</button></div>
  </div>
  <div class="grid">
    <article class="metric-card">
      <span>확인할 채널</span>
      <strong>2</strong>
    </article>
  </div>
  <div class="badge-row"><span class="chip warn">확인 필요</span></div>
</section>
```

경고·오류·정보 표시는 기존 `chip warn`, `chip bad`, `chip info`와 관련 token을 사용합니다.
색상은 우선 `--color-surface`, `--color-text`, `--color-warning` 같은 기존 변수를 재사용하고,
새 의미가 필요할 때 `ProductDesignTokensCss()`의 light/dark 정의를 함께 검토합니다.

## 반응형 표와 행 작업

`ProductUiTableShellHtml`은 `table-wrap`과 열 머리글을 구성합니다. JS의 `tableCellHtml`,
`opsTableRowHtml`, `opsRowActionsHtml`을 사용하고, 보조 작업은 `opsContextActionsHtml`로 묶습니다.
모바일 카드형 행에도 열 의미가 남도록 각 cell의 `data-label`을 유지합니다.

```html
<div class="table-wrap">
  <table class="ops-responsive-table">
    <thead><tr><th scope="col">채널</th><th scope="col">상태</th><th scope="col">작업</th></tr></thead>
    <tbody>
      <tr>
        <td data-label="채널">channel-1</td>
        <td data-label="상태"><span class="chip">정상</span></td>
        <td data-label="작업">
          <div class="table-actions ops-row-actions">
            <button class="ghost" type="button">상세</button>
            <button class="button-secondary" type="button">재시도</button>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

320/390px 폭에서는 행 작업과 날짜·시간 입력이 부모 폭을 넘지 않는지 실제 화면으로 확인합니다.
HTML 문자열을 받는 helper에는 이미 안전하게 구성한 markup을 전달하고 사용자 값을 그대로 넣지 않습니다.

## 상세·감사 패널

선택 행의 작업은 `ops-detail-panel`, 변경 이력은 `ops-audit-panel`에 모읍니다.
`setOpsDetailPanelOpen`은 표시·스크롤을, `renderOpsAuditTrail`은 감사 필터·목록을 담당합니다.
다음은 패널 구조일 뿐 상세 조회나 감사 API 요청을 수행하지 않습니다.

```html
<aside class="ops-detail-panel" aria-label="채널 상세">
  <div class="toolbar">
    <h2>채널 상세</h2>
    <div class="actions"><button class="ghost" type="button">닫기</button></div>
  </div>
  <p>PublishedView: view-1</p>
</aside>

<section class="ops-audit-panel" aria-labelledby="audit-title">
  <div class="toolbar"><h2 id="audit-title">변경 이력</h2></div>
  <div class="empty">아직 기록된 변경 이력이 없습니다.</div>
</section>
```

허용된 Ops 진단의 debug/raw payload는 접힌 상세 영역에 한정하고 기본 화면에는 요약을 둡니다.
`ProductUiDetailsPanelHtml`이나 `renderRaw` 자체가 redaction·권한 검사 helper는 아닙니다.
client/viewer용 데이터는 서버의 공개 응답 경계에서 제한하며, 민감 정보를 숨긴 DOM에 넣는 것도 피합니다.

## Client 라이브 타일

`liveTileHtml`은 `tile-stage` 안에 video와 `tile-head`를 넣고 그 안에 `tile-actions`를 구성합니다.
다음은 선택된 빈 타일의 접근성·배치 구조 예시입니다. mode 버튼, 상태 지표, 정보 overlay 등을
생략했으므로 이 조각만으로 `updateTileDom`이나 재생 controller를 실행할 수는 없습니다.

```html
<article class="tile selected" data-tile="0" data-view-id="" tabindex="0" role="group"
         aria-label="타일 1: 라이브" aria-describedby="liveTileStatus0" aria-current="true">
  <div class="tile-stage">
    <video playsinline muted autoplay></video>
    <div class="tile-head">
      <div class="tile-title"><h3 data-role="view-label">타일 1</h3></div>
      <div class="tile-actions" aria-label="타일 1 작업">
        <span class="chip tile-status-pill" data-role="status">오프라인</span>
        <button type="button" class="icon-button tile-action-primary" data-action="toggle-playback"
                aria-label="타일 1 재생" title="타일 1 재생" disabled>
          <span data-role="tile-playback-icon" aria-hidden="true">▶</span>
        </button>
        <button type="button" class="icon-button" data-action="restart"
                aria-label="타일 1 새로고침" title="타일 1 새로고침" disabled><span aria-hidden="true">↻</span></button>
        <button type="button" class="icon-button" data-action="stop" data-disconnect-scope="tile"
                aria-label="타일 1 연결 해제" title="타일 1 연결 해제"><span aria-hidden="true">⏹</span></button>
      </div>
    </div>
    <span data-role="placeholder">오프라인</span>
  </div>
  <p id="liveTileStatus0" class="sr-only" data-role="a11y-status" aria-live="polite" aria-atomic="true">
    타일 1: 채널 미선택 · 상태 오프라인 · 연결 연결 끊김 · 트랙 미제공 · 이벤트 미제공 · 메타데이터 미제공 · 재시도 0
  </p>
</article>
```

`updateTileDom`은 재생 상태에 따라 재생/정지 버튼의 accessible name과 아이콘을 갱신합니다.
타일 번호가 포함된 버튼 이름, 키보드 focus, `aria-current`, `aria-describedby`,
`aria-live="polite"` 상태 요약을 함께 유지합니다.

실제 DOM에는 `tile-controls`의 `select[data-role="mode"]`도 남아 있지만,
`body.client-shell .tile-controls`는 `display: none`이고 `tile-actions`는 `display: flex`입니다.
이를 현재 보이는 선택 상자로 설명하거나 작업 버튼까지 숨겨졌다고 해석하지 않습니다.
보기 모드는 Fit/Fill이 아니라 허용된 `raw`, `va-overlay`, `va-rule`이며,
`allowedOverlayModes`·룰 연결에 따라 `applyTileModeOptions`가 select와 mode 버튼을 갱신합니다.
여러 모드가 허용될 때 표시되는 버튼의 `aria-pressed`도 유지합니다.

Client 화면에는 다음 정보를 추가하지 않습니다. 관리자 미리보기에서도 viewer-safe 응답 경계를 유지합니다.

| 비노출 대상 | 주의 |
| --- | --- |
| source URL 또는 ONVIF endpoint, Developer URL | 이름·오류·복사 내용에도 원본 주소를 섞지 않음 |
| raw JSON 또는 debug counter, BBox 진단 | 허용된 사용자용 상태 요약과 개발 진단을 구분 |
| rule/profile editor | Client에 개발·운영 편집기를 추가하지 않음 |
| 내부 token/hash/session id | 인증·세션 자료를 화면이나 복사 내용에 노출하지 않음 |

## 문구·번역과 확인 방법

사용자에게 보이는 새 한국어 문구는 `ProductSharedUiScript()`의 English translation map 또는
translation pattern과 함께 검토합니다. 반복 label은 pattern으로 처리하고, 숨김 접근성 문구도
같은 언어로 읽혀야 합니다. 상태별 기준과 보호된 snapshot은 [상태 문구 안내](ui-empty-loading-error-copy-matrix.md)에 둡니다.

관련 정적 검사는 다음과 같습니다. 문서·소스 연결 검사이며 실제 화면 검증 결과는 아닙니다.

```sh
./server.sh verify-product-shell-examples
./server.sh verify-ui-copy-i18n-parity
./server.sh verify-product-ui-token-drift
./server.sh verify-docs-links
```

구조·반응형·token·helper·module 연결의 기존 정적 명령도 이 안내를 기준으로 사용합니다.
명령의 버전 이름은 과거 단계의 완료나 이번 실행 결과를 뜻하지 않습니다.

```sh
./server.sh verify-v220-ui-architecture-inventory
./server.sh verify-v220-responsive-task-shell
./server.sh verify-v220-design-token-refresh
./server.sh verify-v220-component-primitives
./server.sh verify-v230-ui-renderer-module-decomposition
```

실제 브라우저 확인 명령은 `./server.sh verify-ops-client-ui --screenshots`입니다.
이 안내 자체는 실행 승인이나 UI 풀테스트·장시간 PASS가 아닙니다.
실행 승인·격리·기록 기준은 [검증 정책](stream-verification.md#검증-정책),
실제 UI 증거 기준은 [UI 풀테스트](manual-ui-fulltest.md)를 따릅니다.

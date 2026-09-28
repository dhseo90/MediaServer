# 제품 UI 공통 구성요소 예시

schema: `media-server.product-shell-component-examples.v1`

Auth·Ops·Client 화면을 수정하는 개발자를 위한 공통 helper와 HTML 구조 안내입니다.
사용 흐름·권한은 [UI 가이드](ui-guide.md), 상태 문구는
[빈 상태·로딩·오류 문구](ui-empty-loading-error-copy-matrix.md)를 기준으로 봅니다.
새 class나 색상을 추가하기 전에 기존 helper와 의미별 CSS 변수(semantic token)를 확인합니다.

아래 코드는 구조를 설명하는 축약 예시이며 완전한 페이지나 동작하는 runtime 구현이 아닙니다.
실제 화면에는 값의 escape, 권한에 따른 출력, 이벤트 연결, 상태 갱신과 세션 정리가 함께 필요합니다.

## 구현 위치와 공통 경계

| 영역 | 실제 구현 | 재사용 기준 |
| --- | --- | --- |
| Ops shell | [product_ui_server_pages.cpp](../src/ingress/product_ui_server_pages.cpp)의 `AppendOpsShellStart/End`, `AppendProductAccountMenu` | `app-chrome`, `app-brand`, `image-nav-tabs`, `account-menu` |
| Auth shell | [product_ui_auth_pages.cpp](../src/ingress/product_ui_auth_pages.cpp)의 `AppendAuthShellStart/End` | 해당 파일 내부 helper로 로그인·초기 설정·초대·접근 요청 화면 구성 |
| Client shell | [webrtc_http_server.cpp](../src/ingress/webrtc_http_server.cpp)의 `ClientShellPageHtml()` | 허용된 view와 미리보기 여부를 전달하고 Client 메뉴 구성 |
| 공통 스타일 | [product_ui_css.cpp](../src/ingress/product_ui_css.cpp)의 `ProductUiCss()`, `ProductDesignTokensCss()` | light/dark 공통 token, 버튼, `section-card`, `metric-card`, 반응형 표 |
| C++ 구성요소 | [product_ui_components.cpp](../src/ingress/product_ui_components.cpp) | `ProductUiToolbarHtml`, `ProductUiSectionCardHtml`, `ProductUiStatusBadgeHtml`, `ProductUiTableShellHtml`, `ProductUiDetailsPanelHtml`, `ProductUiEmptyStateHtml` |
| 공통 JS | [product_ui_js.cpp](../src/ingress/product_ui_js.cpp)의 `ProductSharedUiScript()` | `window.MediaServerUi`의 번역·상태·표·상세·감사 helper |
| Client 라이브 | [product_ui_client_scripts.cpp](../src/ingress/product_ui_client_scripts.cpp)의 `AppendClientShellScript()`, [product_ui_client_css.cpp](../src/ingress/product_ui_client_css.cpp)의 `ClientShellCss()` | `live-monitor`, `live-source-tree`, `live-workspace`, `tile`을 같은 shell 안에서 구성 |

위 소스의 공통 스타일·selector와 route별 controller를 함께 대조합니다.
버튼의 `button-primary`, `button-secondary`, `ghost`, `danger`는 CSS 표현이며,
위험 작업에만 `danger`를 사용합니다. 스타일 class나 숨김 속성이 API 권한 검사를 대신하지 않습니다.

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

실제 브라우저 확인 명령은 `./server.sh verify-ops-client-ui --screenshots`입니다.
이 안내 자체는 실행 승인이나 UI 풀테스트·장시간 PASS가 아닙니다.
실행 승인·격리·기록 기준은 [검증 정책](stream-verification.md#검증-정책),
실제 UI 증거 기준은 [UI 풀테스트](manual-ui-fulltest.md)를 따릅니다.

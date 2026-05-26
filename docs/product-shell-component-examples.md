# Product Shell Component Examples

schema: `media-server.product-shell-component-examples.v1`
updated: 2026-05-16

이 문서는 v1.8.0 UI visual regression 후속에서 도입되어 v1.8.0에서도 유지되는
Auth, Ops, Client product shell과 component vocabulary 예시 모음입니다. 새 화면을 만들거나 기존 화면을 다듬을 때
아래 예시를 먼저 확인하고, 새 class나 token을 만들기 전에 기존 helper와 semantic token으로 표현할 수
있는지 확인합니다.

## 공통 경계

| 영역 | 우선 사용할 소스 | 예시 class/helper | 주의 |
| --- | --- | --- | --- |
| Shell chrome | `AppendOpsShellStart/End`, `AppendAuthShellStart/End`, `ClientShellPageHtml()` | `app-chrome`, `app-brand`, `image-nav-tabs`, `account-menu` | `/ops/events`는 primary nav에 넣지 않고 직접 route/진단 화면으로 둡니다. |
| Cards | `ProductUiCss()` | `section-card`, `metric-card`, `table-empty`, `empty-state` | section 안에 다시 장식 card를 중첩하지 않습니다. |
| Actions | `ProductSharedUiScript()` | `button-primary`, `button-secondary`, `ghost`, `danger` | 위험 작업만 danger를 사용합니다. |
| Tables | `ProductSharedUiScript()` route helpers | `ops-responsive-table`, `ops-row-actions`, `data-label` | 320/390px에서 row action과 date/time input이 부모 폭을 넘지 않아야 합니다. |
| Detail panels | `ProductSharedUiScript()` | `ops-detail-panel`, `ops-audit-panel`, `root-cause-*` | raw JSON은 운영자 debug details 접힘 영역에만 둡니다. |
| Client live | `ClientShellCss()`, `AppendClientShellScript()` | `live-monitor`, `live-source-tree`, `live-workspace`, `tile`, `tile-*` | source tree/workspace/dock/menu를 같은 shell 안에서 구성하고, viewer에게 source URL, Developer URL, raw JSON, debug counter를 노출하지 않습니다. |

## Product Shell

운영 화면은 compact brand, primary nav, account menu, page actions를 한 shell 안에서 유지합니다.
nav 항목은 `Home`, `Dashboard`, `Channels`, `Rules`, `Users`, `Client Preview` 기준입니다.
`/ops/events`는 primary nav가 아니라 Dashboard 내부 섹션 또는 직접 route로 취급합니다.

```html
<header class="app-chrome">
  <div class="app-nav-cluster">
    <a class="app-brand" href="/ops/home">MediaServer</a>
    <nav class="image-nav-tabs" aria-label="Ops navigation">
      <a class="image-nav" href="/ops/home">Home</a>
      <a class="image-nav" href="/ops/dashboard">Dashboard</a>
      <a class="image-nav" href="/ops/sources">Channels</a>
      <a class="image-nav" href="/ops/rules">Rules</a>
      <a class="image-nav" href="/ops/users">Users</a>
      <a class="image-nav" href="/client/live">Client Preview</a>
    </nav>
  </div>
  <div class="account-menu">
    <div class="account-menu-top">
      <div class="account-identity">...</div>
    </div>
    <form method="post" action="/logout">
      <button class="button-secondary" type="submit">로그아웃</button>
    </form>
  </div>
</header>
```

새 shell을 추가할 때는 markup을 route별 page script에 직접 복사하지 않고 기존 shell helper를 먼저
확장합니다. route별 API payload나 schema 변환은 shell helper에 넣지 않습니다.

## Metric And Section Cards

Metric은 빠른 scan용이고 section card는 작업 표면입니다. 같은 줄에 너무 많은 badge를 쌓지 않고,
상태가 비어 있을 때는 `table-empty`나 `empty-state`로 다음 행동을 알려줍니다.

```html
<section class="section-card" aria-labelledby="source-health-title">
  <div class="section-card-header">
    <div>
      <p class="eyebrow">Source Health</p>
      <h2 id="source-health-title">라이브 소스 상태</h2>
    </div>
    <button class="button-secondary" type="button">재검증</button>
  </div>
  <div class="metric-grid">
    <article class="metric-card">
      <span class="metric-label">Retryable</span>
      <strong class="metric-value">2</strong>
      <span class="status-badge warning">확인 필요</span>
    </article>
  </div>
</section>
```

새 색상은 card 내부에 직접 hex/rgb를 추가하지 않고 `ProductDesignTokensCss()` semantic token으로
먼저 정의합니다.

## Dense Tables

Ops 목록은 반응형 table class와 row action helper를 사용합니다. 모바일 카드형 row에서도
각 cell은 `data-label`을 가져야 하며, action 버튼은 `ops-row-actions` 안에 둡니다.

```html
<table class="ops-responsive-table">
  <thead>
    <tr>
      <th>Channel</th>
      <th>Status</th>
      <th>Action</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td data-label="Channel">channel-1</td>
      <td data-label="Status"><span class="status-badge success">정상</span></td>
      <td data-label="Action">
        <div class="ops-row-actions">
          <button class="ghost" type="button">상세</button>
          <button class="button-secondary" type="button">재시도</button>
        </div>
      </td>
    </tr>
  </tbody>
</table>
```

## Detail And Audit Panels

상세 패널은 선택된 행의 운영자 action을 모아 보여주고, 감사 로그는 table 아래의 audit panel에 둡니다.
Debug/raw payload는 펼침 영역에만 두고 기본 화면에는 요약과 이동 링크만 둡니다.

```html
<aside class="ops-detail-panel" aria-label="Channel detail">
  <header class="ops-detail-header">
    <h2>채널 상세</h2>
    <button class="ghost" type="button">닫기</button>
  </header>
  <dl class="detail-grid">
    <dt>PublishedView</dt>
    <dd>view-1</dd>
  </dl>
</aside>

<section class="ops-audit-panel">
  <div class="section-card-header">
    <h2>변경 이력</h2>
    <button class="button-secondary" type="button">필터 적용</button>
  </div>
</section>
```

## Client Live Tile

Client shell은 viewer가 실제로 볼 정보만 남깁니다. 타일 control에는 타일 번호가 들어간
accessible name을 유지하고, keyboard focus와 선택 상태 및 숨김 상태 요약을 같은 언어로
읽을 수 있어야 합니다.

```html
<article class="tile" tabindex="0" role="group" aria-label="타일 1: 라이브" aria-describedby="liveTileStatus0">
  <div class="tile-stage"></div>
  <div class="tile-controls">
    <select aria-label="타일 1 보기 방식">
      <option>Fit</option>
      <option>Fill</option>
    </select>
  </div>
  <div class="tile-actions">
    <button type="button" aria-label="타일 1 시작">시작</button>
    <button type="button" aria-label="타일 1 재연결">재연결</button>
    <button type="button" aria-label="타일 1 정지">정지</button>
  </div>
  <p id="liveTileStatus0" class="sr-only" data-role="a11y-status" aria-live="polite" aria-atomic="true">
    타일 1: 채널 미선택 · 상태 오프라인 · 연결 연결 끊김 · 트랙 미제공 · 이벤트 미제공 · 메타데이터 미제공 · 재시도 0
  </p>
</article>
```

Client 화면에는 다음을 넣지 않습니다.

- source URL 또는 ONVIF endpoint
- Developer URL
- raw JSON 또는 debug counter
- rule/profile editor
- 내부 token/hash/session id

## Copy And Locale

사용자에게 보이는 새 한국어 문구를 추가하면 `ProductSharedUiScript()` English translation map 또는
translation pattern도 함께 보강합니다. 반복되는 label은 개별 문자열을 늘리기보다 pattern으로
검증합니다.

검증 기준:

- `./server.sh verify-product-shell-examples`
- `./server.sh verify-ui-copy-i18n-parity`
- `./server.sh verify-product-ui-token-drift`
- `./server.sh verify-ops-client-ui --screenshots`
- `./server.sh verify-docs-links`

# UI 빈 상태·로딩·오류 문구

schema: `media-server.ui-copy-matrix.v1`

제품 UI를 수정하는 개발자를 위한 대표 상태 문구와 확인 위치입니다.
화면 사용법·권한은 [UI 가이드](ui-guide.md), HTML 구조·helper는
[공통 구성요소 예시](product-shell-component-examples.md)를 봅니다.
아래 표는 현행 구현의 문구와 표시 조건을 설명하며 모든 메시지의 전수 목록이나 실제 실행 결과는 아닙니다.

## 원칙

| 상태 | 기준 문구 | 사용 기준 |
| --- | --- | --- |
| Loading | `불러오는 중` / `현장 상태 불러오는 중` | 요청·초기화 대기를 알림. 화면마다 동일한 문구나 로딩 표시가 있는 것은 아님 |
| Empty | `없습니다` / `미제공` | 표시할 항목이 없거나 값이 제공되지 않은 상태. 권한상 미제공과 수집 실패를 정상·0건으로 단정하지 않음 |
| Error | `불러오지 못했습니다` / `오류` | 요청 실패, 권한 실패, 설정 오류처럼 사용자가 재시도 또는 관리자 확인이 필요한 때 |

오류에는 확인할 대상과 다음 행동을 알려주되 viewer/client에 source URL, raw JSON, debug counter,
Developer URL이나 인증·세션 정보를 노출하지 않습니다. 공통 요청 helper나 HTML escape만으로
민감한 오류 내용이 제거되는 것은 아니므로 응답 경계와 표시 내용을 함께 검토합니다.

## 화면별 대표 문구

Client의 primary nav는 Live/Dashboard입니다. `/client/events`는 직접 route이며 메뉴 항목이 아닙니다.
Ops의 `/ops/events`도 primary nav가 아닌 직접 진단 route입니다.

| 화면 | Empty | Loading | Error | CTA / 다음 행동 |
| --- | --- | --- | --- | --- |
| `/client/live` | `Live view가 없습니다`; 이벤트 dock의 `소스 선택 필요`, `최근 이벤트 없음` | 초기화 `라이브 레이아웃 불러오는 중`; tile 상태 `연결 중` | tile chip `오류`; 이벤트 dock `이벤트를 불러오지 못했습니다` | 채널 배치·재생·새로고침. 채널이 없으면 viewer는 `/client/request-access`, 미리보기는 `/ops/sources` |
| `/client/dashboard` | `대시보드 채널이 없습니다`, `비교할 채널이 없습니다`, `필터에 맞는 채널이 없습니다`, `최근 이벤트 없음` | `현장 상태 불러오는 중` | 상세 `상태를 불러오지 못했습니다`; 비교 카드 `조회 실패` | 필터·채널 변경 또는 접근 요청 |
| `/client/events` | `이벤트 채널이 없습니다`, `최근 이벤트 없음` | `현장 상태 불러오는 중` | `상태를 불러오지 못했습니다` | 채널 선택 또는 접근 요청 |
| `/ops/dashboard` | `최근 인시던트 없음`, `활성 시나리오 인스턴스가 없습니다.`, `트래킹 이슈 없음` 뒤 집계 | `런타임 상태를 불러오는 중입니다.` 등 영역별 초기 문구 | `디버그 조회 실패`; 오류 본문이 없을 때 `VA 런타임 디버그를 불러오지 못했습니다.` | 관련 화면·근본 원인 안내 확인 |
| `/ops/rules` | `저장된 채널 분석 설정이 없습니다.`, `저장 전 차단 항목이 없습니다.` | 후보 영역 `후보를 불러오는 중입니다.`; 이벤트 템플릿 상세 초기 문구 `조건, geometry, cooldown을 불러오는 중입니다.` | `룰 편집기 로드 실패: …`, `저장 전 검증 실패: …` | 필요한 설정 생성 또는 차단 항목 수정 |
| `/ops/events` | `조회된 이벤트 기록이 없습니다.` | 저장소·Event POST 요약의 `불러오는 중`; 목록 초기 안내는 `최근 25개 기록을 조회합니다.` | `조회 실패: …`, `bundle token 발급 실패: …` | 필터 변경 또는 evidence 설정 확인 |
| Ops 감사 패널 (`ops-audit-panel`) | `아직 기록된 변경 이력이 없습니다.` | 전용 로딩 문구 없음: 브라우저 캐시를 먼저 표시하고 서버 조회 | 캐시도 비었을 때 `서버 감사 로그를 불러오지 못했습니다.` | 필터 변경 또는 서버 감사 로그 확인 |

Dashboard/Events의 공통 할당 채널 영역은 view가 없을 때 `할당된 PublishedView가 없습니다`를 표시합니다.
Client Live의 선택 타일 상세 조회 실패는 별도 고정 제목 대신 오류 본문 또는 `미제공`을 표시하므로,
Dashboard/Events의 `상태를 불러오지 못했습니다`와 혼동하지 않습니다.
표의 `…`는 동적 오류 내용이며 실제 고정 문구가 아닙니다.

## 구현·번역 확인 위치

- [Client controller](../src/ingress/product_ui_client_scripts.cpp): `emptyState`, `renderAssignedViews`,
  `renderLiveMonitor`, `updateTileDom`, `refreshLiveDockEventFeed`, `refreshSelectedTileDetail`,
  `renderDashboardCompare`, `renderEvents`, `loadDetail`.
- [Ops controller](../src/ingress/product_ui_page_scripts.cpp): Dashboard 진단, `renderEventRows`,
  `bindEvidenceBundleActions`, `openOpsRulesEditor`와 저장 전 검증.
  초기 화면 문구는 [Ops page markup](../src/ingress/product_ui_server_pages.cpp)에도 있습니다.
- [공통 JS](../src/ingress/product_ui_js.cpp): `renderOpsAuditTrail`의 캐시/서버 전환과 오류 조건,
  `ProductSharedUiScript()`의 한국어→영어 map/pattern. 문구 변경 시 접근성 이름·동적 접두사도 함께 검토합니다.

Client 타일 숨김 상태의 기준은 보호된
[`client_live_tile_a11y_i18n_snapshot.json`](../test/fixtures/client_live_tile_a11y_i18n_snapshot.json)입니다.
`offline-empty`, `live-normal`, `stale-reconnecting`, `error-failed` 네 번역 시나리오와
`[data-role="a11y-status"]`의 `sr-only`, `aria-live="polite"`, `aria-atomic="true"` 요구를 유지합니다.
snapshot은 테스트 정의이지 이번 실행 결과가 아닙니다.

## 확인 명령과 실행 경계

```sh
./server.sh verify-ui-copy-matrix
./server.sh verify-ui-copy-i18n-parity
./server.sh verify-docs-links
```

위 명령은 문서·구현 식별자·번역의 정적 확인입니다. 실제 UI smoke는
`./server.sh verify-ops-client-ui`, 화면·숨김 상태 DOM 확인은
`./server.sh verify-ops-client-ui --screenshots`를 사용합니다.
후자는 실제 `/client/live`에서 snapshot의 `domExtraction` 기준을 확인하는 경로를 포함하지만,
명령이나 fixture가 있다는 사실을 UI 풀테스트 PASS로 취급하지 않습니다.
실제 UI·장시간 실행 승인과 기록 기준은 [검증 정책](stream-verification.md#검증-정책),
증거 적격성은 [UI 풀테스트](manual-ui-fulltest.md)를 따릅니다.

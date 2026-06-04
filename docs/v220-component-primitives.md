# v2.2.0 Component Primitives

이 문서는 `V220-S04 Component primitives`의 산출물입니다. 목적은 S05~S08 route
redesign 전에 반복되는 card, toolbar, tab, segmented control, table, drawer, form row,
status badge, empty/loading/error state를 C++ helper API로 묶어 route template의
문자열 중복과 layout drift를 줄이는 것입니다.

S04는 전체 화면 재배치 단계가 아닙니다. `/ops`, `/client`, `/setup`, `/login`의
route별 visual redesign, 브라우저 UI 풀테스트 PASS, 30분 soak, 120분 longrun은 S04
완료 근거가 아닙니다.
UI 풀테스트 PASS는 S04 완료 근거가 아닙니다.

## Helper Source

S04 helper의 source-of-truth는 아래 파일입니다.

- `include/ingress/product_ui_components.h`
- `src/ingress/product_ui_components.cpp`

`CMakeLists.txt`는 `src/ingress/product_ui_components.cpp`를 빌드 대상에 포함합니다.

## Primitive API

| Primitive | Helper | 역할 |
| --- | --- | --- |
| Section/card | `ProductUiSectionCardHtml` | `section-card` 구조와 optional toolbar/body를 생성 |
| Toolbar | `ProductUiToolbarHtml` | title/subtitle/action 영역을 같은 markup으로 생성 |
| Tab | `ProductUiNavTabsHtml` | `nav-tabs` 기반 route/tab action 묶음 생성 |
| Segmented control | `ProductUiSegmentedControlHtml` | `rule-mode-grid` 기반 mode button 묶음 생성 |
| Table shell | `ProductUiTableShellHtml` | `table-wrap` + table header/body shell 생성 |
| Drawer/details panel | `ProductUiDetailsPanelHtml` | `collapsed-editor` details panel 생성 |
| Form row | `ProductUiFormRowHtml` | label/control/help row 생성 |
| Status badge | `ProductUiStatusBadgeHtml`, `ProductUiBadgeRowHtml` | `chip`, `badge-row` 상태 묶음 생성 |
| Empty/loading/error state | `ProductUiEmptyStateHtml`, `ProductUiLoadingStateHtml`, `ProductUiErrorStateHtml` | 초기/오류 상태 copy를 같은 class로 생성 |

## 적용 범위

S04는 helper API를 만들고, 정적 서버 template의 최소 소비 지점을 연결합니다.

- Auth login form은 `ProductUiFormRowHtml`을 소비합니다.
- Auth landing badge는 `ProductUiStatusBadgeHtml`을 소비합니다.
- Ops dashboard 상단 toolbar와 summary cards는 `ProductUiToolbarHtml`,
  `ProductUiSectionCardHtml`, `ProductUiBadgeRowHtml`을 소비합니다.
- Ops dashboard 초기 empty state는 `ProductUiEmptyStateHtml`을 소비합니다.

JS runtime rendering helper와 route별 full replacement는 S05~S08 route redesign에서
진행합니다. S04에서 모든 기존 문자열을 한 번에 치환하지 않습니다.

## S05~S08 입력값

- S05 Ops workspace redesign은 `ProductUiSectionCardHtml`, `ProductUiToolbarHtml`,
  `ProductUiTableShellHtml`, `ProductUiEmptyStateHtml`을 기본 조합으로 사용합니다.
- S06 Rules workspace redesign은 `ProductUiSegmentedControlHtml`,
  `ProductUiDetailsPanelHtml`, `ProductUiTableShellHtml`을 사용합니다.
- S07 Client live redesign은 viewer-safe dock/card/table primitive를 이 helper
  naming과 token 기준에 맞춰 확장합니다.
- S08 Auth/setup redesign은 `ProductUiFormRowHtml`과 status/error helper를 사용합니다.

## 변경 금지 경계

S04는 아래를 변경하지 않습니다.

- Event POST/WebRTC/SSE/WS metadata schema
- RTSP/WebRTC media path
- Auth/session/scope contract
- Rule/Profile payload schema
- `/ops/rules` smoke selector와 저장 roundtrip
- client/viewer source URL, Developer URL, raw JSON, debugCounters, BBox diagnostics,
  rule/profile editor 비노출 정책

## 검증

S04 완료 evidence:

```bash
./server.sh verify-v220-component-primitives
./server.sh verify-v220-design-token-refresh
./server.sh verify-product-ui-token-drift
./server.sh verify-ops-tables-layout
./server.sh verify-ops-client-ui --browser-mode static
./server.sh verify-docs-links
./server.sh verify-script-inventory
git diff --check
```

이 검증은 component primitive helper 경계와 정적 UI shell contract를 확인합니다.
브라우저 UI 풀테스트, visual redesign mockup, 30분 soak, 120분 longrun은 실행하지
않습니다.

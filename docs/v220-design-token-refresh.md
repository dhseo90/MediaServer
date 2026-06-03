# v2.2.0 Design Token Refresh

이 문서는 `V220-S03 Design token refresh`의 산출물입니다. 목적은 v2.2.0 UI
재배치에 앞서 색상뿐 아니라 typography, density, spacing, component 치수를
`ProductDesignTokensCss()` 단일 source-of-truth로 정리하는 것입니다.

S03은 route redesign 단계가 아닙니다. 실제 `/ops`, `/client`, `/setup`, `/login`
화면 재배치, visual redesign mockup, 브라우저 UI 풀테스트 PASS는 S03 완료 근거가
아닙니다.
UI 풀테스트 PASS는 S03 완료 근거가 아닙니다.

## Token Source

`ProductDesignTokensCss()`는 아래 token family를 제공합니다.

| Family | Token 예시 | 역할 |
| --- | --- | --- |
| Color/theme | `--color-*`, `--overlay-*` | light/dark theme-aware surface, state, media, overlay 색상 |
| Spacing/radius/shadow | `--space-*`, `--radius-*`, `--shadow-*` | 공통 여백, card radius, elevation |
| Typography | `--font-ui`, `--font-mono`, `--font-size-*`, `--line-height-*` | 제품 UI/운영 debug text의 font 기준 |
| Density | `--control-height-*`, `--icon-button-size`, `--panel-padding`, `--card-padding` | 320/390/760/1180+ viewport에서 control 높이와 panel 밀도 기준 |
| Component | `--button-*`, `--input-*`, `--table-*`, `--badge-*`, `--debug-details-*` | button/input/table/badge/debug details 공통 primitive 입력값 |

## 적용 기준

- `button`, `.button`, input, select, textarea, table cell, badge/chip, raw debug `pre`
  계열은 component token을 소비합니다.
- UI font는 `--font-ui`, 운영 debug/code text는 `--font-mono`를 소비합니다.
- font size는 viewport width에 비례해 흔들리지 않아야 하며, `font-size:
  clamp(...vw...)` 형태는 쓰지 않습니다.
- table/detail/debug details token은 S04 component primitive가 그대로 재사용할 수
  있어야 합니다.

## Responsive 연결

S02의 viewport 기준은 S03 token family에 아래처럼 연결됩니다.

| Viewport | S03 token 기준 |
| --- | --- |
| 320 | `--control-height-lg`, `--table-row-min-height`, `--badge-height`가 touch target과 줄바꿈 안정성을 보장해야 함 |
| 390 | `--button-*`, `--input-*`, `--panel-padding`으로 compact single-column form/table 흐름을 유지 |
| 760 | `--card-padding`, `--panel-padding`, `--table-cell-padding-*`로 stacked panel 밀도를 유지 |
| 1180+ | `--font-size-*`, `--control-height-md`, `--table-cell-padding-*`로 dense 운영 콘솔 scan/compare/action을 유지 |

## S04 입력값

S04 component primitive는 이 문서의 component token을 입력값으로 사용합니다.

- `ResponsiveTaskShell`: route별 primary/secondary/detail 배치가 panel/card padding
  token을 사용합니다.
- `DetailDrawerPanel`: drawer/side panel의 padding, radius, elevation을 token에서
  가져옵니다.
- `ResponsiveTable`: row height, cell padding, badge density를 token에서 가져옵니다.
- `FormGrid`: input height, padding, label/help line-height를 token에서 가져옵니다.
- `DebugDetails`: raw JSON은 운영자 debug details 접힘 영역에서만
  `--debug-details-*` token을 사용합니다.

## 변경 금지 경계

S03은 아래를 변경하지 않습니다.

- Event POST/WebRTC/SSE/WS metadata schema
- RTSP/WebRTC media path
- Auth/session/scope contract
- Rule/Profile payload schema
- `/ops/rules` smoke selector와 저장 roundtrip
- client/viewer source URL, Developer URL, raw JSON, debugCounters, BBox diagnostics,
  rule/profile editor 비노출 정책

## 검증

S03 완료 evidence:

```bash
./server.sh verify-v220-design-token-refresh
./server.sh verify-product-ui-token-drift
./server.sh verify-ops-client-ui --browser-mode static
./server.sh verify-docs-links
./server.sh verify-script-inventory
git diff --check
```

이 검증은 design token refresh와 정적 UI shell contract를 확인합니다. 브라우저 UI
풀테스트 PASS, screenshot evidence, visual redesign mockup, 30분 soak, 120분 longrun은
실행하지 않습니다.

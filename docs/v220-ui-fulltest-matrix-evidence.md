# v2.2.0 UI Fulltest Matrix Evidence

이 문서는 `V220-S09 UI fulltest matrix / evidence`의 산출물입니다. Schema 표기는
`media-server.v220-ui-fulltest-matrix.v1`입니다. 목적은 v2.2.0 S05~S08에서 재배치한
제품 UI를 `media-server.manual-ui-evidence-input.v1` evidence와
`verify-manual-ui-evidence-runner`에 연결하는 것입니다.

S09는 브라우저 UI 풀테스트 PASS를 만들지 않습니다. 이 문서는 UI 풀테스트 실행 전
누락 방지 matrix이며, 30분 soak, 120분 longrun, published metadata 재검증,
release close-out도 실행하지 않습니다. Event POST, WebRTC DataChannel,
SSE/WS metadata, RTSP/WebRTC media path, Auth/session/scope, Rule/Profile payload
schema도 변경하지 않습니다.

## Matrix 범위

| 단계 | 기능 ID | route | control / marker | interaction evidence |
| --- | --- | --- | --- | --- |
| S08 Auth/setup | `UI-002` | `/setup` | `auth-form-grid`, `auth-setup-form`, `auth-password-policy` | weak password 거절, strong password 설정, `/login` redirect |
| S08 Auth/setup | `UI-003` | `/login` | `auth-form-grid`, `auth-login-form` | credential 입력, role landing 확인 |
| S08 Auth/setup | `UI-004` | `/password/change` | `auth-form-grid`, `auth-password-change-form` | 현재/새 비밀번호 입력, history reuse 거절, 최종 로그인 |
| S08 Auth/setup | `UI-007` | `/invite/setup` | `auth-form-grid`, `auth-invite-setup-form` | invite setup 전후 login/client 접근 경계 |
| S08 Auth/setup | `UI-008` | `/client/request-access` | `auth-form-grid`, `auth-access-request-form` | 접근 요청 제출, pending copy, 승인 전 접근 차단 |
| S05 Ops workspace | `UI-009` | `/ops/home` | `ops-workspace-home` | summary/nav/status/action grid 직접 확인 |
| S05 Ops workspace | `UI-010` | `/ops/dashboard` | `ops-workspace-dashboard` | refresh/search/copy/root-cause/runtime/event panel 조작 |
| S05 Ops workspace | `UI-014` | `/ops/events` | `ops-workspace-events` | filter/pagination/evidence action, EventRecord visible row 확인 |
| S06 Rules workspace | `UI-012` | `/ops/rules` | `rules-workspace` | rule/profile/template/scenario 저장 전 validation, preview, save flow |
| S07 Client live | `UI-015` | `/client/live` | `client-live-workspace` | source 선택, tile start/reconnect/stop, dock side, info overlay |
| S07 Client live | `UI-016` | `/client/dashboard` | `client-viewer-dashboard` | viewer scope dashboard filter/sort/copy/status summary |
| S07 Client live | `UI-017` | `/client/events` | `client-viewer-events` | viewer scope event list, direct route, event copy |
| Responsive/theme | `UI-019` | 주요 Auth/Ops/Client route | light/dark | contrast/token/상태 색상 확인 |
| Responsive/theme | `UI-020` | 주요 Auth/Ops/Client route | 1180 viewport | desktop table/form/video 겹침 없음 |
| Responsive/theme | `UI-021` | 주요 Auth/Ops/Client route | 320, 390, 760 viewport | text/control/video horizontal overflow 없음 |
| Redaction/safety | `SAFE-018` | `/client/live`, `/client/dashboard`, `/client/events` | viewer redaction | source URL, Developer URL, raw JSON, debug counter, BBox diagnostics 비노출 |
| Redaction/safety | `SAFE-019` | Auth/Ops/Client route | auth material guard | password/token/session material screenshot/API/UI 비노출 |
| Redaction/safety | `SAFE-020` | Ops/Client route | role guard | admin/operator Ops 접근, viewer Client 접근, viewer Ops 거부 |
| Redaction/safety | `SAFE-021` | Ops destructive action route | blocking dialog policy | native dialog 없음, 제품 화면 안 2회 확인 흐름 |

## Evidence 필드

각 UI 대상 기능 ID의 PASS evidence는 아래 필드를 모두 포함해야 합니다.

- `id`: 기능 ID
- `verdict`: `PASS`
- `route`: 실제 연 route
- `control`: 조작한 control 또는 marker
- `interaction`: 클릭/타이핑/선택/토글/route guard 확인 내용
- `input` 또는 `inputNotApplicableReason`
- `expected`: inventory PASS 기준
- `actual`: 실제 반영 상태
- `stateReflected`: `true`
- `artifacts`: screenshot, runner report, browser evidence 경로
- `logChecked`, `eventRecordChecked`, 또는 `logNotApplicableReason`

누락된 UI 대상 기능 ID는 `FAIL`입니다. raw JSON/API-only 확인, screenshot 생성만 있는
항목, 자동 smoke만 통과한 항목은 UI 풀테스트 PASS가 아닙니다. 제외 항목은 사용자가
명시한 실기기/외부 credential/scope 밖 항목만 판정표 밖 `Exclusions`에 둡니다.

## Responsive / Theme Matrix

S09가 UI 풀테스트 시작 전 요구하는 viewport는 `320`, `390`, `760`, `1180`입니다.
각 route는 light/dark 상태에서 확인해야 하며, 아래를 기록합니다.

- horizontal overflow
- text/control clipping
- form label/input 간격
- table/action overflow
- video/control/status overlay clipping
- focus/selected/disabled/loading/error/empty 상태

## Guard Matrix

- role guard: admin/operator의 Ops 접근, viewer의 Client 접근, viewer의 `/ops/home`
  거부, 승인 전 access request가 login/channel 권한을 만들지 않는 경계
- viewer redaction: client 화면에서 source URL, Developer URL, raw JSON,
  debugCounters, BBox diagnostics, rule/profile editor, provider credential 비노출
- Ops debug boundary: raw JSON과 diagnostic details는 Ops 접힘 영역에만 존재
- Rules boundary: `/ops/rules` smoke selector와 Rule/Profile 저장 흐름 보존
- Auth boundary: Auth/session/scope/role contract와 password/invite/access request
  정책 보존

## 검증

```bash
./server.sh verify-v220-ui-fulltest-matrix-evidence
./server.sh verify-manual-ui-evidence
./server.sh verify-manual-ui-evidence-runner
./server.sh verify-docs-ui-assets
./server.sh verify-feature-inventory-coverage
git diff --check
```

이 검증은 matrix와 문서 연결을 확인합니다. 실제 인앱 브라우저 UI 풀테스트,
30분 soak, 120분 longrun, published metadata 재검증을 대신하지 않습니다.

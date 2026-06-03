# v2.2.0 In-App UI Partial Evidence

이 문서는 v2.2.0 Responsive UI Foundation 후속 UI 검수 중 2026-06-03에 Codex
인앱 브라우저로 직접 확인한 부분 evidence입니다. 전체 UI 풀테스트 PASS가 아니라,
실제로 연 route와 조작한 control만 확인 범위로 둡니다.

## 검수 메타데이터

- run id: `v220-inapp-partial-2026-06-03`
- 검수자: Codex
- 날짜/시간: 2026-06-03 KST
- 브랜치: `v2.2.0`
- 서버 URL:
  - core auth-off: `http://127.0.0.1:8081`
  - auth auto: `http://127.0.0.1:8082`
- 데이터 리셋 방법:
  - `prepare-manual-ui-fulltest-seed --dry-run --emit-registry-dir`
  - throwaway registry: `/private/tmp/media_server_v220_ui_fulltest_registry`
  - throwaway users: `/private/tmp/media_server_v220_ui_fulltest_auth_users.json`
- 브라우저: Codex 인앱 브라우저
- viewport: `320`, `390`, `760`, `1180`
- theme: 대표 Ops/Client route에서 light/dark toggle 확인
- evidence index: `/private/tmp/media_server_v220_ui_fulltest_iab`
- manual evidence schema: `media-server.manual-ui-evidence-input.v1`
- v2.2.0 UI matrix schema: `media-server.v220-ui-fulltest-matrix.v1`
- token usage source: Codex goal usage
- token start: `2819507`
- token end: `3031399`
- token consumed: `211892`
- elapsed: goal cumulative `9310s` at capture time

## 스크립트 테스트

| 명령 | 결과 | 범위 |
| --- | --- | --- |
| `./server.sh build` | PASS | C++ build |
| `./server.sh prepare-manual-ui-fulltest-seed --dry-run --emit-plan /private/tmp/media_server_v220_ui_fulltest_seed_plan.json --emit-registry-dir /private/tmp/media_server_v220_ui_fulltest_registry` | 최초 FAIL 후 PASS | seed release target drift 확인 및 수정 뒤 dry-run/registry emit |
| `./server.sh verify-project-inventory` | 최초 FAIL 후 PASS | manual UI seed matrix가 현재 release `v2.1.0`에 고정되는지 확인 |
| `./server.sh verify-v220-rules-workspace-redesign` | PASS | `/ops/rules` workspace class/source/doc 연결 |

최초 실패 원인은 `test/fixtures/manual_ui_fulltest_va_seed_matrix.json`의
`releaseTarget`이 `v2.0.0`으로 남아 있었기 때문입니다. 현재 `VERSION` 기준은
`2.1.0`이며, seed helper와 project inventory verifier는 `v2.1.0`을 요구합니다.

## UI 직접 확인

| ID | route/control | 확인 결과 | 증적 |
| --- | --- | --- | --- |
| `UI-009` | `/ops/home` | `ops-workspace-home` marker, nav/action grid, 1180/320 overflow 없음 | `ops_home_1180.png`, `ops_home_320.png` |
| `UI-010` | `/ops/dashboard` | `ops-workspace-dashboard` marker, 새로고침 버튼 클릭, overflow 없음 | `responsive-results.json` |
| `UI-014` | `/ops/events` | `ops-workspace-events` marker, EventRecord/event text visible, overflow 없음 | `responsive-results.json` |
| `UI-012` | `/ops/rules` | `rules-workspace`, readiness/assist/catalog/detail panel marker 확인, overflow 없음 | `ops_rules_1180.png`, `ops_rules_320.png` |
| `UI-015` | `/client/live` | source 선택, tile 온라인 전환, 새로고침, 연결 해제 조작. viewer debug/source/raw 문자열 비노출 | `client_live_1180.png`, `client_live_320.png`, `client-live-after-disconnect.png` |
| `UI-016` | `/client/dashboard` | `client-viewer-dashboard` marker, filter/action controls visible, overflow 없음 | `responsive-results.json` |
| `UI-017` | `/client/events` | `client-viewer-events` marker, empty/event copy state visible, overflow 없음 | `responsive-results.json` |
| `UI-002` | `/setup` | weak password 거절, strong password 설정 후 `/login` 이동 | `auth-setup-after-strong.png` |
| `UI-003` | `/login` | admin 로그인 후 `/ops/home` landing | `auth-login-landing.png` |
| `UI-004` | `/password/change` | password change form/policy marker, 이전 비밀번호 재사용 거절 | `auth-password-change.png` |
| `UI-008` | `/client/request-access` | 접근 요청 제출 후 승인 전 접근 차단 안내 표시 | `auth-access-request-submitted.png` |
| `UI-007` | `/invite/setup` | invite setup responsive form boundary 확인. 유효 초대 token으로 end-to-end 완료하지 않음 | `auth-invite-setup-boundary.png` |
| `UI-019` | 대표 Ops/Client theme toggle | 390px에서 light/dark toggle 후 overflow 없음 | `theme-ops-home-390.png`, `theme-client-live-390.png` |
| `UI-020` | 1180 viewport | 7개 route marker/overflow/redaction sweep 실패 0건 | `responsive-results.json` |
| `UI-021` | 320/390/760 viewport | 7개 route marker/overflow/redaction sweep 실패 0건 | `responsive-results.json` |
| `SAFE-018` | client viewer redaction | `/client/live`, `/client/dashboard`, `/client/events`에서 source URL, Developer URL, raw JSON, debugCounters, BBox diagnostics 비노출 | `responsive-results.json` |
| `SAFE-019` | auth material guard | setup/login/change/request screenshot에 password hash/token/session material 비노출 | auth screenshot set |
| `SAFE-020` | role guard | admin login landing은 확인. viewer Ops 거부는 이번 부분 검수에서 미실행 | `auth-login-landing.png` |
| `SAFE-021` | blocking dialog policy | 이번 부분 검수 중 native alert/confirm/prompt는 관찰되지 않음. destructive 2회 확인 흐름 전수 검수는 미실행 | 인앱 브라우저 관찰 |

## 미완료/미확인

- 이 문서는 v2.2.0 전체 UI 풀테스트 PASS가 아닙니다.
- `verify-manual-ui-evidence-runner --evidence <json>`용 244개 UI 대상 전수 evidence
  JSON은 아직 작성하지 않았습니다.
- viewer 계정 login, viewer `/ops/*` 거부, 승인된 invite setup end-to-end,
  `/ops/users` access request 승인/거절 flow는 이번 부분 검수에서 미실행입니다.
- VA rule/scenario별 EventRecord 발생 이력 전수 확인은 미실행입니다.
- 30분 soak, 120분 longrun, published metadata 재검증, release close-out은 미실행입니다.

## 판정

- 부분 evidence 판정: PASS
- v2.2.0 UI 풀테스트 전체 판정: FAIL
- FAIL 이유: UI 대상 244개 기능 ID 전수 evidence와 role/EventRecord/장시간/release
  gate가 아직 완료되지 않았습니다.

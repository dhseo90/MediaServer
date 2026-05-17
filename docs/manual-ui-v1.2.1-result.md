# Manual UI Result - v1.2.1 Patch Evidence

이 문서는 `V121-P0-03 Manual UI full-test evidence` 결과입니다.
자동 smoke 결과와 실제 Chrome에서 직접 열어 본 화면을 분리해 기록합니다.

## 검수 메타데이터

- run id: `v121-manual-ui-20260517-kst`
- 검수자: Codex, Chrome + Computer Use
- 날짜/시간: 2026-05-17 KST
- 브랜치/커밋: `v1.2.1`, 기록 작성 직전 HEAD `7bd9713`
- 서버 URL: `http://127.0.0.1:8081`
- auth mode: 제품 UI 수동 확인 서버는 `MEDIA_SERVER_AUTH_MODE=off`
- users/source/view fixture: 기본 seed 구성, request-access form submit 없음, destructive action 없음
- 브라우저: Google Chrome local window
- viewport: desktop Chrome window, screenshot smoke는 `320,390,760,1180`
- screenshot artifact: `/tmp/media_server_v121_manual_ui_20260517/screenshots`

## 관련 자동 검증

| 명령 | 결과 | 비고 |
| --- | --- | --- |
| `./server.sh verify-ops-client-ui --http-base http://127.0.0.1:8081 --screenshots --output-dir /tmp/media_server_v121_manual_ui_20260517/screenshots` | PASS | sandbox 내부 첫 실행은 local fetch/CDP 제한으로 실패, 권한 밖 재실행 기준 route/API `16/0`, screenshot `28/0`, mobile/header/keyboard/audit/ONVIF smoke 모두 `0` 실패 |
| `./server.sh verify-rule-ui --http-base http://127.0.0.1:8081 --output-dir /tmp/media_server_v121_manual_ui_20260517/rule-ui` | PASS | pre-save validation, nav round-trip, mobile geometry 통과 |
| `./server.sh verify-docs-ui-assets` | PASS | README/UI guide screenshot asset policy 통과 |
| `./server.sh verify-auth-bootstrap` | PASS | isolated auth server 기준 `14/0` |
| `./server.sh verify-auth-users` | PASS | isolated auth server 기준 `57/0` |
| `./server.sh verify-auth-routes` | PASS | isolated auth server 기준 `114/0` |

## 확인됨

실제로 Chrome에서 열고 클릭한 화면만 적습니다.

| 화면 | 계정/권한 | 직접 조작 | 기대 결과 | 실제 결과 | 판정 |
| --- | --- | --- | --- | --- | --- |
| `/setup` | auth-off manual server | URL 직접 열기 | auth off에서는 setup flow를 열지 않음 | `{"error":"setup is not enabled for this auth mode"}` 표시. 실제 setup flow는 `verify-auth-bootstrap`에서 확인 | SKIPPED(auth-off), auth smoke PASS |
| `/login` | unauth | URL 직접 열기 | 로그인 form 표시 | 계정명/비밀번호 field와 로그인 버튼 표시. credential submit은 하지 않음 | PASS(visual) |
| `/ops/home` | admin preview, auth off | Chrome에서 첫 화면 확인 | Ops primary nav와 account header 표시 | Home/Dashboard/Channels/Rules/Users/Client Preview nav, Development Admin header, 운영 구성/실시간 상태 표시 | PASS |
| `/ops/dashboard` | admin preview, auth off | primary nav 클릭 | runtime/root-cause/incident panels 표시 | 상태 요약, 문제 원인, 최근 인시던트 흐름, VA quality 영역 표시 | PASS |
| `/ops/sources` | admin preview, auth off | primary nav 클릭 | channel table과 copy controls 표시 | 5개 seed 채널, RTSP/WHEP copy, ONVIF sample, audit filter/export controls 표시 | PASS |
| `/ops/rules` | admin preview, auth off | primary nav 클릭 | rule/profile/scenario 준비 상태와 validation 표시 | 저장 전 검증, 먼저 준비할 항목, category toggle, empty table 표시 | PASS |
| `/ops/users` | admin preview, auth off | primary nav 클릭 | lifecycle policy, users, access requests 표시 | 계정 라이프사이클 정책, admin row, 접근 요청 empty state, audit export controls 표시 | PASS |
| `/ops/events` | admin preview, auth off | direct route 열기 | primary nav가 아닌 diagnostic route로 표시 | direct/diagnostic route 문구, evidence policy, Event POST/storage status, event table 표시 | PASS |
| `/client/live` | admin preview, auth off | Client Preview nav 클릭 | Client primary nav는 Live/Dashboard만 표시 | `Client Preview as admin` 표시, Live/Dashboard nav와 admin용 Ops return link 표시, tile controls 표시 | PASS |
| `/client/dashboard` | admin preview, auth off | client nav 클릭 | dashboard summary와 comparison 표시 | 할당 채널, 현장 요약, 클라이언트 범위, 채널 비교, 이벤트 empty state 표시 | PASS |
| `/client/request-access` | public | URL 직접 열기 | 승인 전 접근이 열리지 않는 안내와 request form 표시 | “관리자 승인 전에는 로그인이나 채널 접근이 허용되지 않습니다” 문구와 form 표시. 제출은 하지 않음 | PASS(visual, no submit) |

## 접근 요청 검수

- pending request 생성: 실행하지 않음. local manual run에서는 form submit을 수행하지 않았습니다.
- `/ops/users` pending row 확인: empty state 확인.
- 승인 채널 ID 입력: 실행하지 않음.
- approve 후 invite 출력: 실행하지 않음.
- invite setup 전 login 결과: `verify-auth-users`, `verify-auth-routes`에서 확인.
- invite setup 후 `/client/live` 결과: `verify-auth-users`, `verify-auth-routes`에서 확인.
- invite setup 후 `/ops/home` 결과: `verify-auth-routes`에서 viewer/operator/integrator route guard로 확인.
- 거절 flow 실행 여부: `verify-auth-users`에서 API 기준 확인.

## 비노출 확인

client/viewer 화면 기준입니다. Ops 화면의 운영자용 source/copy 정보는 이 항목의 금지 대상이 아닙니다.

- source URL: PASS. `/client/live`, `/client/dashboard` manual 화면과 `verify-ops-client-ui` rendered/API leak smoke에서 client source locator 미노출 확인.
- Developer URL: PASS.
- raw JSON: PASS.
- debug counter: PASS.
- BBox diagnostics: PASS.
- rule/profile editor: PASS.
- Ops/Lab primary navigation: PASS. admin preview 상태에서는 `Client Preview as admin`과 Ops return link가 보이며, client primary nav 자체는 Live/Dashboard만 표시.

## 반응형/테마 확인

| viewport | theme | 확인 화면 | overflow/겹침 | 판정 |
| --- | --- | --- | --- | --- |
| 320px | light | automated screenshots: ops home/dashboard/rules/sources/users, client live/dashboard | overflow `0` | PASS |
| 390px | light | automated screenshots: ops home/dashboard/rules/sources/users, client live/dashboard | overflow `0` | PASS |
| 760px | light | automated screenshots: ops home/dashboard/rules/sources/users, client live/dashboard | overflow `0` | PASS |
| 1180px | light | automated screenshots: ops home/dashboard/rules/sources/users, client live/dashboard | overflow `0` | PASS |
| desktop | dark | `/ops/events` manual toggle | text/card/table contrast maintained at observed viewport | PASS |

## 실패

| 화면 | 재현 조작 | 기대 결과 | 실제 결과 | 로그/스크린샷 | 영향 범위 |
| --- | --- | --- | --- | --- | --- |
| 없음 | - | - | - | - | - |

## 미확인

- 장시간 테스트: 실행하지 않음.
- `verify-predev`: 실행하지 않음. 사용자 명시 요청 없음.
- 실장비/외부 네트워크: ONVIF 실장비, 외부 TURN/WHEP credential, YouTube 실제 URL relay는 실행하지 않음.
- destructive action: 채널 삭제, 사용자 비활성화, access request submit/approve/reject를 manual Chrome run에서는 수행하지 않음. 관련 API/route는 auth smoke로 확인.
- 실제 viewer credential을 브라우저에 입력하는 수동 로그인: 수행하지 않음. isolated auth smoke로 대체 확인.

## 건너뜀

| 항목 | 이유 | 후속 확인 조건 |
| --- | --- | --- |
| `/setup` 실제 admin 생성 manual submit | manual product UI 서버가 `auth=off`였고 실제 setup은 isolated auth smoke에서 다룸 | auth-on manual release rehearsal을 별도 수행할 때 throwaway users file로 실행 |
| request-access form submit | manual visual check 범위에서 운영 데이터 생성을 피함 | access request fixture가 필요한 release rehearsal에서 throwaway auth users file로 실행 |
| destructive admin actions | 마지막 admin/채널 삭제 같은 mutation은 수동 증거 범위에서 제외 | dedicated fixture server와 rollback plan이 있을 때 실행 |

## 최종 판정

- 전체 판정: PASS, 조건부. 제품 UI manual visual/click evidence와 관련 automated smoke는 통과했습니다.
- 제품 회귀 여부: 확인된 회귀 없음.
- 환경/sandbox 한계: `verify-ops-client-ui --screenshots` 첫 실행은 sandbox local fetch/CDP 제한으로 실패했고, 권한 밖 재실행 기준 통과했습니다.
- 수정 필요 이슈: 없음. `V121-P2-02`에서 별도 UI patch가 필요할 manual finding은 발견하지 못했습니다.
- 커밋: 단계 완료 커밋에서 보고.
- 푸시 가능: 전체 v1.2.1 단계 종료 후 판정.
- 푸시 수행 여부: 수행하지 않음.

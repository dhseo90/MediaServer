# v2.2.0 In-App UI Partial Evidence

이 문서는 v2.2.0 Responsive UI Foundation 후속 UI 검수 중 2026-06-03에 Codex 인앱 브라우저로 직접 확인한 부분 evidence를 현재 manual UI result 구조에 맞춰 정리한 결과입니다.
전체 UI 풀테스트 PASS가 아니며, 기능 inventory 전수 대상은 모두 FAIL로 남깁니다. 실제로 연 route와 조작한 control은 `확인됨` 섹션에 별도로 보존합니다.

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
- 문서 파악 범위: `docs/development-backlog.md`, `docs/v220-ui-fulltest-matrix-evidence.md`, `docs/manual-ui-result-template.md`, `docs/project-feature-test-inventory.md`
- feature inventory revision: 현재 작업 트리의 `docs/project-feature-test-inventory.md`
- manual evidence schema: `media-server.manual-ui-evidence-input.v1`
- v2.2.0 UI matrix schema: `media-server.v220-ui-fulltest-matrix.v1`
- token usage source: Codex goal usage
- token start: `2819507`
- token end: `3031399`
- token consumed: `211892`
- elapsed: goal cumulative `9310s` at capture time

## 테스트 영역별 판정

스크립트 테스트와 UI 풀테스트는 서로 대체하지 않습니다. 아래 UI 풀테스트 판정은 전수 기능 ID 기준이며, 부분 evidence가 있어도 해당 기능 ID별 route/control/input/state/log/artifact 필드가 완성되지 않았으면 FAIL입니다.

| 영역 | 실행 범위 | evidence | 기록 |
| --- | --- | --- | --- |
| 안정화 테스트 | build, inventory, route redesign verifier 일부 | 명령 exit code | 아래 스크립트 테스트 기록 참조 |
| 30분 테스트 | 실행하지 않음 | 없음 | 사용자 별도 지시 없음 |
| 120분 테스트 | 실행하지 않음 | 없음 | 사용자 별도 지시 없음 |
| UI 풀테스트 | 244개 UI 대상 기능 ID 중 0 PASS, 244 FAIL | 부분 screenshot과 responsive sweep | 전체 판정 FAIL |

## 긴 테스트 Preflight / 재시작 경계

| 항목 | 기대 상태 | 실제 상태 | 판정 | 후속 |
| --- | --- | --- | --- | --- |
| 기능 목록 freeze | 현재 기능 ID 목록 확인 | 392개 기능 행, 244개 UI 대상 | PASS | 전수 결과 행은 아래 표에 생성 |
| auth verifier env | auth test password env 5개 모두 `SET` | 이번 partial 문서 작성 시점에는 미보존 | FAIL | full UI 재실행 때 새 env 기록 필요 |
| VA seed 준비 | seed dry-run 또는 registry dir 준비 | dry-run/registry emit만 확인 | PASS | 실제 seed apply와 EventRecord 확인 필요 |
| output artifact | summary/report/log/screenshot/evidence JSON 경로 고정 | `/private/tmp/media_server_v220_ui_fulltest_iab` screenshot/json 보존 | PASS | full evidence JSON 작성 필요 |
| 30분 시작 조건 | 안정화 gate PASS 또는 미실행 사유 | 미실행 사유 기록 | FAIL | 별도 지시 시 실행 |
| 120분 시작 조건 | 사용자 승인과 장시간 관찰 항목 | 미승인/미실행 | FAIL | 별도 지시 필요 |

- preflight 실패: full UI evidence JSON, auth verifier env 기록, 30분/120분 실행 evidence 없음
- 긴 테스트 시작 여부: 시작하지 않음
- 긴 테스트 미시작 항목: 30분 soak, 120분 longrun
- 제품 runtime/media/auth/session/registry 수정 여부: 없음
- 전체 재시작 필요 여부: full UI 풀테스트는 전수 재시작 필요
- 부분 재검수 가능 범위: 보존 screenshot 기반 시각 확인은 참고 가능하나 PASS 대체 불가
- retained artifact로 재판정 가능한 항목: route marker, overflow, redaction sweep 일부
- retained artifact가 부족해 FAIL로 남길 항목: role guard, VA EventRecord, invite end-to-end, per-feature action/log evidence

## 현재 보존 증적

아래 표에는 현재 파일시스템에 남아 있는 retained artifact만 적습니다. 이 표는 partial evidence 보존 여부만 증명하며, 전체 UI 풀테스트 PASS 근거가 아닙니다.

| 증적 | 경로 | 확인 |
| --- | --- | --- |
| Ops home desktop | `/private/tmp/media_server_v220_ui_fulltest_iab/ops_home_1180.png` | exists |
| Ops home mobile | `/private/tmp/media_server_v220_ui_fulltest_iab/ops_home_320.png` | exists |
| Rules desktop | `/private/tmp/media_server_v220_ui_fulltest_iab/ops_rules_1180.png` | exists |
| Rules mobile | `/private/tmp/media_server_v220_ui_fulltest_iab/ops_rules_320.png` | exists |
| Client live desktop | `/private/tmp/media_server_v220_ui_fulltest_iab/client_live_1180.png` | exists |
| Client live mobile | `/private/tmp/media_server_v220_ui_fulltest_iab/client_live_320.png` | exists |
| Responsive sweep | `/private/tmp/media_server_v220_ui_fulltest_iab/responsive-results.json` | exists |
| Auth setup strong password | `/private/tmp/media_server_v220_ui_fulltest_iab/auth-setup-after-strong.png` | exists |
| Auth login landing | `/private/tmp/media_server_v220_ui_fulltest_iab/auth-login-landing.png` | exists |
| Access request submitted | `/private/tmp/media_server_v220_ui_fulltest_iab/auth-access-request-submitted.png` | exists |

## 스크립트 테스트 기록

| 명령 | 결과 | 범위 |
| --- | --- | --- |
| `./server.sh build` | PASS | C++ build |
| `./server.sh prepare-manual-ui-fulltest-seed --dry-run --emit-plan /private/tmp/media_server_v220_ui_fulltest_seed_plan.json --emit-registry-dir /private/tmp/media_server_v220_ui_fulltest_registry` | 최초 FAIL 후 PASS | seed release target drift 확인 및 수정 뒤 dry-run/registry emit |
| `./server.sh verify-project-inventory` | 최초 FAIL 후 PASS | manual UI seed matrix가 현재 release `v2.1.0`에 고정되는지 확인 |
| `./server.sh verify-v220-rules-workspace-redesign` | PASS | `/ops/rules` workspace class/source/doc 연결 |
| `./server.sh verify-ui-fulltest-one-shot --output-dir /private/tmp/media_server_v220_ui_fulltest_one_shot_fix2 --browser-mode chrome --allow-chrome-fallback --debug-port-base 19000` | PASS | wrapper gate PASS, manual result와 장시간 테스트는 skip으로 기록 |

- 안정화/장시간:
  - `./server.sh verify-predev --soak-minutes 30`: 실행하지 않음, 사용자 명시 지시 없음
  - `./server.sh verify-predev --soak-minutes 120`: 실행하지 않음, 사용자 명시 지시 없음
  - `./server.sh verify-va-runtime-console-longrun --duration-minutes 120`: 실행하지 않음, 사용자 명시 지시 없음

## UI 풀테스트 기록

- blocking dialog policy:
  - native alert/confirm/prompt 없음: 관찰 범위에서만 확인
  - allowlisted in-page dialog만 사용: 전수 destructive flow 미완료
  - 위험 action 2회 확인 첫 클릭 write 없음: 전수 미완료
- 브라우저: Codex 인앱 브라우저
- 직접 조작 범위: 아래 `확인됨` 섹션의 route/control만 해당
- 반응형/테마 범위: 320/390/760/1180 responsive sweep와 대표 theme toggle 일부
- 시각 품질 확인: 대표 route overflow 0건 확인, 전수 기능 action 단위는 남음
- 제외 기록: 없음

### Manual UI Evidence Runner Fields

| feature ID | route | control | interaction | input/inputNotApplicableReason | expected | actual | stateReflected | log/event evidence | artifacts | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| all | full UI evidence JSON | featureResults | route/control/input/state/log/artifact | full schema required | runner PASS rows | not prepared | false | missing | partial screenshots only | FAIL |

## VA Seed / 최종 룰 상태

- seed dry-run: PASS
- seed plan/report: `/private/tmp/media_server_v220_ui_fulltest_seed_plan.json`
- seed registry dir: `/private/tmp/media_server_v220_ui_fulltest_registry`
- seed apply: 실행하지 않음
- seed apply 명령: 없음
- data storage: throwaway registry dry-run output만 보존

| 개별 항목 | 기대 상태 | 실제 상태 | 판정 |
| --- | --- | --- | --- |
| account: admin | UI에서 seed 적용과 최종 상태 확인 | 미실행 | FAIL |
| account: operator | UI에서 seed 적용과 최종 상태 확인 | 미실행 | FAIL |
| account: viewer | UI에서 seed 적용과 최종 상태 확인 | 미실행 | FAIL |
| account: integrator | UI에서 seed 적용과 최종 상태 확인 | 미실행 | FAIL |
| profile: tracker `bytetrack` + Re-ID `assist` | UI에서 seed 적용과 최종 상태 확인 | 미실행 | FAIL |
| profile: tracker `bytetrack` + Re-ID `off` | UI에서 seed 적용과 최종 상태 확인 | 미실행 | FAIL |
| profile: tracker `kalman-lite` + Re-ID `assist` | UI에서 seed 적용과 최종 상태 확인 | 미실행 | FAIL |
| profile: tracker `kalman-lite` + Re-ID `off` | UI에서 seed 적용과 최종 상태 확인 | 미실행 | FAIL |
| profile: tracker `lite` + Re-ID `assist` | UI에서 seed 적용과 최종 상태 확인 | 미실행 | FAIL |
| profile: tracker `lite` + Re-ID `off` | UI에서 seed 적용과 최종 상태 확인 | 미실행 | FAIL |
| profile: tracker `none` + Re-ID `off` | UI에서 seed 적용과 최종 상태 확인 | 미실행 | FAIL |
| invalid policy: tracker `none` + Re-ID `assist` | UI에서 seed 적용과 최종 상태 확인 | 미실행 | FAIL |
| event template: presence | UI에서 seed 적용과 최종 상태 확인 | 미실행 | FAIL |
| event template: enter | UI에서 seed 적용과 최종 상태 확인 | 미실행 | FAIL |
| event template: exit | UI에서 seed 적용과 최종 상태 확인 | 미실행 | FAIL |
| event template: line-crossing any | UI에서 seed 적용과 최종 상태 확인 | 미실행 | FAIL |
| event template: line-crossing forward | UI에서 seed 적용과 최종 상태 확인 | 미실행 | FAIL |
| event template: line-crossing reverse | UI에서 seed 적용과 최종 상태 확인 | 미실행 | FAIL |
| event template: intrusion-dwell | UI에서 seed 적용과 최종 상태 확인 | 미실행 | FAIL |
| event template: re-entry | UI에서 seed 적용과 최종 상태 확인 | 미실행 | FAIL |
| event template: wrong-direction | UI에서 seed 적용과 최종 상태 확인 | 미실행 | FAIL |
| event template: intrusion-after-line-crossing | UI에서 seed 적용과 최종 상태 확인 | 미실행 | FAIL |
| event template: loitering | UI에서 seed 적용과 최종 상태 확인 | 미실행 | FAIL |
| event template: zone-occupancy | UI에서 seed 적용과 최종 상태 확인 | 미실행 | FAIL |
| scenario preset: default | UI에서 seed 적용과 최종 상태 확인 | 미실행 | FAIL |
| scenario preset: road | UI에서 seed 적용과 최종 상태 확인 | 미실행 | FAIL |
| scenario preset: retail | UI에서 seed 적용과 최종 상태 확인 | 미실행 | FAIL |
| scenario preset: park | UI에서 seed 적용과 최종 상태 확인 | 미실행 | FAIL |
| scenario preset: indoor | UI에서 seed 적용과 최종 상태 확인 | 미실행 | FAIL |
| scenario preset: lobby | UI에서 seed 적용과 최종 상태 확인 | 미실행 | FAIL |
| scenario preset: platform | UI에서 seed 적용과 최종 상태 확인 | 미실행 | FAIL |
| scenario preset: entrance | UI에서 seed 적용과 최종 상태 확인 | 미실행 | FAIL |
| scenario preset: doorway | UI에서 seed 적용과 최종 상태 확인 | 미실행 | FAIL |
| scenario preset: parking | UI에서 seed 적용과 최종 상태 확인 | 미실행 | FAIL |
| scenario preset: elevator | UI에서 seed 적용과 최종 상태 확인 | 미실행 | FAIL |
| scenario preset: custom | UI에서 seed 적용과 최종 상태 확인 | 미실행 | FAIL |
| vaRule: presence | UI에서 seed 적용과 최종 상태 확인 | 미실행 | FAIL |
| vaRule: enter | UI에서 seed 적용과 최종 상태 확인 | 미실행 | FAIL |
| vaRule: exit | UI에서 seed 적용과 최종 상태 확인 | 미실행 | FAIL |
| vaRule: line-crossing any | UI에서 seed 적용과 최종 상태 확인 | 미실행 | FAIL |
| vaRule: line-crossing forward | UI에서 seed 적용과 최종 상태 확인 | 미실행 | FAIL |
| vaRule: line-crossing reverse | UI에서 seed 적용과 최종 상태 확인 | 미실행 | FAIL |
| vaRule: intrusion-dwell | UI에서 seed 적용과 최종 상태 확인 | 미실행 | FAIL |
| vaRule: re-entry | UI에서 seed 적용과 최종 상태 확인 | 미실행 | FAIL |
| vaRule: wrong-direction | UI에서 seed 적용과 최종 상태 확인 | 미실행 | FAIL |
| vaRule: intrusion-after-line-crossing | UI에서 seed 적용과 최종 상태 확인 | 미실행 | FAIL |
| vaRule: loitering | UI에서 seed 적용과 최종 상태 확인 | 미실행 | FAIL |
| vaRule: zone-occupancy | UI에서 seed 적용과 최종 상태 확인 | 미실행 | FAIL |

## VA Event Occurrence Coverage

- `/ops/events` screenshot: partial responsive sweep만 있음
- visible rows: 전수 EventRecord row 대조 없음
- pagination/filter/archive 상태: 전수 미완료
- EventRecord active JSON Lines: 전수 미완료
- `includeArchives=1` 조회 여부: 미실행
- registry 대조 artifact: 미실행

| 개별 event 기능 | template/rule id | vaRule id | UI rows | JSON Lines/API records | expected pass output | 판정 |
| --- | --- | --- | --- | --- | --- | --- |
| `presence` | 미확정 | 미확정 | 0 | 0 | UI EventRecord row와 JSON Lines record 대조 | FAIL |
| `enter` | 미확정 | 미확정 | 0 | 0 | UI EventRecord row와 JSON Lines record 대조 | FAIL |
| `exit` | 미확정 | 미확정 | 0 | 0 | UI EventRecord row와 JSON Lines record 대조 | FAIL |
| `line-crossing:any` | 미확정 | 미확정 | 0 | 0 | UI EventRecord row와 JSON Lines record 대조 | FAIL |
| `line-crossing:forward` | 미확정 | 미확정 | 0 | 0 | UI EventRecord row와 JSON Lines record 대조 | FAIL |
| `line-crossing:reverse` | 미확정 | 미확정 | 0 | 0 | UI EventRecord row와 JSON Lines record 대조 | FAIL |
| `intrusion-dwell` | 미확정 | 미확정 | 0 | 0 | UI EventRecord row와 JSON Lines record 대조 | FAIL |
| `re-entry` | 미확정 | 미확정 | 0 | 0 | UI EventRecord row와 JSON Lines record 대조 | FAIL |
| `wrong-direction` | 미확정 | 미확정 | 0 | 0 | UI EventRecord row와 JSON Lines record 대조 | FAIL |
| `intrusion-after-line-crossing` | 미확정 | 미확정 | 0 | 0 | UI EventRecord row와 JSON Lines record 대조 | FAIL |
| `loitering` | 미확정 | 미확정 | 0 | 0 | UI EventRecord row와 JSON Lines record 대조 | FAIL |
| `zone-occupancy` | 미확정 | 미확정 | 0 | 0 | UI EventRecord row와 JSON Lines record 대조 | FAIL |

### VA EventRecord 후속

- missing event types: all listed event keys need direct UI/EventRecord evidence
- missing template/rule ids: all final template/rule ids
- missing vaRule ids: all final vaRule ids
- sample/video 한계: sample 재생과 EventRecord 발생 조건 재확인 필요
- 최종 판정: FAIL

## 확인됨

실제로 열고 클릭한 화면만 적습니다. 이 섹션의 PASS는 route/control 단위 부분 evidence이며, 기능 ID 전수 UI 풀테스트 PASS가 아닙니다.

| 화면 | 계정/권한 | 직접 조작 | 기대 결과 | 실제 결과 | screenshot/artifact | 판정 |
| --- | --- | --- | --- | --- | --- | --- |
| `/ops/home` | admin/no-auth core | home route 진입, nav/action grid 확인 | workspace marker와 overflow 없음 | marker/screenshot 확인 | /private/tmp/media_server_v220_ui_fulltest_iab/ops_home_1180.png | PASS |
| `/ops/dashboard` | admin/no-auth core | 새로고침 버튼 클릭, responsive sweep | dashboard marker와 overflow 없음 | marker/sweep 확인 | /private/tmp/media_server_v220_ui_fulltest_iab/responsive-results.json | PASS |
| `/ops/events` | admin/no-auth core | events route 진입, event text 확인 | events marker와 overflow 없음 | 부분 확인 | /private/tmp/media_server_v220_ui_fulltest_iab/responsive-results.json | PASS |
| `/ops/rules` | admin/no-auth core | rules workspace 진입, panel marker 확인 | rules marker와 overflow 없음 | 부분 확인 | /private/tmp/media_server_v220_ui_fulltest_iab/ops_rules_1180.png | PASS |
| `/client/live` | admin preview/no-auth core | source 선택, refresh, disconnect 조작 | viewer debug/source/raw 문자열 비노출 | 부분 확인 | /private/tmp/media_server_v220_ui_fulltest_iab/client_live_1180.png | PASS |
| `/client/dashboard` | admin preview/no-auth core | dashboard route responsive sweep | viewer dashboard marker와 overflow 없음 | 부분 확인 | /private/tmp/media_server_v220_ui_fulltest_iab/responsive-results.json | PASS |
| `/client/events` | admin preview/no-auth core | events route responsive sweep | viewer events marker와 overflow 없음 | 부분 확인 | /private/tmp/media_server_v220_ui_fulltest_iab/responsive-results.json | PASS |
| `/setup` | unauth/auth auto | weak password 거절, strong password 제출 | `/login` 이동 | 부분 확인 | /private/tmp/media_server_v220_ui_fulltest_iab/auth-setup-after-strong.png | PASS |
| `/login` | admin/auth auto | admin login 제출 | `/ops/home` landing | 부분 확인 | /private/tmp/media_server_v220_ui_fulltest_iab/auth-login-landing.png | PASS |
| `/password/change` | reset/must-change | change form과 policy marker 확인, 이전 비밀번호 재사용 거절 | 정책 boundary 표시 | 부분 확인 | /private/tmp/media_server_v220_ui_fulltest_iab/auth-password-change.png | PASS |
| `/invite/setup` | invite boundary | invite setup form route 확인 | 유효 token end-to-end는 남음 | 부분 확인 | /private/tmp/media_server_v220_ui_fulltest_iab/auth-invite-setup-boundary.png | FAIL |
| `/client/request-access` | public | 접근 요청 제출 | 승인 전 접근 차단 안내 표시 | 부분 확인 | /private/tmp/media_server_v220_ui_fulltest_iab/auth-access-request-submitted.png | PASS |
| responsive/theme | mixed | 320/390/760/1180 sweep와 theme toggle 일부 | 대표 route overflow 0건 | 부분 확인 | /private/tmp/media_server_v220_ui_fulltest_iab/theme-ops-home-390.png | PASS |
| role guard | viewer/admin | admin login landing만 확인 | viewer `/ops/*` 거부는 남음 | 전수 조건 부족 | /private/tmp/media_server_v220_ui_fulltest_iab/auth-login-landing.png | FAIL |
| blocking dialog policy | mixed | 관찰 중 native dialog 없음 | destructive 2회 확인 flow 전수는 남음 | 전수 조건 부족 | /private/tmp/media_server_v220_ui_fulltest_iab/responsive-results.json | FAIL |

## v2.1.0 Release Evidence Index

자동 smoke나 raw JSON 확인만으로 채우지 않습니다. 실제로 열고 클릭한 화면만 PASS 후보가 될 수 있고, 열지 않은 개별 기능은 FAIL입니다.

| route | 계정/권한 | 직접 조작 | screenshot/artifact | 연결 자동 검증 | 판정 | 실패 사유 |
| --- | --- | --- | --- | --- | --- | --- |
| `/ops/home` | admin/no-auth core | home route 진입, nav/action grid 확인 | /private/tmp/media_server_v220_ui_fulltest_iab/ops_home_1180.png | partial only | FAIL | 기능 ID별 full evidence row/log/EventRecord 조건 부족 |
| `/ops/dashboard` | admin/no-auth core | 새로고침 버튼 클릭, responsive sweep | /private/tmp/media_server_v220_ui_fulltest_iab/responsive-results.json | partial only | FAIL | 기능 ID별 full evidence row/log/EventRecord 조건 부족 |
| `/ops/events` | admin/no-auth core | events route 진입, event text 확인 | /private/tmp/media_server_v220_ui_fulltest_iab/responsive-results.json | partial only | FAIL | 기능 ID별 full evidence row/log/EventRecord 조건 부족 |
| `/ops/rules` | admin/no-auth core | rules workspace 진입, panel marker 확인 | /private/tmp/media_server_v220_ui_fulltest_iab/ops_rules_1180.png | partial only | FAIL | 기능 ID별 full evidence row/log/EventRecord 조건 부족 |
| `/client/live` | admin preview/no-auth core | source 선택, refresh, disconnect 조작 | /private/tmp/media_server_v220_ui_fulltest_iab/client_live_1180.png | partial only | FAIL | 기능 ID별 full evidence row/log/EventRecord 조건 부족 |
| `/client/dashboard` | admin preview/no-auth core | dashboard route responsive sweep | /private/tmp/media_server_v220_ui_fulltest_iab/responsive-results.json | partial only | FAIL | 기능 ID별 full evidence row/log/EventRecord 조건 부족 |
| `/client/events` | admin preview/no-auth core | events route responsive sweep | /private/tmp/media_server_v220_ui_fulltest_iab/responsive-results.json | partial only | FAIL | 기능 ID별 full evidence row/log/EventRecord 조건 부족 |
| `/setup` | unauth/auth auto | weak password 거절, strong password 제출 | /private/tmp/media_server_v220_ui_fulltest_iab/auth-setup-after-strong.png | partial only | FAIL | 기능 ID별 full evidence row/log/EventRecord 조건 부족 |
| `/login` | admin/auth auto | admin login 제출 | /private/tmp/media_server_v220_ui_fulltest_iab/auth-login-landing.png | partial only | FAIL | 기능 ID별 full evidence row/log/EventRecord 조건 부족 |
| `/password/change` | reset/must-change | change form과 policy marker 확인, 이전 비밀번호 재사용 거절 | /private/tmp/media_server_v220_ui_fulltest_iab/auth-password-change.png | partial only | FAIL | 기능 ID별 full evidence row/log/EventRecord 조건 부족 |
| `/invite/setup` | invite boundary | invite setup form route 확인 | /private/tmp/media_server_v220_ui_fulltest_iab/auth-invite-setup-boundary.png | partial only | FAIL | 기능 ID별 full evidence row/log/EventRecord 조건 부족 |
| `/client/request-access` | public | 접근 요청 제출 | /private/tmp/media_server_v220_ui_fulltest_iab/auth-access-request-submitted.png | partial only | FAIL | 기능 ID별 full evidence row/log/EventRecord 조건 부족 |

- 직접 열어보지 않은 화면: `/ops/sources`, `/ops/users`, `/ops/vlm` 및 다수 기능 action
- 실패 후 재검수한 화면: 없음
- raw JSON/API-only로만 확인한 항목: 없음으로 기록, raw JSON은 PASS 근거로 쓰지 않음
- client/viewer 비노출 재확인: partial responsive sweep 기준만 확인

## 기능별 직접 조작 기록

아래 표는 verifier가 요구하는 전수 기능 ID 행입니다. 이번 문서에서는 full evidence JSON이 없으므로 모든 행을 FAIL로 둡니다.

| ID | 기능 | UI 필요 | 테스트 영역 | 영역 | 판정 | 실패 사유 |
| --- | --- | --- | --- | --- | --- | --- |
| UI-001 | `/` 진입 후 제품 시작 route로 이동 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| UI-002 | `/setup` 최초 관리자 설정 화면 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| UI-003 | `/login` 로그인 화면 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| UI-004 | `/password/change` 비밀번호 변경 화면 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| UI-005 | `/logout` 세션 종료 | 간접 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| UI-007 | `/invite/setup` 초대 기반 계정 설정 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| UI-008 | `/client/request-access` 시청자 접근 요청 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| UI-009 | `/ops/home` 운영 Home | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| UI-010 | `/ops/dashboard` 운영 Dashboard | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| UI-011 | `/ops/sources` 채널 / 소스 관리 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| UI-012 | `/ops/rules` VA 룰 / 프로파일 / 이벤트 템플릿 관리 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| UI-013 | `/ops/users` 사용자 관리 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| UI-014 | `/ops/events` 이벤트 진단 route | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| UI-015 | `/client/live` 시청자 Live | 필요 | 필요 | 안정화, UI, 30분 | FAIL | full UI evidence row not completed |
| UI-016 | `/client/dashboard` 시청자 Dashboard | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| UI-017 | `/client/events` 시청자 이벤트 route | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| UI-018 | `/lab`, `/lab/rules`, `/lab/import`, `/webrtc/test` 제품 UI 미제공 / 404 | 비대상 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| UI-019 | light/dark theme-aware 공통 UI | 필요 | 필요 | UI | FAIL | full UI evidence row not completed |
| UI-020 | desktop 반응형 화면 | 필요 | 필요 | UI | FAIL | full UI evidence row not completed |
| UI-021 | mobile 반응형 화면 | 필요 | 필요 | UI | FAIL | full UI evidence row not completed |
| UI-022 | `/ops/vlm` VLM 설치/연결 준비 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| UI-023 | `/ops/vlm` VLM profile 저장 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| UI-024 | `/ops/vlm` VLM Privacy/전송 guard | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| UI-025 | `/ops/vlm` PC capability/recommendation 요약 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| UI-026 | `/ops/vlm` local model dry-run 후보 선택 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| UI-027 | `/ops/vlm` cloud connection dry-run 후보 선택 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| UI-028 | `/ops/vlm` profile 활성화/fallback/disable control | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| UI-029 | `/ops/vlm` profile 삭제 action | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| UI-030 | `/ops/vlm` evaluation/prompt profile 표시 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| UI-031 | `/ops/vlm` raw details 접힘 영역 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| UI-032 | `/ops/events` VLM review detail control | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| UI-033 | `/ops/vlm` VLM runtime status panel | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| UI-034 | `/ops/vlm` VLM evaluation result workflow | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| UI-035 | `/ops/events` VLM review action workflow | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| UI-036 | `/ops/rules` VLM Rule suggestion draft workflow | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| AUTH-004 | auth mode `session` | 간접 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| AUTH-005 | users file 없음 또는 admin passwordHash 없음 시 setup 유도 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| AUTH-006 | 기본 admin username `admin` | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| AUTH-007 | passwordless admin login 금지 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| AUTH-012 | passwordHash API/UI 비노출 | 비대상 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| AUTH-013 | passwordHistory API/UI 비노출 | 비대상 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| AUTH-014 | tokenHash API/UI 비노출 | 비대상 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| AUTH-015 | invite tokenHash API/UI 비노출 | 비대상 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| AUTH-016 | session cookie 로그인 | 간접 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| AUTH-018 | 사용자 생성 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| AUTH-019 | 사용자 수정 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| AUTH-020 | 사용자 삭제 또는 비활성화 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| AUTH-021 | 사용자 활성화 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| AUTH-022 | 사용자 비밀번호 초기화 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| AUTH-023 | 마지막 admin 비활성화 방지 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| AUTH-024 | role: admin | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| AUTH-025 | role: operator | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| AUTH-026 | role: viewer | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| AUTH-027 | role: integrator | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| AUTH-028 | scope: ops 읽기 | 간접 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| AUTH-029 | scope: ops 쓰기 | 간접 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| AUTH-030 | scope: client/view 접근 | 간접 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| AUTH-033 | 초대 생성 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| AUTH-034 | 초대 수락 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| AUTH-035 | 초대 만료/무효 처리 | 간접 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| AUTH-036 | client 접근 요청 생성 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| AUTH-037 | client 접근 요청 승인 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| AUTH-038 | client 접근 요청 거절 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| AUTH-039 | 승인 전 client self-signup scope 미부여 | 간접 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| AUTH-040 | route guard | 간접 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| SRC-001 | file source 등록 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| SRC-002 | RTSP pull source 등록 | 필요 | 필요 | 안정화, UI, 30분 | FAIL | full UI evidence row not completed |
| SRC-003 | HTTP/HLS URI source 등록 | 필요 | 필요 | 안정화, UI, 30분 | FAIL | full UI evidence row not completed |
| SRC-004 | external WHEP playback URL source 등록 | 필요 | 필요 | 안정화, UI, 30분 | FAIL | full UI evidence row not completed |
| SRC-005 | internal WHIP published source 등록 | 필요 | 필요 | 안정화, UI, 30분 | FAIL | full UI evidence row not completed |
| SRC-006 | source 목록 조회 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| SRC-007 | source 상세 조회 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| SRC-008 | source 생성 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| SRC-009 | source 수정 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| SRC-010 | source 삭제 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| SRC-011 | source 활성/비활성 상태 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| SRC-012 | source health 조회 | 필요 | 필요 | 안정화, UI, 30분 | FAIL | full UI evidence row not completed |
| SRC-014 | ONVIF import draft | 필요 | 필요 | 안정화, UI, 필드 별도 | FAIL | full UI evidence row not completed |
| SRC-016 | PublishedView 목록 조회 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| SRC-017 | PublishedView 생성 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| SRC-018 | PublishedView 수정 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| SRC-019 | PublishedView 삭제 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| SRC-020 | PublishedView 활성/비활성 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| SRC-021 | View별 source 연결 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| SRC-022 | View별 allowed rule list | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| SRC-023 | View별 viewer 접근 범위 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| SRC-024 | View별 WebRTC client wrapper | 간접 | 필요 | 안정화, UI, 30분 | FAIL | full UI evidence row not completed |
| SRC-025 | View별 dashboard | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| SRC-026 | View별 events | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| SRC-028 | Client preview as admin 표시 | 필요 | 필요 | UI | FAIL | full UI evidence row not completed |
| SRC-029 | viewer에게 source URL 비노출 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| SRC-030 | viewer에게 developer URL 비노출 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-001 | `/ops/rules` VA rule/channel analysis setting 목록 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-002 | `/ops/rules` event template 목록 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-003 | `/ops/rules` analysis profile 목록 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-004 | channel analysis setting 생성 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-005 | channel analysis setting 수정 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-006 | channel analysis setting 삭제 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-007 | channel analysis setting 상세 보기 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-008 | channel analysis setting apply/active 상태 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-009 | channel analysis setting source 선택 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-010 | channel analysis setting event template 연결 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-011 | channel analysis setting analysis profile 연결 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-012 | channel analysis setting region geometry 설정 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-013 | channel analysis setting line geometry 설정 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-014 | channel analysis setting output URL 표시 | 필요 | 필요 | UI | FAIL | full UI evidence row not completed |
| RULE-015 | channel analysis setting status 표시 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-016 | vaRule numeric id 자동 생성 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-017 | vaRule id 직접 입력 방지 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-018 | event template 생성 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-019 | event template 수정 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-020 | event template 삭제 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-021 | event template 상세 보기 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-022 | analysis profile 생성 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-023 | analysis profile 수정 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-024 | analysis profile 삭제 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-025 | analysis profile 상세 보기 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-026 | detector: YOLO/ONNX | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-027 | detector: dummy | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-028 | profile FPS 설정 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-029 | profile queue 설정 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-030 | profile confidence 설정 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-031 | profile NMS 설정 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-032 | profile input size 설정 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-033 | profile tracking category 표시 | 필요 | 필요 | UI | FAIL | full UI evidence row not completed |
| RULE-034 | tracker `none` | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-035 | tracker `lite` | 필요 | 필요 | 안정화, UI, 30분 | FAIL | full UI evidence row not completed |
| RULE-036 | tracker `kalman-lite` | 필요 | 필요 | 안정화, UI, 30분 | FAIL | full UI evidence row not completed |
| RULE-037 | tracker `bytetrack` | 필요 | 필요 | 안정화, UI, 30분 | FAIL | full UI evidence row not completed |
| RULE-038 | Re-ID `off` | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-039 | Re-ID `assist` | 필요 | 필요 | 안정화, UI, 30분 | FAIL | full UI evidence row not completed |
| RULE-040 | `tracker=none`이면 Re-ID off 강제 또는 거부 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-041 | basic event: presence | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-042 | basic event: enter | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-043 | basic event: exit | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-044 | basic event: line-crossing | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-045 | line direction: any | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-046 | line direction: forward | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-047 | line direction: reverse | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-048 | scenario: intrusion-dwell | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-049 | scenario: re-entry | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-050 | scenario: wrong-direction | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-051 | scenario: intrusion-after-line-crossing | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-052 | scenario: loitering | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-053 | scenario: zone-occupancy | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-054 | scenario preset: default | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-055 | scenario preset: road | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-056 | scenario preset: retail | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-057 | scenario preset: park | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-058 | scenario preset: indoor | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-059 | scenario preset: lobby | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-060 | scenario preset: platform | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-061 | scenario preset: entrance | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-062 | scenario preset: doorway | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-063 | scenario preset: parking | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-064 | scenario preset: elevator | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-065 | scenario preset: custom | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-066 | intrusion-dwell zone 설정 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-067 | intrusion-dwell candidate time 설정 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-068 | intrusion-dwell dwell time 설정 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-069 | intrusion-dwell cooldown 설정 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-070 | re-entry polygon zone 설정 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-071 | re-entry window 설정 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-072 | re-entry cooldown 설정 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-073 | wrong-direction line geometry 설정 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-074 | wrong-direction allowed direction 설정 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-075 | wrong-direction cooldown 설정 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-076 | intrusion-after-line-crossing trigger line 설정 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-077 | intrusion-after-line-crossing crossing direction 설정 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-078 | intrusion-after-line-crossing target zone 설정 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-079 | intrusion-after-line-crossing max delay 설정 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-080 | intrusion-after-line-crossing dwell 설정 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-081 | intrusion-after-line-crossing cooldown 설정 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-082 | loitering target zone 설정 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-083 | loitering min dwell 설정 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-084 | loitering movement radius 설정 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-085 | loitering trajectory points 설정 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-086 | loitering cooldown 설정 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-087 | loitering ground-plane 옵션 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-088 | zone-occupancy target zone 설정 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-089 | zone-occupancy threshold 설정 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-090 | zone-occupancy min dwell 설정 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-091 | zone-occupancy cooldown 설정 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-092 | duplicate id 검증 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-093 | missing template/profile 검증 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-094 | inactive template/profile 검증 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-095 | source mismatch 검증 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-096 | inactive channel/View 검증 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-097 | client view 권한 없음 검증 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-098 | va-rule not allowed 검증 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-099 | existing connection allowed rule 검증 | 간접 | 필요 | 안정화, 30분 | FAIL | full UI evidence row not completed |
| RULE-100 | same channel/priority conflict 검증 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| RULE-101 | class mismatch 검증 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| EVT-001 | ops runtime status 조회 | 필요 | 필요 | 안정화, UI, 30분 | FAIL | full UI evidence row not completed |
| EVT-003 | ops source health 표시 | 필요 | 필요 | 안정화, UI, 30분 | FAIL | full UI evidence row not completed |
| EVT-004 | ops diagnostics log tail | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| EVT-007 | event records 조회 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| EVT-016 | ops events status | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| EVT-017 | alert deliveries 조회 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| EVT-018 | alert delivery test | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| EVT-019 | event review 목록 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| EVT-020 | event review 상세 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| EVT-021 | event review 상태 변경 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| EVT-022 | audit log 조회 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| EVT-023 | dashboard event 요약 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| EVT-024 | dashboard runtime 요약 | 필요 | 필요 | 안정화, UI, 30분 | FAIL | full UI evidence row not completed |
| EVT-025 | dashboard source/channel 요약 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| EVT-026 | dashboard VA 상태 요약 | 필요 | 필요 | 안정화, UI, 30분 | FAIL | full UI evidence row not completed |
| EVT-028 | VLM Ops event review evidence panel | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| EVT-030 | VLMObservation sidecar correlation state | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| EVT-031 | VLM explanation/hint review state | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| EVT-036 | VLM rule suggestion draft correlation state | 간접 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| CLIENT-001 | viewer live view 목록 조회 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| CLIENT-002 | viewer live WebRTC session 생성 | 필요 | 필요 | 안정화, UI, 30분 | FAIL | full UI evidence row not completed |
| CLIENT-005 | viewer live session 종료 | 필요 | 필요 | 안정화, UI, 30분 | FAIL | full UI evidence row not completed |
| CLIENT-006 | viewer dashboard 조회 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| CLIENT-007 | viewer events 조회 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| CLIENT-009 | live layout preference 저장 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| CLIENT-010 | live layout preference 조회 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| CLIENT-011 | viewer 권한 없는 view 숨김 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| CLIENT-012 | viewer에게 Ops navigation 숨김 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| CLIENT-013 | viewer에게 Lab navigation 숨김 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| CLIENT-014 | viewer에게 raw JSON 비노출 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| CLIENT-015 | viewer에게 debugCounters 비노출 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| CLIENT-016 | viewer에게 BBox diagnostics 비노출 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| CLIENT-017 | viewer에게 rule/profile editor 비노출 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| CLIENT-018 | admin client preview 표시 | 필요 | 필요 | UI | FAIL | full UI evidence row not completed |
| CLIENT-019 | video viewport 표시 | 필요 | 필요 | UI, 30분 | FAIL | full UI evidence row not completed |
| CLIENT-020 | video control 표시 | 필요 | 필요 | UI | FAIL | full UI evidence row not completed |
| CLIENT-021 | VA overlay 표시 | 필요 | 필요 | 안정화, UI, 30분 | FAIL | full UI evidence row not completed |
| CLIENT-022 | status/caption 표시 | 필요 | 필요 | UI | FAIL | full UI evidence row not completed |
| MEDIA-016 | H.264 sample playback | 필요 | 필요 | 안정화, UI, 30분 | FAIL | full UI evidence row not completed |
| MEDIA-017 | multi-channel playback | 필요 | 필요 | 안정화, UI, 30분 | FAIL | full UI evidence row not completed |
| SAFE-015 | lab 개발 UI 제품 화면 embed 금지 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| SAFE-016 | undefined route 404 처리 | 간접 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| SAFE-017 | 구 `/lab` 제품 UI route 404 처리 | 간접 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| SAFE-018 | client/viewer debug 정보 비노출 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| SAFE-019 | auth material 비노출 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| SAFE-020 | 운영 UI와 client UI 권한 경계 분리 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| SAFE-021 | UI blocking dialog policy | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| SAFE-024 | VLM Privacy/전송 guard | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| SAFE-028 | VLM prompt/raw response/credential/source redaction | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| SAFE-031 | VLM viewer/client 비노출 | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| SAFE-033 | VLM Ops-only debug details boundary | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |
| SAFE-038 | VLM rule suggestion draft no-auto-save boundary | 필요 | 필요 | 안정화, UI | FAIL | full UI evidence row not completed |

## 접근 요청 검수

- pending request 생성: partial 확인
- `/ops/users` pending row 확인: 미실행
- 승인 채널 ID 입력: 미실행
- approve 후 invite 출력: 미실행
- invite setup 전 login 결과: 미실행
- invite setup 후 `/client/live` 결과: 미실행
- invite setup 후 `/ops/home` 결과: 미실행
- 거절 flow 실행 여부: 미실행

## Chrome Auth 입력 Evidence

비밀번호 원문, invite token 원문, session cookie, 브라우저 generated password suggestion은 기록하지 않습니다.

Auth verifier 선수 조건:

- `MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD`: MISSING
- `MEDIA_SERVER_VERIFY_AUTH_PREVIOUS_PASSWORD`: MISSING
- `MEDIA_SERVER_VERIFY_AUTH_SECOND_PREVIOUS_PASSWORD`: MISSING
- `MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_ONE`: MISSING
- `MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_TWO`: MISSING

| 화면 | fixture/users file | 직접 입력/제출 | 기대 결과 | artifact/screenshot | 대체 검증 | 판정 |
| --- | --- | --- | --- | --- | --- | --- |
| `/setup` | throwaway | weak password 제출 | rejection copy | `/private/tmp/media_server_v220_ui_fulltest_iab/auth-setup-after-strong.png` | partial direct | PASS |
| `/setup` | throwaway | strong admin password 제출 | `/login` redirect | `/private/tmp/media_server_v220_ui_fulltest_iab/auth-setup-after-strong.png` | partial direct | PASS |
| `/login` | throwaway | admin 로그인 | `/ops/home` redirect | `/private/tmp/media_server_v220_ui_fulltest_iab/auth-login-landing.png` | partial direct | PASS |
| `/password/change` | throwaway | reset/must-change 계정 변경 | history reuse 거부 | `/private/tmp/media_server_v220_ui_fulltest_iab/auth-password-change.png` | partial direct | PASS |
| `/invite/setup` | throwaway | invite password setup | viewer login 가능, ops forbidden | `/private/tmp/media_server_v220_ui_fulltest_iab/auth-invite-setup-boundary.png` | partial direct | FAIL |

## Browser/Computer Use Fallback

raw JSON/API-only 확인은 수동 UI 클릭 evidence로 쓰지 않습니다.

| 항목 | 1차 Browser Use | 2차 Chrome | 3차 Computer Use | 마지막 직접 확인 상태 | 대체 smoke | 판정 |
| --- | --- | --- | --- | --- | --- | --- |
| auth 입력 | 인앱 브라우저 | 사용하지 않음 | 사용하지 않음 | partial auth screenshots | 없음 | FAIL |
| copy fallback | 인앱 브라우저 | 사용하지 않음 | 사용하지 않음 | 일부 route만 확인 | 없음 | FAIL |
| route navigation | 인앱 브라우저 | 사용하지 않음 | 사용하지 않음 | 일부 route만 확인 | 없음 | FAIL |

## 비노출 확인

client/viewer 화면에서 보이지 않아야 하는 항목입니다. admin이 client 화면을 확인한 경우에는 `Client Preview as admin` 상태를 함께 기록합니다.

- source URL: partial client route에서 비노출
- Developer URL: partial client route에서 비노출
- raw JSON: partial client route에서 비노출
- debug counter: partial client route에서 비노출
- BBox diagnostics: partial client route에서 비노출
- rule/profile editor: partial client route에서 비노출
- model/source/auth material: partial screenshot 기준 비노출
- Ops/Lab primary navigation: viewer role 전수 검증은 남음

## 반응형/테마/시각 품질 확인

| viewport | theme | 확인 화면 | overflow/겹침 | 시각 품질 메모 | 판정 |
| --- | --- | --- | --- | --- | --- |
| 320px | light | 대표 Ops/Client route | partial sweep 기준 0건 | 전수 기능 action은 남음 | FAIL |
| 390px | light | 대표 Ops/Client route | partial sweep 기준 0건 | 전수 기능 action은 남음 | FAIL |
| 390px | dark | 대표 Ops/Client route | partial sweep 기준 0건 | 전수 기능 action은 남음 | FAIL |
| 760px | light | 대표 Ops/Client route | partial sweep 기준 0건 | 전수 기능 action은 남음 | FAIL |
| 1180px | light | 대표 Ops/Client route | partial sweep 기준 0건 | 전수 기능 action은 남음 | FAIL |

## 실패

| 화면 | 재현 조작 | 기대 결과 | 실제 결과 | 로그/스크린샷 | 영향 범위 | 재검수 |
| --- | --- | --- | --- | --- | --- | --- |
| 전체 UI 기능 ID | 기능 ID별 route/control/input/state/log/artifact 전수 확인 | 244개 UI 대상 기능 ID 모두 PASS | 0 PASS, 244 FAIL | `/private/tmp/media_server_v220_ui_fulltest_iab` partial artifacts | v2.2.0 UI 풀테스트 완료 판정 불가 | full UI 풀테스트 재실행 필요 |
| VA EventRecord coverage | event key별 `/ops/events` UI row와 JSON Lines 대조 | event key별 최소 1개 evidence | 전수 미실행 | 없음 | VA rule/scenario UI PASS 불가 | seed apply와 EventRecord 재검수 필요 |
| role guard | viewer `/ops/*`, approved invite setup, users approval/reject flow | scope/role guard 직접 확인 | 전수 미실행 | partial auth screenshots | auth UI fulltest PASS 불가 | auth flow 전수 재검수 필요 |

## 제외 기록

사용자가 의도적으로 UI 풀테스트 기준에서 제외하라고 한 항목만 적습니다. 여기에 있는 항목은 PASS 또는 FAIL 판정표에 넣지 않습니다.

| 항목 | 제외 이유 | 후속 확인 조건 |
| --- | --- | --- |
| 없음 | 제외 지시 없음 | 해당 없음 |

## 문서 재작성/신규 작성/비교 병합

- 재작성한 UI 풀테스트 관련 문서: `docs/manual-ui-result-2026-06-03-v220-inapp-partial.md`
- 새로 작성한 UI 풀테스트 문서: 없음
- 비교 결과: 기존 partial route evidence를 보존하고 full-result verifier가 요구하는 FAIL 행을 추가
- 병합 결과: partial evidence와 전수 FAIL 판정을 한 문서에 통합
- 남은 중복: 없음

## 최종 판정

- 최종 결론: FAIL
- PASS 조건: 개별 기능 실패 행 0개, 제외 기록은 판정표 밖에만 존재
- 제품 회귀 여부: 미확정, 현재 evidence는 제품 회귀가 아니라 full UI evidence 미완성 상태를 가리킴
- 환경/sandbox 한계: full UI 전수 조작과 장시간 테스트 미실행
- 수정 필요 이슈: full UI evidence JSON 작성, role guard 전수, VA EventRecord coverage, 30분/120분 장시간 실행 여부 결정
- 커밋: 이번 문서 보정 커밋 대상
- 푸시 가능: 커밋 및 검증 후 판단
- 푸시 수행 여부: 수행하지 않음

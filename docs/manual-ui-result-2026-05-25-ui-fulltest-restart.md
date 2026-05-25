# Manual UI Result - Restart 2026-05-25

## 검수 메타데이터

- run id: ui-fulltest-restart-20260525-oehkFG
- 검수자: Codex autonomous browser/CDP + project verifier
- 날짜/시간: 2026-05-25T07:07:28.648Z
- 브랜치/커밋: v1.8.0 @ 82c79c2
- 서버 URL: http://127.0.0.1:8081
- auth mode: auto
- users/source/view/analysis fixture: /private/tmp/media_server_ui_fulltest_restart_20260525_oehkFG
- 데이터 리셋 방법: 새 throwaway users file, seed registry dir, events/snapshots/clips dir 생성
- 브라우저: Codex in-app browser + autonomous Chrome/CDP verifier
- viewport: 320, 390, 760, 1180 x 900
- theme: light, dark
- evidence index: /private/tmp/media_server_ui_fulltest_restart_20260525_oehkFG/browser
- 문서 파악 범위: manual-ui-fulltest, manual-ui-checklist, manual-ui-result-template, project-feature-test-inventory
- feature inventory revision: docs/project-feature-test-inventory.md, UI target rows parsed from current worktree
- token usage source: Codex goal usage
- token start: 916832
- token end: 미집계 - result 작성 시점 자동 goal usage snapshot 미반영
- token consumed: 미집계
- elapsed: 진행 중 goal continuation

## 테스트 영역별 판정

| 영역 | 실행 범위 | evidence | 기록 |
| --- | --- | --- | --- |
| 안정화 테스트 | 이번 turn에서는 UI 재시작 전 문서/증거 기준만 검증 | verify-manual-ui-evidence PASS, verify-docs-links PASS, git diff --check PASS | release metadata는 원격 latest/tag가 v1.8.0이 아니라 FAIL |
| 30분 테스트 | 실행하지 않음 | 없음 | 사용자 재실행 지시 없음 |
| 120분 테스트 | 실행하지 않음 | 없음 | 별도 승인 없음 |
| UI 풀테스트 | 219개 UI 대상 기능 ID 중 44 PASS, 175 FAIL | browser screenshots/json + EventRecord sample | 최종 FAIL |

## 스크립트 테스트 기록

- `./server.sh prepare-manual-ui-fulltest-seed --dry-run --emit-plan ... --emit-registry-dir ...`: PASS
- `./server.sh verify-manual-ui-evidence`: PASS
- `./server.sh verify-docs-links`: PASS
- `git diff --check`: PASS
- `./server.sh verify-release-metadata`: FAIL - GitHub latest release/tag is v1.7.0 and remote tag v1.8.0 is absent. UI product regression으로 단정하지 않음.
- `./server.sh verify-va-events --cookie-file ... --dispatch-records`: FAIL - EventRecord queue drain timeout. Stored records existed; queue remained non-empty and droppedCount > 0.
- 후속 재검증 `./server.sh verify-va-events --dispatch-records`: PASS - `scripts/internal/verify_va_tracking_events.sh`가 EventRecord dispatch를 2회 polling당 1회로 줄인 뒤 기본 EventRecord queue 2048에서 `stored=1588 failed=0 dropped=0`, 32 PASS/0 FAIL. 격리 auth-off 서버 검증이며 아래 UI 기능별 FAIL 행을 PASS로 대체하지 않음.

## UI 풀테스트 기록

- 브라우저: Codex in-app browser, user manual click 없음
- 직접 조작 범위: setup/login/logout, user create, role guard, primary nav, dashboard filters, source create validation/retry, rules filter/scenario builder, client live controls, responsive/theme, ops events refresh
- 반응형/테마 범위: 56 route/theme/viewport screenshots, fail 0 for horizontal overflow/client leak scan
- 시각 품질 확인: screenshot artifact 중심. 모든 세부 control overlap 전수 판정은 미완료라 관련 기능은 FAIL 유지
- 제외 기록: 없음

## VA Seed / 최종 룰 상태

- seed dry-run: PASS
- seed plan/report: /private/tmp/media_server_ui_fulltest_restart_20260525_oehkFG/seed-plan.json
- seed registry dir: /private/tmp/media_server_ui_fulltest_restart_20260525_oehkFG/registry
- seed apply: registry dir로 서버 시작, 별도 HTTP apply는 실행하지 않음
- seed apply 명령: 실행하지 않음
- data storage:
  - auth users JSON: /private/tmp/media_server_ui_fulltest_restart_20260525_oehkFG/users.json
  - source registry JSON: /private/tmp/media_server_ui_fulltest_restart_20260525_oehkFG/registry/sources.json
  - published views JSON: /private/tmp/media_server_ui_fulltest_restart_20260525_oehkFG/registry/views.json
  - analysis registry JSON: /private/tmp/media_server_ui_fulltest_restart_20260525_oehkFG/registry/analysis.json
  - EventRecord JSON Lines: /private/tmp/media_server_ui_fulltest_restart_20260525_oehkFG/events/va_events.jsonl
  - snapshot dir: /private/tmp/media_server_ui_fulltest_restart_20260525_oehkFG/snapshots
  - clip dir: /private/tmp/media_server_ui_fulltest_restart_20260525_oehkFG/clips

## VA Event Occurrence Coverage

- `/ops/events` screenshot: `ops-events-after-records.png`
- visible rows: records 25/26, review 25개 observed in UI after refresh
- pagination/filter/archive 상태: include archives unchecked, next available; full pagination action not completed
- EventRecord active JSON Lines: 392 records sampled when `event-records-sample.json` was written; queue still non-empty
- `includeArchives=1` 조회 여부: yes, API sample only
- registry 대조 artifact: `event-records-sample.json`

| 개별 event 기능 | UI rows | JSON Lines/API records | 판정 | 비고 |
| --- | ---: | ---: | --- | --- |
| `presence` | yes | 374 | PASS | UI row and EventRecord sample observed |
| `enter` | no | 0 | FAIL | EventRecord not observed |
| `exit` | no | 0 | FAIL | EventRecord not observed |
| `line-crossing:any/forward/reverse` | no | 0 | FAIL | EventRecord not observed |
| `intrusion-dwell` | partial | 8 | PASS | API/EventRecord sample observed; UI rows page primarily showed presence first page |
| `re-entry` | no | 0 | FAIL | EventRecord not observed |
| `wrong-direction` | no | 0 | FAIL | EventRecord not observed |
| `intrusion-after-line-crossing` | no | 0 | FAIL | EventRecord not observed |
| `loitering` | partial | 8 | PASS | API/EventRecord sample observed; UI first page did not prove full type row |
| `zone-occupancy` | partial | 2 | PASS | API/EventRecord sample observed; UI first page did not prove full type row |

- missing event types: enter, exit, line-crossing, re-entry, wrong-direction, intrusion-after-line-crossing
- sample/video 한계: verifier queue drain timeout, droppedCount 743, queueSize > 0
- 최종 판정: FAIL

### VA EventRecord 후속 재검증

- 수정 파일: `scripts/internal/verify_va_tracking_events.sh`
- 변경 요약: `--dispatch-records` polling 전체를 저장하지 않고 `MEDIA_SERVER_VERIFY_VA_EVENTS_DISPATCH_EVERY_N` 기본 2 간격으로 dispatch하여 verifier가 기본 queue 2048을 포화시키지 않게 조정.
- 후속 명령: `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=http://127.0.0.1:8081 ./server.sh verify-va-events --dispatch-records`
- 후속 서버 조건: auth off 격리 서버, EventRecord storage enabled, 기본 queue 2048, snapshot/clip hook off
- 후속 결과: PASS, dispatch requests 90, stored 1588, failed 0, dropped 0
- 후속 artifact: `/tmp/media_server_vaevt-1779693560-58662_event_records.json`, `/tmp/media_server_vaevt-1779693560-58662_events.ndjson`, `/tmp/media_server_vaevt-1779693560-58662_overlay.jpg`
- 한계: 이 후속 검증은 VA tracker EventRecord verifier의 queue drain 실패 재검수다. `/ops/events` 제품 UI에서 모든 event/scenario row를 다시 필터/페이지/상세 확인하지 않았으므로 UI 풀테스트 최종 판정은 계속 FAIL이다.

### `/ops/events` 제품 UI 후속 재검수

- run dir: `/private/tmp/media_server_ui_events_recheck_9mDk8S`
- 서버 조건: auth off 격리 서버, manual UI seed registry, EventRecord storage enabled, snapshot/clip hook off
- EventRecord 생성 명령: `MEDIA_SERVER_VERIFY_VA_EVENTS_DISPATCH_EVERY_N=1 ./server.sh verify-va-events --dispatch-records`
- EventRecord 생성 결과: PASS, dispatch requests 180, stored 4688, failed 0, dropped 0
- EventRecord 생성 artifact: `/tmp/media_server_vaevt-1779694040-60535_event_records.json`, `/tmp/media_server_vaevt-1779694040-60535_events.ndjson`, `/tmp/media_server_vaevt-1779694040-60535_overlay.jpg`
- 브라우저 조작: `/ops/events` open, event records Next pagination 124회, evidence filter `missing`, archive 포함 checkbox on
- UI artifact:
  - `/private/tmp/media_server_ui_events_recheck_9mDk8S/browser/ops-events-after-va-pass.png`
  - `/private/tmp/media_server_ui_events_recheck_9mDk8S/browser/ops-events-page-next.png`
  - `/private/tmp/media_server_ui_events_recheck_9mDk8S/browser/ops-events-evidence-missing.png`
  - `/private/tmp/media_server_ui_events_recheck_9mDk8S/browser/ops-events-include-archives.png`
  - `/private/tmp/media_server_ui_events_recheck_9mDk8S/browser/ops-events-type-paging.json`
  - `/private/tmp/media_server_ui_events_recheck_9mDk8S/browser/ops-events-type-paging-more.json`
- UI에서 확인한 event type: `presence`, `enter`, `exit`, `line-crossing`, `intrusion-dwell`, `re-entry`, `wrong-direction`, `intrusion-after-line-crossing`, `loitering`, `zone-occupancy`
- UI에서 확인한 상태: storage `저장 4688`, `실패 0`, `드롭 0`, queue `0/2048`; pagination `offset 2975`, `hasMore yes`; evidence filter `missing`; archive 포함 checked
- 한계: auth-off 격리 서버 재검수라 auth/role guard와 함께 열린 제품 UI 증거는 아니다. Rule/scenario별 모든 개별 기능 ID 상세 row/action 재검수도 아직 끝나지 않았으므로 UI 풀테스트 최종 판정은 계속 FAIL이다.

## 기능별 직접 조작 기록

| 기능 ID | 영역 | 클릭/타이핑으로 확인한 항목 | 기대 결과 | 실제 결과 | 판정 | 비고 |
| --- | --- | --- | --- | --- | --- | --- |
| UI-001 | UI | 미완료 또는 일부만 확인 | auth/setup 상태별 redirect가 실제 route와 브라우저 화면에서 일치 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| UI-002 | UI | setup form, weak password rejection, strong admin setup, /login redirect screenshots: setup-initial.png, setup-weak-rejected.png, setup-strong-submitted.png | setup form 표시, weak/strong password flow 직접 확인 | 기대 evidence 확인 | PASS | setup form, weak password rejection, strong admin setup, /login redirect screenshots: setup-initial.png, setup-weak-rejected.png, setup-strong-submitted.png |
| UI-003 | UI | admin/operator/viewer login by browser typing; role landing screenshots: login-admin-success.png, login-operator-ops-home.png, login-viewer-client-live.png | credential 입력 후 role landing 확인 | 기대 evidence 확인 | PASS | admin/operator/viewer login by browser typing; role landing screenshots: login-admin-success.png, login-operator-ops-home.png, login-viewer-client-live.png |
| UI-004 | UI | 미완료 또는 일부만 확인 | 사용자 지정 테스트 pw -> 임시 pw 변경 성공, 임시 pw 로그인, 즉시 원래 pw 재사용 거부, history count 기준 복원 후 최종 로그인 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| UI-005 | UI | logout button clicked for viewer/operator/admin session switching; screenshots: logout-viewer.png | logout action 후 세션 종료와 보호 route 재접근 차단 확인 | 기대 evidence 확인 | PASS | logout button clicked for viewer/operator/admin session switching; screenshots: logout-viewer.png |
| UI-007 | UI | 미완료 또는 일부만 확인 | invite setup 전후 login/client 접근 경계 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| UI-008 | UI | 미완료 또는 일부만 확인 | request submit, pending copy, 승인 전 접근 차단 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| UI-009 | UI | primary nav opened /ops/home; responsive light/dark screenshots passed overflow check | home summary/nav/status가 표시되고 overflow 없음 | 기대 evidence 확인 | PASS | primary nav opened /ops/home; responsive light/dark screenshots passed overflow check |
| UI-010 | UI | primary nav opened /ops/dashboard; incident search/source filter and VA quality search operated; dashboard-filter-evidence.json | filter/search/copy/refresh와 주요 panel 표시 확인 | 기대 evidence 확인 | PASS | primary nav opened /ops/dashboard; incident search/source filter and VA quality search operated; dashboard-filter-evidence.json |
| UI-011 | UI | 미완료 또는 일부만 확인 | source/view CRUD와 validation을 직접 조작 | PASS 기준 전체를 증명하지 못함 | FAIL | Only source create validation was completed; full source/view CRUD was not completed. |
| UI-012 | UI | 미완료 또는 일부만 확인 | rule/template/profile CRUD, validation, preview 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | Only filter/scenario-builder apply was completed; rule/template/profile CRUD and preview were not completed. |
| UI-013 | UI | 미완료 또는 일부만 확인 | user/invite/access request/role/scope flow 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | User creation and role guard were completed; invite/access-request/reset/disable/last-admin flows were not completed. |
| UI-014 | UI | 미완료 또는 일부만 확인 | event filter/pagination/evidence action 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | Events UI rows appeared, but filter/pagination/evidence actions and full event-type coverage were not completed. |
| UI-015 | UI | 미완료 또는 일부만 확인 | video viewport/control/status/overlay와 session 지속성 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | Client controls were clicked, but actual video playback/session/overlay continuity was not proven. |
| UI-016 | UI | 미완료 또는 일부만 확인 | viewer scope 내 dashboard/filter/sort/copy 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | Client dashboard route opened, but filter/sort/copy workflow was not completed. |
| UI-017 | UI | 미완료 또는 일부만 확인 | viewer scope 내 events 표시와 비노출 경계 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| UI-018 | UI | 미완료 또는 일부만 확인 | 이전 제품 UI route와 임의 route가 제품 UI로 열리지 않음 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| UI-019 | UI | 56 responsive/theme route checks included light/dark; responsive-evidence.json fail=0 | 주요 화면에서 contrast/token/상태 색상 일관성 확인 | 기대 evidence 확인 | PASS | 56 responsive/theme route checks included light/dark; responsive-evidence.json fail=0 |
| UI-020 | UI | 1180px screenshots for ops/client routes passed horizontal overflow check | 1180px 이상에서 nav/table/form/video 겹침 없음 | 기대 evidence 확인 | PASS | 1180px screenshots for ops/client routes passed horizontal overflow check |
| UI-021 | UI | 320px/390px screenshots for ops/client routes passed horizontal overflow check | 320px/390px에서 text/control/video overflow 없음 | 기대 evidence 확인 | PASS | 320px/390px screenshots for ops/client routes passed horizontal overflow check |
| AUTH-004 | AUTH | 미완료 또는 일부만 확인 | login cookie 기반 보호 route 접근/차단 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| AUTH-005 | AUTH | missing users file led to /setup; strong setup redirected to /login | `/setup` redirect와 bootstrap 후 `/login` redirect 확인 | 기대 evidence 확인 | PASS | missing users file led to /setup; strong setup redirected to /login |
| AUTH-006 | AUTH | setup/login used readonly default admin username and admin user visible in /ops/users | setup/login/user 화면에서 기본 admin 정책 일치 | 기대 evidence 확인 | PASS | setup/login used readonly default admin username and admin user visible in /ops/users |
| AUTH-007 | AUTH | 미완료 또는 일부만 확인 | 빈 password 또는 hash 없는 admin으로 login 불가 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| AUTH-012 | AUTH | 미완료 또는 일부만 확인 | API 응답과 admin/user UI에 hash가 보이지 않음 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| AUTH-013 | AUTH | 미완료 또는 일부만 확인 | API 응답과 admin/user UI에 history가 보이지 않음 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| AUTH-014 | AUTH | 미완료 또는 일부만 확인 | API 응답과 UI에 tokenHash가 보이지 않음 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| AUTH-015 | AUTH | 미완료 또는 일부만 확인 | invite list/detail에 hash가 보이지 않음 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| AUTH-016 | AUTH | session-cookie browser login/logout exercised across admin/operator/viewer | cookie 세션으로 role landing과 logout이 동작 | 기대 evidence 확인 | PASS | session-cookie browser login/logout exercised across admin/operator/viewer |
| AUTH-018 | AUTH | created uioperator/uiviewer/uiintegrator via /ops/users UI; ops-users-created-roles.png | `/ops/users`에서 create 성공과 validation 확인 | 기대 evidence 확인 | PASS | created uioperator/uiviewer/uiintegrator via /ops/users UI; ops-users-created-roles.png |
| AUTH-019 | AUTH | 미완료 또는 일부만 확인 | role/scope/status 수정 후 목록/detail 반영 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| AUTH-020 | AUTH | 미완료 또는 일부만 확인 | disable/delete action 후 login/access 차단 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| AUTH-021 | AUTH | 미완료 또는 일부만 확인 | disabled user restore 후 의도된 접근 복구 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| AUTH-022 | AUTH | 미완료 또는 일부만 확인 | reset은 password history 우회가 아님을 확인하고, reset 성공 시 must-change/password flow와 session revoke 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| AUTH-023 | AUTH | 미완료 또는 일부만 확인 | 마지막 admin disable/role change가 거부 copy를 표시 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| AUTH-024 | AUTH | admin login landed on /ops/home and could see Users nav/count | ops/users/rules/sources 접근과 admin action 허용 | 기대 evidence 확인 | PASS | admin login landed on /ops/home and could see Users nav/count |
| AUTH-025 | AUTH | operator login landed on /ops/home; users count hidden/admin-only Users nav absent | ops 운영 범위 접근과 admin-only action 차단 | 기대 evidence 확인 | PASS | operator login landed on /ops/home; users count hidden/admin-only Users nav absent |
| AUTH-026 | AUTH | viewer login landed on /client/live; /ops/home showed Access Denied | client만 접근, ops/lab 차단 | 기대 evidence 확인 | PASS | viewer login landed on /client/live; /ops/home showed Access Denied |
| AUTH-027 | AUTH | 미완료 또는 일부만 확인 | API/scope 중심 접근과 제품 UI 경계 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| AUTH-028 | AUTH | 미완료 또는 일부만 확인 | read-only route/API 허용, write action 차단 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| AUTH-029 | AUTH | 미완료 또는 일부만 확인 | permitted write action만 성공 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| AUTH-030 | AUTH | viewer source tree showed only assigned views 9001/9003 | assigned view만 client 화면에 표시 | 기대 evidence 확인 | PASS | viewer source tree showed only assigned views 9001/9003 |
| AUTH-033 | AUTH | 미완료 또는 일부만 확인 | invite 생성 UI/API 성공, 원문 token 기록 금지 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| AUTH-034 | AUTH | 미완료 또는 일부만 확인 | invite setup 후 login/client 접근 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| AUTH-035 | AUTH | 미완료 또는 일부만 확인 | expired/consumed token이 거부됨 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| AUTH-036 | AUTH | 미완료 또는 일부만 확인 | public request 제출 후 pending 상태 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| AUTH-037 | AUTH | 미완료 또는 일부만 확인 | approve 후 invite/view scope 생성 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| AUTH-038 | AUTH | 미완료 또는 일부만 확인 | reject 후 invite/session/view scope 미생성 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| AUTH-039 | AUTH | 미완료 또는 일부만 확인 | pending 상태에서 user/session/view 접근 없음 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| AUTH-040 | AUTH | role guard evidence recorded in role-guard-evidence.json | role별 보호 route 접근/차단이 브라우저와 API에서 일치 | 기대 evidence 확인 | PASS | role guard evidence recorded in role-guard-evidence.json |
| SRC-001 | SRC | file source creation retried with non-duplicate imports/NewYorkDriving.mp4 and saved | file source form save 후 목록/view에서 사용 가능 | 기대 evidence 확인 | PASS | file source creation retried with non-duplicate imports/NewYorkDriving.mp4 and saved |
| SRC-002 | SRC | 미완료 또는 일부만 확인 | RTSP URL 저장, health/session 지속성 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| SRC-003 | SRC | 미완료 또는 일부만 확인 | URI 저장, 재생/health 상태 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| SRC-004 | SRC | 미완료 또는 일부만 확인 | WHEP URL 저장과 session wrapper 경계 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| SRC-005 | SRC | 미완료 또는 일부만 확인 | WHIP publish sourceId가 view/source registry에 반영 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| SRC-006 | SRC | /ops/sources list displayed seeded and new source rows | 목록 row/count/status가 API와 일치 | 기대 evidence 확인 | PASS | /ops/sources list displayed seeded and new source rows |
| SRC-007 | SRC | 미완료 또는 일부만 확인 | detail panel/route가 source fields를 표시 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| SRC-008 | SRC | duplicate source validation shown, then non-duplicate file channel save succeeded; source-ui-evidence.json | create validation과 성공 row 반영 | 기대 evidence 확인 | PASS | duplicate source validation shown, then non-duplicate file channel save succeeded; source-ui-evidence.json |
| SRC-009 | SRC | 미완료 또는 일부만 확인 | edit save 후 변경 값 반영 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| SRC-010 | SRC | 미완료 또는 일부만 확인 | delete 후 목록/view 참조 정리 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| SRC-011 | SRC | 미완료 또는 일부만 확인 | disabled source가 view/session/rule에서 차단됨 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| SRC-012 | SRC | 미완료 또는 일부만 확인 | health status가 dashboard/list에 반영 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| SRC-014 | SRC | 미완료 또는 일부만 확인 | no-device 경계와 field smoke 조건을 분리 기록 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| SRC-016 | SRC | 미완료 또는 일부만 확인 | view 목록/count/scope 표시 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| SRC-017 | SRC | 미완료 또는 일부만 확인 | create 후 client/viewer scope에서 선택 가능 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| SRC-018 | SRC | 미완료 또는 일부만 확인 | source/rule/scope 변경 후 반영 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| SRC-019 | SRC | 미완료 또는 일부만 확인 | 삭제 후 client view와 session 접근 차단 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| SRC-020 | SRC | 미완료 또는 일부만 확인 | inactive view가 client/rule/session에서 차단 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| SRC-021 | SRC | 미완료 또는 일부만 확인 | view-source mapping이 client live에 반영 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| SRC-022 | SRC | 미완료 또는 일부만 확인 | PublishedView `allowedRuleIds`가 client list/detail API에 유지되고 허용 rule만 client session/metadata에 반영 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| SRC-023 | SRC | 미완료 또는 일부만 확인 | viewer별 assigned view만 노출 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| SRC-024 | SRC | 미완료 또는 일부만 확인 | wrapper session 생성/종료와 media path 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| SRC-025 | SRC | 미완료 또는 일부만 확인 | view-scoped dashboard가 assigned data만 표시 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| SRC-026 | SRC | 미완료 또는 일부만 확인 | view-scoped events가 assigned data만 표시 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| SRC-028 | SRC | admin /client/live displayed admin preview state; admin-client-preview.png | admin client 화면에 preview 상태가 명확히 표시 | 기대 evidence 확인 | PASS | admin /client/live displayed admin preview state; admin-client-preview.png |
| SRC-029 | SRC | client live/dashboard leak scan found no source URL token in responsive evidence | client 화면/API에 source URL이 보이지 않음 | 기대 evidence 확인 | PASS | client live/dashboard leak scan found no source URL token in responsive evidence |
| SRC-030 | SRC | client live/dashboard leak scan found no Developer URL token in responsive evidence | client 화면에 Developer URL이 보이지 않음 | 기대 evidence 확인 | PASS | client live/dashboard leak scan found no Developer URL token in responsive evidence |
| RULE-001 | RULE | /ops/rules VA rule list count/status visible; ops-rules-nav-click.png | list count/status/source/type/profile이 표시됨 | 기대 evidence 확인 | PASS | /ops/rules VA rule list count/status visible; ops-rules-nav-click.png |
| RULE-002 | RULE | /ops/rules event template list count/status visible; ops-rules-nav-click.png | template 목록과 type/scenario summary 표시 | 기대 evidence 확인 | PASS | /ops/rules event template list count/status visible; ops-rules-nav-click.png |
| RULE-003 | RULE | /ops/rules profile list count/status visible; ops-rules-nav-click.png | profile 목록과 detector/FPS/tracking summary 표시 | 기대 evidence 확인 | PASS | /ops/rules profile list count/status visible; ops-rules-nav-click.png |
| RULE-004 | RULE | 미완료 또는 일부만 확인 | source/template/profile/geometry 선택 후 저장 성공 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-005 | RULE | 미완료 또는 일부만 확인 | 변경 값 저장 후 list/detail 반영 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-006 | RULE | 미완료 또는 일부만 확인 | 삭제 후 allowed rule/session에서 제거 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-007 | RULE | 미완료 또는 일부만 확인 | detail에 source/template/profile/geometry/status 표시 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-008 | RULE | 미완료 또는 일부만 확인 | active/inactive 전환과 적용 상태 반영 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-009 | RULE | 미완료 또는 일부만 확인 | source select와 validation 동작 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-010 | RULE | 미완료 또는 일부만 확인 | template 선택과 저장 payload 반영 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-011 | RULE | 미완료 또는 일부만 확인 | profile 선택과 저장 payload 반영 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-012 | RULE | 미완료 또는 일부만 확인 | polygon/region 값 입력/초기화/저장 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-013 | RULE | 미완료 또는 일부만 확인 | line points/direction 입력/저장 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-014 | RULE | 미완료 또는 일부만 확인 | output URL/copy 표시가 role 정책과 일치 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-015 | RULE | 미완료 또는 일부만 확인 | status badge/copy가 runtime/API와 일치 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-016 | RULE | 미완료 또는 일부만 확인 | 사용자가 직접 id 입력하지 않고 다음 번호가 부여 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-017 | RULE | 미완료 또는 일부만 확인 | id field가 노출/수정되지 않음 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-018 | RULE | 미완료 또는 일부만 확인 | basic/scenario template 생성 성공 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-019 | RULE | 미완료 또는 일부만 확인 | type/condition 변경 저장 후 반영 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-020 | RULE | 미완료 또는 일부만 확인 | 삭제 후 참조 rule validation 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-021 | RULE | 미완료 또는 일부만 확인 | condition/geometry/cooldown summary 표시 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-022 | RULE | 미완료 또는 일부만 확인 | detector/FPS/queue/input/tracker 설정 저장 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-023 | RULE | 미완료 또는 일부만 확인 | profile field 변경 후 반영 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-024 | RULE | 미완료 또는 일부만 확인 | 삭제 후 참조 rule validation 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-025 | RULE | 미완료 또는 일부만 확인 | detector/FPS/queue/tracker/Re-ID 표시 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-026 | RULE | 미완료 또는 일부만 확인 | detector 선택과 payload 저장 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-027 | RULE | 미완료 또는 일부만 확인 | dummy detector 선택과 payload 저장 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-028 | RULE | 미완료 또는 일부만 확인 | numeric input validation과 저장 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-029 | RULE | 미완료 또는 일부만 확인 | queue input validation과 저장 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-030 | RULE | 미완료 또는 일부만 확인 | confidence range validation과 저장 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-031 | RULE | 미완료 또는 일부만 확인 | NMS range validation과 저장 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-032 | RULE | 미완료 또는 일부만 확인 | width/height validation과 저장 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-033 | RULE | 미완료 또는 일부만 확인 | tracking category summary가 선택 값과 일치 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-034 | RULE | 미완료 또는 일부만 확인 | tracker none 저장과 Re-ID off 정책 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-035 | RULE | 미완료 또는 일부만 확인 | lite 저장과 runtime 안정성 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-036 | RULE | 미완료 또는 일부만 확인 | kalman-lite 저장과 runtime 안정성 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-037 | RULE | 미완료 또는 일부만 확인 | bytetrack 저장과 runtime 안정성 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-038 | RULE | 미완료 또는 일부만 확인 | Re-ID off 저장과 metadata policy 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-039 | RULE | 미완료 또는 일부만 확인 | assist 저장과 tracker 조합 정책 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-040 | RULE | 미완료 또는 일부만 확인 | invalid 조합이 저장되지 않거나 off로 정규화 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-041 | RULE | 미완료 또는 일부만 확인 | template 생성과 최종 EventRecord `presence` 발생 이력 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | presence EventRecords were observed, but UI template create flow was not completed. |
| RULE-042 | RULE | 미완료 또는 일부만 확인 | template 생성과 최종 EventRecord `enter` 발생 이력 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | enter EventRecord was not observed in this run. |
| RULE-043 | RULE | 미완료 또는 일부만 확인 | template 생성과 최종 EventRecord `exit` 발생 이력 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | exit EventRecord was not observed in this run. |
| RULE-044 | RULE | 미완료 또는 일부만 확인 | line geometry/direction 저장과 최종 EventRecord `line-crossing` 발생 이력 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | line-crossing EventRecord was not observed in this run. |
| RULE-045 | RULE | 미완료 또는 일부만 확인 | any direction 저장과 적용 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-046 | RULE | 미완료 또는 일부만 확인 | forward 저장과 적용 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-047 | RULE | 미완료 또는 일부만 확인 | reverse 저장과 적용 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-048 | RULE | 미완료 또는 일부만 확인 | scenario UI 저장과 최종 EventRecord `intrusion-dwell` 발생 이력 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-049 | RULE | 미완료 또는 일부만 확인 | scenario UI 저장과 최종 EventRecord `re-entry` 발생 이력 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | re-entry EventRecord was not observed in this run. |
| RULE-050 | RULE | 미완료 또는 일부만 확인 | scenario UI 저장과 최종 EventRecord `wrong-direction` 발생 이력 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | wrong-direction EventRecord was not observed in this run. |
| RULE-051 | RULE | 미완료 또는 일부만 확인 | scenario UI 저장과 최종 EventRecord `intrusion-after-line-crossing` 발생 이력 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | intrusion-after-line-crossing EventRecord was not observed in this run. |
| RULE-052 | RULE | 미완료 또는 일부만 확인 | scenario UI 저장과 최종 EventRecord `loitering` 발생 이력 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-053 | RULE | 미완료 또는 일부만 확인 | scenario UI 저장과 최종 EventRecord `zone-occupancy` 발생 이력 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-054 | RULE | 미완료 또는 일부만 확인 | preset 선택 후 condition 값 반영 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-055 | RULE | 미완료 또는 일부만 확인 | preset 선택 후 condition 값 반영 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-056 | RULE | 미완료 또는 일부만 확인 | preset 선택 후 condition 값 반영 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-057 | RULE | 미완료 또는 일부만 확인 | preset 선택 후 condition 값 반영 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-058 | RULE | 미완료 또는 일부만 확인 | preset 선택 후 condition 값 반영 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-059 | RULE | 미완료 또는 일부만 확인 | preset 선택 후 condition 값 반영 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-060 | RULE | 미완료 또는 일부만 확인 | preset 선택 후 condition 값 반영 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-061 | RULE | 미완료 또는 일부만 확인 | preset 선택 후 condition 값 반영 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-062 | RULE | 미완료 또는 일부만 확인 | preset 선택 후 condition 값 반영 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-063 | RULE | 미완료 또는 일부만 확인 | preset 선택 후 condition 값 반영 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-064 | RULE | 미완료 또는 일부만 확인 | preset 선택 후 condition 값 반영 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-065 | RULE | 미완료 또는 일부만 확인 | custom value 입력과 저장 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-066 | RULE | 미완료 또는 일부만 확인 | zone geometry 저장과 payload 반영 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-067 | RULE | 미완료 또는 일부만 확인 | candidateTime validation과 저장 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-068 | RULE | 미완료 또는 일부만 확인 | dwellTime validation과 저장 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-069 | RULE | 미완료 또는 일부만 확인 | cooldown validation과 저장 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-070 | RULE | 미완료 또는 일부만 확인 | polygon zone 저장 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-071 | RULE | 미완료 또는 일부만 확인 | reEntryWindow validation과 저장 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-072 | RULE | 미완료 또는 일부만 확인 | cooldown validation과 저장 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-073 | RULE | 미완료 또는 일부만 확인 | line geometry 저장 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-074 | RULE | 미완료 또는 일부만 확인 | allowed direction에서 `any` 제외 정책 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-075 | RULE | 미완료 또는 일부만 확인 | cooldown validation과 저장 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-076 | RULE | 미완료 또는 일부만 확인 | trigger line 저장 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-077 | RULE | 미완료 또는 일부만 확인 | any/forward/reverse 저장 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-078 | RULE | 미완료 또는 일부만 확인 | target zone 저장 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-079 | RULE | 미완료 또는 일부만 확인 | maxDelayAfterCrossingMs validation과 저장 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-080 | RULE | 미완료 또는 일부만 확인 | dwell validation과 저장 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-081 | RULE | 미완료 또는 일부만 확인 | cooldown validation과 저장 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-082 | RULE | 미완료 또는 일부만 확인 | target zone 저장 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-083 | RULE | 미완료 또는 일부만 확인 | min dwell validation과 저장 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-084 | RULE | 미완료 또는 일부만 확인 | radius validation과 저장 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-085 | RULE | 미완료 또는 일부만 확인 | min points validation과 저장 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-086 | RULE | 미완료 또는 일부만 확인 | cooldown validation과 저장 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-087 | RULE | 미완료 또는 일부만 확인 | `/ops/rules` loitering form의 ground-plane toggle이 표시되고 `scenario.useGroundPlaneMovementRadius` 저장/재조회에 반영 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-088 | RULE | 미완료 또는 일부만 확인 | target zone 저장 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-089 | RULE | 미완료 또는 일부만 확인 | threshold validation과 저장 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-090 | RULE | 미완료 또는 일부만 확인 | min dwell validation과 저장 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-091 | RULE | 미완료 또는 일부만 확인 | cooldown validation과 저장 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-092 | RULE | 미완료 또는 일부만 확인 | `/ops/rules` validation panel이 VA rule/event template/profile 중복 ID를 표시하고, 서버 create API가 기존 event template/VA rule ID 재생성을 거부 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-093 | RULE | 미완료 또는 일부만 확인 | `/ops/rules` 저장 전 missing profile과 missing template을 각각 차단하고, 서버가 `analysis.profileId`/`templateStart.ruleId` missing reference 저장을 거부 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-094 | RULE | 미완료 또는 일부만 확인 | `/ops/rules` 저장 전 inactive profile과 inactive template을 각각 차단하고, 서버가 inactive `analysis.profileId`/`templateStart.ruleId` 저장을 거부 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-095 | RULE | 미완료 또는 일부만 확인 | `/ops/rules` validation matrix가 source mismatch를 표시하고, mismatched PublishedView `va-rule` session apply가 `vaRule source must match PublishedView source`로 거부 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-096 | RULE | 미완료 또는 일부만 확인 | `/ops/rules` validation matrix가 inactive channel/view를 표시하고, inactive PublishedView와 inactive source의 `va-rule` session apply가 각각 404로 거부 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-097 | RULE | 미완료 또는 일부만 확인 | viewer가 권한 없는 rule/view를 보지 못함 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-098 | RULE | 미완료 또는 일부만 확인 | source는 일치하지만 PublishedView `allowedRuleIds` 밖인 VA rule이 `/ops/rules`에서 표시되고 client `va-rule` session이 `allowed vaRule is required for va-rule mode`로 거부 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-100 | RULE | 미완료 또는 일부만 확인 | `/ops/rules` validation matrix가 `priority-conflict`를 표시하고, 같은 source+priority의 두 번째 VA rule 저장 API가 `vaRule priority conflicts with existing rule on same source`로 거부 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| RULE-101 | RULE | 미완료 또는 일부만 확인 | `/ops/rules` 저장 전 검증이 profile/template class mismatch를 쓰기 없이 차단하고, 서버가 `analysis.classes`/profile classes가 template classes를 포함하지 않는 VA rule 저장을 각각 거부 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| EVT-001 | EVT | 미완료 또는 일부만 확인 | runtime status가 dashboard/home에 반영되고 drift 없음 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| EVT-003 | EVT | 미완료 또는 일부만 확인 | source health list/dashboard 표시가 상태와 일치 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| EVT-004 | EVT | 미완료 또는 일부만 확인 | log tail 표시와 redaction 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| EVT-007 | EVT | 후속 auth-off 격리 서버에서 `/ops/events` row/filter/pagination/archive 조작 및 10개 event type row 확인 | `/ops/events` rows/filter/pagination/archive 상태가 표시되고 최종 rule/scenario별 EventRecord 발생 이력과 대조됨 | auth-off 격리 UI evidence는 보강됐지만 auth/role 포함 제품 UI와 rule/scenario별 전체 상세 action 재검수는 미완료 | FAIL | 후속 UI artifacts: `/private/tmp/media_server_ui_events_recheck_9mDk8S/browser/ops-events-type-paging*.json`. UI 풀테스트 PASS 기준에는 아직 부족. |
| EVT-016 | EVT | /ops/events status panel opened and refreshed; ops-events-after-records.png | events status panel/API 일치 | 기대 evidence 확인 | PASS | /ops/events status panel opened and refreshed; ops-events-after-records.png |
| EVT-017 | EVT | 미완료 또는 일부만 확인 | deliveries list/filter 표시 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| EVT-018 | EVT | 미완료 또는 일부만 확인 | `/ops/events` Alert Delivery에서 integration 저장 후 Fixture/test action을 클릭하면 최근 시도에 `delivered · fixture`가 표시되고 endpoint token은 redacted 상태로 유지 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| EVT-019 | EVT | Rule Event Review Inbox showed 25 review rows after EventRecord generation | review inbox list 표시 | 기대 evidence 확인 | PASS | Rule Event Review Inbox showed 25 review rows after EventRecord generation |
| EVT-020 | EVT | 미완료 또는 일부만 확인 | review detail/status 표시 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| EVT-021 | EVT | 미완료 또는 일부만 확인 | status change 저장과 audit 반영 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| EVT-022 | EVT | 미완료 또는 일부만 확인 | audit list/filter/export 표시 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| EVT-023 | EVT | /ops/dashboard event/runtime summary opened and filter controls operated | event summary count/status 표시 | 기대 evidence 확인 | PASS | /ops/dashboard event/runtime summary opened and filter controls operated |
| EVT-024 | EVT | 미완료 또는 일부만 확인 | runtime summary가 장시간 drift 없이 유지 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| EVT-025 | EVT | /ops/dashboard source/channel summary opened with seeded/new channel counts | source/channel summary count/status 표시 | 기대 evidence 확인 | PASS | /ops/dashboard source/channel summary opened with seeded/new channel counts |
| EVT-026 | EVT | 미완료 또는 일부만 확인 | VA status/tap/event summary 표시와 안정성 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| CLIENT-001 | CLIENT | viewer /client/live source tree showed assigned views only; login-viewer-client-live.png | assigned view만 source tree에 표시 | 기대 evidence 확인 | PASS | viewer /client/live source tree showed assigned views only; login-viewer-client-live.png |
| CLIENT-002 | CLIENT | 미완료 또는 일부만 확인 | tile start 후 video/status/session 생성 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | No successful WebRTC video session was proven from browser UI. |
| CLIENT-005 | CLIENT | 미완료 또는 일부만 확인 | stop/reconnect/logout 후 session cleanup 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | Stop was clicked, but successful session creation/cleanup was not proven. |
| CLIENT-006 | CLIENT | 미완료 또는 일부만 확인 | dashboard가 viewer scope 안의 data만 표시 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| CLIENT-007 | CLIENT | 미완료 또는 일부만 확인 | events가 viewer scope 안의 data만 표시 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| CLIENT-009 | CLIENT | 미완료 또는 일부만 확인 | grid/density/dock preference 저장 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| CLIENT-010 | CLIENT | 미완료 또는 일부만 확인 | reload 후 preference 복원 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| CLIENT-011 | CLIENT | 미완료 또는 일부만 확인 | unassigned view가 목록/API/UI에 보이지 않음 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| CLIENT-012 | CLIENT | viewer /client/live had no Ops navigation; role-guard-evidence.json | client shell에 Ops nav 없음 | 기대 evidence 확인 | PASS | viewer /client/live had no Ops navigation; role-guard-evidence.json |
| CLIENT-013 | CLIENT | viewer /client/live had no Lab navigation in body/route evidence | client shell에 Lab nav 없음 | 기대 evidence 확인 | PASS | viewer /client/live had no Lab navigation in body/route evidence |
| CLIENT-014 | CLIENT | client live/dashboard responsive leak scan found no raw JSON text | raw JSON/debug details가 client에 보이지 않음 | 기대 evidence 확인 | PASS | client live/dashboard responsive leak scan found no raw JSON text |
| CLIENT-015 | CLIENT | client live/dashboard responsive leak scan found no debugCounters text | debug counters가 client에 보이지 않음 | 기대 evidence 확인 | PASS | client live/dashboard responsive leak scan found no debugCounters text |
| CLIENT-016 | CLIENT | client live/dashboard responsive leak scan found no BBox diagnostics text | bbox diagnostics가 client에 보이지 않음 | 기대 evidence 확인 | PASS | client live/dashboard responsive leak scan found no BBox diagnostics text |
| CLIENT-017 | CLIENT | client live/dashboard did not expose rule/profile editor controls to viewer | editor controls가 client에 보이지 않음 | 기대 evidence 확인 | PASS | client live/dashboard did not expose rule/profile editor controls to viewer |
| CLIENT-018 | CLIENT | admin client preview state visible on /client/live and /client/dashboard | admin preview banner/state 표시 | 기대 evidence 확인 | PASS | admin client preview state visible on /client/live and /client/dashboard |
| CLIENT-019 | CLIENT | 미완료 또는 일부만 확인 | video viewport가 재생되고 잘리지 않음 | PASS 기준 전체를 증명하지 못함 | FAIL | No visible playing video frame was proven. |
| CLIENT-020 | CLIENT | client live play/stop controls clicked; client-live-evidence.json | start/stop/reconnect/control 조작 확인 | 기대 evidence 확인 | PASS | client live play/stop controls clicked; client-live-evidence.json |
| CLIENT-021 | CLIENT | 미완료 또는 일부만 확인 | overlay toggle/status/metadata 일치 | PASS 기준 전체를 증명하지 못함 | FAIL | VA mode was toggled, but live metadata/overlay match was not proven. |
| CLIENT-022 | CLIENT | client live status/caption text visible without forbidden leak; client-live-interactions.png | caption/status가 viewport를 가리지 않고 표시 | 기대 evidence 확인 | PASS | client live status/caption text visible without forbidden leak; client-live-interactions.png |
| MEDIA-016 | MEDIA | 미완료 또는 일부만 확인 | sample 영상 표시. 단, 모든 VA 이벤트 검증으로 쓰지 않음 | PASS 기준 전체를 증명하지 못함 | FAIL | No actual sample video playback evidence. |
| MEDIA-017 | MEDIA | 미완료 또는 일부만 확인 | 여러 tile/channel 동시 재생과 layout 안정성 확인 | PASS 기준 전체를 증명하지 못함 | FAIL | No multi-channel playback evidence. |
| SAFE-015 | SAFE | ops/client route evidence did not show lab editor embedded in product screen | ops/client 제품 화면에 lab editor가 없음 | 기대 evidence 확인 | PASS | ops/client route evidence did not show lab editor embedded in product screen |
| SAFE-016 | SAFE | 미완료 또는 일부만 확인 | 정의하지 않은 route가 404 처리됨 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| SAFE-017 | SAFE | 미완료 또는 일부만 확인 | `/lab` 구 UI route가 제품 UI로 열리지 않음 | PASS 기준 전체를 증명하지 못함 | FAIL | 이번 run에서 해당 기능 ID의 개별 클릭/타이핑/반영/로그 evidence가 부족하거나 미실행입니다. |
| SAFE-018 | SAFE | viewer/client leak checks passed for debug/source/raw tokens | client 화면/API에 debug/source/raw 정보 없음 | 기대 evidence 확인 | PASS | viewer/client leak checks passed for debug/source/raw tokens |
| SAFE-019 | SAFE | screenshots/results omit plaintext password, tokenHash, passwordHash; temp password file removed | password/token/session material이 artifact/UI/API에 없음 | 기대 evidence 확인 | PASS | screenshots/results omit plaintext password, tokenHash, passwordHash; temp password file removed |
| SAFE-020 | SAFE | admin/operator/viewer route/nav separation confirmed by role-guard-evidence.json | ops/client nav, route, action guard가 role별로 분리 | 기대 evidence 확인 | PASS | admin/operator/viewer route/nav separation confirmed by role-guard-evidence.json |

## 확인됨

- 실제 브라우저로 `/setup`, `/login`, `/ops/home`, `/ops/dashboard`, `/ops/sources`, `/ops/rules`, `/ops/users`, `/ops/events`, `/client/live`, `/client/dashboard`를 열고 조작함.
- 사용자 수동 클릭 없이 진행함.
- source create 첫 시도 `duplicate source` 실패 후 non-duplicate file로 재검수 PASS.
- VA EventRecord는 일부 발생했지만 전수 coverage 실패.

## 실패

| 화면 | 재현 조작 | 기대 결과 | 실제 결과 | 로그/스크린샷 | 영향 범위 | 재검수 |
| --- | --- | --- | --- | --- | --- | --- |
| `/ops/sources` | sample_h264.mp4 file source 생성 | 기존 source와 충돌 시 validation 표시 | `duplicate source` 표시 | `ops-sources-created-file-channel.png` | validation 정상, 첫 생성 시도 실패 | imports/NewYorkDriving.mp4로 재시도 PASS |
| VA verifier | `verify-va-events --dispatch-records` | queue drain + all required EventRecords | 최초 queue drain timeout 후 verifier dispatch cadence 수정, 기본 queue 재검증 PASS | command output, `event-records-sample.json`, `/tmp/media_server_vaevt-1779693560-58662_event_records.json` | verifier queue blocker는 해소. `/ops/events` UI 전수 row는 아직 미완료 | UI 재검수 필요 |
| 기능별 UI 풀테스트 | 219개 기능 ID 전수 | 모든 행 PASS | FAIL 행 존재 | 이 문서 기능별 표 | 전체 UI 풀테스트 FAIL | 미완료 |

## 제외 기록

| 항목 | 제외 이유 | 후속 확인 조건 |
| --- | --- | --- |
| 없음 | - | - |

## 최종 판정

- 최종 결론: FAIL
- PASS 조건: 개별 기능 실패 행 0개, 현재 실패 행 175개
- 제품 회귀 여부: 확인된 제품 회귀로 단정하지 않음. VA verifier queue drain timeout은 verifier dispatch cadence 수정 후 기본 queue에서 재검증 PASS. 남은 실패는 UI coverage 미완료와 `/ops/events` 제품 UI 재검수 미완료.
- 환경/sandbox 한계: local loopback은 일부 명령에서 sandbox 바깥 실행 필요.
- 수정 필요 이슈: `/ops/events` 제품 UI에서 전체 event/scenario row 재검수, 나머지 기능 ID 직접 조작 증거 보강.
- 커밋: 결과 문서 작성 전 기준 커밋 `82c79c2`
- 푸시 가능: 아니오
- 푸시 수행 여부: 수행하지 않음

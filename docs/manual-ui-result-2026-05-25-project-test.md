# Manual UI Result - 2026-05-25 Project Test

## 검수 메타데이터

- 브라우저: 인앱 브라우저
- release baseline: `v1.8.0`
- feature inventory: [project-feature-test-inventory.md](./project-feature-test-inventory.md)
- seed registry dir: `/private/tmp/media_server_manual_ui_20260525_RIbb3k/registry`
- EventRecord JSON Lines: `/private/tmp/media_server_manual_ui_20260525_RIbb3k/events.jsonl`
- manual evidence dir: `/private/tmp/media_server_manual_ui_20260525_RIbb3k/evidence`
- ops/client screenshot verifier artifact: `/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_ops-client-ui-1779681934299-85209`
- token start: `0`
- token end: `1,330,050`
- token consumed: `1,330,050`
- elapsed: `155m 24s`
- source: Codex goal usage snapshot during evidence update
- 최종 결론: FAIL

## 테스트 영역별 판정

스크립트 테스트와 UI 풀테스트는 서로 대체하지 않습니다. 아래 판정은 이번 run에서
실제로 실행한 명령과 인앱 브라우저 조작만 기준으로 기록합니다.

| 영역 | 범위 | 판정 | evidence |
| --- | --- | --- | --- |
| 안정화 테스트 | build, auth bootstrap/users/routes, ops/client UI smoke, ops/client screenshot smoke, rule UI, `git diff --check` | PASS | `./server.sh build`, `./server.sh verify-auth-bootstrap`, `./server.sh verify-auth-users`, `./server.sh verify-auth-routes`, `./server.sh verify-ops-client-ui`, `./server.sh verify-ops-client-ui --screenshots`, `./server.sh verify-rule-ui`, `git diff --check` |
| 30분 테스트 | `./server.sh verify-predev --soak-minutes 30` 재실행 | PASS | `/tmp/media_server_predev-1779676050-41836_summary.json`, `/tmp/media_server_predev-1779676050-41836_report.md`, `/tmp/media_server_predev-1779676050-41836_report.html` |
| 120분 테스트 | 필요 판단만 수행. 30분 soak와 runtime/UI 재검수에서 장시간 누수 의심 신호가 없어 사용자 승인 전 실행하지 않음 | 실행하지 않음 | 사용자 승인 전 실행하지 않음 |
| UI 풀테스트 | 인앱 브라우저 route/auth/client live/VA event coverage와 반응형 재검수 | FAIL | 아래 `확인됨`, `VA rule/scenario/EventRecord 대조`, `실패` 섹션 |

## 스크립트 테스트 기록

| 명령 | 실제 결과 | 판정 | 비고 |
| --- | --- | --- | --- |
| `./server.sh build` | build-gst-onnx target build 완료 | PASS | UI CSS 수정 후 재실행 |
| `./server.sh verify-auth-bootstrap` | 14 pass / 0 fail | PASS | 최초 sandbox bind 실패 후 제한 밖 재실행 |
| `./server.sh verify-auth-users` | 58 pass / 0 fail | PASS | auth verifier env 5개 SET |
| `./server.sh verify-auth-routes` | 127 pass / 0 fail | PASS | auth verifier env 5개 SET |
| `./server.sh verify-ops-client-ui` | 23 pass / 0 fail | PASS | 최초 서버 미기동/sandbox fetch 실패 후 throwaway 서버로 재실행 |
| `./server.sh verify-ops-client-ui --screenshots` | UI smoke 23 pass / 0 fail, screenshot smoke 28 pass / 0 fail, header/keyboard/audit/ONVIF smoke pass | PASS | `/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_ops-client-ui-1779681934299-85209/index.md` |
| `./server.sh verify-rule-ui` | native smoke JSON `ok: true` | PASS | `/ops/rules` validation/mobile geometry/navigation |
| `./server.sh verify-predev --soak-minutes 30` | 119 pass / 0 fail / 1 skip | PASS | 최초 RTSP VA overlay decode timeout 후 verifier retry fix 적용, 재실행 통과 |
| `git diff --check` | 출력 없음 | PASS | whitespace 검사 통과 |

## UI 풀테스트 기록

| 화면 | 계정/권한 | 직접 조작 | 실제 결과 | artifact | 판정 |
| --- | --- | --- | --- | --- | --- |
| `/setup` | unauth | weak password 입력 후 제출 | weak password 거부 copy 표시 | `/private/tmp/media_server_manual_ui_20260525_RIbb3k/evidence/01_setup_weak_rejection.png` | PASS |
| `/setup` | unauth | strong admin password 입력 후 제출 | `/login` redirect | `/private/tmp/media_server_manual_ui_20260525_RIbb3k/evidence/02_setup_strong_redirect_login.png` | PASS |
| `/login` | admin | admin credential 입력 후 로그인 | `/ops/home` 진입 | `/private/tmp/media_server_manual_ui_20260525_RIbb3k/evidence/03_admin_login_ops_home.png` | PASS |
| `/ops/home` | admin | route 직접 진입 | Home summary/nav 표시 | `/private/tmp/media_server_manual_ui_20260525_RIbb3k/evidence/route__ops_home.png` | PASS |
| `/ops/dashboard` | admin | route 직접 진입, responsive overflow 측정 | 최초 390px light overflow 발견 후 CSS 수정, 72개 responsive matrix 재검수 72 pass / 0 fail | `/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_ops-client-ui-1779681934299-85209/ops-dashboard-390.png` | PASS |
| `/ops/sources` | admin | route 직접 진입 | Channels 화면 표시 | `/private/tmp/media_server_manual_ui_20260525_RIbb3k/evidence/route__ops_sources.png` | PASS |
| `/ops/rules` | admin | route 직접 진입 | Rules 화면 표시 | `/private/tmp/media_server_manual_ui_20260525_RIbb3k/evidence/route__ops_rules.png` | PASS |
| `/ops/users` | admin | route 직접 진입 | Users 화면 표시 | `/private/tmp/media_server_manual_ui_20260525_RIbb3k/evidence/route__ops_users.png` | PASS |
| `/ops/events` | admin | EventRecord rows, pagination next 반복 | 아래 VA event type 전체가 UI row에서 표시됨 | `/private/tmp/media_server_manual_ui_20260525_RIbb3k/evidence/06_ops_events_after_relogin.png` | PASS |
| `/client/live` | admin preview | tile 1 play, tile 1 disconnect | online/status 표시 후 offline/disconnected 확인, viewer forbidden text 0 | `/private/tmp/media_server_manual_ui_20260525_RIbb3k/evidence/07_client_live_tile_play.png` | PASS |
| `/client/dashboard` | admin preview | route 직접 진입 | assigned channel dashboard 표시 | `/private/tmp/media_server_manual_ui_20260525_RIbb3k/evidence/route__client_dashboard.png` | PASS |
| `/client/request-access` | public | route 직접 진입 | public request access form 표시 | `/private/tmp/media_server_manual_ui_20260525_RIbb3k/evidence/route__client_request_access.png` | PASS |

## VA rule/scenario/EventRecord 대조

`/ops/events` UI pagination에서 각 event type row를 직접 열어 확인했고, EventRecord
JSON Lines는 rule/scenario id coverage 대조용 보조 evidence로만 사용했습니다.
최종 파일은 3,329개 EventRecord를 포함했습니다.

| event coverage | seed rule ids | EventRecord count | UI artifact | 발생 출처 | 판정 |
| --- | --- | --- | --- | --- | --- |
| `presence` | `9201`, `9301` | 3,168 | `/private/tmp/media_server_manual_ui_20260525_RIbb3k/evidence/event_type_presence_page_0.png` | live file dispatch | PASS |
| `enter` | `9202`, `9302` | 20 | `/private/tmp/media_server_manual_ui_20260525_RIbb3k/evidence/event_type_enter_page_12.png` | live file dispatch | PASS |
| `exit` | `9203`, `9303` | 10 | `/private/tmp/media_server_manual_ui_20260525_RIbb3k/evidence/event_type_exit_page_40.png` | live file dispatch | PASS |
| `line-crossing:any` | `9204`, `9304` | 18 | `/private/tmp/media_server_manual_ui_20260525_RIbb3k/evidence/event_type_line_crossing_page_11.png` | live file dispatch + JSON Lines rule id 대조 | PASS |
| `line-crossing:forward` | `9205`, `9305` | 6 | `/private/tmp/media_server_manual_ui_20260525_RIbb3k/evidence/event_type_line_crossing_page_11.png` | live file dispatch + JSON Lines rule id 대조 | PASS |
| `line-crossing:reverse` | `9206`, `9306` | 12 | `/private/tmp/media_server_manual_ui_20260525_RIbb3k/evidence/event_type_line_crossing_page_11.png` | live file dispatch + JSON Lines rule id 대조 | PASS |
| `intrusion-dwell` | `9207`, `9307` | 28 | `/private/tmp/media_server_manual_ui_20260525_RIbb3k/evidence/event_type_intrusion_dwell_page_0.png` | live file dispatch | PASS |
| `re-entry` | `9208`, `9308` | 6 | `/private/tmp/media_server_manual_ui_20260525_RIbb3k/evidence/event_type_re_entry_page_90.png` | VA replay harness into EventStorage, not live video | PASS |
| `wrong-direction` | `9209`, `9309` | 12 | `/private/tmp/media_server_manual_ui_20260525_RIbb3k/evidence/event_type_wrong_direction_page_11.png` | live file dispatch | PASS |
| `intrusion-after-line-crossing` | `9210`, `9310` | 15 | `/private/tmp/media_server_manual_ui_20260525_RIbb3k/evidence/event_type_intrusion_after_line_crossing_page_11.png` | live file dispatch | PASS |
| `loitering` | `9211`, `9311` | 28 | `/private/tmp/media_server_manual_ui_20260525_RIbb3k/evidence/event_type_loitering_page_0.png` | live file dispatch | PASS |
| `zone-occupancy` | `9212`, `9312` | 6 | `/private/tmp/media_server_manual_ui_20260525_RIbb3k/evidence/event_type_zone_occupancy_page_0.png` | live file dispatch | PASS |

## 확인됨

- 안정화 테스트는 UI CSS 수정 후 재실행 기준으로 PASS입니다.
- 30분 soak는 retry fix 후 재실행 기준으로 PASS입니다.
- 인앱 브라우저에서 `/setup`, `/login`, Ops 주요 route, `/ops/events`, `/client/live`,
  `/client/dashboard`, `/client/request-access`를 직접 열었습니다.
- `/client/live`에서 tile play/disconnect를 직접 조작했고, viewer forbidden text scan은
  `Developer URL`, `raw JSON`, `debugCounters`, `BBox diagnostics`, `model path`,
  `source URL` 모두 0건이었습니다.
- `/ops/dashboard` 390px light overflow는 `src/ingress/product_ui_css.cpp` 수정 후
  72개 route/viewport/theme matrix에서 72 pass / 0 fail로 재검수했습니다.
- VA rule/scenario/event coverage는 12개 event coverage row 모두 EventRecord 발생과
  `/ops/events` UI row 표시를 확인했습니다.

## 제외 기록

- 없음.

## 실패

- 전체 UI 풀테스트 gate는 FAIL입니다. 이번 run은 route/auth/client live/VA event
  coverage를 직접 확인했지만, [project-feature-test-inventory.md](./project-feature-test-inventory.md)의
  UI 풀테스트 대상 219개 기능 ID를 모두 개별 클릭/타이핑/반영/로그 기준으로 완료하지
  않았습니다.
- `/password/change`, `/invite/setup`, `/client/events`, full source/view CRUD,
  full rules/profile/template CRUD, full users/invite/access request CRUD, field ONVIF,
  external WHEP/WHIP UI 흐름은 이번 문서에서 PASS로 기록하지 않습니다.
- 120분 longrun은 사용자 승인 전 실행하지 않았습니다. 현재 30분 soak와 UI 재검수에서
  120분 실행을 즉시 요구하는 누수 또는 runtime drift 신호는 확인되지 않았습니다.
- re-entry는 live video dispatch가 아니라 VA replay harness로 EventStorage에 기록했습니다.
- re-entry replay harness의 첫 `--expect` 실행은 fixture expected zone id와 seed rule id
  불일치로 실패했고, 같은 범위에서 원인을 분리한 뒤 `--expect` 없이 재실행해 EventRecord
  발생과 UI row 표시를 확인했습니다.

## 문서 재작성/신규 작성/비교 병합

- 재작성한 UI 풀테스트 관련 문서: 없음
- 새로 작성한 UI 풀테스트 문서: `docs/manual-ui-result-2026-05-25-project-test.md`
- 비교 결과: 기존 template은 유지하고, 이번 실행 evidence는 별도 결과 문서로 분리했습니다.
- 병합 결과: release evidence index에서 이번 결과 문서로 연결합니다.

푸시 수행 여부: 수행하지 않음

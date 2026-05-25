# Manual UI Result - Restart 2026-05-25

## 검수 메타데이터

- run id: ui-fulltest-restart-20260525-oehkFG
- 검수자: Codex autonomous browser/CDP + project verifier
- 날짜/시간: 2026-05-25T07:07:28.648Z
- continuation update: 2026-05-25T19:28:48Z
- 브랜치/커밋: v1.8.0, 시작 기준 4326bb7. UI 풀테스트 close-out 변경은 114968b, a39e9cb, e581ed9로 커밋 후 origin/v1.8.0에 push 완료.
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
- token end: 2608727
- token consumed: 1691895
- elapsed: 진행 중 goal continuation. 후속 30분 predev 재검증 durationSec=2399.

## 테스트 영역별 판정

| 영역 | 실행 범위 | evidence | 기록 |
| --- | --- | --- | --- |
| 안정화 테스트 | 후속 재검증에서 build/auth/ops-client/rule/VA/docs/static gate 실행 | build PASS, auth bootstrap/users/routes PASS, ops/client UI PASS, rule UI PASS, VA replay/events PASS, docs/static PASS | 최초 auth env missing, 서버 미기동/auth mismatch/storage disabled 실행조건 실패는 같은 단계에서 조건 보정 후 재검증 PASS. `verify-release-metadata --allow-unpublished`는 PASS 15/0. published release gate는 sandbox 밖 재검증에서도 GitHub latest `v1.7.0`, remote/local `v1.8.0` tag 없음으로 FAIL |
| 30분 테스트 | `verify-predev --soak-minutes 30` 실행 | `/tmp/media_server_predev-1779703217-28197_summary.json`, `/tmp/media_server_predev-1779703217-28197_report.md`, durationSec=2399, pass=119 fail=0 skip=1 | PASS. skip: external-turn-hard-gate는 `--include-external-turn` 미지정으로 제외 |
| 120분 테스트 | 실행하지 않음 | 없음 | 별도 승인 없음 |
| UI 풀테스트 | 219개 UI 대상 기능 ID 중 219 PASS, 0 FAIL. 기능별 결과표는 UI 비대상 간접 안정화 행 `RULE-099` 별도 PASS 포함 220행 중 220 PASS, 0 FAIL | retained evidence: auth/browser artifacts, current ops click E2E summary JSON, current EventRecord history coverage JSON, command result log below | 최종 PASS |

## 현재 보존 증적

아래 경로는 이 결과표의 현재 retained evidence로 다시 확인했다. 아래 command log의 오래된 `--output-dir` 경로 중 일부는 transient artifact라 현재 파일시스템에 없을 수 있으며, 최종 retained artifact 근거로 사용하지 않는다.

| 증적 | 경로 | 확인 |
| --- | --- | --- |
| Auth/in-app browser evidence | `/private/tmp/media_server_iab_auth_VuKUEe/browser` | exists |
| Auth route/session evidence | `/private/tmp/media_server_auth022_N1aAmv/browser` | exists |
| Ops click E2E 390px summary | `/private/tmp/media_server_rule_basic_templates_390/ops-click-e2e-summary.json` | exists |
| Ops click E2E 1180px summary | `/private/tmp/media_server_rule_basic_templates_1180/ops-click-e2e-summary.json` | exists |
| EventRecord UI/history 390px coverage | `/private/tmp/media_server_event_records_scope_history_390/event-history-coverage.json` | exists |
| EventRecord UI/history 1180px coverage | `/private/tmp/media_server_event_records_scope_history_1180/event-history-coverage.json` | exists |

## 스크립트 테스트 기록

- `./server.sh prepare-manual-ui-fulltest-seed --dry-run --emit-plan ... --emit-registry-dir ...`: PASS
- `./server.sh verify-manual-ui-evidence`: PASS
- `./server.sh verify-docs-links`: PASS
- `git diff --check`: PASS
- `./server.sh verify-release-metadata`: FAIL - GitHub latest release/tag is v1.7.0 and remote/local tag v1.8.0 is absent. UI product regression으로 단정하지 않음.
- `./server.sh verify-release-metadata --allow-unpublished --json-report /private/tmp/media_server_release_metadata_allow_unpublished.json --report /private/tmp/media_server_release_metadata_allow_unpublished.md`: PASS 15/0 - release prep 문서/버전 기준은 일치하며 GitHub publish/tag는 manual close-out gate로 분리.
- `./server.sh verify-va-events --cookie-file ... --dispatch-records`: FAIL - EventRecord queue drain timeout. Stored records existed; queue remained non-empty and droppedCount > 0.
- 후속 재검증 `./server.sh verify-va-events --dispatch-records`: PASS - `scripts/internal/verify_va_tracking_events.sh`가 `--dispatch-records` 기본 dispatch 간격을 1로 바꾸고 EventRecord storage disabled를 fail-fast 처리한 뒤, fresh registry/storage 격리 서버에서 `stored=2012 failed=0 dropped=0`, 33 PASS/0 FAIL. 아래 UI 기능별 FAIL 행을 PASS로 대체하지 않음.
- 후속 재검증 `./server.sh verify-ops-click-e2e --auth-ui-flow --widths 1180 --auth-users-file /private/tmp/media_server_auth_ui_flow_users.json`: PASS - session auth 서버에서 `/setup`, `/login`, `/ops/users`, `/client/request-access`, `/invite/setup`, `/password/change`, `/client/live` 흐름을 자율 Chrome/CDP로 클릭/타이핑 검증.
- 후속 재검증 `./server.sh verify-ops-click-e2e --auth-ui-flow --widths 390 --auth-users-file /private/tmp/media_server_auth_ui_flow_users.json`: PASS - 동일 auth UI 흐름을 mobile 폭에서 재검증. 첫 390px 시도는 공개 접근 요청 rate limit 소진으로 실패했고, 새 서버 프로세스로 rate counter를 초기화한 뒤 재검증 PASS.
- 회귀 재검증 `./server.sh verify-ops-click-e2e --widths 390 --auth-users-file /private/tmp/media_server_ops_click_default_users.json`: PASS - 기존 auth-off ops click E2E 기본 경로 유지.
- 회귀 재검증 `./server.sh verify-ops-click-e2e --widths 1180 --auth-users-file /private/tmp/media_server_ops_click_default_users.json`: PASS - 기존 auth-off ops click E2E desktop 폭 유지.
- 후속 안정화 `./server.sh build`: PASS.
- 후속 안정화 `./server.sh verify-auth-bootstrap`: 최초 `MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD` 미설정으로 FAIL, ephemeral auth env 지정 및 sandbox 밖 포트 바인딩으로 재검증 PASS 14/0.
- 후속 안정화 `./server.sh verify-auth-users`: 최초 auth env 미설정으로 FAIL, ephemeral auth env 지정 및 sandbox 밖 포트 바인딩으로 재검증 PASS 58/0.
- 후속 안정화 `./server.sh verify-auth-routes`: 최초 auth env 미설정으로 FAIL, ephemeral auth env 지정 및 sandbox 밖 포트 바인딩으로 재검증 PASS 127/0.
- 후속 안정화 `./server.sh verify-ops-client-ui`: 최초 서버 미기동/Chrome sandbox로 FAIL, auth-off 서버 기동 후 재검증 PASS 23/0.
- 후속 안정화 `./server.sh verify-ops-client-ui --screenshots`: PASS. visual 28/0, account header 12/0, client header 8/0, keyboard 4/0, audit mobile 4/0, ONVIF hint 4/0, ONVIF preview 2/0.
- 후속 안정화 `./server.sh verify-rule-ui`: PASS. `/ops/rules` native browser smoke, validation panel, tracker/Re-ID summary, preset quality, mobile geometry 확인.
- 후속 안정화 `./server.sh verify-ops-click-e2e --auth-users-file /private/tmp/media_server_ops_click_current_users.json`: 최초 server/verifier users file mismatch로 FAIL, 같은 users file로 서버 재기동 후 390/1180 PASS.
- 후속 안정화 `./server.sh verify-ops-rules-roundtrip`: sandbox loopback EPERM 후 sandbox 밖 재검증 PASS.
- 후속 안정화 `./server.sh verify-ops-scenario-presets`: PASS.
- 후속 안정화 `./server.sh verify-ops-rule-validation-matrix`: PASS 4/0.
- 후속 안정화 `./server.sh verify-ops-scenario-builder-ui --browser-smoke`: PASS.
- 후속 UI 보강 `MEDIA_SERVER_VERIFY_OPS_CLICK_RTSP_PORT=8565 ./server.sh verify-ops-click-e2e --http-base http://127.0.0.1:8091 --debug-port-base 10260 --widths 390 --output-dir /private/tmp/media_server_rule_matrix_390_retry2`: PASS - `/ops/rules` scenario form matrix, event template numeric validation, wrong-direction allowed direction guard, VA rule source validation/detail/geometry clear/default/save를 직접 클릭/타이핑/반영 확인.
- 후속 UI 보강 `MEDIA_SERVER_VERIFY_OPS_CLICK_RTSP_PORT=8565 ./server.sh verify-ops-click-e2e --http-base http://127.0.0.1:8091 --debug-port-base 10280 --widths 1180 --output-dir /private/tmp/media_server_rule_matrix_1180`: PASS - 동일 흐름 desktop viewport 재검증.
- 후속 안정화 `./server.sh verify-ops-rules-roundtrip --http-base http://127.0.0.1:8091`: PASS.
- 후속 안정화 `./server.sh verify-rule-ui --http-base http://127.0.0.1:8091 --debug-port 10300 --output-dir /private/tmp/media_server_rule_ui_matrix`: PASS.
- 후속 안정화 `./server.sh verify-ops-rule-validation-matrix`: PASS 4/0.
- 후속 안정화 `./server.sh verify-product-ui-no-native-dialogs`: PASS, findings=0.
- 후속 안정화 `./server.sh verify-analysis-state`: PASS 129/0.
- 후속 안정화 `./server.sh verify-va-replay`: PASS, 14 baseline cases.
- 후속 안정화 `./server.sh verify-va-events --dispatch-records`: 최초 EventRecord storage disabled로 FAIL, storage enabled 서버 재기동 후 PASS 33/0, stored=1517 failed=0 dropped=0.
- 후속 안정화 `./server.sh verify-manual-ui-evidence --result docs/manual-ui-result-2026-05-25-ui-fulltest-restart.md`: PASS 29/0. 구조/카운트 검증이며 UI 풀테스트 PASS 판정이 아님.
- 후속 안정화 `./server.sh verify-script-inventory`: PASS 11/0.
- 후속 UI 보강 `MEDIA_SERVER_VERIFY_OPS_CLICK_RTSP_PORT=8566 ./server.sh verify-ops-click-e2e --http-base http://127.0.0.1:8092 --debug-port-base 10360 --widths 390 --output-dir /private/tmp/media_server_rule_matrix_next2_390`: PASS - scenario target/restricted/re-entry zone 입력/저장/상세 readback, line direction any/forward/reverse VA rule 적용 session, event template/profile 삭제 후 참조 validation을 직접 클릭/타이핑/반영 확인.
- 후속 UI 보강 `MEDIA_SERVER_VERIFY_OPS_CLICK_RTSP_PORT=8566 ./server.sh verify-ops-click-e2e --http-base http://127.0.0.1:8092 --debug-port-base 10380 --widths 1180 --output-dir /private/tmp/media_server_rule_matrix_next2_1180`: PASS - 동일 흐름 desktop viewport 재검증.
- 후속 안정화 `./server.sh verify-ops-rules-roundtrip --http-base http://127.0.0.1:8092`: PASS.
- 후속 안정화 `./server.sh verify-rule-ui --http-base http://127.0.0.1:8092 --debug-port 10400 --output-dir /private/tmp/media_server_rule_ui_next`: PASS.
- 후속 안정화 `./server.sh verify-ops-rule-validation-matrix`: PASS 4/0.
- 후속 안정화 `./server.sh verify-product-ui-no-native-dialogs`: PASS, findings=0.
- 후속 안정화 `./server.sh verify-analysis-state`: PASS 129/0.
- 후속 안정화 `./server.sh verify-va-replay`: PASS, 14 baseline cases.
- 후속 UI 보강 `MEDIA_SERVER_VERIFY_OPS_CLICK_RTSP_PORT=8567 ./server.sh verify-ops-click-e2e --http-base http://127.0.0.1:8093 --debug-port-base 10440 --widths 390 --output-dir /private/tmp/media_server_profile_category_retry_390`: PASS - profile tracking category clear validation, all category 저장, detail/list readback 확인.
- 후속 UI 보강 `MEDIA_SERVER_VERIFY_OPS_CLICK_RTSP_PORT=8567 ./server.sh verify-ops-click-e2e --http-base http://127.0.0.1:8093 --debug-port-base 10460 --widths 1180 --output-dir /private/tmp/media_server_profile_category_1180`: PASS - 동일 흐름 desktop viewport 재검증.
- 후속 안정화 `./server.sh verify-rule-ui --http-base http://127.0.0.1:8093 --debug-port 10480 --output-dir /private/tmp/media_server_profile_category_rule_ui`: PASS.
- 후속 안정화 `./server.sh verify-ops-rule-validation-matrix`: PASS 4/0.
- 후속 안정화 `./server.sh verify-product-ui-no-native-dialogs`: PASS, findings=0.
- 후속 UI 보강 `MEDIA_SERVER_VERIFY_OPS_CLICK_RTSP_PORT=8568 ./server.sh verify-ops-click-e2e --http-base http://127.0.0.1:8094 --debug-port-base 10500 --widths 390 --output-dir /private/tmp/media_server_allowed_rule_390`: PASS - client list/detail `allowedRuleIds`, dashboard/metadata endpoint view scope, disallowed va-rule session 차단 확인.
- 후속 UI 보강 `MEDIA_SERVER_VERIFY_OPS_CLICK_RTSP_PORT=8568 ./server.sh verify-ops-click-e2e --http-base http://127.0.0.1:8094 --debug-port-base 10520 --widths 1180 --output-dir /private/tmp/media_server_allowed_rule_1180`: PASS - 동일 흐름 desktop viewport 재검증.
- 후속 UI 보강 `./server.sh verify-ops-click-e2e --auth-ui-flow --http-base http://127.0.0.1:8096 --debug-port-base 10780 --widths 390 --auth-users-file /private/tmp/media_server_rule097_auth_users.json --output-dir /private/tmp/media_server_rule097_auth_390`: PASS - viewer session에서 `/client/live` source tree가 assigned view `1`만 표시하고 `/client/api/views` allowedRuleIds가 assigned rule만 포함하며, `/client/api/views/2/*`와 disallowed va-rule session이 차단됨을 확인.
- 후속 UI 보강 `./server.sh verify-ops-click-e2e --auth-ui-flow --http-base http://127.0.0.1:8096 --debug-port-base 10800 --widths 1180 --auth-users-file /private/tmp/media_server_rule097_auth_users.json --output-dir /private/tmp/media_server_rule097_auth_1180`: PASS - 동일 viewer rule/view boundary 흐름 desktop viewport 재검증.
- 후속 UI 보강 `./server.sh verify-ops-click-e2e --auth-ui-flow --http-base http://127.0.0.1:8096 --debug-port-base 10920 --widths 390 --auth-users-file /private/tmp/media_server_rule097_auth_users.json --output-dir /private/tmp/media_server_src018_scope_390`: PASS - user scope를 view `1`에서 view `2`로 수정한 뒤 viewer `/client/live` source tree가 view `2`만 표시함을 확인.
- 후속 UI 보강 `./server.sh verify-ops-click-e2e --auth-ui-flow --http-base http://127.0.0.1:8096 --debug-port-base 10940 --widths 1180 --auth-users-file /private/tmp/media_server_rule097_auth_users.json --output-dir /private/tmp/media_server_src018_scope_1180`: PASS - 동일 scope 변경 반영 흐름 desktop viewport 재검증.
- 후속 UI 보강 `MEDIA_SERVER_VERIFY_OPS_CLICK_RTSP_PORT=8568 ./server.sh verify-ops-click-e2e --http-base http://127.0.0.1:8094 --debug-port-base 10600 --widths 390 --output-dir /private/tmp/media_server_rule038_policy_390`: PASS - VA rule RTSP/WHEP/client copy payload, client screen copy control 비노출, `runtime/status` active tap `trackingPolicy.reid=off`를 lite/ByteTrack/tracking off 조합에서 확인.
- 후속 UI 보강 `MEDIA_SERVER_VERIFY_OPS_CLICK_RTSP_PORT=8568 ./server.sh verify-ops-click-e2e --http-base http://127.0.0.1:8094 --debug-port-base 10620 --widths 1180 --output-dir /private/tmp/media_server_rule038_policy_1180`: PASS - 동일 흐름 desktop viewport 재검증.
- 후속 UI 보강 `MEDIA_SERVER_VERIFY_OPS_CLICK_RTSP_PORT=8568 ./server.sh verify-ops-click-e2e --http-base http://127.0.0.1:8094 --debug-port-base 10640 --widths 390 --output-dir /private/tmp/media_server_rule_preview_390`: PASS - VA rule create form에서 preview 재생 버튼 클릭, video readyState/width/height 확인, 정지 후 session cleanup 확인.
- 후속 UI 보강 `MEDIA_SERVER_VERIFY_OPS_CLICK_RTSP_PORT=8568 ./server.sh verify-ops-click-e2e --http-base http://127.0.0.1:8094 --debug-port-base 10660 --widths 1180 --output-dir /private/tmp/media_server_rule_preview_1180`: PASS - 동일 preview 재생/정지 흐름 desktop viewport 재검증.
- 후속 UI 보강 `MEDIA_SERVER_VERIFY_OPS_CLICK_RTSP_PORT=8568 ./server.sh verify-ops-click-e2e --http-base http://127.0.0.1:8094 --debug-port-base 10680 --widths 390 --output-dir /private/tmp/media_server_runtime_dashboard_390`: PASS - dashboard log-tail filter/redaction, active VA rule session 중 dashboard Runtime Ops/VA Quality badge/list, `/ops/home` active session summary 반영 확인.
- 후속 UI 보강 `MEDIA_SERVER_VERIFY_OPS_CLICK_RTSP_PORT=8568 ./server.sh verify-ops-click-e2e --http-base http://127.0.0.1:8094 --debug-port-base 10700 --widths 1180 --output-dir /private/tmp/media_server_runtime_dashboard_1180`: PASS - 동일 runtime/log/VA dashboard 흐름 desktop viewport 재검증.
- 후속 UI 보강 `MEDIA_SERVER_VERIFY_OPS_CLICK_RTSP_PORT=8569 ./server.sh verify-ops-click-e2e --http-base http://127.0.0.1:8095 --debug-port-base 10740 --widths 390 --output-dir /private/tmp/media_server_alert_delivery_filter_390`: PASS - `/ops/events` Alert Delivery integration 저장, 검색/kind/status filter, empty filter, row fixture action, endpoint redaction 확인.
- 후속 UI 보강 `MEDIA_SERVER_VERIFY_OPS_CLICK_RTSP_PORT=8569 ./server.sh verify-ops-click-e2e --http-base http://127.0.0.1:8095 --debug-port-base 10760 --widths 1180 --output-dir /private/tmp/media_server_alert_delivery_filter_1180`: PASS - 동일 Alert Delivery list/filter 흐름 desktop viewport 재검증.
- 후속 UI 보강 `./server.sh verify-ops-event-records-scope --http-base http://127.0.0.1:8097 --debug-port 10880 --visual-width 390 --output-dir /private/tmp/media_server_event_records_scope_action_390`: PASS - storage-enabled 격리 서버에서 synthetic EventRecord row, snapshot/clip/signed bundle label, signed bundle button의 bundle-token 요청, evidence filter, archive toggle, prev/next, overflow 확인.
- 후속 UI 보강 `./server.sh verify-ops-event-records-scope --http-base http://127.0.0.1:8097 --debug-port 10900 --visual-width 1180 --output-dir /private/tmp/media_server_event_records_scope_action_1180`: PASS - 동일 EventRecord UI/evidence action 흐름 desktop viewport 재검증.
- 후속 UI 보강 `MEDIA_SERVER_VERIFY_OPS_CLICK_RTSP_PORT=8572 ./server.sh verify-ops-click-e2e --http-base http://127.0.0.1:8098 --debug-port-base 11020 --widths 390 --output-dir /private/tmp/media_server_src004_click_390`: PASS - `/ops/sources` WHEP URL 저장, `/client/live` source tree 반영, `/client/api/views/<whep>/webrtc/session` 생성/삭제, WHEP source `audio/video sample ready` 로그를 확인.
- 후속 UI 보강 `MEDIA_SERVER_VERIFY_OPS_CLICK_RTSP_PORT=8572 ./server.sh verify-ops-click-e2e --http-base http://127.0.0.1:8098 --debug-port-base 11060 --widths 1180 --output-dir /private/tmp/media_server_src004_click_1180`: PASS - 동일 WHEP wrapper lifecycle 흐름 desktop viewport 재검증.
- 후속 UI 보강 `MEDIA_SERVER_VERIFY_OPS_CLICK_RTSP_PORT=8572 ./server.sh verify-ops-click-e2e --http-base http://127.0.0.1:8098 --debug-port-base 11100 --widths 390 --output-dir /private/tmp/media_server_rule_basic_templates_390`: PASS - presence/enter/exit 기본 event template 생성, 저장, table/detail readback을 직접 클릭/타이핑 확인.
- 후속 UI 보강 `MEDIA_SERVER_VERIFY_OPS_CLICK_RTSP_PORT=8572 ./server.sh verify-ops-click-e2e --http-base http://127.0.0.1:8098 --debug-port-base 11140 --widths 1180 --output-dir /private/tmp/media_server_rule_basic_templates_1180`: PASS - 동일 기본 event template 생성/readback 흐름 desktop viewport 재검증.
- 후속 UI/EventRecord 보강 `./server.sh verify-ops-event-records-scope --http-base http://127.0.0.1:8102 --debug-port 11200 --visual-width 390 --output-dir /private/tmp/media_server_event_records_scope_history_390 --event-history-dir /private/tmp/media_server_ui_events_recheck_9mDk8S`: PASS - `/ops/events` control/evidence bundle action과 seed registry 12개 event/scenario rule별 EventRecord history coverage 대조.
- 후속 UI/EventRecord 보강 `./server.sh verify-ops-event-records-scope --http-base http://127.0.0.1:8102 --debug-port 11240 --visual-width 1180 --output-dir /private/tmp/media_server_event_records_scope_history_1180 --event-history-dir /private/tmp/media_server_ui_events_recheck_9mDk8S`: PASS - 동일 event history coverage desktop viewport 재검증.
- 후속 안정화 `./server.sh verify-ops-rule-relationships --http-base http://127.0.0.1:8094`: PASS - 기존 `va-rule` session 생성 후 PublishedView `allowedRuleIds` 제거, 기존 session ICE/DELETE 200 유지, 같은 rule 신규 session 거부 확인.
- 후속 안정화 `./server.sh verify-product-ui-no-native-dialogs`: PASS.
- 후속 UI 보강 `MEDIA_SERVER_VERIFY_OPS_CLICK_RTSP_PORT=8563 ./server.sh verify-ops-click-e2e --http-base http://127.0.0.1:8089 --debug-port-base 10050 --output-dir /private/tmp/media_server_src_evt_verify4/browser`: PASS - 390/1180에서 `dashboard:runtime-health-log`, `sources:onvif-no-device-boundary`, `sources:kind-matrix-health-wrapper`, `events:delivery-review-audit` 직접 클릭/입력/반영 확인.
- goal continuation recheck `./server.sh verify-product-ui-no-native-dialogs`: PASS - product UI native browser dialog guard findings=0.
- goal continuation short smoke `./server.sh verify-va-events --dispatch-records --duration 5`: FAIL - 5초 duration으로 enter/exit/line-crossing 구간에 도달하지 못해 이벤트 부족. 제품 회귀로 단정하지 않고 기본 duration 재검증 수행.
- goal continuation 재검증 `./server.sh verify-va-events --dispatch-records`: PASS - 같은 서버/registry에서 기본 180 poll 재실행, 33 PASS/0 FAIL, EventRecord queue drained `stored=42047 failed=0 dropped=0`.
- 후속 안정화 `./server.sh verify-docs-links`: PASS, failures=0.
- 후속 안정화 `node --check scripts/internal/verify_ops_ui_click_e2e.mjs`, `verify_manual_ui_evidence.mjs`, `verify_script_inventory.mjs`, `verify_product_ui_no_native_dialogs.mjs`: PASS.
- 후속 안정화 `git diff --check`: PASS.
- 후속 30분 `MEDIA_SERVER_SKIP_LOCAL_ENV=1 ... ./server.sh verify-predev --soak-minutes 30`: PASS, pass=119 fail=0 skip=1, durationSec=2399, summary `/tmp/media_server_predev-1779703217-28197_summary.json`, report `/tmp/media_server_predev-1779703217-28197_report.md`, html `/tmp/media_server_predev-1779703217-28197_report.html`.
- 후속 UI route boundary CDP 렌더링: PASS - `/not-a-product-route-404-check`, `/lab`, `/lab/rules`, `/lab/import`, `/webrtc/test`가 모두 `not found`만 렌더링하고 `.product-shell` 및 제품 route marker가 없음. artifact dir: `/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_route_boundary_1779706070685`.

## UI 풀테스트 기록

- 브라우저: Codex in-app browser, user manual click 없음
- 직접 조작 범위: setup/login/logout, password change, invite setup, public access request submit/approve/reject, user create/edit/scope/reset/disable/restore/last-admin guard, role guard, viewer assigned-only source tree/rule boundary, viewer scope 변경 후 source tree 반영, primary nav, dashboard filters/runtime/health/log-tail, source create validation/retry, source CRUD/edit/disable/delete/client block, RTSP/HTTP/WHEP/WHIP source registry create, WHEP wrapper session 생성/삭제, ONVIF no-device boundary, source health dashboard 반영, rules filter/scenario builder, profile tracking category 저장/readback, event template target/restricted zone 저장, line direction VA rule 적용, template/profile 삭제 참조 validation, client live controls, responsive/theme, ops events refresh/EventRecord row/evidence filter/archive/pagination/signed bundle action/alert delivery search/kind/status filter/audit controls
- 반응형/테마 범위: 56 route/theme/viewport screenshots, fail 0 for horizontal overflow/client leak scan
- 시각 품질 확인: screenshot artifact와 390px/1180px overflow checks 기준으로 기능별 PASS 행의 화면/control overlap 기준 충족
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

| 개별 항목 | 기대 상태 | 실제 상태 | 판정 |
| --- | --- | --- | --- |
| account: admin | admin 로그인/ops 접근 가능 | auth UI browser/in-app artifacts와 기능별 AUTH 행에서 확인 | PASS |
| account: operator | operator 로그인/허용 ops 접근 가능 | user role lifecycle 및 ops role guard 기능별 행에서 확인 | PASS |
| account: viewer | viewer 로그인/client 접근 가능, ops 비노출 | viewer client scope/role guard 기능별 행에서 확인 | PASS |
| account: integrator | integrator scope/API 정책 확인 | in-app browser 로그인 후 `/client/live`, `/ops/home` Access Denied 확인. `/client/api/views/9001/events`, `/metadata` 200, `/ops/api/source-health` 403 확인 | PASS |
| profile: tracker `bytetrack` + Re-ID `assist` | 저장/반영 확인 | `/ops/rules` tracking matrix와 client va-rule session 검증 PASS | PASS |
| profile: tracker `bytetrack` + Re-ID `off` | 저장/반영 확인 | `/ops/rules` tracking matrix와 client va-rule session 검증 PASS | PASS |
| profile: tracker `kalman-lite` + Re-ID `assist` | 저장/반영 확인 | `/ops/rules` tracking matrix와 client va-rule session 검증 PASS | PASS |
| profile: tracker `kalman-lite` + Re-ID `off` | 저장/반영 확인 | `/ops/rules` tracking matrix와 client va-rule session 검증 PASS | PASS |
| profile: tracker `lite` + Re-ID `assist` | 저장/반영 확인 | `/ops/rules` tracking matrix와 client va-rule session 검증 PASS | PASS |
| profile: tracker `lite` + Re-ID `off` | 저장/반영 확인 | `/ops/rules` tracking matrix와 client va-rule session 검증 PASS | PASS |
| profile: tracker `none` + Re-ID `off` | 저장/반영 확인 | `/ops/rules` tracking matrix와 client va-rule session 검증 PASS | PASS |
| invalid policy: tracker `none` + Re-ID `assist` | 저장 거부 또는 `reid=off` 정규화 | tracker `none` 선택 시 Re-ID `off` 강제와 payload 정규화 확인 | PASS |
| event template: presence | 최종 enabled template 존재 | `/private/tmp/media_server_rule_basic_templates_390/ops-click-e2e-summary.json`, `/private/tmp/media_server_rule_basic_templates_1180/ops-click-e2e-summary.json` | PASS |
| event template: enter | 최종 enabled template 존재 | `/private/tmp/media_server_rule_basic_templates_390/ops-click-e2e-summary.json`, `/private/tmp/media_server_rule_basic_templates_1180/ops-click-e2e-summary.json` | PASS |
| event template: exit | 최종 enabled template 존재 | `/private/tmp/media_server_rule_basic_templates_390/ops-click-e2e-summary.json`, `/private/tmp/media_server_rule_basic_templates_1180/ops-click-e2e-summary.json` | PASS |
| event template: line-crossing any | 최종 enabled template 존재 | `/private/tmp/media_server_rule_basic_templates_390/ops-click-e2e-summary.json`, `/private/tmp/media_server_rule_basic_templates_1180/ops-click-e2e-summary.json` | PASS |
| event template: line-crossing forward | 최종 enabled template 존재 | `/private/tmp/media_server_rule_basic_templates_390/ops-click-e2e-summary.json`, `/private/tmp/media_server_rule_basic_templates_1180/ops-click-e2e-summary.json` | PASS |
| event template: line-crossing reverse | 최종 enabled template 존재 | `/private/tmp/media_server_rule_basic_templates_390/ops-click-e2e-summary.json`, `/private/tmp/media_server_rule_basic_templates_1180/ops-click-e2e-summary.json` | PASS |
| event template: intrusion-dwell | 최종 enabled template 존재 | `/private/tmp/media_server_rule_basic_templates_390/ops-click-e2e-summary.json`, `/private/tmp/media_server_rule_basic_templates_1180/ops-click-e2e-summary.json` | PASS |
| event template: re-entry | 최종 enabled template 존재 | `/private/tmp/media_server_rule_basic_templates_390/ops-click-e2e-summary.json`, `/private/tmp/media_server_rule_basic_templates_1180/ops-click-e2e-summary.json` | PASS |
| event template: wrong-direction | 최종 enabled template 존재 | `/private/tmp/media_server_rule_basic_templates_390/ops-click-e2e-summary.json`, `/private/tmp/media_server_rule_basic_templates_1180/ops-click-e2e-summary.json` | PASS |
| event template: intrusion-after-line-crossing | 최종 enabled template 존재 | `/private/tmp/media_server_rule_basic_templates_390/ops-click-e2e-summary.json`, `/private/tmp/media_server_rule_basic_templates_1180/ops-click-e2e-summary.json` | PASS |
| event template: loitering | 최종 enabled template 존재 | `/private/tmp/media_server_rule_basic_templates_390/ops-click-e2e-summary.json`, `/private/tmp/media_server_rule_basic_templates_1180/ops-click-e2e-summary.json` | PASS |
| event template: zone-occupancy | 최종 enabled template 존재 | `/private/tmp/media_server_rule_basic_templates_390/ops-click-e2e-summary.json`, `/private/tmp/media_server_rule_basic_templates_1180/ops-click-e2e-summary.json` | PASS |
| scenario preset: default | 선택/적용 확인 | scenario builder preset matrix artifact와 기능별 RULE preset 행에서 확인 | PASS |
| scenario preset: road | 선택/적용 확인 | scenario builder preset matrix artifact와 기능별 RULE preset 행에서 확인 | PASS |
| scenario preset: retail | 선택/적용 확인 | scenario builder preset matrix artifact와 기능별 RULE preset 행에서 확인 | PASS |
| scenario preset: park | 선택/적용 확인 | scenario builder preset matrix artifact와 기능별 RULE preset 행에서 확인 | PASS |
| scenario preset: indoor | 선택/적용 확인 | scenario builder preset matrix artifact와 기능별 RULE preset 행에서 확인 | PASS |
| scenario preset: lobby | 선택/적용 확인 | scenario builder preset matrix artifact와 기능별 RULE preset 행에서 확인 | PASS |
| scenario preset: platform | 선택/적용 확인 | scenario builder preset matrix artifact와 기능별 RULE preset 행에서 확인 | PASS |
| scenario preset: entrance | 선택/적용 확인 | scenario builder preset matrix artifact와 기능별 RULE preset 행에서 확인 | PASS |
| scenario preset: doorway | 선택/적용 확인 | scenario builder preset matrix artifact와 기능별 RULE preset 행에서 확인 | PASS |
| scenario preset: parking | 선택/적용 확인 | scenario builder preset matrix artifact와 기능별 RULE preset 행에서 확인 | PASS |
| scenario preset: elevator | 선택/적용 확인 | scenario builder preset matrix artifact와 기능별 RULE preset 행에서 확인 | PASS |
| scenario preset: custom | 선택/적용 확인 | scenario builder preset matrix artifact와 기능별 RULE preset 행에서 확인 | PASS |
| vaRule: presence | 최종 enabled vaRule 존재 | `/private/tmp/media_server_event_records_scope_history_390/event-history-coverage.json`, `/private/tmp/media_server_event_records_scope_history_1180/event-history-coverage.json` | PASS |
| vaRule: enter | 최종 enabled vaRule 존재 | `/private/tmp/media_server_event_records_scope_history_390/event-history-coverage.json`, `/private/tmp/media_server_event_records_scope_history_1180/event-history-coverage.json` | PASS |
| vaRule: exit | 최종 enabled vaRule 존재 | `/private/tmp/media_server_event_records_scope_history_390/event-history-coverage.json`, `/private/tmp/media_server_event_records_scope_history_1180/event-history-coverage.json` | PASS |
| vaRule: line-crossing any | 최종 enabled vaRule 존재 | `/private/tmp/media_server_event_records_scope_history_390/event-history-coverage.json`, `/private/tmp/media_server_event_records_scope_history_1180/event-history-coverage.json` | PASS |
| vaRule: line-crossing forward | 최종 enabled vaRule 존재 | `/private/tmp/media_server_event_records_scope_history_390/event-history-coverage.json`, `/private/tmp/media_server_event_records_scope_history_1180/event-history-coverage.json` | PASS |
| vaRule: line-crossing reverse | 최종 enabled vaRule 존재 | `/private/tmp/media_server_event_records_scope_history_390/event-history-coverage.json`, `/private/tmp/media_server_event_records_scope_history_1180/event-history-coverage.json` | PASS |
| vaRule: intrusion-dwell | 최종 enabled vaRule 존재 | `/private/tmp/media_server_event_records_scope_history_390/event-history-coverage.json`, `/private/tmp/media_server_event_records_scope_history_1180/event-history-coverage.json` | PASS |
| vaRule: re-entry | 최종 enabled vaRule 존재 | `/private/tmp/media_server_event_records_scope_history_390/event-history-coverage.json`, `/private/tmp/media_server_event_records_scope_history_1180/event-history-coverage.json` | PASS |
| vaRule: wrong-direction | 최종 enabled vaRule 존재 | `/private/tmp/media_server_event_records_scope_history_390/event-history-coverage.json`, `/private/tmp/media_server_event_records_scope_history_1180/event-history-coverage.json` | PASS |
| vaRule: intrusion-after-line-crossing | 최종 enabled vaRule 존재 | `/private/tmp/media_server_event_records_scope_history_390/event-history-coverage.json`, `/private/tmp/media_server_event_records_scope_history_1180/event-history-coverage.json` | PASS |
| vaRule: loitering | 최종 enabled vaRule 존재 | `/private/tmp/media_server_event_records_scope_history_390/event-history-coverage.json`, `/private/tmp/media_server_event_records_scope_history_1180/event-history-coverage.json` | PASS |
| vaRule: zone-occupancy | 최종 enabled vaRule 존재 | `/private/tmp/media_server_event_records_scope_history_390/event-history-coverage.json`, `/private/tmp/media_server_event_records_scope_history_1180/event-history-coverage.json` | PASS |

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
| `enter` | yes | 9 | PASS | `/ops/events` UI pagination observed `enter` rows at offset 525 |
| `exit` | yes | 6 | PASS | `/ops/events` UI pagination observed `exit` rows at offset 1400 |
| `line-crossing:any` | yes | 40 | PASS | `/ops/events` UI observed `line-crossing`; `verify-va-events --dispatch-records` filtered EventRecord rule counts covered any line rules |
| `line-crossing:forward` | yes | 40 | PASS | `verify-va-events --dispatch-records` filtered EventRecord rule counts covered forward line rules |
| `line-crossing:reverse` | yes | 40 | PASS | `verify-va-events --dispatch-records` filtered EventRecord rule counts covered reverse line rules |
| `intrusion-dwell` | yes | 8 | PASS | `/ops/events` UI pagination observed `intrusion-dwell` rows |
| `re-entry` | yes | 1 | PASS | `/ops/events` UI pagination observed `re-entry` rows at offset 2850 |
| `wrong-direction` | yes | 6 | PASS | `/ops/events` UI pagination observed `wrong-direction` rows at offset 450 |
| `intrusion-after-line-crossing` | yes | 6 | PASS | `/ops/events` UI pagination observed `intrusion-after-line-crossing` rows at offset 450 |
| `loitering` | yes | 8 | PASS | `/ops/events` UI pagination observed `loitering` rows |
| `zone-occupancy` | yes | 2 | PASS | `/ops/events` UI pagination observed `zone-occupancy` rows |

- missing event types: none in `/ops/events` pagination artifact. Final rule/scenario별 대조 gate는 `EVT-007` 행으로 별도 유지
- sample/video 한계: verifier queue drain timeout, droppedCount 743, queueSize > 0
- 최종 판정: PASS

### VA EventRecord 후속 재검증

- 수정 파일: `scripts/internal/verify_va_tracking_events.sh`
- 변경 요약: `--dispatch-records` 기본 dispatch 간격을 1로 변경해 rare `exit`/direction event 누락을 막고, EventRecord storage disabled 상태는 긴 poll 전에 즉시 실패하도록 조정.
- 후속 명령: `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=http://127.0.0.1:8081 ./server.sh verify-va-events --dispatch-records`
- 후속 서버 조건: auth off 격리 서버, fresh `MEDIA_SERVER_SOURCE_REGISTRY`, fresh `MEDIA_SERVER_PUBLISHED_VIEWS`, fresh `MEDIA_SERVER_ANALYSIS_REGISTRY`, fresh EventRecord storage, 기본 queue 2048, snapshot/clip hook off
- fail-fast 확인: EventRecord storage disabled 서버에서 `--dispatch-records`가 health 직후 storage disabled로 실패하고 poll을 시작하지 않음
- 후속 결과: PASS, dispatch requests 180, stored 2012, failed 0, dropped 0
- 후속 artifact: `/tmp/media_server_vaevt-1779699325-92204_event_records.json`, `/tmp/media_server_vaevt-1779699325-92204_events.ndjson`, `/tmp/media_server_vaevt-1779699325-92204_overlay.jpg`
- 한계 해소: 이 후속 검증 단독으로는 UI 전수 row를 대체하지 않았지만, 이후 `/ops/events` pagination과 `event-history-coverage.json` 390px/1180px 대조로 EVT-007 최종 gate를 보강했다.

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
- 한계 해소: auth-off 격리 서버 재검수 범위 밖의 auth/role guard와 Rule/scenario별 상세 row/action은 후속 auth UI, rule basic template, event-history coverage 증거로 보강했다.

### `/ops/users` lifecycle 후속 자동 클릭 재검증

- 수정 파일: `scripts/internal/verify_ops_ui_click_e2e.mjs`
- 변경 요약: 사용자 lifecycle fixture와 invite fixture를 verifier가 자체 생성/복원하고, 제품 UI에서 사용자 수정, 비밀번호 초기화, 비활성화 2회 확인, 복구, 초대 발급, invite list token redaction을 직접 조작합니다.
- 서버 조건: auth off 격리 서버, fresh `MEDIA_SERVER_AUTH_USERS_FILE`, fresh source/view/analysis registry
- 후속 명령: `MEDIA_SERVER_AUTH_USERS_FILE=/private/tmp/media_server_ops_click_lifecycle_whQDYQ/users.json ./server.sh verify-ops-click-e2e`
- 후속 결과: PASS, 390px/1180px 각각 `users:lifecycle-edit-reset-disable-restore`, `users:invite-create` click step 통과
- 최초 실패: users file 없음 404, timestamp 기반 fixture password policy 실패. 이후 verifier가 빈 users store를 준비하고 고정 강한 fixture password를 사용하도록 수정해 재검증 PASS.
- 한계 해소: 이 후속 검증은 `/ops/users` lifecycle 클릭 harness 보강이며, invite setup/password change/last admin guard는 기능별 AUTH 행의 후속 증거와 함께 최종 PASS로 집계했다.

### Auth UI session 흐름 후속 자동 클릭 재검증

- 수정 파일: `scripts/internal/verify_ops_ui_click_e2e.mjs`
- 변경 요약: `--auth-ui-flow` 옵션을 추가해 session auth 서버에서 `/setup`, `/login`, `/ops/users`, `/client/request-access`, `/invite/setup`, `/password/change`, `/client/live`를 자율 Chrome/CDP로 직접 조작합니다.
- 서버 조건: `MEDIA_SERVER_AUTH_MODE=session`, fresh `MEDIA_SERVER_AUTH_USERS_FILE`, 사용자 제공 `MEDIA_SERVER_VERIFY_AUTH_*` 비밀번호 환경변수.
- 후속 명령: `./server.sh verify-ops-click-e2e --auth-ui-flow --widths 1180 --auth-users-file /private/tmp/media_server_auth_ui_flow_users.json`
- 후속 결과: PASS, `auth:setup-bootstrap`, `auth:admin-login-client-preview`, `auth:logout-route-guard`, `auth:user-lifecycle-session`, `auth:access-request-approve-invite-setup`, `auth:access-request-reject`, `auth:last-admin-guard`.
- CLIENT-005 후속 명령: fresh auth 서버 `http://127.0.0.1:8087`에서 `./server.sh verify-ops-click-e2e --auth-ui-flow --auth-users-file /private/tmp/media_server_client005_verify3/users.json`
- CLIENT-005 후속 결과: PASS, 390px/1180px 모두 `client:live-session-cleanup` 통과. viewer `/client/live` source click으로 session 생성, `연결 해제` DELETE와 UI 오프라인/연결 끊김 반영, 재연결 session 생성, live session 유지 상태의 logout 후 admin `/lab/runtime/status` idle 확인.
- 후속 명령: `./server.sh verify-ops-click-e2e --auth-ui-flow --widths 390 --auth-users-file /private/tmp/media_server_auth_ui_flow_users.json`
- 후속 결과: PASS, 동일 click step 통과.
- 최초 실패: Chrome CDP 포트 sandbox 실패, setup 비밀번호 정책 거부, 공개 접근 요청 rate limit 소진, 마지막 admin 2회 확인 흐름 미반영. 이후 sandbox 밖 실행, 정책에 맞는 환경변수 사용, 새 서버 프로세스 rate counter 초기화, admin 2회 확인 반영으로 재검증 PASS.
- 한계 해소: 이 후속 검증은 auth UI/session과 CLIENT-005 live cleanup 흐름 보강이며, 기능별 표의 나머지 UI 증거와 합산해 최종 PASS로 집계했다.

### Source CRUD 후속 자동 클릭 재검증

- 수정 파일: `scripts/internal/verify_ops_ui_click_e2e.mjs`
- 변경 요약: 기본 Ops/Client click E2E에 `/ops/sources` file channel 생성, row/API 반영, `/client/live` source tree 반영, displayName/zone 수정, 비활성화 후 client view/session block, 재활성화, 삭제 후 client view/session block 확인을 추가했습니다.
- 서버 조건: auth off 격리 서버, fresh source/view/analysis registry.
- 후속 명령: `./server.sh verify-ops-click-e2e --http-base http://127.0.0.1:8089 --debug-port-base 10010 --output-dir /private/tmp/media_server_src_crud_verify2/browser`
- 후속 결과: PASS, 390px/1180px 모두 `sources:crud-view-lifecycle` 통과.
- 한계/비범위: 이 검증은 source/view CRUD와 client block을 닫습니다. RTSP/HTTP/WHEP/WHIP source type별 UI wrapper, viewer scope, rule/scope 변경은 후속 보강에서 PASS로 닫았습니다. 외부 네트워크 장시간 지속성과 field endpoint 성공 보장은 이 UI 풀테스트 판정표 밖의 longrun/field smoke 조건입니다.

## 기능별 직접 조작 기록

- UI 대상 기능 ID는 219개이며, 아래 표에는 RULE coverage 누락 방지를 위해 UI 비대상/간접 안정화 행 `RULE-099` 1개도 별도 포함합니다. 현재 표 기준 총 220개 행 중 220 PASS, 0 FAIL입니다.

| 기능 ID | 영역 | 클릭/타이핑으로 확인한 항목 | 기대 결과 | 실제 결과 | 판정 | 비고 |
| --- | --- | --- | --- | --- | --- | --- |
| UI-001 | UI | auth UI session flow에서 `/` -> `/setup`, setup 완료 후 `/login`, logout 후 `/ops/home` -> `/login` redirect 직접 확인 | auth/setup 상태별 redirect가 실제 route와 브라우저 화면에서 일치 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e --auth-ui-flow` 390px/1180px PASS |
| UI-002 | UI | setup form, weak password rejection, strong admin setup, /login redirect screenshots: setup-initial.png, setup-weak-rejected.png, setup-strong-submitted.png | setup form 표시, weak/strong password flow 직접 확인 | 기대 evidence 확인 | PASS | setup form, weak password rejection, strong admin setup, /login redirect screenshots: setup-initial.png, setup-weak-rejected.png, setup-strong-submitted.png |
| UI-003 | UI | admin/operator/viewer login by browser typing; role landing screenshots: login-admin-success.png, login-operator-ops-home.png, login-viewer-client-live.png | credential 입력 후 role landing 확인 | 기대 evidence 확인 | PASS | admin/operator/viewer login by browser typing; role landing screenshots: login-admin-success.png, login-operator-ops-home.png, login-viewer-client-live.png |
| UI-004 | UI | fresh auth fixture에서 `/password/change`로 기준 비밀번호를 임시 비밀번호로 변경, 임시 비밀번호 로그인, 기준 비밀번호 즉시 재사용 거부, history 회전 후 기준 비밀번호 복원과 최종 `/client/live` 로그인 확인 | 사용자 지정 테스트 pw -> 임시 pw 변경 성공, 임시 pw 로그인, 즉시 원래 pw 재사용 거부, history count 기준 복원 후 최종 로그인 확인 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_auth022_N1aAmv/browser/ui004-password-history-summary.json`, `ui004-change-baseline-to-temp1.json`, `ui004-temp1-login.json`, `ui004-immediate-baseline-reuse-rejected.json`, `ui004-restore-baseline-attempt4.json`, `ui004-final-baseline-login.json` |
| UI-005 | UI | logout button clicked for viewer/operator/admin session switching; screenshots: logout-viewer.png | logout action 후 세션 종료와 보호 route 재접근 차단 확인 | 기대 evidence 확인 | PASS | logout button clicked for viewer/operator/admin session switching; screenshots: logout-viewer.png |
| UI-007 | UI | access request 승인 invite token으로 `/invite/setup` 비밀번호 설정 후 `/login` redirect와 viewer `/client/live` 로그인 확인 | invite setup 전후 login/client 접근 경계 확인 | 기대 evidence 확인 | PASS | `auth:access-request-approve-invite-setup` 390px/1180px PASS |
| UI-008 | UI | `/client/request-access` form 입력/제출, pending 안내 copy, 승인 전 user 미생성 확인 | request submit, pending copy, 승인 전 접근 차단 확인 | 기대 evidence 확인 | PASS | `auth:access-request-approve-invite-setup`, `auth:access-request-reject` 390px/1180px PASS |
| UI-009 | UI | primary nav opened /ops/home; responsive light/dark screenshots passed overflow check | home summary/nav/status가 표시되고 overflow 없음 | 기대 evidence 확인 | PASS | primary nav opened /ops/home; responsive light/dark screenshots passed overflow check |
| UI-010 | UI | primary nav opened /ops/dashboard; incident search/source filter and VA quality search operated; dashboard-filter-evidence.json | filter/search/copy/refresh와 주요 panel 표시 확인 | 기대 evidence 확인 | PASS | primary nav opened /ops/dashboard; incident search/source filter and VA quality search operated; dashboard-filter-evidence.json |
| UI-011 | UI | `/ops/sources`에서 file channel 생성, row/API/client live 반영, displayName/zone 수정, 비활성화 후 client view/session block, 재활성화, 삭제 후 client view/session block을 390px/1180px에서 직접 클릭 검증 | source/view CRUD와 validation을 직접 조작 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` `sources:crud-view-lifecycle`, `/private/tmp/media_server_src_crud_verify2/browser` |
| UI-012 | UI | `/ops/rules`에서 event template/profile/VA rule 생성/수정/삭제/validation을 클릭하고, VA rule create form preview 재생 버튼으로 video readyState/width/height 확인 후 정지 cleanup까지 390px/1180px에서 확인 | rule/template/profile CRUD, validation, preview 확인 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_rule_preview_390`, `/private/tmp/media_server_rule_preview_1180` |
| UI-013 | UI | user create/edit/scope/reset/disable/restore, invite create, public request approve/reject, last-admin guard를 제품 UI에서 자동 클릭 검증 | user/invite/access request/role/scope flow 확인 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` 기본 경로와 `--auth-ui-flow` 390px/1180px PASS |
| UI-014 | UI | storage-enabled 격리 서버에서 `/ops/events` synthetic EventRecord row, snapshot/clip/signed bundle label, signed bundle button의 bundle-token 요청, evidence filter, archive toggle, prev/next pagination, overflow를 390px/1180px에서 확인 | event filter/pagination/evidence action 확인 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_event_records_scope_action_390`, `/private/tmp/media_server_event_records_scope_action_1180` |
| UI-015 | UI | in-app browser에서 `/client/live` 타일 1~4 재생, 4개 video readyState=4/1280x720, overlay mode button 조작, 연결 해제 후 runtime cleanup 확인 | video viewport/control/status/overlay와 session 지속성 확인 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_ui_goal_rZkl1F/browser/client-live-after-4play-plus60s.json`, `client-live-runtime-after-4play-plus60s.json`, `client-live-runtime-after-disconnect-plus15s.json` |
| UI-016 | UI | auth-on viewer `/client/dashboard`에서 assigned channel 1개만 표시됨을 확인하고 filter=`전체`, sort=`이벤트 많은 순`으로 변경, `상태 복사`/`이벤트 복사` 클릭. 자동 clipboard가 차단된 in-app browser에서 비오류 `수동 복사용 텍스트` fallback과 상태/이벤트 copy text를 각각 확인 | viewer scope 내 dashboard/filter/sort/copy 확인 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_auth022_N1aAmv/browser/ui016-dashboard-copy-manual-fallback-after-status.json`, `ui016-dashboard-copy-manual-fallback-after-event.json` |
| UI-017 | UI | auth-on viewer로 `/client/events` 진입, assigned 9001만 표시, 9002/9003/9004/Ops/Lab/raw/debug 노출 없음 확인 | viewer scope 내 events 표시와 비노출 경계 확인 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_iab_auth_VuKUEe/browser/viewer-client-events.json` |
| UI-018 | UI | CDP browser로 `/not-a-product-route-404-check`, `/lab`, `/lab/rules`, `/lab/import`, `/webrtc/test` 직접 렌더링 확인 | 이전 제품 UI route와 임의 route가 제품 UI로 열리지 않음 | 모두 `not found`, product shell/route marker 없음 | PASS | `/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_route_boundary_1779706070685/*.png` |
| UI-019 | UI | 56 responsive/theme route checks included light/dark; responsive-evidence.json fail=0 | 주요 화면에서 contrast/token/상태 색상 일관성 확인 | 기대 evidence 확인 | PASS | 56 responsive/theme route checks included light/dark; responsive-evidence.json fail=0 |
| UI-020 | UI | 1180px screenshots for ops/client routes passed horizontal overflow check | 1180px 이상에서 nav/table/form/video 겹침 없음 | 기대 evidence 확인 | PASS | 1180px screenshots for ops/client routes passed horizontal overflow check |
| UI-021 | UI | 320px/390px screenshots for ops/client routes passed horizontal overflow check | 320px/390px에서 text/control/video overflow 없음 | 기대 evidence 확인 | PASS | 320px/390px screenshots for ops/client routes passed horizontal overflow check |
| AUTH-004 | AUTH | session cookie admin/viewer login, `/auth/whoami`, logout 후 `/ops/home` 보호 route `/login` redirect 확인 | login cookie 기반 보호 route 접근/차단 확인 | 기대 evidence 확인 | PASS | `auth:admin-login-client-preview`, `auth:logout-route-guard` 390px/1180px PASS |
| AUTH-005 | AUTH | missing users file led to /setup; strong setup redirected to /login | `/setup` redirect와 bootstrap 후 `/login` redirect 확인 | 기대 evidence 확인 | PASS | missing users file led to /setup; strong setup redirected to /login |
| AUTH-006 | AUTH | setup/login used readonly default admin username and admin user visible in /ops/users | setup/login/user 화면에서 기본 admin 정책 일치 | 기대 evidence 확인 | PASS | setup/login used readonly default admin username and admin user visible in /ops/users |
| AUTH-007 | AUTH | admin username과 빈 password로 `/login` 제출 후 `/login`에 머물고 ops/client shell 미진입 확인. passwordHash 없는 admin setup 유도는 AUTH-005 evidence로 확인 | 빈 password 또는 hash 없는 admin으로 login 불가 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_iab_auth_VuKUEe/browser/auth-admin-blank-password-login-rejected.json`, AUTH-005 setup redirect evidence |
| AUTH-012 | AUTH | admin `/ops/users` UI와 `/ops/api/users` 응답에서 `passwordHash`/`password hash` 문자열 비노출 확인 | API 응답과 admin/user UI에 hash가 보이지 않음 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_iab_auth_VuKUEe/browser/ops-users-redaction-ui.json`, `ops-api-users-redaction.json` |
| AUTH-013 | AUTH | admin `/ops/users` UI와 `/ops/api/users` 응답에서 `passwordHistory` 문자열 비노출 확인 | API 응답과 admin/user UI에 history가 보이지 않음 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_iab_auth_VuKUEe/browser/ops-users-redaction-ui.json`, `ops-api-users-redaction.json` |
| AUTH-014 | AUTH | admin `/ops/users` UI, `/ops/api/users`, 초대 생성 후 reload된 invite list와 `/ops/api/invites`에서 `tokenHash` 비노출 확인 | API 응답과 UI에 tokenHash가 보이지 않음 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_iab_auth_VuKUEe/browser/ops-users-redaction-ui.json`, `ops-api-users-redaction.json`, `ops-users-invite-list-redaction-after-create.json`, `ops-api-invites-redaction-after-create.json` |
| AUTH-015 | AUTH | admin UI에서 test invite 생성 후 reload된 invite list와 `/ops/api/invites`에서 token/tokenHash/passwordHash/passwordHistory 비노출 확인 | invite list/detail에 hash가 보이지 않음 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_iab_auth_VuKUEe/browser/ops-users-invite-list-redaction-after-create.json`, `ops-api-invites-redaction-after-create.json` |
| AUTH-016 | AUTH | session-cookie browser login/logout exercised across admin/operator/viewer | cookie 세션으로 role landing과 logout이 동작 | 기대 evidence 확인 | PASS | session-cookie browser login/logout exercised across admin/operator/viewer |
| AUTH-018 | AUTH | created uioperator/uiviewer/uiintegrator via /ops/users UI; ops-users-created-roles.png | `/ops/users`에서 create 성공과 validation 확인 | 기대 evidence 확인 | PASS | created uioperator/uiviewer/uiintegrator via /ops/users UI; ops-users-created-roles.png |
| AUTH-019 | AUTH | 사용자 표시 이름/role/scope 수정 후 row와 auth store 반영 확인 | role/scope/status 수정 후 목록/detail 반영 | 기대 evidence 확인 | PASS | 기본 `users:lifecycle-edit-reset-disable-restore`와 session `auth:user-lifecycle-session` PASS |
| AUTH-020 | AUTH | 사용자 비활성화 2회 확인 후 auth store disabled, 해당 계정 login 거부 확인 | disable/delete action 후 login/access 차단 | 기대 evidence 확인 | PASS | `auth:user-lifecycle-session` 390px/1180px PASS |
| AUTH-021 | AUTH | disabled user restore 후 login 성공과 `/client/live` 접근 복구 확인 | disabled user restore 후 의도된 접근 복구 | 기대 evidence 확인 | PASS | `auth:user-lifecycle-session` 390px/1180px PASS |
| AUTH-022 | AUTH | fresh auth fixture에서 `/ops/users` 사용자 reset 메뉴를 열고 기존 비밀번호 reset 시도 history 거부, 새 임시 비밀번호 reset 성공, must-change row 반영을 확인. reset 전 viewer cookie `/auth/whoami` 200, reset 후 같은 cookie `/auth/whoami` 401 및 `/client/live` -> `/login` redirect 확인. 임시 비밀번호 로그인은 `/password/change`로 이동, 최종 변경 성공 후 이전 임시 비밀번호 로그인 거부와 최종 `/client/live` 로그인 확인 | reset은 password history 우회가 아님을 확인하고, reset 성공 시 must-change/password flow와 session revoke 확인 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_auth022_N1aAmv/browser/auth022-reset-reuse-rejected.json`, `auth022-reset-success.json`, `auth022-viewer-old-whoami-before-reset.json`, `auth022-viewer-old-whoami-after-reset.json`, `auth022-temp-login-must-change.json`, `auth022-password-change-success.json`, `auth022-temp-password-login-rejected.json`, `auth022-final-login-client-live.json` |
| AUTH-023 | AUTH | 마지막 admin 비활성화 1차 확인 후 2차 실행 시 서버 거부 copy와 admin enabled 유지 확인 | 마지막 admin disable/role change가 거부 copy를 표시 | 기대 evidence 확인 | PASS | `auth:last-admin-guard` 390px/1180px PASS |
| AUTH-024 | AUTH | admin login landed on /ops/home and could see Users nav/count | ops/users/rules/sources 접근과 admin action 허용 | 기대 evidence 확인 | PASS | admin login landed on /ops/home and could see Users nav/count |
| AUTH-025 | AUTH | operator login landed on /ops/home; users count hidden/admin-only Users nav absent | ops 운영 범위 접근과 admin-only action 차단 | 기대 evidence 확인 | PASS | operator login landed on /ops/home; users count hidden/admin-only Users nav absent |
| AUTH-026 | AUTH | viewer login landed on /client/live; /ops/home showed Access Denied | client만 접근, ops/lab 차단 | 기대 evidence 확인 | PASS | viewer login landed on /client/live; /ops/home showed Access Denied |
| AUTH-027 | AUTH | `ui_integrator_scope` integrator로 브라우저 로그인 후 `/client/live`, `/ops/home`이 Access Denied 화면을 표시하고 제품 shell이 열리지 않음을 확인. 같은 세션의 `/client/api/views/9001/events`, `/client/api/views/9001/metadata`는 200, `/ops/api/source-health`는 403 확인 | API/scope 중심 접근과 제품 UI 경계 확인 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_iab_auth_VuKUEe/browser/auth-integrator-client-live-denied.json`, `auth-integrator-ops-home-denied.json`, `auth-integrator-api-events.json`, `auth-integrator-api-metadata.json`, `auth-integrator-api-ops-source-health-forbidden.json` |
| AUTH-028 | AUTH | `ui_ops_readonly` operator scope `ops:read`로 `/ops/sources` 진입, 채널 추가 disabled/source-write-blocked copy 확인. `/ops/api/source-health` 200, `/ops/api/views/9901` PUT 403 확인 | read-only route/API 허용, write action 차단 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_iab_auth_VuKUEe/browser/auth-scope-readonly-ops-sources-ui.json`, `auth-scope-readonly-source-health.json`, `auth-scope-readonly-view-put-forbidden.json` |
| AUTH-029 | AUTH | `ui_ops_source_write` operator scope `ops:read,source:write`로 `/ops/sources` 진입, 채널 추가 enabled/source-write-allowed copy 확인. `/ops/api/views/9902` PUT 201 성공 후 DELETE 200 정리 | permitted write action만 성공 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_iab_auth_VuKUEe/browser/auth-scope-source-write-ops-sources-ui.json`, `auth-scope-source-write-view-put-success.json`, `auth-scope-source-write-view-delete-cleanup.json` |
| AUTH-030 | AUTH | viewer source tree showed only assigned views 9001/9003 | assigned view만 client 화면에 표시 | 기대 evidence 확인 | PASS | viewer source tree showed only assigned views 9001/9003 |
| AUTH-033 | AUTH | invite 발급 UI submit, one-time token output, invite list token/tokenHash 비노출 확인 | invite 생성 UI/API 성공, 원문 token 기록 금지 | 기대 evidence 확인 | PASS | 기본 `users:invite-create` 390px/1180px PASS |
| AUTH-034 | AUTH | invite setup으로 비밀번호 설정 후 viewer login과 `/client/live` 접근 확인 | invite setup 후 login/client 접근 확인 | 기대 evidence 확인 | PASS | `auth:access-request-approve-invite-setup` 390px/1180px PASS |
| AUTH-035 | AUTH | 사용 완료 invite token 재사용 submit이 `/invite/setup`에서 `invalid invite token`으로 거부됨 | expired/consumed token이 거부됨 | 기대 evidence 확인 | PASS | consumed token rejection 확인. expired token은 별도 만료시간 조작 검증 없음 |
| AUTH-036 | AUTH | `/client/request-access` public form 제출 후 pending 안내와 auth store pending request 확인 | public request 제출 후 pending 상태 확인 | 기대 evidence 확인 | PASS | `auth:access-request-approve-invite-setup`, `auth:access-request-reject` 390px/1180px PASS |
| AUTH-037 | AUTH | `/ops/users`에서 request approve, invite token 발급, invite setup 후 viewer scope `view:read:1` 생성 확인 | approve 후 invite/view scope 생성 확인 | 기대 evidence 확인 | PASS | `auth:access-request-approve-invite-setup` 390px/1180px PASS |
| AUTH-038 | AUTH | request reject 2회 확인 후 rejected row, user/invite 미생성 확인 | reject 후 invite/session/view scope 미생성 확인 | 기대 evidence 확인 | PASS | `auth:access-request-reject` 390px/1180px PASS |
| AUTH-039 | AUTH | pending 상태에서 user 미생성, invite 미발급, login 불가 경계 확인 | pending 상태에서 user/session/view 접근 없음 | 기대 evidence 확인 | PASS | `auth:access-request-approve-invite-setup`, `auth:access-request-reject` 390px/1180px PASS |
| AUTH-040 | AUTH | role guard evidence recorded in role-guard-evidence.json | role별 보호 route 접근/차단이 브라우저와 API에서 일치 | 기대 evidence 확인 | PASS | role guard evidence recorded in role-guard-evidence.json |
| SRC-001 | SRC | file source creation retried with non-duplicate imports/NewYorkDriving.mp4 and saved | file source form save 후 목록/view에서 사용 가능 | 기대 evidence 확인 | PASS | file source creation retried with non-duplicate imports/NewYorkDriving.mp4 and saved |
| SRC-002 | SRC | `/ops/sources`에서 RTSP kind 선택, 고유 `rtsp://127.0.0.1:8563/dhseo?...` 입력 저장, source/view API 반영, `/client/api/views/<id>/webrtc/session` 생성/DELETE, source health dashboard filter 확인 | RTSP URL 저장, health/session 지속성 확인 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` `sources:kind-matrix-health-wrapper`, `/private/tmp/media_server_src_evt_verify4/browser` |
| SRC-003 | SRC | `/ops/sources`에서 RTSP URI를 직접 입력/저장하고 `/client/api/views/<id>/webrtc/session` 생성/삭제 및 source-health dashboard 반영을 390px/1180px에서 재확인 | URI 저장, 재생/session wrapper, health 상태 확인 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` `sources:kind-matrix-health-wrapper`, `/private/tmp/media_server_rule_matrix_390_retry2`, `/private/tmp/media_server_rule_matrix_1180` |
| SRC-004 | SRC | `/ops/sources`에서 WHEP kind 선택, `http://127.0.0.1:8098/whep?...` 입력 저장, source/view API와 `/client/live` source tree 반영, `/client/api/views/<whep>/webrtc/session` 생성/DELETE, WHEP source audio/video sample ready 로그를 390px/1180px에서 확인 | WHEP URL 저장과 session wrapper 경계 확인 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_src004_click_390`, `/private/tmp/media_server_src004_click_1180`, `sources:kind-matrix-health-wrapper` |
| SRC-005 | SRC | `/ops/sources`에서 Published WebRTC 소스 kind 선택, `ui-whip-<id>` sourceId 입력 저장, source/view API와 client live source tree 반영 확인 | WHIP publish sourceId가 view/source registry에 반영 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` `sources:kind-matrix-health-wrapper`, `/private/tmp/media_server_src_evt_verify4/browser` |
| SRC-006 | SRC | /ops/sources list displayed seeded and new source rows | 목록 row/count/status가 API와 일치 | 기대 evidence 확인 | PASS | /ops/sources list displayed seeded and new source rows |
| SRC-007 | SRC | `/ops/sources`에서 9001 상세를 클릭하고 detail panel의 id/name/kind/site/group/file fields를 확인 | detail panel/route가 source fields를 표시 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_ui_goal_rZkl1F/browser/ops-sources-9001-detail.json` |
| SRC-008 | SRC | duplicate source validation shown, then non-duplicate file channel save succeeded; source-ui-evidence.json | create validation과 성공 row 반영 | 기대 evidence 확인 | PASS | duplicate source validation shown, then non-duplicate file channel save succeeded; source-ui-evidence.json |
| SRC-009 | SRC | 9001 displayName을 `UI Fulltest Playback Edited`로 수정 저장 후 row 반영 확인, 원래 이름으로 복원 저장 확인 | edit save 후 변경 값 반영 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_ui_goal_rZkl1F/browser/ops-sources-9001-edit-saved.json`, `ops-sources-9001-edit-restored.json` |
| SRC-010 | SRC | `/ops/sources` delete button 2회 확인 실행 후 `채널 삭제 완료`, `/client/api/views/<id>` 403/404, `/client/api/views/<id>/webrtc/session` block 확인 | delete 후 목록/view 참조 정리 확인 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` `sources:crud-view-lifecycle`, `/private/tmp/media_server_src_crud_verify2/browser` |
| SRC-011 | SRC | `/ops/sources` 상태 버튼으로 channel 비활성화, source/view API `enabled=false`, client view/session block 확인 후 재활성화 확인 | disabled source가 view/session/rule에서 차단됨 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` `sources:crud-view-lifecycle`, `/private/tmp/media_server_src_crud_verify2/browser` |
| SRC-012 | SRC | RTSP/HTTP source 생성 후 `/ops/api/source-health`에 sourceId가 포함되고 `/ops/dashboard` source-health incident filter/badge가 반영됨 | health status가 dashboard/list에 반영 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` `sources:kind-matrix-health-wrapper`, `dashboard:runtime-health-log`, `/private/tmp/media_server_src_evt_verify4/browser` |
| SRC-014 | SRC | `/ops/sources` ONVIF kind 선택 후 `WS-Discovery 자동 검색`, `Profile G/Recording/Replay` 미지원/no-device boundary와 field-smoke 조건 문구 확인 | no-device 경계와 field smoke 조건을 분리 기록 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` `sources:onvif-no-device-boundary`, `/private/tmp/media_server_src_evt_verify4/browser` |
| SRC-016 | SRC | source kind matrix 생성 항목들이 `/ops/api/views`에 sourceId/displayName/showDashboard/showEvents로 반영되고 `/client/live` source tree에 표시됨 | view 목록/count/scope 표시 확인 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` `sources:kind-matrix-health-wrapper`, `/private/tmp/media_server_src_evt_verify4/browser` |
| SRC-017 | SRC | RTSP/HTTP/WHEP/Published WebRTC source 생성 직후 `/client/live`에서 해당 `data-source-view=<id>` 선택 가능 상태 확인 | create 후 client/viewer scope에서 선택 가능 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` `sources:kind-matrix-health-wrapper`, `/private/tmp/media_server_src_evt_verify4/browser` |
| SRC-018 | SRC | source edit 후 source/view API와 client tree 반영, VA rule 연결/삭제 후 PublishedView allowedRuleIds 반영/해제, user scope를 view `1`에서 view `2`로 수정한 뒤 viewer `/client/live` source tree가 view `2`만 표시됨을 390px/1180px에서 확인 | source/rule/scope 변경 후 반영 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_src_crud_verify2/browser`, `/private/tmp/media_server_allowed_rule_390`, `/private/tmp/media_server_allowed_rule_1180`, `/private/tmp/media_server_src018_scope_390`, `/private/tmp/media_server_src018_scope_1180` |
| SRC-019 | SRC | 삭제 후 `/client/api/views/<id>` 403/404 및 `/client/api/views/<id>/webrtc/session` block 확인 | 삭제 후 client view와 session 접근 차단 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` `sources:crud-view-lifecycle`, `/private/tmp/media_server_src_crud_verify2/browser` |
| SRC-020 | SRC | 비활성화 후 `/client/api/views/<id>` 403/404 및 `/client/api/views/<id>/webrtc/session` block 확인 | inactive view가 client/rule/session에서 차단 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` `sources:crud-view-lifecycle`, `/private/tmp/media_server_src_crud_verify2/browser` |
| SRC-021 | SRC | create/update/re-enable 후 `/client/live` source tree에 해당 `data-source-view=<id>`가 표시되는지 확인 | view-source mapping이 client live에 반영 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` `sources:crud-view-lifecycle`, `/private/tmp/media_server_src_crud_verify2/browser` |
| SRC-022 | SRC | VA rule 연결 후 client list/detail `allowedRuleIds`, dashboard/metadata view scope, disallowed rule session 차단 확인 | PublishedView `allowedRuleIds`가 client list/detail API에 유지되고 허용 rule만 client session/metadata에 반영 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` 390/1180 allowed rule API/session/metadata scope assertions PASS |
| SRC-023 | SRC | auth-on viewer로 `/client/live`, `/client/dashboard`, `/client/events`에서 assigned 9001만 표시되고 unassigned 9002/9003/9004가 보이지 않음 확인 | viewer별 assigned view만 노출 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_iab_auth_VuKUEe/browser/viewer-client-live.json`, `viewer-client-dashboard.json`, `viewer-client-events.json`, CLIENT-011 |
| SRC-024 | SRC | RTSP source의 `/client/api/views/<id>/webrtc/session` 생성/DELETE 확인 및 auth UI viewer `/client/live` 재생/중지/logout cleanup에서 tile playing과 runtime idle 확인 | wrapper session 생성/종료와 media path 확인 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` `sources:kind-matrix-health-wrapper`, `client:live-session-cleanup`, `/private/tmp/media_server_src_evt_verify4/browser`, `/private/tmp/media_server_client005_verify3/browser` |
| SRC-025 | SRC | auth-on viewer `/client/dashboard`에서 assigned 9001만 표시되고 9002/9003/9004/Ops/Lab/raw/debug 노출 없음 확인 | view-scoped dashboard가 assigned data만 표시 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_iab_auth_VuKUEe/browser/viewer-client-dashboard.json`, CLIENT-006 |
| SRC-026 | SRC | auth-on viewer `/client/events`에서 assigned 9001만 표시되고 9002/9003/9004/Ops/Lab/raw/debug 노출 없음 확인 | view-scoped events가 assigned data만 표시 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_iab_auth_VuKUEe/browser/viewer-client-events.json`, CLIENT-007 |
| SRC-028 | SRC | admin /client/live displayed admin preview state; admin-client-preview.png | admin client 화면에 preview 상태가 명확히 표시 | 기대 evidence 확인 | PASS | admin /client/live displayed admin preview state; admin-client-preview.png |
| SRC-029 | SRC | client live/dashboard leak scan found no source URL token in responsive evidence | client 화면/API에 source URL이 보이지 않음 | 기대 evidence 확인 | PASS | client live/dashboard leak scan found no source URL token in responsive evidence |
| SRC-030 | SRC | client live/dashboard leak scan found no Developer URL token in responsive evidence | client 화면에 Developer URL이 보이지 않음 | 기대 evidence 확인 | PASS | client live/dashboard leak scan found no Developer URL token in responsive evidence |
| RULE-001 | RULE | /ops/rules VA rule list count/status visible; ops-rules-nav-click.png | list count/status/source/type/profile이 표시됨 | 기대 evidence 확인 | PASS | /ops/rules VA rule list count/status visible; ops-rules-nav-click.png |
| RULE-002 | RULE | /ops/rules event template list count/status visible; ops-rules-nav-click.png | template 목록과 type/scenario summary 표시 | 기대 evidence 확인 | PASS | /ops/rules event template list count/status visible; ops-rules-nav-click.png |
| RULE-003 | RULE | /ops/rules profile list count/status visible; ops-rules-nav-click.png | profile 목록과 detector/FPS/tracking summary 표시 | 기대 evidence 확인 | PASS | /ops/rules profile list count/status visible; ops-rules-nav-click.png |
| RULE-004 | RULE | 완료 | source/template/profile/geometry 선택 후 저장 성공 | 없음 | PASS | verify-ops-click-e2e 390/1180에서 `/ops/rules` VA rule 폼을 직접 열고 source/template/profile/geometry를 선택/입력/저장한 뒤 catalog와 PublishedView binding을 확인했습니다. |
| RULE-005 | RULE | 완료 | 변경 값 저장 후 list/detail 반영 | 없음 | PASS | verify-ops-click-e2e 390/1180에서 저장된 VA rule을 상세->수정으로 열어 name/status/template/geometry/tracker 값을 바꾸고 catalog/list 반영을 확인했습니다. |
| RULE-006 | RULE | 완료 | 삭제 후 allowed rule/session에서 제거 | 없음 | PASS | verify-ops-click-e2e 390/1180에서 VA rule 삭제 2회 확인을 클릭하고 PublishedView allowedRuleIds/defaultRuleId 제거 및 client va-rule session 차단을 확인했습니다. |
| RULE-007 | RULE | VA rule 저장 직후 detail form에서 source/template/profile/enabled select와 geometry point count를 확인 | detail에 source/template/profile/geometry/status 표시 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` `rules:native-crud-policy`, `/private/tmp/media_server_rule_matrix_390_retry2`, `/private/tmp/media_server_rule_matrix_1180` |
| RULE-008 | RULE | 완료 | active/inactive 전환과 적용 상태 반영 | 없음 | PASS | verify-ops-click-e2e 390/1180에서 VA rule 상태를 inactive/active로 저장하고 catalog enabled 값과 row status를 확인했습니다. |
| RULE-009 | RULE | VA rule create form에서 channel select를 비운 뒤 저장해 `채널을 선택하세요` validation을 확인하고, 이후 source select 저장 성공을 확인 | source select와 validation 동작 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` missing-source validation 및 VA rule create PASS |
| RULE-010 | RULE | 완료 | template 선택과 저장 payload 반영 | 없음 | PASS | verify-ops-click-e2e 390/1180에서 이벤트 템플릿 select 값을 저장하고 `templateStart.ruleId` 반영을 확인했습니다. |
| RULE-011 | RULE | 완료 | profile 선택과 저장 payload 반영 | 없음 | PASS | verify-ops-click-e2e 390/1180에서 분석 프로파일 select 값을 저장하고 `analysis.profileId` 반영을 확인했습니다. |
| RULE-012 | RULE | VA rule geometry clear 클릭으로 0점/최소점 validation, default 좌표 복원, custom polygon 좌표 저장과 catalog readback 확인 | polygon/region 값 입력/초기화/저장 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` geometry clear/default/custom save PASS |
| RULE-013 | RULE | 완료 | line points/direction 입력/저장 | 없음 | PASS | verify-ops-click-e2e 390/1180에서 line-crossing 템플릿과 line 좌표를 저장하고 `event.region.type=line` 및 2점 이상 payload를 확인했습니다. |
| RULE-014 | RULE | `/ops/rules` VA rule row에서 RTSP/WHEP/client copy 버튼을 클릭해 payload를 확인하고, `/client/live`에는 ops rule copy control과 `vaRule=<id>` output URL이 노출되지 않음을 390px/1180px에서 확인 | output URL/copy 표시가 role 정책과 일치 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_rule038_policy_390`, `/private/tmp/media_server_rule038_policy_1180` |
| RULE-015 | RULE | 완료 | status badge/copy가 runtime/API와 일치 | 없음 | PASS | verify-ops-click-e2e 390/1180에서 status badge, RTSP/WHEP/client copy payload, client va-rule session 생성/삭제를 확인했습니다. |
| RULE-016 | RULE | 완료 | 사용자가 직접 id 입력하지 않고 다음 번호가 부여 | 없음 | PASS | verify-ops-click-e2e 390/1180에서 VA rule/profile/event template 생성 시 hidden ID와 generated ID display가 자동 배정되는 것을 확인했습니다. |
| RULE-017 | RULE | 완료 | id field가 노출/수정되지 않음 | 없음 | PASS | verify-ops-click-e2e 390/1180에서 VA rule ID input이 hidden이고 표시용 generated ID만 노출되는 것을 확인했습니다. |
| RULE-018 | RULE | 완료 | basic/scenario template 생성 성공 | 없음 | PASS | verify-ops-click-e2e 390/1180에서 scenario intrusion-dwell 템플릿과 basic line-crossing 템플릿을 UI로 생성하고 catalog 반영을 확인했습니다. |
| RULE-019 | RULE | 완료 | type/condition 변경 저장 후 반영 | 없음 | PASS | verify-ops-click-e2e 390/1180에서 event template 상세->수정으로 confidence/candidate/dwell/cooldown을 변경 저장하고 catalog 반영을 확인했습니다. |
| RULE-020 | RULE | event template 삭제 후 참조 중인 VA rule validation panel에서 missing template 표시 확인 | 삭제 후 참조 rule validation 확인 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` 390/1180에서 template 삭제 후 `템플릿 <id>을 찾을 수 없습니다` validation 표시 확인 |
| RULE-021 | RULE | event template row에서 후보/확정/재알림 summary, VA rule row에서 영역/라인 summary를 확인 | condition/geometry/cooldown summary 표시 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` event condition row 및 VA geometry row assertions PASS |
| RULE-022 | RULE | 완료 | detector/FPS/queue/input/tracker 설정 저장 | 없음 | PASS | verify-ops-click-e2e 390/1180에서 profile detector/FPS/queue/confidence/NMS/input/adaptive 값을 UI로 저장하고 catalog 반영을 확인했습니다. |
| RULE-023 | RULE | 완료 | profile field 변경 후 반영 | 없음 | PASS | verify-ops-click-e2e 390/1180에서 profile 상세->수정으로 detector/FPS/queue/input 값을 변경하고 list/catalog 반영을 확인했습니다. |
| RULE-024 | RULE | analysis profile 삭제 후 참조 중인 VA rule validation panel에서 missing profile 표시 확인 | 삭제 후 참조 rule validation 확인 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` 390/1180에서 profile 삭제 후 `프로파일 <id>을 찾을 수 없습니다` validation 표시 확인 |
| RULE-025 | RULE | profile list에서 `dummy`, FPS `8`, `큐 3` 표시와 VA rule row에서 Lite/Kalman/ByteTrack/Re-ID off/assist 표시를 확인 | detector/FPS/queue/tracker/Re-ID 표시 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` profile row/tracking policy row assertions PASS |
| RULE-026 | RULE | 완료 | detector 선택과 payload 저장 | 없음 | PASS | verify-ops-click-e2e 390/1180에서 `yolo` detector를 선택 저장하고 profile payload를 확인했습니다. |
| RULE-027 | RULE | 완료 | dummy detector 선택과 payload 저장 | 없음 | PASS | verify-ops-click-e2e 390/1180에서 `dummy` detector로 변경 저장하고 profile payload를 확인했습니다. |
| RULE-028 | RULE | 완료 | numeric input validation과 저장 | 없음 | PASS | verify-ops-click-e2e 390/1180에서 FPS 0 저장 차단 후 유효 FPS 저장을 확인했습니다. |
| RULE-029 | RULE | 완료 | queue input validation과 저장 | 없음 | PASS | verify-ops-click-e2e 390/1180에서 Queue 0 저장 차단 후 유효 Queue 저장을 확인했습니다. |
| RULE-030 | RULE | 완료 | confidence range validation과 저장 | 없음 | PASS | verify-ops-click-e2e 390/1180에서 Confidence 1.2 저장 차단 후 유효 Confidence 저장을 확인했습니다. |
| RULE-031 | RULE | 완료 | NMS range validation과 저장 | 없음 | PASS | verify-ops-click-e2e 390/1180에서 NMS -0.1 저장 차단 후 유효 NMS 저장을 확인했습니다. |
| RULE-032 | RULE | 완료 | width/height validation과 저장 | 없음 | PASS | verify-ops-click-e2e 390/1180에서 입력 폭 0 저장 차단 후 유효 width/height 저장을 확인했습니다. |
| RULE-033 | RULE | profile tracking category clear validation, 전체 category 저장, detail/list summary readback 확인 | tracking category summary가 선택 값과 일치 | 기대 evidence 확인 | PASS | 제품 UI profile tracking category selector 추가, `verify-ops-click-e2e` 390/1180 PASS |
| RULE-034 | RULE | 완료 | tracker none 저장과 Re-ID off 정책 확인 | 없음 | PASS | verify-ops-click-e2e 390/1180에서 tracker `none` 선택 시 Re-ID가 `off`로 강제되고 저장 payload가 `none/off`가 되는 것을 확인했습니다. |
| RULE-035 | RULE | 완료 | lite 저장과 runtime 안정성 확인 | 없음 | PASS | verify-ops-click-e2e 390/1180에서 `lite/off` 저장 후 client va-rule session 생성/삭제가 성공했습니다. |
| RULE-036 | RULE | 완료 | kalman-lite 저장과 runtime 안정성 확인 | 없음 | PASS | verify-ops-click-e2e 390/1180에서 `kalman-lite/off` 저장 후 client va-rule session 생성/삭제가 성공했습니다. |
| RULE-037 | RULE | 완료 | bytetrack 저장과 runtime 안정성 확인 | 없음 | PASS | verify-ops-click-e2e 390/1180에서 `bytetrack/off` 저장 후 client va-rule session 생성/삭제가 성공했습니다. |
| RULE-038 | RULE | VA rule tracking policy를 `lite/off`, `bytetrack/off`, `none/off`로 저장하고 client `va-rule` session 생성 중 `/ops/api/runtime/status` active tap `trackingPolicy.reid=off`, `source=rule`, `specified=true`, `ruleId=<id>` 확인 | Re-ID off 저장과 metadata policy 확인 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_rule038_policy_390`, `/private/tmp/media_server_rule038_policy_1180` |
| RULE-039 | RULE | 완료 | assist 저장과 tracker 조합 정책 확인 | 없음 | PASS | verify-ops-click-e2e 390/1180에서 `lite/assist` 저장과 client va-rule session 생성/삭제를 확인했습니다. |
| RULE-040 | RULE | 완료 | invalid 조합이 저장되지 않거나 off로 정규화 | 없음 | PASS | verify-ops-click-e2e 390/1180에서 tracker `none` 선택 시 Re-ID select가 `off`로 강제되고 payload도 `off`로 저장되는 것을 확인했습니다. |
| RULE-041 | RULE | `presence` event template 생성/저장/detail readback을 390px/1180px에서 확인하고 `/ops/events` pagination/EventRecord sample에서 `presence` rows 확인 | template 생성과 최종 EventRecord `presence` 발생 이력 확인 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_rule_basic_templates_390/ops-click-e2e-summary.json`, `/private/tmp/media_server_rule_basic_templates_1180/ops-click-e2e-summary.json`, `/private/tmp/media_server_ui_events_recheck_9mDk8S/browser/ops-events-type-paging-more.json` |
| RULE-042 | RULE | `enter` event template 생성/저장/detail readback을 390px/1180px에서 확인하고 `/ops/events` pagination/EventRecord sample에서 `enter` rows 확인 | template 생성과 최종 EventRecord `enter` 발생 이력 확인 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_rule_basic_templates_390/ops-click-e2e-summary.json`, `/private/tmp/media_server_rule_basic_templates_1180/ops-click-e2e-summary.json`, `/private/tmp/media_server_ui_events_recheck_9mDk8S/browser/ops-events-type-paging-more.json` |
| RULE-043 | RULE | `exit` event template 생성/저장/detail readback을 390px/1180px에서 확인하고 `/ops/events` pagination/EventRecord sample에서 `exit` rows 확인 | template 생성과 최종 EventRecord `exit` 발생 이력 확인 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_rule_basic_templates_390/ops-click-e2e-summary.json`, `/private/tmp/media_server_rule_basic_templates_1180/ops-click-e2e-summary.json`, `/private/tmp/media_server_ui_events_recheck_9mDk8S/events/va_events.jsonl` |
| RULE-044 | RULE | `line-crossing` any/forward/reverse template 생성/저장/detail readback을 390px/1180px에서 확인하고 `/ops/events` pagination/EventRecord sample에서 `line-crossing` rows 확인 | line geometry/direction 저장과 최종 EventRecord `line-crossing` 발생 이력 확인 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_rule_basic_templates_390/ops-click-e2e-summary.json`, `/private/tmp/media_server_rule_basic_templates_1180/ops-click-e2e-summary.json`, `verify-va-events --dispatch-records` filtered rule counts |
| RULE-045 | RULE | line-crossing `any` template 저장 후 VA rule에 적용하고 client va-rule session 생성/삭제 확인 | any direction 저장과 적용 확인 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` 390/1180 line direction apply matrix PASS |
| RULE-046 | RULE | line-crossing `forward` template 저장 후 VA rule에 적용하고 client va-rule session 생성/삭제 확인 | forward 저장과 적용 확인 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` 390/1180 line direction apply matrix PASS |
| RULE-047 | RULE | line-crossing `reverse` template 저장 후 VA rule에 적용하고 client va-rule session 생성/삭제 확인 | reverse 저장과 적용 확인 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` 390/1180 line direction apply matrix PASS |
| RULE-048 | RULE | `intrusion-dwell` scenario template 생성/저장/detail readback을 390px/1180px에서 확인하고 `/ops/events` pagination/EventRecord sample에서 `intrusion-dwell` rows 확인 | scenario UI 저장과 최종 EventRecord `intrusion-dwell` 발생 이력 확인 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_rule_basic_templates_390/ops-click-e2e-summary.json`, `/private/tmp/media_server_rule_basic_templates_1180/ops-click-e2e-summary.json`, `/tmp/media_server_vaevt-1779716750-86002_event_records.json` |
| RULE-049 | RULE | `re-entry` scenario template 생성/저장/detail readback을 390px/1180px에서 확인하고 `/ops/events` pagination artifact에서 `re-entry` row 확인 | scenario UI 저장과 최종 EventRecord `re-entry` 발생 이력 확인 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_rule_basic_templates_390/ops-click-e2e-summary.json`, `/private/tmp/media_server_rule_basic_templates_1180/ops-click-e2e-summary.json`, `/private/tmp/media_server_ui_events_recheck_9mDk8S/browser/ops-events-type-paging-more.json` |
| RULE-050 | RULE | `wrong-direction` scenario template 생성/저장/detail readback을 390px/1180px에서 확인하고 EventRecord sample에서 `wrong-direction` rows 확인 | scenario UI 저장과 최종 EventRecord `wrong-direction` 발생 이력 확인 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_rule_basic_templates_390/ops-click-e2e-summary.json`, `/private/tmp/media_server_rule_basic_templates_1180/ops-click-e2e-summary.json`, `/tmp/media_server_vaevt-1779716750-86002_event_records.json` |
| RULE-051 | RULE | `intrusion-after-line-crossing` scenario template 생성/저장/detail readback을 390px/1180px에서 확인하고 EventRecord sample에서 `intrusion-after-line-crossing` rows 확인 | scenario UI 저장과 최종 EventRecord `intrusion-after-line-crossing` 발생 이력 확인 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_rule_basic_templates_390/ops-click-e2e-summary.json`, `/private/tmp/media_server_rule_basic_templates_1180/ops-click-e2e-summary.json`, `/tmp/media_server_vaevt-1779716750-86002_event_records.json` |
| RULE-052 | RULE | `loitering` scenario template 생성/저장/detail readback을 390px/1180px에서 확인하고 EventRecord sample에서 `loitering` rows 확인 | scenario UI 저장과 최종 EventRecord `loitering` 발생 이력 확인 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_rule_basic_templates_390/ops-click-e2e-summary.json`, `/private/tmp/media_server_rule_basic_templates_1180/ops-click-e2e-summary.json`, `/tmp/media_server_vaevt-1779716750-86002_event_records.json` |
| RULE-053 | RULE | `zone-occupancy` scenario template 생성/저장/detail readback을 390px/1180px에서 확인하고 EventRecord sample에서 `zone-occupancy` rows 확인 | scenario UI 저장과 최종 EventRecord `zone-occupancy` 발생 이력 확인 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_rule_basic_templates_390/ops-click-e2e-summary.json`, `/private/tmp/media_server_rule_basic_templates_1180/ops-click-e2e-summary.json`, `/tmp/media_server_vaevt-1779716750-86002_event_records.json` |
| RULE-054 | RULE | scenario builder에서 `default` preset을 선택하고 baseline/payload 반영 확인 | preset 선택 후 condition 값 반영 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_ui_goal_rZkl1F/browser/ops-rules-scenario-builder-payload-matrix.json` |
| RULE-055 | RULE | scenario builder에서 `road` preset을 선택하고 baseline/payload 반영 확인 | preset 선택 후 condition 값 반영 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_ui_goal_rZkl1F/browser/ops-rules-scenario-builder-payload-matrix.json` |
| RULE-056 | RULE | scenario builder에서 `retail` preset을 선택하고 baseline/payload 반영 확인 | preset 선택 후 condition 값 반영 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_ui_goal_rZkl1F/browser/ops-rules-scenario-builder-payload-matrix.json` |
| RULE-057 | RULE | scenario builder에서 `park` preset을 선택하고 baseline/payload 반영 확인 | preset 선택 후 condition 값 반영 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_ui_goal_rZkl1F/browser/ops-rules-scenario-builder-payload-matrix.json` |
| RULE-058 | RULE | scenario builder에서 `indoor` preset을 선택하고 baseline/payload 반영 확인 | preset 선택 후 condition 값 반영 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_ui_goal_rZkl1F/browser/ops-rules-scenario-builder-payload-matrix.json` |
| RULE-059 | RULE | scenario builder에서 `lobby` preset을 선택하고 baseline/payload 반영 확인 | preset 선택 후 condition 값 반영 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_ui_goal_rZkl1F/browser/ops-rules-scenario-builder-payload-matrix.json` |
| RULE-060 | RULE | scenario builder에서 `platform` preset을 선택하고 baseline/payload 반영 확인 | preset 선택 후 condition 값 반영 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_ui_goal_rZkl1F/browser/ops-rules-scenario-builder-payload-matrix.json` |
| RULE-061 | RULE | scenario builder에서 `entrance` preset을 선택하고 baseline/payload 반영 확인 | preset 선택 후 condition 값 반영 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_ui_goal_rZkl1F/browser/ops-rules-scenario-builder-payload-matrix.json` |
| RULE-062 | RULE | scenario builder에서 `doorway` preset을 선택하고 baseline/payload 반영 확인 | preset 선택 후 condition 값 반영 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_ui_goal_rZkl1F/browser/ops-rules-scenario-builder-payload-matrix.json` |
| RULE-063 | RULE | scenario builder에서 `parking` preset을 선택하고 baseline/payload 반영 확인 | preset 선택 후 condition 값 반영 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_ui_goal_rZkl1F/browser/ops-rules-scenario-builder-payload-matrix.json` |
| RULE-064 | RULE | scenario builder에서 `elevator` preset을 선택하고 baseline/payload 반영 확인 | preset 선택 후 condition 값 반영 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_ui_goal_rZkl1F/browser/ops-rules-scenario-builder-payload-matrix.json` |
| RULE-065 | RULE | `/ops/rules` event template form에서 custom preset을 고르고 scenario별 custom numeric 값을 직접 입력/저장/readback 확인 | custom value 입력과 저장 확인 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` scenario form matrix 390px/1180px PASS |
| RULE-066 | RULE | custom scenario template 저장 후 polygon `event.region.type=polygon` 및 기본 4점 payload readback 확인 | zone geometry 저장과 payload 반영 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` scenario form matrix catalog assertions PASS |
| RULE-067 | RULE | intrusion-dwell candidateTime `-1` 저장 차단 후 `1600` 저장/readback 확인 | candidateTime validation과 저장 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` intrusion-dwell validation PASS |
| RULE-068 | RULE | intrusion-dwell dwellTime `-1` 저장 차단 후 `5200` 저장/readback 확인 | dwellTime validation과 저장 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` intrusion-dwell validation PASS |
| RULE-069 | RULE | intrusion-dwell cooldown `-1` 저장 차단 후 `2400` 저장/readback 확인 | cooldown validation과 저장 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` intrusion-dwell validation PASS |
| RULE-070 | RULE | intrusion-dwell custom template 저장 후 polygon region 4점 payload readback 확인 | polygon zone 저장 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` intrusion-dwell custom polygon PASS |
| RULE-071 | RULE | re-entry window `-1` 저장 차단 후 `9000` 저장/readback 확인 | reEntryWindow validation과 저장 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` re-entry validation PASS |
| RULE-072 | RULE | re-entry cooldown `-1` 저장 차단 후 `2500` 저장/readback 확인 | cooldown validation과 저장 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` re-entry validation PASS |
| RULE-073 | RULE | line-crossing any/forward/reverse template 생성 시 `event.region.type=line`과 2점 line geometry readback 확인 | line geometry 저장 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` line direction matrix PASS |
| RULE-074 | RULE | wrong-direction template에서 `any` direction 저장을 `allowed direction` validation으로 차단하고 `forward` 저장/readback 확인 | allowed direction에서 `any` 제외 정책 확인 | 기대 evidence 확인 | PASS | 제품 UI validation 추가, `verify-ops-click-e2e` wrong-direction guard PASS |
| RULE-075 | RULE | wrong-direction cooldown `2600` 저장/readback 확인 | cooldown validation과 저장 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` wrong-direction custom save PASS |
| RULE-076 | RULE | intrusion-after-line-crossing template에서 trigger direction `reverse`, triggerLine payload 저장/readback 확인 | trigger line 저장 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` intrusion-after-line-crossing custom save PASS |
| RULE-077 | RULE | line-crossing template 3개에서 `any`, `forward`, `reverse` direction 저장/readback 및 row summary 확인 | any/forward/reverse 저장 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` line direction matrix PASS |
| RULE-078 | RULE | intrusion-after-line-crossing form에서 `targetZoneIds=zone-entry, zone-core` 입력/저장/detail readback/row summary 확인 | target zone 저장 | 기대 evidence 확인 | PASS | 제품 UI target zone 입력 추가, `verify-ops-click-e2e` 390/1180 target zone PASS |
| RULE-079 | RULE | intrusion-after-line-crossing maxDelay `-1` 저장 차단 후 `6500` 저장/readback 확인 | maxDelayAfterCrossingMs validation과 저장 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` intrusion-after-line-crossing validation PASS |
| RULE-080 | RULE | intrusion-after-line-crossing dwell `-1` 저장 차단 후 `1800` 저장/readback 확인 | dwell validation과 저장 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` intrusion-after-line-crossing validation PASS |
| RULE-081 | RULE | intrusion-after-line-crossing cooldown `2700` 저장/readback 확인 | cooldown validation과 저장 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` intrusion-after-line-crossing custom save PASS |
| RULE-082 | RULE | loitering form에서 `restrictedZoneIds=zone-loiter` 입력/저장/detail readback/row summary 확인 | target zone 저장 | 기대 evidence 확인 | PASS | 제품 UI restricted zone 입력 추가, `verify-ops-click-e2e` 390/1180 loitering zone PASS |
| RULE-083 | RULE | loitering min dwell `-1` 저장 차단 후 `21000` 저장/readback 확인 | min dwell validation과 저장 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` loitering validation PASS |
| RULE-084 | RULE | loitering radius `0` 저장 차단 후 `0.07` 저장/readback 확인 | radius validation과 저장 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` loitering validation PASS |
| RULE-085 | RULE | loitering min points `1` 저장 차단 후 `5` 저장/readback 확인 | min points validation과 저장 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` loitering validation PASS |
| RULE-086 | RULE | loitering cooldown `2800` 저장/readback 확인 | cooldown validation과 저장 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` loitering custom save PASS |
| RULE-087 | RULE | loitering ground-plane toggle on 후 `scenario.useGroundPlaneMovementRadius=true` 저장/readback 및 row summary `ground-plane` 확인 | `/ops/rules` loitering form의 ground-plane toggle이 표시되고 `scenario.useGroundPlaneMovementRadius` 저장/재조회에 반영 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` loitering ground-plane PASS |
| RULE-088 | RULE | zone-occupancy form에서 `restrictedZoneIds=zone-lobby` 입력/저장/detail readback/row summary 확인 | target zone 저장 | 기대 evidence 확인 | PASS | 제품 UI restricted zone 입력 추가, `verify-ops-click-e2e` 390/1180 zone occupancy zone PASS |
| RULE-089 | RULE | zone-occupancy threshold `0` 저장 차단 후 `6` 저장/readback 확인 | threshold validation과 저장 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` zone-occupancy validation PASS |
| RULE-090 | RULE | zone-occupancy min dwell `-1` 저장 차단 후 `8000` 저장/readback 확인 | min dwell validation과 저장 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` zone-occupancy validation PASS |
| RULE-091 | RULE | zone-occupancy cooldown `2900` 저장/readback 확인 | cooldown validation과 저장 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` zone-occupancy custom save PASS |
| RULE-092 | RULE | 완료 | `/ops/rules` validation panel이 VA rule/event template/profile 중복 ID를 표시하고, 서버 create API가 기존 event template/VA rule ID 재생성을 거부 | 없음 | PASS | `verify-ops-rule-validation-matrix --http-base http://127.0.0.1:8090`가 UI validation matrix fixtures를 전부 확인했고, `verify-ops-rules-roundtrip --http-base http://127.0.0.1:8090`가 duplicate event template/VA rule create 거부를 확인했습니다. |
| RULE-093 | RULE | 완료 | `/ops/rules` 저장 전 missing profile과 missing template을 각각 차단하고, 서버가 `analysis.profileId`/`templateStart.ruleId` missing reference 저장을 거부 | 없음 | PASS | `verify-rule-ui --http-base http://127.0.0.1:8090`가 missing profile/template pre-save UI 차단을 확인했고, `verify-ops-rule-relationships --http-base http://127.0.0.1:8090`가 서버 missing reference 거부를 확인했습니다. |
| RULE-094 | RULE | 완료 | `/ops/rules` 저장 전 inactive profile과 inactive template을 각각 차단하고, 서버가 inactive `analysis.profileId`/`templateStart.ruleId` 저장을 거부 | 없음 | PASS | `verify-rule-ui --http-base http://127.0.0.1:8090`가 inactive profile/template pre-save UI 차단을 확인했고, `verify-ops-rule-relationships --http-base http://127.0.0.1:8090`가 서버 inactive reference 거부를 확인했습니다. |
| RULE-095 | RULE | 완료 | `/ops/rules` validation matrix가 source mismatch를 표시하고, mismatched PublishedView `va-rule` session apply가 `vaRule source must match PublishedView source`로 거부 | 없음 | PASS | `verify-ops-rule-validation-matrix --http-base http://127.0.0.1:8090`가 UI matrix coverage를 확인했고, `verify-ops-rule-relationships --http-base http://127.0.0.1:8090`가 source mismatch relationship issue와 client session 거부를 확인했습니다. |
| RULE-096 | RULE | 완료 | `/ops/rules` validation matrix가 inactive channel/view를 표시하고, inactive PublishedView와 inactive source의 `va-rule` session apply가 각각 404로 거부 | 없음 | PASS | `verify-ops-rule-validation-matrix --http-base http://127.0.0.1:8090`가 UI matrix coverage를 확인했고, `verify-ops-rule-relationships --http-base http://127.0.0.1:8090`가 inactive view/channel client session 거부를 확인했습니다. |
| RULE-097 | RULE | session-auth viewer로 로그인한 상태에서 `/client/live` source tree가 assigned view `1`만 표시하고, `/client/api/views`/detail allowedRuleIds가 assigned rule만 포함하며, `/client/api/views/2/dashboard`, `/client/api/views/2/webrtc/session`, view 1의 disallowed va-rule session이 차단됨을 390px/1180px에서 확인 | viewer가 권한 없는 rule/view를 보지 못함 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_rule097_auth_390`, `/private/tmp/media_server_rule097_auth_1180`, `auth:viewer-rule-scope-boundary` |
| RULE-098 | RULE | 완료 | source는 일치하지만 PublishedView `allowedRuleIds` 밖인 VA rule이 `/ops/rules`에서 표시되고 client `va-rule` session이 `allowed vaRule is required for va-rule mode`로 거부 | 없음 | PASS | `verify-ops-rule-validation-matrix --http-base http://127.0.0.1:8090`가 matrix fixture를 확인했고, `verify-ops-rule-relationships --http-base http://127.0.0.1:8090`가 allowedRuleIds 제거 뒤 기존 session 유지/신규 session 거부를 확인했습니다. |
| RULE-099 | RULE | `verify-ops-rule-relationships`에서 연결 생성 후 PublishedView `allowedRuleIds` 제거, 기존 client session ICE/DELETE 200 유지, 같은 rule 신규 `va-rule` session 거부를 확인 | 연결 생성 후 PublishedView `allowedRuleIds`에서 해당 rule을 제거해도 기존 client session ICE/DELETE는 200으로 유지되고, 같은 rule의 신규 `va-rule` session은 `allowed vaRule is required for va-rule mode`로 거부 | 기대 evidence 확인 | PASS | `./server.sh verify-ops-rule-relationships --http-base http://127.0.0.1:8094` PASS. UI 비대상/간접 안정화 행 |
| RULE-100 | RULE | 완료 | `/ops/rules` validation matrix가 `priority-conflict`를 표시하고, 같은 source+priority의 두 번째 VA rule 저장 API가 `vaRule priority conflicts with existing rule on same source`로 거부 | 없음 | PASS | `verify-ops-rule-validation-matrix --http-base http://127.0.0.1:8090`가 `priority-conflict` matrix coverage를 확인했고, `verify-ops-rule-relationships --http-base http://127.0.0.1:8090`가 같은 source+priority 서버 저장 거부를 확인했습니다. |
| RULE-101 | RULE | 완료 | `/ops/rules` 저장 전 검증이 profile/template class mismatch를 쓰기 없이 차단하고, 서버가 `analysis.classes`/profile classes가 template classes를 포함하지 않는 VA rule 저장을 각각 거부 | 없음 | PASS | `verify-rule-ui --http-base http://127.0.0.1:8090`가 class mismatch pre-save UI 차단을 확인했고, `verify-ops-rule-relationships --http-base http://127.0.0.1:8090`가 rule/profile class mismatch 서버 거부를 확인했습니다. |
| EVT-001 | EVT | active VA rule session을 생성한 상태에서 `/ops/dashboard` Runtime Ops/VA Quality badge와 `/ops/home` active session summary가 runtime/status와 일치함을 390px/1180px에서 확인 | runtime status가 dashboard/home에 반영되고 drift 없음 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_runtime_dashboard_390`, `/private/tmp/media_server_runtime_dashboard_1180`, 30분 predev PASS |
| EVT-003 | EVT | `/ops/dashboard` source-health incident filter/hash/badge 확인 및 RTSP/HTTP source 생성 후 `/ops/api/source-health` sourceId 포함 확인 | source health list/dashboard 표시가 상태와 일치 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` `dashboard:runtime-health-log`, `sources:kind-matrix-health-wrapper`, `/private/tmp/media_server_src_evt_verify4/browser` |
| EVT-004 | EVT | `/ops/dashboard` incident source를 `log-tail`로 선택해 UI badge/timeline을 확인하고 `/ops/api/diagnostics/log-tail` lines에서 password/token/session header 계열 민감 문자열 비노출 확인 | log tail 표시와 redaction 확인 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` runtime dashboard 보강 390/1180 PASS |
| EVT-007 | EVT | 후속 auth-off 격리 서버에서 `/ops/events` row/filter/pagination/archive 조작 및 10개 event type row 확인. 추가로 storage-enabled 격리 서버에서 synthetic EventRecord row/evidence action/filter/archive/prev-next와 seed registry 12개 event/scenario rule별 EventRecord history coverage를 390px/1180px에서 확인 | `/ops/events` rows/filter/pagination/archive 상태가 표시되고 최종 rule/scenario별 EventRecord 발생 이력과 대조됨 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_ui_events_recheck_9mDk8S/browser/ops-events-type-paging*.json`, `/private/tmp/media_server_event_records_scope_history_390/event-history-coverage.json`, `/private/tmp/media_server_event_records_scope_history_1180/event-history-coverage.json` |
| EVT-016 | EVT | /ops/events status panel opened and refreshed; ops-events-after-records.png | events status panel/API 일치 | 기대 evidence 확인 | PASS | /ops/events status panel opened and refreshed; ops-events-after-records.png |
| EVT-017 | EVT | `/ops/events` Alert Delivery integration 저장 후 검색 필터, kind 필터, enabled 필터, empty filter, row fixture action, endpoint redaction을 390px/1180px에서 직접 클릭/타이핑 확인 | deliveries list/filter 표시 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_alert_delivery_filter_390`, `/private/tmp/media_server_alert_delivery_filter_1180` |
| EVT-018 | EVT | `/ops/events` Alert Delivery에서 integration 저장 후 `Fixture 전송` 클릭, `delivered · fixture`와 `[redacted-alert-target]` 확인 | `/ops/events` Alert Delivery에서 integration 저장 후 Fixture/test action을 클릭하면 최근 시도에 `delivered · fixture`가 표시되고 endpoint token은 redacted 상태로 유지 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_ui_goal_rZkl1F/browser/ops-events-alert-delivery-after-fixture.json`, `.media_server.ops_audit.jsonl` |
| EVT-019 | EVT | Rule Event Review Inbox showed 25 review rows after EventRecord generation | review inbox list 표시 | 기대 evidence 확인 | PASS | Rule Event Review Inbox showed 25 review rows after EventRecord generation |
| EVT-020 | EVT | `/ops/events` review row에서 status/classification/note controls 표시와 저장 후 row update 확인 | review detail/status 표시 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_ui_goal_rZkl1F/browser/ops-events-review-after-save-retry.json` |
| EVT-021 | EVT | review status를 `confirmed`, classification을 `true-positive`, note를 입력 저장하고 event review/audit JSONL 반영 확인 | status change 저장과 audit 반영 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_ui_goal_rZkl1F/registry/.media_server.event_reviews.jsonl`, `.media_server.ops_audit.jsonl` |
| EVT-022 | EVT | `/ops/sources`와 `/ops/rules` audit panel에서 query/action filter 적용, JSON/CSV/Diff JSON export control 표시, `/ops/api/audit` export endpoint 200 확인 | audit list/filter/export 표시 | 기대 evidence 확인 | PASS | `verify-ops-click-e2e` `sources:kind-matrix-health-wrapper`, `events:delivery-review-audit`, `/private/tmp/media_server_src_evt_verify4/browser` |
| EVT-023 | EVT | /ops/dashboard event/runtime summary opened and filter controls operated | event summary count/status 표시 | 기대 evidence 확인 | PASS | /ops/dashboard event/runtime summary opened and filter controls operated |
| EVT-024 | EVT | `/ops/dashboard` Runtime Ops summary가 active tap/rule/timeline/high-water/EventRecord 정보를 표시하고, 30분 predev soak가 fail=0으로 끝남 | runtime summary가 장시간 drift 없이 유지 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_runtime_dashboard_390`, `/private/tmp/media_server_runtime_dashboard_1180`, `/tmp/media_server_predev-1779703217-28197_summary.json` |
| EVT-025 | EVT | /ops/dashboard source/channel summary opened with seeded/new channel counts | source/channel summary count/status 표시 | 기대 evidence 확인 | PASS | /ops/dashboard source/channel summary opened with seeded/new channel counts |
| EVT-026 | EVT | active VA rule session 중 `/ops/dashboard` VA Quality badge가 tap/rule/timeline/issue summary를 표시하고 Runtime Ops list가 선택 tap/event summary를 표시함을 390px/1180px에서 확인 | VA status/tap/event summary 표시와 안정성 확인 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_runtime_dashboard_390`, `/private/tmp/media_server_runtime_dashboard_1180` |
| CLIENT-001 | CLIENT | viewer /client/live source tree showed assigned views only; login-viewer-client-live.png | assigned view만 source tree에 표시 | 기대 evidence 확인 | PASS | viewer /client/live source tree showed assigned views only; login-viewer-client-live.png |
| CLIENT-002 | CLIENT | `/client/live`에서 타일 1~4 재생 클릭, 4개 video readyState=4/paused=false/1280x720 및 runtime activeSessions=4 확인 | tile start 후 video/status/session 생성 확인 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_ui_goal_rZkl1F/browser/client-live-after-4play-plus60s.json`, `client-live-runtime-after-4play-plus60s.json` |
| CLIENT-005 | CLIENT | fresh auth 서버에서 viewer `/client/live` source node 클릭으로 tile session 생성, `연결 해제` 클릭 후 DELETE/오프라인/연결 끊김 확인, 같은 tile 재연결 session 생성, live session 유지 상태로 logout 후 admin `/lab/runtime/status` idle 확인 | stop/reconnect/logout 후 session cleanup 확인 | 기대 evidence 확인 | PASS | `./server.sh verify-ops-click-e2e --auth-ui-flow --auth-users-file /private/tmp/media_server_client005_verify3/users.json`, artifact dir `/private/tmp/media_server_client005_verify3/browser` |
| CLIENT-006 | CLIENT | auth-on viewer로 `/client/dashboard` 진입, 9001만 표시되고 9002/9003/9004/Ops/Lab/raw/debug 노출 없음 확인 | dashboard가 viewer scope 안의 data만 표시 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_iab_auth_VuKUEe/browser/viewer-client-dashboard.json` |
| CLIENT-007 | CLIENT | auth-on viewer로 `/client/events` 진입, 9001만 표시되고 9002/9003/9004/Ops/Lab/raw/debug 노출 없음 확인 | events가 viewer scope 안의 data만 표시 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_iab_auth_VuKUEe/browser/viewer-client-events.json` |
| CLIENT-009 | CLIENT | fresh auth fixture에서 viewer `/client/live` grid=`2x2`, density=`표준`, dock=`오른쪽` 선택 후 workspace 작업 메뉴 `레이아웃 저장` 클릭. UI status `사용자 저장값`, `/client/api/preferences/live-layout` userPreference 저장값, reload 후 grid/density/dock 복원 확인 | grid/density/dock preference 저장 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_auth022_N1aAmv/browser/client009-after-ui-save-click.json`, `client009-api-after-ui-save.json`, `client009-after-reload-restore.json`. 과거 `/private/tmp/media_server_iab_auth_VuKUEe/browser/viewer-client-prefs-after-save-click.json`의 `저장 실패`는 새 fixture에서 재현되지 않음 |
| CLIENT-010 | CLIENT | viewer preference를 API로 저장한 뒤 `/client/live` 로드에서 `2x2/표준/오른쪽` 확인, 이후 unsaved local change `1x2/고밀도/왼쪽` 후 reload에서 다시 `2x2/표준/오른쪽` 복원 확인 | reload 후 preference 복원 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_iab_auth_VuKUEe/browser/viewer-client-prefs-api-saved-loaded-in-ui.json`, `viewer-client-prefs-unsaved-local-change-before-reload.json`, `viewer-client-prefs-api-saved-after-reload.json` |
| CLIENT-011 | CLIENT | viewer `/client/live`, `/client/dashboard`, `/client/events`에서 assigned 9001만 보이고 unassigned 9002/9003/9004가 보이지 않음 확인 | unassigned view가 목록/API/UI에 보이지 않음 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_iab_auth_VuKUEe/browser/viewer-client-live.json`, `viewer-client-dashboard.json`, `viewer-client-events.json` |
| CLIENT-012 | CLIENT | viewer /client/live had no Ops navigation; role-guard-evidence.json | client shell에 Ops nav 없음 | 기대 evidence 확인 | PASS | viewer /client/live had no Ops navigation; role-guard-evidence.json |
| CLIENT-013 | CLIENT | viewer /client/live had no Lab navigation in body/route evidence | client shell에 Lab nav 없음 | 기대 evidence 확인 | PASS | viewer /client/live had no Lab navigation in body/route evidence |
| CLIENT-014 | CLIENT | client live/dashboard responsive leak scan found no raw JSON text | raw JSON/debug details가 client에 보이지 않음 | 기대 evidence 확인 | PASS | client live/dashboard responsive leak scan found no raw JSON text |
| CLIENT-015 | CLIENT | client live/dashboard responsive leak scan found no debugCounters text | debug counters가 client에 보이지 않음 | 기대 evidence 확인 | PASS | client live/dashboard responsive leak scan found no debugCounters text |
| CLIENT-016 | CLIENT | client live/dashboard responsive leak scan found no BBox diagnostics text | bbox diagnostics가 client에 보이지 않음 | 기대 evidence 확인 | PASS | client live/dashboard responsive leak scan found no BBox diagnostics text |
| CLIENT-017 | CLIENT | client live/dashboard did not expose rule/profile editor controls to viewer | editor controls가 client에 보이지 않음 | 기대 evidence 확인 | PASS | client live/dashboard did not expose rule/profile editor controls to viewer |
| CLIENT-018 | CLIENT | admin client preview state visible on /client/live and /client/dashboard | admin preview banner/state 표시 | 기대 evidence 확인 | PASS | admin client preview state visible on /client/live and /client/dashboard |
| CLIENT-019 | CLIENT | 4개 tile video가 각각 readyState=4, paused=false, 1280x720, client viewport 424x238로 재생됨 | video viewport가 재생되고 잘리지 않음 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_ui_goal_rZkl1F/browser/client-live-after-4play-plus60s.json/png` |
| CLIENT-020 | CLIENT | client live play/stop controls clicked; client-live-evidence.json | start/stop/reconnect/control 조작 확인 | 기대 evidence 확인 | PASS | client live play/stop controls clicked; client-live-evidence.json |
| CLIENT-021 | CLIENT | auth-on viewer `/client/live`에서 타일 1 재생 후 `원본` -> `VA` 모드 토글, video readyState=4/1280x720, 온라인/연결됨/메타데이터 정상 상태 확인 | overlay toggle/status/metadata 일치 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_iab_auth_VuKUEe/browser/viewer-client-live-overlay-after-play-plus12s.json`, `viewer-client-live-overlay-after-original-toggle.json`, `viewer-client-live-overlay-after-va-toggle.json` |
| CLIENT-022 | CLIENT | client live status/caption text visible without forbidden leak; client-live-interactions.png | caption/status가 viewport를 가리지 않고 표시 | 기대 evidence 확인 | PASS | client live status/caption text visible without forbidden leak; client-live-interactions.png |
| MEDIA-016 | MEDIA | 타일 1 `sample_h264.mp4` 기반 `UI Fulltest Playback` 재생, video 1280x720 확인 | sample 영상 표시. 단, 모든 VA 이벤트 검증으로 쓰지 않음 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_ui_goal_rZkl1F/browser/client-live-after-4play-plus60s.json` |
| MEDIA-017 | MEDIA | 타일 1~4 동시 재생, runtime activeSessions=4/resourceActiveStreams=2/activeAnalysisTaps=2 확인 | 여러 tile/channel 동시 재생과 layout 안정성 확인 | 기대 evidence 확인 | PASS | `/private/tmp/media_server_ui_goal_rZkl1F/browser/client-live-after-4play-plus60s.json`, `client-live-runtime-after-4play-plus60s.json` |
| SAFE-015 | SAFE | ops/client route evidence did not show lab editor embedded in product screen | ops/client 제품 화면에 lab editor가 없음 | 기대 evidence 확인 | PASS | ops/client route evidence did not show lab editor embedded in product screen |
| SAFE-016 | SAFE | CDP browser로 `/not-a-product-route-404-check` 렌더링, curl HTTP 404 확인 | 정의하지 않은 route가 404 처리됨 | `not found`, product shell/route marker 없음 | PASS | `undefined-route.png` |
| SAFE-017 | SAFE | CDP browser로 `/lab`, `/lab/rules`, `/lab/import`, `/webrtc/test` 렌더링, curl HTTP 404 확인 | `/lab` 구 UI route가 제품 UI로 열리지 않음 | 모두 `not found`, product shell/route marker 없음 | PASS | `legacy-lab-root.png`, `legacy-lab-rules.png`, `legacy-lab-import.png`, `legacy-webrtc-test.png` |
| SAFE-018 | SAFE | viewer/client leak checks passed for debug/source/raw tokens | client 화면/API에 debug/source/raw 정보 없음 | 기대 evidence 확인 | PASS | viewer/client leak checks passed for debug/source/raw tokens |
| SAFE-019 | SAFE | screenshots/results omit plaintext password, tokenHash, passwordHash; temp password file removed | password/token/session material이 artifact/UI/API에 없음 | 기대 evidence 확인 | PASS | screenshots/results omit plaintext password, tokenHash, passwordHash; temp password file removed |
| SAFE-020 | SAFE | admin/operator/viewer route/nav separation confirmed by role-guard-evidence.json | ops/client nav, route, action guard가 role별로 분리 | 기대 evidence 확인 | PASS | admin/operator/viewer route/nav separation confirmed by role-guard-evidence.json |

## 확인됨

- 실제 브라우저로 `/setup`, `/login`, `/ops/home`, `/ops/dashboard`, `/ops/sources`, `/ops/rules`, `/ops/users`, `/ops/events`, `/client/live`, `/client/dashboard`를 열고 조작함.
- 사용자 수동 클릭 없이 진행함.
- source create 첫 시도 `duplicate source` 실패 후 non-duplicate file로 재검수 PASS.
- VA EventRecord는 `/ops/events` UI scope/history coverage 390px/1180px에서 seed registry 12개 event/scenario rule별 발생 이력 대조 PASS.
- 30분 predev soak는 후속 재검증에서 PASS. 이 결과는 UI 풀테스트 PASS를 대체하지 않음.

## 실패

| 화면 | 재현 조작 | 기대 결과 | 실제 결과 | 로그/스크린샷 | 영향 범위 | 재검수 |
| --- | --- | --- | --- | --- | --- | --- |
| `/ops/sources` | sample_h264.mp4 file source 생성 | 기존 source와 충돌 시 validation 표시 | `duplicate source` 표시 | `ops-sources-created-file-channel.png` | validation 정상, 첫 생성 시도 실패 | imports/NewYorkDriving.mp4로 재시도 PASS |
| VA verifier | `verify-va-events --dispatch-records` | queue drain + all required EventRecords | 최초 queue drain timeout 후 verifier dispatch cadence/fail-fast 수정, fresh registry/storage 기본값 재검증 PASS. 이후 `/ops/events` UI scope/history coverage 390px/1180px PASS | command output, `event-records-sample.json`, `/tmp/media_server_vaevt-1779699325-92204_event_records.json`, `/private/tmp/media_server_event_records_scope_history_390`, `/private/tmp/media_server_event_records_scope_history_1180` | verifier queue blocker와 UI EventRecord 대조 해소 | 완료 |
| 안정화 실행조건 | auth env/server/auth mode/EventRecord storage 조건이 맞아야 verifier 실행 가능 | 조건 미충족 시 제품 회귀로 단정하지 않고 같은 단계에서 조건 보정 후 재검증 | auth env missing, 서버 미기동, auth mismatch, storage disabled가 각각 최초 실패로 발생. 조건 보정 후 해당 명령 재검증 PASS | command output, `/tmp/media_server_predev-1779703217-28197_summary.json` | 실행조건 실패와 UI 대상 FAIL 행 모두 해소 | 완료 |
| 기능별 UI 풀테스트 | 기능별 결과표 220개 행 전수 | 모든 행 PASS | 220 PASS / 0 FAIL | 이 문서 기능별 표 | 전체 UI 풀테스트 PASS | 완료 |

## 제외 기록

| 항목 | 제외 이유 | 후속 확인 조건 |
| --- | --- | --- |
| 없음 | - | - |

## 최종 판정

- UI 풀테스트 최종 결론: PASS
- PASS 조건: 개별 기능 실패 행 0개, 현재 기능별 결과표 실패 행 0개
- 제품 회귀 여부: client live layout preference 저장 실패는 fresh auth fixture에서 재현되지 않았고 `CLIENT-009`는 PASS로 재분류됨. live session logout cleanup 누수는 `CLIENT-005`에서 재현 후 수정/재검증 PASS. rule/scenario EventRecord 개별 발생 이력과 `/ops/events`의 rule/scenario별 최종 EventRecord 대조는 `event-history-coverage.json` 390px/1180px에서 PASS.
- 환경/sandbox 한계: local loopback은 일부 명령에서 sandbox 바깥 실행 필요.
- release gate: main publish 전 브랜치 검증은 `verify-release-metadata --allow-unpublished` 기준 PASS 15/0. published-release 모드는 GitHub latest `v1.7.0`, remote/local `v1.8.0` tag 없음으로 FAIL이며, main/tag/release close-out 단계에서 다시 실행한다.
- 커밋: UI 풀테스트 close-out 변경 3개 커밋 완료 (`114968b`, `a39e9cb`, `e581ed9`)
- 푸시 가능: 예, 브랜치 기준
- 이유: 브랜치 push 기준 release-prep gate PASS, UI 풀테스트 PASS. published-release tag gate는 main close-out 범위.
- 푸시 수행 여부: `origin/v1.8.0` push 완료. main merge, release tag, GitHub Release 생성은 수행하지 않음.

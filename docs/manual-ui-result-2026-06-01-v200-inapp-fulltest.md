# Manual UI Result - v2.0.0 Branch In-App Fulltest 2026-06-01

## 검수 메타데이터

- run id: v200-inapp-ui-fulltest-20260601
- 검수자: Codex in-app browser primary evidence + verifier support
- 날짜/시간: 2026-05-31T17:05:03.481Z
- test target branch: `v2.0.0`
- source VERSION/release baseline: `v1.9.0`
- 브랜치/커밋: v2.0.0, 시작 기준 061601e
- 브라우저: Codex 인앱 브라우저 primary. 인앱 모드가 없는 legacy verifier는 Chrome fallback 예외를 명시하고 보조 evidence로만 사용
- viewport: 320, 390, 760, 1180 x 900
- theme: light, dark
- evidence index: /private/tmp/media_server_v200_iab_ui_fulltest_20260601
- feature inventory revision: docs/project-feature-test-inventory.md, current worktree
- token usage source: Codex goal usage snapshot
- token start: 492353
- token end: 1404241
- token consumed: 911888
- elapsed: UI step goal snapshot delta, after 30분 step through UI evidence close-out
- 최종 결론: PASS

## 테스트 영역별 판정

| 영역 | 실행 범위 | evidence | 기록 |
| --- | --- | --- | --- |
| 안정화 테스트 | 인앱 정책 변경 후 build/static/auth/API/media verifier 묶음 재실행 | `/private/tmp/media_server_v200_inapp_stability_*.log`, `.media_server.test/20260601-000215` | PASS. UI 풀테스트를 대체하지 않음 |
| 30분 테스트 | `verify-predev --soak-minutes 30` 재실행 | `/private/tmp/media_server_v200_inapp_30min_20260601_summary.json` | PASS. UI 풀테스트를 대체하지 않음 |
| 120분 테스트 | UI 풀테스트 당시 실행하지 않음. 후속 `/goal 120분 테스트`에서 별도 실행 | `/private/tmp/media_server_v200_120min_20260601_retry2_summary.json` | 후속 PASS. UI 풀테스트 PASS를 대체하지 않음 |
| UI 풀테스트 | 238개 UI 대상 기능 ID 중 238 PASS, 0 FAIL | 인앱 브라우저 route/action evidence, one-shot wrapper PASS, EventRecord history coverage | 최종 PASS |

## 현재 보존 증적

| 증적 | 경로 | 확인 |
| --- | --- | --- |
| In-app browser route/action evidence | `/private/tmp/media_server_v200_iab_ui_fulltest_20260601/in-app-browser-ui-evidence.json` | exists |
| In-app smoke interaction evidence | `/private/tmp/media_server_v200_iab_ui_fulltest_20260601/in-app-smoke-interactions.json` | exists |
| In-app/static route boundary evidence | `/private/tmp/media_server_v200_iab_ui_fulltest_20260601/boundary-routes.json` | exists |
| UI one-shot summary | `/private/tmp/media_server_v200_ui_one_shot_20260601_retry2/summary.json` | exists |
| Core click E2E summary | `/private/tmp/media_server_v200_ui_one_shot_20260601_retry2/ops-click-core/ops-click-e2e-summary.json` | exists |
| Auth click E2E summary | `/private/tmp/media_server_v200_ui_one_shot_20260601_retry2/ops-click-auth/ops-click-e2e-summary.json` | exists |
| Event history coverage 390 | `/private/tmp/media_server_v200_ui_event_records_history_scope_390_20260601/event-history-coverage.json` | exists |
| Event history coverage 1180 | `/private/tmp/media_server_v200_ui_event_records_history_scope_1180_20260601/event-history-coverage.json` | exists |
| EventRecord dispatch log | `/private/tmp/media_server_v200_ui_event_records_dispatch_records_only_20260601.log` | exists |

## 스크립트 테스트 기록

- `./server.sh verify-ui-fulltest-one-shot --skip-build --browser-mode chrome --allow-chrome-fallback --in-app-evidence /private/tmp/media_server_v200_iab_ui_fulltest_20260601/in-app-browser-ui-evidence.json --skip-manual-result`: PASS. ops/client smoke와 screenshots는 인앱 evidence를 사용했고, click E2E는 Chrome fallback 예외 보조 evidence로 실행.
- `./server.sh verify-ops-event-records-scope --event-history-dir /private/tmp/media_server_v200_ui_event_history_20260601` 390px/1180px: PASS. EventRecord UI control, evidence bundle, seeded history coverage 확인.
- `./server.sh verify-va-events --dispatch-records --duration 45`: records-only EventRecord dispatch PASS, stored=2553 failed=0 dropped=0.
- `./server.sh verify-manual-ui-evidence --result docs/manual-ui-result-2026-06-01-v200-inapp-fulltest.md`: 이 문서 생성 후 실행 대상.

## UI 풀테스트 기록

- 브라우저: Codex 인앱 브라우저 primary, user manual click 없음
- 직접 확인한 route: `/`, `/setup`, `/login`, `/password/change`, `/invite/setup`, `/ops/home`, `/ops/dashboard`, `/ops/sources`, `/ops/rules`, `/ops/users`, `/ops/events`, `/ops/vlm`, `/client/live`, `/client/dashboard`, `/client/events`, `/client/request-access`
- 직접 조작 범위: setup/login/logout, password change, invite setup, public access request, user lifecycle/scope/reset/disable/restore, role guard, dashboard refresh/filter/log-tail, source/rule/user/event/client controls, VLM dry-run/profile details, EventRecord evidence controls, responsive/theme
- 반응형/테마 범위: 320, 390, 760, 1180 width sweep, dark theme `/ops/home`, `/ops/events` 320px overflow fix 후 재검수
- 시각 품질 확인: 인앱 screenshot evidence와 overflow/leak checks 기준으로 horizontal overflow 0, client redaction PASS
- 제외 기록: UI 풀테스트 당시 120분 longrun, 실제 cloud provider 호출, credential 저장, external TURN field gate. 120분 predev longrun은 후속 `v200-inapp-policy-120min-20260601`에서 별도 PASS로 기록

## 확인됨

| ID | 기능 | UI 필요 | 테스트 필요 | 영역 | 판정 | evidence |
| --- | --- | --- | --- | --- | --- | --- |
| AUTH-004 | auth mode `session` | 간접 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| AUTH-005 | users file 없음 또는 admin passwordHash 없음 시 setup 유도 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| AUTH-006 | 기본 admin username `admin` | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| AUTH-007 | passwordless admin login 금지 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| AUTH-012 | passwordHash API/UI 비노출 | 비대상 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| AUTH-013 | passwordHistory API/UI 비노출 | 비대상 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| AUTH-014 | tokenHash API/UI 비노출 | 비대상 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| AUTH-015 | invite tokenHash API/UI 비노출 | 비대상 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| AUTH-016 | session cookie 로그인 | 간접 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| AUTH-018 | 사용자 생성 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| AUTH-019 | 사용자 수정 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| AUTH-020 | 사용자 삭제 또는 비활성화 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| AUTH-021 | 사용자 활성화 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| AUTH-022 | 사용자 비밀번호 초기화 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| AUTH-023 | 마지막 admin 비활성화 방지 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| AUTH-024 | role: admin | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| AUTH-025 | role: operator | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| AUTH-026 | role: viewer | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| AUTH-027 | role: integrator | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| AUTH-028 | scope: ops 읽기 | 간접 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| AUTH-029 | scope: ops 쓰기 | 간접 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| AUTH-030 | scope: client/view 접근 | 간접 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| AUTH-033 | 초대 생성 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| AUTH-034 | 초대 수락 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| AUTH-035 | 초대 만료/무효 처리 | 간접 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| AUTH-036 | client 접근 요청 생성 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| AUTH-037 | client 접근 요청 승인 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| AUTH-038 | client 접근 요청 거절 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| AUTH-039 | 승인 전 client self-signup scope 미부여 | 간접 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| AUTH-040 | route guard | 간접 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| CLIENT-001 | viewer live view 목록 조회 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| CLIENT-002 | viewer live WebRTC session 생성 | 필요 | 필요 | 안정화, UI, 30분 | PASS | in-app browser evidence 및 one-shot verifier evidence |
| CLIENT-005 | viewer live session 종료 | 필요 | 필요 | 안정화, UI, 30분 | PASS | in-app browser evidence 및 one-shot verifier evidence |
| CLIENT-006 | viewer dashboard 조회 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| CLIENT-007 | viewer events 조회 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| CLIENT-009 | live layout preference 저장 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| CLIENT-010 | live layout preference 조회 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| CLIENT-011 | viewer 권한 없는 view 숨김 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| CLIENT-012 | viewer에게 Ops navigation 숨김 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| CLIENT-013 | viewer에게 Lab navigation 숨김 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| CLIENT-014 | viewer에게 raw JSON 비노출 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| CLIENT-015 | viewer에게 debugCounters 비노출 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| CLIENT-016 | viewer에게 BBox diagnostics 비노출 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| CLIENT-017 | viewer에게 rule/profile editor 비노출 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| CLIENT-018 | admin client preview 표시 | 필요 | 필요 | UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| CLIENT-019 | video viewport 표시 | 필요 | 필요 | UI, 30분 | PASS | in-app browser evidence 및 one-shot verifier evidence |
| CLIENT-020 | video control 표시 | 필요 | 필요 | UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| CLIENT-021 | VA overlay 표시 | 필요 | 필요 | 안정화, UI, 30분 | PASS | in-app browser evidence 및 one-shot verifier evidence |
| CLIENT-022 | status/caption 표시 | 필요 | 필요 | UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| EVT-001 | ops runtime status 조회 | 필요 | 필요 | 안정화, UI, 30분 | PASS | in-app browser evidence 및 one-shot verifier evidence |
| EVT-003 | ops source health 표시 | 필요 | 필요 | 안정화, UI, 30분 | PASS | in-app browser evidence 및 one-shot verifier evidence |
| EVT-004 | ops diagnostics log tail | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| EVT-007 | event records 조회 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| EVT-016 | ops events status | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| EVT-017 | alert deliveries 조회 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| EVT-018 | alert delivery test | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| EVT-019 | event review 목록 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| EVT-020 | event review 상세 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| EVT-021 | event review 상태 변경 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| EVT-022 | audit log 조회 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| EVT-023 | dashboard event 요약 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| EVT-024 | dashboard runtime 요약 | 필요 | 필요 | 안정화, UI, 30분 | PASS | in-app browser evidence 및 one-shot verifier evidence |
| EVT-025 | dashboard source/channel 요약 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| EVT-026 | dashboard VA 상태 요약 | 필요 | 필요 | 안정화, UI, 30분 | PASS | in-app browser evidence 및 one-shot verifier evidence |
| EVT-028 | VLM Ops event review evidence panel | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| EVT-030 | VLMObservation sidecar correlation state | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| EVT-031 | VLM explanation/hint review state | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| MEDIA-016 | H.264 sample playback | 필요 | 필요 | 안정화, UI, 30분 | PASS | in-app browser evidence 및 one-shot verifier evidence |
| MEDIA-017 | multi-channel playback | 필요 | 필요 | 안정화, UI, 30분 | PASS | in-app browser evidence 및 one-shot verifier evidence |
| RULE-001 | `/ops/rules` VA rule/channel analysis setting 목록 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-002 | `/ops/rules` event template 목록 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-003 | `/ops/rules` analysis profile 목록 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-004 | channel analysis setting 생성 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-005 | channel analysis setting 수정 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-006 | channel analysis setting 삭제 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-007 | channel analysis setting 상세 보기 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-008 | channel analysis setting apply/active 상태 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-009 | channel analysis setting source 선택 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-010 | channel analysis setting event template 연결 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-011 | channel analysis setting analysis profile 연결 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-012 | channel analysis setting region geometry 설정 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-013 | channel analysis setting line geometry 설정 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-014 | channel analysis setting output URL 표시 | 필요 | 필요 | UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-015 | channel analysis setting status 표시 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-016 | vaRule numeric id 자동 생성 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-017 | vaRule id 직접 입력 방지 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-018 | event template 생성 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-019 | event template 수정 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-020 | event template 삭제 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-021 | event template 상세 보기 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-022 | analysis profile 생성 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-023 | analysis profile 수정 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-024 | analysis profile 삭제 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-025 | analysis profile 상세 보기 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-026 | detector: YOLO/ONNX | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-027 | detector: dummy | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-028 | profile FPS 설정 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-029 | profile queue 설정 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-030 | profile confidence 설정 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-031 | profile NMS 설정 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-032 | profile input size 설정 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-033 | profile tracking category 표시 | 필요 | 필요 | UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-034 | tracker `none` | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-035 | tracker `lite` | 필요 | 필요 | 안정화, UI, 30분 | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-036 | tracker `kalman-lite` | 필요 | 필요 | 안정화, UI, 30분 | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-037 | tracker `bytetrack` | 필요 | 필요 | 안정화, UI, 30분 | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-038 | Re-ID `off` | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-039 | Re-ID `assist` | 필요 | 필요 | 안정화, UI, 30분 | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-040 | `tracker=none`이면 Re-ID off 강제 또는 거부 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-041 | basic event: presence | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-042 | basic event: enter | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-043 | basic event: exit | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-044 | basic event: line-crossing | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-045 | line direction: any | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-046 | line direction: forward | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-047 | line direction: reverse | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-048 | scenario: intrusion-dwell | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-049 | scenario: re-entry | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-050 | scenario: wrong-direction | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-051 | scenario: intrusion-after-line-crossing | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-052 | scenario: loitering | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-053 | scenario: zone-occupancy | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-054 | scenario preset: default | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-055 | scenario preset: road | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-056 | scenario preset: retail | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-057 | scenario preset: park | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-058 | scenario preset: indoor | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-059 | scenario preset: lobby | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-060 | scenario preset: platform | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-061 | scenario preset: entrance | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-062 | scenario preset: doorway | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-063 | scenario preset: parking | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-064 | scenario preset: elevator | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-065 | scenario preset: custom | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-066 | intrusion-dwell zone 설정 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-067 | intrusion-dwell candidate time 설정 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-068 | intrusion-dwell dwell time 설정 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-069 | intrusion-dwell cooldown 설정 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-070 | re-entry polygon zone 설정 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-071 | re-entry window 설정 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-072 | re-entry cooldown 설정 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-073 | wrong-direction line geometry 설정 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-074 | wrong-direction allowed direction 설정 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-075 | wrong-direction cooldown 설정 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-076 | intrusion-after-line-crossing trigger line 설정 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-077 | intrusion-after-line-crossing crossing direction 설정 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-078 | intrusion-after-line-crossing target zone 설정 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-079 | intrusion-after-line-crossing max delay 설정 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-080 | intrusion-after-line-crossing dwell 설정 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-081 | intrusion-after-line-crossing cooldown 설정 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-082 | loitering target zone 설정 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-083 | loitering min dwell 설정 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-084 | loitering movement radius 설정 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-085 | loitering trajectory points 설정 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-086 | loitering cooldown 설정 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-087 | loitering ground-plane 옵션 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-088 | zone-occupancy target zone 설정 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-089 | zone-occupancy threshold 설정 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-090 | zone-occupancy min dwell 설정 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-091 | zone-occupancy cooldown 설정 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-092 | duplicate id 검증 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-093 | missing template/profile 검증 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-094 | inactive template/profile 검증 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-095 | source mismatch 검증 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-096 | inactive channel/View 검증 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-097 | client view 권한 없음 검증 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-098 | va-rule not allowed 검증 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-099 | existing connection allowed rule 검증 | 간접 | 필요 | 안정화, 30분 | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-100 | same channel/priority conflict 검증 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| RULE-101 | class mismatch 검증 | 필요 | 필요 | 안정화, UI | PASS | one-shot rule-ui/ops-rules-roundtrip/click E2E 및 seed matrix evidence |
| SAFE-015 | lab 개발 UI 제품 화면 embed 금지 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| SAFE-016 | undefined route 404 처리 | 간접 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| SAFE-017 | 구 `/lab` 제품 UI route 404 처리 | 간접 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| SAFE-018 | client/viewer debug 정보 비노출 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| SAFE-019 | auth material 비노출 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| SAFE-020 | 운영 UI와 client UI 권한 경계 분리 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| SAFE-021 | UI blocking dialog policy | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| SAFE-024 | VLM Privacy/전송 guard | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| SAFE-028 | VLM prompt/raw response/credential/source redaction | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| SAFE-031 | VLM viewer/client 비노출 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| SAFE-033 | VLM Ops-only debug details boundary | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| SRC-001 | file source 등록 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| SRC-002 | RTSP pull source 등록 | 필요 | 필요 | 안정화, UI, 30분 | PASS | in-app browser evidence 및 one-shot verifier evidence |
| SRC-003 | HTTP/HLS URI source 등록 | 필요 | 필요 | 안정화, UI, 30분 | PASS | in-app browser evidence 및 one-shot verifier evidence |
| SRC-004 | external WHEP playback URL source 등록 | 필요 | 필요 | 안정화, UI, 30분 | PASS | in-app browser evidence 및 one-shot verifier evidence |
| SRC-005 | internal WHIP published source 등록 | 필요 | 필요 | 안정화, UI, 30분 | PASS | in-app browser evidence 및 one-shot verifier evidence |
| SRC-006 | source 목록 조회 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| SRC-007 | source 상세 조회 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| SRC-008 | source 생성 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| SRC-009 | source 수정 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| SRC-010 | source 삭제 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| SRC-011 | source 활성/비활성 상태 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| SRC-012 | source health 조회 | 필요 | 필요 | 안정화, UI, 30분 | PASS | in-app browser evidence 및 one-shot verifier evidence |
| SRC-014 | ONVIF import draft | 필요 | 필요 | 안정화, UI, 필드 별도 | PASS | in-app browser evidence 및 one-shot verifier evidence |
| SRC-016 | PublishedView 목록 조회 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| SRC-017 | PublishedView 생성 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| SRC-018 | PublishedView 수정 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| SRC-019 | PublishedView 삭제 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| SRC-020 | PublishedView 활성/비활성 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| SRC-021 | View별 source 연결 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| SRC-022 | View별 allowed rule list | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| SRC-023 | View별 viewer 접근 범위 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| SRC-024 | View별 WebRTC client wrapper | 간접 | 필요 | 안정화, UI, 30분 | PASS | in-app browser evidence 및 one-shot verifier evidence |
| SRC-025 | View별 dashboard | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| SRC-026 | View별 events | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| SRC-028 | Client preview as admin 표시 | 필요 | 필요 | UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| SRC-029 | viewer에게 source URL 비노출 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| SRC-030 | viewer에게 developer URL 비노출 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| UI-001 | `/` 진입 후 제품 시작 route로 이동 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| UI-002 | `/setup` 최초 관리자 설정 화면 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| UI-003 | `/login` 로그인 화면 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| UI-004 | `/password/change` 비밀번호 변경 화면 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| UI-005 | `/logout` 세션 종료 | 간접 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| UI-007 | `/invite/setup` 초대 기반 계정 설정 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| UI-008 | `/client/request-access` 시청자 접근 요청 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| UI-009 | `/ops/home` 운영 Home | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| UI-010 | `/ops/dashboard` 운영 Dashboard | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| UI-011 | `/ops/sources` 채널 / 소스 관리 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| UI-012 | `/ops/rules` VA 룰 / 프로파일 / 이벤트 템플릿 관리 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| UI-013 | `/ops/users` 사용자 관리 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| UI-014 | `/ops/events` 이벤트 진단 route | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| UI-015 | `/client/live` 시청자 Live | 필요 | 필요 | 안정화, UI, 30분 | PASS | in-app browser evidence 및 one-shot verifier evidence |
| UI-016 | `/client/dashboard` 시청자 Dashboard | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| UI-017 | `/client/events` 시청자 이벤트 route | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| UI-018 | `/lab`, `/lab/rules`, `/lab/import`, `/webrtc/test` 제품 UI 미제공 / 404 | 비대상 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| UI-019 | light/dark theme-aware 공통 UI | 필요 | 필요 | UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| UI-020 | desktop 반응형 화면 | 필요 | 필요 | UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| UI-021 | mobile 반응형 화면 | 필요 | 필요 | UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| UI-022 | `/ops/vlm` VLM 설치/연결 준비 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| UI-023 | `/ops/vlm` VLM profile 저장 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| UI-024 | `/ops/vlm` VLM Privacy/전송 guard | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| UI-025 | `/ops/vlm` PC capability/recommendation 요약 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| UI-026 | `/ops/vlm` local model dry-run 후보 선택 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| UI-027 | `/ops/vlm` cloud connection dry-run 후보 선택 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| UI-028 | `/ops/vlm` profile 활성화/fallback/disable control | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| UI-029 | `/ops/vlm` profile 삭제 action | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| UI-030 | `/ops/vlm` evaluation/prompt profile 표시 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| UI-031 | `/ops/vlm` raw details 접힘 영역 | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |
| UI-032 | `/ops/events` VLM review detail control | 필요 | 필요 | 안정화, UI | PASS | in-app browser evidence 및 one-shot verifier evidence |

## VA Seed / 최종 룰 상태

- seed dry-run: PASS
- seed plan/report: `/private/tmp/media_server_v200_ui_one_shot_20260601_retry2/core-seed-plan.json`
- seed registry dir: `/private/tmp/media_server_v200_ui_one_shot_20260601_retry2/core-registry`
- data storage: throwaway registry and EventRecord fixture paths under `/private/tmp`

| 개별 항목 | 기대 상태 | 실제 상태 | 판정 |
| --- | --- | --- | --- |
| account: admin | current seed matrix row populated | one-shot seed/rule/event history evidence 확인 | PASS |
| account: operator | current seed matrix row populated | one-shot seed/rule/event history evidence 확인 | PASS |
| account: viewer | current seed matrix row populated | one-shot seed/rule/event history evidence 확인 | PASS |
| account: integrator | current seed matrix row populated | one-shot seed/rule/event history evidence 확인 | PASS |
| profile: tracker `bytetrack` + Re-ID `assist` | current seed matrix row populated | one-shot seed/rule/event history evidence 확인 | PASS |
| profile: tracker `bytetrack` + Re-ID `off` | current seed matrix row populated | one-shot seed/rule/event history evidence 확인 | PASS |
| profile: tracker `kalman-lite` + Re-ID `assist` | current seed matrix row populated | one-shot seed/rule/event history evidence 확인 | PASS |
| profile: tracker `kalman-lite` + Re-ID `off` | current seed matrix row populated | one-shot seed/rule/event history evidence 확인 | PASS |
| profile: tracker `lite` + Re-ID `assist` | current seed matrix row populated | one-shot seed/rule/event history evidence 확인 | PASS |
| profile: tracker `lite` + Re-ID `off` | current seed matrix row populated | one-shot seed/rule/event history evidence 확인 | PASS |
| profile: tracker `none` + Re-ID `off` | current seed matrix row populated | one-shot seed/rule/event history evidence 확인 | PASS |
| invalid policy: tracker `none` + Re-ID `assist` | current seed matrix row populated | one-shot seed/rule/event history evidence 확인 | PASS |
| event template: presence | current seed matrix row populated | one-shot seed/rule/event history evidence 확인 | PASS |
| event template: enter | current seed matrix row populated | one-shot seed/rule/event history evidence 확인 | PASS |
| event template: exit | current seed matrix row populated | one-shot seed/rule/event history evidence 확인 | PASS |
| event template: line-crossing any | current seed matrix row populated | one-shot seed/rule/event history evidence 확인 | PASS |
| event template: line-crossing forward | current seed matrix row populated | one-shot seed/rule/event history evidence 확인 | PASS |
| event template: line-crossing reverse | current seed matrix row populated | one-shot seed/rule/event history evidence 확인 | PASS |
| event template: intrusion-dwell | current seed matrix row populated | one-shot seed/rule/event history evidence 확인 | PASS |
| event template: re-entry | current seed matrix row populated | one-shot seed/rule/event history evidence 확인 | PASS |
| event template: wrong-direction | current seed matrix row populated | one-shot seed/rule/event history evidence 확인 | PASS |
| event template: intrusion-after-line-crossing | current seed matrix row populated | one-shot seed/rule/event history evidence 확인 | PASS |
| event template: loitering | current seed matrix row populated | one-shot seed/rule/event history evidence 확인 | PASS |
| event template: zone-occupancy | current seed matrix row populated | one-shot seed/rule/event history evidence 확인 | PASS |
| scenario preset: default | current seed matrix row populated | one-shot seed/rule/event history evidence 확인 | PASS |
| scenario preset: road | current seed matrix row populated | one-shot seed/rule/event history evidence 확인 | PASS |
| scenario preset: retail | current seed matrix row populated | one-shot seed/rule/event history evidence 확인 | PASS |
| scenario preset: park | current seed matrix row populated | one-shot seed/rule/event history evidence 확인 | PASS |
| scenario preset: indoor | current seed matrix row populated | one-shot seed/rule/event history evidence 확인 | PASS |
| scenario preset: lobby | current seed matrix row populated | one-shot seed/rule/event history evidence 확인 | PASS |
| scenario preset: platform | current seed matrix row populated | one-shot seed/rule/event history evidence 확인 | PASS |
| scenario preset: entrance | current seed matrix row populated | one-shot seed/rule/event history evidence 확인 | PASS |
| scenario preset: doorway | current seed matrix row populated | one-shot seed/rule/event history evidence 확인 | PASS |
| scenario preset: parking | current seed matrix row populated | one-shot seed/rule/event history evidence 확인 | PASS |
| scenario preset: elevator | current seed matrix row populated | one-shot seed/rule/event history evidence 확인 | PASS |
| scenario preset: custom | current seed matrix row populated | one-shot seed/rule/event history evidence 확인 | PASS |
| vaRule: presence | current seed matrix row populated | one-shot seed/rule/event history evidence 확인 | PASS |
| vaRule: enter | current seed matrix row populated | one-shot seed/rule/event history evidence 확인 | PASS |
| vaRule: exit | current seed matrix row populated | one-shot seed/rule/event history evidence 확인 | PASS |
| vaRule: line-crossing any | current seed matrix row populated | one-shot seed/rule/event history evidence 확인 | PASS |
| vaRule: line-crossing forward | current seed matrix row populated | one-shot seed/rule/event history evidence 확인 | PASS |
| vaRule: line-crossing reverse | current seed matrix row populated | one-shot seed/rule/event history evidence 확인 | PASS |
| vaRule: intrusion-dwell | current seed matrix row populated | one-shot seed/rule/event history evidence 확인 | PASS |
| vaRule: re-entry | current seed matrix row populated | one-shot seed/rule/event history evidence 확인 | PASS |
| vaRule: wrong-direction | current seed matrix row populated | one-shot seed/rule/event history evidence 확인 | PASS |
| vaRule: intrusion-after-line-crossing | current seed matrix row populated | one-shot seed/rule/event history evidence 확인 | PASS |
| vaRule: loitering | current seed matrix row populated | one-shot seed/rule/event history evidence 확인 | PASS |
| vaRule: zone-occupancy | current seed matrix row populated | one-shot seed/rule/event history evidence 확인 | PASS |

## VA Event Occurrence Coverage

| event key | UI evidence | record evidence | UI rows | JSON records | sample | verdict |
| --- | --- | --- | --- | --- | --- | --- |
| `presence` | ops-events 390/1180 EventRecord UI history coverage | /private/tmp/media_server_v200_ui_event_history_20260601/events/va_events.jsonl | yes | 1 | v200-ui-history-1 | PASS |
| `enter` | ops-events 390/1180 EventRecord UI history coverage | /private/tmp/media_server_v200_ui_event_history_20260601/events/va_events.jsonl | yes | 1 | v200-ui-history-2 | PASS |
| `exit` | ops-events 390/1180 EventRecord UI history coverage | /private/tmp/media_server_v200_ui_event_history_20260601/events/va_events.jsonl | yes | 1 | v200-ui-history-3 | PASS |
| `line-crossing:any` | ops-events 390/1180 EventRecord UI history coverage | /private/tmp/media_server_v200_ui_event_history_20260601/events/va_events.jsonl | yes | 1 | v200-ui-history-4 | PASS |
| `line-crossing:forward` | ops-events 390/1180 EventRecord UI history coverage | /private/tmp/media_server_v200_ui_event_history_20260601/events/va_events.jsonl | yes | 1 | v200-ui-history-5 | PASS |
| `line-crossing:reverse` | ops-events 390/1180 EventRecord UI history coverage | /private/tmp/media_server_v200_ui_event_history_20260601/events/va_events.jsonl | yes | 1 | v200-ui-history-6 | PASS |
| `intrusion-dwell` | ops-events 390/1180 EventRecord UI history coverage | /private/tmp/media_server_v200_ui_event_history_20260601/events/va_events.jsonl | yes | 1 | v200-ui-history-7 | PASS |
| `re-entry` | ops-events 390/1180 EventRecord UI history coverage | /private/tmp/media_server_v200_ui_event_history_20260601/events/va_events.jsonl | yes | 1 | v200-ui-history-8 | PASS |
| `wrong-direction` | ops-events 390/1180 EventRecord UI history coverage | /private/tmp/media_server_v200_ui_event_history_20260601/events/va_events.jsonl | yes | 1 | v200-ui-history-9 | PASS |
| `intrusion-after-line-crossing` | ops-events 390/1180 EventRecord UI history coverage | /private/tmp/media_server_v200_ui_event_history_20260601/events/va_events.jsonl | yes | 1 | v200-ui-history-10 | PASS |
| `loitering` | ops-events 390/1180 EventRecord UI history coverage | /private/tmp/media_server_v200_ui_event_history_20260601/events/va_events.jsonl | yes | 1 | v200-ui-history-11 | PASS |
| `zone-occupancy` | ops-events 390/1180 EventRecord UI history coverage | /private/tmp/media_server_v200_ui_event_history_20260601/events/va_events.jsonl | yes | 1 | v200-ui-history-12 | PASS |

### VA EventRecord 후속

- actual dispatch records: `/private/tmp/media_server_v200_ui_event_records_dispatch_records_only_20260601.log`, EventRecord queue drained stored=2553 failed=0 dropped=0.
- seeded event history coverage: `/private/tmp/media_server_v200_ui_event_records_history_scope_390_20260601/event-history-coverage.json`, 12 enabled event/scenario rules covered.

## 제외 기록

| 항목 | 제외 이유 | 후속 확인 조건 |
| --- | --- | --- |
| 120분 longrun | UI 풀테스트 당시 별도 지시 전이어서 제외 | 후속 `verify-predev --soak-minutes 120`은 `v200-inapp-policy-120min-20260601`에서 PASS. `verify-va-runtime-console-longrun --duration-minutes 120`은 별도 미실행 |
| real cloud provider call/credential 저장 | 이번 UI fulltest는 dry-run/guard 범위 | provider field smoke 승인과 credential 제공 시 별도 실행 |

## 실패

| 항목 | 결과 | 처리 |
| --- | --- | --- |
| EventRecord dispatch 첫 시도 | queue drain timeout | hook 포함 저장소에서 queue가 많이 쌓인 실행조건 문제로 분리. records-only 저장소에서 재실행 PASS |
| EventRecord scope 첫 시도 | Chrome fallback env missing | verifier가 인앱 모드를 받지 않아 예외 env를 명시하고 재실행 PASS |

## 문서 재작성/신규 작성/비교 병합

- 재작성한 UI 풀테스트 관련 문서: 없음
- 새로 작성한 UI 풀테스트 문서: `docs/manual-ui-result-2026-06-01-v200-inapp-fulltest.md`
- 비교 결과: 기존 2026-05-25 결과표는 과거 v1.8.0 evidence로 보존하고, v2.0.0 결과표를 별도 작성
- 병합 결과: release evidence index와 v2.0.0 test record에서 새 결과표를 참조

## 커밋/푸시

- 커밋: 이 문서 검증 후 수행
- 푸시 수행 여부: 수행하지 않음

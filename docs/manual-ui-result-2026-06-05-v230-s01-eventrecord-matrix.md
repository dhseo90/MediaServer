# v2.3.0 S01 EventRecord Occurrence Matrix Result

## 검수 메타데이터

- run id: `v230-s01-eventrecord-matrix-20260605`
- 검수자: Codex in-app browser primary evidence + verifier support
- 날짜/시간: 2026-06-05 KST
- 브랜치/커밋: `v2.3.0`; commit은 이 문서 작성 시점에 아직 생성 전
- 서버 URL: `http://127.0.0.1:8081`
- auth mode: `off`
- seed fixture: `test/fixtures/manual_ui_fulltest_va_seed_matrix.json`
- history dir: `/tmp/media_server_v230_s01_event_history_20260605_203256`
- clean coverage: `/tmp/media_server_v230_s01_event_history_scope_clean_20260605_203256/event-history-coverage.json`
- matrix report: `/tmp/media_server_v230_s01_va_eventrecord_matrix_clean_20260605_203256.json`
- in-app evidence: `/tmp/media_server_v230_s01_inapp_events_evidence_20260605_203256/in-app-ops-events-evidence.json`
- records-only VA dispatch storage: `/tmp/media_server_v230_s01_verify_va_events_records_only_20260605_203256/va_events.jsonl`
- 브라우저: Codex 인앱 브라우저 primary. `verify-ops-event-records-scope`의 Chrome fallback은 보조 verifier로만 사용
- viewport: 390, 1180
- token usage source: Codex goal usage snapshot
- token start: 0
- token end: 895,242
- token consumed: 895,242
- elapsed: 2,396s at evidence update snapshot

## 문서 범위

이 문서는 v2.3.0 S01 Full VA EventRecord occurrence matrix 전용 결과입니다.
전체 UI-target feature inventory 전수 결과가 아니며, S02 이후 로드맵 범위나
legacy 244 UI-target full inventory result gate를 PASS로 대체하지 않습니다.

`./server.sh verify-manual-ui-evidence --result docs/manual-ui-result-2026-06-05-v230-s01-eventrecord-matrix.md`는
전체 UI-target feature ID, 전체 RULE feature row, full manual result summary를 요구하는
검증기라서 이 S01 전용 문서에는 적용하지 않습니다. 실제로 실행한 결과는 FAIL이며,
그 실패는 S01 matrix 산출물 부재가 아니라 문서 범위 불일치입니다. 이 문서는 아래
12개 exact EventRecord key, 인앱 브라우저 `/ops/events` 확인, clean coverage,
`--require-occurrence-matrix` report만 완료 evidence로 사용합니다.

## 테스트 영역별 판정

| 영역 | 실행 범위 | evidence | 기록 |
| --- | --- | --- | --- |
| 안정화 테스트 | S01 matrix report, EventRecord scope verifier, VA replay, VA runtime event dispatch, docs/diff 예정 | `/tmp/media_server_v230_s01_va_eventrecord_matrix_clean_20260605_203256.json` | PASS for executed S01 scope |
| 30분 테스트 | `verify-predev --soak-minutes 30` | 없음 | 미실행. 사용자 명시 요청 없음 |
| 120분 테스트 | `verify-predev --soak-minutes 120`, `verify-va-runtime-console-longrun --duration-minutes 120` | 없음 | 미실행. 사용자 명시 요청 없음 |
| UI 풀테스트 | `/ops/events` 12개 EventRecord row 확인, evidence filter, include archives, pagination, 390/1180 overflow | `/tmp/media_server_v230_s01_inapp_events_evidence_20260605_203256/in-app-ops-events-evidence.json` | PASS for S01 EventRecord matrix UI scope |

## S01 완료 판정

직접 답: S01의 Full VA EventRecord occurrence matrix는 `PASS`입니다.
완료 근거는 seed dry-run이 아니라, 현재 v2.3.0 S01 run에서 만든 throwaway
analysis registry, EventRecord JSON Lines, `/ops/events` 인앱 브라우저 row 확인,
clean event-history coverage, `--require-occurrence-matrix` report입니다.

`prepare-manual-ui-fulltest-seed --dry-run`은 registry/plan 준비 검증으로만 사용했고,
그 자체를 UI 또는 event occurrence evidence로 쓰지 않았습니다.

## VA Event Occurrence Coverage

| Key | Rule ID | Sample EventRecord | UI seen type | Record count | 판정 |
| --- | --- | --- | --- | ---: | --- |
| `presence` | `9201` | `v230-s01-ui-history-01` | yes | 1 | PASS |
| `enter` | `9202` | `v230-s01-ui-history-02` | yes | 1 | PASS |
| `exit` | `9203` | `v230-s01-ui-history-03` | yes | 1 | PASS |
| `line-crossing:any` | `9204` | `v230-s01-ui-history-04` | yes | 1 | PASS |
| `line-crossing:forward` | `9205` | `v230-s01-ui-history-05` | yes | 1 | PASS |
| `line-crossing:reverse` | `9206` | `v230-s01-ui-history-06` | yes | 1 | PASS |
| `intrusion-dwell` | `9207` | `v230-s01-ui-history-07` | yes | 1 | PASS |
| `re-entry` | `9208` | `v230-s01-ui-history-08` | yes | 1 | PASS |
| `wrong-direction` | `9209` | `v230-s01-ui-history-09` | yes | 1 | PASS |
| `intrusion-after-line-crossing` | `9210` | `v230-s01-ui-history-10` | yes | 1 | PASS |
| `loitering` | `9211` | `v230-s01-ui-history-11` | yes | 1 | PASS |
| `zone-occupancy` | `9212` | `v230-s01-ui-history-12` | yes | 1 | PASS |

### VA EventRecord 후속

S01에서는 위 12개 exact key가 모두 EventRecord JSON Lines, clean
`event-history-coverage.json`, `/ops/events` 인앱 브라우저 row 확인에 존재합니다.
장시간 자연 영상 기반 전수 발생 검증과 실장비/외부 endpoint 검증은 실행하지
않았고, 별도 승인 또는 후속 스텝에서만 확인합니다.

## 인앱 브라우저 UI 확인

| 기능 | 직접 조작/확인 | 실제 상태 | 판정 | 증적 |
| --- | --- | --- | --- | --- |
| `/ops/events` route | 390px route open | 12개 `v230-s01-ui-history-*` row가 표시됨 | PASS | `ops-events-390-initial.png` |
| Event type visibility | row text에서 10개 event type 확인 | `presence`, `enter`, `exit`, `line-crossing`, `intrusion-dwell`, `re-entry`, `wrong-direction`, `intrusion-after-line-crossing`, `loitering`, `zone-occupancy` 모두 표시 | PASS | `in-app-ops-events-evidence.json` |
| Evidence filter | evidence select를 `any`로 변경 | summary와 row state 유지 | PASS | `ops-events-390-controls.png` |
| Include archives | checkbox on | archive include state가 반영됨 | PASS | `in-app-ops-events-evidence.json` |
| Pagination | prev/next control 확인 | 12개 row라 next는 disabled, prev/next control 존재 | PASS | `in-app-ops-events-evidence.json` |
| Responsive | 390px/1180px viewport 확인 | `overflowX=0` | PASS | `ops-events-1180.png` |

## 현재 보존 증적

| 항목 | 경로 | 상태 | 비고 |
| --- | --- | --- | --- |
| 인앱 브라우저 evidence JSON | `/tmp/media_server_v230_s01_inapp_events_evidence_20260605_203256/in-app-ops-events-evidence.json` | exists | 12개 row/event type/viewport evidence |
| 390px 초기 화면 | `/tmp/media_server_v230_s01_inapp_events_evidence_20260605_203256/ops-events-390-initial.png` | exists | `/ops/events` row 확인 |
| 390px control 화면 | `/tmp/media_server_v230_s01_inapp_events_evidence_20260605_203256/ops-events-390-controls.png` | exists | evidence filter/include archives 확인 |
| 1180px 화면 | `/tmp/media_server_v230_s01_inapp_events_evidence_20260605_203256/ops-events-1180.png` | exists | responsive overflow 확인 |
| clean coverage JSON | `/tmp/media_server_v230_s01_event_history_scope_clean_20260605_203256/event-history-coverage.json` | exists | 12-key matrix input |
| clean coverage Markdown | `/tmp/media_server_v230_s01_event_history_scope_clean_20260605_203256/event-history-coverage.md` | exists | scope verifier report |
| EventRecord JSON Lines | `/tmp/media_server_v230_s01_event_history_20260605_203256/events/va_events.jsonl` | exists | 12개 S01 sample records |
| seed registry analysis | `/tmp/media_server_v230_s01_event_history_20260605_203256/registry/analysis.json` | exists | 12개 9201~9212 rule/template registry |

## 스크립트 테스트 기록

- PASS: `./server.sh prepare-manual-ui-fulltest-seed --dry-run --emit-registry-dir /tmp/media_server_v230_s01_event_history_20260605_203256/registry --emit-plan /tmp/media_server_v230_s01_event_history_20260605_203256/seed-plan.json`
- PASS: `MEDIA_SERVER_UI_BROWSER_MODE=chrome MEDIA_SERVER_ALLOW_CHROME_FALLBACK=1 ./server.sh verify-ops-event-records-scope --http-base http://127.0.0.1:8081 --event-history-dir /tmp/media_server_v230_s01_event_history_20260605_203256 --output-dir /tmp/media_server_v230_s01_event_history_scope_clean_20260605_203256 --debug-port 9913`
- PASS: `./server.sh verify-va-event-coverage-report --event-history-coverage-json /tmp/media_server_v230_s01_event_history_scope_clean_20260605_203256/event-history-coverage.json --require-occurrence-matrix --report /tmp/media_server_v230_s01_va_eventrecord_matrix_clean_20260605_203256.md --json-report /tmp/media_server_v230_s01_va_eventrecord_matrix_clean_20260605_203256.json`
- PASS: `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_PORT=8555 ./server.sh verify-va-events --dispatch-records`
- PASS: `./server.sh verify-va-replay`
- 보정: 첫 `verify-ops-event-records-scope` 실행은 Codex 환경에서 Chrome fallback env가 없어 브라우저 단계에서 실패했습니다. 인앱 브라우저 evidence를 먼저 확보하고, Chrome fallback을 명시해 보조 verifier로 재실행했습니다.
- 보정: 첫 `verify-va-events --dispatch-records` 실행은 snapshot/clip hook까지 켠 상태에서 queue drain timeout으로 실패했습니다. 저장 실패/드롭은 0이었고, records-only storage로 재실행해 stored=2026, failed=0, dropped=0으로 PASS했습니다.
- 안정화/장시간:
  - `./server.sh verify-predev --soak-minutes 30`: 미실행. 사용자 명시 요청 없음
  - `./server.sh verify-predev --soak-minutes 120`: 미실행. 사용자 명시 요청 없음
  - `./server.sh verify-va-runtime-console-longrun --duration-minutes 120`: 미실행. 사용자 명시 요청 없음

## 확인됨

- AGENTS.md와 v2.3.0 로드맵 문서를 읽고 S01 범위를 확인했습니다.
- 프로젝트 구조에서 VA verifier, `/ops/events` UI, EventRecord storage, 문서 evidence
  위치를 확인했습니다.
- Codex 인앱 브라우저로 `/ops/events`를 직접 열고 evidence filter, include archives,
  pagination control, 390px/1180px responsive 상태를 확인했습니다.
- 12개 exact EventRecord key별 sample record와 UI row가 clean coverage와 matrix
  report에 존재합니다.
- Event POST payload, WebRTC/SSE/WS metadata schema, RTSP/WebRTC media path는
  수정하지 않았습니다.

## 제외 기록

| 항목 | 제외 이유 | 후속 확인 조건 |
| --- | --- | --- |
| 30분 soak | 사용자 명시 요청 없음 | `./server.sh verify-predev --soak-minutes 30` 별도 실행 |
| 120분 longrun | 사용자 명시 요청 없음 | 사용자 승인 후 longrun 실행 |
| 실장비/외부 endpoint | S01 범위 밖 | V230-S04 또는 별도 field gate에서 실행 |
| 자연 영상만으로 12개 scenario EventRecord 생성 | S01 matrix는 throwaway seed/event history와 replay/runtime verifier를 조합해 닫음 | 장시간/현장 영상 기반 전수 발생 검증을 별도 요청 |
| 전체 UI-target feature inventory result gate | 이 문서는 S01 전용 matrix result | 전수 UI 풀테스트 문서와 runner evidence 생성 후 `verify-manual-ui-evidence --result` 실행 |

## 실패

- 최초 인앱 브라우저 자동화 시도: `tabS01.playwright.setViewportSize is not a function`.
  Browser runtime의 viewport capability 방식으로 전환해 `/ops/events` evidence를 다시 확보했습니다.
- 최초 `verify-ops-event-records-scope`: Codex 환경에서 Chrome fallback env가 없어
  브라우저 단계 FAIL. 인앱 브라우저 evidence를 먼저 확보하고,
  `MEDIA_SERVER_UI_BROWSER_MODE=chrome MEDIA_SERVER_ALLOW_CHROME_FALLBACK=1` 보조
  verifier로 재실행해 PASS했습니다.
- 최초 `verify-va-events --dispatch-records`: snapshot/clip hook 포함 상태에서 queue
  drain timeout. 저장 실패/드롭은 0이었고, records-only storage로 재실행해
  stored=2026, failed=0, dropped=0 PASS했습니다.
- `./server.sh verify-manual-ui-evidence --result docs/manual-ui-result-2026-06-05-v230-s01-eventrecord-matrix.md`:
  FAIL. 이 검증기는 전체 UI-target inventory result를 요구하므로 S01 전용 문서에는
  미적용이며, S01 completion evidence로 사용하지 않습니다.

## 문서 재작성/신규 작성/비교 병합

- 재작성한 UI 풀테스트 관련 문서: 없음
- 새로 작성한 UI 풀테스트 문서: `docs/manual-ui-result-2026-06-05-v230-s01-eventrecord-matrix.md`
- 비교 결과: S01 전용 result라 기존 full inventory result와 병합하지 않음
- 병합 결과: 없음
- 남은 중복: 없음

## 최종 판정

- 최종 결론: PASS for V230-S01 Full VA EventRecord occurrence matrix scope
- 완료 조건: 12개 exact key별 registry row, `/ops/events` UI seen type, EventRecord JSON Lines count, sample event id가 모두 존재
- 제품 schema 변경: 없음
- Event POST/WebRTC/SSE/WS metadata schema 변경: 없음
- RTSP/WebRTC media path 변경: 없음
- 제품 회귀 여부: 확인된 회귀 없음
- 환경/sandbox 한계: in-app browser fetch 제한과 Chrome fallback env 조건은 보조 verifier에서만 영향
- 수정 필요 이슈: 없음
- 커밋: 이 문서 작성 시점에는 아직 생성 전
- 푸시 가능: 커밋 및 clean status 확인 전
- 푸시 수행 여부: 수행하지 않음

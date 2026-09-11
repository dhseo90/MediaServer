# S09 predev120 96360 실행 결과

독자: 개발·테스트 evidence 검토자. lifecycle: 2026-09-11 실제 실행의 불변 결과 보존. 중앙 release-test-records가 실행 기록 source-of-truth이고 이 artifact는 개별 판정 전수다. S09 전체 완료 또는 자원 안정성 판정이 아니다.

명령 `./server.sh verify-predev --soak-minutes 120 --fail-fast`, 메인 session96360 exit0/signal null. 시작 2026-09-11T00:29:56.789Z, 종료 2026-09-11T02:40:18.692Z, elapsed7821903ms. runner monotonic7821초, 요청 soak7200초, 실제 ledger80iterations×5case=400행. outer409pass/0fail/1skip/0notRun이며 report PASS도409에 포함한다. child21pass/0fail/9skip,555초. 이 계층별 카운트는 합산하지 않는다.

token start/end/consumed 미집계: 실행 도구가 제공하지 않음. source: exit.json/predev-summary.json/child test-summary 및 각 log 판정 줄. 최초 JSON 대량 출력 조회는 도구에서 절단되어 증거로 사용하지 않았고 이후 제한된 projection으로 재수집했다. 원로그 전체복사 없이 판정·필요 수치만 이관했다.

## Outer 실행 전수

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| build | `cmake --build build-gst-onnx`; 1초; log=build.log | pass | summary.steps 원순서 |
| server-start-queue-256 | `run_server_foreground`; 0초; log=server.log | pass | summary.steps 원순서 |
| integrated-smoke | `MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_AUTH_MODE=off ./server.sh test --no-start --fail-fast --skip-external --include-rules  --include-va-events --include-image-analysis --include-redaction`; 555초; log=integrated_smoke.log | pass | summary.steps 원순서 |
| soak-1-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 34초; log=soak_1_va_events.log | pass | summary.steps 원순서 |
| soak-1-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_1_event_post_schema.log | pass | summary.steps 원순서 |
| soak-1-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 4초; log=soak_1_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-1-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 39초; log=soak_1_redaction.log | pass | summary.steps 원순서 |
| soak-1-runtime-idle | `runtime idle check`; 0초; log=soak_1_runtime_idle.json | pass | summary.steps 원순서 |
| soak-2-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 34초; log=soak_2_va_events.log | pass | summary.steps 원순서 |
| soak-2-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_2_event_post_schema.log | pass | summary.steps 원순서 |
| soak-2-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 4초; log=soak_2_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-2-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 40초; log=soak_2_redaction.log | pass | summary.steps 원순서 |
| soak-2-runtime-idle | `runtime idle check`; 0초; log=soak_2_runtime_idle.json | pass | summary.steps 원순서 |
| soak-3-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 35초; log=soak_3_va_events.log | pass | summary.steps 원순서 |
| soak-3-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_3_event_post_schema.log | pass | summary.steps 원순서 |
| soak-3-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 3초; log=soak_3_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-3-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 40초; log=soak_3_redaction.log | pass | summary.steps 원순서 |
| soak-3-runtime-idle | `runtime idle check`; 0초; log=soak_3_runtime_idle.json | pass | summary.steps 원순서 |
| soak-4-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 33초; log=soak_4_va_events.log | pass | summary.steps 원순서 |
| soak-4-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_4_event_post_schema.log | pass | summary.steps 원순서 |
| soak-4-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 4초; log=soak_4_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-4-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 41초; log=soak_4_redaction.log | pass | summary.steps 원순서 |
| soak-4-runtime-idle | `runtime idle check`; 0초; log=soak_4_runtime_idle.json | pass | summary.steps 원순서 |
| soak-5-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 33초; log=soak_5_va_events.log | pass | summary.steps 원순서 |
| soak-5-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_5_event_post_schema.log | pass | summary.steps 원순서 |
| soak-5-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 4초; log=soak_5_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-5-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 40초; log=soak_5_redaction.log | pass | summary.steps 원순서 |
| soak-5-runtime-idle | `runtime idle check`; 0초; log=soak_5_runtime_idle.json | pass | summary.steps 원순서 |
| soak-6-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 33초; log=soak_6_va_events.log | pass | summary.steps 원순서 |
| soak-6-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_6_event_post_schema.log | pass | summary.steps 원순서 |
| soak-6-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 3초; log=soak_6_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-6-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 41초; log=soak_6_redaction.log | pass | summary.steps 원순서 |
| soak-6-runtime-idle | `runtime idle check`; 0초; log=soak_6_runtime_idle.json | pass | summary.steps 원순서 |
| soak-7-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 33초; log=soak_7_va_events.log | pass | summary.steps 원순서 |
| soak-7-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_7_event_post_schema.log | pass | summary.steps 원순서 |
| soak-7-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 3초; log=soak_7_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-7-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 42초; log=soak_7_redaction.log | pass | summary.steps 원순서 |
| soak-7-runtime-idle | `runtime idle check`; 0초; log=soak_7_runtime_idle.json | pass | summary.steps 원순서 |
| soak-8-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 33초; log=soak_8_va_events.log | pass | summary.steps 원순서 |
| soak-8-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_8_event_post_schema.log | pass | summary.steps 원순서 |
| soak-8-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 4초; log=soak_8_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-8-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 41초; log=soak_8_redaction.log | pass | summary.steps 원순서 |
| soak-8-runtime-idle | `runtime idle check`; 0초; log=soak_8_runtime_idle.json | pass | summary.steps 원순서 |
| soak-9-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 33초; log=soak_9_va_events.log | pass | summary.steps 원순서 |
| soak-9-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_9_event_post_schema.log | pass | summary.steps 원순서 |
| soak-9-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 3초; log=soak_9_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-9-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 42초; log=soak_9_redaction.log | pass | summary.steps 원순서 |
| soak-9-runtime-idle | `runtime idle check`; 0초; log=soak_9_runtime_idle.json | pass | summary.steps 원순서 |
| soak-10-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 35초; log=soak_10_va_events.log | pass | summary.steps 원순서 |
| soak-10-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_10_event_post_schema.log | pass | summary.steps 원순서 |
| soak-10-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 3초; log=soak_10_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-10-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 41초; log=soak_10_redaction.log | pass | summary.steps 원순서 |
| soak-10-runtime-idle | `runtime idle check`; 0초; log=soak_10_runtime_idle.json | pass | summary.steps 원순서 |
| soak-11-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 34초; log=soak_11_va_events.log | pass | summary.steps 원순서 |
| soak-11-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_11_event_post_schema.log | pass | summary.steps 원순서 |
| soak-11-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 3초; log=soak_11_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-11-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 42초; log=soak_11_redaction.log | pass | summary.steps 원순서 |
| soak-11-runtime-idle | `runtime idle check`; 0초; log=soak_11_runtime_idle.json | pass | summary.steps 원순서 |
| soak-12-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 34초; log=soak_12_va_events.log | pass | summary.steps 원순서 |
| soak-12-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_12_event_post_schema.log | pass | summary.steps 원순서 |
| soak-12-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 3초; log=soak_12_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-12-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 41초; log=soak_12_redaction.log | pass | summary.steps 원순서 |
| soak-12-runtime-idle | `runtime idle check`; 0초; log=soak_12_runtime_idle.json | pass | summary.steps 원순서 |
| soak-13-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 33초; log=soak_13_va_events.log | pass | summary.steps 원순서 |
| soak-13-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_13_event_post_schema.log | pass | summary.steps 원순서 |
| soak-13-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 4초; log=soak_13_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-13-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 39초; log=soak_13_redaction.log | pass | summary.steps 원순서 |
| soak-13-runtime-idle | `runtime idle check`; 0초; log=soak_13_runtime_idle.json | pass | summary.steps 원순서 |
| soak-14-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 33초; log=soak_14_va_events.log | pass | summary.steps 원순서 |
| soak-14-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_14_event_post_schema.log | pass | summary.steps 원순서 |
| soak-14-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 3초; log=soak_14_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-14-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 42초; log=soak_14_redaction.log | pass | summary.steps 원순서 |
| soak-14-runtime-idle | `runtime idle check`; 0초; log=soak_14_runtime_idle.json | pass | summary.steps 원순서 |
| soak-15-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 34초; log=soak_15_va_events.log | pass | summary.steps 원순서 |
| soak-15-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_15_event_post_schema.log | pass | summary.steps 원순서 |
| soak-15-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 3초; log=soak_15_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-15-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 41초; log=soak_15_redaction.log | pass | summary.steps 원순서 |
| soak-15-runtime-idle | `runtime idle check`; 0초; log=soak_15_runtime_idle.json | pass | summary.steps 원순서 |
| soak-16-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 34초; log=soak_16_va_events.log | pass | summary.steps 원순서 |
| soak-16-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_16_event_post_schema.log | pass | summary.steps 원순서 |
| soak-16-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 3초; log=soak_16_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-16-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 41초; log=soak_16_redaction.log | pass | summary.steps 원순서 |
| soak-16-runtime-idle | `runtime idle check`; 0초; log=soak_16_runtime_idle.json | pass | summary.steps 원순서 |
| soak-17-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 34초; log=soak_17_va_events.log | pass | summary.steps 원순서 |
| soak-17-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_17_event_post_schema.log | pass | summary.steps 원순서 |
| soak-17-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 3초; log=soak_17_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-17-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 41초; log=soak_17_redaction.log | pass | summary.steps 원순서 |
| soak-17-runtime-idle | `runtime idle check`; 0초; log=soak_17_runtime_idle.json | pass | summary.steps 원순서 |
| soak-18-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 33초; log=soak_18_va_events.log | pass | summary.steps 원순서 |
| soak-18-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_18_event_post_schema.log | pass | summary.steps 원순서 |
| soak-18-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 3초; log=soak_18_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-18-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 42초; log=soak_18_redaction.log | pass | summary.steps 원순서 |
| soak-18-runtime-idle | `runtime idle check`; 0초; log=soak_18_runtime_idle.json | pass | summary.steps 원순서 |
| soak-19-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 34초; log=soak_19_va_events.log | pass | summary.steps 원순서 |
| soak-19-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_19_event_post_schema.log | pass | summary.steps 원순서 |
| soak-19-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 3초; log=soak_19_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-19-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 40초; log=soak_19_redaction.log | pass | summary.steps 원순서 |
| soak-19-runtime-idle | `runtime idle check`; 0초; log=soak_19_runtime_idle.json | pass | summary.steps 원순서 |
| soak-20-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 34초; log=soak_20_va_events.log | pass | summary.steps 원순서 |
| soak-20-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_20_event_post_schema.log | pass | summary.steps 원순서 |
| soak-20-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 3초; log=soak_20_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-20-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 40초; log=soak_20_redaction.log | pass | summary.steps 원순서 |
| soak-20-runtime-idle | `runtime idle check`; 0초; log=soak_20_runtime_idle.json | pass | summary.steps 원순서 |
| soak-21-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 34초; log=soak_21_va_events.log | pass | summary.steps 원순서 |
| soak-21-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_21_event_post_schema.log | pass | summary.steps 원순서 |
| soak-21-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 3초; log=soak_21_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-21-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 41초; log=soak_21_redaction.log | pass | summary.steps 원순서 |
| soak-21-runtime-idle | `runtime idle check`; 0초; log=soak_21_runtime_idle.json | pass | summary.steps 원순서 |
| soak-22-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 35초; log=soak_22_va_events.log | pass | summary.steps 원순서 |
| soak-22-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_22_event_post_schema.log | pass | summary.steps 원순서 |
| soak-22-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 4초; log=soak_22_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-22-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 39초; log=soak_22_redaction.log | pass | summary.steps 원순서 |
| soak-22-runtime-idle | `runtime idle check`; 0초; log=soak_22_runtime_idle.json | pass | summary.steps 원순서 |
| soak-23-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 33초; log=soak_23_va_events.log | pass | summary.steps 원순서 |
| soak-23-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_23_event_post_schema.log | pass | summary.steps 원순서 |
| soak-23-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 3초; log=soak_23_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-23-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 42초; log=soak_23_redaction.log | pass | summary.steps 원순서 |
| soak-23-runtime-idle | `runtime idle check`; 0초; log=soak_23_runtime_idle.json | pass | summary.steps 원순서 |
| soak-24-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 35초; log=soak_24_va_events.log | pass | summary.steps 원순서 |
| soak-24-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_24_event_post_schema.log | pass | summary.steps 원순서 |
| soak-24-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 3초; log=soak_24_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-24-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 41초; log=soak_24_redaction.log | pass | summary.steps 원순서 |
| soak-24-runtime-idle | `runtime idle check`; 0초; log=soak_24_runtime_idle.json | pass | summary.steps 원순서 |
| soak-25-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 33초; log=soak_25_va_events.log | pass | summary.steps 원순서 |
| soak-25-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_25_event_post_schema.log | pass | summary.steps 원순서 |
| soak-25-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 3초; log=soak_25_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-25-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 42초; log=soak_25_redaction.log | pass | summary.steps 원순서 |
| soak-25-runtime-idle | `runtime idle check`; 0초; log=soak_25_runtime_idle.json | pass | summary.steps 원순서 |
| soak-26-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 33초; log=soak_26_va_events.log | pass | summary.steps 원순서 |
| soak-26-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_26_event_post_schema.log | pass | summary.steps 원순서 |
| soak-26-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 3초; log=soak_26_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-26-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 41초; log=soak_26_redaction.log | pass | summary.steps 원순서 |
| soak-26-runtime-idle | `runtime idle check`; 0초; log=soak_26_runtime_idle.json | pass | summary.steps 원순서 |
| soak-27-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 33초; log=soak_27_va_events.log | pass | summary.steps 원순서 |
| soak-27-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_27_event_post_schema.log | pass | summary.steps 원순서 |
| soak-27-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 3초; log=soak_27_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-27-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 41초; log=soak_27_redaction.log | pass | summary.steps 원순서 |
| soak-27-runtime-idle | `runtime idle check`; 0초; log=soak_27_runtime_idle.json | pass | summary.steps 원순서 |
| soak-28-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 34초; log=soak_28_va_events.log | pass | summary.steps 원순서 |
| soak-28-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_28_event_post_schema.log | pass | summary.steps 원순서 |
| soak-28-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 3초; log=soak_28_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-28-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 42초; log=soak_28_redaction.log | pass | summary.steps 원순서 |
| soak-28-runtime-idle | `runtime idle check`; 0초; log=soak_28_runtime_idle.json | pass | summary.steps 원순서 |
| soak-29-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 35초; log=soak_29_va_events.log | pass | summary.steps 원순서 |
| soak-29-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_29_event_post_schema.log | pass | summary.steps 원순서 |
| soak-29-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 3초; log=soak_29_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-29-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 41초; log=soak_29_redaction.log | pass | summary.steps 원순서 |
| soak-29-runtime-idle | `runtime idle check`; 0초; log=soak_29_runtime_idle.json | pass | summary.steps 원순서 |
| soak-30-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 34초; log=soak_30_va_events.log | pass | summary.steps 원순서 |
| soak-30-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_30_event_post_schema.log | pass | summary.steps 원순서 |
| soak-30-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 4초; log=soak_30_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-30-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 39초; log=soak_30_redaction.log | pass | summary.steps 원순서 |
| soak-30-runtime-idle | `runtime idle check`; 0초; log=soak_30_runtime_idle.json | pass | summary.steps 원순서 |
| soak-31-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 35초; log=soak_31_va_events.log | pass | summary.steps 원순서 |
| soak-31-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_31_event_post_schema.log | pass | summary.steps 원순서 |
| soak-31-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 3초; log=soak_31_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-31-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 40초; log=soak_31_redaction.log | pass | summary.steps 원순서 |
| soak-31-runtime-idle | `runtime idle check`; 0초; log=soak_31_runtime_idle.json | pass | summary.steps 원순서 |
| soak-32-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 34초; log=soak_32_va_events.log | pass | summary.steps 원순서 |
| soak-32-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_32_event_post_schema.log | pass | summary.steps 원순서 |
| soak-32-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 5초; log=soak_32_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-32-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 40초; log=soak_32_redaction.log | pass | summary.steps 원순서 |
| soak-32-runtime-idle | `runtime idle check`; 0초; log=soak_32_runtime_idle.json | pass | summary.steps 원순서 |
| soak-33-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 34초; log=soak_33_va_events.log | pass | summary.steps 원순서 |
| soak-33-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_33_event_post_schema.log | pass | summary.steps 원순서 |
| soak-33-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 3초; log=soak_33_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-33-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 41초; log=soak_33_redaction.log | pass | summary.steps 원순서 |
| soak-33-runtime-idle | `runtime idle check`; 0초; log=soak_33_runtime_idle.json | pass | summary.steps 원순서 |
| soak-34-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 34초; log=soak_34_va_events.log | pass | summary.steps 원순서 |
| soak-34-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_34_event_post_schema.log | pass | summary.steps 원순서 |
| soak-34-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 3초; log=soak_34_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-34-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 40초; log=soak_34_redaction.log | pass | summary.steps 원순서 |
| soak-34-runtime-idle | `runtime idle check`; 0초; log=soak_34_runtime_idle.json | pass | summary.steps 원순서 |
| soak-35-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 34초; log=soak_35_va_events.log | pass | summary.steps 원순서 |
| soak-35-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_35_event_post_schema.log | pass | summary.steps 원순서 |
| soak-35-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 3초; log=soak_35_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-35-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 41초; log=soak_35_redaction.log | pass | summary.steps 원순서 |
| soak-35-runtime-idle | `runtime idle check`; 0초; log=soak_35_runtime_idle.json | pass | summary.steps 원순서 |
| soak-36-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 34초; log=soak_36_va_events.log | pass | summary.steps 원순서 |
| soak-36-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_36_event_post_schema.log | pass | summary.steps 원순서 |
| soak-36-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 4초; log=soak_36_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-36-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 40초; log=soak_36_redaction.log | pass | summary.steps 원순서 |
| soak-36-runtime-idle | `runtime idle check`; 0초; log=soak_36_runtime_idle.json | pass | summary.steps 원순서 |
| soak-37-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 33초; log=soak_37_va_events.log | pass | summary.steps 원순서 |
| soak-37-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_37_event_post_schema.log | pass | summary.steps 원순서 |
| soak-37-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 3초; log=soak_37_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-37-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 42초; log=soak_37_redaction.log | pass | summary.steps 원순서 |
| soak-37-runtime-idle | `runtime idle check`; 0초; log=soak_37_runtime_idle.json | pass | summary.steps 원순서 |
| soak-38-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 34초; log=soak_38_va_events.log | pass | summary.steps 원순서 |
| soak-38-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_38_event_post_schema.log | pass | summary.steps 원순서 |
| soak-38-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 3초; log=soak_38_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-38-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 40초; log=soak_38_redaction.log | pass | summary.steps 원순서 |
| soak-38-runtime-idle | `runtime idle check`; 0초; log=soak_38_runtime_idle.json | pass | summary.steps 원순서 |
| soak-39-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 34초; log=soak_39_va_events.log | pass | summary.steps 원순서 |
| soak-39-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_39_event_post_schema.log | pass | summary.steps 원순서 |
| soak-39-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 3초; log=soak_39_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-39-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 40초; log=soak_39_redaction.log | pass | summary.steps 원순서 |
| soak-39-runtime-idle | `runtime idle check`; 0초; log=soak_39_runtime_idle.json | pass | summary.steps 원순서 |
| soak-40-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 33초; log=soak_40_va_events.log | pass | summary.steps 원순서 |
| soak-40-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_40_event_post_schema.log | pass | summary.steps 원순서 |
| soak-40-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 3초; log=soak_40_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-40-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 42초; log=soak_40_redaction.log | pass | summary.steps 원순서 |
| soak-40-runtime-idle | `runtime idle check`; 0초; log=soak_40_runtime_idle.json | pass | summary.steps 원순서 |
| soak-41-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 34초; log=soak_41_va_events.log | pass | summary.steps 원순서 |
| soak-41-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_41_event_post_schema.log | pass | summary.steps 원순서 |
| soak-41-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 3초; log=soak_41_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-41-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 41초; log=soak_41_redaction.log | pass | summary.steps 원순서 |
| soak-41-runtime-idle | `runtime idle check`; 0초; log=soak_41_runtime_idle.json | pass | summary.steps 원순서 |
| soak-42-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 34초; log=soak_42_va_events.log | pass | summary.steps 원순서 |
| soak-42-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_42_event_post_schema.log | pass | summary.steps 원순서 |
| soak-42-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 3초; log=soak_42_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-42-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 42초; log=soak_42_redaction.log | pass | summary.steps 원순서 |
| soak-42-runtime-idle | `runtime idle check`; 0초; log=soak_42_runtime_idle.json | pass | summary.steps 원순서 |
| soak-43-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 35초; log=soak_43_va_events.log | pass | summary.steps 원순서 |
| soak-43-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_43_event_post_schema.log | pass | summary.steps 원순서 |
| soak-43-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 3초; log=soak_43_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-43-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 41초; log=soak_43_redaction.log | pass | summary.steps 원순서 |
| soak-43-runtime-idle | `runtime idle check`; 0초; log=soak_43_runtime_idle.json | pass | summary.steps 원순서 |
| soak-44-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 34초; log=soak_44_va_events.log | pass | summary.steps 원순서 |
| soak-44-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_44_event_post_schema.log | pass | summary.steps 원순서 |
| soak-44-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 4초; log=soak_44_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-44-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 40초; log=soak_44_redaction.log | pass | summary.steps 원순서 |
| soak-44-runtime-idle | `runtime idle check`; 0초; log=soak_44_runtime_idle.json | pass | summary.steps 원순서 |
| soak-45-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 34초; log=soak_45_va_events.log | pass | summary.steps 원순서 |
| soak-45-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_45_event_post_schema.log | pass | summary.steps 원순서 |
| soak-45-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 3초; log=soak_45_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-45-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 40초; log=soak_45_redaction.log | pass | summary.steps 원순서 |
| soak-45-runtime-idle | `runtime idle check`; 0초; log=soak_45_runtime_idle.json | pass | summary.steps 원순서 |
| soak-46-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 34초; log=soak_46_va_events.log | pass | summary.steps 원순서 |
| soak-46-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_46_event_post_schema.log | pass | summary.steps 원순서 |
| soak-46-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 3초; log=soak_46_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-46-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 42초; log=soak_46_redaction.log | pass | summary.steps 원순서 |
| soak-46-runtime-idle | `runtime idle check`; 0초; log=soak_46_runtime_idle.json | pass | summary.steps 원순서 |
| soak-47-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 34초; log=soak_47_va_events.log | pass | summary.steps 원순서 |
| soak-47-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_47_event_post_schema.log | pass | summary.steps 원순서 |
| soak-47-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 4초; log=soak_47_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-47-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 40초; log=soak_47_redaction.log | pass | summary.steps 원순서 |
| soak-47-runtime-idle | `runtime idle check`; 0초; log=soak_47_runtime_idle.json | pass | summary.steps 원순서 |
| soak-48-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 33초; log=soak_48_va_events.log | pass | summary.steps 원순서 |
| soak-48-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_48_event_post_schema.log | pass | summary.steps 원순서 |
| soak-48-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 4초; log=soak_48_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-48-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 41초; log=soak_48_redaction.log | pass | summary.steps 원순서 |
| soak-48-runtime-idle | `runtime idle check`; 0초; log=soak_48_runtime_idle.json | pass | summary.steps 원순서 |
| soak-49-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 34초; log=soak_49_va_events.log | pass | summary.steps 원순서 |
| soak-49-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_49_event_post_schema.log | pass | summary.steps 원순서 |
| soak-49-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 4초; log=soak_49_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-49-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 40초; log=soak_49_redaction.log | pass | summary.steps 원순서 |
| soak-49-runtime-idle | `runtime idle check`; 0초; log=soak_49_runtime_idle.json | pass | summary.steps 원순서 |
| soak-50-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 33초; log=soak_50_va_events.log | pass | summary.steps 원순서 |
| soak-50-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_50_event_post_schema.log | pass | summary.steps 원순서 |
| soak-50-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 4초; log=soak_50_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-50-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 40초; log=soak_50_redaction.log | pass | summary.steps 원순서 |
| soak-50-runtime-idle | `runtime idle check`; 0초; log=soak_50_runtime_idle.json | pass | summary.steps 원순서 |
| soak-51-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 33초; log=soak_51_va_events.log | pass | summary.steps 원순서 |
| soak-51-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_51_event_post_schema.log | pass | summary.steps 원순서 |
| soak-51-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 4초; log=soak_51_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-51-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 39초; log=soak_51_redaction.log | pass | summary.steps 원순서 |
| soak-51-runtime-idle | `runtime idle check`; 0초; log=soak_51_runtime_idle.json | pass | summary.steps 원순서 |
| soak-52-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 33초; log=soak_52_va_events.log | pass | summary.steps 원순서 |
| soak-52-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_52_event_post_schema.log | pass | summary.steps 원순서 |
| soak-52-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 3초; log=soak_52_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-52-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 41초; log=soak_52_redaction.log | pass | summary.steps 원순서 |
| soak-52-runtime-idle | `runtime idle check`; 0초; log=soak_52_runtime_idle.json | pass | summary.steps 원순서 |
| soak-53-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 34초; log=soak_53_va_events.log | pass | summary.steps 원순서 |
| soak-53-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_53_event_post_schema.log | pass | summary.steps 원순서 |
| soak-53-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 3초; log=soak_53_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-53-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 41초; log=soak_53_redaction.log | pass | summary.steps 원순서 |
| soak-53-runtime-idle | `runtime idle check`; 0초; log=soak_53_runtime_idle.json | pass | summary.steps 원순서 |
| soak-54-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 33초; log=soak_54_va_events.log | pass | summary.steps 원순서 |
| soak-54-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_54_event_post_schema.log | pass | summary.steps 원순서 |
| soak-54-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 4초; log=soak_54_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-54-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 41초; log=soak_54_redaction.log | pass | summary.steps 원순서 |
| soak-54-runtime-idle | `runtime idle check`; 0초; log=soak_54_runtime_idle.json | pass | summary.steps 원순서 |
| soak-55-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 33초; log=soak_55_va_events.log | pass | summary.steps 원순서 |
| soak-55-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_55_event_post_schema.log | pass | summary.steps 원순서 |
| soak-55-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 4초; log=soak_55_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-55-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 40초; log=soak_55_redaction.log | pass | summary.steps 원순서 |
| soak-55-runtime-idle | `runtime idle check`; 0초; log=soak_55_runtime_idle.json | pass | summary.steps 원순서 |
| soak-56-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 34초; log=soak_56_va_events.log | pass | summary.steps 원순서 |
| soak-56-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_56_event_post_schema.log | pass | summary.steps 원순서 |
| soak-56-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 4초; log=soak_56_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-56-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 39초; log=soak_56_redaction.log | pass | summary.steps 원순서 |
| soak-56-runtime-idle | `runtime idle check`; 0초; log=soak_56_runtime_idle.json | pass | summary.steps 원순서 |
| soak-57-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 33초; log=soak_57_va_events.log | pass | summary.steps 원순서 |
| soak-57-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_57_event_post_schema.log | pass | summary.steps 원순서 |
| soak-57-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 4초; log=soak_57_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-57-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 40초; log=soak_57_redaction.log | pass | summary.steps 원순서 |
| soak-57-runtime-idle | `runtime idle check`; 0초; log=soak_57_runtime_idle.json | pass | summary.steps 원순서 |
| soak-58-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 33초; log=soak_58_va_events.log | pass | summary.steps 원순서 |
| soak-58-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_58_event_post_schema.log | pass | summary.steps 원순서 |
| soak-58-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 3초; log=soak_58_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-58-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 41초; log=soak_58_redaction.log | pass | summary.steps 원순서 |
| soak-58-runtime-idle | `runtime idle check`; 0초; log=soak_58_runtime_idle.json | pass | summary.steps 원순서 |
| soak-59-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 34초; log=soak_59_va_events.log | pass | summary.steps 원순서 |
| soak-59-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_59_event_post_schema.log | pass | summary.steps 원순서 |
| soak-59-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 3초; log=soak_59_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-59-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 41초; log=soak_59_redaction.log | pass | summary.steps 원순서 |
| soak-59-runtime-idle | `runtime idle check`; 0초; log=soak_59_runtime_idle.json | pass | summary.steps 원순서 |
| soak-60-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 33초; log=soak_60_va_events.log | pass | summary.steps 원순서 |
| soak-60-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_60_event_post_schema.log | pass | summary.steps 원순서 |
| soak-60-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 5초; log=soak_60_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-60-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 41초; log=soak_60_redaction.log | pass | summary.steps 원순서 |
| soak-60-runtime-idle | `runtime idle check`; 0초; log=soak_60_runtime_idle.json | pass | summary.steps 원순서 |
| soak-61-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 34초; log=soak_61_va_events.log | pass | summary.steps 원순서 |
| soak-61-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_61_event_post_schema.log | pass | summary.steps 원순서 |
| soak-61-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 4초; log=soak_61_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-61-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 39초; log=soak_61_redaction.log | pass | summary.steps 원순서 |
| soak-61-runtime-idle | `runtime idle check`; 0초; log=soak_61_runtime_idle.json | pass | summary.steps 원순서 |
| soak-62-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 33초; log=soak_62_va_events.log | pass | summary.steps 원순서 |
| soak-62-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_62_event_post_schema.log | pass | summary.steps 원순서 |
| soak-62-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 4초; log=soak_62_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-62-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 39초; log=soak_62_redaction.log | pass | summary.steps 원순서 |
| soak-62-runtime-idle | `runtime idle check`; 0초; log=soak_62_runtime_idle.json | pass | summary.steps 원순서 |
| soak-63-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 33초; log=soak_63_va_events.log | pass | summary.steps 원순서 |
| soak-63-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_63_event_post_schema.log | pass | summary.steps 원순서 |
| soak-63-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 4초; log=soak_63_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-63-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 40초; log=soak_63_redaction.log | pass | summary.steps 원순서 |
| soak-63-runtime-idle | `runtime idle check`; 0초; log=soak_63_runtime_idle.json | pass | summary.steps 원순서 |
| soak-64-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 34초; log=soak_64_va_events.log | pass | summary.steps 원순서 |
| soak-64-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_64_event_post_schema.log | pass | summary.steps 원순서 |
| soak-64-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 4초; log=soak_64_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-64-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 40초; log=soak_64_redaction.log | pass | summary.steps 원순서 |
| soak-64-runtime-idle | `runtime idle check`; 0초; log=soak_64_runtime_idle.json | pass | summary.steps 원순서 |
| soak-65-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 35초; log=soak_65_va_events.log | pass | summary.steps 원순서 |
| soak-65-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_65_event_post_schema.log | pass | summary.steps 원순서 |
| soak-65-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 4초; log=soak_65_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-65-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 40초; log=soak_65_redaction.log | pass | summary.steps 원순서 |
| soak-65-runtime-idle | `runtime idle check`; 0초; log=soak_65_runtime_idle.json | pass | summary.steps 원순서 |
| soak-66-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 34초; log=soak_66_va_events.log | pass | summary.steps 원순서 |
| soak-66-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_66_event_post_schema.log | pass | summary.steps 원순서 |
| soak-66-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 4초; log=soak_66_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-66-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 41초; log=soak_66_redaction.log | pass | summary.steps 원순서 |
| soak-66-runtime-idle | `runtime idle check`; 0초; log=soak_66_runtime_idle.json | pass | summary.steps 원순서 |
| soak-67-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 35초; log=soak_67_va_events.log | pass | summary.steps 원순서 |
| soak-67-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_67_event_post_schema.log | pass | summary.steps 원순서 |
| soak-67-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 4초; log=soak_67_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-67-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 40초; log=soak_67_redaction.log | pass | summary.steps 원순서 |
| soak-67-runtime-idle | `runtime idle check`; 0초; log=soak_67_runtime_idle.json | pass | summary.steps 원순서 |
| soak-68-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 34초; log=soak_68_va_events.log | pass | summary.steps 원순서 |
| soak-68-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_68_event_post_schema.log | pass | summary.steps 원순서 |
| soak-68-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 4초; log=soak_68_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-68-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 39초; log=soak_68_redaction.log | pass | summary.steps 원순서 |
| soak-68-runtime-idle | `runtime idle check`; 0초; log=soak_68_runtime_idle.json | pass | summary.steps 원순서 |
| soak-69-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 34초; log=soak_69_va_events.log | pass | summary.steps 원순서 |
| soak-69-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_69_event_post_schema.log | pass | summary.steps 원순서 |
| soak-69-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 3초; log=soak_69_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-69-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 40초; log=soak_69_redaction.log | pass | summary.steps 원순서 |
| soak-69-runtime-idle | `runtime idle check`; 0초; log=soak_69_runtime_idle.json | pass | summary.steps 원순서 |
| soak-70-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 34초; log=soak_70_va_events.log | pass | summary.steps 원순서 |
| soak-70-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_70_event_post_schema.log | pass | summary.steps 원순서 |
| soak-70-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 4초; log=soak_70_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-70-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 39초; log=soak_70_redaction.log | pass | summary.steps 원순서 |
| soak-70-runtime-idle | `runtime idle check`; 0초; log=soak_70_runtime_idle.json | pass | summary.steps 원순서 |
| soak-71-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 34초; log=soak_71_va_events.log | pass | summary.steps 원순서 |
| soak-71-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_71_event_post_schema.log | pass | summary.steps 원순서 |
| soak-71-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 4초; log=soak_71_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-71-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 41초; log=soak_71_redaction.log | pass | summary.steps 원순서 |
| soak-71-runtime-idle | `runtime idle check`; 0초; log=soak_71_runtime_idle.json | pass | summary.steps 원순서 |
| soak-72-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 34초; log=soak_72_va_events.log | pass | summary.steps 원순서 |
| soak-72-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_72_event_post_schema.log | pass | summary.steps 원순서 |
| soak-72-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 4초; log=soak_72_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-72-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 39초; log=soak_72_redaction.log | pass | summary.steps 원순서 |
| soak-72-runtime-idle | `runtime idle check`; 0초; log=soak_72_runtime_idle.json | pass | summary.steps 원순서 |
| soak-73-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 34초; log=soak_73_va_events.log | pass | summary.steps 원순서 |
| soak-73-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_73_event_post_schema.log | pass | summary.steps 원순서 |
| soak-73-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 4초; log=soak_73_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-73-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 41초; log=soak_73_redaction.log | pass | summary.steps 원순서 |
| soak-73-runtime-idle | `runtime idle check`; 0초; log=soak_73_runtime_idle.json | pass | summary.steps 원순서 |
| soak-74-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 34초; log=soak_74_va_events.log | pass | summary.steps 원순서 |
| soak-74-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_74_event_post_schema.log | pass | summary.steps 원순서 |
| soak-74-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 4초; log=soak_74_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-74-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 40초; log=soak_74_redaction.log | pass | summary.steps 원순서 |
| soak-74-runtime-idle | `runtime idle check`; 0초; log=soak_74_runtime_idle.json | pass | summary.steps 원순서 |
| soak-75-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 34초; log=soak_75_va_events.log | pass | summary.steps 원순서 |
| soak-75-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_75_event_post_schema.log | pass | summary.steps 원순서 |
| soak-75-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 4초; log=soak_75_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-75-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 40초; log=soak_75_redaction.log | pass | summary.steps 원순서 |
| soak-75-runtime-idle | `runtime idle check`; 0초; log=soak_75_runtime_idle.json | pass | summary.steps 원순서 |
| soak-76-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 34초; log=soak_76_va_events.log | pass | summary.steps 원순서 |
| soak-76-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_76_event_post_schema.log | pass | summary.steps 원순서 |
| soak-76-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 4초; log=soak_76_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-76-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 40초; log=soak_76_redaction.log | pass | summary.steps 원순서 |
| soak-76-runtime-idle | `runtime idle check`; 0초; log=soak_76_runtime_idle.json | pass | summary.steps 원순서 |
| soak-77-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 34초; log=soak_77_va_events.log | pass | summary.steps 원순서 |
| soak-77-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_77_event_post_schema.log | pass | summary.steps 원순서 |
| soak-77-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 4초; log=soak_77_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-77-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 40초; log=soak_77_redaction.log | pass | summary.steps 원순서 |
| soak-77-runtime-idle | `runtime idle check`; 0초; log=soak_77_runtime_idle.json | pass | summary.steps 원순서 |
| soak-78-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 34초; log=soak_78_va_events.log | pass | summary.steps 원순서 |
| soak-78-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_78_event_post_schema.log | pass | summary.steps 원순서 |
| soak-78-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 4초; log=soak_78_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-78-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 40초; log=soak_78_redaction.log | pass | summary.steps 원순서 |
| soak-78-runtime-idle | `runtime idle check`; 0초; log=soak_78_runtime_idle.json | pass | summary.steps 원순서 |
| soak-79-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 35초; log=soak_79_va_events.log | pass | summary.steps 원순서 |
| soak-79-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_79_event_post_schema.log | pass | summary.steps 원순서 |
| soak-79-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 4초; log=soak_79_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-79-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 39초; log=soak_79_redaction.log | pass | summary.steps 원순서 |
| soak-79-runtime-idle | `runtime idle check`; 0초; log=soak_79_runtime_idle.json | pass | summary.steps 원순서 |
| soak-80-va-events | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=30 ./server.sh verify-va-events --duration 30`; 34초; log=soak_80_va_events.log | pass | summary.steps 원순서 |
| soak-80-event-post-schema | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode schema`; 3초; log=soak_80_event_post_schema.log | pass | summary.steps 원순서 |
| soak-80-event-post-recovery | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode recovery`; 4초; log=soak_80_event_post_recovery.log | pass | summary.steps 원순서 |
| soak-80-redaction | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE=[URL 가림] MEDIA_SERVER_VERIFY_VA_HTTP_BASE=[URL 가림] ./server.sh verify-redaction --live-only --duration 12`; 41초; log=soak_80_redaction.log | pass | summary.steps 원순서 |
| soak-80-runtime-idle | `runtime idle check`; 0초; log=soak_80_runtime_idle.json | pass | summary.steps 원순서 |
| main-runtime-idle | `runtime idle check`; 0초; log=main_runtime_idle.json | pass | summary.steps 원순서 |
| server-start-queue-2 | `run_server_foreground`; 0초; log=server.log | pass | summary.steps 원순서 |
| event-post-queue | `MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=[URL 가림] ./server.sh verify-event-post --mode queue`; 4초; log=event_post_queue.log | pass | summary.steps 원순서 |
| queue-runtime-idle | `runtime idle check`; 0초; log=queue_runtime_idle.json | pass | summary.steps 원순서 |
| ports-clean | `lsof predev ports`; 0초; log=ports-clean.log | pass | summary.steps 원순서 |
| summary-report | `./server.sh summarize-reports /private/tmp/s09-predev120-rQnWAb/predev-summary.json --output /private/tmp/s09-predev120-rQnWAb/predev-report.md --html-output /private/tmp/s09-predev120-rQnWAb/predev-report.html `; 1초; log=summary_report.log | pass | summary.steps 원순서 |

## Outer skip 별도 기록

| 제목 | 수행내용 | 제외·미실행 경계 |
| --- | --- | --- |
| external-turn-hard-gate | 원상태 skip | 외부 실행 비승인 제외, PASS 아님 |

## Child command 전수

| 로그 | 실제 실행 명령 |
| --- | --- |
| 1-static-scripts.log | `bash -n server.sh scripts/internal/*.sh` |
| 2-script-inventory.log | `./server.sh verify-script-inventory` |
| 3-code-comments.log | `./server.sh verify-code-comments` |
| 4-docs-links.log | `./server.sh verify-docs-links` |
| 5-config-json.log | `python3 -m json.tool config/codec_test_sources.json >/dev/null` |
| 6-report-summary.log | `./server.sh summarize-reports /Users/dhseo/Workspace/mediaServer/.media_server.test/20260911-093000/test-summary.json --output /Users/dhseo/Workspace/mediaServer/.media_server.test/20260911-093000/verification_report.md --html-output /Users/dhseo/Workspace/mediaServer/.media_server.test/20260911-093000/verification_report.html ` |
| 7-status.log | `./server.sh status` |
| 8-diagnose.log | `./server.sh diagnose` |
| 9-codec-file_local_h264_aac.log | `MEDIA_SERVER_VERIFY_INCLUDE_EXTERNAL=0 MEDIA_SERVER_VERIFY_SOURCE_FILTER='file_local_h264_aac' ./server.sh verify-codecs` |
| 10-codec-file_local_h265_aac.log | `MEDIA_SERVER_VERIFY_INCLUDE_EXTERNAL=0 MEDIA_SERVER_VERIFY_SOURCE_FILTER='file_local_h265_aac' ./server.sh verify-codecs` |
| 11-codec-rtsp_local_h265_opus.log | `MEDIA_SERVER_VERIFY_INCLUDE_EXTERNAL=0 MEDIA_SERVER_VERIFY_SOURCE_FILTER='rtsp_local_h265_opus' ./server.sh verify-codecs` |
| 12-codec-rtsp_local_h264_pcmu.log | `MEDIA_SERVER_VERIFY_INCLUDE_EXTERNAL=0 MEDIA_SERVER_VERIFY_SOURCE_FILTER='rtsp_local_h264_pcmu' ./server.sh verify-codecs` |
| 13-codec-rtsp_local_h264_pcma.log | `MEDIA_SERVER_VERIFY_INCLUDE_EXTERNAL=0 MEDIA_SERVER_VERIFY_SOURCE_FILTER='rtsp_local_h264_pcma' ./server.sh verify-codecs` |
| 14-codec-webrtc_local_publish_h264_opus.log | `MEDIA_SERVER_VERIFY_INCLUDE_EXTERNAL=0 MEDIA_SERVER_VERIFY_SOURCE_FILTER='webrtc_local_publish_h264_opus' ./server.sh verify-codecs` |
| 15-codec-http_local_h264_aac.log | `MEDIA_SERVER_VERIFY_INCLUDE_EXTERNAL=0 MEDIA_SERVER_VERIFY_SOURCE_FILTER='http_local_h264_aac' ./server.sh verify-codecs` |
| 16-codec-http_local_h264_video_only.log | `MEDIA_SERVER_VERIFY_INCLUDE_EXTERNAL=0 MEDIA_SERVER_VERIFY_SOURCE_FILTER='http_local_h264_video_only' ./server.sh verify-codecs` |
| 17-va-overlay.log | `MEDIA_SERVER_VERIFY_VA_HTTP_BASE='[URL 가림] ./server.sh verify-va` |
| 18-redaction.log | `MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE='[URL 가림] ./server.sh verify-redaction --duration 10` |
| 19-rules-registry.log | `MEDIA_SERVER_TEST_HTTP_BASE='[URL 가림] bash scripts/internal/test_rule_registry.sh` |
| 20-va-tracking-events.log | `MEDIA_SERVER_VERIFY_VA_HTTP_BASE='[URL 가림] ./server.sh verify-va-events` |
| 21-image-analysis.log | `MEDIA_SERVER_VERIFY_IMAGE_HTTP_BASE='[URL 가림] ./server.sh verify-image-analysis` |

## Child direct 결과 전수

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| [통과] 스크립트 문법 검사 | [통과] 스크립트 문법 검사 | pass | integrated 원결과 |
| [통과] server.sh 명령/script inventory 검사 | [통과] server.sh 명령/script inventory 검사 | pass | integrated 원결과 |
| [통과] 코드 주석 정책 검사 | [통과] 코드 주석 정책 검사 | pass | integrated 원결과 |
| [통과] 문서 링크/이미지 참조 검사 | [통과] 문서 링크/이미지 참조 검사 | pass | integrated 원결과 |
| [통과] codec test config JSON 검사 | [통과] codec test config JSON 검사 | pass | integrated 원결과 |
| [통과] 진행 중 부분 summary 렌더 smoke | [통과] 진행 중 부분 summary 렌더 smoke | pass | integrated 원결과 |
| [통과] 서버 상태 확인 | [통과] 서버 상태 확인 | pass | integrated 원결과 |
| [통과] 실행환경 진단 | [통과] 실행환경 진단 | pass | integrated 원결과 |
| [통과] codec matrix: file H264/AAC -> RTSP/WebRTC | [통과] codec matrix: file H264/AAC -> RTSP/WebRTC | pass | integrated 원결과 |
| [통과] codec matrix: file H265/AAC -> RTSP/WebRTC | [통과] codec matrix: file H265/AAC -> RTSP/WebRTC | pass | integrated 원결과 |
| [통과] codec matrix: local RTSP H265/Opus -> RTSP/WebRTC | [통과] codec matrix: local RTSP H265/Opus -> RTSP/WebRTC | pass | integrated 원결과 |
| [통과] codec matrix: local RTSP H264/PCMU -> RTSP/WebRTC | [통과] codec matrix: local RTSP H264/PCMU -> RTSP/WebRTC | pass | integrated 원결과 |
| [통과] codec matrix: local RTSP H264/PCMA -> RTSP/WebRTC | [통과] codec matrix: local RTSP H264/PCMA -> RTSP/WebRTC | pass | integrated 원결과 |
| [통과] codec matrix: local WHIP publish -> RTSP/WebRTC | [통과] codec matrix: local WHIP publish -> RTSP/WebRTC | pass | integrated 원결과 |
| [통과] codec matrix: local HTTP URI H264/AAC -> RTSP/WebRTC | [통과] codec matrix: local HTTP URI H264/AAC -> RTSP/WebRTC | pass | integrated 원결과 |
| [통과] codec matrix: local HTTP URI video-only -> RTSP/WebRTC | [통과] codec matrix: local HTTP URI video-only -> RTSP/WebRTC | pass | integrated 원결과 |
| [통과] YOLO/VA overlay 검증 | [통과] YOLO/VA overlay 검증 | pass | integrated 원결과 |
| [통과] 선택 검증: 사람 객체 자동 모자이크 image/live | [통과] 선택 검증: 사람 객체 자동 모자이크 image/live | pass | integrated 원결과 |
| [통과] 선택 검증: profile/rule registry API | [통과] 선택 검증: profile/rule registry API | pass | integrated 원결과 |
| [통과] 선택 검증: VA tracking 이벤트 | [통과] 선택 검증: VA tracking 이벤트 | pass | integrated 원결과 |
| [통과] 선택 검증: 정적 이미지 분석 API + tracking category | [통과] 선택 검증: 정적 이미지 분석 API + tracking category | pass | integrated 원결과 |

Child skip 원문(9개, PASS 아님):

```text
[건너뜀] 서버 자동 시작
[건너뜀] LAN IP 외부 클라이언트 접근성
[건너뜀] 외부 RTSP upstream reachability
[건너뜀] HLS/외부 HTTP URI source
[건너뜀] HTTP/HLS URI 장기 검증 선택 검증
[건너뜀] event POST 선택 검증
[건너뜀] WebRTC ICE 선택 검증
[건너뜀] Rule/Profile UI 선택 검증
[건너뜀] Product UI smoke 선택 검증
```

## 하위 개별 PASS/FAIL 판정 전수

같은 판정의 stdout/stderr 중복본과 integrated 요약복제는 제외하고 각 실행 canonical .log에서 수집했다. 원파일별 행순서는 보존한다. URL 및 WebRTC 세션 식별자는 가림 처리했다. 판정 자체는 바꾸지 않았다.

| 번호 | 로그 | 실제 판정 줄 | 결과(pass/fail) |
| --- | --- | --- | --- |
| 1 | event_post_queue.log | [pass] HTTP health ok | pass |
| 2 | event_post_queue.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 3 | event_post_queue.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 4 | event_post_queue.log | [pass] rule 저장: 9501 -> /slow | pass |
| 5 | event_post_queue.log | [pass] rule 저장: 9502 -> /slow | pass |
| 6 | event_post_queue.log | [pass] rule 저장: 9503 -> /slow | pass |
| 7 | event_post_queue.log | [pass] rule 저장: 9504 -> /slow | pass |
| 8 | event_post_queue.log | [pass] rule 저장: 9505 -> /slow | pass |
| 9 | event_post_queue.log | [pass] rule 저장: 9506 -> /slow | pass |
| 10 | event_post_queue.log | [pass] analysis tap 생성: analysis-tap-1 | pass |
| 11 | event_post_queue.log | [pass] POST queue 포화 droppedCount 검증 | pass |
| 12 | child/2-script-inventory.log | [pass] dispatch parser recognizes explicit bash and node interpreters | pass |
| 13 | child/2-script-inventory.log | [pass] server.sh dispatch targets exist and are executable | pass |
| 14 | child/2-script-inventory.log | [pass] documented server.sh commands resolve to dispatch table | pass |
| 15 | child/2-script-inventory.log | [pass] tracked scripts are classified and referenced | pass |
| 16 | child/2-script-inventory.log | [pass] project inventory delegates script file inventory to this verifier | pass |
| 17 | child/2-script-inventory.log | [pass] project inventory maps verifier families without duplicating dispatch details | pass |
| 18 | child/2-script-inventory.log | [pass] CMake does not define a separate untracked CTest registry | pass |
| 19 | child/2-script-inventory.log | [pass] test entry scripts are reachable from test_all | pass |
| 20 | child/2-script-inventory.log | [pass] auth verifier has no hardcoded test password defaults | pass |
| 21 | child/2-script-inventory.log | [pass] VA EventRecord dispatch verifier fails early and dispatches every poll by default | pass |
| 22 | child/2-script-inventory.log | [pass] critical verifier pass output avoids grouped feature-result wording | pass |
| 23 | child/2-script-inventory.log | [pass] user-facing JS option parsers reject unknown options | pass |
| 24 | child/8-diagnose.log | [PASS] default sample exists | pass |
| 25 | child/8-diagnose.log | [PASS] sample_h264.mp4 exists | pass |
| 26 | child/8-diagnose.log | [PASS] sample_h265.mp4 exists | pass |
| 27 | child/8-diagnose.log | [PASS] TCP 8555 is listening | pass |
| 28 | child/8-diagnose.log | [PASS] HTTP 8081 is listening | pass |
| 29 | child/8-diagnose.log | [PASS] HTTP health check passed (/health) | pass |
| 30 | child/8-diagnose.log | [PASS] h264 RTSP probe success | pass |
| 31 | child/8-diagnose.log | [PASS] h265 RTSP probe success | pass |
| 32 | child/8-diagnose.log | [PASS] diagnosis: service looks healthy | pass |
| 33 | child/9-codec-file_local_h264_aac.log | [pass] file_local_h264_aac: RTSP /default -> h264/aac | pass |
| 34 | child/9-codec-file_local_h264_aac.log | [pass] file_local_h264_aac: RTSP /h264 -> h264/aac | pass |
| 35 | child/9-codec-file_local_h264_aac.log | [pass] file_local_h264_aac: RTSP /h265 -> hevc/aac | pass |
| 36 | child/9-codec-file_local_h264_aac.log | [pass] file_local_h264_aac: RTSP /opus -> h264/opus | pass |
| 37 | child/9-codec-file_local_h264_aac.log | [pass] file_local_h264_aac: RTSP /h265/opus -> hevc/opus | pass |
| 38 | child/9-codec-file_local_h264_aac.log | [pass] file_local_h264_aac: RTSP /pcmu -> h264/pcm_mulaw | pass |
| 39 | child/9-codec-file_local_h264_aac.log | [pass] file_local_h264_aac: RTSP /h265/pcmu -> hevc/pcm_mulaw | pass |
| 40 | child/9-codec-file_local_h264_aac.log | [pass] file_local_h264_aac: RTSP /pcma -> h264/pcm_alaw | pass |
| 41 | child/9-codec-file_local_h264_aac.log | [pass] file_local_h264_aac: RTSP /h265/pcma -> hevc/pcm_alaw | pass |
| 42 | child/9-codec-file_local_h264_aac.log | [pass] file_local_h264_aac: WebRTC signaling session created ([세션 가림]) | pass |
| 43 | child/10-codec-file_local_h265_aac.log | [pass] file_local_h265_aac: RTSP /default -> h264/aac | pass |
| 44 | child/10-codec-file_local_h265_aac.log | [pass] file_local_h265_aac: RTSP /h264 -> h264/aac | pass |
| 45 | child/10-codec-file_local_h265_aac.log | [pass] file_local_h265_aac: RTSP /h265 -> hevc/aac | pass |
| 46 | child/10-codec-file_local_h265_aac.log | [pass] file_local_h265_aac: RTSP /opus -> h264/opus | pass |
| 47 | child/10-codec-file_local_h265_aac.log | [pass] file_local_h265_aac: RTSP /h265/opus -> hevc/opus | pass |
| 48 | child/10-codec-file_local_h265_aac.log | [pass] file_local_h265_aac: RTSP /pcmu -> h264/pcm_mulaw | pass |
| 49 | child/10-codec-file_local_h265_aac.log | [pass] file_local_h265_aac: RTSP /h265/pcmu -> hevc/pcm_mulaw | pass |
| 50 | child/10-codec-file_local_h265_aac.log | [pass] file_local_h265_aac: RTSP /pcma -> h264/pcm_alaw | pass |
| 51 | child/10-codec-file_local_h265_aac.log | [pass] file_local_h265_aac: RTSP /h265/pcma -> hevc/pcm_alaw | pass |
| 52 | child/10-codec-file_local_h265_aac.log | [pass] file_local_h265_aac: WebRTC signaling session created ([세션 가림]) | pass |
| 53 | child/11-codec-rtsp_local_h265_opus.log | [pass] rtsp_local_h265_opus: RTSP /default -> h264/aac | pass |
| 54 | child/11-codec-rtsp_local_h265_opus.log | [pass] rtsp_local_h265_opus: RTSP /h264 -> h264/aac | pass |
| 55 | child/11-codec-rtsp_local_h265_opus.log | [pass] rtsp_local_h265_opus: RTSP /h265 -> hevc/aac | pass |
| 56 | child/11-codec-rtsp_local_h265_opus.log | [pass] rtsp_local_h265_opus: RTSP /opus -> h264/opus | pass |
| 57 | child/11-codec-rtsp_local_h265_opus.log | [pass] rtsp_local_h265_opus: RTSP /h265/opus -> hevc/opus | pass |
| 58 | child/11-codec-rtsp_local_h265_opus.log | [pass] rtsp_local_h265_opus: RTSP /pcmu -> h264/pcm_mulaw | pass |
| 59 | child/11-codec-rtsp_local_h265_opus.log | [pass] rtsp_local_h265_opus: RTSP /h265/pcmu -> hevc/pcm_mulaw | pass |
| 60 | child/11-codec-rtsp_local_h265_opus.log | [pass] rtsp_local_h265_opus: RTSP /pcma -> h264/pcm_alaw | pass |
| 61 | child/11-codec-rtsp_local_h265_opus.log | [pass] rtsp_local_h265_opus: RTSP /h265/pcma -> hevc/pcm_alaw | pass |
| 62 | child/11-codec-rtsp_local_h265_opus.log | [pass] rtsp_local_h265_opus: WebRTC signaling session created ([세션 가림]) | pass |
| 63 | child/12-codec-rtsp_local_h264_pcmu.log | [pass] rtsp_local_h264_pcmu: RTSP /default -> h264/aac | pass |
| 64 | child/12-codec-rtsp_local_h264_pcmu.log | [pass] rtsp_local_h264_pcmu: RTSP /h264 -> h264/aac | pass |
| 65 | child/12-codec-rtsp_local_h264_pcmu.log | [pass] rtsp_local_h264_pcmu: RTSP /h265 -> hevc/aac | pass |
| 66 | child/12-codec-rtsp_local_h264_pcmu.log | [pass] rtsp_local_h264_pcmu: RTSP /opus -> h264/opus | pass |
| 67 | child/12-codec-rtsp_local_h264_pcmu.log | [pass] rtsp_local_h264_pcmu: RTSP /h265/opus -> hevc/opus | pass |
| 68 | child/12-codec-rtsp_local_h264_pcmu.log | [pass] rtsp_local_h264_pcmu: RTSP /pcmu -> h264/pcm_mulaw | pass |
| 69 | child/12-codec-rtsp_local_h264_pcmu.log | [pass] rtsp_local_h264_pcmu: RTSP /h265/pcmu -> hevc/pcm_mulaw | pass |
| 70 | child/12-codec-rtsp_local_h264_pcmu.log | [pass] rtsp_local_h264_pcmu: RTSP /pcma -> h264/pcm_alaw | pass |
| 71 | child/12-codec-rtsp_local_h264_pcmu.log | [pass] rtsp_local_h264_pcmu: RTSP /h265/pcma -> hevc/pcm_alaw | pass |
| 72 | child/12-codec-rtsp_local_h264_pcmu.log | [pass] rtsp_local_h264_pcmu: WebRTC signaling session created ([세션 가림]) | pass |
| 73 | child/13-codec-rtsp_local_h264_pcma.log | [pass] rtsp_local_h264_pcma: RTSP /default -> h264/aac | pass |
| 74 | child/13-codec-rtsp_local_h264_pcma.log | [pass] rtsp_local_h264_pcma: RTSP /h264 -> h264/aac | pass |
| 75 | child/13-codec-rtsp_local_h264_pcma.log | [pass] rtsp_local_h264_pcma: RTSP /h265 -> hevc/aac | pass |
| 76 | child/13-codec-rtsp_local_h264_pcma.log | [pass] rtsp_local_h264_pcma: RTSP /opus -> h264/opus | pass |
| 77 | child/13-codec-rtsp_local_h264_pcma.log | [pass] rtsp_local_h264_pcma: RTSP /h265/opus -> hevc/opus | pass |
| 78 | child/13-codec-rtsp_local_h264_pcma.log | [pass] rtsp_local_h264_pcma: RTSP /pcmu -> h264/pcm_mulaw | pass |
| 79 | child/13-codec-rtsp_local_h264_pcma.log | [pass] rtsp_local_h264_pcma: RTSP /h265/pcmu -> hevc/pcm_mulaw | pass |
| 80 | child/13-codec-rtsp_local_h264_pcma.log | [pass] rtsp_local_h264_pcma: RTSP /pcma -> h264/pcm_alaw | pass |
| 81 | child/13-codec-rtsp_local_h264_pcma.log | [pass] rtsp_local_h264_pcma: RTSP /h265/pcma -> hevc/pcm_alaw | pass |
| 82 | child/13-codec-rtsp_local_h264_pcma.log | [pass] rtsp_local_h264_pcma: WebRTC signaling session created ([세션 가림]) | pass |
| 83 | child/14-codec-webrtc_local_publish_h264_opus.log | [pass] webrtc_local_publish_h264_opus: WebRTC signaling session created ([세션 가림]) | pass |
| 84 | child/14-codec-webrtc_local_publish_h264_opus.log | [pass] webrtc_local_publish_h264_opus: RTSP /default -> h264/aac | pass |
| 85 | child/14-codec-webrtc_local_publish_h264_opus.log | [pass] webrtc_local_publish_h264_opus: RTSP /h264 -> h264/aac | pass |
| 86 | child/14-codec-webrtc_local_publish_h264_opus.log | [pass] webrtc_local_publish_h264_opus: RTSP /h265 -> hevc/aac | pass |
| 87 | child/14-codec-webrtc_local_publish_h264_opus.log | [pass] webrtc_local_publish_h264_opus: RTSP /opus -> h264/opus | pass |
| 88 | child/15-codec-http_local_h264_aac.log | [pass] http_local_h264_aac: RTSP /default -> h264/aac | pass |
| 89 | child/15-codec-http_local_h264_aac.log | [pass] http_local_h264_aac: RTSP /h264 -> h264/aac | pass |
| 90 | child/15-codec-http_local_h264_aac.log | [pass] http_local_h264_aac: RTSP /opus -> h264/opus | pass |
| 91 | child/15-codec-http_local_h264_aac.log | [pass] http_local_h264_aac: WebRTC signaling session created ([세션 가림]) | pass |
| 92 | child/16-codec-http_local_h264_video_only.log | [pass] http_local_h264_video_only: RTSP /default -> h264/aac | pass |
| 93 | child/16-codec-http_local_h264_video_only.log | [pass] http_local_h264_video_only: RTSP /h264 -> h264/aac | pass |
| 94 | child/16-codec-http_local_h264_video_only.log | [pass] http_local_h264_video_only: RTSP /h265 -> hevc/aac | pass |
| 95 | child/16-codec-http_local_h264_video_only.log | [pass] http_local_h264_video_only: WebRTC signaling session created ([세션 가림]) | pass |
| 96 | child/17-va-overlay.log | [pass] HTTP health ok | pass |
| 97 | child/17-va-overlay.log | [pass] lab YOLO analysis status ok | pass |
| 98 | child/17-va-overlay.log | [pass] lab overlay snapshot ok | pass |
| 99 | child/17-va-overlay.log | [pass] RTSP VA overlay decode ok | pass |
| 100 | child/18-redaction.log | [pass] HTTP health ok | pass |
| 101 | child/18-redaction.log | [pass] runtime idle precheck ok | pass |
| 102 | child/18-redaction.log | [pass] static-redaction pixel diff ok | pass |
| 103 | child/18-redaction.log | [pass] live-va-redaction (32s) | pass |
| 104 | child/20-va-tracking-events.log | [pass] HTTP health ok | pass |
| 105 | child/20-va-tracking-events.log | [pass] rule 저장: 9401 | pass |
| 106 | child/20-va-tracking-events.log | [pass] rule 저장: 9402 | pass |
| 107 | child/20-va-tracking-events.log | [pass] rule 저장: 9403 | pass |
| 108 | child/20-va-tracking-events.log | [pass] rule 저장: 9404 | pass |
| 109 | child/20-va-tracking-events.log | [pass] rule 저장: 9405 | pass |
| 110 | child/20-va-tracking-events.log | [pass] rule 저장: 9406 | pass |
| 111 | child/20-va-tracking-events.log | [pass] rule 저장: 9407 | pass |
| 112 | child/20-va-tracking-events.log | [pass] rule 저장: 9408 | pass |
| 113 | child/20-va-tracking-events.log | [pass] rule 저장: 9409 | pass |
| 114 | child/20-va-tracking-events.log | [pass] rule 저장: 9410 | pass |
| 115 | child/20-va-tracking-events.log | [pass] rule 저장: 9411 | pass |
| 116 | child/20-va-tracking-events.log | [pass] analysis tap 생성: analysis-tap-6 | pass |
| 117 | child/20-va-tracking-events.log | [pass] presence 이벤트 발생 | pass |
| 118 | child/20-va-tracking-events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 119 | child/20-va-tracking-events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 120 | child/20-va-tracking-events.log | [pass] enter 이벤트 발생 | pass |
| 121 | child/20-va-tracking-events.log | [pass] exit 이벤트 발생 | pass |
| 122 | child/20-va-tracking-events.log | [pass] line-left any 이벤트 발생 | pass |
| 123 | child/20-va-tracking-events.log | [pass] line-left forward 이벤트 발생 | pass |
| 124 | child/20-va-tracking-events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 125 | child/20-va-tracking-events.log | [pass] line-right any 이벤트 발생 | pass |
| 126 | child/20-va-tracking-events.log | [pass] line-right forward 이벤트 발생 | pass |
| 127 | child/20-va-tracking-events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 128 | child/20-va-tracking-events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 129 | child/20-va-tracking-events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 130 | child/20-va-tracking-events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 131 | child/20-va-tracking-events.log | [pass] active tap 목록 검증 | pass |
| 132 | child/20-va-tracking-events.log | [pass] snapshot trackCount 검증 | pass |
| 133 | child/20-va-tracking-events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 134 | child/20-va-tracking-events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 135 | child/21-image-analysis.log | [pass] HTTP health ok | pass |
| 136 | child/21-image-analysis.log | [pass] image metadata 분석 결과 확인 | pass |
| 137 | child/21-image-analysis.log | [pass] trackingClasses default person/vehicle 정책 확인 | pass |
| 138 | child/21-image-analysis.log | [pass] trackingClasses empty 추적 비활성 정책 확인 | pass |
| 139 | child/21-image-analysis.log | [pass] trackingClasses animal category 정책 확인 | pass |
| 140 | child/21-image-analysis.log | [pass] trackingClasses road category 정책 확인 | pass |
| 141 | child/21-image-analysis.log | [pass] trackingClasses sports category 정책 확인 | pass |
| 142 | child/21-image-analysis.log | [pass] trackingClasses tableware category 정책 확인 | pass |
| 143 | child/21-image-analysis.log | [pass] trackingClasses food category 정책 확인 | pass |
| 144 | child/21-image-analysis.log | [pass] trackingClasses furniture category 정책 확인 | pass |
| 145 | child/21-image-analysis.log | [pass] trackingClasses device category 정책 확인 | pass |
| 146 | child/21-image-analysis.log | [pass] trackingClasses object category 정책 확인 | pass |
| 147 | child/21-image-analysis.log | [pass] trackingClasses all wildcard 정책 확인 | pass |
| 148 | child/21-image-analysis.log | [pass] trackingClasses mixed animal,car 정책 확인 | pass |
| 149 | child/21-image-analysis.log | [pass] trackingClasses direct traffic light 정책 확인 | pass |
| 150 | child/21-image-analysis.log | [pass] trackingClasses alias vehicles 정책 확인 | pass |
| 151 | child/21-image-analysis.log | [pass] image snapshot JPEG 생성 (921527 bytes) | pass |
| 152 | child/21-image-analysis.log | [pass] image overlay JPEG 생성 (1313754 bytes) | pass |
| 153 | child/21-image-analysis.log | [pass] person mosaic redaction overlay JPEG 생성 (1241628 bytes) | pass |
| 154 | child/21-image-analysis.log | [pass] image path traversal 방어 확인 | pass |
| 155 | soak_1_va_events.log | [pass] HTTP health ok | pass |
| 156 | soak_1_va_events.log | [pass] rule 저장: 9593 | pass |
| 157 | soak_1_va_events.log | [pass] rule 저장: 9594 | pass |
| 158 | soak_1_va_events.log | [pass] rule 저장: 9595 | pass |
| 159 | soak_1_va_events.log | [pass] rule 저장: 9596 | pass |
| 160 | soak_1_va_events.log | [pass] rule 저장: 9597 | pass |
| 161 | soak_1_va_events.log | [pass] rule 저장: 9598 | pass |
| 162 | soak_1_va_events.log | [pass] rule 저장: 9599 | pass |
| 163 | soak_1_va_events.log | [pass] rule 저장: 9600 | pass |
| 164 | soak_1_va_events.log | [pass] rule 저장: 9601 | pass |
| 165 | soak_1_va_events.log | [pass] rule 저장: 9602 | pass |
| 166 | soak_1_va_events.log | [pass] rule 저장: 9603 | pass |
| 167 | soak_1_va_events.log | [pass] analysis tap 생성: analysis-tap-7 | pass |
| 168 | soak_1_va_events.log | [pass] presence 이벤트 발생 | pass |
| 169 | soak_1_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 170 | soak_1_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 171 | soak_1_va_events.log | [pass] enter 이벤트 발생 | pass |
| 172 | soak_1_va_events.log | [pass] exit 이벤트 발생 | pass |
| 173 | soak_1_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 174 | soak_1_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 175 | soak_1_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 176 | soak_1_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 177 | soak_1_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 178 | soak_1_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 179 | soak_1_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 180 | soak_1_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 181 | soak_1_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 182 | soak_1_va_events.log | [pass] active tap 목록 검증 | pass |
| 183 | soak_1_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 184 | soak_1_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 185 | soak_1_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 186 | soak_1_event_post_schema.log | [pass] HTTP health ok | pass |
| 187 | soak_1_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 188 | soak_1_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 189 | soak_1_event_post_schema.log | [pass] rule 저장: 9589 -> /event | pass |
| 190 | soak_1_event_post_schema.log | [pass] rule 저장: 9590 -> /fail | pass |
| 191 | soak_1_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-8 | pass |
| 192 | soak_1_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 193 | soak_1_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 194 | soak_1_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 195 | soak_1_event_post_recovery.log | [pass] HTTP health ok | pass |
| 196 | soak_1_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 197 | soak_1_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 198 | soak_1_event_post_recovery.log | [pass] rule 저장: 9453 -> /flaky | pass |
| 199 | soak_1_event_post_recovery.log | [pass] rule 저장: 9454 -> /flaky | pass |
| 200 | soak_1_event_post_recovery.log | [pass] rule 저장: 9455 -> /flaky | pass |
| 201 | soak_1_event_post_recovery.log | [pass] rule 저장: 9456 -> /flaky | pass |
| 202 | soak_1_event_post_recovery.log | [pass] rule 저장: 9457 -> /flaky | pass |
| 203 | soak_1_event_post_recovery.log | [pass] rule 저장: 9458 -> /flaky | pass |
| 204 | soak_1_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-9 | pass |
| 205 | soak_1_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 206 | soak_1_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 207 | soak_1_redaction.log | [pass] HTTP health ok | pass |
| 208 | soak_1_redaction.log | [pass] runtime idle precheck ok | pass |
| 209 | soak_1_redaction.log | [pass] live-va-redaction (37s) | pass |
| 210 | soak_2_va_events.log | [pass] HTTP health ok | pass |
| 211 | soak_2_va_events.log | [pass] rule 저장: 9689 | pass |
| 212 | soak_2_va_events.log | [pass] rule 저장: 9690 | pass |
| 213 | soak_2_va_events.log | [pass] rule 저장: 9691 | pass |
| 214 | soak_2_va_events.log | [pass] rule 저장: 9692 | pass |
| 215 | soak_2_va_events.log | [pass] rule 저장: 9693 | pass |
| 216 | soak_2_va_events.log | [pass] rule 저장: 9694 | pass |
| 217 | soak_2_va_events.log | [pass] rule 저장: 9695 | pass |
| 218 | soak_2_va_events.log | [pass] rule 저장: 9696 | pass |
| 219 | soak_2_va_events.log | [pass] rule 저장: 9697 | pass |
| 220 | soak_2_va_events.log | [pass] rule 저장: 9698 | pass |
| 221 | soak_2_va_events.log | [pass] rule 저장: 9699 | pass |
| 222 | soak_2_va_events.log | [pass] analysis tap 생성: analysis-tap-12 | pass |
| 223 | soak_2_va_events.log | [pass] presence 이벤트 발생 | pass |
| 224 | soak_2_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 225 | soak_2_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 226 | soak_2_va_events.log | [pass] enter 이벤트 발생 | pass |
| 227 | soak_2_va_events.log | [pass] exit 이벤트 발생 | pass |
| 228 | soak_2_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 229 | soak_2_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 230 | soak_2_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 231 | soak_2_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 232 | soak_2_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 233 | soak_2_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 234 | soak_2_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 235 | soak_2_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 236 | soak_2_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 237 | soak_2_va_events.log | [pass] active tap 목록 검증 | pass |
| 238 | soak_2_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 239 | soak_2_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 240 | soak_2_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 241 | soak_2_event_post_schema.log | [pass] HTTP health ok | pass |
| 242 | soak_2_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 243 | soak_2_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 244 | soak_2_event_post_schema.log | [pass] rule 저장: 9533 -> /event | pass |
| 245 | soak_2_event_post_schema.log | [pass] rule 저장: 9534 -> /fail | pass |
| 246 | soak_2_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-13 | pass |
| 247 | soak_2_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 248 | soak_2_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 249 | soak_2_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 250 | soak_2_event_post_recovery.log | [pass] HTTP health ok | pass |
| 251 | soak_2_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 252 | soak_2_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 253 | soak_2_event_post_recovery.log | [pass] rule 저장: 9333 -> /flaky | pass |
| 254 | soak_2_event_post_recovery.log | [pass] rule 저장: 9334 -> /flaky | pass |
| 255 | soak_2_event_post_recovery.log | [pass] rule 저장: 9335 -> /flaky | pass |
| 256 | soak_2_event_post_recovery.log | [pass] rule 저장: 9336 -> /flaky | pass |
| 257 | soak_2_event_post_recovery.log | [pass] rule 저장: 9337 -> /flaky | pass |
| 258 | soak_2_event_post_recovery.log | [pass] rule 저장: 9338 -> /flaky | pass |
| 259 | soak_2_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-14 | pass |
| 260 | soak_2_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 261 | soak_2_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 262 | soak_2_redaction.log | [pass] HTTP health ok | pass |
| 263 | soak_2_redaction.log | [pass] runtime idle precheck ok | pass |
| 264 | soak_2_redaction.log | [pass] live-va-redaction (36s) | pass |
| 265 | soak_3_va_events.log | [pass] HTTP health ok | pass |
| 266 | soak_3_va_events.log | [pass] rule 저장: 9509 | pass |
| 267 | soak_3_va_events.log | [pass] rule 저장: 9510 | pass |
| 268 | soak_3_va_events.log | [pass] rule 저장: 9511 | pass |
| 269 | soak_3_va_events.log | [pass] rule 저장: 9512 | pass |
| 270 | soak_3_va_events.log | [pass] rule 저장: 9513 | pass |
| 271 | soak_3_va_events.log | [pass] rule 저장: 9514 | pass |
| 272 | soak_3_va_events.log | [pass] rule 저장: 9515 | pass |
| 273 | soak_3_va_events.log | [pass] rule 저장: 9516 | pass |
| 274 | soak_3_va_events.log | [pass] rule 저장: 9517 | pass |
| 275 | soak_3_va_events.log | [pass] rule 저장: 9518 | pass |
| 276 | soak_3_va_events.log | [pass] rule 저장: 9519 | pass |
| 277 | soak_3_va_events.log | [pass] analysis tap 생성: analysis-tap-17 | pass |
| 278 | soak_3_va_events.log | [pass] presence 이벤트 발생 | pass |
| 279 | soak_3_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 280 | soak_3_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 281 | soak_3_va_events.log | [pass] enter 이벤트 발생 | pass |
| 282 | soak_3_va_events.log | [pass] exit 이벤트 발생 | pass |
| 283 | soak_3_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 284 | soak_3_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 285 | soak_3_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 286 | soak_3_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 287 | soak_3_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 288 | soak_3_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 289 | soak_3_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 290 | soak_3_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 291 | soak_3_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 292 | soak_3_va_events.log | [pass] active tap 목록 검증 | pass |
| 293 | soak_3_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 294 | soak_3_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 295 | soak_3_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 296 | soak_3_event_post_schema.log | [pass] HTTP health ok | pass |
| 297 | soak_3_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 298 | soak_3_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 299 | soak_3_event_post_schema.log | [pass] rule 저장: 9453 -> /event | pass |
| 300 | soak_3_event_post_schema.log | [pass] rule 저장: 9454 -> /fail | pass |
| 301 | soak_3_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-18 | pass |
| 302 | soak_3_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 303 | soak_3_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 304 | soak_3_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 305 | soak_3_event_post_recovery.log | [pass] HTTP health ok | pass |
| 306 | soak_3_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 307 | soak_3_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 308 | soak_3_event_post_recovery.log | [pass] rule 저장: 9669 -> /flaky | pass |
| 309 | soak_3_event_post_recovery.log | [pass] rule 저장: 9670 -> /flaky | pass |
| 310 | soak_3_event_post_recovery.log | [pass] rule 저장: 9671 -> /flaky | pass |
| 311 | soak_3_event_post_recovery.log | [pass] rule 저장: 9672 -> /flaky | pass |
| 312 | soak_3_event_post_recovery.log | [pass] rule 저장: 9673 -> /flaky | pass |
| 313 | soak_3_event_post_recovery.log | [pass] rule 저장: 9674 -> /flaky | pass |
| 314 | soak_3_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-19 | pass |
| 315 | soak_3_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 316 | soak_3_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 317 | soak_3_redaction.log | [pass] HTTP health ok | pass |
| 318 | soak_3_redaction.log | [pass] runtime idle precheck ok | pass |
| 319 | soak_3_redaction.log | [pass] live-va-redaction (36s) | pass |
| 320 | soak_4_va_events.log | [pass] HTTP health ok | pass |
| 321 | soak_4_va_events.log | [pass] rule 저장: 9509 | pass |
| 322 | soak_4_va_events.log | [pass] rule 저장: 9510 | pass |
| 323 | soak_4_va_events.log | [pass] rule 저장: 9511 | pass |
| 324 | soak_4_va_events.log | [pass] rule 저장: 9512 | pass |
| 325 | soak_4_va_events.log | [pass] rule 저장: 9513 | pass |
| 326 | soak_4_va_events.log | [pass] rule 저장: 9514 | pass |
| 327 | soak_4_va_events.log | [pass] rule 저장: 9515 | pass |
| 328 | soak_4_va_events.log | [pass] rule 저장: 9516 | pass |
| 329 | soak_4_va_events.log | [pass] rule 저장: 9517 | pass |
| 330 | soak_4_va_events.log | [pass] rule 저장: 9518 | pass |
| 331 | soak_4_va_events.log | [pass] rule 저장: 9519 | pass |
| 332 | soak_4_va_events.log | [pass] analysis tap 생성: analysis-tap-22 | pass |
| 333 | soak_4_va_events.log | [pass] presence 이벤트 발생 | pass |
| 334 | soak_4_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 335 | soak_4_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 336 | soak_4_va_events.log | [pass] enter 이벤트 발생 | pass |
| 337 | soak_4_va_events.log | [pass] exit 이벤트 발생 | pass |
| 338 | soak_4_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 339 | soak_4_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 340 | soak_4_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 341 | soak_4_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 342 | soak_4_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 343 | soak_4_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 344 | soak_4_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 345 | soak_4_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 346 | soak_4_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 347 | soak_4_va_events.log | [pass] active tap 목록 검증 | pass |
| 348 | soak_4_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 349 | soak_4_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 350 | soak_4_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 351 | soak_4_event_post_schema.log | [pass] HTTP health ok | pass |
| 352 | soak_4_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 353 | soak_4_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 354 | soak_4_event_post_schema.log | [pass] rule 저장: 9517 -> /event | pass |
| 355 | soak_4_event_post_schema.log | [pass] rule 저장: 9518 -> /fail | pass |
| 356 | soak_4_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-23 | pass |
| 357 | soak_4_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 358 | soak_4_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 359 | soak_4_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 360 | soak_4_event_post_recovery.log | [pass] HTTP health ok | pass |
| 361 | soak_4_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 362 | soak_4_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 363 | soak_4_event_post_recovery.log | [pass] rule 저장: 9317 -> /flaky | pass |
| 364 | soak_4_event_post_recovery.log | [pass] rule 저장: 9318 -> /flaky | pass |
| 365 | soak_4_event_post_recovery.log | [pass] rule 저장: 9319 -> /flaky | pass |
| 366 | soak_4_event_post_recovery.log | [pass] rule 저장: 9320 -> /flaky | pass |
| 367 | soak_4_event_post_recovery.log | [pass] rule 저장: 9321 -> /flaky | pass |
| 368 | soak_4_event_post_recovery.log | [pass] rule 저장: 9322 -> /flaky | pass |
| 369 | soak_4_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-24 | pass |
| 370 | soak_4_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 371 | soak_4_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 372 | soak_4_redaction.log | [pass] HTTP health ok | pass |
| 373 | soak_4_redaction.log | [pass] runtime idle precheck ok | pass |
| 374 | soak_4_redaction.log | [pass] live-va-redaction (36s) | pass |
| 375 | soak_5_va_events.log | [pass] HTTP health ok | pass |
| 376 | soak_5_va_events.log | [pass] rule 저장: 9437 | pass |
| 377 | soak_5_va_events.log | [pass] rule 저장: 9438 | pass |
| 378 | soak_5_va_events.log | [pass] rule 저장: 9439 | pass |
| 379 | soak_5_va_events.log | [pass] rule 저장: 9440 | pass |
| 380 | soak_5_va_events.log | [pass] rule 저장: 9441 | pass |
| 381 | soak_5_va_events.log | [pass] rule 저장: 9442 | pass |
| 382 | soak_5_va_events.log | [pass] rule 저장: 9443 | pass |
| 383 | soak_5_va_events.log | [pass] rule 저장: 9444 | pass |
| 384 | soak_5_va_events.log | [pass] rule 저장: 9445 | pass |
| 385 | soak_5_va_events.log | [pass] rule 저장: 9446 | pass |
| 386 | soak_5_va_events.log | [pass] rule 저장: 9447 | pass |
| 387 | soak_5_va_events.log | [pass] analysis tap 생성: analysis-tap-27 | pass |
| 388 | soak_5_va_events.log | [pass] presence 이벤트 발생 | pass |
| 389 | soak_5_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 390 | soak_5_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 391 | soak_5_va_events.log | [pass] enter 이벤트 발생 | pass |
| 392 | soak_5_va_events.log | [pass] exit 이벤트 발생 | pass |
| 393 | soak_5_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 394 | soak_5_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 395 | soak_5_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 396 | soak_5_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 397 | soak_5_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 398 | soak_5_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 399 | soak_5_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 400 | soak_5_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 401 | soak_5_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 402 | soak_5_va_events.log | [pass] active tap 목록 검증 | pass |
| 403 | soak_5_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 404 | soak_5_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 405 | soak_5_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 406 | soak_5_event_post_schema.log | [pass] HTTP health ok | pass |
| 407 | soak_5_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 408 | soak_5_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 409 | soak_5_event_post_schema.log | [pass] rule 저장: 9437 -> /event | pass |
| 410 | soak_5_event_post_schema.log | [pass] rule 저장: 9438 -> /fail | pass |
| 411 | soak_5_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-28 | pass |
| 412 | soak_5_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 413 | soak_5_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 414 | soak_5_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 415 | soak_5_event_post_recovery.log | [pass] HTTP health ok | pass |
| 416 | soak_5_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 417 | soak_5_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 418 | soak_5_event_post_recovery.log | [pass] rule 저장: 9637 -> /flaky | pass |
| 419 | soak_5_event_post_recovery.log | [pass] rule 저장: 9638 -> /flaky | pass |
| 420 | soak_5_event_post_recovery.log | [pass] rule 저장: 9639 -> /flaky | pass |
| 421 | soak_5_event_post_recovery.log | [pass] rule 저장: 9640 -> /flaky | pass |
| 422 | soak_5_event_post_recovery.log | [pass] rule 저장: 9641 -> /flaky | pass |
| 423 | soak_5_event_post_recovery.log | [pass] rule 저장: 9642 -> /flaky | pass |
| 424 | soak_5_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-29 | pass |
| 425 | soak_5_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 426 | soak_5_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 427 | soak_5_redaction.log | [pass] HTTP health ok | pass |
| 428 | soak_5_redaction.log | [pass] runtime idle precheck ok | pass |
| 429 | soak_5_redaction.log | [pass] live-va-redaction (37s) | pass |
| 430 | soak_6_va_events.log | [pass] HTTP health ok | pass |
| 431 | soak_6_va_events.log | [pass] rule 저장: 9557 | pass |
| 432 | soak_6_va_events.log | [pass] rule 저장: 9558 | pass |
| 433 | soak_6_va_events.log | [pass] rule 저장: 9559 | pass |
| 434 | soak_6_va_events.log | [pass] rule 저장: 9560 | pass |
| 435 | soak_6_va_events.log | [pass] rule 저장: 9561 | pass |
| 436 | soak_6_va_events.log | [pass] rule 저장: 9562 | pass |
| 437 | soak_6_va_events.log | [pass] rule 저장: 9563 | pass |
| 438 | soak_6_va_events.log | [pass] rule 저장: 9564 | pass |
| 439 | soak_6_va_events.log | [pass] rule 저장: 9565 | pass |
| 440 | soak_6_va_events.log | [pass] rule 저장: 9566 | pass |
| 441 | soak_6_va_events.log | [pass] rule 저장: 9567 | pass |
| 442 | soak_6_va_events.log | [pass] analysis tap 생성: analysis-tap-32 | pass |
| 443 | soak_6_va_events.log | [pass] presence 이벤트 발생 | pass |
| 444 | soak_6_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 445 | soak_6_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 446 | soak_6_va_events.log | [pass] enter 이벤트 발생 | pass |
| 447 | soak_6_va_events.log | [pass] exit 이벤트 발생 | pass |
| 448 | soak_6_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 449 | soak_6_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 450 | soak_6_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 451 | soak_6_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 452 | soak_6_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 453 | soak_6_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 454 | soak_6_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 455 | soak_6_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 456 | soak_6_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 457 | soak_6_va_events.log | [pass] active tap 목록 검증 | pass |
| 458 | soak_6_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 459 | soak_6_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 460 | soak_6_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 461 | soak_6_event_post_schema.log | [pass] HTTP health ok | pass |
| 462 | soak_6_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 463 | soak_6_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 464 | soak_6_event_post_schema.log | [pass] rule 저장: 9677 -> /event | pass |
| 465 | soak_6_event_post_schema.log | [pass] rule 저장: 9678 -> /fail | pass |
| 466 | soak_6_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-33 | pass |
| 467 | soak_6_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 468 | soak_6_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 469 | soak_6_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 470 | soak_6_event_post_recovery.log | [pass] HTTP health ok | pass |
| 471 | soak_6_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 472 | soak_6_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 473 | soak_6_event_post_recovery.log | [pass] rule 저장: 9477 -> /flaky | pass |
| 474 | soak_6_event_post_recovery.log | [pass] rule 저장: 9478 -> /flaky | pass |
| 475 | soak_6_event_post_recovery.log | [pass] rule 저장: 9479 -> /flaky | pass |
| 476 | soak_6_event_post_recovery.log | [pass] rule 저장: 9480 -> /flaky | pass |
| 477 | soak_6_event_post_recovery.log | [pass] rule 저장: 9481 -> /flaky | pass |
| 478 | soak_6_event_post_recovery.log | [pass] rule 저장: 9482 -> /flaky | pass |
| 479 | soak_6_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-34 | pass |
| 480 | soak_6_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 481 | soak_6_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 482 | soak_6_redaction.log | [pass] HTTP health ok | pass |
| 483 | soak_6_redaction.log | [pass] runtime idle precheck ok | pass |
| 484 | soak_6_redaction.log | [pass] live-va-redaction (37s) | pass |
| 485 | soak_7_va_events.log | [pass] HTTP health ok | pass |
| 486 | soak_7_va_events.log | [pass] rule 저장: 9497 | pass |
| 487 | soak_7_va_events.log | [pass] rule 저장: 9498 | pass |
| 488 | soak_7_va_events.log | [pass] rule 저장: 9499 | pass |
| 489 | soak_7_va_events.log | [pass] rule 저장: 9500 | pass |
| 490 | soak_7_va_events.log | [pass] rule 저장: 9501 | pass |
| 491 | soak_7_va_events.log | [pass] rule 저장: 9502 | pass |
| 492 | soak_7_va_events.log | [pass] rule 저장: 9503 | pass |
| 493 | soak_7_va_events.log | [pass] rule 저장: 9504 | pass |
| 494 | soak_7_va_events.log | [pass] rule 저장: 9505 | pass |
| 495 | soak_7_va_events.log | [pass] rule 저장: 9506 | pass |
| 496 | soak_7_va_events.log | [pass] rule 저장: 9507 | pass |
| 497 | soak_7_va_events.log | [pass] analysis tap 생성: analysis-tap-37 | pass |
| 498 | soak_7_va_events.log | [pass] presence 이벤트 발생 | pass |
| 499 | soak_7_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 500 | soak_7_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 501 | soak_7_va_events.log | [pass] enter 이벤트 발생 | pass |
| 502 | soak_7_va_events.log | [pass] exit 이벤트 발생 | pass |
| 503 | soak_7_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 504 | soak_7_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 505 | soak_7_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 506 | soak_7_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 507 | soak_7_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 508 | soak_7_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 509 | soak_7_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 510 | soak_7_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 511 | soak_7_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 512 | soak_7_va_events.log | [pass] active tap 목록 검증 | pass |
| 513 | soak_7_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 514 | soak_7_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 515 | soak_7_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 516 | soak_7_event_post_schema.log | [pass] HTTP health ok | pass |
| 517 | soak_7_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 518 | soak_7_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 519 | soak_7_event_post_schema.log | [pass] rule 저장: 9373 -> /event | pass |
| 520 | soak_7_event_post_schema.log | [pass] rule 저장: 9374 -> /fail | pass |
| 521 | soak_7_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-38 | pass |
| 522 | soak_7_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 523 | soak_7_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 524 | soak_7_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 525 | soak_7_event_post_recovery.log | [pass] HTTP health ok | pass |
| 526 | soak_7_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 527 | soak_7_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 528 | soak_7_event_post_recovery.log | [pass] rule 저장: 9573 -> /flaky | pass |
| 529 | soak_7_event_post_recovery.log | [pass] rule 저장: 9574 -> /flaky | pass |
| 530 | soak_7_event_post_recovery.log | [pass] rule 저장: 9575 -> /flaky | pass |
| 531 | soak_7_event_post_recovery.log | [pass] rule 저장: 9576 -> /flaky | pass |
| 532 | soak_7_event_post_recovery.log | [pass] rule 저장: 9577 -> /flaky | pass |
| 533 | soak_7_event_post_recovery.log | [pass] rule 저장: 9578 -> /flaky | pass |
| 534 | soak_7_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-39 | pass |
| 535 | soak_7_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 536 | soak_7_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 537 | soak_7_redaction.log | [pass] HTTP health ok | pass |
| 538 | soak_7_redaction.log | [pass] runtime idle precheck ok | pass |
| 539 | soak_7_redaction.log | [pass] live-va-redaction (36s) | pass |
| 540 | soak_8_va_events.log | [pass] HTTP health ok | pass |
| 541 | soak_8_va_events.log | [pass] rule 저장: 9605 | pass |
| 542 | soak_8_va_events.log | [pass] rule 저장: 9606 | pass |
| 543 | soak_8_va_events.log | [pass] rule 저장: 9607 | pass |
| 544 | soak_8_va_events.log | [pass] rule 저장: 9608 | pass |
| 545 | soak_8_va_events.log | [pass] rule 저장: 9609 | pass |
| 546 | soak_8_va_events.log | [pass] rule 저장: 9610 | pass |
| 547 | soak_8_va_events.log | [pass] rule 저장: 9611 | pass |
| 548 | soak_8_va_events.log | [pass] rule 저장: 9612 | pass |
| 549 | soak_8_va_events.log | [pass] rule 저장: 9613 | pass |
| 550 | soak_8_va_events.log | [pass] rule 저장: 9614 | pass |
| 551 | soak_8_va_events.log | [pass] rule 저장: 9615 | pass |
| 552 | soak_8_va_events.log | [pass] analysis tap 생성: analysis-tap-42 | pass |
| 553 | soak_8_va_events.log | [pass] presence 이벤트 발생 | pass |
| 554 | soak_8_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 555 | soak_8_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 556 | soak_8_va_events.log | [pass] enter 이벤트 발생 | pass |
| 557 | soak_8_va_events.log | [pass] exit 이벤트 발생 | pass |
| 558 | soak_8_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 559 | soak_8_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 560 | soak_8_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 561 | soak_8_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 562 | soak_8_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 563 | soak_8_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 564 | soak_8_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 565 | soak_8_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 566 | soak_8_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 567 | soak_8_va_events.log | [pass] active tap 목록 검증 | pass |
| 568 | soak_8_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 569 | soak_8_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 570 | soak_8_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 571 | soak_8_event_post_schema.log | [pass] HTTP health ok | pass |
| 572 | soak_8_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 573 | soak_8_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 574 | soak_8_event_post_schema.log | [pass] rule 저장: 9349 -> /event | pass |
| 575 | soak_8_event_post_schema.log | [pass] rule 저장: 9350 -> /fail | pass |
| 576 | soak_8_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-43 | pass |
| 577 | soak_8_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 578 | soak_8_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 579 | soak_8_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 580 | soak_8_event_post_recovery.log | [pass] HTTP health ok | pass |
| 581 | soak_8_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 582 | soak_8_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 583 | soak_8_event_post_recovery.log | [pass] rule 저장: 9565 -> /flaky | pass |
| 584 | soak_8_event_post_recovery.log | [pass] rule 저장: 9566 -> /flaky | pass |
| 585 | soak_8_event_post_recovery.log | [pass] rule 저장: 9567 -> /flaky | pass |
| 586 | soak_8_event_post_recovery.log | [pass] rule 저장: 9568 -> /flaky | pass |
| 587 | soak_8_event_post_recovery.log | [pass] rule 저장: 9569 -> /flaky | pass |
| 588 | soak_8_event_post_recovery.log | [pass] rule 저장: 9570 -> /flaky | pass |
| 589 | soak_8_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-44 | pass |
| 590 | soak_8_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 591 | soak_8_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 592 | soak_8_redaction.log | [pass] HTTP health ok | pass |
| 593 | soak_8_redaction.log | [pass] runtime idle precheck ok | pass |
| 594 | soak_8_redaction.log | [pass] live-va-redaction (36s) | pass |
| 595 | soak_9_va_events.log | [pass] HTTP health ok | pass |
| 596 | soak_9_va_events.log | [pass] rule 저장: 9449 | pass |
| 597 | soak_9_va_events.log | [pass] rule 저장: 9450 | pass |
| 598 | soak_9_va_events.log | [pass] rule 저장: 9451 | pass |
| 599 | soak_9_va_events.log | [pass] rule 저장: 9452 | pass |
| 600 | soak_9_va_events.log | [pass] rule 저장: 9453 | pass |
| 601 | soak_9_va_events.log | [pass] rule 저장: 9454 | pass |
| 602 | soak_9_va_events.log | [pass] rule 저장: 9455 | pass |
| 603 | soak_9_va_events.log | [pass] rule 저장: 9456 | pass |
| 604 | soak_9_va_events.log | [pass] rule 저장: 9457 | pass |
| 605 | soak_9_va_events.log | [pass] rule 저장: 9458 | pass |
| 606 | soak_9_va_events.log | [pass] rule 저장: 9459 | pass |
| 607 | soak_9_va_events.log | [pass] analysis tap 생성: analysis-tap-47 | pass |
| 608 | soak_9_va_events.log | [pass] presence 이벤트 발생 | pass |
| 609 | soak_9_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 610 | soak_9_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 611 | soak_9_va_events.log | [pass] enter 이벤트 발생 | pass |
| 612 | soak_9_va_events.log | [pass] exit 이벤트 발생 | pass |
| 613 | soak_9_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 614 | soak_9_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 615 | soak_9_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 616 | soak_9_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 617 | soak_9_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 618 | soak_9_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 619 | soak_9_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 620 | soak_9_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 621 | soak_9_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 622 | soak_9_va_events.log | [pass] active tap 목록 검증 | pass |
| 623 | soak_9_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 624 | soak_9_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 625 | soak_9_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 626 | soak_9_event_post_schema.log | [pass] HTTP health ok | pass |
| 627 | soak_9_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 628 | soak_9_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 629 | soak_9_event_post_schema.log | [pass] rule 저장: 9669 -> /event | pass |
| 630 | soak_9_event_post_schema.log | [pass] rule 저장: 9670 -> /fail | pass |
| 631 | soak_9_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-48 | pass |
| 632 | soak_9_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 633 | soak_9_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 634 | soak_9_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 635 | soak_9_event_post_recovery.log | [pass] HTTP health ok | pass |
| 636 | soak_9_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 637 | soak_9_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 638 | soak_9_event_post_recovery.log | [pass] rule 저장: 9469 -> /flaky | pass |
| 639 | soak_9_event_post_recovery.log | [pass] rule 저장: 9470 -> /flaky | pass |
| 640 | soak_9_event_post_recovery.log | [pass] rule 저장: 9471 -> /flaky | pass |
| 641 | soak_9_event_post_recovery.log | [pass] rule 저장: 9472 -> /flaky | pass |
| 642 | soak_9_event_post_recovery.log | [pass] rule 저장: 9473 -> /flaky | pass |
| 643 | soak_9_event_post_recovery.log | [pass] rule 저장: 9474 -> /flaky | pass |
| 644 | soak_9_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-49 | pass |
| 645 | soak_9_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 646 | soak_9_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 647 | soak_9_redaction.log | [pass] HTTP health ok | pass |
| 648 | soak_9_redaction.log | [pass] runtime idle precheck ok | pass |
| 649 | soak_9_redaction.log | [pass] live-va-redaction (36s) | pass |
| 650 | soak_10_va_events.log | [pass] HTTP health ok | pass |
| 651 | soak_10_va_events.log | [pass] rule 저장: 9449 | pass |
| 652 | soak_10_va_events.log | [pass] rule 저장: 9450 | pass |
| 653 | soak_10_va_events.log | [pass] rule 저장: 9451 | pass |
| 654 | soak_10_va_events.log | [pass] rule 저장: 9452 | pass |
| 655 | soak_10_va_events.log | [pass] rule 저장: 9453 | pass |
| 656 | soak_10_va_events.log | [pass] rule 저장: 9454 | pass |
| 657 | soak_10_va_events.log | [pass] rule 저장: 9455 | pass |
| 658 | soak_10_va_events.log | [pass] rule 저장: 9456 | pass |
| 659 | soak_10_va_events.log | [pass] rule 저장: 9457 | pass |
| 660 | soak_10_va_events.log | [pass] rule 저장: 9458 | pass |
| 661 | soak_10_va_events.log | [pass] rule 저장: 9459 | pass |
| 662 | soak_10_va_events.log | [pass] analysis tap 생성: analysis-tap-52 | pass |
| 663 | soak_10_va_events.log | [pass] presence 이벤트 발생 | pass |
| 664 | soak_10_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 665 | soak_10_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 666 | soak_10_va_events.log | [pass] enter 이벤트 발생 | pass |
| 667 | soak_10_va_events.log | [pass] exit 이벤트 발생 | pass |
| 668 | soak_10_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 669 | soak_10_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 670 | soak_10_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 671 | soak_10_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 672 | soak_10_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 673 | soak_10_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 674 | soak_10_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 675 | soak_10_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 676 | soak_10_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 677 | soak_10_va_events.log | [pass] active tap 목록 검증 | pass |
| 678 | soak_10_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 679 | soak_10_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 680 | soak_10_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 681 | soak_10_event_post_schema.log | [pass] HTTP health ok | pass |
| 682 | soak_10_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 683 | soak_10_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 684 | soak_10_event_post_schema.log | [pass] rule 저장: 9445 -> /event | pass |
| 685 | soak_10_event_post_schema.log | [pass] rule 저장: 9446 -> /fail | pass |
| 686 | soak_10_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-53 | pass |
| 687 | soak_10_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 688 | soak_10_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 689 | soak_10_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 690 | soak_10_event_post_recovery.log | [pass] HTTP health ok | pass |
| 691 | soak_10_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 692 | soak_10_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 693 | soak_10_event_post_recovery.log | [pass] rule 저장: 9645 -> /flaky | pass |
| 694 | soak_10_event_post_recovery.log | [pass] rule 저장: 9646 -> /flaky | pass |
| 695 | soak_10_event_post_recovery.log | [pass] rule 저장: 9647 -> /flaky | pass |
| 696 | soak_10_event_post_recovery.log | [pass] rule 저장: 9648 -> /flaky | pass |
| 697 | soak_10_event_post_recovery.log | [pass] rule 저장: 9649 -> /flaky | pass |
| 698 | soak_10_event_post_recovery.log | [pass] rule 저장: 9650 -> /flaky | pass |
| 699 | soak_10_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-54 | pass |
| 700 | soak_10_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 701 | soak_10_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 702 | soak_10_redaction.log | [pass] HTTP health ok | pass |
| 703 | soak_10_redaction.log | [pass] runtime idle precheck ok | pass |
| 704 | soak_10_redaction.log | [pass] live-va-redaction (36s) | pass |
| 705 | soak_11_va_events.log | [pass] HTTP health ok | pass |
| 706 | soak_11_va_events.log | [pass] rule 저장: 9557 | pass |
| 707 | soak_11_va_events.log | [pass] rule 저장: 9558 | pass |
| 708 | soak_11_va_events.log | [pass] rule 저장: 9559 | pass |
| 709 | soak_11_va_events.log | [pass] rule 저장: 9560 | pass |
| 710 | soak_11_va_events.log | [pass] rule 저장: 9561 | pass |
| 711 | soak_11_va_events.log | [pass] rule 저장: 9562 | pass |
| 712 | soak_11_va_events.log | [pass] rule 저장: 9563 | pass |
| 713 | soak_11_va_events.log | [pass] rule 저장: 9564 | pass |
| 714 | soak_11_va_events.log | [pass] rule 저장: 9565 | pass |
| 715 | soak_11_va_events.log | [pass] rule 저장: 9566 | pass |
| 716 | soak_11_va_events.log | [pass] rule 저장: 9567 | pass |
| 717 | soak_11_va_events.log | [pass] analysis tap 생성: analysis-tap-57 | pass |
| 718 | soak_11_va_events.log | [pass] presence 이벤트 발생 | pass |
| 719 | soak_11_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 720 | soak_11_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 721 | soak_11_va_events.log | [pass] enter 이벤트 발생 | pass |
| 722 | soak_11_va_events.log | [pass] exit 이벤트 발생 | pass |
| 723 | soak_11_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 724 | soak_11_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 725 | soak_11_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 726 | soak_11_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 727 | soak_11_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 728 | soak_11_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 729 | soak_11_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 730 | soak_11_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 731 | soak_11_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 732 | soak_11_va_events.log | [pass] active tap 목록 검증 | pass |
| 733 | soak_11_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 734 | soak_11_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 735 | soak_11_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 736 | soak_11_event_post_schema.log | [pass] HTTP health ok | pass |
| 737 | soak_11_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 738 | soak_11_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 739 | soak_11_event_post_schema.log | [pass] rule 저장: 9301 -> /event | pass |
| 740 | soak_11_event_post_schema.log | [pass] rule 저장: 9302 -> /fail | pass |
| 741 | soak_11_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-58 | pass |
| 742 | soak_11_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 743 | soak_11_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 744 | soak_11_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 745 | soak_11_event_post_recovery.log | [pass] HTTP health ok | pass |
| 746 | soak_11_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 747 | soak_11_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 748 | soak_11_event_post_recovery.log | [pass] rule 저장: 9501 -> /flaky | pass |
| 749 | soak_11_event_post_recovery.log | [pass] rule 저장: 9502 -> /flaky | pass |
| 750 | soak_11_event_post_recovery.log | [pass] rule 저장: 9503 -> /flaky | pass |
| 751 | soak_11_event_post_recovery.log | [pass] rule 저장: 9504 -> /flaky | pass |
| 752 | soak_11_event_post_recovery.log | [pass] rule 저장: 9505 -> /flaky | pass |
| 753 | soak_11_event_post_recovery.log | [pass] rule 저장: 9506 -> /flaky | pass |
| 754 | soak_11_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-59 | pass |
| 755 | soak_11_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 756 | soak_11_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 757 | soak_11_redaction.log | [pass] HTTP health ok | pass |
| 758 | soak_11_redaction.log | [pass] runtime idle precheck ok | pass |
| 759 | soak_11_redaction.log | [pass] live-va-redaction (36s) | pass |
| 760 | soak_12_va_events.log | [pass] HTTP health ok | pass |
| 761 | soak_12_va_events.log | [pass] rule 저장: 9509 | pass |
| 762 | soak_12_va_events.log | [pass] rule 저장: 9510 | pass |
| 763 | soak_12_va_events.log | [pass] rule 저장: 9511 | pass |
| 764 | soak_12_va_events.log | [pass] rule 저장: 9512 | pass |
| 765 | soak_12_va_events.log | [pass] rule 저장: 9513 | pass |
| 766 | soak_12_va_events.log | [pass] rule 저장: 9514 | pass |
| 767 | soak_12_va_events.log | [pass] rule 저장: 9515 | pass |
| 768 | soak_12_va_events.log | [pass] rule 저장: 9516 | pass |
| 769 | soak_12_va_events.log | [pass] rule 저장: 9517 | pass |
| 770 | soak_12_va_events.log | [pass] rule 저장: 9518 | pass |
| 771 | soak_12_va_events.log | [pass] rule 저장: 9519 | pass |
| 772 | soak_12_va_events.log | [pass] analysis tap 생성: analysis-tap-62 | pass |
| 773 | soak_12_va_events.log | [pass] presence 이벤트 발생 | pass |
| 774 | soak_12_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 775 | soak_12_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 776 | soak_12_va_events.log | [pass] enter 이벤트 발생 | pass |
| 777 | soak_12_va_events.log | [pass] exit 이벤트 발생 | pass |
| 778 | soak_12_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 779 | soak_12_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 780 | soak_12_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 781 | soak_12_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 782 | soak_12_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 783 | soak_12_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 784 | soak_12_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 785 | soak_12_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 786 | soak_12_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 787 | soak_12_va_events.log | [pass] active tap 목록 검증 | pass |
| 788 | soak_12_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 789 | soak_12_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 790 | soak_12_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 791 | soak_12_event_post_schema.log | [pass] HTTP health ok | pass |
| 792 | soak_12_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 793 | soak_12_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 794 | soak_12_event_post_schema.log | [pass] rule 저장: 9381 -> /event | pass |
| 795 | soak_12_event_post_schema.log | [pass] rule 저장: 9382 -> /fail | pass |
| 796 | soak_12_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-63 | pass |
| 797 | soak_12_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 798 | soak_12_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 799 | soak_12_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 800 | soak_12_event_post_recovery.log | [pass] HTTP health ok | pass |
| 801 | soak_12_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 802 | soak_12_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 803 | soak_12_event_post_recovery.log | [pass] rule 저장: 9581 -> /flaky | pass |
| 804 | soak_12_event_post_recovery.log | [pass] rule 저장: 9582 -> /flaky | pass |
| 805 | soak_12_event_post_recovery.log | [pass] rule 저장: 9583 -> /flaky | pass |
| 806 | soak_12_event_post_recovery.log | [pass] rule 저장: 9584 -> /flaky | pass |
| 807 | soak_12_event_post_recovery.log | [pass] rule 저장: 9585 -> /flaky | pass |
| 808 | soak_12_event_post_recovery.log | [pass] rule 저장: 9586 -> /flaky | pass |
| 809 | soak_12_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-64 | pass |
| 810 | soak_12_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 811 | soak_12_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 812 | soak_12_redaction.log | [pass] HTTP health ok | pass |
| 813 | soak_12_redaction.log | [pass] runtime idle precheck ok | pass |
| 814 | soak_12_redaction.log | [pass] live-va-redaction (37s) | pass |
| 815 | soak_13_va_events.log | [pass] HTTP health ok | pass |
| 816 | soak_13_va_events.log | [pass] rule 저장: 9401 | pass |
| 817 | soak_13_va_events.log | [pass] rule 저장: 9402 | pass |
| 818 | soak_13_va_events.log | [pass] rule 저장: 9403 | pass |
| 819 | soak_13_va_events.log | [pass] rule 저장: 9404 | pass |
| 820 | soak_13_va_events.log | [pass] rule 저장: 9405 | pass |
| 821 | soak_13_va_events.log | [pass] rule 저장: 9406 | pass |
| 822 | soak_13_va_events.log | [pass] rule 저장: 9407 | pass |
| 823 | soak_13_va_events.log | [pass] rule 저장: 9408 | pass |
| 824 | soak_13_va_events.log | [pass] rule 저장: 9409 | pass |
| 825 | soak_13_va_events.log | [pass] rule 저장: 9410 | pass |
| 826 | soak_13_va_events.log | [pass] rule 저장: 9411 | pass |
| 827 | soak_13_va_events.log | [pass] analysis tap 생성: analysis-tap-67 | pass |
| 828 | soak_13_va_events.log | [pass] presence 이벤트 발생 | pass |
| 829 | soak_13_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 830 | soak_13_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 831 | soak_13_va_events.log | [pass] enter 이벤트 발생 | pass |
| 832 | soak_13_va_events.log | [pass] exit 이벤트 발생 | pass |
| 833 | soak_13_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 834 | soak_13_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 835 | soak_13_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 836 | soak_13_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 837 | soak_13_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 838 | soak_13_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 839 | soak_13_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 840 | soak_13_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 841 | soak_13_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 842 | soak_13_va_events.log | [pass] active tap 목록 검증 | pass |
| 843 | soak_13_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 844 | soak_13_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 845 | soak_13_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 846 | soak_13_event_post_schema.log | [pass] HTTP health ok | pass |
| 847 | soak_13_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 848 | soak_13_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 849 | soak_13_event_post_schema.log | [pass] rule 저장: 9693 -> /event | pass |
| 850 | soak_13_event_post_schema.log | [pass] rule 저장: 9694 -> /fail | pass |
| 851 | soak_13_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-68 | pass |
| 852 | soak_13_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 853 | soak_13_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 854 | soak_13_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 855 | soak_13_event_post_recovery.log | [pass] HTTP health ok | pass |
| 856 | soak_13_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 857 | soak_13_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 858 | soak_13_event_post_recovery.log | [pass] rule 저장: 9493 -> /flaky | pass |
| 859 | soak_13_event_post_recovery.log | [pass] rule 저장: 9494 -> /flaky | pass |
| 860 | soak_13_event_post_recovery.log | [pass] rule 저장: 9495 -> /flaky | pass |
| 861 | soak_13_event_post_recovery.log | [pass] rule 저장: 9496 -> /flaky | pass |
| 862 | soak_13_event_post_recovery.log | [pass] rule 저장: 9497 -> /flaky | pass |
| 863 | soak_13_event_post_recovery.log | [pass] rule 저장: 9498 -> /flaky | pass |
| 864 | soak_13_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-69 | pass |
| 865 | soak_13_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 866 | soak_13_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 867 | soak_13_redaction.log | [pass] HTTP health ok | pass |
| 868 | soak_13_redaction.log | [pass] runtime idle precheck ok | pass |
| 869 | soak_13_redaction.log | [pass] live-va-redaction (36s) | pass |
| 870 | soak_14_va_events.log | [pass] HTTP health ok | pass |
| 871 | soak_14_va_events.log | [pass] rule 저장: 9689 | pass |
| 872 | soak_14_va_events.log | [pass] rule 저장: 9690 | pass |
| 873 | soak_14_va_events.log | [pass] rule 저장: 9691 | pass |
| 874 | soak_14_va_events.log | [pass] rule 저장: 9692 | pass |
| 875 | soak_14_va_events.log | [pass] rule 저장: 9693 | pass |
| 876 | soak_14_va_events.log | [pass] rule 저장: 9694 | pass |
| 877 | soak_14_va_events.log | [pass] rule 저장: 9695 | pass |
| 878 | soak_14_va_events.log | [pass] rule 저장: 9696 | pass |
| 879 | soak_14_va_events.log | [pass] rule 저장: 9697 | pass |
| 880 | soak_14_va_events.log | [pass] rule 저장: 9698 | pass |
| 881 | soak_14_va_events.log | [pass] rule 저장: 9699 | pass |
| 882 | soak_14_va_events.log | [pass] analysis tap 생성: analysis-tap-72 | pass |
| 883 | soak_14_va_events.log | [pass] presence 이벤트 발생 | pass |
| 884 | soak_14_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 885 | soak_14_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 886 | soak_14_va_events.log | [pass] enter 이벤트 발생 | pass |
| 887 | soak_14_va_events.log | [pass] exit 이벤트 발생 | pass |
| 888 | soak_14_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 889 | soak_14_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 890 | soak_14_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 891 | soak_14_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 892 | soak_14_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 893 | soak_14_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 894 | soak_14_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 895 | soak_14_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 896 | soak_14_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 897 | soak_14_va_events.log | [pass] active tap 목록 검증 | pass |
| 898 | soak_14_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 899 | soak_14_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 900 | soak_14_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 901 | soak_14_event_post_schema.log | [pass] HTTP health ok | pass |
| 902 | soak_14_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 903 | soak_14_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 904 | soak_14_event_post_schema.log | [pass] rule 저장: 9621 -> /event | pass |
| 905 | soak_14_event_post_schema.log | [pass] rule 저장: 9622 -> /fail | pass |
| 906 | soak_14_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-73 | pass |
| 907 | soak_14_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 908 | soak_14_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 909 | soak_14_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 910 | soak_14_event_post_recovery.log | [pass] HTTP health ok | pass |
| 911 | soak_14_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 912 | soak_14_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 913 | soak_14_event_post_recovery.log | [pass] rule 저장: 9421 -> /flaky | pass |
| 914 | soak_14_event_post_recovery.log | [pass] rule 저장: 9422 -> /flaky | pass |
| 915 | soak_14_event_post_recovery.log | [pass] rule 저장: 9423 -> /flaky | pass |
| 916 | soak_14_event_post_recovery.log | [pass] rule 저장: 9424 -> /flaky | pass |
| 917 | soak_14_event_post_recovery.log | [pass] rule 저장: 9425 -> /flaky | pass |
| 918 | soak_14_event_post_recovery.log | [pass] rule 저장: 9426 -> /flaky | pass |
| 919 | soak_14_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-74 | pass |
| 920 | soak_14_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 921 | soak_14_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 922 | soak_14_redaction.log | [pass] HTTP health ok | pass |
| 923 | soak_14_redaction.log | [pass] runtime idle precheck ok | pass |
| 924 | soak_14_redaction.log | [pass] live-va-redaction (36s) | pass |
| 925 | soak_15_va_events.log | [pass] HTTP health ok | pass |
| 926 | soak_15_va_events.log | [pass] rule 저장: 9545 | pass |
| 927 | soak_15_va_events.log | [pass] rule 저장: 9546 | pass |
| 928 | soak_15_va_events.log | [pass] rule 저장: 9547 | pass |
| 929 | soak_15_va_events.log | [pass] rule 저장: 9548 | pass |
| 930 | soak_15_va_events.log | [pass] rule 저장: 9549 | pass |
| 931 | soak_15_va_events.log | [pass] rule 저장: 9550 | pass |
| 932 | soak_15_va_events.log | [pass] rule 저장: 9551 | pass |
| 933 | soak_15_va_events.log | [pass] rule 저장: 9552 | pass |
| 934 | soak_15_va_events.log | [pass] rule 저장: 9553 | pass |
| 935 | soak_15_va_events.log | [pass] rule 저장: 9554 | pass |
| 936 | soak_15_va_events.log | [pass] rule 저장: 9555 | pass |
| 937 | soak_15_va_events.log | [pass] analysis tap 생성: analysis-tap-77 | pass |
| 938 | soak_15_va_events.log | [pass] presence 이벤트 발생 | pass |
| 939 | soak_15_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 940 | soak_15_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 941 | soak_15_va_events.log | [pass] enter 이벤트 발생 | pass |
| 942 | soak_15_va_events.log | [pass] exit 이벤트 발생 | pass |
| 943 | soak_15_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 944 | soak_15_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 945 | soak_15_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 946 | soak_15_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 947 | soak_15_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 948 | soak_15_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 949 | soak_15_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 950 | soak_15_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 951 | soak_15_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 952 | soak_15_va_events.log | [pass] active tap 목록 검증 | pass |
| 953 | soak_15_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 954 | soak_15_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 955 | soak_15_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 956 | soak_15_event_post_schema.log | [pass] HTTP health ok | pass |
| 957 | soak_15_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 958 | soak_15_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 959 | soak_15_event_post_schema.log | [pass] rule 저장: 9517 -> /event | pass |
| 960 | soak_15_event_post_schema.log | [pass] rule 저장: 9518 -> /fail | pass |
| 961 | soak_15_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-78 | pass |
| 962 | soak_15_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 963 | soak_15_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 964 | soak_15_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 965 | soak_15_event_post_recovery.log | [pass] HTTP health ok | pass |
| 966 | soak_15_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 967 | soak_15_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 968 | soak_15_event_post_recovery.log | [pass] rule 저장: 9317 -> /flaky | pass |
| 969 | soak_15_event_post_recovery.log | [pass] rule 저장: 9318 -> /flaky | pass |
| 970 | soak_15_event_post_recovery.log | [pass] rule 저장: 9319 -> /flaky | pass |
| 971 | soak_15_event_post_recovery.log | [pass] rule 저장: 9320 -> /flaky | pass |
| 972 | soak_15_event_post_recovery.log | [pass] rule 저장: 9321 -> /flaky | pass |
| 973 | soak_15_event_post_recovery.log | [pass] rule 저장: 9322 -> /flaky | pass |
| 974 | soak_15_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-79 | pass |
| 975 | soak_15_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 976 | soak_15_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 977 | soak_15_redaction.log | [pass] HTTP health ok | pass |
| 978 | soak_15_redaction.log | [pass] runtime idle precheck ok | pass |
| 979 | soak_15_redaction.log | [pass] live-va-redaction (36s) | pass |
| 980 | soak_16_va_events.log | [pass] HTTP health ok | pass |
| 981 | soak_16_va_events.log | [pass] rule 저장: 9749 | pass |
| 982 | soak_16_va_events.log | [pass] rule 저장: 9750 | pass |
| 983 | soak_16_va_events.log | [pass] rule 저장: 9751 | pass |
| 984 | soak_16_va_events.log | [pass] rule 저장: 9752 | pass |
| 985 | soak_16_va_events.log | [pass] rule 저장: 9753 | pass |
| 986 | soak_16_va_events.log | [pass] rule 저장: 9754 | pass |
| 987 | soak_16_va_events.log | [pass] rule 저장: 9755 | pass |
| 988 | soak_16_va_events.log | [pass] rule 저장: 9756 | pass |
| 989 | soak_16_va_events.log | [pass] rule 저장: 9757 | pass |
| 990 | soak_16_va_events.log | [pass] rule 저장: 9758 | pass |
| 991 | soak_16_va_events.log | [pass] rule 저장: 9759 | pass |
| 992 | soak_16_va_events.log | [pass] analysis tap 생성: analysis-tap-82 | pass |
| 993 | soak_16_va_events.log | [pass] presence 이벤트 발생 | pass |
| 994 | soak_16_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 995 | soak_16_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 996 | soak_16_va_events.log | [pass] enter 이벤트 발생 | pass |
| 997 | soak_16_va_events.log | [pass] exit 이벤트 발생 | pass |
| 998 | soak_16_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 999 | soak_16_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 1000 | soak_16_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 1001 | soak_16_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 1002 | soak_16_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 1003 | soak_16_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 1004 | soak_16_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 1005 | soak_16_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 1006 | soak_16_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 1007 | soak_16_va_events.log | [pass] active tap 목록 검증 | pass |
| 1008 | soak_16_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 1009 | soak_16_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 1010 | soak_16_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 1011 | soak_16_event_post_schema.log | [pass] HTTP health ok | pass |
| 1012 | soak_16_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 1013 | soak_16_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 1014 | soak_16_event_post_schema.log | [pass] rule 저장: 9429 -> /event | pass |
| 1015 | soak_16_event_post_schema.log | [pass] rule 저장: 9430 -> /fail | pass |
| 1016 | soak_16_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-83 | pass |
| 1017 | soak_16_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 1018 | soak_16_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 1019 | soak_16_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 1020 | soak_16_event_post_recovery.log | [pass] HTTP health ok | pass |
| 1021 | soak_16_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 1022 | soak_16_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 1023 | soak_16_event_post_recovery.log | [pass] rule 저장: 9637 -> /flaky | pass |
| 1024 | soak_16_event_post_recovery.log | [pass] rule 저장: 9638 -> /flaky | pass |
| 1025 | soak_16_event_post_recovery.log | [pass] rule 저장: 9639 -> /flaky | pass |
| 1026 | soak_16_event_post_recovery.log | [pass] rule 저장: 9640 -> /flaky | pass |
| 1027 | soak_16_event_post_recovery.log | [pass] rule 저장: 9641 -> /flaky | pass |
| 1028 | soak_16_event_post_recovery.log | [pass] rule 저장: 9642 -> /flaky | pass |
| 1029 | soak_16_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-84 | pass |
| 1030 | soak_16_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 1031 | soak_16_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 1032 | soak_16_redaction.log | [pass] HTTP health ok | pass |
| 1033 | soak_16_redaction.log | [pass] runtime idle precheck ok | pass |
| 1034 | soak_16_redaction.log | [pass] live-va-redaction (36s) | pass |
| 1035 | soak_17_va_events.log | [pass] HTTP health ok | pass |
| 1036 | soak_17_va_events.log | [pass] rule 저장: 9605 | pass |
| 1037 | soak_17_va_events.log | [pass] rule 저장: 9606 | pass |
| 1038 | soak_17_va_events.log | [pass] rule 저장: 9607 | pass |
| 1039 | soak_17_va_events.log | [pass] rule 저장: 9608 | pass |
| 1040 | soak_17_va_events.log | [pass] rule 저장: 9609 | pass |
| 1041 | soak_17_va_events.log | [pass] rule 저장: 9610 | pass |
| 1042 | soak_17_va_events.log | [pass] rule 저장: 9611 | pass |
| 1043 | soak_17_va_events.log | [pass] rule 저장: 9612 | pass |
| 1044 | soak_17_va_events.log | [pass] rule 저장: 9613 | pass |
| 1045 | soak_17_va_events.log | [pass] rule 저장: 9614 | pass |
| 1046 | soak_17_va_events.log | [pass] rule 저장: 9615 | pass |
| 1047 | soak_17_va_events.log | [pass] analysis tap 생성: analysis-tap-87 | pass |
| 1048 | soak_17_va_events.log | [pass] presence 이벤트 발생 | pass |
| 1049 | soak_17_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 1050 | soak_17_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 1051 | soak_17_va_events.log | [pass] enter 이벤트 발생 | pass |
| 1052 | soak_17_va_events.log | [pass] exit 이벤트 발생 | pass |
| 1053 | soak_17_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 1054 | soak_17_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 1055 | soak_17_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 1056 | soak_17_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 1057 | soak_17_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 1058 | soak_17_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 1059 | soak_17_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 1060 | soak_17_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 1061 | soak_17_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 1062 | soak_17_va_events.log | [pass] active tap 목록 검증 | pass |
| 1063 | soak_17_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 1064 | soak_17_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 1065 | soak_17_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 1066 | soak_17_event_post_schema.log | [pass] HTTP health ok | pass |
| 1067 | soak_17_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 1068 | soak_17_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 1069 | soak_17_event_post_schema.log | [pass] rule 저장: 9629 -> /event | pass |
| 1070 | soak_17_event_post_schema.log | [pass] rule 저장: 9630 -> /fail | pass |
| 1071 | soak_17_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-88 | pass |
| 1072 | soak_17_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 1073 | soak_17_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 1074 | soak_17_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 1075 | soak_17_event_post_recovery.log | [pass] HTTP health ok | pass |
| 1076 | soak_17_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 1077 | soak_17_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 1078 | soak_17_event_post_recovery.log | [pass] rule 저장: 9429 -> /flaky | pass |
| 1079 | soak_17_event_post_recovery.log | [pass] rule 저장: 9430 -> /flaky | pass |
| 1080 | soak_17_event_post_recovery.log | [pass] rule 저장: 9431 -> /flaky | pass |
| 1081 | soak_17_event_post_recovery.log | [pass] rule 저장: 9432 -> /flaky | pass |
| 1082 | soak_17_event_post_recovery.log | [pass] rule 저장: 9433 -> /flaky | pass |
| 1083 | soak_17_event_post_recovery.log | [pass] rule 저장: 9434 -> /flaky | pass |
| 1084 | soak_17_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-89 | pass |
| 1085 | soak_17_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 1086 | soak_17_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 1087 | soak_17_redaction.log | [pass] HTTP health ok | pass |
| 1088 | soak_17_redaction.log | [pass] runtime idle precheck ok | pass |
| 1089 | soak_17_redaction.log | [pass] live-va-redaction (36s) | pass |
| 1090 | soak_18_va_events.log | [pass] HTTP health ok | pass |
| 1091 | soak_18_va_events.log | [pass] rule 저장: 9665 | pass |
| 1092 | soak_18_va_events.log | [pass] rule 저장: 9666 | pass |
| 1093 | soak_18_va_events.log | [pass] rule 저장: 9667 | pass |
| 1094 | soak_18_va_events.log | [pass] rule 저장: 9668 | pass |
| 1095 | soak_18_va_events.log | [pass] rule 저장: 9669 | pass |
| 1096 | soak_18_va_events.log | [pass] rule 저장: 9670 | pass |
| 1097 | soak_18_va_events.log | [pass] rule 저장: 9671 | pass |
| 1098 | soak_18_va_events.log | [pass] rule 저장: 9672 | pass |
| 1099 | soak_18_va_events.log | [pass] rule 저장: 9673 | pass |
| 1100 | soak_18_va_events.log | [pass] rule 저장: 9674 | pass |
| 1101 | soak_18_va_events.log | [pass] rule 저장: 9675 | pass |
| 1102 | soak_18_va_events.log | [pass] analysis tap 생성: analysis-tap-92 | pass |
| 1103 | soak_18_va_events.log | [pass] presence 이벤트 발생 | pass |
| 1104 | soak_18_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 1105 | soak_18_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 1106 | soak_18_va_events.log | [pass] enter 이벤트 발생 | pass |
| 1107 | soak_18_va_events.log | [pass] exit 이벤트 발생 | pass |
| 1108 | soak_18_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 1109 | soak_18_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 1110 | soak_18_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 1111 | soak_18_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 1112 | soak_18_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 1113 | soak_18_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 1114 | soak_18_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 1115 | soak_18_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 1116 | soak_18_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 1117 | soak_18_va_events.log | [pass] active tap 목록 검증 | pass |
| 1118 | soak_18_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 1119 | soak_18_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 1120 | soak_18_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 1121 | soak_18_event_post_schema.log | [pass] HTTP health ok | pass |
| 1122 | soak_18_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 1123 | soak_18_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 1124 | soak_18_event_post_schema.log | [pass] rule 저장: 9525 -> /event | pass |
| 1125 | soak_18_event_post_schema.log | [pass] rule 저장: 9526 -> /fail | pass |
| 1126 | soak_18_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-93 | pass |
| 1127 | soak_18_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 1128 | soak_18_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 1129 | soak_18_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 1130 | soak_18_event_post_recovery.log | [pass] HTTP health ok | pass |
| 1131 | soak_18_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 1132 | soak_18_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 1133 | soak_18_event_post_recovery.log | [pass] rule 저장: 9373 -> /flaky | pass |
| 1134 | soak_18_event_post_recovery.log | [pass] rule 저장: 9374 -> /flaky | pass |
| 1135 | soak_18_event_post_recovery.log | [pass] rule 저장: 9375 -> /flaky | pass |
| 1136 | soak_18_event_post_recovery.log | [pass] rule 저장: 9376 -> /flaky | pass |
| 1137 | soak_18_event_post_recovery.log | [pass] rule 저장: 9377 -> /flaky | pass |
| 1138 | soak_18_event_post_recovery.log | [pass] rule 저장: 9378 -> /flaky | pass |
| 1139 | soak_18_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-94 | pass |
| 1140 | soak_18_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 1141 | soak_18_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 1142 | soak_18_redaction.log | [pass] HTTP health ok | pass |
| 1143 | soak_18_redaction.log | [pass] runtime idle precheck ok | pass |
| 1144 | soak_18_redaction.log | [pass] live-va-redaction (36s) | pass |
| 1145 | soak_19_va_events.log | [pass] HTTP health ok | pass |
| 1146 | soak_19_va_events.log | [pass] rule 저장: 9497 | pass |
| 1147 | soak_19_va_events.log | [pass] rule 저장: 9498 | pass |
| 1148 | soak_19_va_events.log | [pass] rule 저장: 9499 | pass |
| 1149 | soak_19_va_events.log | [pass] rule 저장: 9500 | pass |
| 1150 | soak_19_va_events.log | [pass] rule 저장: 9501 | pass |
| 1151 | soak_19_va_events.log | [pass] rule 저장: 9502 | pass |
| 1152 | soak_19_va_events.log | [pass] rule 저장: 9503 | pass |
| 1153 | soak_19_va_events.log | [pass] rule 저장: 9504 | pass |
| 1154 | soak_19_va_events.log | [pass] rule 저장: 9505 | pass |
| 1155 | soak_19_va_events.log | [pass] rule 저장: 9506 | pass |
| 1156 | soak_19_va_events.log | [pass] rule 저장: 9507 | pass |
| 1157 | soak_19_va_events.log | [pass] analysis tap 생성: analysis-tap-97 | pass |
| 1158 | soak_19_va_events.log | [pass] presence 이벤트 발생 | pass |
| 1159 | soak_19_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 1160 | soak_19_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 1161 | soak_19_va_events.log | [pass] enter 이벤트 발생 | pass |
| 1162 | soak_19_va_events.log | [pass] exit 이벤트 발생 | pass |
| 1163 | soak_19_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 1164 | soak_19_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 1165 | soak_19_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 1166 | soak_19_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 1167 | soak_19_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 1168 | soak_19_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 1169 | soak_19_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 1170 | soak_19_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 1171 | soak_19_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 1172 | soak_19_va_events.log | [pass] active tap 목록 검증 | pass |
| 1173 | soak_19_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 1174 | soak_19_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 1175 | soak_19_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 1176 | soak_19_event_post_schema.log | [pass] HTTP health ok | pass |
| 1177 | soak_19_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 1178 | soak_19_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 1179 | soak_19_event_post_schema.log | [pass] rule 저장: 9325 -> /event | pass |
| 1180 | soak_19_event_post_schema.log | [pass] rule 저장: 9326 -> /fail | pass |
| 1181 | soak_19_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-98 | pass |
| 1182 | soak_19_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 1183 | soak_19_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 1184 | soak_19_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 1185 | soak_19_event_post_recovery.log | [pass] HTTP health ok | pass |
| 1186 | soak_19_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 1187 | soak_19_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 1188 | soak_19_event_post_recovery.log | [pass] rule 저장: 9525 -> /flaky | pass |
| 1189 | soak_19_event_post_recovery.log | [pass] rule 저장: 9526 -> /flaky | pass |
| 1190 | soak_19_event_post_recovery.log | [pass] rule 저장: 9527 -> /flaky | pass |
| 1191 | soak_19_event_post_recovery.log | [pass] rule 저장: 9528 -> /flaky | pass |
| 1192 | soak_19_event_post_recovery.log | [pass] rule 저장: 9529 -> /flaky | pass |
| 1193 | soak_19_event_post_recovery.log | [pass] rule 저장: 9530 -> /flaky | pass |
| 1194 | soak_19_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-99 | pass |
| 1195 | soak_19_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 1196 | soak_19_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 1197 | soak_19_redaction.log | [pass] HTTP health ok | pass |
| 1198 | soak_19_redaction.log | [pass] runtime idle precheck ok | pass |
| 1199 | soak_19_redaction.log | [pass] live-va-redaction (36s) | pass |
| 1200 | soak_20_va_events.log | [pass] HTTP health ok | pass |
| 1201 | soak_20_va_events.log | [pass] rule 저장: 9485 | pass |
| 1202 | soak_20_va_events.log | [pass] rule 저장: 9486 | pass |
| 1203 | soak_20_va_events.log | [pass] rule 저장: 9487 | pass |
| 1204 | soak_20_va_events.log | [pass] rule 저장: 9488 | pass |
| 1205 | soak_20_va_events.log | [pass] rule 저장: 9489 | pass |
| 1206 | soak_20_va_events.log | [pass] rule 저장: 9490 | pass |
| 1207 | soak_20_va_events.log | [pass] rule 저장: 9491 | pass |
| 1208 | soak_20_va_events.log | [pass] rule 저장: 9492 | pass |
| 1209 | soak_20_va_events.log | [pass] rule 저장: 9493 | pass |
| 1210 | soak_20_va_events.log | [pass] rule 저장: 9494 | pass |
| 1211 | soak_20_va_events.log | [pass] rule 저장: 9495 | pass |
| 1212 | soak_20_va_events.log | [pass] analysis tap 생성: analysis-tap-102 | pass |
| 1213 | soak_20_va_events.log | [pass] presence 이벤트 발생 | pass |
| 1214 | soak_20_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 1215 | soak_20_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 1216 | soak_20_va_events.log | [pass] enter 이벤트 발생 | pass |
| 1217 | soak_20_va_events.log | [pass] exit 이벤트 발생 | pass |
| 1218 | soak_20_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 1219 | soak_20_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 1220 | soak_20_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 1221 | soak_20_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 1222 | soak_20_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 1223 | soak_20_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 1224 | soak_20_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 1225 | soak_20_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 1226 | soak_20_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 1227 | soak_20_va_events.log | [pass] active tap 목록 검증 | pass |
| 1228 | soak_20_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 1229 | soak_20_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 1230 | soak_20_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 1231 | soak_20_event_post_schema.log | [pass] HTTP health ok | pass |
| 1232 | soak_20_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 1233 | soak_20_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 1234 | soak_20_event_post_schema.log | [pass] rule 저장: 9357 -> /event | pass |
| 1235 | soak_20_event_post_schema.log | [pass] rule 저장: 9358 -> /fail | pass |
| 1236 | soak_20_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-103 | pass |
| 1237 | soak_20_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 1238 | soak_20_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 1239 | soak_20_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 1240 | soak_20_event_post_recovery.log | [pass] HTTP health ok | pass |
| 1241 | soak_20_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 1242 | soak_20_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 1243 | soak_20_event_post_recovery.log | [pass] rule 저장: 9557 -> /flaky | pass |
| 1244 | soak_20_event_post_recovery.log | [pass] rule 저장: 9558 -> /flaky | pass |
| 1245 | soak_20_event_post_recovery.log | [pass] rule 저장: 9559 -> /flaky | pass |
| 1246 | soak_20_event_post_recovery.log | [pass] rule 저장: 9560 -> /flaky | pass |
| 1247 | soak_20_event_post_recovery.log | [pass] rule 저장: 9561 -> /flaky | pass |
| 1248 | soak_20_event_post_recovery.log | [pass] rule 저장: 9562 -> /flaky | pass |
| 1249 | soak_20_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-104 | pass |
| 1250 | soak_20_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 1251 | soak_20_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 1252 | soak_20_redaction.log | [pass] HTTP health ok | pass |
| 1253 | soak_20_redaction.log | [pass] runtime idle precheck ok | pass |
| 1254 | soak_20_redaction.log | [pass] live-va-redaction (36s) | pass |
| 1255 | soak_21_va_events.log | [pass] HTTP health ok | pass |
| 1256 | soak_21_va_events.log | [pass] rule 저장: 9437 | pass |
| 1257 | soak_21_va_events.log | [pass] rule 저장: 9438 | pass |
| 1258 | soak_21_va_events.log | [pass] rule 저장: 9439 | pass |
| 1259 | soak_21_va_events.log | [pass] rule 저장: 9440 | pass |
| 1260 | soak_21_va_events.log | [pass] rule 저장: 9441 | pass |
| 1261 | soak_21_va_events.log | [pass] rule 저장: 9442 | pass |
| 1262 | soak_21_va_events.log | [pass] rule 저장: 9443 | pass |
| 1263 | soak_21_va_events.log | [pass] rule 저장: 9444 | pass |
| 1264 | soak_21_va_events.log | [pass] rule 저장: 9445 | pass |
| 1265 | soak_21_va_events.log | [pass] rule 저장: 9446 | pass |
| 1266 | soak_21_va_events.log | [pass] rule 저장: 9447 | pass |
| 1267 | soak_21_va_events.log | [pass] analysis tap 생성: analysis-tap-107 | pass |
| 1268 | soak_21_va_events.log | [pass] presence 이벤트 발생 | pass |
| 1269 | soak_21_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 1270 | soak_21_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 1271 | soak_21_va_events.log | [pass] enter 이벤트 발생 | pass |
| 1272 | soak_21_va_events.log | [pass] exit 이벤트 발생 | pass |
| 1273 | soak_21_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 1274 | soak_21_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 1275 | soak_21_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 1276 | soak_21_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 1277 | soak_21_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 1278 | soak_21_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 1279 | soak_21_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 1280 | soak_21_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 1281 | soak_21_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 1282 | soak_21_va_events.log | [pass] active tap 목록 검증 | pass |
| 1283 | soak_21_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 1284 | soak_21_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 1285 | soak_21_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 1286 | soak_21_event_post_schema.log | [pass] HTTP health ok | pass |
| 1287 | soak_21_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 1288 | soak_21_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 1289 | soak_21_event_post_schema.log | [pass] rule 저장: 9573 -> /event | pass |
| 1290 | soak_21_event_post_schema.log | [pass] rule 저장: 9574 -> /fail | pass |
| 1291 | soak_21_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-108 | pass |
| 1292 | soak_21_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 1293 | soak_21_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 1294 | soak_21_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 1295 | soak_21_event_post_recovery.log | [pass] HTTP health ok | pass |
| 1296 | soak_21_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 1297 | soak_21_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 1298 | soak_21_event_post_recovery.log | [pass] rule 저장: 9373 -> /flaky | pass |
| 1299 | soak_21_event_post_recovery.log | [pass] rule 저장: 9374 -> /flaky | pass |
| 1300 | soak_21_event_post_recovery.log | [pass] rule 저장: 9375 -> /flaky | pass |
| 1301 | soak_21_event_post_recovery.log | [pass] rule 저장: 9376 -> /flaky | pass |
| 1302 | soak_21_event_post_recovery.log | [pass] rule 저장: 9377 -> /flaky | pass |
| 1303 | soak_21_event_post_recovery.log | [pass] rule 저장: 9378 -> /flaky | pass |
| 1304 | soak_21_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-109 | pass |
| 1305 | soak_21_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 1306 | soak_21_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 1307 | soak_21_redaction.log | [pass] HTTP health ok | pass |
| 1308 | soak_21_redaction.log | [pass] runtime idle precheck ok | pass |
| 1309 | soak_21_redaction.log | [pass] live-va-redaction (36s) | pass |
| 1310 | soak_22_va_events.log | [pass] HTTP health ok | pass |
| 1311 | soak_22_va_events.log | [pass] rule 저장: 9437 | pass |
| 1312 | soak_22_va_events.log | [pass] rule 저장: 9438 | pass |
| 1313 | soak_22_va_events.log | [pass] rule 저장: 9439 | pass |
| 1314 | soak_22_va_events.log | [pass] rule 저장: 9440 | pass |
| 1315 | soak_22_va_events.log | [pass] rule 저장: 9441 | pass |
| 1316 | soak_22_va_events.log | [pass] rule 저장: 9442 | pass |
| 1317 | soak_22_va_events.log | [pass] rule 저장: 9443 | pass |
| 1318 | soak_22_va_events.log | [pass] rule 저장: 9444 | pass |
| 1319 | soak_22_va_events.log | [pass] rule 저장: 9445 | pass |
| 1320 | soak_22_va_events.log | [pass] rule 저장: 9446 | pass |
| 1321 | soak_22_va_events.log | [pass] rule 저장: 9447 | pass |
| 1322 | soak_22_va_events.log | [pass] analysis tap 생성: analysis-tap-112 | pass |
| 1323 | soak_22_va_events.log | [pass] presence 이벤트 발생 | pass |
| 1324 | soak_22_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 1325 | soak_22_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 1326 | soak_22_va_events.log | [pass] enter 이벤트 발생 | pass |
| 1327 | soak_22_va_events.log | [pass] exit 이벤트 발생 | pass |
| 1328 | soak_22_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 1329 | soak_22_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 1330 | soak_22_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 1331 | soak_22_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 1332 | soak_22_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 1333 | soak_22_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 1334 | soak_22_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 1335 | soak_22_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 1336 | soak_22_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 1337 | soak_22_va_events.log | [pass] active tap 목록 검증 | pass |
| 1338 | soak_22_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 1339 | soak_22_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 1340 | soak_22_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 1341 | soak_22_event_post_schema.log | [pass] HTTP health ok | pass |
| 1342 | soak_22_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 1343 | soak_22_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 1344 | soak_22_event_post_schema.log | [pass] rule 저장: 9341 -> /event | pass |
| 1345 | soak_22_event_post_schema.log | [pass] rule 저장: 9342 -> /fail | pass |
| 1346 | soak_22_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-113 | pass |
| 1347 | soak_22_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 1348 | soak_22_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 1349 | soak_22_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 1350 | soak_22_event_post_recovery.log | [pass] HTTP health ok | pass |
| 1351 | soak_22_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 1352 | soak_22_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 1353 | soak_22_event_post_recovery.log | [pass] rule 저장: 9557 -> /flaky | pass |
| 1354 | soak_22_event_post_recovery.log | [pass] rule 저장: 9558 -> /flaky | pass |
| 1355 | soak_22_event_post_recovery.log | [pass] rule 저장: 9559 -> /flaky | pass |
| 1356 | soak_22_event_post_recovery.log | [pass] rule 저장: 9560 -> /flaky | pass |
| 1357 | soak_22_event_post_recovery.log | [pass] rule 저장: 9561 -> /flaky | pass |
| 1358 | soak_22_event_post_recovery.log | [pass] rule 저장: 9562 -> /flaky | pass |
| 1359 | soak_22_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-114 | pass |
| 1360 | soak_22_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 1361 | soak_22_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 1362 | soak_22_redaction.log | [pass] HTTP health ok | pass |
| 1363 | soak_22_redaction.log | [pass] runtime idle precheck ok | pass |
| 1364 | soak_22_redaction.log | [pass] live-va-redaction (36s) | pass |
| 1365 | soak_23_va_events.log | [pass] HTTP health ok | pass |
| 1366 | soak_23_va_events.log | [pass] rule 저장: 9485 | pass |
| 1367 | soak_23_va_events.log | [pass] rule 저장: 9486 | pass |
| 1368 | soak_23_va_events.log | [pass] rule 저장: 9487 | pass |
| 1369 | soak_23_va_events.log | [pass] rule 저장: 9488 | pass |
| 1370 | soak_23_va_events.log | [pass] rule 저장: 9489 | pass |
| 1371 | soak_23_va_events.log | [pass] rule 저장: 9490 | pass |
| 1372 | soak_23_va_events.log | [pass] rule 저장: 9491 | pass |
| 1373 | soak_23_va_events.log | [pass] rule 저장: 9492 | pass |
| 1374 | soak_23_va_events.log | [pass] rule 저장: 9493 | pass |
| 1375 | soak_23_va_events.log | [pass] rule 저장: 9494 | pass |
| 1376 | soak_23_va_events.log | [pass] rule 저장: 9495 | pass |
| 1377 | soak_23_va_events.log | [pass] analysis tap 생성: analysis-tap-117 | pass |
| 1378 | soak_23_va_events.log | [pass] presence 이벤트 발생 | pass |
| 1379 | soak_23_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 1380 | soak_23_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 1381 | soak_23_va_events.log | [pass] enter 이벤트 발생 | pass |
| 1382 | soak_23_va_events.log | [pass] exit 이벤트 발생 | pass |
| 1383 | soak_23_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 1384 | soak_23_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 1385 | soak_23_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 1386 | soak_23_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 1387 | soak_23_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 1388 | soak_23_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 1389 | soak_23_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 1390 | soak_23_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 1391 | soak_23_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 1392 | soak_23_va_events.log | [pass] active tap 목록 검증 | pass |
| 1393 | soak_23_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 1394 | soak_23_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 1395 | soak_23_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 1396 | soak_23_event_post_schema.log | [pass] HTTP health ok | pass |
| 1397 | soak_23_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 1398 | soak_23_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 1399 | soak_23_event_post_schema.log | [pass] rule 저장: 9469 -> /event | pass |
| 1400 | soak_23_event_post_schema.log | [pass] rule 저장: 9470 -> /fail | pass |
| 1401 | soak_23_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-118 | pass |
| 1402 | soak_23_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 1403 | soak_23_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 1404 | soak_23_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 1405 | soak_23_event_post_recovery.log | [pass] HTTP health ok | pass |
| 1406 | soak_23_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 1407 | soak_23_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 1408 | soak_23_event_post_recovery.log | [pass] rule 저장: 9669 -> /flaky | pass |
| 1409 | soak_23_event_post_recovery.log | [pass] rule 저장: 9670 -> /flaky | pass |
| 1410 | soak_23_event_post_recovery.log | [pass] rule 저장: 9671 -> /flaky | pass |
| 1411 | soak_23_event_post_recovery.log | [pass] rule 저장: 9672 -> /flaky | pass |
| 1412 | soak_23_event_post_recovery.log | [pass] rule 저장: 9673 -> /flaky | pass |
| 1413 | soak_23_event_post_recovery.log | [pass] rule 저장: 9674 -> /flaky | pass |
| 1414 | soak_23_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-119 | pass |
| 1415 | soak_23_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 1416 | soak_23_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 1417 | soak_23_redaction.log | [pass] HTTP health ok | pass |
| 1418 | soak_23_redaction.log | [pass] runtime idle precheck ok | pass |
| 1419 | soak_23_redaction.log | [pass] live-va-redaction (36s) | pass |
| 1420 | soak_24_va_events.log | [pass] HTTP health ok | pass |
| 1421 | soak_24_va_events.log | [pass] rule 저장: 9737 | pass |
| 1422 | soak_24_va_events.log | [pass] rule 저장: 9738 | pass |
| 1423 | soak_24_va_events.log | [pass] rule 저장: 9739 | pass |
| 1424 | soak_24_va_events.log | [pass] rule 저장: 9740 | pass |
| 1425 | soak_24_va_events.log | [pass] rule 저장: 9741 | pass |
| 1426 | soak_24_va_events.log | [pass] rule 저장: 9742 | pass |
| 1427 | soak_24_va_events.log | [pass] rule 저장: 9743 | pass |
| 1428 | soak_24_va_events.log | [pass] rule 저장: 9744 | pass |
| 1429 | soak_24_va_events.log | [pass] rule 저장: 9745 | pass |
| 1430 | soak_24_va_events.log | [pass] rule 저장: 9746 | pass |
| 1431 | soak_24_va_events.log | [pass] rule 저장: 9747 | pass |
| 1432 | soak_24_va_events.log | [pass] analysis tap 생성: analysis-tap-122 | pass |
| 1433 | soak_24_va_events.log | [pass] presence 이벤트 발생 | pass |
| 1434 | soak_24_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 1435 | soak_24_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 1436 | soak_24_va_events.log | [pass] enter 이벤트 발생 | pass |
| 1437 | soak_24_va_events.log | [pass] exit 이벤트 발생 | pass |
| 1438 | soak_24_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 1439 | soak_24_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 1440 | soak_24_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 1441 | soak_24_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 1442 | soak_24_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 1443 | soak_24_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 1444 | soak_24_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 1445 | soak_24_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 1446 | soak_24_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 1447 | soak_24_va_events.log | [pass] active tap 목록 검증 | pass |
| 1448 | soak_24_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 1449 | soak_24_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 1450 | soak_24_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 1451 | soak_24_event_post_schema.log | [pass] HTTP health ok | pass |
| 1452 | soak_24_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 1453 | soak_24_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 1454 | soak_24_event_post_schema.log | [pass] rule 저장: 9365 -> /event | pass |
| 1455 | soak_24_event_post_schema.log | [pass] rule 저장: 9366 -> /fail | pass |
| 1456 | soak_24_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-123 | pass |
| 1457 | soak_24_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 1458 | soak_24_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 1459 | soak_24_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 1460 | soak_24_event_post_recovery.log | [pass] HTTP health ok | pass |
| 1461 | soak_24_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 1462 | soak_24_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 1463 | soak_24_event_post_recovery.log | [pass] rule 저장: 9581 -> /flaky | pass |
| 1464 | soak_24_event_post_recovery.log | [pass] rule 저장: 9582 -> /flaky | pass |
| 1465 | soak_24_event_post_recovery.log | [pass] rule 저장: 9583 -> /flaky | pass |
| 1466 | soak_24_event_post_recovery.log | [pass] rule 저장: 9584 -> /flaky | pass |
| 1467 | soak_24_event_post_recovery.log | [pass] rule 저장: 9585 -> /flaky | pass |
| 1468 | soak_24_event_post_recovery.log | [pass] rule 저장: 9586 -> /flaky | pass |
| 1469 | soak_24_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-124 | pass |
| 1470 | soak_24_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 1471 | soak_24_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 1472 | soak_24_redaction.log | [pass] HTTP health ok | pass |
| 1473 | soak_24_redaction.log | [pass] runtime idle precheck ok | pass |
| 1474 | soak_24_redaction.log | [pass] live-va-redaction (36s) | pass |
| 1475 | soak_25_va_events.log | [pass] HTTP health ok | pass |
| 1476 | soak_25_va_events.log | [pass] rule 저장: 9737 | pass |
| 1477 | soak_25_va_events.log | [pass] rule 저장: 9738 | pass |
| 1478 | soak_25_va_events.log | [pass] rule 저장: 9739 | pass |
| 1479 | soak_25_va_events.log | [pass] rule 저장: 9740 | pass |
| 1480 | soak_25_va_events.log | [pass] rule 저장: 9741 | pass |
| 1481 | soak_25_va_events.log | [pass] rule 저장: 9742 | pass |
| 1482 | soak_25_va_events.log | [pass] rule 저장: 9743 | pass |
| 1483 | soak_25_va_events.log | [pass] rule 저장: 9744 | pass |
| 1484 | soak_25_va_events.log | [pass] rule 저장: 9745 | pass |
| 1485 | soak_25_va_events.log | [pass] rule 저장: 9746 | pass |
| 1486 | soak_25_va_events.log | [pass] rule 저장: 9747 | pass |
| 1487 | soak_25_va_events.log | [pass] analysis tap 생성: analysis-tap-127 | pass |
| 1488 | soak_25_va_events.log | [pass] presence 이벤트 발생 | pass |
| 1489 | soak_25_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 1490 | soak_25_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 1491 | soak_25_va_events.log | [pass] enter 이벤트 발생 | pass |
| 1492 | soak_25_va_events.log | [pass] exit 이벤트 발생 | pass |
| 1493 | soak_25_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 1494 | soak_25_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 1495 | soak_25_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 1496 | soak_25_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 1497 | soak_25_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 1498 | soak_25_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 1499 | soak_25_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 1500 | soak_25_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 1501 | soak_25_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 1502 | soak_25_va_events.log | [pass] active tap 목록 검증 | pass |
| 1503 | soak_25_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 1504 | soak_25_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 1505 | soak_25_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 1506 | soak_25_event_post_schema.log | [pass] HTTP health ok | pass |
| 1507 | soak_25_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 1508 | soak_25_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 1509 | soak_25_event_post_schema.log | [pass] rule 저장: 9533 -> /event | pass |
| 1510 | soak_25_event_post_schema.log | [pass] rule 저장: 9534 -> /fail | pass |
| 1511 | soak_25_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-128 | pass |
| 1512 | soak_25_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 1513 | soak_25_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 1514 | soak_25_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 1515 | soak_25_event_post_recovery.log | [pass] HTTP health ok | pass |
| 1516 | soak_25_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 1517 | soak_25_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 1518 | soak_25_event_post_recovery.log | [pass] rule 저장: 9373 -> /flaky | pass |
| 1519 | soak_25_event_post_recovery.log | [pass] rule 저장: 9374 -> /flaky | pass |
| 1520 | soak_25_event_post_recovery.log | [pass] rule 저장: 9375 -> /flaky | pass |
| 1521 | soak_25_event_post_recovery.log | [pass] rule 저장: 9376 -> /flaky | pass |
| 1522 | soak_25_event_post_recovery.log | [pass] rule 저장: 9377 -> /flaky | pass |
| 1523 | soak_25_event_post_recovery.log | [pass] rule 저장: 9378 -> /flaky | pass |
| 1524 | soak_25_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-129 | pass |
| 1525 | soak_25_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 1526 | soak_25_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 1527 | soak_25_redaction.log | [pass] HTTP health ok | pass |
| 1528 | soak_25_redaction.log | [pass] runtime idle precheck ok | pass |
| 1529 | soak_25_redaction.log | [pass] live-va-redaction (36s) | pass |
| 1530 | soak_26_va_events.log | [pass] HTTP health ok | pass |
| 1531 | soak_26_va_events.log | [pass] rule 저장: 9629 | pass |
| 1532 | soak_26_va_events.log | [pass] rule 저장: 9630 | pass |
| 1533 | soak_26_va_events.log | [pass] rule 저장: 9631 | pass |
| 1534 | soak_26_va_events.log | [pass] rule 저장: 9632 | pass |
| 1535 | soak_26_va_events.log | [pass] rule 저장: 9633 | pass |
| 1536 | soak_26_va_events.log | [pass] rule 저장: 9634 | pass |
| 1537 | soak_26_va_events.log | [pass] rule 저장: 9635 | pass |
| 1538 | soak_26_va_events.log | [pass] rule 저장: 9636 | pass |
| 1539 | soak_26_va_events.log | [pass] rule 저장: 9637 | pass |
| 1540 | soak_26_va_events.log | [pass] rule 저장: 9638 | pass |
| 1541 | soak_26_va_events.log | [pass] rule 저장: 9639 | pass |
| 1542 | soak_26_va_events.log | [pass] analysis tap 생성: analysis-tap-132 | pass |
| 1543 | soak_26_va_events.log | [pass] presence 이벤트 발생 | pass |
| 1544 | soak_26_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 1545 | soak_26_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 1546 | soak_26_va_events.log | [pass] enter 이벤트 발생 | pass |
| 1547 | soak_26_va_events.log | [pass] exit 이벤트 발생 | pass |
| 1548 | soak_26_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 1549 | soak_26_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 1550 | soak_26_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 1551 | soak_26_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 1552 | soak_26_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 1553 | soak_26_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 1554 | soak_26_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 1555 | soak_26_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 1556 | soak_26_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 1557 | soak_26_va_events.log | [pass] active tap 목록 검증 | pass |
| 1558 | soak_26_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 1559 | soak_26_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 1560 | soak_26_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 1561 | soak_26_event_post_schema.log | [pass] HTTP health ok | pass |
| 1562 | soak_26_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 1563 | soak_26_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 1564 | soak_26_event_post_schema.log | [pass] rule 저장: 9461 -> /event | pass |
| 1565 | soak_26_event_post_schema.log | [pass] rule 저장: 9462 -> /fail | pass |
| 1566 | soak_26_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-133 | pass |
| 1567 | soak_26_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 1568 | soak_26_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 1569 | soak_26_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 1570 | soak_26_event_post_recovery.log | [pass] HTTP health ok | pass |
| 1571 | soak_26_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 1572 | soak_26_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 1573 | soak_26_event_post_recovery.log | [pass] rule 저장: 9661 -> /flaky | pass |
| 1574 | soak_26_event_post_recovery.log | [pass] rule 저장: 9662 -> /flaky | pass |
| 1575 | soak_26_event_post_recovery.log | [pass] rule 저장: 9663 -> /flaky | pass |
| 1576 | soak_26_event_post_recovery.log | [pass] rule 저장: 9664 -> /flaky | pass |
| 1577 | soak_26_event_post_recovery.log | [pass] rule 저장: 9665 -> /flaky | pass |
| 1578 | soak_26_event_post_recovery.log | [pass] rule 저장: 9666 -> /flaky | pass |
| 1579 | soak_26_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-134 | pass |
| 1580 | soak_26_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 1581 | soak_26_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 1582 | soak_26_redaction.log | [pass] HTTP health ok | pass |
| 1583 | soak_26_redaction.log | [pass] runtime idle precheck ok | pass |
| 1584 | soak_26_redaction.log | [pass] live-va-redaction (36s) | pass |
| 1585 | soak_27_va_events.log | [pass] HTTP health ok | pass |
| 1586 | soak_27_va_events.log | [pass] rule 저장: 9521 | pass |
| 1587 | soak_27_va_events.log | [pass] rule 저장: 9522 | pass |
| 1588 | soak_27_va_events.log | [pass] rule 저장: 9523 | pass |
| 1589 | soak_27_va_events.log | [pass] rule 저장: 9524 | pass |
| 1590 | soak_27_va_events.log | [pass] rule 저장: 9525 | pass |
| 1591 | soak_27_va_events.log | [pass] rule 저장: 9526 | pass |
| 1592 | soak_27_va_events.log | [pass] rule 저장: 9527 | pass |
| 1593 | soak_27_va_events.log | [pass] rule 저장: 9528 | pass |
| 1594 | soak_27_va_events.log | [pass] rule 저장: 9529 | pass |
| 1595 | soak_27_va_events.log | [pass] rule 저장: 9530 | pass |
| 1596 | soak_27_va_events.log | [pass] rule 저장: 9531 | pass |
| 1597 | soak_27_va_events.log | [pass] analysis tap 생성: analysis-tap-137 | pass |
| 1598 | soak_27_va_events.log | [pass] presence 이벤트 발생 | pass |
| 1599 | soak_27_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 1600 | soak_27_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 1601 | soak_27_va_events.log | [pass] enter 이벤트 발생 | pass |
| 1602 | soak_27_va_events.log | [pass] exit 이벤트 발생 | pass |
| 1603 | soak_27_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 1604 | soak_27_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 1605 | soak_27_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 1606 | soak_27_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 1607 | soak_27_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 1608 | soak_27_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 1609 | soak_27_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 1610 | soak_27_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 1611 | soak_27_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 1612 | soak_27_va_events.log | [pass] active tap 목록 검증 | pass |
| 1613 | soak_27_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 1614 | soak_27_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 1615 | soak_27_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 1616 | soak_27_event_post_schema.log | [pass] HTTP health ok | pass |
| 1617 | soak_27_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 1618 | soak_27_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 1619 | soak_27_event_post_schema.log | [pass] rule 저장: 9341 -> /event | pass |
| 1620 | soak_27_event_post_schema.log | [pass] rule 저장: 9342 -> /fail | pass |
| 1621 | soak_27_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-138 | pass |
| 1622 | soak_27_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 1623 | soak_27_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 1624 | soak_27_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 1625 | soak_27_event_post_recovery.log | [pass] HTTP health ok | pass |
| 1626 | soak_27_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 1627 | soak_27_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 1628 | soak_27_event_post_recovery.log | [pass] rule 저장: 9557 -> /flaky | pass |
| 1629 | soak_27_event_post_recovery.log | [pass] rule 저장: 9558 -> /flaky | pass |
| 1630 | soak_27_event_post_recovery.log | [pass] rule 저장: 9559 -> /flaky | pass |
| 1631 | soak_27_event_post_recovery.log | [pass] rule 저장: 9560 -> /flaky | pass |
| 1632 | soak_27_event_post_recovery.log | [pass] rule 저장: 9561 -> /flaky | pass |
| 1633 | soak_27_event_post_recovery.log | [pass] rule 저장: 9562 -> /flaky | pass |
| 1634 | soak_27_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-139 | pass |
| 1635 | soak_27_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 1636 | soak_27_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 1637 | soak_27_redaction.log | [pass] HTTP health ok | pass |
| 1638 | soak_27_redaction.log | [pass] runtime idle precheck ok | pass |
| 1639 | soak_27_redaction.log | [pass] live-va-redaction (36s) | pass |
| 1640 | soak_28_va_events.log | [pass] HTTP health ok | pass |
| 1641 | soak_28_va_events.log | [pass] rule 저장: 9737 | pass |
| 1642 | soak_28_va_events.log | [pass] rule 저장: 9738 | pass |
| 1643 | soak_28_va_events.log | [pass] rule 저장: 9739 | pass |
| 1644 | soak_28_va_events.log | [pass] rule 저장: 9740 | pass |
| 1645 | soak_28_va_events.log | [pass] rule 저장: 9741 | pass |
| 1646 | soak_28_va_events.log | [pass] rule 저장: 9742 | pass |
| 1647 | soak_28_va_events.log | [pass] rule 저장: 9743 | pass |
| 1648 | soak_28_va_events.log | [pass] rule 저장: 9744 | pass |
| 1649 | soak_28_va_events.log | [pass] rule 저장: 9745 | pass |
| 1650 | soak_28_va_events.log | [pass] rule 저장: 9746 | pass |
| 1651 | soak_28_va_events.log | [pass] rule 저장: 9747 | pass |
| 1652 | soak_28_va_events.log | [pass] analysis tap 생성: analysis-tap-142 | pass |
| 1653 | soak_28_va_events.log | [pass] presence 이벤트 발생 | pass |
| 1654 | soak_28_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 1655 | soak_28_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 1656 | soak_28_va_events.log | [pass] enter 이벤트 발생 | pass |
| 1657 | soak_28_va_events.log | [pass] exit 이벤트 발생 | pass |
| 1658 | soak_28_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 1659 | soak_28_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 1660 | soak_28_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 1661 | soak_28_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 1662 | soak_28_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 1663 | soak_28_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 1664 | soak_28_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 1665 | soak_28_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 1666 | soak_28_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 1667 | soak_28_va_events.log | [pass] active tap 목록 검증 | pass |
| 1668 | soak_28_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 1669 | soak_28_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 1670 | soak_28_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 1671 | soak_28_event_post_schema.log | [pass] HTTP health ok | pass |
| 1672 | soak_28_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 1673 | soak_28_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 1674 | soak_28_event_post_schema.log | [pass] rule 저장: 9605 -> /event | pass |
| 1675 | soak_28_event_post_schema.log | [pass] rule 저장: 9606 -> /fail | pass |
| 1676 | soak_28_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-143 | pass |
| 1677 | soak_28_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 1678 | soak_28_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 1679 | soak_28_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 1680 | soak_28_event_post_recovery.log | [pass] HTTP health ok | pass |
| 1681 | soak_28_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 1682 | soak_28_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 1683 | soak_28_event_post_recovery.log | [pass] rule 저장: 9405 -> /flaky | pass |
| 1684 | soak_28_event_post_recovery.log | [pass] rule 저장: 9406 -> /flaky | pass |
| 1685 | soak_28_event_post_recovery.log | [pass] rule 저장: 9407 -> /flaky | pass |
| 1686 | soak_28_event_post_recovery.log | [pass] rule 저장: 9408 -> /flaky | pass |
| 1687 | soak_28_event_post_recovery.log | [pass] rule 저장: 9409 -> /flaky | pass |
| 1688 | soak_28_event_post_recovery.log | [pass] rule 저장: 9410 -> /flaky | pass |
| 1689 | soak_28_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-144 | pass |
| 1690 | soak_28_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 1691 | soak_28_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 1692 | soak_28_redaction.log | [pass] HTTP health ok | pass |
| 1693 | soak_28_redaction.log | [pass] runtime idle precheck ok | pass |
| 1694 | soak_28_redaction.log | [pass] live-va-redaction (37s) | pass |
| 1695 | soak_29_va_events.log | [pass] HTTP health ok | pass |
| 1696 | soak_29_va_events.log | [pass] rule 저장: 9413 | pass |
| 1697 | soak_29_va_events.log | [pass] rule 저장: 9414 | pass |
| 1698 | soak_29_va_events.log | [pass] rule 저장: 9415 | pass |
| 1699 | soak_29_va_events.log | [pass] rule 저장: 9416 | pass |
| 1700 | soak_29_va_events.log | [pass] rule 저장: 9417 | pass |
| 1701 | soak_29_va_events.log | [pass] rule 저장: 9418 | pass |
| 1702 | soak_29_va_events.log | [pass] rule 저장: 9419 | pass |
| 1703 | soak_29_va_events.log | [pass] rule 저장: 9420 | pass |
| 1704 | soak_29_va_events.log | [pass] rule 저장: 9421 | pass |
| 1705 | soak_29_va_events.log | [pass] rule 저장: 9422 | pass |
| 1706 | soak_29_va_events.log | [pass] rule 저장: 9423 | pass |
| 1707 | soak_29_va_events.log | [pass] analysis tap 생성: analysis-tap-147 | pass |
| 1708 | soak_29_va_events.log | [pass] presence 이벤트 발생 | pass |
| 1709 | soak_29_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 1710 | soak_29_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 1711 | soak_29_va_events.log | [pass] enter 이벤트 발생 | pass |
| 1712 | soak_29_va_events.log | [pass] exit 이벤트 발생 | pass |
| 1713 | soak_29_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 1714 | soak_29_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 1715 | soak_29_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 1716 | soak_29_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 1717 | soak_29_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 1718 | soak_29_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 1719 | soak_29_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 1720 | soak_29_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 1721 | soak_29_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 1722 | soak_29_va_events.log | [pass] active tap 목록 검증 | pass |
| 1723 | soak_29_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 1724 | soak_29_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 1725 | soak_29_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 1726 | soak_29_event_post_schema.log | [pass] HTTP health ok | pass |
| 1727 | soak_29_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 1728 | soak_29_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 1729 | soak_29_event_post_schema.log | [pass] rule 저장: 9565 -> /event | pass |
| 1730 | soak_29_event_post_schema.log | [pass] rule 저장: 9566 -> /fail | pass |
| 1731 | soak_29_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-148 | pass |
| 1732 | soak_29_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 1733 | soak_29_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 1734 | soak_29_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 1735 | soak_29_event_post_recovery.log | [pass] HTTP health ok | pass |
| 1736 | soak_29_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 1737 | soak_29_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 1738 | soak_29_event_post_recovery.log | [pass] rule 저장: 9381 -> /flaky | pass |
| 1739 | soak_29_event_post_recovery.log | [pass] rule 저장: 9382 -> /flaky | pass |
| 1740 | soak_29_event_post_recovery.log | [pass] rule 저장: 9383 -> /flaky | pass |
| 1741 | soak_29_event_post_recovery.log | [pass] rule 저장: 9384 -> /flaky | pass |
| 1742 | soak_29_event_post_recovery.log | [pass] rule 저장: 9385 -> /flaky | pass |
| 1743 | soak_29_event_post_recovery.log | [pass] rule 저장: 9386 -> /flaky | pass |
| 1744 | soak_29_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-149 | pass |
| 1745 | soak_29_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 1746 | soak_29_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 1747 | soak_29_redaction.log | [pass] HTTP health ok | pass |
| 1748 | soak_29_redaction.log | [pass] runtime idle precheck ok | pass |
| 1749 | soak_29_redaction.log | [pass] live-va-redaction (36s) | pass |
| 1750 | soak_30_va_events.log | [pass] HTTP health ok | pass |
| 1751 | soak_30_va_events.log | [pass] rule 저장: 9473 | pass |
| 1752 | soak_30_va_events.log | [pass] rule 저장: 9474 | pass |
| 1753 | soak_30_va_events.log | [pass] rule 저장: 9475 | pass |
| 1754 | soak_30_va_events.log | [pass] rule 저장: 9476 | pass |
| 1755 | soak_30_va_events.log | [pass] rule 저장: 9477 | pass |
| 1756 | soak_30_va_events.log | [pass] rule 저장: 9478 | pass |
| 1757 | soak_30_va_events.log | [pass] rule 저장: 9479 | pass |
| 1758 | soak_30_va_events.log | [pass] rule 저장: 9480 | pass |
| 1759 | soak_30_va_events.log | [pass] rule 저장: 9481 | pass |
| 1760 | soak_30_va_events.log | [pass] rule 저장: 9482 | pass |
| 1761 | soak_30_va_events.log | [pass] rule 저장: 9483 | pass |
| 1762 | soak_30_va_events.log | [pass] analysis tap 생성: analysis-tap-152 | pass |
| 1763 | soak_30_va_events.log | [pass] presence 이벤트 발생 | pass |
| 1764 | soak_30_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 1765 | soak_30_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 1766 | soak_30_va_events.log | [pass] enter 이벤트 발생 | pass |
| 1767 | soak_30_va_events.log | [pass] exit 이벤트 발생 | pass |
| 1768 | soak_30_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 1769 | soak_30_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 1770 | soak_30_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 1771 | soak_30_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 1772 | soak_30_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 1773 | soak_30_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 1774 | soak_30_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 1775 | soak_30_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 1776 | soak_30_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 1777 | soak_30_va_events.log | [pass] active tap 목록 검증 | pass |
| 1778 | soak_30_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 1779 | soak_30_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 1780 | soak_30_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 1781 | soak_30_event_post_schema.log | [pass] HTTP health ok | pass |
| 1782 | soak_30_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 1783 | soak_30_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 1784 | soak_30_event_post_schema.log | [pass] rule 저장: 9357 -> /event | pass |
| 1785 | soak_30_event_post_schema.log | [pass] rule 저장: 9358 -> /fail | pass |
| 1786 | soak_30_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-153 | pass |
| 1787 | soak_30_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 1788 | soak_30_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 1789 | soak_30_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 1790 | soak_30_event_post_recovery.log | [pass] HTTP health ok | pass |
| 1791 | soak_30_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 1792 | soak_30_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 1793 | soak_30_event_post_recovery.log | [pass] rule 저장: 9557 -> /flaky | pass |
| 1794 | soak_30_event_post_recovery.log | [pass] rule 저장: 9558 -> /flaky | pass |
| 1795 | soak_30_event_post_recovery.log | [pass] rule 저장: 9559 -> /flaky | pass |
| 1796 | soak_30_event_post_recovery.log | [pass] rule 저장: 9560 -> /flaky | pass |
| 1797 | soak_30_event_post_recovery.log | [pass] rule 저장: 9561 -> /flaky | pass |
| 1798 | soak_30_event_post_recovery.log | [pass] rule 저장: 9562 -> /flaky | pass |
| 1799 | soak_30_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-154 | pass |
| 1800 | soak_30_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 1801 | soak_30_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 1802 | soak_30_redaction.log | [pass] HTTP health ok | pass |
| 1803 | soak_30_redaction.log | [pass] runtime idle precheck ok | pass |
| 1804 | soak_30_redaction.log | [pass] live-va-redaction (36s) | pass |
| 1805 | soak_31_va_events.log | [pass] HTTP health ok | pass |
| 1806 | soak_31_va_events.log | [pass] rule 저장: 9533 | pass |
| 1807 | soak_31_va_events.log | [pass] rule 저장: 9534 | pass |
| 1808 | soak_31_va_events.log | [pass] rule 저장: 9535 | pass |
| 1809 | soak_31_va_events.log | [pass] rule 저장: 9536 | pass |
| 1810 | soak_31_va_events.log | [pass] rule 저장: 9537 | pass |
| 1811 | soak_31_va_events.log | [pass] rule 저장: 9538 | pass |
| 1812 | soak_31_va_events.log | [pass] rule 저장: 9539 | pass |
| 1813 | soak_31_va_events.log | [pass] rule 저장: 9540 | pass |
| 1814 | soak_31_va_events.log | [pass] rule 저장: 9541 | pass |
| 1815 | soak_31_va_events.log | [pass] rule 저장: 9542 | pass |
| 1816 | soak_31_va_events.log | [pass] rule 저장: 9543 | pass |
| 1817 | soak_31_va_events.log | [pass] analysis tap 생성: analysis-tap-157 | pass |
| 1818 | soak_31_va_events.log | [pass] presence 이벤트 발생 | pass |
| 1819 | soak_31_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 1820 | soak_31_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 1821 | soak_31_va_events.log | [pass] enter 이벤트 발생 | pass |
| 1822 | soak_31_va_events.log | [pass] exit 이벤트 발생 | pass |
| 1823 | soak_31_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 1824 | soak_31_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 1825 | soak_31_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 1826 | soak_31_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 1827 | soak_31_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 1828 | soak_31_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 1829 | soak_31_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 1830 | soak_31_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 1831 | soak_31_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 1832 | soak_31_va_events.log | [pass] active tap 목록 검증 | pass |
| 1833 | soak_31_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 1834 | soak_31_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 1835 | soak_31_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 1836 | soak_31_event_post_schema.log | [pass] HTTP health ok | pass |
| 1837 | soak_31_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 1838 | soak_31_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 1839 | soak_31_event_post_schema.log | [pass] rule 저장: 9605 -> /event | pass |
| 1840 | soak_31_event_post_schema.log | [pass] rule 저장: 9606 -> /fail | pass |
| 1841 | soak_31_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-158 | pass |
| 1842 | soak_31_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 1843 | soak_31_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 1844 | soak_31_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 1845 | soak_31_event_post_recovery.log | [pass] HTTP health ok | pass |
| 1846 | soak_31_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 1847 | soak_31_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 1848 | soak_31_event_post_recovery.log | [pass] rule 저장: 9421 -> /flaky | pass |
| 1849 | soak_31_event_post_recovery.log | [pass] rule 저장: 9422 -> /flaky | pass |
| 1850 | soak_31_event_post_recovery.log | [pass] rule 저장: 9423 -> /flaky | pass |
| 1851 | soak_31_event_post_recovery.log | [pass] rule 저장: 9424 -> /flaky | pass |
| 1852 | soak_31_event_post_recovery.log | [pass] rule 저장: 9425 -> /flaky | pass |
| 1853 | soak_31_event_post_recovery.log | [pass] rule 저장: 9426 -> /flaky | pass |
| 1854 | soak_31_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-159 | pass |
| 1855 | soak_31_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 1856 | soak_31_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 1857 | soak_31_redaction.log | [pass] HTTP health ok | pass |
| 1858 | soak_31_redaction.log | [pass] runtime idle precheck ok | pass |
| 1859 | soak_31_redaction.log | [pass] live-va-redaction (36s) | pass |
| 1860 | soak_32_va_events.log | [pass] HTTP health ok | pass |
| 1861 | soak_32_va_events.log | [pass] rule 저장: 9485 | pass |
| 1862 | soak_32_va_events.log | [pass] rule 저장: 9486 | pass |
| 1863 | soak_32_va_events.log | [pass] rule 저장: 9487 | pass |
| 1864 | soak_32_va_events.log | [pass] rule 저장: 9488 | pass |
| 1865 | soak_32_va_events.log | [pass] rule 저장: 9489 | pass |
| 1866 | soak_32_va_events.log | [pass] rule 저장: 9490 | pass |
| 1867 | soak_32_va_events.log | [pass] rule 저장: 9491 | pass |
| 1868 | soak_32_va_events.log | [pass] rule 저장: 9492 | pass |
| 1869 | soak_32_va_events.log | [pass] rule 저장: 9493 | pass |
| 1870 | soak_32_va_events.log | [pass] rule 저장: 9494 | pass |
| 1871 | soak_32_va_events.log | [pass] rule 저장: 9495 | pass |
| 1872 | soak_32_va_events.log | [pass] analysis tap 생성: analysis-tap-162 | pass |
| 1873 | soak_32_va_events.log | [pass] presence 이벤트 발생 | pass |
| 1874 | soak_32_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 1875 | soak_32_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 1876 | soak_32_va_events.log | [pass] enter 이벤트 발생 | pass |
| 1877 | soak_32_va_events.log | [pass] exit 이벤트 발생 | pass |
| 1878 | soak_32_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 1879 | soak_32_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 1880 | soak_32_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 1881 | soak_32_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 1882 | soak_32_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 1883 | soak_32_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 1884 | soak_32_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 1885 | soak_32_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 1886 | soak_32_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 1887 | soak_32_va_events.log | [pass] active tap 목록 검증 | pass |
| 1888 | soak_32_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 1889 | soak_32_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 1890 | soak_32_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 1891 | soak_32_event_post_schema.log | [pass] HTTP health ok | pass |
| 1892 | soak_32_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 1893 | soak_32_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 1894 | soak_32_event_post_schema.log | [pass] rule 저장: 9453 -> /event | pass |
| 1895 | soak_32_event_post_schema.log | [pass] rule 저장: 9454 -> /fail | pass |
| 1896 | soak_32_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-163 | pass |
| 1897 | soak_32_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 1898 | soak_32_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 1899 | soak_32_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 1900 | soak_32_event_post_recovery.log | [pass] HTTP health ok | pass |
| 1901 | soak_32_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 1902 | soak_32_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 1903 | soak_32_event_post_recovery.log | [pass] rule 저장: 9685 -> /flaky | pass |
| 1904 | soak_32_event_post_recovery.log | [pass] rule 저장: 9686 -> /flaky | pass |
| 1905 | soak_32_event_post_recovery.log | [pass] rule 저장: 9687 -> /flaky | pass |
| 1906 | soak_32_event_post_recovery.log | [pass] rule 저장: 9688 -> /flaky | pass |
| 1907 | soak_32_event_post_recovery.log | [pass] rule 저장: 9689 -> /flaky | pass |
| 1908 | soak_32_event_post_recovery.log | [pass] rule 저장: 9690 -> /flaky | pass |
| 1909 | soak_32_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-164 | pass |
| 1910 | soak_32_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 1911 | soak_32_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 1912 | soak_32_redaction.log | [pass] HTTP health ok | pass |
| 1913 | soak_32_redaction.log | [pass] runtime idle precheck ok | pass |
| 1914 | soak_32_redaction.log | [pass] live-va-redaction (37s) | pass |
| 1915 | soak_33_va_events.log | [pass] HTTP health ok | pass |
| 1916 | soak_33_va_events.log | [pass] rule 저장: 9497 | pass |
| 1917 | soak_33_va_events.log | [pass] rule 저장: 9498 | pass |
| 1918 | soak_33_va_events.log | [pass] rule 저장: 9499 | pass |
| 1919 | soak_33_va_events.log | [pass] rule 저장: 9500 | pass |
| 1920 | soak_33_va_events.log | [pass] rule 저장: 9501 | pass |
| 1921 | soak_33_va_events.log | [pass] rule 저장: 9502 | pass |
| 1922 | soak_33_va_events.log | [pass] rule 저장: 9503 | pass |
| 1923 | soak_33_va_events.log | [pass] rule 저장: 9504 | pass |
| 1924 | soak_33_va_events.log | [pass] rule 저장: 9505 | pass |
| 1925 | soak_33_va_events.log | [pass] rule 저장: 9506 | pass |
| 1926 | soak_33_va_events.log | [pass] rule 저장: 9507 | pass |
| 1927 | soak_33_va_events.log | [pass] analysis tap 생성: analysis-tap-167 | pass |
| 1928 | soak_33_va_events.log | [pass] presence 이벤트 발생 | pass |
| 1929 | soak_33_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 1930 | soak_33_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 1931 | soak_33_va_events.log | [pass] enter 이벤트 발생 | pass |
| 1932 | soak_33_va_events.log | [pass] exit 이벤트 발생 | pass |
| 1933 | soak_33_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 1934 | soak_33_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 1935 | soak_33_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 1936 | soak_33_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 1937 | soak_33_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 1938 | soak_33_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 1939 | soak_33_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 1940 | soak_33_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 1941 | soak_33_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 1942 | soak_33_va_events.log | [pass] active tap 목록 검증 | pass |
| 1943 | soak_33_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 1944 | soak_33_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 1945 | soak_33_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 1946 | soak_33_event_post_schema.log | [pass] HTTP health ok | pass |
| 1947 | soak_33_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 1948 | soak_33_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 1949 | soak_33_event_post_schema.log | [pass] rule 저장: 9389 -> /event | pass |
| 1950 | soak_33_event_post_schema.log | [pass] rule 저장: 9390 -> /fail | pass |
| 1951 | soak_33_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-168 | pass |
| 1952 | soak_33_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 1953 | soak_33_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 1954 | soak_33_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 1955 | soak_33_event_post_recovery.log | [pass] HTTP health ok | pass |
| 1956 | soak_33_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 1957 | soak_33_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 1958 | soak_33_event_post_recovery.log | [pass] rule 저장: 9589 -> /flaky | pass |
| 1959 | soak_33_event_post_recovery.log | [pass] rule 저장: 9590 -> /flaky | pass |
| 1960 | soak_33_event_post_recovery.log | [pass] rule 저장: 9591 -> /flaky | pass |
| 1961 | soak_33_event_post_recovery.log | [pass] rule 저장: 9592 -> /flaky | pass |
| 1962 | soak_33_event_post_recovery.log | [pass] rule 저장: 9593 -> /flaky | pass |
| 1963 | soak_33_event_post_recovery.log | [pass] rule 저장: 9594 -> /flaky | pass |
| 1964 | soak_33_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-169 | pass |
| 1965 | soak_33_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 1966 | soak_33_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 1967 | soak_33_redaction.log | [pass] HTTP health ok | pass |
| 1968 | soak_33_redaction.log | [pass] runtime idle precheck ok | pass |
| 1969 | soak_33_redaction.log | [pass] live-va-redaction (36s) | pass |
| 1970 | soak_34_va_events.log | [pass] HTTP health ok | pass |
| 1971 | soak_34_va_events.log | [pass] rule 저장: 9701 | pass |
| 1972 | soak_34_va_events.log | [pass] rule 저장: 9702 | pass |
| 1973 | soak_34_va_events.log | [pass] rule 저장: 9703 | pass |
| 1974 | soak_34_va_events.log | [pass] rule 저장: 9704 | pass |
| 1975 | soak_34_va_events.log | [pass] rule 저장: 9705 | pass |
| 1976 | soak_34_va_events.log | [pass] rule 저장: 9706 | pass |
| 1977 | soak_34_va_events.log | [pass] rule 저장: 9707 | pass |
| 1978 | soak_34_va_events.log | [pass] rule 저장: 9708 | pass |
| 1979 | soak_34_va_events.log | [pass] rule 저장: 9709 | pass |
| 1980 | soak_34_va_events.log | [pass] rule 저장: 9710 | pass |
| 1981 | soak_34_va_events.log | [pass] rule 저장: 9711 | pass |
| 1982 | soak_34_va_events.log | [pass] analysis tap 생성: analysis-tap-172 | pass |
| 1983 | soak_34_va_events.log | [pass] presence 이벤트 발생 | pass |
| 1984 | soak_34_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 1985 | soak_34_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 1986 | soak_34_va_events.log | [pass] enter 이벤트 발생 | pass |
| 1987 | soak_34_va_events.log | [pass] exit 이벤트 발생 | pass |
| 1988 | soak_34_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 1989 | soak_34_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 1990 | soak_34_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 1991 | soak_34_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 1992 | soak_34_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 1993 | soak_34_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 1994 | soak_34_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 1995 | soak_34_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 1996 | soak_34_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 1997 | soak_34_va_events.log | [pass] active tap 목록 검증 | pass |
| 1998 | soak_34_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 1999 | soak_34_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 2000 | soak_34_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 2001 | soak_34_event_post_schema.log | [pass] HTTP health ok | pass |
| 2002 | soak_34_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 2003 | soak_34_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 2004 | soak_34_event_post_schema.log | [pass] rule 저장: 9349 -> /event | pass |
| 2005 | soak_34_event_post_schema.log | [pass] rule 저장: 9350 -> /fail | pass |
| 2006 | soak_34_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-173 | pass |
| 2007 | soak_34_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 2008 | soak_34_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 2009 | soak_34_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 2010 | soak_34_event_post_recovery.log | [pass] HTTP health ok | pass |
| 2011 | soak_34_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 2012 | soak_34_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 2013 | soak_34_event_post_recovery.log | [pass] rule 저장: 9549 -> /flaky | pass |
| 2014 | soak_34_event_post_recovery.log | [pass] rule 저장: 9550 -> /flaky | pass |
| 2015 | soak_34_event_post_recovery.log | [pass] rule 저장: 9551 -> /flaky | pass |
| 2016 | soak_34_event_post_recovery.log | [pass] rule 저장: 9552 -> /flaky | pass |
| 2017 | soak_34_event_post_recovery.log | [pass] rule 저장: 9553 -> /flaky | pass |
| 2018 | soak_34_event_post_recovery.log | [pass] rule 저장: 9554 -> /flaky | pass |
| 2019 | soak_34_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-174 | pass |
| 2020 | soak_34_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 2021 | soak_34_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 2022 | soak_34_redaction.log | [pass] HTTP health ok | pass |
| 2023 | soak_34_redaction.log | [pass] runtime idle precheck ok | pass |
| 2024 | soak_34_redaction.log | [pass] live-va-redaction (36s) | pass |
| 2025 | soak_35_va_events.log | [pass] HTTP health ok | pass |
| 2026 | soak_35_va_events.log | [pass] rule 저장: 9581 | pass |
| 2027 | soak_35_va_events.log | [pass] rule 저장: 9582 | pass |
| 2028 | soak_35_va_events.log | [pass] rule 저장: 9583 | pass |
| 2029 | soak_35_va_events.log | [pass] rule 저장: 9584 | pass |
| 2030 | soak_35_va_events.log | [pass] rule 저장: 9585 | pass |
| 2031 | soak_35_va_events.log | [pass] rule 저장: 9586 | pass |
| 2032 | soak_35_va_events.log | [pass] rule 저장: 9587 | pass |
| 2033 | soak_35_va_events.log | [pass] rule 저장: 9588 | pass |
| 2034 | soak_35_va_events.log | [pass] rule 저장: 9589 | pass |
| 2035 | soak_35_va_events.log | [pass] rule 저장: 9590 | pass |
| 2036 | soak_35_va_events.log | [pass] rule 저장: 9591 | pass |
| 2037 | soak_35_va_events.log | [pass] analysis tap 생성: analysis-tap-177 | pass |
| 2038 | soak_35_va_events.log | [pass] presence 이벤트 발생 | pass |
| 2039 | soak_35_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 2040 | soak_35_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 2041 | soak_35_va_events.log | [pass] enter 이벤트 발생 | pass |
| 2042 | soak_35_va_events.log | [pass] exit 이벤트 발생 | pass |
| 2043 | soak_35_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 2044 | soak_35_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 2045 | soak_35_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 2046 | soak_35_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 2047 | soak_35_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 2048 | soak_35_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 2049 | soak_35_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 2050 | soak_35_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 2051 | soak_35_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 2052 | soak_35_va_events.log | [pass] active tap 목록 검증 | pass |
| 2053 | soak_35_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 2054 | soak_35_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 2055 | soak_35_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 2056 | soak_35_event_post_schema.log | [pass] HTTP health ok | pass |
| 2057 | soak_35_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 2058 | soak_35_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 2059 | soak_35_event_post_schema.log | [pass] rule 저장: 9525 -> /event | pass |
| 2060 | soak_35_event_post_schema.log | [pass] rule 저장: 9526 -> /fail | pass |
| 2061 | soak_35_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-178 | pass |
| 2062 | soak_35_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 2063 | soak_35_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 2064 | soak_35_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 2065 | soak_35_event_post_recovery.log | [pass] HTTP health ok | pass |
| 2066 | soak_35_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 2067 | soak_35_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 2068 | soak_35_event_post_recovery.log | [pass] rule 저장: 9341 -> /flaky | pass |
| 2069 | soak_35_event_post_recovery.log | [pass] rule 저장: 9342 -> /flaky | pass |
| 2070 | soak_35_event_post_recovery.log | [pass] rule 저장: 9343 -> /flaky | pass |
| 2071 | soak_35_event_post_recovery.log | [pass] rule 저장: 9344 -> /flaky | pass |
| 2072 | soak_35_event_post_recovery.log | [pass] rule 저장: 9345 -> /flaky | pass |
| 2073 | soak_35_event_post_recovery.log | [pass] rule 저장: 9346 -> /flaky | pass |
| 2074 | soak_35_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-179 | pass |
| 2075 | soak_35_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 2076 | soak_35_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 2077 | soak_35_redaction.log | [pass] HTTP health ok | pass |
| 2078 | soak_35_redaction.log | [pass] runtime idle precheck ok | pass |
| 2079 | soak_35_redaction.log | [pass] live-va-redaction (36s) | pass |
| 2080 | soak_36_va_events.log | [pass] HTTP health ok | pass |
| 2081 | soak_36_va_events.log | [pass] rule 저장: 9449 | pass |
| 2082 | soak_36_va_events.log | [pass] rule 저장: 9450 | pass |
| 2083 | soak_36_va_events.log | [pass] rule 저장: 9451 | pass |
| 2084 | soak_36_va_events.log | [pass] rule 저장: 9452 | pass |
| 2085 | soak_36_va_events.log | [pass] rule 저장: 9453 | pass |
| 2086 | soak_36_va_events.log | [pass] rule 저장: 9454 | pass |
| 2087 | soak_36_va_events.log | [pass] rule 저장: 9455 | pass |
| 2088 | soak_36_va_events.log | [pass] rule 저장: 9456 | pass |
| 2089 | soak_36_va_events.log | [pass] rule 저장: 9457 | pass |
| 2090 | soak_36_va_events.log | [pass] rule 저장: 9458 | pass |
| 2091 | soak_36_va_events.log | [pass] rule 저장: 9459 | pass |
| 2092 | soak_36_va_events.log | [pass] analysis tap 생성: analysis-tap-182 | pass |
| 2093 | soak_36_va_events.log | [pass] presence 이벤트 발생 | pass |
| 2094 | soak_36_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 2095 | soak_36_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 2096 | soak_36_va_events.log | [pass] enter 이벤트 발생 | pass |
| 2097 | soak_36_va_events.log | [pass] exit 이벤트 발생 | pass |
| 2098 | soak_36_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 2099 | soak_36_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 2100 | soak_36_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 2101 | soak_36_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 2102 | soak_36_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 2103 | soak_36_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 2104 | soak_36_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 2105 | soak_36_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 2106 | soak_36_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 2107 | soak_36_va_events.log | [pass] active tap 목록 검증 | pass |
| 2108 | soak_36_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 2109 | soak_36_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 2110 | soak_36_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 2111 | soak_36_event_post_schema.log | [pass] HTTP health ok | pass |
| 2112 | soak_36_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 2113 | soak_36_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 2114 | soak_36_event_post_schema.log | [pass] rule 저장: 9445 -> /event | pass |
| 2115 | soak_36_event_post_schema.log | [pass] rule 저장: 9446 -> /fail | pass |
| 2116 | soak_36_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-183 | pass |
| 2117 | soak_36_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 2118 | soak_36_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 2119 | soak_36_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 2120 | soak_36_event_post_recovery.log | [pass] HTTP health ok | pass |
| 2121 | soak_36_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 2122 | soak_36_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 2123 | soak_36_event_post_recovery.log | [pass] rule 저장: 9645 -> /flaky | pass |
| 2124 | soak_36_event_post_recovery.log | [pass] rule 저장: 9646 -> /flaky | pass |
| 2125 | soak_36_event_post_recovery.log | [pass] rule 저장: 9647 -> /flaky | pass |
| 2126 | soak_36_event_post_recovery.log | [pass] rule 저장: 9648 -> /flaky | pass |
| 2127 | soak_36_event_post_recovery.log | [pass] rule 저장: 9649 -> /flaky | pass |
| 2128 | soak_36_event_post_recovery.log | [pass] rule 저장: 9650 -> /flaky | pass |
| 2129 | soak_36_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-184 | pass |
| 2130 | soak_36_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 2131 | soak_36_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 2132 | soak_36_redaction.log | [pass] HTTP health ok | pass |
| 2133 | soak_36_redaction.log | [pass] runtime idle precheck ok | pass |
| 2134 | soak_36_redaction.log | [pass] live-va-redaction (36s) | pass |
| 2135 | soak_37_va_events.log | [pass] HTTP health ok | pass |
| 2136 | soak_37_va_events.log | [pass] rule 저장: 9533 | pass |
| 2137 | soak_37_va_events.log | [pass] rule 저장: 9534 | pass |
| 2138 | soak_37_va_events.log | [pass] rule 저장: 9535 | pass |
| 2139 | soak_37_va_events.log | [pass] rule 저장: 9536 | pass |
| 2140 | soak_37_va_events.log | [pass] rule 저장: 9537 | pass |
| 2141 | soak_37_va_events.log | [pass] rule 저장: 9538 | pass |
| 2142 | soak_37_va_events.log | [pass] rule 저장: 9539 | pass |
| 2143 | soak_37_va_events.log | [pass] rule 저장: 9540 | pass |
| 2144 | soak_37_va_events.log | [pass] rule 저장: 9541 | pass |
| 2145 | soak_37_va_events.log | [pass] rule 저장: 9542 | pass |
| 2146 | soak_37_va_events.log | [pass] rule 저장: 9543 | pass |
| 2147 | soak_37_va_events.log | [pass] analysis tap 생성: analysis-tap-187 | pass |
| 2148 | soak_37_va_events.log | [pass] presence 이벤트 발생 | pass |
| 2149 | soak_37_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 2150 | soak_37_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 2151 | soak_37_va_events.log | [pass] enter 이벤트 발생 | pass |
| 2152 | soak_37_va_events.log | [pass] exit 이벤트 발생 | pass |
| 2153 | soak_37_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 2154 | soak_37_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 2155 | soak_37_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 2156 | soak_37_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 2157 | soak_37_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 2158 | soak_37_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 2159 | soak_37_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 2160 | soak_37_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 2161 | soak_37_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 2162 | soak_37_va_events.log | [pass] active tap 목록 검증 | pass |
| 2163 | soak_37_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 2164 | soak_37_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 2165 | soak_37_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 2166 | soak_37_event_post_schema.log | [pass] HTTP health ok | pass |
| 2167 | soak_37_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 2168 | soak_37_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 2169 | soak_37_event_post_schema.log | [pass] rule 저장: 9389 -> /event | pass |
| 2170 | soak_37_event_post_schema.log | [pass] rule 저장: 9390 -> /fail | pass |
| 2171 | soak_37_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-188 | pass |
| 2172 | soak_37_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 2173 | soak_37_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 2174 | soak_37_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 2175 | soak_37_event_post_recovery.log | [pass] HTTP health ok | pass |
| 2176 | soak_37_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 2177 | soak_37_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 2178 | soak_37_event_post_recovery.log | [pass] rule 저장: 9589 -> /flaky | pass |
| 2179 | soak_37_event_post_recovery.log | [pass] rule 저장: 9590 -> /flaky | pass |
| 2180 | soak_37_event_post_recovery.log | [pass] rule 저장: 9591 -> /flaky | pass |
| 2181 | soak_37_event_post_recovery.log | [pass] rule 저장: 9592 -> /flaky | pass |
| 2182 | soak_37_event_post_recovery.log | [pass] rule 저장: 9593 -> /flaky | pass |
| 2183 | soak_37_event_post_recovery.log | [pass] rule 저장: 9594 -> /flaky | pass |
| 2184 | soak_37_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-189 | pass |
| 2185 | soak_37_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 2186 | soak_37_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 2187 | soak_37_redaction.log | [pass] HTTP health ok | pass |
| 2188 | soak_37_redaction.log | [pass] runtime idle precheck ok | pass |
| 2189 | soak_37_redaction.log | [pass] live-va-redaction (36s) | pass |
| 2190 | soak_38_va_events.log | [pass] HTTP health ok | pass |
| 2191 | soak_38_va_events.log | [pass] rule 저장: 9725 | pass |
| 2192 | soak_38_va_events.log | [pass] rule 저장: 9726 | pass |
| 2193 | soak_38_va_events.log | [pass] rule 저장: 9727 | pass |
| 2194 | soak_38_va_events.log | [pass] rule 저장: 9728 | pass |
| 2195 | soak_38_va_events.log | [pass] rule 저장: 9729 | pass |
| 2196 | soak_38_va_events.log | [pass] rule 저장: 9730 | pass |
| 2197 | soak_38_va_events.log | [pass] rule 저장: 9731 | pass |
| 2198 | soak_38_va_events.log | [pass] rule 저장: 9732 | pass |
| 2199 | soak_38_va_events.log | [pass] rule 저장: 9733 | pass |
| 2200 | soak_38_va_events.log | [pass] rule 저장: 9734 | pass |
| 2201 | soak_38_va_events.log | [pass] rule 저장: 9735 | pass |
| 2202 | soak_38_va_events.log | [pass] analysis tap 생성: analysis-tap-192 | pass |
| 2203 | soak_38_va_events.log | [pass] presence 이벤트 발생 | pass |
| 2204 | soak_38_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 2205 | soak_38_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 2206 | soak_38_va_events.log | [pass] enter 이벤트 발생 | pass |
| 2207 | soak_38_va_events.log | [pass] exit 이벤트 발생 | pass |
| 2208 | soak_38_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 2209 | soak_38_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 2210 | soak_38_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 2211 | soak_38_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 2212 | soak_38_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 2213 | soak_38_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 2214 | soak_38_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 2215 | soak_38_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 2216 | soak_38_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 2217 | soak_38_va_events.log | [pass] active tap 목록 검증 | pass |
| 2218 | soak_38_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 2219 | soak_38_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 2220 | soak_38_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 2221 | soak_38_event_post_schema.log | [pass] HTTP health ok | pass |
| 2222 | soak_38_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 2223 | soak_38_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 2224 | soak_38_event_post_schema.log | [pass] rule 저장: 9309 -> /event | pass |
| 2225 | soak_38_event_post_schema.log | [pass] rule 저장: 9310 -> /fail | pass |
| 2226 | soak_38_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-193 | pass |
| 2227 | soak_38_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 2228 | soak_38_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 2229 | soak_38_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 2230 | soak_38_event_post_recovery.log | [pass] HTTP health ok | pass |
| 2231 | soak_38_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 2232 | soak_38_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 2233 | soak_38_event_post_recovery.log | [pass] rule 저장: 9509 -> /flaky | pass |
| 2234 | soak_38_event_post_recovery.log | [pass] rule 저장: 9510 -> /flaky | pass |
| 2235 | soak_38_event_post_recovery.log | [pass] rule 저장: 9511 -> /flaky | pass |
| 2236 | soak_38_event_post_recovery.log | [pass] rule 저장: 9512 -> /flaky | pass |
| 2237 | soak_38_event_post_recovery.log | [pass] rule 저장: 9513 -> /flaky | pass |
| 2238 | soak_38_event_post_recovery.log | [pass] rule 저장: 9514 -> /flaky | pass |
| 2239 | soak_38_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-194 | pass |
| 2240 | soak_38_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 2241 | soak_38_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 2242 | soak_38_redaction.log | [pass] HTTP health ok | pass |
| 2243 | soak_38_redaction.log | [pass] runtime idle precheck ok | pass |
| 2244 | soak_38_redaction.log | [pass] live-va-redaction (36s) | pass |
| 2245 | soak_39_va_events.log | [pass] HTTP health ok | pass |
| 2246 | soak_39_va_events.log | [pass] rule 저장: 9521 | pass |
| 2247 | soak_39_va_events.log | [pass] rule 저장: 9522 | pass |
| 2248 | soak_39_va_events.log | [pass] rule 저장: 9523 | pass |
| 2249 | soak_39_va_events.log | [pass] rule 저장: 9524 | pass |
| 2250 | soak_39_va_events.log | [pass] rule 저장: 9525 | pass |
| 2251 | soak_39_va_events.log | [pass] rule 저장: 9526 | pass |
| 2252 | soak_39_va_events.log | [pass] rule 저장: 9527 | pass |
| 2253 | soak_39_va_events.log | [pass] rule 저장: 9528 | pass |
| 2254 | soak_39_va_events.log | [pass] rule 저장: 9529 | pass |
| 2255 | soak_39_va_events.log | [pass] rule 저장: 9530 | pass |
| 2256 | soak_39_va_events.log | [pass] rule 저장: 9531 | pass |
| 2257 | soak_39_va_events.log | [pass] analysis tap 생성: analysis-tap-197 | pass |
| 2258 | soak_39_va_events.log | [pass] presence 이벤트 발생 | pass |
| 2259 | soak_39_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 2260 | soak_39_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 2261 | soak_39_va_events.log | [pass] enter 이벤트 발생 | pass |
| 2262 | soak_39_va_events.log | [pass] exit 이벤트 발생 | pass |
| 2263 | soak_39_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 2264 | soak_39_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 2265 | soak_39_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 2266 | soak_39_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 2267 | soak_39_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 2268 | soak_39_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 2269 | soak_39_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 2270 | soak_39_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 2271 | soak_39_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 2272 | soak_39_va_events.log | [pass] active tap 목록 검증 | pass |
| 2273 | soak_39_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 2274 | soak_39_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 2275 | soak_39_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 2276 | soak_39_event_post_schema.log | [pass] HTTP health ok | pass |
| 2277 | soak_39_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 2278 | soak_39_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 2279 | soak_39_event_post_schema.log | [pass] rule 저장: 9469 -> /event | pass |
| 2280 | soak_39_event_post_schema.log | [pass] rule 저장: 9470 -> /fail | pass |
| 2281 | soak_39_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-198 | pass |
| 2282 | soak_39_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 2283 | soak_39_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 2284 | soak_39_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 2285 | soak_39_event_post_recovery.log | [pass] HTTP health ok | pass |
| 2286 | soak_39_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 2287 | soak_39_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 2288 | soak_39_event_post_recovery.log | [pass] rule 저장: 9669 -> /flaky | pass |
| 2289 | soak_39_event_post_recovery.log | [pass] rule 저장: 9670 -> /flaky | pass |
| 2290 | soak_39_event_post_recovery.log | [pass] rule 저장: 9671 -> /flaky | pass |
| 2291 | soak_39_event_post_recovery.log | [pass] rule 저장: 9672 -> /flaky | pass |
| 2292 | soak_39_event_post_recovery.log | [pass] rule 저장: 9673 -> /flaky | pass |
| 2293 | soak_39_event_post_recovery.log | [pass] rule 저장: 9674 -> /flaky | pass |
| 2294 | soak_39_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-199 | pass |
| 2295 | soak_39_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 2296 | soak_39_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 2297 | soak_39_redaction.log | [pass] HTTP health ok | pass |
| 2298 | soak_39_redaction.log | [pass] runtime idle precheck ok | pass |
| 2299 | soak_39_redaction.log | [pass] live-va-redaction (36s) | pass |
| 2300 | soak_40_va_events.log | [pass] HTTP health ok | pass |
| 2301 | soak_40_va_events.log | [pass] rule 저장: 9509 | pass |
| 2302 | soak_40_va_events.log | [pass] rule 저장: 9510 | pass |
| 2303 | soak_40_va_events.log | [pass] rule 저장: 9511 | pass |
| 2304 | soak_40_va_events.log | [pass] rule 저장: 9512 | pass |
| 2305 | soak_40_va_events.log | [pass] rule 저장: 9513 | pass |
| 2306 | soak_40_va_events.log | [pass] rule 저장: 9514 | pass |
| 2307 | soak_40_va_events.log | [pass] rule 저장: 9515 | pass |
| 2308 | soak_40_va_events.log | [pass] rule 저장: 9516 | pass |
| 2309 | soak_40_va_events.log | [pass] rule 저장: 9517 | pass |
| 2310 | soak_40_va_events.log | [pass] rule 저장: 9518 | pass |
| 2311 | soak_40_va_events.log | [pass] rule 저장: 9519 | pass |
| 2312 | soak_40_va_events.log | [pass] analysis tap 생성: analysis-tap-202 | pass |
| 2313 | soak_40_va_events.log | [pass] presence 이벤트 발생 | pass |
| 2314 | soak_40_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 2315 | soak_40_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 2316 | soak_40_va_events.log | [pass] enter 이벤트 발생 | pass |
| 2317 | soak_40_va_events.log | [pass] exit 이벤트 발생 | pass |
| 2318 | soak_40_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 2319 | soak_40_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 2320 | soak_40_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 2321 | soak_40_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 2322 | soak_40_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 2323 | soak_40_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 2324 | soak_40_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 2325 | soak_40_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 2326 | soak_40_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 2327 | soak_40_va_events.log | [pass] active tap 목록 검증 | pass |
| 2328 | soak_40_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 2329 | soak_40_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 2330 | soak_40_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 2331 | soak_40_event_post_schema.log | [pass] HTTP health ok | pass |
| 2332 | soak_40_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 2333 | soak_40_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 2334 | soak_40_event_post_schema.log | [pass] rule 저장: 9413 -> /event | pass |
| 2335 | soak_40_event_post_schema.log | [pass] rule 저장: 9414 -> /fail | pass |
| 2336 | soak_40_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-203 | pass |
| 2337 | soak_40_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 2338 | soak_40_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 2339 | soak_40_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 2340 | soak_40_event_post_recovery.log | [pass] HTTP health ok | pass |
| 2341 | soak_40_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 2342 | soak_40_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 2343 | soak_40_event_post_recovery.log | [pass] rule 저장: 9613 -> /flaky | pass |
| 2344 | soak_40_event_post_recovery.log | [pass] rule 저장: 9614 -> /flaky | pass |
| 2345 | soak_40_event_post_recovery.log | [pass] rule 저장: 9615 -> /flaky | pass |
| 2346 | soak_40_event_post_recovery.log | [pass] rule 저장: 9616 -> /flaky | pass |
| 2347 | soak_40_event_post_recovery.log | [pass] rule 저장: 9617 -> /flaky | pass |
| 2348 | soak_40_event_post_recovery.log | [pass] rule 저장: 9618 -> /flaky | pass |
| 2349 | soak_40_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-204 | pass |
| 2350 | soak_40_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 2351 | soak_40_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 2352 | soak_40_redaction.log | [pass] HTTP health ok | pass |
| 2353 | soak_40_redaction.log | [pass] runtime idle precheck ok | pass |
| 2354 | soak_40_redaction.log | [pass] live-va-redaction (36s) | pass |
| 2355 | soak_41_va_events.log | [pass] HTTP health ok | pass |
| 2356 | soak_41_va_events.log | [pass] rule 저장: 9665 | pass |
| 2357 | soak_41_va_events.log | [pass] rule 저장: 9666 | pass |
| 2358 | soak_41_va_events.log | [pass] rule 저장: 9667 | pass |
| 2359 | soak_41_va_events.log | [pass] rule 저장: 9668 | pass |
| 2360 | soak_41_va_events.log | [pass] rule 저장: 9669 | pass |
| 2361 | soak_41_va_events.log | [pass] rule 저장: 9670 | pass |
| 2362 | soak_41_va_events.log | [pass] rule 저장: 9671 | pass |
| 2363 | soak_41_va_events.log | [pass] rule 저장: 9672 | pass |
| 2364 | soak_41_va_events.log | [pass] rule 저장: 9673 | pass |
| 2365 | soak_41_va_events.log | [pass] rule 저장: 9674 | pass |
| 2366 | soak_41_va_events.log | [pass] rule 저장: 9675 | pass |
| 2367 | soak_41_va_events.log | [pass] analysis tap 생성: analysis-tap-207 | pass |
| 2368 | soak_41_va_events.log | [pass] presence 이벤트 발생 | pass |
| 2369 | soak_41_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 2370 | soak_41_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 2371 | soak_41_va_events.log | [pass] enter 이벤트 발생 | pass |
| 2372 | soak_41_va_events.log | [pass] exit 이벤트 발생 | pass |
| 2373 | soak_41_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 2374 | soak_41_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 2375 | soak_41_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 2376 | soak_41_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 2377 | soak_41_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 2378 | soak_41_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 2379 | soak_41_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 2380 | soak_41_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 2381 | soak_41_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 2382 | soak_41_va_events.log | [pass] active tap 목록 검증 | pass |
| 2383 | soak_41_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 2384 | soak_41_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 2385 | soak_41_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 2386 | soak_41_event_post_schema.log | [pass] HTTP health ok | pass |
| 2387 | soak_41_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 2388 | soak_41_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 2389 | soak_41_event_post_schema.log | [pass] rule 저장: 9509 -> /event | pass |
| 2390 | soak_41_event_post_schema.log | [pass] rule 저장: 9510 -> /fail | pass |
| 2391 | soak_41_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-208 | pass |
| 2392 | soak_41_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 2393 | soak_41_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 2394 | soak_41_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 2395 | soak_41_event_post_recovery.log | [pass] HTTP health ok | pass |
| 2396 | soak_41_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 2397 | soak_41_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 2398 | soak_41_event_post_recovery.log | [pass] rule 저장: 9445 -> /flaky | pass |
| 2399 | soak_41_event_post_recovery.log | [pass] rule 저장: 9446 -> /flaky | pass |
| 2400 | soak_41_event_post_recovery.log | [pass] rule 저장: 9447 -> /flaky | pass |
| 2401 | soak_41_event_post_recovery.log | [pass] rule 저장: 9448 -> /flaky | pass |
| 2402 | soak_41_event_post_recovery.log | [pass] rule 저장: 9449 -> /flaky | pass |
| 2403 | soak_41_event_post_recovery.log | [pass] rule 저장: 9450 -> /flaky | pass |
| 2404 | soak_41_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-209 | pass |
| 2405 | soak_41_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 2406 | soak_41_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 2407 | soak_41_redaction.log | [pass] HTTP health ok | pass |
| 2408 | soak_41_redaction.log | [pass] runtime idle precheck ok | pass |
| 2409 | soak_41_redaction.log | [pass] live-va-redaction (36s) | pass |
| 2410 | soak_42_va_events.log | [pass] HTTP health ok | pass |
| 2411 | soak_42_va_events.log | [pass] rule 저장: 9521 | pass |
| 2412 | soak_42_va_events.log | [pass] rule 저장: 9522 | pass |
| 2413 | soak_42_va_events.log | [pass] rule 저장: 9523 | pass |
| 2414 | soak_42_va_events.log | [pass] rule 저장: 9524 | pass |
| 2415 | soak_42_va_events.log | [pass] rule 저장: 9525 | pass |
| 2416 | soak_42_va_events.log | [pass] rule 저장: 9526 | pass |
| 2417 | soak_42_va_events.log | [pass] rule 저장: 9527 | pass |
| 2418 | soak_42_va_events.log | [pass] rule 저장: 9528 | pass |
| 2419 | soak_42_va_events.log | [pass] rule 저장: 9529 | pass |
| 2420 | soak_42_va_events.log | [pass] rule 저장: 9530 | pass |
| 2421 | soak_42_va_events.log | [pass] rule 저장: 9531 | pass |
| 2422 | soak_42_va_events.log | [pass] analysis tap 생성: analysis-tap-212 | pass |
| 2423 | soak_42_va_events.log | [pass] presence 이벤트 발생 | pass |
| 2424 | soak_42_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 2425 | soak_42_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 2426 | soak_42_va_events.log | [pass] enter 이벤트 발생 | pass |
| 2427 | soak_42_va_events.log | [pass] exit 이벤트 발생 | pass |
| 2428 | soak_42_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 2429 | soak_42_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 2430 | soak_42_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 2431 | soak_42_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 2432 | soak_42_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 2433 | soak_42_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 2434 | soak_42_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 2435 | soak_42_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 2436 | soak_42_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 2437 | soak_42_va_events.log | [pass] active tap 목록 검증 | pass |
| 2438 | soak_42_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 2439 | soak_42_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 2440 | soak_42_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 2441 | soak_42_event_post_schema.log | [pass] HTTP health ok | pass |
| 2442 | soak_42_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 2443 | soak_42_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 2444 | soak_42_event_post_schema.log | [pass] rule 저장: 9429 -> /event | pass |
| 2445 | soak_42_event_post_schema.log | [pass] rule 저장: 9430 -> /fail | pass |
| 2446 | soak_42_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-213 | pass |
| 2447 | soak_42_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 2448 | soak_42_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 2449 | soak_42_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 2450 | soak_42_event_post_recovery.log | [pass] HTTP health ok | pass |
| 2451 | soak_42_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 2452 | soak_42_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 2453 | soak_42_event_post_recovery.log | [pass] rule 저장: 9629 -> /flaky | pass |
| 2454 | soak_42_event_post_recovery.log | [pass] rule 저장: 9630 -> /flaky | pass |
| 2455 | soak_42_event_post_recovery.log | [pass] rule 저장: 9631 -> /flaky | pass |
| 2456 | soak_42_event_post_recovery.log | [pass] rule 저장: 9632 -> /flaky | pass |
| 2457 | soak_42_event_post_recovery.log | [pass] rule 저장: 9633 -> /flaky | pass |
| 2458 | soak_42_event_post_recovery.log | [pass] rule 저장: 9634 -> /flaky | pass |
| 2459 | soak_42_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-214 | pass |
| 2460 | soak_42_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 2461 | soak_42_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 2462 | soak_42_redaction.log | [pass] HTTP health ok | pass |
| 2463 | soak_42_redaction.log | [pass] runtime idle precheck ok | pass |
| 2464 | soak_42_redaction.log | [pass] live-va-redaction (37s) | pass |
| 2465 | soak_43_va_events.log | [pass] HTTP health ok | pass |
| 2466 | soak_43_va_events.log | [pass] rule 저장: 9509 | pass |
| 2467 | soak_43_va_events.log | [pass] rule 저장: 9510 | pass |
| 2468 | soak_43_va_events.log | [pass] rule 저장: 9511 | pass |
| 2469 | soak_43_va_events.log | [pass] rule 저장: 9512 | pass |
| 2470 | soak_43_va_events.log | [pass] rule 저장: 9513 | pass |
| 2471 | soak_43_va_events.log | [pass] rule 저장: 9514 | pass |
| 2472 | soak_43_va_events.log | [pass] rule 저장: 9515 | pass |
| 2473 | soak_43_va_events.log | [pass] rule 저장: 9516 | pass |
| 2474 | soak_43_va_events.log | [pass] rule 저장: 9517 | pass |
| 2475 | soak_43_va_events.log | [pass] rule 저장: 9518 | pass |
| 2476 | soak_43_va_events.log | [pass] rule 저장: 9519 | pass |
| 2477 | soak_43_va_events.log | [pass] analysis tap 생성: analysis-tap-217 | pass |
| 2478 | soak_43_va_events.log | [pass] presence 이벤트 발생 | pass |
| 2479 | soak_43_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 2480 | soak_43_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 2481 | soak_43_va_events.log | [pass] enter 이벤트 발생 | pass |
| 2482 | soak_43_va_events.log | [pass] exit 이벤트 발생 | pass |
| 2483 | soak_43_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 2484 | soak_43_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 2485 | soak_43_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 2486 | soak_43_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 2487 | soak_43_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 2488 | soak_43_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 2489 | soak_43_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 2490 | soak_43_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 2491 | soak_43_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 2492 | soak_43_va_events.log | [pass] active tap 목록 검증 | pass |
| 2493 | soak_43_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 2494 | soak_43_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 2495 | soak_43_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 2496 | soak_43_event_post_schema.log | [pass] HTTP health ok | pass |
| 2497 | soak_43_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 2498 | soak_43_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 2499 | soak_43_event_post_schema.log | [pass] rule 저장: 9533 -> /event | pass |
| 2500 | soak_43_event_post_schema.log | [pass] rule 저장: 9534 -> /fail | pass |
| 2501 | soak_43_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-218 | pass |
| 2502 | soak_43_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 2503 | soak_43_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 2504 | soak_43_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 2505 | soak_43_event_post_recovery.log | [pass] HTTP health ok | pass |
| 2506 | soak_43_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 2507 | soak_43_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 2508 | soak_43_event_post_recovery.log | [pass] rule 저장: 9349 -> /flaky | pass |
| 2509 | soak_43_event_post_recovery.log | [pass] rule 저장: 9350 -> /flaky | pass |
| 2510 | soak_43_event_post_recovery.log | [pass] rule 저장: 9351 -> /flaky | pass |
| 2511 | soak_43_event_post_recovery.log | [pass] rule 저장: 9352 -> /flaky | pass |
| 2512 | soak_43_event_post_recovery.log | [pass] rule 저장: 9353 -> /flaky | pass |
| 2513 | soak_43_event_post_recovery.log | [pass] rule 저장: 9354 -> /flaky | pass |
| 2514 | soak_43_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-219 | pass |
| 2515 | soak_43_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 2516 | soak_43_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 2517 | soak_43_redaction.log | [pass] HTTP health ok | pass |
| 2518 | soak_43_redaction.log | [pass] runtime idle precheck ok | pass |
| 2519 | soak_43_redaction.log | [pass] live-va-redaction (36s) | pass |
| 2520 | soak_44_va_events.log | [pass] HTTP health ok | pass |
| 2521 | soak_44_va_events.log | [pass] rule 저장: 9701 | pass |
| 2522 | soak_44_va_events.log | [pass] rule 저장: 9702 | pass |
| 2523 | soak_44_va_events.log | [pass] rule 저장: 9703 | pass |
| 2524 | soak_44_va_events.log | [pass] rule 저장: 9704 | pass |
| 2525 | soak_44_va_events.log | [pass] rule 저장: 9705 | pass |
| 2526 | soak_44_va_events.log | [pass] rule 저장: 9706 | pass |
| 2527 | soak_44_va_events.log | [pass] rule 저장: 9707 | pass |
| 2528 | soak_44_va_events.log | [pass] rule 저장: 9708 | pass |
| 2529 | soak_44_va_events.log | [pass] rule 저장: 9709 | pass |
| 2530 | soak_44_va_events.log | [pass] rule 저장: 9710 | pass |
| 2531 | soak_44_va_events.log | [pass] rule 저장: 9711 | pass |
| 2532 | soak_44_va_events.log | [pass] analysis tap 생성: analysis-tap-222 | pass |
| 2533 | soak_44_va_events.log | [pass] presence 이벤트 발생 | pass |
| 2534 | soak_44_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 2535 | soak_44_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 2536 | soak_44_va_events.log | [pass] enter 이벤트 발생 | pass |
| 2537 | soak_44_va_events.log | [pass] exit 이벤트 발생 | pass |
| 2538 | soak_44_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 2539 | soak_44_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 2540 | soak_44_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 2541 | soak_44_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 2542 | soak_44_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 2543 | soak_44_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 2544 | soak_44_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 2545 | soak_44_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 2546 | soak_44_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 2547 | soak_44_va_events.log | [pass] active tap 목록 검증 | pass |
| 2548 | soak_44_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 2549 | soak_44_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 2550 | soak_44_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 2551 | soak_44_event_post_schema.log | [pass] HTTP health ok | pass |
| 2552 | soak_44_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 2553 | soak_44_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 2554 | soak_44_event_post_schema.log | [pass] rule 저장: 9589 -> /event | pass |
| 2555 | soak_44_event_post_schema.log | [pass] rule 저장: 9590 -> /fail | pass |
| 2556 | soak_44_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-223 | pass |
| 2557 | soak_44_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 2558 | soak_44_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 2559 | soak_44_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 2560 | soak_44_event_post_recovery.log | [pass] HTTP health ok | pass |
| 2561 | soak_44_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 2562 | soak_44_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 2563 | soak_44_event_post_recovery.log | [pass] rule 저장: 9509 -> /flaky | pass |
| 2564 | soak_44_event_post_recovery.log | [pass] rule 저장: 9510 -> /flaky | pass |
| 2565 | soak_44_event_post_recovery.log | [pass] rule 저장: 9511 -> /flaky | pass |
| 2566 | soak_44_event_post_recovery.log | [pass] rule 저장: 9512 -> /flaky | pass |
| 2567 | soak_44_event_post_recovery.log | [pass] rule 저장: 9513 -> /flaky | pass |
| 2568 | soak_44_event_post_recovery.log | [pass] rule 저장: 9514 -> /flaky | pass |
| 2569 | soak_44_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-224 | pass |
| 2570 | soak_44_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 2571 | soak_44_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 2572 | soak_44_redaction.log | [pass] HTTP health ok | pass |
| 2573 | soak_44_redaction.log | [pass] runtime idle precheck ok | pass |
| 2574 | soak_44_redaction.log | [pass] live-va-redaction (36s) | pass |
| 2575 | soak_45_va_events.log | [pass] HTTP health ok | pass |
| 2576 | soak_45_va_events.log | [pass] rule 저장: 9509 | pass |
| 2577 | soak_45_va_events.log | [pass] rule 저장: 9510 | pass |
| 2578 | soak_45_va_events.log | [pass] rule 저장: 9511 | pass |
| 2579 | soak_45_va_events.log | [pass] rule 저장: 9512 | pass |
| 2580 | soak_45_va_events.log | [pass] rule 저장: 9513 | pass |
| 2581 | soak_45_va_events.log | [pass] rule 저장: 9514 | pass |
| 2582 | soak_45_va_events.log | [pass] rule 저장: 9515 | pass |
| 2583 | soak_45_va_events.log | [pass] rule 저장: 9516 | pass |
| 2584 | soak_45_va_events.log | [pass] rule 저장: 9517 | pass |
| 2585 | soak_45_va_events.log | [pass] rule 저장: 9518 | pass |
| 2586 | soak_45_va_events.log | [pass] rule 저장: 9519 | pass |
| 2587 | soak_45_va_events.log | [pass] analysis tap 생성: analysis-tap-227 | pass |
| 2588 | soak_45_va_events.log | [pass] presence 이벤트 발생 | pass |
| 2589 | soak_45_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 2590 | soak_45_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 2591 | soak_45_va_events.log | [pass] enter 이벤트 발생 | pass |
| 2592 | soak_45_va_events.log | [pass] exit 이벤트 발생 | pass |
| 2593 | soak_45_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 2594 | soak_45_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 2595 | soak_45_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 2596 | soak_45_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 2597 | soak_45_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 2598 | soak_45_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 2599 | soak_45_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 2600 | soak_45_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 2601 | soak_45_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 2602 | soak_45_va_events.log | [pass] active tap 목록 검증 | pass |
| 2603 | soak_45_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 2604 | soak_45_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 2605 | soak_45_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 2606 | soak_45_event_post_schema.log | [pass] HTTP health ok | pass |
| 2607 | soak_45_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 2608 | soak_45_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 2609 | soak_45_event_post_schema.log | [pass] rule 저장: 9477 -> /event | pass |
| 2610 | soak_45_event_post_schema.log | [pass] rule 저장: 9478 -> /fail | pass |
| 2611 | soak_45_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-228 | pass |
| 2612 | soak_45_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 2613 | soak_45_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 2614 | soak_45_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 2615 | soak_45_event_post_recovery.log | [pass] HTTP health ok | pass |
| 2616 | soak_45_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 2617 | soak_45_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 2618 | soak_45_event_post_recovery.log | [pass] rule 저장: 9677 -> /flaky | pass |
| 2619 | soak_45_event_post_recovery.log | [pass] rule 저장: 9678 -> /flaky | pass |
| 2620 | soak_45_event_post_recovery.log | [pass] rule 저장: 9679 -> /flaky | pass |
| 2621 | soak_45_event_post_recovery.log | [pass] rule 저장: 9680 -> /flaky | pass |
| 2622 | soak_45_event_post_recovery.log | [pass] rule 저장: 9681 -> /flaky | pass |
| 2623 | soak_45_event_post_recovery.log | [pass] rule 저장: 9682 -> /flaky | pass |
| 2624 | soak_45_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-229 | pass |
| 2625 | soak_45_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 2626 | soak_45_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 2627 | soak_45_redaction.log | [pass] HTTP health ok | pass |
| 2628 | soak_45_redaction.log | [pass] runtime idle precheck ok | pass |
| 2629 | soak_45_redaction.log | [pass] live-va-redaction (36s) | pass |
| 2630 | soak_46_va_events.log | [pass] HTTP health ok | pass |
| 2631 | soak_46_va_events.log | [pass] rule 저장: 9401 | pass |
| 2632 | soak_46_va_events.log | [pass] rule 저장: 9402 | pass |
| 2633 | soak_46_va_events.log | [pass] rule 저장: 9403 | pass |
| 2634 | soak_46_va_events.log | [pass] rule 저장: 9404 | pass |
| 2635 | soak_46_va_events.log | [pass] rule 저장: 9405 | pass |
| 2636 | soak_46_va_events.log | [pass] rule 저장: 9406 | pass |
| 2637 | soak_46_va_events.log | [pass] rule 저장: 9407 | pass |
| 2638 | soak_46_va_events.log | [pass] rule 저장: 9408 | pass |
| 2639 | soak_46_va_events.log | [pass] rule 저장: 9409 | pass |
| 2640 | soak_46_va_events.log | [pass] rule 저장: 9410 | pass |
| 2641 | soak_46_va_events.log | [pass] rule 저장: 9411 | pass |
| 2642 | soak_46_va_events.log | [pass] analysis tap 생성: analysis-tap-232 | pass |
| 2643 | soak_46_va_events.log | [pass] presence 이벤트 발생 | pass |
| 2644 | soak_46_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 2645 | soak_46_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 2646 | soak_46_va_events.log | [pass] enter 이벤트 발생 | pass |
| 2647 | soak_46_va_events.log | [pass] exit 이벤트 발생 | pass |
| 2648 | soak_46_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 2649 | soak_46_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 2650 | soak_46_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 2651 | soak_46_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 2652 | soak_46_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 2653 | soak_46_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 2654 | soak_46_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 2655 | soak_46_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 2656 | soak_46_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 2657 | soak_46_va_events.log | [pass] active tap 목록 검증 | pass |
| 2658 | soak_46_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 2659 | soak_46_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 2660 | soak_46_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 2661 | soak_46_event_post_schema.log | [pass] HTTP health ok | pass |
| 2662 | soak_46_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 2663 | soak_46_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 2664 | soak_46_event_post_schema.log | [pass] rule 저장: 9693 -> /event | pass |
| 2665 | soak_46_event_post_schema.log | [pass] rule 저장: 9694 -> /fail | pass |
| 2666 | soak_46_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-233 | pass |
| 2667 | soak_46_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 2668 | soak_46_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 2669 | soak_46_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 2670 | soak_46_event_post_recovery.log | [pass] HTTP health ok | pass |
| 2671 | soak_46_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 2672 | soak_46_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 2673 | soak_46_event_post_recovery.log | [pass] rule 저장: 9597 -> /flaky | pass |
| 2674 | soak_46_event_post_recovery.log | [pass] rule 저장: 9598 -> /flaky | pass |
| 2675 | soak_46_event_post_recovery.log | [pass] rule 저장: 9599 -> /flaky | pass |
| 2676 | soak_46_event_post_recovery.log | [pass] rule 저장: 9600 -> /flaky | pass |
| 2677 | soak_46_event_post_recovery.log | [pass] rule 저장: 9601 -> /flaky | pass |
| 2678 | soak_46_event_post_recovery.log | [pass] rule 저장: 9602 -> /flaky | pass |
| 2679 | soak_46_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-234 | pass |
| 2680 | soak_46_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 2681 | soak_46_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 2682 | soak_46_redaction.log | [pass] HTTP health ok | pass |
| 2683 | soak_46_redaction.log | [pass] runtime idle precheck ok | pass |
| 2684 | soak_46_redaction.log | [pass] live-va-redaction (37s) | pass |
| 2685 | soak_47_va_events.log | [pass] HTTP health ok | pass |
| 2686 | soak_47_va_events.log | [pass] rule 저장: 9677 | pass |
| 2687 | soak_47_va_events.log | [pass] rule 저장: 9678 | pass |
| 2688 | soak_47_va_events.log | [pass] rule 저장: 9679 | pass |
| 2689 | soak_47_va_events.log | [pass] rule 저장: 9680 | pass |
| 2690 | soak_47_va_events.log | [pass] rule 저장: 9681 | pass |
| 2691 | soak_47_va_events.log | [pass] rule 저장: 9682 | pass |
| 2692 | soak_47_va_events.log | [pass] rule 저장: 9683 | pass |
| 2693 | soak_47_va_events.log | [pass] rule 저장: 9684 | pass |
| 2694 | soak_47_va_events.log | [pass] rule 저장: 9685 | pass |
| 2695 | soak_47_va_events.log | [pass] rule 저장: 9686 | pass |
| 2696 | soak_47_va_events.log | [pass] rule 저장: 9687 | pass |
| 2697 | soak_47_va_events.log | [pass] analysis tap 생성: analysis-tap-237 | pass |
| 2698 | soak_47_va_events.log | [pass] presence 이벤트 발생 | pass |
| 2699 | soak_47_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 2700 | soak_47_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 2701 | soak_47_va_events.log | [pass] enter 이벤트 발생 | pass |
| 2702 | soak_47_va_events.log | [pass] exit 이벤트 발생 | pass |
| 2703 | soak_47_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 2704 | soak_47_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 2705 | soak_47_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 2706 | soak_47_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 2707 | soak_47_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 2708 | soak_47_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 2709 | soak_47_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 2710 | soak_47_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 2711 | soak_47_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 2712 | soak_47_va_events.log | [pass] active tap 목록 검증 | pass |
| 2713 | soak_47_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 2714 | soak_47_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 2715 | soak_47_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 2716 | soak_47_event_post_schema.log | [pass] HTTP health ok | pass |
| 2717 | soak_47_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 2718 | soak_47_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 2719 | soak_47_event_post_schema.log | [pass] rule 저장: 9573 -> /event | pass |
| 2720 | soak_47_event_post_schema.log | [pass] rule 저장: 9574 -> /fail | pass |
| 2721 | soak_47_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-238 | pass |
| 2722 | soak_47_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 2723 | soak_47_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 2724 | soak_47_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 2725 | soak_47_event_post_recovery.log | [pass] HTTP health ok | pass |
| 2726 | soak_47_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 2727 | soak_47_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 2728 | soak_47_event_post_recovery.log | [pass] rule 저장: 9373 -> /flaky | pass |
| 2729 | soak_47_event_post_recovery.log | [pass] rule 저장: 9374 -> /flaky | pass |
| 2730 | soak_47_event_post_recovery.log | [pass] rule 저장: 9375 -> /flaky | pass |
| 2731 | soak_47_event_post_recovery.log | [pass] rule 저장: 9376 -> /flaky | pass |
| 2732 | soak_47_event_post_recovery.log | [pass] rule 저장: 9377 -> /flaky | pass |
| 2733 | soak_47_event_post_recovery.log | [pass] rule 저장: 9378 -> /flaky | pass |
| 2734 | soak_47_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-239 | pass |
| 2735 | soak_47_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 2736 | soak_47_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 2737 | soak_47_redaction.log | [pass] HTTP health ok | pass |
| 2738 | soak_47_redaction.log | [pass] runtime idle precheck ok | pass |
| 2739 | soak_47_redaction.log | [pass] live-va-redaction (36s) | pass |
| 2740 | soak_48_va_events.log | [pass] HTTP health ok | pass |
| 2741 | soak_48_va_events.log | [pass] rule 저장: 9665 | pass |
| 2742 | soak_48_va_events.log | [pass] rule 저장: 9666 | pass |
| 2743 | soak_48_va_events.log | [pass] rule 저장: 9667 | pass |
| 2744 | soak_48_va_events.log | [pass] rule 저장: 9668 | pass |
| 2745 | soak_48_va_events.log | [pass] rule 저장: 9669 | pass |
| 2746 | soak_48_va_events.log | [pass] rule 저장: 9670 | pass |
| 2747 | soak_48_va_events.log | [pass] rule 저장: 9671 | pass |
| 2748 | soak_48_va_events.log | [pass] rule 저장: 9672 | pass |
| 2749 | soak_48_va_events.log | [pass] rule 저장: 9673 | pass |
| 2750 | soak_48_va_events.log | [pass] rule 저장: 9674 | pass |
| 2751 | soak_48_va_events.log | [pass] rule 저장: 9675 | pass |
| 2752 | soak_48_va_events.log | [pass] analysis tap 생성: analysis-tap-242 | pass |
| 2753 | soak_48_va_events.log | [pass] presence 이벤트 발생 | pass |
| 2754 | soak_48_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 2755 | soak_48_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 2756 | soak_48_va_events.log | [pass] enter 이벤트 발생 | pass |
| 2757 | soak_48_va_events.log | [pass] exit 이벤트 발생 | pass |
| 2758 | soak_48_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 2759 | soak_48_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 2760 | soak_48_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 2761 | soak_48_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 2762 | soak_48_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 2763 | soak_48_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 2764 | soak_48_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 2765 | soak_48_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 2766 | soak_48_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 2767 | soak_48_va_events.log | [pass] active tap 목록 검증 | pass |
| 2768 | soak_48_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 2769 | soak_48_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 2770 | soak_48_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 2771 | soak_48_event_post_schema.log | [pass] HTTP health ok | pass |
| 2772 | soak_48_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 2773 | soak_48_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 2774 | soak_48_event_post_schema.log | [pass] rule 저장: 9397 -> /event | pass |
| 2775 | soak_48_event_post_schema.log | [pass] rule 저장: 9398 -> /fail | pass |
| 2776 | soak_48_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-243 | pass |
| 2777 | soak_48_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 2778 | soak_48_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 2779 | soak_48_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 2780 | soak_48_event_post_recovery.log | [pass] HTTP health ok | pass |
| 2781 | soak_48_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 2782 | soak_48_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 2783 | soak_48_event_post_recovery.log | [pass] rule 저장: 9613 -> /flaky | pass |
| 2784 | soak_48_event_post_recovery.log | [pass] rule 저장: 9614 -> /flaky | pass |
| 2785 | soak_48_event_post_recovery.log | [pass] rule 저장: 9615 -> /flaky | pass |
| 2786 | soak_48_event_post_recovery.log | [pass] rule 저장: 9616 -> /flaky | pass |
| 2787 | soak_48_event_post_recovery.log | [pass] rule 저장: 9617 -> /flaky | pass |
| 2788 | soak_48_event_post_recovery.log | [pass] rule 저장: 9618 -> /flaky | pass |
| 2789 | soak_48_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-244 | pass |
| 2790 | soak_48_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 2791 | soak_48_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 2792 | soak_48_redaction.log | [pass] HTTP health ok | pass |
| 2793 | soak_48_redaction.log | [pass] runtime idle precheck ok | pass |
| 2794 | soak_48_redaction.log | [pass] live-va-redaction (37s) | pass |
| 2795 | soak_49_va_events.log | [pass] HTTP health ok | pass |
| 2796 | soak_49_va_events.log | [pass] rule 저장: 9509 | pass |
| 2797 | soak_49_va_events.log | [pass] rule 저장: 9510 | pass |
| 2798 | soak_49_va_events.log | [pass] rule 저장: 9511 | pass |
| 2799 | soak_49_va_events.log | [pass] rule 저장: 9512 | pass |
| 2800 | soak_49_va_events.log | [pass] rule 저장: 9513 | pass |
| 2801 | soak_49_va_events.log | [pass] rule 저장: 9514 | pass |
| 2802 | soak_49_va_events.log | [pass] rule 저장: 9515 | pass |
| 2803 | soak_49_va_events.log | [pass] rule 저장: 9516 | pass |
| 2804 | soak_49_va_events.log | [pass] rule 저장: 9517 | pass |
| 2805 | soak_49_va_events.log | [pass] rule 저장: 9518 | pass |
| 2806 | soak_49_va_events.log | [pass] rule 저장: 9519 | pass |
| 2807 | soak_49_va_events.log | [pass] analysis tap 생성: analysis-tap-247 | pass |
| 2808 | soak_49_va_events.log | [pass] presence 이벤트 발생 | pass |
| 2809 | soak_49_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 2810 | soak_49_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 2811 | soak_49_va_events.log | [pass] enter 이벤트 발생 | pass |
| 2812 | soak_49_va_events.log | [pass] exit 이벤트 발생 | pass |
| 2813 | soak_49_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 2814 | soak_49_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 2815 | soak_49_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 2816 | soak_49_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 2817 | soak_49_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 2818 | soak_49_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 2819 | soak_49_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 2820 | soak_49_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 2821 | soak_49_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 2822 | soak_49_va_events.log | [pass] active tap 목록 검증 | pass |
| 2823 | soak_49_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 2824 | soak_49_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 2825 | soak_49_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 2826 | soak_49_event_post_schema.log | [pass] HTTP health ok | pass |
| 2827 | soak_49_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 2828 | soak_49_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 2829 | soak_49_event_post_schema.log | [pass] rule 저장: 9621 -> /event | pass |
| 2830 | soak_49_event_post_schema.log | [pass] rule 저장: 9622 -> /fail | pass |
| 2831 | soak_49_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-248 | pass |
| 2832 | soak_49_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 2833 | soak_49_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 2834 | soak_49_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 2835 | soak_49_event_post_recovery.log | [pass] HTTP health ok | pass |
| 2836 | soak_49_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 2837 | soak_49_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 2838 | soak_49_event_post_recovery.log | [pass] rule 저장: 9421 -> /flaky | pass |
| 2839 | soak_49_event_post_recovery.log | [pass] rule 저장: 9422 -> /flaky | pass |
| 2840 | soak_49_event_post_recovery.log | [pass] rule 저장: 9423 -> /flaky | pass |
| 2841 | soak_49_event_post_recovery.log | [pass] rule 저장: 9424 -> /flaky | pass |
| 2842 | soak_49_event_post_recovery.log | [pass] rule 저장: 9425 -> /flaky | pass |
| 2843 | soak_49_event_post_recovery.log | [pass] rule 저장: 9426 -> /flaky | pass |
| 2844 | soak_49_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-249 | pass |
| 2845 | soak_49_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 2846 | soak_49_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 2847 | soak_49_redaction.log | [pass] HTTP health ok | pass |
| 2848 | soak_49_redaction.log | [pass] runtime idle precheck ok | pass |
| 2849 | soak_49_redaction.log | [pass] live-va-redaction (36s) | pass |
| 2850 | soak_50_va_events.log | [pass] HTTP health ok | pass |
| 2851 | soak_50_va_events.log | [pass] rule 저장: 9665 | pass |
| 2852 | soak_50_va_events.log | [pass] rule 저장: 9666 | pass |
| 2853 | soak_50_va_events.log | [pass] rule 저장: 9667 | pass |
| 2854 | soak_50_va_events.log | [pass] rule 저장: 9668 | pass |
| 2855 | soak_50_va_events.log | [pass] rule 저장: 9669 | pass |
| 2856 | soak_50_va_events.log | [pass] rule 저장: 9670 | pass |
| 2857 | soak_50_va_events.log | [pass] rule 저장: 9671 | pass |
| 2858 | soak_50_va_events.log | [pass] rule 저장: 9672 | pass |
| 2859 | soak_50_va_events.log | [pass] rule 저장: 9673 | pass |
| 2860 | soak_50_va_events.log | [pass] rule 저장: 9674 | pass |
| 2861 | soak_50_va_events.log | [pass] rule 저장: 9675 | pass |
| 2862 | soak_50_va_events.log | [pass] analysis tap 생성: analysis-tap-252 | pass |
| 2863 | soak_50_va_events.log | [pass] presence 이벤트 발생 | pass |
| 2864 | soak_50_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 2865 | soak_50_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 2866 | soak_50_va_events.log | [pass] enter 이벤트 발생 | pass |
| 2867 | soak_50_va_events.log | [pass] exit 이벤트 발생 | pass |
| 2868 | soak_50_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 2869 | soak_50_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 2870 | soak_50_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 2871 | soak_50_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 2872 | soak_50_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 2873 | soak_50_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 2874 | soak_50_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 2875 | soak_50_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 2876 | soak_50_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 2877 | soak_50_va_events.log | [pass] active tap 목록 검증 | pass |
| 2878 | soak_50_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 2879 | soak_50_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 2880 | soak_50_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 2881 | soak_50_event_post_schema.log | [pass] HTTP health ok | pass |
| 2882 | soak_50_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 2883 | soak_50_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 2884 | soak_50_event_post_schema.log | [pass] rule 저장: 9453 -> /event | pass |
| 2885 | soak_50_event_post_schema.log | [pass] rule 저장: 9454 -> /fail | pass |
| 2886 | soak_50_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-253 | pass |
| 2887 | soak_50_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 2888 | soak_50_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 2889 | soak_50_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 2890 | soak_50_event_post_recovery.log | [pass] HTTP health ok | pass |
| 2891 | soak_50_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 2892 | soak_50_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 2893 | soak_50_event_post_recovery.log | [pass] rule 저장: 9653 -> /flaky | pass |
| 2894 | soak_50_event_post_recovery.log | [pass] rule 저장: 9654 -> /flaky | pass |
| 2895 | soak_50_event_post_recovery.log | [pass] rule 저장: 9655 -> /flaky | pass |
| 2896 | soak_50_event_post_recovery.log | [pass] rule 저장: 9656 -> /flaky | pass |
| 2897 | soak_50_event_post_recovery.log | [pass] rule 저장: 9657 -> /flaky | pass |
| 2898 | soak_50_event_post_recovery.log | [pass] rule 저장: 9658 -> /flaky | pass |
| 2899 | soak_50_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-254 | pass |
| 2900 | soak_50_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 2901 | soak_50_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 2902 | soak_50_redaction.log | [pass] HTTP health ok | pass |
| 2903 | soak_50_redaction.log | [pass] runtime idle precheck ok | pass |
| 2904 | soak_50_redaction.log | [pass] live-va-redaction (36s) | pass |
| 2905 | soak_51_va_events.log | [pass] HTTP health ok | pass |
| 2906 | soak_51_va_events.log | [pass] rule 저장: 9725 | pass |
| 2907 | soak_51_va_events.log | [pass] rule 저장: 9726 | pass |
| 2908 | soak_51_va_events.log | [pass] rule 저장: 9727 | pass |
| 2909 | soak_51_va_events.log | [pass] rule 저장: 9728 | pass |
| 2910 | soak_51_va_events.log | [pass] rule 저장: 9729 | pass |
| 2911 | soak_51_va_events.log | [pass] rule 저장: 9730 | pass |
| 2912 | soak_51_va_events.log | [pass] rule 저장: 9731 | pass |
| 2913 | soak_51_va_events.log | [pass] rule 저장: 9732 | pass |
| 2914 | soak_51_va_events.log | [pass] rule 저장: 9733 | pass |
| 2915 | soak_51_va_events.log | [pass] rule 저장: 9734 | pass |
| 2916 | soak_51_va_events.log | [pass] rule 저장: 9735 | pass |
| 2917 | soak_51_va_events.log | [pass] analysis tap 생성: analysis-tap-257 | pass |
| 2918 | soak_51_va_events.log | [pass] presence 이벤트 발생 | pass |
| 2919 | soak_51_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 2920 | soak_51_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 2921 | soak_51_va_events.log | [pass] enter 이벤트 발생 | pass |
| 2922 | soak_51_va_events.log | [pass] exit 이벤트 발생 | pass |
| 2923 | soak_51_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 2924 | soak_51_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 2925 | soak_51_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 2926 | soak_51_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 2927 | soak_51_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 2928 | soak_51_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 2929 | soak_51_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 2930 | soak_51_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 2931 | soak_51_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 2932 | soak_51_va_events.log | [pass] active tap 목록 검증 | pass |
| 2933 | soak_51_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 2934 | soak_51_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 2935 | soak_51_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 2936 | soak_51_event_post_schema.log | [pass] HTTP health ok | pass |
| 2937 | soak_51_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 2938 | soak_51_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 2939 | soak_51_event_post_schema.log | [pass] rule 저장: 9637 -> /event | pass |
| 2940 | soak_51_event_post_schema.log | [pass] rule 저장: 9638 -> /fail | pass |
| 2941 | soak_51_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-258 | pass |
| 2942 | soak_51_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 2943 | soak_51_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 2944 | soak_51_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 2945 | soak_51_event_post_recovery.log | [pass] HTTP health ok | pass |
| 2946 | soak_51_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 2947 | soak_51_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 2948 | soak_51_event_post_recovery.log | [pass] rule 저장: 9445 -> /flaky | pass |
| 2949 | soak_51_event_post_recovery.log | [pass] rule 저장: 9446 -> /flaky | pass |
| 2950 | soak_51_event_post_recovery.log | [pass] rule 저장: 9447 -> /flaky | pass |
| 2951 | soak_51_event_post_recovery.log | [pass] rule 저장: 9448 -> /flaky | pass |
| 2952 | soak_51_event_post_recovery.log | [pass] rule 저장: 9449 -> /flaky | pass |
| 2953 | soak_51_event_post_recovery.log | [pass] rule 저장: 9450 -> /flaky | pass |
| 2954 | soak_51_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-259 | pass |
| 2955 | soak_51_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 2956 | soak_51_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 2957 | soak_51_redaction.log | [pass] HTTP health ok | pass |
| 2958 | soak_51_redaction.log | [pass] runtime idle precheck ok | pass |
| 2959 | soak_51_redaction.log | [pass] live-va-redaction (36s) | pass |
| 2960 | soak_52_va_events.log | [pass] HTTP health ok | pass |
| 2961 | soak_52_va_events.log | [pass] rule 저장: 9425 | pass |
| 2962 | soak_52_va_events.log | [pass] rule 저장: 9426 | pass |
| 2963 | soak_52_va_events.log | [pass] rule 저장: 9427 | pass |
| 2964 | soak_52_va_events.log | [pass] rule 저장: 9428 | pass |
| 2965 | soak_52_va_events.log | [pass] rule 저장: 9429 | pass |
| 2966 | soak_52_va_events.log | [pass] rule 저장: 9430 | pass |
| 2967 | soak_52_va_events.log | [pass] rule 저장: 9431 | pass |
| 2968 | soak_52_va_events.log | [pass] rule 저장: 9432 | pass |
| 2969 | soak_52_va_events.log | [pass] rule 저장: 9433 | pass |
| 2970 | soak_52_va_events.log | [pass] rule 저장: 9434 | pass |
| 2971 | soak_52_va_events.log | [pass] rule 저장: 9435 | pass |
| 2972 | soak_52_va_events.log | [pass] analysis tap 생성: analysis-tap-262 | pass |
| 2973 | soak_52_va_events.log | [pass] presence 이벤트 발생 | pass |
| 2974 | soak_52_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 2975 | soak_52_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 2976 | soak_52_va_events.log | [pass] enter 이벤트 발생 | pass |
| 2977 | soak_52_va_events.log | [pass] exit 이벤트 발생 | pass |
| 2978 | soak_52_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 2979 | soak_52_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 2980 | soak_52_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 2981 | soak_52_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 2982 | soak_52_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 2983 | soak_52_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 2984 | soak_52_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 2985 | soak_52_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 2986 | soak_52_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 2987 | soak_52_va_events.log | [pass] active tap 목록 검증 | pass |
| 2988 | soak_52_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 2989 | soak_52_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 2990 | soak_52_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 2991 | soak_52_event_post_schema.log | [pass] HTTP health ok | pass |
| 2992 | soak_52_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 2993 | soak_52_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 2994 | soak_52_event_post_schema.log | [pass] rule 저장: 9589 -> /event | pass |
| 2995 | soak_52_event_post_schema.log | [pass] rule 저장: 9590 -> /fail | pass |
| 2996 | soak_52_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-263 | pass |
| 2997 | soak_52_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 2998 | soak_52_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 2999 | soak_52_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 3000 | soak_52_event_post_recovery.log | [pass] HTTP health ok | pass |
| 3001 | soak_52_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 3002 | soak_52_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 3003 | soak_52_event_post_recovery.log | [pass] rule 저장: 9421 -> /flaky | pass |
| 3004 | soak_52_event_post_recovery.log | [pass] rule 저장: 9422 -> /flaky | pass |
| 3005 | soak_52_event_post_recovery.log | [pass] rule 저장: 9423 -> /flaky | pass |
| 3006 | soak_52_event_post_recovery.log | [pass] rule 저장: 9424 -> /flaky | pass |
| 3007 | soak_52_event_post_recovery.log | [pass] rule 저장: 9425 -> /flaky | pass |
| 3008 | soak_52_event_post_recovery.log | [pass] rule 저장: 9426 -> /flaky | pass |
| 3009 | soak_52_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-264 | pass |
| 3010 | soak_52_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 3011 | soak_52_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 3012 | soak_52_redaction.log | [pass] HTTP health ok | pass |
| 3013 | soak_52_redaction.log | [pass] runtime idle precheck ok | pass |
| 3014 | soak_52_redaction.log | [pass] live-va-redaction (36s) | pass |
| 3015 | soak_53_va_events.log | [pass] HTTP health ok | pass |
| 3016 | soak_53_va_events.log | [pass] rule 저장: 9665 | pass |
| 3017 | soak_53_va_events.log | [pass] rule 저장: 9666 | pass |
| 3018 | soak_53_va_events.log | [pass] rule 저장: 9667 | pass |
| 3019 | soak_53_va_events.log | [pass] rule 저장: 9668 | pass |
| 3020 | soak_53_va_events.log | [pass] rule 저장: 9669 | pass |
| 3021 | soak_53_va_events.log | [pass] rule 저장: 9670 | pass |
| 3022 | soak_53_va_events.log | [pass] rule 저장: 9671 | pass |
| 3023 | soak_53_va_events.log | [pass] rule 저장: 9672 | pass |
| 3024 | soak_53_va_events.log | [pass] rule 저장: 9673 | pass |
| 3025 | soak_53_va_events.log | [pass] rule 저장: 9674 | pass |
| 3026 | soak_53_va_events.log | [pass] rule 저장: 9675 | pass |
| 3027 | soak_53_va_events.log | [pass] analysis tap 생성: analysis-tap-267 | pass |
| 3028 | soak_53_va_events.log | [pass] presence 이벤트 발생 | pass |
| 3029 | soak_53_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 3030 | soak_53_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 3031 | soak_53_va_events.log | [pass] enter 이벤트 발생 | pass |
| 3032 | soak_53_va_events.log | [pass] exit 이벤트 발생 | pass |
| 3033 | soak_53_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 3034 | soak_53_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 3035 | soak_53_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 3036 | soak_53_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 3037 | soak_53_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 3038 | soak_53_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 3039 | soak_53_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 3040 | soak_53_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 3041 | soak_53_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 3042 | soak_53_va_events.log | [pass] active tap 목록 검증 | pass |
| 3043 | soak_53_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 3044 | soak_53_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 3045 | soak_53_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 3046 | soak_53_event_post_schema.log | [pass] HTTP health ok | pass |
| 3047 | soak_53_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 3048 | soak_53_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 3049 | soak_53_event_post_schema.log | [pass] rule 저장: 9317 -> /event | pass |
| 3050 | soak_53_event_post_schema.log | [pass] rule 저장: 9318 -> /fail | pass |
| 3051 | soak_53_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-268 | pass |
| 3052 | soak_53_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 3053 | soak_53_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 3054 | soak_53_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 3055 | soak_53_event_post_recovery.log | [pass] HTTP health ok | pass |
| 3056 | soak_53_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 3057 | soak_53_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 3058 | soak_53_event_post_recovery.log | [pass] rule 저장: 9533 -> /flaky | pass |
| 3059 | soak_53_event_post_recovery.log | [pass] rule 저장: 9534 -> /flaky | pass |
| 3060 | soak_53_event_post_recovery.log | [pass] rule 저장: 9535 -> /flaky | pass |
| 3061 | soak_53_event_post_recovery.log | [pass] rule 저장: 9536 -> /flaky | pass |
| 3062 | soak_53_event_post_recovery.log | [pass] rule 저장: 9537 -> /flaky | pass |
| 3063 | soak_53_event_post_recovery.log | [pass] rule 저장: 9538 -> /flaky | pass |
| 3064 | soak_53_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-269 | pass |
| 3065 | soak_53_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 3066 | soak_53_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 3067 | soak_53_redaction.log | [pass] HTTP health ok | pass |
| 3068 | soak_53_redaction.log | [pass] runtime idle precheck ok | pass |
| 3069 | soak_53_redaction.log | [pass] live-va-redaction (37s) | pass |
| 3070 | soak_54_va_events.log | [pass] HTTP health ok | pass |
| 3071 | soak_54_va_events.log | [pass] rule 저장: 9605 | pass |
| 3072 | soak_54_va_events.log | [pass] rule 저장: 9606 | pass |
| 3073 | soak_54_va_events.log | [pass] rule 저장: 9607 | pass |
| 3074 | soak_54_va_events.log | [pass] rule 저장: 9608 | pass |
| 3075 | soak_54_va_events.log | [pass] rule 저장: 9609 | pass |
| 3076 | soak_54_va_events.log | [pass] rule 저장: 9610 | pass |
| 3077 | soak_54_va_events.log | [pass] rule 저장: 9611 | pass |
| 3078 | soak_54_va_events.log | [pass] rule 저장: 9612 | pass |
| 3079 | soak_54_va_events.log | [pass] rule 저장: 9613 | pass |
| 3080 | soak_54_va_events.log | [pass] rule 저장: 9614 | pass |
| 3081 | soak_54_va_events.log | [pass] rule 저장: 9615 | pass |
| 3082 | soak_54_va_events.log | [pass] analysis tap 생성: analysis-tap-272 | pass |
| 3083 | soak_54_va_events.log | [pass] presence 이벤트 발생 | pass |
| 3084 | soak_54_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 3085 | soak_54_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 3086 | soak_54_va_events.log | [pass] enter 이벤트 발생 | pass |
| 3087 | soak_54_va_events.log | [pass] exit 이벤트 발생 | pass |
| 3088 | soak_54_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 3089 | soak_54_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 3090 | soak_54_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 3091 | soak_54_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 3092 | soak_54_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 3093 | soak_54_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 3094 | soak_54_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 3095 | soak_54_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 3096 | soak_54_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 3097 | soak_54_va_events.log | [pass] active tap 목록 검증 | pass |
| 3098 | soak_54_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 3099 | soak_54_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 3100 | soak_54_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 3101 | soak_54_event_post_schema.log | [pass] HTTP health ok | pass |
| 3102 | soak_54_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 3103 | soak_54_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 3104 | soak_54_event_post_schema.log | [pass] rule 저장: 9413 -> /event | pass |
| 3105 | soak_54_event_post_schema.log | [pass] rule 저장: 9414 -> /fail | pass |
| 3106 | soak_54_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-273 | pass |
| 3107 | soak_54_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 3108 | soak_54_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 3109 | soak_54_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 3110 | soak_54_event_post_recovery.log | [pass] HTTP health ok | pass |
| 3111 | soak_54_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 3112 | soak_54_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 3113 | soak_54_event_post_recovery.log | [pass] rule 저장: 9629 -> /flaky | pass |
| 3114 | soak_54_event_post_recovery.log | [pass] rule 저장: 9630 -> /flaky | pass |
| 3115 | soak_54_event_post_recovery.log | [pass] rule 저장: 9631 -> /flaky | pass |
| 3116 | soak_54_event_post_recovery.log | [pass] rule 저장: 9632 -> /flaky | pass |
| 3117 | soak_54_event_post_recovery.log | [pass] rule 저장: 9633 -> /flaky | pass |
| 3118 | soak_54_event_post_recovery.log | [pass] rule 저장: 9634 -> /flaky | pass |
| 3119 | soak_54_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-274 | pass |
| 3120 | soak_54_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 3121 | soak_54_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 3122 | soak_54_redaction.log | [pass] HTTP health ok | pass |
| 3123 | soak_54_redaction.log | [pass] runtime idle precheck ok | pass |
| 3124 | soak_54_redaction.log | [pass] live-va-redaction (36s) | pass |
| 3125 | soak_55_va_events.log | [pass] HTTP health ok | pass |
| 3126 | soak_55_va_events.log | [pass] rule 저장: 9713 | pass |
| 3127 | soak_55_va_events.log | [pass] rule 저장: 9714 | pass |
| 3128 | soak_55_va_events.log | [pass] rule 저장: 9715 | pass |
| 3129 | soak_55_va_events.log | [pass] rule 저장: 9716 | pass |
| 3130 | soak_55_va_events.log | [pass] rule 저장: 9717 | pass |
| 3131 | soak_55_va_events.log | [pass] rule 저장: 9718 | pass |
| 3132 | soak_55_va_events.log | [pass] rule 저장: 9719 | pass |
| 3133 | soak_55_va_events.log | [pass] rule 저장: 9720 | pass |
| 3134 | soak_55_va_events.log | [pass] rule 저장: 9721 | pass |
| 3135 | soak_55_va_events.log | [pass] rule 저장: 9722 | pass |
| 3136 | soak_55_va_events.log | [pass] rule 저장: 9723 | pass |
| 3137 | soak_55_va_events.log | [pass] analysis tap 생성: analysis-tap-277 | pass |
| 3138 | soak_55_va_events.log | [pass] presence 이벤트 발생 | pass |
| 3139 | soak_55_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 3140 | soak_55_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 3141 | soak_55_va_events.log | [pass] enter 이벤트 발생 | pass |
| 3142 | soak_55_va_events.log | [pass] exit 이벤트 발생 | pass |
| 3143 | soak_55_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 3144 | soak_55_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 3145 | soak_55_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 3146 | soak_55_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 3147 | soak_55_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 3148 | soak_55_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 3149 | soak_55_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 3150 | soak_55_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 3151 | soak_55_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 3152 | soak_55_va_events.log | [pass] active tap 목록 검증 | pass |
| 3153 | soak_55_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 3154 | soak_55_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 3155 | soak_55_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 3156 | soak_55_event_post_schema.log | [pass] HTTP health ok | pass |
| 3157 | soak_55_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 3158 | soak_55_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 3159 | soak_55_event_post_schema.log | [pass] rule 저장: 9309 -> /event | pass |
| 3160 | soak_55_event_post_schema.log | [pass] rule 저장: 9310 -> /fail | pass |
| 3161 | soak_55_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-278 | pass |
| 3162 | soak_55_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 3163 | soak_55_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 3164 | soak_55_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 3165 | soak_55_event_post_recovery.log | [pass] HTTP health ok | pass |
| 3166 | soak_55_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 3167 | soak_55_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 3168 | soak_55_event_post_recovery.log | [pass] rule 저장: 9525 -> /flaky | pass |
| 3169 | soak_55_event_post_recovery.log | [pass] rule 저장: 9526 -> /flaky | pass |
| 3170 | soak_55_event_post_recovery.log | [pass] rule 저장: 9527 -> /flaky | pass |
| 3171 | soak_55_event_post_recovery.log | [pass] rule 저장: 9528 -> /flaky | pass |
| 3172 | soak_55_event_post_recovery.log | [pass] rule 저장: 9529 -> /flaky | pass |
| 3173 | soak_55_event_post_recovery.log | [pass] rule 저장: 9530 -> /flaky | pass |
| 3174 | soak_55_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-279 | pass |
| 3175 | soak_55_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 3176 | soak_55_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 3177 | soak_55_redaction.log | [pass] HTTP health ok | pass |
| 3178 | soak_55_redaction.log | [pass] runtime idle precheck ok | pass |
| 3179 | soak_55_redaction.log | [pass] live-va-redaction (36s) | pass |
| 3180 | soak_56_va_events.log | [pass] HTTP health ok | pass |
| 3181 | soak_56_va_events.log | [pass] rule 저장: 9689 | pass |
| 3182 | soak_56_va_events.log | [pass] rule 저장: 9690 | pass |
| 3183 | soak_56_va_events.log | [pass] rule 저장: 9691 | pass |
| 3184 | soak_56_va_events.log | [pass] rule 저장: 9692 | pass |
| 3185 | soak_56_va_events.log | [pass] rule 저장: 9693 | pass |
| 3186 | soak_56_va_events.log | [pass] rule 저장: 9694 | pass |
| 3187 | soak_56_va_events.log | [pass] rule 저장: 9695 | pass |
| 3188 | soak_56_va_events.log | [pass] rule 저장: 9696 | pass |
| 3189 | soak_56_va_events.log | [pass] rule 저장: 9697 | pass |
| 3190 | soak_56_va_events.log | [pass] rule 저장: 9698 | pass |
| 3191 | soak_56_va_events.log | [pass] rule 저장: 9699 | pass |
| 3192 | soak_56_va_events.log | [pass] analysis tap 생성: analysis-tap-282 | pass |
| 3193 | soak_56_va_events.log | [pass] presence 이벤트 발생 | pass |
| 3194 | soak_56_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 3195 | soak_56_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 3196 | soak_56_va_events.log | [pass] enter 이벤트 발생 | pass |
| 3197 | soak_56_va_events.log | [pass] exit 이벤트 발생 | pass |
| 3198 | soak_56_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 3199 | soak_56_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 3200 | soak_56_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 3201 | soak_56_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 3202 | soak_56_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 3203 | soak_56_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 3204 | soak_56_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 3205 | soak_56_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 3206 | soak_56_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 3207 | soak_56_va_events.log | [pass] active tap 목록 검증 | pass |
| 3208 | soak_56_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 3209 | soak_56_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 3210 | soak_56_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 3211 | soak_56_event_post_schema.log | [pass] HTTP health ok | pass |
| 3212 | soak_56_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 3213 | soak_56_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 3214 | soak_56_event_post_schema.log | [pass] rule 저장: 9605 -> /event | pass |
| 3215 | soak_56_event_post_schema.log | [pass] rule 저장: 9606 -> /fail | pass |
| 3216 | soak_56_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-283 | pass |
| 3217 | soak_56_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 3218 | soak_56_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 3219 | soak_56_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 3220 | soak_56_event_post_recovery.log | [pass] HTTP health ok | pass |
| 3221 | soak_56_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 3222 | soak_56_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 3223 | soak_56_event_post_recovery.log | [pass] rule 저장: 9405 -> /flaky | pass |
| 3224 | soak_56_event_post_recovery.log | [pass] rule 저장: 9406 -> /flaky | pass |
| 3225 | soak_56_event_post_recovery.log | [pass] rule 저장: 9407 -> /flaky | pass |
| 3226 | soak_56_event_post_recovery.log | [pass] rule 저장: 9408 -> /flaky | pass |
| 3227 | soak_56_event_post_recovery.log | [pass] rule 저장: 9409 -> /flaky | pass |
| 3228 | soak_56_event_post_recovery.log | [pass] rule 저장: 9410 -> /flaky | pass |
| 3229 | soak_56_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-284 | pass |
| 3230 | soak_56_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 3231 | soak_56_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 3232 | soak_56_redaction.log | [pass] HTTP health ok | pass |
| 3233 | soak_56_redaction.log | [pass] runtime idle precheck ok | pass |
| 3234 | soak_56_redaction.log | [pass] live-va-redaction (35s) | pass |
| 3235 | soak_57_va_events.log | [pass] HTTP health ok | pass |
| 3236 | soak_57_va_events.log | [pass] rule 저장: 9653 | pass |
| 3237 | soak_57_va_events.log | [pass] rule 저장: 9654 | pass |
| 3238 | soak_57_va_events.log | [pass] rule 저장: 9655 | pass |
| 3239 | soak_57_va_events.log | [pass] rule 저장: 9656 | pass |
| 3240 | soak_57_va_events.log | [pass] rule 저장: 9657 | pass |
| 3241 | soak_57_va_events.log | [pass] rule 저장: 9658 | pass |
| 3242 | soak_57_va_events.log | [pass] rule 저장: 9659 | pass |
| 3243 | soak_57_va_events.log | [pass] rule 저장: 9660 | pass |
| 3244 | soak_57_va_events.log | [pass] rule 저장: 9661 | pass |
| 3245 | soak_57_va_events.log | [pass] rule 저장: 9662 | pass |
| 3246 | soak_57_va_events.log | [pass] rule 저장: 9663 | pass |
| 3247 | soak_57_va_events.log | [pass] analysis tap 생성: analysis-tap-287 | pass |
| 3248 | soak_57_va_events.log | [pass] presence 이벤트 발생 | pass |
| 3249 | soak_57_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 3250 | soak_57_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 3251 | soak_57_va_events.log | [pass] enter 이벤트 발생 | pass |
| 3252 | soak_57_va_events.log | [pass] exit 이벤트 발생 | pass |
| 3253 | soak_57_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 3254 | soak_57_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 3255 | soak_57_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 3256 | soak_57_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 3257 | soak_57_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 3258 | soak_57_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 3259 | soak_57_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 3260 | soak_57_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 3261 | soak_57_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 3262 | soak_57_va_events.log | [pass] active tap 목록 검증 | pass |
| 3263 | soak_57_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 3264 | soak_57_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 3265 | soak_57_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 3266 | soak_57_event_post_schema.log | [pass] HTTP health ok | pass |
| 3267 | soak_57_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 3268 | soak_57_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 3269 | soak_57_event_post_schema.log | [pass] rule 저장: 9365 -> /event | pass |
| 3270 | soak_57_event_post_schema.log | [pass] rule 저장: 9366 -> /fail | pass |
| 3271 | soak_57_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-288 | pass |
| 3272 | soak_57_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 3273 | soak_57_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 3274 | soak_57_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 3275 | soak_57_event_post_recovery.log | [pass] HTTP health ok | pass |
| 3276 | soak_57_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 3277 | soak_57_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 3278 | soak_57_event_post_recovery.log | [pass] rule 저장: 9565 -> /flaky | pass |
| 3279 | soak_57_event_post_recovery.log | [pass] rule 저장: 9566 -> /flaky | pass |
| 3280 | soak_57_event_post_recovery.log | [pass] rule 저장: 9567 -> /flaky | pass |
| 3281 | soak_57_event_post_recovery.log | [pass] rule 저장: 9568 -> /flaky | pass |
| 3282 | soak_57_event_post_recovery.log | [pass] rule 저장: 9569 -> /flaky | pass |
| 3283 | soak_57_event_post_recovery.log | [pass] rule 저장: 9570 -> /flaky | pass |
| 3284 | soak_57_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-289 | pass |
| 3285 | soak_57_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 3286 | soak_57_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 3287 | soak_57_redaction.log | [pass] HTTP health ok | pass |
| 3288 | soak_57_redaction.log | [pass] runtime idle precheck ok | pass |
| 3289 | soak_57_redaction.log | [pass] live-va-redaction (36s) | pass |
| 3290 | soak_58_va_events.log | [pass] HTTP health ok | pass |
| 3291 | soak_58_va_events.log | [pass] rule 저장: 9593 | pass |
| 3292 | soak_58_va_events.log | [pass] rule 저장: 9594 | pass |
| 3293 | soak_58_va_events.log | [pass] rule 저장: 9595 | pass |
| 3294 | soak_58_va_events.log | [pass] rule 저장: 9596 | pass |
| 3295 | soak_58_va_events.log | [pass] rule 저장: 9597 | pass |
| 3296 | soak_58_va_events.log | [pass] rule 저장: 9598 | pass |
| 3297 | soak_58_va_events.log | [pass] rule 저장: 9599 | pass |
| 3298 | soak_58_va_events.log | [pass] rule 저장: 9600 | pass |
| 3299 | soak_58_va_events.log | [pass] rule 저장: 9601 | pass |
| 3300 | soak_58_va_events.log | [pass] rule 저장: 9602 | pass |
| 3301 | soak_58_va_events.log | [pass] rule 저장: 9603 | pass |
| 3302 | soak_58_va_events.log | [pass] analysis tap 생성: analysis-tap-292 | pass |
| 3303 | soak_58_va_events.log | [pass] presence 이벤트 발생 | pass |
| 3304 | soak_58_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 3305 | soak_58_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 3306 | soak_58_va_events.log | [pass] enter 이벤트 발생 | pass |
| 3307 | soak_58_va_events.log | [pass] exit 이벤트 발생 | pass |
| 3308 | soak_58_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 3309 | soak_58_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 3310 | soak_58_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 3311 | soak_58_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 3312 | soak_58_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 3313 | soak_58_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 3314 | soak_58_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 3315 | soak_58_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 3316 | soak_58_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 3317 | soak_58_va_events.log | [pass] active tap 목록 검증 | pass |
| 3318 | soak_58_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 3319 | soak_58_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 3320 | soak_58_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 3321 | soak_58_event_post_schema.log | [pass] HTTP health ok | pass |
| 3322 | soak_58_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 3323 | soak_58_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 3324 | soak_58_event_post_schema.log | [pass] rule 저장: 9621 -> /event | pass |
| 3325 | soak_58_event_post_schema.log | [pass] rule 저장: 9622 -> /fail | pass |
| 3326 | soak_58_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-293 | pass |
| 3327 | soak_58_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 3328 | soak_58_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 3329 | soak_58_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 3330 | soak_58_event_post_recovery.log | [pass] HTTP health ok | pass |
| 3331 | soak_58_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 3332 | soak_58_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 3333 | soak_58_event_post_recovery.log | [pass] rule 저장: 9421 -> /flaky | pass |
| 3334 | soak_58_event_post_recovery.log | [pass] rule 저장: 9422 -> /flaky | pass |
| 3335 | soak_58_event_post_recovery.log | [pass] rule 저장: 9423 -> /flaky | pass |
| 3336 | soak_58_event_post_recovery.log | [pass] rule 저장: 9424 -> /flaky | pass |
| 3337 | soak_58_event_post_recovery.log | [pass] rule 저장: 9425 -> /flaky | pass |
| 3338 | soak_58_event_post_recovery.log | [pass] rule 저장: 9426 -> /flaky | pass |
| 3339 | soak_58_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-294 | pass |
| 3340 | soak_58_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 3341 | soak_58_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 3342 | soak_58_redaction.log | [pass] HTTP health ok | pass |
| 3343 | soak_58_redaction.log | [pass] runtime idle precheck ok | pass |
| 3344 | soak_58_redaction.log | [pass] live-va-redaction (36s) | pass |
| 3345 | soak_59_va_events.log | [pass] HTTP health ok | pass |
| 3346 | soak_59_va_events.log | [pass] rule 저장: 9533 | pass |
| 3347 | soak_59_va_events.log | [pass] rule 저장: 9534 | pass |
| 3348 | soak_59_va_events.log | [pass] rule 저장: 9535 | pass |
| 3349 | soak_59_va_events.log | [pass] rule 저장: 9536 | pass |
| 3350 | soak_59_va_events.log | [pass] rule 저장: 9537 | pass |
| 3351 | soak_59_va_events.log | [pass] rule 저장: 9538 | pass |
| 3352 | soak_59_va_events.log | [pass] rule 저장: 9539 | pass |
| 3353 | soak_59_va_events.log | [pass] rule 저장: 9540 | pass |
| 3354 | soak_59_va_events.log | [pass] rule 저장: 9541 | pass |
| 3355 | soak_59_va_events.log | [pass] rule 저장: 9542 | pass |
| 3356 | soak_59_va_events.log | [pass] rule 저장: 9543 | pass |
| 3357 | soak_59_va_events.log | [pass] analysis tap 생성: analysis-tap-297 | pass |
| 3358 | soak_59_va_events.log | [pass] presence 이벤트 발생 | pass |
| 3359 | soak_59_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 3360 | soak_59_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 3361 | soak_59_va_events.log | [pass] enter 이벤트 발생 | pass |
| 3362 | soak_59_va_events.log | [pass] exit 이벤트 발생 | pass |
| 3363 | soak_59_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 3364 | soak_59_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 3365 | soak_59_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 3366 | soak_59_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 3367 | soak_59_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 3368 | soak_59_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 3369 | soak_59_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 3370 | soak_59_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 3371 | soak_59_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 3372 | soak_59_va_events.log | [pass] active tap 목록 검증 | pass |
| 3373 | soak_59_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 3374 | soak_59_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 3375 | soak_59_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 3376 | soak_59_event_post_schema.log | [pass] HTTP health ok | pass |
| 3377 | soak_59_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 3378 | soak_59_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 3379 | soak_59_event_post_schema.log | [pass] rule 저장: 9477 -> /event | pass |
| 3380 | soak_59_event_post_schema.log | [pass] rule 저장: 9478 -> /fail | pass |
| 3381 | soak_59_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-298 | pass |
| 3382 | soak_59_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 3383 | soak_59_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 3384 | soak_59_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 3385 | soak_59_event_post_recovery.log | [pass] HTTP health ok | pass |
| 3386 | soak_59_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 3387 | soak_59_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 3388 | soak_59_event_post_recovery.log | [pass] rule 저장: 9693 -> /flaky | pass |
| 3389 | soak_59_event_post_recovery.log | [pass] rule 저장: 9694 -> /flaky | pass |
| 3390 | soak_59_event_post_recovery.log | [pass] rule 저장: 9695 -> /flaky | pass |
| 3391 | soak_59_event_post_recovery.log | [pass] rule 저장: 9696 -> /flaky | pass |
| 3392 | soak_59_event_post_recovery.log | [pass] rule 저장: 9697 -> /flaky | pass |
| 3393 | soak_59_event_post_recovery.log | [pass] rule 저장: 9698 -> /flaky | pass |
| 3394 | soak_59_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-299 | pass |
| 3395 | soak_59_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 3396 | soak_59_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 3397 | soak_59_redaction.log | [pass] HTTP health ok | pass |
| 3398 | soak_59_redaction.log | [pass] runtime idle precheck ok | pass |
| 3399 | soak_59_redaction.log | [pass] live-va-redaction (36s) | pass |
| 3400 | soak_60_va_events.log | [pass] HTTP health ok | pass |
| 3401 | soak_60_va_events.log | [pass] rule 저장: 9713 | pass |
| 3402 | soak_60_va_events.log | [pass] rule 저장: 9714 | pass |
| 3403 | soak_60_va_events.log | [pass] rule 저장: 9715 | pass |
| 3404 | soak_60_va_events.log | [pass] rule 저장: 9716 | pass |
| 3405 | soak_60_va_events.log | [pass] rule 저장: 9717 | pass |
| 3406 | soak_60_va_events.log | [pass] rule 저장: 9718 | pass |
| 3407 | soak_60_va_events.log | [pass] rule 저장: 9719 | pass |
| 3408 | soak_60_va_events.log | [pass] rule 저장: 9720 | pass |
| 3409 | soak_60_va_events.log | [pass] rule 저장: 9721 | pass |
| 3410 | soak_60_va_events.log | [pass] rule 저장: 9722 | pass |
| 3411 | soak_60_va_events.log | [pass] rule 저장: 9723 | pass |
| 3412 | soak_60_va_events.log | [pass] analysis tap 생성: analysis-tap-302 | pass |
| 3413 | soak_60_va_events.log | [pass] presence 이벤트 발생 | pass |
| 3414 | soak_60_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 3415 | soak_60_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 3416 | soak_60_va_events.log | [pass] enter 이벤트 발생 | pass |
| 3417 | soak_60_va_events.log | [pass] exit 이벤트 발생 | pass |
| 3418 | soak_60_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 3419 | soak_60_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 3420 | soak_60_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 3421 | soak_60_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 3422 | soak_60_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 3423 | soak_60_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 3424 | soak_60_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 3425 | soak_60_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 3426 | soak_60_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 3427 | soak_60_va_events.log | [pass] active tap 목록 검증 | pass |
| 3428 | soak_60_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 3429 | soak_60_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 3430 | soak_60_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 3431 | soak_60_event_post_schema.log | [pass] HTTP health ok | pass |
| 3432 | soak_60_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 3433 | soak_60_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 3434 | soak_60_event_post_schema.log | [pass] rule 저장: 9677 -> /event | pass |
| 3435 | soak_60_event_post_schema.log | [pass] rule 저장: 9678 -> /fail | pass |
| 3436 | soak_60_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-303 | pass |
| 3437 | soak_60_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 3438 | soak_60_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 3439 | soak_60_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 3440 | soak_60_event_post_recovery.log | [pass] HTTP health ok | pass |
| 3441 | soak_60_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 3442 | soak_60_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 3443 | soak_60_event_post_recovery.log | [pass] rule 저장: 9493 -> /flaky | pass |
| 3444 | soak_60_event_post_recovery.log | [pass] rule 저장: 9494 -> /flaky | pass |
| 3445 | soak_60_event_post_recovery.log | [pass] rule 저장: 9495 -> /flaky | pass |
| 3446 | soak_60_event_post_recovery.log | [pass] rule 저장: 9496 -> /flaky | pass |
| 3447 | soak_60_event_post_recovery.log | [pass] rule 저장: 9497 -> /flaky | pass |
| 3448 | soak_60_event_post_recovery.log | [pass] rule 저장: 9498 -> /flaky | pass |
| 3449 | soak_60_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-304 | pass |
| 3450 | soak_60_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 3451 | soak_60_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 3452 | soak_60_redaction.log | [pass] HTTP health ok | pass |
| 3453 | soak_60_redaction.log | [pass] runtime idle precheck ok | pass |
| 3454 | soak_60_redaction.log | [pass] live-va-redaction (37s) | pass |
| 3455 | soak_61_va_events.log | [pass] HTTP health ok | pass |
| 3456 | soak_61_va_events.log | [pass] rule 저장: 9437 | pass |
| 3457 | soak_61_va_events.log | [pass] rule 저장: 9438 | pass |
| 3458 | soak_61_va_events.log | [pass] rule 저장: 9439 | pass |
| 3459 | soak_61_va_events.log | [pass] rule 저장: 9440 | pass |
| 3460 | soak_61_va_events.log | [pass] rule 저장: 9441 | pass |
| 3461 | soak_61_va_events.log | [pass] rule 저장: 9442 | pass |
| 3462 | soak_61_va_events.log | [pass] rule 저장: 9443 | pass |
| 3463 | soak_61_va_events.log | [pass] rule 저장: 9444 | pass |
| 3464 | soak_61_va_events.log | [pass] rule 저장: 9445 | pass |
| 3465 | soak_61_va_events.log | [pass] rule 저장: 9446 | pass |
| 3466 | soak_61_va_events.log | [pass] rule 저장: 9447 | pass |
| 3467 | soak_61_va_events.log | [pass] analysis tap 생성: analysis-tap-307 | pass |
| 3468 | soak_61_va_events.log | [pass] presence 이벤트 발생 | pass |
| 3469 | soak_61_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 3470 | soak_61_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 3471 | soak_61_va_events.log | [pass] enter 이벤트 발생 | pass |
| 3472 | soak_61_va_events.log | [pass] exit 이벤트 발생 | pass |
| 3473 | soak_61_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 3474 | soak_61_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 3475 | soak_61_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 3476 | soak_61_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 3477 | soak_61_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 3478 | soak_61_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 3479 | soak_61_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 3480 | soak_61_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 3481 | soak_61_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 3482 | soak_61_va_events.log | [pass] active tap 목록 검증 | pass |
| 3483 | soak_61_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 3484 | soak_61_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 3485 | soak_61_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 3486 | soak_61_event_post_schema.log | [pass] HTTP health ok | pass |
| 3487 | soak_61_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 3488 | soak_61_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 3489 | soak_61_event_post_schema.log | [pass] rule 저장: 9685 -> /event | pass |
| 3490 | soak_61_event_post_schema.log | [pass] rule 저장: 9686 -> /fail | pass |
| 3491 | soak_61_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-308 | pass |
| 3492 | soak_61_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 3493 | soak_61_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 3494 | soak_61_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 3495 | soak_61_event_post_recovery.log | [pass] HTTP health ok | pass |
| 3496 | soak_61_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 3497 | soak_61_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 3498 | soak_61_event_post_recovery.log | [pass] rule 저장: 9485 -> /flaky | pass |
| 3499 | soak_61_event_post_recovery.log | [pass] rule 저장: 9486 -> /flaky | pass |
| 3500 | soak_61_event_post_recovery.log | [pass] rule 저장: 9487 -> /flaky | pass |
| 3501 | soak_61_event_post_recovery.log | [pass] rule 저장: 9488 -> /flaky | pass |
| 3502 | soak_61_event_post_recovery.log | [pass] rule 저장: 9489 -> /flaky | pass |
| 3503 | soak_61_event_post_recovery.log | [pass] rule 저장: 9490 -> /flaky | pass |
| 3504 | soak_61_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-309 | pass |
| 3505 | soak_61_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 3506 | soak_61_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 3507 | soak_61_redaction.log | [pass] HTTP health ok | pass |
| 3508 | soak_61_redaction.log | [pass] runtime idle precheck ok | pass |
| 3509 | soak_61_redaction.log | [pass] live-va-redaction (36s) | pass |
| 3510 | soak_62_va_events.log | [pass] HTTP health ok | pass |
| 3511 | soak_62_va_events.log | [pass] rule 저장: 9749 | pass |
| 3512 | soak_62_va_events.log | [pass] rule 저장: 9750 | pass |
| 3513 | soak_62_va_events.log | [pass] rule 저장: 9751 | pass |
| 3514 | soak_62_va_events.log | [pass] rule 저장: 9752 | pass |
| 3515 | soak_62_va_events.log | [pass] rule 저장: 9753 | pass |
| 3516 | soak_62_va_events.log | [pass] rule 저장: 9754 | pass |
| 3517 | soak_62_va_events.log | [pass] rule 저장: 9755 | pass |
| 3518 | soak_62_va_events.log | [pass] rule 저장: 9756 | pass |
| 3519 | soak_62_va_events.log | [pass] rule 저장: 9757 | pass |
| 3520 | soak_62_va_events.log | [pass] rule 저장: 9758 | pass |
| 3521 | soak_62_va_events.log | [pass] rule 저장: 9759 | pass |
| 3522 | soak_62_va_events.log | [pass] analysis tap 생성: analysis-tap-312 | pass |
| 3523 | soak_62_va_events.log | [pass] presence 이벤트 발생 | pass |
| 3524 | soak_62_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 3525 | soak_62_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 3526 | soak_62_va_events.log | [pass] enter 이벤트 발생 | pass |
| 3527 | soak_62_va_events.log | [pass] exit 이벤트 발생 | pass |
| 3528 | soak_62_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 3529 | soak_62_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 3530 | soak_62_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 3531 | soak_62_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 3532 | soak_62_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 3533 | soak_62_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 3534 | soak_62_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 3535 | soak_62_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 3536 | soak_62_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 3537 | soak_62_va_events.log | [pass] active tap 목록 검증 | pass |
| 3538 | soak_62_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 3539 | soak_62_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 3540 | soak_62_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 3541 | soak_62_event_post_schema.log | [pass] HTTP health ok | pass |
| 3542 | soak_62_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 3543 | soak_62_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 3544 | soak_62_event_post_schema.log | [pass] rule 저장: 9357 -> /event | pass |
| 3545 | soak_62_event_post_schema.log | [pass] rule 저장: 9358 -> /fail | pass |
| 3546 | soak_62_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-313 | pass |
| 3547 | soak_62_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 3548 | soak_62_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 3549 | soak_62_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 3550 | soak_62_event_post_recovery.log | [pass] HTTP health ok | pass |
| 3551 | soak_62_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 3552 | soak_62_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 3553 | soak_62_event_post_recovery.log | [pass] rule 저장: 9565 -> /flaky | pass |
| 3554 | soak_62_event_post_recovery.log | [pass] rule 저장: 9566 -> /flaky | pass |
| 3555 | soak_62_event_post_recovery.log | [pass] rule 저장: 9567 -> /flaky | pass |
| 3556 | soak_62_event_post_recovery.log | [pass] rule 저장: 9568 -> /flaky | pass |
| 3557 | soak_62_event_post_recovery.log | [pass] rule 저장: 9569 -> /flaky | pass |
| 3558 | soak_62_event_post_recovery.log | [pass] rule 저장: 9570 -> /flaky | pass |
| 3559 | soak_62_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-314 | pass |
| 3560 | soak_62_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 3561 | soak_62_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 3562 | soak_62_redaction.log | [pass] HTTP health ok | pass |
| 3563 | soak_62_redaction.log | [pass] runtime idle precheck ok | pass |
| 3564 | soak_62_redaction.log | [pass] live-va-redaction (36s) | pass |
| 3565 | soak_63_va_events.log | [pass] HTTP health ok | pass |
| 3566 | soak_63_va_events.log | [pass] rule 저장: 9401 | pass |
| 3567 | soak_63_va_events.log | [pass] rule 저장: 9402 | pass |
| 3568 | soak_63_va_events.log | [pass] rule 저장: 9403 | pass |
| 3569 | soak_63_va_events.log | [pass] rule 저장: 9404 | pass |
| 3570 | soak_63_va_events.log | [pass] rule 저장: 9405 | pass |
| 3571 | soak_63_va_events.log | [pass] rule 저장: 9406 | pass |
| 3572 | soak_63_va_events.log | [pass] rule 저장: 9407 | pass |
| 3573 | soak_63_va_events.log | [pass] rule 저장: 9408 | pass |
| 3574 | soak_63_va_events.log | [pass] rule 저장: 9409 | pass |
| 3575 | soak_63_va_events.log | [pass] rule 저장: 9410 | pass |
| 3576 | soak_63_va_events.log | [pass] rule 저장: 9411 | pass |
| 3577 | soak_63_va_events.log | [pass] analysis tap 생성: analysis-tap-317 | pass |
| 3578 | soak_63_va_events.log | [pass] presence 이벤트 발생 | pass |
| 3579 | soak_63_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 3580 | soak_63_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 3581 | soak_63_va_events.log | [pass] enter 이벤트 발생 | pass |
| 3582 | soak_63_va_events.log | [pass] exit 이벤트 발생 | pass |
| 3583 | soak_63_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 3584 | soak_63_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 3585 | soak_63_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 3586 | soak_63_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 3587 | soak_63_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 3588 | soak_63_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 3589 | soak_63_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 3590 | soak_63_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 3591 | soak_63_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 3592 | soak_63_va_events.log | [pass] active tap 목록 검증 | pass |
| 3593 | soak_63_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 3594 | soak_63_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 3595 | soak_63_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 3596 | soak_63_event_post_schema.log | [pass] HTTP health ok | pass |
| 3597 | soak_63_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 3598 | soak_63_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 3599 | soak_63_event_post_schema.log | [pass] rule 저장: 9493 -> /event | pass |
| 3600 | soak_63_event_post_schema.log | [pass] rule 저장: 9494 -> /fail | pass |
| 3601 | soak_63_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-318 | pass |
| 3602 | soak_63_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 3603 | soak_63_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 3604 | soak_63_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 3605 | soak_63_event_post_recovery.log | [pass] HTTP health ok | pass |
| 3606 | soak_63_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 3607 | soak_63_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 3608 | soak_63_event_post_recovery.log | [pass] rule 저장: 9693 -> /flaky | pass |
| 3609 | soak_63_event_post_recovery.log | [pass] rule 저장: 9694 -> /flaky | pass |
| 3610 | soak_63_event_post_recovery.log | [pass] rule 저장: 9695 -> /flaky | pass |
| 3611 | soak_63_event_post_recovery.log | [pass] rule 저장: 9696 -> /flaky | pass |
| 3612 | soak_63_event_post_recovery.log | [pass] rule 저장: 9697 -> /flaky | pass |
| 3613 | soak_63_event_post_recovery.log | [pass] rule 저장: 9698 -> /flaky | pass |
| 3614 | soak_63_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-319 | pass |
| 3615 | soak_63_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 3616 | soak_63_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 3617 | soak_63_redaction.log | [pass] HTTP health ok | pass |
| 3618 | soak_63_redaction.log | [pass] runtime idle precheck ok | pass |
| 3619 | soak_63_redaction.log | [pass] live-va-redaction (37s) | pass |
| 3620 | soak_64_va_events.log | [pass] HTTP health ok | pass |
| 3621 | soak_64_va_events.log | [pass] rule 저장: 9449 | pass |
| 3622 | soak_64_va_events.log | [pass] rule 저장: 9450 | pass |
| 3623 | soak_64_va_events.log | [pass] rule 저장: 9451 | pass |
| 3624 | soak_64_va_events.log | [pass] rule 저장: 9452 | pass |
| 3625 | soak_64_va_events.log | [pass] rule 저장: 9453 | pass |
| 3626 | soak_64_va_events.log | [pass] rule 저장: 9454 | pass |
| 3627 | soak_64_va_events.log | [pass] rule 저장: 9455 | pass |
| 3628 | soak_64_va_events.log | [pass] rule 저장: 9456 | pass |
| 3629 | soak_64_va_events.log | [pass] rule 저장: 9457 | pass |
| 3630 | soak_64_va_events.log | [pass] rule 저장: 9458 | pass |
| 3631 | soak_64_va_events.log | [pass] rule 저장: 9459 | pass |
| 3632 | soak_64_va_events.log | [pass] analysis tap 생성: analysis-tap-322 | pass |
| 3633 | soak_64_va_events.log | [pass] presence 이벤트 발생 | pass |
| 3634 | soak_64_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 3635 | soak_64_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 3636 | soak_64_va_events.log | [pass] enter 이벤트 발생 | pass |
| 3637 | soak_64_va_events.log | [pass] exit 이벤트 발생 | pass |
| 3638 | soak_64_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 3639 | soak_64_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 3640 | soak_64_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 3641 | soak_64_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 3642 | soak_64_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 3643 | soak_64_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 3644 | soak_64_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 3645 | soak_64_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 3646 | soak_64_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 3647 | soak_64_va_events.log | [pass] active tap 목록 검증 | pass |
| 3648 | soak_64_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 3649 | soak_64_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 3650 | soak_64_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 3651 | soak_64_event_post_schema.log | [pass] HTTP health ok | pass |
| 3652 | soak_64_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 3653 | soak_64_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 3654 | soak_64_event_post_schema.log | [pass] rule 저장: 9677 -> /event | pass |
| 3655 | soak_64_event_post_schema.log | [pass] rule 저장: 9678 -> /fail | pass |
| 3656 | soak_64_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-323 | pass |
| 3657 | soak_64_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 3658 | soak_64_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 3659 | soak_64_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 3660 | soak_64_event_post_recovery.log | [pass] HTTP health ok | pass |
| 3661 | soak_64_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 3662 | soak_64_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 3663 | soak_64_event_post_recovery.log | [pass] rule 저장: 9477 -> /flaky | pass |
| 3664 | soak_64_event_post_recovery.log | [pass] rule 저장: 9478 -> /flaky | pass |
| 3665 | soak_64_event_post_recovery.log | [pass] rule 저장: 9479 -> /flaky | pass |
| 3666 | soak_64_event_post_recovery.log | [pass] rule 저장: 9480 -> /flaky | pass |
| 3667 | soak_64_event_post_recovery.log | [pass] rule 저장: 9481 -> /flaky | pass |
| 3668 | soak_64_event_post_recovery.log | [pass] rule 저장: 9482 -> /flaky | pass |
| 3669 | soak_64_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-324 | pass |
| 3670 | soak_64_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 3671 | soak_64_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 3672 | soak_64_redaction.log | [pass] HTTP health ok | pass |
| 3673 | soak_64_redaction.log | [pass] runtime idle precheck ok | pass |
| 3674 | soak_64_redaction.log | [pass] live-va-redaction (36s) | pass |
| 3675 | soak_65_va_events.log | [pass] HTTP health ok | pass |
| 3676 | soak_65_va_events.log | [pass] rule 저장: 9689 | pass |
| 3677 | soak_65_va_events.log | [pass] rule 저장: 9690 | pass |
| 3678 | soak_65_va_events.log | [pass] rule 저장: 9691 | pass |
| 3679 | soak_65_va_events.log | [pass] rule 저장: 9692 | pass |
| 3680 | soak_65_va_events.log | [pass] rule 저장: 9693 | pass |
| 3681 | soak_65_va_events.log | [pass] rule 저장: 9694 | pass |
| 3682 | soak_65_va_events.log | [pass] rule 저장: 9695 | pass |
| 3683 | soak_65_va_events.log | [pass] rule 저장: 9696 | pass |
| 3684 | soak_65_va_events.log | [pass] rule 저장: 9697 | pass |
| 3685 | soak_65_va_events.log | [pass] rule 저장: 9698 | pass |
| 3686 | soak_65_va_events.log | [pass] rule 저장: 9699 | pass |
| 3687 | soak_65_va_events.log | [pass] analysis tap 생성: analysis-tap-327 | pass |
| 3688 | soak_65_va_events.log | [pass] presence 이벤트 발생 | pass |
| 3689 | soak_65_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 3690 | soak_65_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 3691 | soak_65_va_events.log | [pass] enter 이벤트 발생 | pass |
| 3692 | soak_65_va_events.log | [pass] exit 이벤트 발생 | pass |
| 3693 | soak_65_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 3694 | soak_65_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 3695 | soak_65_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 3696 | soak_65_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 3697 | soak_65_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 3698 | soak_65_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 3699 | soak_65_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 3700 | soak_65_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 3701 | soak_65_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 3702 | soak_65_va_events.log | [pass] active tap 목록 검증 | pass |
| 3703 | soak_65_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 3704 | soak_65_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 3705 | soak_65_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 3706 | soak_65_event_post_schema.log | [pass] HTTP health ok | pass |
| 3707 | soak_65_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 3708 | soak_65_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 3709 | soak_65_event_post_schema.log | [pass] rule 저장: 9541 -> /event | pass |
| 3710 | soak_65_event_post_schema.log | [pass] rule 저장: 9542 -> /fail | pass |
| 3711 | soak_65_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-328 | pass |
| 3712 | soak_65_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 3713 | soak_65_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 3714 | soak_65_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 3715 | soak_65_event_post_recovery.log | [pass] HTTP health ok | pass |
| 3716 | soak_65_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 3717 | soak_65_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 3718 | soak_65_event_post_recovery.log | [pass] rule 저장: 9349 -> /flaky | pass |
| 3719 | soak_65_event_post_recovery.log | [pass] rule 저장: 9350 -> /flaky | pass |
| 3720 | soak_65_event_post_recovery.log | [pass] rule 저장: 9351 -> /flaky | pass |
| 3721 | soak_65_event_post_recovery.log | [pass] rule 저장: 9352 -> /flaky | pass |
| 3722 | soak_65_event_post_recovery.log | [pass] rule 저장: 9353 -> /flaky | pass |
| 3723 | soak_65_event_post_recovery.log | [pass] rule 저장: 9354 -> /flaky | pass |
| 3724 | soak_65_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-329 | pass |
| 3725 | soak_65_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 3726 | soak_65_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 3727 | soak_65_redaction.log | [pass] HTTP health ok | pass |
| 3728 | soak_65_redaction.log | [pass] runtime idle precheck ok | pass |
| 3729 | soak_65_redaction.log | [pass] live-va-redaction (36s) | pass |
| 3730 | soak_66_va_events.log | [pass] HTTP health ok | pass |
| 3731 | soak_66_va_events.log | [pass] rule 저장: 9725 | pass |
| 3732 | soak_66_va_events.log | [pass] rule 저장: 9726 | pass |
| 3733 | soak_66_va_events.log | [pass] rule 저장: 9727 | pass |
| 3734 | soak_66_va_events.log | [pass] rule 저장: 9728 | pass |
| 3735 | soak_66_va_events.log | [pass] rule 저장: 9729 | pass |
| 3736 | soak_66_va_events.log | [pass] rule 저장: 9730 | pass |
| 3737 | soak_66_va_events.log | [pass] rule 저장: 9731 | pass |
| 3738 | soak_66_va_events.log | [pass] rule 저장: 9732 | pass |
| 3739 | soak_66_va_events.log | [pass] rule 저장: 9733 | pass |
| 3740 | soak_66_va_events.log | [pass] rule 저장: 9734 | pass |
| 3741 | soak_66_va_events.log | [pass] rule 저장: 9735 | pass |
| 3742 | soak_66_va_events.log | [pass] analysis tap 생성: analysis-tap-332 | pass |
| 3743 | soak_66_va_events.log | [pass] presence 이벤트 발생 | pass |
| 3744 | soak_66_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 3745 | soak_66_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 3746 | soak_66_va_events.log | [pass] enter 이벤트 발생 | pass |
| 3747 | soak_66_va_events.log | [pass] exit 이벤트 발생 | pass |
| 3748 | soak_66_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 3749 | soak_66_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 3750 | soak_66_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 3751 | soak_66_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 3752 | soak_66_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 3753 | soak_66_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 3754 | soak_66_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 3755 | soak_66_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 3756 | soak_66_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 3757 | soak_66_va_events.log | [pass] active tap 목록 검증 | pass |
| 3758 | soak_66_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 3759 | soak_66_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 3760 | soak_66_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 3761 | soak_66_event_post_schema.log | [pass] HTTP health ok | pass |
| 3762 | soak_66_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 3763 | soak_66_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 3764 | soak_66_event_post_schema.log | [pass] rule 저장: 9653 -> /event | pass |
| 3765 | soak_66_event_post_schema.log | [pass] rule 저장: 9654 -> /fail | pass |
| 3766 | soak_66_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-333 | pass |
| 3767 | soak_66_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 3768 | soak_66_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 3769 | soak_66_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 3770 | soak_66_event_post_recovery.log | [pass] HTTP health ok | pass |
| 3771 | soak_66_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 3772 | soak_66_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 3773 | soak_66_event_post_recovery.log | [pass] rule 저장: 9453 -> /flaky | pass |
| 3774 | soak_66_event_post_recovery.log | [pass] rule 저장: 9454 -> /flaky | pass |
| 3775 | soak_66_event_post_recovery.log | [pass] rule 저장: 9455 -> /flaky | pass |
| 3776 | soak_66_event_post_recovery.log | [pass] rule 저장: 9456 -> /flaky | pass |
| 3777 | soak_66_event_post_recovery.log | [pass] rule 저장: 9457 -> /flaky | pass |
| 3778 | soak_66_event_post_recovery.log | [pass] rule 저장: 9458 -> /flaky | pass |
| 3779 | soak_66_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-334 | pass |
| 3780 | soak_66_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 3781 | soak_66_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 3782 | soak_66_redaction.log | [pass] HTTP health ok | pass |
| 3783 | soak_66_redaction.log | [pass] runtime idle precheck ok | pass |
| 3784 | soak_66_redaction.log | [pass] live-va-redaction (37s) | pass |
| 3785 | soak_67_va_events.log | [pass] HTTP health ok | pass |
| 3786 | soak_67_va_events.log | [pass] rule 저장: 9713 | pass |
| 3787 | soak_67_va_events.log | [pass] rule 저장: 9714 | pass |
| 3788 | soak_67_va_events.log | [pass] rule 저장: 9715 | pass |
| 3789 | soak_67_va_events.log | [pass] rule 저장: 9716 | pass |
| 3790 | soak_67_va_events.log | [pass] rule 저장: 9717 | pass |
| 3791 | soak_67_va_events.log | [pass] rule 저장: 9718 | pass |
| 3792 | soak_67_va_events.log | [pass] rule 저장: 9719 | pass |
| 3793 | soak_67_va_events.log | [pass] rule 저장: 9720 | pass |
| 3794 | soak_67_va_events.log | [pass] rule 저장: 9721 | pass |
| 3795 | soak_67_va_events.log | [pass] rule 저장: 9722 | pass |
| 3796 | soak_67_va_events.log | [pass] rule 저장: 9723 | pass |
| 3797 | soak_67_va_events.log | [pass] analysis tap 생성: analysis-tap-337 | pass |
| 3798 | soak_67_va_events.log | [pass] presence 이벤트 발생 | pass |
| 3799 | soak_67_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 3800 | soak_67_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 3801 | soak_67_va_events.log | [pass] enter 이벤트 발생 | pass |
| 3802 | soak_67_va_events.log | [pass] exit 이벤트 발생 | pass |
| 3803 | soak_67_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 3804 | soak_67_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 3805 | soak_67_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 3806 | soak_67_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 3807 | soak_67_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 3808 | soak_67_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 3809 | soak_67_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 3810 | soak_67_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 3811 | soak_67_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 3812 | soak_67_va_events.log | [pass] active tap 목록 검증 | pass |
| 3813 | soak_67_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 3814 | soak_67_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 3815 | soak_67_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 3816 | soak_67_event_post_schema.log | [pass] HTTP health ok | pass |
| 3817 | soak_67_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 3818 | soak_67_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 3819 | soak_67_event_post_schema.log | [pass] rule 저장: 9381 -> /event | pass |
| 3820 | soak_67_event_post_schema.log | [pass] rule 저장: 9382 -> /fail | pass |
| 3821 | soak_67_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-338 | pass |
| 3822 | soak_67_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 3823 | soak_67_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 3824 | soak_67_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 3825 | soak_67_event_post_recovery.log | [pass] HTTP health ok | pass |
| 3826 | soak_67_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 3827 | soak_67_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 3828 | soak_67_event_post_recovery.log | [pass] rule 저장: 9605 -> /flaky | pass |
| 3829 | soak_67_event_post_recovery.log | [pass] rule 저장: 9606 -> /flaky | pass |
| 3830 | soak_67_event_post_recovery.log | [pass] rule 저장: 9607 -> /flaky | pass |
| 3831 | soak_67_event_post_recovery.log | [pass] rule 저장: 9608 -> /flaky | pass |
| 3832 | soak_67_event_post_recovery.log | [pass] rule 저장: 9609 -> /flaky | pass |
| 3833 | soak_67_event_post_recovery.log | [pass] rule 저장: 9610 -> /flaky | pass |
| 3834 | soak_67_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-339 | pass |
| 3835 | soak_67_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 3836 | soak_67_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 3837 | soak_67_redaction.log | [pass] HTTP health ok | pass |
| 3838 | soak_67_redaction.log | [pass] runtime idle precheck ok | pass |
| 3839 | soak_67_redaction.log | [pass] live-va-redaction (36s) | pass |
| 3840 | soak_68_va_events.log | [pass] HTTP health ok | pass |
| 3841 | soak_68_va_events.log | [pass] rule 저장: 9701 | pass |
| 3842 | soak_68_va_events.log | [pass] rule 저장: 9702 | pass |
| 3843 | soak_68_va_events.log | [pass] rule 저장: 9703 | pass |
| 3844 | soak_68_va_events.log | [pass] rule 저장: 9704 | pass |
| 3845 | soak_68_va_events.log | [pass] rule 저장: 9705 | pass |
| 3846 | soak_68_va_events.log | [pass] rule 저장: 9706 | pass |
| 3847 | soak_68_va_events.log | [pass] rule 저장: 9707 | pass |
| 3848 | soak_68_va_events.log | [pass] rule 저장: 9708 | pass |
| 3849 | soak_68_va_events.log | [pass] rule 저장: 9709 | pass |
| 3850 | soak_68_va_events.log | [pass] rule 저장: 9710 | pass |
| 3851 | soak_68_va_events.log | [pass] rule 저장: 9711 | pass |
| 3852 | soak_68_va_events.log | [pass] analysis tap 생성: analysis-tap-342 | pass |
| 3853 | soak_68_va_events.log | [pass] presence 이벤트 발생 | pass |
| 3854 | soak_68_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 3855 | soak_68_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 3856 | soak_68_va_events.log | [pass] enter 이벤트 발생 | pass |
| 3857 | soak_68_va_events.log | [pass] exit 이벤트 발생 | pass |
| 3858 | soak_68_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 3859 | soak_68_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 3860 | soak_68_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 3861 | soak_68_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 3862 | soak_68_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 3863 | soak_68_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 3864 | soak_68_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 3865 | soak_68_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 3866 | soak_68_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 3867 | soak_68_va_events.log | [pass] active tap 목록 검증 | pass |
| 3868 | soak_68_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 3869 | soak_68_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 3870 | soak_68_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 3871 | soak_68_event_post_schema.log | [pass] HTTP health ok | pass |
| 3872 | soak_68_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 3873 | soak_68_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 3874 | soak_68_event_post_schema.log | [pass] rule 저장: 9557 -> /event | pass |
| 3875 | soak_68_event_post_schema.log | [pass] rule 저장: 9558 -> /fail | pass |
| 3876 | soak_68_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-343 | pass |
| 3877 | soak_68_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 3878 | soak_68_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 3879 | soak_68_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 3880 | soak_68_event_post_recovery.log | [pass] HTTP health ok | pass |
| 3881 | soak_68_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 3882 | soak_68_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 3883 | soak_68_event_post_recovery.log | [pass] rule 저장: 9357 -> /flaky | pass |
| 3884 | soak_68_event_post_recovery.log | [pass] rule 저장: 9358 -> /flaky | pass |
| 3885 | soak_68_event_post_recovery.log | [pass] rule 저장: 9359 -> /flaky | pass |
| 3886 | soak_68_event_post_recovery.log | [pass] rule 저장: 9360 -> /flaky | pass |
| 3887 | soak_68_event_post_recovery.log | [pass] rule 저장: 9361 -> /flaky | pass |
| 3888 | soak_68_event_post_recovery.log | [pass] rule 저장: 9362 -> /flaky | pass |
| 3889 | soak_68_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-344 | pass |
| 3890 | soak_68_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 3891 | soak_68_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 3892 | soak_68_redaction.log | [pass] HTTP health ok | pass |
| 3893 | soak_68_redaction.log | [pass] runtime idle precheck ok | pass |
| 3894 | soak_68_redaction.log | [pass] live-va-redaction (36s) | pass |
| 3895 | soak_69_va_events.log | [pass] HTTP health ok | pass |
| 3896 | soak_69_va_events.log | [pass] rule 저장: 9641 | pass |
| 3897 | soak_69_va_events.log | [pass] rule 저장: 9642 | pass |
| 3898 | soak_69_va_events.log | [pass] rule 저장: 9643 | pass |
| 3899 | soak_69_va_events.log | [pass] rule 저장: 9644 | pass |
| 3900 | soak_69_va_events.log | [pass] rule 저장: 9645 | pass |
| 3901 | soak_69_va_events.log | [pass] rule 저장: 9646 | pass |
| 3902 | soak_69_va_events.log | [pass] rule 저장: 9647 | pass |
| 3903 | soak_69_va_events.log | [pass] rule 저장: 9648 | pass |
| 3904 | soak_69_va_events.log | [pass] rule 저장: 9649 | pass |
| 3905 | soak_69_va_events.log | [pass] rule 저장: 9650 | pass |
| 3906 | soak_69_va_events.log | [pass] rule 저장: 9651 | pass |
| 3907 | soak_69_va_events.log | [pass] analysis tap 생성: analysis-tap-347 | pass |
| 3908 | soak_69_va_events.log | [pass] presence 이벤트 발생 | pass |
| 3909 | soak_69_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 3910 | soak_69_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 3911 | soak_69_va_events.log | [pass] enter 이벤트 발생 | pass |
| 3912 | soak_69_va_events.log | [pass] exit 이벤트 발생 | pass |
| 3913 | soak_69_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 3914 | soak_69_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 3915 | soak_69_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 3916 | soak_69_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 3917 | soak_69_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 3918 | soak_69_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 3919 | soak_69_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 3920 | soak_69_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 3921 | soak_69_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 3922 | soak_69_va_events.log | [pass] active tap 목록 검증 | pass |
| 3923 | soak_69_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 3924 | soak_69_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 3925 | soak_69_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 3926 | soak_69_event_post_schema.log | [pass] HTTP health ok | pass |
| 3927 | soak_69_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 3928 | soak_69_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 3929 | soak_69_event_post_schema.log | [pass] rule 저장: 9373 -> /event | pass |
| 3930 | soak_69_event_post_schema.log | [pass] rule 저장: 9374 -> /fail | pass |
| 3931 | soak_69_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-348 | pass |
| 3932 | soak_69_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 3933 | soak_69_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 3934 | soak_69_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 3935 | soak_69_event_post_recovery.log | [pass] HTTP health ok | pass |
| 3936 | soak_69_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 3937 | soak_69_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 3938 | soak_69_event_post_recovery.log | [pass] rule 저장: 9621 -> /flaky | pass |
| 3939 | soak_69_event_post_recovery.log | [pass] rule 저장: 9622 -> /flaky | pass |
| 3940 | soak_69_event_post_recovery.log | [pass] rule 저장: 9623 -> /flaky | pass |
| 3941 | soak_69_event_post_recovery.log | [pass] rule 저장: 9624 -> /flaky | pass |
| 3942 | soak_69_event_post_recovery.log | [pass] rule 저장: 9625 -> /flaky | pass |
| 3943 | soak_69_event_post_recovery.log | [pass] rule 저장: 9626 -> /flaky | pass |
| 3944 | soak_69_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-349 | pass |
| 3945 | soak_69_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 3946 | soak_69_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 3947 | soak_69_redaction.log | [pass] HTTP health ok | pass |
| 3948 | soak_69_redaction.log | [pass] runtime idle precheck ok | pass |
| 3949 | soak_69_redaction.log | [pass] live-va-redaction (36s) | pass |
| 3950 | soak_70_va_events.log | [pass] HTTP health ok | pass |
| 3951 | soak_70_va_events.log | [pass] rule 저장: 9653 | pass |
| 3952 | soak_70_va_events.log | [pass] rule 저장: 9654 | pass |
| 3953 | soak_70_va_events.log | [pass] rule 저장: 9655 | pass |
| 3954 | soak_70_va_events.log | [pass] rule 저장: 9656 | pass |
| 3955 | soak_70_va_events.log | [pass] rule 저장: 9657 | pass |
| 3956 | soak_70_va_events.log | [pass] rule 저장: 9658 | pass |
| 3957 | soak_70_va_events.log | [pass] rule 저장: 9659 | pass |
| 3958 | soak_70_va_events.log | [pass] rule 저장: 9660 | pass |
| 3959 | soak_70_va_events.log | [pass] rule 저장: 9661 | pass |
| 3960 | soak_70_va_events.log | [pass] rule 저장: 9662 | pass |
| 3961 | soak_70_va_events.log | [pass] rule 저장: 9663 | pass |
| 3962 | soak_70_va_events.log | [pass] analysis tap 생성: analysis-tap-352 | pass |
| 3963 | soak_70_va_events.log | [pass] presence 이벤트 발생 | pass |
| 3964 | soak_70_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 3965 | soak_70_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 3966 | soak_70_va_events.log | [pass] enter 이벤트 발생 | pass |
| 3967 | soak_70_va_events.log | [pass] exit 이벤트 발생 | pass |
| 3968 | soak_70_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 3969 | soak_70_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 3970 | soak_70_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 3971 | soak_70_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 3972 | soak_70_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 3973 | soak_70_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 3974 | soak_70_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 3975 | soak_70_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 3976 | soak_70_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 3977 | soak_70_va_events.log | [pass] active tap 목록 검증 | pass |
| 3978 | soak_70_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 3979 | soak_70_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 3980 | soak_70_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 3981 | soak_70_event_post_schema.log | [pass] HTTP health ok | pass |
| 3982 | soak_70_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 3983 | soak_70_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 3984 | soak_70_event_post_schema.log | [pass] rule 저장: 9597 -> /event | pass |
| 3985 | soak_70_event_post_schema.log | [pass] rule 저장: 9598 -> /fail | pass |
| 3986 | soak_70_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-353 | pass |
| 3987 | soak_70_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 3988 | soak_70_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 3989 | soak_70_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 3990 | soak_70_event_post_recovery.log | [pass] HTTP health ok | pass |
| 3991 | soak_70_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 3992 | soak_70_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 3993 | soak_70_event_post_recovery.log | [pass] rule 저장: 9397 -> /flaky | pass |
| 3994 | soak_70_event_post_recovery.log | [pass] rule 저장: 9398 -> /flaky | pass |
| 3995 | soak_70_event_post_recovery.log | [pass] rule 저장: 9399 -> /flaky | pass |
| 3996 | soak_70_event_post_recovery.log | [pass] rule 저장: 9400 -> /flaky | pass |
| 3997 | soak_70_event_post_recovery.log | [pass] rule 저장: 9401 -> /flaky | pass |
| 3998 | soak_70_event_post_recovery.log | [pass] rule 저장: 9402 -> /flaky | pass |
| 3999 | soak_70_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-354 | pass |
| 4000 | soak_70_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 4001 | soak_70_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 4002 | soak_70_redaction.log | [pass] HTTP health ok | pass |
| 4003 | soak_70_redaction.log | [pass] runtime idle precheck ok | pass |
| 4004 | soak_70_redaction.log | [pass] live-va-redaction (36s) | pass |
| 4005 | soak_71_va_events.log | [pass] HTTP health ok | pass |
| 4006 | soak_71_va_events.log | [pass] rule 저장: 9677 | pass |
| 4007 | soak_71_va_events.log | [pass] rule 저장: 9678 | pass |
| 4008 | soak_71_va_events.log | [pass] rule 저장: 9679 | pass |
| 4009 | soak_71_va_events.log | [pass] rule 저장: 9680 | pass |
| 4010 | soak_71_va_events.log | [pass] rule 저장: 9681 | pass |
| 4011 | soak_71_va_events.log | [pass] rule 저장: 9682 | pass |
| 4012 | soak_71_va_events.log | [pass] rule 저장: 9683 | pass |
| 4013 | soak_71_va_events.log | [pass] rule 저장: 9684 | pass |
| 4014 | soak_71_va_events.log | [pass] rule 저장: 9685 | pass |
| 4015 | soak_71_va_events.log | [pass] rule 저장: 9686 | pass |
| 4016 | soak_71_va_events.log | [pass] rule 저장: 9687 | pass |
| 4017 | soak_71_va_events.log | [pass] analysis tap 생성: analysis-tap-357 | pass |
| 4018 | soak_71_va_events.log | [pass] presence 이벤트 발생 | pass |
| 4019 | soak_71_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 4020 | soak_71_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 4021 | soak_71_va_events.log | [pass] enter 이벤트 발생 | pass |
| 4022 | soak_71_va_events.log | [pass] exit 이벤트 발생 | pass |
| 4023 | soak_71_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 4024 | soak_71_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 4025 | soak_71_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 4026 | soak_71_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 4027 | soak_71_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 4028 | soak_71_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 4029 | soak_71_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 4030 | soak_71_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 4031 | soak_71_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 4032 | soak_71_va_events.log | [pass] active tap 목록 검증 | pass |
| 4033 | soak_71_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 4034 | soak_71_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 4035 | soak_71_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 4036 | soak_71_event_post_schema.log | [pass] HTTP health ok | pass |
| 4037 | soak_71_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 4038 | soak_71_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 4039 | soak_71_event_post_schema.log | [pass] rule 저장: 9645 -> /event | pass |
| 4040 | soak_71_event_post_schema.log | [pass] rule 저장: 9646 -> /fail | pass |
| 4041 | soak_71_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-358 | pass |
| 4042 | soak_71_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 4043 | soak_71_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 4044 | soak_71_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 4045 | soak_71_event_post_recovery.log | [pass] HTTP health ok | pass |
| 4046 | soak_71_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 4047 | soak_71_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 4048 | soak_71_event_post_recovery.log | [pass] rule 저장: 9445 -> /flaky | pass |
| 4049 | soak_71_event_post_recovery.log | [pass] rule 저장: 9446 -> /flaky | pass |
| 4050 | soak_71_event_post_recovery.log | [pass] rule 저장: 9447 -> /flaky | pass |
| 4051 | soak_71_event_post_recovery.log | [pass] rule 저장: 9448 -> /flaky | pass |
| 4052 | soak_71_event_post_recovery.log | [pass] rule 저장: 9449 -> /flaky | pass |
| 4053 | soak_71_event_post_recovery.log | [pass] rule 저장: 9450 -> /flaky | pass |
| 4054 | soak_71_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-359 | pass |
| 4055 | soak_71_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 4056 | soak_71_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 4057 | soak_71_redaction.log | [pass] HTTP health ok | pass |
| 4058 | soak_71_redaction.log | [pass] runtime idle precheck ok | pass |
| 4059 | soak_71_redaction.log | [pass] live-va-redaction (37s) | pass |
| 4060 | soak_72_va_events.log | [pass] HTTP health ok | pass |
| 4061 | soak_72_va_events.log | [pass] rule 저장: 9533 | pass |
| 4062 | soak_72_va_events.log | [pass] rule 저장: 9534 | pass |
| 4063 | soak_72_va_events.log | [pass] rule 저장: 9535 | pass |
| 4064 | soak_72_va_events.log | [pass] rule 저장: 9536 | pass |
| 4065 | soak_72_va_events.log | [pass] rule 저장: 9537 | pass |
| 4066 | soak_72_va_events.log | [pass] rule 저장: 9538 | pass |
| 4067 | soak_72_va_events.log | [pass] rule 저장: 9539 | pass |
| 4068 | soak_72_va_events.log | [pass] rule 저장: 9540 | pass |
| 4069 | soak_72_va_events.log | [pass] rule 저장: 9541 | pass |
| 4070 | soak_72_va_events.log | [pass] rule 저장: 9542 | pass |
| 4071 | soak_72_va_events.log | [pass] rule 저장: 9543 | pass |
| 4072 | soak_72_va_events.log | [pass] analysis tap 생성: analysis-tap-362 | pass |
| 4073 | soak_72_va_events.log | [pass] presence 이벤트 발생 | pass |
| 4074 | soak_72_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 4075 | soak_72_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 4076 | soak_72_va_events.log | [pass] enter 이벤트 발생 | pass |
| 4077 | soak_72_va_events.log | [pass] exit 이벤트 발생 | pass |
| 4078 | soak_72_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 4079 | soak_72_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 4080 | soak_72_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 4081 | soak_72_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 4082 | soak_72_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 4083 | soak_72_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 4084 | soak_72_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 4085 | soak_72_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 4086 | soak_72_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 4087 | soak_72_va_events.log | [pass] active tap 목록 검증 | pass |
| 4088 | soak_72_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 4089 | soak_72_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 4090 | soak_72_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 4091 | soak_72_event_post_schema.log | [pass] HTTP health ok | pass |
| 4092 | soak_72_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 4093 | soak_72_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 4094 | soak_72_event_post_schema.log | [pass] rule 저장: 9349 -> /event | pass |
| 4095 | soak_72_event_post_schema.log | [pass] rule 저장: 9350 -> /fail | pass |
| 4096 | soak_72_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-363 | pass |
| 4097 | soak_72_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 4098 | soak_72_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 4099 | soak_72_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 4100 | soak_72_event_post_recovery.log | [pass] HTTP health ok | pass |
| 4101 | soak_72_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 4102 | soak_72_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 4103 | soak_72_event_post_recovery.log | [pass] rule 저장: 9549 -> /flaky | pass |
| 4104 | soak_72_event_post_recovery.log | [pass] rule 저장: 9550 -> /flaky | pass |
| 4105 | soak_72_event_post_recovery.log | [pass] rule 저장: 9551 -> /flaky | pass |
| 4106 | soak_72_event_post_recovery.log | [pass] rule 저장: 9552 -> /flaky | pass |
| 4107 | soak_72_event_post_recovery.log | [pass] rule 저장: 9553 -> /flaky | pass |
| 4108 | soak_72_event_post_recovery.log | [pass] rule 저장: 9554 -> /flaky | pass |
| 4109 | soak_72_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-364 | pass |
| 4110 | soak_72_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 4111 | soak_72_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 4112 | soak_72_redaction.log | [pass] HTTP health ok | pass |
| 4113 | soak_72_redaction.log | [pass] runtime idle precheck ok | pass |
| 4114 | soak_72_redaction.log | [pass] live-va-redaction (35s) | pass |
| 4115 | soak_73_va_events.log | [pass] HTTP health ok | pass |
| 4116 | soak_73_va_events.log | [pass] rule 저장: 9473 | pass |
| 4117 | soak_73_va_events.log | [pass] rule 저장: 9474 | pass |
| 4118 | soak_73_va_events.log | [pass] rule 저장: 9475 | pass |
| 4119 | soak_73_va_events.log | [pass] rule 저장: 9476 | pass |
| 4120 | soak_73_va_events.log | [pass] rule 저장: 9477 | pass |
| 4121 | soak_73_va_events.log | [pass] rule 저장: 9478 | pass |
| 4122 | soak_73_va_events.log | [pass] rule 저장: 9479 | pass |
| 4123 | soak_73_va_events.log | [pass] rule 저장: 9480 | pass |
| 4124 | soak_73_va_events.log | [pass] rule 저장: 9481 | pass |
| 4125 | soak_73_va_events.log | [pass] rule 저장: 9482 | pass |
| 4126 | soak_73_va_events.log | [pass] rule 저장: 9483 | pass |
| 4127 | soak_73_va_events.log | [pass] analysis tap 생성: analysis-tap-367 | pass |
| 4128 | soak_73_va_events.log | [pass] presence 이벤트 발생 | pass |
| 4129 | soak_73_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 4130 | soak_73_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 4131 | soak_73_va_events.log | [pass] enter 이벤트 발생 | pass |
| 4132 | soak_73_va_events.log | [pass] exit 이벤트 발생 | pass |
| 4133 | soak_73_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 4134 | soak_73_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 4135 | soak_73_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 4136 | soak_73_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 4137 | soak_73_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 4138 | soak_73_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 4139 | soak_73_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 4140 | soak_73_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 4141 | soak_73_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 4142 | soak_73_va_events.log | [pass] active tap 목록 검증 | pass |
| 4143 | soak_73_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 4144 | soak_73_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 4145 | soak_73_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 4146 | soak_73_event_post_schema.log | [pass] HTTP health ok | pass |
| 4147 | soak_73_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 4148 | soak_73_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 4149 | soak_73_event_post_schema.log | [pass] rule 저장: 9429 -> /event | pass |
| 4150 | soak_73_event_post_schema.log | [pass] rule 저장: 9430 -> /fail | pass |
| 4151 | soak_73_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-368 | pass |
| 4152 | soak_73_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 4153 | soak_73_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 4154 | soak_73_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 4155 | soak_73_event_post_recovery.log | [pass] HTTP health ok | pass |
| 4156 | soak_73_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 4157 | soak_73_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 4158 | soak_73_event_post_recovery.log | [pass] rule 저장: 9629 -> /flaky | pass |
| 4159 | soak_73_event_post_recovery.log | [pass] rule 저장: 9630 -> /flaky | pass |
| 4160 | soak_73_event_post_recovery.log | [pass] rule 저장: 9631 -> /flaky | pass |
| 4161 | soak_73_event_post_recovery.log | [pass] rule 저장: 9632 -> /flaky | pass |
| 4162 | soak_73_event_post_recovery.log | [pass] rule 저장: 9633 -> /flaky | pass |
| 4163 | soak_73_event_post_recovery.log | [pass] rule 저장: 9634 -> /flaky | pass |
| 4164 | soak_73_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-369 | pass |
| 4165 | soak_73_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 4166 | soak_73_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 4167 | soak_73_redaction.log | [pass] HTTP health ok | pass |
| 4168 | soak_73_redaction.log | [pass] runtime idle precheck ok | pass |
| 4169 | soak_73_redaction.log | [pass] live-va-redaction (37s) | pass |
| 4170 | soak_74_va_events.log | [pass] HTTP health ok | pass |
| 4171 | soak_74_va_events.log | [pass] rule 저장: 9653 | pass |
| 4172 | soak_74_va_events.log | [pass] rule 저장: 9654 | pass |
| 4173 | soak_74_va_events.log | [pass] rule 저장: 9655 | pass |
| 4174 | soak_74_va_events.log | [pass] rule 저장: 9656 | pass |
| 4175 | soak_74_va_events.log | [pass] rule 저장: 9657 | pass |
| 4176 | soak_74_va_events.log | [pass] rule 저장: 9658 | pass |
| 4177 | soak_74_va_events.log | [pass] rule 저장: 9659 | pass |
| 4178 | soak_74_va_events.log | [pass] rule 저장: 9660 | pass |
| 4179 | soak_74_va_events.log | [pass] rule 저장: 9661 | pass |
| 4180 | soak_74_va_events.log | [pass] rule 저장: 9662 | pass |
| 4181 | soak_74_va_events.log | [pass] rule 저장: 9663 | pass |
| 4182 | soak_74_va_events.log | [pass] analysis tap 생성: analysis-tap-372 | pass |
| 4183 | soak_74_va_events.log | [pass] presence 이벤트 발생 | pass |
| 4184 | soak_74_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 4185 | soak_74_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 4186 | soak_74_va_events.log | [pass] enter 이벤트 발생 | pass |
| 4187 | soak_74_va_events.log | [pass] exit 이벤트 발생 | pass |
| 4188 | soak_74_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 4189 | soak_74_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 4190 | soak_74_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 4191 | soak_74_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 4192 | soak_74_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 4193 | soak_74_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 4194 | soak_74_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 4195 | soak_74_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 4196 | soak_74_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 4197 | soak_74_va_events.log | [pass] active tap 목록 검증 | pass |
| 4198 | soak_74_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 4199 | soak_74_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 4200 | soak_74_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 4201 | soak_74_event_post_schema.log | [pass] HTTP health ok | pass |
| 4202 | soak_74_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 4203 | soak_74_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 4204 | soak_74_event_post_schema.log | [pass] rule 저장: 9389 -> /event | pass |
| 4205 | soak_74_event_post_schema.log | [pass] rule 저장: 9390 -> /fail | pass |
| 4206 | soak_74_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-373 | pass |
| 4207 | soak_74_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 4208 | soak_74_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 4209 | soak_74_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 4210 | soak_74_event_post_recovery.log | [pass] HTTP health ok | pass |
| 4211 | soak_74_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 4212 | soak_74_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 4213 | soak_74_event_post_recovery.log | [pass] rule 저장: 9341 -> /flaky | pass |
| 4214 | soak_74_event_post_recovery.log | [pass] rule 저장: 9342 -> /flaky | pass |
| 4215 | soak_74_event_post_recovery.log | [pass] rule 저장: 9343 -> /flaky | pass |
| 4216 | soak_74_event_post_recovery.log | [pass] rule 저장: 9344 -> /flaky | pass |
| 4217 | soak_74_event_post_recovery.log | [pass] rule 저장: 9345 -> /flaky | pass |
| 4218 | soak_74_event_post_recovery.log | [pass] rule 저장: 9346 -> /flaky | pass |
| 4219 | soak_74_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-374 | pass |
| 4220 | soak_74_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 4221 | soak_74_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 4222 | soak_74_redaction.log | [pass] HTTP health ok | pass |
| 4223 | soak_74_redaction.log | [pass] runtime idle precheck ok | pass |
| 4224 | soak_74_redaction.log | [pass] live-va-redaction (36s) | pass |
| 4225 | soak_75_va_events.log | [pass] HTTP health ok | pass |
| 4226 | soak_75_va_events.log | [pass] rule 저장: 9437 | pass |
| 4227 | soak_75_va_events.log | [pass] rule 저장: 9438 | pass |
| 4228 | soak_75_va_events.log | [pass] rule 저장: 9439 | pass |
| 4229 | soak_75_va_events.log | [pass] rule 저장: 9440 | pass |
| 4230 | soak_75_va_events.log | [pass] rule 저장: 9441 | pass |
| 4231 | soak_75_va_events.log | [pass] rule 저장: 9442 | pass |
| 4232 | soak_75_va_events.log | [pass] rule 저장: 9443 | pass |
| 4233 | soak_75_va_events.log | [pass] rule 저장: 9444 | pass |
| 4234 | soak_75_va_events.log | [pass] rule 저장: 9445 | pass |
| 4235 | soak_75_va_events.log | [pass] rule 저장: 9446 | pass |
| 4236 | soak_75_va_events.log | [pass] rule 저장: 9447 | pass |
| 4237 | soak_75_va_events.log | [pass] analysis tap 생성: analysis-tap-377 | pass |
| 4238 | soak_75_va_events.log | [pass] presence 이벤트 발생 | pass |
| 4239 | soak_75_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 4240 | soak_75_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 4241 | soak_75_va_events.log | [pass] enter 이벤트 발생 | pass |
| 4242 | soak_75_va_events.log | [pass] exit 이벤트 발생 | pass |
| 4243 | soak_75_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 4244 | soak_75_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 4245 | soak_75_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 4246 | soak_75_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 4247 | soak_75_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 4248 | soak_75_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 4249 | soak_75_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 4250 | soak_75_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 4251 | soak_75_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 4252 | soak_75_va_events.log | [pass] active tap 목록 검증 | pass |
| 4253 | soak_75_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 4254 | soak_75_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 4255 | soak_75_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 4256 | soak_75_event_post_schema.log | [pass] HTTP health ok | pass |
| 4257 | soak_75_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 4258 | soak_75_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 4259 | soak_75_event_post_schema.log | [pass] rule 저장: 9365 -> /event | pass |
| 4260 | soak_75_event_post_schema.log | [pass] rule 저장: 9366 -> /fail | pass |
| 4261 | soak_75_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-378 | pass |
| 4262 | soak_75_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 4263 | soak_75_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 4264 | soak_75_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 4265 | soak_75_event_post_recovery.log | [pass] HTTP health ok | pass |
| 4266 | soak_75_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 4267 | soak_75_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 4268 | soak_75_event_post_recovery.log | [pass] rule 저장: 9581 -> /flaky | pass |
| 4269 | soak_75_event_post_recovery.log | [pass] rule 저장: 9582 -> /flaky | pass |
| 4270 | soak_75_event_post_recovery.log | [pass] rule 저장: 9583 -> /flaky | pass |
| 4271 | soak_75_event_post_recovery.log | [pass] rule 저장: 9584 -> /flaky | pass |
| 4272 | soak_75_event_post_recovery.log | [pass] rule 저장: 9585 -> /flaky | pass |
| 4273 | soak_75_event_post_recovery.log | [pass] rule 저장: 9586 -> /flaky | pass |
| 4274 | soak_75_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-379 | pass |
| 4275 | soak_75_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 4276 | soak_75_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 4277 | soak_75_redaction.log | [pass] HTTP health ok | pass |
| 4278 | soak_75_redaction.log | [pass] runtime idle precheck ok | pass |
| 4279 | soak_75_redaction.log | [pass] live-va-redaction (37s) | pass |
| 4280 | soak_76_va_events.log | [pass] HTTP health ok | pass |
| 4281 | soak_76_va_events.log | [pass] rule 저장: 9677 | pass |
| 4282 | soak_76_va_events.log | [pass] rule 저장: 9678 | pass |
| 4283 | soak_76_va_events.log | [pass] rule 저장: 9679 | pass |
| 4284 | soak_76_va_events.log | [pass] rule 저장: 9680 | pass |
| 4285 | soak_76_va_events.log | [pass] rule 저장: 9681 | pass |
| 4286 | soak_76_va_events.log | [pass] rule 저장: 9682 | pass |
| 4287 | soak_76_va_events.log | [pass] rule 저장: 9683 | pass |
| 4288 | soak_76_va_events.log | [pass] rule 저장: 9684 | pass |
| 4289 | soak_76_va_events.log | [pass] rule 저장: 9685 | pass |
| 4290 | soak_76_va_events.log | [pass] rule 저장: 9686 | pass |
| 4291 | soak_76_va_events.log | [pass] rule 저장: 9687 | pass |
| 4292 | soak_76_va_events.log | [pass] analysis tap 생성: analysis-tap-382 | pass |
| 4293 | soak_76_va_events.log | [pass] presence 이벤트 발생 | pass |
| 4294 | soak_76_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 4295 | soak_76_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 4296 | soak_76_va_events.log | [pass] enter 이벤트 발생 | pass |
| 4297 | soak_76_va_events.log | [pass] exit 이벤트 발생 | pass |
| 4298 | soak_76_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 4299 | soak_76_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 4300 | soak_76_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 4301 | soak_76_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 4302 | soak_76_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 4303 | soak_76_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 4304 | soak_76_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 4305 | soak_76_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 4306 | soak_76_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 4307 | soak_76_va_events.log | [pass] active tap 목록 검증 | pass |
| 4308 | soak_76_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 4309 | soak_76_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 4310 | soak_76_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 4311 | soak_76_event_post_schema.log | [pass] HTTP health ok | pass |
| 4312 | soak_76_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 4313 | soak_76_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 4314 | soak_76_event_post_schema.log | [pass] rule 저장: 9693 -> /event | pass |
| 4315 | soak_76_event_post_schema.log | [pass] rule 저장: 9694 -> /fail | pass |
| 4316 | soak_76_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-383 | pass |
| 4317 | soak_76_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 4318 | soak_76_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 4319 | soak_76_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 4320 | soak_76_event_post_recovery.log | [pass] HTTP health ok | pass |
| 4321 | soak_76_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 4322 | soak_76_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 4323 | soak_76_event_post_recovery.log | [pass] rule 저장: 9493 -> /flaky | pass |
| 4324 | soak_76_event_post_recovery.log | [pass] rule 저장: 9494 -> /flaky | pass |
| 4325 | soak_76_event_post_recovery.log | [pass] rule 저장: 9495 -> /flaky | pass |
| 4326 | soak_76_event_post_recovery.log | [pass] rule 저장: 9496 -> /flaky | pass |
| 4327 | soak_76_event_post_recovery.log | [pass] rule 저장: 9497 -> /flaky | pass |
| 4328 | soak_76_event_post_recovery.log | [pass] rule 저장: 9498 -> /flaky | pass |
| 4329 | soak_76_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-384 | pass |
| 4330 | soak_76_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 4331 | soak_76_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 4332 | soak_76_redaction.log | [pass] HTTP health ok | pass |
| 4333 | soak_76_redaction.log | [pass] runtime idle precheck ok | pass |
| 4334 | soak_76_redaction.log | [pass] live-va-redaction (36s) | pass |
| 4335 | soak_77_va_events.log | [pass] HTTP health ok | pass |
| 4336 | soak_77_va_events.log | [pass] rule 저장: 9725 | pass |
| 4337 | soak_77_va_events.log | [pass] rule 저장: 9726 | pass |
| 4338 | soak_77_va_events.log | [pass] rule 저장: 9727 | pass |
| 4339 | soak_77_va_events.log | [pass] rule 저장: 9728 | pass |
| 4340 | soak_77_va_events.log | [pass] rule 저장: 9729 | pass |
| 4341 | soak_77_va_events.log | [pass] rule 저장: 9730 | pass |
| 4342 | soak_77_va_events.log | [pass] rule 저장: 9731 | pass |
| 4343 | soak_77_va_events.log | [pass] rule 저장: 9732 | pass |
| 4344 | soak_77_va_events.log | [pass] rule 저장: 9733 | pass |
| 4345 | soak_77_va_events.log | [pass] rule 저장: 9734 | pass |
| 4346 | soak_77_va_events.log | [pass] rule 저장: 9735 | pass |
| 4347 | soak_77_va_events.log | [pass] analysis tap 생성: analysis-tap-387 | pass |
| 4348 | soak_77_va_events.log | [pass] presence 이벤트 발생 | pass |
| 4349 | soak_77_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 4350 | soak_77_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 4351 | soak_77_va_events.log | [pass] enter 이벤트 발생 | pass |
| 4352 | soak_77_va_events.log | [pass] exit 이벤트 발생 | pass |
| 4353 | soak_77_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 4354 | soak_77_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 4355 | soak_77_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 4356 | soak_77_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 4357 | soak_77_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 4358 | soak_77_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 4359 | soak_77_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 4360 | soak_77_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 4361 | soak_77_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 4362 | soak_77_va_events.log | [pass] active tap 목록 검증 | pass |
| 4363 | soak_77_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 4364 | soak_77_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 4365 | soak_77_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 4366 | soak_77_event_post_schema.log | [pass] HTTP health ok | pass |
| 4367 | soak_77_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 4368 | soak_77_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 4369 | soak_77_event_post_schema.log | [pass] rule 저장: 9365 -> /event | pass |
| 4370 | soak_77_event_post_schema.log | [pass] rule 저장: 9366 -> /fail | pass |
| 4371 | soak_77_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-388 | pass |
| 4372 | soak_77_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 4373 | soak_77_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 4374 | soak_77_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 4375 | soak_77_event_post_recovery.log | [pass] HTTP health ok | pass |
| 4376 | soak_77_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 4377 | soak_77_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 4378 | soak_77_event_post_recovery.log | [pass] rule 저장: 9565 -> /flaky | pass |
| 4379 | soak_77_event_post_recovery.log | [pass] rule 저장: 9566 -> /flaky | pass |
| 4380 | soak_77_event_post_recovery.log | [pass] rule 저장: 9567 -> /flaky | pass |
| 4381 | soak_77_event_post_recovery.log | [pass] rule 저장: 9568 -> /flaky | pass |
| 4382 | soak_77_event_post_recovery.log | [pass] rule 저장: 9569 -> /flaky | pass |
| 4383 | soak_77_event_post_recovery.log | [pass] rule 저장: 9570 -> /flaky | pass |
| 4384 | soak_77_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-389 | pass |
| 4385 | soak_77_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 4386 | soak_77_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 4387 | soak_77_redaction.log | [pass] HTTP health ok | pass |
| 4388 | soak_77_redaction.log | [pass] runtime idle precheck ok | pass |
| 4389 | soak_77_redaction.log | [pass] live-va-redaction (36s) | pass |
| 4390 | soak_78_va_events.log | [pass] HTTP health ok | pass |
| 4391 | soak_78_va_events.log | [pass] rule 저장: 9641 | pass |
| 4392 | soak_78_va_events.log | [pass] rule 저장: 9642 | pass |
| 4393 | soak_78_va_events.log | [pass] rule 저장: 9643 | pass |
| 4394 | soak_78_va_events.log | [pass] rule 저장: 9644 | pass |
| 4395 | soak_78_va_events.log | [pass] rule 저장: 9645 | pass |
| 4396 | soak_78_va_events.log | [pass] rule 저장: 9646 | pass |
| 4397 | soak_78_va_events.log | [pass] rule 저장: 9647 | pass |
| 4398 | soak_78_va_events.log | [pass] rule 저장: 9648 | pass |
| 4399 | soak_78_va_events.log | [pass] rule 저장: 9649 | pass |
| 4400 | soak_78_va_events.log | [pass] rule 저장: 9650 | pass |
| 4401 | soak_78_va_events.log | [pass] rule 저장: 9651 | pass |
| 4402 | soak_78_va_events.log | [pass] analysis tap 생성: analysis-tap-392 | pass |
| 4403 | soak_78_va_events.log | [pass] presence 이벤트 발생 | pass |
| 4404 | soak_78_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 4405 | soak_78_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 4406 | soak_78_va_events.log | [pass] enter 이벤트 발생 | pass |
| 4407 | soak_78_va_events.log | [pass] exit 이벤트 발생 | pass |
| 4408 | soak_78_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 4409 | soak_78_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 4410 | soak_78_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 4411 | soak_78_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 4412 | soak_78_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 4413 | soak_78_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 4414 | soak_78_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 4415 | soak_78_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 4416 | soak_78_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 4417 | soak_78_va_events.log | [pass] active tap 목록 검증 | pass |
| 4418 | soak_78_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 4419 | soak_78_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 4420 | soak_78_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 4421 | soak_78_event_post_schema.log | [pass] HTTP health ok | pass |
| 4422 | soak_78_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 4423 | soak_78_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 4424 | soak_78_event_post_schema.log | [pass] rule 저장: 9501 -> /event | pass |
| 4425 | soak_78_event_post_schema.log | [pass] rule 저장: 9502 -> /fail | pass |
| 4426 | soak_78_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-393 | pass |
| 4427 | soak_78_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 4428 | soak_78_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 4429 | soak_78_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 4430 | soak_78_event_post_recovery.log | [pass] HTTP health ok | pass |
| 4431 | soak_78_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 4432 | soak_78_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 4433 | soak_78_event_post_recovery.log | [pass] rule 저장: 9301 -> /flaky | pass |
| 4434 | soak_78_event_post_recovery.log | [pass] rule 저장: 9302 -> /flaky | pass |
| 4435 | soak_78_event_post_recovery.log | [pass] rule 저장: 9303 -> /flaky | pass |
| 4436 | soak_78_event_post_recovery.log | [pass] rule 저장: 9304 -> /flaky | pass |
| 4437 | soak_78_event_post_recovery.log | [pass] rule 저장: 9305 -> /flaky | pass |
| 4438 | soak_78_event_post_recovery.log | [pass] rule 저장: 9306 -> /flaky | pass |
| 4439 | soak_78_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-394 | pass |
| 4440 | soak_78_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 4441 | soak_78_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 4442 | soak_78_redaction.log | [pass] HTTP health ok | pass |
| 4443 | soak_78_redaction.log | [pass] runtime idle precheck ok | pass |
| 4444 | soak_78_redaction.log | [pass] live-va-redaction (36s) | pass |
| 4445 | soak_79_va_events.log | [pass] HTTP health ok | pass |
| 4446 | soak_79_va_events.log | [pass] rule 저장: 9617 | pass |
| 4447 | soak_79_va_events.log | [pass] rule 저장: 9618 | pass |
| 4448 | soak_79_va_events.log | [pass] rule 저장: 9619 | pass |
| 4449 | soak_79_va_events.log | [pass] rule 저장: 9620 | pass |
| 4450 | soak_79_va_events.log | [pass] rule 저장: 9621 | pass |
| 4451 | soak_79_va_events.log | [pass] rule 저장: 9622 | pass |
| 4452 | soak_79_va_events.log | [pass] rule 저장: 9623 | pass |
| 4453 | soak_79_va_events.log | [pass] rule 저장: 9624 | pass |
| 4454 | soak_79_va_events.log | [pass] rule 저장: 9625 | pass |
| 4455 | soak_79_va_events.log | [pass] rule 저장: 9626 | pass |
| 4456 | soak_79_va_events.log | [pass] rule 저장: 9627 | pass |
| 4457 | soak_79_va_events.log | [pass] analysis tap 생성: analysis-tap-397 | pass |
| 4458 | soak_79_va_events.log | [pass] presence 이벤트 발생 | pass |
| 4459 | soak_79_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 4460 | soak_79_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 4461 | soak_79_va_events.log | [pass] enter 이벤트 발생 | pass |
| 4462 | soak_79_va_events.log | [pass] exit 이벤트 발생 | pass |
| 4463 | soak_79_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 4464 | soak_79_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 4465 | soak_79_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 4466 | soak_79_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 4467 | soak_79_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 4468 | soak_79_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 4469 | soak_79_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 4470 | soak_79_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 4471 | soak_79_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 4472 | soak_79_va_events.log | [pass] active tap 목록 검증 | pass |
| 4473 | soak_79_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 4474 | soak_79_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 4475 | soak_79_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 4476 | soak_79_event_post_schema.log | [pass] HTTP health ok | pass |
| 4477 | soak_79_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 4478 | soak_79_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 4479 | soak_79_event_post_schema.log | [pass] rule 저장: 9613 -> /event | pass |
| 4480 | soak_79_event_post_schema.log | [pass] rule 저장: 9614 -> /fail | pass |
| 4481 | soak_79_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-398 | pass |
| 4482 | soak_79_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 4483 | soak_79_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 4484 | soak_79_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 4485 | soak_79_event_post_recovery.log | [pass] HTTP health ok | pass |
| 4486 | soak_79_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 4487 | soak_79_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 4488 | soak_79_event_post_recovery.log | [pass] rule 저장: 9573 -> /flaky | pass |
| 4489 | soak_79_event_post_recovery.log | [pass] rule 저장: 9574 -> /flaky | pass |
| 4490 | soak_79_event_post_recovery.log | [pass] rule 저장: 9575 -> /flaky | pass |
| 4491 | soak_79_event_post_recovery.log | [pass] rule 저장: 9576 -> /flaky | pass |
| 4492 | soak_79_event_post_recovery.log | [pass] rule 저장: 9577 -> /flaky | pass |
| 4493 | soak_79_event_post_recovery.log | [pass] rule 저장: 9578 -> /flaky | pass |
| 4494 | soak_79_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-399 | pass |
| 4495 | soak_79_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 4496 | soak_79_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 4497 | soak_79_redaction.log | [pass] HTTP health ok | pass |
| 4498 | soak_79_redaction.log | [pass] runtime idle precheck ok | pass |
| 4499 | soak_79_redaction.log | [pass] live-va-redaction (36s) | pass |
| 4500 | soak_80_va_events.log | [pass] HTTP health ok | pass |
| 4501 | soak_80_va_events.log | [pass] rule 저장: 9521 | pass |
| 4502 | soak_80_va_events.log | [pass] rule 저장: 9522 | pass |
| 4503 | soak_80_va_events.log | [pass] rule 저장: 9523 | pass |
| 4504 | soak_80_va_events.log | [pass] rule 저장: 9524 | pass |
| 4505 | soak_80_va_events.log | [pass] rule 저장: 9525 | pass |
| 4506 | soak_80_va_events.log | [pass] rule 저장: 9526 | pass |
| 4507 | soak_80_va_events.log | [pass] rule 저장: 9527 | pass |
| 4508 | soak_80_va_events.log | [pass] rule 저장: 9528 | pass |
| 4509 | soak_80_va_events.log | [pass] rule 저장: 9529 | pass |
| 4510 | soak_80_va_events.log | [pass] rule 저장: 9530 | pass |
| 4511 | soak_80_va_events.log | [pass] rule 저장: 9531 | pass |
| 4512 | soak_80_va_events.log | [pass] analysis tap 생성: analysis-tap-402 | pass |
| 4513 | soak_80_va_events.log | [pass] presence 이벤트 발생 | pass |
| 4514 | soak_80_va_events.log | [pass] presence minDuration 이벤트 발생 | pass |
| 4515 | soak_80_va_events.log | [pass] multi-category presence 이벤트 발생 | pass |
| 4516 | soak_80_va_events.log | [pass] enter 이벤트 발생 | pass |
| 4517 | soak_80_va_events.log | [pass] exit 이벤트 발생 | pass |
| 4518 | soak_80_va_events.log | [pass] line-left any 이벤트 발생 | pass |
| 4519 | soak_80_va_events.log | [pass] line-left forward 이벤트 발생 | pass |
| 4520 | soak_80_va_events.log | [pass] line-left reverse 이벤트 발생 | pass |
| 4521 | soak_80_va_events.log | [pass] line-right any 이벤트 발생 | pass |
| 4522 | soak_80_va_events.log | [pass] line-right forward 이벤트 발생 | pass |
| 4523 | soak_80_va_events.log | [pass] line-right reverse 이벤트 발생 | pass |
| 4524 | soak_80_va_events.log | [pass] enter-center rule 이벤트 발생 | pass |
| 4525 | soak_80_va_events.log | [pass] exit-center rule 이벤트 발생 | pass |
| 4526 | soak_80_va_events.log | [pass] trackId 기반 이벤트 검증 | pass |
| 4527 | soak_80_va_events.log | [pass] active tap 목록 검증 | pass |
| 4528 | soak_80_va_events.log | [pass] snapshot trackCount 검증 | pass |
| 4529 | soak_80_va_events.log | [pass] 이벤트 blink highlight 색상 검증 | pass |
| 4530 | soak_80_va_events.log | [pass] 이벤트 blink highlight 시간 검증 | pass |
| 4531 | soak_80_event_post_schema.log | [pass] HTTP health ok | pass |
| 4532 | soak_80_event_post_schema.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 4533 | soak_80_event_post_schema.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 4534 | soak_80_event_post_schema.log | [pass] rule 저장: 9501 -> /event | pass |
| 4535 | soak_80_event_post_schema.log | [pass] rule 저장: 9502 -> /fail | pass |
| 4536 | soak_80_event_post_schema.log | [pass] analysis tap 생성: analysis-tap-403 | pass |
| 4537 | soak_80_event_post_schema.log | [pass] POST payload schema 검증 | pass |
| 4538 | soak_80_event_post_schema.log | [pass] POST 실패 카운터 검증 | pass |
| 4539 | soak_80_event_post_schema.log | [pass] POST cooldown 검증 | pass |
| 4540 | soak_80_event_post_recovery.log | [pass] HTTP health ok | pass |
| 4541 | soak_80_event_post_recovery.log | [pass] event POST dispatcher enabled 상태 확인 | pass |
| 4542 | soak_80_event_post_recovery.log | [pass] 임시 POST 수신 서버 시작: [URL 가림] | pass |
| 4543 | soak_80_event_post_recovery.log | [pass] rule 저장: 9317 -> /flaky | pass |
| 4544 | soak_80_event_post_recovery.log | [pass] rule 저장: 9318 -> /flaky | pass |
| 4545 | soak_80_event_post_recovery.log | [pass] rule 저장: 9319 -> /flaky | pass |
| 4546 | soak_80_event_post_recovery.log | [pass] rule 저장: 9320 -> /flaky | pass |
| 4547 | soak_80_event_post_recovery.log | [pass] rule 저장: 9321 -> /flaky | pass |
| 4548 | soak_80_event_post_recovery.log | [pass] rule 저장: 9322 -> /flaky | pass |
| 4549 | soak_80_event_post_recovery.log | [pass] analysis tap 생성: analysis-tap-404 | pass |
| 4550 | soak_80_event_post_recovery.log | [pass] POST endpoint recovery 실패 counter 검증 | pass |
| 4551 | soak_80_event_post_recovery.log | [pass] POST endpoint recovery 성공 counter 검증 | pass |
| 4552 | soak_80_redaction.log | [pass] HTTP health ok | pass |
| 4553 | soak_80_redaction.log | [pass] runtime idle precheck ok | pass |
| 4554 | soak_80_redaction.log | [pass] live-va-redaction (37s) | pass |

## rules-registry 한글 판정 전수

원문 marker가 [통과]인13행도 포함한다. 영어 marker만의1차추출5045행에 이13행을 더해 canonical 하위 판정은5058행(4567pass/0fail/491skip)이다. 같은 파일 안의 원순서를 유지했다.

| 번호 | 로그 | 실제 판정 줄 | 결과(pass/fail) |
| --- | --- | --- | --- |
| 1 | child/19-rules-registry.log | [통과] HTTP health ok | pass |
| 2 | child/19-rules-registry.log | [통과] profile 저장: 87109439 | pass |
| 3 | child/19-rules-registry.log | [통과] 보조 profile 저장: 87109440 | pass |
| 4 | child/19-rules-registry.log | [통과] profile 조회 검증 | pass |
| 5 | child/19-rules-registry.log | [통과] rule 저장: 87109449 | pass |
| 6 | child/19-rules-registry.log | [통과] 보조 rule 저장: 87109450 | pass |
| 7 | child/19-rules-registry.log | [통과] rule 조회 검증 | pass |
| 8 | child/19-rules-registry.log | [통과] priority 기반 profile 자동 선택 및 active tap 목록 검증 | pass |
| 9 | child/19-rules-registry.log | [통과] analysis tap 삭제 | pass |
| 10 | child/19-rules-registry.log | [통과] 보조 rule 삭제 | pass |
| 11 | child/19-rules-registry.log | [통과] rule 삭제 | pass |
| 12 | child/19-rules-registry.log | [통과] 보조 profile 삭제 | pass |
| 13 | child/19-rules-registry.log | [통과] profile 삭제 | pass |

## 하위 skip 판정 전수

| 번호 | 로그 | 실제 제외 줄 |
| --- | --- | --- |
| 1 | child/9-codec-file_local_h264_aac.log | [skip] file_local_h265_aac: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=file_local_h264_aac |
| 2 | child/9-codec-file_local_h264_aac.log | [skip] http_local_h264_aac: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=file_local_h264_aac |
| 3 | child/9-codec-file_local_h264_aac.log | [skip] http_local_h264_video_only: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=file_local_h264_aac |
| 4 | child/9-codec-file_local_h264_aac.log | [skip] hls_local_h264_aac: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=file_local_h264_aac |
| 5 | child/9-codec-file_local_h264_aac.log | [skip] youtube_upload_h264_aac: disabled in config |
| 6 | child/9-codec-file_local_h264_aac.log | [skip] youtube_live_h264_aac: disabled in config |
| 7 | child/9-codec-file_local_h264_aac.log | [skip] rtsp_local_h265_opus: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=file_local_h264_aac |
| 8 | child/9-codec-file_local_h264_aac.log | [skip] rtsp_local_h264_pcmu: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=file_local_h264_aac |
| 9 | child/9-codec-file_local_h264_aac.log | [skip] rtsp_local_h264_pcma: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=file_local_h264_aac |
| 10 | child/9-codec-file_local_h264_aac.log | [skip] webrtc_local_publish_h264_opus: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=file_local_h264_aac |
| 11 | child/9-codec-file_local_h264_aac.log | [skip] rtsp_external_wowza_h264_aac: disabled in config |
| 12 | child/10-codec-file_local_h265_aac.log | [skip] file_local_h264_aac: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=file_local_h265_aac |
| 13 | child/10-codec-file_local_h265_aac.log | [skip] http_local_h264_aac: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=file_local_h265_aac |
| 14 | child/10-codec-file_local_h265_aac.log | [skip] http_local_h264_video_only: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=file_local_h265_aac |
| 15 | child/10-codec-file_local_h265_aac.log | [skip] hls_local_h264_aac: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=file_local_h265_aac |
| 16 | child/10-codec-file_local_h265_aac.log | [skip] youtube_upload_h264_aac: disabled in config |
| 17 | child/10-codec-file_local_h265_aac.log | [skip] youtube_live_h264_aac: disabled in config |
| 18 | child/10-codec-file_local_h265_aac.log | [skip] rtsp_local_h265_opus: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=file_local_h265_aac |
| 19 | child/10-codec-file_local_h265_aac.log | [skip] rtsp_local_h264_pcmu: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=file_local_h265_aac |
| 20 | child/10-codec-file_local_h265_aac.log | [skip] rtsp_local_h264_pcma: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=file_local_h265_aac |
| 21 | child/10-codec-file_local_h265_aac.log | [skip] webrtc_local_publish_h264_opus: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=file_local_h265_aac |
| 22 | child/10-codec-file_local_h265_aac.log | [skip] rtsp_external_wowza_h264_aac: disabled in config |
| 23 | child/11-codec-rtsp_local_h265_opus.log | [skip] file_local_h264_aac: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=rtsp_local_h265_opus |
| 24 | child/11-codec-rtsp_local_h265_opus.log | [skip] file_local_h265_aac: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=rtsp_local_h265_opus |
| 25 | child/11-codec-rtsp_local_h265_opus.log | [skip] http_local_h264_aac: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=rtsp_local_h265_opus |
| 26 | child/11-codec-rtsp_local_h265_opus.log | [skip] http_local_h264_video_only: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=rtsp_local_h265_opus |
| 27 | child/11-codec-rtsp_local_h265_opus.log | [skip] hls_local_h264_aac: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=rtsp_local_h265_opus |
| 28 | child/11-codec-rtsp_local_h265_opus.log | [skip] youtube_upload_h264_aac: disabled in config |
| 29 | child/11-codec-rtsp_local_h265_opus.log | [skip] youtube_live_h264_aac: disabled in config |
| 30 | child/11-codec-rtsp_local_h265_opus.log | [skip] rtsp_local_h264_pcmu: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=rtsp_local_h265_opus |
| 31 | child/11-codec-rtsp_local_h265_opus.log | [skip] rtsp_local_h264_pcma: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=rtsp_local_h265_opus |
| 32 | child/11-codec-rtsp_local_h265_opus.log | [skip] webrtc_local_publish_h264_opus: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=rtsp_local_h265_opus |
| 33 | child/11-codec-rtsp_local_h265_opus.log | [skip] rtsp_external_wowza_h264_aac: disabled in config |
| 34 | child/12-codec-rtsp_local_h264_pcmu.log | [skip] file_local_h264_aac: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=rtsp_local_h264_pcmu |
| 35 | child/12-codec-rtsp_local_h264_pcmu.log | [skip] file_local_h265_aac: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=rtsp_local_h264_pcmu |
| 36 | child/12-codec-rtsp_local_h264_pcmu.log | [skip] http_local_h264_aac: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=rtsp_local_h264_pcmu |
| 37 | child/12-codec-rtsp_local_h264_pcmu.log | [skip] http_local_h264_video_only: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=rtsp_local_h264_pcmu |
| 38 | child/12-codec-rtsp_local_h264_pcmu.log | [skip] hls_local_h264_aac: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=rtsp_local_h264_pcmu |
| 39 | child/12-codec-rtsp_local_h264_pcmu.log | [skip] youtube_upload_h264_aac: disabled in config |
| 40 | child/12-codec-rtsp_local_h264_pcmu.log | [skip] youtube_live_h264_aac: disabled in config |
| 41 | child/12-codec-rtsp_local_h264_pcmu.log | [skip] rtsp_local_h265_opus: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=rtsp_local_h264_pcmu |
| 42 | child/12-codec-rtsp_local_h264_pcmu.log | [skip] rtsp_local_h264_pcma: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=rtsp_local_h264_pcmu |
| 43 | child/12-codec-rtsp_local_h264_pcmu.log | [skip] webrtc_local_publish_h264_opus: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=rtsp_local_h264_pcmu |
| 44 | child/12-codec-rtsp_local_h264_pcmu.log | [skip] rtsp_external_wowza_h264_aac: disabled in config |
| 45 | child/13-codec-rtsp_local_h264_pcma.log | [skip] file_local_h264_aac: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=rtsp_local_h264_pcma |
| 46 | child/13-codec-rtsp_local_h264_pcma.log | [skip] file_local_h265_aac: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=rtsp_local_h264_pcma |
| 47 | child/13-codec-rtsp_local_h264_pcma.log | [skip] http_local_h264_aac: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=rtsp_local_h264_pcma |
| 48 | child/13-codec-rtsp_local_h264_pcma.log | [skip] http_local_h264_video_only: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=rtsp_local_h264_pcma |
| 49 | child/13-codec-rtsp_local_h264_pcma.log | [skip] hls_local_h264_aac: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=rtsp_local_h264_pcma |
| 50 | child/13-codec-rtsp_local_h264_pcma.log | [skip] youtube_upload_h264_aac: disabled in config |
| 51 | child/13-codec-rtsp_local_h264_pcma.log | [skip] youtube_live_h264_aac: disabled in config |
| 52 | child/13-codec-rtsp_local_h264_pcma.log | [skip] rtsp_local_h265_opus: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=rtsp_local_h264_pcma |
| 53 | child/13-codec-rtsp_local_h264_pcma.log | [skip] rtsp_local_h264_pcmu: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=rtsp_local_h264_pcma |
| 54 | child/13-codec-rtsp_local_h264_pcma.log | [skip] webrtc_local_publish_h264_opus: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=rtsp_local_h264_pcma |
| 55 | child/13-codec-rtsp_local_h264_pcma.log | [skip] rtsp_external_wowza_h264_aac: disabled in config |
| 56 | child/14-codec-webrtc_local_publish_h264_opus.log | [skip] file_local_h264_aac: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=webrtc_local_publish_h264_opus |
| 57 | child/14-codec-webrtc_local_publish_h264_opus.log | [skip] file_local_h265_aac: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=webrtc_local_publish_h264_opus |
| 58 | child/14-codec-webrtc_local_publish_h264_opus.log | [skip] http_local_h264_aac: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=webrtc_local_publish_h264_opus |
| 59 | child/14-codec-webrtc_local_publish_h264_opus.log | [skip] http_local_h264_video_only: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=webrtc_local_publish_h264_opus |
| 60 | child/14-codec-webrtc_local_publish_h264_opus.log | [skip] hls_local_h264_aac: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=webrtc_local_publish_h264_opus |
| 61 | child/14-codec-webrtc_local_publish_h264_opus.log | [skip] youtube_upload_h264_aac: disabled in config |
| 62 | child/14-codec-webrtc_local_publish_h264_opus.log | [skip] youtube_live_h264_aac: disabled in config |
| 63 | child/14-codec-webrtc_local_publish_h264_opus.log | [skip] rtsp_local_h265_opus: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=webrtc_local_publish_h264_opus |
| 64 | child/14-codec-webrtc_local_publish_h264_opus.log | [skip] rtsp_local_h264_pcmu: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=webrtc_local_publish_h264_opus |
| 65 | child/14-codec-webrtc_local_publish_h264_opus.log | [skip] rtsp_local_h264_pcma: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=webrtc_local_publish_h264_opus |
| 66 | child/14-codec-webrtc_local_publish_h264_opus.log | [skip] rtsp_external_wowza_h264_aac: disabled in config |
| 67 | child/15-codec-http_local_h264_aac.log | [skip] file_local_h264_aac: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=http_local_h264_aac |
| 68 | child/15-codec-http_local_h264_aac.log | [skip] file_local_h265_aac: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=http_local_h264_aac |
| 69 | child/15-codec-http_local_h264_aac.log | [skip] http_local_h264_video_only: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=http_local_h264_aac |
| 70 | child/15-codec-http_local_h264_aac.log | [skip] hls_local_h264_aac: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=http_local_h264_aac |
| 71 | child/15-codec-http_local_h264_aac.log | [skip] youtube_upload_h264_aac: disabled in config |
| 72 | child/15-codec-http_local_h264_aac.log | [skip] youtube_live_h264_aac: disabled in config |
| 73 | child/15-codec-http_local_h264_aac.log | [skip] rtsp_local_h265_opus: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=http_local_h264_aac |
| 74 | child/15-codec-http_local_h264_aac.log | [skip] rtsp_local_h264_pcmu: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=http_local_h264_aac |
| 75 | child/15-codec-http_local_h264_aac.log | [skip] rtsp_local_h264_pcma: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=http_local_h264_aac |
| 76 | child/15-codec-http_local_h264_aac.log | [skip] webrtc_local_publish_h264_opus: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=http_local_h264_aac |
| 77 | child/15-codec-http_local_h264_aac.log | [skip] rtsp_external_wowza_h264_aac: disabled in config |
| 78 | child/16-codec-http_local_h264_video_only.log | [skip] file_local_h264_aac: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=http_local_h264_video_only |
| 79 | child/16-codec-http_local_h264_video_only.log | [skip] file_local_h265_aac: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=http_local_h264_video_only |
| 80 | child/16-codec-http_local_h264_video_only.log | [skip] http_local_h264_aac: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=http_local_h264_video_only |
| 81 | child/16-codec-http_local_h264_video_only.log | [skip] hls_local_h264_aac: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=http_local_h264_video_only |
| 82 | child/16-codec-http_local_h264_video_only.log | [skip] youtube_upload_h264_aac: disabled in config |
| 83 | child/16-codec-http_local_h264_video_only.log | [skip] youtube_live_h264_aac: disabled in config |
| 84 | child/16-codec-http_local_h264_video_only.log | [skip] rtsp_local_h265_opus: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=http_local_h264_video_only |
| 85 | child/16-codec-http_local_h264_video_only.log | [skip] rtsp_local_h264_pcmu: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=http_local_h264_video_only |
| 86 | child/16-codec-http_local_h264_video_only.log | [skip] rtsp_local_h264_pcma: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=http_local_h264_video_only |
| 87 | child/16-codec-http_local_h264_video_only.log | [skip] webrtc_local_publish_h264_opus: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=http_local_h264_video_only |
| 88 | child/16-codec-http_local_h264_video_only.log | [skip] rtsp_external_wowza_h264_aac: disabled in config |
| 89 | child/18-redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 90 | child/18-redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 91 | child/18-redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 92 | soak_1_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 93 | soak_1_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 94 | soak_1_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 95 | soak_1_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 96 | soak_1_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 97 | soak_2_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 98 | soak_2_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 99 | soak_2_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 100 | soak_2_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 101 | soak_2_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 102 | soak_3_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 103 | soak_3_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 104 | soak_3_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 105 | soak_3_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 106 | soak_3_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 107 | soak_4_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 108 | soak_4_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 109 | soak_4_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 110 | soak_4_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 111 | soak_4_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 112 | soak_5_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 113 | soak_5_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 114 | soak_5_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 115 | soak_5_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 116 | soak_5_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 117 | soak_6_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 118 | soak_6_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 119 | soak_6_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 120 | soak_6_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 121 | soak_6_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 122 | soak_7_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 123 | soak_7_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 124 | soak_7_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 125 | soak_7_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 126 | soak_7_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 127 | soak_8_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 128 | soak_8_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 129 | soak_8_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 130 | soak_8_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 131 | soak_8_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 132 | soak_9_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 133 | soak_9_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 134 | soak_9_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 135 | soak_9_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 136 | soak_9_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 137 | soak_10_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 138 | soak_10_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 139 | soak_10_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 140 | soak_10_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 141 | soak_10_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 142 | soak_11_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 143 | soak_11_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 144 | soak_11_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 145 | soak_11_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 146 | soak_11_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 147 | soak_12_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 148 | soak_12_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 149 | soak_12_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 150 | soak_12_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 151 | soak_12_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 152 | soak_13_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 153 | soak_13_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 154 | soak_13_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 155 | soak_13_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 156 | soak_13_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 157 | soak_14_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 158 | soak_14_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 159 | soak_14_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 160 | soak_14_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 161 | soak_14_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 162 | soak_15_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 163 | soak_15_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 164 | soak_15_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 165 | soak_15_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 166 | soak_15_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 167 | soak_16_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 168 | soak_16_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 169 | soak_16_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 170 | soak_16_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 171 | soak_16_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 172 | soak_17_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 173 | soak_17_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 174 | soak_17_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 175 | soak_17_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 176 | soak_17_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 177 | soak_18_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 178 | soak_18_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 179 | soak_18_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 180 | soak_18_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 181 | soak_18_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 182 | soak_19_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 183 | soak_19_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 184 | soak_19_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 185 | soak_19_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 186 | soak_19_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 187 | soak_20_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 188 | soak_20_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 189 | soak_20_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 190 | soak_20_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 191 | soak_20_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 192 | soak_21_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 193 | soak_21_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 194 | soak_21_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 195 | soak_21_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 196 | soak_21_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 197 | soak_22_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 198 | soak_22_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 199 | soak_22_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 200 | soak_22_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 201 | soak_22_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 202 | soak_23_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 203 | soak_23_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 204 | soak_23_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 205 | soak_23_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 206 | soak_23_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 207 | soak_24_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 208 | soak_24_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 209 | soak_24_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 210 | soak_24_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 211 | soak_24_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 212 | soak_25_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 213 | soak_25_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 214 | soak_25_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 215 | soak_25_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 216 | soak_25_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 217 | soak_26_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 218 | soak_26_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 219 | soak_26_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 220 | soak_26_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 221 | soak_26_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 222 | soak_27_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 223 | soak_27_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 224 | soak_27_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 225 | soak_27_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 226 | soak_27_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 227 | soak_28_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 228 | soak_28_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 229 | soak_28_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 230 | soak_28_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 231 | soak_28_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 232 | soak_29_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 233 | soak_29_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 234 | soak_29_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 235 | soak_29_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 236 | soak_29_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 237 | soak_30_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 238 | soak_30_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 239 | soak_30_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 240 | soak_30_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 241 | soak_30_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 242 | soak_31_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 243 | soak_31_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 244 | soak_31_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 245 | soak_31_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 246 | soak_31_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 247 | soak_32_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 248 | soak_32_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 249 | soak_32_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 250 | soak_32_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 251 | soak_32_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 252 | soak_33_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 253 | soak_33_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 254 | soak_33_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 255 | soak_33_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 256 | soak_33_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 257 | soak_34_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 258 | soak_34_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 259 | soak_34_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 260 | soak_34_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 261 | soak_34_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 262 | soak_35_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 263 | soak_35_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 264 | soak_35_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 265 | soak_35_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 266 | soak_35_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 267 | soak_36_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 268 | soak_36_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 269 | soak_36_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 270 | soak_36_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 271 | soak_36_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 272 | soak_37_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 273 | soak_37_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 274 | soak_37_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 275 | soak_37_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 276 | soak_37_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 277 | soak_38_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 278 | soak_38_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 279 | soak_38_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 280 | soak_38_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 281 | soak_38_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 282 | soak_39_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 283 | soak_39_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 284 | soak_39_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 285 | soak_39_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 286 | soak_39_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 287 | soak_40_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 288 | soak_40_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 289 | soak_40_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 290 | soak_40_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 291 | soak_40_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 292 | soak_41_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 293 | soak_41_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 294 | soak_41_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 295 | soak_41_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 296 | soak_41_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 297 | soak_42_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 298 | soak_42_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 299 | soak_42_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 300 | soak_42_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 301 | soak_42_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 302 | soak_43_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 303 | soak_43_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 304 | soak_43_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 305 | soak_43_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 306 | soak_43_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 307 | soak_44_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 308 | soak_44_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 309 | soak_44_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 310 | soak_44_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 311 | soak_44_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 312 | soak_45_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 313 | soak_45_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 314 | soak_45_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 315 | soak_45_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 316 | soak_45_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 317 | soak_46_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 318 | soak_46_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 319 | soak_46_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 320 | soak_46_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 321 | soak_46_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 322 | soak_47_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 323 | soak_47_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 324 | soak_47_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 325 | soak_47_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 326 | soak_47_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 327 | soak_48_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 328 | soak_48_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 329 | soak_48_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 330 | soak_48_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 331 | soak_48_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 332 | soak_49_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 333 | soak_49_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 334 | soak_49_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 335 | soak_49_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 336 | soak_49_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 337 | soak_50_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 338 | soak_50_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 339 | soak_50_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 340 | soak_50_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 341 | soak_50_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 342 | soak_51_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 343 | soak_51_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 344 | soak_51_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 345 | soak_51_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 346 | soak_51_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 347 | soak_52_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 348 | soak_52_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 349 | soak_52_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 350 | soak_52_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 351 | soak_52_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 352 | soak_53_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 353 | soak_53_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 354 | soak_53_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 355 | soak_53_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 356 | soak_53_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 357 | soak_54_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 358 | soak_54_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 359 | soak_54_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 360 | soak_54_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 361 | soak_54_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 362 | soak_55_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 363 | soak_55_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 364 | soak_55_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 365 | soak_55_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 366 | soak_55_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 367 | soak_56_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 368 | soak_56_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 369 | soak_56_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 370 | soak_56_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 371 | soak_56_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 372 | soak_57_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 373 | soak_57_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 374 | soak_57_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 375 | soak_57_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 376 | soak_57_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 377 | soak_58_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 378 | soak_58_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 379 | soak_58_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 380 | soak_58_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 381 | soak_58_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 382 | soak_59_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 383 | soak_59_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 384 | soak_59_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 385 | soak_59_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 386 | soak_59_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 387 | soak_60_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 388 | soak_60_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 389 | soak_60_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 390 | soak_60_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 391 | soak_60_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 392 | soak_61_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 393 | soak_61_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 394 | soak_61_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 395 | soak_61_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 396 | soak_61_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 397 | soak_62_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 398 | soak_62_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 399 | soak_62_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 400 | soak_62_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 401 | soak_62_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 402 | soak_63_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 403 | soak_63_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 404 | soak_63_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 405 | soak_63_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 406 | soak_63_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 407 | soak_64_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 408 | soak_64_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 409 | soak_64_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 410 | soak_64_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 411 | soak_64_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 412 | soak_65_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 413 | soak_65_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 414 | soak_65_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 415 | soak_65_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 416 | soak_65_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 417 | soak_66_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 418 | soak_66_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 419 | soak_66_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 420 | soak_66_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 421 | soak_66_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 422 | soak_67_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 423 | soak_67_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 424 | soak_67_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 425 | soak_67_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 426 | soak_67_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 427 | soak_68_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 428 | soak_68_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 429 | soak_68_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 430 | soak_68_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 431 | soak_68_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 432 | soak_69_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 433 | soak_69_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 434 | soak_69_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 435 | soak_69_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 436 | soak_69_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 437 | soak_70_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 438 | soak_70_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 439 | soak_70_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 440 | soak_70_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 441 | soak_70_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 442 | soak_71_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 443 | soak_71_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 444 | soak_71_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 445 | soak_71_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 446 | soak_71_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 447 | soak_72_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 448 | soak_72_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 449 | soak_72_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 450 | soak_72_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 451 | soak_72_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 452 | soak_73_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 453 | soak_73_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 454 | soak_73_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 455 | soak_73_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 456 | soak_73_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 457 | soak_74_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 458 | soak_74_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 459 | soak_74_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 460 | soak_74_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 461 | soak_74_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 462 | soak_75_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 463 | soak_75_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 464 | soak_75_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 465 | soak_75_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 466 | soak_75_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 467 | soak_76_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 468 | soak_76_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 469 | soak_76_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 470 | soak_76_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 471 | soak_76_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 472 | soak_77_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 473 | soak_77_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 474 | soak_77_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 475 | soak_77_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 476 | soak_77_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 477 | soak_78_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 478 | soak_78_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 479 | soak_78_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 480 | soak_78_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 481 | soak_78_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 482 | soak_79_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 483 | soak_79_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 484 | soak_79_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 485 | soak_79_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 486 | soak_79_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |
| 487 | soak_80_event_post_recovery.log | [skip] EventStorage 비활성 상태라 recovery policy 검증 건너뜀 |
| 488 | soak_80_redaction.log | [skip] static-redaction: --static-only/--live-only 설정으로 제외 |
| 489 | soak_80_redaction.log | [skip] event-redaction-compatibility: --include-events 미지정 |
| 490 | soak_80_redaction.log | [skip] tracker-redaction-compatibility: --include-tracker 미지정 |
| 491 | soak_80_redaction.log | [skip] uri-redaction-readiness: --include-uri 미지정 |

각80회 recovery에서 EventStorage 비활성 recovery policy skip1이 존재한다. outer recovery PASS는 endpoint 실패·성공 counter 범위이며 이 policy까지 통과한 것이 아니다. 각 soak redaction은 live-only라3pass4skip이며 static/event/tracker/URI를 대체하지 않는다. 기능별 skip를 outer skip1에 합치거나 숨기지 않는다.

## Runtime idle 80표본

raw debug/source는 제외하고 sourceLifecycle의 idle 및 소유 카운터만 보존한다. 각 행의 배열 순서: activeSessions,resourceActiveSessions,resourceActiveStreams,registryActiveStreams,activeAnalysisTaps,httpEgressSessions,whipPublishSessions,activePublishSources,activeMetadataClients.

| iteration | ok | idle | 소유 카운터 |
| --- | --- | --- | --- |
| 1 | true | true | 0,0,0,0,0,0,0,0,0 |
| 2 | true | true | 0,0,0,0,0,0,0,0,0 |
| 3 | true | true | 0,0,0,0,0,0,0,0,0 |
| 4 | true | true | 0,0,0,0,0,0,0,0,0 |
| 5 | true | true | 0,0,0,0,0,0,0,0,0 |
| 6 | true | true | 0,0,0,0,0,0,0,0,0 |
| 7 | true | true | 0,0,0,0,0,0,0,0,0 |
| 8 | true | true | 0,0,0,0,0,0,0,0,0 |
| 9 | true | true | 0,0,0,0,0,0,0,0,0 |
| 10 | true | true | 0,0,0,0,0,0,0,0,0 |
| 11 | true | true | 0,0,0,0,0,0,0,0,0 |
| 12 | true | true | 0,0,0,0,0,0,0,0,0 |
| 13 | true | true | 0,0,0,0,0,0,0,0,0 |
| 14 | true | true | 0,0,0,0,0,0,0,0,0 |
| 15 | true | true | 0,0,0,0,0,0,0,0,0 |
| 16 | true | true | 0,0,0,0,0,0,0,0,0 |
| 17 | true | true | 0,0,0,0,0,0,0,0,0 |
| 18 | true | true | 0,0,0,0,0,0,0,0,0 |
| 19 | true | true | 0,0,0,0,0,0,0,0,0 |
| 20 | true | true | 0,0,0,0,0,0,0,0,0 |
| 21 | true | true | 0,0,0,0,0,0,0,0,0 |
| 22 | true | true | 0,0,0,0,0,0,0,0,0 |
| 23 | true | true | 0,0,0,0,0,0,0,0,0 |
| 24 | true | true | 0,0,0,0,0,0,0,0,0 |
| 25 | true | true | 0,0,0,0,0,0,0,0,0 |
| 26 | true | true | 0,0,0,0,0,0,0,0,0 |
| 27 | true | true | 0,0,0,0,0,0,0,0,0 |
| 28 | true | true | 0,0,0,0,0,0,0,0,0 |
| 29 | true | true | 0,0,0,0,0,0,0,0,0 |
| 30 | true | true | 0,0,0,0,0,0,0,0,0 |
| 31 | true | true | 0,0,0,0,0,0,0,0,0 |
| 32 | true | true | 0,0,0,0,0,0,0,0,0 |
| 33 | true | true | 0,0,0,0,0,0,0,0,0 |
| 34 | true | true | 0,0,0,0,0,0,0,0,0 |
| 35 | true | true | 0,0,0,0,0,0,0,0,0 |
| 36 | true | true | 0,0,0,0,0,0,0,0,0 |
| 37 | true | true | 0,0,0,0,0,0,0,0,0 |
| 38 | true | true | 0,0,0,0,0,0,0,0,0 |
| 39 | true | true | 0,0,0,0,0,0,0,0,0 |
| 40 | true | true | 0,0,0,0,0,0,0,0,0 |
| 41 | true | true | 0,0,0,0,0,0,0,0,0 |
| 42 | true | true | 0,0,0,0,0,0,0,0,0 |
| 43 | true | true | 0,0,0,0,0,0,0,0,0 |
| 44 | true | true | 0,0,0,0,0,0,0,0,0 |
| 45 | true | true | 0,0,0,0,0,0,0,0,0 |
| 46 | true | true | 0,0,0,0,0,0,0,0,0 |
| 47 | true | true | 0,0,0,0,0,0,0,0,0 |
| 48 | true | true | 0,0,0,0,0,0,0,0,0 |
| 49 | true | true | 0,0,0,0,0,0,0,0,0 |
| 50 | true | true | 0,0,0,0,0,0,0,0,0 |
| 51 | true | true | 0,0,0,0,0,0,0,0,0 |
| 52 | true | true | 0,0,0,0,0,0,0,0,0 |
| 53 | true | true | 0,0,0,0,0,0,0,0,0 |
| 54 | true | true | 0,0,0,0,0,0,0,0,0 |
| 55 | true | true | 0,0,0,0,0,0,0,0,0 |
| 56 | true | true | 0,0,0,0,0,0,0,0,0 |
| 57 | true | true | 0,0,0,0,0,0,0,0,0 |
| 58 | true | true | 0,0,0,0,0,0,0,0,0 |
| 59 | true | true | 0,0,0,0,0,0,0,0,0 |
| 60 | true | true | 0,0,0,0,0,0,0,0,0 |
| 61 | true | true | 0,0,0,0,0,0,0,0,0 |
| 62 | true | true | 0,0,0,0,0,0,0,0,0 |
| 63 | true | true | 0,0,0,0,0,0,0,0,0 |
| 64 | true | true | 0,0,0,0,0,0,0,0,0 |
| 65 | true | true | 0,0,0,0,0,0,0,0,0 |
| 66 | true | true | 0,0,0,0,0,0,0,0,0 |
| 67 | true | true | 0,0,0,0,0,0,0,0,0 |
| 68 | true | true | 0,0,0,0,0,0,0,0,0 |
| 69 | true | true | 0,0,0,0,0,0,0,0,0 |
| 70 | true | true | 0,0,0,0,0,0,0,0,0 |
| 71 | true | true | 0,0,0,0,0,0,0,0,0 |
| 72 | true | true | 0,0,0,0,0,0,0,0,0 |
| 73 | true | true | 0,0,0,0,0,0,0,0,0 |
| 74 | true | true | 0,0,0,0,0,0,0,0,0 |
| 75 | true | true | 0,0,0,0,0,0,0,0,0 |
| 76 | true | true | 0,0,0,0,0,0,0,0,0 |
| 77 | true | true | 0,0,0,0,0,0,0,0,0 |
| 78 | true | true | 0,0,0,0,0,0,0,0,0 |
| 79 | true | true | 0,0,0,0,0,0,0,0,0 |
| 80 | true | true | 0,0,0,0,0,0,0,0,0 |

## 종료 및 cleanup 인계

process ledger binary PID45889/48429는 aliveBefore=true/aliveAfter=false, ports8555/8081이다. 메인은 별도 ps45840/45887/48426뿐 아니라 실제 binary PID45889/48429 각각도 권한상승 ps exit1/stdout·stderr빈값으로 부재를 확인했다. lsof8081/8555 역시 exit1/stdout·stderr빈값으로 리스너 부재를 확인했다. sandbox ps 접근은 차단됐고 승인된 읽기 권한상승으로 재확인한 결과다. cleanup 삭제는 아직 미완료다.

| 경로 | 종류 | 크기/파일수 | 조치·현재 결과 |
| --- | --- | ---: | --- |
| /private/tmp/s09-predev120-rQnWAb | 실행 root | 54918497 bytes/373files | 메인 측정, 삭제 대기 |
| /private/tmp/media_server_predev-1789086596-45840 | runner | 2128447 bytes/1059files | 메인 측정, 삭제 대기 |
| /Users/dhseo/Workspace/mediaServer/.media_server.test/20260911-093000 | child | 37940 bytes/24files | 메인 측정, 삭제 대기 |

아래는 원 runner/child log에 등장한 exact timestamp-PID prefix323개다. 각 경로는 `/private/tmp/` + stem + suffix로 정확히 결합된다. suffix 목록에는 파일/디렉터리별 bytes를 붙였다. 현재2263개 entry가 연결되며 디렉터리 bytes는 recursive 합계다. before차이2304개와의 차이41개는 이 읽기에서 소유 확정하지 않아 자동 삭제 대상으로 포함하지 않는다. baseline 차이만으로 소유를 추정하지 않았다. 모든 항목 삭제 대기이며 child는 삭제하지 않았다.

| stem | exact suffix : bytes (빈 suffix는 stem 자체) |
| --- | --- |
| media_server_evtpost-1789094400-48475 | `_events.json`: 10940; `_received.ndjson`: 1228; `_status_after.json`: 149; `_status_before.json`: 147; `_summary.json`: 785 |
| media_server_evtpost-1789088008-63693 | `_events.json`: 14509; `_received.ndjson`: 29574; `_status_after.json`: 203; `_status_before.json`: 203; `_summary.json`: 901 |
| media_server_evtpost-1789088005-63618 | `_events.json`: 8441; `_received.ndjson`: 9860; `_status_after.json`: 203; `_status_before.json`: 203; `_summary.json`: 912 |
| media_server_redaction-1789088011-63795 | `(빈값)`: 3455; `_summary.json`: 2432 |
| media_server_vaevt-1789087971-62974 | `_9449.json`: 498; `_9450.json`: 518; `_9451.json`: 581; `_9452.json`: 486; `_9453.json`: 490; `_9454.json`: 490; `_9455.json`: 486; `_9456.json`: 490; `_9457.json`: 490; `_9458.json`: 503; `_9459.json`: 502; `_events.ndjson`: 1687143; `_overlay.jpg`: 482974; `_rules.tsv`: 223; `_snapshot.json`: 8550; `_taps.json`: 8566 |
| media_server_evtpost-1789088098-64875 | `_events.json`: 14526; `_received.ndjson`: 29586; `_status_after.json`: 203; `_status_before.json`: 203; `_summary.json`: 901 |
| media_server_evtpost-1789088095-64800 | `_events.json`: 7854; `_received.ndjson`: 9858; `_status_after.json`: 203; `_status_before.json`: 203; `_summary.json`: 912 |
| media_server_redaction-1789088101-64979 | `(빈값)`: 3455; `_summary.json`: 2432 |
| media_server_vaevt-1789088061-64153 | `_9557.json`: 498; `_9558.json`: 518; `_9559.json`: 581; `_9560.json`: 486; `_9561.json`: 490; `_9562.json`: 490; `_9563.json`: 486; `_9564.json`: 490; `_9565.json`: 490; `_9566.json`: 503; `_9567.json`: 502; `_events.ndjson`: 1702407; `_overlay.jpg`: 483362; `_rules.tsv`: 223; `_snapshot.json`: 7970; `_taps.json`: 7988 |
| media_server_evtpost-1789088188-66085 | `_events.json`: 14469; `_received.ndjson`: 29580; `_status_after.json`: 204; `_status_before.json`: 204; `_summary.json`: 903 |
| media_server_evtpost-1789088185-66010 | `_events.json`: 8479; `_received.ndjson`: 9856; `_status_after.json`: 204; `_status_before.json`: 203; `_summary.json`: 913 |
| media_server_redaction-1789088191-66189 | `(빈값)`: 3454; `_summary.json`: 2432 |
| media_server_vaevt-1789088151-65409 | `_9509.json`: 498; `_9510.json`: 518; `_9511.json`: 581; `_9512.json`: 486; `_9513.json`: 490; `_9514.json`: 490; `_9515.json`: 486; `_9516.json`: 490; `_9517.json`: 490; `_9518.json`: 503; `_9519.json`: 502; `_events.ndjson`: 1704085; `_overlay.jpg`: 482931; `_rules.tsv`: 223; `_snapshot.json`: 7708; `_taps.json`: 7726 |
| media_server_evtpost-1789088278-67274 | `_events.json`: 17772; `_received.ndjson`: 36972; `_status_after.json`: 204; `_status_before.json`: 204; `_summary.json`: 903 |
| media_server_evtpost-1789088275-67199 | `_events.json`: 8485; `_received.ndjson`: 9858; `_status_after.json`: 204; `_status_before.json`: 204; `_summary.json`: 914 |
| media_server_redaction-1789088282-67385 | `(빈값)`: 3462; `_summary.json`: 2432 |
| media_server_vaevt-1789088242-66630 | `_9401.json`: 498; `_9402.json`: 518; `_9403.json`: 581; `_9404.json`: 486; `_9405.json`: 490; `_9406.json`: 490; `_9407.json`: 486; `_9408.json`: 490; `_9409.json`: 490; `_9410.json`: 503; `_9411.json`: 502; `_events.ndjson`: 1716565; `_overlay.jpg`: 483397; `_rules.tsv`: 223; `_snapshot.json`: 7998; `_taps.json`: 8016 |
| media_server_evtpost-1789088367-68515 | `_events.json`: 14228; `_received.ndjson`: 29586; `_status_after.json`: 205; `_status_before.json`: 204; `_summary.json`: 904 |
| media_server_evtpost-1789088364-68440 | `_events.json`: 8482; `_received.ndjson`: 9856; `_status_after.json`: 204; `_status_before.json`: 204; `_summary.json`: 914 |
| media_server_redaction-1789088370-68620 | `(빈값)`: 3455; `_summary.json`: 2432 |
| media_server_vaevt-1789088331-67794 | `_9689.json`: 498; `_9690.json`: 518; `_9691.json`: 581; `_9692.json`: 486; `_9693.json`: 490; `_9694.json`: 490; `_9695.json`: 486; `_9696.json`: 490; `_9697.json`: 490; `_9698.json`: 503; `_9699.json`: 502; `_events.ndjson`: 1715101; `_overlay.jpg`: 482905; `_rules.tsv`: 223; `_snapshot.json`: 7744; `_taps.json`: 7762 |
| media_server_evtpost-1789088458-69702 | `_events.json`: 14395; `_received.ndjson`: 29592; `_status_after.json`: 205; `_status_before.json`: 205; `_summary.json`: 905 |
| media_server_evtpost-1789088455-69627 | `_events.json`: 8292; `_received.ndjson`: 9852; `_status_after.json`: 205; `_status_before.json`: 205; `_summary.json`: 916 |
| media_server_redaction-1789088461-69806 | `(빈값)`: 3454; `_summary.json`: 2432 |
| media_server_vaevt-1789088422-68982 | `_9545.json`: 498; `_9546.json`: 518; `_9547.json`: 581; `_9548.json`: 486; `_9549.json`: 490; `_9550.json`: 490; `_9551.json`: 486; `_9552.json`: 490; `_9553.json`: 490; `_9554.json`: 503; `_9555.json`: 502; `_events.ndjson`: 1704686; `_overlay.jpg`: 482931; `_rules.tsv`: 223; `_snapshot.json`: 7577; `_taps.json`: 7595 |
| media_server_evtpost-1789088549-70892 | `_events.json`: 14505; `_received.ndjson`: 29574; `_status_after.json`: 205; `_status_before.json`: 205; `_summary.json`: 905 |
| media_server_evtpost-1789088546-70816 | `_events.json`: 8515; `_received.ndjson`: 9858; `_status_after.json`: 205; `_status_before.json`: 205; `_summary.json`: 916 |
| media_server_redaction-1789088553-70997 | `(빈값)`: 3455; `_summary.json`: 2432 |
| media_server_vaevt-1789088512-70169 | `_9749.json`: 498; `_9750.json`: 518; `_9751.json`: 581; `_9752.json`: 486; `_9753.json`: 490; `_9754.json`: 490; `_9755.json`: 486; `_9756.json`: 490; `_9757.json`: 490; `_9758.json`: 503; `_9759.json`: 502; `_events.ndjson`: 1686891; `_overlay.jpg`: 483959; `_rules.tsv`: 223; `_snapshot.json`: 8022; `_taps.json`: 8040 |
| media_server_evtpost-1789088640-72066 | `_events.json`: 14509; `_received.ndjson`: 29574; `_status_after.json`: 205; `_status_before.json`: 205; `_summary.json`: 905 |
| media_server_evtpost-1789088637-71991 | `_events.json`: 8479; `_received.ndjson`: 9858; `_status_after.json`: 205; `_status_before.json`: 205; `_summary.json`: 916 |
| media_server_redaction-1789088643-72170 | `(빈값)`: 3462; `_summary.json`: 2432 |
| media_server_vaevt-1789088603-71417 | `_9605.json`: 498; `_9606.json`: 518; `_9607.json`: 581; `_9608.json`: 486; `_9609.json`: 490; `_9610.json`: 490; `_9611.json`: 486; `_9612.json`: 490; `_9613.json`: 490; `_9614.json`: 503; `_9615.json`: 502; `_events.ndjson`: 1699462; `_overlay.jpg`: 482615; `_rules.tsv`: 223; `_snapshot.json`: 7884; `_taps.json`: 7901 |
| media_server_evtpost-1789088730-73309 | `_events.json`: 14428; `_received.ndjson`: 29586; `_status_after.json`: 205; `_status_before.json`: 205; `_summary.json`: 905 |
| media_server_evtpost-1789088726-73228 | `_events.json`: 8182; `_received.ndjson`: 9860; `_status_after.json`: 205; `_status_before.json`: 205; `_summary.json`: 916 |
| media_server_redaction-1789088733-73412 | `(빈값)`: 3454; `_summary.json`: 2432 |
| media_server_vaevt-1789088693-72592 | `_9665.json`: 498; `_9666.json`: 518; `_9667.json`: 581; `_9668.json`: 486; `_9669.json`: 490; `_9670.json`: 490; `_9671.json`: 486; `_9672.json`: 490; `_9673.json`: 490; `_9674.json`: 503; `_9675.json`: 502; `_events.ndjson`: 1699761; `_overlay.jpg`: 483009; `_rules.tsv`: 223; `_snapshot.json`: 8148; `_taps.json`: 8165 |
| media_server_evtpost-1789088821-74428 | `_events.json`: 14507; `_received.ndjson`: 29574; `_status_after.json`: 205; `_status_before.json`: 205; `_summary.json`: 905 |
| media_server_evtpost-1789088818-74353 | `_events.json`: 8517; `_received.ndjson`: 9850; `_status_after.json`: 205; `_status_before.json`: 205; `_summary.json`: 916 |
| media_server_redaction-1789088824-74532 | `(빈값)`: 3455; `_summary.json`: 2432 |
| media_server_vaevt-1789088784-73778 | `_9497.json`: 498; `_9498.json`: 518; `_9499.json`: 581; `_9500.json`: 486; `_9501.json`: 490; `_9502.json`: 490; `_9503.json`: 486; `_9504.json`: 490; `_9505.json`: 490; `_9506.json`: 503; `_9507.json`: 502; `_events.ndjson`: 1703050; `_overlay.jpg`: 483949; `_rules.tsv`: 223; `_snapshot.json`: 8417; `_taps.json`: 8435 |
| media_server_evtpost-1789087193-52869 | `_events.json`: 21012; `_received.ndjson`: 44328; `_status_after.json`: 200; `_status_before.json`: 199; `_summary.json`: 894 |
| media_server_evtpost-1789087189-52786 | `_events.json`: 12103; `_received.ndjson`: 14757; `_status_after.json`: 199; `_status_before.json`: 149; `_summary.json`: 855 |
| media_server_redaction-1789087197-52987 | `(빈값)`: 3455; `_summary.json`: 2432 |
| media_server_vaevt-1789087155-52216 | `_9593.json`: 498; `_9594.json`: 518; `_9595.json`: 581; `_9596.json`: 486; `_9597.json`: 490; `_9598.json`: 490; `_9599.json`: 486; `_9600.json`: 490; `_9601.json`: 490; `_9602.json`: 503; `_9603.json`: 502; `_events.ndjson`: 1672980; `_overlay.jpg`: 499721; `_rules.tsv`: 223; `_snapshot.json`: 12123; `_taps.json`: 12140 |
| media_server_evtpost-1789088912-75532 | `_events.json`: 14484; `_received.ndjson`: 29586; `_status_after.json`: 205; `_status_before.json`: 205; `_summary.json`: 905 |
| media_server_evtpost-1789088909-75457 | `_events.json`: 8322; `_received.ndjson`: 9848; `_status_after.json`: 205; `_status_before.json`: 205; `_summary.json`: 916 |
| media_server_redaction-1789088915-75640 | `(빈값)`: 3454; `_summary.json`: 2432 |
| media_server_vaevt-1789088874-74887 | `_9485.json`: 498; `_9486.json`: 518; `_9487.json`: 581; `_9488.json`: 486; `_9489.json`: 490; `_9490.json`: 490; `_9491.json`: 486; `_9492.json`: 490; `_9493.json`: 490; `_9494.json`: 503; `_9495.json`: 502; `_events.ndjson`: 1702940; `_overlay.jpg`: 483774; `_rules.tsv`: 223; `_snapshot.json`: 8415; `_taps.json`: 8432 |
| media_server_evtpost-1789089002-76709 | `_events.json`: 14504; `_received.ndjson`: 29574; `_status_after.json`: 205; `_status_before.json`: 205; `_summary.json`: 905 |
| media_server_evtpost-1789088999-76634 | `_events.json`: 7849; `_received.ndjson`: 9858; `_status_after.json`: 205; `_status_before.json`: 205; `_summary.json`: 916 |
| media_server_redaction-1789089005-76813 | `(빈값)`: 3455; `_summary.json`: 2432 |
| media_server_vaevt-1789088965-76053 | `_9437.json`: 498; `_9438.json`: 518; `_9439.json`: 581; `_9440.json`: 486; `_9441.json`: 490; `_9442.json`: 490; `_9443.json`: 486; `_9444.json`: 490; `_9445.json`: 490; `_9446.json`: 503; `_9447.json`: 502; `_events.ndjson`: 1701880; `_overlay.jpg`: 482546; `_rules.tsv`: 223; `_snapshot.json`: 7976; `_taps.json`: 7994 |
| media_server_evtpost-1789089093-77882 | `_events.json`: 14506; `_received.ndjson`: 29574; `_status_after.json`: 205; `_status_before.json`: 205; `_summary.json`: 905 |
| media_server_evtpost-1789089090-77805 | `_events.json`: 8477; `_received.ndjson`: 9856; `_status_after.json`: 205; `_status_before.json`: 205; `_summary.json`: 916 |
| media_server_redaction-1789089097-77985 | `(빈값)`: 3462; `_summary.json`: 2432 |
| media_server_vaevt-1789089055-77163 | `_9437.json`: 498; `_9438.json`: 518; `_9439.json`: 581; `_9440.json`: 486; `_9441.json`: 490; `_9442.json`: 490; `_9443.json`: 486; `_9444.json`: 490; `_9445.json`: 490; `_9446.json`: 503; `_9447.json`: 502; `_events.ndjson`: 1706420; `_overlay.jpg`: 483137; `_rules.tsv`: 223; `_snapshot.json`: 8558; `_taps.json`: 8576 |
| media_server_evtpost-1789089182-79046 | `_events.json`: 14350; `_received.ndjson`: 29556; `_status_after.json`: 205; `_status_before.json`: 205; `_summary.json`: 905 |
| media_server_evtpost-1789089179-78971 | `_events.json`: 8350; `_received.ndjson`: 9854; `_status_after.json`: 205; `_status_before.json`: 205; `_summary.json`: 916 |
| media_server_redaction-1789089185-79150 | `(빈값)`: 3456; `_summary.json`: 2432 |
| media_server_vaevt-1789089146-78397 | `_9485.json`: 498; `_9486.json`: 518; `_9487.json`: 581; `_9488.json`: 486; `_9489.json`: 490; `_9490.json`: 490; `_9491.json`: 486; `_9492.json`: 490; `_9493.json`: 490; `_9494.json`: 503; `_9495.json`: 502; `_events.ndjson`: 1698712; `_overlay.jpg`: 483047; `_rules.tsv`: 223; `_snapshot.json`: 7888; `_taps.json`: 8050 |
| media_server_evtpost-1789089274-80235 | `_events.json`: 14493; `_received.ndjson`: 29568; `_status_after.json`: 205; `_status_before.json`: 205; `_summary.json`: 905 |
| media_server_evtpost-1789089271-80158 | `_events.json`: 8385; `_received.ndjson`: 9854; `_status_after.json`: 205; `_status_before.json`: 205; `_summary.json`: 916 |
| media_server_redaction-1789089277-80337 | `(빈값)`: 3463; `_summary.json`: 2432 |
| media_server_vaevt-1789089237-79588 | `_9737.json`: 498; `_9738.json`: 518; `_9739.json`: 581; `_9740.json`: 486; `_9741.json`: 490; `_9742.json`: 490; `_9743.json`: 486; `_9744.json`: 490; `_9745.json`: 490; `_9746.json`: 503; `_9747.json`: 502; `_events.ndjson`: 1689145; `_overlay.jpg`: 483362; `_rules.tsv`: 223; `_snapshot.json`: 7970; `_taps.json`: 7989 |
| media_server_evtpost-1789089363-81509 | `_events.json`: 14444; `_received.ndjson`: 29640; `_status_after.json`: 205; `_status_before.json`: 205; `_summary.json`: 905 |
| media_server_evtpost-1789089360-81429 | `_events.json`: 8485; `_received.ndjson`: 9869; `_status_after.json`: 205; `_status_before.json`: 205; `_summary.json`: 916 |
| media_server_redaction-1789089366-81611 | `(빈값)`: 3470; `_summary.json`: 2432 |
| media_server_vaevt-1789089327-80788 | `_9737.json`: 498; `_9738.json`: 518; `_9739.json`: 581; `_9740.json`: 486; `_9741.json`: 490; `_9742.json`: 490; `_9743.json`: 486; `_9744.json`: 490; `_9745.json`: 490; `_9746.json`: 503; `_9747.json`: 502; `_events.ndjson`: 1714115; `_overlay.jpg`: 483103; `_rules.tsv`: 223; `_snapshot.json`: 8147; `_taps.json`: 8165 |
| media_server_evtpost-1789089454-82695 | `_events.json`: 14426; `_received.ndjson`: 29628; `_status_after.json`: 205; `_status_before.json`: 205; `_summary.json`: 905 |
| media_server_evtpost-1789089451-82620 | `_events.json`: 8485; `_received.ndjson`: 9874; `_status_after.json`: 205; `_status_before.json`: 205; `_summary.json`: 916 |
| media_server_redaction-1789089457-82799 | `(빈값)`: 3462; `_summary.json`: 2432 |
| media_server_vaevt-1789089417-81979 | `_9629.json`: 498; `_9630.json`: 518; `_9631.json`: 581; `_9632.json`: 486; `_9633.json`: 490; `_9634.json`: 490; `_9635.json`: 486; `_9636.json`: 490; `_9637.json`: 490; `_9638.json`: 503; `_9639.json`: 502; `_events.ndjson`: 1716329; `_overlay.jpg`: 483397; `_rules.tsv`: 223; `_snapshot.json`: 8002; `_taps.json`: 8023 |
| media_server_evtpost-1789089544-83882 | `_events.json`: 14340; `_received.ndjson`: 29628; `_status_after.json`: 205; `_status_before.json`: 205; `_summary.json`: 905 |
| media_server_evtpost-1789089541-83805 | `_events.json`: 8495; `_received.ndjson`: 9876; `_status_after.json`: 205; `_status_before.json`: 205; `_summary.json`: 916 |
| media_server_redaction-1789089547-83986 | `(빈값)`: 3456; `_summary.json`: 2432 |
| media_server_vaevt-1789089508-83230 | `_9521.json`: 498; `_9522.json`: 518; `_9523.json`: 581; `_9524.json`: 486; `_9525.json`: 490; `_9526.json`: 490; `_9527.json`: 486; `_9528.json`: 490; `_9529.json`: 490; `_9530.json`: 503; `_9531.json`: 502; `_events.ndjson`: 1714702; `_overlay.jpg`: 482800; `_rules.tsv`: 223; `_snapshot.json`: 7628; `_taps.json`: 7648 |
| media_server_evtpost-1789089635-85063 | `_events.json`: 14514; `_received.ndjson`: 29628; `_status_after.json`: 205; `_status_before.json`: 205; `_summary.json`: 905 |
| media_server_evtpost-1789089632-84988 | `_events.json`: 8530; `_received.ndjson`: 9874; `_status_after.json`: 205; `_status_before.json`: 205; `_summary.json`: 916 |
| media_server_redaction-1789089639-85168 | `(빈값)`: 3468; `_summary.json`: 2432 |
| media_server_vaevt-1789089598-84418 | `_9737.json`: 498; `_9738.json`: 518; `_9739.json`: 581; `_9740.json`: 486; `_9741.json`: 490; `_9742.json`: 490; `_9743.json`: 486; `_9744.json`: 490; `_9745.json`: 490; `_9746.json`: 503; `_9747.json`: 502; `_events.ndjson`: 1699015; `_overlay.jpg`: 483047; `_rules.tsv`: 223; `_snapshot.json`: 8034; `_taps.json`: 8052 |
| media_server_evtpost-1789089726-86310 | `_events.json`: 14474; `_received.ndjson`: 29628; `_status_after.json`: 205; `_status_before.json`: 205; `_summary.json`: 905 |
| media_server_evtpost-1789089723-86233 | `_events.json`: 8481; `_received.ndjson`: 9874; `_status_after.json`: 205; `_status_before.json`: 205; `_summary.json`: 916 |
| media_server_redaction-1789089729-86412 | `(빈값)`: 3456; `_summary.json`: 2432 |
| media_server_vaevt-1789089689-85591 | `_9413.json`: 498; `_9414.json`: 518; `_9415.json`: 581; `_9416.json`: 486; `_9417.json`: 490; `_9418.json`: 490; `_9419.json`: 486; `_9420.json`: 490; `_9421.json`: 490; `_9422.json`: 503; `_9423.json`: 502; `_events.ndjson`: 1705796; `_overlay.jpg`: 484132; `_rules.tsv`: 223; `_snapshot.json`: 8551; `_taps.json`: 8569 |
| media_server_evtpost-1789087283-54104 | `_events.json`: 14502; `_received.ndjson`: 29551; `_status_after.json`: 201; `_status_before.json`: 201; `_summary.json`: 897 |
| media_server_evtpost-1789087280-54029 | `_events.json`: 8332; `_received.ndjson`: 9844; `_status_after.json`: 201; `_status_before.json`: 200; `_summary.json`: 907 |
| media_server_redaction-1789087287-54209 | `(빈값)`: 3455; `_summary.json`: 2432 |
| media_server_vaevt-1789087246-53454 | `_9689.json`: 498; `_9690.json`: 518; `_9691.json`: 581; `_9692.json`: 486; `_9693.json`: 490; `_9694.json`: 490; `_9695.json`: 486; `_9696.json`: 490; `_9697.json`: 490; `_9698.json`: 503; `_9699.json`: 502; `_events.ndjson`: 1699662; `_overlay.jpg`: 484132; `_rules.tsv`: 223; `_snapshot.json`: 8546; `_taps.json`: 8564 |
| media_server_evtpost-1789089816-87482 | `_events.json`: 14533; `_received.ndjson`: 29640; `_status_after.json`: 205; `_status_before.json`: 205; `_summary.json`: 905 |
| media_server_evtpost-1789089813-87407 | `_events.json`: 8475; `_received.ndjson`: 9872; `_status_after.json`: 205; `_status_before.json`: 205; `_summary.json`: 916 |
| media_server_redaction-1789089821-87588 | `(빈값)`: 3455; `_summary.json`: 2432 |
| media_server_vaevt-1789089779-86766 | `_9473.json`: 498; `_9474.json`: 518; `_9475.json`: 581; `_9476.json`: 486; `_9477.json`: 490; `_9478.json`: 490; `_9479.json`: 486; `_9480.json`: 490; `_9481.json`: 490; `_9482.json`: 503; `_9483.json`: 502; `_events.ndjson`: 1692423; `_overlay.jpg`: 483163; `_rules.tsv`: 223; `_snapshot.json`: 8021; `_taps.json`: 8039 |
| media_server_evtpost-1789089907-88665 | `_events.json`: 14504; `_received.ndjson`: 29622; `_status_after.json`: 206; `_status_before.json`: 206; `_summary.json`: 907 |
| media_server_evtpost-1789089904-88588 | `_events.json`: 8519; `_received.ndjson`: 9872; `_status_after.json`: 206; `_status_before.json`: 205; `_summary.json`: 917 |
| media_server_redaction-1789089910-88767 | `(빈값)`: 3456; `_summary.json`: 2432 |
| media_server_vaevt-1789089870-88001 | `_9533.json`: 498; `_9534.json`: 518; `_9535.json`: 581; `_9536.json`: 486; `_9537.json`: 490; `_9538.json`: 490; `_9539.json`: 486; `_9540.json`: 490; `_9541.json`: 490; `_9542.json`: 503; `_9543.json`: 502; `_events.ndjson`: 1700642; `_overlay.jpg`: 483093; `_rules.tsv`: 223; `_snapshot.json`: 8028; `_taps.json`: 8048 |
| media_server_evtpost-1789089998-89848 | `_events.json`: 14412; `_received.ndjson`: 29622; `_status_after.json`: 206; `_status_before.json`: 206; `_summary.json`: 907 |
| media_server_evtpost-1789089994-89769 | `_events.json`: 8480; `_received.ndjson`: 9872; `_status_after.json`: 206; `_status_before.json`: 206; `_summary.json`: 918 |
| media_server_redaction-1789090002-89954 | `(빈값)`: 3462; `_summary.json`: 2432 |
| media_server_vaevt-1789089960-89197 | `_9485.json`: 498; `_9486.json`: 518; `_9487.json`: 581; `_9488.json`: 486; `_9489.json`: 490; `_9490.json`: 490; `_9491.json`: 486; `_9492.json`: 490; `_9493.json`: 490; `_9494.json`: 503; `_9495.json`: 502; `_events.ndjson`: 1678467; `_overlay.jpg`: 482615; `_rules.tsv`: 223; `_snapshot.json`: 7890; `_taps.json`: 7908 |
| media_server_evtpost-1789090089-91086 | `_events.json`: 14346; `_received.ndjson`: 29634; `_status_after.json`: 206; `_status_before.json`: 206; `_summary.json`: 907 |
| media_server_evtpost-1789090086-91011 | `_events.json`: 8150; `_received.ndjson`: 9866; `_status_after.json`: 206; `_status_before.json`: 206; `_summary.json`: 918 |
| media_server_redaction-1789090092-91190 | `(빈값)`: 3456; `_summary.json`: 2432 |
| media_server_vaevt-1789090052-90368 | `_9497.json`: 498; `_9498.json`: 518; `_9499.json`: 581; `_9500.json`: 486; `_9501.json`: 490; `_9502.json`: 490; `_9503.json`: 486; `_9504.json`: 490; `_9505.json`: 490; `_9506.json`: 503; `_9507.json`: 502; `_events.ndjson`: 1695718; `_overlay.jpg`: 483362; `_rules.tsv`: 223; `_snapshot.json`: 7974; `_taps.json`: 7992 |
| media_server_evtpost-1789090180-92281 | `_events.json`: 14505; `_received.ndjson`: 29622; `_status_after.json`: 206; `_status_before.json`: 206; `_summary.json`: 907 |
| media_server_evtpost-1789090177-92206 | `_events.json`: 8423; `_received.ndjson`: 9870; `_status_after.json`: 206; `_status_before.json`: 206; `_summary.json`: 918 |
| media_server_redaction-1789090183-92385 | `(빈값)`: 3456; `_summary.json`: 2432 |
| media_server_vaevt-1789090142-91555 | `_9701.json`: 498; `_9702.json`: 518; `_9703.json`: 581; `_9704.json`: 486; `_9705.json`: 490; `_9706.json`: 490; `_9707.json`: 486; `_9708.json`: 490; `_9709.json`: 490; `_9710.json`: 503; `_9711.json`: 502; `_events.ndjson`: 1693408; `_overlay.jpg`: 483959; `_rules.tsv`: 223; `_snapshot.json`: 8025; `_taps.json`: 8044 |
| media_server_evtpost-1789090270-93455 | `_events.json`: 14522; `_received.ndjson`: 29634; `_status_after.json`: 206; `_status_before.json`: 206; `_summary.json`: 907 |
| media_server_evtpost-1789090267-93378 | `_events.json`: 8338; `_received.ndjson`: 9874; `_status_after.json`: 206; `_status_before.json`: 206; `_summary.json`: 918 |
| media_server_redaction-1789090273-93559 | `(빈값)`: 3456; `_summary.json`: 2432 |
| media_server_vaevt-1789090233-92805 | `_9581.json`: 498; `_9582.json`: 518; `_9583.json`: 581; `_9584.json`: 486; `_9585.json`: 490; `_9586.json`: 490; `_9587.json`: 486; `_9588.json`: 490; `_9589.json`: 490; `_9590.json`: 503; `_9591.json`: 502; `_events.ndjson`: 1699531; `_overlay.jpg`: 483362; `_rules.tsv`: 223; `_snapshot.json`: 7976; `_taps.json`: 7994 |
| media_server_evtpost-1789090360-94643 | `_events.json`: 14370; `_received.ndjson`: 29622; `_status_after.json`: 206; `_status_before.json`: 206; `_summary.json`: 907 |
| media_server_evtpost-1789090357-94568 | `_events.json`: 8495; `_received.ndjson`: 9874; `_status_after.json`: 206; `_status_before.json`: 206; `_summary.json`: 918 |
| media_server_redaction-1789090364-94800 | `(빈값)`: 3456; `_summary.json`: 2432 |
| media_server_vaevt-1789090324-93994 | `_9449.json`: 498; `_9450.json`: 518; `_9451.json`: 581; `_9452.json`: 486; `_9453.json`: 490; `_9454.json`: 490; `_9455.json`: 486; `_9456.json`: 490; `_9457.json`: 490; `_9458.json`: 503; `_9459.json`: 502; `_events.ndjson`: 1703000; `_overlay.jpg`: 483959; `_rules.tsv`: 223; `_snapshot.json`: 8020; `_taps.json`: 8037 |
| media_server_evtpost-1789090450-95886 | `_events.json`: 14347; `_received.ndjson`: 29634; `_status_after.json`: 206; `_status_before.json`: 206; `_summary.json`: 907 |
| media_server_evtpost-1789090447-95811 | `_events.json`: 8486; `_received.ndjson`: 9874; `_status_after.json`: 206; `_status_before.json`: 206; `_summary.json`: 918 |
| media_server_redaction-1789090454-95994 | `(빈값)`: 3455; `_summary.json`: 2432 |
| media_server_vaevt-1789090414-95171 | `_9533.json`: 498; `_9534.json`: 518; `_9535.json`: 581; `_9536.json`: 486; `_9537.json`: 490; `_9538.json`: 490; `_9539.json`: 486; `_9540.json`: 490; `_9541.json`: 490; `_9542.json`: 503; `_9543.json`: 502; `_events.ndjson`: 1692581; `_overlay.jpg`: 483789; `_rules.tsv`: 223; `_snapshot.json`: 8014; `_taps.json`: 8034 |
| media_server_evtpost-1789090542-97076 | `_events.json`: 14511; `_received.ndjson`: 29628; `_status_after.json`: 206; `_status_before.json`: 206; `_summary.json`: 907 |
| media_server_evtpost-1789090539-97001 | `_events.json`: 8295; `_received.ndjson`: 9868; `_status_after.json`: 206; `_status_before.json`: 206; `_summary.json`: 918 |
| media_server_redaction-1789090545-97180 | `(빈값)`: 3456; `_summary.json`: 2432 |
| media_server_vaevt-1789090505-96357 | `_9725.json`: 498; `_9726.json`: 518; `_9727.json`: 581; `_9728.json`: 486; `_9729.json`: 490; `_9730.json`: 490; `_9731.json`: 486; `_9732.json`: 490; `_9733.json`: 490; `_9734.json`: 503; `_9735.json`: 502; `_events.ndjson`: 1706397; `_overlay.jpg`: 483137; `_rules.tsv`: 223; `_snapshot.json`: 8559; `_taps.json`: 8577 |
| media_server_evtpost-1789090633-98246 | `_events.json`: 14527; `_received.ndjson`: 29634; `_status_after.json`: 207; `_status_before.json`: 206; `_summary.json`: 908 |
| media_server_evtpost-1789090630-98171 | `_events.json`: 8432; `_received.ndjson`: 9872; `_status_after.json`: 206; `_status_before.json`: 206; `_summary.json`: 918 |
| media_server_redaction-1789090636-98350 | `(빈값)`: 3463; `_summary.json`: 2432 |
| media_server_vaevt-1789090595-97600 | `_9521.json`: 498; `_9522.json`: 518; `_9523.json`: 581; `_9524.json`: 486; `_9525.json`: 490; `_9526.json`: 490; `_9527.json`: 486; `_9528.json`: 490; `_9529.json`: 490; `_9530.json`: 503; `_9531.json`: 502; `_events.ndjson`: 1695143; `_overlay.jpg`: 483163; `_rules.tsv`: 223; `_snapshot.json`: 8034; `_taps.json`: 8051 |
| media_server_evtpost-1789087374-55196 | `_events.json`: 14519; `_received.ndjson`: 29586; `_status_after.json`: 202; `_status_before.json`: 201; `_summary.json`: 898 |
| media_server_evtpost-1789087371-55119 | `_events.json`: 8522; `_received.ndjson`: 9858; `_status_after.json`: 201; `_status_before.json`: 201; `_summary.json`: 908 |
| media_server_redaction-1789087377-55302 | `(빈값)`: 3454; `_summary.json`: 2432 |
| media_server_vaevt-1789087336-54549 | `_9509.json`: 498; `_9510.json`: 518; `_9511.json`: 581; `_9512.json`: 486; `_9513.json`: 490; `_9514.json`: 490; `_9515.json`: 486; `_9516.json`: 490; `_9517.json`: 490; `_9518.json`: 503; `_9519.json`: 502; `_events.ndjson`: 1702149; `_overlay.jpg`: 483766; `_rules.tsv`: 223; `_snapshot.json`: 8418; `_taps.json`: 8435 |
| media_server_evtpost-1789090722-99489 | `_events.json`: 14396; `_received.ndjson`: 29640; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 909 |
| media_server_evtpost-1789090719-99414 | `_events.json`: 8484; `_received.ndjson`: 9866; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 920 |
| media_server_redaction-1789090725-99593 | `(빈값)`: 3456; `_summary.json`: 2432 |
| media_server_vaevt-1789090686-98769 | `_9509.json`: 498; `_9510.json`: 518; `_9511.json`: 581; `_9512.json`: 486; `_9513.json`: 490; `_9514.json`: 490; `_9515.json`: 486; `_9516.json`: 490; `_9517.json`: 490; `_9518.json`: 503; `_9519.json`: 502; `_events.ndjson`: 1710278; `_overlay.jpg`: 483766; `_rules.tsv`: 223; `_snapshot.json`: 8278; `_taps.json`: 8301 |
| media_server_evtpost-1789090812-968 | `_events.json`: 14387; `_received.ndjson`: 29634; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 907 |
| media_server_evtpost-1789090809-876 | `_events.json`: 8466; `_received.ndjson`: 9866; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 918 |
| media_server_redaction-1789090815-1201 | `(빈값)`: 3455; `_summary.json`: 2430 |
| media_server_vaevt-1789090775-99952 | `_9665.json`: 498; `_9666.json`: 518; `_9667.json`: 581; `_9668.json`: 486; `_9669.json`: 490; `_9670.json`: 490; `_9671.json`: 486; `_9672.json`: 490; `_9673.json`: 490; `_9674.json`: 503; `_9675.json`: 502; `_events.ndjson`: 1707795; `_overlay.jpg`: 484132; `_rules.tsv`: 223; `_snapshot.json`: 8548; `_taps.json`: 8568 |
| media_server_evtpost-1789090903-2491 | `_events.json`: 14459; `_received.ndjson`: 29622; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 908 |
| media_server_evtpost-1789090900-2416 | `_events.json`: 8429; `_received.ndjson`: 9870; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 919 |
| media_server_redaction-1789090906-2617 | `(빈값)`: 3454; `_summary.json`: 2430 |
| media_server_vaevt-1789090866-1780 | `_9521.json`: 498; `_9522.json`: 518; `_9523.json`: 581; `_9524.json`: 486; `_9525.json`: 490; `_9526.json`: 490; `_9527.json`: 486; `_9528.json`: 490; `_9529.json`: 490; `_9530.json`: 503; `_9531.json`: 502; `_events.ndjson`: 1689057; `_overlay.jpg`: 483362; `_rules.tsv`: 223; `_snapshot.json`: 7974; `_taps.json`: 7992 |
| media_server_evtpost-1789090994-3756 | `_events.json`: 14508; `_received.ndjson`: 29622; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 908 |
| media_server_evtpost-1789090991-3679 | `_events.json`: 8480; `_received.ndjson`: 9874; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 919 |
| media_server_redaction-1789090997-3859 | `(빈값)`: 3469; `_summary.json`: 2430 |
| media_server_vaevt-1789090957-3099 | `_9509.json`: 498; `_9510.json`: 518; `_9511.json`: 581; `_9512.json`: 486; `_9513.json`: 490; `_9514.json`: 490; `_9515.json`: 486; `_9516.json`: 490; `_9517.json`: 490; `_9518.json`: 503; `_9519.json`: 502; `_events.ndjson`: 1691678; `_overlay.jpg`: 483163; `_rules.tsv`: 223; `_snapshot.json`: 8027; `_taps.json`: 8045 |
| media_server_evtpost-1789091084-5026 | `_events.json`: 14473; `_received.ndjson`: 29634; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 908 |
| media_server_evtpost-1789091081-4936 | `_events.json`: 8286; `_received.ndjson`: 9870; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 919 |
| media_server_redaction-1789091089-5131 | `(빈값)`: 3455; `_summary.json`: 2430 |
| media_server_vaevt-1789091047-4285 | `_9701.json`: 498; `_9702.json`: 518; `_9703.json`: 581; `_9704.json`: 486; `_9705.json`: 490; `_9706.json`: 490; `_9707.json`: 486; `_9708.json`: 490; `_9709.json`: 490; `_9710.json`: 503; `_9711.json`: 502; `_events.ndjson`: 1703104; `_overlay.jpg`: 482512; `_rules.tsv`: 223; `_snapshot.json`: 8428; `_taps.json`: 8445 |
| media_server_evtpost-1789091175-6197 | `_events.json`: 14511; `_received.ndjson`: 29622; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 908 |
| media_server_evtpost-1789091172-6122 | `_events.json`: 8431; `_received.ndjson`: 9870; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 919 |
| media_server_redaction-1789091178-6301 | `(빈값)`: 3455; `_summary.json`: 2430 |
| media_server_vaevt-1789091138-5469 | `_9509.json`: 498; `_9510.json`: 518; `_9511.json`: 581; `_9512.json`: 486; `_9513.json`: 490; `_9514.json`: 490; `_9515.json`: 486; `_9516.json`: 490; `_9517.json`: 490; `_9518.json`: 503; `_9519.json`: 502; `_events.ndjson`: 1697423; `_overlay.jpg`: 482615; `_rules.tsv`: 223; `_snapshot.json`: 7883; `_taps.json`: 7902 |
| media_server_evtpost-1789091265-7387 | `_events.json`: 14511; `_received.ndjson`: 29622; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 908 |
| media_server_evtpost-1789091262-7299 | `_events.json`: 8347; `_received.ndjson`: 9872; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 919 |
| media_server_redaction-1789091269-7492 | `(빈값)`: 3454; `_summary.json`: 2430 |
| media_server_vaevt-1789091228-6720 | `_9401.json`: 498; `_9402.json`: 518; `_9403.json`: 581; `_9404.json`: 486; `_9405.json`: 490; `_9406.json`: 490; `_9407.json`: 486; `_9408.json`: 490; `_9409.json`: 490; `_9410.json`: 503; `_9411.json`: 502; `_events.ndjson`: 1705707; `_overlay.jpg`: 482974; `_rules.tsv`: 223; `_snapshot.json`: 8550; `_taps.json`: 8568 |
| media_server_evtpost-1789091356-8559 | `_events.json`: 14502; `_received.ndjson`: 29622; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 908 |
| media_server_evtpost-1789091353-8484 | `_events.json`: 8515; `_received.ndjson`: 9868; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 919 |
| media_server_redaction-1789091360-8731 | `(빈값)`: 3469; `_summary.json`: 2430 |
| media_server_vaevt-1789091319-7913 | `_9677.json`: 498; `_9678.json`: 518; `_9679.json`: 581; `_9680.json`: 486; `_9681.json`: 490; `_9682.json`: 490; `_9683.json`: 486; `_9684.json`: 490; `_9685.json`: 490; `_9686.json`: 503; `_9687.json`: 502; `_events.ndjson`: 1691191; `_overlay.jpg`: 483789; `_rules.tsv`: 223; `_snapshot.json`: 8013; `_taps.json`: 8031 |
| media_server_evtpost-1789091447-9839 | `_events.json`: 14375; `_received.ndjson`: 29628; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 908 |
| media_server_evtpost-1789091443-9762 | `_events.json`: 8485; `_received.ndjson`: 9874; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 919 |
| media_server_redaction-1789091451-9944 | `(빈값)`: 3455; `_summary.json`: 2430 |
| media_server_vaevt-1789091410-9082 | `_9665.json`: 498; `_9666.json`: 518; `_9667.json`: 581; `_9668.json`: 486; `_9669.json`: 490; `_9670.json`: 490; `_9671.json`: 486; `_9672.json`: 490; `_9673.json`: 490; `_9674.json`: 503; `_9675.json`: 502; `_events.ndjson`: 1707804; `_overlay.jpg`: 482808; `_rules.tsv`: 223; `_snapshot.json`: 7621; `_taps.json`: 7640 |
| media_server_evtpost-1789091537-11015 | `_events.json`: 17796; `_received.ndjson`: 37014; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 909 |
| media_server_evtpost-1789091534-10940 | `_events.json`: 8313; `_received.ndjson`: 9874; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 920 |
| media_server_redaction-1789091541-11130 | `(빈값)`: 3454; `_summary.json`: 2432 |
| media_server_vaevt-1789091501-10299 | `_9509.json`: 498; `_9510.json`: 518; `_9511.json`: 581; `_9512.json`: 486; `_9513.json`: 490; `_9514.json`: 490; `_9515.json`: 486; `_9516.json`: 490; `_9517.json`: 490; `_9518.json`: 503; `_9519.json`: 502; `_events.ndjson`: 1710498; `_overlay.jpg`: 482931; `_rules.tsv`: 223; `_snapshot.json`: 7710; `_taps.json`: 7728 |
| media_server_evtpost-1789087463-56402 | `_events.json`: 17886; `_received.ndjson`: 36990; `_status_after.json`: 203; `_status_before.json`: 202; `_summary.json`: 900 |
| media_server_evtpost-1789087460-56327 | `_events.json`: 8480; `_received.ndjson`: 9856; `_status_after.json`: 202; `_status_before.json`: 202; `_summary.json`: 910 |
| media_server_redaction-1789087467-56513 | `(빈값)`: 3468; `_summary.json`: 2432 |
| media_server_vaevt-1789087427-55749 | `_9509.json`: 498; `_9510.json`: 518; `_9511.json`: 581; `_9512.json`: 486; `_9513.json`: 490; `_9514.json`: 490; `_9515.json`: 486; `_9516.json`: 490; `_9517.json`: 490; `_9518.json`: 503; `_9519.json`: 502; `_events.ndjson`: 1707977; `_overlay.jpg`: 482808; `_rules.tsv`: 223; `_snapshot.json`: 7625; `_taps.json`: 7643 |
| media_server_evtpost-1789091627-12194 | `_events.json`: 17785; `_received.ndjson`: 37038; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 909 |
| media_server_evtpost-1789091624-12119 | `_events.json`: 8309; `_received.ndjson`: 9874; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 920 |
| media_server_redaction-1789091631-12307 | `(빈값)`: 3456; `_summary.json`: 2432 |
| media_server_vaevt-1789091591-11542 | `_9665.json`: 498; `_9666.json`: 518; `_9667.json`: 581; `_9668.json`: 486; `_9669.json`: 490; `_9670.json`: 490; `_9671.json`: 486; `_9672.json`: 490; `_9673.json`: 490; `_9674.json`: 503; `_9675.json`: 502; `_events.ndjson`: 1717235; `_overlay.jpg`: 482800; `_rules.tsv`: 223; `_snapshot.json`: 7627; `_taps.json`: 7645 |
| media_server_evtpost-1789091717-13368 | `_events.json`: 17365; `_received.ndjson`: 37026; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 909 |
| media_server_evtpost-1789091714-13292 | `_events.json`: 8494; `_received.ndjson`: 9874; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 920 |
| media_server_redaction-1789091722-13550 | `(빈값)`: 3456; `_summary.json`: 2432 |
| media_server_vaevt-1789091681-12717 | `_9725.json`: 498; `_9726.json`: 518; `_9727.json`: 581; `_9728.json`: 486; `_9729.json`: 490; `_9730.json`: 490; `_9731.json`: 486; `_9732.json`: 490; `_9733.json`: 490; `_9734.json`: 503; `_9735.json`: 502; `_events.ndjson`: 1716722; `_overlay.jpg`: 483397; `_rules.tsv`: 223; `_snapshot.json`: 8005; `_taps.json`: 8025 |
| media_server_evtpost-1789091807-14615 | `_events.json`: 14444; `_received.ndjson`: 29640; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 909 |
| media_server_evtpost-1789091804-14536 | `_events.json`: 8341; `_received.ndjson`: 9866; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 920 |
| media_server_redaction-1789091810-14722 | `(빈값)`: 3461; `_summary.json`: 2432 |
| media_server_vaevt-1789091771-13892 | `_9425.json`: 498; `_9426.json`: 518; `_9427.json`: 581; `_9428.json`: 486; `_9429.json`: 490; `_9430.json`: 490; `_9431.json`: 486; `_9432.json`: 490; `_9433.json`: 490; `_9434.json`: 503; `_9435.json`: 502; `_events.ndjson`: 1704125; `_overlay.jpg`: 483959; `_rules.tsv`: 223; `_snapshot.json`: 8027; `_taps.json`: 8045 |
| media_server_evtpost-1789091899-15829 | `_events.json`: 14521; `_received.ndjson`: 29634; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 909 |
| media_server_evtpost-1789091896-15752 | `_events.json`: 8522; `_received.ndjson`: 9874; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 920 |
| media_server_redaction-1789091902-15933 | `(빈값)`: 3456; `_summary.json`: 2432 |
| media_server_vaevt-1789091861-15082 | `_9665.json`: 498; `_9666.json`: 518; `_9667.json`: 581; `_9668.json`: 486; `_9669.json`: 490; `_9670.json`: 490; `_9671.json`: 486; `_9672.json`: 490; `_9673.json`: 490; `_9674.json`: 503; `_9675.json`: 502; `_events.ndjson`: 1697940; `_overlay.jpg`: 483196; `_rules.tsv`: 223; `_snapshot.json`: 8107; `_taps.json`: 8129 |
| media_server_evtpost-1789091988-17041 | `_events.json`: 17814; `_received.ndjson`: 37026; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 909 |
| media_server_evtpost-1789091985-16964 | `_events.json`: 8427; `_received.ndjson`: 9870; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 920 |
| media_server_redaction-1789091992-17156 | `(빈값)`: 3455; `_summary.json`: 2432 |
| media_server_vaevt-1789091952-16367 | `_9605.json`: 498; `_9606.json`: 518; `_9607.json`: 581; `_9608.json`: 486; `_9609.json`: 490; `_9610.json`: 490; `_9611.json`: 486; `_9612.json`: 490; `_9613.json`: 490; `_9614.json`: 503; `_9615.json`: 502; `_events.ndjson`: 1717006; `_overlay.jpg`: 483397; `_rules.tsv`: 223; `_snapshot.json`: 8007; `_taps.json`: 8025 |
| media_server_evtpost-1789092078-18228 | `_events.json`: 14431; `_received.ndjson`: 29628; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 909 |
| media_server_evtpost-1789092075-18151 | `_events.json`: 8483; `_received.ndjson`: 9870; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 920 |
| media_server_redaction-1789092083-18333 | `(빈값)`: 3463; `_summary.json`: 2432 |
| media_server_vaevt-1789092042-17576 | `_9713.json`: 498; `_9714.json`: 518; `_9715.json`: 581; `_9716.json`: 486; `_9717.json`: 490; `_9718.json`: 490; `_9719.json`: 486; `_9720.json`: 490; `_9721.json`: 490; `_9722.json`: 503; `_9723.json`: 502; `_events.ndjson`: 1719686; `_overlay.jpg`: 483397; `_rules.tsv`: 223; `_snapshot.json`: 8001; `_taps.json`: 8018 |
| media_server_evtpost-1789092168-19463 | `_events.json`: 14486; `_received.ndjson`: 29640; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 909 |
| media_server_evtpost-1789092165-19388 | `_events.json`: 8481; `_received.ndjson`: 9876; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 920 |
| media_server_redaction-1789092172-19570 | `(빈값)`: 3456; `_summary.json`: 2432 |
| media_server_vaevt-1789092131-18744 | `_9689.json`: 498; `_9690.json`: 518; `_9691.json`: 581; `_9692.json`: 486; `_9693.json`: 490; `_9694.json`: 490; `_9695.json`: 486; `_9696.json`: 490; `_9697.json`: 490; `_9698.json`: 503; `_9699.json`: 502; `_events.ndjson`: 1708459; `_overlay.jpg`: 482808; `_rules.tsv`: 223; `_snapshot.json`: 7626; `_taps.json`: 7644 |
| media_server_evtpost-1789092257-20633 | `_events.json`: 14290; `_received.ndjson`: 29628; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 909 |
| media_server_evtpost-1789092254-20558 | `_events.json`: 8306; `_received.ndjson`: 9874; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 920 |
| media_server_redaction-1789092261-20740 | `(빈값)`: 3456; `_summary.json`: 2432 |
| media_server_vaevt-1789092221-19911 | `_9653.json`: 498; `_9654.json`: 518; `_9655.json`: 581; `_9656.json`: 486; `_9657.json`: 490; `_9658.json`: 490; `_9659.json`: 486; `_9660.json`: 490; `_9661.json`: 490; `_9662.json`: 503; `_9663.json`: 502; `_events.ndjson`: 1714070; `_overlay.jpg`: 482889; `_rules.tsv`: 223; `_snapshot.json`: 7612; `_taps.json`: 7630 |
| media_server_evtpost-1789092348-21815 | `_events.json`: 14454; `_received.ndjson`: 29610; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 909 |
| media_server_evtpost-1789092344-21740 | `_events.json`: 8356; `_received.ndjson`: 9872; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 920 |
| media_server_redaction-1789092351-21921 | `(빈값)`: 3456; `_summary.json`: 2432 |
| media_server_vaevt-1789092311-21166 | `_9593.json`: 498; `_9594.json`: 518; `_9595.json`: 581; `_9596.json`: 486; `_9597.json`: 490; `_9598.json`: 490; `_9599.json`: 486; `_9600.json`: 490; `_9601.json`: 490; `_9602.json`: 503; `_9603.json`: 502; `_events.ndjson`: 1702252; `_overlay.jpg`: 483137; `_rules.tsv`: 223; `_snapshot.json`: 8559; `_taps.json`: 8575 |
| media_server_evtpost-1789092438-23049 | `_events.json`: 14501; `_received.ndjson`: 29622; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 909 |
| media_server_evtpost-1789092435-22972 | `_events.json`: 8530; `_received.ndjson`: 9872; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 920 |
| media_server_redaction-1789092441-23151 | `(빈값)`: 3456; `_summary.json`: 2432 |
| media_server_vaevt-1789092401-22391 | `_9533.json`: 498; `_9534.json`: 518; `_9535.json`: 581; `_9536.json`: 486; `_9537.json`: 490; `_9538.json`: 490; `_9539.json`: 486; `_9540.json`: 490; `_9541.json`: 490; `_9542.json`: 503; `_9543.json`: 502; `_events.ndjson`: 1686591; `_overlay.jpg`: 482250; `_rules.tsv`: 223; `_snapshot.json`: 7895; `_taps.json`: 7913 |
| media_server_evtpost-1789087554-57592 | `_events.json`: 17881; `_received.ndjson`: 36984; `_status_after.json`: 203; `_status_before.json`: 203; `_summary.json`: 901 |
| media_server_evtpost-1789087551-57517 | `_events.json`: 8314; `_received.ndjson`: 9858; `_status_after.json`: 203; `_status_before.json`: 203; `_summary.json`: 912 |
| media_server_redaction-1789087559-57703 | `(빈값)`: 3468; `_summary.json`: 2432 |
| media_server_vaevt-1789087518-56943 | `_9437.json`: 498; `_9438.json`: 518; `_9439.json`: 581; `_9440.json`: 486; `_9441.json`: 490; `_9442.json`: 490; `_9443.json`: 486; `_9444.json`: 490; `_9445.json`: 490; `_9446.json`: 503; `_9447.json`: 502; `_events.ndjson`: 1702892; `_overlay.jpg`: 482931; `_rules.tsv`: 223; `_snapshot.json`: 7700; `_taps.json`: 7718 |
| media_server_evtpost-1789092528-24224 | `_events.json`: 17779; `_received.ndjson`: 37032; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 909 |
| media_server_evtpost-1789092524-24147 | `_events.json`: 8486; `_received.ndjson`: 9874; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 920 |
| media_server_redaction-1789092532-24400 | `(빈값)`: 3456; `_summary.json`: 2432 |
| media_server_vaevt-1789092491-23576 | `_9713.json`: 498; `_9714.json`: 518; `_9715.json`: 581; `_9716.json`: 486; `_9717.json`: 490; `_9718.json`: 490; `_9719.json`: 486; `_9720.json`: 490; `_9721.json`: 490; `_9722.json`: 503; `_9723.json`: 502; `_events.ndjson`: 1712128; `_overlay.jpg`: 482800; `_rules.tsv`: 223; `_snapshot.json`: 7617; `_taps.json`: 7635 |
| media_server_evtpost-1789092618-25473 | `_events.json`: 14489; `_received.ndjson`: 29610; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 909 |
| media_server_evtpost-1789092615-25398 | `_events.json`: 8309; `_received.ndjson`: 9874; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 920 |
| media_server_redaction-1789092622-25580 | `(빈값)`: 3456; `_summary.json`: 2432 |
| media_server_vaevt-1789092582-24753 | `_9437.json`: 498; `_9438.json`: 518; `_9439.json`: 581; `_9440.json`: 486; `_9441.json`: 490; `_9442.json`: 490; `_9443.json`: 486; `_9444.json`: 490; `_9445.json`: 490; `_9446.json`: 503; `_9447.json`: 502; `_events.ndjson`: 1702308; `_overlay.jpg`: 479013; `_rules.tsv`: 223; `_snapshot.json`: 7581; `_taps.json`: 7599 |
| media_server_evtpost-1789092707-26633 | `_events.json`: 17737; `_received.ndjson`: 37032; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 909 |
| media_server_evtpost-1789092704-26557 | `_events.json`: 8485; `_received.ndjson`: 9876; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 920 |
| media_server_redaction-1789092711-26744 | `(빈값)`: 3455; `_summary.json`: 2432 |
| media_server_vaevt-1789092671-25919 | `_9749.json`: 498; `_9750.json`: 518; `_9751.json`: 581; `_9752.json`: 486; `_9753.json`: 490; `_9754.json`: 490; `_9755.json`: 486; `_9756.json`: 490; `_9757.json`: 490; `_9758.json`: 503; `_9759.json`: 502; `_events.ndjson`: 1700158; `_overlay.jpg`: 482931; `_rules.tsv`: 223; `_snapshot.json`: 7580; `_taps.json`: 7597 |
| media_server_evtpost-1789092796-27799 | `_events.json`: 14397; `_received.ndjson`: 29640; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 909 |
| media_server_evtpost-1789092793-27724 | `_events.json`: 8488; `_received.ndjson`: 9872; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 920 |
| media_server_redaction-1789092801-27908 | `(빈값)`: 3456; `_summary.json`: 2432 |
| media_server_vaevt-1789092760-27150 | `_9401.json`: 498; `_9402.json`: 518; `_9403.json`: 581; `_9404.json`: 486; `_9405.json`: 490; `_9406.json`: 490; `_9407.json`: 486; `_9408.json`: 490; `_9409.json`: 490; `_9410.json`: 503; `_9411.json`: 502; `_events.ndjson`: 1719450; `_overlay.jpg`: 483103; `_rules.tsv`: 223; `_snapshot.json`: 8006; `_taps.json`: 8023 |
| media_server_evtpost-1789092888-28972 | `_events.json`: 14174; `_received.ndjson`: 29640; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 909 |
| media_server_evtpost-1789092885-28897 | `_events.json`: 8338; `_received.ndjson`: 9870; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 920 |
| media_server_redaction-1789092892-29144 | `(빈값)`: 3456; `_summary.json`: 2432 |
| media_server_vaevt-1789092851-28324 | `_9449.json`: 498; `_9450.json`: 518; `_9451.json`: 581; `_9452.json`: 486; `_9453.json`: 490; `_9454.json`: 490; `_9455.json`: 486; `_9456.json`: 490; `_9457.json`: 490; `_9458.json`: 503; `_9459.json`: 502; `_events.ndjson`: 1704442; `_overlay.jpg`: 483152; `_rules.tsv`: 223; `_snapshot.json`: 8505; `_taps.json`: 8523 |
| media_server_evtpost-1789092979-30206 | `_events.json`: 14433; `_received.ndjson`: 29634; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 909 |
| media_server_evtpost-1789092976-30130 | `_events.json`: 8527; `_received.ndjson`: 9870; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 920 |
| media_server_redaction-1789092983-30311 | `(빈값)`: 3455; `_summary.json`: 2432 |
| media_server_vaevt-1789092941-29484 | `_9689.json`: 498; `_9690.json`: 518; `_9691.json`: 581; `_9692.json`: 486; `_9693.json`: 490; `_9694.json`: 490; `_9695.json`: 486; `_9696.json`: 490; `_9697.json`: 490; `_9698.json`: 503; `_9699.json`: 502; `_events.ndjson`: 1699922; `_overlay.jpg`: 483959; `_rules.tsv`: 223; `_snapshot.json`: 8023; `_taps.json`: 8041 |
| media_server_evtpost-1789093070-31369 | `_events.json`: 14500; `_received.ndjson`: 29622; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 909 |
| media_server_evtpost-1789093067-31294 | `_events.json`: 8440; `_received.ndjson`: 9876; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 920 |
| media_server_redaction-1789093074-31474 | `(빈값)`: 3456; `_summary.json`: 2432 |
| media_server_vaevt-1789093033-30717 | `_9725.json`: 498; `_9726.json`: 518; `_9727.json`: 581; `_9728.json`: 486; `_9729.json`: 490; `_9730.json`: 490; `_9731.json`: 486; `_9732.json`: 490; `_9733.json`: 490; `_9734.json`: 503; `_9735.json`: 502; `_events.ndjson`: 1698154; `_overlay.jpg`: 483163; `_rules.tsv`: 223; `_snapshot.json`: 8025; `_taps.json`: 8043 |
| media_server_evtpost-1789093162-32538 | `_events.json`: 14522; `_received.ndjson`: 29634; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 909 |
| media_server_evtpost-1789093159-32460 | `_events.json`: 8345; `_received.ndjson`: 9874; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 920 |
| media_server_redaction-1789093166-32641 | `(빈값)`: 3463; `_summary.json`: 2432 |
| media_server_vaevt-1789093124-31886 | `_9713.json`: 498; `_9714.json`: 518; `_9715.json`: 581; `_9716.json`: 486; `_9717.json`: 490; `_9718.json`: 490; `_9719.json`: 486; `_9720.json`: 490; `_9721.json`: 490; `_9722.json`: 503; `_9723.json`: 502; `_events.ndjson`: 1701840; `_overlay.jpg`: 483362; `_rules.tsv`: 223; `_snapshot.json`: 7974; `_taps.json`: 7992 |
| media_server_evtpost-1789093253-33707 | `_events.json`: 14525; `_received.ndjson`: 29634; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 909 |
| media_server_evtpost-1789093250-33632 | `_events.json`: 8517; `_received.ndjson`: 9870; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 920 |
| media_server_redaction-1789093258-33868 | `(빈값)`: 3469; `_summary.json`: 2432 |
| media_server_vaevt-1789093216-33055 | `_9701.json`: 498; `_9702.json`: 518; `_9703.json`: 581; `_9704.json`: 486; `_9705.json`: 490; `_9706.json`: 490; `_9707.json`: 486; `_9708.json`: 490; `_9709.json`: 490; `_9710.json`: 503; `_9711.json`: 502; `_events.ndjson`: 1702744; `_overlay.jpg`: 483043; `_rules.tsv`: 223; `_snapshot.json`: 8547; `_taps.json`: 8565 |
| media_server_evtpost-1789093344-34940 | `_events.json`: 14506; `_received.ndjson`: 29622; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 909 |
| media_server_evtpost-1789093341-34859 | `_events.json`: 8300; `_received.ndjson`: 9872; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 920 |
| media_server_redaction-1789093347-35043 | `(빈값)`: 3456; `_summary.json`: 2432 |
| media_server_vaevt-1789093307-34220 | `_9641.json`: 498; `_9642.json`: 518; `_9643.json`: 581; `_9644.json`: 486; `_9645.json`: 490; `_9646.json`: 490; `_9647.json`: 486; `_9648.json`: 490; `_9649.json`: 490; `_9650.json`: 503; `_9651.json`: 502; `_events.ndjson`: 1698827; `_overlay.jpg`: 483797; `_rules.tsv`: 223; `_snapshot.json`: 8515; `_taps.json`: 8533 |
| media_server_evtpost-1789087645-58772 | `_events.json`: 14481; `_received.ndjson`: 29586; `_status_after.json`: 203; `_status_before.json`: 203; `_summary.json`: 901 |
| media_server_evtpost-1789087642-58697 | `_events.json`: 8492; `_received.ndjson`: 9858; `_status_after.json`: 203; `_status_before.json`: 203; `_summary.json`: 912 |
| media_server_redaction-1789087648-58943 | `(빈값)`: 3455; `_summary.json`: 2432 |
| media_server_vaevt-1789087609-58123 | `_9557.json`: 498; `_9558.json`: 518; `_9559.json`: 581; `_9560.json`: 486; `_9561.json`: 490; `_9562.json`: 490; `_9563.json`: 486; `_9564.json`: 490; `_9565.json`: 490; `_9566.json`: 503; `_9567.json`: 502; `_events.ndjson`: 1719155; `_overlay.jpg`: 483397; `_rules.tsv`: 223; `_snapshot.json`: 8006; `_taps.json`: 8023 |
| media_server_evtpost-1789093435-36112 | `_events.json`: 14523; `_received.ndjson`: 29634; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 909 |
| media_server_evtpost-1789093432-36037 | `_events.json`: 7851; `_received.ndjson`: 9872; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 920 |
| media_server_redaction-1789093439-36217 | `(빈값)`: 3456; `_summary.json`: 2432 |
| media_server_vaevt-1789093397-35391 | `_9653.json`: 498; `_9654.json`: 518; `_9655.json`: 581; `_9656.json`: 486; `_9657.json`: 490; `_9658.json`: 490; `_9659.json`: 486; `_9660.json`: 490; `_9661.json`: 490; `_9662.json`: 503; `_9663.json`: 502; `_events.ndjson`: 1696844; `_overlay.jpg`: 482615; `_rules.tsv`: 223; `_snapshot.json`: 7886; `_taps.json`: 7905 |
| media_server_evtpost-1789093525-37268 | `_events.json`: 14521; `_received.ndjson`: 29634; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 909 |
| media_server_evtpost-1789093522-37193 | `_events.json`: 7859; `_received.ndjson`: 9876; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 920 |
| media_server_redaction-1789093529-37377 | `(빈값)`: 3455; `_summary.json`: 2432 |
| media_server_vaevt-1789093488-36623 | `_9677.json`: 498; `_9678.json`: 518; `_9679.json`: 581; `_9680.json`: 486; `_9681.json`: 490; `_9682.json`: 490; `_9683.json`: 486; `_9684.json`: 490; `_9685.json`: 490; `_9686.json`: 503; `_9687.json`: 502; `_events.ndjson`: 1709160; `_overlay.jpg`: 484132; `_rules.tsv`: 223; `_snapshot.json`: 8552; `_taps.json`: 8570 |
| media_server_evtpost-1789093616-38431 | `_events.json`: 14509; `_received.ndjson`: 29622; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 909 |
| media_server_evtpost-1789093613-38356 | `_events.json`: 8475; `_received.ndjson`: 9872; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 920 |
| media_server_redaction-1789093620-38536 | `(빈값)`: 3455; `_summary.json`: 2432 |
| media_server_vaevt-1789093578-37781 | `_9533.json`: 498; `_9534.json`: 518; `_9535.json`: 581; `_9536.json`: 486; `_9537.json`: 490; `_9538.json`: 490; `_9539.json`: 486; `_9540.json`: 490; `_9541.json`: 490; `_9542.json`: 503; `_9543.json`: 502; `_events.ndjson`: 1707174; `_overlay.jpg`: 483797; `_rules.tsv`: 223; `_snapshot.json`: 8514; `_taps.json`: 8526 |
| media_server_evtpost-1789093706-39591 | `_events.json`: 14499; `_received.ndjson`: 29622; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 909 |
| media_server_evtpost-1789093703-39516 | `_events.json`: 8328; `_received.ndjson`: 9866; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 920 |
| media_server_redaction-1789093710-39696 | `(빈값)`: 3455; `_summary.json`: 2432 |
| media_server_vaevt-1789093669-38946 | `_9473.json`: 498; `_9474.json`: 518; `_9475.json`: 581; `_9476.json`: 486; `_9477.json`: 490; `_9478.json`: 490; `_9479.json`: 486; `_9480.json`: 490; `_9481.json`: 490; `_9482.json`: 503; `_9483.json`: 502; `_events.ndjson`: 1694781; `_overlay.jpg`: 483959; `_rules.tsv`: 223; `_snapshot.json`: 8025; `_taps.json`: 8044 |
| media_server_evtpost-1789093797-40855 | `_events.json`: 14433; `_received.ndjson`: 29634; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 909 |
| media_server_evtpost-1789093794-40711 | `_events.json`: 8488; `_received.ndjson`: 9872; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 920 |
| media_server_redaction-1789093801-40958 | `(빈값)`: 3456; `_summary.json`: 2432 |
| media_server_vaevt-1789093761-40131 | `_9653.json`: 498; `_9654.json`: 518; `_9655.json`: 581; `_9656.json`: 486; `_9657.json`: 490; `_9658.json`: 490; `_9659.json`: 486; `_9660.json`: 490; `_9661.json`: 490; `_9662.json`: 503; `_9663.json`: 502; `_events.ndjson`: 1704252; `_overlay.jpg`: 484132; `_rules.tsv`: 223; `_snapshot.json`: 8415; `_taps.json`: 8571 |
| media_server_evtpost-1789093888-42035 | `_events.json`: 14525; `_received.ndjson`: 29634; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 909 |
| media_server_evtpost-1789093885-41958 | `_events.json`: 7839; `_received.ndjson`: 9868; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 920 |
| media_server_redaction-1789093893-42138 | `(빈값)`: 3456; `_summary.json`: 2432 |
| media_server_vaevt-1789093851-41313 | `_9437.json`: 498; `_9438.json`: 518; `_9439.json`: 581; `_9440.json`: 486; `_9441.json`: 490; `_9442.json`: 490; `_9443.json`: 486; `_9444.json`: 490; `_9445.json`: 490; `_9446.json`: 503; `_9447.json`: 502; `_events.ndjson`: 1698726; `_overlay.jpg`: 482615; `_rules.tsv`: 223; `_snapshot.json`: 7880; `_taps.json`: 7898 |
| media_server_evtpost-1789093980-43224 | `_events.json`: 14511; `_received.ndjson`: 29622; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 909 |
| media_server_evtpost-1789093977-43149 | `_events.json`: 8297; `_received.ndjson`: 9872; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 920 |
| media_server_redaction-1789093984-43329 | `(빈값)`: 3455; `_summary.json`: 2432 |
| media_server_vaevt-1789093943-42503 | `_9677.json`: 498; `_9678.json`: 518; `_9679.json`: 581; `_9680.json`: 486; `_9681.json`: 490; `_9682.json`: 490; `_9683.json`: 486; `_9684.json`: 490; `_9685.json`: 490; `_9686.json`: 503; `_9687.json`: 502; `_events.ndjson`: 1699069; `_overlay.jpg`: 483047; `_rules.tsv`: 223; `_snapshot.json`: 7890; `_taps.json`: 7908 |
| media_server_evtpost-1789094071-44383 | `_events.json`: 14501; `_received.ndjson`: 29622; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 909 |
| media_server_evtpost-1789094068-44308 | `_events.json`: 8250; `_received.ndjson`: 9872; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 920 |
| media_server_redaction-1789094075-44488 | `(빈값)`: 3455; `_summary.json`: 2432 |
| media_server_vaevt-1789094033-43737 | `_9725.json`: 498; `_9726.json`: 518; `_9727.json`: 581; `_9728.json`: 486; `_9729.json`: 490; `_9730.json`: 490; `_9731.json`: 486; `_9732.json`: 490; `_9733.json`: 490; `_9734.json`: 503; `_9735.json`: 502; `_events.ndjson`: 1696219; `_overlay.jpg`: 484065; `_rules.tsv`: 223; `_snapshot.json`: 8517; `_taps.json`: 8535 |
| media_server_evtpost-1789094162-45550 | `_events.json`: 14509; `_received.ndjson`: 29622; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 909 |
| media_server_evtpost-1789094159-45475 | `_events.json`: 8241; `_received.ndjson`: 9868; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 920 |
| media_server_redaction-1789094166-45655 | `(빈값)`: 3463; `_summary.json`: 2432 |
| media_server_vaevt-1789094125-44900 | `_9641.json`: 498; `_9642.json`: 518; `_9643.json`: 581; `_9644.json`: 486; `_9645.json`: 490; `_9646.json`: 490; `_9647.json`: 486; `_9648.json`: 490; `_9649.json`: 490; `_9650.json`: 503; `_9651.json`: 502; `_events.ndjson`: 1694267; `_overlay.jpg`: 482250; `_rules.tsv`: 223; `_snapshot.json`: 7894; `_taps.json`: 7912 |
| media_server_evtpost-1789094253-46784 | `_events.json`: 14169; `_received.ndjson`: 29634; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 909 |
| media_server_evtpost-1789094250-46639 | `_events.json`: 8345; `_received.ndjson`: 9874; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 920 |
| media_server_redaction-1789094257-46887 | `(빈값)`: 3455; `_summary.json`: 2432 |
| media_server_vaevt-1789094215-46068 | `_9617.json`: 498; `_9618.json`: 518; `_9619.json`: 581; `_9620.json`: 486; `_9621.json`: 490; `_9622.json`: 490; `_9623.json`: 486; `_9624.json`: 490; `_9625.json`: 490; `_9626.json`: 503; `_9627.json`: 502; `_events.ndjson`: 1698464; `_overlay.jpg`: 483163; `_rules.tsv`: 223; `_snapshot.json`: 8026; `_taps.json`: 8044 |
| media_server_evtpost-1789087735-60034 | `_events.json`: 14428; `_received.ndjson`: 29586; `_status_after.json`: 203; `_status_before.json`: 203; `_summary.json`: 901 |
| media_server_evtpost-1789087732-59959 | `_events.json`: 8463; `_received.ndjson`: 9846; `_status_after.json`: 203; `_status_before.json`: 203; `_summary.json`: 912 |
| media_server_redaction-1789087738-60142 | `(빈값)`: 3454; `_summary.json`: 2432 |
| media_server_vaevt-1789087699-59318 | `_9497.json`: 498; `_9498.json`: 518; `_9499.json`: 581; `_9500.json`: 486; `_9501.json`: 490; `_9502.json`: 490; `_9503.json`: 486; `_9504.json`: 490; `_9505.json`: 490; `_9506.json`: 503; `_9507.json`: 502; `_events.ndjson`: 1708639; `_overlay.jpg`: 482931; `_rules.tsv`: 223; `_snapshot.json`: 7574; `_taps.json`: 7723 |
| media_server_evtpost-1789094343-47952 | `_events.json`: 14499; `_received.ndjson`: 29622; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 909 |
| media_server_evtpost-1789094340-47875 | `_events.json`: 8295; `_received.ndjson`: 9870; `_status_after.json`: 207; `_status_before.json`: 207; `_summary.json`: 920 |
| media_server_redaction-1789094348-48055 | `(빈값)`: 3456; `_summary.json`: 2432 |
| media_server_vaevt-1789094306-47230 | `_9521.json`: 498; `_9522.json`: 518; `_9523.json`: 581; `_9524.json`: 486; `_9525.json`: 490; `_9526.json`: 490; `_9527.json`: 486; `_9528.json`: 490; `_9529.json`: 490; `_9530.json`: 503; `_9531.json`: 502; `_events.ndjson`: 1703893; `_overlay.jpg`: 483110; `_rules.tsv`: 223; `_snapshot.json`: 8558; `_taps.json`: 8576 |
| media_server_evtpost-1789087826-61233 | `_events.json`: 14418; `_received.ndjson`: 29574; `_status_after.json`: 203; `_status_before.json`: 203; `_summary.json`: 901 |
| media_server_evtpost-1789087822-61156 | `_events.json`: 8483; `_received.ndjson`: 9854; `_status_after.json`: 203; `_status_before.json`: 203; `_summary.json`: 912 |
| media_server_redaction-1789087829-61337 | `(빈값)`: 3455; `_summary.json`: 2432 |
| media_server_vaevt-1789087789-60557 | `_9605.json`: 498; `_9606.json`: 518; `_9607.json`: 581; `_9608.json`: 486; `_9609.json`: 490; `_9610.json`: 490; `_9611.json`: 486; `_9612.json`: 490; `_9613.json`: 490; `_9614.json`: 503; `_9615.json`: 502; `_events.ndjson`: 1714188; `_overlay.jpg`: 482800; `_rules.tsv`: 223; `_snapshot.json`: 7625; `_taps.json`: 7644 |
| media_server_evtpost-1789087916-62421 | `_events.json`: 14301; `_received.ndjson`: 29586; `_status_after.json`: 203; `_status_before.json`: 203; `_summary.json`: 901 |
| media_server_evtpost-1789087913-62346 | `_events.json`: 8349; `_received.ndjson`: 9858; `_status_after.json`: 203; `_status_before.json`: 203; `_summary.json`: 912 |
| media_server_redaction-1789087919-62525 | `(빈값)`: 3468; `_summary.json`: 2432 |
| media_server_vaevt-1789087880-61774 | `_9449.json`: 498; `_9450.json`: 518; `_9451.json`: 581; `_9452.json`: 486; `_9453.json`: 490; `_9454.json`: 490; `_9455.json`: 486; `_9456.json`: 490; `_9457.json`: 490; `_9458.json`: 503; `_9459.json`: 502; `_events.ndjson`: 1705230; `_overlay.jpg`: 483366; `_rules.tsv`: 223; `_snapshot.json`: 8417; `_taps.json`: 8436 |
| media_server_redaction-1789087065-51022 | `(빈값)`: 3773245; `_summary.json`: 2477 |
| media_server_vaevt-1789087112-51480 | `_9401.json`: 498; `_9402.json`: 518; `_9403.json`: 581; `_9404.json`: 486; `_9405.json`: 490; `_9406.json`: 490; `_9407.json`: 486; `_9408.json`: 490; `_9409.json`: 490; `_9410.json`: 503; `_9411.json`: 502; `_events.ndjson`: 2044427; `_overlay.jpg`: 495950; `_rules.tsv`: 223; `_snapshot.json`: 12002; `_taps.json`: 12020 |

## 추가 cleanup 소유 확인41개

메인이 before미존재와 child21-image-analysis.log43–65, child11–16 launcher 종료 경로, child7-status/check_server.sh161·170, child8-diagnose/diagnose_media_server.sh308·309, child19-rules-registry.log/test_rule_registry.sh98–189의 정확 출력 경로를 대조하여 다음41개를 같은run 소유로 확정했다. runner1개는 앞3roots와 중복이므로 삭제 횟수를 이중 계산하지 않는다. 메인 진단에서 최초19-rule-registry.log 오기는 ENOENT였고 실제19-rules-registry.log로 정정했다(테스트 실패 아님). 아직 삭제하지 않았다.

| exact 경로 | bytes | 조치 |
| --- | ---: | --- |
| /private/tmp/http_local_h264_aac.http.log | 425 | 메인 삭제 대기 |
| /private/tmp/http_local_h264_video_only.http.log | 469 | 메인 삭제 대기 |
| /private/tmp/media_server_ffprobe.txt | 2194 | 메인 삭제 대기 |
| /private/tmp/media_server_image-analysis-1789087151-52142_metadata.json | 11160 | 메인 삭제 대기 |
| /private/tmp/media_server_image-analysis-1789087151-52142_overlay.jpg | 1313754 | 메인 삭제 대기 |
| /private/tmp/media_server_image-analysis-1789087151-52142_redaction_overlay.jpg | 1241628 | 메인 삭제 대기 |
| /private/tmp/media_server_image-analysis-1789087151-52142_snapshot.jpg | 921527 | 메인 삭제 대기 |
| /private/tmp/media_server_image-analysis-1789087151-52142_tracking_alias_vehicles.json | 9079 | 메인 삭제 대기 |
| /private/tmp/media_server_image-analysis-1789087151-52142_tracking_all.json | 19473 | 메인 삭제 대기 |
| /private/tmp/media_server_image-analysis-1789087151-52142_tracking_animal.json | 7795 | 메인 삭제 대기 |
| /private/tmp/media_server_image-analysis-1789087151-52142_tracking_default.json | 11160 | 메인 삭제 대기 |
| /private/tmp/media_server_image-analysis-1789087151-52142_tracking_device.json | 8571 | 메인 삭제 대기 |
| /private/tmp/media_server_image-analysis-1789087151-52142_tracking_direct_traffic_light.json | 8101 | 메인 삭제 대기 |
| /private/tmp/media_server_image-analysis-1789087151-52142_tracking_empty.json | 7277 | 메인 삭제 대기 |
| /private/tmp/media_server_image-analysis-1789087151-52142_tracking_food.json | 7540 | 메인 삭제 대기 |
| /private/tmp/media_server_image-analysis-1789087151-52142_tracking_furniture.json | 10152 | 메인 삭제 대기 |
| /private/tmp/media_server_image-analysis-1789087151-52142_tracking_mixed_animal_car.json | 8819 | 메인 삭제 대기 |
| /private/tmp/media_server_image-analysis-1789087151-52142_tracking_object.json | 8071 | 메인 삭제 대기 |
| /private/tmp/media_server_image-analysis-1789087151-52142_tracking_road.json | 8083 | 메인 삭제 대기 |
| /private/tmp/media_server_image-analysis-1789087151-52142_tracking_sports.json | 7289 | 메인 삭제 대기 |
| /private/tmp/media_server_image-analysis-1789087151-52142_tracking_summary.json | 1975 | 메인 삭제 대기 |
| /private/tmp/media_server_image-analysis-1789087151-52142_tracking_tableware.json | 9088 | 메인 삭제 대기 |
| /private/tmp/media_server_image-analysis-1789087151-52142_traversal.json | 72 | 메인 삭제 대기 |
| /private/tmp/media_server_predev-1789086596-45840 | 2128447 | 메인 삭제 대기 (기존runner 중복) |
| /private/tmp/media_server_probe_h264.rc | 2 | 메인 삭제 대기 |
| /private/tmp/media_server_probe_h264.txt | 2201 | 메인 삭제 대기 |
| /private/tmp/media_server_probe_h265.rc | 2 | 메인 삭제 대기 |
| /private/tmp/media_server_probe_h265.txt | 2188 | 메인 삭제 대기 |
| /private/tmp/media_server_rule_alt_profile_put.json | 184 | 메인 삭제 대기 |
| /private/tmp/media_server_rule_alt_put.json | 576 | 메인 삭제 대기 |
| /private/tmp/media_server_rule_auto_snapshot.json | 4734 | 메인 삭제 대기 |
| /private/tmp/media_server_rule_auto_tap.json | 1097 | 메인 삭제 대기 |
| /private/tmp/media_server_rule_auto_taps.json | 4752 | 메인 삭제 대기 |
| /private/tmp/media_server_rule_get.json | 594 | 메인 삭제 대기 |
| /private/tmp/media_server_rule_profile_get.json | 154 | 메인 삭제 대기 |
| /private/tmp/media_server_rule_profile_put.json | 183 | 메인 삭제 대기 |
| /private/tmp/media_server_rule_put.json | 623 | 메인 삭제 대기 |
| /private/tmp/rtsp_local_h264_pcma.launcher.log | 73 | 메인 삭제 대기 |
| /private/tmp/rtsp_local_h264_pcmu.launcher.log | 73 | 메인 삭제 대기 |
| /private/tmp/rtsp_local_h265_opus.launcher.log | 73 | 메인 삭제 대기 |
| /private/tmp/webrtc_local_publish_h264_opus.publisher.log | 175 | 메인 삭제 대기 |

## 한계

predev120 실행 범위만 exit0이다. 직접 recording120,30분,UI 풀테스트,독립 자원 추세 판정 및 S09 전체완료를 대체하지 않는다. 최초89034 주석정책 실패·51874 Python gi 실패 후 보완 이력은 중앙에 남아 있다. 이번에는 실제 테스트·서버 재실행/제품·설정 수정/커밋·푸시/임시삭제 없이 원결과만 이관했다.

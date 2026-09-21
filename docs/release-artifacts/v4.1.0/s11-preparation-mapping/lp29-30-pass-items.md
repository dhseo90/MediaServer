# LP29 실제 30분 개별 결과

독자: 검증·릴리즈 담당자. 수명: v4.1.0 실행 이력. 정책은 AGENTS.md, 중앙은 release-test-records.md다.

Source `b9454076`, 2026-09-21T20:01:20.619Z~20:41:23.380Z, exit0·2402.756초·실제 반복20회.
명령·환경·개별 단계는 [요약](lp29-30-pass-summary.json), 원출력308파일 및 자식 검사 전수1254행은
[압축 증적](lp29-30-pass-outputs.json.gz)의 logs/itemResults에 각 제목·내용·PASS/FAIL·출처 행으로 보존했다.
1254행은 반복별 검사 행이며 독립 기능1254개가 아니다. 요약 작성 보조 도구의 출력 크기 초과로
첫 표 생성은 미수행했고, 필요한 상위 필드만 읽어 작성했다. 제품/검증 실행에는 영향이 없다.

## 실제 결과

| 제목 | 테스트내용 | pass/fail | 비고(실패 후 pass됨 등을 기록) |
| --- | --- | --- | --- |
| server-start-queue-256 | 0초; 원출력 server.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| integrated-smoke | 569초; 원출력 integrated_smoke.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-1-va-events | 34초; 원출력 soak_1_va_events.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-1-event-post-schema | 3초; 원출력 soak_1_event_post_schema.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-1-event-post-recovery | 4초; 원출력 soak_1_event_post_recovery.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-1-redaction | 40초; 원출력 soak_1_redaction.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-1-runtime-idle | 0초; 원출력 soak_1_runtime_idle.json; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-2-va-events | 34초; 원출력 soak_2_va_events.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-2-event-post-schema | 3초; 원출력 soak_2_event_post_schema.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-2-event-post-recovery | 3초; 원출력 soak_2_event_post_recovery.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-2-redaction | 41초; 원출력 soak_2_redaction.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-2-runtime-idle | 0초; 원출력 soak_2_runtime_idle.json; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-3-va-events | 34초; 원출력 soak_3_va_events.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-3-event-post-schema | 3초; 원출력 soak_3_event_post_schema.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-3-event-post-recovery | 4초; 원출력 soak_3_event_post_recovery.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-3-redaction | 40초; 원출력 soak_3_redaction.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-3-runtime-idle | 0초; 원출력 soak_3_runtime_idle.json; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-4-va-events | 35초; 원출력 soak_4_va_events.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-4-event-post-schema | 3초; 원출력 soak_4_event_post_schema.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-4-event-post-recovery | 4초; 원출력 soak_4_event_post_recovery.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-4-redaction | 39초; 원출력 soak_4_redaction.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-4-runtime-idle | 0초; 원출력 soak_4_runtime_idle.json; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-5-va-events | 34초; 원출력 soak_5_va_events.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-5-event-post-schema | 3초; 원출력 soak_5_event_post_schema.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-5-event-post-recovery | 5초; 원출력 soak_5_event_post_recovery.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-5-redaction | 39초; 원출력 soak_5_redaction.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-5-runtime-idle | 0초; 원출력 soak_5_runtime_idle.json; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-6-va-events | 34초; 원출력 soak_6_va_events.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-6-event-post-schema | 3초; 원출력 soak_6_event_post_schema.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-6-event-post-recovery | 3초; 원출력 soak_6_event_post_recovery.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-6-redaction | 41초; 원출력 soak_6_redaction.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-6-runtime-idle | 0초; 원출력 soak_6_runtime_idle.json; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-7-va-events | 35초; 원출력 soak_7_va_events.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-7-event-post-schema | 3초; 원출력 soak_7_event_post_schema.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-7-event-post-recovery | 3초; 원출력 soak_7_event_post_recovery.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-7-redaction | 40초; 원출력 soak_7_redaction.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-7-runtime-idle | 0초; 원출력 soak_7_runtime_idle.json; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-8-va-events | 34초; 원출력 soak_8_va_events.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-8-event-post-schema | 3초; 원출력 soak_8_event_post_schema.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-8-event-post-recovery | 3초; 원출력 soak_8_event_post_recovery.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-8-redaction | 42초; 원출력 soak_8_redaction.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-8-runtime-idle | 0초; 원출력 soak_8_runtime_idle.json; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-9-va-events | 34초; 원출력 soak_9_va_events.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-9-event-post-schema | 3초; 원출력 soak_9_event_post_schema.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-9-event-post-recovery | 4초; 원출력 soak_9_event_post_recovery.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-9-redaction | 39초; 원출력 soak_9_redaction.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-9-runtime-idle | 0초; 원출력 soak_9_runtime_idle.json; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-10-va-events | 34초; 원출력 soak_10_va_events.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-10-event-post-schema | 3초; 원출력 soak_10_event_post_schema.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-10-event-post-recovery | 3초; 원출력 soak_10_event_post_recovery.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-10-redaction | 41초; 원출력 soak_10_redaction.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-10-runtime-idle | 0초; 원출력 soak_10_runtime_idle.json; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-11-va-events | 33초; 원출력 soak_11_va_events.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-11-event-post-schema | 3초; 원출력 soak_11_event_post_schema.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-11-event-post-recovery | 4초; 원출력 soak_11_event_post_recovery.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-11-redaction | 41초; 원출력 soak_11_redaction.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-11-runtime-idle | 0초; 원출력 soak_11_runtime_idle.json; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-12-va-events | 35초; 원출력 soak_12_va_events.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-12-event-post-schema | 3초; 원출력 soak_12_event_post_schema.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-12-event-post-recovery | 4초; 원출력 soak_12_event_post_recovery.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-12-redaction | 39초; 원출력 soak_12_redaction.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-12-runtime-idle | 0초; 원출력 soak_12_runtime_idle.json; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-13-va-events | 34초; 원출력 soak_13_va_events.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-13-event-post-schema | 3초; 원출력 soak_13_event_post_schema.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-13-event-post-recovery | 4초; 원출력 soak_13_event_post_recovery.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-13-redaction | 39초; 원출력 soak_13_redaction.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-13-runtime-idle | 0초; 원출력 soak_13_runtime_idle.json; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-14-va-events | 33초; 원출력 soak_14_va_events.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-14-event-post-schema | 3초; 원출력 soak_14_event_post_schema.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-14-event-post-recovery | 4초; 원출력 soak_14_event_post_recovery.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-14-redaction | 41초; 원출력 soak_14_redaction.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-14-runtime-idle | 0초; 원출력 soak_14_runtime_idle.json; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-15-va-events | 35초; 원출력 soak_15_va_events.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-15-event-post-schema | 3초; 원출력 soak_15_event_post_schema.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-15-event-post-recovery | 3초; 원출력 soak_15_event_post_recovery.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-15-redaction | 40초; 원출력 soak_15_redaction.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-15-runtime-idle | 0초; 원출력 soak_15_runtime_idle.json; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-16-va-events | 35초; 원출력 soak_16_va_events.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-16-event-post-schema | 3초; 원출력 soak_16_event_post_schema.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-16-event-post-recovery | 4초; 원출력 soak_16_event_post_recovery.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-16-redaction | 39초; 원출력 soak_16_redaction.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-16-runtime-idle | 0초; 원출력 soak_16_runtime_idle.json; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-17-va-events | 34초; 원출력 soak_17_va_events.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-17-event-post-schema | 3초; 원출력 soak_17_event_post_schema.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-17-event-post-recovery | 4초; 원출력 soak_17_event_post_recovery.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-17-redaction | 40초; 원출력 soak_17_redaction.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-17-runtime-idle | 0초; 원출력 soak_17_runtime_idle.json; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-18-va-events | 34초; 원출력 soak_18_va_events.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-18-event-post-schema | 3초; 원출력 soak_18_event_post_schema.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-18-event-post-recovery | 4초; 원출력 soak_18_event_post_recovery.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-18-redaction | 40초; 원출력 soak_18_redaction.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-18-runtime-idle | 0초; 원출력 soak_18_runtime_idle.json; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-19-va-events | 35초; 원출력 soak_19_va_events.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-19-event-post-schema | 3초; 원출력 soak_19_event_post_schema.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-19-event-post-recovery | 4초; 원출력 soak_19_event_post_recovery.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-19-redaction | 39초; 원출력 soak_19_redaction.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-19-runtime-idle | 0초; 원출력 soak_19_runtime_idle.json; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-20-va-events | 34초; 원출력 soak_20_va_events.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-20-event-post-schema | 3초; 원출력 soak_20_event_post_schema.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-20-event-post-recovery | 3초; 원출력 soak_20_event_post_recovery.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-20-redaction | 41초; 원출력 soak_20_redaction.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| soak-20-runtime-idle | 0초; 원출력 soak_20_runtime_idle.json; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| main-runtime-idle | 0초; 원출력 main_runtime_idle.json; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| server-start-queue-2 | 0초; 원출력 server.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| event-post-queue | 3초; 원출력 event_post_queue.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| queue-runtime-idle | 0초; 원출력 queue_runtime_idle.json; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| ports-clean | 0초; 원출력 ports-clean.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |
| summary-report | 1초; 원출력 summary_report.log; 정확 명령은 요약 steps | PASS | 첫 주석 실패 후 보완 재실행 |

## 미실행·제외

| 제목 | 수행내용 | 사유 | 완료 evidence로 사용할 수 없는 경계 |
| --- | --- | --- | --- |
| build | 새 빌드 | 승인된 skip-build·LP28 실행물 유지 | 새 빌드 PASS 아님 |
| external TURN | 외부 relay | 사용자 외부 서비스 제외 | PASS 아님 |
| integrated 선택9개 | 자동서버시작,LAN,외부RTSP,HLS/외부HTTP,URI장기,eventPOST선택,ICE선택,RuleUI,ProductUI | 원출력 각 사유 보존; predev자체기동·eventPOST반복은 별도 수행 | 각 skip를 PASS로 사용하지 않음 |
| 실제 UI·120분 | 다음 검증 영역 | 이번30분과 별도 | 이 결과로 대체 불가 |

## 정리

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| /private/tmp/media-server-lp29-soak.BceqcQ | 파일39/링크277 | 16066439B | 증거 이관 후 삭제 | 부재true·링크대상보존 | 요약 cleanup |
| /private/tmp/media_server_predev-1790020880-12444 | 파일276/링크0 | 551663B | 증거 이관 후 삭제 | 부재true·링크대상보존 | 요약 cleanup |
| /Users/dhseo/Workspace/mediaServer/.media_server.test/20260922-050122 | 파일24/링크0 | 37890B | 증거 이관 후 삭제 | 부재true·링크대상보존 | 요약 cleanup |

PID12444/12460/12462/40447 부재, TCP52670/52671·UDP56978 재바인딩 확인. 서버 wait exit/signal은 기존 도구 미수집이다.
토큰 start/end/consumed는 전용 집계 미제공으로 미집계이며 elapsed/source는 실측이다.

기록 검증: `./server.sh verify-docs-links` exit0(297문서/9669링크/22이미지/164anchor/index76/exclusion212/실패0),
`git diff --check` exit0. 실제UI나120분을 대체하지 않는다.

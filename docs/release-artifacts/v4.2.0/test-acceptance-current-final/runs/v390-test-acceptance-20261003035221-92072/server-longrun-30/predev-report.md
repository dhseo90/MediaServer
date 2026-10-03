# MediaServer 검증 요약

| 파일 | 유형 | 상태 | pass | fail | skip | 핵심 detail |
| --- | --- | --- | ---: | ---: | ---: | --- |
| /Users/dhseo/Workspace/mediaServer/docs/release-artifacts/v4.2.0/test-acceptance-current-final/runs/v390-test-acceptance-20261003035221-92072/server-longrun-30/predev-summary.json | predev | pass | 108 | 0 | 2 | durationSec=2393 steps=110 failed= skipped=build,external-turn-hard-gate |

## 상세

### predev-summary.json

- durationSec: `2393`
- soakMinutes: `30`
- step `build`: `skip` duration=`0.0` log=``
- step `server-start-queue-256`: `pass` duration=`0.0` log=`/tmp/media_server_predev-1790999964-99447/server.log`
- step `integrated-smoke`: `pass` duration=`561.0` log=`/tmp/media_server_predev-1790999964-99447/integrated_smoke.log`
- step `external-turn-hard-gate`: `skip` duration=`0.0` log=``
- step `soak-1-va-events`: `pass` duration=`33.0` log=`/tmp/media_server_predev-1790999964-99447/soak_1_va_events.log`
- step `soak-1-event-post-schema`: `pass` duration=`4.0` log=`/tmp/media_server_predev-1790999964-99447/soak_1_event_post_schema.log`
- step `soak-1-event-post-recovery`: `pass` duration=`4.0` log=`/tmp/media_server_predev-1790999964-99447/soak_1_event_post_recovery.log`
- step `soak-1-redaction`: `pass` duration=`41.0` log=`/tmp/media_server_predev-1790999964-99447/soak_1_redaction.log`
- step `soak-1-runtime-idle`: `pass` duration=`0.0` log=`/tmp/media_server_predev-1790999964-99447/soak_1_runtime_idle.json`
- step `soak-2-va-events`: `pass` duration=`34.0` log=`/tmp/media_server_predev-1790999964-99447/soak_2_va_events.log`
- step `soak-2-event-post-schema`: `pass` duration=`3.0` log=`/tmp/media_server_predev-1790999964-99447/soak_2_event_post_schema.log`
- step `soak-2-event-post-recovery`: `pass` duration=`4.0` log=`/tmp/media_server_predev-1790999964-99447/soak_2_event_post_recovery.log`
- step `soak-2-redaction`: `pass` duration=`41.0` log=`/tmp/media_server_predev-1790999964-99447/soak_2_redaction.log`
- step `soak-2-runtime-idle`: `pass` duration=`0.0` log=`/tmp/media_server_predev-1790999964-99447/soak_2_runtime_idle.json`
- step `soak-3-va-events`: `pass` duration=`33.0` log=`/tmp/media_server_predev-1790999964-99447/soak_3_va_events.log`
- step `soak-3-event-post-schema`: `pass` duration=`3.0` log=`/tmp/media_server_predev-1790999964-99447/soak_3_event_post_schema.log`
- step `soak-3-event-post-recovery`: `pass` duration=`4.0` log=`/tmp/media_server_predev-1790999964-99447/soak_3_event_post_recovery.log`
- step `soak-3-redaction`: `pass` duration=`41.0` log=`/tmp/media_server_predev-1790999964-99447/soak_3_redaction.log`
- step `soak-3-runtime-idle`: `pass` duration=`0.0` log=`/tmp/media_server_predev-1790999964-99447/soak_3_runtime_idle.json`
- step `soak-4-va-events`: `pass` duration=`33.0` log=`/tmp/media_server_predev-1790999964-99447/soak_4_va_events.log`
- step `soak-4-event-post-schema`: `pass` duration=`3.0` log=`/tmp/media_server_predev-1790999964-99447/soak_4_event_post_schema.log`
- step `soak-4-event-post-recovery`: `pass` duration=`4.0` log=`/tmp/media_server_predev-1790999964-99447/soak_4_event_post_recovery.log`
- step `soak-4-redaction`: `pass` duration=`42.0` log=`/tmp/media_server_predev-1790999964-99447/soak_4_redaction.log`
- step `soak-4-runtime-idle`: `pass` duration=`0.0` log=`/tmp/media_server_predev-1790999964-99447/soak_4_runtime_idle.json`
- step `soak-5-va-events`: `pass` duration=`34.0` log=`/tmp/media_server_predev-1790999964-99447/soak_5_va_events.log`
- step `soak-5-event-post-schema`: `pass` duration=`3.0` log=`/tmp/media_server_predev-1790999964-99447/soak_5_event_post_schema.log`
- step `soak-5-event-post-recovery`: `pass` duration=`4.0` log=`/tmp/media_server_predev-1790999964-99447/soak_5_event_post_recovery.log`
- step `soak-5-redaction`: `pass` duration=`40.0` log=`/tmp/media_server_predev-1790999964-99447/soak_5_redaction.log`
- step `soak-5-runtime-idle`: `pass` duration=`0.0` log=`/tmp/media_server_predev-1790999964-99447/soak_5_runtime_idle.json`
- step `soak-6-va-events`: `pass` duration=`33.0` log=`/tmp/media_server_predev-1790999964-99447/soak_6_va_events.log`
- step `soak-6-event-post-schema`: `pass` duration=`3.0` log=`/tmp/media_server_predev-1790999964-99447/soak_6_event_post_schema.log`
- step `soak-6-event-post-recovery`: `pass` duration=`4.0` log=`/tmp/media_server_predev-1790999964-99447/soak_6_event_post_recovery.log`
- step `soak-6-redaction`: `pass` duration=`41.0` log=`/tmp/media_server_predev-1790999964-99447/soak_6_redaction.log`
- step `soak-6-runtime-idle`: `pass` duration=`0.0` log=`/tmp/media_server_predev-1790999964-99447/soak_6_runtime_idle.json`
- step `soak-7-va-events`: `pass` duration=`33.0` log=`/tmp/media_server_predev-1790999964-99447/soak_7_va_events.log`
- step `soak-7-event-post-schema`: `pass` duration=`3.0` log=`/tmp/media_server_predev-1790999964-99447/soak_7_event_post_schema.log`
- step `soak-7-event-post-recovery`: `pass` duration=`4.0` log=`/tmp/media_server_predev-1790999964-99447/soak_7_event_post_recovery.log`
- step `soak-7-redaction`: `pass` duration=`41.0` log=`/tmp/media_server_predev-1790999964-99447/soak_7_redaction.log`
- step `soak-7-runtime-idle`: `pass` duration=`0.0` log=`/tmp/media_server_predev-1790999964-99447/soak_7_runtime_idle.json`
- step `soak-8-va-events`: `pass` duration=`33.0` log=`/tmp/media_server_predev-1790999964-99447/soak_8_va_events.log`

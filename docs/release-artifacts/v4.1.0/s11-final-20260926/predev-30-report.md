# MediaServer 검증 요약

| 파일 | 유형 | 상태 | pass | fail | skip | 핵심 detail |
| --- | --- | --- | ---: | ---: | ---: | --- |
| /private/tmp/media-server-s11-final-ZiYEMh/predev-30-final-summary.json | predev | pass | 109 | 0 | 1 | durationSec=2437 steps=110 failed= skipped=external-turn-hard-gate |

## 상세

### predev-30-final-summary.json

- durationSec: `2437`
- soakMinutes: `30`
- step `build`: `pass` duration=`9.0` log=`/tmp/media_server_predev-1790383000-55400/build.log`
- step `server-start-queue-256`: `pass` duration=`0.0` log=`/tmp/media_server_predev-1790383000-55400/server.log`
- step `integrated-smoke`: `pass` duration=`595.0` log=`/tmp/media_server_predev-1790383000-55400/integrated_smoke.log`
- step `external-turn-hard-gate`: `skip` duration=`0.0` log=``
- step `soak-1-va-events`: `pass` duration=`34.0` log=`/tmp/media_server_predev-1790383000-55400/soak_1_va_events.log`
- step `soak-1-event-post-schema`: `pass` duration=`3.0` log=`/tmp/media_server_predev-1790383000-55400/soak_1_event_post_schema.log`
- step `soak-1-event-post-recovery`: `pass` duration=`4.0` log=`/tmp/media_server_predev-1790383000-55400/soak_1_event_post_recovery.log`
- step `soak-1-redaction`: `pass` duration=`40.0` log=`/tmp/media_server_predev-1790383000-55400/soak_1_redaction.log`
- step `soak-1-runtime-idle`: `pass` duration=`0.0` log=`/tmp/media_server_predev-1790383000-55400/soak_1_runtime_idle.json`
- step `soak-2-va-events`: `pass` duration=`35.0` log=`/tmp/media_server_predev-1790383000-55400/soak_2_va_events.log`
- step `soak-2-event-post-schema`: `pass` duration=`3.0` log=`/tmp/media_server_predev-1790383000-55400/soak_2_event_post_schema.log`
- step `soak-2-event-post-recovery`: `pass` duration=`4.0` log=`/tmp/media_server_predev-1790383000-55400/soak_2_event_post_recovery.log`
- step `soak-2-redaction`: `pass` duration=`39.0` log=`/tmp/media_server_predev-1790383000-55400/soak_2_redaction.log`
- step `soak-2-runtime-idle`: `pass` duration=`0.0` log=`/tmp/media_server_predev-1790383000-55400/soak_2_runtime_idle.json`
- step `soak-3-va-events`: `pass` duration=`34.0` log=`/tmp/media_server_predev-1790383000-55400/soak_3_va_events.log`
- step `soak-3-event-post-schema`: `pass` duration=`3.0` log=`/tmp/media_server_predev-1790383000-55400/soak_3_event_post_schema.log`
- step `soak-3-event-post-recovery`: `pass` duration=`3.0` log=`/tmp/media_server_predev-1790383000-55400/soak_3_event_post_recovery.log`
- step `soak-3-redaction`: `pass` duration=`40.0` log=`/tmp/media_server_predev-1790383000-55400/soak_3_redaction.log`
- step `soak-3-runtime-idle`: `pass` duration=`0.0` log=`/tmp/media_server_predev-1790383000-55400/soak_3_runtime_idle.json`
- step `soak-4-va-events`: `pass` duration=`34.0` log=`/tmp/media_server_predev-1790383000-55400/soak_4_va_events.log`
- step `soak-4-event-post-schema`: `pass` duration=`3.0` log=`/tmp/media_server_predev-1790383000-55400/soak_4_event_post_schema.log`
- step `soak-4-event-post-recovery`: `pass` duration=`4.0` log=`/tmp/media_server_predev-1790383000-55400/soak_4_event_post_recovery.log`
- step `soak-4-redaction`: `pass` duration=`40.0` log=`/tmp/media_server_predev-1790383000-55400/soak_4_redaction.log`
- step `soak-4-runtime-idle`: `pass` duration=`0.0` log=`/tmp/media_server_predev-1790383000-55400/soak_4_runtime_idle.json`
- step `soak-5-va-events`: `pass` duration=`35.0` log=`/tmp/media_server_predev-1790383000-55400/soak_5_va_events.log`
- step `soak-5-event-post-schema`: `pass` duration=`3.0` log=`/tmp/media_server_predev-1790383000-55400/soak_5_event_post_schema.log`
- step `soak-5-event-post-recovery`: `pass` duration=`4.0` log=`/tmp/media_server_predev-1790383000-55400/soak_5_event_post_recovery.log`
- step `soak-5-redaction`: `pass` duration=`39.0` log=`/tmp/media_server_predev-1790383000-55400/soak_5_redaction.log`
- step `soak-5-runtime-idle`: `pass` duration=`0.0` log=`/tmp/media_server_predev-1790383000-55400/soak_5_runtime_idle.json`
- step `soak-6-va-events`: `pass` duration=`34.0` log=`/tmp/media_server_predev-1790383000-55400/soak_6_va_events.log`
- step `soak-6-event-post-schema`: `pass` duration=`3.0` log=`/tmp/media_server_predev-1790383000-55400/soak_6_event_post_schema.log`
- step `soak-6-event-post-recovery`: `pass` duration=`5.0` log=`/tmp/media_server_predev-1790383000-55400/soak_6_event_post_recovery.log`
- step `soak-6-redaction`: `pass` duration=`39.0` log=`/tmp/media_server_predev-1790383000-55400/soak_6_redaction.log`
- step `soak-6-runtime-idle`: `pass` duration=`0.0` log=`/tmp/media_server_predev-1790383000-55400/soak_6_runtime_idle.json`
- step `soak-7-va-events`: `pass` duration=`34.0` log=`/tmp/media_server_predev-1790383000-55400/soak_7_va_events.log`
- step `soak-7-event-post-schema`: `pass` duration=`3.0` log=`/tmp/media_server_predev-1790383000-55400/soak_7_event_post_schema.log`
- step `soak-7-event-post-recovery`: `pass` duration=`4.0` log=`/tmp/media_server_predev-1790383000-55400/soak_7_event_post_recovery.log`
- step `soak-7-redaction`: `pass` duration=`40.0` log=`/tmp/media_server_predev-1790383000-55400/soak_7_redaction.log`
- step `soak-7-runtime-idle`: `pass` duration=`0.0` log=`/tmp/media_server_predev-1790383000-55400/soak_7_runtime_idle.json`
- step `soak-8-va-events`: `pass` duration=`35.0` log=`/tmp/media_server_predev-1790383000-55400/soak_8_va_events.log`

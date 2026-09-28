# MediaServer 검증 요약

| 파일 | 유형 | 상태 | pass | fail | skip | 핵심 detail |
| --- | --- | --- | ---: | ---: | ---: | --- |
| /tmp/media_server_predev-1790128682-19716_summary.json | predev | fail | 4 | 1 | 0 | durationSec=471 steps=11 failed=integrated-smoke skipped= |

## 상세

### media_server_predev-1790128682-19716_summary.json

- durationSec: `471`
- soakMinutes: `120`
- step `build`: `pass` duration=`1.0` log=`/tmp/media_server_predev-1790128682-19716/build.log`
- step `server-start-queue-256`: `pass` duration=`0.0` log=`/tmp/media_server_predev-1790128682-19716/server.log`
- step `integrated-smoke`: `fail` duration=`464.0` log=`/tmp/media_server_predev-1790128682-19716/integrated_smoke.log`
- step `external-turn-hard-gate`: `not-run` duration=`0.0` log=``
- step `soak-case-loop`: `not-run` duration=`0.0` log=``
- step `main-runtime-idle`: `not-run` duration=`0.0` log=``
- step `server-start-queue-2`: `not-run` duration=`0.0` log=``
- step `event-post-queue`: `not-run` duration=`0.0` log=``
- step `queue-runtime-idle`: `not-run` duration=`0.0` log=``
- step `ports-clean`: `pass` duration=`0.0` log=`/tmp/media_server_predev-1790128682-19716/ports-clean.log`
- step `summary-report`: `pass` duration=`1.0` log=`/tmp/media_server_predev-1790128682-19716/summary_report.log`

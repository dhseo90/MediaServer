# v3.9.0 Server Longrun Runner Report

schema: media-server.v390-server-longrun.v1
result: FAIL
durationMinutes: 30
stopOnFirstFail: true
failedPhase: soak-case-loop
failedCase: integrated-smoke
delegatedFailure: integrated-smoke
delegatedFirstFailContractSatisfied: true
failureContext: case=integrated-smoke; rtspPort=8555; httpPort=8081; httpBase=http://127.0.0.1:8081; authMode=off; workDir=/tmp/media_server_predev-1783698547-25839
stderrTail: (none)
reproductionCommand: MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_AUTH_MODE=off ./server.sh test --no-start --skip-external --include-rules  --include-va-events --include-image-analysis --include-redaction
realDurationEvidence: false
longrunEvidenceStatus: real-duration-failed-no-pass-evidence

| phase | status | command | log |
| --- | --- | --- | --- |
| preflight | PASS | validate duration/output-dir/tools | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710154757-23558/server-longrun-30/preflight.log |
| build | PASS | ./server.sh build | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710154757-23558/server-longrun-30/build.log |
| seed | PASS | write /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710154757-23558/server-longrun-30/seed.json | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710154757-23558/server-longrun-30/seed.log |
| start-server | PASS | delegated to verify-predev | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710154757-23558/server-longrun-30/start-server.log |
| integrated-smoke | PASS | delegated to verify-predev integrated-smoke | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710154757-23558/server-longrun-30/integrated-smoke.log |
| soak-case-loop | FAIL | ./server.sh verify-predev --soak-minutes 30 --skip-build --fail-fast --summary-file /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710154757-23558/server-longrun-30/predev-summary.json --report-file /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710154757-23558/server-longrun-30/predev-report.md --report-html-file /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710154757-23558/server-longrun-30/predev-report.html | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710154757-23558/server-longrun-30/soak-case-loop.log |
| runtime-idle | not-run |  |  |
| cleanup | PASS | measured cleanup phase | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710154757-23558/server-longrun-30/cleanup.log |
| report | PASS | report phase | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710154757-23558/server-longrun-30/report.log |

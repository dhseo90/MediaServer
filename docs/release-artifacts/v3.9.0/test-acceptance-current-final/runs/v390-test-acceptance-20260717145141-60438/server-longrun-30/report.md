# v3.9.0 Server Longrun Runner Report

schema: media-server.v390-server-longrun.v2
result: FAIL
durationMinutes: 30
durationClockSource: process.hrtime.bigint-monotonic
durationStartedMonotonicNs: 680296308787833
durationEndedMonotonicNs: 680821623074041
durationElapsedSeconds: 525.314286208
durationEligible: false
iterationLedgerValid: false
iterationCount: 0
stopOnFirstFail: true
failedPhase: integrated-smoke
failedCase: integrated-smoke
delegatedFailure: integrated-smoke
delegatedFirstFailContractSatisfied: true
delegatedPhaseLedgerSchema: media-server.v390-delegated-phase-ledger.v1
delegatedPhaseLedgerValid: true
delegatedPhaseLedgerCount: 11/11
delegatedPhaseLedgerDuplicates: (none)
delegatedPhaseLedgerErrors: (none)
failureContext: case=integrated-smoke; rtspPort=49525; httpPort=49524; httpBase=http://127.0.0.1:49524; authMode=off; workDir=/tmp/media_server_predev-1784300558-77255
stderrTail: (none)
reproductionCommand: MEDIA_SERVER_LISTEN_PORT=49525 MEDIA_SERVER_HTTP_LISTEN_PORT=49524 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_AUTH_MODE=off ./server.sh test --no-start --skip-external --include-rules  --include-va-events --include-image-analysis --include-redaction
realDurationEvidence: false
longrunEvidenceStatus: real-duration-failed-no-pass-evidence
cleanupVerificationSource: pid-port-artifact-before-after-observation
cleanupArtifactBytes: /tmp/media_server_predev-1784300558-77255:114037->0

| phase | status | command | log |
| --- | --- | --- | --- |
| preflight | PASS | validate duration/output-dir/tools | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717145141-60438/server-longrun-30/preflight.log |
| build | PASS | ./server.sh build | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717145141-60438/server-longrun-30/build.log |
| seed | PASS | write /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717145141-60438/server-longrun-30/seed.json | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717145141-60438/server-longrun-30/seed.log |
| start-server | PASS | ./server.sh verify-predev --soak-minutes 30 --skip-build --fail-fast --summary-file /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717145141-60438/server-longrun-30/predev-summary.json --report-file /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717145141-60438/server-longrun-30/predev-report.md --report-html-file /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717145141-60438/server-longrun-30/predev-report.html | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717145141-60438/server-longrun-30/soak-case-loop.log |
| integrated-smoke | FAIL | ./server.sh verify-predev --soak-minutes 30 --skip-build --fail-fast --summary-file /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717145141-60438/server-longrun-30/predev-summary.json --report-file /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717145141-60438/server-longrun-30/predev-report.md --report-html-file /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717145141-60438/server-longrun-30/predev-report.html | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717145141-60438/server-longrun-30/soak-case-loop.log |
| soak-case-loop | not-run |  |  |
| runtime-idle | not-run |  |  |
| runtime-idle | not-run |  |  |
| cleanup | PASS | measured cleanup phase | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717145141-60438/server-longrun-30/cleanup.log |
| report | PASS | report phase | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260717145141-60438/server-longrun-30/report.log |

| delegated parent phase | valid | observed/expected | observed case IDs | errors |
| --- | --- | ---: | --- | --- |
| start-server | true | 1/1 | server-start-queue-256 |  |
| integrated-smoke | true | 1/1 | integrated-smoke |  |
| soak-case-loop | true | 1/1 | soak-case-loop |  |
| runtime-idle | true | 4/4 | main-runtime-idle,server-start-queue-2,event-post-queue,queue-runtime-idle |  |

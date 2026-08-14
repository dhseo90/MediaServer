# v3.9.0 Server Longrun Runner Report

schema: media-server.v390-server-longrun.v2
result: PASS
durationMinutes: 30
durationClockSource: process.hrtime.bigint-monotonic
durationStartedMonotonicNs: 1701252621280791
durationEndedMonotonicNs: 1703633635139541
durationElapsedSeconds: 2381.01385875
durationEligible: true
iterationLedgerValid: true
iterationCount: 22
stopOnFirstFail: true
failedPhase: (none)
failedCase: (none)
delegatedFailure: (none)
delegatedFirstFailContractSatisfied: true
delegatedPhaseLedgerSchema: media-server.v390-delegated-phase-ledger.v1
delegatedPhaseLedgerValid: true
delegatedPhaseLedgerCount: 120/120
delegatedPhaseLedgerDuplicates: (none)
delegatedPhaseLedgerErrors: (none)
failureContext: (none)
stderrTail: (none)
reproductionCommand: (none)
realDurationEvidence: true
longrunEvidenceStatus: real-duration-evidence
cleanupVerificationSource: pid-port-artifact-before-after-observation
cleanupArtifactBytes: /tmp/media_server_predev-1786661150-19163:605065->0

| phase | status | command | log |
| --- | --- | --- | --- |
| preflight | PASS | validate duration/output-dir/tools | ${REPO_ROOT}/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260813223255-11750/server-longrun-30/preflight.log |
| build | PASS | ./server.sh build | ${REPO_ROOT}/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260813223255-11750/server-longrun-30/build.log |
| seed | PASS | write ${REPO_ROOT}/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260813223255-11750/server-longrun-30/seed.json | ${REPO_ROOT}/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260813223255-11750/server-longrun-30/seed.log |
| start-server | PASS | ./server.sh verify-predev --soak-minutes 30 --skip-build --fail-fast --summary-file ${REPO_ROOT}/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260813223255-11750/server-longrun-30/predev-summary.json --report-file ${REPO_ROOT}/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260813223255-11750/server-longrun-30/predev-report.md --report-html-file ${REPO_ROOT}/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260813223255-11750/server-longrun-30/predev-report.html | ${REPO_ROOT}/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260813223255-11750/server-longrun-30/soak-case-loop.log |
| integrated-smoke | PASS | ./server.sh verify-predev --soak-minutes 30 --skip-build --fail-fast --summary-file ${REPO_ROOT}/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260813223255-11750/server-longrun-30/predev-summary.json --report-file ${REPO_ROOT}/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260813223255-11750/server-longrun-30/predev-report.md --report-html-file ${REPO_ROOT}/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260813223255-11750/server-longrun-30/predev-report.html | ${REPO_ROOT}/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260813223255-11750/server-longrun-30/soak-case-loop.log |
| soak-case-loop | PASS | ./server.sh verify-predev --soak-minutes 30 --skip-build --fail-fast --summary-file ${REPO_ROOT}/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260813223255-11750/server-longrun-30/predev-summary.json --report-file ${REPO_ROOT}/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260813223255-11750/server-longrun-30/predev-report.md --report-html-file ${REPO_ROOT}/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260813223255-11750/server-longrun-30/predev-report.html | ${REPO_ROOT}/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260813223255-11750/server-longrun-30/soak-case-loop.log |
| runtime-idle | PASS | ./server.sh verify-predev --soak-minutes 30 --skip-build --fail-fast --summary-file ${REPO_ROOT}/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260813223255-11750/server-longrun-30/predev-summary.json --report-file ${REPO_ROOT}/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260813223255-11750/server-longrun-30/predev-report.md --report-html-file ${REPO_ROOT}/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260813223255-11750/server-longrun-30/predev-report.html | ${REPO_ROOT}/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260813223255-11750/server-longrun-30/soak-case-loop.log |
| cleanup | PASS | measured cleanup phase | ${REPO_ROOT}/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260813223255-11750/server-longrun-30/cleanup.log |
| report | PASS | report phase | ${REPO_ROOT}/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260813223255-11750/server-longrun-30/report.log |

| delegated parent phase | valid | observed/expected | observed case IDs | errors |
| --- | --- | ---: | --- | --- |
| start-server | true | 1/1 | server-start-queue-256 |  |
| integrated-smoke | true | 1/1 | integrated-smoke |  |
| soak-case-loop | true | 110/110 | soak-1-va-events,soak-1-event-post-schema,soak-1-event-post-recovery,soak-1-redaction,soak-1-runtime-idle,soak-2-va-events,soak-2-event-post-schema,soak-2-event-post-recovery,soak-2-redaction,soak-2-runtime-idle,soak-3-va-events,soak-3-event-post-schema,soak-3-event-post-recovery,soak-3-redaction,soak-3-runtime-idle,soak-4-va-events,soak-4-event-post-schema,soak-4-event-post-recovery,soak-4-redaction,soak-4-runtime-idle,soak-5-va-events,soak-5-event-post-schema,soak-5-event-post-recovery,soak-5-redaction,soak-5-runtime-idle,soak-6-va-events,soak-6-event-post-schema,soak-6-event-post-recovery,soak-6-redaction,soak-6-runtime-idle,soak-7-va-events,soak-7-event-post-schema,soak-7-event-post-recovery,soak-7-redaction,soak-7-runtime-idle,soak-8-va-events,soak-8-event-post-schema,soak-8-event-post-recovery,soak-8-redaction,soak-8-runtime-idle,soak-9-va-events,soak-9-event-post-schema,soak-9-event-post-recovery,soak-9-redaction,soak-9-runtime-idle,soak-10-va-events,soak-10-event-post-schema,soak-10-event-post-recovery,soak-10-redaction,soak-10-runtime-idle,soak-11-va-events,soak-11-event-post-schema,soak-11-event-post-recovery,soak-11-redaction,soak-11-runtime-idle,soak-12-va-events,soak-12-event-post-schema,soak-12-event-post-recovery,soak-12-redaction,soak-12-runtime-idle,soak-13-va-events,soak-13-event-post-schema,soak-13-event-post-recovery,soak-13-redaction,soak-13-runtime-idle,soak-14-va-events,soak-14-event-post-schema,soak-14-event-post-recovery,soak-14-redaction,soak-14-runtime-idle,soak-15-va-events,soak-15-event-post-schema,soak-15-event-post-recovery,soak-15-redaction,soak-15-runtime-idle,soak-16-va-events,soak-16-event-post-schema,soak-16-event-post-recovery,soak-16-redaction,soak-16-runtime-idle,soak-17-va-events,soak-17-event-post-schema,soak-17-event-post-recovery,soak-17-redaction,soak-17-runtime-idle,soak-18-va-events,soak-18-event-post-schema,soak-18-event-post-recovery,soak-18-redaction,soak-18-runtime-idle,soak-19-va-events,soak-19-event-post-schema,soak-19-event-post-recovery,soak-19-redaction,soak-19-runtime-idle,soak-20-va-events,soak-20-event-post-schema,soak-20-event-post-recovery,soak-20-redaction,soak-20-runtime-idle,soak-21-va-events,soak-21-event-post-schema,soak-21-event-post-recovery,soak-21-redaction,soak-21-runtime-idle,soak-22-va-events,soak-22-event-post-schema,soak-22-event-post-recovery,soak-22-redaction,soak-22-runtime-idle |  |
| runtime-idle | true | 4/4 | main-runtime-idle,server-start-queue-2,event-post-queue,queue-runtime-idle |  |

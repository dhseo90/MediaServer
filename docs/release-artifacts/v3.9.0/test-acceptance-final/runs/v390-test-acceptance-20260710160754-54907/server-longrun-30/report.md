# v3.9.0 Server Longrun Runner Report

schema: media-server.v390-server-longrun.v1
result: PASS
durationMinutes: 30
stopOnFirstFail: true
failedPhase: (none)
failedCase: (none)
delegatedFailure: (none)
delegatedFirstFailContractSatisfied: true
failureContext: (none)
stderrTail: (none)
reproductionCommand: (none)
realDurationEvidence: true
longrunEvidenceStatus: real-duration-evidence

| phase | status | command | log |
| --- | --- | --- | --- |
| preflight | PASS | validate duration/output-dir/tools | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710160754-54907/server-longrun-30/preflight.log |
| build | PASS | ./server.sh build | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710160754-54907/server-longrun-30/build.log |
| seed | PASS | write /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710160754-54907/server-longrun-30/seed.json | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710160754-54907/server-longrun-30/seed.log |
| start-server | PASS | delegated to verify-predev | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710160754-54907/server-longrun-30/start-server.log |
| integrated-smoke | PASS | delegated to verify-predev integrated-smoke | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710160754-54907/server-longrun-30/integrated-smoke.log |
| soak-case-loop | PASS | ./server.sh verify-predev --soak-minutes 30 --skip-build --fail-fast --summary-file /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710160754-54907/server-longrun-30/predev-summary.json --report-file /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710160754-54907/server-longrun-30/predev-report.md --report-html-file /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710160754-54907/server-longrun-30/predev-report.html | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710160754-54907/server-longrun-30/soak-case-loop.log |
| runtime-idle | PASS | runtime idle delegated to verify-predev cleanup checks | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710160754-54907/server-longrun-30/runtime-idle.log |
| cleanup | PASS | measured cleanup phase | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710160754-54907/server-longrun-30/cleanup.log |
| report | PASS | report phase | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710160754-54907/server-longrun-30/report.log |

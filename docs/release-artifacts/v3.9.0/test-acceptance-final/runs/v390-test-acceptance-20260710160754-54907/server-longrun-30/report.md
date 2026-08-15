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
| preflight | PASS | validate duration/output-dir/tools | <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710160754-54907/server-longrun-30/preflight.log |
| build | PASS | ./server.sh build | <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710160754-54907/server-longrun-30/build.log |
| seed | PASS | write <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710160754-54907/server-longrun-30/seed.json | <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710160754-54907/server-longrun-30/seed.log |
| start-server | PASS | delegated to verify-predev | <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710160754-54907/server-longrun-30/start-server.log |
| integrated-smoke | PASS | delegated to verify-predev integrated-smoke | <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710160754-54907/server-longrun-30/integrated-smoke.log |
| soak-case-loop | PASS | ./server.sh verify-predev --soak-minutes 30 --skip-build --fail-fast --summary-file <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710160754-54907/server-longrun-30/predev-summary.json --report-file <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710160754-54907/server-longrun-30/predev-report.md --report-html-file <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710160754-54907/server-longrun-30/predev-report.html | <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710160754-54907/server-longrun-30/soak-case-loop.log |
| runtime-idle | PASS | runtime idle delegated to verify-predev cleanup checks | <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710160754-54907/server-longrun-30/runtime-idle.log |
| cleanup | PASS | measured cleanup phase | <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710160754-54907/server-longrun-30/cleanup.log |
| report | PASS | report phase | <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710160754-54907/server-longrun-30/report.log |

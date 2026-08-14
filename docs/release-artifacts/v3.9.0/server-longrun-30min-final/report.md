# v3.9.0 Server Longrun Runner Report

schema: media-server.v390-server-longrun.v1
result: PASS
durationMinutes: 30
stopOnFirstFail: true
failedPhase:
failedCase:
realDurationEvidence: true
longrunEvidenceStatus: real-duration-evidence

| phase | status | command | log |
| --- | --- | --- | --- |
| preflight | PASS | validate duration/output-dir/tools | <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/server-longrun-30min-final/preflight.log |
| build | PASS | ./server.sh build | <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/server-longrun-30min-final/build.log |
| seed | PASS | write <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/server-longrun-30min-final/seed.json | <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/server-longrun-30min-final/seed.log |
| start-server | PASS | delegated to verify-predev | <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/server-longrun-30min-final/start-server.log |
| integrated-smoke | PASS | delegated to verify-predev integrated-smoke | <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/server-longrun-30min-final/integrated-smoke.log |
| soak-case-loop | PASS | ./server.sh verify-predev --soak-minutes 30 --skip-build --summary-file <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/server-longrun-30min-final/predev-summary.json --report-file <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/server-longrun-30min-final/predev-report.md --report-html-file <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/server-longrun-30min-final/predev-report.html | <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/server-longrun-30min-final/soak-case-loop.log |
| runtime-idle | PASS | runtime idle delegated to verify-predev cleanup checks | <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/server-longrun-30min-final/runtime-idle.log |
| cleanup | PASS | cleanup phase | <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/server-longrun-30min-final/cleanup.log |
| report | PASS | report phase | <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/server-longrun-30min-final/report.log |

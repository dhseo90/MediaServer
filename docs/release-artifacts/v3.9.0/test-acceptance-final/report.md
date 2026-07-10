# v3.9.0 Test Acceptance Bundle

schema: media-server.v390-test-acceptance-bundle.v1
result: PASS
executionMode: actual
dryRun: false
failedStage:
automatedAcceptanceStatus: executed-with-known-ui-closure-blockers
evidenceBoundary: actual automated acceptance is not Codex in-app manual UI fulltest, published metadata, or release-action evidence

| stage | status | command | log/summary |
| --- | --- | --- | --- |
| preflight | PASS | validate actual bundle inputs | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710083909-44592/preflight.log |
| build | PASS | ./server.sh build | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710083909-44592/build.log |
| feature-gates | PASS | 26 current feature commands |  |
| server-longrun-30 | PASS | ./server.sh verify-v390-server-longrun --duration-minutes 30 --output-dir /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710083909-44592/server-longrun-30 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710083909-44592/server-longrun-30/summary.json |
| ui-automation | PASS | ./server.sh verify-v390-ui-automation --browser-mode playwright --output-dir /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710083909-44592/ui-automation --allow-chrome-fallback=1 | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710083909-44592/ui-automation/summary.json |
| ui-replay | PASS | ./server.sh verify-v390-ui-automation-report --summary /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710083909-44592/ui-automation/summary.json | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710083909-44592/ui-automation/summary.json |
| longrun-120-decision | PASS | evaluate AGENTS 7.6.2 120-minute condition | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710083909-44592/longrun-120-decision.log |
| server-longrun-120 | not-run |  | 120-minute condition not selected; --run-120 not provided |
| cleanup | PASS | validate child cleanup and preserved evidence | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710083909-44592/cleanup.log |
| report | PASS | write acceptance summary/report | /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-final/runs/v390-test-acceptance-20260710083909-44592/report.log |

## Known UI closure blockers

- UI-108 through UI-115 exact case set is not complete
- native free UI automation adapter is not selected
- visible DOM and user-action assertion model is not proven

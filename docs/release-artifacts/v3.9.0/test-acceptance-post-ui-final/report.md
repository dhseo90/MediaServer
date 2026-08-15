# v3.9.0 Test Acceptance Bundle

schema: media-server.v390-test-acceptance-bundle.v1
result: PASS
executionMode: actual
dryRun: false
failedStage:
automatedAcceptanceStatus: eligible
evidenceBoundary: actual automated acceptance is not Codex in-app manual UI fulltest, published metadata, or release-action evidence

| stage | status | command | log/summary |
| --- | --- | --- | --- |
| preflight | PASS | validate actual bundle inputs | <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-post-ui-final/runs/v390-test-acceptance-20260710100233-58896/preflight.log |
| build | PASS | ./server.sh build | <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-post-ui-final/runs/v390-test-acceptance-20260710100233-58896/build.log |
| feature-gates | PASS | 26 current feature commands |  |
| server-longrun-30 | PASS | ./server.sh verify-v390-server-longrun --duration-minutes 30 --output-dir <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-post-ui-final/runs/v390-test-acceptance-20260710100233-58896/server-longrun-30 | <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-post-ui-final/runs/v390-test-acceptance-20260710100233-58896/server-longrun-30/summary.json |
| ui-automation | PASS | ./server.sh verify-v390-ui-automation --browser-mode playwright --output-dir <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-post-ui-final/runs/v390-test-acceptance-20260710100233-58896/ui-automation | <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-post-ui-final/runs/v390-test-acceptance-20260710100233-58896/ui-automation/summary.json |
| ui-replay | PASS | ./server.sh verify-v390-ui-automation-report --summary <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-post-ui-final/runs/v390-test-acceptance-20260710100233-58896/ui-automation/summary.json | <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-post-ui-final/runs/v390-test-acceptance-20260710100233-58896/ui-automation/summary.json |
| longrun-120-decision | PASS | evaluate AGENTS 7.6.2 120-minute condition | <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-post-ui-final/runs/v390-test-acceptance-20260710100233-58896/longrun-120-decision.log |
| server-longrun-120 | not-run |  | 120-minute condition not selected; --run-120 not provided |
| cleanup | PASS | validate child cleanup and preserved evidence | <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-post-ui-final/runs/v390-test-acceptance-20260710100233-58896/cleanup.log |
| report | PASS | write acceptance summary/report | <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-post-ui-final/runs/v390-test-acceptance-20260710100233-58896/report.log |

## Known UI closure blockers

- 없음

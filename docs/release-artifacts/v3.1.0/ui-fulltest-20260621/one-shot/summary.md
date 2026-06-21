# UI Fulltest One-Shot Summary

- schema: media-server.ui-fulltest-one-shot.v1
- runId: ui-fulltest-one-shot-1782053671415-84029
- generatedAt: 2026-06-21T14:54:33.599Z
- result: PASS
- outputDir: /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.1.0/ui-fulltest-20260621/one-shot
- widths: 390,1180
- visualWidths: 320,390,760,1180
- browserMode: in-app
- inAppEvidence: docs/release-artifacts/v3.1.0/ui-fulltest-20260621/in-app-evidence.json
- allowChromeFallback: no
- 30분 predev: not-run
- 120분 predev: not-run
- 120분 runtime console: not-run

## Steps

| step | status | detail | log |
| --- | --- | --- | --- |
| build | SKIPPED | --skip-build |  |
| seed-core | PASS | ./server.sh prepare-manual-ui-fulltest-seed --dry-run --emit-plan /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.1.0/ui-fulltest-20260621/one-shot/core-seed-plan.json --emit-registry-dir /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.1.0/ui-fulltest-20260621/one-shot/core-registry | docs/release-artifacts/v3.1.0/ui-fulltest-20260621/one-shot/seed-core.log |
| seed-auth | PASS | ./server.sh prepare-manual-ui-fulltest-seed --dry-run --emit-plan /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.1.0/ui-fulltest-20260621/one-shot/auth-seed-plan.json --emit-registry-dir /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.1.0/ui-fulltest-20260621/one-shot/auth-registry | docs/release-artifacts/v3.1.0/ui-fulltest-20260621/one-shot/seed-auth.log |
| start-core-ui | PASS | server log: docs/release-artifacts/v3.1.0/ui-fulltest-20260621/one-shot/core-ui.server.log |  |
| core-ui-health | PASS | http://127.0.0.1:18097/health |  |
| diagnostic-log-tail-fixture | PASS | safe log-tail UI pattern appended |  |
| guard-native-dialogs | PASS | ./server.sh verify-product-ui-no-native-dialogs | docs/release-artifacts/v3.1.0/ui-fulltest-20260621/one-shot/guard-native-dialogs.log |
| guard-blocking-dialog-policy | PASS | ./server.sh verify-ui-blocking-dialog-policy | docs/release-artifacts/v3.1.0/ui-fulltest-20260621/one-shot/guard-blocking-dialog-policy.log |
| feature-inventory-coverage | PASS | ./server.sh verify-feature-inventory-coverage | docs/release-artifacts/v3.1.0/ui-fulltest-20260621/one-shot/feature-inventory-coverage.log |
| ops-client-ui | PASS | ./server.sh verify-ops-client-ui --http-base http://127.0.0.1:18097 --debug-port-base 14000 --output-dir /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.1.0/ui-fulltest-20260621/one-shot/ops-client-ui --browser-mode in-app --in-app-evidence docs/release-artifacts/v3.1.0/ui-fulltest-20260621/in-app-evidence.json | docs/release-artifacts/v3.1.0/ui-fulltest-20260621/one-shot/ops-client-ui.log |
| ops-client-ui-screenshots | PASS | ./server.sh verify-ops-client-ui --http-base http://127.0.0.1:18097 --screenshots --visual-widths 320,390,760,1180 --debug-port-base 14200 --output-dir /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.1.0/ui-fulltest-20260621/one-shot/ops-client-ui-screenshots --browser-mode in-app --in-app-evidence docs/release-artifacts/v3.1.0/ui-fulltest-20260621/in-app-evidence.json | docs/release-artifacts/v3.1.0/ui-fulltest-20260621/one-shot/ops-client-ui-screenshots.log |
| rule-ui | PASS | ./server.sh verify-rule-ui --http-base http://127.0.0.1:18097 --debug-port 14500 --output-dir /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.1.0/ui-fulltest-20260621/one-shot/rule-ui --in-app-evidence docs/release-artifacts/v3.1.0/ui-fulltest-20260621/in-app-evidence.json | docs/release-artifacts/v3.1.0/ui-fulltest-20260621/one-shot/rule-ui.log |
| ops-route-boundaries | PASS | ./server.sh verify-ops-route-boundaries --http-base http://127.0.0.1:18097 | docs/release-artifacts/v3.1.0/ui-fulltest-20260621/one-shot/ops-route-boundaries.log |
| ops-rules-roundtrip | PASS | ./server.sh verify-ops-rules-roundtrip --http-base http://127.0.0.1:18097 | docs/release-artifacts/v3.1.0/ui-fulltest-20260621/one-shot/ops-rules-roundtrip.log |
| ops-tables-layout | PASS | ./server.sh verify-ops-tables-layout --http-base http://127.0.0.1:18097 --debug-port-base 14700 --widths 320,390,760,1180 --output-dir /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.1.0/ui-fulltest-20260621/one-shot/ops-tables-layout --in-app-evidence docs/release-artifacts/v3.1.0/ui-fulltest-20260621/in-app-evidence.json | docs/release-artifacts/v3.1.0/ui-fulltest-20260621/one-shot/ops-tables-layout.log |
| ops-click-e2e-core | PASS | ./server.sh verify-ops-click-e2e --http-base http://127.0.0.1:18097 --debug-port-base 15000 --widths 390,1180 --output-dir /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.1.0/ui-fulltest-20260621/one-shot/ops-click-core --in-app-evidence docs/release-artifacts/v3.1.0/ui-fulltest-20260621/in-app-evidence.json | docs/release-artifacts/v3.1.0/ui-fulltest-20260621/one-shot/ops-click-e2e-core.log |
| start-auth-ui | PASS | server log: docs/release-artifacts/v3.1.0/ui-fulltest-20260621/one-shot/auth-ui.server.log |  |
| auth-ui-health | PASS | http://127.0.0.1:18197/health |  |
| ops-click-e2e-auth | PASS | ./server.sh verify-ops-click-e2e --auth-ui-flow --http-base http://127.0.0.1:18197 --debug-port-base 15400 --widths 390,1180 --auth-users-file /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.1.0/ui-fulltest-20260621/one-shot/auth-users.json --output-dir /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.1.0/ui-fulltest-20260621/one-shot/ops-click-auth --in-app-evidence docs/release-artifacts/v3.1.0/ui-fulltest-20260621/in-app-evidence.json | docs/release-artifacts/v3.1.0/ui-fulltest-20260621/one-shot/ops-click-e2e-auth.log |
| manual-ui-result-structure | SKIPPED | --skip-manual-result |  |
| predev-30min | SKIPPED | one-shot UI wrapper does not run verify-predev --soak-minutes 30 |  |
| predev-120min | SKIPPED | one-shot UI wrapper does not run verify-predev --soak-minutes 120 |  |
| runtime-console-120min | SKIPPED | one-shot UI wrapper does not run verify-va-runtime-console-longrun --duration-minutes 120 |  |
| stop-auth-ui | PASS | stopped |  |
| stop-core-ui | PASS | stopped |  |

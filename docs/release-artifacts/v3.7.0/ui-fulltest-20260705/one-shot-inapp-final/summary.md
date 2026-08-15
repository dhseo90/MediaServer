# UI Fulltest One-Shot Summary

- schema: media-server.ui-fulltest-one-shot.v1
- runId: ui-fulltest-one-shot-1783244324767-83262
- generatedAt: 2026-07-05T09:38:48.000Z
- result: PASS
- outputDir: <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.7.0/ui-fulltest-20260705/one-shot-inapp-final
- widths: 390,1180
- visualWidths: 320,390,760,1180
- browserMode: in-app
- inAppEvidence: docs/release-artifacts/v3.7.0/ui-fulltest-20260705/in-app-evidence.json
- allowChromeFallback: no
- 30분 predev: not-run
- 120분 predev: not-run
- 120분 runtime console: not-run

## Steps

| step | status | detail | log |
| --- | --- | --- | --- |
| build | SKIPPED | --skip-build |  |
| seed-core | PASS | ./server.sh prepare-manual-ui-fulltest-seed --dry-run --emit-plan <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.7.0/ui-fulltest-20260705/one-shot-inapp-final/core-seed-plan.json --emit-registry-dir <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.7.0/ui-fulltest-20260705/one-shot-inapp-final/core-registry | docs/release-artifacts/v3.7.0/ui-fulltest-20260705/one-shot-inapp-final/seed-core.log |
| seed-auth | PASS | ./server.sh prepare-manual-ui-fulltest-seed --dry-run --emit-plan <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.7.0/ui-fulltest-20260705/one-shot-inapp-final/auth-seed-plan.json --emit-registry-dir <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.7.0/ui-fulltest-20260705/one-shot-inapp-final/auth-registry | docs/release-artifacts/v3.7.0/ui-fulltest-20260705/one-shot-inapp-final/seed-auth.log |
| start-core-ui | PASS | server log: docs/release-artifacts/v3.7.0/ui-fulltest-20260705/one-shot-inapp-final/core-ui.server.log |  |
| core-ui-health | PASS | http://127.0.0.1:18097/health |  |
| diagnostic-log-tail-fixture | PASS | safe log-tail UI pattern appended |  |
| guard-native-dialogs | PASS | ./server.sh verify-product-ui-no-native-dialogs | docs/release-artifacts/v3.7.0/ui-fulltest-20260705/one-shot-inapp-final/guard-native-dialogs.log |
| guard-blocking-dialog-policy | PASS | ./server.sh verify-ui-blocking-dialog-policy | docs/release-artifacts/v3.7.0/ui-fulltest-20260705/one-shot-inapp-final/guard-blocking-dialog-policy.log |
| feature-inventory-coverage | PASS | ./server.sh verify-feature-inventory-coverage | docs/release-artifacts/v3.7.0/ui-fulltest-20260705/one-shot-inapp-final/feature-inventory-coverage.log |
| ops-client-ui | PASS | ./server.sh verify-ops-client-ui --http-base http://127.0.0.1:18097 --debug-port-base 14000 --output-dir <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.7.0/ui-fulltest-20260705/one-shot-inapp-final/ops-client-ui --browser-mode in-app --in-app-evidence docs/release-artifacts/v3.7.0/ui-fulltest-20260705/in-app-evidence.json | docs/release-artifacts/v3.7.0/ui-fulltest-20260705/one-shot-inapp-final/ops-client-ui.log |
| ops-client-ui-screenshots | PASS | ./server.sh verify-ops-client-ui --http-base http://127.0.0.1:18097 --screenshots --visual-widths 320,390,760,1180 --debug-port-base 14200 --output-dir <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.7.0/ui-fulltest-20260705/one-shot-inapp-final/ops-client-ui-screenshots --browser-mode in-app --in-app-evidence docs/release-artifacts/v3.7.0/ui-fulltest-20260705/in-app-evidence.json | docs/release-artifacts/v3.7.0/ui-fulltest-20260705/one-shot-inapp-final/ops-client-ui-screenshots.log |
| rule-ui | PASS | ./server.sh verify-rule-ui --http-base http://127.0.0.1:18097 --debug-port 14500 --output-dir <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.7.0/ui-fulltest-20260705/one-shot-inapp-final/rule-ui --in-app-evidence docs/release-artifacts/v3.7.0/ui-fulltest-20260705/in-app-evidence.json | docs/release-artifacts/v3.7.0/ui-fulltest-20260705/one-shot-inapp-final/rule-ui.log |
| ops-route-boundaries | PASS | ./server.sh verify-ops-route-boundaries --http-base http://127.0.0.1:18097 | docs/release-artifacts/v3.7.0/ui-fulltest-20260705/one-shot-inapp-final/ops-route-boundaries.log |
| ops-rules-roundtrip | PASS | ./server.sh verify-ops-rules-roundtrip --http-base http://127.0.0.1:18097 | docs/release-artifacts/v3.7.0/ui-fulltest-20260705/one-shot-inapp-final/ops-rules-roundtrip.log |
| ops-tables-layout | PASS | ./server.sh verify-ops-tables-layout --http-base http://127.0.0.1:18097 --debug-port-base 14700 --widths 320,390,760,1180 --output-dir <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.7.0/ui-fulltest-20260705/one-shot-inapp-final/ops-tables-layout --in-app-evidence docs/release-artifacts/v3.7.0/ui-fulltest-20260705/in-app-evidence.json | docs/release-artifacts/v3.7.0/ui-fulltest-20260705/one-shot-inapp-final/ops-tables-layout.log |
| ops-click-e2e-core | PASS | ./server.sh verify-ops-click-e2e --http-base http://127.0.0.1:18097 --debug-port-base 15000 --widths 390,1180 --output-dir <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.7.0/ui-fulltest-20260705/one-shot-inapp-final/ops-click-core --in-app-evidence docs/release-artifacts/v3.7.0/ui-fulltest-20260705/in-app-evidence.json | docs/release-artifacts/v3.7.0/ui-fulltest-20260705/one-shot-inapp-final/ops-click-e2e-core.log |
| start-auth-ui | PASS | server log: docs/release-artifacts/v3.7.0/ui-fulltest-20260705/one-shot-inapp-final/auth-ui.server.log |  |
| auth-ui-health | PASS | http://127.0.0.1:18197/health |  |
| ops-click-e2e-auth | PASS | ./server.sh verify-ops-click-e2e --auth-ui-flow --http-base http://127.0.0.1:18197 --debug-port-base 15400 --widths 390,1180 --auth-users-file <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.7.0/ui-fulltest-20260705/one-shot-inapp-final/auth-users.json --output-dir <workspace>/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.7.0/ui-fulltest-20260705/one-shot-inapp-final/ops-click-auth --in-app-evidence docs/release-artifacts/v3.7.0/ui-fulltest-20260705/in-app-evidence.json | docs/release-artifacts/v3.7.0/ui-fulltest-20260705/one-shot-inapp-final/ops-click-e2e-auth.log |
| manual-ui-result-structure | SKIPPED | --skip-manual-result |  |
| predev-30min | SKIPPED | one-shot UI wrapper does not run verify-predev --soak-minutes 30 |  |
| predev-120min | SKIPPED | one-shot UI wrapper does not run verify-predev --soak-minutes 120 |  |
| runtime-console-120min | SKIPPED | one-shot UI wrapper does not run verify-va-runtime-console-longrun --duration-minutes 120 |  |
| stop-auth-ui | PASS | stopped |  |
| stop-core-ui | PASS | stopped |  |

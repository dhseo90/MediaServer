# v3.9.0 Acceptance First Failure

schema: media-server.v390-acceptance-first-failure.v1
recordedAt: 2026-10-01T05:00:40.459Z
runId: v390-test-acceptance-20261001045321-8453
sourceCommitSha: c41e18913127da24f267d039ea27b57b037e1816
failedStage: feature-gates
testcaseId: script-inventory
error: scripts/internal/verify_v390_finalizer_screenshot_dedup_contract.mjs | [pass] project inventory delegates script file inventory to this verifier | [pass] project inventory maps verifier families without duplicating dispatch details | [pass] CMake does not define a separate untracked CTest registry | [pass] test entry scripts are reachable from test_all | [pass] auth verifier has no hardcoded test password defaults | [pass] VA EventRecord dispatch verifier fails early and dispatches every poll by default | [pass] critical verifier pass output avoids grouped feature-result wording | [pass] user-facing JS option parsers reject unknown options | == Script inventory verification summary == | - pass: 11 | - fail: 1
logPath: /Users/dhseo/Workspace/mediaServer/docs/release-artifacts/v4.1.1/test-acceptance-current-final/runs/v390-test-acceptance-20261001045321-8453/feature-gates-35-script-inventory.log
failedCommand: ./server.sh verify-script-inventory
reproductionCommand: ./test_release.sh
context: scripts/internal/verify_v390_finalizer_screenshot_dedup_contract.mjs | [pass] project inventory delegates script file inventory to this verifier | [pass] project inventory maps verifier families without duplicating dispatch details | [pass] CMake does not define a separate untracked CTest registry | [pass] test entry scripts are reachable from test_all | [pass] auth verifier has no hardcoded test password defaults | [pass] VA EventRecord dispatch verifier fails early and dispatches every poll by default | [pass] critical verifier pass output avoids grouped feature-result wording | [pass] user-facing JS option parsers reject unknown options | == Script inventory verification summary == | - pass: 11 | - fail: 1
childFailurePhase: not-recorded
childFailureCase: not-recorded
childCleanupStatus: not-recorded

## Diagnostic artifact snapshots

### /Users/dhseo/Workspace/mediaServer/docs/release-artifacts/v4.1.1/test-acceptance-current-final/runs/v390-test-acceptance-20261001045321-8453/feature-gates-35-script-inventory.log

bytes: 1552
sha256: b8f16a72f0c994ed60ac4e2e804991a0c3651423d59760cf795ea9f5fb32157f

```text
[pass] dispatch parser recognizes explicit bash and node interpreters
[pass] server.sh dispatch targets exist and are executable
[pass] documented server.sh commands resolve to dispatch table
[fail] tracked scripts are classified and referenced: unclassified or unreferenced script(s):
scripts/internal/recording_current_lifecycle_cache.test.mjs
scripts/internal/recording_forward_probe_verify.test.cjs
scripts/internal/recording_foundation_source_scope.test.mjs
scripts/internal/recording_foundation_suite.test.mjs
scripts/internal/recording_generation_scale.test.mjs
scripts/internal/structure_owner_classification.test.mjs
scripts/internal/v410_s05_service_lifecycle.test.mjs
scripts/internal/verify_recording_checkpoint_io_contract.sh
scripts/internal/verify_recording_generation_request_proof.sh
scripts/internal/verify_recording_status_snapshot.sh
scripts/internal/verify_v390_finalizer_screenshot_dedup_contract.mjs
[pass] project inventory delegates script file inventory to this verifier
[pass] project inventory maps verifier families without duplicating dispatch details
[pass] CMake does not define a separate untracked CTest registry
[pass] test entry scripts are reachable from test_all
[pass] auth verifier has no hardcoded test password defaults
[pass] VA EventRecord dispatch verifier fails early and dispatches every poll by default
[pass] critical verifier pass output avoids grouped feature-result wording
[pass] user-facing JS option parsers reject unknown options
== Script inventory verification summary ==
- pass: 11
- fail: 1
```

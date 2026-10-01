# v3.9.0 Acceptance First Failure

schema: media-server.v390-acceptance-first-failure.v1
recordedAt: 2026-10-01T02:10:24.105Z
runId: v390-test-acceptance-20261001020926-77243
sourceCommitSha: 4434f463e3109dde43b8483ad605ef082d582e0a
failedStage: feature-gates
testcaseId: code-comments
error:   - scripts/internal/verify_v390_image_codec_application_boundary.mjs:55:  // The released session-read/overlay APIs already return ImageCodecFrame. |   - scripts/internal/verify_v390_image_codec_application_boundary.mjs:56:  // Normalize only these two typed handoffs, preserving all quality/error/response bytes. |   - scripts/internal/verify_v390_public_contract_interface_owner.mjs:114:  // This header's purpose comment was added before released v4.1.0 source |   - scripts/internal/verify_v390_public_contract_interface_owner.mjs:115:  // 16f3df711bf02035da22aa1fc2a8720d8162871d. The historical hash above is retained. |   - scripts/internal/verify_v390_public_contract_interface_owner.mjs:121:  // 72c74f4f replaced the blank line with this purpose comment; parser bytes are unchanged. |   - scripts/internal/verify_v390_stable_contract_owner_realignment.mjs:68:// Current successors are fixed bytes from released v4.1.0 source |   - scripts/internal/verify_v390_stable_contract_owner_realignment.mjs:69:// 16f3df711bf02035da22aa1fc2a8720d8162871d, not generated from this working tree. |   - scripts/internal/verify_v390_stable_contract_owner_realignment.mjs:70:// Keep the original Slice 8 expectations above as historical data. | == Code comment policy summary == | - files: 1299 | - missing headers: 20 | - english-only comments: 8
logPath: /Users/dhseo/Workspace/mediaServer/docs/release-artifacts/v4.1.1/test-acceptance-current-final/runs/v390-test-acceptance-20261001020926-77243/feature-gates-01-code-comments.log
failedCommand: ./server.sh verify-code-comments
reproductionCommand: ./test_release.sh
context:   - scripts/internal/verify_v390_image_codec_application_boundary.mjs:55:  // The released session-read/overlay APIs already return ImageCodecFrame. |   - scripts/internal/verify_v390_image_codec_application_boundary.mjs:56:  // Normalize only these two typed handoffs, preserving all quality/error/response bytes. |   - scripts/internal/verify_v390_public_contract_interface_owner.mjs:114:  // This header's purpose comment was added before released v4.1.0 source |   - scripts/internal/verify_v390_public_contract_interface_owner.mjs:115:  // 16f3df711bf02035da22aa1fc2a8720d8162871d. The historical hash above is retained. |   - scripts/internal/verify_v390_public_contract_interface_owner.mjs:121:  // 72c74f4f replaced the blank line with this purpose comment; parser bytes are unchanged. |   - scripts/internal/verify_v390_stable_contract_owner_realignment.mjs:68:// Current successors are fixed bytes from released v4.1.0 source |   - scripts/internal/verify_v390_stable_contract_owner_realignment.mjs:69:// 16f3df711bf02035da22aa1fc2a8720d8162871d, not generated from this working tree. |   - scripts/internal/verify_v390_stable_contract_owner_realignment.mjs:70:// Keep the original Slice 8 expectations above as historical data. | == Code comment policy summary == | - files: 1299 | - missing headers: 20 | - english-only comments: 8
childFailurePhase: not-recorded
childFailureCase: not-recorded
childCleanupStatus: not-recorded

## Diagnostic artifact snapshots

### /Users/dhseo/Workspace/mediaServer/docs/release-artifacts/v4.1.1/test-acceptance-current-final/runs/v390-test-acceptance-20261001020926-77243/feature-gates-01-code-comments.log

bytes: 2514
sha256: e429c431252b6308f275e90a10ee53e0a15fb6b34a9515a28b39cd3a088812d1

```text
[fail] 상단 용도 주석 누락
  - scripts/internal/entry_baseline_report.mjs
  - scripts/internal/entry_baseline_report.test.mjs
  - scripts/internal/feature_manifest_refresh_boundary.test.mjs
  - scripts/internal/feature_manifest_validation.test.mjs
  - scripts/internal/v300_documentation_consumers.test.mjs
  - scripts/internal/v310_v320_documentation_consumers.test.mjs
  - scripts/internal/v400_current_policy.mjs
  - scripts/internal/v400_current_policy.test.mjs
  - scripts/internal/verify_v190_entry_baseline_report.mjs
  - scripts/internal/verify_v210_entry_baseline.mjs
  - scripts/internal/verify_v220_entry_boundary.mjs
  - scripts/internal/verify_v230_entry_baseline.mjs
  - scripts/internal/verify_v400_evidence_ops_policy.mjs
  - scripts/internal/verify_v400_incident_os_policy.mjs
  - scripts/internal/verify_v400_local_ops_policy_freeze.mjs
  - scripts/internal/verify_v400_local_ops_stabilization.mjs
  - scripts/internal/verify_v400_release_readiness.mjs
  - scripts/internal/verify_v400_roadmap_contract.mjs
  - scripts/internal/verify_v400_user_review_gate.mjs
  - scripts/internal/verify_v400_verification_layer_reduction.mjs
[fail] 한글 설명이 없는 주석
  - scripts/internal/verify_v390_image_codec_application_boundary.mjs:55:  // The released session-read/overlay APIs already return ImageCodecFrame.
  - scripts/internal/verify_v390_image_codec_application_boundary.mjs:56:  // Normalize only these two typed handoffs, preserving all quality/error/response bytes.
  - scripts/internal/verify_v390_public_contract_interface_owner.mjs:114:  // This header's purpose comment was added before released v4.1.0 source
  - scripts/internal/verify_v390_public_contract_interface_owner.mjs:115:  // 16f3df711bf02035da22aa1fc2a8720d8162871d. The historical hash above is retained.
  - scripts/internal/verify_v390_public_contract_interface_owner.mjs:121:  // 72c74f4f replaced the blank line with this purpose comment; parser bytes are unchanged.
  - scripts/internal/verify_v390_stable_contract_owner_realignment.mjs:68:// Current successors are fixed bytes from released v4.1.0 source
  - scripts/internal/verify_v390_stable_contract_owner_realignment.mjs:69:// 16f3df711bf02035da22aa1fc2a8720d8162871d, not generated from this working tree.
  - scripts/internal/verify_v390_stable_contract_owner_realignment.mjs:70:// Keep the original Slice 8 expectations above as historical data.
== Code comment policy summary ==
- files: 1299
- missing headers: 20
- english-only comments: 8
```

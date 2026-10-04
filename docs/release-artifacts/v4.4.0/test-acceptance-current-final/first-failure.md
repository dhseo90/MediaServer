# v3.9.0 Acceptance First Failure

schema: media-server.v390-acceptance-first-failure.v1
recordedAt: 2026-10-04T22:03:30.998Z
runId: v390-test-acceptance-20261004220328-82798
sourceCommitSha: a5046c7f1f8a91075229bac48e0315c1a85af13f
failedStage: feature-gates
testcaseId: code-comments
error:   - docs/release-artifacts/v4.4.0/development/actual-ui-normal-1/actual-ui.mjs:16:// Absence, not the value, selects the original short seed in the native preparation. |   - docs/release-artifacts/v4.4.0/development/actual-ui-normal-2/actual-ui.mjs:16:// Absence, not the value, selects the original short seed in the native preparation. |   - docs/release-artifacts/v4.4.0/development/actual-ui-rich-1/actual-ui.mjs:16:// Absence, not the value, selects the original short seed in the native preparation. |   - docs/release-artifacts/v4.4.0/development/actual-ui-rich-2/actual-ui.mjs:16:// Absence, not the value, selects the original short seed in the native preparation. |   - docs/release-artifacts/v4.4.0/development/actual-ui-rich-3/actual-ui.mjs:16:// Absence, not the value, selects the original short seed in the native preparation. |   - scripts/internal/recording_search_playback_smoke.cpp:13:// Full timeline is the unchanged independent oracle, including deleted/unplaced rows. |   - scripts/internal/recording_search_playback_smoke.cpp:118:        // Production B ownership, retired receipts and cold archives, not the legacy A fixture. |   - scripts/internal/recording_search_playback_smoke.cpp:159:                // Bound/deleted rows may use the existing compressed physical envelope. | == Code comment policy summary == | - files: 1433 | - missing headers: 16 | - english-only comments: 9
logPath: /Users/dhseo/Workspace/mediaServer/docs/release-artifacts/v4.4.0/test-acceptance-current-final/runs/v390-test-acceptance-20261004220328-82798/feature-gates-01-code-comments.log
failedCommand: ./server.sh verify-code-comments
reproductionCommand: ./test_release.sh
context:   - docs/release-artifacts/v4.4.0/development/actual-ui-normal-1/actual-ui.mjs:16:// Absence, not the value, selects the original short seed in the native preparation. |   - docs/release-artifacts/v4.4.0/development/actual-ui-normal-2/actual-ui.mjs:16:// Absence, not the value, selects the original short seed in the native preparation. |   - docs/release-artifacts/v4.4.0/development/actual-ui-rich-1/actual-ui.mjs:16:// Absence, not the value, selects the original short seed in the native preparation. |   - docs/release-artifacts/v4.4.0/development/actual-ui-rich-2/actual-ui.mjs:16:// Absence, not the value, selects the original short seed in the native preparation. |   - docs/release-artifacts/v4.4.0/development/actual-ui-rich-3/actual-ui.mjs:16:// Absence, not the value, selects the original short seed in the native preparation. |   - scripts/internal/recording_search_playback_smoke.cpp:13:// Full timeline is the unchanged independent oracle, including deleted/unplaced rows. |   - scripts/internal/recording_search_playback_smoke.cpp:118:        // Production B ownership, retired receipts and cold archives, not the legacy A fixture. |   - scripts/internal/recording_search_playback_smoke.cpp:159:                // Bound/deleted rows may use the existing compressed physical envelope. | == Code comment policy summary == | - files: 1433 | - missing headers: 16 | - english-only comments: 9
childFailurePhase: not-recorded
childFailureCase: not-recorded
childCleanupStatus: not-recorded

## Diagnostic artifact snapshots

### /Users/dhseo/Workspace/mediaServer/docs/release-artifacts/v4.4.0/test-acceptance-current-final/runs/v390-test-acceptance-20261004220328-82798/feature-gates-01-code-comments.log

bytes: 2978
sha256: 62d253f1cd0af2ac6434f146f4ec47a053b5e55cc0da227476c6aed7c89638fd

```text
[fail] 상단 용도 주석 누락
  - docs/release-artifacts/v4.4.0/development/actual-ui-disabled-1/actual-ui.mjs
  - docs/release-artifacts/v4.4.0/development/actual-ui-normal-1/actual-ui.mjs
  - docs/release-artifacts/v4.4.0/development/actual-ui-normal-2/actual-ui.mjs
  - docs/release-artifacts/v4.4.0/development/actual-ui-rich-1/actual-ui.mjs
  - docs/release-artifacts/v4.4.0/development/actual-ui-rich-2/actual-ui.mjs
  - docs/release-artifacts/v4.4.0/development/actual-ui-rich-3/actual-ui.mjs
  - docs/release-artifacts/v4.4.0/development/mixed-preparation/memory-decode-14/diagnostic.cpp
  - docs/release-artifacts/v4.4.0/development/mixed-preparation/memory-history-11/diagnostic.cpp
  - docs/release-artifacts/v4.4.0/development/mixed-preparation/memory-history-12/diagnostic.cpp
  - docs/release-artifacts/v4.4.0/development/mixed-preparation/memory-history-13/diagnostic.cpp
  - docs/release-artifacts/v4.4.0/development/mixed-preparation/mixed-diagnostic.cpp
  - docs/release-artifacts/v4.4.0/development/mixed-preparation/mixed-profile-8/profile.cpp
  - docs/release-artifacts/v4.4.0/development/mixed-preparation/mixed-profile-9/profile.cpp
  - docs/release-artifacts/v4.4.0/development/pr77-cache-boundaries-wrapper-12.py
  - docs/release-artifacts/v4.4.0/development/pr77-cache-boundaries-wrapper-13.py
  - scripts/internal/verify_visual_request_media_cache.py
[fail] 한글 설명이 없는 주석
  - docs/release-artifacts/v4.4.0/development/actual-ui-disabled-1/actual-ui.mjs:16:// Absence, not the value, selects the original short seed in the native preparation.
  - docs/release-artifacts/v4.4.0/development/actual-ui-normal-1/actual-ui.mjs:16:// Absence, not the value, selects the original short seed in the native preparation.
  - docs/release-artifacts/v4.4.0/development/actual-ui-normal-2/actual-ui.mjs:16:// Absence, not the value, selects the original short seed in the native preparation.
  - docs/release-artifacts/v4.4.0/development/actual-ui-rich-1/actual-ui.mjs:16:// Absence, not the value, selects the original short seed in the native preparation.
  - docs/release-artifacts/v4.4.0/development/actual-ui-rich-2/actual-ui.mjs:16:// Absence, not the value, selects the original short seed in the native preparation.
  - docs/release-artifacts/v4.4.0/development/actual-ui-rich-3/actual-ui.mjs:16:// Absence, not the value, selects the original short seed in the native preparation.
  - scripts/internal/recording_search_playback_smoke.cpp:13:// Full timeline is the unchanged independent oracle, including deleted/unplaced rows.
  - scripts/internal/recording_search_playback_smoke.cpp:118:        // Production B ownership, retired receipts and cold archives, not the legacy A fixture.
  - scripts/internal/recording_search_playback_smoke.cpp:159:                // Bound/deleted rows may use the existing compressed physical envelope.
== Code comment policy summary ==
- files: 1433
- missing headers: 16
- english-only comments: 9
```

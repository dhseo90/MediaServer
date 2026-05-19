# English Documentation

This directory is the concise English entry point for the public documentation set.
The detailed working reference is kept in the Korean documents under `docs/`.
Short one-page English mirrors were merged into this index to reduce document
sprawl; use the table below to jump to the detailed source-of-truth page.

## Start Here

| Need | Document |
| --- | --- |
| Project overview | [../../README.en.md](../../README.en.md) |
| Setup and development | [../development-guide.md](../development-guide.md) |
| UI and account views | [../ui-guide.md](../ui-guide.md) |
| Architecture | [../media-server-architecture.md](../media-server-architecture.md) |
| Video analytics | [../video-analysis.md](../video-analysis.md) |
| OC-SORT benchmark/sandbox boundary | [../oc-sort-benchmark-boundary.md](../oc-sort-benchmark-boundary.md) |
| BoT-SORT/DeepSORT research boundary | [../bot-sort-deepsort-research-boundary.md](../bot-sort-deepsort-research-boundary.md) |
| Close-object report archive policy | [../close-object-report-archive-policy.md](../close-object-report-archive-policy.md) |
| Integrator contract artifact | [../integrator-contract-artifact.md](../integrator-contract-artifact.md) |
| Current product boundary, v1.5.0 close-out, v1.6.0 stabilization roadmap, and separate phase candidates | [../development-backlog.md](../development-backlog.md) |
| v1.6.0 release evidence dashboard and `verify-v160-release-evidence-dashboard` status separation | [../v1.6.0-release-evidence-dashboard.md](../v1.6.0-release-evidence-dashboard.md) |
| v1.6.0 stability gate map and `verify-v160-stability-verification-gate` smoke/flaky/longrun separation | [../v1.6.0-stability-verification-gates.md](../v1.6.0-stability-verification-gates.md) |
| v1.6.0 client debug exposure guard and `verify-v160-debug-exposure-regression-guard` redaction checks | [../v1.6.0-debug-exposure-regression-guard.md](../v1.6.0-debug-exposure-regression-guard.md) |
| v1.6.0 tracker/Re-ID opt-in close-out and `verify-v160-tracker-reid-opt-in-closeout` default-off guard | [../v1.6.0-tracker-reid-opt-in-closeout.md](../v1.6.0-tracker-reid-opt-in-closeout.md) |
| v1.6.0 ONVIF field smoke evidence reconciliation and `verify-v160-onvif-field-smoke-evidence-reconciliation` not-run/redaction guard | [../v1.6.0-onvif-field-smoke-evidence-reconciliation.md](../v1.6.0-onvif-field-smoke-evidence-reconciliation.md) |
| Historical v1.2.1 follow-up closure | [../v1.2.1-follow-up-closure.md](../v1.2.1-follow-up-closure.md) |
| v1.3.0 follow-up closure | [../v1.3.0-follow-up-closure.md](../v1.3.0-follow-up-closure.md) |
| v1.4.0 follow-up closure | [../v1.4.0-follow-up-closure.md](../v1.4.0-follow-up-closure.md) |
| v1.5.0 follow-up closure | [../v1.5.0-follow-up-closure.md](../v1.5.0-follow-up-closure.md) |
| Verification | [../stream-verification.md](../stream-verification.md) |
| Distribution policy | [../distribution-policy.md](../distribution-policy.md) |
| Release policy | [../release-policy.md](../release-policy.md) |
| Versioning policy | [../versioning-policy.md](../versioning-policy.md) |
| Public repo checklist | [../public-repo-final-review.md](../public-repo-final-review.md) |
| Backup and restore | [../ops-backup-recovery.md](../ops-backup-recovery.md) |
| Scenario thresholds | [../analysis-threshold-baselines.md](../analysis-threshold-baselines.md) |
| Sample fixture provenance | [../sample-fixture-provenance.md](../sample-fixture-provenance.md) |
| Re-ID default-off research continuation | [../reid-default-off-research-continuation.md](../reid-default-off-research-continuation.md) |
| YouTube import experiment | [../youtube-import.md](../youtube-import.md) |
| Historical manual UI v1.2.1 evidence | [../manual-ui-v1.2.1-result.md](../manual-ui-v1.2.1-result.md) |
| ONVIF no-device and field-smoke boundary | [../onvif-no-device-verification.md](../onvif-no-device-verification.md) |
| Re-ID warning/default-on boundary | [../reid-fixture-default-on-candidates.md](../reid-fixture-default-on-candidates.md) |

## Public Repository Boundary

- The public repository includes Apache-2.0 source code, documentation, configuration examples, scripts, and allowlisted generated fixtures.
- Runtime binaries, YOLO model binaries, customer media, operations evidence, local auth stores, and logs are excluded.
- Only the repository owner should change repository visibility.

## Current Product Boundary

- The current main baseline targets live operations: ONVIF live source support, live source health, and live VA event quality.
- It does not expand Media Server into long-term recording, VMS/NVR, playback/search, or ONVIF Profile G recording/replay scope.
- EventRecord, snapshot, and clip hooks remain short event evidence or diagnostics helpers unless a later phase changes the product boundary.
- The 2026-05-12 close-out completed prerequisite roadmap steps 1-6.
- The 2026-05-13 final local release gate completed 120m predev soak,
  120m runtime-console longrun with a 30m cleanup-idle observation, and
  P1 public/bundle/full-smoke review.
- v1.5.0 is published as the current source-only release. Binary/runtime/model bundles remain excluded from the default release.

## Current Priority Snapshot

| Area | Status | Notes |
| --- | --- | --- |
| v1.5.0 source release | Published | Live-only source minor release boundary is preserved; explicit tracker/Re-ID opt-in stabilization, warning/default-on separation, and follow-up closure are closed; binary/runtime/model bundles are excluded |
| Runtime distribution policy | Done | Source-first policy and bundle guardrails are in place |
| Ops UI stability | Done | Channels/Rules/Users responsive table checks exist |
| v1.1.0 prerequisite roadmap 1-6 | Done | Live-only boundary, ONVIF live source support, source health, VA quality, delivery contract, and multilingual alignment are closed |
| v1.1.0 RC stabilization | Done | Final local longrun/P1 release-gate evidence is closed without rerunning prerequisite roadmap 1-6 |
| v1.2.0 roadmap close-out | Done | ONVIF no-device scope, UI refresh, source health workflow, client polish, account lifecycle, release rehearsal, Re-ID warning guard, and YouTube lab-only decision are documented |
| v1.2.1 patch close-out | Closed locally | Release metadata guard, post-release evidence, manual UI evidence, flaky verifier hardening, Re-ID/ONVIF wording guards, release close-out dry-run, and doc/artifact housekeeping stay inside patch scope; release, external-device, and approval gates remain separate |
| v1.3.0 close-out | Closed | Runtime operations, field integration gates, source health incidents, Client Live accessibility, rule preset quality, audit trail workflow, visual baseline automation, and Re-ID research are closed; follow-up closure leaves Re-ID default-on, tracker replacement, runtime/model bundle, and field sampling automation as later phase gates |
| v1.4.0 close-out | Closed | Rule-level tracker/Re-ID opt-in, Kalman-lite/ByteTrack selection, Re-ID assist fallback, tracker warning summary, and report archive policy are closed; default-on and post-v1.4 benchmark gates remain separate |
| v1.5.0 close-out | Closed | Explicit opt-in guard, Tracker/Re-ID stability matrix, Re-ID provenance/fallback approval, Ops warning next-action copy, audit export masking, field smoke summary evidence boundary, and OC-SORT manifest-only sandbox are closed; remaining candidates are separate phase gates |
| Audit trail operations | Follow-up phase | Server persistence exists; search/export can improve |
| Short event evidence | Supporting | EventRecord/snapshot/clip cleanup exists, but it is not the main product direction |
| RC gate operations | Conditional gate | Repeat longrun only for a new release cut or high-risk media/VA fanout change |
| Client dashboard field polish | Follow-up phase | Preset-driven priority and wording can improve |

## General Follow-Ups

- Use [../development-backlog.md](../development-backlog.md) as the source of truth for the current product boundary and v1.5.0 close-out; use version-specific evidence files only as historical close-out records.
- Close or suppress existing Dependabot major-update PR noise after the policy is documented.
- Add richer English docs only if the public audience grows beyond this consolidated index.
- Attach the latest RC artifacts to release notes when cutting a future tag or GitHub Release.
- Keep signed-token and cleanup checks for evidence bundles scoped to short event evidence.
- Add operator-facing next-action buttons to root-cause diagnostics in a later operator workflow phase.

## Close-Out Rules

- RC work should not reopen VMS/NVR, playback/search, long-term recording, or Profile G scope.
- Real ONVIF network discovery, persistent credential storage, Digest/WS-Security, Profile G, and origin metadata migration are field-integration extensions, not RC blockers.
- Source health is closed at the API/UI/sanitized-client smoke boundary; clients must not receive raw diagnostics.
- Live VA quality is closed at the timeline/debug, TrackHealth grouping, and preset baseline smoke boundary; field-sample retuning is an operational extension.
- Live delivery is closed at the Event POST/WebRTC/SSE/WS contract and smoke-matrix boundary; the v1.2.0 JSON Schema/sample bundle is an integrator-distribution artifact, not a payload mutation.
- Multilingual alignment is represented in this English index plus the Korean source-of-truth documents, not separate short mirror pages.

## Verification Entry Points

```bash
./server.sh verify-docs-links
./server.sh verify-docs-ui-assets
./server.sh verify-release-metadata
./server.sh verify-post-release-reconciliation
./server.sh verify-release-closeout-helper --dry-run --report /tmp/media_server_release_closeout_helper.md
./server.sh verify-integrator-contract-artifact
./server.sh verify-actions-security
./server.sh verify-public-repo-readiness --report /tmp/media_server_public_repo_readiness.md
./server.sh verify-bundle-policy --output /tmp/media_server_bundle_policy.md --json-output /tmp/media_server_bundle_policy.json
./server.sh verify-release-bundle-dry-run
```

## Consolidation Policy

- Keep detailed operational, architecture, verification, and policy content in the Korean `docs/*.md` files.
- Keep only one English docs entry point: this index. Add a new English mirror only when the English page carries standalone decisions that cannot be expressed clearly here or in `README.en.md`.

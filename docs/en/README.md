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
| Integrator contract artifact | [../integrator-contract-artifact.md](../integrator-contract-artifact.md) |
| Current product boundary and v1.2.0 close-out | [../development-backlog.md](../development-backlog.md) |
| Verification | [../stream-verification.md](../stream-verification.md) |
| Distribution policy | [../distribution-policy.md](../distribution-policy.md) |
| Release policy | [../release-policy.md](../release-policy.md) |
| Versioning policy | [../versioning-policy.md](../versioning-policy.md) |
| Public repo checklist | [../public-repo-final-review.md](../public-repo-final-review.md) |
| Backup and restore | [../ops-backup-recovery.md](../ops-backup-recovery.md) |
| Scenario thresholds | [../analysis-threshold-baselines.md](../analysis-threshold-baselines.md) |
| Sample fixture provenance | [../sample-fixture-provenance.md](../sample-fixture-provenance.md) |
| YouTube import experiment | [../youtube-import.md](../youtube-import.md) |

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
- Release tag, main merge, and GitHub Release are manual release actions.

## Current Priority Snapshot

| Area | Status | Notes |
| --- | --- | --- |
| v1.2.0 source release | Close-out | Live-only source release boundary is preserved; binary/runtime/model bundles are excluded |
| Runtime distribution policy | Done | Source-first policy and bundle guardrails are in place |
| Ops UI stability | Done | Channels/Rules/Users responsive table checks exist |
| v1.1.0 prerequisite roadmap 1-6 | Done | Live-only boundary, ONVIF live source support, source health, VA quality, delivery contract, and multilingual alignment are closed |
| v1.1.0 RC stabilization | Done | Final local longrun/P1 release-gate evidence is closed without rerunning prerequisite roadmap 1-6 |
| v1.2.0 roadmap close-out | Done | ONVIF no-device scope, UI refresh, source health workflow, client polish, account lifecycle, release rehearsal, Re-ID warning guard, and YouTube lab-only decision are documented |
| Audit trail operations | Follow-up phase | Server persistence exists; search/export can improve |
| Short event evidence | Supporting | EventRecord/snapshot/clip cleanup exists, but it is not the main product direction |
| RC gate operations | Conditional gate | Repeat longrun only for a new release cut or high-risk media/VA fanout change |
| Client dashboard field polish | Follow-up phase | Preset-driven priority and wording can improve |

## General Follow-Ups

- Use [../development-backlog.md](../development-backlog.md) as the source of truth for the v1.2.0 close-out.
- Close or suppress existing Dependabot major-update PR noise after the policy is documented.
- Add richer English docs only if the public audience grows beyond this consolidated index.
- Attach the latest RC artifacts to release notes when cutting the actual tag or GitHub Release.
- Keep signed-token and cleanup checks for evidence bundles scoped to short event evidence.
- Add operator-facing next-action buttons to root-cause diagnostics in a later operator workflow phase.

## Close-Out Rules

- RC work should not reopen VMS/NVR, playback/search, long-term recording, or Profile G scope.
- Real ONVIF network discovery, SOAP probing, credential persistence, and origin metadata migration are field-integration extensions, not RC blockers.
- Source health is closed at the API/UI/sanitized-client smoke boundary; clients must not receive raw diagnostics.
- Live VA quality is closed at the timeline/debug, TrackHealth grouping, and preset baseline smoke boundary; field-sample retuning is an operational extension.
- Live delivery is closed at the Event POST/WebRTC/SSE/WS contract and smoke-matrix boundary; the v1.2.0 JSON Schema/sample bundle is an integrator-distribution artifact, not a payload mutation.
- Multilingual alignment is represented in this English index plus the Korean source-of-truth documents, not separate short mirror pages.

## Verification Entry Points

```bash
./server.sh verify-docs-links
./server.sh verify-integrator-contract-artifact
./server.sh verify-actions-security
./server.sh verify-public-repo-readiness --report /tmp/media_server_public_repo_readiness.md
./server.sh verify-bundle-policy --output /tmp/media_server_bundle_policy.md --json-output /tmp/media_server_bundle_policy.json
```

## Consolidation Policy

- Keep detailed operational, architecture, verification, and policy content in the Korean `docs/*.md` files.
- Keep only one English docs entry point: this index. Add a new English mirror only when the English page carries standalone decisions that cannot be expressed clearly here or in `README.en.md`.

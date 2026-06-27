# Media Server v3.3.0

## Scope

- Source-only live media server release
- Live Source Reliability Workspace source scope
- Latest published baseline before this release: v3.2.0
- Binary/runtime/model bundle: not included

## Highlights

- Source registry snapshot and identity read model for Ops-only source inspection.
- Source onboarding quality summary for channel validation, duplicate/conflict detection, and readiness hints.
- Reliability timeline and health history for live/stale/offline/reconnect source state changes.
- Incident-to-source correlation context in Ops event review workflows.
- Operator recheck and recovery queue for failed-only rechecks, retry candidates, recovery checklist, dry-run result, and operator notes.
- Client-safe source status digest for viewer-safe live/dashboard/events surfaces.
- Operator runbook and reliability handoff documentation.
- Source reliability search and metrics.
- Ops backup/recovery source handoff using source registry, PublishedView, source health snapshot, and recovery validation plan.

## Verification

- v3.3.0 local readiness gate: PASS. `verify-v330-stabilization-release-readiness` reported `pass=6 fail=0`.
- Build: PASS. `./server.sh build` completed with `Built target media_server`.
- v3.3.0 companion feature verifiers: PASS for Step 1 through Step 10 verifier set recorded in `docs/release-test-records.md`.
- Local release metadata: PASS. `verify-release-metadata` reported current version `3.3.0`, current tag `v3.3.0`, `pass=16 fail=0`.
- Docs and release evidence: PASS. `verify-docs-links` reported failures `0`; `verify-release-evidence-index` reported `pass=8 fail=0`.
- Inventory/script gates: PASS. `verify-project-inventory`, `verify-feature-inventory-coverage`, and `verify-script-inventory` passed in local readiness records.
- Local close-out dry-run: PASS. `verify-release-closeout-helper --dry-run --one-shot-dry-run` reported status `pass`; no tag, push, PR, or release action was executed by the dry-run.
- 30-minute soak: PASS. `verify-predev --soak-minutes 30` final summary reported `status=pass`, `pass=119`, `fail=0`, `skip=1`, `durationSec=2363`, `soakMinutes=30`, `includeRedaction=true`.
- UI fulltest: PASS. Codex in-app browser evidence covered 15 routes, 40 screenshots, 16 interactions, 0 failures, and one-shot wrapper `ui-fulltest-one-shot-1782551961234-500` reported PASS with 20 PASS steps and 5 SKIPPED boundary steps.
- Whitespace check: PASS. `git diff --check` produced no whitespace errors.

## Not Run / Unverified

- PR / GitHub Actions status check: not run. Requires explicit approval for push/PR and CI/check review.
- Release tag / GitHub Release / published metadata: not run. Mark PASS only after tag creation, GitHub Release publication, and `verify-release-metadata --published` execution for the actual release cut.
- 120-minute predev/runtime console: not run. Current AGENTS.md 7.6.2 trigger evidence was not present for this v3.3.0 cut; do not treat 30-minute soak or UI fulltest PASS as a 120-minute PASS.
- External TURN hard gate: skipped in the 30-minute run because `--include-external-turn` was not requested.
- Real ONVIF device field smoke: not run; endpoint/device not provided.
- External TURN/WHEP credential operation: not run; endpoint/credential not provided.
- Real cloud/VLM provider call: not run; credential/provider approval not provided.
- VLM model/runtime bundle: not included in source-only release artifact.
- YouTube real URL relay: not run; external URL field evidence not provided.
- External alert delivery: not run; external destination/credential not provided.

## Evidence

- Release test records: `docs/release-test-records.md`
- Release evidence index: `docs/release-evidence-index.md`
- 30-minute summary: `docs/release-artifacts/v3.3.0/predev-1782548179-72502/summary.json`
- 30-minute report: `docs/release-artifacts/v3.3.0/predev-1782548179-72502/report.md`
- UI in-app evidence: `docs/release-artifacts/v3.3.0/ui-fulltest-20260627/in-app-evidence.json`
- UI one-shot summary: `docs/release-artifacts/v3.3.0/ui-fulltest-20260627/one-shot/summary.json`

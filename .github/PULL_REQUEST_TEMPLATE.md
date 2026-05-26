## Summary

- 

## Scope

- [ ] This PR stays within the stated task scope.
- [ ] User-visible behavior, API schema, event payloads, WebRTC/SSE/WS metadata schema, and RTSP/WebRTC media paths are unchanged unless explicitly requested.
- [ ] If this is a docs-only PR, it does not claim code/UI/API work was implemented.

## Live-only Source Boundary

- [ ] Current live-only/source-only wording follows `docs/development-backlog.md`, `docs/versioning-policy.md`, and `docs/release-policy.md`.
- [ ] VMS/NVR/long-term recording/playback/search/Profile G wording is marked as non-goal, deferred, default-off, debug/developer, or short event evidence.
- [ ] Release/close-out work is not mixed with new implementation phase work such as schema changes, source registry migrations, media path changes, or default-on Re-ID/tracker replacement.
- [ ] Follow-up phase docs are labeled as follow-up phase docs, not alpha.1 completion scope.

## Verification

- [ ] `git diff --check`
- [ ] `./server.sh verify-docs-links` when docs changed
- [ ] `./server.sh verify-docs-ui-assets` when README/UI asset references changed
- [ ] `./server.sh verify-release-closeout-helper --dry-run --report <report.md> --json-report <report.json>` when release/visual baseline readiness changed
- [ ] `./server.sh verify-actions-security --annotations-json <annotations.json>` when GitHub check-runs annotations were reviewed for release evidence
- [ ] `./server.sh verify-ui-visual-artifact-index` when UI screenshot artifact behavior or docs changed
- [ ] `./server.sh verify-ui-release-baseline-approval-log` when release baseline artifact approval docs or workflow gates changed
- [ ] `./server.sh verify-ops-client-ui --screenshots --output-dir <artifact-dir>` when Auth/Ops/Client UI changed
- [ ] `./server.sh write-ui-visual-baseline-comment --diff-report <visual-baseline-diff.json> --output <comment.md>` when adding visual baseline diff results to review
- [ ] `./server.sh write-ui-visual-qa-issue-links --artifact-dir <artifact-dir> --output <artifact-dir>/ui-visual-qa-issue-links.md` when opening a visual QA issue from artifacts
- [ ] `./server.sh ui-visual-artifact-maintenance --artifact-root <artifact-root> --archive-dir <archive-dir> --report <report.json>` before applying visual artifact cleanup
- [ ] `MEDIA_SERVER_VERIFY_AUTH_VISUAL=1 MEDIA_SERVER_VERIFY_AUTH_SCREENSHOTS=1 ./server.sh verify-auth-bootstrap` when auth shell UI changed
- [ ] Additional command(s):

## UI Visual Review

- Artifact directory:
- [ ] `<artifact-dir>/visual-regression-manifest.json` exists and uses schema `media-server.ui-visual-artifact-index.v1`.
- [ ] Manifest includes retention policy schema `media-server.ui-visual-artifact-retention.v1`; PR artifacts use 14 days, release baseline artifacts use 45 days.
- [ ] `<artifact-dir>/index.md` links every screenshot artifact.
- [ ] If this PR creates or replaces a release baseline artifact, Summary links the accepted baseline run, explains the replacement reason, uses `docs/ui-visual-release-baseline-approval-template.md`, and treats the baseline as an approved comparator, not a public release asset or candidate pass proof.
- [ ] 320px, 390px, 760px, and 1180px screenshots were reviewed for nav/account/header/table/action overflow.
- [ ] Client/viewer screenshots do not expose source URL, Developer URL, raw JSON, debug counters, BBox diagnostics, or rule/profile editor controls.
- [ ] If no UI changed, this section is marked not applicable in Summary or Not Run.

## Release / Visual Baseline Readiness

- [ ] Release close-out helper report:
- [ ] JSON report uses visual automation schema `media-server.release-visual-baseline-automation.v1`.
- [ ] Preflight artifact `media-server-release-closeout-helper-dry-run` is available or marked not run.
- [ ] Visual baseline diff/comment artifact `media-server-ui-visual-baseline-diff` is available or marked not run.
- [ ] Visual maintenance dry-run artifact `media-server-ui-visual-maintenance-dry-run` is available or marked not run.
- [ ] Manual release actions, tag, push, GitHub Release, accepted baseline adoption, and screenshot review are not claimed as pass unless actually executed and linked.
- [ ] GitHub Actions warning annotation gate: success check-run warning/failure annotation state is checked or explicitly marked not run; warning/failure annotation is not treated as PASS evidence.

## Not Run

- 

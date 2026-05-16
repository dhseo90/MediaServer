## Summary

- 

## Scope

- [ ] This PR stays within the stated task scope.
- [ ] User-visible behavior, API schema, event payloads, WebRTC/SSE/WS metadata schema, and RTSP/WebRTC media paths are unchanged unless explicitly requested.
- [ ] If this is a docs-only PR, it does not claim code/UI/API work was implemented.

## v1.1.0 Live-only Boundary

- [ ] v1.1.0 live-only wording follows `docs/v1.1.0-roadmap.md`.
- [ ] VMS/NVR/long-term recording/playback/search/Profile G wording is marked as non-goal, deferred, default-off, debug/developer, or short event evidence.
- [ ] Live-only alpha.1 boundary work is not mixed with implementation phase work such as ONVIF API skeletons, SourceRegistry schema changes, Ops UI changes, smoke matrix automation, or state-dump extensions.
- [ ] Follow-up phase docs are labeled as follow-up phase docs, not alpha.1 completion scope.

## Verification

- [ ] `git diff --check`
- [ ] `./server.sh verify-docs-links` when docs changed
- [ ] `./server.sh verify-docs-ui-assets` when README/UI asset references changed
- [ ] `./server.sh verify-ui-visual-artifact-index` when UI screenshot artifact behavior or docs changed
- [ ] `./server.sh verify-ops-client-ui --screenshots --output-dir <artifact-dir>` when Auth/Ops/Client UI changed
- [ ] `./server.sh write-ui-visual-qa-issue-links --artifact-dir <artifact-dir> --output <artifact-dir>/ui-visual-qa-issue-links.md` when opening a visual QA issue from artifacts
- [ ] `MEDIA_SERVER_VERIFY_AUTH_VISUAL=1 MEDIA_SERVER_VERIFY_AUTH_SCREENSHOTS=1 ./server.sh verify-auth-bootstrap` when auth shell UI changed
- [ ] Additional command(s):

## UI Visual Review

- Artifact directory:
- [ ] `<artifact-dir>/visual-regression-manifest.json` exists and uses schema `media-server.ui-visual-artifact-index.v1`.
- [ ] Manifest includes retention policy schema `media-server.ui-visual-artifact-retention.v1`; PR artifacts use 14 days, release baseline artifacts use 45 days.
- [ ] `<artifact-dir>/index.md` links every screenshot artifact.
- [ ] 320px, 390px, 760px, and 1180px screenshots were reviewed for nav/account/header/table/action overflow.
- [ ] Client/viewer screenshots do not expose source URL, Developer URL, raw JSON, debug counters, BBox diagnostics, or rule/profile editor controls.
- [ ] If no UI changed, this section is marked not applicable in Summary or Not Run.

## Not Run

- 

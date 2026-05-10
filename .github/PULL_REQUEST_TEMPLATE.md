## Summary

- 

## Scope

- [ ] This PR stays within the stated task scope.
- [ ] User-visible behavior, API schema, event payloads, WebRTC/SSE/WS metadata schema, and RTSP/WebRTC media paths are unchanged unless explicitly requested.
- [ ] If this is a docs-only PR, it does not claim code/UI/API work was implemented.

## v1.1.0 Live-only Boundary

- [ ] v1.1.0 live-only wording follows `docs/v1.1.0-glossary.md`.
- [ ] VMS/NVR/long-term recording/playback/search/Profile G wording is marked as non-goal, deferred, default-off, debug/developer, or short event evidence.
- [ ] Live-only alpha.1 boundary work is not mixed with implementation phase work such as ONVIF API skeletons, SourceRegistry schema changes, Ops UI changes, smoke matrix automation, or state-dump extensions.
- [ ] Follow-up phase docs are labeled as follow-up phase docs, not alpha.1 completion scope.

## Verification

- [ ] `git diff --check`
- [ ] `./server.sh verify-docs-links` when docs changed
- [ ] `./server.sh verify-docs-ui-assets` when README/UI asset references changed
- [ ] Additional command(s):

## Not Run

- 

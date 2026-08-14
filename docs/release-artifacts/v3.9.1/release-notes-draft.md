# Media Server v3.9.1 Release Notes (Draft)

## Summary

v3.9.1 is a source-only patch release that preserves the published v3.9.0 tag and release while
correcting post-tag repository correctness, public repository hygiene, documentation truth,
bounded release evidence, and representative UI asset currency.

## Correctness Fixes

- Include the v3.9.0 post-tag release-note, evidence-index, closeout-plan, verifier, and fixture
  corrections in the next patch source.
- Keep current source `3.9.1` distinct from the latest published release `v3.9.0` until publication.

## Public Repository Hygiene

- Remove or redact personal absolute paths and reproducible raw runtime artifacts from tracked
  release evidence.
- Extend public-readiness checks to fail closed on denied artifact paths and large tracked text.
- Compact generated JSON fixtures without changing their parsed schema or consumer paths.

## Documentation

- Correct admin/operator user-management wording.
- Align the GStreamer minimum supported version at 1.28.
- Separate public product documentation from internal test, evidence, history, and Superpowers files.
- Refresh and directly review the managed documentation image set against the v3.9.1 source UI.

## Verification

The first clean-clone run against source `7f3e9dc9` passed preflight and build, then stopped at the
`v390-stabilization-release-readiness` feature gate because its accepted Step 20 status vocabulary
had not followed the truthful v3.9.0 `release close-out 완료` state. After that correction, the
second clean-clone run against source `63d59839` again passed preflight and build, then stopped at
the historical `v390-entry-baseline` gate because it still required the current source to equal
`3.9.0`. Both runs stopped before the 30-minute, actual-browser UI fulltest/Policy v4, and
120-minute stages. Both failed clones were removed after their primary failure and later-not-run
states were recorded. Fresh PASS evidence remains pending the historical/current-source boundary
correction, a source commit, and a complete clean-clone rerun.

## Not Run / Excluded

- External TURN/WHEP, ONVIF real-device, and cloud VLM provider field smokes remain conditional on
  explicit endpoints, credentials, devices, and execution approval.
- Commit, push, PR, main merge, signed tag, and GitHub Release actions remain not run until their
  individual user approvals.

## Source-only Scope

This release does not include binary, runtime, model, container, or offline bundles. It does not
change feature logic, public API schemas, event payloads, metadata schemas, or RTSP/WebRTC media
paths.

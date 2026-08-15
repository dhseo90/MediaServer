# Media Server v3.9.1 Release Notes (Draft)

## Summary

v3.9.1 is a source-only patch release that preserves the published v3.9.0 tag and release while
correcting post-tag repository correctness, public repository hygiene, documentation truth,
bounded release evidence, and representative UI asset currency.

## Correctness Fixes

- Include the v3.9.0 post-tag release-note, evidence-index, closeout-plan, verifier, and fixture
  corrections in the next patch source.
- Keep current source `3.9.1` distinct from the latest published release `v3.9.0` until publication.
- Prepare the Git-ignored YOLO model and canonical COCO labels before the zero-option test launchers
  delegate to build, long-run, UI, or release acceptance. The model download is pinned to an exact
  URL and SHA-256 and is published atomically only after digest verification.
- Rebind Policy v4 canonical/visual/current UI evidence to current source `3.9.1`. A sixth
  clean-clone run passed 30-minute `118/0/2` and exact UI `424/424`, then crashed in
  qualification because the canonical manifest still said `3.9.0` and the reason census threw
  instead of failing closed. The census now classifies `canonical-case-manifest-version-mismatch`
  and returns a structured fail-closed result for unknown reasons. The Policy v4 contract
  fixture still hardcodes `sourceBinding.version=3.9.0`; changing that file requires a
  SAFE-202/OPS-169 REVIEW4 digest rebind and is left for a follow-up. Fresh UI qualification
  PASS remains pending a clean-commit rerun.

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

Five clean-clone attempts are preserved as failures rather than promoted to PASS. The first two
stopped after build at stale v3.9.0 readiness and historical-current entry gates. The third proved
that a loopback `EPERM` was a sandbox limitation, and the fourth stopped because a local clone origin
was not a GitHub repository URL. With those environment boundaries corrected, the fifth attempt on
source `6f9ad88e` passed preflight, build, and all 36 feature gates. Its 30-minute integrated smoke
then stopped after 417 seconds because the clean clone correctly excluded `models/yolo11n.onnx`.
Eight codec/media paths passed, while YOLO/VA overlay, redaction, VA events, and image analysis
failed on the missing model. UI fulltest/Policy v4 and 120 minutes remained not run. The launcher
now owns checksum-bound AI asset preparation. Its contract passed 22/22, and a direct default-URL
bootstrap downloaded the 10.4 MB model and verified the pinned model/label digests and 80 labels;
the temporary root was removed. Fresh full-test PASS evidence remains pending a clean commit and a
complete clean-clone rerun.

## Not Run / Excluded

- External TURN/WHEP, ONVIF real-device, and cloud VLM provider field smokes remain conditional on
  explicit endpoints, credentials, devices, and execution approval.
- Commit, push, PR, main merge, signed tag, and GitHub Release actions remain not run until their
  individual user approvals.

## Source-only Scope

This release does not include binary, runtime, model, container, or offline bundles. It does not
change feature logic, public API schemas, event payloads, metadata schemas, or RTSP/WebRTC media
paths.

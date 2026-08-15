# Media Server v3.9.1

Status: unpublished source notes. Latest GitHub Release remains
[v3.9.0](https://github.com/dhseo90/MediaServer/releases/tag/v3.9.0).

## Summary

v3.9.1 is a source-only patch release. It keeps the v3.9.0 product baseline and
corrects post-tag repository correctness, public hygiene, documentation truth,
bounded release evidence, test asset bootstrap, and Policy v4 current-source
version binding.

## Changes

- Include v3.9.0 post-tag note, evidence-index, close-out, verifier, and fixture
  corrections in the patch source.
- Prepare the Git-ignored YOLO model and canonical COCO labels before zero-option
  test launchers run. The model URL and SHA-256 are pinned; files are published
  only after digest verification.
- Bind Policy v4 current-source fixtures to token `current` resolved from
  `VERSION`, so later patch bumps do not need JSON version edits. Unknown
  qualification reasons fail closed instead of throwing.

## Verification

GitHub clean-clone `./test_release.sh` on source `2882bb35`:

- launcher contract `22/0`
- 36 feature gates PASS
- 30-minute longrun `118 PASS / 0 FAIL / 2 skip`
- exact UI `424/424`, Policy v4 `uiFulltestPass=true`, qualified `424/424`
- 120-minute longrun `448 PASS / 0 FAIL / 2 skip` after 7.6.2 media-path triggers
- cleanup and final integrity PASS

The two longrun skips are parent `--skip-build` and `external-turn-hard-gate`
without `--include-external-turn`.

## Not Run / Excluded

- Real ONVIF device field smoke
- STUN/TURN and external TURN field operation
- Cloud VLM/provider calls
- Codex in-app manual UI (Policy v4 qualified automation covered exact 424)

## Source-only Scope

This release does not include binary, runtime, model, container, or offline
bundles. It does not change feature logic, public API schemas, event payloads,
metadata schemas, or RTSP/WebRTC media paths.

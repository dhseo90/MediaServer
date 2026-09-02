# Media Server v4.0.0

> Release candidate document. This is not a published GitHub Release.
> Latest published GitHub Release remains v3.9.1.

## Summary

v4.0.0 is a source-only major release candidate for Local Operations Policy and
Stabilization. It freezes the supported local-operations boundary and improves the
operator-facing test result handoff without adding a new product feature surface.

The current candidate must include compact test handoff commit
`09436674028817befcecbe1398348489e7ae88a7` or a descendant. Product UI, feature
logic, public API schemas, event payloads, metadata schemas, and RTSP/WebRTC media
paths are unchanged from the published v3.9.1 product baseline.

## Changes

- Freeze action writes, persistent credential storage, production restore,
  external VLM provider calls, and model-backed Re-ID as unimplemented write paths
  in v4.0.0.
- Keep `/ops/events` as an Ops-only diagnostic/direct route without a new event
  type or storage format.
- Keep EventRecord, clip, and retention behavior opt-in and non-VMS. Default-on
  evidence storage remains outside v4.0.0.
- Keep the 986-feature / 424-UI-case verification ceiling and continue separating
  verifier/coverage PASS from actual execution PASS.
- Add `test-run-summary.json` to the 30-minute, 120-minute, UI, and release launchers.
  On failure, add compact `failure-handoff.json` and `.md` files containing the
  first failure, reproduction command, log location, and later not-run items.
- Correct the shared launcher result boundary so server-only longrun PASS does not
  incorrectly require UI evidence. UI and release suites continue to fail closed
  when their canonical UI summary is absent.

## Verification Status

- Compact result/handoff contract: PASS, `26/26`.
- Acceptance bundle contract: PASS, `37/37`.
- Server longrun runner contract: PASS, `9/9`.
- Historical 30-minute soak: PASS on source `b53e8af1`, runId
  `v390-server-longrun-20260830123921-36621`. This predates the current candidate
  boundary and is not the fresh release-cut result.
- Historical UI fulltest: PASS on source `166fb478`, exact `424/424`, Policy v4
  `uiFulltestPass=true`. This predates the current candidate boundary and is not
  the fresh release-cut result.
- Fresh 30-minute soak: not run; required before release action.
- Fresh UI fulltest: not run; required before release action.
- 120-minute soak: conditional-not-run. It becomes required only when the AGENTS
  7.6.2 trigger or an explicit release requirement applies.

## Not Run / Excluded

- PR and main merge: not run
- Signed annotated `v4.0.0` tag: not created
- GitHub Release creation/update: not run
- `verify-release-metadata --published`: not run
- Real ONVIF device, external TURN/WHEP, and cloud/VLM provider field smoke: not run
- Binary, runtime, model, container, and offline bundles: not included

Do not publish this candidate or describe v4.0.0 as released until the fresh
30-minute and UI fulltests pass and each separately authorized release action is
completed.

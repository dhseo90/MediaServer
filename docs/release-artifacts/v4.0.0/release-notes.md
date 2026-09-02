# Media Server v4.0.0

## Summary

v4.0.0 is a source-only major release for Local Operations Policy and
Stabilization. It freezes the supported local-operations boundary and improves the
operator-facing test result handoff without adding a new product feature surface.

This release includes compact test handoff commit
`09436674028817befcecbe1398348489e7ae88a7` or a descendant. It adds no new
product surface and does not change public API schemas, event payloads, metadata
schemas, or RTSP/WebRTC media paths from the previous published v3.9.1 product
baseline.

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
- Complete English localization coverage for existing operator UI labels and
  dynamic status patterns without adding or rearranging product controls.

## Verification Status

- Compact result/handoff contract: PASS, `26/26`.
- Acceptance bundle contract: PASS, `37/37`.
- Server longrun runner contract: PASS, `9/9`.
- Fresh 30-minute soak: PASS on clean source
  `b96f74ab1809c46f5ee49c8dd1fb075d7bbc392b`, runId
  `v390-server-longrun-20260902105027-50646`, 2381s/1800s, 20 iterations,
  compact `117 PASS / 0 FAIL / 2 NOT-RUN`, cleanup PASS.
- Fresh UI fulltest: PASS on the same clean source, runId
  `v390-test-acceptance-20260902113505-82611`, exact `424/424`, failure census 0,
  Policy v4 PASS with `uiFulltestPass=true`, final integrity and cleanup PASS.
- 120-minute soak: conditional-not-run. It becomes required only when the AGENTS
  7.6.2 trigger or an explicit release requirement applies.

## Not Run / Excluded

- Real ONVIF device, external TURN/WHEP, and cloud/VLM provider field smoke: not run
- Binary, runtime, model, container, and offline bundles: not included

The signed tag, GitHub Release, and published metadata are verified as external
release evidence and are not inferred from this repository note alone.

# Media Server v3.9.0 Release Notes (Draft)

v3.9.0 completes the source-only feature inventory from earlier 3.x releases, stabilizes the
Ops/Client product structure, and makes the UI acceptance path reproducible from a clean checkout.
This draft becomes publishable only after the full release acceptance, PR checks, main merge, signed
tag, and GitHub Release steps are complete.

## Highlights

- Completed the v3.9 feature inventory with explicit source, route, control, action, verifier, and
  long-run ownership for 986 feature rows.
- Consolidated the Ops incident workflow across EventRecord, source health, audit, review, action
  readiness, and client-safe projections.
- Preserved source-only distribution: runtime/model bundles, long-term recording, VMS/NVR, broad
  archive playback, and default-on external AI providers remain outside the public release.
- Rebased the canonical UI runner around capture-only browser callbacks, post-case lifecycle
  evaluation, case isolation, exact request/response identity, and deterministic cleanup evidence.
- Added Policy v4 evidence qualification and final-integrity binding for the exact 424-case UI suite.

## Verified So Far

| Area | Result | Binding |
| --- | --- | --- |
| Static and clean-checkout verification | PASS | verification commit `47582fea7e7fad2c5ef06caf86d9ef6901fd5939` |
| Canonical UI actual | `424/424 PASS` | `./test_ui.sh`, actual browser execution |
| Policy v4 | eligible, qualified `424/424` | same UI run and source binding |
| UI cleanup/final integrity | PASS | PID, ports, runtime root, current run, manifest, and build binding |

## Release Gates Still Pending

- Promote the verified commit to `v3.9.0` and run `./test_release.sh` from the clean release branch.
- Complete the required 30-minute run and the triggered 120-minute run on the same release source.
- Preserve the final acceptance evidence under `docs/release-artifacts/v3.9.0/`.
- Complete PR checks, main merge, signed tag verification, GitHub Release publication, and published
  metadata verification.

## Excluded or Conditional Validation

- External TURN/WHEP endpoints, real ONVIF devices, cloud VLM providers, and customer credentials are
  not bundled and are not claimed as verified without explicit field environments.
- Binary, GStreamer runtime, model bundles, customer media, operational logs, and auth stores are not
  release assets for this source-only release.

## Upgrade Notes

- The source version is `3.9.0`; the latest published baseline remains `v3.8.0` until publication.
- Existing Event POST, WebRTC DataChannel, SSE/WS metadata, and RTSP/WebRTC contracts remain governed
  by their compatibility verifiers and release evidence.
- Operators should review `docs/config-reference.md`, `docs/ui-guide.md`, and
  `docs/stream-verification.md` before deployment.

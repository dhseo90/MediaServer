# Media Server v3.9.0 Release Notes (Draft)

v3.9.0 completes the source-only feature inventory from earlier 3.x releases, stabilizes the
Ops/Client product structure, and makes the UI acceptance path reproducible from a clean checkout.
Full release acceptance is complete. This draft becomes publishable after PR checks, main merge,
the signed tag, and the GitHub Release steps are complete.

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
| Static and clean-checkout verification | PASS | source `c6b3d20a778a7a641e44decadd1ee5b416426650` |
| 30-minute longrun | PASS | `118 PASS / 0 FAIL / 2 skip`, 22 soak iterations |
| Canonical UI actual | `424/424 PASS` | actual browser execution, fail/not-run/unsupported `0/0/0` |
| Policy v4 | PASS | eligible and qualified `424/424`; no unapproved console response |
| 120-minute longrun | PASS | `443 PASS / 0 FAIL / 2 skip`, 87 soak iterations |
| Cleanup/final integrity | PASS | cleanup PASS, final integrity `12/12`, final evidence eligible |
| Evidence retention | PASS | 80-file/11.4MiB bounded canonical package; generated 309MB per-case detail excluded from Git |

## Release Gates Still Pending

- Complete PR checks and merge `v3.9.0` into `main`.
- Create and verify the signed `v3.9.0` tag, publish the source-only GitHub Release, and run published
  metadata verification.
- Remove obsolete v3.9 temporary branches only after their commits are proven reachable from the
  merged release history.

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

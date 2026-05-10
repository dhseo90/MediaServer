# Release Policy

Detailed Korean policy: [../release-policy.md](../release-policy.md)
Version meaning is tracked in [versioning-policy.md](./versioning-policy.md).

## Default Release Scope

- The default release contains source code and documentation only.
- GitHub-generated source archives are acceptable.
- Do not upload binary/runtime/model bundles by default.
- Do not include FFmpeg, FFprobe, libav*, x264/x265, GStreamer GPL-risk plugins, ONNX Runtime packages, or YOLO model binaries.
- Do not include auth stores, logs, snapshots, evidence bundles, customer media, or field videos.

## Tag Strategy

- Use semantic version tags only after public readiness checks pass.
- Recommended first public tag: `v1.0.0`.
- `v1.0.0` is a source-only public baseline. It does not mean binary/runtime/model bundle operations are complete.
- Treat route/API/config/schema migrations as `v2.0.0` candidates.
- Source-only releases must not attach generated sample packs, model files, or runtime bundles.

## Required Checks

```bash
./server.sh verify-public-repo-readiness --report /tmp/media_server_public_repo_readiness.md
./server.sh verify-bundle-policy --output /tmp/media_server_bundle_policy.md --json-output /tmp/media_server_bundle_policy.json
./server.sh source-offer-checklist --stable --bundle-policy-report /tmp/media_server_bundle_policy.json
```

## Actions Policy

The repository requires `Preflight / static-gates` and `Licensing and Artifact Guardrails / guardrails` on `main`.

`verify-actions-security` currently allows only official `actions/*@v4`, SHA-pinned external actions, or local actions. A Dependabot PR that proposes a major Actions update is expected to fail Preflight until the policy is reviewed.

## Release Note Template

```markdown
# Media Server v1.0.0

## Scope

- Source and documentation release baseline
- Binary/runtime/model bundle: not included

## Live-only Scope

- Live media relay and live VA event focus
- ONVIF/source health/VA event/delivery contract work is phase-scoped
- EventRecord/snapshot/clip: short event evidence helper, not the main product message

## Non-goals

- VMS/NVR/long-term recording/playback/search: not included
- ONVIF Profile G recording/replay: not included
- Recorded evidence API as primary integration contract: not included

## Verification

- Preflight: pass
- Licensing and Artifact Guardrails: pass
- verify-public-repo-readiness: pass
- verify-bundle-policy: pass

## Notes

- FFmpeg/GStreamer runtime is a user-installed dependency.
- YOLO model files are not release assets.
- Sample videos are generated verification fixtures.

## Known Limitations

- RC longrun verification is workflow_dispatch-only.
```

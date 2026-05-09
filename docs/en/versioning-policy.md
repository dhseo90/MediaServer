# Versioning Policy

Detailed Korean policy: [../versioning-policy.md](../versioning-policy.md)

This document defines what a Media Server version means.

## Current Baseline

- Current baseline version: `v1.0.0`
- Keep the root `VERSION` file and the `project(... VERSION ...)` value in `CMakeLists.txt` synchronized.
- `v1.0.0` is a source-only public baseline.

## Included in `v1.0.0`

- Apache-2.0 source code
- Documentation, sample configuration, and verification scripts
- Allowlisted generated sample fixtures
- RTSP/WebRTC relay, Ops/Client UI, Auth/Role/Scope, Rule/Profile/Scenario, and first-pass EventRecord/evidence features
- Public readiness checks, Actions checks, and license/artifact guardrails

## Not Included in `v1.0.0`

- FFmpeg/GStreamer/ONNX Runtime/YOLO model binary bundles
- Container images, offline packages, or app bundles
- Customer or field media, operations evidence, auth stores, or logs
- Long-term operations SLA, external TURN credential operations, or VMS/NVR-style long-term recording
- Legal/distribution approval for runtime-included binary releases

## Semantic Versioning

- `PATCH`: documentation, tests, bug fixes, UI copy, or guardrail changes that keep public APIs and configuration compatible
- `MINOR`: backward-compatible source types, rules, UI features, or operations features
- `MAJOR`: route/API/config/schema, registry, auth/scope, or evidence storage changes that require user migration

## Tags and Releases

- The first public source-only tag is `v1.0.0`.
- Tag only a `main` commit that passes public readiness, bundle policy, and required Actions checks.
- Do not attach sample packs, model files, or runtime binaries to source-only releases.
- Treat binary/container/offline bundles as separate release candidates with their own bundle policy review.

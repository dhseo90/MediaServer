# Integrator Contract Artifact Sample Bundle

This synthetic bundle is the v1.9.0 integrator-facing reference for current
live Event POST, WebRTC DataChannel, SSE runtime metadata, and WebSocket runtime
metadata contracts.

Use the files in this order:

1. Read `manifest.json` for the artifact schema, scope, contract identifiers,
   and required verification commands.
2. Read `field-index.json` for the pinned top-level fields and fields that must
   stay out of integrator-visible payloads.
3. Validate example payloads in `samples/` against the matching JSON Schema in
   `schemas/`.
4. Read `freeze-baseline.json` for the v2.0.0 entry freeze gate SHA-256 pins.
5. Before changing any payload field, complete `schema-review-checklist.md`.

This bundle does not define a new API and does not change runtime payloads. It
contains only synthetic sample data. Do not add customer media references, local
network source locators, endpoint userinfo, credentials, token hashes, or raw
debug payloads.

Artifact-only verification:

```bash
./server.sh verify-integrator-contract-artifact
```

Runtime delivery verification is separate and must be reported only when the
delivery smoke commands are actually executed.

The v2.0.0 entry freeze gate is intentionally artifact-only. A SHA-256 drift in
`freeze-baseline.json` means the contract/schema sample or source contract doc
changed and needs schema review before v2.0.0 feature work continues.

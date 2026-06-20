# v3.0/v3.1 Event Evidence Search Roadmap Design

## Status

This design records the approved roadmap direction for v3.0.0 and v3.1.0.
It is a planning artifact, not implementation evidence. No step in this
document is complete until the code, UI, verifier, and release evidence for
that step exist and pass their own checks.

## Product Direction

MediaServer remains a live stream and operations dashboard project. The 3.x
line should not become a VMS/NVR product. The 3.x roadmap therefore centers on
event evidence, searchable non-identifying features, and operator review rather
than always-on recording or broad archive playback.

The selected approach is `Event Evidence Search MVP`:

- Live VA, Rule, and Scenario events remain the trigger.
- Event evidence is captured from a bounded rolling frame cache.
- `eventFrame` is always retained as the trigger-time evidence.
- `representativeImage` is retained only when a better VLM input frame exists.
- `bboxCrop` and pre/event/post `frameBundle` context are retained for review.
- Every evidence image maps back to a `FrameRef`.
- VLM/LLM prompts and raw responses are not durably stored.
- Only structured, non-identifying feature data is retained.
- `/ops/events` is the primary product surface.

## Alternatives Reviewed

### 1. Event Evidence Search MVP

This is the selected path. It produces a user-visible operations workflow
without expanding into always-on video recording. It builds on existing
EventRecord, snapshot/clip hook, VLM observation sidecar, and incident memory
foundations.

### 2. Conservative Foundation

This would implement only schema, storage, and verifier foundations while
keeping UI and search as previews. It has lower product risk, but the release
would feel incomplete because operators could not naturally find incidents.

### 3. Archive/Playback Expansion

This would include encoded clips, richer playback, and broader archive APIs in
v3.0.0. It has higher product impact, but it risks pulling the project toward
VMS/NVR scope. This becomes the v3.1.0 expansion path instead.

## v3.0.0 Roadmap

Goal:

```text
Create searchable event evidence bundles and non-identifying VLM features from
live VA events, then let operators find incidents and inspect source frames in
/ops/events.
```

### Scope

Included:

- Event-centered evidence storage.
- Required event frame.
- Optional representative image.
- Bbox crop and pre/event/post frame bundle.
- FrameRef contract for source/channel/stream epoch/frame/time mapping.
- Extensible VLM feature schema.
- Non-identifying visual feature policy.
- Feature-only durable retention.
- Background-first VLM feature queue with lazy fallback.
- Strict structured output.
- Natural-language query conversion into a limited Search DSL.
- Text/tags/filter search.
- `/ops/events` search and detail UI.
- Default 7-day retention with pin support and operator-configurable limits.

Excluded:

- 24/7 recording.
- VMS/NVR archive API.
- Encoded MP4/WebM event clip.
- Face recognition, identity matching, watchlists, or face embeddings.
- Raw LLM/VLM prompt or raw provider response retention.
- Client/viewer exposure.
- Default vector search.
- Cloud provider default-on behavior.

### Steps

| Step | ID | Priority | Name | Deliverable |
| --- | --- | --- | --- | --- |
| 0 | V300-S00 | P0 | v3.0 baseline alignment | Version, docs, backlog, and source roadmap alignment for v3.0 work. |
| 1 | V300-S01 | P0 | Event Evidence Contract | EvidenceManifest, FrameRef, retention lifecycle, and non-VMS boundaries. |
| 2 | V300-S02 | P0 | Frame Bundle Extraction | Required event frame, optional representative image, bbox crop, and frame bundle manifest. |
| 3 | V300-S03 | P0 | Feature Schema and Privacy Policy | Extensible namespaces, non-identifying features, identity prohibition. |
| 4 | V300-S04 | P0 | VLM Feature Queue | Background queue, lazy trigger, VLM-only failure isolation. |
| 5 | V300-S05 | P0 | Feature-only Retention | Raw prompt/response non-retention, feature revision and reanalysis policy. |
| 6 | V300-S06 | P0 | Search DSL and Query Convert | Natural language to constrained Search DSL, text/tags/filter search. |
| 7 | V300-S07 | P1 | Feature/Search Index | Search across EventRecord, FeatureSet, EvidenceManifest, and operator review state. |
| 8 | V300-S08 | P1 | Ops Events UI | `/ops/events` search, evidence timeline, feature reasons, retry, pin, and retention status. |
| 9 | V300-S09 | P1 | Retention/Pin/Cleanup | Configurable retention, pin exclusion, cleanup dry-run, lifecycle delete, audit. |
| 10 | V300-S10 | P0 | Stabilization and Release Readiness | Build/docs/verifier/UI evidence boundaries and release readiness records. |

## v3.1.0 Roadmap

Goal:

```text
Expand the v3.0 evidence/search foundation with encoded event clips, safe
sharing, scoped integration, operator correction, and optional vector search.
```

### Scope

Included:

- Encoded event clip contract and generation.
- Playback/replay timeline in `/ops/events`.
- FrameRef/PTS mapping between frame bundle and encoded clip.
- Client-safe event digest.
- Scoped integrator search API.
- Operator feature correction and aliases.
- Optional vector/embedding index.
- Encoded clip lifecycle cleanup and export hardening.

Excluded:

- 24/7 recording.
- VMS/NVR archive API.
- Face recognition, identity matching, watchlists, or face embeddings.
- Raw prompt/response retention.
- Full internal feature/provenance exposure to clients.
- Automatic rule application.
- Cloud provider default-on behavior.

### Steps

| Step | ID | Priority | Name | Deliverable |
| --- | --- | --- | --- | --- |
| 0 | V310-S00 | P0 | v3.1 baseline alignment | Version, docs, backlog, and source roadmap alignment for v3.1 work. |
| 1 | V310-S01 | P0 | Encoded Event Clip Contract | MP4/WebM clip manifest, FrameRef/PTS mapping, non-VMS boundary. |
| 2 | V310-S02 | P0 | Event Clip Encoder Pipeline | Encoded clip generation from frame bundle or bounded short segments, queue/status/cleanup. |
| 3 | V310-S03 | P0 | Replay Timeline UI | Event frame, representative image, frame bundle, and encoded clip timeline in `/ops/events`. |
| 4 | V310-S04 | P1 | Client-safe Event Digest | Redacted viewer-safe summary without internal feature/provenance/raw evidence. |
| 5 | V310-S05 | P1 | Scoped Integrator Search API | Scope-gated search API with redaction guard and no raw evidence exposure. |
| 6 | V310-S06 | P1 | Operator Feature Correction | Feature correction, aliases, and reanalysis requests beyond simple review states. |
| 7 | V310-S07 | P2 | Optional Vector Search | Default-off embedding index with rebuild and quality gates. |
| 8 | V310-S08 | P1 | Retention/Export Hardening | Encoded clip lifecycle cleanup, export bundle, and audit coverage. |
| 9 | V310-S09 | P0 | Stabilization and Release Readiness | Build/docs/verifier/UI evidence boundaries and release readiness records. |

## Data Contracts

### FrameRef

Each evidence image should retain a source/time identity that remains useful
even when stream-local sequence numbers restart:

```json
{
  "sourceId": "cam-lobby",
  "channelId": "main",
  "streamEpochId": "stream-20260620-153000",
  "frameSeq": 18342,
  "ptsMs": 918210,
  "wallClockMs": 1781950200123,
  "relativeToEventMs": -1200
}
```

### Evidence Policy

`eventFrame` is required and represents the trigger-time evidence.
`representativeImage` is optional and selected only when it is a better VLM
input. The selection must keep the source frame reference and selection reason.

### Feature Policy

Feature records use a stable envelope with extensible namespaces such as
`appearance`, `action`, `scene`, `spatial`, `event`, `operator`, and optional
future `embedding`. The durable record stores structured feature values,
confidence, uncertainty, provenance summary, and evidence references.

Allowed examples:

- clothing color
- headwear presence/color
- carrying object
- body orientation
- face visible/occluded/masked state
- zone/line relationship
- event action context

Disallowed examples:

- person name or account identity
- face recognition match
- face embedding/template/faceprint
- watchlist match
- long-term personal re-identification
- ID card, phone number, or license plate as a searchable identity feature

## AI Runtime Policy

- Local-first.
- Cloud provider is explicit opt-in only.
- Raw prompts and raw responses are not durably stored.
- Strict structured output is required.
- Invalid structured output is a VLM-only failure.
- VLM failures must not block media, EventRecord, evidence storage, or VA-only
  search.
- Reanalysis uses stored evidence references and creates a new feature revision.

## Retention Policy

Default:

- Evidence and feature retention: 7 days.
- Pinned events are excluded from automatic cleanup.
- Operators can configure retention windows.
- Source/rule overrides are allowed.
- Cleanup dry-run is required before destructive cleanup operations.

Lifecycle cleanup should delete or de-index related evidence images, frame
bundles, feature revisions, search index entries, and later encoded clips as one
consistent operation.

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Scope drift into VMS/NVR | Keep 24/7 recording, broad archive API, and always-on playback out of v3.0/v3.1. |
| VLM latency or failure harms live streaming | Use bounded queues and VLM-only failure states. Media and EventRecord paths continue. |
| Privacy exposure from raw prompts/responses | Store feature-only durable records and never retain raw prompt/response bodies. |
| Identity inference from visual features | Allow only non-identifying visual state and explicitly prohibit face recognition, watchlists, and identity features. |
| Future replay cannot map features to frames | Make FrameRef mandatory for evidence and feature provenance. |
| Search quality is hard to validate | Start with explainable text/tags/filter search; keep vector search optional for v3.1. |
| Deleting evidence leaves stale search results | Treat evidence, feature, index, and audit lifecycle as one cleanup contract. |

## Approval Boundary

This document approves roadmap direction only. It does not approve implementation
of every step, runtime provider calls, long-running tests, field smoke tests,
release publication, or future broad client exposure without separate step-level
work and evidence.

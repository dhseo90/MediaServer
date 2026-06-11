# v2.5.0 Incident Memory S06-S09 Design

## Scope

This design covers only the approved v2.5.0 roadmap items below.

- V250-S06 Similar incident lookup
- V250-S07 Client-safe incident digest
- V250-S08 Redacted incident evidence bundle
- V250-S09 Owner decomposition/release readiness

The work stays inside the current v2.5.0 Semantic Incident Memory boundary. It does not change Event POST payloads, WebRTC DataChannel schema, SSE/WS metadata schema, RTSP/WebRTC media paths, Auth/session/scope contracts, or Rule/Profile save payloads. It does not introduce external embedding or VLM provider calls as default dependencies.

## Current Context

The branch already has v2.5.0 S01-S05 implementation commits for incident text projection, local memory index, `/ops/events` semantic search UI, incident timeline graph, and explainable incident brief. The current `/ops/api/events/reviews` response contains redacted Ops-only view models named `memorySearch`, `timelineGraph`, and `incidentBrief`. The `/ops/events` page renders those view models from `product_ui_page_scripts.cpp`, and S03-S05 static verifiers check server markup, view-model fields, UI rendering markers, CSS, feature inventory rows, coverage registration, and `server.sh` command registration.

The backlog currently still marks S03-S05 as `예정` even though their implementation commits exist. S09 will correct that existing source-of-truth drift as part of release readiness cleanup, while keeping the implementation scope limited to v2.5.0 incident memory.

## Selected Approach

Use the existing `/ops/api/events/reviews` Ops-only response as the integration point for S06 and S08, and use the existing client viewer summary rendering path for S07. This matches S03-S05 and avoids adding a new public incident API surface.

Rejected approaches:

- Add new `/ops/api/incidents/*` endpoints. This is cleaner on paper, but it widens API surface and conflicts with the existing S04/S05 guard pattern that avoids new public incident APIs.
- Add verifier/docs-only gates. This would not satisfy the requested development scope because S06-S08 need actual product view-model and UI surfaces.

## V250-S06 Similar Incident Lookup

S06 adds an Ops-only similar incident lookup panel to `/ops/events` and a redacted `similarIncidents` view model to `/ops/api/events/reviews`.

The view model computes deterministic local similarity from existing EventRecord JSON plus Ops review state:

- rule match
- scenario or event type match
- source match
- EventRecord status match
- incident status match
- operator action target match

Each similar incident group has a base event, a bounded list of related incidents, a numeric score, and explanation terms such as `rule`, `scenario`, `source`, `event-status`, `incident-status`, and `action-target`. The renderer shows only event IDs, incident IDs, safe source IDs, status labels, and explanation terms. It must not render raw JSON, source locators, debug counters, BBox diagnostics, auth material, provider internals, or model material.

The expected schema marker is `media-server.ops.similar-incident-lookup.v1`. The verifier for this step is `verify-v250-similar-incident-lookup`.

## V250-S07 Client-Safe Incident Digest

S07 adds a viewer-safe incident digest to existing client summary screens. It should reuse the client dashboard/live safe summary flow rather than exposing Ops review internals to viewer routes.

The digest contains only safe aggregate and status data:

- active or recent incident count
- latest safe event/status label
- source health wording that does not include locators
- top safe event categories
- bounded incident digest rows with redacted source labels and status

The digest must not include raw EventRecord JSON, source URL, Developer URL, debug counters, BBox diagnostics, rule/profile editor details, prompt/raw response/provider credential/model internals, or raw evidence paths. Admin preview may show the same viewer-safe digest with preview-aware chrome, but not additional sensitive material.

The expected contract marker is `media-server.client.safe-incident-digest.v1`. The verifier for this step is `verify-v250-client-safe-incident-digest`.

## V250-S08 Redacted Incident Evidence Bundle

S08 adds a release-safe redacted incident evidence bundle view to `/ops/events` and the Ops review response. It is a manifest-oriented product view model, not a raw evidence archive expansion.

The bundle manifest summarizes:

- selected incident memory search query and filters
- bounded search/timeline/brief/similarity result references
- included safe artifacts such as event ID, incident ID, status, safe summary, redacted highlight, and graph labels
- excluded material list, including raw evidence, source URL, credential, auth/session, provider internals, raw JSON, debug counters, BBox diagnostics, and model material
- export policy fields showing source-only release safety, no long recording, no external provider dependency, no Event POST payload change, and no viewer client exposure

The existing `/lab/analysis/events/evidence/bundle-token` raw evidence bundle path remains unchanged and separate. S08 does not make lab evidence archives viewer-safe, does not add long recording, and does not expose raw file paths in product UI.

The expected schema marker is `media-server.ops.redacted-incident-evidence-bundle.v1`. The verifier for this step is `verify-v250-redacted-incident-evidence-bundle`.

## V250-S09 Owner Decomposition And Release Readiness

S09 closes the v2.5.0 incident memory owner and readiness mapping. It does not perform release close-out actions such as push, PR, main merge, tag creation, GitHub Release creation, 30-minute soak, 120-minute longrun, or UI fulltest execution.

S09 adds or updates:

- route owner declarations for incident memory review/search/timeline/brief/similarity/bundle surfaces
- feature inventory rows for S06-S09
- coverage verifier registration for S06-S09
- backlog status for implemented S03-S09 items, with wording that does not claim UI fulltest or longrun execution
- release policy/evidence notes that separate stabilization verifier PASS from UI fulltest, 30-minute soak, 120-minute longrun, published metadata, PR, tag, GitHub Release, and push
- manual UI criteria for `/ops/events`, `/client/dashboard`, and `/client/live` verification without marking those UI checks as run

The expected readiness marker is `media-server.v250-incident-memory-release-readiness.v1`. The verifier for this step is `verify-v250-incident-memory-release-readiness`.

## Components

### Server View Models

`src/ingress/webrtc_http_server.cpp` remains the source of the current Ops review response view models. S06 and S08 add small helper functions near the existing incident memory helpers:

- `OpsSimilarIncidentLookupViewJson`
- `OpsRedactedIncidentEvidenceBundleViewJson`

S07 should use the existing client summary generation path and add a helper that produces viewer-safe digest JSON or a safe digest block inside existing dashboard/live summary payloads. It must not pull from Ops-only review notes unless the value is already reduced to safe counts/status labels.

### Product UI

`src/ingress/webrtc_http_server.cpp` adds `/ops/events` shell sections for S06 and S08. Existing client shell markup remains viewer-first and adds no Ops navigation to viewer screens.

`src/ingress/product_ui_page_scripts.cpp` renders:

- `renderSimilarIncidentLookup`
- `renderRedactedIncidentEvidenceBundle`

`src/ingress/product_ui_client_scripts.cpp` renders the S07 digest inside existing client-safe summary areas.

`src/ingress/product_ui_css.cpp` and `src/ingress/product_ui_client_css.cpp` add responsive styling for the new panels without nested cards or raw/debug presentation.

### Owner And Verifier Files

`include/ingress/ops_event_route_owner.h` and `src/ingress/ops_event_route_owner.cpp` are updated only for owner classification and boundary comments. They do not change routing behavior in a way that affects payloads or media paths.

New verifier scripts under `scripts/internal/` follow the existing S03-S05 pattern and are registered in `server.sh`.

## Data Flow

1. `/ops/events` refreshes existing event status and review data.
2. `/ops/api/events/reviews` queries EventRecord storage and Ops review state.
3. The response includes existing `memorySearch`, `timelineGraph`, and `incidentBrief`, plus S06 `similarIncidents` and S08 `redactedEvidenceBundle`.
4. The Ops page renders the new view models as redacted summaries.
5. Client dashboard/live summary payloads include S07 safe digest data derived from existing safe event/status/source health summary fields.
6. Client scripts render digest content without raw JSON/debug/source/provider details.

## Error Handling

If EventRecord query or review state loading fails, existing `/ops/api/events/reviews` error handling remains authoritative. New S06/S08 helpers should return empty bounded arrays and explicit status fields when no eligible data exists. They must not surface raw error details that include file paths, source URLs, credentials, or provider internals.

If client digest source data is unavailable, the client UI shows a safe empty state such as no recent viewer-safe incidents. Missing digest data is not treated as proof of source health success.

## Verification Plan

Each roadmap item is closed independently in order.

S06:

- Write `verify_v250_similar_incident_lookup.mjs` first and run it to confirm RED failure.
- Implement server shell, view model, script rendering, CSS, inventory, coverage, and `server.sh` registration.
- Run `./server.sh verify-v250-similar-incident-lookup`.
- Run `git diff --check`.
- Commit only S06 files.

S07:

- Write `verify_v250_client_safe_incident_digest.mjs` first and run it to confirm RED failure.
- Implement client-safe digest payload/rendering/styling, inventory, coverage, and `server.sh` registration.
- Run `./server.sh verify-v250-client-safe-incident-digest`.
- Run `./server.sh verify-auth-routes` only if required auth verifier environment variables are present; otherwise report it as not run because AGENTS.md forbids starting auth tests without those variables.
- Run `git diff --check`.
- Commit only S07 files.

S08:

- Write `verify_v250_redacted_incident_evidence_bundle.mjs` first and run it to confirm RED failure.
- Implement redacted bundle manifest view model/rendering/styling, inventory, coverage, and `server.sh` registration.
- Run `./server.sh verify-v250-redacted-incident-evidence-bundle`.
- Run `git diff --check`.
- Commit only S08 files.

S09:

- Write `verify_v250_incident_memory_release_readiness.mjs` first and run it to confirm RED failure.
- Update owner mapping, backlog statuses, release policy/evidence, inventory, coverage, and `server.sh` registration.
- Run `./server.sh verify-v250-incident-memory-release-readiness`.
- Run `./server.sh verify-release-metadata`, `./server.sh verify-release-evidence-index`, `./server.sh verify-feature-inventory-coverage`, `./server.sh verify-script-inventory`, `./server.sh verify-docs-links`, and `git diff --check`.
- Commit only S09 files.

Build verification is expected before final completion if the implementation touches compiled C++ files. Long-running 30-minute/120-minute tests, UI fulltest, push, PR, main merge, tag, and GitHub Release are not run without explicit user instruction.

## Completion Boundaries

Static verifier PASS means only that the verifier's declared scope passed. It does not prove browser UI fulltest PASS, 30-minute soak PASS, 120-minute longrun PASS, external provider success, real ONVIF success, published release metadata, GitHub Release creation, or push completion.

The final report must separate:

- completed implementation and direct evidence
- tests actually run
- tests not run
- UI screens not manually opened
- unchanged product contracts
- commits created
- push possibility and push execution status

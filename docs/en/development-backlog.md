# Development Backlog

Detailed Korean backlog: [../development-backlog.md](../development-backlog.md)

## Status Labels

| Label | Meaning |
| --- | --- |
| Planned | Not started |
| In progress | Active implementation or verification |
| Done | Implemented and checked |
| Blocked | Waiting for a decision, asset, environment, or manual setting |

## Current Priority Areas

| Area | Status | Notes |
| --- | --- | --- |
| v1.0.0 source baseline | Done | Source-only public baseline is defined; binary/runtime/model bundles are excluded |
| Public repo readiness | Ready | Actions, branch rules, English docs, and asset policy are prepared; owner-only visibility change is excluded |
| Runtime distribution policy | Done | Source-first policy and bundle guardrails are in place |
| Ops UI stability | Done | Channels/Rules/Users responsive table checks exist |
| v1.1.0 prerequisite roadmap 1/6 | Done | Live-only product boundary is closed and should not be rerun before RC |
| v1.1.0 prerequisite roadmap 2/6 | Done | ONVIF live source onboarding import draft, API, UI, and redaction smoke are closed |
| v1.1.0 prerequisite roadmap 3/6 | Done | Live source health API, operator workflow, and sanitized client state smoke are closed |
| v1.1.0 prerequisite roadmap 4/6 | Done | Live VA event quality timeline/debug, TrackHealth grouping, and preset baseline smoke are closed |
| v1.1.0 prerequisite roadmap 5/6 | Done | Live event delivery contract identifiers and smoke matrix are closed |
| v1.1.0 prerequisite roadmap 6/6 | Done | Multilingual UI/docs alignment and English mirror consolidation are closed |
| v1.1.0 RC stabilization | Done | RC gate/release checklist readiness and longrun separation are closed without rerunning prerequisite roadmap 1-6 |
| v1.1.0-alpha.1 live-only boundary | Done | Roadmap, README, backlog, English docs, and recording/VMS/NVR guardrails are aligned |
| Audit trail operations | In progress | Server persistence exists; search/export can improve |
| Short event evidence | Supporting | EventRecord/snapshot/clip cleanup exists, but it is not the main v1.1.0 product direction |
| RC gate operations | In progress | Longrun gate exists; artifact retention can improve |
| Client dashboard field polish | Planned | Preset-driven priority and wording can improve |

## v1.1.0 Boundary

Detailed Korean roadmap: [../v1.1.0-roadmap.md](../v1.1.0-roadmap.md)

- Focus: ONVIF-assisted live source onboarding, live source health, live VA events, and runtime metadata contracts.
- Excluded: long-term recording, MP4 recorder, VMS/NVR archive, playback timeline, video search, and ONVIF Profile G recording/replay.
- Supporting only: EventRecord, snapshot, clip frame bundles, and evidence cleanup are short event evidence or diagnostics helpers.
- Close-out rule: the live-only product boundary is complete as prerequisite step 1/6. RC work should not reopen VMS/NVR, playback/search, long-term recording, or Profile G scope.
- ONVIF close-out rule: prerequisite step 2/6 is complete at the fixture/import-draft/UI smoke boundary. Real network discovery, SOAP probing, credential persistence, and origin metadata migration are field-integration extensions, not RC blockers.
- Source health close-out rule: prerequisite step 3/6 is complete at the API/UI/sanitized-client smoke boundary. RC work should preserve that contract, not add new health states or expose raw diagnostics to clients.
- Live VA quality close-out rule: prerequisite step 4/6 is complete at the timeline/debug, TrackHealth grouping, and preset baseline smoke boundary. Field-sample retuning is an operational extension, not an RC blocker.
- Live delivery close-out rule: prerequisite step 5/6 is complete at the Event POST/WebRTC/SSE/WS contract and smoke-matrix boundary. OpenAPI or JSON Schema artifacts are integrator-distribution extensions, not RC blockers.
- Multilingual close-out rule: prerequisite step 6/6 is complete after merging short English mirror pages into `docs/en/README.md`, `docs/en/v1.1.0-roadmap.md`, and this backlog.
- RC close-out rule: v1.1.0 RC stabilization is complete at the RC gate/release checklist readiness boundary. 30m/120m longrun evidence is a conditional release gate that must be explicitly requested and run during an actual RC cut, not a remaining backlog issue.

## Near-Term Follow-Ups

- Close or suppress existing Dependabot major-update PR noise after the policy is documented.
- Add richer English docs if the public audience grows.
- Connect RC artifacts to release notes.
- Keep signed-token and cleanup checks for evidence bundles scoped to short event evidence.
- Add operator-facing “next action” buttons to root-cause diagnostics.

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
| v1.1.0 live operations | Next | ONVIF live onboarding, live source health, and live VA event quality |
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

## Near-Term Follow-Ups

- Close or suppress existing Dependabot major-update PR noise after the policy is documented.
- Add richer English docs if the public audience grows.
- Connect RC artifacts to release notes.
- Keep signed-token and cleanup checks for evidence bundles scoped to short event evidence.
- Add operator-facing “next action” buttons to root-cause diagnostics.

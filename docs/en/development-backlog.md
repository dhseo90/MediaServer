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
| Audit trail operations | In progress | Server persistence exists; search/export can improve |
| Evidence retention | In progress | Cleanup policy exists; permission/search can improve |
| RC gate operations | In progress | Longrun gate exists; artifact retention can improve |
| Client dashboard field polish | Planned | Preset-driven priority and wording can improve |

## Near-Term Follow-Ups

- Close or suppress existing Dependabot major-update PR noise after the policy is documented.
- Add richer English docs if the public audience grows.
- Connect RC artifacts to release notes.
- Add signed-token and cleanup checks for evidence bundles.
- Add operator-facing “next action” buttons to root-cause diagnostics.

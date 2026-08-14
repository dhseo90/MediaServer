# v3.9.0 Preparation Design

## Status

> Lifecycle: historical initial v3.9 preparation design. Its planning context is preserved,
> but any current claim that actual structure refactoring is transferred to v4.0.0 is
> superseded by `V390-REVIEW4-51`. Current execution order and status are owned by
> `docs/development-backlog.md` and
> `test/fixtures/v390_structure_execution_scope_decision.json`.

This design records the approved direction for `v3.9.0` preparation.
It is a planning artifact, not implementation, test, release, or completion
evidence.

No item in this document is complete until the matching code, route, UI,
verifier, inventory row, release test record, and approved test evidence exist
and pass their own checks.

## Direct Context

The current branch is `v3.9.0`, but the source baseline still points at
`3.8.0` in the files directly checked during brainstorming:

- `VERSION`: `3.8.0`
- `CMakeLists.txt`: `project(media_server VERSION 3.8.0 LANGUAGES CXX)`
- `README.md`, `README.en.md`, `docs/README.md`, `docs/en/README.md`:
  current source and published baseline text still describe `v3.8.0`
- `docs/development-backlog.md`: current source roadmap is still
  `v3.8.0 Operator-Gated Action Pilot & Outcome Loop`
- `docs/stream-verification.md`, `docs/project-feature-test-inventory.md`,
  and `docs/release-test-records.md`: current verifier/test records are still
  centered on v3.8.0

The current source tree also has clear structure pressure. The largest direct
example observed during brainstorming is `src/ingress/webrtc_http_server.cpp`,
which is roughly 41k lines and mixes HTTP routes, product API models, product
UI shell behavior, and release-era read models.

## Product Direction

`v3.9.0` is a pause-and-close release before the project moves into the
`v4.0.0` structure and test model.

The selected approach is:

```text
Feature completion first, with a dedicated completion inventory.
```

The release should first identify and finish incomplete functionality from
`v1.0.0` through `v3.8.0`. This includes:

- features already promised in roadmap, docs, release evidence, verifier text,
  route/API shape, or UI
- features partially exposed but not usable end to end
- small supporting features that are necessary to make the existing product
  complete before `v4.0.0`
- support functionality needed so `v4.0.0` can focus on structure and testing
  without reopening old feature gaps

After feature completion, the project moves to structure stabilization, then to
the test model transition.

## Goals

- Find every incomplete or partially implemented feature that belongs to the
  current product line through `v3.8.0`.
- Record even small feature gaps in a dedicated v3.9 completion inventory.
- Develop the necessary missing functionality before the structure
  stabilization phase.
- Keep `docs/development-backlog.md` as the high-level status board.
- Keep the dedicated feature completion inventory as the detailed checklist.
- Make `v4.0.0` free to focus on refactoring and the new test model without
  casually modifying existing feature behavior.

## Non-Goals

- Do not use this design as evidence that any v3.9 implementation is complete.
- Do not start release actions, push, PR creation, merge, tag, GitHub Release,
  or follow-up branch creation from this design alone.
- Do not treat verifier PASS as UI fulltest, 30 minute, 120 minute, field
  smoke, or published metadata PASS unless that verifier directly covers the
  item.
- Do not change Event POST payload, WebRTC DataChannel schema, SSE/WS metadata
  schema, RTSP/WebRTC media path, Auth/Role/Scope contract, SourceRegistry /
  PublishedView API contract, Rule/Profile payload contract, or viewer/client
  redaction boundaries without an explicit request.

## Roadmap Shape

The v3.9 roadmap should be represented in two layers.

### High-Level Backlog

`docs/development-backlog.md` should show the large release phases and their
status:

| Phase | Purpose |
| --- | --- |
| Phase 0 | v3.9 source baseline and source-of-truth alignment |
| Phase 1 | Feature completion discovery, inventory, and development |
| Phase 2 | Structure stabilization and refactoring |
| Phase 3 | Test model transition design and preparation |
| Phase 4 | Stabilization, release readiness, and close-out evidence |

The backlog should stay readable. It should not become the exhaustive checklist
for every small feature.

### Feature Completion Inventory

A new dedicated inventory,
`docs/v390-feature-completion-inventory.md`, should track the small items.
This file is the detailed source-of-truth for "did we finish every feature gap?"

Required columns:

| Field | Meaning |
| --- | --- |
| Feature ID | Existing-compatible IDs such as `OPS-*`, `CLIENT-*`, `LAB-*`, `SAFE-*`, `MEDIA-*`, `TEST-*` |
| Source | Roadmap, README/docs, UI exposure, route/API, verifier, release evidence, or direct code check |
| Current State | Missing, partial, flow broken, verification missing, or docs mismatch |
| Required Development | Concrete functionality needed to close the gap |
| Completion Condition | Specific file, route, function, UI control, API, verifier, evidence condition |
| Test Mapping | Stabilization, 30 minute, 120 minute, and UI fulltest applicability |
| v3.9 Disposition | Required development, candidate development, structure-stabilization handoff, or excluded |
| Invariant Impact | Schema, media path, auth/scope, and client redaction impact |

Every small feature that must be completed before `v4.0.0` should have a row.
Rows should not be silently removed after implementation; they should be closed
with evidence or explicitly moved/excluded with a reason.

## Feature Completion Discovery

Discovery should use this order:

1. Confirm the current branch, source version, CMake version, published
   baseline, docs baseline, and current roadmap.
2. Collect exposed or promised functionality from README files, docs index,
   backlog, release policy, stream verification, feature test inventory,
   release test records, UI guide, and relevant release artifacts.
3. Check route/API presence directly in the server code.
4. Check UI controls, panels, labels, and client/admin visibility directly in
   product UI source files.
5. Check verifier scripts and `server.sh` dispatch wiring.
6. Check release evidence and test records without treating old evidence as
   current proof unless it directly applies.
7. Add every candidate to the v3.9 feature completion inventory.
8. Classify each candidate before implementation.

The classification should be:

| Disposition | Meaning |
| --- | --- |
| Required development | Must be implemented in v3.9 before structure stabilization |
| Candidate development | Useful or likely necessary, but needs user approval before implementation |
| Structure-stabilization handoff | Belongs to refactoring, not feature completion |
| Excluded / non-scope | Does not belong in v3.9 or violates product boundaries |

There must be a user review gate after discovery and before feature development.

## Completion Criteria

A feature gap can be closed only when all relevant conditions are true:

- The user-facing or operator-facing flow works end to end.
- The related route/API/function/UI control exists where expected.
- The behavior is documented in the backlog or feature completion inventory.
- The feature is mapped to the four AGENTS test categories:
  stabilization, 30 minute, 120 minute, UI fulltest.
- The verifier or test evidence covers the actual completion condition, not
  only a surrounding gate.
- The feature does not broaden immutable schemas, payloads, media paths,
  auth/scope contracts, or viewer/client exposure without explicit approval.
- Any not-run, pending, review-required, or excluded state is reported as such
  and not converted into PASS.

## Structure Stabilization Boundary

Structure stabilization starts only after the required feature completion list
is closed or explicitly deferred.

The purpose is to make already completed behavior easier to maintain, not to
complete new product functionality.

Priority targets:

| Priority | Target |
| --- | --- |
| P0 | Split large coupled route/UI/API/model files into clearer ownership units |
| P0 | Separate route handlers, JSON model builders, renderers, client scripts, CSS, and verifier helpers |
| P1 | Clarify document source-of-truth roles: backlog for status, inventory for detail, release records for executed results |
| P1 | Regularize `server.sh` dispatch and `scripts/internal` verifier catalog structure |
| P1 | Split large UI JS/CSS surfaces by product area or stable component boundary |
| P2 | Improve naming, folders, and helpers that support v4.0 work |

`src/ingress/webrtc_http_server.cpp` is the first known high-risk file because
of its size and responsibility mix. The stabilization plan should treat it as a
major boundary candidate, but it should not change behavior without matching
verification.

## Test Model Transition

The v3.9 design prepares a new testing model for `v4.0.0`.

The core principle is:

```text
The test system should produce enough evidence by itself.
Codex should interpret failures, not manually drive the tests.
```

### Server Longrun Tests

30 minute and 120 minute server tests should move toward one-command wrappers.
The exact names are not fixed in this design.

Expected behavior:

- one command starts the suite
- test cases run in a fixed order
- the first failure stops the suite
- later steps are reported as not run
- failure output includes command, exit code, phase, port, route, log path,
  summary path, report path, cleanup state, and likely investigation files
- the same command and fixtures can reproduce the run
- temporary artifacts are either cleaned or preserved with an explicit reason

These wrappers remain inside the existing AGENTS categories. They do not create
a fifth test category.

### UI Fulltest

The current Codex-in-app-browser manual-driving model should not be the long
term default.

The first UI automation candidate should be a free web automation tool such as
Playwright because the product UI is web based. Selenium is a secondary web
automation option. SikuliX or similar image-based tools can be evaluated as a
visual fallback for cases where DOM-level checks are not enough, such as video
viewport or overlay visual checks.

Expected failure evidence:

- route
- viewport
- theme if applicable
- account and role
- clicked or typed control
- expected result
- actual result
- screenshot
- trace or video when supported
- browser console output
- server log reference
- cleanup/port state

Manual intervention during a test run must be recorded. A run with manual
intervention is not automatically a clean PASS.

## Error Handling And Reporting

Failure handling should follow AGENTS fail-stop behavior:

- Stop the current phase when a required check fails.
- Mark later steps as not run.
- Separate confirmed facts from inference.
- Preserve the failed command and key output.
- Do not report unexecuted tests or unchecked UI as complete.
- Do not treat static verifiers as UI fulltest evidence.
- Do not continue into release actions from this design.

Feature discovery and development reporting should include:

- user instruction coverage
- direct project evidence
- inferred recommendations
- required development list
- excluded and deferred list
- test category judgment table
- commit and push status, with no commit or push unless explicitly approved

## Approved Design Decisions

- `v3.9.0` uses approach A: feature completion first with a dedicated inventory.
- Feature completion is broader than small cleanup. It includes promised,
  exposed, partially implemented, and v4.0-enabling support functionality.
- `development-backlog.md` remains the high-level roadmap/status board.
- A separate v3.9 feature completion inventory tracks small items.
- A user review gate sits between discovery and implementation.
- Structure stabilization follows feature completion and should not add new
  feature behavior.
- The new test model reduces AI intervention. Scripts and UI automation should
  emit enough evidence for humans or Codex to diagnose failures afterward.

## Next Step

After this design is reviewed, the next Superpowers step is to create an
implementation plan. That plan should decompose v3.9 into at least:

1. v3.9 baseline alignment
2. feature completion inventory creation
3. feature completion discovery
4. user review gate for required/candidate development
5. required feature development waves
6. structure stabilization plan
7. test model transition plan
8. release readiness and evidence close-out

# v3.9.0 Review2 24-25 UI Automation Implementation Plan

> **For agentic workers:** Follow `AGENTS.md` and the repository Superpowers discipline. Register changed test items before RED, implement one numbered roadmap item at a time, rerun from the failed boundary, preserve false-PASS failures, and commit only the completed current item.

**Goal:** Close `V390-REVIEW2-24` and `V390-REVIEW2-25` without changing product API/schema/media/auth contracts: first make all canonical exact 424 UI IDs executable by the native adapter, then reject user actions that have no correlated completion oracle.

**Architecture:** Keep the historical 8-case evidence immutable. Add a canonical native execution manifest derived from the reviewed Policy v4 case binding and semantic implementation evidence. The manifest owns exact ID/feature/role/viewport/theme, product-screen route normalization, native action plan, and oracle contract. The runner owns Playwright-native dispatch, before/after and network capture, artifact creation, first-fail behavior, and negative-route handling. Acceptance/full-suite eligibility remains Step 26 scope.

**Tech stack:** Node.js ESM, Playwright native adapter, JSON fixtures, existing Policy v4 canonical manifest, semantic implementation evidence, `server.sh`, Markdown evidence.

## Task 1 — V390-REVIEW2-24 exact 424 native cases

- [x] Register the roadmap, feature-test mapping, and release-test definition before RED.
- [x] RED: contract rejects the missing exact-case manifest/library/runner integration.
- [x] Generate one explicit execution case for every canonical exact ID without prefix/range selection.
- [x] Normalize API ownership routes to their product UI screen; reject raw JSON/API routes as browser screen routes.
- [x] Preserve `UI-018` as a separately classified negative route and keep historical 8-case evidence unchanged.
- [x] Validate exact ordered 424 IDs, `unsupported=0`, native action plan, role/viewport/theme, oracle seed, artifact plan, and runner dispatch.
- [x] Run focused contract/compatibility stabilization, record RED/final results and cleanup, update roadmap status, and commit Step 24 only.

## Task 2 — V390-REVIEW2-25 no-op false-PASS guard

- [ ] Register the no-op oracle test definition before RED.
- [ ] RED: a pre-existing visible string with identical before/after state passes or lacks a deterministic rejection.
- [ ] Capture before/after DOM digest and correlated network responses for each native action.
- [ ] Require one allowed completion oracle: changed DOM, network+DOM, persisted readback, EventRecord, or server-log correlation; navigation/negative-route cases use their dedicated response+DOM/status oracle.
- [ ] Reject identical before/after action state with no correlated response, even when expected visible text already exists.
- [ ] Add contract negatives for click/select/fill no-op and pre-existing marker false-PASS.
- [ ] Run focused contract/compatibility stabilization, record RED/final results and cleanup, update roadmap status, and commit Step 25 only.

## Boundaries

- Product C++ UI, public API/schema, Event payload, WebRTC/SSE/WS metadata, RTSP/WebRTC media path, Auth/Role/Scope contracts are unchanged.
- Step 24/25 contract PASS is implementation/stabilization evidence, not an actual 424-case UI fulltest PASS.
- Actual 30-minute, 120-minute, exact 424 browser suite, published metadata, release action, and Step 26 acceptance eligibility are not run by this plan.

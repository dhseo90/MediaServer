# v3.9.0 Policy v4 Evidence Qualification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the canonical actual 424-case raw capture into source-bound Policy v4 eligible evidence without relaxing qualification or changing product case semantics.

**Architecture:** Keep the native runner as the source owner and the Policy v4 evaluator as the independent decision owner. Repair the shared contracts at action/request/readback/visual/console boundaries, add an exact one-cluster reason census, and keep acceptance responsible only for sequencing and current raw coverage reporting.

**Tech Stack:** Node.js ESM, Bash acceptance launchers, JSON fixtures, C++17 embedded product UI.

## Global Constraints

- Do not run `./test_ui.sh` or any actual browser execution.
- Do not select an arbitrary request, auto-pass visuals, ignore console errors, broaden an allowlist, force qualified counts, or constant-fold eligibility.
- Fail closed on zero/duplicate/wrong action, stale source, wrong request object, wrong selector/screenshot, blank visual, unapproved console, and missing cross-cutting evidence.
- Use one final commit and push; finish at 0/0 clean.

---

### Task 1: Frozen RED Census Contract

**Files:**
- Create: `test/fixtures/v390_policy_v4_canonical_red_evidence.json`
- Create: `scripts/internal/v390_ui_policy_v4_reason_census.mjs`
- Create: `scripts/internal/verify_v390_ui_policy_v4_actual_evidence_contract.mjs`
- Modify: `server.sh`

- [ ] Record the authoritative summary/evaluation SHA-256 values and complete reason/cluster counts as audit-only historical input.
- [ ] Add an exact-one-cluster classifier that rejects unassigned and multiply assigned reasons.
- [ ] Add a contract that reproduces ineligible/0/424 RED and validates the frozen census.
- [ ] Run the contract and confirm it fails because the classifier/wiring does not exist yet.

### Task 2: Source-Bound Action, Request, and Readback

**Files:**
- Modify: `scripts/internal/v390_ui_policy_v4_independent_qualifier.mjs`
- Modify: `scripts/internal/v390_ui_completion_oracle_lib.mjs`
- Modify: `scripts/internal/run_v390_ui_native_exact_cases.mjs`
- Modify: `scripts/internal/v390_ui_native_exact_cases_lib.mjs`
- Modify generated fixture: `test/fixtures/v390_ui_native_exact_cases.json`
- Test: `scripts/internal/verify_ui_fulltest_evidence_policy_v4_contract.mjs`

- [ ] Add failing contracts for exact request-path filtering plus same Playwright request/response object identity.
- [ ] Add failing contracts for native form submission identity, dynamic execution-owner selectors, hidden controls, negative-route action identity, and every semantic readback shape.
- [ ] Export and reuse the pure semantic expectation evaluator; keep producer PASS claims ignored.
- [ ] Preserve the execution-owner selector and request binding in raw primary observations.
- [ ] Regenerate the native manifest once from the corrected common generator.

### Task 3: Independent Visual and Console Evidence

**Files:**
- Modify: `scripts/internal/v390_ui_native_adapter.mjs`
- Modify: `scripts/internal/v390_ui_policy_v4_evidence_producer.mjs`
- Modify: `scripts/internal/ui_fulltest_evidence_policy_v4_lib.mjs`
- Modify: `src/ingress/product_ui_client_scripts.cpp` only if the captured null-dataset page error is source-confirmed.
- Test: adapter, Policy v4 contract, and visual evidence contracts.

- [ ] Add failing contracts for focus-cycle deduplication, serialized live-video identity, frame progress, geometry, and contrast.
- [ ] Capture only unique focus traversal entries and keep zero visible focus fail-closed.
- [ ] Serialize live-video evidence separately from the DOM node used for frame waiting.
- [ ] Add exact response-bound console approval records; all unmatched error/warning entries remain unapproved.
- [ ] Preserve independent visual recalculation and blank/wrong-selector negatives.

### Task 4: Acceptance Coverage and Qualification Wiring

**Files:**
- Modify: `scripts/internal/verify_ui_fulltest_evidence_policy_v4.mjs`
- Modify: `scripts/internal/verify_v390_test_acceptance_bundle.mjs` only if a producer call is missing after contract repair.
- Test: acceptance bundle and final-integrity contracts.

- [ ] Add a failing contract proving current actual raw coverage reports 424/0 rather than the default 0/424 state.
- [ ] Attach the reason census artifact to qualification output.
- [ ] Keep raw execution counts, qualified counts, and `uiFulltestPass` as separate fields.
- [ ] Confirm synthetic GREEN yields eligible, qualifiedCaseCount 424, and uiFulltestPass true.

### Task 5: Verification, Clean Checkout, and Delivery

**Files:**
- Create: `/private/tmp/v390_policy_v4_evidence_fix_sol_high_report.md`

- [ ] Run build and every requested non-browser policy/native/runtime/adapter/diagnostic/replay/semantic/inventory/docs/syntax/diff gate.
- [ ] Build and run core gates from a branch-bearing clean checkout.
- [ ] Write census, root callsite, RED/GREEN, changed files, gates, commit/push, and next tester command to the report.
- [ ] Create one commit, push `v3.9.0`, and verify HEAD/origin are 0/0 with a clean worktree.

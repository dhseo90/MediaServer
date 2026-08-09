# V390 Navigation Pre/Post Owner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture the exact pre-action owner before every canonical document navigation and bind it to the advanced post-navigation destination owner without case-specific exceptions.

**Architecture:** The native adapter owns document-navigation timing and records an exact lifecycle entry before `goto` or form click. The runner selects this source only for navigation completion and document-form redirect, while request/local completion continues to use the primary action observation. The shared resolver validates cardinality, selector, invocation, visibility, route, and epoch progression fail-closed.

**Tech Stack:** Node.js ESM, Playwright adapter, JSON evidence contracts, shell verifier dispatch.

## Global Constraints

- Do not run an actual browser or `./test_ui.sh`.
- Do not add case-ID exceptions, selector fallback, timeout changes, exists-only checks, or catch-and-pass.
- Preserve hidden/detached source and incomplete-run Policy fail-closed behavior.

---

### Task 1: RED contract and census

**Files:**
- Modify: `scripts/internal/verify_v390_ui_post_action_visual_owner_contract.mjs`
- Create: `test/fixtures/v390_ui_navigation_pre_post_owner_red_20260809.json`

- [x] Add SHA-bound UI-001 RED assertions and exact 424 mode/form/route census.
- [x] Add missing, duplicate, wrong invocation/route/selector, hidden source/destination, and stale epoch negatives.
- [x] Run `./server.sh verify-v390-ui-post-action-visual-owner-contract` and confirm the new UI-001 lifecycle assertion fails.

### Task 2: Common adapter lifecycle capture

**Files:**
- Modify: `scripts/internal/v390_ui_native_adapter.mjs`
- Modify: `scripts/internal/v390_ui_shared_adapter_lifecycle.mjs`
- Modify: `scripts/internal/run_v390_ui_native_exact_cases.mjs`

- [x] Record exact-one source owner immediately before initial/explicit navigation and document-form click.
- [x] Bind the lifecycle to invocation identity and expose sanitized evidence to the runner.
- [x] Select adapter lifecycle only for navigation/document-form; retain primary observation for request/local.
- [x] Re-run the focused contract and adapter/lifecycle contracts until GREEN.

### Task 3: Non-browser verification and delivery

**Files:**
- Create: `/private/tmp/v390_navigation_pre_post_owner_fix_sol_high_report.md`

- [x] Run build and all requested non-browser contracts, including replay 548/548.
- [ ] Run branch-bearing clean-checkout build and core gates.
- [ ] Record census, RED/GREEN, gate results, drift counts, commit, and tester command.
- [ ] Commit once and push `v3.9.0` only after all gates pass.

# v3.9.0 Evidence/Test Gate And Test Model Prep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close v3.9.0 roadmap items (7) through (10) by making evidence/test wrapper output unambiguous and recording AI-minimized longrun/UI automation criteria.

**Architecture:** Add one static v3.9 verifier command that checks the UI wrapper schema, feature inventory coverage wording, longrun runner criteria, UI automation adapter criteria, backlog status, project inventory mapping, release records, and script dispatch. Keep all changes in evidence/test tooling and docs; do not change product API, auth/scope, media path, or UI runtime behavior.

**Tech Stack:** Markdown source-of-truth docs, Node.js verifier scripts, `server.sh` dispatch, existing project inventory and release records.

---

### Task 1: RED New Gate Command

**Files:**
- Read: `server.sh`
- Later modify: `server.sh`
- Later create: `scripts/internal/verify_v390_evidence_test_gate_prep.mjs`

- [ ] **Step 1: Run the missing verifier command**

```bash
./server.sh verify-v390-evidence-test-gate-prep
```

Expected: fail with unknown command before implementation.

### Task 2: Implement Verifier Skeleton And Dispatch

**Files:**
- Create: `scripts/internal/verify_v390_evidence_test_gate_prep.mjs`
- Modify: `server.sh`
- Modify: `scripts/internal/verify_script_inventory.mjs`

- [ ] **Step 1: Add the verifier script**

The verifier reads `scripts/internal/verify_ui_fulltest_one_shot.mjs`, `scripts/internal/verify_feature_inventory_coverage.mjs`, `docs/manual-ui-fulltest.md`, `docs/stream-verification.md`, `docs/project-feature-test-inventory.md`, `docs/v390-feature-completion-inventory.md`, `docs/development-backlog.md`, `docs/release-test-records.md`, `docs/release-evidence-index.md`, `server.sh`, and `scripts/internal/verify_script_inventory.mjs`.

- [ ] **Step 2: Add `server.sh` help and dispatch**

Expose `verify-v390-evidence-test-gate-prep` with a Korean help line and dispatch it to `verify_v390_evidence_test_gate_prep.mjs`.

- [ ] **Step 3: Add the script to script inventory**

Add `verify_v390_evidence_test_gate_prep.mjs` to the strict user-facing JS script allowlist.

### Task 3: UI Wrapper Result Schema

**Files:**
- Modify: `scripts/internal/verify_ui_fulltest_one_shot.mjs`
- Modify: `docs/manual-ui-fulltest.md`

- [ ] **Step 1: Add explicit summary fields**

Add `wrapperResult`, `uiFulltestEvidenceStatus`, `manualResultStatus`, and `longrunStatus` to `summary.json` and `summary.md`. `wrapperResult` mirrors command success/failure. `uiFulltestEvidenceStatus` is `provided` only when in-app evidence is supplied, otherwise `not-provided`. `manualResultStatus` is `provided`, `skipped`, or `not-provided`. `longrunStatus` records 30-minute, 120-minute predev, and runtime console 120-minute as `not-run-by-this-wrapper`.

- [ ] **Step 2: Document the boundary**

Update manual UI documentation so wrapper PASS cannot be read as UI fulltest PASS, 30-minute PASS, 120-minute PASS, or manual result PASS.

### Task 4: Coverage Mapping Wording

**Files:**
- Modify: `scripts/internal/verify_feature_inventory_coverage.mjs`
- Modify: `docs/project-feature-test-inventory.md`

- [ ] **Step 1: Change report item wording**

Keep command-level check output as pass/fail, but change per-feature coverage report rows to `coverageStatus: covered|missing` with `executionEvidenceStatus: not-execution-evidence`.

- [ ] **Step 2: Document covered/missing semantics**

Update project inventory wording so coverage mapping is not described as execution PASS.

### Task 5: Longrun Runner And UI Automation Criteria

**Files:**
- Modify: `docs/stream-verification.md`
- Modify: `docs/manual-ui-fulltest.md`

- [ ] **Step 1: Add AI-minimized longrun runner criteria**

Record 30-minute/120-minute runner expectations: one command, fixed ordered phases, stop-on-first-fail, later phases marked not-run, failure report fields, reproducible command/fixtures, cleanup status, artifact preserve/delete reason, and no fifth AGENTS test category.

- [ ] **Step 2: Add UI automation adapter criteria**

Record free tool priority: Playwright first, Selenium secondary, image-based fallback only when DOM checks are insufficient. Failure reports must include route, viewport, theme, account/role, action, expected/actual result, screenshot, trace/video where available, console output, server log reference, cleanup/port state, and manual intervention status.

### Task 6: Roadmap, Inventory, Release Records

**Files:**
- Modify: `docs/development-backlog.md`
- Modify: `docs/v390-feature-completion-inventory.md`
- Modify: `docs/project-feature-test-inventory.md`
- Modify: `docs/release-test-records.md`
- Modify: `docs/release-evidence-index.md`

- [ ] **Step 1: Mark v3.9.0 (7) through (10) as closed-with-evidence**

Record exact files and verifier command added for each item. Keep UI fulltest, 30-minute, 120-minute, published metadata, and release action as not-run unless separately executed.

- [ ] **Step 2: Add inventory rows before final verification**

Add `OPS-166` through `OPS-169` and `SAFE-199` through `SAFE-202` before running the final stabilization checks.

### Task 7: Verification

**Files:**
- Read all modified files

- [ ] **Step 1: Run focused verifiers**

```bash
./server.sh verify-v390-evidence-test-gate-prep
./server.sh verify-ui-fulltest-one-shot --help
./server.sh verify-feature-inventory-coverage --json-report /tmp/v390-feature-coverage.json --report /tmp/v390-feature-coverage.md
./server.sh verify-project-inventory
./server.sh verify-script-inventory
git diff --check
```

- [ ] **Step 2: Report boundaries**

Report that this work does not execute UI fulltest, 30-minute, 120-minute, published metadata, PR, tag, or push.

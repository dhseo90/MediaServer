# V310 S09 Stabilization And Release Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close `V310-S09 Stabilization and Release Readiness` with a local readiness verifier, release/test records, and inventory evidence boundaries.

**Architecture:** Add one static verifier modeled after `verify_v300_stabilization_release_readiness.mjs`, wire it through `server.sh`, and update existing roadmap/evidence/inventory documents. The implementation must not change product API schemas, media paths, Auth/Role/Scope behavior, UI runtime behavior, or release publication state.

**Tech Stack:** Bash `server.sh`, Node.js ESM verifier scripts, Markdown release/backlog/inventory docs.

---

### Task 1: RED Gate

**Files:**
- Read: `server.sh`
- Read: `docs/development-backlog.md`
- Read: `docs/stream-verification.md`
- Read: `docs/project-feature-test-inventory.md`
- Read: `docs/release-test-records.md`

- [x] **Step 1: Run the missing S09 verifier**

```bash
./server.sh verify-v310-stabilization-release-readiness
```

Expected: FAIL with `알 수 없는 명령입니다: verify-v310-stabilization-release-readiness`.

### Task 2: Implement S09 Static Gate

**Files:**
- Create: `scripts/internal/verify_v310_stabilization_release_readiness.mjs`
- Modify: `server.sh`
- Modify: `scripts/internal/verify_feature_inventory_coverage.mjs`
- Modify: `scripts/internal/verify_project_feature_test_inventory.mjs`

- [x] **Step 1: Add verifier script**

Implement a Node.js verifier that checks:

```text
V310-S09 roadmap state, stream verification command, feature IDs SAFE-101/OPS-068,
release policy companion commands, release evidence index, release test records,
server dispatch, script inventory, and not-run boundaries.
```

- [x] **Step 2: Wire command**

Add `verify-v310-stabilization-release-readiness` to `server.sh` usage and dispatch, pointing to `scripts/internal/verify_v310_stabilization_release_readiness.mjs`.

- [x] **Step 3: Update inventory verifier maps**

Add the new command to SAFE/OPS coverage maps and require `SAFE-101` and `OPS-068`.

### Task 3: Update S09 Records

**Files:**
- Modify: `docs/development-backlog.md`
- Modify: `docs/stream-verification.md`
- Modify: `docs/project-feature-test-inventory.md`
- Modify: `docs/release-test-records.md`
- Modify: `docs/release-evidence-index.md`
- Modify: `docs/release-policy.md`

- [x] **Step 1: Mark S09 as local gate complete in roadmap**

Record exactly where logic was added: verifier script, `server.sh` command, feature inventory, release records, release policy, and release evidence index.

- [x] **Step 2: Add test item definitions before final verification**

Add `V310 stabilization and release readiness`, `SAFE-101`, and `OPS-068` rows before rerunning inventory/coverage gates.

- [x] **Step 3: Preserve not-run boundaries**

Record UI fulltest, 30m/120m longrun, published metadata, PR/main/tag/GitHub Release, and field smoke as not run by the local gate.

### Task 4: Verify And Commit

**Files:**
- Verify changed files only through project commands.

- [x] **Step 1: Run S09 verifier**

```bash
./server.sh verify-v310-stabilization-release-readiness
```

- [x] **Step 2: Run companion local gates approved by S09 scope**

```bash
./server.sh build
./server.sh verify-v310-entry-baseline
./server.sh verify-v310-event-clip-contract
./server.sh verify-analysis-state
./server.sh verify-v310-replay-timeline-ui
./server.sh verify-v310-client-safe-event-digest
./server.sh verify-v310-scoped-integrator-search-api
./server.sh verify-v310-operator-feature-correction
./server.sh verify-v310-optional-vector-search
./server.sh verify-v310-retention-export-hardening
./server.sh verify-release-metadata
./server.sh verify-docs-links
./server.sh verify-docs-ui-assets
./server.sh verify-project-inventory
./server.sh verify-feature-inventory-coverage
./server.sh verify-release-evidence-index
./server.sh verify-release-closeout-helper --dry-run
./server.sh verify-release-closeout-helper --dry-run --one-shot-dry-run
./server.sh verify-script-inventory
git diff --check
```

- [x] **Step 3: Cleanup temporary artifacts**

List S09-created temporary artifacts, record cleanup in `docs/release-test-records.md`, delete reproducible temporary outputs, and verify deletion.

- [x] **Step 4: Commit approved S09 scope**

```bash
git add <S09 files>
git commit -m "docs: close v310 stabilization readiness"
```

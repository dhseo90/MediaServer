# v2.2.0 S09 UI Fulltest Matrix Evidence 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** v2.2.0 S05~S08 UI redesign route를 manual UI evidence runner와 UI 풀테스트 matrix에 연결한다.

**Architecture:** S09는 새 제품 UI를 만들지 않고 문서 matrix와 정적 verifier를 추가한다. `verify-v220-ui-fulltest-matrix-evidence`가 S09 문서, manual UI 문서, backlog, stream verification, feature inventory, runner schema 연결을 확인한다.

**Tech Stack:** Markdown source-of-truth, Node.js verifier, `server.sh` dispatcher, existing manual UI evidence runner.

---

### Task 1: S09 verifier RED

**Files:**
- Create: `scripts/internal/verify_v220_ui_fulltest_matrix_evidence.mjs`

- [ ] **Step 1: Write failing verifier**

Create a Node.js verifier that reads `server.sh`, `docs/v220-ui-fulltest-matrix-evidence.md`,
manual UI docs, backlog, stream verification, and feature inventory. It must check
S05~S08 route IDs, runner schema, viewport list, redaction boundary, role guard, and
non-substitution wording.

- [ ] **Step 2: Run before dispatcher wiring**

Run:

```bash
./server.sh verify-v220-ui-fulltest-matrix-evidence
```

Expected: FAIL because `server.sh` does not expose the command yet.

### Task 2: Dispatcher GREEN

**Files:**
- Modify: `server.sh`

- [ ] **Step 1: Expose command**

Add `verify-v220-ui-fulltest-matrix-evidence` to help text and dispatcher.

- [ ] **Step 2: Run verifier**

Run:

```bash
./server.sh verify-v220-ui-fulltest-matrix-evidence
```

Expected: FAIL because S09 docs and matrix are not wired yet.

### Task 3: S09 source-of-truth document

**Files:**
- Create: `docs/v220-ui-fulltest-matrix-evidence.md`

- [ ] **Step 1: Add matrix document**

Document `media-server.v220-ui-fulltest-matrix.v1`, S05~S08 route coverage, function IDs,
required evidence fields, responsive/theme matrix, role guard, redaction checks, and
non-substitution boundaries.

- [ ] **Step 2: Run verifier**

Run:

```bash
./server.sh verify-v220-ui-fulltest-matrix-evidence
```

Expected: FAIL until manual UI docs, backlog, stream verification, and feature inventory
are updated.

### Task 4: Connect manual UI docs and inventory

**Files:**
- Modify: `docs/manual-ui-fulltest.md`
- Modify: `docs/manual-ui-checklist.md`
- Modify: `docs/manual-ui-result-template.md`
- Modify: `docs/project-feature-test-inventory.md`
- Modify: `docs/README.md`

- [ ] **Step 1: Link S09 matrix**

Add S09 matrix references without claiming UI 풀테스트 PASS.

- [ ] **Step 2: Update inventory pre-test list**

Add a v2.2.0 S09 row to the current pre-test update list. Do not change feature row count
or UI target count.

### Task 5: Backlog, stream verification, and final checks

**Files:**
- Modify: `docs/development-backlog.md`
- Modify: `docs/stream-verification.md`

- [ ] **Step 1: Record S09 closure boundary**

Mark S09 complete only after S09 verifier and supporting document checks pass. Record UI
풀테스트, 30분, 120분, published metadata as 미실행 unless actually executed.

- [ ] **Step 2: Run verification**

Run:

```bash
./server.sh verify-v220-ui-fulltest-matrix-evidence
./server.sh verify-manual-ui-evidence
./server.sh verify-manual-ui-evidence-runner
./server.sh verify-docs-links
./server.sh verify-docs-ui-assets
./server.sh verify-feature-inventory-coverage
./server.sh verify-script-inventory
./server.sh verify-release-metadata
node --check scripts/internal/verify_v220_ui_fulltest_matrix_evidence.mjs
git diff --check
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-06-03-v220-s09-ui-fulltest-matrix-evidence-design.md docs/superpowers/plans/2026-06-03-v220-s09-ui-fulltest-matrix-evidence.md scripts/internal/verify_v220_ui_fulltest_matrix_evidence.mjs server.sh docs/v220-ui-fulltest-matrix-evidence.md docs/manual-ui-fulltest.md docs/manual-ui-checklist.md docs/manual-ui-result-template.md docs/project-feature-test-inventory.md docs/README.md docs/development-backlog.md docs/stream-verification.md
git commit -m "docs: add v2.2.0 UI fulltest matrix evidence"
```

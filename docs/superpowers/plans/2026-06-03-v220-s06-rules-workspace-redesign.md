# v2.2.0 S06 Rules Workspace Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/ops/rules`를 validation/readiness, draft assist, mode selector, catalog tables, detail editor 흐름으로 재배치합니다.

**Architecture:** 기존 C++ HTML builder의 모든 `id`/`data-testid`/form hook을 보존하고 wrapper class만 추가합니다. CSS는 Rules workspace 전용 class로 responsive grid/dock behavior를 정의하며, 새 Node verifier가 route/CSS/docs/server/backlog 연결을 확인합니다.

**Tech Stack:** C++17 string HTML renderer, repository-local CSS string generator, Node.js verifier, `server.sh` command dispatcher.

---

### Task 1: S06 Verifier RED

**Files:**
- Create: `scripts/internal/verify_v220_rules_workspace_redesign.mjs`
- Modify: `server.sh`

- [ ] **Step 1: Write the failing verifier**

Create a verifier that checks the S06 command, docs, `/ops/rules` workspace classes,
existing JS hooks, CSS responsive classes, backlog section, stream verification entry,
and feature inventory mapping.

- [ ] **Step 2: Run RED**

Run: `./server.sh verify-v220-rules-workspace-redesign`

Expected: FAIL because the command or S06 artifacts do not exist yet.

- [ ] **Step 3: Wire command**

Add `verify-v220-rules-workspace-redesign` to `server.sh` help and dispatcher.

- [ ] **Step 4: Run command-wired RED**

Run: `./server.sh verify-v220-rules-workspace-redesign`

Expected: FAIL from missing S06 docs/classes, not unknown command.

### Task 2: S06 Docs

**Files:**
- Create: `docs/v220-rules-workspace-redesign.md`
- Modify: `docs/README.md`
- Modify: `docs/stream-verification.md`

- [ ] **Step 1: Add S06 product doc**

Document route scope, responsive behavior, preserved hooks, non-goals, and verification
commands in Korean.

- [ ] **Step 2: Link S06 docs**

Add the S06 doc to `docs/README.md` and a S06 verification block to
`docs/stream-verification.md`.

- [ ] **Step 3: Run verifier**

Run: `./server.sh verify-v220-rules-workspace-redesign`

Expected: FAIL only for source/CSS/backlog/feature inventory implementation checks.

### Task 3: Rules HTML Workspace Classes

**Files:**
- Modify: `src/ingress/webrtc_http_server.cpp`

- [ ] **Step 1: Add route workspace class**

Change the rules root section to:

```html
<section class="panel ops-workspace rules-workspace" data-ops-panel="rules" data-testid="ops-rules-page">
```

- [ ] **Step 2: Group readiness and assist sections**

Wrap validation/prerequisite sections in `rules-workspace-readiness-grid` and
scenario/VLM draft sections in `rules-workspace-assist-grid`.

- [ ] **Step 3: Group catalog and detail sections**

Wrap mode selector and three rule tables in `rules-workspace-catalog-grid`, and add
`rules-workspace-detail-panel` to `opsRulesDetailPanel`.

- [ ] **Step 4: Run verifier**

Run: `./server.sh verify-v220-rules-workspace-redesign`

Expected: FAIL only for CSS/backlog/feature inventory checks.

### Task 4: Rules Workspace CSS

**Files:**
- Modify: `src/ingress/product_ui_css.cpp`

- [ ] **Step 1: Add desktop/tablet/mobile layout CSS**

Add `rules-workspace-*` classes. At `@media (max-width: 760px)`, readiness/assist/catalog
grids collapse to one column and action toolbars become full-width controls.

- [ ] **Step 2: Run verifier**

Run: `./server.sh verify-v220-rules-workspace-redesign`

Expected: FAIL only for backlog/feature inventory closure until docs are updated.

### Task 5: Inventory, Backlog, Verification, Commit

**Files:**
- Modify: `docs/development-backlog.md`
- Modify: `docs/project-feature-test-inventory.md`

- [ ] **Step 1: Update feature inventory**

Map `UI-012` to S06 Rules workspace verifier without changing feature row counts.

- [ ] **Step 2: Update backlog closure after tests**

Mark S06 complete only after the listed verification commands pass. Record executed,
failed-then-fixed, and 미실행 items separately.

- [ ] **Step 3: Run focused verification**

Run:

```bash
./server.sh build
./server.sh verify-v220-rules-workspace-redesign
./server.sh verify-rule-ui
./server.sh verify-ops-rules-roundtrip
./server.sh verify-ops-rule-conflict-ui
./server.sh verify-ops-rule-validation-matrix
./server.sh verify-ops-client-ui --screenshots
git diff --check
```

Expected: all commands PASS. Stop and fix the first failure before continuing.

- [ ] **Step 4: Commit**

Run:

```bash
git add docs/superpowers/specs/2026-06-03-v220-s06-rules-workspace-redesign-design.md docs/superpowers/plans/2026-06-03-v220-s06-rules-workspace-redesign.md scripts/internal/verify_v220_rules_workspace_redesign.mjs server.sh docs/v220-rules-workspace-redesign.md docs/README.md docs/stream-verification.md docs/development-backlog.md docs/project-feature-test-inventory.md src/ingress/webrtc_http_server.cpp src/ingress/product_ui_css.cpp
git commit -m "feat: redesign v2.2.0 rules workspace"
```

Expected: one S06 commit.

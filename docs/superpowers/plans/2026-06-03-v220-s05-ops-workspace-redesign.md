# v2.2.0 S05 Ops Workspace Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/ops/home`, `/ops/dashboard`, `/ops/events`를 S02/S03/S04 기반의 반응형 Ops workspace로 재배치합니다.

**Architecture:** HTML은 기존 C++ route builder에서 `id`와 `data-testid`를 보존하며 재배치합니다. CSS는 `product_ui_css.cpp`에 Ops workspace 전용 class를 추가하고, 검증은 새 `verify-v220-ops-workspace-redesign` 명령으로 DOM/class/hook/doc/server 연결을 확인합니다.

**Tech Stack:** C++17 string HTML renderer, repository-local CSS string generator, Node.js verifier, `server.sh` command dispatcher.

---

### Task 1: S05 Verifier RED

**Files:**
- Create: `scripts/internal/verify_v220_ops_workspace_redesign.mjs`
- Modify: `server.sh`

- [ ] **Step 1: Write the failing verifier**

Create `scripts/internal/verify_v220_ops_workspace_redesign.mjs` with checks for:

```javascript
#!/usr/bin/env node
const fs = require('fs');

const checks = [];
const read = (path) => fs.readFileSync(path, 'utf8');
const source = read('src/ingress/webrtc_http_server.cpp');
const css = read('src/ingress/product_ui_css.cpp');
const backlog = read('docs/development-backlog.md');
const stream = read('docs/stream-verification.md');
const docs = read('docs/v220-ops-workspace-redesign.md');
const server = read('server.sh');

function check(name, condition) {
  checks.push({ name, condition });
}

check('S05 command is exposed by server.sh', server.includes('verify-v220-ops-workspace-redesign'));
check('S05 docs exist and define route scope', docs.includes('/ops/home') && docs.includes('/ops/dashboard') && docs.includes('/ops/events'));
check('home route uses ops workspace class', source.includes('ops-workspace-home') && source.includes('data-testid="ops-home-page"'));
check('dashboard route uses diagnostic workspace class', source.includes('ops-workspace-dashboard') && source.includes('data-testid="ops-dashboard-page"'));
check('events route uses event workbench class', source.includes('ops-workspace-events') && source.includes('data-testid="ops-events-page"'));
check('existing JS hooks stay present', [
  'homeChannelCount',
  'dashRootCauseList',
  'dashIncidentTimeline',
  'opsEventsRefresh',
  'eventReviewRows',
  'eventRecordRows'
].every((hook) => source.includes(hook)));
check('CSS defines responsive Ops workspace layout', [
  '.ops-workspace-hero',
  '.ops-workspace-action-grid',
  '.ops-workspace-diagnostic-grid',
  '.ops-workspace-event-grid',
  '@media (max-width: 760px)'
].every((needle) => css.includes(needle)));
check('backlog records S05 closure section', backlog.includes('### V220-S05 Ops workspace redesign 종료 기준'));
check('stream verification documents S05 verifier', stream.includes('verify-v220-ops-workspace-redesign'));

let pass = 0;
for (const item of checks) {
  if (item.condition) {
    pass += 1;
    console.log(`[pass] ${item.name}`);
  } else {
    console.error(`[fail] ${item.name}`);
  }
}

console.log(`\n== v2.2.0 Ops workspace redesign summary ==`);
console.log(`- pass: ${pass}`);
console.log(`- fail: ${checks.length - pass}`);
process.exit(pass === checks.length ? 0 : 1);
```

- [ ] **Step 2: Run RED**

Run: `./server.sh verify-v220-ops-workspace-redesign`

Expected: FAIL because the command and docs/classes do not exist yet.

- [ ] **Step 3: Wire server command**

Add `verify-v220-ops-workspace-redesign` to `server.sh` help and dispatcher so the verifier runs with Node.js.

- [ ] **Step 4: Run partial GREEN for command wiring**

Run: `./server.sh verify-v220-ops-workspace-redesign`

Expected: FAIL from missing S05 artifacts, not from unknown command.

### Task 2: S05 Docs

**Files:**
- Create: `docs/v220-ops-workspace-redesign.md`
- Modify: `docs/README.md`
- Modify: `docs/stream-verification.md`

- [ ] **Step 1: Add S05 product doc**

Create a Korean S05 document that records route scope, visual hierarchy, responsive behavior, non-goals, and verification commands.

- [ ] **Step 2: Link S05 docs**

Add the S05 document to `docs/README.md` and add a S05 verification block to `docs/stream-verification.md`.

- [ ] **Step 3: Run verifier**

Run: `./server.sh verify-v220-ops-workspace-redesign`

Expected: FAIL only for missing source/CSS/backlog implementation checks.

### Task 3: Ops HTML Workspace Classes

**Files:**
- Modify: `src/ingress/webrtc_http_server.cpp`

- [ ] **Step 1: Update `/ops/home` shell**

Change the home panel to include `ops-workspace-home`, an `ops-workspace-hero`, an `ops-workspace-action-grid`, and existing IDs:

```html
<section class="panel ops-workspace ops-workspace-home" data-ops-panel="home" data-testid="ops-home-page">
```

- [ ] **Step 2: Update `/ops/dashboard` shell**

Change the dashboard panel to include `ops-workspace-dashboard` and group diagnostic sections with `ops-workspace-diagnostic-grid` while preserving `dashRootCauseList`, `dashIncidentTimeline`, `dashRuntimeOpsList`, and `ops-runtime-operations-console`.

- [ ] **Step 3: Update `/ops/events` shell**

Change the events panel to include `ops-workspace-events` and group status/review/record sections with `ops-workspace-event-grid` while preserving `opsEventsRefresh`, `eventReviewRows`, and `eventRecordRows`.

- [ ] **Step 4: Run verifier**

Run: `./server.sh verify-v220-ops-workspace-redesign`

Expected: FAIL only for missing CSS/backlog checks.

### Task 4: Ops Workspace CSS

**Files:**
- Modify: `src/ingress/product_ui_css.cpp`

- [ ] **Step 1: Add desktop/tablet/mobile layout CSS**

Add class rules for `ops-workspace`, `ops-workspace-hero`, `ops-workspace-action-grid`, `ops-workspace-diagnostic-grid`, and `ops-workspace-event-grid`. The mobile rule must be under `@media (max-width: 760px)` and collapse grids to one column.

- [ ] **Step 2: Run verifier**

Run: `./server.sh verify-v220-ops-workspace-redesign`

Expected: FAIL only for missing backlog closure until docs are updated.

### Task 5: Backlog Closure And Regression Verification

**Files:**
- Modify: `docs/development-backlog.md`

- [ ] **Step 1: Mark S05 closure evidence after tests**

Update the S05 row and closure section only after implementation checks pass. Record executed commands, missing UI fulltest/30분/120분/published metadata separately.

- [ ] **Step 2: Run focused verification**

Run:

```bash
./server.sh build
./server.sh verify-v220-ops-workspace-redesign
./server.sh verify-v220-component-primitives
./server.sh verify-product-ui-token-drift
git diff --check
```

Expected: all commands PASS.

- [ ] **Step 3: Run Ops UI smoke**

Run:

```bash
./server.sh verify-ops-click-e2e
./server.sh verify-ops-client-ui --screenshots
./server.sh verify-rule-ui
```

Expected: all commands PASS, or stop and fix the first failure before continuing.

- [ ] **Step 4: Commit**

Run:

```bash
git add docs/superpowers/specs/2026-06-03-v220-s05-ops-workspace-redesign-design.md docs/superpowers/plans/2026-06-03-v220-s05-ops-workspace-redesign.md scripts/internal/verify_v220_ops_workspace_redesign.mjs server.sh docs/v220-ops-workspace-redesign.md docs/README.md docs/stream-verification.md docs/development-backlog.md src/ingress/webrtc_http_server.cpp src/ingress/product_ui_css.cpp
git commit -m "feat: redesign v2.2.0 ops workspace"
```

Expected: one S05 commit.

# v2.2.0 S08 Auth Setup Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** auth/setup 계열 화면을 같은 responsive form shell과 component primitive 기준으로 정리한다.

**Architecture:** `AppendAuthShellStart`가 공통 shell marker를 제공하고, route별 form builder가 `ProductUiFormRowHtml`과 S08 class를 소비한다. `verify-v220-auth-setup-redesign`이 HTML/CSS/doc/backlog/inventory/server 연결과 auth guard 불변 조건을 정적 검증한다.

**Tech Stack:** C++17 string template, shared product UI components, CSS design tokens, Node.js verifier, shell dispatcher.

---

### Task 1: S08 verifier RED

**Files:**
- Create: `scripts/internal/verify_v220_auth_setup_redesign.mjs`

- [ ] **Step 1: Write the failing verifier**

The verifier checks `server.sh`, auth page builders, CSS, docs index, backlog, stream
verification, and feature inventory.

- [ ] **Step 2: Run verifier before dispatcher wiring**

Run: `./server.sh verify-v220-auth-setup-redesign`

Expected: FAIL because `server.sh` does not expose the command yet.

### Task 2: Dispatcher GREEN

**Files:**
- Modify: `server.sh`

- [ ] **Step 1: Expose verifier command**

Add `verify-v220-auth-setup-redesign` to help text and dispatcher.

- [ ] **Step 2: Run verifier**

Run: `./server.sh verify-v220-auth-setup-redesign`

Expected: FAIL because route/CSS/docs do not yet satisfy S08 checks.

### Task 3: Auth shell and form classes

**Files:**
- Modify: `src/ingress/webrtc_http_server.cpp`
- Modify: `src/ingress/product_ui_css.cpp`

- [ ] **Step 1: Add shell and card classes**

Add `auth-responsive-shell`, `auth-responsive-card`, `data-auth-shell="responsive-form"`.

- [ ] **Step 2: Convert auth forms to FormGrid helper**

Use `ProductUiFormRowHtml` for setup, invite setup, password change, and access request
without changing input names, methods, actions, ids, token behavior, or auth policy.

- [ ] **Step 3: Add responsive CSS**

Add `.auth-form-grid`, `.auth-helper-panel`, `.auth-message`, route form test ids, and
mobile width rules using existing tokens.

- [ ] **Step 4: Run verifier**

Run: `./server.sh verify-v220-auth-setup-redesign`

Expected: FAIL until docs/backlog/inventory are updated.

### Task 4: S08 docs and inventory

**Files:**
- Create: `docs/v220-auth-setup-redesign.md`
- Modify: `docs/README.md`
- Modify: `docs/development-backlog.md`
- Modify: `docs/stream-verification.md`
- Modify: `docs/project-feature-test-inventory.md`

- [ ] **Step 1: Add S08 source-of-truth doc**

Document scope, auth guard invariants, responsive form contract, verification, and non-scope.

- [ ] **Step 2: Update docs index and verification docs**

Link S08 and list `verify-v220-auth-setup-redesign`.

- [ ] **Step 3: Update backlog and feature inventory**

Mark only S08 closure after checks pass. Record UI 풀테스트, 30분, 120분, published
metadata as 미실행 unless actually executed.

### Task 5: Stabilization and commit

**Files:**
- All S08 files
- Include auth verifier compatibility updates when visual smoke exposes stale selector or
  assignment interaction assumptions.

- [ ] **Step 1: Run required checks**

Run S08-focused checks, auth verifier family, UI route smoke, docs verifier family, and
`git diff --check`.

- [ ] **Step 2: Fix S08 failures**

Fix failures inside S08 scope and rerun. Stop if a failure needs a decision outside S08.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-06-03-v220-s08-auth-setup-redesign-design.md docs/superpowers/plans/2026-06-03-v220-s08-auth-setup-redesign.md scripts/internal/verify_v220_auth_setup_redesign.mjs scripts/internal/verify_auth_scope_picker.mjs scripts/internal/verify_auth_ui_smoke.mjs scripts/internal/verify_auth_workflow.sh server.sh docs/v220-auth-setup-redesign.md docs/README.md docs/development-backlog.md docs/stream-verification.md docs/project-feature-test-inventory.md src/ingress/webrtc_http_server.cpp src/ingress/product_ui_css.cpp
git commit -m "feat: redesign v2.2.0 auth setup workspace"
```

# v2.2.0 S07 Client Live Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/client` viewer 화면을 video-first, viewer-safe, responsive workspace 구조로 정리한다.

**Architecture:** 기존 `ClientShellPageHtml`, `AppendClientShellScript`, `ClientShellCss()` 경계를 유지한다. 새 verifier가 HTML/JS/CSS/doc/backlog 연결과 viewer redaction marker를 정적 검증하고, 기존 `verify-ops-client-ui`가 route smoke와 browser screenshot 흐름을 보강한다.

**Tech Stack:** C++17 string template, JavaScript inline renderer, CSS design tokens, Node.js verifier, shell dispatcher.

---

### Task 1: S07 verifier RED

**Files:**
- Create: `scripts/internal/verify_v220_client_live_redesign.mjs`

- [ ] **Step 1: Write the failing verifier**

`scripts/internal/verify_v220_client_live_redesign.mjs`에서 `server.sh`, client shell C++,
client page script, CSS, docs, backlog, stream verification, feature inventory를 읽고
S07 class와 문서 연결을 검사한다.

- [ ] **Step 2: Run verifier before dispatcher wiring**

Run: `./server.sh verify-v220-client-live-redesign`

Expected: FAIL because `server.sh` does not expose the command yet.

### Task 2: Dispatcher GREEN

**Files:**
- Modify: `server.sh`

- [ ] **Step 1: Expose verifier command**

Add `verify-v220-client-live-redesign` to help text and command dispatcher with
`scripts/internal/verify_v220_client_live_redesign.mjs`.

- [ ] **Step 2: Run verifier**

Run: `./server.sh verify-v220-client-live-redesign`

Expected: FAIL because production route/CSS/docs do not yet satisfy S07 checks.

### Task 3: Client viewer workspace classes

**Files:**
- Modify: `src/ingress/webrtc_http_server.cpp`
- Modify: `src/ingress/product_ui_page_scripts.cpp`
- Modify: `src/ingress/product_ui_css.cpp`

- [ ] **Step 1: Add shell classes without removing hooks**

Add `client-viewer-workspace`, `client-viewer-dock`, and `client-viewer-detail` to the C++
shell. Preserve `data-testid="client-shell-page"`, `id="views"`, and `id="detail"`.

- [ ] **Step 2: Add JS-rendered S07 classes**

Add `client-live-workspace`, `client-live-layout`, `client-live-primary`,
`client-live-video-grid`, `client-live-dock`, `client-live-event-dock`,
`client-viewer-dashboard`, and `client-viewer-events` classes. Preserve existing ids,
`data-testid`, copy buttons, layout preset controls, tile actions, and live event dock.

- [ ] **Step 3: Add responsive CSS**

Add CSS for S07 classes using existing tokens. Keep video first at mobile widths, wrap
toolbar controls, and prevent text/control overflow.

- [ ] **Step 4: Run verifier**

Run: `./server.sh verify-v220-client-live-redesign`

Expected: FAIL until docs/backlog/inventory are updated.

### Task 4: S07 docs and inventory

**Files:**
- Create: `docs/v220-client-live-redesign.md`
- Modify: `docs/README.md`
- Modify: `docs/development-backlog.md`
- Modify: `docs/stream-verification.md`
- Modify: `docs/project-feature-test-inventory.md`

- [ ] **Step 1: Add S07 source-of-truth doc**

Document scope, viewer redaction, responsive contract, verification, and non-scope.

- [ ] **Step 2: Update docs index and verification docs**

Link S07 from docs index and list `verify-v220-client-live-redesign` in stream verification.

- [ ] **Step 3: Update backlog and feature inventory**

Mark only V220-S07 closure after S07 checks pass. Record UI 풀테스트, 30분, 120분,
published metadata as 미실행 unless actually executed.

- [ ] **Step 4: Run verifier**

Run: `./server.sh verify-v220-client-live-redesign`

Expected: PASS for S07 static contract.

### Task 5: Stabilization and commit

**Files:**
- All S07 files

- [ ] **Step 1: Run required checks**

Run S07-focused and UI/Auth/Ops/Docs checks listed in the design doc.

- [ ] **Step 2: Fix failures inside S07 scope**

If a check fails, fix the S07-related cause and rerun the failed check. If a failure is
outside S07 scope or needs a decision, stop and report.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-06-03-v220-s07-client-live-redesign-design.md docs/superpowers/plans/2026-06-03-v220-s07-client-live-redesign.md scripts/internal/verify_v220_client_live_redesign.mjs server.sh docs/v220-client-live-redesign.md docs/README.md docs/development-backlog.md docs/stream-verification.md docs/project-feature-test-inventory.md src/ingress/webrtc_http_server.cpp src/ingress/product_ui_page_scripts.cpp src/ingress/product_ui_css.cpp
git commit -m "feat: redesign v2.2.0 client live workspace"
```

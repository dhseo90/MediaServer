# V320 S11 Stabilization And Release Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

독자: MediaServer 개발/검증 에이전트. Lifecycle: v3.2.0 Step 11 개발 실행 중 보조 계획으로만 유지. Source-of-truth: AGENTS.md, docs/development-backlog.md, docs/release-test-records.md가 완료/검증/보고 기준을 우선한다.

**Goal:** Close `v3.2.0 (11) Stabilization and Release Readiness` with a local readiness verifier, release/test records, inventory wiring, and explicit not-run boundaries.

**Architecture:** Add one static verifier modeled after the v3.0/v3.1 stabilization readiness gates, wire it through `server.sh`, and update existing roadmap/evidence/inventory documents. This plan does not change product API schemas, Auth/Role/Scope, media paths, or runtime UI behavior.

**Tech Stack:** Node.js verifier scripts, shell dispatch in `server.sh`, Markdown release/test records, C++ build verification through existing `./server.sh build`.

---

### Task 1: RED Gate

**Files:**
- Read: `server.sh`
- Record: `docs/release-test-records.md`

- [x] **Step 1: Run missing command**

Run: `./server.sh verify-v320-stabilization-release-readiness`

Expected: FAIL with `알 수 없는 명령입니다: verify-v320-stabilization-release-readiness`.

### Task 2: Verifier And Dispatch

**Files:**
- Create: `scripts/internal/verify_v320_stabilization_release_readiness.mjs`
- Modify: `server.sh`
- Modify: `scripts/internal/verify_script_inventory.mjs`

- [x] **Step 1: Add verifier script**

Implement a static checker that requires v3.2 Step 11 roadmap status, stream verification row, feature inventory IDs `SAFE-112` and `OPS-079`, release policy/evidence/test records companion commands, not-run boundaries, server dispatch, and script inventory coverage.

- [x] **Step 2: Wire command**

Add `verify-v320-stabilization-release-readiness` usage and dispatch to `server.sh`.

### Task 3: Records And Inventory

**Files:**
- Modify: `docs/development-backlog.md`
- Modify: `docs/stream-verification.md`
- Modify: `docs/project-feature-test-inventory.md`
- Modify: `docs/release-policy.md`
- Modify: `docs/release-evidence-index.md`
- Modify: `docs/release-test-records.md`
- Modify: `scripts/internal/verify_project_feature_test_inventory.mjs`
- Modify: `scripts/internal/verify_feature_inventory_coverage.mjs`
- Modify: existing `scripts/internal/verify_v320_*.mjs` range checks as needed

- [x] **Step 1: Register Step 11**

Mark Step 11 complete only as local readiness gate wiring. Document the exact verifier, files, command scope, and non-evidence boundaries.

- [x] **Step 2: Add inventory IDs**

Add `SAFE-112` and `OPS-079`, update summary counts from 609 to 611, and keep UI direct/indirect counts unchanged while increasing UI non-target/stability/test totals.

- [x] **Step 3: Add release/test evidence boundaries**

Record RED/final/local gate rows, UI/30m/120m/published/release-action/field-smoke not-run rows, token usage row, and temp cleanup row.

### Task 4: Verification

**Files:**
- No production code expected

- [x] **Step 1: Run local readiness verifier**

Run: `./server.sh verify-v320-stabilization-release-readiness`

Expected: PASS with fail 0.

- [x] **Step 2: Run companion local gates**

Run the Step 11 approved local stabilization set only. Do not run 30분, 120분, UI 풀테스트, published metadata, PR/main/tag/GitHub Release, or field smoke.

- [x] **Step 3: Diff check and approved commit preparation**

Run `git diff --check`, inspect `git status --short`, then stage only Step 11 files and commit after verification because the latest user request explicitly says to commit after this step is complete.

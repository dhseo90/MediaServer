# v2.3.0 Operational Evidence Steps 5-7 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete only the user-requested v2.3.0 operational evidence categories: Ops backup/recovery lifecycle, conditional ONVIF/external TURN/WHEP evidence, and VLM opt-in operational evidence.

**Architecture:** Add v2.3.0 step-specific static/runtime evidence gates that compose existing verifiers, require redacted documentation and release ledger rows, and keep actual field/provider success separate from default release PASS. Do not change Event POST, WebRTC DataChannel, SSE/WS metadata, RTSP/WebRTC media path, Auth/session/scope, or Rule/Profile payload schema.

**Tech Stack:** Node.js verifier scripts in `scripts/internal/`, `server.sh` command dispatch, Markdown evidence docs, JSON fixtures, existing C++17/GStreamer server left unchanged unless a verifier proves a scoped need.

---

### Task 1: Ops Backup/Recovery Evidence Lifecycle

**Files:**
- Create: `scripts/internal/verify_v230_ops_backup_recovery_lifecycle.mjs`
- Modify: `server.sh`
- Modify: `docs/ops-backup-recovery.md`
- Modify: `docs/development-backlog.md`
- Modify: `docs/release-evidence-index.md`
- Modify: `docs/project-feature-test-inventory.md`

- [ ] **Step 1: Write the failing verifier**

Create a verifier that checks for `media-server.v230-ops-backup-recovery-lifecycle.v1`, runs `verify_ops_backup_restore_dry_run.mjs`, runs `run_ops_evidence_retention_cleanup.mjs` in dry-run and apply fixture modes, and requires docs/backlog/evidence/inventory snippets for staging drill, redacted evidence bundle, retention cleanup, and no operational backup completion claim.

- [ ] **Step 2: Run RED**

Run: `node scripts/internal/verify_v230_ops_backup_recovery_lifecycle.mjs`
Expected: FAIL because `server.sh`, docs, release evidence, and inventory do not yet expose the v2.3.0 lifecycle gate.

- [ ] **Step 3: Implement GREEN**

Add the `verify-v230-ops-backup-recovery-lifecycle` command, document the lifecycle boundary, add a release evidence row, mark the matching roadmap row complete only for this verified gate, and add inventory coverage.

- [ ] **Step 4: Verify and commit**

Run:

```bash
./server.sh verify-v230-ops-backup-recovery-lifecycle
./server.sh verify-ops-backup-recovery-guide
./server.sh verify-ops-backup-restore-dry-run
./server.sh verify-ops-evidence-retention-cleanup
./server.sh verify-release-evidence-index
./server.sh verify-feature-inventory-coverage
git diff --check
```

Commit: `docs: add v230 ops backup recovery lifecycle evidence`

### Task 2: Conditional ONVIF/external TURN/WHEP Evidence

**Files:**
- Create: `scripts/internal/verify_v230_conditional_field_evidence.mjs`
- Modify: `server.sh`
- Modify: `docs/onvif-field-smoke-gate.md`
- Modify: `docs/external-turn-whep-field-gate.md`
- Modify: `docs/development-backlog.md`
- Modify: `docs/release-evidence-index.md`
- Modify: `docs/project-feature-test-inventory.md`

- [ ] **Step 1: Write the failing verifier**

Create a verifier that composes `verify_onvif_field_smoke_gate.mjs` and `verify_external_turn_whep_field_gate.mjs`, and requires v2.3.0 conditional evidence language: approved environment only, redacted field report only, no real device/credential default PASS, not-run/excluded recorded as stability conditions.

- [ ] **Step 2: Run RED**

Run: `node scripts/internal/verify_v230_conditional_field_evidence.mjs`
Expected: FAIL until v2.3.0 docs/backlog/evidence/inventory expose the conditional field evidence gate.

- [ ] **Step 3: Implement GREEN**

Add `verify-v230-conditional-field-evidence`, update ONVIF and external TURN/WHEP docs, mark the matching roadmap row complete only for the verified conditional evidence boundary, and add release/inventory rows.

- [ ] **Step 4: Verify and commit**

Run:

```bash
./server.sh verify-v230-conditional-field-evidence
./server.sh verify-onvif-field-smoke-gate
./server.sh verify-external-turn-whep-field-gate
./server.sh verify-release-evidence-index
./server.sh verify-feature-inventory-coverage
git diff --check
```

Commit: `docs: add v230 conditional field evidence gate`

### Task 3: VLM Opt-In Operational Evidence

**Files:**
- Create: `scripts/internal/verify_v230_vlm_opt_in_operational_evidence.mjs`
- Modify: `server.sh`
- Modify: `docs/vlm-runtime-opt-in-contract.md`
- Modify: `docs/vlm-local-runtime-connection-smoke.md`
- Modify: `docs/vlm-cloud-provider-field-smoke-gate.md`
- Modify: `docs/vlm-privacy-transfer-guard.md`
- Modify: `docs/development-backlog.md`
- Modify: `docs/release-evidence-index.md`
- Modify: `docs/project-feature-test-inventory.md`

- [ ] **Step 1: Write the failing verifier**

Create a verifier that composes `verify_vlm_runtime_opt_in_contract.mjs`, `verify_vlm_local_runtime_smoke.mjs`, `verify_vlm_cloud_provider_field_smoke_gate.mjs`, and `verify_vlm_privacy_transfer_guard.mjs`, and requires v2.3.0 evidence language: operator-approved promotion, local/provider smoke intake, privacy/default-off evidence, no EventRecord/API schema mixing, and no VLM default-on.

- [ ] **Step 2: Run RED**

Run: `node scripts/internal/verify_v230_vlm_opt_in_operational_evidence.mjs`
Expected: FAIL until v2.3.0 docs/backlog/evidence/inventory expose the VLM operational evidence gate.

- [ ] **Step 3: Implement GREEN**

Add `verify-v230-vlm-opt-in-operational-evidence`, update VLM docs, mark the matching roadmap row complete only for this verified operational evidence boundary, and add release/inventory rows.

- [ ] **Step 4: Verify and commit**

Run:

```bash
./server.sh verify-v230-vlm-opt-in-operational-evidence
./server.sh verify-vlm-runtime-opt-in-contract
./server.sh verify-vlm-local-runtime-smoke
./server.sh verify-vlm-cloud-provider-field-smoke-gate
./server.sh verify-vlm-privacy-transfer-guard
./server.sh verify-release-evidence-index
./server.sh verify-feature-inventory-coverage
git diff --check
```

Commit: `docs: add v230 vlm opt-in operational evidence`

### Task 4: Final Goal Audit

**Files:**
- Read-only audit unless a verifier identifies scoped drift.

- [ ] **Step 1: Confirm commits and clean status**

Run:

```bash
git status --short --branch
git log --oneline -3
```

- [ ] **Step 2: Check no out-of-scope roadmap category was modified as completed**

Inspect `docs/development-backlog.md` and changed files. Confirm no v2.3.0 category outside the three requested development contents was newly claimed complete.

- [ ] **Step 3: Report**

Report requested scope, completed evidence, unrun long tests/UI fulltest, verifier coverage and exclusions, commits, and push eligibility. Do not push.

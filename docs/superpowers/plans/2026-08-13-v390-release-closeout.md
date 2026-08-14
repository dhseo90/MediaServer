# v3.9.0 Release Closeout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote the verified UI source to `v3.9.0`, produce same-source full release evidence, merge through a reviewed PR, publish v3.9.0, and remove temporary verification state.

**Architecture:** Keep product behavior frozen and treat the verified commit as the only promotion base. The no-argument release launcher owns build, feature gates, 30-minute stability, exact UI, 120-minute decision/run, cleanup, and final integrity; publication begins only after that evidence is green.

**Tech Stack:** Git, Bash launchers, Node.js ESM verifiers, CMake C++17 build, Playwright, GitHub PR/release workflow.

## Global Constraints

- Product behavior and `src/**` remain unchanged during release closeout unless `./test_release.sh` proves a release-blocking product defect.
- Static/replay evidence never substitutes for Actual UI or long-run evidence.
- Do not rerun `./test_ui.sh` separately; `./test_release.sh` owns the canonical exact UI run.
- Do not claim release-ready before 30-minute, exact UI, triggered 120-minute, cleanup, and final integrity all pass on one release source.
- Do not create or move tags, publish a GitHub Release, or delete the release branch after a failure.
- Preserve `main`, `v2.0.0`, `v3.3.0`, and `v3.9.0`; temporary verification branches are removed only after the verified work is contained in the final branch and main.

---

### Task 1: Documentation and verified source checkpoint

**Files:**
- Modify: `docs/release-test-records.md`
- Modify: `docs/release-evidence-index.md`
- Modify: `docs/development-backlog.md`
- Modify: `.superpowers/sdd/2026-08-11-v390-verification-runner-rebase/progress.md`
- Modify: `docs/v390-full-status-failure-and-handoff-2026-08-12.md`
- Modify: `docs/v390-current-state-and-verification-debt-audit-2026-08-12.md`
- Create the draft, then publish it as: `docs/release-artifacts/v3.9.0/release-notes.md`

- [x] Record `47582fea` UI `424/424`, Policy `424/424`, cleanup, and UI final-integrity without claiming full release PASS.
- [x] Mark the two 2026-08-12 failure audits as historical and link the current source-of-truth.
- [x] Run docs, metadata, inventory, semantic, syntax, and diff gates.
- [x] Commit and push the documentation checkpoint (`b7cd2e77`).

### Task 2: Promote the verified source to v3.9.0

**Files:** Git refs only.

- [x] Confirm no stale worktree registration remains.
- [x] Fast-forward `v3.9.0` to the verified documentation checkpoint.
- [x] Push `origin/v3.9.0` and verify ahead/behind `0/0` with a clean worktree.

### Task 3: Run canonical full release acceptance

**Files:**
- Generated final evidence: `docs/release-artifacts/v3.9.0/test-acceptance-current-final/`

- [x] Run `./test_release.sh` without arguments exactly once on clean `v3.9.0` source `c6b3d20a`.
- [x] Require build/feature gates, 30-minute, exact UI `424/424`, Policy v4, triggered 120-minute, cleanup, and final-integrity PASS.
- [ ] If a gate fails, fix the shared root cause, rerun required static verification, commit, push, and run the complete launcher again on the new source; preserve each failure history.

### Task 4: Final evidence and publication

**Files:**
- Modify: release records, evidence index, backlog, release notes, public version metadata after publication.

- [x] Record the full release run with source/build/manifest/evidence hashes and all exclusions.
- [ ] Verify no tracked temporary outputs, stale generated files, dead helpers, or current-source references to local ignored artifacts remain.
- [ ] Create the PR from `v3.9.0` to `main`, require all checks and zero blocking annotations, then merge.
- [ ] Create and verify the signed `v3.9.0` tag, publish the GitHub Release, and run published metadata verification.
- [ ] Remove temporary local/remote verification branches and stale worktree metadata only after containment is proven.

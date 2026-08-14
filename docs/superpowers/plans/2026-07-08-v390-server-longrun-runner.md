# v3.9.0 Server Longrun Runner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a v3.9.0 server longrun runner that records one-command, stop-on-first-fail, later-phase `not-run`, summary/report, and cleanup evidence for 30/120 minute server longrun runs.

**Architecture:** Add a dedicated Node.js runner and a fast contract verifier. The contract verifier uses short success/failure fixtures so it can prove summary/report semantics without executing a real 30-minute or 120-minute longrun; real duration runs remain approval-gated by AGENTS.

**Tech Stack:** `server.sh` dispatch, Node.js verifier/runner scripts, Markdown release/test evidence, existing MediaServer shell/verifier conventions.

---

## File Structure

- Create: `scripts/internal/verify_v390_server_longrun.mjs`
  - Owns the v3.9.0 longrun command, phase ordering, fail-fast behavior, summary JSON, Markdown report, and cleanup fields.
- Create: `scripts/internal/verify_v390_server_longrun_runner_contract.mjs`
  - Fast RED/GREEN verifier for runner CLI, schema, failure fixture, later-phase `not-run`, docs, dispatch, and script inventory.
- Modify: `server.sh`
  - Adds `verify-v390-server-longrun` and `verify-v390-server-longrun-runner-contract` help and dispatch entries.
- Modify: `docs/stream-verification.md`
  - Records the new runner as an implementation command and preserves the boundary that contract fixtures are not real longrun evidence.
- Modify: `docs/project-feature-test-inventory.md`
  - Maps the runner/contract to `OPS-168` and `SAFE-201` without claiming actual 30/120 execution.
- Modify: `docs/release-test-records.md`
  - Adds R1 RED/final rows and a not-run record for real 30/120 duration execution unless explicitly approved.
- Modify: `docs/release-evidence-index.md`
  - Adds the runner/contract as local implementation evidence, not published or real-duration evidence.

### Task 1: Contract Verifier RED

**Files:**
- Create: `scripts/internal/verify_v390_server_longrun_runner_contract.mjs`
- Modify later: `server.sh`

- [x] **Step 1: Write the failing contract verifier**

```js
const runnerScript = "scripts/internal/verify_v390_server_longrun.mjs";
const command = "verify-v390-server-longrun";
const contractCommand = "verify-v390-server-longrun-runner-contract";
assert(fs.existsSync(path.join(rootDir, runnerScript)), "missing runner script");
assert(server.includes(command), "server.sh missing longrun command");
assert(server.includes(contractCommand), "server.sh missing contract command");
```

- [x] **Step 2: Run the verifier directly and confirm RED**

Run: `node scripts/internal/verify_v390_server_longrun_runner_contract.mjs`

Expected: FAIL because the runner script and dispatch entries do not exist yet.

### Task 2: Runner GREEN

**Files:**
- Create: `scripts/internal/verify_v390_server_longrun.mjs`

- [x] **Step 1: Implement minimal CLI parsing**

```js
const options = parseArgs(process.argv.slice(2));
// Required options: --duration-minutes, --output-dir.
// Test fixture options: --fixture-pass, --fixture-fail-phase <phase-id>.
```

- [x] **Step 2: Implement fixed phase order and fail-fast recording**

```js
const phaseIds = [
  "preflight",
  "build",
  "seed",
  "start-server",
  "integrated-smoke",
  "soak-case-loop",
  "runtime-idle",
  "cleanup",
  "report",
];
```

- [x] **Step 3: Implement summary/report writer**

```js
const summary = {
  schema: "media-server.v390-server-longrun.v1",
  stopOnFirstFail: true,
  failedPhase,
  failedCase,
  phases,
  cleanup,
};
```

- [x] **Step 4: Verify the failure fixture**

Run: `node scripts/internal/verify_v390_server_longrun.mjs --duration-minutes 30 --output-dir /tmp/v390-longrun-contract-fail --fixture-fail-phase integrated-smoke`

Expected: non-zero exit, `failedPhase=integrated-smoke`, later phases recorded as `not-run`, summary/report written, cleanup state present.

### Task 3: Dispatch And Docs

**Files:**
- Modify: `server.sh`
- Modify: `docs/stream-verification.md`
- Modify: `docs/project-feature-test-inventory.md`
- Modify: `docs/release-test-records.md`
- Modify: `docs/release-evidence-index.md`

- [x] **Step 1: Add `server.sh` help and dispatch**

```bash
verify-v390-server-longrun)
  require_internal verify_v390_server_longrun.mjs
  exec "${INTERNAL_DIR}/verify_v390_server_longrun.mjs" "$@"
  ;;
verify-v390-server-longrun-runner-contract)
  require_internal verify_v390_server_longrun_runner_contract.mjs
  exec "${INTERNAL_DIR}/verify_v390_server_longrun_runner_contract.mjs" "$@"
  ;;
```

- [x] **Step 2: Update docs and inventory**

Document that `verify-v390-server-longrun-runner-contract` is fast contract evidence, while real `verify-v390-server-longrun --duration-minutes 30/120` execution remains approval-gated and must not be reported as PASS unless actually run.

- [x] **Step 3: Run script inventory**

Run: `./server.sh verify-script-inventory`

Observed: after rewriting future R2/R3/R5 roadmap command references as planned command
names instead of executable command claims, `./server.sh verify-script-inventory` passes
with `pass=11 fail=0`.

### Task 4: Verification

**Files:**
- Verify all files touched in R1.

- [x] **Step 1: Run R1 contract**

Run: `./server.sh verify-v390-server-longrun-runner-contract`

Expected: PASS, including failure fixture evidence.

- [x] **Step 2: Run short fixture pass**

Run: `./server.sh verify-v390-server-longrun --duration-minutes 30 --output-dir /tmp/v390-longrun-contract-pass --fixture-pass`

Expected: PASS, summary/report written, phases PASS, cleanup state present. This is not real 30-minute evidence.

- [x] **Step 3: Run hygiene checks**

Run: `./server.sh verify-script-inventory` and `git diff --check`

Observed: `./server.sh verify-script-inventory` passes with `pass=11 fail=0`, and
`git diff --check` has no output.

- [x] **Step 4: Record not-run boundary**

Do not run the real 30-minute or 120-minute longrun unless the user explicitly approves that test category. Record the missing real-duration run as `미실행/승인 필요`, not PASS.

- [x] **Step 5: Run approved real 30-minute longrun**

Run: `./server.sh verify-v390-server-longrun --duration-minutes 30 --output-dir docs/release-artifacts/v3.9.0/server-longrun-30min-final`

Observed: user-approved final run passed with `longrunEvidenceStatus=real-duration-evidence`.
Runner summary is `result=PASS`; delegated predev summary is `status=pass`, `pass=118`,
`fail=0`, `skip=2`, `durationSec=2341`, `soakMinutes=30`. The 120-minute run remains not run.

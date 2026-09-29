#!/usr/bin/env node
// 파일 용도: v3.9.0 승인/closure 회귀 입력과 현행 정의를 검사한다. 현재 작업의 승인·완료 판정이 아니다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

import { validateV390ReviewHistory, validateCurrentGateDocumentation } from "./documentation_contract_lib.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 user review gate verification

Usage:
  ./server.sh verify-v390-user-review-gate

Checks:
  - v3.9.0 Foundation Step 3 initial review-ready state is preserved as a historical snapshot
  - preserved v3.9 history reconciles pending/blocked and later recorded closure; not current authorization
  - required/candidate/structure/excluded lists are fixed for user review
  - initial feature development remained blocked until explicit user approval
  - current feature definitions, dispatch and policy are checked without historical central ledgers

Not run by this command:
  - feature implementation
  - UI fulltest
  - 30/120 minute longrun
  - published metadata verification
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v390-user-review-gate";
const targetScript = "verify_v390_user_review_gate.mjs";
const files = {
  featureInventory: readText("docs/v390-feature-completion-inventory.md"),
  streamVerification: readText("docs/stream-verification.md"),
  projectInventory: readText("docs/project-feature-test-inventory.md"),
  serverSh: readText("server.sh"),
  scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
};

const checks = [];
const historical = JSON.parse(readText("test/fixtures/v390_user_review_history.json"));
const history = validateV390ReviewHistory(historical);

check("historical review input preserves pending/blocked and later closure", () => {
  assert(history.errors.length === 0, history.errors.join("; "));
});

check("feature inventory separates the initial snapshot from current closure", () => {
  for (const snippet of [
    "## Initial User Review Output (Historical Snapshot)",
    "Review-ready status: `ready-for-user-review`",
    "Approval status at review gate: `pending-user-approval`",
    "Feature development status at review gate: `blocked-before-user-approval`",
    "Required development list: `V390-REQ-001`, `V390-REQ-002`, `V390-REQ-003`",
    "Original candidate development review list: `V390-CAND-001`, `V390-CAND-002`, `V390-CAND-003`, `V390-CAND-004`, `V390-CAND-005`, `V390-CAND-006`, `V390-CAND-007`, `V390-CAND-008`, `V390-CAND-009`, `V390-CAND-010`",
    "Current active candidate development list: `없음`",
    "Closed candidate development list: `V390-CAND-001`, `V390-CAND-002`, `V390-CAND-003`, `V390-CAND-004`, `V390-CAND-005`, `V390-CAND-006`, `V390-CAND-007`, `V390-CAND-008`, `V390-CAND-009`, `V390-CAND-010`",
    "Structure handoff list: `V390-STRUCT-001`, `V390-STRUCT-002`, `V390-STRUCT-003`, `V390-STRUCT-004`, `V390-STRUCT-005`",
    "Excluded/non-scope list: `V390-EXCL-001`, `V390-EXCL-002`, `V390-EXCL-003`, `V390-EXCL-004`, `V390-EXCL-005`, `V390-EXCL-006`",
    "Next development order after approval: `V390-REQ-001` -> `V390-REQ-002` -> `V390-REQ-003`",
    "Future candidate-development rows remain blocked until the user approves each candidate or approves a candidate batch.",
    "## Current User Approval and Closure Status",
    "Current approval status: `approved-through-recorded-user-goals`",
    "Current feature development status: `closed-with-evidence`",
    "Current active required development list: `없음`",
    "Current active candidate development list: `없음`",
    "Initial `pending-user-approval`/`blocked-before-user-approval` 값은 Step 3 당시의 historical",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory user review output");
  }
});

check("initial review gate rules remain preserved without overriding current closure", () => {
  for (const snippet of [
    "## Review Gate (Initial Historical Rules)",
    "Discovery is not complete until",
    "the user reviews and approves the required/candidate development list",
    "Until this review gate passes, this file remains a discovery tracking scaffold only.",
    "The review-ready output above does not mean the user has approved feature development.",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory review gate");
  }
});

check("stream verification and project inventory map Step 3", () => {
  for (const snippet of [
    "v3.9.0 (3)",
    command,
    "test/fixtures/v390_user_review_history.json",
    "approved-through-recorded-user-goals",
    "closed-with-evidence",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification");
  }
  for (const snippet of [
    "v3.9.0 (3) User Review Gate / 개발 순서 확정",
    "`OPS-165`, `SAFE-198`",
    command,
    "| SAFE-198 |",
    "| OPS-165 |",
    "blocked-before-user-approval",
  ]) {
    assertIncludes(files.projectInventory, snippet, "project inventory");
  }
});

check("current feature definitions and dispatch are independent of historical records", () => {
  const errors = validateCurrentGateDocumentation({read: readText, command, script: targetScript, featureIds: ["SAFE-198", "OPS-165"]});
  assert(errors.length === 0, errors.join("; "));
});

check("server.sh and script inventory include the Step 3 verifier", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, targetScript, "server.sh dispatch target");
  assertIncludes(files.scriptInventory, targetScript, "script inventory");
});

check("SAFE-198 canonical user review closure boundary", () => {
  const historicalSnapshotPreserved = history.historicalSnapshotPreserved;
  const historicalApprovalClosed = historicalSnapshotPreserved && historical.laterRecordedClosure.development === "closed-with-evidence";
  const executionPassClaimed = history.executionPassClaimed;
  const safe198BoundaryObserved = historicalSnapshotPreserved && historicalApprovalClosed && files.projectInventory.includes("SAFE-198");
  const ops165ReviewObserved = safe198BoundaryObserved;
  assert(ops165ReviewObserved && safe198BoundaryObserved && executionPassClaimed === false &&
    history.currentApprovalStatus === "not-assessed" && history.currentFeatureDevelopmentStatus === "not-assessed",
    "SAFE-198 historical review must not authorize current work or claim UI longrun published metadata release execution PASS");
});

const results = runChecks();
console.log("");
console.log("== v3.9.0 user review gate summary ==");
console.log("- schema: media-server.v390-user-review-gate.v2");
console.log(`- command: ${command}`);
console.log("- reviewReadyStatus: ready-for-user-review");
console.log("- approvalStatusAtReviewGate: pending-user-approval");
console.log("- featureDevelopmentAtReviewGate: blocked-before-user-approval");
console.log("- currentApprovalStatus: not-assessed");
console.log("- historicalApprovalStatus: approved-through-recorded-user-goals");
console.log("- currentFeatureDevelopmentStatus: not-assessed");
console.log("- historicalFeatureDevelopmentStatus: closed-with-evidence");
console.log("- historicalActiveCandidateDevelopment: none");
console.log("- historicalClosedCandidateDevelopment: V390-CAND-001..V390-CAND-010");
console.log("- userApprovalReconciliation: historical-regression-only");
console.log("- featureImplementation: not-run-by-this-command");
console.log("- uiFulltest: not-run-by-this-command");
console.log("- longrun30Or120: not-run-by-this-command");
console.log("- publishedMetadata: not-run-by-this-command");
console.log(`- pass: ${results.pass}`);
console.log(`- fail: ${results.fail}`);
if (results.fail > 0) process.exit(1);

function runChecks() {
  let pass = 0;
  let fail = 0;
  for (const item of checks) {
    try {
      item.fn();
      pass += 1;
      console.log(`[pass] ${item.name}`);
    } catch (error) {
      fail += 1;
      console.log(`[fail] ${item.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { pass, fail };
}

function check(name, fn) {
  checks.push({ name, fn });
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(text, snippet, label) {
  assert(text.includes(snippet), `${label} missing snippet: ${snippet}`);
}

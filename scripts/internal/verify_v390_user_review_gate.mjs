#!/usr/bin/env node
// 파일 용도: v3.9.0 Foundation 사용자 review gate와 승인 전 기능 개발 중단 경계를 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 user review gate verification

Usage:
  ./server.sh verify-v390-user-review-gate

Checks:
  - v3.9.0 Foundation Step 3 is recorded as a review-ready gate, not feature approval
  - required/candidate/structure/excluded lists are fixed for user review
  - feature development remains blocked until explicit user approval
  - stream verification, project inventory, release records/evidence, server dispatch, and script inventory track this gate

Not run by this command:
  - user approval of the development list
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
  backlog: readText("docs/development-backlog.md"),
  featureInventory: readText("docs/v390-feature-completion-inventory.md"),
  streamVerification: readText("docs/stream-verification.md"),
  projectInventory: readText("docs/project-feature-test-inventory.md"),
  releaseRecords: readText("docs/release-test-records.md"),
  releaseEvidence: readText("docs/release-evidence-index.md"),
  serverSh: readText("server.sh"),
  scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
};

const checks = [];

check("development backlog closes Step 3 as review-ready and keeps approval pending", () => {
  for (const snippet of [
    "| 3 | v3.9.0 (3) User Review Gate / 개발 순서 확정 | P0 | 완료 | required/candidate/structure/excluded 목록을 review-ready로 고정하고 사용자 승인 전 기능 개발 중단 |",
    "## v3.9.0 Foundation 개발 기록",
    "Step 3 `User Review Gate / 개발 순서 확정`",
    "`scripts/internal/verify_v390_user_review_gate.mjs`",
    "`./server.sh verify-v390-user-review-gate`",
    "승인 상태: `pending-user-approval`",
    "기능 개발 상태: `blocked-before-user-approval`",
    "다음 개발 착수는 사용자가 v3.9 required/candidate list를 승인한 뒤에만 가능",
  ]) {
    assertIncludes(files.backlog, snippet, "development backlog");
  }
});

check("feature inventory exposes the fixed review output lists", () => {
  for (const snippet of [
    "## User Review Output",
    "Review-ready status: `ready-for-user-review`",
    "Approval status: `pending-user-approval`",
    "Feature development status: `blocked-before-user-approval`",
    "Required development list: `V390-REQ-001`, `V390-REQ-002`, `V390-REQ-003`",
    "Candidate development list: `V390-CAND-001`, `V390-CAND-002`, `V390-CAND-003`, `V390-CAND-004`, `V390-CAND-005`, `V390-CAND-006`, `V390-CAND-007`, `V390-CAND-008`, `V390-CAND-009`, `V390-CAND-010`",
    "Structure handoff list: `V390-STRUCT-001`, `V390-STRUCT-002`, `V390-STRUCT-003`, `V390-STRUCT-004`, `V390-STRUCT-005`",
    "Excluded/non-scope list: `V390-EXCL-001`, `V390-EXCL-002`, `V390-EXCL-003`, `V390-EXCL-004`, `V390-EXCL-005`, `V390-EXCL-006`",
    "Next development order after approval: `V390-REQ-001` -> `V390-REQ-002` -> `V390-REQ-003`",
    "Do not implement candidate-development rows until the user approves each candidate or approves a candidate batch.",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory user review output");
  }
});

check("review gate section still requires explicit user approval before feature development", () => {
  for (const snippet of [
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
    "review-ready required/candidate/structure/excluded list",
    "사용자 승인 전 기능 개발 중단",
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

check("release records and evidence index track Step 3 without approval overclaim", () => {
  for (const snippet of [
    "v390 Step 3 RED user review gate",
    "v390 Step 3 user review gate final",
    "review-ready 목록과 승인 전 기능 개발 중단 경계",
    "사용자 review approval",
    "승인 전이며 Step 3 verifier PASS로 대체하지 않음",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records");
  }
  for (const snippet of [
    "v3.9.0 user review gate",
    command,
    "OPS-165",
    "SAFE-198",
    "사용자 승인, 기능 구현, 구조 안정화 구현, 테스트 방식 전환 구현",
  ]) {
    assertIncludes(files.releaseEvidence, snippet, "release evidence");
  }
});

check("server.sh and script inventory include the Step 3 verifier", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, targetScript, "server.sh dispatch target");
  assertIncludes(files.serverSh, "v3.9.0 User Review Gate와 승인 전 기능 개발 중단 경계를 검증합니다.", "server.sh help phrase");
  assertIncludes(files.scriptInventory, targetScript, "script inventory");
});

const results = runChecks();
console.log("");
console.log("== v3.9.0 user review gate summary ==");
console.log("- schema: media-server.v390-user-review-gate.v1");
console.log(`- command: ${command}`);
console.log("- reviewReadyStatus: ready-for-user-review");
console.log("- approvalStatus: pending-user-approval");
console.log("- featureDevelopment: blocked-before-user-approval");
console.log("- userApproval: not-run-by-this-command");
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

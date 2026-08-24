#!/usr/bin/env node
// 파일 용도: v4.0.0 정책/안정화 범위와 v4.1.0 신규 기능 경계를 사용자 승인 기록으로 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v4.0.0 user review gate verification

Usage:
  ./server.sh verify-v400-user-review-gate

Checks:
  - recorded user goals lock v4.0.0 to local operations policy and stabilization
  - v4.1.0 new-feature candidates stay blocked until v4.0.0 completes
  - in-scope steps 3-8 remain not-executed
  - inventory, stream-verification, records, fixture, and server.sh dispatch are wired

Not run by this command:
  - v4.0.0 steps 3-8 implementation
  - UI fulltest
  - 30/120 minute longrun
  - published metadata verification
  - tag, push, GitHub Release
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v400-user-review-gate";
const targetScript = "verify_v400_user_review_gate.mjs";
const fixturePath = "test/fixtures/v400_user_review_gate.json";
const expectedInScope = [
  "v4.0.0 (3) 검증 계층 축소 규칙",
  "v4.0.0 (4) 로컬 운영 정책 freeze",
  "v4.0.0 (5) Incident OS 정책화",
  "v4.0.0 (6) Evidence 운영 정책화",
  "v4.0.0 (7) 로컬 운영 안정화",
  "v4.0.0 (8) stabilization and release readiness",
];
const expectedOutOfScope = [
  "v4.1.0 (1) Incident OS 제품 승격",
  "v4.1.0 (2) Evidence default-on 제품화",
  "v4.1.0 (3) 로컬 Action Execution",
  "v4.1.0 (4) 로컬 credential store",
  "v4.1.0 (5) Tracker 제품 기본 선택",
  "v4.1.0 (6) 로컬 VLM 운영 경로",
];

const files = {
  backlog: readText("docs/development-backlog.md"),
  streamVerification: readText("docs/stream-verification.md"),
  projectInventory: readText("docs/project-feature-test-inventory.md"),
  releaseRecords: readText("docs/release-test-records.md"),
  releaseEvidence: readText("docs/release-evidence-index.md"),
  serverSh: readText("server.sh"),
};
const fixture = JSON.parse(readText(fixturePath));
const checks = [];

check("review-gate fixture locks policy/stabilization and blocks v4.1.0 features", () => {
  assert(fixture.schema === "media-server.v400-user-review-gate.v1", "fixture schema mismatch");
  assert(fixture.decisionId === "V400-REVIEW-GATE-02", "fixture decisionId mismatch");
  assert(fixture.sourceRelease === "v4.0.0", "fixture sourceRelease mismatch");
  assert(fixture.latestPublished === "v3.9.1", "fixture latestPublished mismatch");
  assert(fixture.status === "approved-through-recorded-user-goals", "fixture status mismatch");
  assert(fixture.implementationStatus === "not-executed", "fixture must not claim steps 3-8 executed");
  assert(fixture.primarySelection === "로컬 운영 정책화 및 안정화", "primary selection drifted");
  assert(fixture.approval?.approved === true, "fixture approval.approved must be true");
  assert(fixture.approval?.newFeatureDevelopment === "blocked-until-v400-complete",
    "new-feature development is not blocked");
  assert(fixture.approval?.v400Steps3to8 === "approved-to-implement-in-order",
    "steps 3-8 are not approved to implement in order");
  assertEqualList(fixture.inScope, expectedInScope, "inScope");
  assertEqualList(fixture.outOfScopeUntilV410, expectedOutOfScope, "outOfScopeUntilV410");
  for (const snippet of [
    "ONVIF 실카메라 성공",
    "외부 TURN/WHEP field",
    "cloud VLM 제품 호출",
    "VMS/NVR",
    "승인 없는 action write",
    "구조 리팩터를 v4.0.0 본작업으로 다시 여는 것",
  ]) {
    assert(fixture.excluded.includes(snippet), `fixture excluded missing: ${snippet}`);
  }
  assert(fixture.constraints?.eventPostSchema === "unchanged", "Event POST schema constraint drifted");
  assert(fixture.constraints?.evidenceDefaultOn === "deferred-to-v4.1.0", "evidence default-on constraint drifted");
});

check("development backlog records the approved scope and keeps steps 3-8 not implemented", () => {
  for (const snippet of [
    "### v4.0.0 User Review Gate",
    "승인 상태: `approved-through-recorded-user-goals`",
    "1차 선택값: **로컬 운영 정책화 및 안정화**",
    "신규 기능 개발 상태: `blocked-until-v400-complete`",
    "v4.0.0 (3)~(8) 구현 상태: `approved-to-implement-in-order` / `not-executed`",
    "`scripts/internal/verify_v400_user_review_gate.mjs`",
    "`./server.sh verify-v400-user-review-gate`",
    fixturePath,
    "| 2 | v4.0.0 (2) User Review Gate | P0 | 완료 |",
    "| 3 | v4.0.0 (3) 검증 계층 축소 규칙 | P0 | 미완료 |",
    "4.0.0에서 구현하지 않는다",
  ]) {
    assertIncludes(files.backlog, snippet, "development backlog");
  }
});

check("stream verification, inventory, and records wire v4.0.0 (2)", () => {
  for (const snippet of [
    "v4.0.0 (2)",
    "./server.sh verify-v400-user-review-gate",
    "approved-through-recorded-user-goals",
    "blocked-until-v400-complete",
    "UI 풀테스트, 30분/120분, published metadata, release action evidence가 아닙니다",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification");
  }
  for (const snippet of [
    "v4.0.0 (2) User Review Gate",
    "`OPS-165`, `SAFE-198` inherited scope",
    "verify-v400-user-review-gate",
  ]) {
    assertIncludes(files.projectInventory, snippet, "project inventory");
  }
  for (const snippet of [
    "V400 user review gate",
    "./server.sh verify-v400-user-review-gate",
    fixturePath,
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release test records");
  }
  for (const snippet of [
    "v4.0.0 user review gate",
    "verify-v400-user-review-gate",
    "V400-REVIEW-GATE-02",
  ]) {
    assertIncludes(files.releaseEvidence, snippet, "release evidence index");
  }
});

check("server.sh dispatches verify-v400-user-review-gate", () => {
  assertIncludes(files.serverSh, command, "server.sh");
  assertIncludes(files.serverSh, targetScript, "server.sh");
});

check("review gate does not claim execution PASS", () => {
  const noExecutionPass = files.releaseRecords.includes("published metadata PASS가 아님") ||
    files.streamVerification.includes("published metadata, release action evidence가 아닙니다");
  assert(noExecutionPass, "v4.0.0 (2) must not claim UI/longrun/published metadata PASS");
  assert(fixture.notEvidence.includes("v4.0.0 steps 3-8 implementation"),
    "fixture must record steps 3-8 as not evidence");
});

const results = runChecks();
console.log("");
console.log("== v4.0.0 user review gate summary ==");
console.log("- schema: media-server.v400-user-review-gate.v1");
console.log(`- command: ${command}`);
console.log(`- decisionId: ${fixture.decisionId}`);
console.log(`- status: ${fixture.status}`);
console.log(`- implementationStatus: ${fixture.implementationStatus}`);
console.log(`- primarySelection: ${fixture.primarySelection}`);
console.log(`- inScope: ${fixture.inScope.length}`);
console.log(`- outOfScopeUntilV410: ${fixture.outOfScopeUntilV410.length}`);
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

function assertEqualList(actual, expected, label) {
  assert(Array.isArray(actual), `${label} must be an array`);
  assert(actual.length === expected.length, `${label} length ${actual.length} != ${expected.length}`);
  for (const item of expected) {
    assert(actual.includes(item), `${label} missing ${item}`);
  }
}

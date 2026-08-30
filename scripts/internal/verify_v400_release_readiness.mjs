#!/usr/bin/env node
// 파일 용도: v4.0.0 release readiness(네 영역 판정, 30분 executed-pass, UI 미실행 blocker, close-out dry-run)를 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v4.0.0 release readiness verification

Usage:
  ./server.sh verify-v400-release-readiness

Checks:
  - four AGENTS test areas are judged with 30-minute executed-pass and UI unrun required blocker
  - 120-minute soak stays conditional-not-run
  - close-out helper remains dry-run and does not create tag/GitHub Release
  - inventory, stream-verification, records, fixture, and server.sh dispatch are wired

Not run by this command:
  - 30-minute soak (records the executed-pass; does not re-run the soak)
  - UI fulltest
  - 120-minute longrun
  - published metadata verification
  - tag, push, GitHub Release, PR, main merge
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v400-release-readiness";
const targetScript = "verify_v400_release_readiness.mjs";
const fixturePath = "test/fixtures/v400_release_readiness.json";
const expectedCategories = ["안정화 테스트", "30분 테스트", "UI 풀테스트", "120분 테스트"];

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

check("release-readiness fixture records four-area judgment after 30-minute pass", () => {
  assert(fixture.schema === "media-server.v400-release-readiness.v1", "fixture schema mismatch");
  assert(fixture.decisionId === "V400-RELEASE-READINESS-08", "fixture decisionId mismatch");
  assert(fixture.sourceRelease === "v4.0.0", "fixture sourceRelease mismatch");
  assert(fixture.latestPublished === "v3.9.1", "fixture latestPublished mismatch");
  assert(fixture.status === "readiness-recorded", "fixture status mismatch");
  assert(fixture.implementationStatus === "policy-steps-complete-30min-pass-ui-unrun",
    "fixture must record 30-minute pass while keeping UI/release-action unrun");
  assertEqualList(fixture.testAreaJudgment.map((item) => item.category), expectedCategories, "testAreaJudgment");
  const byCategory = Object.fromEntries(fixture.testAreaJudgment.map((item) => [item.category, item]));
  assert(byCategory["안정화 테스트"].judgment === "진행 대상", "안정화 판정 drifted");
  assert(byCategory["30분 테스트"].approvalStatus === "executed-pass", "30분 executed-pass drifted");
  assert(byCategory["30분 테스트"].judgment === "진행 대상", "30분 judgment drifted");
  assert(byCategory["UI 풀테스트"].approvalStatus === "unrun-required-blocker", "UI blocker drifted");
  assert(byCategory["120분 테스트"].approvalStatus === "conditional-not-run", "120분 judgment drifted");
  assert(fixture.closeout.mode === "dry-run", "close-out must stay dry-run");
  assert(fixture.closeout.tag === "not-created", "tag must stay not-created");
  assert(fixture.closeout.githubRelease === "not-created", "GitHub Release must stay not-created");
});

check("close-out helper still dispatches and this command is wired", () => {
  assertIncludes(files.serverSh, fixture.closeout.helperCommand, "server.sh close-out helper");
  assertIncludes(files.serverSh, command, "server.sh");
  assertIncludes(files.serverSh, targetScript, "server.sh");
});

check("backlog records v4.0.0 (8) readiness with 30-minute pass and UI unrun", () => {
  for (const snippet of [
    "### v4.0.0 stabilization and release readiness",
    "상태: `readiness-recorded`",
    "구현 상태: `policy-steps-complete-30min-pass-ui-unrun`",
    "unrun-required-blocker",
    "executed-pass",
    "conditional-not-run",
    "`scripts/internal/verify_v400_release_readiness.mjs`",
    "`./server.sh verify-v400-release-readiness`",
    fixturePath,
    "| 8 | v4.0.0 (8) stabilization and release readiness | P0 | 완료 |",
  ]) {
    assertIncludes(files.backlog, snippet, "development backlog");
  }
  assert(!files.backlog.includes("| 8 | v4.0.0 (8) stabilization and release readiness | P0 | 미완료 |"),
    "step 8 must not remain 미완료");
});

check("stream verification, inventory, and records wire v4.0.0 (8)", () => {
  for (const snippet of [
    "v4.0.0 (8)",
    "./server.sh verify-v400-release-readiness",
    "unrun-required-blocker",
    "executed-pass",
    "UI 풀테스트, 30분/120분, published metadata, release action evidence가 아닙니다",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification");
  }
  for (const snippet of [
    "v4.0.0 (8) stabilization and release readiness",
    "`OPS-163`, `SAFE-196` inherited scope",
    "verify-v400-release-readiness",
    "executed-pass",
  ]) {
    assertIncludes(files.projectInventory, snippet, "project inventory");
  }
  for (const snippet of [
    "V400 release readiness",
    "./server.sh verify-v400-release-readiness",
    fixturePath,
    "executed-pass",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release test records");
  }
  for (const snippet of [
    "v4.0.0 release readiness",
    "verify-v400-release-readiness",
    "V400-RELEASE-READINESS-08",
  ]) {
    assertIncludes(files.releaseEvidence, snippet, "release evidence index");
  }
});

check("release readiness keeps UI/tag unrun and does not treat this command as the soak runner", () => {
  for (const snippet of [
    "this-command-is-not-30-minute-soak-runner",
    "UI fulltest PASS",
    "v4.0.0 tag",
    "GitHub Release",
  ]) {
    assert(fixture.notEvidence.includes(snippet), `fixture notEvidence missing ${snippet}`);
  }
  assert(!fixture.notEvidence.includes("30-minute soak PASS"),
    "fixture must not keep 30-minute soak PASS as current not-run evidence");
  const recordsUiBlocker = files.releaseRecords.includes("unrun-required-blocker");
  assert(recordsUiBlocker, "release records must keep UI as unrun required blocker");
  assert(files.releaseRecords.includes("executed-pass") || files.releaseRecords.includes("3차"),
    "release records must keep the executed 30-minute PASS");
});

const results = runChecks();
console.log("");
console.log("== v4.0.0 release readiness summary ==");
console.log("- schema: media-server.v400-release-readiness.v1");
console.log(`- command: ${command}`);
console.log(`- decisionId: ${fixture.decisionId}`);
console.log(`- status: ${fixture.status}`);
console.log(`- implementationStatus: ${fixture.implementationStatus}`);
console.log("- soak30: executed-pass");
console.log("- uiFulltest: unrun-required-blocker");
console.log("- soak120: conditional-not-run");
console.log("- tag: not-created");
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
  for (let index = 0; index < expected.length; index += 1) {
    assert(actual[index] === expected[index], `${label}[${index}] ${actual[index]} != ${expected[index]}`);
  }
}

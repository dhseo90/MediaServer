#!/usr/bin/env node
// 파일 용도: v4.0.0 release candidate 문서, fresh 30분/UI 대기 상태, 120분 조건부 미실행, close-out dry-run을 검증한다.

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
  - a concrete v4.0.0 release-note candidate exists and is linked
  - historical 30-minute/UI evidence is separated from the fresh rerun pending state
  - 120-minute soak stays conditional-not-run
  - close-out helper remains dry-run and does not create tag/GitHub Release
  - inventory, stream-verification, records, fixture, and server.sh dispatch are wired

Not run by this command:
  - fresh 30-minute soak after the compact handoff change
  - fresh UI fulltest after the compact handoff change
  - 120-minute longrun
  - published metadata verification
  - tag, push, GitHub Release, PR, main merge
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v400-release-readiness";
const targetScript = "verify_v400_release_readiness.mjs";
const fixturePath = "test/fixtures/v400_release_readiness.json";
const releaseNotesPath = "docs/release-artifacts/v4.0.0/release-notes.md";
const expectedCategories = ["안정화 테스트", "30분 테스트", "UI 풀테스트", "120분 테스트"];

const files = {
  backlog: readText("docs/development-backlog.md"),
  streamVerification: readText("docs/stream-verification.md"),
  projectInventory: readText("docs/project-feature-test-inventory.md"),
  releaseRecords: readText("docs/release-test-records.md"),
  releaseEvidence: readText("docs/release-evidence-index.md"),
  docsIndex: readText("docs/README.md"),
  releaseNotes: readText(releaseNotesPath),
  serverSh: readText("server.sh"),
};
const fixture = JSON.parse(readText(fixturePath));
const checks = [];

check("release-readiness fixture records candidate docs and fresh 30-minute/UI pending state", () => {
  assert(fixture.schema === "media-server.v400-release-readiness.v1", "fixture schema mismatch");
  assert(fixture.decisionId === "V400-RELEASE-READINESS-08", "fixture decisionId mismatch");
  assert(fixture.sourceRelease === "v4.0.0", "fixture sourceRelease mismatch");
  assert(fixture.latestPublished === "v3.9.1", "fixture latestPublished mismatch");
  assert(fixture.status === "candidate-docs-ready-tests-pending", "fixture status mismatch");
  assert(fixture.implementationStatus === "policy-steps-complete-fresh-30min-ui-pending",
    "fixture must separate historical PASS from the fresh rerun pending state");
  assert(fixture.candidateStatus.branch === "v4.0.0", "candidate branch mismatch");
  assert(fixture.candidateStatus.minimumIncludedCommit === "09436674028817befcecbe1398348489e7ae88a7",
    "compact handoff boundary commit mismatch");
  assert(fixture.candidateStatus.releaseNotes === "prepared-not-published", "release notes state mismatch");
  assert(fixture.candidateStatus.fresh30Minute === "not-run-required", "fresh 30-minute state mismatch");
  assert(fixture.candidateStatus.freshUiFulltest === "not-run-required", "fresh UI state mismatch");
  assertEqualList(fixture.testAreaJudgment.map((item) => item.category), expectedCategories, "testAreaJudgment");
  const byCategory = Object.fromEntries(fixture.testAreaJudgment.map((item) => [item.category, item]));
  assert(byCategory["안정화 테스트"].judgment === "진행 대상", "안정화 판정 drifted");
  assert(byCategory["30분 테스트"].approvalStatus === "historical-pass-fresh-rerun-pending", "30분 rerun state drifted");
  assert(byCategory["30분 테스트"].judgment === "진행 대상", "30분 judgment drifted");
  assert(byCategory["UI 풀테스트"].approvalStatus === "historical-pass-fresh-rerun-pending", "UI rerun state drifted");
  assert(byCategory["UI 풀테스트"].judgment === "진행 대상", "UI judgment drifted");
  assert(byCategory["120분 테스트"].approvalStatus === "conditional-not-run", "120분 judgment drifted");
  assert(fixture.closeout.mode === "dry-run", "close-out must stay dry-run");
  assert(fixture.closeout.tag === "not-created", "tag must stay not-created");
  assert(fixture.closeout.githubRelease === "not-created", "GitHub Release must stay not-created");
});

check("release-note candidate is concrete, truthful, and linked from the docs index", () => {
  for (const snippet of [
    "# Media Server v4.0.0",
    "09436674028817befcecbe1398348489e7ae88a7",
    "Fresh 30-minute soak: not run; required before release action",
    "Fresh UI fulltest: not run; required before release action",
    "Latest published GitHub Release remains v3.9.1",
    "Product UI, feature",
    "logic, public API schemas, event payloads, metadata schemas",
    "paths are unchanged from the published v3.9.1 product baseline",
  ]) {
    assertIncludes(files.releaseNotes, snippet, releaseNotesPath);
  }
  assertIncludes(files.docsIndex, "release-artifacts/v4.0.0/release-notes.md", "docs index");
  assertIncludes(files.releaseEvidence, "09436674028817befcecbe1398348489e7ae88a7", "release evidence index");
  assertIncludes(files.releaseEvidence, "fresh 30분/UI: 미실행·필수", "release evidence index");
});

check("close-out helper still dispatches and this command is wired", () => {
  assertIncludes(files.serverSh, fixture.closeout.helperCommand, "server.sh close-out helper");
  assertIncludes(files.serverSh, command, "server.sh");
  assertIncludes(files.serverSh, targetScript, "server.sh");
});

check("backlog records v4.0.0 candidate docs with fresh 30-minute and UI pending", () => {
  for (const snippet of [
    "### v4.0.0 stabilization and release readiness",
    "상태: `candidate-docs-ready-tests-pending`",
    "구현 상태: `policy-steps-complete-fresh-30min-ui-pending`",
    "historical-pass-fresh-rerun-pending",
    "conditional-not-run",
    "`scripts/internal/verify_v400_release_readiness.mjs`",
    "`./server.sh verify-v400-release-readiness`",
    fixturePath,
    "| 8 | v4.0.0 (8) stabilization and release readiness | P0 | 완료 |",
  ]) {
    assertIncludes(files.backlog, snippet, "development backlog");
  }
  assert(files.backlog.includes("fresh 30분/UI는 미실행·필수"),
    "step 8 implementation completion must not imply fresh test completion");
});

check("stream verification, inventory, and records separate historical pass from fresh rerun", () => {
  for (const snippet of [
    "v4.0.0 (8)",
    "./server.sh verify-v400-release-readiness",
    "historical-pass-fresh-rerun-pending",
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
    "fresh 30분/UI",
    "09436674028817befcecbe1398348489e7ae88a7",
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

check("release readiness keeps release actions unrun and historical PASS non-current", () => {
  for (const snippet of [
    "this-command-is-not-30-minute-soak-runner",
    "this-command-is-not-ui-fulltest-runner",
    "v4.0.0 tag",
    "GitHub Release",
  ]) {
    assert(fixture.notEvidence.includes(snippet), `fixture notEvidence missing ${snippet}`);
  }
  assert(fixture.notEvidence.includes("fresh 30-minute soak PASS"),
    "fixture must reject a fresh 30-minute PASS claim");
  assert(fixture.notEvidence.includes("fresh UI fulltest PASS"),
    "fixture must reject a fresh UI PASS claim");
  assert(files.releaseRecords.includes("과거 PASS"),
    "release records must preserve historical PASS as non-current evidence");
});

const results = runChecks();
console.log("");
console.log("== v4.0.0 release readiness summary ==");
console.log("- schema: media-server.v400-release-readiness.v1");
console.log(`- command: ${command}`);
console.log(`- decisionId: ${fixture.decisionId}`);
console.log(`- status: ${fixture.status}`);
console.log(`- implementationStatus: ${fixture.implementationStatus}`);
console.log("- soak30: historical-pass-fresh-rerun-pending");
console.log("- uiFulltest: historical-pass-fresh-rerun-pending");
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

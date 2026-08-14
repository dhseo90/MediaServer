#!/usr/bin/env node
// 파일 용도: v2.9.0 S02에서 v2.8 기능군 verifier를 현재 source 기준으로 재실행한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v2.9.0 v2.8 regression bundle verification

Usage:
  ./server.sh verify-v290-v28-regression-bundle

Checks:
  - V290-S02 문서/인벤토리/release record가 v2.8 기능군 재실행 gate를 가리키는지 확인
  - v2.8 S02~S06 verifier를 현재 v2.9 source tree에서 실제 재실행
  - v2.8 완료 evidence 재사용, UI 직접 조작 PASS, 30분/120분, published metadata를 S02 PASS로 승격하지 않는 경계 유지
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];
const subcommands = [
  {
    step: "V280-S02",
    title: "Incident Action Readiness Queue",
    command: "verify-v280-incident-action-readiness-queue",
  },
  {
    step: "V280-S03",
    title: "Approval-gated Rule Draft Readiness",
    command: "verify-v280-approval-gated-rule-draft",
  },
  {
    step: "V280-S04",
    title: "Evidence Intake and Field Readiness",
    command: "verify-v280-evidence-intake-field-readiness",
  },
  {
    step: "V280-S05",
    title: "Runtime Evidence Window",
    command: "verify-v280-runtime-evidence-window",
  },
  {
    step: "V280-S06",
    title: "Client-safe Follow-up Digest",
    command: "verify-v280-client-safe-followup-digest",
  },
];

const backlog = readText("docs/development-backlog.md");
const streamVerification = readText("docs/stream-verification.md");
const featureInventory = readText("docs/project-feature-test-inventory.md");
const releaseRecords = readText("docs/release-test-records.md");
const coverageVerifier = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
const implementationManifest = JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json"));
const serverSh = readText("server.sh");

check("roadmap and stream verification expose V290-S02 as a rerun bundle", () => {
  for (const snippet of [
    "| 2 | V290-S02 | P0 | 완료 | v2.8 feature regression bundle |",
    "`./server.sh verify-v290-v28-regression-bundle`",
    "v2.8 완료 evidence 재사용이 아니라 v2.9 기준 재실행 evidence",
    "## v2.9.0 S02 개발 기록",
  ]) {
    assert(backlog.includes(snippet), `backlog missing S02 snippet: ${snippet}`);
  }
  for (const snippet of [
    "| V290-S02 | `./server.sh verify-v290-v28-regression-bundle` |",
    "v2.8 기능군 regression gate",
    "v2.8 완료 evidence 재사용이 아니라 v2.9 기준 재실행 evidence",
  ]) {
    assert(streamVerification.includes(snippet), `stream verification missing S02 snippet: ${snippet}`);
  }
});

check("feature inventory maps V290-S02 to OPS-043 and SAFE-073", () => {
  assertSummaryCountAtLeast("전체 기능 항목", 503);
  assertSummaryCountAtLeast("기능 ID 목록", 503);
  assertRangeCovers("SAFE", 73);
  assertRangeCovers("OPS", 43);
  for (const snippet of [
    "V290-S02 v2.8 feature regression bundle | `OPS-043`, `SAFE-073` | `verify-v290-v28-regression-bundle`",
    "SAFE-073 | V290-S02 v2.8 기능군 회귀 묶음 boundary",
    "OPS-043 | V290-S02 v2.8 기능군 회귀 묶음 게이트",
  ]) {
    assert(featureInventory.includes(snippet), `feature inventory missing S02 snippet: ${snippet}`);
  }
  assert(coverageVerifier.includes("loadImplementationManifest") && coverageVerifier.includes("validateImplementationManifest"),
    "feature coverage missing canonical implementation manifest validation");
  for (const id of ["SAFE-073", "OPS-043"]) {
    const mapping = implementationManifest.items?.find((item) => item.id === id);
    assert(mapping?.verifierEvidence?.command === "verify-v290-v28-regression-bundle",
      `implementation manifest ${id} missing V290-S02 verifier mapping`);
  }
});

check("release records include S02 test item, RED failure, and not-run boundaries", () => {
  for (const snippet of [
    "V290 v2.8 regression bundle",
    "`./server.sh verify-v290-v28-regression-bundle`",
    "최초 `./server.sh verify-v290-v28-regression-bundle`는 command 미구현으로 fail",
    "v290 S02 UI 풀테스트",
    "v290 S02 30분/120분 longrun",
    "v290 S02 published metadata",
  ]) {
    assert(releaseRecords.includes(snippet), `release records missing S02 snippet: ${snippet}`);
  }
});

check("server entrypoint exposes the V290-S02 bundle command", () => {
  for (const snippet of [
    "verify-v290-v28-regression-bundle",
    "verify_v290_v28_regression_bundle.mjs",
  ]) {
    assert(serverSh.includes(snippet), `server.sh missing S02 command snippet: ${snippet}`);
  }
});

check("bundle subcommands are documented and registered", () => {
  for (const item of subcommands) {
    assert(streamVerification.includes(item.command), `stream verification missing subcommand ${item.command}`);
    assert(featureInventory.includes(item.command), `feature inventory missing subcommand ${item.command}`);
    assert(serverSh.includes(item.command), `server.sh missing subcommand ${item.command}`);
  }
});

const docResults = runChecks();
const commandResults = docResults.fail === 0 ? runSubcommands() : [];
assertCanonicalV28RegressionBundle(commandResults, docResults);
const commandFail = commandResults.filter((item) => item.status !== 0).length;

console.log("");
console.log("== v2.9.0 v2.8 regression bundle summary ==");
console.log("- schema: media-server.v290-v28-regression-bundle.v1");
console.log("- rerunEvidence: current v2.9 source tree subcommand execution");
console.log("- reusedV280CompletionEvidence: false");
console.log("- uiFulltest: not-run-by-this-command");
console.log("- longrun30Or120: not-run-by-this-command");
console.log("- publishedMetadata: not-run-by-this-command");
console.log(`- docPass: ${docResults.pass}`);
console.log(`- docFail: ${docResults.fail}`);
console.log(`- subcommandPass: ${commandResults.filter((item) => item.status === 0).length}`);
console.log(`- subcommandFail: ${commandFail}`);
if (docResults.fail > 0 || commandFail > 0) process.exit(1);

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

function runSubcommands() {
  const results = [];
  for (const item of subcommands) {
    console.log("");
    console.log(`== ${item.step} ${item.title} ==`);
    const result = spawnSync(path.join(rootDir, "server.sh"), [item.command], {
      cwd: rootDir,
      encoding: "utf8",
      env: process.env,
      maxBuffer: 20 * 1024 * 1024,
    });
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    const status = result.status ?? 1;
    console.log(`[${status === 0 ? "pass" : "fail"}] ${item.command} exit ${status}`);
    results.push({ ...item, status });
  }
  return results;
}

function assertCanonicalV28RegressionBundle(results, docs) {
  const expectedCommands = subcommands.map((item) => item.command);
  const executedCommands = results.map((item) => item.command);
  const v28CommandsMatched = JSON.stringify(executedCommands) === JSON.stringify(expectedCommands);
  const v28RegressionBundleObserved = v28CommandsMatched &&
    docs.fail === 0 &&
    results.every((item) => item.status === 0);
  assert(v28RegressionBundleObserved,
    "verify-v290-v28-regression-bundle must use current child exit status, not reused completion evidence");
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

function assertSummaryCountAtLeast(label, minimum) {
  const pattern = new RegExp(`\\| ${escapeRegExp(label)} \\| ([0-9]+)`);
  const match = featureInventory.match(pattern);
  assert(match, `feature inventory missing summary count: ${label}`);
  const count = Number.parseInt(match[1], 10);
  assert(count >= minimum, `feature inventory ${label} ${count} below ${minimum}`);
}

function assertRangeCovers(prefix, minimum) {
  const pattern = new RegExp(`\`${prefix}-[0-9]{3}\`~\`${prefix}-([0-9]{3})\``, "g");
  const matches = [...featureInventory.matchAll(pattern)];
  assert(matches.length > 0, `feature inventory missing ${prefix} range`);
  const max = Math.max(...matches.map((match) => Number.parseInt(match[1], 10)));
  assert(max >= minimum, `feature inventory ${prefix} range ${max} below ${minimum}`);
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

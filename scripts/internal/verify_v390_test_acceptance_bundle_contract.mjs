#!/usr/bin/env node
// 파일 용도: v3.9.0 test acceptance bundle dry-run command와 evidence boundary 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 test acceptance bundle contract verification

Usage:
  ./server.sh verify-v390-test-acceptance-bundle-contract

Checks:
  - acceptance bundle dry-run command exists
  - actual-mode fixture executes the fixed stage order
  - first failure makes later stages not-run while cleanup/report still execute
  - conditional 120-minute and cleanup failure paths are explicit
  - dry-run summary separates local/static, 30-minute, UI automation, 120-minute, published, and release action evidence
  - docs and release evidence record R3 without running long/UI/publish actions
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v390-test-acceptance-bundle";
const contractCommand = "verify-v390-test-acceptance-bundle-contract";
const script = "verify_v390_test_acceptance_bundle.mjs";
const contractScript = "verify_v390_test_acceptance_bundle_contract.mjs";
const checks = [];

const files = {
  serverSh: readText("server.sh"),
  scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
  streamVerification: readText("docs/stream-verification.md"),
  projectInventory: readText("docs/project-feature-test-inventory.md"),
  releaseRecords: readText("docs/release-test-records.md"),
  releaseEvidence: readText("docs/release-evidence-index.md"),
  backlog: readText("docs/development-backlog.md"),
};

check("server.sh and script inventory expose R3 acceptance bundle commands", () => {
  for (const name of [script, contractScript]) {
    assert(fs.existsSync(path.join(rootDir, "scripts/internal", name)), `missing script: ${name}`);
    assertIncludes(files.serverSh, name, "server.sh R3 dispatch");
    assertIncludes(files.scriptInventory, name, "script inventory R3");
  }
  for (const name of [command, contractCommand]) {
    assertIncludes(files.serverSh, name, "server.sh R3 command");
  }
});

check("dry-run writes replayable acceptance summary without executing gated suites", () => {
  const outputDir = path.join("/tmp", `media_server_v390_acceptance_contract_${process.pid}`);
  fs.rmSync(outputDir, { recursive: true, force: true });
  execFileSync(path.join(rootDir, "server.sh"), [
    command,
    "--dry-run",
    "--output-dir",
    outputDir,
  ], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const summary = readJson(path.join(outputDir, "summary.json"));
  assert(summary.schema === "media-server.v390-test-acceptance-bundle.v1", "unexpected summary schema");
  assert(summary.result === "PASS", "dry-run result must be PASS");
  assert(summary.dryRun === true, "summary must mark dryRun=true");
  assert(summary.longrun30?.status === "pass-existing-evidence", "30-minute evidence status mismatch");
  assert(summary.uiAutomation?.status === "pass-existing-evidence", "UI automation preserved evidence status mismatch");
  assert(summary.uiAutomation?.summaryPath === "docs/release-artifacts/v3.9.0/ui-automation-playwright-final/summary.json", "UI automation summary path mismatch");
  assert(summary.uiAutomation?.reportPath === "docs/release-artifacts/v3.9.0/ui-automation-playwright-final/report.md", "UI automation report path mismatch");
  assert(summary.uiAutomation?.manualIntervention === false, "UI automation manual intervention must be false");
  const manifest = readJson(path.join(rootDir, "test/fixtures/v390_ui_automation_cases.json"));
  assert(summary.uiAutomation?.caseCount === manifest.cases.length, "UI automation case count mismatch");
  assert(summary.uiAutomation?.pass === manifest.cases.length, "UI automation pass count mismatch");
  assert(summary.uiAutomation?.fail === 0, "UI automation fail count mismatch");
  assert(summary.uiAutomation?.notRun === 0, "UI automation not-run count mismatch");
  assert(Array.isArray(summary.finalAcceptanceCommandSet), "missing final acceptance command set");
  assert(summary.finalAcceptanceCommandSet.some((item) => item.id === "server-longrun-30" && item.status === "executed-by-actual-bundle"), "missing R1 longrun execution in final acceptance set");
  assert(summary.finalAcceptanceCommandSet.some((item) => item.id === "ui-automation" && item.status === "executed-by-actual-bundle"), "missing R2 UI automation execution in final acceptance set");
  assert(summary.finalAcceptanceCommandSet.some((item) => item.id === "actual-bundle" && item.status === "actual-execution"), "missing actual bundle command in final acceptance set");
  assert(summary.longrun120?.status === "conditional-not-run", "120-minute status mismatch");
  assert(summary.publishedMetadata?.status === "not-run-by-dry-run", "published metadata status mismatch");
  assert(summary.releaseAction?.status === "not-run-by-dry-run", "release action status mismatch");
  assert(summary.evidenceBoundary.includes("dry-run does not execute"), "evidence boundary missing");
  assert(fs.existsSync(path.join(outputDir, "report.md")), "missing report.md");
  fs.rmSync(outputDir, { recursive: true, force: true });
});

check("actual-mode fixture executes the fixed stage order and conditional 120 decision", () => {
  const outputDir = fixtureDir("pass");
  const result = runBundle(["--output-dir", outputDir, "--fixture-pass"]);
  assert(result.status === 0, `fixture pass command failed: ${result.stderr}`);
  const summary = readJson(path.join(outputDir, "summary.json"));
  assert(summary.executionMode === "actual-fixture", "fixture executionMode mismatch");
  assert(summary.dryRun === false, "fixture must not be dry-run");
  assert(summary.result === "PASS", "fixture pass result mismatch");
  assert(summary.stopOnFirstFail === true, "fixture stopOnFirstFail missing");
  assert(JSON.stringify(summary.stageOrder) === JSON.stringify([
    "preflight", "build", "feature-gates", "server-longrun-30", "ui-automation", "ui-replay",
    "longrun-120-decision", "server-longrun-120", "cleanup", "report",
  ]), "fixture stage order mismatch");
  assert(summary.stages.find(item => item.id === "server-longrun-120")?.status === "not-run", "120 stage must be not-run without trigger");
  assert(summary.longrun120?.decision === "not-required", "120 decision mismatch");
  assert(summary.cleanup?.status === "PASS", "fixture cleanup must pass");
  assert(summary.publishedMetadata?.status === "not-run-by-this-command", "published metadata boundary mismatch");
  assert(summary.releaseAction?.status === "not-run-by-this-command", "release action boundary mismatch");
  fs.rmSync(outputDir, { recursive: true, force: true });
});

check("actual-mode fixture stops on first failure and still runs cleanup/report", () => {
  const outputDir = fixtureDir("first-fail");
  const result = runBundle(["--output-dir", outputDir, "--fixture-fail-stage", "feature-gates"]);
  assert(result.status !== 0, "failure fixture must return non-zero");
  const summary = readJson(path.join(outputDir, "summary.json"));
  assert(summary.result === "FAIL", "failure fixture summary must fail");
  assert(summary.failedStage === "feature-gates", "failedStage mismatch");
  for (const id of ["server-longrun-30", "ui-automation", "ui-replay", "longrun-120-decision", "server-longrun-120"]) {
    assert(summary.stages.find(item => item.id === id)?.status === "not-run", `${id} must be not-run after failure`);
  }
  assert(summary.stages.find(item => item.id === "cleanup")?.status === "PASS", "cleanup must run after failure");
  assert(summary.stages.find(item => item.id === "report")?.status === "PASS", "report must run after failure");
  fs.rmSync(outputDir, { recursive: true, force: true });
});

check("actual-mode fixture runs explicit 120 and rejects cleanup failure", () => {
  const run120Dir = fixtureDir("run-120");
  const run120 = runBundle(["--output-dir", run120Dir, "--fixture-pass", "--run-120"]);
  assert(run120.status === 0, "run-120 fixture must pass");
  const run120Summary = readJson(path.join(run120Dir, "summary.json"));
  assert(run120Summary.longrun120?.decision === "run", "run-120 decision mismatch");
  assert(run120Summary.stages.find(item => item.id === "server-longrun-120")?.status === "PASS", "run-120 stage must pass");
  fs.rmSync(run120Dir, { recursive: true, force: true });

  const cleanupDir = fixtureDir("cleanup-fail");
  const cleanup = runBundle(["--output-dir", cleanupDir, "--fixture-pass", "--fixture-cleanup-fail"]);
  assert(cleanup.status !== 0, "cleanup failure fixture must return non-zero");
  const cleanupSummary = readJson(path.join(cleanupDir, "summary.json"));
  assert(cleanupSummary.result === "FAIL", "cleanup failure summary must fail");
  assert(cleanupSummary.cleanup?.status === "FAIL", "cleanup failure must be explicit");
  fs.rmSync(cleanupDir, { recursive: true, force: true });
});

check("docs and release evidence record R3 without overclaiming gated tests", () => {
  for (const snippet of [
    "v3.9.0 R3 / V390-ADD1-06 actual test acceptance bundle",
    command,
    contractCommand,
    "media-server.v390-test-acceptance-bundle.v1",
    "dry-run does not execute",
    "finalAcceptanceCommandSet",
    "R2 UI automation preserved evidence",
  ]) {
    assertIncludes(files.streamVerification + "\n" + files.projectInventory, snippet, "R3 stream/project docs");
  }
  for (const snippet of [
    "v390 R3 RED test acceptance bundle contract",
    "v390 R3 test acceptance bundle dry-run final",
    "v390 R3 actual acceptance bundle",
    "R2 UI automation preserved evidence `pass-existing-evidence`",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "R3 release records");
  }
  for (const snippet of [
    "v3.9.0 R3 / V390-ADD1-06 actual test acceptance bundle",
    command,
    contractCommand,
    "current feature, R1, R2 commands",
    "UI 풀테스트 직접 조작 PASS",
  ]) {
    assertIncludes(files.releaseEvidence, snippet, "R3 release evidence");
  }
});

const results = runChecks();
console.log("");
console.log("== v3.9.0 test acceptance bundle contract summary ==");
console.log("- schema: media-server.v390-test-acceptance-bundle.v1");
console.log(`- command: ${command}`);
console.log(`- contractCommand: ${contractCommand}`);
console.log("- actualAcceptanceBundle: not-run-by-this-command");
console.log(`- pass: ${results.pass}`);
console.log(`- fail: ${results.fail}`);
if (results.fail > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

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

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function fixtureDir(label) {
  const outputDir = path.join("/tmp", `media_server_v390_acceptance_contract_${label}_${process.pid}`);
  fs.rmSync(outputDir, { recursive: true, force: true });
  return outputDir;
}

function runBundle(args) {
  return spawnSync(path.join(rootDir, "server.sh"), [command, ...args], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function assertIncludes(text, snippet, label) {
  assert(text.includes(snippet), `${label} missing snippet: ${snippet}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

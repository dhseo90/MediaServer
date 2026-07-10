#!/usr/bin/env node
// 파일 용도: v3.9.0 current UI automation coverage matrix의 exact ID, evidence, negative drift 계약을 검증한다.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 UI automation coverage matrix contract

Usage:
  ./server.sh verify-v390-ui-automation-coverage-contract

Checks:
  - current UI-001~UI-115 exact matrix and aggregate dispositions
  - automated UI-108~UI-115 actualResult/artifact/log evidence
  - unsupported/manual and positive-UI exclusion reasons
  - missing policy ID, route drift, and missing artifact negative fixtures
  - roadmap/docs/release evidence/server/script inventory wiring
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v390-ui-automation-coverage";
const contractCommand = "verify-v390-ui-automation-coverage-contract";
const runnerScript = "verify_v390_ui_automation_coverage.mjs";
const contractScript = "verify_v390_ui_automation_coverage_contract.mjs";
const policyPath = path.join(rootDir, "test/fixtures/v390_ui_automation_coverage_policy.json");
const durableMatrixPath = path.join(rootDir, "docs/v390-ui-automation-coverage-matrix.md");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "media_server_v390_ui_coverage_contract_"));
const checks = [];

process.on("exit", () => fs.rmSync(tempRoot, { recursive: true, force: true }));

check("server, script inventory, policy, and durable matrix expose Step 25 commands", () => {
  for (const filePath of [
    path.join(rootDir, "scripts/internal", runnerScript),
    path.join(rootDir, "scripts/internal", contractScript),
    policyPath,
    durableMatrixPath,
  ]) {
    assert(fs.existsSync(filePath), `missing Step 25 file: ${repoRelative(filePath)}`);
  }
  const serverSh = readText("server.sh");
  const scriptInventory = readText("scripts/internal/verify_script_inventory.mjs");
  for (const snippet of [command, contractCommand, runnerScript, contractScript]) {
    assertIncludes(`${serverSh}\n${scriptInventory}`, snippet, "Step 25 dispatch/inventory");
  }
});

check("positive matrix covers exact UI-001 through UI-115 without full automation claim", () => {
  const run = runCoverage("positive");
  assert(run.status === "passed", `positive matrix failed: ${run.stderr || run.stdout}`);
  const summary = readJson(run.summaryPath);
  assert(summary.schema === "media-server.v390-ui-automation-coverage.v1", "coverage schema mismatch");
  assert(summary.matrixValidationResult === "PASS", "matrix validation must PASS");
  assert(summary.coverageStatus === "mapped-with-explicit-gaps", "coverage status mismatch");
  assert(summary.executionEvidenceStatus === "partial-automation-evidence", "execution evidence boundary mismatch");
  assert(summary.fullAutomationCoverage === false, "matrix must not claim full automation coverage");
  assert(summary.manualUiFulltestEvidence === false, "matrix must not claim manual UI fulltest evidence");
  assert(summary.counts.inventoryUiIds === 115, "inventory UI count must be 115");
  assert(summary.counts.automated === 8, "automated count must be 8");
  assert(summary.counts.unsupportedManual === 106, "unsupported/manual count must be 106");
  assert(summary.counts.excludedPositiveUi === 1, "positive UI exclusion count must be 1");
  assert(summary.counts.manualUiFulltestRequired === 114, "manual UI area count must be 114");
  assert(JSON.stringify(summary.rows.map(item => item.id)) === JSON.stringify(expectedUiIds()),
    "matrix must contain exact ordered UI-001~UI-115 IDs");
});

check("automated rows preserve actual route/control/action and every required artifact/log", () => {
  const summary = readPositiveSummary();
  const automated = summary.rows.filter(item => item.automationDisposition === "automated");
  assert(JSON.stringify(automated.map(item => item.id)) === JSON.stringify(expectedUiIds(108, 115)),
    "automated IDs must be exact UI-108~UI-115");
  for (const item of automated) {
    assert(item.automationStatus === "PASS", `${item.id} automationStatus must PASS`);
    assert(item.actualResult === "control action executed and expected UI state captured",
      `${item.id} actualResult must preserve the executed UI result`);
    assert(item.controlAction, `${item.id} controlAction missing`);
    assert(item.route.startsWith("/"), `${item.id} route missing`);
    for (const key of ["screenshot", "trace", "video", "browserConsole", "serverLog"]) {
      assert(item.evidence?.[key], `${item.id} ${key} evidence missing`);
      assert(fs.existsSync(path.join(rootDir, item.evidence[key])), `${item.id} ${key} file missing`);
    }
  }
});

check("unsupported/manual and excluded rows remain explicit non-PASS work", () => {
  const summary = readPositiveSummary();
  const manual = summary.rows.filter(item => item.automationDisposition === "unsupported-manual");
  assert(manual.length === 106, "unsupported/manual row count mismatch");
  for (const item of manual) {
    assert(item.automationStatus === "not-run", `${item.id} unsupported status must be not-run`);
    assert(item.actualResult === "not-run", `${item.id} unsupported row must be not-run`);
    assert(item.unsupportedReasonCode === "no-current-native-exact-selector-case", `${item.id} reason code mismatch`);
    assert(item.unsupportedReason, `${item.id} unsupported reason missing`);
    assert(Object.values(item.evidence || {}).every(value => value === ""), `${item.id} must not carry fake artifacts`);
  }
  const excluded = summary.rows.find(item => item.id === "UI-018");
  assert(excluded?.automationDisposition === "excluded-positive-ui", "UI-018 exclusion disposition mismatch");
  assert(excluded?.automationStatus === "not-applicable", "UI-018 automation status mismatch");
  assert(excluded?.actualResult === "not-applicable", "UI-018 actual result mismatch");
  assert(excluded?.unsupportedReasonCode === "product-ui-absence-negative-check", "UI-018 reason code mismatch");
  assert(excluded?.manualUiFulltestRequired === true, "UI-018 manual negative route check must remain required");
});

check("policy omission is rejected instead of silently classifying a new gap", () => {
  const policy = readJson(policyPath);
  policy.classifications.unsupportedManual.range.end = "UI-106";
  const modifiedPolicy = path.join(tempRoot, "missing-policy-id.json");
  writeJson(modifiedPolicy, policy);
  const run = runCoverage("missing-policy-id", ["--policy", modifiedPolicy], true);
  assert(run.status === "failed-as-expected", "missing policy ID fixture must fail");
  assertIncludes(`${run.stdout}\n${run.stderr}`, "unclassified inventory UI IDs: UI-107", "missing policy ID failure");
});

check("implementation route drift is rejected", () => {
  const evidence = readJson(path.join(rootDir, "test/fixtures/project_feature_implementation_evidence.json"));
  evidence.items.find(item => item.id === "UI-113").uiEvidence.screenRoute = "/ops";
  const modifiedEvidence = path.join(tempRoot, "route-drift-evidence.json");
  writeJson(modifiedEvidence, evidence);
  const policy = readJson(policyPath);
  policy.implementationEvidenceSource = modifiedEvidence;
  const modifiedPolicy = path.join(tempRoot, "route-drift-policy.json");
  writeJson(modifiedPolicy, policy);
  const run = runCoverage("route-drift", ["--policy", modifiedPolicy], true);
  assert(run.status === "failed-as-expected", "route drift fixture must fail");
  assertIncludes(`${run.stdout}\n${run.stderr}`, "UI-113 route mismatch", "route drift failure");
});

check("missing automated artifact is rejected", () => {
  const summary = readJson(path.join(rootDir, "docs/release-artifacts/v3.9.0/ui-automation-visible-dom-final/summary.json"));
  summary.cases.find(item => item.caseId === "UI-108").screenshotPath = path.join(tempRoot, "missing-ui-108.png");
  const modifiedSummary = path.join(tempRoot, "missing-artifact-summary.json");
  writeJson(modifiedSummary, summary);
  const run = runCoverage("missing-artifact", ["--automation-summary", modifiedSummary], true);
  assert(run.status === "failed-as-expected", "missing artifact fixture must fail");
  assertIncludes(`${run.stdout}\n${run.stderr}`, "UI-108 screenshotPath does not exist", "missing artifact failure");
});

check("durable matrix and release docs record partial coverage boundaries", () => {
  const matrix = fs.readFileSync(durableMatrixPath, "utf8");
  const matrixIds = matrix.split(/\r?\n/)
    .map(line => line.match(/^\| (UI-\d{3}) \|/)?.[1])
    .filter(Boolean);
  assert(JSON.stringify(matrixIds) === JSON.stringify(expectedUiIds()), "durable matrix exact ID set mismatch");
  for (const snippet of [
    "automated `8`",
    "unsupported-manual `106`",
    "excluded-positive-ui `1`",
    "fullAutomationCoverage: `false`",
    "manualUiFulltestEvidence: `false`",
  ]) {
    assertIncludes(matrix, snippet, "durable matrix boundary");
  }
  const docs = [
    "docs/development-backlog.md",
    "docs/stream-verification.md",
    "docs/project-feature-test-inventory.md",
    "docs/release-test-records.md",
    "docs/release-evidence-index.md",
  ].map(readText).join("\n");
  for (const snippet of ["V390-ADD1-11", command, contractCommand, "mapped-with-explicit-gaps"]) {
    assertIncludes(docs, snippet, "Step 25 docs/evidence");
  }
});

const result = summarizeChecks();
console.log("");
console.log("== v3.9.0 UI automation coverage matrix contract summary ==");
console.log("- schema: media-server.v390-ui-automation-coverage.v1");
console.log("- inventoryUiIds: 115");
console.log("- automated: 8");
console.log("- unsupportedManual: 106");
console.log("- excludedPositiveUi: 1");
console.log("- fullAutomationCoverage: false");
console.log(`- pass: ${result.pass}`);
console.log(`- fail: ${result.fail}`);
if (result.fail > 0) process.exit(1);

function check(name, fn) {
  try {
    fn();
    checks.push({ name, status: "pass" });
    console.log(`[pass] ${name}`);
  } catch (error) {
    checks.push({ name, status: "fail", reason: error instanceof Error ? error.message : String(error) });
    console.error(`[fail] ${name}: ${checks.at(-1).reason}`);
  }
}

function summarizeChecks() {
  return {
    pass: checks.filter(item => item.status === "pass").length,
    fail: checks.filter(item => item.status === "fail").length,
  };
}

function runCoverage(label, extraArgs = [], expectFailure = false) {
  const outputDir = path.join(tempRoot, label);
  fs.rmSync(outputDir, { recursive: true, force: true });
  const args = [command, "--output-dir", outputDir, ...extraArgs];
  try {
    const stdout = execFileSync(path.join(rootDir, "server.sh"), args, {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return {
      status: expectFailure ? "passed-unexpectedly" : "passed",
      stdout,
      stderr: "",
      summaryPath: path.join(outputDir, "summary.json"),
      reportPath: path.join(outputDir, "report.md"),
    };
  } catch (error) {
    return {
      status: expectFailure ? "failed-as-expected" : "failed-unexpectedly",
      stdout: error?.stdout ? String(error.stdout) : "",
      stderr: error?.stderr ? String(error.stderr) : String(error),
      summaryPath: path.join(outputDir, "summary.json"),
      reportPath: path.join(outputDir, "report.md"),
    };
  }
}

function readPositiveSummary() {
  const run = runCoverage(`positive-${Math.random().toString(16).slice(2)}`);
  assert(run.status === "passed", `positive matrix failed: ${run.stderr || run.stdout}`);
  return readJson(run.summaryPath);
}

function expectedUiIds(start = 1, end = 115) {
  return Array.from({ length: end - start + 1 }, (_, index) => `UI-${String(start + index).padStart(3, "0")}`);
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function repoRelative(filePath) {
  return path.relative(rootDir, filePath).split(path.sep).join("/");
}

function assertIncludes(value, expected, label) {
  assert(String(value).includes(expected), `${label} missing: ${expected}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

#!/usr/bin/env node
// 파일 용도: v3.9.0 UI automation runner/report의 case 단위 failure evidence와 문서/dispatch 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 UI automation runner contract verification

Usage:
  ./server.sh verify-v390-ui-automation-runner-contract

Checks:
  - UI automation runner/report commands exist
  - fixture failure records route/control/action failure report and later case not-run
  - fixture pass summary validates through report replay verifier
  - docs, release evidence, project inventory, script inventory, and dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v390-ui-automation";
const reportCommand = "verify-v390-ui-automation-report";
const contractCommand = "verify-v390-ui-automation-runner-contract";
const runnerScript = "verify_v390_ui_automation.mjs";
const reportScript = "verify_v390_ui_automation_report.mjs";
const contractScript = "verify_v390_ui_automation_runner_contract.mjs";
const runnerPath = path.join(rootDir, "scripts/internal", runnerScript);
const checks = [];

const files = {
  serverSh: readText("server.sh"),
  streamVerification: readText("docs/stream-verification.md"),
  projectInventory: readText("docs/project-feature-test-inventory.md"),
  releaseRecords: readText("docs/release-test-records.md"),
  releaseEvidence: readText("docs/release-evidence-index.md"),
  scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
  backlog: readText("docs/development-backlog.md"),
  runner: readText("scripts/internal/verify_v390_ui_automation.mjs"),
};

check("server.sh and script inventory expose R2 UI automation commands", () => {
  for (const script of [runnerScript, reportScript, contractScript]) {
    assert(fs.existsSync(path.join(rootDir, "scripts/internal", script)), `missing script: ${script}`);
    assertIncludes(files.serverSh, script, "server.sh R2 dispatch");
    assertIncludes(files.scriptInventory, script, "script inventory R2");
  }
  for (const snippet of [command, reportCommand, contractCommand]) {
    assertIncludes(files.serverSh, snippet, "server.sh R2 command");
  }
  for (const snippet of ["startCoreServer", "openBrowserPage", "expectedMarkers", "waitForHealth"]) {
    assertIncludes(files.runner, snippet, "R2 runner real mode");
  }
  assert(!files.runner.includes('"verify-ui-fulltest-one-shot"'), "R2 runner must not delegate real mode to verify-ui-fulltest-one-shot");
});

check("failure fixture records case failure fields and later cases as not-run", () => {
  const run = runFixture("fail", ["--fixture-fail-case", "UI-110"]);
  assert(run.status === "failed-as-expected", `failure fixture should exit non-zero, got ${run.status}`);
  const summary = readJson(run.summaryPath);
  assert(summary.schema === "media-server.v390-ui-automation.v1", "unexpected summary schema");
  assert(summary.result === "FAIL", "failure fixture result must be FAIL");
  assert(summary.failedCaseId === "UI-110", "failedCaseId must be UI-110");
  const failedCase = summary.cases.find(item => item.caseId === "UI-110");
  assert(failedCase && failedCase.status === "FAIL", "UI-110 must fail");
  assert(failedCase.route === "/ops/rules", "UI-110 route mismatch");
  assert(failedCase.controlAction === "inspect-vlm-rule-draft-bridge", "UI-110 controlAction mismatch");
  assert(Array.isArray(failedCase.expectedMarkers) && failedCase.expectedMarkers.includes("autoApply=false"), "UI-110 expectedMarkers mismatch");
  assert(failedCase.manualIntervention === false, "failure fixture must not require manual intervention");
  assert(Array.isArray(failedCase.browserConsole), "browserConsole must be an array");
  assert(summary.cases.some(item => item.caseId === "UI-111" && item.status === "not-run"), "later case UI-111 must be not-run");
  runReportVerifier(run.summaryPath);
});

check("pass fixture validates through report replay verifier", () => {
  const run = runFixture("pass", ["--fixture-pass"]);
  assert(run.status === "passed", `pass fixture should exit zero, got ${run.status}`);
  const summary = readJson(run.summaryPath);
  assert(summary.result === "PASS", "pass fixture result must be PASS");
  assert(summary.manualIntervention === false, "pass fixture must not require manual intervention");
  assert(summary.cases.every(item => item.status === "PASS"), "all pass fixture cases must PASS");
  assert(summary.evidenceBoundary.includes("automationResult is not manual UI fulltest"), "evidence boundary missing");
  runReportVerifier(run.summaryPath);
});

check("docs and release evidence record R2 without overclaiming UI fulltest", () => {
  for (const snippet of [
    "v3.9.0 R2 AI-minimized UI automation runner 실제 구현",
    command,
    reportCommand,
    contractCommand,
    "media-server.v390-ui-automation.v1",
    "route/control/action",
    "manualIntervention=false",
  ]) {
    assertIncludes(files.streamVerification + "\n" + files.projectInventory, snippet, "R2 stream/project docs");
  }
  for (const snippet of [
    "v390 R2 RED UI automation runner contract",
    "v390 R2 UI automation runner final",
    "v390 R2 실제 UI automation suite",
    "automationResult is not manual UI fulltest",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "R2 release records");
  }
  for (const snippet of [
    "v3.9.0 R2 UI automation runner",
    command,
    reportCommand,
    contractCommand,
    "UI 풀테스트 직접 조작 evidence",
  ]) {
    assertIncludes(files.releaseEvidence, snippet, "R2 release evidence");
  }
});

const results = runChecks();
console.log("");
console.log("== v3.9.0 UI automation runner contract summary ==");
console.log("- schema: media-server.v390-ui-automation.v1");
console.log(`- command: ${command}`);
console.log(`- reportCommand: ${reportCommand}`);
console.log(`- contractCommand: ${contractCommand}`);
console.log("- realUiAutomation: not-run-by-this-command");
console.log(`- pass: ${results.pass}`);
console.log(`- fail: ${results.fail}`);
if (results.fail > 0) process.exit(1);

function runFixture(label, extraArgs) {
  const outputDir = path.join("/tmp", `media_server_v390_ui_automation_contract_${label}_${process.pid}`);
  fs.rmSync(outputDir, { recursive: true, force: true });
  const args = [
    runnerPath,
    "--browser-mode",
    "playwright",
    "--output-dir",
    outputDir,
    ...extraArgs,
  ];
  const expectsFailure = extraArgs.includes("--fixture-fail-case");
  let stdout = "";
  let stderr = "";
  let status = "passed";
  try {
    stdout = execFileSync(process.execPath, args, {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    status = "failed-as-expected";
    stderr = error?.stderr ? String(error.stderr) : "";
    stdout = error?.stdout ? String(error.stdout) : "";
    if (!expectsFailure) {
      throw new Error(`fixture ${label} failed unexpectedly:\n${stdout}\n${stderr}`);
    }
  }
  return {
    status,
    outputDir,
    summaryPath: path.join(outputDir, "summary.json"),
    reportPath: path.join(outputDir, "report.md"),
    stdout,
    stderr,
  };
}

function runReportVerifier(summaryPath) {
  execFileSync(path.join(rootDir, "server.sh"), [reportCommand, "--summary", summaryPath], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
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

function check(name, fn) {
  checks.push({ name, fn });
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function assertIncludes(text, snippet, label) {
  assert(text.includes(snippet), `${label} missing snippet: ${snippet}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

#!/usr/bin/env node
// 파일 용도: v3.9.0 server longrun runner의 stop-on-first-fail contract와 문서/dispatch 연결을 검증한다.

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
  printUsageAndExit(`v3.9.0 server longrun runner contract verification

Usage:
  ./server.sh verify-v390-server-longrun-runner-contract

Checks:
  - verify-v390-server-longrun exists as a server.sh command and script
  - fixture failure stops at the first failed phase/case and records later work as not-run
  - failure output preserves context, separate stderr, and a reproduction command
  - fixture pass writes summary/report with cleanup evidence
  - docs, release records/evidence, project inventory, script inventory, and dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v390-server-longrun";
const contractCommand = "verify-v390-server-longrun-runner-contract";
const runnerScript = "verify_v390_server_longrun.mjs";
const contractScript = "verify_v390_server_longrun_runner_contract.mjs";
const runnerPath = path.join(rootDir, "scripts/internal", runnerScript);
const checks = [];
const temporaryOutputDirs = new Set();
const temporaryFiles = new Set();
process.on("exit", () => {
  for (const outputDir of temporaryOutputDirs) fs.rmSync(outputDir, { recursive: true, force: true });
  for (const filePath of temporaryFiles) fs.rmSync(filePath, { force: true });
});

const files = {
  serverSh: readText("server.sh"),
  streamVerification: readText("docs/stream-verification.md"),
  projectInventory: readText("docs/project-feature-test-inventory.md"),
  releaseRecords: readText("docs/release-test-records.md"),
  releaseEvidence: readText("docs/release-evidence-index.md"),
  scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
  predevRunner: readText("scripts/internal/verify_predev_stability.sh"),
};

check("server.sh and script inventory expose the R1 longrun runner commands", () => {
  assert(fs.existsSync(runnerPath), `missing runner script: ${runnerScript}`);
  for (const snippet of [
    command,
    contractCommand,
    runnerScript,
    contractScript,
  ]) {
    assertIncludes(files.serverSh, snippet, "server.sh R1 longrun dispatch");
  }
  assertIncludes(files.scriptInventory, runnerScript, "script inventory R1 runner");
  assertIncludes(files.scriptInventory, contractScript, "script inventory R1 contract");
  assertIncludes(readTextAbsolute(runnerPath), "real-duration-failed-no-pass-evidence", "runner real failure evidence status");
  for (const snippet of [
    "print_first_failure_evidence",
    "run_ordered_case_sequence",
    'print_first_failure_evidence "server-start-queue-${queue_size}"',
    'print_first_failure_evidence "ports-clean"',
    'print_first_failure_evidence "summary-report-refresh"',
  ]) {
    assertIncludes(files.predevRunner, snippet, "predev immediate failure diagnostics");
  }
});

check("failure fixture records first failure and later phases as not-run", () => {
  const run = runFixture("fail", ["--fixture-fail-phase", "integrated-smoke"]);
  assert(run.status === "failed-as-expected", `failure fixture should exit non-zero, got ${run.status}`);
  assertIncludes(run.stdout, "[progress] (1/9) preflight test; remaining=8", "failure fixture progress");
  assertIncludes(run.stdout, "[progress] (5/9) integrated-smoke test; remaining=4", "failure fixture progress");
  const summary = readJson(run.summaryPath);
  assert(summary.schema === "media-server.v390-server-longrun.v1", "unexpected summary schema");
  assert(summary.result === "FAIL", "failure fixture summary result must be FAIL");
  assert(summary.stopOnFirstFail === true, "summary must set stopOnFirstFail=true");
  assert(summary.failedPhase === "integrated-smoke", "failedPhase must be integrated-smoke");
  assert(summary.failedCase === "fixture-integrated-smoke", "failedCase must name fixture failure");
  assert(summary.exitCode !== 0, "failure fixture exitCode must be non-zero");
  assert(summary.cleanup.serverStopped === true, "cleanup.serverStopped must be true");
  assert(summary.cleanup.portsClean === true, "cleanup.portsClean must be true");
  assert(summary.cleanup.temporaryArtifactsRemoved === true, "cleanup.temporaryArtifactsRemoved must be true");
  assert(summary.failure?.context === "fixture phase integrated-smoke failed", "failure fixture must preserve context");
  assert(summary.failure?.stderrTail?.includes("fixture stderr at integrated-smoke"), "failure fixture must preserve stderr");
  assert(summary.failure?.reproductionCommand === "fixture fail integrated-smoke", "failure fixture must preserve reproduction command");
  assertIncludes(run.stdout, "[first-fail] context: fixture phase integrated-smoke failed", "failure fixture console context");
  assertIncludes(run.stdout, "[first-fail] stderr: fixture stderr at integrated-smoke", "failure fixture console stderr");
  assertIncludes(run.stdout, "[first-fail] reproduce: fixture fail integrated-smoke", "failure fixture console reproduction");
  assertPhaseStatus(summary, "preflight", "PASS");
  assertPhaseStatus(summary, "build", "PASS");
  assertPhaseStatus(summary, "seed", "PASS");
  assertPhaseStatus(summary, "start-server", "PASS");
  assertPhaseStatus(summary, "integrated-smoke", "FAIL");
  assertPhaseStatus(summary, "soak-case-loop", "not-run");
  assertPhaseStatus(summary, "runtime-idle", "not-run");
  assertPhaseStatus(summary, "cleanup", "PASS");
  assertPhaseStatus(summary, "report", "PASS");
  const report = readTextAbsolute(run.reportPath);
  assertIncludes(report, "failedPhase: integrated-smoke", "failure fixture report");
  assertIncludes(report, "failureContext: fixture phase integrated-smoke failed", "failure fixture report");
  assertIncludes(report, "stderrTail: fixture stderr at integrated-smoke", "failure fixture report");
  assertIncludes(report, "reproductionCommand: fixture fail integrated-smoke", "failure fixture report");
  assertIncludes(report, "| soak-case-loop | not-run |", "failure fixture report");
});

check("pass fixture writes complete summary and report without claiming real longrun evidence", () => {
  const run = runFixture("pass", ["--fixture-pass"]);
  assert(run.status === "passed", `pass fixture should exit zero, got ${run.status}`);
  assertIncludes(run.stdout, "[progress] (1/9) preflight test; remaining=8", "pass fixture progress");
  assertIncludes(run.stdout, "[progress] (9/9) report test; remaining=0", "pass fixture progress");
  const summary = readJson(run.summaryPath);
  assert(summary.result === "PASS", "pass fixture summary result must be PASS");
  assert(summary.durationMinutes === 30, "fixture durationMinutes must preserve requested duration");
  assert(summary.realDurationEvidence === false, "fixture pass must not claim real duration evidence");
  assert(summary.longrunEvidenceStatus === "fixture-only-not-real-duration", "fixture status must not overclaim");
  for (const phase of summary.phases) {
    assert(phase.status === "PASS", `pass fixture phase must PASS: ${phase.id}`);
  }
  const report = readTextAbsolute(run.reportPath);
  assertIncludes(report, "realDurationEvidence: false", "pass fixture report");
  assertIncludes(report, "fixture-only-not-real-duration", "pass fixture report");
});

check("predev summary fixture preserves delegated first failure step", () => {
  const fixtureSummaryPath = path.join(
    "/tmp",
    `media_server_v390_longrun_predev_summary_${process.pid}.json`,
  );
  temporaryFiles.add(fixtureSummaryPath);
  writeJson(fixtureSummaryPath, {
    kind: "predev",
    status: "fail",
    pass: 2,
    fail: 1,
    skip: 0,
    durationSec: 12,
    steps: [
      {
        name: "server-start-queue-256",
        result: "pass",
        command: "run_server_foreground",
        logFile: "/tmp/predev/server.log",
        durationSec: 0,
      },
      {
        name: "integrated-smoke",
        result: "fail",
        command: "./server.sh test --no-start --include-va-events",
        logFile: "/tmp/predev/integrated_smoke.log",
        stdoutFile: "/tmp/predev/integrated_smoke.stdout.log",
        stderrFile: "/tmp/predev/integrated_smoke.stderr.log",
        stderrTail: ["fixture delegated stderr"],
        context: "predev case integrated-smoke failed after server start",
        reproductionCommand: "./server.sh test --no-start --include-va-events",
        durationSec: 11,
      },
      {
        name: "soak-1-va-events",
        result: "not-run",
        command: "./server.sh verify-va-events --duration 30",
        logFile: "",
        context: "not run after first failure integrated-smoke",
        reproductionCommand: "./server.sh verify-va-events --duration 30",
        durationSec: 0,
      },
    ],
  });
  const run = runFixture("predev-summary-fail", [
    "--fixture-fail-phase",
    "soak-case-loop",
    "--fixture-predev-summary",
    fixtureSummaryPath,
  ]);
  assert(run.status === "failed-as-expected", `predev summary fixture should exit non-zero, got ${run.status}`);
  const summary = readJson(run.summaryPath);
  assert(summary.result === "FAIL", "predev summary fixture result must be FAIL");
  assert(summary.failedPhase === "soak-case-loop", "top-level failedPhase must remain soak-case-loop");
  assert(summary.failedCase === "integrated-smoke", "failedCase must preserve delegated first failed predev step");
  assert(summary.delegatedFailure?.name === "integrated-smoke", "delegatedFailure must include failed predev step name");
  assert(summary.delegatedFailure?.logFile === "/tmp/predev/integrated_smoke.log", "delegatedFailure must preserve predev log path");
  assert(summary.delegatedFailure?.context === "predev case integrated-smoke failed after server start", "delegatedFailure must preserve context");
  assert(summary.delegatedFailure?.stderrTail?.includes("fixture delegated stderr"), "delegatedFailure must preserve stderr tail");
  assert(summary.delegatedFailure?.reproductionCommand === "./server.sh test --no-start --include-va-events", "delegatedFailure must preserve reproduction command");
  assert(summary.delegatedFailure?.laterNotRunCases?.includes("soak-1-va-events"), "delegatedFailure must preserve later not-run cases");
  assert(summary.delegatedFirstFailContractSatisfied === true, "delegated summary must satisfy first-fail sequence contract");
  assert(summary.failure?.case === "integrated-smoke", "top-level failure must name delegated case");
  assertIncludes(run.stdout, "[first-fail] context: predev case integrated-smoke failed after server start", "delegated failure console context");
  assertIncludes(run.stdout, "[first-fail] stderr: fixture delegated stderr", "delegated failure console stderr");
  assertIncludes(run.stdout, "[first-fail] reproduce: ./server.sh test --no-start --include-va-events", "delegated failure console reproduction");
  const phase = summary.phases.find(item => item.id === "soak-case-loop");
  assert(phase?.summaryPath === fixtureSummaryPath, "soak-case-loop phase must point at delegated predev summary");
  assert(phase?.tail?.some(line => line.includes("delegated predev first failure: integrated-smoke")),
    "phase tail must name delegated first failure");
  const report = readTextAbsolute(run.reportPath);
  assertIncludes(report, "failedCase: integrated-smoke", "predev summary fixture report");
  assertIncludes(report, "delegatedFailure: integrated-smoke", "predev summary fixture report");
});

check("predev executable fixtures separate first-fail and legacy cumulative case loops", () => {
  const run = runPredevFailureFixture("--fixture-first-fail", "first_fail");
  assert(run.status === "failed-as-expected", `predev first-fail fixture should exit non-zero, got ${run.status}`);
  const summary = readJson(run.summaryPath);
  temporaryOutputDirs.add(summary.workDir);
  assert(summary.status === "fail", "predev fixture status must be fail");
  assert(summary.fail === 1, `predev fixture must record one failure, got ${summary.fail}`);
  assert(summary.notRun >= 1, "predev fixture must record later not-run cases");
  const failedIndex = summary.steps.findIndex(step => step.result === "fail");
  assert(failedIndex >= 0, "predev fixture must contain a failed case");
  assert(summary.steps.slice(failedIndex + 1).every(step => ["not-run", "pass"].includes(step.result)),
    "after first failure only explicit not-run or mandatory cleanup/report may appear");
  const failed = summary.steps[failedIndex];
  assert(failed.name === "fixture-second", "fixture must fail at fixture-second");
  assert(fs.existsSync(failed.stdoutFile), "failed fixture stdout file must exist during contract replay");
  assert(fs.existsSync(failed.stderrFile), "failed fixture stderr file must exist during contract replay");
  assert(failed.stderrTail?.includes("fixture delegated stderr"), "failed fixture must preserve stderr tail");
  assertIncludes(failed.context, "fixture-second", "failed fixture context");
  assertIncludes(failed.reproductionCommand, "fixture delegated stderr", "failed fixture reproduction command");
  const later = summary.steps.find(step => step.name === "fixture-third");
  assert(later?.result === "not-run", "fixture-third must be not-run");

  const cumulativeRun = runPredevFailureFixture("--fixture-cumulative-fail", "cumulative_fail");
  assert(cumulativeRun.status === "failed-as-expected", `predev cumulative fixture should exit non-zero, got ${cumulativeRun.status}`);
  const cumulative = readJson(cumulativeRun.summaryPath);
  temporaryOutputDirs.add(cumulative.workDir);
  assert(cumulative.fail === 1, "cumulative fixture must retain the failure");
  assert(cumulative.notRun === 0, "cumulative fixture must not synthesize not-run cases");
  assert(cumulative.steps.find(step => step.name === "fixture-third")?.result === "pass",
    "legacy cumulative fixture must continue to fixture-third");
});

check("runner rejects unsupported longrun durations", () => {
  const run = runFixture("bad-duration", ["--duration-minutes", "1", "--fixture-pass"]);
  assert(run.status === "failed-as-expected", `bad duration fixture should exit non-zero, got ${run.status}`);
  assertIncludes(run.stderr, "--duration-minutes must be 30 or 120", "bad duration stderr");
  assert(!fs.existsSync(run.summaryPath), "bad duration must not write summary evidence");
});

check("docs and release evidence record R1 implementation without overclaiming real duration runs", () => {
  for (const snippet of [
    `\`./server.sh ${command} --duration-minutes 30 --output-dir <path>\``,
    `\`./server.sh ${contractCommand}\``,
    "media-server.v390-server-longrun.v1",
    "stop-on-first-fail",
    "context, separated stderr tail, reproduction command",
    "[progress] (1/9) preflight test; remaining=8",
    "later phase/case `not-run`",
    "fixture-only-not-real-duration",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification R1 runner");
  }
  for (const snippet of [
    "v3.9.0 R1 / V390-ADD1-10 AI-minimized server longrun first-fail runner",
    "OPS-168",
    "SAFE-201",
    command,
    contractCommand,
    "실제 30분/120분 longrun 실행 evidence가 아닙니다",
  ]) {
    assertIncludes(files.projectInventory, snippet, "project inventory R1 runner");
  }
  for (const snippet of [
    "v390 R1 RED server longrun runner contract",
    "v390 R1 server longrun runner final",
    "v390 30분 longrun R1 runner actual final",
    "v390 R1 실제 120분 longrun",
    "real-duration-evidence",
    "fixture-only-not-real-duration",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records R1 runner");
  }
  for (const snippet of [
    "v3.9.0 R1 / V390-ADD1-10 server longrun first-fail runner",
    command,
    contractCommand,
    "v390 30분 longrun R1 runner actual final",
    "v390 R1 실제 120분 longrun",
    "real 120-minute duration evidence",
  ]) {
    assertIncludes(files.releaseEvidence, snippet, "release evidence R1 runner");
  }
});

finish();

function runFixture(label, extraArgs) {
  const outputDir = path.join("/tmp", `media_server_v390_longrun_contract_${label}_${process.pid}`);
  temporaryOutputDirs.add(outputDir);
  fs.rmSync(outputDir, { recursive: true, force: true });
  const args = [
    runnerPath,
    "--output-dir",
    outputDir,
    ...extraArgs,
  ];
  if (!extraArgs.includes("--duration-minutes")) {
    args.splice(1, 0, "--duration-minutes", "30");
  }
  const expectsFailure = extraArgs.includes("--fixture-fail-phase")
    || extraArgs.includes("--duration-minutes") && extraArgs.includes("1");
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

function runPredevFailureFixture(modeOption, label) {
  const outputDir = path.join("/tmp", `media_server_v390_predev_${label}_${process.pid}`);
  temporaryOutputDirs.add(outputDir);
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });
  const summaryPath = path.join(outputDir, "summary.json");
  const reportPath = path.join(outputDir, "report.md");
  const reportHtmlPath = path.join(outputDir, "report.html");
  let stdout = "";
  let stderr = "";
  let status = "passed";
  try {
    stdout = execFileSync(path.join(rootDir, "server.sh"), [
      "verify-predev",
      modeOption,
      "--summary-file", summaryPath,
      "--report-file", reportPath,
      "--report-html-file", reportHtmlPath,
    ], {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    status = "failed-as-expected";
    stdout = error?.stdout ? String(error.stdout) : "";
    stderr = error?.stderr ? String(error.stderr) : "";
  }
  return { status, outputDir, summaryPath, reportPath, stdout, stderr };
}

function assertPhaseStatus(summary, id, expectedStatus) {
  const phase = summary.phases.find(item => item.id === id);
  assert(phase, `missing phase: ${id}`);
  assert(phase.status === expectedStatus, `phase ${id} expected ${expectedStatus}, got ${phase.status}`);
}

function finish() {
  const results = runChecks();
  console.log("");
  console.log("== v3.9.0 server longrun runner contract summary ==");
  console.log("- schema: media-server.v390-server-longrun.v1");
  console.log(`- command: ${command}`);
  console.log(`- contractCommand: ${contractCommand}`);
  console.log("- realDurationEvidence: not-run-by-this-command");
  console.log(`- pass: ${results.pass}`);
  console.log(`- fail: ${results.fail}`);
  if (results.fail > 0) process.exit(1);
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

function readTextAbsolute(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function readJson(filePath) {
  return JSON.parse(readTextAbsolute(filePath));
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function assertIncludes(text, snippet, label) {
  assert(text.includes(snippet), `${label} missing snippet: ${snippet}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

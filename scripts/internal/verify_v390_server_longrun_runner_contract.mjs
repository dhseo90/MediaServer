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
  - fixture failure stops at the first failed phase and records later phases as not-run
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

const files = {
  serverSh: readText("server.sh"),
  streamVerification: readText("docs/stream-verification.md"),
  projectInventory: readText("docs/project-feature-test-inventory.md"),
  releaseRecords: readText("docs/release-test-records.md"),
  releaseEvidence: readText("docs/release-evidence-index.md"),
  scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
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
    "[progress] (1/9) preflight test; remaining=8",
    "later phase `not-run`",
    "fixture-only-not-real-duration",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification R1 runner");
  }
  for (const snippet of [
    "v3.9.0 R1 AI-minimized server longrun runner 실제 구현",
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
    "v3.9.0 R1 server longrun runner",
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

function assertIncludes(text, snippet, label) {
  assert(text.includes(snippet), `${label} missing snippet: ${snippet}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

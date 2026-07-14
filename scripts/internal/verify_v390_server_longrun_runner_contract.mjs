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
  - delegated predev start/smoke/soak/runtime results are projected into the exact parent phases
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
  runner: readText("scripts/internal/verify_v390_server_longrun.mjs"),
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
    "media-server.v390-delegated-phase-ledger.v1",
    "validateDelegatedPhaseLedger",
    '"event-post-schema", "event-post-recovery", "redaction", "runtime-idle"',
    "duplicateCaseIds",
    "delegatedPhaseLedgerValid",
  ]) {
    assertIncludes(files.runner, snippet, "runner delegated exact ledger contract");
  }
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
  assert(summary.schema === "media-server.v390-server-longrun.v2", "unexpected summary schema");
  assert(summary.result === "FAIL", "failure fixture summary result must be FAIL");
  assert(summary.stopOnFirstFail === true, "summary must set stopOnFirstFail=true");
  assert(summary.failedPhase === "integrated-smoke", "failedPhase must be integrated-smoke");
  assert(summary.failedCase === "fixture-integrated-smoke", "failedCase must name fixture failure");
  assert(summary.exitCode !== 0, "failure fixture exitCode must be non-zero");
  assert(summary.cleanup.serverStopped === true, "cleanup.serverStopped must be true");
  assert(summary.cleanup.portsClean === true, "cleanup.portsClean must be true");
  assert(summary.cleanup.temporaryArtifactsRemoved === true, "cleanup.temporaryArtifactsRemoved must be true");
  assert(summary.cleanup.verificationSource === "fixture-filesystem-and-port-observation", "fixture cleanup verification source missing");
  assert(Array.isArray(summary.cleanup.checks) && summary.cleanup.checks.length > 0, "cleanup measured checks missing");
  assert(summary.sourceProvenance?.commitSha?.match(/^[a-f0-9]{40}$/), "source commit SHA missing");
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
  assert(summary.durationEvidence?.schema === "media-server.v390-monotonic-duration-evidence.v1", "fixture duration measurement schema missing");
  assert(summary.durationEvidence?.eligibleRealDuration === false, "fixture duration measurement became eligible");
  assert(summary.iterationEvidence?.valid === false, "fixture without delegated steps invented an iteration ledger");
  assert(summary.longrunEvidenceStatus === "fixture-only-not-real-duration", "fixture status must not overclaim");
  assert(summary.cleanup.verificationSource === "fixture-filesystem-and-port-observation", "fixture cleanup source mismatch");
  for (const phase of summary.phases) {
    assert(phase.status === "PASS", `pass fixture phase must PASS: ${phase.id}`);
  }
  const report = readTextAbsolute(run.reportPath);
  assertIncludes(report, "realDurationEvidence: false", "pass fixture report");
  assertIncludes(report, "fixture-only-not-real-duration", "pass fixture report");
});

check("predev summary fixture preserves delegated first failure step", () => {
  const fixtureSteps = canonicalDelegatedIntegratedFailureSteps();
  Object.assign(fixtureSteps.find(step => step.name === "integrated-smoke"), {
    command: "./server.sh test --no-start --include-va-events",
    logFile: "/tmp/predev/integrated_smoke.log",
    stdoutFile: "/tmp/predev/integrated_smoke.stdout.log",
    stderrFile: "/tmp/predev/integrated_smoke.stderr.log",
    stderrTail: ["fixture delegated stderr"],
    context: "predev case integrated-smoke failed after server start",
    reproductionCommand: "./server.sh test --no-start --include-va-events",
    durationSec: 11,
  });
  const fixtureSummaryPath = writeDelegatedSummaryFixture("predev-summary-fail", "fail", fixtureSteps);
  const run = runFixture("predev-summary-fail", [
    "--fixture-fail-phase",
    "soak-case-loop",
    "--fixture-predev-summary",
    fixtureSummaryPath,
  ]);
  assert(run.status === "failed-as-expected", `predev summary fixture should exit non-zero, got ${run.status}`);
  const summary = readJson(run.summaryPath);
  assert(summary.result === "FAIL", "predev summary fixture result must be FAIL");
  assert(summary.failedPhase === "integrated-smoke", "top-level failedPhase must project the delegated integrated-smoke failure");
  assert(summary.failedCase === "integrated-smoke", "failedCase must preserve delegated first failed predev step");
  assert(summary.delegatedFailure?.name === "integrated-smoke", "delegatedFailure must include failed predev step name");
  assert(summary.delegatedFailure?.logFile === "/tmp/predev/integrated_smoke.log", "delegatedFailure must preserve predev log path");
  assert(summary.delegatedFailure?.context === "predev case integrated-smoke failed after server start", "delegatedFailure must preserve context");
  assert(summary.delegatedFailure?.stderrTail?.includes("fixture delegated stderr"), "delegatedFailure must preserve stderr tail");
  assert(summary.delegatedFailure?.reproductionCommand === "./server.sh test --no-start --include-va-events", "delegatedFailure must preserve reproduction command");
  assert(summary.delegatedFailure?.laterNotRunCases?.includes("soak-case-loop"), "delegatedFailure must preserve later not-run cases");
  assert(summary.delegatedFirstFailContractSatisfied === true, "delegated summary must satisfy first-fail sequence contract");
  assert(summary.failure?.case === "integrated-smoke", "top-level failure must name delegated case");
  assertIncludes(run.stdout, "[first-fail] context: predev case integrated-smoke failed after server start", "delegated failure console context");
  assertIncludes(run.stdout, "[first-fail] stderr: fixture delegated stderr", "delegated failure console stderr");
  assertIncludes(run.stdout, "[first-fail] reproduce: ./server.sh test --no-start --include-va-events", "delegated failure console reproduction");
  assertPhaseStatus(summary, "start-server", "PASS");
  assertPhaseStatus(summary, "integrated-smoke", "FAIL");
  assertPhaseStatus(summary, "soak-case-loop", "not-run");
  assertPhaseStatus(summary, "runtime-idle", "not-run");
  const phase = summary.phases.find(item => item.id === "integrated-smoke");
  assert(phase?.summaryPath === fixtureSummaryPath, "integrated-smoke phase must point at delegated predev summary");
  assert(!summary.phases.some(item => item.command === "fixture pass start-server" || item.command === "fixture pass integrated-smoke"),
    "delegated phases must not retain synthetic fixture PASS entries");
  const report = readTextAbsolute(run.reportPath);
  assertIncludes(report, "failedPhase: integrated-smoke", "predev summary fixture report");
  assertIncludes(report, "failedCase: integrated-smoke", "predev summary fixture report");
  assertIncludes(report, "delegatedFailure: integrated-smoke", "predev summary fixture report");
});

check("delegated phase projection maps start, runtime, and successful ledgers without synthetic PASS", () => {
  const startFailurePath = writeDelegatedSummaryFixture("start-fail", "fail", canonicalDelegatedStartFailureSteps());
  const startRun = runFixture("delegated-start-fail", [
    "--fixture-fail-phase", "soak-case-loop",
    "--fixture-predev-summary", startFailurePath,
  ]);
  const startSummary = readJson(startRun.summaryPath);
  assert(startSummary.failedPhase === "start-server", "server-start-queue-256 failure must project to start-server");
  assertPhaseStatus(startSummary, "start-server", "FAIL");
  assertPhaseStatus(startSummary, "integrated-smoke", "not-run");
  assertPhaseStatus(startSummary, "soak-case-loop", "not-run");
  assertPhaseStatus(startSummary, "runtime-idle", "not-run");

  const runtimeFailurePath = writeDelegatedSummaryFixture("runtime-fail", "fail", canonicalDelegatedRuntimeFailureSteps());
  const runtimeRun = runFixture("delegated-runtime-fail", [
    "--fixture-fail-phase", "soak-case-loop",
    "--fixture-predev-summary", runtimeFailurePath,
  ]);
  const runtimeSummary = readJson(runtimeRun.summaryPath);
  assert(runtimeSummary.failedPhase === "runtime-idle", "main-runtime-idle failure must project to runtime-idle");
  assertPhaseStatus(runtimeSummary, "start-server", "PASS");
  assertPhaseStatus(runtimeSummary, "integrated-smoke", "PASS");
  assertPhaseStatus(runtimeSummary, "soak-case-loop", "PASS");
  assertPhaseStatus(runtimeSummary, "runtime-idle", "FAIL");

  const passPath = writeDelegatedSummaryFixture("pass", "pass", canonicalDelegatedPassSteps());
  const passRun = runFixture("delegated-pass", ["--fixture-predev-summary", passPath]);
  const passSummary = readJson(passRun.summaryPath);
  assert(passSummary.result === "PASS", "delegated pass fixture must pass");
  assert(passSummary.delegatedPhaseLedger?.valid === true, "delegated pass ledger must be valid");
  assert(passSummary.delegatedPhaseLedger.expectedCount === passSummary.delegatedPhaseLedger.observedCount,
    "delegated pass expected/observed count mismatch");
  for (const phaseId of ["start-server", "integrated-smoke", "soak-case-loop", "runtime-idle"]) {
    assertPhaseStatus(passSummary, phaseId, "PASS");
    const phase = passSummary.phases.find(item => item.id === phaseId);
    assert(phase?.summaryPath === passPath, `${phaseId} must retain delegated summary provenance`);
    assert(!String(phase?.command || "").startsWith("fixture pass"), `${phaseId} must not be a synthetic PASS`);
  }
  assertIncludes(readTextAbsolute(passRun.reportPath), "delegatedPhaseLedgerValid: true", "delegated pass report ledger");

  const multiPath = writeDelegatedSummaryFixture("two-iteration-pass", "pass", canonicalDelegatedPassSteps(2, true));
  const multiRun = runFixture("delegated-two-iteration-pass", ["--fixture-predev-summary", multiPath]);
  const multiSummary = readJson(multiRun.summaryPath);
  assert(multiRun.status === "passed" && multiSummary.result === "PASS", "two exact soak iterations must pass");
  assert(multiSummary.delegatedPhaseLedger?.valid === true, "two-iteration delegated ledger must be valid");
  assert(multiSummary.delegatedPhaseLedger.phases.find(item => item.parentPhase === "soak-case-loop")?.observedCount === 10,
    "two-iteration soak ledger must contain exact 10 cases");

  const soakFailureSteps = canonicalDelegatedPassSteps();
  const failedIndex = soakFailureSteps.findIndex(step => step.name === "soak-1-event-post-schema");
  soakFailureSteps[failedIndex].result = "fail";
  for (const step of soakFailureSteps.slice(failedIndex + 1)) {
    if (!["ports-clean", "summary-report"].includes(step.name)) step.result = "not-run";
  }
  const runtimeIdleIndex = soakFailureSteps.findIndex(step => step.name === "soak-1-runtime-idle");
  soakFailureSteps.splice(runtimeIdleIndex + 1, 0, delegatedStep("soak-future-iterations", "not-run"));
  const soakFailurePath = writeDelegatedSummaryFixture("soak-failure", "fail", soakFailureSteps);
  const soakFailureRun = runFixture("delegated-soak-failure", [
    "--fixture-fail-phase", "soak-case-loop", "--fixture-predev-summary", soakFailurePath,
  ]);
  const soakFailureSummary = readJson(soakFailureRun.summaryPath);
  assert(soakFailureSummary.failedPhase === "soak-case-loop", "soak case failure must project to soak-case-loop");
  assert(soakFailureSummary.failedCase === "soak-1-event-post-schema", "soak failedCase must preserve exact ID");
  assert(soakFailureSummary.delegatedPhaseLedger?.valid === true, "complete failed soak ledger must remain structurally valid");
});

check("delegated exact ledger rejects partial missing duplicate reordered unknown result and counter summaries", () => {
  const canonical = canonicalDelegatedPassSteps();
  const mutations = [
    ["partial", steps => steps.filter(step => !step.name.includes("event-post-"))],
    ["missing", steps => steps.filter(step => step.name !== "queue-runtime-idle")],
    ["duplicate", steps => [...steps.slice(0, 2), structuredClone(steps[1]), ...steps.slice(2)]],
    ["reordered", steps => {
      const copy = structuredClone(steps);
      const first = copy.findIndex(step => step.name === "soak-1-va-events");
      [copy[first], copy[first + 1]] = [copy[first + 1], copy[first]];
      return copy;
    }],
    ["unknown", steps => {
      const copy = structuredClone(steps);
      copy.splice(6, 0, delegatedStep("soak-1-client-declared-pass", "pass"));
      return copy;
    }],
    ["not-run-with-pass-status", steps => {
      const copy = structuredClone(steps);
      copy.find(step => step.name === "soak-1-event-post-recovery").result = "not-run";
      return copy;
    }],
  ];
  for (const [label, mutate] of mutations) {
    const fixturePath = writeDelegatedSummaryFixture(`invalid-${label}`, "pass", mutate(structuredClone(canonical)));
    const run = runFixture(`delegated-invalid-${label}`, ["--fixture-predev-summary", fixturePath]);
    assert(run.status === "failed-as-expected", `${label} delegated summary must fail parent projection`);
    const summary = readJson(run.summaryPath);
    assert(summary.result === "FAIL", `${label} delegated summary result must be FAIL`);
    assert(summary.delegatedPhaseLedger?.valid === false, `${label} delegated ledger must be invalid`);
    assert((summary.delegatedPhaseLedger?.errors || []).length > 0, `${label} delegated ledger errors missing`);
    assertIncludes(readTextAbsolute(run.reportPath), "delegatedPhaseLedgerValid: false", `${label} delegated report ledger`);
  }
  const countPath = writeDelegatedSummaryFixture("invalid-count", "pass", canonicalDelegatedPassSteps());
  const countFixture = readJson(countPath);
  countFixture.pass += 1;
  writeJson(countPath, countFixture);
  const countRun = runFixture("delegated-invalid-count", ["--fixture-predev-summary", countPath]);
  assert(countRun.status === "failed-as-expected", "delegated summary counter mismatch must fail parent projection");
  const countSummary = readJson(countRun.summaryPath);
  assert(countSummary.delegatedPhaseLedger?.valid === false, "delegated count mismatch ledger must be invalid");
  assert(countSummary.delegatedPhaseLedger.errors.some(error => error.includes("count mismatch")),
    "delegated count mismatch error missing");
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
    "v3.9.0 R1 / V390-ADD1-10 / V390-REVIEW2-31 AI-minimized server longrun first-fail runner",
    "OPS-168",
    "SAFE-201",
    command,
    contractCommand,
    "server-start-queue-256",
    "main-runtime-idle",
    "synthetic PASS",
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
    || extraArgs.includes("--duration-minutes") && extraArgs.includes("1")
    || label.startsWith("delegated-invalid-");
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

function writeDelegatedSummaryFixture(label, status, steps) {
  const fixturePath = path.join("/tmp", `media_server_v390_delegated_ledger_${label}_${process.pid}.json`);
  temporaryFiles.add(fixturePath);
  writeJson(fixturePath, {
    kind: "predev",
    status,
    pass: steps.filter(step => step.result === "pass").length,
    fail: steps.filter(step => step.result === "fail").length,
    skip: steps.filter(step => step.result === "skip").length,
    notRun: steps.filter(step => step.result === "not-run").length,
    durationSec: 1,
    soakMinutes: 30,
    quickMode: false,
    includeExternalTurn: steps.find(step => step.name === "external-turn-hard-gate")?.result === "pass",
    includeExternalClient: false,
    includeRedaction: steps.some(step => /-redaction$/.test(step.name) && step.result === "pass"),
    steps,
  });
  return fixturePath;
}

function delegatedStep(name, result) {
  return {
    name,
    result,
    command: `fixture ${name}`,
    logFile: `/tmp/predev/${name}.log`,
    stdoutFile: `/tmp/predev/${name}.stdout.log`,
    stderrFile: `/tmp/predev/${name}.stderr.log`,
    stderrTail: result === "fail" ? [`fixture ${name} stderr`] : [],
    context: `fixture delegated ${name} ${result}`,
    reproductionCommand: `fixture ${name}`,
    durationSec: result === "pass" ? 1 : 0,
  };
}

function canonicalDelegatedPassSteps(iterations = 1, includeRedaction = false, includeExternalTurn = false) {
  const steps = [
    delegatedStep("build", "skip"),
    delegatedStep("server-start-queue-256", "pass"),
    delegatedStep("integrated-smoke", "pass"),
    delegatedStep("external-turn-hard-gate", includeExternalTurn ? "pass" : "skip"),
  ];
  for (let iteration = 1; iteration <= iterations; iteration += 1) {
    steps.push(
      delegatedStep(`soak-${iteration}-va-events`, "pass"),
      delegatedStep(`soak-${iteration}-event-post-schema`, "pass"),
      delegatedStep(`soak-${iteration}-event-post-recovery`, "pass"),
      delegatedStep(`soak-${iteration}-redaction`, includeRedaction ? "pass" : "skip"),
      delegatedStep(`soak-${iteration}-runtime-idle`, "pass"),
    );
  }
  steps.push(
    delegatedStep("main-runtime-idle", "pass"),
    delegatedStep("server-start-queue-2", "pass"),
    delegatedStep("event-post-queue", "pass"),
    delegatedStep("queue-runtime-idle", "pass"),
    delegatedStep("ports-clean", "pass"),
    delegatedStep("summary-report", "pass"),
  );
  return steps;
}

function canonicalDelegatedStartFailureSteps() {
  return [
    delegatedStep("build", "skip"),
    delegatedStep("server-start-queue-256", "fail"),
    delegatedStep("integrated-smoke", "not-run"),
    delegatedStep("external-turn-hard-gate", "not-run"),
    delegatedStep("soak-case-loop", "not-run"),
    delegatedStep("main-runtime-idle", "not-run"),
    delegatedStep("server-start-queue-2", "not-run"),
    delegatedStep("event-post-queue", "not-run"),
    delegatedStep("queue-runtime-idle", "not-run"),
    delegatedStep("ports-clean", "pass"),
    delegatedStep("summary-report", "pass"),
  ];
}

function canonicalDelegatedIntegratedFailureSteps() {
  const steps = canonicalDelegatedStartFailureSteps();
  steps.find(step => step.name === "server-start-queue-256").result = "pass";
  steps.find(step => step.name === "integrated-smoke").result = "fail";
  return steps;
}

function canonicalDelegatedRuntimeFailureSteps() {
  const steps = canonicalDelegatedPassSteps();
  steps.find(step => step.name === "main-runtime-idle").result = "fail";
  for (const id of ["server-start-queue-2", "event-post-queue", "queue-runtime-idle"]) {
    steps.find(step => step.name === id).result = "not-run";
  }
  return steps;
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
  console.log("- schema: media-server.v390-server-longrun.v2");
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

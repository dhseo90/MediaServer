#!/usr/bin/env node
// 파일 용도: v3.9.0 server longrun을 하나의 stop-on-first-fail runner와 summary/report evidence로 실행한다.

import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { execFileSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import { collectSourceProvenance, scanArtifactTree } from "./evidence_integrity_lib.mjs";
import {
  buildMonotonicDurationEvidence,
  validateCleanupMeasurement,
  validateIterationLedger,
} from "./v390_longrun_evidence_measurement_lib.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 server longrun runner

Usage:
  ./server.sh verify-v390-server-longrun --duration-minutes <30|120> --output-dir <path> [options]

Options:
  --duration-minutes <n>       Requested longrun duration in minutes.
  --output-dir <path>          Directory for summary.json, report.md, and phase logs.
  --fixture-pass               Fast contract fixture: mark all phases PASS without real duration execution.
  --fixture-fail-phase <id>    Fast contract fixture: fail at one phase and mark later phases not-run.
  --fixture-predev-summary <path>
                               Fast contract fixture: project a delegated predev summary into the parent phase ledger.
  --user-launcher <id>         Internal caller identity for a root no-option launcher.
  -h, --help                   Show help.

Notes:
  Fixture modes are contract evidence only. They do not claim real 30-minute or
  120-minute longrun execution evidence.
`);
}

assertKnownOptions(rawArgs, [
  "duration-minutes",
  "output-dir",
  "fixture-pass",
  "fixture-fail-phase",
  "fixture-predev-summary",
  "user-launcher",
  "h",
  "help",
]);

const phaseIds = [
  "preflight",
  "build",
  "seed",
  "start-server",
  "integrated-smoke",
  "soak-case-loop",
  "runtime-idle",
  "cleanup",
  "report",
];

const options = parseArgs(rawArgs);
const outputDir = path.resolve(rootDir, options.outputDir);
const summaryPath = path.join(outputDir, "summary.json");
const reportPath = path.join(outputDir, "report.md");
const runId = `v390-server-longrun-${new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14)}-${process.pid}`;
const fixtureMode = options.fixturePass || options.fixtureFailPhase !== "" || options.fixturePredevSummary !== "";
const allocatedPorts = fixtureMode
  ? { http: 18000 + (process.pid % 1000), rtsp: 19000 + (process.pid % 1000) }
  : await allocatePortPair();
process.env.MEDIA_SERVER_VERIFY_PREDEV_HTTP_PORT = String(allocatedPorts.http);
process.env.MEDIA_SERVER_VERIFY_PREDEV_RTSP_PORT = String(allocatedPorts.rtsp);
const runStartedAt = new Date().toISOString();
const runStartedMonotonicNs = process.hrtime.bigint();
const phases = [];
let failedPhase = "";
let failedCase = "";
let exitCode = 0;
let delegatedFailure = null;
let delegatedPhaseLedger = null;
let failure = null;
let predevSummaryPath = "";
let cleanup = {
  status: "pending",
  verificationSource: "predev-summary-filesystem-and-port-observation",
  serverStopped: false,
  portsClean: false,
  temporaryArtifactsRemoved: false,
  preservedArtifacts: [],
  checks: [],
};

fs.mkdirSync(outputDir, { recursive: true });

await runPhases();

const runEndedMonotonicNs = process.hrtime.bigint();
const runEndedAt = new Date().toISOString();
const finalPredevSummary = readPredevSummary(predevSummaryPath);
const durationEvidence = buildMonotonicDurationEvidence({
  requestedMinutes: options.durationMinutes,
  fixtureMode,
  runnerStartedNs: runStartedMonotonicNs.toString(),
  runnerEndedNs: runEndedMonotonicNs.toString(),
  delegated: finalPredevSummary?.monotonicDuration || null,
});
const iterationErrors = validateIterationLedger(finalPredevSummary?.soakIterationLedger, finalPredevSummary?.steps);
const iterationEvidence = {
  schema: "media-server.v390-iteration-evidence.v1",
  valid: iterationErrors.length === 0,
  errors: iterationErrors,
  ledger: finalPredevSummary?.soakIterationLedger || null,
};
if (!fixtureMode && exitCode === 0 && (!durationEvidence.eligibleRealDuration || !iterationEvidence.valid)) {
  const errors = [...durationEvidence.validationErrors, ...iterationEvidence.errors];
  exitCode = 1;
  failedPhase = "soak-case-loop";
  failedCase = "duration-iteration-evidence-qualification";
  failure = makeFailure({
    phase: failedPhase,
    caseName: failedCase,
    context: errors.join("; "),
    stderrTail: errors,
    reproductionCommand: reproductionCommand(),
    command: "qualify monotonic duration and explicit iteration ledger",
    failureExitCode: 1,
    logPath: "",
    phaseSummaryPath: predevSummaryPath,
  });
  const phase = phases.find(item => item.id === "soak-case-loop");
  if (phase) {
    phase.status = "FAIL";
    phase.exitCode = 1;
    phase.tail = [...(phase.tail || []), ...errors];
  }
}
const result = exitCode === 0 ? "PASS" : "FAIL";
const summary = {
  schema: "media-server.v390-server-longrun.v2",
  runId,
  command: `./server.sh verify-v390-server-longrun ${rawArgs.join(" ")}`,
  sourceProvenance: collectSourceProvenance(rootDir),
  durationMinutes: options.durationMinutes,
  runStartedAt,
  runEndedAt,
  durationEvidence,
  iterationEvidence,
  delegatedSteps: Array.isArray(finalPredevSummary?.steps)
    ? finalPredevSummary.steps.map(step => ({ name: step?.name, result: step?.result }))
    : [],
  result,
  stopOnFirstFail: true,
  failedPhase,
  failedCase,
  exitCode,
  ports: {
    http: allocatedPorts.http,
    rtsp: allocatedPorts.rtsp,
    allocation: "runner-owned-ephemeral-loopback",
  },
  authorization: buildAuthorizationEvidence(),
  outputDir,
  summaryPath,
  reportPath,
  cleanup,
  delegatedFailure,
  delegatedPhaseLedger,
  delegatedFirstFailContractSatisfied: delegatedFailure?.firstFailContractSatisfied ?? true,
  failure,
  realDurationEvidence: !fixtureMode && result === "PASS" && durationEvidence.eligibleRealDuration && iterationEvidence.valid,
  longrunEvidenceStatus: longrunEvidenceStatus(fixtureMode, result),
  phases,
};

writeJson(summaryPath, summary);
writeReport(reportPath, summary);

console.log("");
console.log("== v3.9.0 server longrun runner summary ==");
console.log(`- schema: ${summary.schema}`);
console.log(`- result: ${summary.result}`);
console.log(`- durationMinutes: ${summary.durationMinutes}`);
console.log(`- stopOnFirstFail: ${summary.stopOnFirstFail}`);
console.log(`- failedPhase: ${summary.failedPhase}`);
console.log(`- failedCase: ${summary.failedCase}`);
console.log(`- delegatedPhaseLedgerValid: ${summary.delegatedPhaseLedger?.valid ?? "not-applicable"}`);
console.log(`- longrunEvidenceStatus: ${summary.longrunEvidenceStatus}`);
console.log(`- summaryPath: ${summary.summaryPath}`);
console.log(`- reportPath: ${summary.reportPath}`);

if (exitCode !== 0) process.exit(exitCode);

async function runPhases() {
  const delegatedProjectionMode = !options.fixturePass && Boolean(options.fixturePredevSummary);
  for (const phaseId of phaseIds) {
    if (delegatedProjectionMode && ["start-server", "integrated-smoke", "runtime-idle"].includes(phaseId)) {
      printProgress(phaseId, "delegated-pending");
      continue;
    }
    const status = phaseStatusFor(phaseId);
    printProgress(phaseId, status);
    if (status === "not-run") {
      phases.push(makePhase({
        id: phaseId,
        status,
        command: "",
        exitCode: null,
        logPath: "",
        summaryPath: "",
        tail: [],
      }));
      continue;
    }

    if (delegatedProjectionMode && phaseId === "soak-case-loop") {
      runDelegatedFixturePhase();
    } else if (fixtureMode) {
      runFixturePhase(phaseId);
    } else {
      await runRealPhase(phaseId);
    }
  }
}

function printProgress(phaseId, status) {
  const phaseIndex = phaseIds.indexOf(phaseId) + 1;
  const remaining = phaseIds.length - phaseIndex;
  const label = status === "not-run" ? "not-run" : "test";
  console.log(`[progress] (${phaseIndex}/${phaseIds.length}) ${phaseId} ${label}; remaining=${remaining}`);
}

function parseArgs(args) {
  const parsed = {
    durationMinutes: null,
    outputDir: "",
    fixturePass: false,
    fixtureFailPhase: "",
    fixturePredevSummary: "",
    userLauncher: "",
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--duration-minutes") {
      parsed.durationMinutes = parsePositiveInt(args[index + 1], "--duration-minutes");
      index += 1;
    } else if (arg === "--output-dir") {
      parsed.outputDir = args[index + 1] || "";
      index += 1;
    } else if (arg === "--fixture-pass") {
      parsed.fixturePass = true;
    } else if (arg === "--fixture-fail-phase") {
      parsed.fixtureFailPhase = args[index + 1] || "";
      index += 1;
    } else if (arg === "--fixture-predev-summary") {
      parsed.fixturePredevSummary = args[index + 1] || "";
      index += 1;
    } else if (arg === "--user-launcher") {
      parsed.userLauncher = args[index + 1] || "";
      index += 1;
    }
  }
  assert(parsed.durationMinutes !== null, "--duration-minutes is required");
  assert(parsed.outputDir !== "", "--output-dir is required");
  assert(!(parsed.fixturePass && parsed.fixtureFailPhase), "--fixture-pass and --fixture-fail-phase are mutually exclusive");
  if (parsed.fixtureFailPhase) {
    assert(phaseIds.includes(parsed.fixtureFailPhase), `unknown fixture fail phase: ${parsed.fixtureFailPhase}`);
    assert(!["cleanup", "report"].includes(parsed.fixtureFailPhase), "fixture failure phase must be before cleanup/report");
  }
  assert(!(parsed.fixturePass && parsed.fixturePredevSummary), "--fixture-pass and --fixture-predev-summary are mutually exclusive");
  assert(["", "test_server_30min", "test_server_120min"].includes(parsed.userLauncher), "unknown --user-launcher");
  if (parsed.userLauncher === "test_server_30min") assert(parsed.durationMinutes === 30, "test_server_30min must delegate only 30 minutes");
  if (parsed.userLauncher === "test_server_120min") assert(parsed.durationMinutes === 120, "test_server_120min must delegate only 120 minutes");
  return parsed;
}

function phaseStatusFor(phaseId) {
  if (!failedPhase) return "pending";
  if (["cleanup", "report"].includes(phaseId)) return "pending";
  return "not-run";
}

function runFixturePhase(phaseId) {
  if (options.fixtureFailPhase === phaseId) {
    const delegated = readDelegatedFailure(options.fixturePredevSummary);
    if (delegated) delegatedFailure = delegated;
    failedPhase = phaseId;
    failedCase = delegated?.name || `fixture-${phaseId}`;
    exitCode = 1;
    const context = delegated?.context || `fixture phase ${phaseId} failed`;
    const stderrTail = delegated?.stderrTail?.length > 0
      ? delegated.stderrTail
      : [`fixture stderr at ${phaseId}`];
    const reproductionCommandValue = options.userLauncher
      ? reproductionCommand()
      : (delegated?.reproductionCommand || `fixture fail ${phaseId}`);
    failure = makeFailure({
      phase: phaseId,
      caseName: failedCase,
      context,
      stderrTail,
      reproductionCommand: reproductionCommandValue,
      command: `fixture fail ${phaseId}`,
      failureExitCode: 1,
      logPath: "",
      phaseSummaryPath: options.fixturePredevSummary,
    });
    printFirstFailure(failure);
    const tail = [`fixture failure at ${phaseId}`];
    if (delegated) {
      tail.push(`delegated predev first failure: ${delegated.name}`);
      tail.push(`delegated predev log: ${delegated.logFile}`);
    }
    phases.push(makePhase({
      id: phaseId,
      status: "FAIL",
      command: `fixture fail ${phaseId}`,
      exitCode: 1,
      logPath: writePhaseLog(phaseId, [`fixture failure at ${phaseId}`]),
      summaryPath: options.fixturePredevSummary,
      tail,
      context,
      stdoutTail: [],
      stderrTail,
      reproductionCommand: reproductionCommandValue,
    }));
    return;
  }
  if (phaseId === "cleanup") {
    cleanup = {
      status: "PASS",
      verificationSource: "fixture-filesystem-and-port-observation",
      serverStopped: true,
      portsClean: true,
      temporaryArtifactsRemoved: true,
      preservedArtifacts: [],
      checks: [
        { check: "fixture-server-not-started", status: "PASS", observed: true },
        { check: "fixture-temporary-paths-absent", status: "PASS", observed: true },
      ],
    };
    phases.push(passPhase(phaseId, "fixture cleanup observation", cleanup.checks.map(item => `${item.check}=${item.status}`)));
    return;
  }
  phases.push(makePhase({
    id: phaseId,
    status: "PASS",
    command: `fixture pass ${phaseId}`,
    exitCode: 0,
    logPath: writePhaseLog(phaseId, [`fixture pass ${phaseId}`]),
    summaryPath: "",
    tail: [`fixture pass ${phaseId}`],
  }));
}

function runDelegatedFixturePhase() {
  const command = `fixture delegated summary ${options.fixturePredevSummary}`;
  const logPath = writePhaseLog("soak-case-loop", [command]);
  projectDelegatedPhaseLedger(readPredevSummary(options.fixturePredevSummary), {
    command,
    logPath,
    summaryPath: options.fixturePredevSummary,
    stdoutTail: [],
    stderrTail: [],
  });
}

async function runRealPhase(phaseId) {
  if (phaseId === "preflight") {
    phases.push(passPhase(phaseId, "validate duration/output-dir/tools", [
      `durationMinutes=${options.durationMinutes}`,
      `outputDir=${outputDir}`,
    ]));
  } else if (phaseId === "build") {
    await runCommandPhase(phaseId, ["./server.sh", "build"]);
  } else if (phaseId === "seed") {
    const seedPath = path.join(outputDir, "seed.json");
    writeJson(seedPath, {
      schema: "media-server.v390-server-longrun-seed.v1",
      runId,
      throwaway: true,
    });
    phases.push(passPhase(phaseId, `write ${seedPath}`, [`seedPath=${seedPath}`]));
  } else if (phaseId === "start-server") {
    printProgress(phaseId, "delegated-pending");
  } else if (phaseId === "integrated-smoke") {
    printProgress(phaseId, "delegated-pending");
  } else if (phaseId === "soak-case-loop") {
    predevSummaryPath = path.join(outputDir, "predev-summary.json");
    await runCommandPhase(phaseId, [
      "./server.sh",
      "verify-predev",
      "--soak-minutes",
      String(options.durationMinutes),
      "--skip-build",
      "--fail-fast",
      "--summary-file",
      predevSummaryPath,
      "--report-file",
      path.join(outputDir, "predev-report.md"),
      "--report-html-file",
      path.join(outputDir, "predev-report.html"),
    ], predevSummaryPath);
    const delegatedCommandPhase = phases.pop();
    projectDelegatedPhaseLedger(readPredevSummary(predevSummaryPath), {
      command: delegatedCommandPhase?.command || "./server.sh verify-predev",
      logPath: delegatedCommandPhase?.logPath || "",
      summaryPath: predevSummaryPath,
      stdoutTail: delegatedCommandPhase?.stdoutTail || [],
      stderrTail: delegatedCommandPhase?.stderrTail || [],
    });
  } else if (phaseId === "runtime-idle") {
    printProgress(phaseId, "delegated-pending");
  } else if (phaseId === "cleanup") {
    cleanup = await measureAndApplyCleanup();
    if (cleanup.status === "PASS") {
      phases.push(passPhase(phaseId, "measured cleanup phase", cleanup.checks.map(item => `${item.check}=${item.status}`)));
    } else {
      if (!failedPhase) {
        failedPhase = phaseId;
        failedCase = "cleanup-observation";
        failure = makeFailure({
          phase: phaseId,
          caseName: failedCase,
          context: "measured cleanup check failed",
          stderrTail: cleanup.checks.filter(item => item.status === "FAIL").map(item => `${item.check}: ${item.path || item.port || ""}`),
          reproductionCommand: reproductionCommand(),
          command: "measured cleanup phase",
          failureExitCode: 1,
          logPath: "",
          phaseSummaryPath: predevSummaryPath,
        });
      }
      exitCode = exitCode || 1;
      phases.push(makePhase({
        id: phaseId,
        status: "FAIL",
        command: "measured cleanup phase",
        exitCode: 1,
        logPath: writePhaseLog(phaseId, cleanup.checks.map(item => `${item.check}=${item.status}`)),
        summaryPath: predevSummaryPath,
        tail: cleanup.checks.filter(item => item.status === "FAIL").map(item => `${item.check}=FAIL`),
      }));
    }
  } else if (phaseId === "report") {
    phases.push(passPhase(phaseId, "report phase", [`summaryPath=${summaryPath}`, `reportPath=${reportPath}`]));
  }
}

function projectDelegatedPhaseLedger(predevSummary, commandEvidence) {
  const validation = validateDelegatedPhaseLedger(predevSummary, options.durationMinutes);
  delegatedPhaseLedger = validation.evidence;
  const projections = [
    { id: "start-server", delegated: validation.phaseSteps.get("start-server") || [], required: "server-start-queue-256" },
    { id: "integrated-smoke", delegated: validation.phaseSteps.get("integrated-smoke") || [], required: "integrated-smoke" },
    { id: "soak-case-loop", delegated: validation.phaseSteps.get("soak-case-loop") || [], required: "soak-<iteration>-<case>" },
    { id: "runtime-idle", delegated: validation.phaseSteps.get("runtime-idle") || [], required: "main-runtime-idle" },
  ];
  let priorFailure = false;
  let projectedFailure = false;
  delegatedFailure = readDelegatedFailure(commandEvidence.summaryPath);

  for (const projection of projections) {
    let status = priorFailure ? "not-run" : delegatedProjectionStatus(projection.delegated);
    if (!priorFailure && projection.delegated.length === 0) status = "FAIL";
    const phaseLedger = delegatedPhaseLedger.phases.find(item => item.parentPhase === projection.id);
    if (!priorFailure && phaseLedger && !phaseLedger.valid) status = "FAIL";
    const delegatedNames = projection.delegated.map(step => String(step.name || "")).filter(Boolean);
    const failedStep = projection.delegated.find(step => step?.result === "fail");
    const tail = status === "not-run"
      ? [`delegated ${projection.id} not-run after first parent failure`]
      : [
          `required=${projection.required}`,
          `delegated=${delegatedNames.join(",") || "missing"}`,
          `results=${projection.delegated.map(step => `${step.name}:${step.result}`).join(",") || "missing"}`,
          ...((phaseLedger?.errors || []).map(error => `ledger-error=${error}`)),
        ];
    phases.push(makePhase({
      id: projection.id,
      status,
      command: status === "not-run" ? "" : commandEvidence.command,
      exitCode: status === "PASS" ? 0 : status === "FAIL" ? 1 : null,
      logPath: status === "not-run" ? "" : commandEvidence.logPath,
      summaryPath: commandEvidence.summaryPath,
      tail,
      context: `delegated projection parent=${projection.id}; status=${status}`,
      stdoutTail: commandEvidence.stdoutTail,
      stderrTail: commandEvidence.stderrTail,
      reproductionCommand: status === "not-run" ? "" : commandEvidence.command,
    }));
    if (status === "FAIL" && !projectedFailure) {
      projectedFailure = true;
      priorFailure = true;
      failedPhase = projection.id;
      failedCase = String(failedStep?.name || delegatedFailure?.name || phaseLedger?.failedCase || `missing-${projection.required}`);
      exitCode = exitCode || 1;
      const context = delegatedFailure?.context || `delegated parent projection ${projection.id} failed: ${failedCase}`;
      const stderrTail = delegatedFailure?.stderrTail?.length > 0
        ? delegatedFailure.stderrTail
        : commandEvidence.stderrTail;
      const reproductionCommand = delegatedFailure?.reproductionCommand || commandEvidence.command;
      failure = makeFailure({
        phase: projection.id,
        caseName: failedCase,
        context,
        stderrTail,
        reproductionCommand,
        command: commandEvidence.command,
        failureExitCode: exitCode,
        logPath: commandEvidence.logPath,
        phaseSummaryPath: commandEvidence.summaryPath,
      });
      printFirstFailure(failure);
    }
  }

  if (!projectedFailure && predevSummary?.status !== "pass") {
    const last = phases.find(phase => phase.id === "runtime-idle");
    if (last) {
      last.status = "FAIL";
      last.exitCode = 1;
      last.tail.push(`delegated-summary-status=${String(predevSummary?.status || "missing")}`);
    }
    failedPhase = "runtime-idle";
    failedCase = delegatedFailure?.name || "delegated-summary-status";
    exitCode = exitCode || 1;
    failure = makeFailure({
      phase: failedPhase,
      caseName: failedCase,
      context: delegatedFailure?.context || "delegated summary did not report pass",
      stderrTail: delegatedFailure?.stderrTail || commandEvidence.stderrTail,
      reproductionCommand: delegatedFailure?.reproductionCommand || commandEvidence.command,
      command: commandEvidence.command,
      failureExitCode: exitCode,
      logPath: commandEvidence.logPath,
      phaseSummaryPath: commandEvidence.summaryPath,
    });
    printFirstFailure(failure);
  }
}

function validateDelegatedPhaseLedger(predevSummary, durationMinutes) {
  const schema = "media-server.v390-delegated-phase-ledger.v1";
  const steps = Array.isArray(predevSummary?.steps) ? predevSummary.steps : [];
  const observedCaseIds = steps.map(step => String(step?.name || ""));
  const duplicateCaseIds = [...new Set(observedCaseIds.filter((id, index) => id && observedCaseIds.indexOf(id) !== index))];
  const errorsByPhase = new Map([
    ["start-server", []],
    ["integrated-smoke", []],
    ["soak-case-loop", []],
    ["runtime-idle", []],
  ]);
  const addError = (phase, message) => {
    const target = errorsByPhase.has(phase) ? phase : "start-server";
    errorsByPhase.get(target).push(message);
  };
  if (!predevSummary || predevSummary.kind !== "predev") addError("start-server", "delegated summary kind must be predev");
  if (!Array.isArray(predevSummary?.steps)) addError("start-server", "delegated summary steps must be an array");
  if (predevSummary?.soakMinutes !== durationMinutes) {
    addError("start-server", `delegated soakMinutes mismatch: expected ${durationMinutes}, observed ${String(predevSummary?.soakMinutes)}`);
  }
  if (observedCaseIds.some(id => !id)) addError("start-server", "delegated case ID must be non-empty");
  for (const id of duplicateCaseIds) addError(parentPhaseForDelegatedCase(id), `duplicate delegated case ID: ${id}`);
  for (const step of steps) {
    if (!['pass', 'fail', 'skip', 'not-run'].includes(String(step?.result || ''))) {
      addError(parentPhaseForDelegatedCase(String(step?.name || "")), `invalid delegated case result: ${String(step?.name || "")}=${String(step?.result)}`);
    }
  }

  const exact = name => steps.filter(step => String(step?.name || "") === name);
  const fixed = [
    ["build", "start-server"],
    ["server-start-queue-256", "start-server"],
    ["integrated-smoke", "integrated-smoke"],
    ["external-turn-hard-gate", "integrated-smoke"],
    ["main-runtime-idle", "runtime-idle"],
    ["server-start-queue-2", "runtime-idle"],
    ["event-post-queue", "runtime-idle"],
    ["queue-runtime-idle", "runtime-idle"],
    ["ports-clean", "runtime-idle"],
    ["summary-report", "runtime-idle"],
  ];
  for (const [id, phase] of fixed) {
    const count = exact(id).length;
    if (count !== 1) addError(phase, `delegated case count mismatch: ${id} expected 1 observed ${count}`);
  }

  const indexOf = id => observedCaseIds.indexOf(id);
  const externalIndex = indexOf("external-turn-hard-gate");
  const runtimeIndex = indexOf("main-runtime-idle");
  const soakRegion = externalIndex >= 0 && runtimeIndex > externalIndex
    ? steps.slice(externalIndex + 1, runtimeIndex)
    : [];
  const aggregateSoak = soakRegion.filter(step => String(step?.name || "") === "soak-case-loop");
  const numericSoak = soakRegion.filter(step => /^soak-[0-9]+-/.test(String(step?.name || "")));
  const soakFuture = soakRegion.filter(step => String(step?.name || "") === "soak-future-iterations");
  const soakSuffixes = ["va-events", "event-post-schema", "event-post-recovery", "redaction", "runtime-idle"];
  const expectedSoakIds = [];
  if (aggregateSoak.length > 0) {
    expectedSoakIds.push("soak-case-loop");
    if (aggregateSoak.length !== 1 || soakRegion.length !== 1) {
      addError("soak-case-loop", "aggregate soak-case-loop must be the only delegated soak entry");
    }
    if (aggregateSoak[0]?.result !== "not-run") {
      addError("soak-case-loop", "aggregate soak-case-loop must be not-run after an earlier failure");
    }
  } else {
    const iterations = numericSoak.map(step => Number(String(step.name).match(/^soak-([0-9]+)-/)?.[1] || 0));
    const maxIteration = iterations.length > 0 ? Math.max(...iterations) : 1;
    for (let iteration = 1; iteration <= maxIteration; iteration += 1) {
      for (const suffix of soakSuffixes) expectedSoakIds.push(`soak-${iteration}-${suffix}`);
    }
    const observedNumericIds = numericSoak.map(step => String(step.name));
    if (JSON.stringify(observedNumericIds) !== JSON.stringify(expectedSoakIds)) {
      addError("soak-case-loop", `delegated soak order/count mismatch: expected ${expectedSoakIds.join(",")} observed ${observedNumericIds.join(",") || "missing"}`);
    }
    const iterationSet = [...new Set(iterations)].sort((a, b) => a - b);
    if (iterationSet.some((value, index) => value !== index + 1)) {
      addError("soak-case-loop", `delegated soak iterations must be contiguous from 1: ${iterationSet.join(",")}`);
    }
    if (soakFuture.length > 1 || soakFuture.some(step => step.result !== "not-run")) {
      addError("soak-case-loop", "soak-future-iterations must occur at most once with not-run result");
    }
    const allowedSoakIds = new Set([...expectedSoakIds, "soak-future-iterations"]);
    for (const step of soakRegion) {
      if (!allowedSoakIds.has(String(step?.name || ""))) {
        addError("soak-case-loop", `unknown delegated soak case ID: ${String(step?.name || "")}`);
      }
    }
  }

  const expectedCaseIds = [
    "build",
    "server-start-queue-256",
    "integrated-smoke",
    "external-turn-hard-gate",
    ...expectedSoakIds,
    ...(soakFuture.length === 1 ? ["soak-future-iterations"] : []),
    "main-runtime-idle",
    "server-start-queue-2",
    "event-post-queue",
    "queue-runtime-idle",
    "ports-clean",
    "summary-report",
    ...(exact("summary-report-refresh").length === 1 ? ["summary-report-refresh"] : []),
  ];
  const allowedIds = new Set(expectedCaseIds);
  for (const id of observedCaseIds) {
    if (id && !allowedIds.has(id)) addError(parentPhaseForDelegatedCase(id), `unknown delegated case ID: ${id}`);
  }
  if (JSON.stringify(observedCaseIds) !== JSON.stringify(expectedCaseIds)) {
    let firstMismatch = observedCaseIds.findIndex((id, index) => id !== expectedCaseIds[index]);
    if (firstMismatch < 0) firstMismatch = Math.min(observedCaseIds.length, expectedCaseIds.length);
    const mismatchId = observedCaseIds[firstMismatch] || expectedCaseIds[firstMismatch] || "missing";
    addError(parentPhaseForDelegatedCase(mismatchId), `delegated global order/count mismatch at ${firstMismatch}: expected ${expectedCaseIds[firstMismatch] || "end"} observed ${observedCaseIds[firstMismatch] || "end"}`);
  }

  const resultCounts = {
    pass: steps.filter(step => step?.result === "pass").length,
    fail: steps.filter(step => step?.result === "fail").length,
    skip: steps.filter(step => step?.result === "skip").length,
    notRun: steps.filter(step => step?.result === "not-run").length,
  };
  for (const [field, observed] of Object.entries(resultCounts)) {
    if (predevSummary?.[field] !== observed) {
      addError("runtime-idle", `delegated summary ${field} count mismatch: expected ${observed} observed ${String(predevSummary?.[field])}`);
    }
  }
  const expectedStatus = resultCounts.fail > 0 ? "fail" : "pass";
  if (predevSummary?.status !== expectedStatus) {
    addError("runtime-idle", `delegated summary status mismatch: expected ${expectedStatus} observed ${String(predevSummary?.status)}`);
  }
  const mandatoryTailIds = new Set(["ports-clean", "summary-report", "summary-report-refresh"]);
  const executableSteps = steps.filter(step => !mandatoryTailIds.has(String(step?.name || "")));
  const firstExecutableFailure = executableSteps.findIndex(step => step?.result === "fail");
  for (let index = 0; index < executableSteps.length; index += 1) {
    const step = executableSteps[index];
    const id = String(step?.name || "");
    let expectedBeforeFailure = "pass";
    if (id === "build") expectedBeforeFailure = "skip";
    if (id === "external-turn-hard-gate") expectedBeforeFailure = predevSummary?.includeExternalTurn ? "pass" : "skip";
    if (/-redaction$/.test(id)) expectedBeforeFailure = predevSummary?.includeRedaction ? "pass" : "skip";
    if (firstExecutableFailure < 0) {
      if (step?.result !== expectedBeforeFailure) {
        addError(parentPhaseForDelegatedCase(id), `delegated successful case result mismatch: ${id} expected ${expectedBeforeFailure} observed ${String(step?.result)}`);
      }
    } else if (index < firstExecutableFailure && step?.result !== expectedBeforeFailure) {
      addError(parentPhaseForDelegatedCase(id), `delegated pre-failure case result mismatch: ${id} expected ${expectedBeforeFailure} observed ${String(step?.result)}`);
    } else if (index > firstExecutableFailure && step?.result !== "not-run") {
      addError(parentPhaseForDelegatedCase(id), `delegated post-failure case must be not-run: ${id} observed ${String(step?.result)}`);
    }
  }

  const phaseObservedIds = {
    "start-server": ["server-start-queue-256"].flatMap(id => exact(id)),
    "integrated-smoke": ["integrated-smoke"].flatMap(id => exact(id)),
    "soak-case-loop": aggregateSoak.length > 0 ? aggregateSoak : soakRegion,
    "runtime-idle": ["main-runtime-idle", "server-start-queue-2", "event-post-queue", "queue-runtime-idle"].flatMap(id => exact(id)),
  };
  const phaseExpectedIds = {
    "start-server": ["server-start-queue-256"],
    "integrated-smoke": ["integrated-smoke"],
    "soak-case-loop": [...expectedSoakIds, ...(soakFuture.length === 1 ? ["soak-future-iterations"] : [])],
    "runtime-idle": ["main-runtime-idle", "server-start-queue-2", "event-post-queue", "queue-runtime-idle"],
  };
  const phasesEvidence = [...errorsByPhase].map(([parentPhase, errors]) => ({
    parentPhase,
    expectedCaseIds: phaseExpectedIds[parentPhase],
    observedCaseIds: (phaseObservedIds[parentPhase] || []).map(step => String(step?.name || "")),
    expectedCount: phaseExpectedIds[parentPhase].length,
    observedCount: (phaseObservedIds[parentPhase] || []).length,
    valid: errors.length === 0,
    failedCase: errors.length > 0 ? (phaseObservedIds[parentPhase]?.[0]?.name || `delegated-ledger-${parentPhase}`) : "",
    errors,
  }));
  const allErrors = phasesEvidence.flatMap(phase => phase.errors.map(error => `${phase.parentPhase}: ${error}`));
  return {
    evidence: {
      schema,
      valid: allErrors.length === 0,
      expectedCaseIds,
      observedCaseIds,
      expectedCount: expectedCaseIds.length,
      observedCount: observedCaseIds.length,
      duplicateCaseIds,
      counts: { expected: resultCounts, observed: {
        pass: predevSummary?.pass,
        fail: predevSummary?.fail,
        skip: predevSummary?.skip,
        notRun: predevSummary?.notRun,
      } },
      phases: phasesEvidence,
      errors: allErrors,
    },
    phaseSteps: new Map(Object.entries(phaseObservedIds)),
  };
}

function parentPhaseForDelegatedCase(id) {
  if (id === "server-start-queue-256" || id === "build") return "start-server";
  if (id === "integrated-smoke" || id === "external-turn-hard-gate") return "integrated-smoke";
  if (id === "soak-case-loop" || id === "soak-future-iterations" || /^soak-/.test(id)) return "soak-case-loop";
  return "runtime-idle";
}

function delegatedProjectionStatus(steps) {
  if (steps.some(step => step?.result === "fail")) return "FAIL";
  if (steps.some(step => step?.result === "not-run")) return "not-run";
  return steps.length > 0 && steps.every(step => ["pass", "skip"].includes(String(step?.result || "")))
    ? "PASS"
    : "FAIL";
}

function readPredevSummary(summaryFilePath) {
  if (!summaryFilePath || !fs.existsSync(summaryFilePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(summaryFilePath, "utf8"));
  } catch {
    return null;
  }
}

async function measureAndApplyCleanup() {
  const httpPort = Number(process.env.MEDIA_SERVER_VERIFY_PREDEV_HTTP_PORT || 8081);
  const rtspPort = Number(process.env.MEDIA_SERVER_VERIFY_PREDEV_RTSP_PORT || 8555);
  let predevSummary = null;
  if (predevSummaryPath && fs.existsSync(predevSummaryPath)) {
    predevSummary = JSON.parse(fs.readFileSync(predevSummaryPath, "utf8"));
  }
  const portsStep = predevSummary?.steps?.find(step => step?.name === "ports-clean");
  const workDir = String(predevSummary?.workDir || "");
  const workDirContained = isAllowedPredevWorkDir(workDir);
  const existedBefore = workDirContained && fs.existsSync(workDir);
  const before = existedBefore ? scanArtifactTree(workDir) : null;
  if (predevSummary && workDirContained) preserveFailureAndSanitizeTemporaryPaths(predevSummary, workDir);
  if (workDirContained && workDir) fs.rmSync(workDir, { recursive: true, force: true });
  const workDirRemoved = !workDir || !fs.existsSync(workDir);
  const after = workDir && fs.existsSync(workDir) ? scanArtifactTree(workDir) : { totalBytes: 0, fileCount: 0 };
  const processes = Array.isArray(predevSummary?.serverProcessLedger?.processes)
    ? predevSummary.serverProcessLedger.processes.map(item => structuredClone(item))
    : [];
  const ports = [];
  for (const port of [httpPort, rtspPort]) {
    const listenerPidsBefore = [...new Set(processes.filter(item => (item.ownedPorts || []).map(Number).includes(port)).map(item => Number(item.pid)))];
    const listenerPidsAfter = listListenerPids(port);
    ports.push({
      port,
      listenerPidsBefore,
      listenerPidsAfter,
      bindableAfter: await canListen(port),
    });
  }
  const measurement = {
    schema: "media-server.v390-cleanup-measurement.v1",
    processes,
    ports,
    artifacts: [{
      path: workDir,
      contained: workDirContained,
      existedBefore,
      bytesBefore: Number(before?.totalBytes || 0),
      existsAfter: workDir ? fs.existsSync(workDir) : false,
      bytesAfter: Number(after?.totalBytes || 0),
      removedBytes: Number(before?.totalBytes || 0) - Number(after?.totalBytes || 0),
    }],
  };
  const measurementErrors = validateCleanupMeasurement(measurement);
  const checks = [
    ...processes.map(item => ({
      check: `server-pid-${item.pid}-stopped`,
      status: item.aliveBefore === true && item.aliveAfter === false ? "PASS" : "FAIL",
      pid: item.pid,
      commandIdentity: item.commandIdentity,
      ownedPorts: item.ownedPorts,
      aliveBefore: item.aliveBefore,
      aliveAfter: item.aliveAfter,
    })),
    ...ports.map(item => ({
      check: `port-${item.port}-clean`,
      status: item.listenerPidsBefore.length > 0 && item.listenerPidsAfter.length === 0 && item.bindableAfter ? "PASS" : "FAIL",
      ...item,
    })),
    {
      check: "delegated-ports-clean-step",
      status: !predevSummary || portsStep?.result === "pass" ? "PASS" : "FAIL",
      observed: portsStep?.result || "not-run-no-predev",
    },
    {
      check: "predev-temporary-workdir-removed",
      status: workDirContained && existedBefore && workDirRemoved && Number(after.totalBytes || 0) === 0 ? "PASS" : "FAIL",
      path: workDir,
      contained: workDirContained,
      existedBefore,
      bytesBefore: Number(before?.totalBytes || 0),
      existsAfter: workDir ? fs.existsSync(workDir) : false,
      bytesAfter: Number(after.totalBytes || 0),
      removedBytes: Number(before?.totalBytes || 0) - Number(after.totalBytes || 0),
    },
    ...measurementErrors.map(error => ({ check: `measurement-${error}`, status: "FAIL", observed: error })),
  ];
  const passed = checks.every(item => item.status === "PASS");
  return {
    status: passed ? "PASS" : "FAIL",
    verificationSource: "pid-port-artifact-before-after-observation",
    serverStopped: processes.length > 0 && processes.every(item => item.aliveBefore === true && item.aliveAfter === false),
    portsClean: ports.every(item => item.listenerPidsAfter.length === 0 && item.bindableAfter) && portsStep?.result === "pass",
    temporaryArtifactsRemoved: workDirRemoved,
    removedTemporaryArtifacts: workDir ? [workDir] : [],
    preservedArtifacts: delegatedFailure ? [delegatedFailure.logFile, delegatedFailure.stdoutFile, delegatedFailure.stderrFile].filter(Boolean) : [],
    measurement,
    measurementErrors,
    checks,
  };
}

function preserveFailureAndSanitizeTemporaryPaths(predevSummary, workDir) {
  const failureDir = path.join(outputDir, "failure-artifacts");
  for (const step of predevSummary.steps || []) {
    for (const field of ["logFile", "stdoutFile", "stderrFile"]) {
      const sourcePath = String(step[field] || "");
      if (!sourcePath) continue;
      if (step.result === "fail" && fs.existsSync(sourcePath)) {
        fs.mkdirSync(failureDir, { recursive: true });
        const targetPath = path.join(failureDir, `${String(step.name || "failure").replace(/[^a-zA-Z0-9_-]/g, "-")}-${field}-${path.basename(sourcePath)}`);
        fs.copyFileSync(sourcePath, targetPath);
        step[field] = targetPath;
        if (delegatedFailure) delegatedFailure[field] = targetPath;
      } else if (workDir && path.resolve(sourcePath).startsWith(`${path.resolve(workDir)}${path.sep}`)) {
        step[field] = "";
        step.temporaryArtifactCleanup = "removed-after-summary-capture";
      }
    }
  }
  predevSummary.temporaryWorkDirCleanup = {
    path: workDir,
    action: "remove-after-preserving-first-failure",
  };
  predevSummary.workDir = "";
  fs.writeFileSync(predevSummaryPath, `${JSON.stringify(predevSummary, null, 2)}\n`, "utf8");
}

function canListen(port) {
  return new Promise(resolve => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => server.close(() => resolve(true)));
    server.listen(port, "127.0.0.1");
  });
}

function listListenerPids(port) {
  try {
    return execFileSync("lsof", ["-nP", `-tiTCP:${port}`, "-sTCP:LISTEN"], { encoding: "utf8" })
      .split(/\r?\n/)
      .filter(value => /^[0-9]+$/.test(value))
      .map(Number)
      .sort((a, b) => a - b);
  } catch {
    return [];
  }
}

function isAllowedPredevWorkDir(value) {
  if (!value) return false;
  const resolved = path.resolve(value);
  const allowedRoots = [path.resolve("/tmp"), path.resolve("/private/tmp")];
  const inside = allowedRoots.some(root => resolved.startsWith(`${root}${path.sep}`));
  return inside && path.basename(resolved).startsWith("media_server_predev-");
}

function runCommandPhase(phaseId, commandParts, phaseSummaryPath = "") {
  const logPath = path.join(outputDir, `${phaseId}.log`);
  return new Promise((resolve) => {
    const stdoutChunks = [];
    const stderrChunks = [];
    const logStream = fs.createWriteStream(logPath, { flags: "w" });
    let settled = false;

    const child = spawn(commandParts[0], commandParts.slice(1), {
      cwd: rootDir,
      env: longrunChildEnv(),
      stdio: ["ignore", "pipe", "pipe"],
    });

    const collect = (chunk, stream, chunks) => {
      const text = String(chunk);
      chunks.push(text);
      logStream.write(text);
      stream.write(text);
    };

    child.stdout.on("data", chunk => collect(chunk, process.stdout, stdoutChunks));
    child.stderr.on("data", chunk => collect(chunk, process.stderr, stderrChunks));
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      const message = `${error instanceof Error ? error.message : String(error)}\n`;
      stderrChunks.push(message);
      logStream.write(message);
      finishCommandPhase(phaseId, commandParts, logPath, stdoutChunks.join(""), stderrChunks.join(""), 1, phaseSummaryPath);
      logStream.end(resolve);
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      const phaseExitCode = Number.isInteger(code) ? code : 1;
      finishCommandPhase(phaseId, commandParts, logPath, stdoutChunks.join(""), stderrChunks.join(""), phaseExitCode, phaseSummaryPath);
      logStream.end(resolve);
    });
  });
}

function finishCommandPhase(phaseId, commandParts, logPath, stdout, stderr, phaseExitCode, phaseSummaryPath = "") {
  const delegated = readDelegatedFailure(phaseSummaryPath);
  const command = commandParts.join(" ");
  if (phaseExitCode === 0) {
    phases.push(makePhase({
      id: phaseId,
      status: "PASS",
      command,
      exitCode: 0,
      logPath,
      summaryPath: phaseSummaryPath,
      tail: tailLines(`${stdout}\n${stderr}`),
      context: `phase=${phaseId}; result=PASS`,
      stdoutTail: tailLines(stdout),
      stderrTail: tailLines(stderr),
      reproductionCommand: command,
    }));
    return;
  }
  if (delegated) delegatedFailure = delegated;
  failedPhase = phaseId;
  failedCase = delegated?.name || phaseId;
  exitCode = phaseExitCode;
  const tail = tailLines(`${stdout}\n${stderr}`);
  if (delegated) {
    tail.push(`delegated predev first failure: ${delegated.name}`);
    tail.push(`delegated predev log: ${delegated.logFile}`);
  }
  const context = delegated?.context || [
    `phase=${phaseId}`,
    `case=${failedCase}`,
    `httpPort=${Number(process.env.MEDIA_SERVER_VERIFY_PREDEV_HTTP_PORT || 8081)}`,
    `rtspPort=${Number(process.env.MEDIA_SERVER_VERIFY_PREDEV_RTSP_PORT || 8555)}`,
    `outputDir=${outputDir}`,
  ].join("; ");
  const stderrTail = delegated?.stderrTail?.length > 0 ? delegated.stderrTail : tailLines(stderr);
  const reproductionCommandValue = options.userLauncher
    ? reproductionCommand()
    : (delegated?.reproductionCommand || command);
  failure = makeFailure({
    phase: phaseId,
    caseName: failedCase,
    context,
    stderrTail,
    reproductionCommand: reproductionCommandValue,
    command,
    failureExitCode: exitCode,
    logPath,
    phaseSummaryPath,
  });
  printFirstFailure(failure);
  phases.push(makePhase({
    id: phaseId,
    status: "FAIL",
    command,
    exitCode,
    logPath,
    summaryPath: phaseSummaryPath,
    tail,
    context,
    stdoutTail: tailLines(stdout),
    stderrTail,
    reproductionCommand: reproductionCommandValue,
  }));
}

function passPhase(id, command, lines) {
  return makePhase({
    id,
    status: "PASS",
    command,
    exitCode: 0,
    logPath: writePhaseLog(id, lines),
    summaryPath: "",
    tail: lines.slice(-5),
    context: `phase=${id}; result=PASS`,
    stdoutTail: lines.slice(-5),
    stderrTail: [],
    reproductionCommand: command,
  });
}

function makePhase({
  id,
  status,
  command,
  exitCode: phaseExitCode,
  logPath,
  summaryPath: phaseSummaryPath,
  tail,
  context = "",
  stdoutTail = [],
  stderrTail = [],
  reproductionCommand = "",
}) {
  return {
    id,
    status,
    command,
    exitCode: phaseExitCode,
    logPath,
    summaryPath: phaseSummaryPath,
    tail,
    context,
    stdoutTail,
    stderrTail,
    reproductionCommand,
  };
}

function writePhaseLog(phaseId, lines) {
  const logPath = path.join(outputDir, `${phaseId}.log`);
  fs.writeFileSync(logPath, `${lines.join("\n")}\n`, "utf8");
  return logPath;
}

function writeReport(filePath, payload) {
  const lines = [
    "# v3.9.0 Server Longrun Runner Report",
    "",
    `schema: ${payload.schema}`,
    `result: ${payload.result}`,
    `durationMinutes: ${payload.durationMinutes}`,
    `durationClockSource: ${payload.durationEvidence?.clockSource || ""}`,
    `durationStartedMonotonicNs: ${payload.durationEvidence?.runnerStartedMonotonicNs || ""}`,
    `durationEndedMonotonicNs: ${payload.durationEvidence?.runnerEndedMonotonicNs || ""}`,
    `durationElapsedSeconds: ${payload.durationEvidence?.runnerElapsedSeconds ?? ""}`,
    `durationEligible: ${payload.durationEvidence?.eligibleRealDuration === true}`,
    `iterationLedgerValid: ${payload.iterationEvidence?.valid === true}`,
    `iterationCount: ${payload.iterationEvidence?.ledger?.observedIterations ?? 0}`,
    `stopOnFirstFail: ${payload.stopOnFirstFail}`,
    `failedPhase: ${payload.failedPhase || "(none)"}`,
    `failedCase: ${payload.failedCase || "(none)"}`,
    `delegatedFailure: ${payload.delegatedFailure?.name || "(none)"}`,
    `delegatedFirstFailContractSatisfied: ${payload.delegatedFirstFailContractSatisfied}`,
    `delegatedPhaseLedgerSchema: ${payload.delegatedPhaseLedger?.schema || "(not-applicable)"}`,
    `delegatedPhaseLedgerValid: ${payload.delegatedPhaseLedger?.valid ?? "(not-applicable)"}`,
    `delegatedPhaseLedgerCount: ${payload.delegatedPhaseLedger ? `${payload.delegatedPhaseLedger.observedCount}/${payload.delegatedPhaseLedger.expectedCount}` : "(not-applicable)"}`,
    `delegatedPhaseLedgerDuplicates: ${reportValue(payload.delegatedPhaseLedger?.duplicateCaseIds?.join(","))}`,
    `delegatedPhaseLedgerErrors: ${reportValue(payload.delegatedPhaseLedger?.errors?.join(" | "))}`,
    `failureContext: ${reportValue(payload.failure?.context)}`,
    `stderrTail: ${reportValue(payload.failure?.stderrTail?.join(" | "))}`,
    `reproductionCommand: ${reportValue(payload.failure?.reproductionCommand)}`,
    `realDurationEvidence: ${payload.realDurationEvidence}`,
    `longrunEvidenceStatus: ${payload.longrunEvidenceStatus}`,
    `cleanupVerificationSource: ${payload.cleanup?.verificationSource || ""}`,
    `cleanupArtifactBytes: ${payload.cleanup?.measurement?.artifacts?.map(item => `${item.path}:${item.bytesBefore}->${item.bytesAfter}`).join(" | ") || ""}`,
    "",
    "| phase | status | command | log |",
    "| --- | --- | --- | --- |",
    ...payload.phases.map(phase => `| ${phase.id} | ${phase.status} | ${escapeCell(phase.command)} | ${escapeCell(phase.logPath)} |`),
    "",
    "| delegated parent phase | valid | observed/expected | observed case IDs | errors |",
    "| --- | --- | ---: | --- | --- |",
    ...((payload.delegatedPhaseLedger?.phases || []).map(phase =>
      `| ${phase.parentPhase} | ${phase.valid} | ${phase.observedCount}/${phase.expectedCount} | ${escapeCell(phase.observedCaseIds.join(","))} | ${escapeCell(phase.errors.join(" | "))} |`)),
  ];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function parsePositiveInt(value, label) {
  assert(value !== undefined && /^[0-9]+$/.test(value), `${label} must be a positive integer`);
  const parsed = Number(value);
  assert(parsed > 0, `${label} must be greater than zero`);
  if (label === "--duration-minutes") {
    assert([30, 120].includes(parsed), `${label} must be 30 or 120`);
  }
  return parsed;
}

function tailLines(text) {
  return text.split(/\r?\n/).filter(Boolean).slice(-8);
}

function escapeCell(value) {
  return String(value).replace(/\|/g, "\\|");
}

function longrunEvidenceStatus(isFixture, runResult) {
  if (isFixture) return "fixture-only-not-real-duration";
  if (runResult === "PASS") return "real-duration-evidence";
  return "real-duration-failed-no-pass-evidence";
}

function readDelegatedFailure(summaryFilePath) {
  if (!summaryFilePath || !fs.existsSync(summaryFilePath)) return null;
  try {
    const summary = JSON.parse(fs.readFileSync(summaryFilePath, "utf8"));
    const steps = Array.isArray(summary.steps) ? summary.steps : [];
    const failedIndex = steps.findIndex(step => step?.result === "fail");
    const failedStep = failedIndex >= 0 ? steps[failedIndex] : null;
    if (!failedStep?.name) return null;
    const mandatoryAfterFailure = new Set(["ports-clean", "summary-report", "summary-report-refresh"]);
    const laterSteps = steps.slice(failedIndex + 1);
    const laterNotRunCases = laterSteps
      .filter(step => step?.result === "not-run")
      .map(step => String(step.name || ""))
      .filter(Boolean);
    const executedAfterFailure = laterSteps
      .filter(step => !["not-run"].includes(String(step?.result || "")) && !mandatoryAfterFailure.has(String(step?.name || "")))
      .map(step => String(step.name || ""))
      .filter(Boolean);
    const hasSeparatedStderrField = Object.prototype.hasOwnProperty.call(failedStep, "stderrFile");
    const stderrTail = Array.isArray(failedStep.stderrTail) && failedStep.stderrTail.length > 0
      ? failedStep.stderrTail.map(line => String(line))
      : readTailFromFile(hasSeparatedStderrField ? failedStep.stderrFile : failedStep.logFile);
    return {
      name: String(failedStep.name),
      command: String(failedStep.command || ""),
      logFile: String(failedStep.logFile || ""),
      stdoutFile: String(failedStep.stdoutFile || ""),
      stderrFile: String(failedStep.stderrFile || ""),
      stderrTail,
      context: String(failedStep.context || `predev case ${failedStep.name} failed`),
      reproductionCommand: String(failedStep.reproductionCommand || failedStep.command || ""),
      durationSec: Number(failedStep.durationSec || 0),
      summaryPath: path.resolve(rootDir, summaryFilePath),
      laterNotRunCases,
      executedAfterFailure,
      firstFailContractSatisfied: executedAfterFailure.length === 0,
    };
  } catch {
    return null;
  }
}

function makeFailure({ phase, caseName, context, stderrTail, reproductionCommand, command, failureExitCode, logPath, phaseSummaryPath }) {
  return {
    phase,
    case: caseName,
    context,
    stderrTail,
    reproductionCommand,
    command,
    exitCode: failureExitCode,
    logPath,
    summaryPath: phaseSummaryPath,
  };
}

function printFirstFailure(details) {
  console.log(`[first-fail] phase: ${details.phase}`);
  console.log(`[first-fail] case: ${details.case}`);
  console.log(`[first-fail] context: ${details.context}`);
  if (details.stderrTail.length === 0) {
    console.log("[first-fail] stderr: (empty)");
  } else {
    for (const line of details.stderrTail) console.log(`[first-fail] stderr: ${line}`);
  }
  console.log(`[first-fail] reproduce: ${details.reproductionCommand}`);
}

function readTailFromFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return [];
  try {
    return tailLines(fs.readFileSync(filePath, "utf8"));
  } catch {
    return [];
  }
}

function reportValue(value) {
  return value ? String(value).replace(/\r?\n/g, " | ") : "(none)";
}

function reproductionCommand() {
  if (options.userLauncher === "test_server_30min") return "./test_server_30min.sh";
  if (options.userLauncher === "test_server_120min") return "./test_server_120min.sh";
  return `./server.sh verify-v390-server-longrun --duration-minutes ${options.durationMinutes} --output-dir ${outputDir}`;
}

function buildAuthorizationEvidence() {
  if (options.durationMinutes !== 120) {
    return {
      status: "not-required",
      source: options.userLauncher ? "direct-user-entrypoint-30" : "canonical-parent-runner",
      userLauncher: options.userLauncher ? reproductionCommand() : "",
    };
  }
  const direct = options.userLauncher === "test_server_120min";
  return {
    status: direct ? "approved" : "delegated-internal",
    source: direct ? "direct-user-entrypoint-120" : "canonical-parent-runner",
    userLauncher: direct ? reproductionCommand() : "",
    approvalBoundary: direct
      ? "invoking-test-server-120min-is-explicit-120-minute-authorization"
      : "parent-runner-must-own-AGENTS-7.6.2-authorization",
  };
}

function longrunChildEnv() {
  const env = { ...process.env };
  delete env.MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD;
  delete env.MEDIA_SERVER_V390_UI_ROLE_SECRETS;
  return {
    ...env,
    MEDIA_SERVER_SKIP_LOCAL_ENV: "1",
    MEDIA_SERVER_VERIFY_PREDEV_HTTP_PORT: String(allocatedPorts.http),
    MEDIA_SERVER_VERIFY_PREDEV_RTSP_PORT: String(allocatedPorts.rtsp),
  };
}

async function allocatePortPair() {
  const http = await allocateEphemeralPort(new Set());
  const rtsp = await allocateEphemeralPort(new Set([http]));
  return { http, rtsp };
}

function allocateEphemeralPort(excluded) {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const port = typeof address === "object" && address ? Number(address.port) : 0;
      probe.close(error => {
        if (error) reject(error);
        else if (!Number.isInteger(port) || port <= 0 || excluded.has(port)) reject(new Error("failed to allocate distinct loopback port"));
        else resolve(port);
      });
    });
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

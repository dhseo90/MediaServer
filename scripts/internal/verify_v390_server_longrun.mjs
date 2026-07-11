#!/usr/bin/env node
// 파일 용도: v3.9.0 server longrun을 하나의 stop-on-first-fail runner와 summary/report evidence로 실행한다.

import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import { collectSourceProvenance, scanArtifactTree } from "./evidence_integrity_lib.mjs";

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
const phases = [];
let failedPhase = "";
let failedCase = "";
let exitCode = 0;
let delegatedFailure = null;
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

const result = exitCode === 0 ? "PASS" : "FAIL";
const summary = {
  schema: "media-server.v390-server-longrun.v1",
  runId,
  command: `./server.sh verify-v390-server-longrun ${rawArgs.join(" ")}`,
  sourceProvenance: collectSourceProvenance(rootDir),
  durationMinutes: options.durationMinutes,
  result,
  stopOnFirstFail: true,
  failedPhase,
  failedCase,
  exitCode,
  ports: {
    http: Number(process.env.MEDIA_SERVER_VERIFY_PREDEV_HTTP_PORT || 8081),
    rtsp: Number(process.env.MEDIA_SERVER_VERIFY_PREDEV_RTSP_PORT || 8555),
  },
  outputDir,
  summaryPath,
  reportPath,
  cleanup,
  delegatedFailure,
  delegatedFirstFailContractSatisfied: delegatedFailure?.firstFailContractSatisfied ?? true,
  failure,
  realDurationEvidence: !fixtureMode && result === "PASS",
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
    const reproductionCommand = delegated?.reproductionCommand || `fixture fail ${phaseId}`;
    failure = makeFailure({
      phase: phaseId,
      caseName: failedCase,
      context,
      stderrTail,
      reproductionCommand,
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
      reproductionCommand,
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
          reproductionCommand: `./server.sh verify-v390-server-longrun --duration-minutes ${options.durationMinutes} --output-dir ${outputDir}`,
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
  const steps = Array.isArray(predevSummary?.steps) ? predevSummary.steps : [];
  const exact = name => steps.filter(step => String(step?.name || "") === name);
  const startSteps = exact("server-start-queue-256");
  const integratedSteps = exact("integrated-smoke");
  const soakSteps = steps.filter(step => /^soak-[0-9]+-/.test(String(step?.name || "")));
  const runtimeStart = steps.findIndex(step => String(step?.name || "") === "main-runtime-idle");
  const runtimeSteps = runtimeStart < 0
    ? []
    : steps.slice(runtimeStart).filter(step => !["ports-clean", "summary-report", "summary-report-refresh"].includes(String(step?.name || "")));
  const projections = [
    { id: "start-server", delegated: startSteps, required: "server-start-queue-256" },
    { id: "integrated-smoke", delegated: integratedSteps, required: "integrated-smoke" },
    { id: "soak-case-loop", delegated: soakSteps, required: "soak-<iteration>-<case>" },
    { id: "runtime-idle", delegated: runtimeSteps, required: "main-runtime-idle" },
  ];
  let priorFailure = false;
  let projectedFailure = false;
  delegatedFailure = readDelegatedFailure(commandEvidence.summaryPath);

  for (const projection of projections) {
    let status = priorFailure ? "not-run" : delegatedProjectionStatus(projection.delegated);
    if (!priorFailure && projection.delegated.length === 0) status = "FAIL";
    const delegatedNames = projection.delegated.map(step => String(step.name || "")).filter(Boolean);
    const failedStep = projection.delegated.find(step => step?.result === "fail");
    const tail = status === "not-run"
      ? [`delegated ${projection.id} not-run after first parent failure`]
      : [
          `required=${projection.required}`,
          `delegated=${delegatedNames.join(",") || "missing"}`,
          `results=${projection.delegated.map(step => `${step.name}:${step.result}`).join(",") || "missing"}`,
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
      failedCase = String(failedStep?.name || delegatedFailure?.name || `missing-${projection.required}`);
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
  const httpPortClean = await canListen(httpPort);
  const rtspPortClean = await canListen(rtspPort);
  let predevSummary = null;
  if (predevSummaryPath && fs.existsSync(predevSummaryPath)) {
    predevSummary = JSON.parse(fs.readFileSync(predevSummaryPath, "utf8"));
  }
  const portsStep = predevSummary?.steps?.find(step => step?.name === "ports-clean");
  const workDir = String(predevSummary?.workDir || "");
  const before = workDir && fs.existsSync(workDir) ? scanArtifactTree(workDir) : null;
  if (predevSummary) preserveFailureAndSanitizeTemporaryPaths(predevSummary, workDir);
  if (workDir) fs.rmSync(workDir, { recursive: true, force: true });
  const workDirRemoved = !workDir || !fs.existsSync(workDir);
  const checks = [
    { check: "http-port-clean", status: httpPortClean ? "PASS" : "FAIL", port: httpPort, observed: httpPortClean },
    { check: "rtsp-port-clean", status: rtspPortClean ? "PASS" : "FAIL", port: rtspPort, observed: rtspPortClean },
    {
      check: "delegated-ports-clean-step",
      status: !predevSummary || portsStep?.result === "pass" ? "PASS" : "FAIL",
      observed: portsStep?.result || "not-run-no-predev",
    },
    {
      check: "predev-temporary-workdir-removed",
      status: workDirRemoved ? "PASS" : "FAIL",
      path: workDir,
      existedBefore: Boolean(before),
      bytesBefore: Number(before?.totalBytes || 0),
      existsAfter: workDir ? fs.existsSync(workDir) : false,
    },
  ];
  const passed = checks.every(item => item.status === "PASS");
  return {
    status: passed ? "PASS" : "FAIL",
    verificationSource: "predev-summary-filesystem-and-port-observation",
    serverStopped: httpPortClean && rtspPortClean,
    portsClean: httpPortClean && rtspPortClean && (!predevSummary || portsStep?.result === "pass"),
    temporaryArtifactsRemoved: workDirRemoved,
    removedTemporaryArtifacts: workDir ? [workDir] : [],
    preservedArtifacts: delegatedFailure ? [delegatedFailure.logFile, delegatedFailure.stdoutFile, delegatedFailure.stderrFile].filter(Boolean) : [],
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

function runCommandPhase(phaseId, commandParts, phaseSummaryPath = "") {
  const logPath = path.join(outputDir, `${phaseId}.log`);
  return new Promise((resolve) => {
    const stdoutChunks = [];
    const stderrChunks = [];
    const logStream = fs.createWriteStream(logPath, { flags: "w" });
    let settled = false;

    const child = spawn(commandParts[0], commandParts.slice(1), {
      cwd: rootDir,
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
  const reproductionCommand = delegated?.reproductionCommand || command;
  failure = makeFailure({
    phase: phaseId,
    caseName: failedCase,
    context,
    stderrTail,
    reproductionCommand,
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
    reproductionCommand,
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
    `stopOnFirstFail: ${payload.stopOnFirstFail}`,
    `failedPhase: ${payload.failedPhase || "(none)"}`,
    `failedCase: ${payload.failedCase || "(none)"}`,
    `delegatedFailure: ${payload.delegatedFailure?.name || "(none)"}`,
    `delegatedFirstFailContractSatisfied: ${payload.delegatedFirstFailContractSatisfied}`,
    `failureContext: ${reportValue(payload.failure?.context)}`,
    `stderrTail: ${reportValue(payload.failure?.stderrTail?.join(" | "))}`,
    `reproductionCommand: ${reportValue(payload.failure?.reproductionCommand)}`,
    `realDurationEvidence: ${payload.realDurationEvidence}`,
    `longrunEvidenceStatus: ${payload.longrunEvidenceStatus}`,
    "",
    "| phase | status | command | log |",
    "| --- | --- | --- | --- |",
    ...payload.phases.map(phase => `| ${phase.id} | ${phase.status} | ${escapeCell(phase.command)} | ${escapeCell(phase.logPath)} |`),
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

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

#!/usr/bin/env node
// 파일 용도: v3.9.0 test acceptance를 dry-run 또는 실제 stop-on-first-fail bundle로 실행한다.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFileSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import {
  collectSourceProvenance,
  collectSourceProvenanceWithAllowedArtifacts,
  isInside,
  listFiles,
  scanArtifactTree,
  sha256File,
  sha256Text,
} from "./evidence_integrity_lib.mjs";
import { evaluateV390FullSuiteEligibility } from "./v390_full_suite_eligibility_lib.mjs";
import {
  evaluateLongrun120Decision,
  validateCleanupMeasurement,
  validateIterationLedger,
  validateMonotonicDurationEvidence,
} from "./v390_longrun_evidence_measurement_lib.mjs";
import {
  consumeAcceptanceAdminPassword,
  listListenerPids,
  startSelfContainedUiEnvironment,
  stopSelfContainedUiEnvironment,
} from "./v390_acceptance_ui_environment.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);
const stageIds = [
  "preflight",
  "build",
  "feature-gates",
  "server-longrun-30",
  "ui-environment-bootstrap",
  "ui-exact-424",
  "ui-server-cleanup",
  "ui-fulltest-qualification",
  "longrun-120-decision",
  "server-longrun-120",
  "cleanup",
  "final-integrity",
  "report",
];
const canonicalUiCaseIds = readJson(path.join(rootDir, "test/fixtures/ui_fulltest_case_manifest_policy_v4.json"))
  .cases.map(item => item.testId);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 test acceptance bundle

Usage:
  ./server.sh verify-v390-test-acceptance-bundle --dry-run [--output-dir <path>]
  ./server.sh verify-v390-test-acceptance-bundle --output-dir <path> [options]

Options:
  --dry-run                    Validate command set and evidence boundaries without running child suites.
  --output-dir <path>          Summary/report and run artifact root. Required for actual mode; /tmp default for dry-run.
  --ui-playwright-module-path <path>  Optional native Playwright package directory.
  --ui-chrome-path <path>      Optional native Chrome/Chromium executable.
  --ui-build-path <path>       Built media_server fingerprint/server binary. Default build-gst-onnx/media_server.
  --run-120                    Execute the conditional 120-minute phase after 30-minute and UI success.
  --user-directed-120          Record an explicit AGENTS 7.6.2 user-directive trigger; combine with --run-120 to execute.
  --fixture-pass               Fast actual-mode orchestration fixture; not duration/UI evidence.
  --fixture-fail-stage <id>    Fail one stage and record later ordinary stages as not-run.
  --fixture-cleanup-fail       Make cleanup fail in fixture mode.
  --fixture-120-trigger        Contract-only cleanup/port change-scope trigger; not execution evidence.
  -h, --help                   Show help.

Actual order:
  preflight -> build -> feature gates -> real 30-minute -> self-contained UI environment
  -> exact 424 Policy v4 producer
  -> throwaway UI server cleanup -> Policy v4 qualification -> conditional 120-minute decision/run
  -> cleanup -> final integrity -> report.

Boundaries:
  - First ordinary stage failure makes later ordinary stages not-run; cleanup/report always run.
  - UI automation is not Codex in-app manual UI fulltest evidence.
  - Current final actual mode requires a clean worktree; AGENTS 7.6.2 scope decides whether 120 minutes is required.
  - --run-120 authorizes execution only after a 7.6.2 trigger; the flag cannot create the trigger.
  - Published metadata and release actions are never run here.
`);
}

assertKnownOptions(rawArgs, [
  "dry-run",
  "output-dir",
  "ui-playwright-module-path",
  "ui-chrome-path",
  "ui-build-path",
  "run-120",
  "user-directed-120",
  "fixture-pass",
  "fixture-fail-stage",
  "fixture-cleanup-fail",
  "fixture-120-trigger",
  "h",
  "help",
]);

const options = parseArgs(rawArgs);
const runId = `v390-test-acceptance-${new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14)}-${process.pid}`;
const outputDir = path.resolve(rootDir, options.outputDir || path.join(os.tmpdir(), `media_server_${runId}`));
const runDir = path.join(outputDir, "runs", runId);
const summaryPath = path.join(outputDir, "summary.json");
const reportPath = path.join(outputDir, "report.md");
const fixtureMode = options.fixturePass || options.fixtureFailStage !== "" || options.fixtureCleanupFail;
const executionMode = options.dryRun ? "dry-run" : (fixtureMode ? "actual-fixture" : "actual");
const featureCommands = buildFeatureCommands();
const finalAcceptanceCommandSet = buildFinalAcceptanceCommandSet();
const stages = [];
let failedStage = "";
let failedCommand = "";
let cleanupFailed = false;
let longrun30Summary = null;
let uiAutomationSummary = null;
let policyEvaluation = null;
let longrun120Summary = null;
let longrun120Decision = null;
let uiEnvironmentHandle = null;
let uiEnvironmentSummary = null;
let uiEnvironmentCleanup = null;

let acceptanceAdminPassword = consumeAcceptanceAdminPassword();
const sourceProvenance = collectSourceProvenance(rootDir);
const priorFirstFailure = options.dryRun ? null : readPriorFirstFailure();
const outputPreparation = options.dryRun ? {
  replacedExisting: false,
  removedFiles: 0,
  removedBytes: 0,
  removedScreenshotFiles: 0,
  removedDuplicateScreenshotFiles: 0,
  removedPlaceholderVideoFiles: 0,
  verificationSource: "dry-run-does-not-replace-output",
  previousFailurePreserved: false,
  preservedFirstFailurePaths: [],
} : prepareOutputRoot();
if (priorFirstFailure) writePriorFirstFailure(priorFirstFailure);
fs.mkdirSync(runDir, { recursive: true });

if (options.dryRun) {
  writeDryRun();
} else {
  await runActualBundle();
  assertFirstFailureClosure(stages, failedStage);
}

async function runActualBundle() {
  for (const stageId of stageIds) {
    const ordinary = !["ui-server-cleanup", "cleanup", "report"].includes(stageId);
    const skipForPreviousFailure = ordinary && failedStage !== "";
    const skipConditional120 = stageId === "server-longrun-120" && longrun120Decision?.executionDecision !== "run";
    if (skipForPreviousFailure || skipConditional120) {
      stages.push(notRunStage(stageId, skipForPreviousFailure
        ? `not run after ${failedStage} failure`
        : `120-minute execution decision: ${longrun120Decision?.executionDecision || "not-evaluated"}`));
      printProgress(stageId, "not-run");
      continue;
    }

    printProgress(stageId, "test");
    try {
      if (fixtureMode) await runFixtureStage(stageId);
      else await runRealStage(stageId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (error?.uiEnvironment) uiEnvironmentSummary = error.uiEnvironment;
      if (error?.cleanup) uiEnvironmentCleanup = error.cleanup;
      if (stageId === "cleanup") cleanupFailed = true;
      recordFailure(stageId, `execute ${stageId}`, message, ["ui-server-cleanup", "cleanup"].includes(stageId));
    }
  }
  const summary = buildActualSummary();
  writeJson(summaryPath, summary);
  writeReport(reportPath, summary);
  normalizeTextArtifacts(outputDir);
  printSummary(summary);
  if (summary.result !== "PASS") process.exit(1);
}

function assertFirstFailureClosure(stageLedger, firstFailedStage) {
  if (!firstFailedStage) return;
  const failedIndex = stageIds.indexOf(firstFailedStage);
  const laterOrdinaryStageIds = stageIds.slice(failedIndex + 1)
    .filter((id) => !["ui-server-cleanup", "cleanup", "report"].includes(id));
  const laterStagesNotRun = laterOrdinaryStageIds.every((id) =>
    stageLedger.some((stage) => stage.id === id && stage.status === "not-run" &&
      stage.reason === `not run after ${firstFailedStage} failure`));
  assert(laterStagesNotRun, `stages after ${firstFailedStage} failure must remain not-run`);
}

async function runRealStage(stageId) {
  if (stageId === "preflight") {
    const missing = [
      "server.sh",
      "scripts/internal/verify_v390_server_longrun.mjs",
      "scripts/internal/run_v390_ui_native_exact_cases.mjs",
      "scripts/internal/verify_ui_fulltest_evidence_policy_v4.mjs",
      "scripts/internal/verify_v390_final_evidence_integrity.mjs",
      "scripts/internal/v390_acceptance_ui_environment.mjs",
      "test/fixtures/v390_ui_native_exact_cases.json",
    ].filter(relativePath => !fs.existsSync(path.join(rootDir, relativePath)));
    if (missing.length > 0) {
      recordFailure(stageId, "preflight", `missing required files: ${missing.join(", ")}`);
      return;
    }
    if (!fixtureMode && sourceProvenance.worktreeClean !== true) {
      recordFailure(stageId, "preflight", "current final actual acceptance requires a clean worktree; commit approved changes before running");
      return;
    }
    if (!fixtureMode && !acceptanceAdminPassword) {
      recordFailure(stageId, "preflight", "MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD is required for the acceptance-owned throwaway admin");
      return;
    }
    stages.push(passStage(stageId, "validate actual bundle inputs", {
      outputDir,
      runDir,
      featureCommandCount: featureCommands.length,
      uiExecution: "exact-424-policy-v4",
      uiEnvironmentOwnership: "self-contained-pid-port-artifact-ownership",
      dependencyStatus: "dependency-bootstrap-attestation",
      secretHandling: "runtime-admin-and-generated-role-secrets-memory-only",
      adminSecretSource: "MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD",
      roleStateSource: "role-storage-state-generated-by-acceptance",
      run120: options.run120,
      longrun120Decision: "AGENTS 7.6.2 conditional 120-minute decision",
    }));
    return;
  }

  if (stageId === "build") {
    await runSingleCommandStage(stageId, command("./server.sh", ["build"]));
    return;
  }

  if (stageId === "feature-gates") {
    await runCommandListStage(stageId, featureCommands);
    return;
  }

  if (stageId === "server-longrun-30") {
    const childDir = path.join(runDir, "server-longrun-30");
    const childSummaryPath = path.join(childDir, "summary.json");
    await runSingleCommandStage(stageId, command("./server.sh", [
      "verify-v390-server-longrun",
      "--duration-minutes", "30",
      "--output-dir", childDir,
    ]), childSummaryPath);
    if (fs.existsSync(childSummaryPath)) longrun30Summary = readJson(childSummaryPath);
    if (!failedStage) {
      const errors = validateLongrunSummary(longrun30Summary, 30, childDir);
      if (errors.length > 0) replaceStageWithValidationFailure(stageId, errors.join("; "));
    }
    return;
  }

  if (stageId === "ui-environment-bootstrap") {
    const startedAt = Date.now();
    try {
      uiEnvironmentHandle = await startSelfContainedUiEnvironment({
        rootDir,
        runId,
        adminPassword: acceptanceAdminPassword,
        fixtureMode: false,
        playwrightModulePath: options.uiPlaywrightModulePath,
        chromePath: options.uiChromePath,
        buildPath: options.uiBuildPath,
      });
    } finally {
      acceptanceAdminPassword = "";
    }
    uiEnvironmentSummary = uiEnvironmentHandle.attestation;
    const endedAt = Date.now();
    stages.push(makeStage({
      id: stageId,
      status: "PASS",
      command: "bootstrap acceptance-owned throwaway server/auth roles/Playwright storage-state",
      exitCode: 0,
      startedAt: new Date(startedAt).toISOString(),
      endedAt: new Date(endedAt).toISOString(),
      durationMs: endedAt - startedAt,
      logPath: writeStageLog(stageId, [JSON.stringify(uiEnvironmentSummary)]),
      summaryPath: uiEnvironmentHandle.runtimeDescriptorPath,
      tail: [],
      checks: [
        { id: "dependency-bootstrap-attestation", status: uiEnvironmentSummary.dependency?.browserLaunchVerified === true ? "PASS" : "FAIL" },
        { id: "role-storage-state-generated-by-acceptance", status: uiEnvironmentSummary.roles?.every(item => item.storageStateMode === "0600") ? "PASS" : "FAIL" },
        { id: "self-contained-pid-port-artifact-ownership", status: uiEnvironmentSummary.actualRuntimeEvidence === true ? "PASS" : "FAIL" },
      ],
      details: uiEnvironmentSummary,
    }));
    return;
  }

  if (stageId === "ui-exact-424") {
    assert(uiEnvironmentHandle?.runtime, "self-contained UI environment was not acquired");
    const childDir = path.join(runDir, "ui-exact-424");
    const childSummaryPath = path.join(childDir, "summary.json");
    const args = [
      "run-v390-ui-native-exact-cases",
      "--output-dir", childDir,
      "--http-base", uiEnvironmentHandle.runtime.httpBase,
      "--role-state-map", uiEnvironmentHandle.runtime.roleStateMapPath,
      "--server-log", uiEnvironmentHandle.runtime.serverLogPath,
      "--runtime-descriptor", uiEnvironmentHandle.runtimeDescriptorPath,
      "--build-path", options.uiBuildPath,
    ];
    if (options.uiPlaywrightModulePath) args.push("--playwright-module-path", options.uiPlaywrightModulePath);
    if (options.uiChromePath) args.push("--chrome-path", options.uiChromePath);
    await runSingleCommandStage(stageId, command("./server.sh", args, uiEnvironmentHandle.exactCaseEnv), childSummaryPath);
    const errors = [];
    try {
      if (fs.existsSync(childSummaryPath)) uiAutomationSummary = readJson(childSummaryPath);
      if (!failedStage) errors.push(...validateExactUiSummary(uiAutomationSummary, childDir));
      const acceptanceSecretArtifactIntegrity = uiEnvironmentHandle.assertSecretsAbsentFromArtifacts(childDir);
      if (acceptanceSecretArtifactIntegrity.status !== "PASS" ||
          acceptanceSecretArtifactIntegrity.verificationSource !== "exact-and-runtime-artifact-byte-scan-before-secret-release" ||
          Number(acceptanceSecretArtifactIntegrity.scannedFiles) < 1 || Number(acceptanceSecretArtifactIntegrity.scannedBytes) < 1) {
        errors.push("exact/runtime secret artifact scan evidence mismatch");
      }
      if (uiAutomationSummary) {
        uiAutomationSummary.acceptanceSecretArtifactIntegrity = acceptanceSecretArtifactIntegrity;
        writeJson(childSummaryPath, uiAutomationSummary);
        uiEnvironmentHandle.assertSecretsAbsentFromArtifacts(childDir);
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    } finally {
      uiEnvironmentHandle.releaseSecrets();
    }
    if (errors.length > 0) replaceStageWithValidationFailure(stageId, errors.join("; "));
    return;
  }

  if (stageId === "ui-server-cleanup") {
    const cleanup = uiEnvironmentCleanup || await stopSelfContainedUiEnvironment(uiEnvironmentHandle);
    uiEnvironmentCleanup = cleanup;
    const cleanupErrors = validateUiEnvironmentCleanupEvidence(cleanup);
    if (uiAutomationSummary) {
      uiAutomationSummary.cleanup = cleanup;
      uiAutomationSummary.summaryPath = path.join(runDir, "ui-exact-424", "summary.json");
      uiAutomationSummary.reportPath = "";
      uiAutomationSummary.artifactIntegrity = {
        placeholderVideoFiles: scanArtifactTree(path.join(runDir, "ui-exact-424")).placeholderVideoFiles.length,
      };
      writeJson(path.join(runDir, "ui-exact-424", "summary.json"), uiAutomationSummary);
    }
    if (cleanup.status !== "PASS" || cleanupErrors.length > 0) {
      recordFailure(stageId, "stop exact UI throwaway server", `UI throwaway server/port cleanup failed: ${cleanupErrors.join("; ")}`, true);
    }
    else stages.push(passStage(stageId, "stop exact UI throwaway server and verify ports", cleanup));
    return;
  }

  if (stageId === "ui-fulltest-qualification") {
    const evidenceSummaryPath = path.join(runDir, "ui-exact-424", "summary.json");
    const qualificationDir = path.join(runDir, "ui-fulltest-qualification");
    const evaluationPath = path.join(qualificationDir, "evaluation.json");
    await runSingleCommandStage(stageId, command("./server.sh", [
      "verify-ui-fulltest-evidence-policy-v4",
      "--summary", evidenceSummaryPath,
      "--output-dir", qualificationDir,
      "--require-eligible",
    ]), evaluationPath);
    if (fs.existsSync(evaluationPath)) policyEvaluation = readJson(evaluationPath);
    return;
  }

  if (stageId === "longrun-120-decision") {
    longrun120Decision = evaluateLongrun120Decision({ scope: buildLongrun120Scope(), runRequested: options.run120 });
    if (!longrun120Decision.valid || longrun120Decision.executionDecision === "hold-awaiting-approval") {
      recordFailure(stageId, "evaluate AGENTS 7.6.2 change scope", JSON.stringify(longrun120Decision));
    } else {
      stages.push(passStage(stageId, "evaluate AGENTS 7.6.2 change scope", longrun120Decision));
    }
    return;
  }

  if (stageId === "server-longrun-120") {
    const childDir = path.join(runDir, "server-longrun-120");
    const childSummaryPath = path.join(childDir, "summary.json");
    await runSingleCommandStage(stageId, command("./server.sh", [
      "verify-v390-server-longrun",
      "--duration-minutes", "120",
      "--output-dir", childDir,
    ]), childSummaryPath);
    if (fs.existsSync(childSummaryPath)) longrun120Summary = readJson(childSummaryPath);
    if (!failedStage) {
      const errors = validateLongrunSummary(longrun120Summary, 120, childDir);
      if (errors.length > 0) replaceStageWithValidationFailure(stageId, errors.join("; "));
    }
    return;
  }

  if (stageId === "cleanup") {
    const errors = validateChildCleanup();
    const measuredCleanup = cleanupEvidence();
    if (measuredCleanup.status !== "PASS") {
      errors.push(...measuredCleanup.checks.filter(item => item.status === "FAIL").map(item => `${item.check} failed`));
    }
    if (errors.length > 0) {
      cleanupFailed = true;
      recordFailure(stageId, "cleanup validation", errors.join("; "), true);
    } else {
      stages.push(passStage(stageId, "validate child cleanup and preserved evidence", measuredCleanup));
    }
    return;
  }

  if (stageId === "final-integrity") {
    const now = new Date().toISOString();
    const logPath = path.join(runDir, `${stageId}.log`);
    const stage = makeStage({
      id: stageId,
      status: "PASS",
      command: `./server.sh verify-v390-final-evidence-integrity --summary ${summaryPath}`,
      exitCode: 0,
      startedAt: now,
      endedAt: now,
      durationMs: 0,
      logPath,
      summaryPath,
      tail: [],
      checks: [],
    });
    stages.push(stage);
    writeJson(summaryPath, buildActualSummary());
    const result = await runCommand(command("./server.sh", [
      "verify-v390-final-evidence-integrity",
      "--summary", summaryPath,
    ]), logPath);
    Object.assign(stage, {
      status: result.exitCode === 0 ? "PASS" : "FAIL",
      exitCode: result.exitCode,
      startedAt: result.startedAt,
      endedAt: result.endedAt,
      durationMs: result.durationMs,
      tail: result.tail,
    });
    if (result.exitCode !== 0) {
      failedStage = stageId;
      failedCommand = stage.command;
    }
    return;
  }

  if (stageId === "report") {
    stages.push(passStage(stageId, "write acceptance summary/report", { summaryPath, reportPath }));
  }
}

async function runFixtureStage(stageId) {
  if (options.fixtureFailStage === stageId) {
    recordFailure(stageId, `fixture fail ${stageId}`, `fixture failure at ${stageId}`);
    return;
  }
  if (stageId === "ui-environment-bootstrap") {
    uiEnvironmentHandle = await startSelfContainedUiEnvironment({
      rootDir,
      runId,
      fixtureMode: true,
      buildPath: options.uiBuildPath,
    });
    uiEnvironmentSummary = uiEnvironmentHandle.attestation;
    stages.push(passStage(stageId, "fixture self-contained UI environment wiring", uiEnvironmentSummary));
    return;
  }
  if (stageId === "ui-server-cleanup") {
    uiEnvironmentCleanup = uiEnvironmentCleanup || await stopSelfContainedUiEnvironment(uiEnvironmentHandle);
    const errors = validateUiEnvironmentCleanupEvidence(uiEnvironmentCleanup);
    if (uiEnvironmentCleanup.status !== "PASS" || errors.length > 0) {
      recordFailure(stageId, "fixture UI environment cleanup", errors.join("; ") || "fixture UI cleanup failed", true);
    } else {
      stages.push(passStage(stageId, "fixture UI environment cleanup", uiEnvironmentCleanup));
    }
    return;
  }
  if (stageId === "cleanup" && options.fixtureCleanupFail) {
    cleanupFailed = true;
    recordFailure(stageId, "fixture cleanup", "fixture cleanup failure", true);
    return;
  }
  if (stageId === "longrun-120-decision") {
    longrun120Decision = evaluateLongrun120Decision({ scope: buildLongrun120Scope(), runRequested: options.run120 });
    if (!longrun120Decision.valid || longrun120Decision.executionDecision === "hold-awaiting-approval") {
      recordFailure(stageId, "fixture AGENTS 7.6.2 change scope", JSON.stringify(longrun120Decision));
    } else {
      stages.push(passStage(stageId, "fixture AGENTS 7.6.2 change scope", longrun120Decision));
    }
    return;
  }
  stages.push(passStage(stageId, `fixture pass ${stageId}`, { fixture: true }));
}

async function runSingleCommandStage(stageId, commandSpec, childSummaryPath = "") {
  const logPath = path.join(runDir, `${stageId}.log`);
  const result = await runCommand(commandSpec, logPath);
  const stage = makeStage({
    id: stageId,
    status: result.exitCode === 0 ? "PASS" : "FAIL",
    command: commandText(commandSpec),
    exitCode: result.exitCode,
    startedAt: result.startedAt,
    endedAt: result.endedAt,
    durationMs: result.durationMs,
    logPath,
    summaryPath: childSummaryPath,
    tail: result.tail,
    checks: [],
  });
  stages.push(stage);
  if (result.exitCode !== 0) {
    failedStage = stageId;
    failedCommand = stage.command;
  }
}

async function runCommandListStage(stageId, commands) {
  const startedAt = new Date().toISOString();
  const checks = [];
  for (let index = 0; index < commands.length; index += 1) {
    const spec = commands[index];
    if (failedStage) {
      checks.push({ id: spec.id, status: "not-run", command: commandText(spec), exitCode: null, logPath: "" });
      continue;
    }
    const logPath = path.join(runDir, `${stageId}-${String(index + 1).padStart(2, "0")}-${spec.id}.log`);
    const result = await runCommand(spec, logPath);
    checks.push({
      id: spec.id,
      status: result.exitCode === 0 ? "PASS" : "FAIL",
      command: commandText(spec),
      exitCode: result.exitCode,
      durationMs: result.durationMs,
      logPath,
      tail: result.tail,
    });
    if (result.exitCode !== 0) {
      failedStage = stageId;
      failedCommand = commandText(spec);
    }
  }
  stages.push(makeStage({
    id: stageId,
    status: failedStage === stageId ? "FAIL" : "PASS",
    command: `${commands.length} current feature commands`,
    exitCode: failedStage === stageId ? 1 : 0,
    startedAt,
    endedAt: new Date().toISOString(),
    durationMs: checks.reduce((sum, item) => sum + Number(item.durationMs || 0), 0),
    logPath: "",
    summaryPath: "",
    tail: [],
    checks,
  }));
}

function runCommand(spec, logPath) {
  return new Promise((resolve) => {
    const started = Date.now();
    const startedAt = new Date(started).toISOString();
    const chunks = [];
    const stream = fs.createWriteStream(logPath, { flags: "w" });
    let settled = false;
    const child = spawn(spec.file, spec.args, {
      cwd: rootDir,
      env: childProcessEnv(spec.env),
      stdio: ["ignore", "pipe", "pipe"],
    });
    const collect = (chunk, output) => {
      const text = String(chunk);
      chunks.push(text);
      stream.write(text);
      output.write(text);
    };
    child.stdout.on("data", chunk => collect(chunk, process.stdout));
    child.stderr.on("data", chunk => collect(chunk, process.stderr));
    const finish = (exitCode, extra = "") => {
      if (settled) return;
      settled = true;
      if (extra) { chunks.push(extra); stream.write(extra); }
      const ended = Date.now();
      stream.end(() => resolve({
        exitCode,
        startedAt,
        endedAt: new Date(ended).toISOString(),
        durationMs: ended - started,
        tail: tailLines(chunks.join("")),
      }));
    };
    child.on("error", error => finish(1, `${error instanceof Error ? error.message : String(error)}\n`));
    child.on("close", code => finish(Number.isInteger(code) ? code : 1));
  });
}

function childProcessEnv(overrides = {}) {
  const env = { ...process.env };
  delete env.MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD;
  delete env.MEDIA_SERVER_V390_UI_ROLE_SECRETS;
  return { ...env, ...overrides };
}

function replaceStageWithValidationFailure(stageId, message) {
  const index = stages.findIndex(item => item.id === stageId);
  assert(index >= 0, `stage not found for validation failure: ${stageId}`);
  stages[index] = { ...stages[index], status: "FAIL", exitCode: 1, validationError: message };
  failedStage = stageId;
  failedCommand = stages[index].command;
}

function recordFailure(stageId, commandValue, message, cleanupFailure = false) {
  const now = new Date().toISOString();
  stages.push(makeStage({
    id: stageId,
    status: "FAIL",
    command: commandValue,
    exitCode: 1,
    startedAt: now,
    endedAt: now,
    durationMs: 0,
    logPath: writeStageLog(stageId, [message]),
    summaryPath: "",
    tail: [message],
    checks: [],
  }));
  if (!failedStage || cleanupFailure) failedStage = failedStage || stageId;
  failedCommand = failedCommand || commandValue;
}

function buildActualSummary() {
  const executionPassed = failedStage === "" && !cleanupFailed;
  const fullSuiteEligibility = evaluateV390FullSuiteEligibility({
    executionPassed,
    executionMode,
    policyEvaluation,
    canonicalCaseIds: canonicalUiCaseIds,
  });
  const knownUiClosureBlockers = [...fullSuiteEligibility.reasons];
  const firstFailure = buildFirstFailure();
  const sourceProvenanceEnd = collectSourceProvenanceWithAllowedArtifacts(rootDir, outputDir);
  const canonicalCommandSetSha256 = sha256Text(JSON.stringify(finalAcceptanceCommandSet));
  return {
    schema: "media-server.v390-test-acceptance-bundle.v1",
    runId,
    command: `./server.sh verify-v390-test-acceptance-bundle ${rawArgs.join(" ")}`,
    sourceProvenance,
    sourceProvenanceEnd,
    outputPreparation,
    executionMode,
    dryRun: false,
    fixtureMode,
    result: executionPassed ? "PASS" : "FAIL",
    stopOnFirstFail: true,
    failedStage,
    failedCommand,
    outputDir,
    runDir,
    summaryPath,
    reportPath,
    finalAcceptanceCommandSet,
    canonicalCommandSetSha256,
    stageOrder: stageIds,
    stages,
    executedCommands: buildExecutedCommandLedger(),
    firstFailure,
    priorFirstFailure,
    localReadiness: stageStatus("feature-gates"),
    longrun30: childEvidence("server-longrun-30", longrun30Summary),
    uiTemporaryRoot: uiEnvironmentSummary?.temporaryRoot || "",
    uiEnvironment: uiEnvironmentSummary ? {
      ...uiEnvironmentSummary,
      cleanup: uiEnvironmentCleanup,
    } : {
      schema: "media-server.v390-acceptance-ui-environment.v1",
      result: "not-run",
      fixtureMode,
      dependency: { status: "dependency-bootstrap-attestation", browserLaunchVerified: false },
      secretHandling: "runtime-admin-and-generated-role-secrets-memory-only",
      adminSecretSource: "MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD",
      ownership: {
        serverStartedByAcceptance: true,
        portsAllocatedByAcceptance: true,
        rolesSeededByAcceptance: true,
        storageStatesGeneratedByAcceptance: true,
        boundary: "self-contained-pid-port-artifact-ownership",
      },
      cleanup: uiEnvironmentCleanup,
      evidenceBoundary: "environment bootstrap was not run",
    },
    uiAutomation: childEvidence("ui-exact-424", uiAutomationSummary),
    longrun120: {
      decision: longrun120Decision,
      policyDecision: longrun120Decision?.policyDecision || "미확인",
      executionDecision: longrun120Decision?.executionDecision || "not-evaluated",
      status: stageStatus("server-longrun-120"),
      summaryPath: longrun120Summary?.summaryPath || "",
      passSubstitution: false,
    },
    knownUiClosureBlockers,
    policyV4Evaluation: policyEvaluation,
    uiFulltestQualification: fullSuiteEligibility,
    automatedAcceptanceStatus: fullSuiteEligibility.status === "eligible"
      ? "eligible"
      : (executionPassed ? "executed-with-known-ui-closure-blockers" : "failed"),
    finalEvidenceEligible: fullSuiteEligibility.finalEvidenceEligible,
    manualUiFulltest: { status: "not-run-by-this-command", passClaimed: false },
    cleanup: cleanupEvidence(),
    publishedMetadata: { status: "not-run-by-this-command" },
    releaseAction: { status: "not-run-by-this-command", actions: ["push", "PR", "main merge", "signed tag", "GitHub Release", "next branch"] },
    evidenceBoundary: "actual automated acceptance is not Codex in-app manual UI fulltest, published metadata, or release-action evidence",
  };
}

function writeDryRun() {
  const longrun30 = readPreservedLongrun30Evidence();
  const uiAutomation = readPreservedUiAutomationEvidence();
  const summary = {
    schema: "media-server.v390-test-acceptance-bundle.v1",
    runId,
    command: `./server.sh verify-v390-test-acceptance-bundle ${rawArgs.join(" ")}`,
    sourceProvenance,
    sourceProvenanceEnd: collectSourceProvenanceWithAllowedArtifacts(rootDir, outputDir),
    outputPreparation,
    executionMode,
    dryRun: true,
    result: "PASS",
    stopOnFirstFail: true,
    evidenceBoundary: "dry-run does not execute build, feature gates, 30-minute, UI automation, 120-minute, published metadata, or release-action suites",
    outputDir,
    runDir,
    summaryPath,
    reportPath,
    finalAcceptanceCommandSet,
    canonicalCommandSetSha256: sha256Text(JSON.stringify(finalAcceptanceCommandSet)),
    localReadiness: { status: "not-run-by-dry-run", commands: featureCommands.map(commandText) },
    longrun30,
    longrun120: { status: "conditional-not-run", decision: "not-evaluated-by-dry-run", passSubstitution: false },
    uiAutomation,
    uiTemporaryRoot: "",
    uiEnvironment: {
      schema: "media-server.v390-acceptance-ui-environment.v1",
      result: "not-run-by-dry-run",
      fixtureMode: false,
      dependency: { status: "dependency-bootstrap-attestation", browserLaunchVerified: false },
      secretHandling: "runtime-admin-and-generated-role-secrets-memory-only",
      adminSecretSource: "MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD",
      ownership: {
        serverStartedByAcceptance: true,
        portsAllocatedByAcceptance: true,
        rolesSeededByAcceptance: true,
        storageStatesGeneratedByAcceptance: true,
        boundary: "self-contained-pid-port-artifact-ownership",
      },
      evidenceBoundary: "dry-run records ownership responsibility but starts no server/browser",
    },
    policyV4Evaluation: null,
    uiFulltestQualification: evaluateV390FullSuiteEligibility({
      executionPassed: false,
      executionMode,
      policyEvaluation: null,
      canonicalCaseIds: canonicalUiCaseIds,
    }),
    automatedAcceptanceStatus: "not-run",
    finalEvidenceEligible: false,
    preservedEvidenceStatus: longrun30.status === "pass-existing-evidence" && uiAutomation.status === "pass-existing-evidence"
      ? "eligible-existing-evidence"
      : "historical-evidence-requires-final-rerun",
    stages: stageIds.map(id => notRunStage(id, "not run by dry-run")),
    executedCommands: [],
    firstFailure: null,
    manualUiFulltest: { status: "not-run-by-this-command", passClaimed: false },
    publishedMetadata: { status: "not-run-by-dry-run" },
    releaseAction: { status: "not-run-by-dry-run" },
  };
  fs.mkdirSync(outputDir, { recursive: true });
  writeJson(summaryPath, summary);
  writeReport(reportPath, summary);
  normalizeTextArtifacts(outputDir);
  printSummary(summary);
  if (summary.result !== "PASS") process.exit(1);
}

function validateLongrunSummary(payload, durationMinutes, childDir) {
  const errors = [];
  if (payload?.schema !== "media-server.v390-server-longrun.v2") errors.push("longrun schema mismatch");
  if (payload?.result !== "PASS") errors.push("longrun result is not PASS");
  if (Number(payload?.durationMinutes) !== durationMinutes) errors.push("longrun duration mismatch");
  if (payload?.realDurationEvidence !== true) errors.push("realDurationEvidence is not true");
  errors.push(...validateMonotonicDurationEvidence(payload?.durationEvidence));
  errors.push(...validateIterationLedger(payload?.iterationEvidence?.ledger, payload?.delegatedSteps));
  if (payload?.iterationEvidence?.valid !== true) errors.push("longrun iteration evidence is not valid");
  if (payload?.stopOnFirstFail !== true) errors.push("longrun stopOnFirstFail is not true");
  if (payload?.cleanup?.serverStopped !== true || payload?.cleanup?.portsClean !== true || payload?.cleanup?.temporaryArtifactsRemoved !== true) errors.push("longrun cleanup incomplete");
  if (payload?.cleanup?.verificationSource !== "pid-port-artifact-before-after-observation") errors.push("longrun cleanup is not measured");
  errors.push(...validateCleanupMeasurement(payload?.cleanup?.measurement));
  if (!Array.isArray(payload?.cleanup?.checks) || payload.cleanup.checks.some(item => item.status !== "PASS")) errors.push("longrun measured cleanup checks incomplete");
  if (!fs.existsSync(path.join(childDir, "report.md"))) errors.push("longrun report missing");
  return [...new Set(errors)];
}

function buildLongrun120Scope() {
  const changedAreas = [];
  const changedFiles = [];
  let baseCommit = "";
  let sourceComplete = true;
  if (fixtureMode) {
    if (options.fixture120Trigger) changedFiles.push("scripts/internal/verify_v390_server_longrun.mjs");
  } else {
    try {
      const scopeDecision = readJson(path.join(rootDir, "test/fixtures/v390_structure_execution_scope_decision.json"));
      baseCommit = String(scopeDecision.executionBase?.commit || "");
      const output = execFileSync("git", ["diff", "--name-only", `${baseCommit}..HEAD`], { cwd: rootDir, encoding: "utf8" });
      changedFiles.push(...output.split(/\r?\n/).filter(Boolean));
    } catch {
      sourceComplete = false;
    }
  }
  const cleanupFiles = changedFiles.filter(file => [
    "scripts/internal/verify_predev_stability.sh",
    "scripts/internal/verify_v390_server_longrun.mjs",
    "scripts/internal/verify_v390_test_acceptance_bundle.mjs",
    "scripts/internal/v390_acceptance_ui_environment.mjs",
    "scripts/internal/verify_v390_final_evidence_integrity.mjs",
  ].includes(file));
  if (cleanupFiles.length > 0) {
    changedAreas.push({
      category: "cleanup-port-lifecycle",
      featureIds: ["OPS-168", "SAFE-201", "SAFE-212"],
      files: cleanupFiles,
      modules: ["predev-server-lifecycle", "longrun-cleanup", "acceptance-cleanup"],
    });
  }
  const upstreamSignals = [];
  if (longrun30Summary && (longrun30Summary.cleanup?.status !== "PASS" || longrun30Summary.durationEvidence?.eligibleRealDuration !== true)) {
    upstreamSignals.push({ id: "longrun-30-duration-cleanup-drift", status: "trigger" });
  }
  return {
    schema: "media-server.v390-longrun-120-scope.v1",
    sourceComplete,
    source: {
      baseCommit,
      headCommit: sourceProvenance.commitSha,
      changedFiles,
      policy: "AGENTS.md#7.6.2",
    },
    userDirective: options.userDirected120,
    releaseGate: false,
    mappedFeatureIds: [],
    changedAreas,
    upstreamSignals,
  };
}

function validateExactUiSummary(payload, childDir) {
  const errors = [];
  if (payload?.schema !== "media-server.ui-automation-evidence.v4") errors.push("exact UI Policy v4 schema mismatch");
  if (payload?.result !== "PASS") errors.push("exact UI execution result is not PASS");
  if (payload?.manualIntervention !== false || Number(payload?.coverage?.fail) !== 0 || Number(payload?.coverage?.notRun) !== 0 || Number(payload?.coverage?.unsupported) !== 0) errors.push("exact UI zero-fail/manual boundary mismatch");
  if (Number(payload?.coverage?.targetCount) !== 424 || payload?.cases?.length !== 424) errors.push("exact UI 424 case closure mismatch");
  if (payload?.selectedAdapter?.engine !== "playwright-native" || payload?.selectedAdapter?.fallbackUsed !== false) errors.push("exact UI native adapter mismatch");
  if (payload?.caseRuntimeSecretArtifactIntegrity?.status !== "PASS" ||
      payload?.caseRuntimeSecretArtifactIntegrity?.verificationSource !== "case-runtime-exact-and-throwaway-byte-scan-before-secret-release" ||
      Number(payload?.caseRuntimeSecretArtifactIntegrity?.scannedFiles) < 1 ||
      Number(payload?.caseRuntimeSecretArtifactIntegrity?.scannedBytes) < 1) {
    errors.push("exact UI case-runtime secret artifact integrity mismatch");
  }
  if (scanArtifactTree(childDir).duplicateScreenshotFiles !== 0) errors.push("UI duplicate screenshot file remains");
  if (!fs.existsSync(path.join(childDir, "summary.json"))) errors.push("exact UI summary missing");
  return errors;
}

function validateUiEnvironmentCleanupEvidence(cleanup) {
  const errors = [];
  if (!cleanup || cleanup.status !== "PASS") errors.push("self-contained UI cleanup status is not PASS");
  if (cleanup?.temporaryArtifactsRemoved !== true) errors.push("self-contained UI temporary artifacts remain");
  if (cleanup?.serversStopped !== true || cleanup?.portsClean !== true) errors.push("self-contained UI process/ports are not clean");
  if (cleanup?.runtimeEvidence === true) {
    errors.push(...validateCleanupMeasurement(cleanup.measurement));
    for (const item of cleanup.measurement?.ports || []) {
      const listeners = listListenerPids(Number(item.port));
      if (listeners.length > 0) errors.push(`throwaway-port-${item.port} gained a listener after cleanup: ${listeners.join(",")}`);
    }
    if (cleanup.verificationSource !== "pid-port-artifact-before-after-observation") {
      errors.push("self-contained UI cleanup runtime verification source mismatch");
    }
  } else if (![
    "fixture-or-partial-filesystem-measurement-not-runtime-evidence",
    "no-environment-acquired-no-cleanup-required",
  ].includes(cleanup?.verificationSource)) {
    errors.push("self-contained UI fixture/partial cleanup boundary mismatch");
  }
  return [...new Set(errors)];
}

function validateChildCleanup() {
  const errors = [];
  if (!fixtureMode && stageWasAttempted("server-longrun-30") && !longrun30Summary) errors.push("30-minute child cleanup summary missing");
  if (!fixtureMode && stageWasAttempted("ui-environment-bootstrap") && !uiEnvironmentSummary) errors.push("self-contained UI environment summary missing");
  if (!fixtureMode && stageWasAttempted("ui-environment-bootstrap") && !uiEnvironmentCleanup) errors.push("self-contained UI environment cleanup missing");
  if (!fixtureMode && stageWasAttempted("ui-exact-424") && !uiAutomationSummary) errors.push("UI child cleanup summary missing");
  if (!fixtureMode && stageWasAttempted("server-longrun-120") && !longrun120Summary) errors.push("120-minute child cleanup summary missing");
  if (!fixtureMode && longrun30Summary && (longrun30Summary.cleanup?.serverStopped !== true || longrun30Summary.cleanup?.portsClean !== true || longrun30Summary.cleanup?.temporaryArtifactsRemoved !== true)) errors.push("30-minute child cleanup failed");
  if (!fixtureMode && uiAutomationSummary && (uiAutomationSummary.cleanup?.serversStopped !== true || uiAutomationSummary.cleanup?.portsClean !== true || uiAutomationSummary.cleanup?.temporaryArtifactsRemoved !== true)) errors.push("UI child cleanup failed");
  if (!fixtureMode && longrun120Summary && (longrun120Summary.cleanup?.serverStopped !== true || longrun120Summary.cleanup?.portsClean !== true || longrun120Summary.cleanup?.temporaryArtifactsRemoved !== true)) errors.push("120-minute child cleanup failed");
  if (!fixtureMode && longrun30Summary?.cleanup?.verificationSource !== "pid-port-artifact-before-after-observation") errors.push("30-minute child cleanup source is not measured");
  if (!fixtureMode && uiEnvironmentCleanup?.verificationSource !== "pid-port-artifact-before-after-observation") errors.push("UI environment cleanup source is not measured");
  if (!fixtureMode && longrun120Summary && longrun120Summary.cleanup?.verificationSource !== "pid-port-artifact-before-after-observation") errors.push("120-minute child cleanup source is not measured");
  if (!fixtureMode && longrun30Summary) errors.push(...validateCleanupMeasurement(longrun30Summary.cleanup?.measurement).map(error => `30-minute ${error}`));
  if (!fixtureMode && uiEnvironmentCleanup?.runtimeEvidence === true) errors.push(...validateCleanupMeasurement(uiEnvironmentCleanup.measurement).map(error => `UI ${error}`));
  if (!fixtureMode && longrun120Summary) errors.push(...validateCleanupMeasurement(longrun120Summary.cleanup?.measurement).map(error => `120-minute ${error}`));
  return errors;
}

function cleanupEvidence() {
  const preservedArtifacts = [summaryPath, reportPath];
  if (priorFirstFailure) preservedArtifacts.push(path.join(outputDir, "first-failure.json"), path.join(outputDir, "first-failure.md"));
  if (longrun30Summary?.summaryPath) preservedArtifacts.push(longrun30Summary.summaryPath, longrun30Summary.reportPath);
  if (uiAutomationSummary?.summaryPath) preservedArtifacts.push(uiAutomationSummary.summaryPath, uiAutomationSummary.reportPath);
  if (longrun120Summary?.summaryPath) preservedArtifacts.push(longrun120Summary.summaryPath, longrun120Summary.reportPath);
  const artifactScan = scanArtifactTree(runDir);
  const remainingTemporaryPaths = listFiles(runDir).filter(filePath => /\/(core-registry|core-clips|core-snapshots)(?:\/|$)/.test(filePath));
  const checks = [
    { check: "child-cleanup-validation", status: cleanupFailed ? "FAIL" : "PASS", observed: !cleanupFailed },
    { check: "temporary-run-paths-absent", status: remainingTemporaryPaths.length === 0 ? "PASS" : "FAIL", paths: remainingTemporaryPaths },
    { check: "placeholder-video-files-absent", status: artifactScan.placeholderVideoFiles.length === 0 ? "PASS" : "FAIL", paths: artifactScan.placeholderVideoFiles },
    { check: "duplicate-screenshot-files-absent", status: artifactScan.duplicateScreenshotFiles === 0 ? "PASS" : "FAIL", groups: artifactScan.duplicateScreenshotGroups },
  ];
  const passed = checks.every(item => item.status === "PASS");
  return {
    status: passed ? "PASS" : "FAIL",
    verificationSource: "child-summary-and-filesystem",
    childCleanupVerified: checks[0].status === "PASS",
    temporaryArtifactsRemoved: checks[1].status === "PASS",
    placeholderVideoFilesAbsent: checks[2].status === "PASS",
    duplicateScreenshotFilesAbsent: checks[3].status === "PASS",
    preservedArtifacts: preservedArtifacts.filter(Boolean),
    preservationReason: "minimum reproducible summary/report/log/screenshot evidence inside requested output directory",
    checks,
  };
}

function prepareOutputRoot() {
  const allowedReleaseRoot = path.join(rootDir, "docs/release-artifacts/v3.9.0");
  const allowedTempRoots = [os.tmpdir(), "/tmp", "/private/tmp"].map(value => path.resolve(value));
  assert(isInside(allowedReleaseRoot, outputDir) || allowedTempRoots.some(tempRoot => isInside(tempRoot, outputDir)), `unsafe acceptance output directory: ${outputDir}`);
  const existed = fs.existsSync(outputDir);
  const before = existed ? scanArtifactTree(outputDir) : {
    fileCount: 0,
    totalBytes: 0,
    screenshotFiles: 0,
    duplicateScreenshotFiles: 0,
    placeholderVideoFiles: [],
  };
  const retainedNames = new Set(["summary.json", "report.md", "first-failure.json", "first-failure.md"]);
  const retainedFiles = [];
  if (existed) {
    for (const entry of fs.readdirSync(outputDir, { withFileTypes: true })) {
      const entryPath = path.join(outputDir, entry.name);
      if (entry.isFile() && retainedNames.has(entry.name)) {
        retainedFiles.push(entryPath);
        continue;
      }
      fs.rmSync(entryPath, { recursive: true, force: true });
      assert(!fs.existsSync(entryPath), `acceptance output replacement failed: ${entryPath}`);
    }
  }
  const retainedBytes = retainedFiles.reduce((sum, filePath) => sum + fs.statSync(filePath).size, 0);
  return {
    replacedExisting: existed,
    removedFiles: before.fileCount - retainedFiles.length,
    removedBytes: before.totalBytes - retainedBytes,
    removedScreenshotFiles: before.screenshotFiles,
    removedDuplicateScreenshotFiles: before.duplicateScreenshotFiles,
    removedPlaceholderVideoFiles: before.placeholderVideoFiles.length,
    retainedUntilReportWrite: retainedFiles,
    previousFailurePreserved: priorFirstFailure !== null,
    preservedFirstFailurePaths: priorFirstFailure
      ? [path.join(outputDir, "first-failure.json"), path.join(outputDir, "first-failure.md")]
      : [],
    verificationSource: "filesystem-scan-before-remove-and-absence-after-remove",
  };
}

function readPriorFirstFailure() {
  const preservedPath = path.join(outputDir, "first-failure.json");
  if (fs.existsSync(preservedPath)) {
    const preserved = readJson(preservedPath);
    if (preserved?.schema === "media-server.v390-acceptance-first-failure.v1") return preserved;
  }

  const existingSummaryPath = path.join(outputDir, "summary.json");
  if (!fs.existsSync(existingSummaryPath)) return null;
  const existing = readJson(existingSummaryPath);
  if (existing?.result !== "FAIL" || !existing?.firstFailure) return null;
  const failedStageRecord = (existing.stages || []).find(item => item.id === existing.failedStage && item.status === "FAIL");
  const childSummaryPath = failedStageRecord?.summaryPath || "";
  const child = childSummaryPath && fs.existsSync(childSummaryPath) ? readJson(childSummaryPath) : null;
  const diagnosticPaths = new Set();
  for (const candidate of [
    existing.firstFailure?.logPath,
    child?.failure?.logPath,
    child?.delegatedFailure?.logFile,
    child?.delegatedFailure?.stdoutFile,
    child?.delegatedFailure?.stderrFile,
  ]) {
    if (candidate && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) diagnosticPaths.add(candidate);
  }
  const diagnosticArtifacts = [...diagnosticPaths].map(filePath => ({
    originalPath: filePath,
    bytes: fs.statSync(filePath).size,
    sha256: sha256File(filePath),
    tail: fs.readFileSync(filePath, "utf8").split(/\r?\n/).filter(Boolean).slice(-200),
  }));
  return {
    schema: "media-server.v390-acceptance-first-failure.v1",
    recordedAt: new Date().toISOString(),
    capturedFromSummary: existingSummaryPath,
    sourceProvenance: existing.sourceProvenance || null,
    acceptanceCommand: existing.command || "",
    failedStage: existing.failedStage || "",
    failedCommand: existing.failedCommand || "",
    firstFailure: existing.firstFailure,
    childFailure: child?.failure || null,
    delegatedFailure: child?.delegatedFailure || null,
    cleanup: {
      acceptance: existing.cleanup || null,
      child: child?.cleanup || null,
    },
    diagnosticArtifacts,
  };
}

function writePriorFirstFailure(payload) {
  const jsonPath = path.join(outputDir, "first-failure.json");
  const markdownPath = path.join(outputDir, "first-failure.md");
  fs.mkdirSync(outputDir, { recursive: true });
  writeJson(jsonPath, payload);
  const lines = [
    "# v3.9.0 Acceptance First Failure",
    "",
    `schema: ${payload.schema}`,
    `recordedAt: ${payload.recordedAt}`,
    `sourceCommitSha: ${payload.sourceProvenance?.commitSha || ""}`,
    `failedStage: ${payload.failedStage || ""}`,
    `failedCommand: ${payload.failedCommand || ""}`,
    `reproductionCommand: ${payload.firstFailure?.reproductionCommand || ""}`,
    `context: ${payload.firstFailure?.context || ""}`,
    `childFailurePhase: ${payload.childFailure?.phase || ""}`,
    `childFailureCase: ${payload.childFailure?.case || ""}`,
    `childCleanupStatus: ${payload.cleanup?.child?.status || ""}`,
    "",
    "## Diagnostic artifact snapshots",
    "",
    ...(payload.diagnosticArtifacts || []).flatMap(item => [
      `### ${item.originalPath}`,
      "",
      `bytes: ${item.bytes}`,
      `sha256: ${item.sha256}`,
      "",
      "```text",
      ...item.tail,
      "```",
      "",
    ]),
  ];
  fs.writeFileSync(markdownPath, `${lines.join("\n").replace(/\n+$/, "")}\n`, "utf8");
}

function buildExecutedCommandLedger() {
  const ledger = [];
  for (const stage of stages) {
    if (stage.command) ledger.push({ stage: stage.id, id: stage.id, status: stage.status, command: stage.command, exitCode: stage.exitCode, logPath: stage.logPath || "" });
    for (const check of stage.checks || []) {
      ledger.push({ stage: stage.id, id: check.id, status: check.status, command: check.command, exitCode: check.exitCode, logPath: check.logPath || "" });
    }
  }
  return ledger;
}

function buildFirstFailure() {
  if (!failedStage) return null;
  const stage = stages.find(item => item.id === failedStage && item.status === "FAIL") || stages.find(item => item.status === "FAIL");
  const failedCheck = stage?.checks?.find(item => item.status === "FAIL");
  const commandValue = failedCheck?.command || failedCommand || stage?.command || "";
  const context = failedCheck?.tail?.join(" | ") || stage?.validationError || stage?.tail?.join(" | ") || "";
  return {
    stage: failedStage,
    command: commandValue,
    context,
    exitCode: failedCheck?.exitCode ?? stage?.exitCode ?? 1,
    logPath: failedCheck?.logPath || stage?.logPath || "",
    stderrTail: failedCheck?.tail || stage?.tail || [],
    reproductionCommand: commandValue,
  };
}

function readPreservedLongrun30Evidence() {
  const relative = "docs/release-artifacts/v3.9.0/server-longrun-30min-final/summary.json";
  const full = path.join(rootDir, relative);
  if (!fs.existsSync(full)) return { status: "missing-existing-evidence", summaryPath: relative };
  const payload = readJson(full);
  const valid = validateLongrunSummary(payload, 30, path.dirname(full)).length === 0;
  return { status: valid ? "pass-existing-evidence" : "invalid-existing-evidence", summaryPath: relative, result: payload.result || "", durationMinutes: payload.durationMinutes ?? null, realDurationEvidence: payload.realDurationEvidence === true };
}

function readPreservedUiAutomationEvidence() {
  const relative = "test/fixtures/v390_ui_current_evidence_state.json";
  const full = path.join(rootDir, relative);
  if (!fs.existsSync(full)) return { status: "missing-existing-evidence", summaryPath: relative };
  const payload = readJson(full);
  return {
    status: payload.schema === "media-server.v390-ui-current-evidence-state.v2" &&
      payload.sourceKind === "current-not-run-state" && payload.status === "not-run"
      ? "current-not-run"
      : "invalid-current-evidence-state",
    summaryPath: relative,
    reportPath: "",
    result: "not-run",
    caseCount: 0,
    pass: 0,
    fail: 0,
    notRun: Number(payload.execution?.notRun || 424),
    manualIntervention: false,
    selectedAdapter: "",
  };
}

function buildFeatureCommands() {
  const serverCommands = [
    "verify-v390-stabilization-release-readiness",
    "verify-v390-entry-baseline",
    "verify-v390-feature-completion-inventory",
    "verify-v390-user-review-gate",
    "verify-manual-ui-evidence",
    "verify-v390-evidence-test-gate-prep",
    "verify-v390-onvif-credential-provider-status",
    "verify-v390-onvif-live-import-persist-decision",
    "verify-v390-vlm-rule-suggestion-draft-bridge",
    "verify-v390-vlm-incident-rule-provenance",
    "verify-v390-vlm-evaluation-promotion-guard",
    "verify-v390-vlm-promotion-trust-boundary",
    "verify-v390-backup-recovery-handoff-validation",
    "verify-v390-action-execution-deferral-decision",
    "verify-v390-deferred-product-owner-signoff",
    "verify-v390-conditional-field-ai-decisions",
    "verify-v390-reid-readiness-consistency",
    "verify-v390-onvif-source-view-atomicity",
    "verify-v390-structure-stabilization-handoff",
    "verify-v390-structure-stabilization-readiness",
    "verify-v390-external-field-smoke-no-device-closure",
    "verify-v390-truthfulness-status-vocabulary",
    "verify-v390-analysis-registry-durable-write",
    "verify-v390-ui-policy-v4-producer-contract",
    "verify-v390-ui-visual-evidence-contract",
    "verify-release-metadata",
    "verify-docs-links",
    "verify-docs-ui-assets",
    "verify-feature-implementation-evidence",
    "verify-project-inventory",
    "verify-feature-inventory-coverage",
    "verify-release-evidence-index",
    "verify-script-inventory",
  ];
  return [
    ...serverCommands.map(name => ({ ...command("./server.sh", [name]), id: name.replace(/^verify-/, "") })),
    { ...command("git", ["diff", "--check"]), id: "git-diff-check" },
  ];
}

function buildFinalAcceptanceCommandSet() {
  return [
    { id: "actual-bundle", command: "./server.sh verify-v390-test-acceptance-bundle --output-dir docs/release-artifacts/v3.9.0/test-acceptance-current-final [--user-directed-120] [--run-120]", status: "actual-execution" },
    { id: "build", command: "./server.sh build", status: "executed-by-actual-bundle" },
    { id: "feature-gates", command: `${featureCommands.length} current feature commands`, status: "executed-by-actual-bundle" },
    { id: "server-longrun-30", command: "./server.sh verify-v390-server-longrun --duration-minutes 30 --output-dir <run>/server-longrun-30", status: "executed-by-actual-bundle" },
    { id: "ui-environment-bootstrap", command: "create acceptance-owned temp root/server/auth roles/storage-state/runtime descriptor with dependency-bootstrap-attestation", status: "executed-by-actual-bundle" },
    { id: "ui-exact-424", command: "./server.sh run-v390-ui-native-exact-cases --output-dir <run>/ui-exact-424 --http-base <owned-loopback-url> --role-state-map <owned-roles.json> --server-log <owned-server.log> --runtime-descriptor <owned-runtime.json> --build-path <build>", status: "executed-by-actual-bundle" },
    { id: "ui-server-cleanup", command: "verify explicit PID/port ownership, stop throwaway media_server, remove contained artifact root, and measure before/after bytes", status: "executed-by-actual-bundle" },
    { id: "ui-fulltest-qualification", command: "./server.sh verify-ui-fulltest-evidence-policy-v4 --summary <run>/ui-exact-424/summary.json --output-dir <run>/ui-fulltest-qualification --require-eligible", status: "executed-by-actual-bundle" },
    { id: "server-longrun-120", command: "./server.sh verify-v390-server-longrun --duration-minutes 120 --output-dir <run>/server-longrun-120", status: "AGENTS-7.6.2-runtime-decision" },
    { id: "final-integrity", command: "./server.sh verify-v390-final-evidence-integrity --summary <acceptance-summary.json>", status: "executed-by-actual-bundle" },
  ];
}

function parseArgs(args) {
  const parsed = {
    dryRun: false,
    outputDir: "",
    uiPlaywrightModulePath: "",
    uiChromePath: "",
    uiBuildPath: "build-gst-onnx/media_server",
    run120: false,
    userDirected120: false,
    fixturePass: false,
    fixtureFailStage: "",
    fixtureCleanupFail: false,
    fixture120Trigger: false,
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--dry-run") parsed.dryRun = true;
    else if (arg === "--output-dir") { parsed.outputDir = args[index + 1] || ""; index += 1; }
    else if (arg === "--ui-playwright-module-path") { parsed.uiPlaywrightModulePath = args[index + 1] || ""; index += 1; }
    else if (arg === "--ui-chrome-path") { parsed.uiChromePath = args[index + 1] || ""; index += 1; }
    else if (arg === "--ui-build-path") { parsed.uiBuildPath = args[index + 1] || ""; index += 1; }
    else if (arg === "--run-120") parsed.run120 = true;
    else if (arg === "--user-directed-120") parsed.userDirected120 = true;
    else if (arg === "--fixture-pass") parsed.fixturePass = true;
    else if (arg === "--fixture-fail-stage") { parsed.fixtureFailStage = args[index + 1] || ""; index += 1; }
    else if (arg === "--fixture-cleanup-fail") parsed.fixtureCleanupFail = true;
    else if (arg === "--fixture-120-trigger") parsed.fixture120Trigger = true;
  }
  assert(parsed.dryRun || parsed.outputDir !== "", "--output-dir is required for actual mode");
  assert(!(parsed.dryRun && (parsed.fixturePass || parsed.fixtureFailStage || parsed.fixtureCleanupFail || parsed.fixture120Trigger || parsed.run120 || parsed.userDirected120)), "--dry-run cannot be combined with actual fixture/run options");
  assert(!(parsed.fixturePass && parsed.fixtureFailStage), "--fixture-pass and --fixture-fail-stage are mutually exclusive");
  if (parsed.fixtureFailStage) assert(stageIds.includes(parsed.fixtureFailStage) && !["ui-server-cleanup", "cleanup", "report"].includes(parsed.fixtureFailStage), "unknown or invalid --fixture-fail-stage");
  return parsed;
}

function passStage(id, commandValue, details = {}) {
  const now = new Date().toISOString();
  return makeStage({ id, status: "PASS", command: commandValue, exitCode: 0, startedAt: now, endedAt: now, durationMs: 0, logPath: writeStageLog(id, [JSON.stringify(details)]), summaryPath: "", tail: [], checks: [], details });
}

function notRunStage(id, reason) {
  return makeStage({ id, status: "not-run", command: "", exitCode: null, startedAt: "", endedAt: "", durationMs: 0, logPath: "", summaryPath: "", tail: [], checks: [], reason });
}

function makeStage(fields) { return fields; }

function stageStatus(id) { return stages.find(item => item.id === id)?.status || "not-run"; }

function stageWasAttempted(id) { return ["PASS", "FAIL"].includes(stageStatus(id)); }

function childEvidence(id, payload) {
  return { status: stageStatus(id), summaryPath: payload?.summaryPath || "", reportPath: payload?.reportPath || "", result: payload?.result || "" };
}

function command(file, args, env = {}) { return { file, args, env, id: args[0] || path.basename(file) }; }

function commandText(spec) { return [spec.file, ...spec.args].join(" "); }

function writeStageLog(stageId, lines) {
  const filePath = path.join(runDir, `${stageId}.log`);
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
  return filePath;
}

function writeReport(filePath, payload) {
  const lines = [
    "# v3.9.0 Test Acceptance Bundle",
    "",
    `schema: ${payload.schema}`,
    `result: ${payload.result}`,
    `executionMode: ${payload.executionMode}`,
    `dryRun: ${payload.dryRun}`,
    `sourceCommitSha: ${payload.sourceProvenance?.commitSha || ""}`,
    `sourceBranch: ${payload.sourceProvenance?.branch || ""}`,
    `sourceWorktreeClean: ${payload.sourceProvenance?.worktreeClean ?? ""}`,
    `failedStage: ${payload.failedStage || "(none)"}`,
    `firstFailureCommand: ${payload.firstFailure?.command || "(none)"}`,
    `firstFailureContext: ${payload.firstFailure?.context || "(none)"}`,
    `automatedAcceptanceStatus: ${payload.automatedAcceptanceStatus || "not-evaluated"}`,
    `evidenceBoundary: ${payload.evidenceBoundary || ""}`,
    "",
    "| stage | status | command | log/summary |",
    "| --- | --- | --- | --- |",
    ...(payload.stages || []).map(item => `| ${item.id} | ${item.status} | ${escapeCell(item.command)} | ${escapeCell(item.summaryPath || item.logPath || item.reason || "")} |`),
    "",
    "## Known UI closure blockers",
    "",
    ...((payload.knownUiClosureBlockers || []).length > 0 ? payload.knownUiClosureBlockers.map(item => `- ${item}`) : ["- 없음"]),
    "",
    "## Executed command ledger",
    "",
    "| stage | id | status | command | exit | log |",
    "| --- | --- | --- | --- | ---: | --- |",
    ...((payload.executedCommands || []).map(item => `| ${escapeCell(item.stage)} | ${escapeCell(item.id)} | ${escapeCell(item.status)} | ${escapeCell(item.command)} | ${item.exitCode ?? ""} | ${escapeCell(item.logPath)} |`)),
  ];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

function writeJson(filePath, payload) { fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8"); }

function normalizeTextArtifacts(targetDir) {
  if (!fs.existsSync(targetDir)) return;
  for (const entry of fs.readdirSync(targetDir, { withFileTypes: true })) {
    const entryPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) normalizeTextArtifacts(entryPath);
    else if (/\.(log|md|txt)$/i.test(entry.name)) {
      const content = fs.readFileSync(entryPath, "utf8");
      fs.writeFileSync(entryPath, `${content.replace(/[ \t]+$/gm, "").replace(/\n+$/, "")}\n`, "utf8");
    }
  }
}

function readJson(filePath) { return JSON.parse(fs.readFileSync(filePath, "utf8")); }

function tailLines(text) { return text.split(/\r?\n/).filter(Boolean).slice(-12); }

function printProgress(stageId, label) {
  const index = stageIds.indexOf(stageId) + 1;
  console.log(`[progress] (${index}/${stageIds.length}) ${stageId} ${label}; remaining=${stageIds.length - index}`);
}

function printSummary(summary) {
  console.log("");
  console.log("== v3.9.0 test acceptance bundle summary ==");
  console.log(`- result: ${summary.result}`);
  console.log(`- executionMode: ${summary.executionMode}`);
  console.log(`- failedStage: ${summary.failedStage || ""}`);
  console.log(`- longrun30: ${summary.longrun30?.status || "not-run"}`);
  console.log(`- uiAutomation: ${summary.uiAutomation?.status || "not-run"}`);
  console.log(`- longrun120: ${summary.longrun120?.status || "not-run"}`);
  console.log(`- automatedAcceptanceStatus: ${summary.automatedAcceptanceStatus || "not-evaluated"}`);
  console.log(`- summaryPath: ${summary.summaryPath}`);
  console.log(`- reportPath: ${summary.reportPath}`);
}

function escapeCell(value) { return String(value ?? "").replace(/\|/g, "\\|").replace(/\s+/g, " ").trim(); }

function assert(condition, message) { if (!condition) throw new Error(message); }

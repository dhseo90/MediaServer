#!/usr/bin/env node
// 파일 용도: RELEASE evidence와 분리된 REVIEW4-65 후반 exact UI 진단 sweep을 실행한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  startSelfContainedUiEnvironment,
  stopSelfContainedUiEnvironment,
} from "./v390_acceptance_ui_environment.mjs";
import {
  buildNativeExactManifest,
  validateNativeExactManifest,
} from "./v390_ui_native_exact_cases_lib.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const options = parseArgs(process.argv.slice(2));
const runId = options.runId || `v390-ui-diagnostic-${timestampId()}-${process.pid}`;
const outputDir = options.outputDir
  ? resolveRootOrAbsolute(options.outputDir)
  : path.join(rootDir, ".media_server.test", "v3.9.0", "ui-diagnostic-sweep", runId);
const summaryPath = path.join(outputDir, "summary.json");
const progressPath = path.join(outputDir, "progress.json");

assertDiagnosticOutputRoot(outputDir);
fs.mkdirSync(outputDir, { recursive: true, mode: 0o700 });
const canonical = readJson("test/fixtures/ui_fulltest_case_manifest_policy_v4.json");
const implementation = readJson("test/fixtures/project_feature_implementation_evidence.json");
const manifest = buildNativeExactManifest({ canonical, implementation });
validateNativeExactManifest({ manifest, canonical, implementation });
const diagnosticManifestPath = path.join(outputDir, "diagnostic-native-manifest.json");
writeJson(diagnosticManifestPath, manifest);
const fullSelection = fixedSelection(manifest.cases);
const selection = selectedDiagnosticCases(fullSelection, options.caseId);

if (options.bootstrapFailureContractFixture) {
  const bootstrapError = bootstrapFailureContractFixture(options.bootstrapFailureContractFixture);
  const bootstrapFailure = buildBootstrapFailureEvidence(bootstrapError);
  const bootstrapCleanup = {
    generation: 1,
    reason: "bootstrap-failure",
    ...bootstrapFailure.cleanup,
  };
  const summary = buildSummary({
    result: "FAIL",
    executionStatus: "diagnostic-sweep-bootstrap-failure-contract-fixture",
    cases: [caseResult(selection[0], "FAIL", "environment-bootstrap-failed", 1, {
      environmentContamination: bootstrapFailure.cleanup.status !== "PASS",
      bootstrapFailure,
    })],
    environments: [{
      generation: 1,
      status: "bootstrap-failed",
      bootstrapFailure,
    }],
    cleanup: [bootstrapCleanup],
  });
  writeJson(summaryPath, summary);
  printSummary(summary, summaryPath);
  process.exit(1);
}

if (options.planOnly) {
  const summary = buildSummary({
    result: "NOT-RUN",
    executionStatus: "diagnostic-plan-only-not-browser-evidence",
    cases: selection.map(item => caseResult(item, "not-run", "plan-only", 0)),
    environments: [],
    cleanup: [],
  });
  writeJson(summaryPath, summary);
  printSummary(summary, summaryPath);
  process.exit(0);
}

let environment = null;
let environmentGeneration = 0;
let bootstrapUnavailable = false;
const cases = [];
const environments = [];
const cleanup = [];

for (const [selectionIndex, item] of selection.entries()) {
  if (bootstrapUnavailable) {
    cases.push(caseResult(item, "not-run", "environment-bootstrap-unavailable", environmentGeneration));
    writeProgress(selectionIndex, item);
    continue;
  }
  if (!environment) {
    environmentGeneration += 1;
    try {
      environment = await startSelfContainedUiEnvironment({
        rootDir,
        runId: `${runId}-environment-${environmentGeneration}`,
        buildPath: options.buildPath,
        timeoutMs: options.timeoutMs,
        playwrightModulePath: options.playwrightModulePath,
        chromePath: options.chromePath,
      });
      environments.push({ generation: environmentGeneration, status: "started" });
    } catch (error) {
      const bootstrapFailure = buildBootstrapFailureEvidence(error);
      cases.push(caseResult(item, "FAIL", "environment-bootstrap-failed", environmentGeneration, {
        environmentContamination: bootstrapFailure.cleanup.status !== "PASS",
        bootstrapFailure,
      }));
      environments.push({
        generation: environmentGeneration,
        status: "bootstrap-failed",
        bootstrapFailure,
      });
      cleanup.push({
        generation: environmentGeneration,
        reason: "bootstrap-failure",
        ...bootstrapFailure.cleanup,
      });
      bootstrapUnavailable = true;
      writeProgress(selectionIndex, item);
      continue;
    }
  }

  const childDir = path.join(outputDir, "cases", item.caseId);
  const child = await runDiagnosticChild({ item, childDir, environment });
  const childSummary = child.summary;
  const contaminated = childSummary?.environmentContamination?.detected === true || !child.summary;
  let secretScan = null;
  try {
    secretScan = environment.assertSecretsAbsentFromArtifacts(childDir);
  } catch {
    secretScan = { status: "FAIL", failureClass: "secret-artifact-integrity-failed" };
  }
  const caseStatus = childSummary?.case?.status === "PASS" ? "PASS" : "FAIL";
  cases.push(caseResult(item, caseStatus,
    childSummary?.case?.failureClass || (child.summary ? "diagnostic-child-invalid" : "diagnostic-child-missing"),
    environmentGeneration, {
      failureDetail: childSummary?.case?.failureDetail || "",
      childExitCode: child.exitCode,
      environmentContamination: contaminated || secretScan.status !== "PASS",
      childCleanupFailure: childSummary?.environmentContamination?.cleanupFailure === true,
      childBrowserCloseFailure: childSummary?.environmentContamination?.browserCloseFailure === true,
      secretScan,
    }));

  if (contaminated || secretScan.status !== "PASS") {
    const measuredCleanup = await recycleEnvironment(environment, environmentGeneration, "child-contamination");
    cleanup.push(measuredCleanup);
    environment = null;
  }
  writeProgress(selectionIndex, item);
}

if (environment) {
  cleanup.push(await recycleEnvironment(environment, environmentGeneration, "final"));
  environment = null;
}

const summary = buildSummary({
  result: cases.some(item => item.status === "FAIL") ||
    cleanup.some(item => item.status !== "PASS") ? "FAIL" : "PASS",
  executionStatus: "diagnostic-sweep-browser-evidence-not-release-evidence",
  cases,
  environments,
  cleanup,
});
writeJson(summaryPath, summary);
printSummary(summary, summaryPath);
process.exit(summary.result === "PASS" ? 0 : 1);

async function runDiagnosticChild({ item, childDir, environment: handle }) {
  fs.mkdirSync(childDir, { recursive: true, mode: 0o700 });
  const args = [
    "run-v390-ui-native-exact-cases",
    "--diagnostic-child",
    "--diagnostic-case-id", item.caseId,
    "--manifest", diagnosticManifestPath,
    "--output-dir", childDir,
    "--http-base", handle.runtime.httpBase,
    "--role-state-map", handle.runtime.roleStateMapPath,
    "--server-log", handle.runtime.serverLogPath,
    "--runtime-descriptor", handle.runtimeDescriptorPath,
    "--build-path", options.buildPath,
    "--timeout-ms", String(options.timeoutMs),
  ];
  if (options.playwrightModulePath) args.push("--playwright-module-path", options.playwrightModulePath);
  if (options.chromePath) args.push("--chrome-path", options.chromePath);
  const exitCode = await runChildProcess("./server.sh", args, handle.exactCaseEnv);
  const childSummaryPath = path.join(childDir, "summary.json");
  let summary = null;
  try {
    summary = readJsonAbsolute(childSummaryPath);
    validateChildSummary(summary, item);
  } catch {
    summary = null;
  }
  return { exitCode, summary };
}

async function recycleEnvironment(handle, generation, reason) {
  let result;
  try {
    result = await stopSelfContainedUiEnvironment(handle);
  } catch {
    result = { status: "FAIL", failureClass: "environment-cleanup-failed" };
  } finally {
    handle.releaseSecrets();
  }
  return {
    generation,
    reason,
    status: result.status === "PASS" ? "PASS" : "FAIL",
    runtimeEvidence: result.runtimeEvidence === true,
    serversStopped: result.serversStopped === true,
    portsClean: result.portsClean === true,
    temporaryArtifactsRemoved: result.temporaryArtifactsRemoved === true,
    verificationSource: result.verificationSource || "environment-cleanup-failed",
  };
}

function fixedSelection(cases) {
  const index = cases.findIndex(item => item.caseId === "RULE-097");
  assert(index >= 0, "RULE-097 is missing from the canonical exact manifest");
  const selected = cases.slice(index);
  assert(selected.length === 144, `RULE-097 through canonical end must contain 144 cases: ${selected.length}`);
  return selected;
}

function selectedDiagnosticCases(cases, caseId) {
  if (!caseId) return cases;
  const selected = cases.find(item => item.caseId === caseId);
  assert(selected, `diagnostic case is outside the fixed RULE-097 selection: ${caseId}`);
  return [selected];
}

function buildSummary({ result, executionStatus, cases, environments, cleanup }) {
  const counts = {
    target: selection.length,
    attempted: cases.filter(item => item.status === "PASS" || item.status === "FAIL").length,
    pass: cases.filter(item => item.status === "PASS").length,
    fail: cases.filter(item => item.status === "FAIL").length,
    notRun: cases.filter(item => item.status === "not-run").length,
  };
  assert(counts.target === counts.attempted + counts.notRun, "diagnostic target/count invariant failed");
  assert(counts.attempted === counts.pass + counts.fail, "diagnostic attempted/count invariant failed");
  return {
    schema: "media-server.v390-ui-diagnostic-sweep.v1",
    result,
    executionStatus,
    diagnosticOnly: true,
    releaseEvidenceEligible: false,
    policyV4Qualification: "not-eligible",
    uiFulltestPass: false,
    selection: {
      startCaseId: "RULE-097",
      targetCaseCount: selection.length,
      targetCaseIdsSha256: sha256(selection.map(item => item.caseId).join("\n")),
      automaticRetryCount: 0,
      mode: options.caseId ? "single-case-diagnostic" : "fixed-remaining-sweep",
    },
    counts,
    environments,
    cleanup,
    cases,
  };
}

function caseResult(item, status, failureClass, environmentGeneration, extra = {}) {
  return {
    caseId: item.caseId,
    featureId: item.featureId,
    status,
    failureClass,
    environmentGeneration,
    automaticRetryCount: 0,
    ...extra,
  };
}

function buildBootstrapFailureEvidence(error) {
  const attestation = error?.uiEnvironment && typeof error.uiEnvironment === "object"
    ? error.uiEnvironment
    : {};
  const reason = sanitizeBootstrapReason(
    attestation.failureReason || (error instanceof Error ? error.message : String(error || "")),
  );
  const cleanup = safeBootstrapCleanupAttestation(error?.cleanup);
  const phase = classifyBootstrapFailurePhase(attestation);
  return {
    schema: "media-server.v390-ui-diagnostic-bootstrap-failure.v1",
    code: classifyBootstrapFailureCode(reason, phase),
    phase,
    reasonSha256: sha256(reason),
    environmentAttestationSha256: sha256(stableJson(attestation)),
    dependencyReady: attestation.dependency?.browserLaunchVerified === true,
    serverAttemptCount: Array.isArray(attestation.portAllocation?.attempts)
      ? attestation.portAllocation.attempts.length
      : 0,
    generatedRoleStateCount: Array.isArray(attestation.roles)
      ? attestation.roles.filter(item => item?.status === "actual-whoami-verified").length
      : 0,
    cleanup,
  };
}

function classifyBootstrapFailurePhase(attestation) {
  if (attestation.dependency?.browserLaunchVerified !== true) return "playwright-dependency";
  if (!attestation.seedTargetSelection) return "seed-preparation";
  const attempts = Array.isArray(attestation.portAllocation?.attempts)
    ? attestation.portAllocation.attempts
    : [];
  if (!attempts.some(item => item?.status === "owned-ready")) return "server-bootstrap";
  const roles = Array.isArray(attestation.roles) ? attestation.roles : [];
  if (roles.some(item => item?.status !== "actual-whoami-verified")) return "auth-storage-bootstrap";
  return "environment-finalization";
}

function classifyBootstrapFailureCode(reason, phase) {
  if (/\bEPERM\b|operation not permitted/i.test(reason)) return "LISTENER_PERMISSION_DENIED";
  if (/browser executable unavailable/i.test(reason)) return "BROWSER_EXECUTABLE_UNAVAILABLE";
  if (/playwright/i.test(reason) && phase === "playwright-dependency") {
    return "PLAYWRIGHT_DEPENDENCY_FAILED";
  }
  if (/build does not exist/i.test(reason)) return "BUILD_MISSING";
  if (/seed/i.test(reason) && phase === "seed-preparation") return "SEED_PREPARATION_FAILED";
  if (/readiness timeout|server failed|retry child/i.test(reason)) return "SERVER_BOOTSTRAP_FAILED";
  if (phase === "auth-storage-bootstrap") return "AUTH_STORAGE_BOOTSTRAP_FAILED";
  return "UI_ENVIRONMENT_BOOTSTRAP_FAILED";
}

function safeBootstrapCleanupAttestation(cleanup) {
  const value = cleanup && typeof cleanup === "object" ? cleanup : {};
  const checks = Array.isArray(value.checks) ? value.checks : [];
  return {
    status: value.status === "PASS" ? "PASS" : "FAIL",
    runtimeEvidence: value.runtimeEvidence === true,
    serversStopped: value.serversStopped === true,
    portsClean: value.portsClean === true,
    temporaryArtifactsRemoved: value.temporaryArtifactsRemoved === true,
    verificationSourceSha256: sha256(String(value.verificationSource || "missing")),
    checkCount: checks.length,
    failedCheckDigests: checks
      .filter(item => item?.status !== "PASS")
      .map(item => sha256(String(item?.check || "unknown"))),
  };
}

function sanitizeBootstrapReason(reason) {
  return String(reason || "")
    .replace(/(?:https?|rtsp|rtsps):\/\/[^\s,;)]+/ig, "[redacted-url]")
    .replace(/\b(?:password|credential|secret|token|cookie|authorization)\s*[=:]\s*[^\s,;]+/ig,
      "[redacted-sensitive-material]");
}

function bootstrapFailureContractFixture(name) {
  assert(name === "listener-eperm", "unknown bootstrap failure contract fixture");
  const rawReason =
    "listen EPERM: operation not permitted https://bootstrap.invalid/path password=contract-secret";
  const error = new Error(rawReason);
  error.uiEnvironment = {
    schema: "media-server.v390-acceptance-ui-environment.v1",
    result: "FAIL",
    dependency: {
      status: "dependency-bootstrap-attestation",
      browserLaunchVerified: true,
    },
    seedTargetSelection: {
      baselineId: "contract-fixture",
    },
    portAllocation: {
      strategy: "ephemeral-probe-bounded-retry-with-exact-child-listener-ownership",
      attempts: [],
    },
    roles: [
      { role: "admin", status: "not-generated" },
      { role: "operator", status: "not-generated" },
      { role: "viewer", status: "not-generated" },
      { role: "integrator", status: "not-generated" },
    ],
    failureReason: rawReason,
  };
  error.cleanup = {
    status: "PASS",
    runtimeEvidence: false,
    serversStopped: true,
    portsClean: true,
    temporaryArtifactsRemoved: true,
    verificationSource: "fixture-or-partial-filesystem-measurement-not-runtime-evidence",
    checks: [
      { check: "fixture-or-partial-temporary-root-contained", status: "PASS" },
      { check: "fixture-or-partial-temporary-root-removed", status: "PASS" },
    ],
  };
  return error;
}

function writeProgress(selectionIndex, item) {
  const attempted = cases.filter(value => ["PASS", "FAIL"].includes(value.status)).length;
  const pass = cases.filter(value => value.status === "PASS").length;
  const fail = cases.filter(value => value.status === "FAIL").length;
  const last = cases.at(-1);
  writeJson(progressPath, {
    schema: "media-server.v390-ui-diagnostic-progress.v1",
    diagnosticOnly: true,
    releaseEvidenceEligible: false,
    runId,
    target: selection.length,
    completed: selectionIndex + 1,
    attempted,
    pass,
    fail,
    remaining: selection.length - selectionIndex - 1,
    currentCaseId: item.caseId,
    currentStatus: last?.status || "not-run",
    currentFailureClass: last?.failureClass || "",
    currentFailureDetail: last?.failureDetail || "",
    environmentGeneration,
    updatedAt: new Date().toISOString(),
  });
  console.log(
    `[diagnostic-progress] ${selectionIndex + 1}/${selection.length} ` +
    `${item.caseId}=${last?.status || "not-run"} pass=${pass} fail=${fail}`,
  );
}

function validateChildSummary(summary, item) {
  assert(summary?.schema === "media-server.v390-ui-diagnostic-child.v1", "diagnostic child schema mismatch");
  assert(summary.diagnosticOnly === true && summary.releaseEvidenceEligible === false,
    "diagnostic child release-evidence boundary mismatch");
  assert(summary.policyV4Qualification === "not-eligible" && summary.uiFulltestPass === false,
    "diagnostic child Policy v4 boundary mismatch");
  assert(summary.selection?.caseId === item.caseId && summary.selection?.automaticRetryCount === 0,
    "diagnostic child selection/retry mismatch");
  assert(summary.case?.caseId === item.caseId, "diagnostic child case mismatch");
  assert(!/(?:https?|rtsp|rtsps):\/\//i.test(String(summary.case?.failureDetail || "")),
    "diagnostic child failure detail contains a raw URL");
  assert(!/\b(?:password|credential|secret|token|cookie|authorization)\s*[=:]\s*(?!\[redacted\])/i.test(
    String(summary.case?.failureDetail || ""),
  ), "diagnostic child failure detail contains sensitive material");
}

function assertDiagnosticOutputRoot(candidate) {
  const allowedRoot = path.join(rootDir, ".media_server.test", "v3.9.0", "ui-diagnostic-sweep");
  const relative = path.relative(allowedRoot, candidate);
  assert(relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative),
    "diagnostic output must be inside .media_server.test/v3.9.0/ui-diagnostic-sweep");
}

function runChildProcess(file, args, env) {
  return new Promise(resolve => {
    const child = spawn(file, args, {
      cwd: rootDir,
      env: { ...process.env, ...env },
      stdio: ["ignore", "ignore", "ignore"],
    });
    child.once("error", () => resolve(1));
    child.once("exit", code => resolve(Number.isInteger(code) ? code : 1));
  });
}

function parseArgs(args) {
  const parsed = {
    outputDir: "",
    runId: "",
    buildPath: "build-gst-onnx/media_server",
    timeoutMs: 30000,
    playwrightModulePath: "",
    chromePath: "",
    planOnly: false,
    caseId: "",
    bootstrapFailureContractFixture: "",
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--output-dir") parsed.outputDir = args[++index] || "";
    else if (arg === "--run-id") parsed.runId = args[++index] || "";
    else if (arg === "--build-path") parsed.buildPath = args[++index] || "";
    else if (arg === "--timeout-ms") parsed.timeoutMs = Number(args[++index] || 0);
    else if (arg === "--playwright-module-path") parsed.playwrightModulePath = args[++index] || "";
    else if (arg === "--chrome-path") parsed.chromePath = args[++index] || "";
    else if (arg === "--case-id") parsed.caseId = args[++index] || "";
    else if (arg === "--contract-bootstrap-failure-fixture") {
      parsed.bootstrapFailureContractFixture = args[++index] || "";
    }
    else if (arg === "--plan-only") parsed.planOnly = true;
    else throw new Error(`unknown option: ${arg}`);
  }
  assert(Number.isFinite(parsed.timeoutMs) && parsed.timeoutMs > 0, "--timeout-ms must be positive");
  if (parsed.caseId) assert(/^[A-Z]+-\d{3}$/.test(parsed.caseId), "--case-id must be a canonical case ID");
  if (parsed.bootstrapFailureContractFixture) {
    assert(parsed.caseId, "bootstrap failure contract fixture requires --case-id");
  }
  return parsed;
}

function printSummary(summary, filePath) {
  console.log("== v3.9.0 internal UI diagnostic sweep ==");
  console.log(`- result: ${summary.result}`);
  console.log(`- target: ${summary.counts.target}`);
  console.log(`- attempted: ${summary.counts.attempted}`);
  console.log(`- pass: ${summary.counts.pass}`);
  console.log(`- fail: ${summary.counts.fail}`);
  console.log(`- notRun: ${summary.counts.notRun}`);
  console.log(`- summaryPath: ${filePath}`);
}

function timestampId() {
  return new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
}

function sha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function resolveRootOrAbsolute(value) {
  return path.isAbsolute(value) ? path.resolve(value) : path.resolve(rootDir, value);
}

function readJson(relativePath) {
  return readJsonAbsolute(resolveRootOrAbsolute(relativePath));
}

function readJsonAbsolute(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

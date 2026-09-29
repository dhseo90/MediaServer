#!/usr/bin/env node
// 파일 용도: v2.3.0 VLM opt-in operational evidence gate와 산출물 경계를 검증한다.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import { validateFeatureDocumentation } from "./documentation_contract_lib.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v2.3.0 VLM opt-in operational evidence verification

Usage:
  ./server.sh verify-v230-vlm-opt-in-operational-evidence [options]

Options:
  --report <path>       Markdown operational evidence report를 저장합니다.
  --json-report <path>  JSON operational evidence report를 저장합니다.
  -h, --help            도움말 출력

Checks:
  - existing VLM runtime opt-in contract keeps profiles default-off
  - existing local runtime smoke uses loopback fixture evidence only
  - existing cloud provider field gate stays not-run/no-provider-call by default
  - existing privacy/transfer guard keeps credential, prompt, response, source, and raw frame material redacted
  - 현행 문서·기능 정의·실제 명령을 연결하며 과거 실행 결과를 요구하지 않음
`);
}

assertKnownOptions(rawArgs, ["report", "json-report", "h", "help"]);

const args = parseArgs(rawArgs);
const reportPath = args.report ? path.resolve(rootDir, args.report) : "";
const jsonReportPath = args.jsonReport ? path.resolve(rootDir, args.jsonReport) : "";
const branch = runText("git", ["rev-parse", "--abbrev-ref", "HEAD"], { optional: true }).trim() || "unknown";
const head = runText("git", ["rev-parse", "HEAD"], { optional: true }).trim() || "unknown";
const payload = buildPayload();
const checks = [];

check("runtime opt-in contract keeps VLM default-off and side-effect-free", () => {
  const output = runNodeScript("verify_vlm_runtime_opt_in_contract.mjs");
  assert(output.includes("VLM runtime opt-in contract summary"), "runtime opt-in output missing summary");
  assert(output.includes("- fail: 0"), "runtime opt-in contract verifier did not report zero failures");
  payload.runtimeEvidence.runtimeOptInContract = {
    status: "pass",
    command: "./server.sh verify-vlm-runtime-opt-in-contract",
    schema: "media-server.vlm-runtime-opt-in-contract.v1",
    defaultEnabled: false,
    runtimeCallAllowed: false,
    providerCallAllowed: false,
  };
});

check("local runtime smoke records loopback-only intake without provider/model promotion", () => {
  withReportEvidence("localRuntimeSmoke", "verify_vlm_local_runtime_smoke.mjs", (evidence, report, output) => {
  assert(output.includes("VLM local runtime smoke summary"), "local runtime smoke output missing summary");
  assert(report.schema === "media-server.vlm-local-runtime-smoke-report.v1", "local runtime smoke schema mismatch");
  assert(report.status === "pass", "local runtime smoke report must pass");
  assert(report.scope.actualLocalHttpRoundtrip === true, "local runtime smoke must execute loopback HTTP roundtrip");
  assert(report.scope.actualUserModelQualityChecked === false, "local runtime smoke must not claim user model quality");
  assert(report.scope.cloudProviderApiCalled === false, "local runtime smoke must not call cloud provider");
  assert(report.scope.sidecarWritten === false, "local runtime smoke must not write sidecar");
  assert(report.scope.eventOrMetadataSchemaChanged === false, "local runtime smoke must not change event/metadata schema");
  assert(report.scope.mediaPathChanged === false, "local runtime smoke must not change media path");
  const registryWritePerformed = report.scope.sidecarWritten === true ||
    report.cases.some(item => item.sideEffects?.some(effect => /write|stored/i.test(String(effect))));
  const credentialStored = report.cases.some(item => item.credentialHeaderSeen === true ||
    item.sideEffects?.some(effect => /credential/i.test(String(effect))));
  const mutationChanged = report.scope.eventOrMetadataSchemaChanged === true || report.scope.mediaPathChanged === true;
  const rawRuntimeMaterialStored = JSON.stringify(report).includes('"rawPromptStored":true') ||
    JSON.stringify(report).includes('"rawProviderResponseStored":true') ||
    JSON.stringify(report).includes('"rawLocatorStored":true');
  assert(credentialStored === false && registryWritePerformed === false,
    "local runtime credential and registryWritePerformed must remain false");
  assert(mutationChanged === false, "local runtime schema/media mutationChanged must remain false");
  assert(rawRuntimeMaterialStored === false, "local runtime raw material must remain absent");
  assert(report.summary.connectedCases === 3, "local runtime smoke expected three connected fixture cases");
  assert(report.summary.missingRuntimeCases === 1, "local runtime smoke expected one missing-runtime fixture");
  assert(report.summary.timeoutCases === 1, "local runtime smoke expected one timeout fixture");
  assert(report.summary.invalidOutputCases === 1, "local runtime smoke expected one invalid-output fixture");
  Object.assign(evidence, {
    status: "pass",
    command: "./server.sh verify-vlm-local-runtime-smoke",
    connectedCases: report.summary.connectedCases,
    missingRuntimeCases: report.summary.missingRuntimeCases,
    timeoutCases: report.summary.timeoutCases,
    invalidOutputCases: report.summary.invalidOutputCases,
  });
  });
});

check("cloud provider gate records default not-run as not release eligible", () => {
  withReportEvidence("cloudProviderGate", "verify_vlm_cloud_provider_field_smoke_gate.mjs", (evidence, report, output) => {
  assert(output.includes("VLM cloud provider field smoke gate summary"), "cloud provider gate output missing summary");
  assert(report.schema === "media-server.vlm-cloud-provider-field-smoke-gate-report.v1", "cloud provider gate schema mismatch");
  assert(report.gateStatus === "pass", "cloud provider gate report must pass");
  assert(report.fieldSmoke.providerApiCalled === false, "default S05 gate must not call cloud provider");
  assert(report.fieldSmoke.status === "not-run", "default S05 cloud field smoke status must be not-run");
  assert(report.fieldSmoke.releasePassEligible === false, "default not-run cloud field smoke must not be release eligible");
  assert(report.redaction.credentialMaterialStored === false, "cloud gate report must not store credential material");
  assert(report.redaction.rawPromptStored === false, "cloud gate report must not store raw prompt");
  assert(report.redaction.rawProviderResponseStored === false, "cloud gate report must not store raw provider response");
  const credentialMaterialStored = report.redaction.credentialMaterialStored;
  const registryWritePerformed = credentialMaterialStored === true;
  const rawProviderMaterialStored = report.redaction.rawPromptStored === true ||
    report.redaction.rawProviderResponseStored === true;
  const sourceUrlStored = report.redaction.sourceUrlStored === true;
  const providerCall = report.fieldSmoke.providerApiCalled;
  assert(credentialMaterialStored === false && registryWritePerformed === false,
    "cloud credential registryWritePerformed must remain false");
  assert(rawProviderMaterialStored === false, "cloud raw provider material must remain absent");
  assert(sourceUrlStored === false, "cloud sourceUrl material must remain absent");
  assert(providerCall === false && report.fieldSmoke.releasePassEligible === false,
    "cloud providerCall must remain false and not release eligible without explicit approved field execution");
  Object.assign(evidence, {
    status: "pass",
    command: "./server.sh verify-vlm-cloud-provider-field-smoke-gate",
    fieldSmokeStatus: report.fieldSmoke.status,
    providerApiCalled: report.fieldSmoke.providerApiCalled,
    releasePassEligible: report.fieldSmoke.releasePassEligible,
  });
  });
});

check("privacy transfer guard keeps VLM operational evidence redacted and Ops-only", () => {
  const output = runNodeScript("verify_vlm_privacy_transfer_guard.mjs");
  assert(output.includes("VLM privacy/transfer guard summary"), "privacy guard output missing summary");
  assert(output.includes("- fail: 0"), "privacy transfer guard verifier did not report zero failures");
  payload.runtimeEvidence.privacyTransferGuard = {
    status: "pass",
    command: "./server.sh verify-vlm-privacy-transfer-guard",
    schema: "media-server.vlm-privacy-transfer-guard.v1",
    credentialMaterialStored: false,
    rawPromptStored: false,
    rawProviderResponseStored: false,
    sourceUrlStored: false,
    rawFrameBytesStored: false,
  };
});

check("VLM public docs and exact features retain current contracts and dispatch", () => {
  for (const [file, identifiers] of [
    ["vlm-runtime-opt-in-contract.md", ["media-server.vlm-runtime-opt-in-contract.v1", "defaultEnabled", "runtimeCallAllowed", "providerCallAllowed"]],
    ["vlm-local-runtime-connection-smoke.md", ["media-server.vlm-local-runtime-smoke-report.v1", "actualLocalHttpRoundtrip", "actualUserModelQualityChecked"]],
    ["vlm-cloud-provider-field-smoke-gate.md", ["media-server.vlm-cloud-provider-field-smoke-gate-report.v1", "providerApiCalled", "releasePassEligible"]],
    ["vlm-privacy-transfer-guard.md", ["media-server.vlm-privacy-transfer-guard.v1", "promptStored", "sourceUrlStored", "rawFrameBytesStored"]],
  ]) {
    const document = readText("docs/" + file);
    for (const identifier of identifiers) assert(document.includes(identifier), file + " missing current contract: " + identifier);
  }
  const errors = validateFeatureDocumentation({
    document: readText("docs/vlm-runtime-opt-in-contract.md"),
    identifiers: ["media-server.vlm-runtime-opt-in-contract.v1"],
    command: "verify-v230-vlm-opt-in-operational-evidence", script: "verify_v230_vlm_opt_in_operational_evidence.mjs",
    featureIds: ["LAB-038", "LAB-042", "LAB-056", "LAB-057", "SAFE-025", "SAFE-027", "SAFE-029", "SAFE-034", "SAFE-035"],
    inventory: readText("docs/project-feature-test-inventory.md"),
    verification: readText("docs/stream-verification.md"), server: readText("server.sh"),
  });
  assert(errors.length === 0, errors.join("; "));
});

let pass = 0;
let fail = 0;
for (const item of checks) {
  try {
    item.fn();
    pass += 1;
    payload.checks.push({ name: item.name, status: "pass" });
    console.log(`[pass] ${item.name}`);
  } catch (error) {
    fail += 1;
    payload.status = "fail";
    payload.checks.push({ name: item.name, status: "fail", message: error instanceof Error ? error.message : String(error) });
    console.log(`[fail] ${item.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log("");
console.log("== v2.3.0 VLM opt-in operational evidence summary ==");
console.log(`- schema: ${payload.schema}`);
console.log(`- targetStep: ${payload.targetStep}`);
console.log(`- branch: ${payload.branch}`);
console.log(`- head: ${payload.head}`);
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);

if (reportPath) writeText(reportPath, renderMarkdown(payload));
if (jsonReportPath) writeText(jsonReportPath, `${JSON.stringify(payload, null, 2)}\n`);
if (fail > 0) process.exit(1);

function buildPayload() {
  return {
    schema: "media-server.v230-vlm-opt-in-operational-evidence.v1",
    generatedAt: new Date().toISOString(),
    status: "pass",
    targetStep: "V230-S05",
    activeRoadmap: null, // targetStep은 기존 출력 호환 식별자이며 현행 로드맵 완료 주장이 아니다.
    branch,
    head,
    checks: [],
    runtimeEvidence: {},
    executions: [],
    completionBoundary: {
      primary: "Unify VLM default-off profile promotion, local loopback smoke intake, default no-provider-call cloud field gate, and privacy/redaction guard as operational evidence.",
      excluded: [
        "No VLM default-on, real cloud provider call, provider credential storage, model/runtime bundle, production model quality claim, sidecar write, 30 minute soak, 120 minute longrun, UI fulltest, push, PR, tag, or GitHub Release is executed by this verifier.",
        "No EventRecord, Event POST, WebRTC DataChannel, SSE/WS metadata, Auth/session/scope, Rule/Profile payload, or RTSP/WebRTC media path schema is changed.",
      ],
    },
    tokenUsage: {
      tokenStart: "미집계",
      tokenEnd: "미집계",
      tokenConsumed: "미집계",
      elapsed: "command output 기준",
      source: "이 검증기는 모델 토큰 계측 기능이 없음",
    },
  };
}

function renderMarkdown(report) {
  const lines = [
    "# VLM opt-in·정보 비노출 검사 결과",
    "",
    `- schema: ${report.schema}`,
    `- generatedAt: ${report.generatedAt}`,
    `- status: ${report.status}`,
    `- targetStep: ${report.targetStep}`,
    `- branch: ${report.branch}`,
    `- head: ${report.head}`,
    "",
    "## 판정 범위",
    "",
    `- primary: ${report.completionBoundary.primary}`,
    ...report.completionBoundary.excluded.map(item => `- excluded: ${item}`),
    "",
    "## 하위 검사 결과",
    "",
    `- runtimeOptInContract: ${report.runtimeEvidence.runtimeOptInContract?.status || "not-run"}`,
    `- localRuntimeSmoke: ${report.runtimeEvidence.localRuntimeSmoke?.status || "not-run"}`,
    `- cloudProviderGate: ${report.runtimeEvidence.cloudProviderGate?.status || "not-run"}`,
    `- privacyTransferGuard: ${report.runtimeEvidence.privacyTransferGuard?.status || "not-run"}`,
    "",
    "## 개별 검사",
    "",
    "| Check | Status |",
    "| --- | --- |",
    ...report.checks.map(item => `| ${escapePipe(item.name)} | ${item.status} |`),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

function check(name, fn) {
  checks.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// 하위 stdout/stderr·exit와 보고서를 같은 결과 안에 보존한다. 임시 경로는 증거 링크가 아니다.
function runNodeScript(file, scriptArgs = []) {
  const result = spawnSync(process.execPath, [path.join(scriptDir, file), ...scriptArgs], {
    cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  });
  const execution = {script: file, exit: result.status, signal: result.signal,
    stdout: result.stdout || "", stderr: result.stderr || ""};
  payload.executions.push(execution);
  if (result.error || result.status !== 0) throw new Error("VLM child command failed: " + file);
  return execution.stdout;
}

function withReportEvidence(key, file, validate) {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "media-server-vlm-evidence-"));
  const jsonReport = path.join(workDir, "report.json");
  const evidence = payload.runtimeEvidence[key] = {
    status: "fail", jsonReport: null, report: null, execution: null, cleanup: {status: "pending"},
  };
  let failure = null;
  try {
    let output = "", childError = null;
    try { output = runNodeScript(file, ["--json-report", jsonReport]); }
    catch (error) { childError = error; }
    evidence.execution = payload.executions.at(-1);
    if (fs.existsSync(jsonReport)) {
      try { evidence.report = JSON.parse(readFile(jsonReport)); }
      catch { throw new Error("VLM child report invalid"); }
    }
    if (childError) throw childError;
    assert(evidence.report, "VLM child report missing");
    validate(evidence, evidence.report, output);
    evidence.status = "pass";
  } catch (error) {
    failure = error;
    evidence.failureReason = error.message;
  } finally {
    try {
      if (fs.existsSync(jsonReport)) fs.unlinkSync(jsonReport);
      fs.rmdirSync(workDir);
      evidence.cleanup = {status: "complete"};
    } catch (error) {
      const allowedCodes = ["EACCES", "EPERM", "ENOENT", "ENOTEMPTY", "EBUSY", "EIO", "ENOTDIR", "EISDIR"];
      evidence.cleanup = {status: "fail", reason: "owned temporary report cleanup failed",
        remainingPath: workDir, errorCode: allowedCodes.includes(error.code) ? error.code : "unknown"};
      failure ||= new Error(evidence.cleanup.reason);
    }
  }
  if (failure) { evidence.status = "fail"; throw failure; }
}

function runText(command, commandArgs, options = {}) {
  try {
    return execFileSync(command, commandArgs, {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    if (options.optional) return "";
    throw error;
  }
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function readFile(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function writeText(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, "utf8");
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const raw = token.slice(2);
    const eq = raw.indexOf("=");
    if (eq >= 0) {
      parsed[toCamel(raw.slice(0, eq))] = raw.slice(eq + 1);
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      parsed[toCamel(raw)] = next;
      index += 1;
    } else {
      parsed[toCamel(raw)] = "1";
    }
  }
  return parsed;
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_match, chr) => chr.toUpperCase());
}

function escapePipe(value) {
  return String(value).replace(/\|/g, "\\|");
}

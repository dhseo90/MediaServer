#!/usr/bin/env node
// 파일 용도: v2.3.0 VLM opt-in operational evidence gate와 산출물 경계를 검증한다.

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
  - v2.3.0 docs/backlog/release evidence/inventory separate VLM opt-in evidence from default-on/provider/model success
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
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "media-server-v230-vlm-local-"));
  const jsonReport = path.join(workDir, "local-runtime-smoke.json");
  const output = runNodeScript("verify_vlm_local_runtime_smoke.mjs", ["--json-report", jsonReport]);
  const report = JSON.parse(readFile(jsonReport));
  assert(output.includes("VLM local runtime smoke summary"), "local runtime smoke output missing summary");
  assert(report.schema === "media-server.vlm-local-runtime-smoke-report.v1", "local runtime smoke schema mismatch");
  assert(report.status === "pass", "local runtime smoke report must pass");
  assert(report.scope.actualLocalHttpRoundtrip === true, "local runtime smoke must execute loopback HTTP roundtrip");
  assert(report.scope.actualUserModelQualityChecked === false, "local runtime smoke must not claim user model quality");
  assert(report.scope.cloudProviderApiCalled === false, "local runtime smoke must not call cloud provider");
  assert(report.scope.sidecarWritten === false, "local runtime smoke must not write sidecar");
  assert(report.scope.eventOrMetadataSchemaChanged === false, "local runtime smoke must not change event/metadata schema");
  assert(report.scope.mediaPathChanged === false, "local runtime smoke must not change media path");
  assert(report.summary.connectedCases === 3, "local runtime smoke expected three connected fixture cases");
  assert(report.summary.missingRuntimeCases === 1, "local runtime smoke expected one missing-runtime fixture");
  assert(report.summary.timeoutCases === 1, "local runtime smoke expected one timeout fixture");
  assert(report.summary.invalidOutputCases === 1, "local runtime smoke expected one invalid-output fixture");
  payload.runtimeEvidence.localRuntimeSmoke = {
    status: "pass",
    command: "./server.sh verify-vlm-local-runtime-smoke",
    jsonReport,
    connectedCases: report.summary.connectedCases,
    missingRuntimeCases: report.summary.missingRuntimeCases,
    timeoutCases: report.summary.timeoutCases,
    invalidOutputCases: report.summary.invalidOutputCases,
  };
});

check("cloud provider gate records default not-run as not release eligible", () => {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "media-server-v230-vlm-cloud-"));
  const jsonReport = path.join(workDir, "cloud-provider-field-gate.json");
  const output = runNodeScript("verify_vlm_cloud_provider_field_smoke_gate.mjs", ["--json-report", jsonReport]);
  const report = JSON.parse(readFile(jsonReport));
  assert(output.includes("VLM cloud provider field smoke gate summary"), "cloud provider gate output missing summary");
  assert(report.schema === "media-server.vlm-cloud-provider-field-smoke-gate-report.v1", "cloud provider gate schema mismatch");
  assert(report.gateStatus === "pass", "cloud provider gate report must pass");
  assert(report.fieldSmoke.providerApiCalled === false, "default S05 gate must not call cloud provider");
  assert(report.fieldSmoke.status === "not-run", "default S05 cloud field smoke status must be not-run");
  assert(report.fieldSmoke.releasePassEligible === false, "default not-run cloud field smoke must not be release eligible");
  assert(report.redaction.credentialMaterialStored === false, "cloud gate report must not store credential material");
  assert(report.redaction.rawPromptStored === false, "cloud gate report must not store raw prompt");
  assert(report.redaction.rawProviderResponseStored === false, "cloud gate report must not store raw provider response");
  payload.runtimeEvidence.cloudProviderGate = {
    status: "pass",
    command: "./server.sh verify-vlm-cloud-provider-field-smoke-gate",
    jsonReport,
    fieldSmokeStatus: report.fieldSmoke.status,
    providerApiCalled: report.fieldSmoke.providerApiCalled,
    releasePassEligible: report.fieldSmoke.releasePassEligible,
  };
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

check("VLM public docs expose the current opt-in/default-off boundary", () => {
  const docs = [
    ["runtime contract", readText("docs/vlm-runtime-opt-in-contract.md")],
    ["local runtime smoke", readText("docs/vlm-local-runtime-connection-smoke.md")],
    ["cloud provider gate", readText("docs/vlm-cloud-provider-field-smoke-gate.md")],
    ["privacy guard", readText("docs/vlm-privacy-transfer-guard.md")],
  ];
  for (const [label, text] of docs) {
    for (const snippet of [
      "## 운영 증적 경계",
      "operator-approved profile promotion",
      "local/provider smoke intake",
      "privacy/default-off evidence",
      "no VLM default-on",
      "Sidecar는 EventRecord/API schema에 섞지",
      "Event POST/WebRTC DataChannel/SSE/WS metadata와 RTSP/WebRTC media path",
    ]) {
      assert(text.includes(snippet), `${label} doc missing VLM opt-in boundary snippet: ${snippet}`);
    }
  }
});

check("current public roadmap keeps VLM evidence within source/local boundaries", () => {
  const backlog = readText("docs/development-backlog.md");
  for (const snippet of [
    "현재 source roadmap: v2.5.0 Semantic Incident Memory",
    "GitHub Release와 tag는 취소되어 현재 공개 릴리즈가 아닙니다",
    "VLM default-off guard",
    "provider call evidence 아님",
    "UI 풀테스트 직접 조작은 별도",
    "30분 테스트",
    "120분 테스트",
    "verify-release-metadata --published",
  ]) {
    assert(backlog.includes(snippet), `backlog missing current VLM/source boundary snippet: ${snippet}`);
  }
  assert(!backlog.includes("### V230-S05 VLM opt-in operational evidence 종료 기준"),
    "public backlog must not expose archived V230-S05 evidence as current roadmap content");
});

check("release evidence index records S05 without promoting provider/model success", () => {
  const index = readText("docs/release-evidence-index.md");
  for (const snippet of [
    "v230-s05-vlm-opt-in-operational-evidence-20260605",
    "media-server.v230-vlm-opt-in-operational-evidence.v1",
    "verify-v230-vlm-opt-in-operational-evidence",
    "verify-vlm-runtime-opt-in-contract",
    "verify-vlm-local-runtime-smoke",
    "verify-vlm-cloud-provider-field-smoke-gate",
    "verify-vlm-privacy-transfer-guard",
    "Not run for `v230-s05-vlm-opt-in-operational-evidence-20260605`",
    "real cloud provider call",
    "VLM default-on",
    "model/runtime bundle",
    "Sidecar write",
  ]) {
    assert(index.includes(snippet), `release evidence index missing S05 snippet: ${snippet}`);
  }
});

check("feature inventory maps VLM opt-in evidence to existing rows and four test areas", () => {
  const inventory = readText("docs/project-feature-test-inventory.md");
  for (const snippet of [
    "verify-v230-vlm-opt-in-operational-evidence",
    "operator-approved profile promotion",
    "privacy/default-off evidence",
    "LAB-038",
    "LAB-042",
    "LAB-056",
    "LAB-057",
    "SAFE-025",
    "SAFE-027",
    "SAFE-029",
    "SAFE-034",
    "SAFE-035",
    "no runtime-call/sidecar/schema/media path boundary",
    "cloud/provider/model quality/UI/longrun PASS로 과장하지 않음",
    "provider call 미실행은 PASS가 아님",
  ]) {
    assert(inventory.includes(snippet), `project feature inventory missing S05 snippet: ${snippet}`);
  }
});

check("server entrypoint exposes the S05 VLM operational evidence verifier", () => {
  const server = readText("server.sh");
  assert(server.includes("verify-v230-vlm-opt-in-operational-evidence"),
    "server.sh missing verify-v230-vlm-opt-in-operational-evidence");
  assert(server.includes("verify_v230_vlm_opt_in_operational_evidence.mjs"),
    "server.sh missing v2.3.0 S05 verifier script dispatch");
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
    activeRoadmap: "v2.3.0 Operational Evidence & Contract Baseline",
    branch,
    head,
    checks: [],
    runtimeEvidence: {},
    completionBoundary: {
      primary: "Unify VLM default-off profile promotion, local loopback smoke intake, default no-provider-call cloud field gate, and privacy/redaction guard as operational evidence.",
      excluded: [
        "No VLM default-on, real cloud provider call, provider credential storage, model/runtime bundle, production model quality claim, sidecar write, 30 minute soak, 120 minute longrun, UI fulltest, push, PR, tag, or GitHub Release is executed by this verifier.",
        "No EventRecord, Event POST, WebRTC DataChannel, SSE/WS metadata, Auth/session/scope, Rule/Profile payload, or RTSP/WebRTC media path schema is changed.",
      ],
    },
    tokenUsage: {
      tokenStart: "295763",
      tokenEnd: "미집계",
      tokenConsumed: "미집계",
      elapsed: "command output 기준",
      source: "Codex goal usage snapshot at S05 start plus command output",
    },
  };
}

function renderMarkdown(report) {
  const lines = [
    "# v2.3.0 VLM Opt-in Operational Evidence Report",
    "",
    `- schema: ${report.schema}`,
    `- generatedAt: ${report.generatedAt}`,
    `- status: ${report.status}`,
    `- targetStep: ${report.targetStep}`,
    `- branch: ${report.branch}`,
    `- head: ${report.head}`,
    "",
    "## Completion Boundary",
    "",
    `- primary: ${report.completionBoundary.primary}`,
    ...report.completionBoundary.excluded.map(item => `- excluded: ${item}`),
    "",
    "## Runtime Evidence",
    "",
    `- runtimeOptInContract: ${report.runtimeEvidence.runtimeOptInContract?.status || "not-run"}`,
    `- localRuntimeSmoke: ${report.runtimeEvidence.localRuntimeSmoke?.status || "not-run"}`,
    `- cloudProviderGate: ${report.runtimeEvidence.cloudProviderGate?.status || "not-run"}`,
    `- privacyTransferGuard: ${report.runtimeEvidence.privacyTransferGuard?.status || "not-run"}`,
    "",
    "## Checks",
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

function runNodeScript(file, scriptArgs = []) {
  return execFileSync(process.execPath, [path.join(scriptDir, file), ...scriptArgs], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
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

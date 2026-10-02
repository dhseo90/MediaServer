#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: 현행 조건부 ONVIF/external TURN/WHEP 로컬 검사와 실제 실행 경계를 확인한다.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import { extractCppFunctionBlock } from "./source_block_assertion_utils.mjs";
import { validateFeatureDocumentation, hasDocumentLink } from "./documentation_contract_lib.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v2.3.0 conditional ONVIF/external TURN/WHEP field evidence verification

Usage:
  ./server.sh verify-v230-conditional-field-evidence [options]

Options:
  --report <path>       Markdown field evidence report를 저장합니다.
  --json-report <path>  JSON field evidence report를 저장합니다.
  -h, --help            도움말 출력

Checks:
  - existing ONVIF field smoke gate stays no-device/procedure-only by default
  - existing external TURN/WHEP gate stays no-network/not-run by default
  - current docs/inventory/dispatch separate local reports from real field and release PASS
  - no real ONVIF endpoint, TURN credential, WHEP endpoint, schema, or media path success is claimed
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

check("MEDIA-021 product connector boundary stays conditional and no-execution", () => {
  const productBlock = extractCppFunctionBlock(readWebRtcHttpServerBundle(readText), "std::string OpsV380FieldConnectorEvidencePackageJson(");
  assert(productBlock.includes("externalWhepContacted") && productBlock.includes("field-smoke-not-run") && productBlock.includes("rtspOrWebrtcMediaPathChanged"), "MEDIA-021 exact external TURN/WHEP product boundary missing");
});

check("ONVIF field smoke gate remains procedure-only without real device success", () => {
  const output = runNodeScript("verify_onvif_field_smoke_gate.mjs");
  assert(output.includes("ONVIF field smoke gate summary"), "ONVIF gate output missing summary");
  assert(output.includes("realDeviceEndpointSuccess: unverified unless field gate report proves pass"),
    "ONVIF gate must keep real device endpoint success unverified by default");
  payload.runtimeEvidence.onvifGate = {
    status: "pass",
    command: "./server.sh verify-onvif-field-smoke-gate",
    realDeviceEndpointSuccess: "unverified",
    defaultFieldPassClaim: false,
  };
});

check("external TURN/WHEP field gate remains no-network and not-run by default", () => {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "media-server-v230-field-evidence-"));
  const jsonReport = path.join(workDir, "external-turn-whep.json");
  const evidence = payload.runtimeEvidence.externalTurnWhepGate = {
    status: "fail", command: "./server.sh verify-external-turn-whep-field-gate",
    jsonReport: null, report: null, execution: null, cleanup: {status: "pending"},
  };
  let failure = null;
  try {
    let output = "", childError = null;
    try {
      evidence.execution = runNodeScript("verify_external_turn_whep_field_gate.mjs", ["--json-report", jsonReport], {capture: true});
      output = evidence.execution.stdout;
    } catch (error) {
      childError = error;
      evidence.execution = {exit: error.status ?? null, signal: error.signal ?? null,
        stdout: String(error.stdout || ""), stderr: String(error.stderr || "")};
    }
    // 자식 실패 보고서도 먼저 보존한다. 임시 경로를 지운 뒤 존재하는 증거인 것처럼 링크하지 않는다.
    if (fs.existsSync(jsonReport)) evidence.report = JSON.parse(readFile(jsonReport));
    assert(!childError, "external field child command failed");
    const report = evidence.report;
    assert(report, "external field child report missing");
    assert(report.schema === "media-server.external-turn-whep-field-gate-report.v1" && report.externalNetworkAttempted === false && report.whepPlaybackStatus === "not-run", "MEDIA-021 externalWhepContacted report boundary mismatch");
    assert(output.includes("External TURN/WHEP field gate summary"), "external gate output missing summary");
    assert(report.gateStatus === "pass", "external gate report failed despite child exit 0");
    assert(report.externalNetworkAttempted === false, "external gate must not contact network by default");
    assert(report.fieldSmokeStatus === "not-run", "default external field status must be not-run");
    assert(report.turnRelayStatus === "not-run", "default TURN relay status must be not-run");
    assert(report.whepPlaybackStatus === "not-run", "default WHEP playback status must be not-run");
    assert(report.defaultReleasePassClaimAllowed === false, "external field report must not claim release PASS");
    Object.assign(evidence, {status: "pass", externalNetworkAttempted: false,
      fieldSmokeStatus: report.fieldSmokeStatus, defaultReleasePassClaimAllowed: report.defaultReleasePassClaimAllowed});
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
});

check("current conditional documents, exact features, and dispatch are connected", () => {
  const onvif = readText("docs/onvif-field-smoke-gate.md");
  const external = readText("docs/external-turn-whep-field-gate.md");
  for (const [label, text] of [["onvif", onvif], ["external", external]]) {
    for (const identifier of ["media-server.v230-conditional-field-evidence.v1", "verify-v230-conditional-field-evidence"]) {
      assert(text.includes(identifier), label + " conditional definition missing: " + identifier);
    }
  }
  assert(hasDocumentLink(onvif, "external-turn-whep-field-gate.md"), "ONVIF conditional external link missing");
  assert(hasDocumentLink(external, "onvif-field-smoke-gate.md"), "external conditional ONVIF link missing");
  const errors = validateFeatureDocumentation({
    document: external, identifiers: ["SRC-014", "MEDIA-021", "SAFE-039"],
    command: "verify-v230-conditional-field-evidence", script: "verify_v230_conditional_field_evidence.mjs",
    featureIds: ["SRC-014", "MEDIA-021", "SAFE-039"],
    inventory: readText("docs/project-feature-test-inventory.md"), verification: readText("docs/stream-verification.md"),
    server: readText("server.sh"),
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
console.log("== v2.3.0 conditional field evidence summary ==");
console.log(`- schema: ${payload.schema}`);
console.log(`- targetStep: ${payload.targetStep}`);
console.log(`- branch: ${payload.branch}`);
console.log(`- head: ${payload.head}`);
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
console.log("- actual device/network/playback/UI not-run");

if (reportPath) writeText(reportPath, renderMarkdown(payload));
if (jsonReportPath) writeText(jsonReportPath, `${JSON.stringify(payload, null, 2)}\n`);
if (fail > 0) process.exit(1);

function buildPayload() {
  return {
    schema: "media-server.v230-conditional-field-evidence.v1",
    generatedAt: new Date().toISOString(),
    status: "pass",
    targetStep: "V230-S04",
    activeRoadmap: "v2.3.0 Operational Evidence & Contract Baseline",
    branch,
    head,
    checks: [],
    runtimeEvidence: {},
    completionBoundary: {
      primary: "Unify ONVIF and external TURN/WHEP field gates as conditional evidence that may be recorded only in approved environments with redacted reports.",
      excluded: [
        "No real ONVIF device probe success is claimed.",
        "No external TURN relay/auth or WHEP playback success is claimed.",
        "No Event POST, WebRTC DataChannel, SSE/WS metadata, Auth/session/scope, Rule/Profile payload, or RTSP/WebRTC media path schema is changed.",
      ],
    },
  };
}

function renderMarkdown(report) {
  const lines = [
    "# 조건부 현장 검증의 로컬 계약 검사 결과",
    "",
    `- schema: ${report.schema}`,
    `- generatedAt: ${report.generatedAt}`,
    `- status: ${report.status}`,
    `- targetStep: ${report.targetStep}`,
    `- branch: ${report.branch}`,
    `- head: ${report.head}`,
    "",
    "## 판정 경계",
    "",
    `- primary: ${report.completionBoundary.primary}`,
    ...report.completionBoundary.excluded.map(item => `- excluded: ${item}`),
    "",
    "## 하위 로컬 검사",
    "",
    `- onvifGate: ${report.runtimeEvidence.onvifGate?.status || "not-run"}`,
    `- externalTurnWhepGate: ${report.runtimeEvidence.externalTurnWhepGate?.status || "not-run"}`,
    "",
    "## 검사 결과",
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

function runNodeScript(file, scriptArgs = [], {capture = false} = {}) {
  if (capture) {
    const result = spawnSync(process.execPath, [path.join(scriptDir, file), ...scriptArgs], {
      cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    });
    const execution = {exit: result.status, signal: result.signal,
      stdout: result.stdout || "", stderr: result.stderr || ""};
    if (result.error || result.status !== 0) throw Object.assign(new Error("local field child command failed"), {
      status: result.status, signal: result.signal, stdout: execution.stdout, stderr: execution.stderr,
    });
    return execution;
  }
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

#!/usr/bin/env node
// 파일 용도: v2.3.0 조건부 ONVIF/external TURN/WHEP field evidence gate를 검증한다.

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
  - v2.3.0 docs/backlog/release evidence/inventory separate approved field reports from release PASS
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
  const output = runNodeScript("verify_external_turn_whep_field_gate.mjs", ["--json-report", jsonReport]);
  const report = JSON.parse(readFile(jsonReport));
  assert(output.includes("External TURN/WHEP field gate summary"), "external gate output missing summary");
  assert(report.externalNetworkAttempted === false, "external gate must not contact network by default");
  assert(report.fieldSmokeStatus === "not-run", "default external field status must be not-run");
  assert(report.turnRelayStatus === "not-run", "default TURN relay status must be not-run");
  assert(report.whepPlaybackStatus === "not-run", "default WHEP playback status must be not-run");
  assert(report.defaultReleasePassClaimAllowed === false, "external field report must not claim release PASS");
  payload.runtimeEvidence.externalTurnWhepGate = {
    status: "pass",
    command: "./server.sh verify-external-turn-whep-field-gate",
    jsonReport,
    externalNetworkAttempted: false,
    fieldSmokeStatus: report.fieldSmokeStatus,
    defaultReleasePassClaimAllowed: report.defaultReleasePassClaimAllowed,
  };
});

check("ONVIF and external field docs expose the v2.3.0 conditional evidence boundary", () => {
  const onvif = readText("docs/onvif-field-smoke-gate.md");
  const external = readText("docs/external-turn-whep-field-gate.md");
  for (const [label, text] of [["onvif", onvif], ["external", external]]) {
    for (const snippet of [
      "## v2.3.0 Conditional field evidence",
      "media-server.v230-conditional-field-evidence.v1",
      "approved environment only",
      "redacted field report",
      "not-run is not PASS",
      "default release PASS",
      "verify-v230-conditional-field-evidence",
    ]) {
      assert(text.includes(snippet), `${label} doc missing v2.3.0 conditional snippet: ${snippet}`);
    }
  }
});

check("roadmap records V230-S04 completion boundary and exclusions", () => {
  const backlog = readText("docs/development-backlog.md");
  assert(/\| 4 \| V230-S04 \| P1 \| 완료 \| 조건부 ONVIF\/external TURN\/WHEP evidence \|/.test(backlog),
    "backlog V230-S04 row must be 완료 after conditional field evidence gate closure");
  for (const snippet of [
    "### V230-S04 조건부 ONVIF/external TURN/WHEP evidence 종료 기준",
    "직접 답: S04 완료는 실장비 ONVIF 성공이나 external TURN/WHEP credential 성공이 아니라",
    "verify-v230-conditional-field-evidence",
    "verify-onvif-field-smoke-gate",
    "verify-external-turn-whep-field-gate",
    "approved environment only",
    "redacted field report",
    "not-run is not PASS",
    "real ONVIF device",
    "external WHEP/WHIP/TURN endpoint",
    "30분 테스트",
    "120분 테스트",
    "UI 풀테스트",
  ]) {
    assert(backlog.includes(snippet), `backlog missing S04 conditional snippet: ${snippet}`);
  }
});

check("release evidence index records S04 without promoting field success", () => {
  const index = readText("docs/release-evidence-index.md");
  for (const snippet of [
    "v230-s04-conditional-field-evidence-20260605",
    "media-server.v230-conditional-field-evidence.v1",
    "verify-v230-conditional-field-evidence",
    "verify-onvif-field-smoke-gate",
    "verify-external-turn-whep-field-gate",
    "Not run for `v230-s04-conditional-field-evidence-20260605`",
    "real ONVIF device",
    "external TURN/WHEP credential operation",
    "not-run is not PASS",
  ]) {
    assert(index.includes(snippet), `release evidence index missing S04 snippet: ${snippet}`);
  }
});

check("feature inventory maps conditional field evidence to existing rows", () => {
  const inventory = readText("docs/project-feature-test-inventory.md");
  for (const snippet of [
    "v2.3.0 S04 조건부 ONVIF/external TURN/WHEP evidence",
    "SRC-014",
    "MEDIA-021",
    "SAFE-039",
    "verify-v230-conditional-field-evidence",
    "approved environment only",
    "redacted field report",
    "not-run is not PASS",
    "실장비 ONVIF 성공과 external TURN/WHEP credential 성공을 기본 release PASS로 쓰지 않음",
  ]) {
    assert(inventory.includes(snippet), `project feature inventory missing S04 snippet: ${snippet}`);
  }
});

check("server entrypoint exposes the S04 conditional field verifier", () => {
  const server = readText("server.sh");
  assert(server.includes("verify-v230-conditional-field-evidence"),
    "server.sh missing verify-v230-conditional-field-evidence");
  assert(server.includes("verify_v230_conditional_field_evidence.mjs"),
    "server.sh missing v2.3.0 S04 verifier script dispatch");
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
    "# v2.3.0 Conditional Field Evidence Report",
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
    `- onvifGate: ${report.runtimeEvidence.onvifGate?.status || "not-run"}`,
    `- externalTurnWhepGate: ${report.runtimeEvidence.externalTurnWhepGate?.status || "not-run"}`,
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

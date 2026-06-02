#!/usr/bin/env node
// 파일 용도: v2.1.0 S10 external TURN/WHEP field gate 절차와 PASS 분리 기준을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`External TURN/WHEP field gate verification

Usage:
  ./server.sh verify-external-turn-whep-field-gate [options]

Options:
  --report <path>       Write a Markdown field gate report.
  --json-report <path>  Write a JSON field gate report.
  -h, --help            Show help.

Checks:
  - V210-S10 fixture separates not-run, blocked, failed, and passed field states.
  - External TURN/WHEP field success is never claimed as default release PASS.
  - Default verifier does not contact external TURN/WHEP endpoints.
  - Reports do not store TURN credential, raw TURN server, raw WHEP URL, raw ICE candidate, or source URL.
  - docs, feature inventory, server.sh, script inventory, and coverage wiring are present.
`);
}

assertKnownOptions(rawArgs, ["report", "json-report", "h", "help"]);

const args = parseArgs(rawArgs);
const fixturePath = "test/fixtures/external_turn_whep_field_gate/cases.json";
const fixture = readJson(fixturePath);
const report = {
  schema: "media-server.external-turn-whep-field-gate-report.v1",
  targetStep: "V210-S10",
  generatedAt: new Date().toISOString(),
  gateStatus: "pass",
  fixturePath,
  externalNetworkAttempted: false,
  defaultReleasePassClaimAllowed: false,
  fieldSmokeStatus: "not-run",
  turnRelayStatus: "not-run",
  whepPlaybackStatus: "not-run",
  fieldGatePassEligible: false,
  redaction: {
    credentialMaterialStored: false,
    rawTurnServerStored: false,
    rawWhepUrlStored: false,
    rawIceCandidateStored: false,
    sourceUrlStored: false,
    viewerClientExposureAdded: false,
  },
  summary: {
    fixtureCases: 0,
    fieldPassEligibleCases: 0,
    defaultReleasePassClaimAllowedCases: 0,
    notRunCases: 0,
    blockedCases: 0,
    failedCases: 0,
  },
  cases: [],
  checks: [],
};

const checks = [];

check("fixture covers required V210-S10 external TURN/WHEP field matrix", () => {
  assert(fixture.schema === "media-server.external-turn-whep-field-gate-fixtures.v1", "fixture schema mismatch");
  assert(fixture.targetStep === "V210-S10", "fixture targetStep mismatch");
  const ids = new Set((fixture.cases || []).map(item => item.id));
  for (const id of [
    "not-approved-not-run",
    "approved-missing-turn-credential-blocked",
    "approved-missing-whep-endpoint-blocked",
    "approved-turn-relay-fail-not-release-pass",
    "approved-whep-playback-fail-not-release-pass",
    "approved-turn-whep-pass-field-only",
  ]) {
    assert(ids.has(id), `missing external TURN/WHEP field gate case: ${id}`);
  }
});

check("fixture decisions separate field PASS from default release PASS", () => {
  const cases = fixture.cases.map(evaluateFixtureCase);
  report.cases = cases;
  report.summary.fixtureCases = cases.length;
  report.summary.fieldPassEligibleCases = cases.filter(item => item.fieldGatePassEligible).length;
  report.summary.defaultReleasePassClaimAllowedCases = cases.filter(item => item.defaultReleasePassClaimAllowed).length;
  report.summary.notRunCases = cases.filter(item => item.fieldSmokeStatus === "not-run").length;
  report.summary.blockedCases = cases.filter(item => item.fieldSmokeStatus === "blocked").length;
  report.summary.failedCases = cases.filter(item => item.fieldSmokeStatus === "failed").length;

  for (const item of cases) {
    assert(item.status === "pass", `${item.id}: fixture expectation mismatch`);
    assert(item.defaultReleasePassClaimAllowed === false, `${item.id}: default release PASS claim must be false`);
    if (item.fieldSmokeStatus !== "passed") {
      assert(item.fieldGatePassEligible === false, `${item.id}: non-passed field smoke must not be field eligible`);
    }
  }
  assert(report.summary.fieldPassEligibleCases === 1, "exactly one fixture case should be field pass eligible");
  assert(report.summary.defaultReleasePassClaimAllowedCases === 0, "no fixture case may claim default release PASS");
  assert(report.summary.notRunCases === 1, "expected one not-run fixture case");
  assert(report.summary.blockedCases === 2, "expected two blocked fixture cases");
  assert(report.summary.failedCases === 2, "expected two failed fixture cases");
});

check("default execution remains no-network and sanitized", () => {
  assert(report.externalNetworkAttempted === false, "default gate must not contact external endpoints");
  assert(report.defaultReleasePassClaimAllowed === false, "default report must not claim release PASS");
  assert(report.fieldSmokeStatus === "not-run", "default field smoke status must be not-run");
  assert(report.turnRelayStatus === "not-run", "default TURN relay status must be not-run");
  assert(report.whepPlaybackStatus === "not-run", "default WHEP playback status must be not-run");
  assert(Object.values(report.redaction).every(value => value === false), "default redaction flags must all be false");
  assertReportRedacted(report);
});

check("docs, feature inventory, server command, and coverage are wired", () => {
  const docs = [
    readText("docs/external-turn-whep-field-gate.md"),
    readText("docs/development-backlog.md"),
    readText("docs/stream-verification.md"),
    readText("docs/project-feature-test-inventory.md"),
    readText("docs/README.md"),
  ].join("\n");
  const serverSh = readText("server.sh");
  const scriptInventory = readText("scripts/internal/verify_script_inventory.mjs");
  const coverage = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
  const webrtcIce = readText("scripts/internal/verify_webrtc_ice_config.sh");
  for (const snippet of [
    "V210-S10",
    "External TURN/WHEP field gate",
    "media-server.external-turn-whep-field-gate-fixtures.v1",
    "media-server.external-turn-whep-field-gate-report.v1",
    "verify-external-turn-whep-field-gate",
    "approved-turn-relay-fail-not-release-pass",
    "approved-whep-playback-fail-not-release-pass",
    "approved-turn-whep-pass-field-only",
    "MEDIA-021",
    "SAFE-039",
  ]) {
    assert(docs.includes(snippet), `docs missing external TURN/WHEP field gate snippet: ${snippet}`);
  }
  for (const snippet of [
    "verify-external-turn-whep-field-gate",
    "verify_external_turn_whep_field_gate.mjs",
  ]) {
    assert(serverSh.includes(snippet), `server.sh missing external TURN/WHEP snippet: ${snippet}`);
  }
  assert(scriptInventory.includes("verify_external_turn_whep_field_gate.mjs"), "script inventory missing external TURN/WHEP verifier");
  assert(coverage.includes("verify-external-turn-whep-field-gate"), "feature inventory coverage missing external TURN/WHEP verifier");
  assert(webrtcIce.includes("verify-external-turn-whep-field-gate"), "WebRTC ICE verifier help/hints missing external field gate boundary");
});

let failCount = 0;
for (const item of checks) {
  try {
    item.fn();
    report.checks.push({ name: item.name, status: "pass" });
    console.log(`[pass] ${item.name}`);
  } catch (error) {
    failCount += 1;
    report.gateStatus = "fail";
    const message = error instanceof Error ? error.message : String(error);
    report.checks.push({ name: item.name, status: "fail", message });
    console.log(`[fail] ${item.name}: ${message}`);
  }
}

console.log("");
console.log("== External TURN/WHEP field gate summary ==");
console.log(`- schema: ${report.schema}`);
console.log(`- gateStatus: ${report.gateStatus}`);
console.log(`- externalNetworkAttempted: ${report.externalNetworkAttempted}`);
console.log(`- fieldSmokeStatus: ${report.fieldSmokeStatus}`);
console.log(`- turnRelayStatus: ${report.turnRelayStatus}`);
console.log(`- whepPlaybackStatus: ${report.whepPlaybackStatus}`);
console.log(`- fieldGatePassEligible: ${report.fieldGatePassEligible}`);
console.log(`- defaultReleasePassClaimAllowed: ${report.defaultReleasePassClaimAllowed}`);
console.log(`- pass: ${report.checks.filter(item => item.status === "pass").length}`);
console.log(`- fail: ${failCount}`);

if (args.report) writeText(path.resolve(rootDir, args.report), renderMarkdown(report));
if (args.jsonReport) writeText(path.resolve(rootDir, args.jsonReport), `${JSON.stringify(report, null, 2)}\n`);
if (failCount > 0) process.exit(1);

function evaluateFixtureCase(item) {
  const turnRelayStatus = evaluateTurnStatus(item);
  const whepPlaybackStatus = evaluateWhepStatus(item);
  let fieldSmokeStatus = "not-run";
  if (turnRelayStatus === "missing-credential" || whepPlaybackStatus === "missing-endpoint") {
    fieldSmokeStatus = "blocked";
  } else if (turnRelayStatus === "failed" || whepPlaybackStatus === "failed") {
    fieldSmokeStatus = "failed";
  } else if (turnRelayStatus === "passed" && whepPlaybackStatus === "passed") {
    fieldSmokeStatus = "passed";
  }
  const redactionOk = Object.values(item.redaction || {}).every(value => value === false);
  const fieldGatePassEligible = fieldSmokeStatus === "passed" && redactionOk;
  const defaultReleasePassClaimAllowed = false;
  const status =
    item.expected?.fieldSmokeStatus === fieldSmokeStatus &&
    item.expected?.turnRelayStatus === turnRelayStatus &&
    item.expected?.whepPlaybackStatus === whepPlaybackStatus &&
    item.expected?.fieldGatePassEligible === fieldGatePassEligible &&
    item.expected?.defaultReleasePassClaimAllowed === defaultReleasePassClaimAllowed
      ? "pass"
      : "fail";
  return {
    id: item.id,
    status,
    fieldSmokeStatus,
    turnRelayStatus,
    whepPlaybackStatus,
    fieldGatePassEligible,
    defaultReleasePassClaimAllowed,
  };
}

function evaluateTurnStatus(item) {
  if (!item.manualApproval) return "not-run";
  if (!item.turnCredentialPresent) return "missing-credential";
  if (item.turnOutcome === "pass") return "passed";
  if (item.turnOutcome === "fail") return "failed";
  return "not-run";
}

function evaluateWhepStatus(item) {
  if (!item.manualApproval) return "not-run";
  if (!item.whepEndpointPresent) return "missing-endpoint";
  if (item.whepOutcome === "pass") return "passed";
  if (item.whepOutcome === "fail") return "failed";
  return "not-run";
}

function renderMarkdown(payload) {
  const lines = [
    "# External TURN/WHEP Field Gate Report",
    "",
    `- schema: ${payload.schema}`,
    `- targetStep: ${payload.targetStep}`,
    `- generatedAt: ${payload.generatedAt}`,
    `- gateStatus: ${payload.gateStatus}`,
    `- externalNetworkAttempted: ${payload.externalNetworkAttempted}`,
    `- fieldSmokeStatus: ${payload.fieldSmokeStatus}`,
    `- turnRelayStatus: ${payload.turnRelayStatus}`,
    `- whepPlaybackStatus: ${payload.whepPlaybackStatus}`,
    `- fieldGatePassEligible: ${payload.fieldGatePassEligible}`,
    `- defaultReleasePassClaimAllowed: ${payload.defaultReleasePassClaimAllowed}`,
    "",
    "## Fixture Cases",
    "",
    "| case | fieldSmokeStatus | TURN | WHEP | fieldEligible | defaultReleasePASS | status |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];
  for (const item of payload.cases) {
    lines.push(`| ${cell(item.id)} | ${item.fieldSmokeStatus} | ${item.turnRelayStatus} | ${item.whepPlaybackStatus} | ${item.fieldGatePassEligible} | ${item.defaultReleasePassClaimAllowed} | ${item.status} |`);
  }
  lines.push("", "## Checks", "", "| check | status | message |", "| --- | --- | --- |");
  for (const checkItem of payload.checks) {
    lines.push(`| ${cell(checkItem.name)} | ${checkItem.status} | ${cell(checkItem.message || "")} |`);
  }
  return `${lines.join("\n")}\n`;
}

function assertReportRedacted(payload) {
  const text = JSON.stringify(payload);
  for (const forbidden of [
    "turn://",
    "turns://",
    "whep://",
    "/whep?",
    "Authorization:",
    "Cookie:",
    "candidate:",
    "typ relay",
    "username:",
    "password:",
  ]) {
    assert(!text.includes(forbidden), `report leaked forbidden literal: ${forbidden}`);
  }
}

function parseArgs(argsList) {
  const parsed = {};
  for (let index = 0; index < argsList.length; index += 1) {
    const token = argsList[index];
    if (token.startsWith("--report=")) parsed.report = token.slice("--report=".length);
    else if (token === "--report") parsed.report = argsList[++index];
    else if (token.startsWith("--json-report=")) parsed.jsonReport = token.slice("--json-report=".length);
    else if (token === "--json-report") parsed.jsonReport = argsList[++index];
  }
  return parsed;
}

function check(name, fn) {
  checks.push({ name, fn });
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function writeText(outputPath, content) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, content, "utf8");
}

function cell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\s+/g, " ").trim() || "-";
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

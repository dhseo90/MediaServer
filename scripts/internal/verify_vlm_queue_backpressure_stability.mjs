#!/usr/bin/env node
// 파일 용도: V210-S04 VLM queue/backpressure 안정화 fixture와 side-effect 경계를 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`VLM queue/backpressure stability verification

Usage:
  ./server.sh verify-vlm-queue-backpressure-stability [options]

Options:
  --report <path>       Markdown report를 저장합니다.
  --json-report <path>  JSON report를 저장합니다.
  -h, --help            도움말 출력

Checks:
  - V210-S04 fixture가 default-off, missing-model, timeout, invalid-output, metadata fanout, Event POST dispatch case를 포함
  - 모든 case가 VLM-only outcome으로 처리되고 RTSP/WebRTC media, EventRecord, metadata fanout, Event POST dispatch를 block하지 않음
  - Event POST/WebRTC/SSE/WS payload/schema와 viewer/client exposure side effect가 모두 false로 유지됨
  - docs, feature inventory, stream verification, server.sh, script inventory 연결을 확인
`);
}

assertKnownOptions(rawArgs, ["report", "json-report", "h", "help"]);

const args = parseArgs(rawArgs);
const fixturePath = "test/fixtures/vlm_queue_backpressure/cases.json";
const fixture = readJson(fixturePath);
const report = {
  schema: "media-server.vlm-queue-backpressure-stability-report.v1",
  targetStep: "V210-S04",
  generatedAt: new Date().toISOString(),
  status: "pass",
  fixturePath,
  summary: {
    cases: 0,
    nonblockingCases: 0,
    metadataFanoutCases: 0,
    eventPostCases: 0,
  },
  cases: [],
  checks: [],
};
const checks = [];

check("fixture covers V210-S04 queue/backpressure matrix", () => {
  assert(fixture.schema === "media-server.vlm-queue-backpressure-fixtures.v1", "fixture schema mismatch");
  assert(fixture.targetStep === "V210-S04", "fixture targetStep mismatch");
  assert(Array.isArray(fixture.cases) && fixture.cases.length >= 6, "fixture needs at least 6 S04 cases");
  const ids = new Set(fixture.cases.map(item => item.id));
  for (const id of [
    "default-off-no-worker",
    "missing-model-nonblocking",
    "queue-timeout-drop-vlm-only",
    "invalid-output-rejected-no-sidecar",
    "metadata-fanout-independent",
    "event-post-dispatch-independent",
  ]) {
    assert(ids.has(id), `fixture missing case: ${id}`);
  }
});

check("queue outcomes stay VLM-only and non-blocking", () => {
  const cases = fixture.cases.map(evaluateCase);
  report.cases = cases;
  report.summary.cases = cases.length;
  report.summary.nonblockingCases = cases.filter(item => item.nonblocking === true).length;
  report.summary.metadataFanoutCases = cases.filter(item => item.kind === "metadata-fanout").length;
  report.summary.eventPostCases = cases.filter(item => item.kind === "event-post-dispatch").length;

  for (const item of cases) {
    assert(item.status === "pass", `${item.id}: expected pass status`);
    assert(item.outcome === item.expectedOutcome, `${item.id}: outcome mismatch ${item.outcome}`);
    assert(item.sideEffects.length === 0, `${item.id}: side effects found ${item.sideEffects.join(", ")}`);
    assert(item.nonblocking === true, `${item.id}: nonblocking verdict missing`);
  }

  const timeout = cases.find(item => item.id === "queue-timeout-drop-vlm-only");
  assert(timeout?.outcome === "timeout-no-media-path-failure", "timeout must stay media-path independent");
  assert(timeout?.queueAction === "drop-vlm-task", "timeout must drop VLM task only");
});

check("metadata fanout and Event POST dispatch remain independent", () => {
  const fanout = evaluateCase(caseById("metadata-fanout-independent"));
  assert(fanout.outcome === "metadata-fanout-independent", "metadata fanout outcome mismatch");
  assert(fanout.blockedPaths.length === 0, "metadata fanout should not have blocked paths");
  const dispatch = evaluateCase(caseById("event-post-dispatch-independent"));
  assert(dispatch.outcome === "event-post-dispatch-independent", "event POST dispatch outcome mismatch");
  assert(dispatch.blockedPaths.length === 0, "event dispatch should not have blocked paths");
});

check("required companion verifier list is explicit", () => {
  const commands = new Set(fixture.requiredCommands || []);
  for (const command of [
    "./server.sh build",
    "./server.sh verify-vlm-queue-backpressure-stability",
    "./server.sh verify-va-events",
    "./server.sh verify-event-post",
    "./server.sh verify-webrtc-va-metadata",
    "./server.sh verify-va-metadata-sidechannel",
    "./server.sh verify-ws-metadata",
    "git diff --check",
  ]) {
    assert(commands.has(command), `fixture missing required command: ${command}`);
  }
});

check("docs, inventory, server command, and script inventory are wired", () => {
  const docs = [
    readText("docs/vlm-queue-backpressure-stability.md"),
    readText("docs/development-backlog.md"),
    readText("docs/stream-verification.md"),
    readText("docs/project-feature-test-inventory.md"),
    readText("docs/README.md"),
  ].join("\n");
  const serverSh = readText("server.sh");
  const scriptInventory = readText("scripts/internal/verify_script_inventory.mjs");
  const coverage = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
  for (const snippet of [
    "V210-S04",
    "media-server.vlm-queue-backpressure-fixtures.v1",
    "media-server.vlm-queue-backpressure-stability-report.v1",
    "verify-vlm-queue-backpressure-stability",
    "metadata fanout",
    "Event POST dispatch",
    "timeout-no-media-path-failure",
    "30분 soak",
  ]) {
    assert(docs.includes(snippet), `docs missing S04 snippet: ${snippet}`);
  }
  assert(serverSh.includes("verify-vlm-queue-backpressure-stability"), "server.sh missing S04 command");
  assert(serverSh.includes("verify_vlm_queue_backpressure_stability.mjs"), "server.sh missing S04 script dispatch");
  assert(scriptInventory.includes("verify_vlm_queue_backpressure_stability.mjs"), "script inventory missing S04 verifier");
  assert(coverage.includes("verify-vlm-queue-backpressure-stability"), "feature coverage map missing S04 verifier");
});

check("S04 verifier scope does not claim UI, provider, or longrun PASS", () => {
  const doc = readText("docs/vlm-queue-backpressure-stability.md");
  for (const phrase of [
    "UI 풀테스트 PASS입니다",
    "30분 안정화 PASS입니다",
    "120분 장시간 PASS입니다",
    "cloud provider field smoke PASS입니다",
  ]) {
    assert(!doc.includes(phrase), `doc overclaims: ${phrase}`);
  }
  for (const phrase of [
    "실제 VLM runtime/provider 호출은 수행하지 않습니다",
    "30분 soak는 runtime path나 queue/backpressure 제품 경로 변경이 있을 때만 실행합니다",
    "브라우저 UI 직접 확인 evidence가 아닙니다",
  ]) {
    assert(doc.includes(phrase), `doc missing non-substitute wording: ${phrase}`);
  }
});

let failCount = 0;
for (const item of checks) {
  try {
    item.run();
    report.checks.push({ name: item.name, status: "pass" });
    console.log(`[pass] ${item.name}`);
  } catch (error) {
    failCount += 1;
    report.status = "fail";
    const message = error instanceof Error ? error.message : String(error);
    report.checks.push({ name: item.name, status: "fail", message });
    console.log(`[fail] ${item.name}: ${message}`);
  }
}

console.log("");
console.log("== VLM queue/backpressure stability summary ==");
console.log(`- schema: ${report.schema}`);
console.log(`- cases: ${report.summary.cases}`);
console.log(`- nonblockingCases: ${report.summary.nonblockingCases}`);
console.log(`- metadataFanoutCases: ${report.summary.metadataFanoutCases}`);
console.log(`- eventPostCases: ${report.summary.eventPostCases}`);
console.log(`- pass: ${report.checks.filter(item => item.status === "pass").length}`);
console.log(`- fail: ${failCount}`);

if (args.report) writeText(path.resolve(rootDir, args.report), renderMarkdown(report));
if (args.jsonReport) writeText(path.resolve(rootDir, args.jsonReport), `${JSON.stringify(report, null, 2)}\n`);
if (failCount > 0) process.exit(1);

function evaluateCase(item) {
  assert(item.expected?.status, `${item.id}: expected status missing`);
  const sideEffects = Object.entries(item.contractInvariants || {})
    .filter(([, value]) => value !== false)
    .map(([key]) => key);
  const blockedPaths = Object.entries({
    mediaPathBlocked: item.contractInvariants?.mediaPathBlocked,
    eventRecordBlocked: item.contractInvariants?.eventRecordBlocked,
    metadataFanoutBlocked: item.contractInvariants?.metadataFanoutBlocked,
    eventPostDispatchBlocked: item.contractInvariants?.eventPostDispatchBlocked,
  })
    .filter(([, value]) => value === true)
    .map(([key]) => key);
  const outcome = deriveOutcome(item);
  return {
    id: item.id,
    kind: item.kind,
    status: outcome === item.expected.outcome && sideEffects.length === 0 && blockedPaths.length === 0
      ? item.expected.status
      : "fail",
    outcome,
    expectedOutcome: item.expected.outcome,
    queueAction: item.expected.queueAction,
    failureReason: item.expected.failureReason,
    nonblocking: blockedPaths.length === 0 && sideEffects.length === 0,
    blockedPaths,
    sideEffects,
  };
}

function deriveOutcome(item) {
  if (item.input?.runtimeContractStatus === "disabled" && item.input?.queueState === "not-started") {
    return "default-off-no-queue-start";
  }
  if (item.input?.modelAvailable === false || item.input?.runtimeContractStatus === "missing-model") {
    return "blocked-missing-model-nonblocking";
  }
  if (item.input?.capturedOutputKind === "invalid-json" || item.input?.runtimeContractStatus === "invalid-output") {
    return "rejected-invalid-output-nonblocking";
  }
  if (item.kind === "metadata-fanout") return "metadata-fanout-independent";
  if (item.kind === "event-post-dispatch") return "event-post-dispatch-independent";
  if ((item.input?.queueWaitMs || 0) > (item.input?.queueTimeoutMs || 0) ||
      item.input?.runtimeContractStatus === "timeout") {
    return "timeout-no-media-path-failure";
  }
  return "vlm-queue-stable";
}

function caseById(id) {
  const found = fixture.cases.find(item => item.id === id);
  assert(found, `missing fixture case: ${id}`);
  return found;
}

function check(name, run) {
  checks.push({ name, run });
}

function parseArgs(argv) {
  const parsed = { report: "", jsonReport: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--report") parsed.report = requireValue(argv, index += 1, token);
    else if (token.startsWith("--report=")) parsed.report = token.slice("--report=".length);
    else if (token === "--json-report") parsed.jsonReport = requireValue(argv, index += 1, token);
    else if (token.startsWith("--json-report=")) parsed.jsonReport = token.slice("--json-report=".length);
  }
  return parsed;
}

function requireValue(argv, index, option) {
  const value = argv[index];
  assert(value && !value.startsWith("-"), `${option} requires a value`);
  return value;
}

function renderMarkdown(payload) {
  const lines = [
    "# VLM Queue/Backpressure Stability Report",
    "",
    `schema: \`${payload.schema}\``,
    `targetStep: \`${payload.targetStep}\``,
    `status: \`${payload.status}\``,
    "",
    "| Case | Kind | Outcome | Queue action | Failure reason | Non-blocking |",
    "| --- | --- | --- | --- | --- | --- |",
  ];
  for (const item of payload.cases) {
    lines.push(`| \`${item.id}\` | ${item.kind} | ${item.outcome} | ${item.queueAction} | ${item.failureReason} | ${item.nonblocking ? "yes" : "no"} |`);
  }
  lines.push("");
  lines.push("This report is S04 queue/backpressure fixture evidence only. It is not 30-minute soak, 120-minute longrun, provider field smoke, or manual UI fulltest PASS evidence.");
  return `${lines.join("\n")}\n`;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function writeText(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

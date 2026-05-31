#!/usr/bin/env node
// 파일 용도: V200-S15 VLM 간이 테스트 리허설 fixture와 side-effect 없는 사전 gate를 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`VLM short test rehearsal verification

Usage:
  ./server.sh verify-vlm-test-rehearsal [options]

Options:
  --report <path>       Markdown rehearsal report를 저장합니다.
  --json-report <path>  JSON rehearsal report를 저장합니다.
  -h, --help            도움말 출력

Checks:
  - V200-S15 fixture가 short smoke, missing-model, cloud-disabled, invalid-output, queue-timeout, cleanup, port/server lifecycle case를 포함
  - failure fixture가 VLM-only outcome으로 처리되고 Event/WebRTC/SSE/WS/media path side effect를 만들지 않음
  - cleanup과 isolated port/server lifecycle 기준을 리허설 report에 분리
  - docs, stream verification, roadmap, server command, script inventory 연결을 확인
`);
}

assertKnownOptions(rawArgs, ["report", "json-report", "h", "help"]);

const args = parseArgs(rawArgs);
const fixturePath = "test/fixtures/vlm_test_rehearsal/cases.json";
const fixture = readJson(fixturePath);
const report = {
  schema: "media-server.vlm-test-rehearsal-report.v1",
  targetStep: "V200-S15",
  generatedAt: new Date().toISOString(),
  status: "pass",
  fixturePath,
  summary: {
    cases: 0,
    failureFixtures: 0,
    cleanupCases: 0,
    lifecycleCases: 0,
  },
  cases: [],
  checks: [],
};
const checks = [];

check("fixture covers V200-S15 short rehearsal matrix", () => {
  assert(fixture.schema === "media-server.vlm-test-rehearsal-fixtures.v1", "fixture schema mismatch");
  assert(fixture.targetStep === "V200-S15", "fixture targetStep mismatch");
  assert(Array.isArray(fixture.cases) && fixture.cases.length >= 7, "fixture needs at least 7 rehearsal cases");
  const ids = new Set(fixture.cases.map(item => item.id));
  for (const id of [
    "short-vlm-smoke",
    "missing-model",
    "cloud-disabled",
    "invalid-output",
    "queue-timeout",
    "cleanup-lifecycle",
    "port-server-lifecycle",
  ]) {
    assert(ids.has(id), `fixture missing case: ${id}`);
  }
});

check("rehearsal outcomes are deterministic and VLM-only", () => {
  const cases = fixture.cases.map(evaluateCase);
  report.cases = cases;
  report.summary.cases = cases.length;
  report.summary.failureFixtures = cases.filter(item => item.kind === "failure-fixture").length;
  report.summary.cleanupCases = cases.filter(item => item.cleanupRequired).length;
  report.summary.lifecycleCases = cases.filter(item => item.serverLifecycle !== "not-started" || item.portLifecycle !== "not-bound").length;

  for (const item of cases) {
    assert(item.status === "pass", `${item.id}: expected pass status`);
    assert(item.outcome === item.expectedOutcome, `${item.id}: outcome mismatch ${item.outcome}`);
    assert(item.sideEffects.length === 0, `${item.id}: side effects found ${item.sideEffects.join(", ")}`);
  }

  const timeout = cases.find(item => item.id === "queue-timeout");
  assert(timeout?.outcome === "timeout-no-media-path-failure", "queue timeout must stay media-path independent");
  assert(timeout?.verdictNotes.includes("queue timeout recorded without DataChannel/media failure"), "timeout note missing");
});

check("cleanup and port/server lifecycle are explicit but not longrun/UI substitutes", () => {
  const cleanup = evaluateCase(caseById("cleanup-lifecycle"));
  assert(cleanup.cleanupRequired === true, "cleanup case must require cleanup");
  assert(cleanup.cleanupState === "cleanup-ok", "cleanup case must pass cleanup");
  const lifecycle = evaluateCase(caseById("port-server-lifecycle"));
  assert(lifecycle.serverLifecycle === "throwaway-required-for-attached-smoke", "server lifecycle wording mismatch");
  assert(lifecycle.portLifecycle === "explicit-isolated-port-required", "port lifecycle wording mismatch");
  assert(lifecycle.verdictNotes.includes("static rehearsal does not bind ports"), "lifecycle must state no port bind");
});

check("docs, stream verification, roadmap, server command, and script inventory are wired", () => {
  const docs = [
    readText("docs/vlm-test-rehearsal.md"),
    readText("docs/README.md"),
    readText("docs/stream-verification.md"),
    readText("docs/development-backlog.md"),
    readText("docs/project-feature-test-inventory.md"),
  ].join("\n");
  const server = readText("server.sh");
  const scriptInventory = readText("scripts/internal/verify_script_inventory.mjs");
  for (const snippet of [
    "V200-S15",
    "media-server.vlm-test-rehearsal-fixtures.v1",
    "media-server.vlm-test-rehearsal-report.v1",
    "verify-vlm-test-rehearsal",
    "missing-model",
    "cloud-disabled",
    "invalid-output",
    "queue-timeout",
    "cleanup",
    "port/server lifecycle",
  ]) {
    assert(docs.includes(snippet), `docs missing snippet: ${snippet}`);
  }
  assert(server.includes("verify-vlm-test-rehearsal"), "server.sh missing command");
  assert(server.includes("verify_vlm_test_rehearsal.mjs"), "server.sh missing script reference");
  assert(scriptInventory.includes("verify_vlm_test_rehearsal.mjs"), "script inventory missing verifier");
});

check("rehearsal scope does not claim stabilization, longrun, UI fulltest, or close-out PASS", () => {
  const doc = readText("docs/vlm-test-rehearsal.md");
  const forbidden = [
    "UI 풀테스트 PASS",
    "30분 안정화 PASS",
    "120분 장시간 PASS",
    "close-out readiness 완료",
  ];
  for (const phrase of forbidden) {
    assert(!doc.includes(phrase), `doc overclaims: ${phrase}`);
  }
  for (const phrase of [
    "안정화/30분/120분/UI 풀테스트 완료 evidence가 아닙니다",
    "S16 side effect 점검",
    "S17 안정화/장시간/UI 기준 정리",
    "S18 close-out readiness",
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
console.log("== VLM short test rehearsal summary ==");
console.log(`- schema: ${report.schema}`);
console.log(`- cases: ${report.summary.cases}`);
console.log(`- failure fixtures: ${report.summary.failureFixtures}`);
console.log(`- cleanup cases: ${report.summary.cleanupCases}`);
console.log(`- lifecycle cases: ${report.summary.lifecycleCases}`);
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
  const outcome = deriveOutcome(item);
  const cleanupRequired = item.expected.cleanupRequired === true;
  const result = {
    id: item.id,
    kind: item.kind,
    status: outcome === item.expected.outcome && sideEffects.length === 0 ? item.expected.status : "fail",
    outcome,
    expectedOutcome: item.expected.outcome,
    cleanupRequired,
    cleanupState: cleanupRequired ? "cleanup-ok" : "not-required",
    serverLifecycle: item.expected.serverLifecycle,
    portLifecycle: item.expected.portLifecycle,
    sideEffects,
    verdictNotes: [],
  };
  if (item.id === "queue-timeout") {
    result.verdictNotes.push("queue timeout recorded without DataChannel/media failure");
  }
  if (item.id === "port-server-lifecycle") {
    result.verdictNotes.push("static rehearsal does not bind ports");
  }
  return result;
}

function deriveOutcome(item) {
  if (item.input?.modelAvailable === false) return "blocked-missing-model";
  if (item.input?.provider === "cloud" && item.input?.privacyMode === "cloud-disabled") return "blocked-cloud-disabled";
  if (item.input?.capturedOutputKind === "invalid-json") return "rejected-invalid-output";
  if ((item.input?.queueWaitMs || 0) > (item.input?.queueTimeoutMs || 0)) return "timeout-no-media-path-failure";
  if (item.id === "cleanup-lifecycle") return "cleanup-ok";
  if (item.id === "port-server-lifecycle") return "lifecycle-plan-valid";
  return "fixture-smoke-ready";
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
    "# VLM Short Test Rehearsal Report",
    "",
    `schema: \`${payload.schema}\``,
    `targetStep: \`${payload.targetStep}\``,
    `status: \`${payload.status}\``,
    "",
    "| Case | Kind | Outcome | Cleanup | Server lifecycle | Port lifecycle |",
    "| --- | --- | --- | --- | --- | --- |",
  ];
  for (const item of payload.cases) {
    lines.push(`| \`${item.id}\` | ${item.kind} | ${item.outcome} | ${item.cleanupState} | ${item.serverLifecycle} | ${item.portLifecycle} |`);
  }
  lines.push("");
  lines.push("This report is short rehearsal evidence only. It is not stabilization, 30-minute, 120-minute, manual UI fulltest, or close-out PASS evidence.");
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

#!/usr/bin/env node
// 파일 용도: Runtime Dashboard 장시간 evidence template과 longrun 실행 분리 기준을 정적 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Runtime Dashboard longrun template verification

Usage:
  ./server.sh verify-runtime-dashboard-longrun-template

Checks:
  - Runtime Dashboard longrun evidence template 필수 필드
  - sample-only evidence fixture 필수 필드
  - stream verification guide 연결
  - longrun 실행과 template 검증 분리 문구
  - server.sh command와 script inventory 등록
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];

check("template defines runtime dashboard evidence schema and commands", () => {
  const doc = readText("docs/runtime-dashboard-longrun-evidence-template.md");
  const required = [
    "media-server.runtime-dashboard-longrun-evidence-template.v1",
    "./server.sh verify-va-runtime-console-longrun",
    "--duration-minutes 120",
    "--include-sidechannel",
    "--include-dashboard",
    "--include-rtsp",
    "--idle-after-cleanup-minutes 30",
    "./server.sh verify-va-runtime-console-cycles",
  ];
  for (const snippet of required) {
    assert(doc.includes(snippet), `template missing command/schema snippet: ${snippet}`);
  }
});

check("template captures required evidence fields", () => {
  const doc = readText("docs/runtime-dashboard-longrun-evidence-template.md");
  const required = [
    "summary JSON:",
    "markdown report:",
    "server log:",
    "dashboard polling count:",
    "WebRTC DataChannel sent:",
    "WebRTC DataChannel dropped:",
    "WebRTC DataChannel failures:",
    "SSE metadata messages:",
    "WebSocket metadata messages:",
    "active sessions after cleanup:",
    "active analysis taps after cleanup:",
    "ports clean:",
    "idle judgement:",
    "active RSS start / peak / end:",
    "idle RSS start / end / delta:",
  ];
  for (const snippet of required) {
    assert(doc.includes(snippet), `template missing evidence field: ${snippet}`);
  }
});

check("template separates judgement states and non-execution reporting", () => {
  const doc = readText("docs/runtime-dashboard-longrun-evidence-template.md");
  const required = [
    "| PASS |",
    "| WARNING |",
    "| HOLD |",
    "| FAIL |",
    "장시간 테스트를 실행하지 않습니다",
    "실제 longrun은 사용자가 명시하거나 RC gate에서 요구할 때만 실행합니다",
    "실행하지 않은 longrun은 `미실행`으로 보고하고 PASS evidence로 쓰지 않습니다",
  ];
  for (const snippet of required) {
    assert(doc.includes(snippet), `template missing separation/judgement snippet: ${snippet}`);
  }
});

check("sample fixture captures evidence shape without claiming execution", () => {
  const record = JSON.parse(readText("test/fixtures/runtime_dashboard_longrun_evidence_sample/sample_record.json"));
  const report = readText("test/fixtures/runtime_dashboard_longrun_evidence_sample/sample_report.md");
  assert(record.schema === "media-server.runtime-dashboard-longrun-evidence-sample.v1", "sample fixture schema mismatch");
  assert(record.sampleOnly === true, "sample fixture must be sampleOnly=true");
  assert(record.longrunExecuted === false, "sample fixture must not claim longrun execution");
  assert(record.evidenceStatus === "sample-only-not-executed", "sample fixture evidenceStatus mismatch");
  assert(String(record.run?.command || "").includes("./server.sh verify-va-runtime-console-longrun"), "sample fixture command missing longrun command");
  assert(String(record.run?.command || "").includes("--duration-minutes 120"), "sample fixture command missing 120m duration");
  for (const key of [
    "dashboardPollingCount",
    "activeSessionsMax",
    "activeAnalysisTapsMax",
    "activeSseClientsMax",
    "activeWebSocketClientsMax",
    "rtspEgressConsumersMax",
  ]) {
    assert(Object.prototype.hasOwnProperty.call(record.runtimeDashboard || {}, key), `sample runtimeDashboard missing ${key}`);
  }
  for (const key of [
    "webRtcDataChannelSent",
    "webRtcDataChannelDropped",
    "webRtcDataChannelFailures",
    "sseMetadataMessages",
    "webSocketMetadataMessages",
  ]) {
    assert(Object.prototype.hasOwnProperty.call(record.metadata || {}, key), `sample metadata missing ${key}`);
  }
  for (const key of [
    "cleanupOk",
    "activeSessionsAfterCleanup",
    "activeAnalysisTapsAfterCleanup",
    "activeSseClientsAfterCleanup",
    "activeWebSocketClientsAfterCleanup",
    "rtspEgressConsumersAfterCleanup",
    "portsClean",
    "idleJudgement",
  ]) {
    assert(Object.prototype.hasOwnProperty.call(record.cleanup || {}, key), `sample cleanup missing ${key}`);
  }
  for (const snippet of [
    "SAMPLE ONLY",
    "verify-va-runtime-console-longrun",
    "미실행",
    "PASS evidence로 쓰지 않습니다",
  ]) {
    assert(report.includes(snippet), `sample report missing snippet: ${snippet}`);
  }
});

check("verification docs reference the evidence template", () => {
  const stream = readText("docs/stream-verification.md");
  const backlog = readText("docs/development-backlog.md");
  assert(stream.includes("./runtime-dashboard-longrun-evidence-template.md"), "stream verification missing template link");
  assert(stream.includes("이 템플릿은 longrun 실행 증거가 아니며"), "stream verification missing non-execution warning");
  assert(stream.includes("runtime_dashboard_longrun_evidence_sample"), "stream verification missing sample fixture path");
  assert(backlog.includes("Runtime Dashboard long-run evidence template"), "backlog missing longrun template closure");
  assert(backlog.includes("Runtime longrun evidence sample fixture"), "backlog missing sample fixture closure");
});

check("server entrypoint exposes runtime dashboard longrun template verifier", () => {
  const server = readText("server.sh");
  const inventory = readText("scripts/internal/verify_script_inventory.mjs");
  assert(server.includes("verify-runtime-dashboard-longrun-template"), "server.sh missing verify-runtime-dashboard-longrun-template");
  assert(server.includes("verify_runtime_dashboard_longrun_template.mjs"), "server.sh missing verifier script reference");
  assert(inventory.includes("verify_runtime_dashboard_longrun_template.mjs"), "script inventory missing verify_runtime_dashboard_longrun_template.mjs");
});

let failCount = 0;
for (const item of checks) {
  try {
    item.run();
    console.log(`[pass] ${item.name}`);
  } catch (error) {
    failCount += 1;
    console.error(`[fail] ${item.name}: ${error.message}`);
  }
}

console.log("");
console.log("== Runtime Dashboard longrun template verification summary ==");
console.log(`- pass: ${checks.length - failCount}`);
console.log(`- fail: ${failCount}`);

if (failCount > 0) {
  process.exit(1);
}

function check(name, run) {
  checks.push({ name, run });
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

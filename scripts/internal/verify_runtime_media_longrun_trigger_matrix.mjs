#!/usr/bin/env node
// 파일 용도: runtime/media 변경 유형별 30분/120분 장시간 테스트 trigger와 승인 경계를 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Runtime/media longrun trigger matrix verification

Usage:
  ./server.sh verify-runtime-media-longrun-trigger-matrix [options]

Options:
  --report <path>       Markdown trigger matrix report를 저장합니다.
  --json-report <path>  JSON trigger matrix report를 저장합니다.
  -h, --help            도움말 출력

Checks:
  - runtime/media 변경 유형별 30분 soak, 120분 predev, VA runtime longrun trigger를 분리
  - 120분 gate는 상시 실행이 아니라 사용자 승인/RC/high-risk 조건일 때만 요구
  - docs, release gate, feature inventory, runtime longrun template이 같은 기준을 말함
`);
}

assertKnownOptions(rawArgs, ["report", "json-report", "h", "help"]);

const args = parseArgs(rawArgs);
const reportPath = args.report ? path.resolve(rootDir, args.report) : "";
const jsonReportPath = args.jsonReport ? path.resolve(rootDir, args.jsonReport) : "";
const rows = matrixRows();
const checks = [];
const payload = {
  schema: "media-server.runtime-media-longrun-trigger-matrix.v1",
  generatedAt: new Date().toISOString(),
  status: "pass",
  summary: {
    rows: rows.length,
    soak30Rows: rows.filter(row => row.triggers.includes("verify-predev --soak-minutes 30")).length,
    predev120Rows: rows.filter(row => row.triggers.includes("verify-predev --soak-minutes 120")).length,
    runtime120Rows: rows.filter(row => row.triggers.includes("verify-va-runtime-console-longrun --duration-minutes 120")).length,
    approvalRequiredRows: rows.filter(row => row.approvalRequired === true).length,
  },
  rows,
  checks: [],
};

check("trigger matrix separates short stability, 30 minute, 120 minute, and UI fulltest", () => {
  assert(rows.length >= 8, "trigger matrix is too small to cover runtime/media scope");
  const docsOnly = rowById("docs-policy-only");
  assert(docsOnly.triggers.includes("short-stability"), "docs-only row must keep short stability");
  assert(!docsOnly.triggers.some(item => item.includes("120")), "docs-only row must not require 120 minute longrun");
  const mediaPath = rowById("rtsp-gstreamer-webrtc-session-lifecycle");
  assert(mediaPath.triggers.includes("verify-predev --soak-minutes 30"), "media path row must require 30 minute soak");
  assert(mediaPath.triggers.includes("verify-predev --soak-minutes 120"), "media path row must trigger 120 minute predev for high risk");
  assert(mediaPath.approvalRequired === true, "media path 120 minute trigger must require approval");
});

check("VA runtime high-risk row requires runtime console longrun", () => {
  const fanout = rowById("runtime-dashboard-metadata-fanout");
  assert(fanout.triggers.includes("verify-va-runtime-console-longrun --duration-minutes 120"), "runtime fanout row missing VA runtime longrun");
  assert(fanout.approvalRequired === true, "runtime fanout row must require approval");
  assert(fanout.highRiskSignals.includes("metadata fanout lifecycle"), "runtime fanout row missing high-risk signal");
});

check("field/external endpoints are exclusion or field smoke, not substitute longrun PASS", () => {
  const external = rowById("external-field-endpoints");
  assert(external.triggers.includes("field-smoke-or-exclusion"), "external endpoint row must point at field smoke/exclusion");
  assert(external.notSubstitutes.includes("120-minute PASS"), "external endpoint row must not substitute 120-minute PASS");
});

check("docs expose runtime/media longrun trigger matrix", () => {
  const stream = readText("docs/stream-verification.md");
  const backlog = readText("docs/development-backlog.md");
  const inventory = readText("docs/project-feature-test-inventory.md");
  for (const snippet of [
    "Runtime/media longrun trigger matrix",
    "media-server.runtime-media-longrun-trigger-matrix.v1",
    "./server.sh verify-runtime-media-longrun-trigger-matrix",
    "docs-policy-only",
    "rtsp-gstreamer-webrtc-session-lifecycle",
    "runtime-dashboard-metadata-fanout",
    "30분 soak는 120분 longrun PASS를 대체하지 않습니다",
  ]) {
    assert(stream.includes(snippet), `stream verification missing matrix snippet: ${snippet}`);
  }
  assert(backlog.includes("media-server.runtime-media-longrun-trigger-matrix.v1"), "backlog missing trigger matrix schema");
  assert(backlog.includes("verify-runtime-media-longrun-trigger-matrix"), "backlog missing trigger matrix command");
  assert(inventory.includes("120분 조건부 대상"), "feature inventory missing 120 minute target section");
  assert(inventory.includes("memory growth, runtime drift, fanout/media path 고위험 변경"), "feature inventory missing high-risk wording");
});

check("server and script inventory expose trigger matrix verifier", () => {
  const server = readText("server.sh");
  const scriptInventory = readText("scripts/internal/verify_script_inventory.mjs");
  assert(server.includes("verify-runtime-media-longrun-trigger-matrix"), "server.sh missing trigger matrix command");
  assert(server.includes("verify_runtime_media_longrun_trigger_matrix.mjs"), "server.sh missing trigger matrix script reference");
  assert(scriptInventory.includes("verify_runtime_media_longrun_trigger_matrix.mjs"), "script inventory missing trigger matrix verifier");
});

check("existing longrun separation and RC gates remain connected", () => {
  const stream = readText("docs/stream-verification.md");
  for (const snippet of [
    "./server.sh verify-longrun-separation",
    "./server.sh verify-rc-release-gate",
    "./server.sh verify-runtime-dashboard-longrun-template",
    "./server.sh verify-predev --soak-minutes 30",
    "./server.sh verify-predev --soak-minutes 120",
    "./server.sh verify-va-runtime-console-longrun --duration-minutes 120",
  ]) {
    assert(stream.includes(snippet), `stream verification missing longrun gate: ${snippet}`);
  }
});

check("high-risk trigger rehearsal fails if approval is missing", () => {
  const rehearsal = evaluateTrigger({ changedArea: "rtsp-gstreamer-webrtc-session-lifecycle", approval: false });
  assert(rehearsal.status === "hold", "high-risk media path rehearsal must hold without approval");
  assert(rehearsal.required.includes("verify-predev --soak-minutes 120"), "rehearsal missing 120 minute predev");
  const approved = evaluateTrigger({ changedArea: "rtsp-gstreamer-webrtc-session-lifecycle", approval: true });
  assert(approved.status === "ready-to-run", "approved high-risk media path rehearsal should be ready-to-run");
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
console.log("== Runtime/media longrun trigger matrix summary ==");
console.log(`- schema: ${payload.schema}`);
console.log(`- rows: ${payload.summary.rows}`);
console.log(`- 30m rows: ${payload.summary.soak30Rows}`);
console.log(`- 120m predev rows: ${payload.summary.predev120Rows}`);
console.log(`- 120m runtime rows: ${payload.summary.runtime120Rows}`);
console.log(`- approvalRequired rows: ${payload.summary.approvalRequiredRows}`);
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);

if (reportPath) writeText(reportPath, renderMarkdown(payload));
if (jsonReportPath) writeText(jsonReportPath, `${JSON.stringify(payload, null, 2)}\n`);
if (fail > 0) process.exit(1);

function matrixRows() {
  return [
    row({
      id: "docs-policy-only",
      changeType: "문서, verifier wording, release evidence policy",
      triggers: ["short-stability"],
      approvalRequired: false,
      highRiskSignals: [],
      notSubstitutes: ["30-minute PASS", "120-minute PASS", "UI fulltest PASS"],
      reason: "Policy/docs changes do not exercise runtime media paths.",
    }),
    row({
      id: "ui-nonmedia-shell",
      changeType: "Ops/Client shell layout, copy, non-media controls",
      triggers: ["short-stability", "manual-ui-evidence-or-ui-fulltest"],
      approvalRequired: false,
      highRiskSignals: ["role guard or redaction UI changed"],
      notSubstitutes: ["30-minute PASS", "120-minute PASS"],
      reason: "UI evidence is separate from runtime soak evidence.",
    }),
    row({
      id: "runtime-dashboard-metadata-fanout",
      changeType: "Runtime dashboard, metadata fanout, SSE/WS/DataChannel counters",
      triggers: ["short-stability", "verify-predev --soak-minutes 30", "verify-va-runtime-console-longrun --duration-minutes 120"],
      approvalRequired: true,
      highRiskSignals: ["metadata fanout lifecycle", "active RSS high-water growth", "cleanup drift"],
      notSubstitutes: ["UI fulltest PASS"],
      reason: "Fanout and cleanup changes can drift only under sustained runtime load.",
    }),
    row({
      id: "rtsp-gstreamer-webrtc-session-lifecycle",
      changeType: "RTSP/GStreamer/WebRTC session lifecycle or media path ownership",
      triggers: ["short-stability", "verify-predev --soak-minutes 30", "verify-predev --soak-minutes 120"],
      approvalRequired: true,
      highRiskSignals: ["SessionManager ownership", "SharedStream lifecycle", "RTSP/WebRTC cleanup", "memory growth"],
      notSubstitutes: ["UI fulltest PASS"],
      reason: "Media path lifecycle changes need 30m soak by default and 120m on high-risk or RC.",
    }),
    row({
      id: "event-post-queue-recovery",
      changeType: "Event POST queue, recovery, cooldown, dispatch persistence",
      triggers: ["short-stability", "verify-event-post-longrun", "verify-predev --soak-minutes 30"],
      approvalRequired: false,
      highRiskSignals: ["queue backpressure", "retry/cooldown persistence"],
      notSubstitutes: ["120-minute PASS"],
      reason: "Repeated event POST longrun is targeted; 120m is only RC/high-risk.",
    }),
    row({
      id: "va-tracker-reid-scenario-runtime",
      changeType: "VA tracker/Re-ID/scenario runtime behavior",
      triggers: ["short-stability", "verify-predev --soak-minutes 30", "verify-va-runtime-console-longrun --duration-minutes 120"],
      approvalRequired: true,
      highRiskSignals: ["tracker state retention", "Re-ID assist runtime", "scenario timeline drift"],
      notSubstitutes: ["UI fulltest PASS"],
      reason: "Tracker/scenario runtime can accumulate state across sustained sessions.",
    }),
    row({
      id: "external-field-endpoints",
      changeType: "External TURN/WHEP/ONVIF/YouTube real endpoint",
      triggers: ["field-smoke-or-exclusion"],
      approvalRequired: true,
      highRiskSignals: ["external credentials", "real device/endpoint required"],
      notSubstitutes: ["30-minute PASS", "120-minute PASS", "UI fulltest PASS"],
      reason: "External endpoint evidence is field smoke or explicit exclusion, not local soak proof.",
    }),
    row({
      id: "release-candidate-closeout",
      changeType: "Release candidate close-out",
      triggers: ["short-stability", "verify-predev --soak-minutes 30", "verify-predev --soak-minutes 120", "verify-va-runtime-console-longrun --duration-minutes 120"],
      approvalRequired: true,
      highRiskSignals: ["RC release gate", "release-grade artifact retention"],
      notSubstitutes: ["UI fulltest PASS"],
      reason: "RC gate may require both 120m paths with durable artifacts.",
    }),
  ];
}

function row({ id, changeType, triggers, approvalRequired, highRiskSignals, notSubstitutes, reason }) {
  return { id, changeType, triggers, approvalRequired, highRiskSignals, notSubstitutes, reason };
}

function rowById(id) {
  const found = rows.find(row => row.id === id);
  assert(found, `matrix row missing: ${id}`);
  return found;
}

function evaluateTrigger({ changedArea, approval }) {
  const found = rowById(changedArea);
  const required = found.triggers.filter(trigger => trigger.includes("120"));
  if (required.length > 0 && found.approvalRequired && !approval) {
    return { status: "hold", required, reason: "approval-required" };
  }
  return { status: "ready-to-run", required, reason: approval ? "approved" : "no-approval-required" };
}

function renderMarkdown(report) {
  const lines = [
    "# Runtime/media longrun trigger matrix",
    "",
    `- schema: ${report.schema}`,
    `- generatedAt: ${report.generatedAt}`,
    `- status: ${report.status}`,
    `- rows: ${report.summary.rows}`,
    "",
    "| ID | Change Type | Triggers | Approval Required | High-risk Signals | Not Substitutes | Reason |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];
  for (const item of report.rows) {
    lines.push([
      item.id,
      item.changeType,
      item.triggers.join(", "),
      item.approvalRequired ? "yes" : "no",
      item.highRiskSignals.join(", ") || "-",
      item.notSubstitutes.join(", "),
      item.reason,
    ].map(cell).join(" | ").replace(/^/, "| ").replace(/$/, " |"));
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function check(name, fn) {
  checks.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function cell(value) {
  return String(value).replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function writeText(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text);
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

#!/usr/bin/env node
// 파일 용도: 현재 release OC-SORT benchmark 경계가 runtime tracker로 승격되지 않았는지 검증한다.
// 동작 요약: OC-SORT를 제품 tracker 허용값에서 배제하고, benchmark/report 문서와 기존 비교 harness만 열려 있는지 정적 점검한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`OC-SORT benchmark boundary verification

Usage:
  ./server.sh verify-oc-sort-benchmark-boundary [options]

Options:
  --report <path>       Markdown 리포트를 저장합니다.
  --json-report <path>  JSON 리포트를 저장합니다.
  -h, --help            도움말 출력

Checks:
  - OC-SORT가 analysis.trackingPolicy.tracker 허용값, UI option, runtime tracker enum에 추가되지 않았는지 확인
  - verify-tracker-stability / compare-close-object-tracker가 현재 tracker 후보만 받는지 확인
  - OC-SORT benchmark가 Kalman-lite/ByteTrack 이후 별도 report 후보이며 schema/media path 변경 근거가 아닌지 문서화됐는지 확인
  - 이번 페이즈의 미분류 P0~P1 후속 이슈가 남지 않았는지 확인
`);
}

assertKnownOptions(rawArgs, ["report", "json-report", "h", "help"]);

const args = parseArgs(rawArgs);
const reportPath = args.report ? path.resolve(rootDir, args.report) : "";
const jsonReportPath = args.jsonReport ? path.resolve(rootDir, args.jsonReport) : "";
const checks = [];
const report = {
  schema: "media-server.oc-sort-benchmark-boundary-report.v1",
  generatedAt: new Date().toISOString(),
  status: "pass",
  checks: [],
};

const ocSortTokens = [
  "oc-sort",
  "ocsort",
  "oc_sort",
  "OCSort",
  "OcSort",
  "ObjectTrackerKind::OC",
];

check("OC-SORT is not a runtime tracker policy value", () => {
  const analysisQuery = readText("src/ingress/analysis_query.cpp");
  const server = readText("src/ingress/webrtc_http_server.cpp");
  const ui = readText("src/ingress/product_ui_page_scripts.cpp");

  for (const [label, text] of [
    ["analysis_query.cpp", analysisQuery],
    ["webrtc_http_server.cpp", server],
    ["product_ui_page_scripts.cpp", ui],
  ]) {
    assertNoRuntimeToken(label, text);
  }

  for (const snippet of [
    'value == "none" || value == "kalman-lite" || value == "bytetrack"',
    'analysis.trackingPolicy.tracker must be none, lite, kalman-lite, or bytetrack',
    "none|lite|kalman-lite|bytetrack",
  ]) {
    assert(
      analysisQuery.includes(snippet) || server.includes(snippet),
      `tracking policy contract missing expected current snippet: ${snippet}`
    );
  }

  return {
    allowedTrackers: ["none", "lite", "kalman-lite", "bytetrack"],
    rejected: ["oc-sort", "ocsort"],
  };
});

check("ObjectTracker runtime kind Lite exists", () => {
  const header = readText("include/analysis/object_tracker.h");
  assert(header.includes("enum class ObjectTrackerKind"), "ObjectTrackerKind enum missing");
  assert(header.includes("Lite"), "ObjectTrackerKind missing current tracker: Lite");
  return { runtimeKind: "Lite" };
});

check("ObjectTracker runtime kind KalmanLite exists", () => {
  const header = readText("include/analysis/object_tracker.h");
  assert(header.includes("KalmanLite"), "ObjectTrackerKind missing current tracker: KalmanLite");
  return { runtimeKind: "KalmanLite" };
});

check("ObjectTracker runtime kind ByteTrack exists", () => {
  const header = readText("include/analysis/object_tracker.h");
  assert(header.includes("ByteTrack"), "ObjectTrackerKind missing current tracker: ByteTrack");
  return { runtimeKind: "ByteTrack" };
});

check("ObjectTracker implementation rejects OC-SORT tokens", () => {
  const header = readText("include/analysis/object_tracker.h");
  const manager = readText("src/analysis/analysis_manager.cpp");
  const tracker = readText("src/analysis/object_tracker.cpp");
  for (const [label, text] of [
    ["object_tracker.h", header],
    ["analysis_manager.cpp", manager],
    ["object_tracker.cpp", tracker],
  ]) {
    assertNoRuntimeToken(label, text);
  }
  return {
    rejected: ["oc-sort", "ocsort"],
  };
});

check("benchmark harness accepts only current tracker policies", () => {
  const stability = readText("scripts/internal/verify_tracker_stability.sh");
  const compare = readText("scripts/internal/compare_close_object_tracker.py");
  assertNoRuntimeToken("verify_tracker_stability.sh", stability);
  for (const snippet of [
    'TRACKER_POLICY}" != "lite" && "${TRACKER_POLICY}" != "kalman-lite" && "${TRACKER_POLICY}" != "bytetrack"',
    'args.tracker_policy not in {"lite", "kalman-lite", "bytetrack"}',
    "--fixture-matrix",
    "defaultOnDecision",
    "productDefaultOn",
  ]) {
    assert(
      stability.includes(snippet) || compare.includes(snippet),
      `benchmark harness missing boundary snippet: ${snippet}`
    );
  }
  for (const snippet of [
    "--experimental-sandbox",
    "runtimeTrackerPolicy",
    "records an explicit OC-SORT comparison sandbox boundary",
  ]) {
    assert(
      compare.includes(snippet),
      `OC-SORT sandbox metadata must stay explicit and non-runtime in compare harness: ${snippet}`
    );
  }
  const trackerArgs = extractBetween(compare, "def tracker_args", "def find_available_port");
  assert(!trackerArgs.includes("experimental_sandbox"), "OC-SORT sandbox flag must not be forwarded to tracker stability");
  return {
    commands: ["verify-tracker-stability", "compare-close-object-tracker"],
    trackerPolicies: ["lite", "kalman-lite", "bytetrack"],
    experimentalSandbox: "metadata-only",
  };
});

check("OC-SORT benchmark boundary is documented without product-scope expansion", () => {
  const backlog = readText("docs/development-backlog.md");
  const video = readText("docs/video-analysis.md");
  const stream = readText("docs/stream-verification.md");
  const boundary = readText("docs/oc-sort-benchmark-boundary.md");
  const docsIndex = readText("docs/README.md");
  const config = readText("docs/config-reference.md");
  const readme = readText("README.md");
  const readmeEn = readText("README.en.md");
  const docsEn = readText("docs/en/README.md");

  for (const snippet of [
    "OC-SORT 후순위 benchmark",
    "analysis.trackingPolicy.tracker` 허용값에 추가하지 않습니다",
    "ByteTrack/Kalman-lite 이후",
    "제품 tracker 교체 근거로 과장하지 않습니다",
    "미분류 P0~P1 후속 이슈: 없음",
    "별도 Phase 후보로 기록",
  ]) {
    assert(backlog.includes(snippet), `backlog missing OC-SORT boundary snippet: ${snippet}`);
  }

  for (const snippet of [
    "OC-SORT는 v1.8.0 runtime tracker 허용값이 아닙니다",
    "Event POST/WebRTC DataChannel/SSE/WS metadata schema에는 새 필드를 추가하지 않습니다",
  ]) {
    assert(includesText(video, snippet), `video-analysis missing OC-SORT snippet: ${snippet}`);
  }

  for (const snippet of [
    "verify-oc-sort-benchmark-boundary",
    "OC-SORT 후순위 benchmark boundary",
    "실제 OC-SORT algorithm",
  ]) {
    assert(stream.includes(snippet), `stream-verification missing OC-SORT snippet: ${snippet}`);
  }

  for (const snippet of [
    "OC-SORT Benchmark Boundary",
    "이번 v1.8.0 (7) 범위",
    "미분류 P0~P1 후속",
    "후속 Phase",
  ]) {
    assert(boundary.includes(snippet), `OC-SORT boundary doc missing snippet: ${snippet}`);
  }

  for (const [label, text] of [
    ["docs/config-reference.md", config],
    ["docs/README.md", docsIndex],
  ]) {
    assert(text.includes("oc-sort-benchmark-boundary.md"), `${label} missing OC-SORT boundary doc link`);
  }

  for (const [label, text, snippet] of [
    ["README.md", readme, "docs/README.md"],
    ["README.en.md", readmeEn, "docs/README.md"],
    ["docs/en/README.md", docsEn, "../README.md"],
  ]) {
    assert(text.includes(snippet), `${label} missing documentation index link`);
  }

  return {
    docs: [
      "docs/development-backlog.md",
      "docs/video-analysis.md",
      "docs/stream-verification.md",
      "docs/oc-sort-benchmark-boundary.md",
      "docs/README.md",
      "docs/config-reference.md",
    ],
  };
});

check("server command exposes OC-SORT boundary verifier command", () => {
  const server = readText("server.sh");
  assert(server.includes("verify-oc-sort-benchmark-boundary"), "server.sh missing verify-oc-sort-benchmark-boundary");
  return {
    command: "verify-oc-sort-benchmark-boundary",
  };
});

check("server command exposes OC-SORT boundary verifier script", () => {
  const server = readText("server.sh");
  assert(server.includes("verify_oc_sort_benchmark_boundary.mjs"), "server.sh missing verify_oc_sort_benchmark_boundary.mjs");
  return {
    script: "verify_oc_sort_benchmark_boundary.mjs",
  };
});

check("script inventory exposes OC-SORT boundary verifier script", () => {
  const inventory = readText("scripts/internal/verify_script_inventory.mjs");
  assert(inventory.includes("verify_oc_sort_benchmark_boundary.mjs"), "script inventory missing verifier");
  return {
    script: "verify_oc_sort_benchmark_boundary.mjs",
  };
});

let pass = 0;
let fail = 0;
for (const item of checks) {
  try {
    const detail = item.fn() || {};
    pass += 1;
    report.checks.push({ name: item.name, status: "pass", detail });
    console.log(`[pass] ${item.name}`);
  } catch (error) {
    fail += 1;
    const message = error instanceof Error ? error.message : String(error);
    report.checks.push({ name: item.name, status: "fail", message });
    console.log(`[fail] ${item.name}: ${message}`);
  }
}

report.status = fail === 0 ? "pass" : "fail";
console.log("");
console.log("== OC-SORT benchmark boundary summary ==");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
console.log(`- status: ${report.status}`);

if (reportPath) writeText(reportPath, renderMarkdown(report));
if (jsonReportPath) writeText(jsonReportPath, `${JSON.stringify(report, null, 2)}\n`);
if (fail > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertNoRuntimeToken(label, text) {
  const hits = ocSortTokens.filter(token => text.includes(token));
  assert(hits.length === 0, `${label} unexpectedly contains OC-SORT runtime token(s): ${hits.join(", ")}`);
}

function readText(file) {
  return fs.readFileSync(path.join(rootDir, file), "utf8");
}

function includesText(text, snippet) {
  const normalize = value => String(value).replace(/\s+/g, " ").trim();
  return normalize(text).includes(normalize(snippet));
}

function extractBetween(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  if (start < 0) return "";
  const end = text.indexOf(endMarker, start + startMarker.length);
  return end < 0 ? text.slice(start) : text.slice(start, end);
}

function writeText(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, "utf8");
}

function renderMarkdown(payload) {
  const lines = [
    "# OC-SORT Benchmark Boundary Report",
    "",
    `- schema: ${payload.schema}`,
    `- generatedAt: ${payload.generatedAt}`,
    `- status: ${payload.status}`,
    "",
    "| 결과 | 점검 | 상세 |",
    "| --- | --- | --- |",
  ];
  for (const item of payload.checks) {
    const detail = item.status === "pass"
      ? JSON.stringify(item.detail || {})
      : item.message;
    lines.push(`| ${item.status.toUpperCase()} | ${escapeCell(item.name)} | ${escapeCell(detail || "")} |`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function escapeCell(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", "<br>");
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const [name, inlineValue] = token.slice(2).split("=", 2);
    if (name === "report" || name === "json-report") {
      const value = inlineValue ?? argv[index + 1];
      if (inlineValue === undefined) index += 1;
      parsed[name.replace(/-([a-z])/g, (_, ch) => ch.toUpperCase())] = value;
    }
  }
  return parsed;
}

#!/usr/bin/env node
// 파일 용도: 현재 v1.8.0 BoT-SORT/DeepSORT research boundary가 runtime tracker로 승격되지 않았는지 검증한다.
// 동작 요약: BoT-SORT/DeepSORT를 제품 tracker 허용값에서 배제하고, privacy/dependency/bundle review만 남아 있는지 정적 점검한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`BoT-SORT/DeepSORT research boundary verification

Usage:
  ./server.sh verify-bot-sort-deepsort-research-boundary [options]

Options:
  --report <path>       Markdown 리포트를 저장합니다.
  --json-report <path>  JSON 리포트를 저장합니다.
  -h, --help            도움말 출력

Checks:
  - BoT-SORT/DeepSORT가 analysis.trackingPolicy.tracker 허용값, UI option, runtime tracker enum에 추가되지 않았는지 확인
  - verify-tracker-stability / compare-close-object-tracker가 현재 tracker 후보만 받는지 확인
  - BoT-SORT/DeepSORT 연구가 privacy/dependency/bundle 후속 Phase 후보이며 schema/media path 변경 근거가 아닌지 문서화됐는지 확인
  - 이번 페이즈의 미분류 P0~P1 후속 이슈가 남지 않았는지 확인
`);
}

assertKnownOptions(rawArgs, ["report", "json-report", "h", "help"]);

const args = parseArgs(rawArgs);
const reportPath = args.report ? path.resolve(rootDir, args.report) : "";
const jsonReportPath = args.jsonReport ? path.resolve(rootDir, args.jsonReport) : "";
const checks = [];
const report = {
  schema: "media-server.bot-sort-deepsort-research-boundary-report.v1",
  generatedAt: new Date().toISOString(),
  status: "pass",
  checks: [],
};

const researchRuntimeTokens = [
  "bot-sort",
  "botsort",
  "bot_sort",
  "BoTSORT",
  "BotSort",
  "deep-sort",
  "deepsort",
  "deep_sort",
  "DeepSORT",
  "DeepSort",
  "ObjectTrackerKind::BoT",
  "ObjectTrackerKind::Deep",
];

check("BoT-SORT and DeepSORT are not runtime tracker policy values", () => {
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
    "analysis.trackingPolicy.tracker must be none, lite, kalman-lite, or bytetrack",
    "none|lite|kalman-lite|bytetrack",
  ]) {
    assert(
      analysisQuery.includes(snippet) || server.includes(snippet),
      `tracking policy contract missing expected current snippet: ${snippet}`
    );
  }

  return {
    allowedTrackers: ["none", "lite", "kalman-lite", "bytetrack"],
    rejected: ["bot-sort", "botsort", "deep-sort", "deepsort"],
  };
});

check("ObjectTracker implementation remains limited to Lite, Kalman-lite, and ByteTrack", () => {
  const header = readText("include/analysis/object_tracker.h");
  const manager = readText("src/analysis/analysis_manager.cpp");
  const tracker = readText("src/analysis/object_tracker.cpp");
  assert(header.includes("enum class ObjectTrackerKind"), "ObjectTrackerKind enum missing");
  for (const snippet of [
    "Lite",
    "KalmanLite",
    "ByteTrack",
  ]) {
    assert(header.includes(snippet), `ObjectTrackerKind missing current tracker: ${snippet}`);
  }
  for (const [label, text] of [
    ["object_tracker.h", header],
    ["analysis_manager.cpp", manager],
    ["object_tracker.cpp", tracker],
  ]) {
    assertNoRuntimeToken(label, text);
  }
  return {
    runtimeKinds: ["Lite", "KalmanLite", "ByteTrack"],
  };
});

check("benchmark harness accepts only current tracker policies", () => {
  const stability = readText("scripts/internal/verify_tracker_stability.sh");
  const compare = readText("scripts/internal/compare_close_object_tracker.py");
  for (const [label, text] of [
    ["verify_tracker_stability.sh", stability],
    ["compare_close_object_tracker.py", compare],
  ]) {
    assertNoRuntimeToken(label, text);
  }
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
  return {
    commands: ["verify-tracker-stability", "compare-close-object-tracker"],
    trackerPolicies: ["lite", "kalman-lite", "bytetrack"],
  };
});

check("BoT-SORT/DeepSORT research boundary is documented without product-scope expansion", () => {
  const backlog = readText("docs/development-backlog.md");
  const video = readText("docs/video-analysis.md");
  const stream = readText("docs/stream-verification.md");
  const boundary = readText("docs/bot-sort-deepsort-research-boundary.md");
  const docsIndex = readText("docs/README.md");
  const config = readText("docs/config-reference.md");
  const readme = readText("README.md");
  const readmeEn = readText("README.en.md");
  const docsEn = readText("docs/en/README.md");

  for (const snippet of [
    "BoT-SORT/DeepSORT research boundary",
    "BoT-SORT/botsort/DeepSORT/deepsort token을 제품 tracker로 받지 않습니다",
    "미분류 P0~P1 후속 이슈: 없음",
    "별도 Phase 후보로 기록",
    "BoT-SORT/DeepSORT dependency/privacy threat model",
    "runtime/model bundle RC policy",
  ]) {
    assert(backlog.includes(snippet), `backlog missing BoT-SORT/DeepSORT boundary snippet: ${snippet}`);
  }

  for (const snippet of [
    "BoT-SORT/DeepSORT도 v1.8.0 runtime tracker 허용값이 아닙니다",
    "Event POST/WebRTC DataChannel/SSE/WS metadata schema",
    "RTSP/WebRTC media path 변경 근거가 아닙니다",
  ]) {
    assert(includesText(video, snippet), `video-analysis missing BoT-SORT/DeepSORT snippet: ${snippet}`);
  }

  for (const snippet of [
    "verify-bot-sort-deepsort-research-boundary",
    "BoT-SORT/DeepSORT research boundary",
    "Re-ID/model/privacy/bundle 검토가 후속 Phase 후보",
  ]) {
    assert(stream.includes(snippet), `stream-verification missing BoT-SORT/DeepSORT snippet: ${snippet}`);
  }

  for (const snippet of [
    "BoT-SORT/DeepSORT Research Boundary",
    "이번 v1.8.0 (8) 범위",
    "미분류 P0~P1 후속",
    "후속 Phase",
    "실제 BoT-SORT 또는 DeepSORT algorithm 구현",
  ]) {
    assert(boundary.includes(snippet), `BoT-SORT/DeepSORT boundary doc missing snippet: ${snippet}`);
  }

  for (const [label, text] of [
    ["docs/config-reference.md", config],
    ["docs/README.md", docsIndex],
  ]) {
    assert(
      text.includes("bot-sort-deepsort-research-boundary.md"),
      `${label} missing BoT-SORT/DeepSORT boundary doc link`
    );
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
      "docs/bot-sort-deepsort-research-boundary.md",
      "docs/README.md",
      "docs/config-reference.md",
    ],
  };
});

check("server command and script inventory expose the boundary verifier", () => {
  const server = readText("server.sh");
  const inventory = readText("scripts/internal/verify_script_inventory.mjs");
  for (const snippet of [
    "verify-bot-sort-deepsort-research-boundary",
    "verify_bot_sort_deepsort_research_boundary.mjs",
  ]) {
    assert(server.includes(snippet), `server.sh missing ${snippet}`);
  }
  assert(
    inventory.includes("verify_bot_sort_deepsort_research_boundary.mjs"),
    "script inventory missing verifier"
  );
  return {
    command: "verify-bot-sort-deepsort-research-boundary",
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
console.log("== BoT-SORT/DeepSORT research boundary summary ==");
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
  const hits = researchRuntimeTokens.filter(token => text.includes(token));
  assert(
    hits.length === 0,
    `${label} unexpectedly contains BoT-SORT/DeepSORT runtime token(s): ${hits.join(", ")}`
  );
}

function readText(file) {
  return fs.readFileSync(path.join(rootDir, file), "utf8");
}

function includesText(text, snippet) {
  const normalize = value => String(value).replace(/\s+/g, " ").trim();
  return normalize(text).includes(normalize(snippet));
}

function writeText(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, "utf8");
}

function renderMarkdown(payload) {
  const lines = [
    "# BoT-SORT/DeepSORT Research Boundary Report",
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

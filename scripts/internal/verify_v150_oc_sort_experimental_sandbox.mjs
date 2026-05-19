#!/usr/bin/env node
// 파일 용도: v1.5.0 OC-SORT experimental sandbox가 runtime tracker 승격 없이 연결됐는지 검증한다.
// 동작 요약: 명시적 sandbox manifest, compare harness metadata, 문서/entrypoint 경계를 정적으로 점검한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v1.5.0 OC-SORT experimental sandbox verification

Usage:
  ./server.sh verify-v150-oc-sort-experimental-sandbox [options]

Options:
  --report <path>       Markdown 리포트를 저장합니다.
  --json-report <path>  JSON 리포트를 저장합니다.
  -h, --help            도움말 출력

Checks:
  - V150-P2-01 세부 범위와 후속/비범위 분류가 문서화됐는지 확인
  - OC-SORT sandbox fixture가 manifest-only, explicit flag, default-on false로 고정됐는지 확인
  - compare-close-object-tracker가 sandbox metadata만 기록하고 runtime tracker policy로 oc-sort를 받지 않는지 확인
  - product runtime/UI/ObjectTracker/verify-tracker-stability에 OC-SORT runtime token이 추가되지 않았는지 확인
  - server.sh, script inventory, verification docs가 전용 verifier를 연결하는지 확인
`);
}

assertKnownOptions(rawArgs, ["report", "json-report", "h", "help"]);

const args = parseArgs(rawArgs);
const reportPath = args.report ? path.resolve(rootDir, args.report) : "";
const jsonReportPath = args.jsonReport ? path.resolve(rootDir, args.jsonReport) : "";
const checks = [];
const report = {
  schema: "media-server.v150-oc-sort-experimental-sandbox-report.v1",
  generatedAt: new Date().toISOString(),
  status: "pass",
  checks: [],
};

const ocSortRuntimeTokens = [
  "ocsort",
  "oc_sort",
  "OCSort",
  "OcSort",
  "ObjectTrackerKind::OC",
];

check("fixture pins OC-SORT as an explicit manifest-only sandbox", () => {
  const fixture = JSON.parse(readText("test/fixtures/v150_oc_sort_experimental_sandbox.json"));
  assert(fixture.schema === "media-server.v150.oc-sort-experimental-sandbox-fixture.v1", "fixture schema mismatch");
  assert(fixture.roadmapId === "V150-P2-01", "fixture roadmap id mismatch");
  assert(fixture.status === "manifest-only", "fixture must be manifest-only");
  const sandbox = fixture.experimentalSandbox || {};
  assert(sandbox.id === "oc-sort", "sandbox id mismatch");
  assert(sandbox.algorithmAdapter === false, "OC-SORT algorithm adapter must not be marked implemented");
  assert(sandbox.runtimeTrackerPolicy === "", "OC-SORT must not be a runtime tracker policy");
  assert(sandbox.requiresExplicitFlag === true, "sandbox must require an explicit flag");
  assert(sandbox.productDefaultOn === false, "sandbox must not be product default-on");
  for (const item of ["lite", "kalman-lite", "bytetrack"]) {
    assert((sandbox.allowedRuntimeTrackerPolicies || []).includes(item), `fixture missing allowed runtime tracker: ${item}`);
  }
  for (const item of ["oc-sort", "ocsort", "oc_sort"]) {
    assert((sandbox.rejectedRuntimeTrackerPolicies || []).includes(item), `fixture missing rejected tracker: ${item}`);
  }
  const followUp = fixture.followUpClassification || {};
  assert(Array.isArray(followUp.unclassifiedP0P1) && followUp.unclassifiedP0P1.length === 0, "P0/P1 follow-up list must be empty");
  assert((followUp.laterPhase || []).length >= 3, "later phase OC-SORT follow-ups must be recorded");
  return {
    fixture: "test/fixtures/v150_oc_sort_experimental_sandbox.json",
    allowedRuntimeTrackerPolicies: sandbox.allowedRuntimeTrackerPolicies,
  };
});

check("compare harness records sandbox metadata without accepting OC-SORT as tracker policy", () => {
  const compare = readText("scripts/internal/compare_close_object_tracker.py");
  for (const snippet of [
    "EXPERIMENTAL_SANDBOXES",
    '"oc-sort"',
    "OC-SORT experimental sandbox",
    "--experimental-sandbox",
    "--list-experimental-sandboxes",
    "experimentalSandbox",
    "runtimeTrackerPolicy",
    "allowedRuntimeTrackerPolicies",
    "productDefaultOn",
    "records an explicit OC-SORT comparison sandbox boundary",
  ]) {
    assert(compare.includes(snippet), `compare harness missing sandbox snippet: ${snippet}`);
  }
  assert(
    compare.includes('args.tracker_policy not in {"lite", "kalman-lite", "bytetrack"}'),
    "compare harness must keep tracker policy validation limited to current runtime trackers"
  );
  const trackerArgs = extractBetween(compare, "def tracker_args", "def find_available_port");
  assert(!trackerArgs.includes("experimental_sandbox"), "sandbox flag must not be forwarded to verify-tracker-stability");
  return {
    command: "compare-close-object-tracker --experimental-sandbox oc-sort",
    runtimeTrackerPolicyAdded: false,
  };
});

check("product runtime and UI do not contain OC-SORT runtime tokens", () => {
  const files = [
    "src/ingress/analysis_query.cpp",
    "src/ingress/webrtc_http_server.cpp",
    "src/ingress/product_ui_page_scripts.cpp",
    "include/analysis/object_tracker.h",
    "src/analysis/analysis_manager.cpp",
    "src/analysis/object_tracker.cpp",
    "scripts/internal/verify_tracker_stability.sh",
  ];
  const hits = [];
  for (const file of files) {
    const text = readText(file);
    for (const token of ocSortRuntimeTokens) {
      if (text.includes(token)) hits.push(`${file}: ${token}`);
    }
    if (text.includes('"oc-sort"') || text.includes("'oc-sort'")) {
      hits.push(`${file}: oc-sort literal`);
    }
  }
  assert(hits.length === 0, `OC-SORT runtime token(s) found:\n${hits.join("\n")}`);
  return { checkedFiles: files };
});

check("roadmap and feature docs define the V150-P2-01 sandbox boundary", () => {
  const backlog = readText("docs/development-backlog.md");
  const stream = readText("docs/stream-verification.md");
  const video = readText("docs/video-analysis.md");
  const boundary = readText("docs/oc-sort-benchmark-boundary.md");
  const section = extractBetween(
    backlog,
    "### V150-P2-01 OC-SORT experimental sandbox 정리 기준",
    "v1.5.0 비범위:"
  );
  for (const snippet of [
    "compare-close-object-tracker --experimental-sandbox oc-sort",
    "test/fixtures/v150_oc_sort_experimental_sandbox.json",
    "미분류 P0~P1 후속 이슈: 없음",
    "실제 OC-SORT algorithm adapter",
    "Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경",
    "RTSP/WebRTC media path 변경",
  ]) {
    assertIncludes(section, snippet, "V150-P2-01 roadmap section");
  }
  for (const snippet of [
    "verify-v150-oc-sort-experimental-sandbox",
    "--experimental-sandbox oc-sort",
    "manifest-only",
  ]) {
    assertIncludes(stream, snippet, "stream verification docs");
  }
  for (const snippet of [
    "v1.5.0 OC-SORT experimental sandbox",
    "runtime tracker 허용값에 추가하지 않습니다",
  ]) {
    assertIncludes(video, snippet, "video analysis docs");
  }
  for (const snippet of [
    "v1.5.0 (7) OC-SORT experimental sandbox",
    "manifest-only",
    "미분류 P0~P1 후속: 없음",
  ]) {
    assertIncludes(boundary, snippet, "OC-SORT boundary doc");
  }
  return {
    docs: [
      "docs/development-backlog.md",
      "docs/stream-verification.md",
      "docs/video-analysis.md",
      "docs/oc-sort-benchmark-boundary.md",
    ],
  };
});

check("server command and inventory expose the V150-P2-01 verifier", () => {
  const server = readText("server.sh");
  const inventory = readText("scripts/internal/verify_script_inventory.mjs");
  for (const snippet of [
    "verify-v150-oc-sort-experimental-sandbox",
    "verify_v150_oc_sort_experimental_sandbox.mjs",
  ]) {
    assertIncludes(server, snippet, "server.sh");
    assertIncludes(inventory, "verify_v150_oc_sort_experimental_sandbox.mjs", "script inventory");
  }
  return {
    command: "verify-v150-oc-sort-experimental-sandbox",
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
console.log("== v1.5.0 OC-SORT experimental sandbox summary ==");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
console.log("- in-scope unclassified P0/P1 follow-ups: 0");
if (reportPath) writeText(reportPath, renderMarkdown(report));
if (jsonReportPath) writeText(jsonReportPath, `${JSON.stringify(report, null, 2)}\n`);
if (fail > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function assertIncludes(text, snippet, label) {
  const normalize = value => String(value).replace(/\s+/g, " ").trim();
  assert(normalize(text).includes(normalize(snippet)), `${label} missing required wording: ${snippet}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function writeText(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, "utf8");
}

function extractBetween(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  if (start < 0) return "";
  const end = text.indexOf(endMarker, start + startMarker.length);
  return end < 0 ? text.slice(start) : text.slice(start, end);
}

function renderMarkdown(payload) {
  const lines = [
    "# v1.5.0 OC-SORT Experimental Sandbox Report",
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

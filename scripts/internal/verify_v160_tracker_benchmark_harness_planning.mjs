#!/usr/bin/env node
// 파일 용도: v1.6.0 tracker benchmark harness planning-only 경계를 정적으로 검증한다.
// 동작 요약: OC-SORT/BoT-SORT/DeepSORT를 runtime tracker로 승격하지 않고 향후 benchmark 요구사항만 남겼는지 확인한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v1.6.0 tracker benchmark harness planning verification

Usage:
  ./server.sh verify-v160-tracker-benchmark-harness-planning [options]

Options:
  -h, --help  도움말 출력

Checks:
  - V160-P2-02 roadmap와 전용 문서가 planning-only benchmark 요구사항과 비승격 경계를 고정하는지 확인
  - runtime tracker policy/UI/enum/harness 허용값이 none/lite/kalman-lite/bytetrack에 머무는지 확인
  - OC-SORT metadata-only sandbox, BoT-SORT/DeepSORT research boundary, release docs 연결을 확인
  - server.sh와 script inventory가 전용 verifier를 노출하는지 확인
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const doc = readText("docs/v1.6.0-tracker-benchmark-harness-planning.md");
const backlog = readText("docs/development-backlog.md");
const dashboard = readText("docs/v1.6.0-release-evidence-dashboard.md");
const stream = readText("docs/stream-verification.md");
const releasePolicy = readText("docs/release-policy.md");
const readme = readText("README.md");
const readmeEn = readText("README.en.md");
const docsIndex = readText("docs/en/README.md");
const ocSortBoundary = readText("docs/oc-sort-benchmark-boundary.md");
const botBoundary = readText("docs/bot-sort-deepsort-research-boundary.md");
const compare = readText("scripts/internal/compare_close_object_tracker.py");
const trackerStability = readText("scripts/internal/verify_tracker_stability.sh");
const analysisQuery = readText("src/ingress/analysis_query.cpp");
const serverSource = readText("src/ingress/webrtc_http_server.cpp");
const trackerHeader = readText("include/analysis/object_tracker.h");
const productUi = readText("src/ingress/product_ui_page_scripts.cpp");
const server = readText("server.sh");
const inventory = readText("scripts/internal/verify_script_inventory.mjs");
const section = extractSection(
  backlog,
  "### V160-P2-02 Tracker benchmark harness planning only 정리 기준",
  "### v1.6.0 비범위"
);
const checks = [];

const forbiddenRuntimeTokens = [
  "oc-sort",
  "ocsort",
  "oc_sort",
  "bot-sort",
  "botsort",
  "deep-sort",
  "deepsort",
];

check("dedicated doc defines planning-only benchmark boundary", () => {
  for (const snippet of [
    "# v1.6.0 Tracker Benchmark Harness Planning",
    "V160-P2-02",
    "실제 OC-SORT adapter나 새 runtime tracker를 구현하지 않고",
    "`none`, `lite`, `kalman-lite`,",
    "`bytetrack`",
    "OC-SORT, BoT-SORT, DeepSORT runtime tracker 선택값을 추가하지 않습니다",
    "metadata-only sandbox manifest",
    "tracker stability 실행 인자로 전달하지 않습니다",
    "Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경",
    "RTSP/WebRTC media path 변경",
    "tracker/Re-ID default-on",
    "product default tracker 변경",
    "model/runtime bundle 포함",
    "verify-v160-tracker-benchmark-harness-planning",
  ]) {
    assertIncludes(doc, snippet, "v1.6 tracker benchmark planning doc");
  }
});

check("dedicated doc records future harness requirements and phase separation", () => {
  for (const snippet of [
    "Fixture set",
    "Candidate policy",
    "Metrics",
    "defaultOnDecision",
    "`matrix-ok`와 product default-on/default tracker 변경 판단 분리",
    "Privacy",
    "Bundle",
    "summary/report/history index",
    "raw media/source/auth material은 보존 금지",
    "OC-SORT Benchmark Boundary",
    "BoT-SORT/DeepSORT Research Boundary",
    "실제 OC-SORT algorithm adapter",
    "dataset benchmark report",
    "tracker replacement product review",
    "별도 Phase 후보",
  ]) {
    assertIncludes(doc, snippet, "v1.6 tracker benchmark planning requirements");
  }
});

check("roadmap defines V160-P2-02 scope without implementing adapters", () => {
  for (const snippet of [
    "V160-P2-02 Tracker benchmark harness planning only",
    "v1.6.0 Tracker Benchmark Harness Planning",
    "analysis.trackingPolicy.tracker",
    "`none`, `lite`, `kalman-lite`",
    "`bytetrack`",
    "OC-SORT, BoT-SORT, DeepSORT runtime tracker 선택값을 추가하지 않습니다",
    "metadata-only sandbox",
    "verify-v160-tracker-benchmark-harness-planning",
    "verify-oc-sort-benchmark-boundary",
    "verify-bot-sort-deepsort-research-boundary",
    "미분류 P0~P1 후속 이슈: 없음",
    "실제 OC-SORT algorithm adapter 구현",
    "BoT-SORT/DeepSORT adapter 구현",
    "dataset benchmark report 실행",
    "Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경",
    "RTSP/WebRTC media path 변경",
  ]) {
    assertIncludes(section, snippet, "V160-P2-02 roadmap section");
  }
  for (const forbidden of [
    "OC-SORT algorithm adapter 구현 완료",
    "BoT-SORT/DeepSORT adapter 구현 완료",
    "dataset benchmark report 완료",
    "tracker replacement product review 완료",
    "Re-ID default-on 완료",
  ]) {
    assert(!section.includes(forbidden), `V160-P2-02 must not overclaim: ${forbidden}`);
  }
});

check("runtime tracker policy and UI remain on existing tracker set", () => {
  for (const snippet of [
    'value == "none" || value == "kalman-lite" || value == "bytetrack"',
    "analysis.trackingPolicy.tracker must be none, lite, kalman-lite, or bytetrack",
    "\\\"tracker\\\":[\\\"none\\\",\\\"lite\\\",\\\"kalman-lite\\\",\\\"bytetrack\\\"]",
    "none|lite|kalman-lite|bytetrack",
  ]) {
    assert(
      analysisQuery.includes(snippet) || serverSource.includes(snippet),
      `runtime tracker policy missing existing-set snippet: ${snippet}`,
    );
  }
  for (const snippet of [
    "Lite",
    "KalmanLite",
    "ByteTrack",
  ]) {
    assertIncludes(trackerHeader, snippet, "ObjectTrackerKind");
  }
  for (const text of [analysisQuery, serverSource, trackerHeader, productUi]) {
    assertNoRuntimeToken(text, "runtime/UI tracker surface");
  }
});

check("benchmark harness keeps OC-SORT sandbox metadata-only and tracker policies bounded", () => {
  for (const snippet of [
    "--experimental-sandbox",
    "\"oc-sort\"",
    "\"runtimeTrackerPolicy\": \"\"",
    "\"algorithmAdapter\": False",
    "\"productDefaultOn\": False",
    "args.tracker_policy not in {\"lite\", \"kalman-lite\", \"bytetrack\"}",
  ]) {
    assertIncludes(compare, snippet, "compare-close-object-tracker");
  }
  const trackerArgs = extractBetween(compare, "def tracker_args", "def find_available_port");
  assert(!trackerArgs.includes("experimental_sandbox"), "experimental sandbox flag must not be forwarded to tracker stability");
  for (const snippet of [
    "허용값: lite, kalman-lite, bytetrack",
    'TRACKER_POLICY}" != "lite" && "${TRACKER_POLICY}" != "kalman-lite" && "${TRACKER_POLICY}" != "bytetrack"',
  ]) {
    assertIncludes(trackerStability, snippet, "verify-tracker-stability");
  }
});

check("existing OC-SORT and BoT-SORT/DeepSORT boundary docs remain connected", () => {
  for (const snippet of [
    "OC-SORT Benchmark Boundary",
    "실제 OC-SORT algorithm adapter 구현",
    "OC-SORT를 `analysis.trackingPolicy.tracker` 또는 `/ops/rules` option으로 추가",
    "Event POST/WebRTC DataChannel/SSE/WS metadata schema 또는 RTSP/WebRTC media path 변경",
  ]) {
    assertIncludes(ocSortBoundary, snippet, "OC-SORT boundary");
  }
  for (const snippet of [
    "BoT-SORT/DeepSORT Research Boundary",
    "실제 BoT-SORT 또는 DeepSORT algorithm 구현",
    "BoT-SORT/DeepSORT를 rule-level tracker 선택값으로 추가",
    "Event POST/WebRTC DataChannel/SSE/WS metadata schema 또는 RTSP/WebRTC media",
  ]) {
    assertIncludes(botBoundary, snippet, "BoT-SORT/DeepSORT boundary");
  }
});

check("release docs and entrypoints expose the v1.6 planning guard", () => {
  for (const [label, text] of [
    ["release dashboard", dashboard],
    ["stream verification", stream],
    ["release policy", releasePolicy],
    ["README.md", readme],
    ["README.en.md", readmeEn],
    ["docs/en README", docsIndex],
  ]) {
    assertIncludes(text, "v1.6.0-tracker-benchmark-harness-planning.md", label);
    assertIncludes(text, "verify-v160-tracker-benchmark-harness-planning", label);
  }
  for (const snippet of [
    "verify-v160-tracker-benchmark-harness-planning",
    "verify_v160_tracker_benchmark_harness_planning.mjs",
  ]) {
    assertIncludes(server, snippet, "server.sh");
  }
  assertIncludes(inventory, "verify_v160_tracker_benchmark_harness_planning.mjs", "script inventory");
});

let pass = 0;
let fail = 0;
for (const item of checks) {
  try {
    item.fn();
    pass += 1;
    console.log(`[pass] ${item.name}`);
  } catch (error) {
    fail += 1;
    console.log(`[fail] ${item.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log("");
console.log("== v1.6.0 tracker benchmark harness planning summary ==");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
console.log("- in-scope unclassified P0/P1 follow-ups: 0");
if (fail > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assertIncludes(text, snippet, label) {
  assert(text.includes(snippet), `${label} missing required wording: ${snippet}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertNoRuntimeToken(text, label) {
  const hits = forbiddenRuntimeTokens.filter((token) => text.includes(`"${token}"`) || text.includes(`'${token}'`));
  if (hits.length > 0) {
    throw new Error(`${label} unexpectedly contains runtime tracker token(s): ${hits.join(", ")}`);
  }
}

function extractSection(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  if (start < 0) return "";
  const end = text.indexOf(endMarker, start + startMarker.length);
  return end < 0 ? text.slice(start) : text.slice(start, end);
}

function extractBetween(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  if (start < 0) return "";
  const end = text.indexOf(endMarker, start + startMarker.length);
  return end < 0 ? text.slice(start) : text.slice(start, end);
}

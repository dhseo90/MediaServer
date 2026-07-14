#!/usr/bin/env node
// 파일 용도: REVIEW4-64 stable contract DTO의 service/core 역참조 제거와 AnalysisEvent 계약 불변을 검증한다.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`V390 REVIEW4-64 stable contract leaf boundary verification

Usage:
  ./server.sh verify-v390-stable-contract-leaf-boundary

Checks:
  - stable DTO header의 stdafx/service 역참조 제거와 직접 표준 include
  - AnalysisEvent field/order/default의 analysis_types owner 이동 불변
  - VA metadata header/implementation owner 분리와 current graph delta
  - 독립 compiled contract harness와 mutation negatives
`);
}
assertKnownOptions(rawArgs, ["h", "help"]);

const analysisTypes = read("include/analysis/analysis_types.h");
const mediaTypes = read("include/media_types.h");
const rtspContext = read("include/ingress/rtsp_request_context.h");
const eventRule = read("include/analysis/event_rule_engine.h");
const vaHeader = read("include/analysis/va_runtime_metadata.h");
const objectTracker = read("include/analysis/object_tracker.h");
const appearanceExtractor = read("include/analysis/appearance_extractor.h");
const rawVideoDecoder = read("include/analysis/raw_video_decoder.h");
const rawVideoDecoderImpl = read("src/analysis/raw_video_decoder.cpp");
const graph = JSON.parse(read("test/fixtures/v390_structure_stabilization_current_graph.json"));
const ledger = JSON.parse(read("test/fixtures/v390_structure_stabilization_execution.json"));
const checks = [];

const expectedEventBody = normalizeCpp(`
    std::string event_id;
    std::string rule_id;
    std::string event_type;
    std::uint64_t track_id{0};
    int class_id{-1};
    std::string label;
    float score{0.0F};
    RectF box;
    std::string highlight_color{"#ff0000"};
    int highlight_duration_ms{1200};
    bool highlight_enabled{true};
    bool post_enabled{false};
    std::string post_url;
    std::string status;
    std::int64_t start_time_ms{0};
    std::int64_t update_time_ms{0};
    std::int64_t end_time_ms{0};
    std::string zone_id;
    std::string line_id;
    std::string scenario_name;
    std::string scenario_phase;
    std::string metadata_json;
`);

check("stable DTO headers are self-contained leaves", () => {
  assert(leafHeadersValid(analysisTypes, mediaTypes, rtspContext),
    "stable DTO header retains stdafx or misses a direct standard include");
  assert(objectTracker.includes('#include "app_config.h"') &&
    appearanceExtractor.includes('#include "app_config.h"'),
  "former transitive AppConfig consumers are not self-contained");
  assert(["functional", "memory"].every(header => rawVideoDecoder.includes(`#include <${header}>`)) &&
    rawVideoDecoderImpl.includes("#include <thread>"),
  "former transitive decoder standard-library dependencies are not direct");
});

check("AnalysisEvent has one exact contract owner and no service include", () => {
  assert(normalizeCpp(extractStructBody(analysisTypes, "AnalysisEvent")) === expectedEventBody,
    "AnalysisEvent field/order/default contract drift");
  assert(!eventRule.includes("struct AnalysisEvent") &&
    eventRule.includes('#include "analysis/analysis_types.h"'),
  "event rule service still owns or cannot consume the AnalysisEvent contract");
  assert(vaHeader.includes('#include "analysis/analysis_types.h"') &&
    !vaHeader.includes('#include "analysis/event_rule_engine.h"'),
  "VA metadata contract still includes the event rule service header");
});

check("current graph removes stable reverse dependencies without metric drift", () => {
  assert(graph.expectedFileOwnershipSha256 ===
    "2f82606268392991ad93a9e29ce0f2bad08ffcaf794a10deabd249ac561ecb89",
  "stable leaf ownership digest drift");
  assert(!graph.observedModuleEdges.some(edge =>
    edge.direction === "stable-contract-dtos -> analysis-services" ||
    edge.direction === "stable-contract-dtos -> core-utilities"),
  "stable contract reverse dependency remains in current graph");
  assert(graph.observedModuleEdges.length === 29 &&
    graph.observedModuleEdges.filter(edge => edge.allowedByTarget === false).length === 17,
  "stable leaf direction/violation metric drift");
  assert(JSON.stringify(graph.stronglyConnectedComponents) === JSON.stringify([[
    "analysis-services", "application-service-interfaces", "core-media-interfaces",
  ]]), "stable leaf SCC drift");
  const stableOwner = graph.moduleClassifiers.find(item => item.id === "stable-contract-dtos");
  assert(!stableOwner.exactFiles.includes("src/analysis/va_runtime_metadata.cpp"),
    "VA metadata implementation remains classified as stable DTO");
  assert(ledger.currentArchitecturePolicy.sha256 ===
    "1271a9838e6640056a8047b48e7e7f9f12d8bffdbb3d8c859b80216f22cdefd0" &&
    graph.cmake.targets.length === 2 && graph.cmake.internalTargetSeparation === true,
  "Policy v1 or CMake separation drift");
});

check("standalone AnalysisEvent contract compiles with exact defaults", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "media-server-stable-event-contract-"));
  try {
    const source = path.join(tempDir, "contract.cpp");
    const binary = path.join(tempDir, "contract");
    fs.writeFileSync(source, `
#include "analysis/analysis_types.h"
#include <type_traits>
int main() {
  analysis::AnalysisEvent event;
  static_assert(std::is_standard_layout_v<analysis::AnalysisEvent>);
  if (event.track_id != 0 || event.class_id != -1 || event.score != 0.0F) return 1;
  if (event.highlight_color != "#ff0000" || event.highlight_duration_ms != 1200) return 2;
  if (!event.highlight_enabled || event.post_enabled) return 3;
  if (event.start_time_ms != 0 || event.update_time_ms != 0 || event.end_time_ms != 0) return 4;
  event.event_id = "event";
  event.box = analysis::RectF{0.1F, 0.2F, 0.3F, 0.4F};
  return event.event_id == "event" && event.box.width == 0.3F ? 0 : 5;
}
`);
    execFileSync(process.env.CXX || "c++", ["-std=c++17", "-I", path.join(rootDir, "include"), source, "-o", binary],
      { cwd: rootDir, stdio: "pipe" });
    execFileSync(binary, [], { cwd: rootDir, stdio: "pipe" });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

check("stable leaf and event contract mutations fail closed", () => {
  assert(!leafHeadersValid(`#include "stdafx.h"\n${analysisTypes}`, mediaTypes, rtspContext),
    "stdafx restoration mutation was accepted");
  assert(normalizeCpp(extractStructBody(
    analysisTypes.replace("int highlight_duration_ms{1200};", "int highlight_duration_ms{999};"), "AnalysisEvent")) !==
    expectedEventBody, "AnalysisEvent default mutation was accepted");
  assert((vaHeader + '\n#include "analysis/event_rule_engine.h"\n').includes("event_rule_engine.h"),
    "service include mutation was not observable");
  const mutated = structuredClone(graph);
  mutated.moduleClassifiers.find(item => item.id === "stable-contract-dtos")
    .exactFiles.push("src/analysis/va_runtime_metadata.cpp");
  assert(mutated.moduleClassifiers.find(item => item.id === "stable-contract-dtos")
    .exactFiles.includes("src/analysis/va_runtime_metadata.cpp"),
  "implementation owner mutation was not observable");
});

for (const item of checks) {
  console.log(`- ${item.status}: ${item.name}${item.detail ? ` — ${item.detail}` : ""}`);
}
const passed = checks.filter(item => item.status === "PASS").length;
const failed = checks.length - passed;
console.log(`- summary: pass=${passed} fail=${failed}`);
process.exit(failed === 0 ? 0 : 1);

function leafHeadersValid(analysis, media, rtsp) {
  if ([analysis, media, rtsp].some(text => text.includes('#include "stdafx.h"'))) return false;
  return ["cstddef", "cstdint", "optional", "sstream", "string", "vector"]
    .every(header => analysis.includes(`#include <${header}>`)) &&
    ["cstdint", "string", "unordered_map", "vector"]
      .every(header => media.includes(`#include <${header}>`)) &&
    ["optional", "string", "unordered_map"]
      .every(header => rtsp.includes(`#include <${header}>`));
}

function extractStructBody(text, name) {
  const marker = `struct ${name}`;
  const start = text.indexOf(marker);
  if (start < 0) return "";
  const open = text.indexOf("{", start + marker.length);
  if (open < 0) return "";
  let depth = 1;
  for (let index = open + 1; index < text.length; index += 1) {
    if (text[index] === "{") depth += 1;
    if (text[index] === "}") depth -= 1;
    if (depth === 0) return text.slice(open + 1, index);
  }
  return "";
}

function normalizeCpp(text) {
  return text.replace(/\/\/[^\n]*/g, " ").replace(/\s+/g, " ").trim();
}

function read(file) {
  return fs.readFileSync(path.join(rootDir, file), "utf8");
}

function check(name, fn) {
  try {
    fn();
    checks.push({ name, status: "PASS" });
  } catch (error) {
    checks.push({ name, status: "FAIL", detail: error.message });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

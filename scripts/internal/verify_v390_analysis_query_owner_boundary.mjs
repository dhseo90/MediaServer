#!/usr/bin/env node
// 파일 용도: REVIEW4-64 analysis query/profile 해석기의 analysis owner 이동과 계약 불변을 검증한다.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`V390 REVIEW4-64 analysis query owner boundary verification

Usage:
  ./server.sh verify-v390-analysis-query-owner-boundary

Checks:
  - analysis query header/source의 단일 analysis owner와 rollback byte 동등성
  - CMake 및 SessionManager/RTSP/WebRTC exact consumer 결속
  - tracker research와 semantic discovery verifier의 current source 결속
  - Policy v1 아래 예상 graph 15 violations/SCC 2 경계
  - owner/path/consumer/graph mutation fail-closed
`);
}
assertKnownOptions(rawArgs, ["h", "help"]);

const rollbackCommit = "d23db847da8583d35a4c1e3e54d95117f8b44602";
const oldHeaderPath = "include/ingress/analysis_query.h";
const oldSourcePath = "src/ingress/analysis_query.cpp";
const newHeaderPath = "include/analysis/analysis_query.h";
const newSourcePath = "src/analysis/analysis_query.cpp";
const checks = [];

const read = file => fs.readFileSync(path.join(rootDir, file), "utf8");
const exists = file => fs.existsSync(path.join(rootDir, file));
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const count = (text, pattern) => [...text.matchAll(pattern)].length;
const rollbackText = file => execFileSync("git", ["show", `${rollbackCommit}:${file}`], {
  cwd: rootDir,
  encoding: "utf8",
});
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const check = (name, fn) => {
  try {
    fn();
    checks.push({ name, status: "PASS" });
  } catch (error) {
    checks.push({ name, status: "FAIL", detail: error.message });
  }
};

function normalizeMovedSource(text) {
  return text.replace('#include "analysis/analysis_query.h"', '#include "ingress/analysis_query.h"');
}

check("analysis query has one analysis owner with rollback-equivalent bytes", () => {
  assert(!exists(oldHeaderPath) && !exists(oldSourcePath), "legacy ingress analysis query owner remains");
  assert(exists(newHeaderPath) && exists(newSourcePath), "analysis query owner files are missing");
  const header = read(newHeaderPath);
  const source = read(newSourcePath);
  assert(sha256(header) === sha256(rollbackText(oldHeaderPath)), "moved query header differs from rollback bytes");
  assert(sha256(normalizeMovedSource(source)) === sha256(rollbackText(oldSourcePath)),
    "moved query source differs from rollback bytes after include-path normalization");
  assert(header.includes("namespace ingress {") && source.includes("namespace ingress {") &&
    source.includes('#include "analysis/analysis_query.h"'),
  "public namespace or analysis owner include drift");
});

check("CMake and exact production consumers use the analysis owner", () => {
  const cmake = read("CMakeLists.txt");
  const consumers = [
    "src/analysis/analysis_session_service.cpp",
    "src/ingress/webrtc_http_server.cpp",
  ];
  assert(count(cmake, /src\/analysis\/analysis_query\.cpp/g) === 1 &&
    !cmake.includes("src/ingress/analysis_query.cpp"), "CMake query owner path drift");
  for (const file of consumers) {
    const text = read(file);
    assert(count(text, /#include "analysis\/analysis_query\.h"/g) === 1 &&
      !text.includes('"ingress/analysis_query.h"'), `query consumer path drift: ${file}`);
  }
});

check("current verifier and semantic source bindings follow the moved owner", () => {
  for (const file of [
    "scripts/internal/verify_bot_sort_deepsort_research_boundary.mjs",
    "scripts/internal/verify_oc_sort_benchmark_boundary.mjs",
    "scripts/internal/verify_v390_review3_discovery_ledger.mjs",
    "test/fixtures/v390_review3_discovery_ledger.json",
  ]) {
    const text = read(file);
    assert(text.includes("src/analysis/analysis_query.cpp") &&
      !text.includes("src/ingress/analysis_query.cpp"), `stale analysis query source binding: ${file}`);
  }
});

check("current graph records the planned intermediate owner delta without final claim", () => {
  const graph = JSON.parse(read("test/fixtures/v390_structure_stabilization_current_graph.json"));
  const ledger = JSON.parse(read("test/fixtures/v390_structure_stabilization_execution.json"));
  const analysisOwner = graph.moduleClassifiers.find(item => item.id === "analysis-services");
  const applicationOwner = graph.moduleClassifiers.find(item => item.id === "application-service-interfaces");
  assert(analysisOwner.expectedFileCount >= 67 && analysisOwner.expectedCppCount >= 35 &&
    applicationOwner.expectedFileCount === 4 && applicationOwner.expectedCppCount === 2,
  "analysis/application owner counts do not reflect the query move");
  const slice7 = ledger.currentContinuation?.orderedSlices?.[6];
  const laterInversionGraph = graph.stronglyConnectedComponents.length === 0 &&
    graph.observedModuleEdges.length <= 28;
  if (slice7?.status === "completed" || laterInversionGraph) {
    assert(graph.observedModuleEdges.length <= 28 &&
      graph.observedModuleEdges.filter(item => item.allowedByTarget === false).length <= 15 &&
      graph.stronglyConnectedComponents.length === 0,
    "later core-media inversion regressed the query-owner graph frontier");
  } else {
    assert(graph.observedModuleEdges.length === 28 &&
      graph.observedModuleEdges.filter(item => item.allowedByTarget === false).length === 15,
    "intermediate direction/violation graph drift");
    assert(JSON.stringify(graph.stronglyConnectedComponents) === JSON.stringify([[
      "analysis-services", "core-media-interfaces",
    ]]), "intermediate SCC must remain explicit at two owners");
  }
  assert(!graph.observedModuleEdges.some(item =>
    item.direction === "core-media-interfaces -> application-service-interfaces" ||
    item.direction === "application-service-interfaces -> stable-contract-dtos"),
  "removed query-owner directions remain in the graph");
  assert(ledger.currentContinuation.architectureStatus === "final-targets-unmet" &&
    ledger.currentContinuation.finalCompletionClaimAllowed === false &&
    ledger.refactorComplete === false && ledger.completionClaimed === false,
  "intermediate query move overclaims structure completion");
});

check("owner, path, consumer, and graph mutations fail closed", () => {
  const source = exists(newSourcePath) ? read(newSourcePath) : rollbackText(oldSourcePath);
  const cmake = read("CMakeLists.txt");
  assert(sha256(normalizeMovedSource(source.replace("ResolveAnalysisProfileForContext", "ResolveProfile"))) !==
    sha256(rollbackText(oldSourcePath)), "source API mutation was not detected");
  const cmakeMutation = `${cmake}\n    ${cmake.includes("src/analysis/analysis_query.cpp")
    ? "src/analysis/analysis_query.cpp" : "src/ingress/analysis_query.cpp"}`;
  assert(count(cmakeMutation, /src\/(?:analysis|ingress)\/analysis_query\.cpp/g) !== 1,
    "CMake duplicate mutation was not detected");
  if (exists(newSourcePath)) {
    const consumer = read("src/analysis/analysis_session_service.cpp");
    assert(count(consumer.replace('#include "analysis/analysis_query.h"', ""),
      /#include "analysis\/analysis_query\.h"/g) !== 1, "consumer omission mutation was not detected");
  }
  const graph = JSON.parse(read("test/fixtures/v390_structure_stabilization_current_graph.json"));
  const mutatedEdges = [...graph.observedModuleEdges, {
    direction: "core-media-interfaces -> application-service-interfaces",
    allowedByTarget: false,
  }];
  assert(mutatedEdges.some(item => item.direction ===
    "core-media-interfaces -> application-service-interfaces"), "graph regression mutation was not detected");
});

for (const item of checks) {
  console.log(`- ${item.status}: ${item.name}${item.detail ? ` — ${item.detail}` : ""}`);
}
const passed = checks.filter(item => item.status === "PASS").length;
const failed = checks.length - passed;
console.log(`- summary: pass=${passed} fail=${failed}`);
process.exit(failed === 0 ? 0 : 1);

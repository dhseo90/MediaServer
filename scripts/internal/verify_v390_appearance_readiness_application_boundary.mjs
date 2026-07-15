#!/usr/bin/env node
// REVIEW4-64 Slice 17: transport Re-ID readiness through a dependency-free application boundary.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`V390 appearance readiness application boundary verification

Usage:
  ./server.sh verify-v390-appearance-readiness-application-boundary

Checks:
  - dependency-free request/readiness DTOs preserve the exact runtime fields
  - the application implementation is the only transport-side analysis adapter
  - the Ops route no longer owns analysis AppearanceExtractor types
  - the compiled Re-ID readiness matrix exercises the application mapping
  - CMake/current graph bind the exact Slice 17 successor
`);
}
assertKnownOptions(rawArgs, ["h", "help"]);

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = file => fs.readFileSync(path.join(rootDir, file), "utf8");
const exists = file => fs.existsSync(path.join(rootDir, file));
const checks = [];
const headerPath = "include/ingress/appearance_readiness_application_service.h";
const sourcePath = "src/ingress/appearance_readiness_application_service.cpp";
const detailPath = "src/ingress/webrtc_http_server_detail.h";
const routePath = "src/ingress/webrtc_http_server_ops_workflows.cpp";
const transportFiles = [
  "include/ingress/http_auth.h", "include/ingress/webrtc_http_runtime_config.h",
  "src/ingress/http_auth.cpp", "include/ingress/webrtc_http_server.h",
  "src/ingress/webrtc_http_server.cpp", "src/ingress/webrtc_http_server_ops_foundation.cpp",
  "src/ingress/webrtc_http_server_ops_workflows.cpp", "src/ingress/webrtc_http_server_ops_incidents.cpp",
  "src/ingress/webrtc_http_server_runtime.cpp", "src/ingress/webrtc_http_server_detail.h",
];
const requestFields = [
  "enabled", "extractor_name", "model_path", "model_sha256", "model_provenance",
  "input_width", "input_height", "max_embedding_dim", "log_enabled", "async_enabled",
  "max_queue_size", "global_max_queue_size", "per_stream_rate_limit_ms", "max_job_age_ms",
];
const readinessFields = [
  "appearance_enabled", "onnx_reid_extractor_selected", "model_path_configured",
  "model_file_exists", "model_file_regular", "checksum_configured", "checksum_format_valid",
  "openssl_runtime_available", "checksum_readable", "checksum_matches", "provenance_configured",
  "onnxruntime_available", "model_backed_preflight_ready", "fallback_reason",
];
const requestDeclarations = [
  "bool enabled{false};", "std::string extractor_name;", "std::string model_path;",
  "std::string model_sha256;", "std::string model_provenance;", "int input_width{1};",
  "int input_height{1};", "std::size_t max_embedding_dim{1};", "bool log_enabled{false};",
  "bool async_enabled{false};", "std::size_t max_queue_size{1};",
  "std::size_t global_max_queue_size{1};", "int per_stream_rate_limit_ms{0};",
  "int max_job_age_ms{0};",
];
const readinessDeclarations = [
  "bool appearance_enabled{false};", "bool onnx_reid_extractor_selected{false};",
  "bool model_path_configured{false};", "bool model_file_exists{false};",
  "bool model_file_regular{false};", "bool checksum_configured{false};",
  "bool checksum_format_valid{false};", "bool openssl_runtime_available{false};",
  "bool checksum_readable{false};", "bool checksum_matches{false};",
  "bool provenance_configured{false};", "bool onnxruntime_available{false};",
  "bool model_backed_preflight_ready{false};",
  'std::string fallback_reason{"appearance-disabled"};',
];
const routeMappings = [
  ["enabled", "analysis_appearance_enabled"],
  ["extractor_name", "analysis_appearance_extractor"],
  ["model_path", "analysis_appearance_model_path"],
  ["model_sha256", "analysis_appearance_model_sha256"],
  ["model_provenance", "analysis_appearance_model_provenance"],
  ["input_width", "analysis_appearance_input_width"],
  ["input_height", "analysis_appearance_input_height"],
  ["max_embedding_dim", "analysis_appearance_max_embedding_dim"],
  ["log_enabled", "analysis_appearance_log_enabled"],
  ["async_enabled", "analysis_appearance_async_enabled"],
  ["max_queue_size", "analysis_appearance_max_queue"],
  ["global_max_queue_size", "analysis_appearance_global_max_queue"],
  ["per_stream_rate_limit_ms", "analysis_appearance_per_stream_rate_limit_ms"],
  ["max_job_age_ms", "analysis_appearance_max_job_age_ms"],
];

function check(name, fn) {
  try { fn(); checks.push({ name, status: "PASS" }); }
  catch (error) { checks.push({ name, status: "FAIL", detail: error.message }); }
}
function assert(condition, message) { if (!condition) throw new Error(message); }
function structBody(text, name) {
  const match = text.match(new RegExp(`struct\\s+${name}\\s*\\{([\\s\\S]*?)\\n\\};`));
  assert(match, `struct missing: ${name}`);
  return match[1];
}
function declaredFields(body) {
  return [...body.matchAll(/^\s*(?:bool|int|std::size_t|std::string)\s+([A-Za-z_]\w*)\s*(?:\{[^;]*\})?\s*;/gm)]
    .map(match => match[1]);
}
function declarationLines(body) {
  return body.split("\n").map(line => line.trim()).filter(Boolean);
}
function extractBraceBlock(text, anchor) {
  const anchorIndex = text.indexOf(anchor);
  assert(anchorIndex >= 0, `anchor missing: ${anchor}`);
  const start = text.indexOf("{", anchorIndex + anchor.length);
  assert(start >= 0, `opening brace missing: ${anchor}`);
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === "{") depth += 1;
    else if (char === "}" && --depth === 0) return text.slice(start + 1, index);
  }
  throw new Error(`unterminated brace block: ${anchor}`);
}

check("dependency-free request and readiness DTOs are exact", () => {
  assert(exists(headerPath), `${headerPath} missing`);
  const header = read(headerPath);
  const includes = [...header.matchAll(/^\s*#\s*include\s*([<"][^>"]+[>"])/gm)].map(match => match[1]);
  assert(JSON.stringify(includes) === JSON.stringify(["<cstddef>", "<string>"]),
    `public application header include set drift: ${includes.join(",")}`);
  assert(!/#\s*include\s*["<](analysis|core|domain)\//.test(header),
    "public application header must not include analysis/core/domain");
  assert(!/\banalysis::|AppearanceExtractorOptions|AppearanceModelReadiness\b/.test(header),
    "public application header exposes analysis types");
  const requestBody = structBody(header, "AppearanceReadinessRequest");
  const readinessBody = structBody(header, "AppearanceReadinessView");
  assert(JSON.stringify(declaredFields(requestBody)) ===
    JSON.stringify(requestFields), "request field order/count drift");
  assert(JSON.stringify(declarationLines(requestBody)) === JSON.stringify(requestDeclarations),
    "request type/default declaration drift");
  assert(JSON.stringify(declaredFields(readinessBody)) ===
    JSON.stringify(readinessFields), "readiness field order/count drift");
  assert(JSON.stringify(declarationLines(readinessBody)) === JSON.stringify(readinessDeclarations),
    "readiness type/default declaration drift");
});

check("application implementation owns the exact analysis mapping", () => {
  assert(exists(sourcePath), `${sourcePath} missing`);
  const source = read(sourcePath);
  const body = extractBraceBlock(source, "AppearanceReadinessView InspectAppearanceReadiness(");
  assert(source.includes('#include "analysis/appearance_extractor.h"'),
    "application implementation must own analysis include");
  assert(source.includes("analysis::InspectAppearanceModelReadiness(options)"),
    "application implementation must delegate to canonical analysis inspector");
  for (const field of ["enabled", "model_path", "log_enabled", "async_enabled"]) {
    assert(source.includes(`options.${field} = request.${field}`), `request mapping missing ${field}`);
  }
  for (const snippet of [
    "options.extractor_name = NormalizedLower(request.extractor_name)",
    "options.model_sha256 = NormalizedLower(request.model_sha256)",
    "options.model_provenance = Trim(request.model_provenance)",
    "options.input_width = std::max(1, request.input_width)",
    "options.input_height = std::max(1, request.input_height)",
    "options.max_embedding_dim = std::max<std::size_t>(1, request.max_embedding_dim)",
    "options.max_queue_size = std::max<std::size_t>(1, request.max_queue_size)",
    "options.global_max_queue_size = std::max<std::size_t>(1, request.global_max_queue_size)",
    "options.per_stream_rate_limit_ms = std::max(0, request.per_stream_rate_limit_ms)",
    "options.max_job_age_ms = std::max(0, request.max_job_age_ms)",
  ]) assert(source.includes(snippet), `normalization mapping missing: ${snippet}`);
  for (const field of readinessFields) {
    assert(source.includes(`output.${field} = readiness.${field}`), `readiness mapping missing ${field}`);
  }
  assert(JSON.stringify([...body.matchAll(/\boptions\.([A-Za-z_]\w*)\s*=/g)].map(match => match[1])) ===
    JSON.stringify(requestFields), "request option assignment count/order drift");
  assert(JSON.stringify([...body.matchAll(/\boutput\.([A-Za-z_]\w*)\s*=/g)].map(match => match[1])) ===
    JSON.stringify(readinessFields), "readiness output assignment count/order drift");
});

check("transport consumes only the application readiness boundary", () => {
  const detail = read(detailPath);
  const route = read(routePath);
  const routeBody = extractBraceBlock(route, "std::string OpsV390ReidAssistDecisionJson(");
  const assertBoundary = (detailText, routeText) => {
    assert(detailText.includes('#include "ingress/appearance_readiness_application_service.h"'),
      "transport detail missing application readiness include");
    assert(!detailText.includes('#include "analysis/appearance_extractor.h"'),
      "transport detail still includes analysis appearance owner");
    assert(routeText.includes("AppearanceReadinessRequest") &&
      routeText.includes("InspectAppearanceReadiness(appearance_request)"),
    "Ops route does not consume application readiness service");
    assert(!routeText.includes("analysis::AppearanceExtractorOptions") &&
      !routeText.includes("analysis::InspectAppearanceModelReadiness(appearance_options)"),
    "Ops route still owns analysis readiness types");
  };
  assertBoundary(detail, route);
  const actualMappings = [...routeBody.matchAll(
    /\bappearance_request\.([A-Za-z_]\w*)\s*=\s*config\.([A-Za-z_]\w*)\s*;/g,
  )].map(match => [match[1], match[2]]);
  assert(JSON.stringify(actualMappings) === JSON.stringify(routeMappings),
    "route raw config-to-request mapping count/order drift");
  assert(!routeBody.includes("normalized_lower") && !routeBody.includes("Trim(") &&
    !routeBody.includes("std::max"),
  "route must not duplicate application normalization");
  for (const file of transportFiles) {
    const text = read(file);
    assert(!text.includes('#include "analysis/appearance_extractor.h"') &&
      !text.includes("analysis::AppearanceExtractorOptions") &&
      !/analysis::InspectAppearanceModelReadiness\s*\(/.test(text),
    `transport direct appearance dependency remains: ${file}`);
  }
  let rejected = false;
  try {
    assertBoundary(detail.replace('#include "ingress/appearance_readiness_application_service.h"',
      '#include "analysis/appearance_extractor.h"'), route);
  } catch { rejected = true; }
  assert(rejected, "analysis include reintroduction mutation was not rejected");
});

check("compiled Re-ID matrix exercises the application boundary", () => {
  const smoke = read("scripts/internal/reid_readiness_smoke.cpp");
  const runner = read("scripts/internal/verify_reid_readiness_smoke.sh");
  assert(smoke.includes('#include "ingress/appearance_readiness_application_service.h"') &&
    smoke.includes("ingress::InspectAppearanceReadiness"),
  "compiled smoke does not exercise application readiness");
  assert(runner.includes("src/ingress/appearance_readiness_application_service.cpp"),
    "compiled smoke runner omits application implementation");
  execFileSync(path.join(rootDir, "scripts/internal/verify_reid_readiness_smoke.sh"), [], {
    cwd: rootDir,
    stdio: "pipe",
  });
});

check("CMake and current graph preserve Slice 17 at the Slice 18 successor", () => {
  const cmake = read("CMakeLists.txt");
  const graph = JSON.parse(read("test/fixtures/v390_structure_stabilization_current_graph.json"));
  assert(cmake.includes(sourcePath), "CMake source binding missing");
  const assertGraphBoundary = value => {
    const applicationOwner = value.moduleClassifiers.find(item => item.id === "application-service-interfaces");
    assert(applicationOwner?.exactFiles.includes(headerPath) && applicationOwner.exactFiles.includes(sourcePath) &&
      applicationOwner.expectedFileCount === 25 && applicationOwner.expectedCppCount === 10,
    "current graph application ownership binding missing");
    const edge = direction => value.observedModuleEdges.find(item => item.direction === direction);
    assert(edge("transport-and-auth-adapter -> analysis-services")?.witnessCount === 11 &&
      edge("transport-and-auth-adapter -> analysis-services")?.allowedByTarget === false,
    "Slice 18 successor must preserve the Slice 17 boundary and reduce the next witness to 16");
    assert(edge("application-service-interfaces -> analysis-services")?.witnessCount === 8 &&
      edge("application-service-interfaces -> analysis-services")?.allowedByTarget === true &&
      edge("transport-and-auth-adapter -> application-service-interfaces")?.witnessCount === 13 &&
      edge("transport-and-auth-adapter -> application-service-interfaces")?.allowedByTarget === true,
    "application successor edges drift");
    assert(value.observedModuleEdges.filter(item => item.allowedByTarget === false).length === 3 &&
      value.stronglyConnectedComponents.length === 0,
    "Slice 17 must preserve violations=3 and SCC=0");
  };
  assertGraphBoundary(graph);
  const mutated = structuredClone(graph);
  mutated.observedModuleEdges.find(item =>
    item.direction === "transport-and-auth-adapter -> analysis-services").witnessCount = 12;
  let rejected = false;
  try { assertGraphBoundary(mutated); } catch { rejected = true; }
  assert(rejected, "transport-to-analysis graph regression mutation was not rejected");
});

for (const item of checks) {
  console.log(`- ${item.status}: ${item.name}${item.detail ? ` — ${item.detail}` : ""}`);
}
const failures = checks.filter(item => item.status === "FAIL");
console.log(`- summary: pass=${checks.length - failures.length} fail=${failures.length}`);
if (failures.length > 0) process.exit(1);

#!/usr/bin/env node
// 파일 용도: REVIEW4-64 Slice 13의 analysis→core-utilities runtime port 역전을 검증한다.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`V390 REVIEW4-64 analysis runtime port boundary

Usage:
  ./server.sh verify-v390-analysis-runtime-port-boundary

Checks:
  - analysis runtime config는 core-media port가 소유하고 AppConfig는 그 계약을 상속
  - analysis owner의 AppConfig/debug/command/stream-key 직접 include·호출 제거
  - config/debug/command 의미는 core-media adapter가 기존 core utility로 정확히 위임
  - current graph에서 analysis-services -> core-utilities 방향만 제거
  - isolated source/adapter/graph mutations fail closed
`);
}
assertKnownOptions(rawArgs, ["h", "help", "skip-mutations"]);

const skipMutations = rawArgs.includes("--skip-mutations");
const read = file => fs.readFileSync(path.join(rootDir, file), "utf8");
const exists = file => fs.existsSync(path.join(rootDir, file));
const checks = [];
const check = (name, fn) => {
  try {
    fn();
    checks.push({ name, status: "PASS" });
  } catch (error) {
    checks.push({ name, status: "FAIL", detail: error.message });
  }
};
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const sha256Text = value => crypto.createHash("sha256").update(value).digest("hex");
const normalizeCpp = value => value.replace(/\s+/g, " ").trim();

function structBody(text, declaration) {
  const start = text.indexOf(declaration);
  assert(start >= 0, `missing struct declaration: ${declaration}`);
  const open = text.indexOf("{", start + declaration.length);
  let depth = 0;
  for (let index = open; index < text.length; index += 1) {
    if (text[index] === "{") depth += 1;
    else if (text[index] === "}" && --depth === 0) return text.slice(open + 1, index);
  }
  throw new Error(`unterminated struct declaration: ${declaration}`);
}

const forbiddenAnalysisIncludes = [
  "app_config.h",
  "stdafx.h",
  "core/command_runner.h",
  "core/resource_guard.h",
  "core/runtime_debug_counters.h",
  "core/source_request_parser.h",
  "core/stream_key.h",
];

function walk(dir) {
  const absolute = path.join(rootDir, dir);
  if (!fs.existsSync(absolute)) return [];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap(entry => {
    const relative = path.posix.join(dir, entry.name);
    return entry.isDirectory() ? walk(relative) : [relative];
  });
}

function analysisFiles() {
  return [
    ...walk("include/analysis"),
    ...walk("src/analysis"),
    "include/ingress/analysis_overlay_probe.h",
    "src/ingress/analysis_overlay_probe.cpp",
  ].filter(file => /\.(?:h|hpp|cc|cpp|cxx)$/.test(file)).sort();
}

function inspectAnalysisBoundary(overrides = new Map()) {
  const errors = [];
  for (const file of analysisFiles()) {
    const text = overrides.get(file) ?? read(file);
    for (const include of forbiddenAnalysisIncludes) {
      const pattern = new RegExp(`^\\s*#\\s*include\\s*["<]${include.replaceAll("/", "\\/").replaceAll(".", "\\.")}[">]`, "m");
      if (pattern.test(text)) errors.push(`${file}:direct-include:${include}`);
    }
    if (/\bapp::GetAppConfig\s*\(/.test(text)) errors.push(`${file}:global-app-config`);
    if (/\bapp::AppConfig\b/.test(text)) errors.push(`${file}:app-config-type`);
    if (/\bapp_config::/.test(text)) errors.push(`${file}:app-config-symbol`);
    if (/\bcore::analysis_defaults::/.test(text)) errors.push(`${file}:utility-default-symbol`);
    if (/\bcore::runtime_debug::/.test(text)) errors.push(`${file}:runtime-debug-direct-call`);
    if (/\bcore::RunCommandCapture\s*\(/.test(text)) errors.push(`${file}:command-runner-direct-call`);
  }
  return errors;
}

function inspectPortBoundary(values = {}) {
  const header = values.header ?? read("include/core/analysis_runtime_port.h");
  const dataHeader = values.dataHeader ?? read("include/core/analysis_runtime_config_data.h");
  const source = values.source ?? read("src/core/analysis_runtime_port.cpp");
  const appConfig = values.appConfig ?? read("include/app_config.h");
  const cmake = values.cmake ?? read("CMakeLists.txt");
  const errors = [];
  for (const anchor of [
    "using AnalysisRuntimeConfig = AnalysisRuntimeConfigData",
    "const AnalysisRuntimeConfig& GetAnalysisRuntimeConfig()",
    "CommandResult RunAnalysisCommandCapture(",
    "RecordAnalysisTapAttached(",
    "RecordAnalysisTapDetached(",
    "RecordAnalysisMetadataJsonBytes(",
    "RecordAnalysisOverlayProbeAttached()",
    "RecordAnalysisOverlayProbeRemoved()",
  ]) if (!header.includes(anchor)) errors.push(`header:${anchor}`);
  if (!dataHeader.includes("struct AnalysisRuntimeConfigData")) errors.push("data-header:config-data");
  if (dataHeader.includes("stdafx.h") || dataHeader.includes("app_config::"))
    errors.push("data-header:core-utility-default-owner");
  if (!appConfig.includes("struct AppConfig : core::AnalysisRuntimeConfigData")) errors.push("app-config:inheritance");
  const configBody = structBody(dataHeader, "struct AnalysisRuntimeConfigData");
  const canonicalConfigBody = normalizeCpp(configBody.replaceAll("core::analysis_defaults::", "app_config::"));
  if ((configBody.match(/;/g) || []).length !== 148 ||
      sha256Text(canonicalConfigBody) !== "29da129daee6f01970770cbb86839c6845542e8e0b12b4a409ace698500acf32")
    errors.push("data-header:exact-148-field-manifest");
  const fieldNames = configBody.split(";").map(statement => {
    const beforeInitializer = statement.trim().split("{", 1)[0].trim();
    return beforeInitializer.match(/([A-Za-z_]\w*)$/)?.[1] || "";
  }).filter(Boolean);
  if (fieldNames.length !== 148 || new Set(fieldNames).size !== 148)
    errors.push("data-header:exact-148-field-name-set");
  const appConfigDeclaration = appConfig.includes("struct AppConfig : core::AnalysisRuntimeConfigData")
    ? "struct AppConfig : core::AnalysisRuntimeConfigData" : "struct AppConfig";
  const appConfigBody = structBody(appConfig, appConfigDeclaration);
  const appConfigFieldNames = appConfigBody.split(";").map(statement => {
    const beforeInitializer = statement.trim().split("{", 1)[0].trim();
    return beforeInitializer.match(/([A-Za-z_]\w*)$/)?.[1] || "";
  }).filter(Boolean);
  if (fieldNames.some(field => appConfigFieldNames.includes(field)))
    errors.push("app-config:duplicate-analysis-fields");
  for (const forbidden of ["#include \"app_config.h\"", "#include \"analysis/", "#include \"ingress/"])
    if (header.includes(forbidden)) errors.push(`header:forbidden:${forbidden}`);
  if (!header.includes("namespace analysis_runtime_defaults") ||
      !header.includes("using namespace analysis_defaults;"))
    errors.push("header:analysis-defaults-port-re-export");
  for (const anchor of [
    "#include \"app_config.h\"",
    "#include \"core/command_runner.h\"",
    "#include \"core/runtime_debug_counters.h\"",
    "return app::GetAppConfig();",
    "return core::RunCommandCapture(arguments, timeout_ms);",
    "core::runtime_debug::RecordAnalysisTapAttached(tap_id);",
    "core::runtime_debug::RecordOverlayProbeRemoved();",
  ]) if (!source.includes(anchor)) errors.push(`source:${anchor}`);
  const normalizedSource = normalizeCpp(source);
  for (const delegation of [
    "const AnalysisRuntimeConfig& GetAnalysisRuntimeConfig() { return app::GetAppConfig(); }",
    "CommandResult RunAnalysisCommandCapture(const std::vector<std::string>& arguments, int timeout_ms) { return core::RunCommandCapture(arguments, timeout_ms); }",
    "void RecordAnalysisOverlayProbeAttached() { core::runtime_debug::RecordOverlayProbeAttached(); }",
    "void RecordAnalysisOverlayProbeRemoved() { core::runtime_debug::RecordOverlayProbeRemoved(); }",
    "void RecordAnalysisTapAttached(const std::string& tap_id) { core::runtime_debug::RecordAnalysisTapAttached(tap_id); }",
    "void RecordAnalysisTapDetached(const std::string& tap_id) { core::runtime_debug::RecordAnalysisTapDetached(tap_id); }",
    "void RecordAnalysisTapCreated(const std::string& tap_id, const std::string& reuse_key, std::size_t ref_count) { core::runtime_debug::RecordAnalysisTapCreated(tap_id, reuse_key, ref_count); }",
    "void RecordAnalysisTapReused(const std::string& tap_id, const std::string& reuse_key, std::size_t ref_count) { core::runtime_debug::RecordAnalysisTapReused(tap_id, reuse_key, ref_count); }",
    "void RecordAnalysisTapRejected(const std::string& reuse_key) { core::runtime_debug::RecordAnalysisTapRejected(reuse_key); }",
    "void RecordAnalysisTapRefCount(const std::string& reuse_key, std::size_t ref_count) { core::runtime_debug::RecordAnalysisTapRefCount(reuse_key, ref_count); }",
    "void RecordAnalysisMetadataJsonBuild() { core::runtime_debug::RecordMetadataJsonBuild(); }",
    "void RecordAnalysisMetadataJsonBytes(std::uint64_t bytes) { core::runtime_debug::RecordMetadataJsonBytes(bytes); }",
  ]) if (!normalizedSource.includes(delegation)) errors.push(`source:exact-delegation:${delegation}`);
  if ((cmake.match(/src\/core\/analysis_runtime_port\.cpp/g) || []).length !== 1)
    errors.push("cmake:analysis-runtime-port-count");
  return errors;
}

function inspectGraph(value) {
  const errors = [];
  const edges = value.observedModuleEdges || [];
  const violations = edges.filter(edge => edge.allowedByTarget === false);
  if (edges.some(edge => edge.direction === "analysis-services -> core-utilities"))
    errors.push("graph:analysis-core-utilities-remains");
  if (edges.length !== 18) errors.push(`graph:edge-count:${edges.length}`);
  if (violations.length !== 4) errors.push(`graph:violation-count:${violations.length}`);
  if ((value.stronglyConnectedComponents || []).length !== 0) errors.push("graph:scc");
  if (value.expectedProductionFiles !== 172 || value.expectedCppFiles !== 85)
    errors.push(`graph:file-count:${value.expectedProductionFiles}/${value.expectedCppFiles}`);
  if (value.boundary !== "current REVIEW4-64 continuation graph after the analysis runtime port boundary; dependency-free analysis defaults and the exact 148-field config contract are shared by AppConfig and analysis through the port, analysis-services -> core-utilities is removed, Policy v1 counts 4 target-direction violations and zero multi-owner SCCs, internal target separation is true, and remaining transport/final-evidence debt keeps completion closed")
    errors.push("graph:boundary-description");
  const expectedViolations = [
    "transport-and-auth-adapter -> analysis-services",
    "transport-and-auth-adapter -> core-media-interfaces",
    "transport-and-auth-adapter -> core-utilities",
    "transport-and-auth-adapter -> domain-and-registry-owners",
  ];
  if (JSON.stringify(violations.map(edge => edge.direction).sort()) !== JSON.stringify(expectedViolations))
    errors.push("graph:unexpected-violation-set");
  return errors;
}

check("analysis runtime config is a core-media port inherited by AppConfig", () => {
  assert(exists("include/core/analysis_runtime_port.h") && exists("src/core/analysis_runtime_port.cpp"),
    "analysis runtime port files are missing");
  assert(exists("include/core/analysis_runtime_config_data.h"),
    "analysis runtime config data file is missing");
  const errors = inspectPortBoundary();
  assert(errors.length === 0, errors.join(", "));
});

check("analysis owners have no direct core-utility dependency", () => {
  const errors = inspectAnalysisBoundary();
  assert(errors.length === 0, errors.join(", "));
});

check("config, command, diagnostics, and stream key cross the declared core-media port", () => {
  const header = read("include/core/analysis_runtime_config_data.h");
  const defaults = read("include/core/analysis_runtime_defaults.h");
  const analysisManager = read("include/analysis/analysis_manager.h");
  for (const field of [
    "default_analysis_detector", "analysis_tracking_lost_buffer_frames",
    "analysis_event_storage_path", "analysis_scenario_enabled",
    "analysis_appearance_model_sha256", "session_trace",
  ]) assert(header.includes(field), `runtime config field missing: ${field}`);
  const defaultsBody = defaults.slice(
    defaults.indexOf("namespace core::analysis_defaults {") + "namespace core::analysis_defaults {".length,
    defaults.indexOf("}  // namespace core::analysis_defaults"));
  assert((defaultsBody.match(/;/g) || []).length === 133 &&
    sha256Text(normalizeCpp(defaultsBody)) === "f32a7bc677a4601f00d1da575556961980be598715e65e093c1f6cc66ffdc54c",
  "analysis runtime exact 133-default manifest drift");
  assert(analysisManager.includes("core/analysis_runtime_port.h") &&
    !analysisManager.includes("core/stream_key.h"), "AnalysisManager bypasses the runtime port");
});

check("current graph removes exactly the analysis-to-core-utilities violation", () => {
  const graph = JSON.parse(read("test/fixtures/v390_structure_stabilization_current_graph.json"));
  const errors = inspectGraph(graph);
  assert(errors.length === 0, errors.join(", "));
});

check("isolated source, adapter, and graph mutations fail closed", () => {
  if (skipMutations) return;
  const target = "src/analysis/analysis_session_service.cpp";
  const sourceMutation = new Map([[target, `#include \"app_config.h\"\n${read(target)}`]]);
  assert(inspectAnalysisBoundary(sourceMutation).some(error => error.includes("direct-include:app_config.h")),
    "direct AppConfig include mutation escaped");
  const getterMutation = new Map([[target, `${read(target)}\n// app::GetAppConfig();\n`]]);
  assert(inspectAnalysisBoundary(getterMutation).some(error => error.includes("global-app-config")),
    "global AppConfig mutation escaped");
  const symbolMutation = new Map([[target, `${read(target)}\nconstexpr auto kLeak = app_config::kDefaultAnalysisFps;\n`]]);
  assert(inspectAnalysisBoundary(symbolMutation).some(error => error.includes("app-config-symbol")),
    "app_config default symbol mutation escaped");
  const utilitySymbolMutation = new Map([[target,
    `${read(target)}\nconstexpr auto kLeak = core::analysis_defaults::kDefaultAnalysisFps;\n`]]);
  assert(inspectAnalysisBoundary(utilitySymbolMutation).some(error => error.includes("utility-default-symbol")),
    "core utility default symbol mutation escaped");
  const appConfig = read("include/app_config.h").replace(
    "struct AppConfig : core::AnalysisRuntimeConfigData", "struct AppConfig");
  assert(inspectPortBoundary({ appConfig }).includes("app-config:inheritance"),
    "AppConfig inheritance mutation escaped");
  const shadowedAppConfig = read("include/app_config.h").replace(
    "struct AppConfig : core::AnalysisRuntimeConfigData {",
    "struct AppConfig : core::AnalysisRuntimeConfigData {\n    std::vector<std::string> analysis_intrusion_dwell_restricted_zone_ids;");
  assert(inspectPortBoundary({ appConfig: shadowedAppConfig }).includes("app-config:duplicate-analysis-fields"),
    "AppConfig analysis field shadow mutation escaped");
  const configData = read("include/core/analysis_runtime_config_data.h").replace(
    "analysis_tracking_iou_weight{core::analysis_defaults::kDefaultAnalysisTrackingIouWeight}",
    "analysis_tracking_iou_weight{core::analysis_defaults::kDefaultAnalysisTrackingDistanceWeight}");
  assert(inspectPortBoundary({ dataHeader: configData }).includes("data-header:exact-148-field-manifest"),
    "non-sample config default mutation escaped");
  const utilityConfigData = read("include/core/analysis_runtime_config_data.h").replace(
    "#include \"core/analysis_runtime_defaults.h\"", "#include \"stdafx.h\"");
  assert(inspectPortBoundary({ dataHeader: utilityConfigData }).includes("data-header:core-utility-default-owner"),
    "transitive stdafx default owner mutation escaped");
  const defaults = read("include/core/analysis_runtime_defaults.h").replace(
    "kDefaultAnalysisAppearanceMaxJobAgeMs = 2000", "kDefaultAnalysisAppearanceMaxJobAgeMs = 2001");
  const defaultsBody = defaults.slice(
    defaults.indexOf("namespace core::analysis_defaults {") + "namespace core::analysis_defaults {".length,
    defaults.indexOf("}  // namespace core::analysis_defaults"));
  assert(sha256Text(normalizeCpp(defaultsBody)) !==
    "f32a7bc677a4601f00d1da575556961980be598715e65e093c1f6cc66ffdc54c",
  "analysis default value mutation escaped");
  const portSource = read("src/core/analysis_runtime_port.cpp").replace(
    "core::runtime_debug::RecordOverlayProbeRemoved();", "");
  assert(inspectPortBoundary({ source: portSource }).some(error => error.includes("RecordOverlayProbeRemoved")),
    "diagnostic delegation mutation escaped");
  const swappedDelegation = read("src/core/analysis_runtime_port.cpp").replace(
    "core::runtime_debug::RecordAnalysisTapCreated(tap_id, reuse_key, ref_count);",
    "core::runtime_debug::RecordAnalysisTapReused(tap_id, reuse_key, ref_count);");
  assert(inspectPortBoundary({ source: swappedDelegation }).some(error => error.includes("exact-delegation")),
    "diagnostic target mutation escaped");
  const graph = JSON.parse(read("test/fixtures/v390_structure_stabilization_current_graph.json"));
  graph.observedModuleEdges.push({
    direction: "analysis-services -> core-utilities", witnessCount: 1, witnessSha256: "mutation", allowedByTarget: false,
  });
  assert(inspectGraph(graph).some(error => error.includes("analysis-core-utilities")),
    "forbidden graph direction mutation escaped");
});

for (const item of checks) {
  if (item.status === "PASS") console.log(`- PASS: ${item.name}`);
  else console.error(`- FAIL: ${item.name}: ${item.detail}`);
}
const passed = checks.filter(item => item.status === "PASS").length;
const failed = checks.length - passed;
console.log(`- summary: pass=${passed} fail=${failed}`);
process.exit(failed === 0 ? 0 : 1);

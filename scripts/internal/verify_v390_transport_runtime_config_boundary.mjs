#!/usr/bin/env node
// 파일 용도: REVIEW4-64 Slice 14 transport runtime config/core-utility 경계를 검증한다.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`V390 transport runtime config boundary verification

Usage:
  ./server.sh verify-v390-transport-runtime-config-boundary

Checks:
  - dependency-free WebRtcHttpRuntimeConfig exact field manifest
  - transport/AppConfig/core utility direct and alias dependency removal
  - composition-root exact mapping, diagnostics/stream-key operations, constructor injection
  - fixed transport ownership and current successor Policy v1 graph 182/89/17/3/SCC0
  - transitive include, relabel, alias, mapping and temporary-exception mutations
`);
}
assertKnownOptions(rawArgs, ["h", "help"]);

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = file => fs.readFileSync(path.join(rootDir, file), "utf8");
const exists = file => fs.existsSync(path.join(rootDir, file));
const sha256Text = text => crypto.createHash("sha256").update(text).digest("hex");
const checks = [];
const runtimeHeaderPath = "include/ingress/webrtc_http_runtime_config.h";
const compositionPath = "src/application/media_server_application.cpp";
const graphPath = "test/fixtures/v390_structure_stabilization_current_graph.json";
const policyPath = "test/fixtures/v390_structure_stabilization_current_architecture_policy.json";
const legacyTransportFiles = [
  "include/ingress/http_auth.h",
  "src/ingress/http_auth.cpp",
  "include/ingress/webrtc_http_server.h",
  "src/ingress/webrtc_http_server.cpp",
  "src/ingress/webrtc_http_server_ops_foundation.cpp",
  "src/ingress/webrtc_http_server_ops_workflows.cpp",
  "src/ingress/webrtc_http_server_ops_incidents.cpp",
  "src/ingress/webrtc_http_server_runtime.cpp",
  "src/ingress/webrtc_http_server_detail.h",
];
const transportFiles = [...legacyTransportFiles, runtimeHeaderPath];
transportFiles.push("include/ingress/webrtc_http_analysis_rule_declarations.h");
const runtimeFields = [
  "stream_route", "rtsp_listen_port", "file_root_path", "default_file_path", "source_registry_path",
  "auth_mode", "auth_admin_token", "auth_operator_token", "auth_viewer_token", "auth_integrator_token",
  "auth_users_file", "auth_session_ttl_seconds", "auth_session_idle_timeout_seconds", "auth_password_policy",
  "auth_password_min_length", "auth_password_history_count", "auth_password_max_age_days",
  "auth_login_max_failures", "auth_login_lockout_seconds", "auth_cookie_name", "auth_cookie_secure",
  "ui_default_home", "enable_lab", "enable_ops", "enable_client",
  "webrtc_va_metadata_channel_enabled", "webrtc_va_metadata_channel_label",
  "webrtc_va_metadata_interval_ms", "webrtc_va_metadata_max_message_bytes",
  "webrtc_va_metadata_max_buffered_bytes", "webrtc_stun_server", "webrtc_turn_server",
  "webrtc_requested_ice_transport_policy", "webrtc_ice_transport_policy", "analysis_registry_path",
  "analysis_event_snapshot_dir", "analysis_event_clip_dir", "analysis_tracking_lost_buffer_frames",
  "analysis_tracking_iou_weight", "analysis_tracking_distance_weight", "analysis_tracking_direction_weight",
  "analysis_tracking_class_weight", "analysis_tracking_min_association_score",
  "analysis_tracking_smoothing_alpha", "analysis_tracking_close_object_guard_mode",
  "analysis_tracking_close_object_distance_ratio", "analysis_tracking_close_object_overlap_threshold",
  "analysis_tracking_close_object_low_margin_threshold", "analysis_tracking_center_jump_penalty",
  "analysis_tracking_close_object_min_score_boost", "analysis_tracking_close_object_max_diagnostics",
  "analysis_appearance_enabled", "analysis_appearance_extractor", "analysis_appearance_model_path",
  "analysis_appearance_model_sha256", "analysis_appearance_model_provenance",
  "analysis_appearance_input_width", "analysis_appearance_input_height",
  "analysis_appearance_max_embedding_dim", "analysis_appearance_log_enabled",
  "analysis_appearance_async_enabled", "analysis_appearance_max_queue",
  "analysis_appearance_global_max_queue", "analysis_appearance_per_stream_rate_limit_ms",
  "analysis_appearance_max_job_age_ms", "youtube_source_build_enabled",
  "runtime_debug_snapshot_json", "build_stream_key",
];
const appearanceFields = runtimeFields.filter(field => field.startsWith("analysis_appearance_"));

function assert(condition, message) { if (!condition) throw new Error(message); }
function check(name, fn) {
  try { fn(); checks.push({ name, status: "PASS" }); }
  catch (error) { checks.push({ name, status: "FAIL", detail: error.message }); }
}
function escapeRegExp(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function count(text, pattern) { return [...text.matchAll(pattern)].length; }
function stripCppComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

function structBody(text, name) {
  const startToken = `struct ${name} {`;
  const start = text.indexOf(startToken);
  if (start < 0) return "";
  const end = text.indexOf("\n};", start + startToken.length);
  return end < 0 ? "" : text.slice(start + startToken.length, end);
}

function declaredFields(text) {
  return structBody(text, "WebRtcHttpRuntimeConfig").split(";").map(statement => {
    const declaration = statement.trim().split("{", 1)[0].trim();
    return declaration.match(/([A-Za-z_]\w*)$/)?.[1] || "";
  }).filter(Boolean);
}

function inspectRuntimeHeader(text) {
  const errors = [];
  const code = stripCppComments(text);
  if (!text.includes("enum class HttpAuthMode") || !text.includes("struct WebRtcHttpRuntimeConfig"))
    errors.push("header:types");
  if (/^\s*#\s*include\s*"/m.test(code) || /\b(?:app|core|analysis)::/.test(code) ||
      /\b(?:AppConfig|GetAppConfig)\b/.test(code)) errors.push("header:transitive-or-owner-leak");
  const fields = declaredFields(text);
  if (fields.length !== runtimeFields.length || new Set(fields).size !== runtimeFields.length ||
      sha256Text(fields.join("\n")) !== "00f626725a90650a1019131dd6baad440aee91440f5a8082bf54657d23c77a56")
    errors.push("header:exact-68-field-manifest");
  for (const field of appearanceFields) if (!fields.includes(field)) errors.push(`header:appearance:${field}`);
  if (!text.includes("std::function<std::string()> runtime_debug_snapshot_json;") ||
      !text.includes("std::function<std::string(int, const std::string&)> build_stream_key;"))
    errors.push("header:operations");
  return errors;
}

function inspectTransportTexts(values) {
  const errors = [];
  const forbidden = /app_config\.h|\bGetAppConfig\b|\bAppConfig\b|\bapp::AuthMode\b|\bcore::runtime_debug\b|\bcore::BuildStreamKey\b/;
  for (const file of transportFiles) {
    const text = stripCppComments(values.get(file) ?? read(file));
    if (forbidden.test(text)) errors.push(`transport:direct-or-alias:${file}`);
  }
  const authHeader = values.get("include/ingress/http_auth.h") ?? read("include/ingress/http_auth.h");
  const authSource = values.get("src/ingress/http_auth.cpp") ?? read("src/ingress/http_auth.cpp");
  if (!authHeader.includes('#include "ingress/webrtc_http_runtime_config.h"') ||
      !authHeader.includes("AuthModeName(HttpAuthMode mode)") ||
      count(authHeader, /const WebRtcHttpRuntimeConfig& config/g) < 20 ||
      count(authSource, /const WebRtcHttpRuntimeConfig& config/g) < 20)
    errors.push("transport:http-auth-runtime-config-api");
  const serverHeader = values.get("include/ingress/webrtc_http_server.h") ?? read("include/ingress/webrtc_http_server.h");
  if (!serverHeader.includes("const WebRtcHttpRuntimeConfig& runtime_config") ||
      !serverHeader.includes("WebRtcHttpRuntimeConfig runtime_config_"))
    errors.push("transport:constructor-injection");
  const bundle = legacyTransportFiles.map(file => values.get(file) ?? read(file)).join("\n");
  if (!bundle.includes("runtime_debug_snapshot_json()") || !bundle.includes("build_stream_key("))
    errors.push("transport:operation-consumption");
  const serverSource = values.get("src/ingress/webrtc_http_server.cpp") ??
    read("src/ingress/webrtc_http_server.cpp");
  const detailHeader = values.get("src/ingress/webrtc_http_server_detail.h") ??
    read("src/ingress/webrtc_http_server_detail.h");
  for (const anchor of [
    "bool AcquireWebRtcHttpRuntimeConfig(const WebRtcHttpRuntimeConfig& config)",
    "std::lock_guard lock(WebRtcHttpRuntimeConfigMutex());",
    "if (WebRtcHttpRuntimeConfigInitialized()) {",
    "WebRtcHttpRuntimeConfigStorage() = config;",
    "WebRtcHttpRuntimeConfigInitialized() = true;",
    "if (!webrtc_http_server_detail::AcquireWebRtcHttpRuntimeConfig(runtime_config_))",
    "throw std::logic_error(\"WebRtcHttpServer supports exactly one process-lifetime instance\")",
  ]) if (!serverSource.includes(anchor)) errors.push(`transport:process-lifetime-lease:${anchor}`);
  if (!detailHeader.includes("bool AcquireWebRtcHttpRuntimeConfig(") ||
      /\bConfigureWebRtcHttpRuntimeConfig\b/.test(bundle))
    errors.push("transport:mutable-process-config-api");
  return errors;
}

function inspectComposition(text) {
  const errors = [];
  if (!text.includes("BuildWebRtcHttpRuntimeConfig(const app::AppConfig& source)"))
    errors.push("composition:builder");
  for (const field of runtimeFields) {
    const assignment = new RegExp(`\\bconfig\\.${escapeRegExp(field)}\\s*=`, "g");
    if (count(text, assignment) !== 1) errors.push(`composition:assignment-count:${field}`);
  }
  for (const field of runtimeFields.filter(field => ![
    "auth_mode", "youtube_source_build_enabled", "runtime_debug_snapshot_json", "build_stream_key",
  ].includes(field))) {
    const mapping = new RegExp(`\\bconfig\\.${escapeRegExp(field)}\\s*=\\s*source\\.${escapeRegExp(field)}\\s*;`);
    if (!mapping.test(text)) errors.push(`composition:wrong-mapping:${field}`);
  }
  for (const anchor of [
    "config.auth_mode = MapHttpAuthMode(source.auth_mode);",
    "config.youtube_source_build_enabled = app::kYouTubeSourceBuildEnabled;",
    "config.runtime_debug_snapshot_json = [] { return core::runtime_debug::SnapshotJson(); };",
    "return core::BuildStreamKey(",
    "const auto webrtc_http_runtime_config = BuildWebRtcHttpRuntimeConfig(config);",
    "session_manager, analysis_sessions, *analysis_session_reads, webrtc_http_runtime_config",
  ]) if (!text.includes(anchor)) errors.push(`composition:anchor:${anchor}`);
  for (const [sourceMode, runtimeMode] of [
    ["Auto", "Auto"], ["Off", "Off"], ["Token", "Token"], ["Session", "Session"],
  ]) {
    const mapping = new RegExp(
      `case\\s+app::AuthMode::${sourceMode}:\\s*return\\s+ingress::HttpAuthMode::${runtimeMode}\\s*;`);
    if (!mapping.test(text)) errors.push(`composition:auth-mode:${sourceMode}->${runtimeMode}`);
  }
  if (count(text, /return\s+ingress::HttpAuthMode::Auto\s*;/g) !== 2)
    errors.push("composition:auth-mode-unknown-fallback");
  const positions = appearanceFields.map(field => text.indexOf(`config.${field} = source.${field};`));
  if (positions.some(position => position < 0) ||
      positions.some((position, index) => index > 0 && positions[index - 1] >= position))
    errors.push("composition:appearance-readiness-order");
  return errors;
}

function inspectOwners(graph) {
  const errors = [];
  const owner = graph.moduleClassifiers.find(item => item.id === "transport-and-auth-adapter");
  if (!owner || owner.expectedFileCount !== 11 || owner.expectedCppCount !== 6 ||
      JSON.stringify([...owner.exactFiles].sort()) !== JSON.stringify([...transportFiles].sort()) ||
      owner.prefixes.length !== 0)
    errors.push("graph:transport-owner-exact-11");
  for (const file of legacyTransportFiles) {
    const owners = graph.moduleClassifiers.filter(item =>
      item.exactFiles.includes(file) || item.prefixes.some(prefix => file.startsWith(prefix)));
    if (owners.length !== 1 || owners[0].id !== "transport-and-auth-adapter")
      errors.push(`graph:legacy-owner-relabel:${file}`);
  }
  return errors;
}

function inspectPolicy(policy) {
  const errors = [];
  const direction = "transport-and-auth-adapter -> core-utilities";
  if (policy.allowedDependencyDirections.includes(direction)) errors.push("policy:hidden-in-allowlist");
  if ((policy.temporaryDebtExceptions || []).some(item => item.direction === direction))
    errors.push("policy:temporary-exception");
  return errors;
}

check("runtime config is dependency-free with the exact semantic field manifest", () => {
  assert(exists(runtimeHeaderPath), "runtime config header is missing");
  const errors = inspectRuntimeHeader(read(runtimeHeaderPath));
  assert(errors.length === 0, errors.join(", "));
});

check("transport and HTTP auth consume only the injected runtime contract", () => {
  const errors = inspectTransportTexts(new Map());
  assert(errors.length === 0, errors.join(", "));
});

check("composition maps every field and supplies diagnostics and stream-key operations", () => {
  const errors = inspectComposition(read(compositionPath));
  assert(errors.length === 0, errors.join(", "));
});

check("current owner, graph and Policy v1 remove exactly transport to core utilities", () => {
  const graph = JSON.parse(read(graphPath));
  const policy = JSON.parse(read(policyPath));
  const violations = graph.observedModuleEdges.filter(item => item.allowedByTarget === false);
  const errors = [...inspectOwners(graph), ...inspectPolicy(policy)];
  assert(graph.expectedProductionFiles === 208 && graph.expectedCppFiles === 101 &&
    graph.observedModuleEdges.length === 17 && violations.length === 2 &&
    graph.stronglyConnectedComponents.length === 0,
  `graph metrics drift: ${graph.expectedProductionFiles}/${graph.expectedCppFiles}/` +
    `${graph.observedModuleEdges.length}/${violations.length}/${graph.stronglyConnectedComponents.length}`);
  assert(!graph.observedModuleEdges.some(item =>
    item.direction === "transport-and-auth-adapter -> core-utilities"),
  "transport to core-utilities edge remains");
  assert(errors.length === 0, errors.join(", "));
});

check("transitive include, relabel, alias, mapping and policy mutations fail closed", () => {
  const header = read(runtimeHeaderPath);
  assert(inspectRuntimeHeader(header.replace("#include <string>", '#include "app_config.h"'))
    .includes("header:transitive-or-owner-leak"), "transitive include mutation escaped");
  const aliasTexts = new Map([["src/ingress/webrtc_http_server_runtime.cpp",
    `${read("src/ingress/webrtc_http_server_runtime.cpp")}\nusing RuntimeAlias = app::AppConfig;\n`]]);
  assert(inspectTransportTexts(aliasTexts).some(error => error.includes("direct-or-alias")),
    "AppConfig alias mutation escaped");
  const leaseMutation = new Map([["src/ingress/webrtc_http_server.cpp",
    read("src/ingress/webrtc_http_server.cpp").replace(
      "if (WebRtcHttpRuntimeConfigInitialized()) {", "if (false) {")]]);
  assert(inspectTransportTexts(leaseMutation).some(error => error.includes("process-lifetime-lease")),
    "process-lifetime lease mutation escaped");
  const composition = read(compositionPath);
  const authModeMutation = composition.replace(
    "return ingress::HttpAuthMode::Session;", "return ingress::HttpAuthMode::Token;");
  assert(inspectComposition(authModeMutation).includes("composition:auth-mode:Session->Session"),
    "AuthMode mapping mutation escaped");
  const mappingMutation = composition.replace(
    "config.analysis_appearance_model_sha256 = source.analysis_appearance_model_sha256;",
    "config.analysis_appearance_model_sha256 = source.analysis_appearance_model_provenance;");
  assert(inspectComposition(mappingMutation).includes("composition:wrong-mapping:analysis_appearance_model_sha256"),
    "appearance readiness mapping mutation escaped");
  const duplicateMutation = composition.replace(
    "config.stream_route = source.stream_route;",
    "config.stream_route = source.stream_route;\n    config.stream_route = source.stream_route;");
  assert(inspectComposition(duplicateMutation).includes("composition:assignment-count:stream_route"),
    "duplicate mapping mutation escaped");
  const graph = JSON.parse(read(graphPath));
  const owner = graph.moduleClassifiers.find(item => item.id === "transport-and-auth-adapter");
  owner.exactFiles = owner.exactFiles.filter(file => file !== "src/ingress/webrtc_http_server_detail.h");
  graph.moduleClassifiers.find(item => item.id === "analysis-services").exactFiles.push(
    "src/ingress/webrtc_http_server_detail.h");
  assert(inspectOwners(graph).some(error => error.includes("legacy-owner-relabel")),
    "transport relabel mutation escaped");
  const policy = JSON.parse(read(policyPath));
  policy.temporaryDebtExceptions.push({
    direction: "transport-and-auth-adapter -> core-utilities",
    reason: "mutation", countsAsTargetViolation: false,
  });
  assert(inspectPolicy(policy).includes("policy:temporary-exception"),
    "temporary debt exception mutation escaped");
});

for (const item of checks) {
  console.log(`- ${item.status}: ${item.name}${item.detail ? ` — ${item.detail}` : ""}`);
}
const passed = checks.filter(item => item.status === "PASS").length;
const failed = checks.length - passed;
console.log(`- summary: pass=${passed} fail=${failed}`);
process.exit(failed === 0 ? 0 : 1);

#!/usr/bin/env node
// 파일 용도: REVIEW4-64 Slice 32 WebRTC media/runtime ownership의 application port 경계를 검증한다.
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) printUsageAndExit(`V390 WebRTC media application boundary verification

Usage:
  ./server.sh verify-v390-webrtc-media-application-boundary
`);
assertKnownOptions(rawArgs, ["h", "help", "fixture-root", "skip-mutations"]);

const scriptPath = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(scriptPath), "../..");
const skipMutations = rawArgs.includes("--skip-mutations");
const fixtureArg = rawArgs.find(arg => arg.startsWith("--fixture-root="));
const sourceRoot = fixtureArg ? validateFixtureRoot(fixtureArg.slice("--fixture-root=".length)) : rootDir;
const servicePath = "include/ingress/webrtc_media_application_service.h";
const adapterHeaderPath = "include/ingress/webrtc_media_application_adapter.h";
const adapterSourcePath = "src/ingress/webrtc_media_application_adapter.cpp";
const compositionPath = "src/application/media_server_application.cpp";
const graphPath = "test/fixtures/v390_structure_stabilization_current_graph.json";
const policyPath = "test/fixtures/v390_structure_stabilization_current_architecture_policy.json";
const codecMatrixPath = "scripts/internal/verify_codec_matrix.sh";
const transportPaths = [
  "include/ingress/http_auth.h",
  "include/ingress/webrtc_http_runtime_config.h",
  "src/ingress/http_auth.cpp",
  "include/ingress/webrtc_http_server.h",
  "src/ingress/webrtc_http_server.cpp",
  "src/ingress/webrtc_http_server_ops_foundation.cpp",
  "src/ingress/webrtc_http_server_ops_workflows.cpp",
  "src/ingress/webrtc_http_server_ops_incidents.cpp",
  "src/ingress/webrtc_http_server_runtime.cpp",
  "src/ingress/webrtc_http_server_detail.h",
  "include/ingress/webrtc_http_analysis_rule_declarations.h",
];
const canonicalHeaders = [
  "include/core/session_manager.h",
  "include/core/webrtc_source_registry.h",
  "include/ingress/webrtc_egress_session.h",
  "include/ingress/webrtc_source_session.h",
];
const checks = [];

function validateFixtureRoot(value) {
  if (!skipMutations) throw new Error("--fixture-root requires --skip-mutations");
  const resolved = fs.realpathSync(path.resolve(value));
  const temp = `${fs.realpathSync(os.tmpdir())}${path.sep}`;
  if (!resolved.startsWith(temp)) throw new Error("fixture root must stay under the system temp directory");
  return resolved;
}
function read(file) { return fs.readFileSync(path.join(sourceRoot, file), "utf8"); }
function exists(file) { return fs.existsSync(path.join(sourceRoot, file)); }
function sha256(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
function assert(value, message) { if (!value) throw new Error(message); }
function check(name, fn) {
  try { fn(); checks.push({name, status: "PASS"}); }
  catch (error) { checks.push({name, status: "FAIL", detail: error.message}); }
}
function exactCount(text, pattern) { return (text.match(pattern) || []).length; }
function compact(text) { return text.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").trim(); }
function escapeRegex(text) { return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function exactFragment(text, fragment, label) {
  assert(exactCount(compact(text), new RegExp(escapeRegex(compact(fragment)), "g")) === 1,
    `${label} exact fragment drift: ${compact(fragment)}`);
}
function ordered(text, tokens) {
  let cursor = 0;
  for (const token of tokens) {
    const next = text.indexOf(token, cursor);
    if (next < 0) return false;
    cursor = next + token.length;
  }
  return true;
}
function replaceExact(text, before, after, label) {
  assert(exactCount(text, new RegExp(escapeRegex(before), "g")) === 1,
    `${label} mutation anchor drift: ${before}`);
  return text.replace(before, after);
}
function bracedDefinition(text, keyword, name) {
  const marker = new RegExp(`${keyword}\\s+${escapeRegex(name)}\\b[^\\{]*\\{`);
  const match = marker.exec(text);
  assert(match, `${keyword} definition missing: ${name}`);
  const open = text.indexOf("{", match.index);
  let depth = 0;
  for (let index = open; index < text.length; ++index) {
    if (text[index] === "{") ++depth;
    if (text[index] === "}" && --depth === 0) return text.slice(match.index, index + 2);
  }
  throw new Error(`unterminated ${keyword}: ${name}`);
}
function functionBody(text, name) {
  const marker = new RegExp(`\\b${escapeRegex(name)}\\s*\\([^)]*\\)\\s*(?:const\\s*)?(?:override\\s*)?\\{`, "s");
  const match = marker.exec(text);
  assert(match, `function body missing: ${name}`);
  const open = text.indexOf("{", match.index);
  let depth = 0;
  for (let index = open; index < text.length; ++index) {
    if (text[index] === "{") ++depth;
    if (text[index] === "}" && --depth === 0) return text.slice(open + 1, index);
  }
  throw new Error(`unterminated function: ${name}`);
}
function assertInputMappings(body, fields, label) {
  for (const field of fields) {
    exactFragment(body, `output.${field} = input.${field};`, `${label}.${field} direct mapping`);
    assert(exactCount(body, new RegExp(`input\\.${field}\\b`, "g")) === 1,
      `${label}.${field} input cardinality drift`);
  }
}

const dtoNames = [
  "WebRtcMediaApplicationRequest",
  "WebRtcMediaApplicationIceCandidate",
  "WebRtcMediaApplicationMetadataChannelConfig",
  "WebRtcMediaApplicationMetadataChannelStats",
  "WebRtcMediaApplicationRuntimeStateSnapshot",
  "WebRtcMediaApplicationSourceReconnectStats",
  "WebRtcMediaApplicationSourceDescriptorSnapshot",
  "WebRtcMediaApplicationSourceEgressStats",
  "WebRtcMediaApplicationPublishedSourceSnapshot",
  "WebRtcMediaApplicationEgressStartResult",
];

function assertServiceContract(header) {
  const includes = [...header.matchAll(/^\s*#\s*include\s*([<"][^>"]+[>"])/gm)].map(item => item[1]);
  assert(JSON.stringify(includes) === JSON.stringify([
    "<cstddef>", "<cstdint>", "<functional>", "<memory>", "<optional>", "<string>",
    "<unordered_map>", "<vector>",
  ]), "service header standard include manifest drift");
  assert(exactCount(header, /^\s*#\s*include\s*"/gm) === 0, "service header has a repository include");
  const actualDtos = [...header.matchAll(/^struct (WebRtcMediaApplication\w+)/gm)].map(item => item[1]);
  assert(JSON.stringify(actualDtos) === JSON.stringify(dtoNames), "service DTO identity/order drift");
  assert(exactCount(header, /^enum class WebRtcMediaApplicationSourceKind\b/gm) === 1,
    "source kind enum identity drift");
  assert(JSON.stringify([...header.matchAll(/^class (WebRtcMediaApplication\w+)/gm)].map(item => item[1])) ===
    JSON.stringify(["WebRtcMediaApplicationEgressSession", "WebRtcMediaApplicationSourceSession",
      "WebRtcMediaApplicationService"]), "service class identity/order drift");
  const egress = compact(bracedDefinition(header, "class", "WebRtcMediaApplicationEgressSession"));
  for (const api of [
    "virtual WebRtcMediaApplicationEgressStartResult Start( const std::string& session_id, const WebRtcMediaApplicationRequest& request) = 0;",
    "virtual void Stop() = 0;", "virtual void ConfigureAnalysisOverlay(",
    "virtual void SetMetadataChannelConfig(WebRtcMediaApplicationMetadataChannelConfig config) = 0;",
    "virtual bool MetadataChannelReady() const = 0;",
    "virtual WebRtcMediaApplicationMetadataChannelStats MetadataChannelStatsSnapshot() const = 0;",
    "virtual bool PublishAnalysisMetadata(const std::string& message) = 0;",
    "virtual std::int64_t ResolveOverlaySourcePts(std::int64_t normalized_pts) const = 0;",
    "virtual bool CreateOffer(std::string* sdp_offer, std::string* error_message) = 0;",
    "virtual bool CreateAnswer(std::string* sdp_answer, std::string* error_message) = 0;",
    "virtual bool SetRemoteOffer(const std::string& sdp_offer, std::string* error_message) = 0;",
    "virtual bool SetRemoteAnswer(const std::string& sdp_answer, std::string* error_message) = 0;",
    "virtual void AddRemoteIceCandidate(", "virtual std::vector<WebRtcMediaApplicationIceCandidate> TakePendingLocalIceCandidates() = 0;",
  ]) assert(egress.includes(compact(api)), `egress application API drift: ${compact(api)}`);
  const source = compact(bracedDefinition(header, "class", "WebRtcMediaApplicationSourceSession"));
  for (const api of ["virtual bool Start(", "virtual void Stop() = 0;", "virtual bool SetRemoteOffer(",
    "virtual bool CreateAnswer(", "virtual void AddRemoteIceCandidate(",
    "virtual std::vector<WebRtcMediaApplicationIceCandidate> TakePendingLocalIceCandidates() = 0;"])
    assert(source.includes(compact(api)), `source application API drift: ${compact(api)}`);
  const service = compact(bracedDefinition(header, "class", "WebRtcMediaApplicationService"));
  for (const api of ["CreateEgressSession()", "CreateSourceSession()", "CloseSession(",
    "RuntimeStateSnapshot() const", "SourceReconnectStatsSnapshot() const",
    "SourceDescriptorSnapshots() const", "SourceEgressStatsSnapshot() const",
    "PublishedSourceSnapshots() const"])
    assert(service.includes(api), `media service API drift: ${api}`);
  for (const token of ["core::", "media::", "analysis::", "core/session_manager.h",
    "core/webrtc_source_registry.h", "ingress/webrtc_egress_session.h",
    "ingress/webrtc_source_session.h", "SessionManager", "WebRtcSourceRegistry",
    "WebRtcEgressSession", "WebRtcSourceSession", "PublishedWebRtcSource", "SharedStream",
    "void*", "std::any", "std::variant", "reinterpret_cast", "static_cast",
    "dynamic_cast", "const_cast"])
    assert(!header.includes(token), `canonical/unsafe symbol leaked into service header: ${token}`);
}

function assertAdapterContract(source) {
  const repoIncludes = [...source.matchAll(/^\s*#\s*include\s*"([^"]+)"/gm)].map(item => item[1]);
  const canonical = ["core/session_manager.h", "core/webrtc_source_registry.h",
    "ingress/webrtc_egress_session.h", "ingress/webrtc_source_session.h"];
  for (const include of canonical)
    assert(repoIncludes.filter(item => item === include).length === 1,
      `adapter canonical include count drift: ${include}`);
  assertInputMappings(functionBody(source, "ToCanonicalRequest"),
    ["protocol", "path", "query", "client_id"], "request");
  assertInputMappings(functionBody(source, "ProjectIceCandidate"),
    ["sdp_mline_index", "candidate"], "ice candidate");
  assertInputMappings(functionBody(source, "ProjectMetadataStats"), [
    "session_id", "enabled", "open", "label", "interval_ms", "max_message_bytes",
    "max_buffered_bytes", "sent_count", "dropped_count", "skipped_count",
    "interval_skipped_count", "oversized_drop_count", "buffered_drop_count",
    "send_failure_count", "last_buffered_amount", "max_buffered_amount",
    "last_message_bytes", "max_message_bytes_observed",
  ], "metadata stats");
  const track = functionBody(source, "ProjectTrack");
  assertInputMappings(track,
    ["track_id", "codec_name", "caps_string", "clock_rate", "channels"], "track");
  exactFragment(track, "output.kind = media::ToString(input.kind);", "track.kind projection");
  exactFragment(track, "output.codec = media::ToString(input.codec);", "track.codec projection");
  const descriptor = functionBody(source, "ProjectDescriptor");
  assert(exactCount(descriptor, /input\.tracks\b/g) === 2 && exactCount(descriptor, /input\.is_live\b/g) === 1 &&
    ordered(descriptor, ["output.tracks.reserve(input.tracks.size())", "for (const auto& track : input.tracks)",
      "output.tracks.push_back(ProjectTrack(track))", "output.is_live = input.is_live"]),
  "descriptor list/order mapping drift");
  const start = functionBody(source, "Start");
  assert(ordered(start, ["ToCanonicalRequest(request)", "session_manager_.CreateSession(",
    "session->HandleSample(packet)", "if (!create_result.ok)", "output.session_created = false",
    "if (!session_->Start(session_id, create_result.stream, &error_message))",
    "output.session_created = true", "output.ok = true"]),
  "CreateSession -> packet bridge -> egress Start/failure order drift");
  assert(exactCount(start, /session_manager_\.CreateSession\(/g) === 1 &&
    exactCount(start, /session_->Start\(/g) === 1, "egress create/start delegation count drift");
  exactFragment(start, "output.message = create_result.message;", "egress create failure message");
  exactFragment(start, "output.message = std::move(error_message);", "egress start failure message");
  const sourceSession = bracedDefinition(source, "class", "CanonicalWebRtcMediaApplicationSourceSession");
  exactFragment(functionBody(sourceSession, "Start"),
    "return session_->Start(session_id, source_id, error_message);", "source session start argument order");
  const config = functionBody(source, "SetMetadataChannelConfig");
  for (const field of ["enabled", "interval_ms", "max_message_bytes", "max_buffered_bytes"])
    exactFragment(config, `canonical.${field} = config.${field};`, `metadata config.${field} mapping`);
  exactFragment(config, "canonical.label = std::move(config.label);", "metadata config.label mapping");
  const requiredServiceDelegations = ["CloseSession", "GetRuntimeStateSnapshot",
    "SourceReconnectStatsSnapshot", "SourceDescriptorSnapshots", "SourceEgressStatsSnapshot"];
  for (const method of requiredServiceDelegations)
    assert(exactCount(source, new RegExp(`session_manager_\\.${method}\\(`, "g")) === 1,
      `canonical service delegation drift: ${method}`);
  const sourceDescriptors = functionBody(source, "SourceDescriptorSnapshots");
  exactFragment(sourceDescriptors, "projected.stream_key = item.stream_key;",
    "source descriptor stream key projection");
  exactFragment(sourceDescriptors,
    "projected.descriptor = ProjectDescriptor(item.descriptor);", "source descriptor projection");
  const sourceReconnect = functionBody(source, "SourceReconnectStatsSnapshot");
  exactFragment(sourceReconnect, "projected.stream_key = item.stream_key;",
    "source reconnect stream key projection");
  const sourceEgress = functionBody(source, "SourceEgressStatsSnapshot");
  exactFragment(sourceEgress, "projected.stream_key = item.stream_key;",
    "source egress stream key projection");
  const publishedSources = functionBody(source, "PublishedSourceSnapshots");
  exactFragment(publishedSources, "if (item.descriptor.has_value()) {",
    "published descriptor presence guard");
  exactFragment(publishedSources,
    "projected.descriptor = ProjectDescriptor(*item.descriptor);",
    "published optional descriptor projection");
  assert(ordered(publishedSources, ["if (item.descriptor.has_value())",
    "projected.descriptor = ProjectDescriptor(*item.descriptor)",
    "output.push_back(std::move(projected))"]),
  "published optional descriptor projection order drift");
  assert(exactCount(source, /WebRtcSourceRegistry::Instance\(\)\.Snapshots\(\)/g) === 1,
    "published source registry snapshot delegation drift");
  for (const fragment of [
    "output.active_sessions = input.active_sessions;",
    "output.resource_active_sessions = input.resource_active_sessions;",
    "output.resource_active_streams = input.resource_active_streams;",
    "output.registry_active_streams = input.registry_active_streams;",
    "output.active_analysis_taps = input.active_analysis_taps;",
    "projected.reconnect_count = item.reconnect_count;",
    "projected.last_reconnect_at_ms = item.last_reconnect_at_ms;",
    "projected.session_count = item.session_count;", "projected.analysis_tap_count = item.analysis_tap_count;",
    "projected.source_id = item.source_id;", "projected.active = item.active;",
    "projected.has_descriptor = item.has_descriptor;", "projected.has_video = item.has_video;",
    "projected.has_audio = item.has_audio;", "projected.subscriber_count = item.subscriber_count;",
  ]) exactFragment(source, fragment, "canonical DTO projection");
}

function resolveRepoInclude(source, include) {
  const candidates = [path.posix.join(path.posix.dirname(source), include), `include/${include}`, `src/${include}`]
    .map(item => path.posix.normalize(item));
  return candidates.find(exists);
}
function recursiveClosure(start) {
  const seen = new Set();
  const visit = file => {
    if (seen.has(file) || !exists(file)) return;
    seen.add(file);
    for (const match of read(file).matchAll(/^\s*#\s*include\s*["<]([^">]+)[">]/gm)) {
      const resolved = resolveRepoInclude(file, match[1]);
      if (resolved) visit(resolved);
    }
  };
  visit(start);
  return seen;
}

check("service header is standard-only, standalone, exact, and canonical-free", () => {
  const header = read(servicePath);
  assertServiceContract(header);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "v390-webrtc-media-header-"));
  try {
    const harness = path.join(temp, "header.cpp");
    fs.writeFileSync(harness, '#include "ingress/webrtc_media_application_service.h"\nint main(){return 0;}\n');
    execFileSync(process.env.CXX || "c++", ["-std=c++17", `-I${path.join(sourceRoot, "include")}`,
      "-fsyntax-only", harness], {stdio: "pipe"});
  } finally { fs.rmSync(temp, {recursive: true, force: true}); }
});

check("adapter alone owns canonical headers, explicit projection, and create/start order", () => {
  assertAdapterContract(read(adapterSourcePath));
  const outsideAdapter = [adapterHeaderPath, servicePath, ...transportPaths].map(read).join("\n");
  for (const canonical of ["core/session_manager.h", "core/webrtc_source_registry.h",
    "ingress/webrtc_egress_session.h", "ingress/webrtc_source_session.h"])
    assert(!outsideAdapter.includes(`#include "${canonical}"`),
      `canonical header escaped adapter source: ${canonical}`);
});

check("all eleven transport files have zero direct/transitive canonical closure and concrete symbols", () => {
  for (const file of transportPaths) {
    const closure = recursiveClosure(file);
    for (const canonical of canonicalHeaders)
      assert(!closure.has(canonical), `${file} recursively reaches canonical owner ${canonical}`);
  }
  const transport = compact(transportPaths.map(read).join("\n"));
  for (const token of ["core::", "media::", "WebRtcEgressSession", "WebRtcSourceSession",
    "WebRtcSourceRegistry", "SessionManager"])
    assert(!transport.includes(token), `transport concrete/core/media bypass remains: ${token}`);
});

check("transport uses exact media application create/start/close/snapshot calls", () => {
  const transport = transportPaths.map(read).join("\n");
  const calls = {CreateEgressSession: 2, CreateSourceSession: 1, CloseSession: 7,
    RuntimeStateSnapshot: 1, SourceReconnectStatsSnapshot: 45, SourceDescriptorSnapshots: 45,
    SourceEgressStatsSnapshot: 45, PublishedSourceSnapshots: 46};
  for (const [method, count] of Object.entries(calls))
    assert(exactCount(transport, new RegExp(`impl_->media_sessions\\.${method}\\(`, "g")) === count,
      `media application call count drift: ${method}`);
  assert(exactCount(transport, /bridge->Start\(/g) === 3 && exactCount(transport, /bridge->Stop\(/g) === 9 &&
    exactCount(transport, /bridge->ConfigureAnalysisOverlay\(/g) === 1,
  "abstract media session start/stop/overlay call count drift");
  assert(exactCount(transport, /std::shared_ptr<WebRtcMediaApplicationEgressSession>/g) === 6 &&
    exactCount(transport, /std::shared_ptr<WebRtcMediaApplicationSourceSession>/g) === 2,
  "transport abstract session ownership drift");
});

check("composition, CMake, and dispatch bind one canonical adapter lifetime", () => {
  const composition = read(compositionPath), cmake = read("CMakeLists.txt"), dispatch = read("server.sh");
  assert(exactCount(composition, /MakeWebRtcMediaApplicationAdapter\(session_manager\)/g) === 1,
    "composition media adapter factory count drift");
  assert(ordered(composition, ["core::SessionManager session_manager", "MakeWebRtcMediaApplicationAdapter(session_manager)",
    "ingress::WebRtcHttpServer webrtc_http_server(", "*webrtc_media_sessions"]),
  "composition canonical -> adapter -> HTTP lifetime order drift");
  assert(exactCount(cmake, /src\/ingress\/webrtc_media_application_adapter\.cpp/g) === 1,
    "CMake media adapter source count drift");
  assert(exactCount(dispatch, /verify-v390-webrtc-media-application-boundary/g) === 3,
    "server help/list/dispatch count drift");
});

check("codec matrix keeps auth-off optional arguments nounset-safe", () => {
  const codec = read(codecMatrixPath);
  const safe = '"${auth_args[@]+"${auth_args[@]}"}"';
  assert(codec.split(safe).length - 1 === 4,
    "codec auth optional argument safe-expansion count drift");
});

check("Policy and exact successor graph close transport/core debt without ownership laundering", () => {
  const graphText = read(graphPath), policyText = read(policyPath);
  assert(sha256(graphText) === "215ce9282593945dc820171348eabc2f06814ce2be4b2abe1dbd632919dd820a",
    "current graph SHA drift");
  assert(sha256(policyText) === "f65d07504ad94d17c8026f151b7d3de4576f8b8757639c53835f8424e57c5970",
    "current policy SHA drift");
  const graph = JSON.parse(graphText), policy = JSON.parse(policyText);
  const classifier = id => graph.moduleClassifiers.find(item => item.id === id);
  const edge = direction => graph.observedModuleEdges.find(item => item.direction === direction);
  const app = classifier("application-service-interfaces");
  const core = classifier("core-media-interfaces");
  const runtime = graph.cmake.targets.find(item => item.id === "media_server_runtime");
  assert(graph.expectedProductionFiles === 215 && graph.expectedCppFiles === 103 &&
    app?.expectedFileCount === 48 && app.expectedCppCount === 19 &&
    [servicePath, adapterHeaderPath, adapterSourcePath].every(file => app.exactFiles.includes(file)) &&
    canonicalHeaders.every(file => core.exactFiles.includes(file) || core.prefixes.some(prefix => file.startsWith(prefix))) &&
    graph.observedModuleEdges.length === 16 &&
    graph.observedModuleEdges.filter(item => !item.allowedByTarget).length === 0 &&
    graph.stronglyConnectedComponents.length === 0 &&
    edge("application-service-interfaces -> core-media-interfaces")?.witnessCount === 4 &&
    edge("application-service-interfaces -> core-media-interfaces")?.witnessSha256 ===
      "9b012c5785ae13606c5cf056c7835123a767e53df641dbcd556b04a38258ae93" &&
    !edge("transport-and-auth-adapter -> core-media-interfaces") &&
    runtime?.productionSourceSha256 === "f80b850eb3258964222d860fc2111c6e3fb014a19f76450c59f89f05fdaf8e85" &&
    runtime.declaredSourceCount === 101 && runtime.defaultActiveSourceCount === 100 &&
    policy.allowedDependencyDirections.includes("application-service-interfaces -> core-media-interfaces"),
  "exact no-violation media application successor drift");
});

function copyFile(relative, targetRoot) {
  if (!fs.existsSync(path.join(rootDir, relative))) return;
  const target = path.join(targetRoot, relative);
  fs.mkdirSync(path.dirname(target), {recursive: true});
  fs.copyFileSync(path.join(rootDir, relative), target);
}
function copyTree(relative, targetRoot) {
  const source = path.join(rootDir, relative);
  const target = path.join(targetRoot, relative);
  fs.cpSync(source, target, {recursive: true});
}
function copyFixture(targetRoot) {
  copyTree("include", targetRoot);
  for (const file of [...transportPaths, adapterSourcePath, compositionPath, graphPath, policyPath,
    codecMatrixPath, "CMakeLists.txt", "server.sh", "scripts/internal/script_arg_utils.mjs"])
    copyFile(file, targetRoot);
}
function runFixture(targetRoot) {
  return spawnSync(process.execPath, [scriptPath, `--fixture-root=${targetRoot}`, "--skip-mutations"], {
    cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  });
}
function rejectMutation(id, file, mutate, expectedFailure) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), `v390-webrtc-media-${id}-`));
  try {
    copyFixture(temp);
    const target = path.join(temp, file);
    const before = fs.readFileSync(target, "utf8");
    const after = mutate(before);
    assert(after !== before, `${id}: mutation changed no bytes`);
    fs.writeFileSync(target, after);
    const run = runFixture(temp);
    const output = `${run.stdout || ""}\n${run.stderr || ""}`;
    assert(run.status === 1 && output.includes(expectedFailure),
      `${id}: mutation did not fail closed status=${run.status}\n${output}`);
  } finally { fs.rmSync(temp, {recursive: true, force: true}); }
}

if (!skipMutations) check("isolated direct, transitive, alias, mapping, bypass, graph, policy, CMake, and dispatch REDs fail closed", () => {
  const mutations = [
    ["direct-include", "include/ingress/webrtc_http_server.h",
      text => `${text}\n#include "core/session_manager.h"\n`,
      "all eleven transport files have zero direct/transitive canonical closure and concrete symbols"],
    ["transitive-service-include", servicePath,
      text => text.replace("#include <vector>", '#include <vector>\n#include "core/session_manager.h"'),
      "service header is standard-only, standalone, exact, and canonical-free"],
    ["alias-concrete", servicePath,
      text => text.replace("namespace ingress {", "namespace ingress {\nusing EscapedSessionManager = core::SessionManager;"),
      "service header is standard-only, standalone, exact, and canonical-free"],
    ["mapping-swap", adapterSourcePath,
      text => replaceExact(text, "output.enabled = input.enabled;", "output.enabled = input.open;", "mapping swap"),
      "adapter alone owns canonical headers, explicit projection, and create/start order"],
    ["request-paired-swap", adapterSourcePath,
      text => replaceExact(text,
        "    output.protocol = input.protocol;\n    output.path = input.path;",
        "    output.protocol = input.path;\n    output.path = input.protocol;", "request paired swap"),
      "adapter alone owns canonical headers, explicit projection, and create/start order"],
    ["ice-paired-swap", adapterSourcePath,
      text => replaceExact(text,
        "    output.sdp_mline_index = input.sdp_mline_index;\n    output.candidate = input.candidate;",
        "    output.sdp_mline_index = input.candidate.size();\n    output.candidate = std::to_string(input.sdp_mline_index);",
        "ICE paired swap"),
      "adapter alone owns canonical headers, explicit projection, and create/start order"],
    ["metadata-config-paired-swap", adapterSourcePath,
      text => replaceExact(text,
        "        canonical.max_message_bytes = config.max_message_bytes;\n        canonical.max_buffered_bytes = config.max_buffered_bytes;",
        "        canonical.max_message_bytes = config.max_buffered_bytes;\n        canonical.max_buffered_bytes = config.max_message_bytes;",
        "metadata config paired swap"),
      "adapter alone owns canonical headers, explicit projection, and create/start order"],
    ["create-error-message-omit", adapterSourcePath,
      text => replaceExact(text, "            output.message = create_result.message;",
        "            /* create error message omitted */", "create error message omission"),
      "adapter alone owns canonical headers, explicit projection, and create/start order"],
    ["source-start-paired-swap", adapterSourcePath,
      text => replaceExact(text,
        "return session_->Start(session_id, source_id, error_message);",
        "return session_->Start(source_id, session_id, error_message);", "source start paired swap"),
      "adapter alone owns canonical headers, explicit projection, and create/start order"],
    ["mapping-omit", adapterSourcePath,
      text => replaceExact(text, "output.max_message_bytes_observed = input.max_message_bytes_observed;",
        "/* max_message_bytes_observed omitted */", "mapping omission"),
      "adapter alone owns canonical headers, explicit projection, and create/start order"],
    ["source-descriptor-omit", adapterSourcePath,
      text => replaceExact(text,
        "            projected.descriptor = ProjectDescriptor(item.descriptor);",
        "            /* source descriptor projection omitted */", "source descriptor omission"),
      "adapter alone owns canonical headers, explicit projection, and create/start order"],
    ["descriptor-stream-key-omit", adapterSourcePath,
      text => replaceExact(text,
        "            projected.stream_key = item.stream_key;\n            projected.descriptor = ProjectDescriptor(item.descriptor);",
        "            /* descriptor stream key omitted */\n            projected.descriptor = ProjectDescriptor(item.descriptor);",
        "descriptor stream key omission"),
      "adapter alone owns canonical headers, explicit projection, and create/start order"],
    ["published-descriptor-omit", adapterSourcePath,
      text => replaceExact(text,
        "                projected.descriptor = ProjectDescriptor(*item.descriptor);",
        "                /* published descriptor projection omitted */", "published descriptor omission"),
      "adapter alone owns canonical headers, explicit projection, and create/start order"],
    ["transport-bypass", "src/ingress/webrtc_http_server_runtime.cpp",
      text => `${text}\ncore::SessionManager* g_forbidden_media_bypass = nullptr;\n`,
      "all eleven transport files have zero direct/transitive canonical closure and concrete symbols"],
    ["graph", graphPath, text => text.replace('"expectedProductionFiles": 215', '"expectedProductionFiles": 216'),
      "Policy and exact successor graph close transport/core debt without ownership laundering"],
    ["policy", policyPath, text => text.replace('    "application-service-interfaces -> core-media-interfaces",\n', ""),
      "Policy and exact successor graph close transport/core debt without ownership laundering"],
    ["cmake", "CMakeLists.txt", text => text.replace("    src/ingress/webrtc_media_application_adapter.cpp\n", ""),
      "composition, CMake, and dispatch bind one canonical adapter lifetime"],
    ["dispatch", "server.sh", text => text.replaceAll("verify-v390-webrtc-media-application-boundary", "removed-v390-media-boundary"),
      "composition, CMake, and dispatch bind one canonical adapter lifetime"],
    ["codec-auth-off-array", codecMatrixPath,
      text => text.replace('"${auth_args[@]+"${auth_args[@]}"}"', '"${auth_args[@]}"'),
      "codec matrix keeps auth-off optional arguments nounset-safe"],
  ];
  for (const [id, file, mutate, failure] of mutations) rejectMutation(id, file, mutate, failure);
});

for (const item of checks)
  console.log(`- ${item.status}: ${item.name}${item.detail ? ` — ${item.detail}` : ""}`);
const failed = checks.filter(item => item.status === "FAIL").length;
console.log(`- summary: pass=${checks.length - failed} fail=${failed}`);
process.exit(failed ? 1 : 0);

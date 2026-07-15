#!/usr/bin/env node
// REVIEW4-64 Slice 30B: Analysis Session attach/detach lifecycle behind a standard DTO port.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const args = process.argv.slice(2);
if (hasHelpFlag(args)) printUsageAndExit(`V390 Analysis Session lifecycle application boundary verification

Usage:
  ./server.sh verify-v390-analysis-session-lifecycle-application-boundary
`);
assertKnownOptions(args, ["h", "help"]);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const serviceHeaderPath = "include/ingress/analysis_session_lifecycle_application_service.h";
const adapterHeaderPath = "include/ingress/analysis_session_lifecycle_application_adapter.h";
const adapterSourcePath = "src/ingress/analysis_session_lifecycle_application_adapter.cpp";
const legacyFacadePath = "include/ingress/analysis_legacy_application_types.h";
const compositionPath = "src/application/media_server_application.cpp";
const serverPath = "src/ingress/webrtc_http_server.cpp";
const detailPath = "src/ingress/webrtc_http_server_detail.h";
const incidentsPath = "src/ingress/webrtc_http_server_ops_incidents.cpp";
const runtimePath = "src/ingress/webrtc_http_server_runtime.cpp";
const transportPaths = [
  "include/ingress/http_auth.h", "include/ingress/webrtc_http_runtime_config.h",
  "src/ingress/http_auth.cpp", "include/ingress/webrtc_http_server.h", serverPath,
  "src/ingress/webrtc_http_server_ops_foundation.cpp",
  "src/ingress/webrtc_http_server_ops_workflows.cpp", incidentsPath, runtimePath, detailPath,
  "include/ingress/webrtc_http_analysis_rule_declarations.h",
];

const checks = [];
function assert(value, message) { if (!value) throw new Error(message); }
function check(name, fn) {
  try { fn(); checks.push({name, status: "PASS"}); }
  catch (error) { checks.push({name, status: "FAIL", detail: error.message}); }
}
function exactCount(text, pattern) { return (text.match(pattern) || []).length; }
function compact(text) { return text.replace(/\/\/[^\n]*/g, "").replace(/\s+/g, " ").trim(); }
function escapeRegex(text) { return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function replaceExact(text, before, after, label) {
  assert(exactCount(text, new RegExp(escapeRegex(before), "g")) === 1,
    `${label} mutation anchor drift: ${before}`);
  return text.replace(before, after);
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
function bracedBody(text, markerPattern, label) {
  const match = markerPattern.exec(text);
  assert(match, `${label} definition missing`);
  const open = text.indexOf("{", match.index);
  let depth = 0;
  for (let index = open; index < text.length; ++index) {
    if (text[index] === "{") ++depth;
    if (text[index] === "}" && --depth === 0) return text.slice(open + 1, index);
  }
  throw new Error(`${label} definition is unterminated`);
}
function structBody(text, name) {
  return bracedBody(text, new RegExp(`struct\\s+${escapeRegex(name)}\\s*\\{`), `struct ${name}`);
}
function functionBody(text, name) {
  return bracedBody(text,
    new RegExp(`\\b${escapeRegex(name)}\\s*\\([^)]*\\)\\s*(?:const\\s*)?(?:override\\s*)?\\{`, "s"),
    `function ${name}`);
}
function assertExactMapping(body, output, input, fields, label) {
  for (const field of fields) {
    const fragment = `${output}.${field} = ${input}.${field};`;
    assert(exactCount(compact(body), new RegExp(escapeRegex(fragment), "g")) === 1,
      `${label} field mapping drift: ${field}`);
  }
  assert(ordered(body, fields.map(field => `${output}.${field} = ${input}.${field};`)),
    `${label} field order drift`);
}

const requestFields = ["protocol", "path", "query", "client_id"];
const attachFields = ["ok", "message", "tap_id", "stream_key", "stream_created", "reused", "reuse_key", "ref_count"];
const detachFields = ["ok", "removed", "tap_id", "reuse_key", "ref_count"];
const dtoManifests = new Map([
  ["AnalysisSessionLifecycleApplicationRequest", [
    "std::string protocol;", "std::string path;",
    "std::unordered_map<std::string, std::string> query;", "std::string client_id;",
  ]],
  ["AnalysisSessionLifecycleApplicationAttachResult", [
    "bool ok{false};", "std::string message;", "std::string tap_id;", "std::string stream_key;",
    "bool stream_created{false};", "bool reused{false};", "std::string reuse_key;", "std::size_t ref_count{0};",
  ]],
  ["AnalysisSessionLifecycleApplicationDetachResult", [
    "bool ok{false};", "bool removed{false};", "std::string tap_id;",
    "std::string reuse_key;", "std::size_t ref_count{0};",
  ]],
]);

function assertServiceContract(header) {
  const includes = [...header.matchAll(/^\s*#\s*include\s*([<"][^>"]+[>"])/gm)].map(item => item[1]);
  assert(JSON.stringify(includes) === JSON.stringify(["<cstddef>", "<string>", "<unordered_map>"]),
    "lifecycle service include manifest drift");
  assert(!/^\s*#\s*include\s*"/m.test(header), "repository include leaked into lifecycle service contract");
  for (const token of ["analysis::", "core::", "media::", "AnalysisSessionService",
    "analysis_session_service.h", "void*", "std::any", "std::variant", "reinterpret_cast"])
    assert(!header.includes(token), `canonical/core/unsafe lifecycle dependency leaked: ${token}`);
  for (const [name, fields] of dtoManifests) {
    assert(compact(structBody(header, name)) === fields.join(" "), `${name} exact field/default manifest drift`);
  }
  const service = compact(bracedBody(header,
    /class\s+AnalysisSessionLifecycleApplicationService\s*\{/, "lifecycle service"));
  for (const api of [
    "virtual ~AnalysisSessionLifecycleApplicationService() = default;",
    "virtual AnalysisSessionLifecycleApplicationAttachResult Attach( const AnalysisSessionLifecycleApplicationRequest& request) = 0;",
    "virtual AnalysisSessionLifecycleApplicationDetachResult Detach( const std::string& tap_id) = 0;",
  ]) assert(service.includes(api), `lifecycle virtual API drift: ${api}`);
}

function assertAdapterSourceContract(source) {
  const attach = functionBody(source, "Attach");
  assertExactMapping(attach, "canonical_request", "request", requestFields, "request DTO -> canonical");
  assert(ordered(attach, [
    "media::IngressRequest canonical_request", "canonical_request.protocol = request.protocol;",
    "canonical_request.path = request.path;", "canonical_request.query = request.query;",
    "canonical_request.client_id = request.client_id;", "service_.AttachAnalysisTap(",
    "canonical_request", "BuildAnalysisProfileFromQuery(canonical_request.query)",
    "AnalysisSessionLifecycleApplicationAttachResult output",
  ]), "attach request/profile/delegation order drift");
  assertExactMapping(attach, "output", "result", attachFields, "canonical attach -> DTO");
  assert(ordered(attach, attachFields.map(field => `output.${field} = result.${field};`).concat("return output;")),
    "attach result projection/return order drift");

  const detach = functionBody(source, "Detach");
  assert(ordered(detach, ["service_.DetachAnalysisTapRef(tap_id)",
    "AnalysisSessionLifecycleApplicationDetachResult output"]), "detach delegation order drift");
  assertExactMapping(detach, "output", "result", detachFields, "canonical detach -> DTO");
  assert(ordered(detach, detachFields.map(field => `output.${field} = result.${field};`).concat("return output;")),
    "detach result projection/return order drift");
  assert(!/\btry\b|\bcatch\b/.test(source), "canonical lifecycle exceptions must propagate unchanged");
  assert(ordered(source, [
    "class CanonicalAnalysisSessionLifecycleApplicationAdapter final",
    "analysis::AnalysisSessionService& service_",
    "MakeAnalysisSessionLifecycleApplicationAdapter",
    "std::make_unique<CanonicalAnalysisSessionLifecycleApplicationAdapter>(service)",
  ]), "adapter identity/factory/reference ownership drift");
}

function assertLegacyFacadeContract(header) {
  const includes = [...header.matchAll(/^\s*#\s*include\s*([<"][^>"]+[>"])/gm)].map(item => item[1]);
  assert(JSON.stringify(includes) === JSON.stringify(['"analysis/analysis_types.h"']),
    "legacy value facade include manifest drift");
  for (const token of ["analysis_session_service.h", "AnalysisSessionService",
    "AttachAnalysisTap", "DetachAnalysisTapRef", "analysis_session_lifecycle_application_adapter.h"])
    assert(!header.includes(token), `canonical lifecycle access leaked through legacy value facade: ${token}`);
}

function writeFakeCanonicalHeaders(temp) {
  const analysisDir = path.join(temp, "analysis");
  fs.mkdirSync(analysisDir, {recursive: true});
  fs.writeFileSync(path.join(analysisDir, "analysis_session_service.h"), String.raw`#pragma once
#include <cstddef>
#include <string>
#include <unordered_map>
namespace media {
struct IngressRequest { std::string protocol; std::string path; std::unordered_map<std::string,std::string> query; std::string client_id; };
}
namespace analysis {
struct AnalysisProfile { std::string marker; };
inline media::IngressRequest observed_request;
inline AnalysisProfile observed_profile;
inline std::string observed_detach_id;
class AnalysisSessionService {
public:
  struct AnalysisTapResult { bool ok; std::string message; std::string tap_id; std::string stream_key; bool stream_created; bool reused; std::string reuse_key; std::size_t ref_count; };
  struct AnalysisTapDetachResult { bool ok; bool removed; std::string tap_id; std::string reuse_key; std::size_t ref_count; };
  AnalysisTapResult AttachAnalysisTap(const media::IngressRequest& request, AnalysisProfile profile) {
    observed_request=request; observed_profile=profile;
    return {true,"attach-message","tap-result","stream-result",true,false,"reuse-result",37};
  }
  AnalysisTapDetachResult DetachAnalysisTapRef(const std::string& tap_id) {
    observed_detach_id=tap_id; return {true,true,"detach-result","detach-reuse",19};
  }
};
}
`);
  fs.writeFileSync(path.join(analysisDir, "analysis_query.h"), String.raw`#pragma once
#include "analysis/analysis_session_service.h"
namespace ingress {
inline analysis::AnalysisProfile BuildAnalysisProfileFromQuery(
    const std::unordered_map<std::string,std::string>& query) {
  const auto it=query.find("profile"); return {it == query.end() ? std::string() : it->second};
}
}
`);
}

function compileAndRunAdapterCase(tempRoot, source, name) {
  const temp = path.join(tempRoot, name.replace(/[^A-Za-z0-9_-]/g, "-"));
  fs.mkdirSync(temp, {recursive: true});
  writeFakeCanonicalHeaders(temp);
  const adapter = path.join(temp, "adapter.cpp");
  const harness = path.join(temp, "harness.cpp");
  const binary = path.join(temp, "case");
  fs.writeFileSync(adapter, source);
  fs.writeFileSync(harness, String.raw`#include "ingress/analysis_session_lifecycle_application_adapter.h"
#include <iostream>
int main() {
  analysis::AnalysisSessionService canonical;
  auto adapter=ingress::MakeAnalysisSessionLifecycleApplicationAdapter(canonical);
  ingress::AnalysisSessionLifecycleApplicationRequest request;
  request.protocol="protocol-request"; request.path="path-request";
  request.query={{"profile","profile-request"},{"source","source-request"}};
  request.client_id="client-request";
  const auto attached=adapter->Attach(request);
  const auto detached=adapter->Detach("detach-request");
  const bool request_ok=analysis::observed_request.protocol=="protocol-request" &&
    analysis::observed_request.path=="path-request" &&
    analysis::observed_request.query==request.query &&
    analysis::observed_request.client_id=="client-request" &&
    analysis::observed_profile.marker=="profile-request";
  const bool attach_ok=attached.ok && attached.message=="attach-message" &&
    attached.tap_id=="tap-result" && attached.stream_key=="stream-result" &&
    attached.stream_created && !attached.reused && attached.reuse_key=="reuse-result" &&
    attached.ref_count==37;
  const bool detach_ok=analysis::observed_detach_id=="detach-request" && detached.ok &&
    detached.removed && detached.tap_id=="detach-result" &&
    detached.reuse_key=="detach-reuse" && detached.ref_count==19;
  if (!request_ok || !attach_ok || !detach_ok) { std::cerr<<"mapping mismatch\n"; return 9; }
  return 0;
}
`);
  const compile = spawnSync(process.env.CXX || "c++", ["-std=c++17", `-I${temp}`,
    `-I${path.join(root, "include")}`, adapter, harness, "-o", binary], {encoding: "utf8"});
  if (compile.status !== 0) return {phase: "compile", ...compile};
  return {phase: "run", ...spawnSync(binary, [], {encoding: "utf8"})};
}

function assertTransportContract(transport, server, detail, incidents, runtime) {
  for (const token of ['#include "analysis/analysis_session_service.h"',
    '#include "ingress/analysis_session_lifecycle_application_adapter.h"',
    "analysis::AnalysisSessionService", ".AttachAnalysisTap(", ".DetachAnalysisTapRef("])
    assert(!transport.includes(token), `transport canonical lifecycle bypass remains: ${token}`);
  assert(exactCount(transport, /analysis_session_lifecycle\.Attach\(/g) === 4,
    "application lifecycle Attach call count drift (expected four)");
  assert(exactCount(transport, /analysis_session_lifecycle\.Detach\(/g) === 1,
    "canonical detach must be centralized in one application helper");
  assert(exactCount(transport, /DetachAnalysisTapAndReleaseRuntimes\(/g) === 13,
    "detach helper declaration/definition/call count drift");
  const requestProjection = functionBody(server, "ProjectAnalysisSessionLifecycleRequest");
  assertExactMapping(requestProjection, "output", "request", requestFields,
    "canonical ingress request -> lifecycle DTO");
  assert(ordered(requestProjection, ["AnalysisSessionLifecycleApplicationRequest output",
    ...requestFields.map(field => `output.${field} = request.${field};`), "return output;"]),
  "transport lifecycle request projection/return order drift");
  const helper = functionBody(server, "DetachAnalysisTapAndReleaseRuntimes");
  assert(ordered(helper, ["if (tap_id.empty())", "return false", "analysis_session_lifecycle.Detach(tap_id)",
    "if (detach_result.removed)",
    'ReleaseEventRuleApplicationRuntime("webrtc-overlay:" + tap_id)',
    'ReleaseEventRuleApplicationRuntime("tap-events:" + tap_id)',
    'ReleaseEventRuleApplicationRuntime("tap-overlay:" + tap_id)',
    'ReleaseEventRuleApplicationRuntime("tap-state-dump:" + tap_id)',
    'ReleaseEventRuleApplicationRuntime("tap-metrics:" + tap_id)', "return detach_result.ok"]),
  "detach removed-guard/runtime-release order drift");
  for (const key of ["webrtc-overlay:", "tap-events:", "tap-overlay:", "tap-state-dump:", "tap-metrics:"])
    assert(exactCount(helper, new RegExp(escapeRegex(`ReleaseEventRuleApplicationRuntime("${key}" + tap_id)`), "g")) === 1,
      `detach runtime key count drift: ${key}`);
  assert(exactCount(detail,
    /#include "ingress\/analysis_session_lifecycle_application_service\.h"/g) === 1 &&
    detail.includes('#include "ingress/analysis_legacy_application_types.h"') &&
    !detail.includes('#include "ingress/analysis_session_lifecycle_application_adapter.h"') &&
    !detail.includes('#include "analysis/analysis_session_service.h"'),
  "private transport detail lifecycle include replacement drift");
  assert(ordered(incidents, ["AttachWebRtcAnalysisOverlay(", "analysis_session_lifecycle.Attach(",
    "analysis_session_reads.WaitResultNearPts(", "analysis_session_reads.Snapshot(",
    "bridge->ConfigureAnalysisOverlay("]),
  "WebRTC overlay attach/read/provider order drift");
  assert(exactCount(runtime, /analysis_session_lifecycle\.Attach\(/g) === 3 &&
    exactCount(incidents, /analysis_session_lifecycle\.Attach\(/g) === 1,
  "tap/overlay Attach ownership drift");
}

check("lifecycle service header is standard-only, exact, and standalone C++17", () => {
  const header = read(serviceHeaderPath);
  assertServiceContract(header);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "v390-analysis-lifecycle-header-"));
  try {
    const harness = path.join(temp, "header.cpp");
    fs.writeFileSync(harness,
      '#include "ingress/analysis_session_lifecycle_application_service.h"\nint main(){return 0;}\n');
    const result = spawnSync(process.env.CXX || "c++", ["-std=c++17",
      `-I${path.join(root, "include")}`, "-fsyntax-only", harness], {encoding: "utf8"});
    assert(result.status === 0, `standalone header compile failed: ${result.stderr.trim()}`);
  } finally { fs.rmSync(temp, {recursive: true, force: true}); }
});

check("canonical adapter maps every request/attach/detach field explicitly", () => {
  assertAdapterSourceContract(read(adapterSourcePath));
  const adapterHeader = read(adapterHeaderPath);
  assert(adapterHeader.includes('#include "analysis/analysis_session_service.h"') &&
    adapterHeader.includes('#include "ingress/analysis_session_lifecycle_application_service.h"'),
  "canonical adapter header dependency split drift");
});

check("compiled fake canonical adapter preserves mapping and rejects swaps or omissions", () => {
  const source = read(adapterSourcePath);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "v390-analysis-lifecycle-adapter-"));
  try {
    const green = compileAndRunAdapterCase(temp, source, "green");
    assert(green.status === 0,
      `compiled adapter baseline failed phase=${green.phase} stdout=${green.stdout.trim()} stderr=${green.stderr.trim()}`);
    const mutations = [
      ["RED-request-path-protocol-swap", "canonical_request.path = request.path;",
        "canonical_request.path = request.protocol;"],
      ["RED-request-query-omission", "canonical_request.query = request.query;",
        "canonical_request.query = {};"],
      ["RED-attach-message-tap-swap", "output.message = result.message;",
        "output.message = result.tap_id;"],
      ["RED-attach-ref-count-omission",
        "output.reused = result.reused;\n        output.reuse_key = result.reuse_key;\n        output.ref_count = result.ref_count;",
        "output.reused = result.reused;\n        output.reuse_key = result.reuse_key;\n        output.ref_count = 0;"],
      ["RED-detach-removed-omission", "output.removed = result.removed;",
        "output.removed = false;"],
      ["RED-detach-reuse-tap-swap",
        "output.removed = result.removed;\n        output.tap_id = result.tap_id;\n        output.reuse_key = result.reuse_key;",
        "output.removed = result.removed;\n        output.tap_id = result.tap_id;\n        output.reuse_key = result.tap_id;"],
    ];
    for (const [name, before, after] of mutations) {
      const red = compileAndRunAdapterCase(temp, replaceExact(source, before, after, name), name);
      assert(red.status !== 0,
        `${name} produced false PASS phase=${red.phase} stdout=${red.stdout.trim()} stderr=${red.stderr.trim()}`);
    }
  } finally { fs.rmSync(temp, {recursive: true, force: true}); }
});

check("transport has zero canonical session lifecycle bypass and exact cleanup order", () => {
  const transport = transportPaths.map(read).join("\n");
  const server = read(serverPath);
  const detail = read(detailPath);
  const incidents = read(incidentsPath);
  const runtime = read(runtimePath);
  assertTransportContract(transport, server, detail, incidents, runtime);
  assertLegacyFacadeContract(read(legacyFacadePath));
  const requestMutations = [
    ["RED-transport-protocol-path-swap", "output.protocol = request.protocol;",
      "output.protocol = request.path;"],
    ["RED-transport-client-id-omission", "output.client_id = request.client_id;",
      "output.client_id = {};"],
  ];
  for (const [name, before, after] of requestMutations) {
    let rejected = false;
    try {
      assertTransportContract(transport, replaceExact(server, before, after, name), detail, incidents, runtime);
    } catch { rejected = true; }
    assert(rejected, `${name} produced false PASS`);
  }
  const facadeMutations = [
    ["RED-facade-service-include", '#include "analysis/analysis_types.h"',
      '#include "analysis/analysis_types.h"\n#include "analysis/analysis_session_service.h"'],
    ["RED-facade-service-alias", '#include "analysis/analysis_types.h"',
      '#include "analysis/analysis_types.h"\nusing LegacyAnalysisService = analysis::AnalysisSessionService;'],
  ];
  for (const [name, before, after] of facadeMutations) {
    let rejected = false;
    try { assertLegacyFacadeContract(replaceExact(read(legacyFacadePath), before, after, name)); }
    catch { rejected = true; }
    assert(rejected, `${name} produced false PASS`);
  }
});

check("composition shares one canonical service across lifecycle, read, provider, RTSP, and HTTP", () => {
  const composition = read(compositionPath);
  assert(ordered(composition, [
    "analysis::AnalysisSessionService analysis_sessions(session_manager)",
    "MakeAnalysisSessionLifecycleApplicationAdapter(analysis_sessions)",
    "MakeAnalysisSessionReadApplicationAdapter(analysis_sessions)",
    "MakeWebRtcMediaApplicationAdapter(session_manager)",
    "session_manager.SetAuxiliaryStreamRuntimeProvider(",
    "[&analysis_sessions] { return analysis_sessions.AuxiliaryStreamRuntimeSnapshot(); }",
    "GStreamerRtspServer gst_rtsp_server(session_manager, analysis_sessions)",
    "WebRtcHttpServer webrtc_http_server(", "*webrtc_media_sessions", "*analysis_session_lifecycle",
    "*analysis_session_reads", "webrtc_http_runtime_config",
  ]), "composition shared service construction/injection order drift");
  for (const fragment of [
    "analysis::AnalysisSessionService analysis_sessions(session_manager);",
    "MakeAnalysisSessionLifecycleApplicationAdapter(analysis_sessions)",
    "MakeAnalysisSessionReadApplicationAdapter(analysis_sessions)",
    "MakeWebRtcMediaApplicationAdapter(session_manager)",
    "GStreamerRtspServer gst_rtsp_server(session_manager, analysis_sessions);",
    "session_manager.SetAuxiliaryStreamRuntimeProvider({});",
  ]) assert(exactCount(composition, new RegExp(escapeRegex(fragment), "g")) === 1,
    `composition shared identity count drift: ${fragment}`);
  assert(ordered(composition, ["webrtc_http_server.Stop()", "gst_rtsp_server.Stop()",
    "session_manager.SetAuxiliaryStreamRuntimeProvider({})", "analysis::StopEventStorage()"]),
  "composition provider/server shutdown order drift");
});

check("CMake and server help/list/dispatch register only the focused lifecycle gate", () => {
  assert(exactCount(read("CMakeLists.txt"),
    /src\/ingress\/analysis_session_lifecycle_application_adapter\.cpp/g) === 1,
  "CMake lifecycle adapter source registration drift");
  for (const file of [serviceHeaderPath, adapterHeaderPath, adapterSourcePath, legacyFacadePath])
    assert(fs.existsSync(path.join(root, file)), `lifecycle production file missing: ${file}`);
  assert(exactCount(read("server.sh"), /verify-v390-analysis-session-lifecycle-application-boundary/g) === 3,
    "server lifecycle help/list/dispatch registration count drift");
  // Current graph and execution ledger are deliberately not read here. Their successor binding is a later closure gate.
});

for (const item of checks)
  console.log(`- ${item.status}: ${item.name}${item.detail ? ` — ${item.detail}` : ""}`);
const failed = checks.filter(item => item.status === "FAIL").length;
console.log(`- summary: pass=${checks.length - failed} fail=${failed}`);
process.exit(failed ? 1 : 0);

#!/usr/bin/env node
// REVIEW4-64 Slice 23: replace the transport/domain declaration and hidden link with an actual DIP port.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const args = process.argv.slice(2);
if (hasHelpFlag(args)) {
  printUsageAndExit(`V390 analysis rule port boundary verification

Usage:
  ./server.sh verify-v390-analysis-rule-private-declaration-boundary
`);
}
assertKnownOptions(args, ["h", "help"]);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const appHeader = "include/ingress/analysis_rule_application_service.h";
const appSource = "src/ingress/analysis_rule_application_service.cpp";
const domainHeader = "include/ingress/analysis_rule_registry.h";
const domainSource = "src/ingress/analysis_rule_registry.cpp";
const backendHeader = "include/ingress/webrtc_http_analysis_rule_declarations.h";
const serverSource = "src/ingress/webrtc_http_server.cpp";
const runtimeSource = "src/ingress/webrtc_http_server_runtime.cpp";
const transportDetail = "src/ingress/webrtc_http_server_detail.h";
const checks = [];

function assert(value, message) {
  if (!value) throw new Error(message);
}

function check(name, fn) {
  try {
    fn();
    checks.push({ name, status: "PASS" });
  } catch (error) {
    checks.push({ name, status: "FAIL", detail: error.message });
  }
}

function compact(text) {
  return text.replace(/\/\/[^\n]*/g, "").replace(/\s+/g, " ").trim();
}

function exactIncludeSet(text, expected) {
  const includes = [...text.matchAll(/^\s*#\s*include\s*([<"][^>"]+[>"])/gm)]
    .map(match => match[1]);
  return JSON.stringify(includes) === JSON.stringify(expected);
}

function functionBody(text, name) {
  const match = new RegExp(`\\b${name}\\s*\\([^)]*\\)\\s*\\{`, "s").exec(text);
  assert(match, `function body missing: ${name}`);
  const open = text.indexOf("{", match.index);
  let depth = 0;
  for (let index = open; index < text.length; ++index) {
    if (text[index] === "{") ++depth;
    if (text[index] === "}" && --depth === 0) return text.slice(open + 1, index);
  }
  throw new Error(`function body unterminated: ${name}`);
}

function backendBodiesAreExact(text) {
  const profile = compact(functionBody(text, backendNames[0]));
  const rules = compact(functionBody(text, backendNames[1]));
  const video = compact(functionBody(text, backendNames[2]));
  const apply = compact(functionBody(text, backendNames[3]));
  return profile === "return AnalysisRegistry().ProfileDocuments();" &&
    video === "return AnalysisRegistry().VaRuleDocuments();" &&
    (rules.match(/AnalysisRegistry\(\)\.RuleDocuments\(\)/g) || []).length === 1 &&
    (rules.match(/AnalysisRegistry\(\)\.VaRuleDocuments\(\)/g) || []).length === 1 &&
    !rules.includes("ProfileDocuments") &&
    rules.indexOf("RuleDocuments()") < rules.indexOf("VaRuleDocuments()") &&
    rules.includes("ExpandVaRuleForEventEvaluation(va_rule_document, documents)") &&
    (apply.match(/AnalysisRegistry\(\)\.VaRuleJson\(va_rule_id\)/g) || []).length === 1 &&
    apply.indexOf("if (request == nullptr)") < apply.indexOf("request->query") &&
    apply.includes('*error_message = "request is missing";');
}

const callbackFields = [
  "profile_documents_snapshot",
  "rule_documents_snapshot",
  "video_analysis_rule_documents_snapshot",
  "apply_video_analysis_rule_to_request",
];
const backendNames = [
  "WebRtcHttpAnalysisProfileDocumentsSnapshotBackend",
  "WebRtcHttpAnalysisRuleDocumentsSnapshotBackend",
  "WebRtcHttpVideoAnalysisRuleDocumentsSnapshotBackend",
  "ApplyWebRtcHttpVideoAnalysisRuleToRequestBackend",
];
const canonicalNames = [
  "AnalysisProfileDocumentsSnapshot",
  "AnalysisRuleDocumentsSnapshot",
  "VideoAnalysisRuleDocumentsSnapshot",
  "ApplyVideoAnalysisRuleToRequest",
];

check("application callback and transport backend headers are dependency-free and exact", () => {
  const application = read(appHeader);
  const backend = read(backendHeader);
  const expectedApplication = `#pragma once
#include <string>
#include <vector>
namespace media { struct IngressRequest; }
namespace ingress {
struct AnalysisRuleApplicationCallbacks {
  std::vector<std::string> (*profile_documents_snapshot)(){nullptr};
  std::vector<std::string> (*rule_documents_snapshot)(){nullptr};
  std::vector<std::string> (*video_analysis_rule_documents_snapshot)(){nullptr};
  bool (*apply_video_analysis_rule_to_request)(media::IngressRequest*, std::string*){nullptr};
};
bool ConfigureAnalysisRuleApplicationService( const AnalysisRuleApplicationCallbacks& callbacks,
  std::string* error_message);
std::vector<std::string> ApplicationAnalysisProfileDocumentsSnapshot();
std::vector<std::string> ApplicationAnalysisRuleDocumentsSnapshot();
std::vector<std::string> ApplicationVideoAnalysisRuleDocumentsSnapshot();
bool ApplyApplicationVideoAnalysisRuleToRequest(media::IngressRequest* request,
  std::string* error_message);
}`;
  const expectedBackend = `#pragma once
#include <string>
#include <vector>
namespace media { struct IngressRequest; }
namespace ingress {
std::vector<std::string> WebRtcHttpAnalysisProfileDocumentsSnapshotBackend();
std::vector<std::string> WebRtcHttpAnalysisRuleDocumentsSnapshotBackend();
std::vector<std::string> WebRtcHttpVideoAnalysisRuleDocumentsSnapshotBackend();
bool ApplyWebRtcHttpVideoAnalysisRuleToRequestBackend(media::IngressRequest* request,
  std::string* error_message);
}`;
  for (const [owner, text] of [["application", application], ["backend", backend]]) {
    assert(exactIncludeSet(text, ["<string>", "<vector>"]), `${owner} include set drift`);
    assert((text.match(/namespace\s+media\s*{\s*struct\s+IngressRequest\s*;\s*}/g) || []).length === 1,
      `${owner} forward declaration drift`);
    assert(!/\b(?:analysis|core|domain)::|^\s*#\s*include\s*"/m.test(text), `${owner} dependency leaked`);
  }
  assert(compact(application) === compact(expectedApplication), "application declaration set drift");
  assert(compact(backend) === compact(expectedBackend), "backend declaration set drift");
  for (const field of callbackFields) {
    assert((application.match(new RegExp(`\\(\\*${field}\\)`, "g")) || []).length === 1,
      `callback field drift: ${field}`);
  }
  for (const name of backendNames) {
    assert((backend.match(new RegExp(`\\b${name}\\s*\\(`, "g")) || []).length === 1,
      `backend declaration drift: ${name}`);
  }
  const extra = application.replace("}  // namespace ingress", "void HiddenAlias(int);\n}  // namespace ingress");
  assert(compact(extra) !== compact(expectedApplication), "extra declaration mutation was not rejected");
});

check("canonical symbols are domain-owned and transport has no hidden canonical definition", () => {
  const domain = read(domainSource);
  const application = read(appSource);
  const transportFiles = [
    "include/ingress/http_auth.h", "include/ingress/webrtc_http_runtime_config.h",
    "src/ingress/http_auth.cpp", "include/ingress/webrtc_http_server.h",
    serverSource, "src/ingress/webrtc_http_server_ops_foundation.cpp",
    "src/ingress/webrtc_http_server_ops_workflows.cpp",
    "src/ingress/webrtc_http_server_ops_incidents.cpp", runtimeSource, transportDetail,
  ];
  const transport = transportFiles.map(read).join("\n");
  assert(!transport.includes("ingress/analysis_rule_registry.h"), "transport domain include remains");
  for (const name of canonicalNames) {
    assert((domain.match(new RegExp(`(?:bool|std::vector<std::string>)\\s+${name}\\s*\\(`, "g")) || []).length === 1,
      `domain definition drift: ${name}`);
    assert((transport.match(new RegExp(`(?:bool|std::vector<std::string>)\\s+${name}\\s*\\(`, "g")) || []).length === 0,
      `transport canonical definition remains: ${name}`);
  }
  assert(application.includes('#include "ingress/analysis_rule_registry.h"') &&
    !domain.includes("webrtc_http") && !domain.includes("Backend"), "domain/application direction drift");
  for (const name of backendNames) {
    assert((read(runtimeSource).match(new RegExp(`(?:bool|std::vector<std::string>)\\s+${name}\\s*\\(`, "g")) || []).length === 1,
      `transport backend definition drift: ${name}`);
  }
});

check("compiled adapter harness proves atomic configuration, mapping, null and exception semantics", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "v390-rule-port-"));
  try {
    const harness = path.join(temp, "harness.cpp");
    fs.writeFileSync(harness, `#include "ingress/analysis_rule_application_service.h"
#include "ingress/analysis_rule_registry.h"
#include <stdexcept>
#include <string>
#include <vector>
namespace {
bool should_throw = false;
int profile_calls = 0, rule_calls = 0, va_calls = 0, apply_calls = 0;
std::vector<std::string> Profiles() { ++profile_calls; if (should_throw) throw std::runtime_error("profile"); return {"profile-a"}; }
std::vector<std::string> Rules() { ++rule_calls; if (should_throw) throw std::runtime_error("rule"); return {"rule-a", "rule-b"}; }
std::vector<std::string> VaRules() { ++va_calls; if (should_throw) throw std::runtime_error("va"); return {"va-a"}; }
std::vector<std::string> OtherProfiles() { return {"wrong"}; }
std::vector<std::string> ForeignProfiles() { return {"foreign-profile"}; }
std::vector<std::string> ForeignRules() { return {"foreign-rule"}; }
std::vector<std::string> ForeignVaRules() { return {"foreign-va"}; }
bool Apply(media::IngressRequest* request, std::string* error) {
  ++apply_calls;
  if (should_throw) throw std::runtime_error("apply");
  if (error) *error = request == nullptr ? "null-request" : "backend-result";
  return false;
}
bool ForeignApply(media::IngressRequest*, std::string*) { return true; }
}
int main(int argc, char** argv) {
  std::string error;
  const ingress::AnalysisRuleApplicationCallbacks callbacks{&Profiles, &Rules, &VaRules, &Apply};
  if (argc == 2 && std::string(argv[1]) == "prebound-conflict") {
    const ingress::AnalysisRuleRegistryPort foreign{
      &ForeignProfiles, &ForeignRules, &ForeignVaRules, &ForeignApply,
    };
    if (!ingress::BindAnalysisRuleRegistryPort(foreign, &error)) return 20;
    error.clear();
    if (ingress::ConfigureAnalysisRuleApplicationService(callbacks, &error) ||
        error != "analysis rule registry port is already bound") return 21;
    try {
      (void)ingress::ApplicationAnalysisProfileDocumentsSnapshot();
      return 22;
    } catch (const std::logic_error& expected) {
      if (std::string(expected.what()) != "analysis rule application service is not configured") return 23;
    }
    if (ingress::AnalysisProfileDocumentsSnapshot() != std::vector<std::string>{"foreign-profile"}) return 24;
    return 0;
  }
  ingress::AnalysisRuleApplicationCallbacks incomplete{};
  if (ingress::ConfigureAnalysisRuleApplicationService(incomplete, &error) ||
      error != "analysis rule application callbacks are incomplete") return 1;
  if (!ingress::ConfigureAnalysisRuleApplicationService(callbacks, &error)) return 2;
  if (!ingress::ConfigureAnalysisRuleApplicationService(callbacks, &error)) return 3;
  auto changed = callbacks; changed.profile_documents_snapshot = &OtherProfiles;
  if (ingress::ConfigureAnalysisRuleApplicationService(changed, &error) ||
      error != "analysis rule application callbacks are already configured") return 4;
  if (ingress::ApplicationAnalysisProfileDocumentsSnapshot() != std::vector<std::string>{"profile-a"} ||
      ingress::AnalysisProfileDocumentsSnapshot() != std::vector<std::string>{"profile-a"}) return 5;
  if (ingress::ApplicationAnalysisRuleDocumentsSnapshot() != std::vector<std::string>({"rule-a", "rule-b"}) ||
      ingress::AnalysisRuleDocumentsSnapshot() != std::vector<std::string>({"rule-a", "rule-b"})) return 6;
  if (ingress::ApplicationVideoAnalysisRuleDocumentsSnapshot() != std::vector<std::string>{"va-a"} ||
      ingress::VideoAnalysisRuleDocumentsSnapshot() != std::vector<std::string>{"va-a"}) return 7;
  media::IngressRequest request;
  error.clear(); if (ingress::ApplyApplicationVideoAnalysisRuleToRequest(&request, &error) || error != "backend-result") return 8;
  error.clear(); if (ingress::ApplyVideoAnalysisRuleToRequest(&request, &error) || error != "backend-result") return 9;
  error.clear(); if (ingress::ApplyApplicationVideoAnalysisRuleToRequest(nullptr, &error) || error != "null-request") return 10;
  error.clear(); if (ingress::ApplyVideoAnalysisRuleToRequest(nullptr, &error) || error != "null-request") return 11;
  if (profile_calls != 2 || rule_calls != 2 || va_calls != 2 || apply_calls != 4) return 12;
  should_throw = true;
  try { (void)ingress::ApplicationAnalysisProfileDocumentsSnapshot(); return 13; }
  catch (const std::runtime_error& expected) { if (std::string(expected.what()) != "profile") return 14; }
  try { (void)ingress::AnalysisRuleDocumentsSnapshot(); return 15; }
  catch (const std::runtime_error& expected) { if (std::string(expected.what()) != "rule") return 16; }
  try { (void)ingress::ApplyVideoAnalysisRuleToRequest(&request, &error); return 17; }
  catch (const std::runtime_error& expected) { if (std::string(expected.what()) != "apply") return 18; }
  return 0;
}
`);
    const binary = path.join(temp, "harness");
    execFileSync(process.env.CXX || "c++", [
      "-std=c++17", `-I${path.join(root, "include")}`, harness,
      path.join(root, domainSource), path.join(root, appSource), "-o", binary,
    ]);
    execFileSync(binary);
    execFileSync(binary, ["prebound-conflict"]);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

check("transport configures the exact backend once and consumes only application wrappers", () => {
  const server = read(serverSource);
  const runtime = read(runtimeSource);
  const detail = read(transportDetail);
  const constructor = server.slice(server.indexOf("WebRtcHttpServer::WebRtcHttpServer"),
    server.indexOf("WebRtcHttpServer::~WebRtcHttpServer"));
  const bindingPattern = new RegExp(
    `AnalysisRuleApplicationCallbacks\\s+analysis_rule_callbacks\\s*\\{\\s*` +
    backendNames.map(name => `&${name}`).join("\\s*,\\s*") + `\\s*,?\\s*\\}`);
  assert(bindingPattern.test(constructor), `callback binding drift: ${backendNames.join(",")}`);
  assert(backendBodiesAreExact(runtime), "transport backend body mapping drift");
  const swapped = runtime
    .replace("return AnalysisRegistry().ProfileDocuments();", "return AnalysisRegistry().__SWAP__();")
    .replace("return AnalysisRegistry().VaRuleDocuments();", "return AnalysisRegistry().ProfileDocuments();")
    .replace("return AnalysisRegistry().__SWAP__();", "return AnalysisRegistry().VaRuleDocuments();");
  assert(!backendBodiesAreExact(swapped), "profile/video backend swap mutation was not rejected");
  assert((constructor.match(/ConfigureAnalysisRuleApplicationService\(/g) || []).length === 1,
    "configuration count drift");
  assert((server.match(/ApplicationAnalysisProfileDocumentsSnapshot\(/g) || []).length === 1 &&
    (server.match(/ApplicationAnalysisRuleDocumentsSnapshot\(/g) || []).length === 2 &&
    (runtime.match(/ApplyApplicationVideoAnalysisRuleToRequest\(/g) || []).length === 5,
  "transport wrapper call count drift");
  assert(detail.includes("ingress/analysis_rule_application_service.h") &&
    detail.includes("ingress/webrtc_http_analysis_rule_declarations.h"), "transport contract includes drift");
  const cmake = read("CMakeLists.txt");
  for (const source of [appSource, domainSource]) {
    assert((cmake.match(new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length === 1,
      `CMake owner drift: ${source}`);
  }
});

check("dispatch and actual graph close the domain direction without relabeling", () => {
  assert((read("server.sh").match(/verify-v390-analysis-rule-private-declaration-boundary/g) || []).length === 3,
    "dispatch binding");
  const graph = JSON.parse(read("test/fixtures/v390_structure_stabilization_current_graph.json"));
  const classifier = id => graph.moduleClassifiers.find(item => item.id === id);
  const edge = direction => graph.observedModuleEdges.find(item => item.direction === direction);
  assert(graph.expectedProductionFiles === 200 && graph.expectedCppFiles === 98 &&
    classifier("application-service-interfaces")?.expectedFileCount === 33 &&
    classifier("application-service-interfaces")?.expectedCppCount === 14 &&
    classifier("domain-and-registry-owners")?.expectedFileCount === 6 &&
    classifier("domain-and-registry-owners")?.expectedCppCount === 3 &&
    classifier("transport-and-auth-adapter")?.expectedFileCount === 11 &&
    graph.observedModuleEdges.length === 16 &&
    graph.observedModuleEdges.filter(item => !item.allowedByTarget).length === 2 &&
    !edge("transport-and-auth-adapter -> domain-and-registry-owners") &&
    edge("transport-and-auth-adapter -> application-service-interfaces")?.witnessCount === 17 &&
    edge("application-service-interfaces -> domain-and-registry-owners")?.witnessCount === 4 &&
    edge("analysis-services -> domain-and-registry-owners")?.witnessCount === 2 &&
    edge("transport-and-auth-adapter -> analysis-services")?.witnessCount === 3 &&
    edge("transport-and-auth-adapter -> core-media-interfaces")?.witnessCount === 4 &&
    !graph.stronglyConnectedComponents.length, "graph successor");
  const structureOutput = execFileSync(path.join(root, "server.sh"),
    ["verify-v390-review4-structure-stabilization-execution"], { cwd: root, encoding: "utf8" });
  assert(structureOutput.includes("summary: pass=15 fail=0"), "actual graph recomputation gate failed");
});

for (const item of checks) {
  console.log(`- ${item.status}: ${item.name}${item.detail ? ` — ${item.detail}` : ""}`);
}
const failed = checks.filter(item => item.status === "FAIL").length;
console.log(`- summary: pass=${checks.length - failed} fail=${failed}`);
process.exit(failed ? 1 : 0);

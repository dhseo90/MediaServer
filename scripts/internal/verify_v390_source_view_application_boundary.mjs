#!/usr/bin/env node
// REVIEW4-64 Slice 16: transport source/view registry access through an application boundary.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`V390 source/view application boundary verification

Usage:
  ./server.sh verify-v390-source-view-application-boundary

Checks:
  - dependency-free application result and source/view DTO surface
  - transport and ONVIF public API contain no SourceViewRegistry/RegistryResult dependency
  - facade implementation explicitly maps every source/view field and delegates all 15 operations
  - Resolve/Snapshot preserve null and failure-output behavior
  - CMake/current graph bind the exact successor boundary
`);
}
assertKnownOptions(rawArgs, ["h", "help"]);

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = file => fs.readFileSync(path.join(rootDir, file), "utf8");
const exists = file => fs.existsSync(path.join(rootDir, file));
const checks = [];
const resultHeader = "include/ingress/application_service_result.h";
const facadeHeader = "include/ingress/source_view_application_service.h";
const facadeSource = "src/ingress/source_view_application_service.cpp";
const transportFiles = [
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
];
const sourceFields = [
  "source_id", "display_name", "kind", "canonical_source_key", "file", "rtsp_url",
  "webrtc_source_id", "whep_url", "http_url", "enabled", "tags", "owner_group",
  "site", "group", "floor", "zone",
];
const viewFields = [
  "view_id", "display_name", "source_id", "default_rule_id", "allowed_rule_ids",
  "allowed_overlay_modes", "show_dashboard", "show_events", "show_metadata_summary",
  "client_groups", "max_tiles", "enabled",
];
const methods = [
  "SourcesJson", "ViewsJson", "SourceRegistrySnapshotIdentityJson",
  "SourceOnboardingQualitySummaryJson", "ClientViewsJson", "ClientViewJson",
  "ResolveClientViewAccess", "Snapshot", "CreateSource", "UpsertSource",
  "UpsertOnvifSourceView", "DisableSource", "CreateView", "UpsertView", "DisableView",
];

function check(name, fn) {
  try { fn(); checks.push({ name, status: "PASS" }); }
  catch (error) { checks.push({ name, status: "FAIL", detail: error.message }); }
}
function assert(condition, message) { if (!condition) throw new Error(message); }
function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}
function extractBraceBlock(text, anchor) {
  const anchorIndex = text.indexOf(anchor);
  assert(anchorIndex >= 0, `anchor missing: ${anchor}`);
  const start = text.indexOf("{", anchorIndex + anchor.length);
  assert(start >= 0, `opening brace missing after: ${anchor}`);
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
  throw new Error(`unterminated brace block after: ${anchor}`);
}
function assertExactFieldMapping(body, fields, label) {
  const assignments = [...body.matchAll(/\boutput\.([A-Za-z_]\w*)\s*=\s*input\.([A-Za-z_]\w*)\s*;/g)]
    .map(match => [match[1], match[2]]);
  assert(assignments.length === fields.length,
    `${label} assignment count drift: ${assignments.length}/${fields.length}`);
  assert(JSON.stringify(assignments) === JSON.stringify(fields.map(field => [field, field])),
    `${label} must map every field once, in declaration order, from the same domain field`);
}
function normalizeCpp(text) { return stripComments(text).replace(/\s+/g, ""); }

function runSemanticHarness() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "v390-source-view-application-"));
  const source = path.join(tempDir, "source_view_application_harness.cpp");
  const binary = path.join(tempDir, "source_view_application_harness");
  const harness = String.raw`
#include <string>
#include <type_traits>
#include <utility>
#include <vector>

#include "ingress/application_service_result.h"
#include "ingress/source_view_application_service.h"
#include "ingress/source_view_registry.h"

namespace ingress {
namespace {
std::string g_last_method;
RegistryResult g_result;
SourceViewRegistry::ClientViewAccess g_access;
std::vector<SourceViewRegistry::SourceRecord> g_sources;
std::vector<SourceViewRegistry::PublishedViewRecord> g_views;
bool g_resolve_received_null = false;
bool g_snapshot_ok = true;
bool g_snapshot_sources_null = false;
bool g_snapshot_views_null = false;

RegistryResult Take(const char* method) {
    g_last_method = method;
    return g_result;
}
}  // namespace

SourceViewRegistry& SourceViewRegistry::Instance() {
    static SourceViewRegistry registry;
    return registry;
}
RegistryResult SourceViewRegistry::SourcesJson() { return Take("SourcesJson"); }
RegistryResult SourceViewRegistry::ViewsJson() { return Take("ViewsJson"); }
RegistryResult SourceViewRegistry::SourceRegistrySnapshotIdentityJson() {
    return Take("SourceRegistrySnapshotIdentityJson");
}
RegistryResult SourceViewRegistry::SourceOnboardingQualitySummaryJson() {
    return Take("SourceOnboardingQualitySummaryJson");
}
RegistryResult SourceViewRegistry::ClientViewsJson(const ClientViewAccessAuthorizer&) {
    return Take("ClientViewsJson");
}
RegistryResult SourceViewRegistry::ClientViewJson(const std::string&, const ClientViewAccessAuthorizer&) {
    return Take("ClientViewJson");
}
RegistryResult SourceViewRegistry::ResolveClientViewAccess(
    const std::string&, const ClientViewAccessAuthorizer&, const std::string&, ClientViewAccess* access) {
    g_last_method = "ResolveClientViewAccess";
    g_resolve_received_null = access == nullptr;
    if (access != nullptr) *access = g_access;
    return g_result;
}
bool SourceViewRegistry::Snapshot(std::vector<SourceRecord>* sources,
                                  std::vector<PublishedViewRecord>* views,
                                  std::string* error_message) {
    g_last_method = "Snapshot";
    g_snapshot_sources_null = sources == nullptr;
    g_snapshot_views_null = views == nullptr;
    if (sources != nullptr) *sources = g_sources;
    if (views != nullptr) *views = g_views;
    if (error_message != nullptr) *error_message = g_snapshot_ok ? "" : "snapshot-failed";
    return g_snapshot_ok;
}
RegistryResult SourceViewRegistry::CreateSource(const std::string&) { return Take("CreateSource"); }
RegistryResult SourceViewRegistry::UpsertSource(const std::string&, const std::string&) {
    return Take("UpsertSource");
}
RegistryResult SourceViewRegistry::UpsertOnvifSourceView(
    const std::string&, const std::string&, const std::string&) {
    return Take("UpsertOnvifSourceView");
}
RegistryResult SourceViewRegistry::DisableSource(const std::string&) { return Take("DisableSource"); }
RegistryResult SourceViewRegistry::CreateView(const std::string&) { return Take("CreateView"); }
RegistryResult SourceViewRegistry::UpsertView(const std::string&, const std::string&) {
    return Take("UpsertView");
}
RegistryResult SourceViewRegistry::DisableView(const std::string&) { return Take("DisableView"); }

}  // namespace ingress

using App = ingress::SourceViewApplicationService;
using Domain = ingress::SourceViewRegistry;

Domain::SourceRecord DomainSource(const std::string& p) {
    Domain::SourceRecord v;
    v.source_id = p + "source_id"; v.display_name = p + "display_name";
    v.kind = p + "kind"; v.canonical_source_key = p + "canonical_source_key";
    v.file = p + "file"; v.rtsp_url = p + "rtsp_url";
    v.webrtc_source_id = p + "webrtc_source_id"; v.whep_url = p + "whep_url";
    v.http_url = p + "http_url"; v.enabled = false; v.tags = {p + "tag1", p + "tag2"};
    v.owner_group = p + "owner_group"; v.site = p + "site"; v.group = p + "group";
    v.floor = p + "floor"; v.zone = p + "zone";
    return v;
}
Domain::PublishedViewRecord DomainView(const std::string& p) {
    Domain::PublishedViewRecord v;
    v.view_id = p + "view_id"; v.display_name = p + "display_name";
    v.source_id = p + "source_id"; v.default_rule_id = p + "default_rule_id";
    v.allowed_rule_ids = {p + "rule1", p + "rule2"};
    v.allowed_overlay_modes = {p + "overlay1", p + "overlay2"};
    v.show_dashboard = false; v.show_events = false; v.show_metadata_summary = false;
    v.client_groups = {p + "client1", p + "client2"}; v.max_tiles = 7; v.enabled = false;
    return v;
}
bool Same(const App::SourceRecord& a, const Domain::SourceRecord& b) {
    return a.source_id == b.source_id && a.display_name == b.display_name && a.kind == b.kind &&
      a.canonical_source_key == b.canonical_source_key && a.file == b.file && a.rtsp_url == b.rtsp_url &&
      a.webrtc_source_id == b.webrtc_source_id && a.whep_url == b.whep_url && a.http_url == b.http_url &&
      a.enabled == b.enabled && a.tags == b.tags && a.owner_group == b.owner_group && a.site == b.site &&
      a.group == b.group && a.floor == b.floor && a.zone == b.zone;
}
bool Same(const App::PublishedViewRecord& a, const Domain::PublishedViewRecord& b) {
    return a.view_id == b.view_id && a.display_name == b.display_name && a.source_id == b.source_id &&
      a.default_rule_id == b.default_rule_id && a.allowed_rule_ids == b.allowed_rule_ids &&
      a.allowed_overlay_modes == b.allowed_overlay_modes && a.show_dashboard == b.show_dashboard &&
      a.show_events == b.show_events && a.show_metadata_summary == b.show_metadata_summary &&
      a.client_groups == b.client_groups && a.max_tiles == b.max_tiles && a.enabled == b.enabled;
}
bool Same(const App::SourceRecord& a, const App::SourceRecord& b) {
    Domain::SourceRecord d;
    d.source_id=b.source_id; d.display_name=b.display_name; d.kind=b.kind;
    d.canonical_source_key=b.canonical_source_key; d.file=b.file; d.rtsp_url=b.rtsp_url;
    d.webrtc_source_id=b.webrtc_source_id; d.whep_url=b.whep_url; d.http_url=b.http_url;
    d.enabled=b.enabled; d.tags=b.tags; d.owner_group=b.owner_group; d.site=b.site;
    d.group=b.group; d.floor=b.floor; d.zone=b.zone;
    return Same(a, d);
}
bool Same(const App::PublishedViewRecord& a, const App::PublishedViewRecord& b) {
    Domain::PublishedViewRecord d;
    d.view_id=b.view_id; d.display_name=b.display_name; d.source_id=b.source_id;
    d.default_rule_id=b.default_rule_id; d.allowed_rule_ids=b.allowed_rule_ids;
    d.allowed_overlay_modes=b.allowed_overlay_modes; d.show_dashboard=b.show_dashboard;
    d.show_events=b.show_events; d.show_metadata_summary=b.show_metadata_summary;
    d.client_groups=b.client_groups; d.max_tiles=b.max_tiles; d.enabled=b.enabled;
    return Same(a, d);
}
bool SameResult(const ingress::ApplicationServiceResult& a, const ingress::RegistryResult& b) {
    return a.status == b.status && a.status_text == b.status_text && a.body == b.body;
}

#define EXPECT(condition) do { if (!(condition)) return __LINE__; } while (false)

int main() {
    static_assert(std::is_same_v<decltype(ingress::ApplicationServiceResult::status), int>);
    static_assert(std::is_same_v<decltype(App::SourceRecord::tags), std::vector<std::string>>);
    static_assert(std::is_same_v<decltype(App::PublishedViewRecord::max_tiles), int>);
    ingress::ApplicationServiceResult default_result;
    App::SourceRecord default_source;
    App::PublishedViewRecord default_view;
    EXPECT(default_result.status == 200 && default_result.status_text == "OK" && default_result.body.empty());
    EXPECT(default_source.enabled && default_view.show_dashboard && default_view.show_events &&
      default_view.show_metadata_summary && default_view.max_tiles == 1 && default_view.enabled);

    auto& service = App::Instance();
    ingress::g_result = {207, "Multi", "payload"};
    const App::ClientViewAccessAuthorizer authorizer = [](const std::string&, const std::string&) { return true; };
#define EXPECT_DELEGATE(expression, name) do { \
    ingress::g_last_method.clear(); auto value = (expression); \
    EXPECT(ingress::g_last_method == name && SameResult(value, ingress::g_result)); \
  } while (false)
    EXPECT_DELEGATE(service.SourcesJson(), "SourcesJson");
    EXPECT_DELEGATE(service.ViewsJson(), "ViewsJson");
    EXPECT_DELEGATE(service.SourceRegistrySnapshotIdentityJson(), "SourceRegistrySnapshotIdentityJson");
    EXPECT_DELEGATE(service.SourceOnboardingQualitySummaryJson(), "SourceOnboardingQualitySummaryJson");
    EXPECT_DELEGATE(service.ClientViewsJson(authorizer), "ClientViewsJson");
    EXPECT_DELEGATE(service.ClientViewJson("view", authorizer), "ClientViewJson");
    EXPECT_DELEGATE(service.CreateSource("{}"), "CreateSource");
    EXPECT_DELEGATE(service.UpsertSource("source", "{}"), "UpsertSource");
    EXPECT_DELEGATE(service.UpsertOnvifSourceView("source", "{}", "{}"), "UpsertOnvifSourceView");
    EXPECT_DELEGATE(service.DisableSource("source"), "DisableSource");
    EXPECT_DELEGATE(service.CreateView("{}"), "CreateView");
    EXPECT_DELEGATE(service.UpsertView("view", "{}"), "UpsertView");
    EXPECT_DELEGATE(service.DisableView("view"), "DisableView");

    ingress::g_access = {DomainView("resolved-"), DomainSource("resolved-")};
    ingress::g_result = {200, "OK", "resolved"};
    App::ClientViewAccess resolved;
    auto resolve_result = service.ResolveClientViewAccess("view", authorizer, "client:view:", &resolved);
    EXPECT(SameResult(resolve_result, ingress::g_result) && Same(resolved.view, ingress::g_access.view) &&
      Same(resolved.source, ingress::g_access.source) && !ingress::g_resolve_received_null);

    App::ClientViewAccess preserved = resolved;
    ingress::g_access = {DomainView("rejected-"), DomainSource("rejected-")};
    ingress::g_result = {403, "Forbidden", "rejected"};
    resolve_result = service.ResolveClientViewAccess("view", authorizer, "client:view:", &resolved);
    EXPECT(SameResult(resolve_result, ingress::g_result) && Same(resolved.view, preserved.view) &&
      Same(resolved.source, preserved.source));
    resolve_result = service.ResolveClientViewAccess("view", authorizer, "client:view:", nullptr);
    EXPECT(SameResult(resolve_result, ingress::g_result) && ingress::g_resolve_received_null);

    ingress::g_sources = {DomainSource("snapshot-")};
    ingress::g_views = {DomainView("snapshot-")};
    ingress::g_snapshot_ok = true;
    std::vector<App::SourceRecord> sources;
    std::vector<App::PublishedViewRecord> views;
    std::string error = "old";
    EXPECT(service.Snapshot(&sources, &views, &error) && !ingress::g_snapshot_sources_null &&
      !ingress::g_snapshot_views_null && error.empty() && sources.size() == 1 && views.size() == 1 &&
      Same(sources[0], ingress::g_sources[0]) && Same(views[0], ingress::g_views[0]));
    EXPECT(service.Snapshot(nullptr, nullptr, &error) && ingress::g_snapshot_sources_null &&
      ingress::g_snapshot_views_null);

    const auto preserved_sources = sources;
    const auto preserved_views = views;
    ingress::g_sources = {DomainSource("failed-")};
    ingress::g_views = {DomainView("failed-")};
    ingress::g_snapshot_ok = false;
    EXPECT(!service.Snapshot(&sources, &views, &error) && error == "snapshot-failed" &&
      sources.size() == preserved_sources.size() && views.size() == preserved_views.size() &&
      Same(sources[0], preserved_sources[0]) && Same(views[0], preserved_views[0]));
    return 0;
}
`;
  try {
    fs.writeFileSync(source, harness);
    execFileSync(process.env.CXX || "c++", [
      "-std=c++17", "-I", path.join(rootDir, "include"),
      path.join(rootDir, facadeSource), source, "-o", binary,
    ], { encoding: "utf8", stdio: "pipe" });
    execFileSync(binary, [], { encoding: "utf8", stdio: "pipe" });
  } catch (error) {
    const stdout = error.stdout?.toString?.() || "";
    const stderr = error.stderr?.toString?.() || "";
    throw new Error(`compiled semantic harness failed: ${stdout}${stderr}${error.message}`);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

check("application result and DTO headers are dependency-free and exact", () => {
  assert(exists(resultHeader) && exists(facadeHeader), "application boundary headers are missing");
  const result = stripComments(read(resultHeader));
  const facade = stripComments(read(facadeHeader));
  assert(!/^\s*#\s*include\s*"/m.test(result), "result header has a project include");
  assert(!/source_view_registry|RegistryResult|SourceViewRegistry/.test(facade),
    "facade header leaks the domain registry");
  assert(/struct\s+ApplicationServiceResult/.test(result) &&
    /int\s+status\s*\{\s*200\s*\}/.test(result) &&
    /std::string\s+status_text\s*\{\s*"OK"\s*\}/.test(result) &&
    /std::string\s+body\s*;/.test(result), "application result shape drift");
  const sourceDto = extractBraceBlock(facade, "struct SourceRecord");
  const viewDto = extractBraceBlock(facade, "struct PublishedViewRecord");
  const accessDto = extractBraceBlock(facade, "struct ClientViewAccess");
  for (const field of sourceFields)
    assert(new RegExp(`\\b${field}\\b`).test(sourceDto), `source DTO field missing: ${field}`);
  for (const field of viewFields)
    assert(new RegExp(`\\b${field}\\b`).test(viewDto), `view DTO field missing: ${field}`);
  assert(/PublishedViewRecord\s+view\s*;/.test(accessDto) && /SourceRecord\s+source\s*;/.test(accessDto),
    "client access DTO shape drift");
  for (const method of methods)
    assert(new RegExp(`\\b${method}\\s*\\(`).test(facade), `facade method missing: ${method}`);
});

check("transport and ONVIF public API consume only the application boundary", () => {
  for (const file of transportFiles) {
    const text = stripComments(read(file));
    assert(!/source_view_registry\.h|\bSourceViewRegistry\b|\bRegistryResult\b/.test(text),
      `direct registry dependency remains: ${file}`);
  }
  const detail = read("src/ingress/webrtc_http_server_detail.h");
  assert(detail.includes('#include "ingress/source_view_application_service.h"'),
    "transport does not consume source/view application service");
  const onvifHeader = stripComments(read("include/ingress/onvif_live_import.h"));
  assert(!/source_view_registry\.h|\bRegistryResult\b/.test(onvifHeader),
    "ONVIF public header leaks the domain result");
  assert(/ApplicationServiceResult\s+BuildOnvifLiveImportDraft/.test(onvifHeader),
    "ONVIF draft result was not migrated to the common result");
  const onvifSource = stripComments(read("src/ingress/onvif_live_import.cpp"));
  assert(!/\bRegistryResult\b/.test(onvifSource) &&
    /ApplicationServiceResult\s+BuildOnvifLiveImportDraft/.test(onvifSource),
  "ONVIF implementation did not migrate to the common result");
});

check("facade implementation maps fields and preserves failure semantics", () => {
  assert(exists(facadeSource), "facade implementation is missing");
  const text = read(facadeSource);
  assert(text.includes('#include "ingress/source_view_registry.h"'),
    "facade implementation must own the concrete registry dependency");
  assertExactFieldMapping(extractBraceBlock(text, "ToApplicationSource("), sourceFields, "source DTO");
  assertExactFieldMapping(extractBraceBlock(text, "ToApplicationView("), viewFields, "view DTO");
  const accessBody = normalizeCpp(extractBraceBlock(text, "ToApplicationAccess("));
  assert(accessBody.includes("output.view=ToApplicationView(input.view);") &&
    accessBody.includes("output.source=ToApplicationSource(input.source);") &&
    (accessBody.match(/output\./g) || []).length === 2,
  "client access mapping drift");
  for (const method of methods)
    assert(text.includes(`SourceViewApplicationService::${method}`), `method implementation missing: ${method}`);
  const resolveBody = extractBraceBlock(text,
    "SourceViewApplicationService::ResolveClientViewAccess(");
  const resolveNormalized = normalizeCpp(resolveBody);
  const successBody = normalizeCpp(extractBraceBlock(resolveBody, "if (result.status == 200)"));
  assert(resolveNormalized.includes("if(access==nullptr){returnToApplicationServiceResult(SourceViewRegistry::Instance().ResolveClientViewAccess(view_id,authorizer,required_scope_prefix,nullptr));}") &&
    resolveNormalized.includes("SourceViewRegistry::ClientViewAccessdomain_access;") &&
    resolveNormalized.includes("ResolveClientViewAccess(view_id,authorizer,required_scope_prefix,&domain_access)") &&
    successBody === "*access=ToApplicationAccess(domain_access);" &&
    (resolveBody.match(/\*access\s*=/g) || []).length === 1,
  "Resolve null/failure output preservation drift");
  const snapshotBody = extractBraceBlock(text, "SourceViewApplicationService::Snapshot(");
  const snapshotNormalized = normalizeCpp(snapshotBody);
  assert(snapshotNormalized.includes("sources!=nullptr?&domain_sources:nullptr") &&
    snapshotNormalized.includes("views!=nullptr?&domain_views:nullptr") &&
    snapshotNormalized.includes(",error_message);") &&
    snapshotNormalized.includes("if(!ok){returnfalse;}") &&
    (snapshotBody.match(/\*sources\s*=/g) || []).length === 1 &&
    (snapshotBody.match(/\*views\s*=/g) || []).length === 1 &&
    snapshotBody.indexOf("if (!ok)") < snapshotBody.indexOf("*sources =") &&
    snapshotBody.indexOf("if (!ok)") < snapshotBody.indexOf("*views ="),
  "Snapshot null/failure output preservation drift");
});

check("compiled facade harness proves delegation, DTO mapping, null and failure outputs", () => {
  runSemanticHarness();
});

check("CMake and current graph bind the exact Slice 16 successor", () => {
  const cmake = read("CMakeLists.txt");
  assert((cmake.match(/src\/ingress\/source_view_application_service\.cpp/g) || []).length === 1,
    "facade source must appear exactly once in CMake");
  const graph = JSON.parse(read("test/fixtures/v390_structure_stabilization_current_graph.json"));
  const app = graph.moduleClassifiers.find(item => item.id === "application-service-interfaces");
  assert(graph.expectedProductionFiles === 204 && graph.expectedCppFiles === 100,
    "successor production graph count drift");
  assert(app?.expectedFileCount === 37 && app?.expectedCppCount === 16 &&
    [resultHeader, facadeHeader, facadeSource].every(file => app.exactFiles.includes(file)),
    "application owner successor drift");
  assert(graph.expectedFileOwnershipSha256 === "73f8564d0144d3e4751f0e4d5234b30197078dcc55ff002ac3913e264850dc52" &&
    graph.cmake.targets.find(item => item.id === "media_server_runtime")?.productionSourceSha256 ===
      "6e83e4350063b3654d171338350a4d01fc58fca0ddcbc574349eec1c8d116330",
  "classifier or production target binding drift");
  const domainEdge = graph.observedModuleEdges.find(item =>
    item.direction === "transport-and-auth-adapter -> domain-and-registry-owners");
  assert(domainEdge === undefined, "transport-domain direction must be closed");
  const appDomainEdge = graph.observedModuleEdges.find(item =>
    item.direction === "application-service-interfaces -> domain-and-registry-owners");
  const transportAppEdge = graph.observedModuleEdges.find(item =>
    item.direction === "transport-and-auth-adapter -> application-service-interfaces");
  assert(appDomainEdge?.witnessCount === 4 &&
    appDomainEdge.witnessSha256 === "31d96f595f69946917a1344d69d6698147dec011ec3750ca411c5486105cab25" &&
    transportAppEdge?.witnessCount === 19 &&
    transportAppEdge.witnessSha256 === "8cb29f2bf4ad70bd4ad35ca7cd8558d702a058e7fc06ec7f89698d44643bab19",
  "application-domain or transport-application witness drift");
  assert(graph.observedModuleEdges.length === 16 &&
    graph.observedModuleEdges.filter(item => item.allowedByTarget === false).length === 2 &&
    graph.stronglyConnectedComponents.length === 0,
    "edge/violation/SCC successor drift");
});

for (const item of checks)
  console.log(`- ${item.status}: ${item.name}${item.detail ? ` (${item.detail})` : ""}`);
const passed = checks.filter(item => item.status === "PASS").length;
const failed = checks.length - passed;
console.log(`- summary: pass=${passed} fail=${failed}`);
if (failed > 0) process.exitCode = 1;

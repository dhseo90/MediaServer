#!/usr/bin/env node
// REVIEW4-64 Slice 19: VLM observation reads through a dependency-free application boundary.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const args = process.argv.slice(2);
if (hasHelpFlag(args)) printUsageAndExit(`V390 VLM observation application boundary verification

Usage:
  ./server.sh verify-v390-vlm-observation-application-boundary
`);
assertKnownOptions(args, ["h", "help"]);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const exists = file => fs.existsSync(path.join(root, file));
const headerPath = "include/ingress/vlm_observation_application_service.h";
const sourcePath = "src/ingress/vlm_observation_application_service.cpp";
const detailPath = "src/ingress/webrtc_http_server_detail.h";
const routePath = "src/ingress/webrtc_http_server_ops_incidents.cpp";
const checks = [];
const transportFiles = [
  "include/ingress/http_auth.h", "include/ingress/webrtc_http_runtime_config.h",
  "src/ingress/http_auth.cpp", "include/ingress/webrtc_http_server.h",
  "src/ingress/webrtc_http_server.cpp", "src/ingress/webrtc_http_server_ops_foundation.cpp",
  "src/ingress/webrtc_http_server_ops_workflows.cpp", "src/ingress/webrtc_http_server_ops_incidents.cpp",
  "src/ingress/webrtc_http_server_runtime.cpp", "src/ingress/webrtc_http_server_detail.h",
];
function assert(value, message) { if (!value) throw new Error(message); }
function check(name, fn) { try { fn(); checks.push({name,status:"PASS"}); } catch (error) { checks.push({name,status:"FAIL",detail:error.message}); } }
function compactCpp(text) { return text.replace(/\s+/g, " ").trim(); }

check("dependency-free observation DTOs are exact", () => {
  assert(exists(headerPath), `${headerPath} missing`);
  const header = read(headerPath);
  const includes = [...header.matchAll(/^\s*#\s*include\s*([<"][^>"]+[>"])/gm)].map(match => match[1]);
  assert(JSON.stringify(includes) === JSON.stringify(["<cstddef>", "<cstdint>", "<string>", "<vector>"]),
    "application header include set drift");
  assert(!/#\s*include\s*["<](analysis|core|domain)\//.test(header) && !/\banalysis::/.test(header),
    "analysis/core/domain leaked into application DTO header");
  const exactStructs = new Map([
    ["VlmObservationQueryRequest", "std::string event_id; std::string source_id; std::string provider; std::string model; std::string privacy_mode; std::size_t offset{0}; std::size_t limit{100};"],
    ["VlmObservationQueryView", "bool file_exists{false}; std::vector<std::string> observations_json; std::size_t offset{0}; std::size_t limit{100}; std::size_t next_offset{0}; bool has_more{false}; bool truncated{false}; std::uint64_t matched_observations{0}; std::uint64_t skipped_corrupt_lines{0};"],
    ["VlmSummarySearchRequest", "std::string query; std::string source_id; std::string privacy_mode; std::size_t offset{0}; std::size_t limit{25};"],
    ["VlmRuleSuggestionRequest", "std::string source_id; std::string privacy_mode; std::string suggestion_kind; std::size_t offset{0}; std::size_t limit{25};"],
  ]);
  for (const [name, expectedBody] of exactStructs) {
    const match = header.match(new RegExp(`struct\\s+${name}\\s*\\{([\\s\\S]*?)\\n\\};`));
    assert(match && compactCpp(match[1]) === compactCpp(expectedBody), `exact DTO declaration drift: ${name}`);
  }
  const declarations = compactCpp(header);
  assert(declarations.includes(compactCpp("bool QueryVlmObservationStore(const VlmObservationQueryRequest& request, VlmObservationQueryView* output, std::string* error_message);")) &&
    declarations.includes(compactCpp("bool BuildVlmSummaryCandidates(const VlmSummarySearchRequest& request, std::string* body, std::string* error_message);")) &&
    declarations.includes(compactCpp("bool BuildVlmRuleSuggestionCandidates(const VlmRuleSuggestionRequest& request, std::string* body, std::string* error_message);")),
  "application function signature drift");
});

check("application implementation maps exact canonical requests and results", () => {
  assert(exists(sourcePath), `${sourcePath} missing`);
  const source = read(sourcePath);
  assert(source.includes('#include "analysis/vlm_observation_store.h"') &&
    (source.match(/analysis::DefaultVlmObservationStorePath\(\)/g) || []).length === 3,
  "canonical store path ownership drift");
  for (const field of ["event_id", "source_id", "provider", "model", "privacy_mode", "offset", "limit"]) {
    assert(source.includes(`options.${field} = request.${field}`), `query request mapping missing: ${field}`);
  }
  for (const field of ["file_exists", "observations_json", "offset", "limit", "next_offset", "has_more",
    "truncated", "matched_observations", "skipped_corrupt_lines"]) {
    assert(source.includes(`output->${field} = result.${field}`), `query result mapping missing: ${field}`);
  }
  assert(source.includes("analysis::QueryVlmObservations(") &&
    source.includes("analysis::BuildVlmSummarySearchCandidatesJson(") &&
    source.includes("analysis::BuildVlmRuleSuggestionCandidatesJson("),
  "canonical VLM observation delegation drift");
});

check("transport consumes only the observation application boundary", () => {
  const detail = read(detailPath);
  const route = read(routePath);
  assert(detail.includes('#include "ingress/vlm_observation_application_service.h"') &&
    !detail.includes('#include "analysis/vlm_observation_store.h"'), "transport include boundary drift");
  assert(route.includes("VlmObservationQueryRequest") && route.includes("QueryVlmObservationStore(") &&
    route.includes("BuildVlmSummaryCandidates(") && route.includes("BuildVlmRuleSuggestionCandidates("),
  "transport application calls missing");
  for (const file of transportFiles) {
    const text = read(file);
    assert(!text.includes('#include "analysis/vlm_observation_store.h"') &&
      !/\b(?:VlmObservationQueryOptions|VlmObservationQueryResult|VlmSummarySearchOptions|VlmRuleSuggestionOptions|QueryVlmObservations|DefaultVlmObservationStorePath|BuildVlmSummarySearchCandidatesJson|BuildVlmRuleSuggestionCandidatesJson)\b/.test(text),
    `transport direct observation dependency remains: ${file}`);
  }
});

check("compiled fake-analysis harness binds mapping and failure semantics", () => {
  assert(exists(sourcePath), `${sourcePath} missing`);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "v390-vlm-observation-app-"));
  try {
    const fakeDir = path.join(temp, "analysis");
    fs.mkdirSync(fakeDir, {recursive:true});
    fs.writeFileSync(path.join(fakeDir, "vlm_observation_store.h"), `#pragma once\n#include <cstddef>\n#include <cstdint>\n#include <string>\n#include <vector>\nnamespace analysis { struct VlmObservationQueryOptions{std::string event_id,source_id,provider,model,privacy_mode;std::size_t offset{0},limit{100};}; struct VlmObservationQueryResult{bool file_exists{false};std::vector<std::string> observations_json;std::size_t offset{0},limit{100},next_offset{0};bool has_more{false},truncated{false};std::uint64_t matched_observations{0},skipped_corrupt_lines{0};}; struct VlmSummarySearchOptions{std::string query,source_id,privacy_mode;std::size_t offset{0},limit{25};}; struct VlmRuleSuggestionOptions{std::string source_id,privacy_mode,suggestion_kind;std::size_t offset{0},limit{25};}; std::string DefaultVlmObservationStorePath(); bool QueryVlmObservations(const std::string&,const VlmObservationQueryOptions&,VlmObservationQueryResult*,std::string*); bool BuildVlmSummarySearchCandidatesJson(const std::string&,const VlmSummarySearchOptions&,std::string*,std::string*); bool BuildVlmRuleSuggestionCandidatesJson(const std::string&,const VlmRuleSuggestionOptions&,std::string*,std::string*); }\n`);
    const harness = path.join(temp, "harness.cpp");
    fs.writeFileSync(harness, `#include "analysis/vlm_observation_store.h"
#include "ingress/vlm_observation_application_service.h"
namespace analysis {
static VlmObservationQueryOptions q;
static VlmSummarySearchOptions s;
static VlmRuleSuggestionOptions r;
static const std::string observation = R"json({"id":1,"nested":{"text":"한글","quote":"\\\""}})json";
static const std::string summary = R"json({"candidates":[{"privacy_mode":"local","manual_only":true,"text":"한글 \\\"summary\\\""}]})json";
static const std::string rule = R"json({"candidates":[{"privacy_mode":"local","manual_only":true,"kind":"draft-only","nested":{"escaped":"a\\\\b"}}]})json";
std::string DefaultVlmObservationStorePath(){return "canonical";}
bool QueryVlmObservations(const std::string& p,const VlmObservationQueryOptions& v,VlmObservationQueryResult* o,std::string* e){
  q=v;if(p!="canonical")return false;
  if(v.event_id=="fail"){o->file_exists=true;o->observations_json={"partial-observation"};o->offset=31;o->limit=41;o->next_offset=51;o->has_more=true;o->truncated=true;o->matched_observations=61;o->skipped_corrupt_lines=71;if(e)*e="query failure";return false;}
  o->file_exists=true;o->observations_json={observation};o->offset=2;o->limit=3;o->next_offset=4;o->has_more=true;o->truncated=true;o->matched_observations=5;o->skipped_corrupt_lines=6;return true;
}
bool BuildVlmSummarySearchCandidatesJson(const std::string& p,const VlmSummarySearchOptions& v,std::string* b,std::string* e){s=v;if(v.query=="fail"){*b="summary-partial";if(e)*e="summary failure";return false;}*b=summary;return p=="canonical";}
bool BuildVlmRuleSuggestionCandidatesJson(const std::string& p,const VlmRuleSuggestionOptions& v,std::string* b,std::string* e){r=v;if(v.suggestion_kind=="fail"){*b="rule-partial";if(e)*e="rule failure";return false;}*b=rule;return p=="canonical";}
}
int main(){
  ingress::VlmObservationQueryRequest q;q.event_id="e";q.source_id="s";q.provider="p";q.model="m";q.privacy_mode="local";q.offset=2;q.limit=3;
  ingress::VlmObservationQueryView v;std::string e;
  if(!ingress::QueryVlmObservationStore(q,&v,&e)||analysis::q.event_id!="e"||analysis::q.source_id!="s"||analysis::q.provider!="p"||analysis::q.model!="m"||analysis::q.privacy_mode!="local"||analysis::q.offset!=2||analysis::q.limit!=3||!v.file_exists||v.observations_json.size()!=1||v.observations_json[0]!=analysis::observation||v.offset!=2||v.limit!=3||v.next_offset!=4||!v.has_more||!v.truncated||v.matched_observations!=5||v.skipped_corrupt_lines!=6)return 1;
  e.clear();if(ingress::QueryVlmObservationStore(q,nullptr,&e)||e!="VLM observation query output is required")return 2;
  q.event_id="fail";e.clear();if(ingress::QueryVlmObservationStore(q,&v,&e)||e!="query failure"||!v.file_exists||v.observations_json.size()!=1||v.observations_json[0]!="partial-observation"||v.offset!=31||v.limit!=41||v.next_offset!=51||!v.has_more||!v.truncated||v.matched_observations!=61||v.skipped_corrupt_lines!=71)return 3;
  ingress::VlmSummarySearchRequest s;s.query="q";s.source_id="src";s.privacy_mode="local";s.offset=7;s.limit=8;std::string b;
  if(!ingress::BuildVlmSummaryCandidates(s,&b,&e)||b!=analysis::summary||analysis::s.query!="q"||analysis::s.source_id!="src"||analysis::s.privacy_mode!="local"||analysis::s.offset!=7||analysis::s.limit!=8)return 4;
  s.query="fail";e.clear();if(ingress::BuildVlmSummaryCandidates(s,&b,&e)||b!="summary-partial"||e!="summary failure")return 5;
  ingress::VlmRuleSuggestionRequest r;r.source_id="src";r.privacy_mode="local";r.suggestion_kind="kind";r.offset=9;r.limit=10;
  if(!ingress::BuildVlmRuleSuggestionCandidates(r,&b,&e)||b!=analysis::rule||analysis::r.source_id!="src"||analysis::r.privacy_mode!="local"||analysis::r.suggestion_kind!="kind"||analysis::r.offset!=9||analysis::r.limit!=10)return 6;
  r.suggestion_kind="fail";e.clear();if(ingress::BuildVlmRuleSuggestionCandidates(r,&b,&e)||b!="rule-partial"||e!="rule failure")return 7;
  return 0;
}
`);
    const binary = path.join(temp, "harness");
    execFileSync(process.env.CXX || "c++", ["-std=c++17", `-I${temp}`, `-I${path.join(root,"include")}`,
      path.join(root,sourcePath), harness, "-o", binary]);
    execFileSync(binary);
  } finally { fs.rmSync(temp, {recursive:true,force:true}); }
});

check("CMake and exact graph successor bind Slice 19", () => {
  const cmake = read("CMakeLists.txt");
  const graph = JSON.parse(read("test/fixtures/v390_structure_stabilization_current_graph.json"));
  assert(cmake.split(sourcePath).length - 1 === 1, "CMake source exact-once binding missing");
  const owner = graph.moduleClassifiers.find(item => item.id === "application-service-interfaces");
  const edge = direction => graph.observedModuleEdges.find(item => item.direction === direction);
  assert(owner?.exactFiles.includes(headerPath) && owner.exactFiles.includes(sourcePath) &&
    owner.expectedFileCount === 25 && owner.expectedCppCount === 10 &&
    graph.expectedProductionFiles === 190 && graph.expectedCppFiles === 93 &&
    graph.observedModuleEdges.length === 17 && graph.observedModuleEdges.filter(item => !item.allowedByTarget).length === 3 &&
    graph.stronglyConnectedComponents.length === 0 &&
    edge("transport-and-auth-adapter -> analysis-services")?.witnessCount === 11 &&
    edge("transport-and-auth-adapter -> analysis-services")?.witnessSha256 === "c9ed6ffdfab98888158999874e0d4c7dcd2c3aafa3eb87c6b02ac0e5f9e460cc" &&
    edge("transport-and-auth-adapter -> analysis-services")?.allowedByTarget === false &&
    edge("application-service-interfaces -> analysis-services")?.witnessCount === 8 &&
    edge("application-service-interfaces -> analysis-services")?.witnessSha256 === "6ad1bfd8758a13102e249858140fd6269b5d771117bd1c6365617a09dc22808b" &&
    edge("application-service-interfaces -> analysis-services")?.allowedByTarget === true &&
    edge("transport-and-auth-adapter -> application-service-interfaces")?.witnessCount === 13 &&
    edge("transport-and-auth-adapter -> application-service-interfaces")?.witnessSha256 === "3f9760963c48c996f1c4568bd1d16f7b081fbc6a52be9623853f74a9dbca12c4" &&
    edge("transport-and-auth-adapter -> application-service-interfaces")?.allowedByTarget === true,
  "exact Slice 19 graph successor drift");
});

for (const item of checks) console.log(`- ${item.status}: ${item.name}${item.detail ? ` — ${item.detail}` : ""}`);
const failed = checks.filter(item => item.status === "FAIL").length;
console.log(`- summary: pass=${checks.length-failed} fail=${failed}`);
process.exit(failed ? 1 : 0);

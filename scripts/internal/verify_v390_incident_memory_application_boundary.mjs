#!/usr/bin/env node
// REVIEW4-64 Slice 20: incident-memory projection/search/privacy behind an application boundary.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const args = process.argv.slice(2);
if (hasHelpFlag(args)) printUsageAndExit(`V390 incident memory application boundary verification

Usage:
  ./server.sh verify-v390-incident-memory-application-boundary
`);
assertKnownOptions(args, ["h", "help"]);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const exists = file => fs.existsSync(path.join(root, file));
const headerPath = "include/ingress/incident_memory_application_service.h";
const sourcePath = "src/ingress/incident_memory_application_service.cpp";
const detailPath = "src/ingress/webrtc_http_server_detail.h";
const serverPath = "src/ingress/webrtc_http_server.cpp";
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
function compactCppPreservingLiterals(text) {
  let output = "";
  let quote = "";
  let escaped = false;
  let pendingSpace = false;
  for (const char of text) {
    if (quote) {
      output += char;
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") {
      if (pendingSpace && output.length > 0) output += " ";
      pendingSpace = false;
      quote = char;
      output += char;
      continue;
    }
    if (/\s/.test(char)) {
      pendingSpace = true;
      continue;
    }
    if (pendingSpace && output.length > 0) output += " ";
    pendingSpace = false;
    output += char;
  }
  return output.trim();
}
function functionBlock(text, signature) {
  const anchor = text.indexOf(signature);
  assert(anchor >= 0, `function anchor missing: ${signature}`);
  const start = text.indexOf("{", anchor + signature.length);
  assert(start >= 0, `function body missing: ${signature}`);
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
    else if (char === "}" && --depth === 0) return text.slice(anchor, index + 1);
  }
  throw new Error(`unterminated function: ${signature}`);
}

check("dependency-free incident-memory DTO contract exists", () => {
  assert(exists(headerPath), `${headerPath} missing`);
  const header = read(headerPath);
  assert(!/#\s*include\s*["<](analysis|core|domain)\//.test(header) && !/\b(?:analysis|core|domain)::/.test(header),
    "owner dependency leaked into incident-memory application header");
  for (const name of ["IncidentMemorySearchRequest", "IncidentMemorySearchResult",
    "IncidentMemorySearchHitView", "IncidentMemoryProjectionView"]) {
    assert(header.includes(`struct ${name}`), `DTO missing: ${name}`);
  }
  for (const snippet of [
    "std::vector<std::string> event_records_json; std::vector<std::string> ops_audit_records_json; std::string query; std::size_t limit{12};",
    "std::string document_id; std::string source_kind; std::string incident_id; std::string source_id; std::string title; std::string summary; double score{0.0}; std::vector<std::string> matched_terms; std::vector<std::string> highlight_fragments;",
    "std::string backend; bool sqlite_fts5_available{false}; bool fallback_active{false}; bool model_provider_dependency{false}; std::size_t document_count{0}; bool open_succeeded{false}; bool search_succeeded{false}; std::vector<IncidentMemorySearchHitView> hits;",
  ]) assert(compactCpp(header).includes(compactCpp(snippet)), `exact DTO member/default drift: ${snippet}`);
});

check("application service owns canonical projection search and privacy", () => {
  assert(exists(sourcePath), `${sourcePath} missing`);
  const source = read(sourcePath);
  for (const token of ["analysis::ProjectEventRecordIncidentText", "analysis::ProjectOpsAuditIncidentText",
    "analysis::IncidentProjectionContainsForbiddenMaterial", "analysis::IncidentMemoryIndex",
    "force_jsonl_bm25_fallback = true", "BuildIncidentMemoryHighlightFragments"]) {
    assert(source.includes(token), `canonical application ownership missing: ${token}`);
  }
});

check("transport has no raw incident-memory implementation dependency", () => {
  for (const file of transportFiles) {
    const text = read(file);
    assert(!text.includes('#include "analysis/incident_memory.h"') &&
      !/\b(?:IncidentProjectionDocument|IncidentMemoryIndex|IncidentMemoryIndexConfig|IncidentMemorySearchOptions|IncidentMemorySearchHit|ProjectEventRecordIncidentText|ProjectOpsAuditIncidentText|IncidentProjectionContainsForbiddenMaterial)\b/.test(text),
    `transport incident-memory implementation dependency remains: ${file}`);
  }
  assert(read(detailPath).includes('#include "ingress/incident_memory_application_service.h"'),
    "transport application include missing");
});

check("compiled fake-analysis harness binds mapping privacy and fail-soft semantics", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "v390-incident-memory-app-"));
  try {
    const fakeDir = path.join(temp, "analysis");
    fs.mkdirSync(fakeDir, {recursive:true});
    fs.writeFileSync(path.join(fakeDir, "incident_memory.h"), `#pragma once
#include <cstddef>
#include <cstdint>
#include <string>
#include <vector>
namespace analysis {
struct IncidentProjectionField{std::string name,value;};
struct IncidentProjectionDocument{std::string schema{"media-server.incident-text-projection.v1"},document_id,source_kind,record_id,event_id,incident_id,source_id;std::int64_t timestamp_ms{0};std::string title,summary,searchable_text;std::vector<std::string> tokens;std::vector<IncidentProjectionField> fields;std::vector<std::string> redacted_fields;bool redaction_applied{false};};
struct IncidentMemoryIndexConfig{std::string sqlite_path,jsonl_path;bool prefer_sqlite_fts5{true},force_jsonl_bm25_fallback{false};};
struct IncidentMemoryIndexReport{std::string schema{"media-server.incident-memory-index.v1"},backend,sqlite_path,jsonl_path;bool sqlite_fts5_available{false},fallback_active{false},model_provider_dependency{false};std::size_t document_count{0};};
struct IncidentMemorySearchOptions{std::string query;std::size_t limit{10};};
struct IncidentMemorySearchHit{std::string document_id,source_kind,incident_id,source_id,title,summary;double score{0};std::vector<std::string> matched_terms;};
class IncidentMemoryIndex{public:IncidentMemoryIndex();~IncidentMemoryIndex();bool Open(const IncidentMemoryIndexConfig&,std::string*);bool Upsert(const IncidentProjectionDocument&,std::string*);bool Search(const IncidentMemorySearchOptions&,std::vector<IncidentMemorySearchHit>*,std::string*)const;IncidentMemoryIndexReport Report()const;};
IncidentProjectionDocument ProjectEventRecordIncidentText(const std::string&);IncidentProjectionDocument ProjectOpsAuditIncidentText(const std::string&);bool IncidentProjectionContainsForbiddenMaterial(const std::string&);
}
`);
    const harness = path.join(temp, "harness.cpp");
    fs.writeFileSync(harness, `#include "analysis/incident_memory.h"
#include "ingress/incident_memory_application_service.h"
namespace analysis {
static IncidentMemoryIndexConfig opened;static std::vector<IncidentProjectionDocument> docs;static std::vector<std::string> calls;static IncidentMemorySearchOptions searched;static bool open_fail=false,upsert_fail=false,search_fail=false;
static IncidentProjectionDocument MakeDoc(const std::string& kind,const std::string& raw){IncidentProjectionDocument d;d.document_id=kind+"-doc";d.source_kind=kind;d.record_id="record";d.event_id="event";d.incident_id="incident";d.source_id="source";d.timestamp_ms=17;d.title="title 한글";d.summary="summary \\\"quoted\\\"";d.searchable_text=raw=="forbidden"?"credential=secret":"prefix 한글 needle tail";d.tokens={"needle","한글"};d.fields={{"safe","value"}};d.redacted_fields={"sourceUrl","credential"};d.redaction_applied=true;return d;}
IncidentMemoryIndex::IncidentMemoryIndex()=default;IncidentMemoryIndex::~IncidentMemoryIndex()=default;
bool IncidentMemoryIndex::Open(const IncidentMemoryIndexConfig& c,std::string* e){opened=c;docs.clear();calls.clear();calls.push_back("open");if(open_fail){if(e)*e="open failure";return false;}return true;}
bool IncidentMemoryIndex::Upsert(const IncidentProjectionDocument& d,std::string*){calls.push_back("upsert:"+d.document_id);if(upsert_fail)return false;docs.push_back(d);return true;}
bool IncidentMemoryIndex::Search(const IncidentMemorySearchOptions& o,std::vector<IncidentMemorySearchHit>* h,std::string* e)const{calls.push_back("search");searched=o;if(search_fail){h->push_back({.document_id="stale"});if(e)*e="search failure";return false;}if(!docs.empty()){h->push_back({.document_id="event-doc",.source_kind="event",.incident_id="incident-event",.source_id="source-event",.title="title event",.summary="summary event",.score=3.5,.matched_terms={"needle","tail"}});h->push_back({.document_id="audit-doc",.source_kind="audit",.incident_id="incident-audit",.source_id="source-audit",.title="title audit",.summary="summary audit",.score=2.5,.matched_terms={"한글","needle"}});}return true;}
IncidentMemoryIndexReport IncidentMemoryIndex::Report()const{calls.push_back("report");IncidentMemoryIndexReport r;r.backend="jsonl-bm25";r.fallback_active=true;r.document_count=docs.size();return r;}
IncidentProjectionDocument ProjectEventRecordIncidentText(const std::string& raw){return MakeDoc("event",raw);}IncidentProjectionDocument ProjectOpsAuditIncidentText(const std::string& raw){return MakeDoc("audit",raw);}bool IncidentProjectionContainsForbiddenMaterial(const std::string& v){return v.find("credential")!=std::string::npos;}
}
int main(){
  const auto p=ingress::ProjectEventRecordForIncidentMemory("event");if(p.schema!="media-server.incident-text-projection.v1"||p.document_id!="event-doc"||p.source_kind!="event"||p.record_id!="record"||p.event_id!="event"||p.incident_id!="incident"||p.source_id!="source"||p.timestamp_ms!=17||p.title!="title 한글"||p.summary!="summary \\\"quoted\\\""||p.searchable_text!="prefix 한글 needle tail"||p.tokens!=std::vector<std::string>({"needle","한글"})||p.fields.size()!=1||p.fields[0].name!="safe"||p.fields[0].value!="value"||p.redacted_fields!=std::vector<std::string>({"sourceUrl","credential"})||!p.redaction_applied)return 1;
  if(!ingress::IsIncidentMemoryValueReleaseSafe("safe")||ingress::IsIncidentMemoryValueReleaseSafe("credential=secret"))return 2;
  ingress::IncidentMemorySearchRequest q;q.event_records_json={"event","forbidden"};q.ops_audit_records_json={"audit"};q.query="needle";q.limit=7;ingress::IncidentMemorySearchResult o;std::string e;
  if(!ingress::SearchIncidentMemory(q,&o,&e)||analysis::opened.prefer_sqlite_fts5||!analysis::opened.force_jsonl_bm25_fallback||!analysis::opened.sqlite_path.empty()||!analysis::opened.jsonl_path.empty()||analysis::searched.query!="needle"||analysis::searched.limit!=7||analysis::docs.size()!=2||analysis::calls!=std::vector<std::string>({"open","upsert:event-doc","upsert:audit-doc","search","report"})||o.backend!="jsonl-bm25"||!o.fallback_active||o.model_provider_dependency||o.document_count!=2||!o.open_succeeded||!o.search_succeeded||o.hits.size()!=2)return 3;
  const auto& h0=o.hits[0];if(h0.document_id!="event-doc"||h0.source_kind!="event"||h0.incident_id!="incident-event"||h0.source_id!="source-event"||h0.title!="title event"||h0.summary!="summary event"||h0.score!=3.5||h0.matched_terms!=std::vector<std::string>({"needle","tail"})||h0.highlight_fragments!=std::vector<std::string>({"prefix 한글 needle tail","prefix 한글 needle tail"}))return 4;
  const auto& h1=o.hits[1];if(h1.document_id!="audit-doc"||h1.source_kind!="audit"||h1.incident_id!="incident-audit"||h1.source_id!="source-audit"||h1.title!="title audit"||h1.summary!="summary audit"||h1.score!=2.5||h1.matched_terms!=std::vector<std::string>({"한글","needle"})||h1.highlight_fragments!=std::vector<std::string>({"prefix 한글 needle tail","prefix 한글 needle tail"}))return 9;
  e.clear();if(ingress::SearchIncidentMemory(q,nullptr,&e)||e!="incident memory search output is required")return 5;
  analysis::search_fail=true;e.clear();if(ingress::SearchIncidentMemory(q,&o,&e)||o.search_succeeded||o.hits.size()!=0||o.document_count!=2||e!="search failure")return 6;
  analysis::search_fail=false;analysis::open_fail=true;q.query.clear();e.clear();if(ingress::SearchIncidentMemory(q,&o,&e)||o.open_succeeded||!o.search_succeeded||o.document_count!=2||e!="open failure")return 7;
  analysis::open_fail=false;analysis::upsert_fail=true;q.query="needle";e.clear();if(!ingress::SearchIncidentMemory(q,&o,&e)||analysis::calls!=std::vector<std::string>({"open","upsert:event-doc","upsert:audit-doc","search","report"})||!o.open_succeeded||!o.search_succeeded||o.document_count!=2||!o.hits.empty())return 8;
  return 0;
}
`);
    const binary = path.join(temp, "harness");
    execFileSync(process.env.CXX || "c++", ["-std=c++17", `-I${temp}`, `-I${path.join(root,"include")}`,
      path.join(root,sourcePath), harness, "-o", binary]);
    execFileSync(binary);
  } finally { fs.rmSync(temp, {recursive:true,force:true}); }
});

check("rollback output emission proves Ops and release-safe JSON byte parity", () => {
  assert(compactCppPreservingLiterals('out << "raw evidence files excluded";') !==
    compactCppPreservingLiterals('out << "raw  evidence files excluded";'),
  "literal-preserving normalizer accepts JSON byte drift");
  const rollback = "eb9e64e9a550e32bb33bb3ff3217fceede65045e";
  const before = execFileSync("git", ["show", `${rollback}:${routePath}`], {cwd:root,encoding:"utf8"});
  const after = read(routePath);
  const searchSignature = "std::string OpsIncidentMemorySearchViewJson(";
  const beforeSearch = functionBlock(before, searchSignature);
  const afterSearch = functionBlock(after, searchSignature);
  const requestStart = afterSearch.indexOf("IncidentMemorySearchRequest memory_request;");
  const requestEnd = afterSearch.indexOf("std::ostringstream out;", requestStart);
  assert(requestStart >= 0 && requestEnd > requestStart, "route request assembly block missing");
  const actualRequestAssembly = compactCppPreservingLiterals(
    afterSearch.slice(requestStart, requestEnd));
  const expectedRequestAssembly = compactCppPreservingLiterals(`
    IncidentMemorySearchRequest memory_request;
    memory_request.query = search_query;
    memory_request.limit = 12;
    memory_request.event_records_json.reserve(event_json_records.size());
    memory_request.ops_audit_records_json.reserve(event_json_records.size());
    for (const std::string& event_json : event_json_records) {
        const std::string event_id = Trim(ParseStringField(event_json, "eventId").value_or(""));
        const auto review_it = reviews.find(event_id);
        const OpsEventReviewState review =
            review_it == reviews.end() ? DefaultOpsEventReviewState(event_id) : review_it->second;
        if (!OpsIncidentMemoryRecordMatchesFilters(
                event_json, review, rule_id, source_id, incident_status)) {
            continue;
        }
        memory_request.event_records_json.push_back(event_json);
        if (review.present) {
            memory_request.ops_audit_records_json.push_back(OpsIncidentReviewProjectionJson(review));
        }
    }
    IncidentMemorySearchResult memory_result;
    std::string error_message;
    (void)SearchIncidentMemory(memory_request, &memory_result, &error_message);
  `);
  assert(actualRequestAssembly === expectedRequestAssembly,
    "route limit or ordered event/audit request assembly drift");
  assert(compactCppPreservingLiterals(afterSearch
    .replace("memory_request.limit = 12;", "memory_request.limit = 1;")
    .slice(requestStart, requestEnd)) !== expectedRequestAssembly,
  "route request assembly oracle accepts limit mutation");
  const normalizeSearchEmission = block => {
    let emission = block.slice(block.indexOf("std::ostringstream out;"));
    emission = emission.replace("const auto report = index.Report();", "");
    emission = emission.replace(/\s*const auto doc_it =[\s\S]*?OpsIncidentMemoryHighlightFragments\(\*doc_it, hit\.matched_terms\);/, "");
    return compactCppPreservingLiterals(emission
      .replaceAll("memory_result.backend", "report.backend")
      .replaceAll("memory_result.document_count", "documents.size()")
      .replaceAll("memory_result.hits", "hits")
      .replaceAll("hit.highlight_fragments", "highlights"));
  };
  assert(normalizeSearchEmission(afterSearch) === normalizeSearchEmission(beforeSearch),
    "Ops incident-memory JSON output emission drift");
  const evidenceSignature = "std::string BuildReleaseSafeIncidentEvidenceBundleManifest(";
  const beforeEvidence = compactCppPreservingLiterals(functionBlock(before, evidenceSignature));
  const afterEvidence = compactCppPreservingLiterals(functionBlock(after, evidenceSignature)
    .replaceAll("ProjectEventRecordForIncidentMemory", "analysis::ProjectEventRecordIncidentText"));
  assert(afterEvidence === beforeEvidence, "release-safe evidence JSON output emission drift");
});

check("CMake and dispatch bind the focused boundary", () => {
  assert(read("CMakeLists.txt").split(sourcePath).length - 1 === 1, "CMake source exact-once binding missing");
  const server = read("server.sh");
  assert((server.match(/verify-v390-incident-memory-application-boundary/g) || []).length === 3,
    "server.sh help/dispatch exact binding missing");
});

check("actual graph successor reduces one transport-analysis witness", () => {
  const graph = JSON.parse(read("test/fixtures/v390_structure_stabilization_current_graph.json"));
  const owner = graph.moduleClassifiers.find(item => item.id === "application-service-interfaces");
  const edge = direction => graph.observedModuleEdges.find(item => item.direction === direction);
  assert(graph.boundary === "current REVIEW4-64 continuation graph after the Event POST application boundary; transport projects dependency-free payload/status DTOs while the application implementation alone maps the canonical dispatcher, Policy v1 counts 3 target-direction violations and zero multi-owner SCCs, internal target separation is true, and remaining transport/final-evidence debt keeps completion closed" &&
    graph.expectedProductionFiles === 188 && graph.expectedCppFiles === 92 &&
    owner?.expectedFileCount === 23 && owner.expectedCppCount === 9 &&
    edge("transport-and-auth-adapter -> analysis-services")?.witnessCount === 13 &&
    edge("transport-and-auth-adapter -> analysis-services")?.witnessSha256 === "2a57a73c7b95d0ff5afe52fff4af915ce8a99a0ab1ce96a1cf2ca24eff378233" &&
    edge("transport-and-auth-adapter -> analysis-services")?.allowedByTarget === false &&
    edge("application-service-interfaces -> analysis-services")?.witnessCount === 6 &&
    edge("application-service-interfaces -> analysis-services")?.witnessSha256 === "01462553c675fb8de7829bf128aa059679c3950f2f532209d495010e9c995251" &&
    edge("application-service-interfaces -> analysis-services")?.allowedByTarget === true &&
    edge("transport-and-auth-adapter -> application-service-interfaces")?.witnessCount === 12 &&
    edge("transport-and-auth-adapter -> application-service-interfaces")?.witnessSha256 === "cb40c1b772183f109c5a5cf7522303b1c102d59ad2c6a46449ef684046e64d34" &&
    edge("transport-and-auth-adapter -> application-service-interfaces")?.allowedByTarget === true &&
    graph.observedModuleEdges.length === 17 &&
    graph.observedModuleEdges.filter(item => !item.allowedByTarget).length === 3 &&
    graph.stronglyConnectedComponents.length === 0,
  "Slice 20 graph successor missing");
});

for (const item of checks) console.log(`- ${item.status}: ${item.name}${item.detail ? ` — ${item.detail}` : ""}`);
const failed = checks.filter(item => item.status === "FAIL").length;
console.log(`- summary: pass=${checks.length-failed} fail=${failed}`);
process.exit(failed ? 1 : 0);

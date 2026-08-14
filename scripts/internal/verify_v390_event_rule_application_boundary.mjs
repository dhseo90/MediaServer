#!/usr/bin/env node
// 파일 용도: REVIEW4-64 Slice 29 Event Rule runtime/evaluation의 opaque application 경계를 검증한다.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const args = process.argv.slice(2);
if (hasHelpFlag(args)) printUsageAndExit(`V390 Event Rule application boundary verification

Usage:
  ./server.sh verify-v390-event-rule-application-boundary
`);
assertKnownOptions(args, ["h", "help"]);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const headerPath = "include/ingress/event_rule_application_service.h";
const sourcePath = "src/ingress/event_rule_application_service.cpp";
const serverPath = "src/ingress/webrtc_http_server.cpp";
const incidentsPath = "src/ingress/webrtc_http_server_ops_incidents.cpp";
const runtimePath = "src/ingress/webrtc_http_server_runtime.cpp";
const detailPath = "src/ingress/webrtc_http_server_detail.h";
const transportPaths = [
  "include/ingress/http_auth.h",
  "include/ingress/webrtc_http_runtime_config.h",
  "src/ingress/http_auth.cpp",
  "include/ingress/webrtc_http_server.h",
  serverPath,
  "src/ingress/webrtc_http_server_ops_foundation.cpp",
  "src/ingress/webrtc_http_server_ops_workflows.cpp",
  incidentsPath,
  runtimePath,
  detailPath,
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
function exactFragment(text, fragment, label) {
  assert(exactCount(compact(text), new RegExp(escapeRegex(fragment), "g")) === 1,
    `${label} exact fragment drift: ${fragment}`);
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
function body(text, name) {
  const marker = new RegExp(`\\b${name}\\s*\\([^)]*\\)\\s*(?:const\\s*)?\\{`, "s");
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
function replaceExact(text, before, after, label) {
  assert(exactCount(text, new RegExp(escapeRegex(before), "g")) === 1,
    `${label} mutation anchor drift: ${before}`);
  return text.replace(before, after);
}
function assertRejected(label, fn) {
  let rejected = false;
  try { fn(); } catch { rejected = true; }
  assert(rejected, `${label} mutation produced false PASS`);
}

function assertHeaderContract(header) {
  const includes = [...header.matchAll(/^\s*#\s*include\s*([<"][^>"]+[>"])/gm)].map(item => item[1]);
  assert(JSON.stringify(includes) === JSON.stringify([
    '"ingress/analysis_session_read_application_service.h"',
    "<cstddef>", "<memory>", "<string>", "<vector>",
  ]),
    "application header standard include manifest drift");
  assert(exactCount(header, /#include "ingress\/analysis_session_read_application_service\.h"/g) === 1,
    "application header approved dependency drift");
  for (const declaration of [
    "struct AnalysisEvent;", "struct AnalysisMetricsReport;", "struct AnalysisResult;",
  ]) exactFragment(header, declaration, "analysis forward declaration");
  for (const fragment of [
    "class EventRuleApplicationRuntime {",
    "explicit EventRuleApplicationRuntime(std::unique_ptr<Impl> impl);",
    "class EventRuleApplicationEvaluation {",
    "explicit EventRuleApplicationEvaluation(std::unique_ptr<Impl> impl);",
    "const analysis::AnalysisResult& AnnotatedResult() const;",
    "const std::vector<analysis::AnalysisEvent>& Events() const;",
    "std::size_t ActiveRuleCount() const;",
    "std::size_t MatchedDetectionCount() const;",
    "const analysis::AnalysisMetricsReport* MetricsReport() const;",
    "const std::string& TrackingIssueReportJson() const;",
  ]) exactFragment(header, fragment, "opaque API/PIMPL manifest");
  assert(exactCount(header, /^class EventRuleApplicationEvaluation;$/gm) === 1,
    "evaluation forward declaration count drift");
  assert(exactCount(header, /^\s*struct Impl;$/gm) === 2,
    "runtime/evaluation private Impl declaration count drift");
  assert(exactCount(header, /^std::shared_ptr<EventRuleApplicationRuntime> CreateEphemeralEventRuleApplicationRuntime\(\);$/gm) === 1 &&
    exactCount(header, /^std::shared_ptr<EventRuleApplicationRuntime> AcquireEventRuleApplicationRuntime\(const std::string& key\);$/gm) === 1 &&
    exactCount(header, /^void ReleaseEventRuleApplicationRuntime\(const std::string& key\);$/gm) === 1 &&
    exactCount(header, /^EventRuleApplicationEvaluation EvaluateEventRulesForApplication\($/gm) === 2,
  "public Event Rule application API declaration manifest drift");
  assert(exactCount(header,
    /^\s*friend std::shared_ptr<EventRuleApplicationRuntime> CreateEphemeralEventRuleApplicationRuntime\(\);$/gm) === 1 &&
    exactCount(header,
      /friend std::shared_ptr<EventRuleApplicationRuntime> AcquireEventRuleApplicationRuntime\(\s*const std::string& key\);/g) === 1 &&
    exactCount(header,
      /friend EventRuleApplicationEvaluation EvaluateEventRulesForApplication\(\s*const analysis::AnalysisResult& result,\s*const std::shared_ptr<EventRuleApplicationRuntime>& runtime\);/g) === 2,
  "private runtime/evaluation factory friend manifest drift");
  assert(exactCount(header, /std::unique_ptr<Impl> impl_;/g) === 2, "runtime/evaluation PIMPL member count drift");
  assert(exactCount(header, /EventRuleApplicationEvaluation\(const EventRuleApplicationEvaluation&\) = delete;/g) === 1 &&
    exactCount(header, /EventRuleApplicationRuntime\(const EventRuleApplicationRuntime&\) = delete;/g) === 1,
  "opaque value/runtime copy policy drift");
  for (const token of [
    "event_rule_engine.h", "EventRuleRuntime>", "EventRuleEvaluation ", "ApplyEventRulesToResult",
    "reinterpret_cast", "std::any", "std::variant", "void*",
  ]) assert(!header.includes(token), `canonical/unsafe implementation leaked into header: ${token}`);
}

function assertSourceContract(source) {
  assert(exactCount(source, /#include "analysis\/event_rule_engine\.h"/g) === 1,
    "canonical event-rule include must exist source-only exactly once");
  assert(exactCount(source, /#include "ingress\/analysis_rule_application_service\.h"/g) === 1,
    "stored-rule snapshot include missing");
  assert(exactCount(source, /struct EventRuleApplicationRuntime::Impl/g) === 1 &&
    exactCount(source, /struct EventRuleApplicationEvaluation::Impl/g) === 1,
  "runtime/evaluation concrete PIMPL ownership drift");
  exactFragment(source, "std::shared_ptr<analysis::EventRuleRuntime> runtime;", "canonical runtime storage");
  exactFragment(source, "analysis::EventRuleEvaluation evaluation;", "canonical evaluation storage");

  for (const [name, fragment] of [
    ["AnnotatedResult", "return impl_->evaluation.annotated_result;"],
    ["Events", "return impl_->evaluation.events;"],
    ["ActiveRuleCount", "return impl_->evaluation.active_rule_count;"],
    ["MatchedDetectionCount", "return impl_->evaluation.matched_detection_count;"],
    ["MetricsReport", "return impl_->evaluation.metrics_report.has_value() ? &*impl_->evaluation.metrics_report : nullptr;"],
    ["TrackingIssueReportJson", "return impl_->evaluation.tracking_issue_report_json;"],
  ]) exactFragment(body(source, name), fragment, `${name} canonical accessor`);

  const ephemeral = body(source, "CreateEphemeralEventRuleApplicationRuntime");
  assert(ordered(ephemeral, [
    "std::make_unique<EventRuleApplicationRuntime::Impl>()",
    "analysis::CreateEventRuleRuntime()",
    "new EventRuleApplicationRuntime(std::move(impl))",
  ]), "ephemeral runtime create/wrap order drift");
  const acquire = body(source, "AcquireEventRuleApplicationRuntime");
  exactFragment(acquire, "if (it != runtimes.end() && it->second != nullptr) { return it->second; }",
    "keyed runtime reuse guard");
  assert(ordered(acquire, [
    "std::lock_guard lock(EventRuleApplicationRuntimeMapMutex())",
    "auto& runtimes = EventRuleApplicationRuntimeMap()",
    "const auto it = runtimes.find(key)",
    "it != runtimes.end() && it->second != nullptr",
    "return it->second",
    "CreateEphemeralEventRuleApplicationRuntime()",
    "runtimes[key] = created",
    "return created",
  ]), "keyed runtime same/different identity contract drift");
  const release = body(source, "ReleaseEventRuleApplicationRuntime");
  assert(ordered(release, [
    "std::lock_guard lock(EventRuleApplicationRuntimeMapMutex())",
    "EventRuleApplicationRuntimeMap().erase(key)",
  ]), "keyed runtime release contract drift");

  const evaluate = body(source, "EvaluateEventRulesForApplication");
  assert(ordered(evaluate, [
    "runtime != nullptr ? runtime->impl_->runtime : nullptr",
    "analysis::ApplyEventRulesToResult(",
    "result, ApplicationAnalysisRuleDocumentsSnapshot(), canonical_runtime",
  ]), "snapshot -> canonical Apply argument/order drift");
  assert(!/\btry\b|\bcatch\b/.test(evaluate + ephemeral + acquire),
    "runtime creation/evaluation exceptions must propagate unchanged");
}

function assertTransportContract(server, incidents, runtime, detail, transport) {
  assert(exactCount(detail, /#include "ingress\/event_rule_application_service\.h"/g) === 1,
    "application service include missing from transport detail");
  for (const token of [
    '"analysis/event_rule_engine.h"', "analysis::EventRuleRuntime", "analysis::EventRuleEvaluation",
    "analysis::CreateEventRuleRuntime", "analysis::ApplyEventRulesToResult", "EvaluateStoredEventRules",
    "EventRuleRuntimeForKey", "ReleaseEventRuleRuntimeForKey", "EventRuleRuntimeMapMutex",
    "EventRuleRuntimeMap()",
  ]) assert(!transport.includes(token), `transport canonical event-rule bypass remains: ${token}`);

  assert(exactCount(server, /CreateEphemeralEventRuleApplicationRuntime\(\)/g) === 2,
    "SSE/WS must each create one ephemeral runtime");
  assert(exactCount(transport, /AcquireEventRuleApplicationRuntime\(/g) === 5,
    "keyed runtime acquire count drift");
  assert(exactCount(transport, /EvaluateEventRulesForApplication\(/g) === 8,
    "event-rule evaluation delegation count drift");
  const acquireKeys = ["webrtc-overlay:", "tap-state-dump:", "tap-metrics:", "tap-events:", "tap-overlay:"];
  for (const key of acquireKeys) assert(exactCount(transport, new RegExp(`AcquireEventRuleApplicationRuntime\\("${key}`, "g")) === 1,
    `keyed runtime acquire drift: ${key}`);

  const detach = body(server, "DetachAnalysisTapAndReleaseRuntimes");
  const releaseLines = [
    'ReleaseEventRuleApplicationRuntime("webrtc-overlay:" + tap_id);',
    'ReleaseEventRuleApplicationRuntime("tap-events:" + tap_id);',
    'ReleaseEventRuleApplicationRuntime("tap-overlay:" + tap_id);',
    'ReleaseEventRuleApplicationRuntime("tap-state-dump:" + tap_id);',
    'ReleaseEventRuleApplicationRuntime("tap-metrics:" + tap_id);',
  ];
  assert(exactCount(detach, /if \(detach_result\.removed\)/g) === 1 && ordered(detach, [
    "const auto detach_result = analysis_session_lifecycle.Detach(tap_id)",
    "if (detach_result.removed)", ...releaseLines, "return detach_result.ok",
  ]), "removed-only five-key release order drift");
  for (const line of releaseLines) exactFragment(detach, line, "five-key exact release");
  assert(exactCount(transport, /ReleaseEventRuleApplicationRuntime\(/g) === 5,
    "release must occur only in the removed-only five-key block");

  assert(exactCount(incidents, /\n\s*event_runtime,\n/g) === 1,
    "WebRTC provider must capture the keyed runtime exactly once");
  assert(exactCount(server,
    /EvaluateEventRulesForApplication\(result, event_runtime\);[\s\S]*?BuildVaRuntimeMetadataJsonWithinBudget\([\s\S]*?evaluation\.ApplicationAnnotatedResult\(\),[\s\S]*?evaluation\.ApplicationEvents\(\),[\s\S]*?evaluation\.TrackingIssueReportJson\(\)/g) === 2,
  "SSE/WS evaluation -> annotated/events/tracking metadata order drift");
  assert(exactCount(incidents,
    /EvaluateEventRulesForApplication\([\s\S]*?const auto& annotated = evaluation\.ApplicationAnnotatedResult\(\);[\s\S]*?const auto& events = evaluation\.ApplicationEvents\(\);[\s\S]*?DispatchEventRecordsForApplication\(ProjectEventStorageDispatchRequest\(\s*annotated, events\)\);[\s\S]*?DispatchEventPostsForApplication\(ProjectEventPostDispatchRequest\(\s*annotated, events\)\);[\s\S]*?PublishAnalysisMetadata\(/g) === 2,
  "WebRTC matched/fallback Record -> POST -> metadata order drift");
  assert(exactCount(incidents, /\*output = annotated;/g) === 2,
    "WebRTC provider must return canonical annotated result on matched and fallback paths");
  assert(ordered(runtime, [
    "result.debug_state_requested = true",
    "result.debug_state_log_enabled = false",
    'AcquireEventRuleApplicationRuntime("tap-state-dump:" + tap_id)',
  ]), "state-dump debug request/evaluation order drift");
  assert(ordered(runtime, [
    "result.metrics_report_requested = true",
    'AcquireEventRuleApplicationRuntime("tap-metrics:" + tap_id)',
  ]), "metrics-dump request/evaluation order drift");
  assert(ordered(runtime, [
    'AcquireEventRuleApplicationRuntime("tap-events:" + tap_id)',
    "DispatchEventRecordsForApplication(", "DispatchEventPostsForApplication(",
    "DispatchOpsAlertDeliveries(",
  ]), "events endpoint evaluation -> Record -> POST -> alert order drift");
  assert(ordered(runtime, [
    'AcquireEventRuleApplicationRuntime("tap-overlay:" + tap_id)',
    "RenderDetectionOverlayForApplication(", "evaluation.ApplicationAnnotatedResult()",
  ]), "overlay evaluation -> annotated render order drift");

  const accessors = {AnnotatedResult: 4, Events: 5, ApplicationAnnotatedResult: 7,
    ApplicationEvents: 5, ActiveRuleCount: 2, MatchedDetectionCount: 2,
    ApplicationMetricsReport: 1, TrackingIssueReportJson: 4};
  const consumers = [server, incidents, runtime].join("\n");
  for (const [name, count] of Object.entries(accessors)) {
    assert(exactCount(consumers, new RegExp(`(?:\\.|->)${name}\\(\\)`, "g")) === count,
      `${name} transport accessor count drift`);
  }
  assert(ordered(server, [
    "evaluation->ApplicationMetricsReport()", "AnalysisMetricsReportJson(",
    "evaluation->TrackingIssueReportJson().empty()", "evaluation->TrackingIssueReportJson()",
  ]), "metrics optional/tracking JSON accessor order drift");
}

function writeFakeHeaders(caseRoot) {
  const analysisDir = path.join(caseRoot, "include", "analysis");
  const ingressDir = path.join(caseRoot, "include", "ingress");
  fs.mkdirSync(analysisDir, {recursive: true});
  fs.mkdirSync(ingressDir, {recursive: true});
  fs.writeFileSync(path.join(analysisDir, "event_rule_engine.h"), String.raw`#pragma once
#include <cstddef>
#include <cstdint>
#include <memory>
#include <optional>
#include <string>
#include <vector>
namespace analysis {
struct AnalysisResult { std::string source_key, profile_key; std::uint64_t frame_id{}; std::int64_t pts{}; int frame_width{}, frame_height{}; bool debug_state_requested{}, debug_state_log_enabled{}, metrics_report_requested{}; std::vector<int> markers; };
struct AnalysisEvent { std::string event_id,rule_id,event_type; std::uint64_t track_id{}; int class_id{-1}; std::string label; float score{}; float x{},y{},width{},height{}; std::string highlight_color; int highlight_duration_ms{}; bool highlight_enabled{},post_enabled{}; std::string post_url,status; std::int64_t start_time_ms{},update_time_ms{},end_time_ms{}; std::string zone_id,line_id,scenario_name,scenario_phase,metadata_json; struct Box { float x{},y{},width{},height{}; } box; };
struct AnalysisMetricsReport { std::uint64_t frame_count{},event_count{}; std::string state; std::vector<int> buckets; };
struct EventRuleRuntime { int id{}; };
struct EventRuleEvaluation { AnalysisResult annotated_result; std::vector<AnalysisEvent> events; std::size_t active_rule_count{},matched_detection_count{}; std::optional<AnalysisMetricsReport> metrics_report; std::string tracking_issue_report_json; };
extern AnalysisResult last_input; extern std::vector<AnalysisEvent> empty_events; extern std::string empty_string;
std::shared_ptr<EventRuleRuntime> CreateEventRuleRuntime();
EventRuleEvaluation ApplyEventRulesToResult(const AnalysisResult&,const std::vector<std::string>&,const std::shared_ptr<EventRuleRuntime>&);
}
`);
  fs.writeFileSync(path.join(ingressDir, "analysis_rule_application_service.h"), String.raw`#pragma once
#include <string>
#include <vector>
namespace ingress { std::vector<std::string> ApplicationAnalysisRuleDocumentsSnapshot(); }
`);
}

function harnessSource() {
  return String.raw`#include "ingress/event_rule_application_service.h"
#include "analysis/event_rule_engine.h"
#include <stdexcept>
#include <string>
#include <vector>
namespace analysis {
AnalysisResult last_input; std::vector<AnalysisEvent> empty_events; std::string empty_string;
EventRuleEvaluation next_evaluation; std::vector<std::string> last_documents; std::vector<std::string> calls;
std::shared_ptr<EventRuleRuntime> last_runtime; int next_runtime_id=1; bool throw_apply=false;
std::shared_ptr<EventRuleRuntime> CreateEventRuleRuntime(){calls.push_back("create");auto value=std::make_shared<EventRuleRuntime>();value->id=next_runtime_id++;return value;}
EventRuleEvaluation ApplyEventRulesToResult(const AnalysisResult& input,const std::vector<std::string>& documents,const std::shared_ptr<EventRuleRuntime>& runtime){calls.push_back("apply");last_input=input;last_documents=documents;last_runtime=runtime;if(throw_apply)throw std::runtime_error("apply-sentinel");return next_evaluation;}
}
namespace ingress {
std::vector<std::string> rule_documents; bool throw_snapshot=false;
std::vector<std::string> ApplicationAnalysisRuleDocumentsSnapshot(){analysis::calls.push_back("snapshot");if(throw_snapshot)throw std::runtime_error("snapshot-sentinel");return rule_documents;}
}
bool ResultEqual(const analysis::AnalysisResult&a,const analysis::AnalysisResult&b){return a.source_key==b.source_key&&a.profile_key==b.profile_key&&a.frame_id==b.frame_id&&a.pts==b.pts&&a.frame_width==b.frame_width&&a.frame_height==b.frame_height&&a.debug_state_requested==b.debug_state_requested&&a.debug_state_log_enabled==b.debug_state_log_enabled&&a.metrics_report_requested==b.metrics_report_requested&&a.markers==b.markers;}
bool EventEqual(const analysis::AnalysisEvent&a,const analysis::AnalysisEvent&b){return a.event_id==b.event_id&&a.rule_id==b.rule_id&&a.event_type==b.event_type&&a.track_id==b.track_id&&a.class_id==b.class_id&&a.label==b.label&&a.score==b.score&&a.x==b.x&&a.y==b.y&&a.width==b.width&&a.height==b.height&&a.highlight_color==b.highlight_color&&a.highlight_duration_ms==b.highlight_duration_ms&&a.highlight_enabled==b.highlight_enabled&&a.post_enabled==b.post_enabled&&a.post_url==b.post_url&&a.status==b.status&&a.start_time_ms==b.start_time_ms&&a.update_time_ms==b.update_time_ms&&a.end_time_ms==b.end_time_ms&&a.zone_id==b.zone_id&&a.line_id==b.line_id&&a.scenario_name==b.scenario_name&&a.scenario_phase==b.scenario_phase&&a.metadata_json==b.metadata_json;}
int main(){using namespace ingress;
 auto ephemeral1=CreateEphemeralEventRuleApplicationRuntime();auto ephemeral2=CreateEphemeralEventRuleApplicationRuntime();if(!ephemeral1||!ephemeral2||ephemeral1==ephemeral2)return 1;
 auto alpha1=AcquireEventRuleApplicationRuntime("alpha");auto alpha2=AcquireEventRuleApplicationRuntime("alpha");auto beta=AcquireEventRuleApplicationRuntime("beta");if(!alpha1||alpha1!=alpha2||alpha1==beta)return 2;
 ReleaseEventRuleApplicationRuntime("alpha");auto alpha3=AcquireEventRuleApplicationRuntime("alpha");if(!alpha3||alpha3==alpha1)return 3;
 analysis::AnalysisResult input{"input-source","input-profile",7,11,320,240,true,false,true,{1,2,3}};
 analysis::AnalysisResult annotated{"annotated-source","annotated-profile",70,110,1920,1080,false,true,false,{9,8,7}};
 analysis::AnalysisEvent event{"event","rule","type",99,8,"label",.75F,.1F,.2F,.3F,.4F,"#abc",1234,true,true,"url","confirmed",10,11,12,"zone","line","scenario","phase","{\"meta\":1}"};
 analysis::AnalysisMetricsReport metrics{101,202,"healthy",{4,5,6}};
 analysis::next_evaluation={annotated,{event},13,14,metrics,"{\"tracking\":true}"};ingress::rule_documents={"rule-a","rule-b"};analysis::calls.clear();
 auto evaluation=EvaluateEventRulesForApplication(input,alpha1);
 if(analysis::calls!=std::vector<std::string>{"snapshot","apply"}||analysis::last_documents!=ingress::rule_documents||!analysis::last_runtime||!ResultEqual(analysis::last_input,input))return 4;
 if(!ResultEqual(evaluation.AnnotatedResult(),annotated)||evaluation.Events().size()!=1||!EventEqual(evaluation.Events()[0],event)||evaluation.ActiveRuleCount()!=13||evaluation.MatchedDetectionCount()!=14)return 5;
 const auto* report=evaluation.MetricsReport();if(!report||report->frame_count!=101||report->event_count!=202||report->state!="healthy"||report->buckets!=std::vector<int>{4,5,6}||evaluation.TrackingIssueReportJson()!="{\"tracking\":true}")return 6;
 const int alpha_id=analysis::last_runtime->id;auto same=EvaluateEventRulesForApplication(input,alpha2);if(!analysis::last_runtime||analysis::last_runtime->id!=alpha_id)return 7;
 auto other=EvaluateEventRulesForApplication(input,beta);if(!analysis::last_runtime||analysis::last_runtime->id==alpha_id)return 8;
 auto fresh=EvaluateEventRulesForApplication(input,alpha3);if(!analysis::last_runtime||analysis::last_runtime->id==alpha_id)return 9;
 auto ep1=EvaluateEventRulesForApplication(input,ephemeral1);const int ep1id=analysis::last_runtime?analysis::last_runtime->id:0;auto ep2=EvaluateEventRulesForApplication(input,ephemeral2);if(!analysis::last_runtime||!ep1id||analysis::last_runtime->id==ep1id)return 10;
 auto null_eval=EvaluateEventRulesForApplication(input,nullptr);if(analysis::last_runtime)return 11;
 analysis::next_evaluation.metrics_report.reset();auto no_metrics=EvaluateEventRulesForApplication(input,alpha1);if(no_metrics.MetricsReport()!=nullptr)return 12;
 analysis::throw_apply=true;try{auto ignored=EvaluateEventRulesForApplication(input,alpha1);(void)ignored;return 13;}catch(const std::runtime_error&e){if(std::string(e.what())!="apply-sentinel")return 14;}analysis::throw_apply=false;
 ingress::throw_snapshot=true;analysis::calls.clear();try{auto ignored=EvaluateEventRulesForApplication(input,alpha1);(void)ignored;return 15;}catch(const std::runtime_error&e){if(std::string(e.what())!="snapshot-sentinel"||analysis::calls!=std::vector<std::string>{"snapshot"})return 16;}ingress::throw_snapshot=false;
 return 0;
}
`;
}

function compileAndRunCase(temp, sourceText, name) {
  const caseRoot = path.join(temp, name);
  writeFakeHeaders(caseRoot);
  fs.writeFileSync(path.join(caseRoot, "analysis_session_application_mapping.h"), `#pragma once
namespace ingress::analysis_session_application_mapping {
inline AnalysisSessionApplicationResult FromCanonicalResult(const analysis::AnalysisResult&) { return {}; }
inline analysis::AnalysisResult ToCanonicalResult(const AnalysisSessionApplicationResult&) { return {}; }
}
`);
  const sourceFile = path.join(caseRoot, "service.cpp");
  const harnessFile = path.join(caseRoot, "harness.cpp");
  fs.writeFileSync(sourceFile, sourceText);
  fs.writeFileSync(harnessFile, harnessSource());
  const binary = path.join(caseRoot, "case");
  const compiled = spawnSync(process.env.CXX || "c++", [
    "-std=c++17", `-I${path.join(caseRoot, "include")}`, `-I${path.join(root, "include")}`,
    sourceFile, harnessFile, "-o", binary,
  ], {encoding: "utf8"});
  if (compiled.status !== 0) return {status: compiled.status, stdout: compiled.stdout, stderr: compiled.stderr, phase: "compile"};
  const run = spawnSync(binary, [], {encoding: "utf8"});
  return {...run, phase: "run"};
}

check("application header is standard-only, standalone, and has no repository dependency closure", () => {
  const header = read(headerPath);
  assertHeaderContract(header);
  const headerMutations = [
    ["RED header friend-only factory omission",
      "    friend std::shared_ptr<EventRuleApplicationRuntime> CreateEphemeralEventRuleApplicationRuntime();",
      "    /* friend factory omitted */"],
    ["RED header public-only factory omission",
      "\nstd::shared_ptr<EventRuleApplicationRuntime> CreateEphemeralEventRuleApplicationRuntime();\n",
      "\n/* public factory omitted */\n"],
    ["RED header public evaluate omission",
      "EventRuleApplicationEvaluation EvaluateEventRulesForApplication(\n    const analysis::AnalysisResult& result,\n    const std::shared_ptr<EventRuleApplicationRuntime>& runtime);",
      "/* public evaluate omitted */"],
  ];
  for (const [label, before, after] of headerMutations) {
    const mutated = replaceExact(header, before, after, label);
    assertRejected(label, () => assertHeaderContract(mutated));
  }
  const friendEvaluate = "    friend EventRuleApplicationEvaluation EvaluateEventRulesForApplication(\n        const analysis::AnalysisResult& result,\n        const std::shared_ptr<EventRuleApplicationRuntime>& runtime);";
  assert(exactCount(header, new RegExp(escapeRegex(friendEvaluate), "g")) === 2,
    "RED friend evaluate mutation precondition drift");
  assertRejected("RED header one-of-two evaluate friends omitted", () =>
    assertHeaderContract(header.replace(friendEvaluate, "    /* one evaluate friend omitted */")));
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "v390-event-rule-header-"));
  try {
    const harness = path.join(temp, "header.cpp");
    fs.writeFileSync(harness, '#include "ingress/event_rule_application_service.h"\nint main(){return 0;}\n');
    execFileSync(process.env.CXX || "c++", ["-std=c++17", `-I${path.join(root, "include")}`, "-fsyntax-only", harness]);
    const dependencies = execFileSync(process.env.CXX || "c++", [
      "-std=c++17", `-I${path.join(root, "include")}`, "-MM", harness,
    ], {encoding: "utf8"}).replace(/\\\n/g, " ");
    const repoHeaders = dependencies.match(/(?:\/[^\s]+)?include\/[^\s]+\.h/g) || [];
    assert(repoHeaders.length === 3 &&
      repoHeaders.some(item => item.endsWith("include/ingress/event_rule_application_service.h")) &&
      repoHeaders.some(item => item.endsWith("include/ingress/analysis_session_read_application_service.h")) &&
      repoHeaders.some(item => item.endsWith("include/ingress/image_codec_application_service.h")),
      `standalone dependency closure leaked repository headers: ${repoHeaders.join(",")}`);
  } finally { fs.rmSync(temp, {recursive: true, force: true}); }
});

check("application source owns canonical snapshot, opaque mapping, and keyed lifecycle", () => {
  const source = read(sourcePath);
  assertSourceContract(source);
  const staticMutations = [
    ["RED rule-doc omission", "result, ApplicationAnalysisRuleDocumentsSnapshot(), canonical_runtime", "result, std::vector<std::string>{}, canonical_runtime"],
    ["RED annotated-input substitution", "return impl_->evaluation.annotated_result;", "return analysis::last_input;"],
    ["RED events omission", "return impl_->evaluation.events;", "return analysis::empty_events;"],
    ["RED count swap", "return impl_->evaluation.active_rule_count;", "return impl_->evaluation.matched_detection_count;"],
    ["RED metrics omission", "return impl_->evaluation.metrics_report.has_value() ? &*impl_->evaluation.metrics_report : nullptr;", "return nullptr;"],
    ["RED tracking omission", "return impl_->evaluation.tracking_issue_report_json;", "return analysis::empty_string;"],
    ["RED key reuse disabled", "if (it != runtimes.end() && it->second != nullptr)", "if (false && it != runtimes.end() && it->second != nullptr)"],
    ["RED release disabled", "EventRuleApplicationRuntimeMap().erase(key);", "(void)key;"],
    ["RED runtime capture omitted", "const auto canonical_runtime = runtime != nullptr ? runtime->impl_->runtime : nullptr;", "const auto canonical_runtime = nullptr;"],
  ];
  for (const [label, before, after] of staticMutations) {
    const mutated = replaceExact(source, before, after, label);
    assertRejected(label, () => assertSourceContract(mutated));
  }
});

check("compiled fake canonical harness binds full mapping, null/exception semantics, and runtime identity", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "v390-event-rule-app-"));
  try {
    const source = read(sourcePath);
    const canonical = compileAndRunCase(temp, source, "canonical");
    assert(canonical.status === 0,
      `canonical harness ${canonical.phase} exit=${canonical.status} stdout=${canonical.stdout.trim()} stderr=${canonical.stderr.trim()}`);
    const mutations = [
      ["RED-runtime-rule-doc-omission", "result, ApplicationAnalysisRuleDocumentsSnapshot(), canonical_runtime", "result, std::vector<std::string>{}, canonical_runtime"],
      ["RED-runtime-rule-doc-argument-order", "result, ApplicationAnalysisRuleDocumentsSnapshot(), canonical_runtime", "ApplicationAnalysisRuleDocumentsSnapshot(), result, canonical_runtime"],
      ["RED-runtime-input-vs-annotated", "return impl_->evaluation.annotated_result;", "return analysis::last_input;"],
      ["RED-runtime-events-omission", "return impl_->evaluation.events;", "return analysis::empty_events;"],
      ["RED-runtime-count-swap", "return impl_->evaluation.active_rule_count;", "return impl_->evaluation.matched_detection_count;"],
      ["RED-runtime-metrics-omission", "return impl_->evaluation.metrics_report.has_value() ? &*impl_->evaluation.metrics_report : nullptr;", "return nullptr;"],
      ["RED-runtime-tracking-omission", "return impl_->evaluation.tracking_issue_report_json;", "return analysis::empty_string;"],
      ["RED-runtime-key-reuse", "if (it != runtimes.end() && it->second != nullptr)", "if (false && it != runtimes.end() && it->second != nullptr)"],
      ["RED-runtime-release", "EventRuleApplicationRuntimeMap().erase(key);", "(void)key;"],
      ["RED-runtime-capture", "const auto canonical_runtime = runtime != nullptr ? runtime->impl_->runtime : nullptr;", "const auto canonical_runtime = nullptr;"],
      ["RED-runtime-null-semantics", "const auto canonical_runtime = runtime != nullptr ? runtime->impl_->runtime : nullptr;", "const auto canonical_runtime = runtime->impl_->runtime;"],
    ];
    for (const [name, before, after] of mutations) {
      const mutated = replaceExact(source, before, after, name);
      const red = compileAndRunCase(temp, mutated, name);
      assert(red.status !== 0,
        `${name} produced false PASS phase=${red.phase} stdout=${red.stdout.trim()} stderr=${red.stderr.trim()}`);
    }
  } finally { fs.rmSync(temp, {recursive: true, force: true}); }
});

check("transport has zero canonical bypass and exact runtime/action lifecycle", () => {
  const server = read(serverPath), incidents = read(incidentsPath), runtime = read(runtimePath), detail = read(detailPath);
  const transport = transportPaths.map(read).join("\n");
  assertTransportContract(server, incidents, runtime, detail, transport);
  const mutateAndReject = (label, changedServer = server, changedIncidents = incidents, changedRuntime = runtime, changedDetail = detail) =>
    assertRejected(label, () => assertTransportContract(
      changedServer, changedIncidents, changedRuntime, changedDetail,
      transportPaths.map(file => file === serverPath ? changedServer : file === incidentsPath ? changedIncidents :
        file === runtimePath ? changedRuntime : file === detailPath ? changedDetail : read(file)).join("\n")));

  mutateAndReject("RED removed guard", replaceExact(server, "if (detach_result.removed)", "if (detach_result.ok)", "RED removed guard"));
  mutateAndReject("RED five-key omission", replaceExact(server,
    'ReleaseEventRuleApplicationRuntime("tap-metrics:" + tap_id);', "/* omitted tap-metrics release */", "RED five-key omission"));
  mutateAndReject("RED five-key order", replaceExact(server,
    'ReleaseEventRuleApplicationRuntime("tap-events:" + tap_id);\n        ReleaseEventRuleApplicationRuntime("tap-overlay:" + tap_id);',
    'ReleaseEventRuleApplicationRuntime("tap-overlay:" + tap_id);\n        ReleaseEventRuleApplicationRuntime("tap-events:" + tap_id);', "RED five-key order"));
  assert(exactCount(server, /CreateEphemeralEventRuleApplicationRuntime\(\)/g) === 2, "ephemeral mutation precondition drift");
  mutateAndReject("RED ephemeral-to-keyed", server.replace("CreateEphemeralEventRuleApplicationRuntime()",
    'AcquireEventRuleApplicationRuntime("shared-stream")'));
  mutateAndReject("RED runtime capture omission", server,
    replaceExact(incidents, "         event_runtime,\n", "", "RED runtime capture omission"));
  mutateAndReject("RED annotated output replaced by input", server,
    replaceExact(incidents,
      "                *output = annotated;",
      "                *output = *result;",
      "RED annotated output replaced by input"));
  mutateAndReject("RED dispatch order", server,
    incidents.replace("DispatchEventRecordsForApplication(ProjectEventStorageDispatchRequest(",
      "DispatchEventPostsForApplication(ProjectEventStorageDispatchRequest("));
  mutateAndReject("RED state debug request omission", server, incidents,
    replaceExact(runtime, "                                    result.debug_state_requested = true;", "                                    result.debug_state_requested = false;", "RED state debug request omission"));
});

check("CMake, server dispatch, and current graph bind exact Slice 29 successor", () => {
  assert(exactCount(read("CMakeLists.txt"), /src\/ingress\/event_rule_application_service\.cpp/g) === 1,
    "CMake Event Rule source count drift");
  assert(exactCount(read("server.sh"), /verify-v390-event-rule-application-boundary/g) === 3,
    "server help/list/dispatch count drift");
  const graph = JSON.parse(read("test/fixtures/v390_structure_stabilization_current_graph.json"));
  const classifier = id => graph.moduleClassifiers.find(item => item.id === id);
  const edge = direction => graph.observedModuleEdges.find(item => item.direction === direction);
  assert(graph.expectedProductionFiles === 215 && graph.expectedCppFiles === 103 &&
    classifier("application-service-interfaces")?.expectedFileCount === 48 &&
    classifier("application-service-interfaces")?.expectedCppCount === 19 &&
    !edge("transport-and-auth-adapter -> analysis-services") &&
    edge("application-service-interfaces -> analysis-services")?.witnessCount === 23 &&
    edge("application-service-interfaces -> analysis-services")?.witnessSha256 === "4b3cbd1800bf8771eef67752edae8b604e8aefc1574e44d7890847c76d681cee" &&
    edge("transport-and-auth-adapter -> application-service-interfaces")?.witnessCount === 25 &&
    edge("transport-and-auth-adapter -> application-service-interfaces")?.witnessSha256 === "89cde5c1a3dd580514f150040686b1feb22470b684fc4ace242f75a6aff8b9c7" &&
    !edge("transport-and-auth-adapter -> core-media-interfaces") &&
    edge("application-service-interfaces -> core-media-interfaces")?.witnessCount === 4 &&
    edge("composition-root -> application-service-interfaces")?.witnessCount === 3 &&
    edge("composition-root -> application-service-interfaces")?.witnessSha256 === "a8e2b7fe386fb488bf5cd84f2218ce8bb3f299fb1ddcab9075e3c491c8a68c2f" &&
    graph.observedModuleEdges.length === 16 &&
    graph.observedModuleEdges.filter(item => !item.allowedByTarget).length === 0 &&
    graph.stronglyConnectedComponents.length === 0 && graph.boundary.includes("WebRTC media application boundary"),
  "exact Event Rule graph successor drift");
});

check("current structure gate accepts exact non-final Event Rule successor", () => {
  const output = execFileSync(path.join(root, "server.sh"),
    ["verify-v390-review4-structure-stabilization-execution"], {cwd: root, encoding: "utf8"});
  assert(output.includes("summary: pass=15 fail=0"), "structure successor gate failed");
});

for (const item of checks) console.log(`- ${item.status}: ${item.name}${item.detail ? ` — ${item.detail}` : ""}`);
const failed = checks.filter(item => item.status === "FAIL").length;
console.log(`- summary: pass=${checks.length - failed} fail=${failed}`);
process.exit(failed ? 1 : 0);

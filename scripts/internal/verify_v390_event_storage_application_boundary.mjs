#!/usr/bin/env node
// REVIEW4-64 Slice 28: Event Storage behind a dependency-free application boundary.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const args = process.argv.slice(2);
if (hasHelpFlag(args)) printUsageAndExit(`V390 Event Storage application boundary verification

Usage:
  ./server.sh verify-v390-event-storage-application-boundary
`);
assertKnownOptions(args, ["h", "help"]);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const headerPath = "include/ingress/event_storage_application_service.h";
const sourcePath = "src/ingress/event_storage_application_service.cpp";
const incidentsPath = "src/ingress/webrtc_http_server_ops_incidents.cpp";
const runtimePath = "src/ingress/webrtc_http_server_runtime.cpp";
const detailPath = "src/ingress/webrtc_http_server_detail.h";
const transportPaths = [
  "include/ingress/http_auth.h", "include/ingress/webrtc_http_runtime_config.h",
  "src/ingress/http_auth.cpp", "include/ingress/webrtc_http_server.h",
  "src/ingress/webrtc_http_server.cpp", "src/ingress/webrtc_http_server_ops_foundation.cpp",
  "src/ingress/webrtc_http_server_ops_workflows.cpp", incidentsPath, runtimePath, detailPath,
  "include/ingress/webrtc_http_analysis_rule_declarations.h",
];
const checks = [];
function assert(value, message) { if (!value) throw new Error(message); }
function check(name, fn) { try { fn(); checks.push({name,status:"PASS"}); } catch (error) { checks.push({name,status:"FAIL",detail:error.message}); } }
function exactCount(text, pattern) { return (text.match(pattern) || []).length; }
function compact(text) { return text.replace(/\/\/[^\n]*/g, "").replace(/\s+/g, " ").trim(); }
function escapeRegex(text) { return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function exactFragment(text, fragment, label) {
  assert(exactCount(compact(text), new RegExp(escapeRegex(fragment), "g")) === 1,
    `${label} exact fragment drift: ${fragment}`);
}
function body(text, kind, name) {
  const marker = kind === "struct" ? new RegExp(`struct\\s+${name}\\s*\\{`) : new RegExp(`\\b${name}\\s*\\([^)]*\\)\\s*\\{`, "s");
  const match = marker.exec(text); assert(match, `${kind} body missing: ${name}`);
  const open = text.indexOf("{", match.index); let depth = 0;
  for (let i = open; i < text.length; ++i) {
    if (text[i] === "{") ++depth;
    if (text[i] === "}" && --depth === 0) return text.slice(open + 1, i);
  }
  throw new Error(`unterminated ${kind}: ${name}`);
}
function ordered(text, tokens) {
  let cursor = 0;
  for (const token of tokens) { const next = text.indexOf(token, cursor); if (next < 0) return false; cursor = next + token.length; }
  return true;
}
function replaceExact(text, before, after, label) {
  assert(exactCount(text, new RegExp(escapeRegex(before), "g")) === 1, `${label} mutation anchor drift: ${before}`);
  return text.replace(before, after);
}
function assertRejected(label, fn) { let rejected = false; try { fn(); } catch { rejected = true; } assert(rejected, `${label} mutation produced false PASS`); }

const dtoManifests = {
  EventStorageApplicationBox: ["float x{0.0F};", "float y{0.0F};", "float width{0.0F};", "float height{0.0F};"],
  EventStorageApplicationDispatchSource: ["std::string source_key;", "std::string profile_key;", "std::string source_kind{\"*\"};", "std::string route{\"*\"};", "std::string client_id;", "std::int64_t pts{0};"],
  EventStorageApplicationDispatchEvent: ["std::string event_id;", "std::string rule_id;", "std::string event_type;", "std::uint64_t track_id{0};", "int class_id{-1};", "std::string label;", "float score{0.0F};", "EventStorageApplicationBox box;", "std::string highlight_color{\"#ff0000\"};", "int highlight_duration_ms{1200};", "bool highlight_enabled{true};", "bool post_enabled{false};", "std::string post_url;", "std::string status;", "std::int64_t start_time_ms{0};", "std::int64_t update_time_ms{0};", "std::int64_t end_time_ms{0};", "std::string zone_id;", "std::string line_id;", "std::string scenario_name;", "std::string scenario_phase;", "std::string metadata_json;"],
  EventStorageApplicationDispatchRequest: ["EventStorageApplicationDispatchSource source;", "std::vector<EventStorageApplicationDispatchEvent> events;"],
  EventStorageApplicationSnapshot: ["bool enabled{false};", "std::string path;", "std::string active_path;", "std::uint64_t active_file_size_bytes{0};", "std::uint64_t archived_file_count{0};", "std::uint64_t total_archive_bytes{0};", "std::size_t queue_size{0};", "std::size_t max_queue_size{0};", "std::uint64_t enqueued_count{0};", "std::uint64_t stored_count{0};", "std::uint64_t failed_count{0};", "std::uint64_t write_failed_count{0};", "std::uint64_t dropped_count{0};", "std::uint64_t skipped_corrupt_lines{0};", "std::uint64_t partial_line_count{0};", "std::uint64_t last_recovery_time_ms{0};", "std::string last_recovery_status{\"not-run\"};", "std::uint64_t rotated_count{0};", "std::uint64_t rotation_failed_count{0};", "std::uint64_t retention_deleted_count{0};", "std::uint64_t retention_deleted_bytes{0};", "std::uint64_t retention_failed_count{0};", "bool snapshot_hook_enabled{false};", "bool clip_hook_enabled{false};", "std::string snapshot_dir;", "std::string clip_dir;", "int pre_event_ms{0};", "int post_event_ms{0};", "int clip_buffer_ms{0};", "std::uint64_t snapshot_hook_failed_count{0};", "std::uint64_t clip_hook_failed_count{0};", "std::string last_snapshot_error;", "std::string last_clip_error;", "std::string last_error;"],
  EventStorageApplicationQueryOptions: ["std::string event_id;", "std::string event_type;", "std::string stream_id;", "std::string channel_id;", "bool has_track_id{false};", "std::uint64_t track_id{0};", "std::string status;", "std::string zone_id;", "std::string line_id;", "std::string scenario_name;", "std::string scenario_phase;", "std::string evidence;", "bool has_start_time_ms{false};", "std::int64_t start_time_ms{0};", "bool has_end_time_ms{false};", "std::int64_t end_time_ms{0};", "std::size_t offset{0};", "std::size_t limit{100};", "bool include_archives{false};"],
  EventStorageApplicationQueryResult: ["EventStorageApplicationSnapshot storage;", "bool file_exists{false};", "std::vector<std::string> records_json;", "std::size_t offset{0};", "std::size_t limit{100};", "std::size_t next_offset{0};", "bool has_more{false};", "bool truncated{false};", "std::uint64_t skipped_corrupt_lines{0};", "std::uint64_t partial_line_count{0};", "std::uint64_t archive_files_scanned{0};", "std::uint64_t archive_records_scanned{0};", "std::uint64_t matched_records{0};"],
  EventStorageApplicationCompactionResult: ["EventStorageApplicationSnapshot storage;", "bool active_file_exists{false};", "std::string compacted_path;", "std::uint64_t active_records_scanned{0};", "std::uint64_t archive_files_scanned{0};", "std::uint64_t archive_records_scanned{0};", "std::uint64_t retained_records{0};", "std::uint64_t skipped_corrupt_lines{0};", "std::uint64_t partial_line_count{0};"],
  EventStorageApplicationCompactedFileInfo: ["std::string file_name;", "std::string path;", "std::uint64_t size_bytes{0};", "std::int64_t modified_time_ms{0};"],
  EventStorageApplicationCompactedFileListResult: ["EventStorageApplicationSnapshot storage;", "std::vector<EventStorageApplicationCompactedFileInfo> files;"],
  EventStorageApplicationCompactedFileCleanupResult: ["EventStorageApplicationSnapshot storage;", "std::uint64_t deleted_count{0};", "std::uint64_t deleted_bytes{0};", "std::uint64_t kept_count{0};"],
};

const queryMappings = ["event_id", "event_type", "stream_id", "channel_id", "has_track_id", "track_id", "status", "zone_id", "line_id", "scenario_name", "scenario_phase", "evidence", "has_start_time_ms", "start_time_ms", "has_end_time_ms", "end_time_ms", "offset", "limit", "include_archives"];
const snapshotMappings = ["enabled", "path", "active_path", "active_file_size_bytes", "archived_file_count", "total_archive_bytes", "queue_size", "max_queue_size", "enqueued_count", "stored_count", "failed_count", "write_failed_count", "dropped_count", "skipped_corrupt_lines", "partial_line_count", "last_recovery_time_ms", "last_recovery_status", "rotated_count", "rotation_failed_count", "retention_deleted_count", "retention_deleted_bytes", "retention_failed_count", "snapshot_hook_enabled", "clip_hook_enabled", "snapshot_dir", "clip_dir", "pre_event_ms", "post_event_ms", "clip_buffer_ms", "snapshot_hook_failed_count", "clip_hook_failed_count", "last_snapshot_error", "last_clip_error", "last_error"];
const dispatchSourceMappings = ["source_key", "profile_key", "source_kind", "route", "client_id", "pts"];
const dispatchEventMappings = ["event_id", "rule_id", "event_type", "track_id", "class_id", "label", "score", "highlight_color", "highlight_duration_ms", "highlight_enabled", "post_enabled", "post_url", "status", "start_time_ms", "update_time_ms", "end_time_ms", "zone_id", "line_id", "scenario_name", "scenario_phase", "metadata_json"];

function assertSourceContract(source) {
  assert(source.includes('#include "analysis/event_storage.h"'), "canonical storage include missing");
  const queryBody = body(source, "function", "ToCanonical");
  for (const field of queryMappings) exactFragment(queryBody, `output.${field} = input.${field};`, "query 1:1 mapping");
  assert(queryMappings.every((field, index) => queryBody.indexOf(`output.${field} = input.${field};`) < (index + 1 === queryMappings.length ? Infinity : queryBody.indexOf(`output.${queryMappings[index + 1]} = input.${queryMappings[index + 1]};`))), "query mapping order drift");
  const snapshotBody = body(source, "function", "FromCanonical");
  for (const field of snapshotMappings) exactFragment(snapshotBody, `output.${field} = input.${field};`, "snapshot 1:1 mapping");
  const fileBody = body(source, "function", "FromCanonical");
  for (const field of ["file_name", "path", "size_bytes", "modified_time_ms"])
    assert(source.includes(`output.${field} = input.${field};`), `file mapping missing: ${field}`);
  const dispatch = body(source, "function", "DispatchEventRecordsForApplication");
  for (const field of dispatchSourceMappings) {
    const lhs = ["source_kind", "route", "client_id"].includes(field) ? `result.context.${field}` : `result.${field}`;
    exactFragment(dispatch, `${lhs} = request.source.${field};`, "dispatch source mapping");
  }
  for (const field of dispatchEventMappings) exactFragment(dispatch, `event.${field} = input.${field};`, "dispatch event mapping");
  for (const field of ["x", "y", "width", "height"]) exactFragment(dispatch, `event.box.${field} = input.box.${field};`, "dispatch box mapping");
  assert(ordered(dispatch, ["analysis::AnalysisResult result", "std::vector<analysis::AnalysisEvent> events", "events.reserve", "for (const auto& input", "events.push_back", "analysis::DispatchEventRecords(result, events)"]), "dispatch build/call order drift");
  const contracts = [
    ["QueryEventRecordsForApplication", "analysis::QueryEventRecords(ToCanonical(options), &canonical, error_message)", ["storage", "file_exists", "records_json", "offset", "limit", "next_offset", "has_more", "truncated", "skipped_corrupt_lines", "partial_line_count", "archive_files_scanned", "archive_records_scanned", "matched_records"]],
    ["CompactEventRecordsForApplication", "analysis::CompactEventRecords(ToCanonical(options), &canonical, error_message)", ["storage", "active_file_exists", "compacted_path", "active_records_scanned", "archive_files_scanned", "archive_records_scanned", "retained_records", "skipped_corrupt_lines", "partial_line_count"]],
    ["ListCompactedEventRecordFilesForApplication", "analysis::ListCompactedEventRecordFiles(&canonical, error_message)", ["storage"]],
    ["CleanupCompactedEventRecordFilesForApplication", "analysis::CleanupCompactedEventRecordFiles(keep_newest, &canonical, error_message)", ["storage", "deleted_count", "deleted_bytes", "kept_count"]],
  ];
  for (const [name, call, fields] of contracts) {
    const fn = body(source, "function", name);
    assert(fn.includes('if (result == nullptr)') && fn.includes('*error_message = "result is required"') && fn.includes("return false;"), `${name} null contract drift`);
    exactFragment(fn, call, `${name} canonical call`);
    for (const field of fields) {
      const rhs = field === "storage" ? "FromCanonical(canonical.storage)" : field === "records_json" ? "std::move(canonical.records_json)" : `canonical.${field}`;
      exactFragment(fn, `result->${field} = ${rhs};`, `${name} output overwrite`);
    }
    assert(ordered(fn, [call, "result->storage", "return succeeded"]), `${name} failure overwrite/order drift`);
  }
  const list = body(source, "function", "ListCompactedEventRecordFilesForApplication");
  assert(ordered(list, ["ListCompactedEventRecordFiles", "result->storage", "result->files.clear", "result->files.reserve", "for (const auto& file", "result->files.push_back", "return succeeded"]), "list overwrite/order drift");
  const resolve = body(source, "function", "ResolveCompactedEventRecordFileForApplication");
  exactFragment(resolve,
    "if (!analysis::ResolveCompactedEventRecordFile(file_name, &canonical, error_message)) { return false; }",
    "resolve failure leaves caller output untouched");
  assert(ordered(resolve, ["result == nullptr", "ResolveCompactedEventRecordFile", "return false", "*result = FromCanonical(canonical)", "return true"]), "resolve success-only overwrite drift");
  const remove = body(source, "function", "DeleteCompactedEventRecordFileForApplication");
  assert(remove.includes("result != nullptr ? &canonical : nullptr") && ordered(remove, ["DeleteCompactedEventRecordFile", "return false", "if (result != nullptr)", "*result = FromCanonical(canonical)", "return true"]), "delete optional/success-only overwrite drift");
}

function assertTransportContract(incidents, runtime, transport) {
  assert(read(detailPath).includes('#include "ingress/event_storage_application_service.h"'), "application include missing from transport detail");
  for (const token of ['"analysis/event_storage.h"', "analysis::EventStorage", "analysis::EventStorageSnapshot", "analysis::EventRecordQueryOptions", "analysis::EventRecordQueryResult", "analysis::EventRecordCompactionResult", "analysis::EventRecordCompactedFileInfo", "analysis::DispatchEventRecords(", "analysis::GetEventStorageSnapshot(", "analysis::QueryEventRecords(", "analysis::CompactEventRecords("])
    assert(!transport.includes(token), `transport canonical storage bypass remains: ${token}`);
  const expectedCalls = {DispatchEventRecordsForApplication:3, ObserveEventStorageForApplication:1, QueryEventRecordsForApplication:9, CompactEventRecordsForApplication:1, ListCompactedEventRecordFilesForApplication:1, ResolveCompactedEventRecordFileForApplication:1, DeleteCompactedEventRecordFileForApplication:1, CleanupCompactedEventRecordFilesForApplication:1};
  for (const [name, count] of Object.entries(expectedCalls)) assert(exactCount(transport, new RegExp(`${name}\\(`, "g")) === count, `${name} wrapper call count drift`);
  const project = body(incidents, "function", "ProjectEventStorageDispatchRequestValue");
  for (const field of dispatchSourceMappings) {
    const rhs = ["source_kind", "route", "client_id"].includes(field) ? `result.context.${field}` : `result.${field}`;
    exactFragment(project, `request.source.${field} = ${rhs};`, "transport source projection");
  }
  for (const field of dispatchEventMappings) exactFragment(project, `output.${field} = event.${field};`, "transport event projection");
  for (const field of ["x", "y", "width", "height"]) exactFragment(project, `output.box.${field} = event.box.${field};`, "transport box projection");
  assert(ordered(project, ["EventStorageApplicationDispatchRequest request", "request.source.source_key", "request.events.reserve", "for (const auto& event", "request.events.push_back", "return request"]), "transport projection order drift");
  const overlaySequence = /DispatchEventRecordsForApplication\(ProjectEventStorageDispatchRequest\([\s\S]*?DispatchEventPostsForApplication\(ProjectEventPostDispatchRequest\([\s\S]*?PublishAnalysisMetadata\(/g;
  assert(exactCount(incidents, overlaySequence) === 2, "overlay Record -> storage -> POST -> metadata order drift");
  assert(ordered(runtime, ["DispatchEventRecordsForApplication(ProjectEventStorageDispatchRequest(", "DispatchEventPostsForApplication(ProjectEventPostDispatchRequest(", "DispatchOpsAlertDeliveries("]), "tap dispatch Record -> storage -> POST -> alert order drift");
}

check("application header is standard-only with exact DTO/default manifests", () => {
  const header = read(headerPath);
  const includes = [...header.matchAll(/^\s*#\s*include\s*([<"][^>"]+[>"])/gm)].map(item => item[1]);
  assert(JSON.stringify(includes) === JSON.stringify(["<cstddef>", "<cstdint>", "<string>", "<vector>"]), "application header include set drift");
  assert(!/^\s*#\s*include\s*"/m.test(header) && !/\b(?:analysis|core|domain|media|detail|internal)::/.test(header), "internal namespace/type leaked into application contract");
  assert(!/\bvoid\s*\*|\bstd::(?:any|variant|function)\b|reinterpret_cast|typeid\s*\(/.test(header), "unsafe type erasure leaked into application contract");
  for (const [name, fields] of Object.entries(dtoManifests)) {
    const actual = compact(body(header, "struct", name));
    assert(actual === fields.join(" "), `${name} exact field/default manifest drift`);
  }
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "v390-event-storage-header-"));
  try {
    const harness = path.join(temp, "header.cpp");
    fs.writeFileSync(harness, '#include "ingress/event_storage_application_service.h"\nint main(){return 0;}\n');
    execFileSync(process.env.CXX || "c++", ["-std=c++17", `-I${path.join(root,"include")}`, "-fsyntax-only", harness]);
  } finally { fs.rmSync(temp, {recursive:true,force:true}); }
});

check("application source owns exact canonical mapping and overwrite semantics", () => {
  const source = read(sourcePath); assertSourceContract(source);
  const mutations = [
    ["RED query stream/channel swap", "output.stream_id = input.stream_id;", "output.stream_id = input.channel_id;"],
    ["RED snapshot failed/write-failed swap", "output.failed_count = input.failed_count;", "output.failed_count = input.write_failed_count;"],
    ["RED dispatch status omission", "event.status = input.status;", "event.status = {};"],
    ["RED dispatch box width/height swap", "event.box.width = input.box.width;", "event.box.width = input.box.height;"],
    ["RED query failure output omission", "result->matched_records = canonical.matched_records;", "result->matched_records = 0;"],
    ["RED list stale append", "result->files.clear();", "/* stale output retained */"],
    ["RED resolve failure unsafe overwrite", "if (!analysis::ResolveCompactedEventRecordFile(file_name, &canonical, error_message)) {\n        return false;\n    }", "if (!analysis::ResolveCompactedEventRecordFile(file_name, &canonical, error_message)) { *result = FromCanonical(canonical); return false; }"]
  ];
  for (const [label, before, after] of mutations) assertRejected(label, () => assertSourceContract(replaceExact(source, before, after, label)));
});

check("transport has zero canonical bypass and exact projection/call ordering", () => {
  const incidents = read(incidentsPath), runtime = read(runtimePath), transport = transportPaths.map(read).join("\n");
  assertTransportContract(incidents, runtime, transport);
  const mutations = [
    ["RED transport source route/client swap", "request.source.route = result.context.route;", "request.source.route = result.context.client_id;"],
    ["RED transport event start/update swap", "output.start_time_ms = event.start_time_ms;", "output.start_time_ms = event.update_time_ms;"],
    ["RED transport metadata omission", "output.metadata_json = event.metadata_json;", "output.metadata_json = {};"],
    ["RED overlay storage/POST swap", "DispatchEventRecordsForApplication(ProjectEventStorageDispatchRequest(", "DispatchEventPostsForApplication(ProjectEventStorageDispatchRequest("]
  ];
  for (const [label, before, after] of mutations) {
    if (label.includes("overlay")) assertRejected(label, () => assertTransportContract(incidents.replace(before, after), runtime, transport.replace(before, after)));
    else assertRejected(label, () => assertTransportContract(replaceExact(incidents, before, after, label), runtime, transport.replace(before, after)));
  }
});

function compileAndRunHarness(temp, sourceText, name, headerText = read(headerPath)) {
  const fakeDir = path.join(temp, name, "include", "analysis"); fs.mkdirSync(fakeDir, {recursive:true});
  const fakeHeader = `${String.raw`#pragma once
#include <cstddef>
#include <cstdint>
#include <string>
#include <vector>
namespace analysis {
struct Box { float x{},y{},width{},height{}; };
struct Context { std::string source_kind{"*"},route{"*"},client_id; };
struct AnalysisResult { std::string source_key,profile_key; Context context; std::int64_t pts{}; };
struct AnalysisEvent { std::string event_id,rule_id,event_type; std::uint64_t track_id{}; int class_id{-1}; std::string label; float score{}; Box box; std::string highlight_color{"#ff0000"}; int highlight_duration_ms{1200}; bool highlight_enabled{true},post_enabled{false}; std::string post_url,status; std::int64_t start_time_ms{},update_time_ms{},end_time_ms{}; std::string zone_id,line_id,scenario_name,scenario_phase,metadata_json; };
struct EventStorageSnapshot { bool enabled{}; std::string path,active_path; std::uint64_t active_file_size_bytes{},archived_file_count{},total_archive_bytes{}; std::size_t queue_size{},max_queue_size{}; std::uint64_t enqueued_count{},stored_count{},failed_count{},write_failed_count{},dropped_count{},skipped_corrupt_lines{},partial_line_count{},last_recovery_time_ms{}; std::string last_recovery_status{"not-run"}; std::uint64_t rotated_count{},rotation_failed_count{},retention_deleted_count{},retention_deleted_bytes{},retention_failed_count{}; bool snapshot_hook_enabled{},clip_hook_enabled{}; std::string snapshot_dir,clip_dir; int pre_event_ms{},post_event_ms{},clip_buffer_ms{}; std::uint64_t snapshot_hook_failed_count{},clip_hook_failed_count{}; std::string last_snapshot_error,last_clip_error,last_error; };
struct EventRecordQueryOptions { std::string event_id,event_type,stream_id,channel_id; bool has_track_id{}; std::uint64_t track_id{}; std::string status,zone_id,line_id,scenario_name,scenario_phase,evidence; bool has_start_time_ms{}; std::int64_t start_time_ms{}; bool has_end_time_ms{}; std::int64_t end_time_ms{}; std::size_t offset{},limit{100}; bool include_archives{}; };
struct EventRecordQueryResult { EventStorageSnapshot storage; bool file_exists{}; std::vector<std::string> records_json; std::size_t offset{},limit{100},next_offset{}; bool has_more{},truncated{}; std::uint64_t skipped_corrupt_lines{},partial_line_count{},archive_files_scanned{},archive_records_scanned{},matched_records{}; };
struct EventRecordCompactionResult { EventStorageSnapshot storage; bool active_file_exists{}; std::string compacted_path; std::uint64_t active_records_scanned{},archive_files_scanned{},archive_records_scanned{},retained_records{},skipped_corrupt_lines{},partial_line_count{}; };
struct EventRecordCompactedFileInfo { std::string file_name,path; std::uint64_t size_bytes{}; std::int64_t modified_time_ms{}; };
struct EventRecordCompactedFileListResult { EventStorageSnapshot storage; std::vector<EventRecordCompactedFileInfo> files; };
struct EventRecordCompactedFileCleanupResult { EventStorageSnapshot storage; std::uint64_t deleted_count{},deleted_bytes{},kept_count{}; };
void DispatchEventRecords(const AnalysisResult&,const std::vector<AnalysisEvent>&); EventStorageSnapshot GetEventStorageSnapshot(); bool QueryEventRecords(const EventRecordQueryOptions&,EventRecordQueryResult*,std::string*); bool CompactEventRecords(const EventRecordQueryOptions&,EventRecordCompactionResult*,std::string*); bool ListCompactedEventRecordFiles(EventRecordCompactedFileListResult*,std::string*); bool ResolveCompactedEventRecordFile(const std::string&,EventRecordCompactedFileInfo*,std::string*); bool DeleteCompactedEventRecordFile(const std::string&,EventRecordCompactedFileInfo*,std::string*); bool CleanupCompactedEventRecordFiles(std::size_t,EventRecordCompactedFileCleanupResult*,std::string*);
}`}`;
  fs.writeFileSync(path.join(fakeDir, "event_storage.h"), fakeHeader);
  const ingressDir = path.join(temp, name, "include", "ingress"); fs.mkdirSync(ingressDir, {recursive:true});
  fs.writeFileSync(path.join(ingressDir, "event_storage_application_service.h"), headerText);
  const sourceFile = path.join(temp, name, "service.cpp"); fs.writeFileSync(sourceFile, sourceText);
  const harnessFile = path.join(temp, name, "harness.cpp");
  const harness = `${String.raw`#include "ingress/event_storage_application_service.h"
#include "analysis/event_storage.h"
#include <string>
#include <vector>
namespace analysis {
std::vector<std::string> calls; AnalysisResult dispatch_result; std::vector<AnalysisEvent> dispatch_events; EventStorageSnapshot snapshot; EventRecordQueryOptions query_options; EventRecordQueryResult query_result; EventRecordCompactionResult compact_result; EventRecordCompactedFileListResult list_result; EventRecordCompactedFileInfo file_result; EventRecordCompactedFileCleanupResult cleanup_result; bool succeed=true; std::size_t keep=0;
void DispatchEventRecords(const AnalysisResult&r,const std::vector<AnalysisEvent>&e){calls.push_back("dispatch");dispatch_result=r;dispatch_events=e;} EventStorageSnapshot GetEventStorageSnapshot(){calls.push_back("observe");return snapshot;}
bool QueryEventRecords(const EventRecordQueryOptions&o,EventRecordQueryResult*r,std::string*){calls.push_back("query");query_options=o;*r=query_result;return succeed;} bool CompactEventRecords(const EventRecordQueryOptions&o,EventRecordCompactionResult*r,std::string*){calls.push_back("compact");query_options=o;*r=compact_result;return succeed;} bool ListCompactedEventRecordFiles(EventRecordCompactedFileListResult*r,std::string*){calls.push_back("list");*r=list_result;return succeed;} bool ResolveCompactedEventRecordFile(const std::string&,EventRecordCompactedFileInfo*r,std::string*){calls.push_back("resolve");*r=file_result;return succeed;} bool DeleteCompactedEventRecordFile(const std::string&,EventRecordCompactedFileInfo*r,std::string*){calls.push_back("delete");if(r)*r=file_result;return succeed;} bool CleanupCompactedEventRecordFiles(std::size_t k,EventRecordCompactedFileCleanupResult*r,std::string*){calls.push_back("cleanup");keep=k;*r=cleanup_result;return succeed;}
}
using namespace ingress;
bool Q(const analysis::EventRecordQueryOptions&o){return o.event_id=="id"&&o.event_type=="type"&&o.stream_id=="stream"&&o.channel_id=="channel"&&o.has_track_id&&o.track_id==9&&o.status=="status"&&o.zone_id=="zone"&&o.line_id=="line"&&o.scenario_name=="scenario"&&o.scenario_phase=="phase"&&o.evidence=="evidence"&&o.has_start_time_ms&&o.start_time_ms==10&&o.has_end_time_ms&&o.end_time_ms==20&&o.offset==3&&o.limit==4&&o.include_archives;}
int main(){
 EventStorageApplicationDispatchRequest defaults;DispatchEventRecordsForApplication(defaults);if(analysis::dispatch_result.context.source_kind!="*"||analysis::dispatch_result.context.route!="*"||!analysis::dispatch_events.empty())return 13;
 EventStorageApplicationDispatchRequest d;d.source={"source","profile","kind","route","client",44}; EventStorageApplicationDispatchEvent e;e.event_id="id";e.rule_id="rule";e.event_type="type";e.track_id=9;e.class_id=8;e.label="label";e.score=.7F;e.box={1,2,3,4};e.highlight_color="color";e.highlight_duration_ms=5;e.highlight_enabled=false;e.post_enabled=true;e.post_url="url";e.status="status";e.start_time_ms=10;e.update_time_ms=11;e.end_time_ms=12;e.zone_id="zone";e.line_id="line";e.scenario_name="scenario";e.scenario_phase="phase";e.metadata_json="meta";d.events={e}; DispatchEventRecordsForApplication(d);
 const auto&r=analysis::dispatch_result;const auto&x=analysis::dispatch_events.at(0);if(r.source_key!="source"||r.profile_key!="profile"||r.context.source_kind!="kind"||r.context.route!="route"||r.context.client_id!="client"||r.pts!=44||x.event_id!="id"||x.rule_id!="rule"||x.event_type!="type"||x.track_id!=9||x.class_id!=8||x.label!="label"||x.score!=.7F||x.box.x!=1||x.box.y!=2||x.box.width!=3||x.box.height!=4||x.highlight_color!="color"||x.highlight_duration_ms!=5||x.highlight_enabled||!x.post_enabled||x.post_url!="url"||x.status!="status"||x.start_time_ms!=10||x.update_time_ms!=11||x.end_time_ms!=12||x.zone_id!="zone"||x.line_id!="line"||x.scenario_name!="scenario"||x.scenario_phase!="phase"||x.metadata_json!="meta")return 1;
 analysis::snapshot.enabled=true;analysis::snapshot.path="path";analysis::snapshot.active_path="active";analysis::snapshot.active_file_size_bytes=1;analysis::snapshot.archived_file_count=2;analysis::snapshot.total_archive_bytes=3;analysis::snapshot.queue_size=4;analysis::snapshot.max_queue_size=5;analysis::snapshot.enqueued_count=6;analysis::snapshot.stored_count=7;analysis::snapshot.failed_count=8;analysis::snapshot.write_failed_count=9;analysis::snapshot.dropped_count=10;analysis::snapshot.skipped_corrupt_lines=11;analysis::snapshot.partial_line_count=12;analysis::snapshot.last_recovery_time_ms=13;analysis::snapshot.last_recovery_status="recovered";analysis::snapshot.rotated_count=14;analysis::snapshot.rotation_failed_count=15;analysis::snapshot.retention_deleted_count=16;analysis::snapshot.retention_deleted_bytes=17;analysis::snapshot.retention_failed_count=18;analysis::snapshot.snapshot_hook_enabled=true;analysis::snapshot.clip_hook_enabled=true;analysis::snapshot.snapshot_dir="snap";analysis::snapshot.clip_dir="clip";analysis::snapshot.pre_event_ms=19;analysis::snapshot.post_event_ms=20;analysis::snapshot.clip_buffer_ms=21;analysis::snapshot.snapshot_hook_failed_count=22;analysis::snapshot.clip_hook_failed_count=23;analysis::snapshot.last_snapshot_error="se";analysis::snapshot.last_clip_error="ce";analysis::snapshot.last_error="le";
 auto s=ObserveEventStorageForApplication();if(!s.enabled||s.path!="path"||s.active_path!="active"||s.active_file_size_bytes!=1||s.archived_file_count!=2||s.total_archive_bytes!=3||s.queue_size!=4||s.max_queue_size!=5||s.enqueued_count!=6||s.stored_count!=7||s.failed_count!=8||s.write_failed_count!=9||s.dropped_count!=10||s.skipped_corrupt_lines!=11||s.partial_line_count!=12||s.last_recovery_time_ms!=13||s.last_recovery_status!="recovered"||s.rotated_count!=14||s.rotation_failed_count!=15||s.retention_deleted_count!=16||s.retention_deleted_bytes!=17||s.retention_failed_count!=18||!s.snapshot_hook_enabled||!s.clip_hook_enabled||s.snapshot_dir!="snap"||s.clip_dir!="clip"||s.pre_event_ms!=19||s.post_event_ms!=20||s.clip_buffer_ms!=21||s.snapshot_hook_failed_count!=22||s.clip_hook_failed_count!=23||s.last_snapshot_error!="se"||s.last_clip_error!="ce"||s.last_error!="le")return 2;
 EventStorageApplicationQueryOptions q;q.event_id="id";q.event_type="type";q.stream_id="stream";q.channel_id="channel";q.has_track_id=true;q.track_id=9;q.status="status";q.zone_id="zone";q.line_id="line";q.scenario_name="scenario";q.scenario_phase="phase";q.evidence="evidence";q.has_start_time_ms=true;q.start_time_ms=10;q.has_end_time_ms=true;q.end_time_ms=20;q.offset=3;q.limit=4;q.include_archives=true;
 analysis::query_result.storage=analysis::snapshot;analysis::query_result.file_exists=true;analysis::query_result.records_json={"a","b"};analysis::query_result.offset=3;analysis::query_result.limit=4;analysis::query_result.next_offset=5;analysis::query_result.has_more=true;analysis::query_result.truncated=true;analysis::query_result.skipped_corrupt_lines=6;analysis::query_result.partial_line_count=7;analysis::query_result.archive_files_scanned=8;analysis::query_result.archive_records_scanned=9;analysis::query_result.matched_records=10;analysis::succeed=false;EventStorageApplicationQueryResult qr;qr.matched_records=999;std::string error;if(QueryEventRecordsForApplication(q,&qr,&error)||!Q(analysis::query_options)||qr.records_json.size()!=2||qr.matched_records!=10||qr.storage.path!="path")return 3;const auto before=analysis::calls.size();if(QueryEventRecordsForApplication(q,nullptr,&error)||error!="result is required"||analysis::calls.size()!=before)return 4;
 analysis::compact_result.storage=analysis::snapshot;analysis::compact_result.active_file_exists=true;analysis::compact_result.compacted_path="compacted";analysis::compact_result.active_records_scanned=1;analysis::compact_result.archive_files_scanned=2;analysis::compact_result.archive_records_scanned=3;analysis::compact_result.retained_records=4;analysis::compact_result.skipped_corrupt_lines=5;analysis::compact_result.partial_line_count=6;EventStorageApplicationCompactionResult cr;cr.retained_records=999;if(CompactEventRecordsForApplication(q,&cr,&error)||!Q(analysis::query_options)||cr.compacted_path!="compacted"||cr.retained_records!=4||cr.storage.path!="path")return 5;
 analysis::list_result.storage=analysis::snapshot;analysis::list_result.files={{"one","/one",1,2},{"two","/two",3,4}};EventStorageApplicationCompactedFileListResult lr;lr.files={{"stale","stale",9,9}};if(ListCompactedEventRecordFilesForApplication(&lr,&error)||lr.files.size()!=2||lr.files[0].file_name!="one"||lr.storage.path!="path")return 6;
 analysis::file_result={"file","/file",12,13};EventStorageApplicationCompactedFileInfo fi{"sentinel","sentinel",1,1};if(ResolveCompactedEventRecordFileForApplication("file",&fi,&error)||fi.file_name!="sentinel")return 7;analysis::succeed=true;if(!ResolveCompactedEventRecordFileForApplication("file",&fi,&error)||fi.file_name!="file"||fi.path!="/file"||fi.size_bytes!=12||fi.modified_time_ms!=13)return 8;analysis::succeed=false;fi.file_name="sentinel";if(DeleteCompactedEventRecordFileForApplication("file",&fi,&error)||fi.file_name!="sentinel")return 9;analysis::succeed=true;if(!DeleteCompactedEventRecordFileForApplication("file",nullptr,&error))return 10;
 analysis::cleanup_result.storage=analysis::snapshot;analysis::cleanup_result.deleted_count=3;analysis::cleanup_result.deleted_bytes=4;analysis::cleanup_result.kept_count=5;analysis::succeed=false;EventStorageApplicationCompactedFileCleanupResult cu;cu.kept_count=999;if(CleanupCompactedEventRecordFilesForApplication(7,&cu,&error)||analysis::keep!=7||cu.deleted_count!=3||cu.deleted_bytes!=4||cu.kept_count!=5||cu.storage.path!="path")return 11;
 const std::vector<std::string> expected={"dispatch","dispatch","observe","query","compact","list","resolve","resolve","delete","delete","cleanup"};if(analysis::calls!=expected)return 12;return 0;
}`}`;
  fs.writeFileSync(harnessFile, harness);
  const binary = path.join(temp, name, name);
  const runCompile = spawnSync(process.env.CXX || "c++", ["-std=c++17", `-I${path.join(temp,name,"include")}`, `-I${path.join(root,"include")}`, sourceFile, harnessFile, "-o", binary], {encoding:"utf8"});
  assert(runCompile.status === 0, `${name} compile exit=${runCompile.status} stdout=${runCompile.stdout.trim()} stderr=${runCompile.stderr.trim()}`);
  return spawnSync(binary, [], {encoding:"utf8"});
}

check("compiled fake canonical matrix preserves all fields failure/null outputs and lifecycle order", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "v390-event-storage-app-"));
  try {
    const source = read(sourcePath); const run = compileAndRunHarness(temp, source, "canonical");
    assert(run.status === 0, `canonical harness exit=${run.status} stdout=${run.stdout.trim()} stderr=${run.stderr.trim()}`);
    const emptySourceKind = replaceExact(read(headerPath), 'std::string source_kind{"*"};', "std::string source_kind;", "RED-runtime-default-source-kind-empty");
    const defaultRed = compileAndRunHarness(temp, source, "RED-runtime-default-source-kind-empty", emptySourceKind);
    assert(defaultRed.status !== 0, `RED-runtime-default-source-kind-empty produced false PASS stdout=${defaultRed.stdout.trim()} stderr=${defaultRed.stderr.trim()}`);
    const mutations = [
      ["RED-runtime-query-stream-channel-swap", "output.stream_id = input.stream_id;", "output.stream_id = input.channel_id;"],
      ["RED-runtime-dispatch-status-omission", "event.status = input.status;", "event.status = {};"],
      ["RED-runtime-snapshot-counter-swap", "output.failed_count = input.failed_count;", "output.failed_count = input.write_failed_count;"],
      ["RED-runtime-query-failure-output-omission", "result->matched_records = canonical.matched_records;", "result->matched_records = 0;"],
      ["RED-runtime-list-stale-append", "result->files.clear();", "/* stale output retained */"],
      ["RED-runtime-resolve-failure-overwrite", "if (!analysis::ResolveCompactedEventRecordFile(file_name, &canonical, error_message)) {\n        return false;\n    }", "if (!analysis::ResolveCompactedEventRecordFile(file_name, &canonical, error_message)) { *result = FromCanonical(canonical); return false; }"]
    ];
    for (const [name, before, after] of mutations) {
      const mutated = replaceExact(source, before, after, name); const red = compileAndRunHarness(temp, mutated, name);
      assert(red.status !== 0, `${name} produced false PASS stdout=${red.stdout.trim()} stderr=${red.stderr.trim()}`);
    }
  } finally { fs.rmSync(temp, {recursive:true,force:true}); }
});

check("CMake dispatch and current graph bind exact Slice 28 successor", () => {
  assert(exactCount(read("CMakeLists.txt"), /src\/ingress\/event_storage_application_service\.cpp/g) === 1, "CMake source count drift");
  assert(exactCount(read("server.sh"), /verify-v390-event-storage-application-boundary/g) === 3, "server dispatch count drift");
  const graph = JSON.parse(read("test/fixtures/v390_structure_stabilization_current_graph.json"));
  const classifier = id => graph.moduleClassifiers.find(item => item.id === id);
  const edge = direction => graph.observedModuleEdges.find(item => item.direction === direction);
  assert(graph.expectedProductionFiles === 208 && graph.expectedCppFiles === 101 && classifier("application-service-interfaces")?.expectedFileCount === 41 && classifier("application-service-interfaces")?.expectedCppCount === 17 &&
    edge("transport-and-auth-adapter -> analysis-services")?.witnessCount === 1 && edge("transport-and-auth-adapter -> analysis-services")?.witnessSha256 === "65f056e8ec5e09a639a15d98920884535929f2470a6beac11ffa9869eba796a7" &&
    edge("application-service-interfaces -> analysis-services")?.witnessCount === 20 && edge("application-service-interfaces -> analysis-services")?.witnessSha256 === "369be0731233c3c320103811ced13f27110508063e7cb6b82ab49d2431ade21a" &&
    edge("transport-and-auth-adapter -> application-service-interfaces")?.witnessCount === 20 && edge("transport-and-auth-adapter -> application-service-interfaces")?.witnessSha256 === "59d642796881167f557cde11ce4304ee67adacbccfda8bbd90a70bb62259d52e" &&
    edge("transport-and-auth-adapter -> core-media-interfaces")?.witnessCount === 4 && edge("transport-and-auth-adapter -> core-media-interfaces")?.witnessSha256 === "adf4172d0e83de59df510ceeb38c88cd36aaf78b157e7022b6480d8e0793cab3" &&
    edge("composition-root -> application-service-interfaces")?.witnessCount === 1 && edge("composition-root -> application-service-interfaces")?.witnessSha256 === "a5971a04521df447b33a9be009aa7e2e8ffeec5d23dfc0ac26fb95404d8af9fb" &&
    graph.observedModuleEdges.length === 17 && graph.observedModuleEdges.filter(item => !item.allowedByTarget).length === 2 && graph.stronglyConnectedComponents.length === 0 && graph.boundary.includes("Analysis Session read application boundary"), "graph successor drift");
});

check("current structure gate accepts exact non-final successor", () => {
  const output = execFileSync(path.join(root,"server.sh"), ["verify-v390-review4-structure-stabilization-execution"], {cwd:root,encoding:"utf8"});
  assert(output.includes("summary: pass=15 fail=0"), "structure successor gate failed");
});

for (const item of checks) console.log(`- ${item.status}: ${item.name}${item.detail ? ` — ${item.detail}` : ""}`);
const failed = checks.filter(item => item.status === "FAIL").length;
console.log(`- summary: pass=${checks.length-failed} fail=${failed}`);
process.exit(failed ? 1 : 0);

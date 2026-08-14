#!/usr/bin/env node
// 파일 용도: REVIEW4-64 Slice 21 Event POST projection/status의 dependency-free application 경계를 검증한다.

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const args = process.argv.slice(2);
if (hasHelpFlag(args)) printUsageAndExit(`V390 Event POST application boundary verification

Usage:
  ./server.sh verify-v390-event-post-application-boundary
`);
assertKnownOptions(args, ["h", "help"]);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const exists = file => fs.existsSync(path.join(root, file));
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const headerPath = "include/ingress/event_post_application_service.h";
const sourcePath = "src/ingress/event_post_application_service.cpp";
const detailPath = "src/ingress/webrtc_http_server_detail.h";
const runtimePath = "src/ingress/webrtc_http_server_runtime.cpp";
const incidentsPath = "src/ingress/webrtc_http_server_ops_incidents.cpp";
const dispatcherPath = "src/analysis/event_post_dispatcher.cpp";
const rollback = "cb9c6950f43df1b489175b9e85c638e042ab6e4c";
const successor = "16d6ffaa64290db3a74ae189102881572ae5b96c";
const checks = [];
function assert(value, message) { if (!value) throw new Error(message); }
function check(name, fn) { try { fn(); checks.push({name,status:"PASS"}); } catch (error) { checks.push({name,status:"FAIL",detail:error.message}); } }
function compactCppPreservingLiterals(text) {
  let output = "", quote = "", escaped = false, pendingSpace = false;
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
      pendingSpace = false; quote = char; output += char; continue;
    }
    if (/\s/.test(char)) { pendingSpace = true; continue; }
    if (pendingSpace && output.length > 0) output += " ";
    pendingSpace = false; output += char;
  }
  return output.trim();
}
function functionBlock(text, signature) {
  const anchor = text.indexOf(signature);
  assert(anchor >= 0, `function anchor missing: ${signature}`);
  const start = text.indexOf("{", anchor + signature.length);
  assert(start >= 0, `function body missing: ${signature}`);
  let depth = 0, quote = "", escaped = false;
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

check("dependency-free Event POST request and status contract exists", () => {
  assert(exists(headerPath), `${headerPath} missing`);
  const header = read(headerPath);
  assert(!/#\s*include\s*["<](analysis|core|domain)\//.test(header) && !/\b(?:analysis|core|domain)::/.test(header),
    "application header exposes an implementation owner");
  for (const name of ["EventPostDispatchBox", "EventPostDispatchSource", "EventPostDispatchEvent",
    "EventPostDispatchRequest", "EventPostDispatchStatus"]) {
    assert(header.includes(`struct ${name}`), `DTO missing: ${name}`);
  }
  for (const snippet of [
    "struct EventPostDispatchBox { float x{0.0F}; float y{0.0F}; float width{0.0F}; float height{0.0F}; };",
    "struct EventPostDispatchSource { std::string source_key; std::string profile_key; std::string source_kind; std::string route; std::string client_id; std::int64_t pts{0}; };",
    "struct EventPostDispatchEvent { std::string rule_id; std::string event_type; std::uint64_t track_id{0}; int class_id{-1}; std::string label; float score{0.0F}; EventPostDispatchBox box; std::string highlight_color; int highlight_duration_ms{0}; bool highlight_enabled{false}; bool post_enabled{false}; std::string post_url; };",
    "struct EventPostDispatchRequest { EventPostDispatchSource source; std::vector<EventPostDispatchEvent> events; };",
    "struct EventPostDispatchStatus { bool enabled{false}; std::size_t queue_size{0}; std::size_t max_queue_size{0}; std::uint64_t enqueued_count{0}; std::uint64_t sent_count{0}; std::uint64_t failed_count{0}; std::uint64_t dropped_count{0}; std::uint64_t suppressed_count{0}; std::string last_error; };",
  ]) assert(compactCppPreservingLiterals(header).includes(compactCppPreservingLiterals(snippet)),
    `exact DTO type/order/default drift: ${snippet}`);
});

check("application source alone owns the canonical dispatcher", () => {
  assert(exists(sourcePath), `${sourcePath} missing`);
  const source = read(sourcePath);
  for (const token of ['#include "analysis/event_post_dispatcher.h"',
    "analysis::DispatchEventPosts", "analysis::GetEventPostDispatcherSnapshot"]) {
    assert(source.includes(token), `application ownership missing: ${token}`);
  }
});

check("transport projects exactly three Event POST requests without raw dispatcher access", () => {
  const transport = [detailPath, runtimePath, incidentsPath].map(read).join("\n");
  assert(!transport.includes('#include "analysis/event_post_dispatcher.h"') &&
    !/analysis::(?:DispatchEventPosts|GetEventPostDispatcherSnapshot)/.test(transport),
  "raw Event POST dispatcher remains in transport");
  assert((transport.match(/DispatchEventPostsForApplication\(/g) || []).length === 3,
    "three dispatch calls are not exact");
  assert((transport.match(/ProjectEventPostDispatchRequest\(/g) || []).length === 7,
    "two projection prototypes/two definitions/three calls are not exact");
  const projection = functionBlock(read(incidentsPath),
    "template <typename Result, typename Event>\nEventPostDispatchRequest ProjectEventPostDispatchRequestValue(");
  const expectedProjection = `template <typename Result, typename Event>
EventPostDispatchRequest ProjectEventPostDispatchRequestValue(
    const Result& result,
    const std::vector<Event>& events) {
    EventPostDispatchRequest request;
    request.source.source_key = result.source_key;
    request.source.profile_key = result.profile_key;
    request.source.source_kind = result.context.source_kind;
    request.source.route = result.context.route;
    request.source.client_id = result.context.client_id;
    request.source.pts = result.pts;
    request.events.reserve(events.size());
    for (const auto& event : events) {
        EventPostDispatchEvent output;
        output.rule_id = event.rule_id;
        output.event_type = event.event_type;
        output.track_id = event.track_id;
        output.class_id = event.class_id;
        output.label = event.label;
        output.score = event.score;
        output.box.x = event.box.x;
        output.box.y = event.box.y;
        output.box.width = event.box.width;
        output.box.height = event.box.height;
        output.highlight_color = event.highlight_color;
        output.highlight_duration_ms = event.highlight_duration_ms;
        output.highlight_enabled = event.highlight_enabled;
        output.post_enabled = event.post_enabled;
        output.post_url = event.post_url;
        request.events.push_back(std::move(output));
    }
    return request;
}`;
  const assertProjection = value => assert(
    compactCppPreservingLiterals(value) === compactCppPreservingLiterals(expectedProjection),
    "transport source/event/action/bbox projection drift");
  assertProjection(projection);
  const incidents = compactCppPreservingLiterals(read(incidentsPath));
  for (const overload of [
    `EventPostDispatchRequest ProjectEventPostDispatchRequest(
      const analysis::AnalysisResult& result,
      const std::vector<analysis::AnalysisEvent>& events) {
      return ProjectEventPostDispatchRequestValue(result, events);
    }`,
    `EventPostDispatchRequest ProjectEventPostDispatchRequest(
      const AnalysisSessionApplicationResult& result,
      const std::vector<EventRuleApplicationEvent>& events) {
      return ProjectEventPostDispatchRequestValue(result, events);
    }`,
  ]) {
    assert(incidents.includes(compactCppPreservingLiterals(overload)),
      "projection overload delegation drift");
  }
  for (const [name, mutation] of [
    ["source-route", value => value.replace("request.source.route = result.context.route;",
      "request.source.route = result.context.client_id;")],
    ["bbox-axis", value => value.replace("output.box.x = event.box.x;",
      "output.box.x = event.box.y;")],
    ["post-url", value => value.replace("output.post_url = event.post_url;",
      "output.post_url = event.rule_id;")],
    ["event-order", value => value.replace("request.events.push_back(std::move(output));", "")],
  ]) {
    let rejected = false;
    try { assertProjection(mutation(projection)); } catch { rejected = true; }
    assert(rejected, `transport projection mutation escaped: ${name}`);
  }
});

check("compiled fake dispatcher binds every payload field, order, and status field", () => {
  assert(exists(sourcePath), `${sourcePath} missing`);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "v390-event-post-app-"));
  try {
    fs.mkdirSync(path.join(temp, "analysis"), {recursive:true});
    fs.writeFileSync(path.join(temp, "analysis/event_post_dispatcher.h"), `#pragma once
#include <cstddef>
#include <cstdint>
#include <string>
#include <vector>
namespace analysis {
struct RectF{float x{0},y{0},width{0},height{0};};
struct AnalysisContext{std::string source_kind,route,client_id;};
struct AnalysisResult{std::string source_key,profile_key;AnalysisContext context;std::int64_t pts{0};};
struct AnalysisEvent{std::string rule_id,event_type,label,highlight_color,post_url;std::uint64_t track_id{0};int class_id{-1};float score{0};RectF box;int highlight_duration_ms{0};bool highlight_enabled{false},post_enabled{false};};
struct EventPostDispatcherSnapshot{bool enabled{false};std::size_t queue_size{0},max_queue_size{0};std::uint64_t enqueued_count{0},sent_count{0},failed_count{0},dropped_count{0},suppressed_count{0};std::string last_error;};
extern AnalysisResult captured_result;extern std::vector<AnalysisEvent> captured_events;extern std::vector<std::string> calls;
void DispatchEventPosts(const AnalysisResult&,const std::vector<AnalysisEvent>&);EventPostDispatcherSnapshot GetEventPostDispatcherSnapshot();
}
`);
    const harness = path.join(temp, "harness.cpp");
    fs.writeFileSync(harness, `#include "analysis/event_post_dispatcher.h"
#include "ingress/event_post_application_service.h"
namespace analysis {AnalysisResult captured_result;std::vector<AnalysisEvent> captured_events;std::vector<std::string> calls;
void DispatchEventPosts(const AnalysisResult& r,const std::vector<AnalysisEvent>& e){calls.push_back("posts");captured_result=r;captured_events=e;}
EventPostDispatcherSnapshot GetEventPostDispatcherSnapshot(){return {.enabled=true,.queue_size=2,.max_queue_size=3,.enqueued_count=4,.sent_count=5,.failed_count=6,.dropped_count=7,.suppressed_count=8,.last_error="오류 \\\"quoted\\\""};}}
int main(){ingress::EventPostDispatchRequest q;q.source={.source_key="source",.profile_key="profile",.source_kind="kind",.route="route",.client_id="client",.pts=17};q.events={{.rule_id="r1",.event_type="enter",.track_id=21,.class_id=4,.label="person",.score=0.75F,.box={.x=0.1F,.y=0.2F,.width=0.3F,.height=0.4F},.highlight_color="red",.highlight_duration_ms=900,.highlight_enabled=true,.post_enabled=true,.post_url="http://one"},{.rule_id="r2",.event_type="exit",.track_id=22,.class_id=5,.label="vehicle",.score=0.5F,.box={.x=0.5F,.y=0.6F,.width=0.7F,.height=0.8F},.highlight_color="blue",.highlight_duration_ms=901,.highlight_enabled=false,.post_enabled=false,.post_url="http://two"}};ingress::DispatchEventPostsForApplication(q);if(analysis::calls!=std::vector<std::string>({"posts"})||analysis::captured_result.source_key!="source"||analysis::captured_result.profile_key!="profile"||analysis::captured_result.context.source_kind!="kind"||analysis::captured_result.context.route!="route"||analysis::captured_result.context.client_id!="client"||analysis::captured_result.pts!=17||analysis::captured_events.size()!=2)return 1;const auto&a=analysis::captured_events[0];const auto&b=analysis::captured_events[1];if(a.rule_id!="r1"||a.event_type!="enter"||a.track_id!=21||a.class_id!=4||a.label!="person"||a.score!=0.75F||a.box.x!=0.1F||a.box.y!=0.2F||a.box.width!=0.3F||a.box.height!=0.4F||a.highlight_color!="red"||a.highlight_duration_ms!=900||!a.highlight_enabled||!a.post_enabled||a.post_url!="http://one"||b.rule_id!="r2"||b.event_type!="exit"||b.track_id!=22||b.class_id!=5||b.label!="vehicle"||b.score!=0.5F||b.box.x!=0.5F||b.box.y!=0.6F||b.box.width!=0.7F||b.box.height!=0.8F||b.highlight_color!="blue"||b.highlight_duration_ms!=901||b.highlight_enabled||b.post_enabled||b.post_url!="http://two")return 2;ingress::DispatchEventPostsForApplication({});if(analysis::calls!=std::vector<std::string>({"posts","posts"})||!analysis::captured_result.source_key.empty()||!analysis::captured_events.empty())return 4;const auto s=ingress::ObserveEventPostDispatchStatus();if(!s.enabled||s.queue_size!=2||s.max_queue_size!=3||s.enqueued_count!=4||s.sent_count!=5||s.failed_count!=6||s.dropped_count!=7||s.suppressed_count!=8||s.last_error!="오류 \\\"quoted\\\"")return 3;return 0;}
`);
    const binary = path.join(temp, "harness");
    execFileSync(process.env.CXX || "c++", ["-std=c++17", `-I${temp}`, `-I${path.join(root,"include")}`,
      path.join(root, sourcePath), harness, "-o", binary]);
    execFileSync(binary);
  } finally { fs.rmSync(temp, {recursive:true,force:true}); }
});

check("rollback dispatcher, status bytes, and three call-site orderings are exact", () => {
  const beforeDispatcher = execFileSync("git", ["show", `${rollback}:${dispatcherPath}`], {cwd:root,encoding:"utf8"});
  assert(sha256(read(dispatcherPath)) === sha256(beforeDispatcher), "canonical dispatcher bytes changed");
  const beforeRuntime = execFileSync("git", ["show", `${successor}:${runtimePath}`], {cwd:root,encoding:"utf8"});
  const beforeIncidents = execFileSync("git", ["show", `${successor}:${incidentsPath}`], {cwd:root,encoding:"utf8"});
  const restoreCodec = text => text.replaceAll("ImageCodecEncodedImage", "analysis::EncodedImage")
    .replace(/EncodeJpegForApplication\(\s*ProjectImageCodecFrame\(([^)]*)\),\s*([^,]*),\s*([^,]*),\s*([^)]*)\)/g,
      "analysis::EncodeJpeg($1, $2, $3, $4)");
  const restoreRulePort = text => text
    .replaceAll("ApplyApplicationVideoAnalysisRuleToRequest", "ApplyVideoAnalysisRuleToRequest")
    .replaceAll("ApplyWebRtcHttpVideoAnalysisRuleToRequestBackend", "ApplyVideoAnalysisRuleToRequest")
    .replaceAll("WebRtcHttpAnalysisProfileDocumentsSnapshotBackend", "AnalysisProfileDocumentsSnapshot")
    .replaceAll("WebRtcHttpAnalysisRuleDocumentsSnapshotBackend", "AnalysisRuleDocumentsSnapshot")
    .replaceAll("WebRtcHttpVideoAnalysisRuleDocumentsSnapshotBackend", "VideoAnalysisRuleDocumentsSnapshot");
  const restoreEventRuleRuntime = text => text
    .replaceAll("EventRuleApplicationEvaluation", "analysis::EventRuleEvaluation")
    .replaceAll("EvaluateEventRulesForApplication", "EvaluateStoredEventRules")
    .replaceAll("AcquireEventRuleApplicationRuntime", "EventRuleRuntimeForKey")
    .replaceAll("->AnnotatedResult()", "->annotated_result")
    .replaceAll("->Events()", "->events")
    .replaceAll(".AnnotatedResult()", ".annotated_result")
    .replaceAll(".Events()", ".events");
  const restoreEventStorageRuntime = text => text
    .replaceAll("EventStorageApplicationQueryOptions", "analysis::EventRecordQueryOptions")
    .replaceAll("EventStorageApplicationQueryResult", "analysis::EventRecordQueryResult")
    .replaceAll("EventStorageApplicationCompactionResult", "analysis::EventRecordCompactionResult")
    .replaceAll("EventStorageApplicationCompactedFileListResult", "analysis::EventRecordCompactedFileListResult")
    .replaceAll("EventStorageApplicationCompactedFileCleanupResult", "analysis::EventRecordCompactedFileCleanupResult")
    .replaceAll("EventStorageApplicationCompactedFileInfo", "analysis::EventRecordCompactedFileInfo")
    .replaceAll("QueryEventRecordsForApplication", "analysis::QueryEventRecords")
    .replaceAll("CompactEventRecordsForApplication", "analysis::CompactEventRecords")
    .replaceAll("ListCompactedEventRecordFilesForApplication", "analysis::ListCompactedEventRecordFiles")
    .replaceAll("CleanupCompactedEventRecordFilesForApplication", "analysis::CleanupCompactedEventRecordFiles")
    .replaceAll("ResolveCompactedEventRecordFileForApplication", "analysis::ResolveCompactedEventRecordFile")
    .replaceAll("DeleteCompactedEventRecordFileForApplication", "analysis::DeleteCompactedEventRecordFile")
    .replace(/DispatchEventRecordsForApplication\(ProjectEventStorageDispatchRequest\(\s*([^,]+),\s*([^)]+)\)\);/g,
      "analysis::DispatchEventRecords($1, $2);");
  const replaceExactOnce = (text, before, after, label) => {
    assert(text.split(before).length - 1 === 1, `analysis-frame rollback anchor drift: ${label}`);
    return text.replace(before, after);
  };
  const restoreAnalysisFrameRuntime = text => {
    let restored = text.replaceAll("BuildAnalysisProfileForApplication", "BuildAnalysisProfileFromQuery");
    restored = replaceExactOnce(restored, `                                if (!RenderDetectionOverlayForApplication(
                                        image_analysis.frame,
                                        image_analysis.result,
                                        query,
                                        &overlay_frame,
                                        &error_message)) {`, `                                analysis::OverlayRenderOptions options = BuildOverlayRenderOptionsFromQuery(query);
                                if (!analysis::RenderDetectionOverlay(
                                        image_analysis.frame, image_analysis.result, options, &overlay_frame, &error_message)) {`,
      "static image overlay");
    restored = replaceExactOnce(restored, `                                const bool debug_overlay =
                                    AnalysisOverlayDebugRequestedForApplication(query);
                                auto overlay_result = *latest->result;
                                overlay_result.debug_state_requested =
                                    overlay_result.debug_state_requested || debug_overlay;
                                overlay_result.debug_state_log_enabled =
                                    overlay_result.debug_state_log_enabled || debug_overlay;`, `                                analysis::OverlayRenderOptions options = BuildOverlayRenderOptionsFromQuery(query);
                                auto overlay_result = *latest->result;
                                overlay_result.debug_state_requested =
                                    overlay_result.debug_state_requested || options.draw_debug_overlay;
                                overlay_result.debug_state_log_enabled =
                                    overlay_result.debug_state_log_enabled || options.draw_debug_overlay;`,
      "tap overlay debug option");
    return replaceExactOnce(restored, `                                if (!RenderDetectionOverlayForApplication(
                                        std::move(latest->frame),
                                        evaluation.ApplicationAnnotatedResult(),
                                        query,
                                        &overlay_frame,
                                        &error_message)) {`, `                                if (!analysis::RenderDetectionOverlay(
                                        latest->frame, evaluation.annotated_result, options, &overlay_frame, &error_message)) {`,
      "tap overlay execution");
  };
  const restoreAnalysisFrameIncidents = text => {
    const signature = "bool AttachWebRtcAnalysisOverlay(";
    const current = functionBlock(text, signature);
    const previous = functionBlock(beforeIncidents, signature);
    const recordPositions = [...current.matchAll(/DispatchEventRecordsForApplication\(/g)].map(item => item.index);
    const postPositions = [...current.matchAll(/DispatchEventPostsForApplication\(/g)].map(item => item.index);
    const publishPositions = [...current.matchAll(/bridge_lock->PublishAnalysisMetadata\(/g)].map(item => item.index);
    assert(recordPositions.length === 2 && postPositions.length === 2 && publishPositions.length >= 3 &&
      recordPositions[0] < postPositions[0] && postPositions[0] < publishPositions[0] &&
      recordPositions[1] < postPositions[1] && postPositions[1] < publishPositions.at(-2) &&
      current.includes("MakeAnalysisOverlayAttachmentForApplication"),
    "current overlay Record→Post→metadata ordering drift");
    return text.replace(current, previous);
  };
  const restoreVaMetadataIncidents = text => {
    let restored = replaceExactOnce(text, `VaMetadataApplicationSyncInfo BuildWebRtcVaMetadataSyncInfo(std::int64_t video_frame_pts_ns,
                                                            std::int64_t analysis_pts_ns,
                                                            std::int64_t sync_tolerance_ns,
                                                            std::string sync_status,
                                                            int frame_width,
                                                            int frame_height) {
    VaMetadataApplicationSyncInfo sync;`, `analysis::VaRuntimeSyncInfo BuildWebRtcVaMetadataSyncInfo(std::int64_t video_frame_pts_ns,
                                                          std::int64_t analysis_pts_ns,
                                                          std::int64_t sync_tolerance_ns,
                                                          std::string sync_status,
                                                          int frame_width,
                                                          int frame_height) {
    analysis::VaRuntimeSyncInfo sync;`, "VA metadata sync DTO");
    restored = replaceExactOnce(restored, `std::string WebRtcVaMetadataMessageJson(const analysis::AnalysisResult& result,
                                        const std::vector<analysis::AnalysisEvent>& events,
                                        const VaMetadataApplicationSyncInfo& sync_info,
                                        const VaMetadataApplicationFilter& subscription_filter) {
    return SerializeWebRtcVaMetadataForApplication(
        result, events, sync_info, subscription_filter);
}`, `std::string WebRtcVaMetadataMessageJson(const analysis::AnalysisResult& result,
                                        const std::vector<analysis::AnalysisEvent>& events,
                                        const analysis::VaRuntimeSyncInfo& sync_info,
                                        const analysis::VaMetadataSubscriptionFilter& subscription_filter) {
    const auto filtered_result = analysis::FilterVaMetadataResult(result, subscription_filter);
    const auto filtered_events = analysis::FilterVaMetadataEvents(events, subscription_filter);
    analysis::VaRuntimeMetadataBuildOptions options;
    options.schema = analysis::kWebRtcVaMetadataSchema;
    options.include_source = false;
    options.include_scenarios = false;
    options.include_metrics = false;
    options.include_tracking_issue_report = false;
    options.include_missed_tracks = false;
    options.sync = sync_info;
    return analysis::SerializeVaRuntimeMetadataFrameForWebRtcJson(
        analysis::BuildVaRuntimeMetadataFrame(filtered_result, filtered_events, options));
}`, "VA metadata present serializer");
    return replaceExactOnce(restored, `std::string WebRtcVaMetadataMissingMessageJson(const std::string& stream_id,
                                               std::int64_t video_frame_pts_ns,
                                               std::int64_t sync_tolerance_ns) {
    auto sync = BuildWebRtcVaMetadataSyncInfo(
        video_frame_pts_ns, video_frame_pts_ns, sync_tolerance_ns, "missing", 0, 0);
    sync.analysis_pts_ms = 0;
    sync.sync_delta_ms = 0;
    return SerializeMissingWebRtcVaMetadataForApplication(
        stream_id, video_frame_pts_ns, sync);
}`, `std::string WebRtcVaMetadataMissingMessageJson(const std::string& stream_id,
                                               std::int64_t video_frame_pts_ns,
                                               std::int64_t sync_tolerance_ns) {
    analysis::VaRuntimeMetadataFrame frame;
    frame.schema = analysis::kWebRtcVaMetadataSchema;
    frame.stream_id = stream_id;
    frame.channel_id = stream_id;
    frame.pts = video_frame_pts_ns;
    frame.timestamp_ms = PtsNsToMs(video_frame_pts_ns);
    frame.sync = BuildWebRtcVaMetadataSyncInfo(
        video_frame_pts_ns, video_frame_pts_ns, sync_tolerance_ns, "missing", 0, 0);
    frame.sync.analysis_pts_ms = 0;
    frame.sync.sync_delta_ms = 0;
    return analysis::SerializeVaRuntimeMetadataFrameForWebRtcJson(frame);
}`, "VA metadata missing serializer");
  };
  const currentRuntime = compactCppPreservingLiterals(read(runtimePath));
  assert(currentRuntime.includes(compactCppPreservingLiterals(`
    DispatchEventRecordsForApplication(ProjectEventStorageDispatchRequest(
      evaluation->AnnotatedResult(), evaluation->Events()));
    DispatchEventPostsForApplication(ProjectEventPostDispatchRequest(
      evaluation->AnnotatedResult(), evaluation->Events()));
    DispatchOpsAlertDeliveries(config,
      evaluation->AnnotatedResult(), evaluation->Events());`)),
    "tap Record→Post→Ops alert ordering drift");
  const afterIncidents = restoreAnalysisFrameIncidents(restoreVaMetadataIncidents(read(incidentsPath)));
  const beforeStatus = functionBlock(beforeIncidents, "std::string AnalysisEventPostStatusJson()");
  const afterStatus = functionBlock(afterIncidents, "std::string AnalysisEventPostStatusJson()");
  const assertStatusParity = value => {
    assert(compactCppPreservingLiterals(value) === compactCppPreservingLiterals(beforeStatus),
      "status JSON output emission drift");
  };
  assertStatusParity(afterStatus);
  for (const [name, mutation] of [
    ["key", value => value.replace('\\"queueSize\\"', '\\"queue_size\\"')],
    ["field", value => value.replace("status.sent_count", "status.failed_count")],
    ["accessor", value => value.replace("ObserveEventPostDispatchStatus()",
      "ObserveDifferentEventPostDispatchStatus()")],
  ]) {
    let rejected = false;
    try { assertStatusParity(mutation(afterStatus)); } catch { rejected = true; }
    assert(rejected, `status parity mutation escaped: ${name}`);
  }
  // 후속 continuation slice는 무관한 incident-search 함수를 바꿀 수 있다. 위 exact status byte와
  // 세 Record→Post→metadata ordering은 계속 Slice 21 oracle이다.
});

check("CMake, dispatch, and graph bind the exact successor", () => {
  assert((read("CMakeLists.txt").match(/src\/ingress\/event_post_application_service\.cpp/g) || []).length === 1,
    "CMake source exact-once binding missing");
  assert((read("server.sh").match(/verify-v390-event-post-application-boundary/g) || []).length === 3,
    "server.sh help/dispatch exact binding missing");
  const graph = JSON.parse(read("test/fixtures/v390_structure_stabilization_current_graph.json"));
  const owner = graph.moduleClassifiers.find(item => item.id === "application-service-interfaces");
  const edge = direction => graph.observedModuleEdges.find(item => item.direction === direction);
  assert(graph.boundary.includes("Analysis Session read application boundary") && graph.boundary.includes("30B") &&
    graph.expectedProductionFiles === 208 && graph.expectedCppFiles === 101 &&
    owner?.expectedFileCount === 41 && owner.expectedCppCount === 17 &&
    edge("transport-and-auth-adapter -> analysis-services")?.witnessCount === 1 &&
    edge("transport-and-auth-adapter -> analysis-services")?.witnessSha256 === "65f056e8ec5e09a639a15d98920884535929f2470a6beac11ffa9869eba796a7" &&
    edge("transport-and-auth-adapter -> analysis-services")?.allowedByTarget === false &&
    edge("application-service-interfaces -> analysis-services")?.witnessCount === 20 &&
    edge("application-service-interfaces -> analysis-services")?.witnessSha256 === "369be0731233c3c320103811ced13f27110508063e7cb6b82ab49d2431ade21a" &&
    edge("application-service-interfaces -> analysis-services")?.allowedByTarget === true &&
    edge("transport-and-auth-adapter -> application-service-interfaces")?.witnessCount === 20 &&
    edge("transport-and-auth-adapter -> application-service-interfaces")?.witnessSha256 === "59d642796881167f557cde11ce4304ee67adacbccfda8bbd90a70bb62259d52e" &&
    edge("transport-and-auth-adapter -> application-service-interfaces")?.allowedByTarget === true &&
    edge("composition-root -> application-service-interfaces")?.witnessCount === 1 &&
    edge("composition-root -> application-service-interfaces")?.witnessSha256 === "a5971a04521df447b33a9be009aa7e2e8ffeec5d23dfc0ac26fb95404d8af9fb" &&
    graph.observedModuleEdges.length === 17 &&
    graph.observedModuleEdges.filter(item => !item.allowedByTarget).length === 2 &&
    graph.stronglyConnectedComponents.length === 0,
  "Slice 21 graph successor missing");
});

for (const item of checks) console.log(`- ${item.status}: ${item.name}${item.detail ? ` — ${item.detail}` : ""}`);
const failed = checks.filter(item => item.status === "FAIL").length;
console.log(`- summary: pass=${checks.length-failed} fail=${failed}`);
process.exit(failed ? 1 : 0);

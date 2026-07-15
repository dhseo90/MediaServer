#!/usr/bin/env node
// REVIEW4-64 Slice 30A: Analysis Session read/query projection behind an application port.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const args = process.argv.slice(2);
if (hasHelpFlag(args)) printUsageAndExit(`V390 Analysis Session read application boundary verification

Usage:
  ./server.sh verify-v390-analysis-session-read-application-boundary
`);
assertKnownOptions(args, ["h", "help"]);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const serviceHeaderPath = "include/ingress/analysis_session_read_application_service.h";
const adapterHeaderPath = "include/ingress/analysis_session_read_application_adapter.h";
const adapterSourcePath = "src/ingress/analysis_session_read_application_adapter.cpp";
const compositionPath = "src/application/media_server_application.cpp";
const publicServerHeaderPath = "include/ingress/webrtc_http_server.h";
const serverPath = "src/ingress/webrtc_http_server.cpp";
const incidentsPath = "src/ingress/webrtc_http_server_ops_incidents.cpp";
const runtimePath = "src/ingress/webrtc_http_server_runtime.cpp";
const detailPath = "src/ingress/webrtc_http_server_detail.h";
const transportPaths = [
  "include/ingress/http_auth.h", "include/ingress/webrtc_http_runtime_config.h",
  "src/ingress/http_auth.cpp", publicServerHeaderPath, serverPath,
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
function functionBodyByParameter(text, canonicalType) {
  const marker = new RegExp(`FromCanonical\\s*\\(\\s*const\\s+${escapeRegex(canonicalType)}&\\s+input\\s*\\)\\s*\\{`, "s");
  const match = marker.exec(text);
  assert(match, `FromCanonical overload missing: ${canonicalType}`);
  const open = text.indexOf("{", match.index);
  let depth = 0;
  for (let index = open; index < text.length; ++index) {
    if (text[index] === "{") ++depth;
    if (text[index] === "}" && --depth === 0) return text.slice(open + 1, index);
  }
  throw new Error(`unterminated FromCanonical: ${canonicalType}`);
}
function functionBody(text, name) {
  const marker = new RegExp(`\\b${name}\\s*\\([^)]*\\)\\s*(?:const\\s*)?(?:override\\s*)?\\{`, "s");
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
function directFields(definition) {
  const lines = definition.slice(definition.indexOf("{") + 1, definition.lastIndexOf("}")).split("\n");
  const fields = [];
  let nestedDepth = 0;
  for (const raw of lines) {
    const line = raw.replace(/\/\/.*$/, "").trim();
    const startDepth = nestedDepth;
    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;
    nestedDepth += opens - closes;
    if (startDepth !== 0 || !line.endsWith(";") || line.includes("(") || /^(?:struct|class|using)\b/.test(line)) continue;
    const noDefault = line.replace(/\{[^{}]*\}\s*;$/, ";");
    const match = /([A-Za-z_][A-Za-z0-9_]*)\s*;$/.exec(noDefault);
    if (match) fields.push({name: match[1], declaration: line});
  }
  return fields;
}

const dtoNames = [
  "AnalysisSessionApplicationContext", "AnalysisSessionApplicationBox",
  "AnalysisSessionApplicationDetection", "AnalysisSessionApplicationTrackTrailPoint",
  "AnalysisSessionApplicationTrack", "AnalysisSessionApplicationCloseObjectDiagnostic",
  "AnalysisSessionApplicationPoseKeypoint", "AnalysisSessionApplicationDebugLineState",
  "AnalysisSessionApplicationDebugTrackState", "AnalysisSessionApplicationDebugScenarioTimeline",
  "AnalysisSessionApplicationDebugState", "AnalysisSessionApplicationMetricsTrackHealth",
  "AnalysisSessionApplicationMetricsChannel", "AnalysisSessionApplicationMetrics",
  "AnalysisSessionApplicationAppearanceExtractorStats", "AnalysisSessionApplicationTrackStateMetrics",
  "AnalysisSessionApplicationResult", "AnalysisSessionApplicationSnapshot",
  "AnalysisSessionApplicationLatestFrameAndResult",
];
const mappingSpecs = [
  ["AnalysisSessionApplicationContext", "analysis::AnalysisContext", []],
  ["AnalysisSessionApplicationBox", "analysis::RectF", []],
  ["AnalysisSessionApplicationDetection", "analysis::Detection", []],
  ["AnalysisSessionApplicationTrackTrailPoint", "analysis::Track::TrailPoint", []],
  ["AnalysisSessionApplicationTrack", "analysis::Track", ["trail"]],
  ["AnalysisSessionApplicationCloseObjectDiagnostic", "analysis::CloseObjectAssociationDiagnostic", []],
  ["AnalysisSessionApplicationPoseKeypoint", "analysis::PoseKeypoint", []],
  ["AnalysisSessionApplicationDebugLineState", "analysis::AnalysisDebugLineState", []],
  ["AnalysisSessionApplicationDebugTrackState", "analysis::AnalysisDebugTrackState", ["line_states"]],
  ["AnalysisSessionApplicationDebugScenarioTimeline", "analysis::AnalysisDebugScenarioTimeline", []],
  ["AnalysisSessionApplicationDebugState", "analysis::AnalysisDebugState", ["tracks", "scenario_timeline"]],
  ["AnalysisSessionApplicationMetricsTrackHealth", "analysis::TrackHealthMetrics", []],
  ["AnalysisSessionApplicationMetricsChannel", "analysis::AnalysisChannelMetrics", []],
  ["AnalysisSessionApplicationMetrics", "analysis::AnalysisMetricsReport", ["channels"]],
  ["AnalysisSessionApplicationAppearanceExtractorStats", "analysis::AppearanceExtractorStats", []],
  ["AnalysisSessionApplicationTrackStateMetrics", "analysis::TrackStateMetrics", []],
  ["AnalysisSessionApplicationResult", "analysis::AnalysisResult",
    ["detections", "tracks", "close_object_diagnostics", "pose_keypoints", "debug_state", "metrics_report"]],
  ["AnalysisSessionApplicationSnapshot", "analysis::AnalysisManager::TapSnapshot", ["latest_result"]],
];

function assertServiceHeaderContract(header) {
  const includes = [...header.matchAll(/^\s*#\s*include\s*([<"][^>"]+[>"])/gm)].map(item => item[1]);
  assert(JSON.stringify(includes) === JSON.stringify([
    "<cstddef>", "<cstdint>", "<optional>", "<string>", "<vector>",
    '"ingress/image_codec_application_service.h"',
  ]), "service header include manifest drift");
  assert(exactCount(header, /^\s*#\s*include\s*"/gm) === 1,
    "only the approved ImageCodec application frame contract may be a repository include");
  for (const token of ["analysis::", "core::", "media::", "AnalysisSessionService", "analysis_session_service.h",
    "void*", "reinterpret_cast", "std::any", "std::variant", "std::function"])
    assert(!header.includes(token), `canonical/core/unsafe dependency leaked into service contract: ${token}`);
  const actualDtos = [...header.matchAll(/^struct (AnalysisSessionApplication\w+)/gm)].map(item => item[1]);
  assert(JSON.stringify(actualDtos) === JSON.stringify(dtoNames), "DTO declaration identity/order drift");
  for (const name of dtoNames) assert(directFields(bracedDefinition(header, "struct", name)).length > 0,
    `DTO has no exact field manifest: ${name}`);
  const service = compact(bracedDefinition(header, "class", "AnalysisSessionReadApplicationService"));
  for (const api of [
    "virtual ~AnalysisSessionReadApplicationService() = default;",
    "virtual std::optional<AnalysisSessionApplicationSnapshot> Snapshot( const std::string& tap_id) const = 0;",
    "virtual std::vector<AnalysisSessionApplicationSnapshot> Snapshots() const = 0;",
    "virtual std::optional<AnalysisSessionApplicationResult> WaitResultNearPts( const std::string& tap_id, std::int64_t pts, std::int64_t tolerance_ns, int timeout_ms) const = 0;",
    "virtual std::optional<ImageCodecFrame> LatestFrame(const std::string& tap_id) const = 0;",
    "virtual std::optional<AnalysisSessionApplicationLatestFrameAndResult> LatestFrameAndResult( const std::string& tap_id) const = 0;",
    "virtual std::size_t ActiveTapCount() const = 0;",
  ]) assert(service.includes(api), `read-only virtual API drift: ${api}`);
  for (const token of ["Attach", "Detach", "Create", "PrepareRtsp", "Provider"])
    assert(!service.includes(token), `30B lifecycle leaked into 30A read API: ${token}`);
}

function assertAdapterContract(source) {
  for (const [dto, canonical, nestedFields] of mappingSpecs) {
    const fields = directFields(bracedDefinition(read(serviceHeaderPath), "struct", dto));
    const mapping = functionBodyByParameter(source, canonical);
    for (const field of fields) {
      const expected = nestedFields.includes(field.name) ? 2 : 1;
      assert(exactCount(mapping, new RegExp(`input\\.${field.name}\\b`, "g")) === expected,
        `${dto}.${field.name} canonical read count/order drift expected=${expected}`);
    }
  }
  const frame = functionBodyByParameter(source, "analysis::RawVideoFrame");
  for (const field of ["source_key", "track_id", "width", "height", "format", "pts", "data"])
    assert(exactCount(frame, new RegExp(`input\\.${field}\\b`, "g")) === 1,
      `RawVideoFrame.${field} mapping drift`);
  const pixel = functionBody(source, "FromCanonical");
  for (const format of ["I420", "RGB", "BGR", "Gray8", "Unknown"])
    assert(source.includes(`case analysis::PixelFormat::${format}: return ImageCodecPixelFormat::${format};`),
      `pixel format mapping drift: ${format}`);

  const snapshot = functionBody(source, "Snapshot");
  assert(ordered(snapshot, ["service_.AnalysisTapSnapshot(tap_id)", "!input.has_value()", "return std::nullopt", "return FromCanonical(*input)"]),
    "Snapshot null/delegation order drift");
  const snapshots = functionBody(source, "Snapshots");
  assert(ordered(snapshots, ["service_.AnalysisTapSnapshots()", "output.reserve(input.size())", "for (const auto& snapshot", "output.push_back(FromCanonical(snapshot))", "return output"]),
    "Snapshots order-preserving projection drift");
  const wait = functionBody(source, "WaitResultNearPts");
  assert(ordered(wait, ["service_.WaitAnalysisResultNearPts(", "tap_id, pts, tolerance_ns, std::chrono::milliseconds(timeout_ms)", "!input.has_value()", "return std::nullopt", "return FromCanonical(*input)"]),
    "near-result args/timeout/null projection drift");
  const latest = functionBody(source, "LatestFrame");
  assert(ordered(latest, ["service_.AnalysisLatestFrame(tap_id)", "!input.has_value()", "return std::nullopt", "return FromCanonical(*input)"]),
    "LatestFrame null/projection drift");
  const pair = functionBody(source, "LatestFrameAndResult");
  assert(ordered(pair, ["service_.AnalysisLatestFrameAndResult(tap_id)", "!input.has_value()", "return std::nullopt", "output.frame = FromCanonical(input->frame)", "if (input->result.has_value())", "output.result = FromCanonical(*input->result)", "return output"]),
    "LatestFrameAndResult outer/inner optional projection drift");
  const active = functionBody(source, "ActiveTapCount");
  exactFragment(active, "return service_.ActiveAnalysisTapCount();", "active tap delegation");
  assert(!/\btry\b|\bcatch\b/.test(source), "read exceptions must propagate unchanged");
  assert(ordered(source, ["class CanonicalAnalysisSessionReadApplicationAdapter final", "analysis::AnalysisSessionService& service_", "MakeAnalysisSessionReadApplicationAdapter", "std::make_unique<CanonicalAnalysisSessionReadApplicationAdapter>(service)"]),
    "adapter ownership/factory drift");
}

function assertTransportContract(transport, composition, serverHeader, detail, server, incidents, runtime) {
  for (const method of ["AnalysisTapSnapshot", "AnalysisTapSnapshots", "WaitAnalysisResultNearPts",
    "AnalysisLatestFrame", "AnalysisLatestFrameAndResult", "ActiveAnalysisTapCount"])
    assert(!new RegExp(`\\.${method}\\(`).test(transport), `transport canonical read remains: ${method}`);
  const expected = {Snapshot: 11, Snapshots: 54, WaitResultNearPts: 2,
    LatestFrame: 1, LatestFrameAndResult: 1, ActiveTapCount: 2};
  for (const [method, count] of Object.entries(expected))
    assert(exactCount(transport, new RegExp(`analysis_session_reads\\.${method}\\(`, "g")) === count,
      `application read call count drift: ${method}`);

  assert(exactCount(transport, /\.AttachAnalysisTap\(/g) === 0 &&
    exactCount(transport, /\.DetachAnalysisTapRef\(/g) === 0 &&
    exactCount(transport, /analysis_session_lifecycle\.Attach\(/g) === 4 &&
    exactCount(transport, /analysis_session_lifecycle\.Detach\(/g) === 1 &&
    exactCount(transport, /DetachAnalysisTapAndReleaseRuntimes\(/g) === 15,
  "application lifecycle attach/detach delegation drift");
  assert(!transport.includes("analysis::AnalysisSessionService") &&
    transport.includes("AnalysisSessionLifecycleApplicationService& analysis_session_lifecycle"),
  "canonical lifecycle owner leaked back into transport");
  assert(serverHeader.includes("AnalysisSessionReadApplicationService& analysis_session_reads") &&
    detail.includes("AnalysisSessionReadApplicationService& analysis_session_reads"),
  "HTTP constructor/Impl read port injection missing");
  assert(ordered(composition, [
    "analysis::AnalysisSessionService analysis_sessions(session_manager)",
    "MakeAnalysisSessionLifecycleApplicationAdapter(analysis_sessions)",
    "MakeAnalysisSessionReadApplicationAdapter(analysis_sessions)",
    "ingress::WebRtcHttpServer webrtc_http_server(",
    "session_manager,",
    "*analysis_session_lifecycle,",
    "*analysis_session_reads,",
    "webrtc_http_runtime_config",
  ]), "composition canonical -> adapter -> HTTP injection/lifetime order drift");
  assert(exactCount(composition, /MakeAnalysisSessionReadApplicationAdapter\(analysis_sessions\)/g) === 1,
    "composition adapter factory count drift");
  assert(exactCount(server, /AnalysisSessionReadApplicationService& analysis_session_reads/g) === 3,
    "constructor/SSE/WS read service signature count drift");
  assert(incidents.includes("AnalysisSessionReadApplicationService& analysis_session_reads") &&
    exactCount(incidents, /\[&analysis_session_reads,/g) === 1,
  "WebRTC overlay must inject and capture read service beside lifecycle service");
  assert(ordered(incidents, ["analysis_session_lifecycle.Attach(",
    "analysis_session_reads.WaitResultNearPts(", "analysis_session_reads.Snapshot("]),
  "WebRTC overlay attach -> read near -> read snapshot lifecycle/order drift");
  assert(ordered(runtime, ["AttachWebRtcAnalysisOverlay(", "impl_->analysis_session_lifecycle", "impl_->analysis_session_reads"]),
    "runtime WebRTC overlay lifecycle/read dual injection drift");
}

function transformedCanonicalStructs() {
  const header = read(serviceHeaderPath);
  const nameMap = new Map([
    ["AnalysisSessionApplicationLatestFrameAndResult", "LatestFrameResult"],
    ["AnalysisSessionApplicationCloseObjectDiagnostic", "CloseObjectAssociationDiagnostic"],
    ["AnalysisSessionApplicationDebugScenarioTimeline", "AnalysisDebugScenarioTimeline"],
    ["AnalysisSessionApplicationAppearanceExtractorStats", "AppearanceExtractorStats"],
    ["AnalysisSessionApplicationMetricsTrackHealth", "TrackHealthMetrics"],
    ["AnalysisSessionApplicationTrackStateMetrics", "TrackStateMetrics"],
    ["AnalysisSessionApplicationTrackTrailPoint", "TrackTrailPoint"],
    ["AnalysisSessionApplicationDebugTrackState", "AnalysisDebugTrackState"],
    ["AnalysisSessionApplicationDebugLineState", "AnalysisDebugLineState"],
    ["AnalysisSessionApplicationMetricsChannel", "AnalysisChannelMetrics"],
    ["AnalysisSessionApplicationMetrics", "AnalysisMetricsReport"],
    ["AnalysisSessionApplicationDebugState", "AnalysisDebugState"],
    ["AnalysisSessionApplicationDetection", "Detection"],
    ["AnalysisSessionApplicationPoseKeypoint", "PoseKeypoint"],
    ["AnalysisSessionApplicationSnapshot", "TapSnapshot"],
    ["AnalysisSessionApplicationContext", "AnalysisContext"],
    ["AnalysisSessionApplicationResult", "AnalysisResult"],
    ["AnalysisSessionApplicationTrack", "Track"],
    ["AnalysisSessionApplicationBox", "RectF"],
  ]);
  let definitions = dtoNames.map(name => bracedDefinition(header, "struct", name)).join("\n");
  for (const [from, to] of nameMap) definitions = definitions.replaceAll(from, to);
  definitions = definitions.replace("struct Track {", "struct Track {\n    using TrailPoint = TrackTrailPoint;");
  definitions = definitions.replace("ImageCodecFrame frame;", "RawVideoFrame frame;");
  return definitions;
}

function fakeCanonicalHeader() {
  return `#pragma once
#include <chrono>
#include <cstddef>
#include <cstdint>
#include <optional>
#include <stdexcept>
#include <string>
#include <vector>
namespace analysis {
enum class PixelFormat { Unknown, I420, RGB, BGR, Gray8 };
struct RawVideoFrame { std::string source_key; std::string track_id; int width{0}; int height{0}; PixelFormat format{PixelFormat::Unknown}; std::int64_t pts{0}; std::vector<unsigned char> data; };
${transformedCanonicalStructs()}
class AnalysisManager { public: using TapSnapshot = analysis::TapSnapshot; using LatestFrameResult = analysis::LatestFrameResult; };
class AnalysisSessionService {
public:
 mutable std::vector<std::string> calls; mutable bool throw_reads{false};
 std::optional<TapSnapshot> snapshot_value; std::vector<TapSnapshot> snapshots_value;
 std::optional<AnalysisResult> wait_value; std::optional<RawVideoFrame> frame_value;
 std::optional<LatestFrameResult> pair_value; std::size_t active_value{0};
 mutable std::string last_tap; mutable std::int64_t last_pts{0},last_tolerance{0}; mutable int last_timeout{-1};
 void Before(const std::string& call) const { calls.push_back(call); if (throw_reads) throw std::runtime_error("read-sentinel"); }
 std::optional<TapSnapshot> AnalysisTapSnapshot(const std::string& tap) const { Before("snapshot"); last_tap=tap; return snapshot_value; }
 std::vector<TapSnapshot> AnalysisTapSnapshots() const { Before("snapshots"); return snapshots_value; }
 std::optional<AnalysisResult> WaitAnalysisResultNearPts(const std::string& tap,std::int64_t pts,std::int64_t tolerance,std::chrono::milliseconds timeout) const { Before("wait");last_tap=tap;last_pts=pts;last_tolerance=tolerance;last_timeout=(int)timeout.count();return wait_value; }
 std::optional<RawVideoFrame> AnalysisLatestFrame(const std::string& tap) const { Before("frame");last_tap=tap;return frame_value; }
 std::optional<LatestFrameResult> AnalysisLatestFrameAndResult(const std::string& tap) const { Before("pair");last_tap=tap;return pair_value; }
 std::size_t ActiveAnalysisTapCount() const { Before("active");return active_value; }
};
}
`;
}

function compiledHarness() {
  return String.raw`#include "ingress/analysis_session_read_application_adapter.h"
#include <stdexcept>
#include <string>
#include <vector>
int main(){using namespace ingress;analysis::AnalysisSessionService service;
 analysis::AnalysisResult result;result.source_key="source";result.profile_key="profile";result.frame_id=7;result.pts=8;result.frame_width=9;result.frame_height=10;result.context.client_id="client";
 analysis::Detection detection;detection.label="person";detection.track_id=11;result.detections={detection};analysis::Track track;track.track_id=12;track.trail={{.x=.1F,.y=.2F,.pts=13}};result.tracks={track};analysis::CloseObjectAssociationDiagnostic diagnostic;diagnostic.guard_decision="hold";result.close_object_diagnostics={diagnostic};result.pose_keypoints={{"nose",.3F,.4F,.5F}};
 analysis::AnalysisDebugState debug;debug.enabled=true;debug.track_count=14;analysis::AnalysisDebugTrackState debug_track;debug_track.track_health="stable";debug.tracks={debug_track};analysis::AnalysisDebugScenarioTimeline timeline;timeline.instance_key="timeline";debug.scenario_timeline={timeline};result.debug_state=debug;
 analysis::AnalysisMetricsReport metrics;metrics.enabled=true;metrics.channel_count=15;analysis::AnalysisChannelMetrics channel;channel.channel_id="channel";metrics.channels={channel};result.metrics_report=metrics;
 analysis::TapSnapshot snapshot;snapshot.tap_id="tap";snapshot.stream_key="stream";snapshot.ref_count=2;snapshot.context.route="webrtc";snapshot.received_video_packets=16;snapshot.track_state_metrics.total_tracks=17;snapshot.track_state_metrics.appearance_extractor_stats.last_error="none";snapshot.latest_result=result;service.snapshot_value=snapshot;analysis::TapSnapshot snapshot2=snapshot;snapshot2.tap_id="tap-2";service.snapshots_value={snapshot,snapshot2};service.wait_value=result;
 analysis::RawVideoFrame frame;frame.source_key="frame-source";frame.track_id="video";frame.width=20;frame.height=21;frame.format=analysis::PixelFormat::BGR;frame.pts=22;frame.data={0,1,2,0};service.frame_value=frame;analysis::LatestFrameResult pair;pair.frame=frame;pair.result=result;service.pair_value=pair;service.active_value=23;
 auto reads=MakeAnalysisSessionReadApplicationAdapter(service);if(!reads)return 1;
 auto projected=reads->Snapshot("tap-key");if(!projected||projected->tap_id!="tap"||projected->stream_key!="stream"||projected->context.route!="webrtc"||projected->received_video_packets!=16||projected->track_state_metrics.total_tracks!=17||projected->track_state_metrics.appearance_extractor_stats.last_error!="none"||!projected->latest_result||projected->latest_result->source_key!="source"||projected->latest_result->detections.at(0).label!="person"||projected->latest_result->tracks.at(0).trail.at(0).pts!=13||projected->latest_result->close_object_diagnostics.at(0).guard_decision!="hold"||projected->latest_result->pose_keypoints.at(0).name!="nose"||!projected->latest_result->debug_state||projected->latest_result->debug_state->tracks.at(0).track_health!="stable"||projected->latest_result->debug_state->scenario_timeline.at(0).instance_key!="timeline"||!projected->latest_result->metrics_report||projected->latest_result->metrics_report->channels.at(0).channel_id!="channel")return 2;
 auto list=reads->Snapshots();if(list.size()!=2||list[0].tap_id!="tap"||list[1].tap_id!="tap-2")return 3;
 auto near=reads->WaitResultNearPts("near",31,32,33);if(!near||near->frame_id!=7||service.last_tap!="near"||service.last_pts!=31||service.last_tolerance!=32||service.last_timeout!=33)return 4;
 auto latest=reads->LatestFrame("frame");if(!latest||latest->source_key!="frame-source"||latest->track_id!="video"||latest->width!=20||latest->height!=21||latest->format!=ImageCodecPixelFormat::BGR||latest->pts!=22||latest->data!=std::vector<unsigned char>{0,1,2,0})return 5;
 auto both=reads->LatestFrameAndResult("pair");if(!both||both->frame.data.size()!=4||!both->result||both->result->profile_key!="profile")return 6;if(reads->ActiveTapCount()!=23)return 7;
 service.snapshot_value.reset();service.wait_value.reset();service.frame_value.reset();service.pair_value.reset();if(reads->Snapshot("x")||reads->WaitResultNearPts("x",1,2,3)||reads->LatestFrame("x")||reads->LatestFrameAndResult("x"))return 8;
 service.pair_value=pair;service.pair_value->result.reset();auto no_result=reads->LatestFrameAndResult("x");if(!no_result||no_result->result)return 9;
 service.throw_reads=true;try{(void)reads->Snapshot("throw");return 10;}catch(const std::runtime_error&e){if(std::string(e.what())!="read-sentinel")return 11;}service.throw_reads=false;
 service.active_value=99;if(reads->ActiveTapCount()!=99)return 12;
 const std::vector<std::string> suffix={"snapshot","snapshots","wait","frame","pair","active","snapshot","wait","frame","pair","pair","snapshot","active"};if(service.calls!=suffix)return 13;return 0;
}
`;
}

function compileAndRunCase(temp, source, name) {
  const caseRoot = path.join(temp, name);
  const fakeAnalysis = path.join(caseRoot, "include", "analysis");
  fs.mkdirSync(fakeAnalysis, {recursive: true});
  fs.writeFileSync(path.join(fakeAnalysis, "analysis_session_service.h"), fakeCanonicalHeader());
  fs.writeFileSync(path.join(fakeAnalysis, "analysis_types.h"),
    '#pragma once\n#include "analysis/analysis_session_service.h"\n');
  fs.writeFileSync(path.join(caseRoot, "analysis_session_application_mapping.h"),
    read("src/ingress/analysis_session_application_mapping.h"));
  const sourceFile = path.join(caseRoot, "adapter.cpp");
  const harnessFile = path.join(caseRoot, "harness.cpp");
  fs.writeFileSync(sourceFile, source);
  fs.writeFileSync(harnessFile, compiledHarness());
  const binary = path.join(caseRoot, "case");
  const compile = spawnSync(process.env.CXX || "c++", ["-std=c++17", `-I${path.join(caseRoot, "include")}`,
    `-I${path.join(root, "include")}`, sourceFile, harnessFile, "-o", binary], {encoding: "utf8"});
  if (compile.status !== 0) return {...compile, phase: "compile"};
  return {...spawnSync(binary, [], {encoding: "utf8"}), phase: "run"};
}

check("public read contract uses only standard headers plus the approved application frame leaf", () => {
  const header = read(serviceHeaderPath);
  assertServiceHeaderContract(header);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "v390-analysis-session-read-header-"));
  try {
    const harness = path.join(temp, "header.cpp");
    fs.writeFileSync(harness, '#include "ingress/analysis_session_read_application_service.h"\nint main(){return 0;}\n');
    execFileSync(process.env.CXX || "c++", ["-std=c++17", `-I${path.join(root, "include")}`, "-fsyntax-only", harness]);
    const dependencies = execFileSync(process.env.CXX || "c++", ["-std=c++17", `-I${path.join(root, "include")}`, "-MM", harness], {encoding: "utf8"}).replace(/\\\n/g, " ");
    const repoHeaders = dependencies.match(/(?:\/[^\s]+)?include\/[^\s]+\.h/g) || [];
    assert(repoHeaders.length === 2 && repoHeaders.some(item => item.endsWith(serviceHeaderPath)) &&
      repoHeaders.some(item => item.endsWith("include/ingress/image_codec_application_service.h")),
    `approved standalone closure drift: ${repoHeaders.join(",")}`);
    assert(!repoHeaders.some(item => /include\/(?:analysis|core|media)\//.test(item)),
      "approved ImageCodec leaf introduced a transitive canonical/core dependency");
  } finally { fs.rmSync(temp, {recursive: true, force: true}); }
  const noLeaf = replaceExact(header, '#include "ingress/image_codec_application_service.h"',
    '#include "analysis/analysis_types.h"', "RED approved leaf replaced by canonical header");
  assertRejected("RED approved leaf replaced by canonical header", () => assertServiceHeaderContract(noLeaf));
});

check("adapter owns every canonical field, optional, list order, timeout, and exception semantic", () => {
  const source = read(adapterSourcePath);
  assertAdapterContract(source);
  const mutations = [
    ["RED scalar source/profile swap",
      "AnalysisSessionApplicationResult FromCanonical(const analysis::AnalysisResult& input) {\n    AnalysisSessionApplicationResult output;\n    output.source_key = input.source_key;",
      "AnalysisSessionApplicationResult FromCanonical(const analysis::AnalysisResult& input) {\n    AnalysisSessionApplicationResult output;\n    output.source_key = input.profile_key;"],
    ["RED nested detections omission",
      "output.frame_height = input.frame_height;\n    output.detections.reserve(input.detections.size());\n    for (const auto& detection : input.detections) {\n        output.detections.push_back(FromCanonical(detection));\n    }",
      "output.frame_height = input.frame_height;\n    /* detections omitted */"],
    ["RED optional debug omission", "if (input.debug_state.has_value()) output.debug_state = FromCanonical(*input.debug_state);", "/* debug omitted */"],
    ["RED list stale order", "for (const auto& snapshot : input) output.push_back(FromCanonical(snapshot));", "for (auto it=input.rbegin();it!=input.rend();++it) output.push_back(FromCanonical(*it));"],
    ["RED timeout seconds", "std::chrono::milliseconds(timeout_ms)", "std::chrono::seconds(timeout_ms)"],
    ["RED pair result omission", "if (input->result.has_value()) output.result = FromCanonical(*input->result);", "/* pair result omitted */"],
    ["RED active constant", "return service_.ActiveAnalysisTapCount();", "return 0;"],
  ];
  for (const [label, before, after] of mutations)
    assertRejected(label, () => assertAdapterContract(replaceExact(source, before, after, label)));
});

check("compiled fake canonical provider rejects mapping, null, timeout, order, and lifecycle false PASS", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "v390-analysis-session-read-app-"));
  try {
    const source = read(adapterSourcePath);
    const canonical = compileAndRunCase(temp, source, "canonical");
    assert(canonical.status === 0,
      `canonical harness ${canonical.phase} exit=${canonical.status} stdout=${canonical.stdout.trim()} stderr=${canonical.stderr.trim()}`);
    const mutations = [
      ["RED-runtime-source-profile-swap",
        "AnalysisSessionApplicationResult FromCanonical(const analysis::AnalysisResult& input) {\n    AnalysisSessionApplicationResult output;\n    output.source_key = input.source_key;",
        "AnalysisSessionApplicationResult FromCanonical(const analysis::AnalysisResult& input) {\n    AnalysisSessionApplicationResult output;\n    output.source_key = input.profile_key;"],
      ["RED-runtime-detection-omission", "output.detections.push_back(FromCanonical(detection));", "/* omitted */"],
      ["RED-runtime-list-reverse", "for (const auto& snapshot : input) output.push_back(FromCanonical(snapshot));", "for (auto it=input.rbegin();it!=input.rend();++it) output.push_back(FromCanonical(*it));"],
      ["RED-runtime-timeout-seconds", "std::chrono::milliseconds(timeout_ms)", "std::chrono::seconds(timeout_ms)"],
      ["RED-runtime-frame-format", "case analysis::PixelFormat::BGR: return ImageCodecPixelFormat::BGR;", "case analysis::PixelFormat::BGR: return ImageCodecPixelFormat::RGB;"],
      ["RED-runtime-pair-result", "if (input->result.has_value()) output.result = FromCanonical(*input->result);", "/* omitted */"],
      ["RED-runtime-active-constant", "return service_.ActiveAnalysisTapCount();", "return 0;"],
    ];
    for (const [name, before, after] of mutations) {
      const red = compileAndRunCase(temp, replaceExact(source, before, after, name), name);
      assert(red.status !== 0,
        `${name} produced false PASS phase=${red.phase} stdout=${red.stdout.trim()} stderr=${red.stderr.trim()}`);
    }
  } finally { fs.rmSync(temp, {recursive: true, force: true}); }
});

check("transport read and lifecycle calls use their injected application ports", () => {
  const transport = transportPaths.map(read).join("\n");
  assertTransportContract(transport, read(compositionPath), read(publicServerHeaderPath), read(detailPath),
    read(serverPath), read(incidentsPath), read(runtimePath));
});

check("CMake, server dispatch, and graph register the exact non-final Slice30A successor", () => {
  assert(exactCount(read("CMakeLists.txt"), /src\/ingress\/analysis_session_read_application_adapter\.cpp/g) === 1,
    "CMake adapter source registration drift");
  assert(exactCount(read("server.sh"), /verify-v390-analysis-session-read-application-boundary/g) === 3,
    "server help/list/dispatch count drift");
  const graph = JSON.parse(read("test/fixtures/v390_structure_stabilization_current_graph.json"));
  const assertGraphContract = candidate => {
    const classifier = id => candidate.moduleClassifiers.find(item => item.id === id);
    const edge = direction => candidate.observedModuleEdges.find(item => item.direction === direction);
    const application = classifier("application-service-interfaces");
    assert(candidate.expectedProductionFiles === 212 && candidate.expectedCppFiles === 102 &&
      application?.expectedFileCount === 45 && application?.expectedCppCount === 18 &&
      exactCount(application.exactFiles.join("\n"),
        /src\/ingress\/analysis_session_application_mapping\.h/g) === 1 &&
      !edge("transport-and-auth-adapter -> analysis-services") &&
      edge("transport-and-auth-adapter -> application-service-interfaces")?.witnessCount === 23 &&
      edge("transport-and-auth-adapter -> application-service-interfaces")?.witnessSha256 ===
        "8cd647e97e04ebdc976ba2e64448fcc582a66ed114b75f91b7fb683fa5fba38d" &&
      edge("application-service-interfaces -> analysis-services")?.witnessCount === 23 &&
      edge("application-service-interfaces -> analysis-services")?.witnessSha256 ===
        "4b3cbd1800bf8771eef67752edae8b604e8aefc1574e44d7890847c76d681cee" &&
      edge("transport-and-auth-adapter -> core-media-interfaces")?.witnessCount === 4 &&
      edge("composition-root -> application-service-interfaces")?.witnessCount === 2 &&
      edge("composition-root -> application-service-interfaces")?.witnessSha256 ===
        "fc7b3895f0b81d59e40e4e8767f34518412a866cedd7c088b3dc9d58a7c90b48" &&
      candidate.observedModuleEdges.length === 16 &&
      candidate.observedModuleEdges.filter(item => !item.allowedByTarget).length === 1 &&
      candidate.stronglyConnectedComponents.length === 0 &&
      candidate.boundary.includes("Analysis Session lifecycle application boundary"),
    "graph successor is pending or drifted; register Slice30B current graph before completion");
  };
  assertGraphContract(graph);
  const missingMappingHeader = JSON.parse(JSON.stringify(graph));
  const application = missingMappingHeader.moduleClassifiers.find(
    item => item.id === "application-service-interfaces");
  application.exactFiles = application.exactFiles.filter(
    item => item !== "src/ingress/analysis_session_application_mapping.h");
  assertRejected("RED internal mapping header omitted from application owner", () =>
    assertGraphContract(missingMappingHeader));
});

check("current structure gate accepts the exact non-final Slice30A frontier", () => {
  const output = execFileSync(path.join(root, "server.sh"),
    ["verify-v390-review4-structure-stabilization-execution"], {cwd: root, encoding: "utf8"});
  assert(output.includes("summary: pass=15 fail=0"), "structure Slice30A successor gate pending/failed");
});

for (const item of checks) console.log(`- ${item.status}: ${item.name}${item.detail ? ` — ${item.detail}` : ""}`);
const failed = checks.filter(item => item.status === "FAIL").length;
console.log(`- summary: pass=${checks.length - failed} fail=${failed}`);
process.exit(failed ? 1 : 0);

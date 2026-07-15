#!/usr/bin/env node
// REVIEW4-64 Slice 25: VA metadata filter/build/sync and serializers behind an application boundary.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const args = process.argv.slice(2);
if (hasHelpFlag(args)) {
  printUsageAndExit(`V390 VA metadata application boundary verification

Usage:
  ./server.sh verify-v390-va-metadata-application-boundary
`);
}
assertKnownOptions(args, ["h", "help"]);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const exists = file => fs.existsSync(path.join(root, file));
const headerPath = "include/ingress/va_metadata_application_service.h";
const sourcePath = "src/ingress/va_metadata_application_service.cpp";
const detailPath = "src/ingress/webrtc_http_server_detail.h";
const executionPath = "test/fixtures/v390_structure_stabilization_execution.json";
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
  detailPath,
  "include/ingress/webrtc_http_analysis_rule_declarations.h",
];
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
  let depth = 0, quote = "", escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    else if (char === "}" && --depth === 0) return text.slice(anchor, index + 1);
  }
  throw new Error(`unterminated function: ${signature}`);
}

function exactCount(text, token) {
  return text.split(token).length - 1;
}

function assertExactFunction(text, signature, expected, label) {
  const actualBlock = functionBlock(text, signature);
  const actualBody = actualBlock.slice(actualBlock.indexOf("{"));
  const expectedBody = expected.slice(expected.indexOf("{"));
  assert(compactCppPreservingLiterals(actualBody) === compactCppPreservingLiterals(expectedBody),
    `${label} normalized body drift`);
}

const filterFields = [
  "event_types", "rule_ids", "scenario_names", "zone_ids", "line_ids",
  "statuses", "labels", "track_id", "class_id",
];
const syncFields = [
  "available", "video_frame_pts_ms", "analysis_pts_ms", "sync_delta_ms", "sync_status",
  "sync_tolerance_ms", "metadata_sequence", "sent_at_ms", "frame_width", "frame_height",
  "coordinate_space",
];
const buildFields = [
  "include_source", "include_scenarios", "include_metrics", "include_tracking_issue_report",
  "max_tracks", "max_events", "max_message_bytes",
];

function assertOneToOneMapping(source, fields, label) {
  for (const field of fields) {
    const mapping = new RegExp(`\\b([A-Za-z_][A-Za-z0-9_]*)\\.${field}\\s*=\\s*([A-Za-z_][A-Za-z0-9_]*)\\.${field}\\s*;`, "g");
    assert((source.match(mapping) || []).length === 1, `${label} exact mapping drift: ${field}`);
  }
}

function assertCanonicalSource(source) {
  for (const include of ["metadata_subscription_filter", "va_runtime_metadata"]) {
    assert(source.includes(`#include "analysis/${include}.h"`), `canonical include missing: ${include}`);
  }
  for (const token of [
    "analysis::FilterVaMetadataResult", "analysis::FilterVaMetadataEvents",
    "analysis::BuildVaRuntimeMetadataFrame", "analysis::SerializeVaRuntimeMetadataFrameJson",
    "analysis::SerializeVaRuntimeMetadataFrameForWebRtcJson", "VaRuntimeMetadataSchemaForApplication",
  ]) assert(source.includes(token), `canonical owner call missing: ${token}`);
  const filter = functionBlock(source, "analysis::VaMetadataSubscriptionFilter ProjectFilter(");
  const sync = functionBlock(source, "analysis::VaRuntimeSyncInfo ProjectSyncInfo(");
  assertOneToOneMapping(filter, filterFields, "filter");
  assertOneToOneMapping(sync, syncFields, "sync");
  assertExactFunction(source, "analysis::VaMetadataSubscriptionFilter ProjectFilter(", `analysis::VaMetadataSubscriptionFilter ProjectFilter(
    const VaMetadataApplicationFilter& input) {
    analysis::VaMetadataSubscriptionFilter filter;
    filter.event_types = input.event_types;
    filter.rule_ids = input.rule_ids;
    filter.scenario_names = input.scenario_names;
    filter.zone_ids = input.zone_ids;
    filter.line_ids = input.line_ids;
    filter.statuses = input.statuses;
    filter.labels = input.labels;
    filter.track_id = input.track_id;
    filter.class_id = input.class_id;
    return filter;
}`, "filter projection");
  assertExactFunction(source, "analysis::VaRuntimeSyncInfo ProjectSyncInfo(", `analysis::VaRuntimeSyncInfo ProjectSyncInfo(
    const VaMetadataApplicationSyncInfo& input) {
    analysis::VaRuntimeSyncInfo sync;
    sync.available = input.available;
    sync.video_frame_pts_ms = input.video_frame_pts_ms;
    sync.analysis_pts_ms = input.analysis_pts_ms;
    sync.sync_delta_ms = input.sync_delta_ms;
    sync.sync_status = input.sync_status;
    sync.sync_tolerance_ms = input.sync_tolerance_ms;
    sync.metadata_sequence = input.metadata_sequence;
    sync.sent_at_ms = input.sent_at_ms;
    sync.frame_width = input.frame_width;
    sync.frame_height = input.frame_height;
    sync.coordinate_space = input.coordinate_space;
    return sync;
}`, "sync projection");
  assertExactFunction(source, "const char* VaRuntimeMetadataSchemaForApplication(", `const char* VaRuntimeMetadataSchemaForApplication() {
    return analysis::kVaRuntimeMetadataSchema;
}`, "runtime schema accessor");

  const runtimeExpected = `std::string SerializeVaRuntimeMetadataForApplication(
    const analysis::AnalysisResult& result,
    const std::vector<analysis::AnalysisEvent>& events,
    const std::string& tracking_issue_report_json,
    const VaMetadataApplicationBuildOptions& input) {
    const auto filter = ProjectFilter(input.filter);
    const auto filtered_result = analysis::FilterVaMetadataResult(result, filter);
    const auto filtered_events = analysis::FilterVaMetadataEvents(events, filter);

    analysis::VaRuntimeMetadataBuildOptions options;
    options.schema = analysis::kVaRuntimeMetadataSchema;
    options.include_source = input.include_source;
    options.include_scenarios = input.include_scenarios;
    options.include_metrics = input.include_metrics;
    options.include_tracking_issue_report = input.include_tracking_issue_report;
    options.max_tracks = input.max_tracks;
    options.max_events = input.max_events;

    std::string serialized;
    for (int attempt = 0; attempt < 16; ++attempt) {
        serialized = analysis::SerializeVaRuntimeMetadataFrameJson(
            analysis::BuildVaRuntimeMetadataFrame(
                filtered_result, filtered_events, options, tracking_issue_report_json));
        if (serialized.size() <= input.max_message_bytes) {
            return serialized;
        }
        bool reduced = false;
        if (options.max_events > 1) {
            options.max_events = std::max<std::size_t>(1, options.max_events / 2);
            reduced = true;
        } else if (options.max_tracks > 1) {
            options.max_tracks = std::max<std::size_t>(1, options.max_tracks / 2);
            reduced = true;
        }
        if (!reduced) {
            break;
        }
    }
    return {};
}`;
  assertExactFunction(source, "std::string SerializeVaRuntimeMetadataForApplication(",
    runtimeExpected, "runtime serializer");
  const runtime = functionBlock(source, "std::string SerializeVaRuntimeMetadataForApplication(");
  assertOneToOneMapping(runtime, buildFields.slice(0, -1), "runtime build option");
  const loop = runtime.indexOf("for (int attempt = 0; attempt < 16; ++attempt)");
  const sizeCheck = runtime.indexOf("serialized.size() <= input.max_message_bytes");
  const eventBranch = runtime.indexOf("if (options.max_events > 1)");
  const trackBranch = runtime.indexOf("else if (options.max_tracks > 1)");
  assert(loop >= 0 && sizeCheck > loop && eventBranch > sizeCheck && trackBranch > eventBranch &&
    !/\breturn\b/.test(runtime.slice(0, loop)) && exactCount(runtime, "return serialized;") === 1 &&
    exactCount(runtime, "return {};") === 1 && exactCount(runtime, "input.max_message_bytes") === 1,
  "runtime budget order, size gate, or early-return contract drift");

  assertExactFunction(source, "std::string SerializeWebRtcVaMetadataForApplication(", `std::string SerializeWebRtcVaMetadataForApplication(
    const analysis::AnalysisResult& result,
    const std::vector<analysis::AnalysisEvent>& events,
    const VaMetadataApplicationSyncInfo& sync_info,
    const VaMetadataApplicationFilter& input_filter) {
    const auto filter = ProjectFilter(input_filter);
    const auto filtered_result = analysis::FilterVaMetadataResult(result, filter);
    const auto filtered_events = analysis::FilterVaMetadataEvents(events, filter);

    analysis::VaRuntimeMetadataBuildOptions options;
    options.schema = analysis::kWebRtcVaMetadataSchema;
    options.include_source = false;
    options.include_scenarios = false;
    options.include_metrics = false;
    options.include_tracking_issue_report = false;
    options.include_missed_tracks = false;
    options.sync = ProjectSyncInfo(sync_info);
    return analysis::SerializeVaRuntimeMetadataFrameForWebRtcJson(
        analysis::BuildVaRuntimeMetadataFrame(filtered_result, filtered_events, options));
}`, "WebRTC serializer");

  assertExactFunction(source, "std::string SerializeMissingWebRtcVaMetadataForApplication(", `std::string SerializeMissingWebRtcVaMetadataForApplication(
    const std::string& stream_id,
    std::int64_t video_frame_pts_ns,
    const VaMetadataApplicationSyncInfo& sync_info) {
    analysis::VaRuntimeMetadataFrame frame;
    frame.schema = analysis::kWebRtcVaMetadataSchema;
    frame.stream_id = stream_id;
    frame.channel_id = stream_id;
    frame.pts = video_frame_pts_ns;
    frame.timestamp_ms = video_frame_pts_ns / 1000000LL;
    frame.sync = ProjectSyncInfo(sync_info);
    frame.sync.analysis_pts_ms = 0;
    frame.sync.sync_delta_ms = 0;
    return analysis::SerializeVaRuntimeMetadataFrameForWebRtcJson(frame);
}`, "missing WebRTC serializer");

  const canonicalCounts = new Map([
    ["ProjectFilter(", 3], ["ProjectSyncInfo(", 3],
    ["analysis::FilterVaMetadataResult(", 2], ["analysis::FilterVaMetadataEvents(", 2],
    ["analysis::BuildVaRuntimeMetadataFrame(", 2],
    ["analysis::SerializeVaRuntimeMetadataFrameJson(", 1],
    ["analysis::SerializeVaRuntimeMetadataFrameForWebRtcJson(", 2],
  ]);
  for (const [token, count] of canonicalCounts) {
    assert(exactCount(source, token) === count, `canonical call count drift: ${token}`);
  }
}

function assertTransportDelegation(transport, detail) {
  assert(detail.includes('#include "ingress/va_metadata_application_service.h"'),
    "application contract include missing from transport detail");
  assert(!detail.includes('#include "analysis/metadata_subscription_filter.h"') &&
    !detail.includes('#include "analysis/va_runtime_metadata.h"'), "raw metadata include remains in transport");
  const forbidden = [
    "analysis::VaMetadataSubscriptionFilter", "analysis::VaRuntimeSyncInfo",
    "analysis::VaRuntimeMetadataBuildOptions", "analysis::VaRuntimeMetadataFrame",
    "analysis::FilterVaMetadataResult", "analysis::FilterVaMetadataEvents",
    "analysis::BuildVaRuntimeMetadataFrame", "analysis::SerializeVaRuntimeMetadataFrameJson",
    "analysis::SerializeVaRuntimeMetadataFrameForWebRtcJson", "analysis::kVaRuntimeMetadataSchema",
    "analysis::kWebRtcVaMetadataSchema",
  ];
  for (const token of forbidden) assert(!transport.includes(token), `transport canonical bypass remains: ${token}`);
  for (const api of [
    "SerializeVaRuntimeMetadataForApplication", "SerializeWebRtcVaMetadataForApplication",
    "SerializeMissingWebRtcVaMetadataForApplication", "VaRuntimeMetadataSchemaForApplication",
  ]) assert((transport.match(new RegExp(`${api}\\(`, "g")) || []).length === 1,
    `transport delegation count drift: ${api}`);
  for (const type of [
    "VaMetadataApplicationFilter", "VaMetadataApplicationBuildOptions", "VaMetadataApplicationSyncInfo",
  ]) assert(transport.includes(type), `transport application DTO missing: ${type}`);
}

function assertTransportMappings(server, incidents) {
  assertExactFunction(server, "VaMetadataApplicationFilter BuildVaMetadataSubscriptionFilter(", `VaMetadataApplicationFilter BuildVaMetadataSubscriptionFilter(
    const std::unordered_map<std::string, std::string>& query) {
    VaMetadataApplicationFilter filter;
    AppendVaMetadataQueryList(query, {"eventType", "eventTypes"}, &filter.event_types);
    AppendVaMetadataQueryList(query, {"ruleId", "ruleIds", "metadataRuleId", "metadataRuleIds"}, &filter.rule_ids);
    AppendVaMetadataQueryList(query, {"scenario", "scenarioName", "scenarioNames"}, &filter.scenario_names);
    AppendVaMetadataQueryList(query, {"zoneId", "zoneIds"}, &filter.zone_ids);
    AppendVaMetadataQueryList(query, {"lineId", "lineIds"}, &filter.line_ids);
    AppendVaMetadataQueryList(query, {"status", "statuses", "eventStatus"}, &filter.statuses);
    AppendVaMetadataQueryList(query, {"label", "labels", "className", "classNames"}, &filter.labels);
    filter.track_id = ParseVaMetadataUint64Query(query, {"trackId"});
    filter.class_id = ParseVaMetadataIntQuery(query, {"classId"});
    return filter;
}`, "transport query/filter projection");
  assertExactFunction(server, "std::string BuildVaRuntimeMetadataJsonWithinBudget(", `std::string BuildVaRuntimeMetadataJsonWithinBudget(
    const analysis::AnalysisResult& result,
    const std::vector<analysis::AnalysisEvent>& events,
    const std::string& tracking_issue_report_json,
    const VaMetadataStreamOptions& stream_options) {
    VaMetadataApplicationBuildOptions options;
    options.filter = stream_options.subscription_filter;
    options.include_source = stream_options.include_source;
    options.include_scenarios = stream_options.include_scenarios;
    options.include_metrics = stream_options.include_metrics;
    options.include_tracking_issue_report = stream_options.include_tracking_issue_report;
    options.max_tracks = stream_options.max_tracks;
    options.max_events = stream_options.max_events;
    options.max_message_bytes = stream_options.max_message_bytes;
    return SerializeVaRuntimeMetadataForApplication(
        result, events, tracking_issue_report_json, options);
}`, "transport runtime build projection");
  const build = functionBlock(server, "std::string BuildVaRuntimeMetadataJsonWithinBudget(");
  assertOneToOneMapping(build, buildFields, "transport runtime build option");

  assertExactFunction(incidents, "VaMetadataApplicationSyncInfo BuildWebRtcVaMetadataSyncInfo(", `VaMetadataApplicationSyncInfo BuildWebRtcVaMetadataSyncInfo(
    std::int64_t video_frame_pts_ns,
    std::int64_t analysis_pts_ns,
    std::int64_t sync_tolerance_ns,
    std::string sync_status,
    int frame_width,
    int frame_height) {
    VaMetadataApplicationSyncInfo sync;
    sync.available = true;
    sync.video_frame_pts_ms = PtsNsToMs(video_frame_pts_ns);
    sync.analysis_pts_ms = PtsNsToMs(analysis_pts_ns);
    sync.sync_delta_ms = PtsNsToMs(analysis_pts_ns - video_frame_pts_ns);
    sync.sync_status = std::move(sync_status);
    sync.sync_tolerance_ms = PtsNsToMs(sync_tolerance_ns);
    sync.metadata_sequence = g_web_rtc_metadata_sequence.fetch_add(1, std::memory_order_relaxed) + 1;
    sync.sent_at_ms = NowUnixMs();
    sync.frame_width = frame_width;
    sync.frame_height = frame_height;
    sync.coordinate_space = "normalized-frame";
    return sync;
}`, "transport WebRTC sync projection");
  assertExactFunction(incidents, "std::string WebRtcVaMetadataMessageJson(", `std::string WebRtcVaMetadataMessageJson(
    const analysis::AnalysisResult& result,
    const std::vector<analysis::AnalysisEvent>& events,
    const VaMetadataApplicationSyncInfo& sync_info,
    const VaMetadataApplicationFilter& subscription_filter) {
    return SerializeWebRtcVaMetadataForApplication(
        result, events, sync_info, subscription_filter);
}`, "transport present WebRTC delegation");
  assertExactFunction(incidents, "std::string WebRtcVaMetadataMissingMessageJson(", `std::string WebRtcVaMetadataMissingMessageJson(
    const std::string& stream_id,
    std::int64_t video_frame_pts_ns,
    std::int64_t sync_tolerance_ns) {
    auto sync = BuildWebRtcVaMetadataSyncInfo(
        video_frame_pts_ns, video_frame_pts_ns, sync_tolerance_ns, "missing", 0, 0);
    sync.analysis_pts_ms = 0;
    sync.sync_delta_ms = 0;
    return SerializeMissingWebRtcVaMetadataForApplication(
        stream_id, video_frame_pts_ns, sync);
}`, "transport missing WebRTC delegation");
}

function assertTransportCallsites(server, incidents) {
  assert(exactCount(server, "BuildVaRuntimeMetadataJsonWithinBudget(") === 3,
    "runtime metadata definition/two-callsite count drift");
  assert(exactCount(incidents, "WebRtcVaMetadataMessageJson(") === 3,
    "present metadata definition/two-callsite count drift");
  assert(exactCount(incidents, "WebRtcVaMetadataMissingMessageJson(") === 3,
    "missing metadata definition/two-callsite count drift");
  assert(exactCount(incidents, "BuildWebRtcVaMetadataSyncInfo(") === 4,
    "sync definition/three-callsite count drift");

  const overlay = functionBlock(incidents, "bool AttachWebRtcAnalysisOverlay(");
  assert(exactCount(overlay, "DispatchEventRecordsForApplication(") === 2 &&
    exactCount(overlay, "DispatchEventPostsForApplication(") === 2 &&
    exactCount(overlay, "WebRtcVaMetadataMessageJson(") === 2 &&
    exactCount(overlay, "WebRtcVaMetadataMissingMessageJson(") === 2 &&
    exactCount(overlay, "BuildWebRtcVaMetadataSyncInfo(") === 2 &&
    exactCount(overlay, "PublishAnalysisMetadata(") === 4,
  "overlay Record/Post/present/missing/sync/publish counts drift");
  const compact = compactCppPreservingLiterals(overlay);
  const presentNested = `bridge_lock->PublishAnalysisMetadata( WebRtcVaMetadataMessageJson(evaluation.annotated_result, evaluation.events, sync_info, metadata_subscription_filter));`;
  const missingNested = `bridge_lock->PublishAnalysisMetadata( WebRtcVaMetadataMissingMessageJson(tap_id, source_pts, tolerance_ns));`;
  assert(exactCount(compact, compactCppPreservingLiterals(presentNested)) === 2 &&
    exactCount(compact, compactCppPreservingLiterals(missingNested)) === 2,
  "serializer is not the exact Publish argument at all four metadata callsites");
  const recordPositions = [...overlay.matchAll(/DispatchEventRecordsForApplication\(/g)].map(match => match.index);
  for (let index = 0; index < recordPositions.length; index += 1) {
    const segment = overlay.slice(recordPositions[index], recordPositions[index + 1] ?? overlay.length);
    const record = segment.indexOf("DispatchEventRecordsForApplication(");
    const post = segment.indexOf("DispatchEventPostsForApplication(");
    const sync = segment.indexOf("BuildWebRtcVaMetadataSyncInfo(");
    const publish = segment.indexOf("PublishAnalysisMetadata(");
    const serialize = segment.indexOf("WebRtcVaMetadataMessageJson(");
    assert(record === 0 && post > record && sync > post && publish > sync && serialize > publish,
      `Record→Post→serialize-as-argument→Publish branch order drift: ${index}`);
  }
}

check("dependency-neutral VA metadata DTO contract is exact", () => {
  assert(exists(headerPath), `${headerPath} missing`);
  const header = read(headerPath);
  const includes = [...header.matchAll(/^\s*#\s*include\s*([<"][^>"]+[>"])/gm)].map(match => match[1]);
  assert(JSON.stringify(includes) === JSON.stringify([
    "<cstddef>", "<cstdint>", "<optional>", "<string>", "<vector>",
  ]), "application header include set drift");
  assert(!/^\s*#\s*include\s*"/m.test(header) && !/\b(?:core|domain|media)::/.test(header),
    "implementation dependency leaked into application contract");
  for (const name of ["AnalysisResult", "AnalysisEvent"]) {
    assert((header.match(new RegExp(`struct\\s+${name}\\s*;`, "g")) || []).length === 1,
      `analysis forward contract drift: ${name}`);
  }
  for (const snippet of [
    `struct VaMetadataApplicationFilter {
    std::vector<std::string> event_types;
    std::vector<std::string> rule_ids;
    std::vector<std::string> scenario_names;
    std::vector<std::string> zone_ids;
    std::vector<std::string> line_ids;
    std::vector<std::string> statuses;
    std::vector<std::string> labels;
    std::optional<std::uint64_t> track_id;
    std::optional<int> class_id;
};`,
    `struct VaMetadataApplicationSyncInfo {
    bool available{false};
    std::int64_t video_frame_pts_ms{0};
    std::int64_t analysis_pts_ms{0};
    std::int64_t sync_delta_ms{0};
    std::string sync_status;
    std::int64_t sync_tolerance_ms{0};
    std::uint64_t metadata_sequence{0};
    std::int64_t sent_at_ms{0};
    int frame_width{0};
    int frame_height{0};
    std::string coordinate_space{"normalized-frame"};
};`,
    `struct VaMetadataApplicationBuildOptions {
    VaMetadataApplicationFilter filter;
    bool include_source{true};
    bool include_scenarios{true};
    bool include_metrics{true};
    bool include_tracking_issue_report{true};
    std::size_t max_tracks{0};
    std::size_t max_events{0};
    std::size_t max_message_bytes{0};
};`,
  ]) assert(compactCppPreservingLiterals(header).includes(compactCppPreservingLiterals(snippet)),
    `exact DTO field/order/default drift: ${snippet.split("\n")[0]}`);
  for (const api of [
    "SerializeVaRuntimeMetadataForApplication", "SerializeWebRtcVaMetadataForApplication",
    "SerializeMissingWebRtcVaMetadataForApplication", "VaRuntimeMetadataSchemaForApplication",
  ]) assert((header.match(new RegExp(`\\b${api}\\s*\\(`, "g")) || []).length === 1,
    `application API declaration drift: ${api}`);
});

check("application source owns canonical filter build sync and all serializer semantics", () => {
  assert(exists(sourcePath), `${sourcePath} missing`);
  assertCanonicalSource(read(sourcePath));
});

check("transport delegates exactly and removes raw metadata ownership", () => {
  const detail = read(detailPath);
  const server = read("src/ingress/webrtc_http_server.cpp");
  const incidents = read("src/ingress/webrtc_http_server_ops_incidents.cpp");
  const transport = transportPaths.map(read).join("\n");
  assertTransportDelegation(transport, detail);
  assertTransportMappings(server, incidents);
  assertTransportCallsites(server, incidents);
});

check("application and transport overwrite paired-swap order and bypass mutations fail closed", () => {
  assert(exists(sourcePath), `${sourcePath} missing`);
  const source = read(sourcePath);
  const sourceMutations = [
    ["filter-overwrite", value => value.replace("filter.rule_ids = input.rule_ids;",
      "filter.event_types = input.rule_ids;")],
    ["filter-paired-swap", value => value
      .replace("filter.event_types = input.event_types;", "filter.event_types = input.rule_ids;")
      .replace("filter.rule_ids = input.rule_ids;", "filter.rule_ids = input.event_types;")],
    ["sync-overwrite", value => value.replace("sync.analysis_pts_ms = input.analysis_pts_ms;",
      "sync.video_frame_pts_ms = input.analysis_pts_ms;")],
    ["sync-paired-swap", value => value
      .replace("sync.video_frame_pts_ms = input.video_frame_pts_ms;", "sync.video_frame_pts_ms = input.analysis_pts_ms;")
      .replace("sync.analysis_pts_ms = input.analysis_pts_ms;", "sync.analysis_pts_ms = input.video_frame_pts_ms;")],
    ["build-paired-swap", value => value
      .replace("options.include_source = input.include_source;", "options.include_source = input.include_scenarios;")
      .replace("options.include_scenarios = input.include_scenarios;", "options.include_scenarios = input.include_source;")],
    ["attempt-budget", value => value.replace("attempt < 16", "attempt < 15")],
    ["early-return", value => value.replace("    std::string serialized;",
      "    if (input.max_message_bytes == 0) return {};\n    std::string serialized;")],
    ["events-first-branch", value => value
      .replace("options.max_events = std::max<std::size_t>(1, options.max_events / 2);",
        "options.max_tracks = std::max<std::size_t>(1, options.max_tracks / 2);", 1)],
    ["webrtc-schema", value => value.replace("analysis::kWebRtcVaMetadataSchema",
      "analysis::kVaRuntimeMetadataSchema")],
    ["missing-channel", value => value.replace("frame.channel_id = stream_id;", "frame.channel_id.clear();")],
    ["missing-pts-unit", value => value.replace("frame.pts = video_frame_pts_ns;",
      "frame.pts = video_frame_pts_ns / 1000000LL;")],
    ["canonical-call-owner", value => value.replace("analysis::FilterVaMetadataEvents(events, filter)",
      "analysis::FilterVaMetadataResult(result, filter)")],
  ];
  for (const [name, mutate] of sourceMutations) {
    const mutated = mutate(source);
    assert(mutated !== source, `mutation changed no bytes: ${name}`);
    let rejected = false;
    try { assertCanonicalSource(mutated); } catch { rejected = true; }
    assert(rejected, `source mutation escaped: ${name}`);
  }
  const detail = read(detailPath);
  const server = read("src/ingress/webrtc_http_server.cpp");
  const incidents = read("src/ingress/webrtc_http_server_ops_incidents.cpp");
  const transport = transportPaths.map(read).join("\n");
  let rejected = false;
  try { assertTransportDelegation(`${transport}\nanalysis::BuildVaRuntimeMetadataFrame`, detail); }
  catch { rejected = true; }
  assert(rejected, "transport canonical bypass mutation escaped");
  const transportMutations = [
    ["query-filter-paired-swap", server, value => value
      .replace('&filter.event_types);', '&filter.__swap__);')
      .replace('&filter.rule_ids);', '&filter.event_types);')
      .replace('&filter.__swap__);', '&filter.rule_ids);')],
    ["build-option-paired-swap", server, value => value
      .replace("options.max_tracks = stream_options.max_tracks;", "options.max_tracks = stream_options.max_events;")
      .replace("options.max_events = stream_options.max_events;", "options.max_events = stream_options.max_tracks;")],
    ["sync-paired-swap", incidents, value => value
      .replace("sync.video_frame_pts_ms = PtsNsToMs(video_frame_pts_ns);",
        "sync.video_frame_pts_ms = PtsNsToMs(analysis_pts_ns);")
      .replace("sync.analysis_pts_ms = PtsNsToMs(analysis_pts_ns);",
        "sync.analysis_pts_ms = PtsNsToMs(video_frame_pts_ns);")],
  ];
  for (const [name, original, mutate] of transportMutations) {
    const mutated = mutate(original);
    assert(mutated !== original, `transport mutation changed no bytes: ${name}`);
    let mappingRejected = false;
    try {
      assertTransportMappings(
        original === server ? mutated : server,
        original === incidents ? mutated : incidents);
    } catch { mappingRejected = true; }
    assert(mappingRejected, `transport mapping mutation escaped: ${name}`);
  }
  const orderMutation = incidents.replace(
    "DispatchEventRecordsForApplication(ProjectEventStorageDispatchRequest(\n                    evaluation.annotated_result, evaluation.events));\n                DispatchEventPostsForApplication",
    "DispatchEventPostsForApplication");
  assert(orderMutation !== incidents, "callsite order mutation changed no bytes");
  let orderRejected = false;
  try { assertTransportCallsites(server, orderMutation); } catch { orderRejected = true; }
  assert(orderRejected, "Record/Post/publish order mutation escaped");
});

check("Slice 25 evidence names bounded allocation and exception propagation risks", () => {
  const ledger = JSON.parse(read(executionPath));
  const slice = ledger.currentContinuation?.orderedSlices?.find(item => item.order === 25) ||
    ledger.orderedSlices?.find(item => item.order === 25);
  assert(slice, "Slice 25 execution evidence missing");
  const explanation = [...(slice.contractAssertions || []), ...(slice.observedFollowups || [])].join(" ");
  assert(/(?:allocation|할당)/i.test(explanation) && /(?:exception|예외)/i.test(explanation) &&
    /(?:cop(?:y|ies)|복사)/i.test(explanation) && /(?:propagat|전파)/i.test(explanation) &&
    /(?:9|nine)/i.test(explanation) && /(?:16|sixteen)/i.test(explanation),
  "evidence must explain DTO/filter copy and repeated-allocation risk plus unchanged exception propagation");
});

function assertSuccessorGraph(graph) {
  const classifier = id => graph.moduleClassifiers.find(item => item.id === id);
  const edge = direction => graph.observedModuleEdges.find(item => item.direction === direction);
  assert(graph.expectedProductionFiles === 202 && graph.expectedCppFiles === 99 &&
    classifier("application-service-interfaces")?.expectedFileCount === 35 &&
    classifier("application-service-interfaces")?.expectedCppCount === 15 &&
    edge("transport-and-auth-adapter -> analysis-services")?.witnessCount === 2 &&
    edge("transport-and-auth-adapter -> analysis-services")?.witnessSha256 ===
      "fedb2cae90a73353883d64907bc089eee9b90d14597b88bdf4e68fe9530e65d1" &&
    edge("application-service-interfaces -> analysis-services")?.witnessCount === 17 &&
    edge("application-service-interfaces -> analysis-services")?.witnessSha256 ===
      "c5883366cb8165fd20da8d10e4f6c615e828c07c60269c0c9b1564b2f1af7f84" &&
    edge("transport-and-auth-adapter -> application-service-interfaces")?.witnessCount === 18 &&
    edge("transport-and-auth-adapter -> application-service-interfaces")?.witnessSha256 ===
      "9ecde3f15cc1dc81233e418c2f4778689de3f0c75c9e16d7f064de8545a0e294" &&
    edge("transport-and-auth-adapter -> core-media-interfaces")?.witnessCount === 4 &&
    edge("transport-and-auth-adapter -> core-media-interfaces")?.witnessSha256 ===
      "adf4172d0e83de59df510ceeb38c88cd36aaf78b157e7022b6480d8e0793cab3" &&
    graph.observedModuleEdges.length === 16 &&
    graph.observedModuleEdges.filter(item => !item.allowedByTarget).length === 2 &&
    graph.stronglyConnectedComponents.length === 0 &&
    graph.boundary.includes("Event Storage application boundary"), "Slice 25 graph successor drift");
}

check("CMake dispatch graph and structure gate bind the exact successor", () => {
  assert((read("CMakeLists.txt").match(/src\/ingress\/va_metadata_application_service\.cpp/g) || []).length === 1,
    "CMake source exact-once binding missing");
  assert((read("server.sh").match(/verify-v390-va-metadata-application-boundary/g) || []).length === 3,
    "server.sh help/dispatch exact binding missing");
  const graph = JSON.parse(read("test/fixtures/v390_structure_stabilization_current_graph.json"));
  assertSuccessorGraph(graph);
  const mutated = JSON.parse(JSON.stringify(graph));
  mutated.observedModuleEdges.find(item =>
    item.direction === "transport-and-auth-adapter -> analysis-services").witnessCount = 7;
  let rejected = false;
  try { assertSuccessorGraph(mutated); } catch { rejected = true; }
  assert(rejected, "graph witness mutation escaped");
  const output = execFileSync(path.join(root, "server.sh"),
    ["verify-v390-review4-structure-stabilization-execution"], { cwd: root, encoding: "utf8" });
  assert(output.includes("summary: pass=15 fail=0"), "structure successor gate failed");
});

for (const item of checks) {
  console.log(`- ${item.status}: ${item.name}${item.detail ? ` — ${item.detail}` : ""}`);
}
const failed = checks.filter(item => item.status === "FAIL").length;
console.log(`- summary: pass=${checks.length - failed} fail=${failed}`);
process.exit(failed ? 1 : 0);

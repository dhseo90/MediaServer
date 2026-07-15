#!/usr/bin/env node
// REVIEW4-64 Slice 24/26: detector, tracker, query/profile, and overlay application boundary.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const args = process.argv.slice(2);
if (hasHelpFlag(args)) {
  printUsageAndExit(`V390 analysis frame application boundary verification

Usage:
  ./server.sh verify-v390-analysis-frame-application-boundary
`);
}
assertKnownOptions(args, ["h", "help"]);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const headerPath = "include/ingress/analysis_frame_application_service.h";
const sourcePath = "src/ingress/analysis_frame_application_service.cpp";
const detailPath = "src/ingress/webrtc_http_server_detail.h";
const transportPaths = [
  "include/ingress/http_auth.h", "include/ingress/webrtc_http_runtime_config.h",
  "src/ingress/http_auth.cpp", "include/ingress/webrtc_http_server.h",
  "src/ingress/webrtc_http_server.cpp", "src/ingress/webrtc_http_server_ops_foundation.cpp",
  "src/ingress/webrtc_http_server_ops_workflows.cpp", "src/ingress/webrtc_http_server_ops_incidents.cpp",
  "src/ingress/webrtc_http_server_runtime.cpp", detailPath,
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

function exactCount(text, pattern) {
  return (text.match(pattern) || []).length;
}

function compact(text) {
  return text.replace(/\/\/[^\n]*/g, "").replace(/\s+/g, " ").trim();
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

function swapExact(text, lhs, rhs) {
  assert(text.includes(lhs) && text.includes(rhs), `swap source missing: ${lhs} / ${rhs}`);
  return text.replace(lhs, "__V390_SWAP__").replace(rhs, lhs).replace("__V390_SWAP__", rhs);
}

const concreteSymbols = [
  "CreateDetector", "ObjectTrackerOptions", "ObjectTrackerKind", "ObjectTracker",
  "ParseCloseObjectGuardMode", "CloseObjectGuardModeToString", "CloseObjectGuardMode",
  "RenderDetectionOverlay", "OverlayRenderOptions", "BuildAnalysisProfileFromQuery",
  "ResolveAnalysisProfileForContext", "IsAnalysisOverlayRequested", "AnalysisOverlayConfig",
  "MakeAnalysisOverlayAttachment",
];
const runtimeFields = [
  "iou_weight", "distance_weight", "direction_weight", "class_weight",
  "min_association_score", "smoothing_alpha", "close_object_guard_mode",
  "close_object_distance_ratio", "close_object_overlap_threshold",
  "close_object_low_margin_threshold", "close_object_center_jump_penalty",
  "close_object_min_score_boost", "max_close_object_diagnostics", "max_missed_frames",
];
const trackerMappings = [
  ["iou_weight", "iou_weight"], ["distance_weight", "distance_weight"],
  ["direction_weight", "direction_weight"], ["class_weight", "class_weight"],
  ["min_association_score", "min_association_score"], ["smoothing_alpha", "smoothing_alpha"],
  ["close_object_guard_mode", "close_object_guard_mode"],
  ["close_object_distance_ratio", "close_object_distance_ratio"],
  ["close_object_overlap_threshold", "close_object_overlap_threshold"],
  ["close_object_low_margin_threshold", "close_object_low_margin_threshold"],
  ["close_object_center_jump_penalty", "close_object_center_jump_penalty"],
  ["close_object_min_score_boost", "close_object_min_score_boost"],
  ["max_close_object_diagnostics", "max_close_object_diagnostics"],
  ["max_missed_frames", "max_missed_frames"],
];
const transportRuntimeFields = [
  "analysis_tracking_iou_weight", "analysis_tracking_distance_weight",
  "analysis_tracking_direction_weight", "analysis_tracking_class_weight",
  "analysis_tracking_min_association_score", "analysis_tracking_smoothing_alpha",
  "analysis_tracking_close_object_guard_mode", "analysis_tracking_close_object_distance_ratio",
  "analysis_tracking_close_object_overlap_threshold", "analysis_tracking_close_object_low_margin_threshold",
  "analysis_tracking_center_jump_penalty", "analysis_tracking_close_object_min_score_boost",
  "analysis_tracking_close_object_max_diagnostics", "analysis_tracking_lost_buffer_frames",
];

function trackerMappingsAreExact(text) {
  const body = functionBody(text, "TrackStaticImageForApplication");
  return trackerMappings.every(([target, source]) => exactCount(body, target === "close_object_guard_mode"
    ? new RegExp(`tracker_options\\.${target}\\s*=\\s*analysis::ParseCloseObjectGuardMode\\(runtime_config\\.${source}\\)\\s*;`, "g")
    : new RegExp(`tracker_options\\.${target}\\s*=\\s*runtime_config\\.${source}\\s*;`, "g")) === 1) &&
    runtimeFields.every(field => exactCount(body, new RegExp(`runtime_config\\.${field}\\b`, "g")) === 1);
}

function transportRuntimeProjectionIsExact(text) {
  const match = text.match(/const AnalysisTrackingApplicationRuntimeConfig tracker_config\s*\{([\s\S]*?)\n\s*\};/);
  if (!match) return false;
  const expected = `
    config.analysis_tracking_iou_weight,
    config.analysis_tracking_distance_weight,
    config.analysis_tracking_direction_weight,
    config.analysis_tracking_class_weight,
    config.analysis_tracking_min_association_score,
    config.analysis_tracking_smoothing_alpha,
    config.analysis_tracking_close_object_guard_mode,
    config.analysis_tracking_close_object_distance_ratio,
    config.analysis_tracking_close_object_overlap_threshold,
    config.analysis_tracking_close_object_low_margin_threshold,
    config.analysis_tracking_center_jump_penalty,
    config.analysis_tracking_close_object_min_score_boost,
    config.analysis_tracking_close_object_max_diagnostics,
    static_cast<std::uint32_t>(config.analysis_tracking_lost_buffer_frames),`;
  return compact(match[1]) === compact(expected) &&
    transportRuntimeFields.every(field => exactCount(match[1], new RegExp(`config\\.${field}\\b`, "g")) === 1);
}

function frameApplicationSemanticMismatches(text) {
  const expected = new Map([
    ["AnalyzeFrameForApplication", `
      auto detector = analysis::CreateDetector(profile);
      if (detector == nullptr) {
        if (error_message != nullptr) { *error_message = "failed to create image detector"; }
        return false;
      }
      if (!detector->Start(error_message)) { return false; }
      const auto started_at = std::chrono::steady_clock::now();
      const bool analyzed = detector->Analyze(frame, result, error_message);
      if (analysis_ms != nullptr) {
        *analysis_ms = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - started_at).count();
      }
      detector->Stop();
      return analyzed;`],
    ["ProjectCloseObjectGuardForApplication", `
      const auto mode = analysis::ParseCloseObjectGuardMode(configured_mode);
      CloseObjectGuardApplicationProjection projection;
      projection.mode = analysis::CloseObjectGuardModeToString(mode);
      projection.label = "guard off";
      if (mode == analysis::CloseObjectGuardMode::Diagnostic) {
        projection.label = "diagnostic-only · score 변경 없음";
      } else if (mode == analysis::CloseObjectGuardMode::Enforce) {
        projection.label = "score 보정 적용 중";
      }
      projection.score_mutation_enabled = mode == analysis::CloseObjectGuardMode::Enforce;
      return projection;`],
    ["RenderDetectionOverlayForApplication", `
      return analysis::RenderDetectionOverlay(
        frame, result, BuildOverlayRenderOptionsFromQuery(query), output, error_message);`],
    ["AnalysisOverlayDebugRequestedForApplication", `
      return BuildOverlayRenderOptionsFromQuery(query).draw_debug_overlay;`],
    ["BuildAnalysisProfileForApplication", `
      return BuildAnalysisProfileFromQuery(query);`],
    ["ResolveAnalysisProfileForApplication", `
      return ResolveAnalysisProfileForContext(std::move(profile), context);`],
    ["IsAnalysisOverlayRequestedForApplication", `
      return IsAnalysisOverlayRequested(query);`],
    ["ResolveAnalysisOverlaySettingsForApplication", `
      const auto timing_options = BuildAnalysisOverlayTimingOptionsFromQuery(query);
      AnalysisOverlayApplicationSettings output;
      output.render_video_overlay = render_video_overlay;
      output.draw_debug_overlay = BuildOverlayRenderOptionsFromQuery(query).draw_debug_overlay;
      output.sync_tolerance_ns =
        static_cast<std::int64_t>(timing_options.sync_tolerance_ms) * 1000000LL;
      output.wait_timeout_ms = timing_options.wait_timeout_ms;
      return output;`],
    ["MakeAnalysisOverlayAttachmentForApplication", `
      const auto settings = ResolveAnalysisOverlaySettingsForApplication(query, render_video_overlay);
      AnalysisOverlayConfig config;
      config.enabled = true;
      config.render_video_overlay = settings.render_video_overlay;
      config.render_options = BuildOverlayRenderOptionsFromQuery(query);
      config.sync_tolerance_ns = settings.sync_tolerance_ns;
      config.wait_timeout_ms = settings.wait_timeout_ms;
      if (result_provider) {
        config.result_provider =
          [result_provider = std::move(result_provider)](std::int64_t frame_pts)
            -> std::optional<analysis::AnalysisResult> {
            analysis::AnalysisResult result;
            if (!result_provider(frame_pts, &result)) { return std::nullopt; }
            return result;
          };
      }
      return MakeAnalysisOverlayAttachment(std::move(config));`],
  ]);
  return [...expected]
    .filter(([name, body]) => compact(functionBody(text, name)) !== compact(body))
    .map(([name]) => name);
}

function frameApplicationSemanticsAreExact(text) {
  return frameApplicationSemanticMismatches(text).length === 0;
}

const exactTransportDelegations = [
  "AnalyzeFrameForApplication( output->profile, output->frame, &output->result, &output->analysis_ms, error_message)",
  "TrackStaticImageForApplication(output->profile, tracker_config, &output->result)",
  "ProjectCloseObjectGuardForApplication(config.analysis_tracking_close_object_guard_mode)",
  "RenderDetectionOverlayForApplication( image_analysis.frame, image_analysis.result, query, &overlay_frame, &error_message)",
  "AnalysisOverlayDebugRequestedForApplication(query)",
  "RenderDetectionOverlayForApplication( latest->frame, evaluation.annotated_result, query, &overlay_frame, &error_message)",
  "ResolveAnalysisOverlaySettingsForApplication( query, render_video_overlay)",
  "MakeAnalysisOverlayAttachmentForApplication( query, render_video_overlay, std::move(result_provider))",
].map(compact);

function transportDelegationsAreExact(text) {
  return exactTransportDelegations.every(expected => text.includes(expected));
}

function overlayTransportSemanticsAreExact(text) {
  const body = functionBody(text, "AttachWebRtcAnalysisOverlay");
  const normalized = compact(body);
  const required = [
    'IsAnalysisOverlayRequestedForApplication(query)',
    'AttachAnalysisTap(analysis_request, BuildAnalysisProfileForApplication(query))',
    'ParseBoolQuery(query, "renderVideoOverlay", ParseBoolQuery(query, "videoOverlay", true))',
    'ResolveAnalysisOverlaySettingsForApplication( query, render_video_overlay)',
    'overlay_settings.render_video_overlay || ParseBoolQuery(query, "clientOverlayFallback", ParseBoolQuery(query, "vaMetadataDrawFallback", false))',
    'if (output == nullptr) { return false; }',
    'WaitAnalysisResultNearPts( tap_id, source_pts, tolerance_ns, std::chrono::milliseconds(wait_timeout_ms))',
    'analysis::DispatchEventRecords(evaluation.annotated_result, evaluation.events)',
    'DispatchEventPostsForApplication(ProjectEventPostDispatchRequest( evaluation.annotated_result, evaluation.events))',
    'bridge_lock->PublishAnalysisMetadata(',
    '*output = evaluation.annotated_result; return true;',
    'const auto snapshot = analysis_sessions.AnalysisTapSnapshot(tap_id)',
    'if (!snapshot.has_value() || !snapshot->latest_result.has_value())',
    'WebRtcVaMetadataMissingMessageJson(tap_id, source_pts, tolerance_ns)',
    'return false;',
    'if (metadata_fallback_payload_enabled)',
    '"fallback-latest"',
    'MakeAnalysisOverlayAttachmentForApplication( query, render_video_overlay, std::move(result_provider))',
  ].map(compact);
  if (!required.every(item => normalized.includes(item))) return false;
  if (exactCount(body, /\*output\s*=\s*evaluation\.annotated_result\s*;/g) !== 2) return false;
  if (exactCount(body, /analysis::DispatchEventRecords\(/g) !== 2 ||
      exactCount(body, /DispatchEventPostsForApplication\(/g) !== 2) return false;
  const ordered = [
    "WaitAnalysisResultNearPts", "if (result.has_value())", "analysis::DispatchEventRecords",
    "DispatchEventPostsForApplication", "bridge_lock->PublishAnalysisMetadata", "*output =",
    "AnalysisTapSnapshot", "if (!snapshot.has_value()", "WebRtcVaMetadataMissingMessageJson",
    "return false;", "EvaluateStoredEventRules(latest_result", "analysis::DispatchEventRecords",
    "DispatchEventPostsForApplication", "if (metadata_fallback_payload_enabled)", "*output =",
    "MakeAnalysisOverlayAttachmentForApplication",
  ];
  let cursor = 0;
  for (const token of ordered) {
    const index = body.indexOf(token, cursor);
    if (index < 0) return false;
    cursor = index + token.length;
  }
  return true;
}

check("application contract is a standalone dependency-neutral forward contract", () => {
  const header = read(headerPath);
  const includes = [...header.matchAll(/^\s*#\s*include\s*([<"][^>"]+[>"])/gm)].map(match => match[1]);
  assert(JSON.stringify(includes) === JSON.stringify([
    "<cstddef>", "<cstdint>", "<functional>", "<string>", "<unordered_map>",
  ]), "application header include set drift");
  assert(!/^\s*#\s*include\s*"/m.test(header) &&
    !/\b(?:core|domain|media)::/.test(header), "implementation dependency leaked into contract");
  for (const name of ["AnalysisContext", "AnalysisProfile", "AnalysisResult", "RawVideoFrame"]) {
    assert(exactCount(header, new RegExp(`struct\\s+${name}\\s*;`, "g")) === 1,
      `analysis forward contract drift: ${name}`);
  }
  assert(compact(header).includes(compact(`
    struct AnalysisOverlayApplicationSettings {
      bool render_video_overlay{true};
      bool draw_debug_overlay{false};
      std::int64_t sync_tolerance_ns{0};
      int wait_timeout_ms{0};
    };`)), "overlay settings contract drift");
  assert(compact(header).includes(compact(
    "using AnalysisResultProviderForApplication = std::function<bool(std::int64_t, analysis::AnalysisResult*)>;")) &&
    compact(header).includes(compact(
      "using AnalysisPipelineAttachmentForApplication = std::function<bool(void*, std::string*)>;")),
  "application callback alias signature drift");
  for (const field of runtimeFields) {
    assert(exactCount(header, new RegExp(`\\b${field}\\b`, "g")) === 1,
      `runtime field contract drift: ${field}`);
  }
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "v390-analysis-frame-header-"));
  try {
    const harness = path.join(temp, "header.cpp");
    fs.writeFileSync(harness, '#include "ingress/analysis_frame_application_service.h"\nint main(){return 0;}\n');
    execFileSync(process.env.CXX || "c++", ["-std=c++17", `-I${path.join(root, "include")}`, "-fsyntax-only", harness]);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

check("application source alone owns concrete detector tracker and overlay execution", () => {
  const source = read(sourcePath);
  const transport = transportPaths.map(read).join("\n");
  for (const include of ["detector", "object_tracker", "overlay_renderer"]) {
    assert(source.includes(`#include "analysis/${include}.h"`), `application owner include missing: ${include}`);
    assert(!read(detailPath).includes(`#include "analysis/${include}.h"`), `transport include remains: ${include}`);
  }
  for (const symbol of concreteSymbols) {
    assert(source.includes(symbol), `application concrete owner drift: ${symbol}`);
    assert(!new RegExp(`analysis::${symbol}\\b`).test(transport), `transport concrete bypass remains: ${symbol}`);
  }
  assert(frameApplicationSemanticsAreExact(source),
    `frame detector/overlay semantic source drift: ${frameApplicationSemanticMismatches(source).join(",")}`);
  const mutations = [
    ["detector timing", source.replace(
      "std::chrono::steady_clock::now() - started_at).count();", "0.0;")],
    ["close projection", source.replace(
      "projection.mode = analysis::CloseObjectGuardModeToString(mode);", "projection.mode = configured_mode;")],
    ["overlay query", source.replace(
      "frame, result, BuildOverlayRenderOptionsFromQuery(query), output, error_message);",
      "frame, result, analysis::OverlayRenderOptions{}, output, error_message);" )],
    ["overlay debug", source.replace(
      "return BuildOverlayRenderOptionsFromQuery(query).draw_debug_overlay;", "return false;")],
    ["overlay timing", swapExact(source,
      "timing_options.sync_tolerance_ms", "timing_options.wait_timeout_ms")],
    ["profile query", source.replace(
      "return BuildAnalysisProfileFromQuery(query);", "return analysis::AnalysisProfile{};")],
    ["profile context", source.replace(
      "return ResolveAnalysisProfileForContext(std::move(profile), context);", "return profile;")],
    ["overlay request", source.replace(
      "return IsAnalysisOverlayRequested(query);", "return true;")],
    ["overlay render", source.replace(
      "config.render_options = BuildOverlayRenderOptionsFromQuery(query);",
      "config.render_options = analysis::OverlayRenderOptions{};")],
    ["provider result", source.replace(
      "return result;\n            };", "return std::nullopt;\n            };")],
    ["empty provider fail-closed", source.replace(
      "if (result_provider) {", "if (true) {")],
  ];
  for (const [name, mutation] of mutations) {
    assert(mutation !== source && !frameApplicationSemanticsAreExact(mutation),
      `${name} mutation was not rejected`);
  }
});

check("tracker runtime and close-object projection mappings are exact", () => {
  const source = read(sourcePath);
  assert(trackerMappingsAreExact(source), "tracker runtime mapping drift");
  for (const kind of ["kalman-lite", "bytetrack", "KalmanLite", "ByteTrack", "Lite"]) {
    assert(source.includes(kind), `tracker kind mapping drift: ${kind}`);
  }
  assert(source.includes("tracker_options.class_labels = profile.tracking_class_labels") &&
    source.includes("tracker_options.track_all_when_class_labels_empty = !profile.tracking_classes_specified") &&
    source.includes("analysis::ObjectTracker tracker(tracker_options)") && source.includes("tracker.Update(result)"),
  "tracker class/update mapping drift");
  assert(source.includes('projection.label = "guard off"') &&
    source.includes('projection.label = "diagnostic-only · score 변경 없음"') &&
    source.includes('projection.label = "score 보정 적용 중"') &&
    source.includes("projection.score_mutation_enabled = mode == analysis::CloseObjectGuardMode::Enforce"),
  "close-object projection drift");
  const swapped = swapExact(source,
    "runtime_config.iou_weight", "runtime_config.distance_weight");
  assert(!trackerMappingsAreExact(swapped), "tracker paired field swap mutation was not rejected");
});

check("transport delegates exact frame tracker and overlay call sites", () => {
  const server = read("src/ingress/webrtc_http_server.cpp");
  const runtime = read("src/ingress/webrtc_http_server_runtime.cpp");
  const incidents = read("src/ingress/webrtc_http_server_ops_incidents.cpp");
  assert(exactCount(server, /AnalyzeFrameForApplication\(/g) === 1 &&
    exactCount(server, /TrackStaticImageForApplication\(/g) === 1 &&
    exactCount(server, /ProjectCloseObjectGuardForApplication\(/g) === 1,
  "server application delegation count drift");
  assert(exactCount(runtime, /RenderDetectionOverlayForApplication\(/g) === 2 &&
    exactCount(runtime, /AnalysisOverlayDebugRequestedForApplication\(/g) === 1,
  "runtime overlay delegation count drift");
  assert(exactCount(incidents, /ResolveAnalysisOverlaySettingsForApplication\(/g) === 1 &&
    exactCount(incidents, /MakeAnalysisOverlayAttachmentForApplication\(/g) === 1 &&
    exactCount(incidents, /IsAnalysisOverlayRequestedForApplication\(/g) === 1 &&
    exactCount(incidents, /BuildAnalysisProfileForApplication\(/g) === 1,
    "live overlay application delegation count drift");
  assert(exactCount(server, /BuildAnalysisProfileForApplication\(/g) === 1 &&
    exactCount(server, /ResolveAnalysisProfileForApplication\(/g) === 1 &&
    exactCount(runtime, /BuildAnalysisProfileForApplication\(/g) === 3,
  "profile application delegation count drift");
  const transport = transportPaths.map(read).join("\n");
  for (const symbol of [
    "BuildAnalysisProfileFromQuery", "ResolveAnalysisProfileForContext",
    "IsAnalysisOverlayRequested", "AnalysisOverlayConfig", "MakeAnalysisOverlayAttachment",
  ]) {
    assert(!new RegExp(`\\b${symbol}\\b`).test(transport), `transport canonical bypass remains: ${symbol}`);
  }
  assert(transportRuntimeProjectionIsExact(server), "transport tracker runtime projection drift");
  const swappedProjection = swapExact(server,
    "config.analysis_tracking_iou_weight", "config.analysis_tracking_distance_weight");
  assert(!transportRuntimeProjectionIsExact(swappedProjection),
    "transport paired field swap mutation was not rejected");
  const transportSemantics = compact(`${server}\n${runtime}\n${incidents}`);
  assert(transportDelegationsAreExact(transportSemantics), "transport semantic delegation drift");
  const queryMutation = transportSemantics.replace(
    compact("AnalysisOverlayDebugRequestedForApplication(query)"),
    compact("AnalysisOverlayDebugRequestedForApplication({})"));
  assert(queryMutation !== transportSemantics && !transportDelegationsAreExact(queryMutation),
  "transport overlay query mutation was not rejected");
  assert(overlayTransportSemanticsAreExact(incidents), "transport overlay provider semantic drift");
  const providerMutations = [
    incidents.replace("if (output == nullptr)", "if (false)"),
    incidents.replace("*output = evaluation.annotated_result;", "/* output omitted */"),
    incidents.replace(
      "return false;\n            }\n            auto latest_result", "return true;\n            }\n            auto latest_result"),
    swapExact(incidents, "WaitAnalysisResultNearPts", "AnalysisTapSnapshot"),
    swapExact(incidents, "analysis::DispatchEventRecords", "DispatchEventPostsForApplication"),
    incidents.replace("if (metadata_fallback_payload_enabled)", "if (true)"),
  ];
  for (const mutation of providerMutations) {
    assert(mutation !== incidents && !overlayTransportSemanticsAreExact(mutation),
      "transport overlay provider mutation was not rejected");
  }
});

check("CMake dispatch and successor graph bind the exact Slice 24 boundary", () => {
  const cmake = read("CMakeLists.txt");
  assert(exactCount(cmake, /src\/ingress\/analysis_frame_application_service\.cpp/g) === 1,
    "CMake source count drift");
  assert(exactCount(read("server.sh"), /verify-v390-analysis-frame-application-boundary/g) === 3,
    "dispatch count drift");
  const graph = JSON.parse(read("test/fixtures/v390_structure_stabilization_current_graph.json"));
  const classifier = id => graph.moduleClassifiers.find(item => item.id === id);
  const edge = direction => graph.observedModuleEdges.find(item => item.direction === direction);
  assert(graph.expectedProductionFiles === 198 && graph.expectedCppFiles === 97 &&
    classifier("application-service-interfaces")?.expectedFileCount === 31 &&
    classifier("application-service-interfaces")?.expectedCppCount === 13 &&
    edge("transport-and-auth-adapter -> analysis-services")?.witnessCount === 4 &&
    edge("transport-and-auth-adapter -> analysis-services")?.witnessSha256 ===
      "fe6019ef42f01914f342d19e884c0f3431eaa0e892a222793826d0ae776f5979" &&
    edge("application-service-interfaces -> analysis-services")?.witnessCount === 15 &&
    edge("transport-and-auth-adapter -> application-service-interfaces")?.witnessCount === 16 &&
    edge("transport-and-auth-adapter -> core-media-interfaces")?.witnessCount === 4 &&
    edge("transport-and-auth-adapter -> core-media-interfaces")?.witnessSha256 ===
      "adf4172d0e83de59df510ceeb38c88cd36aaf78b157e7022b6480d8e0793cab3" &&
    graph.observedModuleEdges.filter(item => !item.allowedByTarget).length === 2 &&
    !graph.stronglyConnectedComponents.length &&
    graph.boundary.includes("analysis query and overlay application boundary"), "graph successor drift");
});

check("current structure gate accepts the exact non-final successor", () => {
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

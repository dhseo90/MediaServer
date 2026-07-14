#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
import { copyWebRtcHttpServerSourceFixture } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: REVIEW4-64 core-media→analysis 10개 witness를 port/callback 주입으로 역전했는지 검증한다.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(scriptPath), "../..");
const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`V390 REVIEW4-64 core media analysis port inversion

Usage:
  ./server.sh verify-v390-core-media-analysis-port-inversion

Checks:
  - SessionManager와 RTSP/WebRTC egress/GStreamer server의 10개 analysis include witness 제거
  - AnalysisSessionService의 tap/runtime owner 및 generic auxiliary stream provider
  - analysis-neutral MediaAnalysisPort와 generic pipeline attachment
  - composition root의 동일 service 주입과 RTSP failure/unprepared detach 경계
  - Policy v1 graph 14 violations/SCC 0 및 mutation fail-closed
`);
}
assertKnownOptions(rawArgs, ["h", "help", "fixture-root", "skip-mutations"]);

const skipMutations = rawArgs.includes("--skip-mutations");
const fixtureRootArg = rawArgs.find(arg => arg.startsWith("--fixture-root="))
  ?.slice("--fixture-root=".length);
const sourceRoot = fixtureRootArg ? validateFixtureRoot(fixtureRootArg) : rootDir;

const checks = [];
const read = file => fs.readFileSync(path.join(sourceRoot, file), "utf8");
const exists = file => fs.existsSync(path.join(sourceRoot, file));
const count = (text, pattern) => [...text.matchAll(pattern)].length;
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const check = (name, fn) => {
  try {
    fn();
    checks.push({ name, status: "PASS" });
  } catch (error) {
    checks.push({ name, status: "FAIL", detail: error.message });
  }
};

function validateFixtureRoot(value) {
  if (!skipMutations) throw new Error("--fixture-root requires --skip-mutations");
  const resolved = fs.realpathSync(path.resolve(value));
  const systemTemp = `${fs.realpathSync(os.tmpdir())}${path.sep}`;
  if (!resolved.startsWith(systemTemp)) {
    throw new Error("fixture root must stay under the system temp directory");
  }
  return resolved;
}

function sliceBetween(text, start, end, label) {
  const begin = text.indexOf(start);
  assert(begin >= 0, `${label}: start marker missing: ${start}`);
  const finish = text.indexOf(end, begin + start.length);
  assert(finish >= 0, `${label}: end marker missing: ${end}`);
  return text.slice(begin, finish);
}

function assertOrdered(text, label, anchors) {
  let cursor = -1;
  for (const anchor of anchors) {
    const next = text.indexOf(anchor, cursor + 1);
    assert(next >= 0, `${label}: missing ${anchor}`);
    assert(next > cursor, `${label}: order drift at ${anchor}`);
    cursor = next;
  }
}

function occurrences(text, needle) {
  const indexes = [];
  for (let index = text.indexOf(needle); index >= 0;
       index = text.indexOf(needle, index + needle.length)) indexes.push(index);
  return indexes;
}

function replaceExactly(text, before, after, label) {
  const indexes = occurrences(text, before);
  assert(indexes.length === 1, `${label}: expected one mutation anchor, got ${indexes.length}`);
  return text.replace(before, after);
}

const witnessFiles = [
  "include/core/session_manager.h",
  "src/core/session_manager.cpp",
  "include/ingress/rtsp_egress_session.h",
  "src/ingress/rtsp_egress_session.cpp",
  "include/ingress/webrtc_egress_session.h",
  "src/ingress/webrtc_egress_session.cpp",
  "src/ingress/gstreamer_rtsp_server.cpp",
];

check("all ten core-media analysis/application include witnesses are removed", () => {
  const sessionHeader = read("include/core/session_manager.h");
  const sessionSource = read("src/core/session_manager.cpp");
  const rtspHeader = read("include/ingress/rtsp_egress_session.h");
  const rtspSource = read("src/ingress/rtsp_egress_session.cpp");
  const webrtcHeader = read("include/ingress/webrtc_egress_session.h");
  const webrtcSource = read("src/ingress/webrtc_egress_session.cpp");
  const rtspServer = read("src/ingress/gstreamer_rtsp_server.cpp");
  assert(!sessionHeader.includes("analysis/analysis_manager.h") &&
    !sessionSource.includes("analysis/analysis_query.h"), "SessionManager retains analysis include ownership");
  for (const [label, text] of [["rtsp header", rtspHeader], ["rtsp source", rtspSource],
    ["webrtc header", webrtcHeader], ["webrtc source", webrtcSource]]) {
    assert(!text.includes("analysis_overlay_probe.h"), `${label} retains analysis overlay include`);
  }
  for (const include of [
    "analysis/event_post_dispatcher.h",
    "analysis/event_rule_engine.h",
    "analysis/event_storage.h",
    "analysis/analysis_query.h",
  ]) assert(!rtspServer.includes(include), `GStreamer RTSP retains analysis include: ${include}`);
});

check("AnalysisSessionService owns taps and SessionManager exposes only generic auxiliary streams", () => {
  assert(exists("include/analysis/analysis_session_service.h") &&
    exists("src/analysis/analysis_session_service.cpp"), "analysis session service owner files are missing");
  const serviceHeader = read("include/analysis/analysis_session_service.h");
  const serviceSource = read("src/analysis/analysis_session_service.cpp");
  const sessionHeader = read("include/core/session_manager.h");
  const sessionSource = read("src/core/session_manager.cpp");
  for (const anchor of [
    "AnalysisManager analysis_manager_",
    "AttachAnalysisTap(",
    "DetachAnalysisTapRef(",
    "AnalysisTapSnapshots()",
    "WaitAnalysisResultNearPts(",
    "AnalysisLatestFrameAndResult(",
    "AuxiliaryStreamRuntimeSnapshot() const",
  ]) assert(serviceHeader.includes(anchor) || serviceSource.includes(anchor), `service owner anchor missing: ${anchor}`);
  for (const forbidden of ["AnalysisManager", "AnalysisTapEntry", "AttachAnalysisTap(", "AnalysisTapSnapshot("])
    assert(!sessionHeader.includes(forbidden) && !sessionSource.includes(forbidden),
      `SessionManager retains analysis owner symbol: ${forbidden}`);
  for (const anchor of [
    "AuxiliaryStreamHandle",
    "AcquireAuxiliaryStream(",
    "StartAuxiliaryStream(",
    "ReleaseAuxiliaryStreamWhenIdle(",
    "SetAuxiliaryStreamRuntimeProvider(",
  ]) assert(sessionHeader.includes(anchor), `generic auxiliary stream contract missing: ${anchor}`);
});

check("concurrent attach, auxiliary lease, shutdown drain, and provider close stay transactional", () => {
  const serviceHeader = read("include/analysis/analysis_session_service.h");
  const serviceSource = read("src/analysis/analysis_session_service.cpp");
  const sessionHeader = read("include/core/session_manager.h");
  const sessionSource = read("src/core/session_manager.cpp");
  const registryHeader = read("include/core/stream_registry.h");
  const registrySource = read("src/core/stream_registry.cpp");

  for (const anchor of ["std::mutex attach_mu_", "bool closing_{false}", "DrainAnalysisTaps()"])
    assert(serviceHeader.includes(anchor), `analysis shutdown/attach guard missing: ${anchor}`);
  const destructor = sliceBetween(serviceSource, "AnalysisSessionService::~AnalysisSessionService()",
    "void AnalysisSessionService::DrainAnalysisTaps()", "analysis service destructor");
  assertOrdered(destructor, "analysis service shutdown", [
    "closing_ = true", "SetAuxiliaryStreamRuntimeProvider({})", "std::lock_guard attach_lock(attach_mu_)",
    "DrainAnalysisTaps()",
  ]);
  const drain = sliceBetween(serviceSource, "void AnalysisSessionService::DrainAnalysisTaps()",
    "AnalysisSessionService::AnalysisTapResult", "analysis service drain");
  assert(drain.includes("for (std::size_t ref = 0; ref < entry.ref_count; ++ref)") &&
    drain.includes("ReleaseAuxiliaryStreamWhenIdle(entry.stream_handle)"),
  "shutdown drain does not return one registry lease per tap reference");
  const attach = sliceBetween(serviceSource, "AnalysisSessionService::AnalysisTapResult AnalysisSessionService::AttachAnalysisTap(",
    "AnalysisSessionService::AnalysisTapDetachResult", "analysis attach");
  assertOrdered(attach, "analysis attach transaction", [
    "std::lock_guard attach_lock(attach_mu_)", "if (closing_)", "AcquireAuxiliaryStream(request)",
    "analysis_max_active_taps_per_source", "analysis_manager_.AttachStream(", "analysis_taps_[attach_result.tap_id]",
  ]);
  const detach = sliceBetween(serviceSource,
    "AnalysisSessionService::AnalysisTapDetachResult AnalysisSessionService::DetachAnalysisTapRef(",
    "bool AnalysisSessionService::DetachAnalysisTap(", "analysis detach");
  assert(detach.includes("std::lock_guard attach_lock(attach_mu_)"),
    "analysis detach can race the attach limit/ref-count transaction");
  const reusedDetach = sliceBetween(detach, "if (!detach_result.removed)",
    "analysis_taps_.erase(tap_id)", "reused analysis detach");
  assert(reusedDetach.includes("ReleaseAuxiliaryStreamWhenIdle(entry.stream_handle)"),
    "reused tap detach does not return its registry lease");

  for (const anchor of ["Acquire(", "ReleaseLeaseAndTryRemoveIfIdle(", "ReleaseLease(",
    "outstanding_leases_"])
    assert(registryHeader.includes(anchor) || registrySource.includes(anchor),
      `registry acquisition lease contract missing: ${anchor}`);
  const registryAcquire = sliceBetween(registrySource,
    "StreamRegistry::AcquireResult StreamRegistry::Acquire(",
    "bool StreamRegistry::ReleaseLease(", "registry acquire lease");
  assert(registryAcquire.includes("++outstanding_leases_[key]") &&
    registryAcquire.includes("outstanding_leases_[key] = 1"),
  "registry acquire does not lease both existing and newly created streams");
  const registryCleanup = sliceBetween(registrySource, "bool StreamRegistry::TryRemoveIfIdle(",
    "std::size_t StreamRegistry::ActiveStreamCount()", "registry idle cleanup");
  assert(registryCleanup.includes("outstanding_leases_"),
    "ordinary idle cleanup ignores in-flight auxiliary leases");
  assert(sessionSource.includes("registry_.Acquire(key, *source_spec)") &&
    sessionSource.includes("registry_.ReleaseLeaseAndTryRemoveIfIdle(handle.stream_key)"),
  "SessionManager does not release every auxiliary handle through the registry lease");
  const auxiliaryRelease = sliceBetween(sessionSource,
    "void SessionManager::ReleaseAuxiliaryStreamWhenIdle(",
    "void SessionManager::SetAuxiliaryStreamRuntimeProvider(", "auxiliary stream release");
  assert(auxiliaryRelease.includes(
    "if (registry_.ReleaseLease(handle.stream_key)) {\n        ScheduleIdleCleanup(handle.stream_key);\n    }"),
  "file-source cleanup is not coalesced at the final registry lease");

  for (const anchor of ["std::condition_variable auxiliary_stream_runtime_provider_cv_",
    "auxiliary_stream_runtime_provider_calls_", "auxiliary_stream_runtime_provider_closing_"])
    assert(sessionHeader.includes(anchor), `provider close/wait state missing: ${anchor}`);
  assert(sessionHeader.includes("std::mutex stream_acquire_mu_"),
    "media and auxiliary stream creation/admission are not one transaction");
  assert(!registryHeader.includes("AcquireLeased(") && !registrySource.includes("AcquireLeased(") &&
    count(sessionSource, /registry_\.Acquire\(key, \*source_spec\)/g) === 2,
  "every registry acquire is not the same scoped-lease contract");
  const mediaCreate = sliceBetween(sessionSource,
    "SessionManager::CreateResult SessionManager::CreateSession(",
    "bool SessionManager::CloseSession(", "media session create");
  assertOrdered(mediaCreate, "media acquire/admission transaction", [
    "std::lock_guard acquire_lock(stream_acquire_mu_)", "registry_.Acquire(key, *source_spec)",
    "resource_guard_.AdmitStream()", "AddSubscriber(", "registry_.ReleaseLease(key)",
  ]);
  const auxiliaryAcquire = sliceBetween(sessionSource,
    "SessionManager::AuxiliaryStreamHandle SessionManager::AcquireAuxiliaryStream(",
    "bool SessionManager::StartAuxiliaryStream(", "auxiliary stream acquire");
  assertOrdered(auxiliaryAcquire, "auxiliary acquire/admission transaction", [
    "std::lock_guard acquire_lock(stream_acquire_mu_)", "registry_.Acquire(key, *source_spec)",
    "resource_guard_.AdmitStream()",
  ]);
  const providerSet = sliceBetween(sessionSource, "void SessionManager::SetAuxiliaryStreamRuntimeProvider(",
    "SessionManager::AuxiliaryStreamRuntimeSnapshot SessionManager::AuxiliaryRuntimeSnapshot() const",
    "provider close");
  assertOrdered(providerSet, "provider close", [
    "auxiliary_stream_runtime_provider_closing_ = true", "auxiliary_stream_runtime_provider_ = {}",
    "auxiliary_stream_runtime_provider_cv_.wait(", "auxiliary_stream_runtime_provider_calls_ == 0",
  ]);
  const providerCall = sliceBetween(sessionSource,
    "SessionManager::AuxiliaryStreamRuntimeSnapshot SessionManager::AuxiliaryRuntimeSnapshot() const",
    "void SessionManager::ScheduleIdleCleanup", "provider callback lease");
  assertOrdered(providerCall, "provider callback lease", [
    "++auxiliary_stream_runtime_provider_calls_", "provider()", "--auxiliary_stream_runtime_provider_calls_",
    "auxiliary_stream_runtime_provider_cv_.notify_all()",
  ]);
});

check("media port and egress attachment stay analysis-neutral", () => {
  assert(exists("include/core/media_analysis_port.h"), "core media analysis port is missing");
  const port = read("include/core/media_analysis_port.h");
  for (const forbidden of ["analysis::", "analysis/", "ingress::", "ingress/"])
    assert(!port.includes(forbidden), `core media port exposes outer owner: ${forbidden}`);
  for (const anchor of ["MediaPipelineAttachment", "RtspAnalysisBinding", "class MediaAnalysisPort",
    "PrepareRtsp(", "DetachRtsp("])
    assert(port.includes(anchor), `core media port anchor missing: ${anchor}`);
  for (const file of ["include/ingress/rtsp_egress_session.h", "include/ingress/webrtc_egress_session.h"]) {
    const text = read(file);
    assert(text.includes("SetPipelineAttachment(core::MediaPipelineAttachment") &&
      text.includes("core::MediaPipelineAttachment pipeline_attachment_") &&
      !text.includes("AnalysisOverlayConfig"), `egress generic attachment drift: ${file}`);
  }
  const probeHeader = read("include/ingress/analysis_overlay_probe.h");
  const probeSource = read("src/ingress/analysis_overlay_probe.cpp");
  assert(probeHeader.includes("core::MediaPipelineAttachment MakeAnalysisOverlayAttachment(") &&
    probeSource.includes("core::MediaPipelineAttachment MakeAnalysisOverlayAttachment("),
  "analysis owner does not adapt overlay config to the core attachment");
});

check("composition and RTSP lifecycle bind one service and every detach boundary", () => {
  const application = read("src/application/media_server_application.cpp");
  const rtspHeader = read("include/ingress/gstreamer_rtsp_server.h");
  const rtspServer = read("src/ingress/gstreamer_rtsp_server.cpp");
  const httpHeader = read("include/ingress/webrtc_http_server.h");
  const httpServer = readWebRtcHttpServerBundle(read);
  for (const anchor of [
    "analysis::AnalysisSessionService analysis_sessions(session_manager);",
    "SetAuxiliaryStreamRuntimeProvider(",
    "GStreamerRtspServer gst_rtsp_server(session_manager, analysis_sessions);",
    "WebRtcHttpServer webrtc_http_server(session_manager, analysis_sessions);",
    "SetAuxiliaryStreamRuntimeProvider({});",
  ]) assert(application.includes(anchor), `composition owner binding missing: ${anchor}`);
  assert(rtspHeader.includes("core::MediaAnalysisPort& analysis_port") &&
    httpHeader.includes("analysis::AnalysisSessionService& analysis_sessions"),
  "server constructor injection drift");
  assert(rtspServer.includes("runtime->analysis_port.PrepareRtsp(") &&
    count(rtspServer, /analysis_port\.DetachRtsp\(/g) >= 3 &&
    rtspServer.includes("media unprepared; detach analysis tap"),
  "RTSP prepare/failure/unprepared detach boundary drift");
  assert(httpServer.includes("analysis::AnalysisSessionService& analysis_sessions") &&
    !httpServer.includes("session_manager.AnalysisTap") &&
    !httpServer.includes("session_manager.AttachAnalysisTap") &&
    !httpServer.includes("session_manager.WaitAnalysisResultNearPts"),
  "WebRTC HTTP analysis calls are not bound to the injected service");
});

check("RTSP prepare and cleanup ordering preserve the previous lifecycle", () => {
  const source = read("src/ingress/gstreamer_rtsp_server.cpp");
  const configure = sliceBetween(source, "void OnMediaConfigure(", "void ConfigureFactory(", "RTSP configure");
  assertOrdered(configure, "RTSP binding sequence", [
    "runtime->analysis_port.PrepareRtsp(request)",
    "if (!analysis_binding.ok)",
    "std::make_shared<RtspEgressSession>",
    "analysis_binding.make_pipeline_attachment",
    "bridge->SetPipelineAttachment(",
    "runtime->session_manager.CreateSession(",
    "bridge->Start(",
  ]);
  const prepareFailure = sliceBetween(configure, "if (!analysis_binding.ok)",
    "auto bridge = std::make_shared<RtspEgressSession>", "RTSP prepare failure");
  assertOrdered(prepareFailure, "RTSP prepare failure", ["gst_object_unref(media_element)", "return;"]);
  assert(!prepareFailure.includes("RtspEgressSession") && !prepareFailure.includes("CreateSession("),
    "RTSP prepare failure creates an egress/session");
  const createFailure = sliceBetween(configure, "if (!create_result.ok)",
    "std::string bridge_error", "RTSP create failure");
  assertOrdered(createFailure, "RTSP create cleanup", [
    "runtime->analysis_port.DetachRtsp(analysis_tap_id)",
    "gst_object_unref(media_element)",
    "return;",
  ]);
  const startFailure = sliceBetween(configure, "if (!bridge->Start(",
    "std::cerr << \"[gst] configure media codec=\"", "RTSP start failure");
  assertOrdered(startFailure, "RTSP start cleanup", [
    "runtime->analysis_port.DetachRtsp(analysis_tap_id)",
    "runtime->session_manager.CloseSession(request.client_id)",
    "gst_object_unref(media_element)",
    "return;",
  ]);
  const unprepared = sliceBetween(source, "void OnMediaUnprepared(",
    "void OnMediaConfigure(", "RTSP unprepared");
  assertOrdered(unprepared, "RTSP unprepared cleanup", [
    "runtime->analysis_port.DetachRtsp(tap_id)",
    "runtime->session_manager.CloseSession(sid)",
  ]);
});

check("generic attachments preserve RTSP/WebRTC failure and retry semantics", () => {
  const rtsp = read("src/ingress/rtsp_egress_session.cpp");
  const webrtc = read("src/ingress/webrtc_egress_session.cpp");
  const adapter = read("src/ingress/analysis_overlay_probe.cpp");
  const rtspStart = sliceBetween(rtsp, "bool RtspEgressSession::Start(",
    "void RtspEgressSession::Stop(", "RTSP egress Start");
  assertOrdered(rtspStart, "RTSP attachment point", [
    "ConfigureAppSrcCaps(", "pipeline_attachment_(media_element_, error_message)", "started_ = true",
  ]);
  const rtspAttachmentFailure = sliceBetween(rtspStart, "if (pipeline_attachment_",
    "#else", "RTSP attachment failure");
  assert(!rtspAttachmentFailure.includes("Stop()"), "RTSP attachment failure added Stop side effects");
  const webrtcStart = sliceBetween(webrtc, "bool WebRtcEgressSession::Start(",
    "void WebRtcEgressSession::Stop(", "WebRTC egress Start");
  assertOrdered(webrtcStart, "WebRTC attachment point", [
    "ConfigureAppSrcCaps(", "pipeline_attachment_(pipeline_, error_message)",
  ]);
  const webrtcAttachmentFailure = sliceBetween(webrtcStart, "if (pipeline_attachment_",
    "if (app::GetAppConfig().webrtc_trace)", "WebRTC attachment failure");
  assertOrdered(webrtcAttachmentFailure, "WebRTC attachment failure", [
    "pipeline_attachment_(pipeline_, error_message)", "Stop();", "return false;",
  ]);
  assert(!rtspStart.includes("std::move(pipeline_attachment_)") &&
    !webrtcStart.includes("std::move(pipeline_attachment_)"),
  "egress consumes its attachment callback and makes retry a false PASS");
  for (const anchor of [
    "[config = std::move(config)](void* pipeline, std::string* error_message) mutable",
    "auto attempt_config = config;",
    "static_cast<GstElement*>(pipeline), std::move(attempt_config), error_message",
  ]) assert(adapter.includes(anchor), `retry-safe overlay adapter anchor missing: ${anchor}`);
});

check("PTS mapping, result lookup, event dispatch, and probe side effects stay ordered", () => {
  const rtsp = read("src/ingress/rtsp_egress_session.cpp");
  const webrtc = read("src/ingress/webrtc_egress_session.cpp");
  const service = read("src/analysis/analysis_session_service.cpp");
  const probe = read("src/ingress/analysis_overlay_probe.cpp");
  for (const [label, text, frameDuration, mappingCap] of [
    ["RTSP", rtsp, "kVideoFrameDurationNs = 33333333", "kMaxVideoTimestampMappings = 2048"],
    ["WebRTC", webrtc, "kWebRtcVideoFrameDurationNs = 33333333", "kMaxVideoTimestampMappings = 8192"],
  ]) {
    for (const anchor of [frameDuration, mappingCap, "kMaxTimestampMappingDistanceNs = 2000000000LL",
      "std::min(packet.pts, packet.dts)", "normalized.dts <= *last_video_dts_",
      "normalized.pts += offset", "normalized.dts += offset", "video_timestamp_mappings_.push_back(",
      "video_timestamp_mappings_.size() > kMaxVideoTimestampMappings", "video_timestamp_mappings_.pop_front()",
      "video_timestamp_mappings_.rbegin()", "diff >= best_diff",
      "best_diff <= kMaxTimestampMappingDistanceNs", "video_timestamp_mappings_.clear()"])
      assert(text.includes(anchor), `${label} PTS invariant missing: ${anchor}`);
  }
  for (const anchor of [
    "source_pts_resolver ? source_pts_resolver(frame_pts) : frame_pts",
    "timing_options.sync_tolerance_ms) * 1000000LL",
    "std::chrono::milliseconds(wait_timeout_ms)",
    "WaitAnalysisResultNearPts(\n                            tap_id,\n                            source_pts,",
  ]) assert(service.includes(anchor), `analysis lookup invariant missing: ${anchor}`);
  assertOrdered(service, "analysis event dispatch", [
    "ApplyEventRulesToResult(", "DispatchEventRecords(", "DispatchEventPosts(", "return evaluation.annotated_result",
  ]);
  const overlayBuffer = sliceBetween(probe, "GstPadProbeReturn OnOverlayBuffer(",
    "void DestroyProbeState(", "overlay probe");
  assertOrdered(overlayBuffer, "overlay side-effect ordering", [
    "result_provider(frame_pts)", "!result.has_value()", "!state->config.render_video_overlay",
  ]);
  assert(overlayBuffer.indexOf("result_provider(frame_pts)") <
    overlayBuffer.indexOf("!state->config.render_video_overlay"),
  "render guard precedes the result-provider side effect");
});

check("composition uses exactly one analysis service identity", () => {
  const application = read("src/application/media_server_application.cpp");
  for (const anchor of [
    "analysis::AnalysisSessionService analysis_sessions(session_manager);",
    "ingress::GStreamerRtspServer gst_rtsp_server(session_manager, analysis_sessions);",
    "ingress::WebRtcHttpServer webrtc_http_server(session_manager, analysis_sessions);",
    "session_manager.SetAuxiliaryStreamRuntimeProvider({});",
  ]) assert(count(application, new RegExp(anchor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) === 1,
    `composition identity count drift: ${anchor}`);
  assertOrdered(application, "composition injection", [
    "analysis::AnalysisSessionService analysis_sessions(session_manager);",
    "session_manager.SetAuxiliaryStreamRuntimeProvider(",
    "GStreamerRtspServer gst_rtsp_server(session_manager, analysis_sessions);",
    "WebRtcHttpServer webrtc_http_server(session_manager, analysis_sessions);",
  ]);
});

check("graph target and source mutations fail closed", () => {
  const graph = JSON.parse(read("test/fixtures/v390_structure_stabilization_current_graph.json"));
  const ledger = JSON.parse(read("test/fixtures/v390_structure_stabilization_execution.json"));
  const allowedSuccessorViolations = new Set([
    "analysis-services -> core-utilities",
    "analysis-services -> stable-contract-dtos",
    "application-service-interfaces -> core-utilities",
    "application-service-interfaces -> ops-route-groups",
    "core-media-interfaces -> domain-and-registry-owners",
    "core-media-interfaces -> stable-contract-dtos",
    "core-utilities -> stable-contract-dtos",
    "domain-and-registry-owners -> stable-contract-dtos",
    "transport-and-auth-adapter -> analysis-services",
    "transport-and-auth-adapter -> core-media-interfaces",
    "transport-and-auth-adapter -> core-utilities",
    "transport-and-auth-adapter -> domain-and-registry-owners",
    "transport-and-auth-adapter -> ops-route-groups",
    "transport-and-auth-adapter -> product-ui-workspaces",
  ]);
  const violations = graph.observedModuleEdges.filter(item => item.allowedByTarget === false);
  assert(graph.expectedProductionFiles >= 162 && graph.expectedCppFiles >= 80 &&
    violations.length <= 14 && violations.every(item => allowedSuccessorViolations.has(item.direction)) &&
    graph.stronglyConnectedComponents.length === 0,
  "core media analysis inversion graph metrics drift");
  assert(!graph.observedModuleEdges.some(item =>
    item.direction === "core-media-interfaces -> analysis-services" ||
    item.direction === "core-media-interfaces -> application-service-interfaces"),
  "core media outer-owner direction remains");
  if (violations.length > 0) {
    assert(ledger.currentContinuation.architectureStatus === "final-targets-unmet" &&
      ledger.currentContinuation.finalCompletionClaimAllowed === false,
    "SCC closure overclaims all architecture targets");
  }
});

const oracleInputFiles = [
  ...witnessFiles,
  "include/core/stream_registry.h",
  "src/core/stream_registry.cpp",
  "include/core/media_analysis_port.h",
  "include/analysis/analysis_session_service.h",
  "src/analysis/analysis_session_service.cpp",
  "include/ingress/analysis_overlay_probe.h",
  "src/ingress/analysis_overlay_probe.cpp",
  "include/ingress/gstreamer_rtsp_server.h",
  "include/ingress/webrtc_http_server.h",
  "src/ingress/webrtc_http_server.cpp",
  "src/application/media_server_application.cpp",
  "test/fixtures/v390_structure_stabilization_current_graph.json",
  "test/fixtures/v390_structure_stabilization_execution.json",
];

function copyOracleInputs(targetRoot) {
  copyWebRtcHttpServerSourceFixture(targetRoot);
  for (const relative of new Set(oracleInputFiles)) {
    const from = path.join(rootDir, relative);
    const to = path.join(targetRoot, relative);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
  }
}

function runFixtureVerifier(fixtureRoot) {
  return spawnSync(process.execPath, [
    scriptPath,
    `--fixture-root=${fixtureRoot}`,
    "--skip-mutations",
  ], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function verifierOutput(run) {
  return `${run.stdout || ""}\n${run.stderr || ""}`;
}

function mutateWithin(text, start, end, before, after, label) {
  const begin = text.indexOf(start);
  assert(begin >= 0, `${label}: mutation start missing`);
  const finish = text.indexOf(end, begin + start.length);
  assert(finish >= 0, `${label}: mutation end missing`);
  const segment = text.slice(begin, finish);
  const changed = replaceExactly(segment, before, after, label);
  return `${text.slice(0, begin)}${changed}${text.slice(finish)}`;
}

function rejectMutation({ id, file, mutate, expectedFailure }) {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), `v390-core-media-port-${id}-`));
  try {
    copyOracleInputs(workspace);
    const target = path.join(workspace, file);
    const before = fs.readFileSync(target, "utf8");
    const after = mutate(before);
    assert(after !== before, `${id}: mutation changed no bytes`);
    fs.writeFileSync(target, after);
    const run = runFixtureVerifier(workspace);
    const output = verifierOutput(run);
    assert(run.error === undefined, `${id}: spawn failed: ${run.error}`);
    assert(run.signal === null, `${id}: verifier terminated by ${run.signal}`);
    assert(run.status === 1, `${id}: expected exit 1, got ${run.status}\n${output}`);
    assert(output.includes(expectedFailure), `${id}: unrelated rejection\n${output}`);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
}

if (!skipMutations) {
  check("isolated source mutations fail through the real verifier", () => {
    const pristine = fs.mkdtempSync(path.join(os.tmpdir(), "v390-core-media-port-pristine-"));
    try {
      copyOracleInputs(pristine);
      const run = runFixtureVerifier(pristine);
      assert(run.error === undefined && run.signal === null && run.status === 0,
        `pristine fixture must pass\n${verifierOutput(run)}`);
    } finally {
      fs.rmSync(pristine, { recursive: true, force: true });
    }

    const mutations = [
      {
        id: "graph-direction-swap",
        file: "test/fixtures/v390_structure_stabilization_current_graph.json",
        mutate: text => text.replace('"direction": "analysis-services -> core-utilities"',
          '"direction": "analysis-services -> product-ui-workspaces"'),
        expectedFailure: "core media analysis inversion graph metrics drift",
      },
      {
        id: "analysis-include",
        file: "include/ingress/rtsp_egress_session.h",
        mutate: text => `${text}\n#include \"ingress/analysis_overlay_probe.h\"\n`,
        expectedFailure: "all ten core-media analysis/application include witnesses are removed",
      },
      {
        id: "create-cleanup",
        file: "src/ingress/gstreamer_rtsp_server.cpp",
        mutate: text => mutateWithin(text, "if (!create_result.ok)", "std::string bridge_error",
          "runtime->analysis_port.DetachRtsp(analysis_tap_id);", "/* detach removed */", "create cleanup"),
        expectedFailure: "RTSP prepare and cleanup ordering preserve the previous lifecycle",
      },
      {
        id: "start-cleanup-order",
        file: "src/ingress/gstreamer_rtsp_server.cpp",
        mutate: text => mutateWithin(text, "if (!bridge->Start(",
          "std::cerr << \"[gst] configure media codec=\"",
          "runtime->analysis_port.DetachRtsp(analysis_tap_id);\n        }\n        runtime->session_manager.CloseSession(request.client_id);",
          "runtime->session_manager.CloseSession(request.client_id);\n        }\n        runtime->analysis_port.DetachRtsp(analysis_tap_id);",
          "start cleanup order"),
        expectedFailure: "RTSP prepare and cleanup ordering preserve the previous lifecycle",
      },
      {
        id: "rtsp-stop-side-effect",
        file: "src/ingress/rtsp_egress_session.cpp",
        mutate: text => replaceExactly(text,
          "if (pipeline_attachment_ && !pipeline_attachment_(media_element_, error_message)) {\n        return false;\n    }",
          "if (pipeline_attachment_ && !pipeline_attachment_(media_element_, error_message)) {\n        Stop();\n        return false;\n    }",
          "RTSP Stop mutation"),
        expectedFailure: "generic attachments preserve RTSP/WebRTC failure and retry semantics",
      },
      {
        id: "webrtc-stop-removed",
        file: "src/ingress/webrtc_egress_session.cpp",
        mutate: text => replaceExactly(text,
          "if (pipeline_attachment_ && !pipeline_attachment_(pipeline_, error_message)) {\n        Stop();\n        return false;\n    }",
          "if (pipeline_attachment_ && !pipeline_attachment_(pipeline_, error_message)) {\n        return false;\n    }",
          "WebRTC Stop mutation"),
        expectedFailure: "generic attachments preserve RTSP/WebRTC failure and retry semantics",
      },
      {
        id: "callback-move-out",
        file: "src/ingress/rtsp_egress_session.cpp",
        mutate: text => replaceExactly(text,
          "pipeline_attachment_(media_element_, error_message)",
          "std::move(pipeline_attachment_)(media_element_, error_message)",
          "callback move"),
        expectedFailure: "generic attachments preserve RTSP/WebRTC failure and retry semantics",
      },
      {
        id: "resolver-bypass",
        file: "src/analysis/analysis_session_service.cpp",
        mutate: text => replaceExactly(text,
          "source_pts_resolver ? source_pts_resolver(frame_pts) : frame_pts",
          "frame_pts",
          "resolver bypass"),
        expectedFailure: "PTS mapping, result lookup, event dispatch, and probe side effects stay ordered",
      },
      {
        id: "tolerance-unit",
        file: "src/analysis/analysis_session_service.cpp",
        mutate: text => replaceExactly(text, "timing_options.sync_tolerance_ms) * 1000000LL",
          "timing_options.sync_tolerance_ms) * 1000LL", "tolerance unit"),
        expectedFailure: "PTS mapping, result lookup, event dispatch, and probe side effects stay ordered",
      },
      {
        id: "rtsp-mapping-cap",
        file: "src/ingress/rtsp_egress_session.cpp",
        mutate: text => replaceExactly(text, "kMaxVideoTimestampMappings = 2048",
          "kMaxVideoTimestampMappings = 2047", "RTSP mapping cap"),
        expectedFailure: "PTS mapping, result lookup, event dispatch, and probe side effects stay ordered",
      },
      {
        id: "webrtc-mapping-cap",
        file: "src/ingress/webrtc_egress_session.cpp",
        mutate: text => replaceExactly(text, "kMaxVideoTimestampMappings = 8192",
          "kMaxVideoTimestampMappings = 8191", "WebRTC mapping cap"),
        expectedFailure: "PTS mapping, result lookup, event dispatch, and probe side effects stay ordered",
      },
      {
        id: "event-order",
        file: "src/analysis/analysis_session_service.cpp",
        mutate: text => replaceExactly(text,
          "DispatchEventRecords(evaluation.annotated_result, evaluation.events);\n                        DispatchEventPosts(evaluation.annotated_result, evaluation.events);",
          "DispatchEventPosts(evaluation.annotated_result, evaluation.events);\n                        DispatchEventRecords(evaluation.annotated_result, evaluation.events);",
          "event order"),
        expectedFailure: "PTS mapping, result lookup, event dispatch, and probe side effects stay ordered",
      },
      {
        id: "probe-side-effect-order",
        file: "src/ingress/analysis_overlay_probe.cpp",
        mutate: text => replaceExactly(text,
          "const auto result = state->config.result_provider(frame_pts);",
          "if (!state->config.render_video_overlay) return GST_PAD_PROBE_OK;\n    const auto result = state->config.result_provider(frame_pts);",
          "probe order"),
        expectedFailure: "PTS mapping, result lookup, event dispatch, and probe side effects stay ordered",
      },
      {
        id: "split-service-identity",
        file: "src/application/media_server_application.cpp",
        mutate: text => replaceExactly(text,
          "GStreamerRtspServer gst_rtsp_server(session_manager, analysis_sessions);",
          "GStreamerRtspServer gst_rtsp_server(session_manager, other_analysis_sessions);",
          "split service"),
        expectedFailure: "composition uses exactly one analysis service identity",
      },
      {
        id: "attach-transaction-removed",
        file: "src/analysis/analysis_session_service.cpp",
        mutate: text => mutateWithin(text,
          "AnalysisSessionService::AnalysisTapResult AnalysisSessionService::AttachAnalysisTap(",
          "AnalysisSessionService::AnalysisTapDetachResult",
          "std::lock_guard attach_lock(attach_mu_);", "/* attach transaction removed */",
          "attach transaction"),
        expectedFailure: "concurrent attach, auxiliary lease, shutdown drain, and provider close stay transactional",
      },
      {
        id: "detach-transaction-removed",
        file: "src/analysis/analysis_session_service.cpp",
        mutate: text => mutateWithin(text,
          "AnalysisSessionService::AnalysisTapDetachResult AnalysisSessionService::DetachAnalysisTapRef(",
          "bool AnalysisSessionService::DetachAnalysisTap(",
          "std::lock_guard attach_lock(attach_mu_);", "/* detach transaction removed */",
          "detach transaction"),
        expectedFailure: "concurrent attach, auxiliary lease, shutdown drain, and provider close stay transactional",
      },
      {
        id: "auxiliary-lease-bypass",
        file: "src/core/session_manager.cpp",
        mutate: text => mutateWithin(text,
          "SessionManager::AuxiliaryStreamHandle SessionManager::AcquireAuxiliaryStream(",
          "bool SessionManager::StartAuxiliaryStream(",
          "std::lock_guard acquire_lock(stream_acquire_mu_);", "/* acquire transaction removed */",
          "auxiliary lease"),
        expectedFailure: "concurrent attach, auxiliary lease, shutdown drain, and provider close stay transactional",
      },
      {
        id: "media-acquire-transaction-removed",
        file: "src/core/session_manager.cpp",
        mutate: text => mutateWithin(text,
          "SessionManager::CreateResult SessionManager::CreateSession(",
          "bool SessionManager::CloseSession(",
          "std::lock_guard acquire_lock(stream_acquire_mu_);", "/* acquire transaction removed */",
          "media acquire transaction"),
        expectedFailure: "concurrent attach, auxiliary lease, shutdown drain, and provider close stay transactional",
      },
      {
        id: "media-acquire-lease-release-removed",
        file: "src/core/session_manager.cpp",
        mutate: text => mutateWithin(text,
          "SessionManager::CreateResult SessionManager::CreateSession(",
          "bool SessionManager::CloseSession(",
          "registry_.ReleaseLease(key);", "/* media lease release removed */",
          "media acquire lease release"),
        expectedFailure: "concurrent attach, auxiliary lease, shutdown drain, and provider close stay transactional",
      },
      {
        id: "registry-acquire-lease-increment-removed",
        file: "src/core/stream_registry.cpp",
        mutate: text => mutateWithin(text,
          "StreamRegistry::AcquireResult StreamRegistry::Acquire(",
          "bool StreamRegistry::ReleaseLease(",
          "++outstanding_leases_[key];", "/* existing stream lease increment removed */",
          "registry acquire lease"),
        expectedFailure: "concurrent attach, auxiliary lease, shutdown drain, and provider close stay transactional",
      },
      {
        id: "file-cleanup-final-lease-guard-removed",
        file: "src/core/session_manager.cpp",
        mutate: text => mutateWithin(text,
          "void SessionManager::ReleaseAuxiliaryStreamWhenIdle(",
          "void SessionManager::SetAuxiliaryStreamRuntimeProvider(",
          "if (registry_.ReleaseLease(handle.stream_key)) {\n        ScheduleIdleCleanup(handle.stream_key);\n    }",
          "registry_.ReleaseLease(handle.stream_key);\n    ScheduleIdleCleanup(handle.stream_key);",
          "file cleanup final lease guard"),
        expectedFailure: "concurrent attach, auxiliary lease, shutdown drain, and provider close stay transactional",
      },
      {
        id: "shutdown-drain-removed",
        file: "src/analysis/analysis_session_service.cpp",
        mutate: text => mutateWithin(text,
          "AnalysisSessionService::~AnalysisSessionService()",
          "void AnalysisSessionService::DrainAnalysisTaps()",
          "DrainAnalysisTaps();", "/* shutdown drain removed */", "shutdown drain"),
        expectedFailure: "concurrent attach, auxiliary lease, shutdown drain, and provider close stay transactional",
      },
      {
        id: "provider-wait-removed",
        file: "src/core/session_manager.cpp",
        mutate: text => mutateWithin(text,
          "void SessionManager::SetAuxiliaryStreamRuntimeProvider(",
          "SessionManager::AuxiliaryStreamRuntimeSnapshot SessionManager::AuxiliaryRuntimeSnapshot() const",
          "auxiliary_stream_runtime_provider_cv_.wait(lock, [this] {\n        return auxiliary_stream_runtime_provider_calls_ == 0;\n    });",
          "/* provider close wait removed */", "provider wait"),
        expectedFailure: "concurrent attach, auxiliary lease, shutdown drain, and provider close stay transactional",
      },
      {
        id: "reused-tap-lease-release-removed",
        file: "src/analysis/analysis_session_service.cpp",
        mutate: text => mutateWithin(text,
          "if (!detach_result.removed)", "analysis_taps_.erase(tap_id)",
          "session_manager_.ReleaseAuxiliaryStreamWhenIdle(entry.stream_handle);",
          "/* reused tap lease release removed */", "reused tap lease"),
        expectedFailure: "concurrent attach, auxiliary lease, shutdown drain, and provider close stay transactional",
      },
      {
        id: "shutdown-ref-lease-loop-removed",
        file: "src/analysis/analysis_session_service.cpp",
        mutate: text => mutateWithin(text,
          "void AnalysisSessionService::DrainAnalysisTaps()",
          "AnalysisSessionService::AnalysisTapResult",
          "for (std::size_t ref = 0; ref < entry.ref_count; ++ref)",
          "for (std::size_t ref = 0; ref < 1; ++ref)", "shutdown ref lease loop"),
        expectedFailure: "concurrent attach, auxiliary lease, shutdown drain, and provider close stay transactional",
      },
    ];
    for (const mutation of mutations) rejectMutation(mutation);
  });
}

for (const item of checks) {
  console.log(`- ${item.status}: ${item.name}${item.detail ? ` — ${item.detail}` : ""}`);
}
const passed = checks.filter(item => item.status === "PASS").length;
const failed = checks.length - passed;
console.log(`- summary: pass=${passed} fail=${failed}`);
process.exit(failed === 0 ? 0 : 1);

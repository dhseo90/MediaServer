// 파일 요약: analysis application service와 core media-analysis port를 구현한다.
// 동작 요약: 분석 tap 재사용/정리, source accounting, RTSP overlay·event 결속을 한 owner에서 조율한다.
#include "analysis/analysis_session_service.h"

#include <algorithm>
#include <chrono>
#include <iostream>
#include <sstream>
#include <unordered_set>

#include "analysis/analysis_query.h"
#include "analysis/event_post_dispatcher.h"
#include "analysis/event_rule_engine.h"
#include "analysis/event_storage.h"
#include "app_config.h"
#include "core/runtime_debug_counters.h"
#include "ingress/analysis_overlay_probe.h"
#include "ingress/analysis_rule_registry.h"

namespace analysis {
namespace {

void TraceAnalysisSessionEvent(const std::string& message) {
    if (app::GetAppConfig().session_trace) {
        static std::mutex trace_mu;
        std::lock_guard lock(trace_mu);
        std::cerr << "[session] " << message << "\n";
    }
}

AnalysisContext BuildAnalysisContext(const media::IngressRequest& request,
                                     const media::SourceSpec& source_spec) {
    AnalysisContext context;
    context.source_kind = media::ToString(source_spec.kind);
    context.route = request.protocol.empty() ? "*" : request.protocol;
    context.client_id = request.client_id;
    if (const auto it = request.query.find("vaRule"); it != request.query.end()) {
        context.va_rule_id = it->second;
    } else if (const auto id_it = request.query.find("vaRuleId"); id_it != request.query.end()) {
        context.va_rule_id = id_it->second;
    }
    if (!context.va_rule_id.empty()) {
        context.va_rule_ids.push_back(context.va_rule_id);
    }
    return context;
}

std::string BuildAnalysisReuseKey(const core::StreamKey& stream_key, const AnalysisProfile& profile) {
    const auto& config = app::GetAppConfig();
    std::vector<std::string> tracking_classes = profile.tracking_class_labels;
    std::sort(tracking_classes.begin(), tracking_classes.end());

    std::ostringstream out;
    out << "source=" << stream_key
        << "|profile=" << profile.profile_id
        << "|detector=" << profile.detector_type
        << "|model=" << (profile.model_path.empty() ? "<default>" : profile.model_path)
        << "|labels=" << (profile.labels_path.empty() ? "<default>" : profile.labels_path)
        << "|fps=" << profile.target_fps
        << "|queue=" << profile.max_queue_size
        << "|sampleInterval=" << profile.frame_sample_interval
        << "|maxFrameAgeMs=" << profile.max_frame_age_ms
        << "|input=" << profile.model_input_width << "x" << profile.model_input_height
        << "|maxDetections=" << profile.max_detections
        << "|confidence=" << profile.confidence_threshold
        << "|nms=" << profile.nms_threshold
        << "|objectness=" << (profile.yolo_has_objectness ? 1 : 0)
        << "|preprocess=" << profile.yolo_preprocess_mode
        << "|layout=" << profile.yolo_output_layout
        << "|box=" << profile.yolo_box_format
        << "|scoreMode=" << profile.yolo_score_mode
        << "|objectDetection=" << (profile.enable_object_detection ? 1 : 0)
        << "|tracking=" << (profile.enable_tracking ? 1 : 0)
        << "|trackerPolicy=" << profile.tracking_policy_tracker
        << "|effectiveTracker=" << profile.tracking_policy_effective_tracker
        << "|reidPolicy=" << profile.tracking_policy_reid
        << "|policyRule=" << profile.tracking_policy_rule_id
        << "|trackingSpecified=" << (profile.tracking_classes_specified ? 1 : 0)
        << "|trackingClasses=";
    for (std::size_t i = 0; i < tracking_classes.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << tracking_classes[i];
    }
    out << "|pose=" << (profile.enable_pose ? 1 : 0)
        << "|debugState=" << (profile.enable_debug_state ? 1 : 0)
        << "|adaptive=" << (profile.adaptive_tuning_enabled ? 1 : 0)
        << "|adaptiveInput=" << (profile.adaptive_input_size_enabled ? 1 : 0)
        << "|adaptiveFps=" << profile.adaptive_min_fps << "-" << profile.adaptive_max_fps
        << "|adaptiveInputBounds=" << profile.adaptive_min_input_width << "x"
        << profile.adaptive_min_input_height << "-" << profile.adaptive_max_input_width << "x"
        << profile.adaptive_max_input_height
        << "|adaptiveStep=" << profile.adaptive_input_step
        << "|adaptiveCooldown=" << profile.adaptive_cooldown_ms
        << "|debugDelayMs=" << profile.debug_detector_delay_ms
        << "|trackerConfig=lost:" << config.analysis_tracking_lost_buffer_frames
        << ",iou:" << config.analysis_tracking_iou_weight
        << ",distance:" << config.analysis_tracking_distance_weight
        << ",direction:" << config.analysis_tracking_direction_weight
        << ",class:" << config.analysis_tracking_class_weight
        << ",minScore:" << config.analysis_tracking_min_association_score
        << ",smooth:" << config.analysis_tracking_smoothing_alpha
        << ",guard:" << config.analysis_tracking_close_object_guard_mode
        << ",distanceRatio:" << config.analysis_tracking_close_object_distance_ratio
        << ",overlap:" << config.analysis_tracking_close_object_overlap_threshold
        << ",lowMargin:" << config.analysis_tracking_close_object_low_margin_threshold
        << ",centerJump:" << config.analysis_tracking_center_jump_penalty
        << ",boost:" << config.analysis_tracking_close_object_min_score_boost
        << ",diagnostics:" << config.analysis_tracking_close_object_max_diagnostics;
    return out.str();
}

}  // namespace

AnalysisSessionService::AnalysisSessionService(core::SessionManager& session_manager)
    : session_manager_(session_manager) {}

AnalysisSessionService::~AnalysisSessionService() {
    {
        std::lock_guard lock(mu_);
        closing_ = true;
    }
    session_manager_.SetAuxiliaryStreamRuntimeProvider({});
    std::lock_guard attach_lock(attach_mu_);
    DrainAnalysisTaps();
}

void AnalysisSessionService::DrainAnalysisTaps() {
    std::vector<std::pair<std::string, AnalysisTapEntry>> entries;
    {
        std::lock_guard lock(mu_);
        entries.reserve(analysis_taps_.size());
        for (const auto& entry : analysis_taps_) {
            entries.push_back(entry);
        }
        analysis_taps_.clear();
    }
    analysis_manager_.DetachAll();
    for (const auto& [tap_id, entry] : entries) {
        core::runtime_debug::RecordAnalysisTapDetached(tap_id);
        core::runtime_debug::RecordAnalysisTapRefCount(entry.reuse_key, 0);
        for (std::size_t ref = 0; ref < entry.ref_count; ++ref) {
            session_manager_.ReleaseAuxiliaryStreamWhenIdle(entry.stream_handle);
        }
    }
}

AnalysisSessionService::AnalysisTapResult AnalysisSessionService::AttachAnalysisTap(
    const media::IngressRequest& request,
    AnalysisProfile profile) {
    std::lock_guard attach_lock(attach_mu_);
    {
        std::lock_guard lock(mu_);
        if (closing_) {
            return {.ok = false, .message = "analysis session service is closing"};
        }
    }
    const auto stream_handle = session_manager_.AcquireAuxiliaryStream(request);
    if (!stream_handle.ok) {
        return {.ok = false, .message = stream_handle.message};
    }

    const auto context = BuildAnalysisContext(request, stream_handle.source_spec);
    profile = ingress::ResolveAnalysisProfileForContext(std::move(profile), context);
    const std::string reuse_key = BuildAnalysisReuseKey(stream_handle.stream_key, profile);
    {
        const auto& config = app::GetAppConfig();
        std::lock_guard lock(mu_);
        bool has_existing_reuse_key = false;
        std::size_t source_tap_count = 0;
        std::unordered_set<std::string> source_profile_keys;
        for (const auto& [_, entry] : analysis_taps_) {
            if (entry.stream_handle.stream_key != stream_handle.stream_key) {
                continue;
            }
            ++source_tap_count;
            if (!entry.reuse_key.empty()) {
                source_profile_keys.insert(entry.reuse_key);
            }
            if (entry.reuse_key == reuse_key) {
                has_existing_reuse_key = true;
            }
        }
        if (!has_existing_reuse_key &&
            config.analysis_max_active_taps_per_source > 0 &&
            source_tap_count >= config.analysis_max_active_taps_per_source) {
            session_manager_.DiscardAuxiliaryStream(stream_handle);
            core::runtime_debug::RecordAnalysisTapRejected(reuse_key);
            return {.ok = false, .message = "analysis tap limit exceeded for source"};
        }
        if (!has_existing_reuse_key &&
            config.analysis_max_active_profiles_per_source > 0 &&
            source_profile_keys.size() >= config.analysis_max_active_profiles_per_source) {
            session_manager_.DiscardAuxiliaryStream(stream_handle);
            core::runtime_debug::RecordAnalysisTapRejected(reuse_key);
            return {.ok = false, .message = "analysis profile limit exceeded for source"};
        }
    }

    auto attach_result = analysis_manager_.AttachStream(stream_handle.stream_key,
                                                        stream_handle.stream,
                                                        std::move(profile),
                                                        context,
                                                        reuse_key);
    if (!attach_result.ok) {
        session_manager_.DiscardAuxiliaryStream(stream_handle);
        core::runtime_debug::RecordAnalysisTapRejected(reuse_key);
        return {.ok = false,
                .message = attach_result.message.empty() ? "failed to attach analysis tap"
                                                         : attach_result.message};
    }

    std::string source_error;
    if (!session_manager_.StartAuxiliaryStream(stream_handle, &source_error)) {
        analysis_manager_.Detach(attach_result.tap_id);
        core::runtime_debug::RecordAnalysisTapRefCount(attach_result.reuse_key,
                                                       attach_result.ref_count > 0
                                                           ? attach_result.ref_count - 1
                                                           : 0);
        session_manager_.DiscardAuxiliaryStream(stream_handle);
        return {.ok = false,
                .message = source_error.empty() ? "failed to start source worker" : source_error};
    }
    TraceAnalysisSessionEvent(std::string(stream_handle.stream_created ? "analysis started" : "analysis reused") +
                              " source worker key=" + stream_handle.stream_key);

    {
        std::lock_guard lock(mu_);
        auto& entry = analysis_taps_[attach_result.tap_id];
        if (entry.ref_count == 0) {
            entry.stream_handle = stream_handle;
            entry.reuse_key = attach_result.reuse_key;
            entry.ref_count = 1;
        } else {
            ++entry.ref_count;
        }
    }
    core::runtime_debug::RecordAnalysisTapAttached(attach_result.tap_id);
    if (attach_result.reused) {
        core::runtime_debug::RecordAnalysisTapReused(attach_result.tap_id,
                                                     attach_result.reuse_key,
                                                     attach_result.ref_count);
    } else {
        core::runtime_debug::RecordAnalysisTapCreated(attach_result.tap_id,
                                                      attach_result.reuse_key,
                                                      attach_result.ref_count);
    }
    core::runtime_debug::RecordAnalysisTapRefCount(attach_result.reuse_key, attach_result.ref_count);

    return {.ok = true,
            .message = "ok",
            .tap_id = attach_result.tap_id,
            .stream_key = stream_handle.stream_key,
            .stream_created = stream_handle.stream_created,
            .reused = attach_result.reused,
            .reuse_key = attach_result.reuse_key,
            .ref_count = attach_result.ref_count};
}

AnalysisSessionService::AnalysisTapDetachResult AnalysisSessionService::DetachAnalysisTapRef(
    const std::string& tap_id) {
    std::lock_guard attach_lock(attach_mu_);
    AnalysisTapEntry entry;
    bool had_entry = false;
    {
        std::lock_guard lock(mu_);
        const auto it = analysis_taps_.find(tap_id);
        if (it == analysis_taps_.end()) {
            return {.ok = false, .tap_id = tap_id};
        }
        entry = it->second;
        had_entry = true;
        if (it->second.ref_count > 1) {
            --it->second.ref_count;
        } else {
            analysis_taps_.erase(it);
        }
    }

    const auto detach_result = analysis_manager_.Detach(tap_id);
    core::runtime_debug::RecordAnalysisTapDetached(tap_id);
    const std::size_t ref_count = detach_result.ok ? detach_result.ref_count : entry.ref_count;
    const std::string counter_reuse_key =
        !detach_result.reuse_key.empty() ? detach_result.reuse_key : entry.reuse_key;
    core::runtime_debug::RecordAnalysisTapRefCount(counter_reuse_key, ref_count);
    if (!detach_result.ok) {
        if (had_entry) {
            std::lock_guard lock(mu_);
            analysis_taps_[tap_id] = entry;
        }
        return {.ok = false,
                .removed = false,
                .tap_id = tap_id,
                .reuse_key = counter_reuse_key,
                .ref_count = ref_count};
    }
    if (!detach_result.removed) {
        AnalysisTapEntry restored = entry;
        restored.ref_count = ref_count == 0 ? 1 : ref_count;
        {
            std::lock_guard lock(mu_);
            analysis_taps_[tap_id] = restored;
        }
        session_manager_.ReleaseAuxiliaryStreamWhenIdle(entry.stream_handle);
        return {.ok = true,
                .removed = false,
                .tap_id = tap_id,
                .reuse_key = counter_reuse_key,
                .ref_count = ref_count};
    }
    {
        std::lock_guard lock(mu_);
        analysis_taps_.erase(tap_id);
    }
    session_manager_.ReleaseAuxiliaryStreamWhenIdle(entry.stream_handle);
    return {.ok = true,
            .removed = true,
            .tap_id = tap_id,
            .reuse_key = counter_reuse_key};
}

bool AnalysisSessionService::DetachAnalysisTap(const std::string& tap_id) {
    return DetachAnalysisTapRef(tap_id).ok;
}

std::optional<AnalysisManager::TapSnapshot> AnalysisSessionService::AnalysisTapSnapshot(
    const std::string& tap_id) const {
    return analysis_manager_.Snapshot(tap_id);
}

std::vector<AnalysisManager::TapSnapshot> AnalysisSessionService::AnalysisTapSnapshots() const {
    return analysis_manager_.Snapshots();
}

std::optional<AnalysisResult> AnalysisSessionService::AnalysisResultNearPts(
    const std::string& tap_id,
    std::int64_t pts,
    std::int64_t tolerance_ns) const {
    return analysis_manager_.ResultNearPts(tap_id, pts, tolerance_ns);
}

std::optional<AnalysisResult> AnalysisSessionService::WaitAnalysisResultNearPts(
    const std::string& tap_id,
    std::int64_t pts,
    std::int64_t tolerance_ns,
    std::chrono::milliseconds timeout) const {
    return analysis_manager_.WaitResultNearPts(tap_id, pts, tolerance_ns, timeout);
}

std::optional<RawVideoFrame> AnalysisSessionService::AnalysisLatestFrame(const std::string& tap_id) const {
    return analysis_manager_.LatestFrame(tap_id);
}

std::optional<AnalysisManager::LatestFrameResult> AnalysisSessionService::AnalysisLatestFrameAndResult(
    const std::string& tap_id) const {
    return analysis_manager_.LatestFrameAndResult(tap_id);
}

std::size_t AnalysisSessionService::ActiveAnalysisTapCount() const {
    return analysis_manager_.ActiveTapCount();
}

core::SessionManager::AuxiliaryStreamRuntimeSnapshot
AnalysisSessionService::AuxiliaryStreamRuntimeSnapshot() const {
    core::SessionManager::AuxiliaryStreamRuntimeSnapshot snapshot;
    snapshot.active_consumers = analysis_manager_.ActiveTapCount();
    std::lock_guard lock(mu_);
    snapshot.streams.reserve(analysis_taps_.size());
    for (const auto& [_, entry] : analysis_taps_) {
        snapshot.streams.push_back(core::SessionManager::AuxiliaryStreamEntry{
            .stream_key = entry.stream_handle.stream_key,
            .stream = entry.stream_handle.stream,
            .consumer_count = 1,
        });
    }
    return snapshot;
}

core::RtspAnalysisBinding AnalysisSessionService::PrepareRtsp(const media::IngressRequest& request) {
    if (!ingress::IsAnalysisOverlayRequested(request.query)) {
        return {.requested = false, .ok = true};
    }

    media::IngressRequest analysis_request = request;
    analysis_request.client_id = request.client_id + "-analysis";
    auto attach_result = AttachAnalysisTap(analysis_request,
                                           ingress::BuildAnalysisProfileFromQuery(request.query));
    if (!attach_result.ok) {
        return {.requested = true,
                .ok = false,
                .message = attach_result.message};
    }

    const auto timing_options = ingress::BuildAnalysisOverlayTimingOptionsFromQuery(request.query);
    const auto render_options = ingress::BuildOverlayRenderOptionsFromQuery(request.query);
    auto event_runtime = CreateEventRuleRuntime();
    const std::string tap_id = attach_result.tap_id;
    return {
        .requested = true,
        .ok = true,
        .message = "ok",
        .tap_id = tap_id,
        .make_pipeline_attachment =
            [this,
             tap_id,
             render_options,
             event_runtime,
             tolerance_ns = static_cast<std::int64_t>(timing_options.sync_tolerance_ms) * 1000000LL,
             wait_timeout_ms = timing_options.wait_timeout_ms](core::SourcePtsResolver source_pts_resolver) {
                ingress::AnalysisOverlayConfig config;
                config.enabled = true;
                config.render_options = render_options;
                config.sync_tolerance_ns = tolerance_ns;
                config.wait_timeout_ms = wait_timeout_ms;
                config.result_provider =
                    [this,
                     tap_id,
                     source_pts_resolver = std::move(source_pts_resolver),
                     event_runtime,
                     debug_overlay = render_options.draw_debug_overlay,
                     tolerance_ns,
                     wait_timeout_ms](std::int64_t frame_pts) -> std::optional<AnalysisResult> {
                        const std::int64_t source_pts =
                            source_pts_resolver ? source_pts_resolver(frame_pts) : frame_pts;
                        auto result = WaitAnalysisResultNearPts(
                            tap_id,
                            source_pts,
                            tolerance_ns,
                            std::chrono::milliseconds(wait_timeout_ms));
                        if (!result.has_value()) {
                            const auto snapshot = AnalysisTapSnapshot(tap_id);
                            if (!snapshot.has_value() || !snapshot->latest_result.has_value()) {
                                return std::nullopt;
                            }
                            result = *snapshot->latest_result;
                        }
                        result->debug_state_requested = result->debug_state_requested || debug_overlay;
                        result->debug_state_log_enabled = result->debug_state_log_enabled || debug_overlay;
                        const auto evaluation = ApplyEventRulesToResult(
                            *result,
                            ingress::AnalysisRuleDocumentsSnapshot(),
                            event_runtime);
                        DispatchEventRecords(evaluation.annotated_result, evaluation.events);
                        DispatchEventPosts(evaluation.annotated_result, evaluation.events);
                        return evaluation.annotated_result;
                    };
                return ingress::MakeAnalysisOverlayAttachment(std::move(config));
            },
    };
}

void AnalysisSessionService::DetachRtsp(const std::string& tap_id) {
    (void)DetachAnalysisTap(tap_id);
}

}  // namespace analysis

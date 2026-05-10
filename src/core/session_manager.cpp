// 파일 요약: 클라이언트 요청을 SharedStream과 source worker에 연결하는 orchestration 구현이다.
// 동작 요약: 동일 source dedup, resource admission, egress session 생성, analysis tap 생성을 조율한다.
// 동작 요약: RTSP/WebRTC/HTTP API가 공통으로 사용하는 session lifecycle 중심부다.
#include "core/session_manager.h"

#include <algorithm>
#include <chrono>
#include <mutex>
#include <sstream>
#include <unordered_set>

#include "app_config.h"
#include "core/runtime_debug_counters.h"
#include "core/stream_key.h"
#include "ingress/analysis_query.h"

#include <iostream>

namespace core {

namespace {

void TraceSessionEvent(const std::string& message) {
    if (app::GetAppConfig().session_trace) {
        static std::mutex trace_mu;
        std::lock_guard lock(trace_mu);
        std::cerr << "[session] " << message << "\n";
    }
}

std::int64_t NowUnixMs() {
    return std::chrono::duration_cast<std::chrono::milliseconds>(
               std::chrono::system_clock::now().time_since_epoch())
        .count();
}

analysis::AnalysisContext BuildAnalysisContext(const media::IngressRequest& request,
                                               const media::SourceSpec& source_spec) {
    analysis::AnalysisContext context;
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

std::string BuildAnalysisReuseKey(const StreamKey& stream_key, const analysis::AnalysisProfile& profile) {
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

SessionManager::SessionManager(StreamRegistry& registry, ResourceGuard& resource_guard)
    : registry_(registry), resource_guard_(resource_guard) {}

SessionManager::CreateResult SessionManager::CreateSession(const media::IngressRequest& request,
                                                           SharedStream::SubscriberCallback callback) {
    // 세션 수 제한은 source 파싱보다 먼저 적용해서 잘못된 요청도 과도하게 누적되지 않게 한다.
    if (!resource_guard_.AdmitSession()) {
        return {.ok = false, .message = "session limit exceeded", .stream = nullptr};
    }

    std::string parse_error;
    const auto source_spec = ingress::ParseSourceSpec(request, &parse_error);
    if (!source_spec.has_value()) {
        resource_guard_.ReleaseSession();
        return {.ok = false,
                .message = parse_error.empty() ? "invalid source spec" : parse_error,
                .stream = nullptr};
    }

    // 동일한 원본 URI/file/source id는 같은 StreamKey로 묶어 source worker를 하나만 띄운다.
    const StreamKey key = BuildStreamKey(*source_spec);
    const auto acquired = registry_.Acquire(key, *source_spec);
    TraceSessionEvent("acquire key=" + key +
                      " created=" + (acquired.created ? std::string("yes") : std::string("no")) +
                      " source_running=" +
                      (acquired.stream->IsSourceRunning() ? std::string("yes") : std::string("no")) +
                      " client=" + request.client_id);

    if (acquired.created && !resource_guard_.AdmitStream()) {
        const bool removed = registry_.TryRemoveIfIdle(key);
        if (removed) {
            // 주요 동작: 이 stream은 active_streams_에 반영되지 않았으므로 추가 정리는 필요 없다.
        }
        resource_guard_.ReleaseSession();
        return {.ok = false, .message = "stream limit exceeded", .stream = nullptr};
    }

    // source를 먼저 시작하면 빠른 VOD/HTTP source의 첫 keyframe이 사라질 수 있으므로
    // subscriber를 먼저 연결해 RTSP/WebRTC egress의 pending queue가 초기 샘플을 받을 수 있게 한다.
    if (!acquired.stream->AddSubscriber(request.client_id, std::move(callback))) {
        if (acquired.created) {
            registry_.TryRemoveIfIdle(key);
            resource_guard_.ReleaseStream();
        }
        resource_guard_.ReleaseSession();
        return {.ok = false, .message = "duplicate session id", .stream = nullptr};
    }

    // 새 stream이거나 이전 worker가 죽은 stream이면 SourceWorker를 새로 시작한다.
    if (acquired.created || !acquired.stream->IsSourceRunning()) {
        auto worker = CreateSourceWorker(*source_spec);
        std::string source_error;
        const std::string start_reason =
            acquired.created ? std::string("new-stream") : std::string("source-not-running");
        bool source_started = false;
        if (!acquired.stream->StartSource(std::move(worker), &source_error, &source_started)) {
            acquired.stream->RemoveSubscriber(request.client_id);
            if (acquired.created) {
                registry_.TryRemoveIfIdle(key);
                resource_guard_.ReleaseStream();
            }
            resource_guard_.ReleaseSession();
            return {.ok = false,
                     .message = source_error.empty() ? "failed to start source worker" : source_error,
                     .stream = nullptr};
        }
        TraceSessionEvent(std::string(source_started ? "started" : "reused") + " source worker key=" + key +
                          " reason=" + start_reason);
        if (!acquired.created && source_started) {
            RecordSourceReconnect(key);
        }
    }

    {
        std::lock_guard lock(mu_);
        sessions_[request.client_id] = SessionEntry{
            .stream_key = key,
            .stream = acquired.stream,
        };
    }

    return {.ok = true, .message = "ok", .stream_key = key, .stream = acquired.stream, .stream_created = acquired.created};
}

bool SessionManager::CloseSession(const std::string& session_id) {
    SessionEntry entry;
    {
        std::lock_guard lock(mu_);
        const auto it = sessions_.find(session_id);
        if (it == sessions_.end()) {
            return false;
        }
        entry = it->second;
        sessions_.erase(it);
    }

    entry.stream->RemoveSubscriber(session_id);
    resource_guard_.ReleaseSession();
    // live source는 마지막 subscriber가 빠지면 즉시 닫아 upstream 연결을 오래 물고 있지 않게 한다.
    if (entry.stream->RefCount() == 0 && entry.stream->source_spec().kind != media::SourceSpec::Kind::File) {
        if (registry_.TryRemoveIfIdle(entry.stream_key)) {
            TraceSessionEvent("immediate cleanup removed live key=" + entry.stream_key);
            resource_guard_.ReleaseStream();
            return true;
        }
    }
    ScheduleIdleCleanup(entry.stream_key);
    return true;
}

std::size_t SessionManager::ActiveSessionCount() const {
    std::lock_guard lock(mu_);
    return sessions_.size();
}

// 런타임 진단 API가 session/stream accounting을 한 번에 노출할 수 있게 현재 상태를 모은다.
SessionManager::RuntimeStateSnapshot SessionManager::GetRuntimeStateSnapshot() const {
    RuntimeStateSnapshot snapshot;
    {
        std::lock_guard lock(mu_);
        snapshot.active_sessions = sessions_.size();
    }
    // ResourceGuard와 Registry 값을 같이 노출해 fan-out dedup 누락과 accounting 불일치를 분리해서 볼 수 있게 한다.
    snapshot.resource_active_sessions = resource_guard_.ActiveSessions();
    snapshot.resource_active_streams = resource_guard_.ActiveStreams();
    snapshot.registry_active_streams = registry_.ActiveStreamCount();
    snapshot.active_analysis_taps = analysis_manager_.ActiveTapCount();
    return snapshot;
}

std::vector<SessionManager::SourceReconnectStats> SessionManager::SourceReconnectStatsSnapshot() const {
    std::vector<SourceReconnectStats> stats;
    {
        std::lock_guard lock(mu_);
        stats.reserve(source_reconnect_stats_.size());
        for (const auto& [_, item] : source_reconnect_stats_) {
            stats.push_back(item);
        }
    }
    std::sort(stats.begin(), stats.end(), [](const auto& lhs, const auto& rhs) {
        return lhs.stream_key < rhs.stream_key;
    });
    return stats;
}

std::vector<SessionManager::SourceDescriptorSnapshot> SessionManager::SourceDescriptorSnapshots() const {
    std::vector<std::pair<StreamKey, std::shared_ptr<SharedStream>>> streams;
    {
        std::lock_guard lock(mu_);
        streams.reserve(sessions_.size() + analysis_taps_.size());
        for (const auto& [_, entry] : sessions_) {
            if (entry.stream != nullptr) {
                streams.emplace_back(entry.stream_key, entry.stream);
            }
        }
        for (const auto& [_, entry] : analysis_taps_) {
            if (entry.stream != nullptr) {
                streams.emplace_back(entry.stream_key, entry.stream);
            }
        }
    }

    std::sort(streams.begin(), streams.end(), [](const auto& lhs, const auto& rhs) {
        return lhs.first < rhs.first;
    });
    streams.erase(std::unique(streams.begin(),
                              streams.end(),
                              [](const auto& lhs, const auto& rhs) {
                                  return lhs.first == rhs.first;
                              }),
                  streams.end());

    std::vector<SourceDescriptorSnapshot> snapshots;
    snapshots.reserve(streams.size());
    for (const auto& [stream_key, stream] : streams) {
        if (stream == nullptr) {
            continue;
        }
        const auto descriptor = stream->descriptor();
        if (!descriptor.has_value()) {
            continue;
        }
        snapshots.push_back(SourceDescriptorSnapshot{
            .stream_key = stream_key,
            .descriptor = *descriptor,
        });
    }
    return snapshots;
}

SessionManager::AnalysisTapResult SessionManager::AttachAnalysisTap(const media::IngressRequest& request,
                                                                    analysis::AnalysisProfile profile) {
    std::string parse_error;
    const auto source_spec = ingress::ParseSourceSpec(request, &parse_error);
    if (!source_spec.has_value()) {
        return {.ok = false,
                .message = parse_error.empty() ? "invalid source spec" : parse_error};
    }

    const StreamKey key = BuildStreamKey(*source_spec);
    const auto acquired = registry_.Acquire(key, *source_spec);
    TraceSessionEvent("analysis acquire key=" + key +
                      " created=" + (acquired.created ? std::string("yes") : std::string("no")) +
                      " source_running=" +
                      (acquired.stream->IsSourceRunning() ? std::string("yes") : std::string("no")) +
                      " client=" + request.client_id);

    if (acquired.created && !resource_guard_.AdmitStream()) {
        registry_.TryRemoveIfIdle(key);
        return {.ok = false, .message = "stream limit exceeded"};
    }

    const auto context = BuildAnalysisContext(request, *source_spec);
    profile = ingress::ResolveAnalysisProfileForContext(std::move(profile), context);
    const std::string reuse_key = BuildAnalysisReuseKey(key, profile);
    {
        const auto& config = app::GetAppConfig();
        std::lock_guard lock(mu_);
        bool has_existing_reuse_key = false;
        std::size_t source_tap_count = 0;
        std::unordered_set<std::string> source_profile_keys;
        for (const auto& [_, entry] : analysis_taps_) {
            if (entry.stream_key != key) {
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
            if (acquired.created) {
                if (registry_.TryRemoveIfIdle(key)) {
                    resource_guard_.ReleaseStream();
                }
            }
            runtime_debug::RecordAnalysisTapRejected(reuse_key);
            return {.ok = false, .message = "analysis tap limit exceeded for source"};
        }
        if (!has_existing_reuse_key &&
            config.analysis_max_active_profiles_per_source > 0 &&
            source_profile_keys.size() >= config.analysis_max_active_profiles_per_source) {
            if (acquired.created) {
                if (registry_.TryRemoveIfIdle(key)) {
                    resource_guard_.ReleaseStream();
                }
            }
            runtime_debug::RecordAnalysisTapRejected(reuse_key);
            return {.ok = false, .message = "analysis profile limit exceeded for source"};
        }
    }
    auto attach_result =
        analysis_manager_.AttachStream(key, acquired.stream, std::move(profile), context, reuse_key);
    if (!attach_result.ok) {
        if (acquired.created) {
            if (registry_.TryRemoveIfIdle(key)) {
                resource_guard_.ReleaseStream();
            }
        }
        runtime_debug::RecordAnalysisTapRejected(reuse_key);
        return {.ok = false,
                .message = attach_result.message.empty() ? "failed to attach analysis tap" : attach_result.message};
    }

    if (acquired.created || !acquired.stream->IsSourceRunning()) {
        auto worker = CreateSourceWorker(*source_spec);
        std::string source_error;
        bool source_started = false;
        if (!acquired.stream->StartSource(std::move(worker), &source_error, &source_started)) {
            analysis_manager_.Detach(attach_result.tap_id);
            runtime_debug::RecordAnalysisTapRefCount(attach_result.reuse_key, attach_result.ref_count > 0
                                                                              ? attach_result.ref_count - 1
                                                                              : 0);
            if (acquired.created) {
                if (registry_.TryRemoveIfIdle(key)) {
                    resource_guard_.ReleaseStream();
                }
            }
            return {.ok = false,
                    .message = source_error.empty() ? "failed to start source worker" : source_error};
        }
        TraceSessionEvent(std::string(source_started ? "analysis started" : "analysis reused") +
                          " source worker key=" + key);
        if (!acquired.created && source_started) {
            RecordSourceReconnect(key);
        }
    }

    {
        std::lock_guard lock(mu_);
        auto& entry = analysis_taps_[attach_result.tap_id];
        entry.stream_key = key;
        entry.stream = acquired.stream;
        entry.source_kind = source_spec->kind;
        entry.reuse_key = attach_result.reuse_key;
        entry.ref_count = entry.ref_count == 0 ? 1 : entry.ref_count + 1;
    }
    runtime_debug::RecordAnalysisTapAttached(attach_result.tap_id);
    if (attach_result.reused) {
        runtime_debug::RecordAnalysisTapReused(attach_result.tap_id,
                                               attach_result.reuse_key,
                                               attach_result.ref_count);
    } else {
        runtime_debug::RecordAnalysisTapCreated(attach_result.tap_id,
                                                attach_result.reuse_key,
                                                attach_result.ref_count);
    }
    runtime_debug::RecordAnalysisTapRefCount(attach_result.reuse_key, attach_result.ref_count);

    return {.ok = true,
            .message = "ok",
            .tap_id = attach_result.tap_id,
            .stream_key = key,
            .stream_created = acquired.created,
            .reused = attach_result.reused,
            .reuse_key = attach_result.reuse_key,
            .ref_count = attach_result.ref_count};
}

SessionManager::AnalysisTapDetachResult SessionManager::DetachAnalysisTapRef(const std::string& tap_id) {
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
    runtime_debug::RecordAnalysisTapDetached(tap_id);
    const std::size_t ref_count = detach_result.ok ? detach_result.ref_count : entry.ref_count;
    const std::string counter_reuse_key =
        !detach_result.reuse_key.empty() ? detach_result.reuse_key : entry.reuse_key;
    runtime_debug::RecordAnalysisTapRefCount(counter_reuse_key, ref_count);
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
        std::lock_guard lock(mu_);
        analysis_taps_[tap_id] = restored;
        return {.ok = detach_result.ok,
                .removed = false,
                .tap_id = tap_id,
                .reuse_key = counter_reuse_key,
                .ref_count = ref_count};
    }
    {
        std::lock_guard lock(mu_);
        analysis_taps_.erase(tap_id);
    }
    if (entry.source_kind != media::SourceSpec::Kind::File) {
        if (registry_.TryRemoveIfIdle(entry.stream_key)) {
            TraceSessionEvent("analysis cleanup removed live key=" + entry.stream_key);
            resource_guard_.ReleaseStream();
        }
        return {.ok = true, .removed = true, .tap_id = tap_id, .reuse_key = counter_reuse_key};
    }

    ScheduleIdleCleanup(entry.stream_key);
    return {.ok = true, .removed = true, .tap_id = tap_id, .reuse_key = counter_reuse_key};
}

bool SessionManager::DetachAnalysisTap(const std::string& tap_id) {
    return DetachAnalysisTapRef(tap_id).ok;
}

std::optional<analysis::AnalysisManager::TapSnapshot> SessionManager::AnalysisTapSnapshot(
    const std::string& tap_id) const {
    return analysis_manager_.Snapshot(tap_id);
}

std::vector<analysis::AnalysisManager::TapSnapshot> SessionManager::AnalysisTapSnapshots() const {
    return analysis_manager_.Snapshots();
}

std::optional<analysis::AnalysisResult> SessionManager::AnalysisResultNearPts(const std::string& tap_id,
                                                                              std::int64_t pts,
                                                                              std::int64_t tolerance_ns) const {
    return analysis_manager_.ResultNearPts(tap_id, pts, tolerance_ns);
}

std::optional<analysis::AnalysisResult> SessionManager::WaitAnalysisResultNearPts(
    const std::string& tap_id,
    std::int64_t pts,
    std::int64_t tolerance_ns,
    std::chrono::milliseconds timeout) const {
    return analysis_manager_.WaitResultNearPts(tap_id, pts, tolerance_ns, timeout);
}

std::optional<analysis::RawVideoFrame> SessionManager::AnalysisLatestFrame(const std::string& tap_id) const {
    return analysis_manager_.LatestFrame(tap_id);
}

std::optional<analysis::AnalysisManager::LatestFrameResult> SessionManager::AnalysisLatestFrameAndResult(
    const std::string& tap_id) const {
    return analysis_manager_.LatestFrameAndResult(tap_id);
}

std::size_t SessionManager::ActiveAnalysisTapCount() const {
    return analysis_manager_.ActiveTapCount();
}

void SessionManager::ScheduleIdleCleanup(StreamKey stream_key) const {
    // file/VOD stream은 짧은 grace period를 둬 연속 요청 시 재시작 비용을 줄인다.
    std::thread([this, key = std::move(stream_key)] {
        std::this_thread::sleep_for(std::chrono::milliseconds(app::GetAppConfig().idle_grace_period_ms));
        if (registry_.TryRemoveIfIdle(key)) {
            TraceSessionEvent("idle cleanup removed key=" + key);
            resource_guard_.ReleaseStream();
        }
    }).detach();
}

void SessionManager::RecordSourceReconnect(const StreamKey& stream_key) {
    std::lock_guard lock(mu_);
    auto& stats = source_reconnect_stats_[stream_key];
    stats.stream_key = stream_key;
    ++stats.reconnect_count;
    stats.last_reconnect_at_ms = NowUnixMs();
}

}  // namespace core

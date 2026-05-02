// 파일 요약: 클라이언트 요청을 SharedStream과 source worker에 연결하는 orchestration 구현이다.
// 동작 요약: 동일 source dedup, resource admission, egress session 생성, analysis tap 생성을 조율한다.
// 동작 요약: RTSP/WebRTC/HTTP API가 공통으로 사용하는 session lifecycle 중심부다.
#include "core/session_manager.h"

#include <chrono>
#include <mutex>

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

analysis::AnalysisContext BuildAnalysisContext(const media::IngressRequest& request,
                                               const media::SourceSpec& source_spec) {
    analysis::AnalysisContext context;
    context.source_kind = media::ToString(source_spec.kind);
    context.route = request.protocol.empty() ? "*" : request.protocol;
    context.client_id = request.client_id;
    if (const auto it = request.query.find("vaRule"); it != request.query.end()) {
        context.va_rule_id = it->second;
    }
    return context;
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
            // No-op here: this stream was never counted in active_streams_.
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
    auto attach_result = analysis_manager_.AttachStream(key, acquired.stream, std::move(profile), context);
    if (!attach_result.ok) {
        if (acquired.created) {
            if (registry_.TryRemoveIfIdle(key)) {
                resource_guard_.ReleaseStream();
            }
        }
        return {.ok = false,
                .message = attach_result.message.empty() ? "failed to attach analysis tap" : attach_result.message};
    }

    if (acquired.created || !acquired.stream->IsSourceRunning()) {
        auto worker = CreateSourceWorker(*source_spec);
        std::string source_error;
        bool source_started = false;
        if (!acquired.stream->StartSource(std::move(worker), &source_error, &source_started)) {
            analysis_manager_.Detach(attach_result.tap_id);
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
    }

    {
        std::lock_guard lock(mu_);
        analysis_taps_[attach_result.tap_id] = AnalysisTapEntry{
            .stream_key = key,
            .source_kind = source_spec->kind,
        };
    }
    runtime_debug::RecordAnalysisTapAttached(attach_result.tap_id);

    return {.ok = true,
            .message = "ok",
            .tap_id = attach_result.tap_id,
            .stream_key = key,
            .stream_created = acquired.created};
}

bool SessionManager::DetachAnalysisTap(const std::string& tap_id) {
    AnalysisTapEntry entry;
    {
        std::lock_guard lock(mu_);
        const auto it = analysis_taps_.find(tap_id);
        if (it == analysis_taps_.end()) {
            return false;
        }
        entry = it->second;
        analysis_taps_.erase(it);
    }

    analysis_manager_.Detach(tap_id);
    runtime_debug::RecordAnalysisTapDetached(tap_id);
    if (entry.source_kind != media::SourceSpec::Kind::File) {
        if (registry_.TryRemoveIfIdle(entry.stream_key)) {
            TraceSessionEvent("analysis cleanup removed live key=" + entry.stream_key);
            resource_guard_.ReleaseStream();
        }
        return true;
    }

    ScheduleIdleCleanup(entry.stream_key);
    return true;
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

}  // namespace core

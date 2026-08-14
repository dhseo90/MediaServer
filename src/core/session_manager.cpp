// 파일 요약: 클라이언트 요청을 SharedStream과 source worker에 연결하는 orchestration 구현이다.
// 동작 요약: 동일 source dedup, resource admission, egress session 생성, analysis tap 생성을 조율한다.
// 동작 요약: RTSP/WebRTC/HTTP API가 공통으로 사용하는 session lifecycle 중심부다.
#include "core/session_manager.h"

#include <algorithm>
#include <chrono>
#include <mutex>

#include "app_config.h"
#include "core/runtime_debug_counters.h"
#include "core/stream_key.h"

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
    const auto source_spec = ParseSourceSpec(request, &parse_error);
    if (!source_spec.has_value()) {
        resource_guard_.ReleaseSession();
        return {.ok = false,
                .message = parse_error.empty() ? "invalid source spec" : parse_error,
                .stream = nullptr};
    }

    // 동일한 원본 URI/file/source id는 같은 StreamKey로 묶어 source worker를 하나만 띄운다.
    const StreamKey key = BuildStreamKey(*source_spec);
    StreamRegistry::AcquireResult acquired;
    {
        std::lock_guard acquire_lock(stream_acquire_mu_);
        acquired = registry_.Acquire(key, *source_spec);
        if (acquired.created && !resource_guard_.AdmitStream()) {
            registry_.ReleaseLeaseAndTryRemoveIfIdle(key);
            resource_guard_.ReleaseSession();
            return {.ok = false, .message = "stream limit exceeded", .stream = nullptr};
        }
    }
    TraceSessionEvent("acquire key=" + key +
                      " created=" + (acquired.created ? std::string("yes") : std::string("no")) +
                      " source_running=" +
                      (acquired.stream->IsSourceRunning() ? std::string("yes") : std::string("no")) +
                      " client=" + request.client_id);

    // source를 먼저 시작하면 빠른 VOD/HTTP source의 첫 keyframe이 사라질 수 있으므로
    // subscriber를 먼저 연결해 RTSP/WebRTC egress의 pending queue가 초기 샘플을 받을 수 있게 한다.
    if (!acquired.stream->AddSubscriber(request.client_id, std::move(callback))) {
        if (registry_.ReleaseLeaseAndTryRemoveIfIdle(key)) {
            resource_guard_.ReleaseStream();
        }
        resource_guard_.ReleaseSession();
        return {.ok = false, .message = "duplicate session id", .stream = nullptr};
    }
    registry_.ReleaseLease(key);

    // 새 stream이거나 이전 worker가 죽은 stream이면 SourceWorker를 새로 시작한다.
    if (acquired.created || !acquired.stream->IsSourceRunning()) {
        auto worker = CreateSourceWorker(*source_spec);
        std::string source_error;
        const std::string start_reason =
            acquired.created ? std::string("new-stream") : std::string("source-not-running");
        bool source_started = false;
        if (!acquired.stream->StartSource(std::move(worker), &source_error, &source_started)) {
            acquired.stream->RemoveSubscriber(request.client_id);
            if (registry_.TryRemoveIfIdle(key)) {
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
    snapshot.active_analysis_taps = AuxiliaryRuntimeSnapshot().active_consumers;
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
    const auto auxiliary = AuxiliaryRuntimeSnapshot();
    std::vector<std::pair<StreamKey, std::shared_ptr<SharedStream>>> streams;
    {
        std::lock_guard lock(mu_);
        streams.reserve(sessions_.size() + auxiliary.streams.size());
        for (const auto& [_, entry] : sessions_) {
            if (entry.stream != nullptr) {
                streams.emplace_back(entry.stream_key, entry.stream);
            }
        }
    }
    for (const auto& entry : auxiliary.streams) {
        if (entry.stream != nullptr) {
            streams.emplace_back(entry.stream_key, entry.stream);
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

std::vector<SessionManager::SourceEgressStats> SessionManager::SourceEgressStatsSnapshot() const {
    const auto auxiliary = AuxiliaryRuntimeSnapshot();
    std::unordered_map<StreamKey, SourceEgressStats> stats_by_stream;
    {
        std::lock_guard lock(mu_);
        for (const auto& [_, entry] : sessions_) {
            auto& stats = stats_by_stream[entry.stream_key];
            stats.stream_key = entry.stream_key;
            ++stats.session_count;
        }
    }
    for (const auto& entry : auxiliary.streams) {
        auto& stats = stats_by_stream[entry.stream_key];
        stats.stream_key = entry.stream_key;
        stats.analysis_tap_count += entry.consumer_count;
    }

    std::vector<SourceEgressStats> stats;
    stats.reserve(stats_by_stream.size());
    for (const auto& [_, item] : stats_by_stream) {
        stats.push_back(item);
    }
    std::sort(stats.begin(), stats.end(), [](const auto& lhs, const auto& rhs) {
        return lhs.stream_key < rhs.stream_key;
    });
    return stats;
}

SessionManager::AuxiliaryStreamHandle SessionManager::AcquireAuxiliaryStream(
    const media::IngressRequest& request) {
    std::string parse_error;
    const auto source_spec = ParseSourceSpec(request, &parse_error);
    if (!source_spec.has_value()) {
        return {.ok = false,
                .message = parse_error.empty() ? "invalid source spec" : parse_error};
    }

    const StreamKey key = BuildStreamKey(*source_spec);
    StreamRegistry::AcquireResult acquired;
    {
        std::lock_guard acquire_lock(stream_acquire_mu_);
        acquired = registry_.Acquire(key, *source_spec);
        if (acquired.created && !resource_guard_.AdmitStream()) {
            registry_.ReleaseLeaseAndTryRemoveIfIdle(key);
            return {.ok = false, .message = "stream limit exceeded"};
        }
    }
    TraceSessionEvent("auxiliary acquire key=" + key +
                      " created=" + (acquired.created ? std::string("yes") : std::string("no")) +
                      " source_running=" +
                      (acquired.stream->IsSourceRunning() ? std::string("yes") : std::string("no")) +
                      " client=" + request.client_id);

    return {.ok = true,
            .message = "ok",
            .stream_key = key,
            .stream = acquired.stream,
            .source_spec = *source_spec,
            .stream_created = acquired.created};
}

bool SessionManager::StartAuxiliaryStream(const AuxiliaryStreamHandle& handle,
                                          std::string* error_message) {
    if (!handle.ok || handle.stream == nullptr) {
        if (error_message != nullptr) {
            *error_message = handle.message.empty() ? "invalid auxiliary stream handle" : handle.message;
        }
        return false;
    }
    if (handle.stream_created || !handle.stream->IsSourceRunning()) {
        auto worker = CreateSourceWorker(handle.source_spec);
        std::string source_error;
        bool source_started = false;
        if (!handle.stream->StartSource(std::move(worker), &source_error, &source_started)) {
            if (error_message != nullptr) {
                *error_message = source_error.empty() ? "failed to start source worker" : source_error;
            }
            return false;
        }
        TraceSessionEvent(std::string(source_started ? "auxiliary started" : "auxiliary reused") +
                          " source worker key=" + handle.stream_key);
        if (!handle.stream_created && source_started) {
            RecordSourceReconnect(handle.stream_key);
        }
    }
    return true;
}

void SessionManager::DiscardAuxiliaryStream(const AuxiliaryStreamHandle& handle) {
    if (registry_.ReleaseLeaseAndTryRemoveIfIdle(handle.stream_key)) {
        resource_guard_.ReleaseStream();
    }
}

void SessionManager::ReleaseAuxiliaryStreamWhenIdle(const AuxiliaryStreamHandle& handle) {
    if (handle.source_spec.kind != media::SourceSpec::Kind::File) {
        if (registry_.ReleaseLeaseAndTryRemoveIfIdle(handle.stream_key)) {
            TraceSessionEvent("auxiliary cleanup removed live key=" + handle.stream_key);
            resource_guard_.ReleaseStream();
        }
        return;
    }
    if (registry_.ReleaseLease(handle.stream_key)) {
        ScheduleIdleCleanup(handle.stream_key);
    }
}

void SessionManager::SetAuxiliaryStreamRuntimeProvider(AuxiliaryStreamRuntimeProvider provider) {
    std::unique_lock lock(auxiliary_stream_runtime_provider_mu_);
    auxiliary_stream_runtime_provider_closing_ = true;
    auxiliary_stream_runtime_provider_ = {};
    auxiliary_stream_runtime_provider_cv_.wait(lock, [this] {
        return auxiliary_stream_runtime_provider_calls_ == 0;
    });
    auxiliary_stream_runtime_provider_ = std::move(provider);
    auxiliary_stream_runtime_provider_closing_ = false;
}

SessionManager::AuxiliaryStreamRuntimeSnapshot SessionManager::AuxiliaryRuntimeSnapshot() const {
    AuxiliaryStreamRuntimeProvider provider;
    {
        std::lock_guard lock(auxiliary_stream_runtime_provider_mu_);
        if (auxiliary_stream_runtime_provider_closing_) {
            return {};
        }
        provider = auxiliary_stream_runtime_provider_;
        if (!provider) {
            return {};
        }
        ++auxiliary_stream_runtime_provider_calls_;
    }

    AuxiliaryStreamRuntimeSnapshot snapshot;
    try {
        snapshot = provider();
    } catch (...) {
        {
            std::lock_guard lock(auxiliary_stream_runtime_provider_mu_);
            --auxiliary_stream_runtime_provider_calls_;
        }
        auxiliary_stream_runtime_provider_cv_.notify_all();
        throw;
    }
    {
        std::lock_guard lock(auxiliary_stream_runtime_provider_mu_);
        --auxiliary_stream_runtime_provider_calls_;
    }
    auxiliary_stream_runtime_provider_cv_.notify_all();
    return snapshot;
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

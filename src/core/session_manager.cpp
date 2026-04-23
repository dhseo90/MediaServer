// 파일 용도: 클라이언트 요청을 dedup된 SharedStream에 연결하고 SourceWorker 시작/정리를 조율한다.
#include "core/session_manager.h"

#include <chrono>
#include <mutex>

#include "app_config.h"
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

#include "core/session_manager.h"

#include <chrono>

#include "app_config.h"
#include "core/stream_key.h"

#include <iostream>

namespace core {

namespace {

void TraceSessionEvent(const std::string& message) {
    if (app::GetAppConfig().session_trace) {
        std::cerr << "[session] " << message << "\n";
    }
}

}  // namespace

SessionManager::SessionManager(StreamRegistry& registry, ResourceGuard& resource_guard)
    : registry_(registry), resource_guard_(resource_guard) {}

SessionManager::CreateResult SessionManager::CreateSession(const media::IngressRequest& request,
                                                           SharedStream::SubscriberCallback callback) {
    if (!resource_guard_.AdmitSession()) {
        return {.ok = false, .message = "session limit exceeded", .stream = nullptr};
    }

    const auto source_spec = ingress::ParseSourceSpec(request);
    if (!source_spec.has_value()) {
        resource_guard_.ReleaseSession();
        return {.ok = false, .message = "invalid source spec", .stream = nullptr};
    }

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

    if (!acquired.stream->AddSubscriber(request.client_id, std::move(callback))) {
        if (acquired.created) {
            registry_.TryRemoveIfIdle(key);
            resource_guard_.ReleaseStream();
        }
        resource_guard_.ReleaseSession();
        return {.ok = false, .message = "duplicate session id", .stream = nullptr};
    }

    if (acquired.created || !acquired.stream->IsSourceRunning()) {
        auto worker = CreateSourceWorker(*source_spec);
        std::string source_error;
        TraceSessionEvent("start source worker key=" + key +
                          " reason=" + (acquired.created ? std::string("new-stream")
                                                         : std::string("source-not-running")));
        if (!acquired.stream->StartSource(std::move(worker), &source_error)) {
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
    std::thread([this, key = std::move(stream_key)] {
        std::this_thread::sleep_for(std::chrono::milliseconds(app::GetAppConfig().idle_grace_period_ms));
        if (registry_.TryRemoveIfIdle(key)) {
            TraceSessionEvent("idle cleanup removed key=" + key);
            resource_guard_.ReleaseStream();
        }
    }).detach();
}

}  // namespace core

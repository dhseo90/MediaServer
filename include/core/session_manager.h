// 파일 요약: 요청을 source worker, SharedStream, egress session으로 연결하는 관리자를 선언한다.
// 동작 요약: RTSP/WebRTC session 생성, WebRTC source publish 소비, analysis tap API를 제공한다.
// 동작 요약: 서버 런타임에서 가장 바깥 orchestration 계약이다.
#pragma once

#include <condition_variable>

#include "core/resource_guard.h"
#include "core/source_request_parser.h"
#include "core/source_factory.h"
#include "core/stream_registry.h"
#include "media_types.h"
#include "stdafx.h"

namespace core {

class SessionManager {
public:
    struct CreateResult {
        bool ok{false};
        std::string message;
        StreamKey stream_key;
        std::shared_ptr<SharedStream> stream;
        bool stream_created{false};
    };

    struct RuntimeStateSnapshot {
        std::size_t active_sessions{0};
        std::size_t resource_active_sessions{0};
        std::size_t resource_active_streams{0};
        std::size_t registry_active_streams{0};
        std::size_t active_analysis_taps{0};
    };

    struct SourceReconnectStats {
        StreamKey stream_key;
        int reconnect_count{0};
        std::int64_t last_reconnect_at_ms{0};
    };

    struct SourceDescriptorSnapshot {
        StreamKey stream_key;
        media::StreamDescriptor descriptor;
    };

    struct SourceEgressStats {
        StreamKey stream_key;
        std::size_t session_count{0};
        std::size_t analysis_tap_count{0};
    };

    struct AuxiliaryStreamHandle {
        bool ok{false};
        std::string message;
        StreamKey stream_key;
        std::shared_ptr<SharedStream> stream;
        media::SourceSpec source_spec;
        bool stream_created{false};
    };

    struct AuxiliaryStreamEntry {
        StreamKey stream_key;
        std::shared_ptr<SharedStream> stream;
        std::size_t consumer_count{0};
    };

    struct AuxiliaryStreamRuntimeSnapshot {
        std::size_t active_consumers{0};
        std::vector<AuxiliaryStreamEntry> streams;
    };

    using AuxiliaryStreamRuntimeProvider = std::function<AuxiliaryStreamRuntimeSnapshot()>;

    SessionManager(StreamRegistry& registry, ResourceGuard& resource_guard);
    ~SessionManager() = default;

    CreateResult CreateSession(const media::IngressRequest& request, SharedStream::SubscriberCallback callback);
    bool CloseSession(const std::string& session_id);
    std::size_t ActiveSessionCount() const;
    // 다채널 검증에서 session 수와 dedup stream 수가 기대대로 움직이는지 확인한다.
    RuntimeStateSnapshot GetRuntimeStateSnapshot() const;
    std::vector<SourceReconnectStats> SourceReconnectStatsSnapshot() const;
    std::vector<SourceDescriptorSnapshot> SourceDescriptorSnapshots() const;
    std::vector<SourceEgressStats> SourceEgressStatsSnapshot() const;
    AuxiliaryStreamHandle AcquireAuxiliaryStream(const media::IngressRequest& request);
    bool StartAuxiliaryStream(const AuxiliaryStreamHandle& handle, std::string* error_message);
    void DiscardAuxiliaryStream(const AuxiliaryStreamHandle& handle);
    void ReleaseAuxiliaryStreamWhenIdle(const AuxiliaryStreamHandle& handle);
    void SetAuxiliaryStreamRuntimeProvider(AuxiliaryStreamRuntimeProvider provider);

private:
    struct SessionEntry {
        StreamKey stream_key;
        std::shared_ptr<SharedStream> stream;
    };

    void ScheduleIdleCleanup(StreamKey stream_key) const;
    void RecordSourceReconnect(const StreamKey& stream_key);
    AuxiliaryStreamRuntimeSnapshot AuxiliaryRuntimeSnapshot() const;

    StreamRegistry& registry_;
    ResourceGuard& resource_guard_;
    mutable std::mutex mu_;
    std::mutex stream_acquire_mu_;
    std::unordered_map<std::string, SessionEntry> sessions_;
    std::unordered_map<StreamKey, SourceReconnectStats> source_reconnect_stats_;
    mutable std::mutex auxiliary_stream_runtime_provider_mu_;
    mutable std::condition_variable auxiliary_stream_runtime_provider_cv_;
    mutable std::size_t auxiliary_stream_runtime_provider_calls_{0};
    mutable bool auxiliary_stream_runtime_provider_closing_{false};
    AuxiliaryStreamRuntimeProvider auxiliary_stream_runtime_provider_;
};

}  // namespace core

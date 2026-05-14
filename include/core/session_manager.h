// 파일 요약: 요청을 source worker, SharedStream, egress session으로 연결하는 관리자를 선언한다.
// 동작 요약: RTSP/WebRTC session 생성, WebRTC source publish 소비, analysis tap API를 제공한다.
// 동작 요약: 서버 런타임에서 가장 바깥 orchestration 계약이다.
#pragma once

#include "analysis/analysis_manager.h"
#include "core/resource_guard.h"
#include "core/source_factory.h"
#include "core/stream_registry.h"
#include "ingress/request_parser.h"
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

    struct AnalysisTapResult {
        bool ok{false};
        std::string message;
        std::string tap_id;
        StreamKey stream_key;
        bool stream_created{false};
        bool reused{false};
        std::string reuse_key;
        std::size_t ref_count{0};
    };

    struct AnalysisTapDetachResult {
        bool ok{false};
        bool removed{false};
        std::string tap_id;
        std::string reuse_key;
        std::size_t ref_count{0};
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
    AnalysisTapResult AttachAnalysisTap(const media::IngressRequest& request, analysis::AnalysisProfile profile);
    AnalysisTapDetachResult DetachAnalysisTapRef(const std::string& tap_id);
    bool DetachAnalysisTap(const std::string& tap_id);
    std::optional<analysis::AnalysisManager::TapSnapshot> AnalysisTapSnapshot(const std::string& tap_id) const;
    std::vector<analysis::AnalysisManager::TapSnapshot> AnalysisTapSnapshots() const;
    std::optional<analysis::AnalysisResult> AnalysisResultNearPts(const std::string& tap_id,
                                                                  std::int64_t pts,
                                                                  std::int64_t tolerance_ns) const;
    std::optional<analysis::AnalysisResult> WaitAnalysisResultNearPts(const std::string& tap_id,
                                                                      std::int64_t pts,
                                                                      std::int64_t tolerance_ns,
                                                                      std::chrono::milliseconds timeout) const;
    std::optional<analysis::RawVideoFrame> AnalysisLatestFrame(const std::string& tap_id) const;
    std::optional<analysis::AnalysisManager::LatestFrameResult> AnalysisLatestFrameAndResult(
        const std::string& tap_id) const;
    std::size_t ActiveAnalysisTapCount() const;

private:
    struct SessionEntry {
        StreamKey stream_key;
        std::shared_ptr<SharedStream> stream;
    };

    struct AnalysisTapEntry {
        StreamKey stream_key;
        std::shared_ptr<SharedStream> stream;
        media::SourceSpec::Kind source_kind{media::SourceSpec::Kind::File};
        std::string reuse_key;
        std::size_t ref_count{0};
    };

    void ScheduleIdleCleanup(StreamKey stream_key) const;
    void RecordSourceReconnect(const StreamKey& stream_key);

    StreamRegistry& registry_;
    ResourceGuard& resource_guard_;
    analysis::AnalysisManager analysis_manager_;
    mutable std::mutex mu_;
    std::unordered_map<std::string, SessionEntry> sessions_;
    std::unordered_map<std::string, AnalysisTapEntry> analysis_taps_;
    std::unordered_map<StreamKey, SourceReconnectStats> source_reconnect_stats_;
};

}  // namespace core

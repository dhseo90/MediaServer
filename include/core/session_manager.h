// 파일 용도: 요청을 SharedStream과 SourceWorker에 연결하고 세션 생명주기를 관리하는 SessionManager를 선언한다.
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
    };

    SessionManager(StreamRegistry& registry, ResourceGuard& resource_guard);
    ~SessionManager() = default;

    CreateResult CreateSession(const media::IngressRequest& request, SharedStream::SubscriberCallback callback);
    bool CloseSession(const std::string& session_id);
    std::size_t ActiveSessionCount() const;
    AnalysisTapResult AttachAnalysisTap(const media::IngressRequest& request, analysis::AnalysisProfile profile);
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
        media::SourceSpec::Kind source_kind{media::SourceSpec::Kind::File};
    };

    void ScheduleIdleCleanup(StreamKey stream_key) const;

    StreamRegistry& registry_;
    ResourceGuard& resource_guard_;
    analysis::AnalysisManager analysis_manager_;
    mutable std::mutex mu_;
    std::unordered_map<std::string, SessionEntry> sessions_;
    std::unordered_map<std::string, AnalysisTapEntry> analysis_taps_;
};

}  // namespace core

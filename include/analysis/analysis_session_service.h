// 파일 요약: 분석 tap과 media egress 분석 결속을 소유하는 application service를 선언한다.
// 동작 요약: core SessionManager의 generic auxiliary stream 계약 위에서 분석 수명주기와 RTSP port를 제공한다.
#pragma once

#include <chrono>
#include <optional>
#include <string>
#include <unordered_map>
#include <vector>

#include "analysis/analysis_manager.h"
#include "core/media_analysis_port.h"
#include "core/session_manager.h"

namespace analysis {

class AnalysisSessionService final : public core::MediaAnalysisPort {
public:
    struct AnalysisTapResult {
        bool ok{false};
        std::string message;
        std::string tap_id;
        core::StreamKey stream_key;
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

    explicit AnalysisSessionService(core::SessionManager& session_manager);
    ~AnalysisSessionService() override;

    AnalysisSessionService(const AnalysisSessionService&) = delete;
    AnalysisSessionService& operator=(const AnalysisSessionService&) = delete;

    AnalysisTapResult AttachAnalysisTap(const media::IngressRequest& request, AnalysisProfile profile);
    AnalysisTapDetachResult DetachAnalysisTapRef(const std::string& tap_id);
    bool DetachAnalysisTap(const std::string& tap_id);
    std::optional<AnalysisManager::TapSnapshot> AnalysisTapSnapshot(const std::string& tap_id) const;
    std::vector<AnalysisManager::TapSnapshot> AnalysisTapSnapshots() const;
    std::optional<AnalysisResult> AnalysisResultNearPts(const std::string& tap_id,
                                                        std::int64_t pts,
                                                        std::int64_t tolerance_ns) const;
    std::optional<AnalysisResult> WaitAnalysisResultNearPts(const std::string& tap_id,
                                                            std::int64_t pts,
                                                            std::int64_t tolerance_ns,
                                                            std::chrono::milliseconds timeout) const;
    std::optional<RawVideoFrame> AnalysisLatestFrame(const std::string& tap_id) const;
    std::optional<AnalysisManager::LatestFrameResult> AnalysisLatestFrameAndResult(
        const std::string& tap_id) const;
    std::size_t ActiveAnalysisTapCount() const;
    core::SessionManager::AuxiliaryStreamRuntimeSnapshot AuxiliaryStreamRuntimeSnapshot() const;

    core::RtspAnalysisBinding PrepareRtsp(const media::IngressRequest& request) override;
    void DetachRtsp(const std::string& tap_id) override;

private:
    struct AnalysisTapEntry {
        core::SessionManager::AuxiliaryStreamHandle stream_handle;
        std::string reuse_key;
        std::size_t ref_count{0};
    };

    void DrainAnalysisTaps();

    core::SessionManager& session_manager_;
    AnalysisManager analysis_manager_;
    std::mutex attach_mu_;
    mutable std::mutex mu_;
    bool closing_{false};
    std::unordered_map<std::string, AnalysisTapEntry> analysis_taps_;
};

}  // namespace analysis

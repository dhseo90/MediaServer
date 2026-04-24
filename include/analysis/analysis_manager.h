// 파일 용도: SharedStream에 분석 tap을 붙이고 detector 실행 상태와 최신 결과를 관리한다.
#pragma once

#include "analysis/detector.h"
#include "analysis/raw_video_decoder.h"
#include "core/shared_stream.h"
#include "core/stream_key.h"

namespace analysis {

class AnalysisManager {
public:
    struct AttachResult {
        bool ok{false};
        std::string message;
        std::string tap_id;
    };

    struct TapSnapshot {
        std::string tap_id;
        core::StreamKey stream_key;
        std::string profile_key;
        std::size_t received_video_packets{0};
        std::size_t decoded_frames{0};
        std::size_t analyzed_packets{0};
        std::size_t dropped_packets{0};
        std::size_t decoder_errors{0};
        std::optional<AnalysisResult> latest_result;
    };

    AnalysisManager() = default;
    ~AnalysisManager();

    AnalysisManager(const AnalysisManager&) = delete;
    AnalysisManager& operator=(const AnalysisManager&) = delete;

    AttachResult AttachStream(const core::StreamKey& stream_key,
                              const std::shared_ptr<core::SharedStream>& stream,
                              AnalysisProfile profile = {});
    bool Detach(const std::string& tap_id);
    void DetachAll();

    std::optional<AnalysisResult> LatestResult(const std::string& tap_id) const;
    std::optional<TapSnapshot> Snapshot(const std::string& tap_id) const;
    std::size_t ActiveTapCount() const;

private:
    struct AnalysisTap {
        std::string tap_id;
        core::StreamKey stream_key;
        AnalysisProfile profile;
        std::string profile_key;
        std::weak_ptr<core::SharedStream> stream;
        std::unique_ptr<Detector> detector;
        std::unique_ptr<RawVideoDecoder> decoder;
        media::CodecId decoder_codec{media::CodecId::Unknown};
        std::string decoder_track_id;

        mutable std::mutex mu;
        std::optional<AnalysisResult> latest_result;
        std::size_t received_video_packets{0};
        std::size_t decoded_frames{0};
        std::size_t analyzed_packets{0};
        std::size_t dropped_packets{0};
        std::size_t decoder_errors{0};
    };

    static void HandlePacket(const std::weak_ptr<AnalysisTap>& weak_tap, const media::Packet& packet);
    static void HandleFrame(const std::weak_ptr<AnalysisTap>& weak_tap, RawVideoFrame frame);
    static media::TrackInfo ResolveVideoTrack(const std::shared_ptr<AnalysisTap>& tap, const media::Packet& packet);

    mutable std::mutex mu_;
    std::unordered_map<std::string, std::shared_ptr<AnalysisTap>> taps_;
    std::atomic<std::uint64_t> next_tap_id_{1};
};

}  // namespace analysis

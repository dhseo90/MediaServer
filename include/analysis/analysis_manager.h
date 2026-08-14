// 파일 요약: SharedStream analysis tap과 detector worker를 관리하는 API를 선언한다.
// 동작 요약: tap 생성/삭제, metadata/snapshot/overlay 조회, 최신 결과 snapshot을 제공한다.
// 동작 요약: HTTP API와 egress overlay probe가 분석 상태를 공유하는 중심 계약이다.
#pragma once

#include <chrono>
#include <condition_variable>
#include <deque>

#include "analysis/detector.h"
#include "analysis/object_tracker.h"
#include "analysis/raw_video_decoder.h"
#include "analysis/track_state_manager.h"
#include "core/shared_stream.h"
#include "core/analysis_runtime_port.h"

namespace analysis {

class AnalysisManager {
public:
    struct AttachResult {
        bool ok{false};
        std::string message;
        std::string tap_id;
        bool reused{false};
        std::string reuse_key;
        std::size_t ref_count{0};
    };

    struct DetachResult {
        bool ok{false};
        bool removed{false};
        std::string tap_id;
        std::string reuse_key;
        std::size_t ref_count{0};
    };

    struct TapSnapshot {
        std::string tap_id;
        core::StreamKey stream_key;
        std::string profile_key;
        std::string reuse_key;
        std::size_t ref_count{0};
        std::size_t reuse_attach_count{0};
        std::int64_t last_used_age_ms{0};
        AnalysisContext context;
        std::string profile_selection_source;
        std::string selected_by_rule_id;
        int selected_rule_priority{0};
        int selected_rule_specificity{0};
        std::string detector_type;
        std::size_t received_video_packets{0};
        std::size_t decoded_frames{0};
        std::size_t sampled_frames{0};
        std::size_t analyzed_packets{0};
        std::size_t dropped_packets{0};
        std::size_t sample_dropped_frames{0};
        std::size_t queue_dropped_frames{0};
        std::size_t sample_interval_dropped_frames{0};
        std::size_t stale_queue_dropped_frames{0};
        std::size_t decoder_errors{0};
        std::size_t pending_frames{0};
        std::size_t peak_pending_frames{0};
        double effective_decoded_fps{0.0};
        double effective_sampled_fps{0.0};
        double effective_analyzed_fps{0.0};
        double last_queue_wait_ms{0.0};
        double average_queue_wait_ms{0.0};
        double max_queue_wait_ms{0.0};
        double last_analysis_ms{0.0};
        double average_analysis_ms{0.0};
        double max_analysis_ms{0.0};
        double last_inference_ms{0.0};
        double average_inference_ms{0.0};
        double max_inference_ms{0.0};
        int target_fps{0};
        std::size_t max_queue_size{0};
        int frame_sample_interval{1};
        int max_frame_age_ms{0};
        int model_input_width{0};
        int model_input_height{0};
        int debug_detector_delay_ms{0};
        float confidence_threshold{0.0F};
        float nms_threshold{0.0F};
        bool tracking_enabled{false};
        std::string tracking_policy_tracker{"lite"};
        std::string tracking_policy_effective_tracker{"lite"};
        std::string tracking_policy_reid{"off"};
        std::string tracking_policy_source{"default"};
        std::string tracking_policy_rule_id;
        std::string tracking_policy_fallback_reason;
        bool tracking_policy_specified{false};
        std::vector<std::string> tracking_class_labels;
        TrackStateMetrics track_state_metrics;
        bool adaptive_tuning_enabled{false};
        bool adaptive_input_size_enabled{false};
        bool adaptive_input_size_disabled{false};
        int adaptive_min_fps{0};
        int adaptive_max_fps{0};
        int adaptive_min_input_width{0};
        int adaptive_min_input_height{0};
        int adaptive_max_input_width{0};
        int adaptive_max_input_height{0};
        std::size_t adaptive_downshift_count{0};
        std::size_t adaptive_upshift_count{0};
        std::string adaptive_state;
        bool has_latest_frame{false};
        int latest_frame_width{0};
        int latest_frame_height{0};
        std::int64_t latest_frame_pts{0};
        std::int64_t latest_frame_age_ms{0};
        std::int64_t latest_result_age_ms{0};
        std::optional<AnalysisResult> latest_result;
    };

    struct LatestFrameResult {
        RawVideoFrame frame;
        std::optional<AnalysisResult> result;
    };

    AnalysisManager() = default;
    ~AnalysisManager();

    AnalysisManager(const AnalysisManager&) = delete;
    AnalysisManager& operator=(const AnalysisManager&) = delete;

    AttachResult AttachStream(const core::StreamKey& stream_key,
                              const std::shared_ptr<core::SharedStream>& stream,
                              AnalysisProfile profile = {},
                              AnalysisContext context = {},
                              std::string reuse_key = {});
    DetachResult Detach(const std::string& tap_id);
    void DetachAll();

    std::optional<AnalysisResult> LatestResult(const std::string& tap_id) const;
    std::optional<AnalysisResult> ResultNearPts(const std::string& tap_id,
                                                std::int64_t pts,
                                                std::int64_t tolerance_ns) const;
    std::optional<AnalysisResult> WaitResultNearPts(const std::string& tap_id,
                                                    std::int64_t pts,
                                                    std::int64_t tolerance_ns,
                                                    std::chrono::milliseconds timeout) const;
    std::optional<RawVideoFrame> LatestFrame(const std::string& tap_id) const;
    std::optional<LatestFrameResult> LatestFrameAndResult(const std::string& tap_id) const;
    std::optional<TapSnapshot> Snapshot(const std::string& tap_id) const;
    std::vector<TapSnapshot> Snapshots() const;
    std::size_t ActiveTapCount() const;

private:
    struct AnalysisTap {
        struct QueuedFrame {
            RawVideoFrame frame;
            std::chrono::steady_clock::time_point enqueued_at;
        };

        std::string tap_id;
        core::StreamKey stream_key;
        AnalysisContext context;
        AnalysisProfile profile;
        std::string profile_key;
        std::string reuse_key;
        std::size_t ref_count{1};
        std::size_t reuse_attach_count{0};
        std::weak_ptr<core::SharedStream> stream;
        std::unique_ptr<Detector> detector;
        std::unique_ptr<ObjectTracker> tracker;
        TrackStateManager track_state_manager;
        std::unique_ptr<RawVideoDecoder> decoder;
        media::CodecId decoder_codec{media::CodecId::Unknown};
        std::string decoder_track_id;

        mutable std::mutex mu;
        std::condition_variable frame_cv;
        std::condition_variable result_cv;
        std::deque<QueuedFrame> frame_queue;
        std::deque<AnalysisResult> result_history;
        std::optional<AnalysisResult> latest_result;
        std::optional<RawVideoFrame> latest_frame;
        std::size_t received_video_packets{0};
        std::size_t decoded_frames{0};
        std::size_t sampled_frames{0};
        std::size_t analyzed_packets{0};
        std::size_t dropped_packets{0};
        std::size_t sample_dropped_frames{0};
        std::size_t queue_dropped_frames{0};
        std::size_t sample_interval_dropped_frames{0};
        std::size_t stale_queue_dropped_frames{0};
        std::size_t decoder_errors{0};
        std::size_t peak_pending_frames{0};
        double last_queue_wait_ms{0.0};
        double total_queue_wait_ms{0.0};
        double max_queue_wait_ms{0.0};
        std::size_t queue_wait_samples{0};
        double last_analysis_ms{0.0};
        double total_analysis_ms{0.0};
        double max_analysis_ms{0.0};
        double last_inference_ms{0.0};
        double total_inference_ms{0.0};
        double max_inference_ms{0.0};
        std::size_t inference_samples{0};
        std::chrono::steady_clock::time_point attached_at{};
        std::chrono::steady_clock::time_point last_used_at{};
        std::chrono::steady_clock::time_point last_sampled_at{};
        std::chrono::steady_clock::time_point latest_frame_at{};
        std::chrono::steady_clock::time_point latest_result_at{};
        std::chrono::steady_clock::time_point last_adaptive_tuned_at{};
        std::atomic<std::uint64_t> next_frame_id{1};
        std::uint64_t decoded_frame_sequence{0};
        std::int64_t last_result_pts{0};
        std::size_t adaptive_last_queue_dropped_frames{0};
        std::size_t adaptive_last_stale_queue_dropped_frames{0};
        int adaptive_underloaded_streak{0};
        std::size_t adaptive_downshift_count{0};
        std::size_t adaptive_upshift_count{0};
        bool adaptive_input_size_disabled{false};
        std::string adaptive_state{"steady"};
        bool frame_worker_stop{false};
        std::thread frame_worker;
    };

    static void HandlePacket(const std::weak_ptr<AnalysisTap>& weak_tap, const media::Packet& packet);
    static void HandleFrame(const std::weak_ptr<AnalysisTap>& weak_tap, RawVideoFrame frame);
    static void AnalysisWorkerLoop(const std::weak_ptr<AnalysisTap>& weak_tap);
    static void UpdateAdaptiveTuningLocked(const std::shared_ptr<AnalysisTap>& tap,
                                           double elapsed_ms,
                                           double queue_wait_ms);
    static TapSnapshot BuildSnapshotLocked(const std::shared_ptr<AnalysisTap>& tap);
    static void DisableAdaptiveInputSizeLocked(const std::shared_ptr<AnalysisTap>& tap);
    static void StopTapRuntime(const std::shared_ptr<AnalysisTap>& tap);
    static media::TrackInfo ResolveVideoTrack(const std::shared_ptr<AnalysisTap>& tap, const media::Packet& packet);

    mutable std::mutex mu_;
    std::unordered_map<std::string, std::shared_ptr<AnalysisTap>> taps_;
    std::unordered_map<std::string, std::string> reuse_key_to_tap_id_;
    std::atomic<std::uint64_t> next_tap_id_{1};
};

}  // namespace analysis

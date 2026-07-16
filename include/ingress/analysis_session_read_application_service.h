#pragma once
// 파일 용도: 분석 세션 read/query projection의 application service 계약을 선언한다.
#include <cstddef>
#include <cstdint>
#include <optional>
#include <string>
#include <vector>

#include "ingress/image_codec_application_service.h"

namespace ingress {

struct AnalysisSessionApplicationContext {
    std::string source_kind{"*"};
    std::string route{"*"};
    std::string client_id;
    std::string va_rule_id;
    std::vector<std::string> va_rule_ids;
};

struct AnalysisSessionApplicationBox {
    float x{0.0F};
    float y{0.0F};
    float width{0.0F};
    float height{0.0F};
};

struct AnalysisSessionApplicationDetection {
    int class_id{-1};
    std::string label;
    float score{0.0F};
    AnalysisSessionApplicationBox box;
    bool detector_box_available{false};
    AnalysisSessionApplicationBox detector_box;
    std::uint64_t track_id{0};
    float association_confidence{1.0F};
    bool event_triggered{false};
    std::string event_rule_id;
    std::string event_type;
    std::string event_highlight_color{"#ffcc00"};
    int event_highlight_duration_ms{1200};
};

struct AnalysisSessionApplicationTrackTrailPoint {
    float x{0.0F};
    float y{0.0F};
    std::int64_t pts{0};
};

struct AnalysisSessionApplicationTrack {
    std::uint64_t track_id{0};
    AnalysisSessionApplicationDetection detection;
    std::uint32_t age{0};
    std::uint32_t hits{0};
    std::uint32_t missed{0};
    std::int64_t first_seen_pts{0};
    std::int64_t last_seen_pts{0};
    std::string state{"tentative"};
    std::vector<AnalysisSessionApplicationTrackTrailPoint> trail;
};

struct AnalysisSessionApplicationCloseObjectDiagnostic {
    std::uint64_t track_id{0};
    std::size_t detection_index{0};
    int class_id{-1};
    std::string class_name;
    std::string mode{"off"};
    float close_object_risk{0.0F};
    std::uint64_t nearest_same_class_track_id{0};
    float nearest_same_class_distance{0.0F};
    bool nearest_same_class_distance_available{false};
    float candidate_score{0.0F};
    float ranking_score{0.0F};
    float best_score{0.0F};
    float second_score{0.0F};
    float score_margin{1.0F};
    float center_jump{0.0F};
    bool direction_conflict{false};
    bool would_penalize{false};
    bool would_hold_reacquire{false};
    bool matched{false};
    bool rejected{false};
    std::string guard_decision{"off"};
};

struct AnalysisSessionApplicationPoseKeypoint {
    std::string name;
    float x{0.0F};
    float y{0.0F};
    float score{0.0F};
};

struct AnalysisSessionApplicationDebugLineState {
    std::string line_id;
    std::string allowed_direction{"any"};
    float previous_side{0.0F};
    float current_side{0.0F};
    bool crossed{false};
    std::string direction{"none"};
    bool raw_crossed{false};
    std::string raw_direction{"none"};
    bool direction_allowed{true};
    std::int64_t last_cross_time_ms{0};
};

struct AnalysisSessionApplicationDebugTrackState {
    std::string stream_id;
    std::string channel_id;
    std::uint64_t track_id{0};
    int class_id{-1};
    std::string class_name;
    float confidence{0.0F};
    AnalysisSessionApplicationBox bbox;
    bool ground_point_available{false};
    bool ground_point_valid{false};
    bool ground_point_fallback{true};
    float foot_point_x{0.0F};
    float foot_point_y{0.0F};
    double ground_point_x{0.0};
    double ground_point_y{0.0};
    std::string ground_point_units;
    double speed{0.0};
    bool speed_uses_ground_plane{false};
    std::string speed_units{"image_per_second"};
    std::string lifecycle_state;
    std::string current_zone;
    std::string previous_zone;
    std::int64_t entered_at_ms{0};
    std::int64_t exited_at_ms{0};
    std::int64_t dwell_time_ms{0};
    bool inside_restricted_zone{false};
    std::vector<AnalysisSessionApplicationDebugLineState> line_states;
    std::string primary_line_id;
    float line_side{0.0F};
    std::string crossing_direction{"none"};
    std::string scenario_name;
    std::string scenario_phase;
    std::string event_lifecycle;
    float association_confidence{1.0F};
    std::uint32_t missed_frame_count{0};
    float overlap_risk{0.0F};
    std::uint32_t direction_change_count{0};
    bool track_unstable{false};
    std::string track_health;
};

struct AnalysisSessionApplicationDebugScenarioTimeline {
    std::string instance_key;
    std::string stream_id;
    std::string channel_id;
    std::string rule_id;
    std::string scenario_key;
    std::string scenario_name;
    std::uint64_t track_id{0};
    int class_id{-1};
    std::string class_name;
    std::string zone_id;
    std::string line_id;
    std::string current_phase;
    std::string previous_phase;
    std::int64_t phase_entered_at_ms{-1};
    std::int64_t phase_elapsed_ms{-1};
    std::int64_t track_first_seen_at_ms{-1};
    std::int64_t track_last_seen_at_ms{-1};
    std::int64_t zone_entered_at_ms{-1};
    std::int64_t line_crossed_at_ms{-1};
    std::int64_t event_emitted_at_ms{-1};
    std::int64_t cooldown_started_at_ms{-1};
    std::int64_t cooldown_ends_at_ms{-1};
    std::int64_t cooldown_remaining_ms{-1};
    std::string last_event_id;
    std::string last_event_status;
    std::string dedupe_key;
    std::uint64_t event_emitted_count{0};
    std::uint64_t dedupe_suppressed_count{0};
    bool active{false};
};

struct AnalysisSessionApplicationDebugState {
    bool enabled{false};
    std::string stream_id;
    std::string channel_id;
    std::int64_t timestamp_ms{0};
    std::size_t track_count{0};
    std::size_t active_track_count{0};
    std::size_t lost_track_count{0};
    std::size_t reacquired_track_count{0};
    std::size_t terminated_track_count{0};
    std::size_t scenario_instance_count{0};
    std::size_t active_scenario_count{0};
    std::size_t event_state_count{0};
    std::size_t active_event_state_count{0};
    std::vector<AnalysisSessionApplicationDebugTrackState> tracks;
    std::vector<AnalysisSessionApplicationDebugScenarioTimeline> scenario_timeline;
};

struct AnalysisSessionApplicationMetricsTrackHealth {
    std::size_t unstable_track_count{0};
    std::size_t overlap_risk_track_count{0};
    std::size_t missed_frame_track_count{0};
    std::uint64_t missed_frame_total{0};
    std::uint32_t missed_frame_max{0};
    std::size_t direction_change_track_count{0};
    std::uint64_t direction_change_total{0};
    std::uint32_t direction_change_max{0};
};

struct AnalysisSessionApplicationMetricsChannel {
    std::string stream_id;
    std::string channel_id;
    std::size_t total_track_count{0};
    std::size_t active_track_count{0};
    std::size_t lost_track_count{0};
    std::size_t reacquired_track_count{0};
    std::size_t terminated_track_count{0};
    std::size_t active_scenario_count{0};
    std::size_t event_state_count{0};
    std::size_t active_event_state_count{0};
    std::uint64_t event_emitted_count{0};
    std::uint64_t event_dedup_count{0};
    AnalysisSessionApplicationMetricsTrackHealth track_health;
};

struct AnalysisSessionApplicationMetrics {
    bool enabled{false};
    std::string stream_id;
    std::string channel_id;
    std::int64_t timestamp_ms{0};
    std::size_t channel_count{0};
    std::size_t total_track_count{0};
    std::size_t active_track_count{0};
    std::size_t lost_track_count{0};
    std::size_t reacquired_track_count{0};
    std::size_t terminated_track_count{0};
    std::size_t terminated_track_cleanup_count{0};
    std::size_t active_scenario_count{0};
    std::size_t scenario_cleanup_count{0};
    std::size_t active_event_state_count{0};
    std::uint64_t event_emitted_count{0};
    std::uint64_t event_dedup_count{0};
    std::size_t event_cleanup_count{0};
    AnalysisSessionApplicationMetricsTrackHealth track_health;
    std::vector<AnalysisSessionApplicationMetricsChannel> channels;
};

struct AnalysisSessionApplicationAppearanceExtractorStats {
    bool enabled{false};
    std::string extractor_name{"noop"};
    std::string model_path;
    std::uint64_t request_count{0};
    std::uint64_t queued_count{0};
    std::uint64_t completed_count{0};
    std::uint64_t failed_count{0};
    std::uint64_t dropped_count{0};
    std::uint64_t missing_crop_count{0};
    std::uint64_t busy_drop_count{0};
    std::uint64_t queue_full_drop_count{0};
    std::uint64_t global_queue_drop_count{0};
    std::uint64_t rate_limited_count{0};
    std::uint64_t stale_drop_count{0};
    std::uint64_t total_queue_latency_ms{0};
    double last_queue_latency_ms{0.0};
    double max_queue_latency_ms{0.0};
    std::uint64_t total_inference_time_ms{0};
    double last_inference_time_ms{0.0};
    double max_inference_time_ms{0.0};
    std::string last_error;
};

struct AnalysisSessionApplicationTrackStateMetrics {
    std::size_t channel_count{0};
    std::size_t total_tracks{0};
    std::size_t active_tracks{0};
    std::size_t lost_tracks{0};
    std::size_t reacquired_tracks{0};
    std::size_t terminated_tracks{0};
    std::size_t total_observations{0};
    std::size_t total_trajectory_points{0};
    std::size_t appearance_profile_count{0};
    AnalysisSessionApplicationAppearanceExtractorStats appearance_extractor_stats;
    std::size_t max_active_tracks_per_channel{0};
    std::size_t max_tracks_per_channel{0};
    std::size_t max_observation_history{0};
    std::size_t max_trajectory_points_per_track{0};
    std::size_t cleanup_runs{0};
    std::size_t tracks_removed_by_cleanup{0};
    std::int64_t last_cleanup_time_ns{0};
    std::int64_t last_cleanup_time_ms{0};
};

struct AnalysisSessionApplicationResult {
    std::string source_key;
    std::string profile_key;
    AnalysisSessionApplicationContext context;
    std::uint64_t frame_id{0};
    std::int64_t pts{0};
    int frame_width{0};
    int frame_height{0};
    std::vector<AnalysisSessionApplicationDetection> detections;
    std::vector<AnalysisSessionApplicationTrack> tracks;
    std::vector<AnalysisSessionApplicationCloseObjectDiagnostic> close_object_diagnostics;
    std::vector<AnalysisSessionApplicationPoseKeypoint> pose_keypoints;
    bool debug_state_requested{false};
    bool debug_state_log_enabled{false};
    bool metrics_report_requested{false};
    std::optional<AnalysisSessionApplicationDebugState> debug_state;
    std::optional<AnalysisSessionApplicationMetrics> metrics_report;
};

struct AnalysisSessionApplicationSnapshot {
    std::string tap_id;
    std::string stream_key;
    std::string profile_key;
    std::string reuse_key;
    std::size_t ref_count{0};
    std::size_t reuse_attach_count{0};
    std::int64_t last_used_age_ms{0};
    AnalysisSessionApplicationContext context;
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
    AnalysisSessionApplicationTrackStateMetrics track_state_metrics;
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
    std::optional<AnalysisSessionApplicationResult> latest_result;
};

struct AnalysisSessionApplicationLatestFrameAndResult {
    ImageCodecFrame frame;
    std::optional<AnalysisSessionApplicationResult> result;
};

class AnalysisSessionReadApplicationService {
public:
    virtual ~AnalysisSessionReadApplicationService() = default;

    virtual std::optional<AnalysisSessionApplicationSnapshot> Snapshot(
        const std::string& tap_id) const = 0;
    virtual std::vector<AnalysisSessionApplicationSnapshot> Snapshots() const = 0;
    virtual std::optional<AnalysisSessionApplicationResult> WaitResultNearPts(
        const std::string& tap_id,
        std::int64_t pts,
        std::int64_t tolerance_ns,
        int timeout_ms) const = 0;
    virtual std::optional<ImageCodecFrame> LatestFrame(const std::string& tap_id) const = 0;
    virtual std::optional<AnalysisSessionApplicationLatestFrameAndResult> LatestFrameAndResult(
        const std::string& tap_id) const = 0;
    virtual std::size_t ActiveTapCount() const = 0;
};

}  // namespace ingress

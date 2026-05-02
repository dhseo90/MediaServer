// 파일 요약: 영상분석 모듈이 공유하는 frame/result/profile 타입을 정의한다.
// 동작 요약: Detection, Track, AnalysisProfile, overlay/adaptive 옵션과 profile key 생성을 포함한다.
// 동작 요약: detector, tracker, overlay, manager 사이의 데이터 계약이다.
#pragma once

#include <cstdint>
#include <sstream>

#include "stdafx.h"

namespace analysis {

enum class PixelFormat {
    Unknown,
    I420,
    RGB,
    BGR,
    Gray8,
};

struct RawVideoFrame {
    // raw decode hub가 compressed packet을 변환한 뒤 detector 입력으로 전달하는 frame이다.
    std::string source_key;
    std::string track_id;
    int width{0};
    int height{0};
    PixelFormat format{PixelFormat::Unknown};
    std::int64_t pts{0};
    std::vector<unsigned char> data;
};

struct RectF {
    // 좌표는 원본 frame 기준 normalized [0, 1] 값으로 저장한다.
    float x{0.0F};
    float y{0.0F};
    float width{0.0F};
    float height{0.0F};
};

struct Detection {
    int class_id{-1};
    std::string label;
    float score{0.0F};
    RectF box;
    // detector 원본 box를 보존해 tracker smoothing 이후 표시 위치 차이를 진단한다.
    bool detector_box_available{false};
    RectF detector_box;
    // tracker가 켜진 profile에서는 같은 객체를 frame 간 연결하기 위한 안정 ID를 채운다.
    std::uint64_t track_id{0};
    // tracker 내부 association score다. 외부 event payload에는 사용하지 않고 TrackHealth 입력으로 전달한다.
    float association_confidence{1.0F};
    // 룰 엔진에서 이벤트로 판단한 객체는 overlay renderer가 강조 표시한다.
    bool event_triggered{false};
    std::string event_rule_id;
    std::string event_type;
    std::string event_highlight_color{"#ffcc00"};
    int event_highlight_duration_ms{1200};
};

struct CloseObjectAssociationDiagnostic {
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

struct Track {
    struct TrailPoint {
        float x{0.0F};
        float y{0.0F};
        std::int64_t pts{0};
    };

    std::uint64_t track_id{0};
    Detection detection;
    std::uint32_t age{0};
    std::uint32_t hits{0};
    std::uint32_t missed{0};
    std::int64_t first_seen_pts{0};
    std::int64_t last_seen_pts{0};
    std::string state{"tentative"};
    std::vector<TrailPoint> trail;
};

struct PoseKeypoint {
    std::string name;
    float x{0.0F};
    float y{0.0F};
    float score{0.0F};
};

struct AnalysisContext {
    std::string source_kind{"*"};
    std::string route{"*"};
    std::string client_id;
    std::string va_rule_id;
};

struct AnalysisProfile {
    // 같은 source라도 profile이 다르면 detector/overlay 정책이 달라질 수 있으므로 별도 tap으로 다룬다.
    std::string profile_id{"default"};
    std::string detector_type{"dummy"};
    std::string model_path;
    std::string labels_path;
    int target_fps{5};
    std::size_t max_queue_size{2};
    int frame_sample_interval{1};
    int max_frame_age_ms{0};
    int model_input_width{640};
    int model_input_height{640};
    int max_detections{50};
    float confidence_threshold{0.35F};
    float nms_threshold{0.45F};
    bool yolo_has_objectness{false};
    std::string yolo_preprocess_mode{"letterbox"};
    std::string yolo_output_layout{"auto"};
    std::string yolo_box_format{"cxcywh"};
    std::string yolo_score_mode{"auto"};
    bool enable_object_detection{true};
    bool enable_tracking{false};
    // tracker는 기본적으로 동선 의미가 큰 카테고리 단위로 ID를 붙인다. 명시적 빈 목록은 추적 대상 없음, "*"는 전체 추적이다.
    std::vector<std::string> tracking_class_labels{"person", "vehicle"};
    bool tracking_classes_specified{false};
    bool enable_pose{false};
    bool enable_overlay{false};
    bool enable_debug_state{false};
    int debug_detector_delay_ms{0};
    bool adaptive_tuning_enabled{false};
    bool adaptive_input_size_enabled{false};
    int adaptive_min_fps{2};
    int adaptive_max_fps{0};
    int adaptive_min_input_width{320};
    int adaptive_min_input_height{320};
    int adaptive_max_input_width{0};
    int adaptive_max_input_height{0};
    int adaptive_input_step{128};
    int adaptive_cooldown_ms{3000};
    float adaptive_high_latency_ratio{0.85F};
    float adaptive_low_latency_ratio{0.35F};
    // URL에서 profile/profileId 또는 세부 튜닝값을 직접 지정했는지 기록해 registry 자동 선택과 충돌을 피한다.
    bool explicit_profile_requested{false};
    bool allow_rule_profile_override{true};
    std::string profile_selection_source{"default"};
    std::string selected_by_rule_id;
    int selected_rule_priority{0};
    int selected_rule_specificity{0};
};

inline std::string BuildProfileKey(const AnalysisProfile& profile) {
    std::ostringstream oss;
    oss << profile.profile_id << ":detector=" << profile.detector_type
        << ":model=" << (profile.model_path.empty() ? "default" : "custom")
        << ":fps=" << profile.target_fps << ":queue=" << profile.max_queue_size
        << ":sampleInterval=" << profile.frame_sample_interval
        << ":maxFrameAgeMs=" << profile.max_frame_age_ms
        << ":input=" << profile.model_input_width << "x" << profile.model_input_height
        << ":conf=" << profile.confidence_threshold
        << ":nms=" << profile.nms_threshold
        << ":preprocess=" << profile.yolo_preprocess_mode
        << ":layout=" << profile.yolo_output_layout
        << ":box=" << profile.yolo_box_format
        << ":scoreMode=" << profile.yolo_score_mode
        << ":det=" << (profile.enable_object_detection ? 1 : 0)
        << ":track=" << (profile.enable_tracking ? 1 : 0)
        << ":trackClassesSpecified=" << (profile.tracking_classes_specified ? 1 : 0)
        << ":trackClasses=";
    for (std::size_t i = 0; i < profile.tracking_class_labels.size(); ++i) {
        if (i != 0) {
            oss << ",";
        }
        oss << profile.tracking_class_labels[i];
    }
    oss
        << ":pose=" << (profile.enable_pose ? 1 : 0)
        << ":overlay=" << (profile.enable_overlay ? 1 : 0)
        << ":debugState=" << (profile.enable_debug_state ? 1 : 0)
        << ":adaptive=" << (profile.adaptive_tuning_enabled ? 1 : 0)
        << ":adaptiveInput=" << (profile.adaptive_input_size_enabled ? 1 : 0)
        << ":adaptiveFps=" << profile.adaptive_min_fps << "-" << profile.adaptive_max_fps
        << ":adaptiveInputBounds=" << profile.adaptive_min_input_width << "x" << profile.adaptive_min_input_height
        << "-" << profile.adaptive_max_input_width << "x" << profile.adaptive_max_input_height
        << ":adaptiveStep=" << profile.adaptive_input_step
        << ":adaptiveCooldown=" << profile.adaptive_cooldown_ms
        << ":delay=" << profile.debug_detector_delay_ms;
    return oss.str();
}

struct AnalysisDebugLineState {
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

struct AnalysisDebugTrackState {
    std::string stream_id;
    std::string channel_id;
    std::uint64_t track_id{0};
    int class_id{-1};
    std::string class_name;
    float confidence{0.0F};
    RectF bbox;
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
    std::vector<AnalysisDebugLineState> line_states;
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

struct AnalysisDebugState {
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
    std::vector<AnalysisDebugTrackState> tracks;
};

struct TrackHealthMetrics {
    std::size_t unstable_track_count{0};
    std::size_t overlap_risk_track_count{0};
    std::size_t missed_frame_track_count{0};
    std::uint64_t missed_frame_total{0};
    std::uint32_t missed_frame_max{0};
    std::size_t direction_change_track_count{0};
    std::uint64_t direction_change_total{0};
    std::uint32_t direction_change_max{0};
};

struct AnalysisChannelMetrics {
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
    TrackHealthMetrics track_health;
};

struct AnalysisMetricsReport {
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
    TrackHealthMetrics track_health;
    std::vector<AnalysisChannelMetrics> channels;
};

struct AnalysisResult {
    std::string source_key;
    std::string profile_key;
    AnalysisContext context;
    std::uint64_t frame_id{0};
    std::int64_t pts{0};
    int frame_width{0};
    int frame_height{0};
    std::vector<Detection> detections;
    std::vector<Track> tracks;
    std::vector<CloseObjectAssociationDiagnostic> close_object_diagnostics;
    std::vector<PoseKeypoint> pose_keypoints;
    bool debug_state_requested{false};
    bool debug_state_log_enabled{false};
    bool metrics_report_requested{false};
    std::optional<AnalysisDebugState> debug_state;
    std::optional<AnalysisMetricsReport> metrics_report;
};

}  // namespace analysis

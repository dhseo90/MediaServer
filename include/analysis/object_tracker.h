// 파일 요약: frame별 detection을 track 단위로 연결하는 lightweight tracker를 선언한다.
// 동작 요약: IoU/중심점 거리 기반 매칭 옵션, class/category whitelist, trail 상태를 제공한다.
// 동작 요약: 분석 이벤트와 overlay가 안정적인 trackId를 사용할 수 있게 한다.
#pragma once

#include "analysis/analysis_types.h"

namespace analysis {

struct ObjectAssociationScore {
    float iou_score{0.0F};
    float center_distance_score{0.0F};
    float direction_score{0.5F};
    float class_consistency_score{0.0F};
    float final_score{0.0F};
};

enum class CloseObjectGuardMode {
    Off,
    Diagnostic,
    Enforce,
};

enum class ObjectTrackerKind {
    Lite,
    KalmanLite,
    ByteTrack,
};

CloseObjectGuardMode ParseCloseObjectGuardMode(const std::string& value);
std::string CloseObjectGuardModeToString(CloseObjectGuardMode mode);

struct ObjectTrackerOptions {
    ObjectTrackerKind tracker_kind{ObjectTrackerKind::Lite};
    float min_iou{0.30F};
    float max_center_distance{0.18F};
    float iou_weight{app_config::kDefaultAnalysisTrackingIouWeight};
    float distance_weight{app_config::kDefaultAnalysisTrackingDistanceWeight};
    float direction_weight{app_config::kDefaultAnalysisTrackingDirectionWeight};
    float class_weight{app_config::kDefaultAnalysisTrackingClassWeight};
    float min_association_score{app_config::kDefaultAnalysisTrackingMinAssociationScore};
    float smoothing_alpha{app_config::kDefaultAnalysisTrackingSmoothingAlpha};
    float kalman_position_alpha{0.70F};
    float kalman_velocity_beta{0.80F};
    std::uint32_t kalman_max_prediction_frames{4};
    // ByteTrack-style association keeps low-confidence detections internal and only
    // publishes event/scene-visible tracks from high-confidence detections.
    float bytetrack_high_score_threshold{0.50F};
    float bytetrack_low_score_threshold{0.10F};
    float bytetrack_low_association_score{0.18F};
    float bytetrack_low_iou_threshold{0.10F};
    CloseObjectGuardMode close_object_guard_mode{CloseObjectGuardMode::Off};
    float close_object_distance_ratio{
        app_config::kDefaultAnalysisTrackingCloseObjectDistanceRatio};
    float close_object_overlap_threshold{
        app_config::kDefaultAnalysisTrackingCloseObjectOverlapThreshold};
    float close_object_low_margin_threshold{
        app_config::kDefaultAnalysisTrackingCloseObjectLowMarginThreshold};
    float close_object_center_jump_penalty{
        app_config::kDefaultAnalysisTrackingCenterJumpPenalty};
    float close_object_min_score_boost{
        app_config::kDefaultAnalysisTrackingCloseObjectMinScoreBoost};
    std::size_t max_close_object_diagnostics{
        app_config::kDefaultAnalysisTrackingCloseObjectMaxDiagnostics};
    std::uint32_t min_confirmed_hits{2};
    std::uint32_t max_missed_frames{
        static_cast<std::uint32_t>(app_config::kDefaultAnalysisTrackingLostBufferFrames)};
    std::size_t max_trail_points{32};
    bool track_all_when_class_labels_empty{true};
    // 비어 있으면 옵션에 따라 전체/없음으로 나뉘고, "*"가 들어 있으면 모든 detection을 track 대상으로 본다.
    std::vector<std::string> class_labels{"person", "vehicle"};
};

class ObjectTracker {
public:
    explicit ObjectTracker(ObjectTrackerOptions options = {});

    // Detection 결과를 track과 매칭하고, Detection.track_id 및 result.tracks를 갱신한다.
    void Update(AnalysisResult* result);
    void Reset();

private:
    struct KalmanLiteState {
        bool initialized{false};
        RectF box;
        float velocity_x{0.0F};
        float velocity_y{0.0F};
        float velocity_width{0.0F};
        float velocity_height{0.0F};
    };

    struct ActiveTrack {
        Track public_track;
        KalmanLiteState kalman;
        bool last_update_low_confidence{false};
    };

    ObjectTrackerOptions options_;
    std::uint64_t next_track_id_{1};
    std::vector<ActiveTrack> tracks_;
};

}  // namespace analysis

// 파일 요약: AppConfig와 analysis runtime port가 공유하는 dependency-free 분석 설정 값을 선언한다.
// 동작 요약: process config와 core-media port가 같은 기본값을 소유하되 analysis에는 port를 통해서만 노출한다.
#pragma once

#include <cstdint>
#include <string>
#include <vector>

#include "core/analysis_runtime_defaults.h"

namespace core {

struct AnalysisRuntimeConfigData {
    std::string default_analysis_detector{core::analysis_defaults::kDefaultAnalysisDetector};
    std::string default_analysis_model_path{core::analysis_defaults::kDefaultAnalysisModelPath};
    std::string default_analysis_labels_path{core::analysis_defaults::kDefaultAnalysisLabelsPath};
    int default_analysis_fps{core::analysis_defaults::kDefaultAnalysisFps};
    std::size_t default_analysis_max_queue{core::analysis_defaults::kDefaultAnalysisMaxQueue};
    int default_analysis_frame_sample_interval{core::analysis_defaults::kDefaultAnalysisFrameSampleInterval};
    int default_analysis_max_frame_age_ms{core::analysis_defaults::kDefaultAnalysisMaxFrameAgeMs};
    int default_analysis_input_width{core::analysis_defaults::kDefaultAnalysisInputWidth};
    int default_analysis_input_height{core::analysis_defaults::kDefaultAnalysisInputHeight};
    float default_analysis_confidence{core::analysis_defaults::kDefaultAnalysisConfidence};
    float default_analysis_nms{core::analysis_defaults::kDefaultAnalysisNms};
    std::string default_analysis_preprocess{core::analysis_defaults::kDefaultAnalysisPreprocess};
    bool default_analysis_tracking_enabled{core::analysis_defaults::kDefaultAnalysisTrackingEnabled};
    std::vector<std::string> default_analysis_tracking_classes{"person", "vehicle"};
    std::uint32_t analysis_tracking_lost_buffer_frames{
        static_cast<std::uint32_t>(core::analysis_defaults::kDefaultAnalysisTrackingLostBufferFrames)};
    float analysis_tracking_iou_weight{core::analysis_defaults::kDefaultAnalysisTrackingIouWeight};
    float analysis_tracking_distance_weight{core::analysis_defaults::kDefaultAnalysisTrackingDistanceWeight};
    float analysis_tracking_direction_weight{core::analysis_defaults::kDefaultAnalysisTrackingDirectionWeight};
    float analysis_tracking_class_weight{core::analysis_defaults::kDefaultAnalysisTrackingClassWeight};
    float analysis_tracking_min_association_score{
        core::analysis_defaults::kDefaultAnalysisTrackingMinAssociationScore};
    float analysis_tracking_smoothing_alpha{core::analysis_defaults::kDefaultAnalysisTrackingSmoothingAlpha};
    std::string analysis_tracking_close_object_guard_mode{
        core::analysis_defaults::kDefaultAnalysisTrackingCloseObjectGuardMode};
    float analysis_tracking_close_object_distance_ratio{
        core::analysis_defaults::kDefaultAnalysisTrackingCloseObjectDistanceRatio};
    float analysis_tracking_close_object_overlap_threshold{
        core::analysis_defaults::kDefaultAnalysisTrackingCloseObjectOverlapThreshold};
    float analysis_tracking_close_object_low_margin_threshold{
        core::analysis_defaults::kDefaultAnalysisTrackingCloseObjectLowMarginThreshold};
    float analysis_tracking_center_jump_penalty{
        core::analysis_defaults::kDefaultAnalysisTrackingCenterJumpPenalty};
    float analysis_tracking_close_object_min_score_boost{
        core::analysis_defaults::kDefaultAnalysisTrackingCloseObjectMinScoreBoost};
    std::size_t analysis_tracking_close_object_max_diagnostics{
        core::analysis_defaults::kDefaultAnalysisTrackingCloseObjectMaxDiagnostics};
    int default_analysis_overlay_wait_ms{core::analysis_defaults::kDefaultAnalysisOverlayWaitMs};
    int default_analysis_overlay_sync_tolerance_ms{core::analysis_defaults::kDefaultAnalysisOverlaySyncToleranceMs};
    int default_analysis_overlay_thickness{core::analysis_defaults::kDefaultAnalysisOverlayThickness};
    bool default_analysis_debug_overlay_enabled{core::analysis_defaults::kDefaultAnalysisDebugOverlayEnabled};
    bool default_analysis_debug_ground_point_enabled{
        core::analysis_defaults::kDefaultAnalysisDebugGroundPointEnabled};
    int analysis_metrics_log_interval_ms{core::analysis_defaults::kDefaultAnalysisMetricsLogIntervalMs};
    bool analysis_homography_enabled{core::analysis_defaults::kDefaultAnalysisHomographyEnabled};
    std::string analysis_homography_matrix{core::analysis_defaults::kDefaultAnalysisHomographyMatrix};
    std::string analysis_homography_stream_id{core::analysis_defaults::kDefaultAnalysisHomographyStreamId};
    std::string analysis_homography_channel_id{core::analysis_defaults::kDefaultAnalysisHomographyChannelId};
    std::string analysis_homography_units{core::analysis_defaults::kDefaultAnalysisHomographyUnits};
    bool analysis_ground_plane_speed_enabled{core::analysis_defaults::kDefaultAnalysisGroundPlaneSpeedEnabled};
    bool analysis_ground_plane_movement_radius_enabled{
        core::analysis_defaults::kDefaultAnalysisGroundPlaneMovementRadiusEnabled};
    bool default_analysis_adaptive_enabled{core::analysis_defaults::kDefaultAnalysisAdaptiveEnabled};
    bool default_analysis_adaptive_input_enabled{core::analysis_defaults::kDefaultAnalysisAdaptiveInputEnabled};
    int default_analysis_adaptive_min_fps{core::analysis_defaults::kDefaultAnalysisAdaptiveMinFps};
    int default_analysis_adaptive_cooldown_ms{core::analysis_defaults::kDefaultAnalysisAdaptiveCooldownMs};
    int default_analysis_adaptive_input_step{core::analysis_defaults::kDefaultAnalysisAdaptiveInputStep};
    int default_analysis_adaptive_min_input_width{core::analysis_defaults::kDefaultAnalysisAdaptiveMinInputWidth};
    int default_analysis_adaptive_min_input_height{core::analysis_defaults::kDefaultAnalysisAdaptiveMinInputHeight};
    float default_analysis_adaptive_high_latency_ratio{
        core::analysis_defaults::kDefaultAnalysisAdaptiveHighLatencyRatio};
    float default_analysis_adaptive_low_latency_ratio{
        core::analysis_defaults::kDefaultAnalysisAdaptiveLowLatencyRatio};
    std::string analysis_registry_path{core::analysis_defaults::kDefaultAnalysisRegistryPath};
    std::size_t analysis_max_active_profiles_per_source{
        core::analysis_defaults::kDefaultAnalysisMaxActiveProfilesPerSource};
    std::size_t analysis_max_active_taps_per_source{
        core::analysis_defaults::kDefaultAnalysisMaxActiveTapsPerSource};
    bool analysis_event_post_enabled{core::analysis_defaults::kDefaultAnalysisEventPostEnabled};
    int analysis_event_post_timeout_ms{core::analysis_defaults::kDefaultAnalysisEventPostTimeoutMs};
    std::size_t analysis_event_post_max_queue{core::analysis_defaults::kDefaultAnalysisEventPostMaxQueue};
    int analysis_event_post_cooldown_ms{core::analysis_defaults::kDefaultAnalysisEventPostCooldownMs};
    bool analysis_event_storage_enabled{core::analysis_defaults::kDefaultAnalysisEventStorageEnabled};
    std::string analysis_event_storage_path{core::analysis_defaults::kDefaultAnalysisEventStoragePath};
    std::size_t analysis_event_storage_max_queue{core::analysis_defaults::kDefaultAnalysisEventStorageMaxQueue};
    std::size_t analysis_event_storage_max_file_bytes{
        core::analysis_defaults::kDefaultAnalysisEventStorageMaxFileBytes};
    std::size_t analysis_event_storage_max_archives{core::analysis_defaults::kDefaultAnalysisEventStorageMaxArchives};
    std::size_t analysis_event_storage_max_total_bytes{
        core::analysis_defaults::kDefaultAnalysisEventStorageMaxTotalBytes};
    bool analysis_event_snapshot_hook_enabled{core::analysis_defaults::kDefaultAnalysisEventSnapshotHookEnabled};
    std::string analysis_event_snapshot_dir{core::analysis_defaults::kDefaultAnalysisEventSnapshotDir};
    bool analysis_event_clip_hook_enabled{core::analysis_defaults::kDefaultAnalysisEventClipHookEnabled};
    std::string analysis_event_clip_dir{core::analysis_defaults::kDefaultAnalysisEventClipDir};
    int analysis_event_pre_event_ms{core::analysis_defaults::kDefaultAnalysisEventPreEventMs};
    int analysis_event_post_event_ms{core::analysis_defaults::kDefaultAnalysisEventPostEventMs};
    int analysis_event_clip_buffer_ms{core::analysis_defaults::kDefaultAnalysisEventClipBufferMs};
    bool analysis_scenario_enabled{core::analysis_defaults::kDefaultAnalysisScenarioEnabled};
    std::size_t analysis_max_active_tracks_per_stream{
        core::analysis_defaults::kDefaultAnalysisMaxActiveTracksPerStream};
    std::size_t analysis_max_recent_observations_per_track{
        core::analysis_defaults::kDefaultAnalysisMaxRecentObservationsPerTrack};
    std::size_t analysis_max_trajectory_points_per_track{
        core::analysis_defaults::kDefaultAnalysisMaxTrajectoryPointsPerTrack};
    int analysis_trajectory_downsample_ms{core::analysis_defaults::kDefaultAnalysisTrajectoryDownsampleMs};
    int analysis_lost_track_timeout_ms{core::analysis_defaults::kDefaultAnalysisLostTrackTimeoutMs};
    int analysis_terminated_track_timeout_ms{core::analysis_defaults::kDefaultAnalysisTerminatedTrackTimeoutMs};
    int analysis_terminated_track_retention_ms{core::analysis_defaults::kDefaultAnalysisTerminatedTrackRetentionMs};
    int analysis_cleanup_interval_ms{core::analysis_defaults::kDefaultAnalysisCleanupIntervalMs};
    std::size_t analysis_scenario_max_instances_per_channel{
        core::analysis_defaults::kDefaultAnalysisScenarioMaxInstancesPerChannel};
    int analysis_scenario_cooldown_ms{core::analysis_defaults::kDefaultAnalysisScenarioCooldownMs};
    int analysis_scenario_update_interval_ms{core::analysis_defaults::kDefaultAnalysisScenarioUpdateIntervalMs};
    int analysis_scenario_retention_ms{core::analysis_defaults::kDefaultAnalysisScenarioRetentionMs};
    int analysis_scenario_ended_retention_ms{core::analysis_defaults::kDefaultAnalysisScenarioEndedRetentionMs};
    bool analysis_intrusion_dwell_enabled{core::analysis_defaults::kDefaultAnalysisIntrusionDwellEnabled};
    int analysis_intrusion_dwell_candidate_ms{core::analysis_defaults::kDefaultAnalysisIntrusionDwellCandidateMs};
    int analysis_intrusion_dwell_dwell_ms{core::analysis_defaults::kDefaultAnalysisIntrusionDwellDwellMs};
    int analysis_intrusion_dwell_cooldown_ms{core::analysis_defaults::kDefaultAnalysisIntrusionDwellCooldownMs};
    std::vector<std::string> analysis_intrusion_dwell_target_classes{"person"};
    std::vector<std::string> analysis_intrusion_dwell_restricted_zone_ids;
    bool analysis_re_entry_enabled{core::analysis_defaults::kDefaultAnalysisReEntryEnabled};
    int analysis_re_entry_window_ms{core::analysis_defaults::kDefaultAnalysisReEntryWindowMs};
    int analysis_re_entry_cooldown_ms{core::analysis_defaults::kDefaultAnalysisReEntryCooldownMs};
    std::vector<std::string> analysis_re_entry_target_classes{"person"};
    std::vector<std::string> analysis_re_entry_target_zone_ids;
    bool analysis_wrong_direction_enabled{core::analysis_defaults::kDefaultAnalysisWrongDirectionEnabled};
    int analysis_wrong_direction_cooldown_ms{core::analysis_defaults::kDefaultAnalysisWrongDirectionCooldownMs};
    std::vector<std::string> analysis_wrong_direction_target_classes{"person"};
    std::vector<std::string> analysis_wrong_direction_target_line_ids;
    std::vector<std::string> analysis_wrong_direction_allowed_directions;
    bool analysis_intrusion_after_line_crossing_enabled{
        core::analysis_defaults::kDefaultAnalysisIntrusionAfterLineCrossingEnabled};
    int analysis_intrusion_after_line_crossing_max_delay_ms{
        core::analysis_defaults::kDefaultAnalysisIntrusionAfterLineCrossingMaxDelayMs};
    int analysis_intrusion_after_line_crossing_dwell_ms{
        core::analysis_defaults::kDefaultAnalysisIntrusionAfterLineCrossingDwellMs};
    int analysis_intrusion_after_line_crossing_cooldown_ms{
        core::analysis_defaults::kDefaultAnalysisIntrusionAfterLineCrossingCooldownMs};
    std::vector<std::string> analysis_intrusion_after_line_crossing_target_classes{"person"};
    std::vector<std::string> analysis_intrusion_after_line_crossing_target_line_ids;
    std::vector<std::string> analysis_intrusion_after_line_crossing_target_zone_ids;
    bool analysis_loitering_enabled{core::analysis_defaults::kDefaultAnalysisLoiteringEnabled};
    int analysis_loitering_min_dwell_time_ms{core::analysis_defaults::kDefaultAnalysisLoiteringMinDwellTimeMs};
    float analysis_loitering_max_movement_radius{core::analysis_defaults::kDefaultAnalysisLoiteringMaxMovementRadius};
    std::size_t analysis_loitering_min_trajectory_points{
        core::analysis_defaults::kDefaultAnalysisLoiteringMinTrajectoryPoints};
    int analysis_loitering_cooldown_ms{core::analysis_defaults::kDefaultAnalysisLoiteringCooldownMs};
    std::vector<std::string> analysis_loitering_target_classes{"person"};
    std::vector<std::string> analysis_loitering_target_zone_ids;
    bool analysis_loitering_use_ground_plane{core::analysis_defaults::kDefaultAnalysisLoiteringUseGroundPlane};
    bool analysis_zone_occupancy_enabled{core::analysis_defaults::kDefaultAnalysisZoneOccupancyEnabled};
    std::size_t analysis_zone_occupancy_threshold{core::analysis_defaults::kDefaultAnalysisZoneOccupancyThreshold};
    int analysis_zone_occupancy_min_dwell_time_ms{
        core::analysis_defaults::kDefaultAnalysisZoneOccupancyMinDwellTimeMs};
    int analysis_zone_occupancy_cooldown_ms{core::analysis_defaults::kDefaultAnalysisZoneOccupancyCooldownMs};
    std::vector<std::string> analysis_zone_occupancy_target_classes{"person"};
    std::vector<std::string> analysis_zone_occupancy_target_zone_ids;
    bool analysis_tracking_issue_report_enabled{core::analysis_defaults::kDefaultAnalysisTrackingIssueReportEnabled};
    bool analysis_tracking_issue_log_enabled{core::analysis_defaults::kDefaultAnalysisTrackingIssueLogEnabled};
    std::size_t analysis_tracking_issue_max_entries{core::analysis_defaults::kDefaultAnalysisTrackingIssueMaxEntries};
    int analysis_tracking_issue_rate_limit_ms{core::analysis_defaults::kDefaultAnalysisTrackingIssueRateLimitMs};
    float analysis_tracking_issue_overlap_risk_threshold{
        core::analysis_defaults::kDefaultAnalysisTrackingIssueOverlapRiskThreshold};
    std::uint32_t analysis_tracking_issue_missed_frame_jump_threshold{
        static_cast<std::uint32_t>(core::analysis_defaults::kDefaultAnalysisTrackingIssueMissedFrameJumpThreshold)};
    std::uint32_t analysis_tracking_issue_direction_change_jump_threshold{
        static_cast<std::uint32_t>(core::analysis_defaults::kDefaultAnalysisTrackingIssueDirectionChangeJumpThreshold)};
    bool analysis_appearance_enabled{core::analysis_defaults::kDefaultAnalysisAppearanceEnabled};
    std::string analysis_appearance_extractor{core::analysis_defaults::kDefaultAnalysisAppearanceExtractor};
    std::string analysis_appearance_model_path{core::analysis_defaults::kDefaultAnalysisAppearanceModelPath};
    std::string analysis_appearance_model_sha256{core::analysis_defaults::kDefaultAnalysisAppearanceModelSha256};
    std::string analysis_appearance_model_provenance{core::analysis_defaults::kDefaultAnalysisAppearanceModelProvenance};
    int analysis_appearance_input_width{core::analysis_defaults::kDefaultAnalysisAppearanceInputWidth};
    int analysis_appearance_input_height{core::analysis_defaults::kDefaultAnalysisAppearanceInputHeight};
    std::size_t analysis_appearance_max_embedding_dim{
        core::analysis_defaults::kDefaultAnalysisAppearanceMaxEmbeddingDim};
    bool analysis_appearance_log_enabled{core::analysis_defaults::kDefaultAnalysisAppearanceLogEnabled};
    bool analysis_appearance_async_enabled{core::analysis_defaults::kDefaultAnalysisAppearanceAsyncEnabled};
    std::size_t analysis_appearance_max_queue{core::analysis_defaults::kDefaultAnalysisAppearanceMaxQueue};
    std::size_t analysis_appearance_global_max_queue{core::analysis_defaults::kDefaultAnalysisAppearanceGlobalMaxQueue};
    int analysis_appearance_per_stream_rate_limit_ms{
        core::analysis_defaults::kDefaultAnalysisAppearancePerStreamRateLimitMs};
    int analysis_appearance_max_job_age_ms{core::analysis_defaults::kDefaultAnalysisAppearanceMaxJobAgeMs};
    bool analysis_appearance_on_track_created{core::analysis_defaults::kDefaultAnalysisAppearanceOnTrackCreated};
    int analysis_appearance_every_n_seconds{core::analysis_defaults::kDefaultAnalysisAppearanceEveryNSeconds};
    bool analysis_appearance_on_track_lost{core::analysis_defaults::kDefaultAnalysisAppearanceOnTrackLost};
    bool analysis_appearance_on_reacquire_candidate{
        core::analysis_defaults::kDefaultAnalysisAppearanceOnReacquireCandidate};
    bool analysis_appearance_on_low_confidence_association{
        core::analysis_defaults::kDefaultAnalysisAppearanceOnLowConfidenceAssociation};
    bool session_trace{false};
};

}  // namespace core

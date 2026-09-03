#include "ingress/analysis_session_read_application_adapter.h"
// 파일 용도: 분석 세션 read/query application adapter를 구현한다.
#include <chrono>
#include <utility>

namespace ingress {
namespace {

AnalysisSessionApplicationContext FromCanonical(const analysis::AnalysisContext& input) {
    AnalysisSessionApplicationContext output;
    output.source_kind = input.source_kind;
    output.route = input.route;
    output.client_id = input.client_id;
    output.va_rule_id = input.va_rule_id;
    output.va_rule_ids = input.va_rule_ids;
    output.event_time_basis = input.event_time_basis;
    output.event_anchor_utc_ms = input.event_anchor_utc_ms;
    output.event_anchor_pts_ms = input.event_anchor_pts_ms;
    output.event_stream_epoch_id = input.event_stream_epoch_id;
    return output;
}

AnalysisSessionApplicationBox FromCanonical(const analysis::RectF& input) {
    return {input.x, input.y, input.width, input.height};
}

AnalysisSessionApplicationDetection FromCanonical(const analysis::Detection& input) {
    AnalysisSessionApplicationDetection output;
    output.class_id = input.class_id;
    output.label = input.label;
    output.score = input.score;
    output.box = FromCanonical(input.box);
    output.detector_box_available = input.detector_box_available;
    output.detector_box = FromCanonical(input.detector_box);
    output.track_id = input.track_id;
    output.association_confidence = input.association_confidence;
    output.event_triggered = input.event_triggered;
    output.event_rule_id = input.event_rule_id;
    output.event_type = input.event_type;
    output.event_highlight_color = input.event_highlight_color;
    output.event_highlight_duration_ms = input.event_highlight_duration_ms;
    return output;
}

AnalysisSessionApplicationTrackTrailPoint FromCanonical(
    const analysis::Track::TrailPoint& input) {
    return {input.x, input.y, input.pts};
}

AnalysisSessionApplicationTrack FromCanonical(const analysis::Track& input) {
    AnalysisSessionApplicationTrack output;
    output.track_id = input.track_id;
    output.detection = FromCanonical(input.detection);
    output.age = input.age;
    output.hits = input.hits;
    output.missed = input.missed;
    output.first_seen_pts = input.first_seen_pts;
    output.last_seen_pts = input.last_seen_pts;
    output.state = input.state;
    output.trail.reserve(input.trail.size());
    for (const auto& point : input.trail) output.trail.push_back(FromCanonical(point));
    return output;
}

AnalysisSessionApplicationCloseObjectDiagnostic FromCanonical(
    const analysis::CloseObjectAssociationDiagnostic& input) {
    AnalysisSessionApplicationCloseObjectDiagnostic output;
    output.track_id = input.track_id;
    output.detection_index = input.detection_index;
    output.class_id = input.class_id;
    output.class_name = input.class_name;
    output.mode = input.mode;
    output.close_object_risk = input.close_object_risk;
    output.nearest_same_class_track_id = input.nearest_same_class_track_id;
    output.nearest_same_class_distance = input.nearest_same_class_distance;
    output.nearest_same_class_distance_available = input.nearest_same_class_distance_available;
    output.candidate_score = input.candidate_score;
    output.ranking_score = input.ranking_score;
    output.best_score = input.best_score;
    output.second_score = input.second_score;
    output.score_margin = input.score_margin;
    output.center_jump = input.center_jump;
    output.direction_conflict = input.direction_conflict;
    output.would_penalize = input.would_penalize;
    output.would_hold_reacquire = input.would_hold_reacquire;
    output.matched = input.matched;
    output.rejected = input.rejected;
    output.guard_decision = input.guard_decision;
    return output;
}

AnalysisSessionApplicationPoseKeypoint FromCanonical(const analysis::PoseKeypoint& input) {
    return {input.name, input.x, input.y, input.score};
}

AnalysisSessionApplicationDebugLineState FromCanonical(
    const analysis::AnalysisDebugLineState& input) {
    AnalysisSessionApplicationDebugLineState output;
    output.line_id = input.line_id;
    output.allowed_direction = input.allowed_direction;
    output.previous_side = input.previous_side;
    output.current_side = input.current_side;
    output.crossed = input.crossed;
    output.direction = input.direction;
    output.raw_crossed = input.raw_crossed;
    output.raw_direction = input.raw_direction;
    output.direction_allowed = input.direction_allowed;
    output.last_cross_time_ms = input.last_cross_time_ms;
    return output;
}

AnalysisSessionApplicationDebugTrackState FromCanonical(
    const analysis::AnalysisDebugTrackState& input) {
    AnalysisSessionApplicationDebugTrackState output;
    output.stream_id = input.stream_id;
    output.channel_id = input.channel_id;
    output.track_id = input.track_id;
    output.class_id = input.class_id;
    output.class_name = input.class_name;
    output.confidence = input.confidence;
    output.bbox = FromCanonical(input.bbox);
    output.ground_point_available = input.ground_point_available;
    output.ground_point_valid = input.ground_point_valid;
    output.ground_point_fallback = input.ground_point_fallback;
    output.foot_point_x = input.foot_point_x;
    output.foot_point_y = input.foot_point_y;
    output.ground_point_x = input.ground_point_x;
    output.ground_point_y = input.ground_point_y;
    output.ground_point_units = input.ground_point_units;
    output.speed = input.speed;
    output.speed_uses_ground_plane = input.speed_uses_ground_plane;
    output.speed_units = input.speed_units;
    output.lifecycle_state = input.lifecycle_state;
    output.current_zone = input.current_zone;
    output.previous_zone = input.previous_zone;
    output.entered_at_ms = input.entered_at_ms;
    output.exited_at_ms = input.exited_at_ms;
    output.dwell_time_ms = input.dwell_time_ms;
    output.inside_restricted_zone = input.inside_restricted_zone;
    output.line_states.reserve(input.line_states.size());
    for (const auto& line : input.line_states) output.line_states.push_back(FromCanonical(line));
    output.primary_line_id = input.primary_line_id;
    output.line_side = input.line_side;
    output.crossing_direction = input.crossing_direction;
    output.scenario_name = input.scenario_name;
    output.scenario_phase = input.scenario_phase;
    output.event_lifecycle = input.event_lifecycle;
    output.association_confidence = input.association_confidence;
    output.missed_frame_count = input.missed_frame_count;
    output.overlap_risk = input.overlap_risk;
    output.direction_change_count = input.direction_change_count;
    output.track_unstable = input.track_unstable;
    output.track_health = input.track_health;
    return output;
}

AnalysisSessionApplicationDebugScenarioTimeline FromCanonical(
    const analysis::AnalysisDebugScenarioTimeline& input) {
    AnalysisSessionApplicationDebugScenarioTimeline output;
    output.instance_key = input.instance_key;
    output.stream_id = input.stream_id;
    output.channel_id = input.channel_id;
    output.rule_id = input.rule_id;
    output.scenario_key = input.scenario_key;
    output.scenario_name = input.scenario_name;
    output.track_id = input.track_id;
    output.class_id = input.class_id;
    output.class_name = input.class_name;
    output.zone_id = input.zone_id;
    output.line_id = input.line_id;
    output.current_phase = input.current_phase;
    output.previous_phase = input.previous_phase;
    output.phase_entered_at_ms = input.phase_entered_at_ms;
    output.phase_elapsed_ms = input.phase_elapsed_ms;
    output.track_first_seen_at_ms = input.track_first_seen_at_ms;
    output.track_last_seen_at_ms = input.track_last_seen_at_ms;
    output.zone_entered_at_ms = input.zone_entered_at_ms;
    output.line_crossed_at_ms = input.line_crossed_at_ms;
    output.event_emitted_at_ms = input.event_emitted_at_ms;
    output.cooldown_started_at_ms = input.cooldown_started_at_ms;
    output.cooldown_ends_at_ms = input.cooldown_ends_at_ms;
    output.cooldown_remaining_ms = input.cooldown_remaining_ms;
    output.last_event_id = input.last_event_id;
    output.last_event_status = input.last_event_status;
    output.dedupe_key = input.dedupe_key;
    output.event_emitted_count = input.event_emitted_count;
    output.dedupe_suppressed_count = input.dedupe_suppressed_count;
    output.active = input.active;
    return output;
}

AnalysisSessionApplicationDebugState FromCanonical(const analysis::AnalysisDebugState& input) {
    AnalysisSessionApplicationDebugState output;
    output.enabled = input.enabled;
    output.stream_id = input.stream_id;
    output.channel_id = input.channel_id;
    output.timestamp_ms = input.timestamp_ms;
    output.track_count = input.track_count;
    output.active_track_count = input.active_track_count;
    output.lost_track_count = input.lost_track_count;
    output.reacquired_track_count = input.reacquired_track_count;
    output.terminated_track_count = input.terminated_track_count;
    output.scenario_instance_count = input.scenario_instance_count;
    output.active_scenario_count = input.active_scenario_count;
    output.event_state_count = input.event_state_count;
    output.active_event_state_count = input.active_event_state_count;
    output.tracks.reserve(input.tracks.size());
    for (const auto& track : input.tracks) output.tracks.push_back(FromCanonical(track));
    output.scenario_timeline.reserve(input.scenario_timeline.size());
    for (const auto& entry : input.scenario_timeline) {
        output.scenario_timeline.push_back(FromCanonical(entry));
    }
    return output;
}

AnalysisSessionApplicationMetricsTrackHealth FromCanonical(
    const analysis::TrackHealthMetrics& input) {
    AnalysisSessionApplicationMetricsTrackHealth output;
    output.unstable_track_count = input.unstable_track_count;
    output.overlap_risk_track_count = input.overlap_risk_track_count;
    output.missed_frame_track_count = input.missed_frame_track_count;
    output.missed_frame_total = input.missed_frame_total;
    output.missed_frame_max = input.missed_frame_max;
    output.direction_change_track_count = input.direction_change_track_count;
    output.direction_change_total = input.direction_change_total;
    output.direction_change_max = input.direction_change_max;
    return output;
}

AnalysisSessionApplicationMetricsChannel FromCanonical(
    const analysis::AnalysisChannelMetrics& input) {
    AnalysisSessionApplicationMetricsChannel output;
    output.stream_id = input.stream_id;
    output.channel_id = input.channel_id;
    output.total_track_count = input.total_track_count;
    output.active_track_count = input.active_track_count;
    output.lost_track_count = input.lost_track_count;
    output.reacquired_track_count = input.reacquired_track_count;
    output.terminated_track_count = input.terminated_track_count;
    output.active_scenario_count = input.active_scenario_count;
    output.event_state_count = input.event_state_count;
    output.active_event_state_count = input.active_event_state_count;
    output.event_emitted_count = input.event_emitted_count;
    output.event_dedup_count = input.event_dedup_count;
    output.track_health = FromCanonical(input.track_health);
    return output;
}

AnalysisSessionApplicationMetrics FromCanonical(const analysis::AnalysisMetricsReport& input) {
    AnalysisSessionApplicationMetrics output;
    output.enabled = input.enabled;
    output.stream_id = input.stream_id;
    output.channel_id = input.channel_id;
    output.timestamp_ms = input.timestamp_ms;
    output.channel_count = input.channel_count;
    output.total_track_count = input.total_track_count;
    output.active_track_count = input.active_track_count;
    output.lost_track_count = input.lost_track_count;
    output.reacquired_track_count = input.reacquired_track_count;
    output.terminated_track_count = input.terminated_track_count;
    output.terminated_track_cleanup_count = input.terminated_track_cleanup_count;
    output.active_scenario_count = input.active_scenario_count;
    output.scenario_cleanup_count = input.scenario_cleanup_count;
    output.active_event_state_count = input.active_event_state_count;
    output.event_emitted_count = input.event_emitted_count;
    output.event_dedup_count = input.event_dedup_count;
    output.event_cleanup_count = input.event_cleanup_count;
    output.track_health = FromCanonical(input.track_health);
    output.channels.reserve(input.channels.size());
    for (const auto& channel : input.channels) output.channels.push_back(FromCanonical(channel));
    return output;
}

AnalysisSessionApplicationAppearanceExtractorStats FromCanonical(
    const analysis::AppearanceExtractorStats& input) {
    AnalysisSessionApplicationAppearanceExtractorStats output;
    output.enabled = input.enabled;
    output.extractor_name = input.extractor_name;
    output.model_path = input.model_path;
    output.request_count = input.request_count;
    output.queued_count = input.queued_count;
    output.completed_count = input.completed_count;
    output.failed_count = input.failed_count;
    output.dropped_count = input.dropped_count;
    output.missing_crop_count = input.missing_crop_count;
    output.busy_drop_count = input.busy_drop_count;
    output.queue_full_drop_count = input.queue_full_drop_count;
    output.global_queue_drop_count = input.global_queue_drop_count;
    output.rate_limited_count = input.rate_limited_count;
    output.stale_drop_count = input.stale_drop_count;
    output.total_queue_latency_ms = input.total_queue_latency_ms;
    output.last_queue_latency_ms = input.last_queue_latency_ms;
    output.max_queue_latency_ms = input.max_queue_latency_ms;
    output.total_inference_time_ms = input.total_inference_time_ms;
    output.last_inference_time_ms = input.last_inference_time_ms;
    output.max_inference_time_ms = input.max_inference_time_ms;
    output.last_error = input.last_error;
    return output;
}

AnalysisSessionApplicationTrackStateMetrics FromCanonical(
    const analysis::TrackStateMetrics& input) {
    AnalysisSessionApplicationTrackStateMetrics output;
    output.channel_count = input.channel_count;
    output.total_tracks = input.total_tracks;
    output.active_tracks = input.active_tracks;
    output.lost_tracks = input.lost_tracks;
    output.reacquired_tracks = input.reacquired_tracks;
    output.terminated_tracks = input.terminated_tracks;
    output.total_observations = input.total_observations;
    output.total_trajectory_points = input.total_trajectory_points;
    output.appearance_profile_count = input.appearance_profile_count;
    output.appearance_extractor_stats = FromCanonical(input.appearance_extractor_stats);
    output.max_active_tracks_per_channel = input.max_active_tracks_per_channel;
    output.max_tracks_per_channel = input.max_tracks_per_channel;
    output.max_observation_history = input.max_observation_history;
    output.max_trajectory_points_per_track = input.max_trajectory_points_per_track;
    output.cleanup_runs = input.cleanup_runs;
    output.tracks_removed_by_cleanup = input.tracks_removed_by_cleanup;
    output.last_cleanup_time_ns = input.last_cleanup_time_ns;
    output.last_cleanup_time_ms = input.last_cleanup_time_ms;
    return output;
}

AnalysisSessionApplicationResult FromCanonical(const analysis::AnalysisResult& input) {
    AnalysisSessionApplicationResult output;
    output.source_key = input.source_key;
    output.profile_key = input.profile_key;
    output.context = FromCanonical(input.context);
    output.frame_id = input.frame_id;
    output.pts = input.pts;
    output.frame_width = input.frame_width;
    output.frame_height = input.frame_height;
    output.detections.reserve(input.detections.size());
    for (const auto& detection : input.detections) {
        output.detections.push_back(FromCanonical(detection));
    }
    output.tracks.reserve(input.tracks.size());
    for (const auto& track : input.tracks) output.tracks.push_back(FromCanonical(track));
    output.close_object_diagnostics.reserve(input.close_object_diagnostics.size());
    for (const auto& diagnostic : input.close_object_diagnostics) {
        output.close_object_diagnostics.push_back(FromCanonical(diagnostic));
    }
    output.pose_keypoints.reserve(input.pose_keypoints.size());
    for (const auto& keypoint : input.pose_keypoints) {
        output.pose_keypoints.push_back(FromCanonical(keypoint));
    }
    output.debug_state_requested = input.debug_state_requested;
    output.debug_state_log_enabled = input.debug_state_log_enabled;
    output.metrics_report_requested = input.metrics_report_requested;
    if (input.debug_state.has_value()) output.debug_state = FromCanonical(*input.debug_state);
    if (input.metrics_report.has_value()) output.metrics_report = FromCanonical(*input.metrics_report);
    return output;
}

analysis::AnalysisContext ToCanonical(const AnalysisSessionApplicationContext& input) {
    analysis::AnalysisContext output;
    output.source_kind = input.source_kind;
    output.route = input.route;
    output.client_id = input.client_id;
    output.va_rule_id = input.va_rule_id;
    output.va_rule_ids = input.va_rule_ids;
    output.event_time_basis = input.event_time_basis;
    output.event_anchor_utc_ms = input.event_anchor_utc_ms;
    output.event_anchor_pts_ms = input.event_anchor_pts_ms;
    output.event_stream_epoch_id = input.event_stream_epoch_id;
    return output;
}

analysis::RectF ToCanonical(const AnalysisSessionApplicationBox& input) {
    return {input.x, input.y, input.width, input.height};
}

analysis::Detection ToCanonical(const AnalysisSessionApplicationDetection& input) {
    analysis::Detection output;
    output.class_id = input.class_id;
    output.label = input.label;
    output.score = input.score;
    output.box = ToCanonical(input.box);
    output.detector_box_available = input.detector_box_available;
    output.detector_box = ToCanonical(input.detector_box);
    output.track_id = input.track_id;
    output.association_confidence = input.association_confidence;
    output.event_triggered = input.event_triggered;
    output.event_rule_id = input.event_rule_id;
    output.event_type = input.event_type;
    output.event_highlight_color = input.event_highlight_color;
    output.event_highlight_duration_ms = input.event_highlight_duration_ms;
    return output;
}

analysis::Track::TrailPoint ToCanonical(const AnalysisSessionApplicationTrackTrailPoint& input) {
    return {input.x, input.y, input.pts};
}

analysis::Track ToCanonical(const AnalysisSessionApplicationTrack& input) {
    analysis::Track output;
    output.track_id = input.track_id;
    output.detection = ToCanonical(input.detection);
    output.age = input.age;
    output.hits = input.hits;
    output.missed = input.missed;
    output.first_seen_pts = input.first_seen_pts;
    output.last_seen_pts = input.last_seen_pts;
    output.state = input.state;
    output.trail.reserve(input.trail.size());
    for (const auto& point : input.trail) output.trail.push_back(ToCanonical(point));
    return output;
}

analysis::CloseObjectAssociationDiagnostic ToCanonical(
    const AnalysisSessionApplicationCloseObjectDiagnostic& input) {
    analysis::CloseObjectAssociationDiagnostic output;
    output.track_id = input.track_id;
    output.detection_index = input.detection_index;
    output.class_id = input.class_id;
    output.class_name = input.class_name;
    output.mode = input.mode;
    output.close_object_risk = input.close_object_risk;
    output.nearest_same_class_track_id = input.nearest_same_class_track_id;
    output.nearest_same_class_distance = input.nearest_same_class_distance;
    output.nearest_same_class_distance_available = input.nearest_same_class_distance_available;
    output.candidate_score = input.candidate_score;
    output.ranking_score = input.ranking_score;
    output.best_score = input.best_score;
    output.second_score = input.second_score;
    output.score_margin = input.score_margin;
    output.center_jump = input.center_jump;
    output.direction_conflict = input.direction_conflict;
    output.would_penalize = input.would_penalize;
    output.would_hold_reacquire = input.would_hold_reacquire;
    output.matched = input.matched;
    output.rejected = input.rejected;
    output.guard_decision = input.guard_decision;
    return output;
}

analysis::PoseKeypoint ToCanonical(const AnalysisSessionApplicationPoseKeypoint& input) {
    return {input.name, input.x, input.y, input.score};
}

analysis::AnalysisDebugLineState ToCanonical(const AnalysisSessionApplicationDebugLineState& input) {
    analysis::AnalysisDebugLineState output;
    output.line_id = input.line_id;
    output.allowed_direction = input.allowed_direction;
    output.previous_side = input.previous_side;
    output.current_side = input.current_side;
    output.crossed = input.crossed;
    output.direction = input.direction;
    output.raw_crossed = input.raw_crossed;
    output.raw_direction = input.raw_direction;
    output.direction_allowed = input.direction_allowed;
    output.last_cross_time_ms = input.last_cross_time_ms;
    return output;
}

analysis::AnalysisDebugTrackState ToCanonical(const AnalysisSessionApplicationDebugTrackState& input) {
    analysis::AnalysisDebugTrackState output;
    output.stream_id = input.stream_id;
    output.channel_id = input.channel_id;
    output.track_id = input.track_id;
    output.class_id = input.class_id;
    output.class_name = input.class_name;
    output.confidence = input.confidence;
    output.bbox = ToCanonical(input.bbox);
    output.ground_point_available = input.ground_point_available;
    output.ground_point_valid = input.ground_point_valid;
    output.ground_point_fallback = input.ground_point_fallback;
    output.foot_point_x = input.foot_point_x;
    output.foot_point_y = input.foot_point_y;
    output.ground_point_x = input.ground_point_x;
    output.ground_point_y = input.ground_point_y;
    output.ground_point_units = input.ground_point_units;
    output.speed = input.speed;
    output.speed_uses_ground_plane = input.speed_uses_ground_plane;
    output.speed_units = input.speed_units;
    output.lifecycle_state = input.lifecycle_state;
    output.current_zone = input.current_zone;
    output.previous_zone = input.previous_zone;
    output.entered_at_ms = input.entered_at_ms;
    output.exited_at_ms = input.exited_at_ms;
    output.dwell_time_ms = input.dwell_time_ms;
    output.inside_restricted_zone = input.inside_restricted_zone;
    output.line_states.reserve(input.line_states.size());
    for (const auto& line : input.line_states) output.line_states.push_back(ToCanonical(line));
    output.primary_line_id = input.primary_line_id;
    output.line_side = input.line_side;
    output.crossing_direction = input.crossing_direction;
    output.scenario_name = input.scenario_name;
    output.scenario_phase = input.scenario_phase;
    output.event_lifecycle = input.event_lifecycle;
    output.association_confidence = input.association_confidence;
    output.missed_frame_count = input.missed_frame_count;
    output.overlap_risk = input.overlap_risk;
    output.direction_change_count = input.direction_change_count;
    output.track_unstable = input.track_unstable;
    output.track_health = input.track_health;
    return output;
}

analysis::AnalysisDebugScenarioTimeline ToCanonical(
    const AnalysisSessionApplicationDebugScenarioTimeline& input) {
    analysis::AnalysisDebugScenarioTimeline output;
    output.instance_key = input.instance_key;
    output.stream_id = input.stream_id;
    output.channel_id = input.channel_id;
    output.rule_id = input.rule_id;
    output.scenario_key = input.scenario_key;
    output.scenario_name = input.scenario_name;
    output.track_id = input.track_id;
    output.class_id = input.class_id;
    output.class_name = input.class_name;
    output.zone_id = input.zone_id;
    output.line_id = input.line_id;
    output.current_phase = input.current_phase;
    output.previous_phase = input.previous_phase;
    output.phase_entered_at_ms = input.phase_entered_at_ms;
    output.phase_elapsed_ms = input.phase_elapsed_ms;
    output.track_first_seen_at_ms = input.track_first_seen_at_ms;
    output.track_last_seen_at_ms = input.track_last_seen_at_ms;
    output.zone_entered_at_ms = input.zone_entered_at_ms;
    output.line_crossed_at_ms = input.line_crossed_at_ms;
    output.event_emitted_at_ms = input.event_emitted_at_ms;
    output.cooldown_started_at_ms = input.cooldown_started_at_ms;
    output.cooldown_ends_at_ms = input.cooldown_ends_at_ms;
    output.cooldown_remaining_ms = input.cooldown_remaining_ms;
    output.last_event_id = input.last_event_id;
    output.last_event_status = input.last_event_status;
    output.dedupe_key = input.dedupe_key;
    output.event_emitted_count = input.event_emitted_count;
    output.dedupe_suppressed_count = input.dedupe_suppressed_count;
    output.active = input.active;
    return output;
}

analysis::AnalysisDebugState ToCanonical(const AnalysisSessionApplicationDebugState& input) {
    analysis::AnalysisDebugState output;
    output.enabled = input.enabled;
    output.stream_id = input.stream_id;
    output.channel_id = input.channel_id;
    output.timestamp_ms = input.timestamp_ms;
    output.track_count = input.track_count;
    output.active_track_count = input.active_track_count;
    output.lost_track_count = input.lost_track_count;
    output.reacquired_track_count = input.reacquired_track_count;
    output.terminated_track_count = input.terminated_track_count;
    output.scenario_instance_count = input.scenario_instance_count;
    output.active_scenario_count = input.active_scenario_count;
    output.event_state_count = input.event_state_count;
    output.active_event_state_count = input.active_event_state_count;
    output.tracks.reserve(input.tracks.size());
    for (const auto& track : input.tracks) output.tracks.push_back(ToCanonical(track));
    output.scenario_timeline.reserve(input.scenario_timeline.size());
    for (const auto& item : input.scenario_timeline) output.scenario_timeline.push_back(ToCanonical(item));
    return output;
}

analysis::TrackHealthMetrics ToCanonical(const AnalysisSessionApplicationMetricsTrackHealth& input) {
    analysis::TrackHealthMetrics output;
    output.unstable_track_count = input.unstable_track_count;
    output.overlap_risk_track_count = input.overlap_risk_track_count;
    output.missed_frame_track_count = input.missed_frame_track_count;
    output.missed_frame_total = input.missed_frame_total;
    output.missed_frame_max = input.missed_frame_max;
    output.direction_change_track_count = input.direction_change_track_count;
    output.direction_change_total = input.direction_change_total;
    output.direction_change_max = input.direction_change_max;
    return output;
}

analysis::AnalysisChannelMetrics ToCanonical(const AnalysisSessionApplicationMetricsChannel& input) {
    analysis::AnalysisChannelMetrics output;
    output.stream_id = input.stream_id;
    output.channel_id = input.channel_id;
    output.total_track_count = input.total_track_count;
    output.active_track_count = input.active_track_count;
    output.lost_track_count = input.lost_track_count;
    output.reacquired_track_count = input.reacquired_track_count;
    output.terminated_track_count = input.terminated_track_count;
    output.active_scenario_count = input.active_scenario_count;
    output.event_state_count = input.event_state_count;
    output.active_event_state_count = input.active_event_state_count;
    output.event_emitted_count = input.event_emitted_count;
    output.event_dedup_count = input.event_dedup_count;
    output.track_health = ToCanonical(input.track_health);
    return output;
}

analysis::AnalysisMetricsReport ToCanonical(const AnalysisSessionApplicationMetrics& input) {
    analysis::AnalysisMetricsReport output;
    output.enabled = input.enabled;
    output.stream_id = input.stream_id;
    output.channel_id = input.channel_id;
    output.timestamp_ms = input.timestamp_ms;
    output.channel_count = input.channel_count;
    output.total_track_count = input.total_track_count;
    output.active_track_count = input.active_track_count;
    output.lost_track_count = input.lost_track_count;
    output.reacquired_track_count = input.reacquired_track_count;
    output.terminated_track_count = input.terminated_track_count;
    output.terminated_track_cleanup_count = input.terminated_track_cleanup_count;
    output.active_scenario_count = input.active_scenario_count;
    output.scenario_cleanup_count = input.scenario_cleanup_count;
    output.active_event_state_count = input.active_event_state_count;
    output.event_emitted_count = input.event_emitted_count;
    output.event_dedup_count = input.event_dedup_count;
    output.event_cleanup_count = input.event_cleanup_count;
    output.track_health = ToCanonical(input.track_health);
    output.channels.reserve(input.channels.size());
    for (const auto& channel : input.channels) output.channels.push_back(ToCanonical(channel));
    return output;
}

analysis::AnalysisResult ToCanonical(const AnalysisSessionApplicationResult& input) {
    analysis::AnalysisResult output;
    output.source_key = input.source_key;
    output.profile_key = input.profile_key;
    output.context = ToCanonical(input.context);
    output.frame_id = input.frame_id;
    output.pts = input.pts;
    output.frame_width = input.frame_width;
    output.frame_height = input.frame_height;
    output.detections.reserve(input.detections.size());
    for (const auto& detection : input.detections) output.detections.push_back(ToCanonical(detection));
    output.tracks.reserve(input.tracks.size());
    for (const auto& track : input.tracks) output.tracks.push_back(ToCanonical(track));
    output.close_object_diagnostics.reserve(input.close_object_diagnostics.size());
    for (const auto& item : input.close_object_diagnostics) output.close_object_diagnostics.push_back(ToCanonical(item));
    output.pose_keypoints.reserve(input.pose_keypoints.size());
    for (const auto& point : input.pose_keypoints) output.pose_keypoints.push_back(ToCanonical(point));
    output.debug_state_requested = input.debug_state_requested;
    output.debug_state_log_enabled = input.debug_state_log_enabled;
    output.metrics_report_requested = input.metrics_report_requested;
    if (input.debug_state.has_value()) output.debug_state = ToCanonical(*input.debug_state);
    if (input.metrics_report.has_value()) output.metrics_report = ToCanonical(*input.metrics_report);
    return output;
}

AnalysisSessionApplicationSnapshot FromCanonical(
    const analysis::AnalysisManager::TapSnapshot& input) {
    AnalysisSessionApplicationSnapshot output;
    output.tap_id = input.tap_id;
    output.stream_key = input.stream_key;
    output.profile_key = input.profile_key;
    output.reuse_key = input.reuse_key;
    output.ref_count = input.ref_count;
    output.reuse_attach_count = input.reuse_attach_count;
    output.last_used_age_ms = input.last_used_age_ms;
    output.context = FromCanonical(input.context);
    output.profile_selection_source = input.profile_selection_source;
    output.selected_by_rule_id = input.selected_by_rule_id;
    output.selected_rule_priority = input.selected_rule_priority;
    output.selected_rule_specificity = input.selected_rule_specificity;
    output.detector_type = input.detector_type;
    output.received_video_packets = input.received_video_packets;
    output.decoded_frames = input.decoded_frames;
    output.sampled_frames = input.sampled_frames;
    output.analyzed_packets = input.analyzed_packets;
    output.dropped_packets = input.dropped_packets;
    output.sample_dropped_frames = input.sample_dropped_frames;
    output.queue_dropped_frames = input.queue_dropped_frames;
    output.sample_interval_dropped_frames = input.sample_interval_dropped_frames;
    output.stale_queue_dropped_frames = input.stale_queue_dropped_frames;
    output.decoder_errors = input.decoder_errors;
    output.pending_frames = input.pending_frames;
    output.peak_pending_frames = input.peak_pending_frames;
    output.effective_decoded_fps = input.effective_decoded_fps;
    output.effective_sampled_fps = input.effective_sampled_fps;
    output.effective_analyzed_fps = input.effective_analyzed_fps;
    output.last_queue_wait_ms = input.last_queue_wait_ms;
    output.average_queue_wait_ms = input.average_queue_wait_ms;
    output.max_queue_wait_ms = input.max_queue_wait_ms;
    output.last_analysis_ms = input.last_analysis_ms;
    output.average_analysis_ms = input.average_analysis_ms;
    output.max_analysis_ms = input.max_analysis_ms;
    output.last_inference_ms = input.last_inference_ms;
    output.average_inference_ms = input.average_inference_ms;
    output.max_inference_ms = input.max_inference_ms;
    output.target_fps = input.target_fps;
    output.max_queue_size = input.max_queue_size;
    output.frame_sample_interval = input.frame_sample_interval;
    output.max_frame_age_ms = input.max_frame_age_ms;
    output.model_input_width = input.model_input_width;
    output.model_input_height = input.model_input_height;
    output.debug_detector_delay_ms = input.debug_detector_delay_ms;
    output.confidence_threshold = input.confidence_threshold;
    output.nms_threshold = input.nms_threshold;
    output.tracking_enabled = input.tracking_enabled;
    output.tracking_policy_tracker = input.tracking_policy_tracker;
    output.tracking_policy_effective_tracker = input.tracking_policy_effective_tracker;
    output.tracking_policy_reid = input.tracking_policy_reid;
    output.tracking_policy_source = input.tracking_policy_source;
    output.tracking_policy_rule_id = input.tracking_policy_rule_id;
    output.tracking_policy_fallback_reason = input.tracking_policy_fallback_reason;
    output.tracking_policy_specified = input.tracking_policy_specified;
    output.tracking_class_labels = input.tracking_class_labels;
    output.track_state_metrics = FromCanonical(input.track_state_metrics);
    output.adaptive_tuning_enabled = input.adaptive_tuning_enabled;
    output.adaptive_input_size_enabled = input.adaptive_input_size_enabled;
    output.adaptive_input_size_disabled = input.adaptive_input_size_disabled;
    output.adaptive_min_fps = input.adaptive_min_fps;
    output.adaptive_max_fps = input.adaptive_max_fps;
    output.adaptive_min_input_width = input.adaptive_min_input_width;
    output.adaptive_min_input_height = input.adaptive_min_input_height;
    output.adaptive_max_input_width = input.adaptive_max_input_width;
    output.adaptive_max_input_height = input.adaptive_max_input_height;
    output.adaptive_downshift_count = input.adaptive_downshift_count;
    output.adaptive_upshift_count = input.adaptive_upshift_count;
    output.adaptive_state = input.adaptive_state;
    output.has_latest_frame = input.has_latest_frame;
    output.latest_frame_width = input.latest_frame_width;
    output.latest_frame_height = input.latest_frame_height;
    output.latest_frame_pts = input.latest_frame_pts;
    output.latest_frame_age_ms = input.latest_frame_age_ms;
    output.latest_result_age_ms = input.latest_result_age_ms;
    if (input.latest_result.has_value()) output.latest_result = FromCanonical(*input.latest_result);
    return output;
}

ImageCodecPixelFormat FromCanonical(analysis::PixelFormat input) {
    switch (input) {
        case analysis::PixelFormat::I420: return ImageCodecPixelFormat::I420;
        case analysis::PixelFormat::RGB: return ImageCodecPixelFormat::RGB;
        case analysis::PixelFormat::BGR: return ImageCodecPixelFormat::BGR;
        case analysis::PixelFormat::Gray8: return ImageCodecPixelFormat::Gray8;
        case analysis::PixelFormat::Unknown: return ImageCodecPixelFormat::Unknown;
    }
    return ImageCodecPixelFormat::Unknown;
}

ImageCodecFrame FromCanonical(const analysis::RawVideoFrame& input) {
    ImageCodecFrame output;
    output.source_key = input.source_key;
    output.track_id = input.track_id;
    output.width = input.width;
    output.height = input.height;
    output.format = FromCanonical(input.format);
    output.pts = input.pts;
    output.data = input.data;
    return output;
}

class CanonicalAnalysisSessionReadApplicationAdapter final
    : public AnalysisSessionReadApplicationService {
public:
    explicit CanonicalAnalysisSessionReadApplicationAdapter(
        analysis::AnalysisSessionService& service)
        : service_(service) {}

    std::optional<AnalysisSessionApplicationSnapshot> Snapshot(
        const std::string& tap_id) const override {
        const auto input = service_.AnalysisTapSnapshot(tap_id);
        if (!input.has_value()) return std::nullopt;
        return FromCanonical(*input);
    }

    std::vector<AnalysisSessionApplicationSnapshot> Snapshots() const override {
        const auto input = service_.AnalysisTapSnapshots();
        std::vector<AnalysisSessionApplicationSnapshot> output;
        output.reserve(input.size());
        for (const auto& snapshot : input) output.push_back(FromCanonical(snapshot));
        return output;
    }

    std::optional<AnalysisSessionApplicationResult> WaitResultNearPts(
        const std::string& tap_id,
        std::int64_t pts,
        std::int64_t tolerance_ns,
        int timeout_ms) const override {
        const auto input = service_.WaitAnalysisResultNearPts(
            tap_id, pts, tolerance_ns, std::chrono::milliseconds(timeout_ms));
        if (!input.has_value()) return std::nullopt;
        return FromCanonical(*input);
    }

    std::optional<ImageCodecFrame> LatestFrame(const std::string& tap_id) const override {
        const auto input = service_.AnalysisLatestFrame(tap_id);
        if (!input.has_value()) return std::nullopt;
        return FromCanonical(*input);
    }

    std::optional<AnalysisSessionApplicationLatestFrameAndResult> LatestFrameAndResult(
        const std::string& tap_id) const override {
        const auto input = service_.AnalysisLatestFrameAndResult(tap_id);
        if (!input.has_value()) return std::nullopt;
        AnalysisSessionApplicationLatestFrameAndResult output;
        output.frame = FromCanonical(input->frame);
        if (input->result.has_value()) output.result = FromCanonical(*input->result);
        return output;
    }

    std::size_t ActiveTapCount() const override {
        return service_.ActiveAnalysisTapCount();
    }

private:
    analysis::AnalysisSessionService& service_;
};

}  // namespace

namespace analysis_session_application_mapping {

AnalysisSessionApplicationResult FromCanonicalResult(const analysis::AnalysisResult& input) {
    return FromCanonical(input);
}

analysis::AnalysisResult ToCanonicalResult(const AnalysisSessionApplicationResult& input) {
    return ToCanonical(input);
}

}  // namespace analysis_session_application_mapping

std::unique_ptr<AnalysisSessionReadApplicationService>
MakeAnalysisSessionReadApplicationAdapter(analysis::AnalysisSessionService& service) {
    return std::make_unique<CanonicalAnalysisSessionReadApplicationAdapter>(service);
}

}  // namespace ingress

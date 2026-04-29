// 파일 요약: VA state/scenario 계층의 단위성 smoke 검증을 수행한다.
// 동작 요약: 서버를 띄우지 않고 TrackState, SceneContext, EventManager, ScenarioEngine,
// Appearance hook, cleanup 정책을 mock metadata로 직접 검증한다.
#include "analysis/appearance_extractor.h"
#include "analysis/event_manager.h"
#include "analysis/intrusion_after_line_crossing_scenario.h"
#include "analysis/intrusion_dwell_scenario.h"
#include "analysis/loitering_scenario.h"
#include "analysis/object_tracker.h"
#include "analysis/re_entry_scenario.h"
#include "analysis/scenario_engine.h"
#include "analysis/scene_context_builder.h"
#include "analysis/track_state_manager.h"
#include "analysis/wrong_direction_scenario.h"
#include "app_config.h"

#include <chrono>
#include <cmath>
#include <cstdlib>
#include <iostream>
#include <sstream>
#include <stdexcept>
#include <string>
#include <thread>
#include <vector>

namespace {

using namespace analysis;

int g_pass_count = 0;

std::int64_t Ms(std::int64_t value) {
    return value * 1000000LL;
}

void Expect(bool condition, const std::string& message) {
    if (!condition) {
        throw std::runtime_error(message);
    }
}

void Pass(const std::string& message) {
    ++g_pass_count;
    std::cout << "[pass] " << message << "\n";
}

TrackedObjectMetadata MakeObject(std::uint64_t track_id,
                                 std::uint64_t frame_id,
                                 std::int64_t timestamp_ms,
                                 float center_x,
                                 float center_y,
                                 const std::string& direction = "right",
                                 const std::string& channel_id = "channel-a",
                                 const std::string& stream_id = "stream-a") {
    TrackedObjectMetadata object;
    object.stream_id = stream_id;
    object.channel_id = channel_id;
    object.frame_id = frame_id;
    object.timestamp_ns = Ms(timestamp_ms);
    object.timestamp_ms = timestamp_ms;
    object.track_id = track_id;
    object.class_id = 0;
    object.class_name = "person";
    object.confidence = 0.9F;
    object.bbox = RectF{center_x - 0.05F, center_y - 0.05F, 0.1F, 0.1F};
    object.center = NormalizedPointF{center_x, center_y};
    object.direction.label = direction;
    object.direction.dx = direction == "left" ? -1.0F : 1.0F;
    object.direction.dy = 0.0F;
    return object;
}

Detection MakeDetection(int class_id,
                        const std::string& label,
                        float center_x,
                        float center_y,
                        float width = 0.1F,
                        float height = 0.1F) {
    Detection detection;
    detection.class_id = class_id;
    detection.label = label;
    detection.score = 0.9F;
    detection.box = RectF{center_x - width * 0.5F, center_y - height * 0.5F, width, height};
    return detection;
}

AnalysisResult MakeTrackerFrame(std::uint64_t frame_id,
                                std::int64_t timestamp_ms,
                                std::vector<Detection> detections) {
    AnalysisResult result;
    result.source_key = "tracker-smoke";
    result.profile_key = "tracker-smoke";
    result.frame_id = frame_id;
    result.pts = Ms(timestamp_ms);
    result.detections = std::move(detections);
    return result;
}

TrackRuntimeState MakeTrackState(std::uint64_t track_id,
                                 std::int64_t timestamp_ms,
                                 float center_x,
                                 float center_y,
                                 const std::string& channel_id = "channel-a",
                                 const std::string& stream_id = "stream-a") {
    const auto object = MakeObject(track_id, 1, timestamp_ms, center_x, center_y, "right", channel_id, stream_id);
    TrackRuntimeState state;
    state.stream_id = stream_id;
    state.channel_id = channel_id;
    state.track_id = track_id;
    state.class_id = object.class_id;
    state.class_name = object.class_name;
    state.confidence = object.confidence;
    state.latest_bbox = object.bbox;
    state.latest_center = object.center;
    state.latest_direction = object.direction;
    state.first_seen_time_ns = object.timestamp_ns;
    state.first_seen_time_ms = object.timestamp_ms;
    state.last_seen_time_ns = object.timestamp_ns;
    state.last_seen_time_ms = object.timestamp_ms;
    state.lifecycle_state = TrackLifecycleState::Active;
    return state;
}

const TrackRuntimeState* FindTrack(const std::vector<TrackRuntimeState>& states,
                                   std::uint64_t track_id) {
    for (const auto& state : states) {
        if (state.track_id == track_id) {
            return &state;
        }
    }
    return nullptr;
}

bool HasTrackingIssue(const TrackingIssueReport& report,
                      const std::string& issue_type,
                      std::uint64_t track_id) {
    for (const auto& issue : report.issues) {
        if (issue.issue_type == issue_type && issue.track_id == track_id) {
            return true;
        }
    }
    return false;
}

class RecordingAppearanceExtractor final : public IAppearanceExtractor {
public:
    bool Enabled() const override {
        return true;
    }

    AppearanceExtractorStats Stats() const override {
        return stats;
    }

    std::optional<AppearanceProfile> Extract(const AppearanceExtractionInput& input,
                                             const AppearanceProfile* previous_profile) override {
        ++stats.request_count;
        last_crop_width = input.crop_width;
        last_crop_height = input.crop_height;
        if (input.crop_rgb.empty()) {
            ++stats.missing_crop_count;
            ++stats.dropped_count;
            return std::nullopt;
        }
        ++stats.completed_count;
        AppearanceProfile profile = previous_profile != nullptr ? *previous_profile : AppearanceProfile{};
        profile.embedding = {0.1F, 0.2F, 0.3F};
        profile.embedding_quality = 0.9F;
        profile.last_updated_time_ns = input.timestamp_ns;
        profile.last_updated_time_ms = input.timestamp_ms;
        profile.sample_count = previous_profile != nullptr ? previous_profile->sample_count + 1 : 1;
        return profile;
    }

    mutable AppearanceExtractorStats stats{.enabled = true, .extractor_name = "recording"};
    int last_crop_width{0};
    int last_crop_height{0};
};

void VerifyObjectTrackerAssociationScoring() {
    ObjectTrackerOptions options;
    options.class_labels = {"*"};
    options.smoothing_alpha = 0.0F;
    options.max_center_distance = 0.2F;
    options.min_iou = 0.05F;
    options.iou_weight = 0.0F;
    options.distance_weight = 0.0F;
    options.direction_weight = 1.0F;
    options.class_weight = 0.0F;
    options.min_association_score = 0.4F;
    ObjectTracker tracker(options);

    auto frame1 = MakeTrackerFrame(1, 1000, {MakeDetection(0, "person", 0.20F, 0.20F)});
    tracker.Update(&frame1);
    Expect(frame1.detections.size() == 1 && frame1.detections[0].track_id == 1,
           "ObjectTracker must create a first track");

    auto frame2 = MakeTrackerFrame(2, 1100, {MakeDetection(0, "person", 0.25F, 0.20F)});
    tracker.Update(&frame2);
    Expect(frame2.detections[0].track_id == 1 &&
               frame2.detections[0].association_confidence >= 0.4F,
           "ObjectTracker must keep the track before direction history is mature");

    auto frame3 = MakeTrackerFrame(3,
                                   1200,
                                   {MakeDetection(0, "person", 0.22F, 0.20F),
                                    MakeDetection(0, "person", 0.30F, 0.20F)});
    tracker.Update(&frame3);
    Expect(frame3.detections[0].track_id != 1 && frame3.detections[1].track_id == 1,
           "direction score must prefer the candidate that continues the existing movement");
    Expect(frame3.detections[1].association_confidence >= 0.99F,
           "matched detection must carry the final association score");

    auto frame4 = MakeTrackerFrame(4, 1300, {MakeDetection(2, "car", 0.34F, 0.20F)});
    tracker.Update(&frame4);
    Expect(frame4.detections[0].track_id != 1,
           "class consistency must prevent a different class from stealing an existing track id");

    ObjectTrackerOptions lost_buffer_options;
    lost_buffer_options.class_labels = {"*"};
    lost_buffer_options.smoothing_alpha = 0.0F;
    lost_buffer_options.max_missed_frames = 2;
    lost_buffer_options.min_iou = 0.05F;
    lost_buffer_options.max_center_distance = 0.2F;
    ObjectTracker lost_buffer_tracker(lost_buffer_options);
    auto lost_frame1 = MakeTrackerFrame(10, 1000, {MakeDetection(0, "person", 0.20F, 0.20F)});
    lost_buffer_tracker.Update(&lost_frame1);
    auto lost_frame2 = MakeTrackerFrame(11, 1100, {});
    lost_buffer_tracker.Update(&lost_frame2);
    auto reacquired_frame = MakeTrackerFrame(12, 1200, {MakeDetection(0, "person", 0.21F, 0.20F)});
    lost_buffer_tracker.Update(&reacquired_frame);
    Expect(reacquired_frame.detections[0].track_id == lost_frame1.detections[0].track_id &&
               !reacquired_frame.tracks.empty() &&
               reacquired_frame.tracks[0].state == "reacquired",
           "ObjectTracker must mark a lost-buffer match as reacquired for one frame");
    auto stable_frame = MakeTrackerFrame(13, 1300, {MakeDetection(0, "person", 0.22F, 0.20F)});
    lost_buffer_tracker.Update(&stable_frame);
    Expect(!stable_frame.tracks.empty() && stable_frame.tracks[0].state != "reacquired",
           "ObjectTracker reacquired state must clear after the next stable observation");

    TrackStateManager manager;
    auto object1 = MakeObject(90, 1, 1000, 0.2F, 0.2F);
    object1.association_confidence = 1.0F;
    auto object2 = MakeObject(90, 2, 1100, 0.22F, 0.2F);
    object2.association_confidence = 0.42F;
    manager.Update("stream-a", "channel-a", {object1}, Ms(1000));
    manager.Update("stream-a", "channel-a", {object2}, Ms(1100));
    const auto states = manager.Snapshot("channel-a");
    const auto* track = FindTrack(states, 90);
    Expect(track != nullptr && std::fabs(track->health.association_confidence - 0.42F) < 0.001F,
           "TrackHealth must use tracker associationConfidence when metadata provides it");

    Pass("ObjectTracker IoU/distance/direction/class association scoring");
}

SceneZoneDefinition MakeZone(const std::string& zone_id = "restricted-a",
                             const std::string& channel_id = "channel-a") {
    SceneZoneDefinition zone;
    zone.zone_id = zone_id;
    zone.channel_id = channel_id;
    zone.restricted = true;
    zone.polygon = {
        SceneGeometryPoint{0.1F, 0.1F},
        SceneGeometryPoint{0.5F, 0.1F},
        SceneGeometryPoint{0.5F, 0.5F},
        SceneGeometryPoint{0.1F, 0.5F},
    };
    return zone;
}

SceneLineDefinition MakeLine(const std::string& line_id = "line-a",
                             const std::string& channel_id = "channel-a") {
    SceneLineDefinition line;
    line.line_id = line_id;
    line.channel_id = channel_id;
    line.allowed_direction = "reverse";
    line.points = {
        SceneGeometryPoint{0.5F, 0.0F},
        SceneGeometryPoint{0.5F, 1.0F},
    };
    return line;
}

TrackSceneContext MakeTrackContext(std::uint64_t track_id,
                                   std::int64_t timestamp_ms,
                                   bool inside_zone,
                                   std::int64_t dwell_ms,
                                   const std::string& zone_id = "restricted-a") {
    TrackSceneContext context;
    context.stream_id = "stream-a";
    context.channel_id = "channel-a";
    context.track_id = track_id;
    context.class_id = 0;
    context.class_name = "person";
    context.confidence = 0.91F;
    context.lifecycle_state = TrackLifecycleState::Active;
    context.center = inside_zone ? NormalizedPointF{0.2F, 0.2F} : NormalizedPointF{0.8F, 0.8F};
    context.bbox = RectF{context.center.x - 0.05F, context.center.y - 0.05F, 0.1F, 0.1F};
    context.direction.label = "right";

    ZoneState zone;
    zone.current_zone = inside_zone ? zone_id : std::string{};
    zone.entered_at_ns = inside_zone ? Ms(timestamp_ms - dwell_ms) : 0;
    zone.entered_at_ms = inside_zone ? timestamp_ms - dwell_ms : 0;
    zone.dwell_time_ms = inside_zone ? dwell_ms : 0;
    zone.is_inside_restricted_zone = inside_zone;
    zone.has_observation = true;
    context.zone_state = zone;
    context.zone_states.push_back(zone);
    return context;
}

SceneContext MakeSceneContext(std::int64_t timestamp_ms,
                              const std::vector<TrackSceneContext>& tracks) {
    SceneContext context;
    context.stream_id = "stream-a";
    context.channel_id = "channel-a";
    context.timestamp_ns = Ms(timestamp_ms);
    context.timestamp_ms = timestamp_ms;
    context.tracks = tracks;
    return context;
}

std::vector<TrackTrajectoryPoint> MakeTrajectory(std::int64_t start_ms,
                                                 const std::vector<NormalizedPointF>& points,
                                                 std::int64_t step_ms = 1000) {
    std::vector<TrackTrajectoryPoint> trajectory;
    trajectory.reserve(points.size());
    for (std::size_t i = 0; i < points.size(); ++i) {
        TrackTrajectoryPoint point;
        point.frame_id = static_cast<std::uint64_t>(i + 1);
        point.timestamp_ms = start_ms + static_cast<std::int64_t>(i) * step_ms;
        point.timestamp_ns = Ms(point.timestamp_ms);
        point.center = points[i];
        point.foot_point = points[i];
        trajectory.push_back(point);
    }
    return trajectory;
}

EventCandidate MakeCandidate(std::uint64_t track_id,
                             std::int64_t timestamp_ms,
                             bool active,
                             bool confirmed = false,
                             const std::string& zone_id = "zone-a") {
    EventCandidate candidate;
    candidate.key.stream_id = "stream-a";
    candidate.key.channel_id = "channel-a";
    candidate.key.scenario_id = "scenario-a";
    candidate.key.zone_id = zone_id;
    candidate.key.track_id = track_id;
    candidate.event.rule_id = "rule-a";
    candidate.event.event_type = "intrusion-dwell";
    candidate.event.track_id = track_id;
    candidate.event.class_id = 0;
    candidate.event.label = "person";
    candidate.event.score = 0.9F;
    candidate.timestamp_ns = Ms(timestamp_ms);
    candidate.active = active;
    candidate.confirmed = confirmed;
    return candidate;
}

void VerifyTrackStateManagerAndHealth() {
    TrackStateManagerOptions options;
    options.max_observation_history = 3;
    options.max_trajectory_points = 2;
    options.max_tracks_per_channel = 6;
    options.max_active_tracks_per_channel = 4;
    options.lost_timeout_ns = Ms(1000);
    options.terminated_timeout_ns = Ms(2000);
    options.terminated_retention_ns = Ms(500);
    options.trajectory_downsample_interval_ns = Ms(100);
    options.cleanup_interval_ns = 0;
    options.missed_frame_unstable_threshold = 1;
    options.direction_change_unstable_threshold = 2;
    options.tracking_issue_report_enabled = true;
    options.tracking_issue_log_enabled = false;
    options.tracking_issue_rate_limit_ns = 0;
    options.tracking_issue_overlap_risk_threshold = 0.1F;
    options.tracking_issue_missed_frame_jump_threshold = 1;
    options.tracking_issue_direction_change_jump_threshold = 1;
    TrackStateManager manager(options);

    manager.Update("stream-a", "channel-a", {MakeObject(1, 1, 1000, 0.2F, 0.2F)}, Ms(1000));
    manager.Update("stream-a", "channel-a", {MakeObject(1, 2, 1100, 0.22F, 0.2F)}, Ms(1100));
    manager.Update("stream-a", "channel-a", {MakeObject(1, 3, 1200, 0.24F, 0.2F)}, Ms(1200));
    manager.Update("stream-a", "channel-a", {MakeObject(1, 4, 1300, 0.26F, 0.2F)}, Ms(1300));
    manager.Update("stream-b", "channel-b", {MakeObject(1, 1, 1000, 0.7F, 0.7F, "right", "channel-b", "stream-b")}, Ms(1000));

    auto channel_a = manager.Snapshot("channel-a");
    auto channel_b = manager.Snapshot("channel-b");
    const auto* track_a = FindTrack(channel_a, 1);
    const auto* track_b = FindTrack(channel_b, 1);
    Expect(track_a != nullptr && track_b != nullptr, "same numeric track id must exist per channel");
    Expect(track_a->stream_id == "stream-a" && track_b->stream_id == "stream-b",
           "track state must keep stream/channel separation");
    Expect(track_a->observations.size() == 3, "recent observation ring buffer must be capped");
    Expect(track_a->trajectory.size() == 2, "trajectory points must be downsampled/capped");
    Expect(track_a->first_seen_time_ms == 1000 && track_a->last_seen_time_ms == 1300,
           "firstSeen/lastSeen timestamps must be retained");

    manager.Update("stream-a", "channel-a", {}, Ms(2300));
    channel_a = manager.Snapshot("channel-a");
    track_a = FindTrack(channel_a, 1);
    Expect(track_a != nullptr && track_a->lifecycle_state == TrackLifecycleState::Lost,
           "track must transition Active -> Lost");
    Expect(track_a->lost_since_time_ms == 2300, "lostSince must be calculated from lastSeen+timeout");
    Expect(track_a->health.missed_frame_count > 0 && track_a->health.last_health_event == "lost",
           "TrackHealth must record missed/lost state");
    auto issue_report = manager.TrackingIssueSnapshot("channel-a");
    Expect(HasTrackingIssue(issue_report, "missed-frame-spike", 1) &&
               HasTrackingIssue(issue_report, "lost", 1),
           "Tracking issue report must record missed-frame and lost issues");

    manager.Update("stream-a", "channel-a", {}, Ms(3300));
    channel_a = manager.Snapshot("channel-a");
    track_a = FindTrack(channel_a, 1);
    Expect(track_a != nullptr && track_a->lifecycle_state == TrackLifecycleState::Terminated,
           "track must transition Lost -> Terminated");

    manager.Update("stream-a", "channel-a", {}, Ms(3900));
    Expect(manager.Snapshot("channel-a").empty(), "expired terminated tracks must be cleaned");
    Expect(!manager.Snapshot("channel-b").empty(), "cleanup must not remove active tracks in another channel");

    TrackStateManager limited_manager([&] {
        TrackStateManagerOptions limited = options;
        limited.max_tracks_per_channel = 1;
        limited.max_active_tracks_per_channel = 1;
        return limited;
    }());
    limited_manager.Update("stream-a",
                           "channel-a",
                           {MakeObject(10, 1, 1000, 0.2F, 0.2F),
                            MakeObject(11, 1, 1000, 0.7F, 0.7F)},
                           Ms(1000));
    Expect(limited_manager.Metrics().active_tracks == 1,
           "maxActiveTracksPerStream must limit new active tracks");

    TrackStateManager health_manager(options);
    health_manager.Update("stream-a",
                          "channel-a",
                          {MakeObject(20, 1, 1000, 0.3F, 0.3F),
                           MakeObject(21, 1, 1000, 0.31F, 0.31F)},
                          Ms(1000));
    auto health_states = health_manager.Snapshot("channel-a");
    const auto* health_track = FindTrack(health_states, 20);
    Expect(health_track != nullptr && health_track->health.overlap_risk > 0.0F &&
               health_track->health.is_unstable,
           "TrackHealth must flag overlap risk as unstable");
    issue_report = health_manager.TrackingIssueSnapshot("channel-a");
    Expect(HasTrackingIssue(issue_report, "overlap-risk", 20),
           "Tracking issue report must record high overlap risk");

    health_manager.Update("stream-a", "channel-a", {MakeObject(20, 2, 1100, 0.9F, 0.9F, "left")}, Ms(1100));
    health_manager.Update("stream-a", "channel-a", {MakeObject(20, 3, 1200, 0.2F, 0.2F, "right")}, Ms(1200));
    health_states = health_manager.Snapshot("channel-a");
    health_track = FindTrack(health_states, 20);
    Expect(health_track != nullptr &&
               (health_track->health.direction_change_count > 0 ||
                health_track->health.association_confidence < options.low_association_confidence_threshold),
           "TrackHealth must record direction changes or low association confidence");
    issue_report = health_manager.TrackingIssueSnapshot("channel-a");
    Expect(HasTrackingIssue(issue_report, "direction-change-spike", 20) ||
               HasTrackingIssue(issue_report, "low-association-confidence", 20),
           "Tracking issue report must record direction or association instability");

    health_manager.Update("stream-a", "channel-a", {}, Ms(2300));
    health_manager.Update("stream-a", "channel-a", {MakeObject(20, 4, 2400, 0.21F, 0.2F, "right")}, Ms(2400));
    health_states = health_manager.Snapshot("channel-a");
    health_track = FindTrack(health_states, 20);
    Expect(health_track != nullptr && health_track->lifecycle_state == TrackLifecycleState::Reacquired,
           "TrackStateManager must expose Lost -> Reacquired as a lifecycle state");
    Expect(health_manager.Metrics().reacquired_tracks == 1 &&
               health_manager.Metrics().active_tracks >= 1,
           "TrackStateManager metrics must count reacquired tracks as active-like");
    issue_report = health_manager.TrackingIssueSnapshot("channel-a");
    Expect(HasTrackingIssue(issue_report, "reacquired", 20),
           "Tracking issue report must record lost to reacquired transitions");
    const std::string issue_json = TrackingIssueReportToJson(issue_report);
    Expect(issue_json.find("\"schema\":\"media-server.va.tracking-issue-report.v1\"") != std::string::npos,
           "Tracking issue report must support JSON output");

    TrackStateManager appearance_manager([&] {
        TrackStateManagerOptions appearance_options = options;
        appearance_options.appearance_update_policy.enabled = true;
        appearance_options.appearance_update_policy.on_track_created = true;
        appearance_options.appearance_update_policy.on_reacquire_candidate = true;
        appearance_options.appearance_update_policy.on_low_confidence_association = true;
        return appearance_options;
    }());
    appearance_manager.Update("stream-a", "channel-a", {MakeObject(30, 1, 1000, 0.2F, 0.2F)}, Ms(1000));
    const auto appearance_states = appearance_manager.Snapshot("channel-a");
    const auto* appearance_track = FindTrack(appearance_states, 30);
    Expect(appearance_track != nullptr && !appearance_track->appearance_profile.has_value(),
           "NoOpAppearanceExtractor must not attach an appearance profile");

    NoOpAppearanceExtractor no_op;
    Expect(no_op.Enabled(), "NoOpAppearanceExtractor must be callable when policy enables hooks");
    Expect(!no_op.Extract(AppearanceExtractionInput{}, nullptr).has_value(),
           "NoOpAppearanceExtractor must not call a real model");

    auto recording_extractor = std::make_shared<RecordingAppearanceExtractor>();
    TrackStateManager crop_manager([&] {
        TrackStateManagerOptions crop_options = options;
        crop_options.appearance_update_policy.enabled = true;
        crop_options.appearance_update_policy.on_track_created = true;
        return crop_options;
    }(), recording_extractor);
    RawVideoFrame crop_frame;
    crop_frame.source_key = "stream-a";
    crop_frame.width = 20;
    crop_frame.height = 20;
    crop_frame.format = PixelFormat::RGB;
    crop_frame.pts = Ms(1000);
    crop_frame.data.assign(static_cast<std::size_t>(crop_frame.width * crop_frame.height * 3), 127U);
    crop_manager.Update("stream-a",
                        "channel-a",
                        {MakeObject(31, 1, 1000, 0.5F, 0.5F)},
                        Ms(1000),
                        &crop_frame);
    std::this_thread::sleep_for(std::chrono::milliseconds(20));
    crop_manager.Update("stream-a", "channel-a", {}, Ms(1010));
    const auto crop_states = crop_manager.Snapshot("channel-a");
    const auto* crop_track = FindTrack(crop_states, 31);
    Expect(crop_track != nullptr && crop_track->appearance_profile.has_value() &&
               crop_track->appearance_profile->embedding.size() == 3 &&
               recording_extractor->last_crop_width > 0 &&
               crop_manager.Metrics().appearance_extractor_stats.completed_count == 1,
           "TrackStateManager must pass bounded RGB bbox crops to appearance extractor policy calls");

    auto budget_extractor = std::make_shared<RecordingAppearanceExtractor>();
    TrackStateManager budget_manager([&] {
        TrackStateManagerOptions budget_options = options;
        budget_options.appearance_update_policy.enabled = true;
        budget_options.appearance_update_policy.on_track_created = true;
        budget_options.appearance_update_policy.max_queue_size = 1;
        budget_options.appearance_update_policy.per_stream_rate_limit_ms = 1000;
        budget_options.appearance_update_policy.global_max_queue_size = 4;
        return budget_options;
    }(), budget_extractor);
    budget_manager.Update("stream-a",
                          "channel-a",
                          {MakeObject(32, 1, 2000, 0.4F, 0.4F),
                           MakeObject(33, 1, 2000, 0.6F, 0.6F)},
                          Ms(2000),
                          &crop_frame);
    const auto budget_stats = budget_manager.Metrics().appearance_extractor_stats;
    Expect(budget_stats.queued_count == 1 && budget_stats.rate_limited_count == 1,
           "appearance execution budget must enforce per-stream Re-ID rate limits");

    app::AppConfig fallback_config;
    fallback_config.analysis_appearance_enabled = true;
    fallback_config.analysis_appearance_extractor = "onnx-reid";
    fallback_config.analysis_appearance_model_path = "/tmp/media-server-missing-reid-model.onnx";
    const auto fallback_extractor = CreateAppearanceExtractorFromConfig(fallback_config);
    Expect(fallback_extractor != nullptr &&
               fallback_extractor->Stats().extractor_name == "noop",
           "missing Re-ID model path must fall back to NoOpAppearanceExtractor");

    TrackStateManagerOptions speed_options = options;
    speed_options.use_ground_plane_for_speed = true;
    TrackStateManager speed_manager(speed_options);
    auto speed_object1 = MakeObject(50, 1, 1000, 0.2F, 0.2F);
    speed_object1.ground_point = GroundPointF{0.0, 0.0, true, false, "meters"};
    auto speed_object2 = MakeObject(50, 2, 2000, 0.3F, 0.2F);
    speed_object2.ground_point = GroundPointF{3.0, 4.0, true, false, "meters"};
    speed_manager.Update("stream-a", "channel-a", {speed_object1}, Ms(1000));
    speed_manager.Update("stream-a", "channel-a", {speed_object2}, Ms(2000));
    const auto speed_states = speed_manager.Snapshot("channel-a");
    const auto* speed_track = FindTrack(speed_states, 50);
    Expect(speed_track != nullptr && speed_track->latest_ground_point.has_value() &&
               speed_track->latest_speed_uses_ground_plane &&
               std::fabs(speed_track->latest_speed - 5.0) < 0.0001 &&
               speed_track->latest_speed_units == "meters_per_second",
           "TrackStateManager must calculate optional ground-plane speed from metadata ground points");

    Pass("TrackStateManager, TrackHealth, Appearance extractor/fallback, cleanup limits");
}

void VerifySceneContextBuilder() {
    SceneContextBuilder builder;
    const auto zone = MakeZone();
    const auto line = MakeLine();

    auto state = MakeTrackState(1, 1000, 0.2F, 0.2F);
    auto context = builder.Build("stream-a", "channel-a", {state}, {zone}, {line}, Ms(1000));
    Expect(context.tracks.size() == 1, "scene context must include active track");
    Expect(context.tracks[0].zone_state.current_zone == "restricted-a",
           "ZoneState currentZone must be calculated");
    Expect(context.tracks[0].zone_state.is_inside_restricted_zone,
           "ZoneState must detect restricted zone membership");

    state = MakeTrackState(1, 3000, 0.25F, 0.2F);
    context = builder.Build("stream-a", "channel-a", {state}, {zone}, {line}, Ms(3000));
    Expect(context.tracks[0].zone_state.dwell_time_ms == 2000,
           "ZoneState dwellTimeMs must be calculated from enteredAt");

    SceneGeometryConfig calibrated_geometry;
    calibrated_geometry.zones = {zone};
    calibrated_geometry.lines = {line};
    HomographyConfig homography;
    homography.calibration_id = "calibration-a";
    homography.channel_id = "channel-a";
    homography.enabled = true;
    homography.image_to_ground = {2.0, 0.0, 0.0,
                                  0.0, 3.0, 0.0,
                                  0.0, 0.0, 1.0};
    homography.units = "meters";
    calibrated_geometry.homographies.push_back(homography);
    const auto calibrated_trajectory = MakeTrajectory(1000,
                                                      {NormalizedPointF{0.2F, 0.25F},
                                                       NormalizedPointF{0.25F, 0.25F}},
                                                      2000);
    state.trajectory.assign(calibrated_trajectory.begin(), calibrated_trajectory.end());
    SceneContextBuilderOptions calibrated_builder_options;
    calibrated_builder_options.use_ground_plane_for_speed = true;
    SceneContextBuilder calibrated_builder(calibrated_builder_options);
    context = calibrated_builder.Build("stream-a", "channel-a", {state}, calibrated_geometry, Ms(3000));
    Expect(!context.tracks.empty() && std::fabs(context.tracks[0].foot_point.x - 0.25F) < 0.0001F &&
               std::fabs(context.tracks[0].foot_point.y - 0.25F) < 0.0001F,
           "SceneContextBuilder must use bbox bottom center as the image foot point");
    Expect(context.tracks[0].ground_point.valid &&
               !context.tracks[0].ground_point.fallback_to_image &&
               std::fabs(context.tracks[0].ground_point.x - 0.5) < 0.0001 &&
               std::fabs(context.tracks[0].ground_point.y - 0.75) < 0.0001 &&
               context.tracks[0].ground_point.units == "meters",
           "SceneContextBuilder must project bbox bottom center to ground-plane coordinates");
    Expect(context.tracks[0].trajectory.size() == 2 &&
               context.tracks[0].trajectory.back().ground_point.has_value() &&
               context.tracks[0].trajectory.back().ground_point->valid &&
               std::fabs(context.tracks[0].trajectory.back().ground_point->x - 0.5) < 0.0001 &&
               context.tracks[0].speed_uses_ground_plane &&
               std::fabs(context.tracks[0].speed - 0.05) < 0.0001 &&
               context.tracks[0].speed_units == "meters_per_second",
           "SceneContextBuilder must project trajectory points and calculate optional ground-plane speed");

    SceneGeometryConfig fallback_geometry;
    fallback_geometry.zones = {zone};
    context = builder.Build("stream-a", "channel-a", {state}, fallback_geometry, Ms(3100));
    Expect(!context.tracks.empty() && !context.tracks[0].ground_point.valid &&
               context.tracks[0].ground_point.fallback_to_image &&
               context.tracks[0].ground_point.units == "image",
           "SceneContextBuilder must fallback to image coordinates when homography is unset");

    state = MakeTrackState(1, 4000, 0.6F, 0.2F);
    context = builder.Build("stream-a", "channel-a", {state}, {zone}, {line}, Ms(4000));
    Expect(!context.tracks[0].line_states.empty(), "LineCrossState must be present");
    Expect(context.tracks[0].line_states[0].crossed, "LineCrossState must detect crossing");
    Expect(context.tracks[0].line_states[0].direction == "reverse",
           "LineCrossState must calculate crossing direction");

    const auto other_channel_state = MakeTrackState(2, 1000, 0.2F, 0.2F, "channel-b", "stream-b");
    context = builder.Build("stream-b", "channel-b", {other_channel_state}, {zone}, {line}, Ms(1000));
    Expect(context.tracks.size() == 1 && context.tracks[0].zone_state.current_zone.empty(),
           "scene geometry must stay channel scoped");

    const std::string normal_rule =
        R"({"id":"normal-zone","enabled":true,"match":{"sourceKind":"*","route":"*"},"event":{"region":{"type":"polygon","points":[{"x":0.1,"y":0.1},{"x":0.4,"y":0.1},{"x":0.4,"y":0.4}]}}})";
    const std::string va_rule =
        R"({"id":"va-zone","enabled":true,"match":{"vaRule":"7"},"event":{"region":{"type":"polygon","points":[{"x":0.2,"y":0.2},{"x":0.5,"y":0.2},{"x":0.5,"y":0.5}]}}})";
    AnalysisContext default_context;
    auto default_geometry = BuildSceneGeometryConfigFromRuleDocuments({normal_rule, va_rule}, default_context);
    Expect(default_geometry.zones.size() == 1 && default_geometry.zones[0].zone_id == "normal-zone",
           "default va=1 context must ignore vaRule scoped geometry");
    AnalysisContext va_context;
    va_context.va_rule_id = "7";
    auto scoped_geometry = BuildSceneGeometryConfigFromRuleDocuments({normal_rule, va_rule}, va_context);
    Expect(scoped_geometry.zones.size() == 1 && scoped_geometry.zones[0].zone_id == "va-zone",
           "vaRule context must use only matching vaRule geometry");

    Pass("SceneContextBuilder zone/line/dwell/channel/vaRule scoping");
}

void VerifyEventManager() {
    EventManager manager;
    EventLifecycleOptions options;
    options.cooldown_ms = 1000;
    options.update_interval_ms = 500;
    options.ended_retention_ms = 200;
    options.cleanup_interval_ms = 0;
    options.emit_start = true;
    options.emit_update = true;
    options.emit_confirmed = true;
    options.emit_end = true;

    auto decision = manager.Update(MakeCandidate(1, 1000, true), options);
    Expect(decision.emit && decision.stage == EventLifecycleStage::Start,
           "EventManager must emit start");
    decision = manager.Update(MakeCandidate(1, 1100, true), options);
    Expect(!decision.emit && decision.suppressed && decision.stage == EventLifecycleStage::Update,
           "EventManager must throttle duplicate updates");
    decision = manager.Update(MakeCandidate(1, 1600, true), options);
    Expect(decision.emit && decision.stage == EventLifecycleStage::Update,
           "EventManager must emit update after interval");
    decision = manager.Update(MakeCandidate(1, 1700, true, true), options);
    Expect(decision.emit && decision.stage == EventLifecycleStage::Confirmed,
           "EventManager must emit confirmed");
    decision = manager.Update(MakeCandidate(1, 1800, true, true), options);
    Expect(!decision.emit && decision.suppressed,
           "EventManager must suppress confirmed track duplicate update");
    decision = manager.Update(MakeCandidate(1, 1900, false), options);
    Expect(decision.emit && decision.stage == EventLifecycleStage::End,
           "EventManager must emit end when configured");
    decision = manager.Update(MakeCandidate(1, 2000, true), options);
    Expect(!decision.emit && decision.suppressed && decision.stage == EventLifecycleStage::Cooldown,
           "EventManager must suppress reactivation during cooldown");
    decision = manager.Update(MakeCandidate(1, 3100, true), options);
    Expect(decision.emit && decision.stage == EventLifecycleStage::Start,
           "EventManager must allow reactivation after cooldown");
    manager.Update(MakeCandidate(1, 3200, false), options);
    manager.Update(MakeCandidate(2, 3600, true), options);
    Expect(manager.Metrics().cleanup_runs > 0 && manager.Metrics().states_removed_by_cleanup > 0,
           "EventManager must cleanup expired event state");

    Pass("EventManager lifecycle/cooldown/dedup/cleanup");
}

void VerifyScenarioEngineAndIntrusionDwell() {
    ScenarioEngineOptions engine_options;
    engine_options.enabled = true;
    engine_options.default_cooldown_ms = 1000;
    engine_options.default_update_interval_ms = 0;
    engine_options.ended_retention_ms = 500;
    engine_options.cleanup_interval_ms = 0;
    engine_options.max_instances_per_channel = 32;

    IntrusionDwellScenarioOptions dwell_options;
    dwell_options.enabled = true;
    dwell_options.candidate_time_ms = 2000;
    dwell_options.dwell_time_ms = 10000;
    dwell_options.cooldown_ms = 1000;
    dwell_options.target_class_tokens = {"person"};
    dwell_options.restricted_zone_ids = {"restricted-a"};

    ScenarioEngine engine(engine_options);
    engine.RegisterScenario(std::make_unique<IntrusionDwellScenario>(dwell_options));
    EventManager event_manager;

    auto events = engine.Evaluate(MakeSceneContext(1000, {MakeTrackContext(1, 1000, true, 0)}), &event_manager);
    Expect(events.empty(), "IntrusionDwell must not emit before dwell threshold");
    Expect(engine.Snapshot("channel-a")[0].phase == ScenarioPhase::Candidate,
           "IntrusionDwell must enter Candidate on restricted zone entry");

    events = engine.Evaluate(MakeSceneContext(2999, {MakeTrackContext(1, 2999, true, 1999)}), &event_manager);
    Expect(events.empty() && engine.Snapshot("channel-a")[0].phase == ScenarioPhase::Candidate,
           "IntrusionDwell must not observe before candidateTimeMs");

    events = engine.Evaluate(MakeSceneContext(3000, {MakeTrackContext(1, 3000, true, 2000)}), &event_manager);
    Expect(events.empty() && engine.Snapshot("channel-a")[0].phase == ScenarioPhase::Observing,
           "IntrusionDwell must enter Observing after candidateTimeMs");

    events = engine.Evaluate(MakeSceneContext(11000, {MakeTrackContext(1, 11000, true, 10000)}), &event_manager);
    Expect(events.size() == 1 && events[0].event_type == "intrusion-dwell" && events[0].track_id == 1,
           "IntrusionDwell must emit one confirmed event after dwellTimeMs");
    Expect(engine.Snapshot("channel-a")[0].phase == ScenarioPhase::Confirmed,
           "IntrusionDwell must enter Confirmed phase");

    events = engine.Evaluate(MakeSceneContext(12000, {MakeTrackContext(1, 12000, true, 11000)}), &event_manager);
    Expect(events.empty(), "IntrusionDwell must not duplicate event for same track inside zone");

    events = engine.Evaluate(MakeSceneContext(13000, {MakeTrackContext(1, 13000, false, 0)}), &event_manager);
    Expect(events.empty() && engine.Snapshot("channel-a")[0].phase == ScenarioPhase::Ended,
           "IntrusionDwell must end when track exits zone");

    events = engine.Evaluate(MakeSceneContext(14500, {MakeTrackContext(1, 14500, true, 0)}), &event_manager);
    Expect(events.empty() && engine.Snapshot("channel-a")[0].phase == ScenarioPhase::Candidate,
           "IntrusionDwell must allow same track to start a new instance after re-entry");
    events = engine.Evaluate(MakeSceneContext(24500, {MakeTrackContext(1, 24500, true, 10000)}), &event_manager);
    Expect(events.size() == 1 && events[0].track_id == 1,
           "IntrusionDwell must emit again after a completed exit/re-entry cycle");

    ScenarioEngine cleanup_engine(engine_options);
    cleanup_engine.RegisterScenario(std::make_unique<IntrusionDwellScenario>(dwell_options));
    EventManager cleanup_events;
    cleanup_engine.Evaluate(MakeSceneContext(1000, {MakeTrackContext(10, 1000, true, 10000)}),
                            &cleanup_events);
    cleanup_engine.Evaluate(MakeSceneContext(1100, {MakeTrackContext(10, 1100, false, 0)}),
                            &cleanup_events);
    cleanup_engine.Evaluate(MakeSceneContext(2000, {MakeTrackContext(11, 2000, true, 0)}),
                            &cleanup_events);
    Expect(cleanup_engine.Metrics().instances_removed_by_cleanup > 0,
           "ScenarioEngine must cleanup expired ended scenario instances");

    Pass("ScenarioEngine and IntrusionDwellScenario phase/dedup/re-entry/cleanup");
}

void VerifyReEntryScenario() {
    ScenarioEngineOptions engine_options;
    engine_options.enabled = true;
    engine_options.default_cooldown_ms = 1000;
    engine_options.default_update_interval_ms = 0;
    engine_options.ended_retention_ms = 500;
    engine_options.cleanup_interval_ms = 0;
    engine_options.max_instances_per_channel = 32;

    ReEntryScenarioOptions options;
    options.enabled = true;
    options.re_entry_window_ms = 3000;
    options.cooldown_ms = 1000;
    options.target_class_tokens = {"person"};
    options.target_zone_ids = {"restricted-a"};

    ScenarioEngine engine(engine_options);
    engine.RegisterScenario(std::make_unique<ReEntryScenario>(options));
    EventManager event_manager;

    auto exit_context = MakeTrackContext(7, 1000, false, 0);
    exit_context.zone_state.previous_zone = "restricted-a";
    exit_context.zone_state.exited_at_ns = Ms(1000);
    exit_context.zone_state.exited_at_ms = 1000;
    exit_context.zone_state.changed = true;
    exit_context.zone_states[0] = exit_context.zone_state;
    auto events = engine.Evaluate(MakeSceneContext(1000, {exit_context}), &event_manager);
    Expect(events.empty(), "ReEntry must only record exit without emitting");

    events = engine.Evaluate(MakeSceneContext(2500, {MakeTrackContext(7, 2500, true, 0)}),
                             &event_manager);
    Expect(events.size() == 1 && events[0].event_type == "re-entry" &&
               events[0].track_id == 7 && events[0].zone_id == "restricted-a",
           "ReEntry must emit once when the same track re-enters inside the window");

    events = engine.Evaluate(MakeSceneContext(2600, {MakeTrackContext(7, 2600, true, 100)}),
                             &event_manager);
    Expect(events.empty(), "ReEntry must not duplicate while the track remains inside");

    auto second_exit = MakeTrackContext(7, 2700, false, 0);
    second_exit.zone_state.previous_zone = "restricted-a";
    second_exit.zone_state.exited_at_ns = Ms(2700);
    second_exit.zone_state.exited_at_ms = 2700;
    second_exit.zone_state.changed = true;
    second_exit.zone_states[0] = second_exit.zone_state;
    events = engine.Evaluate(MakeSceneContext(2700, {second_exit}), &event_manager);
    Expect(events.empty(), "ReEntry end phase must stay internal when emit_end is disabled");

    events = engine.Evaluate(MakeSceneContext(2800, {MakeTrackContext(7, 2800, true, 0)}),
                             &event_manager);
    Expect(events.empty(), "ReEntry must honor cooldown after a previous event");

    auto late_exit = MakeTrackContext(8, 1000, false, 0);
    late_exit.zone_state.previous_zone = "restricted-a";
    late_exit.zone_state.exited_at_ns = Ms(1000);
    late_exit.zone_state.exited_at_ms = 1000;
    late_exit.zone_state.changed = true;
    late_exit.zone_states[0] = late_exit.zone_state;
    engine.Evaluate(MakeSceneContext(1000, {late_exit}), &event_manager);
    events = engine.Evaluate(MakeSceneContext(4501, {MakeTrackContext(8, 4501, true, 0)}),
                             &event_manager);
    Expect(events.empty(), "ReEntry must not emit when re-entry window expired");

    Pass("ReEntryScenario exit/re-entry/cooldown/window");
}

LineCrossState MakeLineState(const std::string& line_id,
                             const std::string& allowed_direction,
                             const std::string& raw_direction,
                             bool raw_crossed = true) {
    LineCrossState line;
    line.line_id = line_id;
    line.allowed_direction = allowed_direction;
    line.previous_side = raw_direction == "reverse" ? 0.3F : -0.3F;
    line.current_side = raw_direction == "reverse" ? -0.3F : 0.3F;
    line.raw_crossed = raw_crossed;
    line.raw_direction = raw_crossed ? raw_direction : "none";
    line.direction_allowed = allowed_direction == "any" || allowed_direction == raw_direction;
    line.crossed = raw_crossed && line.direction_allowed;
    line.direction = line.crossed ? raw_direction : "none";
    return line;
}

void VerifyWrongDirectionScenario() {
    ScenarioEngineOptions engine_options;
    engine_options.enabled = true;
    engine_options.default_cooldown_ms = 1000;
    engine_options.default_update_interval_ms = 0;
    engine_options.ended_retention_ms = 500;
    engine_options.cleanup_interval_ms = 0;
    engine_options.max_instances_per_channel = 32;

    WrongDirectionScenarioOptions options;
    options.enabled = true;
    options.cooldown_ms = 1000;
    options.target_class_tokens = {"person"};
    options.target_line_ids = {"line-a"};

    ScenarioEngine engine(engine_options);
    engine.RegisterScenario(std::make_unique<WrongDirectionScenario>(options));
    EventManager event_manager;

    auto allowed_track = MakeTrackContext(20, 1000, false, 0);
    allowed_track.line_states.push_back(MakeLineState("line-a", "forward", "forward"));
    auto events = engine.Evaluate(MakeSceneContext(1000, {allowed_track}), &event_manager);
    Expect(events.empty(), "WrongDirection must not emit for allowed crossing direction");

    auto wrong_track = MakeTrackContext(20, 2000, false, 0);
    wrong_track.line_states.push_back(MakeLineState("line-a", "forward", "reverse"));
    events = engine.Evaluate(MakeSceneContext(2000, {wrong_track}), &event_manager);
    Expect(events.size() == 1 && events[0].event_type == "wrong-direction" &&
               events[0].line_id == "line-a" && events[0].track_id == 20,
           "WrongDirection must emit when raw crossing direction violates allowedDirection");

    auto no_cross_track = MakeTrackContext(20, 2100, false, 0);
    no_cross_track.line_states.push_back(MakeLineState("line-a", "forward", "none", false));
    events = engine.Evaluate(MakeSceneContext(2100, {no_cross_track}), &event_manager);
    Expect(events.empty(), "WrongDirection end phase must stay internal when emit_end is disabled");

    auto cooldown_track = MakeTrackContext(20, 2200, false, 0);
    cooldown_track.line_states.push_back(MakeLineState("line-a", "forward", "reverse"));
    events = engine.Evaluate(MakeSceneContext(2200, {cooldown_track}), &event_manager);
    Expect(events.empty(), "WrongDirection must suppress duplicate crossing during cooldown");

    WrongDirectionScenarioOptions override_options;
    override_options.enabled = true;
    override_options.cooldown_ms = 1000;
    override_options.target_class_tokens = {"person"};
    override_options.allowed_direction_rules = {"line-b:reverse"};
    ScenarioEngine override_engine(engine_options);
    override_engine.RegisterScenario(std::make_unique<WrongDirectionScenario>(override_options));
    EventManager override_events;
    auto override_track = MakeTrackContext(21, 3000, false, 0);
    override_track.line_states.push_back(MakeLineState("line-b", "any", "forward"));
    events = override_engine.Evaluate(MakeSceneContext(3000, {override_track}), &override_events);
    Expect(events.size() == 1 && events[0].line_id == "line-b",
           "WrongDirection must support lineId-specific allowedDirection overrides");

    Pass("WrongDirectionScenario allowed/raw direction/cooldown");
}

void VerifyIntrusionAfterLineCrossingScenario() {
    ScenarioEngineOptions engine_options;
    engine_options.enabled = true;
    engine_options.default_cooldown_ms = 1000;
    engine_options.default_update_interval_ms = 0;
    engine_options.ended_retention_ms = 500;
    engine_options.cleanup_interval_ms = 0;
    engine_options.max_instances_per_channel = 32;

    IntrusionAfterLineCrossingScenarioOptions options;
    options.enabled = true;
    options.max_delay_after_crossing_ms = 3000;
    options.dwell_time_ms = 2000;
    options.cooldown_ms = 1000;
    options.target_class_tokens = {"person"};
    options.target_line_ids = {"entry-line"};
    options.target_zone_ids = {"target-zone"};

    ScenarioEngine engine(engine_options);
    engine.RegisterScenario(std::make_unique<IntrusionAfterLineCrossingScenario>(options));
    EventManager event_manager;

    auto line_crossed = MakeTrackContext(30, 1000, false, 0, "target-zone");
    line_crossed.line_states.push_back(MakeLineState("entry-line", "any", "forward"));
    auto events = engine.Evaluate(MakeSceneContext(1000, {line_crossed}), &event_manager);
    Expect(events.empty() && engine.Snapshot("channel-a")[0].phase == ScenarioPhase::LineCrossed,
           "IntrusionAfterLineCrossing must record line crossing before zone entry");

    events = engine.Evaluate(MakeSceneContext(1500, {MakeTrackContext(30, 1500, true, 0, "target-zone")}),
                             &event_manager);
    Expect(events.empty() && engine.Snapshot("channel-a")[0].phase == ScenarioPhase::ZoneEntered,
           "IntrusionAfterLineCrossing must enter ZoneEntered on target zone entry");

    events = engine.Evaluate(MakeSceneContext(2500, {MakeTrackContext(30, 2500, true, 1000, "target-zone")}),
                             &event_manager);
    Expect(events.empty() && engine.Snapshot("channel-a")[0].phase == ScenarioPhase::Observing,
           "IntrusionAfterLineCrossing must observe until dwellTimeMs");

    events = engine.Evaluate(MakeSceneContext(3500, {MakeTrackContext(30, 3500, true, 2000, "target-zone")}),
                             &event_manager);
    Expect(events.size() == 1 &&
               events[0].event_type == "intrusion-after-line-crossing" &&
               events[0].line_id == "entry-line" &&
               events[0].zone_id == "target-zone",
           "IntrusionAfterLineCrossing must emit after line crossing, zone entry, and dwell");
    Expect(engine.Snapshot("channel-a")[0].phase == ScenarioPhase::Confirmed,
           "IntrusionAfterLineCrossing must enter Confirmed phase");

    events = engine.Evaluate(MakeSceneContext(3600, {MakeTrackContext(30, 3600, true, 2100, "target-zone")}),
                             &event_manager);
    Expect(events.empty(), "IntrusionAfterLineCrossing must not duplicate while condition remains true");

    events = engine.Evaluate(MakeSceneContext(3700, {MakeTrackContext(30, 3700, false, 0, "target-zone")}),
                             &event_manager);
    Expect(events.empty() && engine.Snapshot("channel-a")[0].phase == ScenarioPhase::Ended,
           "IntrusionAfterLineCrossing must end when track exits the target zone");

    auto late_crossed = MakeTrackContext(31, 10000, false, 0, "target-zone");
    late_crossed.line_states.push_back(MakeLineState("entry-line", "any", "forward"));
    engine.Evaluate(MakeSceneContext(10000, {late_crossed}), &event_manager);
    events = engine.Evaluate(MakeSceneContext(13501, {MakeTrackContext(31, 13501, true, 2000, "target-zone")}),
                             &event_manager);
    Expect(events.empty(), "IntrusionAfterLineCrossing must respect maxDelayAfterCrossingMs");

    Pass("IntrusionAfterLineCrossingScenario line/zone/dwell/dedup/window");
}

void VerifyLoiteringScenario() {
    ScenarioEngineOptions engine_options;
    engine_options.enabled = true;
    engine_options.default_cooldown_ms = 1000;
    engine_options.default_update_interval_ms = 0;
    engine_options.ended_retention_ms = 500;
    engine_options.cleanup_interval_ms = 0;
    engine_options.max_instances_per_channel = 32;

    LoiteringScenarioOptions options;
    options.enabled = true;
    options.min_dwell_time_ms = 3000;
    options.max_movement_radius = 0.05F;
    options.min_trajectory_points = 3;
    options.cooldown_ms = 1000;
    options.target_class_tokens = {"person"};
    options.target_zone_ids = {"loiter-zone"};

    ScenarioEngine engine(engine_options);
    engine.RegisterScenario(std::make_unique<LoiteringScenario>(options));
    EventManager event_manager;

    auto candidate = MakeTrackContext(40, 1000, true, 0, "loiter-zone");
    candidate.trajectory = MakeTrajectory(1000, {NormalizedPointF{0.2F, 0.2F}});
    auto events = engine.Evaluate(MakeSceneContext(1000, {candidate}), &event_manager);
    Expect(events.empty() && engine.Snapshot("channel-a")[0].phase == ScenarioPhase::Candidate,
           "Loitering must start as Candidate inside target zone");

    auto observing = MakeTrackContext(40, 2500, true, 1500, "loiter-zone");
    observing.trajectory = MakeTrajectory(1000,
                                          {NormalizedPointF{0.2F, 0.2F},
                                           NormalizedPointF{0.22F, 0.2F}});
    events = engine.Evaluate(MakeSceneContext(2500, {observing}), &event_manager);
    Expect(events.empty() && engine.Snapshot("channel-a")[0].phase == ScenarioPhase::Observing,
           "Loitering must observe until dwell and trajectory thresholds are met");

    auto confirmed = MakeTrackContext(40, 4000, true, 3000, "loiter-zone");
    confirmed.trajectory = MakeTrajectory(1000,
                                          {NormalizedPointF{0.2F, 0.2F},
                                           NormalizedPointF{0.22F, 0.2F},
                                           NormalizedPointF{0.21F, 0.21F},
                                           NormalizedPointF{0.2F, 0.22F}});
    events = engine.Evaluate(MakeSceneContext(4000, {confirmed}), &event_manager);
    Expect(events.size() == 1 && events[0].event_type == "loitering" &&
               events[0].zone_id == "loiter-zone" && events[0].track_id == 40,
           "Loitering must emit after dwell and small movement radius conditions are met");
    Expect(engine.Snapshot("channel-a")[0].phase == ScenarioPhase::Confirmed,
           "Loitering must enter Confirmed phase");

    events = engine.Evaluate(MakeSceneContext(4100, {confirmed}), &event_manager);
    Expect(events.empty(), "Loitering must not duplicate while the track remains in the zone");

    auto exited = MakeTrackContext(40, 4200, false, 0, "loiter-zone");
    events = engine.Evaluate(MakeSceneContext(4200, {exited}), &event_manager);
    Expect(events.empty() && engine.Snapshot("channel-a")[0].phase == ScenarioPhase::Ended,
           "Loitering must end when the track exits the target zone");

    ScenarioEngine moving_engine(engine_options);
    moving_engine.RegisterScenario(std::make_unique<LoiteringScenario>(options));
    EventManager moving_events;
    auto moving = MakeTrackContext(41, 5000, true, 3000, "loiter-zone");
    moving.trajectory = MakeTrajectory(2000,
                                       {NormalizedPointF{0.2F, 0.2F},
                                        NormalizedPointF{0.32F, 0.2F},
                                        NormalizedPointF{0.44F, 0.2F},
                                        NormalizedPointF{0.55F, 0.2F}});
    events = moving_engine.Evaluate(MakeSceneContext(5000, {moving}), &moving_events);
    Expect(events.empty(), "Loitering must not emit when movement radius is larger than threshold");

    LoiteringScenarioOptions ground_options = options;
    ground_options.use_ground_plane_movement_radius = true;
    ScenarioEngine ground_engine(engine_options);
    ground_engine.RegisterScenario(std::make_unique<LoiteringScenario>(ground_options));
    EventManager ground_events;
    auto ground_loitering = MakeTrackContext(42, 6000, true, 3000, "loiter-zone");
    ground_loitering.trajectory = MakeTrajectory(3000,
                                                 {NormalizedPointF{0.2F, 0.2F},
                                                  NormalizedPointF{0.4F, 0.2F},
                                                  NormalizedPointF{0.6F, 0.2F},
                                                  NormalizedPointF{0.8F, 0.2F}},
                                                 1000);
    for (std::size_t i = 0; i < ground_loitering.trajectory.size(); ++i) {
        ground_loitering.trajectory[i].ground_point =
            GroundPointF{0.01 * static_cast<double>(i), 0.0, true, false, "meters"};
    }
    events = ground_engine.Evaluate(MakeSceneContext(6000, {ground_loitering}), &ground_events);
    Expect(events.size() == 1 && events[0].event_type == "loitering" &&
               events[0].metadata_json.find("\"usesGroundPlane\":true") != std::string::npos,
           "Loitering must optionally use ground-plane trajectory radius when available");

    Pass("LoiteringScenario dwell/trajectory/radius/dedup/exit");
}

}  // namespace

int main() {
    try {
        VerifyObjectTrackerAssociationScoring();
        VerifyTrackStateManagerAndHealth();
        VerifySceneContextBuilder();
        VerifyEventManager();
        VerifyScenarioEngineAndIntrusionDwell();
        VerifyReEntryScenario();
        VerifyWrongDirectionScenario();
        VerifyIntrusionAfterLineCrossingScenario();
        VerifyLoiteringScenario();
        std::cout << "[summary] pass=" << g_pass_count << " fail=0\n";
        return EXIT_SUCCESS;
    } catch (const std::exception& ex) {
        std::cerr << "[fail] " << ex.what() << "\n";
        std::cerr << "[summary] pass=" << g_pass_count << " fail=1\n";
        return EXIT_FAILURE;
    }
}

// 파일 요약: VA state/scenario 계층의 단위성 smoke 검증을 수행한다.
// 동작 요약: 서버를 띄우지 않고 TrackState, SceneContext, EventManager, ScenarioEngine,
// Appearance hook, cleanup 정책을 mock metadata로 직접 검증한다.
#include "analysis/appearance_extractor.h"
#include "analysis/event_manager.h"
#include "analysis/intrusion_dwell_scenario.h"
#include "analysis/scenario_engine.h"
#include "analysis/scene_context_builder.h"
#include "analysis/track_state_manager.h"

#include <cmath>
#include <cstdlib>
#include <iostream>
#include <sstream>
#include <stdexcept>
#include <string>
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

    health_manager.Update("stream-a", "channel-a", {MakeObject(20, 2, 1100, 0.9F, 0.9F, "left")}, Ms(1100));
    health_manager.Update("stream-a", "channel-a", {MakeObject(20, 3, 1200, 0.2F, 0.2F, "right")}, Ms(1200));
    health_states = health_manager.Snapshot("channel-a");
    health_track = FindTrack(health_states, 20);
    Expect(health_track != nullptr &&
               (health_track->health.direction_change_count > 0 ||
                health_track->health.association_confidence < options.low_association_confidence_threshold),
           "TrackHealth must record direction changes or low association confidence");

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

    Pass("TrackStateManager, TrackHealth, Appearance NoOp, cleanup limits");
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

}  // namespace

int main() {
    try {
        VerifyTrackStateManagerAndHealth();
        VerifySceneContextBuilder();
        VerifyEventManager();
        VerifyScenarioEngineAndIntrusionDwell();
        std::cout << "[summary] pass=" << g_pass_count << " fail=0\n";
        return EXIT_SUCCESS;
    } catch (const std::exception& ex) {
        std::cerr << "[fail] " << ex.what() << "\n";
        std::cerr << "[summary] pass=" << g_pass_count << " fail=1\n";
        return EXIT_FAILURE;
    }
}

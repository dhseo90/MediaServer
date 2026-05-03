// 파일 요약: IntrusionDwellScenario의 제한구역 체류 상태 머신을 구현한다.
// 동작 요약: Candidate(진입), Observing(2초), Confirmed(10초), Ended(이탈)를 track별로 산출한다.
// 동작 요약: 기존 intrusion rule event와 별도 타입 intrusion-dwell 이벤트만 생성한다.
#include "analysis/intrusion_dwell_scenario.h"

#include "analysis/category_tokens.h"

#include <algorithm>
#include <utility>

namespace analysis {

namespace {

constexpr const char* kScenarioId = "intrusion-dwell";

std::string NormalizeZoneId(std::string value) {
    return value;
}

bool IsWildcardToken(const std::string& value) {
    const std::string normalized = NormalizeClassToken(value);
    return IsAllClassesToken(normalized);
}

}  // namespace

IntrusionDwellScenarioOptions BuildIntrusionDwellScenarioOptionsFromConfig(const app::AppConfig& config) {
    IntrusionDwellScenarioOptions options;
    options.enabled = config.analysis_intrusion_dwell_enabled;
    options.candidate_time_ms = config.analysis_intrusion_dwell_candidate_ms;
    options.dwell_time_ms = config.analysis_intrusion_dwell_dwell_ms;
    options.cooldown_ms = config.analysis_intrusion_dwell_cooldown_ms;
    options.target_class_tokens = config.analysis_intrusion_dwell_target_classes;
    options.restricted_zone_ids = config.analysis_intrusion_dwell_restricted_zone_ids;
    return options;
}

IntrusionDwellScenario::IntrusionDwellScenario(IntrusionDwellScenarioOptions options)
    : options_(std::move(options)) {
    options_.candidate_time_ms = std::max(0, options_.candidate_time_ms);
    options_.dwell_time_ms = std::max(options_.candidate_time_ms, options_.dwell_time_ms);
    options_.cooldown_ms = std::max(0, options_.cooldown_ms);
    if (options_.target_class_tokens.empty()) {
        options_.target_class_tokens.push_back("person");
    }
}

std::string IntrusionDwellScenario::ScenarioId() const {
    return kScenarioId;
}

std::string IntrusionDwellScenario::ScenarioKey() const {
    return options_.scenario_key.empty() ? ScenarioId() : options_.scenario_key;
}

ScenarioUpdate IntrusionDwellScenario::Evaluate(const SceneContext& scene_context,
                                                const TrackSceneContext& track_context,
                                                const ScenarioInstance* previous_instance) {
    (void)scene_context;
    ScenarioUpdate update;
    if (!options_.enabled || track_context.track_id == 0 ||
        (track_context.lifecycle_state != TrackLifecycleState::Active &&
         track_context.lifecycle_state != TrackLifecycleState::Reacquired) ||
        (options_.require_stable_track && track_context.track_health.is_unstable) ||
        !MatchesTargetClass(track_context)) {
        if (previous_instance != nullptr &&
            (previous_instance->phase == ScenarioPhase::Candidate ||
             previous_instance->phase == ScenarioPhase::Observing ||
             previous_instance->phase == ScenarioPhase::Confirmed)) {
            update.phase = ScenarioPhase::Ended;
            update.zone_id = previous_instance->zone_id;
            update.active = false;
            AnalysisEvent event;
            event.rule_id = std::string(kScenarioId) + ":" + previous_instance->zone_id;
            event.event_type = kScenarioId;
            event.track_id = track_context.track_id;
            event.class_id = track_context.class_id;
            event.label = track_context.class_name;
            event.score = track_context.confidence;
            event.box = track_context.bbox;
            event.highlight_enabled = true;
            event.highlight_color = "#ff0000";
            event.highlight_duration_ms = 1500;
            event.post_enabled = false;
            event.zone_id = previous_instance->zone_id;
            event.scenario_name = kScenarioId;
            event.scenario_phase = "ended";
            update.event = event;
        }
        return update;
    }

    const ZoneState* zone_state = ActiveRestrictedZone(track_context);
    if (zone_state == nullptr) {
        if (previous_instance != nullptr &&
            (previous_instance->phase == ScenarioPhase::Candidate ||
             previous_instance->phase == ScenarioPhase::Observing ||
             previous_instance->phase == ScenarioPhase::Confirmed)) {
            update.phase = ScenarioPhase::Ended;
            update.zone_id = previous_instance->zone_id;
            update.active = false;
            update.event = BuildEvent(track_context, track_context.zone_state);
            update.event->rule_id = std::string(kScenarioId) + ":" + previous_instance->zone_id;
        }
        return update;
    }

    update.zone_id = zone_state->current_zone;
    update.active = true;
    update.confirmed = zone_state->dwell_time_ms >= options_.dwell_time_ms;
    update.event = BuildEvent(track_context, *zone_state);

    if (zone_state->dwell_time_ms >= options_.dwell_time_ms) {
        update.phase = ScenarioPhase::Confirmed;
    } else if (zone_state->dwell_time_ms >= options_.candidate_time_ms) {
        update.phase = ScenarioPhase::Observing;
    } else {
        update.phase = ScenarioPhase::Candidate;
    }
    return update;
}

EventLifecycleOptions IntrusionDwellScenario::EventOptions(const ScenarioInstance& instance,
                                                           const ScenarioEngineOptions& engine_options) const {
    (void)instance;
    EventLifecycleOptions options;
    options.cooldown_ms = options_.cooldown_ms > 0 ? options_.cooldown_ms : engine_options.default_cooldown_ms;
    options.update_interval_ms = engine_options.default_update_interval_ms;
    options.ended_retention_ms = engine_options.ended_retention_ms;
    options.emit_start = false;
    options.emit_update = false;
    options.emit_confirmed = true;
    options.emit_end = false;
    return options;
}

bool IntrusionDwellScenario::MatchesTargetClass(const TrackSceneContext& track_context) const {
    const std::string label = NormalizeClassToken(track_context.class_name);
    const std::string class_id = std::to_string(track_context.class_id);
    for (const auto& raw_token : options_.target_class_tokens) {
        const std::string wanted = NormalizeClassToken(raw_token);
        if (wanted.empty()) {
            continue;
        }
        if (IsAllClassesToken(wanted) || wanted == label || wanted == class_id ||
            MatchesCategoryToken(wanted, label)) {
            return true;
        }
    }
    return false;
}

bool IntrusionDwellScenario::ZoneAllowed(const std::string& zone_id) const {
    if (options_.restricted_zone_ids.empty()) {
        return true;
    }
    const std::string normalized_zone_id = NormalizeZoneId(zone_id);
    return std::any_of(options_.restricted_zone_ids.begin(),
                       options_.restricted_zone_ids.end(),
                       [&](const std::string& allowed) {
                           return IsWildcardToken(allowed) || NormalizeZoneId(allowed) == normalized_zone_id;
                       });
}

const ZoneState* IntrusionDwellScenario::ActiveRestrictedZone(const TrackSceneContext& track_context) const {
    for (const auto& zone_state : track_context.zone_states) {
        if (zone_state.current_zone.empty() || !zone_state.is_inside_restricted_zone) {
            continue;
        }
        if (ZoneAllowed(zone_state.current_zone)) {
            return &zone_state;
        }
    }
    if (!track_context.zone_state.current_zone.empty() &&
        track_context.zone_state.is_inside_restricted_zone &&
        ZoneAllowed(track_context.zone_state.current_zone)) {
        return &track_context.zone_state;
    }
    return nullptr;
}

AnalysisEvent IntrusionDwellScenario::BuildEvent(const TrackSceneContext& track_context,
                                                 const ZoneState& zone_state) const {
    AnalysisEvent event;
    event.rule_id = std::string(kScenarioId) + ":" + zone_state.current_zone;
    event.event_type = kScenarioId;
    event.track_id = track_context.track_id;
    event.class_id = track_context.class_id;
    event.label = track_context.class_name;
    event.score = track_context.confidence;
    event.box = track_context.bbox;
    event.highlight_color = "#ff0000";
    event.highlight_duration_ms = 1500;
    event.highlight_enabled = true;
    event.post_enabled = false;
    event.zone_id = zone_state.current_zone;
    event.scenario_name = kScenarioId;
    return event;
}

}  // namespace analysis

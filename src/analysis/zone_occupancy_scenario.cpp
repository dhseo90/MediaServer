// 파일 요약: ZoneOccupancyScenario의 zone별 동시 점유 임계값 기반 상태 머신을 구현한다.
// 동작 요약: target zone 안에 충분한 대상 track이 최소 dwell을 만족하면 대표 track에서 event를 1회 emit한다.
// 동작 요약: 별도 군중 모델 없이 SceneContext의 zone state와 track metadata만 사용한다.
#include "analysis/zone_occupancy_scenario.h"

#include "analysis/category_tokens.h"

#include <algorithm>
#include <cctype>
#include <sstream>
#include <utility>

namespace analysis {

namespace {

constexpr const char* kScenarioId = "zone-occupancy";

std::string Trim(std::string value) {
    while (!value.empty() && std::isspace(static_cast<unsigned char>(value.front())) != 0) {
        value.erase(value.begin());
    }
    while (!value.empty() && std::isspace(static_cast<unsigned char>(value.back())) != 0) {
        value.pop_back();
    }
    return value;
}

bool IsWildcardToken(const std::string& value) {
    const std::string normalized = NormalizeClassToken(value);
    return IsAllClassesToken(normalized);
}

std::int64_t MsToNs(int value_ms) {
    return static_cast<std::int64_t>(std::max(0, value_ms)) * 1000000LL;
}

bool IsActiveScenarioPhase(ScenarioPhase phase) {
    return phase == ScenarioPhase::Candidate || phase == ScenarioPhase::Observing ||
           phase == ScenarioPhase::Confirmed;
}

std::string JsonEscape(const std::string& value) {
    std::ostringstream out;
    for (const char ch : value) {
        switch (ch) {
            case '\\':
                out << "\\\\";
                break;
            case '"':
                out << "\\\"";
                break;
            case '\n':
                out << "\\n";
                break;
            case '\r':
                out << "\\r";
                break;
            case '\t':
                out << "\\t";
                break;
            default:
                out << ch;
                break;
        }
    }
    return out.str();
}

}  // namespace

ZoneOccupancyScenarioOptions BuildZoneOccupancyScenarioOptionsFromConfig(
    const core::AnalysisRuntimeConfig& config) {
    ZoneOccupancyScenarioOptions options;
    options.enabled = config.analysis_zone_occupancy_enabled;
    options.occupancy_threshold = config.analysis_zone_occupancy_threshold;
    options.min_dwell_time_ms = config.analysis_zone_occupancy_min_dwell_time_ms;
    options.cooldown_ms = config.analysis_zone_occupancy_cooldown_ms;
    options.target_class_tokens = config.analysis_zone_occupancy_target_classes;
    options.target_zone_ids = config.analysis_zone_occupancy_target_zone_ids;
    return options;
}

ZoneOccupancyScenario::ZoneOccupancyScenario(ZoneOccupancyScenarioOptions options)
    : options_(std::move(options)) {
    options_.occupancy_threshold = std::max<std::size_t>(1, options_.occupancy_threshold);
    options_.min_dwell_time_ms = std::max(0, options_.min_dwell_time_ms);
    options_.cooldown_ms = std::max(0, options_.cooldown_ms);
    if (options_.target_class_tokens.empty()) {
        options_.target_class_tokens.push_back("person");
    }
}

std::string ZoneOccupancyScenario::ScenarioId() const {
    return kScenarioId;
}

std::string ZoneOccupancyScenario::ScenarioKey() const {
    return options_.scenario_key.empty() ? ScenarioId() : options_.scenario_key;
}

ScenarioUpdate ZoneOccupancyScenario::Evaluate(const SceneContext& scene_context,
                                               const TrackSceneContext& track_context,
                                               const ScenarioInstance* previous_instance) {
    ScenarioUpdate update;
    if (!options_.enabled || !TrackEligible(track_context)) {
        if (previous_instance != nullptr && IsActiveScenarioPhase(previous_instance->phase)) {
            update.phase = ScenarioPhase::Ended;
            update.zone_id = previous_instance->zone_id;
            update.active = false;
            update.event = BuildEndEvent(track_context, previous_instance->zone_id);
        }
        return update;
    }

    const ZoneState* zone_state = ActiveTargetZone(track_context);
    if (zone_state == nullptr) {
        if (previous_instance != nullptr && IsActiveScenarioPhase(previous_instance->phase)) {
            update.phase = ScenarioPhase::Ended;
            update.zone_id = previous_instance->zone_id;
            update.active = false;
            update.event = BuildEndEvent(track_context, previous_instance->zone_id);
        }
        return update;
    }

    const OccupancySummary summary =
        BuildOccupancySummary(scene_context, zone_state->current_zone);
    if (summary.representative_track_id != track_context.track_id) {
        if (previous_instance != nullptr && IsActiveScenarioPhase(previous_instance->phase)) {
            update.phase = ScenarioPhase::Ended;
            update.zone_id = previous_instance->zone_id;
            update.active = false;
        }
        return update;
    }

    update.zone_id = summary.zone_id;
    update.active = summary.occupancy_count > 0;
    const bool threshold_met = summary.dwell_qualified_count >= options_.occupancy_threshold;
    auto& state = states_by_zone_[RuntimeZoneKey(scene_context, summary.zone_id)];
    if (state.last_seen_ns > 0 &&
        scene_context.timestamp_ns - state.last_seen_ns > MsToNs(options_.cooldown_ms)) {
        state.active = false;
    }
    state.last_seen_ns = scene_context.timestamp_ns;

    if (threshold_met) {
        update.phase = ScenarioPhase::Confirmed;
        update.confirmed = true;
        if (!state.active ||
            scene_context.timestamp_ns - state.last_confirmed_ns >= MsToNs(options_.cooldown_ms)) {
            update.event = BuildEvent(track_context, summary);
            state.last_confirmed_ns = scene_context.timestamp_ns;
        }
        state.active = true;
        return update;
    }

    state.active = false;
    if (summary.occupancy_count > 0) {
        update.phase = ScenarioPhase::Observing;
        return update;
    }
    if (previous_instance != nullptr && IsActiveScenarioPhase(previous_instance->phase)) {
        update.phase = ScenarioPhase::Ended;
        update.zone_id = previous_instance->zone_id;
        update.active = false;
    }
    return update;
}

EventLifecycleOptions ZoneOccupancyScenario::EventOptions(
    const ScenarioInstance& instance,
    const ScenarioEngineOptions& engine_options) const {
    (void)instance;
    EventLifecycleOptions options;
    options.cooldown_ms = options_.cooldown_ms > 0 ? options_.cooldown_ms
                                                   : engine_options.default_cooldown_ms;
    options.update_interval_ms = engine_options.default_update_interval_ms;
    options.ended_retention_ms = engine_options.ended_retention_ms;
    options.cleanup_interval_ms = engine_options.cleanup_interval_ms;
    options.emit_start = false;
    options.emit_update = false;
    options.emit_confirmed = true;
    options.emit_end = false;
    return options;
}

bool ZoneOccupancyScenario::MatchesTargetClass(const TrackSceneContext& track_context) const {
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

bool ZoneOccupancyScenario::TrackEligible(const TrackSceneContext& track_context) const {
    return track_context.track_id != 0 &&
           (track_context.lifecycle_state == TrackLifecycleState::Active ||
            track_context.lifecycle_state == TrackLifecycleState::Reacquired) &&
           (!options_.require_stable_track || !track_context.track_health.is_unstable) &&
           MatchesTargetClass(track_context);
}

bool ZoneOccupancyScenario::ZoneAllowed(const std::string& zone_id) const {
    if (options_.target_zone_ids.empty()) {
        return true;
    }
    const std::string normalized_zone_id = Trim(zone_id);
    return std::any_of(options_.target_zone_ids.begin(),
                       options_.target_zone_ids.end(),
                       [&](const std::string& allowed) {
                           return IsWildcardToken(allowed) || Trim(allowed) == normalized_zone_id;
                       });
}

const ZoneState* ZoneOccupancyScenario::ActiveTargetZone(
    const TrackSceneContext& track_context) const {
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

ZoneOccupancyScenario::OccupancySummary ZoneOccupancyScenario::BuildOccupancySummary(
    const SceneContext& scene_context,
    const std::string& zone_id) const {
    OccupancySummary summary;
    summary.zone_id = zone_id;
    for (const auto& track : scene_context.tracks) {
        if (!TrackEligible(track)) {
            continue;
        }
        const ZoneState* zone_state = ActiveTargetZone(track);
        if (zone_state == nullptr || zone_state->current_zone != zone_id) {
            continue;
        }
        ++summary.occupancy_count;
        if (summary.representative_track_id == 0 ||
            track.track_id < summary.representative_track_id) {
            summary.representative_track_id = track.track_id;
            summary.representative_zone_state = zone_state;
        }
        if (zone_state->dwell_time_ms >= options_.min_dwell_time_ms) {
            ++summary.dwell_qualified_count;
            if (summary.min_dwell_observed_ms == 0 ||
                zone_state->dwell_time_ms < summary.min_dwell_observed_ms) {
                summary.min_dwell_observed_ms = zone_state->dwell_time_ms;
            }
        }
    }
    return summary;
}

std::string ZoneOccupancyScenario::RuntimeZoneKey(const SceneContext& scene_context,
                                                  const std::string& zone_id) const {
    const std::string channel = scene_context.channel_id.empty() ? scene_context.stream_id
                                                                 : scene_context.channel_id;
    return scene_context.stream_id + "/" + channel + "/" + zone_id;
}

AnalysisEvent ZoneOccupancyScenario::BuildEvent(const TrackSceneContext& track_context,
                                                const OccupancySummary& summary) const {
    AnalysisEvent event;
    event.rule_id = std::string(kScenarioId) + ":" + summary.zone_id;
    event.event_type = kScenarioId;
    event.track_id = track_context.track_id;
    event.class_id = track_context.class_id;
    event.label = track_context.class_name;
    event.score = track_context.confidence;
    event.box = track_context.bbox;
    event.highlight_color = "#14b8a6";
    event.highlight_duration_ms = 1500;
    event.highlight_enabled = true;
    event.post_enabled = false;
    event.zone_id = summary.zone_id;
    event.scenario_name = kScenarioId;
    event.metadata_json = std::string{"{\"zoneId\":\""} + JsonEscape(summary.zone_id) +
                          "\",\"occupancyCount\":" +
                          std::to_string(summary.occupancy_count) +
                          ",\"dwellQualifiedCount\":" +
                          std::to_string(summary.dwell_qualified_count) +
                          ",\"occupancyThreshold\":" +
                          std::to_string(options_.occupancy_threshold) +
                          ",\"minDwellTimeMs\":" +
                          std::to_string(options_.min_dwell_time_ms) +
                          ",\"minDwellObservedMs\":" +
                          std::to_string(summary.min_dwell_observed_ms) +
                          ",\"representativeTrackId\":" +
                          std::to_string(summary.representative_track_id) + "}";
    return event;
}

AnalysisEvent ZoneOccupancyScenario::BuildEndEvent(const TrackSceneContext& track_context,
                                                   const std::string& zone_id) const {
    AnalysisEvent event;
    event.rule_id = std::string(kScenarioId) + ":" + zone_id;
    event.event_type = kScenarioId;
    event.track_id = track_context.track_id;
    event.class_id = track_context.class_id;
    event.label = track_context.class_name;
    event.score = track_context.confidence;
    event.box = track_context.bbox;
    event.highlight_color = "#14b8a6";
    event.highlight_duration_ms = 1500;
    event.highlight_enabled = true;
    event.post_enabled = false;
    event.zone_id = zone_id;
    event.scenario_name = kScenarioId;
    event.scenario_phase = "ended";
    return event;
}

}  // namespace analysis

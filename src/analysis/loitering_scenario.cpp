// 파일 요약: LoiteringScenario의 zone dwell + trajectory radius 기반 상태 머신을 구현한다.
// 동작 요약: Candidate/Observing/Confirmed/Ended phase를 산출하고 loitering 이벤트를 EventManager로 전달한다.
// 동작 요약: 행동 인식 모델 없이 bounded trajectory metadata만 사용한다.
#include "analysis/loitering_scenario.h"

#include "analysis/category_tokens.h"

#include <algorithm>
#include <cmath>
#include <cctype>
#include <sstream>
#include <utility>

namespace analysis {

namespace {

constexpr const char* kScenarioId = "loitering";

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

bool IsActiveScenarioPhase(ScenarioPhase phase) {
    return phase == ScenarioPhase::Candidate || phase == ScenarioPhase::Observing ||
           phase == ScenarioPhase::Confirmed;
}

bool IsUsableGroundPoint(const std::optional<GroundPointF>& point) {
    return point.has_value() && point->valid && !point->fallback_to_image;
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

LoiteringScenarioOptions BuildLoiteringScenarioOptionsFromConfig(const app::AppConfig& config) {
    LoiteringScenarioOptions options;
    options.enabled = config.analysis_loitering_enabled;
    options.min_dwell_time_ms = config.analysis_loitering_min_dwell_time_ms;
    options.max_movement_radius = config.analysis_loitering_max_movement_radius;
    options.min_trajectory_points = config.analysis_loitering_min_trajectory_points;
    options.cooldown_ms = config.analysis_loitering_cooldown_ms;
    options.use_ground_plane_movement_radius =
        config.analysis_loitering_use_ground_plane ||
        config.analysis_ground_plane_movement_radius_enabled;
    options.target_class_tokens = config.analysis_loitering_target_classes;
    options.target_zone_ids = config.analysis_loitering_target_zone_ids;
    return options;
}

LoiteringScenario::LoiteringScenario(LoiteringScenarioOptions options)
    : options_(std::move(options)) {
    options_.min_dwell_time_ms = std::max(0, options_.min_dwell_time_ms);
    options_.max_movement_radius = std::max(0.0F, options_.max_movement_radius);
    options_.min_trajectory_points = std::max<std::size_t>(2, options_.min_trajectory_points);
    options_.cooldown_ms = std::max(0, options_.cooldown_ms);
    if (options_.target_class_tokens.empty()) {
        options_.target_class_tokens.push_back("person");
    }
}

std::string LoiteringScenario::ScenarioId() const {
    return kScenarioId;
}

ScenarioUpdate LoiteringScenario::Evaluate(const SceneContext& scene_context,
                                           const TrackSceneContext& track_context,
                                           const ScenarioInstance* previous_instance) {
    (void)scene_context;
    ScenarioUpdate update;
    if (!options_.enabled || track_context.track_id == 0 ||
        (track_context.lifecycle_state != TrackLifecycleState::Active &&
         track_context.lifecycle_state != TrackLifecycleState::Reacquired) ||
        !MatchesTargetClass(track_context)) {
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

    const MovementSummary movement = CalculateMovementRadius(track_context, *zone_state);
    const bool has_dwell = zone_state->dwell_time_ms >= options_.min_dwell_time_ms;
    const bool has_points = movement.point_count >= options_.min_trajectory_points;
    const bool within_radius = movement.radius <= options_.max_movement_radius;

    update.zone_id = zone_state->current_zone;
    update.active = true;
    if (has_dwell && has_points && within_radius) {
        update.phase = ScenarioPhase::Confirmed;
        update.confirmed = true;
        update.event = BuildEvent(track_context, *zone_state, movement);
    } else if (zone_state->dwell_time_ms > 0 || movement.point_count > 1) {
        update.phase = ScenarioPhase::Observing;
    } else {
        update.phase = ScenarioPhase::Candidate;
    }
    return update;
}

EventLifecycleOptions LoiteringScenario::EventOptions(
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

bool LoiteringScenario::MatchesTargetClass(const TrackSceneContext& track_context) const {
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

bool LoiteringScenario::ZoneAllowed(const std::string& zone_id) const {
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

const ZoneState* LoiteringScenario::ActiveTargetZone(
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

LoiteringScenario::MovementSummary LoiteringScenario::CalculateMovementRadius(
    const TrackSceneContext& track_context,
    const ZoneState& zone_state) const {
    MovementSummary summary;
    if (track_context.trajectory.empty()) {
        return summary;
    }

    struct MovementPoint {
        double x{0.0};
        double y{0.0};
    };
    std::vector<MovementPoint> points;
    points.reserve(track_context.trajectory.size());
    std::string units = "image";

    if (options_.use_ground_plane_movement_radius) {
        for (const auto& point : track_context.trajectory) {
            if (zone_state.entered_at_ns > 0 && point.timestamp_ns < zone_state.entered_at_ns) {
                continue;
            }
            if (!IsUsableGroundPoint(point.ground_point)) {
                continue;
            }
            points.push_back(MovementPoint{point.ground_point->x, point.ground_point->y});
            units = point.ground_point->units.empty() ? std::string{"ground"} : point.ground_point->units;
        }
    }

    if (points.empty()) {
        for (const auto& point : track_context.trajectory) {
            if (zone_state.entered_at_ns > 0 && point.timestamp_ns < zone_state.entered_at_ns) {
                continue;
            }
            points.push_back(MovementPoint{point.center.x, point.center.y});
        }
        units = "image";
    } else {
        summary.uses_ground_plane = true;
    }

    double sum_x = 0.0;
    double sum_y = 0.0;
    for (const auto& point : points) {
        sum_x += point.x;
        sum_y += point.y;
    }
    summary.point_count = points.size();
    summary.units = units;
    if (summary.point_count == 0) {
        return summary;
    }

    const double centroid_x = sum_x / static_cast<double>(summary.point_count);
    const double centroid_y = sum_y / static_cast<double>(summary.point_count);
    double radius = 0.0;
    for (const auto& point : points) {
        const double dx = point.x - centroid_x;
        const double dy = point.y - centroid_y;
        radius = std::max(radius, std::sqrt(dx * dx + dy * dy));
    }
    summary.radius = static_cast<float>(radius);
    return summary;
}

AnalysisEvent LoiteringScenario::BuildEvent(const TrackSceneContext& track_context,
                                            const ZoneState& zone_state,
                                            const MovementSummary& movement) const {
    AnalysisEvent event;
    event.rule_id = std::string(kScenarioId) + ":" + zone_state.current_zone;
    event.event_type = kScenarioId;
    event.track_id = track_context.track_id;
    event.class_id = track_context.class_id;
    event.label = track_context.class_name;
    event.score = track_context.confidence;
    event.box = track_context.bbox;
    event.highlight_color = "#f59e0b";
    event.highlight_duration_ms = 1500;
    event.highlight_enabled = true;
    event.post_enabled = false;
    event.zone_id = zone_state.current_zone;
    event.scenario_name = kScenarioId;
    event.metadata_json = std::string{"{\"zoneId\":\""} + JsonEscape(zone_state.current_zone) +
                          "\",\"dwellTimeMs\":" +
                          std::to_string(zone_state.dwell_time_ms) +
                          ",\"movementRadius\":" + std::to_string(movement.radius) +
                          ",\"movementUnits\":\"" + JsonEscape(movement.units) + "\"" +
                          ",\"usesGroundPlane\":" +
                          (movement.uses_ground_plane ? "true" : "false") +
                          ",\"trajectoryPoints\":" + std::to_string(movement.point_count) + "}";
    return event;
}

AnalysisEvent LoiteringScenario::BuildEndEvent(const TrackSceneContext& track_context,
                                               const std::string& zone_id) const {
    AnalysisEvent event;
    event.rule_id = std::string(kScenarioId) + ":" + zone_id;
    event.event_type = kScenarioId;
    event.track_id = track_context.track_id;
    event.class_id = track_context.class_id;
    event.label = track_context.class_name;
    event.score = track_context.confidence;
    event.box = track_context.bbox;
    event.highlight_color = "#f59e0b";
    event.highlight_duration_ms = 1500;
    event.highlight_enabled = true;
    event.post_enabled = false;
    event.zone_id = zone_id;
    event.scenario_name = kScenarioId;
    event.scenario_phase = "ended";
    return event;
}

}  // namespace analysis

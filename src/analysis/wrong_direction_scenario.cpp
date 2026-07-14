// 파일 요약: WrongDirectionScenario의 line crossing 방향 위반 판단을 구현한다.
// 동작 요약: raw crossing 방향이 line별 허용 방향과 다를 때 wrong-direction 이벤트를 EventManager로 전달한다.
// 동작 요약: allowedDirection이 any/empty인 line은 방향 위반 대상으로 보지 않는다.
#include "analysis/wrong_direction_scenario.h"

#include "analysis/category_tokens.h"

#include <algorithm>
#include <cctype>
#include <sstream>
#include <utility>

namespace analysis {

namespace {

constexpr const char* kScenarioId = "wrong-direction";

std::string Trim(std::string value) {
    while (!value.empty() && std::isspace(static_cast<unsigned char>(value.front())) != 0) {
        value.erase(value.begin());
    }
    while (!value.empty() && std::isspace(static_cast<unsigned char>(value.back())) != 0) {
        value.pop_back();
    }
    return value;
}

std::string ToLower(std::string value) {
    std::transform(value.begin(), value.end(), value.begin(), [](unsigned char ch) {
        return static_cast<char>(std::tolower(ch));
    });
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

WrongDirectionScenarioOptions BuildWrongDirectionScenarioOptionsFromConfig(const core::AnalysisRuntimeConfig& config) {
    WrongDirectionScenarioOptions options;
    options.enabled = config.analysis_wrong_direction_enabled;
    options.cooldown_ms = config.analysis_wrong_direction_cooldown_ms;
    options.target_class_tokens = config.analysis_wrong_direction_target_classes;
    options.target_line_ids = config.analysis_wrong_direction_target_line_ids;
    options.allowed_direction_rules = config.analysis_wrong_direction_allowed_directions;
    return options;
}

WrongDirectionScenario::WrongDirectionScenario(WrongDirectionScenarioOptions options)
    : options_(std::move(options)) {
    options_.cooldown_ms = std::max(0, options_.cooldown_ms);
    if (options_.target_class_tokens.empty()) {
        options_.target_class_tokens.push_back("person");
    }
    ParseAllowedDirectionRules();
}

std::string WrongDirectionScenario::ScenarioId() const {
    return kScenarioId;
}

std::string WrongDirectionScenario::ScenarioKey() const {
    return options_.scenario_key.empty() ? ScenarioId() : options_.scenario_key;
}

ScenarioUpdate WrongDirectionScenario::Evaluate(const SceneContext& scene_context,
                                                const TrackSceneContext& track_context,
                                                const ScenarioInstance* previous_instance) {
    (void)scene_context;
    ScenarioUpdate update;
    if (!options_.enabled || track_context.track_id == 0 ||
        (track_context.lifecycle_state != TrackLifecycleState::Active &&
         track_context.lifecycle_state != TrackLifecycleState::Reacquired) ||
        (options_.require_stable_track && track_context.track_health.is_unstable) ||
        !MatchesTargetClass(track_context)) {
        if (previous_instance != nullptr && IsActiveScenarioPhase(previous_instance->phase)) {
            update.phase = ScenarioPhase::Ended;
            update.zone_id = previous_instance->zone_id;
            update.active = false;
            update.event = BuildEndEvent(track_context, previous_instance->zone_id);
        }
        return update;
    }

    const LineCrossState* line_state = FindWrongDirectionLine(track_context);
    if (line_state == nullptr) {
        if (previous_instance != nullptr && IsActiveScenarioPhase(previous_instance->phase)) {
            update.phase = ScenarioPhase::Ended;
            update.zone_id = previous_instance->zone_id;
            update.active = false;
            update.event = BuildEndEvent(track_context, previous_instance->zone_id);
        }
        return update;
    }

    update.phase = ScenarioPhase::Confirmed;
    update.zone_id = line_state->line_id;
    update.active = true;
    update.confirmed = true;
    update.event = BuildEvent(track_context, *line_state, AllowedDirectionForLine(*line_state));
    return update;
}

EventLifecycleOptions WrongDirectionScenario::EventOptions(
    const ScenarioInstance& instance,
    const ScenarioEngineOptions& engine_options) const {
    (void)instance;
    EventLifecycleOptions options;
    options.cooldown_ms = options_.cooldown_ms > 0 ? options_.cooldown_ms : engine_options.default_cooldown_ms;
    options.update_interval_ms = engine_options.default_update_interval_ms;
    options.ended_retention_ms = engine_options.ended_retention_ms;
    options.cleanup_interval_ms = engine_options.cleanup_interval_ms;
    options.emit_start = false;
    options.emit_update = false;
    options.emit_confirmed = true;
    options.emit_end = false;
    return options;
}

bool WrongDirectionScenario::MatchesTargetClass(const TrackSceneContext& track_context) const {
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

bool WrongDirectionScenario::LineAllowed(const std::string& line_id) const {
    if (options_.target_line_ids.empty()) {
        return true;
    }
    return std::any_of(options_.target_line_ids.begin(),
                       options_.target_line_ids.end(),
                       [&](const std::string& allowed) {
                           return IsWildcardToken(allowed) || Trim(allowed) == line_id;
                       });
}

std::string WrongDirectionScenario::AllowedDirectionForLine(const LineCrossState& line_state) const {
    const auto it = allowed_direction_by_line_.find(line_state.line_id);
    if (it != allowed_direction_by_line_.end()) {
        return it->second;
    }
    return ToLower(Trim(line_state.allowed_direction));
}

bool WrongDirectionScenario::DirectionAllowed(const std::string& allowed,
                                              const std::string& actual) const {
    const std::string normalized = ToLower(Trim(allowed));
    return normalized.empty() || normalized == "any" || normalized == actual;
}

const LineCrossState* WrongDirectionScenario::FindWrongDirectionLine(
    const TrackSceneContext& track_context) const {
    for (const auto& line_state : track_context.line_states) {
        if (!LineAllowed(line_state.line_id) || !line_state.raw_crossed ||
            line_state.raw_direction.empty() || line_state.raw_direction == "none") {
            continue;
        }
        const std::string allowed = AllowedDirectionForLine(line_state);
        if (allowed.empty() || allowed == "any") {
            continue;
        }
        if (!DirectionAllowed(allowed, line_state.raw_direction)) {
            return &line_state;
        }
    }
    return nullptr;
}

AnalysisEvent WrongDirectionScenario::BuildEvent(const TrackSceneContext& track_context,
                                                 const LineCrossState& line_state,
                                                 const std::string& allowed_direction) const {
    AnalysisEvent event;
    event.rule_id = std::string(kScenarioId) + ":" + line_state.line_id;
    event.event_type = kScenarioId;
    event.track_id = track_context.track_id;
    event.class_id = track_context.class_id;
    event.label = track_context.class_name;
    event.score = track_context.confidence;
    event.box = track_context.bbox;
    event.highlight_color = "#ff7a00";
    event.highlight_duration_ms = 1500;
    event.highlight_enabled = true;
    event.post_enabled = false;
    event.line_id = line_state.line_id;
    event.scenario_name = kScenarioId;
    event.metadata_json = std::string{"{\"lineId\":\""} + JsonEscape(line_state.line_id) +
                          "\",\"allowedDirection\":\"" + JsonEscape(allowed_direction) +
                          "\",\"direction\":\"" + JsonEscape(line_state.raw_direction) + "\"}";
    return event;
}

AnalysisEvent WrongDirectionScenario::BuildEndEvent(const TrackSceneContext& track_context,
                                                    const std::string& line_id) const {
    AnalysisEvent event;
    event.rule_id = std::string(kScenarioId) + ":" + line_id;
    event.event_type = kScenarioId;
    event.track_id = track_context.track_id;
    event.class_id = track_context.class_id;
    event.label = track_context.class_name;
    event.score = track_context.confidence;
    event.box = track_context.bbox;
    event.highlight_enabled = true;
    event.highlight_color = "#ff7a00";
    event.highlight_duration_ms = 1500;
    event.post_enabled = false;
    event.line_id = line_id;
    event.scenario_name = kScenarioId;
    event.scenario_phase = "ended";
    return event;
}

void WrongDirectionScenario::ParseAllowedDirectionRules() {
    allowed_direction_by_line_.clear();
    for (const auto& raw_rule : options_.allowed_direction_rules) {
        const std::string rule = Trim(raw_rule);
        if (rule.empty()) {
            continue;
        }
        const std::size_t colon = rule.find(':');
        const std::size_t equals = rule.find('=');
        const std::size_t split = colon == std::string::npos ? equals
                                                             : (equals == std::string::npos ? colon
                                                                                            : std::min(colon, equals));
        if (split == std::string::npos) {
            continue;
        }
        const std::string line_id = Trim(rule.substr(0, split));
        const std::string direction = ToLower(Trim(rule.substr(split + 1)));
        if (!line_id.empty() && !direction.empty()) {
            allowed_direction_by_line_[line_id] = direction;
        }
    }
}

}  // namespace analysis

// 파일 요약: 저장된 rule JSON을 detection 결과에 적용해 이벤트를 생성한다.
// 동작 요약: presence/enter/exit/line-crossing을 trackId 또는 detection key 기준 상태로 판정한다.
// 동작 요약: triggered detection에 이벤트 label, highlight, POST payload용 event metadata를 붙인다.
#include "analysis/event_rule_engine.h"

#include "analysis/category_tokens.h"
#include "analysis/event_manager.h"
#include "analysis/intrusion_dwell_scenario.h"
#include "analysis/scene_context_builder.h"
#include "analysis/scenario_engine.h"
#include "analysis/tracked_object_metadata.h"

#include "app_config.h"

#include <algorithm>
#include <cctype>
#include <cmath>
#include <cstdlib>
#include <mutex>
#include <sstream>
#include <unordered_map>
#include <utility>

namespace analysis {

struct EventRuleRuntime {
    EventRuleRuntime();

    std::mutex mu;
    TrackStateManager track_state_manager;
    SceneContextBuilder rule_scene_context_builder;
    SceneContextBuilder scenario_scene_context_builder;
    ScenarioEngine scenario_engine;
    EventManager event_manager;
    std::unordered_map<std::string, bool> previous_inside;
    std::unordered_map<std::string, float> previous_side;
    std::unordered_map<std::string, std::int64_t> inside_since_pts;
    std::unordered_map<std::string, std::int64_t> highlight_until_pts;
};

namespace {

struct RulePoint {
    float x{0.0F};
    float y{0.0F};
};

struct EventRule {
    std::string id;
    bool enabled{true};
    std::string match_source_kind{"*"};
    std::string match_route{"*"};
    std::string match_client_id;
    std::string match_va_rule_id;
    std::vector<std::string> classes;
    bool classes_specified{false};
    std::string event_type{"presence"};
    float min_confidence{0.0F};
    int min_duration_ms{0};
    std::string region_type{"polygon"};
    std::string direction{"any"};
    std::vector<RulePoint> points;
    bool highlight_enabled{true};
    std::string highlight_color{"#ff0000"};
    int highlight_duration_ms{1200};
    bool post_enabled{false};
    std::string post_url;
};

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

std::optional<std::string> ExtractDelimitedField(const std::string& body,
                                                 const std::string& field,
                                                 char open_ch,
                                                 char close_ch) {
    const std::string needle = "\"" + field + "\"";
    std::size_t pos = body.find(needle);
    if (pos == std::string::npos) {
        return std::nullopt;
    }
    pos = body.find(':', pos + needle.size());
    if (pos == std::string::npos) {
        return std::nullopt;
    }
    pos = body.find(open_ch, pos);
    if (pos == std::string::npos) {
        return std::nullopt;
    }

    bool in_string = false;
    bool escaped = false;
    int depth = 0;
    const std::size_t start = pos;
    for (; pos < body.size(); ++pos) {
        const char ch = body[pos];
        if (escaped) {
            escaped = false;
            continue;
        }
        if (ch == '\\' && in_string) {
            escaped = true;
            continue;
        }
        if (ch == '"') {
            in_string = !in_string;
            continue;
        }
        if (in_string) {
            continue;
        }
        if (ch == open_ch) {
            ++depth;
        } else if (ch == close_ch) {
            --depth;
            if (depth == 0) {
                return body.substr(start, pos - start + 1);
            }
        }
    }
    return std::nullopt;
}

std::optional<std::string> ExtractObjectField(const std::string& body, const std::string& field) {
    return ExtractDelimitedField(body, field, '{', '}');
}

std::optional<std::string> ExtractArrayField(const std::string& body, const std::string& field) {
    return ExtractDelimitedField(body, field, '[', ']');
}

std::optional<std::string> ParseStringField(const std::string& body, const std::string& field) {
    const std::string needle = "\"" + field + "\"";
    std::size_t pos = body.find(needle);
    if (pos == std::string::npos) {
        return std::nullopt;
    }
    pos = body.find(':', pos + needle.size());
    if (pos == std::string::npos) {
        return std::nullopt;
    }
    pos = body.find('"', pos);
    if (pos == std::string::npos) {
        return std::nullopt;
    }
    ++pos;

    std::string out;
    bool escaped = false;
    for (; pos < body.size(); ++pos) {
        const char ch = body[pos];
        if (escaped) {
            switch (ch) {
                case 'n':
                    out.push_back('\n');
                    break;
                case 'r':
                    out.push_back('\r');
                    break;
                case 't':
                    out.push_back('\t');
                    break;
                default:
                    out.push_back(ch);
                    break;
            }
            escaped = false;
            continue;
        }
        if (ch == '\\') {
            escaped = true;
            continue;
        }
        if (ch == '"') {
            return out;
        }
        out.push_back(ch);
    }
    return std::nullopt;
}

std::optional<bool> ParseBoolField(const std::string& body, const std::string& field) {
    const std::string needle = "\"" + field + "\"";
    std::size_t pos = body.find(needle);
    if (pos == std::string::npos) {
        return std::nullopt;
    }
    pos = body.find(':', pos + needle.size());
    if (pos == std::string::npos) {
        return std::nullopt;
    }
    ++pos;
    while (pos < body.size() && std::isspace(static_cast<unsigned char>(body[pos])) != 0) {
        ++pos;
    }
    if (body.compare(pos, 4, "true") == 0) {
        return true;
    }
    if (body.compare(pos, 5, "false") == 0) {
        return false;
    }
    return std::nullopt;
}

std::optional<double> ParseNumberField(const std::string& body, const std::string& field) {
    const std::string needle = "\"" + field + "\"";
    std::size_t pos = body.find(needle);
    if (pos == std::string::npos) {
        return std::nullopt;
    }
    pos = body.find(':', pos + needle.size());
    if (pos == std::string::npos) {
        return std::nullopt;
    }
    ++pos;
    while (pos < body.size() && std::isspace(static_cast<unsigned char>(body[pos])) != 0) {
        ++pos;
    }
    const char* start = body.c_str() + pos;
    char* end = nullptr;
    const double parsed = std::strtod(start, &end);
    if (end == start) {
        return std::nullopt;
    }
    return parsed;
}

std::vector<std::string> ParseStringArrayField(const std::string& body, const std::string& field) {
    std::vector<std::string> values;
    const auto array = ExtractArrayField(body, field);
    if (!array.has_value()) {
        return values;
    }

    bool in_string = false;
    bool escaped = false;
    std::string current;
    for (std::size_t i = 1; i + 1 < array->size(); ++i) {
        const char ch = (*array)[i];
        if (!in_string) {
            if (ch == '"') {
                in_string = true;
                current.clear();
            }
            continue;
        }
        if (escaped) {
            current.push_back(ch);
            escaped = false;
            continue;
        }
        if (ch == '\\') {
            escaped = true;
            continue;
        }
        if (ch == '"') {
            values.push_back(current);
            in_string = false;
            continue;
        }
        current.push_back(ch);
    }
    return values;
}

std::vector<std::string> ExtractObjectArray(const std::string& body, const std::string& field) {
    std::vector<std::string> objects;
    const auto array = ExtractArrayField(body, field);
    if (!array.has_value()) {
        return objects;
    }

    bool in_string = false;
    bool escaped = false;
    int object_depth = 0;
    std::size_t object_start = std::string::npos;
    for (std::size_t pos = 1; pos + 1 < array->size(); ++pos) {
        const char ch = (*array)[pos];
        if (escaped) {
            escaped = false;
            continue;
        }
        if (ch == '\\' && in_string) {
            escaped = true;
            continue;
        }
        if (ch == '"') {
            in_string = !in_string;
            continue;
        }
        if (in_string) {
            continue;
        }
        if (ch == '{') {
            if (object_depth == 0) {
                object_start = pos;
            }
            ++object_depth;
        } else if (ch == '}') {
            --object_depth;
            if (object_depth == 0 && object_start != std::string::npos) {
                objects.push_back(array->substr(object_start, pos - object_start + 1));
                object_start = std::string::npos;
            }
        }
    }
    return objects;
}

std::optional<EventRule> ParseRule(const std::string& document) {
    EventRule rule;
    rule.id = ParseStringField(document, "id").value_or("");
    if (rule.id.empty()) {
        return std::nullopt;
    }
    rule.enabled = ParseBoolField(document, "enabled").value_or(true);

    if (const auto match = ExtractObjectField(document, "match"); match.has_value()) {
        rule.match_source_kind = ToLower(ParseStringField(*match, "sourceKind").value_or(rule.match_source_kind));
        rule.match_route = ToLower(ParseStringField(*match, "route").value_or(rule.match_route));
        rule.match_client_id = ParseStringField(*match, "clientId").value_or("");
        rule.match_va_rule_id = ParseStringField(*match, "vaRule").value_or(
            ParseStringField(*match, "vaRuleId").value_or(""));
    }

    if (const auto analysis = ExtractObjectField(document, "analysis"); analysis.has_value()) {
        rule.classes_specified = ExtractArrayField(*analysis, "classes").has_value();
        rule.classes = ParseStringArrayField(*analysis, "classes");
    }

    const auto event = ExtractObjectField(document, "event");
    if (event.has_value()) {
        rule.event_type = ToLower(ParseStringField(*event, "type").value_or(rule.event_type));
        rule.min_confidence =
            static_cast<float>(ParseNumberField(*event, "minConfidence").value_or(rule.min_confidence));
        rule.min_duration_ms =
            static_cast<int>(ParseNumberField(*event, "minDurationMs").value_or(rule.min_duration_ms));
        if (const auto region = ExtractObjectField(*event, "region"); region.has_value()) {
            rule.region_type = ToLower(ParseStringField(*region, "type").value_or(rule.region_type));
            rule.direction = ToLower(ParseStringField(*region, "direction").value_or(rule.direction));
            for (const auto& point_body : ExtractObjectArray(*region, "points")) {
                const auto x = ParseNumberField(point_body, "x");
                const auto y = ParseNumberField(point_body, "y");
                if (x.has_value() && y.has_value()) {
                    rule.points.push_back(RulePoint{static_cast<float>(*x), static_cast<float>(*y)});
                }
            }
        }
    }

    if (const auto actions = ExtractObjectField(document, "eventActions"); actions.has_value()) {
        if (const auto highlight = ExtractObjectField(*actions, "highlight"); highlight.has_value()) {
            rule.highlight_enabled = ParseBoolField(*highlight, "enabled").value_or(rule.highlight_enabled);
            rule.highlight_duration_ms =
                static_cast<int>(ParseNumberField(*highlight, "durationMs").value_or(rule.highlight_duration_ms));
            // 이벤트 강조는 카테고리 기본색과 빨간색을 blink로 번갈아 표시하도록 색상을 고정한다.
            rule.highlight_color = "#ff0000";
        }
        if (const auto post = ExtractObjectField(*actions, "post"); post.has_value()) {
            rule.post_enabled = ParseBoolField(*post, "enabled").value_or(rule.post_enabled);
            rule.post_url = ParseStringField(*post, "url").value_or("");
            if (rule.post_url.empty()) {
                rule.post_enabled = false;
            }
        }
    }

    return rule;
}

bool MatchesClass(const EventRule& rule, const Detection& detection) {
    if (rule.classes.empty()) {
        return !rule.classes_specified;
    }
    const std::string label = NormalizeClassToken(detection.label);
    const std::string class_id = std::to_string(detection.class_id);
    for (const auto& raw_class : rule.classes) {
        const std::string wanted = NormalizeClassToken(raw_class);
        if (wanted.empty()) {
            continue;
        }
        if (IsAllClassesToken(wanted) || wanted == label || wanted == class_id || MatchesCategoryToken(wanted, label)) {
            return true;
        }
    }
    return false;
}

bool MatchesToken(const std::string& wanted, const std::string& actual) {
    const std::string normalized_wanted = ToLower(Trim(wanted));
    if (normalized_wanted.empty() || normalized_wanted == "*") {
        return true;
    }
    return normalized_wanted == ToLower(Trim(actual));
}

bool MatchesRuleContext(const EventRule& rule, const AnalysisContext& context) {
    if (!context.va_rule_id.empty()) {
        return rule.match_va_rule_id == context.va_rule_id;
    }
    if (!rule.match_va_rule_id.empty()) {
        return false;
    }
    if (!MatchesToken(rule.match_source_kind, context.source_kind)) {
        return false;
    }
    if (!MatchesToken(rule.match_route, context.route)) {
        return false;
    }
    if (!rule.match_client_id.empty() && rule.match_client_id != "*" && rule.match_client_id != context.client_id) {
        return false;
    }
    return true;
}

RulePoint DetectionCenter(const Detection& detection) {
    return RulePoint{
        std::max(0.0F, std::min(1.0F, detection.box.x + detection.box.width * 0.5F)),
        std::max(0.0F, std::min(1.0F, detection.box.y + detection.box.height * 0.5F)),
    };
}

bool PointInPolygon(const RulePoint& point, const std::vector<RulePoint>& polygon) {
    if (polygon.size() < 3) {
        return false;
    }

    bool inside = false;
    for (std::size_t i = 0, j = polygon.size() - 1; i < polygon.size(); j = i++) {
        const auto& pi = polygon[i];
        const auto& pj = polygon[j];
        const bool intersects = ((pi.y > point.y) != (pj.y > point.y)) &&
                                (point.x < (pj.x - pi.x) * (point.y - pi.y) /
                                                   ((pj.y - pi.y) == 0.0F ? 0.000001F : (pj.y - pi.y)) +
                                               pi.x);
        if (intersects) {
            inside = !inside;
        }
    }
    return inside;
}

float SignedLineSide(const RulePoint& point, const std::vector<RulePoint>& line) {
    if (line.size() < 2) {
        return 0.0F;
    }
    const RulePoint& a = line[0];
    const RulePoint& b = line[1];
    return (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x);
}

bool IsAllowedLineCrossingDirection(const std::string& direction, float previous_side, float side) {
    // 선분 시작점->끝점 기준 signed side 변화로 정방향/역방향 통과를 구분한다.
    const bool forward = previous_side < 0.0F && side > 0.0F;
    const bool reverse = previous_side > 0.0F && side < 0.0F;
    if (direction == "forward") {
        return forward;
    }
    if (direction == "reverse") {
        return reverse;
    }
    return forward || reverse;
}

std::string ResolveRuntimeChannelId(const std::string& source_key) {
    return source_key.empty() ? std::string{"default"} : source_key;
}

std::vector<SceneGeometryPoint> ToSceneGeometryPoints(const std::vector<RulePoint>& points) {
    std::vector<SceneGeometryPoint> out;
    out.reserve(points.size());
    for (const auto& point : points) {
        out.push_back(SceneGeometryPoint{point.x, point.y});
    }
    return out;
}

SceneGeometryConfig BuildSceneGeometryConfig(const EventRule& rule) {
    SceneGeometryConfig config;
    if (rule.region_type == "polygon") {
        SceneZoneDefinition zone;
        zone.zone_id = rule.id;
        zone.restricted = true;
        zone.polygon = ToSceneGeometryPoints(rule.points);
        config.zones.push_back(std::move(zone));
    } else if (rule.region_type == "line") {
        SceneLineDefinition line;
        line.line_id = rule.id;
        line.allowed_direction = rule.direction;
        line.points = ToSceneGeometryPoints(rule.points);
        config.lines.push_back(std::move(line));
    }
    return config;
}

const TrackRuntimeState* FindTrackState(const std::vector<TrackRuntimeState>& track_states, std::uint64_t track_id) {
    const auto it = std::find_if(track_states.begin(), track_states.end(), [track_id](const TrackRuntimeState& state) {
        return state.track_id == track_id;
    });
    return it == track_states.end() ? nullptr : &(*it);
}

const TrackSceneContext* FindTrackSceneContext(const SceneContext& scene_context, std::uint64_t track_id) {
    const auto it =
        std::find_if(scene_context.tracks.begin(), scene_context.tracks.end(), [track_id](const TrackSceneContext& track) {
            return track.track_id == track_id;
        });
    return it == scene_context.tracks.end() ? nullptr : &(*it);
}

const ZoneState* FindZoneState(const TrackSceneContext& track_context, const std::string& zone_id) {
    const auto it =
        std::find_if(track_context.zone_states.begin(), track_context.zone_states.end(), [&](const ZoneState& state) {
            return state.current_zone == zone_id || state.previous_zone == zone_id;
        });
    return it == track_context.zone_states.end() ? nullptr : &(*it);
}

const LineCrossState* FindLineCrossState(const TrackSceneContext& track_context, const std::string& line_id) {
    const auto it =
        std::find_if(track_context.line_states.begin(), track_context.line_states.end(), [&](const LineCrossState& state) {
            return state.line_id == line_id;
        });
    return it == track_context.line_states.end() ? nullptr : &(*it);
}

bool DurationSatisfied(const ZoneState& zone_state, const EventRule& rule) {
    if (rule.min_duration_ms <= 0) {
        return zone_state.current_zone == rule.id;
    }
    return zone_state.current_zone == rule.id && zone_state.dwell_time_ms >= rule.min_duration_ms;
}

bool EvaluateSceneContextRule(const EventRule& rule, const TrackSceneContext& track_context) {
    if (rule.region_type == "polygon") {
        const ZoneState* zone_state = FindZoneState(track_context, rule.id);
        if (zone_state == nullptr) {
            return false;
        }
        if (rule.event_type == "presence") {
            return DurationSatisfied(*zone_state, rule);
        }
        if (rule.event_type == "enter") {
            return zone_state->had_previous_observation && zone_state->changed && zone_state->previous_zone.empty() &&
                   zone_state->current_zone == rule.id;
        }
        if (rule.event_type == "exit") {
            return zone_state->had_previous_observation && zone_state->changed && zone_state->previous_zone == rule.id &&
                   zone_state->current_zone.empty();
        }
        return false;
    }
    if (rule.region_type == "line") {
        const LineCrossState* line_state = FindLineCrossState(track_context, rule.id);
        return rule.event_type == "line-crossing" && line_state != nullptr && line_state->crossed;
    }
    return false;
}

std::string StateKey(const EventRule& rule, const Detection& detection, std::size_t detection_index) {
    std::ostringstream out;
    if (detection.track_id > 0) {
        out << rule.id << ":track:" << detection.track_id;
        return out.str();
    }
    // tracker가 꺼진 profile은 기존 호환성을 위해 detection index 기준으로 상태를 분리한다.
    out << rule.id << ":detection:" << detection_index << ":" << detection.class_id << ":" << detection.label;
    return out.str();
}

bool DurationSatisfied(EventRuleRuntime* runtime,
                       const std::string& key,
                       const EventRule& rule,
                       bool condition,
                       std::int64_t pts) {
    // presence류 이벤트는 minDurationMs가 있을 때 같은 객체가 영역 안에 머문 시간을 누적한다.
    if (rule.min_duration_ms <= 0) {
        return condition;
    }
    if (!condition) {
        runtime->inside_since_pts.erase(key);
        return false;
    }
    auto it = runtime->inside_since_pts.find(key);
    if (it == runtime->inside_since_pts.end()) {
        runtime->inside_since_pts[key] = pts;
        return false;
    }
    if (pts <= 0 || it->second <= 0) {
        return condition;
    }
    return pts - it->second >= static_cast<std::int64_t>(rule.min_duration_ms) * 1000000LL;
}

void MarkDetectionEvent(Detection* detection, const EventRule& rule) {
    if (detection == nullptr || detection->event_triggered) {
        return;
    }
    detection->event_triggered = true;
    detection->event_rule_id = rule.id;
    detection->event_type = rule.event_type;
    detection->event_highlight_color = rule.highlight_color;
    detection->event_highlight_duration_ms = std::max(100, rule.highlight_duration_ms);
}

void MarkDetectionEvent(Detection* detection, const AnalysisEvent& event) {
    if (detection == nullptr || detection->event_triggered) {
        return;
    }
    detection->event_triggered = true;
    detection->event_rule_id = event.rule_id;
    detection->event_type = event.event_type;
    detection->event_highlight_color = event.highlight_color;
    detection->event_highlight_duration_ms = std::max(100, event.highlight_duration_ms);
}

AnalysisEvent BuildAnalysisEvent(const EventRule& rule, const Detection& detection) {
    AnalysisEvent event;
    event.rule_id = rule.id;
    event.event_type = rule.event_type;
    event.track_id = detection.track_id;
    event.class_id = detection.class_id;
    event.label = detection.label;
    event.score = detection.score;
    event.box = detection.box;
    event.highlight_color = rule.highlight_color;
    event.highlight_duration_ms = std::max(100, rule.highlight_duration_ms);
    event.highlight_enabled = rule.highlight_enabled;
    event.post_enabled = rule.post_enabled;
    event.post_url = rule.post_url;
    return event;
}

EventLifecycleOptions RuleEventLifecycleOptions(const EventRule& rule) {
    EventLifecycleOptions options;
    // 기존 rule event는 API/overlay/POST 호환을 위해 매 evaluation emit을 유지한다.
    // ScenarioEngine은 같은 EventManager에 cooldown/update interval을 지정해 중복을 억제한다.
    options.cooldown_ms = 0;
    options.update_interval_ms = 0;
    options.cleanup_interval_ms = app::GetAppConfig().analysis_cleanup_interval_ms;
    options.emit_start = true;
    options.emit_update = true;
    options.emit_confirmed = true;
    options.emit_end = false;
    (void)rule;
    return options;
}

bool EmitManagedEvent(EventRuleRuntime* runtime,
                      const AnalysisResult& result,
                      const std::string& channel_id,
                      const EventRule& rule,
                      const Detection& detection,
                      const std::string& object_key,
                      std::vector<AnalysisEvent>* events) {
    if (runtime == nullptr || events == nullptr) {
        return false;
    }
    EventCandidate candidate;
    candidate.key.stream_id = result.source_key;
    candidate.key.channel_id = channel_id;
    candidate.key.scenario_id = rule.id;
    candidate.key.zone_id = rule.id;
    candidate.key.track_id = detection.track_id;
    candidate.key.object_key = object_key;
    candidate.event = BuildAnalysisEvent(rule, detection);
    candidate.timestamp_ns = result.pts;
    candidate.active = true;
    candidate.confirmed = rule.event_type == "presence";

    const auto decision = runtime->event_manager.Update(candidate, RuleEventLifecycleOptions(rule));
    if (decision.emit) {
        events->push_back(decision.event);
    }
    return decision.emit;
}

}  // namespace

EventRuleRuntime::EventRuleRuntime()
    : track_state_manager(BuildTrackStateManagerOptionsFromConfig(app::GetAppConfig()),
                          std::make_shared<NoOpAppearanceExtractor>()),
      rule_scene_context_builder(BuildSceneContextBuilderOptionsFromConfig(app::GetAppConfig())),
      scenario_scene_context_builder(BuildSceneContextBuilderOptionsFromConfig(app::GetAppConfig())),
      scenario_engine(BuildScenarioEngineOptionsFromConfig(app::GetAppConfig())) {
    const auto& config = app::GetAppConfig();
    if (config.analysis_intrusion_dwell_enabled) {
        scenario_engine.RegisterScenario(
            std::make_unique<IntrusionDwellScenario>(
                BuildIntrusionDwellScenarioOptionsFromConfig(config)));
    }
}

std::shared_ptr<EventRuleRuntime> CreateEventRuleRuntime() {
    return std::make_shared<EventRuleRuntime>();
}

EventRuleEvaluation ApplyEventRulesToResult(const AnalysisResult& result,
                                            const std::vector<std::string>& rule_documents,
                                            const std::shared_ptr<EventRuleRuntime>& runtime) {
    EventRuleEvaluation evaluation;
    evaluation.annotated_result = result;
    if (rule_documents.empty()) {
        return evaluation;
    }

    std::vector<EventRule> rules;
    rules.reserve(rule_documents.size());
    for (const auto& document : rule_documents) {
        const auto rule = ParseRule(document);
        if (!rule.has_value() || !rule->enabled) {
            continue;
        }
        const bool valid_polygon = rule->region_type == "polygon" && rule->points.size() >= 3;
        const bool valid_line = rule->region_type == "line" && rule->points.size() >= 2;
        if (!valid_polygon && !valid_line) {
            continue;
        }
        if (!MatchesRuleContext(*rule, result.context)) {
            continue;
        }
        // 여기까지 통과한 rule만 현재 frame/result의 실제 평가 대상이다.
        rules.push_back(*rule);
    }
    evaluation.active_rule_count = rules.size();
    if (rules.empty()) {
        return evaluation;
    }

    const auto safe_runtime = runtime != nullptr ? runtime : CreateEventRuleRuntime();
    std::lock_guard lock(safe_runtime->mu);
    const std::string channel_id = ResolveRuntimeChannelId(result.source_key);
    safe_runtime->track_state_manager.Update(result.source_key, channel_id, BuildTrackedObjects(result), result.pts);
    const auto track_states = safe_runtime->track_state_manager.Snapshot(channel_id);

    for (std::size_t detection_index = 0; detection_index < result.detections.size(); ++detection_index) {
        const auto& original_detection = result.detections[detection_index];
        for (const auto& rule : rules) {
            if (original_detection.score < rule.min_confidence || !MatchesClass(rule, original_detection)) {
                continue;
            }

            const std::string key = StateKey(rule, original_detection, detection_index);
            bool triggered = false;
            bool evaluated_with_scene_context = false;

            if (original_detection.track_id > 0) {
                const TrackRuntimeState* track_state = FindTrackState(track_states, original_detection.track_id);
                if (track_state != nullptr) {
                    const SceneGeometryConfig geometry_config = BuildSceneGeometryConfig(rule);
                    const std::vector<TrackRuntimeState> single_track_state{*track_state};
                    const SceneContext scene_context = safe_runtime->rule_scene_context_builder.Build(
                        result.source_key, channel_id, single_track_state, geometry_config, result.pts);
                    const TrackSceneContext* track_context =
                        FindTrackSceneContext(scene_context, original_detection.track_id);
                    if (track_context != nullptr) {
                        triggered = EvaluateSceneContextRule(rule, *track_context);
                        evaluated_with_scene_context = true;
                    }
                }
            }

            if (!evaluated_with_scene_context && rule.region_type == "polygon") {
                const RulePoint center = DetectionCenter(original_detection);
                const bool inside = PointInPolygon(center, rule.points);
                const auto prev_it = safe_runtime->previous_inside.find(key);
                const bool had_previous = prev_it != safe_runtime->previous_inside.end();
                const bool previous_inside = had_previous ? prev_it->second : inside;

                if (rule.event_type == "presence") {
                    triggered = DurationSatisfied(safe_runtime.get(), key, rule, inside, result.pts);
                } else if (rule.event_type == "enter") {
                    triggered = had_previous && !previous_inside && inside;
                } else if (rule.event_type == "exit") {
                    triggered = had_previous && previous_inside && !inside;
                }
                safe_runtime->previous_inside[key] = inside;
                if (!inside) {
                    safe_runtime->inside_since_pts.erase(key);
                }
            } else if (!evaluated_with_scene_context && rule.region_type == "line") {
                const RulePoint center = DetectionCenter(original_detection);
                const float side = SignedLineSide(center, rule.points);
                const auto prev_it = safe_runtime->previous_side.find(key);
                const bool had_previous = prev_it != safe_runtime->previous_side.end();
                const float previous_side = had_previous ? prev_it->second : side;
                constexpr float kLineEpsilon = 0.0005F;
                if (rule.event_type == "line-crossing") {
                    // 선분 양쪽 부호가 바뀐 경우만 crossing으로 보고, direction이 맞지 않는 통과는 제외한다.
                    triggered = had_previous && std::fabs(previous_side) > kLineEpsilon &&
                                std::fabs(side) > kLineEpsilon && previous_side * side < 0.0F &&
                                IsAllowedLineCrossingDirection(rule.direction, previous_side, side);
                }
                if (std::fabs(side) > kLineEpsilon) {
                    safe_runtime->previous_side[key] = side;
                }
            }

            if (triggered) {
                safe_runtime->highlight_until_pts[key] =
                    result.pts + static_cast<std::int64_t>(std::max(100, rule.highlight_duration_ms)) * 1000000LL;
                EmitManagedEvent(
                    safe_runtime.get(), result, channel_id, rule, original_detection, key, &evaluation.events);
            }

            const auto highlight_until = safe_runtime->highlight_until_pts.find(key);
            const bool highlight_active = triggered ||
                                          (highlight_until != safe_runtime->highlight_until_pts.end() &&
                                           (result.pts <= 0 || highlight_until->second >= result.pts));
            if (highlight_active && rule.highlight_enabled) {
                MarkDetectionEvent(&evaluation.annotated_result.detections[detection_index], rule);
                ++evaluation.matched_detection_count;
            }
        }
    }

    const SceneGeometryConfig scenario_geometry =
        BuildSceneGeometryConfigFromRuleDocuments(rule_documents, result.context);
    if (!scenario_geometry.zones.empty() && !track_states.empty()) {
        const SceneContext scenario_context = safe_runtime->scenario_scene_context_builder.Build(
            result.source_key, channel_id, track_states, scenario_geometry, result.pts);
        auto scenario_events =
            safe_runtime->scenario_engine.Evaluate(scenario_context, &safe_runtime->event_manager);
        for (const auto& event : scenario_events) {
            for (auto& detection : evaluation.annotated_result.detections) {
                if (event.track_id > 0 && detection.track_id == event.track_id) {
                    MarkDetectionEvent(&detection, event);
                    ++evaluation.matched_detection_count;
                    break;
                }
            }
            evaluation.events.push_back(event);
        }
    }

    return evaluation;
}

}  // namespace analysis

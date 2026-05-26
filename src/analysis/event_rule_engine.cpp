// 파일 요약: 저장된 rule JSON을 detection 결과에 적용해 이벤트를 생성한다.
// 동작 요약: presence/enter/exit/line-crossing을 trackId 또는 detection key 기준 상태로 판정한다.
// 동작 요약: triggered detection에 이벤트 label, highlight, POST payload용 event metadata를 붙인다.
#include "analysis/event_rule_engine.h"

#include "analysis/category_tokens.h"
#include "analysis/event_manager.h"
#include "analysis/intrusion_dwell_scenario.h"
#include "analysis/intrusion_after_line_crossing_scenario.h"
#include "analysis/loitering_scenario.h"
#include "analysis/re_entry_scenario.h"
#include "analysis/scene_context_builder.h"
#include "analysis/scenario_engine.h"
#include "analysis/tracked_object_metadata.h"
#include "analysis/wrong_direction_scenario.h"
#include "analysis/zone_occupancy_scenario.h"

#include "app_config.h"

#include <algorithm>
#include <cctype>
#include <cmath>
#include <cstdlib>
#include <initializer_list>
#include <iostream>
#include <mutex>
#include <sstream>
#include <string_view>
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
    std::string scenario_config_signature;
    std::int64_t metrics_log_interval_ns{0};
    std::int64_t last_metrics_log_time_ns{0};
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

std::optional<std::string> ExtractObjectKeyField(const std::string& body, const std::string& field) {
    const std::string needle = "\"" + field + "\"";
    std::size_t search_pos = 0;
    while (search_pos < body.size()) {
        const std::size_t key_pos = body.find(needle, search_pos);
        if (key_pos == std::string::npos) {
            return std::nullopt;
        }
        search_pos = key_pos + needle.size();

        std::size_t prev = key_pos;
        while (prev > 0 && std::isspace(static_cast<unsigned char>(body[prev - 1])) != 0) {
            --prev;
        }
        if (prev > 0 && body[prev - 1] != '{' && body[prev - 1] != ',') {
            continue;
        }

        std::size_t pos = body.find(':', key_pos + needle.size());
        if (pos == std::string::npos) {
            return std::nullopt;
        }
        ++pos;
        while (pos < body.size() && std::isspace(static_cast<unsigned char>(body[pos])) != 0) {
            ++pos;
        }
        if (pos >= body.size() || body[pos] != '{') {
            continue;
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
            if (ch == '{') {
                ++depth;
            } else if (ch == '}') {
                --depth;
                if (depth == 0) {
                    return body.substr(start, pos - start + 1);
                }
            }
        }
    }
    return std::nullopt;
}

std::optional<std::string> ExtractScenarioObject(const std::string& document) {
    return ExtractObjectKeyField(document, "scenario");
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
    if (!context.va_rule_ids.empty()) {
        return std::find(context.va_rule_ids.begin(), context.va_rule_ids.end(), rule.match_va_rule_id) !=
               context.va_rule_ids.end();
    }
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

bool IsKnownScenarioType(const std::string& type) {
    return type == "intrusion-dwell" || type == "re-entry" || type == "wrong-direction" ||
           type == "intrusion-after-line-crossing" || type == "loitering" ||
           type == "zone-occupancy";
}

std::string ScenarioTypeFromDocument(const std::string& document, const EventRule& rule) {
    if (const auto scenario = ExtractScenarioObject(document); scenario.has_value()) {
        const std::string type = ToLower(ParseStringField(*scenario, "type").value_or(""));
        if (IsKnownScenarioType(type)) {
            return type;
        }
    }
    return IsKnownScenarioType(rule.event_type) ? rule.event_type : std::string{};
}

bool ScenarioDocumentEnabled(const std::string& document) {
    const auto scenario = ExtractScenarioObject(document);
    if (!scenario.has_value()) {
        return true;
    }
    return ParseBoolField(*scenario, "enabled").value_or(true);
}

std::vector<std::string> ParseStringListFromFields(const std::string& body,
                                                   std::initializer_list<std::string_view> array_fields,
                                                   std::initializer_list<std::string_view> string_fields) {
    for (const auto field : array_fields) {
        std::vector<std::string> values = ParseStringArrayField(body, std::string(field));
        values.erase(std::remove_if(values.begin(),
                                    values.end(),
                                    [](const std::string& value) { return Trim(value).empty(); }),
                     values.end());
        if (!values.empty()) {
            return values;
        }
    }
    for (const auto field : string_fields) {
        const std::string value = Trim(ParseStringField(body, std::string(field)).value_or(""));
        if (!value.empty()) {
            return {value};
        }
    }
    return {};
}

std::vector<std::string> ScenarioTargetClasses(const std::string& document,
                                               const EventRule& rule,
                                               const std::vector<std::string>& fallback) {
    if (const auto scenario = ExtractScenarioObject(document); scenario.has_value()) {
        auto values = ParseStringListFromFields(*scenario, {"targetClasses", "classes"}, {"targetClass"});
        if (!values.empty()) {
            return values;
        }
    }
    if (!rule.classes.empty()) {
        return rule.classes;
    }
    return fallback;
}

std::vector<std::string> ScenarioZoneIds(const std::string& document, const EventRule& rule) {
    if (const auto scenario = ExtractScenarioObject(document); scenario.has_value()) {
        auto values = ParseStringListFromFields(*scenario,
                                                {"restrictedZoneIds", "targetZoneIds", "targetZones", "zoneIds"},
                                                {"targetZone", "zoneId"});
        if (!values.empty()) {
            return values;
        }
        if (rule.region_type == "polygon" && !rule.id.empty()) {
            return {rule.id};
        }
    }
    return {};
}

std::vector<std::string> ScenarioLineIds(const std::string& document, const EventRule& rule) {
    if (const auto scenario = ExtractScenarioObject(document); scenario.has_value()) {
        auto values = ParseStringListFromFields(*scenario,
                                                {"targetLineIds", "targetLines", "lineIds"},
                                                {"targetLine", "lineId"});
        if (!values.empty()) {
            return values;
        }
        if (const auto trigger_line = ExtractObjectField(*scenario, "triggerLine");
            trigger_line.has_value()) {
            const std::string line_id = Trim(ParseStringField(*trigger_line, "id").value_or(""));
            if (!line_id.empty()) {
                return {line_id};
            }
        }
        if (rule.region_type == "line" && !rule.id.empty()) {
            return {rule.id};
        }
    }
    return {};
}

bool ScenarioRequiresStableTrack(const std::string& document) {
    const auto scenario = ExtractScenarioObject(document);
    if (!scenario.has_value()) {
        return false;
    }
    if (const auto direct = ParseBoolField(*scenario, "requireStableTrack"); direct.has_value()) {
        return *direct;
    }
    if (const auto track_health = ExtractObjectField(*scenario, "trackHealth"); track_health.has_value()) {
        if (const auto nested = ParseBoolField(*track_health, "requireStableTrack"); nested.has_value()) {
            return *nested;
        }
    }
    const std::string mode = ToLower(Trim(ParseStringField(*scenario, "trackHealth").value_or("")));
    return mode == "stable-only" || mode == "stable";
}

std::optional<int> ParseNonNegativeIntField(const std::string& body, std::string_view field) {
    const auto value = ParseNumberField(body, std::string(field));
    if (!value.has_value() || *value < 0.0) {
        return std::nullopt;
    }
    return static_cast<int>(*value);
}

std::optional<float> ParseNonNegativeFloatField(const std::string& body, std::string_view field) {
    const auto value = ParseNumberField(body, std::string(field));
    if (!value.has_value() || *value < 0.0) {
        return std::nullopt;
    }
    return static_cast<float>(*value);
}

std::optional<std::size_t> ParsePositiveSizeField(const std::string& body, std::string_view field) {
    const auto value = ParseNumberField(body, std::string(field));
    if (!value.has_value() || *value < 1.0) {
        return std::nullopt;
    }
    return static_cast<std::size_t>(*value);
}

std::string ScenarioKeyForRule(const EventRule& rule, const std::string& scenario_type) {
    return scenario_type + ":rule:" + rule.id;
}

std::vector<std::unique_ptr<IScenario>> BuildDefaultRuntimeScenarios(const app::AppConfig& config) {
    std::vector<std::unique_ptr<IScenario>> scenarios;
    if (config.analysis_intrusion_dwell_enabled) {
        scenarios.push_back(
            std::make_unique<IntrusionDwellScenario>(
                BuildIntrusionDwellScenarioOptionsFromConfig(config)));
    }
    if (config.analysis_re_entry_enabled) {
        scenarios.push_back(
            std::make_unique<ReEntryScenario>(BuildReEntryScenarioOptionsFromConfig(config)));
    }
    if (config.analysis_wrong_direction_enabled) {
        scenarios.push_back(
            std::make_unique<WrongDirectionScenario>(
                BuildWrongDirectionScenarioOptionsFromConfig(config)));
    }
    if (config.analysis_intrusion_after_line_crossing_enabled) {
        scenarios.push_back(
            std::make_unique<IntrusionAfterLineCrossingScenario>(
                BuildIntrusionAfterLineCrossingScenarioOptionsFromConfig(config)));
    }
    if (config.analysis_loitering_enabled) {
        scenarios.push_back(
            std::make_unique<LoiteringScenario>(BuildLoiteringScenarioOptionsFromConfig(config)));
    }
    if (config.analysis_zone_occupancy_enabled) {
        scenarios.push_back(std::make_unique<ZoneOccupancyScenario>(
            BuildZoneOccupancyScenarioOptionsFromConfig(config)));
    }
    return scenarios;
}

std::vector<std::unique_ptr<IScenario>> BuildRuleRuntimeScenarios(
    const std::vector<std::string>& active_rule_documents,
    const app::AppConfig& config) {
    std::vector<std::unique_ptr<IScenario>> scenarios;
    bool saw_scenario_document = false;
    for (const auto& document : active_rule_documents) {
        const auto rule = ParseRule(document);
        if (!rule.has_value() || !rule->enabled) {
            continue;
        }
        const auto scenario_object = ExtractScenarioObject(document);
        if (!scenario_object.has_value()) {
            continue;
        }
        const std::string scenario_type = ScenarioTypeFromDocument(document, *rule);
        if (scenario_type.empty()) {
            continue;
        }
        saw_scenario_document = true;
        if (!ScenarioDocumentEnabled(document)) {
            continue;
        }
        const auto& scenario = *scenario_object;
        const bool require_stable_track = ScenarioRequiresStableTrack(document);
        const std::vector<std::string> zone_ids = ScenarioZoneIds(document, *rule);
        const std::vector<std::string> line_ids = ScenarioLineIds(document, *rule);

        if (scenario_type == "intrusion-dwell") {
            auto options = BuildIntrusionDwellScenarioOptionsFromConfig(config);
            options.enabled = true;
            options.scenario_key = ScenarioKeyForRule(*rule, scenario_type);
            options.require_stable_track = require_stable_track;
            options.target_class_tokens = ScenarioTargetClasses(document, *rule, options.target_class_tokens);
            options.restricted_zone_ids = zone_ids;
            if (const auto value = ParseNonNegativeIntField(scenario, "candidateTimeMs"); value.has_value()) {
                options.candidate_time_ms = *value;
            }
            if (const auto value = ParseNonNegativeIntField(scenario, "dwellTimeMs"); value.has_value()) {
                options.dwell_time_ms = *value;
            }
            if (const auto value = ParseNonNegativeIntField(scenario, "cooldownMs"); value.has_value()) {
                options.cooldown_ms = *value;
            }
            scenarios.push_back(std::make_unique<IntrusionDwellScenario>(std::move(options)));
        } else if (scenario_type == "wrong-direction") {
            auto options = BuildWrongDirectionScenarioOptionsFromConfig(config);
            options.enabled = true;
            options.scenario_key = ScenarioKeyForRule(*rule, scenario_type);
            options.require_stable_track = require_stable_track;
            options.target_class_tokens = ScenarioTargetClasses(document, *rule, options.target_class_tokens);
            options.target_line_ids = line_ids;
            if (const auto value = ParseNonNegativeIntField(scenario, "cooldownMs"); value.has_value()) {
                options.cooldown_ms = *value;
            }
            std::string allowed_direction =
                ToLower(Trim(ParseStringField(scenario, "allowedDirection").value_or(
                    ParseStringField(scenario, "lineDirection").value_or(rule->direction))));
            if (allowed_direction != "forward" && allowed_direction != "reverse") {
                allowed_direction = ToLower(Trim(rule->direction));
            }
            if (allowed_direction == "forward" || allowed_direction == "reverse") {
                options.allowed_direction_rules.clear();
                const std::vector<std::string> target_lines =
                    options.target_line_ids.empty() && rule->region_type == "line"
                        ? std::vector<std::string>{rule->id}
                        : options.target_line_ids;
                for (const auto& line_id : target_lines) {
                    if (!Trim(line_id).empty()) {
                        options.allowed_direction_rules.push_back(Trim(line_id) + ":" + allowed_direction);
                    }
                }
            }
            scenarios.push_back(std::make_unique<WrongDirectionScenario>(std::move(options)));
        } else if (scenario_type == "re-entry") {
            auto options = BuildReEntryScenarioOptionsFromConfig(config);
            options.enabled = true;
            options.scenario_key = ScenarioKeyForRule(*rule, scenario_type);
            options.require_stable_track = require_stable_track;
            options.target_class_tokens = ScenarioTargetClasses(document, *rule, options.target_class_tokens);
            options.target_zone_ids = zone_ids;
            if (const auto value = ParseNonNegativeIntField(scenario, "reEntryWindowMs"); value.has_value()) {
                options.re_entry_window_ms = *value;
            }
            if (const auto value = ParseNonNegativeIntField(scenario, "cooldownMs"); value.has_value()) {
                options.cooldown_ms = *value;
            }
            scenarios.push_back(std::make_unique<ReEntryScenario>(std::move(options)));
        } else if (scenario_type == "intrusion-after-line-crossing") {
            auto options = BuildIntrusionAfterLineCrossingScenarioOptionsFromConfig(config);
            options.enabled = true;
            options.scenario_key = ScenarioKeyForRule(*rule, scenario_type);
            options.require_stable_track = require_stable_track;
            options.target_class_tokens = ScenarioTargetClasses(document, *rule, options.target_class_tokens);
            options.target_line_ids = line_ids;
            options.target_zone_ids = zone_ids;
            if (const auto value = ParseNonNegativeIntField(scenario, "maxDelayAfterCrossingMs");
                value.has_value()) {
                options.max_delay_after_crossing_ms = *value;
            }
            if (const auto value = ParseNonNegativeIntField(scenario, "dwellTimeMs"); value.has_value()) {
                options.dwell_time_ms = *value;
            }
            if (const auto value = ParseNonNegativeIntField(scenario, "cooldownMs"); value.has_value()) {
                options.cooldown_ms = *value;
            }
            scenarios.push_back(
                std::make_unique<IntrusionAfterLineCrossingScenario>(std::move(options)));
        } else if (scenario_type == "loitering") {
            auto options = BuildLoiteringScenarioOptionsFromConfig(config);
            options.enabled = true;
            options.scenario_key = ScenarioKeyForRule(*rule, scenario_type);
            options.require_stable_track = require_stable_track;
            options.target_class_tokens = ScenarioTargetClasses(document, *rule, options.target_class_tokens);
            options.target_zone_ids = zone_ids;
            if (const auto value = ParseNonNegativeIntField(scenario, "minDwellTimeMs"); value.has_value()) {
                options.min_dwell_time_ms = *value;
            } else if (const auto value = ParseNonNegativeIntField(scenario, "dwellTimeMs"); value.has_value()) {
                options.min_dwell_time_ms = *value;
            }
            if (const auto value = ParseNonNegativeFloatField(scenario, "maxMovementRadius");
                value.has_value()) {
                options.max_movement_radius = *value;
            } else if (const auto value = ParseNonNegativeFloatField(scenario, "movementRadius");
                       value.has_value()) {
                options.max_movement_radius = *value;
            }
            if (const auto value = ParsePositiveSizeField(scenario, "minTrajectoryPoints"); value.has_value()) {
                options.min_trajectory_points = *value;
            }
            if (const auto value = ParseNonNegativeIntField(scenario, "cooldownMs"); value.has_value()) {
                options.cooldown_ms = *value;
            }
            options.use_ground_plane_movement_radius =
                ParseBoolField(scenario, "useGroundPlaneMovementRadius")
                    .value_or(options.use_ground_plane_movement_radius);
            scenarios.push_back(std::make_unique<LoiteringScenario>(std::move(options)));
        } else if (scenario_type == "zone-occupancy") {
            auto options = BuildZoneOccupancyScenarioOptionsFromConfig(config);
            options.enabled = true;
            options.scenario_key = ScenarioKeyForRule(*rule, scenario_type);
            options.require_stable_track = require_stable_track;
            options.target_class_tokens = ScenarioTargetClasses(document, *rule, options.target_class_tokens);
            options.target_zone_ids = zone_ids;
            if (const auto value = ParsePositiveSizeField(scenario, "occupancyThreshold"); value.has_value()) {
                options.occupancy_threshold = *value;
            } else if (const auto value = ParsePositiveSizeField(scenario, "minOccupancy"); value.has_value()) {
                options.occupancy_threshold = *value;
            } else if (const auto value = ParsePositiveSizeField(scenario, "threshold"); value.has_value()) {
                options.occupancy_threshold = *value;
            }
            if (const auto value = ParseNonNegativeIntField(scenario, "minDwellTimeMs"); value.has_value()) {
                options.min_dwell_time_ms = *value;
            } else if (const auto value = ParseNonNegativeIntField(scenario, "dwellTimeMs"); value.has_value()) {
                options.min_dwell_time_ms = *value;
            } else if (const auto value = ParseNonNegativeIntField(scenario, "windowMs"); value.has_value()) {
                options.min_dwell_time_ms = *value;
            }
            if (const auto value = ParseNonNegativeIntField(scenario, "cooldownMs"); value.has_value()) {
                options.cooldown_ms = *value;
            }
            scenarios.push_back(std::make_unique<ZoneOccupancyScenario>(std::move(options)));
        }
    }
    if (!scenarios.empty()) {
        return scenarios;
    }
    if (saw_scenario_document) {
        return scenarios;
    }
    return BuildDefaultRuntimeScenarios(config);
}

std::string BuildScenarioConfigSignature(const std::vector<std::string>& active_rule_documents) {
    if (active_rule_documents.empty()) {
        return "env-default-scenarios";
    }
    std::ostringstream out;
    out << "rule-scenarios:" << active_rule_documents.size();
    for (const auto& document : active_rule_documents) {
        out << "\n---\n" << document;
    }
    return out.str();
}

const TrackRuntimeState* FindTrackState(const std::vector<TrackRuntimeState>& track_states, std::uint64_t track_id) {
    const auto it = std::find_if(track_states.begin(), track_states.end(), [track_id](const TrackRuntimeState& state) {
        return state.track_id == track_id;
    });
    return it == track_states.end() ? nullptr : &(*it);
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

std::string TrackHealthSnapshotJson(const TrackHealth& health) {
    const TrackHealthSnapshot snapshot = MakeTrackHealthSnapshot(health);
    std::ostringstream out;
    out << "{"
        << "\"associationConfidence\":" << snapshot.association_confidence << ","
        << "\"missedFrameCount\":" << snapshot.missed_frame_count << ","
        << "\"overlapRisk\":" << snapshot.overlap_risk << ","
        << "\"directionChangeCount\":" << snapshot.direction_change_count << ","
        << "\"lastStableTimeMs\":" << snapshot.last_stable_time_ms << ","
        << "\"unstable\":" << (snapshot.is_unstable ? "true" : "false") << ","
        << "\"lastHealthEvent\":\"" << JsonEscape(snapshot.last_health_event) << "\","
        << "\"lastHealthEventTimeMs\":" << snapshot.last_health_event_time_ms << ","
        << "\"lostCount\":" << snapshot.lost_count << ","
        << "\"reacquiredCount\":" << snapshot.reacquired_count
        << "}";
    return out.str();
}

void AttachTrackHealthSnapshots(std::vector<AnalysisEvent>* events,
                                const std::vector<TrackRuntimeState>& track_states) {
    if (events == nullptr || events->empty()) {
        return;
    }
    for (auto& event : *events) {
        if (event.track_id == 0) {
            continue;
        }
        const auto* track_state = FindTrackState(track_states, event.track_id);
        if (track_state == nullptr) {
            continue;
        }
        const std::string existing_metadata =
            event.metadata_json.empty() ? std::string{"{}"} : event.metadata_json;
        std::ostringstream metadata;
        metadata << "{"
                 << "\"schema\":\"media-server.va.event-track-health.v1\","
                 << "\"ruleId\":\"" << JsonEscape(event.rule_id) << "\","
                 << "\"eventMetadata\":" << existing_metadata << ","
                 << "\"trackHealth\":" << TrackHealthSnapshotJson(track_state->health)
                 << "}";
        event.metadata_json = metadata.str();
    }
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
    if (rule.region_type == "line") {
        candidate.event.line_id = rule.id;
    } else {
        candidate.event.zone_id = rule.id;
    }
    candidate.timestamp_ns = result.pts;
    candidate.active = true;
    candidate.confirmed = rule.event_type == "presence";

    const auto decision = runtime->event_manager.Update(candidate, RuleEventLifecycleOptions(rule));
    if (decision.emit) {
        events->push_back(decision.event);
    }
    return decision.emit;
}

const ScenarioInstance* FindScenarioInstance(const std::vector<ScenarioInstance>& instances,
                                             std::uint64_t track_id) {
    const ScenarioInstance* fallback = nullptr;
    for (const auto& instance : instances) {
        if (instance.track_id != track_id) {
            continue;
        }
        if (instance.phase == ScenarioPhase::LineCrossed ||
            instance.phase == ScenarioPhase::ZoneEntered ||
            instance.phase == ScenarioPhase::Candidate ||
            instance.phase == ScenarioPhase::Observing ||
            instance.phase == ScenarioPhase::Confirmed) {
            return &instance;
        }
        if (fallback == nullptr) {
            fallback = &instance;
        }
    }
    return fallback;
}

const EventLifecycleStateSnapshot* FindEventLifecycleState(
    const std::vector<EventLifecycleStateSnapshot>& states,
    std::uint64_t track_id) {
    if (track_id == 0) {
        return nullptr;
    }
    const std::string token = "|track:" + std::to_string(track_id);
    const EventLifecycleStateSnapshot* fallback = nullptr;
    for (const auto& state : states) {
        if (state.track_id != track_id && state.key.find(token) == std::string::npos) {
            continue;
        }
        if (state.active) {
            return &state;
        }
        if (fallback == nullptr) {
            fallback = &state;
        }
    }
    return fallback;
}

std::int64_t TimestampMsFromNs(std::int64_t timestamp_ns) {
    if (timestamp_ns <= 0) {
        return -1;
    }
    return timestamp_ns / 1000000LL;
}

std::int64_t ElapsedSinceMs(std::int64_t now_ms, std::int64_t since_ms) {
    if (now_ms < 0 || since_ms < 0) {
        return -1;
    }
    return std::max<std::int64_t>(0, now_ms - since_ms);
}

std::string ExtractRuleIdFromScenarioKey(const std::string& scenario_key) {
    constexpr std::string_view token = ":rule:";
    const std::size_t pos = scenario_key.find(token);
    if (pos == std::string::npos) {
        return {};
    }
    return scenario_key.substr(pos + token.size());
}

bool ScenarioKeyMatches(const std::string& event_scenario_id,
                        const ScenarioInstance& instance) {
    if (event_scenario_id.empty()) {
        return false;
    }
    if (!instance.scenario_key.empty() && event_scenario_id == instance.scenario_key) {
        return true;
    }
    if (event_scenario_id == instance.scenario_id) {
        return true;
    }
    return !instance.scenario_id.empty() &&
           event_scenario_id.rfind(instance.scenario_id + ":", 0) == 0;
}

const EventLifecycleStateSnapshot* FindEventLifecycleStateForScenario(
    const std::vector<EventLifecycleStateSnapshot>& states,
    const ScenarioInstance& instance) {
    const EventLifecycleStateSnapshot* fallback = nullptr;
    for (const auto& state : states) {
        if (state.track_id != instance.track_id || !ScenarioKeyMatches(state.scenario_id, instance)) {
            continue;
        }
        if (!instance.zone_id.empty() && !state.zone_id.empty() && state.zone_id != instance.zone_id) {
            continue;
        }
        if (state.active) {
            return &state;
        }
        if (fallback == nullptr) {
            fallback = &state;
        }
    }
    return fallback;
}

AnalysisDebugScenarioTimeline BuildScenarioTimelineItem(
    const ScenarioInstance& instance,
    const SceneContext& scene_context,
    const std::vector<EventLifecycleStateSnapshot>& event_states,
    std::int64_t now_ms) {
    AnalysisDebugScenarioTimeline item;
    item.stream_id = instance.stream_id;
    item.channel_id = instance.channel_id;
    item.scenario_key = instance.scenario_key;
    item.scenario_name = instance.scenario_id;
    item.rule_id = ExtractRuleIdFromScenarioKey(instance.scenario_key);
    item.track_id = instance.track_id;
    item.zone_id = instance.zone_id;
    item.current_phase = ToString(instance.phase);
    item.previous_phase = ToString(instance.previous_phase);
    item.phase_entered_at_ms = TimestampMsFromNs(instance.phase_entered_ns);
    item.phase_elapsed_ms = ElapsedSinceMs(now_ms, item.phase_entered_at_ms);
    item.track_first_seen_at_ms = TimestampMsFromNs(instance.first_seen_ns);
    item.track_last_seen_at_ms = TimestampMsFromNs(instance.last_seen_ns);
    item.active = instance.phase == ScenarioPhase::LineCrossed ||
                  instance.phase == ScenarioPhase::ZoneEntered ||
                  instance.phase == ScenarioPhase::Candidate ||
                  instance.phase == ScenarioPhase::Observing ||
                  instance.phase == ScenarioPhase::Confirmed;

    if (const auto* track_context = FindTrackSceneContext(scene_context, instance.track_id);
        track_context != nullptr) {
        item.class_id = track_context->class_id;
        item.class_name = track_context->class_name;
        if (item.zone_id.empty()) {
            item.zone_id = track_context->zone_state.current_zone;
        }
        if (track_context->zone_state.entered_at_ms > 0) {
            item.zone_entered_at_ms = track_context->zone_state.entered_at_ms;
        }
        if (!track_context->line_states.empty()) {
            const auto& line = track_context->line_states.front();
            item.line_id = line.line_id;
            if (line.last_cross_time_ms > 0) {
                item.line_crossed_at_ms = line.last_cross_time_ms;
            }
        }
    }

    if (const auto* event_state = FindEventLifecycleStateForScenario(event_states, instance);
        event_state != nullptr) {
        item.instance_key = event_state->object_key;
        item.dedupe_key = event_state->key;
        item.last_event_id = event_state->last_event_id;
        item.last_event_status = event_state->last_event_status;
        item.event_emitted_at_ms = event_state->last_emitted_ms > 0 ? event_state->last_emitted_ms : -1;
        item.event_emitted_count = event_state->emitted_count;
        item.dedupe_suppressed_count = event_state->suppressed_count;
        if (event_state->cooldown_until_ms > 0) {
            item.cooldown_ends_at_ms = event_state->cooldown_until_ms;
        }
        if (event_state->ended_at_ms > 0) {
            item.cooldown_started_at_ms = event_state->ended_at_ms;
        } else if (event_state->last_emitted_ms > 0 && item.cooldown_ends_at_ms > 0) {
            item.cooldown_started_at_ms = event_state->last_emitted_ms;
        }
    }

    const std::int64_t scenario_cooldown_ends = TimestampMsFromNs(instance.cooldown_until_ns);
    if (scenario_cooldown_ends > item.cooldown_ends_at_ms) {
        item.cooldown_ends_at_ms = scenario_cooldown_ends;
    }
    if (item.cooldown_started_at_ms < 0 && instance.confirmed_at_ns > 0 &&
        item.cooldown_ends_at_ms >= 0) {
        item.cooldown_started_at_ms = TimestampMsFromNs(instance.confirmed_at_ns);
    }
    if (item.cooldown_ends_at_ms >= 0) {
        item.cooldown_remaining_ms = std::max<std::int64_t>(0, item.cooldown_ends_at_ms - now_ms);
    }
    if (item.instance_key.empty()) {
        const std::string key_prefix = item.scenario_key.empty() ? item.scenario_name : item.scenario_key;
        item.instance_key = key_prefix + ":track:" + std::to_string(item.track_id);
    }
    if (item.dedupe_key.empty()) {
        item.dedupe_key = item.instance_key;
    }
    if (item.last_event_status.empty() && item.event_emitted_count > 0) {
        item.last_event_status = item.current_phase;
    }
    return item;
}

AnalysisDebugState BuildDebugState(const AnalysisResult& result,
                                   const std::string& channel_id,
                                   const SceneContext& scene_context,
                                   const ScenarioEngine& scenario_engine,
                                   const EventManager& event_manager) {
    AnalysisDebugState debug;
    debug.enabled = true;
    debug.stream_id = result.source_key;
    debug.channel_id = channel_id;
    debug.timestamp_ms = result.pts / 1000000LL;

    const auto scenario_instances = scenario_engine.Snapshot(channel_id);
    const auto scenario_metrics = scenario_engine.Metrics();
    const auto event_metrics = event_manager.Metrics();
    const auto event_states = event_manager.Snapshot();
    debug.scenario_instance_count = scenario_metrics.total_instances;
    debug.active_scenario_count = scenario_metrics.active_instances;
    debug.event_state_count = event_metrics.total_states;
    debug.active_event_state_count = event_metrics.active_states;
    debug.track_count = scene_context.tracks.size();
    debug.tracks.reserve(scene_context.tracks.size());
    debug.scenario_timeline.reserve(scenario_instances.size());
    const bool include_ground_point =
        app::GetAppConfig().default_analysis_debug_ground_point_enabled;

    for (const auto& instance : scenario_instances) {
        debug.scenario_timeline.push_back(
            BuildScenarioTimelineItem(instance, scene_context, event_states, debug.timestamp_ms));
    }
    std::sort(debug.scenario_timeline.begin(),
              debug.scenario_timeline.end(),
              [](const auto& lhs, const auto& rhs) {
                  if (lhs.active != rhs.active) {
                      return lhs.active && !rhs.active;
                  }
                  return lhs.phase_entered_at_ms > rhs.phase_entered_at_ms;
              });

    for (const auto& track_context : scene_context.tracks) {
        AnalysisDebugTrackState track;
        track.stream_id = track_context.stream_id;
        track.channel_id = track_context.channel_id;
        track.track_id = track_context.track_id;
        track.class_id = track_context.class_id;
        track.class_name = track_context.class_name;
        track.confidence = track_context.confidence;
        track.bbox = track_context.bbox;
        track.speed = track_context.speed;
        track.speed_uses_ground_plane = track_context.speed_uses_ground_plane;
        track.speed_units = track_context.speed_units;
        if (include_ground_point) {
            track.ground_point_available = true;
            track.ground_point_valid = track_context.ground_point.valid;
            track.ground_point_fallback = track_context.ground_point.fallback_to_image;
            track.foot_point_x = track_context.foot_point.x;
            track.foot_point_y = track_context.foot_point.y;
            track.ground_point_x = track_context.ground_point.x;
            track.ground_point_y = track_context.ground_point.y;
            track.ground_point_units = track_context.ground_point.units;
        }
        track.lifecycle_state = ToString(track_context.lifecycle_state);
        if (track_context.lifecycle_state == TrackLifecycleState::Active) {
            ++debug.active_track_count;
        } else if (track_context.lifecycle_state == TrackLifecycleState::Lost) {
            ++debug.lost_track_count;
        } else if (track_context.lifecycle_state == TrackLifecycleState::Reacquired) {
            ++debug.active_track_count;
            ++debug.reacquired_track_count;
        } else if (track_context.lifecycle_state == TrackLifecycleState::Terminated) {
            ++debug.terminated_track_count;
        }

        track.current_zone = track_context.zone_state.current_zone;
        track.previous_zone = track_context.zone_state.previous_zone;
        track.entered_at_ms = track_context.zone_state.entered_at_ms;
        track.exited_at_ms = track_context.zone_state.exited_at_ms;
        track.dwell_time_ms = track_context.zone_state.dwell_time_ms;
        track.inside_restricted_zone = track_context.zone_state.is_inside_restricted_zone;
        for (const auto& line_state : track_context.line_states) {
            AnalysisDebugLineState line;
            line.line_id = line_state.line_id;
            line.allowed_direction = line_state.allowed_direction;
            line.previous_side = line_state.previous_side;
            line.current_side = line_state.current_side;
            line.crossed = line_state.crossed;
            line.direction = line_state.direction;
            line.raw_crossed = line_state.raw_crossed;
            line.raw_direction = line_state.raw_direction;
            line.direction_allowed = line_state.direction_allowed;
            line.last_cross_time_ms = line_state.last_cross_time_ms;
            track.line_states.push_back(line);
            if (track.primary_line_id.empty()) {
                track.primary_line_id = line.line_id;
                track.line_side = line.current_side;
                track.crossing_direction = line.raw_direction != "none" ? line.raw_direction : line.direction;
            }
        }

        if (const auto* instance = FindScenarioInstance(scenario_instances, track.track_id); instance != nullptr) {
            track.scenario_name = instance->scenario_id;
            track.scenario_phase = ToString(instance->phase);
        }
        if (const auto* event_state = FindEventLifecycleState(event_states, track.track_id); event_state != nullptr) {
            track.event_lifecycle = ToString(event_state->stage);
        }
        track.association_confidence = track_context.track_health.association_confidence;
        track.missed_frame_count = track_context.track_health.missed_frame_count;
        track.overlap_risk = track_context.track_health.overlap_risk;
        track.direction_change_count = track_context.track_health.direction_change_count;
        track.track_unstable = track_context.track_health.is_unstable;
        track.track_health = track.track_unstable ? "unstable" : "stable";
        debug.tracks.push_back(std::move(track));
    }
    return debug;
}

void MaybeLogDebugState(const AnalysisDebugState& debug) {
    if (!debug.enabled) {
        return;
    }
    std::cerr << "[analysis-debug] stream=" << debug.stream_id
              << " channel=" << debug.channel_id
              << " tracks=" << debug.track_count
              << " activeTracks=" << debug.active_track_count
              << " lostTracks=" << debug.lost_track_count
              << " reacquiredTracks=" << debug.reacquired_track_count
              << " terminatedTracks=" << debug.terminated_track_count
              << " scenarios=" << debug.scenario_instance_count
              << " activeScenarios=" << debug.active_scenario_count
              << " eventStates=" << debug.event_state_count
              << " activeEventStates=" << debug.active_event_state_count << "\n";
}

std::int64_t MsToNs(std::int64_t value_ms) {
    return std::max<std::int64_t>(0, value_ms) * 1000000LL;
}

AnalysisChannelMetrics& FindOrCreateChannelMetrics(std::vector<AnalysisChannelMetrics>* channels,
                                                   const std::string& stream_id,
                                                   const std::string& channel_id) {
    const std::string resolved_channel_id = channel_id.empty() ? stream_id : channel_id;
    for (auto& channel : *channels) {
        if (channel.channel_id == resolved_channel_id) {
            if (channel.stream_id.empty()) {
                channel.stream_id = stream_id;
            }
            return channel;
        }
    }
    channels->push_back(AnalysisChannelMetrics{});
    AnalysisChannelMetrics& channel = channels->back();
    channel.stream_id = stream_id;
    channel.channel_id = resolved_channel_id;
    return channel;
}

void AccumulateTrackHealth(const TrackHealth& health, TrackHealthMetrics* metrics) {
    if (metrics == nullptr) {
        return;
    }
    if (health.is_unstable) {
        ++metrics->unstable_track_count;
    }
    if (health.overlap_risk > 0.0F) {
        ++metrics->overlap_risk_track_count;
    }
    if (health.missed_frame_count > 0) {
        ++metrics->missed_frame_track_count;
    }
    metrics->missed_frame_total += health.missed_frame_count;
    metrics->missed_frame_max = std::max(metrics->missed_frame_max, health.missed_frame_count);
    if (health.direction_change_count > 0) {
        ++metrics->direction_change_track_count;
    }
    metrics->direction_change_total += health.direction_change_count;
    metrics->direction_change_max = std::max(metrics->direction_change_max, health.direction_change_count);
}

AnalysisMetricsReport BuildMetricsReport(const AnalysisResult& result,
                                         const std::string& channel_id,
                                         const std::vector<TrackRuntimeState>& track_states,
                                         const TrackStateMetrics& track_metrics,
                                         const ScenarioEngine& scenario_engine,
                                         const EventManager& event_manager) {
    AnalysisMetricsReport report;
    report.enabled = true;
    report.stream_id = result.source_key;
    report.channel_id = channel_id;
    report.timestamp_ms = result.pts / 1000000LL;
    FindOrCreateChannelMetrics(&report.channels, result.source_key, channel_id);
    report.total_track_count = track_metrics.total_tracks;
    report.active_track_count = track_metrics.active_tracks;
    report.lost_track_count = track_metrics.lost_tracks;
    report.reacquired_track_count = track_metrics.reacquired_tracks;
    report.terminated_track_count = track_metrics.terminated_tracks;
    report.terminated_track_cleanup_count = track_metrics.tracks_removed_by_cleanup;

    for (const auto& state : track_states) {
        AnalysisChannelMetrics& channel =
            FindOrCreateChannelMetrics(&report.channels, state.stream_id, state.channel_id);
        ++channel.total_track_count;
        if (state.lifecycle_state == TrackLifecycleState::Active) {
            ++channel.active_track_count;
        } else if (state.lifecycle_state == TrackLifecycleState::Lost) {
            ++channel.lost_track_count;
        } else if (state.lifecycle_state == TrackLifecycleState::Reacquired) {
            ++channel.active_track_count;
            ++channel.reacquired_track_count;
        } else if (state.lifecycle_state == TrackLifecycleState::Terminated) {
            ++channel.terminated_track_count;
        }
        AccumulateTrackHealth(state.health, &channel.track_health);
        AccumulateTrackHealth(state.health, &report.track_health);
    }

    const auto scenario_metrics = scenario_engine.Metrics();
    report.active_scenario_count = scenario_metrics.active_instances;
    report.scenario_cleanup_count = scenario_metrics.instances_removed_by_cleanup;
    for (const auto& instance : scenario_engine.Snapshot()) {
        if (instance.phase != ScenarioPhase::LineCrossed &&
            instance.phase != ScenarioPhase::ZoneEntered &&
            instance.phase != ScenarioPhase::Candidate &&
            instance.phase != ScenarioPhase::Observing &&
            instance.phase != ScenarioPhase::Confirmed) {
            continue;
        }
        AnalysisChannelMetrics& channel =
            FindOrCreateChannelMetrics(&report.channels, instance.stream_id, instance.channel_id);
        ++channel.active_scenario_count;
    }

    const auto event_metrics = event_manager.Metrics();
    report.active_event_state_count = event_metrics.active_states;
    report.event_emitted_count = event_metrics.emitted_count;
    report.event_dedup_count = event_metrics.suppressed_count;
    report.event_cleanup_count = event_metrics.states_removed_by_cleanup;
    for (const auto& channel_event_metrics : event_manager.ChannelMetrics()) {
        AnalysisChannelMetrics& channel =
            FindOrCreateChannelMetrics(&report.channels,
                                       channel_event_metrics.stream_id,
                                       channel_event_metrics.channel_id);
        channel.event_state_count = channel_event_metrics.total_states;
        channel.active_event_state_count = channel_event_metrics.active_states;
        channel.event_emitted_count = channel_event_metrics.emitted_count;
        channel.event_dedup_count = channel_event_metrics.suppressed_count;
    }

    report.channel_count = report.channels.size();
    std::sort(report.channels.begin(), report.channels.end(), [](const auto& lhs, const auto& rhs) {
        return lhs.channel_id < rhs.channel_id;
    });
    return report;
}

bool ShouldLogMetrics(EventRuleRuntime* runtime, std::int64_t timestamp_ns) {
    if (runtime == nullptr || runtime->metrics_log_interval_ns <= 0 || timestamp_ns <= 0) {
        return false;
    }
    if (runtime->last_metrics_log_time_ns <= 0) {
        runtime->last_metrics_log_time_ns = timestamp_ns;
        return false;
    }
    if (timestamp_ns >= runtime->last_metrics_log_time_ns + runtime->metrics_log_interval_ns) {
        runtime->last_metrics_log_time_ns = timestamp_ns;
        return true;
    }
    return false;
}

void LogMetricsReport(const AnalysisMetricsReport& report) {
    if (!report.enabled) {
        return;
    }
    std::cerr << "[analysis-metrics] stream=" << report.stream_id
              << " channel=" << report.channel_id
              << " channels=" << report.channel_count
              << " activeTracks=" << report.active_track_count
              << " lostTracks=" << report.lost_track_count
              << " reacquiredTracks=" << report.reacquired_track_count
              << " terminatedTracks=" << report.terminated_track_count
              << " activeScenarios=" << report.active_scenario_count
              << " eventsEmitted=" << report.event_emitted_count
              << " eventDedup=" << report.event_dedup_count
              << " unstableTracks=" << report.track_health.unstable_track_count
              << " overlapRiskTracks=" << report.track_health.overlap_risk_track_count
              << " missedFrameTotal=" << report.track_health.missed_frame_total
              << " directionChangeTotal=" << report.track_health.direction_change_total
              << " terminatedCleanup=" << report.terminated_track_cleanup_count
              << " scenarioCleanup=" << report.scenario_cleanup_count
              << " eventCleanup=" << report.event_cleanup_count << "\n";
}

}  // namespace

EventRuleRuntime::EventRuleRuntime()
    : track_state_manager(BuildTrackStateManagerOptionsFromConfig(app::GetAppConfig()),
                          std::make_shared<NoOpAppearanceExtractor>()),
      rule_scene_context_builder(BuildSceneContextBuilderOptionsFromConfig(app::GetAppConfig())),
      scenario_scene_context_builder(BuildSceneContextBuilderOptionsFromConfig(app::GetAppConfig())),
      scenario_engine(BuildScenarioEngineOptionsFromConfig(app::GetAppConfig())) {
    const auto& config = app::GetAppConfig();
    scenario_engine.ReplaceScenarios(BuildDefaultRuntimeScenarios(config));
    metrics_log_interval_ns = MsToNs(config.analysis_metrics_log_interval_ms);
}

std::shared_ptr<EventRuleRuntime> CreateEventRuleRuntime() {
    return std::make_shared<EventRuleRuntime>();
}

EventRuleEvaluation ApplyEventRulesToResult(const AnalysisResult& result,
                                            const std::vector<std::string>& rule_documents,
                                            const std::shared_ptr<EventRuleRuntime>& runtime) {
    EventRuleEvaluation evaluation;
    evaluation.annotated_result = result;
    if (rule_documents.empty() && !result.debug_state_requested && !result.metrics_report_requested) {
        return evaluation;
    }

    std::vector<EventRule> rules;
    std::vector<std::string> active_rule_documents;
    rules.reserve(rule_documents.size());
    active_rule_documents.reserve(rule_documents.size());
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
        active_rule_documents.push_back(document);
    }
    evaluation.active_rule_count = rules.size();
    if (rules.empty() && !result.debug_state_requested && !result.metrics_report_requested) {
        return evaluation;
    }

    const auto safe_runtime = runtime != nullptr ? runtime : CreateEventRuleRuntime();
    std::lock_guard lock(safe_runtime->mu);
    const std::string scenario_signature = BuildScenarioConfigSignature(active_rule_documents);
    if (safe_runtime->scenario_config_signature != scenario_signature) {
        safe_runtime->scenario_engine.ReplaceScenarios(
            BuildRuleRuntimeScenarios(active_rule_documents, app::GetAppConfig()));
        safe_runtime->scenario_config_signature = scenario_signature;
    }
    const std::string channel_id = ResolveRuntimeChannelId(result.source_key);
    safe_runtime->track_state_manager.Update(result.source_key, channel_id, BuildTrackedObjects(result), result.pts);
    const auto track_states = safe_runtime->track_state_manager.Snapshot(channel_id);
    const auto track_metrics = safe_runtime->track_state_manager.Metrics();

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
        BuildSceneGeometryConfigFromRuleDocuments(active_rule_documents, result.context);
    std::optional<SceneContext> scenario_context_for_debug;
    if ((!scenario_geometry.zones.empty() || !scenario_geometry.lines.empty() || result.debug_state_requested) &&
        !track_states.empty()) {
        SceneContext scenario_context = safe_runtime->scenario_scene_context_builder.Build(
            result.source_key, channel_id, track_states, scenario_geometry, result.pts);
        if (!scenario_geometry.zones.empty() || !scenario_geometry.lines.empty()) {
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
        if (result.debug_state_requested) {
            scenario_context_for_debug = std::move(scenario_context);
        }
    }
    AttachTrackHealthSnapshots(&evaluation.events, track_states);

    if (result.debug_state_requested && !scenario_context_for_debug.has_value()) {
        SceneContext empty_context;
        empty_context.stream_id = result.source_key;
        empty_context.channel_id = channel_id;
        empty_context.timestamp_ns = result.pts;
        empty_context.timestamp_ms = result.pts / 1000000LL;
        scenario_context_for_debug = std::move(empty_context);
    }
    if (result.debug_state_requested && scenario_context_for_debug.has_value()) {
        evaluation.annotated_result.debug_state =
            BuildDebugState(result,
                            channel_id,
                            *scenario_context_for_debug,
                            safe_runtime->scenario_engine,
                            safe_runtime->event_manager);
        if (result.debug_state_log_enabled) {
            MaybeLogDebugState(*evaluation.annotated_result.debug_state);
        }
    }

    const bool should_log_metrics = ShouldLogMetrics(safe_runtime.get(), result.pts);
    if (result.metrics_report_requested || should_log_metrics) {
        const auto all_track_states = safe_runtime->track_state_manager.Snapshot();
        AnalysisMetricsReport metrics_report = BuildMetricsReport(result,
                                                                  channel_id,
                                                                  all_track_states,
                                                                  track_metrics,
                                                                  safe_runtime->scenario_engine,
                                                                  safe_runtime->event_manager);
        if (should_log_metrics) {
            LogMetricsReport(metrics_report);
        }
        if (result.metrics_report_requested) {
            evaluation.metrics_report = metrics_report;
            evaluation.tracking_issue_report_json =
                TrackingIssueReportToJson(safe_runtime->track_state_manager.TrackingIssueSnapshot());
            evaluation.annotated_result.metrics_report = std::move(metrics_report);
        }
    }

    return evaluation;
}

}  // namespace analysis

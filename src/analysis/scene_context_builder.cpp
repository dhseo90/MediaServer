// 파일 요약: TrackRuntimeState 기반 scene context 계산기를 구현한다.
// 동작 요약: 기존 rule 문서의 polygon/line region 형식을 읽어 zone/line context를 계산한다.
// 동작 요약: 기존 이벤트 판단 결과를 바꾸지 않고 context만 산출한다.
#include "analysis/scene_context_builder.h"

#include "app_config.h"

#include <algorithm>
#include <cctype>
#include <cmath>
#include <optional>
#include <utility>

namespace analysis {

namespace {

constexpr float kLineEpsilon = 0.0005F;

std::int64_t TimestampMs(std::int64_t timestamp_ns) {
    return timestamp_ns / 1000000LL;
}

std::int64_t MsToNs(std::int64_t milliseconds) {
    return std::max<std::int64_t>(0, milliseconds) * 1000000LL;
}

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
            out.push_back(ch);
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
    const std::size_t start = pos;
    while (pos < body.size() &&
           (std::isdigit(static_cast<unsigned char>(body[pos])) != 0 || body[pos] == '-' ||
            body[pos] == '+' || body[pos] == '.' || body[pos] == 'e' || body[pos] == 'E')) {
        ++pos;
    }
    if (start == pos) {
        return std::nullopt;
    }
    try {
        return std::stod(body.substr(start, pos - start));
    } catch (...) {
        return std::nullopt;
    }
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

std::vector<std::string> ExtractObjectArray(const std::string& body, const std::string& field) {
    std::vector<std::string> objects;
    const auto array = ExtractArrayField(body, field);
    if (!array.has_value()) {
        return objects;
    }

    bool in_string = false;
    bool escaped = false;
    int depth = 0;
    std::size_t object_start = std::string::npos;
    for (std::size_t pos = 0; pos < array->size(); ++pos) {
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
            if (depth == 0) {
                object_start = pos;
            }
            ++depth;
        } else if (ch == '}') {
            --depth;
            if (depth == 0 && object_start != std::string::npos) {
                objects.push_back(array->substr(object_start, pos - object_start + 1));
                object_start = std::string::npos;
            }
        }
    }
    return objects;
}

bool MatchesToken(const std::string& wanted, const std::string& actual) {
    const std::string normalized_wanted = ToLower(Trim(wanted));
    if (normalized_wanted.empty() || normalized_wanted == "*") {
        return true;
    }
    return normalized_wanted == ToLower(Trim(actual));
}

bool MatchesRuleContext(const std::string& document, const AnalysisContext& context) {
    const auto match = ExtractObjectField(document, "match");
    if (!match.has_value()) {
        return context.va_rule_id.empty();
    }
    const std::string va_rule_id = ParseStringField(*match, "vaRule").value_or(
        ParseStringField(*match, "vaRuleId").value_or(""));
    if (!context.va_rule_id.empty()) {
        return va_rule_id == context.va_rule_id;
    }
    if (!va_rule_id.empty()) {
        return false;
    }
    const std::string source_kind = ParseStringField(*match, "sourceKind").value_or("*");
    const std::string route = ParseStringField(*match, "route").value_or("*");
    const std::string client_id = ParseStringField(*match, "clientId").value_or("");
    if (!MatchesToken(source_kind, context.source_kind)) {
        return false;
    }
    if (!MatchesToken(route, context.route)) {
        return false;
    }
    if (!client_id.empty() && client_id != "*" && client_id != context.client_id) {
        return false;
    }
    return true;
}

std::vector<SceneGeometryPoint> ParsePoints(const std::string& region) {
    std::vector<SceneGeometryPoint> points;
    for (const auto& point_body : ExtractObjectArray(region, "points")) {
        const auto x = ParseNumberField(point_body, "x");
        const auto y = ParseNumberField(point_body, "y");
        if (x.has_value() && y.has_value()) {
            SceneGeometryPoint point;
            point.x = static_cast<float>(*x);
            point.y = static_cast<float>(*y);
            points.push_back(point);
        }
    }
    return points;
}

bool DefinitionMatchesChannel(const std::string& stream_id,
                              const std::string& channel_id,
                              const std::string& definition_stream_id,
                              const std::string& definition_channel_id) {
    return (definition_stream_id.empty() || definition_stream_id == stream_id) &&
           (definition_channel_id.empty() || definition_channel_id == channel_id);
}

bool PointInPolygon(const NormalizedPointF& point, const std::vector<SceneGeometryPoint>& polygon) {
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

float SignedLineSide(const NormalizedPointF& point, const std::vector<SceneGeometryPoint>& line) {
    if (line.size() < 2) {
        return 0.0F;
    }
    const auto& a = line[0];
    const auto& b = line[1];
    return (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x);
}

std::string CrossingDirection(float previous_side, float current_side) {
    if (previous_side < 0.0F && current_side > 0.0F) {
        return "forward";
    }
    if (previous_side > 0.0F && current_side < 0.0F) {
        return "reverse";
    }
    return "none";
}

bool DirectionAllowed(const std::string& allowed, const std::string& actual) {
    const std::string normalized = ToLower(Trim(allowed));
    return normalized.empty() || normalized == "any" || normalized == actual;
}

bool ContainsTrackId(const std::vector<std::uint64_t>& track_ids, std::uint64_t track_id) {
    return std::find(track_ids.begin(), track_ids.end(), track_id) != track_ids.end();
}

}  // namespace

SceneContextBuilder::SceneContextBuilder(SceneContextBuilderOptions options) : options_(options) {
    options_.max_track_contexts_per_channel =
        std::max<std::size_t>(1, options_.max_track_contexts_per_channel);
    options_.retained_context_ms = std::max<std::int64_t>(0, options_.retained_context_ms);
    options_.cleanup_interval_ms = std::max<std::int64_t>(0, options_.cleanup_interval_ms);
}

SceneContext SceneContextBuilder::Build(const std::string& stream_id,
                                        const std::string& channel_id,
                                        const std::vector<TrackRuntimeState>& track_states,
                                        const std::vector<SceneZoneDefinition>& zones,
                                        const std::vector<SceneLineDefinition>& lines,
                                        std::int64_t timestamp_ns) {
    const std::string resolved_channel_id = ResolveChannelId(stream_id, channel_id);
    auto& runtime_by_track = contexts_by_channel_[resolved_channel_id];

    SceneContext context;
    context.stream_id = stream_id;
    context.channel_id = resolved_channel_id;
    context.timestamp_ns = timestamp_ns;
    context.timestamp_ms = TimestampMs(timestamp_ns);
    context.tracks.reserve(track_states.size());
    std::vector<std::uint64_t> observed_track_ids;
    observed_track_ids.reserve(track_states.size());

    for (const auto& track_state : track_states) {
        if (track_state.channel_id != resolved_channel_id || track_state.track_id == 0) {
            continue;
        }
        if (track_state.lifecycle_state == TrackLifecycleState::Terminated) {
            runtime_by_track.erase(track_state.track_id);
            continue;
        }

        TrackSceneRuntime& runtime = runtime_by_track[track_state.track_id];
        runtime.last_observed_ns = timestamp_ns;
        observed_track_ids.push_back(track_state.track_id);

        TrackSceneContext track_context;
        track_context.stream_id = track_state.stream_id;
        track_context.channel_id = track_state.channel_id;
        track_context.track_id = track_state.track_id;
        track_context.class_id = track_state.class_id;
        track_context.class_name = track_state.class_name;
        track_context.confidence = track_state.confidence;
        track_context.lifecycle_state = track_state.lifecycle_state;
        track_context.track_health = track_state.health;
        track_context.appearance_profile = track_state.appearance_profile;
        track_context.direction = track_state.latest_direction;
        track_context.center = track_state.latest_center;
        track_context.bbox = track_state.latest_bbox;

        bool has_primary_zone_state = false;
        for (const auto& zone : zones) {
            if (!DefinitionMatchesChannel(stream_id, resolved_channel_id, zone.stream_id, zone.channel_id)) {
                continue;
            }
            const bool inside_zone = PointInPolygon(track_state.latest_center, zone.polygon);
            const std::string current_zone = inside_zone ? zone.zone_id : std::string{};
            ZoneState& zone_state = runtime.zone_states[zone.zone_id];
            zone_state.had_previous_observation = zone_state.has_observation;
            zone_state.changed = zone_state.current_zone != current_zone;
            if (zone_state.changed) {
                zone_state.previous_zone = zone_state.current_zone;
                if (!zone_state.current_zone.empty()) {
                    zone_state.exited_at_ns = timestamp_ns;
                    zone_state.exited_at_ms = TimestampMs(timestamp_ns);
                }
                if (!current_zone.empty()) {
                    zone_state.entered_at_ns = timestamp_ns;
                    zone_state.entered_at_ms = TimestampMs(timestamp_ns);
                }
                zone_state.current_zone = current_zone;
            }
            zone_state.has_observation = true;
            zone_state.is_inside_restricted_zone = inside_zone && zone.restricted;
            zone_state.dwell_time_ms =
                !zone_state.current_zone.empty() && zone_state.entered_at_ns > 0
                    ? TimestampMs(std::max<std::int64_t>(0, timestamp_ns - zone_state.entered_at_ns))
                    : 0;
            track_context.zone_states.push_back(zone_state);
            if (!has_primary_zone_state || !zone_state.current_zone.empty()) {
                track_context.zone_state = zone_state;
                has_primary_zone_state = true;
            }
        }

        if (track_context.zone_states.empty()) {
            ZoneState zone_state;
            zone_state.has_observation = true;
            track_context.zone_state = zone_state;
        }

        for (const auto& line : lines) {
            if (!DefinitionMatchesChannel(stream_id, resolved_channel_id, line.stream_id, line.channel_id)) {
                continue;
            }
            const float current_side = SignedLineSide(track_state.latest_center, line.points);
            const auto previous_it = runtime.previous_line_side.find(line.line_id);
            const bool had_previous = previous_it != runtime.previous_line_side.end();
            const float previous_side = had_previous ? previous_it->second : current_side;
            const std::string crossing_direction = CrossingDirection(previous_side, current_side);
            const bool crossed = had_previous && std::fabs(previous_side) > kLineEpsilon &&
                                 std::fabs(current_side) > kLineEpsilon &&
                                 previous_side * current_side < 0.0F &&
                                 DirectionAllowed(line.allowed_direction, crossing_direction);

            if (std::fabs(current_side) > kLineEpsilon) {
                runtime.previous_line_side[line.line_id] = current_side;
            }
            if (crossed) {
                runtime.last_cross_time_ns[line.line_id] = timestamp_ns;
            }

            LineCrossState line_state;
            line_state.line_id = line.line_id;
            line_state.previous_side = previous_side;
            line_state.current_side = current_side;
            line_state.crossed = crossed;
            line_state.direction = crossed ? crossing_direction : "none";
            line_state.last_cross_time_ns = runtime.last_cross_time_ns[line.line_id];
            line_state.last_cross_time_ms = TimestampMs(line_state.last_cross_time_ns);
            track_context.line_states.push_back(line_state);
        }

        context.tracks.push_back(std::move(track_context));
    }

    CleanupChannel(&runtime_by_track, observed_track_ids, timestamp_ns);
    EnforceChannelLimit(&runtime_by_track, observed_track_ids);
    if (runtime_by_track.empty()) {
        contexts_by_channel_.erase(resolved_channel_id);
    }

    return context;
}

SceneContext SceneContextBuilder::Build(const std::string& stream_id,
                                        const std::string& channel_id,
                                        const std::vector<TrackRuntimeState>& track_states,
                                        const SceneGeometryConfig& geometry_config,
                                        std::int64_t timestamp_ns) {
    return Build(stream_id,
                 channel_id,
                 track_states,
                 geometry_config.zones,
                 geometry_config.lines,
                 timestamp_ns);
}

void SceneContextBuilder::Reset() {
    contexts_by_channel_.clear();
    last_cleanup_time_ns_ = 0;
}

std::string SceneContextBuilder::ResolveChannelId(const std::string& stream_id, const std::string& channel_id) {
    if (!channel_id.empty()) {
        return channel_id;
    }
    return stream_id.empty() ? std::string{"default"} : stream_id;
}

bool SceneContextBuilder::ShouldRunCleanup(std::int64_t timestamp_ns) const {
    const std::int64_t interval_ns = MsToNs(options_.cleanup_interval_ms);
    if (interval_ns <= 0) {
        return true;
    }
    if (last_cleanup_time_ns_ <= 0) {
        return true;
    }
    return timestamp_ns >= last_cleanup_time_ns_ + interval_ns;
}

void SceneContextBuilder::CleanupChannel(TrackContextMap* contexts,
                                         const std::vector<std::uint64_t>& observed_track_ids,
                                         std::int64_t timestamp_ns) {
    if (contexts == nullptr || !ShouldRunCleanup(timestamp_ns)) {
        return;
    }
    const std::int64_t retention_ns = MsToNs(options_.retained_context_ms);
    for (auto it = contexts->begin(); it != contexts->end();) {
        if (ContainsTrackId(observed_track_ids, it->first)) {
            ++it;
            continue;
        }
        const bool expired = it->second.last_observed_ns > 0 &&
                             timestamp_ns >= it->second.last_observed_ns + retention_ns;
        if (expired) {
            it = contexts->erase(it);
        } else {
            ++it;
        }
    }
    last_cleanup_time_ns_ = timestamp_ns;
}

void SceneContextBuilder::EnforceChannelLimit(TrackContextMap* contexts,
                                             const std::vector<std::uint64_t>& observed_track_ids) {
    if (contexts == nullptr || contexts->size() <= options_.max_track_contexts_per_channel) {
        return;
    }
    for (auto it = contexts->begin(); it != contexts->end() &&
                                       contexts->size() > options_.max_track_contexts_per_channel;) {
        if (ContainsTrackId(observed_track_ids, it->first)) {
            ++it;
        } else {
            it = contexts->erase(it);
        }
    }
}

SceneGeometryConfig BuildSceneGeometryConfigFromRuleDocuments(const std::vector<std::string>& rule_documents,
                                                              const AnalysisContext& context) {
    SceneGeometryConfig config;
    for (const auto& document : rule_documents) {
        const std::string rule_id = ParseStringField(document, "id").value_or("");
        if (rule_id.empty() || !ParseBoolField(document, "enabled").value_or(true)) {
            continue;
        }
        if (!MatchesRuleContext(document, context)) {
            continue;
        }

        const auto event = ExtractObjectField(document, "event");
        if (!event.has_value()) {
            continue;
        }
        const auto region = ExtractObjectField(*event, "region");
        if (!region.has_value()) {
            continue;
        }
        const std::string region_type = ToLower(ParseStringField(*region, "type").value_or("polygon"));
        if (region_type == "polygon") {
            SceneZoneDefinition zone;
            zone.zone_id = rule_id;
            zone.restricted = true;
            zone.polygon = ParsePoints(*region);
            if (zone.polygon.size() >= 3) {
                config.zones.push_back(std::move(zone));
            }
        } else if (region_type == "line") {
            SceneLineDefinition line;
            line.line_id = rule_id;
            line.allowed_direction = ToLower(ParseStringField(*region, "direction").value_or("any"));
            line.points = ParsePoints(*region);
            if (line.points.size() >= 2) {
                config.lines.push_back(std::move(line));
            }
        }
    }
    return config;
}

SceneContextBuilderOptions BuildSceneContextBuilderOptionsFromConfig(const app::AppConfig& config) {
    SceneContextBuilderOptions options;
    options.max_track_contexts_per_channel =
        std::max<std::size_t>(1, config.analysis_max_active_tracks_per_stream * 2);
    options.retained_context_ms = config.analysis_scenario_retention_ms;
    options.cleanup_interval_ms = config.analysis_cleanup_interval_ms;
    return options;
}

}  // namespace analysis

// 파일 요약: TrackRuntimeState 기반 scene context 계산기를 구현한다.
// 동작 요약: 기존 rule 문서의 polygon/line region 형식을 읽어 zone/line context를 계산한다.
// 동작 요약: 기존 이벤트 판단 결과를 바꾸지 않고 context만 산출한다.
#include "analysis/scene_context_builder.h"

#include "core/analysis_runtime_port.h"

#include <algorithm>
#include <cctype>
#include <cmath>
#include <iostream>
#include <initializer_list>
#include <limits>
#include <optional>
#include <sstream>
#include <utility>

namespace analysis {

namespace {

constexpr float kLineEpsilon = 0.0005F;
constexpr double kHomographyEpsilon = 0.000000001;

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
            const std::string trimmed = Trim(current);
            if (!trimmed.empty()) {
                values.push_back(trimmed);
            }
            in_string = false;
            continue;
        }
        current.push_back(ch);
    }
    return values;
}

std::string FirstStringFromFields(const std::string& body,
                                  std::initializer_list<const char*> array_fields,
                                  std::initializer_list<const char*> string_fields) {
    for (const char* field : array_fields) {
        const auto values = ParseStringArrayField(body, field);
        if (!values.empty()) {
            return values.front();
        }
    }
    for (const char* field : string_fields) {
        const std::string value = Trim(ParseStringField(body, field).value_or(""));
        if (!value.empty()) {
            return value;
        }
    }
    return {};
}

std::string ScenarioZoneIdForDocument(const std::string& document, const std::string& fallback) {
    const auto scenario = ExtractScenarioObject(document);
    if (!scenario.has_value()) {
        return fallback;
    }
    const std::string zone_id = FirstStringFromFields(
        *scenario,
        {"restrictedZoneIds", "targetZoneIds", "targetZones", "zoneIds"},
        {"targetZone", "zoneId"});
    return zone_id.empty() ? fallback : zone_id;
}

std::string ScenarioLineIdForDocument(const std::string& document, const std::string& fallback) {
    const auto scenario = ExtractScenarioObject(document);
    if (!scenario.has_value()) {
        return fallback;
    }
    const std::string line_id = FirstStringFromFields(
        *scenario,
        {"targetLineIds", "targetLines", "lineIds"},
        {"targetLine", "lineId"});
    return line_id.empty() ? fallback : line_id;
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
    if (!context.va_rule_ids.empty()) {
        return std::find(context.va_rule_ids.begin(), context.va_rule_ids.end(), va_rule_id) !=
               context.va_rule_ids.end();
    }
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

std::vector<double> ParseNumberArrayBody(const std::string& array_body) {
    std::vector<double> values;
    bool in_string = false;
    bool escaped = false;
    std::size_t pos = 0;
    while (pos < array_body.size()) {
        const char ch = array_body[pos];
        if (escaped) {
            escaped = false;
            ++pos;
            continue;
        }
        if (ch == '\\' && in_string) {
            escaped = true;
            ++pos;
            continue;
        }
        if (ch == '"') {
            in_string = !in_string;
            ++pos;
            continue;
        }
        if (in_string ||
            (std::isdigit(static_cast<unsigned char>(ch)) == 0 && ch != '-' &&
             ch != '+' && ch != '.')) {
            ++pos;
            continue;
        }

        const std::size_t start = pos;
        while (pos < array_body.size() &&
               (std::isdigit(static_cast<unsigned char>(array_body[pos])) != 0 ||
                array_body[pos] == '-' || array_body[pos] == '+' ||
                array_body[pos] == '.' || array_body[pos] == 'e' ||
                array_body[pos] == 'E')) {
            ++pos;
        }
        try {
            values.push_back(std::stod(array_body.substr(start, pos - start)));
        } catch (...) {
        }
    }
    return values;
}

std::vector<double> ParseNumberArrayField(const std::string& body, const std::string& field) {
    const auto array = ExtractArrayField(body, field);
    return array.has_value() ? ParseNumberArrayBody(*array) : std::vector<double>{};
}

std::vector<double> ParseNumberListString(const std::string& value) {
    std::string array_like = value;
    std::replace(array_like.begin(), array_like.end(), ';', ',');
    std::replace(array_like.begin(), array_like.end(), ' ', ',');
    return ParseNumberArrayBody(array_like);
}

double HomographyDeterminant(const std::array<double, 9>& matrix) {
    return matrix[0] * (matrix[4] * matrix[8] - matrix[5] * matrix[7]) -
           matrix[1] * (matrix[3] * matrix[8] - matrix[5] * matrix[6]) +
           matrix[2] * (matrix[3] * matrix[7] - matrix[4] * matrix[6]);
}

std::optional<std::array<double, 9>> MatrixFromNumbers(const std::vector<double>& numbers,
                                                       const std::string& source_name) {
    if (numbers.empty()) {
        return std::nullopt;
    }
    if (numbers.size() != 9) {
        std::cerr << "[analysis][homography] invalid matrix from " << source_name
                  << ": expected 9 numbers, got " << numbers.size() << "\n";
        return std::nullopt;
    }
    std::array<double, 9> matrix{};
    for (std::size_t i = 0; i < matrix.size(); ++i) {
        if (!std::isfinite(numbers[i])) {
            std::cerr << "[analysis][homography] invalid matrix from " << source_name
                      << ": non-finite value at index " << i << "\n";
            return std::nullopt;
        }
        matrix[i] = numbers[i];
    }
    if (std::fabs(HomographyDeterminant(matrix)) <= kHomographyEpsilon) {
        std::cerr << "[analysis][homography] invalid matrix from " << source_name
                  << ": determinant is near zero\n";
        return std::nullopt;
    }
    return matrix;
}

std::optional<std::array<double, 9>> ParseMatrixFromHomographyObject(const std::string& body,
                                                                     const std::string& source_name) {
    for (const auto& field : {"imageToGround", "imageToGroundMatrix", "matrix", "homography"}) {
        auto matrix = MatrixFromNumbers(ParseNumberArrayField(body, field), source_name + "." + field);
        if (matrix.has_value()) {
            return matrix;
        }
    }
    return std::nullopt;
}

NormalizedPointF BBoxBottomCenter(const RectF& bbox) {
    return NormalizedPointF{
        std::max(0.0F, std::min(1.0F, bbox.x + bbox.width * 0.5F)),
        std::max(0.0F, std::min(1.0F, bbox.y + bbox.height)),
    };
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

std::optional<HomographyConfig> ParseHomographyObject(const std::string& body,
                                                      const std::string& source_name) {
    HomographyConfig homography;
    homography.calibration_id = ParseStringField(body, "id").value_or(
        ParseStringField(body, "calibrationId").value_or(source_name));
    homography.stream_id = ParseStringField(body, "streamId").value_or("");
    homography.channel_id = ParseStringField(body, "channelId").value_or("");
    homography.enabled = ParseBoolField(body, "enabled").value_or(true);
    homography.units = ParseStringField(body, "units").value_or("ground");
    if (!homography.enabled) {
        return std::nullopt;
    }
    auto matrix = ParseMatrixFromHomographyObject(body, source_name);
    if (!matrix.has_value()) {
        std::cerr << "[analysis][homography] enabled calibration has no valid matrix: "
                  << source_name << "\n";
        return std::nullopt;
    }
    homography.image_to_ground = *matrix;
    if (homography.units.empty()) {
        homography.units = "ground";
    }
    return homography;
}

void AppendHomographiesFromDocument(const std::string& document,
                                    const AnalysisContext& context,
                                    std::vector<HomographyConfig>* homographies) {
    if (homographies == nullptr || !MatchesRuleContext(document, context)) {
        return;
    }
    for (const auto& field : {"homography", "cameraCalibration"}) {
        const auto object = ExtractObjectField(document, field);
        if (!object.has_value()) {
            continue;
        }
        auto homography = ParseHomographyObject(*object, field);
        if (homography.has_value()) {
            homographies->push_back(std::move(*homography));
        }
    }
    for (const auto& field : {"homographies", "cameraCalibrations"}) {
        for (const auto& object : ExtractObjectArray(document, field)) {
            auto homography = ParseHomographyObject(object, field);
            if (homography.has_value()) {
                homographies->push_back(std::move(*homography));
            }
        }
    }
}

const HomographyConfig* FindHomographyForChannel(const std::string& stream_id,
                                                 const std::string& channel_id,
                                                 const std::vector<HomographyConfig>& homographies) {
    const HomographyConfig* wildcard = nullptr;
    for (const auto& homography : homographies) {
        if (!homography.enabled) {
            continue;
        }
        if (homography.stream_id.empty() && homography.channel_id.empty()) {
            if (wildcard == nullptr) {
                wildcard = &homography;
            }
            continue;
        }
        if (DefinitionMatchesChannel(stream_id,
                                     channel_id,
                                     homography.stream_id,
                                     homography.channel_id)) {
            return &homography;
        }
    }
    return wildcard;
}

SceneGroundPoint MakeImageFallbackGroundPoint(const NormalizedPointF& foot_point) {
    SceneGroundPoint point;
    point.x = foot_point.x;
    point.y = foot_point.y;
    point.valid = false;
    point.fallback_to_image = true;
    point.units = "image";
    return point;
}

SceneGroundPoint ProjectGroundPoint(const NormalizedPointF& foot_point,
                                    const HomographyConfig* homography) {
    if (homography == nullptr) {
        return MakeImageFallbackGroundPoint(foot_point);
    }
    const auto& h = homography->image_to_ground;
    const double x = foot_point.x;
    const double y = foot_point.y;
    const double denominator = h[6] * x + h[7] * y + h[8];
    if (!std::isfinite(denominator) || std::fabs(denominator) <= kHomographyEpsilon) {
        return MakeImageFallbackGroundPoint(foot_point);
    }
    const double ground_x = (h[0] * x + h[1] * y + h[2]) / denominator;
    const double ground_y = (h[3] * x + h[4] * y + h[5]) / denominator;
    if (!std::isfinite(ground_x) || !std::isfinite(ground_y)) {
        return MakeImageFallbackGroundPoint(foot_point);
    }
    SceneGroundPoint point;
    point.x = ground_x;
    point.y = ground_y;
    point.valid = true;
    point.fallback_to_image = false;
    point.units = homography->units.empty() ? "ground" : homography->units;
    return point;
}

SceneGroundPoint ToSceneGroundPoint(const GroundPointF& point) {
    SceneGroundPoint scene_point;
    scene_point.x = point.x;
    scene_point.y = point.y;
    scene_point.valid = point.valid;
    scene_point.fallback_to_image = point.fallback_to_image;
    scene_point.units = point.units.empty() ? std::string{"image"} : point.units;
    return scene_point;
}

GroundPointF ToGroundPointF(const SceneGroundPoint& point) {
    GroundPointF ground_point;
    ground_point.x = point.x;
    ground_point.y = point.y;
    ground_point.valid = point.valid;
    ground_point.fallback_to_image = point.fallback_to_image;
    ground_point.units = point.units.empty() ? std::string{"image"} : point.units;
    return ground_point;
}

NormalizedPointF TrajectoryProjectionPoint(const TrackTrajectoryPoint& point) {
    if (point.foot_point.x != 0.0F || point.foot_point.y != 0.0F) {
        return point.foot_point;
    }
    return point.center;
}

double GroundDistance(const GroundPointF& lhs, const GroundPointF& rhs) {
    const double dx = lhs.x - rhs.x;
    const double dy = lhs.y - rhs.y;
    return std::sqrt(dx * dx + dy * dy);
}

double ImageDistance(const NormalizedPointF& lhs, const NormalizedPointF& rhs) {
    const double dx = static_cast<double>(lhs.x - rhs.x);
    const double dy = static_cast<double>(lhs.y - rhs.y);
    return std::sqrt(dx * dx + dy * dy);
}

std::string GroundSpeedUnits(const GroundPointF& point) {
    return point.units.empty() ? std::string{"ground_per_second"} : point.units + "_per_second";
}

void PopulateTrajectoryGroundPoints(std::vector<TrackTrajectoryPoint>* trajectory,
                                    const HomographyConfig* homography) {
    if (trajectory == nullptr) {
        return;
    }
    for (auto& point : *trajectory) {
        if (point.ground_point.has_value()) {
            continue;
        }
        point.ground_point = ToGroundPointF(
            ProjectGroundPoint(TrajectoryProjectionPoint(point), homography));
    }
}

struct SpeedSummary {
    double value{0.0};
    bool uses_ground_plane{false};
    std::string units{"image_per_second"};
    bool available{false};
};

SpeedSummary CalculateTrajectorySpeed(const std::vector<TrackTrajectoryPoint>& trajectory,
                                      bool use_ground_plane) {
    SpeedSummary speed;
    if (trajectory.size() < 2) {
        return speed;
    }

    const auto& previous = trajectory[trajectory.size() - 2];
    const auto& current = trajectory[trajectory.size() - 1];
    if (current.timestamp_ns <= previous.timestamp_ns) {
        return speed;
    }
    const double elapsed_seconds =
        static_cast<double>(current.timestamp_ns - previous.timestamp_ns) / 1000000000.0;
    if (elapsed_seconds <= 0.0) {
        return speed;
    }

    if (use_ground_plane && previous.ground_point.has_value() &&
        current.ground_point.has_value() && previous.ground_point->valid &&
        current.ground_point->valid && !previous.ground_point->fallback_to_image &&
        !current.ground_point->fallback_to_image) {
        speed.value = GroundDistance(*previous.ground_point, *current.ground_point) / elapsed_seconds;
        speed.uses_ground_plane = true;
        speed.units = GroundSpeedUnits(*current.ground_point);
        speed.available = true;
        return speed;
    }

    speed.value = ImageDistance(previous.center, current.center) / elapsed_seconds;
    speed.uses_ground_plane = false;
    speed.units = "image_per_second";
    speed.available = true;
    return speed;
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
    static const std::vector<HomographyConfig> kNoHomographies;
    return BuildWithGeometry(stream_id,
                             channel_id,
                             track_states,
                             zones,
                             lines,
                             kNoHomographies,
                             timestamp_ns);
}

SceneContext SceneContextBuilder::BuildWithGeometry(const std::string& stream_id,
                                                    const std::string& channel_id,
                                                    const std::vector<TrackRuntimeState>& track_states,
                                                    const std::vector<SceneZoneDefinition>& zones,
                                                    const std::vector<SceneLineDefinition>& lines,
                                                    const std::vector<HomographyConfig>& homographies,
                                                    std::int64_t timestamp_ns) {
    const std::string resolved_channel_id = ResolveChannelId(stream_id, channel_id);
    auto& runtime_by_track = contexts_by_channel_[resolved_channel_id];
    const HomographyConfig* homography =
        FindHomographyForChannel(stream_id, resolved_channel_id, homographies);
    if (homography == nullptr) {
        homography = FindHomographyForChannel(stream_id, resolved_channel_id, options_.homographies);
    }

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
        track_context.foot_point =
            (track_state.latest_foot_point.x != 0.0F || track_state.latest_foot_point.y != 0.0F)
                ? track_state.latest_foot_point
                : BBoxBottomCenter(track_state.latest_bbox);
        const bool has_track_ground_point = track_state.latest_ground_point.has_value();
        track_context.ground_point = has_track_ground_point
                                         ? ToSceneGroundPoint(*track_state.latest_ground_point)
                                         : ProjectGroundPoint(track_context.foot_point, homography);
        if (!has_track_ground_point && homography != nullptr && !track_context.ground_point.valid) {
            LogHomographyFailureOnce(*homography,
                                     resolved_channel_id,
                                     "projected point is not finite or denominator is near zero");
        }
        track_context.speed = track_state.latest_speed;
        track_context.speed_uses_ground_plane = track_state.latest_speed_uses_ground_plane;
        track_context.speed_units = track_state.latest_speed_units;
        track_context.bbox = track_state.latest_bbox;
        track_context.trajectory.assign(track_state.trajectory.begin(), track_state.trajectory.end());
        PopulateTrajectoryGroundPoints(&track_context.trajectory, homography);
        const auto scene_speed =
            CalculateTrajectorySpeed(track_context.trajectory, options_.use_ground_plane_for_speed);
        if (scene_speed.available) {
            track_context.speed = scene_speed.value;
            track_context.speed_uses_ground_plane = scene_speed.uses_ground_plane;
            track_context.speed_units = scene_speed.units;
        }

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
            const bool raw_crossed = had_previous && std::fabs(previous_side) > kLineEpsilon &&
                                     std::fabs(current_side) > kLineEpsilon &&
                                     previous_side * current_side < 0.0F;
            const bool direction_allowed = !raw_crossed ||
                                           DirectionAllowed(line.allowed_direction, crossing_direction);
            const bool crossed = raw_crossed && direction_allowed;

            if (std::fabs(current_side) > kLineEpsilon) {
                runtime.previous_line_side[line.line_id] = current_side;
            }
            if (crossed) {
                runtime.last_cross_time_ns[line.line_id] = timestamp_ns;
            }

            LineCrossState line_state;
            line_state.line_id = line.line_id;
            line_state.allowed_direction = line.allowed_direction;
            line_state.previous_side = previous_side;
            line_state.current_side = current_side;
            line_state.crossed = crossed;
            line_state.direction = crossed ? crossing_direction : "none";
            line_state.raw_crossed = raw_crossed;
            line_state.raw_direction = raw_crossed ? crossing_direction : "none";
            line_state.direction_allowed = direction_allowed;
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
    return BuildWithGeometry(stream_id,
                             channel_id,
                             track_states,
                             geometry_config.zones,
                             geometry_config.lines,
                             geometry_config.homographies,
                             timestamp_ns);
}

void SceneContextBuilder::Reset() {
    contexts_by_channel_.clear();
    homography_failure_log_keys_.clear();
    last_cleanup_time_ns_ = 0;
}

std::string SceneContextBuilder::ResolveChannelId(const std::string& stream_id, const std::string& channel_id) {
    if (!channel_id.empty()) {
        return channel_id;
    }
    return stream_id.empty() ? std::string{"default"} : stream_id;
}

void SceneContextBuilder::LogHomographyFailureOnce(const HomographyConfig& homography,
                                                   const std::string& resolved_channel_id,
                                                   const std::string& reason) {
    const std::string key = resolved_channel_id + "|" + homography.calibration_id + "|" + reason;
    if (homography_failure_log_keys_.find(key) != homography_failure_log_keys_.end()) {
        return;
    }
    homography_failure_log_keys_[key] = true;
    std::cerr << "[analysis][homography] transform fallback channel=" << resolved_channel_id
              << " calibration=" << homography.calibration_id
              << " reason=" << reason << "\n";
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
        AppendHomographiesFromDocument(document, context, &config.homographies);
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
            zone.zone_id = ScenarioZoneIdForDocument(document, rule_id);
            zone.restricted = true;
            zone.polygon = ParsePoints(*region);
            if (zone.polygon.size() >= 3) {
                config.zones.push_back(std::move(zone));
            }
        } else if (region_type == "line") {
            SceneLineDefinition line;
            line.line_id = ScenarioLineIdForDocument(document, rule_id);
            line.allowed_direction = ToLower(ParseStringField(*region, "direction").value_or("any"));
            line.points = ParsePoints(*region);
            if (line.points.size() >= 2) {
                config.lines.push_back(std::move(line));
            }
        }

        if (const auto scenario = ExtractScenarioObject(document); scenario.has_value()) {
            if (const auto trigger_line = ExtractObjectField(*scenario, "triggerLine");
                trigger_line.has_value()) {
                SceneLineDefinition line;
                line.line_id = Trim(ParseStringField(*trigger_line, "id").value_or(""));
                if (line.line_id.empty()) {
                    line.line_id = ScenarioLineIdForDocument(document, rule_id);
                }
                line.allowed_direction =
                    ToLower(ParseStringField(*trigger_line, "direction").value_or("any"));
                if (line.allowed_direction != "forward" && line.allowed_direction != "reverse") {
                    line.allowed_direction = "any";
                }
                line.points = ParsePoints(*trigger_line);
                if (!line.line_id.empty() && line.points.size() >= 2) {
                    config.lines.push_back(std::move(line));
                }
            }
        }
    }
    return config;
}

SceneContextBuilderOptions BuildSceneContextBuilderOptionsFromConfig(const core::AnalysisRuntimeConfig& config) {
    SceneContextBuilderOptions options;
    options.max_track_contexts_per_channel =
        std::max<std::size_t>(1, config.analysis_max_active_tracks_per_stream * 2);
    options.retained_context_ms = config.analysis_scenario_retention_ms;
    options.cleanup_interval_ms = config.analysis_cleanup_interval_ms;
    options.use_ground_plane_for_speed = config.analysis_ground_plane_speed_enabled;
    options.use_ground_plane_for_movement_radius =
        config.analysis_ground_plane_movement_radius_enabled;
    if (config.analysis_homography_enabled) {
        HomographyConfig homography;
        homography.calibration_id = "env";
        homography.stream_id = config.analysis_homography_stream_id;
        homography.channel_id = config.analysis_homography_channel_id;
        homography.enabled = true;
        homography.units = config.analysis_homography_units.empty()
                               ? std::string{"ground"}
                               : config.analysis_homography_units;
        auto matrix = MatrixFromNumbers(ParseNumberListString(config.analysis_homography_matrix),
                                        "MEDIA_SERVER_ANALYSIS_HOMOGRAPHY_MATRIX");
        if (matrix.has_value()) {
            homography.image_to_ground = *matrix;
            options.homographies.push_back(std::move(homography));
        } else {
            std::cerr << "[analysis][homography] env homography ignored because matrix is invalid\n";
        }
    }
    return options;
}

}  // namespace analysis

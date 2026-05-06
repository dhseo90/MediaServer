// 파일 요약: 저장된 detection/tracking metadata를 media pipeline 없이 VA rule/scenario 계층에 replay한다.
// 동작 요약: JSON/CSV 입력을 frame별 AnalysisResult로 변환하고 TrackStateManager, SceneContextBuilder,
// RuleEventEngine, ScenarioEngine, EventManager를 호출한 뒤 발생 이벤트를 JSON으로 출력한다.
#include "analysis/appearance_extractor.h"
#include "analysis/event_rule_engine.h"
#include "analysis/event_storage.h"
#include "analysis/intrusion_after_line_crossing_scenario.h"
#include "analysis/intrusion_dwell_scenario.h"
#include "analysis/loitering_scenario.h"
#include "analysis/re_entry_scenario.h"
#include "analysis/scenario_engine.h"
#include "analysis/scene_context_builder.h"
#include "analysis/track_state_manager.h"
#include "analysis/tracked_object_metadata.h"
#include "analysis/wrong_direction_scenario.h"
#include "analysis/zone_occupancy_scenario.h"

#include "app_config.h"

#include <algorithm>
#include <cctype>
#include <cstdlib>
#include <cmath>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <map>
#include <optional>
#include <sstream>
#include <stdexcept>
#include <string>
#include <unordered_map>
#include <vector>

namespace {

using namespace analysis;

struct ReplayObject {
    std::string stream_id;
    std::string channel_id;
    std::uint64_t frame_id{0};
    std::int64_t timestamp_ns{0};
    std::int64_t timestamp_ms{0};
    std::uint64_t track_id{0};
    int class_id{-1};
    std::string class_name{"object"};
    float confidence{0.0F};
    RectF bbox;
    NormalizedPointF center;
    ObjectDirection direction;
};

struct ReplayFrame {
    std::string stream_id{"replay-stream"};
    std::string channel_id{"replay-stream"};
    std::uint64_t frame_id{0};
    std::int64_t timestamp_ns{0};
    std::int64_t timestamp_ms{0};
    std::vector<ReplayObject> objects;
};

struct ReplayEventRecord {
    std::string stream_id;
    std::string channel_id;
    std::uint64_t frame_id{0};
    std::int64_t timestamp_ms{0};
    AnalysisEvent event;
};

struct ReplayFrameSummary {
    std::string stream_id;
    std::string channel_id;
    std::uint64_t frame_id{0};
    std::int64_t timestamp_ms{0};
    std::size_t object_count{0};
    std::size_t active_rule_count{0};
    std::size_t matched_detection_count{0};
    std::size_t event_count{0};
    std::size_t direct_scenario_event_count{0};
    TrackStateMetrics track_state_metrics;
    ScenarioEngineMetrics scenario_metrics;
    EventManagerMetrics event_manager_metrics;
};

struct ExpectedEvent {
    std::optional<std::string> stream_id;
    std::optional<std::string> channel_id;
    std::optional<std::uint64_t> frame_id;
    std::optional<std::int64_t> timestamp_ms;
    std::optional<std::string> type;
    std::optional<std::string> rule_id;
    std::optional<std::string> zone_id;
    std::optional<std::string> line_id;
    std::optional<std::uint64_t> track_id;
    std::optional<int> class_id;
    std::optional<std::string> label;
};

struct ExpectedFrameSummary {
    std::optional<std::string> stream_id;
    std::optional<std::string> channel_id;
    std::optional<std::uint64_t> frame_id;
    std::optional<std::int64_t> timestamp_ms;
    std::optional<std::size_t> object_count;
    std::optional<std::size_t> event_count;
    std::optional<std::size_t> active_rule_count;
    std::optional<std::size_t> track_total;
    std::optional<std::size_t> track_active;
    std::optional<std::size_t> track_lost;
    std::optional<std::size_t> track_reacquired;
    std::optional<std::size_t> track_terminated;
    std::optional<std::size_t> track_cleanup_runs;
    std::optional<std::size_t> track_removed_by_cleanup;
    std::optional<std::size_t> scenario_instances;
    std::optional<std::size_t> scenario_active;
    std::optional<std::size_t> scenario_ended;
    std::optional<std::size_t> scenario_removed_by_cleanup;
    std::optional<std::size_t> event_manager_states;
    std::optional<std::size_t> event_manager_removed_by_cleanup;
};

struct ExpectedBaseline {
    std::int64_t timestamp_tolerance_ms{250};
    bool allow_extra_events{false};
    std::vector<ExpectedEvent> events;
    std::vector<ExpectedFrameSummary> frames;
};

struct ReplayOptions {
    std::string input_path;
    std::string input_format{"auto"};
    std::string rules_path;
    std::string expected_path;
    std::string output_path;
    std::string default_stream_id{"replay-stream"};
    std::string default_channel_id{"replay-stream"};
    std::int64_t timestamp_tolerance_ms{250};
    bool timestamp_tolerance_overridden{false};
    bool enable_intrusion_dwell{true};
    bool enable_re_entry{false};
    bool enable_wrong_direction{false};
    bool enable_intrusion_after_line_crossing{false};
    bool enable_loitering{false};
    bool enable_zone_occupancy{false};
    bool include_frames{true};
};

std::string Slurp(const std::string& path) {
    std::ifstream in(path);
    if (!in) {
        throw std::runtime_error("failed to open file: " + path);
    }
    std::ostringstream buffer;
    buffer << in.rdbuf();
    return buffer.str();
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

std::int64_t MsToNs(std::int64_t value_ms) {
    return std::max<std::int64_t>(0, value_ms) * 1000000LL;
}

std::int64_t ResolveTimestampNs(std::optional<double> timestamp_ns,
                                std::optional<double> timestamp_ms,
                                std::optional<double> timestamp) {
    if (timestamp_ns.has_value()) {
        return static_cast<std::int64_t>(*timestamp_ns);
    }
    if (timestamp_ms.has_value()) {
        return MsToNs(static_cast<std::int64_t>(*timestamp_ms));
    }
    if (timestamp.has_value()) {
        const double value = *timestamp;
        if (value > 1000000000000.0) {
            return static_cast<std::int64_t>(value);
        }
        return MsToNs(static_cast<std::int64_t>(value));
    }
    return 0;
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
    return std::stod(body.substr(start, pos - start));
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

std::vector<std::string> SplitTopLevelObjects(const std::string& array_body) {
    std::vector<std::string> objects;
    bool in_string = false;
    bool escaped = false;
    int depth = 0;
    std::size_t object_start = std::string::npos;
    for (std::size_t pos = 0; pos < array_body.size(); ++pos) {
        const char ch = array_body[pos];
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
                objects.push_back(array_body.substr(object_start, pos - object_start + 1));
                object_start = std::string::npos;
            }
        }
    }
    return objects;
}

std::vector<std::string> ExtractObjectArray(const std::string& body, const std::string& field) {
    const auto array = ExtractArrayField(body, field);
    return array.has_value() ? SplitTopLevelObjects(*array) : std::vector<std::string>{};
}

std::vector<std::string> ParseJsonDocumentArray(const std::string& content) {
    const std::string trimmed = Trim(content);
    if (trimmed.empty()) {
        return {};
    }
    if (trimmed.front() == '[') {
        return SplitTopLevelObjects(trimmed);
    }
    for (const auto& field : {"rules", "documents", "profiles"}) {
        const auto docs = ExtractObjectArray(trimmed, field);
        if (!docs.empty()) {
            return docs;
        }
    }
    std::vector<std::string> docs;
    std::istringstream input(content);
    std::string line;
    while (std::getline(input, line)) {
        line = Trim(line);
        if (!line.empty()) {
            docs.push_back(line);
        }
    }
    if (docs.empty() && trimmed.front() == '{') {
        docs.push_back(trimmed);
    }
    return docs;
}

float ParseFloatOr(const std::string& body, const std::string& field, float fallback) {
    const auto value = ParseNumberField(body, field);
    return value.has_value() ? static_cast<float>(*value) : fallback;
}

std::uint64_t ParseU64Or(const std::string& body, const std::string& field, std::uint64_t fallback) {
    const auto value = ParseNumberField(body, field);
    return value.has_value() ? static_cast<std::uint64_t>(std::max<double>(0.0, *value)) : fallback;
}

int ParseIntOr(const std::string& body, const std::string& field, int fallback) {
    const auto value = ParseNumberField(body, field);
    return value.has_value() ? static_cast<int>(*value) : fallback;
}

std::optional<std::int64_t> ParseI64Optional(const std::string& body, const std::string& field) {
    const auto value = ParseNumberField(body, field);
    if (!value.has_value()) {
        return std::nullopt;
    }
    return static_cast<std::int64_t>(*value);
}

std::optional<std::uint64_t> ParseU64Optional(const std::string& body, const std::string& field) {
    const auto value = ParseNumberField(body, field);
    if (!value.has_value()) {
        return std::nullopt;
    }
    return static_cast<std::uint64_t>(std::max<double>(0.0, *value));
}

std::optional<std::size_t> ParseSizeOptional(const std::string& body, const std::string& field) {
    const auto value = ParseNumberField(body, field);
    if (!value.has_value()) {
        return std::nullopt;
    }
    return static_cast<std::size_t>(std::max<double>(0.0, *value));
}

ReplayObject ParseReplayObjectJson(const std::string& body, const ReplayFrame& frame_defaults) {
    ReplayObject object;
    object.stream_id = ParseStringField(body, "streamId").value_or(frame_defaults.stream_id);
    object.channel_id = ParseStringField(body, "channelId").value_or(frame_defaults.channel_id);
    object.frame_id = ParseU64Or(body, "frameId", frame_defaults.frame_id);
    object.timestamp_ns = ResolveTimestampNs(ParseNumberField(body, "timestampNs"),
                                             ParseNumberField(body, "timestampMs"),
                                             ParseNumberField(body, "timestamp"));
    if (object.timestamp_ns <= 0) {
        object.timestamp_ns = frame_defaults.timestamp_ns;
    }
    object.timestamp_ms = object.timestamp_ns / 1000000LL;
    object.track_id = ParseU64Or(body, "trackId", 0);
    object.class_id = ParseIntOr(body, "classId", -1);
    object.class_name = ParseStringField(body, "className").value_or(
        ParseStringField(body, "class").value_or("object"));
    object.confidence = ParseFloatOr(body, "confidence", ParseFloatOr(body, "score", 0.0F));

    object.center.x = ParseFloatOr(body, "centerX", 0.5F);
    object.center.y = ParseFloatOr(body, "centerY", 0.5F);
    if (const auto center = ExtractObjectField(body, "center"); center.has_value()) {
        object.center.x = ParseFloatOr(*center, "x", object.center.x);
        object.center.y = ParseFloatOr(*center, "y", object.center.y);
    }

    object.bbox.x = ParseFloatOr(body, "bboxX", object.center.x - 0.05F);
    object.bbox.y = ParseFloatOr(body, "bboxY", object.center.y - 0.05F);
    object.bbox.width = ParseFloatOr(body, "bboxWidth", 0.1F);
    object.bbox.height = ParseFloatOr(body, "bboxHeight", 0.1F);
    if (const auto bbox = ExtractObjectField(body, "bbox"); bbox.has_value()) {
        object.bbox.x = ParseFloatOr(*bbox, "x", object.bbox.x);
        object.bbox.y = ParseFloatOr(*bbox, "y", object.bbox.y);
        object.bbox.width = ParseFloatOr(*bbox, "width", object.bbox.width);
        object.bbox.height = ParseFloatOr(*bbox, "height", object.bbox.height);
    }

    object.direction.label = ParseStringField(body, "direction").value_or("unknown");
    object.direction.dx = ParseFloatOr(body, "directionDx", 0.0F);
    object.direction.dy = ParseFloatOr(body, "directionDy", 0.0F);
    return object;
}

std::vector<ReplayFrame> ParseJsonReplayInput(const std::string& content,
                                              const ReplayOptions& options) {
    std::vector<ReplayFrame> frames;
    const auto frame_objects = ExtractObjectArray(content, "frames");
    if (!frame_objects.empty()) {
        for (const auto& frame_body : frame_objects) {
            ReplayFrame frame;
            frame.stream_id = ParseStringField(frame_body, "streamId").value_or(options.default_stream_id);
            frame.channel_id = ParseStringField(frame_body, "channelId").value_or(
                frame.stream_id.empty() ? options.default_channel_id : frame.stream_id);
            frame.frame_id = ParseU64Or(frame_body, "frameId", frames.size() + 1);
            frame.timestamp_ns = ResolveTimestampNs(ParseNumberField(frame_body, "timestampNs"),
                                                    ParseNumberField(frame_body, "timestampMs"),
                                                    ParseNumberField(frame_body, "timestamp"));
            if (frame.timestamp_ns <= 0) {
                frame.timestamp_ns = MsToNs(static_cast<std::int64_t>(frame.frame_id) * 100);
            }
            frame.timestamp_ms = frame.timestamp_ns / 1000000LL;
            for (const auto& object_body : ExtractObjectArray(frame_body, "objects")) {
                frame.objects.push_back(ParseReplayObjectJson(object_body, frame));
            }
            for (const auto& object_body : ExtractObjectArray(frame_body, "detections")) {
                frame.objects.push_back(ParseReplayObjectJson(object_body, frame));
            }
            frames.push_back(std::move(frame));
        }
        return frames;
    }

    std::vector<std::string> record_objects = ExtractObjectArray(content, "records");
    const std::string trimmed = Trim(content);
    if (record_objects.empty() && !trimmed.empty() && trimmed.front() == '[') {
        record_objects = SplitTopLevelObjects(trimmed);
    }
    std::map<std::string, ReplayFrame> grouped;
    for (const auto& object_body : record_objects) {
        ReplayFrame defaults;
        defaults.stream_id = ParseStringField(object_body, "streamId").value_or(options.default_stream_id);
        defaults.channel_id = ParseStringField(object_body, "channelId").value_or(defaults.stream_id);
        defaults.frame_id = ParseU64Or(object_body, "frameId", 0);
        defaults.timestamp_ns = ResolveTimestampNs(ParseNumberField(object_body, "timestampNs"),
                                                   ParseNumberField(object_body, "timestampMs"),
                                                   ParseNumberField(object_body, "timestamp"));
        defaults.timestamp_ms = defaults.timestamp_ns / 1000000LL;
        ReplayObject object = ParseReplayObjectJson(object_body, defaults);
        const std::string key = object.stream_id + "|" + object.channel_id + "|" +
                                std::to_string(object.frame_id) + "|" + std::to_string(object.timestamp_ns);
        ReplayFrame& frame = grouped[key];
        if (frame.objects.empty()) {
            frame.stream_id = object.stream_id;
            frame.channel_id = object.channel_id;
            frame.frame_id = object.frame_id;
            frame.timestamp_ns = object.timestamp_ns;
            frame.timestamp_ms = object.timestamp_ms;
        }
        frame.objects.push_back(std::move(object));
    }
    for (auto& [key, frame] : grouped) {
        (void)key;
        frames.push_back(std::move(frame));
    }
    return frames;
}

std::vector<std::string> ParseCsvLine(const std::string& line) {
    std::vector<std::string> columns;
    std::string current;
    bool in_quotes = false;
    for (std::size_t i = 0; i < line.size(); ++i) {
        const char ch = line[i];
        if (ch == '"') {
            if (in_quotes && i + 1 < line.size() && line[i + 1] == '"') {
                current.push_back('"');
                ++i;
            } else {
                in_quotes = !in_quotes;
            }
        } else if (ch == ',' && !in_quotes) {
            columns.push_back(current);
            current.clear();
        } else {
            current.push_back(ch);
        }
    }
    columns.push_back(current);
    return columns;
}

std::optional<std::string> CsvValue(const std::unordered_map<std::string, std::size_t>& index,
                                    const std::vector<std::string>& row,
                                    const std::string& name) {
    const auto it = index.find(ToLower(name));
    if (it == index.end() || it->second >= row.size()) {
        return std::nullopt;
    }
    return Trim(row[it->second]);
}

float CsvFloat(const std::unordered_map<std::string, std::size_t>& index,
               const std::vector<std::string>& row,
               const std::string& name,
               float fallback) {
    const auto value = CsvValue(index, row, name);
    if (!value.has_value() || value->empty()) {
        return fallback;
    }
    return std::stof(*value);
}

std::uint64_t CsvU64(const std::unordered_map<std::string, std::size_t>& index,
                     const std::vector<std::string>& row,
                     const std::string& name,
                     std::uint64_t fallback) {
    const auto value = CsvValue(index, row, name);
    if (!value.has_value() || value->empty()) {
        return fallback;
    }
    return static_cast<std::uint64_t>(std::stoull(*value));
}

int CsvInt(const std::unordered_map<std::string, std::size_t>& index,
           const std::vector<std::string>& row,
           const std::string& name,
           int fallback) {
    const auto value = CsvValue(index, row, name);
    if (!value.has_value() || value->empty()) {
        return fallback;
    }
    return std::stoi(*value);
}

std::vector<ReplayFrame> ParseCsvReplayInput(const std::string& content,
                                             const ReplayOptions& options) {
    std::istringstream input(content);
    std::string line;
    if (!std::getline(input, line)) {
        return {};
    }
    const auto headers = ParseCsvLine(line);
    std::unordered_map<std::string, std::size_t> index;
    for (std::size_t i = 0; i < headers.size(); ++i) {
        index[ToLower(Trim(headers[i]))] = i;
    }

    std::map<std::string, ReplayFrame> grouped;
    while (std::getline(input, line)) {
        if (Trim(line).empty()) {
            continue;
        }
        const auto row = ParseCsvLine(line);
        ReplayObject object;
        object.stream_id = CsvValue(index, row, "streamId").value_or(options.default_stream_id);
        object.channel_id = CsvValue(index, row, "channelId").value_or(object.stream_id);
        object.frame_id = CsvU64(index, row, "frameId", 0);
        const auto timestamp_ns_text = CsvValue(index, row, "timestampNs");
        const auto timestamp_ms_text = CsvValue(index, row, "timestampMs");
        const auto timestamp_text = CsvValue(index, row, "timestamp");
        object.timestamp_ns = ResolveTimestampNs(
            timestamp_ns_text.has_value() && !timestamp_ns_text->empty()
                ? std::optional<double>{std::stod(*timestamp_ns_text)}
                : std::nullopt,
            timestamp_ms_text.has_value() && !timestamp_ms_text->empty()
                ? std::optional<double>{std::stod(*timestamp_ms_text)}
                : std::nullopt,
            timestamp_text.has_value() && !timestamp_text->empty()
                ? std::optional<double>{std::stod(*timestamp_text)}
                : std::nullopt);
        object.timestamp_ms = object.timestamp_ns / 1000000LL;
        object.track_id = CsvU64(index, row, "trackId", 0);
        object.class_id = CsvInt(index, row, "classId", -1);
        object.class_name = CsvValue(index, row, "className").value_or(
            CsvValue(index, row, "class").value_or("object"));
        object.confidence = CsvFloat(index, row, "confidence", CsvFloat(index, row, "score", 0.0F));
        object.center.x = CsvFloat(index, row, "centerX", 0.5F);
        object.center.y = CsvFloat(index, row, "centerY", 0.5F);
        object.bbox.x = CsvFloat(index, row, "bboxX", object.center.x - 0.05F);
        object.bbox.y = CsvFloat(index, row, "bboxY", object.center.y - 0.05F);
        object.bbox.width = CsvFloat(index, row, "bboxWidth", 0.1F);
        object.bbox.height = CsvFloat(index, row, "bboxHeight", 0.1F);
        object.direction.label = CsvValue(index, row, "direction").value_or("unknown");
        object.direction.dx = CsvFloat(index, row, "directionDx", 0.0F);
        object.direction.dy = CsvFloat(index, row, "directionDy", 0.0F);

        const std::string key = object.stream_id + "|" + object.channel_id + "|" +
                                std::to_string(object.frame_id) + "|" + std::to_string(object.timestamp_ns);
        ReplayFrame& frame = grouped[key];
        if (frame.objects.empty()) {
            frame.stream_id = object.stream_id;
            frame.channel_id = object.channel_id;
            frame.frame_id = object.frame_id;
            frame.timestamp_ns = object.timestamp_ns;
            frame.timestamp_ms = object.timestamp_ms;
        }
        frame.objects.push_back(std::move(object));
    }

    std::vector<ReplayFrame> frames;
    for (auto& [key, frame] : grouped) {
        (void)key;
        frames.push_back(std::move(frame));
    }
    return frames;
}

std::vector<ReplayFrame> ParseReplayInput(const ReplayOptions& options) {
    const std::string content = Slurp(options.input_path);
    std::string format = ToLower(options.input_format);
    if (format == "auto") {
        const std::string trimmed = Trim(content);
        format = (!trimmed.empty() && (trimmed.front() == '{' || trimmed.front() == '[')) ? "json" : "csv";
    }
    if (format == "json") {
        return ParseJsonReplayInput(content, options);
    }
    if (format == "csv") {
        return ParseCsvReplayInput(content, options);
    }
    throw std::runtime_error("unsupported input format: " + options.input_format);
}

std::vector<std::string> DefaultRuleDocuments() {
    return {
        R"({"id":"intrusion-zone","enabled":true,"match":{"sourceKind":"*","route":"*"},"analysis":{"classes":["person"]},"event":{"type":"presence","minConfidence":0.1,"minDurationMs":0,"region":{"type":"polygon","points":[{"x":0.1,"y":0.1},{"x":0.5,"y":0.1},{"x":0.5,"y":0.5},{"x":0.1,"y":0.5}]}}})",
        R"({"id":"line-crossing","enabled":true,"match":{"sourceKind":"*","route":"*"},"analysis":{"classes":["person"]},"event":{"type":"line-crossing","minConfidence":0.1,"region":{"type":"line","direction":"any","points":[{"x":0.5,"y":0.0},{"x":0.5,"y":1.0}]}}})",
        R"({"id":"intrusion-dwell-zone","enabled":true,"match":{"sourceKind":"*","route":"*"},"ruleKind":"scenario","analysis":{"classes":["person"]},"event":{"type":"intrusion-dwell","minConfidence":0.1,"region":{"type":"polygon","points":[{"x":0.1,"y":0.1},{"x":0.5,"y":0.1},{"x":0.5,"y":0.5},{"x":0.1,"y":0.5}]}}})",
    };
}

std::vector<std::string> LoadRuleDocuments(const ReplayOptions& options) {
    if (options.rules_path.empty()) {
        return DefaultRuleDocuments();
    }
    return ParseJsonDocumentArray(Slurp(options.rules_path));
}

Track MakeTrackFromObject(const ReplayObject& object) {
    Track track;
    track.track_id = object.track_id;
    track.detection.class_id = object.class_id;
    track.detection.label = object.class_name;
    track.detection.score = object.confidence;
    track.detection.box = object.bbox;
    track.detection.track_id = object.track_id;
    track.age = 1;
    track.hits = 1;
    track.missed = 0;
    track.first_seen_pts = object.timestamp_ns;
    track.last_seen_pts = object.timestamp_ns;
    track.state = "tracked";

    float previous_x = object.center.x;
    float previous_y = object.center.y;
    if (object.direction.label == "right") {
        previous_x -= 0.02F;
    } else if (object.direction.label == "left") {
        previous_x += 0.02F;
    } else if (object.direction.label == "down") {
        previous_y -= 0.02F;
    } else if (object.direction.label == "up") {
        previous_y += 0.02F;
    } else {
        previous_x -= object.direction.dx;
        previous_y -= object.direction.dy;
    }
    track.trail.push_back(Track::TrailPoint{previous_x, previous_y, object.timestamp_ns - 1});
    track.trail.push_back(Track::TrailPoint{object.center.x, object.center.y, object.timestamp_ns});
    return track;
}

AnalysisResult BuildAnalysisResult(const ReplayFrame& frame) {
    AnalysisResult result;
    result.source_key = frame.stream_id == frame.channel_id ? frame.stream_id : frame.stream_id + "::" + frame.channel_id;
    result.frame_id = frame.frame_id;
    result.pts = frame.timestamp_ns;
    result.context.source_kind = "replay";
    result.context.route = "replay";
    result.context.client_id = "metadata-replay";
    result.detections.reserve(frame.objects.size());
    result.tracks.reserve(frame.objects.size());
    for (const auto& object : frame.objects) {
        Detection detection;
        detection.class_id = object.class_id;
        detection.label = object.class_name;
        detection.score = object.confidence;
        detection.box = object.bbox;
        detection.track_id = object.track_id;
        result.detections.push_back(detection);
        if (object.track_id > 0) {
            result.tracks.push_back(MakeTrackFromObject(object));
        }
    }
    return result;
}

std::vector<TrackedObjectMetadata> BuildTrackedMetadata(const ReplayFrame& frame) {
    std::vector<TrackedObjectMetadata> objects;
    objects.reserve(frame.objects.size());
    for (const auto& replay_object : frame.objects) {
        TrackedObjectMetadata object;
        object.stream_id = replay_object.stream_id;
        object.channel_id = replay_object.channel_id;
        object.frame_id = replay_object.frame_id;
        object.timestamp_ns = replay_object.timestamp_ns;
        object.timestamp_ms = replay_object.timestamp_ms;
        object.track_id = replay_object.track_id;
        object.class_id = replay_object.class_id;
        object.class_name = replay_object.class_name;
        object.confidence = replay_object.confidence;
        object.bbox = replay_object.bbox;
        object.center = replay_object.center;
        object.direction = replay_object.direction;
        object.track_state = "tracked";
        objects.push_back(std::move(object));
    }
    return objects;
}

void AppendAnalysisEventJson(std::ostringstream& out, const ReplayEventRecord& record) {
    const auto& event = record.event;
    out << "{"
        << "\"streamId\":\"" << JsonEscape(record.stream_id) << "\","
        << "\"channelId\":\"" << JsonEscape(record.channel_id) << "\","
        << "\"frameId\":" << record.frame_id << ","
        << "\"timestampMs\":" << record.timestamp_ms << ","
        << "\"ruleId\":\"" << JsonEscape(event.rule_id) << "\","
        << "\"type\":\"" << JsonEscape(event.event_type) << "\","
        << "\"object\":{"
        << "\"trackId\":" << event.track_id << ","
        << "\"classId\":" << event.class_id << ","
        << "\"label\":\"" << JsonEscape(event.label) << "\","
        << "\"score\":" << event.score << ","
        << "\"box\":{"
        << "\"x\":" << event.box.x << ","
        << "\"y\":" << event.box.y << ","
        << "\"width\":" << event.box.width << ","
        << "\"height\":" << event.box.height
        << "}},"
        << "\"action\":{"
        << "\"highlight\":{\"enabled\":" << (event.highlight_enabled ? "true" : "false")
        << ",\"mode\":\"blink\",\"color\":\"" << JsonEscape(event.highlight_color)
        << "\",\"durationMs\":" << event.highlight_duration_ms << "},"
        << "\"post\":{\"enabled\":" << (event.post_enabled ? "true" : "false")
        << ",\"method\":\"POST\",\"url\":\"" << JsonEscape(event.post_url)
        << "\",\"payloadFormat\":\"media-server.va.event.v1\"}"
        << "}"
        << "}";
}

void AppendFrameSummaryJson(std::ostringstream& out, const ReplayFrameSummary& summary) {
    out << "{"
        << "\"streamId\":\"" << JsonEscape(summary.stream_id) << "\","
        << "\"channelId\":\"" << JsonEscape(summary.channel_id) << "\","
        << "\"frameId\":" << summary.frame_id << ","
        << "\"timestampMs\":" << summary.timestamp_ms << ","
        << "\"objectCount\":" << summary.object_count << ","
        << "\"activeRuleCount\":" << summary.active_rule_count << ","
        << "\"matchedDetectionCount\":" << summary.matched_detection_count << ","
        << "\"eventCount\":" << summary.event_count << ","
        << "\"directScenarioEventCount\":" << summary.direct_scenario_event_count << ","
        << "\"trackState\":{"
        << "\"channels\":" << summary.track_state_metrics.channel_count << ","
        << "\"total\":" << summary.track_state_metrics.total_tracks << ","
        << "\"active\":" << summary.track_state_metrics.active_tracks << ","
        << "\"lost\":" << summary.track_state_metrics.lost_tracks << ","
        << "\"reacquired\":" << summary.track_state_metrics.reacquired_tracks << ","
        << "\"terminated\":" << summary.track_state_metrics.terminated_tracks << ","
        << "\"observations\":" << summary.track_state_metrics.total_observations << ","
        << "\"trajectoryPoints\":" << summary.track_state_metrics.total_trajectory_points << ","
        << "\"cleanupRuns\":" << summary.track_state_metrics.cleanup_runs << ","
        << "\"tracksRemovedByCleanup\":" << summary.track_state_metrics.tracks_removed_by_cleanup
        << "},"
        << "\"scenarioState\":{"
        << "\"instances\":" << summary.scenario_metrics.total_instances << ","
        << "\"active\":" << summary.scenario_metrics.active_instances << ","
        << "\"ended\":" << summary.scenario_metrics.ended_instances << ","
        << "\"cleanupRuns\":" << summary.scenario_metrics.cleanup_runs << ","
        << "\"instancesRemovedByCleanup\":" << summary.scenario_metrics.instances_removed_by_cleanup
        << "},"
        << "\"eventManager\":{"
        << "\"states\":" << summary.event_manager_metrics.total_states << ","
        << "\"active\":" << summary.event_manager_metrics.active_states << ","
        << "\"cooldown\":" << summary.event_manager_metrics.cooldown_states << ","
        << "\"ended\":" << summary.event_manager_metrics.ended_states << ","
        << "\"cleanupRuns\":" << summary.event_manager_metrics.cleanup_runs << ","
        << "\"statesRemovedByCleanup\":" << summary.event_manager_metrics.states_removed_by_cleanup
        << "}"
        << "}";
}

std::string RuleSuffix(const std::string& rule_id) {
    const std::size_t pos = rule_id.find(':');
    return pos == std::string::npos ? rule_id : rule_id.substr(pos + 1);
}

std::string EventZoneId(const ReplayEventRecord& record) {
    const std::string type = ToLower(record.event.event_type);
    if (!record.event.zone_id.empty()) {
        return record.event.zone_id;
    }
    if (type == "intrusion-dwell" || type == "re-entry") {
        return RuleSuffix(record.event.rule_id);
    }
    if (type == "presence" || type == "enter" || type == "exit") {
        return record.event.rule_id;
    }
    return {};
}

std::string EventLineId(const ReplayEventRecord& record) {
    const std::string type = ToLower(record.event.event_type);
    if (!record.event.line_id.empty()) {
        return record.event.line_id;
    }
    if (type == "line-crossing" || type == "wrong-direction") {
        return RuleSuffix(record.event.rule_id);
    }
    return {};
}

std::string DescribeActualEvent(const ReplayEventRecord& record) {
    std::ostringstream out;
    out << "type=" << record.event.event_type
        << " streamId=" << record.stream_id
        << " channelId=" << record.channel_id
        << " frameId=" << record.frame_id
        << " timestampMs=" << record.timestamp_ms
        << " trackId=" << record.event.track_id
        << " ruleId=" << record.event.rule_id;
    const std::string zone_id = EventZoneId(record);
    const std::string line_id = EventLineId(record);
    if (!zone_id.empty()) {
        out << " zoneId=" << zone_id;
    }
    if (!line_id.empty()) {
        out << " lineId=" << line_id;
    }
    return out.str();
}

std::string DescribeExpectedEvent(const ExpectedEvent& event) {
    std::ostringstream out;
    out << "expected";
    if (event.type.has_value()) {
        out << " type=" << *event.type;
    }
    if (event.stream_id.has_value()) {
        out << " streamId=" << *event.stream_id;
    }
    if (event.channel_id.has_value()) {
        out << " channelId=" << *event.channel_id;
    }
    if (event.frame_id.has_value()) {
        out << " frameId=" << *event.frame_id;
    }
    if (event.timestamp_ms.has_value()) {
        out << " timestampMs=" << *event.timestamp_ms;
    }
    if (event.track_id.has_value()) {
        out << " trackId=" << *event.track_id;
    }
    if (event.rule_id.has_value()) {
        out << " ruleId=" << *event.rule_id;
    }
    if (event.zone_id.has_value()) {
        out << " zoneId=" << *event.zone_id;
    }
    if (event.line_id.has_value()) {
        out << " lineId=" << *event.line_id;
    }
    return out.str();
}

std::vector<std::string> EventMismatchReasons(const ExpectedEvent& expected,
                                              const ReplayEventRecord& actual,
                                              std::int64_t timestamp_tolerance_ms) {
    std::vector<std::string> reasons;
    auto mismatch = [&](const std::string& label, const std::string& wanted, const std::string& got) {
        if (wanted != got) {
            reasons.push_back(label + " expected=" + wanted + " actual=" + got);
        }
    };
    if (expected.type.has_value()) {
        mismatch("type", *expected.type, actual.event.event_type);
    }
    if (expected.stream_id.has_value()) {
        mismatch("streamId", *expected.stream_id, actual.stream_id);
    }
    if (expected.channel_id.has_value()) {
        mismatch("channelId", *expected.channel_id, actual.channel_id);
    }
    if (expected.rule_id.has_value()) {
        mismatch("ruleId", *expected.rule_id, actual.event.rule_id);
    }
    if (expected.zone_id.has_value()) {
        mismatch("zoneId", *expected.zone_id, EventZoneId(actual));
    }
    if (expected.line_id.has_value()) {
        mismatch("lineId", *expected.line_id, EventLineId(actual));
    }
    if (expected.label.has_value()) {
        mismatch("label", *expected.label, actual.event.label);
    }
    if (expected.frame_id.has_value() && *expected.frame_id != actual.frame_id) {
        reasons.push_back("frameId expected=" + std::to_string(*expected.frame_id) +
                          " actual=" + std::to_string(actual.frame_id));
    }
    if (expected.track_id.has_value() && *expected.track_id != actual.event.track_id) {
        reasons.push_back("trackId expected=" + std::to_string(*expected.track_id) +
                          " actual=" + std::to_string(actual.event.track_id));
    }
    if (expected.class_id.has_value() && *expected.class_id != actual.event.class_id) {
        reasons.push_back("classId expected=" + std::to_string(*expected.class_id) +
                          " actual=" + std::to_string(actual.event.class_id));
    }
    if (expected.timestamp_ms.has_value()) {
        const auto delta = std::llabs(actual.timestamp_ms - *expected.timestamp_ms);
        if (delta > timestamp_tolerance_ms) {
            reasons.push_back("timestampMs expected=" + std::to_string(*expected.timestamp_ms) +
                              " actual=" + std::to_string(actual.timestamp_ms) +
                              " toleranceMs=" + std::to_string(timestamp_tolerance_ms));
        }
    }
    return reasons;
}

bool EventMatchesExpected(const ExpectedEvent& expected,
                          const ReplayEventRecord& actual,
                          std::int64_t timestamp_tolerance_ms) {
    return EventMismatchReasons(expected, actual, timestamp_tolerance_ms).empty();
}

ExpectedEvent ParseExpectedEvent(const std::string& body) {
    ExpectedEvent event;
    event.stream_id = ParseStringField(body, "streamId");
    event.channel_id = ParseStringField(body, "channelId");
    event.frame_id = ParseU64Optional(body, "frameId");
    event.timestamp_ms = ParseI64Optional(body, "timestampMs");
    if (!event.timestamp_ms.has_value()) {
        event.timestamp_ms = ParseI64Optional(body, "timestamp");
    }
    event.type = ParseStringField(body, "type");
    event.rule_id = ParseStringField(body, "ruleId");
    event.zone_id = ParseStringField(body, "zoneId");
    event.line_id = ParseStringField(body, "lineId");
    event.track_id = ParseU64Optional(body, "trackId");
    event.class_id = ParseIntOr(body, "classId", -1) >= 0
                         ? std::optional<int>{ParseIntOr(body, "classId", -1)}
                         : std::nullopt;
    event.label = ParseStringField(body, "label");
    if (const auto object = ExtractObjectField(body, "object"); object.has_value()) {
        if (!event.track_id.has_value()) {
            event.track_id = ParseU64Optional(*object, "trackId");
        }
        if (!event.class_id.has_value()) {
            const int class_id = ParseIntOr(*object, "classId", -1);
            if (class_id >= 0) {
                event.class_id = class_id;
            }
        }
        if (!event.label.has_value()) {
            event.label = ParseStringField(*object, "label");
        }
    }
    return event;
}

ExpectedFrameSummary ParseExpectedFrameSummary(const std::string& body) {
    ExpectedFrameSummary frame;
    frame.stream_id = ParseStringField(body, "streamId");
    frame.channel_id = ParseStringField(body, "channelId");
    frame.frame_id = ParseU64Optional(body, "frameId");
    frame.timestamp_ms = ParseI64Optional(body, "timestampMs");
    frame.object_count = ParseSizeOptional(body, "objectCount");
    frame.event_count = ParseSizeOptional(body, "eventCount");
    frame.active_rule_count = ParseSizeOptional(body, "activeRuleCount");

    if (const auto track_state = ExtractObjectField(body, "trackState"); track_state.has_value()) {
        frame.track_total = ParseSizeOptional(*track_state, "total");
        frame.track_active = ParseSizeOptional(*track_state, "active");
        frame.track_lost = ParseSizeOptional(*track_state, "lost");
        frame.track_reacquired = ParseSizeOptional(*track_state, "reacquired");
        frame.track_terminated = ParseSizeOptional(*track_state, "terminated");
        frame.track_cleanup_runs = ParseSizeOptional(*track_state, "cleanupRuns");
        frame.track_removed_by_cleanup = ParseSizeOptional(*track_state, "tracksRemovedByCleanup");
    }
    if (const auto scenario_state = ExtractObjectField(body, "scenarioState"); scenario_state.has_value()) {
        frame.scenario_instances = ParseSizeOptional(*scenario_state, "instances");
        frame.scenario_active = ParseSizeOptional(*scenario_state, "active");
        frame.scenario_ended = ParseSizeOptional(*scenario_state, "ended");
        frame.scenario_removed_by_cleanup =
            ParseSizeOptional(*scenario_state, "instancesRemovedByCleanup");
    }
    if (const auto event_manager = ExtractObjectField(body, "eventManager"); event_manager.has_value()) {
        frame.event_manager_states = ParseSizeOptional(*event_manager, "states");
        frame.event_manager_removed_by_cleanup =
            ParseSizeOptional(*event_manager, "statesRemovedByCleanup");
    }
    return frame;
}

ExpectedBaseline ParseExpectedBaseline(const std::string& content,
                                       std::int64_t default_tolerance_ms,
                                       bool tolerance_overridden) {
    ExpectedBaseline baseline;
    baseline.timestamp_tolerance_ms = std::max<std::int64_t>(0, default_tolerance_ms);
    if (!tolerance_overridden) {
        baseline.timestamp_tolerance_ms = std::max<std::int64_t>(
            0, ParseI64Optional(content, "timestampToleranceMs").value_or(baseline.timestamp_tolerance_ms));
    }
    baseline.allow_extra_events = ParseBoolField(content, "allowExtraEvents").value_or(false);
    for (const auto& body : ExtractObjectArray(content, "events")) {
        baseline.events.push_back(ParseExpectedEvent(body));
    }
    for (const auto& body : ExtractObjectArray(content, "frames")) {
        baseline.frames.push_back(ParseExpectedFrameSummary(body));
    }
    return baseline;
}

void CompareOptionalSize(std::vector<std::string>* failures,
                         const std::string& label,
                         const std::optional<std::size_t>& expected,
                         std::size_t actual) {
    if (failures == nullptr || !expected.has_value() || *expected == actual) {
        return;
    }
    failures->push_back(label + " expected=" + std::to_string(*expected) +
                        " actual=" + std::to_string(actual));
}

bool FrameIdentityMatches(const ExpectedFrameSummary& expected,
                          const ReplayFrameSummary& actual,
                          std::int64_t timestamp_tolerance_ms) {
    if (expected.stream_id.has_value() && *expected.stream_id != actual.stream_id) {
        return false;
    }
    if (expected.channel_id.has_value() && *expected.channel_id != actual.channel_id) {
        return false;
    }
    if (expected.frame_id.has_value() && *expected.frame_id != actual.frame_id) {
        return false;
    }
    if (expected.timestamp_ms.has_value() &&
        std::llabs(actual.timestamp_ms - *expected.timestamp_ms) > timestamp_tolerance_ms) {
        return false;
    }
    return true;
}

std::vector<std::string> FrameMismatchReasons(const ExpectedFrameSummary& expected,
                                              const ReplayFrameSummary& actual) {
    std::vector<std::string> failures;
    CompareOptionalSize(&failures, "objectCount", expected.object_count, actual.object_count);
    CompareOptionalSize(&failures, "eventCount", expected.event_count, actual.event_count);
    CompareOptionalSize(&failures, "activeRuleCount", expected.active_rule_count, actual.active_rule_count);
    CompareOptionalSize(&failures, "trackState.total", expected.track_total,
                        actual.track_state_metrics.total_tracks);
    CompareOptionalSize(&failures, "trackState.active", expected.track_active,
                        actual.track_state_metrics.active_tracks);
    CompareOptionalSize(&failures, "trackState.lost", expected.track_lost,
                        actual.track_state_metrics.lost_tracks);
    CompareOptionalSize(&failures, "trackState.reacquired", expected.track_reacquired,
                        actual.track_state_metrics.reacquired_tracks);
    CompareOptionalSize(&failures, "trackState.terminated", expected.track_terminated,
                        actual.track_state_metrics.terminated_tracks);
    CompareOptionalSize(&failures, "trackState.cleanupRuns", expected.track_cleanup_runs,
                        actual.track_state_metrics.cleanup_runs);
    CompareOptionalSize(&failures, "trackState.tracksRemovedByCleanup",
                        expected.track_removed_by_cleanup,
                        actual.track_state_metrics.tracks_removed_by_cleanup);
    CompareOptionalSize(&failures, "scenarioState.instances", expected.scenario_instances,
                        actual.scenario_metrics.total_instances);
    CompareOptionalSize(&failures, "scenarioState.active", expected.scenario_active,
                        actual.scenario_metrics.active_instances);
    CompareOptionalSize(&failures, "scenarioState.ended", expected.scenario_ended,
                        actual.scenario_metrics.ended_instances);
    CompareOptionalSize(&failures, "scenarioState.instancesRemovedByCleanup",
                        expected.scenario_removed_by_cleanup,
                        actual.scenario_metrics.instances_removed_by_cleanup);
    CompareOptionalSize(&failures, "eventManager.states", expected.event_manager_states,
                        actual.event_manager_metrics.total_states);
    CompareOptionalSize(&failures, "eventManager.statesRemovedByCleanup",
                        expected.event_manager_removed_by_cleanup,
                        actual.event_manager_metrics.states_removed_by_cleanup);
    return failures;
}

void CompareReplayToExpected(const ExpectedBaseline& expected,
                             const std::vector<ReplayEventRecord>& events,
                             const std::vector<ReplayFrameSummary>& summaries) {
    std::vector<std::string> failures;
    std::vector<bool> matched(events.size(), false);

    for (std::size_t i = 0; i < expected.events.size(); ++i) {
        const auto& expected_event = expected.events[i];
        std::optional<std::size_t> matched_index;
        for (std::size_t j = 0; j < events.size(); ++j) {
            if (!matched[j] &&
                EventMatchesExpected(expected_event, events[j], expected.timestamp_tolerance_ms)) {
                matched_index = j;
                break;
            }
        }
        if (matched_index.has_value()) {
            matched[*matched_index] = true;
            continue;
        }

        std::string detail = "missing expected event #" + std::to_string(i + 1) +
                             ": " + DescribeExpectedEvent(expected_event);
        for (const auto& actual : events) {
            if (expected_event.type.has_value() && *expected_event.type != actual.event.event_type) {
                continue;
            }
            const auto reasons =
                EventMismatchReasons(expected_event, actual, expected.timestamp_tolerance_ms);
            if (!reasons.empty()) {
                detail += "; closest actual " + DescribeActualEvent(actual) + " mismatch:";
                for (const auto& reason : reasons) {
                    detail += " " + reason + ";";
                }
                break;
            }
        }
        failures.push_back(detail);
    }

    if (!expected.allow_extra_events) {
        for (std::size_t i = 0; i < events.size(); ++i) {
            if (!matched[i]) {
                failures.push_back("extra actual event #" + std::to_string(i + 1) +
                                   ": " + DescribeActualEvent(events[i]));
            }
        }
    }

    for (std::size_t i = 0; i < expected.frames.size(); ++i) {
        const auto& expected_frame = expected.frames[i];
        const ReplayFrameSummary* matched_summary = nullptr;
        for (const auto& summary : summaries) {
            if (FrameIdentityMatches(expected_frame, summary, expected.timestamp_tolerance_ms)) {
                matched_summary = &summary;
                break;
            }
        }
        if (matched_summary == nullptr) {
            failures.push_back("missing expected frame summary #" + std::to_string(i + 1));
            continue;
        }
        const auto frame_failures = FrameMismatchReasons(expected_frame, *matched_summary);
        for (const auto& failure : frame_failures) {
            failures.push_back("frame summary #" + std::to_string(i + 1) + " " + failure);
        }
    }

    if (!failures.empty()) {
        std::ostringstream out;
        out << "baseline comparison failed";
        for (const auto& failure : failures) {
            out << "\n - " << failure;
        }
        throw std::runtime_error(out.str());
    }

    std::cerr << "[replay][compare] pass expectedEvents=" << expected.events.size()
              << " actualEvents=" << events.size()
              << " expectedFrames=" << expected.frames.size()
              << " toleranceMs=" << expected.timestamp_tolerance_ms << "\n";
}

std::string ReplayToJson(const ReplayOptions& options,
                         const std::vector<ReplayFrame>& frames,
                         const std::vector<std::string>& rule_documents) {
    TrackStateManagerOptions track_options = BuildTrackStateManagerOptionsFromConfig(app::GetAppConfig());
    track_options.tracking_issue_log_enabled = false;
    TrackStateManager track_state_manager(track_options, std::make_shared<NoOpAppearanceExtractor>());
    SceneContextBuilder scene_context_builder(BuildSceneContextBuilderOptionsFromConfig(app::GetAppConfig()));
    ScenarioEngineOptions scenario_options;
    scenario_options.enabled = options.enable_intrusion_dwell ||
                               options.enable_re_entry ||
                               options.enable_wrong_direction ||
                               options.enable_intrusion_after_line_crossing ||
                               options.enable_loitering ||
                               options.enable_zone_occupancy;
    scenario_options.default_cooldown_ms = app_config::kDefaultAnalysisScenarioCooldownMs;
    scenario_options.default_update_interval_ms = app_config::kDefaultAnalysisScenarioUpdateIntervalMs;
    scenario_options.ended_retention_ms = app_config::kDefaultAnalysisScenarioRetentionMs;
    scenario_options.cleanup_interval_ms = app_config::kDefaultAnalysisCleanupIntervalMs;
    ScenarioEngine scenario_engine(scenario_options);
    IntrusionDwellScenarioOptions dwell_options;
    dwell_options.enabled = options.enable_intrusion_dwell;
    scenario_engine.RegisterScenario(std::make_unique<IntrusionDwellScenario>(dwell_options));
    if (options.enable_re_entry) {
        ReEntryScenarioOptions re_entry_options;
        re_entry_options.enabled = true;
        scenario_engine.RegisterScenario(std::make_unique<ReEntryScenario>(re_entry_options));
    }
    if (options.enable_wrong_direction) {
        WrongDirectionScenarioOptions wrong_direction_options;
        wrong_direction_options.enabled = true;
        scenario_engine.RegisterScenario(
            std::make_unique<WrongDirectionScenario>(wrong_direction_options));
    }
    if (options.enable_intrusion_after_line_crossing) {
        IntrusionAfterLineCrossingScenarioOptions intrusion_after_line_options =
            BuildIntrusionAfterLineCrossingScenarioOptionsFromConfig(app::GetAppConfig());
        intrusion_after_line_options.enabled = true;
        scenario_engine.RegisterScenario(
            std::make_unique<IntrusionAfterLineCrossingScenario>(intrusion_after_line_options));
    }
    if (options.enable_loitering) {
        LoiteringScenarioOptions loitering_options =
            BuildLoiteringScenarioOptionsFromConfig(app::GetAppConfig());
        loitering_options.enabled = true;
        scenario_engine.RegisterScenario(std::make_unique<LoiteringScenario>(loitering_options));
    }
    if (options.enable_zone_occupancy) {
        ZoneOccupancyScenarioOptions zone_occupancy_options =
            BuildZoneOccupancyScenarioOptionsFromConfig(app::GetAppConfig());
        zone_occupancy_options.enabled = true;
        scenario_engine.RegisterScenario(
            std::make_unique<ZoneOccupancyScenario>(zone_occupancy_options));
    }
    EventManager event_manager;
    const auto rule_runtime = CreateEventRuleRuntime();

    std::vector<ReplayEventRecord> events;
    std::vector<ReplayFrameSummary> summaries;
    events.reserve(frames.size());
    summaries.reserve(frames.size());

    for (const auto& frame : frames) {
        const auto metadata = BuildTrackedMetadata(frame);
        track_state_manager.Update(frame.stream_id, frame.channel_id, metadata, frame.timestamp_ns);
        const auto track_states = track_state_manager.Snapshot(frame.channel_id);
        AnalysisContext context;
        context.source_kind = "replay";
        context.route = "replay";
        const SceneGeometryConfig geometry = BuildSceneGeometryConfigFromRuleDocuments(rule_documents, context);
        const SceneContext scene_context =
            scene_context_builder.Build(frame.stream_id, frame.channel_id, track_states, geometry, frame.timestamp_ns);
        const auto direct_scenario_events = scenario_engine.Evaluate(scene_context, &event_manager);

        const AnalysisResult result = BuildAnalysisResult(frame);
        const EventRuleEvaluation evaluation =
            ApplyEventRulesToResult(result, rule_documents, rule_runtime);
        DispatchEventRecords(evaluation.annotated_result, evaluation.events);
        for (const auto& event : evaluation.events) {
            ReplayEventRecord record;
            record.stream_id = frame.stream_id;
            record.channel_id = frame.channel_id;
            record.frame_id = frame.frame_id;
            record.timestamp_ms = frame.timestamp_ms;
            record.event = event;
            events.push_back(std::move(record));
        }

        ReplayFrameSummary summary;
        summary.stream_id = frame.stream_id;
        summary.channel_id = frame.channel_id;
        summary.frame_id = frame.frame_id;
        summary.timestamp_ms = frame.timestamp_ms;
        summary.object_count = frame.objects.size();
        summary.active_rule_count = evaluation.active_rule_count;
        summary.matched_detection_count = evaluation.matched_detection_count;
        summary.event_count = evaluation.events.size();
        summary.direct_scenario_event_count = direct_scenario_events.size();
        summary.track_state_metrics = track_state_manager.Metrics();
        summary.scenario_metrics = scenario_engine.Metrics();
        summary.event_manager_metrics = event_manager.Metrics();
        summaries.push_back(summary);
    }

    if (!options.expected_path.empty()) {
        const auto expected = ParseExpectedBaseline(Slurp(options.expected_path),
                                                    options.timestamp_tolerance_ms,
                                                    options.timestamp_tolerance_overridden);
        CompareReplayToExpected(expected, events, summaries);
    }

    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.va.metadata-replay.v1\","
        << "\"input\":\"" << JsonEscape(options.input_path) << "\","
        << "\"ruleDocumentCount\":" << rule_documents.size() << ","
        << "\"frameCount\":" << frames.size() << ","
        << "\"eventCount\":" << events.size() << ","
        << "\"events\":[";
    for (std::size_t i = 0; i < events.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendAnalysisEventJson(out, events[i]);
    }
    out << "]";
    if (options.include_frames) {
        out << ",\"frames\":[";
        for (std::size_t i = 0; i < summaries.size(); ++i) {
            if (i != 0) {
                out << ",";
            }
            AppendFrameSummaryJson(out, summaries[i]);
        }
        out << "]";
    }
    out << ",\"trackingIssueReport\":"
        << TrackingIssueReportToJson(track_state_manager.TrackingIssueSnapshot());
    out << "}\n";
    return out.str();
}

void PrintUsage() {
    std::cout << "Usage: va_metadata_replay --input <metadata.json|metadata.csv> [options]\n"
              << "\nOptions:\n"
              << "  --format <auto|json|csv>       input format. default auto\n"
              << "  --rules <rules.json|ndjson>    rule documents. default built-in intrusion/line/dwell rules\n"
              << "  --expect <expected.json>       compare emitted events/frame summaries with baseline\n"
              << "  --timestamp-tolerance-ms <ms>  event/frame timestamp tolerance. default 250\n"
              << "  --output <path>                write JSON result to file instead of stdout\n"
              << "  --stream-id <id>               default streamId for records without streamId\n"
              << "  --channel-id <id>              default channelId for records without channelId\n"
              << "  --no-intrusion-dwell           do not register IntrusionDwellScenario\n"
              << "  --enable-re-entry              register ReEntryScenario for direct scenario metrics\n"
              << "  --enable-wrong-direction       register WrongDirectionScenario for direct scenario metrics\n"
              << "  --enable-intrusion-after-line-crossing\n"
              << "                                  register IntrusionAfterLineCrossingScenario for direct scenario metrics\n"
              << "  --enable-loitering             register LoiteringScenario for direct scenario metrics\n"
              << "  --enable-zone-occupancy        register ZoneOccupancyScenario for direct scenario metrics\n"
              << "  --no-frames                    omit per-frame state summaries\n";
}

ReplayOptions ParseArgs(int argc, char** argv) {
    ReplayOptions options;
    for (int i = 1; i < argc; ++i) {
        const std::string arg = argv[i];
        auto require_value = [&](const std::string& name) -> std::string {
            if (i + 1 >= argc) {
                throw std::runtime_error("missing value for " + name);
            }
            return argv[++i];
        };
        if (arg == "--input") {
            options.input_path = require_value(arg);
        } else if (arg == "--format") {
            options.input_format = require_value(arg);
        } else if (arg == "--rules") {
            options.rules_path = require_value(arg);
        } else if (arg == "--expect") {
            options.expected_path = require_value(arg);
        } else if (arg == "--timestamp-tolerance-ms") {
            options.timestamp_tolerance_ms =
                std::max<std::int64_t>(0, std::stoll(require_value(arg)));
            options.timestamp_tolerance_overridden = true;
        } else if (arg == "--output") {
            options.output_path = require_value(arg);
        } else if (arg == "--stream-id") {
            options.default_stream_id = require_value(arg);
        } else if (arg == "--channel-id") {
            options.default_channel_id = require_value(arg);
        } else if (arg == "--no-intrusion-dwell") {
            options.enable_intrusion_dwell = false;
        } else if (arg == "--enable-re-entry") {
            options.enable_re_entry = true;
        } else if (arg == "--enable-wrong-direction") {
            options.enable_wrong_direction = true;
        } else if (arg == "--enable-intrusion-after-line-crossing") {
            options.enable_intrusion_after_line_crossing = true;
        } else if (arg == "--enable-loitering") {
            options.enable_loitering = true;
        } else if (arg == "--enable-zone-occupancy") {
            options.enable_zone_occupancy = true;
        } else if (arg == "--no-frames") {
            options.include_frames = false;
        } else if (arg == "-h" || arg == "--help") {
            PrintUsage();
            std::exit(EXIT_SUCCESS);
        } else {
            throw std::runtime_error("unknown argument: " + arg);
        }
    }
    if (options.input_path.empty()) {
        throw std::runtime_error("--input is required");
    }
    return options;
}

}  // namespace

int main(int argc, char** argv) {
    try {
        ReplayOptions options = ParseArgs(argc, argv);
        if (options.enable_intrusion_dwell) {
            setenv("MEDIA_SERVER_ANALYSIS_SCENARIO_ENABLED", "1", 0);
            setenv("MEDIA_SERVER_ANALYSIS_INTRUSION_DWELL_ENABLED", "1", 0);
        }
        if (options.enable_intrusion_after_line_crossing) {
            setenv("MEDIA_SERVER_ANALYSIS_SCENARIO_ENABLED", "1", 0);
            setenv("MEDIA_SERVER_ANALYSIS_INTRUSION_AFTER_LINE_CROSSING_ENABLED", "1", 0);
        }
        if (options.enable_loitering) {
            setenv("MEDIA_SERVER_ANALYSIS_SCENARIO_ENABLED", "1", 0);
            setenv("MEDIA_SERVER_ANALYSIS_LOITERING_ENABLED", "1", 0);
        }
        if (options.enable_zone_occupancy) {
            setenv("MEDIA_SERVER_ANALYSIS_SCENARIO_ENABLED", "1", 0);
            setenv("MEDIA_SERVER_ANALYSIS_ZONE_OCCUPANCY_ENABLED", "1", 0);
        }
        setenv("MEDIA_SERVER_ANALYSIS_TRACKING_ISSUE_LOG_ENABLED", "0", 0);
        const auto frames = ParseReplayInput(options);
        if (frames.empty()) {
            throw std::runtime_error("metadata replay input has no frames");
        }
        const auto rule_documents = LoadRuleDocuments(options);
        const std::string output = ReplayToJson(options, frames, rule_documents);
        if (options.output_path.empty()) {
            std::cout << output;
        } else {
            std::ofstream out(options.output_path);
            if (!out) {
                throw std::runtime_error("failed to open output: " + options.output_path);
            }
            out << output;
        }
        StopEventStorage();
        return EXIT_SUCCESS;
    } catch (const std::exception& ex) {
        StopEventStorage();
        std::cerr << "[replay][fail] " << ex.what() << "\n";
        return EXIT_FAILURE;
    }
}

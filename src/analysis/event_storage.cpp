// 파일 요약: VA EventRecord 파일 저장소와 비동기 저장 dispatcher를 구현한다.
// 동작 요약: media pipeline을 막지 않도록 bounded queue에 넣고 worker가 JSON Lines로 append한다.
// 동작 요약: 저장 실패는 counter와 로그에 남기고 서버 실행은 계속 유지한다.
#include "analysis/event_storage.h"

#include "analysis/snapshot_encoder.h"
#include "app_config.h"

#if MEDIA_SERVER_USE_GSTREAMER
#include <gst/app/gstappsink.h>
#include <gst/app/gstappsrc.h>
#include <gst/gst.h>
#endif

#include <algorithm>
#include <cctype>
#include <chrono>
#include <cmath>
#include <condition_variable>
#include <deque>
#include <filesystem>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <limits>
#include <mutex>
#include <optional>
#include <sstream>
#include <thread>
#include <utility>
#include <unordered_map>

namespace analysis {

namespace {

constexpr std::size_t kMaxEventRecordLineBytes = 1024 * 1024;

enum class BoundedLineStatus {
    kLine,
    kEnd,
    kTooLong,
    kReadError,
};

struct BoundedLineRead {
    BoundedLineStatus status{BoundedLineStatus::kEnd};
    bool had_newline{false};
};

std::string JsonEscape(const std::string& value) {
    std::string out;
    out.reserve(value.size() + 8);
    for (const char ch : value) {
        switch (ch) {
            case '\\':
                out += "\\\\";
                break;
            case '"':
                out += "\\\"";
                break;
            case '\n':
                out += "\\n";
                break;
            case '\r':
                out += "\\r";
                break;
            case '\t':
                out += "\\t";
                break;
            default:
                out.push_back(ch);
                break;
        }
    }
    return out;
}

std::uint64_t NowMs() {
    return static_cast<std::uint64_t>(
        std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::system_clock::now().time_since_epoch())
            .count());
}

std::uint64_t NextSequence() {
    static std::mutex mu;
    static std::uint64_t sequence = 0;
    std::lock_guard lock(mu);
    return ++sequence;
}

std::string ResolveChannelId(const AnalysisResult& result) {
    if (!result.source_key.empty()) {
        return result.source_key;
    }
    if (!result.context.client_id.empty()) {
        return result.context.client_id;
    }
    return "default";
}

std::string BuildMetadataJson(const AnalysisResult& result, const AnalysisEvent& event) {
    if (!event.metadata_json.empty() && event.metadata_json != "{}") {
        return event.metadata_json;
    }
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.va.event-record.metadata.v1\","
        << "\"profileKey\":\"" << JsonEscape(result.profile_key) << "\","
        << "\"sourceKind\":\"" << JsonEscape(result.context.source_kind) << "\","
        << "\"route\":\"" << JsonEscape(result.context.route) << "\","
        << "\"clientId\":\"" << JsonEscape(result.context.client_id) << "\","
        << "\"pts\":" << result.pts << ","
        << "\"ruleId\":\"" << JsonEscape(event.rule_id) << "\","
        << "\"bbox\":{"
        << "\"x\":" << event.box.x << ","
        << "\"y\":" << event.box.y << ","
        << "\"width\":" << event.box.width << ","
        << "\"height\":" << event.box.height
        << "},"
        << "\"highlight\":{"
        << "\"enabled\":" << (event.highlight_enabled ? "true" : "false") << ","
        << "\"color\":\"" << JsonEscape(event.highlight_color) << "\","
        << "\"durationMs\":" << event.highlight_duration_ms
        << "}"
        << "}";
    return out.str();
}

EventRecord BuildEventRecord(const AnalysisResult& result, const AnalysisEvent& event) {
    const std::uint64_t now_ms = NowMs();
    EventRecord record;
    record.event_id = event.event_id.empty()
                          ? "evt_" + std::to_string(now_ms) + "_" + std::to_string(NextSequence())
                          : event.event_id;
    record.event_type = event.event_type;
    record.stream_id = result.source_key;
    record.channel_id = ResolveChannelId(result);
    record.track_id = event.track_id;
    record.class_id = event.class_id;
    record.class_name = event.label;
    record.start_time_ms = event.start_time_ms > 0 ? event.start_time_ms : result.pts / 1000000LL;
    record.update_time_ms = event.update_time_ms > 0 ? event.update_time_ms : result.pts / 1000000LL;
    record.end_time_ms = event.end_time_ms;
    record.status = event.status.empty() ? "emitted" : event.status;
    record.zone_id = event.zone_id;
    record.line_id = event.line_id;
    record.scenario_name = event.scenario_name;
    record.scenario_phase = event.scenario_phase;
    record.confidence = event.score;
    record.bbox_available = event.box.width > 0.0F && event.box.height > 0.0F;
    record.bbox = event.box;
    record.pre_event_ms = app::GetAppConfig().analysis_event_pre_event_ms;
    record.post_event_ms = app::GetAppConfig().analysis_event_post_event_ms;
    record.metadata_json = BuildMetadataJson(result, event);
    return record;
}

std::string EventRecordJson(const EventRecord& record) {
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.va.event-record.v1\","
        << "\"eventId\":\"" << JsonEscape(record.event_id) << "\","
        << "\"eventType\":\"" << JsonEscape(record.event_type) << "\","
        << "\"streamId\":\"" << JsonEscape(record.stream_id) << "\","
        << "\"channelId\":\"" << JsonEscape(record.channel_id) << "\","
        << "\"trackId\":" << record.track_id << ","
        << "\"classId\":" << record.class_id << ","
        << "\"className\":\"" << JsonEscape(record.class_name) << "\","
        << "\"startTime\":" << record.start_time_ms << ","
        << "\"updateTime\":" << record.update_time_ms << ","
        << "\"endTime\":" << record.end_time_ms << ","
        << "\"status\":\"" << JsonEscape(record.status) << "\","
        << "\"zoneId\":\"" << JsonEscape(record.zone_id) << "\","
        << "\"lineId\":\"" << JsonEscape(record.line_id) << "\","
        << "\"scenarioName\":\"" << JsonEscape(record.scenario_name) << "\","
        << "\"scenarioPhase\":\"" << JsonEscape(record.scenario_phase) << "\","
        << "\"confidence\":" << record.confidence << ","
        << "\"snapshotPath\":\"" << JsonEscape(record.snapshot_path) << "\","
        << "\"clipPath\":\"" << JsonEscape(record.clip_path) << "\","
        << "\"preEventMs\":" << record.pre_event_ms << ","
        << "\"postEventMs\":" << record.post_event_ms << ","
        << "\"metadata\":" << (record.metadata_json.empty() ? "{}" : record.metadata_json)
        << "}";
    return out.str();
}

BoundedLineRead ReadBoundedJsonLine(std::istream& input, std::string* line) {
    if (line == nullptr) {
        return {BoundedLineStatus::kReadError, false};
    }
    line->clear();
    char ch = '\0';
    while (input.get(ch)) {
        if (ch == '\n') {
            return {BoundedLineStatus::kLine, true};
        }
        if (line->size() >= kMaxEventRecordLineBytes) {
            input.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
            return {BoundedLineStatus::kTooLong, !input.eof()};
        }
        line->push_back(ch);
    }
    if (input.eof()) {
        return line->empty() ? BoundedLineRead{BoundedLineStatus::kEnd, false}
                             : BoundedLineRead{BoundedLineStatus::kLine, false};
    }
    return {BoundedLineStatus::kReadError, false};
}

std::string TrimCopy(std::string value) {
    while (!value.empty() && std::isspace(static_cast<unsigned char>(value.front())) != 0) {
        value.erase(value.begin());
    }
    while (!value.empty() && std::isspace(static_cast<unsigned char>(value.back())) != 0) {
        value.pop_back();
    }
    return value;
}

void SkipWhitespace(const std::string& json, std::size_t* pos) {
    while (pos != nullptr && *pos < json.size() &&
           std::isspace(static_cast<unsigned char>(json[*pos])) != 0) {
        ++(*pos);
    }
}

bool SkipJsonString(const std::string& json, std::size_t* pos, std::string* decoded = nullptr) {
    if (pos == nullptr || *pos >= json.size() || json[*pos] != '"') {
        return false;
    }
    ++(*pos);
    bool escaped = false;
    std::string out;
    for (; *pos < json.size(); ++(*pos)) {
        const char ch = json[*pos];
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
                case '"':
                case '\\':
                case '/':
                    out.push_back(ch);
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
            ++(*pos);
            if (decoded != nullptr) {
                *decoded = std::move(out);
            }
            return true;
        }
        out.push_back(ch);
    }
    return false;
}

bool SkipDelimitedJsonValue(const std::string& json,
                            std::size_t* pos,
                            char open_ch,
                            char close_ch) {
    if (pos == nullptr || *pos >= json.size() || json[*pos] != open_ch) {
        return false;
    }
    int depth = 0;
    for (; *pos < json.size(); ++(*pos)) {
        const char ch = json[*pos];
        if (ch == '"') {
            if (!SkipJsonString(json, pos)) {
                return false;
            }
            --(*pos);
            continue;
        }
        if (ch == open_ch) {
            ++depth;
        } else if (ch == close_ch) {
            --depth;
            if (depth == 0) {
                ++(*pos);
                return true;
            }
        }
    }
    return false;
}

bool SkipJsonValue(const std::string& json, std::size_t* pos) {
    if (pos == nullptr) {
        return false;
    }
    SkipWhitespace(json, pos);
    if (*pos >= json.size()) {
        return false;
    }
    const char ch = json[*pos];
    if (ch == '"') {
        return SkipJsonString(json, pos);
    }
    if (ch == '{') {
        return SkipDelimitedJsonValue(json, pos, '{', '}');
    }
    if (ch == '[') {
        return SkipDelimitedJsonValue(json, pos, '[', ']');
    }
    const std::size_t start = *pos;
    while (*pos < json.size() && json[*pos] != ',' && json[*pos] != '}') {
        ++(*pos);
    }
    return *pos > start;
}

bool ValidateTopLevelJsonObject(const std::string& json) {
    std::size_t pos = 0;
    SkipWhitespace(json, &pos);
    if (pos >= json.size() || json[pos] != '{') {
        return false;
    }
    ++pos;
    SkipWhitespace(json, &pos);
    if (pos < json.size() && json[pos] == '}') {
        ++pos;
        SkipWhitespace(json, &pos);
        return pos == json.size();
    }
    while (pos < json.size()) {
        std::string key;
        if (!SkipJsonString(json, &pos, &key)) {
            return false;
        }
        SkipWhitespace(json, &pos);
        if (pos >= json.size() || json[pos] != ':') {
            return false;
        }
        ++pos;
        if (!SkipJsonValue(json, &pos)) {
            return false;
        }
        SkipWhitespace(json, &pos);
        if (pos < json.size() && json[pos] == ',') {
            ++pos;
            SkipWhitespace(json, &pos);
            continue;
        }
        if (pos < json.size() && json[pos] == '}') {
            ++pos;
            SkipWhitespace(json, &pos);
            return pos == json.size();
        }
        return false;
    }
    return false;
}

std::optional<std::string> ExtractTopLevelJsonValue(const std::string& json, const std::string& field) {
    std::size_t pos = 0;
    SkipWhitespace(json, &pos);
    if (pos >= json.size() || json[pos] != '{') {
        return std::nullopt;
    }
    ++pos;
    while (pos < json.size()) {
        SkipWhitespace(json, &pos);
        if (pos < json.size() && json[pos] == '}') {
            return std::nullopt;
        }
        std::string key;
        if (!SkipJsonString(json, &pos, &key)) {
            return std::nullopt;
        }
        SkipWhitespace(json, &pos);
        if (pos >= json.size() || json[pos] != ':') {
            return std::nullopt;
        }
        ++pos;
        SkipWhitespace(json, &pos);
        const std::size_t value_start = pos;
        if (!SkipJsonValue(json, &pos)) {
            return std::nullopt;
        }
        if (key == field) {
            return json.substr(value_start, pos - value_start);
        }
        SkipWhitespace(json, &pos);
        if (pos < json.size() && json[pos] == ',') {
            ++pos;
            continue;
        }
        if (pos < json.size() && json[pos] == '}') {
            return std::nullopt;
        }
    }
    return std::nullopt;
}

std::optional<std::string> ExtractTopLevelString(const std::string& json, const std::string& field) {
    const auto value = ExtractTopLevelJsonValue(json, field);
    if (!value.has_value()) {
        return std::nullopt;
    }
    std::size_t pos = 0;
    SkipWhitespace(*value, &pos);
    std::string decoded;
    if (!SkipJsonString(*value, &pos, &decoded)) {
        return std::nullopt;
    }
    SkipWhitespace(*value, &pos);
    if (pos != value->size()) {
        return std::nullopt;
    }
    return decoded;
}

std::optional<std::int64_t> ExtractTopLevelInt64(const std::string& json, const std::string& field) {
    const auto value = ExtractTopLevelJsonValue(json, field);
    if (!value.has_value()) {
        return std::nullopt;
    }
    const std::string trimmed = TrimCopy(*value);
    if (trimmed.empty() || trimmed.front() == '"') {
        return std::nullopt;
    }
    std::size_t consumed = 0;
    try {
        const std::int64_t parsed = std::stoll(trimmed, &consumed, 10);
        if (consumed != trimmed.size()) {
            return std::nullopt;
        }
        return parsed;
    } catch (...) {
        return std::nullopt;
    }
}

struct ParsedEventRecordLine {
    std::string event_id;
    std::string event_type;
    std::string stream_id;
    std::string channel_id;
    std::uint64_t track_id{0};
    std::string status;
    std::string zone_id;
    std::string line_id;
    std::string scenario_name;
    std::string scenario_phase;
    std::string snapshot_path;
    std::string clip_path;
    std::int64_t start_time_ms{0};
    std::int64_t update_time_ms{0};
    std::int64_t end_time_ms{0};
};

struct ArchiveFileInfo {
    std::filesystem::path path;
    std::uint64_t size_bytes{0};
    std::filesystem::file_time_type modified_time{};
};

std::filesystem::path EventStorageActivePath() {
    return std::filesystem::path(app::GetAppConfig().analysis_event_storage_path);
}

bool EnsureParentDirectory(const std::filesystem::path& path, std::string* error_message) {
    const std::filesystem::path parent = path.parent_path();
    if (parent.empty()) {
        if (error_message != nullptr) {
            error_message->clear();
        }
        return true;
    }
    std::error_code ec;
    std::filesystem::create_directories(parent, ec);
    if (ec) {
        if (error_message != nullptr) {
            *error_message = ec.message();
        }
        return false;
    }
    if (error_message != nullptr) {
        error_message->clear();
    }
    return true;
}

bool EventStorageFileNeedsLeadingNewline(const std::filesystem::path& path) {
    std::error_code ec;
    if (path.empty() || !std::filesystem::exists(path, ec) || ec) {
        return false;
    }
    const auto size = std::filesystem::file_size(path, ec);
    if (ec || size == 0) {
        return false;
    }
    std::ifstream input(path, std::ios::binary);
    if (!input.good()) {
        return false;
    }
    input.seekg(static_cast<std::streamoff>(size - 1));
    char last = '\0';
    input.get(last);
    return input.good() && last != '\n';
}

bool IsEventStorageArchivePath(const std::filesystem::path& active_path,
                               const std::filesystem::path& candidate) {
    if (candidate == active_path || candidate.filename() == active_path.filename()) {
        return false;
    }
    const std::string active_stem = active_path.stem().string();
    const std::string active_ext = active_path.extension().string();
    const std::string name = candidate.filename().string();
    if (active_stem.empty()) {
        return false;
    }
    if (name.rfind(active_stem + ".compact.", 0) == 0) {
        return false;
    }
    if (name.rfind(active_stem + ".", 0) != 0) {
        return false;
    }
    return active_ext.empty() || candidate.extension().string() == active_ext;
}

bool IsEventStorageCompactedPath(const std::filesystem::path& active_path,
                                 const std::filesystem::path& candidate) {
    if (candidate == active_path || candidate.filename() == active_path.filename()) {
        return false;
    }
    const std::string active_stem = active_path.stem().string();
    const std::string active_ext = active_path.extension().string();
    const std::string name = candidate.filename().string();
    if (active_stem.empty() || name.rfind(active_stem + ".compact.", 0) != 0) {
        return false;
    }
    return active_ext.empty() || candidate.extension().string() == active_ext;
}

std::int64_t FileTimeMs(std::filesystem::file_time_type value) {
    return std::chrono::duration_cast<std::chrono::milliseconds>(value.time_since_epoch()).count();
}

std::vector<ArchiveFileInfo> ListEventStorageArchives(const std::filesystem::path& active_path,
                                                      std::string* error_message) {
    std::vector<ArchiveFileInfo> archives;
    const std::filesystem::path parent = active_path.parent_path().empty()
                                             ? std::filesystem::path(".")
                                             : active_path.parent_path();
    std::error_code ec;
    const bool parent_exists = std::filesystem::exists(parent, ec);
    if (ec) {
        if (error_message != nullptr) {
            *error_message = ec.message();
        }
        return archives;
    }
    if (!parent_exists) {
        if (error_message != nullptr) {
            error_message->clear();
        }
        return archives;
    }
    for (const auto& entry : std::filesystem::directory_iterator(parent, ec)) {
        if (ec) {
            break;
        }
        if (!entry.is_regular_file(ec) || ec) {
            ec.clear();
            continue;
        }
        const std::filesystem::path candidate = entry.path();
        if (!IsEventStorageArchivePath(active_path, candidate)) {
            continue;
        }
        ArchiveFileInfo info;
        info.path = candidate;
        info.size_bytes = static_cast<std::uint64_t>(entry.file_size(ec));
        if (ec) {
            ec.clear();
            info.size_bytes = 0;
        }
        info.modified_time = entry.last_write_time(ec);
        if (ec) {
            ec.clear();
            info.modified_time = std::filesystem::file_time_type::min();
        }
        archives.push_back(std::move(info));
    }
    if (error_message != nullptr) {
        *error_message = ec ? ec.message() : "";
    }
    return archives;
}

void SortEventStorageArchivesOldestFirst(std::vector<ArchiveFileInfo>* archives) {
    if (archives == nullptr) {
        return;
    }
    std::sort(archives->begin(), archives->end(), [](const ArchiveFileInfo& lhs,
                                                     const ArchiveFileInfo& rhs) {
        if (lhs.modified_time == rhs.modified_time) {
            return lhs.path.filename().string() < rhs.path.filename().string();
        }
        return lhs.modified_time < rhs.modified_time;
    });
}

void SortEventStorageArchivesNewestFirst(std::vector<ArchiveFileInfo>* archives) {
    if (archives == nullptr) {
        return;
    }
    std::sort(archives->begin(), archives->end(), [](const ArchiveFileInfo& lhs,
                                                     const ArchiveFileInfo& rhs) {
        if (lhs.modified_time == rhs.modified_time) {
            return lhs.path.filename().string() > rhs.path.filename().string();
        }
        return lhs.modified_time > rhs.modified_time;
    });
}

std::filesystem::path BuildArchivePath(const std::filesystem::path& active_path) {
    const std::filesystem::path parent = active_path.parent_path();
    const std::string stem = active_path.stem().string();
    const std::string ext = active_path.extension().string();
    for (int attempt = 0; attempt < 1000; ++attempt) {
        const std::string name = stem + "." + std::to_string(NowMs()) + "." +
                                 std::to_string(NextSequence()) + ext;
        std::filesystem::path archive = parent.empty() ? std::filesystem::path(name) : parent / name;
        std::error_code ec;
        if (!std::filesystem::exists(archive, ec)) {
            return archive;
        }
    }
    return parent.empty() ? std::filesystem::path(stem + "." + std::to_string(NowMs()) + ext)
                          : parent / (stem + "." + std::to_string(NowMs()) + ext);
}

bool RotateActiveEventStorageIfNeeded(std::uint64_t next_record_bytes,
                                      bool* rotated,
                                      std::string* error_message) {
    if (rotated != nullptr) {
        *rotated = false;
    }
    const auto& config = app::GetAppConfig();
    if (config.analysis_event_storage_max_file_bytes == 0) {
        if (error_message != nullptr) {
            error_message->clear();
        }
        return true;
    }
    const std::filesystem::path active_path = EventStorageActivePath();
    if (active_path.empty()) {
        if (error_message != nullptr) {
            *error_message = "event storage active path is empty";
        }
        return false;
    }
    if (!EnsureParentDirectory(active_path, error_message)) {
        return false;
    }
    std::error_code ec;
    if (!std::filesystem::exists(active_path, ec)) {
        if (error_message != nullptr) {
            *error_message = ec ? ec.message() : "";
        }
        return !ec;
    }
    const std::uint64_t current_size = static_cast<std::uint64_t>(std::filesystem::file_size(active_path, ec));
    if (ec) {
        if (error_message != nullptr) {
            *error_message = ec.message();
        }
        return false;
    }
    if (current_size == 0 ||
        current_size + next_record_bytes <= config.analysis_event_storage_max_file_bytes) {
        if (error_message != nullptr) {
            error_message->clear();
        }
        return true;
    }
    const std::filesystem::path archive_path = BuildArchivePath(active_path);
    std::filesystem::rename(active_path, archive_path, ec);
    if (ec) {
        if (error_message != nullptr) {
            *error_message = ec.message();
        }
        return false;
    }
    if (rotated != nullptr) {
        *rotated = true;
    }
    if (error_message != nullptr) {
        error_message->clear();
    }
    return true;
}

struct RetentionResult {
    std::uint64_t deleted_count{0};
    std::uint64_t deleted_bytes{0};
    std::uint64_t failed_count{0};
    std::string last_error;
};

RetentionResult ApplyEventStorageRetention() {
    RetentionResult result;
    const auto& config = app::GetAppConfig();
    if (config.analysis_event_storage_max_archives == 0 &&
        config.analysis_event_storage_max_total_bytes == 0) {
        return result;
    }
    std::string error_message;
    std::vector<ArchiveFileInfo> archives = ListEventStorageArchives(EventStorageActivePath(), &error_message);
    if (!error_message.empty()) {
        result.failed_count = 1;
        result.last_error = error_message;
        return result;
    }
    SortEventStorageArchivesOldestFirst(&archives);
    std::uint64_t total_bytes = 0;
    for (const auto& archive : archives) {
        total_bytes += archive.size_bytes;
    }
    auto delete_archive = [&](const ArchiveFileInfo& archive) {
        std::error_code ec;
        std::filesystem::remove(archive.path, ec);
        if (ec) {
            ++result.failed_count;
            result.last_error = ec.message();
            return false;
        }
        ++result.deleted_count;
        result.deleted_bytes += archive.size_bytes;
        if (total_bytes >= archive.size_bytes) {
            total_bytes -= archive.size_bytes;
        } else {
            total_bytes = 0;
        }
        return true;
    };

    std::size_t first_retained = 0;
    while (config.analysis_event_storage_max_archives > 0 &&
           archives.size() - first_retained > config.analysis_event_storage_max_archives) {
        delete_archive(archives[first_retained]);
        ++first_retained;
    }
    while (config.analysis_event_storage_max_total_bytes > 0 &&
           total_bytes > config.analysis_event_storage_max_total_bytes &&
           first_retained < archives.size()) {
        delete_archive(archives[first_retained]);
        ++first_retained;
    }
    return result;
}

bool ParseEventRecordLine(const std::string& line, ParsedEventRecordLine* record) {
    if (record == nullptr || line.size() > kMaxEventRecordLineBytes ||
        !ValidateTopLevelJsonObject(line)) {
        return false;
    }
    const auto schema = ExtractTopLevelString(line, "schema");
    if (!schema.has_value() || *schema != "media-server.va.event-record.v1") {
        return false;
    }
    const auto track_id = ExtractTopLevelInt64(line, "trackId");
    const auto start_time = ExtractTopLevelInt64(line, "startTime");
    const auto update_time = ExtractTopLevelInt64(line, "updateTime");
    const auto end_time = ExtractTopLevelInt64(line, "endTime");
    if (!track_id.has_value() || *track_id < 0 || !start_time.has_value() ||
        !update_time.has_value() || !end_time.has_value()) {
        return false;
    }
    record->event_id = ExtractTopLevelString(line, "eventId").value_or("");
    record->event_type = ExtractTopLevelString(line, "eventType").value_or("");
    record->stream_id = ExtractTopLevelString(line, "streamId").value_or("");
    record->channel_id = ExtractTopLevelString(line, "channelId").value_or("");
    record->track_id = static_cast<std::uint64_t>(*track_id);
    record->status = ExtractTopLevelString(line, "status").value_or("");
    record->zone_id = ExtractTopLevelString(line, "zoneId").value_or("");
    record->line_id = ExtractTopLevelString(line, "lineId").value_or("");
    record->scenario_name = ExtractTopLevelString(line, "scenarioName").value_or("");
    record->scenario_phase = ExtractTopLevelString(line, "scenarioPhase").value_or("");
    record->snapshot_path = ExtractTopLevelString(line, "snapshotPath").value_or("");
    record->clip_path = ExtractTopLevelString(line, "clipPath").value_or("");
    record->start_time_ms = *start_time;
    record->update_time_ms = *update_time;
    record->end_time_ms = *end_time;
    return true;
}

std::string BuildVlmEvidenceRefsJson(const EventRecord& record) {
    const std::filesystem::path clip_manifest_path(record.clip_path);
    const bool has_clip_manifest = !record.clip_path.empty();
    const bool has_frame_bundle_manifest =
        has_clip_manifest && clip_manifest_path.filename().string() == "manifest.json" &&
        clip_manifest_path.parent_path().filename().string().find(".clip") != std::string::npos;
    const std::filesystem::path frame_bundle_manifest_path =
        has_frame_bundle_manifest ? clip_manifest_path.parent_path() / "frame-bundle-manifest.json"
                                  : std::filesystem::path();
    const std::filesystem::path evidence_manifest_path =
        has_frame_bundle_manifest ? clip_manifest_path.parent_path() / "evidence-manifest.json"
                                  : std::filesystem::path();
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.vlm-event-evidence-refs.v1\","
        << "\"inputMode\":\"event-short-evidence-ref-only\","
        << "\"evidenceManifest\":{"
        << "\"kind\":\"evidence-manifest\","
        << "\"available\":" << (has_frame_bundle_manifest ? "true" : "false") << ","
        << "\"path\":\"" << JsonEscape(evidence_manifest_path.string()) << "\","
        << "\"schema\":\"media-server.event-evidence-contract.v1\""
        << "},"
        << "\"eventFrame\":{"
        << "\"kind\":\"snapshot\","
        << "\"available\":" << (record.snapshot_path.empty() ? "false" : "true") << ","
        << "\"path\":\"" << JsonEscape(record.snapshot_path) << "\""
        << "},"
        << "\"bboxCrop\":{"
        << "\"kind\":\"bbox-crop\","
        << "\"available\":" << (record.bbox_crop_path.empty() ? "false" : "true") << ","
        << "\"path\":\"" << JsonEscape(record.bbox_crop_path) << "\","
        << "\"bbox\":{"
        << "\"x\":" << record.bbox.x << ","
        << "\"y\":" << record.bbox.y << ","
        << "\"width\":" << record.bbox.width << ","
        << "\"height\":" << record.bbox.height
        << "}"
        << "},"
        << "\"temporalContext\":{"
        << "\"kind\":\"clip-manifest\","
        << "\"available\":" << (record.clip_path.empty() ? "false" : "true") << ","
        << "\"path\":\"" << JsonEscape(record.clip_path) << "\","
        << "\"previousFrameRef\":\"vlmInputRefs.previousFrame\","
        << "\"eventFrameRef\":\"vlmInputRefs.eventFrame\","
        << "\"nextFrameRef\":\"vlmInputRefs.nextFrame\","
        << "\"frameBundleManifest\":\"" << JsonEscape(frame_bundle_manifest_path.string()) << "\""
        << "},"
        << "\"rawMediaEmbedded\":false,"
        << "\"sourceUrlExposed\":false,"
        << "\"credentialMaterialExposed\":false"
        << "}";
    return out.str();
}

bool AppendTopLevelJsonField(const std::string& object_json,
                             const std::string& key,
                             const std::string& value_json,
                             std::string* output) {
    if (output == nullptr || !ValidateTopLevelJsonObject(object_json)) {
        return false;
    }
    std::string trimmed = TrimCopy(object_json);
    if (trimmed.empty() || trimmed.back() != '}') {
        return false;
    }
    trimmed.pop_back();
    const std::string prefix = TrimCopy(trimmed);
    std::ostringstream out;
    out << prefix;
    if (!prefix.empty() && prefix.back() != '{') {
        out << ",";
    }
    out << "\"" << JsonEscape(key) << "\":" << value_json << "}";
    *output = out.str();
    return true;
}

void AttachVlmEvidenceRefs(EventRecord* record) {
    if (record == nullptr) {
        return;
    }
    const std::string refs = BuildVlmEvidenceRefsJson(*record);
    std::string merged;
    if (AppendTopLevelJsonField(record->metadata_json.empty() ? "{}" : record->metadata_json,
                                "vlmEvidenceRefs",
                                refs,
                                &merged)) {
        record->metadata_json = std::move(merged);
    }
}

struct EventStorageRecoveryScan {
    bool file_exists{false};
    std::uint64_t file_size_bytes{0};
    std::filesystem::file_time_type modified_time{};
    std::uint64_t skipped_corrupt_lines{0};
    std::uint64_t partial_line_count{0};
    std::uint64_t last_recovery_time_ms{0};
    std::string status{"not-run"};
    std::string last_error;
};

struct EventStorageActiveFileSignature {
    std::string path;
    bool exists{false};
    std::uint64_t size_bytes{0};
    std::filesystem::file_time_type modified_time{};
    bool error{false};
    std::string error_message;
};

EventStorageActiveFileSignature ReadActiveFileSignature(const std::filesystem::path& path) {
    EventStorageActiveFileSignature signature;
    signature.path = path.string();
    if (path.empty()) {
        return signature;
    }
    std::error_code ec;
    signature.exists = std::filesystem::exists(path, ec);
    if (ec) {
        signature.error = true;
        signature.error_message = ec.message();
        return signature;
    }
    if (!signature.exists) {
        return signature;
    }
    signature.size_bytes = static_cast<std::uint64_t>(std::filesystem::file_size(path, ec));
    if (ec) {
        signature.error = true;
        signature.error_message = ec.message();
        return signature;
    }
    signature.modified_time = std::filesystem::last_write_time(path, ec);
    if (ec) {
        signature.error = true;
        signature.error_message = ec.message();
    }
    return signature;
}

bool SameActiveFileSignature(const EventStorageActiveFileSignature& lhs,
                             const EventStorageActiveFileSignature& rhs) {
    return lhs.path == rhs.path && lhs.exists == rhs.exists && lhs.size_bytes == rhs.size_bytes &&
           lhs.modified_time == rhs.modified_time && lhs.error == rhs.error &&
           lhs.error_message == rhs.error_message;
}

std::string RecoveryStatusForCounts(std::uint64_t skipped_corrupt_lines,
                                    std::uint64_t partial_line_count) {
    return skipped_corrupt_lines > 0 || partial_line_count > 0 ? "recovered" : "ok";
}

EventStorageRecoveryScan ScanActiveEventStorageFile(
    const std::filesystem::path& path,
    const EventStorageActiveFileSignature& signature) {
    EventStorageRecoveryScan scan;
    scan.file_exists = signature.exists;
    scan.file_size_bytes = signature.size_bytes;
    scan.modified_time = signature.modified_time;
    scan.last_recovery_time_ms = NowMs();
    if (signature.error) {
        scan.status = "failed";
        scan.last_error = signature.error_message;
        return scan;
    }
    if (path.empty() || !signature.exists) {
        scan.status = "missing";
        return scan;
    }

    std::ifstream input(path);
    if (!input.good()) {
        scan.status = "failed";
        scan.last_error = "failed to open event storage file";
        return scan;
    }

    std::string line;
    while (true) {
        const BoundedLineRead read = ReadBoundedJsonLine(input, &line);
        if (read.status == BoundedLineStatus::kEnd) {
            break;
        }
        if (read.status == BoundedLineStatus::kReadError) {
            scan.status = "failed";
            scan.last_error = "failed to read event storage file";
            return scan;
        }
        if (read.status == BoundedLineStatus::kTooLong) {
            ++scan.skipped_corrupt_lines;
            if (!read.had_newline) {
                ++scan.partial_line_count;
            }
            continue;
        }
        if (!line.empty() && line.back() == '\r') {
            line.pop_back();
        }
        if (TrimCopy(line).empty()) {
            continue;
        }
        ParsedEventRecordLine parsed;
        if (!ParseEventRecordLine(line, &parsed)) {
            ++scan.skipped_corrupt_lines;
            if (!read.had_newline) {
                ++scan.partial_line_count;
            }
        }
    }
    scan.status = RecoveryStatusForCounts(scan.skipped_corrupt_lines, scan.partial_line_count);
    return scan;
}

bool StringFilterMatches(const std::string& expected, const std::string& actual) {
    return expected.empty() || expected == actual;
}

bool EventRecordMatchesQuery(const ParsedEventRecordLine& record,
                             const EventRecordQueryOptions& options) {
    if (!StringFilterMatches(options.event_id, record.event_id) ||
        !StringFilterMatches(options.event_type, record.event_type) ||
        !StringFilterMatches(options.stream_id, record.stream_id) ||
        !StringFilterMatches(options.channel_id, record.channel_id) ||
        !StringFilterMatches(options.status, record.status) ||
        !StringFilterMatches(options.zone_id, record.zone_id) ||
        !StringFilterMatches(options.line_id, record.line_id) ||
        !StringFilterMatches(options.scenario_name, record.scenario_name) ||
        !StringFilterMatches(options.scenario_phase, record.scenario_phase)) {
        return false;
    }
    if (options.has_track_id && record.track_id != options.track_id) {
        return false;
    }
    if (!options.evidence.empty()) {
        const bool has_snapshot = !record.snapshot_path.empty();
        const bool has_clip = !record.clip_path.empty();
        if ((options.evidence == "snapshot" && !has_snapshot) ||
            (options.evidence == "clip" && !has_clip) ||
            (options.evidence == "any" && !has_snapshot && !has_clip) ||
            (options.evidence == "both" && (!has_snapshot || !has_clip)) ||
            (options.evidence == "missing" && (has_snapshot || has_clip))) {
            return false;
        }
    }
    const std::int64_t record_end = record.end_time_ms > 0
                                        ? record.end_time_ms
                                        : (record.update_time_ms > 0 ? record.update_time_ms
                                                                     : record.start_time_ms);
    if (options.has_start_time_ms && record_end < options.start_time_ms) {
        return false;
    }
    if (options.has_end_time_ms && record.start_time_ms > options.end_time_ms) {
        return false;
    }
    return true;
}

std::string TrimForLog(std::string value) {
    value.erase(std::remove(value.begin(), value.end(), '\n'), value.end());
    value.erase(std::remove(value.begin(), value.end(), '\r'), value.end());
    constexpr std::size_t kMaxLogLength = 240;
    if (value.size() > kMaxLogLength) {
        value.resize(kMaxLogLength);
        value += "...";
    }
    return value;
}

std::string SanitizePathToken(const std::string& value) {
    std::string out;
    out.reserve(value.size());
    for (const unsigned char ch : value) {
        if (std::isalnum(ch) != 0 || ch == '-' || ch == '_') {
            out.push_back(static_cast<char>(ch));
        } else {
            out.push_back('_');
        }
    }
    return out.empty() ? "event" : out;
}

std::string FrameBufferKey(const std::string& stream_id, const std::string& channel_id) {
    return (stream_id.empty() ? "*" : stream_id) + "\n" +
           (channel_id.empty() ? (stream_id.empty() ? "*" : stream_id) : channel_id);
}

std::int64_t FrameTimestampMs(const RawVideoFrame& frame) {
    if (frame.pts >= 0) {
        return frame.pts / 1000000LL;
    }
    return static_cast<std::int64_t>(NowMs());
}

struct BufferedEventFrame {
    RawVideoFrame frame;
    std::int64_t timestamp_ms{0};
    std::uint64_t sequence{0};
};

struct EncodedRecorderFrame {
    std::string extension;
    std::string content_type;
    std::vector<unsigned char> data;
    bool fallback_encoder{false};
    std::string fallback_reason;
};

constexpr std::size_t kMaxBufferedRecorderStreams = 32;
constexpr std::size_t kMaxBufferedFramesPerStream = 180;
constexpr std::size_t kMaxClipOutputFrames = 120;

bool EncodePortablePixmap(const RawVideoFrame& frame,
                          EncodedRecorderFrame* output,
                          std::string* error_message) {
    if (output == nullptr) {
        if (error_message != nullptr) {
            *error_message = "missing recorder frame output";
        }
        return false;
    }
    if (frame.width <= 0 || frame.height <= 0 || frame.data.empty()) {
        if (error_message != nullptr) {
            *error_message = "missing raw frame data";
        }
        return false;
    }
    const std::size_t pixel_count =
        static_cast<std::size_t>(frame.width) * static_cast<std::size_t>(frame.height);
    std::ostringstream header;
    if (frame.format == PixelFormat::Gray8) {
        if (frame.data.size() < pixel_count) {
            if (error_message != nullptr) {
                *error_message = "gray recorder frame is smaller than expected";
            }
            return false;
        }
        header << "P5\n" << frame.width << " " << frame.height << "\n255\n";
        const std::string header_text = header.str();
        output->data.assign(header_text.begin(), header_text.end());
        output->data.insert(output->data.end(), frame.data.begin(), frame.data.begin() + pixel_count);
        output->extension = ".pgm";
        output->content_type = "image/x-portable-graymap";
        if (error_message != nullptr) {
            error_message->clear();
        }
        return true;
    }
    if (frame.format != PixelFormat::RGB && frame.format != PixelFormat::BGR) {
        if (error_message != nullptr) {
            *error_message = "recorder fallback supports RGB/BGR/Gray8 frames only";
        }
        return false;
    }
    const std::size_t expected_size = pixel_count * 3U;
    if (frame.data.size() < expected_size) {
        if (error_message != nullptr) {
            *error_message = "rgb recorder frame is smaller than expected";
        }
        return false;
    }
    header << "P6\n" << frame.width << " " << frame.height << "\n255\n";
    const std::string header_text = header.str();
    output->data.assign(header_text.begin(), header_text.end());
    output->data.reserve(output->data.size() + expected_size);
    if (frame.format == PixelFormat::RGB) {
        output->data.insert(output->data.end(), frame.data.begin(), frame.data.begin() + expected_size);
    } else {
        for (std::size_t index = 0; index + 2 < expected_size; index += 3) {
            output->data.push_back(frame.data[index + 2]);
            output->data.push_back(frame.data[index + 1]);
            output->data.push_back(frame.data[index]);
        }
    }
    output->extension = ".ppm";
    output->content_type = "image/x-portable-pixmap";
    if (error_message != nullptr) {
        error_message->clear();
    }
    return true;
}

bool EncodeRecorderFrame(const RawVideoFrame& frame,
                         int quality,
                         EncodedRecorderFrame* output,
                         std::string* error_message) {
    if (output == nullptr) {
        if (error_message != nullptr) {
            *error_message = "missing recorder frame output";
        }
        return false;
    }
    *output = EncodedRecorderFrame{};
    EncodedImage jpeg;
    std::string jpeg_error;
    if (EncodeJpeg(frame, quality, &jpeg, &jpeg_error)) {
        output->extension = ".jpg";
        output->content_type = jpeg.content_type.empty() ? "image/jpeg" : jpeg.content_type;
        output->data = std::move(jpeg.data);
        if (error_message != nullptr) {
            error_message->clear();
        }
        return true;
    }
    std::string fallback_error;
    if (!EncodePortablePixmap(frame, output, &fallback_error)) {
        if (error_message != nullptr) {
            *error_message = jpeg_error.empty() ? fallback_error : jpeg_error + "; " + fallback_error;
        }
        return false;
    }
    output->fallback_encoder = true;
    output->fallback_reason = jpeg_error;
    if (error_message != nullptr) {
        error_message->clear();
    }
    return true;
}

int ClampPixelIndex(float normalized, int max_value) {
    if (max_value <= 0) {
        return 0;
    }
    const float clamped = std::clamp(normalized, 0.0F, 1.0F);
    return std::clamp(static_cast<int>(std::floor(clamped * static_cast<float>(max_value))),
                      0,
                      max_value - 1);
}

int PixelChannelCount(PixelFormat format) {
    if (format == PixelFormat::RGB || format == PixelFormat::BGR) {
        return 3;
    }
    if (format == PixelFormat::Gray8) {
        return 1;
    }
    return 0;
}

std::optional<RawVideoFrame> CropFrameToBbox(const RawVideoFrame& frame,
                                             const RectF& bbox,
                                             std::string* error_message) {
    const int channels = PixelChannelCount(frame.format);
    if (channels <= 0) {
        if (error_message != nullptr) {
            *error_message = "bbox crop supports RGB/BGR/Gray8 recorder frames only";
        }
        return std::nullopt;
    }
    if (frame.width <= 0 || frame.height <= 0 || frame.data.empty()) {
        if (error_message != nullptr) {
            *error_message = "missing raw frame data for bbox crop";
        }
        return std::nullopt;
    }
    const std::size_t expected_size =
        static_cast<std::size_t>(frame.width) * static_cast<std::size_t>(frame.height) *
        static_cast<std::size_t>(channels);
    if (frame.data.size() < expected_size) {
        if (error_message != nullptr) {
            *error_message = "raw frame data is smaller than expected for bbox crop";
        }
        return std::nullopt;
    }

    const int x0 = ClampPixelIndex(bbox.x, frame.width);
    const int y0 = ClampPixelIndex(bbox.y, frame.height);
    const int x1 = std::max(x0 + 1, ClampPixelIndex(bbox.x + bbox.width, frame.width) + 1);
    const int y1 = std::max(y0 + 1, ClampPixelIndex(bbox.y + bbox.height, frame.height) + 1);
    const int crop_width = std::clamp(x1 - x0, 1, frame.width - x0);
    const int crop_height = std::clamp(y1 - y0, 1, frame.height - y0);

    RawVideoFrame crop;
    crop.source_key = frame.source_key;
    crop.track_id = frame.track_id;
    crop.width = crop_width;
    crop.height = crop_height;
    crop.format = frame.format;
    crop.pts = frame.pts;
    crop.data.resize(static_cast<std::size_t>(crop_width) *
                     static_cast<std::size_t>(crop_height) *
                     static_cast<std::size_t>(channels));

    for (int row = 0; row < crop_height; ++row) {
        const std::size_t source_offset =
            (static_cast<std::size_t>(y0 + row) * static_cast<std::size_t>(frame.width) +
             static_cast<std::size_t>(x0)) *
            static_cast<std::size_t>(channels);
        const std::size_t target_offset =
            static_cast<std::size_t>(row) * static_cast<std::size_t>(crop_width) *
            static_cast<std::size_t>(channels);
        const std::size_t row_bytes =
            static_cast<std::size_t>(crop_width) * static_cast<std::size_t>(channels);
        std::copy(frame.data.begin() + static_cast<std::ptrdiff_t>(source_offset),
                  frame.data.begin() + static_cast<std::ptrdiff_t>(source_offset + row_bytes),
                  crop.data.begin() + static_cast<std::ptrdiff_t>(target_offset));
    }

    if (error_message != nullptr) {
        error_message->clear();
    }
    return crop;
}

bool WriteBinaryFile(const std::filesystem::path& path,
                     const std::vector<unsigned char>& data,
                     std::string* error_message) {
    if (!EnsureParentDirectory(path, error_message)) {
        return false;
    }
    std::ofstream output(path, std::ios::out | std::ios::binary | std::ios::trunc);
    if (!output.good()) {
        if (error_message != nullptr) {
            *error_message = "failed to open recorder media output";
        }
        return false;
    }
    output.write(reinterpret_cast<const char*>(data.data()), static_cast<std::streamsize>(data.size()));
    if (!output.good()) {
        if (error_message != nullptr) {
            *error_message = "failed to write recorder media output";
        }
        return false;
    }
    if (error_message != nullptr) {
        error_message->clear();
    }
    return true;
}

struct EncodedClipResult {
    std::string job_id;
    std::string manifest_path;
    std::string media_path;
    std::string format{"webm"};
    std::string codec{"vp8"};
    std::string content_type{"video/webm"};
    std::string extension{".webm"};
    std::size_t frame_count{0};
    std::uint64_t byte_size{0};
    int fps{1};
    int duration_ms{0};
    std::uint64_t cleanup_deleted_entries{0};
};

int EstimateClipFps(const std::vector<std::pair<BufferedEventFrame, std::filesystem::path>>& frames) {
    if (frames.size() < 2U) {
        return 1;
    }
    const std::int64_t first_ms = frames.front().first.timestamp_ms;
    const std::int64_t last_ms = frames.back().first.timestamp_ms;
    const std::int64_t span_ms = std::max<std::int64_t>(1, last_ms - first_ms);
    const double average_delta_ms = static_cast<double>(span_ms) /
                                    static_cast<double>(frames.size() - 1U);
    const int estimated = static_cast<int>(std::llround(1000.0 / std::max(1.0, average_delta_ms)));
    return std::clamp(estimated, 1, 30);
}

#if MEDIA_SERVER_USE_GSTREAMER

std::string GstRawFrameFormat(PixelFormat format) {
    switch (format) {
        case PixelFormat::RGB:
            return "RGB";
        case PixelFormat::BGR:
            return "BGR";
        case PixelFormat::Gray8:
            return "GRAY8";
        case PixelFormat::I420:
        case PixelFormat::Unknown:
            return {};
    }
    return {};
}

#endif

bool BuildWebmClip(const std::vector<std::pair<BufferedEventFrame, std::filesystem::path>>& frames,
                   std::vector<unsigned char>* output,
                   int* fps,
                   int* duration_ms,
                   std::string* error_message) {
    if (output == nullptr || frames.empty()) {
        if (error_message != nullptr) {
            *error_message = "encoded clip requires at least one frame";
        }
        return false;
    }
    output->clear();
    const int width = frames.front().first.frame.width;
    const int height = frames.front().first.frame.height;
    const PixelFormat format = frames.front().first.frame.format;
    const int channels = PixelChannelCount(format);
    if (width <= 0 || height <= 0 || channels <= 0) {
        if (error_message != nullptr) {
            *error_message = "encoded clip frame dimensions or format are invalid";
        }
        return false;
    }
    const std::size_t expected_bytes =
        static_cast<std::size_t>(width) * static_cast<std::size_t>(height) *
        static_cast<std::size_t>(channels);
    for (const auto& item : frames) {
        const RawVideoFrame& frame = item.first.frame;
        if (frame.width != width || frame.height != height || frame.format != format ||
            frame.data.size() < expected_bytes) {
            if (error_message != nullptr) {
                *error_message = "encoded clip frames must share dimensions, format, and raw byte size";
            }
            return false;
        }
    }

    const int local_fps = EstimateClipFps(frames);
    const int local_duration_ms = static_cast<int>(
        (static_cast<std::int64_t>(frames.size()) * 1000LL) / std::max(1, local_fps));

#if MEDIA_SERVER_USE_GSTREAMER
    const std::string gst_format = GstRawFrameFormat(format);
    if (gst_format.empty()) {
        if (error_message != nullptr) {
            *error_message = "WebM encoder supports RGB/BGR/Gray8 recorder frames only";
        }
        return false;
    }

    gst_init(nullptr, nullptr);
    const int encoded_width = std::max(16, width + (width % 2));
    const int encoded_height = std::max(16, height + (height % 2));
    const std::string launch =
        "appsrc name=src is-live=false format=time block=true do-timestamp=false "
        "! videoconvert ! videoscale ! video/x-raw,format=I420,width=" +
        std::to_string(encoded_width) + ",height=" + std::to_string(encoded_height) +
        ",framerate=" + std::to_string(local_fps) + "/1 "
        "! vp8enc deadline=1 keyframe-max-dist=1 "
        "! webmmux streamable=true "
        "! appsink name=sink emit-signals=false sync=false drop=false";

    GError* pipeline_error = nullptr;
    GstElement* pipeline = gst_parse_launch(launch.c_str(), &pipeline_error);
    if (pipeline == nullptr) {
        if (error_message != nullptr) {
            *error_message = pipeline_error != nullptr ? pipeline_error->message
                                                       : "failed to create WebM encoder pipeline";
        }
        if (pipeline_error != nullptr) {
            g_error_free(pipeline_error);
        }
        return false;
    }

    GstElement* appsrc = gst_bin_get_by_name(GST_BIN(pipeline), "src");
    GstElement* appsink = gst_bin_get_by_name(GST_BIN(pipeline), "sink");
    GstBus* bus = gst_element_get_bus(pipeline);
    if (appsrc == nullptr || appsink == nullptr || bus == nullptr) {
        if (bus != nullptr) {
            gst_object_unref(bus);
        }
        if (appsrc != nullptr) {
            gst_object_unref(appsrc);
        }
        if (appsink != nullptr) {
            gst_object_unref(appsink);
        }
        gst_object_unref(pipeline);
        if (error_message != nullptr) {
            *error_message = "WebM encoder pipeline missing appsrc/appsink/bus";
        }
        return false;
    }

    GstCaps* caps = gst_caps_new_simple("video/x-raw",
                                        "format",
                                        G_TYPE_STRING,
                                        gst_format.c_str(),
                                        "width",
                                        G_TYPE_INT,
                                        width,
                                        "height",
                                        G_TYPE_INT,
                                        height,
                                        "framerate",
                                        GST_TYPE_FRACTION,
                                        local_fps,
                                        1,
                                        nullptr);
    gst_app_src_set_caps(GST_APP_SRC(appsrc), caps);
    gst_caps_unref(caps);
    gst_app_src_set_stream_type(GST_APP_SRC(appsrc), GST_APP_STREAM_TYPE_STREAM);
    gst_app_src_set_duration(
        GST_APP_SRC(appsrc),
        static_cast<GstClockTime>(local_duration_ms) * static_cast<GstClockTime>(GST_MSECOND));

    bool ok = true;
    std::string local_error;
    if (gst_element_set_state(pipeline, GST_STATE_PLAYING) == GST_STATE_CHANGE_FAILURE) {
        ok = false;
        local_error = "failed to start WebM encoder pipeline";
    }

    const GstClockTime frame_duration =
        static_cast<GstClockTime>(GST_SECOND / static_cast<guint64>(std::max(1, local_fps)));
    for (std::size_t index = 0; ok && index < frames.size(); ++index) {
        GstBuffer* buffer = gst_buffer_new_allocate(nullptr, expected_bytes, nullptr);
        if (buffer == nullptr) {
            ok = false;
            local_error = "failed to allocate WebM input frame";
            break;
        }
        gst_buffer_fill(buffer, 0, frames[index].first.frame.data.data(), expected_bytes);
        GST_BUFFER_PTS(buffer) = static_cast<GstClockTime>(index) * frame_duration;
        GST_BUFFER_DTS(buffer) = GST_BUFFER_PTS(buffer);
        GST_BUFFER_DURATION(buffer) = frame_duration;
        const GstFlowReturn flow = gst_app_src_push_buffer(GST_APP_SRC(appsrc), buffer);
        if (flow != GST_FLOW_OK) {
            ok = false;
            local_error = "failed to push WebM input frame";
        }
    }
    if (ok) {
        const GstFlowReturn eos_flow = gst_app_src_end_of_stream(GST_APP_SRC(appsrc));
        if (eos_flow != GST_FLOW_OK) {
            ok = false;
            local_error = "failed to finish WebM input stream";
        }
    }

    const auto deadline = std::chrono::steady_clock::now() + std::chrono::seconds(10);
    while (ok && std::chrono::steady_clock::now() < deadline) {
        bool pulled_sample = false;
        while (GstSample* sample =
                   gst_app_sink_try_pull_sample(GST_APP_SINK(appsink), 200 * GST_MSECOND)) {
            pulled_sample = true;
            GstBuffer* out_buffer = gst_sample_get_buffer(sample);
            GstMapInfo map;
            if (out_buffer == nullptr || gst_buffer_map(out_buffer, &map, GST_MAP_READ) != TRUE) {
                ok = false;
                local_error = "failed to map WebM encoder output";
                gst_sample_unref(sample);
                break;
            }
            output->insert(output->end(), map.data, map.data + map.size);
            gst_buffer_unmap(out_buffer, &map);
            gst_sample_unref(sample);
        }
        if (!ok) {
            break;
        }
        GstMessage* message = gst_bus_pop_filtered(bus, static_cast<GstMessageType>(GST_MESSAGE_ERROR | GST_MESSAGE_EOS));
        if (message != nullptr) {
            if (GST_MESSAGE_TYPE(message) == GST_MESSAGE_ERROR) {
                GError* err = nullptr;
                gchar* debug = nullptr;
                gst_message_parse_error(message, &err, &debug);
                ok = false;
                local_error = err != nullptr ? err->message : "WebM encoder pipeline error";
                if (debug != nullptr && local_error.find(debug) == std::string::npos) {
                    local_error += ": ";
                    local_error += debug;
                }
                if (err != nullptr) {
                    g_error_free(err);
                }
                if (debug != nullptr) {
                    g_free(debug);
                }
            }
            const bool saw_eos = GST_MESSAGE_TYPE(message) == GST_MESSAGE_EOS;
            gst_message_unref(message);
            if (saw_eos) {
                break;
            }
        }
        if (!pulled_sample && gst_app_sink_is_eos(GST_APP_SINK(appsink))) {
            break;
        }
    }
    if (ok && output->empty()) {
        ok = false;
        local_error = "WebM encoder produced no output";
    }
    if (ok && std::chrono::steady_clock::now() >= deadline && !gst_app_sink_is_eos(GST_APP_SINK(appsink))) {
        ok = false;
        local_error = "timed out waiting for WebM encoder output";
    }

    gst_element_set_state(pipeline, GST_STATE_NULL);
    gst_object_unref(bus);
    gst_object_unref(appsrc);
    gst_object_unref(appsink);
    gst_object_unref(pipeline);

    if (!ok) {
        if (error_message != nullptr) {
            *error_message = std::move(local_error);
        }
        return false;
    }
    if (fps != nullptr) {
        *fps = local_fps;
    }
    if (duration_ms != nullptr) {
        *duration_ms = local_duration_ms;
    }
    if (error_message != nullptr) {
        error_message->clear();
    }
    return true;
#else
    (void)local_fps;
    (void)local_duration_ms;
    if (error_message != nullptr) {
        *error_message = "WebM event clip encoding requires MEDIA_SERVER_USE_GSTREAMER=ON";
    }
    return false;
#endif
}

std::uint64_t CleanupEncodedClipOutput(const std::filesystem::path& encoded_dir) {
    std::error_code ec;
    if (encoded_dir.empty() || !std::filesystem::exists(encoded_dir, ec) || ec) {
        return 0;
    }
    const std::uintmax_t removed = std::filesystem::remove_all(encoded_dir, ec);
    if (ec) {
        return 0;
    }
    return static_cast<std::uint64_t>(removed);
}

std::string FrameStreamEpochId(const EventRecord& record);

const char* FrameBundlePhase(std::size_t index, std::size_t event_frame_index);

void WriteFrameRefJson(std::ostream& out,
                       const EventRecord& record,
                       const BufferedEventFrame& frame);

bool WriteEncodedClipManifest(const EventRecord& record,
                              const EventMediaHookOptions& options,
                              const std::filesystem::path& evidence_manifest_path,
                              const std::filesystem::path& frame_bundle_manifest_path,
                              const std::vector<std::pair<BufferedEventFrame, std::filesystem::path>>& frames,
                              std::size_t event_frame_index,
                              const EncodedClipResult& result,
                              std::string* error_message) {
    if (!EnsureParentDirectory(result.manifest_path, error_message)) {
        return false;
    }
    std::ofstream manifest(result.manifest_path, std::ios::out | std::ios::trunc);
    if (!manifest.good()) {
        if (error_message != nullptr) {
            *error_message = "failed to open encoded clip manifest";
        }
        return false;
    }
    const std::int64_t start_ms = std::max<std::int64_t>(0, record.update_time_ms - options.pre_event_ms);
    const std::int64_t end_ms = std::max<std::int64_t>(record.update_time_ms,
                                                       record.update_time_ms + options.post_event_ms);
    const int frame_interval_ms = result.fps > 0 ? std::max(1, 1000 / result.fps) : 1000;
    const std::size_t mapped_event_frame_index =
        frames.empty() ? 0 : std::min(event_frame_index, frames.size() - 1U);
    manifest << "{"
             << "\"schema\":\"media-server.encoded-event-clip-contract.v1\","
             << "\"contractVersion\":1,"
             << "\"status\":\"completed\","
             << "\"sampleKind\":\"runtime-output\","
             << "\"inputSource\":\"frame-bundle\","
             << "\"queueName\":\"event-clip-encoder\","
             << "\"jobId\":\"" << JsonEscape(result.job_id) << "\","
             << "\"eventId\":\"" << JsonEscape(record.event_id) << "\","
             << "\"eventType\":\"" << JsonEscape(record.event_type) << "\","
             << "\"sourceId\":\"" << JsonEscape(record.stream_id.empty() ? "unknown-source" : record.stream_id)
             << "\","
             << "\"streamId\":\"" << JsonEscape(record.stream_id) << "\","
             << "\"channelId\":\"" << JsonEscape(record.channel_id.empty() ? "main" : record.channel_id)
             << "\","
             << "\"streamEpochId\":\"" << JsonEscape(FrameStreamEpochId(record)) << "\","
             << "\"createdAtMs\":" << NowMs() << ","
             << "\"captureWindow\":{"
             << "\"startMs\":" << start_ms
             << ",\"eventMs\":" << record.update_time_ms
             << ",\"endMs\":" << end_ms
             << "},"
             << "\"clip\":{"
             << "\"role\":\"encodedEventClip\","
             << "\"requiredWhenGenerated\":true,"
             << "\"storageKey\":\"" << JsonEscape(result.media_path) << "\","
             << "\"manifestStorageKey\":\"" << JsonEscape(result.manifest_path) << "\","
             << "\"durationMs\":" << result.duration_ms << ","
             << "\"startRelativeToEventMs\":" << -options.pre_event_ms << ","
             << "\"endRelativeToEventMs\":" << options.post_event_ms << ","
             << "\"byteSize\":" << result.byte_size << ","
             << "\"frameCount\":" << result.frame_count
             << "},"
             << "\"format\":{"
             << "\"container\":\"" << JsonEscape(result.format) << "\","
             << "\"mimeType\":\"" << JsonEscape(result.content_type) << "\","
             << "\"videoCodec\":\"" << JsonEscape(result.codec) << "\","
             << "\"extension\":\"" << JsonEscape(result.extension) << "\","
             << "\"allowedContainers\":[\"mp4\",\"webm\"],"
             << "\"allowedMimeTypes\":[\"video/mp4\",\"video/webm\"]"
             << "},"
             << "\"ptsMapping\":{"
             << "\"timescale\":1000,"
             << "\"clipStartPtsMs\":0,"
             << "\"eventSourcePtsMs\":" << record.update_time_ms << ","
             << "\"eventClipPtsMs\":"
             << (mapped_event_frame_index * static_cast<std::size_t>(frame_interval_ms))
             << ","
             << "\"clipEndPtsMs\":" << result.duration_ms << ","
             << "\"frames\":[";
    for (std::size_t index = 0; index < frames.size(); ++index) {
        if (index != 0) {
            manifest << ",";
        }
        manifest << "{"
                 << "\"phase\":\"" << FrameBundlePhase(index, mapped_event_frame_index) << "\","
                 << "\"frameRef\":";
        WriteFrameRefJson(manifest, record, frames[index].first);
        manifest << ",\"clipPtsMs\":" << (index * static_cast<std::size_t>(frame_interval_ms))
                 << ",\"relativeToEventMs\":"
                 << (frames[index].first.timestamp_ms - record.update_time_ms);
        if (index == mapped_event_frame_index) {
            manifest << ",\"artifactRefs\":[\"event-frame\",\"representative-image\"]";
        }
        manifest << "}";
    }
    manifest << "]"
             << "},"
             << "\"evidenceLinks\":{"
             << "\"evidenceManifestStorageKey\":\"" << JsonEscape(evidence_manifest_path.string()) << "\","
             << "\"frameBundleManifestStorageKey\":\"" << JsonEscape(frame_bundle_manifest_path.string()) << "\","
             << "\"eventFrameArtifactId\":\"event-frame\","
             << "\"representativeImageArtifactId\":\"representative-image\","
             << "\"bboxCropArtifactIds\":[";
    if (!record.bbox_crop_path.empty()) {
        manifest << "\"bbox-crop-1\"";
    }
    manifest << "]"
             << "},"
             << "\"input\":{"
             << "\"frameBundleManifest\":\"" << JsonEscape(frame_bundle_manifest_path.string()) << "\","
             << "\"frameCount\":" << result.frame_count
             << "},"
             << "\"output\":{"
             << "\"path\":\"" << JsonEscape(result.media_path) << "\","
             << "\"format\":\"" << JsonEscape(result.format) << "\","
             << "\"codec\":\"" << JsonEscape(result.codec) << "\","
             << "\"contentType\":\"" << JsonEscape(result.content_type) << "\","
             << "\"byteSize\":" << result.byte_size << ","
             << "\"fps\":" << result.fps << ","
             << "\"durationMs\":" << result.duration_ms
             << "},"
             << "\"cleanup\":{"
             << "\"partialOutputDeleted\":true,"
             << "\"deletedEntries\":" << result.cleanup_deleted_entries
             << "},"
             << "\"frameMap\":[";
    for (std::size_t index = 0; index < frames.size(); ++index) {
        if (index != 0) {
            manifest << ",";
        }
        manifest << "{"
                 << "\"frameIndex\":" << index << ","
                 << "\"sourceFrame\":\"" << JsonEscape(frames[index].second.string()) << "\","
                 << "\"ptsMs\":" << frames[index].first.timestamp_ms << ","
                 << "\"relativeToEventMs\":"
                 << (frames[index].first.timestamp_ms - record.update_time_ms) << ","
                 << "\"encodedFrameIndex\":" << index
                 << "}";
    }
    manifest << "],"
             << "\"retention\":{"
             << "\"inheritsEventRetention\":true,"
             << "\"defaultDays\":7,"
             << "\"pinnedExcludesAutomaticCleanup\":true,"
             << "\"cleanupRequiresDryRun\":true,"
             << "\"lifecycleGroup\":[\"eventRecord\",\"evidenceManifest\",\"frameBundle\",\"encodedClip\",\"featureRevision\",\"searchIndex\",\"auditTrail\"]"
             << "},"
             << "\"retentionExportHardening\":{"
             << "\"schema\":\"media-server.v310.retention-export-hardening.v1\","
             << "\"implementedInStep\":\"V310-S08\","
             << "\"encodedClipLifecycleCleanup\":true,"
             << "\"retentionCleanupAction\":\"encoded-clip-retention-export-hardening\","
             << "\"exportBundleAuditCoverage\":true,"
             << "\"releaseSafeExportExcludesEncodedMedia\":true,"
             << "\"tokenExpiryNoServerFile\":true"
             << "},"
             << "\"privacy\":{"
             << "\"rawPromptStored\":false,"
             << "\"rawProviderResponseStored\":false,"
             << "\"providerCredentialStored\":false,"
             << "\"sourceUrlStored\":false,"
             << "\"identityFeaturesAllowed\":false,"
             << "\"faceRecognitionAllowed\":false"
             << "},"
             << "\"nonVmsBoundary\":{"
             << "\"boundedShortSegment\":true,"
             << "\"alwaysOnRecording\":false,"
             << "\"continuousRecording\":false,"
             << "\"continuousSegmentIndex\":false,"
             << "\"vmsArchiveApi\":false,"
             << "\"broadArchivePlayback\":false,"
             << "\"onDemandArbitraryWindowExport\":false,"
             << "\"clientViewerExposure\":false,"
             << "\"cloudProviderDefaultOn\":false,"
             << "\"archiveApi\":false,"
             << "\"maxOutputFrames\":" << kMaxClipOutputFrames
             << "},"
             << "\"generationBoundary\":{"
             << "\"pipelineImplementedInThisStep\":true,"
             << "\"queueStatusImplementedInThisStep\":true,"
             << "\"partialOutputCleanupImplementedInThisStep\":true,"
             << "\"encoderPipelineStep\":\"V310-S02\""
             << "}"
             << "}\n";
    if (!manifest.good()) {
        if (error_message != nullptr) {
            *error_message = "failed to write encoded clip manifest";
        }
        return false;
    }
    if (error_message != nullptr) {
        error_message->clear();
    }
    return true;
}

bool EncodeEventClipArtifact(const EventRecord& record,
                             const EventMediaHookOptions& options,
                             const std::filesystem::path& evidence_manifest_path,
                             const std::filesystem::path& frame_bundle_manifest_path,
                             const std::vector<std::pair<BufferedEventFrame, std::filesystem::path>>& frames,
                             std::size_t event_frame_index,
                             EncodedClipResult* result,
                             std::string* error_message) {
    if (result == nullptr) {
        if (error_message != nullptr) {
            *error_message = "missing encoded clip result";
        }
        return false;
    }
    *result = EncodedClipResult{};
    result->job_id = SanitizePathToken(record.event_id) + "-" + std::to_string(NextSequence());
    result->frame_count = frames.size();

    const std::filesystem::path encoded_dir = frame_bundle_manifest_path.parent_path() / "encoded";
    result->cleanup_deleted_entries = CleanupEncodedClipOutput(encoded_dir);
    std::error_code ec;
    std::filesystem::create_directories(encoded_dir, ec);
    if (ec) {
        if (error_message != nullptr) {
            *error_message = ec.message();
        }
        return false;
    }

    std::vector<unsigned char> webm;
    if (!BuildWebmClip(frames, &webm, &result->fps, &result->duration_ms, error_message)) {
        return false;
    }
    const std::filesystem::path media_path = encoded_dir / "event-clip.webm";
    if (!WriteBinaryFile(media_path, webm, error_message)) {
        return false;
    }
    result->media_path = media_path.string();
    result->byte_size = static_cast<std::uint64_t>(webm.size());
    result->manifest_path = (encoded_dir / "encoded-manifest.json").string();
    if (!WriteEncodedClipManifest(record,
                                  options,
                                  evidence_manifest_path,
                                  frame_bundle_manifest_path,
                                  frames,
                                  event_frame_index,
                                  *result,
                                  error_message)) {
        return false;
    }
    if (error_message != nullptr) {
        error_message->clear();
    }
    return true;
}

std::string FrameStreamEpochId(const EventRecord& record) {
    const std::string source = record.stream_id.empty() ? "unknown-source" : record.stream_id;
    const std::string channel = record.channel_id.empty() ? "main" : record.channel_id;
    return "event-buffer-" + SanitizePathToken(source + "-" + channel);
}

const char* FrameBundlePhase(std::size_t index, std::size_t event_frame_index) {
    if (index < event_frame_index) {
        return "pre";
    }
    if (index == event_frame_index) {
        return "event";
    }
    return "post";
}

void WriteFrameRefJson(std::ostream& out,
                       const EventRecord& record,
                       const BufferedEventFrame& frame) {
    out << "{"
        << "\"sourceId\":\"" << JsonEscape(record.stream_id.empty() ? "unknown-source" : record.stream_id) << "\","
        << "\"channelId\":\"" << JsonEscape(record.channel_id.empty() ? "main" : record.channel_id) << "\","
        << "\"streamEpochId\":\"" << JsonEscape(FrameStreamEpochId(record)) << "\","
        << "\"frameSeq\":" << frame.sequence << ","
        << "\"ptsMs\":" << frame.timestamp_ms << ","
        << "\"wallClockMs\":" << frame.timestamp_ms << ","
        << "\"relativeToEventMs\":" << (frame.timestamp_ms - record.update_time_ms)
        << "}";
}

void WriteFrameArtifactJson(std::ostream& out,
                            const EventRecord& record,
                            const std::pair<BufferedEventFrame, std::filesystem::path>& item,
                            std::size_t index,
                            std::size_t event_frame_index) {
    out << "{"
        << "\"index\":" << index << ","
        << "\"artifactId\":\"frame-" << std::setw(4) << std::setfill('0') << (index + 1)
        << std::setfill(' ') << "\","
        << "\"phase\":\"" << FrameBundlePhase(index, event_frame_index) << "\","
        << "\"path\":\"" << JsonEscape(item.second.string()) << "\","
        << "\"frameRef\":";
    WriteFrameRefJson(out, record, item.first);
    out << "}";
}

bool WriteFrameBundleManifest(
    const EventRecord& record,
    const EventMediaHookOptions& options,
    const std::filesystem::path& manifest_path,
    const std::vector<std::pair<BufferedEventFrame, std::filesystem::path>>& frames,
    std::size_t event_frame_index,
    std::string* error_message) {
    if (frames.empty() || event_frame_index >= frames.size()) {
        if (error_message != nullptr) {
            *error_message = "missing frame bundle frames";
        }
        return false;
    }
    if (!EnsureParentDirectory(manifest_path, error_message)) {
        return false;
    }
    std::ofstream manifest(manifest_path, std::ios::out | std::ios::trunc);
    if (!manifest.good()) {
        if (error_message != nullptr) {
            *error_message = "failed to open frame bundle manifest";
        }
        return false;
    }
    std::size_t pre_count = 0;
    std::size_t event_count = 0;
    std::size_t post_count = 0;
    for (std::size_t index = 0; index < frames.size(); ++index) {
        const std::string phase = FrameBundlePhase(index, event_frame_index);
        if (phase == "pre") {
            ++pre_count;
        } else if (phase == "event") {
            ++event_count;
        } else {
            ++post_count;
        }
    }
    const std::int64_t start_ms = std::max<std::int64_t>(0, record.update_time_ms - options.pre_event_ms);
    const std::int64_t end_ms = std::max<std::int64_t>(record.update_time_ms,
                                                       record.update_time_ms + options.post_event_ms);
    manifest << "{"
             << "\"schema\":\"media-server.va.frame-bundle.v1\","
             << "\"eventId\":\"" << JsonEscape(record.event_id) << "\","
             << "\"eventType\":\"" << JsonEscape(record.event_type) << "\","
             << "\"sourceId\":\"" << JsonEscape(record.stream_id.empty() ? "unknown-source" : record.stream_id)
             << "\","
             << "\"channelId\":\"" << JsonEscape(record.channel_id.empty() ? "main" : record.channel_id)
             << "\","
             << "\"streamEpochId\":\"" << JsonEscape(FrameStreamEpochId(record)) << "\","
             << "\"captureWindow\":{"
             << "\"startMs\":" << start_ms
             << ",\"eventMs\":" << record.update_time_ms
             << ",\"endMs\":" << end_ms
             << "},"
             << "\"frameCount\":" << frames.size() << ","
             << "\"phaseCounts\":{"
             << "\"pre\":" << pre_count << ","
             << "\"event\":" << event_count << ","
             << "\"post\":" << post_count
             << "},"
             << "\"frames\":[";
    for (std::size_t index = 0; index < frames.size(); ++index) {
        if (index != 0) {
            manifest << ",";
        }
        WriteFrameArtifactJson(manifest, record, frames[index], index, event_frame_index);
    }
    manifest << "]"
             << "}\n";
    if (!manifest.good()) {
        if (error_message != nullptr) {
            *error_message = "failed to write frame bundle manifest";
        }
        return false;
    }
    if (error_message != nullptr) {
        error_message->clear();
    }
    return true;
}

bool WriteEvidenceManifest(
    const EventRecord& record,
    const std::filesystem::path& manifest_path,
    const std::filesystem::path& frame_bundle_manifest_path,
    const std::vector<std::pair<BufferedEventFrame, std::filesystem::path>>& frames,
    std::size_t event_frame_index,
    std::string* error_message) {
    if (frames.empty() || event_frame_index >= frames.size()) {
        if (error_message != nullptr) {
            *error_message = "missing evidence frames";
        }
        return false;
    }
    if (!EnsureParentDirectory(manifest_path, error_message)) {
        return false;
    }
    std::ofstream manifest(manifest_path, std::ios::out | std::ios::trunc);
    if (!manifest.good()) {
        if (error_message != nullptr) {
            *error_message = "failed to open event evidence manifest";
        }
        return false;
    }
    const auto& event_frame = frames[event_frame_index];
    manifest << "{"
             << "\"schema\":\"media-server.event-evidence-contract.v1\","
             << "\"contractVersion\":1,"
             << "\"eventId\":\"" << JsonEscape(record.event_id) << "\","
             << "\"sourceId\":\"" << JsonEscape(record.stream_id.empty() ? "unknown-source" : record.stream_id)
             << "\","
             << "\"channelId\":\"" << JsonEscape(record.channel_id.empty() ? "main" : record.channel_id)
             << "\","
             << "\"streamEpochId\":\"" << JsonEscape(FrameStreamEpochId(record)) << "\","
             << "\"createdAtMs\":" << NowMs() << ","
             << "\"artifacts\":{"
             << "\"eventFrame\":{"
             << "\"artifactId\":\"event-frame\","
             << "\"role\":\"eventFrame\","
             << "\"required\":true,"
             << "\"path\":\"" << JsonEscape(event_frame.second.string()) << "\","
             << "\"frameRef\":";
    WriteFrameRefJson(manifest, record, event_frame.first);
    manifest << "},"
             << "\"representativeImage\":{"
             << "\"artifactId\":\"representative-image\","
             << "\"selected\":true,"
             << "\"sameAsEventFrame\":true,"
             << "\"retainedAsSeparateArtifact\":false,"
             << "\"selectionReason\":\"event-frame-is-trigger-time-evidence\","
             << "\"path\":\"" << JsonEscape(event_frame.second.string()) << "\","
             << "\"frameRef\":";
    WriteFrameRefJson(manifest, record, event_frame.first);
    manifest << "},"
             << "\"bboxCrops\":[";
    if (!record.bbox_crop_path.empty()) {
        manifest << "{"
                 << "\"artifactId\":\"bbox-crop-1\","
                 << "\"parentArtifactId\":\"event-frame\","
                 << "\"path\":\"" << JsonEscape(record.bbox_crop_path) << "\","
                 << "\"bbox\":{"
                 << "\"x\":" << record.bbox.x << ","
                 << "\"y\":" << record.bbox.y << ","
                 << "\"width\":" << record.bbox.width << ","
                 << "\"height\":" << record.bbox.height
                 << "},"
                 << "\"frameRef\":";
        WriteFrameRefJson(manifest, record, event_frame.first);
        manifest << "}";
    }
    manifest << "],"
             << "\"frameBundle\":{"
             << "\"artifactId\":\"frame-bundle\","
             << "\"schema\":\"media-server.va.frame-bundle.v1\","
             << "\"manifestPath\":\"" << JsonEscape(frame_bundle_manifest_path.string()) << "\""
             << "}"
             << "},"
             << "\"retention\":{"
             << "\"defaultRetentionDays\":7,"
             << "\"pinned\":false,"
             << "\"cleanupRequiresDryRun\":true"
             << "},"
             << "\"privacy\":{"
             << "\"rawPromptStored\":false,"
             << "\"rawResponseStored\":false,"
             << "\"providerRequestBodyStored\":false,"
             << "\"identityFeaturesAllowed\":false,"
             << "\"faceRecognitionAllowed\":false"
             << "},"
             << "\"nonVmsBoundary\":{"
             << "\"continuousRecording\":false,"
             << "\"archiveApi\":false,"
             << "\"vmsNvrArchiveApi\":false,"
             << "\"encodedClipPlayback\":false"
             << "}"
             << "}\n";
    if (!manifest.good()) {
        if (error_message != nullptr) {
            *error_message = "failed to write event evidence manifest";
        }
        return false;
    }
    if (error_message != nullptr) {
        error_message->clear();
    }
    return true;
}

class EventFrameBuffer {
public:
    void Record(const std::string& stream_id, const std::string& channel_id, const RawVideoFrame& frame) {
        const auto& config = app::GetAppConfig();
        if (!config.analysis_event_snapshot_hook_enabled && !config.analysis_event_clip_hook_enabled) {
            return;
        }
        if (frame.width <= 0 || frame.height <= 0 || frame.data.empty()) {
            return;
        }
        const std::string key = FrameBufferKey(stream_id, channel_id);
        const std::int64_t timestamp_ms = FrameTimestampMs(frame);
        const std::int64_t buffer_ms = std::max<std::int64_t>(
            1000,
            std::max<std::int64_t>(
                config.analysis_event_clip_buffer_ms,
                static_cast<std::int64_t>(config.analysis_event_pre_event_ms) +
                    static_cast<std::int64_t>(config.analysis_event_post_event_ms) + 1000));
        std::lock_guard lock(mu_);
        if (buffers_.find(key) == buffers_.end() && buffers_.size() >= kMaxBufferedRecorderStreams) {
            buffers_.erase(buffers_.begin());
        }
        auto& frames = buffers_[key];
        frames.push_back(BufferedEventFrame{frame, timestamp_ms, NextSequence()});
        while (!frames.empty() &&
               (frames.front().timestamp_ms + buffer_ms < timestamp_ms ||
                frames.size() > kMaxBufferedFramesPerStream)) {
            frames.pop_front();
        }
        cv_.notify_all();
    }

    std::optional<BufferedEventFrame> ClosestFrame(const EventRecord& record) {
        std::lock_guard lock(mu_);
        auto* frames = FramesLocked(record);
        if (frames == nullptr || frames->empty()) {
            return std::nullopt;
        }
        const std::int64_t event_ms = record.update_time_ms;
        auto best = frames->begin();
        auto best_delta = std::llabs(best->timestamp_ms - event_ms);
        for (auto it = frames->begin(); it != frames->end(); ++it) {
            const auto delta = std::llabs(it->timestamp_ms - event_ms);
            if (delta < best_delta || (delta == best_delta && it->timestamp_ms <= event_ms)) {
                best = it;
                best_delta = delta;
            }
        }
        return *best;
    }

    std::vector<BufferedEventFrame> FramesForClip(const EventRecord& record,
                                                  const EventMediaHookOptions& options) {
        const std::int64_t event_ms = record.update_time_ms;
        const std::int64_t start_ms = std::max<std::int64_t>(0, event_ms - options.pre_event_ms);
        const std::int64_t end_ms = std::max<std::int64_t>(event_ms, event_ms + options.post_event_ms);
        const auto wait_ms = std::chrono::milliseconds(
            std::max(0, std::min(options.post_event_ms, options.clip_buffer_ms)));
        const auto deadline = std::chrono::steady_clock::now() + wait_ms;

        std::unique_lock lock(mu_);
        cv_.wait_until(lock, deadline, [&] {
            const auto* frames = FramesLocked(record);
            return frames != nullptr && !frames->empty() && frames->back().timestamp_ms >= end_ms;
        });
        const auto* frames = FramesLocked(record);
        if (frames == nullptr || frames->empty()) {
            return {};
        }
        std::vector<BufferedEventFrame> selected;
        for (const auto& frame : *frames) {
            if (frame.timestamp_ms < start_ms || frame.timestamp_ms > end_ms) {
                continue;
            }
            selected.push_back(frame);
        }
        if (selected.empty()) {
            auto best = frames->begin();
            auto best_delta = std::llabs(best->timestamp_ms - event_ms);
            for (auto it = frames->begin(); it != frames->end(); ++it) {
                const auto delta = std::llabs(it->timestamp_ms - event_ms);
                if (delta < best_delta) {
                    best = it;
                    best_delta = delta;
                }
            }
            selected.push_back(*best);
        }
        if (selected.size() > kMaxClipOutputFrames) {
            const std::size_t step =
                std::max<std::size_t>(1, selected.size() / kMaxClipOutputFrames);
            std::vector<BufferedEventFrame> downsampled;
            downsampled.reserve(kMaxClipOutputFrames);
            for (std::size_t index = 0; index < selected.size() &&
                                        downsampled.size() < kMaxClipOutputFrames;
                 index += step) {
                downsampled.push_back(selected[index]);
            }
            selected = std::move(downsampled);
        }
        return selected;
    }

private:
    const std::deque<BufferedEventFrame>* FramesLocked(const EventRecord& record) const {
        auto it = buffers_.find(FrameBufferKey(record.stream_id, record.channel_id));
        if (it != buffers_.end()) {
            return &it->second;
        }
        it = buffers_.find(FrameBufferKey(record.stream_id, record.stream_id));
        if (it != buffers_.end()) {
            return &it->second;
        }
        return nullptr;
    }

    mutable std::mutex mu_;
    std::condition_variable cv_;
    std::unordered_map<std::string, std::deque<BufferedEventFrame>> buffers_;
};

EventFrameBuffer& RecorderFrameBuffer() {
    static EventFrameBuffer buffer;
    return buffer;
}

bool WriteHookMarker(const EventRecord& record,
                     const EventMediaHookOptions& options,
                     const std::string& kind,
                     std::string* output_path,
                     std::string* error_message) {
    if (!options.enabled) {
        if (output_path != nullptr) {
            output_path->clear();
        }
        if (error_message != nullptr) {
            error_message->clear();
        }
        return true;
    }
    const std::filesystem::path dir(options.directory.empty() ? "." : options.directory);
    std::error_code ec;
    std::filesystem::create_directories(dir, ec);
    if (ec) {
        if (error_message != nullptr) {
            *error_message = ec.message();
        }
        return false;
    }

    const std::filesystem::path path =
        dir / (SanitizePathToken(record.event_id) + "." + kind + ".json");
    std::ofstream output(path, std::ios::out | std::ios::trunc);
    if (!output.good()) {
        if (error_message != nullptr) {
            *error_message = "failed to open " + kind + " hook marker";
        }
        return false;
    }
    output << "{"
           << "\"schema\":\"media-server.va.event-" << kind << "-hook.v1\","
           << "\"captureStatus\":\"manifest-only\","
           << "\"recorded\":false,"
           << "\"eventId\":\"" << JsonEscape(record.event_id) << "\","
           << "\"eventType\":\"" << JsonEscape(record.event_type) << "\","
           << "\"streamId\":\"" << JsonEscape(record.stream_id) << "\","
           << "\"channelId\":\"" << JsonEscape(record.channel_id) << "\","
           << "\"trackId\":" << record.track_id << ","
           << "\"timestampMs\":" << record.update_time_ms << ","
           << "\"captureWindow\":{"
           << "\"startMs\":" << std::max<std::int64_t>(0, record.update_time_ms - options.pre_event_ms)
           << ",\"eventMs\":" << record.update_time_ms
           << ",\"endMs\":" << std::max<std::int64_t>(0, record.update_time_ms + options.post_event_ms)
           << "},"
           << "\"preEventMs\":" << options.pre_event_ms << ","
           << "\"postEventMs\":" << options.post_event_ms << ","
           << "\"clipBufferMs\":" << options.clip_buffer_ms << ","
           << "\"eventStatus\":\"" << JsonEscape(record.status) << "\","
           << "\"zoneId\":\"" << JsonEscape(record.zone_id) << "\","
           << "\"lineId\":\"" << JsonEscape(record.line_id) << "\","
           << "\"scenarioName\":\"" << JsonEscape(record.scenario_name) << "\","
           << "\"scenarioPhase\":\"" << JsonEscape(record.scenario_phase) << "\","
           << "\"note\":\"recorder manifest only; media bytes are not captured by this file hook\""
           << "}\n";
    if (!output.good()) {
        if (error_message != nullptr) {
            *error_message = "failed to write " + kind + " hook marker";
        }
        return false;
    }
    if (output_path != nullptr) {
        *output_path = path.string();
    }
    if (error_message != nullptr) {
        error_message->clear();
    }
    return true;
}

bool WriteSnapshotMedia(const EventRecord& record,
                        const EventMediaHookOptions& options,
                        std::string* snapshot_path,
                        std::string* error_message) {
    if (!options.enabled) {
        if (snapshot_path != nullptr) {
            snapshot_path->clear();
        }
        if (error_message != nullptr) {
            error_message->clear();
        }
        return true;
    }
    const auto frame = RecorderFrameBuffer().ClosestFrame(record);
    if (!frame.has_value()) {
        return WriteHookMarker(record, options, "snapshot", snapshot_path, error_message);
    }
    EncodedRecorderFrame encoded;
    if (!EncodeRecorderFrame(frame->frame, 85, &encoded, error_message)) {
        return false;
    }
    const std::filesystem::path dir(options.directory.empty() ? "." : options.directory);
    const std::string token = SanitizePathToken(record.event_id) + ".snapshot";
    const std::filesystem::path media_path = dir / (token + encoded.extension);
    if (!WriteBinaryFile(media_path, encoded.data, error_message)) {
        return false;
    }

    const std::filesystem::path manifest_path = dir / (token + ".json");
    if (!EnsureParentDirectory(manifest_path, error_message)) {
        return false;
    }
    std::ofstream manifest(manifest_path, std::ios::out | std::ios::trunc);
    if (!manifest.good()) {
        if (error_message != nullptr) {
            *error_message = "failed to open snapshot recorder manifest";
        }
        return false;
    }
    manifest << "{"
             << "\"schema\":\"media-server.va.event-snapshot-hook.v1\","
             << "\"captureStatus\":\"recorded\","
             << "\"recorded\":true,"
             << "\"eventId\":\"" << JsonEscape(record.event_id) << "\","
             << "\"eventType\":\"" << JsonEscape(record.event_type) << "\","
             << "\"streamId\":\"" << JsonEscape(record.stream_id) << "\","
             << "\"channelId\":\"" << JsonEscape(record.channel_id) << "\","
             << "\"trackId\":" << record.track_id << ","
             << "\"timestampMs\":" << record.update_time_ms << ","
             << "\"framePtsMs\":" << frame->timestamp_ms << ","
             << "\"mediaPath\":\"" << JsonEscape(media_path.string()) << "\","
             << "\"contentType\":\"" << JsonEscape(encoded.content_type) << "\","
             << "\"byteSize\":" << encoded.data.size() << ","
             << "\"fallbackEncoder\":" << (encoded.fallback_encoder ? "true" : "false") << ","
             << "\"fallbackReason\":\"" << JsonEscape(encoded.fallback_reason) << "\","
             << "\"captureWindow\":{"
             << "\"startMs\":" << std::max<std::int64_t>(0, record.update_time_ms - options.pre_event_ms)
             << ",\"eventMs\":" << record.update_time_ms
             << ",\"endMs\":" << std::max<std::int64_t>(0, record.update_time_ms + options.post_event_ms)
             << "},"
             << "\"eventStatus\":\"" << JsonEscape(record.status) << "\","
             << "\"zoneId\":\"" << JsonEscape(record.zone_id) << "\","
             << "\"lineId\":\"" << JsonEscape(record.line_id) << "\","
             << "\"scenarioName\":\"" << JsonEscape(record.scenario_name) << "\","
             << "\"scenarioPhase\":\"" << JsonEscape(record.scenario_phase) << "\""
             << "}\n";
    if (!manifest.good()) {
        if (error_message != nullptr) {
            *error_message = "failed to write snapshot recorder manifest";
        }
        return false;
    }
    if (snapshot_path != nullptr) {
        *snapshot_path = media_path.string();
    }
    if (error_message != nullptr) {
        error_message->clear();
    }
    return true;
}

bool WriteBboxCropMedia(const EventRecord& record,
                        const EventMediaHookOptions& options,
                        std::string* crop_path,
                        std::string* error_message) {
    if (!options.enabled || !record.bbox_available) {
        if (crop_path != nullptr) {
            crop_path->clear();
        }
        if (error_message != nullptr) {
            error_message->clear();
        }
        return true;
    }
    const auto frame = RecorderFrameBuffer().ClosestFrame(record);
    if (!frame.has_value()) {
        return WriteHookMarker(record, options, "bbox-crop", crop_path, error_message);
    }
    const auto crop = CropFrameToBbox(frame->frame, record.bbox, error_message);
    if (!crop.has_value()) {
        return WriteHookMarker(record, options, "bbox-crop", crop_path, error_message);
    }
    EncodedRecorderFrame encoded;
    if (!EncodeRecorderFrame(*crop, 85, &encoded, error_message)) {
        return false;
    }
    const std::filesystem::path dir(options.directory.empty() ? "." : options.directory);
    const std::string token = SanitizePathToken(record.event_id) + ".bbox-crop";
    const std::filesystem::path media_path = dir / (token + encoded.extension);
    if (!WriteBinaryFile(media_path, encoded.data, error_message)) {
        return false;
    }

    const std::filesystem::path manifest_path = dir / (token + ".json");
    if (!EnsureParentDirectory(manifest_path, error_message)) {
        return false;
    }
    std::ofstream manifest(manifest_path, std::ios::out | std::ios::trunc);
    if (!manifest.good()) {
        if (error_message != nullptr) {
            *error_message = "failed to open bbox crop recorder manifest";
        }
        return false;
    }
    manifest << "{"
             << "\"schema\":\"media-server.va.event-bbox-crop-hook.v1\","
             << "\"captureStatus\":\"recorded\","
             << "\"recorded\":true,"
             << "\"eventId\":\"" << JsonEscape(record.event_id) << "\","
             << "\"eventType\":\"" << JsonEscape(record.event_type) << "\","
             << "\"streamId\":\"" << JsonEscape(record.stream_id) << "\","
             << "\"channelId\":\"" << JsonEscape(record.channel_id) << "\","
             << "\"trackId\":" << record.track_id << ","
             << "\"timestampMs\":" << record.update_time_ms << ","
             << "\"framePtsMs\":" << frame->timestamp_ms << ","
             << "\"bbox\":{"
             << "\"x\":" << record.bbox.x << ","
             << "\"y\":" << record.bbox.y << ","
             << "\"width\":" << record.bbox.width << ","
             << "\"height\":" << record.bbox.height
             << "},"
             << "\"mediaPath\":\"" << JsonEscape(media_path.string()) << "\","
             << "\"contentType\":\"" << JsonEscape(encoded.content_type) << "\","
             << "\"byteSize\":" << encoded.data.size() << ","
             << "\"cropWidth\":" << crop->width << ","
             << "\"cropHeight\":" << crop->height << ","
             << "\"fallbackEncoder\":" << (encoded.fallback_encoder ? "true" : "false") << ","
             << "\"fallbackReason\":\"" << JsonEscape(encoded.fallback_reason) << "\","
             << "\"redactionReview\":{"
             << "\"rawFrameBytesEmbedded\":false,"
             << "\"sourceUrlExposed\":false,"
             << "\"credentialMaterialExposed\":false"
             << "}"
             << "}\n";
    if (!manifest.good()) {
        if (error_message != nullptr) {
            *error_message = "failed to write bbox crop recorder manifest";
        }
        return false;
    }
    if (crop_path != nullptr) {
        *crop_path = media_path.string();
    }
    if (error_message != nullptr) {
        error_message->clear();
    }
    return true;
}

bool WriteClipMedia(const EventRecord& record,
                    const EventMediaHookOptions& options,
                    std::string* clip_path,
                    std::string* error_message) {
    if (!options.enabled) {
        if (clip_path != nullptr) {
            clip_path->clear();
        }
        if (error_message != nullptr) {
            error_message->clear();
        }
        return true;
    }
    const auto frames = RecorderFrameBuffer().FramesForClip(record, options);
    if (frames.empty()) {
        return WriteHookMarker(record, options, "clip", clip_path, error_message);
    }

    const std::filesystem::path dir(options.directory.empty() ? "." : options.directory);
    const std::filesystem::path clip_dir = dir / (SanitizePathToken(record.event_id) + ".clip");
    if (!EnsureParentDirectory(clip_dir / "manifest.json", error_message)) {
        return false;
    }
    std::vector<std::pair<BufferedEventFrame, std::filesystem::path>> written_frames;
    written_frames.reserve(frames.size());
    bool used_fallback = false;
    std::string last_fallback_reason;
    for (std::size_t index = 0; index < frames.size(); ++index) {
        EncodedRecorderFrame encoded;
        if (!EncodeRecorderFrame(frames[index].frame, 80, &encoded, error_message)) {
            return false;
        }
        used_fallback = used_fallback || encoded.fallback_encoder;
        if (!encoded.fallback_reason.empty()) {
            last_fallback_reason = encoded.fallback_reason;
        }
        std::ostringstream name;
        name << "frame-" << std::setw(4) << std::setfill('0') << (index + 1)
             << encoded.extension;
        const std::filesystem::path frame_path = clip_dir / name.str();
        if (!WriteBinaryFile(frame_path, encoded.data, error_message)) {
            return false;
        }
        written_frames.push_back({frames[index], frame_path});
    }

    auto closest_frame_index = [&]() {
        std::size_t best = 0;
        std::int64_t best_delta =
            std::llabs(written_frames[0].first.timestamp_ms - record.update_time_ms);
        for (std::size_t index = 1; index < written_frames.size(); ++index) {
            const auto delta = std::llabs(written_frames[index].first.timestamp_ms - record.update_time_ms);
            if (delta < best_delta) {
                best = index;
                best_delta = delta;
            }
        }
        return best;
    };
    const std::size_t event_frame_index = closest_frame_index();
    const std::filesystem::path manifest_path = clip_dir / "manifest.json";
    const std::filesystem::path frame_bundle_manifest_path = clip_dir / "frame-bundle-manifest.json";
    const std::filesystem::path evidence_manifest_path = clip_dir / "evidence-manifest.json";
    if (!WriteFrameBundleManifest(record,
                                  options,
                                  frame_bundle_manifest_path,
                                  written_frames,
                                  event_frame_index,
                                  error_message)) {
        return false;
    }
    if (!WriteEvidenceManifest(record,
                               evidence_manifest_path,
                               frame_bundle_manifest_path,
                               written_frames,
                               event_frame_index,
                               error_message)) {
        return false;
    }
    EncodedClipResult encoded_clip;
    if (!EncodeEventClipArtifact(record,
                                 options,
                                 evidence_manifest_path,
                                 frame_bundle_manifest_path,
                                 written_frames,
                                 event_frame_index,
                                 &encoded_clip,
                                 error_message)) {
        return false;
    }
    std::ofstream manifest(manifest_path, std::ios::out | std::ios::trunc);
    if (!manifest.good()) {
        if (error_message != nullptr) {
            *error_message = "failed to open clip recorder manifest";
        }
        return false;
    }
    const std::int64_t start_ms = std::max<std::int64_t>(0, record.update_time_ms - options.pre_event_ms);
    const std::int64_t end_ms = std::max<std::int64_t>(record.update_time_ms,
                                                       record.update_time_ms + options.post_event_ms);
    std::size_t previous_frame_index = event_frame_index;
    std::size_t next_frame_index = event_frame_index;
    for (std::size_t index = 0; index < written_frames.size(); ++index) {
        if (written_frames[index].first.timestamp_ms <= record.update_time_ms) {
            previous_frame_index = index;
        }
        if (written_frames[index].first.timestamp_ms >= record.update_time_ms) {
            next_frame_index = index;
            break;
        }
    }
    auto write_vlm_frame_ref = [&](const char* name, std::size_t index) {
        manifest << "\"" << name << "\":{"
                 << "\"path\":\"" << JsonEscape(written_frames[index].second.string()) << "\","
                 << "\"ptsMs\":" << written_frames[index].first.timestamp_ms
                 << "}";
    };
    manifest << "{"
             << "\"schema\":\"media-server.va.event-clip-hook.v1\","
             << "\"captureStatus\":\"recorded\","
             << "\"recorded\":true,"
             << "\"eventId\":\"" << JsonEscape(record.event_id) << "\","
             << "\"eventType\":\"" << JsonEscape(record.event_type) << "\","
             << "\"streamId\":\"" << JsonEscape(record.stream_id) << "\","
             << "\"channelId\":\"" << JsonEscape(record.channel_id) << "\","
             << "\"trackId\":" << record.track_id << ","
             << "\"timestampMs\":" << record.update_time_ms << ","
             << "\"preEventMs\":" << options.pre_event_ms << ","
             << "\"postEventMs\":" << options.post_event_ms << ","
             << "\"clipBufferMs\":" << options.clip_buffer_ms << ","
             << "\"captureWindow\":{"
             << "\"startMs\":" << start_ms
             << ",\"eventMs\":" << record.update_time_ms
             << ",\"endMs\":" << end_ms
             << "},"
             << "\"frameCount\":" << written_frames.size() << ","
             << "\"fallbackEncoder\":" << (used_fallback ? "true" : "false") << ","
             << "\"fallbackReason\":\"" << JsonEscape(last_fallback_reason) << "\","
             << "\"frameBundleManifest\":\"" << JsonEscape(frame_bundle_manifest_path.string()) << "\","
             << "\"evidenceManifest\":\"" << JsonEscape(evidence_manifest_path.string()) << "\","
             << "\"frames\":[";
    for (std::size_t index = 0; index < written_frames.size(); ++index) {
        if (index != 0) {
            manifest << ",";
        }
        manifest << "{"
                 << "\"index\":" << index << ","
                 << "\"ptsMs\":" << written_frames[index].first.timestamp_ms << ","
                 << "\"path\":\"" << JsonEscape(written_frames[index].second.string()) << "\""
                 << "}";
    }
    manifest << "],"
             << "\"vlmInputRefs\":{";
    write_vlm_frame_ref("previousFrame", previous_frame_index);
    manifest << ",";
    write_vlm_frame_ref("eventFrame", event_frame_index);
    manifest << ",";
    write_vlm_frame_ref("nextFrame", next_frame_index);
    manifest << "},"
             << "\"encodedClip\":{"
             << "\"schema\":\"media-server.encoded-event-clip-contract.v1\","
             << "\"status\":\"completed\","
             << "\"queueName\":\"event-clip-encoder\","
             << "\"jobId\":\"" << JsonEscape(encoded_clip.job_id) << "\","
             << "\"manifestPath\":\"" << JsonEscape(encoded_clip.manifest_path) << "\","
             << "\"mediaPath\":\"" << JsonEscape(encoded_clip.media_path) << "\","
             << "\"format\":\"" << JsonEscape(encoded_clip.format) << "\","
             << "\"codec\":\"" << JsonEscape(encoded_clip.codec) << "\","
             << "\"contentType\":\"" << JsonEscape(encoded_clip.content_type) << "\","
             << "\"extension\":\"" << JsonEscape(encoded_clip.extension) << "\","
             << "\"byteSize\":" << encoded_clip.byte_size << ","
             << "\"frameCount\":" << encoded_clip.frame_count << ","
             << "\"cleanupDeletedEntries\":" << encoded_clip.cleanup_deleted_entries << ","
             << "\"boundedShortSegment\":true,"
             << "\"continuousRecording\":false,"
             << "\"archiveApi\":false"
             << "},"
             << "\"eventStatus\":\"" << JsonEscape(record.status) << "\","
             << "\"zoneId\":\"" << JsonEscape(record.zone_id) << "\","
             << "\"lineId\":\"" << JsonEscape(record.line_id) << "\","
             << "\"scenarioName\":\"" << JsonEscape(record.scenario_name) << "\","
             << "\"scenarioPhase\":\"" << JsonEscape(record.scenario_phase) << "\""
             << "}\n";
    if (!manifest.good()) {
        if (error_message != nullptr) {
            *error_message = "failed to write clip recorder manifest";
        }
        return false;
    }
    if (clip_path != nullptr) {
        *clip_path = manifest_path.string();
    }
    if (error_message != nullptr) {
        error_message->clear();
    }
    return true;
}

class FileEventSnapshotHook final : public EventSnapshotHook {
public:
    bool CaptureSnapshot(const EventRecord& record,
                         const EventMediaHookOptions& options,
                         std::string* snapshot_path,
                         std::string* error_message) override {
        return WriteSnapshotMedia(record, options, snapshot_path, error_message);
    }
};

class FileEventClipHook final : public EventClipHook {
public:
    bool CaptureClip(const EventRecord& record,
                     const EventMediaHookOptions& options,
                     std::string* clip_path,
                     std::string* error_message) override {
        return WriteClipMedia(record, options, clip_path, error_message);
    }
};

class EventStorageDispatcher {
public:
    ~EventStorageDispatcher() {
        Stop();
    }

    void Enqueue(EventRecord record) {
        const auto& config = app::GetAppConfig();
        if (!config.analysis_event_storage_enabled) {
            return;
        }
        std::lock_guard lock(mu_);
        if (queue_.size() >= config.analysis_event_storage_max_queue) {
            queue_.pop_front();
            ++dropped_count_;
        }
        queue_.push_back(std::move(record));
        ++enqueued_count_;
        StartWorkerLocked();
        cv_.notify_one();
    }

    EventStorageSnapshot Snapshot() const {
        const auto& config = app::GetAppConfig();
        EventStorageSnapshot snapshot;
        {
            std::lock_guard lock(mu_);
            snapshot.enabled = config.analysis_event_storage_enabled;
            snapshot.path = config.analysis_event_storage_path;
            snapshot.active_path = config.analysis_event_storage_path;
            snapshot.queue_size = queue_.size();
            snapshot.max_queue_size = config.analysis_event_storage_max_queue;
            snapshot.enqueued_count = enqueued_count_;
            snapshot.stored_count = stored_count_;
            snapshot.failed_count = failed_count_;
            snapshot.write_failed_count = failed_count_;
            snapshot.dropped_count = dropped_count_;
            snapshot.rotated_count = rotated_count_;
            snapshot.rotation_failed_count = rotation_failed_count_;
            snapshot.retention_deleted_count = retention_deleted_count_;
            snapshot.retention_deleted_bytes = retention_deleted_bytes_;
            snapshot.retention_failed_count = retention_failed_count_;
            snapshot.snapshot_hook_enabled = config.analysis_event_snapshot_hook_enabled;
            snapshot.clip_hook_enabled = config.analysis_event_clip_hook_enabled;
            snapshot.snapshot_dir = config.analysis_event_snapshot_dir;
            snapshot.clip_dir = config.analysis_event_clip_dir;
            snapshot.pre_event_ms = config.analysis_event_pre_event_ms;
            snapshot.post_event_ms = config.analysis_event_post_event_ms;
            snapshot.clip_buffer_ms = config.analysis_event_clip_buffer_ms;
            snapshot.snapshot_hook_failed_count = snapshot_hook_failed_count_;
            snapshot.clip_hook_failed_count = clip_hook_failed_count_;
            snapshot.last_snapshot_error = last_snapshot_error_;
            snapshot.last_clip_error = last_clip_error_;
            snapshot.last_error = last_error_;
        }
        ApplyFileStats(&snapshot);
        ApplyRecoveryScan(&snapshot);
        return snapshot;
    }

    void Stop() {
        {
            std::lock_guard lock(mu_);
            stop_ = true;
            cv_.notify_all();
        }
        if (worker_.joinable()) {
            worker_.join();
        }
    }

private:
    void StartWorkerLocked() {
        if (worker_started_) {
            return;
        }
        worker_started_ = true;
        worker_ = std::thread([this] { WorkerLoop(); });
    }

    void WorkerLoop() {
        while (true) {
            EventRecord record;
            {
                std::unique_lock lock(mu_);
                cv_.wait(lock, [this] { return stop_ || !queue_.empty(); });
                if (stop_ && queue_.empty()) {
                    return;
                }
                record = std::move(queue_.front());
                queue_.pop_front();
            }

            ApplyMediaHooks(&record);
            const std::uint64_t next_record_bytes =
                static_cast<std::uint64_t>(EventRecordJson(record).size() + 1);
            bool rotated = false;
            std::string rotation_error;
            if (RotateActiveEventStorageIfNeeded(next_record_bytes, &rotated, &rotation_error)) {
                if (rotated) {
                    std::lock_guard lock(mu_);
                    ++rotated_count_;
                }
            } else {
                std::lock_guard lock(mu_);
                ++rotation_failed_count_;
                last_error_ = TrimForLog(rotation_error.empty() ? "failed to rotate event storage"
                                                                : rotation_error);
            }
            FileEventStorage storage(app::GetAppConfig().analysis_event_storage_path);
            std::string error_message;
            if (storage.Store(record, &error_message)) {
                if (rotated) {
                    const RetentionResult retention = ApplyEventStorageRetention();
                    if (retention.deleted_count > 0 || retention.deleted_bytes > 0 ||
                        retention.failed_count > 0) {
                        std::lock_guard lock(mu_);
                        retention_deleted_count_ += retention.deleted_count;
                        retention_deleted_bytes_ += retention.deleted_bytes;
                        retention_failed_count_ += retention.failed_count;
                        if (!retention.last_error.empty()) {
                            last_error_ = TrimForLog(retention.last_error);
                        }
                    }
                }
                std::lock_guard lock(mu_);
                ++stored_count_;
                continue;
            }
            {
                std::lock_guard lock(mu_);
                ++failed_count_;
                last_error_ = TrimForLog(error_message.empty() ? "failed to store event record" : error_message);
            }
            std::cerr << "[event-storage] failed path=" << app::GetAppConfig().analysis_event_storage_path
                      << " error=" << error_message << "\n";
        }
    }

    void ApplyMediaHooks(EventRecord* record) {
        if (record == nullptr) {
            return;
        }
        const auto& config = app::GetAppConfig();
        record->pre_event_ms = config.analysis_event_pre_event_ms;
        record->post_event_ms = config.analysis_event_post_event_ms;

        EventMediaHookOptions snapshot_options;
        snapshot_options.enabled = config.analysis_event_snapshot_hook_enabled;
        snapshot_options.directory = config.analysis_event_snapshot_dir;
        snapshot_options.pre_event_ms = config.analysis_event_pre_event_ms;
        snapshot_options.post_event_ms = config.analysis_event_post_event_ms;
        snapshot_options.clip_buffer_ms = config.analysis_event_clip_buffer_ms;
        FileEventSnapshotHook file_snapshot_hook;
        NoOpEventSnapshotHook noop_snapshot_hook;
        EventSnapshotHook& snapshot_hook =
            snapshot_options.enabled ? static_cast<EventSnapshotHook&>(file_snapshot_hook)
                                     : static_cast<EventSnapshotHook&>(noop_snapshot_hook);
        std::string snapshot_path;
        std::string error_message;
        if (snapshot_hook.CaptureSnapshot(*record, snapshot_options, &snapshot_path, &error_message)) {
            record->snapshot_path = snapshot_path;
        } else {
            std::lock_guard lock(mu_);
            ++snapshot_hook_failed_count_;
            last_snapshot_error_ = TrimForLog(error_message);
        }
        std::string bbox_crop_path;
        error_message.clear();
        if (WriteBboxCropMedia(*record, snapshot_options, &bbox_crop_path, &error_message)) {
            record->bbox_crop_path = bbox_crop_path;
        } else {
            std::lock_guard lock(mu_);
            ++snapshot_hook_failed_count_;
            last_snapshot_error_ = TrimForLog(error_message);
        }

        EventMediaHookOptions clip_options;
        clip_options.enabled = config.analysis_event_clip_hook_enabled;
        clip_options.directory = config.analysis_event_clip_dir;
        clip_options.pre_event_ms = config.analysis_event_pre_event_ms;
        clip_options.post_event_ms = config.analysis_event_post_event_ms;
        clip_options.clip_buffer_ms = config.analysis_event_clip_buffer_ms;
        FileEventClipHook file_clip_hook;
        NoOpEventClipHook noop_clip_hook;
        EventClipHook& clip_hook = clip_options.enabled ? static_cast<EventClipHook&>(file_clip_hook)
                                                        : static_cast<EventClipHook&>(noop_clip_hook);
        std::string clip_path;
        error_message.clear();
        if (clip_hook.CaptureClip(*record, clip_options, &clip_path, &error_message)) {
            record->clip_path = clip_path;
        } else {
            std::lock_guard lock(mu_);
            ++clip_hook_failed_count_;
            last_clip_error_ = TrimForLog(error_message);
        }
        AttachVlmEvidenceRefs(record);
    }

    static void ApplyFileStats(EventStorageSnapshot* snapshot) {
        if (snapshot == nullptr) {
            return;
        }
        const std::filesystem::path active_path(snapshot->active_path.empty() ? snapshot->path
                                                                              : snapshot->active_path);
        std::error_code ec;
        if (!active_path.empty() && std::filesystem::exists(active_path, ec) && !ec) {
            snapshot->active_file_size_bytes =
                static_cast<std::uint64_t>(std::filesystem::file_size(active_path, ec));
            if (ec) {
                snapshot->active_file_size_bytes = 0;
                ec.clear();
            }
        }
        std::string error_message;
        const std::vector<ArchiveFileInfo> archives = ListEventStorageArchives(active_path, &error_message);
        snapshot->archived_file_count = static_cast<std::uint64_t>(archives.size());
        snapshot->total_archive_bytes = 0;
        for (const auto& archive : archives) {
            snapshot->total_archive_bytes += archive.size_bytes;
        }
    }

    void ApplyRecoveryScan(EventStorageSnapshot* snapshot) const {
        if (snapshot == nullptr) {
            return;
        }
        if (!snapshot->enabled) {
            snapshot->last_recovery_status = "disabled";
            return;
        }
        const std::filesystem::path active_path(snapshot->active_path.empty() ? snapshot->path
                                                                              : snapshot->active_path);
        const EventStorageRecoveryScan recovery = RecoveryScanForActivePath(active_path);
        snapshot->skipped_corrupt_lines = recovery.skipped_corrupt_lines;
        snapshot->partial_line_count = recovery.partial_line_count;
        snapshot->last_recovery_time_ms = recovery.last_recovery_time_ms;
        snapshot->last_recovery_status = recovery.status;
        if (recovery.file_exists) {
            snapshot->active_file_size_bytes = recovery.file_size_bytes;
        }
        if (!recovery.last_error.empty()) {
            snapshot->last_error = TrimForLog(recovery.last_error);
        }
    }

    EventStorageRecoveryScan RecoveryScanForActivePath(const std::filesystem::path& path) const {
        const EventStorageActiveFileSignature signature = ReadActiveFileSignature(path);
        {
            std::lock_guard lock(recovery_mu_);
            if (recovery_scan_cached_ && SameActiveFileSignature(recovery_signature_, signature)) {
                return recovery_scan_;
            }
        }

        EventStorageRecoveryScan scan = ScanActiveEventStorageFile(path, signature);
        {
            std::lock_guard lock(recovery_mu_);
            recovery_signature_ = signature;
            recovery_scan_ = scan;
            recovery_scan_cached_ = true;
        }
        return scan;
    }

    mutable std::mutex mu_;
    mutable std::mutex recovery_mu_;
    std::condition_variable cv_;
    std::deque<EventRecord> queue_;
    std::thread worker_;
    bool worker_started_{false};
    bool stop_{false};
    std::uint64_t enqueued_count_{0};
    std::uint64_t stored_count_{0};
    std::uint64_t failed_count_{0};
    std::uint64_t dropped_count_{0};
    std::uint64_t rotated_count_{0};
    std::uint64_t rotation_failed_count_{0};
    std::uint64_t retention_deleted_count_{0};
    std::uint64_t retention_deleted_bytes_{0};
    std::uint64_t retention_failed_count_{0};
    std::uint64_t snapshot_hook_failed_count_{0};
    std::uint64_t clip_hook_failed_count_{0};
    std::string last_snapshot_error_;
    std::string last_clip_error_;
    std::string last_error_;
    mutable bool recovery_scan_cached_{false};
    mutable EventStorageActiveFileSignature recovery_signature_;
    mutable EventStorageRecoveryScan recovery_scan_;
};

EventStorageDispatcher& Dispatcher() {
    static EventStorageDispatcher dispatcher;
    return dispatcher;
}

}  // namespace

bool NoOpEventSnapshotHook::CaptureSnapshot(const EventRecord& /*record*/,
                                            const EventMediaHookOptions& /*options*/,
                                            std::string* snapshot_path,
                                            std::string* error_message) {
    if (snapshot_path != nullptr) {
        snapshot_path->clear();
    }
    if (error_message != nullptr) {
        error_message->clear();
    }
    return true;
}

bool NoOpEventClipHook::CaptureClip(const EventRecord& /*record*/,
                                    const EventMediaHookOptions& /*options*/,
                                    std::string* clip_path,
                                    std::string* error_message) {
    if (clip_path != nullptr) {
        clip_path->clear();
    }
    if (error_message != nullptr) {
        error_message->clear();
    }
    return true;
}

FileEventStorage::FileEventStorage(std::string path) : path_(std::move(path)) {}

bool FileEventStorage::Store(const EventRecord& record, std::string* error_message) {
    const std::filesystem::path path(path_);
    const std::filesystem::path parent = path.parent_path();
    std::error_code ec;
    if (!parent.empty()) {
        std::filesystem::create_directories(parent, ec);
        if (ec) {
            if (error_message != nullptr) {
                *error_message = ec.message();
            }
            return false;
        }
    }

    std::ofstream output(path, std::ios::out | std::ios::app);
    if (!output.good()) {
        if (error_message != nullptr) {
            *error_message = "failed to open event storage file";
        }
        return false;
    }
    if (EventStorageFileNeedsLeadingNewline(path)) {
        output << "\n";
    }
    output << EventRecordJson(record) << "\n";
    if (!output.good()) {
        if (error_message != nullptr) {
            *error_message = "failed to write event record";
        }
        return false;
    }
    if (error_message != nullptr) {
        error_message->clear();
    }
    return true;
}

void DispatchEventRecords(const AnalysisResult& result, const std::vector<AnalysisEvent>& events) {
    if (events.empty() || !app::GetAppConfig().analysis_event_storage_enabled) {
        return;
    }
    for (const auto& event : events) {
        Dispatcher().Enqueue(BuildEventRecord(result, event));
    }
}

void RecordEventFrame(const std::string& stream_id,
                      const std::string& channel_id,
                      const RawVideoFrame& frame) {
    RecorderFrameBuffer().Record(stream_id, channel_id, frame);
}

EventStorageSnapshot GetEventStorageSnapshot() {
    return Dispatcher().Snapshot();
}

bool QueryEventRecordPath(const std::filesystem::path& path,
                          const EventRecordQueryOptions& options,
                          std::size_t limit,
                          bool archive_file,
                          EventRecordQueryResult* result,
                          std::string* error_message) {
    std::ifstream input(path);
    if (!input.good()) {
        if (error_message != nullptr) {
            *error_message = "failed to open event storage file";
        }
        return false;
    }

    std::string line;
    while (true) {
        const BoundedLineRead read = ReadBoundedJsonLine(input, &line);
        if (read.status == BoundedLineStatus::kEnd) {
            break;
        }
        if (read.status == BoundedLineStatus::kReadError) {
            if (error_message != nullptr) {
                *error_message = "failed to read event storage file";
            }
            return false;
        }
        if (read.status == BoundedLineStatus::kTooLong) {
            ++result->skipped_corrupt_lines;
            if (!read.had_newline) {
                ++result->partial_line_count;
            }
            continue;
        }
        if (!line.empty() && line.back() == '\r') {
            line.pop_back();
        }
        if (TrimCopy(line).empty()) {
            continue;
        }
        ParsedEventRecordLine parsed;
        if (!ParseEventRecordLine(line, &parsed)) {
            ++result->skipped_corrupt_lines;
            if (!read.had_newline) {
                ++result->partial_line_count;
            }
            continue;
        }
        if (archive_file) {
            ++result->archive_records_scanned;
        }
        if (!EventRecordMatchesQuery(parsed, options)) {
            continue;
        }
        const std::uint64_t match_index = result->matched_records++;
        if (match_index < options.offset) {
            continue;
        }
        if (result->records_json.size() >= limit) {
            result->has_more = true;
            result->truncated = true;
            break;
        }
        result->records_json.push_back(std::move(line));
    }
    if (error_message != nullptr) {
        error_message->clear();
    }
    return true;
}

bool QueryEventRecords(const EventRecordQueryOptions& options,
                       EventRecordQueryResult* result,
                       std::string* error_message) {
    if (result == nullptr) {
        if (error_message != nullptr) {
            *error_message = "result is required";
        }
        return false;
    }
    *result = EventRecordQueryResult{};
    result->storage = GetEventStorageSnapshot();
    const std::size_t limit = std::max<std::size_t>(1, options.limit);
    result->offset = options.offset;
    result->limit = limit;

    const std::filesystem::path path(result->storage.active_path.empty() ? result->storage.path
                                                                         : result->storage.active_path);
    std::error_code ec;
    result->file_exists = !path.empty() && std::filesystem::exists(path, ec);
    if (ec) {
        if (error_message != nullptr) {
            *error_message = ec.message();
        }
        return false;
    }
    if (!result->storage.enabled || path.empty()) {
        if (error_message != nullptr) {
            error_message->clear();
        }
        return true;
    }

    if (result->file_exists &&
        !QueryEventRecordPath(path, options, limit, false, result, error_message)) {
        return false;
    }

    if (options.include_archives && !result->has_more) {
        std::string archive_error;
        std::vector<ArchiveFileInfo> archives = ListEventStorageArchives(path, &archive_error);
        if (!archive_error.empty()) {
            if (error_message != nullptr) {
                *error_message = archive_error;
            }
            return false;
        }
        SortEventStorageArchivesNewestFirst(&archives);
        result->archive_files_scanned = static_cast<std::uint64_t>(archives.size());
        result->file_exists = result->file_exists || !archives.empty();
        for (const auto& archive : archives) {
            if (result->has_more) {
                break;
            }
            if (!QueryEventRecordPath(archive.path, options, limit, true, result, error_message)) {
                return false;
            }
        }
    }
    result->storage.skipped_corrupt_lines = result->skipped_corrupt_lines;
    result->storage.partial_line_count = result->partial_line_count;
    result->storage.last_recovery_time_ms = NowMs();
    result->storage.last_recovery_status =
        RecoveryStatusForCounts(result->skipped_corrupt_lines, result->partial_line_count);
    result->next_offset = result->has_more ? options.offset + result->records_json.size() : options.offset;

    if (error_message != nullptr) {
        error_message->clear();
    }
    return true;
}

std::filesystem::path BuildCompactedEventStoragePath(const std::filesystem::path& active_path) {
    const std::filesystem::path parent = active_path.parent_path();
    const std::string stem = active_path.stem().string();
    const std::string ext = active_path.extension().string().empty()
                                ? std::string{".jsonl"}
                                : active_path.extension().string();
    const std::string name = stem + ".compact." + std::to_string(NowMs()) + "." +
                             std::to_string(NextSequence()) + ext;
    return parent.empty() ? std::filesystem::path(name) : parent / name;
}

bool CompactEventRecordPath(const std::filesystem::path& path,
                            const EventRecordQueryOptions& options,
                            bool archive_file,
                            std::ofstream* output,
                            EventRecordCompactionResult* result,
                            std::string* error_message) {
    std::ifstream input(path);
    if (!input.good()) {
        if (error_message != nullptr) {
            *error_message = "failed to open event storage file";
        }
        return false;
    }
    std::string line;
    while (true) {
        const BoundedLineRead read = ReadBoundedJsonLine(input, &line);
        if (read.status == BoundedLineStatus::kEnd) {
            break;
        }
        if (read.status == BoundedLineStatus::kReadError) {
            if (error_message != nullptr) {
                *error_message = "failed to read event storage file";
            }
            return false;
        }
        if (read.status == BoundedLineStatus::kTooLong) {
            ++result->skipped_corrupt_lines;
            if (!read.had_newline) {
                ++result->partial_line_count;
            }
            continue;
        }
        if (!line.empty() && line.back() == '\r') {
            line.pop_back();
        }
        if (TrimCopy(line).empty()) {
            continue;
        }
        ParsedEventRecordLine parsed;
        if (!ParseEventRecordLine(line, &parsed)) {
            ++result->skipped_corrupt_lines;
            if (!read.had_newline) {
                ++result->partial_line_count;
            }
            continue;
        }
        if (archive_file) {
            ++result->archive_records_scanned;
        } else {
            ++result->active_records_scanned;
        }
        if (!EventRecordMatchesQuery(parsed, options)) {
            continue;
        }
        *output << line << "\n";
        if (!output->good()) {
            if (error_message != nullptr) {
                *error_message = "failed to write compacted event records";
            }
            return false;
        }
        ++result->retained_records;
    }
    if (error_message != nullptr) {
        error_message->clear();
    }
    return true;
}

bool CompactEventRecords(const EventRecordQueryOptions& options,
                         EventRecordCompactionResult* result,
                         std::string* error_message) {
    if (result == nullptr) {
        if (error_message != nullptr) {
            *error_message = "result is required";
        }
        return false;
    }
    *result = EventRecordCompactionResult{};
    result->storage = GetEventStorageSnapshot();
    const std::filesystem::path active_path(result->storage.active_path.empty()
                                                ? result->storage.path
                                                : result->storage.active_path);
    if (!result->storage.enabled || active_path.empty()) {
        if (error_message != nullptr) {
            error_message->clear();
        }
        return true;
    }
    std::error_code ec;
    result->active_file_exists = std::filesystem::exists(active_path, ec);
    if (ec) {
        if (error_message != nullptr) {
            *error_message = ec.message();
        }
        return false;
    }
    const std::filesystem::path compacted_path = BuildCompactedEventStoragePath(active_path);
    if (!EnsureParentDirectory(compacted_path, error_message)) {
        return false;
    }
    std::ofstream output(compacted_path, std::ios::out | std::ios::trunc);
    if (!output.good()) {
        if (error_message != nullptr) {
            *error_message = "failed to create compacted event storage file";
        }
        return false;
    }
    if (result->active_file_exists &&
        !CompactEventRecordPath(active_path, options, false, &output, result, error_message)) {
        return false;
    }
    if (options.include_archives) {
        std::string archive_error;
        std::vector<ArchiveFileInfo> archives = ListEventStorageArchives(active_path, &archive_error);
        if (!archive_error.empty()) {
            if (error_message != nullptr) {
                *error_message = archive_error;
            }
            return false;
        }
        archives.erase(std::remove_if(archives.begin(),
                                      archives.end(),
                                      [&](const ArchiveFileInfo& archive) {
                                          return archive.path == compacted_path;
                                      }),
                       archives.end());
        SortEventStorageArchivesOldestFirst(&archives);
        result->archive_files_scanned = static_cast<std::uint64_t>(archives.size());
        for (const auto& archive : archives) {
            if (!CompactEventRecordPath(archive.path, options, true, &output, result, error_message)) {
                return false;
            }
        }
    }
    output.close();
    if (!output.good()) {
        if (error_message != nullptr) {
            *error_message = "failed to finalize compacted event storage file";
        }
        return false;
    }
    result->compacted_path = compacted_path.string();
    if (error_message != nullptr) {
        error_message->clear();
    }
    return true;
}

bool ListCompactedEventRecordFiles(EventRecordCompactedFileListResult* result,
                                   std::string* error_message) {
    if (result == nullptr) {
        if (error_message != nullptr) {
            *error_message = "result is required";
        }
        return false;
    }
    *result = EventRecordCompactedFileListResult{};
    result->storage = GetEventStorageSnapshot();
    const std::filesystem::path active_path(result->storage.active_path.empty()
                                                ? result->storage.path
                                                : result->storage.active_path);
    if (active_path.empty()) {
        if (error_message != nullptr) {
            error_message->clear();
        }
        return true;
    }
    const std::filesystem::path parent = active_path.parent_path().empty()
                                             ? std::filesystem::path(".")
                                             : active_path.parent_path();
    std::error_code ec;
    if (!std::filesystem::exists(parent, ec)) {
        if (error_message != nullptr) {
            *error_message = ec ? ec.message() : "";
        }
        return !ec;
    }
    for (const auto& entry : std::filesystem::directory_iterator(parent, ec)) {
        if (ec) {
            if (error_message != nullptr) {
                *error_message = ec.message();
            }
            return false;
        }
        if (!entry.is_regular_file(ec) || ec || !IsEventStorageCompactedPath(active_path, entry.path())) {
            ec.clear();
            continue;
        }
        EventRecordCompactedFileInfo info;
        info.file_name = entry.path().filename().string();
        info.path = entry.path().string();
        info.size_bytes = static_cast<std::uint64_t>(entry.file_size(ec));
        if (ec) {
            info.size_bytes = 0;
            ec.clear();
        }
        info.modified_time_ms = FileTimeMs(entry.last_write_time(ec));
        if (ec) {
            info.modified_time_ms = 0;
            ec.clear();
        }
        result->files.push_back(std::move(info));
    }
    std::sort(result->files.begin(), result->files.end(), [](const auto& lhs, const auto& rhs) {
        if (lhs.modified_time_ms == rhs.modified_time_ms) {
            return lhs.file_name > rhs.file_name;
        }
        return lhs.modified_time_ms > rhs.modified_time_ms;
    });
    if (error_message != nullptr) {
        error_message->clear();
    }
    return true;
}

bool ResolveCompactedEventRecordFile(const std::string& file_name,
                                     EventRecordCompactedFileInfo* result,
                                     std::string* error_message) {
    if (result == nullptr) {
        if (error_message != nullptr) {
            *error_message = "result is required";
        }
        return false;
    }
    const std::filesystem::path requested(file_name);
    if (file_name.empty() || requested.filename().string() != file_name) {
        if (error_message != nullptr) {
            *error_message = "invalid compacted file name";
        }
        return false;
    }
    EventRecordCompactedFileListResult list;
    if (!ListCompactedEventRecordFiles(&list, error_message)) {
        return false;
    }
    for (const auto& file : list.files) {
        if (file.file_name == file_name) {
            *result = file;
            if (error_message != nullptr) {
                error_message->clear();
            }
            return true;
        }
    }
    if (error_message != nullptr) {
        *error_message = "compacted event record file not found";
    }
    return false;
}

bool DeleteCompactedEventRecordFile(const std::string& file_name,
                                    EventRecordCompactedFileInfo* result,
                                    std::string* error_message) {
    EventRecordCompactedFileInfo file;
    if (!ResolveCompactedEventRecordFile(file_name, &file, error_message)) {
        return false;
    }
    std::error_code ec;
    std::filesystem::remove(file.path, ec);
    if (ec) {
        if (error_message != nullptr) {
            *error_message = ec.message();
        }
        return false;
    }
    if (result != nullptr) {
        *result = file;
    }
    if (error_message != nullptr) {
        error_message->clear();
    }
    return true;
}

bool CleanupCompactedEventRecordFiles(std::size_t keep_newest,
                                      EventRecordCompactedFileCleanupResult* result,
                                      std::string* error_message) {
    if (result == nullptr) {
        if (error_message != nullptr) {
            *error_message = "result is required";
        }
        return false;
    }
    *result = EventRecordCompactedFileCleanupResult{};
    result->storage = GetEventStorageSnapshot();
    EventRecordCompactedFileListResult list;
    if (!ListCompactedEventRecordFiles(&list, error_message)) {
        return false;
    }
    result->storage = list.storage;
    result->kept_count =
        static_cast<std::uint64_t>(std::min<std::size_t>(keep_newest, list.files.size()));
    for (std::size_t index = keep_newest; index < list.files.size(); ++index) {
        EventRecordCompactedFileInfo deleted;
        if (!DeleteCompactedEventRecordFile(list.files[index].file_name, &deleted, error_message)) {
            return false;
        }
        ++result->deleted_count;
        result->deleted_bytes += deleted.size_bytes;
    }
    if (error_message != nullptr) {
        error_message->clear();
    }
    return true;
}

void StopEventStorage() {
    Dispatcher().Stop();
}

}  // namespace analysis

// 파일 요약: VA EventRecord 파일 저장소와 비동기 저장 dispatcher를 구현한다.
// 동작 요약: media pipeline을 막지 않도록 bounded queue에 넣고 worker가 JSON Lines로 append한다.
// 동작 요약: 저장 실패는 counter와 로그에 남기고 서버 실행은 계속 유지한다.
#include "analysis/event_storage.h"

#include "app_config.h"

#include <algorithm>
#include <cctype>
#include <chrono>
#include <condition_variable>
#include <deque>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <limits>
#include <mutex>
#include <optional>
#include <sstream>
#include <thread>
#include <utility>

namespace analysis {

namespace {

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
    std::int64_t start_time_ms{0};
    std::int64_t update_time_ms{0};
    std::int64_t end_time_ms{0};
};

bool ParseEventRecordLine(const std::string& line, ParsedEventRecordLine* record) {
    if (record == nullptr || line.size() > 1024 * 1024 || !ValidateTopLevelJsonObject(line)) {
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
    record->start_time_ms = *start_time;
    record->update_time_ms = *update_time;
    record->end_time_ms = *end_time;
    return true;
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
           << "\"eventId\":\"" << JsonEscape(record.event_id) << "\","
           << "\"eventType\":\"" << JsonEscape(record.event_type) << "\","
           << "\"streamId\":\"" << JsonEscape(record.stream_id) << "\","
           << "\"channelId\":\"" << JsonEscape(record.channel_id) << "\","
           << "\"trackId\":" << record.track_id << ","
           << "\"timestampMs\":" << record.update_time_ms << ","
           << "\"preEventMs\":" << options.pre_event_ms << ","
           << "\"postEventMs\":" << options.post_event_ms << ","
           << "\"clipBufferMs\":" << options.clip_buffer_ms << ","
           << "\"note\":\"hook marker only; media bytes are not captured in this implementation\""
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

class FileEventSnapshotHook final : public EventSnapshotHook {
public:
    bool CaptureSnapshot(const EventRecord& record,
                         const EventMediaHookOptions& options,
                         std::string* snapshot_path,
                         std::string* error_message) override {
        return WriteHookMarker(record, options, "snapshot", snapshot_path, error_message);
    }
};

class FileEventClipHook final : public EventClipHook {
public:
    bool CaptureClip(const EventRecord& record,
                     const EventMediaHookOptions& options,
                     std::string* clip_path,
                     std::string* error_message) override {
        return WriteHookMarker(record, options, "clip", clip_path, error_message);
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
        std::lock_guard lock(mu_);
        EventStorageSnapshot snapshot;
        snapshot.enabled = config.analysis_event_storage_enabled;
        snapshot.path = config.analysis_event_storage_path;
        snapshot.queue_size = queue_.size();
        snapshot.max_queue_size = config.analysis_event_storage_max_queue;
        snapshot.enqueued_count = enqueued_count_;
        snapshot.stored_count = stored_count_;
        snapshot.failed_count = failed_count_;
        snapshot.dropped_count = dropped_count_;
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
            FileEventStorage storage(app::GetAppConfig().analysis_event_storage_path);
            std::string error_message;
            if (storage.Store(record, &error_message)) {
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
    }

    mutable std::mutex mu_;
    std::condition_variable cv_;
    std::deque<EventRecord> queue_;
    std::thread worker_;
    bool worker_started_{false};
    bool stop_{false};
    std::uint64_t enqueued_count_{0};
    std::uint64_t stored_count_{0};
    std::uint64_t failed_count_{0};
    std::uint64_t dropped_count_{0};
    std::uint64_t snapshot_hook_failed_count_{0};
    std::uint64_t clip_hook_failed_count_{0};
    std::string last_snapshot_error_;
    std::string last_clip_error_;
    std::string last_error_;
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

EventStorageSnapshot GetEventStorageSnapshot() {
    return Dispatcher().Snapshot();
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
    result->limit = limit;

    const std::filesystem::path path(result->storage.path);
    std::error_code ec;
    result->file_exists = !path.empty() && std::filesystem::exists(path, ec);
    if (ec) {
        if (error_message != nullptr) {
            *error_message = ec.message();
        }
        return false;
    }
    if (!result->storage.enabled || path.empty() || !result->file_exists) {
        if (error_message != nullptr) {
            error_message->clear();
        }
        return true;
    }

    std::ifstream input(path);
    if (!input.good()) {
        if (error_message != nullptr) {
            *error_message = "failed to open event storage file";
        }
        return false;
    }

    std::string line;
    while (std::getline(input, line)) {
        if (!line.empty() && line.back() == '\r') {
            line.pop_back();
        }
        if (TrimCopy(line).empty()) {
            continue;
        }
        ParsedEventRecordLine parsed;
        if (!ParseEventRecordLine(line, &parsed)) {
            ++result->skipped_corrupt_lines;
            continue;
        }
        if (!EventRecordMatchesQuery(parsed, options)) {
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

void StopEventStorage() {
    Dispatcher().Stop();
}

}  // namespace analysis

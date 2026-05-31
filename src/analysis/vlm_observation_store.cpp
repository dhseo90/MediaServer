// 파일 요약: VLM observation JSONL 저장소와 EventRecord correlation report를 구현한다.
// 동작 요약: observation은 별도 파일에 append하고 EventRecord는 eventId reference만 사용한다.
#include "analysis/vlm_observation_store.h"

#include "app_config.h"

#include <algorithm>
#include <cctype>
#include <filesystem>
#include <fstream>
#include <limits>
#include <optional>
#include <sstream>
#include <utility>

namespace analysis {

namespace {

constexpr std::size_t kMaxObservationLineBytes = 1024 * 1024;

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

std::optional<std::string> ExtractTopLevelJsonValue(const std::string& json,
                                                    const std::string& field) {
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

bool HasTopLevelField(const std::string& json, const std::string& field) {
    return ExtractTopLevelJsonValue(json, field).has_value();
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

bool FileNeedsLeadingNewline(const std::filesystem::path& path) {
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

std::string JsonStringArray(const std::vector<std::string>& values) {
    std::ostringstream out;
    out << "[";
    for (std::size_t index = 0; index < values.size(); ++index) {
        if (index != 0) {
            out << ",";
        }
        out << "\"" << JsonEscape(values[index]) << "\"";
    }
    out << "]";
    return out.str();
}

std::string SafeObjectOrEmpty(const std::string& json) {
    return ValidateTopLevelJsonObject(json) ? json : "{}";
}

std::string SafeObjectOrNull(const std::string& json) {
    const std::string trimmed = TrimCopy(json);
    if (trimmed == "null") {
        return "null";
    }
    return ValidateTopLevelJsonObject(trimmed) ? trimmed : "null";
}

bool VlmObservationMatchesQuery(const std::string& line,
                                const VlmObservationQueryOptions& options) {
    const auto schema = ExtractTopLevelString(line, "schema");
    if (!schema.has_value() || *schema != "media-server.vlm-observation.v1") {
        return false;
    }
    const auto match_string = [&](const std::string& field, const std::string& expected) {
        return expected.empty() || ExtractTopLevelString(line, field).value_or("") == expected;
    };
    return match_string("eventId", options.event_id) &&
           match_string("sourceId", options.source_id) &&
           match_string("provider", options.provider) &&
           match_string("model", options.model) &&
           match_string("privacyMode", options.privacy_mode);
}

bool HasForbiddenEventRecordObservationFields(const std::string& event_record_json) {
    return HasTopLevelField(event_record_json, "vlmObservation") ||
           HasTopLevelField(event_record_json, "vlmObservationPath") ||
           HasTopLevelField(event_record_json, "vlmSummary") ||
           HasTopLevelField(event_record_json, "eventExplanation") ||
           HasTopLevelField(event_record_json, "falsePositiveHints") ||
           HasTopLevelField(event_record_json, "operatorReviewQuestions");
}

}  // namespace

FileVlmObservationStore::FileVlmObservationStore(std::string path) : path_(std::move(path)) {}

bool FileVlmObservationStore::Store(const VlmObservationSidecar& observation,
                                    std::string* error_message) {
    const std::filesystem::path path(path_);
    if (path.empty()) {
        if (error_message != nullptr) {
            *error_message = "VLM observation store path is empty";
        }
        return false;
    }
    if (observation.event_id.empty()) {
        if (error_message != nullptr) {
            *error_message = "VLM observation eventId is required";
        }
        return false;
    }
    if (!EnsureParentDirectory(path, error_message)) {
        return false;
    }
    std::ofstream output(path, std::ios::out | std::ios::app);
    if (!output.good()) {
        if (error_message != nullptr) {
            *error_message = "failed to open VLM observation store";
        }
        return false;
    }
    if (FileNeedsLeadingNewline(path)) {
        output << "\n";
    }
    output << VlmObservationSidecarJson(observation) << "\n";
    if (!output.good()) {
        if (error_message != nullptr) {
            *error_message = "failed to write VLM observation";
        }
        return false;
    }
    if (error_message != nullptr) {
        error_message->clear();
    }
    return true;
}

std::string DefaultVlmObservationStorePath() {
    const std::filesystem::path event_path(app::GetAppConfig().analysis_event_storage_path);
    const std::filesystem::path parent = event_path.parent_path();
    const std::string stem = event_path.stem().empty() ? "events" : event_path.stem().string();
    const std::string ext = event_path.extension().empty() ? ".jsonl" : event_path.extension().string();
    const std::filesystem::path path =
        parent.empty() ? std::filesystem::path(stem + ".vlm-observations" + ext)
                       : parent / (stem + ".vlm-observations" + ext);
    return path.string();
}

std::string VlmObservationSidecarJson(const VlmObservationSidecar& observation) {
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.vlm-observation.v1\","
        << "\"observationId\":\"" << JsonEscape(observation.observation_id) << "\","
        << "\"eventId\":\"" << JsonEscape(observation.event_id) << "\","
        << "\"sourceId\":\"" << JsonEscape(observation.source_id) << "\","
        << "\"ruleId\":\"" << JsonEscape(observation.rule_id) << "\","
        << "\"scenarioId\":\"" << JsonEscape(observation.scenario_id) << "\","
        << "\"inputType\":\"" << JsonEscape(observation.input_type) << "\","
        << "\"inputEvidenceRefs\":" << SafeObjectOrEmpty(observation.input_evidence_refs_json) << ","
        << "\"summary\":\"" << JsonEscape(observation.summary) << "\","
        << "\"eventExplanation\":\"" << JsonEscape(observation.event_explanation) << "\","
        << "\"falsePositiveHints\":" << JsonStringArray(observation.false_positive_hints) << ","
        << "\"operatorReviewQuestions\":" << JsonStringArray(observation.operator_review_questions) << ","
        << "\"ruleSuggestion\":" << SafeObjectOrNull(observation.rule_suggestion_json) << ","
        << "\"uncertainty\":" << observation.uncertainty << ","
        << "\"provider\":\"" << JsonEscape(observation.provider) << "\","
        << "\"model\":\"" << JsonEscape(observation.model) << "\","
        << "\"promptProfile\":\"" << JsonEscape(observation.prompt_profile) << "\","
        << "\"privacyMode\":\"" << JsonEscape(observation.privacy_mode) << "\","
        << "\"latencyMs\":" << observation.latency_ms << ","
        << "\"createdAt\":" << observation.created_at_ms << ","
        << "\"storageScope\":\"vlm-observation-store-only\","
        << "\"redactionReview\":{"
        << "\"rawPromptStored\":false,"
        << "\"rawResponseStored\":false,"
        << "\"sourceUrlExposed\":false,"
        << "\"credentialMaterialStored\":false,"
        << "\"rawMediaEmbedded\":false"
        << "},"
        << "\"contractInvariants\":{"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"viewerClientExposureAdded\":false"
        << "},"
        << "\"metadata\":" << SafeObjectOrEmpty(observation.metadata_json)
        << "}";
    return out.str();
}

bool QueryVlmObservations(const std::string& path,
                          const VlmObservationQueryOptions& options,
                          VlmObservationQueryResult* result,
                          std::string* error_message) {
    if (result == nullptr) {
        if (error_message != nullptr) {
            *error_message = "missing VLM observation query result";
        }
        return false;
    }
    *result = VlmObservationQueryResult{};
    result->offset = options.offset;
    result->limit = options.limit;

    const std::filesystem::path store_path(path);
    std::error_code ec;
    result->file_exists = !store_path.empty() && std::filesystem::exists(store_path, ec) && !ec;
    if (ec) {
        if (error_message != nullptr) {
            *error_message = ec.message();
        }
        return false;
    }
    if (!result->file_exists) {
        if (error_message != nullptr) {
            error_message->clear();
        }
        return true;
    }
    std::ifstream input(store_path);
    if (!input.good()) {
        if (error_message != nullptr) {
            *error_message = "failed to open VLM observation store";
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
        if (line.size() > kMaxObservationLineBytes || !ValidateTopLevelJsonObject(line)) {
            ++result->skipped_corrupt_lines;
            continue;
        }
        if (!VlmObservationMatchesQuery(line, options)) {
            continue;
        }
        const std::uint64_t matched_index = result->matched_observations++;
        if (matched_index < options.offset) {
            continue;
        }
        if (result->observations_json.size() >= options.limit) {
            result->has_more = true;
            continue;
        }
        result->observations_json.push_back(line);
    }
    result->next_offset = options.offset + result->observations_json.size();
    if (result->has_more) {
        result->next_offset += 1;
    }
    result->truncated = result->has_more;
    if (error_message != nullptr) {
        error_message->clear();
    }
    return true;
}

std::string BuildVlmObservationCorrelationReportJson(const std::string& event_record_json,
                                                     const std::string& observation_json) {
    const auto event_schema = ExtractTopLevelString(event_record_json, "schema").value_or("");
    const auto observation_schema = ExtractTopLevelString(observation_json, "schema").value_or("");
    const auto event_id = ExtractTopLevelString(event_record_json, "eventId").value_or("");
    const auto observation_event_id = ExtractTopLevelString(observation_json, "eventId").value_or("");
    const bool event_record_matched = event_schema == "media-server.va.event-record.v1";
    const bool observation_matched = observation_schema == "media-server.vlm-observation.v1";
    const bool event_id_matched =
        event_record_matched && observation_matched && !event_id.empty() && event_id == observation_event_id;
    const bool has_forbidden_event_fields = HasForbiddenEventRecordObservationFields(event_record_json);

    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.vlm-observation-correlation-report.v1\","
        << "\"eventId\":\"" << JsonEscape(event_id.empty() ? observation_event_id : event_id) << "\","
        << "\"eventRecordMatched\":" << (event_record_matched ? "true" : "false") << ","
        << "\"observationMatched\":" << (observation_matched ? "true" : "false") << ","
        << "\"eventIdMatched\":" << (event_id_matched ? "true" : "false") << ","
        << "\"eventRecordSchema\":\"" << JsonEscape(event_schema) << "\","
        << "\"observationSchema\":\"" << JsonEscape(observation_schema) << "\","
        << "\"eventRecordTopLevelObservationFieldsPresent\":"
        << (has_forbidden_event_fields ? "true" : "false") << ","
        << "\"externalPayloadChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false"
        << "}";
    return out.str();
}

}  // namespace analysis

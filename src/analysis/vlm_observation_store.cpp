// 파일 요약: VLM observation JSONL 저장소와 EventRecord correlation report를 구현한다.
// 동작 요약: observation은 별도 파일에 append하고 EventRecord는 eventId reference만 사용한다.
#include "analysis/vlm_observation_store.h"
#include "analysis/event_storage.h"
#include "core/analysis_runtime_port.h"

#include <algorithm>
#include <cctype>
#include <filesystem>
#include <fstream>
#include <iomanip>
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

std::optional<bool> ExtractTopLevelBool(const std::string& json, const std::string& field) {
    const auto value = ExtractTopLevelJsonValue(json, field);
    if (!value.has_value()) {
        return std::nullopt;
    }
    const std::string trimmed = TrimCopy(*value);
    if (trimmed == "true") {
        return true;
    }
    if (trimmed == "false") {
        return false;
    }
    return std::nullopt;
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

struct VlmSummarySearchCandidate {
    std::string event_id;
    std::string observation_id;
    std::string source_id;
    std::string rule_id;
    std::string scenario_id;
    std::string summary;
    std::string event_explanation;
    std::string provider;
    std::string model;
    std::string prompt_profile;
    std::string privacy_mode;
    std::vector<std::string> matched_terms;
    std::string observation_json;
    double match_score{0.0};
    std::size_t line_index{0};
};

struct VlmRuleSuggestionCandidate {
    std::string event_id;
    std::string observation_id;
    std::string source_id;
    std::string rule_id;
    std::string scenario_id;
    std::string summary;
    std::string event_explanation;
    std::string provider;
    std::string model;
    std::string prompt_profile;
    std::string privacy_mode;
    std::string rule_suggestion_json;
    std::string proposed_rule_kind;
    std::string candidate_id;
    std::string suggested_action;
    std::string target_route;
    std::size_t line_index{0};
};

std::string NormalizeSummarySearchText(const std::string& value) {
    std::string out;
    out.reserve(value.size());
    bool last_space = true;
    for (const unsigned char raw_ch : value) {
        char next = '\0';
        if (raw_ch < 128) {
            if (std::isalnum(raw_ch) != 0) {
                next = static_cast<char>(std::tolower(raw_ch));
            } else {
                next = ' ';
            }
        } else {
            next = static_cast<char>(raw_ch);
        }
        const bool is_space = std::isspace(static_cast<unsigned char>(next)) != 0;
        if (is_space) {
            if (!last_space) {
                out.push_back(' ');
            }
            last_space = true;
        } else {
            out.push_back(next);
            last_space = false;
        }
    }
    if (!out.empty() && out.back() == ' ') {
        out.pop_back();
    }
    return out;
}

std::vector<std::string> SummarySearchTerms(const std::string& query) {
    const std::string normalized = NormalizeSummarySearchText(query);
    std::istringstream input(normalized);
    std::vector<std::string> terms;
    std::string term;
    while (input >> term) {
        if (std::find(terms.begin(), terms.end(), term) == terms.end()) {
            terms.push_back(term);
        }
        if (terms.size() >= 16) {
            break;
        }
    }
    return terms;
}

bool VlmObservationMatchesSearchFilters(const std::string& line,
                                        const VlmSummarySearchOptions& options) {
    const auto schema = ExtractTopLevelString(line, "schema");
    if (!schema.has_value() || *schema != "media-server.vlm-observation.v1") {
        return false;
    }
    const auto match_string = [&](const std::string& field, const std::string& expected) {
        return expected.empty() || ExtractTopLevelString(line, field).value_or("") == expected;
    };
    return match_string("sourceId", options.source_id) &&
           match_string("privacyMode", options.privacy_mode);
}

bool VlmObservationMatchesRuleSuggestionFilters(const std::string& line,
                                                const VlmRuleSuggestionOptions& options) {
    const auto schema = ExtractTopLevelString(line, "schema");
    if (!schema.has_value() || *schema != "media-server.vlm-observation.v1") {
        return false;
    }
    const auto match_string = [&](const std::string& field, const std::string& expected) {
        return expected.empty() || ExtractTopLevelString(line, field).value_or("") == expected;
    };
    return match_string("sourceId", options.source_id) &&
           match_string("privacyMode", options.privacy_mode);
}

std::vector<std::string> MatchedSearchTerms(const std::string& observation_json,
                                            const std::vector<std::string>& terms) {
    std::string haystack;
    for (const char* field : {"summary", "eventExplanation", "ruleId", "scenarioId", "sourceId"}) {
        haystack += " ";
        haystack += ExtractTopLevelString(observation_json, field).value_or("");
    }
    // hints/operator questions 같은 배열 필드까지 검색되도록 sidecar 한 줄 전체를 포함합니다.
    // 작은 contract helper에 별도 JSON 배열 parser를 더하지 않기 위한 절충입니다.
    haystack += " ";
    haystack += observation_json;
    const std::string normalized_haystack = NormalizeSummarySearchText(haystack);

    std::vector<std::string> matched;
    for (const auto& term : terms) {
        if (!term.empty() && normalized_haystack.find(term) != std::string::npos) {
            matched.push_back(term);
        }
    }
    return matched;
}

std::string JsonStringArrayRaw(const std::vector<std::string>& values) {
    return JsonStringArray(values);
}

void AppendVlmSummarySearchCandidateJson(std::ostringstream& out,
                                         const VlmSummarySearchCandidate& candidate) {
    out << "{"
        << "\"schema\":\"media-server.vlm-summary-search-candidate.v1\","
        << "\"eventId\":\"" << JsonEscape(candidate.event_id) << "\","
        << "\"observationId\":\"" << JsonEscape(candidate.observation_id) << "\","
        << "\"sourceId\":\"" << JsonEscape(candidate.source_id) << "\","
        << "\"ruleId\":\"" << JsonEscape(candidate.rule_id) << "\","
        << "\"scenarioId\":\"" << JsonEscape(candidate.scenario_id) << "\","
        << "\"summary\":\"" << JsonEscape(candidate.summary) << "\","
        << "\"eventExplanation\":\"" << JsonEscape(candidate.event_explanation) << "\","
        << "\"provider\":\"" << JsonEscape(candidate.provider) << "\","
        << "\"model\":\"" << JsonEscape(candidate.model) << "\","
        << "\"promptProfile\":\"" << JsonEscape(candidate.prompt_profile) << "\","
        << "\"privacyMode\":\"" << JsonEscape(candidate.privacy_mode) << "\","
        << "\"matchedTerms\":" << JsonStringArrayRaw(candidate.matched_terms) << ","
        << "\"matchedTermCount\":" << candidate.matched_terms.size() << ","
        << "\"matchScore\":" << std::fixed << std::setprecision(3) << candidate.match_score << ","
        << "\"correlationKey\":\"eventId\","
        << "\"candidateSource\":\"vlm-observation-sidecar-summary\","
        << "\"contract\":{"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"runtimeVlmCallPerformed\":false,"
        << "\"cloudProviderApiCalled\":false,"
        << "\"autoRuleApplied\":false"
        << "}"
        << "}";
}

void AppendVlmRuleSuggestionCandidateJson(std::ostringstream& out,
                                          const VlmRuleSuggestionCandidate& candidate) {
    out << "{"
        << "\"schema\":\"media-server.vlm-rule-suggestion-candidate.v1\","
        << "\"eventId\":\"" << JsonEscape(candidate.event_id) << "\","
        << "\"observationId\":\"" << JsonEscape(candidate.observation_id) << "\","
        << "\"sourceId\":\"" << JsonEscape(candidate.source_id) << "\","
        << "\"ruleId\":\"" << JsonEscape(candidate.rule_id) << "\","
        << "\"scenarioId\":\"" << JsonEscape(candidate.scenario_id) << "\","
        << "\"summary\":\"" << JsonEscape(candidate.summary) << "\","
        << "\"eventExplanation\":\"" << JsonEscape(candidate.event_explanation) << "\","
        << "\"provider\":\"" << JsonEscape(candidate.provider) << "\","
        << "\"model\":\"" << JsonEscape(candidate.model) << "\","
        << "\"promptProfile\":\"" << JsonEscape(candidate.prompt_profile) << "\","
        << "\"privacyMode\":\"" << JsonEscape(candidate.privacy_mode) << "\","
        << "\"proposedRuleKind\":\"" << JsonEscape(candidate.proposed_rule_kind) << "\","
        << "\"candidateId\":\"" << JsonEscape(candidate.candidate_id) << "\","
        << "\"suggestedAction\":\"" << JsonEscape(candidate.suggested_action) << "\","
        << "\"targetRoute\":\"" << JsonEscape(candidate.target_route.empty() ? "/ops/rules" : candidate.target_route) << "\","
        << "\"manualReviewRequired\":true,"
        << "\"autoApply\":false,"
        << "\"candidateSource\":\"vlm-observation-sidecar-rule-suggestion\","
        << "\"provenance\":{"
        << "\"schema\":\"media-server.vlm-incident-to-rule-provenance.v1\","
        << "\"eventSource\":{"
        << "\"eventId\":\"" << JsonEscape(candidate.event_id) << "\","
        << "\"observationId\":\"" << JsonEscape(candidate.observation_id) << "\","
        << "\"sourceId\":\"" << JsonEscape(candidate.source_id) << "\","
        << "\"originalRuleId\":\"" << JsonEscape(candidate.rule_id) << "\","
        << "\"scenarioId\":\"" << JsonEscape(candidate.scenario_id) << "\","
        << "\"sourceSchema\":\"media-server.vlm-observation.v1\""
        << "},"
        << "\"candidateSource\":{"
        << "\"candidateId\":\"" << JsonEscape(candidate.candidate_id) << "\","
        << "\"proposedRuleKind\":\"" << JsonEscape(candidate.proposed_rule_kind) << "\","
        << "\"source\":\"vlm-observation-sidecar-rule-suggestion\","
        << "\"sourceSchema\":\"media-server.vlm-rule-suggestion-candidate.v1\","
        << "\"targetRoute\":\"" << JsonEscape(candidate.target_route.empty() ? "/ops/rules" : candidate.target_route) << "\","
        << "\"manualReviewRequired\":true,"
        << "\"autoApply\":false"
        << "},"
        << "\"evaluationSource\":{"
        << "\"status\":\"observation-context-only\","
        << "\"evaluationExecuted\":false,"
        << "\"source\":\"vlm-observation-sidecar-metadata\","
        << "\"provider\":\"" << JsonEscape(candidate.provider) << "\","
        << "\"model\":\"" << JsonEscape(candidate.model) << "\","
        << "\"promptProfile\":\"" << JsonEscape(candidate.prompt_profile) << "\","
        << "\"privacyMode\":\"" << JsonEscape(candidate.privacy_mode) << "\","
        << "\"catalogRevision\":null,"
        << "\"candidateDigest\":null"
        << "},"
        << "\"generatedRule\":{"
        << "\"id\":null,"
        << "\"saveApiRoute\":\"/lab/analysis/rules/{id}\","
        << "\"saveMethod\":\"PUT\","
        << "\"manualSaveRequired\":true"
        << "}"
        << "},"
        << "\"ruleSuggestion\":" << SafeObjectOrNull(candidate.rule_suggestion_json) << ","
        << "\"contract\":{"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"runtimeVlmCallPerformed\":false,"
        << "\"cloudProviderApiCalled\":false,"
        << "\"ruleRegistryWritePerformed\":false,"
        << "\"autoRuleApplied\":false,"
        << "\"autoProfileApplied\":false"
        << "}"
        << "}";
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
    const std::filesystem::path event_path(core::GetAnalysisRuntimeConfig().analysis_event_storage_path);
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

bool BuildVlmSummarySearchCandidatesJson(const std::string& path,
                                         const VlmSummarySearchOptions& options,
                                         std::string* body,
                                         std::string* error_message) {
    if (body == nullptr) {
        if (error_message != nullptr) {
            *error_message = "missing VLM summary search response body";
        }
        return false;
    }
    body->clear();
    const std::vector<std::string> terms = SummarySearchTerms(options.query);
    if (terms.empty()) {
        if (error_message != nullptr) {
            *error_message = "VLM summary search query is required";
        }
        return false;
    }

    const std::filesystem::path store_path(path);
    std::error_code ec;
    const bool file_exists = !store_path.empty() && std::filesystem::exists(store_path, ec) && !ec;
    if (ec) {
        if (error_message != nullptr) {
            *error_message = ec.message();
        }
        return false;
    }

    std::vector<VlmSummarySearchCandidate> candidates;
    std::uint64_t skipped_corrupt_lines = 0;
    if (file_exists) {
        std::ifstream input(store_path);
        if (!input.good()) {
            if (error_message != nullptr) {
                *error_message = "failed to open VLM observation store";
            }
            return false;
        }
        std::string line;
        std::size_t line_index = 0;
        while (std::getline(input, line)) {
            ++line_index;
            if (!line.empty() && line.back() == '\r') {
                line.pop_back();
            }
            if (TrimCopy(line).empty()) {
                continue;
            }
            if (line.size() > kMaxObservationLineBytes || !ValidateTopLevelJsonObject(line)) {
                ++skipped_corrupt_lines;
                continue;
            }
            if (!VlmObservationMatchesSearchFilters(line, options)) {
                continue;
            }
            std::vector<std::string> matched_terms = MatchedSearchTerms(line, terms);
            if (matched_terms.empty()) {
                continue;
            }
            VlmSummarySearchCandidate candidate;
            candidate.event_id = ExtractTopLevelString(line, "eventId").value_or("");
            candidate.observation_id = ExtractTopLevelString(line, "observationId").value_or("");
            candidate.source_id = ExtractTopLevelString(line, "sourceId").value_or("");
            candidate.rule_id = ExtractTopLevelString(line, "ruleId").value_or("");
            candidate.scenario_id = ExtractTopLevelString(line, "scenarioId").value_or("");
            candidate.summary = ExtractTopLevelString(line, "summary").value_or("");
            candidate.event_explanation = ExtractTopLevelString(line, "eventExplanation").value_or("");
            candidate.provider = ExtractTopLevelString(line, "provider").value_or("");
            candidate.model = ExtractTopLevelString(line, "model").value_or("");
            candidate.prompt_profile = ExtractTopLevelString(line, "promptProfile").value_or("");
            candidate.privacy_mode = ExtractTopLevelString(line, "privacyMode").value_or("");
            candidate.matched_terms = std::move(matched_terms);
            candidate.observation_json = line;
            candidate.match_score =
                static_cast<double>(candidate.matched_terms.size()) / static_cast<double>(terms.size());
            candidate.line_index = line_index;
            candidates.push_back(std::move(candidate));
        }
    }

    std::stable_sort(candidates.begin(),
                     candidates.end(),
                     [](const VlmSummarySearchCandidate& lhs,
                        const VlmSummarySearchCandidate& rhs) {
                         if (lhs.match_score != rhs.match_score) {
                             return lhs.match_score > rhs.match_score;
                         }
                         return lhs.line_index < rhs.line_index;
                     });

    const std::size_t effective_limit = options.limit == 0 ? 25 : std::min<std::size_t>(options.limit, 100);
    const std::size_t begin = std::min(options.offset, candidates.size());
    const std::size_t end = std::min(begin + effective_limit, candidates.size());

    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.vlm-summary-search-candidates.v1\","
        << "\"targetStep\":\"V200-S12\","
        << "\"query\":\"" << JsonEscape(options.query) << "\","
        << "\"searchMode\":\"sidecar-summary-token-candidate\","
        << "\"correlationKey\":\"eventId\","
        << "\"candidateStatus\":\"candidate-only-not-product-search\","
        << "\"fileExists\":" << (file_exists ? "true" : "false") << ","
        << "\"queryTerms\":" << JsonStringArrayRaw(terms) << ","
        << "\"sourceId\":\"" << JsonEscape(options.source_id) << "\","
        << "\"privacyMode\":\"" << JsonEscape(options.privacy_mode) << "\","
        << "\"candidates\":[";
    for (std::size_t index = begin; index < end; ++index) {
        if (index != begin) {
            out << ",";
        }
        AppendVlmSummarySearchCandidateJson(out, candidates[index]);
    }
    out << "],"
        << "\"offset\":" << options.offset << ","
        << "\"limit\":" << effective_limit << ","
        << "\"nextOffset\":" << end << ","
        << "\"matchedCandidates\":" << candidates.size() << ","
        << "\"hasMore\":" << (end < candidates.size() ? "true" : "false") << ","
        << "\"truncated\":" << (end < candidates.size() ? "true" : "false") << ","
        << "\"skippedCorruptLines\":" << skipped_corrupt_lines << ","
        << "\"contract\":{"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"runtimeVlmCallPerformed\":false,"
        << "\"cloudProviderApiCalled\":false,"
        << "\"autoRuleApplied\":false"
        << "}"
        << "}";
    *body = out.str();
    if (error_message != nullptr) {
        error_message->clear();
    }
    return true;
}

bool BuildVlmRuleSuggestionCandidatesJson(const std::string& path,
                                          const VlmRuleSuggestionOptions& options,
                                          std::string* body,
                                          std::string* error_message) {
    if (body == nullptr) {
        if (error_message != nullptr) {
            *error_message = "missing VLM rule suggestion response body";
        }
        return false;
    }
    body->clear();

    const std::filesystem::path store_path(path);
    std::error_code ec;
    const bool file_exists = !store_path.empty() && std::filesystem::exists(store_path, ec) && !ec;
    if (ec) {
        if (error_message != nullptr) {
            *error_message = ec.message();
        }
        return false;
    }

    std::vector<VlmRuleSuggestionCandidate> candidates;
    std::uint64_t skipped_corrupt_lines = 0;
    std::uint64_t excluded_auto_apply_suggestions = 0;
    std::uint64_t excluded_non_manual_review_suggestions = 0;
    if (file_exists) {
        std::ifstream input(store_path);
        if (!input.good()) {
            if (error_message != nullptr) {
                *error_message = "failed to open VLM observation store";
            }
            return false;
        }
        std::string line;
        std::size_t line_index = 0;
        while (std::getline(input, line)) {
            ++line_index;
            if (!line.empty() && line.back() == '\r') {
                line.pop_back();
            }
            if (TrimCopy(line).empty()) {
                continue;
            }
            if (line.size() > kMaxObservationLineBytes || !ValidateTopLevelJsonObject(line)) {
                ++skipped_corrupt_lines;
                continue;
            }
            if (!VlmObservationMatchesRuleSuggestionFilters(line, options)) {
                continue;
            }
            const auto suggestion_value = ExtractTopLevelJsonValue(line, "ruleSuggestion");
            if (!suggestion_value.has_value()) {
                continue;
            }
            const std::string suggestion_json = TrimCopy(*suggestion_value);
            if (suggestion_json == "null" || !ValidateTopLevelJsonObject(suggestion_json)) {
                continue;
            }
            const std::string kind = ExtractTopLevelString(suggestion_json, "kind").value_or("");
            if (kind.empty() || kind == "none") {
                continue;
            }
            if (!options.suggestion_kind.empty() && kind != options.suggestion_kind) {
                continue;
            }
            if (ExtractTopLevelBool(suggestion_json, "autoApply").value_or(true)) {
                ++excluded_auto_apply_suggestions;
                continue;
            }
            if (!ExtractTopLevelBool(suggestion_json, "manualReviewRequired").value_or(false)) {
                ++excluded_non_manual_review_suggestions;
                continue;
            }

            VlmRuleSuggestionCandidate candidate;
            candidate.event_id = ExtractTopLevelString(line, "eventId").value_or("");
            candidate.observation_id = ExtractTopLevelString(line, "observationId").value_or("");
            candidate.source_id = ExtractTopLevelString(line, "sourceId").value_or("");
            candidate.rule_id = ExtractTopLevelString(line, "ruleId").value_or("");
            candidate.scenario_id = ExtractTopLevelString(line, "scenarioId").value_or("");
            candidate.summary = ExtractTopLevelString(line, "summary").value_or("");
            candidate.event_explanation = ExtractTopLevelString(line, "eventExplanation").value_or("");
            candidate.provider = ExtractTopLevelString(line, "provider").value_or("");
            candidate.model = ExtractTopLevelString(line, "model").value_or("");
            candidate.prompt_profile = ExtractTopLevelString(line, "promptProfile").value_or("");
            candidate.privacy_mode = ExtractTopLevelString(line, "privacyMode").value_or("");
            candidate.rule_suggestion_json = suggestion_json;
            candidate.proposed_rule_kind = kind;
            candidate.candidate_id = ExtractTopLevelString(suggestion_json, "candidateId").value_or("");
            candidate.suggested_action =
                ExtractTopLevelString(suggestion_json, "suggestedAction").value_or("manual-save-in-ops-rules");
            candidate.target_route = ExtractTopLevelString(suggestion_json, "targetRoute").value_or("/ops/rules");
            candidate.line_index = line_index;
            candidates.push_back(std::move(candidate));
        }
    }

    std::stable_sort(candidates.begin(),
                     candidates.end(),
                     [](const VlmRuleSuggestionCandidate& lhs,
                        const VlmRuleSuggestionCandidate& rhs) {
                         return lhs.line_index < rhs.line_index;
                     });

    const std::size_t effective_limit = options.limit == 0 ? 25 : std::min<std::size_t>(options.limit, 100);
    const std::size_t begin = std::min(options.offset, candidates.size());
    const std::size_t end = std::min(begin + effective_limit, candidates.size());

    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.vlm-rule-suggestion-candidates.v1\","
        << "\"targetStep\":\"V200-S13\","
        << "\"suggestionMode\":\"sidecar-rule-suggestion-candidate\","
        << "\"correlationKey\":\"eventId\","
        << "\"candidateStatus\":\"candidate-only-manual-rule-save\","
        << "\"manualSaveRoute\":\"/ops/rules\","
        << "\"fileExists\":" << (file_exists ? "true" : "false") << ","
        << "\"sourceId\":\"" << JsonEscape(options.source_id) << "\","
        << "\"privacyMode\":\"" << JsonEscape(options.privacy_mode) << "\","
        << "\"suggestionKind\":\"" << JsonEscape(options.suggestion_kind) << "\","
        << "\"candidates\":[";
    for (std::size_t index = begin; index < end; ++index) {
        if (index != begin) {
            out << ",";
        }
        AppendVlmRuleSuggestionCandidateJson(out, candidates[index]);
    }
    out << "],"
        << "\"offset\":" << options.offset << ","
        << "\"limit\":" << effective_limit << ","
        << "\"nextOffset\":" << end << ","
        << "\"matchedCandidates\":" << candidates.size() << ","
        << "\"hasMore\":" << (end < candidates.size() ? "true" : "false") << ","
        << "\"truncated\":" << (end < candidates.size() ? "true" : "false") << ","
        << "\"skippedCorruptLines\":" << skipped_corrupt_lines << ","
        << "\"excludedAutoApplySuggestions\":" << excluded_auto_apply_suggestions << ","
        << "\"excludedNonManualReviewSuggestions\":" << excluded_non_manual_review_suggestions << ","
        << "\"contract\":{"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"runtimeVlmCallPerformed\":false,"
        << "\"cloudProviderApiCalled\":false,"
        << "\"ruleRegistryWritePerformed\":false,"
        << "\"autoRuleApplied\":false,"
        << "\"autoProfileApplied\":false"
        << "}"
        << "}";
    *body = out.str();
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

bool ValidateVlmIncidentRuleProvenanceServerRecords(
    const std::string& event_source,
    const std::string& candidate_source,
    const std::string& evaluation_source,
    std::string* error_message) {
    const auto fail = [error_message]() {
        if (error_message != nullptr) {
            *error_message = "rule VLM provenance does not match server records";
        }
        return false;
    };
    const auto has_exact_fields = [](const std::string& json,
                                     const std::vector<std::string>& fields) {
        for (const auto& expected : fields) {
            std::size_t count = 0;
            std::size_t pos = 0;
            SkipWhitespace(json, &pos);
            if (pos >= json.size() || json[pos++] != '{') {
                return false;
            }
            while (pos < json.size()) {
                SkipWhitespace(json, &pos);
                if (pos < json.size() && json[pos] == '}') {
                    break;
                }
                std::string key;
                if (!SkipJsonString(json, &pos, &key)) {
                    return false;
                }
                SkipWhitespace(json, &pos);
                if (pos >= json.size() || json[pos++] != ':') {
                    return false;
                }
                if (key == expected) {
                    ++count;
                }
                if (!SkipJsonValue(json, &pos)) {
                    return false;
                }
                SkipWhitespace(json, &pos);
                if (pos < json.size() && json[pos] == ',') {
                    ++pos;
                    continue;
                }
                if (pos < json.size() && json[pos] == '}') {
                    break;
                }
                return false;
            }
            if (count != 1) {
                return false;
            }
        }
        return true;
    };
    if (!has_exact_fields(event_source,
                          {"eventId", "observationId", "sourceId", "sourceSchema",
                           "originalRuleId", "scenarioId"}) ||
        !has_exact_fields(candidate_source,
                          {"candidateId", "proposedRuleKind", "source", "sourceSchema",
                           "targetRoute", "manualReviewRequired", "autoApply"}) ||
        !has_exact_fields(evaluation_source,
                          {"status", "evaluationExecuted", "source", "provider", "model",
                           "promptProfile", "privacyMode"})) {
        return fail();
    }

    const std::string event_id = TrimCopy(ExtractTopLevelString(event_source, "eventId").value_or(""));
    const std::string observation_id =
        TrimCopy(ExtractTopLevelString(event_source, "observationId").value_or(""));
    const std::string source_id = TrimCopy(ExtractTopLevelString(event_source, "sourceId").value_or(""));
    if (event_id.empty() || observation_id.empty() || source_id.empty() ||
        ExtractTopLevelString(event_source, "sourceSchema").value_or("") !=
            "media-server.vlm-observation.v1") {
        return fail();
    }

    EventRecordQueryOptions event_options;
    event_options.event_id = event_id;
    event_options.include_archives = true;
    event_options.limit = 100;
    EventRecordQueryResult event_result;
    std::string query_error;
    if (!QueryEventRecords(event_options, &event_result, &query_error)) {
        return fail();
    }
    const bool event_matches = std::any_of(
        event_result.records_json.begin(), event_result.records_json.end(),
        [&](const std::string& event_json) {
            if (ExtractTopLevelString(event_json, "eventId").value_or("") != event_id) {
                return false;
            }
            if (ExtractTopLevelString(event_json, "streamId").value_or("") == source_id ||
                ExtractTopLevelString(event_json, "channelId").value_or("") == source_id) {
                return true;
            }
            const auto metadata = ExtractTopLevelJsonValue(event_json, "metadata");
            return metadata.has_value() &&
                   ExtractTopLevelString(*metadata, "sourceId").value_or("") == source_id;
        });
    if (!event_matches) {
        return fail();
    }

    VlmObservationQueryOptions observation_options;
    observation_options.event_id = event_id;
    observation_options.source_id = source_id;
    observation_options.limit = 100;
    VlmObservationQueryResult observation_result;
    if (!QueryVlmObservations(DefaultVlmObservationStorePath(), observation_options,
                              &observation_result, &query_error)) {
        return fail();
    }
    const auto observation_it = std::find_if(
        observation_result.observations_json.begin(), observation_result.observations_json.end(),
        [&](const std::string& observation_json) {
            return ExtractTopLevelString(observation_json, "observationId").value_or("") == observation_id &&
                   ExtractTopLevelString(observation_json, "eventId").value_or("") == event_id &&
                   ExtractTopLevelString(observation_json, "sourceId").value_or("") == source_id;
        });
    if (observation_it == observation_result.observations_json.end()) {
        return fail();
    }

    const std::string& observation = *observation_it;
    const auto suggestion = ExtractTopLevelJsonValue(observation, "ruleSuggestion");
    if (!suggestion.has_value()) {
        return fail();
    }
    const std::string expected_target_route =
        TrimCopy(ExtractTopLevelString(*suggestion, "targetRoute").value_or("/ops/rules"));
    if (ExtractTopLevelString(candidate_source, "candidateId").value_or("") !=
            ExtractTopLevelString(*suggestion, "candidateId").value_or("") ||
        ExtractTopLevelString(candidate_source, "proposedRuleKind").value_or("") !=
            ExtractTopLevelString(*suggestion, "kind").value_or("") ||
        ExtractTopLevelString(candidate_source, "source").value_or("") !=
            "vlm-observation-sidecar-rule-suggestion" ||
        ExtractTopLevelString(candidate_source, "sourceSchema").value_or("") !=
            "media-server.vlm-rule-suggestion-candidate.v1" ||
        TrimCopy(ExtractTopLevelString(candidate_source, "targetRoute").value_or("")) !=
            expected_target_route ||
        !ExtractTopLevelBool(*suggestion, "manualReviewRequired").value_or(false) ||
        ExtractTopLevelBool(*suggestion, "autoApply").value_or(true) ||
        ExtractTopLevelString(event_source, "originalRuleId").value_or("") !=
            ExtractTopLevelString(observation, "ruleId").value_or("") ||
        ExtractTopLevelString(event_source, "scenarioId").value_or("") !=
            ExtractTopLevelString(observation, "scenarioId").value_or("")) {
        return fail();
    }

    const bool matches =
        ExtractTopLevelString(evaluation_source, "status").value_or("") ==
            "observation-context-only" &&
        !ExtractTopLevelBool(evaluation_source, "evaluationExecuted").value_or(true) &&
        ExtractTopLevelString(evaluation_source, "source").value_or("") ==
            "vlm-observation-sidecar-metadata" &&
        ExtractTopLevelString(evaluation_source, "provider").value_or("") ==
            ExtractTopLevelString(observation, "provider").value_or("") &&
        ExtractTopLevelString(evaluation_source, "model").value_or("") ==
            ExtractTopLevelString(observation, "model").value_or("") &&
        ExtractTopLevelString(evaluation_source, "promptProfile").value_or("") ==
            ExtractTopLevelString(observation, "promptProfile").value_or("") &&
        ExtractTopLevelString(evaluation_source, "privacyMode").value_or("") ==
            ExtractTopLevelString(observation, "privacyMode").value_or("");
    if (!matches) {
        return fail();
    }
    if (error_message != nullptr) {
        error_message->clear();
    }
    return true;
}

}  // namespace analysis

// 파일 요약: v3.0 Search DSL and Query Convert의 순수 계약을 구현한다.
// 동작 요약: provider/vector/index/UI 호출 없이 자연어를 제한된 DSL로 바꾸고 문서 목록을 필터링한다.
#include "analysis/event_search_query.h"

#include <algorithm>
#include <cctype>
#include <sstream>

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

std::string LowerAscii(std::string value) {
    for (char& ch : value) {
        ch = static_cast<char>(std::tolower(static_cast<unsigned char>(ch)));
    }
    return value;
}

bool Contains(const std::string& text, const std::string& needle) {
    return text.find(needle) != std::string::npos;
}

bool IsTrimPunctuation(char ch) {
    return ch == ',' || ch == ';' || ch == '(' || ch == ')' || ch == '[' || ch == ']' ||
           ch == '{' || ch == '}' || ch == '"' || ch == '\'';
}

std::string NormalizeToken(std::string token) {
    while (!token.empty() && IsTrimPunctuation(token.front())) {
        token.erase(token.begin());
    }
    while (!token.empty() && (IsTrimPunctuation(token.back()) || token.back() == '.')) {
        token.pop_back();
    }
    return LowerAscii(token);
}

bool IsStopWord(const std::string& token) {
    for (const std::string& stop : {
             "a",
             "an",
             "and",
             "events",
             "find",
             "for",
             "in",
             "of",
             "or",
             "search",
             "show",
             "the",
             "to",
             "with",
         }) {
        if (token == stop) {
            return true;
        }
    }
    return false;
}

std::size_t ParseBoundedSize(const std::string& value, std::size_t fallback, std::size_t max_value) {
    if (max_value == 0) {
        return 0;
    }
    if (value.empty()) {
        return fallback;
    }
    std::size_t parsed = 0;
    for (const char ch : value) {
        if (ch < '0' || ch > '9') {
            return fallback;
        }
        const std::size_t digit = static_cast<std::size_t>(ch - '0');
        if (parsed > (max_value - digit) / 10) {
            return max_value;
        }
        parsed = (parsed * 10) + digit;
    }
    return std::min(parsed, max_value);
}

bool IsIdentityQuery(const std::string& lower_query) {
    for (const std::string& forbidden : {
             "face recognition",
             "face match",
             "face embedding",
             "faceprint",
             "watchlist",
             "person name",
             "account identity",
             "license plate",
             "id card",
         }) {
        if (Contains(lower_query, forbidden)) {
            return true;
        }
    }
    return false;
}

EventSearchDsl MakeDefaultDsl(const EventSearchQueryOptions& options) {
    EventSearchDsl dsl;
    dsl.limit = options.default_limit == 0 ? 50 : options.default_limit;
    const std::size_t max_limit = options.max_limit == 0 ? 1 : options.max_limit;
    if (dsl.limit > max_limit) {
        dsl.limit = max_limit;
    }
    dsl.sort = options.default_sort.empty() ? "eventTimeDesc" : options.default_sort;
    dsl.strict_structured_output = true;
    dsl.raw_llm_prompt_stored = false;
    dsl.raw_provider_response_stored = false;
    dsl.runtime_provider_call_performed = false;
    dsl.vector_search_performed = false;
    dsl.search_index_required = false;
    dsl.ops_events_ui_required = false;
    dsl.event_post_payload_changed = false;
    dsl.webrtc_data_channel_schema_changed = false;
    dsl.sse_ws_metadata_schema_changed = false;
    dsl.rtsp_webrtc_media_path_changed = false;
    dsl.viewer_client_exposure_added = false;
    return dsl;
}

void AddUnique(std::vector<std::string>* values, const std::string& value) {
    if (values == nullptr || value.empty()) {
        return;
    }
    if (std::find(values->begin(), values->end(), value) == values->end()) {
        values->push_back(value);
    }
}

void AddFilter(EventSearchDsl* dsl, const std::string& field, const std::string& op, const std::string& value) {
    if (dsl == nullptr || field.empty() || op.empty() || value.empty()) {
        return;
    }
    dsl->filters.push_back(EventSearchFilter{field, op, value});
}

void Reject(EventSearchDsl* dsl, const std::string& reason) {
    if (dsl == nullptr) {
        return;
    }
    dsl->valid = false;
    dsl->rejection_reason = reason;
    dsl->text_terms.clear();
    dsl->tags.clear();
    dsl->filters.clear();
}

std::string FieldValue(const EventSearchDocument& document, const std::string& field) {
    if (field == "eventId") {
        return document.event_id;
    }
    if (field == "sourceId") {
        return document.source_id;
    }
    if (field == "channelId") {
        return document.channel_id;
    }
    if (field == "eventType") {
        return document.event_type;
    }
    if (field == "scenario") {
        return document.scenario;
    }
    if (field == "status") {
        return document.status;
    }
    if (field == "zoneId") {
        return document.zone_id;
    }
    if (field == "lineId") {
        return document.line_id;
    }
    if (field == "className") {
        return document.class_name;
    }
    if (field == "reviewState") {
        return document.review_state;
    }
    if (field == "pinned") {
        return document.pinned ? "true" : "false";
    }
    for (const auto& feature : document.features) {
        if (feature.field == field) {
            return feature.value;
        }
    }
    return {};
}

bool ParseInt64(const std::string& value, std::int64_t* out) {
    if (out == nullptr || value.empty()) {
        return false;
    }
    std::int64_t parsed = 0;
    for (const char ch : value) {
        if (ch < '0' || ch > '9') {
            return false;
        }
        parsed = (parsed * 10) + static_cast<std::int64_t>(ch - '0');
    }
    *out = parsed;
    return true;
}

bool MatchesFilter(const EventSearchDocument& document, const EventSearchFilter& filter) {
    if (filter.field == "timestampMs") {
        std::int64_t expected = 0;
        if (!ParseInt64(filter.value, &expected)) {
            return false;
        }
        if (filter.op == "gte") {
            return document.timestamp_ms >= expected;
        }
        if (filter.op == "lte") {
            return document.timestamp_ms <= expected;
        }
        if (filter.op == "eq") {
            return document.timestamp_ms == expected;
        }
        return false;
    }

    const std::string actual = LowerAscii(FieldValue(document, filter.field));
    const std::string expected = LowerAscii(filter.value);
    if (filter.op == "eq") {
        return actual == expected;
    }
    if (filter.op == "contains") {
        return Contains(actual, expected);
    }
    return false;
}

bool TermMatches(const EventSearchDocument& document, const std::string& term) {
    const std::string lower_term = LowerAscii(term);
    std::string haystack = LowerAscii(document.searchable_text + " " + document.event_id + " " +
                                      document.source_id + " " + document.channel_id + " " +
                                      document.event_type + " " + document.scenario + " " +
                                      document.status + " " + document.zone_id + " " +
                                      document.line_id + " " + document.class_name + " " +
                                      document.review_state);
    if (Contains(haystack, lower_term)) {
        return true;
    }
    for (const auto& tag : document.tags) {
        if (Contains(LowerAscii(tag), lower_term)) {
            return true;
        }
    }
    for (const auto& feature : document.features) {
        if (Contains(LowerAscii(feature.field), lower_term) ||
            Contains(LowerAscii(feature.value), lower_term)) {
            return true;
        }
    }
    return false;
}

bool HasTag(const EventSearchDocument& document, const std::string& tag) {
    const std::string expected = LowerAscii(tag);
    for (const auto& item : document.tags) {
        if (LowerAscii(item) == expected) {
            return true;
        }
    }
    return false;
}

void AppendStringArray(std::ostringstream* out, const std::vector<std::string>& values) {
    if (out == nullptr) {
        return;
    }
    *out << "[";
    for (std::size_t i = 0; i < values.size(); ++i) {
        if (i > 0) {
            *out << ",";
        }
        *out << "\"" << JsonEscape(values[i]) << "\"";
    }
    *out << "]";
}

}  // namespace

EventSearchDsl ConvertEventSearchQueryToDsl(const std::string& query,
                                            const EventSearchQueryOptions& options) {
    EventSearchDsl dsl = MakeDefaultDsl(options);
    const std::size_t max_limit = options.max_limit == 0 ? 1 : options.max_limit;
    const std::size_t max_offset = options.max_offset;
    const std::string lower_query = LowerAscii(query);
    if (IsIdentityQuery(lower_query)) {
        Reject(&dsl, "identity-search-disallowed");
        return dsl;
    }

    std::istringstream input(query);
    std::string token;
    while (input >> token) {
        token = NormalizeToken(token);
        if (token.empty() || IsStopWord(token)) {
            continue;
        }
        const std::size_t colon = token.find(':');
        if (colon == std::string::npos) {
            if (token == "pinned") {
                AddFilter(&dsl, "pinned", "eq", "true");
            } else {
                AddUnique(&dsl.text_terms, token);
            }
            continue;
        }

        const std::string key = token.substr(0, colon);
        const std::string value = token.substr(colon + 1);
        if (value.empty()) {
            continue;
        }
        if (key == "tag") {
            AddUnique(&dsl.tags, value);
        } else if (key == "status") {
            AddFilter(&dsl, "status", "eq", value);
        } else if (key == "source") {
            AddFilter(&dsl, "sourceId", "eq", value);
        } else if (key == "channel") {
            AddFilter(&dsl, "channelId", "eq", value);
        } else if (key == "event") {
            AddFilter(&dsl, "eventType", "eq", value);
        } else if (key == "scenario") {
            AddFilter(&dsl, "scenario", "eq", value);
        } else if (key == "review" || key == "reviewstate") {
            AddFilter(&dsl, "reviewState", "eq", value);
        } else if (key == "zone") {
            AddFilter(&dsl, "zoneId", "eq", value);
        } else if (key == "after") {
            AddFilter(&dsl, "timestampMs", "gte", value);
        } else if (key == "before") {
            AddFilter(&dsl, "timestampMs", "lte", value);
        } else if (key == "limit") {
            dsl.limit = ParseBoundedSize(value, dsl.limit, max_limit);
        } else if (key == "offset") {
            dsl.offset = ParseBoundedSize(value, dsl.offset, max_offset);
        } else if (key == "sort") {
            if (value == "oldest" || value == "eventtimeasc") {
                dsl.sort = "eventTimeAsc";
            } else {
                dsl.sort = "eventTimeDesc";
            }
        } else {
            Reject(&dsl, "unsupported-filter-field");
            return dsl;
        }
    }
    return dsl;
}

bool EventSearchDocumentMatches(const EventSearchDocument& document, const EventSearchDsl& dsl) {
    if (!dsl.valid) {
        return false;
    }
    for (const auto& term : dsl.text_terms) {
        if (!TermMatches(document, term)) {
            return false;
        }
    }
    for (const auto& tag : dsl.tags) {
        if (!HasTag(document, tag)) {
            return false;
        }
    }
    for (const auto& filter : dsl.filters) {
        if (!MatchesFilter(document, filter)) {
            return false;
        }
    }
    return true;
}

std::vector<EventSearchDocument> SearchEventDocuments(const std::vector<EventSearchDocument>& documents,
                                                      const EventSearchDsl& dsl) {
    std::vector<EventSearchDocument> matches;
    for (const auto& document : documents) {
        if (EventSearchDocumentMatches(document, dsl)) {
            matches.push_back(document);
        }
    }
    std::sort(matches.begin(), matches.end(), [&](const auto& left, const auto& right) {
        if (dsl.sort == "eventTimeAsc") {
            return left.timestamp_ms < right.timestamp_ms;
        }
        return left.timestamp_ms > right.timestamp_ms;
    });
    if (dsl.offset >= matches.size()) {
        return {};
    }
    const std::size_t end = std::min(matches.size(), dsl.offset + dsl.limit);
    return std::vector<EventSearchDocument>(matches.begin() + static_cast<std::ptrdiff_t>(dsl.offset),
                                            matches.begin() + static_cast<std::ptrdiff_t>(end));
}

std::string EventSearchDslJson(const EventSearchDsl& dsl) {
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"" << JsonEscape(dsl.schema) << "\","
        << "\"valid\":" << (dsl.valid ? "true" : "false") << ","
        << "\"rejectionReason\":\"" << JsonEscape(dsl.rejection_reason) << "\","
        << "\"textTerms\":";
    AppendStringArray(&out, dsl.text_terms);
    out << ",\"tags\":";
    AppendStringArray(&out, dsl.tags);
    out << ",\"filters\":[";
    for (std::size_t i = 0; i < dsl.filters.size(); ++i) {
        const auto& filter = dsl.filters[i];
        if (i > 0) {
            out << ",";
        }
        out << "{"
            << "\"field\":\"" << JsonEscape(filter.field) << "\","
            << "\"op\":\"" << JsonEscape(filter.op) << "\","
            << "\"value\":\"" << JsonEscape(filter.value) << "\""
            << "}";
    }
    out << "],"
        << "\"sort\":\"" << JsonEscape(dsl.sort) << "\","
        << "\"limit\":" << dsl.limit << ","
        << "\"offset\":" << dsl.offset << ","
        << "\"strictStructuredOutput\":" << (dsl.strict_structured_output ? "true" : "false")
        << ",\"contractInvariants\":{"
        << "\"rawPromptStored\":" << (dsl.raw_llm_prompt_stored ? "true" : "false") << ","
        << "\"rawProviderResponseStored\":" << (dsl.raw_provider_response_stored ? "true" : "false") << ","
        << "\"runtimeProviderCallPerformed\":" << (dsl.runtime_provider_call_performed ? "true" : "false") << ","
        << "\"vectorSearchPerformed\":" << (dsl.vector_search_performed ? "true" : "false") << ","
        << "\"searchIndexRequired\":" << (dsl.search_index_required ? "true" : "false") << ","
        << "\"opsEventsUiRequired\":" << (dsl.ops_events_ui_required ? "true" : "false") << ","
        << "\"eventPostPayloadChanged\":" << (dsl.event_post_payload_changed ? "true" : "false") << ","
        << "\"webrtcDataChannelSchemaChanged\":"
        << (dsl.webrtc_data_channel_schema_changed ? "true" : "false") << ","
        << "\"sseWsMetadataSchemaChanged\":" << (dsl.sse_ws_metadata_schema_changed ? "true" : "false") << ","
        << "\"rtspWebrtcMediaPathChanged\":" << (dsl.rtsp_webrtc_media_path_changed ? "true" : "false") << ","
        << "\"viewerClientExposureAdded\":" << (dsl.viewer_client_exposure_added ? "true" : "false")
        << "}"
        << "}";
    return out.str();
}

bool EventSearchDslContainsForbiddenMaterial(const EventSearchDsl& dsl) {
    if (dsl.raw_llm_prompt_stored || dsl.raw_provider_response_stored ||
        dsl.runtime_provider_call_performed || dsl.vector_search_performed) {
        return true;
    }
    for (const auto& filter : dsl.filters) {
        const std::string value = LowerAscii(filter.value);
        if (Contains(value, "rtsp://") || Contains(value, "http://") ||
            Contains(value, "https://") || Contains(value, "credential")) {
            return true;
        }
    }
    return false;
}

}  // namespace analysis

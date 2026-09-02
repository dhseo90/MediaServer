// 파일 요약: WebRTC HTTP 서버 공통 파싱, 인증, registry와 transport 기반 구현이다.
#include "webrtc_http_server_detail.h"

namespace ingress {

using namespace webrtc_http_server_detail;

namespace webrtc_http_server_detail {

WebRtcHttpRuntimeConfig& WebRtcHttpRuntimeConfigStorage() {
    static WebRtcHttpRuntimeConfig config;
    return config;
}

std::mutex& WebRtcHttpRuntimeConfigMutex() {
    static std::mutex mutex;
    return mutex;
}

bool& WebRtcHttpRuntimeConfigInitialized() {
    static bool initialized = false;
    return initialized;
}

bool AcquireWebRtcHttpRuntimeConfig(const WebRtcHttpRuntimeConfig& config) {
    std::lock_guard lock(WebRtcHttpRuntimeConfigMutex());
    if (WebRtcHttpRuntimeConfigInitialized()) {
        return false;
    }
    WebRtcHttpRuntimeConfigStorage() = config;
    WebRtcHttpRuntimeConfigInitialized() = true;
    return true;
}

const WebRtcHttpRuntimeConfig& GetWebRtcHttpRuntimeConfig() {
    return WebRtcHttpRuntimeConfigStorage();
}

}  // namespace webrtc_http_server_detail

namespace webrtc_http_server_detail {

std::atomic<std::uint64_t> g_web_rtc_metadata_sequence{0};
std::atomic<std::uint64_t> g_ops_audit_sequence{0};
std::mutex g_ops_audit_mu;
std::mutex g_ops_event_review_mu;
std::mutex g_ops_alert_delivery_mu;
std::mutex g_client_live_preference_mu;
std::mutex g_source_health_audit_mu;
std::unordered_map<std::string, std::string> g_source_health_audit_state;
std::mutex g_source_health_warning_mu;
std::unordered_map<std::string, std::pair<std::string, int>> g_source_health_warning_state;


// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 106 function
std::string Trim(std::string value) {
    while (!value.empty() && std::isspace(static_cast<unsigned char>(value.front())) != 0) {
        value.erase(value.begin());
    }
    while (!value.empty() && std::isspace(static_cast<unsigned char>(value.back())) != 0) {
        value.pop_back();
    }
    return value;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 116 function
std::string UrlDecode(const std::string& value) {
    std::string out;
    out.reserve(value.size());
    for (std::size_t i = 0; i < value.size(); ++i) {
        const char ch = value[i];
        if (ch == '+') {
            out.push_back(' ');
            continue;
        }
        if (ch == '%' && i + 2 < value.size()) {
            const std::string hex = value.substr(i + 1, 2);
            char* end = nullptr;
            const long parsed = std::strtol(hex.c_str(), &end, 16);
            if (end != nullptr && *end == '\0') {
                out.push_back(static_cast<char>(parsed));
                i += 2;
                continue;
            }
        }
        out.push_back(ch);
    }
    return out;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 140 function
std::string UrlEncode(const std::string& value) {
    std::ostringstream out;
    out << std::uppercase << std::hex;
    for (const unsigned char ch : value) {
        if (std::isalnum(ch) != 0 || ch == '-' || ch == '_' || ch == '.' || ch == '~') {
            out << static_cast<char>(ch);
        } else {
            out << '%' << std::setw(2) << std::setfill('0') << static_cast<int>(ch);
        }
    }
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 153 function
std::unordered_map<std::string, std::string> ParseQueryString(const std::string& raw) {
    std::unordered_map<std::string, std::string> out;
    std::size_t from = 0;
    while (from < raw.size()) {
        const std::size_t amp = raw.find('&', from);
        const std::string pair = raw.substr(from, amp == std::string::npos ? std::string::npos : amp - from);
        if (!pair.empty()) {
            const std::size_t eq = pair.find('=');
            const std::string key = UrlDecode(pair.substr(0, eq));
            const std::string value = eq == std::string::npos ? std::string() : UrlDecode(pair.substr(eq + 1));
            out[key] = value;
        }
        if (amp == std::string::npos) {
            break;
        }
        from = amp + 1;
    }
    return out;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 173 function
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

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 201 function
// HTML template 안의 고정 placeholder를 한 번에 치환한다.
void ReplaceAll(std::string* text, const std::string& needle, const std::string& replacement) {
    if (text == nullptr || needle.empty()) {
        return;
    }
    std::size_t pos = 0;
    while ((pos = text->find(needle, pos)) != std::string::npos) {
        text->replace(pos, needle.size(), replacement);
        pos += replacement.size();
    }
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 213 function
std::string RefreshIconSvgHtml() {
    return R"(<svg class="refresh-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M21 12a9 9 0 1 1-2.64-6.36" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M21 3v6h-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>)";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 217 function
std::string RefreshIconButtonHtml(const std::string& id,
                                  const std::string& classes,
                                  const std::string& label) {
    std::ostringstream out;
    out << "<button id=\"" << id << "\" class=\"" << classes
        << " refresh-icon-button\" type=\"button\" aria-label=\"" << label
        << "\" title=\"" << label << "\">" << RefreshIconSvgHtml() << "</button>";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 227 function
bool ParseBoolQuery(const std::unordered_map<std::string, std::string>& query,
                    const std::string& key,
                    bool default_value) {
    const auto it = query.find(key);
    if (it == query.end()) {
        return default_value;
    }
    const std::string value = it->second;
    return value == "1" || value == "true" || value == "yes" || value == "on";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 238 function
int ParseClampedIntQuery(const std::unordered_map<std::string, std::string>& query,
                         const std::string& key,
                         int default_value,
                         int min_value,
                         int max_value) {
    const auto it = query.find(key);
    if (it == query.end()) {
        return default_value;
    }
    try {
        const int parsed = std::stoi(it->second);
        return std::max(min_value, std::min(max_value, parsed));
    } catch (...) {
        return default_value;
    }
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 255 function
std::optional<int> ParseIntField(const std::string& body, const std::string& field) {
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
    std::size_t end = pos;
    while (end < body.size() && std::isdigit(static_cast<unsigned char>(body[end])) != 0) {
        ++end;
    }
    if (end == pos) {
        return std::nullopt;
    }
    return std::stoi(body.substr(pos, end - pos));
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 279 function
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
    if (body.compare(pos, 1, "1") == 0) {
        return true;
    }
    if (body.compare(pos, 1, "0") == 0) {
        return false;
    }
    return std::nullopt;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 308 function
std::optional<std::int64_t> ParseInt64Field(const std::string& body, const std::string& field) {
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
    std::size_t end = pos;
    if (end < body.size() && body[end] == '-') {
        ++end;
    }
    while (end < body.size() && std::isdigit(static_cast<unsigned char>(body[end])) != 0) {
        ++end;
    }
    if (end == pos || (end == pos + 1 && body[pos] == '-')) {
        return std::nullopt;
    }
    try {
        return std::stoll(body.substr(pos, end - pos));
    } catch (...) {
        return std::nullopt;
    }
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 339 function
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

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 388 function
// JSON 문자열에서 지정 field의 중괄호/대괄호 범위를 문자열 리터럴을 피해 추출한다.
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

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 440 function
// JSON 문자열에서 object field 본문을 추출한다.
std::optional<std::string> ExtractObjectField(const std::string& body, const std::string& field) {
    return ExtractDelimitedField(body, field, '{', '}');
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 445 function
std::size_t CountJsonFieldOccurrences(const std::string& body, const std::string& field) {
    const std::string needle = "\"" + field + "\"";
    std::size_t count = 0;
    std::size_t pos = 0;
    while ((pos = body.find(needle, pos)) != std::string::npos) {
        ++count;
        pos += needle.size();
    }
    return count;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 456 function
bool JsonFieldIsNull(const std::string& body, const std::string& field) {
    const std::string needle = "\"" + field + "\"";
    std::size_t pos = body.find(needle);
    if (pos == std::string::npos) {
        return false;
    }
    pos = body.find(':', pos + needle.size());
    if (pos == std::string::npos) {
        return false;
    }
    ++pos;
    while (pos < body.size() && std::isspace(static_cast<unsigned char>(body[pos])) != 0) {
        ++pos;
    }
    return body.compare(pos, 4, "null") == 0;
}

std::optional<std::string> ExtractDelimitedValueAt(const std::string& body,
                                                   std::size_t start,
                                                   char open_ch,
                                                   char close_ch);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 478 function
bool ReplaceObjectField(std::string* body,
                        const std::string& field,
                        const std::string& replacement) {
    if (body == nullptr || replacement.empty() || replacement.front() != '{' || replacement.back() != '}') {
        return false;
    }
    const std::string needle = "\"" + field + "\"";
    const std::size_t field_pos = body->find(needle);
    if (field_pos == std::string::npos) {
        return false;
    }
    const std::size_t colon = body->find(':', field_pos + needle.size());
    if (colon == std::string::npos) {
        return false;
    }
    const std::size_t object_start = body->find('{', colon + 1);
    if (object_start == std::string::npos) {
        return false;
    }
    const auto current = ExtractDelimitedValueAt(*body, object_start, '{', '}');
    if (!current.has_value()) {
        return false;
    }
    body->replace(object_start, current->size(), replacement);
    return true;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 505 function
// JSON 문자열에서 array field 본문을 추출한다.
std::optional<std::string> ExtractArrayField(const std::string& body, const std::string& field) {
    return ExtractDelimitedField(body, field, '[', ']');
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 510 function
std::optional<std::string> ExtractDelimitedValueAt(const std::string& body,
                                                   std::size_t start,
                                                   char open_ch,
                                                   char close_ch) {
    if (start >= body.size() || body[start] != open_ch) {
        return std::nullopt;
    }
    bool in_string = false;
    bool escaped = false;
    int depth = 0;
    for (std::size_t pos = start; pos < body.size(); ++pos) {
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

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 549 function
std::optional<std::string> ExtractJsonValueField(const std::string& body, const std::string& field) {
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
    if (pos >= body.size()) {
        return std::nullopt;
    }
    if (body[pos] == '{') {
        return ExtractDelimitedValueAt(body, pos, '{', '}');
    }
    if (body[pos] == '[') {
        return ExtractDelimitedValueAt(body, pos, '[', ']');
    }
    if (body[pos] == '"') {
        bool escaped = false;
        for (std::size_t end = pos + 1; end < body.size(); ++end) {
            const char ch = body[end];
            if (escaped) {
                escaped = false;
                continue;
            }
            if (ch == '\\') {
                escaped = true;
                continue;
            }
            if (ch == '"') {
                return body.substr(pos, end - pos + 1);
            }
        }
        return std::nullopt;
    }
    std::size_t end = pos;
    while (end < body.size() && body[end] != ',' && body[end] != '}' && body[end] != ']') {
        ++end;
    }
    return Trim(body.substr(pos, end - pos));
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 597 function
// string array에 공백이 아닌 실제 값이 하나 이상 있는지 확인한다.
bool StringArrayHasNonEmptyValue(const std::string& array_body) {
    bool in_string = false;
    bool escaped = false;
    std::string current;
    for (std::size_t pos = 1; pos + 1 < array_body.size(); ++pos) {
        const char ch = array_body[pos];
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
            if (!Trim(current).empty()) {
                return true;
            }
            in_string = false;
            continue;
        }
        current.push_back(ch);
    }
    return false;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 632 function
std::vector<std::string> StringArrayValues(const std::string& array_body) {
    std::vector<std::string> values;
    bool in_string = false;
    bool escaped = false;
    std::string current;
    for (std::size_t pos = 1; pos + 1 < array_body.size(); ++pos) {
        const char ch = array_body[pos];
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
            const std::string value = Trim(current);
            if (!value.empty()) {
                values.push_back(value);
            }
            in_string = false;
            continue;
        }
        current.push_back(ch);
    }
    return values;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 668 function
std::vector<std::string> StringArrayFieldValues(const std::string& body, const std::string& field) {
    const auto array = ExtractArrayField(body, field);
    return array.has_value() ? StringArrayValues(*array) : std::vector<std::string>{};
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 673 function
bool StringArrayIncludesAll(const std::vector<std::string>& source,
                            const std::vector<std::string>& required) {
    std::set<std::string> source_set(source.begin(), source.end());
    return std::all_of(required.begin(), required.end(), [&](const std::string& value) {
        return source_set.find(value) != source_set.end();
    });
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 681 function
std::string JsonStringArray(const std::vector<std::string>& values) {
    std::ostringstream out;
    out << "[";
    for (std::size_t i = 0; i < values.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << "\"" << JsonEscape(values[i]) << "\"";
    }
    out << "]";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 694 function
std::vector<std::string> AnalysisClassesFromDocument(const std::string& body) {
    if (const auto analysis = ExtractObjectField(body, "analysis"); analysis.has_value()) {
        if (auto values = StringArrayFieldValues(*analysis, "classes"); !values.empty()) {
            return values;
        }
    }
    if (const auto scenario = ExtractObjectField(body, "scenario"); scenario.has_value()) {
        if (auto values = StringArrayFieldValues(*scenario, "targetClasses"); !values.empty()) {
            return values;
        }
    }
    if (auto values = StringArrayFieldValues(body, "classes"); !values.empty()) {
        return values;
    }
    return {};
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 711 function
std::string NormalizeTrackingPolicyToken(std::string value) {
    value = Trim(std::move(value));
    std::transform(value.begin(), value.end(), value.begin(), [](unsigned char ch) {
        return static_cast<char>(std::tolower(ch));
    });
    if (value.empty() || value == "default" || value == "lite" || value == "lite/default" ||
        value == "lightweight" || value == "direction-based") {
        return "lite";
    }
    if (value == "none" || value == "kalman-lite" || value == "bytetrack") {
        return value;
    }
    return {};
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 726 function
std::string NormalizeReidPolicyToken(std::string value) {
    value = Trim(std::move(value));
    std::transform(value.begin(), value.end(), value.begin(), [](unsigned char ch) {
        return static_cast<char>(std::tolower(ch));
    });
    if (value.empty() || value == "off" || value == "none" || value == "disabled") {
        return "off";
    }
    if (value == "assist" || value == "association-assist" || value == "reid-assist") {
        return "assist";
    }
    return {};
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 740 function
std::optional<std::string> FirstStringFieldValue(const std::string& body,
                                                 const std::vector<std::string>& fields) {
    for (const auto& field : fields) {
        const auto value = ParseStringField(body, field);
        if (value.has_value()) {
            return value;
        }
    }
    return std::nullopt;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 751 function
std::optional<std::string> TrackingPolicyObjectFromRuleDocument(const std::string& body,
                                                                const std::string& analysis) {
    if (const auto policy = ExtractObjectField(analysis, "trackingPolicy"); policy.has_value()) {
        return policy;
    }
    if (const auto policy = ExtractObjectField(body, "trackingPolicy"); policy.has_value()) {
        return policy;
    }
    return std::nullopt;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 762 function
bool ValidateTrackingPolicyContract(const std::string& body,
                                    const std::string& analysis,
                                    const std::string& document_label,
                                    std::string* error_message) {
    const auto set_error = [error_message](const std::string& message) {
        if (error_message != nullptr) {
            *error_message = message;
        }
    };
    const auto policy = TrackingPolicyObjectFromRuleDocument(body, analysis);
    if (!policy.has_value()) {
        return true;
    }
    const bool has_tracker_field =
        FirstStringFieldValue(*policy, {"tracker", "trackerPolicy"}).has_value();
    const bool has_reid_field =
        FirstStringFieldValue(*policy, {"reid", "reId", "reID", "reidPolicy"}).has_value();
    if (!has_tracker_field) {
        set_error(document_label + " analysis.trackingPolicy.tracker is required for explicit opt-in policy");
        return false;
    }
    const std::string tracker = NormalizeTrackingPolicyToken(
        FirstStringFieldValue(*policy, {"tracker", "trackerPolicy"}).value_or(""));
    if (tracker.empty()) {
        set_error(document_label +
                  " analysis.trackingPolicy.tracker must be none, lite, kalman-lite, or bytetrack");
        return false;
    }
    const std::string reid = NormalizeReidPolicyToken(
        FirstStringFieldValue(*policy, {"reid", "reId", "reID", "reidPolicy"}).value_or("off"));
    if (reid.empty()) {
        set_error(document_label + " analysis.trackingPolicy.reid must be off or assist");
        return false;
    }
    if (tracker == "none" && reid != "off") {
        set_error(document_label + " analysis.trackingPolicy.reid must be off when tracker is none");
        return false;
    }
    return true;
}
// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 802 function
// object 본문 안의 string array field가 비어 있지 않은지 확인한다.
bool HasNonEmptyStringArrayField(const std::string& body, const std::string& field) {
    const auto array = ExtractArrayField(body, field);
    return array.has_value() && StringArrayHasNonEmptyValue(*array);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 808 function
bool LooksLikeJsonObject(const std::string& body) {
    const std::string trimmed = Trim(body);
    return trimmed.size() >= 2 && trimmed.front() == '{' && trimmed.back() == '}';
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 813 function
bool IsBuiltInAnalysisProfileId(const std::string& id) {
    return id == "1" || id == "2" || id == "3" || id == "4" || id == "5";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 817 function
std::vector<std::string> ExtractJsonObjectArray(const std::string& body, const std::string& field) {
    std::vector<std::string> objects;
    const std::string needle = "\"" + field + "\"";
    std::size_t pos = body.find(needle);
    if (pos == std::string::npos) {
        return objects;
    }
    pos = body.find('[', pos + needle.size());
    if (pos == std::string::npos) {
        return objects;
    }

    bool in_string = false;
    bool escaped = false;
    int object_depth = 0;
    std::size_t object_start = std::string::npos;
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
            if (object_depth == 0) {
                object_start = pos;
            }
            ++object_depth;
        } else if (ch == '}') {
            if (object_depth > 0) {
                --object_depth;
                if (object_depth == 0 && object_start != std::string::npos) {
                    objects.push_back(body.substr(object_start, pos - object_start + 1));
                    object_start = std::string::npos;
                }
            }
        } else if (ch == ']' && object_depth == 0) {
            break;
        }
    }
    return objects;
}




// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 892 function
AnalysisRegistryMutationResult AnalysisRegistrySuccess(std::string response_body) {
    return {true,
            AnalysisRegistryMutationFailure::None,
            std::move(response_body),
            std::string(),
            std::string()};
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 900 function
AnalysisRegistryMutationResult AnalysisRegistryFailure(AnalysisRegistryMutationFailure failure,
                                                        std::string error_message,
                                                        std::string persistence_stage) {
    return {false,
            failure,
            std::string(),
            std::move(error_message),
            std::move(persistence_stage)};
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 910 function
std::string AnalysisRegistryFaultStage() {
    const char* value = std::getenv("MEDIA_SERVER_ANALYSIS_REGISTRY_FAULT_STAGE");
    return value == nullptr ? std::string() : Trim(value);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 915 function
std::string AnalysisRegistryCrashStage() {
    const char* value = std::getenv("MEDIA_SERVER_ANALYSIS_REGISTRY_CRASH_STAGE");
    return value == nullptr ? std::string() : Trim(value);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 920 function
std::filesystem::path AnalysisRegistryTransactionPath(const std::filesystem::path& storage_path) {
    return storage_path.string() + ".txn";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 924 function
std::filesystem::path AnalysisRegistryRollbackPath(const std::filesystem::path& storage_path) {
    return storage_path.string() + ".rollback";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 928 function
std::filesystem::path AnalysisRegistryRestorePath(const std::filesystem::path& storage_path) {
    return storage_path.string() + ".tmp.restore";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 932 function
bool SyncAnalysisRegistryDirectory(int directory_fd, std::string* detail) {
    while (::fsync(directory_fd) != 0) {
        if (errno == EINTR) {
            continue;
        }
        if (detail != nullptr) {
            *detail = std::string("failed to flush analysis registry parent directory: ") +
                      std::strerror(errno);
        }
        return false;
    }
    return true;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 946 function
bool WriteAnalysisRegistryTransactionMarker(const std::filesystem::path& storage_path,
                                            const std::string& state,
                                            bool previous_exists,
                                            int directory_fd,
                                            std::string* detail) {
    const std::filesystem::path marker_path = AnalysisRegistryTransactionPath(storage_path);
    const std::filesystem::path temp_path = storage_path.string() + ".tmp.txn." +
                                            std::to_string(static_cast<long long>(::getpid()));
    (void)::unlink(temp_path.c_str());
    int flags = O_WRONLY | O_CREAT | O_EXCL;
#if defined(O_CLOEXEC)
    flags |= O_CLOEXEC;
#endif
#if defined(O_NOFOLLOW)
    flags |= O_NOFOLLOW;
#endif
    int fd = ::open(temp_path.c_str(), flags, 0600);
    if (fd < 0) {
        if (detail != nullptr) {
            *detail = std::string("failed to open analysis registry transaction marker: ") +
                      std::strerror(errno);
        }
        return false;
    }
    const std::string body = "media-server.analysis-registry-transaction.v1\nstate=" + state +
                             "\nprevious=" + (previous_exists ? "present" : "absent") + "\n";
    const char* cursor = body.data();
    std::size_t remaining = body.size();
    while (remaining > 0) {
        const ssize_t written = ::write(fd, cursor, remaining);
        if (written < 0 && errno == EINTR) {
            continue;
        }
        if (written <= 0) {
            if (detail != nullptr) {
                *detail = std::string("failed to write analysis registry transaction marker: ") +
                          (written < 0 ? std::strerror(errno) : "short write");
            }
            (void)::close(fd);
            (void)::unlink(temp_path.c_str());
            return false;
        }
        cursor += written;
        remaining -= static_cast<std::size_t>(written);
    }
    while (::fsync(fd) != 0) {
        if (errno == EINTR) {
            continue;
        }
        if (detail != nullptr) {
            *detail = std::string("failed to flush analysis registry transaction marker: ") +
                      std::strerror(errno);
        }
        (void)::close(fd);
        (void)::unlink(temp_path.c_str());
        return false;
    }
    if (::close(fd) != 0) {
        if (detail != nullptr) {
            *detail = std::string("failed to close analysis registry transaction marker: ") +
                      std::strerror(errno);
        }
        (void)::unlink(temp_path.c_str());
        return false;
    }
    if (::rename(temp_path.c_str(), marker_path.c_str()) != 0) {
        if (detail != nullptr) {
            *detail = std::string("failed to publish analysis registry transaction marker: ") +
                      std::strerror(errno);
        }
        (void)::unlink(temp_path.c_str());
        return false;
    }
    return SyncAnalysisRegistryDirectory(directory_fd, detail);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 1022 function
bool RestoreAnalysisRegistryPreviousState(const std::filesystem::path& storage_path,
                                          bool previous_exists,
                                          int directory_fd,
                                          std::string* detail) {
    const std::filesystem::path rollback_path = AnalysisRegistryRollbackPath(storage_path);
    const std::filesystem::path restore_path = AnalysisRegistryRestorePath(storage_path);
    (void)::unlink(restore_path.c_str());
    if (previous_exists) {
        if (::link(rollback_path.c_str(), restore_path.c_str()) != 0) {
            if (detail != nullptr) {
                *detail = std::string("failed to link analysis registry rollback snapshot: ") +
                          std::strerror(errno);
            }
            return false;
        }
        if (::rename(restore_path.c_str(), storage_path.c_str()) != 0) {
            if (detail != nullptr) {
                *detail = std::string("failed to restore analysis registry rollback snapshot: ") +
                          std::strerror(errno);
            }
            (void)::unlink(restore_path.c_str());
            return false;
        }
    } else if (::unlink(storage_path.c_str()) != 0 && errno != ENOENT) {
        if (detail != nullptr) {
            *detail = std::string("failed to restore absent analysis registry target: ") +
                      std::strerror(errno);
        }
        return false;
    }
    return SyncAnalysisRegistryDirectory(directory_fd, detail);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 1055 function
bool CleanupAnalysisRegistryTransaction(const std::filesystem::path& storage_path,
                                        int directory_fd,
                                        std::string* detail) {
    bool ok = true;
    for (const auto& artifact : {AnalysisRegistryTransactionPath(storage_path),
                                 AnalysisRegistryRollbackPath(storage_path),
                                 AnalysisRegistryRestorePath(storage_path)}) {
        if (::unlink(artifact.c_str()) != 0 && errno != ENOENT) {
            ok = false;
            if (detail != nullptr && detail->empty()) {
                *detail = std::string("failed to remove analysis registry transaction artifact: ") +
                          std::strerror(errno);
            }
        }
    }
    if (!SyncAnalysisRegistryDirectory(directory_fd, detail)) {
        ok = false;
    }
    return ok;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 1076 function
void RecoverAnalysisRegistryTemporaryFiles(const std::filesystem::path& storage_path) {
    if (storage_path.empty()) {
        return;
    }
    const std::filesystem::path parent = storage_path.parent_path().empty()
                                             ? std::filesystem::path(".")
                                             : storage_path.parent_path();
    std::error_code parent_exists_error;
    const bool parent_exists = std::filesystem::exists(parent, parent_exists_error);
    if (parent_exists_error) {
        std::cerr << "[analysis-registry] transaction recovery directory check failed: "
                  << parent_exists_error.message() << "\n";
        ::_exit(88);
    }
    if (!parent_exists) {
        // Transaction artifact는 parent directory 없이 존재할 수 없다. 첫 registry mutation이
        // transaction 준비 전에 directory를 생성한다.
        return;
    }
    int directory_flags = O_RDONLY;
#if defined(O_CLOEXEC)
    directory_flags |= O_CLOEXEC;
#endif
#if defined(O_DIRECTORY)
    directory_flags |= O_DIRECTORY;
#endif
    const int directory_fd = ::open(parent.c_str(), directory_flags);
    if (directory_fd < 0) {
        std::cerr << "[analysis-registry] transaction recovery directory open failed: "
                  << std::strerror(errno) << "\n";
        ::_exit(88);
    }
    const std::filesystem::path marker_path = AnalysisRegistryTransactionPath(storage_path);
    const std::filesystem::path rollback_path = AnalysisRegistryRollbackPath(storage_path);
    if (std::filesystem::exists(marker_path)) {
        std::ifstream input(marker_path);
        const std::string marker((std::istreambuf_iterator<char>(input)),
                                 std::istreambuf_iterator<char>());
        const std::string marker_prefix = "media-server.analysis-registry-transaction.v1\n";
        const bool prepared_present =
            marker == marker_prefix + "state=prepared\nprevious=present\n";
        const bool prepared_absent =
            marker == marker_prefix + "state=prepared\nprevious=absent\n";
        const bool committed_present =
            marker == marker_prefix + "state=committed\nprevious=present\n";
        const bool committed_absent =
            marker == marker_prefix + "state=committed\nprevious=absent\n";
        const bool prepared = prepared_present || prepared_absent;
        const bool committed = committed_present || committed_absent;
        const bool previous_exists = prepared_present || committed_present;
        if (!prepared && !committed) {
            std::cerr << "[analysis-registry] invalid transaction marker; recovery stopped\n";
            ::_exit(88);
        }
        std::string recovery_detail;
        if (prepared && !RestoreAnalysisRegistryPreviousState(storage_path,
                                                               previous_exists,
                                                               directory_fd,
                                                               &recovery_detail)) {
            std::cerr << "[analysis-registry] prepared transaction recovery failed: "
                      << recovery_detail << "\n";
            ::_exit(88);
        }
        if (!CleanupAnalysisRegistryTransaction(storage_path, directory_fd, &recovery_detail)) {
            std::cerr << "[analysis-registry] transaction cleanup failed: "
                      << recovery_detail << "\n";
            ::_exit(88);
        }
    } else if (std::filesystem::exists(rollback_path)) {
        std::string cleanup_detail;
        if (!CleanupAnalysisRegistryTransaction(storage_path, directory_fd, &cleanup_detail)) {
            std::cerr << "[analysis-registry] orphan rollback cleanup failed: "
                      << cleanup_detail << "\n";
            ::_exit(88);
        }
    }
    (void)::close(directory_fd);
    const std::string prefix = storage_path.filename().string() + ".tmp.";
    std::error_code iterator_error;
    std::filesystem::directory_iterator iterator(parent, iterator_error);
    if (iterator_error) {
        return;
    }
    for (const auto& entry : iterator) {
        const std::string name = entry.path().filename().string();
        if (name.rfind(prefix, 0) != 0) {
            continue;
        }
        std::error_code status_error;
        const auto status = entry.symlink_status(status_error);
        if (status_error || (!std::filesystem::is_regular_file(status) &&
                             !std::filesystem::is_symlink(status))) {
            continue;
        }
        std::error_code remove_error;
        (void)std::filesystem::remove(entry.path(), remove_error);
        if (remove_error) {
            std::cerr << "[analysis-registry] stale temp cleanup failed: "
                      << remove_error.message() << "\n";
        }
    }
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 1179 function
// V390-REVIEW4-54는 SAFE-217/OPS-184의 mode/file/parent durability와 failure atomicity를 고정한다.
AnalysisRegistryWriteResult WriteAnalysisRegistryFileAtomically(
    const std::filesystem::path& storage_path,
    const std::string& body) {
    auto failure = [](std::string stage, std::string detail, bool target_replaced = false) {
        return AnalysisRegistryWriteResult{
            false, std::move(stage), std::move(detail), target_replaced};
    };
    if (storage_path.empty()) {
        return failure("path", "analysis registry path is empty");
    }
    const std::string fault_stage = AnalysisRegistryFaultStage();
    const std::string crash_stage = AnalysisRegistryCrashStage();
    auto crash_if_requested = [&](const char* stage) {
        if (crash_stage == stage) {
            ::_exit(86);
        }
    };
    const std::filesystem::path parent = storage_path.parent_path().empty()
                                             ? std::filesystem::path(".")
                                             : storage_path.parent_path();
    if (fault_stage == "parent") {
        return failure("parent", "injected analysis registry parent failure");
    }
    std::error_code directory_error;
    std::filesystem::create_directories(parent, directory_error);
    if (directory_error) {
        return failure("parent", "failed to prepare analysis registry parent: " + directory_error.message());
    }

    mode_t target_mode = 0640;
    bool target_existed = false;
    struct stat target_stat {};
    if (::lstat(storage_path.c_str(), &target_stat) == 0) {
        if (!S_ISREG(target_stat.st_mode)) {
            return failure("mode", "analysis registry target is not a regular file");
        }
        target_existed = true;
        target_mode = target_stat.st_mode & 07777;
    } else if (errno != ENOENT) {
        return failure("mode", std::string("failed to inspect analysis registry mode: ") +
                                   std::strerror(errno));
    }

    const std::string base = storage_path.string() + ".tmp." +
                             std::to_string(static_cast<long long>(::getpid())) + ".";
    std::filesystem::path temp_path;
    int fd = -1;
    if (fault_stage == "open") {
        return failure("open", "injected analysis registry open failure");
    }
    int open_flags = O_WRONLY | O_CREAT | O_EXCL;
#if defined(O_CLOEXEC)
    open_flags |= O_CLOEXEC;
#endif
#if defined(O_NOFOLLOW)
    open_flags |= O_NOFOLLOW;
#endif
    for (int attempt = 0; attempt < 64; ++attempt) {
        temp_path = base + std::to_string(attempt);
        fd = ::open(temp_path.c_str(), open_flags, 0600);
        if (fd >= 0) {
            break;
        }
        if (errno != EEXIST) {
            return failure("open", std::string("failed to open analysis registry temp file: ") + std::strerror(errno));
        }
    }
    if (fd < 0) {
        return failure("open", "failed to allocate unique analysis registry temp file");
    }

    auto cleanup_temp = [&]() {
        if (fd >= 0) {
            (void)::close(fd);
            fd = -1;
        }
        (void)::unlink(temp_path.c_str());
    };
    if (fault_stage == "mode") {
        cleanup_temp();
        return failure("mode", "injected analysis registry mode failure");
    }
    while (::fchmod(fd, target_mode) != 0) {
        if (errno == EINTR) {
            continue;
        }
        const std::string detail = std::string("failed to preserve analysis registry mode: ") +
                                   std::strerror(errno);
        cleanup_temp();
        return failure("mode", detail);
    }
    if (fault_stage == "write") {
        if (!body.empty()) {
            (void)::write(fd, body.data(), std::min<std::size_t>(body.size(), 7));
        }
        cleanup_temp();
        return failure("write", "injected analysis registry short write");
    }
    const char* cursor = body.data();
    std::size_t remaining = body.size();
    while (remaining > 0) {
        const ssize_t written = ::write(fd, cursor, remaining);
        if (written < 0) {
            if (errno == EINTR) {
                continue;
            }
            const std::string detail = std::string("failed to write analysis registry temp file: ") +
                                       std::strerror(errno);
            cleanup_temp();
            return failure("write", detail);
        }
        if (written == 0) {
            cleanup_temp();
            return failure("write", "analysis registry temp file short write");
        }
        cursor += written;
        remaining -= static_cast<std::size_t>(written);
    }
    if (fault_stage == "flush") {
        cleanup_temp();
        return failure("flush", "injected analysis registry flush failure");
    }
    while (::fsync(fd) != 0) {
        if (errno == EINTR) {
            continue;
        }
        const std::string detail = std::string("failed to flush analysis registry temp file: ") +
                                   std::strerror(errno);
        cleanup_temp();
        return failure("flush", detail);
    }
    if (fault_stage == "close") {
        cleanup_temp();
        return failure("close", "injected analysis registry close failure");
    }
    if (::close(fd) != 0) {
        fd = -1;
        (void)::unlink(temp_path.c_str());
        return failure("flush", std::string("failed to close analysis registry temp file: ") +
                                    std::strerror(errno));
    }
    fd = -1;
    crash_if_requested("after-temp-fsync");

    if (fault_stage == "directory-open") {
        (void)::unlink(temp_path.c_str());
        return failure("directory-open", "injected analysis registry directory open failure");
    }
    int directory_flags = O_RDONLY;
#if defined(O_CLOEXEC)
    directory_flags |= O_CLOEXEC;
#endif
#if defined(O_DIRECTORY)
    directory_flags |= O_DIRECTORY;
#endif
    const int directory_fd = ::open(parent.c_str(), directory_flags);
    if (directory_fd < 0) {
        const std::string detail = std::string("failed to open analysis registry parent directory: ") +
                                   std::strerror(errno);
        (void)::unlink(temp_path.c_str());
        return failure("directory-open", detail);
    }
    if (fault_stage == "rename") {
        (void)::close(directory_fd);
        (void)::unlink(temp_path.c_str());
        return failure("rename", "injected analysis registry rename failure");
    }
    const std::filesystem::path rollback_path = AnalysisRegistryRollbackPath(storage_path);
    if (std::filesystem::exists(AnalysisRegistryTransactionPath(storage_path)) ||
        std::filesystem::exists(rollback_path)) {
        (void)::close(directory_fd);
        (void)::unlink(temp_path.c_str());
        return failure("transaction", "analysis registry transaction artifacts require recovery");
    }
    if (target_existed && ::link(storage_path.c_str(), rollback_path.c_str()) != 0) {
        const std::string detail = std::string("failed to snapshot analysis registry rollback state: ") +
                                   std::strerror(errno);
        (void)::close(directory_fd);
        (void)::unlink(temp_path.c_str());
        return failure("transaction", detail);
    }
    std::string transaction_detail;
    if (!WriteAnalysisRegistryTransactionMarker(storage_path,
                                                "prepared",
                                                target_existed,
                                                directory_fd,
                                                &transaction_detail)) {
        (void)CleanupAnalysisRegistryTransaction(storage_path, directory_fd, nullptr);
        (void)::close(directory_fd);
        (void)::unlink(temp_path.c_str());
        return failure("transaction", transaction_detail);
    }
    if (::rename(temp_path.c_str(), storage_path.c_str()) != 0) {
        const std::string detail = std::string("failed to replace analysis registry file: ") +
                                   std::strerror(errno);
        (void)CleanupAnalysisRegistryTransaction(storage_path, directory_fd, nullptr);
        (void)::close(directory_fd);
        (void)::unlink(temp_path.c_str());
        return failure("rename", detail);
    }
    crash_if_requested("after-rename");
    auto rollback_failure = [&](std::string detail) -> AnalysisRegistryWriteResult {
        crash_if_requested("during-rollback");
        std::string rollback_detail;
        if (!RestoreAnalysisRegistryPreviousState(storage_path,
                                                  target_existed,
                                                  directory_fd,
                                                  &rollback_detail) ||
            !CleanupAnalysisRegistryTransaction(storage_path, directory_fd, &rollback_detail)) {
            std::cerr << "[analysis-registry] rollback requires startup recovery: "
                      << rollback_detail << "\n";
            ::_exit(87);
        }
        (void)::close(directory_fd);
        return failure("directory-flush", std::move(detail));
    };
    if (fault_stage == "directory-flush") {
        return rollback_failure("injected analysis registry directory flush failure");
    }
    std::string directory_sync_detail;
    if (!SyncAnalysisRegistryDirectory(directory_fd, &directory_sync_detail)) {
        return rollback_failure(std::move(directory_sync_detail));
    }
    if (!WriteAnalysisRegistryTransactionMarker(storage_path,
                                                "committed",
                                                target_existed,
                                                directory_fd,
                                                &transaction_detail)) {
        return rollback_failure("failed to commit analysis registry transaction marker: " +
                                transaction_detail);
    }
    crash_if_requested("after-directory-fsync");
    std::string cleanup_detail;
    if (!CleanupAnalysisRegistryTransaction(storage_path, directory_fd, &cleanup_detail)) {
        std::cerr << "[analysis-registry] committed transaction cleanup deferred: "
                  << cleanup_detail << "\n";
    }
    (void)::close(directory_fd);
    return {true, "none", std::string(), true};
}


// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 2707 function
AnalysisDocumentRegistry& AnalysisRegistry() {
    static AnalysisDocumentRegistry registry;
    return registry;
}



std::string HeaderValue(const HttpRequest& request, const std::string& key);
std::string LowerAscii(std::string value);


// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 2735 function
void EraseHeaderCaseInsensitive(std::unordered_map<std::string, std::string>* headers,
                                const std::string& key) {
    if (headers == nullptr) {
        return;
    }
    const std::string wanted = LowerAscii(key);
    for (auto it = headers->begin(); it != headers->end();) {
        if (LowerAscii(it->first) == wanted) {
            it = headers->erase(it);
        } else {
            ++it;
        }
    }
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 2750 function
std::string CorsRequestOrigin(const HttpRequest& request) {
    std::string origin = Trim(HeaderValue(request, "Origin"));
    if (origin.find('\r') != std::string::npos || origin.find('\n') != std::string::npos) {
        return "";
    }
    return origin;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 2758 function
std::string RequestHostForOriginCheck(const HttpRequest& request) {
    std::string host = Trim(HeaderValue(request, "Host"));
    if (host.find('\r') != std::string::npos || host.find('\n') != std::string::npos) {
        return "";
    }
    const auto slash = host.find('/');
    if (slash != std::string::npos) {
        host = host.substr(0, slash);
    }
    return host;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 2770 function
bool IsCorsOriginAllowed(const HttpRequest& request) {
    const std::string origin = CorsRequestOrigin(request);
    const std::string host = RequestHostForOriginCheck(request);
    if (origin.empty() || host.empty()) {
        return false;
    }
    const std::string normalized_origin = LowerAscii(origin);
    const std::string normalized_host = LowerAscii(host);
    return normalized_origin == "http://" + normalized_host ||
           normalized_origin == "https://" + normalized_host;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 2782 function
bool IsCorsOriginDenied(const HttpRequest& request) {
    return !CorsRequestOrigin(request).empty() && !IsCorsOriginAllowed(request);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 2786 function
bool VaryHeaderHasOrigin(const std::string& vary) {
    std::istringstream parts(vary);
    std::string part;
    while (std::getline(parts, part, ',')) {
        if (LowerAscii(Trim(std::move(part))) == "origin") {
            return true;
        }
    }
    return false;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 2797 function
void AddCorsHeadersForRequest(const HttpRequest* request, HttpResponse* response) {
    if (response == nullptr) {
        return;
    }
    EraseHeaderCaseInsensitive(&response->headers, "Access-Control-Allow-Origin");
    EraseHeaderCaseInsensitive(&response->headers, "Access-Control-Allow-Headers");
    EraseHeaderCaseInsensitive(&response->headers, "Access-Control-Allow-Methods");
    if (request == nullptr || !IsCorsOriginAllowed(*request)) {
        return;
    }
    const std::string origin = CorsRequestOrigin(*request);
    response->headers["Access-Control-Allow-Origin"] = origin;
    response->headers["Access-Control-Allow-Headers"] = kCorsAllowHeaders;
    response->headers["Access-Control-Allow-Methods"] = kCorsAllowMethods;
    auto vary_it = response->headers.find("Vary");
    if (vary_it == response->headers.end() || Trim(vary_it->second).empty()) {
        response->headers["Vary"] = "Origin";
    } else if (!VaryHeaderHasOrigin(vary_it->second)) {
        vary_it->second += ", Origin";
    }
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 2819 function
void AppendCorsHeaderLines(std::ostringstream& out, const HttpRequest& request) {
    if (!IsCorsOriginAllowed(request)) {
        return;
    }
    const std::string origin = CorsRequestOrigin(request);
    out << "Access-Control-Allow-Origin: " << origin << "\r\n"
        << "Access-Control-Allow-Headers: " << kCorsAllowHeaders << "\r\n"
        << "Access-Control-Allow-Methods: " << kCorsAllowMethods << "\r\n"
        << "Vary: Origin\r\n";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 2830 function
HttpResponse CorsForbiddenResponse() {
    return HttpResponse{403,
                        "Forbidden",
                        "text/plain; charset=utf-8",
                        {},
                        "cross-origin requests are not allowed"};
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 2838 function
HttpResponse CorsPreflightResponse(const HttpRequest& request) {
    if (IsCorsOriginDenied(request)) {
        return CorsForbiddenResponse();
    }
    HttpResponse response{204, "No Content", "text/plain; charset=utf-8", {}, ""};
    AddCorsHeadersForRequest(&request, &response);
    return response;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 2847 function
std::string BuildHttpResponse(const HttpResponse& response, const HttpRequest* request) {
    HttpResponse response_for_wire = response;
    AddCorsHeadersForRequest(request, &response_for_wire);
    std::ostringstream out;
    out << "HTTP/1.1 " << response_for_wire.status << " " << response_for_wire.status_text << "\r\n";
    out << "Content-Type: " << response_for_wire.content_type << "\r\n";
    out << "Content-Length: " << response_for_wire.body.size() << "\r\n";
    out << "Connection: close\r\n";
    for (const auto& [key, value] : response_for_wire.headers) {
        out << key << ": " << value << "\r\n";
    }
    out << "\r\n";
    out << response_for_wire.body;
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 2863 function
HttpResponse PlainTextResponse(int status, const std::string& status_text, const std::string& body) {
    return HttpResponse{status, status_text, "text/plain; charset=utf-8", {}, body};
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 2867 function
bool ParseHttpContentLength(std::string value, std::size_t* content_length) {
    if (content_length == nullptr) {
        return false;
    }
    value = Trim(std::move(value));
    if (value.empty()) {
        return false;
    }
    std::size_t parsed = 0;
    for (const char ch : value) {
        if (std::isdigit(static_cast<unsigned char>(ch)) == 0) {
            return false;
        }
        const std::size_t digit = static_cast<std::size_t>(ch - '0');
        if (parsed > (std::numeric_limits<std::size_t>::max() - digit) / 10) {
            return false;
        }
        parsed = parsed * 10 + digit;
    }
    *content_length = parsed;
    return true;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 2890 function
ssize_t RecvHttpBytes(int client_fd, char* buffer, std::size_t buffer_size) {
    for (;;) {
        const ssize_t read_bytes = recv(client_fd, buffer, buffer_size, 0);
        if (read_bytes < 0 && errno == EINTR) {
            continue;
        }
        return read_bytes;
    }
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 2900 function
bool IsRecvTimeout() {
    return errno == EAGAIN || errno == EWOULDBLOCK || errno == ETIMEDOUT;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 2904 function
void SetHttpSocketTimeouts(int client_fd) {
    timeval timeout{};
    timeout.tv_sec = kHttpSocketTimeoutSeconds;
    timeout.tv_usec = 0;
    (void)setsockopt(client_fd, SOL_SOCKET, SO_RCVTIMEO, &timeout, sizeof(timeout));
    (void)setsockopt(client_fd, SOL_SOCKET, SO_SNDTIMEO, &timeout, sizeof(timeout));
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 2912 function
std::optional<HttpRequest> ReadHttpRequest(int client_fd, HttpResponse* error_response) {
    auto fail = [&](int status,
                    const std::string& status_text,
                    const std::string& body) -> std::optional<HttpRequest> {
        if (error_response != nullptr) {
            *error_response = PlainTextResponse(status, status_text, body);
        }
        return std::nullopt;
    };

    std::string raw;
    char buffer[4096];
    std::size_t header_end = std::string::npos;
    while (header_end == std::string::npos) {
        const ssize_t read_bytes = RecvHttpBytes(client_fd, buffer, sizeof(buffer));
        if (read_bytes == 0) {
            return fail(400, "Bad Request", "bad request");
        }
        if (read_bytes < 0) {
            return IsRecvTimeout() ? fail(408, "Request Timeout", "request timeout")
                                   : fail(400, "Bad Request", "bad request");
        }
        raw.append(buffer, static_cast<std::size_t>(read_bytes));
        header_end = raw.find("\r\n\r\n");
        const std::size_t header_bytes = header_end == std::string::npos ? raw.size() : header_end + 4;
        if (header_bytes > kMaxHttpHeaderBytes) {
            return fail(431, "Request Header Fields Too Large", "request headers too large");
        }
    }

    HttpRequest request;
    std::istringstream header_stream(raw.substr(0, header_end));
    std::string request_line;
    if (!std::getline(header_stream, request_line)) {
        return fail(400, "Bad Request", "bad request");
    }
    if (!request_line.empty() && request_line.back() == '\r') {
        request_line.pop_back();
    }
    {
        std::istringstream request_line_stream(request_line);
        request_line_stream >> request.method >> request.target;
    }
    if (request.method.empty() || request.target.empty()) {
        return fail(400, "Bad Request", "bad request");
    }

    const std::size_t query_pos = request.target.find('?');
    request.path = query_pos == std::string::npos ? request.target : request.target.substr(0, query_pos);
    request.query = query_pos == std::string::npos ? std::string() : request.target.substr(query_pos + 1);

    std::string header_line;
    while (std::getline(header_stream, header_line)) {
        if (!header_line.empty() && header_line.back() == '\r') {
            header_line.pop_back();
        }
        const std::size_t colon = header_line.find(':');
        if (colon == std::string::npos) {
            continue;
        }
        const std::string key = Trim(header_line.substr(0, colon));
        const std::string value = Trim(header_line.substr(colon + 1));
        request.headers[key] = value;
    }

    std::size_t content_length = 0;
    const std::string transfer_encoding = Trim(HeaderValue(request, "Transfer-Encoding"));
    if (!transfer_encoding.empty() && LowerAscii(transfer_encoding) != "identity") {
        return fail(400, "Bad Request", "unsupported transfer encoding");
    }
    for (const auto& [header_key, header_value] : request.headers) {
        if (LowerAscii(header_key) != "content-length") {
            continue;
        }
        if (!ParseHttpContentLength(header_value, &content_length)) {
            return fail(400, "Bad Request", "invalid content length");
        }
        break;
    }
    if (content_length > kMaxHttpBodyBytes) {
        return fail(413, "Payload Too Large", "request body too large");
    }

    request.body = raw.substr(header_end + 4);
    if (request.body.size() > content_length) {
        request.body.resize(content_length);
    }
    while (request.body.size() < content_length) {
        const std::size_t remaining = content_length - request.body.size();
        const ssize_t read_bytes = RecvHttpBytes(client_fd, buffer, std::min(sizeof(buffer), remaining));
        if (read_bytes == 0) {
            return fail(400, "Bad Request", "truncated request body");
        }
        if (read_bytes < 0) {
            return IsRecvTimeout() ? fail(408, "Request Timeout", "request timeout")
                                   : fail(400, "Bad Request", "bad request");
        }
        request.body.append(buffer, static_cast<std::size_t>(read_bytes));
    }

    return request;
}



}  // namespace webrtc_http_server_detail

WebRtcHttpServer::WebRtcHttpServer(WebRtcMediaApplicationService& media_sessions,
                                   AnalysisSessionLifecycleApplicationService& analysis_session_lifecycle,
                                   AnalysisSessionReadApplicationService& analysis_session_reads,
                                   const WebRtcHttpRuntimeConfig& runtime_config)
    : media_sessions_(media_sessions),
      analysis_session_lifecycle_(analysis_session_lifecycle),
      analysis_session_reads_(analysis_session_reads),
      runtime_config_(runtime_config),
      impl_(std::make_unique<Impl>(
          media_sessions, analysis_session_lifecycle, analysis_session_reads)) {
    const AnalysisRuleApplicationCallbacks analysis_rule_callbacks{
        &WebRtcHttpAnalysisProfileDocumentsSnapshotBackend,
        &WebRtcHttpAnalysisRuleDocumentsSnapshotBackend,
        &WebRtcHttpVideoAnalysisRuleDocumentsSnapshotBackend,
        &ApplyWebRtcHttpVideoAnalysisRuleToQueryBackend,
    };
    std::string analysis_rule_error;
    if (!ConfigureAnalysisRuleApplicationService(analysis_rule_callbacks, &analysis_rule_error)) {
        throw std::logic_error(analysis_rule_error);
    }
    if (!webrtc_http_server_detail::AcquireWebRtcHttpRuntimeConfig(runtime_config_)) {
        throw std::logic_error("WebRtcHttpServer supports exactly one process-lifetime instance");
    }
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3123 function
WebRtcHttpServer::~WebRtcHttpServer() {
    Stop();
}

namespace webrtc_http_server_detail {

HttpResponse JsonResponse(int status, const std::string& status_text, const std::string& body) {
    HttpResponse response;
    response.status = status;
    response.status_text = status_text;
    response.content_type = "application/json; charset=utf-8";
    response.body = body;
    return response;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3138 function
HttpResponse AnalysisRegistryMutationErrorResponse(
    const AnalysisRegistryMutationResult& result,
    int default_status,
    const std::string& default_status_text) {
    if (result.failure == AnalysisRegistryMutationFailure::Persistence) {
        return JsonResponse(
            500,
            "Internal Server Error",
            "{\"error\":\"analysis registry persistence failed\","
            "\"code\":\"analysis-registry-persistence-failed\","
            "\"stage\":\"" + JsonEscape(result.persistence_stage) + "\"}");
    }
    return JsonResponse(default_status,
                        default_status_text,
                        "{\"error\":\"" + JsonEscape(result.error_message) + "\"}");
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3155 function
HttpResponse RegistryHttpResponse(const ApplicationServiceResult& result) {
    return JsonResponse(result.status, result.status_text, result.body);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3159 function
HttpResponse AuthUserHttpResponse(const auth::AuthUserResult& result) {
    return JsonResponse(result.status, result.status_text, result.body);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3163 function
HttpResponse AuthErrorResponse(const std::string& error) {
    HttpResponse response = JsonResponse(401,
                                         "Unauthorized",
                                         "{\"error\":\"" + JsonEscape(error) + "\"}");
    response.headers["WWW-Authenticate"] = "Bearer";
    return response;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3171 function
std::string PrincipalJson(const auth::Principal& principal) {
    std::ostringstream out;
    out << "{"
        << "\"username\":\"" << JsonEscape(principal.username) << "\","
        << "\"role\":\"" << JsonEscape(principal.role) << "\","
        << "\"scopes\":[";
    for (std::size_t i = 0; i < principal.scopes.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << "\"" << JsonEscape(principal.scopes[i]) << "\"";
    }
    out << "],"
        << "\"displayName\":\"" << JsonEscape(principal.display_name) << "\","
        << "\"authMode\":\"" << JsonEscape(principal.auth_mode) << "\","
        << "\"isAuthenticated\":" << (principal.is_authenticated ? "true" : "false") << ","
        << "\"passwordChangeRequired\":"
        << (principal.password_change_required ? "true" : "false")
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3193 function
std::string WhoamiJson(const auth::AuthResult& result,
                       const auth::BootstrapState& bootstrap_state,
                       const WebRtcHttpRuntimeConfig& config) {
    std::ostringstream out;
    const bool authenticated = result.ok && result.principal.is_authenticated;
    out << "{"
        << "\"setupRequired\":" << (bootstrap_state.setup_required ? "true" : "false") << ","
        << "\"setupReason\":\"" << JsonEscape(bootstrap_state.reason) << "\","
        << "\"authMode\":\"" << JsonEscape(auth::AuthModeName(config.auth_mode)) << "\","
        << "\"authenticated\":" << (authenticated ? "true" : "false") << ","
        << "\"isAuthenticated\":" << (authenticated ? "true" : "false") << ","
        << "\"passwordChangeRequired\":"
        << ((authenticated ? result.principal.password_change_required
                           : bootstrap_state.password_change_required)
                ? "true"
                : "false")
        << ",";
    if (authenticated) {
        out << "\"username\":\"" << JsonEscape(result.principal.username) << "\","
            << "\"role\":\"" << JsonEscape(result.principal.role) << "\","
            << "\"displayName\":\"" << JsonEscape(result.principal.display_name) << "\","
            << "\"scopes\":[";
        for (std::size_t i = 0; i < result.principal.scopes.size(); ++i) {
            if (i != 0) {
                out << ",";
            }
            out << "\"" << JsonEscape(result.principal.scopes[i]) << "\"";
        }
        out << "]";
    } else {
        out << "\"username\":\"\","
            << "\"role\":\"\","
            << "\"displayName\":\"\","
            << "\"scopes\":[],"
            << "\"error\":\"" << JsonEscape(result.error) << "\"";
    }
    out << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3233 function
std::string HtmlEscape(const std::string& value) {
    std::string out;
    out.reserve(value.size() + 8);
    for (const char ch : value) {
        switch (ch) {
            case '&':
                out += "&amp;";
                break;
            case '<':
                out += "&lt;";
                break;
            case '>':
                out += "&gt;";
                break;
            case '"':
                out += "&quot;";
                break;
            case '\'':
                out += "&#39;";
                break;
            default:
                out.push_back(ch);
                break;
        }
    }
    return out;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3261 function
std::string DefaultHomePath(const WebRtcHttpRuntimeConfig& config) {
    auto by_name = [&](const std::string& name) -> std::string {
        if (name == "ops" && config.enable_ops) {
            return "/ops/home";
        }
        if (name == "client" && config.enable_client) {
            return "/client/live";
        }
        if (name == "lab") {
            if (config.enable_ops) {
                return "/ops/home";
            }
            if (config.enable_client) {
                return "/client/live";
            }
            return std::string();
        }
        return std::string();
    };
    if (const std::string configured = by_name(config.ui_default_home); !configured.empty()) {
        return configured;
    }
    if (config.enable_ops) {
        return "/ops/home";
    }
    if (config.enable_client) {
        return "/client/live";
    }
    return "/login";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3292 function
std::string RoleLandingPath(const auth::Principal& principal, const WebRtcHttpRuntimeConfig& config) {
    if (principal.password_change_required) {
        return "/password/change";
    }
    if (principal.role == "viewer") {
        return config.enable_client ? "/client/live" : "/login";
    }
    if (principal.role == "admin" || principal.role == "operator") {
        return config.enable_ops ? "/ops/home" : DefaultHomePath(config);
    }
    if (principal.role == "integrator") {
        return "/auth/whoami";
    }
    return "/login";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3308 function
ProductUiPrincipalView ProductUiPrincipalViewFromAuthPrincipal(const auth::Principal& principal) {
    ProductUiPrincipalView view;
    view.display_name = principal.display_name;
    view.role = principal.role;
    view.auth_mode = principal.auth_mode;
    view.scopes = principal.scopes;
    view.is_admin = auth::IsAdmin(principal);
    view.can_access_ops_sources = auth::RequireRole(principal, {"operator"});
    return view;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3319 function
std::string JsonScriptContent(const std::string& json) {
    std::string out;
    out.reserve(json.size());
    for (const char ch : json) {
        if (ch == '<') {
            out += "\\u003c";
        } else {
            out.push_back(ch);
        }
    }
    return out;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3332 function
std::string AuthCookieHeader(const WebRtcHttpRuntimeConfig& config,
                             const std::string& session_id,
                             int max_age_seconds) {
    std::ostringstream out;
    out << config.auth_cookie_name << "=" << session_id
        << "; Path=/; HttpOnly; SameSite=Lax; Max-Age=" << max_age_seconds;
    if (config.auth_cookie_secure) {
        out << "; Secure";
    }
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3344 function
std::string ExpiredAuthCookieHeader(const WebRtcHttpRuntimeConfig& config) {
    std::ostringstream out;
    out << config.auth_cookie_name
        << "=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0";
    if (config.auth_cookie_secure) {
        out << "; Secure";
    }
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3354 function
std::string PeerAddress(int client_fd) {
    sockaddr_storage addr{};
    socklen_t len = sizeof(addr);
    if (getpeername(client_fd, reinterpret_cast<sockaddr*>(&addr), &len) != 0) {
        return "";
    }
    char host[INET6_ADDRSTRLEN] = {};
    if (addr.ss_family == AF_INET) {
        const auto* in = reinterpret_cast<const sockaddr_in*>(&addr);
        if (inet_ntop(AF_INET, &in->sin_addr, host, sizeof(host)) != nullptr) {
            return host;
        }
    } else if (addr.ss_family == AF_INET6) {
        const auto* in6 = reinterpret_cast<const sockaddr_in6*>(&addr);
        if (inet_ntop(AF_INET6, &in6->sin6_addr, host, sizeof(host)) != nullptr) {
            return host;
        }
    }
    return "";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3375 function
HttpResponse RedirectResponse(const std::string& location) {
    HttpResponse redirect;
    redirect.status = 302;
    redirect.status_text = "Found";
    redirect.content_type = "text/plain; charset=utf-8";
    redirect.headers["Cache-Control"] = "no-store";
    redirect.headers["Location"] = location;
    redirect.body = "Redirecting to " + location + "\n";
    return redirect;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3386 function
std::string StatusPageHtml(const std::string& title,
                           const std::string& message,
                           const std::string& action_href,
                           const std::string& action_label) {
    std::ostringstream out;
    out << R"(<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>)" << HtmlEscape(title) << R"(</title>
  <style>
    :root { color-scheme: light dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #111827; color: #f8fafc; }
    main { width: min(460px, calc(100vw - 32px)); display: grid; gap: 14px; }
    section { display: grid; gap: 12px; padding: 22px; border: 1px solid rgba(148,163,184,.35); border-radius: 8px; background: #0f172a; }
    h1 { margin: 0; font-size: 24px; }
    p { margin: 0; color: #cbd5e1; line-height: 1.5; }
    a { min-height: 42px; display: inline-flex; align-items: center; justify-content: center; border-radius: 6px; background: #38bdf8; color: #082f49; font-weight: 900; text-decoration: none; padding: 0 12px; }
  </style>
</head>
<body>
  <main>
    <section>
      <h1>)" << HtmlEscape(title) << R"(</h1>
      <p>)" << HtmlEscape(message) << R"(</p>
      <a href=")" << HtmlEscape(action_href) << R"(">)" << HtmlEscape(action_label) << R"(</a>
    </section>
  </main>
</body>
</html>)";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3420 function
HttpResponse HtmlPageResponse(std::string body,
                              int status,
                              const std::string& status_text) {
    HttpResponse response;
    response.status = status;
    response.status_text = status_text;
    response.content_type = "text/html; charset=utf-8";
    response.headers["Cache-Control"] = "no-store";
    response.body = std::move(body);
    return response;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3432 function
HttpResponse StatusPageResponse(int status,
                                const std::string& status_text,
                                const std::string& title,
                                const std::string& message,
                                const std::string& action_href,
                                const std::string& action_label) {
    return HtmlPageResponse(StatusPageHtml(title, message, action_href, action_label), status, status_text);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3441 function
HttpResponse UnauthorizedPageResponse() {
    return StatusPageResponse(401,
                              "Unauthorized",
                              "Login Required",
                              "계정으로 로그인한 뒤 다시 접근하세요.",
                              "/login",
                              "Go to Login");
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3450 function
HttpResponse ForbiddenPageResponse(const std::string& message) {
    return StatusPageResponse(403,
                              "Forbidden",
                              "Access Denied",
                              message,
                              "/",
                              "Go Home");
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3459 function
void AppendProductAccountMenu(std::ostringstream& out,
                             const auth::Principal& principal,
                             const std::string& secondary_action_href,
                             const std::string& secondary_action_label) {
    out << R"(        <div class="account-menu" data-sketch-account-menu="true" aria-label="현재 계정">
          <div class="account-menu-top">
            <span class="sketch-status-chip" aria-label="연결 상태"><span aria-hidden="true"></span>연결됨</span>
            <div class="account-identity">
              )" << ProductAccountAvatarSvg() << R"(
              <div class="account-copy">
                <div class="account-name">)" << HtmlEscape(principal.display_name) << R"(</div>
                <div class="account-meta">권한: )" << HtmlEscape(principal.role) << R"(</div>
              </div>
            </div>
            <div class="account-controls">
              )" << ProductThemeToggleButtonHtml() << ProductLanguageSelectHtml() << R"(
)";
    if (!secondary_action_href.empty() && !secondary_action_label.empty()) {
        out << R"(              <a class="button button-secondary account-shortcut" href=")"
            << HtmlEscape(secondary_action_href) << R"(">)"
            << HtmlEscape(secondary_action_label) << R"(</a>
)";
    }
    out << R"(            </div>
          </div>
          <form method="post" action="/logout"><button class="button-secondary" type="submit">로그아웃</button></form>
        </div>
)";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3489 function
void AppendImageNavLink(std::ostringstream& out,
                        const std::string& href,
                        const std::string& key,
                        const std::string& label,
                        bool active,
                        const std::string& extra_attributes) {
    out << "        <a class=\"image-nav" << (active ? " active" : "") << "\" href=\""
        << HtmlEscape(href) << "\"";
    if (!extra_attributes.empty()) {
        out << " " << extra_attributes;
    }
    out << ">" << ProductNavIconSvg(key) << "<span>" << HtmlEscape(label) << "</span></a>\n";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3503 function
void AppendTableHead(std::ostringstream& out, const std::vector<std::string>& headers) {
    out << R"(            <thead>
              <tr>
)";
    for (const auto& header : headers) {
        out << "                <th scope=\"col\">" << HtmlEscape(header) << "</th>\n";
    }
    out << R"(              </tr>
            </thead>
)";
}



// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3518 function
void AppendNullableInt64(std::ostringstream& out, std::optional<std::int64_t> value) {
    if (value.has_value()) {
        out << *value;
    } else {
        out << "null";
    }
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3526 function
void AppendNullableUint64(std::ostringstream& out, std::optional<std::uint64_t> value) {
    if (value.has_value()) {
        out << *value;
    } else {
        out << "null";
    }
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3534 function
bool ClientPrincipalCanAccessFeature(const auth::Principal& principal,
                                     const std::string& view_id,
                                     const std::string& scope_prefix) {
    return auth::RequireRole(principal, {"operator"}) ||
           auth::RequireScope(principal, scope_prefix + ":" + view_id);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3541 function
std::optional<WebRtcMediaApplicationSourceKind> SourceKindForClientView(
    const SourceViewApplicationService::SourceRecord& source) {
    if (source.kind == "file") {
        return WebRtcMediaApplicationSourceKind::File;
    }
    if (source.kind == "rtsp") {
        return WebRtcMediaApplicationSourceKind::Rtsp;
    }
    if (source.kind == "webrtc") {
        return WebRtcMediaApplicationSourceKind::WebRtc;
    }
    if (source.kind == "whep") {
        return WebRtcMediaApplicationSourceKind::Whep;
    }
    if (source.kind == "hls") {
        return WebRtcMediaApplicationSourceKind::Hls;
    }
    if (source.kind == "youtube") {
        if (!GetWebRtcHttpRuntimeConfig().youtube_source_build_enabled) {
            return std::nullopt;
        }
        return WebRtcMediaApplicationSourceKind::Youtube;
    }
    if (source.kind == "http") {
        return WebRtcMediaApplicationSourceKind::Http;
    }
    return std::nullopt;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3570 function
std::string SourceLocatorForClientView(const SourceViewApplicationService::SourceRecord& source) {
    if (!source.file.empty()) {
        return source.file;
    }
    if (!source.rtsp_url.empty()) {
        return source.rtsp_url;
    }
    if (!source.webrtc_source_id.empty()) {
        return source.webrtc_source_id;
    }
    if (!source.whep_url.empty()) {
        return source.whep_url;
    }
    if (!source.http_url.empty()) {
        return source.http_url;
    }
    return std::string();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3589 function
void AddUniqueString(std::vector<std::string>* values, const std::string& value) {
    if (values == nullptr || value.empty()) {
        return;
    }
    if (std::find(values->begin(), values->end(), value) == values->end()) {
        values->push_back(value);
    }
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3598 function
std::vector<std::string> ClientStreamKeyCandidates(const SourceViewApplicationService::SourceRecord& source) {
    std::vector<std::string> candidates;
    AddUniqueString(&candidates, source.canonical_source_key);
    const auto kind = SourceKindForClientView(source);
    const std::string locator = SourceLocatorForClientView(source);
    if (kind.has_value() && !locator.empty()) {
        const auto& runtime_config = GetWebRtcHttpRuntimeConfig();
        if (runtime_config.build_stream_key) {
            AddUniqueString(&candidates,
                            runtime_config.build_stream_key(static_cast<int>(*kind), locator));
        }
        if (*kind == WebRtcMediaApplicationSourceKind::File) {
            const std::filesystem::path raw_file(locator);
            const std::filesystem::path rooted =
                raw_file.is_absolute() ? raw_file : std::filesystem::path(GetWebRtcHttpRuntimeConfig().file_root_path) / raw_file;
            std::error_code ec;
            const auto resolved = std::filesystem::weakly_canonical(rooted, ec);
            if (!ec && !resolved.empty()) {
                if (runtime_config.build_stream_key) {
                    AddUniqueString(&candidates,
                                    runtime_config.build_stream_key(
                                        static_cast<int>(*kind), resolved.string()));
                }
            }
        }
    }
    return candidates;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3620 function
bool ClientTapMatchesSource(const AnalysisSessionApplicationSnapshot& tap,
                            const std::vector<std::string>& stream_key_candidates) {
    return std::find(stream_key_candidates.begin(), stream_key_candidates.end(), tap.stream_key) !=
           stream_key_candidates.end();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3626 function
bool ClientTapMatchesViewRule(const SourceViewApplicationService::PublishedViewRecord& view,
                              const AnalysisSessionApplicationSnapshot& tap) {
    if (tap.selected_by_rule_id.empty() || view.allowed_rule_ids.empty()) {
        return true;
    }
    return std::find(view.allowed_rule_ids.begin(),
                     view.allowed_rule_ids.end(),
                     tap.selected_by_rule_id) != view.allowed_rule_ids.end();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3636 function
const AnalysisSessionApplicationSnapshot* SelectClientDashboardTap(
    const SourceViewApplicationService::ClientViewAccess& access,
    const std::vector<AnalysisSessionApplicationSnapshot>& taps,
    const std::vector<std::string>& stream_key_candidates) {
    const AnalysisSessionApplicationSnapshot* fallback = nullptr;
    for (const auto& tap : taps) {
        if (!ClientTapMatchesSource(tap, stream_key_candidates)) {
            continue;
        }
        if (fallback == nullptr) {
            fallback = &tap;
        }
        if (!access.view.default_rule_id.empty() &&
            tap.selected_by_rule_id == access.view.default_rule_id) {
            return &tap;
        }
        if (ClientTapMatchesViewRule(access.view, tap)) {
            return &tap;
        }
    }
    return fallback;
}





// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3703 function
std::string ClientSafeDigestValue(const std::string& value, const std::string& fallback) {
    const std::string trimmed = Trim(value);
    if (trimmed.empty() || !IsIncidentMemoryValueReleaseSafe(trimmed)) {
        return fallback;
    }
    return trimmed;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3711 function
bool ClientEventStatusIsActive(const std::string& status) {
    if (status.empty()) {
        return false;
    }
    std::string normalized = status;
    std::transform(normalized.begin(), normalized.end(), normalized.begin(), [](unsigned char ch) {
        return static_cast<char>(std::tolower(ch));
    });
    return normalized != "ended" && normalized != "resolved" && normalized != "closed" &&
           normalized != "completed" && normalized != "inactive";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3723 function
std::string ClientSourceStatusDigestSeverity(const std::string& source_status) {
    if (source_status == "live") {
        return "normal";
    }
    if (source_status == "connecting") {
        return "info";
    }
    return "attention";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3733 function
std::string ClientSourceStatusDigestSummaryText(const std::string& source_status,
                                                const std::string& connection_status) {
    std::string summary;
    if (source_status == "live") {
        summary = "source live / " + connection_status;
    } else if (source_status == "stale") {
        summary = "source signal stale / " + connection_status;
    } else if (source_status == "connecting") {
        summary = "source connecting / " + connection_status;
    } else {
        summary = "source offline / " + connection_status;
    }
    if (!IsIncidentMemoryValueReleaseSafe(summary)) {
        return "viewer-safe source status summary";
    }
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3751 function
std::string ClientSourceStatusDigestTimelineHint(const std::string& source_status) {
    if (source_status == "live") {
        return "signal fresh";
    }
    if (source_status == "stale") {
        return "signal delay";
    }
    if (source_status == "connecting") {
        return "waiting for signal";
    }
    return "source unavailable";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3764 function
ClientSourceStatusDigest ClientSourceStatusDigestFor(
    const SourceViewApplicationService::ClientViewAccess& access,
    const auth::Principal& principal,
    const std::vector<AnalysisSessionApplicationSnapshot>& taps) {
    const auto stream_key_candidates = ClientStreamKeyCandidates(access.source);
    const auto* tap = SelectClientDashboardTap(access, taps, stream_key_candidates);
    const bool has_tap = tap != nullptr;
    const bool has_frame = has_tap && tap->has_latest_frame;
    const bool metadata_allowed =
        access.view.show_metadata_summary &&
        ClientPrincipalCanAccessFeature(principal, access.view.view_id, "metadata:read");
    const bool has_metadata = has_tap && tap->latest_result.has_value();
    const std::optional<std::int64_t> last_frame_age =
        has_frame ? std::optional<std::int64_t>(tap->latest_frame_age_ms) : std::nullopt;
    const std::optional<std::int64_t> metadata_age =
        has_metadata && metadata_allowed ? std::optional<std::int64_t>(tap->latest_result_age_ms)
                                         : std::nullopt;
    const bool frame_stale = last_frame_age.has_value() && *last_frame_age > kClientDashboardStaleMs;
    const bool metadata_stale = metadata_age.has_value() && *metadata_age > kClientDashboardStaleMs;
    const bool frame_fresh = last_frame_age.has_value() && *last_frame_age <= kClientDashboardStaleMs;
    const bool metadata_fresh = metadata_age.has_value() && *metadata_age <= kClientDashboardStaleMs;

    ClientSourceStatusDigest digest;
    digest.last_frame_age_ms = last_frame_age;
    digest.metadata_age_ms = metadata_age;
    if (has_tap) {
        if (frame_fresh || metadata_fresh) {
            digest.source_status = "live";
        } else if (last_frame_age.has_value() || metadata_age.has_value()) {
            digest.source_status = "stale";
        } else {
            digest.source_status = "connecting";
        }
    }
    digest.connection_status =
        !has_tap ? "disconnected" : (digest.source_status == "connecting" ? "connecting" : "connected");
    digest.video_frame_status =
        !has_tap ? "unavailable" : (!has_frame ? "connecting" : (frame_stale ? "stale" : "receiving"));
    digest.metadata_status =
        !metadata_allowed
            ? "unavailable"
            : (!has_tap ? "unavailable"
                        : (!has_metadata ? "connecting" : (metadata_stale ? "stale" : "fresh")));
    digest.severity = ClientSourceStatusDigestSeverity(digest.source_status);
    digest.summary_text =
        ClientSourceStatusDigestSummaryText(digest.source_status, digest.connection_status);
    digest.timeline_hint = ClientSourceStatusDigestTimelineHint(digest.source_status);
    return digest;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3814 function
void AppendClientSafeSourceStatusDigestJson(std::ostringstream& out,
                                            const ClientSourceStatusDigest& digest) {
    out << "{"
        << "\"schema\":\"media-server.client.source-status-digest.v1\","
        << "\"provided\":" << (digest.provided ? "true" : "false") << ","
        << "\"viewerSafe\":true,"
        << "\"publishedViewScoped\":true,"
        << "\"sourceUrlIncluded\":false,"
        << "\"rawLocatorIncluded\":false,"
        << "\"rawJsonIncluded\":false,"
        << "\"debugMaterialIncluded\":false,"
        << "\"credentialMaterialIncluded\":false,"
        << "\"operatorMaterialIncluded\":false,"
        << "\"ruleEditorIncluded\":false,"
        << "\"actionControlsIncluded\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"eventSchemaChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false,"
        << "\"searchMetricsChanged\":false,"
        << "\"itemCount\":1,"
        << "\"digestItems\":[{"
        << "\"digestId\":\"client-source-status-1\","
        << "\"sourceStatus\":\"" << JsonEscape(digest.source_status) << "\","
        << "\"connectionStatus\":\"" << JsonEscape(digest.connection_status) << "\","
        << "\"videoFrameStatus\":\"" << JsonEscape(digest.video_frame_status) << "\","
        << "\"metadataStatus\":\"" << JsonEscape(digest.metadata_status) << "\","
        << "\"summaryText\":\"" << JsonEscape(digest.summary_text) << "\","
        << "\"severity\":\"" << JsonEscape(digest.severity) << "\","
        << "\"timelineHint\":\"" << JsonEscape(digest.timeline_hint) << "\","
        << "\"lastFrameAgeMs\":";
    AppendNullableInt64(out, digest.last_frame_age_ms);
    out << ",\"metadataAgeMs\":";
    AppendNullableInt64(out, digest.metadata_age_ms);
    out << "}]}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3857 function
std::string ClientSourceStatusDigestJson(
    const SourceViewApplicationService::ClientViewAccess& access,
    const auth::Principal& principal,
    const std::vector<AnalysisSessionApplicationSnapshot>& taps) {
    std::ostringstream out;
    AppendClientSafeSourceStatusDigestJson(out, ClientSourceStatusDigestFor(access, principal, taps));
    return out.str();
}


// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3874 function
std::string ClientMaintenanceDigestStateFor(const ClientSourceStatusDigest& source_status) {
    if (source_status.source_status == "live") {
        return "maintenance";
    }
    if (source_status.source_status == "connecting" || source_status.source_status == "stale") {
        return "recovering";
    }
    return "unavailable";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3884 function
std::string ClientMaintenanceDigestSummaryTextFor(const std::string& maintenance_state) {
    if (maintenance_state == "maintenance") {
        return "maintenance summary available";
    }
    if (maintenance_state == "recovering") {
        return "recovering signal summary";
    }
    return "service unavailable summary";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3894 function
std::string ClientMaintenanceDigestTimelineHintFor(const std::string& maintenance_state) {
    if (maintenance_state == "maintenance") {
        return "maintenance watch";
    }
    if (maintenance_state == "recovering") {
        return "recovering";
    }
    return "unavailable";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3904 function
ClientMaintenanceDigest ClientMaintenanceDigestFor(const ClientSourceStatusDigest& source_status) {
    ClientMaintenanceDigest digest;
    digest.maintenance_state = ClientMaintenanceDigestStateFor(source_status);
    digest.summary_text = ClientMaintenanceDigestSummaryTextFor(digest.maintenance_state);
    digest.severity = digest.maintenance_state == "maintenance" ? "info" : "attention";
    digest.timeline_hint = ClientMaintenanceDigestTimelineHintFor(digest.maintenance_state);
    return digest;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3913 function
void AppendClientSafeMaintenanceDigestJson(std::ostringstream& out,
                                           const ClientMaintenanceDigest& digest) {
    out << "{"
        << "\"schema\":\"media-server.client.v340-maintenance-digest.v1\","
        << "\"provided\":" << (digest.provided ? "true" : "false") << ","
        << "\"viewerSafe\":true,"
        << "\"publishedViewScoped\":true,"
        << "\"sourceUrlIncluded\":false,"
        << "\"rawLocatorIncluded\":false,"
        << "\"rawJsonIncluded\":false,"
        << "\"debugMaterialIncluded\":false,"
        << "\"credentialMaterialIncluded\":false,"
        << "\"operatorMaterialIncluded\":false,"
        << "\"opsAuditLinkageIncluded\":false,"
        << "\"dryRunResultIncluded\":false,"
        << "\"approvalChecklistIncluded\":false,"
        << "\"recoveryActionIncluded\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"eventSchemaChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false,"
        << "\"searchMetricsChanged\":false,"
        << "\"itemCount\":1,"
        << "\"digestItems\":[{"
        << "\"digestId\":\"client-maintenance-1\","
        << "\"maintenanceState\":\"" << JsonEscape(digest.maintenance_state) << "\","
        << "\"summaryText\":\"" << JsonEscape(digest.summary_text) << "\","
        << "\"severity\":\"" << JsonEscape(digest.severity) << "\","
        << "\"timelineHint\":\"" << JsonEscape(digest.timeline_hint) << "\""
        << "}]}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3951 function
std::string ClientMaintenanceDigestJson(const ClientSourceStatusDigest& source_status) {
    std::ostringstream out;
    AppendClientSafeMaintenanceDigestJson(out, ClientMaintenanceDigestFor(source_status));
    return out.str();
}


// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3970 function
ClientImpactForecast ClientImpactForecastFor(
    const SourceViewApplicationService::ClientViewAccess& access,
    const ClientSourceStatusDigest& source_status,
    const ClientMaintenanceDigest& maintenance_digest,
    const ClientEventSummary& event_summary) {
    ClientImpactForecast forecast;
    forecast.source_impact =
        source_status.source_status == "live" ? "source available" : "source may affect live view";
    forecast.view_impact =
        access.view.enabled ? "published view available" : "published view unavailable";
    forecast.command_plan_impact =
        "command plan impact is summarized without command plan details";
    forecast.live_impact =
        source_status.source_status == "live" ? "client live remains available"
                                              : "client live may show degraded signal";
    forecast.dashboard_impact =
        maintenance_digest.maintenance_state == "maintenance"
            ? "dashboard shows available maintenance summary"
            : "dashboard shows degraded or recovering summary";
    forecast.event_digest_impact =
        event_summary.provided ? "event digest remains viewer-safe"
                               : "event digest unavailable for this view";
    if (source_status.source_status == "live" && access.view.enabled) {
        forecast.summary_text =
            "viewer-safe forecast: live, dashboard, and event digest remain available.";
        forecast.severity = "normal";
        forecast.timeline_hint = "available";
    } else if (source_status.source_status == "connecting" ||
               source_status.source_status == "stale") {
        forecast.summary_text =
            "viewer-safe forecast: client surfaces may show degraded or recovering status.";
        forecast.severity = "attention";
        forecast.timeline_hint = "degraded";
    } else {
        forecast.summary_text =
            "viewer-safe forecast: client surfaces may show unavailable status.";
        forecast.severity = "attention";
        forecast.timeline_hint = "unavailable";
    }
    return forecast;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4012 function
void AppendClientImpactForecastJson(std::ostringstream& out,
                                    const ClientImpactForecast& forecast) {
    out << "{"
        << "\"schema\":\"media-server.client.v350-impact-forecast.v1\","
        << "\"provided\":" << (forecast.provided ? "true" : "false") << ","
        << "\"viewerSafe\":true,"
        << "\"publishedViewScoped\":true,"
        << "\"sourceUrlIncluded\":false,"
        << "\"rawLocatorIncluded\":false,"
        << "\"rawJsonIncluded\":false,"
        << "\"debugMaterialIncluded\":false,"
        << "\"credentialMaterialIncluded\":false,"
        << "\"operatorMaterialIncluded\":false,"
        << "\"commandPlanDetailsIncluded\":false,"
        << "\"actionControlsIncluded\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"eventSchemaChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false,"
        << "\"searchMetricsChanged\":false,"
        << "\"itemCount\":1,"
        << "\"digestItems\":[{"
        << "\"digestId\":\"client-impact-forecast-1\","
        << "\"sourceImpact\":\"" << JsonEscape(forecast.source_impact) << "\","
        << "\"viewImpact\":\"" << JsonEscape(forecast.view_impact) << "\","
        << "\"commandPlanImpact\":\"" << JsonEscape(forecast.command_plan_impact) << "\","
        << "\"liveImpact\":\"" << JsonEscape(forecast.live_impact) << "\","
        << "\"dashboardImpact\":\"" << JsonEscape(forecast.dashboard_impact) << "\","
        << "\"eventDigestImpact\":\"" << JsonEscape(forecast.event_digest_impact) << "\","
        << "\"summaryText\":\"" << JsonEscape(forecast.summary_text) << "\","
        << "\"severity\":\"" << JsonEscape(forecast.severity) << "\","
        << "\"timelineHint\":\"" << JsonEscape(forecast.timeline_hint) << "\""
        << "}]}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4053 function
std::string ClientImpactForecastJson(
    const SourceViewApplicationService::ClientViewAccess& access,
    const ClientSourceStatusDigest& source_status,
    const ClientMaintenanceDigest& maintenance_digest,
    const ClientEventSummary& event_summary) {
    std::ostringstream out;
    AppendClientImpactForecastJson(
        out,
        ClientImpactForecastFor(access, source_status, maintenance_digest, event_summary));
    return out.str();
}


// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4071 function
std::string ClientOperationsNoticeStatusFor(
    const SourceViewApplicationService::ClientViewAccess& access,
    const ClientSourceStatusDigest& source_status,
    const ClientEventSummary& event_summary) {
    if (!access.view.enabled) {
        return "degraded";
    }
    if (source_status.source_status == "connecting" || source_status.source_status == "stale") {
        return "recovering";
    }
    if (source_status.source_status != "live") {
        return "degraded";
    }
    if (event_summary.warning) {
        return "maintenance";
    }
    return "available";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4090 function
std::string ClientOperationsNoticeTimelineHintFor(const std::string& operations_status) {
    if (operations_status == "maintenance") {
        return "maintenance window";
    }
    if (operations_status == "recovering") {
        return "recovering signal";
    }
    if (operations_status == "available") {
        return "available";
    }
    return "degraded";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4103 function
ClientOperationsNotice ClientOperationsNoticeFor(
    const SourceViewApplicationService::ClientViewAccess& access,
    const ClientSourceStatusDigest& source_status,
    const ClientMaintenanceDigest&,
    const ClientEventSummary& event_summary) {
    ClientOperationsNotice notice;
    notice.operations_status =
        ClientOperationsNoticeStatusFor(access, source_status, event_summary);
    notice.timeline_hint = ClientOperationsNoticeTimelineHintFor(notice.operations_status);
    return notice;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4115 function
void AppendClientOperationsNoticeJson(std::ostringstream& out,
                                      const ClientOperationsNotice& notice) {
    out << "{"
        << "\"schema\":\"media-server.client.v350-operations-notice.v1\","
        << "\"provided\":" << (notice.provided ? "true" : "false") << ","
        << "\"viewerSafe\":true,"
        << "\"publishedViewScoped\":true,"
        << "\"sourceUrlIncluded\":false,"
        << "\"rawLocatorIncluded\":false,"
        << "\"rawJsonIncluded\":false,"
        << "\"debugMaterialIncluded\":false,"
        << "\"credentialMaterialIncluded\":false,"
        << "\"operatorMaterialIncluded\":false,"
        << "\"commandPlanDetailsIncluded\":false,"
        << "\"incidentDetailsIncluded\":false,"
        << "\"actionControlsIncluded\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"eventSchemaChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false,"
        << "\"searchMetricsChanged\":false,"
        << "\"itemCount\":1,"
        << "\"noticeItems\":[{"
        << "\"noticeId\":\"client-operations-notice-1\","
        << "\"operationsStatus\":\"" << JsonEscape(notice.operations_status) << "\","
        << "\"timelineHint\":\"" << JsonEscape(notice.timeline_hint) << "\""
        << "}]}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4150 function
std::string ClientOperationsNoticeJson(
    const SourceViewApplicationService::ClientViewAccess& access,
    const ClientSourceStatusDigest& source_status,
    const ClientMaintenanceDigest& maintenance_digest,
    const ClientEventSummary& event_summary) {
    std::ostringstream out;
    AppendClientOperationsNoticeJson(
        out,
        ClientOperationsNoticeFor(access, source_status, maintenance_digest, event_summary));
    return out.str();
}


// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4170 function
std::string ClientActionNoticePreviewStatusFor(
    const SourceViewApplicationService::ClientViewAccess& access,
    const ClientSourceStatusDigest& source_status,
    const ClientEventSummary& event_summary) {
    if (!access.view.enabled) {
        return "degraded";
    }
    if (source_status.source_status == "connecting" || source_status.source_status == "stale") {
        return "recovering";
    }
    if (source_status.source_status != "live") {
        return "degraded";
    }
    if (event_summary.warning) {
        return "maintenance";
    }
    return "available";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4189 function
std::string ClientActionNoticePreviewTitleFor(const std::string& notice_status) {
    if (notice_status == "maintenance") {
        return "Maintenance notice";
    }
    if (notice_status == "recovering") {
        return "Recovering notice";
    }
    if (notice_status == "available") {
        return "Available notice";
    }
    return "Degraded notice";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4202 function
std::string ClientActionNoticePreviewBodyFor(const std::string& notice_status) {
    if (notice_status == "maintenance") {
        return "A maintenance window may affect this view.";
    }
    if (notice_status == "recovering") {
        return "Service is recovering and should stabilize shortly.";
    }
    if (notice_status == "available") {
        return "Service is available for this view.";
    }
    return "Some live views may be degraded while operators review service status.";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4215 function
std::string ClientActionNoticePreviewTimelineHintFor(const std::string& notice_status) {
    if (notice_status == "maintenance") {
        return "maintenance";
    }
    if (notice_status == "recovering") {
        return "recovering";
    }
    if (notice_status == "available") {
        return "available";
    }
    return "degraded";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4228 function
ClientActionNoticePreview ClientActionNoticePreviewFor(
    const SourceViewApplicationService::ClientViewAccess& access,
    const ClientSourceStatusDigest& source_status,
    const ClientMaintenanceDigest&,
    const ClientEventSummary& event_summary) {
    ClientActionNoticePreview preview;
    preview.notice_status =
        ClientActionNoticePreviewStatusFor(access, source_status, event_summary);
    preview.viewer_safe_title = ClientActionNoticePreviewTitleFor(preview.notice_status);
    preview.viewer_safe_body = ClientActionNoticePreviewBodyFor(preview.notice_status);
    preview.timeline_hint = ClientActionNoticePreviewTimelineHintFor(preview.notice_status);
    return preview;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4242 function
void AppendClientActionNoticePreviewJson(std::ostringstream& out,
                                         const ClientActionNoticePreview& preview) {
    out << "{"
        << "\"schema\":\"media-server.client.v380-action-notice-preview.v1\","
        << "\"provided\":" << (preview.provided ? "true" : "false") << ","
        << "\"viewerSafeActionNoticePreview\":true,"
        << "\"viewerSafe\":true,"
        << "\"previewOnly\":true,"
        << "\"statusTimelineOnly\":true,"
        << "\"publishedViewScoped\":true,"
        << "\"noticeStatusCatalog\":[\"maintenance\",\"degraded\",\"recovering\",\"available\"],"
        << "\"operatorOnlyBlockerDetailIncluded\":false,"
        << "\"approvalDecisionDetailIncluded\":false,"
        << "\"readinessBlockerDetailIncluded\":false,"
        << "\"sourceUrlIncluded\":false,"
        << "\"rawLocatorIncluded\":false,"
        << "\"rawJsonIncluded\":false,"
        << "\"debugMaterialIncluded\":false,"
        << "\"credentialMaterialIncluded\":false,"
        << "\"operatorMaterialIncluded\":false,"
        << "\"actionControlsIncluded\":false,"
        << "\"actionExecutionPerformed\":false,"
        << "\"clientNoticeSent\":false,"
        << "\"noticeDraftPersisted\":false,"
        << "\"noticeQueueWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"eventSchemaChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false,"
        << "\"itemCount\":1,"
        << "\"noticeItems\":[{"
        << "\"noticeId\":\"client-action-notice-preview-1\","
        << "\"noticeStatus\":\"" << JsonEscape(preview.notice_status) << "\","
        << "\"viewerSafeTitle\":\"" << JsonEscape(preview.viewer_safe_title) << "\","
        << "\"viewerSafeBody\":\"" << JsonEscape(preview.viewer_safe_body) << "\","
        << "\"timelineHint\":\"" << JsonEscape(preview.timeline_hint) << "\""
        << "}]}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4285 function
std::string ClientActionNoticePreviewJson(
    const SourceViewApplicationService::ClientViewAccess& access,
    const ClientSourceStatusDigest& source_status,
    const ClientMaintenanceDigest& maintenance_digest,
    const ClientEventSummary& event_summary) {
    std::ostringstream out;
    AppendClientActionNoticePreviewJson(
        out,
        ClientActionNoticePreviewFor(access, source_status, maintenance_digest, event_summary));
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4297 function
ClientEventItem ParseClientEventItem(const std::string& raw) {
    ClientEventItem item;
    item.event_id = ParseStringField(raw, "eventId").value_or("");
    item.event_type = ParseStringField(raw, "eventType").value_or("");
    item.status = ParseStringField(raw, "status").value_or("");
    item.class_name = ParseStringField(raw, "className").value_or("");
    item.zone_id = ParseStringField(raw, "zoneId").value_or("");
    item.line_id = ParseStringField(raw, "lineId").value_or("");
    item.scenario_name = ParseStringField(raw, "scenarioName").value_or("");
    item.scenario_phase = ParseStringField(raw, "scenarioPhase").value_or("");
    if (const auto track_id = ParseInt64Field(raw, "trackId"); track_id.has_value() && *track_id >= 0) {
        item.track_id = static_cast<std::uint64_t>(*track_id);
    }
    item.start_time_ms = ParseInt64Field(raw, "startTime");
    item.update_time_ms = ParseInt64Field(raw, "updateTime");
    item.end_time_ms = ParseInt64Field(raw, "endTime");
    return item;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4316 function
std::int64_t ClientEventSortTime(const ClientEventItem& item) {
    return item.update_time_ms.value_or(item.start_time_ms.value_or(0));
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4320 function
void AddClientEventTypeCount(std::vector<ClientEventTypeCount>* counts, const std::string& event_type) {
    if (counts == nullptr || event_type.empty()) {
        return;
    }
    for (auto& count : *counts) {
        if (count.event_type == event_type) {
            ++count.count;
            return;
        }
    }
    counts->push_back(ClientEventTypeCount{.event_type = event_type, .count = 1});
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4333 function
ClientEventSummary LoadClientEventSummary(std::vector<std::string> stream_key_candidates,
                                          int limit) {
    ClientEventSummary summary;
    limit = std::max(1, std::min(50, limit));
    EventStorageApplicationQueryResult selected_result;
    bool selected = false;
    for (const auto& stream_key : stream_key_candidates) {
        if (stream_key.empty()) {
            continue;
        }
        EventStorageApplicationQueryOptions options;
        options.stream_id = stream_key;
        options.limit = static_cast<std::size_t>(std::max(200, limit));
        EventStorageApplicationQueryResult result;
        std::string error_message;
        if (!QueryEventRecordsForApplication(options, &result, &error_message)) {
            summary.error = error_message.empty() ? "failed to query event records" : error_message;
            return summary;
        }
        if (!selected || !result.records_json.empty()) {
            selected_result = std::move(result);
            selected = true;
        }
        if (!selected_result.records_json.empty()) {
            break;
        }
    }
    if (!selected) {
        summary.error = "source stream is unavailable";
        return summary;
    }

    summary.provided = selected_result.storage.enabled && selected_result.file_exists;
    summary.storage_enabled = selected_result.storage.enabled;
    summary.has_more = selected_result.has_more;
    if (!summary.provided) {
        return summary;
    }

    std::vector<ClientEventItem> parsed;
    parsed.reserve(selected_result.records_json.size());
    for (const auto& raw : selected_result.records_json) {
        ClientEventItem item = ParseClientEventItem(raw);
        if (item.event_id.empty() && item.event_type.empty()) {
            continue;
        }
        AddClientEventTypeCount(&summary.counts_by_type, item.event_type);
        if (ClientEventStatusIsActive(item.status)) {
            summary.warning = true;
        }
        const std::int64_t item_time = ClientEventSortTime(item);
        if (item_time > 0 &&
            (!summary.latest_event_time_ms.has_value() || item_time > *summary.latest_event_time_ms)) {
            summary.latest_event_time_ms = item_time;
        }
        parsed.push_back(std::move(item));
    }
    std::stable_sort(parsed.begin(), parsed.end(), [](const auto& lhs, const auto& rhs) {
        return ClientEventSortTime(lhs) > ClientEventSortTime(rhs);
    });
    if (parsed.size() > static_cast<std::size_t>(limit)) {
        parsed.resize(static_cast<std::size_t>(limit));
    }
    summary.recent = std::move(parsed);
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4400 function
void AppendClientEventItemJson(std::ostringstream& out, const ClientEventItem& item) {
    out << "{"
        << "\"eventId\":\"" << JsonEscape(item.event_id) << "\","
        << "\"eventType\":\"" << JsonEscape(item.event_type) << "\","
        << "\"status\":\"" << JsonEscape(item.status) << "\","
        << "\"className\":\"" << JsonEscape(item.class_name) << "\","
        << "\"trackId\":";
    AppendNullableUint64(out, item.track_id);
    out << ",\"startTime\":";
    AppendNullableInt64(out, item.start_time_ms);
    out << ",\"updateTime\":";
    AppendNullableInt64(out, item.update_time_ms);
    out << ",\"endTime\":";
    AppendNullableInt64(out, item.end_time_ms);
    out << ",\"zoneId\":\"" << JsonEscape(item.zone_id) << "\","
        << "\"lineId\":\"" << JsonEscape(item.line_id) << "\","
        << "\"scenarioName\":\"" << JsonEscape(item.scenario_name) << "\","
        << "\"scenarioPhase\":\"" << JsonEscape(item.scenario_phase) << "\""
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4421 function
std::string ClientSafeIncidentDigestSeverity(const ClientEventItem& item) {
    return ClientEventStatusIsActive(item.status) ? "attention" : "normal";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4425 function
std::string ClientSafeIncidentDigestSummaryText(const ClientEventItem& item) {
    std::string label = ClientSafeDigestValue(item.scenario_name, "");
    if (label.empty()) {
        label = ClientSafeDigestValue(item.class_name, "");
    }
    if (label.empty()) {
        label = ClientSafeDigestValue(item.event_type, "event");
    }
    const std::string status = ClientSafeDigestValue(item.status, "recorded");
    std::string summary = label + " / " + status;
    if (!IsIncidentMemoryValueReleaseSafe(summary)) {
        summary = "viewer-safe event summary";
    }
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4441 function
void AppendClientSafeIncidentDigestJson(std::ostringstream& out,
                                        const ClientEventSummary& summary) {
    out << "{"
        << "\"schema\":\"media-server.client.incident-digest.v1\","
        << "\"provided\":" << (summary.provided ? "true" : "false") << ","
        << "\"viewerSafe\":true,"
        << "\"sourceLocatorIncluded\":false,"
        << "\"rawEvidenceIncluded\":false,"
        << "\"debugMaterialIncluded\":false,"
        << "\"providerMaterialIncluded\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"itemCount\":" << summary.recent.size() << ","
        << "\"digestItems\":[";
    const std::size_t limit = std::min<std::size_t>(summary.recent.size(), 5);
    for (std::size_t i = 0; i < limit; ++i) {
        const auto& item = summary.recent[i];
        if (i != 0) {
            out << ",";
        }
        out << "{"
            << "\"digestId\":\"client-incident-" << (i + 1) << "\","
            << "\"eventType\":\"" << JsonEscape(ClientSafeDigestValue(item.event_type, "event")) << "\","
            << "\"status\":\"" << JsonEscape(ClientSafeDigestValue(item.status, "recorded")) << "\","
            << "\"severity\":\"" << JsonEscape(ClientSafeIncidentDigestSeverity(item)) << "\","
            << "\"summaryText\":\"" << JsonEscape(ClientSafeIncidentDigestSummaryText(item)) << "\","
            << "\"time\":";
        AppendNullableInt64(out, item.update_time_ms.has_value() ? item.update_time_ms
                                                                 : item.start_time_ms);
        out << "}";
    }
    out << "]}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4474 function
std::string ClientSafeEventDigestTimelineHint(const ClientEventItem& item) {
    const std::string status = ClientSafeDigestValue(item.status, "recorded");
    if (ClientEventStatusIsActive(status)) {
        return "active event";
    }
    if (item.end_time_ms.has_value()) {
        return "ended event";
    }
    if (item.update_time_ms.has_value()) {
        return "updated event";
    }
    return "recorded event";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4488 function
std::string ClientSafeEventDigestSummaryText(const ClientEventItem& item) {
    std::string label = ClientSafeDigestValue(item.scenario_name, "");
    if (label.empty()) {
        label = ClientSafeDigestValue(item.class_name, "");
    }
    if (label.empty()) {
        label = ClientSafeDigestValue(item.event_type, "event");
    }
    const std::string event_type = ClientSafeDigestValue(item.event_type, "event");
    const std::string status = ClientSafeDigestValue(item.status, "recorded");
    std::string summary = label + " / " + event_type + " / " + status;
    if (!IsIncidentMemoryValueReleaseSafe(summary)) {
        summary = "viewer-safe event summary";
    }
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4505 function
void AppendClientSafeEventDigestJson(std::ostringstream& out,
                                     const ClientEventSummary& summary) {
    out << "{"
        << "\"schema\":\"media-server.client.event-digest.v1\","
        << "\"provided\":" << (summary.provided ? "true" : "false") << ","
        << "\"viewerSafe\":true,"
        << "\"publishedViewScoped\":true,"
        << "\"sourceUrlIncluded\":false,"
        << "\"rawEvidenceIncluded\":false,"
        << "\"debugMaterialIncluded\":false,"
        << "\"providerMaterialIncluded\":false,"
        << "\"featureProvenanceIncluded\":false,"
        << "\"internalEvidenceIncluded\":false,"
        << "\"encodedClipPathIncluded\":false,"
        << "\"ruleEditorIncluded\":false,"
        << "\"actionControlsIncluded\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"eventSchemaChanged\":false,"
        << "\"mediaPathChanged\":false,"
        << "\"itemCount\":" << summary.recent.size() << ","
        << "\"digestItems\":[";
    const std::size_t limit = std::min<std::size_t>(summary.recent.size(), 5);
    for (std::size_t i = 0; i < limit; ++i) {
        const auto& item = summary.recent[i];
        if (i != 0) {
            out << ",";
        }
        out << "{"
            << "\"digestId\":\"client-event-" << (i + 1) << "\","
            << "\"summaryText\":\"" << JsonEscape(ClientSafeEventDigestSummaryText(item)) << "\","
            << "\"eventType\":\"" << JsonEscape(ClientSafeDigestValue(item.event_type, "event")) << "\","
            << "\"status\":\"" << JsonEscape(ClientSafeDigestValue(item.status, "recorded")) << "\","
            << "\"severity\":\"" << JsonEscape(ClientSafeIncidentDigestSeverity(item)) << "\","
            << "\"timelineHint\":\"" << JsonEscape(ClientSafeEventDigestTimelineHint(item)) << "\","
            << "\"time\":";
        AppendNullableInt64(out, item.update_time_ms.has_value() ? item.update_time_ms
                                                                 : item.start_time_ms);
        out << "}";
    }
    out << "]}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4547 function
std::string ClientSafeFollowUpDigestStatus(const ClientEventItem& item) {
    const std::string status = ClientSafeDigestValue(item.status, "recorded");
    if (status == "ended" || status == "resolved" || status == "closed" ||
        status == "completed" || status == "inactive") {
        return "closed";
    }
    if (status == "new" || status == "open" || status == "active" ||
        status == "needs-follow-up" || status == "review-needed") {
        return "follow-up-needed";
    }
    return status;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4560 function
void AppendClientSafeFollowUpDigestJson(std::ostringstream& out,
                                        const ClientEventSummary& summary) {
    out << "{"
        << "\"schema\":\"media-server.client.follow-up-digest.v1\","
        << "\"provided\":" << (summary.provided ? "true" : "false") << ","
        << "\"viewerSafe\":true,"
        << "\"publishedViewScoped\":true,"
        << "\"sourceUrlIncluded\":false,"
        << "\"rawEvidenceIncluded\":false,"
        << "\"debugMaterialIncluded\":false,"
        << "\"providerMaterialIncluded\":false,"
        << "\"ruleEditorIncluded\":false,"
        << "\"actionControlsIncluded\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"eventSchemaChanged\":false,"
        << "\"mediaPathChanged\":false,"
        << "\"itemCount\":" << summary.recent.size() << ","
        << "\"digestItems\":[";
    const std::size_t limit = std::min<std::size_t>(summary.recent.size(), 5);
    for (std::size_t i = 0; i < limit; ++i) {
        const auto& item = summary.recent[i];
        if (i != 0) {
            out << ",";
        }
        out << "{"
            << "\"digestId\":\"client-follow-up-" << (i + 1) << "\","
            << "\"followUpStatus\":\"" << JsonEscape(ClientSafeFollowUpDigestStatus(item)) << "\","
            << "\"severity\":\"" << JsonEscape(ClientSafeIncidentDigestSeverity(item)) << "\","
            << "\"time\":";
        AppendNullableInt64(out, item.update_time_ms.has_value() ? item.update_time_ms
                                                                 : item.start_time_ms);
        out << "}";
    }
    out << "]}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4596 function
std::string ClientSafeResolutionDigestStatus(const ClientEventItem& item) {
    const std::string status = ClientSafeDigestValue(item.status, "recorded");
    if (!ClientEventStatusIsActive(status)) {
        return "closed";
    }
    if (status == "new" || status == "open" || status == "active" ||
        status == "needs-follow-up" || status == "review-needed") {
        return "open";
    }
    return "review-needed";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4608 function
std::string ClientSafeResolutionDigestLabel(const std::string& resolution_status) {
    if (resolution_status == "closed") {
        return "closed";
    }
    if (resolution_status == "open") {
        return "open";
    }
    return "review needed";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4618 function
std::string ClientSafeResolutionDigestTimelineHint(const ClientEventItem& item,
                                                   const std::string& resolution_status) {
    if (resolution_status == "closed") {
        if (item.end_time_ms.has_value()) {
            return "closed event";
        }
        return "closed summary";
    }
    if (item.update_time_ms.has_value()) {
        return "updated resolution";
    }
    return "active resolution";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4632 function
std::string ClientSafeResolutionDigestSummaryText(const ClientEventItem& item,
                                                  const std::string& resolution_status) {
    std::string label = ClientSafeDigestValue(item.scenario_name, "");
    if (label.empty()) {
        label = ClientSafeDigestValue(item.class_name, "");
    }
    if (label.empty()) {
        label = ClientSafeDigestValue(item.event_type, "event");
    }
    std::string summary = label + " / " + ClientSafeResolutionDigestLabel(resolution_status);
    if (!IsIncidentMemoryValueReleaseSafe(summary)) {
        summary = "viewer-safe resolution summary";
    }
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4648 function
void AppendClientSafeResolutionDigestJson(std::ostringstream& out,
                                          const ClientEventSummary& summary) {
    out << "{"
        << "\"schema\":\"media-server.client.resolution-digest.v1\","
        << "\"provided\":" << (summary.provided ? "true" : "false") << ","
        << "\"viewerSafe\":true,"
        << "\"publishedViewScoped\":true,"
        << "\"sourceUrlIncluded\":false,"
        << "\"rawEvidenceIncluded\":false,"
        << "\"debugMaterialIncluded\":false,"
        << "\"providerMaterialIncluded\":false,"
        << "\"featureProvenanceIncluded\":false,"
        << "\"internalEvidenceIncluded\":false,"
        << "\"operatorNotesIncluded\":false,"
        << "\"ruleEditorIncluded\":false,"
        << "\"actionControlsIncluded\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"eventSchemaChanged\":false,"
        << "\"mediaPathChanged\":false,"
        << "\"resolutionStateWritePerformed\":false,"
        << "\"itemCount\":" << summary.recent.size() << ","
        << "\"digestItems\":[";
    const std::size_t limit = std::min<std::size_t>(summary.recent.size(), 5);
    for (std::size_t i = 0; i < limit; ++i) {
        const auto& item = summary.recent[i];
        const std::string resolution_status = ClientSafeResolutionDigestStatus(item);
        if (i != 0) {
            out << ",";
        }
        out << "{"
            << "\"digestId\":\"client-resolution-" << (i + 1) << "\","
            << "\"resolutionStatus\":\"" << JsonEscape(resolution_status) << "\","
            << "\"resolutionLabel\":\""
            << JsonEscape(ClientSafeResolutionDigestLabel(resolution_status)) << "\","
            << "\"summaryText\":\""
            << JsonEscape(ClientSafeResolutionDigestSummaryText(item, resolution_status)) << "\","
            << "\"severity\":\"" << JsonEscape(ClientSafeIncidentDigestSeverity(item)) << "\","
            << "\"timelineHint\":\""
            << JsonEscape(ClientSafeResolutionDigestTimelineHint(item, resolution_status)) << "\","
            << "\"time\":";
        AppendNullableInt64(out, item.update_time_ms.has_value() ? item.update_time_ms
                                                                 : item.start_time_ms);
        out << "}";
    }
    out << "]}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4695 function
void AppendClientEventSummaryJson(std::ostringstream& out,
                                  const ClientEventSummary& summary,
                                  const std::string& source_status_digest_json,
                                  const std::string& maintenance_digest_json,
                                  const std::string& client_impact_forecast_json,
                                  const std::string& client_operations_notice_json,
                                  const std::string& client_action_notice_preview_json) {
    out << "{"
        << "\"provided\":" << (summary.provided ? "true" : "false") << ","
        << "\"storageEnabled\":" << (summary.storage_enabled ? "true" : "false") << ","
        << "\"hasMore\":" << (summary.has_more ? "true" : "false") << ","
        << "\"warning\":" << (summary.warning ? "true" : "false") << ","
        << "\"warningBadge\":\"" << (summary.provided ? (summary.warning ? "warning" : "normal")
                                                       : "unavailable")
        << "\","
        << "\"latestEventTime\":";
    AppendNullableInt64(out, summary.latest_event_time_ms);
    out << ",\"error\":\"" << JsonEscape(summary.error) << "\","
        << "\"countsByType\":[";
    for (std::size_t i = 0; i < summary.counts_by_type.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << "{\"eventType\":\"" << JsonEscape(summary.counts_by_type[i].event_type)
            << "\",\"count\":" << summary.counts_by_type[i].count << "}";
    }
    out << "],\"recent\":[";
    for (std::size_t i = 0; i < summary.recent.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendClientEventItemJson(out, summary.recent[i]);
    }
    out << "],\"eventDigest\":";
    AppendClientSafeEventDigestJson(out, summary);
    out << ",\"resolutionDigest\":";
    AppendClientSafeResolutionDigestJson(out, summary);
    out << ",\"incidentDigest\":";
    AppendClientSafeIncidentDigestJson(out, summary);
    out << ",\"followUpDigest\":";
    AppendClientSafeFollowUpDigestJson(out, summary);
    if (!source_status_digest_json.empty()) {
        out << ",\"sourceStatusDigest\":" << source_status_digest_json;
    }
    if (!maintenance_digest_json.empty()) {
        out << ",\"maintenanceDigest\":" << maintenance_digest_json;
    }
    if (!client_impact_forecast_json.empty()) {
        out << ",\"clientImpactForecast\":" << client_impact_forecast_json;
    }
    if (!client_operations_notice_json.empty()) {
        out << ",\"clientOperationsNotice\":" << client_operations_notice_json;
    }
    if (!client_action_notice_preview_json.empty()) {
        out << ",\"clientActionNoticePreview\":" << client_action_notice_preview_json;
    }
    out << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4754 function
void AppendClientViewIdentityJson(std::ostringstream& out,
                                  const SourceViewApplicationService::ClientViewAccess& access) {
    out << "{"
        << "\"viewId\":\"" << JsonEscape(access.view.view_id) << "\","
        << "\"displayName\":\"" << JsonEscape(access.view.display_name) << "\","
        << "\"sourceId\":\"" << JsonEscape(access.view.source_id) << "\","
        << "\"sourceDisplayName\":\"" << JsonEscape(access.source.display_name) << "\","
        << "\"sourceKind\":\"" << JsonEscape(access.source.kind) << "\","
        << "\"sourceTags\":[";
    for (std::size_t i = 0; i < access.source.tags.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << "\"" << JsonEscape(access.source.tags[i]) << "\"";
    }
    out << "],"
        << "\"ownerGroup\":\"" << JsonEscape(access.source.owner_group) << "\","
        << "\"showDashboard\":" << (access.view.show_dashboard ? "true" : "false") << ","
        << "\"showEvents\":" << (access.view.show_events ? "true" : "false") << ","
        << "\"showMetadataSummary\":" << (access.view.show_metadata_summary ? "true" : "false")
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4777 function
std::vector<std::string> ClientEventStreamCandidates(
    const SourceViewApplicationService::SourceRecord& source,
    const AnalysisSessionApplicationSnapshot* tap) {
    std::vector<std::string> candidates;
    if (tap != nullptr) {
        AddUniqueString(&candidates, tap->stream_key);
    }
    for (const auto& key : ClientStreamKeyCandidates(source)) {
        AddUniqueString(&candidates, key);
    }
    return candidates;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4790 function
std::string ClientViewEventsJson(
    const SourceViewApplicationService::ClientViewAccess& access,
    const auth::Principal& principal,
    const std::vector<AnalysisSessionApplicationSnapshot>& taps,
    int limit) {
    const auto summary = LoadClientEventSummary(ClientEventStreamCandidates(access.source, nullptr), limit);
    const auto source_status_digest = ClientSourceStatusDigestFor(access, principal, taps);
    std::ostringstream source_status_digest_out;
    AppendClientSafeSourceStatusDigestJson(source_status_digest_out, source_status_digest);
    const auto source_status_digest_json = source_status_digest_out.str();
    const auto maintenance_digest = ClientMaintenanceDigestFor(source_status_digest);
    const auto maintenance_digest_json = ClientMaintenanceDigestJson(source_status_digest);
    const auto client_impact_forecast_json =
        ClientImpactForecastJson(access, source_status_digest, maintenance_digest, summary);
    const auto client_operations_notice_json =
        ClientOperationsNoticeJson(access, source_status_digest, maintenance_digest, summary);
    const auto client_action_notice_preview_json =
        ClientActionNoticePreviewJson(access, source_status_digest, maintenance_digest, summary);
    std::ostringstream out;
    out << "{\"ok\":true,\"view\":";
    AppendClientViewIdentityJson(out, access);
    out << ",\"events\":";
    AppendClientEventSummaryJson(out,
                                 summary,
                                 source_status_digest_json,
                                 maintenance_digest_json,
                                 client_impact_forecast_json,
                                 client_operations_notice_json,
                                 client_action_notice_preview_json);
    out << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4823 function
std::string ClientViewMetadataJson(const SourceViewApplicationService::ClientViewAccess& access,
                                   const std::vector<AnalysisSessionApplicationSnapshot>& taps) {
    const auto stream_key_candidates = ClientStreamKeyCandidates(access.source);
    const auto* tap = SelectClientDashboardTap(access, taps, stream_key_candidates);
    const bool has_tap = tap != nullptr;
    const bool has_metadata = has_tap && tap->latest_result.has_value();
    const std::optional<std::int64_t> metadata_age =
        has_metadata ? std::optional<std::int64_t>(tap->latest_result_age_ms) : std::nullopt;
    const bool metadata_stale =
        metadata_age.has_value() && *metadata_age > kClientDashboardStaleMs;

    std::optional<std::int64_t> timestamp_ms;
    std::optional<std::int64_t> track_count;
    std::optional<std::int64_t> active_event_count;
    std::optional<std::int64_t> scenario_count;
    if (has_metadata) {
        if (tap->latest_result->metrics_report.has_value()) {
            const auto& metrics = *tap->latest_result->metrics_report;
            timestamp_ms = metrics.timestamp_ms;
            track_count = static_cast<std::int64_t>(metrics.total_track_count);
            active_event_count = static_cast<std::int64_t>(metrics.active_event_state_count);
            scenario_count = static_cast<std::int64_t>(metrics.active_scenario_count);
        } else {
            timestamp_ms = tap->latest_result->pts / 1000000LL;
            track_count = static_cast<std::int64_t>(tap->latest_result->tracks.size());
        }
    }

    std::ostringstream out;
    out << "{\"ok\":true,\"view\":";
    AppendClientViewIdentityJson(out, access);
    out << ",\"metadata\":{"
        << "\"provided\":" << (has_metadata ? "true" : "false") << ","
        << "\"status\":\""
        << (!access.view.show_metadata_summary ? "disabled"
                                               : (!has_tap ? "unavailable"
                                                           : (!has_metadata ? "unavailable"
                                                                            : (metadata_stale ? "stale" : "fresh"))))
        << "\","
        << "\"schema\":\"media-server.client.metadata-summary.v1\","
        << "\"timestampMs\":";
    AppendNullableInt64(out, timestamp_ms);
    out << ",\"ageMs\":";
    AppendNullableInt64(out, metadata_age);
    out << ",\"trackCount\":";
    AppendNullableInt64(out, track_count);
    out << ",\"activeEventCount\":";
    AppendNullableInt64(out, active_event_count);
    out << ",\"scenarioCount\":";
    AppendNullableInt64(out, scenario_count);
    out << "}}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4877 function
std::string ClientViewDashboardJson(const SourceViewApplicationService::ClientViewAccess& access,
                                    const auth::Principal& principal,
                                    const std::vector<AnalysisSessionApplicationSnapshot>& taps) {
    const auto stream_key_candidates = ClientStreamKeyCandidates(access.source);
    const auto* tap = SelectClientDashboardTap(access, taps, stream_key_candidates);
    const bool has_tap = tap != nullptr;
    const bool has_frame = has_tap && tap->has_latest_frame;
    const bool has_metadata = has_tap && tap->latest_result.has_value();
    const bool metadata_allowed =
        access.view.show_metadata_summary &&
        ClientPrincipalCanAccessFeature(principal, access.view.view_id, "metadata:read");
    const std::optional<std::int64_t> last_frame_age =
        has_frame ? std::optional<std::int64_t>(tap->latest_frame_age_ms) : std::nullopt;
    const std::optional<std::int64_t> metadata_age =
        has_metadata && metadata_allowed ? std::optional<std::int64_t>(tap->latest_result_age_ms)
                                         : std::nullopt;
    const bool frame_stale = last_frame_age.has_value() && *last_frame_age > kClientDashboardStaleMs;
    const bool metadata_stale = metadata_age.has_value() && *metadata_age > kClientDashboardStaleMs;
    const bool frame_fresh = last_frame_age.has_value() && *last_frame_age <= kClientDashboardStaleMs;
    const bool metadata_fresh = metadata_age.has_value() && *metadata_age <= kClientDashboardStaleMs;
    const bool stale = frame_stale || metadata_stale;
    std::string health_status = "offline";
    if (has_tap) {
        if (frame_fresh || metadata_fresh) {
            health_status = "live";
        } else if (last_frame_age.has_value() || metadata_age.has_value()) {
            health_status = "stale";
        } else {
            health_status = "connecting";
        }
    }
    const std::string connection_status =
        !has_tap ? "disconnected" : (health_status == "connecting" ? "connecting" : "connected");
    const std::string video_frame_status =
        !has_tap ? "unavailable" : (!has_frame ? "connecting" : (frame_stale ? "stale" : "receiving"));
    const std::string metadata_status =
        !metadata_allowed
            ? "unavailable"
            : (!has_tap ? "unavailable"
                        : (!has_metadata ? "connecting" : (metadata_stale ? "stale" : "fresh")));
    const std::string warning_level =
        (!has_tap || health_status == "stale" || stale)
            ? "warning"
            : (health_status == "connecting" ? "info" : "normal");
    std::string health_summary = "receiving";
    if (!has_tap) {
        health_summary = "offline";
    } else if (health_status == "connecting") {
        health_summary = "waiting-signal";
    } else if (frame_stale && metadata_stale) {
        health_summary = "video-and-metadata-delay";
    } else if (frame_stale) {
        health_summary = "video-delay";
    } else if (metadata_stale) {
        health_summary = "metadata-delay";
    }

    std::optional<std::int64_t> track_count;
    std::optional<std::int64_t> active_event_count;
    std::optional<std::int64_t> scenario_count;
    if (has_metadata && metadata_allowed) {
        if (tap->latest_result->metrics_report.has_value()) {
            const auto& metrics = *tap->latest_result->metrics_report;
            track_count = static_cast<std::int64_t>(metrics.total_track_count);
            active_event_count = static_cast<std::int64_t>(metrics.active_event_state_count);
            scenario_count = static_cast<std::int64_t>(metrics.active_scenario_count);
        } else {
            track_count = static_cast<std::int64_t>(tap->latest_result->tracks.size());
        }
    }

    ClientEventSummary event_summary;
    const bool include_events = access.view.show_events &&
                                ClientPrincipalCanAccessFeature(principal,
                                                                access.view.view_id,
                                                                "event:read");
    if (include_events) {
        event_summary = LoadClientEventSummary(ClientEventStreamCandidates(access.source, tap), 10);
    }
    const auto source_status_digest = ClientSourceStatusDigestFor(access, principal, taps);
    std::ostringstream source_status_digest_out;
    AppendClientSafeSourceStatusDigestJson(source_status_digest_out, source_status_digest);
    const auto source_status_digest_json = source_status_digest_out.str();
    const auto maintenance_digest = ClientMaintenanceDigestFor(source_status_digest);
    const auto maintenance_digest_json = ClientMaintenanceDigestJson(source_status_digest);
    const auto client_impact_forecast_json =
        ClientImpactForecastJson(access, source_status_digest, maintenance_digest, event_summary);
    const auto client_operations_notice_json =
        ClientOperationsNoticeJson(access, source_status_digest, maintenance_digest, event_summary);
    const auto client_action_notice_preview_json =
        ClientActionNoticePreviewJson(access, source_status_digest, maintenance_digest, event_summary);
    const std::optional<std::int64_t> latest_event_time =
        event_summary.latest_event_time_ms.has_value()
            ? event_summary.latest_event_time_ms
            : (has_metadata && metadata_allowed && tap->latest_result->metrics_report.has_value()
                   ? std::optional<std::int64_t>(tap->latest_result->metrics_report->timestamp_ms)
                   : std::nullopt);

    std::ostringstream out;
    out << "{\"ok\":true,\"view\":";
    AppendClientViewIdentityJson(out, access);
    out << ",\"health\":{"
        << "\"live\":" << (health_status == "live" ? "true" : "false") << ","
        << "\"status\":\"" << JsonEscape(health_status) << "\","
        << "\"connectionStatus\":\"" << JsonEscape(connection_status) << "\","
        << "\"videoFrameStatus\":\"" << JsonEscape(video_frame_status) << "\","
        << "\"metadataStatus\":\"" << JsonEscape(metadata_status) << "\","
        << "\"warningLevel\":\"" << JsonEscape(warning_level) << "\","
        << "\"summary\":\"" << JsonEscape(health_summary) << "\","
        << "\"stale\":" << (stale ? "true" : "false") << ","
        << "\"lastFrameAgeMs\":";
    AppendNullableInt64(out, last_frame_age);
    out << ",\"metadataAgeMs\":";
    AppendNullableInt64(out, metadata_age);
    out << "},\"analysis\":{"
        << "\"trackCount\":";
    AppendNullableInt64(out, track_count);
    out << ",\"activeEventCount\":";
    AppendNullableInt64(out, active_event_count);
    out << ",\"scenarioCount\":";
    AppendNullableInt64(out, scenario_count);
    out << ",\"latestEventTime\":";
    AppendNullableInt64(out, latest_event_time);
    out << "},\"connection\":{"
        << "\"webrtc\":\"" << JsonEscape(connection_status) << "\","
        << "\"staleMetadataAgeMs\":";
    AppendNullableInt64(out, metadata_age);
    out << ",\"lastFrameAgeMs\":";
    AppendNullableInt64(out, last_frame_age);
    out << "},\"events\":";
    AppendClientEventSummaryJson(out,
                                 event_summary,
                                 source_status_digest_json,
                                 maintenance_digest_json,
                                 client_impact_forecast_json,
                                 client_operations_notice_json,
                                 client_action_notice_preview_json);
    out << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 5018 function
std::string NormalizeClientOverlayMode(std::string mode) {
    mode = Trim(mode);
    std::transform(mode.begin(), mode.end(), mode.begin(), [](unsigned char ch) {
        return static_cast<char>(std::tolower(ch));
    });
    if (mode.empty() || mode == "raw" || mode == "none" || mode == "video" || mode == "live") {
        return "raw";
    }
    if (mode == "va-overlay" || mode == "va" || mode == "overlay" || mode == "metadata" ||
        mode == "server-overlay") {
        return "va-overlay";
    }
    if (mode == "va-rule" || mode == "rule" || mode == "varule") {
        return "va-rule";
    }
    return std::string();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 5036 function
std::vector<std::string> ClientAllowedOverlayModes(
    const SourceViewApplicationService::PublishedViewRecord& view) {
    std::vector<std::string> modes;
    for (const auto& mode : view.allowed_overlay_modes) {
        AddUniqueString(&modes, NormalizeClientOverlayMode(mode));
    }
    modes.erase(std::remove(modes.begin(), modes.end(), std::string()), modes.end());
    return modes;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 5046 function
bool ClientViewAllowsOverlayMode(const SourceViewApplicationService::PublishedViewRecord& view,
                                 const std::string& mode) {
    const auto allowed = ClientAllowedOverlayModes(view);
    return std::find(allowed.begin(), allowed.end(), mode) != allowed.end();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 5052 function
std::string ClientDefaultOverlayMode(const SourceViewApplicationService::PublishedViewRecord& view) {
    const auto allowed = ClientAllowedOverlayModes(view);
    if (allowed.empty()) {
        return std::string();
    }
    if (std::find(allowed.begin(), allowed.end(), "raw") != allowed.end()) {
        return "raw";
    }
    return allowed.front();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 5063 function
bool AddClientSourceQuery(const SourceViewApplicationService::SourceRecord& source,
                          std::unordered_map<std::string, std::string>* query,
                          std::string* error_message) {
    if (query == nullptr) {
        if (error_message != nullptr) {
            *error_message = "query output is required";
        }
        return false;
    }
    if (!source.file.empty()) {
        (*query)["file"] = source.file;
        return true;
    }
    if (!source.rtsp_url.empty()) {
        (*query)["url"] = source.rtsp_url;
        (*query)["source"] = "rtsp";
        return true;
    }
    if (!source.webrtc_source_id.empty()) {
        (*query)["url"] = source.webrtc_source_id;
        (*query)["source"] = "webrtc";
        return true;
    }
    if (!source.whep_url.empty()) {
        (*query)["url"] = source.whep_url;
        (*query)["source"] = "whep";
        return true;
    }
    if (!source.http_url.empty()) {
        (*query)["url"] = source.http_url;
        (*query)["source"] = source.kind.empty() ? "http" : source.kind;
        return true;
    }
    if (error_message != nullptr) {
        *error_message = "PublishedView source has no playable locator";
    }
    return false;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 5102 function
std::string ClientSourceQueryValue(const std::unordered_map<std::string, std::string>& query,
                                   const std::string& key) {
    const auto it = query.find(key);
    return it == query.end() ? std::string() : Trim(it->second);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 5108 function
bool AddVaRuleSourceQuery(const std::string& rule_id,
                          const std::string& source_document,
                          std::unordered_map<std::string, std::string>* query,
                          std::string* error_message) {
    if (query == nullptr) {
        if (error_message != nullptr) {
            *error_message = "query output is required";
        }
        return false;
    }
    const std::string source_kind = Trim(ParseStringField(source_document, "kind").value_or(""));
    if (source_kind.empty()) {
        if (error_message != nullptr) {
            *error_message = "vaRule source kind is empty: " + rule_id;
        }
        return false;
    }
    if (source_kind == "file") {
        const std::string file = Trim(ParseStringField(source_document, "file").value_or(""));
        if (file.empty()) {
            if (error_message != nullptr) {
                *error_message = "vaRule file source is empty: " + rule_id;
            }
            return false;
        }
        (*query)["file"] = file;
        return true;
    }

    const std::string url = Trim(ParseStringField(source_document, "url").value_or(""));
    if (url.empty()) {
        if (error_message != nullptr) {
            *error_message = "vaRule url source is empty: " + rule_id;
        }
        return false;
    }
    (*query)["url"] = url;
    (*query)["source"] = source_kind;
    return true;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 5149 function
bool ClientSourceQueriesMatch(const std::unordered_map<std::string, std::string>& view_query,
                              const std::unordered_map<std::string, std::string>& rule_query) {
    const std::string view_file = ClientSourceQueryValue(view_query, "file");
    const std::string rule_file = ClientSourceQueryValue(rule_query, "file");
    if (!view_file.empty() || !rule_file.empty()) {
        return !view_file.empty() && view_file == rule_file;
    }

    const std::string view_url = ClientSourceQueryValue(view_query, "url");
    const std::string rule_url = ClientSourceQueryValue(rule_query, "url");
    if (view_url.empty() || rule_url.empty() || view_url != rule_url) {
        return false;
    }
    return LowerAscii(ClientSourceQueryValue(view_query, "source")) ==
           LowerAscii(ClientSourceQueryValue(rule_query, "source"));
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 5166 function
bool ClientVaRuleSourceMatchesView(const SourceViewApplicationService::ClientViewAccess& access,
                                   const std::string& rule_id,
                                   std::string* error_message) {
    const auto document = AnalysisRegistry().VaRuleJson(rule_id);
    if (!document.has_value()) {
        if (error_message != nullptr) {
            *error_message = "allowed vaRule not found: " + rule_id;
        }
        return false;
    }
    const auto source = ExtractObjectField(*document, "source");
    if (!source.has_value()) {
        if (error_message != nullptr) {
            *error_message = "vaRule source is missing: " + rule_id;
        }
        return false;
    }

    std::unordered_map<std::string, std::string> view_query;
    std::unordered_map<std::string, std::string> rule_query;
    if (!AddClientSourceQuery(access.source, &view_query, error_message) ||
        !AddVaRuleSourceQuery(rule_id, *source, &rule_query, error_message)) {
        return false;
    }
    if (!ClientSourceQueriesMatch(view_query, rule_query)) {
        if (error_message != nullptr) {
            *error_message = "vaRule source must match PublishedView source";
        }
        return false;
    }
    return true;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 5199 function
bool ClientLiveRequestHasSourceOverride(const std::string& body,
                                        const std::unordered_map<std::string, std::string>& query) {
    static const std::vector<std::string> kBlockedKeys = {
        "file", "url", "source", "sourceId", "rtspUrl", "httpUrl", "webrtcSourceId", "whepUrl"};
    for (const auto& key : kBlockedKeys) {
        if (query.find(key) != query.end() || ParseStringField(body, key).has_value()) {
            return true;
        }
    }
    return false;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 5211 function
bool BuildClientLiveWebRtcQuery(const SourceViewApplicationService::ClientViewAccess& access,
                                const std::string& raw_overlay_mode,
                                const std::string& requested_rule_id,
                                std::unordered_map<std::string, std::string>* query,
                                std::string* error_message) {
    if (query == nullptr) {
        if (error_message != nullptr) {
            *error_message = "query output is required";
        }
        return false;
    }
    query->clear();
    std::string mode = NormalizeClientOverlayMode(raw_overlay_mode);
    if (mode.empty()) {
        mode = ClientDefaultOverlayMode(access.view);
    }
    if (mode.empty() || !ClientViewAllowsOverlayMode(access.view, mode)) {
        if (error_message != nullptr) {
            *error_message = "overlay mode is not allowed for this view";
        }
        return false;
    }

    if (mode == "va-rule") {
        std::string rule_id = Trim(requested_rule_id);
        if (rule_id.empty()) {
            rule_id = !access.view.default_rule_id.empty()
                          ? access.view.default_rule_id
                          : (access.view.allowed_rule_ids.empty() ? std::string()
                                                                  : access.view.allowed_rule_ids.front());
        }
        if (rule_id.empty() ||
            std::find(access.view.allowed_rule_ids.begin(),
                      access.view.allowed_rule_ids.end(),
                      rule_id) == access.view.allowed_rule_ids.end()) {
            if (error_message != nullptr) {
                *error_message = "allowed vaRule is required for va-rule mode";
            }
            return false;
        }
        if (!ClientVaRuleSourceMatchesView(access, rule_id, error_message)) {
            return false;
        }
        (*query)["vaRule"] = rule_id;
        (*query)["metadataChannel"] = "1";
        (*query)["renderVideoOverlay"] = "1";
        return true;
    }

    if (!AddClientSourceQuery(access.source, query, error_message)) {
        return false;
    }
    if (mode == "va-overlay") {
        (*query)["va"] = "1";
        (*query)["metadataChannel"] = "1";
        (*query)["renderVideoOverlay"] = "1";
    }
    return true;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 5271 function
SourceViewApplicationService::ClientViewAccessAuthorizer MakeClientViewAccessAuthorizer(
    const auth::Principal& principal) {
    return [principal](const std::string& view_id, const std::string& required_scope_prefix) {
        return auth::RequireRole(principal, {"operator"}) ||
               auth::RequireScope(principal, required_scope_prefix + ":" + view_id);
    };
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 5279 function
std::string ClientShellPageHtml(const auth::Principal& principal, const std::string& active) {
    const ApplicationServiceResult views_result = SourceViewApplicationService::Instance().ClientViewsJson(
        MakeClientViewAccessAuthorizer(principal));
    const std::string views_json =
        views_result.status == 200 ? views_result.body : "{\"status\":\"clientViews\",\"views\":[]}";
    const bool preview_mode =
        (auth::IsAdmin(principal) || auth::IsOperator(principal)) &&
        auth::RequireScope(principal, "ops:read");
    const std::string client_subtitle = preview_mode ? "관리자 클라이언트 미리보기" : "클라이언트";
    std::ostringstream out;
    out << R"(<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>클라이언트 포털</title>
)" << ProductThemeBootScript() << ProductUiCss() << ProductSharedUiScript() << ClientShellCss() << R"(
</head>
<body class="product-shell client-shell sketch-shell" data-client-preview=")" << (preview_mode ? "true" : "false") << R"(" data-client-preview-boundary="admin-preview-viewer-safe" data-client-active=")" << HtmlEscape(active) << R"(">
  <main class="product-page">
    <header class="app-chrome sketch-topbar">
      <div class="app-header-top">
        <div class="app-nav-cluster sketch-nav-cluster">
          <div class="app-brand sketch-brand">
            )" << ProductBrandMarkSvg() << R"(
            <div class="brand-copy">
              <strong>Media Server</strong>
              <span>)" << HtmlEscape(client_subtitle) << R"(</span>
            </div>
          </div>
          <nav class="image-nav-tabs sketch-primary-nav client-image-nav-tabs" aria-label="클라이언트 메뉴">
)";
    AppendImageNavLink(out, "/client/live", "live", "라이브", active == "live");
    AppendImageNavLink(out, "/client/dashboard", "dashboard", "대시보드", active == "dashboard");
    out << R"(          </nav>
        </div>
)";
    AppendProductAccountMenu(out,
                             principal,
                             preview_mode ? "/ops/home" : std::string(),
                             preview_mode ? "운영" : std::string());
    out << R"(      </div>
    </header>
)";

    out << R"(
    <section class="workspace client-workspace-shell client-viewer-workspace" data-testid="client-shell-page" data-client-workspace="viewer-first" data-client-redaction-review="viewer-safe-no-locator-debug">
      <div class="client-preview-redaction-strip" data-client-review="admin-preview" data-admin-preview-state=")" << (preview_mode ? "true" : "false") << R"(">
        <span class="chip client-redaction-review-chip">)" << (preview_mode ? "관리자 preview" : "viewer-safe") << R"(</span>
        <span class="client-redaction-review-copy">viewer-safe 경계 확인</span>
      </div>
      <div class="panel client-channel-dock client-viewer-dock" data-client-redaction="viewer-safe-dock">
        <div class="toolbar panel-title-toolbar">
          <h2>할당 채널</h2>
	          )" << RefreshIconButtonHtml("refresh", "ghost", "새로고침") << R"(
        </div>
        <div id="views" class="views"></div>
      </div>
      <div class="panel client-detail-panel client-viewer-detail" id="detail">
        <div class="empty"><h3>채널을 선택하세요</h3><p>허용된 채널을 선택하면 이 영역에 상태가 표시됩니다.</p></div>
      </div>
    </section>
  </main>
  <script type="application/json" id="views-data">)" << JsonScriptContent(views_json) << R"(</script>
)";
    AppendClientShellScript(out);
    AppendProductThemeScript(out);
    out << R"(
</body>
</html>)";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 5352 function
bool IsOpsOverviewShellRoute(const std::string& path) {
    return path == "/ops" || path == "/ops/home" || path == "/ops/dashboard" ||
           path == "/ops/vlm";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 5357 function
std::string OpsOverviewActiveForPath(const std::string& path) {
    if (path == "/ops/dashboard") {
        return "dashboard";
    }
    if (IsOpsEventsPageRoute(path)) {
        return "events";
    }
    if (path == "/ops/vlm") {
        return "vlm";
    }
    return "home";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 5370 function
bool IsClientShellRoute(const std::string& path) {
    return path == "/client" || path == "/client/live" || path == "/client/dashboard" ||
           path == "/client/events";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 5375 function
std::string ClientShellActiveForPath(const std::string& path) {
    if (path == "/client/events") {
        return "events";
    }
    if (path == "/client/dashboard") {
        return "dashboard";
    }
    return "live";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 5385 function
std::string BuildOpsSourcesPageHtml(const auth::Principal& principal) {
    std::ostringstream out;
    const bool can_write_sources = auth::RequireScope(principal, "source:write");
    AppendOpsShellStart(out,
                        ProductUiPrincipalViewFromAuthPrincipal(principal),
                        "sources",
                        "운영 채널을 관리합니다.");
    out << R"OPS(    <section class="panel ops-channels-workspace" data-ops-panel="sources" data-testid="ops-sources-page" data-channel-workspace="task-units">
      <div class="toolbar panel-title-toolbar ops-workspace-hero">
        <div>
          <h2>채널</h2>
          <p>채널 목록, source detail, 입력 준비, PublishedView, audit을 작업 단위로 관리합니다.</p>
        </div>
      </div>
      <div class="ops-channels-main-grid">
      <section class="section-card ops-workspace-wide" data-channel-task="onboarding-quality" data-testid="source-onboarding-quality-summary">
        <div class="toolbar">
          <div>
            <h3>Onboarding 품질</h3>
            <p id="source-onboarding-quality-status">채널 입력 품질을 확인 중입니다.</p>
          </div>
        </div>
        <div id="source-onboarding-quality-summary" class="metric-grid">
          <div class="metric-card"><span>Ready</span><strong id="sourceOnboardingReadyCount">-</strong></div>
          <div class="metric-card"><span>Warning</span><strong id="sourceOnboardingWarningCount">-</strong></div>
          <div class="metric-card"><span>Blocked</span><strong id="sourceOnboardingBlockedCount">-</strong></div>
          <div class="metric-card"><span>Duplicate</span><strong id="sourceOnboardingDuplicateCount">-</strong></div>
          <div class="metric-card"><span>Missing view</span><strong id="sourceOnboardingMissingViewCount">-</strong></div>
        </div>
        <div id="source-onboarding-quality-list" class="validation-list"></div>
      </section>
      <section class="section-card ops-workspace-wide" data-channel-task="reliability-timeline" data-testid="source-reliability-timeline-health-history">
        <div class="toolbar">
          <div>
            <h3>Reliability Timeline</h3>
            <p id="source-reliability-timeline-status">source health history를 확인 중입니다.</p>
          </div>
        </div>
        <div id="source-reliability-timeline-summary" class="metric-grid">
          <div class="metric-card"><span>Live</span><strong id="sourceReliabilityLiveCount">-</strong></div>
          <div class="metric-card"><span>Stale</span><strong id="sourceReliabilityStaleCount">-</strong></div>
          <div class="metric-card"><span>Offline</span><strong id="sourceReliabilityOfflineCount">-</strong></div>
          <div class="metric-card"><span>Warnings</span><strong id="sourceReliabilityWarningCount">-</strong></div>
          <div class="metric-card"><span>Transitions</span><strong id="sourceReliabilityTransitionCount">-</strong></div>
        </div>
        <div id="source-reliability-timeline-list" class="source-reliability-timeline-list"></div>
      </section>
      <section class="section-card ops-workspace-wide" data-channel-task="source-reliability-search-metrics" data-testid="source-reliability-search-metrics">
        <div class="toolbar">
          <div>
            <h3>Reliability Search</h3>
            <p id="source-reliability-search-status">source reliability search metrics를 확인 중입니다.</p>
          </div>
        </div>
        <div id="source-reliability-search-summary" class="metric-grid">
          <div class="metric-card"><span>Matched</span><strong id="sourceReliabilityMatchedMetricCount">-</strong></div>
          <div class="metric-card"><span>Reconnect</span><strong id="sourceReliabilityReconnectMetricCount">-</strong></div>
          <div class="metric-card"><span>Stale</span><strong id="sourceReliabilityStaleMetricCount">-</strong></div>
          <div class="metric-card"><span>Offline</span><strong id="sourceReliabilityOfflineMetricCount">-</strong></div>
          <div class="metric-card"><span>Views</span><strong id="sourceReliabilitySavedViewCount">-</strong></div>
        </div>
        <div class="source-reliability-search-grid" data-source-reliability-search-metrics="media-server.ops.v330-source-reliability-search-metrics.v1">
          <div>
            <h4>source health filters</h4>
            <div id="source-reliability-search-filter-list" class="source-reliability-filter-list"></div>
          </div>
          <div>
            <h4>saved reliability views</h4>
            <div id="source-reliability-saved-view-list" class="source-reliability-saved-views"></div>
          </div>
          <div class="source-reliability-search-results">
            <h4>reconnect/stale/offline metric summary</h4>
            <div id="source-reliability-search-result-list" class="source-reliability-search-result-list"></div>
          </div>
        </div>
      </section>
      <section class="section-card ops-workspace-wide" data-channel-task="source-backup-recovery-handoff" data-testid="source-backup-recovery-handoff">
        <div class="toolbar">
          <div>
            <h3>Backup Handoff</h3>
            <p id="source-backup-handoff-status">backup/recovery source handoff를 확인 중입니다.</p>
          </div>
        </div>
        <div id="source-backup-handoff-summary" class="metric-grid">
          <div class="metric-card"><span>Inputs</span><strong id="sourceBackupHandoffInputCount">-</strong></div>
          <div class="metric-card"><span>Plan</span><strong id="sourceBackupHandoffRecoveryPlanCount">-</strong></div>
          <div class="metric-card"><span>Stale</span><strong id="sourceBackupHandoffStaleCount">-</strong></div>
          <div class="metric-card"><span>Offline</span><strong id="sourceBackupHandoffOfflineCount">-</strong></div>
          <div class="metric-card"><span>Ready</span><strong id="sourceBackupHandoffValidationReadyCount">-</strong></div>
        </div>
        <div class="source-backup-handoff-grid" data-source-backup-recovery-handoff="media-server.ops.v330-backup-recovery-source-handoff.v1">
          <div>
            <h4>handoff inputs</h4>
            <div id="source-backup-handoff-input-list" class="source-backup-handoff-input-list"></div>
          </div>
          <div>
            <h4>recovery validation plan</h4>
            <div id="source-recovery-validation-plan-list" class="source-recovery-validation-plan-list"></div>
          </div>
        </div>
        <div class="source-backup-handoff-grid" data-source-staging-restore-validation-handoff="media-server.ops.v390-staging-restore-validation-handoff.v1">
          <div>
            <h4>staging restore checklist</h4>
            <p id="sourceStagingRestoreValidationStatus">staging restore validation handoff를 확인 중입니다. resultArtifactPersistedByRoute=false / productionRestorePerformed=false / automaticRecoveryPerformed=false</p>
            <div id="source-staging-restore-checklist-list" class="source-recovery-validation-plan-list"></div>
          </div>
          <div>
            <h4>result artifact contract</h4>
            <div id="source-staging-restore-result-artifact-list" class="source-recovery-validation-plan-list"></div>
          </div>
        </div>
      </section>
      <section class="section-card ops-workspace-wide" data-channel-task="ops-continuity-drill-workspace" data-testid="ops-continuity-drill-workspace">
        <div class="toolbar">
          <div>
            <h3>Ops Continuity Drill Workspace</h3>
            <p id="source-continuity-drill-status">continuity drill package와 validation 상태를 확인 중입니다.</p>
          </div>
        </div>
        <div id="source-continuity-drill-summary" class="metric-grid">
          <div class="metric-card"><span>Packages</span><strong id="source-continuity-drill-package-count">-</strong></div>
          <div class="metric-card"><span>Ready</span><strong id="source-continuity-drill-validation-ready-count">-</strong></div>
          <div class="metric-card"><span>Blocked</span><strong id="source-continuity-drill-blocked-count">-</strong></div>
          <div class="metric-card"><span>Drift</span><strong id="source-continuity-drill-drift-count">-</strong></div>
        </div>
        <div class="source-continuity-drill-grid" data-source-continuity-drill-workspace="media-server.ops.v340-continuity-drill-workspace-ui.v1">
          <div>
            <h4>drill package</h4>
            <div id="source-continuity-drill-package-list" class="source-continuity-drill-list"></div>
          </div>
          <div>
            <h4>validation status</h4>
            <div id="source-continuity-drill-validation-list" class="source-continuity-drill-list"></div>
          </div>
          <div>
            <h4>source health drift</h4>
            <div id="source-continuity-drill-drift-list" class="source-continuity-drill-list"></div>
          </div>
        </div>
      </section>
      <section class="section-card ops-workspace-wide" data-channel-task="ops-approval-gated-recovery-checklist" data-testid="ops-approval-gated-recovery-checklist">
        <div class="toolbar">
          <div>
            <h3>Approval-Gated Recovery Checklist</h3>
            <p id="source-recovery-checklist-status">operator note, dry-run result, Ops audit 연결을 확인 중입니다.</p>
          </div>
        </div>
        <div id="source-recovery-checklist-summary" class="metric-grid">
          <div class="metric-card"><span>Ready</span><strong id="source-recovery-checklist-ready-count">-</strong></div>
          <div class="metric-card"><span>Blocked</span><strong id="source-recovery-checklist-blocked-count">-</strong></div>
          <div class="metric-card"><span>Field Smoke</span><strong id="source-recovery-checklist-field-smoke-needed-count">-</strong></div>
          <div class="metric-card"><span>Not Run</span><strong id="source-recovery-checklist-not-run-count">-</strong></div>
        </div>
        <div class="source-recovery-checklist-grid" data-source-recovery-checklist="media-server.ops.v340-approval-gated-recovery-checklist.v1">
          <div>
            <h4>approval checklist</h4>
            <div id="source-recovery-checklist-list" class="source-recovery-checklist-list"></div>
          </div>
        </div>
      </section>
      <section class="section-card ops-workspace-wide" data-channel-task="ops-drill-evidence-export-cleanup-manifest" data-testid="ops-drill-evidence-export-cleanup-manifest">
        <div class="toolbar">
          <div>
            <h3>Drill Evidence Export and Cleanup Manifest</h3>
            <p id="source-drill-evidence-manifest-status">redacted drill artifact manifest와 cleanup 경계를 확인 중입니다.</p>
          </div>
        </div>
        <div id="source-drill-evidence-manifest-summary" class="metric-grid">
          <div class="metric-card"><span>Retained</span><strong id="source-drill-evidence-retained-count">-</strong></div>
          <div class="metric-card"><span>Artifacts</span><strong id="source-drill-evidence-artifact-count">-</strong></div>
          <div class="metric-card"><span>Cleanup</span><strong id="source-drill-evidence-cleanup-count">-</strong></div>
          <div class="metric-card"><span>Scan</span><strong id="source-drill-evidence-scan-count">-</strong></div>
        </div>
        <div class="source-drill-evidence-manifest-grid" data-source-drill-evidence-manifest="media-server.ops.v340-drill-evidence-export-cleanup-manifest.v1">
          <div>
            <h4>redacted drill artifact manifest</h4>
            <div id="source-drill-evidence-artifact-list" class="source-drill-evidence-manifest-list"></div>
          </div>
          <div>
            <h4>/tmp cleanup manifest</h4>
            <div id="source-drill-evidence-cleanup-list" class="source-drill-evidence-manifest-list"></div>
          </div>
          <div>
            <h4>sensitive material scan</h4>
            <div id="source-drill-evidence-scan-list" class="source-drill-evidence-manifest-list"></div>
          </div>
        </div>
      </section>
      <section class="section-card ops-workspace-wide" data-channel-task="ops-field-bridge-condition-gates" data-testid="ops-field-bridge-condition-gates">
        <div class="toolbar">
          <div>
            <h3>Field Bridge Condition Gates</h3>
            <p id="source-field-bridge-gate-status">ONVIF 실기기, external WHEP/TURN, real cloud/VLM provider 조건을 확인 중입니다.</p>
          </div>
        </div>
        <div id="source-field-bridge-gate-summary" class="metric-grid">
          <div class="metric-card"><span>Gates</span><strong id="source-field-bridge-gate-count">-</strong></div>
          <div class="metric-card"><span>Field Smoke</span><strong id="source-field-bridge-field-smoke-count">-</strong></div>
          <div class="metric-card"><span>Blocked</span><strong id="source-field-bridge-blocked-count">-</strong></div>
          <div class="metric-card"><span>Approvals</span><strong id="source-field-bridge-approval-count">-</strong></div>
        </div>
        <div class="source-field-bridge-gate-grid" data-source-field-bridge-gates="media-server.ops.v340-field-bridge-condition-gates.v1">
          <div>
            <h4>condition gates</h4>
            <div id="source-field-bridge-gate-list" class="source-field-bridge-gate-list"></div>
          </div>
          <div>
            <h4>source-only PASS boundary</h4>
            <div id="source-field-bridge-boundary-list" class="source-field-bridge-gate-list"></div>
          </div>
        </div>
      </section>
      <section class="section-card ops-channels-list-panel" data-channel-task="list">
        <div class="toolbar">
          <div>
            <h3>채널 목록</h3>
            <p>목록을 보고 상세/삭제를 진행합니다.</p>
            <p id="channelScopePolicy" class="form-note" data-scope-contract="source-write-required" data-scope-state=")OPS" << (can_write_sources ? "source-write-allowed" : "source-write-blocked") << R"OPS(">)OPS"
        << (can_write_sources
                ? "source:write scope 확인됨. 채널 생성/수정/삭제를 수행할 수 있습니다."
                : "읽기 전용 범위입니다. ops:read로 채널 조회만 가능하며 source:write가 필요한 생성/수정/삭제 UI는 잠깁니다.")
        << R"OPS(</p>
          </div>
          <div class="actions">
            <button id="add-channel" class="button-primary" type="button" aria-disabled=")OPS" << (can_write_sources ? "false" : "true") << "\"" << (can_write_sources ? "" : " disabled data-scope-blocked=\"source:write\"") << R"OPS(>채널 추가</button>
	            )OPS" << RefreshIconButtonHtml("refresh", "button-secondary", "새로고침") << R"OPS(
            <span id="status" class="status" aria-live="polite" hidden></span>
          </div>
        </div>
        <div class="table-wrap">
          <table class="ops-data-table ops-responsive-table channel-table">
            <colgroup>
              <col class="channel-col-id" />
              <col class="channel-col-name" />
              <col class="channel-col-kind" />
              <col class="channel-col-status" />
              <col class="channel-col-input" />
              <col class="channel-col-live-url" />
              <col class="channel-col-va-url" />
              <col class="channel-col-actions" />
            </colgroup>
)OPS";
    AppendTableHead(out, {"ID", "이름", "종류", "상태", "입력", "라이브 URL", "VA URL", "작업"});
    out << R"OPS(            <tbody id="channels-body"><tr><td colspan="8">로딩 중</td></tr></tbody>
          </table>
        </div>
        <p class="hint" style="margin-top:12px;">RTSP/WHEP는 운영 확인용입니다. 브라우저 재생은 <code>/client/live</code>에서 확인합니다.</p>
      </section>

      <section id="channel-detail-panel" class="section-card ops-detail-panel ops-channels-detail-panel" data-channel-task="detail" hidden>
        <div class="toolbar">
          <div>
            <div class="badge-row"><span id="channel-editor-mode" class="chip info">보기</span><span id="channel-editor-id" class="chip">-</span></div>
            <h3 id="channel-editor-title">채널 상세</h3>
            <p id="channel-editor-help">저장된 내용입니다.</p>
          </div>
          <div class="actions">
            <button id="channel-edit-selected" class="button-secondary" type="button">수정</button>
            <button id="channel-save-selected" class="button-primary" type="submit" form="channel-form">저장</button>
            <button id="channel-close" class="button-secondary" type="button">닫기</button>
          </div>
        </div>
          <form id="channel-form">
          <div class="channel-editor-intro">
            <p><strong>ONVIF 카메라</strong>는 ONVIF 프로파일에서 선택한 라이브 스트림 URI를 연결합니다. <strong>외부 WHEP</strong>는 URL 입력, <strong>Published WebRTC 소스</strong>는 저장된 <code>sourceId</code> 연결입니다.</p>
          </div>
          <div class="ops-channels-detail-grid" data-channel-task="published-view" data-scope-contract="view-read-scopes-unchanged">
          <div class="row">
            <div class="generated-id-control">
              <span class="form-label">채널 ID</span>
              <input name="channelId" type="hidden" required />
              <span id="channel-id-display" class="generated-id-field" data-generated-id="channel">자동 배정</span>
            </div>
            <label>이름<input name="displayName" /></label>
            <label>종류
              <select name="kind">
                <option value="file">파일</option>
                <option value="onvif">ONVIF 카메라</option>
                <option value="rtsp">RTSP pull</option>
                <option value="whep">외부 WHEP pull</option>
                <option value="webrtc">Published WebRTC 소스</option>
                <option value="http">HTTP/HLS pull</option>
              </select>
            </label>
          </div>
          <div class="row" data-testid="source-group-site-management">
            <label>사이트<input name="site" placeholder="예: 본사" /></label>
            <label>그룹<input name="group" placeholder="예: 주차장" /></label>
            <label>층<input name="floor" placeholder="예: B1" /></label>
            <label>구역<input name="zone" placeholder="예: 출입구" /></label>
          </div>
          <div class="row" data-testid="published-view-rule-scope-management">
            <label>허용 룰 ID<input name="allowedRuleIds" placeholder="쉼표 또는 공백으로 구분" /></label>
            <label>클라이언트 그룹<input name="clientGroups" placeholder="쉼표 또는 공백으로 구분" /></label>
          </div>
          <div class="row" data-testid="recording-policy-management">
            <label>상시녹화 사용<input name="recordingEnabled" type="checkbox" value="true" /></label>
            <label>녹화 용량(byte)<input name="recordingQuotaBytes" type="number" min="1" value="10737418240" /></label>
            <label>보존 일수<input name="recordingRetentionDays" type="number" min="1" value="7" /></label>
            <label>저장 하위경로<input name="recordingStoragePath" placeholder="예: parking/b1" /></label>
          </div>
          </div>
          <div class="ops-channels-input-grid" data-channel-task="inputs">
          <label data-source-kind="file" data-channel-input-group="file">파일
            <select name="file" id="channel-file-select" aria-label="파일">
              <option value="sample_h264.mp4">sample_h264.mp4</option>
            </select>
          </label>
          <label data-source-kind="onvif" data-channel-input-group="onvif">ONVIF 스트림 URI<input name="onvifStreamUrl" placeholder="rtsp://camera/live 또는 https://camera/live.m3u8" /></label>
          <p data-source-kind="onvif" data-channel-input-group="onvif" class="hint">지원 제외: WS-Discovery 자동 검색, PTZ 제어, ONVIF Events/PullPoint, Profile G/Recording/Replay는 제공하지 않습니다. 운영자가 확인한 live URI 또는 probe fixture를 사용합니다.</p>
          <div data-source-kind="onvif" data-channel-input-group="onvif" class="form-grid" data-testid="onvif-probe-draft-tool">
            <div class="onvif-credential-gate" data-testid="onvif-credential-gate" data-credential-store="deferred-product-store" data-redaction="credential-reference-only" data-source-write-required="true">
              <div class="badge-row">
                <span class="chip info">source:write</span>
                <span class="chip">reference-only</span>
                <span class="chip warn">secret store off</span>
              </div>
              <p id="onvifCredentialGateStatus" class="hint" aria-live="polite">primaryStoreProvider: none / credentialRef redacted / URL credential reject</p>
              <p id="onvifPersistDecisionStatus" class="hint" aria-live="polite">persistDecision: manual-form-save-handoff / importDraftNotSaved=true / oneShotPersist=false</p>
            </div>
            <label>ONVIF probe fixture
              <textarea id="onvifProbeDraftInput" rows="5" spellcheck="false" autocomplete="off" placeholder="test/fixtures/onvif_probe_result_stub.json 내용을 붙여넣기"></textarea>
            </label>
            <label>ONVIF profile
              <select id="onvifProbeProfileSelect" disabled>
                <option value="">profile 후보 없음</option>
              </select>
            </label>
            <div class="actions">
              <button id="onvifProbeDraftApply" class="button-secondary" type="button">Probe draft 적용</button>
              <button id="onvifProbeDraftClear" class="button-secondary" type="button">초기화</button>
            </div>
            <p id="onvifProbeDraftStatus" class="hint" aria-live="polite"></p>
          </div>
          <label data-source-kind="rtsp" data-channel-input-group="rtsp">RTSP URL<input name="rtspUrl" placeholder="rtsp://camera/live" /></label>
          <label data-source-kind="whep" data-channel-input-group="whep">외부 WHEP URL<input name="whepUrl" placeholder="https://example.com/whep/stream" /></label>
          <p data-source-kind="whep" data-channel-input-group="whep" class="hint">외부 WebRTC playback endpoint를 서버가 WHEP pull source로 연결합니다. URL 자체가 입력값입니다.</p>
          <label data-source-kind="webrtc" data-channel-input-group="whip">발행 sourceId<input name="webrtcSourceId" placeholder="published-source-id" /></label>
          <p data-source-kind="webrtc" data-channel-input-group="whip" class="hint">외부 URL을 넣는 항목이 아닙니다. 이 서버의 WHIP publish endpoint로 이미 등록된 sourceId를 연결합니다.</p>
          <label data-source-kind="http" data-channel-input-group="http">HTTP/HLS URL<input name="httpUrl" /></label>
          <p id="channel-validation" class="hint"></p>
          </div>
        </form>
      </section>
      </div>
      <section class="section-card ops-audit-panel ops-channels-audit-panel" data-channel-task="audit">
        <div class="toolbar">
          <div>
            <h3>변경 이력</h3>
            <p>서버 감사 로그에서 채널 변경의 작업자, 전/후 값, 시각을 확인하고 채널 감사 JSON/CSV/Diff JSON export를 내려받습니다.</p>
          </div>
          <button id="channel-audit-refresh" class="button-secondary" type="button">새로고침</button>
        </div>
        <div id="channel-audit-list" class="audit-list" data-audit-area="channels"></div>
      </section>
)OPS";
    out << R"OPS(    </section>
)OPS";
    AppendOpsSourcesPageScript(out, JsonEscape(GetWebRtcHttpRuntimeConfig().stream_route), GetWebRtcHttpRuntimeConfig().rtsp_listen_port);
    AppendOpsShellEnd(out);
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 5742 function
std::string BuildOpsUsersPageHtml(const auth::Principal& principal) {
    std::ostringstream out;
    AppendOpsShellStart(out,
                        ProductUiPrincipalViewFromAuthPrincipal(principal),
                        "users",
                        "관리자가 사용자 계정과 접근 범위를 관리합니다.");
    out << R"USERS(    <section class="panel ops-users-access-workspace" data-ops-panel="users" data-testid="ops-users-page" data-access-workspace="task-units">
      <div class="toolbar panel-title-toolbar ops-workspace-hero">
        <div>
          <h2>사용자 관리</h2>
          <p>사용자, 초대, 승인, role/scope, audit 흐름을 작업 단위로 관리합니다.</p>
        </div>
        <div class="actions">
          <button id="add-user-btn" class="button-primary" type="button">사용자 추가</button>
	          )USERS" << RefreshIconButtonHtml("refresh-btn", "button-secondary", "새로고침") << R"USERS(
          <span id="status" class="status"></span>
        </div>
      </div>
      <section class="section-card user-lifecycle-policy ops-users-lifecycle-policy" data-testid="user-lifecycle-policy">
        <div class="toolbar">
          <div>
            <h2>계정 라이프사이클 정책</h2>
            <p>초대 만료, 비밀번호 초기화, 비활성화/복구, 사용자 감사 export를 같은 운영 절차로 확인합니다.</p>
          </div>
          <span class="chip info">auth/session 계약 변경 없음</span>
        </div>
        <div class="status-stat-grid">
          <div class="status-stat">
            <span>초대</span>
            <strong>기본 만료 24시간</strong>
          </div>
          <div class="status-stat">
            <span>비밀번호</span>
            <strong>초기화 후 다음 로그인 변경</strong>
          </div>
          <div class="status-stat">
            <span>비활성화</span>
            <strong>로그인/세션 차단</strong>
          </div>
          <div class="status-stat">
            <span>감사</span>
            <strong>JSON/CSV/Diff JSON export</strong>
          </div>
        </div>
        <p class="hint">초대 링크는 기본 24시간 동안만 유효하며, 만료 후에는 새 초대를 발급합니다. 비밀번호 초기화는 임시 비밀번호를 설정하고 기존 세션을 회수합니다. 복구 시 로그인 잠금과 실패 횟수는 초기화됩니다.</p>
      </section>
      <div class="ops-users-access-grid">
      <section class="section-card ops-users-lifecycle-panel" data-access-task="users">
        <h2>사용자 목록</h2>
        <div class="table-wrap">
          <table class="ops-data-table ops-responsive-table user-table">
            <colgroup>
              <col class="user-col-username" />
              <col class="user-col-name" />
              <col class="user-col-role" />
              <col class="user-col-status" />
              <col class="user-col-scopes" />
              <col class="user-col-last-login" />
              <col class="user-col-locked-until" />
              <col class="user-col-password" />
              <col class="user-col-actions" />
            </colgroup>
)USERS";
    AppendTableHead(out,
                    {"계정명", "이름", "권한", "상태", "권한 범위", "마지막 로그인", "잠금 만료", "비밀번호 변경", "작업"});
    out << R"USERS(            <tbody id="users-body"></tbody>
          </table>
        </div>
      </section>

      <section class="section-card ops-users-request-panel" data-access-task="requests">
        <div class="toolbar">
          <div>
            <h2>승인 대기 요청</h2>
            <p>공개 회원가입이 아니라, 별도 요청 페이지로 들어온 계정을 관리자가 검토한 뒤 초대 링크를 발급합니다.</p>
          </div>
          <a class="button button-secondary" href="/client/request-access">요청 페이지</a>
          <span id="request-status" class="status"></span>
        </div>
        <pre id="request-invite-output" hidden></pre>
        <div class="table-wrap">
          <table class="ops-data-table ops-responsive-table user-table">
            <colgroup>
              <col class="request-col-username" />
              <col class="request-col-name" />
              <col class="request-col-contact" />
              <col class="request-col-channel" />
              <col class="request-col-reason" />
              <col class="request-col-status" />
              <col class="request-col-decision" />
              <col class="request-col-actions" />
            </colgroup>
)USERS";
    AppendTableHead(out, {"계정명", "이름", "연락처", "채널", "사유", "상태", "요청/결정", "작업"});
    out << R"USERS(            <tbody id="access-requests-body"></tbody>
          </table>
        </div>
      </section>

      <section class="section-card ops-users-invite-panel" data-access-task="invites" data-testid="ops-invites-panel">
        <div class="toolbar">
          <div>
            <h2>초대 발급</h2>
            <p>관리자가 직접 초대 링크를 발급하고, 사용 전/사용 완료 초대 상태를 확인합니다.</p>
          </div>
          <span id="invite-status" class="status"></span>
        </div>
        <form id="invite-create-form" class="inline-form">
          <label>계정명<input name="username" required /></label>
          <label>표시 이름<input name="displayName" /></label>
          <label>권한
            <select name="role">
              <option value="viewer">시청자</option>
              <option value="operator">운영자</option>
              <option value="integrator">연동</option>
              <option value="admin">관리자</option>
            </select>
          </label>
          <label>채널 ID<input name="viewId" placeholder="viewer/integrator 범위" /></label>
          <label>유효 시간(초)<input name="ttlSeconds" type="number" min="60" step="60" value="86400" /></label>
          <button class="button-primary" type="submit">초대 발급</button>
        </form>
        <p class="hint">발급 직후에만 토큰과 설정 링크를 표시합니다. 목록에는 토큰/토큰 해시를 노출하지 않습니다.</p>
        <pre id="invite-create-output" hidden></pre>
        <div class="table-wrap">
          <table class="ops-data-table ops-responsive-table user-table">
            <colgroup>
              <col class="request-col-username" />
              <col class="request-col-name" />
              <col class="user-col-role" />
              <col class="request-col-channel" />
              <col class="request-col-status" />
              <col class="request-col-decision" />
              <col class="request-col-decision" />
            </colgroup>
)USERS";
    AppendTableHead(out, {"계정명", "이름", "권한", "채널", "상태", "만료", "발급/사용"});
    out << R"USERS(            <tbody id="invite-list-body"></tbody>
          </table>
        </div>
      </section>

      </div>

      <section id="user-detail-panel" class="section-card ops-detail-panel ops-users-role-scope-panel" data-access-task="role-scope" data-scope-contract="role-scope-unchanged" hidden>
        <div class="toolbar">
          <div>
            <div class="badge-row"><span id="user-editor-mode" class="chip info">상세</span><span id="user-editor-id" class="chip">@-</span></div>
            <h3 id="user-editor-title">사용자 상세</h3>
            <p id="user-editor-help">저장된 내용입니다.</p>
          </div>
          <div class="actions">
            <button id="user-edit-selected" class="button-secondary" type="button">수정</button>
            <button id="user-save-selected" class="button-primary" type="submit" form="user-form">저장</button>
            <button id="user-close" class="button-secondary" type="button">닫기</button>
          </div>
        </div>
        <form id="user-form">
            <div class="row">
              <label>계정명<input name="username" required /></label>
              <label>표시 이름<input name="displayName" /></label>
            </div>
            <div id="password-fields" class="row">
              <label>초기 비밀번호<input name="password" type="password" autocomplete="new-password" /></label>
              <label>비밀번호 확인<input name="confirmPassword" type="password" autocomplete="new-password" /></label>
            </div>
            <div class="row">
              <label>권한
                <select name="role">
                  <option value="viewer">시청자</option>
                  <option value="operator">운영자</option>
                  <option value="integrator">연동</option>
                  <option value="admin">관리자</option>
                </select>
              </label>
            </div>
            <div id="view-assignment">
              <div class="channel-assignment-field">
                <span class="form-label">채널</span>
                <input name="viewId" type="hidden" />
                <div id="view-assignment-options" class="channel-assignment-list" data-testid="user-channel-assignment-list"></div>
              </div>
              <p class="hint">채널명과 사이트/그룹 위치를 확인해 여러 채널을 선택합니다. 시청자/연동 계정에는 선택한 채널들의 라이브, 대시보드, 이벤트, 메타데이터 조회 권한만 부여합니다. 운영, 개발, 소스, 룰 관리 권한은 허용하지 않습니다.</p>
            </div>
            <div class="scope-template-actions">
              <button id="apply-view-scope-template" class="button-secondary" type="button">채널 범위 적용</button>
              <button id="apply-role-default-scope-template" class="button-secondary" type="button">역할 기본 적용</button>
              <button id="clear-custom-scopes" class="button-secondary" type="button">직접 입력 비우기</button>
            </div>
            <p id="scope-template-preview" class="hint">역할과 채널 ID를 기준으로 권한 범위를 미리 계산합니다.</p>
            <label>권한 범위<textarea id="user-scopes-input" name="scopes" placeholder="비워두면 권한/채널 기준 템플릿 사용"></textarea></label>
            <div class="checks">
              <label><input name="enabled" type="checkbox" checked /> 활성화</label>
              <label><input name="mustChangePassword" type="checkbox" checked /> 다음 로그인 시 비밀번호 변경</label>
            </div>
            <p id="user-lifecycle-summary" class="hint">활성 상태와 다음 로그인 비밀번호 변경 여부를 확인합니다.</p>
        </form>
        <div id="user-reset-password-panel" class="user-reset-password-panel" hidden>
          <div>
            <strong>비밀번호 초기화</strong>
            <p class="hint">임시 비밀번호를 설정하면 기존 세션을 회수하고 다음 로그인에서 비밀번호 변경을 요구합니다. 비밀번호 원문은 감사 로그에 남기지 않습니다.</p>
          </div>
          <div class="row">
            <label>새 임시 비밀번호<input id="user-reset-password" type="password" autocomplete="new-password" /></label>
            <label>새 임시 비밀번호 확인<input id="user-reset-password-confirm" type="password" autocomplete="new-password" /></label>
          </div>
          <div class="actions">
            <button id="user-reset-password-button" class="button-secondary" type="button">비밀번호 초기화</button>
            <span id="user-reset-password-status" class="status"></span>
          </div>
        </div>
      </section>
      <section class="section-card ops-audit-panel ops-users-audit-panel" data-access-task="audit">
        <div class="toolbar">
          <div>
            <h2>변경 이력</h2>
            <p>서버 감사 로그에서 사용자 변경의 작업자, 전/후 값, 시각을 확인하고 사용자 감사 JSON/CSV/Diff JSON export를 내려받습니다.</p>
          </div>
          <button id="user-audit-refresh" class="button-secondary" type="button">새로고침</button>
        </div>
        <div id="user-audit-list" class="audit-list" data-audit-area="users"></div>
      </section>
    </section>
)USERS";
    AppendOpsUsersPageScript(out);
    AppendOpsShellEnd(out);
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 5971 function
WebRtcMediaApplicationRequest BuildHttpIngressRequest(const std::string& path,
                                              const std::unordered_map<std::string, std::string>& query,
                                              const std::string& client_id) {
    WebRtcMediaApplicationRequest request;
    request.protocol = "http";
    request.path = path;
    request.query = query;
    request.client_id = client_id;
    return request;
}


// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 5987 function
std::optional<HttpSessionSecrets> GenerateHttpSessionSecrets(const std::string& prefix,
                                                             std::string* error_message) {
    const auto session_random = auth::GenerateSessionId(error_message);
    if (!session_random.has_value()) {
        return std::nullopt;
    }
    const auto capability = auth::GenerateSessionId(error_message);
    if (!capability.has_value()) {
        return std::nullopt;
    }
    return HttpSessionSecrets{
        .session_id = prefix + "-" + *session_random,
        .session_capability = *capability,
    };
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6003 function
std::optional<std::string> GeneratePrefixedRandomId(const std::string& prefix,
                                                    std::string* error_message) {
    const auto random = auth::GenerateSessionId(error_message);
    if (!random.has_value()) {
        return std::nullopt;
    }
    return prefix + "-" + *random;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6012 function
std::string PrincipalOwnerKey(const auth::Principal& principal) {
    std::ostringstream out;
    out << principal.auth_mode << ":";
    if (!principal.username.empty()) {
        out << "user:" << principal.username;
    } else {
        out << "role:" << principal.role << ":" << principal.display_name;
    }
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6023 function
bool SameSessionOwner(const auth::Principal& owner, const auth::Principal& current) {
    return owner.is_authenticated && current.is_authenticated &&
           PrincipalOwnerKey(owner) == PrincipalOwnerKey(current);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6028 function
bool ConstantTimeEquals(const std::string& left, const std::string& right) {
    if (left.size() != right.size()) {
        return false;
    }
    unsigned char diff = 0;
    for (std::size_t i = 0; i < left.size(); ++i) {
        diff |= static_cast<unsigned char>(left[i]) ^ static_cast<unsigned char>(right[i]);
    }
    return diff == 0;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6039 function
std::string RequestSessionCapability(const HttpRequest& request,
                                     const std::unordered_map<std::string, std::string>& query) {
    const std::string header_capability = Trim(HeaderValue(request, "X-Session-Capability"));
    if (!header_capability.empty()) {
        return header_capability;
    }
    for (const char* key : {"sessionCapability", "sessionToken", "capability"}) {
        const auto it = query.find(key);
        if (it != query.end()) {
            const std::string value = Trim(it->second);
            if (!value.empty()) {
                return value;
            }
        }
        const auto body_value = ParseStringField(request.body, key);
        if (body_value.has_value()) {
            const std::string value = Trim(*body_value);
            if (!value.empty()) {
                return value;
            }
        }
    }
    return {};
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6064 function
std::string SessionJson(const std::string& session_id,
                        const std::string& offer,
                        const std::string& session_capability) {
    std::ostringstream out;
    out << "{"
        << "\"sessionId\":\"" << JsonEscape(session_id) << "\","
        << "\"sessionToken\":\"" << JsonEscape(session_capability) << "\","
        << "\"offer\":\"" << JsonEscape(offer) << "\""
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6076 function
std::string ClientSessionJson(const std::string& client_session_id, const std::string& offer) {
    std::ostringstream out;
    out << "{"
        << "\"sessionId\":\"" << JsonEscape(client_session_id) << "\","
        << "\"clientSessionId\":\"" << JsonEscape(client_session_id) << "\","
        << "\"offer\":\"" << JsonEscape(offer) << "\""
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6086 function
std::string IceJson(const std::vector<WebRtcMediaApplicationIceCandidate>& candidates) {
    std::ostringstream out;
    out << "{\"candidates\":[";
    for (std::size_t i = 0; i < candidates.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << "{"
            << "\"candidate\":\"" << JsonEscape(candidates[i].candidate) << "\","
            << "\"sdpMLineIndex\":" << candidates[i].sdp_mline_index
            << "}";
    }
    out << "]}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6102 function
std::optional<std::uint32_t> ParseUnsignedIndexText(const std::string& raw) {
    const std::string value = Trim(raw);
    if (value.empty()) {
        return std::nullopt;
    }
    for (const char ch : value) {
        if (std::isdigit(static_cast<unsigned char>(ch)) == 0) {
            return std::nullopt;
        }
    }
    try {
        const unsigned long parsed = std::stoul(value, nullptr, 10);
        if (parsed > std::numeric_limits<std::uint32_t>::max()) {
            return std::nullopt;
        }
        return static_cast<std::uint32_t>(parsed);
    } catch (...) {
        return std::nullopt;
    }
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6123 function
std::vector<WebRtcMediaApplicationIceCandidate> ParseWhepSdpFragmentIceCandidates(const std::string& body) {
    std::vector<WebRtcMediaApplicationIceCandidate> candidates;
    std::uint32_t current_mline = 0;
    bool saw_media_section = false;

    std::istringstream lines(body);
    std::string line;
    while (std::getline(lines, line)) {
        if (!line.empty() && line.back() == '\r') {
            line.pop_back();
        }
        line = Trim(line);
        if (line.empty()) {
            continue;
        }
        if (line.rfind("m=", 0) == 0) {
            current_mline = saw_media_section ? current_mline + 1 : 0;
            saw_media_section = true;
            continue;
        }
        if (line.rfind("a=mid:", 0) == 0) {
            if (const auto parsed = ParseUnsignedIndexText(line.substr(std::string("a=mid:").size()));
                parsed.has_value()) {
                current_mline = *parsed;
            }
            continue;
        }

        std::string candidate;
        if (line.rfind("a=candidate:", 0) == 0) {
            candidate = line.substr(2);
        } else if (line.rfind("candidate:", 0) == 0) {
            candidate = line;
        }
        if (!candidate.empty()) {
            candidates.push_back(WebRtcMediaApplicationIceCandidate{
                .sdp_mline_index = current_mline,
                .candidate = candidate,
            });
        }
    }
    return candidates;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6167 function
std::optional<HttpResponse> ApplyWhepSdpFragmentIce(
    const HttpRequest& request,
    const std::shared_ptr<WebRtcMediaApplicationEgressSession>& bridge) {
    if (bridge == nullptr || request.body.find("candidate:") == std::string::npos) {
        return std::nullopt;
    }
    const auto candidates = ParseWhepSdpFragmentIceCandidates(request.body);
    if (candidates.empty()) {
        return std::nullopt;
    }
    for (const auto& candidate : candidates) {
        bridge->AddRemoteIceCandidate(candidate.sdp_mline_index, candidate.candidate);
    }
    return HttpResponse{204, "No Content", "text/plain; charset=utf-8", {}, ""};
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6183 function
std::string SourceJson(const std::string& session_id,
                       const std::string& source_id,
                       const std::string& answer,
                       const std::string& session_capability) {
    std::ostringstream out;
    out << "{"
        << "\"sessionId\":\"" << JsonEscape(session_id) << "\","
        << "\"sourceId\":\"" << JsonEscape(source_id) << "\","
        << "\"sessionToken\":\"" << JsonEscape(session_capability) << "\","
        << "\"answer\":\"" << JsonEscape(answer) << "\""
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6197 function
std::string WebRtcMetadataChannelsJson(const std::vector<WebRtcMediaApplicationMetadataChannelStats>& stats) {
    std::uint64_t sent_count = 0;
    std::uint64_t dropped_count = 0;
    std::uint64_t skipped_count = 0;
    std::uint64_t interval_skipped_count = 0;
    std::uint64_t oversized_drop_count = 0;
    std::uint64_t buffered_drop_count = 0;
    std::uint64_t send_failure_count = 0;
    std::uint64_t max_buffered_amount = 0;
    std::ostringstream out;
    out << "{";
    out << "\"sessions\":[";
    for (std::size_t i = 0; i < stats.size(); ++i) {
        const auto& item = stats[i];
        sent_count += item.sent_count;
        dropped_count += item.dropped_count;
        skipped_count += item.skipped_count;
        interval_skipped_count += item.interval_skipped_count;
        oversized_drop_count += item.oversized_drop_count;
        buffered_drop_count += item.buffered_drop_count;
        send_failure_count += item.send_failure_count;
        max_buffered_amount = std::max(max_buffered_amount, item.max_buffered_amount);
        if (i != 0) {
            out << ",";
        }
        out << "{"
            << "\"sessionId\":\"" << JsonEscape(item.session_id) << "\","
            << "\"enabled\":" << (item.enabled ? "true" : "false") << ","
            << "\"open\":" << (item.open ? "true" : "false") << ","
            << "\"label\":\"" << JsonEscape(item.label) << "\","
            << "\"intervalMs\":" << item.interval_ms << ","
            << "\"maxMessageBytes\":" << item.max_message_bytes << ","
            << "\"maxBufferedBytes\":" << item.max_buffered_bytes << ","
            << "\"sentCount\":" << item.sent_count << ","
            << "\"droppedCount\":" << item.dropped_count << ","
            << "\"skippedCount\":" << item.skipped_count << ","
            << "\"intervalSkippedCount\":" << item.interval_skipped_count << ","
            << "\"oversizedDropCount\":" << item.oversized_drop_count << ","
            << "\"bufferedDropCount\":" << item.buffered_drop_count << ","
            << "\"sendFailureCount\":" << item.send_failure_count << ","
            << "\"lastBufferedAmount\":" << item.last_buffered_amount << ","
            << "\"maxBufferedAmount\":" << item.max_buffered_amount << ","
            << "\"lastMessageBytes\":" << item.last_message_bytes << ","
            << "\"maxMessageBytesObserved\":" << item.max_message_bytes_observed
            << "}";
    }
    out << "],"
        << "\"sentCount\":" << sent_count << ","
        << "\"droppedCount\":" << dropped_count << ","
        << "\"skippedCount\":" << skipped_count << ","
        << "\"intervalSkippedCount\":" << interval_skipped_count << ","
        << "\"oversizedDropCount\":" << oversized_drop_count << ","
        << "\"bufferedDropCount\":" << buffered_drop_count << ","
        << "\"sendFailureCount\":" << send_failure_count << ","
        << "\"maxBufferedAmount\":" << max_buffered_amount
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6256 function
// 다채널 검증과 수동 진단에서 WebRTC session 수와 dedup stream 수를 비교할 수 있게 JSON으로 직렬화한다.
std::string RuntimeStatusJson(const WebRtcMediaApplicationRuntimeStateSnapshot& snapshot,
                              std::size_t http_egress_sessions,
                              std::size_t whip_publish_sessions,
                              const std::vector<WebRtcMediaApplicationMetadataChannelStats>& metadata_channel_stats,
                              int active_sse_metadata_clients,
                              int active_ws_metadata_clients,
                              const std::vector<WebRtcMediaApplicationPublishedSourceSnapshot>& publish_sources,
                              const std::vector<AnalysisSessionApplicationSnapshot>& analysis_taps) {
    const auto profile_documents = ApplicationAnalysisProfileDocumentsSnapshot();
    const auto rule_documents = ApplicationAnalysisRuleDocumentsSnapshot();
    struct ReuseGroupSummary {
        std::string reuse_key;
        std::string tap_id;
        std::string stream_key;
        std::string profile_key;
        std::size_t ref_count{0};
        std::size_t reuse_attach_count{0};
    };
    std::unordered_map<std::string, ReuseGroupSummary> reuse_groups_by_key;
    for (const auto& tap : analysis_taps) {
        const std::string key = tap.reuse_key.empty() ? tap.profile_key : tap.reuse_key;
        auto& group = reuse_groups_by_key[key];
        group.reuse_key = key;
        if (group.tap_id.empty()) {
            group.tap_id = tap.tap_id;
            group.stream_key = tap.stream_key;
            group.profile_key = tap.profile_key;
        }
        group.ref_count += tap.ref_count;
        group.reuse_attach_count += tap.reuse_attach_count;
    }
    std::vector<ReuseGroupSummary> reuse_groups;
    reuse_groups.reserve(reuse_groups_by_key.size());
    for (auto& [_, group] : reuse_groups_by_key) {
        reuse_groups.push_back(std::move(group));
    }
    std::sort(reuse_groups.begin(), reuse_groups.end(), [](const auto& lhs, const auto& rhs) {
        return lhs.reuse_key < rhs.reuse_key;
    });
    const std::size_t active_publish_sources =
        static_cast<std::size_t>(std::count_if(publish_sources.begin(),
                                               publish_sources.end(),
                                               [](const auto& source) { return source.active; }));
    const std::size_t active_metadata_clients =
        static_cast<std::size_t>(std::max(0, active_sse_metadata_clients)) +
        static_cast<std::size_t>(std::max(0, active_ws_metadata_clients));
    const bool source_lifecycle_idle =
        snapshot.active_sessions == 0 &&
        snapshot.resource_active_sessions == 0 &&
        snapshot.resource_active_streams == 0 &&
        snapshot.registry_active_streams == 0 &&
        snapshot.active_analysis_taps == 0 &&
        http_egress_sessions == 0 &&
        whip_publish_sessions == 0 &&
        active_publish_sources == 0 &&
        active_metadata_clients == 0;
    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"sessionManager\":{"
        << "\"activeSessions\":" << snapshot.active_sessions << ","
        << "\"resourceActiveSessions\":" << snapshot.resource_active_sessions << ","
        << "\"resourceActiveStreams\":" << snapshot.resource_active_streams << ","
        << "\"registryActiveStreams\":" << snapshot.registry_active_streams << ","
        << "\"activeAnalysisTaps\":" << snapshot.active_analysis_taps
        << "},"
        << "\"sourceLifecycle\":{"
        << "\"idle\":" << (source_lifecycle_idle ? "true" : "false") << ","
        << "\"activeSessions\":" << snapshot.active_sessions << ","
        << "\"resourceActiveSessions\":" << snapshot.resource_active_sessions << ","
        << "\"resourceActiveStreams\":" << snapshot.resource_active_streams << ","
        << "\"registryActiveStreams\":" << snapshot.registry_active_streams << ","
        << "\"activeAnalysisTaps\":" << snapshot.active_analysis_taps << ","
        << "\"httpEgressSessions\":" << http_egress_sessions << ","
        << "\"whipPublishSessions\":" << whip_publish_sessions << ","
        << "\"activePublishSources\":" << active_publish_sources << ","
        << "\"activeMetadataClients\":" << active_metadata_clients
        << "},"
        << "\"webrtcHttp\":{"
        << "\"egressSessions\":" << http_egress_sessions << ","
        << "\"publishSessions\":" << whip_publish_sessions << ","
        << "\"metadataSideChannel\":{"
        << "\"activeSseClients\":" << active_sse_metadata_clients << ","
        << "\"activeWebSocketClients\":" << active_ws_metadata_clients
        << "},"
        << "\"metadataDataChannel\":" << WebRtcMetadataChannelsJson(metadata_channel_stats) << ","
        << "\"publishSources\":[";
    for (std::size_t i = 0; i < publish_sources.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << "{"
            << "\"sourceId\":\"" << JsonEscape(publish_sources[i].source_id) << "\","
            << "\"active\":" << (publish_sources[i].active ? "true" : "false") << ","
            << "\"hasDescriptor\":" << (publish_sources[i].has_descriptor ? "true" : "false") << ","
            << "\"hasVideo\":" << (publish_sources[i].has_video ? "true" : "false") << ","
            << "\"hasAudio\":" << (publish_sources[i].has_audio ? "true" : "false") << ","
            << "\"subscriberCount\":" << publish_sources[i].subscriber_count
            << "}";
    }
    out << "]"
        << "},"
        << "\"analysisMatching\":{"
        << "\"profileDocumentCount\":" << profile_documents.size() << ","
        << "\"ruleDocumentCount\":" << rule_documents.size() << ","
        << "\"activeTapCount\":" << analysis_taps.size() << ","
        << "\"activeTaps\":[";
    for (std::size_t i = 0; i < analysis_taps.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        const auto& tap = analysis_taps[i];
        out << "{"
            << "\"tapId\":\"" << JsonEscape(tap.tap_id) << "\","
            << "\"streamKey\":\"" << JsonEscape(tap.stream_key) << "\","
            << "\"profileKey\":\"" << JsonEscape(tap.profile_key) << "\","
            << "\"reuseKey\":\"" << JsonEscape(tap.reuse_key) << "\","
            << "\"refCount\":" << tap.ref_count << ","
            << "\"reuseAttachCount\":" << tap.reuse_attach_count << ","
            << "\"lastUsedAgeMs\":" << tap.last_used_age_ms << ","
            << "\"sourceKind\":\"" << JsonEscape(tap.context.source_kind) << "\","
            << "\"route\":\"" << JsonEscape(tap.context.route) << "\","
            << "\"clientId\":\"" << JsonEscape(tap.context.client_id) << "\","
            << "\"profileSelectionSource\":\"" << JsonEscape(tap.profile_selection_source) << "\","
            << "\"selectedRuleId\":\"" << JsonEscape(tap.selected_by_rule_id) << "\","
            << "\"selectedRulePriority\":" << tap.selected_rule_priority << ","
            << "\"selectedRuleSpecificity\":" << tap.selected_rule_specificity << ","
            << "\"trackingPolicy\":{"
            << "\"tracker\":\"" << JsonEscape(tap.tracking_policy_tracker) << "\","
            << "\"effectiveTracker\":\"" << JsonEscape(tap.tracking_policy_effective_tracker) << "\","
            << "\"reid\":\"" << JsonEscape(tap.tracking_policy_reid) << "\","
            << "\"source\":\"" << JsonEscape(tap.tracking_policy_source) << "\","
            << "\"ruleId\":\"" << JsonEscape(tap.tracking_policy_rule_id) << "\","
            << "\"specified\":" << (tap.tracking_policy_specified ? "true" : "false") << ","
            << "\"fallbackReason\":\"" << JsonEscape(tap.tracking_policy_fallback_reason) << "\""
            << "}"
            << "}";
    }
    out << "],"
        << "\"reuseGroupCount\":" << reuse_groups.size() << ","
        << "\"reuseGroups\":[";
    for (std::size_t i = 0; i < reuse_groups.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        const auto& group = reuse_groups[i];
        out << "{"
            << "\"reuseKey\":\"" << JsonEscape(group.reuse_key) << "\","
            << "\"tapId\":\"" << JsonEscape(group.tap_id) << "\","
            << "\"streamKey\":\"" << JsonEscape(group.stream_key) << "\","
            << "\"profileKey\":\"" << JsonEscape(group.profile_key) << "\","
            << "\"refCount\":" << group.ref_count << ","
            << "\"reuseAttachCount\":" << group.reuse_attach_count
            << "}";
    }
    out << "]"
        << "},"
        << "\"debugCounters\":"
        << (GetWebRtcHttpRuntimeConfig().runtime_debug_snapshot_json
                ? GetWebRtcHttpRuntimeConfig().runtime_debug_snapshot_json()
                : "{}")
        << "}";
    return out.str();
}


// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6426 function
// 설정 URI prefix를 브라우저 RTCIceServer urls 형식으로 바꾼다.
bool ConvertConfiguredIceUriToBrowserUrl(const std::string& configured_uri,
                                         const std::string& configured_prefix,
                                         const std::string& browser_prefix,
                                         std::string* rest) {
    if (rest == nullptr || configured_uri.rfind(configured_prefix, 0) != 0) {
        return false;
    }
    *rest = browser_prefix + configured_uri.substr(configured_prefix.size());
    return true;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6438 function
// turn://user:pass@host:port URI를 브라우저가 요구하는 urls/username/credential 필드로 분리한다.
BrowserIceServer BuildTurnIceServerForBrowser(const std::string& turn_uri) {
    BrowserIceServer out;
    std::string browser_url;
    if (!ConvertConfiguredIceUriToBrowserUrl(turn_uri, "turn://", "turn:", &browser_url) &&
        !ConvertConfiguredIceUriToBrowserUrl(turn_uri, "turns://", "turns:", &browser_url)) {
        return out;
    }

    const std::size_t scheme_colon = browser_url.find(':');
    const std::size_t at = browser_url.find('@', scheme_colon == std::string::npos ? 0 : scheme_colon + 1);
    if (at != std::string::npos) {
        const std::string userinfo =
            browser_url.substr((scheme_colon == std::string::npos ? 0 : scheme_colon + 1),
                               at - (scheme_colon == std::string::npos ? 0 : scheme_colon + 1));
        const std::size_t colon = userinfo.find(':');
        if (colon != std::string::npos) {
            out.username = UrlDecode(userinfo.substr(0, colon));
            out.credential = UrlDecode(userinfo.substr(colon + 1));
            out.has_credentials = true;
        } else if (!userinfo.empty()) {
            out.username = UrlDecode(userinfo);
            out.has_credentials = true;
        }
        out.urls = browser_url.substr(0, scheme_colon + 1) + browser_url.substr(at + 1);
        return out;
    }

    out.urls = browser_url;
    return out;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6470 function
// 서버 WebRTC env 설정을 브라우저 RTCPeerConnection 생성 옵션 JSON으로 직렬화한다.
std::string WebRtcBrowserConfigJson() {
    const auto& config = GetWebRtcHttpRuntimeConfig();
    std::vector<BrowserIceServer> servers;
    if (!config.webrtc_stun_server.empty()) {
        BrowserIceServer stun;
        ConvertConfiguredIceUriToBrowserUrl(config.webrtc_stun_server, "stun://", "stun:", &stun.urls);
        if (!stun.urls.empty()) {
            servers.push_back(std::move(stun));
        }
    }
    if (!config.webrtc_turn_server.empty()) {
        BrowserIceServer turn = BuildTurnIceServerForBrowser(config.webrtc_turn_server);
        if (!turn.urls.empty()) {
            servers.push_back(std::move(turn));
        }
    }

    std::ostringstream out;
    out << "{"
        << "\"requestedIceTransportPolicy\":\"" << JsonEscape(config.webrtc_requested_ice_transport_policy) << "\","
        << "\"iceTransportPolicy\":\"" << JsonEscape(config.webrtc_ice_transport_policy) << "\","
        << "\"relayPolicyFallback\":"
        << (config.webrtc_requested_ice_transport_policy == "relay" &&
                    config.webrtc_ice_transport_policy != "relay"
                ? "true"
                : "false")
        << ","
        << "\"hasStun\":" << (!config.webrtc_stun_server.empty() ? "true" : "false") << ","
        << "\"hasTurn\":" << (!config.webrtc_turn_server.empty() ? "true" : "false") << ","
        << "\"peerConnectionConfig\":{"
        << "\"iceTransportPolicy\":\"" << JsonEscape(config.webrtc_ice_transport_policy) << "\","
        << "\"iceServers\":[";
    for (std::size_t i = 0; i < servers.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << "{\"urls\":\"" << JsonEscape(servers[i].urls) << "\"";
        if (servers[i].has_credentials) {
            out << ",\"username\":\"" << JsonEscape(servers[i].username) << "\""
                << ",\"credential\":\"" << JsonEscape(servers[i].credential) << "\"";
        }
        out << "}";
    }
    out << "]}}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6518 function
template <typename Detection>
std::string DetectionJsonValue(const Detection& detection) {
    std::ostringstream out;
    out << "{"
        << "\"classId\":" << detection.class_id << ","
        << "\"label\":\"" << JsonEscape(detection.label) << "\","
        << "\"score\":" << detection.score << ","
        << "\"trackId\":" << detection.track_id << ","
        << "\"box\":{"
        << "\"x\":" << detection.box.x << ","
        << "\"y\":" << detection.box.y << ","
        << "\"width\":" << detection.box.width << ","
        << "\"height\":" << detection.box.height
        << "}";
    if (detection.event_triggered) {
        out << ",\"event\":{"
            << "\"triggered\":true,"
            << "\"ruleId\":\"" << JsonEscape(detection.event_rule_id) << "\","
            << "\"type\":\"" << JsonEscape(detection.event_type) << "\","
            << "\"highlightColor\":\"" << JsonEscape(detection.event_highlight_color) << "\","
            << "\"highlightDurationMs\":" << detection.event_highlight_duration_ms
            << "}";
    }
    out << "}";
    return out.str();
}

std::string DetectionJson(const analysis::Detection& detection) {
    return DetectionJsonValue(detection);
}

std::string DetectionJson(const AnalysisSessionApplicationDetection& detection) {
    return DetectionJsonValue(detection);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6544 function
std::string DetectorDetectionJson(const analysis::Detection& detection) {
    if (!detection.detector_box_available) {
        return DetectionJson(detection);
    }
    analysis::Detection copy = detection;
    copy.box = detection.detector_box;
    return DetectionJson(copy);
}

std::string DetectorDetectionJson(const AnalysisSessionApplicationDetection& detection) {
    if (!detection.detector_box_available) {
        return DetectionJson(detection);
    }
    AnalysisSessionApplicationDetection copy = detection;
    copy.box = detection.detector_box;
    return DetectionJson(copy);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6553 function
template <typename Diagnostic>
std::string CloseObjectAssociationDiagnosticJsonValue(const Diagnostic& diagnostic) {
    const bool close_object_guard_applied =
        diagnostic.mode == "enforce" && diagnostic.ranking_score != diagnostic.candidate_score;
    std::ostringstream out;
    out << "{"
        << "\"trackId\":" << diagnostic.track_id << ","
        << "\"detectionIndex\":" << diagnostic.detection_index << ","
        << "\"classId\":" << diagnostic.class_id << ","
        << "\"className\":\"" << JsonEscape(diagnostic.class_name) << "\","
        << "\"mode\":\"" << JsonEscape(diagnostic.mode) << "\","
        << "\"closeObjectRisk\":" << diagnostic.close_object_risk << ","
        << "\"nearestSameClassTrackId\":" << diagnostic.nearest_same_class_track_id << ","
        << "\"nearestSameClassDistance\":";
    if (diagnostic.nearest_same_class_distance_available) {
        out << diagnostic.nearest_same_class_distance;
    } else {
        out << "null";
    }
    out << ","
        << "\"candidateScore\":" << diagnostic.candidate_score << ","
        << "\"rankingScore\":" << diagnostic.ranking_score << ","
        << "\"bestScore\":" << diagnostic.best_score << ","
        << "\"secondScore\":" << diagnostic.second_score << ","
        << "\"scoreMargin\":" << diagnostic.score_margin << ","
        << "\"centerJump\":" << diagnostic.center_jump << ","
        << "\"directionConflict\":" << (diagnostic.direction_conflict ? "true" : "false") << ","
        << "\"wouldPenalize\":" << (diagnostic.would_penalize ? "true" : "false") << ","
        << "\"wouldHoldReacquire\":" << (diagnostic.would_hold_reacquire ? "true" : "false") << ","
        << "\"closeObjectGuardApplied\":" << (close_object_guard_applied ? "true" : "false") << ","
        << "\"matched\":" << (diagnostic.matched ? "true" : "false") << ","
        << "\"rejected\":" << (diagnostic.rejected ? "true" : "false") << ","
        << "\"guardDecision\":\"" << JsonEscape(diagnostic.guard_decision) << "\""
        << "}";
    return out.str();
}

std::string CloseObjectAssociationDiagnosticJson(
    const analysis::CloseObjectAssociationDiagnostic& diagnostic) {
    return CloseObjectAssociationDiagnosticJsonValue(diagnostic);
}

std::string CloseObjectAssociationDiagnosticJson(
    const AnalysisSessionApplicationCloseObjectDiagnostic& diagnostic) {
    return CloseObjectAssociationDiagnosticJsonValue(diagnostic);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6590 function
std::string CloseObjectGuardModeJson() {
    const auto& config = GetWebRtcHttpRuntimeConfig();
    const auto projection =
        ProjectCloseObjectGuardForApplication(config.analysis_tracking_close_object_guard_mode);
    std::ostringstream out;
    out << "{"
        << "\"mode\":\"" << JsonEscape(projection.mode) << "\","
        << "\"label\":\"" << JsonEscape(projection.label) << "\","
        << "\"scoreMutationEnabled\":" << (projection.score_mutation_enabled ? "true" : "false")
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6610 function
template <typename Line>
std::string AnalysisDebugLineStateJsonValue(const Line& line) {
    std::ostringstream out;
    out << "{"
        << "\"lineId\":\"" << JsonEscape(line.line_id) << "\","
        << "\"allowedDirection\":\"" << JsonEscape(line.allowed_direction) << "\","
        << "\"previousSide\":" << line.previous_side << ","
        << "\"currentSide\":" << line.current_side << ","
        << "\"crossed\":" << (line.crossed ? "true" : "false") << ","
        << "\"direction\":\"" << JsonEscape(line.direction) << "\","
        << "\"rawCrossed\":" << (line.raw_crossed ? "true" : "false") << ","
        << "\"rawDirection\":\"" << JsonEscape(line.raw_direction) << "\","
        << "\"directionAllowed\":" << (line.direction_allowed ? "true" : "false") << ","
        << "\"lastCrossTimeMs\":" << line.last_cross_time_ms
        << "}";
    return out.str();
}

std::string AnalysisDebugLineStateJson(const analysis::AnalysisDebugLineState& line) {
    return AnalysisDebugLineStateJsonValue(line);
}

std::string AnalysisDebugLineStateJson(const AnalysisSessionApplicationDebugLineState& line) {
    return AnalysisDebugLineStateJsonValue(line);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6627 function
template <typename Track>
std::string AnalysisDebugTrackStateJsonValue(const Track& track) {
    std::ostringstream out;
    out << "{"
        << "\"streamId\":\"" << JsonEscape(track.stream_id) << "\","
        << "\"channelId\":\"" << JsonEscape(track.channel_id) << "\","
        << "\"trackId\":" << track.track_id << ","
        << "\"classId\":" << track.class_id << ","
        << "\"className\":\"" << JsonEscape(track.class_name) << "\","
        << "\"confidence\":" << track.confidence << ","
        << "\"bbox\":{"
        << "\"x\":" << track.bbox.x << ","
        << "\"y\":" << track.bbox.y << ","
        << "\"width\":" << track.bbox.width << ","
        << "\"height\":" << track.bbox.height
        << "},"
        << "\"speed\":{"
        << "\"value\":" << track.speed << ","
        << "\"usesGroundPlane\":" << (track.speed_uses_ground_plane ? "true" : "false") << ","
        << "\"units\":\"" << JsonEscape(track.speed_units) << "\""
        << "}";
    if (track.ground_point_available) {
        out << ",\"footPoint\":{"
            << "\"x\":" << track.foot_point_x << ","
            << "\"y\":" << track.foot_point_y
            << "},"
            << "\"groundPoint\":{"
            << "\"x\":" << track.ground_point_x << ","
            << "\"y\":" << track.ground_point_y << ","
            << "\"valid\":" << (track.ground_point_valid ? "true" : "false") << ","
            << "\"fallbackToImage\":" << (track.ground_point_fallback ? "true" : "false") << ","
            << "\"units\":\"" << JsonEscape(track.ground_point_units) << "\""
            << "}";
    }
    out << ","
        << "\"lifecycleState\":\"" << JsonEscape(track.lifecycle_state) << "\","
        << "\"zoneState\":{"
        << "\"currentZone\":\"" << JsonEscape(track.current_zone) << "\","
        << "\"previousZone\":\"" << JsonEscape(track.previous_zone) << "\","
        << "\"enteredAtMs\":" << track.entered_at_ms << ","
        << "\"exitedAtMs\":" << track.exited_at_ms << ","
        << "\"dwellTimeMs\":" << track.dwell_time_ms << ","
        << "\"insideRestrictedZone\":" << (track.inside_restricted_zone ? "true" : "false")
        << "},"
        << "\"lineStates\":[";
    for (std::size_t i = 0; i < track.line_states.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << AnalysisDebugLineStateJson(track.line_states[i]);
    }
    out << "],"
        << "\"scenarioName\":\"" << JsonEscape(track.scenario_name) << "\","
        << "\"scenarioPhase\":\"" << JsonEscape(track.scenario_phase) << "\","
        << "\"eventLifecycle\":\"" << JsonEscape(track.event_lifecycle) << "\","
        << "\"trackHealth\":{"
        << "\"status\":\"" << JsonEscape(track.track_health) << "\","
        << "\"stable\":" << (!track.track_unstable ? "true" : "false") << ","
        << "\"associationConfidence\":" << track.association_confidence << ","
        << "\"missedFrameCount\":" << track.missed_frame_count << ","
        << "\"overlapRisk\":" << track.overlap_risk << ","
        << "\"directionChangeCount\":" << track.direction_change_count
        << "}"
        << "}";
    return out.str();
}

std::string AnalysisDebugTrackStateJson(const analysis::AnalysisDebugTrackState& track) {
    return AnalysisDebugTrackStateJsonValue(track);
}

std::string AnalysisDebugTrackStateJson(const AnalysisSessionApplicationDebugTrackState& track) {
    return AnalysisDebugTrackStateJsonValue(track);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6693 function
void AppendNullableInt64Json(std::ostringstream& out, std::int64_t value) {
    if (value < 0) {
        out << "null";
    } else {
        out << value;
    }
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6701 function
template <typename Timeline>
std::string AnalysisDebugScenarioTimelineJsonValue(const Timeline& item) {
    std::ostringstream out;
    out << "{"
        << "\"instanceKey\":\"" << JsonEscape(item.instance_key) << "\","
        << "\"streamId\":\"" << JsonEscape(item.stream_id) << "\","
        << "\"channelId\":\"" << JsonEscape(item.channel_id) << "\","
        << "\"ruleId\":\"" << JsonEscape(item.rule_id) << "\","
        << "\"scenarioKey\":\"" << JsonEscape(item.scenario_key) << "\","
        << "\"scenarioName\":\"" << JsonEscape(item.scenario_name) << "\","
        << "\"trackId\":" << item.track_id << ","
        << "\"classId\":" << item.class_id << ","
        << "\"className\":\"" << JsonEscape(item.class_name) << "\","
        << "\"zoneId\":\"" << JsonEscape(item.zone_id) << "\","
        << "\"lineId\":\"" << JsonEscape(item.line_id) << "\","
        << "\"currentPhase\":\"" << JsonEscape(item.current_phase) << "\","
        << "\"previousPhase\":\"" << JsonEscape(item.previous_phase) << "\","
        << "\"phaseEnteredAtMs\":";
    AppendNullableInt64Json(out, item.phase_entered_at_ms);
    out << ",\"phaseElapsedMs\":";
    AppendNullableInt64Json(out, item.phase_elapsed_ms);
    out << ",\"trackFirstSeenAtMs\":";
    AppendNullableInt64Json(out, item.track_first_seen_at_ms);
    out << ",\"trackLastSeenAtMs\":";
    AppendNullableInt64Json(out, item.track_last_seen_at_ms);
    out << ",\"zoneEnteredAtMs\":";
    AppendNullableInt64Json(out, item.zone_entered_at_ms);
    out << ",\"lineCrossedAtMs\":";
    AppendNullableInt64Json(out, item.line_crossed_at_ms);
    out << ",\"eventEmittedAtMs\":";
    AppendNullableInt64Json(out, item.event_emitted_at_ms);
    out << ",\"cooldownStartedAtMs\":";
    AppendNullableInt64Json(out, item.cooldown_started_at_ms);
    out << ",\"cooldownEndsAtMs\":";
    AppendNullableInt64Json(out, item.cooldown_ends_at_ms);
    out << ",\"cooldownRemainingMs\":";
    AppendNullableInt64Json(out, item.cooldown_remaining_ms);
    out << ",\"lastEventId\":\"" << JsonEscape(item.last_event_id) << "\","
        << "\"lastEventStatus\":\"" << JsonEscape(item.last_event_status) << "\","
        << "\"dedupeKey\":\"" << JsonEscape(item.dedupe_key) << "\","
        << "\"eventEmittedCount\":" << item.event_emitted_count << ","
        << "\"dedupeSuppressedCount\":" << item.dedupe_suppressed_count << ","
        << "\"active\":" << (item.active ? "true" : "false")
        << "}";
    return out.str();
}

std::string AnalysisDebugScenarioTimelineJson(
    const analysis::AnalysisDebugScenarioTimeline& item) {
    return AnalysisDebugScenarioTimelineJsonValue(item);
}

std::string AnalysisDebugScenarioTimelineJson(
    const AnalysisSessionApplicationDebugScenarioTimeline& item) {
    return AnalysisDebugScenarioTimelineJsonValue(item);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6748 function
template <typename DebugState>
std::string AnalysisDebugStateJsonValue(const std::optional<DebugState>& debug_state) {
    if (!debug_state.has_value()) {
        return "null";
    }
    const auto& debug = *debug_state;
    std::ostringstream out;
    out << "{"
        << "\"enabled\":" << (debug.enabled ? "true" : "false") << ","
        << "\"streamId\":\"" << JsonEscape(debug.stream_id) << "\","
        << "\"channelId\":\"" << JsonEscape(debug.channel_id) << "\","
        << "\"timestampMs\":" << debug.timestamp_ms << ","
        << "\"counts\":{"
        << "\"tracks\":" << debug.track_count << ","
        << "\"activeTracks\":" << debug.active_track_count << ","
        << "\"lostTracks\":" << debug.lost_track_count << ","
        << "\"reacquiredTracks\":" << debug.reacquired_track_count << ","
        << "\"terminatedTracks\":" << debug.terminated_track_count << ","
        << "\"scenarioInstances\":" << debug.scenario_instance_count << ","
        << "\"activeScenarios\":" << debug.active_scenario_count << ","
        << "\"eventStates\":" << debug.event_state_count << ","
        << "\"activeEventStates\":" << debug.active_event_state_count
        << "},"
        << "\"tracks\":[";
    for (std::size_t i = 0; i < debug.tracks.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << AnalysisDebugTrackStateJson(debug.tracks[i]);
    }
    out << "],\"scenarioTimeline\":[";
    for (std::size_t i = 0; i < debug.scenario_timeline.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << AnalysisDebugScenarioTimelineJson(debug.scenario_timeline[i]);
    }
    out << "]}";
    return out.str();
}

std::string AnalysisDebugStateJson(const std::optional<analysis::AnalysisDebugState>& debug_state) {
    return AnalysisDebugStateJsonValue(debug_state);
}

std::string AnalysisDebugStateJson(
    const std::optional<AnalysisSessionApplicationDebugState>& debug_state) {
    return AnalysisDebugStateJsonValue(debug_state);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6788 function
template <typename Metrics>
std::string TrackHealthMetricsJsonValue(const Metrics& metrics) {
    std::ostringstream out;
    out << "{"
        << "\"unstableTrackCount\":" << metrics.unstable_track_count << ","
        << "\"overlapRiskTrackCount\":" << metrics.overlap_risk_track_count << ","
        << "\"missedFrameTrackCount\":" << metrics.missed_frame_track_count << ","
        << "\"missedFrameTotal\":" << metrics.missed_frame_total << ","
        << "\"missedFrameMax\":" << metrics.missed_frame_max << ","
        << "\"directionChangeTrackCount\":" << metrics.direction_change_track_count << ","
        << "\"directionChangeTotal\":" << metrics.direction_change_total << ","
        << "\"directionChangeMax\":" << metrics.direction_change_max
        << "}";
    return out.str();
}

std::string TrackHealthMetricsJson(const analysis::TrackHealthMetrics& metrics) {
    return TrackHealthMetricsJsonValue(metrics);
}

std::string TrackHealthMetricsJson(const AnalysisSessionApplicationMetricsTrackHealth& metrics) {
    return TrackHealthMetricsJsonValue(metrics);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6803 function
template <typename Channel>
std::string AnalysisChannelMetricsJsonValue(const Channel& channel) {
    std::ostringstream out;
    out << "{"
        << "\"streamId\":\"" << JsonEscape(channel.stream_id) << "\","
        << "\"channelId\":\"" << JsonEscape(channel.channel_id) << "\","
        << "\"trackState\":{"
        << "\"totalTracks\":" << channel.total_track_count << ","
        << "\"activeTracks\":" << channel.active_track_count << ","
        << "\"lostTracks\":" << channel.lost_track_count << ","
        << "\"reacquiredTracks\":" << channel.reacquired_track_count << ","
        << "\"terminatedTracks\":" << channel.terminated_track_count
        << "},"
        << "\"scenarioState\":{"
        << "\"activeScenarios\":" << channel.active_scenario_count
        << "},"
        << "\"eventState\":{"
        << "\"eventStates\":" << channel.event_state_count << ","
        << "\"activeEventStates\":" << channel.active_event_state_count << ","
        << "\"eventsEmitted\":" << channel.event_emitted_count << ","
        << "\"eventsDeduped\":" << channel.event_dedup_count
        << "},"
        << "\"trackHealth\":" << TrackHealthMetricsJson(channel.track_health)
        << "}";
    return out.str();
}

std::string AnalysisChannelMetricsJson(const analysis::AnalysisChannelMetrics& channel) {
    return AnalysisChannelMetricsJsonValue(channel);
}

std::string AnalysisChannelMetricsJson(const AnalysisSessionApplicationMetricsChannel& channel) {
    return AnalysisChannelMetricsJsonValue(channel);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6829 function
template <typename Report>
std::string AnalysisMetricsReportJsonValue(const std::optional<Report>& report) {
    if (!report.has_value()) {
        return "null";
    }
    const auto& metrics = *report;
    std::ostringstream out;
    out << "{"
        << "\"enabled\":" << (metrics.enabled ? "true" : "false") << ","
        << "\"streamId\":\"" << JsonEscape(metrics.stream_id) << "\","
        << "\"channelId\":\"" << JsonEscape(metrics.channel_id) << "\","
        << "\"timestampMs\":" << metrics.timestamp_ms << ","
        << "\"channelCount\":" << metrics.channel_count << ","
        << "\"trackState\":{"
        << "\"totalTracks\":" << metrics.total_track_count << ","
        << "\"activeTracks\":" << metrics.active_track_count << ","
        << "\"lostTracks\":" << metrics.lost_track_count << ","
        << "\"reacquiredTracks\":" << metrics.reacquired_track_count << ","
        << "\"terminatedTracks\":" << metrics.terminated_track_count << ","
        << "\"terminatedTrackCleanupCount\":" << metrics.terminated_track_cleanup_count
        << "},"
        << "\"scenarioState\":{"
        << "\"activeScenarios\":" << metrics.active_scenario_count << ","
        << "\"scenarioCleanupCount\":" << metrics.scenario_cleanup_count
        << "},"
        << "\"eventState\":{"
        << "\"activeEventStates\":" << metrics.active_event_state_count << ","
        << "\"eventsEmitted\":" << metrics.event_emitted_count << ","
        << "\"eventsDeduped\":" << metrics.event_dedup_count << ","
        << "\"eventCleanupCount\":" << metrics.event_cleanup_count
        << "},"
        << "\"trackHealth\":" << TrackHealthMetricsJson(metrics.track_health)
        << ",\"channels\":[";
    for (std::size_t i = 0; i < metrics.channels.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << AnalysisChannelMetricsJson(metrics.channels[i]);
    }
    out << "]}";
    return out.str();
}

std::string AnalysisMetricsReportJson(const std::optional<analysis::AnalysisMetricsReport>& report) {
    return AnalysisMetricsReportJsonValue(report);
}

std::string AnalysisMetricsReportJson(
    const std::optional<AnalysisSessionApplicationMetrics>& report) {
    return AnalysisMetricsReportJsonValue(report);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6871 function
template <typename Track>
std::string TrackJsonValue(const Track& track) {
    std::ostringstream out;
    out << "{"
        << "\"trackId\":" << track.track_id << ","
        << "\"classId\":" << track.detection.class_id << ","
        << "\"label\":\"" << JsonEscape(track.detection.label) << "\","
        << "\"score\":" << track.detection.score << ","
        << "\"age\":" << track.age << ","
        << "\"hits\":" << track.hits << ","
        << "\"missed\":" << track.missed << ","
        << "\"state\":\"" << JsonEscape(track.state) << "\","
        << "\"firstSeenPts\":" << track.first_seen_pts << ","
        << "\"lastSeenPts\":" << track.last_seen_pts << ","
        << "\"trail\":[";
    for (std::size_t i = 0; i < track.trail.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << "{"
            << "\"x\":" << track.trail[i].x << ","
            << "\"y\":" << track.trail[i].y << ","
            << "\"pts\":" << track.trail[i].pts
            << "}";
    }
    out << "],"
        << "\"box\":{"
        << "\"x\":" << track.detection.box.x << ","
        << "\"y\":" << track.detection.box.y << ","
        << "\"width\":" << track.detection.box.width << ","
        << "\"height\":" << track.detection.box.height
        << "}}";
    return out.str();
}

std::string TrackJson(const analysis::Track& track) {
    return TrackJsonValue(track);
}

std::string TrackJson(const AnalysisSessionApplicationTrack& track) {
    return TrackJsonValue(track);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6905 function
template <typename Result>
std::string AnalysisResultJsonValue(const Result& result) {
    std::ostringstream out;
    out << "{"
        << "\"sourceKey\":\"" << JsonEscape(result.source_key) << "\","
        << "\"profileKey\":\"" << JsonEscape(result.profile_key) << "\","
        << "\"context\":{"
        << "\"sourceKind\":\"" << JsonEscape(result.context.source_kind) << "\","
        << "\"route\":\"" << JsonEscape(result.context.route) << "\","
        << "\"clientId\":\"" << JsonEscape(result.context.client_id) << "\""
        << "},"
        << "\"pts\":" << result.pts << ","
        << "\"detections\":[";
    for (std::size_t i = 0; i < result.detections.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << DetectionJson(result.detections[i]);
    }
    out << "],"
        << "\"trackCount\":" << result.tracks.size() << ","
        << "\"tracks\":[";
    for (std::size_t i = 0; i < result.tracks.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << TrackJson(result.tracks[i]);
    }
    out << "],"
        << "\"poseKeypoints\":" << result.pose_keypoints.size();
    if (result.debug_state.has_value()) {
        out << ",\"debugState\":" << AnalysisDebugStateJson(result.debug_state);
    }
    if (result.metrics_report.has_value()) {
        out << ",\"metricsReport\":" << AnalysisMetricsReportJson(result.metrics_report);
    }
    out << "}";
    return out.str();
}


std::string AnalysisResultJson(const analysis::AnalysisResult& result) {
    return AnalysisResultJsonValue(result);
}

std::string AnalysisResultJson(const AnalysisSessionApplicationResult& result) {
    return AnalysisResultJsonValue(result);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6944 function
std::string AnalysisTapSnapshotJson(const AnalysisSessionApplicationSnapshot& snapshot) {
    const auto& appearance_stats = snapshot.track_state_metrics.appearance_extractor_stats;
    std::ostringstream out;
    out << "{"
        << "\"tapId\":\"" << JsonEscape(snapshot.tap_id) << "\","
        << "\"streamKey\":\"" << JsonEscape(snapshot.stream_key) << "\","
        << "\"profileKey\":\"" << JsonEscape(snapshot.profile_key) << "\","
        << "\"reuseKey\":\"" << JsonEscape(snapshot.reuse_key) << "\","
        << "\"refCount\":" << snapshot.ref_count << ","
        << "\"reuseAttachCount\":" << snapshot.reuse_attach_count << ","
        << "\"lastUsedAgeMs\":" << snapshot.last_used_age_ms << ","
        << "\"context\":{"
        << "\"sourceKind\":\"" << JsonEscape(snapshot.context.source_kind) << "\","
        << "\"route\":\"" << JsonEscape(snapshot.context.route) << "\","
        << "\"clientId\":\"" << JsonEscape(snapshot.context.client_id) << "\""
        << "},"
        << "\"profileSelection\":{"
        << "\"source\":\"" << JsonEscape(snapshot.profile_selection_source) << "\","
        << "\"ruleId\":\"" << JsonEscape(snapshot.selected_by_rule_id) << "\","
        << "\"priority\":" << snapshot.selected_rule_priority << ","
        << "\"specificity\":" << snapshot.selected_rule_specificity
        << "},"
        << "\"detectorType\":\"" << JsonEscape(snapshot.detector_type) << "\","
        << "\"targetFps\":" << snapshot.target_fps << ","
        << "\"maxQueueSize\":" << snapshot.max_queue_size << ","
        << "\"frameSampleInterval\":" << snapshot.frame_sample_interval << ","
        << "\"maxFrameAgeMs\":" << snapshot.max_frame_age_ms << ","
        << "\"modelInputWidth\":" << snapshot.model_input_width << ","
        << "\"modelInputHeight\":" << snapshot.model_input_height << ","
        << "\"debugDetectorDelayMs\":" << snapshot.debug_detector_delay_ms << ","
        << "\"confidenceThreshold\":" << snapshot.confidence_threshold << ","
        << "\"nmsThreshold\":" << snapshot.nms_threshold << ","
        << "\"trackingEnabled\":" << (snapshot.tracking_enabled ? "true" : "false") << ","
        << "\"trackingPolicy\":{"
        << "\"tracker\":\"" << JsonEscape(snapshot.tracking_policy_tracker) << "\","
        << "\"effectiveTracker\":\"" << JsonEscape(snapshot.tracking_policy_effective_tracker) << "\","
        << "\"reid\":\"" << JsonEscape(snapshot.tracking_policy_reid) << "\","
        << "\"source\":\"" << JsonEscape(snapshot.tracking_policy_source) << "\","
        << "\"ruleId\":\"" << JsonEscape(snapshot.tracking_policy_rule_id) << "\","
        << "\"specified\":" << (snapshot.tracking_policy_specified ? "true" : "false") << ","
        << "\"fallbackReason\":\"" << JsonEscape(snapshot.tracking_policy_fallback_reason) << "\""
        << "},"
        << "\"trackingClassLabels\":[";
    for (std::size_t i = 0; i < snapshot.tracking_class_labels.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << "\"" << JsonEscape(snapshot.tracking_class_labels[i]) << "\"";
    }
    out << "],"
        << "\"analyticsState\":{"
        << "\"trackState\":{"
        << "\"channelCount\":" << snapshot.track_state_metrics.channel_count << ","
        << "\"totalTracks\":" << snapshot.track_state_metrics.total_tracks << ","
        << "\"activeTracks\":" << snapshot.track_state_metrics.active_tracks << ","
        << "\"lostTracks\":" << snapshot.track_state_metrics.lost_tracks << ","
        << "\"reacquiredTracks\":" << snapshot.track_state_metrics.reacquired_tracks << ","
        << "\"terminatedTracks\":" << snapshot.track_state_metrics.terminated_tracks << ","
        << "\"totalObservations\":" << snapshot.track_state_metrics.total_observations << ","
        << "\"totalTrajectoryPoints\":" << snapshot.track_state_metrics.total_trajectory_points << ","
        << "\"appearanceProfiles\":" << snapshot.track_state_metrics.appearance_profile_count << ","
        << "\"appearanceExtractor\":{"
        << "\"enabled\":" << (appearance_stats.enabled ? "true" : "false") << ","
        << "\"name\":\"" << JsonEscape(appearance_stats.extractor_name) << "\","
        << "\"requests\":" << appearance_stats.request_count << ","
        << "\"queued\":" << appearance_stats.queued_count << ","
        << "\"completed\":" << appearance_stats.completed_count << ","
        << "\"failed\":" << appearance_stats.failed_count << ","
        << "\"dropped\":" << appearance_stats.dropped_count << ","
        << "\"missingCrop\":" << appearance_stats.missing_crop_count << ","
        << "\"busyDrops\":" << appearance_stats.busy_drop_count << ","
        << "\"queueFullDrops\":" << appearance_stats.queue_full_drop_count << ","
        << "\"globalQueueDrops\":" << appearance_stats.global_queue_drop_count << ","
        << "\"rateLimited\":" << appearance_stats.rate_limited_count << ","
        << "\"staleDrops\":" << appearance_stats.stale_drop_count << ","
        << "\"lastQueueLatencyMs\":" << appearance_stats.last_queue_latency_ms << ","
        << "\"maxQueueLatencyMs\":" << appearance_stats.max_queue_latency_ms << ","
        << "\"lastInferenceMs\":" << appearance_stats.last_inference_time_ms << ","
        << "\"maxInferenceMs\":" << appearance_stats.max_inference_time_ms << ","
        << "\"lastError\":\"" << JsonEscape(appearance_stats.last_error) << "\""
        << "},"
        << "\"maxActiveTracksPerChannel\":"
        << snapshot.track_state_metrics.max_active_tracks_per_channel << ","
        << "\"maxTracksPerChannel\":" << snapshot.track_state_metrics.max_tracks_per_channel << ","
        << "\"maxObservationHistory\":"
        << snapshot.track_state_metrics.max_observation_history << ","
        << "\"maxTrajectoryPointsPerTrack\":"
        << snapshot.track_state_metrics.max_trajectory_points_per_track << ","
        << "\"cleanupRuns\":" << snapshot.track_state_metrics.cleanup_runs << ","
        << "\"tracksRemovedByCleanup\":"
        << snapshot.track_state_metrics.tracks_removed_by_cleanup << ","
        << "\"lastCleanupTimeMs\":" << snapshot.track_state_metrics.last_cleanup_time_ms
        << "}},"
        << "\"adaptiveTuningEnabled\":" << (snapshot.adaptive_tuning_enabled ? "true" : "false") << ","
        << "\"adaptiveInputSizeEnabled\":" << (snapshot.adaptive_input_size_enabled ? "true" : "false") << ","
        << "\"adaptiveInputSizeDisabled\":" << (snapshot.adaptive_input_size_disabled ? "true" : "false") << ","
        << "\"adaptiveMinFps\":" << snapshot.adaptive_min_fps << ","
        << "\"adaptiveMaxFps\":" << snapshot.adaptive_max_fps << ","
        << "\"adaptiveMinInputWidth\":" << snapshot.adaptive_min_input_width << ","
        << "\"adaptiveMinInputHeight\":" << snapshot.adaptive_min_input_height << ","
        << "\"adaptiveMaxInputWidth\":" << snapshot.adaptive_max_input_width << ","
        << "\"adaptiveMaxInputHeight\":" << snapshot.adaptive_max_input_height << ","
        << "\"adaptiveDownshiftCount\":" << snapshot.adaptive_downshift_count << ","
        << "\"adaptiveUpshiftCount\":" << snapshot.adaptive_upshift_count << ","
        << "\"adaptiveState\":\"" << JsonEscape(snapshot.adaptive_state) << "\","
        << "\"receivedVideoPackets\":" << snapshot.received_video_packets << ","
        << "\"decodedFrames\":" << snapshot.decoded_frames << ","
        << "\"sampledFrames\":" << snapshot.sampled_frames << ","
        << "\"analyzedPackets\":" << snapshot.analyzed_packets << ","
        << "\"droppedPackets\":" << snapshot.dropped_packets << ","
        << "\"sampleDroppedFrames\":" << snapshot.sample_dropped_frames << ","
        << "\"queueDroppedFrames\":" << snapshot.queue_dropped_frames << ","
        << "\"sampleIntervalDroppedFrames\":" << snapshot.sample_interval_dropped_frames << ","
        << "\"staleQueueDroppedFrames\":" << snapshot.stale_queue_dropped_frames << ","
        << "\"decoderErrors\":" << snapshot.decoder_errors << ","
        << "\"pendingFrames\":" << snapshot.pending_frames << ","
        << "\"peakPendingFrames\":" << snapshot.peak_pending_frames << ","
        << "\"effectiveDecodedFps\":" << snapshot.effective_decoded_fps << ","
        << "\"effectiveSampledFps\":" << snapshot.effective_sampled_fps << ","
        << "\"effectiveAnalyzedFps\":" << snapshot.effective_analyzed_fps << ","
        << "\"lastQueueWaitMs\":" << snapshot.last_queue_wait_ms << ","
        << "\"averageQueueWaitMs\":" << snapshot.average_queue_wait_ms << ","
        << "\"maxQueueWaitMs\":" << snapshot.max_queue_wait_ms << ","
        << "\"lastAnalysisMs\":" << snapshot.last_analysis_ms << ","
        << "\"averageAnalysisMs\":" << snapshot.average_analysis_ms << ","
        << "\"maxAnalysisMs\":" << snapshot.max_analysis_ms << ","
        << "\"lastInferenceMs\":" << snapshot.last_inference_ms << ","
        << "\"averageInferenceMs\":" << snapshot.average_inference_ms << ","
        << "\"maxInferenceMs\":" << snapshot.max_inference_ms << ","
        << "\"analyticsQueue\":{"
        << "\"pending\":" << snapshot.pending_frames << ","
        << "\"capacity\":" << snapshot.max_queue_size << ","
        << "\"peakPending\":" << snapshot.peak_pending_frames << ","
        << "\"dropOldest\":" << snapshot.queue_dropped_frames << ","
        << "\"staleDrops\":" << snapshot.stale_queue_dropped_frames << ","
        << "\"sampleIntervalDrops\":" << snapshot.sample_interval_dropped_frames << ","
        << "\"sampleDrops\":" << snapshot.sample_dropped_frames << ","
        << "\"lastWaitMs\":" << snapshot.last_queue_wait_ms << ","
        << "\"averageWaitMs\":" << snapshot.average_queue_wait_ms << ","
        << "\"maxWaitMs\":" << snapshot.max_queue_wait_ms
        << "},"
        << "\"hasLatestFrame\":" << (snapshot.has_latest_frame ? "true" : "false") << ","
        << "\"latestFrameWidth\":" << snapshot.latest_frame_width << ","
        << "\"latestFrameHeight\":" << snapshot.latest_frame_height << ","
        << "\"latestFramePts\":" << snapshot.latest_frame_pts << ","
        << "\"hasResult\":" << (snapshot.latest_result.has_value() ? "true" : "false") << ","
        << "\"latestResult\":";
    if (snapshot.latest_result.has_value()) {
        out << AnalysisResultJson(*snapshot.latest_result);
    } else {
        out << "null";
    }
    out << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7100 function
template <typename Result>
std::string AnalysisMetadataJsonValue(const std::string& tap_id,
                                      const std::optional<Result>& result) {
    std::ostringstream out;
    out << "{"
        << "\"tapId\":\"" << JsonEscape(tap_id) << "\","
        << "\"hasResult\":" << (result.has_value() ? "true" : "false") << ","
        << "\"result\":";
    if (result.has_value()) {
        out << AnalysisResultJson(*result);
    } else {
        out << "null";
    }
    out << "}";
    return out.str();
}

std::string AnalysisMetadataJson(const std::string& tap_id,
                                 const std::optional<analysis::AnalysisResult>& result) {
    return AnalysisMetadataJsonValue(tap_id, result);
}

std::string AnalysisMetadataJson(
    const std::string& tap_id,
    const std::optional<AnalysisSessionApplicationResult>& result) {
    return AnalysisMetadataJsonValue(tap_id, result);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7116 function
template <typename Result>
std::string AnalysisBboxDiagnosticsJsonValue(const std::string& tap_id,
                                             std::int64_t requested_pts_ms,
                                             std::int64_t tolerance_ms,
                                             const std::optional<Result>& result) {
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.lab.bbox-diagnostics.v1\","
        << "\"tapId\":\"" << JsonEscape(tap_id) << "\","
        << "\"requestedPtsMs\":" << requested_pts_ms << ","
        << "\"toleranceMs\":" << tolerance_ms << ","
        << "\"matched\":" << (result.has_value() ? "true" : "false") << ",";
    if (result.has_value()) {
        const std::int64_t matched_pts_ms = result->pts / 1000000LL;
        const std::int64_t delta_ms =
            matched_pts_ms >= requested_pts_ms ? matched_pts_ms - requested_pts_ms : requested_pts_ms - matched_pts_ms;
        out << "\"matchedPtsMs\":" << matched_pts_ms << ","
            << "\"matchedDeltaMs\":" << delta_ms << ","
            << "\"detectorDetections\":[";
        for (std::size_t i = 0; i < result->detections.size(); ++i) {
            if (i != 0) {
                out << ",";
            }
            out << DetectorDetectionJson(result->detections[i]);
        }
        out << "],"
            << "\"closeObjectGuard\":" << CloseObjectGuardModeJson() << ","
            << "\"closeObjectDiagnostics\":[";
        for (std::size_t i = 0; i < result->close_object_diagnostics.size(); ++i) {
            if (i != 0) {
                out << ",";
            }
            out << CloseObjectAssociationDiagnosticJson(result->close_object_diagnostics[i]);
        }
        out << "],"
            << "\"result\":" << AnalysisResultJson(*result);
    } else {
        out << "\"matchedPtsMs\":null,"
            << "\"matchedDeltaMs\":null,"
            << "\"detectorDetections\":[],"
            << "\"closeObjectGuard\":" << CloseObjectGuardModeJson() << ","
            << "\"closeObjectDiagnostics\":[],"
            << "\"result\":null";
    }
    out << "}";
    return out.str();
}

std::string AnalysisBboxDiagnosticsJson(const std::string& tap_id,
                                        std::int64_t requested_pts_ms,
                                        std::int64_t tolerance_ms,
                                        const std::optional<analysis::AnalysisResult>& result) {
    return AnalysisBboxDiagnosticsJsonValue(tap_id, requested_pts_ms, tolerance_ms, result);
}

std::string AnalysisBboxDiagnosticsJson(
    const std::string& tap_id,
    std::int64_t requested_pts_ms,
    std::int64_t tolerance_ms,
    const std::optional<AnalysisSessionApplicationResult>& result) {
    return AnalysisBboxDiagnosticsJsonValue(tap_id, requested_pts_ms, tolerance_ms, result);
}

bool SendAll(int fd, const std::string& data);
void SuppressSocketSigPipe(int fd);
// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7184 function
std::vector<std::string> ParseVaMetadataStringList(std::string value) {
    std::vector<std::string> values;
    std::string current;
    for (const char ch : value) {
        if (ch == ',' || ch == ';') {
            current = Trim(std::move(current));
            if (!current.empty() &&
                std::find(values.begin(), values.end(), current) == values.end()) {
                values.push_back(std::move(current));
            }
            current.clear();
            continue;
        }
        current.push_back(ch);
    }
    current = Trim(std::move(current));
    if (!current.empty() && std::find(values.begin(), values.end(), current) == values.end()) {
        values.push_back(std::move(current));
    }
    return values;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7206 function
void AppendVaMetadataQueryList(const std::unordered_map<std::string, std::string>& query,
                               std::initializer_list<const char*> keys,
                               std::vector<std::string>* values) {
    if (values == nullptr) {
        return;
    }
    for (const char* key : keys) {
        const auto it = query.find(key);
        if (it == query.end()) {
            continue;
        }
        for (auto value : ParseVaMetadataStringList(it->second)) {
            if (std::find(values->begin(), values->end(), value) == values->end()) {
                values->push_back(std::move(value));
            }
        }
    }
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7225 function
std::optional<std::uint64_t> ParseVaMetadataUint64Query(
    const std::unordered_map<std::string, std::string>& query,
    std::initializer_list<const char*> keys) {
    for (const char* key : keys) {
        const auto it = query.find(key);
        if (it == query.end()) {
            continue;
        }
        const std::string raw = Trim(it->second);
        if (raw.empty() || raw.front() == '-') {
            continue;
        }
        std::size_t consumed = 0;
        try {
            const unsigned long long parsed = std::stoull(raw, &consumed, 10);
            if (consumed == raw.size()) {
                return static_cast<std::uint64_t>(parsed);
            }
        } catch (...) {
        }
    }
    return std::nullopt;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7249 function
std::optional<int> ParseVaMetadataIntQuery(const std::unordered_map<std::string, std::string>& query,
                                           std::initializer_list<const char*> keys) {
    for (const char* key : keys) {
        const auto it = query.find(key);
        if (it == query.end()) {
            continue;
        }
        const std::string raw = Trim(it->second);
        if (raw.empty()) {
            continue;
        }
        std::size_t consumed = 0;
        try {
            const int parsed = std::stoi(raw, &consumed, 10);
            if (consumed == raw.size()) {
                return parsed;
            }
        } catch (...) {
        }
    }
    return std::nullopt;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7272 function
VaMetadataApplicationFilter BuildVaMetadataSubscriptionFilter(
    const std::unordered_map<std::string, std::string>& query) {
    VaMetadataApplicationFilter filter;
    AppendVaMetadataQueryList(query, {"eventType", "eventTypes"}, &filter.event_types);
    AppendVaMetadataQueryList(query, {"ruleId", "ruleIds", "metadataRuleId", "metadataRuleIds"}, &filter.rule_ids);
    AppendVaMetadataQueryList(query, {"scenario", "scenarioName", "scenarioNames"}, &filter.scenario_names);
    AppendVaMetadataQueryList(query, {"zoneId", "zoneIds"}, &filter.zone_ids);
    AppendVaMetadataQueryList(query, {"lineId", "lineIds"}, &filter.line_ids);
    AppendVaMetadataQueryList(query, {"status", "statuses", "eventStatus"}, &filter.statuses);
    AppendVaMetadataQueryList(query, {"label", "labels", "className", "classNames"}, &filter.labels);
    filter.track_id = ParseVaMetadataUint64Query(query, {"trackId"});
    filter.class_id = ParseVaMetadataIntQuery(query, {"classId"});
    return filter;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7287 function
void AppendVaMetadataFilterArrayJson(std::ostringstream& out,
                                     const std::string& key,
                                     const std::vector<std::string>& values) {
    out << "\"" << JsonEscape(key) << "\":[";
    for (std::size_t i = 0; i < values.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << "\"" << JsonEscape(values[i]) << "\"";
    }
    out << "]";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7300 function
std::string VaMetadataSubscriptionFilterJson(const VaMetadataApplicationFilter& filter) {
    std::ostringstream out;
    out << "{";
    AppendVaMetadataFilterArrayJson(out, "eventTypes", filter.event_types);
    out << ",";
    AppendVaMetadataFilterArrayJson(out, "ruleIds", filter.rule_ids);
    out << ",";
    AppendVaMetadataFilterArrayJson(out, "scenarioNames", filter.scenario_names);
    out << ",";
    AppendVaMetadataFilterArrayJson(out, "zoneIds", filter.zone_ids);
    out << ",";
    AppendVaMetadataFilterArrayJson(out, "lineIds", filter.line_ids);
    out << ",";
    AppendVaMetadataFilterArrayJson(out, "statuses", filter.statuses);
    out << ",";
    AppendVaMetadataFilterArrayJson(out, "labels", filter.labels);
    out << ",\"trackId\":";
    if (filter.track_id.has_value()) {
        out << *filter.track_id;
    } else {
        out << "null";
    }
    out << ",\"classId\":";
    if (filter.class_id.has_value()) {
        out << *filter.class_id;
    } else {
        out << "null";
    }
    out << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7332 function
VaMetadataStreamOptions BuildVaMetadataStreamOptions(const std::unordered_map<std::string, std::string>& query) {
    const auto& config = GetWebRtcHttpRuntimeConfig();
    VaMetadataStreamOptions options;
    options.interval_ms =
        ParseClampedIntQuery(query,
                             "intervalMs",
                             ParseClampedIntQuery(query,
                                                  "metadataIntervalMs",
                                                  config.webrtc_va_metadata_interval_ms,
                                                  100,
                                                  60000),
                             100,
                             60000);
    options.stale_after_ms =
        ParseClampedIntQuery(query,
                             "staleAfterMs",
                             std::max(5000, options.interval_ms * 3),
                             options.interval_ms,
                             600000);
    options.stream_max_duration_ms =
        ParseClampedIntQuery(query, "streamMaxDurationMs", 0, 0, 24 * 60 * 60 * 1000);
    options.stream_max_messages =
        ParseClampedIntQuery(query,
                             "maxMessages",
                             ParseClampedIntQuery(query, "sseMaxMessages", 0, 0, 1000000),
                             0,
                             1000000);
    options.max_message_bytes = static_cast<std::size_t>(
        ParseClampedIntQuery(query,
                             "maxMessageBytes",
                             ParseClampedIntQuery(query,
                                                  "vaMetadataMaxMessageBytes",
                                                  static_cast<int>(config.webrtc_va_metadata_max_message_bytes),
                                                  256,
                                                  1048576),
                             256,
                             1048576));
    options.max_tracks = static_cast<std::size_t>(
        ParseClampedIntQuery(query, "maxTracks", 128, 1, 10000));
    options.max_events = static_cast<std::size_t>(
        ParseClampedIntQuery(query, "maxEvents", 64, 1, 10000));
    options.include_source = ParseBoolQuery(query, "includeSource", true);
    options.include_scenarios = ParseBoolQuery(query, "includeScenarios", true);
    options.include_metrics = ParseBoolQuery(query, "includeMetrics", true);
    options.include_tracking_issue_report = ParseBoolQuery(query, "includeTrackingIssueReport", true);
    options.subscription_filter = BuildVaMetadataSubscriptionFilter(query);
    return options;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7381 function
std::string VaMetadataSubscriptionControlJson(const std::string& action,
                                              bool subscribed,
                                              const VaMetadataStreamOptions& options,
                                              const std::string& error_message) {
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.va.metadata-control.v1\","
        << "\"action\":\"" << JsonEscape(action) << "\","
        << "\"subscribed\":" << (subscribed ? "true" : "false") << ","
        << "\"intervalMs\":" << options.interval_ms << ","
        << "\"staleAfterMs\":" << options.stale_after_ms << ","
        << "\"maxMessages\":" << options.stream_max_messages << ","
        << "\"streamMaxDurationMs\":" << options.stream_max_duration_ms << ","
        << "\"maxMessageBytes\":" << options.max_message_bytes << ","
        << "\"maxTracks\":" << options.max_tracks << ","
        << "\"maxEvents\":" << options.max_events << ","
        << "\"includeSource\":" << (options.include_source ? "true" : "false") << ","
        << "\"includeScenarios\":" << (options.include_scenarios ? "true" : "false") << ","
        << "\"includeMetrics\":" << (options.include_metrics ? "true" : "false") << ","
        << "\"includeTrackingIssueReport\":"
        << (options.include_tracking_issue_report ? "true" : "false") << ","
        << "\"filter\":" << VaMetadataSubscriptionFilterJson(options.subscription_filter);
    if (!error_message.empty()) {
        out << ",\"error\":\"" << JsonEscape(error_message) << "\"";
    }
    out << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7410 function
void ApplyVaMetadataCommandStringField(const std::string& body,
                                       const std::string& field,
                                       const std::string& query_key,
                                       std::unordered_map<std::string, std::string>* query) {
    if (query == nullptr) {
        return;
    }
    if (const auto value = ParseStringField(body, field); value.has_value()) {
        (*query)[query_key] = *value;
    }
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7422 function
void ApplyVaMetadataCommandIntField(const std::string& body,
                                    const std::string& field,
                                    const std::string& query_key,
                                    std::unordered_map<std::string, std::string>* query) {
    if (query == nullptr) {
        return;
    }
    if (const auto value = ParseIntField(body, field); value.has_value()) {
        (*query)[query_key] = std::to_string(*value);
    }
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7434 function
int ClampedMetadataCommandInt(const std::string& body,
                              const std::string& field,
                              int current_value,
                              int min_value,
                              int max_value) {
    const auto parsed = ParseIntField(body, field);
    if (!parsed.has_value()) {
        return current_value;
    }
    return std::max(min_value, std::min(max_value, *parsed));
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7446 function
VaMetadataStreamOptions ApplyVaMetadataSubscribeCommand(const std::string& body,
                                                        VaMetadataStreamOptions options) {
    std::unordered_map<std::string, std::string> control_query;
    ApplyVaMetadataCommandStringField(body, "eventType", "eventType", &control_query);
    ApplyVaMetadataCommandStringField(body, "eventTypes", "eventTypes", &control_query);
    ApplyVaMetadataCommandStringField(body, "ruleId", "ruleId", &control_query);
    ApplyVaMetadataCommandStringField(body, "ruleIds", "ruleIds", &control_query);
    ApplyVaMetadataCommandStringField(body, "metadataRuleId", "metadataRuleId", &control_query);
    ApplyVaMetadataCommandStringField(body, "scenario", "scenario", &control_query);
    ApplyVaMetadataCommandStringField(body, "scenarioName", "scenarioName", &control_query);
    ApplyVaMetadataCommandStringField(body, "scenarioNames", "scenarioNames", &control_query);
    ApplyVaMetadataCommandStringField(body, "zoneId", "zoneId", &control_query);
    ApplyVaMetadataCommandStringField(body, "zoneIds", "zoneIds", &control_query);
    ApplyVaMetadataCommandStringField(body, "lineId", "lineId", &control_query);
    ApplyVaMetadataCommandStringField(body, "lineIds", "lineIds", &control_query);
    ApplyVaMetadataCommandStringField(body, "status", "status", &control_query);
    ApplyVaMetadataCommandStringField(body, "statuses", "statuses", &control_query);
    ApplyVaMetadataCommandStringField(body, "label", "label", &control_query);
    ApplyVaMetadataCommandStringField(body, "labels", "labels", &control_query);
    ApplyVaMetadataCommandStringField(body, "className", "className", &control_query);
    ApplyVaMetadataCommandStringField(body, "classNames", "classNames", &control_query);
    ApplyVaMetadataCommandIntField(body, "trackId", "trackId", &control_query);
    ApplyVaMetadataCommandIntField(body, "classId", "classId", &control_query);

    options.subscription_filter = BuildVaMetadataSubscriptionFilter(control_query);
    options.interval_ms = ClampedMetadataCommandInt(body, "intervalMs", options.interval_ms, 100, 60000);
    options.stale_after_ms =
        ClampedMetadataCommandInt(body,
                                  "staleAfterMs",
                                  options.stale_after_ms,
                                  options.interval_ms,
                                  600000);
    options.stream_max_messages =
        ClampedMetadataCommandInt(body, "maxMessages", options.stream_max_messages, 0, 1000000);
    options.stream_max_duration_ms =
        ClampedMetadataCommandInt(body,
                                  "streamMaxDurationMs",
                                  options.stream_max_duration_ms,
                                  0,
                                  24 * 60 * 60 * 1000);
    options.max_message_bytes = static_cast<std::size_t>(
        ClampedMetadataCommandInt(
            body, "maxMessageBytes", static_cast<int>(options.max_message_bytes), 256, 1048576));
    options.max_tracks = static_cast<std::size_t>(
        ClampedMetadataCommandInt(body, "maxTracks", static_cast<int>(options.max_tracks), 1, 10000));
    options.max_events = static_cast<std::size_t>(
        ClampedMetadataCommandInt(body, "maxEvents", static_cast<int>(options.max_events), 1, 10000));
    if (const auto include_source = ParseBoolField(body, "includeSource"); include_source.has_value()) {
        options.include_source = *include_source;
    }
    if (const auto include_scenarios = ParseBoolField(body, "includeScenarios");
        include_scenarios.has_value()) {
        options.include_scenarios = *include_scenarios;
    }
    if (const auto include_metrics = ParseBoolField(body, "includeMetrics"); include_metrics.has_value()) {
        options.include_metrics = *include_metrics;
    }
    if (const auto include_issues = ParseBoolField(body, "includeTrackingIssueReport");
        include_issues.has_value()) {
        options.include_tracking_issue_report = *include_issues;
    }
    return options;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7510 function
std::string BuildVaRuntimeMetadataJsonWithinBudget(const analysis::AnalysisResult& result,
                                                   const std::vector<analysis::AnalysisEvent>& events,
                                                   const std::string& tracking_issue_report_json,
                                                   const VaMetadataStreamOptions& stream_options) {
    VaMetadataApplicationBuildOptions options;
    options.filter = stream_options.subscription_filter;
    options.include_source = stream_options.include_source;
    options.include_scenarios = stream_options.include_scenarios;
    options.include_metrics = stream_options.include_metrics;
    options.include_tracking_issue_report = stream_options.include_tracking_issue_report;
    options.max_tracks = stream_options.max_tracks;
    options.max_events = stream_options.max_events;
    options.max_message_bytes = stream_options.max_message_bytes;
    return SerializeVaRuntimeMetadataForApplication(
        result, events, tracking_issue_report_json, options);
}

std::string BuildVaRuntimeMetadataJsonWithinBudget(
    const AnalysisSessionApplicationResult& result,
    const std::vector<EventRuleApplicationEvent>& events,
    const std::string& tracking_issue_report_json,
    const VaMetadataStreamOptions& stream_options) {
    VaMetadataApplicationBuildOptions options;
    options.filter = stream_options.subscription_filter;
    options.include_source = stream_options.include_source;
    options.include_scenarios = stream_options.include_scenarios;
    options.include_metrics = stream_options.include_metrics;
    options.include_tracking_issue_report = stream_options.include_tracking_issue_report;
    options.max_tracks = stream_options.max_tracks;
    options.max_events = stream_options.max_events;
    options.max_message_bytes = stream_options.max_message_bytes;
    return SerializeVaRuntimeMetadataForApplication(
        result, events, tracking_issue_report_json, options);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7550 function
std::string LowerAscii(std::string value) {
    std::transform(value.begin(), value.end(), value.begin(), [](unsigned char ch) {
        return static_cast<char>(std::tolower(ch));
    });
    return value;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7557 function
std::string HeaderValue(const HttpRequest& request, const std::string& key) {
    if (const auto it = request.headers.find(key); it != request.headers.end()) {
        return it->second;
    }
    const std::string wanted = LowerAscii(key);
    for (const auto& [header_key, header_value] : request.headers) {
        if (LowerAscii(header_key) == wanted) {
            return header_value;
        }
    }
    return {};
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7570 function
bool HeaderContainsToken(const std::string& header, const std::string& token) {
    const std::string wanted = LowerAscii(token);
    std::size_t start = 0;
    while (start <= header.size()) {
        const std::size_t comma = header.find(',', start);
        std::string part = header.substr(start, comma == std::string::npos ? std::string::npos : comma - start);
        part = LowerAscii(Trim(std::move(part)));
        if (part == wanted) {
            return true;
        }
        if (comma == std::string::npos) {
            break;
        }
        start = comma + 1;
    }
    return false;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7588 function
std::uint32_t Sha1RotateLeft(std::uint32_t value, int bits) {
    return (value << bits) | (value >> (32 - bits));
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7592 function
std::array<unsigned char, 20> Sha1Digest(const std::string& input) {
    std::vector<unsigned char> message(input.begin(), input.end());
    const std::uint64_t bit_length = static_cast<std::uint64_t>(message.size()) * 8ULL;
    message.push_back(0x80U);
    while ((message.size() % 64U) != 56U) {
        message.push_back(0U);
    }
    for (int shift = 56; shift >= 0; shift -= 8) {
        message.push_back(static_cast<unsigned char>((bit_length >> shift) & 0xFFU));
    }

    std::uint32_t h0 = 0x67452301U;
    std::uint32_t h1 = 0xEFCDAB89U;
    std::uint32_t h2 = 0x98BADCFEU;
    std::uint32_t h3 = 0x10325476U;
    std::uint32_t h4 = 0xC3D2E1F0U;

    for (std::size_t chunk = 0; chunk < message.size(); chunk += 64U) {
        std::uint32_t words[80]{};
        for (int i = 0; i < 16; ++i) {
            const std::size_t offset = chunk + static_cast<std::size_t>(i) * 4U;
            words[i] = (static_cast<std::uint32_t>(message[offset]) << 24U) |
                       (static_cast<std::uint32_t>(message[offset + 1]) << 16U) |
                       (static_cast<std::uint32_t>(message[offset + 2]) << 8U) |
                       static_cast<std::uint32_t>(message[offset + 3]);
        }
        for (int i = 16; i < 80; ++i) {
            words[i] = Sha1RotateLeft(words[i - 3] ^ words[i - 8] ^ words[i - 14] ^ words[i - 16], 1);
        }

        std::uint32_t a = h0;
        std::uint32_t b = h1;
        std::uint32_t c = h2;
        std::uint32_t d = h3;
        std::uint32_t e = h4;

        for (int i = 0; i < 80; ++i) {
            std::uint32_t f = 0;
            std::uint32_t k = 0;
            if (i < 20) {
                f = (b & c) | ((~b) & d);
                k = 0x5A827999U;
            } else if (i < 40) {
                f = b ^ c ^ d;
                k = 0x6ED9EBA1U;
            } else if (i < 60) {
                f = (b & c) | (b & d) | (c & d);
                k = 0x8F1BBCDCU;
            } else {
                f = b ^ c ^ d;
                k = 0xCA62C1D6U;
            }
            const std::uint32_t temp = Sha1RotateLeft(a, 5) + f + e + k + words[i];
            e = d;
            d = c;
            c = Sha1RotateLeft(b, 30);
            b = a;
            a = temp;
        }

        h0 += a;
        h1 += b;
        h2 += c;
        h3 += d;
        h4 += e;
    }

    std::array<unsigned char, 20> digest{};
    const std::uint32_t values[5] = {h0, h1, h2, h3, h4};
    for (int i = 0; i < 5; ++i) {
        digest[static_cast<std::size_t>(i) * 4U] = static_cast<unsigned char>((values[i] >> 24U) & 0xFFU);
        digest[static_cast<std::size_t>(i) * 4U + 1U] = static_cast<unsigned char>((values[i] >> 16U) & 0xFFU);
        digest[static_cast<std::size_t>(i) * 4U + 2U] = static_cast<unsigned char>((values[i] >> 8U) & 0xFFU);
        digest[static_cast<std::size_t>(i) * 4U + 3U] = static_cast<unsigned char>(values[i] & 0xFFU);
    }
    return digest;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7670 function
std::string Base64Encode(const unsigned char* data, std::size_t size) {
    static constexpr char kAlphabet[] =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    std::string output;
    output.reserve(((size + 2U) / 3U) * 4U);
    for (std::size_t i = 0; i < size; i += 3U) {
        const std::uint32_t octet_a = data[i];
        const std::uint32_t octet_b = i + 1U < size ? data[i + 1U] : 0U;
        const std::uint32_t octet_c = i + 2U < size ? data[i + 2U] : 0U;
        const std::uint32_t triple = (octet_a << 16U) | (octet_b << 8U) | octet_c;
        output.push_back(kAlphabet[(triple >> 18U) & 0x3FU]);
        output.push_back(kAlphabet[(triple >> 12U) & 0x3FU]);
        output.push_back(i + 1U < size ? kAlphabet[(triple >> 6U) & 0x3FU] : '=');
        output.push_back(i + 2U < size ? kAlphabet[triple & 0x3FU] : '=');
    }
    return output;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7688 function
std::string WebSocketAcceptKey(const std::string& client_key) {
    static constexpr const char* kMagicGuid = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
    const auto digest = Sha1Digest(client_key + kMagicGuid);
    return Base64Encode(digest.data(), digest.size());
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7694 function
bool ValidateWebSocketUpgrade(const HttpRequest& request,
                              std::string* websocket_key,
                              std::string* error_message) {
    if (request.method != "GET") {
        if (error_message != nullptr) {
            *error_message = "WebSocket endpoint requires GET";
        }
        return false;
    }
    if (!HeaderContainsToken(HeaderValue(request, "Connection"), "Upgrade") ||
        LowerAscii(HeaderValue(request, "Upgrade")) != "websocket") {
        if (error_message != nullptr) {
            *error_message = "missing WebSocket upgrade headers";
        }
        return false;
    }
    const std::string key = HeaderValue(request, "Sec-WebSocket-Key");
    if (key.empty()) {
        if (error_message != nullptr) {
            *error_message = "missing Sec-WebSocket-Key";
        }
        return false;
    }
    if (websocket_key != nullptr) {
        *websocket_key = key;
    }
    if (error_message != nullptr) {
        error_message->clear();
    }
    return true;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7726 function
bool SendWebSocketHandshake(int fd, const std::string& client_key, const HttpRequest& request) {
    std::ostringstream out;
    out << "HTTP/1.1 101 Switching Protocols\r\n"
        << "Upgrade: websocket\r\n"
        << "Connection: Upgrade\r\n"
        << "Sec-WebSocket-Accept: " << WebSocketAcceptKey(client_key) << "\r\n";
    AppendCorsHeaderLines(out, request);
    out << "\r\n";
    return SendAll(fd, out.str());
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7737 function
bool SendWebSocketServerFrame(int fd, unsigned char opcode, const std::string& payload) {
    std::string frame;
    frame.push_back(static_cast<char>(0x80U | (opcode & 0x0FU)));
    const std::uint64_t size = static_cast<std::uint64_t>(payload.size());
    if (size <= 125U) {
        frame.push_back(static_cast<char>(size));
    } else if (size <= 65535U) {
        frame.push_back(static_cast<char>(126U));
        frame.push_back(static_cast<char>((size >> 8U) & 0xFFU));
        frame.push_back(static_cast<char>(size & 0xFFU));
    } else {
        frame.push_back(static_cast<char>(127U));
        for (int shift = 56; shift >= 0; shift -= 8) {
            frame.push_back(static_cast<char>((size >> shift) & 0xFFU));
        }
    }
    frame += payload;
    return SendAll(fd, frame);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7757 function
bool SendWebSocketTextFrame(int fd, const std::string& payload) {
    return SendWebSocketServerFrame(fd, 0x1U, payload);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7761 function
bool SendWebSocketPongFrame(int fd, const std::string& payload) {
    return SendWebSocketServerFrame(fd, 0xAU, payload);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7765 function
bool SendWebSocketCloseFrame(int fd) {
    return SendWebSocketServerFrame(fd, 0x8U, {});
}


// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7778 function
WebSocketReadResult TryReadWebSocketClientFrame(int fd) {
    WebSocketReadResult result;
    int available = 0;
    if (ioctl(fd, FIONREAD, &available) != 0 || available <= 0) {
        return result;
    }
    if (available < 2) {
        return result;
    }

    unsigned char header[2]{};
    const ssize_t peeked = recv(fd, header, sizeof(header), MSG_PEEK);
    if (peeked <= 0) {
        result.close_requested = true;
        return result;
    }
    if (peeked < static_cast<ssize_t>(sizeof(header))) {
        return result;
    }

    const bool masked = (header[1] & 0x80U) != 0;
    std::uint64_t payload_size = header[1] & 0x7FU;
    std::size_t header_size = 2;
    if (payload_size == 126U) {
        header_size += 2;
    } else if (payload_size == 127U) {
        header_size += 8;
    }
    if (masked) {
        header_size += 4;
    }
    constexpr std::uint64_t kMaxControlPayload = 4096;
    if (payload_size == 127U || payload_size > kMaxControlPayload) {
        result.protocol_error = true;
        result.error_message = "WebSocket control frame too large";
        return result;
    }
    if (available < static_cast<int>(header_size)) {
        return result;
    }

    std::vector<unsigned char> frame_header(header_size);
    const ssize_t header_peeked = recv(fd, frame_header.data(), frame_header.size(), MSG_PEEK);
    if (header_peeked < static_cast<ssize_t>(frame_header.size())) {
        return result;
    }
    std::size_t offset = 2;
    if ((frame_header[1] & 0x7FU) == 126U) {
        payload_size = (static_cast<std::uint64_t>(frame_header[2]) << 8U) |
                       static_cast<std::uint64_t>(frame_header[3]);
        offset = 4;
    } else {
        payload_size = frame_header[1] & 0x7FU;
    }
    if (payload_size > kMaxControlPayload) {
        result.protocol_error = true;
        result.error_message = "WebSocket control frame too large";
        return result;
    }
    const std::size_t mask_offset = offset;
    if (masked) {
        offset += 4;
    }
    const std::size_t total_size = offset + static_cast<std::size_t>(payload_size);
    if (available < static_cast<int>(total_size)) {
        return result;
    }

    std::vector<unsigned char> frame(total_size);
    const ssize_t consumed = recv(fd, frame.data(), frame.size(), 0);
    if (consumed <= 0) {
        result.close_requested = true;
        return result;
    }
    if (consumed < static_cast<ssize_t>(frame.size())) {
        result.protocol_error = true;
        result.error_message = "partial WebSocket control frame";
        return result;
    }

    result.has_frame = true;
    result.opcode = frame[0] & 0x0FU;
    if (result.opcode == 0x8U) {
        result.close_requested = true;
        return result;
    }
    if (!masked) {
        result.protocol_error = true;
        result.error_message = "client WebSocket frames must be masked";
        return result;
    }
    result.payload.resize(static_cast<std::size_t>(payload_size));
    for (std::size_t i = 0; i < static_cast<std::size_t>(payload_size); ++i) {
        result.payload[i] = static_cast<char>(
            frame[offset + i] ^ frame[mask_offset + (i % 4U)]);
    }
    return result;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7877 function
bool SendSseHeaders(int fd, const HttpRequest& request) {
    std::ostringstream out;
    out << "HTTP/1.1 200 OK\r\n"
        << "Content-Type: text/event-stream; charset=utf-8\r\n"
        << "Cache-Control: no-cache, no-transform\r\n"
        << "Connection: close\r\n";
    AppendCorsHeaderLines(out, request);
    out << "X-Accel-Buffering: no\r\n"
        << "\r\n";
    return SendAll(fd, out.str());
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7889 function
bool SendSseComment(int fd, const std::string& comment) {
    return SendAll(fd, ": " + comment + "\n\n");
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7893 function
bool SendSseEvent(int fd, const std::string& event_name, const std::string& data, std::uint64_t event_id) {
    std::ostringstream out;
    if (event_id > 0) {
        out << "id: " << event_id << "\n";
    }
    if (!event_name.empty()) {
        out << "event: " << event_name << "\n";
    }
    out << "data: " << data << "\n\n";
    return SendAll(fd, out.str());
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7905 function
bool StreamVaMetadataSse(int client_fd,
                         const std::atomic<bool>& running,
                         AnalysisSessionReadApplicationService& analysis_session_reads,
                         const std::string& tap_id,
                         const std::unordered_map<std::string, std::string>& query,
                         const HttpRequest& request) {
    SuppressSocketSigPipe(client_fd);
    const VaMetadataStreamOptions options = BuildVaMetadataStreamOptions(query);
    if (!SendSseHeaders(client_fd, request)) {
        return false;
    }

    auto event_runtime = CreateEphemeralEventRuleApplicationRuntime();
    std::uint64_t sse_sequence = 1;
    std::uint64_t last_frame_id = 0;
    std::int64_t last_pts = std::numeric_limits<std::int64_t>::min();
    int sent_messages = 0;
    auto started_at = std::chrono::steady_clock::now();
    auto last_fresh_at = started_at;
    auto last_stale_comment_at = started_at - std::chrono::milliseconds(options.stale_after_ms);

    if (!SendSseComment(client_fd,
                        "va metadata stream opened; schema=" +
                            std::string(VaRuntimeMetadataSchemaForApplication()) +
                            "; tapId=" + tap_id)) {
        return false;
    }

    while (running.load()) {
        const auto now = std::chrono::steady_clock::now();
        if (options.stream_max_duration_ms > 0 &&
            now - started_at >= std::chrono::milliseconds(options.stream_max_duration_ms)) {
            (void)SendSseComment(client_fd, "stream max duration reached");
            break;
        }

        const auto snapshot = analysis_session_reads.Snapshot(tap_id);
        if (!snapshot.has_value()) {
            (void)SendSseEvent(client_fd,
                               "error",
                               "{\"error\":\"analysis tap not found\",\"tapId\":\"" + JsonEscape(tap_id) + "\"}",
                               sse_sequence++);
            return false;
        }

        bool should_sleep = true;
        if (snapshot->latest_result.has_value()) {
            auto result = *snapshot->latest_result;
            const bool duplicate_frame = result.frame_id == last_frame_id && result.pts == last_pts;
            if (!duplicate_frame) {
                result.debug_state_requested = true;
                result.debug_state_log_enabled = false;
                result.metrics_report_requested = true;
                const auto evaluation = EvaluateEventRulesForApplication(result, event_runtime);
                const std::string payload = BuildVaRuntimeMetadataJsonWithinBudget(
                    evaluation.ApplicationAnnotatedResult(),
                    evaluation.ApplicationEvents(),
                    evaluation.TrackingIssueReportJson(),
                    options);
                if (!payload.empty()) {
                    if (!SendSseEvent(client_fd, "metadata", payload, sse_sequence++)) {
                        return false;
                    }
                    last_frame_id = result.frame_id;
                    last_pts = result.pts;
                    last_fresh_at = now;
                    ++sent_messages;
                    should_sleep = false;
                    if (options.stream_max_messages > 0 && sent_messages >= options.stream_max_messages) {
                        (void)SendSseComment(client_fd, "stream max message count reached");
                        break;
                    }
                } else if (!SendSseComment(
                               client_fd,
                               "metadata skipped because serialized frame exceeded maxMessageBytes=" +
                                   std::to_string(options.max_message_bytes))) {
                    return false;
                }
            } else if (now - last_fresh_at >= std::chrono::milliseconds(options.stale_after_ms) &&
                       now - last_stale_comment_at >= std::chrono::milliseconds(options.stale_after_ms)) {
                last_stale_comment_at = now;
                if (!SendSseComment(client_fd,
                                    "stale metadata skipped; tapId=" + tap_id +
                                        "; frameId=" + std::to_string(last_frame_id))) {
                    return false;
                }
            } else if (!SendSseComment(client_fd, "heartbeat")) {
                return false;
            }
        } else if (!SendSseComment(client_fd, "waiting for analysis result; tapId=" + tap_id)) {
            return false;
        }

        if (should_sleep) {
            std::this_thread::sleep_for(std::chrono::milliseconds(options.interval_ms));
        }
    }
    return true;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8005 function
bool StreamVaMetadataWebSocket(int client_fd,
                               const std::atomic<bool>& running,
                               AnalysisSessionReadApplicationService& analysis_session_reads,
                               const std::string& tap_id,
                               const std::unordered_map<std::string, std::string>& query,
                               const std::string& websocket_key,
                               const HttpRequest& request) {
    SuppressSocketSigPipe(client_fd);
    const VaMetadataStreamOptions base_options = BuildVaMetadataStreamOptions(query);
    VaMetadataStreamOptions options = base_options;
    bool subscribed = true;
    if (!SendWebSocketHandshake(client_fd, websocket_key, request)) {
        return false;
    }

    auto event_runtime = CreateEphemeralEventRuleApplicationRuntime();
    std::uint64_t last_frame_id = 0;
    std::int64_t last_pts = std::numeric_limits<std::int64_t>::min();
    int sent_messages = 0;
    const auto started_at = std::chrono::steady_clock::now();

    while (running.load()) {
        const auto now = std::chrono::steady_clock::now();
        if (options.stream_max_duration_ms > 0 &&
            now - started_at >= std::chrono::milliseconds(options.stream_max_duration_ms)) {
            break;
        }

        for (int frame_reads = 0; frame_reads < 8; ++frame_reads) {
            const auto control = TryReadWebSocketClientFrame(client_fd);
            if (!control.has_frame) {
                if (control.close_requested) {
                    return true;
                }
                if (control.protocol_error) {
                    (void)SendWebSocketTextFrame(
                        client_fd,
                        VaMetadataSubscriptionControlJson("error", subscribed, options, control.error_message));
                    return false;
                }
                break;
            }
            if (control.close_requested) {
                return true;
            }
            if (control.protocol_error) {
                (void)SendWebSocketTextFrame(
                    client_fd,
                    VaMetadataSubscriptionControlJson("error", subscribed, options, control.error_message));
                return false;
            }
            if (control.opcode == 0x9U) {
                if (!SendWebSocketPongFrame(client_fd, control.payload)) {
                    return false;
                }
                continue;
            }
            if (control.opcode != 0x1U) {
                continue;
            }

            std::string action = ParseStringField(control.payload, "type").value_or("");
            if (action.empty()) {
                action = ParseStringField(control.payload, "command").value_or("");
            }
            if (action.empty()) {
                action = ParseStringField(control.payload, "action").value_or("subscribe");
            }
            action = LowerAscii(Trim(std::move(action)));
            if (action == "subscribe" || action == "filter") {
                options = ApplyVaMetadataSubscribeCommand(control.payload, options);
                subscribed = true;
                last_frame_id = 0;
                last_pts = std::numeric_limits<std::int64_t>::min();
                if (!SendWebSocketTextFrame(
                        client_fd, VaMetadataSubscriptionControlJson("subscribe", subscribed, options))) {
                    return false;
                }
            } else if (action == "unsubscribe" || action == "pause") {
                subscribed = false;
                last_frame_id = 0;
                last_pts = std::numeric_limits<std::int64_t>::min();
                if (!SendWebSocketTextFrame(
                        client_fd, VaMetadataSubscriptionControlJson("unsubscribe", subscribed, options))) {
                    return false;
                }
            } else if (action == "resume") {
                subscribed = true;
                last_frame_id = 0;
                last_pts = std::numeric_limits<std::int64_t>::min();
                if (!SendWebSocketTextFrame(
                        client_fd, VaMetadataSubscriptionControlJson("resume", subscribed, options))) {
                    return false;
                }
            } else if (action == "status") {
                if (!SendWebSocketTextFrame(
                        client_fd, VaMetadataSubscriptionControlJson("status", subscribed, options))) {
                    return false;
                }
            } else if (action == "reset") {
                options = base_options;
                subscribed = true;
                last_frame_id = 0;
                last_pts = std::numeric_limits<std::int64_t>::min();
                if (!SendWebSocketTextFrame(
                        client_fd, VaMetadataSubscriptionControlJson("reset", subscribed, options))) {
                    return false;
                }
            } else if (!SendWebSocketTextFrame(
                           client_fd,
                           VaMetadataSubscriptionControlJson(
                               "error", subscribed, options, "unknown metadata control action: " + action))) {
                return false;
            }
        }

        if (!subscribed) {
            std::this_thread::sleep_for(std::chrono::milliseconds(options.interval_ms));
            continue;
        }

        const auto snapshot = analysis_session_reads.Snapshot(tap_id);
        if (!snapshot.has_value()) {
            (void)SendWebSocketTextFrame(
                client_fd,
                "{\"error\":\"analysis tap not found\",\"tapId\":\"" + JsonEscape(tap_id) + "\"}");
            return false;
        }

        if (snapshot->latest_result.has_value()) {
            auto result = *snapshot->latest_result;
            const bool duplicate_frame = result.frame_id == last_frame_id && result.pts == last_pts;
            if (!duplicate_frame) {
                result.debug_state_requested = true;
                result.debug_state_log_enabled = false;
                result.metrics_report_requested = true;
                const auto evaluation = EvaluateEventRulesForApplication(result, event_runtime);
                const std::string payload = BuildVaRuntimeMetadataJsonWithinBudget(
                    evaluation.ApplicationAnnotatedResult(),
                    evaluation.ApplicationEvents(),
                    evaluation.TrackingIssueReportJson(),
                    options);
                if (!payload.empty()) {
                    if (!SendWebSocketTextFrame(client_fd, payload)) {
                        return false;
                    }
                    last_frame_id = result.frame_id;
                    last_pts = result.pts;
                    ++sent_messages;
                    if (options.stream_max_messages > 0 && sent_messages >= options.stream_max_messages) {
                        break;
                    }
                }
            }
        }

        std::this_thread::sleep_for(std::chrono::milliseconds(options.interval_ms));
    }
    (void)SendWebSocketCloseFrame(client_fd);
    return true;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8167 function
std::string AnalysisStateDumpJson(const std::string& tap_id,
                                  const AnalysisSessionApplicationSnapshot& snapshot,
                                  const std::optional<EventRuleApplicationEvaluation>& evaluation) {
    const auto& appearance_stats = snapshot.track_state_metrics.appearance_extractor_stats;
    std::ostringstream out;
    out << "{"
        << "\"tapId\":\"" << JsonEscape(tap_id) << "\","
        << "\"streamKey\":\"" << JsonEscape(snapshot.stream_key) << "\","
        << "\"channelId\":\"" << JsonEscape(snapshot.stream_key) << "\","
        << "\"hasResult\":" << (snapshot.latest_result.has_value() ? "true" : "false") << ","
        << "\"analyticsState\":{"
        << "\"trackState\":{"
        << "\"channelCount\":" << snapshot.track_state_metrics.channel_count << ","
        << "\"totalTracks\":" << snapshot.track_state_metrics.total_tracks << ","
        << "\"activeTracks\":" << snapshot.track_state_metrics.active_tracks << ","
        << "\"lostTracks\":" << snapshot.track_state_metrics.lost_tracks << ","
        << "\"reacquiredTracks\":" << snapshot.track_state_metrics.reacquired_tracks << ","
        << "\"terminatedTracks\":" << snapshot.track_state_metrics.terminated_tracks << ","
        << "\"cleanupRuns\":" << snapshot.track_state_metrics.cleanup_runs << ","
        << "\"appearanceExtractor\":{"
        << "\"enabled\":" << (appearance_stats.enabled ? "true" : "false") << ","
        << "\"name\":\"" << JsonEscape(appearance_stats.extractor_name) << "\","
        << "\"requests\":" << appearance_stats.request_count << ","
        << "\"queued\":" << appearance_stats.queued_count << ","
        << "\"completed\":" << appearance_stats.completed_count << ","
        << "\"dropped\":" << appearance_stats.dropped_count << ","
        << "\"rateLimited\":" << appearance_stats.rate_limited_count << ","
        << "\"staleDrops\":" << appearance_stats.stale_drop_count << ","
        << "\"lastError\":\"" << JsonEscape(appearance_stats.last_error) << "\""
        << "}"
        << "}},"
        << "\"debugState\":";
    if (evaluation.has_value()) {
        out << AnalysisDebugStateJson(evaluation->ApplicationAnnotatedResult().debug_state);
    } else {
        out << "null";
    }
    out << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8208 function
std::string AnalysisMetricsDumpJson(const std::string& tap_id,
                                    const AnalysisSessionApplicationSnapshot& snapshot,
                                    const std::optional<EventRuleApplicationEvaluation>& evaluation) {
    const auto& appearance_stats = snapshot.track_state_metrics.appearance_extractor_stats;
    std::ostringstream out;
    out << "{"
        << "\"tapId\":\"" << JsonEscape(tap_id) << "\","
        << "\"streamKey\":\"" << JsonEscape(snapshot.stream_key) << "\","
        << "\"channelId\":\"" << JsonEscape(snapshot.stream_key) << "\","
        << "\"hasResult\":" << (snapshot.latest_result.has_value() ? "true" : "false") << ","
        << "\"tapState\":{"
        << "\"receivedVideoPackets\":" << snapshot.received_video_packets << ","
        << "\"decodedFrames\":" << snapshot.decoded_frames << ","
        << "\"sampledFrames\":" << snapshot.sampled_frames << ","
        << "\"analyzedPackets\":" << snapshot.analyzed_packets << ","
        << "\"droppedPackets\":" << snapshot.dropped_packets << ","
        << "\"sampleDroppedFrames\":" << snapshot.sample_dropped_frames << ","
        << "\"queueDroppedFrames\":" << snapshot.queue_dropped_frames << ","
        << "\"sampleIntervalDroppedFrames\":" << snapshot.sample_interval_dropped_frames << ","
        << "\"staleQueueDroppedFrames\":" << snapshot.stale_queue_dropped_frames << ","
        << "\"pendingFrames\":" << snapshot.pending_frames << ","
        << "\"peakPendingFrames\":" << snapshot.peak_pending_frames << ","
        << "\"targetFps\":" << snapshot.target_fps << ","
        << "\"effectiveDecodedFps\":" << snapshot.effective_decoded_fps << ","
        << "\"effectiveSampledFps\":" << snapshot.effective_sampled_fps << ","
        << "\"effectiveAnalyzedFps\":" << snapshot.effective_analyzed_fps << ","
        << "\"frameSampleInterval\":" << snapshot.frame_sample_interval << ","
        << "\"maxQueueSize\":" << snapshot.max_queue_size << ","
        << "\"maxFrameAgeMs\":" << snapshot.max_frame_age_ms << ","
        << "\"lastQueueWaitMs\":" << snapshot.last_queue_wait_ms << ","
        << "\"averageQueueWaitMs\":" << snapshot.average_queue_wait_ms << ","
        << "\"maxQueueWaitMs\":" << snapshot.max_queue_wait_ms << ","
        << "\"lastAnalysisMs\":" << snapshot.last_analysis_ms << ","
        << "\"averageAnalysisMs\":" << snapshot.average_analysis_ms << ","
        << "\"maxAnalysisMs\":" << snapshot.max_analysis_ms << ","
        << "\"lastInferenceMs\":" << snapshot.last_inference_ms << ","
        << "\"averageInferenceMs\":" << snapshot.average_inference_ms << ","
        << "\"maxInferenceMs\":" << snapshot.max_inference_ms << ","
        << "\"analyticsQueue\":{"
        << "\"pending\":" << snapshot.pending_frames << ","
        << "\"capacity\":" << snapshot.max_queue_size << ","
        << "\"peakPending\":" << snapshot.peak_pending_frames << ","
        << "\"dropOldest\":" << snapshot.queue_dropped_frames << ","
        << "\"staleDrops\":" << snapshot.stale_queue_dropped_frames << ","
        << "\"sampleIntervalDrops\":" << snapshot.sample_interval_dropped_frames << ","
        << "\"sampleDrops\":" << snapshot.sample_dropped_frames << ","
        << "\"lastWaitMs\":" << snapshot.last_queue_wait_ms << ","
        << "\"averageWaitMs\":" << snapshot.average_queue_wait_ms << ","
        << "\"maxWaitMs\":" << snapshot.max_queue_wait_ms
        << "}"
        << "},"
        << "\"trackState\":{"
        << "\"channelCount\":" << snapshot.track_state_metrics.channel_count << ","
        << "\"totalTracks\":" << snapshot.track_state_metrics.total_tracks << ","
        << "\"activeTracks\":" << snapshot.track_state_metrics.active_tracks << ","
        << "\"lostTracks\":" << snapshot.track_state_metrics.lost_tracks << ","
        << "\"reacquiredTracks\":" << snapshot.track_state_metrics.reacquired_tracks << ","
        << "\"terminatedTracks\":" << snapshot.track_state_metrics.terminated_tracks << ","
        << "\"cleanupRuns\":" << snapshot.track_state_metrics.cleanup_runs << ","
        << "\"terminatedTrackCleanupCount\":"
        << snapshot.track_state_metrics.tracks_removed_by_cleanup << ","
        << "\"lastCleanupTimeMs\":" << snapshot.track_state_metrics.last_cleanup_time_ms << ","
        << "\"appearanceExtractor\":{"
        << "\"enabled\":" << (appearance_stats.enabled ? "true" : "false") << ","
        << "\"name\":\"" << JsonEscape(appearance_stats.extractor_name) << "\","
        << "\"requests\":" << appearance_stats.request_count << ","
        << "\"queued\":" << appearance_stats.queued_count << ","
        << "\"completed\":" << appearance_stats.completed_count << ","
        << "\"failed\":" << appearance_stats.failed_count << ","
        << "\"dropped\":" << appearance_stats.dropped_count << ","
        << "\"missingCrop\":" << appearance_stats.missing_crop_count << ","
        << "\"busyDrops\":" << appearance_stats.busy_drop_count << ","
        << "\"queueFullDrops\":" << appearance_stats.queue_full_drop_count << ","
        << "\"globalQueueDrops\":" << appearance_stats.global_queue_drop_count << ","
        << "\"rateLimited\":" << appearance_stats.rate_limited_count << ","
        << "\"staleDrops\":" << appearance_stats.stale_drop_count << ","
        << "\"lastQueueLatencyMs\":" << appearance_stats.last_queue_latency_ms << ","
        << "\"maxQueueLatencyMs\":" << appearance_stats.max_queue_latency_ms << ","
        << "\"lastInferenceMs\":" << appearance_stats.last_inference_time_ms << ","
        << "\"maxInferenceMs\":" << appearance_stats.max_inference_time_ms << ","
        << "\"lastError\":\"" << JsonEscape(appearance_stats.last_error) << "\""
        << "}"
        << "},"
        << "\"metricsReport\":";
    if (evaluation.has_value()) {
        const auto* metrics_report = evaluation->ApplicationMetricsReport();
        out << AnalysisMetricsReportJson(
            metrics_report != nullptr ? std::optional<AnalysisSessionApplicationMetrics>(*metrics_report)
                                      : std::nullopt);
    } else {
        out << "null";
    }
    out << ",\"trackingIssueReport\":";
    if (evaluation.has_value() && !evaluation->TrackingIssueReportJson().empty()) {
        out << evaluation->TrackingIssueReportJson();
    } else {
        out << "null";
    }
    out << ",\"closeObjectGuard\":" << CloseObjectGuardModeJson()
        << ",\"closeObjectDiagnostics\":[";
    if (snapshot.latest_result.has_value()) {
        const auto& diagnostics = snapshot.latest_result->close_object_diagnostics;
        for (std::size_t i = 0; i < diagnostics.size(); ++i) {
            if (i != 0) {
                out << ",";
            }
            out << CloseObjectAssociationDiagnosticJson(diagnostics[i]);
        }
    }
    out << "]";
    out << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8319 function
AnalysisSessionLifecycleApplicationRequest ProjectAnalysisSessionLifecycleRequest(
    const WebRtcMediaApplicationRequest& request) {
    AnalysisSessionLifecycleApplicationRequest output;
    output.protocol = request.protocol;
    output.path = request.path;
    output.query = request.query;
    output.client_id = request.client_id;
    return output;
}

WebRtcMediaApplicationRequest ProjectWebRtcMediaApplicationRequest(
    const WebRtcMediaApplicationRequest& request) {
    WebRtcMediaApplicationRequest output;
    output.protocol = request.protocol;
    output.path = request.path;
    output.query = request.query;
    output.client_id = request.client_id;
    return output;
}

std::string AnalysisTapCreatedJson(
    const AnalysisSessionLifecycleApplicationAttachResult& result,
                                   std::size_t active_taps) {
    std::ostringstream out;
    out << "{"
        << "\"tapId\":\"" << JsonEscape(result.tap_id) << "\","
        << "\"streamKey\":\"" << JsonEscape(result.stream_key) << "\","
        << "\"streamCreated\":" << (result.stream_created ? "true" : "false") << ","
        << "\"reused\":" << (result.reused ? "true" : "false") << ","
        << "\"reuseKey\":\"" << JsonEscape(result.reuse_key) << "\","
        << "\"refCount\":" << result.ref_count << ","
        << "\"activeTaps\":" << active_taps
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8334 function
std::string AnalysisTapListJson(const std::vector<AnalysisSessionApplicationSnapshot>& snapshots) {
    std::ostringstream out;
    out << "{\"activeTaps\":" << snapshots.size() << ",\"taps\":[";
    for (std::size_t i = 0; i < snapshots.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << AnalysisTapSnapshotJson(snapshots[i]);
    }
    out << "]}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8347 function
std::string AnalysisGlobalMetadataJson(
    const std::vector<AnalysisSessionApplicationSnapshot>& snapshots) {
    std::ostringstream out;
    out << "{\"schema\":\"media-server.lab.analysis-metadata.v1\","
        << "\"activeTaps\":" << snapshots.size() << ",\"taps\":[";
    for (std::size_t i = 0; i < snapshots.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << AnalysisMetadataJson(snapshots[i].tap_id, snapshots[i].latest_result);
    }
    out << "]}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8362 function
std::string AnalysisGlobalBboxDiagnosticsJson(
    const std::vector<AnalysisSessionApplicationSnapshot>& snapshots) {
    std::ostringstream out;
    out << "{\"schema\":\"media-server.lab.bbox-diagnostics-collection.v1\","
        << "\"activeTaps\":" << snapshots.size() << ",\"diagnostics\":[";
    for (std::size_t i = 0; i < snapshots.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        const std::int64_t pts_ms = snapshots[i].latest_result.has_value()
                                        ? snapshots[i].latest_result->pts / 1000000LL
                                        : 0;
        out << AnalysisBboxDiagnosticsJson(
            snapshots[i].tap_id, pts_ms, 0, snapshots[i].latest_result);
    }
    out << "]}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8381 function
std::string AnalysisGlobalStateDumpJson(
    const std::vector<AnalysisSessionApplicationSnapshot>& snapshots) {
    std::ostringstream out;
    out << "{\"schema\":\"media-server.lab.analysis-state-dump.v1\","
        << "\"activeTaps\":" << snapshots.size() << ",\"states\":[";
    for (std::size_t i = 0; i < snapshots.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << AnalysisStateDumpJson(snapshots[i].tap_id, snapshots[i], std::nullopt);
    }
    out << "]}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8396 function
std::string AnalysisGlobalMetricsDumpJson(
    const std::vector<AnalysisSessionApplicationSnapshot>& snapshots) {
    std::ostringstream out;
    out << "{\"schema\":\"media-server.lab.analysis-metrics-dump.v1\","
        << "\"activeTaps\":" << snapshots.size() << ",\"metrics\":[";
    for (std::size_t i = 0; i < snapshots.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << AnalysisMetricsDumpJson(snapshots[i].tap_id, snapshots[i], std::nullopt);
    }
    out << "]}";
    return out.str();
}


// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8458 function
std::string AnalysisCapabilitiesJson() {
    std::ostringstream out;
    out << R"({"detectors":[{"id":"dummy","name":"테스트용 더미 검출기","runtime":"builtin"},{"id":"yolo","name":"YOLO ONNX Runtime","runtime":"onnxruntime","requiresBuildFlag":"MEDIA_SERVER_USE_ONNXRUNTIME"}],"preprocessModes":["letterbox","stretch"],"yoloOutputLayouts":["auto","channels-first","channels-last"],"yoloBoxFormats":["cxcywh","xyxy"],"yoloScoreModes":["auto","class-only","objectness-class","score-class","class-score"],"outputs":["metadata","events","snapshot.jpg","overlay.jpg","image-metadata","image-snapshot.jpg","image-overlay.jpg","rtsp-overlay","webrtc-overlay"],"eventTypes":["presence","enter","exit","line-crossing"],)"
        << "\"trackingCategories\":" << CategoryCatalogJson() << ","
        << R"("eventActions":{"highlight":"blink overlay for matched object","post":"async curl-based POST worker with bounded queue and cooldown"},"metrics":["receivedVideoPackets","decodedFrames","sampledFrames","analyzedPackets","droppedPackets","pendingFrames","peakPendingFrames","effectiveDecodedFps","effectiveSampledFps","effectiveAnalyzedFps","lastQueueWaitMs","averageQueueWaitMs","lastInferenceMs","averageInferenceMs","lastAnalysisMs","averageAnalysisMs","maxAnalysisMs","adaptiveState","adaptiveDownshiftCount","adaptiveUpshiftCount"],"shortQuery":{"va":"1 enables the server default VA overlay profile with lightweight tracking for person/vehicle categories","overlay":"alias for va=1","analysis":"alias for va=1"},"advancedQuery":{"tracking":"optional object tracking on/off","trackingClasses":"optional comma-separated categories/classes: person,vehicle,road,animal,sports,tableware,food,furniture,device,object or '*' for all","fps":"optional VA wall-clock sampling fps override","maxQueue":"optional detector queue override","frameSampleInterval":"optional deterministic decoded-frame sampling interval; 1 means every decoded frame after fps gate","sampleEveryNFrames":"alias for frameSampleInterval","maxFrameAgeMs":"optional stale analysis frame drop threshold; 0 disables age drop","adaptive":"optional adaptive tuner on/off","adaptiveInputSize":"optional input size tuning on/off","adaptiveMinFps":"optional adaptive lower fps bound","adaptiveMaxFps":"optional adaptive upper fps bound","adaptiveMinInputWidth":"optional adaptive lower input width","adaptiveMinInputHeight":"optional adaptive lower input height","adaptiveCooldownMs":"optional adaptive action cooldown","overlayWaitMs":"optional max wait for near-PTS analysis result","overlaySyncToleranceMs":"optional allowed PTS distance for result matching","preprocess":"optional letterbox/stretch override","outputLayout":"optional YOLO output tensor layout: auto|channels-first|channels-last","boxFormat":"optional YOLO box format: cxcywh|xyxy","scoreMode":"optional YOLO score mode: auto|class-only|objectness-class|score-class|class-score","thickness":"optional box line thickness","drawLabels":"optional label visibility","trackIds":"optional track id labels on overlay","trackTrails":"optional track trail overlay","redaction":"optional person-mosaic/mosaic overlay redaction","redactionClasses":"optional comma-separated redaction categories/classes, default person","redactionBlockSize":"optional mosaic block size in pixels","redactionMarginRatio":"optional bbox expansion ratio for redaction"}})";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8466 function
std::string AnalysisProfilesJson() {
    return AnalysisRegistry().ProfilesJson();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8470 function
std::string AnalysisRulesJson() {
    return AnalysisRegistry().RulesJson();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8474 function
std::string AnalysisVaRulesJson() {
    return AnalysisRegistry().VaRulesJson();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8478 function
std::string OpsVlmProfilesJson() {
    return AnalysisRegistry().VlmProfilesJson();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8482 function
void AppendJsonDocumentArray(std::ostream& out, const std::vector<std::string>& documents) {
    out << "[";
    for (std::size_t i = 0; i < documents.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << documents[i];
    }
    out << "]";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8493 function
std::string OpsRulesCatalogJson() {
    const auto profiles = AnalysisRegistry().ProfileDocuments();
    const auto rules = AnalysisRegistry().RuleDocuments();
    const auto va_rules = AnalysisRegistry().VaRuleDocuments();
    std::ostringstream out;
    out << "{\"status\":\"ops-rules-catalog\",\"profiles\":";
    AppendJsonDocumentArray(out, profiles);
    out << ",\"rules\":";
    AppendJsonDocumentArray(out, rules);
    out << ",\"vaRules\":";
    AppendJsonDocumentArray(out, va_rules);
    out << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8508 function
bool IsSupportedImageFile(const std::filesystem::path& path) {
    std::string ext = path.extension().string();
    std::transform(ext.begin(), ext.end(), ext.begin(), [](unsigned char ch) {
        return static_cast<char>(std::tolower(ch));
    });
    return ext == ".jpg" || ext == ".jpeg" || ext == ".png" || ext == ".bmp" || ext == ".webp";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8516 function
bool HasParentTraversal(const std::filesystem::path& path) {
    for (const auto& part : path) {
        if (part == "..") {
            return true;
        }
    }
    return false;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8525 function
std::filesystem::path ProjectRelativeRoot(const std::filesystem::path& root) {
    if (root.is_absolute()) {
        return root;
    }
    return std::filesystem::current_path() / root;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8532 function
bool ResolvePathUnderRoot(const std::filesystem::path& root,
                          const std::string& token,
                          std::filesystem::path* output,
                          std::string* normalized_token,
                          std::string* error_message) {
    if (output == nullptr || normalized_token == nullptr) {
        if (error_message != nullptr) {
            *error_message = "internal image path output is missing";
        }
        return false;
    }
    if (token.empty()) {
        if (error_message != nullptr) {
            *error_message = "image file token is required";
        }
        return false;
    }

    const std::filesystem::path token_path(token);
    if (token_path.is_absolute() || HasParentTraversal(token_path)) {
        if (error_message != nullptr) {
            *error_message = "image path must be relative and stay inside the allowed root";
        }
        return false;
    }

    std::error_code ec;
    const auto root_abs = std::filesystem::weakly_canonical(ProjectRelativeRoot(root), ec);
    if (ec) {
        if (error_message != nullptr) {
            *error_message = "image root is not accessible";
        }
        return false;
    }

    const auto candidate = std::filesystem::weakly_canonical(root_abs / token_path, ec);
    if (ec || !std::filesystem::exists(candidate, ec) || !std::filesystem::is_regular_file(candidate, ec)) {
        if (error_message != nullptr) {
            *error_message = "image file not found";
        }
        return false;
    }
    if (!IsSupportedImageFile(candidate)) {
        if (error_message != nullptr) {
            *error_message = "unsupported image extension";
        }
        return false;
    }

    std::error_code relative_ec;
    const auto relative = std::filesystem::relative(candidate, root_abs, relative_ec);
    if (relative_ec || relative.empty() || relative.is_absolute() || HasParentTraversal(relative)) {
        if (error_message != nullptr) {
            *error_message = "image path escaped the allowed root";
        }
        return false;
    }

    *output = candidate;
    *normalized_token = relative.generic_string();
    return true;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8595 function
bool ResolveImageRequestPath(const std::unordered_map<std::string, std::string>& query,
                             std::filesystem::path* output,
                             std::string* root_name,
                             std::string* normalized_token,
                             std::string* error_message) {
    if (output == nullptr || root_name == nullptr || normalized_token == nullptr) {
        if (error_message != nullptr) {
            *error_message = "internal image request output is missing";
        }
        return false;
    }

    if (const auto it = query.find("asset"); it != query.end() && !it->second.empty()) {
        *root_name = "docs/assets";
        return ResolvePathUnderRoot(std::filesystem::path("docs") / "assets",
                                    it->second,
                                    output,
                                    normalized_token,
                                    error_message);
    }

    std::string token;
    if (const auto it = query.find("file"); it != query.end() && !it->second.empty()) {
        token = it->second;
    } else if (const auto it = query.find("image"); it != query.end() && !it->second.empty()) {
        token = it->second;
    }

    if (token.empty()) {
        const std::filesystem::path default_asset = std::filesystem::path("docs") / "assets" / "va-four-scene-sample.png";
        std::error_code ec;
        if (std::filesystem::exists(ProjectRelativeRoot(default_asset), ec)) {
            *root_name = "docs/assets";
            return ResolvePathUnderRoot(std::filesystem::path("docs") / "assets",
                                        "va-four-scene-sample.png",
                                        output,
                                        normalized_token,
                                        error_message);
        }
        if (error_message != nullptr) {
            *error_message = "file, image, or asset query is required";
        }
        return false;
    }

    *root_name = "video";
    return ResolvePathUnderRoot(GetWebRtcHttpRuntimeConfig().file_root_path, token, output, normalized_token, error_message);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8644 function
bool QueryHasAny(const std::unordered_map<std::string, std::string>& query,
                 std::initializer_list<const char*> keys) {
    return std::any_of(keys.begin(), keys.end(), [&query](const char* key) {
        return query.find(key) != query.end();
    });
}

ImageCodecFrame ProjectImageCodecFrame(const analysis::RawVideoFrame& frame) {
    ImageCodecFrame projected;
    projected.source_key = frame.source_key;
    projected.track_id = frame.track_id;
    projected.width = frame.width;
    projected.height = frame.height;
    switch (frame.format) {
        case analysis::PixelFormat::Unknown:
            projected.format = ImageCodecPixelFormat::Unknown;
            break;
        case analysis::PixelFormat::I420:
            projected.format = ImageCodecPixelFormat::I420;
            break;
        case analysis::PixelFormat::RGB:
            projected.format = ImageCodecPixelFormat::RGB;
            break;
        case analysis::PixelFormat::BGR:
            projected.format = ImageCodecPixelFormat::BGR;
            break;
        case analysis::PixelFormat::Gray8:
            projected.format = ImageCodecPixelFormat::Gray8;
            break;
    }
    projected.pts = frame.pts;
    projected.data = frame.data;
    return projected;
}

analysis::RawVideoFrame RestoreImageCodecFrame(const ImageCodecFrame& frame) {
    analysis::RawVideoFrame restored;
    restored.source_key = frame.source_key;
    restored.track_id = frame.track_id;
    restored.width = frame.width;
    restored.height = frame.height;
    switch (frame.format) {
        case ImageCodecPixelFormat::Unknown:
            restored.format = analysis::PixelFormat::Unknown;
            break;
        case ImageCodecPixelFormat::I420:
            restored.format = analysis::PixelFormat::I420;
            break;
        case ImageCodecPixelFormat::RGB:
            restored.format = analysis::PixelFormat::RGB;
            break;
        case ImageCodecPixelFormat::BGR:
            restored.format = analysis::PixelFormat::BGR;
            break;
        case ImageCodecPixelFormat::Gray8:
            restored.format = analysis::PixelFormat::Gray8;
            break;
    }
    restored.pts = frame.pts;
    restored.data = frame.data;
    return restored;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8651 function
bool AnalyzeStaticImage(const std::unordered_map<std::string, std::string>& query,
                        StaticImageAnalysis* output,
                        std::string* error_message) {
    if (output == nullptr) {
        if (error_message != nullptr) {
            *error_message = "missing static image analysis output";
        }
        return false;
    }
    *output = StaticImageAnalysis{};

    std::filesystem::path image_path;
    if (!ResolveImageRequestPath(query, &image_path, &output->root_name, &output->token, error_message)) {
        return false;
    }

    ImageCodecFrame decoded;
    if (!DecodeImageForApplication(image_path, &decoded, error_message)) {
        return false;
    }
    output->frame = RestoreImageCodecFrame(decoded);
    output->frame.source_key = "image:" + output->root_name + "/" + output->token;

    auto profile_query = query;
    if (!QueryHasAny(profile_query, {"va", "analysis", "overlay", "detector", "profile", "profileId"})) {
        // 정적 이미지 분석도 영상 VA와 같은 기본 profile을 쓰도록 va=1을 암시한다.
        profile_query["va"] = "1";
    }
    analysis::AnalysisContext context;
    context.source_kind = "image";
    context.route = "http";
    context.client_id = "analysis-image";
    output->profile = ResolveAnalysisProfileForApplication(
        BuildAnalysisProfileForApplication(profile_query), context);
    output->profile.adaptive_tuning_enabled = false;
    output->profile.adaptive_input_size_enabled = false;

    if (!AnalyzeFrameForApplication(
            output->profile, output->frame, &output->result, &output->analysis_ms, error_message)) {
        return false;
    }

    output->result.source_key = output->frame.source_key;
    output->result.profile_key = analysis::BuildProfileKey(output->profile);
    output->result.context = std::move(context);
    output->result.pts = output->frame.pts;
    output->result.frame_width = output->frame.width;
    output->result.frame_height = output->frame.height;
    if (output->profile.enable_tracking) {
        const auto& config = GetWebRtcHttpRuntimeConfig();
        const AnalysisTrackingApplicationRuntimeConfig tracker_config{
            config.analysis_tracking_iou_weight,
            config.analysis_tracking_distance_weight,
            config.analysis_tracking_direction_weight,
            config.analysis_tracking_class_weight,
            config.analysis_tracking_min_association_score,
            config.analysis_tracking_smoothing_alpha,
            config.analysis_tracking_close_object_guard_mode,
            config.analysis_tracking_close_object_distance_ratio,
            config.analysis_tracking_close_object_overlap_threshold,
            config.analysis_tracking_close_object_low_margin_threshold,
            config.analysis_tracking_center_jump_penalty,
            config.analysis_tracking_close_object_min_score_boost,
            config.analysis_tracking_close_object_max_diagnostics,
            static_cast<std::uint32_t>(config.analysis_tracking_lost_buffer_frames),
        };
        TrackStaticImageForApplication(output->profile, tracker_config, &output->result);
    }
    if (error_message != nullptr) {
        error_message->clear();
    }
    return true;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8752 function
std::string StaticImageAnalysisJson(const StaticImageAnalysis& analysis) {
    std::ostringstream out;
    out << "{"
        << "\"image\":{"
        << "\"root\":\"" << JsonEscape(analysis.root_name) << "\","
        << "\"file\":\"" << JsonEscape(analysis.token) << "\","
        << "\"width\":" << analysis.frame.width << ","
        << "\"height\":" << analysis.frame.height
        << "},"
        << "\"analysisMs\":" << analysis.analysis_ms << ","
        << "\"profileKey\":\"" << JsonEscape(analysis.result.profile_key) << "\","
        << "\"result\":" << AnalysisResultJson(analysis.result)
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8795 function
bool DetachAnalysisTapAndReleaseRuntimes(
                                         AnalysisSessionLifecycleApplicationService& analysis_session_lifecycle,
                                         const std::string& tap_id) {
    if (tap_id.empty()) {
        return false;
    }
    const auto detach_result = analysis_session_lifecycle.Detach(tap_id);
    // 이벤트 룰 runtime은 enter/exit/line-crossing 이전 상태를 들고 있으므로 tap 수명과 함께 정리한다.
    if (detach_result.removed) {
        ReleaseEventRuleApplicationRuntime("webrtc-overlay:" + tap_id);
        ReleaseEventRuleApplicationRuntime("tap-events:" + tap_id);
        ReleaseEventRuleApplicationRuntime("tap-overlay:" + tap_id);
        ReleaseEventRuleApplicationRuntime("tap-state-dump:" + tap_id);
        ReleaseEventRuleApplicationRuntime("tap-metrics:" + tap_id);
    }
    return detach_result.ok;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8818 function
template <typename Event>
std::string AnalysisEventJsonValue(const Event& event) {
    std::ostringstream out;
    out << "{"
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
    return out.str();
}

std::string AnalysisEventJson(const analysis::AnalysisEvent& event) {
    return AnalysisEventJsonValue(event);
}

std::string AnalysisEventJson(const EventRuleApplicationEvent& event) {
    return AnalysisEventJsonValue(event);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8846 function
std::string AnalysisEventsJson(const std::string& tap_id,
                               const std::optional<analysis::AnalysisResult>& result,
                               const EventRuleApplicationEvaluation* evaluation) {
    std::ostringstream out;
    out << "{"
        << "\"tapId\":\"" << JsonEscape(tap_id) << "\","
        << "\"hasResult\":" << (result.has_value() ? "true" : "false") << ","
        << "\"activeRuleCount\":" << (evaluation != nullptr ? evaluation->ActiveRuleCount() : 0) << ","
        << "\"matchedDetectionCount\":" << (evaluation != nullptr ? evaluation->MatchedDetectionCount() : 0)
        << ",\"events\":[";
    if (evaluation != nullptr) {
        for (std::size_t i = 0; i < evaluation->Events().size(); ++i) {
            if (i != 0) {
                out << ",";
            }
            out << AnalysisEventJson(evaluation->Events()[i]);
        }
    }
    out << "],\"result\":";
    if (evaluation != nullptr) {
        out << AnalysisResultJson(evaluation->AnnotatedResult());
    } else if (result.has_value()) {
        out << AnalysisResultJson(*result);
    } else {
        out << "null";
    }
    out << "}";
    return out.str();
}

std::string AnalysisEventsJson(
    const std::string& tap_id,
    const std::optional<AnalysisSessionApplicationResult>& result,
    const EventRuleApplicationEvaluation* evaluation) {
    std::ostringstream out;
    out << "{"
        << "\"tapId\":\"" << JsonEscape(tap_id) << "\","
        << "\"hasResult\":" << (result.has_value() ? "true" : "false") << ","
        << "\"activeRuleCount\":" << (evaluation != nullptr ? evaluation->ActiveRuleCount() : 0) << ","
        << "\"matchedDetectionCount\":" << (evaluation != nullptr ? evaluation->MatchedDetectionCount() : 0)
        << ",\"events\":[";
    if (evaluation != nullptr) {
        const auto& events = evaluation->ApplicationEvents();
        for (std::size_t i = 0; i < events.size(); ++i) {
            if (i != 0) out << ",";
            out << AnalysisEventJson(events[i]);
        }
    }
    out << "],\"result\":";
    if (evaluation != nullptr) {
        out << AnalysisResultJson(evaluation->ApplicationAnnotatedResult());
    } else if (result.has_value()) {
        out << AnalysisResultJson(*result);
    } else {
        out << "null";
    }
    out << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8876 function
WebRtcMediaApplicationMetadataChannelConfig BuildWebRtcMediaApplicationMetadataChannelConfigFromQuery(
    const std::unordered_map<std::string, std::string>& query) {
    const auto& app_config = GetWebRtcHttpRuntimeConfig();
    WebRtcMediaApplicationMetadataChannelConfig config;
    config.enabled = ParseBoolQuery(
        query,
        "vaMetadata",
        ParseBoolQuery(query,
                       "metadataChannel",
                       ParseBoolQuery(query,
                                      "vaDataChannel",
                                      app_config.webrtc_va_metadata_channel_enabled)));
    config.label = app_config.webrtc_va_metadata_channel_label;
    if (const auto it = query.find("vaMetadataLabel"); it != query.end() && !Trim(it->second).empty()) {
        config.label = Trim(it->second);
    }
    config.interval_ms = ParseClampedIntQuery(query,
                                              "vaMetadataIntervalMs",
                                              app_config.webrtc_va_metadata_interval_ms,
                                              0,
                                              60000);
    config.max_message_bytes = static_cast<std::size_t>(
        ParseClampedIntQuery(query,
                             "vaMetadataMaxMessageBytes",
                             static_cast<int>(app_config.webrtc_va_metadata_max_message_bytes),
                             256,
                             1048576));
    config.max_buffered_bytes = static_cast<std::size_t>(
        ParseClampedIntQuery(query,
                             "vaMetadataMaxBufferedBytes",
                             static_cast<int>(app_config.webrtc_va_metadata_max_buffered_bytes),
                             1024,
                             4194304));
    return config;
}

}  // namespace webrtc_http_server_detail

}  // namespace ingress

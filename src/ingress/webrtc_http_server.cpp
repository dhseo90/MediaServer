// 파일 요약: HTTP API와 제품 UI를 제공하는 내장 웹 서버 구현이다.
// 동작 요약: WebRTC simple signaling, WHEP, WHIP, /webrtc/config, analysis tap/rule/profile API를 처리한다.
// 동작 요약: Ops/Client/Auth HTML과 개발/검증 API, 정적 이미지 분석과 이벤트 POST 상태 응답도 이 파일에서 묶는다.
#include "ingress/webrtc_http_server.h"

#include <arpa/inet.h>
#include <netinet/in.h>
#include <sys/ioctl.h>
#include <sys/socket.h>
#include <sys/time.h>
#include <unistd.h>

#include <algorithm>
#include <array>
#include <atomic>
#include <cerrno>
#include <chrono>
#include <cctype>
#include <cstdint>
#include <cstring>
#include <fstream>
#include <filesystem>
#include <iostream>
#include <initializer_list>
#include <limits>
#include <mutex>
#include <optional>
#include <set>
#include <sstream>
#include <string>
#include <thread>
#include <unordered_map>
#include <utility>
#include <vector>

#include "app_config.h"
#include "analysis/category_tokens.h"
#include "analysis/detector.h"
#include "analysis/event_post_dispatcher.h"
#include "analysis/event_rule_engine.h"
#include "analysis/event_storage.h"
#include "analysis/image_frame_loader.h"
#include "analysis/metadata_subscription_filter.h"
#include "analysis/object_tracker.h"
#include "analysis/overlay_renderer.h"
#include "analysis/snapshot_encoder.h"
#include "analysis/va_runtime_metadata.h"
#include "core/runtime_debug_counters.h"
#include "core/stream_key.h"
#include "ingress/analysis_query.h"
#include "ingress/analysis_rule_registry.h"
#include "ingress/http_auth.h"
#include "ingress/request_parser.h"
#include "ingress/product_ui_assets.h"
#include "ingress/product_ui_css.h"
#include "ingress/product_ui_js.h"
#include "ingress/product_ui_page_scripts.h"
#include "ingress/source_view_registry.h"
#include "ingress/webrtc_egress_session.h"
#include "ingress/webrtc_source_registry.h"
#include "ingress/webrtc_source_session.h"

namespace ingress {

namespace {

std::atomic<std::uint64_t> g_web_rtc_metadata_sequence{0};
std::atomic<std::uint64_t> g_ops_audit_sequence{0};
std::mutex g_ops_audit_mu;

constexpr std::size_t kMaxHttpHeaderBytes = 64 * 1024;
constexpr std::size_t kMaxHttpBodyBytes = 2 * 1024 * 1024;
constexpr int kHttpSocketTimeoutSeconds = 5;
constexpr int kMaxActiveHttpConnections = 128;

std::string Trim(std::string value) {
    while (!value.empty() && std::isspace(static_cast<unsigned char>(value.front())) != 0) {
        value.erase(value.begin());
    }
    while (!value.empty() && std::isspace(static_cast<unsigned char>(value.back())) != 0) {
        value.pop_back();
    }
    return value;
}

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

std::string RefreshIconSvgHtml() {
    return R"(<svg class="refresh-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M21 12a9 9 0 1 1-2.64-6.36" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M21 3v6h-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>)";
}

std::string RefreshIconButtonHtml(const std::string& id,
                                  const std::string& classes,
                                  const std::string& label) {
    std::ostringstream out;
    out << "<button id=\"" << id << "\" class=\"" << classes
        << " refresh-icon-button\" type=\"button\" aria-label=\"" << label
        << "\" title=\"" << label << "\">" << RefreshIconSvgHtml() << "</button>";
    return out.str();
}

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

// JSON 문자열에서 object field 본문을 추출한다.
std::optional<std::string> ExtractObjectField(const std::string& body, const std::string& field) {
    return ExtractDelimitedField(body, field, '{', '}');
}

// JSON 문자열에서 array field 본문을 추출한다.
std::optional<std::string> ExtractArrayField(const std::string& body, const std::string& field) {
    return ExtractDelimitedField(body, field, '[', ']');
}

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

std::vector<std::string> StringArrayFieldValues(const std::string& body, const std::string& field) {
    const auto array = ExtractArrayField(body, field);
    return array.has_value() ? StringArrayValues(*array) : std::vector<std::string>{};
}

bool StringArrayIncludesAll(const std::vector<std::string>& source,
                            const std::vector<std::string>& required) {
    std::set<std::string> source_set(source.begin(), source.end());
    return std::all_of(required.begin(), required.end(), [&](const std::string& value) {
        return source_set.find(value) != source_set.end();
    });
}

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

// object 본문 안의 string array field가 비어 있지 않은지 확인한다.
bool HasNonEmptyStringArrayField(const std::string& body, const std::string& field) {
    const auto array = ExtractArrayField(body, field);
    return array.has_value() && StringArrayHasNonEmptyValue(*array);
}

bool LooksLikeJsonObject(const std::string& body) {
    const std::string trimmed = Trim(body);
    return trimmed.size() >= 2 && trimmed.front() == '{' && trimmed.back() == '}';
}

bool IsBuiltInAnalysisProfileId(const std::string& id) {
    return id == "1" || id == "2" || id == "3" || id == "4" || id == "5";
}

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

class AnalysisDocumentRegistry {
public:
    std::string ProfilesJson() {
        std::lock_guard lock(mu_);
        EnsureLoadedLocked();
        std::ostringstream out;
        out << "{\"status\":\"registry\",\"defaultUrl\":\"?file=...&va=1\","
            << "\"storagePath\":\"" << JsonEscape(storage_path_.string()) << "\","
            << "\"builtInProfiles\":" << BuiltInProfilesArrayJson() << ","
            << "\"profiles\":";
        AppendDocumentsArray(out, profiles_);
        out << ",\"queryOverride\":\"va=1은 기본적으로 서버 기본 VA profile을 사용한다. "
               "URL에 profileId/profile을 명시하면 해당 profile을 우선 적용하고, "
               "명시하지 않으면 현재 sourceKind/route/clientId와 맞는 rule의 analysis.profileId를 1차 자동 적용한다. "
               "fps/maxQueue/adaptive bounds 같은 고급 query가 있으면 registry 자동 profile 선택은 건너뛴다.\"}";
        return out.str();
    }

    std::string VaRulesJson() {
        std::lock_guard lock(mu_);
        EnsureLoadedLocked();
        std::ostringstream out;
        out << "{\"status\":\"registry\",\"storagePath\":\"" << JsonEscape(storage_path_.string()) << "\","
            << "\"scope\":\"저장된 vaRule은 영상 소스, 분석 profile, 이벤트 rule, scenario, geometry를 하나의 ID로 묶는다.\","
            << "\"url\":\"?vaRule=<id>\",\"vaRules\":";
        AppendDocumentsArray(out, va_rules_);
        out << "}";
        return out.str();
    }

    std::string RulesJson() {
        std::lock_guard lock(mu_);
        EnsureLoadedLocked();
        std::ostringstream out;
        out << "{\"status\":\"registry\",\"storagePath\":\"" << JsonEscape(storage_path_.string()) << "\","
            << "\"scope\":\"저장된 rule은 va=1 overlay와 /lab/analysis/taps/{id}/events에서 런타임 판정에 사용한다. "
               "sourceKind/route/clientId match 조건이 있으면 해당 분석 결과에만 적용한다.\","
            << "\"plannedRuleShape\":{\"id\":\"string\",\"enabled\":\"bool\",\"priority\":\"number\","
            << "\"match\":{\"sourceKind\":\"file|rtsp|webrtc|whep|http|hls|youtube|*\",\"route\":\"http|rtsp|webrtc|*\","
            << "\"clientId\":\"optional\"},\"analysis\":{\"profileId\":\"string\",\"detector\":\"dummy|yolo\","
            << "\"fps\":\"number\",\"maxQueue\":\"number\",\"frameSampleInterval\":\"number\","
            << "\"maxFrameAgeMs\":\"number\"},\"outputs\":{\"metadata\":\"bool\","
            << "\"snapshot\":\"bool\",\"overlay\":\"bool\",\"events\":\"bool\"},"
            << "\"eventActions\":{\"highlight\":{\"enabled\":\"bool\",\"mode\":\"blink\","
            << "\"durationMs\":\"number\",\"color\":\"fixed #ff0000\"},\"post\":{\"enabled\":\"bool\","
            << "\"method\":\"POST\",\"url\":\"string\",\"payloadFormat\":\"media-server.va.event.v1\"}}},"
            << "\"rules\":";
        AppendDocumentsArray(out, rules_);
        out << ",\"notImplementedYet\":[\"automatic rule matching for non-VA streams\","
               "\"long-running RTSP/WebRTC route matching validation\"]}";
        return out.str();
    }

    std::optional<std::string> ProfileJson(const std::string& id) {
        std::lock_guard lock(mu_);
        EnsureLoadedLocked();
        return FindDocumentLocked(profiles_, id);
    }

    std::optional<std::string> RuleJson(const std::string& id) {
        std::lock_guard lock(mu_);
        EnsureLoadedLocked();
        return FindDocumentLocked(rules_, id);
    }

    std::optional<std::string> VaRuleJson(const std::string& id) {
        std::lock_guard lock(mu_);
        EnsureLoadedLocked();
        return FindDocumentLocked(va_rules_, id);
    }

    std::vector<std::string> RuleDocuments() {
        std::lock_guard lock(mu_);
        EnsureLoadedLocked();
        std::vector<std::string> out;
        out.reserve(rules_.size());
        for (const auto& rule : rules_) {
            out.push_back(rule.body);
        }
        return out;
    }

    std::vector<std::string> VaRuleDocuments() {
        std::lock_guard lock(mu_);
        EnsureLoadedLocked();
        std::vector<std::string> out;
        out.reserve(va_rules_.size());
        for (const auto& rule : va_rules_) {
            out.push_back(rule.body);
        }
        return out;
    }

    std::vector<std::string> ProfileDocuments() {
        std::lock_guard lock(mu_);
        EnsureLoadedLocked();
        std::vector<std::string> out;
        out.reserve(profiles_.size());
        for (const auto& profile : profiles_) {
            out.push_back(profile.body);
        }
        return out;
    }

    bool CreateProfile(const std::string& body, std::string* response, std::string* error_message) {
        return CreateDocument(true, body, response, error_message);
    }

    bool CreateRule(const std::string& body, std::string* response, std::string* error_message) {
        return CreateDocument(false, body, response, error_message);
    }

    bool CreateVaRule(const std::string& body, std::string* response, std::string* error_message) {
        std::lock_guard lock(mu_);
        EnsureLoadedLocked();
        const auto prepared = PrepareVaRuleDocumentLocked("", body, error_message);
        if (!prepared.has_value()) {
            return false;
        }
        if (FindDocumentLocked(va_rules_, prepared->id).has_value()) {
            SetRegistryError(error_message, "vaRule id already exists");
            return false;
        }
        va_rules_.push_back(*prepared);
        SaveLocked();
        if (response != nullptr) {
            *response = DocumentResponseJson("vaRule", *prepared);
        }
        return true;
    }

    bool UpsertProfile(const std::string& id, const std::string& body, std::string* response, std::string* error_message) {
        return UpsertDocument(true, id, body, response, error_message);
    }

    bool UpsertRule(const std::string& id, const std::string& body, std::string* response, std::string* error_message) {
        return UpsertDocument(false, id, body, response, error_message);
    }

    bool UpsertVaRule(const std::string& id, const std::string& body, std::string* response, std::string* error_message) {
        std::lock_guard lock(mu_);
        EnsureLoadedLocked();
        const auto prepared = PrepareVaRuleDocumentLocked(id, body, error_message);
        if (!prepared.has_value()) {
            return false;
        }
        bool updated = false;
        for (auto& item : va_rules_) {
            if (item.id == prepared->id) {
                item = *prepared;
                updated = true;
                break;
            }
        }
        if (!updated) {
            va_rules_.push_back(*prepared);
        }
        SaveLocked();
        if (response != nullptr) {
            *response = DocumentResponseJson("vaRule", *prepared, updated ? "updated" : "created");
        }
        return true;
    }

    bool DeleteProfile(const std::string& id) {
        std::lock_guard lock(mu_);
        EnsureLoadedLocked();
        if (IsBuiltInAnalysisProfileId(id)) {
            return false;
        }
        const bool removed = RemoveDocumentLocked(profiles_, id);
        if (removed) {
            SaveLocked();
        }
        return removed;
    }

    bool DeleteRule(const std::string& id) {
        std::lock_guard lock(mu_);
        EnsureLoadedLocked();
        const bool removed = RemoveDocumentLocked(rules_, id);
        if (removed) {
            SaveLocked();
        }
        return removed;
    }

    bool DeleteVaRule(const std::string& id) {
        std::lock_guard lock(mu_);
        EnsureLoadedLocked();
        const bool removed = RemoveDocumentLocked(va_rules_, id);
        if (removed) {
            SaveLocked();
        }
        return removed;
    }

private:
    struct Document {
        std::string id;
        std::string body;
    };

    static std::string BuiltInProfilesArrayJson() {
        return R"([{"id":"1","detector":"server-config","adaptive":true,"trackingClasses":["person","vehicle"],"description":"URL에는 va=1만 두고 detector/model/labels/fps 기본값은 stdafx.h/env 설정을 따른다. tracker는 기본적으로 사람/차량 카테고리에만 ID를 붙인다."},{"id":"2","detector":"dummy","fps":5,"maxQueue":2,"trackingClasses":["person","vehicle"],"description":"raw decode/sampling lifecycle 확인용"},{"id":"3","detector":"yolo","fps":8,"maxQueue":1,"preprocess":"letterbox","inputWidth":640,"inputHeight":640,"confidence":0.25,"nms":0.45,"adaptive":true,"trackingClasses":["person","vehicle"],"description":"움직임이 큰 장면의 overlay 지연 최소화"},{"id":"4","detector":"yolo","fps":5,"maxQueue":2,"preprocess":"letterbox","inputWidth":640,"inputHeight":640,"confidence":0.35,"nms":0.45,"adaptive":true,"trackingClasses":["person","vehicle"],"description":"기본 객체 감지 균형값"},{"id":"5","detector":"yolo","fps":3,"maxQueue":2,"preprocess":"letterbox","inputWidth":960,"inputHeight":960,"confidence":0.35,"nms":0.45,"adaptive":true,"trackingClasses":["person","vehicle"],"description":"정확도 우선, CPU 비용 증가"}])";
    }

    static void AppendDocumentsArray(std::ostream& out, const std::vector<Document>& documents) {
        out << "[";
        for (std::size_t i = 0; i < documents.size(); ++i) {
            if (i != 0) {
                out << ",";
            }
            out << documents[i].body;
        }
        out << "]";
    }

    void EnsureLoadedLocked() {
        if (loaded_) {
            return;
        }
        loaded_ = true;
        storage_path_ = app::GetAppConfig().analysis_registry_path;
        std::ifstream in(storage_path_);
        if (!in) {
            return;
        }
        std::ostringstream buffer;
        buffer << in.rdbuf();
        const std::string content = buffer.str();
        LoadDocumentsLocked("profiles", content, &profiles_);
        LoadDocumentsLocked("rules", content, &rules_);
        LoadDocumentsLocked("vaRules", content, &va_rules_);
    }

    static void LoadDocumentsLocked(const std::string& field,
                                    const std::string& content,
                                    std::vector<Document>* documents) {
        if (documents == nullptr) {
            return;
        }
        for (const auto& raw : ExtractJsonObjectArray(content, field)) {
            const auto id = ParseStringField(raw, "id");
            if (!id.has_value() || id->empty()) {
                continue;
            }
            documents->push_back(Document{*id, Trim(raw)});
        }
    }

    bool CreateDocument(bool profile, const std::string& body, std::string* response, std::string* error_message) {
        std::lock_guard lock(mu_);
        EnsureLoadedLocked();
        const auto prepared = PrepareDocumentLocked(profile, "", body, error_message);
        if (!prepared.has_value()) {
            return false;
        }
        auto& target = profile ? profiles_ : rules_;
        if (FindDocumentLocked(target, prepared->id).has_value() ||
            (profile && IsBuiltInAnalysisProfileId(prepared->id))) {
            SetRegistryError(error_message, "analysis document id already exists");
            return false;
        }
        target.push_back(*prepared);
        SaveLocked();
        if (response != nullptr) {
            *response = DocumentResponseJson(profile ? "profile" : "rule", *prepared);
        }
        return true;
    }

    bool UpsertDocument(bool profile,
                        const std::string& id,
                        const std::string& body,
                        std::string* response,
                        std::string* error_message) {
        std::lock_guard lock(mu_);
        EnsureLoadedLocked();
        if (profile && IsBuiltInAnalysisProfileId(id)) {
            SetRegistryError(error_message, "built-in profile cannot be modified");
            return false;
        }
        const auto prepared = PrepareDocumentLocked(profile, id, body, error_message);
        if (!prepared.has_value()) {
            return false;
        }
        auto& target = profile ? profiles_ : rules_;
        bool updated = false;
        for (auto& item : target) {
            if (item.id == prepared->id) {
                item = *prepared;
                updated = true;
                break;
            }
        }
        if (!updated) {
            target.push_back(*prepared);
        }
        SaveLocked();
        if (response != nullptr) {
            *response = DocumentResponseJson(profile ? "profile" : "rule", *prepared, updated ? "updated" : "created");
        }
        return true;
    }

    std::optional<Document> PrepareDocumentLocked(bool profile,
                                                  const std::string& path_id,
                                                  const std::string& body,
                                                  std::string* error_message) const {
        if (!LooksLikeJsonObject(body)) {
            SetRegistryError(error_message, "request body must be a JSON object");
            return std::nullopt;
        }
        const auto id = ParseStringField(body, "id");
        if (!id.has_value() || id->empty()) {
            SetRegistryError(error_message, "analysis document requires string field 'id'");
            return std::nullopt;
        }
        if (!path_id.empty() && *id != path_id) {
            SetRegistryError(error_message, "path id and body id must match");
            return std::nullopt;
        }
        if (!std::all_of(id->begin(), id->end(), [](unsigned char ch) {
                return std::isdigit(ch) != 0;
            })) {
            SetRegistryError(error_message, profile ? "profile id must be numeric" : "rule id must be numeric");
            return std::nullopt;
        }
        if (profile && IsBuiltInAnalysisProfileId(*id)) {
            SetRegistryError(error_message, "built-in profile id is reserved");
            return std::nullopt;
        }
        // UI/API 양쪽에서 빈 카테고리 저장을 막아, 룰이 의도 없이 전체 매칭처럼 동작하지 않게 한다.
        if (profile) {
            if (const auto tracking_classes = ExtractArrayField(body, "trackingClasses");
                tracking_classes.has_value() && !StringArrayHasNonEmptyValue(*tracking_classes)) {
                SetRegistryError(error_message, "profile trackingClasses must include at least one category");
                return std::nullopt;
            }
            if (const auto tracking_classes = ParseStringField(body, "trackingClasses");
                tracking_classes.has_value() && Trim(*tracking_classes).empty()) {
                SetRegistryError(error_message, "profile trackingClasses must include at least one category");
                return std::nullopt;
            }
        } else {
            const auto analysis = ExtractObjectField(body, "analysis");
            if (!analysis.has_value() || !HasNonEmptyStringArrayField(*analysis, "classes")) {
                SetRegistryError(error_message, "rule analysis.classes must include at least one category");
                return std::nullopt;
            }
        }
        return Document{*id, Trim(body)};
    }

    std::optional<Document> PrepareVaRuleDocumentLocked(const std::string& path_id,
                                                        const std::string& body,
                                                        std::string* error_message) const {
        if (!LooksLikeJsonObject(body)) {
            SetRegistryError(error_message, "request body must be a JSON object");
            return std::nullopt;
        }
        std::string id = ParseStringField(body, "id").value_or("");
        if (id.empty()) {
            id = path_id.empty() ? NextVaRuleIdLocked() : path_id;
        }
        if (!path_id.empty() && id != path_id) {
            SetRegistryError(error_message, "path id and body id must match");
            return std::nullopt;
        }
        if (id.empty() || !std::all_of(id.begin(), id.end(), [](unsigned char ch) {
                return std::isdigit(ch) != 0;
            })) {
            SetRegistryError(error_message, "vaRule id must be numeric");
            return std::nullopt;
        }
        const auto source = ExtractObjectField(body, "source");
        if (!source.has_value()) {
            SetRegistryError(error_message, "vaRule requires object field 'source'");
            return std::nullopt;
        }
        const std::string source_kind = ParseStringField(*source, "kind").value_or("");
        if (source_kind.empty()) {
            SetRegistryError(error_message, "vaRule source.kind is required");
            return std::nullopt;
        }
        if (source_kind == "file") {
            if (!ParseStringField(*source, "file").has_value() ||
                Trim(*ParseStringField(*source, "file")).empty()) {
                SetRegistryError(error_message, "vaRule source.file is required for file source");
                return std::nullopt;
            }
        } else if (!ParseStringField(*source, "url").has_value() ||
                   Trim(*ParseStringField(*source, "url")).empty()) {
            SetRegistryError(error_message, "vaRule source.url is required for non-file source");
            return std::nullopt;
        }
        const auto analysis = ExtractObjectField(body, "analysis");
        if (!analysis.has_value() || !HasNonEmptyStringArrayField(*analysis, "classes")) {
            SetRegistryError(error_message, "vaRule analysis.classes must include at least one category");
            return std::nullopt;
        }
        const std::vector<std::string> va_rule_classes = StringArrayFieldValues(*analysis, "classes");
        const std::string profile_id = Trim(ParseStringField(*analysis, "profileId").value_or(""));
        if (profile_id.empty()) {
            SetRegistryError(error_message, "vaRule analysis.profileId is required");
            return std::nullopt;
        }
        if (!ProfileExistsLocked(profile_id)) {
            SetRegistryError(error_message, "vaRule analysis.profileId does not exist");
            return std::nullopt;
        }
        const auto template_start = ExtractObjectField(body, "templateStart");
        const std::string template_rule_id =
            template_start.has_value() ? Trim(ParseStringField(*template_start, "ruleId").value_or(""))
                                       : std::string();
        if (template_rule_id.empty()) {
            SetRegistryError(error_message, "vaRule requires templateStart.ruleId");
            return std::nullopt;
        }
        const auto template_document = FindDocumentLocked(rules_, template_rule_id);
        if (!template_document.has_value()) {
            SetRegistryError(error_message, "vaRule templateStart.ruleId does not exist");
            return std::nullopt;
        }
        const std::vector<std::string> template_classes = AnalysisClassesFromDocument(*template_document);
        if (!template_classes.empty() && !StringArrayIncludesAll(va_rule_classes, template_classes)) {
            SetRegistryError(error_message,
                             "vaRule analysis.classes must include template analysis.classes");
            return std::nullopt;
        }
        if (const auto profile_document = FindDocumentLocked(profiles_, profile_id);
            profile_document.has_value()) {
            const std::vector<std::string> profile_classes = AnalysisClassesFromDocument(*profile_document);
            if (!profile_classes.empty() &&
                !StringArrayIncludesAll(profile_classes, template_classes)) {
                SetRegistryError(error_message,
                                 "vaRule profile classes must include template analysis.classes");
                return std::nullopt;
            }
        }
        std::string normalized = Trim(body);
        if (!ParseStringField(normalized, "id").has_value()) {
            normalized.insert(normalized.find('{') + 1, "\"id\":\"" + JsonEscape(id) + "\",");
        }
        if (!ExtractObjectField(normalized, "match").has_value()) {
            normalized.insert(normalized.find('{') + 1,
                              "\"match\":{\"sourceKind\":\"*\",\"route\":\"*\",\"vaRule\":\"" +
                                  JsonEscape(id) + "\"},");
        }
        return Document{id, normalized};
    }

    std::string NextVaRuleIdLocked() const {
        std::uint64_t next_id = 1;
        for (const auto& item : va_rules_) {
            char* end = nullptr;
            const unsigned long long parsed = std::strtoull(item.id.c_str(), &end, 10);
            if (end != item.id.c_str() && *end == '\0') {
                next_id = std::max(next_id, static_cast<std::uint64_t>(parsed) + 1);
            }
        }
        return std::to_string(next_id);
    }

    static std::optional<std::string> FindDocumentLocked(const std::vector<Document>& documents,
                                                         const std::string& id) {
        for (const auto& item : documents) {
            if (item.id == id) {
                return item.body;
            }
        }
        return std::nullopt;
    }

    bool ProfileExistsLocked(const std::string& id) const {
        return IsBuiltInAnalysisProfileId(id) || FindDocumentLocked(profiles_, id).has_value();
    }

    static bool RemoveDocumentLocked(std::vector<Document>& documents, const std::string& id) {
        const auto old_size = documents.size();
        documents.erase(std::remove_if(documents.begin(),
                                       documents.end(),
                                       [&id](const Document& item) { return item.id == id; }),
                        documents.end());
        return documents.size() != old_size;
    }

    static std::string DocumentResponseJson(const std::string& key,
                                            const Document& document,
                                            const std::string& status = "created") {
        return "{\"ok\":true,\"status\":\"" + JsonEscape(status) + "\",\"" + key + "\":" + document.body + "}";
    }

    static void SetRegistryError(std::string* error_message, const std::string& message) {
        if (error_message != nullptr) {
            *error_message = message;
        }
    }

    void SaveLocked() const {
        if (storage_path_.empty()) {
            return;
        }
        const auto parent = storage_path_.parent_path();
        std::error_code ec;
        if (!parent.empty()) {
            std::filesystem::create_directories(parent, ec);
        }
        std::ofstream out(storage_path_, std::ios::trunc);
        if (!out) {
            std::cerr << "[analysis-registry] failed to open " << storage_path_ << " for write\n";
            return;
        }
        out << "{\n  \"profiles\": ";
        AppendDocumentsArray(out, profiles_);
        out << ",\n  \"rules\": ";
        AppendDocumentsArray(out, rules_);
        out << ",\n  \"vaRules\": ";
        AppendDocumentsArray(out, va_rules_);
        out << "\n}\n";
    }

    mutable std::mutex mu_;
    bool loaded_{false};
    std::filesystem::path storage_path_;
    std::vector<Document> profiles_;
    std::vector<Document> rules_;
    std::vector<Document> va_rules_;
};

AnalysisDocumentRegistry& AnalysisRegistry() {
    static AnalysisDocumentRegistry registry;
    return registry;
}

struct HttpRequest {
    std::string method;
    std::string target;
    std::string path;
    std::string query;
    std::unordered_map<std::string, std::string> headers;
    std::string body;
};

struct HttpResponse {
    int status{200};
    std::string status_text{"OK"};
    std::string content_type{"text/plain; charset=utf-8"};
    std::unordered_map<std::string, std::string> headers;
    std::string body;
};

std::string HeaderValue(const HttpRequest& request, const std::string& key);
std::string LowerAscii(std::string value);

constexpr const char* kCorsAllowHeaders = "Content-Type, Authorization, X-Session-Capability";
constexpr const char* kCorsAllowMethods = "GET, POST, PUT, PATCH, DELETE, OPTIONS";

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

std::string CorsRequestOrigin(const HttpRequest& request) {
    std::string origin = Trim(HeaderValue(request, "Origin"));
    if (origin.find('\r') != std::string::npos || origin.find('\n') != std::string::npos) {
        return "";
    }
    return origin;
}

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

bool IsCorsOriginDenied(const HttpRequest& request) {
    return !CorsRequestOrigin(request).empty() && !IsCorsOriginAllowed(request);
}

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

HttpResponse CorsForbiddenResponse() {
    return HttpResponse{403,
                        "Forbidden",
                        "text/plain; charset=utf-8",
                        {},
                        "cross-origin requests are not allowed"};
}

HttpResponse CorsPreflightResponse(const HttpRequest& request) {
    if (IsCorsOriginDenied(request)) {
        return CorsForbiddenResponse();
    }
    HttpResponse response{204, "No Content", "text/plain; charset=utf-8", {}, ""};
    AddCorsHeadersForRequest(&request, &response);
    return response;
}

std::string BuildHttpResponse(const HttpResponse& response, const HttpRequest* request = nullptr) {
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

HttpResponse PlainTextResponse(int status, const std::string& status_text, const std::string& body) {
    return HttpResponse{status, status_text, "text/plain; charset=utf-8", {}, body};
}

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

ssize_t RecvHttpBytes(int client_fd, char* buffer, std::size_t buffer_size) {
    for (;;) {
        const ssize_t read_bytes = recv(client_fd, buffer, buffer_size, 0);
        if (read_bytes < 0 && errno == EINTR) {
            continue;
        }
        return read_bytes;
    }
}

bool IsRecvTimeout() {
    return errno == EAGAIN || errno == EWOULDBLOCK || errno == ETIMEDOUT;
}

void SetHttpSocketTimeouts(int client_fd) {
    timeval timeout{};
    timeout.tv_sec = kHttpSocketTimeoutSeconds;
    timeout.tv_usec = 0;
    (void)setsockopt(client_fd, SOL_SOCKET, SO_RCVTIMEO, &timeout, sizeof(timeout));
    (void)setsockopt(client_fd, SOL_SOCKET, SO_SNDTIMEO, &timeout, sizeof(timeout));
}

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


std::string AnalysisCategoryCatalogJson();

}  // namespace

struct WebRtcHttpServer::Impl {
    struct SessionEntry {
        std::string session_id;
        std::string ingress_client_id;
        std::string analysis_tap_id;
        std::string session_capability;
        auth::Principal owner_principal;
        media::IngressRequest request;
        std::shared_ptr<WebRtcEgressSession> bridge;
    };

    struct SourceSessionEntry {
        std::string session_id;
        std::string source_id;
        std::string session_capability;
        auth::Principal owner_principal;
        std::shared_ptr<WebRtcSourceSession> bridge;
    };

    struct ClientSessionEntry {
        std::string client_session_id;
        std::string view_id;
        std::string session_id;
        auth::Principal owner_principal;
    };

    struct AuthSessionEntry {
        std::string session_id;
        auth::Principal principal;
        std::chrono::system_clock::time_point expires_at;
        std::chrono::system_clock::time_point last_seen_at;
    };

    struct PublicAccessRequestRateEntry {
        std::chrono::steady_clock::time_point window_started_at{};
        int attempts{0};
    };

    explicit Impl(core::SessionManager& manager) : session_manager(manager) {}

    bool AllowPublicAccessRequestAttempt(const std::string& peer_key,
                                         int* retry_after_seconds) {
        static constexpr int kRateLimit = 5;
        static constexpr int kWindowSeconds = 300;
        const auto now = std::chrono::steady_clock::now();
        const auto window = std::chrono::seconds(kWindowSeconds);
        const std::string key = peer_key.empty() ? "unknown" : peer_key;
        std::lock_guard lock(public_access_request_rate_mu);
        for (auto it = public_access_request_rate.begin();
             it != public_access_request_rate.end();) {
            if (now - it->second.window_started_at >= window * 2) {
                it = public_access_request_rate.erase(it);
            } else {
                ++it;
            }
        }
        PublicAccessRequestRateEntry& entry = public_access_request_rate[key];
        if (entry.attempts == 0 || now - entry.window_started_at >= window) {
            entry.window_started_at = now;
            entry.attempts = 0;
        }
        if (entry.attempts >= kRateLimit) {
            if (retry_after_seconds != nullptr) {
                const auto elapsed = std::chrono::duration_cast<std::chrono::seconds>(
                    now - entry.window_started_at);
                *retry_after_seconds = std::max(1, kWindowSeconds - static_cast<int>(elapsed.count()));
            }
            return false;
        }
        ++entry.attempts;
        if (retry_after_seconds != nullptr) {
            *retry_after_seconds = 0;
        }
        return true;
    }

    core::SessionManager& session_manager;
    std::string listen_address;
    std::uint16_t port{0};
    int listen_fd{-1};
    std::thread accept_thread;
    std::mutex mu;
    std::mutex auth_mu;
    std::unordered_map<std::string, SessionEntry> sessions;
    std::unordered_map<std::string, SourceSessionEntry> source_sessions;
    std::unordered_map<std::string, ClientSessionEntry> client_sessions;
    std::unordered_map<std::string, AuthSessionEntry> auth_sessions;
    std::mutex public_access_request_rate_mu;
    std::unordered_map<std::string, PublicAccessRequestRateEntry> public_access_request_rate;
    std::atomic<std::uint64_t> next_session_id{1};
    std::atomic<int> active_http_connections{0};
    std::atomic<int> active_sse_metadata_clients{0};
    std::atomic<int> active_ws_metadata_clients{0};
};

WebRtcHttpServer::WebRtcHttpServer(core::SessionManager& session_manager)
    : session_manager_(session_manager), impl_(std::make_unique<Impl>(session_manager)) {}

WebRtcHttpServer::~WebRtcHttpServer() {
    Stop();
}

namespace {

HttpResponse JsonResponse(int status, const std::string& status_text, const std::string& body) {
    HttpResponse response;
    response.status = status;
    response.status_text = status_text;
    response.content_type = "application/json; charset=utf-8";
    response.body = body;
    return response;
}

HttpResponse RegistryHttpResponse(const RegistryResult& result) {
    return JsonResponse(result.status, result.status_text, result.body);
}

HttpResponse AuthUserHttpResponse(const auth::AuthUserResult& result) {
    return JsonResponse(result.status, result.status_text, result.body);
}

HttpResponse AuthErrorResponse(const std::string& error) {
    HttpResponse response = JsonResponse(401,
                                         "Unauthorized",
                                         "{\"error\":\"" + JsonEscape(error) + "\"}");
    response.headers["WWW-Authenticate"] = "Bearer";
    return response;
}

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

std::string WhoamiJson(const auth::AuthResult& result,
                       const auth::BootstrapState& bootstrap_state,
                       const app::AppConfig& config) {
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

std::string DefaultHomePath(const app::AppConfig& config) {
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

std::string RoleLandingPath(const auth::Principal& principal, const app::AppConfig& config) {
    if (principal.password_change_required) {
        return "/password/change";
    }
    if (principal.role == "viewer") {
        return config.enable_client ? "/client/live" : "/login";
    }
    if (principal.role == "admin" || principal.role == "operator") {
        return config.enable_ops ? "/ops/home" : DefaultHomePath(config);
    }
    return "/login";
}

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

std::string AuthCookieHeader(const app::AppConfig& config,
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

std::string ExpiredAuthCookieHeader(const app::AppConfig& config) {
    std::ostringstream out;
    out << config.auth_cookie_name
        << "=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0";
    if (config.auth_cookie_secure) {
        out << "; Secure";
    }
    return out.str();
}

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

HttpResponse HtmlPageResponse(std::string body,
                              int status = 200,
                              const std::string& status_text = "OK") {
    HttpResponse response;
    response.status = status;
    response.status_text = status_text;
    response.content_type = "text/html; charset=utf-8";
    response.headers["Cache-Control"] = "no-store";
    response.body = std::move(body);
    return response;
}

HttpResponse StatusPageResponse(int status,
                                const std::string& status_text,
                                const std::string& title,
                                const std::string& message,
                                const std::string& action_href,
                                const std::string& action_label) {
    return HtmlPageResponse(StatusPageHtml(title, message, action_href, action_label), status, status_text);
}

HttpResponse UnauthorizedPageResponse() {
    return StatusPageResponse(401,
                              "Unauthorized",
                              "Login Required",
                              "계정으로 로그인한 뒤 다시 접근하세요.",
                              "/login",
                              "Go to Login");
}

HttpResponse ForbiddenPageResponse(const std::string& message) {
    return StatusPageResponse(403,
                              "Forbidden",
                              "Access Denied",
                              message,
                              "/",
                              "Go Home");
}

void AppendProductAccountMenu(std::ostringstream& out,
                             const auth::Principal& principal,
                             const std::string& secondary_action_href = std::string(),
                             const std::string& secondary_action_label = std::string()) {
    out << R"(        <div class="account-menu" aria-label="현재 계정">
          <div class="account-menu-top">
            )" << ProductThemeToggleButtonHtml() << R"(
)";
    if (!secondary_action_href.empty() && !secondary_action_label.empty()) {
        out << R"(            <a class="button button-secondary account-shortcut" href=")"
            << HtmlEscape(secondary_action_href) << R"(">)"
            << HtmlEscape(secondary_action_label) << R"(</a>
)";
    }
    out << R"(
            <div class="account-identity">
              )" << ProductAccountAvatarSvg() << R"(
              <div class="account-copy">
                <div class="account-name">)" << HtmlEscape(principal.display_name) << R"(</div>
                <div class="account-meta">권한: )" << HtmlEscape(principal.role) << R"(</div>
              </div>
            </div>
          </div>
          <form method="post" action="/logout"><button class="button-secondary" type="submit">로그아웃</button></form>
        </div>
)";
}

void AppendImageNavLink(std::ostringstream& out,
                        const std::string& href,
                        const std::string& key,
                        const std::string& label,
                        bool active,
                        const std::string& extra_attributes = "") {
    out << "        <a class=\"image-nav" << (active ? " active" : "") << "\" href=\""
        << HtmlEscape(href) << "\"";
    if (!extra_attributes.empty()) {
        out << " " << extra_attributes;
    }
    out << ">" << ProductNavIconSvg(key) << "<span>" << HtmlEscape(label) << "</span></a>\n";
}

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

void AppendOpsShellStart(std::ostringstream& out,
                         const auth::Principal& principal,
                         const std::string& active,
                         const std::string& subtitle) {
    (void)subtitle;
    out << R"(<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>운영 콘솔</title>
)" << ProductThemeBootScript() << ProductUiCss() << ProductSharedUiScript() << R"(</head>
<body class="product-shell">
  <main class="product-page">
    <header class="app-chrome">
      <div class="app-header-top">
        <nav class="image-nav-tabs" aria-label="운영 메뉴">
)";
    AppendImageNavLink(out, "/ops/home", "home", "홈", active == "home");
    AppendImageNavLink(out, "/ops/dashboard", "dashboard", "대시보드", active == "dashboard");
    AppendImageNavLink(out, "/ops/sources", "channels", "채널", active == "sources");
    AppendImageNavLink(out, "/ops/rules", "rules", "룰", active == "rules");
    if (auth::IsAdmin(principal)) {
        AppendImageNavLink(out, "/ops/users", "users", "사용자", active == "users", "data-admin-only");
    }
    AppendImageNavLink(out, "/client/live", "client", "클라이언트", false);
    out << R"(        </nav>
)";
    AppendProductAccountMenu(out, principal);
    out << R"(      </div>
    </header>
)";
}

void AppendOpsShellEnd(std::ostringstream& out) {
    AppendProductThemeScript(out);
    out << R"(  </main>
</body>
</html>)";
}

void AppendAuthShellStart(std::ostringstream& out,
                          const std::string& title,
                          const std::string& eyebrow,
                          const std::string& card_extra_class = "") {
    out << R"(<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>)" << HtmlEscape(title) << R"(</title>
)" << ProductThemeBootScript() << ProductUiCss() << ProductSharedUiScript() << R"(
</head>
<body class="auth-shell">
  <div class="auth-theme-control">)" << ProductThemeToggleButtonHtml() << R"(</div>
  <main class="auth-card)" << (card_extra_class.empty() ? "" : " " + HtmlEscape(card_extra_class)) << R"(">
    <div class="auth-actions">
      <p class="eyebrow">)" << HtmlEscape(eyebrow) << R"(</p>
    </div>
)";
}

void AppendAuthShellEnd(std::ostringstream& out) {
    AppendProductThemeScript(out);
    out << R"(
  </main>
</body>
</html>)";
}

std::string LoginPageHtml(const std::string& message, bool failed) {
    std::ostringstream out;
    AppendAuthShellStart(out, "MediaServer Login", "MediaServer");
    out << R"(    <form class="auth-form" method="post" action="/login">
      <h1>로그인</h1>
)";
    if (!message.empty()) {
        out << "      <div class=\"message" << (failed ? " error" : "") << "\">"
            << HtmlEscape(message) << "</div>\n";
    }
    out << R"(      <label>계정명
        <input name="username" autocomplete="username" required />
      </label>
      <label>비밀번호
        <input name="password" type="password" autocomplete="current-password" required />
      </label>
      <button class="primary" type="submit">로그인</button>
    </form>
)";
    AppendAuthShellEnd(out);
    return out.str();
}

std::string PasswordPolicyHintHtml() {
    return R"(<p class="hint">기본 kr-privacy 정책: 대문자/소문자/숫자/특수문자 중 3종류 이상이면 최소 8자, 2종류 조합이면 최소 10자입니다. username, 반복 문자, 연속 숫자, 키보드 배열, 흔한 비밀번호, 이전 비밀번호 재사용은 허용하지 않습니다.</p>)";
}

std::string SetupPageHtml(const std::string& message, bool failed) {
    std::ostringstream out;
    AppendAuthShellStart(out, "MediaServer Setup", "Initial Setup");
    out << R"(    <form class="auth-form" method="post" action="/setup">
      <h1>관리자 설정</h1>
      <p>기본 admin 계정에 강한 비밀번호를 설정한 뒤 제품 화면으로 이동합니다.</p>
)";
    if (!message.empty()) {
        out << "      <div class=\"message" << (failed ? " error" : "") << "\">"
            << HtmlEscape(message) << "</div>\n";
    }
    out << R"(      <label>계정명
        <input name="username" value="admin" readonly />
      </label>
      <label>비밀번호
        <input name="password" type="password" autocomplete="new-password" required />
      </label>
      <label>비밀번호 확인
        <input name="confirm" type="password" autocomplete="new-password" required />
      </label>
      )" << PasswordPolicyHintHtml() << R"(
      <button class="primary" type="submit">관리자 비밀번호 설정</button>
    </form>
)";
    AppendAuthShellEnd(out);
    return out.str();
}

std::string InviteSetupPageHtml(const std::string& token,
                                const std::string& message,
                                bool failed) {
    std::ostringstream out;
    AppendAuthShellStart(out, "초대 설정", "Invite Setup");
    out << R"(    <form class="auth-form" method="post" action="/invite/setup">
      <h1>초대 계정 설정</h1>
      <p>관리자가 발급한 초대 토큰으로 비밀번호를 설정합니다.</p>
)";
    if (!message.empty()) {
        out << "      <div class=\"message" << (failed ? " error" : "") << "\">"
            << HtmlEscape(message) << "</div>\n";
    }
    out << R"(      <label>초대 토큰
        <input name="token" value=")" << HtmlEscape(token) << R"(" autocomplete="off" required />
      </label>
      <label>비밀번호
        <input name="password" type="password" autocomplete="new-password" required />
      </label>
      <label>비밀번호 확인
        <input name="confirm" type="password" autocomplete="new-password" required />
      </label>
      )" << PasswordPolicyHintHtml() << R"(
      <button type="submit">비밀번호 설정</button>
    </form>
)";
    AppendAuthShellEnd(out);
    return out.str();
}

std::string ClientAccessRequestPageHtml() {
    std::ostringstream out;
    AppendAuthShellStart(out, "접근 요청", "Client Access", "auth-card-wide");
    out << R"(    <form id="request-form" class="auth-form">
      <h1>접근 요청</h1>
      <p>요청은 pending 상태로 저장되며 admin 승인 전에는 로그인이나 view 접근이 허용되지 않습니다.</p>
      <div id="message" class="message" hidden></div>
      <label>계정명<input name="username" autocomplete="username" required /></label>
      <label>표시 이름<input name="displayName" /></label>
      <label>연락처<input name="contact" autocomplete="email" /></label>
      <label>요청 채널 ID<input name="viewId" placeholder="선택 사항" /></label>
      <label>사유<textarea name="reason" required></textarea></label>
      <button type="submit">요청 제출</button>
    </form>
)";
    AppendClientAccessRequestScript(out);
    AppendAuthShellEnd(out);
    return out.str();
}

std::string PasswordChangePageHtml(const auth::Principal& principal,
                                   const std::string& message,
                                   bool failed) {
    std::ostringstream out;
    AppendAuthShellStart(out, "비밀번호 변경", "Password Change");
    out << R"(    <form class="auth-form" method="post" action="/password/change">
      <h1>비밀번호 변경</h1>
      <p>)" << HtmlEscape(principal.display_name) << R"( 계정의 비밀번호를 새 정책에 맞게 변경합니다.</p>
)";
    if (!message.empty()) {
        out << "      <div class=\"message" << (failed ? " error" : "") << "\">"
            << HtmlEscape(message) << "</div>\n";
    }
    out << R"(      <label>현재 비밀번호
        <input name="currentPassword" type="password" autocomplete="current-password" required />
      </label>
      <label>새 비밀번호
        <input name="password" type="password" autocomplete="new-password" required />
      </label>
      <label>새 비밀번호 확인
        <input name="confirm" type="password" autocomplete="new-password" required />
      </label>
      )" << PasswordPolicyHintHtml() << R"(
      <button type="submit">비밀번호 변경</button>
    </form>
)";
    AppendAuthShellEnd(out);
    return out.str();
}

std::string AuthLandingPageHtml(const auth::Principal& principal,
                                const std::string& title,
                                const std::string& body) {
    std::ostringstream out;
    out << R"(<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>)" << HtmlEscape(title) << R"(</title>
)" << ProductThemeBootScript() << ProductUiCss() << ProductSharedUiScript() << R"(
</head>
<body class="product-shell">
  <main class="product-page">
    <header class="app-header">
      <div class="app-header-top">
      <div>
        <h1>)" << HtmlEscape(title) << R"(</h1>
        <p>)" << HtmlEscape(body) << R"(</p>
      </div>
      <div class="header-utilities">
        )" << ProductThemeToggleButtonHtml() << R"(
        <form method="post" action="/logout"><button class="button-secondary" type="submit">로그아웃</button></form>
      </div>
      </div>
    </header>
    <section class="panel">
      <strong>)" << HtmlEscape(principal.display_name) << R"(</strong>
      <div class="meta">
        <span class="chip">권한: )" << HtmlEscape(principal.role) << R"(</span>
        <span class="chip">인증: )" << HtmlEscape(principal.auth_mode) << R"(</span>
      </div>
      <p>)";
    for (std::size_t i = 0; i < principal.scopes.size(); ++i) {
        if (i != 0) {
            out << " · ";
        }
        out << HtmlEscape(principal.scopes[i]);
    }
    out << R"(</p>
    </section>
)";
    if (auth::RequireRole(principal, {"operator"})) {
        out << R"(    <section class="section-card"><a class="button button-primary" href="/ops/sources">채널 관리</a></section>
)";
    }
    AppendProductThemeScript(out);
    out << R"(
  </main>
</body>
</html>)";
    return out.str();
}

void AppendOpsDashboardPage(std::ostringstream& out) {
    out << R"(    <section class="panel" data-ops-panel="dashboard" data-testid="ops-dashboard-page">
      <div class="toolbar">
        <div>
          <h2>운영 대시보드</h2>
          <p>현재 상태를 한눈에 봅니다.</p>
        </div>
        )" << RefreshIconButtonHtml("opsDashboardRefresh", "button-secondary", "새로고침") << R"(
      </div>
      <div class="grid">
        <div class="metric-card"><span>활성 세션</span><strong id="dashActiveSessions">-</strong></div>
        <div class="metric-card"><span>활성 스트림</span><strong id="dashActiveStreams">-</strong></div>
        <div class="metric-card"><span>분석 탭</span><strong id="dashActiveTaps">-</strong></div>
        <div class="metric-card"><span>WHIP 소스</span><strong id="dashPublishSources">-</strong></div>
      </div>
      <div class="grid">
        <section class="section-card">
          <h3>상태 요약</h3>
          <div id="dashHealthBadges" class="badge-row"><span class="chip">로딩 중</span></div>
          <p id="dashHealthText">불러오는 중</p>
        </section>
        <section class="section-card">
          <h3>분석 재사용</h3>
          <div id="dashRuntimeRows" class="badge-row"><span class="chip">로딩 중</span></div>
          <p id="dashRuntimeText">불러오는 중</p>
        </section>
        <section class="section-card">
          <h3>메타데이터 전송</h3>
          <div id="dashBackpressureRows" class="badge-row"><span class="chip">로딩 중</span></div>
          <p id="dashBackpressureText">불러오는 중</p>
        </section>
        <section class="section-card">
          <h3>정리 상태</h3>
          <div id="dashCleanupRows" class="badge-row"><span class="chip">로딩 중</span></div>
          <p id="dashCleanupText">불러오는 중</p>
        </section>
      </div>
      <section class="section-card" data-testid="ops-root-cause-panel">
        <div class="toolbar">
          <div>
            <h3>문제 원인</h3>
          <p>source lifecycle, stale, reconnect, auth/config 상태와 다음 조치를 함께 봅니다.</p>
          </div>
        </div>
        <div id="dashRootCauseBadges" class="badge-row"><span class="chip">로딩 중</span></div>
        <p id="dashRootCauseText">불러오는 중</p>
        <div id="dashRootCauseList" class="root-cause-list">
          <div class="empty">런타임 상태를 불러오는 중입니다.</div>
        </div>
      </section>
      <section class="section-card">
        <div class="toolbar">
          <div>
            <h3>운영 상세</h3>
            <p>핵심 수치를 바로 봅니다.</p>
          </div>
        </div>
        <div class="status-stat-grid">
          <div class="status-stat"><span>송출</span><strong id="dashEgressCount">-</strong></div>
          <div class="status-stat"><span>발행</span><strong id="dashPublishCount">-</strong></div>
          <div class="status-stat"><span>재사용 그룹</span><strong id="dashReuseGroupCount">-</strong></div>
          <div class="status-stat"><span>메타데이터 채널</span><strong id="dashMetadataChannelCount">-</strong></div>
          <div class="status-stat"><span>SSE</span><strong id="dashSseClientCount">-</strong></div>
          <div class="status-stat"><span>WS</span><strong id="dashWsClientCount">-</strong></div>
        </div>
        <p id="dashDetailText">불러오는 중</p>
      </section>
    </section>
)";
}

void AppendOpsRulesPage(std::ostringstream& out) {
    out << R"(    <section class="panel" data-ops-panel="rules" data-testid="ops-rules-page">
      <div class="toolbar">
        <div>
          <h2>룰 설정</h2>
          <p>종류를 고르고 목록을 관리합니다.</p>
        </div>
        )" << RefreshIconButtonHtml("opsRulesRefresh", "button-secondary", "새로고침") << R"(
      </div>
      <div id="opsRulesStatus" class="message" hidden></div>
      <div class="grid rules-metrics-grid">
        <div class="metric-card"><span>채널 분석 설정</span><strong id="rulesVaRuleCount">-</strong></div>
        <div class="metric-card"><span>이벤트 템플릿</span><strong id="rulesEventRuleCount">-</strong></div>
        <div class="metric-card"><span>프로파일</span><strong id="rulesProfileCount">-</strong></div>
        <div class="metric-card"><span>채널 연결</span><strong id="rulesViewBindingCount">-</strong></div>
      </div>
      <section class="section-card" data-testid="ops-rules-validation-panel">
        <div class="toolbar">
          <div>
            <h3>저장 전 검증</h3>
            <p id="opsRulesValidationSummary">룰 충돌과 누락을 확인합니다.</p>
          </div>
        </div>
        <div id="opsRulesValidationList" class="validation-list"></div>
      </section>
      <section class="section-card">
        <div class="toolbar">
          <div>
            <h3>먼저 준비할 항목</h3>
            <p id="opsRulesPrereqSummary">채널 분석 설정은 채널, 프로파일, 이벤트 템플릿을 준비한 뒤 만듭니다.</p>
          </div>
        </div>
        <div class="rules-prereq-grid">
          <article class="rules-prereq-card">
            <div class="badge-row">
              <span class="chip info">채널</span>
              <span id="opsRulesPrereqChannelsState" class="chip">확인 중</span>
            </div>
            <strong id="opsRulesPrereqChannelsCount">0개</strong>
            <p>채널 탭에서 입력 소스와 PublishedView를 먼저 준비합니다.</p>
            <div class="actions">
              <a class="button-secondary" href="/ops/sources">채널 열기</a>
            </div>
          </article>
          <article class="rules-prereq-card">
            <div class="badge-row">
              <span class="chip info">분석 프로파일</span>
              <span id="opsRulesPrereqProfilesState" class="chip">확인 중</span>
            </div>
            <strong id="opsRulesPrereqProfilesCount">0개</strong>
            <p>검출기, FPS, confidence, adaptive 같은 분석 엔진 설정을 먼저 만듭니다.</p>
            <div class="actions">
              <button id="opsRulesPrereqProfilesAction" class="button-secondary" type="button">프로파일 추가</button>
            </div>
          </article>
          <article class="rules-prereq-card">
            <div class="badge-row">
              <span class="chip info">이벤트 템플릿</span>
              <span id="opsRulesPrereqTemplatesState" class="chip">확인 중</span>
            </div>
            <strong id="opsRulesPrereqTemplatesCount">0개</strong>
            <p>이벤트 방식, 시나리오, 대상 객체, 조건값을 템플릿으로 먼저 정리합니다.</p>
            <div class="actions">
              <button id="opsRulesPrereqTemplatesAction" class="button-secondary" type="button">템플릿 추가</button>
            </div>
          </article>
          <article class="rules-prereq-card">
            <div class="badge-row">
              <span class="chip info">채널 분석 설정</span>
              <span id="opsRulesPrereqVaRulesState" class="chip">대기</span>
            </div>
            <strong id="opsRulesPrereqVaRulesCount">0개</strong>
            <p>채널에 이벤트 템플릿과 프로파일을 연결하고 영역/라인만 정하는 최종 조립 단계입니다.</p>
            <div class="actions">
              <button id="opsRulesPrereqVaRulesAction" class="button-primary" type="button">채널 분석 설정 추가</button>
            </div>
          </article>
        </div>
      </section>
      <section class="section-card">
        <div class="toolbar">
          <div>
            <h3>설정 종류</h3>
            <p id="opsRulesEditorSummary">무엇을 관리할지 고르고 같은 패턴으로 목록과 상세를 관리합니다.</p>
          </div>
          <div class="actions">
            <input id="opsRulesFilterInput" type="search" placeholder="이름, ID 검색" aria-label="룰 카탈로그 검색" />
          </div>
        </div>
        <div class="rule-mode-grid" role="group" aria-label="룰 설정 종류">
          <button id="opsAddVaRuleBtn" class="button-secondary rule-mode-button" type="button" aria-pressed="false">채널 분석 설정</button>
          <button id="opsAddEventRuleBtn" class="button-secondary rule-mode-button" type="button" aria-pressed="false">이벤트 템플릿</button>
          <button id="opsAddProfileBtn" class="button-secondary rule-mode-button" type="button" aria-pressed="false">분석 프로파일</button>
        </div>
      </section>
      <section id="opsVaRulesSection" class="section-card">
        <div class="toolbar">
          <div>
            <h3>채널 분석 설정</h3>
            <p id="opsVaRuleSummary">저장된 항목입니다.</p>
          </div>
          <div class="actions">
            <button id="opsCreateVaRuleBtn" class="button-primary" type="button">채널 분석 설정 추가</button>
          </div>
        </div>
        <div class="table-wrap">
          <table class="ops-data-table ops-rules-table ops-rules-va-table">
            <colgroup>
              <col class="ops-rules-col-id" />
              <col class="ops-rules-col-source" />
              <col class="ops-rules-col-template" />
              <col class="ops-rules-col-profile" />
              <col class="ops-rules-col-geometry" />
              <col class="ops-rules-col-output" />
              <col class="ops-rules-col-status" />
              <col class="ops-rules-col-actions" />
            </colgroup>
            <thead>
              <tr>
                <th>ID</th>
                <th>채널</th>
                <th>이벤트 템플릿</th>
                <th>분석 프로파일</th>
                <th>영역/라인</th>
                <th>URL 복사</th>
                <th>상태</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody id="opsVaRuleRows"><tr><td colspan="8">로딩 중</td></tr></tbody>
          </table>
        </div>
      </section>
      <section id="opsEventRulesSection" class="section-card">
        <div class="toolbar">
          <div>
            <h3>이벤트 템플릿</h3>
            <p id="opsEventRuleSummary">저장된 항목입니다.</p>
          </div>
          <div class="actions">
            <button id="opsCreateEventRuleBtn" class="button-primary" type="button">이벤트 템플릿 추가</button>
          </div>
        </div>
        <div class="table-wrap">
          <table class="ops-data-table ops-rules-table ops-rules-event-table">
            <colgroup>
              <col class="ops-event-col-id" />
              <col class="ops-event-col-mode" />
              <col class="ops-event-col-analysis" />
              <col class="ops-event-col-target" />
              <col class="ops-event-col-condition" />
              <col class="ops-event-col-actions" />
            </colgroup>
            <thead>
              <tr>
                <th>ID</th>
                <th>구분</th>
                <th>종류</th>
                <th>대상</th>
                <th>조건</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody id="opsEventRuleRows"><tr><td colspan="6">로딩 중</td></tr></tbody>
          </table>
        </div>
      </section>
      <section id="opsProfileRulesSection" class="section-card">
        <div class="toolbar">
          <div>
            <h3>분석 프로파일</h3>
            <p id="opsProfileSummary">저장된 항목입니다.</p>
          </div>
          <div class="actions">
            <button id="opsCreateProfileBtn" class="button-primary" type="button">분석 프로파일 추가</button>
          </div>
        </div>
        <div class="table-wrap">
          <table class="ops-data-table ops-rules-table ops-rules-profile-table">
            <colgroup>
              <col class="ops-profile-col-id" />
              <col class="ops-profile-col-detector" />
              <col class="ops-profile-col-fps" />
              <col class="ops-profile-col-input" />
              <col class="ops-profile-col-usage" />
              <col class="ops-profile-col-actions" />
            </colgroup>
            <thead>
              <tr>
                <th>ID</th>
                <th>검출기</th>
                <th>FPS</th>
                <th>입력</th>
                <th>사용처</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody id="opsProfileRows"><tr><td colspan="6">로딩 중</td></tr></tbody>
          </table>
        </div>
      </section>
      <section id="opsRulesDetailPanel" class="section-card" hidden>
        <div class="toolbar">
          <div>
            <div class="badge-row"><span id="opsRulesDetailMode" class="chip info">상세</span><span id="opsRulesDetailId" class="chip">-</span></div>
            <h3 id="opsRulesComposerTitle">상세</h3>
            <p id="opsRulesComposerHint" class="form-note">저장된 내용입니다.</p>
          </div>
          <div class="actions">
            <button id="opsRulesComposerEdit" class="button-secondary" type="button">수정</button>
            <button id="opsRulesComposerSave" class="button-primary" type="button">저장</button>
            <button id="opsRulesComposerClose" class="button-secondary" type="button">닫기</button>
          </div>
        </div>
        <div id="opsRulesComposerSteps" class="rule-step-strip" aria-label="현재 작성 단계" hidden></div>
        <form id="opsVaRuleForm" hidden>
          <div class="row">
            <label>ID<input id="opsVaRuleIdInput" type="text" inputmode="numeric" readonly /></label>
            <label>이름<input id="opsVaRuleNameInput" type="text" placeholder="채널 분석 설정 이름" /></label>
            <label>상태
              <select id="opsVaRuleEnabledInput">
                <option value="true">활성</option>
                <option value="false">비활성</option>
              </select>
            </label>
          </div>
          <div class="row">
            <label>채널
              <select id="opsVaRuleChannelSelect"></select>
            </label>
            <label>이벤트 템플릿
              <select id="opsVaRuleTemplateSeedSelect"></select>
            </label>
            <label>분석 프로파일
              <select id="opsVaRuleProfileSelect"></select>
            </label>
          </div>
          <p id="opsVaRuleBindingSummary" class="form-note">이벤트 템플릿과 프로파일을 고른 뒤 선택한 채널의 source와 PublishedView에 연결합니다.</p>
          <section class="ops-selection-review" aria-labelledby="opsVaRuleTemplateSummaryHeading">
            <div>
              <strong id="opsVaRuleTemplateSummaryHeading">선택한 템플릿 요약</strong>
              <p id="opsVaRuleTemplateSummary" class="form-note">이벤트 템플릿을 고르면 시나리오와 대상 객체를 그대로 따릅니다.</p>
            </div>
          </section>
          <section class="ops-template-settings ops-va-stage-settings" aria-labelledby="opsVaRuleGeometryHeading">
            <div>
              <strong id="opsVaRuleGeometryHeading">채널 미리보기와 영역/라인 설정</strong>
              <p class="form-note">선택한 채널 영상을 보면서 같은 영역에서 영역/라인을 정합니다. 개발자용 좌표는 필요할 때만 아래에서 펼쳐 봅니다.</p>
            </div>
            <div class="ops-va-stage-grid ops-va-stage-grid-single">
              <section class="ops-va-stage-panel" aria-labelledby="opsVaRulePreviewHeading">
                <div class="toolbar compact-toolbar">
                  <div>
                    <strong id="opsVaRulePreviewHeading">영상 위 영역/라인 편집</strong>
                    <p id="opsVaRulePreviewSummary" class="form-note">채널을 고른 뒤 재생하고 같은 화면 위에 영역/라인을 그립니다.</p>
                  </div>
                  <div class="actions">
                    <button id="opsVaRulePreviewStartBtn" class="button-secondary" type="button">재생</button>
                    <button id="opsVaRulePreviewRestartBtn" class="button-secondary" type="button">재연결</button>
                    <button id="opsVaRulePreviewStopBtn" class="button-secondary" type="button">정지</button>
                  </div>
                </div>
                <div class="ops-geometry-status-grid" aria-label="영역 편집 상태">
                  <div class="ops-geometry-status-card">
                    <span>편집 모드</span>
                    <strong id="opsVaRuleGeometryModeText">영역</strong>
                  </div>
                  <div class="ops-geometry-status-card">
                    <span>점 개수</span>
                    <strong id="opsVaRuleGeometryPointCountText">0/12</strong>
                  </div>
                  <div class="ops-geometry-status-card">
                    <span>저장 조건</span>
                    <strong id="opsVaRuleGeometryMinimumText">최소 3점</strong>
                  </div>
                  <div class="ops-geometry-status-card">
                    <span>방향</span>
                    <strong id="opsVaRuleGeometryDirectionText">영역 내부</strong>
                  </div>
                </div>
                <div class="ops-rule-preview-stage">
                  <video id="opsVaRulePreviewVideo" playsinline muted></video>
                  <svg id="opsVaRuleGeometryPreview" class="ops-geometry-overlay" viewBox="0 0 100 56.25" aria-label="영역 미리보기"></svg>
                  <span id="opsVaRulePreviewPlaceholder">채널을 고른 뒤 재생하세요.</span>
                </div>
                <div class="toolbar compact-toolbar ops-geometry-toolbar">
                  <div>
                    <strong id="opsVaRuleGeometryCanvasHeading">영역/라인</strong>
                    <p id="opsVaRuleGeometrySummary" class="form-note">미리보기 영역을 눌러 점을 추가합니다. 라인은 2점, 영역은 3점 이상이 필요합니다.</p>
                  </div>
                  <div class="actions">
                    <button id="opsVaRuleGeometryDefaultBtn" class="button-secondary" type="button">기본 좌표</button>
                    <button id="opsVaRuleGeometryUndoBtn" class="button-secondary" type="button">되돌리기</button>
                    <button id="opsVaRuleGeometryDeleteLastBtn" class="button-secondary" type="button">마지막 점 삭제</button>
                    <button id="opsVaRuleGeometryClearBtn" class="button-secondary" type="button">비우기</button>
                  </div>
                </div>
              </section>
            </div>
            <details class="inline-details">
              <summary>개발자용 좌표 보기</summary>
              <div class="row">
                <label>형태
                  <input id="opsVaRuleGeometryKindText" type="text" readonly />
                </label>
                <label>좌표
                  <textarea id="opsVaRuleGeometryPointsInput" rows="5" placeholder="0.20,0.22&#10;0.80,0.22&#10;0.80,0.78&#10;0.20,0.78"></textarea>
                </label>
              </div>
            </details>
          </section>
        </form>
        <form id="opsEventRuleForm" hidden>
          <div class="row">
            <label>ID<input id="opsEventRuleIdInput" type="text" inputmode="numeric" readonly /></label>
          </div>
          <div class="row">
            <label>구성
              <select id="opsEventRuleModeSelect">
                <option value="event">이벤트</option>
                <option value="scenario">시나리오</option>
              </select>
            </label>
            <label>종류
              <select id="opsEventRuleTypeSelect"></select>
            </label>
            <label id="opsEventRulePresetField">현장 preset
              <select id="opsEventRulePresetSelect">
                <option value="default">기본</option>
                <option value="road">도로</option>
                <option value="park">공원</option>
                <option value="indoor">실내</option>
                <option value="lobby">로비</option>
                <option value="platform">승강장</option>
                <option value="entrance">출입구</option>
                <option value="custom">직접 설정</option>
              </select>
            </label>
            <label>최소 신뢰도
              <input id="opsEventRuleConfidenceInput" type="number" min="0" max="1" step="0.01" placeholder="0.25" />
            </label>
            <label>최소 지속 시간(ms)
              <input id="opsEventRuleMinDurationInput" type="number" min="0" step="100" placeholder="0" />
            </label>
          </div>
          <section class="ops-category-section" aria-labelledby="opsEventRuleClassesHeading">
            <div class="ops-category-header">
              <div>
                <strong id="opsEventRuleClassesHeading">대상 객체</strong>
                <p class="form-note">템플릿에서 기본으로 제안할 객체를 고릅니다.</p>
              </div>
              <div class="ops-category-actions">
                <button id="opsEventRuleClassesDefaultBtn" class="button-secondary" type="button">기본</button>
                <button id="opsEventRuleClassesAllBtn" class="button-secondary" type="button">전체 선택</button>
                <button id="opsEventRuleClassesClearBtn" class="button-secondary" type="button">전체 해제</button>
              </div>
            </div>
            <div id="opsEventRuleClassChecks" class="ops-category-grid"></div>
            <p id="opsEventRuleClassesSummary" class="form-note">사람, 차량</p>
          </section>
          <section class="ops-template-settings" aria-labelledby="opsEventRuleSettingsHeading">
            <div>
              <strong id="opsEventRuleSettingsHeading">이벤트 조건</strong>
              <p class="form-note">템플릿이 담당하는 판단 조건과 재알림 규칙입니다.</p>
            </div>
            <div class="row">
              <label id="opsEventRuleLineDirectionField" hidden>라인 방향
                <select id="opsEventRuleLineDirectionSelect">
                  <option value="any">양방향</option>
                  <option value="forward">정방향</option>
                  <option value="reverse">역방향</option>
                </select>
              </label>
              <label id="opsEventRuleCandidateField" hidden>후보 판단 시간(ms)
                <input id="opsEventRuleCandidateInput" type="number" min="0" step="500" placeholder="2000" />
              </label>
              <label id="opsEventRuleDwellField" hidden>확정/체류 시간(ms)
                <input id="opsEventRuleDwellInput" type="number" min="0" step="500" placeholder="10000" />
              </label>
            </div>
            <div class="row">
              <label id="opsEventRuleReEntryWindowField" hidden>재진입 허용 시간(ms)
                <input id="opsEventRuleReEntryWindowInput" type="number" min="0" step="1000" placeholder="10000" />
              </label>
              <label id="opsEventRuleReEntryModeField" hidden>재진입 기준
                <select id="opsEventRuleReEntryModeSelect">
                  <option value="same-zone">같은 영역</option>
                  <option value="configured-zones">지정 영역</option>
                </select>
              </label>
              <label id="opsEventRuleLineDelayField" hidden>라인 후 최대 지연(ms)
                <input id="opsEventRuleLineDelayInput" type="number" min="0" step="1000" placeholder="10000" />
              </label>
            </div>
            <div class="row">
              <label id="opsEventRuleTriggerDirectionField" hidden>트리거 라인 방향
                <select id="opsEventRuleTriggerDirectionSelect">
                  <option value="any">양방향</option>
                  <option value="forward">정방향</option>
                  <option value="reverse">역방향</option>
                </select>
              </label>
              <label id="opsEventRuleLoiteringRadiusField" hidden>최대 이동 반경
                <input id="opsEventRuleLoiteringRadiusInput" type="number" min="0.01" max="1" step="0.01" placeholder="0.08" />
              </label>
              <label id="opsEventRuleLoiteringPointsField" hidden>최소 이동 경로 점수
                <input id="opsEventRuleLoiteringPointsInput" type="number" min="2" step="1" placeholder="4" />
              </label>
            </div>
            <div class="row">
              <label id="opsEventRuleZoneThresholdField" hidden>점유 임계값
                <input id="opsEventRuleZoneThresholdInput" type="number" min="1" step="1" placeholder="3" />
              </label>
              <label id="opsEventRuleZoneDwellField" hidden>최소 점유 체류(ms)
                <input id="opsEventRuleZoneDwellInput" type="number" min="0" step="1000" placeholder="5000" />
              </label>
              <label id="opsEventRuleCooldownField">재알림 대기(ms)
                <input id="opsEventRuleCooldownInput" type="number" min="0" step="1000" placeholder="5000" />
              </label>
            </div>
          </section>
          <p id="opsEventRuleFormNote" class="form-note">여러 채널 분석 설정에서 다시 고를 수 있는 공통 이벤트 템플릿입니다.</p>
        </form>
        <form id="opsProfileForm" hidden>
          <div class="row">
            <label>ID<input id="opsProfileIdInput" type="text" inputmode="numeric" readonly /></label>
            <label>검출기
              <select id="opsProfileDetectorSelect">
                <option value="yolo">yolo</option>
                <option value="dummy">dummy</option>
                <option value="server-config">server-config</option>
              </select>
            </label>
            <label>FPS<input id="opsProfileFpsInput" type="number" min="1" step="1" placeholder="6" /></label>
          </div>
          <div class="row">
            <label>Queue<input id="opsProfileQueueInput" type="number" min="1" step="1" placeholder="1" /></label>
            <label>Confidence<input id="opsProfileConfidenceInput" type="number" min="0" max="1" step="0.01" placeholder="0.25" /></label>
            <label>NMS<input id="opsProfileNmsInput" type="number" min="0" max="1" step="0.01" placeholder="0.45" /></label>
          </div>
          <div class="row">
            <label>입력 폭<input id="opsProfileInputWidthInput" type="number" min="1" step="1" placeholder="640" /></label>
            <label>입력 높이<input id="opsProfileInputHeightInput" type="number" min="1" step="1" placeholder="640" /></label>
          </div>
          <div class="checks">
            <label><input id="opsProfileAdaptiveToggle" type="checkbox" checked /> adaptive</label>
          </div>
          <p id="opsProfileSummaryText" class="form-note">검출기, FPS, confidence, 입력 크기 같은 분석 엔진 설정만 정의합니다.</p>
        </form>
      </section>
      <section class="section-card ops-audit-panel">
        <div class="toolbar">
          <div>
            <h3>변경 이력</h3>
            <p>이 브라우저에서 수행한 룰 변경의 작업자, 전/후 값, 시각을 확인합니다.</p>
          </div>
          <button id="opsRulesAuditRefresh" class="button-secondary" type="button">새로고침</button>
        </div>
        <div id="ops-rules-audit-list" class="audit-list" data-audit-area="rules"></div>
      </section>
    </section>
)";
}

void AppendOpsEventsPage(std::ostringstream& out) {
    out << R"(    <section class="panel" data-ops-panel="events" data-testid="ops-events-page">
      <div class="toolbar">
        <div>
          <h2>이벤트 상태</h2>
          <p>룰 실행 결과와 이벤트 전달 상태를 확인합니다.</p>
        </div>
        <div class="actions">
          <a class="button button-secondary" href="/ops/dashboard">대시보드</a>
          <a class="button button-secondary" href="/ops/rules">룰</a>
          )" << RefreshIconButtonHtml("opsEventsRefresh", "button-secondary", "새로고침") << R"(
        </div>
      </div>
      <div class="grid">
        <section class="section-card">
          <h3>이벤트 저장소</h3>
          <div id="eventStorageBadges" class="badge-row"><span class="chip">로딩 중</span></div>
          <p id="eventStorageText">불러오는 중</p>
        </section>
        <section class="section-card">
          <h3>Event POST</h3>
          <div id="eventPostBadges" class="badge-row"><span class="chip">로딩 중</span></div>
          <p id="eventPostText">불러오는 중</p>
        </section>
        <section class="section-card">
          <h3>증거 정책</h3>
          <div id="eventEvidencePolicyBadges" class="badge-row"><span class="chip">로딩 중</span></div>
          <p id="eventEvidencePolicyText">이벤트 기반 짧은 증거 범위를 확인합니다.</p>
        </section>
        <section class="section-card">
          <h3>Export / 보존</h3>
          <div id="eventExportPolicyBadges" class="badge-row"><span class="chip">로딩 중</span></div>
          <p id="eventExportPolicyText">증거 export와 삭제 권한을 확인합니다.</p>
        </section>
      </div>
      <section class="section-card">
        <div class="toolbar">
          <div>
            <h3>최근 이벤트 기록</h3>
            <p id="eventRecordSummary">최근 25개 기록을 조회합니다.</p>
          </div>
          <div class="actions event-record-controls">
            <label>증거
              <select id="eventRecordsEvidenceSelect">
                <option value="">전체</option>
                <option value="any">증거 있음</option>
                <option value="both">snapshot + clip</option>
                <option value="snapshot">snapshot</option>
                <option value="clip">clip</option>
                <option value="missing">증거 없음</option>
              </select>
            </label>
            <label class="check-inline"><input id="eventRecordsIncludeArchives" type="checkbox" /> archive 포함</label>
            <button id="eventRecordsPrev" class="button button-secondary" type="button">이전</button>
            <button id="eventRecordsNext" class="button button-secondary" type="button">다음</button>
          </div>
        </div>
        <div class="table-wrap">
          <table class="ops-data-table event-record-table">
            <colgroup>
              <col class="event-record-col-event" />
              <col class="event-record-col-status" />
              <col class="event-record-col-stream" />
              <col class="event-record-col-track" />
              <col class="event-record-col-scenario" />
              <col class="event-record-col-evidence" />
              <col class="event-record-col-time" />
            </colgroup>
            <thead>
              <tr>
                <th>이벤트</th>
                <th>상태</th>
                <th>스트림</th>
                <th>트랙</th>
                <th>시나리오</th>
                <th>증거</th>
                <th>수정 시각</th>
              </tr>
            </thead>
            <tbody id="eventRecordRows"><tr><td colspan="7">로딩 중</td></tr></tbody>
          </table>
        </div>
      </section>
    </section>
)";
}

void AppendOpsHomePage(std::ostringstream& out) {
    out << R"(    <section class="panel" data-ops-panel="home" data-testid="ops-home-page">
      <div class="toolbar">
        <div>
          <h2>운영 홈</h2>
          <p>운영 구성과 현재 상태를 함께 봅니다.</p>
        </div>
        )" << RefreshIconButtonHtml("opsHomeRefresh", "button-secondary", "새로고침") << R"(
      </div>
      <section class="section-card compact-card">
        <div class="toolbar">
          <div>
            <h3>운영 구성</h3>
            <p>등록된 구성입니다.</p>
          </div>
          <div id="homeConfigState" class="badge-row"><span class="chip">로딩 중</span></div>
        </div>
        <div class="grid">
          <div class="metric-card"><span>등록 채널</span><strong id="homeChannelCount">-</strong></div>
          <div class="metric-card"><span>VA 룰</span><strong id="homeVaRuleCount">-</strong></div>
          <div class="metric-card"><span>이벤트 룰</span><strong id="homeEventRuleCount">-</strong></div>
          <div class="metric-card"><span>사용자</span><strong id="homeUserCount">-</strong></div>
        </div>
        <p id="homeConfigText">불러오는 중</p>
      </section>
      <section class="section-card compact-card">
        <div class="toolbar">
          <div>
            <h3>실시간 상태</h3>
            <p>현재 상태입니다.</p>
          </div>
          <div id="homeRuntimeState" class="badge-row"><span class="chip">로딩 중</span></div>
        </div>
        <div class="status-stat-grid">
          <div class="status-stat"><span>세션</span><strong id="homeActiveSessions">-</strong></div>
          <div class="status-stat"><span>스트림</span><strong id="homeActiveStreams">-</strong></div>
          <div class="status-stat"><span>분석 탭</span><strong id="homeAnalysisTaps">-</strong></div>
          <div class="status-stat"><span>지연 탭</span><strong id="homeStaleTaps">-</strong></div>
        </div>
        <p id="homeRuntimeText">불러오는 중</p>
      </section>
    </section>
)";
}

std::string OpsShellPageHtml(const app::AppConfig& config,
                             const auth::Principal& principal,
                             const std::string& active) {
    std::ostringstream out;
    AppendOpsShellStart(out,
                        principal,
                        active,
                        "운영 상태, channel, rule, event, 계정 관리를 같은 제품 shell에서 확인합니다.");
    if (active == "dashboard") {
        AppendOpsDashboardPage(out);
    } else if (active == "events") {
        AppendOpsEventsPage(out);
    } else if (active == "rules") {
        AppendOpsRulesPage(out);
    } else {
        AppendOpsHomePage(out);
    }
    AppendOpsShellScript(out, active, config.stream_route, config.rtsp_listen_port);
    AppendOpsShellEnd(out);
    return out.str();
}

constexpr std::int64_t kClientDashboardStaleMs = 5000;

void AppendNullableInt64(std::ostringstream& out, std::optional<std::int64_t> value) {
    if (value.has_value()) {
        out << *value;
    } else {
        out << "null";
    }
}

void AppendNullableUint64(std::ostringstream& out, std::optional<std::uint64_t> value) {
    if (value.has_value()) {
        out << *value;
    } else {
        out << "null";
    }
}

bool ClientPrincipalCanAccessFeature(const auth::Principal& principal,
                                     const std::string& view_id,
                                     const std::string& scope_prefix) {
    return auth::RequireRole(principal, {"operator"}) ||
           auth::RequireScope(principal, scope_prefix + ":" + view_id);
}

std::optional<media::SourceSpec::Kind> SourceKindForClientView(
    const SourceViewRegistry::SourceRecord& source) {
    if (source.kind == "file") {
        return media::SourceSpec::Kind::File;
    }
    if (source.kind == "rtsp") {
        return media::SourceSpec::Kind::Rtsp;
    }
    if (source.kind == "webrtc") {
        return media::SourceSpec::Kind::WebRtc;
    }
    if (source.kind == "whep") {
        return media::SourceSpec::Kind::Whep;
    }
    if (source.kind == "hls") {
        return media::SourceSpec::Kind::Hls;
    }
    if (source.kind == "youtube") {
        return media::SourceSpec::Kind::Youtube;
    }
    if (source.kind == "http") {
        return media::SourceSpec::Kind::Http;
    }
    return std::nullopt;
}

std::string SourceLocatorForClientView(const SourceViewRegistry::SourceRecord& source) {
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

void AddUniqueString(std::vector<std::string>* values, const std::string& value) {
    if (values == nullptr || value.empty()) {
        return;
    }
    if (std::find(values->begin(), values->end(), value) == values->end()) {
        values->push_back(value);
    }
}

std::vector<std::string> ClientStreamKeyCandidates(const SourceViewRegistry::SourceRecord& source) {
    std::vector<std::string> candidates;
    AddUniqueString(&candidates, source.canonical_source_key);
    const auto kind = SourceKindForClientView(source);
    const std::string locator = SourceLocatorForClientView(source);
    if (kind.has_value() && !locator.empty()) {
        AddUniqueString(&candidates, core::BuildStreamKey(media::SourceSpec{*kind, locator}));
    }
    return candidates;
}

bool ClientTapMatchesSource(const analysis::AnalysisManager::TapSnapshot& tap,
                            const std::vector<std::string>& stream_key_candidates) {
    return std::find(stream_key_candidates.begin(), stream_key_candidates.end(), tap.stream_key) !=
           stream_key_candidates.end();
}

bool ClientTapMatchesViewRule(const SourceViewRegistry::PublishedViewRecord& view,
                              const analysis::AnalysisManager::TapSnapshot& tap) {
    if (tap.selected_by_rule_id.empty() || view.allowed_rule_ids.empty()) {
        return true;
    }
    return std::find(view.allowed_rule_ids.begin(),
                     view.allowed_rule_ids.end(),
                     tap.selected_by_rule_id) != view.allowed_rule_ids.end();
}

const analysis::AnalysisManager::TapSnapshot* SelectClientDashboardTap(
    const SourceViewRegistry::ClientViewAccess& access,
    const std::vector<analysis::AnalysisManager::TapSnapshot>& taps,
    const std::vector<std::string>& stream_key_candidates) {
    const analysis::AnalysisManager::TapSnapshot* fallback = nullptr;
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

struct ClientEventItem {
    std::string event_id;
    std::string event_type;
    std::string status;
    std::string class_name;
    std::string zone_id;
    std::string line_id;
    std::string scenario_name;
    std::string scenario_phase;
    std::optional<std::uint64_t> track_id;
    std::optional<std::int64_t> start_time_ms;
    std::optional<std::int64_t> update_time_ms;
    std::optional<std::int64_t> end_time_ms;
};

struct ClientEventTypeCount {
    std::string event_type;
    std::size_t count{0};
};

struct ClientEventSummary {
    bool provided{false};
    bool storage_enabled{false};
    bool has_more{false};
    bool warning{false};
    std::string error;
    std::vector<ClientEventItem> recent;
    std::vector<ClientEventTypeCount> counts_by_type;
    std::optional<std::int64_t> latest_event_time_ms;
};

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

std::int64_t ClientEventSortTime(const ClientEventItem& item) {
    return item.update_time_ms.value_or(item.start_time_ms.value_or(0));
}

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

ClientEventSummary LoadClientEventSummary(std::vector<std::string> stream_key_candidates,
                                          int limit) {
    ClientEventSummary summary;
    limit = std::max(1, std::min(50, limit));
    analysis::EventRecordQueryResult selected_result;
    bool selected = false;
    for (const auto& stream_key : stream_key_candidates) {
        if (stream_key.empty()) {
            continue;
        }
        analysis::EventRecordQueryOptions options;
        options.stream_id = stream_key;
        options.limit = static_cast<std::size_t>(std::max(200, limit));
        analysis::EventRecordQueryResult result;
        std::string error_message;
        if (!analysis::QueryEventRecords(options, &result, &error_message)) {
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

void AppendClientEventSummaryJson(std::ostringstream& out, const ClientEventSummary& summary) {
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
    out << "]}";
}

void AppendClientViewIdentityJson(std::ostringstream& out,
                                  const SourceViewRegistry::ClientViewAccess& access) {
    out << "{"
        << "\"viewId\":\"" << JsonEscape(access.view.view_id) << "\","
        << "\"displayName\":\"" << JsonEscape(access.view.display_name) << "\","
        << "\"sourceId\":\"" << JsonEscape(access.view.source_id) << "\","
        << "\"sourceDisplayName\":\"" << JsonEscape(access.source.display_name) << "\","
        << "\"sourceKind\":\"" << JsonEscape(access.source.kind) << "\","
        << "\"showDashboard\":" << (access.view.show_dashboard ? "true" : "false") << ","
        << "\"showEvents\":" << (access.view.show_events ? "true" : "false") << ","
        << "\"showMetadataSummary\":" << (access.view.show_metadata_summary ? "true" : "false")
        << "}";
}

std::vector<std::string> ClientEventStreamCandidates(
    const SourceViewRegistry::SourceRecord& source,
    const analysis::AnalysisManager::TapSnapshot* tap) {
    std::vector<std::string> candidates;
    if (tap != nullptr) {
        AddUniqueString(&candidates, tap->stream_key);
    }
    for (const auto& key : ClientStreamKeyCandidates(source)) {
        AddUniqueString(&candidates, key);
    }
    return candidates;
}

std::string ClientViewEventsJson(const SourceViewRegistry::ClientViewAccess& access, int limit) {
    const auto summary = LoadClientEventSummary(ClientEventStreamCandidates(access.source, nullptr), limit);
    std::ostringstream out;
    out << "{\"ok\":true,\"view\":";
    AppendClientViewIdentityJson(out, access);
    out << ",\"events\":";
    AppendClientEventSummaryJson(out, summary);
    out << "}";
    return out.str();
}

std::string ClientViewMetadataJson(const SourceViewRegistry::ClientViewAccess& access,
                                   const std::vector<analysis::AnalysisManager::TapSnapshot>& taps) {
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

std::string ClientViewDashboardJson(const SourceViewRegistry::ClientViewAccess& access,
                                    const auth::Principal& principal,
                                    const std::vector<analysis::AnalysisManager::TapSnapshot>& taps) {
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
    const bool stale = frame_stale || metadata_stale;

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
        << "\"live\":" << (has_tap && tap->ref_count > 0 ? "true" : "false") << ","
        << "\"status\":\"" << (has_tap ? "live" : "offline") << "\","
        << "\"connectionStatus\":\"" << (has_tap ? "connected" : "disconnected") << "\","
        << "\"videoFrameStatus\":\""
        << (!has_tap ? "unavailable" : (!has_frame ? "unavailable" : (frame_stale ? "stale" : "receiving")))
        << "\","
        << "\"metadataStatus\":\""
        << (!metadata_allowed ? "unavailable"
                              : (!has_tap ? "unavailable"
                                          : (!has_metadata ? "unavailable"
                                                           : (metadata_stale ? "stale" : "fresh"))))
        << "\","
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
        << "\"webrtc\":\"" << (has_tap ? "connected" : "disconnected") << "\","
        << "\"staleMetadataAgeMs\":";
    AppendNullableInt64(out, metadata_age);
    out << ",\"lastFrameAgeMs\":";
    AppendNullableInt64(out, last_frame_age);
    out << "},\"events\":";
    AppendClientEventSummaryJson(out, event_summary);
    out << "}";
    return out.str();
}

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

std::vector<std::string> ClientAllowedOverlayModes(
    const SourceViewRegistry::PublishedViewRecord& view) {
    std::vector<std::string> modes;
    for (const auto& mode : view.allowed_overlay_modes) {
        AddUniqueString(&modes, NormalizeClientOverlayMode(mode));
    }
    modes.erase(std::remove(modes.begin(), modes.end(), std::string()), modes.end());
    return modes;
}

bool ClientViewAllowsOverlayMode(const SourceViewRegistry::PublishedViewRecord& view,
                                 const std::string& mode) {
    const auto allowed = ClientAllowedOverlayModes(view);
    return std::find(allowed.begin(), allowed.end(), mode) != allowed.end();
}

std::string ClientDefaultOverlayMode(const SourceViewRegistry::PublishedViewRecord& view) {
    const auto allowed = ClientAllowedOverlayModes(view);
    if (allowed.empty()) {
        return std::string();
    }
    if (std::find(allowed.begin(), allowed.end(), "raw") != allowed.end()) {
        return "raw";
    }
    return allowed.front();
}

bool AddClientSourceQuery(const SourceViewRegistry::SourceRecord& source,
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

std::string ClientSourceQueryValue(const std::unordered_map<std::string, std::string>& query,
                                   const std::string& key) {
    const auto it = query.find(key);
    return it == query.end() ? std::string() : Trim(it->second);
}

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

bool ClientVaRuleSourceMatchesView(const SourceViewRegistry::ClientViewAccess& access,
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

bool BuildClientLiveWebRtcQuery(const SourceViewRegistry::ClientViewAccess& access,
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

std::string ClientShellPageHtml(const auth::Principal& principal, const std::string& active) {
    const RegistryResult views_result = SourceViewRegistry::Instance().ClientViewsJson(principal);
    const std::string views_json =
        views_result.status == 200 ? views_result.body : "{\"status\":\"clientViews\",\"views\":[]}";
    const bool preview_mode =
        (auth::IsAdmin(principal) || auth::IsOperator(principal)) &&
        auth::RequireScope(principal, "ops:read");
    std::ostringstream out;
    out << R"(<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>클라이언트 포털</title>
)" << ProductThemeBootScript() << ProductUiCss() << ProductSharedUiScript() << ClientShellCss() << R"(
</head>
<body class="product-shell client-shell" data-client-preview=")" << (preview_mode ? "true" : "false") << R"(" data-client-active=")" << HtmlEscape(active) << R"(">
  <main class="product-page">
    <header class="app-chrome">
      <div class="app-header-top">
        <nav class="image-nav-tabs client-image-nav-tabs" aria-label="클라이언트 메뉴">
)";
    AppendImageNavLink(out, "/client/live", "live", "라이브", active == "live");
    AppendImageNavLink(out, "/client/dashboard", "dashboard", "대시보드", active == "dashboard");
    out << R"(        </nav>
)";
    AppendProductAccountMenu(out, principal);
    out << R"(      </div>
    </header>
)";

    out << R"(
    <section class="workspace" data-testid="client-shell-page">
      <div class="panel">
        <div class="toolbar">
          <h2>할당 채널</h2>
	          )" << RefreshIconButtonHtml("refresh", "ghost", "새로고침") << R"(
        </div>
        <div id="views" class="views"></div>
      </div>
      <div class="panel" id="detail">
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

bool IsOpsOverviewShellRoute(const std::string& path) {
    return path == "/ops" || path == "/ops/home" || path == "/ops/dashboard" ||
           path == "/ops/events";
}

std::string OpsOverviewActiveForPath(const std::string& path) {
    if (path == "/ops/dashboard") {
        return "dashboard";
    }
    if (path == "/ops/events") {
        return "events";
    }
    return "home";
}

bool IsClientShellRoute(const std::string& path) {
    return path == "/client" || path == "/client/live" || path == "/client/dashboard" ||
           path == "/client/events";
}

std::string ClientShellActiveForPath(const std::string& path) {
    if (path == "/client/dashboard" || path == "/client/events") {
        return "dashboard";
    }
    return "live";
}

std::string BuildOpsSourcesPageHtml(const auth::Principal& principal) {
    std::ostringstream out;
    AppendOpsShellStart(out,
                        principal,
                        "sources",
                        "운영 채널을 관리합니다.");
    out << R"OPS(    <section class="panel" data-testid="ops-sources-page">
      <div class="toolbar">
        <div>
          <h2>채널</h2>
          <p>채널과 PublishedView를 관리합니다.</p>
        </div>
      </div>
      <section class="section-card">
        <div class="toolbar">
          <div>
            <h3>채널 목록</h3>
            <p>목록을 보고 상세/삭제를 진행합니다.</p>
          </div>
          <div class="actions">
            <button id="add-channel" class="button-primary" type="button">채널 추가</button>
	            )OPS" << RefreshIconButtonHtml("refresh", "button-secondary", "새로고침") << R"OPS(
            <span id="status" class="status" aria-live="polite" hidden></span>
          </div>
        </div>
        <div class="channel-bulk-panel" data-testid="channel-bulk-panel">
          <div class="toolbar">
            <div>
              <h4>대량 작업 / 상태 진단</h4>
              <p>선택한 채널을 복제하거나 비활성화하고, source/view 연결 문제를 확인합니다.</p>
            </div>
            <div class="actions">
              <label class="check-inline"><input id="channel-bulk-select-all" type="checkbox" /> 전체 선택</label>
              <label class="check-inline"><input id="channel-bulk-dry-run" type="checkbox" checked /> dry-run</label>
              <button id="channel-bulk-validate" class="button-secondary" type="button">검증</button>
              <button id="channel-bulk-clone" class="button-secondary" type="button">선택 복제</button>
              <button id="channel-bulk-disable" class="button-secondary" type="button">선택 비활성화</button>
              <button id="channel-bulk-retry-failed" class="button-secondary" type="button" disabled>실패 재시도</button>
              <button id="channel-bulk-rollback" class="button-secondary" type="button" disabled>성공 롤백</button>
            </div>
          </div>
          <div id="channelBulkSummary" class="badge-row"><span class="chip">로딩 중</span></div>
          <div id="channelBulkDiagnostics" class="validation-list channel-bulk-diagnostics">
            <div class="empty">채널 상태를 불러오는 중입니다.</div>
          </div>
        </div>
        <div class="table-wrap">
          <table class="ops-data-table channel-table">
            <colgroup>
              <col class="channel-col-select" />
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
    AppendTableHead(out, {"선택", "ID", "이름", "종류", "상태", "입력", "라이브 URL", "VA URL", "작업"});
    out << R"OPS(            <tbody id="channels-body"><tr><td colspan="9">로딩 중</td></tr></tbody>
          </table>
        </div>
        <p class="hint" style="margin-top:12px;">RTSP/WHEP는 운영 확인용입니다. 브라우저 재생은 <code>/client/live</code>에서 확인합니다.</p>
      </section>

      <section id="channel-detail-panel" class="section-card" hidden>
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
            <p><strong>외부 WHEP</strong>는 URL 입력, <strong>Published WebRTC</strong>는 저장된 <code>sourceId</code> 연결입니다.</p>
          </div>
          <div class="row">
            <label>채널 ID<input name="channelId" type="number" min="1" step="1" inputmode="numeric" placeholder="1" required /></label>
            <label>이름<input name="displayName" /></label>
            <label>종류
              <select name="kind">
                <option value="file">파일</option>
                <option value="rtsp">RTSP pull</option>
                <option value="whep">외부 WHEP pull</option>
                <option value="webrtc">Published WebRTC source</option>
                <option value="http">HTTP/HLS pull</option>
              </select>
            </label>
          </div>
          <label data-source-kind="file">파일
            <select name="file" id="channel-file-select">
              <option value="sample_h264.mp4">sample_h264.mp4</option>
            </select>
          </label>
          <label data-source-kind="rtsp">RTSP URL<input name="rtspUrl" placeholder="rtsp://camera/live" /></label>
          <label data-source-kind="whep">외부 WHEP URL<input name="whepUrl" placeholder="https://example.com/whep/stream" /></label>
          <p data-source-kind="whep" class="hint">외부 WebRTC playback endpoint를 서버가 WHEP pull source로 연결합니다. URL 자체가 입력값입니다.</p>
          <label data-source-kind="webrtc">Published sourceId<input name="webrtcSourceId" placeholder="published-source-id" /></label>
          <p data-source-kind="webrtc" class="hint">외부 URL을 넣는 항목이 아닙니다. 이 서버의 WHIP publish endpoint로 이미 등록된 sourceId를 연결합니다.</p>
          <label data-source-kind="http">HTTP/HLS URL<input name="httpUrl" /></label>
          <p id="channel-validation" class="hint"></p>
        </form>
      </section>
      <section class="section-card ops-audit-panel">
        <div class="toolbar">
          <div>
            <h3>변경 이력</h3>
            <p>이 브라우저에서 수행한 채널 변경의 작업자, 전/후 값, 시각을 확인합니다.</p>
          </div>
          <button id="channel-audit-refresh" class="button-secondary" type="button">새로고침</button>
        </div>
        <div id="channel-audit-list" class="audit-list" data-audit-area="channels"></div>
      </section>
)OPS";
    out << R"OPS(    </section>
)OPS";
    AppendOpsSourcesPageScript(out, JsonEscape(app::GetAppConfig().stream_route), app::GetAppConfig().rtsp_listen_port);
    AppendOpsShellEnd(out);
    return out.str();
}

std::string BuildOpsUsersPageHtml(const auth::Principal& principal) {
    std::ostringstream out;
    AppendOpsShellStart(out,
                        principal,
                        "users",
                        "관리자가 사용자 계정과 접근 범위를 관리합니다.");
    out << R"USERS(    <section class="panel" data-testid="ops-users-page">
      <div class="toolbar">
        <div>
          <h2>사용자 관리</h2>
          <p>사용자와 권한 범위를 관리합니다.</p>
        </div>
        <div class="actions">
          <button id="add-user-btn" class="button-primary" type="button">사용자 추가</button>
	          )USERS" << RefreshIconButtonHtml("refresh-btn", "button-secondary", "새로고침") << R"USERS(
          <span id="status" class="status"></span>
        </div>
      </div>
      <section class="section-card">
        <h2>사용자 목록</h2>
        <div class="table-wrap">
          <table class="ops-data-table user-table">
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

      <section class="section-card">
        <div class="toolbar">
          <div>
            <h2>접근 요청</h2>
            <p>요청을 검토하고 초대 링크를 발급합니다.</p>
          </div>
          <span id="request-status" class="status"></span>
        </div>
        <pre id="request-invite-output" hidden></pre>
        <div class="table-wrap">
          <table class="ops-data-table user-table">
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

      <section id="user-detail-panel" class="section-card" hidden>
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
              <label>채널 ID<input name="viewId" placeholder="1" /></label>
              <p class="hint">시청자/연동 계정에는 선택한 채널 조회 권한만 부여합니다. debug/lab/ops/source/rule 관리 권한은 허용하지 않습니다.</p>
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
        </form>
      </section>
      <section class="section-card ops-audit-panel">
        <div class="toolbar">
          <div>
            <h2>변경 이력</h2>
            <p>이 브라우저에서 수행한 사용자 변경의 작업자, 전/후 값, 시각을 확인합니다.</p>
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

media::IngressRequest BuildHttpIngressRequest(const std::string& path,
                                              const std::unordered_map<std::string, std::string>& query,
                                              const std::string& client_id) {
    media::IngressRequest request;
    request.protocol = "http";
    request.path = path;
    request.query = query;
    request.client_id = client_id;
    return request;
}

struct HttpSessionSecrets {
    std::string session_id;
    std::string session_capability;
};

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

std::optional<std::string> GeneratePrefixedRandomId(const std::string& prefix,
                                                    std::string* error_message) {
    const auto random = auth::GenerateSessionId(error_message);
    if (!random.has_value()) {
        return std::nullopt;
    }
    return prefix + "-" + *random;
}

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

bool SameSessionOwner(const auth::Principal& owner, const auth::Principal& current) {
    return owner.is_authenticated && current.is_authenticated &&
           PrincipalOwnerKey(owner) == PrincipalOwnerKey(current);
}

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

std::string ClientSessionJson(const std::string& client_session_id, const std::string& offer) {
    std::ostringstream out;
    out << "{"
        << "\"sessionId\":\"" << JsonEscape(client_session_id) << "\","
        << "\"clientSessionId\":\"" << JsonEscape(client_session_id) << "\","
        << "\"offer\":\"" << JsonEscape(offer) << "\""
        << "}";
    return out.str();
}

std::string IceJson(const std::vector<WebRtcIceCandidate>& candidates) {
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

std::string WebRtcMetadataChannelsJson(const std::vector<WebRtcMetadataChannelStats>& stats) {
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

// 다채널 검증과 수동 진단에서 WebRTC session 수와 dedup stream 수를 비교할 수 있게 JSON으로 직렬화한다.
std::string RuntimeStatusJson(const core::SessionManager::RuntimeStateSnapshot& snapshot,
                              std::size_t http_egress_sessions,
                              std::size_t whip_publish_sessions,
                              const std::vector<WebRtcMetadataChannelStats>& metadata_channel_stats,
                              int active_sse_metadata_clients,
                              int active_ws_metadata_clients,
                              const std::vector<PublishedWebRtcSource::Snapshot>& publish_sources,
                              const std::vector<analysis::AnalysisManager::TapSnapshot>& analysis_taps) {
    const auto profile_documents = AnalysisProfileDocumentsSnapshot();
    const auto rule_documents = AnalysisRuleDocumentsSnapshot();
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
            << "\"selectedRuleSpecificity\":" << tap.selected_rule_specificity
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
        << "\"debugCounters\":" << core::runtime_debug::SnapshotJson()
        << "}";
    return out.str();
}

struct BrowserIceServer {
    std::string urls;
    std::string username;
    std::string credential;
    bool has_credentials{false};
};

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

// 서버 WebRTC env 설정을 브라우저 RTCPeerConnection 생성 옵션 JSON으로 직렬화한다.
std::string WebRtcBrowserConfigJson() {
    const auto& config = app::GetAppConfig();
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

std::string DetectionJson(const analysis::Detection& detection) {
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

std::string DetectorDetectionJson(const analysis::Detection& detection) {
    if (!detection.detector_box_available) {
        return DetectionJson(detection);
    }
    analysis::Detection copy = detection;
    copy.box = detection.detector_box;
    return DetectionJson(copy);
}

std::string CloseObjectAssociationDiagnosticJson(
    const analysis::CloseObjectAssociationDiagnostic& diagnostic) {
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

std::string CloseObjectGuardModeJson() {
    const auto& config = app::GetAppConfig();
    const analysis::CloseObjectGuardMode mode =
        analysis::ParseCloseObjectGuardMode(config.analysis_tracking_close_object_guard_mode);
    const std::string mode_text = analysis::CloseObjectGuardModeToString(mode);
    std::string label = "guard off";
    if (mode == analysis::CloseObjectGuardMode::Diagnostic) {
        label = "diagnostic-only · score 변경 없음";
    } else if (mode == analysis::CloseObjectGuardMode::Enforce) {
        label = "score 보정 적용 중";
    }
    std::ostringstream out;
    out << "{"
        << "\"mode\":\"" << JsonEscape(mode_text) << "\","
        << "\"label\":\"" << JsonEscape(label) << "\","
        << "\"scoreMutationEnabled\":" << (mode == analysis::CloseObjectGuardMode::Enforce ? "true" : "false")
        << "}";
    return out.str();
}

std::string AnalysisDebugLineStateJson(const analysis::AnalysisDebugLineState& line) {
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

std::string AnalysisDebugTrackStateJson(const analysis::AnalysisDebugTrackState& track) {
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

std::string AnalysisDebugStateJson(const std::optional<analysis::AnalysisDebugState>& debug_state) {
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
    out << "]}";
    return out.str();
}

std::string TrackHealthMetricsJson(const analysis::TrackHealthMetrics& metrics) {
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

std::string AnalysisChannelMetricsJson(const analysis::AnalysisChannelMetrics& channel) {
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

std::string AnalysisMetricsReportJson(const std::optional<analysis::AnalysisMetricsReport>& report) {
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

std::string TrackJson(const analysis::Track& track) {
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

std::string AnalysisResultJson(const analysis::AnalysisResult& result) {
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

std::string AnalysisTapSnapshotJson(const analysis::AnalysisManager::TapSnapshot& snapshot) {
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

std::string AnalysisMetadataJson(const std::string& tap_id,
                                 const std::optional<analysis::AnalysisResult>& result) {
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

std::string AnalysisBboxDiagnosticsJson(const std::string& tap_id,
                                        std::int64_t requested_pts_ms,
                                        std::int64_t tolerance_ms,
                                        const std::optional<analysis::AnalysisResult>& result) {
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

bool SendAll(int fd, const std::string& data);
void SuppressSocketSigPipe(int fd);
analysis::EventRuleEvaluation EvaluateStoredEventRules(
    const analysis::AnalysisResult& result,
    const std::shared_ptr<analysis::EventRuleRuntime>& runtime);

struct VaMetadataStreamOptions {
    int interval_ms{app::GetAppConfig().webrtc_va_metadata_interval_ms};
    int stale_after_ms{5000};
    int stream_max_duration_ms{0};
    int stream_max_messages{0};
    std::size_t max_message_bytes{app::GetAppConfig().webrtc_va_metadata_max_message_bytes};
    std::size_t max_tracks{128};
    std::size_t max_events{64};
    bool include_source{true};
    bool include_scenarios{true};
    bool include_metrics{true};
    bool include_tracking_issue_report{true};
    analysis::VaMetadataSubscriptionFilter subscription_filter;
};

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

analysis::VaMetadataSubscriptionFilter BuildVaMetadataSubscriptionFilter(
    const std::unordered_map<std::string, std::string>& query) {
    analysis::VaMetadataSubscriptionFilter filter;
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

std::string VaMetadataSubscriptionFilterJson(const analysis::VaMetadataSubscriptionFilter& filter) {
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

VaMetadataStreamOptions BuildVaMetadataStreamOptions(const std::unordered_map<std::string, std::string>& query) {
    const auto& config = app::GetAppConfig();
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

std::string VaMetadataSubscriptionControlJson(const std::string& action,
                                              bool subscribed,
                                              const VaMetadataStreamOptions& options,
                                              const std::string& error_message = {}) {
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

std::string BuildVaRuntimeMetadataJsonWithinBudget(const analysis::AnalysisResult& result,
                                                   const std::vector<analysis::AnalysisEvent>& events,
                                                   const std::string& tracking_issue_report_json,
                                                   const VaMetadataStreamOptions& stream_options) {
    const auto filtered_result =
        analysis::FilterVaMetadataResult(result, stream_options.subscription_filter);
    const auto filtered_events =
        analysis::FilterVaMetadataEvents(events, stream_options.subscription_filter);
    analysis::VaRuntimeMetadataBuildOptions options;
    options.schema = analysis::kVaRuntimeMetadataSchema;
    options.include_source = stream_options.include_source;
    options.include_scenarios = stream_options.include_scenarios;
    options.include_metrics = stream_options.include_metrics;
    options.include_tracking_issue_report = stream_options.include_tracking_issue_report;
    options.max_tracks = stream_options.max_tracks;
    options.max_events = stream_options.max_events;

    std::string serialized;
    for (int attempt = 0; attempt < 16; ++attempt) {
        serialized = analysis::SerializeVaRuntimeMetadataFrameJson(
            analysis::BuildVaRuntimeMetadataFrame(
                filtered_result, filtered_events, options, tracking_issue_report_json));
        if (serialized.size() <= stream_options.max_message_bytes) {
            return serialized;
        }
        bool reduced = false;
        if (options.max_events > 1) {
            options.max_events = std::max<std::size_t>(1, options.max_events / 2);
            reduced = true;
        } else if (options.max_tracks > 1) {
            options.max_tracks = std::max<std::size_t>(1, options.max_tracks / 2);
            reduced = true;
        }
        if (!reduced) {
            break;
        }
    }
    return {};
}

std::string LowerAscii(std::string value) {
    std::transform(value.begin(), value.end(), value.begin(), [](unsigned char ch) {
        return static_cast<char>(std::tolower(ch));
    });
    return value;
}

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

std::uint32_t Sha1RotateLeft(std::uint32_t value, int bits) {
    return (value << bits) | (value >> (32 - bits));
}

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

std::string WebSocketAcceptKey(const std::string& client_key) {
    static constexpr const char* kMagicGuid = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
    const auto digest = Sha1Digest(client_key + kMagicGuid);
    return Base64Encode(digest.data(), digest.size());
}

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

bool SendWebSocketTextFrame(int fd, const std::string& payload) {
    return SendWebSocketServerFrame(fd, 0x1U, payload);
}

bool SendWebSocketPongFrame(int fd, const std::string& payload) {
    return SendWebSocketServerFrame(fd, 0xAU, payload);
}

bool SendWebSocketCloseFrame(int fd) {
    return SendWebSocketServerFrame(fd, 0x8U, {});
}

struct WebSocketReadResult {
    bool has_frame{false};
    bool close_requested{false};
    bool protocol_error{false};
    unsigned char opcode{0};
    std::string payload;
    std::string error_message;
};

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

bool SendSseComment(int fd, const std::string& comment) {
    return SendAll(fd, ": " + comment + "\n\n");
}

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

bool StreamVaMetadataSse(int client_fd,
                         const std::atomic<bool>& running,
                         core::SessionManager& session_manager,
                         const std::string& tap_id,
                         const std::unordered_map<std::string, std::string>& query,
                         const HttpRequest& request) {
    SuppressSocketSigPipe(client_fd);
    const VaMetadataStreamOptions options = BuildVaMetadataStreamOptions(query);
    if (!SendSseHeaders(client_fd, request)) {
        return false;
    }

    auto event_runtime = analysis::CreateEventRuleRuntime();
    std::uint64_t sse_sequence = 1;
    std::uint64_t last_frame_id = 0;
    std::int64_t last_pts = std::numeric_limits<std::int64_t>::min();
    int sent_messages = 0;
    auto started_at = std::chrono::steady_clock::now();
    auto last_fresh_at = started_at;
    auto last_stale_comment_at = started_at - std::chrono::milliseconds(options.stale_after_ms);

    if (!SendSseComment(client_fd,
                        "va metadata stream opened; schema=" +
                            std::string(analysis::kVaRuntimeMetadataSchema) +
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

        const auto snapshot = session_manager.AnalysisTapSnapshot(tap_id);
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
                const auto evaluation = EvaluateStoredEventRules(result, event_runtime);
                const std::string payload = BuildVaRuntimeMetadataJsonWithinBudget(
                    evaluation.annotated_result,
                    evaluation.events,
                    evaluation.tracking_issue_report_json,
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

bool StreamVaMetadataWebSocket(int client_fd,
                               const std::atomic<bool>& running,
                               core::SessionManager& session_manager,
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

    auto event_runtime = analysis::CreateEventRuleRuntime();
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

        const auto snapshot = session_manager.AnalysisTapSnapshot(tap_id);
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
                const auto evaluation = EvaluateStoredEventRules(result, event_runtime);
                const std::string payload = BuildVaRuntimeMetadataJsonWithinBudget(
                    evaluation.annotated_result,
                    evaluation.events,
                    evaluation.tracking_issue_report_json,
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

std::string AnalysisStateDumpJson(const std::string& tap_id,
                                  const analysis::AnalysisManager::TapSnapshot& snapshot,
                                  const std::optional<analysis::EventRuleEvaluation>& evaluation) {
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
        out << AnalysisDebugStateJson(evaluation->annotated_result.debug_state);
    } else {
        out << "null";
    }
    out << "}";
    return out.str();
}

std::string AnalysisMetricsDumpJson(const std::string& tap_id,
                                    const analysis::AnalysisManager::TapSnapshot& snapshot,
                                    const std::optional<analysis::EventRuleEvaluation>& evaluation) {
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
        out << AnalysisMetricsReportJson(evaluation->metrics_report);
    } else {
        out << "null";
    }
    out << ",\"trackingIssueReport\":";
    if (evaluation.has_value() && !evaluation->tracking_issue_report_json.empty()) {
        out << evaluation->tracking_issue_report_json;
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

std::string AnalysisTapCreatedJson(const core::SessionManager::AnalysisTapResult& result,
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

std::string AnalysisTapListJson(const std::vector<analysis::AnalysisManager::TapSnapshot>& snapshots) {
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

struct StaticImageAnalysis {
    analysis::RawVideoFrame frame;
    analysis::AnalysisResult result;
    analysis::AnalysisProfile profile;
    std::string root_name;
    std::string token;
    double analysis_ms{0.0};
};

// 문자열 vector를 JSON array로 직렬화한다.
std::string StringVectorJson(const std::vector<std::string>& values) {
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

// Rule/Profile UI와 capabilities API가 공유하는 category catalog를 JSON으로 만든다.
std::string AnalysisCategoryCatalogJson() {
    std::ostringstream out;
    out << "[";
    const auto& categories = analysis::CategoryTokenCatalog();
    for (std::size_t i = 0; i < categories.size(); ++i) {
        const auto& item = categories[i];
        if (i != 0) {
            out << ",";
        }
        out << "{"
            << "\"value\":\"" << JsonEscape(item.token) << "\","
            << "\"label\":\"" << JsonEscape(item.label_ko) << "\","
            << "\"hint\":\"" << JsonEscape(item.hint) << "\","
            << "\"group\":\"" << JsonEscape(item.group) << "\","
            << "\"aliases\":" << StringVectorJson(item.aliases) << ","
            << "\"labels\":" << StringVectorJson(item.labels) << ","
            << "\"displayLabels\":" << StringVectorJson(item.display_labels_ko)
            << "}";
    }
    out << "]";
    return out.str();
}

std::string AnalysisCapabilitiesJson() {
    std::ostringstream out;
    out << R"({"detectors":[{"id":"dummy","name":"테스트용 더미 검출기","runtime":"builtin"},{"id":"yolo","name":"YOLO ONNX Runtime","runtime":"onnxruntime","requiresBuildFlag":"MEDIA_SERVER_USE_ONNXRUNTIME"}],"preprocessModes":["letterbox","stretch"],"yoloOutputLayouts":["auto","channels-first","channels-last"],"yoloBoxFormats":["cxcywh","xyxy"],"yoloScoreModes":["auto","class-only","objectness-class","score-class","class-score"],"outputs":["metadata","events","snapshot.jpg","overlay.jpg","image-metadata","image-snapshot.jpg","image-overlay.jpg","rtsp-overlay","webrtc-overlay"],"eventTypes":["presence","enter","exit","line-crossing"],)"
        << "\"trackingCategories\":" << AnalysisCategoryCatalogJson() << ","
        << R"("eventActions":{"highlight":"blink overlay for matched object","post":"async curl-based POST worker with bounded queue and cooldown"},"metrics":["receivedVideoPackets","decodedFrames","sampledFrames","analyzedPackets","droppedPackets","pendingFrames","peakPendingFrames","effectiveDecodedFps","effectiveSampledFps","effectiveAnalyzedFps","lastQueueWaitMs","averageQueueWaitMs","lastInferenceMs","averageInferenceMs","lastAnalysisMs","averageAnalysisMs","maxAnalysisMs","adaptiveState","adaptiveDownshiftCount","adaptiveUpshiftCount"],"shortQuery":{"va":"1 enables the server default VA overlay profile with lightweight tracking for person/vehicle categories","overlay":"alias for va=1","analysis":"alias for va=1"},"advancedQuery":{"tracking":"optional object tracking on/off","trackingClasses":"optional comma-separated categories/classes: person,vehicle,road,animal,sports,tableware,food,furniture,device,object or '*' for all","fps":"optional VA wall-clock sampling fps override","maxQueue":"optional detector queue override","frameSampleInterval":"optional deterministic decoded-frame sampling interval; 1 means every decoded frame after fps gate","sampleEveryNFrames":"alias for frameSampleInterval","maxFrameAgeMs":"optional stale analysis frame drop threshold; 0 disables age drop","adaptive":"optional adaptive tuner on/off","adaptiveInputSize":"optional input size tuning on/off","adaptiveMinFps":"optional adaptive lower fps bound","adaptiveMaxFps":"optional adaptive upper fps bound","adaptiveMinInputWidth":"optional adaptive lower input width","adaptiveMinInputHeight":"optional adaptive lower input height","adaptiveCooldownMs":"optional adaptive action cooldown","overlayWaitMs":"optional max wait for near-PTS analysis result","overlaySyncToleranceMs":"optional allowed PTS distance for result matching","preprocess":"optional letterbox/stretch override","outputLayout":"optional YOLO output tensor layout: auto|channels-first|channels-last","boxFormat":"optional YOLO box format: cxcywh|xyxy","scoreMode":"optional YOLO score mode: auto|class-only|objectness-class|score-class|class-score","thickness":"optional box line thickness","drawLabels":"optional label visibility","trackIds":"optional track id labels on overlay","trackTrails":"optional track trail overlay","redaction":"optional person-mosaic/mosaic overlay redaction","redactionClasses":"optional comma-separated redaction categories/classes, default person","redactionBlockSize":"optional mosaic block size in pixels","redactionMarginRatio":"optional bbox expansion ratio for redaction"}})";
    return out.str();
}

std::string AnalysisProfilesJson() {
    return AnalysisRegistry().ProfilesJson();
}

std::string AnalysisRulesJson() {
    return AnalysisRegistry().RulesJson();
}

std::string AnalysisVaRulesJson() {
    return AnalysisRegistry().VaRulesJson();
}

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

bool IsSupportedImageFile(const std::filesystem::path& path) {
    std::string ext = path.extension().string();
    std::transform(ext.begin(), ext.end(), ext.begin(), [](unsigned char ch) {
        return static_cast<char>(std::tolower(ch));
    });
    return ext == ".jpg" || ext == ".jpeg" || ext == ".png" || ext == ".bmp" || ext == ".webp";
}

bool HasParentTraversal(const std::filesystem::path& path) {
    for (const auto& part : path) {
        if (part == "..") {
            return true;
        }
    }
    return false;
}

std::filesystem::path ProjectRelativeRoot(const std::filesystem::path& root) {
    if (root.is_absolute()) {
        return root;
    }
    return std::filesystem::current_path() / root;
}

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
    return ResolvePathUnderRoot(app::GetAppConfig().file_root_path, token, output, normalized_token, error_message);
}

bool QueryHasAny(const std::unordered_map<std::string, std::string>& query,
                 std::initializer_list<const char*> keys) {
    return std::any_of(keys.begin(), keys.end(), [&query](const char* key) {
        return query.find(key) != query.end();
    });
}

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

    if (!analysis::DecodeImageFileToRawFrame(image_path, &output->frame, error_message)) {
        return false;
    }
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
    output->profile = ResolveAnalysisProfileForContext(BuildAnalysisProfileFromQuery(profile_query), context);
    output->profile.adaptive_tuning_enabled = false;
    output->profile.adaptive_input_size_enabled = false;

    auto detector = analysis::CreateDetector(output->profile);
    if (detector == nullptr) {
        if (error_message != nullptr) {
            *error_message = "failed to create image detector";
        }
        return false;
    }
    if (!detector->Start(error_message)) {
        return false;
    }

    const auto started_at = std::chrono::steady_clock::now();
    const bool analyzed = detector->Analyze(output->frame, &output->result, error_message);
    output->analysis_ms =
        std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - started_at).count();
    detector->Stop();
    if (!analyzed) {
        return false;
    }

    output->result.source_key = output->frame.source_key;
    output->result.profile_key = analysis::BuildProfileKey(output->profile);
    output->result.context = std::move(context);
    output->result.pts = output->frame.pts;
    output->result.frame_width = output->frame.width;
    output->result.frame_height = output->frame.height;
    if (output->profile.enable_tracking) {
        // 이미지 API는 frame이 한 장뿐이라 일회성 tracker로 trackId 정책만 동일하게 적용한다.
        analysis::ObjectTrackerOptions tracker_options;
        tracker_options.class_labels = output->profile.tracking_class_labels;
        tracker_options.track_all_when_class_labels_empty = !output->profile.tracking_classes_specified;
        const auto& config = app::GetAppConfig();
        tracker_options.iou_weight = config.analysis_tracking_iou_weight;
        tracker_options.distance_weight = config.analysis_tracking_distance_weight;
        tracker_options.direction_weight = config.analysis_tracking_direction_weight;
        tracker_options.class_weight = config.analysis_tracking_class_weight;
        tracker_options.min_association_score = config.analysis_tracking_min_association_score;
        tracker_options.smoothing_alpha = config.analysis_tracking_smoothing_alpha;
        tracker_options.close_object_guard_mode =
            analysis::ParseCloseObjectGuardMode(config.analysis_tracking_close_object_guard_mode);
        tracker_options.close_object_distance_ratio = config.analysis_tracking_close_object_distance_ratio;
        tracker_options.close_object_overlap_threshold =
            config.analysis_tracking_close_object_overlap_threshold;
        tracker_options.close_object_low_margin_threshold =
            config.analysis_tracking_close_object_low_margin_threshold;
        tracker_options.close_object_center_jump_penalty = config.analysis_tracking_center_jump_penalty;
        tracker_options.close_object_min_score_boost =
            config.analysis_tracking_close_object_min_score_boost;
        tracker_options.max_close_object_diagnostics =
            config.analysis_tracking_close_object_max_diagnostics;
        tracker_options.max_missed_frames = config.analysis_tracking_lost_buffer_frames;
        analysis::ObjectTracker tracker(tracker_options);
        tracker.Update(&output->result);
    }
    if (error_message != nullptr) {
        error_message->clear();
    }
    return true;
}

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

std::mutex& EventRuleRuntimeMapMutex() {
    static std::mutex mu;
    return mu;
}

std::unordered_map<std::string, std::shared_ptr<analysis::EventRuleRuntime>>& EventRuleRuntimeMap() {
    static std::unordered_map<std::string, std::shared_ptr<analysis::EventRuleRuntime>> runtimes;
    return runtimes;
}

std::shared_ptr<analysis::EventRuleRuntime> EventRuleRuntimeForKey(const std::string& key) {
    std::lock_guard lock(EventRuleRuntimeMapMutex());
    auto& runtimes = EventRuleRuntimeMap();
    const auto it = runtimes.find(key);
    if (it != runtimes.end() && it->second != nullptr) {
        return it->second;
    }
    auto created = analysis::CreateEventRuleRuntime();
    runtimes[key] = created;
    return created;
}

void ReleaseEventRuleRuntimeForKey(const std::string& key) {
    std::lock_guard lock(EventRuleRuntimeMapMutex());
    EventRuleRuntimeMap().erase(key);
}

bool DetachAnalysisTapAndReleaseRuntimes(core::SessionManager& session_manager, const std::string& tap_id) {
    if (tap_id.empty()) {
        return false;
    }
    const auto detach_result = session_manager.DetachAnalysisTapRef(tap_id);
    // 이벤트 룰 runtime은 enter/exit/line-crossing 이전 상태를 들고 있으므로 tap 수명과 함께 정리한다.
    if (detach_result.removed) {
        ReleaseEventRuleRuntimeForKey("webrtc-overlay:" + tap_id);
        ReleaseEventRuleRuntimeForKey("tap-events:" + tap_id);
        ReleaseEventRuleRuntimeForKey("tap-overlay:" + tap_id);
        ReleaseEventRuleRuntimeForKey("tap-state-dump:" + tap_id);
        ReleaseEventRuleRuntimeForKey("tap-metrics:" + tap_id);
    }
    return detach_result.ok;
}

analysis::EventRuleEvaluation EvaluateStoredEventRules(
    const analysis::AnalysisResult& result,
    const std::shared_ptr<analysis::EventRuleRuntime>& runtime) {
    return analysis::ApplyEventRulesToResult(result, AnalysisRegistry().RuleDocuments(), runtime);
}

std::string AnalysisEventJson(const analysis::AnalysisEvent& event) {
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

std::string AnalysisEventsJson(const std::string& tap_id,
                               const std::optional<analysis::AnalysisResult>& result,
                               const analysis::EventRuleEvaluation* evaluation) {
    std::ostringstream out;
    out << "{"
        << "\"tapId\":\"" << JsonEscape(tap_id) << "\","
        << "\"hasResult\":" << (result.has_value() ? "true" : "false") << ","
        << "\"activeRuleCount\":" << (evaluation != nullptr ? evaluation->active_rule_count : 0) << ","
        << "\"matchedDetectionCount\":" << (evaluation != nullptr ? evaluation->matched_detection_count : 0)
        << ",\"events\":[";
    if (evaluation != nullptr) {
        for (std::size_t i = 0; i < evaluation->events.size(); ++i) {
            if (i != 0) {
                out << ",";
            }
            out << AnalysisEventJson(evaluation->events[i]);
        }
    }
    out << "],\"result\":";
    if (evaluation != nullptr) {
        out << AnalysisResultJson(evaluation->annotated_result);
    } else if (result.has_value()) {
        out << AnalysisResultJson(*result);
    } else {
        out << "null";
    }
    out << "}";
    return out.str();
}

WebRtcMetadataChannelConfig BuildWebRtcMetadataChannelConfigFromQuery(
    const std::unordered_map<std::string, std::string>& query) {
    const auto& app_config = app::GetAppConfig();
    WebRtcMetadataChannelConfig config;
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

std::int64_t PtsNsToMs(std::int64_t pts_ns) {
    return pts_ns / 1000000LL;
}

std::int64_t NowUnixMs() {
    return std::chrono::duration_cast<std::chrono::milliseconds>(
               std::chrono::system_clock::now().time_since_epoch())
        .count();
}

std::filesystem::path OpsAuditStoragePath(const app::AppConfig& config) {
    std::filesystem::path base = config.source_registry_path.empty()
                                     ? std::filesystem::path(".")
                                     : std::filesystem::path(config.source_registry_path).parent_path();
    if (base.empty()) {
        base = ".";
    }
    return base / ".media_server.ops_audit.jsonl";
}

bool AuditSensitiveKey(const std::string& key) {
    std::string lowered;
    lowered.reserve(key.size());
    for (const char ch : key) {
        lowered.push_back(static_cast<char>(std::tolower(static_cast<unsigned char>(ch))));
    }
    return lowered.find("password") != std::string::npos ||
           lowered.find("token") != std::string::npos ||
           lowered.find("hash") != std::string::npos ||
           lowered.find("secret") != std::string::npos ||
           lowered.find("capability") != std::string::npos;
}

std::string RedactAuditJsonFragment(std::string json) {
    for (std::size_t pos = 0; pos < json.size();) {
        if (json[pos] != '"') {
            ++pos;
            continue;
        }
        std::size_t key_end = pos + 1;
        bool escaped = false;
        std::string key;
        for (; key_end < json.size(); ++key_end) {
            const char ch = json[key_end];
            if (escaped) {
                key.push_back(ch);
                escaped = false;
                continue;
            }
            if (ch == '\\') {
                escaped = true;
                continue;
            }
            if (ch == '"') {
                break;
            }
            key.push_back(ch);
        }
        if (key_end >= json.size()) {
            break;
        }
        std::size_t colon = key_end + 1;
        while (colon < json.size() && std::isspace(static_cast<unsigned char>(json[colon])) != 0) {
            ++colon;
        }
        if (colon >= json.size() || json[colon] != ':') {
            pos = key_end + 1;
            continue;
        }
        std::size_t value_start = colon + 1;
        while (value_start < json.size() &&
               std::isspace(static_cast<unsigned char>(json[value_start])) != 0) {
            ++value_start;
        }
        if (!AuditSensitiveKey(key) || value_start >= json.size()) {
            pos = value_start;
            continue;
        }
        std::size_t value_end = value_start;
        if (json[value_start] == '{') {
            value_end = ExtractDelimitedValueAt(json, value_start, '{', '}').has_value()
                            ? value_start + ExtractDelimitedValueAt(json, value_start, '{', '}')->size()
                            : value_start + 1;
        } else if (json[value_start] == '[') {
            value_end = ExtractDelimitedValueAt(json, value_start, '[', ']').has_value()
                            ? value_start + ExtractDelimitedValueAt(json, value_start, '[', ']')->size()
                            : value_start + 1;
        } else if (json[value_start] == '"') {
            bool value_escaped = false;
            value_end = value_start + 1;
            for (; value_end < json.size(); ++value_end) {
                const char ch = json[value_end];
                if (value_escaped) {
                    value_escaped = false;
                    continue;
                }
                if (ch == '\\') {
                    value_escaped = true;
                    continue;
                }
                if (ch == '"') {
                    ++value_end;
                    break;
                }
            }
        } else {
            while (value_end < json.size() && json[value_end] != ',' &&
                   json[value_end] != '}' && json[value_end] != ']') {
                ++value_end;
            }
        }
        json.replace(value_start, value_end - value_start, "\"[redacted]\"");
        pos = value_start + 12;
    }
    return json;
}

std::string OpsAuditRecordJson(const std::string& body, const auth::Principal& principal) {
    const std::int64_t now_ms = NowUnixMs();
    const std::uint64_t seq = g_ops_audit_sequence.fetch_add(1, std::memory_order_relaxed) + 1;
    const std::string area = Trim(ParseStringField(body, "area").value_or("ops"));
    const std::string action = Trim(ParseStringField(body, "action").value_or("update"));
    const std::string target = Trim(ParseStringField(body, "target").value_or(""));
    const std::string summary = Trim(ParseStringField(body, "summary").value_or(""));
    const std::string at = Trim(ParseStringField(body, "at").value_or(std::to_string(now_ms)));
    std::string before = ExtractJsonValueField(body, "before").value_or("null");
    std::string after = ExtractJsonValueField(body, "after").value_or("null");
    before = RedactAuditJsonFragment(std::move(before));
    after = RedactAuditJsonFragment(std::move(after));
    std::ostringstream out;
    out << "{"
        << "\"id\":\"audit-" << now_ms << "-" << seq << "\","
        << "\"at\":\"" << JsonEscape(at) << "\","
        << "\"receivedAtMs\":" << now_ms << ","
        << "\"actor\":\""
        << JsonEscape(principal.username.empty() ? principal.display_name : principal.username) << "\","
        << "\"role\":\"" << JsonEscape(principal.role) << "\","
        << "\"authMode\":\"" << JsonEscape(principal.auth_mode) << "\","
        << "\"area\":\"" << JsonEscape(area.empty() ? "ops" : area) << "\","
        << "\"action\":\"" << JsonEscape(action.empty() ? "update" : action) << "\","
        << "\"target\":\"" << JsonEscape(target) << "\","
        << "\"summary\":\"" << JsonEscape(summary) << "\","
        << "\"before\":" << before << ","
        << "\"after\":" << after
        << "}";
    return out.str();
}

bool AppendOpsAuditRecord(const app::AppConfig& config,
                          const std::string& record_json,
                          std::string* error_message) {
    const std::filesystem::path path = OpsAuditStoragePath(config);
    std::error_code ec;
    std::filesystem::create_directories(path.parent_path(), ec);
    if (ec) {
        if (error_message != nullptr) {
            *error_message = "failed to create audit directory: " + ec.message();
        }
        return false;
    }
    std::lock_guard lock(g_ops_audit_mu);
    std::ofstream out(path, std::ios::app);
    if (!out) {
        if (error_message != nullptr) {
            *error_message = "failed to open audit log: " + path.string();
        }
        return false;
    }
    out << record_json << "\n";
    out.flush();
    if (!out) {
        if (error_message != nullptr) {
            *error_message = "failed to write audit log: " + path.string();
        }
        return false;
    }
    return true;
}

bool OpsAuditLineMatches(const std::string& line,
                         const std::string& area,
                         const std::string& actor,
                         const std::string& action,
                         const std::string& query_text) {
    if (!area.empty() && ParseStringField(line, "area").value_or("") != area) {
        return false;
    }
    if (!actor.empty() && ParseStringField(line, "actor").value_or("").find(actor) == std::string::npos) {
        return false;
    }
    if (!action.empty() && ParseStringField(line, "action").value_or("") != action) {
        return false;
    }
    if (!query_text.empty() && line.find(query_text) == std::string::npos) {
        return false;
    }
    return true;
}

struct OpsAuditQueryResult {
    std::filesystem::path storage_path;
    std::vector<std::string> entries;
    int offset{0};
    int limit{80};
    int total{0};
    bool has_more{false};
};

OpsAuditQueryResult QueryOpsAuditEntries(const app::AppConfig& config,
                                         const std::unordered_map<std::string, std::string>& query) {
    const std::string area = query.count("area") != 0 ? Trim(query.at("area")) : std::string();
    const std::string actor = query.count("actor") != 0 ? Trim(query.at("actor")) : std::string();
    const std::string action = query.count("action") != 0 ? Trim(query.at("action")) : std::string();
    const std::string query_text = query.count("q") != 0 ? Trim(query.at("q")) : std::string();
    const int limit = ParseClampedIntQuery(query, "limit", 80, 1, 200);
    const int offset = ParseClampedIntQuery(query, "offset", 0, 0, 1000000);
    const std::filesystem::path path = OpsAuditStoragePath(config);
    std::vector<std::string> lines;
    {
        std::lock_guard lock(g_ops_audit_mu);
        std::ifstream in(path);
        std::string line;
        while (std::getline(in, line)) {
            line = Trim(line);
            if (!line.empty() && line.front() == '{' && OpsAuditLineMatches(line, area, actor, action, query_text)) {
                lines.push_back(line);
            }
        }
    }
    OpsAuditQueryResult result;
    result.storage_path = path;
    result.offset = offset;
    result.limit = limit;
    result.total = static_cast<int>(lines.size());
    int skipped = 0;
    for (auto it = lines.rbegin(); it != lines.rend() && static_cast<int>(result.entries.size()) < limit; ++it) {
        if (skipped < offset) {
            ++skipped;
            continue;
        }
        result.entries.push_back(*it);
    }
    result.has_more = offset + static_cast<int>(result.entries.size()) < result.total;
    return result;
}

std::string OpsAuditEntriesJson(const app::AppConfig& config,
                                const std::unordered_map<std::string, std::string>& query) {
    const OpsAuditQueryResult result = QueryOpsAuditEntries(config, query);
    std::ostringstream out;
    out << "{\"status\":\"ops-audit\",\"persistent\":true,\"storagePath\":\""
        << JsonEscape(result.storage_path.string()) << "\",\"offset\":" << result.offset
        << ",\"limit\":" << result.limit << ",\"total\":" << result.total
        << ",\"hasMore\":" << (result.has_more ? "true" : "false")
        << ",\"nextOffset\":" << (result.has_more ? result.offset + static_cast<int>(result.entries.size()) : result.offset)
        << ",\"entries\":[";
    for (std::size_t i = 0; i < result.entries.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << result.entries[i];
    }
    out << "]}";
    return out.str();
}

std::string CsvCell(std::string value) {
    std::string out = "\"";
    for (const char ch : value) {
        if (ch == '"') {
            out += "\"\"";
        } else {
            out.push_back(ch);
        }
    }
    out += "\"";
    return out;
}

std::string OpsAuditEntriesCsv(const app::AppConfig& config,
                               const std::unordered_map<std::string, std::string>& query) {
    OpsAuditQueryResult result = QueryOpsAuditEntries(config, query);
    std::ostringstream out;
    out << "id,at,receivedAtMs,actor,role,area,action,target,summary,before,after\n";
    for (const std::string& entry : result.entries) {
        out << CsvCell(ParseStringField(entry, "id").value_or("")) << ","
            << CsvCell(ParseStringField(entry, "at").value_or("")) << ","
            << CsvCell(ExtractJsonValueField(entry, "receivedAtMs").value_or("")) << ","
            << CsvCell(ParseStringField(entry, "actor").value_or("")) << ","
            << CsvCell(ParseStringField(entry, "role").value_or("")) << ","
            << CsvCell(ParseStringField(entry, "area").value_or("")) << ","
            << CsvCell(ParseStringField(entry, "action").value_or("")) << ","
            << CsvCell(ParseStringField(entry, "target").value_or("")) << ","
            << CsvCell(ParseStringField(entry, "summary").value_or("")) << ","
            << CsvCell(ExtractJsonValueField(entry, "before").value_or("null")) << ","
            << CsvCell(ExtractJsonValueField(entry, "after").value_or("null")) << "\n";
    }
    return out.str();
}

std::string JsonStringArrayOrDefault(const std::string& body,
                                     const std::string& field,
                                     const std::string& fallback) {
    const auto value = ExtractArrayField(body, field);
    return value.has_value() ? *value : fallback;
}

std::string SourceBulkPayload(const std::string& source_raw,
                              const std::string& source_id,
                              const std::string& display_name,
                              bool enabled,
                              bool allow_duplicate_source = false) {
    const std::string kind = ParseStringField(source_raw, "kind").value_or("file");
    std::ostringstream out;
    out << "{"
        << "\"sourceId\":\"" << JsonEscape(source_id) << "\","
        << "\"displayName\":\"" << JsonEscape(display_name.empty() ? source_id : display_name) << "\","
        << "\"kind\":\"" << JsonEscape(kind) << "\","
        << "\"enabled\":" << (enabled ? "true" : "false") << ","
        << "\"allowDuplicateSource\":" << (allow_duplicate_source ? "true" : "false") << ","
        << "\"tags\":" << JsonStringArrayOrDefault(source_raw, "tags", "[]") << ","
        << "\"ownerGroup\":\"" << JsonEscape(ParseStringField(source_raw, "ownerGroup").value_or("")) << "\"";
    if (const auto value = ParseStringField(source_raw, "file"); value.has_value()) {
        out << ",\"file\":\"" << JsonEscape(*value) << "\"";
    }
    if (const auto value = ParseStringField(source_raw, "rtspUrl"); value.has_value()) {
        out << ",\"rtspUrl\":\"" << JsonEscape(*value) << "\"";
    }
    if (const auto value = ParseStringField(source_raw, "webrtcSourceId"); value.has_value()) {
        out << ",\"webrtcSourceId\":\"" << JsonEscape(*value) << "\"";
    }
    if (const auto value = ParseStringField(source_raw, "whepUrl"); value.has_value()) {
        out << ",\"whepUrl\":\"" << JsonEscape(*value) << "\"";
    }
    if (const auto value = ParseStringField(source_raw, "httpUrl"); value.has_value()) {
        out << ",\"httpUrl\":\"" << JsonEscape(*value) << "\"";
    }
    out << "}";
    return out.str();
}

std::string ViewBulkPayload(const std::string& view_raw,
                            const std::string& source_raw,
                            const std::string& view_id,
                            const std::string& source_id,
                            const std::string& display_name,
                            bool enabled) {
    std::ostringstream out;
    out << "{"
        << "\"viewId\":\"" << JsonEscape(view_id) << "\","
        << "\"displayName\":\"" << JsonEscape(display_name.empty() ? view_id : display_name) << "\","
        << "\"sourceId\":\"" << JsonEscape(source_id) << "\","
        << "\"defaultRuleId\":\"" << JsonEscape(ParseStringField(view_raw, "defaultRuleId").value_or("")) << "\","
        << "\"allowedRuleIds\":" << JsonStringArrayOrDefault(view_raw, "allowedRuleIds", "[]") << ","
        << "\"allowedOverlayModes\":"
        << JsonStringArrayOrDefault(view_raw, "allowedOverlayModes", "[\"raw\",\"va-overlay\",\"va-rule\"]")
        << ","
        << "\"showDashboard\":"
        << (ParseBoolField(view_raw, "showDashboard").value_or(true) ? "true" : "false") << ","
        << "\"showEvents\":" << (ParseBoolField(view_raw, "showEvents").value_or(true) ? "true" : "false")
        << ","
        << "\"showMetadataSummary\":"
        << (ParseBoolField(view_raw, "showMetadataSummary").value_or(true) ? "true" : "false") << ","
        << "\"clientGroups\":" << JsonStringArrayOrDefault(view_raw, "clientGroups", "[]") << ","
        << "\"maxTiles\":" << ParseIntField(view_raw, "maxTiles").value_or(1) << ","
        << "\"enabled\":" << (enabled ? "true" : "false") << "}";
    (void)source_raw;
    return out.str();
}

bool SourceHasPlayableLocator(const std::string& source_raw) {
    const std::string kind = ParseStringField(source_raw, "kind").value_or("file");
    if (kind == "file") return !Trim(ParseStringField(source_raw, "file").value_or("")).empty();
    if (kind == "rtsp") return !Trim(ParseStringField(source_raw, "rtspUrl").value_or("")).empty();
    if (kind == "whep") return !Trim(ParseStringField(source_raw, "whepUrl").value_or("")).empty();
    if (kind == "webrtc") return !Trim(ParseStringField(source_raw, "webrtcSourceId").value_or("")).empty();
    if (kind == "http" || kind == "hls") return !Trim(ParseStringField(source_raw, "httpUrl").value_or("")).empty();
    return !Trim(ParseStringField(source_raw, "url").value_or("")).empty();
}

std::string NextBulkChannelId(std::set<int>* used_ids) {
    int candidate = 1;
    while (used_ids->count(candidate) != 0) {
        ++candidate;
    }
    used_ids->insert(candidate);
    return std::to_string(candidate);
}

std::set<int> CurrentNumericSourceIds() {
    std::set<int> ids;
    const RegistryResult result = SourceViewRegistry::Instance().SourcesJson();
    for (const auto& item : ExtractJsonObjectArray(result.body, "sources")) {
        const std::string id = ParseStringField(item, "sourceId").value_or("");
        if (!id.empty() && std::all_of(id.begin(), id.end(), [](char ch) {
                return std::isdigit(static_cast<unsigned char>(ch)) != 0;
            })) {
            ids.insert(std::stoi(id));
        }
    }
    return ids;
}

std::string OpsChannelBulkJson(const std::string& body) {
    const std::string operation =
        Trim(ParseStringField(body, "operation").value_or(ParseStringField(body, "action").value_or("validate")));
    const bool dry_run = ParseBoolField(body, "dryRun").value_or(operation == "validate");
    const auto items = ExtractJsonObjectArray(body, "items");
    std::set<int> used_ids = CurrentNumericSourceIds();
    int ok_count = 0;
    int fail_count = 0;
    std::ostringstream results;
    results << "[";
    for (std::size_t index = 0; index < items.size(); ++index) {
        const std::string& item = items[index];
        const std::string source_raw = ExtractObjectField(item, "source").value_or("{}");
        const std::string view_raw = ExtractObjectField(item, "view").value_or("{}");
        const std::string source_id =
            Trim(ParseStringField(item, "sourceId").value_or(ParseStringField(source_raw, "sourceId").value_or("")));
        std::string target_id = source_id;
        const std::string requested_result_id =
            Trim(ParseStringField(item, "resultSourceId").value_or(ParseStringField(item, "rollbackSourceId").value_or("")));
        const std::string rollback_mode = Trim(ParseStringField(item, "rollbackMode").value_or("restore"));
        std::string display_name =
            ParseStringField(view_raw, "displayName").value_or(ParseStringField(source_raw, "displayName").value_or(source_id));
        bool item_ok = true;
        std::string message = "validated";
        std::string result_source_id = source_id;
        std::string result_view_id = ParseStringField(view_raw, "viewId").value_or(source_id);
        bool retryable = false;
        if (source_id.empty()) {
            item_ok = false;
            message = "sourceId is required";
            retryable = true;
        } else if (!SourceHasPlayableLocator(source_raw)) {
            item_ok = false;
            message = "source locator is missing";
            retryable = true;
        } else if (operation == "clone") {
            target_id = NextBulkChannelId(&used_ids);
            display_name = display_name.empty() ? target_id : display_name + " 복제";
            result_source_id = target_id;
            result_view_id = target_id;
        } else if (operation == "rollback") {
            if (rollback_mode == "disable-created") {
                target_id = requested_result_id.empty() ? source_id : requested_result_id;
                result_source_id = target_id;
                result_view_id = target_id;
                display_name = display_name.empty() ? target_id : display_name;
            }
        } else if (operation != "validate" && operation != "disable") {
            item_ok = false;
            message = "unsupported bulk operation";
        }
        if (item_ok && !dry_run && operation == "rollback") {
            if (rollback_mode == "disable-created") {
                const RegistryResult source_result =
                    SourceViewRegistry::Instance().UpsertSource(
                        target_id, SourceBulkPayload(source_raw, target_id, display_name, false, true));
                const RegistryResult view_result =
                    SourceViewRegistry::Instance().UpsertView(
                        target_id, ViewBulkPayload(view_raw, source_raw, target_id, target_id, display_name, false));
                item_ok = source_result.status >= 200 && source_result.status < 300 &&
                          view_result.status >= 200 && view_result.status < 300;
                message = item_ok ? "rollback-disabled-created" : "rollback disable-created failed";
            } else {
                const RegistryResult source_result =
                    SourceViewRegistry::Instance().UpsertSource(source_id, source_raw);
                const RegistryResult view_result =
                    SourceViewRegistry::Instance().UpsertView(result_view_id, view_raw);
                item_ok = source_result.status >= 200 && source_result.status < 300 &&
                          view_result.status >= 200 && view_result.status < 300;
                message = item_ok ? "rollback-restored" : "rollback restore failed";
            }
            retryable = !item_ok;
        } else if (item_ok && !dry_run && operation == "disable") {
            const RegistryResult source_result =
                SourceViewRegistry::Instance().UpsertSource(
                    source_id, SourceBulkPayload(source_raw, source_id, display_name, false, true));
            const RegistryResult view_result =
                SourceViewRegistry::Instance().UpsertView(
                    result_view_id, ViewBulkPayload(view_raw, source_raw, result_view_id, source_id, display_name, false));
            item_ok = source_result.status >= 200 && source_result.status < 300 &&
                      view_result.status >= 200 && view_result.status < 300;
            message = item_ok ? "disabled" : "disable failed";
            retryable = !item_ok;
        } else if (item_ok && !dry_run && operation == "clone") {
            const RegistryResult source_result =
                SourceViewRegistry::Instance().UpsertSource(
                    target_id, SourceBulkPayload(source_raw, target_id, display_name, false, true));
            const RegistryResult view_result =
                SourceViewRegistry::Instance().UpsertView(
                    target_id, ViewBulkPayload(view_raw, source_raw, target_id, target_id, display_name, false));
            item_ok = source_result.status >= 200 && source_result.status < 300 &&
                      view_result.status >= 200 && view_result.status < 300;
            message = item_ok ? "cloned-disabled" : "clone failed";
            retryable = !item_ok;
        } else if (item_ok && dry_run && operation == "rollback") {
            message = rollback_mode == "disable-created" ? "rollback disable-created dry-run" : "rollback restore dry-run";
        }
        if (item_ok) {
            ++ok_count;
        } else {
            ++fail_count;
        }
        if (index != 0) {
            results << ",";
        }
        results << "{"
                << "\"sourceId\":\"" << JsonEscape(source_id) << "\","
                << "\"resultSourceId\":\"" << JsonEscape(result_source_id) << "\","
                << "\"resultViewId\":\"" << JsonEscape(result_view_id) << "\","
                << "\"ok\":" << (item_ok ? "true" : "false") << ","
                << "\"retryable\":" << (retryable ? "true" : "false") << ","
                << "\"rollbackMode\":\"" << JsonEscape(rollback_mode) << "\","
                << "\"rollbackSourceId\":\"" << JsonEscape(result_source_id) << "\","
                << "\"message\":\"" << JsonEscape(message) << "\""
                << "}";
    }
    results << "]";
    std::ostringstream out;
    out << "{"
        << "\"status\":\"ops-channel-bulk\","
        << "\"operation\":\"" << JsonEscape(operation) << "\","
        << "\"dryRun\":" << (dry_run ? "true" : "false") << ","
        << "\"okCount\":" << ok_count << ","
        << "\"failCount\":" << fail_count << ","
        << "\"partialFailure\":" << (fail_count > 0 && ok_count > 0 ? "true" : "false") << ","
        << "\"rollbackPolicy\":\"use operation=rollback with successful result ids; clone rollback disables created channels and disable rollback restores before snapshots\","
        << "\"retryPolicy\":\"retry only failed sourceId items after fixing validation errors; retryable flags identify safe retry targets\","
        << "\"results\":" << results.str()
        << "}";
    return out.str();
}

std::string WebRtcSyncStatusForMatch(std::int64_t video_frame_pts_ns, std::int64_t analysis_pts_ns) {
    return video_frame_pts_ns == analysis_pts_ns ? "exact" : "near";
}

analysis::VaRuntimeSyncInfo BuildWebRtcVaMetadataSyncInfo(std::int64_t video_frame_pts_ns,
                                                          std::int64_t analysis_pts_ns,
                                                          std::int64_t sync_tolerance_ns,
                                                          std::string sync_status,
                                                          int frame_width,
                                                          int frame_height) {
    analysis::VaRuntimeSyncInfo sync;
    sync.available = true;
    sync.video_frame_pts_ms = PtsNsToMs(video_frame_pts_ns);
    sync.analysis_pts_ms = PtsNsToMs(analysis_pts_ns);
    sync.sync_delta_ms = PtsNsToMs(analysis_pts_ns - video_frame_pts_ns);
    sync.sync_status = std::move(sync_status);
    sync.sync_tolerance_ms = PtsNsToMs(sync_tolerance_ns);
    sync.metadata_sequence = g_web_rtc_metadata_sequence.fetch_add(1, std::memory_order_relaxed) + 1;
    sync.sent_at_ms = NowUnixMs();
    sync.frame_width = frame_width;
    sync.frame_height = frame_height;
    sync.coordinate_space = "normalized-frame";
    return sync;
}

std::string WebRtcVaMetadataMessageJson(const analysis::AnalysisResult& result,
                                        const std::vector<analysis::AnalysisEvent>& events,
                                        const analysis::VaRuntimeSyncInfo& sync_info,
                                        const analysis::VaMetadataSubscriptionFilter& subscription_filter) {
    const auto filtered_result = analysis::FilterVaMetadataResult(result, subscription_filter);
    const auto filtered_events = analysis::FilterVaMetadataEvents(events, subscription_filter);
    analysis::VaRuntimeMetadataBuildOptions options;
    options.schema = analysis::kWebRtcVaMetadataSchema;
    options.include_source = false;
    options.include_scenarios = false;
    options.include_metrics = false;
    options.include_tracking_issue_report = false;
    options.include_missed_tracks = false;
    options.sync = sync_info;
    return analysis::SerializeVaRuntimeMetadataFrameForWebRtcJson(
        analysis::BuildVaRuntimeMetadataFrame(filtered_result, filtered_events, options));
}

std::string WebRtcVaMetadataMissingMessageJson(const std::string& stream_id,
                                               std::int64_t video_frame_pts_ns,
                                               std::int64_t sync_tolerance_ns) {
    analysis::VaRuntimeMetadataFrame frame;
    frame.schema = analysis::kWebRtcVaMetadataSchema;
    frame.stream_id = stream_id;
    frame.channel_id = stream_id;
    frame.pts = video_frame_pts_ns;
    frame.timestamp_ms = PtsNsToMs(video_frame_pts_ns);
    frame.sync = BuildWebRtcVaMetadataSyncInfo(
        video_frame_pts_ns, video_frame_pts_ns, sync_tolerance_ns, "missing", 0, 0);
    frame.sync.analysis_pts_ms = 0;
    frame.sync.sync_delta_ms = 0;
    return analysis::SerializeVaRuntimeMetadataFrameForWebRtcJson(frame);
}

std::string AnalysisEventPostStatusJson() {
    const auto snapshot = analysis::GetEventPostDispatcherSnapshot();
    std::ostringstream out;
    out << "{"
        << "\"enabled\":" << (snapshot.enabled ? "true" : "false") << ","
        << "\"queueSize\":" << snapshot.queue_size << ","
        << "\"maxQueueSize\":" << snapshot.max_queue_size << ","
        << "\"enqueuedCount\":" << snapshot.enqueued_count << ","
        << "\"sentCount\":" << snapshot.sent_count << ","
        << "\"failedCount\":" << snapshot.failed_count << ","
        << "\"droppedCount\":" << snapshot.dropped_count << ","
        << "\"suppressedCount\":" << snapshot.suppressed_count << ","
        << "\"lastError\":\"" << JsonEscape(snapshot.last_error) << "\""
        << "}";
    return out.str();
}

std::string AnalysisEventStorageStatusJson() {
    const auto snapshot = analysis::GetEventStorageSnapshot();
    std::ostringstream out;
    out << "{"
        << "\"enabled\":" << (snapshot.enabled ? "true" : "false") << ","
        << "\"path\":\"" << JsonEscape(snapshot.path) << "\","
        << "\"activePath\":\"" << JsonEscape(snapshot.active_path.empty() ? snapshot.path
                                                                          : snapshot.active_path)
        << "\","
        << "\"activeFileSizeBytes\":" << snapshot.active_file_size_bytes << ","
        << "\"archivedFileCount\":" << snapshot.archived_file_count << ","
        << "\"totalArchiveBytes\":" << snapshot.total_archive_bytes << ","
        << "\"queueSize\":" << snapshot.queue_size << ","
        << "\"maxQueueSize\":" << snapshot.max_queue_size << ","
        << "\"enqueuedCount\":" << snapshot.enqueued_count << ","
        << "\"storedCount\":" << snapshot.stored_count << ","
        << "\"failedCount\":" << snapshot.failed_count << ","
        << "\"writeFailedCount\":" << snapshot.write_failed_count << ","
        << "\"droppedCount\":" << snapshot.dropped_count << ","
        << "\"skippedCorruptLines\":" << snapshot.skipped_corrupt_lines << ","
        << "\"partialLineCount\":" << snapshot.partial_line_count << ","
        << "\"lastRecoveryTime\":" << snapshot.last_recovery_time_ms << ","
        << "\"lastRecoveryStatus\":\"" << JsonEscape(snapshot.last_recovery_status) << "\","
        << "\"rotatedCount\":" << snapshot.rotated_count << ","
        << "\"rotationFailedCount\":" << snapshot.rotation_failed_count << ","
        << "\"retentionDeletedCount\":" << snapshot.retention_deleted_count << ","
        << "\"retentionDeletedBytes\":" << snapshot.retention_deleted_bytes << ","
        << "\"retentionFailedCount\":" << snapshot.retention_failed_count << ","
        << "\"snapshotHook\":{"
        << "\"enabled\":" << (snapshot.snapshot_hook_enabled ? "true" : "false") << ","
        << "\"directory\":\"" << JsonEscape(snapshot.snapshot_dir) << "\","
        << "\"failedCount\":" << snapshot.snapshot_hook_failed_count << ","
        << "\"lastError\":\"" << JsonEscape(snapshot.last_snapshot_error) << "\""
        << "},"
        << "\"clipHook\":{"
        << "\"enabled\":" << (snapshot.clip_hook_enabled ? "true" : "false") << ","
        << "\"directory\":\"" << JsonEscape(snapshot.clip_dir) << "\","
        << "\"preEventMs\":" << snapshot.pre_event_ms << ","
        << "\"postEventMs\":" << snapshot.post_event_ms << ","
        << "\"clipBufferMs\":" << snapshot.clip_buffer_ms << ","
        << "\"failedCount\":" << snapshot.clip_hook_failed_count << ","
        << "\"lastError\":\"" << JsonEscape(snapshot.last_clip_error) << "\""
        << "},"
        << "\"evidencePolicy\":{"
        << "\"scope\":\"event-short-evidence\","
        << "\"longRecording\":false,"
        << "\"videoArchive\":false,"
        << "\"snapshotEnabled\":" << (snapshot.snapshot_hook_enabled ? "true" : "false") << ","
        << "\"clipBundleEnabled\":" << (snapshot.clip_hook_enabled ? "true" : "false") << ","
        << "\"clipFormat\":\"frame-bundle\","
        << "\"snapshotFormats\":[\"jpg\",\"ppm\",\"pgm\"],"
        << "\"compactionDestructive\":false,"
        << "\"exportPolicy\":{"
        << "\"snapshotDownload\":true,"
        << "\"clipManifestDownload\":true,"
        << "\"clipFrameDownload\":true,"
        << "\"bundleArchiveDownload\":true,"
        << "\"bundleFormat\":\"zip\","
        << "\"exportAudit\":true,"
        << "\"longVideoExport\":false,"
        << "\"allowedFormats\":[\"jpg\",\"jpeg\",\"ppm\",\"pgm\",\"json\",\"zip\"]"
        << "},"
        << "\"retentionPolicy\":{"
        << "\"activeFileProtected\":true,"
        << "\"archiveRetention\":\"oldest-rotated-only\","
        << "\"compactionCleanup\":\"keepNewest\","
        << "\"evidenceFileRetention\":\"event-record-retention\""
        << "},"
        << "\"deletePolicy\":{"
        << "\"activeRecordDelete\":false,"
        << "\"archiveDelete\":false,"
        << "\"compactionDelete\":true,"
        << "\"evidenceFileDelete\":false,"
        << "\"requiresRuleWrite\":true"
        << "}"
        << "},"
        << "\"lastError\":\"" << JsonEscape(snapshot.last_error) << "\""
        << "}";
    return out.str();
}

bool ParseStrictInt64(const std::string& raw, std::int64_t* value) {
    if (value == nullptr || raw.empty()) {
        return false;
    }
    std::size_t consumed = 0;
    try {
        const std::int64_t parsed = std::stoll(raw, &consumed, 10);
        if (consumed != raw.size()) {
            return false;
        }
        *value = parsed;
        return true;
    } catch (...) {
        return false;
    }
}

bool ParseStrictUint64(const std::string& raw, std::uint64_t* value) {
    if (value == nullptr || raw.empty() || raw.front() == '-') {
        return false;
    }
    std::size_t consumed = 0;
    try {
        const unsigned long long parsed = std::stoull(raw, &consumed, 10);
        if (consumed != raw.size()) {
            return false;
        }
        *value = static_cast<std::uint64_t>(parsed);
        return true;
    } catch (...) {
        return false;
    }
}

bool ApplyStringEventRecordFilter(const std::unordered_map<std::string, std::string>& query,
                                  const std::string& key,
                                  std::string* out) {
    const auto it = query.find(key);
    if (it == query.end() || out == nullptr) {
        return false;
    }
    *out = Trim(it->second);
    return true;
}

bool BuildEventRecordQueryOptions(const std::unordered_map<std::string, std::string>& query,
                                  analysis::EventRecordQueryOptions* options,
                                  std::string* error_message) {
    if (options == nullptr) {
        if (error_message != nullptr) {
            *error_message = "query options are required";
        }
        return false;
    }
    *options = analysis::EventRecordQueryOptions{};
    ApplyStringEventRecordFilter(query, "eventId", &options->event_id);
    ApplyStringEventRecordFilter(query, "eventType", &options->event_type);
    ApplyStringEventRecordFilter(query, "streamId", &options->stream_id);
    ApplyStringEventRecordFilter(query, "channelId", &options->channel_id);
    ApplyStringEventRecordFilter(query, "status", &options->status);
    ApplyStringEventRecordFilter(query, "zoneId", &options->zone_id);
    ApplyStringEventRecordFilter(query, "lineId", &options->line_id);
    ApplyStringEventRecordFilter(query, "scenarioName", &options->scenario_name);
    ApplyStringEventRecordFilter(query, "scenarioPhase", &options->scenario_phase);

    if (const auto it = query.find("evidence"); it != query.end() && !Trim(it->second).empty()) {
        const std::string evidence = LowerAscii(Trim(it->second));
        if (evidence != "snapshot" && evidence != "clip" && evidence != "any" &&
            evidence != "both" && evidence != "missing") {
            if (error_message != nullptr) {
                *error_message = "evidence must be snapshot, clip, any, both, or missing";
            }
            return false;
        }
        options->evidence = evidence;
    }

    if (const auto it = query.find("trackId"); it != query.end() && !Trim(it->second).empty()) {
        std::uint64_t parsed = 0;
        if (!ParseStrictUint64(Trim(it->second), &parsed)) {
            if (error_message != nullptr) {
                *error_message = "trackId must be a non-negative integer";
            }
            return false;
        }
        options->has_track_id = true;
        options->track_id = parsed;
    }

    if (const auto it = query.find("startTimeMs"); it != query.end() && !Trim(it->second).empty()) {
        std::int64_t parsed = 0;
        if (!ParseStrictInt64(Trim(it->second), &parsed) || parsed < 0) {
            if (error_message != nullptr) {
                *error_message = "startTimeMs must be a non-negative integer";
            }
            return false;
        }
        options->has_start_time_ms = true;
        options->start_time_ms = parsed;
    }

    if (const auto it = query.find("endTimeMs"); it != query.end() && !Trim(it->second).empty()) {
        std::int64_t parsed = 0;
        if (!ParseStrictInt64(Trim(it->second), &parsed) || parsed < 0) {
            if (error_message != nullptr) {
                *error_message = "endTimeMs must be a non-negative integer";
            }
            return false;
        }
        options->has_end_time_ms = true;
        options->end_time_ms = parsed;
    }

    if (options->has_start_time_ms && options->has_end_time_ms &&
        options->start_time_ms > options->end_time_ms) {
        if (error_message != nullptr) {
            *error_message = "startTimeMs must be less than or equal to endTimeMs";
        }
        return false;
    }

    if (const auto it = query.find("offset"); it != query.end() && !Trim(it->second).empty()) {
        std::uint64_t parsed = 0;
        if (!ParseStrictUint64(Trim(it->second), &parsed)) {
            if (error_message != nullptr) {
                *error_message = "offset must be a non-negative integer";
            }
            return false;
        }
        options->offset = static_cast<std::size_t>(parsed);
    }

    const auto include_archives_value = query.find("includeArchives");
    const auto archive_value = query.find("archive");
    const std::string include_archives_raw =
        include_archives_value != query.end()
            ? include_archives_value->second
            : (archive_value != query.end() ? archive_value->second : "");
    const std::string include_archives = LowerAscii(Trim(include_archives_raw));
    options->include_archives = include_archives == "1" || include_archives == "true" ||
                                include_archives == "yes" || include_archives == "all";

    constexpr std::size_t kDefaultLimit = 100;
    constexpr std::size_t kMaxLimit = 500;
    options->limit = kDefaultLimit;
    if (const auto it = query.find("limit"); it != query.end() && !Trim(it->second).empty()) {
        std::uint64_t parsed = 0;
        if (!ParseStrictUint64(Trim(it->second), &parsed) || parsed == 0) {
            if (error_message != nullptr) {
                *error_message = "limit must be a positive integer";
            }
            return false;
        }
        options->limit = static_cast<std::size_t>(std::min<std::uint64_t>(parsed, kMaxLimit));
    }

    if (error_message != nullptr) {
        error_message->clear();
    }
    return true;
}

std::string AnalysisEventRecordsJson(const analysis::EventRecordQueryResult& result) {
    const auto& snapshot = result.storage;
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.va.event-record-list.v1\","
        << "\"records\":[";
    for (std::size_t i = 0; i < result.records_json.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << result.records_json[i];
    }
    out << "],"
        << "\"offset\":" << result.offset << ","
        << "\"limit\":" << result.limit << ","
        << "\"nextOffset\":" << result.next_offset << ","
        << "\"matchedRecords\":" << result.matched_records << ","
        << "\"hasMore\":" << (result.has_more ? "true" : "false") << ","
        << "\"truncated\":" << (result.truncated ? "true" : "false") << ","
        << "\"skippedCorruptLines\":" << result.skipped_corrupt_lines << ","
        << "\"partialLineCount\":" << result.partial_line_count << ","
        << "\"archiveFilesScanned\":" << result.archive_files_scanned << ","
        << "\"archiveRecordsScanned\":" << result.archive_records_scanned << ","
        << "\"storage\":{"
        << "\"enabled\":" << (snapshot.enabled ? "true" : "false") << ","
        << "\"path\":\"" << JsonEscape(snapshot.path) << "\","
        << "\"activePath\":\"" << JsonEscape(snapshot.active_path.empty() ? snapshot.path
                                                                          : snapshot.active_path)
        << "\","
        << "\"exists\":" << (result.file_exists ? "true" : "false") << ","
        << "\"activeFileSizeBytes\":" << snapshot.active_file_size_bytes << ","
        << "\"archivedFileCount\":" << snapshot.archived_file_count << ","
        << "\"totalArchiveBytes\":" << snapshot.total_archive_bytes << ","
        << "\"rotatedCount\":" << snapshot.rotated_count << ","
        << "\"retentionDeletedCount\":" << snapshot.retention_deleted_count << ","
        << "\"retentionDeletedBytes\":" << snapshot.retention_deleted_bytes << ","
        << "\"retentionFailedCount\":" << snapshot.retention_failed_count << ","
        << "\"skippedCorruptLines\":" << snapshot.skipped_corrupt_lines << ","
        << "\"partialLineCount\":" << snapshot.partial_line_count << ","
        << "\"lastRecoveryTime\":" << snapshot.last_recovery_time_ms << ","
        << "\"lastRecoveryStatus\":\"" << JsonEscape(snapshot.last_recovery_status) << "\","
        << "\"queueSize\":" << snapshot.queue_size << ","
        << "\"maxQueueSize\":" << snapshot.max_queue_size << ","
        << "\"enqueuedCount\":" << snapshot.enqueued_count << ","
        << "\"storedCount\":" << snapshot.stored_count << ","
        << "\"failedCount\":" << snapshot.failed_count << ","
        << "\"writeFailedCount\":" << snapshot.write_failed_count << ","
        << "\"droppedCount\":" << snapshot.dropped_count
        << "}"
        << "}";
    return out.str();
}

std::string AnalysisEventRecordCompactionJson(
    const analysis::EventRecordCompactionResult& result) {
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.va.event-record-compaction.v1\","
        << "\"compactedPath\":\"" << JsonEscape(result.compacted_path) << "\","
        << "\"activeFileExists\":" << (result.active_file_exists ? "true" : "false") << ","
        << "\"activeRecordsScanned\":" << result.active_records_scanned << ","
        << "\"archiveFilesScanned\":" << result.archive_files_scanned << ","
        << "\"archiveRecordsScanned\":" << result.archive_records_scanned << ","
        << "\"retainedRecords\":" << result.retained_records << ","
        << "\"skippedCorruptLines\":" << result.skipped_corrupt_lines << ","
        << "\"partialLineCount\":" << result.partial_line_count << ","
        << "\"storage\":{"
        << "\"enabled\":" << (result.storage.enabled ? "true" : "false") << ","
        << "\"path\":\"" << JsonEscape(result.storage.path) << "\","
        << "\"activePath\":\"" << JsonEscape(result.storage.active_path.empty()
                                                  ? result.storage.path
                                                  : result.storage.active_path)
        << "\","
        << "\"archivedFileCount\":" << result.storage.archived_file_count << ","
        << "\"totalArchiveBytes\":" << result.storage.total_archive_bytes
        << "}"
        << "}";
    return out.str();
}

std::string AnalysisEventRecordCompactedFilesJson(
    const analysis::EventRecordCompactedFileListResult& result) {
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.va.event-record-compacted-list.v1\","
        << "\"files\":[";
    for (std::size_t i = 0; i < result.files.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        const auto& file = result.files[i];
        out << "{"
            << "\"fileName\":\"" << JsonEscape(file.file_name) << "\","
            << "\"path\":\"" << JsonEscape(file.path) << "\","
            << "\"sizeBytes\":" << file.size_bytes << ","
            << "\"modifiedTimeMs\":" << file.modified_time_ms
            << "}";
    }
    out << "],"
        << "\"storage\":{"
        << "\"enabled\":" << (result.storage.enabled ? "true" : "false") << ","
        << "\"path\":\"" << JsonEscape(result.storage.path) << "\","
        << "\"activePath\":\"" << JsonEscape(result.storage.active_path.empty()
                                                  ? result.storage.path
                                                  : result.storage.active_path)
        << "\"}"
        << "}";
    return out.str();
}

std::string AnalysisEventRecordCompactedFileDeletedJson(
    const analysis::EventRecordCompactedFileInfo& file) {
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.va.event-record-compacted-delete.v1\","
        << "\"deleted\":true,"
        << "\"fileName\":\"" << JsonEscape(file.file_name) << "\","
        << "\"path\":\"" << JsonEscape(file.path) << "\","
        << "\"sizeBytes\":" << file.size_bytes << ","
        << "\"modifiedTimeMs\":" << file.modified_time_ms
        << "}";
    return out.str();
}

std::string AnalysisEventRecordCompactedFileCleanupJson(
    const analysis::EventRecordCompactedFileCleanupResult& result) {
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.va.event-record-compacted-cleanup.v1\","
        << "\"deletedCount\":" << result.deleted_count << ","
        << "\"deletedBytes\":" << result.deleted_bytes << ","
        << "\"keptCount\":" << result.kept_count << ","
        << "\"storage\":{"
        << "\"enabled\":" << (result.storage.enabled ? "true" : "false") << ","
        << "\"path\":\"" << JsonEscape(result.storage.path) << "\","
        << "\"activePath\":\"" << JsonEscape(result.storage.active_path.empty()
                                                  ? result.storage.path
                                                  : result.storage.active_path)
        << "\"}"
        << "}";
    return out.str();
}

// Lab 리포트 뷰어가 노출할 수 있는 검증 산출물 확장자만 허용한다.
bool IsLabReportExtension(const std::filesystem::path& path) {
    std::string ext = path.extension().string();
    std::transform(ext.begin(), ext.end(), ext.begin(), [](unsigned char ch) {
        return static_cast<char>(std::tolower(ch));
    });
    return ext == ".json" || ext == ".ndjson" || ext == ".md" || ext == ".html" || ext == ".log";
}

// /tmp 아래 media_server_* 텍스트 산출물만 읽도록 제한해 임의 파일 노출을 막는다.
bool IsSafeLabReportPath(const std::filesystem::path& raw_path, std::filesystem::path* resolved_path) {
    std::error_code ec;
    const auto canonical = std::filesystem::weakly_canonical(raw_path, ec);
    if (ec || canonical.empty()) {
        return false;
    }
    const std::string full_path = canonical.string();
    if (full_path.rfind("/tmp/", 0) != 0 && full_path.rfind("/private/tmp/", 0) != 0) {
        return false;
    }
    if (canonical.filename().string().rfind("media_server_", 0) != 0) {
        return false;
    }
    if (!IsLabReportExtension(canonical) || !std::filesystem::is_regular_file(canonical, ec) || ec) {
        return false;
    }
    if (resolved_path != nullptr) {
        *resolved_path = canonical;
    }
    return true;
}

bool PathStartsWith(const std::filesystem::path& path, const std::filesystem::path& base) {
    const std::string path_string = path.string();
    const std::string base_string = base.string();
    if (base_string.empty()) {
        return false;
    }
    if (path_string == base_string) {
        return true;
    }
    return path_string.size() > base_string.size() &&
           path_string.rfind(base_string + "/", 0) == 0;
}

std::string EventEvidenceContentType(const std::filesystem::path& path) {
    const std::string ext = LowerAscii(path.extension().string());
    if (ext == ".jpg" || ext == ".jpeg") {
        return "image/jpeg";
    }
    if (ext == ".ppm") {
        return "image/x-portable-pixmap";
    }
    if (ext == ".pgm") {
        return "image/x-portable-graymap";
    }
    if (ext == ".json") {
        return "application/json; charset=utf-8";
    }
    return "";
}

bool IsSafeEventEvidencePath(const std::filesystem::path& raw_path,
                             std::filesystem::path* resolved_path,
                             std::string* content_type) {
    std::error_code ec;
    const auto resolved = std::filesystem::weakly_canonical(raw_path, ec);
    if (ec || resolved.empty() || !std::filesystem::is_regular_file(resolved, ec) || ec) {
        return false;
    }
    const std::string detected_content_type = EventEvidenceContentType(resolved);
    if (detected_content_type.empty()) {
        return false;
    }
    const auto snapshot_dir =
        std::filesystem::weakly_canonical(std::filesystem::path(app::GetAppConfig().analysis_event_snapshot_dir), ec);
    ec.clear();
    const auto clip_dir =
        std::filesystem::weakly_canonical(std::filesystem::path(app::GetAppConfig().analysis_event_clip_dir), ec);
    ec.clear();
    if ((snapshot_dir.empty() || !PathStartsWith(resolved, snapshot_dir)) &&
        (clip_dir.empty() || !PathStartsWith(resolved, clip_dir))) {
        return false;
    }
    if (resolved_path != nullptr) {
        *resolved_path = resolved;
    }
    if (content_type != nullptr) {
        *content_type = detected_content_type;
    }
    return true;
}

void AppendZipLe16(std::string* out, std::uint16_t value) {
    out->push_back(static_cast<char>(value & 0xff));
    out->push_back(static_cast<char>((value >> 8) & 0xff));
}

void AppendZipLe32(std::string* out, std::uint32_t value) {
    out->push_back(static_cast<char>(value & 0xff));
    out->push_back(static_cast<char>((value >> 8) & 0xff));
    out->push_back(static_cast<char>((value >> 16) & 0xff));
    out->push_back(static_cast<char>((value >> 24) & 0xff));
}

std::uint32_t ZipCrc32(const std::string& data) {
    std::uint32_t crc = 0xffffffffu;
    for (const unsigned char byte : data) {
        crc ^= byte;
        for (int bit = 0; bit < 8; ++bit) {
            crc = (crc >> 1) ^ (0xedb88320u & (0u - (crc & 1u)));
        }
    }
    return crc ^ 0xffffffffu;
}

struct ZipCentralDirectoryEntry {
    std::string name;
    std::uint32_t crc{0};
    std::uint32_t size{0};
    std::uint32_t local_offset{0};
};

bool AppendZipEntry(std::string* zip,
                    std::vector<ZipCentralDirectoryEntry>* entries,
                    const std::string& name,
                    const std::string& data,
                    std::string* error_message) {
    if (zip == nullptr || entries == nullptr || name.empty() || name.find("..") != std::string::npos ||
        name.front() == '/') {
        if (error_message != nullptr) {
            *error_message = "invalid zip entry name";
        }
        return false;
    }
    if (data.size() > std::numeric_limits<std::uint32_t>::max() ||
        zip->size() > std::numeric_limits<std::uint32_t>::max() ||
        name.size() > std::numeric_limits<std::uint16_t>::max()) {
        if (error_message != nullptr) {
            *error_message = "zip entry is too large";
        }
        return false;
    }
    const std::uint32_t local_offset = static_cast<std::uint32_t>(zip->size());
    const std::uint32_t size = static_cast<std::uint32_t>(data.size());
    const std::uint32_t crc = ZipCrc32(data);
    AppendZipLe32(zip, 0x04034b50u);
    AppendZipLe16(zip, 20);
    AppendZipLe16(zip, 0);
    AppendZipLe16(zip, 0);
    AppendZipLe16(zip, 0);
    AppendZipLe16(zip, 0);
    AppendZipLe32(zip, crc);
    AppendZipLe32(zip, size);
    AppendZipLe32(zip, size);
    AppendZipLe16(zip, static_cast<std::uint16_t>(name.size()));
    AppendZipLe16(zip, 0);
    zip->append(name);
    zip->append(data);
    entries->push_back(ZipCentralDirectoryEntry{name, crc, size, local_offset});
    return true;
}

bool ReadBinaryFile(const std::filesystem::path& path,
                    std::string* body,
                    std::string* error_message) {
    if (body == nullptr) {
        return false;
    }
    std::error_code ec;
    const auto size = std::filesystem::file_size(path, ec);
    constexpr std::uintmax_t kMaxEvidenceBundleFileBytes = 64ull * 1024ull * 1024ull;
    if (ec || size > kMaxEvidenceBundleFileBytes) {
        if (error_message != nullptr) {
            *error_message = ec ? "failed to stat evidence file" : "evidence file is too large";
        }
        return false;
    }
    std::ifstream input(path, std::ios::in | std::ios::binary);
    if (!input.good()) {
        if (error_message != nullptr) {
            *error_message = "failed to open evidence file";
        }
        return false;
    }
    std::ostringstream buffer;
    buffer << input.rdbuf();
    *body = buffer.str();
    return true;
}

bool AppendEvidenceFileToZip(std::string* zip,
                             std::vector<ZipCentralDirectoryEntry>* entries,
                             const std::filesystem::path& resolved,
                             const std::string& entry_name,
                             std::string* error_message) {
    std::string body;
    if (!ReadBinaryFile(resolved, &body, error_message)) {
        return false;
    }
    return AppendZipEntry(zip, entries, entry_name, body, error_message);
}

bool FinalizeZip(std::string* zip,
                 const std::vector<ZipCentralDirectoryEntry>& entries,
                 std::string* error_message) {
    if (zip == nullptr || entries.size() > std::numeric_limits<std::uint16_t>::max()) {
        if (error_message != nullptr) {
            *error_message = "too many zip entries";
        }
        return false;
    }
    if (zip->size() > std::numeric_limits<std::uint32_t>::max()) {
        if (error_message != nullptr) {
            *error_message = "zip archive is too large";
        }
        return false;
    }
    const std::uint32_t central_offset = static_cast<std::uint32_t>(zip->size());
    for (const auto& entry : entries) {
        if (entry.name.size() > std::numeric_limits<std::uint16_t>::max()) {
            if (error_message != nullptr) {
                *error_message = "zip entry name is too long";
            }
            return false;
        }
        AppendZipLe32(zip, 0x02014b50u);
        AppendZipLe16(zip, 20);
        AppendZipLe16(zip, 20);
        AppendZipLe16(zip, 0);
        AppendZipLe16(zip, 0);
        AppendZipLe16(zip, 0);
        AppendZipLe16(zip, 0);
        AppendZipLe32(zip, entry.crc);
        AppendZipLe32(zip, entry.size);
        AppendZipLe32(zip, entry.size);
        AppendZipLe16(zip, static_cast<std::uint16_t>(entry.name.size()));
        AppendZipLe16(zip, 0);
        AppendZipLe16(zip, 0);
        AppendZipLe16(zip, 0);
        AppendZipLe16(zip, 0);
        AppendZipLe32(zip, 0);
        AppendZipLe32(zip, entry.local_offset);
        zip->append(entry.name);
    }
    if (zip->size() > std::numeric_limits<std::uint32_t>::max()) {
        if (error_message != nullptr) {
            *error_message = "zip archive is too large";
        }
        return false;
    }
    const std::uint32_t central_size = static_cast<std::uint32_t>(zip->size() - central_offset);
    AppendZipLe32(zip, 0x06054b50u);
    AppendZipLe16(zip, 0);
    AppendZipLe16(zip, 0);
    AppendZipLe16(zip, static_cast<std::uint16_t>(entries.size()));
    AppendZipLe16(zip, static_cast<std::uint16_t>(entries.size()));
    AppendZipLe32(zip, central_size);
    AppendZipLe32(zip, central_offset);
    AppendZipLe16(zip, 0);
    return true;
}

bool AddOptionalEvidencePath(const std::unordered_map<std::string, std::string>& query,
                             const std::string& key,
                             std::filesystem::path* resolved,
                             std::string* error_message) {
    const auto it = query.find(key);
    if (it == query.end() || Trim(it->second).empty()) {
        return true;
    }
    std::string content_type;
    if (!IsSafeEventEvidencePath(std::filesystem::path(it->second), resolved, &content_type)) {
        if (error_message != nullptr) {
            *error_message = "invalid event evidence path: " + key;
        }
        return false;
    }
    return true;
}

std::string EvidenceBundleEntryName(const std::filesystem::path& path, const std::string& prefix) {
    std::string file_name = path.filename().string();
    if (file_name.empty()) {
        file_name = "evidence.bin";
    }
    return prefix + "/" + file_name;
}

bool BuildEventEvidenceBundleZip(const std::unordered_map<std::string, std::string>& query,
                                 std::string* zip_body,
                                 std::string* download_name,
                                 std::string* error_message) {
    if (zip_body == nullptr || download_name == nullptr) {
        return false;
    }
    std::filesystem::path snapshot_path;
    std::filesystem::path clip_path;
    if (!AddOptionalEvidencePath(query, "snapshotPath", &snapshot_path, error_message) ||
        !AddOptionalEvidencePath(query, "clipPath", &clip_path, error_message)) {
        return false;
    }
    if (snapshot_path.empty() && clip_path.empty()) {
        if (!AddOptionalEvidencePath(query, "path", &snapshot_path, error_message)) {
            return false;
        }
    }
    if (snapshot_path.empty() && clip_path.empty()) {
        if (error_message != nullptr) {
            *error_message = "snapshotPath or clipPath is required";
        }
        return false;
    }

    std::string zip;
    std::vector<ZipCentralDirectoryEntry> entries;
    const std::string event_id = Trim(query.find("eventId") == query.end() ? "" : query.at("eventId"));
    if (!event_id.empty()) {
        analysis::EventRecordQueryOptions options;
        options.event_id = event_id;
        options.limit = 1;
        options.include_archives = true;
        analysis::EventRecordQueryResult result;
        std::string query_error;
        if (analysis::QueryEventRecords(options, &result, &query_error) && !result.records_json.empty()) {
            if (!AppendZipEntry(&zip, &entries, "event-record.json", result.records_json.front(), error_message)) {
                return false;
            }
        }
    }

    if (!snapshot_path.empty() &&
        !AppendEvidenceFileToZip(&zip,
                                 &entries,
                                 snapshot_path,
                                 EvidenceBundleEntryName(snapshot_path, "evidence/snapshot"),
                                 error_message)) {
        return false;
    }

    if (!clip_path.empty()) {
        const std::string clip_root = "evidence/clip/" + clip_path.parent_path().filename().string();
        if (!AppendEvidenceFileToZip(&zip,
                                     &entries,
                                     clip_path,
                                     clip_root + "/" + clip_path.filename().string(),
                                     error_message)) {
            return false;
        }
        if (std::filesystem::is_regular_file(clip_path)) {
            std::error_code ec;
            std::vector<std::filesystem::path> clip_files;
            for (const auto& entry : std::filesystem::directory_iterator(clip_path.parent_path(), ec)) {
                if (ec || !entry.is_regular_file()) {
                    continue;
                }
                const auto candidate = entry.path();
                if (candidate == clip_path) {
                    continue;
                }
                std::filesystem::path resolved;
                std::string content_type;
                if (IsSafeEventEvidencePath(candidate, &resolved, &content_type)) {
                    clip_files.push_back(resolved);
                }
            }
            std::sort(clip_files.begin(), clip_files.end());
            constexpr std::size_t kMaxClipFilesInBundle = 200;
            if (clip_files.size() > kMaxClipFilesInBundle) {
                clip_files.resize(kMaxClipFilesInBundle);
            }
            for (const auto& file : clip_files) {
                if (!AppendEvidenceFileToZip(&zip,
                                             &entries,
                                             file,
                                             clip_root + "/" + file.filename().string(),
                                             error_message)) {
                    return false;
                }
            }
        }
    }

    std::ostringstream manifest;
    manifest << "{"
             << "\"schema\":\"media-server.va.event-evidence-bundle.v1\","
             << "\"createdAtMs\":" << NowUnixMs() << ","
             << "\"eventId\":\"" << JsonEscape(event_id) << "\","
             << "\"scope\":\"event-short-evidence\","
             << "\"longRecording\":false,"
             << "\"bundleFormat\":\"zip\","
             << "\"deletePolicy\":{\"evidenceFileDelete\":false},"
             << "\"snapshotPath\":\"" << JsonEscape(snapshot_path.string()) << "\","
             << "\"clipPath\":\"" << JsonEscape(clip_path.string()) << "\","
             << "\"entries\":[";
    for (std::size_t index = 0; index < entries.size(); ++index) {
        if (index != 0) {
            manifest << ",";
        }
        manifest << "\"" << JsonEscape(entries[index].name) << "\"";
    }
    manifest << "]}";
    if (!AppendZipEntry(&zip, &entries, "manifest.json", manifest.str(), error_message) ||
        !FinalizeZip(&zip, entries, error_message)) {
        return false;
    }

    const std::string safe_id = event_id.empty() ? std::to_string(NowUnixMs()) : event_id;
    *download_name = "event-evidence-" + safe_id + ".zip";
    *zip_body = std::move(zip);
    return true;
}

// 파일명 규칙으로 검증 리포트 종류를 추정해 UI 필터 없이도 대략적인 맥락을 보여준다.
std::string LabReportKindFromName(const std::string& name) {
    if (name.find("predev") != std::string::npos) {
        return "predev";
    }
    if (name.find("multichannel") != std::string::npos) {
        return "multichannel";
    }
    if (name.find("evtpost-longrun") != std::string::npos) {
        return "event-post-longrun";
    }
    if (name.find("evtpost") != std::string::npos || name.find("event-post") != std::string::npos) {
        return "event-post";
    }
    if (name.find("uri-longrun") != std::string::npos) {
        return "uri-longrun";
    }
    if (name.find("webrtc-ice") != std::string::npos) {
        return "webrtc-ice";
    }
    if (name.find("tracker-stability") != std::string::npos) {
        return "tracker";
    }
    if (name.find("report") != std::string::npos) {
        return "report";
    }
    return "artifact";
}

// /tmp에 남은 최신 검증 산출물을 개발/검증 API에서 선택할 수 있는 JSON 목록으로 만든다.
std::string LabReportsJson() {
    std::vector<std::filesystem::path> reports;
    std::error_code ec;
    for (const auto& entry : std::filesystem::directory_iterator("/tmp", ec)) {
        if (ec) {
            break;
        }
        std::filesystem::path resolved;
        if (IsSafeLabReportPath(entry.path(), &resolved)) {
            reports.push_back(resolved);
        }
    }
    std::sort(reports.begin(), reports.end(), [](const auto& lhs, const auto& rhs) {
        std::error_code lhs_ec;
        std::error_code rhs_ec;
        return std::filesystem::last_write_time(lhs, lhs_ec) > std::filesystem::last_write_time(rhs, rhs_ec);
    });
    if (reports.size() > 80) {
        reports.resize(80);
    }

    std::ostringstream out;
    out << "{\"reports\":[";
    for (std::size_t i = 0; i < reports.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        std::error_code size_ec;
        const auto size = std::filesystem::file_size(reports[i], size_ec);
        const std::string name = reports[i].filename().string();
        out << "{"
            << "\"path\":\"" << JsonEscape(reports[i].string()) << "\","
            << "\"name\":\"" << JsonEscape(name) << "\","
            << "\"kind\":\"" << JsonEscape(LabReportKindFromName(name)) << "\","
            << "\"extension\":\"" << JsonEscape(reports[i].extension().string()) << "\","
            << "\"sizeBytes\":" << (size_ec ? 0 : size)
            << "}";
    }
    out << "]}";
    return out.str();
}

// 큰 로그가 Lab 화면을 잠그지 않도록 앞부분만 읽고 truncation 여부를 같이 내려준다.
bool BuildLabReportContentJson(const std::string& requested_path,
                               std::string* response_body,
                               std::string* error_message) {
    std::filesystem::path resolved;
    if (!IsSafeLabReportPath(std::filesystem::path(requested_path), &resolved)) {
        if (error_message != nullptr) {
            *error_message = "report path is not allowed";
        }
        return false;
    }

    constexpr std::size_t kMaxReportBytes = 1024 * 1024;
    std::error_code size_ec;
    const auto size = std::filesystem::file_size(resolved, size_ec);
    const std::size_t bytes_to_read =
        size_ec ? kMaxReportBytes : static_cast<std::size_t>(std::min<std::uintmax_t>(size, kMaxReportBytes));
    std::string content(bytes_to_read, '\0');
    std::ifstream input(resolved, std::ios::binary);
    if (!input.good()) {
        if (error_message != nullptr) {
            *error_message = "failed to open report file";
        }
        return false;
    }
    input.read(content.data(), static_cast<std::streamsize>(content.size()));
    content.resize(static_cast<std::size_t>(std::max<std::streamsize>(0, input.gcount())));

    std::ostringstream out;
    const auto truncated_bytes = (!size_ec && size > kMaxReportBytes) ? (size - kMaxReportBytes) : 0;
    out << "{"
        << "\"path\":\"" << JsonEscape(resolved.string()) << "\","
        << "\"name\":\"" << JsonEscape(resolved.filename().string()) << "\","
        << "\"kind\":\"" << JsonEscape(LabReportKindFromName(resolved.filename().string())) << "\","
        << "\"sizeBytes\":" << (size_ec ? content.size() : size) << ","
        << "\"maxBytes\":" << kMaxReportBytes << ","
        << "\"truncatedBytes\":" << truncated_bytes << ","
        << "\"truncated\":" << (!size_ec && size > kMaxReportBytes ? "true" : "false") << ","
        << "\"content\":\"" << JsonEscape(content) << "\""
        << "}";
    if (response_body != nullptr) {
        *response_body = out.str();
    }
    return true;
}

bool IsSupportedMediaFile(const std::filesystem::path& path) {
    std::string ext = path.extension().string();
    std::transform(ext.begin(), ext.end(), ext.begin(), [](unsigned char ch) {
        return static_cast<char>(std::tolower(ch));
    });
    return ext == ".mp4" || ext == ".mov" || ext == ".mkv" || ext == ".webm" || ext == ".m4v";
}

// 지정한 root 아래에서 predicate를 만족하는 파일만 상대 경로로 모아 UI/API에 노출한다.
std::vector<std::string> CollectRelativeFiles(const std::filesystem::path& root,
                                              bool (*predicate)(const std::filesystem::path&)) {
    std::vector<std::string> files;
    std::error_code ec;
    if (std::filesystem::exists(root, ec) && std::filesystem::is_directory(root, ec)) {
        for (std::filesystem::recursive_directory_iterator it(root, std::filesystem::directory_options::skip_permission_denied, ec);
             !ec && it != std::filesystem::recursive_directory_iterator();
             it.increment(ec)) {
            if (!it->is_regular_file(ec) || !predicate(it->path())) {
                continue;
            }
            std::error_code relative_ec;
            const auto relative = std::filesystem::relative(it->path(), root, relative_ec);
            if (!relative_ec) {
                files.push_back(relative.generic_string());
            }
        }
    }
    std::sort(files.begin(), files.end());
    return files;
}

// /lab/files 응답에서 재사용하는 문자열 배열 필드를 JSON으로 직렬화한다.
void AppendJsonStringArray(std::ostringstream& out, const std::string& name, const std::vector<std::string>& values) {
    out << "\"" << JsonEscape(name) << "\":[";
    for (std::size_t i = 0; i < values.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << "\"" << JsonEscape(values[i]) << "\"";
    }
    out << "]";
}

std::string LabFilesJson() {
    const auto root = std::filesystem::path(app::GetAppConfig().file_root_path);
    const auto asset_root = std::filesystem::path("docs") / "assets";
    const auto files = CollectRelativeFiles(root, IsSupportedMediaFile);
    const auto image_files = CollectRelativeFiles(root, IsSupportedImageFile);
    const auto asset_images = CollectRelativeFiles(asset_root, IsSupportedImageFile);

    std::string default_file = std::filesystem::path(app::GetAppConfig().default_file_path).filename().string();
    std::error_code relative_ec;
    const auto default_relative =
        std::filesystem::relative(std::filesystem::path(app::GetAppConfig().default_file_path), root, relative_ec);
    if (!relative_ec && !default_relative.empty() && default_relative.native().find("..") == std::string::npos) {
        default_file = default_relative.generic_string();
    }

    std::ostringstream out;
    out << "{\"root\":\"" << JsonEscape(root.filename().string()) << "\","
        << "\"assetRoot\":\"" << JsonEscape(asset_root.generic_string()) << "\","
        << "\"defaultFile\":\"" << JsonEscape(default_file) << "\","
        << "\"defaultImage\":\"va-four-scene-sample.png\",";
    AppendJsonStringArray(out, "files", files);
    out << ",";
    AppendJsonStringArray(out, "imageFiles", image_files);
    out << ",";
    AppendJsonStringArray(out, "assetImages", asset_images);
    out << "}";
    return out.str();
}

bool AttachWebRtcAnalysisOverlay(core::SessionManager& session_manager,
                                 const media::IngressRequest& ingress_request,
                                 const std::unordered_map<std::string, std::string>& query,
                                 const std::shared_ptr<WebRtcEgressSession>& bridge,
                                 std::string* analysis_tap_id,
                                 std::string* error_message) {
    if (!IsAnalysisOverlayRequested(query)) {
        return true;
    }
    if (bridge == nullptr) {
        if (error_message != nullptr) {
            *error_message = "missing WebRTC egress bridge for analysis overlay";
        }
        return false;
    }

    media::IngressRequest analysis_request = ingress_request;
    analysis_request.protocol = "webrtc";
    analysis_request.client_id = ingress_request.client_id + "-analysis";
    auto attach_result = session_manager.AttachAnalysisTap(analysis_request, BuildAnalysisProfileFromQuery(query));
    if (!attach_result.ok) {
        if (error_message != nullptr) {
            *error_message = attach_result.message.empty() ? "failed to attach analysis overlay tap"
                                                           : attach_result.message;
        }
        return false;
    }

    AnalysisOverlayConfig overlay_config;
    const auto timing_options = BuildAnalysisOverlayTimingOptionsFromQuery(query);
    std::weak_ptr<WebRtcEgressSession> weak_bridge = bridge;
    overlay_config.enabled = true;
    overlay_config.render_video_overlay =
        ParseBoolQuery(query, "renderVideoOverlay", ParseBoolQuery(query, "videoOverlay", true));
    overlay_config.render_options = BuildOverlayRenderOptionsFromQuery(query);
    overlay_config.sync_tolerance_ns = static_cast<std::int64_t>(timing_options.sync_tolerance_ms) * 1000000LL;
    overlay_config.wait_timeout_ms = timing_options.wait_timeout_ms;
    const auto metadata_channel_config = BuildWebRtcMetadataChannelConfigFromQuery(query);
    const bool metadata_channel_enabled = metadata_channel_config.enabled;
    const auto metadata_subscription_filter = BuildVaMetadataSubscriptionFilter(query);
    const bool metadata_fallback_payload_enabled =
        overlay_config.render_video_overlay ||
        ParseBoolQuery(query, "clientOverlayFallback", ParseBoolQuery(query, "vaMetadataDrawFallback", false));
    bridge->SetMetadataChannelConfig(metadata_channel_config);
    auto event_runtime = EventRuleRuntimeForKey("webrtc-overlay:" + attach_result.tap_id);
    overlay_config.result_provider =
        [&session_manager,
         tap_id = attach_result.tap_id,
         weak_bridge,
         event_runtime,
         metadata_channel_enabled,
         metadata_subscription_filter,
         metadata_fallback_payload_enabled,
         debug_overlay = overlay_config.render_options.draw_debug_overlay,
         tolerance_ns = overlay_config.sync_tolerance_ns,
         wait_timeout_ms = overlay_config.wait_timeout_ms](std::int64_t frame_pts)
            -> std::optional<analysis::AnalysisResult> {
            const auto bridge_lock = weak_bridge.lock();
            const std::int64_t source_pts =
                bridge_lock != nullptr ? bridge_lock->ResolveOverlaySourcePts(frame_pts) : frame_pts;
            // WebRTC overlay frame PTS를 원본 packet PTS로 되돌려 가장 가까운 분석 결과를 우선 사용한다.
            auto result = session_manager.WaitAnalysisResultNearPts(
                tap_id, source_pts, tolerance_ns, std::chrono::milliseconds(wait_timeout_ms));
            if (result.has_value()) {
                result->debug_state_requested =
                    result->debug_state_requested || debug_overlay || metadata_channel_enabled;
                result->debug_state_log_enabled = result->debug_state_log_enabled || debug_overlay;
                const auto evaluation = EvaluateStoredEventRules(*result, event_runtime);
                analysis::DispatchEventRecords(evaluation.annotated_result, evaluation.events);
                analysis::DispatchEventPosts(evaluation.annotated_result, evaluation.events);
                if (metadata_channel_enabled && bridge_lock != nullptr && bridge_lock->MetadataChannelReady()) {
                    const auto sync_info = BuildWebRtcVaMetadataSyncInfo(
                        source_pts,
                        evaluation.annotated_result.pts,
                        tolerance_ns,
                        WebRtcSyncStatusForMatch(source_pts, evaluation.annotated_result.pts),
                        evaluation.annotated_result.frame_width,
                        evaluation.annotated_result.frame_height);
                    bridge_lock->PublishAnalysisMetadata(
                        WebRtcVaMetadataMessageJson(evaluation.annotated_result,
                                                    evaluation.events,
                                                    sync_info,
                                                    metadata_subscription_filter));
                }
                return evaluation.annotated_result;
            }
            // 동기화 허용 시간 안에 결과가 아직 없으면 최신 snapshot으로 fallback해 overlay 공백을 줄인다.
            const auto snapshot = session_manager.AnalysisTapSnapshot(tap_id);
            if (!snapshot.has_value() || !snapshot->latest_result.has_value()) {
                if (metadata_channel_enabled && bridge_lock != nullptr && bridge_lock->MetadataChannelReady()) {
                    bridge_lock->PublishAnalysisMetadata(
                        WebRtcVaMetadataMissingMessageJson(tap_id, source_pts, tolerance_ns));
                }
                return std::optional<analysis::AnalysisResult>{};
            }
            auto latest_result = *snapshot->latest_result;
            latest_result.debug_state_requested =
                latest_result.debug_state_requested || debug_overlay || metadata_channel_enabled;
            latest_result.debug_state_log_enabled = latest_result.debug_state_log_enabled || debug_overlay;
            const auto evaluation = EvaluateStoredEventRules(latest_result, event_runtime);
            analysis::DispatchEventRecords(evaluation.annotated_result, evaluation.events);
            analysis::DispatchEventPosts(evaluation.annotated_result, evaluation.events);
            if (metadata_channel_enabled && bridge_lock != nullptr && bridge_lock->MetadataChannelReady()) {
                if (metadata_fallback_payload_enabled) {
                    const auto sync_info = BuildWebRtcVaMetadataSyncInfo(source_pts,
                                                                         evaluation.annotated_result.pts,
                                                                         tolerance_ns,
                                                                         "fallback-latest",
                                                                         evaluation.annotated_result.frame_width,
                                                                         evaluation.annotated_result.frame_height);
                    bridge_lock->PublishAnalysisMetadata(
                        WebRtcVaMetadataMessageJson(evaluation.annotated_result,
                                                    evaluation.events,
                                                    sync_info,
                                                    metadata_subscription_filter));
                } else {
                    bridge_lock->PublishAnalysisMetadata(
                        WebRtcVaMetadataMissingMessageJson(tap_id, source_pts, tolerance_ns));
                }
            }
            return evaluation.annotated_result;
        };
    bridge->SetAnalysisOverlay(std::move(overlay_config));
    if (analysis_tap_id != nullptr) {
        *analysis_tap_id = attach_result.tap_id;
    }
    if (error_message != nullptr) {
        error_message->clear();
    }
    return true;
}

bool SendAll(int fd, const std::string& data) {
    std::size_t sent = 0;
    while (sent < data.size()) {
        int flags = 0;
#ifdef MSG_NOSIGNAL
        flags |= MSG_NOSIGNAL;
#endif
        const ssize_t bytes = send(fd, data.data() + sent, data.size() - sent, flags);
        if (bytes <= 0) {
            return false;
        }
        sent += static_cast<std::size_t>(bytes);
    }
    return true;
}

void SuppressSocketSigPipe(int fd) {
#ifdef SO_NOSIGPIPE
    int enabled = 1;
    (void)setsockopt(fd, SOL_SOCKET, SO_NOSIGPIPE, &enabled, sizeof(enabled));
#else
    (void)fd;
#endif
}

}  // namespace

std::vector<std::string> AnalysisRuleDocumentsSnapshot() {
    auto documents = AnalysisRegistry().RuleDocuments();
    auto va_rule_documents = AnalysisRegistry().VaRuleDocuments();
    documents.insert(documents.end(), va_rule_documents.begin(), va_rule_documents.end());
    return documents;
}

std::vector<std::string> AnalysisProfileDocumentsSnapshot() {
    return AnalysisRegistry().ProfileDocuments();
}

std::vector<std::string> VideoAnalysisRuleDocumentsSnapshot() {
    return AnalysisRegistry().VaRuleDocuments();
}

bool ApplyVideoAnalysisRuleToRequest(media::IngressRequest* request, std::string* error_message) {
    if (request == nullptr) {
        if (error_message != nullptr) {
            *error_message = "request is missing";
        }
        return false;
    }
    if (request->query.find("_vaRuleResolved") != request->query.end()) {
        return true;
    }
    std::string va_rule_id;
    if (const auto it = request->query.find("vaRule"); it != request->query.end()) {
        va_rule_id = it->second;
    } else if (const auto it = request->query.find("vaRuleId"); it != request->query.end()) {
        va_rule_id = it->second;
    }
    if (va_rule_id.empty()) {
        return true;
    }
    if (request->query.find("file") != request->query.end() ||
        request->query.find("url") != request->query.end() ||
        request->query.find("source") != request->query.end()) {
        if (error_message != nullptr) {
            *error_message = "vaRule cannot be combined with file/url/source override";
        }
        return false;
    }
    const auto document = AnalysisRegistry().VaRuleJson(va_rule_id);
    if (!document.has_value()) {
        if (error_message != nullptr) {
            *error_message = "vaRule not found: " + va_rule_id;
        }
        return false;
    }
    const auto source = ExtractObjectField(*document, "source");
    if (!source.has_value()) {
        if (error_message != nullptr) {
            *error_message = "vaRule source is missing: " + va_rule_id;
        }
        return false;
    }
    const std::string source_kind = ParseStringField(*source, "kind").value_or("");
    if (source_kind == "file") {
        const std::string file = ParseStringField(*source, "file").value_or("");
        if (file.empty()) {
            if (error_message != nullptr) {
                *error_message = "vaRule file source is empty: " + va_rule_id;
            }
            return false;
        }
        request->query["file"] = file;
    } else {
        const std::string url = ParseStringField(*source, "url").value_or("");
        if (url.empty()) {
            if (error_message != nullptr) {
                *error_message = "vaRule url source is empty: " + va_rule_id;
            }
            return false;
        }
        request->query["url"] = url;
        request->query["source"] = source_kind.empty() ? "rtsp" : source_kind;
    }
    if (const auto analysis = ExtractObjectField(*document, "analysis"); analysis.has_value()) {
        const std::string profile_id = ParseStringField(*analysis, "profileId").value_or("");
        if (!profile_id.empty()) {
            request->query["profileId"] = profile_id;
        }
    }
    request->query["vaRule"] = va_rule_id;
    request->query["va"] = "1";
    request->query["_vaRuleResolved"] = "1";
    return true;
}

bool WebRtcHttpServer::Start(const std::string& listen_address, std::uint16_t port, std::string* error_message) {
    if (running_.load()) {
        return true;
    }

    impl_->listen_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (impl_->listen_fd < 0) {
        if (error_message != nullptr) {
            *error_message = "failed to create HTTP socket";
        }
        return false;
    }

    int opt = 1;
    setsockopt(impl_->listen_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    sockaddr_in addr{};
    addr.sin_family = AF_INET;
    addr.sin_port = htons(port);
    if (inet_pton(AF_INET, listen_address.c_str(), &addr.sin_addr) != 1) {
        if (error_message != nullptr) {
            *error_message = "invalid HTTP listen address";
        }
        close(impl_->listen_fd);
        impl_->listen_fd = -1;
        return false;
    }

    if (bind(impl_->listen_fd, reinterpret_cast<sockaddr*>(&addr), sizeof(addr)) != 0) {
        if (error_message != nullptr) {
            *error_message = std::string("failed to bind HTTP socket: ") + std::strerror(errno);
        }
        close(impl_->listen_fd);
        impl_->listen_fd = -1;
        return false;
    }
    if (listen(impl_->listen_fd, 32) != 0) {
        if (error_message != nullptr) {
            *error_message = std::string("failed to listen HTTP socket: ") + std::strerror(errno);
        }
        close(impl_->listen_fd);
        impl_->listen_fd = -1;
        return false;
    }

    impl_->listen_address = listen_address;
    impl_->port = port;
    running_.store(true);

    // 간단한 내장 HTTP 서버다. 연결마다 thread를 만들되 parser timeout과 동시 연결 상한을 둔다.
    impl_->accept_thread = std::thread([this] {
        while (running_.load()) {
            sockaddr_in client_addr{};
            socklen_t client_len = sizeof(client_addr);
            const int client_fd = accept(impl_->listen_fd, reinterpret_cast<sockaddr*>(&client_addr), &client_len);
            if (client_fd < 0) {
                if (running_.load()) {
                    std::this_thread::sleep_for(std::chrono::milliseconds(50));
                }
                continue;
            }

            const int previous_connections = impl_->active_http_connections.fetch_add(1);
            if (previous_connections >= kMaxActiveHttpConnections) {
                impl_->active_http_connections.fetch_sub(1);
                SetHttpSocketTimeouts(client_fd);
                SuppressSocketSigPipe(client_fd);
                (void)SendAll(client_fd,
                              BuildHttpResponse(PlainTextResponse(503,
                                                                  "Service Unavailable",
                                                                  "too many active connections")));
                close(client_fd);
                continue;
            }

            std::thread([this, client_fd] {
                struct ActiveConnectionGuard {
                    std::atomic<int>& active_connections;
                    ~ActiveConnectionGuard() {
                        active_connections.fetch_sub(1);
                    }
                } active_connection_guard{impl_->active_http_connections};

                SetHttpSocketTimeouts(client_fd);
                HttpResponse response;
                auto request_opt = ReadHttpRequest(client_fd, &response);
                bool response_sent = false;
                if (!request_opt.has_value()) {
                    if (response.body.empty()) {
                        response = PlainTextResponse(400, "Bad Request", "bad request");
                    }
                } else {
                    const HttpRequest& request = *request_opt;
                    response = [&]() -> HttpResponse {
                        if (request.method == "OPTIONS") {
                            return CorsPreflightResponse(request);
                        }
                        if (IsCorsOriginDenied(request)) {
                            return CorsForbiddenResponse();
                        }

                        const auto query = ParseQueryString(request.query);
                        const auto& config = app::GetAppConfig();
                        const bool session_auth_mode = config.auth_mode == app::AuthMode::Session ||
                                                       config.auth_mode == app::AuthMode::Auto;
                        const bool setup_flow_enabled = session_auth_mode;
                        const auth::BootstrapState bootstrap_state =
                            setup_flow_enabled ? auth::InspectBootstrapState(config)
                                               : auth::BootstrapState{};
                        auto cleanup_expired_auth_sessions = [&]() {
                            const auto now = std::chrono::system_clock::now();
                            for (auto it = impl_->auth_sessions.begin(); it != impl_->auth_sessions.end();) {
                                const bool ttl_expired = it->second.expires_at <= now;
                                const bool idle_expired =
                                    config.auth_session_idle_timeout_seconds > 0 &&
                                    it->second.last_seen_at +
                                            std::chrono::seconds(
                                                config.auth_session_idle_timeout_seconds) <=
                                        now;
                                if (ttl_expired || idle_expired) {
                                    it = impl_->auth_sessions.erase(it);
                                } else {
                                    ++it;
                                }
                            }
                        };
                        auto principal_from_session_cookie = [&]() -> std::optional<auth::Principal> {
                            const auto session_id =
                                auth::ExtractSessionCookie(request.headers, config.auth_cookie_name);
                            if (!session_id.has_value()) {
                                return std::nullopt;
                            }
                            auth::Principal session_principal;
                            {
                                std::lock_guard lock(impl_->auth_mu);
                                cleanup_expired_auth_sessions();
                                const auto it = impl_->auth_sessions.find(*session_id);
                                if (it == impl_->auth_sessions.end()) {
                                    return std::nullopt;
                                }
                                it->second.last_seen_at = std::chrono::system_clock::now();
                                session_principal = it->second.principal;
                            }
                            auth::AuthResult refreshed =
                                auth::RefreshPrincipalFromUser(config, session_principal);
                            if (!refreshed.ok) {
                                std::lock_guard lock(impl_->auth_mu);
                                impl_->auth_sessions.erase(*session_id);
                                return std::nullopt;
                            }
                            {
                                std::lock_guard lock(impl_->auth_mu);
                                const auto it = impl_->auth_sessions.find(*session_id);
                                if (it != impl_->auth_sessions.end()) {
                                    it->second.principal = refreshed.principal;
                                }
                            }
                            return refreshed.principal;
                        };
                        auto build_request_principal = [&]() -> auth::AuthResult {
                            auth::AuthResult result =
                                auth::BuildPrincipalFromRequest(config, request.headers, query);
                            if (result.ok || !session_auth_mode) {
                                return result;
                            }
                            const auto session_principal = principal_from_session_cookie();
                            if (session_principal.has_value()) {
                                return auth::AuthResult{.ok = true,
                                                        .principal = *session_principal,
                                                        .error = ""};
                            }
                            return result;
                        };
                        const auth::AuthResult principal_result = build_request_principal();
                        const std::string route_path = "/" + config.stream_route;
                        auto create_auth_session = [&](const auth::Principal& principal,
                                                       std::string* error_message) -> std::optional<std::string> {
                            auto session_id = auth::GenerateSessionId(error_message);
                            if (!session_id.has_value()) {
                                return std::nullopt;
                            }
                            std::lock_guard lock(impl_->auth_mu);
                            cleanup_expired_auth_sessions();
                            impl_->auth_sessions[*session_id] =
                                Impl::AuthSessionEntry{
                                    .session_id = *session_id,
                                    .principal = principal,
                                    .expires_at = std::chrono::system_clock::now() +
                                                  std::chrono::seconds(config.auth_session_ttl_seconds),
                                    .last_seen_at = std::chrono::system_clock::now(),
                                };
                            return session_id;
                        };
                        auto destroy_auth_session = [&]() {
                            const auto session_id =
                                auth::ExtractSessionCookie(request.headers, config.auth_cookie_name);
                            if (!session_id.has_value()) {
                                return;
                            }
                            std::lock_guard lock(impl_->auth_mu);
                            impl_->auth_sessions.erase(*session_id);
                        };
                        auto revoke_auth_sessions_for = [&](const std::string& username) {
                            if (username.empty()) {
                                return;
                            }
                            std::lock_guard lock(impl_->auth_mu);
                            for (auto it = impl_->auth_sessions.begin(); it != impl_->auth_sessions.end();) {
                                if (it->second.principal.username == username) {
                                    it = impl_->auth_sessions.erase(it);
                                } else {
                                    ++it;
                                }
                            }
                        };
                        auto stream_metadata_sse_response = [&](const std::string& tap_id,
                                                                bool detach_on_close) -> HttpResponse {
                            response_sent = true;
                            impl_->active_sse_metadata_clients.fetch_add(1);
                            (void)StreamVaMetadataSse(client_fd,
                                                       running_,
                                                       impl_->session_manager,
                                                       tap_id,
                                                       query,
                                                       request);
                            impl_->active_sse_metadata_clients.fetch_sub(1);
                            if (detach_on_close) {
                                (void)DetachAnalysisTapAndReleaseRuntimes(impl_->session_manager, tap_id);
                            }
                            return HttpResponse{};
                        };
                        auto stream_metadata_websocket_response = [&](const std::string& tap_id,
                                                                      bool detach_on_close,
                                                                      const std::string& websocket_key) -> HttpResponse {
                            const int max_clients = ParseClampedIntQuery(query, "maxClients", 16, 1, 256);
                            const int previous_clients = impl_->active_ws_metadata_clients.fetch_add(1);
                            if (previous_clients >= max_clients) {
                                impl_->active_ws_metadata_clients.fetch_sub(1);
                                if (detach_on_close) {
                                    (void)DetachAnalysisTapAndReleaseRuntimes(impl_->session_manager, tap_id);
                                }
                                return JsonResponse(429,
                                                    "Too Many Requests",
                                                    "{\"error\":\"too many VA metadata WebSocket clients\"}");
                            }
                            response_sent = true;
                            (void)StreamVaMetadataWebSocket(
                                client_fd, running_, impl_->session_manager, tap_id, query, websocket_key, request);
                            impl_->active_ws_metadata_clients.fetch_sub(1);
                            if (detach_on_close) {
                                (void)DetachAnalysisTapAndReleaseRuntimes(impl_->session_manager, tap_id);
                            }
                            return HttpResponse{};
                        };
                        struct CreatedWebRtcSession {
                            std::string session_id;
                            std::string session_capability;
                            std::string offer;
                        };
                        auto close_webrtc_session = [&](const std::string& session_id) -> bool {
                            Impl::SessionEntry entry;
                            {
                                std::lock_guard lock(impl_->mu);
                                const auto it = impl_->sessions.find(session_id);
                                if (it == impl_->sessions.end()) {
                                    return false;
                                }
                                entry = it->second;
                                impl_->sessions.erase(it);
                                for (auto client_it = impl_->client_sessions.begin();
                                     client_it != impl_->client_sessions.end();) {
                                    if (client_it->second.session_id == session_id) {
                                        client_it = impl_->client_sessions.erase(client_it);
                                    } else {
                                        ++client_it;
                                    }
                                }
                            }
                            entry.bridge->Stop();
                            if (!entry.analysis_tap_id.empty()) {
                                DetachAnalysisTapAndReleaseRuntimes(
                                    impl_->session_manager, entry.analysis_tap_id);
                            }
                            impl_->session_manager.CloseSession(entry.ingress_client_id);
                            return true;
                        };
                        auto create_webrtc_session_response =
                            [&](std::unordered_map<std::string, std::string> session_query,
                                const std::string& session_prefix,
                                CreatedWebRtcSession* created_session) -> HttpResponse {
                            // simple signaling: 서버가 offer를 만들고 브라우저/테스트 클라이언트가 answer를 돌려준다.
                            std::string session_secret_error;
                            const auto generated_secrets =
                                GenerateHttpSessionSecrets(session_prefix, &session_secret_error);
                            if (!generated_secrets.has_value()) {
                                return JsonResponse(
                                    503,
                                    "Service Unavailable",
                                    "{\"error\":\"" + JsonEscape(session_secret_error) + "\"}");
                            }
                            const std::string session_id = generated_secrets->session_id;
                            const std::string session_capability = generated_secrets->session_capability;
                            const std::string ingress_client_id = session_id + "-ingress";
                            media::IngressRequest ingress_request =
                                BuildHttpIngressRequest(route_path, session_query, ingress_client_id);
                            std::string va_rule_error;
                            if (!ApplyVideoAnalysisRuleToRequest(&ingress_request, &va_rule_error)) {
                                return JsonResponse(400,
                                                    "Bad Request",
                                                    "{\"error\":\"" + JsonEscape(va_rule_error) + "\"}");
                            }
                            auto bridge = std::make_shared<WebRtcEgressSession>();
                            std::string analysis_tap_id;
                            std::string error_message;
                            if (!AttachWebRtcAnalysisOverlay(
                                    impl_->session_manager,
                                    ingress_request,
                                    ingress_request.query,
                                    bridge,
                                    &analysis_tap_id,
                                    &error_message)) {
                                return JsonResponse(400,
                                                    "Bad Request",
                                                    "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                            }
                            auto create_result = impl_->session_manager.CreateSession(
                                ingress_request,
                                [bridge](const media::Packet& packet) { bridge->HandleSample(packet); });
                            if (!create_result.ok) {
                                if (!analysis_tap_id.empty()) {
                                    DetachAnalysisTapAndReleaseRuntimes(impl_->session_manager, analysis_tap_id);
                                }
                                return JsonResponse(400,
                                                    "Bad Request",
                                                    "{\"error\":\"" + JsonEscape(create_result.message) + "\"}");
                            }

                            if (!bridge->Start(session_id, create_result.stream, &error_message)) {
                                if (!analysis_tap_id.empty()) {
                                    DetachAnalysisTapAndReleaseRuntimes(impl_->session_manager, analysis_tap_id);
                                }
                                impl_->session_manager.CloseSession(ingress_client_id);
                                return JsonResponse(500,
                                                    "Internal Server Error",
                                                    "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                            }

                            std::string offer;
                            if (!bridge->CreateOffer(&offer, &error_message)) {
                                bridge->Stop();
                                if (!analysis_tap_id.empty()) {
                                    DetachAnalysisTapAndReleaseRuntimes(impl_->session_manager, analysis_tap_id);
                                }
                                impl_->session_manager.CloseSession(ingress_client_id);
                                return JsonResponse(500,
                                                    "Internal Server Error",
                                                    "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                            }

                            {
                                std::lock_guard lock(impl_->mu);
                                impl_->sessions.emplace(session_id,
                                                        Impl::SessionEntry{
                                                            .session_id = session_id,
                                                            .ingress_client_id = ingress_client_id,
                                                            .analysis_tap_id = analysis_tap_id,
                                                            .session_capability = session_capability,
                                                            .owner_principal = principal_result.principal,
                                                            .request = std::move(ingress_request),
                                                            .bridge = bridge,
                                                        });
                            }
                            if (created_session != nullptr) {
                                *created_session = CreatedWebRtcSession{
                                    .session_id = session_id,
                                    .session_capability = session_capability,
                                    .offer = offer,
                                };
                            }
                            return JsonResponse(200, "OK", SessionJson(session_id, offer, session_capability));
                        };
                        auto route_disabled_response = [](const std::string& route) {
                            return JsonResponse(404,
                                                "Not Found",
                                                "{\"error\":\"" + JsonEscape(route) + " route disabled\"}");
                        };
                        auto require_ops_principal = [&]() -> std::optional<HttpResponse> {
                            if (!config.enable_ops) {
                                return route_disabled_response("ops");
                            }
                            if (!principal_result.ok) {
                                return AuthErrorResponse(principal_result.error);
                            }
                            if (!auth::RequireRole(principal_result.principal, {"operator"}) ||
                                !auth::RequireScope(principal_result.principal, "ops:read")) {
                                return JsonResponse(
                                    403,
                                    "Forbidden",
                                    "{\"error\":\"operator role and ops:read scope required\"}");
                            }
                            return std::nullopt;
                        };
                        auto require_admin_principal = [&]() -> std::optional<HttpResponse> {
                            if (!config.enable_ops) {
                                return route_disabled_response("ops");
                            }
                            if (!principal_result.ok) {
                                return AuthErrorResponse(principal_result.error);
                            }
                            if (!auth::IsAdmin(principal_result.principal)) {
                                return JsonResponse(403, "Forbidden", "{\"error\":\"admin role required\"}");
                            }
                            return std::nullopt;
                        };
                        auto require_client_api_principal = [&]() -> std::optional<HttpResponse> {
                            if (!config.enable_client) {
                                return route_disabled_response("client");
                            }
                            if (!principal_result.ok) {
                                return AuthErrorResponse(principal_result.error);
                            }
                            if (!auth::RequireRole(principal_result.principal, {"viewer", "operator"}) &&
                                !auth::IsIntegrator(principal_result.principal)) {
                                return JsonResponse(
                                    403,
                                    "Forbidden",
                                    "{\"error\":\"viewer/operator/integrator role required\"}");
                            }
                            return std::nullopt;
                        };
                        auto require_client_shell_principal = [&]() -> std::optional<HttpResponse> {
                            if (!config.enable_client) {
                                return route_disabled_response("client");
                            }
                            if (!principal_result.ok) {
                                return AuthErrorResponse(principal_result.error);
                            }
                            if (!auth::RequireRole(principal_result.principal, {"viewer", "operator"})) {
                                return JsonResponse(403, "Forbidden", "{\"error\":\"viewer/operator role required\"}");
                            }
                            return std::nullopt;
                        };
                        auto require_scope_principal =
                            [&](const std::string& scope,
                                const std::string& error) -> std::optional<HttpResponse> {
                                if (!principal_result.ok) {
                                    return AuthErrorResponse(principal_result.error);
                                }
                                if (!auth::RequireScope(principal_result.principal, scope)) {
                                    return JsonResponse(
                                        403,
                                        "Forbidden",
                                        "{\"error\":\"" + JsonEscape(error) + "\"}");
                                }
                                return std::nullopt;
                            };
                        auto require_source_write_principal = [&]() -> std::optional<HttpResponse> {
                            return require_scope_principal("source:write", "source:write scope required");
                        };
                        auto require_rule_write_principal = [&]() -> std::optional<HttpResponse> {
                            return require_scope_principal("rule:write", "rule:write scope required");
                        };
                        auto require_lab_principal = [&]() -> std::optional<HttpResponse> {
                            if (!config.enable_lab) {
                                return route_disabled_response("lab");
                            }
                            if (!principal_result.ok) {
                                return AuthErrorResponse(principal_result.error);
                            }
                            if (!auth::RequireRole(principal_result.principal, {"operator"}) &&
                                !auth::RequireScope(principal_result.principal, "lab:read")) {
                                return JsonResponse(403, "Forbidden", "{\"error\":\"lab scope required\"}");
                            }
                            return std::nullopt;
                        };
                        auto require_generic_media_principal = [&]() -> std::optional<HttpResponse> {
                            if (config.auth_mode == app::AuthMode::Off) {
                                return std::nullopt;
                            }
                            if (!principal_result.ok) {
                                return AuthErrorResponse(principal_result.error);
                            }
                            const bool ops_media_allowed =
                                auth::RequireRole(principal_result.principal, {"operator"}) &&
                                auth::RequireScope(principal_result.principal, "ops:read");
                            const bool lab_media_allowed =
                                auth::RequireScope(principal_result.principal, "lab:read");
                            if (!ops_media_allowed && !lab_media_allowed) {
                                return JsonResponse(
                                    403,
                                    "Forbidden",
                                    "{\"error\":\"generic media endpoints require operator ops access or lab scope\"}");
	                            }
	                            return std::nullopt;
	                        };
	                        auto runtime_status_body = [&]() {
	                            std::size_t http_egress_sessions = 0;
	                            std::size_t whip_publish_sessions = 0;
	                            std::vector<WebRtcMetadataChannelStats> metadata_channel_stats;
	                            {
	                                std::lock_guard lock(impl_->mu);
	                                http_egress_sessions = impl_->sessions.size();
	                                whip_publish_sessions = impl_->source_sessions.size();
	                                metadata_channel_stats.reserve(impl_->sessions.size());
	                                for (const auto& [_, entry] : impl_->sessions) {
	                                    if (entry.bridge != nullptr) {
	                                        metadata_channel_stats.push_back(entry.bridge->MetadataChannelStatsSnapshot());
	                                    }
	                                }
	                            }
	                            return RuntimeStatusJson(impl_->session_manager.GetRuntimeStateSnapshot(),
	                                                     http_egress_sessions,
	                                                     whip_publish_sessions,
	                                                     metadata_channel_stats,
	                                                     impl_->active_sse_metadata_clients.load(),
	                                                     impl_->active_ws_metadata_clients.load(),
	                                                     WebRtcSourceRegistry::Instance().Snapshots(),
	                                                     impl_->session_manager.AnalysisTapSnapshots());
	                        };

	                        if (request.method == "GET" && request.path == "/health") {
                            HttpResponse ok;
                            ok.content_type = "application/json; charset=utf-8";
                            ok.body = "{\"status\":\"ok\"}";
                            return ok;
                        }

                        if (request.path == "/setup") {
                            if (!setup_flow_enabled) {
                                return JsonResponse(404,
                                                    "Not Found",
                                                    "{\"error\":\"setup is not enabled for this auth mode\"}");
                            }
                            if (!bootstrap_state.setup_required) {
                                return RedirectResponse("/login");
                            }
                            if (request.method == "GET") {
                                return HtmlPageResponse(SetupPageHtml(bootstrap_state.reason, false));
                            }
                            if (request.method == "POST") {
                                if (!auth::PasswordHashingAvailable()) {
                                    return JsonResponse(
                                        503,
                                        "Service Unavailable",
                                        "{\"error\":\"safe password hashing is unavailable; build with libsodium\"}");
                                }
                                const auto form = ParseQueryString(request.body);
                                const std::string username =
                                    form.count("username") != 0 ? form.at("username") : std::string();
                                const std::string password =
                                    form.count("password") != 0 ? form.at("password") : std::string();
                                const std::string confirm =
                                    form.count("confirm") != 0 ? form.at("confirm") : std::string();
                                if (username != "admin") {
                                    return HtmlPageResponse(
                                        SetupPageHtml("최초 setup username은 admin이어야 합니다.", true),
                                        400,
                                        "Bad Request");
                                }
                                const auth::PasswordPolicyResult policy =
                                    auth::ValidatePasswordPolicy(config, username, password, confirm, nullptr);
                                if (!policy.ok) {
                                    return HtmlPageResponse(SetupPageHtml(policy.message, true),
                                                            400,
                                                            "Bad Request");
                                }
                                std::string setup_error;
                                if (!auth::SaveBootstrapAdmin(config, password, &setup_error)) {
                                    return JsonResponse(500,
                                                        "Internal Server Error",
                                                        "{\"error\":\"" + JsonEscape(setup_error) + "\"}");
                                }
                                return RedirectResponse("/login");
                            }
                            return JsonResponse(405,
                                                "Method Not Allowed",
                                                "{\"error\":\"method not allowed\"}");
                        }

                        if (setup_flow_enabled && bootstrap_state.setup_required) {
                            if (request.path == "/auth/whoami") {
                                HttpResponse ok =
                                    JsonResponse(200, "OK", WhoamiJson(principal_result, bootstrap_state, config));
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                            if (request.method == "GET" || request.method == "HEAD") {
                                HttpResponse redirect = RedirectResponse("/setup");
                                if (request.method == "HEAD") {
                                    redirect.body.clear();
                                }
                                return redirect;
                            }
                            return JsonResponse(403,
                                                "Forbidden",
                                                "{\"error\":\"admin setup is required\"}");
                        }

                        if (request.method == "GET" && request.path == "/invite/setup") {
                            if (!session_auth_mode) {
                                return JsonResponse(404,
                                                    "Not Found",
                                                    "{\"error\":\"invite setup is not enabled for this auth mode\"}");
                            }
                            return HtmlPageResponse(InviteSetupPageHtml(
                                query.count("token") != 0 ? query.at("token") : std::string(), "", false));
                        }

                        if (request.method == "POST" && request.path == "/invite/setup") {
                            if (!session_auth_mode) {
                                return JsonResponse(404,
                                                    "Not Found",
                                                    "{\"error\":\"invite setup is not enabled for this auth mode\"}");
                            }
                            const auto form = ParseQueryString(request.body);
                            const std::string token =
                                form.count("token") != 0 ? form.at("token") : std::string();
                            const std::string password =
                                form.count("password") != 0 ? form.at("password") : std::string();
                            const std::string confirm =
                                form.count("confirm") != 0 ? form.at("confirm") : std::string();
                            const auth::AuthUserResult result =
                                auth::CompleteInvitePasswordSetup(config, token, password, confirm);
                            if (result.status >= 200 && result.status < 300 && !result.username.empty()) {
                                revoke_auth_sessions_for(result.username);
                                return RedirectResponse("/login");
                            }
                            const std::string message =
                                ParseStringField(result.body, "error").value_or("invite setup failed");
                            return HtmlPageResponse(InviteSetupPageHtml(token, message, true),
                                                    result.status,
                                                    result.status_text);
                        }

                        if (request.method == "GET" && request.path == "/client/request-access") {
                            if (!config.enable_client) {
                                return route_disabled_response("client");
                            }
                            return HtmlPageResponse(ClientAccessRequestPageHtml());
                        }

                        if (request.method == "POST" && request.path == "/client/api/access-requests") {
                            if (!config.enable_client) {
                                return route_disabled_response("client");
                            }
                            constexpr std::size_t kPublicAccessRequestMaxBodyBytes = 4 * 1024;
                            if (request.body.size() > kPublicAccessRequestMaxBodyBytes) {
                                return JsonResponse(413,
                                                    "Payload Too Large",
                                                    "{\"error\":\"access request body is too large\"}");
                            }
                            int retry_after_seconds = 0;
                            if (!impl_->AllowPublicAccessRequestAttempt(PeerAddress(client_fd),
                                                                        &retry_after_seconds)) {
                                HttpResponse too_many = JsonResponse(
                                    429,
                                    "Too Many Requests",
                                    "{\"error\":\"too many access request attempts\"}");
                                too_many.headers["Retry-After"] = std::to_string(retry_after_seconds);
                                return too_many;
                            }
                            return AuthUserHttpResponse(auth::CreateAccessRequestFromJson(config, request.body));
                        }

                        if (request.method == "GET" && request.path == "/login") {
                            if (session_auth_mode && principal_result.ok) {
                                return RedirectResponse(RoleLandingPath(principal_result.principal, config));
                            }
                            const auto error_it = query.find("error");
                            return HtmlPageResponse(LoginPageHtml(
                                error_it == query.end() ? std::string() : error_it->second,
                                error_it != query.end()));
                        }

                        if (request.method == "POST" && request.path == "/login") {
                            if (!session_auth_mode) {
                                return JsonResponse(400,
                                                    "Bad Request",
                                                    "{\"error\":\"login requires MEDIA_SERVER_AUTH_MODE=session\"}");
                            }
                            const auto form = ParseQueryString(request.body);
                            const std::string username =
                                form.count("username") != 0 ? form.at("username") : std::string();
                            const std::string password =
                                form.count("password") != 0 ? form.at("password") : std::string();
                            auth::AuthResult login =
                                auth::AuthenticateUserPassword(config, username, password, PeerAddress(client_fd));
                            if (!login.ok) {
                                const std::string message =
                                    login.error == "account is temporarily locked"
                                        ? "로그인 실패가 반복되어 계정이 잠시 잠겼습니다. 잠시 후 다시 시도하세요."
                                        : "로그인 정보가 올바르지 않습니다.";
                                return HtmlPageResponse(LoginPageHtml(message, true), 401, "Unauthorized");
                            }
                            destroy_auth_session();
                            std::string session_error;
                            const auto session_id = create_auth_session(login.principal, &session_error);
                            if (!session_id.has_value()) {
                                return JsonResponse(503,
                                                    "Service Unavailable",
                                                    "{\"error\":\"" + JsonEscape(session_error) + "\"}");
                            }
                            HttpResponse redirect = RedirectResponse(RoleLandingPath(login.principal, config));
                            redirect.headers["Set-Cookie"] =
                                AuthCookieHeader(config, *session_id, config.auth_session_ttl_seconds);
                            return redirect;
                        }

                        if ((request.method == "GET" || request.method == "POST") &&
                            request.path == "/password/change") {
                            if (!session_auth_mode) {
                                return JsonResponse(404,
                                                    "Not Found",
                                                    "{\"error\":\"password change is not enabled for this auth mode\"}");
                            }
                            if (!principal_result.ok) {
                                if (request.method == "GET") {
                                    return RedirectResponse("/login");
                                }
                                return AuthErrorResponse(principal_result.error);
                            }
                            if (request.method == "GET") {
                                return HtmlPageResponse(
                                    PasswordChangePageHtml(principal_result.principal, "", false));
                            }
                            const auto form = ParseQueryString(request.body);
                            const std::string current_password =
                                form.count("currentPassword") != 0 ? form.at("currentPassword") : std::string();
                            const std::string password =
                                form.count("password") != 0 ? form.at("password") : std::string();
                            const std::string confirm =
                                form.count("confirm") != 0 ? form.at("confirm") : std::string();
                            std::string change_error;
                            if (!auth::ChangeUserPassword(config,
                                                          principal_result.principal.username,
                                                          current_password,
                                                          password,
                                                          confirm,
                                                          true,
                                                          &change_error)) {
                                return HtmlPageResponse(PasswordChangePageHtml(
                                                            principal_result.principal, change_error, true),
                                                        400,
                                                        "Bad Request");
                            }
                            destroy_auth_session();
                            HttpResponse redirect = RedirectResponse("/login");
                            redirect.headers["Set-Cookie"] = ExpiredAuthCookieHeader(config);
                            return redirect;
                        }

                        if (request.method == "POST" && request.path == "/logout") {
                            destroy_auth_session();
                            HttpResponse redirect = RedirectResponse("/login");
                            redirect.headers["Set-Cookie"] = ExpiredAuthCookieHeader(config);
                            return redirect;
                        }

                        if (request.method == "GET" && request.path == "/auth/whoami") {
                            if (!principal_result.ok) {
                                HttpResponse failed = JsonResponse(
                                    401, "Unauthorized", WhoamiJson(principal_result, bootstrap_state, config));
                                failed.headers["WWW-Authenticate"] = "Bearer";
                                failed.headers["Cache-Control"] = "no-store";
                                return failed;
                            }
                            HttpResponse ok =
                                JsonResponse(200, "OK", WhoamiJson(principal_result, bootstrap_state, config));
                            ok.headers["Cache-Control"] = "no-store";
                            return ok;
                        }

                        if (session_auth_mode && principal_result.ok &&
                            principal_result.principal.password_change_required) {
                            if (request.method == "GET" || request.method == "HEAD") {
                                HttpResponse redirect = RedirectResponse("/password/change");
                                if (request.method == "HEAD") {
                                    redirect.body.clear();
                                }
                                return redirect;
                            }
                            return JsonResponse(403,
                                                "Forbidden",
                                                "{\"error\":\"password change is required\"}");
                        }

                        if ((request.method == "GET" || request.method == "HEAD") && request.path == "/") {
                            if (config.auth_mode == app::AuthMode::Off) {
                                HttpResponse redirect = RedirectResponse(DefaultHomePath(config));
                                if (request.method == "HEAD") {
                                    redirect.body.clear();
                                }
                                return redirect;
                            }
                            if (!principal_result.ok) {
                                HttpResponse redirect = RedirectResponse("/login");
                                if (request.method == "HEAD") {
                                    redirect.body.clear();
                                }
                                return redirect;
                            }
                            HttpResponse redirect =
                                RedirectResponse(RoleLandingPath(principal_result.principal, config));
                            if (request.method == "HEAD") {
                                redirect.body.clear();
                            }
                            return redirect;
                        }

                        if (request.method == "GET" && request.path == "/ops/sources") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                if (!principal_result.ok && session_auth_mode && config.enable_ops) {
                                    return RedirectResponse("/login");
                                }
                                if (!principal_result.ok) {
                                    return UnauthorizedPageResponse();
                                }
                                if (auth_response->status == 403) {
                                    return ForbiddenPageResponse("운영 콘솔은 admin/operator role과 ops:read scope가 필요합니다.");
                                }
                                return *auth_response;
                            }
                            return HtmlPageResponse(BuildOpsSourcesPageHtml(principal_result.principal));
                        }

                        if (request.method == "GET" && request.path == "/ops/users") {
                            if (const auto auth_response = require_admin_principal(); auth_response.has_value()) {
                                if (!principal_result.ok && session_auth_mode && config.enable_ops) {
                                    return RedirectResponse("/login");
                                }
                                if (!principal_result.ok) {
                                    return UnauthorizedPageResponse();
                                }
                                if (auth_response->status == 403) {
                                    return ForbiddenPageResponse("계정 관리는 admin 계정만 접근할 수 있습니다.");
                                }
                                return *auth_response;
                            }
                            return HtmlPageResponse(BuildOpsUsersPageHtml(principal_result.principal));
                        }

                        if (request.method == "GET" && request.path == "/ops/rules") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                if (!principal_result.ok && session_auth_mode && config.enable_ops) {
                                    return RedirectResponse("/login");
                                }
                                if (!principal_result.ok) {
                                    return UnauthorizedPageResponse();
                                }
                                if (auth_response->status == 403) {
                                    return ForbiddenPageResponse("운영 콘솔은 admin/operator role과 ops:read scope가 필요합니다.");
                                }
                                return *auth_response;
                            }
                            return HtmlPageResponse(OpsShellPageHtml(config, principal_result.principal, "rules"));
                        }

	                        if (request.path == "/ops/api/users") {
	                            if (const auto auth_response = require_admin_principal(); auth_response.has_value()) {
	                                return *auth_response;
	                            }
                            if (request.method == "GET") {
                                return AuthUserHttpResponse(auth::ListAuthUsers(config));
                            }
                            if (request.method == "POST") {
                                const auth::AuthUserResult result =
                                    auth::CreateAuthUserFromJson(config, request.body);
	                                return AuthUserHttpResponse(result);
	                            }
	                        }

	                        if (request.method == "GET" && request.path == "/ops/api/runtime/status") {
	                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
	                                return *auth_response;
	                            }
	                            HttpResponse ok = JsonResponse(200, "OK", runtime_status_body());
	                            ok.headers["Cache-Control"] = "no-store";
	                            return ok;
	                        }

	                        if (request.method == "GET" && request.path == "/ops/api/rules/catalog") {
	                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
	                                return *auth_response;
	                            }
	                            HttpResponse ok = JsonResponse(200, "OK", OpsRulesCatalogJson());
	                            ok.headers["Cache-Control"] = "no-store";
	                            return ok;
	                        }

	                        if (request.method == "GET" && request.path == "/ops/api/events/status") {
	                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
	                                return *auth_response;
	                            }
	                            analysis::EventRecordQueryOptions options;
	                            std::string error_message;
	                            if (!BuildEventRecordQueryOptions(query, &options, &error_message)) {
	                                return JsonResponse(400,
	                                                    "Bad Request",
	                                                    "{\"error\":\"" + JsonEscape(error_message) + "\"}");
	                            }
	                            analysis::EventRecordQueryResult result;
	                            if (!analysis::QueryEventRecords(options, &result, &error_message)) {
	                                return JsonResponse(500,
	                                                    "Internal Server Error",
	                                                    "{\"error\":\"" + JsonEscape(error_message) + "\"}");
	                            }
	                            HttpResponse ok = JsonResponse(
	                                200,
	                                "OK",
	                                "{\"status\":\"ops-events\",\"storage\":" +
	                                    AnalysisEventStorageStatusJson() + ",\"post\":" +
	                                    AnalysisEventPostStatusJson() + ",\"records\":" +
	                                    AnalysisEventRecordsJson(result) + "}");
	                            ok.headers["Cache-Control"] = "no-store";
	                            return ok;
	                        }

	                        if (request.path == "/ops/api/audit") {
	                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
	                                return *auth_response;
	                            }
	                            if (request.method == "GET") {
	                                const std::string format =
	                                    query.count("format") != 0 ? Trim(query.at("format")) : std::string();
	                                HttpResponse ok;
	                                if (format == "csv") {
	                                    ok = PlainTextResponse(200, "OK", OpsAuditEntriesCsv(config, query));
	                                    ok.content_type = "text/csv; charset=utf-8";
	                                    ok.headers["Content-Disposition"] =
	                                        "attachment; filename=\"ops-audit.csv\"";
	                                } else {
	                                    ok = JsonResponse(200, "OK", OpsAuditEntriesJson(config, query));
	                                    if (format == "json" || ParseBoolQuery(query, "download", false)) {
	                                        ok.headers["Content-Disposition"] =
	                                            "attachment; filename=\"ops-audit.json\"";
	                                    }
	                                }
	                                ok.headers["Cache-Control"] = "no-store";
	                                return ok;
	                            }
	                            if (request.method == "POST") {
	                                constexpr std::size_t kOpsAuditMaxBodyBytes = 256 * 1024;
	                                if (request.body.size() > kOpsAuditMaxBodyBytes) {
	                                    return JsonResponse(
	                                        413,
	                                        "Payload Too Large",
	                                        "{\"error\":\"audit entry body is too large\"}");
	                                }
	                                const std::string entry =
	                                    OpsAuditRecordJson(request.body, principal_result.principal);
	                                std::string audit_error;
	                                if (!AppendOpsAuditRecord(config, entry, &audit_error)) {
	                                    return JsonResponse(
	                                        500,
	                                        "Internal Server Error",
	                                        "{\"error\":\"" + JsonEscape(audit_error) + "\"}");
	                                }
	                                HttpResponse ok = JsonResponse(
	                                    201,
	                                    "Created",
	                                    "{\"status\":\"ops-audit\",\"persistent\":true,\"entry\":" + entry + "}");
	                                ok.headers["Cache-Control"] = "no-store";
	                                return ok;
	                            }
	                            return JsonResponse(405,
	                                                "Method Not Allowed",
	                                                "{\"error\":\"method not allowed\"}");
	                        }

	                        if (request.path == "/ops/api/invites") {
	                            if (const auto auth_response = require_admin_principal(); auth_response.has_value()) {
	                                return *auth_response;
	                            }
                            if (request.method == "POST") {
                                const auth::AuthUserResult result =
                                    auth::CreateInviteFromJson(config, request.body);
                                return AuthUserHttpResponse(result);
                            }
                        }

                        if (request.path == "/ops/api/access-requests") {
                            if (const auto auth_response = require_admin_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                return AuthUserHttpResponse(auth::ListAccessRequests(config));
                            }
                        }

                        if (request.path.rfind("/ops/api/access-requests/", 0) == 0) {
                            if (const auto auth_response = require_admin_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            const std::string suffix =
                                request.path.substr(std::string("/ops/api/access-requests/").size());
                            const std::size_t slash = suffix.find('/');
                            const std::string request_id =
                                UrlDecode(slash == std::string::npos ? suffix : suffix.substr(0, slash));
                            const std::string action =
                                slash == std::string::npos ? std::string() : suffix.substr(slash + 1);
                            if (request.method == "POST" && action == "approve") {
                                const auth::AuthUserResult result =
                                    auth::ApproveAccessRequestFromJson(config, request_id, request.body);
                                if (result.status >= 200 && result.status < 300 && !result.username.empty()) {
                                    revoke_auth_sessions_for(result.username);
                                }
                                return AuthUserHttpResponse(result);
                            }
                            if (request.method == "POST" && action == "reject") {
                                return AuthUserHttpResponse(auth::RejectAccessRequest(config, request_id));
                            }
                            return JsonResponse(404,
                                                "Not Found",
                                                "{\"error\":\"access request resource not found\"}");
                        }

                        if (request.path.rfind("/ops/api/users/", 0) == 0) {
                            if (const auto auth_response = require_admin_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            const std::string suffix =
                                request.path.substr(std::string("/ops/api/users/").size());
                            const std::size_t slash = suffix.find('/');
                            const std::string username =
                                UrlDecode(slash == std::string::npos ? suffix : suffix.substr(0, slash));
                            const std::string action =
                                slash == std::string::npos ? std::string() : suffix.substr(slash + 1);
                            auth::AuthUserResult result;
                            if (request.method == "PUT" && action.empty()) {
                                result = auth::UpdateAuthUserFromJson(config, username, request.body);
                            } else if (request.method == "POST" && action == "reset-password") {
                                result = auth::ResetAuthUserPasswordFromJson(config, username, request.body);
                            } else if (request.method == "POST" && action == "disable") {
                                result = auth::SetAuthUserEnabled(config, username, false);
                            } else if (request.method == "POST" && action == "enable") {
                                result = auth::SetAuthUserEnabled(config, username, true);
                            } else {
                                return JsonResponse(404,
                                                    "Not Found",
                                                    "{\"error\":\"user resource not found\"}");
                            }
                            if (result.status >= 200 && result.status < 300 && !result.username.empty()) {
                                revoke_auth_sessions_for(result.username);
                            }
                            return AuthUserHttpResponse(result);
                        }

                        if (request.path == "/ops/api/sources") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                return RegistryHttpResponse(SourceViewRegistry::Instance().SourcesJson());
                            }
                            if (request.method == "POST") {
                                if (const auto auth_response = require_source_write_principal();
                                    auth_response.has_value()) {
                                    return *auth_response;
                                }
                                return RegistryHttpResponse(
                                    SourceViewRegistry::Instance().CreateSource(request.body));
                            }
                        }

                        if (request.path == "/ops/api/channels/bulk") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method != "POST") {
                                return JsonResponse(405,
                                                    "Method Not Allowed",
                                                    "{\"error\":\"method not allowed\"}");
                            }
                            if (const auto auth_response = require_source_write_principal();
                                auth_response.has_value()) {
                                return *auth_response;
                            }
                            HttpResponse ok = JsonResponse(200, "OK", OpsChannelBulkJson(request.body));
                            ok.headers["Cache-Control"] = "no-store";
                            return ok;
                        }

                        if (request.path.rfind("/ops/api/sources/", 0) == 0) {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            const std::string source_id =
                                UrlDecode(request.path.substr(std::string("/ops/api/sources/").size()));
                            if (request.method == "PUT") {
                                if (const auto auth_response = require_source_write_principal();
                                    auth_response.has_value()) {
                                    return *auth_response;
                                }
                                return RegistryHttpResponse(
                                    SourceViewRegistry::Instance().UpsertSource(source_id, request.body));
                            }
                            if (request.method == "DELETE") {
                                if (const auto auth_response = require_source_write_principal();
                                    auth_response.has_value()) {
                                    return *auth_response;
                                }
                                return RegistryHttpResponse(
                                    SourceViewRegistry::Instance().DisableSource(source_id));
                            }
                        }

                        if (request.path == "/ops/api/views") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                return RegistryHttpResponse(SourceViewRegistry::Instance().ViewsJson());
                            }
                            if (request.method == "POST") {
                                if (const auto auth_response = require_source_write_principal();
                                    auth_response.has_value()) {
                                    return *auth_response;
                                }
                                return RegistryHttpResponse(
                                    SourceViewRegistry::Instance().CreateView(request.body));
                            }
                        }

                        if (request.path.rfind("/ops/api/views/", 0) == 0) {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            const std::string view_id =
                                UrlDecode(request.path.substr(std::string("/ops/api/views/").size()));
                            if (request.method == "PUT") {
                                if (const auto auth_response = require_source_write_principal();
                                    auth_response.has_value()) {
                                    return *auth_response;
                                }
                                return RegistryHttpResponse(
                                    SourceViewRegistry::Instance().UpsertView(view_id, request.body));
                            }
                            if (request.method == "DELETE") {
                                if (const auto auth_response = require_source_write_principal();
                                    auth_response.has_value()) {
                                    return *auth_response;
                                }
                                return RegistryHttpResponse(
                                    SourceViewRegistry::Instance().DisableView(view_id));
                            }
                        }

                        if (request.path == "/client/api/views") {
                            if (const auto auth_response = require_client_api_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                return RegistryHttpResponse(SourceViewRegistry::Instance().ClientViewsJson(
                                    principal_result.principal));
                            }
                        }

                        if (request.path.rfind("/client/api/views/", 0) == 0) {
                            if (const auto auth_response = require_client_api_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            const std::string suffix =
                                request.path.substr(std::string("/client/api/views/").size());
                            const std::size_t slash = suffix.find('/');
                            const std::string view_id =
                                UrlDecode(slash == std::string::npos ? suffix : suffix.substr(0, slash));
                            const std::string subresource =
                                slash == std::string::npos ? std::string() : suffix.substr(slash + 1);
                            if (request.method == "POST" && subresource == "webrtc/session") {
                                if (ClientLiveRequestHasSourceOverride(request.body, query)) {
                                    return JsonResponse(400,
                                                        "Bad Request",
                                                        "{\"error\":\"client live accepts viewId only; source override is not allowed\"}");
                                }
                                SourceViewRegistry::ClientViewAccess access;
                                const auto access_result =
                                    SourceViewRegistry::Instance().ResolveClientViewAccess(
                                        view_id,
                                        principal_result.principal,
                                        "view:read",
                                        &access);
                                if (access_result.status != 200) {
                                    return RegistryHttpResponse(access_result);
                                }
                                const std::string overlay_mode =
                                    ParseStringField(request.body, "overlayMode")
                                        .value_or(ParseStringField(request.body, "mode")
                                                      .value_or(query.count("overlayMode") != 0
                                                                    ? query.at("overlayMode")
                                                                    : (query.count("mode") != 0 ? query.at("mode")
                                                                                                : "")));
                                const std::string rule_id =
                                    ParseStringField(request.body, "ruleId")
                                        .value_or(query.count("ruleId") != 0 ? query.at("ruleId") : "");
                                std::unordered_map<std::string, std::string> session_query;
                                std::string error_message;
	                                if (!BuildClientLiveWebRtcQuery(access,
	                                                                overlay_mode,
	                                                                rule_id,
	                                                                &session_query,
	                                                                &error_message)) {
	                                    return JsonResponse(400,
	                                                        "Bad Request",
	                                                        "{\"error\":\"" + JsonEscape(error_message) + "\"}");
	                                }
	                                const int client_view_max_tiles = std::max(1, access.view.max_tiles);
	                                const auto active_client_view_sessions_locked = [&]() {
	                                    std::size_t count = 0;
	                                    for (auto it = impl_->client_sessions.begin();
	                                         it != impl_->client_sessions.end();) {
	                                        if (impl_->sessions.find(it->second.session_id) ==
	                                            impl_->sessions.end()) {
	                                            it = impl_->client_sessions.erase(it);
	                                            continue;
	                                        }
	                                        if (it->second.view_id == view_id &&
	                                            SameSessionOwner(it->second.owner_principal,
	                                                             principal_result.principal)) {
	                                            ++count;
	                                        }
	                                        ++it;
	                                    }
	                                    return count;
	                                };
	                                {
	                                    std::lock_guard lock(impl_->mu);
	                                    if (active_client_view_sessions_locked() >=
	                                        static_cast<std::size_t>(client_view_max_tiles)) {
	                                        return JsonResponse(
	                                            409,
	                                            "Conflict",
	                                            "{\"error\":\"PublishedView maxTiles limit reached\"}");
	                                    }
	                                }
	                                CreatedWebRtcSession created_session;
	                                HttpResponse created_response =
	                                    create_webrtc_session_response(
	                                        std::move(session_query), "client-live-internal", &created_session);
                                if (created_response.status != 200) {
                                    return created_response;
                                }
                                std::string client_session_error;
                                const auto client_session_id =
                                    GeneratePrefixedRandomId("client-live", &client_session_error);
                                if (!client_session_id.has_value()) {
                                    (void)close_webrtc_session(created_session.session_id);
                                    return JsonResponse(
                                        503,
                                        "Service Unavailable",
                                        "{\"error\":\"" + JsonEscape(client_session_error) + "\"}");
	                                }
	                                bool client_session_inserted = false;
	                                bool client_session_limit_reached = false;
	                                {
	                                    std::lock_guard lock(impl_->mu);
	                                    if (active_client_view_sessions_locked() >=
	                                        static_cast<std::size_t>(client_view_max_tiles)) {
	                                        client_session_limit_reached = true;
	                                    } else {
	                                        const auto [_, inserted] = impl_->client_sessions.emplace(
	                                            *client_session_id,
	                                            Impl::ClientSessionEntry{
	                                                .client_session_id = *client_session_id,
	                                                .view_id = view_id,
	                                                .session_id = created_session.session_id,
	                                                .owner_principal = principal_result.principal,
	                                            });
	                                        client_session_inserted = inserted;
	                                    }
	                                }
	                                if (client_session_limit_reached) {
	                                    (void)close_webrtc_session(created_session.session_id);
	                                    return JsonResponse(
	                                        409,
	                                        "Conflict",
	                                        "{\"error\":\"PublishedView maxTiles limit reached\"}");
	                                }
	                                if (!client_session_inserted) {
	                                    (void)close_webrtc_session(created_session.session_id);
	                                    return JsonResponse(
                                        503,
                                        "Service Unavailable",
                                        "{\"error\":\"failed to allocate client session\"}");
                                }
                                return JsonResponse(
                                    200,
                                    "OK",
                                    ClientSessionJson(*client_session_id, created_session.offer));
                            }
                            const std::string client_session_prefix = "webrtc/session/";
                            if (subresource.rfind(client_session_prefix, 0) == 0) {
                                const std::string rest = subresource.substr(client_session_prefix.size());
                                const std::size_t session_slash = rest.find('/');
                                const std::string client_session_id = UrlDecode(
                                    session_slash == std::string::npos ? rest : rest.substr(0, session_slash));
                                const std::string session_suffix =
                                    session_slash == std::string::npos ? std::string() : rest.substr(session_slash);
                                Impl::ClientSessionEntry client_session;
                                Impl::SessionEntry session_entry;
                                {
                                    std::lock_guard lock(impl_->mu);
                                    const auto client_it = impl_->client_sessions.find(client_session_id);
                                    if (client_it == impl_->client_sessions.end() ||
                                        client_it->second.view_id != view_id) {
                                        return JsonResponse(
                                            404,
                                            "Not Found",
                                            "{\"error\":\"unknown client WebRTC session\"}");
                                    }
                                    client_session = client_it->second;
                                    const auto session_it =
                                        impl_->sessions.find(client_session.session_id);
                                    if (session_it == impl_->sessions.end()) {
                                        impl_->client_sessions.erase(client_it);
                                        return JsonResponse(
                                            404,
                                            "Not Found",
                                            "{\"error\":\"unknown client WebRTC session\"}");
                                    }
                                    session_entry = session_it->second;
                                }
                                if (!SameSessionOwner(client_session.owner_principal,
                                                      principal_result.principal)) {
                                    return JsonResponse(
                                        403,
                                        "Forbidden",
                                        "{\"error\":\"client WebRTC session owner required\"}");
                                }
                                if (request.method == "POST" && session_suffix == "/answer") {
                                    std::string error_message;
                                    if (!session_entry.bridge->SetRemoteAnswer(
                                            request.body, &error_message)) {
                                        return JsonResponse(
                                            400,
                                            "Bad Request",
                                            "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                                    }
                                    return JsonResponse(200, "OK", "{\"ok\":true}");
                                }
                                if ((request.method == "POST" || request.method == "PATCH") &&
                                    (session_suffix.empty() || session_suffix == "/ice")) {
                                    const auto candidate = ParseStringField(request.body, "candidate");
                                    const auto mline = ParseIntField(request.body, "sdpMLineIndex");
                                    if (!candidate.has_value() || !mline.has_value()) {
                                        return JsonResponse(
                                            400,
                                            "Bad Request",
                                            "{\"error\":\"candidate and sdpMLineIndex are required\"}");
                                    }
                                    session_entry.bridge->AddRemoteIceCandidate(
                                        static_cast<std::uint32_t>(*mline), *candidate);
                                    return JsonResponse(200, "OK", "{\"ok\":true}");
                                }
                                if (request.method == "GET" && session_suffix == "/ice") {
                                    return JsonResponse(
                                        200,
                                        "OK",
                                        IceJson(session_entry.bridge->TakePendingLocalIceCandidates()));
                                }
                                if (request.method == "DELETE" &&
                                    (session_suffix.empty() || session_suffix == "/")) {
                                    if (!close_webrtc_session(client_session.session_id)) {
                                        return JsonResponse(
                                            404,
                                            "Not Found",
                                            "{\"error\":\"unknown client WebRTC session\"}");
                                    }
                                    return JsonResponse(200, "OK", "{\"ok\":true}");
                                }
                                return JsonResponse(
                                    404,
                                    "Not Found",
                                    "{\"error\":\"client WebRTC session resource not found\"}");
                            }
                            if (request.method == "GET") {
                                if (subresource == "dashboard") {
                                    SourceViewRegistry::ClientViewAccess access;
                                    const auto access_result =
                                        SourceViewRegistry::Instance().ResolveClientViewAccess(
                                            view_id,
                                            principal_result.principal,
                                            "dashboard:read",
                                            &access);
                                    if (access_result.status != 200) {
                                        return RegistryHttpResponse(access_result);
                                    }
                                    if (!access.view.show_dashboard) {
                                        return JsonResponse(403,
                                                            "Forbidden",
                                                            "{\"error\":\"dashboard is not enabled for this view\"}");
                                    }
                                    return JsonResponse(
                                        200,
                                        "OK",
                                        ClientViewDashboardJson(
                                            access,
                                            principal_result.principal,
                                            impl_->session_manager.AnalysisTapSnapshots()));
                                }
                                if (subresource == "events") {
                                    SourceViewRegistry::ClientViewAccess access;
                                    const auto access_result =
                                        SourceViewRegistry::Instance().ResolveClientViewAccess(
                                            view_id,
                                            principal_result.principal,
                                            "event:read",
                                            &access);
                                    if (access_result.status != 200) {
                                        return RegistryHttpResponse(access_result);
                                    }
                                    if (!access.view.show_events) {
                                        return JsonResponse(403,
                                                            "Forbidden",
                                                            "{\"error\":\"events are not enabled for this view\"}");
                                    }
                                    const auto event_query = ParseQueryString(request.query);
                                    const int limit = ParseClampedIntQuery(event_query, "limit", 20, 1, 50);
                                    return JsonResponse(200, "OK", ClientViewEventsJson(access, limit));
                                }
                                if (subresource == "metadata") {
                                    SourceViewRegistry::ClientViewAccess access;
                                    const auto access_result =
                                        SourceViewRegistry::Instance().ResolveClientViewAccess(
                                            view_id,
                                            principal_result.principal,
                                            "metadata:read",
                                            &access);
                                    if (access_result.status != 200) {
                                        return RegistryHttpResponse(access_result);
                                    }
                                    if (!access.view.show_metadata_summary) {
                                        return JsonResponse(
                                            403,
                                            "Forbidden",
                                            "{\"error\":\"metadata summary is not enabled for this view\"}");
                                    }
                                    return JsonResponse(
                                        200,
                                        "OK",
                                        ClientViewMetadataJson(
                                            access, impl_->session_manager.AnalysisTapSnapshots()));
                                }
                                if (!subresource.empty()) {
                                    return JsonResponse(404,
                                                        "Not Found",
                                                        "{\"error\":\"client view resource not found\"}");
                                }
                                return RegistryHttpResponse(
                                    SourceViewRegistry::Instance().ClientViewJson(view_id,
                                                                                  principal_result.principal));
                            }
                        }

                        if (request.method == "GET" && IsOpsOverviewShellRoute(request.path)) {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                if (!principal_result.ok && session_auth_mode && config.enable_ops) {
                                    return RedirectResponse("/login");
                                }
                                if (!principal_result.ok) {
                                    return UnauthorizedPageResponse();
                                }
                                if (auth_response->status == 403) {
                                    return ForbiddenPageResponse("운영 콘솔은 admin/operator role과 ops:read scope가 필요합니다.");
                                }
                                return *auth_response;
                            }
                            return HtmlPageResponse(OpsShellPageHtml(config,
                                                                     principal_result.principal,
                                                                     OpsOverviewActiveForPath(request.path)));
                        }

                        if (request.method == "GET" && IsClientShellRoute(request.path)) {
                            if (const auto auth_response = require_client_shell_principal(); auth_response.has_value()) {
                                if (!principal_result.ok && session_auth_mode && config.enable_client) {
                                    return RedirectResponse("/login");
                                }
                                if (!principal_result.ok) {
                                    return UnauthorizedPageResponse();
                                }
                                if (auth_response->status == 403) {
                                    return ForbiddenPageResponse("클라이언트 포털은 viewer/operator/admin 계정만 접근할 수 있습니다.");
                                }
                                return *auth_response;
                            }
                            return HtmlPageResponse(ClientShellPageHtml(
                                principal_result.principal, ClientShellActiveForPath(request.path)));
                        }

                        if (request.method == "GET" && request.path == "/favicon.ico") {
                            HttpResponse no_content;
                            no_content.status = 204;
                            no_content.status_text = "No Content";
                            no_content.content_type = "image/x-icon";
                            return no_content;
                        }

                        if (request.method == "GET" && request.path == "/webrtc/test") {
                            return HttpResponse{404, "Not Found", "text/plain; charset=utf-8", {}, "not found"};
                        }

                        if (request.method == "GET" && request.path == "/webrtc/config") {
                            HttpResponse ok = JsonResponse(200, "OK", WebRtcBrowserConfigJson());
                            ok.headers["Cache-Control"] = "no-store";
                            return ok;
                        }

                        if (request.method == "GET" && request.path == "/lab") {
                            return HttpResponse{404, "Not Found", "text/plain; charset=utf-8", {}, "not found"};
                        }

                        if (request.method == "GET" && request.path == "/lab/rules") {
                            return HttpResponse{404, "Not Found", "text/plain; charset=utf-8", {}, "not found"};
                        }

                        if (request.method == "GET" && request.path == "/lab/import") {
                            return HttpResponse{404, "Not Found", "text/plain; charset=utf-8", {}, "not found"};
                        }

                        if (request.path == "/lab" || request.path.rfind("/lab/", 0) == 0) {
                            if (const auto auth_response = require_lab_principal(); auth_response.has_value()) {
                                if (!principal_result.ok && session_auth_mode && config.enable_lab) {
                                    return RedirectResponse("/login");
                                }
                                const bool lab_page_get =
                                    request.method == "GET" &&
                                    false;
                                if (lab_page_get && !principal_result.ok) {
                                    return UnauthorizedPageResponse();
                                }
                                if (lab_page_get && auth_response->status == 403) {
                                    return ForbiddenPageResponse("Lab은 admin/operator 또는 lab:read scope가 필요합니다.");
                                }
                                return *auth_response;
                            }
                        }

                        if (request.method == "GET" && request.path == "/lab/files") {
                            return JsonResponse(200, "OK", LabFilesJson());
                        }

                        if (request.method == "GET" && request.path == "/lab/reports") {
                            return JsonResponse(200, "OK", LabReportsJson());
                        }

                        if (request.method == "GET" && request.path == "/lab/reports/content") {
                            std::string response_body;
                            std::string error_message;
                            const auto path_it = query.find("path");
                            if (path_it == query.end()) {
                                error_message = "report path is required";
                            }
                            if (path_it == query.end() ||
                                !BuildLabReportContentJson(path_it->second, &response_body, &error_message)) {
                                return JsonResponse(400,
                                                    "Bad Request",
                                                    "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                            }
                            return JsonResponse(200, "OK", response_body);
                        }

                        if (request.method == "GET" && request.path == "/lab/analysis/events/evidence/bundle") {
                            std::string zip_body;
                            std::string download_name;
                            std::string error_message;
                            if (!BuildEventEvidenceBundleZip(query,
                                                             &zip_body,
                                                             &download_name,
                                                             &error_message)) {
                                return JsonResponse(400,
                                                    "Bad Request",
                                                    "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                            }
                            const std::string event_id =
                                Trim(query.find("eventId") == query.end() ? "" : query.at("eventId"));
                            const std::string audit_body =
                                "{\"area\":\"events\",\"action\":\"export-bundle\",\"target\":\"event:" +
                                JsonEscape(event_id.empty() ? download_name : event_id) +
                                "\",\"summary\":\"evidence zip bundle downloaded\",\"before\":null,\"after\":{\"file\":\"" +
                                JsonEscape(download_name) + "\"}}";
                            std::string audit_error;
                            (void)AppendOpsAuditRecord(config,
                                                       OpsAuditRecordJson(audit_body, principal_result.principal),
                                                       &audit_error);
                            HttpResponse ok;
                            ok.status = 200;
                            ok.status_text = "OK";
                            ok.content_type = "application/zip";
                            ok.headers["Cache-Control"] = "no-store";
                            ok.headers["Content-Disposition"] =
                                "attachment; filename=\"" + JsonEscape(download_name) + "\"";
                            ok.body = std::move(zip_body);
                            return ok;
                        }

                        if (request.method == "GET" && request.path == "/lab/analysis/events/evidence") {
                            const auto path_it = query.find("path");
                            if (path_it == query.end() || Trim(path_it->second).empty()) {
                                return JsonResponse(400,
                                                    "Bad Request",
                                                    "{\"error\":\"evidence path is required\"}");
                            }
                            std::filesystem::path resolved;
                            std::string content_type;
                            if (!IsSafeEventEvidencePath(std::filesystem::path(path_it->second),
                                                         &resolved,
                                                         &content_type)) {
                                return JsonResponse(400,
                                                    "Bad Request",
                                                    "{\"error\":\"invalid event evidence path\"}");
                            }
                            std::ifstream input(resolved, std::ios::in | std::ios::binary);
                            if (!input.good()) {
                                return JsonResponse(500,
                                                    "Internal Server Error",
                                                    "{\"error\":\"failed to open event evidence file\"}");
                            }
                            std::ostringstream body;
                            body << input.rdbuf();
                            HttpResponse ok;
                            ok.status = 200;
                            ok.status_text = "OK";
                            ok.content_type = content_type;
                            ok.headers["Cache-Control"] = "no-store";
                            if (const auto download_it = query.find("download");
                                download_it != query.end() && Trim(download_it->second) == "1") {
                                ok.headers["Content-Disposition"] =
                                    "attachment; filename=\"" + JsonEscape(resolved.filename().string()) + "\"";
                            }
                            ok.body = body.str();
                            return ok;
                        }

	                        if (request.method == "GET" && request.path == "/lab/runtime/status") {
	                            return JsonResponse(200,
	                                                "OK",
	                                                runtime_status_body());
	                        }

                        if (request.method == "GET" && request.path == "/lab/analysis/capabilities") {
                            return JsonResponse(200, "OK", AnalysisCapabilitiesJson());
                        }

                        if (request.method == "GET" && request.path == "/lab/analysis/event-post/status") {
                            return JsonResponse(200, "OK", AnalysisEventPostStatusJson());
                        }

                        if (request.method == "GET" && request.path == "/lab/analysis/event-storage/status") {
                            return JsonResponse(200, "OK", AnalysisEventStorageStatusJson());
                        }

                        if (request.method == "GET" && request.path == "/lab/analysis/events/records") {
                            analysis::EventRecordQueryOptions options;
                            std::string error_message;
                            if (!BuildEventRecordQueryOptions(query, &options, &error_message)) {
                                return JsonResponse(400,
                                                    "Bad Request",
                                                    "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                            }
                            analysis::EventRecordQueryResult result;
                            if (!analysis::QueryEventRecords(options, &result, &error_message)) {
                                return JsonResponse(500,
                                                    "Internal Server Error",
                                                    "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                            }
                            return JsonResponse(200, "OK", AnalysisEventRecordsJson(result));
                        }

                        if (request.method == "POST" &&
                            request.path == "/lab/analysis/events/records/compact") {
                            if (const auto auth_response = require_rule_write_principal();
                                auth_response.has_value()) {
                                return *auth_response;
                            }
                            analysis::EventRecordQueryOptions options;
                            std::string error_message;
                            if (!BuildEventRecordQueryOptions(query, &options, &error_message)) {
                                return JsonResponse(400,
                                                    "Bad Request",
                                                    "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                            }
                            analysis::EventRecordCompactionResult result;
                            if (!analysis::CompactEventRecords(options, &result, &error_message)) {
                                return JsonResponse(500,
                                                    "Internal Server Error",
                                                    "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                            }
                            return JsonResponse(200, "OK", AnalysisEventRecordCompactionJson(result));
                        }

                        if (request.method == "GET" &&
                            request.path == "/lab/analysis/events/records/compactions") {
                            analysis::EventRecordCompactedFileListResult result;
                            std::string error_message;
                            if (!analysis::ListCompactedEventRecordFiles(&result, &error_message)) {
                                return JsonResponse(500,
                                                    "Internal Server Error",
                                                    "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                            }
                            return JsonResponse(200, "OK", AnalysisEventRecordCompactedFilesJson(result));
                        }

                        if (request.method == "POST" &&
                            request.path == "/lab/analysis/events/records/compactions/cleanup") {
                            if (const auto auth_response = require_rule_write_principal();
                                auth_response.has_value()) {
                                return *auth_response;
                            }
                            std::size_t keep_newest = 10;
                            if (const auto it = query.find("keepNewest");
                                it != query.end() && !Trim(it->second).empty()) {
                                std::uint64_t parsed = 0;
                                if (!ParseStrictUint64(Trim(it->second), &parsed)) {
                                    return JsonResponse(400,
                                                        "Bad Request",
                                                        "{\"error\":\"keepNewest must be a non-negative integer\"}");
                                }
                                keep_newest = static_cast<std::size_t>(parsed);
                            }
                            analysis::EventRecordCompactedFileCleanupResult result;
                            std::string error_message;
                            if (!analysis::CleanupCompactedEventRecordFiles(keep_newest,
                                                                           &result,
                                                                           &error_message)) {
                                return JsonResponse(500,
                                                    "Internal Server Error",
                                                    "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                            }
                            return JsonResponse(200,
                                                "OK",
                                                AnalysisEventRecordCompactedFileCleanupJson(result));
                        }

                        const auto compacted_record_prefix =
                            std::string("/lab/analysis/events/records/compactions/");
                        if (request.path.rfind(compacted_record_prefix, 0) == 0) {
                            const std::string file_name =
                                UrlDecode(request.path.substr(compacted_record_prefix.size()));
                            if (file_name.empty()) {
                                return JsonResponse(400,
                                                    "Bad Request",
                                                    "{\"error\":\"compacted file name is required\"}");
                            }
                            if (request.method == "GET") {
                                analysis::EventRecordCompactedFileInfo file;
                                std::string error_message;
                                if (!analysis::ResolveCompactedEventRecordFile(file_name, &file, &error_message)) {
                                    return JsonResponse(404,
                                                        "Not Found",
                                                        "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                                }
                                std::ifstream input(file.path, std::ios::in | std::ios::binary);
                                if (!input.good()) {
                                    return JsonResponse(500,
                                                        "Internal Server Error",
                                                        "{\"error\":\"failed to open compacted event record file\"}");
                                }
                                std::ostringstream body;
                                body << input.rdbuf();
                                HttpResponse ok;
                                ok.status = 200;
                                ok.status_text = "OK";
                                ok.content_type = "application/x-ndjson; charset=utf-8";
                                ok.headers["Cache-Control"] = "no-store";
                                ok.headers["Content-Disposition"] =
                                    "attachment; filename=\"" + JsonEscape(file.file_name) + "\"";
                                ok.body = body.str();
                                return ok;
                            }
                            if (request.method == "DELETE") {
                                if (const auto auth_response = require_rule_write_principal();
                                    auth_response.has_value()) {
                                    return *auth_response;
                                }
                                analysis::EventRecordCompactedFileInfo file;
                                std::string error_message;
                                if (!analysis::DeleteCompactedEventRecordFile(file_name, &file, &error_message)) {
                                    return JsonResponse(404,
                                                        "Not Found",
                                                        "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                                }
                                return JsonResponse(200,
                                                    "OK",
                                                    AnalysisEventRecordCompactedFileDeletedJson(file));
                            }
                        }

                        if (request.method == "GET" && request.path == "/lab/analysis/profiles") {
                            return JsonResponse(200, "OK", AnalysisProfilesJson());
                        }

                        if (request.method == "POST" && request.path == "/lab/analysis/profiles") {
                            if (const auto auth_response = require_rule_write_principal();
                                auth_response.has_value()) {
                                return *auth_response;
                            }
                            std::string response_body;
                            std::string error_message;
                            if (!AnalysisRegistry().CreateProfile(request.body, &response_body, &error_message)) {
                                return JsonResponse(400, "Bad Request",
                                                    "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                            }
                            return JsonResponse(201, "Created", response_body);
                        }

                        if (request.method == "GET" && request.path == "/lab/analysis/rules") {
                            return JsonResponse(200, "OK", AnalysisRulesJson());
                        }

                        if (request.method == "POST" && request.path == "/lab/analysis/rules") {
                            if (const auto auth_response = require_rule_write_principal();
                                auth_response.has_value()) {
                                return *auth_response;
                            }
                            std::string response_body;
                            std::string error_message;
                            if (!AnalysisRegistry().CreateRule(request.body, &response_body, &error_message)) {
                                return JsonResponse(400, "Bad Request",
                                                    "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                            }
                            return JsonResponse(201, "Created", response_body);
                        }

                        if (request.method == "GET" && request.path == "/lab/analysis/va-rules") {
                            return JsonResponse(200, "OK", AnalysisVaRulesJson());
                        }

                        if (request.method == "POST" && request.path == "/lab/analysis/va-rules") {
                            if (const auto auth_response = require_rule_write_principal();
                                auth_response.has_value()) {
                                return *auth_response;
                            }
                            std::string response_body;
                            std::string error_message;
                            if (!AnalysisRegistry().CreateVaRule(request.body, &response_body, &error_message)) {
                                return JsonResponse(400, "Bad Request",
                                                    "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                            }
                            return JsonResponse(201, "Created", response_body);
                        }

                        const auto analysis_profile_prefix = std::string("/lab/analysis/profiles/");
                        if (request.path.rfind(analysis_profile_prefix, 0) == 0) {
                            const std::string id = UrlDecode(request.path.substr(analysis_profile_prefix.size()));
                            if (id.empty()) {
                                return JsonResponse(400, "Bad Request",
                                                    "{\"error\":\"profile id is required\"}");
                            }
                            if (request.method == "GET") {
                                const auto profile = AnalysisRegistry().ProfileJson(id);
                                if (!profile.has_value()) {
                                    return JsonResponse(404, "Not Found",
                                                        "{\"error\":\"analysis profile not found\"}");
                                }
                                return JsonResponse(200, "OK",
                                                    "{\"profile\":" + *profile + "}");
                            }
                            if (request.method == "PUT") {
                                if (const auto auth_response = require_rule_write_principal();
                                    auth_response.has_value()) {
                                    return *auth_response;
                                }
                                std::string response_body;
                                std::string error_message;
                                if (!AnalysisRegistry().UpsertProfile(id, request.body, &response_body, &error_message)) {
                                    return JsonResponse(400, "Bad Request",
                                                        "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                                }
                                return JsonResponse(200, "OK", response_body);
                            }
                            if (request.method == "DELETE") {
                                if (const auto auth_response = require_rule_write_principal();
                                    auth_response.has_value()) {
                                    return *auth_response;
                                }
                                if (!AnalysisRegistry().DeleteProfile(id)) {
                                    return JsonResponse(404, "Not Found",
                                                        "{\"error\":\"analysis profile not found or built-in\"}");
                                }
                                return JsonResponse(200, "OK",
                                                    "{\"ok\":true,\"deleted\":\"" + JsonEscape(id) + "\"}");
                            }
                        }

                        const auto analysis_rule_prefix = std::string("/lab/analysis/rules/");
                        if (request.path.rfind(analysis_rule_prefix, 0) == 0) {
                            const std::string id = UrlDecode(request.path.substr(analysis_rule_prefix.size()));
                            if (id.empty()) {
                                return JsonResponse(400, "Bad Request",
                                                    "{\"error\":\"rule id is required\"}");
                            }
                            if (request.method == "GET") {
                                const auto rule = AnalysisRegistry().RuleJson(id);
                                if (!rule.has_value()) {
                                    return JsonResponse(404, "Not Found",
                                                        "{\"error\":\"analysis rule not found\"}");
                                }
                                return JsonResponse(200, "OK",
                                                    "{\"rule\":" + *rule + "}");
                            }
                            if (request.method == "PUT") {
                                if (const auto auth_response = require_rule_write_principal();
                                    auth_response.has_value()) {
                                    return *auth_response;
                                }
                                std::string response_body;
                                std::string error_message;
                                if (!AnalysisRegistry().UpsertRule(id, request.body, &response_body, &error_message)) {
                                    return JsonResponse(400, "Bad Request",
                                                        "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                                }
                                return JsonResponse(200, "OK", response_body);
                            }
                            if (request.method == "DELETE") {
                                if (const auto auth_response = require_rule_write_principal();
                                    auth_response.has_value()) {
                                    return *auth_response;
                                }
                                if (!AnalysisRegistry().DeleteRule(id)) {
                                    return JsonResponse(404, "Not Found",
                                                        "{\"error\":\"analysis rule not found\"}");
                                }
                                return JsonResponse(200, "OK",
                                                    "{\"ok\":true,\"deleted\":\"" + JsonEscape(id) + "\"}");
                            }
                        }

                        const auto analysis_va_rule_prefix = std::string("/lab/analysis/va-rules/");
                        if (request.path.rfind(analysis_va_rule_prefix, 0) == 0) {
                            const std::string id = UrlDecode(request.path.substr(analysis_va_rule_prefix.size()));
                            if (id.empty()) {
                                return JsonResponse(400, "Bad Request",
                                                    "{\"error\":\"vaRule id is required\"}");
                            }
                            if (request.method == "GET") {
                                const auto rule = AnalysisRegistry().VaRuleJson(id);
                                if (!rule.has_value()) {
                                    return JsonResponse(404, "Not Found",
                                                        "{\"error\":\"vaRule not found\"}");
                                }
                                return JsonResponse(200, "OK",
                                                    "{\"vaRule\":" + *rule + "}");
                            }
                            if (request.method == "PUT") {
                                if (const auto auth_response = require_rule_write_principal();
                                    auth_response.has_value()) {
                                    return *auth_response;
                                }
                                std::string response_body;
                                std::string error_message;
                                if (!AnalysisRegistry().UpsertVaRule(id, request.body, &response_body, &error_message)) {
                                    return JsonResponse(400, "Bad Request",
                                                        "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                                }
                                return JsonResponse(200, "OK", response_body);
                            }
                            if (request.method == "DELETE") {
                                if (const auto auth_response = require_rule_write_principal();
                                    auth_response.has_value()) {
                                    return *auth_response;
                                }
                                if (!AnalysisRegistry().DeleteVaRule(id)) {
                                    return JsonResponse(404, "Not Found",
                                                        "{\"error\":\"vaRule not found\"}");
                                }
                                return JsonResponse(200, "OK",
                                                    "{\"ok\":true,\"deleted\":\"" + JsonEscape(id) + "\"}");
                            }
                        }

                        const auto analysis_image_prefix = std::string("/lab/analysis/image");
                        if (request.path == analysis_image_prefix ||
                            request.path.rfind(analysis_image_prefix + "/", 0) == 0) {
                            if (request.method != "GET") {
                                return JsonResponse(405, "Method Not Allowed",
                                                    "{\"error\":\"method not allowed\"}");
                            }
                            const std::string suffix = request.path.size() == analysis_image_prefix.size()
                                                           ? std::string()
                                                           : request.path.substr(analysis_image_prefix.size());

                            StaticImageAnalysis image_analysis;
                            std::string error_message;
                            if (!AnalyzeStaticImage(query, &image_analysis, &error_message)) {
                                return JsonResponse(400,
                                                    "Bad Request",
                                                    "{\"error\":\"" +
                                                        JsonEscape(error_message.empty()
                                                                       ? "failed to analyze image"
                                                                       : error_message) +
                                                        "\"}");
                            }

                            if (suffix.empty() || suffix == "/metadata") {
                                return JsonResponse(200, "OK", StaticImageAnalysisJson(image_analysis));
                            }

                            if (suffix == "/snapshot" || suffix == "/snapshot.jpg") {
                                const int quality = ParseClampedIntQuery(query, "quality", 85, 1, 100);
                                analysis::EncodedImage image;
                                if (!analysis::EncodeJpeg(image_analysis.frame, quality, &image, &error_message)) {
                                    return HttpResponse{500,
                                                        "Internal Server Error",
                                                        "text/plain; charset=utf-8",
                                                        {},
                                                        error_message.empty() ? "failed to encode image snapshot"
                                                                              : error_message};
                                }
                                HttpResponse ok;
                                ok.content_type = image.content_type;
                                ok.headers["Cache-Control"] = "no-store";
                                ok.body.assign(reinterpret_cast<const char*>(image.data.data()), image.data.size());
                                return ok;
                            }

                            if (suffix == "/overlay" || suffix == "/overlay.jpg") {
                                analysis::RawVideoFrame overlay_frame;
                                analysis::OverlayRenderOptions options = BuildOverlayRenderOptionsFromQuery(query);
                                if (!analysis::RenderDetectionOverlay(
                                        image_analysis.frame, image_analysis.result, options, &overlay_frame, &error_message)) {
                                    return HttpResponse{500,
                                                        "Internal Server Error",
                                                        "text/plain; charset=utf-8",
                                                        {},
                                                        error_message.empty() ? "failed to render image overlay"
                                                                              : error_message};
                                }

                                const int quality = ParseClampedIntQuery(query, "quality", 85, 1, 100);
                                analysis::EncodedImage image;
                                if (!analysis::EncodeJpeg(overlay_frame, quality, &image, &error_message)) {
                                    return HttpResponse{500,
                                                        "Internal Server Error",
                                                        "text/plain; charset=utf-8",
                                                        {},
                                                        error_message.empty() ? "failed to encode image overlay"
                                                                              : error_message};
                                }
                                HttpResponse ok;
                                ok.content_type = image.content_type;
                                ok.headers["Cache-Control"] = "no-store";
                                ok.body.assign(reinterpret_cast<const char*>(image.data.data()), image.data.size());
                                return ok;
                            }

                            return JsonResponse(404, "Not Found",
                                                "{\"error\":\"analysis image endpoint not found\"}");
                        }

                        if (request.path == "/ws/va-metadata") {
                            if (const auto auth_response = require_lab_principal();
                                auth_response.has_value()) {
                                return *auth_response;
                            }
                            std::string websocket_key;
                            std::string websocket_error;
                            if (!ValidateWebSocketUpgrade(request, &websocket_key, &websocket_error)) {
                                return JsonResponse(400,
                                                    "Bad Request",
                                                    "{\"error\":\"" + JsonEscape(websocket_error) + "\"}");
                            }
                            if (const auto tap_it = query.find("tapId");
                                tap_it != query.end() && !tap_it->second.empty()) {
                                const std::string tap_id = tap_it->second;
                                const auto snapshot = impl_->session_manager.AnalysisTapSnapshot(tap_id);
                                if (!snapshot.has_value()) {
                                    return JsonResponse(404,
                                                        "Not Found",
                                                        "{\"error\":\"analysis tap not found\"}");
                                }
                                return stream_metadata_websocket_response(tap_id, false, websocket_key);
                            }
                            if (!QueryHasAny(query, {"vaRule", "vaRuleId", "file", "url", "source"})) {
                                return JsonResponse(400,
                                                    "Bad Request",
                                                    "{\"error\":\"tapId, vaRule, or source query is required\"}");
                            }
                            const std::string tap_client_id =
                                "analysis-ws-" + std::to_string(impl_->next_session_id.fetch_add(1));
                            media::IngressRequest ingress_request =
                                BuildHttpIngressRequest(route_path, query, tap_client_id);
                            std::string va_rule_error;
                            if (!ApplyVideoAnalysisRuleToRequest(&ingress_request, &va_rule_error)) {
                                return JsonResponse(400,
                                                    "Bad Request",
                                                    "{\"error\":\"" + JsonEscape(va_rule_error) + "\"}");
                            }
                            ingress_request.query["va"] = "1";
                            auto result = impl_->session_manager.AttachAnalysisTap(
                                ingress_request, BuildAnalysisProfileFromQuery(ingress_request.query));
                            if (!result.ok) {
                                return JsonResponse(400,
                                                    "Bad Request",
                                                    "{\"error\":\"" + JsonEscape(result.message) + "\"}");
                            }
                            return stream_metadata_websocket_response(result.tap_id, true, websocket_key);
                        }

                        if (request.method == "GET" && request.path == "/lab/analysis/metadata/stream") {
                            if (!QueryHasAny(query, {"vaRule", "vaRuleId", "file", "url", "source"})) {
                                return JsonResponse(400,
                                                    "Bad Request",
                                                    "{\"error\":\"vaRule or source query is required\"}");
                            }
                            const std::string tap_client_id =
                                "analysis-sse-" + std::to_string(impl_->next_session_id.fetch_add(1));
                            media::IngressRequest ingress_request =
                                BuildHttpIngressRequest(route_path, query, tap_client_id);
                            std::string va_rule_error;
                            if (!ApplyVideoAnalysisRuleToRequest(&ingress_request, &va_rule_error)) {
                                return JsonResponse(400,
                                                    "Bad Request",
                                                    "{\"error\":\"" + JsonEscape(va_rule_error) + "\"}");
                            }
                            ingress_request.query["va"] = "1";
                            auto result = impl_->session_manager.AttachAnalysisTap(
                                ingress_request, BuildAnalysisProfileFromQuery(ingress_request.query));
                            if (!result.ok) {
                                return JsonResponse(400,
                                                    "Bad Request",
                                                    "{\"error\":\"" + JsonEscape(result.message) + "\"}");
                            }
                            return stream_metadata_sse_response(result.tap_id, true);
                        }

                        if (request.path == "/lab/analysis/taps") {
                            if (request.method == "GET") {
                                return JsonResponse(200, "OK",
                                                    AnalysisTapListJson(impl_->session_manager.AnalysisTapSnapshots()));
                            }

                            if (request.method == "POST") {
                                const std::string tap_client_id =
                                    "analysis-http-" + std::to_string(impl_->next_session_id.fetch_add(1));
                                media::IngressRequest ingress_request =
                                    BuildHttpIngressRequest(route_path, query, tap_client_id);
                                std::string va_rule_error;
                                if (!ApplyVideoAnalysisRuleToRequest(&ingress_request, &va_rule_error)) {
                                    return JsonResponse(400, "Bad Request",
                                                        "{\"error\":\"" + JsonEscape(va_rule_error) + "\"}");
                                }
                                auto result = impl_->session_manager.AttachAnalysisTap(
                                    ingress_request, BuildAnalysisProfileFromQuery(ingress_request.query));
                                if (!result.ok) {
                                    return JsonResponse(400, "Bad Request",
                                                        "{\"error\":\"" + JsonEscape(result.message) + "\"}");
                                }
                                return JsonResponse(
                                    200,
                                    "OK",
                                    AnalysisTapCreatedJson(result, impl_->session_manager.ActiveAnalysisTapCount()));
                            }
                        }

                        const auto analysis_tap_prefix = std::string("/lab/analysis/taps/");
                        if (request.path.rfind(analysis_tap_prefix, 0) == 0) {
                            const std::string rest = request.path.substr(analysis_tap_prefix.size());
                            const std::size_t slash = rest.find('/');
                            const std::string tap_id = slash == std::string::npos ? rest : rest.substr(0, slash);
                            const std::string suffix = slash == std::string::npos ? std::string() : rest.substr(slash);
                            if (tap_id.empty()) {
                                return JsonResponse(400, "Bad Request",
                                                    "{\"error\":\"tap id is required\"}");
                            }

                            if (request.method == "GET" && suffix.empty()) {
                                const auto snapshot = impl_->session_manager.AnalysisTapSnapshot(tap_id);
                                if (!snapshot.has_value()) {
                                    return JsonResponse(404, "Not Found",
                                                        "{\"error\":\"analysis tap not found\"}");
                                }
                                return JsonResponse(200, "OK",
                                                    "{\"tap\":" + AnalysisTapSnapshotJson(*snapshot) + "}");
                            }

                            if (request.method == "GET" && suffix == "/metadata/stream") {
                                const auto snapshot = impl_->session_manager.AnalysisTapSnapshot(tap_id);
                                if (!snapshot.has_value()) {
                                    return JsonResponse(404, "Not Found",
                                                        "{\"error\":\"analysis tap not found\"}");
                                }
                                return stream_metadata_sse_response(tap_id, false);
                            }

                            if (request.method == "GET" && suffix == "/metadata") {
                                const auto result = impl_->session_manager.AnalysisTapSnapshot(tap_id);
                                if (!result.has_value()) {
                                    return JsonResponse(404, "Not Found",
                                                        "{\"error\":\"analysis tap not found\"}");
                                }
                                return JsonResponse(200, "OK",
                                                    AnalysisMetadataJson(tap_id, result->latest_result));
                            }

                            if (request.method == "GET" && suffix == "/bbox-diagnostics") {
                                const auto snapshot = impl_->session_manager.AnalysisTapSnapshot(tap_id);
                                if (!snapshot.has_value()) {
                                    return JsonResponse(404, "Not Found",
                                                        "{\"error\":\"analysis tap not found\"}");
                                }
                                std::int64_t requested_pts_ms = 0;
                                const auto pts_it = query.find("ptsMs");
                                if (pts_it == query.end() ||
                                    !ParseStrictInt64(pts_it->second, &requested_pts_ms)) {
                                    return JsonResponse(400,
                                                        "Bad Request",
                                                        "{\"error\":\"ptsMs query is required\"}");
                                }
                                const int tolerance_ms =
                                    ParseClampedIntQuery(query, "toleranceMs", 600, 0, 5000);
                                const std::int64_t requested_pts_ns = requested_pts_ms * 1000000LL;
                                const std::int64_t tolerance_ns = static_cast<std::int64_t>(tolerance_ms) * 1000000LL;
                                const auto result = impl_->session_manager.WaitAnalysisResultNearPts(
                                    tap_id, requested_pts_ns, tolerance_ns, std::chrono::milliseconds(0));
                                return JsonResponse(200,
                                                    "OK",
                                                    AnalysisBboxDiagnosticsJson(tap_id,
                                                                                requested_pts_ms,
                                                                                tolerance_ms,
                                                                                result));
                            }

                            if (request.method == "GET" && (suffix == "/state" || suffix == "/state-dump")) {
                                const auto snapshot = impl_->session_manager.AnalysisTapSnapshot(tap_id);
                                if (!snapshot.has_value()) {
                                    return JsonResponse(404, "Not Found",
                                                        "{\"error\":\"analysis tap not found\"}");
                                }
                                std::optional<analysis::EventRuleEvaluation> evaluation;
                                if (snapshot->latest_result.has_value()) {
                                    auto result = *snapshot->latest_result;
                                    result.debug_state_requested = true;
                                    result.debug_state_log_enabled = false;
                                    evaluation = EvaluateStoredEventRules(
                                        result, EventRuleRuntimeForKey("tap-state-dump:" + tap_id));
                                }
                                return JsonResponse(200,
                                                    "OK",
                                                    AnalysisStateDumpJson(tap_id,
                                                                          *snapshot,
                                                                          evaluation));
                            }

                            if (request.method == "GET" && (suffix == "/metrics" || suffix == "/metrics-dump")) {
                                const auto snapshot = impl_->session_manager.AnalysisTapSnapshot(tap_id);
                                if (!snapshot.has_value()) {
                                    return JsonResponse(404, "Not Found",
                                                        "{\"error\":\"analysis tap not found\"}");
                                }
                                std::optional<analysis::EventRuleEvaluation> evaluation;
                                if (snapshot->latest_result.has_value()) {
                                    auto result = *snapshot->latest_result;
                                    result.metrics_report_requested = true;
                                    evaluation = EvaluateStoredEventRules(
                                        result, EventRuleRuntimeForKey("tap-metrics:" + tap_id));
                                }
                                return JsonResponse(200,
                                                    "OK",
                                                    AnalysisMetricsDumpJson(tap_id,
                                                                            *snapshot,
                                                                            evaluation));
                            }

                            if (request.method == "GET" && suffix == "/events") {
                                const auto snapshot = impl_->session_manager.AnalysisTapSnapshot(tap_id);
                                if (!snapshot.has_value()) {
                                    return JsonResponse(404, "Not Found",
                                                        "{\"error\":\"analysis tap not found\"}");
                                }
                                std::optional<analysis::EventRuleEvaluation> evaluation;
                                if (snapshot->latest_result.has_value()) {
                                    evaluation = EvaluateStoredEventRules(
                                        *snapshot->latest_result, EventRuleRuntimeForKey("tap-events:" + tap_id));
                                    if (ParseBoolQuery(query, "dispatch", false)) {
                                        analysis::DispatchEventRecords(evaluation->annotated_result, evaluation->events);
                                        analysis::DispatchEventPosts(evaluation->annotated_result, evaluation->events);
                                    }
                                }
                                return JsonResponse(200,
                                                    "OK",
                                                    AnalysisEventsJson(tap_id,
                                                                       snapshot->latest_result,
                                                                       evaluation.has_value() ? &*evaluation : nullptr));
                            }

                            if (request.method == "GET" && (suffix == "/snapshot" || suffix == "/snapshot.jpg")) {
                                const auto frame = impl_->session_manager.AnalysisLatestFrame(tap_id);
                                if (!frame.has_value()) {
                                    return HttpResponse{404,
                                                        "Not Found",
                                                        "text/plain; charset=utf-8",
                                                        {},
                                                        "analysis snapshot frame not found"};
                                }
                                const int quality = ParseClampedIntQuery(query, "quality", 85, 1, 100);
                                analysis::EncodedImage image;
                                std::string error_message;
                                if (!analysis::EncodeJpeg(*frame, quality, &image, &error_message)) {
                                    return HttpResponse{500,
                                                        "Internal Server Error",
                                                        "text/plain; charset=utf-8",
                                                        {},
                                                        error_message.empty() ? "failed to encode snapshot" : error_message};
                                }
                                HttpResponse ok;
                                ok.content_type = image.content_type;
                                ok.headers["Cache-Control"] = "no-store";
                                ok.body.assign(reinterpret_cast<const char*>(image.data.data()), image.data.size());
                                return ok;
                            }

                            if (request.method == "GET" && (suffix == "/overlay" || suffix == "/overlay.jpg")) {
                                const auto latest = impl_->session_manager.AnalysisLatestFrameAndResult(tap_id);
                                if (!latest.has_value()) {
                                    return HttpResponse{404,
                                                        "Not Found",
                                                        "text/plain; charset=utf-8",
                                                        {},
                                                        "analysis overlay frame not found"};
                                }
                                if (!latest->result.has_value()) {
                                    return HttpResponse{404,
                                                        "Not Found",
                                                        "text/plain; charset=utf-8",
                                                        {},
                                                        "analysis overlay result not found"};
                                }

                                analysis::RawVideoFrame overlay_frame;
                                analysis::OverlayRenderOptions options = BuildOverlayRenderOptionsFromQuery(query);
                                auto overlay_result = *latest->result;
                                overlay_result.debug_state_requested =
                                    overlay_result.debug_state_requested || options.draw_debug_overlay;
                                overlay_result.debug_state_log_enabled =
                                    overlay_result.debug_state_log_enabled || options.draw_debug_overlay;
                                const auto evaluation = EvaluateStoredEventRules(
                                    overlay_result, EventRuleRuntimeForKey("tap-overlay:" + tap_id));
                                std::string error_message;
                                if (!analysis::RenderDetectionOverlay(
                                        latest->frame, evaluation.annotated_result, options, &overlay_frame, &error_message)) {
                                    return HttpResponse{500,
                                                        "Internal Server Error",
                                                        "text/plain; charset=utf-8",
                                                        {},
                                                        error_message.empty() ? "failed to render analysis overlay" : error_message};
                                }

                                const int quality = ParseClampedIntQuery(query, "quality", 85, 1, 100);
                                analysis::EncodedImage image;
                                if (!analysis::EncodeJpeg(overlay_frame, quality, &image, &error_message)) {
                                    return HttpResponse{500,
                                                        "Internal Server Error",
                                                        "text/plain; charset=utf-8",
                                                        {},
                                                        error_message.empty() ? "failed to encode analysis overlay" : error_message};
                                }
                                HttpResponse ok;
                                ok.content_type = image.content_type;
                                ok.headers["Cache-Control"] = "no-store";
                                ok.body.assign(reinterpret_cast<const char*>(image.data.data()), image.data.size());
                                return ok;
                            }

                            if (request.method == "DELETE" && suffix.empty()) {
                                if (!DetachAnalysisTapAndReleaseRuntimes(impl_->session_manager, tap_id)) {
                                    return JsonResponse(404, "Not Found",
                                                        "{\"error\":\"analysis tap not found\"}");
                                }
                                return JsonResponse(200, "OK",
                                                    "{\"ok\":true,\"activeTaps\":" +
                                                        std::to_string(impl_->session_manager.ActiveAnalysisTapCount()) + "}");
                            }
                        }

                        if (request.method == "POST" && request.path == "/webrtc/session") {
                            if (const auto auth_response = require_generic_media_principal();
                                auth_response.has_value()) {
                                return *auth_response;
                            }
                            return create_webrtc_session_response(query, "webrtc-http", nullptr);
                        }

                        if (request.method == "POST" && request.path == "/whep") {
                            if (const auto auth_response = require_generic_media_principal();
                                auth_response.has_value()) {
                                return *auth_response;
                            }
                            // WHEP: 클라이언트 offer를 먼저 받고 서버가 answer SDP를 반환하는 consume endpoint다.
                            std::string session_secret_error;
                            const auto generated_secrets =
                                GenerateHttpSessionSecrets("whep", &session_secret_error);
                            if (!generated_secrets.has_value()) {
                                return JsonResponse(
                                    503,
                                    "Service Unavailable",
                                    "{\"error\":\"" + JsonEscape(session_secret_error) + "\"}");
                            }
                            const std::string session_id = generated_secrets->session_id;
                            const std::string session_capability = generated_secrets->session_capability;
                            const std::string ingress_client_id = session_id + "-ingress";
                            media::IngressRequest ingress_request = BuildHttpIngressRequest(route_path, query, ingress_client_id);
                            std::string va_rule_error;
                            if (!ApplyVideoAnalysisRuleToRequest(&ingress_request, &va_rule_error)) {
                                return HttpResponse{400, "Bad Request", "text/plain; charset=utf-8", {}, va_rule_error};
                            }
                            auto bridge = std::make_shared<WebRtcEgressSession>();
                            std::string analysis_tap_id;
                            std::string error_message;
                            if (!AttachWebRtcAnalysisOverlay(
                                    impl_->session_manager,
                                    ingress_request,
                                    ingress_request.query,
                                    bridge,
                                    &analysis_tap_id,
                                    &error_message)) {
                                return HttpResponse{400, "Bad Request", "text/plain; charset=utf-8", {}, error_message};
                            }
                            auto create_result = impl_->session_manager.CreateSession(
                                ingress_request,
                                [bridge](const media::Packet& packet) { bridge->HandleSample(packet); });
                            if (!create_result.ok) {
                                if (!analysis_tap_id.empty()) {
                                    DetachAnalysisTapAndReleaseRuntimes(impl_->session_manager, analysis_tap_id);
                                }
                                return HttpResponse{400, "Bad Request", "text/plain; charset=utf-8", {}, create_result.message};
                            }

                            if (!bridge->Start(session_id, create_result.stream, &error_message)) {
                                if (!analysis_tap_id.empty()) {
                                    DetachAnalysisTapAndReleaseRuntimes(impl_->session_manager, analysis_tap_id);
                                }
                                impl_->session_manager.CloseSession(ingress_client_id);
                                return HttpResponse{500, "Internal Server Error", "text/plain; charset=utf-8", {}, error_message};
                            }
                            if (!bridge->SetRemoteOffer(request.body, &error_message)) {
                                bridge->Stop();
                                if (!analysis_tap_id.empty()) {
                                    DetachAnalysisTapAndReleaseRuntimes(impl_->session_manager, analysis_tap_id);
                                }
                                impl_->session_manager.CloseSession(ingress_client_id);
                                return HttpResponse{400, "Bad Request", "text/plain; charset=utf-8", {}, error_message};
                            }

                            std::string answer;
                            if (!bridge->CreateAnswer(&answer, &error_message)) {
                                bridge->Stop();
                                if (!analysis_tap_id.empty()) {
                                    DetachAnalysisTapAndReleaseRuntimes(impl_->session_manager, analysis_tap_id);
                                }
                                impl_->session_manager.CloseSession(ingress_client_id);
                                return HttpResponse{500, "Internal Server Error", "text/plain; charset=utf-8", {}, error_message};
                            }

                            {
                                std::lock_guard lock(impl_->mu);
                                impl_->sessions.emplace(session_id,
                                                        Impl::SessionEntry{
                                                            .session_id = session_id,
                                                            .ingress_client_id = ingress_client_id,
                                                            .analysis_tap_id = analysis_tap_id,
                                                            .session_capability = session_capability,
                                                            .owner_principal = principal_result.principal,
                                                            .request = std::move(ingress_request),
                                                            .bridge = bridge,
                                                        });
                            }

                            HttpResponse created;
                            created.status = 201;
                            created.status_text = "Created";
                            created.content_type = "application/sdp";
                            created.headers["Location"] = "/whep/session/" + session_id;
                            created.headers["X-Session-Capability"] = session_capability;
                            created.body = answer;
                            return created;
                        }

                        if (request.method == "POST" && request.path == "/whip/publish") {
                            if (const auto auth_response = require_generic_media_principal();
                                auth_response.has_value()) {
                                return *auth_response;
                            }
                            // WHIP publish: 브라우저/테스트 publisher를 sourceId로 등록해 source=webrtc 소비가 가능하게 한다.
                            const auto source_id_it = query.find("sourceId");
                            if (source_id_it == query.end() || source_id_it->second.empty()) {
                                return JsonResponse(400, "Bad Request",
                                                    "{\"error\":\"sourceId query parameter is required\"}");
                            }

                            std::string session_secret_error;
                            const auto generated_secrets =
                                GenerateHttpSessionSecrets("whip-publish", &session_secret_error);
                            if (!generated_secrets.has_value()) {
                                return JsonResponse(
                                    503,
                                    "Service Unavailable",
                                    "{\"error\":\"" + JsonEscape(session_secret_error) + "\"}");
                            }
                            const std::string session_id = generated_secrets->session_id;
                            const std::string session_capability = generated_secrets->session_capability;
                            auto bridge = std::make_shared<WebRtcSourceSession>();
                            std::string error_message;
                            if (!bridge->Start(session_id, source_id_it->second, &error_message)) {
                                return JsonResponse(400, "Bad Request",
                                                    "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                            }
                            if (!bridge->SetRemoteOffer(request.body, &error_message)) {
                                bridge->Stop();
                                return JsonResponse(400, "Bad Request",
                                                    "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                            }

                            std::string answer;
                            if (!bridge->CreateAnswer(&answer, &error_message)) {
                                bridge->Stop();
                                return JsonResponse(500, "Internal Server Error",
                                                    "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                            }

                            {
                                std::lock_guard lock(impl_->mu);
                                impl_->source_sessions.emplace(session_id,
                                                               Impl::SourceSessionEntry{
                                                                   .session_id = session_id,
                                                                   .source_id = source_id_it->second,
                                                                   .session_capability = session_capability,
                                                                   .owner_principal = principal_result.principal,
                                                                   .bridge = bridge,
                                                               });
                            }

                            HttpResponse created;
                            created.status = 201;
                            created.status_text = "Created";
                            created.content_type = "application/json; charset=utf-8";
                            created.headers["Location"] = "/whip/publish/session/" + session_id;
                            created.headers["X-Session-Capability"] = session_capability;
                            created.body = SourceJson(session_id, source_id_it->second, answer, session_capability);
                            return created;
                        }

                        const auto prefix = std::string("/webrtc/session/");
                        const auto whep_prefix = std::string("/whep/session/");
                        const auto whip_publish_prefix = std::string("/whip/publish/session/");
                        auto with_session = [&](const std::string& path_prefix) -> std::pair<std::string, std::string> {
                            std::string rest = request.path.substr(path_prefix.size());
                            const std::size_t slash = rest.find('/');
                            if (slash == std::string::npos) {
                                return {rest, ""};
                            }
                            return {rest.substr(0, slash), rest.substr(slash)};
                        };
                        auto require_session_owner =
                            [&](const auth::Principal& owner,
                                const std::string& expected_capability,
                                const std::string& provided_capability) -> std::optional<HttpResponse> {
                            if (config.auth_mode == app::AuthMode::Off) {
                                return std::nullopt;
                            }
                            if (!provided_capability.empty() &&
                                !expected_capability.empty() &&
                                ConstantTimeEquals(provided_capability, expected_capability)) {
                                return std::nullopt;
                            }
                            if (!principal_result.ok) {
                                return AuthErrorResponse(principal_result.error);
                            }
                            if (SameSessionOwner(owner, principal_result.principal)) {
                                return std::nullopt;
                            }
                            return JsonResponse(
                                403,
                                "Forbidden",
                                "{\"error\":\"session owner or session capability required\"}");
                        };

                        if (request.path.rfind(prefix, 0) == 0 || request.path.rfind(whep_prefix, 0) == 0) {
                            const bool is_whep = request.path.rfind(whep_prefix, 0) == 0;
                            const auto parsed = with_session(is_whep ? whep_prefix : prefix);
                            const std::string session_id = parsed.first;
                            const std::string suffix = parsed.second;
                            const std::string provided_capability =
                                RequestSessionCapability(request, query);

                            std::shared_ptr<WebRtcEgressSession> bridge;
                            std::string session_capability;
                            auth::Principal owner_principal;
                            {
                                std::lock_guard lock(impl_->mu);
                                const auto it = impl_->sessions.find(session_id);
                                if (it == impl_->sessions.end()) {
                                    return HttpResponse{404, "Not Found", "text/plain; charset=utf-8", {}, "unknown session"};
                                }
                                bridge = it->second.bridge;
                                session_capability = it->second.session_capability;
                                owner_principal = it->second.owner_principal;
                            }
                            if (const auto auth_response = require_session_owner(
                                    owner_principal, session_capability, provided_capability);
                                auth_response.has_value()) {
                                return *auth_response;
                            }

                            if (request.method == "POST" && suffix == "/answer") {
                                std::string error_message;
                                if (!bridge->SetRemoteAnswer(request.body, &error_message)) {
                                    return JsonResponse(400, "Bad Request",
                                                        "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                                }
                                return JsonResponse(200, "OK", "{\"ok\":true}");
                            }

                            if ((request.method == "POST" || request.method == "PATCH") && (suffix.empty() || suffix == "/ice")) {
                                const auto candidate = ParseStringField(request.body, "candidate");
                                const auto mline = ParseIntField(request.body, "sdpMLineIndex");
                                if (!candidate.has_value() || !mline.has_value()) {
                                    return JsonResponse(400, "Bad Request",
                                                        "{\"error\":\"candidate and sdpMLineIndex are required\"}");
                                }
                                bridge->AddRemoteIceCandidate(static_cast<std::uint32_t>(*mline), *candidate);
                                return JsonResponse(200, "OK", "{\"ok\":true}");
                            }

                            if (request.method == "GET" && suffix == "/ice") {
                                return JsonResponse(200, "OK", IceJson(bridge->TakePendingLocalIceCandidates()));
                            }

                            if (request.method == "DELETE" && (suffix.empty() || suffix == "/")) {
                                if (!close_webrtc_session(session_id)) {
                                    return HttpResponse{
                                        404,
                                        "Not Found",
                                        "text/plain; charset=utf-8",
                                        {},
                                        "unknown session"};
                                }
                                return JsonResponse(200, "OK", "{\"ok\":true}");
                            }
                        }

                        if (request.path.rfind(whip_publish_prefix, 0) == 0) {
                            const auto parsed = with_session(whip_publish_prefix);
                            const std::string session_id = parsed.first;
                            const std::string suffix = parsed.second;
                            const std::string provided_capability =
                                RequestSessionCapability(request, query);

                            std::shared_ptr<WebRtcSourceSession> bridge;
                            std::string session_capability;
                            auth::Principal owner_principal;
                            {
                                std::lock_guard lock(impl_->mu);
                                const auto it = impl_->source_sessions.find(session_id);
                                if (it == impl_->source_sessions.end()) {
                                    return HttpResponse{404, "Not Found", "text/plain; charset=utf-8", {}, "unknown source session"};
                                }
                                bridge = it->second.bridge;
                                session_capability = it->second.session_capability;
                                owner_principal = it->second.owner_principal;
                            }
                            if (const auto auth_response = require_session_owner(
                                    owner_principal, session_capability, provided_capability);
                                auth_response.has_value()) {
                                return *auth_response;
                            }

                            if ((request.method == "POST" || request.method == "PATCH") && (suffix.empty() || suffix == "/ice")) {
                                const auto candidate = ParseStringField(request.body, "candidate");
                                const auto mline = ParseIntField(request.body, "sdpMLineIndex");
                                if (!candidate.has_value() || !mline.has_value()) {
                                    return JsonResponse(400, "Bad Request",
                                                        "{\"error\":\"candidate and sdpMLineIndex are required\"}");
                                }
                                bridge->AddRemoteIceCandidate(static_cast<std::uint32_t>(*mline), *candidate);
                                return JsonResponse(200, "OK", "{\"ok\":true}");
                            }

                            if (request.method == "GET" && suffix == "/ice") {
                                return JsonResponse(200, "OK", IceJson(bridge->TakePendingLocalIceCandidates()));
                            }

                            if (request.method == "DELETE" && (suffix.empty() || suffix == "/")) {
                                bridge->Stop();
                                {
                                    std::lock_guard lock(impl_->mu);
                                    impl_->source_sessions.erase(session_id);
                                }
                                return JsonResponse(200, "OK", "{\"ok\":true}");
                            }
                        }

                        return HttpResponse{404, "Not Found", "text/plain; charset=utf-8", {}, "not found"};
                    }();
                }

                if (!response_sent) {
                    SuppressSocketSigPipe(client_fd);
                    const HttpRequest* request_for_headers =
                        request_opt.has_value() ? &request_opt.value() : nullptr;
                    const std::string encoded = BuildHttpResponse(response, request_for_headers);
                    (void)SendAll(client_fd, encoded);
                }
                close(client_fd);
            }).detach();
        }
    });

    return true;
}

void WebRtcHttpServer::Stop() {
    if (!running_.exchange(false)) {
        return;
    }

    if (impl_->listen_fd >= 0) {
        shutdown(impl_->listen_fd, SHUT_RDWR);
        close(impl_->listen_fd);
        impl_->listen_fd = -1;
    }
    if (impl_->accept_thread.joinable()) {
        impl_->accept_thread.join();
    }

    std::vector<Impl::SessionEntry> sessions;
    std::vector<Impl::SourceSessionEntry> source_sessions;
    {
        std::lock_guard lock(impl_->mu);
        for (auto& [_, entry] : impl_->sessions) {
            sessions.push_back(entry);
        }
        impl_->sessions.clear();
        impl_->client_sessions.clear();
        for (auto& [_, entry] : impl_->source_sessions) {
            source_sessions.push_back(entry);
        }
        impl_->source_sessions.clear();
    }
    for (auto& entry : sessions) {
        entry.bridge->Stop();
        if (!entry.analysis_tap_id.empty()) {
            DetachAnalysisTapAndReleaseRuntimes(impl_->session_manager, entry.analysis_tap_id);
        }
        impl_->session_manager.CloseSession(entry.ingress_client_id);
    }
    for (auto& entry : source_sessions) {
        entry.bridge->Stop();
    }
}

bool WebRtcHttpServer::IsRunning() const {
    return running_.load();
}

}  // namespace ingress

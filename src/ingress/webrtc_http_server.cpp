// 파일 요약: HTTP API와 Lab UI를 제공하는 내장 웹 서버 구현이다.
// 동작 요약: WebRTC simple signaling, WHEP, WHIP, /webrtc/config, analysis tap/rule/profile API를 처리한다.
// 동작 요약: Lab/Rule/Import HTML을 생성하고, 정적 이미지 분석과 이벤트 POST 상태 응답도 이 파일에서 묶는다.
#include "ingress/webrtc_http_server.h"

#include <arpa/inet.h>
#include <netinet/in.h>
#include <sys/socket.h>
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
#include "analysis/object_tracker.h"
#include "analysis/overlay_renderer.h"
#include "analysis/snapshot_encoder.h"
#include "analysis/va_runtime_metadata.h"
#include "core/runtime_debug_counters.h"
#include "ingress/analysis_query.h"
#include "ingress/analysis_rule_registry.h"
#include "ingress/request_parser.h"
#include "ingress/lab_import_manager.h"
#include "ingress/webrtc_egress_session.h"
#include "ingress/webrtc_source_registry.h"
#include "ingress/webrtc_source_session.h"

namespace ingress {

namespace {

std::atomic<std::uint64_t> g_web_rtc_metadata_sequence{0};

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
    return id == "server-default-va" || id == "debug-dummy" || id == "yolo-fast" ||
           id == "yolo-balanced" || id == "yolo-quality";
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
            << "\"match\":{\"sourceKind\":\"file|rtsp|webrtc|http|hls|youtube|*\",\"route\":\"http|rtsp|webrtc|*\","
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
        return R"([{"id":"server-default-va","detector":"server-config","adaptive":true,"trackingClasses":["person","vehicle"],"description":"URL에는 va=1만 두고 detector/model/labels/fps 기본값은 stdafx.h/env 설정을 따른다. tracker는 기본적으로 사람/차량 카테고리에만 ID를 붙인다."},{"id":"debug-dummy","detector":"dummy","fps":5,"maxQueue":2,"trackingClasses":["person","vehicle"],"description":"raw decode/sampling lifecycle 확인용"},{"id":"yolo-fast","detector":"yolo","fps":8,"maxQueue":1,"preprocess":"letterbox","inputWidth":640,"inputHeight":640,"confidence":0.25,"nms":0.45,"adaptive":true,"trackingClasses":["person","vehicle"],"description":"움직임이 큰 장면의 overlay 지연 최소화"},{"id":"yolo-balanced","detector":"yolo","fps":5,"maxQueue":2,"preprocess":"letterbox","inputWidth":640,"inputHeight":640,"confidence":0.35,"nms":0.45,"adaptive":true,"trackingClasses":["person","vehicle"],"description":"기본 객체 감지 균형값"},{"id":"yolo-quality","detector":"yolo","fps":3,"maxQueue":2,"preprocess":"letterbox","inputWidth":960,"inputHeight":960,"confidence":0.35,"nms":0.45,"adaptive":true,"trackingClasses":["person","vehicle"],"description":"정확도 우선, CPU 비용 증가"}])";
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

std::string BuildHttpResponse(const HttpResponse& response) {
    std::ostringstream out;
    out << "HTTP/1.1 " << response.status << " " << response.status_text << "\r\n";
    out << "Content-Type: " << response.content_type << "\r\n";
    out << "Content-Length: " << response.body.size() << "\r\n";
    out << "Connection: close\r\n";
    out << "Access-Control-Allow-Origin: *\r\n";
    out << "Access-Control-Allow-Headers: Content-Type\r\n";
    out << "Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS\r\n";
    for (const auto& [key, value] : response.headers) {
        out << key << ": " << value << "\r\n";
    }
    out << "\r\n";
    out << response.body;
    return out.str();
}

std::optional<HttpRequest> ReadHttpRequest(int client_fd) {
    std::string raw;
    char buffer[4096];
    std::size_t header_end = std::string::npos;
    while (header_end == std::string::npos) {
        const ssize_t read_bytes = recv(client_fd, buffer, sizeof(buffer), 0);
        if (read_bytes <= 0) {
            return std::nullopt;
        }
        raw.append(buffer, static_cast<std::size_t>(read_bytes));
        header_end = raw.find("\r\n\r\n");
        if (raw.size() > 1024 * 1024) {
            return std::nullopt;
        }
    }

    HttpRequest request;
    std::istringstream header_stream(raw.substr(0, header_end));
    std::string request_line;
    if (!std::getline(header_stream, request_line)) {
        return std::nullopt;
    }
    if (!request_line.empty() && request_line.back() == '\r') {
        request_line.pop_back();
    }
    {
        std::istringstream request_line_stream(request_line);
        request_line_stream >> request.method >> request.target;
    }
    if (request.method.empty() || request.target.empty()) {
        return std::nullopt;
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
    if (const auto it = request.headers.find("Content-Length"); it != request.headers.end()) {
        content_length = static_cast<std::size_t>(std::stoul(it->second));
    }

    request.body = raw.substr(header_end + 4);
    while (request.body.size() < content_length) {
        const ssize_t read_bytes = recv(client_fd, buffer, sizeof(buffer), 0);
        if (read_bytes <= 0) {
            return std::nullopt;
        }
        request.body.append(buffer, static_cast<std::size_t>(read_bytes));
    }
    if (request.body.size() > content_length) {
        request.body.resize(content_length);
    }

    return request;
}

std::string BuildTestPageHtml(bool lab_mode) {
    const bool youtube_enabled = lab_mode && app::GetAppConfig().enable_experimental_youtube_source;
    const std::string page_title = lab_mode ? "미디어 서버 실험실" : "미디어 서버 WebRTC 테스트";
    const std::string hero_title = lab_mode ? "미디어 서버 실험실" : "WebRTC 수신 테스트";
    const std::string hero_body = lab_mode
                                      ? "실험용 소스 검증, URL 가져오기 도구, simple signaling/WHEP/WHIP 확인을 한 곳에 모아둔 화면입니다."
                                      : "simple signaling, WHEP 재생, WHIP 스타일 publish를 같은 미디어 서버에서 확인하는 화면입니다.";
    const std::string page_link = lab_mode
                                      ? std::string()
                                      : "          <p style=\"margin:0 0 14px;\"><a href=\"/lab\">실험실 페이지로 이동</a></p>\n";
    const std::string youtube_option =
        youtube_enabled ? "              <option value=\"youtube\">YouTube watch/live URL (실험실)</option>\n"
                        : std::string();
    const std::string experimental_note =
        lab_mode
            ? (youtube_enabled
                   ? "          <p style=\"margin:0;color:var(--muted);font-size:0.9rem;\">이 서버에서는 실험실 YouTube 소스가 켜져 있습니다. `yt-dlp`를 사용하며 로그인, 지역 제한, bot check에 따라 실패할 수 있습니다.</p>\n"
                   : std::string())
            : "          <p style=\"margin:0;color:var(--muted);font-size:0.9rem;\">이 화면은 안정 테스트용입니다. 개발 전용 옵션은 `/lab`에서 확인하세요.</p>\n";
    const std::string analysis_controls = lab_mode
                                              ? R"(          <details id="va-analysis" open style="border:1px solid var(--line);border-radius:16px;padding:12px;background:rgba(255,255,255,0.04);">
            <summary style="cursor:pointer;font-weight:700;color:var(--ink);">VA 분석</summary>
            <div style="display:grid;gap:10px;margin-top:12px;">
              <label style="display:flex;align-items:center;gap:8px;">
                <input id="analysisOverlayInput" type="checkbox" style="width:auto;" />
                서버 기본 VA profile로 객체 감지 박스 합성
              </label>
              <p style="margin:0;color:var(--muted);font-size:0.88rem;">모델, 라벨, 기본 fps/queue는 서버 설정값을 사용합니다. URL에는 기본적으로 `va=1`만 붙습니다.</p>
              <label style="display:flex;align-items:center;gap:8px;">
                <input id="analysisTrackIdsInput" type="checkbox" style="width:auto;" />
                객체 ID를 라벨에 함께 표시
              </label>
              <label style="display:flex;align-items:center;gap:8px;">
                <input id="analysisTrackTrailsInput" type="checkbox" style="width:auto;" />
                객체 이동 궤적 표시
              </label>
              <label style="display:flex;align-items:center;gap:8px;">
                <input id="analysisRedactionInput" type="checkbox" style="width:auto;" />
                사람 객체 모자이크
              </label>
              <label>객체 표기 언어
                <select id="analysisLabelLangInput">
                  <option value="ko" selected>한글: 차량(자동차)</option>
                  <option value="en">English: Vehicle(car)</option>
                </select>
              </label>
              <details>
                <summary style="cursor:pointer;color:var(--muted);">고급 튜닝(선택)</summary>
                <div style="display:grid;gap:10px;margin-top:10px;">
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                    <label class="range-field">
                      <span class="range-head"><span>FPS</span><output data-range-value-for="analysisFpsInput"></output></span>
                      <input id="analysisFpsInput" type="range" min="1" max="30" step="1" value="8" data-default="8" data-unit="fps" data-query-optional="1" />
                      <span class="range-meta">min 1 · max 30 · default 8 · 변경 시 적용</span>
                    </label>
                    <label class="range-field">
                      <span class="range-head"><span>Queue</span><output data-range-value-for="analysisQueueInput"></output></span>
                      <input id="analysisQueueInput" type="range" min="1" max="8" step="1" value="1" data-default="1" data-query-optional="1" />
                      <span class="range-meta">min 1 · max 8 · default 1 · 변경 시 적용</span>
                    </label>
                  </div>
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                    <label class="range-field">
                      <span class="range-head"><span>Overlay wait</span><output data-range-value-for="analysisOverlayWaitInput"></output></span>
                      <input id="analysisOverlayWaitInput" type="range" min="0" max="2000" step="20" value="180" data-default="180" data-unit="ms" data-query-optional="1" />
                      <span class="range-meta">min 0 · max 2000 · default 180ms · 변경 시 적용</span>
                    </label>
                    <label class="range-field">
                      <span class="range-head"><span>PTS tolerance</span><output data-range-value-for="analysisOverlayToleranceInput"></output></span>
                      <input id="analysisOverlayToleranceInput" type="range" min="0" max="5000" step="50" value="400" data-default="400" data-unit="ms" data-query-optional="1" />
                      <span class="range-meta">min 0 · max 5000 · default 400ms · 변경 시 적용</span>
                    </label>
                  </div>
                  <label>전처리
                    <select id="analysisPreprocessInput">
                      <option value="" selected>자동</option>
                      <option value="letterbox">letterbox</option>
                      <option value="stretch">stretch</option>
                    </select>
                  </label>
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                    <label class="range-field">
                      <span class="range-head"><span>모자이크 block</span><output data-range-value-for="analysisRedactionBlockInput"></output></span>
                      <input id="analysisRedactionBlockInput" type="range" min="4" max="128" step="1" value="20" data-default="20" data-unit="px" />
                      <span class="range-meta">min 4 · max 128 · default 20px</span>
                    </label>
                    <label class="range-field">
                      <span class="range-head"><span>모자이크 margin</span><output data-range-value-for="analysisRedactionMarginInput"></output></span>
                      <input id="analysisRedactionMarginInput" type="range" min="0" max="0.5" step="0.01" value="0.08" data-default="0.08" />
                      <span class="range-meta">min 0 · max 0.5 · default 0.08</span>
                    </label>
                  </div>
                  <label>모자이크 대상
                    <input id="analysisRedactionClassesInput" value="person" />
                  </label>
                </div>
              </details>
            </div>
          </details>
)"
                                              : std::string();
    const std::string lab_panel = lab_mode
                                      ? R"(    <section class="card lab-stack" style="margin-top:20px;">
      <div class="section-pad">
        <div class="section-heading">
          <p class="eyebrow">Unified Lab</p>
          <h2>통합 테스트/실험실</h2>
          <p>`/lab` 하나에서 스트림 재생, VA 분석, 영상 분석 설정, 실험실 도구를 접고 펼치며 확인합니다. 다른 route는 자동화와 기존 링크 호환을 위해서만 유지합니다.</p>
        </div>
        <div class="lab-mode-grid">
          <div class="lab-mode-card"><strong>스트림 테스트</strong><span>file, RTSP, HTTP/HLS, WebRTC source를 같은 플레이어로 확인합니다.</span></div>
          <div class="lab-mode-card"><strong>VA 분석</strong><span>객체 감지 overlay와 label 언어를 서버 기본 profile로 빠르게 켭니다.</span></div>
          <div class="lab-mode-card"><strong>영상 분석 설정</strong><span>소스, 객체 카테고리, 이벤트/시나리오, 영역을 숫자 ID로 저장합니다.</span></div>
          <div class="lab-mode-card"><strong>실험 기능</strong><span>YouTube 직접 표출은 opt-in, 파일 다운로드는 개발용 샘플 생성 도구로 분리합니다.</span></div>
        </div>
        <details style="border:1px solid var(--line);border-radius:16px;padding:14px;background:rgba(255,255,255,0.04);">
          <summary style="cursor:pointer;font-weight:800;color:var(--ink);">표출 가능한 객체 카테고리 안내</summary>
          <p style="margin:10px 0 0;">현재 기본 YOLO 모델은 COCO 80개 객체 클래스를 기준으로 합니다. 화면 표기는 한글 카테고리로 묶고, 서버 내부 rule 값은 COCO 영문 label을 그대로 사용합니다.</p>
          <pre style="min-height:0;margin-top:10px;">사람: 사람 단독
차량: 자전거, 자동차, 오토바이, 비행기, 버스, 기차, 트럭, 보트
도로: 신호등, 소화전, 정지 표지판, 주차 미터기
동물: 새, 고양이, 강아지, 말, 양, 소, 코끼리, 곰, 얼룩말, 기린
운동: 프리스비, 스키, 스노보드, 공, 연, 야구 배트, 야구 글러브, 스케이트보드, 서프보드, 테니스 라켓
음식: 바나나, 사과, 샌드위치, 오렌지, 브로콜리, 당근, 핫도그, 피자, 도넛, 케이크
가구: 벤치, 의자, 소파, 침대, 식탁, 화분, 싱크대, 변기
기기: TV, 노트북, 마우스, 리모컨, 키보드, 휴대폰, 전자레인지, 오븐, 토스터, 냉장고, 헤어드라이어, 시계
식기: 병, 와인잔, 컵, 포크, 칼, 숟가락, 그릇
잡화: 백팩, 우산, 핸드백, 넥타이, 여행가방, 책, 꽃병, 가위, 곰인형, 칫솔</pre>
        </details>
        <details id="image-analysis" open class="lab-details">
          <summary style="cursor:pointer;font-weight:800;color:var(--ink);">정적 이미지 분석</summary>
          <p class="lab-detail-note">영상 스트림 없이 이미지 한 장을 YOLO/VA profile로 분석합니다. 기본 샘플은 `docs/assets`에 포함된 license-safe 이미지입니다.</p>
          <div class="image-analysis-grid">
            <div class="controls">
              <label>이미지 위치
                <select id="imageAnalysisSourceKind">
                  <option value="asset" selected>docs/assets 샘플</option>
                  <option value="file">video root 상대경로</option>
                </select>
              </label>
              <label>이미지 파일
                <input id="imageAnalysisToken" value="va-four-scene-sample.png" />
              </label>
              <label>등록된 이미지 선택
                <select id="imageAnalysisTokenSelect">
                  <option value="va-four-scene-sample.png" selected>va-four-scene-sample.png</option>
                </select>
              </label>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <label>라벨 언어
                  <select id="imageAnalysisLabelLang">
                    <option value="ko" selected>한글</option>
                    <option value="en">English</option>
                  </select>
                </label>
                <label class="range-field">
                  <span class="range-head"><span>품질</span><output data-range-value-for="imageAnalysisQuality"></output></span>
                  <input id="imageAnalysisQuality" type="range" min="1" max="100" step="1" value="88" data-default="88" />
                  <span class="range-meta">min 1 · max 100 · default 88</span>
                </label>
              </div>
              <label class="range-field">
                <span class="range-head"><span>박스 두께</span><output data-range-value-for="imageAnalysisThickness"></output></span>
                <input id="imageAnalysisThickness" type="range" min="1" max="16" step="1" value="3" data-default="3" data-unit="px" />
                <span class="range-meta">min 1 · max 16 · default 3px</span>
              </label>
              <label style="display:flex;align-items:center;gap:8px;">
                <input id="imageAnalysisRedaction" type="checkbox" style="width:auto;" />
                사람 객체 모자이크
              </label>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <label class="range-field">
                  <span class="range-head"><span>모자이크 block</span><output data-range-value-for="imageAnalysisRedactionBlock"></output></span>
                  <input id="imageAnalysisRedactionBlock" type="range" min="4" max="128" step="1" value="20" data-default="20" data-unit="px" />
                  <span class="range-meta">min 4 · max 128 · default 20px</span>
                </label>
                <label class="range-field">
                  <span class="range-head"><span>모자이크 margin</span><output data-range-value-for="imageAnalysisRedactionMargin"></output></span>
                  <input id="imageAnalysisRedactionMargin" type="range" min="0" max="0.5" step="0.01" value="0.08" data-default="0.08" />
                  <span class="range-meta">min 0 · max 0.5 · default 0.08</span>
                </label>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <button id="imageAnalysisOverlayBtn" class="secondary" type="button">Overlay 보기</button>
                <button id="imageAnalysisSnapshotBtn" class="secondary" type="button">원본 보기</button>
              </div>
              <p id="imageAnalysisStatus" style="margin:0;color:var(--muted);font-size:0.9rem;">대기 중</p>
            </div>
            <div class="image-preview-panel">
              <img id="imageAnalysisPreview" alt="정적 이미지 분석 결과" />
            </div>
          </div>
          <details class="image-metadata-drawer">
            <summary style="cursor:pointer;font-weight:700;color:var(--ink);">분석 metadata 보기</summary>
            <pre id="imageAnalysisMetadata" class="compact-pre"></pre>
          </details>
        </details>
        <details id="rule-editor" open class="lab-details">
          <summary style="cursor:pointer;font-weight:800;color:var(--ink);">영상 분석 설정</summary>
          <p class="lab-detail-note">분석할 영상 소스, 이벤트 판단 영역, 분석 객체, 이벤트/시나리오 설정을 하나의 숫자 ID로 저장합니다.</p>
          <div id="ruleEditorComponent" class="embedded-component" data-component-url="/lab/rules?embed=1">영상 분석 설정 화면을 불러오는 중입니다.</div>
        </details>
        <details id="lab-import" class="lab-details">
          <summary style="cursor:pointer;font-weight:800;color:var(--ink);">실험실 가져오기</summary>
          <p class="lab-detail-note">YouTube 직접 표출과 파일 다운로드를 분리합니다. 다운로드는 개발용 샘플 생성 도구로 기본 표시하고, 직접 표출은 서버 opt-in이 필요합니다.</p>
          <div id="labImportComponent" class="embedded-component" data-component-url="/lab/import?embed=1">가져오기 도구를 불러오는 중입니다.</div>
        </details>
      </div>
    </section>
)"
                                      : std::string();
    return R"(<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>)" + page_title + R"(</title>
  <script>
    (() => {
      const saved = localStorage.getItem('mediaServerTheme');
      document.documentElement.dataset.theme = saved === 'dark' ? 'dark' : 'light';
      const params = new URLSearchParams(window.location.search);
      document.documentElement.dataset.embed = params.get('embed') === '1' ? '1' : '0';
    })();
  </script>
  <style>
    :root {
      --bg: #f6f1e8;
      --panel: #fffaf0;
      --panel-soft: #fdf6e7;
      --ink: #172026;
      --muted: #66737c;
      --accent: #0b6e69;
      --accent-2: #f0b35b;
      --line: rgba(23,32,38,0.12);
      --shadow: 0 22px 70px rgba(38, 44, 54, 0.14);
      --card-bg: rgba(255,250,240,0.88);
      --field-bg: rgba(255,255,255,0.82);
      --secondary-bg: #fff;
      --details-bg: rgba(255,255,255,0.58);
      --code-bg: #172026;
      --code-ink: #e8f4f1;
      --compact-code-bg: #24323a;
      --link: #0a6f68;
      --focus: rgba(11,110,105,0.18);
    }
    :root[data-theme="dark"] {
      --bg: #252525;
      --panel: #2b2b2b;
      --panel-soft: #303030;
      --ink: #f4f4f4;
      --muted: #b6b6b6;
      --accent: #ff4d8d;
      --accent-2: #ff9f66;
      --line: rgba(255,255,255,0.10);
      --shadow: 18px 24px 52px rgba(0,0,0,0.46), -10px -10px 34px rgba(255,255,255,0.035);
      --card-bg: rgba(42,42,42,0.92);
      --field-bg: rgba(18,18,18,0.88);
      --secondary-bg: rgba(255,255,255,0.08);
      --details-bg: rgba(255,255,255,0.055);
      --code-bg: rgba(14,14,14,0.94);
      --code-ink: #efefef;
      --compact-code-bg: rgba(16,16,16,0.94);
      --link: #ff9f66;
      --focus: rgba(255,77,141,0.24);
    }
    * { box-sizing: border-box; }
    [hidden] { display: none !important; }
    body {
      margin: 0;
      font-family: "Avenir Next", "Pretendard", "Noto Sans KR", sans-serif;
      color: var(--ink);
      background:
        radial-gradient(circle at 5% -10%, rgba(240,179,91,0.34), transparent 28%),
        radial-gradient(circle at 95% 2%, rgba(11,110,105,0.18), transparent 26%),
        linear-gradient(135deg, #fbf8f0 0%, var(--bg) 48%, #eaf3ef 100%);
      min-height: 100vh;
    }
    :root[data-theme="dark"] body {
      background:
        radial-gradient(circle at 18% 8%, rgba(255,77,141,0.08), transparent 30%),
        radial-gradient(circle at 82% 2%, rgba(255,159,102,0.06), transparent 32%),
        linear-gradient(135deg, #202020 0%, var(--bg) 54%, #202020 100%);
    }
    main {
      width: min(1240px, calc(100% - 32px));
      margin: 0 auto;
      padding: clamp(18px, 3vw, 36px) 0 clamp(36px, 5vw, 64px);
      display: grid;
      gap: clamp(18px, 2.4vw, 28px);
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--line);
      border-radius: 28px;
      backdrop-filter: blur(14px);
      box-shadow: var(--shadow);
      overflow: hidden;
    }
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 14px;
      color: var(--muted);
      font-size: 13px;
      padding: 10px 12px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: var(--details-bg);
      backdrop-filter: blur(14px);
    }
    .topbar strong {
      color: var(--ink);
      letter-spacing: -0.02em;
    }
    .theme-toggle {
      width: auto;
      min-width: 112px;
      padding: 9px 13px;
      border-radius: 999px;
      background: var(--secondary-bg);
      color: var(--ink);
      border: 1px solid var(--line);
      box-shadow: none;
    }
    .hero {
      display: grid;
      grid-template-columns: minmax(0, 680px) minmax(320px, 380px);
      justify-content: center;
      align-items: start;
      gap: clamp(18px, 2.4vw, 28px);
      padding: clamp(18px, 3vw, 30px);
    }
    .stream-panel {
      display: grid;
      gap: 14px;
      justify-items: stretch;
    }
    h1 { margin: 0 0 8px; font-size: clamp(30px, 4vw, 48px); letter-spacing: -0.055em; line-height: 0.98; }
    h2 { margin: 0; font-size: clamp(22px, 2.5vw, 32px); letter-spacing: -0.045em; }
    p { color: var(--muted); line-height: 1.5; }
    .controls {
      width: 100%;
      max-width: 380px;
      justify-self: center;
      display: grid;
      gap: 12px;
      align-content: start;
      padding: 16px;
      border: 1px solid var(--line);
      border-radius: 22px;
      background: var(--details-bg);
    }
    .hero > div,
    .controls {
      min-width: 0;
    }
    label {
      display: grid;
      gap: 6px;
      font-size: 13px;
      color: var(--muted);
    }
    .source-field.is-hidden {
      display: none;
    }
    input, select, button, textarea {
      width: 100%;
      border-radius: 14px;
      border: 1px solid var(--line);
      background: var(--field-bg);
      color: var(--ink);
      padding: 12px 14px;
      font: inherit;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.65);
    }
    input:focus, select:focus, textarea:focus {
      outline: 3px solid var(--focus);
      border-color: rgba(11,110,105,0.45);
    }
    button {
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      color: #fff;
      border: 0;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 12px 28px rgba(11,110,105,0.22);
    }
    button.secondary {
      background: var(--secondary-bg);
      color: var(--ink);
      border: 1px solid var(--line);
      box-shadow: none;
    }
    a {
      color: var(--link);
      text-decoration: none;
      font-weight: 700;
    }
    a:hover {
      text-decoration: underline;
    }
    .range-field {
      gap: 8px;
    }
    .range-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .range-head output {
      color: var(--ink);
      font-weight: 800;
      font-variant-numeric: tabular-nums;
    }
    .range-field input[type="range"] {
      padding: 0;
      accent-color: var(--accent);
      box-shadow: none;
    }
    .range-meta {
      color: var(--muted);
      font-size: 0.78rem;
      line-height: 1.35;
    }
    .video-frame {
      width: 100%;
      max-width: 680px;
      justify-self: center;
      aspect-ratio: 16 / 9;
      max-height: min(52vh, 420px);
      background: #000;
      border-radius: 22px;
      border: 1px solid var(--line);
      overflow: hidden;
    }
    /* WebRTC metadata가 늦게 들어와도 실제 영상 크기가 Lab 레이아웃을 밀어내지 않게 프레임이 크기를 고정한다. */
    .video-frame video {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: contain;
      background: #000;
      border: 0;
      border-radius: 21px;
    }
    img {
      max-width: 100%;
      display: block;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr));
      gap: clamp(16px, 2.4vw, 24px);
      padding: 0 clamp(18px, 3vw, 30px) clamp(18px, 3vw, 30px);
    }
    textarea { min-height: 220px; }
    pre {
      white-space: pre-wrap;
      word-break: break-word;
      background: var(--code-bg);
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 16px;
      min-height: 220px;
      margin: 0;
      color: var(--code-ink);
    }
    .utility-drawer {
      margin: 0 clamp(18px, 3vw, 30px) clamp(18px, 3vw, 30px);
      overflow: hidden;
    }
    .utility-drawer > summary {
      cursor: pointer;
      padding: 16px 18px;
      color: var(--ink);
      font-weight: 800;
    }
    .utility-drawer[open] > summary {
      border-bottom: 1px solid var(--line);
    }
    .utility-drawer .grid {
      padding: 16px;
    }
    .utility-drawer .controls {
      box-shadow: none;
    }
    details {
      border: 1px solid var(--line);
      border-radius: 18px;
      background: var(--details-bg);
    }
    summary {
      list-style-position: inside;
    }
    summary:focus-visible {
      outline: 3px solid var(--focus);
      outline-offset: 4px;
      border-radius: 12px;
    }
    .section-pad {
      padding: clamp(18px, 3vw, 30px);
      display: grid;
      gap: 16px;
    }
    .section-heading {
      display: grid;
      gap: 8px;
      padding: 22px;
      border: 1px solid var(--line);
      border-radius: 24px;
      background:
        radial-gradient(circle at top right, rgba(240,179,91,0.16), transparent 36%),
        var(--details-bg);
    }
    .section-heading p {
      margin: 0;
    }
    .eyebrow {
      color: var(--accent);
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    .subtle-links {
      margin: 0;
      padding: 10px 12px;
      border-radius: 16px;
      background: var(--details-bg);
      color: var(--muted);
      font-size: 0.92rem;
    }
    .compact-pre {
      min-height: 0;
      background: var(--compact-code-bg);
    }
    .lab-stack {
      scroll-margin-top: 18px;
      background: transparent;
      border: 0;
      box-shadow: none;
      overflow: visible;
      margin-top: 0 !important;
    }
    .lab-stack .section-pad {
      padding: 0;
      gap: 18px;
    }
    #stream-test {
      background:
        radial-gradient(circle at 12% 0%, rgba(240,179,91,0.22), transparent 32%),
        radial-gradient(circle at 100% 0%, rgba(11,110,105,0.18), transparent 28%),
        var(--card-bg);
    }
    .lab-mode-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0;
      padding: 8px 18px;
      border: 1px solid var(--line);
      border-radius: 24px;
      background: var(--details-bg);
    }
    .lab-mode-card {
      display: grid;
      grid-template-columns: minmax(110px, 0.28fr) 1fr;
      gap: 6px;
      align-items: start;
      padding: 13px 0;
      border: 0;
      border-bottom: 1px solid var(--line);
      border-radius: 0;
      background: transparent;
      box-shadow: none;
    }
    .lab-mode-card:last-child {
      border-bottom: 0;
    }
    .lab-mode-card strong {
      color: var(--ink);
      letter-spacing: -0.02em;
    }
    .lab-mode-card span {
      color: var(--muted);
      line-height: 1.45;
      font-size: 0.92rem;
    }
    .lab-details {
      padding: 0;
      background: transparent;
      border: 0;
      display: grid;
      gap: 12px;
      box-shadow: none;
    }
    .lab-details > summary {
      padding: 18px 20px;
      border: 1px solid var(--line);
      border-radius: 22px;
      background: var(--details-bg);
      cursor: pointer;
    }
    .lab-detail-note {
      margin: 0 !important;
      padding: 14px 16px;
      border: 1px solid var(--line);
      border-radius: 18px;
      background:
        linear-gradient(90deg, rgba(255,77,141,0.08), rgba(255,159,102,0.04)),
        var(--details-bg);
      color: var(--muted);
      line-height: 1.55;
      font-size: 0.94rem;
    }
    .embedded-component {
      display: block;
      width: 100%;
      min-height: 180px;
      border: 0;
      border-radius: 0;
      background: transparent;
      color: var(--muted);
      padding: 0;
      overflow: hidden;
      --accent2: var(--accent-2);
      --panel2: var(--panel-soft);
      --soft-bg: var(--details-bg);
      --canvas-bg: var(--code-bg);
      --danger: #ff7777;
    }
    .image-analysis-grid {
      display: grid;
      grid-template-columns: minmax(260px, 360px) minmax(320px, 720px);
      justify-content: center;
      gap: clamp(14px, 2vw, 22px);
      align-items: start;
    }
    .image-analysis-grid > .controls {
      width: 100%;
      max-width: 360px;
      justify-self: center;
    }
    .image-preview-panel {
      width: 100%;
      max-width: 720px;
      justify-self: center;
      min-height: 260px;
      max-height: min(58vh, 520px);
      aspect-ratio: 16 / 9;
      display: grid;
      place-items: center;
      border: 1px solid var(--line);
      border-radius: 24px;
      background:
        radial-gradient(circle at top right, rgba(11,110,105,0.12), transparent 34%),
        var(--details-bg);
      overflow: hidden;
    }
    .image-preview-panel img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .image-metadata-drawer {
      margin-top: 12px;
      padding: 12px;
    }
    .image-metadata-drawer pre {
      margin-top: 12px;
      max-height: 360px;
      overflow: auto;
    }
    #va-analysis {
      background: var(--details-bg) !important;
      border-radius: 22px !important;
      padding: 14px !important;
    }
    #va-analysis > summary {
      font-size: 1rem;
    }
    @media (max-width: 1180px) {
      .hero, .grid {
        grid-template-columns: 1fr;
      }
      .controls {
        max-width: 760px;
      }
      .lab-mode-card {
        grid-template-columns: 1fr;
      }
      .image-analysis-grid {
        grid-template-columns: 1fr;
      }
      .image-analysis-grid > .controls {
        max-width: 760px;
      }
      main {
        width: min(100% - 20px, 760px);
      }
      h1 {
        font-size: clamp(28px, 9vw, 40px);
      }
      div[style*="grid-template-columns:1fr 1fr"] {
        grid-template-columns: 1fr !important;
      }
    }
    @media (max-width: 900px) {
      .hero, .grid {
        grid-template-columns: 1fr;
      }
    }
    @media (max-width: 560px) {
      .card {
        border-radius: 22px;
      }
      .hero, .section-pad, .grid {
        padding-left: 16px;
        padding-right: 16px;
      }
    }
  </style>
</head>
<body>
  <main>
    <div class="topbar">
      <strong>MediaServer</strong>
      <button id="themeToggleBtn" class="theme-toggle" type="button">다크 모드</button>
    </div>
    <section id="stream-test" class="card">
      <div class="hero">
        <div class="stream-panel">
          <h1>)" + hero_title + R"(</h1>
)" + page_link + R"(          <p>)" + hero_body + R"(</p>
          <div class="video-frame">
            <video id="video" autoplay playsinline controls></video>
          </div>
        </div>
        <div class="controls">
          <label>소스 종류
            <select id="sourceType">
              <option value="file">file</option>
              <option value="url">RTSP URL</option>
              <option value="http">HTTP 미디어 URL</option>
              <option value="hls">HLS 미디어 URL</option>
)" + youtube_option + R"(              <option value="webrtc">발행된 WebRTC source id</option>
            </select>
          </label>
          <label class="source-field" data-source-field="file">파일 선택
            <select id="fileInput">
              <option value="sample_h264.mp4" selected>sample_h264.mp4</option>
            </select>
          </label>
          <label class="source-field" data-source-field="url">소스 URL
            <input id="urlInput" value="rtsp://127.0.0.1:8554/dhseo?file=sample_h264.mp4" />
          </label>
          <label class="source-field" data-source-field="webrtc">WebRTC 소스 ID
            <input id="webrtcSourceInput" value="publisher-demo" />
          </label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <button id="startBtn">시작</button>
            <button id="stopBtn" class="secondary">중지</button>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <button id="whepBtn" class="secondary">WHEP 테스트</button>
            <button id="clearBtn" class="secondary">로그 지우기</button>
          </div>
          <div style="display:grid;gap:6px;border:1px solid var(--line);border-radius:10px;padding:10px;background:var(--details-bg);font-size:0.9rem;">
            <div><strong>ICE</strong> <span id="icePolicyStatus">loading</span> <span id="iceServersStatus"></span></div>
            <div id="iceWarningStatus" style="color:#b45309;font-weight:700;"></div>
            <div id="consumerCandidateSummary">consumer local h/s/r/u 0/0/0/0 · remote h/s/r/u 0/0/0/0</div>
            <div id="publisherCandidateSummary">publisher local h/s/r/u 0/0/0/0 · remote h/s/r/u 0/0/0/0</div>
          </div>
          <details open style="border:1px solid var(--line);border-radius:14px;padding:10px;background:var(--details-bg);">
            <summary style="cursor:pointer;font-weight:700;color:var(--ink);">런타임 상태</summary>
            <div id="runtimeStatusPanel" style="display:grid;gap:6px;margin-top:10px;font-size:0.9rem;color:var(--muted);">
              <div>session 0 · stream 0 · tap 0</div>
              <div>egress 0 · publish 0</div>
              <div id="runtimePublishSources" style="white-space:pre-wrap;">publish source 없음</div>
              <div id="runtimeAnalysisMatches" style="white-space:pre-wrap;">profile/rule matching 대기</div>
            </div>
          </details>
          <details style="border:1px solid var(--line);border-radius:14px;padding:10px;background:var(--details-bg);">
            <summary style="cursor:pointer;font-weight:700;color:var(--ink);">Event POST 설정/상태</summary>
            <div style="display:grid;gap:8px;margin-top:10px;font-size:0.9rem;color:var(--muted);">
              <div id="eventPostStatusPanel" style="white-space:pre-wrap;">event POST 상태 로딩 중</div>
              <button id="eventPostRefreshBtn" class="secondary" type="button">상태 새로고침</button>
            </div>
          </details>
          <details style="border:1px solid var(--line);border-radius:14px;padding:10px;background:var(--details-bg);">
            <summary style="cursor:pointer;font-weight:700;color:var(--ink);">검증 리포트</summary>
            <div style="display:grid;gap:8px;margin-top:10px;">
              <div style="display:grid;grid-template-columns:1fr auto;gap:8px;">
                <select id="reportSelect"></select>
                <button id="reportRefreshBtn" class="secondary" type="button">목록</button>
              </div>
              <button id="reportOpenBtn" class="secondary" type="button">선택 리포트 보기</button>
              <pre id="reportContent" class="compact-pre" style="min-height:120px;max-height:320px;"></pre>
            </div>
          </details>
          <details style="border:1px solid var(--line);border-radius:14px;padding:10px;background:var(--details-bg);">
            <summary style="cursor:pointer;font-weight:700;color:var(--ink);">다채널 수동 테스트</summary>
            <div style="display:grid;gap:10px;margin-top:10px;">
              <label>단일 영상
                <input id="multiSingleFileInput" value="sample_h264.mp4" />
              </label>
              <label>다중 영상 목록
                <textarea id="multiSourceListInput" style="min-height:86px;">sample_h264.mp4
va_four_scene_sample.mp4</textarea>
              </label>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <label>단일 영상 client
                  <input id="multiSingleClientsInput" value="2" />
                </label>
                <label>source별 client
                  <input id="multiClientsPerSourceInput" value="2" />
                </label>
              </div>
              <label style="display:flex;align-items:center;gap:8px;">
                <input id="multiVaInput" type="checkbox" style="width:auto;" />
                VA overlay로 실행
              </label>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <button id="multiSingleBtn" class="secondary" type="button">단일 영상 실행</button>
                <button id="multiManyBtn" class="secondary" type="button">여러 영상 실행</button>
              </div>
              <button id="multiStopBtn" class="secondary" type="button">다채널 중지</button>
              <pre id="multiStatsLog" class="compact-pre" style="min-height:90px;"></pre>
              <pre id="multiStatusLog" class="compact-pre" style="min-height:90px;"></pre>
            </div>
          </details>
)" + analysis_controls + R"(
)" + experimental_note + R"(        </div>
      </div>
      <details class="utility-drawer">
        <summary>개발자 정보: 세션 로그 / 원격 SDP</summary>
        <div class="grid">
          <div>
            <label>세션 로그</label>
            <pre id="log"></pre>
          </div>
          <div>
            <label>원격 SDP</label>
            <textarea id="sdpBox" spellcheck="false"></textarea>
          </div>
        </div>
      </details>
      <details class="utility-drawer">
        <summary>WebRTC 발행 테스트</summary>
        <div class="grid">
          <div>
            <label>발행 화면 미리보기</label>
            <div class="video-frame">
              <video id="publisherVideo" autoplay playsinline controls muted></video>
            </div>
          </div>
          <div class="controls">
            <label>발행 소스 ID
              <input id="publishSourceIdInput" value="publisher-demo" />
            </label>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <button id="publishBtn" class="secondary">발행 시작</button>
              <button id="stopPublishBtn" class="secondary">발행 중지</button>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <button id="consumePublishedBtn" class="secondary">발행 소스 재생</button>
              <button id="consumePublishedWhepBtn" class="secondary">발행 소스 WHEP 재생</button>
            </div>
            <p style="margin:0;color:var(--muted);font-size:0.9rem;">
              publish 완료 후 `sourceType=webrtc`와 같은 source id로 RTSP/WebRTC consume을 바로 확인할 수 있습니다.
            </p>
          </div>
        </div>
      </details>
    </section>
)" + lab_panel + R"(  </main>
  <script>
    const logEl = document.getElementById('log');
    const videoEl = document.getElementById('video');
    const publisherVideoEl = document.getElementById('publisherVideo');
    const sdpBox = document.getElementById('sdpBox');
    const sourceTypeEl = document.getElementById('sourceType');
    const fileInputEl = document.getElementById('fileInput');
    const urlInputEl = document.getElementById('urlInput');
    const webrtcSourceInputEl = document.getElementById('webrtcSourceInput');
    const publishSourceIdInputEl = document.getElementById('publishSourceIdInput');
    const analysisOverlayInputEl = document.getElementById('analysisOverlayInput');
    const analysisFpsInputEl = document.getElementById('analysisFpsInput');
    const analysisQueueInputEl = document.getElementById('analysisQueueInput');
    const analysisOverlayWaitInputEl = document.getElementById('analysisOverlayWaitInput');
    const analysisOverlayToleranceInputEl = document.getElementById('analysisOverlayToleranceInput');
    const analysisPreprocessInputEl = document.getElementById('analysisPreprocessInput');
    const analysisLabelLangInputEl = document.getElementById('analysisLabelLangInput');
    const analysisTrackIdsInputEl = document.getElementById('analysisTrackIdsInput');
    const analysisTrackTrailsInputEl = document.getElementById('analysisTrackTrailsInput');
    const analysisRedactionInputEl = document.getElementById('analysisRedactionInput');
    const analysisRedactionClassesInputEl = document.getElementById('analysisRedactionClassesInput');
    const analysisRedactionBlockInputEl = document.getElementById('analysisRedactionBlockInput');
    const analysisRedactionMarginInputEl = document.getElementById('analysisRedactionMarginInput');
    const imageAnalysisSourceKindEl = document.getElementById('imageAnalysisSourceKind');
    const imageAnalysisTokenEl = document.getElementById('imageAnalysisToken');
    const imageAnalysisTokenSelectEl = document.getElementById('imageAnalysisTokenSelect');
    const imageAnalysisLabelLangEl = document.getElementById('imageAnalysisLabelLang');
    const imageAnalysisQualityEl = document.getElementById('imageAnalysisQuality');
    const imageAnalysisThicknessEl = document.getElementById('imageAnalysisThickness');
    const imageAnalysisRedactionEl = document.getElementById('imageAnalysisRedaction');
    const imageAnalysisRedactionBlockEl = document.getElementById('imageAnalysisRedactionBlock');
    const imageAnalysisRedactionMarginEl = document.getElementById('imageAnalysisRedactionMargin');
    const imageAnalysisOverlayBtn = document.getElementById('imageAnalysisOverlayBtn');
    const imageAnalysisSnapshotBtn = document.getElementById('imageAnalysisSnapshotBtn');
    const imageAnalysisStatusEl = document.getElementById('imageAnalysisStatus');
    const imageAnalysisPreviewEl = document.getElementById('imageAnalysisPreview');
    const imageAnalysisMetadataEl = document.getElementById('imageAnalysisMetadata');
    const icePolicyStatusEl = document.getElementById('icePolicyStatus');
    const iceServersStatusEl = document.getElementById('iceServersStatus');
    const iceWarningStatusEl = document.getElementById('iceWarningStatus');
    const consumerCandidateSummaryEl = document.getElementById('consumerCandidateSummary');
    const publisherCandidateSummaryEl = document.getElementById('publisherCandidateSummary');
    const runtimeStatusPanelEl = document.getElementById('runtimeStatusPanel');
    const runtimePublishSourcesEl = document.getElementById('runtimePublishSources');
    const runtimeAnalysisMatchesEl = document.getElementById('runtimeAnalysisMatches');
    const eventPostStatusPanelEl = document.getElementById('eventPostStatusPanel');
    const eventPostRefreshBtnEl = document.getElementById('eventPostRefreshBtn');
    const reportSelectEl = document.getElementById('reportSelect');
    const reportRefreshBtnEl = document.getElementById('reportRefreshBtn');
    const reportOpenBtnEl = document.getElementById('reportOpenBtn');
    const reportContentEl = document.getElementById('reportContent');
    const multiSingleFileInputEl = document.getElementById('multiSingleFileInput');
    const multiSourceListInputEl = document.getElementById('multiSourceListInput');
    const multiSingleClientsInputEl = document.getElementById('multiSingleClientsInput');
    const multiClientsPerSourceInputEl = document.getElementById('multiClientsPerSourceInput');
    const multiVaInputEl = document.getElementById('multiVaInput');
    const multiStatusLogEl = document.getElementById('multiStatusLog');
    const multiStatsLogEl = document.getElementById('multiStatsLog');
    const sourceFieldEls = Array.from(document.querySelectorAll('[data-source-field]'));
    let pc = null;
    let sessionId = null;
    let pollTimer = null;
    let sessionBase = '/webrtc/session';
    let publisherPc = null;
    let publisherSessionId = null;
    let publisherPollTimer = null;
    let publisherStream = null;
    let consumerLocalIceCount = 0;
    let consumerRemoteIceCount = 0;
    let labFilesPayload = null;
    let publisherLocalIceCount = 0;
    let publisherRemoteIceCount = 0;
    let consumerEmptyIcePolls = 0;
    let publisherEmptyIcePolls = 0;
    let webRtcConfigPayload = null;
    let runtimeStatusTimer = null;
    const multiClients = [];
    const consumerTrackKinds = new Set();
    const publisherTrackKinds = new Set();
    const consumerCandidateTypes = {
      local: { host: 0, srflx: 0, relay: 0, unknown: 0 },
      remote: { host: 0, srflx: 0, relay: 0, unknown: 0 }
    };
    const publisherCandidateTypes = {
      local: { host: 0, srflx: 0, relay: 0, unknown: 0 },
      remote: { host: 0, srflx: 0, relay: 0, unknown: 0 }
    };

    function formatRangeValue(input) {
      if (!input) return '';
      const rawValue = input.value || input.dataset.default || '';
      const step = input.step || '1';
      let text = rawValue;
      if (step.includes('.')) {
        const decimals = (step.split('.')[1] || '').length;
        text = Number(rawValue).toFixed(decimals).replace(/\.?0+$/, '');
      }
      return `${text}${input.dataset.unit || ''}`;
    }

    function updateRangeDisplay(input) {
      if (!input) return;
      const output = document.querySelector(`[data-range-value-for="${input.id}"]`);
      if (output) {
        output.textContent = formatRangeValue(input);
      }
    }

    function bindRangeControls() {
      for (const input of Array.from(document.querySelectorAll('input[type="range"][data-default]'))) {
        updateRangeDisplay(input);
        input.addEventListener('input', () => {
          input.dataset.rangeDirty = '1';
          updateRangeDisplay(input);
        });
        input.addEventListener('change', () => {
          input.dataset.rangeDirty = '1';
          updateRangeDisplay(input);
        });
      }
    }

    function rangeQueryValue(input, options = {}) {
      if (!input || !input.value) return '';
      if (options.changedOnly && input.dataset.rangeDirty !== '1') {
        return '';
      }
      return input.value;
    }

    function log(message) {
      const ts = new Date().toLocaleTimeString();
      logEl.textContent += `[${ts}] ${message}\n`;
      logEl.scrollTop = logEl.scrollHeight;
    }

    async function loadWebRtcConfig() {
      if (webRtcConfigPayload) return webRtcConfigPayload;
      const response = await fetch('/webrtc/config', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`/webrtc/config HTTP ${response.status}`);
      }
      webRtcConfigPayload = await response.json();
      updateIceConfigStatus(webRtcConfigPayload);
      return webRtcConfigPayload;
    }

    function resetCandidateTypes(target) {
      for (const side of ['local', 'remote']) {
        target[side].host = 0;
        target[side].srflx = 0;
        target[side].relay = 0;
        target[side].unknown = 0;
      }
    }

    function candidateType(candidateText) {
      const match = String(candidateText || '').match(/ typ ([a-zA-Z0-9_-]+)/);
      return match ? match[1] : 'unknown';
    }

    function recordCandidateType(target, side, candidateText) {
      const type = candidateType(candidateText);
      if (!Object.prototype.hasOwnProperty.call(target[side], type)) {
        target[side].unknown += 1;
      } else {
        target[side][type] += 1;
      }
      updateCandidateSummaries();
    }

    function candidateSummaryText(label, target) {
      const local = target.local;
      const remote = target.remote;
      return `${label} local h/s/r/u ${local.host}/${local.srflx}/${local.relay}/${local.unknown} · remote h/s/r/u ${remote.host}/${remote.srflx}/${remote.relay}/${remote.unknown}`;
    }

    function updateCandidateSummaries() {
      if (consumerCandidateSummaryEl) {
        consumerCandidateSummaryEl.textContent = candidateSummaryText('consumer', consumerCandidateTypes);
      }
      if (publisherCandidateSummaryEl) {
        publisherCandidateSummaryEl.textContent = candidateSummaryText('publisher', publisherCandidateTypes);
      }
    }

    // 런타임 상태의 boolean 값을 짧은 한글 배지 텍스트로 바꾼다.
    function runtimeFlag(value) {
      return value ? '준비' : '대기';
    }

    // /lab/runtime/status 응답을 사람이 훑기 쉬운 두 줄과 publish source 목록으로 표시한다.
    function renderRuntimeStatus(payload) {
      if (!runtimeStatusPanelEl || !payload) return;
      const sessionManager = payload.sessionManager || {};
      const webrtcHttp = payload.webrtcHttp || {};
      const analysisMatching = payload.analysisMatching || {};
      const publishSources = Array.isArray(webrtcHttp.publishSources) ? webrtcHttp.publishSources : [];
      const activeTaps = Array.isArray(analysisMatching.activeTaps) ? analysisMatching.activeTaps : [];
      const summaryLines = [
        `session ${sessionManager.activeSessions || 0} · stream ${sessionManager.registryActiveStreams || 0} · tap ${sessionManager.activeAnalysisTaps || 0}`,
        `egress ${webrtcHttp.egressSessions || 0} · publish ${webrtcHttp.publishSessions || 0}`
      ];
      const sourceLines = publishSources.map((source) => (
        `${source.sourceId || '<unknown>'} · video ${runtimeFlag(source.hasVideo)} · audio ${runtimeFlag(source.hasAudio)} · subscriber ${source.subscriberCount || 0}`
      ));
      const matchLines = activeTaps.map((tap) => (
        `${tap.tapId || '<tap>'} · ${tap.sourceKind || '-'}:${tap.route || '-'} · profile=${tap.profileKey || '-'} · rule=${tap.selectedRuleId || tap.profileSelectionSource || '-'}`
      ));
      runtimeStatusPanelEl.children[0].textContent = summaryLines[0];
      runtimeStatusPanelEl.children[1].textContent = summaryLines[1];
      if (runtimePublishSourcesEl) {
        runtimePublishSourcesEl.textContent = sourceLines.length > 0 ? sourceLines.join('\n') : 'publish source 없음';
      }
      if (runtimeAnalysisMatchesEl) {
        const header = `profiles ${analysisMatching.profileDocumentCount || 0} · rules ${analysisMatching.ruleDocumentCount || 0}`;
        runtimeAnalysisMatchesEl.textContent = matchLines.length > 0 ? `${header}\n${matchLines.join('\n')}` : `${header}\nactive tap 없음`;
      }
    }

    // 서버 runtime status를 주기적으로 조회해 WHIP readiness와 fan-out 상태를 화면에 반영한다.
    async function refreshRuntimeStatus() {
      if (!runtimeStatusPanelEl) return;
      try {
        const response = await fetch('/lab/runtime/status', { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        renderRuntimeStatus(await response.json());
      } catch (error) {
        runtimeStatusPanelEl.children[0].textContent = `runtime status 실패: ${error.message}`;
      }
    }

    // event POST worker의 런타임 설정과 counter를 Lab에서 즉시 확인할 수 있게 표시한다.
    function renderEventPostStatus(payload) {
      if (!eventPostStatusPanelEl || !payload) return;
      const lines = [
        `enabled ${payload.enabled ? 'on' : 'off'} · queue ${payload.queueSize || 0}/${payload.maxQueueSize || 0}`,
        `enqueued ${payload.enqueuedCount || 0} · sent ${payload.sentCount || 0} · failed ${payload.failedCount || 0}`,
        `dropped ${payload.droppedCount || 0} · suppressed ${payload.suppressedCount || 0}`
      ];
      if (payload.lastError) {
        lines.push(`lastError ${payload.lastError}`);
      }
      eventPostStatusPanelEl.textContent = lines.join('\n');
    }

    // event POST 상태 endpoint를 조회해 전송 설정과 실패 counter를 갱신한다.
    async function refreshEventPostStatus() {
      if (!eventPostStatusPanelEl) return;
      try {
        const response = await fetch('/lab/analysis/event-post/status', { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        renderEventPostStatus(await response.json());
      } catch (error) {
        eventPostStatusPanelEl.textContent = `event POST 상태 실패: ${error.message}`;
      }
    }

    // /tmp에 남은 검증 리포트 목록을 선택 상자에 채운다.
    async function refreshReportList() {
      if (!reportSelectEl) return;
      const response = await fetch('/lab/reports', { cache: 'no-store' });
      if (!response.ok) throw new Error(`/lab/reports HTTP ${response.status}`);
      const payload = await response.json();
      const reports = Array.isArray(payload.reports) ? payload.reports : [];
      reportSelectEl.innerHTML = '';
      for (const report of reports) {
        const option = document.createElement('option');
        option.value = report.path;
        option.textContent = `${report.kind || 'report'} · ${report.name || report.path} · ${Math.round((report.sizeBytes || 0) / 1024)} KiB`;
        reportSelectEl.appendChild(option);
      }
      if (reportContentEl) {
        reportContentEl.textContent = reports.length > 0 ? `${reports.length}개 리포트 발견` : '표시할 검증 리포트가 없습니다.';
      }
    }

    // 선택한 리포트 본문을 읽어 Lab 안에서 빠르게 확인한다.
    async function openSelectedReport() {
      if (!reportSelectEl || !reportContentEl || !reportSelectEl.value) return;
      const response = await fetch(`/lab/reports/content?path=${encodeURIComponent(reportSelectEl.value)}`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || `report HTTP ${response.status}`);
      const prefix = payload.truncated
        ? `[앞부분 ${payload.maxBytes || payload.content.length} bytes만 표시 · 생략 ${payload.truncatedBytes || 0} bytes]\n`
        : '';
      reportContentEl.textContent = `${payload.kind || 'report'} · ${payload.name}\n${payload.path}\n\n${prefix}${payload.content || ''}`;
    }

    // 다채널 수동 테스트 로그를 화면과 기존 세션 로그에 함께 남긴다.
    function appendMultiLog(message) {
      const ts = new Date().toLocaleTimeString();
      if (multiStatusLogEl) {
        multiStatusLogEl.textContent += `[${ts}] ${message}\n`;
        multiStatusLogEl.scrollTop = multiStatusLogEl.scrollHeight;
      }
      log(`다채널: ${message}`);
    }

    // input 값이 비어 있거나 잘못됐을 때 안전한 기본 client 수를 반환한다.
    function positiveIntegerInput(inputEl, fallback) {
      const value = Number.parseInt(inputEl && inputEl.value ? inputEl.value : '', 10);
      return Number.isFinite(value) && value > 0 ? value : fallback;
    }

    // 다채널 테스트에서 쓰는 file query를 기존 Lab VA 옵션과 충돌하지 않게 별도로 만든다.
    function buildMultiQuery(fileName, vaEnabled) {
      const params = new URLSearchParams();
      params.set('file', fileName);
      if (vaEnabled) {
        params.set('va', '1');
        params.set('fps', '5');
        params.set('labelLang', 'ko');
      }
      return params.toString();
    }

    // 다채널 수동 테스트로 만든 peer/session/video를 모두 닫아 서버 cleanup을 유도한다.
    async function stopMultichannelManual() {
      const clients = multiClients.splice(0, multiClients.length);
      await Promise.all(clients.map(async (client) => {
        if (client.pollTimer) clearInterval(client.pollTimer);
        if (client.sessionId) {
          await fetch(`/webrtc/session/${client.sessionId}`, { method: 'DELETE' }).catch(() => {});
        }
        if (client.pc) client.pc.close();
        if (client.video && client.video.parentNode) {
          client.video.parentNode.removeChild(client.video);
        }
      }));
      appendMultiLog(`정리 완료: ${clients.length}개 client`);
      await refreshRuntimeStatus();
    }

    // 하나의 WebRTC simple signaling consumer를 만들고 재생 가능한 상태까지 기다린다.
    async function startMultichannelClient(fileName, index, vaEnabled) {
      const client = {
        fileName,
        index,
        pc: await createPeerConnection(`multi-${index}`),
        sessionId: '',
        pollTimer: null,
        video: document.createElement('video'),
        trackKinds: new Set(),
        lastStats: null,
        lastState: 'new'
      };
      client.video.autoplay = true;
      client.video.playsInline = true;
      client.video.muted = true;
      client.video.style.cssText = 'position:fixed;left:-4px;top:-4px;width:1px;height:1px;opacity:0;pointer-events:none;';
      document.body.appendChild(client.video);
      client.pc.ontrack = (event) => {
        client.video.srcObject = event.streams[0];
        client.trackKinds.add(event.track.kind);
      };
      client.pc.onicecandidate = async (event) => {
        if (!client.sessionId || !event.candidate) return;
        await fetch(`/webrtc/session/${client.sessionId}/ice`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            candidate: event.candidate.candidate
          })
        }).catch(() => {});
      };
      const response = await fetch(`/webrtc/session?${buildMultiQuery(fileName, vaEnabled)}`, { method: 'POST' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || `${fileName} 세션 생성 실패`);
      client.sessionId = payload.sessionId;
      await client.pc.setRemoteDescription({ type: 'offer', sdp: payload.offer });
      const answer = await client.pc.createAnswer();
      await client.pc.setLocalDescription(answer);
      await fetch(`/webrtc/session/${client.sessionId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: answer.sdp
      });
      client.pollTimer = setInterval(async () => {
        const iceResponse = await fetch(`/webrtc/session/${client.sessionId}/ice`).catch(() => null);
        if (!iceResponse || !iceResponse.ok) return;
        const icePayload = await iceResponse.json();
        for (const candidate of icePayload.candidates || []) {
          await client.pc.addIceCandidate(candidate).catch(() => {});
        }
      }, 1000);
      multiClients.push(client);
      return client;
    }

    // 생성한 다채널 client가 실제 media frame 또는 RTP 통계를 받을 때까지 기다린다.
    async function waitForMultichannelClient(client, timeoutMs = 18000) {
      const startedAt = Date.now();
      while (Date.now() - startedAt < timeoutMs) {
        try {
          const playPromise = client.video.play();
          if (playPromise && typeof playPromise.catch === 'function') playPromise.catch(() => {});
        } catch (_) {}
        const connected = ['connected', 'completed'].includes(client.pc.connectionState || '');
        const ready = client.video.readyState >= 2 && Number(client.video.videoWidth || 0) > 0;
        const stats = await collectPeerStats(client.pc);
        client.lastStats = stats;
        client.lastState = `${client.pc.connectionState || 'unknown'}/${client.pc.iceConnectionState || 'unknown'}`;
        if (connected && (ready || stats.inboundVideoFramesDecoded > 0 || stats.inboundVideoBytes > 0)) {
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      throw new Error(`${client.fileName} client ${client.index} playback timeout`);
    }

    // 다채널 client별 ICE/state/frame/byte 통계를 표 형태 텍스트로 갱신한다.
    async function renderMultichannelStats(clients) {
      if (!multiStatsLogEl) return;
      const lines = [];
      for (const client of clients) {
        const stats = client.lastStats || await collectPeerStats(client.pc).catch(() => ({}));
        client.lastStats = stats;
        const state = `${client.pc.connectionState || 'unknown'}/${client.pc.iceConnectionState || 'unknown'}`;
        client.lastState = state;
        const tracks = Array.from(client.trackKinds || []).join(',') || '-';
        lines.push(
          `#${client.index} ${client.fileName} · state ${state} · tracks ${tracks} · frames ${stats.inboundVideoFramesDecoded || 0} · bytes ${stats.inboundVideoBytes || 0}`
        );
      }
      multiStatsLogEl.textContent = lines.length > 0 ? lines.join('\n') : 'client 통계 없음';
    }

    // 사용자가 입력한 단일/다중 source 목록으로 여러 WebRTC client를 동시에 열어 fan-out 상태를 확인한다.
    async function runMultichannelManual(mode) {
      await stopMultichannelManual();
      if (multiStatusLogEl) multiStatusLogEl.textContent = '';
      if (multiStatsLogEl) multiStatsLogEl.textContent = '';
      const vaEnabled = !!(multiVaInputEl && multiVaInputEl.checked);
      const files = [];
      if (mode === 'single') {
        const fileName = multiSingleFileInputEl && multiSingleFileInputEl.value ? multiSingleFileInputEl.value.trim() : 'sample_h264.mp4';
        const count = positiveIntegerInput(multiSingleClientsInputEl, 2);
        for (let index = 0; index < count; index += 1) files.push(fileName);
      } else {
        const sourceLines = String(multiSourceListInputEl && multiSourceListInputEl.value ? multiSourceListInputEl.value : '')
          .split(/\r?\n|,/)
          .map((item) => item.trim())
          .filter(Boolean);
        const perSource = positiveIntegerInput(multiClientsPerSourceInputEl, 2);
        for (const fileName of sourceLines.length > 0 ? sourceLines : ['sample_h264.mp4', 'va_four_scene_sample.mp4']) {
          for (let index = 0; index < perSource; index += 1) files.push(fileName);
        }
      }
      appendMultiLog(`시작: mode=${mode} clients=${files.length} va=${vaEnabled ? 'on' : 'off'}`);
      const clients = await Promise.all(files.map((fileName, index) => startMultichannelClient(fileName, index + 1, vaEnabled)));
      await Promise.all(clients.map((client) => waitForMultichannelClient(client)));
      await renderMultichannelStats(clients);
      appendMultiLog(`playback 확인 완료: ${clients.length}개 client`);
      await refreshRuntimeStatus();
    }

    function updateIceConfigStatus(payload) {
      const config = peerConnectionConfigFromPayload(payload);
      const iceServers = Array.isArray(config.iceServers) ? config.iceServers : [];
      const urls = iceServers.flatMap((server) => Array.isArray(server.urls) ? server.urls : [server.urls]).filter(Boolean);
      const policy = config.iceTransportPolicy || 'all';
      const requestedPolicy = payload && payload.requestedIceTransportPolicy ? payload.requestedIceTransportPolicy : policy;
      if (icePolicyStatusEl) icePolicyStatusEl.textContent = `policy=${policy}`;
      if (iceServersStatusEl) iceServersStatusEl.textContent = `servers=${urls.length}`;
      const hasTurn = urls.some((url) => String(url).startsWith('turn:') || String(url).startsWith('turns:'));
      const hasLoopbackTurn = urls.some((url) => /^turns?:((127\.)|localhost|\[::1\])/.test(String(url)));
      if (iceWarningStatusEl) {
        if (requestedPolicy === 'relay' && !hasTurn) {
          iceWarningStatusEl.textContent = 'relay 요청 상태지만 TURN 서버가 없어 policy=all로 fallback됐습니다.';
        } else if (policy === 'relay' && hasLoopbackTurn) {
          iceWarningStatusEl.textContent = 'relay 강제 + loopback TURN입니다. 브라우저 검증은 LAN IP TURN 권장.';
        } else {
          iceWarningStatusEl.textContent = '';
        }
      }
    }

    function peerConnectionConfigFromPayload(payload) {
      const raw = payload && payload.peerConnectionConfig && typeof payload.peerConnectionConfig === 'object'
        ? payload.peerConnectionConfig
        : {};
      const config = {};
      if (Array.isArray(raw.iceServers)) {
        config.iceServers = raw.iceServers;
      }
      if (raw.iceTransportPolicy === 'relay' || raw.iceTransportPolicy === 'all') {
        config.iceTransportPolicy = raw.iceTransportPolicy;
      }
      return config;
    }

    async function createPeerConnection(label) {
      try {
        const payload = await loadWebRtcConfig();
        const config = peerConnectionConfigFromPayload(payload);
        const iceServerCount = Array.isArray(config.iceServers) ? config.iceServers.length : 0;
        log(`${label} ICE config policy=${config.iceTransportPolicy || 'all'} servers=${iceServerCount}`);
        return new RTCPeerConnection(config);
      } catch (error) {
        log(`${label} ICE config 로드 실패, 브라우저 기본값 사용: ${error.message}`);
        return new RTCPeerConnection();
      }
    }

    function snapshotState() {
      return {
        sessionId,
        publisherSessionId,
        consumerConnectionState: pc ? pc.connectionState : '',
        consumerIceConnectionState: pc ? pc.iceConnectionState : '',
        publisherConnectionState: publisherPc ? publisherPc.connectionState : '',
        publisherIceConnectionState: publisherPc ? publisherPc.iceConnectionState : '',
        consumerLocalIceCount,
        consumerRemoteIceCount,
        publisherLocalIceCount,
        publisherRemoteIceCount,
        consumerHasStream: !!videoEl.srcObject,
        consumerTrackKinds: Array.from(consumerTrackKinds),
        consumerReadyState: videoEl.readyState,
        consumerCurrentTime: Number(videoEl.currentTime || 0),
        consumerVideoWidth: Number(videoEl.videoWidth || 0),
        consumerVideoHeight: Number(videoEl.videoHeight || 0),
        publisherHasStream: !!publisherVideoEl.srcObject,
        publisherTrackKinds: Array.from(publisherTrackKinds),
        publisherReadyState: publisherVideoEl.readyState,
        publisherCurrentTime: Number(publisherVideoEl.currentTime || 0),
        publisherVideoWidth: Number(publisherVideoEl.videoWidth || 0),
        publisherVideoHeight: Number(publisherVideoEl.videoHeight || 0),
        sourceType: sourceTypeEl.value,
        webrtcSourceId: webrtcSourceInputEl.value,
        publishSourceId: publishSourceIdInputEl.value,
        log: logEl.textContent
      };
    }

    function updateSourceFields() {
      const sourceType = sourceTypeEl.value;
      const activeField = sourceType === 'file'
        ? 'file'
        : sourceType === 'webrtc'
          ? 'webrtc'
          : 'url';
      for (const fieldEl of sourceFieldEls) {
        fieldEl.classList.toggle('is-hidden', fieldEl.dataset.sourceField !== activeField);
      }
    }

    async function loadFileOptions() {
      if (!fileInputEl || fileInputEl.tagName !== 'SELECT') return;
      try {
        const payload = await loadLabFilesPayload();
        const files = Array.isArray(payload.files) ? payload.files : [];
        if (files.length === 0) return;
        const previous = fileInputEl.dataset.loaded === '1'
          ? fileInputEl.value
          : (payload.defaultFile || fileInputEl.value || 'sample_h264.mp4');
        fileInputEl.innerHTML = '';
        for (const file of files) {
          const option = document.createElement('option');
          option.value = file;
          option.textContent = file;
          fileInputEl.appendChild(option);
        }
        fileInputEl.value = files.includes(previous) ? previous : files[0];
        fileInputEl.dataset.loaded = '1';
      } catch (error) {
        log(`파일 목록 로드 실패: ${error.message}`);
      }
    }

    async function loadLabFilesPayload() {
      if (labFilesPayload) return labFilesPayload;
      const response = await fetch('/lab/files', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`/lab/files HTTP ${response.status}`);
      }
      labFilesPayload = await response.json();
      return labFilesPayload;
    }

    async function loadImageAnalysisOptions() {
      if (!imageAnalysisTokenSelectEl || !imageAnalysisTokenEl) return;
      try {
        const payload = await loadLabFilesPayload();
        const sourceKind = imageAnalysisSourceKindEl ? imageAnalysisSourceKindEl.value : 'asset';
        const values = sourceKind === 'file'
          ? (Array.isArray(payload.imageFiles) ? payload.imageFiles : [])
          : (Array.isArray(payload.assetImages) ? payload.assetImages : []);
        const fallback = sourceKind === 'file'
          ? (values[0] || '')
          : (payload.defaultImage || values[0] || 'va-four-scene-sample.png');
        const previous = imageAnalysisTokenEl.value || fallback;
        imageAnalysisTokenSelectEl.innerHTML = '';
        for (const value of values) {
          const option = document.createElement('option');
          option.value = value;
          option.textContent = value;
          imageAnalysisTokenSelectEl.appendChild(option);
        }
        if (values.length === 0 && fallback) {
          const option = document.createElement('option');
          option.value = fallback;
          option.textContent = fallback;
          imageAnalysisTokenSelectEl.appendChild(option);
        }
        const selected = values.includes(previous) ? previous : fallback;
        if (selected) {
          imageAnalysisTokenSelectEl.value = selected;
          imageAnalysisTokenEl.value = selected;
        }
      } catch (error) {
        log(`이미지 목록 로드 실패: ${error.message}`);
      }
    }

    async function collectPeerStats(peer) {
      const summary = {
        inboundVideoBytes: 0,
        inboundVideoFramesDecoded: 0,
        inboundAudioBytes: 0,
        outboundVideoBytes: 0,
        outboundAudioBytes: 0
      };
      if (!peer) {
        return summary;
      }
      const stats = await peer.getStats();
      stats.forEach((report) => {
        const mediaType = report.kind || report.mediaType || '';
        if (report.type === 'inbound-rtp' && mediaType === 'video') {
          summary.inboundVideoBytes += Number(report.bytesReceived || 0);
          summary.inboundVideoFramesDecoded += Number(report.framesDecoded || 0);
        } else if (report.type === 'inbound-rtp' && mediaType === 'audio') {
          summary.inboundAudioBytes += Number(report.bytesReceived || 0);
        } else if (report.type === 'outbound-rtp' && mediaType === 'video') {
          summary.outboundVideoBytes += Number(report.bytesSent || 0);
        } else if (report.type === 'outbound-rtp' && mediaType === 'audio') {
          summary.outboundAudioBytes += Number(report.bytesSent || 0);
        }
      });
      return summary;
    }

    async function waitForPlayback(kind, timeoutMs = 15000, options = {}) {
      const targetVideo = kind === 'publisher' ? publisherVideoEl : videoEl;
      const targetPeer = kind === 'publisher' ? publisherPc : pc;
      const targetTrackKinds = kind === 'publisher' ? publisherTrackKinds : consumerTrackKinds;
      const shouldMute = kind === 'publisher' || options.muted === true;
      const startedAt = Date.now();
      while (Date.now() - startedAt < timeoutMs) {
        if (targetVideo.srcObject) {
          targetVideo.muted = shouldMute;
          try {
            const playPromise = targetVideo.play();
            if (playPromise && typeof playPromise.catch === 'function') {
              playPromise.catch(() => {});
            }
          } catch (_) {}
        }
        const connected = targetPeer && ['connected', 'completed'].includes(targetPeer.connectionState || '');
        const ready = targetVideo.readyState >= 2;
        const hasFrame = Number(targetVideo.videoWidth || 0) > 0;
        const hasTime = Number(targetVideo.currentTime || 0) > 0;
        const stats = await collectPeerStats(targetPeer);
        const expectsVideo = targetTrackKinds.has('video');
        const expectsAudio = targetTrackKinds.has('audio');
        const hasDecodedVideo = stats.inboundVideoFramesDecoded > 0 || (ready && hasFrame && (kind === 'publisher' || hasTime));
        const hasAudioTraffic = stats.inboundAudioBytes > 0;
        const hasExpectedConsumerMedia = kind === 'consumer' && (
          (expectsVideo && hasDecodedVideo) ||
          (!expectsVideo && expectsAudio && hasAudioTraffic) ||
          (!expectsVideo && !expectsAudio && (stats.inboundVideoBytes > 0 || stats.inboundAudioBytes > 0))
        );
        if (connected && ((ready && hasFrame && (kind === 'publisher' || hasTime)) || hasExpectedConsumerMedia)) {
          return { ...snapshotState(), stats };
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      const timeoutStats = await collectPeerStats(targetPeer);
      throw new Error(`timed out waiting for ${kind} playback: ${JSON.stringify({ ...snapshotState(), stats: timeoutStats })}`);
    }

    function buildQuery() {
      const params = new URLSearchParams();
      if (sourceTypeEl.value === 'file') {
        params.set('file', fileInputEl.value);
      } else if (sourceTypeEl.value === 'webrtc') {
        params.set('source', 'webrtc');
        params.set('url', webrtcSourceInputEl.value);
      } else if (sourceTypeEl.value === 'url') {
        params.set('url', urlInputEl.value);
      } else {
        params.set('source', sourceTypeEl.value);
        params.set('url', urlInputEl.value);
      }
      if (analysisOverlayInputEl && analysisOverlayInputEl.checked) {
        params.set('va', '1');
        if (analysisLabelLangInputEl && analysisLabelLangInputEl.value) {
          params.set('labelLang', analysisLabelLangInputEl.value);
        }
        const fpsOverride = rangeQueryValue(analysisFpsInputEl, { changedOnly: true });
        if (fpsOverride) params.set('fps', fpsOverride);
        const queueOverride = rangeQueryValue(analysisQueueInputEl, { changedOnly: true });
        if (queueOverride) params.set('maxQueue', queueOverride);
        const overlayWaitOverride = rangeQueryValue(analysisOverlayWaitInputEl, { changedOnly: true });
        if (overlayWaitOverride) {
          params.set('overlayWaitMs', overlayWaitOverride);
        }
        const overlayToleranceOverride = rangeQueryValue(analysisOverlayToleranceInputEl, { changedOnly: true });
        if (overlayToleranceOverride) {
          params.set('overlaySyncToleranceMs', overlayToleranceOverride);
        }
        if (analysisPreprocessInputEl && analysisPreprocessInputEl.value) {
          params.set('preprocess', analysisPreprocessInputEl.value);
        }
        if (analysisTrackIdsInputEl && analysisTrackIdsInputEl.checked) {
          params.set('trackIds', '1');
        }
        if (analysisTrackTrailsInputEl && analysisTrackTrailsInputEl.checked) {
          params.set('trackTrails', '1');
        }
        if (analysisRedactionInputEl && analysisRedactionInputEl.checked) {
          params.set('redaction', 'person-mosaic');
          const classes = analysisRedactionClassesInputEl && analysisRedactionClassesInputEl.value
            ? analysisRedactionClassesInputEl.value.trim()
            : 'person';
          params.set('redactionClasses', classes || 'person');
          const redactionBlockSize = rangeQueryValue(analysisRedactionBlockInputEl);
          if (redactionBlockSize) {
            params.set('redactionBlockSize', redactionBlockSize);
          }
          const redactionMarginRatio = rangeQueryValue(analysisRedactionMarginInputEl);
          if (redactionMarginRatio) {
            params.set('redactionMarginRatio', redactionMarginRatio);
          }
        }
      }
      return params.toString();
    }

    function buildImageAnalysisParams(mode = 'overlay') {
      const params = new URLSearchParams();
      const sourceKind = imageAnalysisSourceKindEl ? imageAnalysisSourceKindEl.value : 'asset';
      const token = imageAnalysisTokenEl && imageAnalysisTokenEl.value
        ? imageAnalysisTokenEl.value.trim()
        : 'va-four-scene-sample.png';
      if (sourceKind === 'file') {
        params.set('file', token);
      } else {
        params.set('asset', token);
      }
      if (imageAnalysisLabelLangEl && imageAnalysisLabelLangEl.value) {
        params.set('labelLang', imageAnalysisLabelLangEl.value);
      }
      const imageQuality = rangeQueryValue(imageAnalysisQualityEl);
      if (imageQuality) {
        params.set('quality', imageQuality);
      }
      const imageThickness = rangeQueryValue(imageAnalysisThicknessEl);
      if (imageThickness) {
        params.set('thickness', imageThickness);
      }
      if (mode !== 'snapshot' && imageAnalysisRedactionEl && imageAnalysisRedactionEl.checked) {
        params.set('redaction', 'person-mosaic');
        params.set('redactionClasses', 'person');
        const imageRedactionBlockSize = rangeQueryValue(imageAnalysisRedactionBlockEl);
        if (imageRedactionBlockSize) {
          params.set('redactionBlockSize', imageRedactionBlockSize);
        }
        const imageRedactionMarginRatio = rangeQueryValue(imageAnalysisRedactionMarginEl);
        if (imageRedactionMarginRatio) {
          params.set('redactionMarginRatio', imageRedactionMarginRatio);
        }
      }
      return params;
    }

    function detectionSummary(payload) {
      const detections = payload && payload.result && Array.isArray(payload.result.detections)
        ? payload.result.detections
        : [];
      const labels = [...new Set(detections.map((item) => item.label).filter(Boolean))].slice(0, 8);
      return {
        count: detections.length,
        labels,
        width: payload && payload.image ? payload.image.width : 0,
        height: payload && payload.image ? payload.image.height : 0,
        analysisMs: payload && typeof payload.analysisMs === 'number' ? payload.analysisMs : 0
      };
    }

    async function runImageAnalysis(mode = 'overlay') {
      if (!imageAnalysisPreviewEl || !imageAnalysisMetadataEl) return;
      const params = buildImageAnalysisParams(mode);
      if (imageAnalysisStatusEl) {
        imageAnalysisStatusEl.textContent = '분석 중...';
      }
      const metadataResponse = await fetch(`/lab/analysis/image?${params.toString()}`, { cache: 'no-store' });
      const metadataText = await metadataResponse.text();
      if (!metadataResponse.ok) {
        throw new Error(metadataText || `metadata HTTP ${metadataResponse.status}`);
      }
      const payload = JSON.parse(metadataText);
      imageAnalysisMetadataEl.textContent = JSON.stringify(payload, null, 2);
      const summary = detectionSummary(payload);
      const imageParams = new URLSearchParams(params);
      imageParams.set('_', String(Date.now()));
      const endpoint = mode === 'snapshot'
        ? '/lab/analysis/image/snapshot.jpg'
        : '/lab/analysis/image/overlay.jpg';
      imageAnalysisPreviewEl.src = `${endpoint}?${imageParams.toString()}`;
      if (imageAnalysisStatusEl) {
        const labelText = summary.labels.length > 0 ? ` / ${summary.labels.join(', ')}` : '';
        imageAnalysisStatusEl.textContent =
          `분석 완료: ${summary.count}개 객체${labelText} / ${summary.width}x${summary.height} / ${summary.analysisMs.toFixed(1)}ms`;
      }
    }

    async function stopSession() {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      if (sessionId) {
        await fetch(`${sessionBase}/${sessionId}`, { method: 'DELETE' }).catch(() => {});
      }
      sessionId = null;
      consumerLocalIceCount = 0;
      consumerRemoteIceCount = 0;
      consumerEmptyIcePolls = 0;
      consumerTrackKinds.clear();
      resetCandidateTypes(consumerCandidateTypes);
      updateCandidateSummaries();
      if (pc) {
        pc.close();
        pc = null;
      }
      videoEl.srcObject = null;
      log('세션 중지');
    }

    async function stopPublisher() {
      if (publisherPollTimer) {
        clearInterval(publisherPollTimer);
        publisherPollTimer = null;
      }
      if (publisherSessionId) {
        await fetch(`/whip/publish/session/${publisherSessionId}`, { method: 'DELETE' }).catch(() => {});
      }
      publisherSessionId = null;
      publisherLocalIceCount = 0;
      publisherRemoteIceCount = 0;
      publisherEmptyIcePolls = 0;
      publisherTrackKinds.clear();
      resetCandidateTypes(publisherCandidateTypes);
      updateCandidateSummaries();
      if (publisherPc) {
        publisherPc.close();
        publisherPc = null;
      }
      if (publisherStream) {
        for (const track of publisherStream.getTracks()) {
          track.stop();
        }
        publisherStream = null;
      }
      publisherVideoEl.srcObject = null;
      log('발행 세션 중지');
    }

    async function pollIce() {
      if (!sessionId) return;
      const response = await fetch(`${sessionBase}/${sessionId}/ice`);
      if (!response.ok) return;
      const payload = await response.json();
      const candidates = payload.candidates || [];
      for (const item of candidates) {
        await pc.addIceCandidate(item);
        consumerRemoteIceCount += 1;
        recordCandidateType(consumerCandidateTypes, 'remote', item.candidate);
      }
      if (candidates.length > 0) {
        consumerEmptyIcePolls = 0;
        log(`consumer remote ICE +${candidates.length} (total=${consumerRemoteIceCount})`);
      } else if (pc && ['connected', 'completed'].includes(pc.iceConnectionState || '')) {
        consumerEmptyIcePolls += 1;
        if (consumerEmptyIcePolls >= 3 && pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
          log('consumer ICE polling stopped');
        }
      }
    }

    async function pollPublisherIce() {
      if (!publisherSessionId || !publisherPc) return;
      const response = await fetch(`/whip/publish/session/${publisherSessionId}/ice`);
      if (!response.ok) return;
      const payload = await response.json();
      const candidates = payload.candidates || [];
      for (const item of candidates) {
        await publisherPc.addIceCandidate(item);
        publisherRemoteIceCount += 1;
        recordCandidateType(publisherCandidateTypes, 'remote', item.candidate);
      }
      if (candidates.length > 0) {
        publisherEmptyIcePolls = 0;
        log(`publisher remote ICE +${candidates.length} (total=${publisherRemoteIceCount})`);
      } else if (publisherPc && ['connected', 'completed'].includes(publisherPc.iceConnectionState || '')) {
        publisherEmptyIcePolls += 1;
        if (publisherEmptyIcePolls >= 3 && publisherPollTimer) {
          clearInterval(publisherPollTimer);
          publisherPollTimer = null;
          log('publisher ICE polling stopped');
        }
      }
    }

    async function startSimple() {
      await stopSession();
      sessionBase = '/webrtc/session';
      pc = await createPeerConnection('consumer');
      pc.onconnectionstatechange = () => log(`consumer connectionState=${pc.connectionState}`);
      pc.oniceconnectionstatechange = () => log(`consumer iceConnectionState=${pc.iceConnectionState}`);
      pc.ontrack = (event) => {
        videoEl.srcObject = event.streams[0];
        videoEl.muted = false;
        videoEl.volume = 1.0;
        consumerTrackKinds.add(event.track.kind);
        log(`consumer ontrack kind=${event.track.kind}`);
      };
      pc.onicecandidate = async (event) => {
        if (!sessionId || !event.candidate) return;
        consumerLocalIceCount += 1;
        recordCandidateType(consumerCandidateTypes, 'local', event.candidate.candidate);
        log(`consumer local ICE +1 (total=${consumerLocalIceCount})`);
        await fetch(`${sessionBase}/${sessionId}/ice`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            candidate: event.candidate.candidate
          })
        });
      };

      const response = await fetch(`/webrtc/session?${buildQuery()}`, { method: 'POST' });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'WebRTC 세션 생성 실패');
      }

      sessionId = payload.sessionId;
      sdpBox.value = payload.offer;
      await pc.setRemoteDescription({ type: 'offer', sdp: payload.offer });
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await fetch(`${sessionBase}/${sessionId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: answer.sdp
      });
      log(`simple signaling 세션 생성: ${sessionId}`);
      pollTimer = setInterval(() => { pollIce().catch((error) => log(error.message)); }, 1000);
    }

    async function startWhep() {
      await stopSession();
      sessionBase = '/whep/session';
      pc = await createPeerConnection('consumer');
      pc.addTransceiver('video', { direction: 'recvonly' });
      pc.addTransceiver('audio', { direction: 'recvonly' });
      pc.onconnectionstatechange = () => log(`consumer connectionState=${pc.connectionState}`);
      pc.oniceconnectionstatechange = () => log(`consumer iceConnectionState=${pc.iceConnectionState}`);
      pc.ontrack = (event) => {
        videoEl.srcObject = event.streams[0];
        videoEl.muted = false;
        videoEl.volume = 1.0;
        consumerTrackKinds.add(event.track.kind);
        log(`consumer ontrack kind=${event.track.kind}`);
      };
      pc.onicecandidate = async (event) => {
        if (!sessionId || !event.candidate) return;
        consumerLocalIceCount += 1;
        recordCandidateType(consumerCandidateTypes, 'local', event.candidate.candidate);
        log(`consumer local ICE +1 (total=${consumerLocalIceCount})`);
        await fetch(`${sessionBase}/${sessionId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            candidate: event.candidate.candidate
          })
        });
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const response = await fetch(`/whep?${buildQuery()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: offer.sdp
      });
      const answer = await response.text();
      if (!response.ok) {
        throw new Error(answer || 'WHEP 세션 생성 실패');
      }
      const location = response.headers.get('Location') || '';
      sessionId = location.split('/').pop();
      sdpBox.value = answer;
      await pc.setRemoteDescription({ type: 'answer', sdp: answer });
      log(`WHEP 세션 생성: ${sessionId}`);
      pollTimer = setInterval(() => { pollIce().catch((error) => log(error.message)); }, 1000);
    }

    async function startPublish() {
      await stopPublisher();
      publisherPc = await createPeerConnection('publisher');
      publisherPc.onconnectionstatechange = () => log(`publisher connectionState=${publisherPc.connectionState}`);
      publisherPc.oniceconnectionstatechange = () => log(`publisher iceConnectionState=${publisherPc.iceConnectionState}`);
      publisherStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      publisherVideoEl.srcObject = publisherStream;
      for (const track of publisherStream.getTracks()) {
        publisherTrackKinds.add(track.kind);
        publisherPc.addTrack(track, publisherStream);
      }

      if (window.RTCRtpSender && typeof RTCRtpSender.getCapabilities === 'function') {
        for (const transceiver of publisherPc.getTransceivers()) {
          if (!transceiver.sender || !transceiver.sender.track) continue;
          const kind = transceiver.sender.track.kind;
          const caps = RTCRtpSender.getCapabilities(kind);
          if (!caps || !Array.isArray(caps.codecs)) continue;
          if (kind === 'video') {
            const preferred = caps.codecs.filter((codec) => {
              const mime = (codec.mimeType || '').toLowerCase();
              return mime === 'video/h264' || mime === 'video/rtx';
            });
            if (preferred.length > 0) {
              transceiver.setCodecPreferences(preferred);
              log('발행 codec 우선순위: H264');
            }
          } else if (kind === 'audio') {
            const preferred = caps.codecs.filter((codec) => {
              const mime = (codec.mimeType || '').toLowerCase();
              return mime === 'audio/opus' || mime === 'audio/red' || mime === 'audio/rtx';
            });
            if (preferred.length > 0) {
              transceiver.setCodecPreferences(preferred);
              log('발행 codec 우선순위: Opus');
            }
          }
        }
      }

      publisherPc.onicecandidate = async (event) => {
        if (!publisherSessionId || !event.candidate) return;
        publisherLocalIceCount += 1;
        recordCandidateType(publisherCandidateTypes, 'local', event.candidate.candidate);
        log(`publisher local ICE +1 (total=${publisherLocalIceCount})`);
        await fetch(`/whip/publish/session/${publisherSessionId}/ice`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            candidate: event.candidate.candidate
          })
        });
      };

      const offer = await publisherPc.createOffer();
      await publisherPc.setLocalDescription(offer);
      const response = await fetch(`/whip/publish?sourceId=${encodeURIComponent(publishSourceIdInputEl.value)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: offer.sdp
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'WHIP 발행 세션 생성 실패');
      }

      publisherSessionId = payload.sessionId;
      await publisherPc.setRemoteDescription({ type: 'answer', sdp: payload.answer });
      sourceTypeEl.value = 'webrtc';
      webrtcSourceInputEl.value = payload.sourceId;
      publishSourceIdInputEl.value = payload.sourceId;
      updateSourceFields();
      log(`발행 세션 생성: ${publisherSessionId} sourceId=${payload.sourceId}`);
      publisherPollTimer = setInterval(() => { pollPublisherIce().catch((error) => log(error.message)); }, 1000);
    }

    async function playPublishedSimple() {
      sourceTypeEl.value = 'webrtc';
      updateSourceFields();
      await startSimple();
    }

    async function playPublishedWhep() {
      sourceTypeEl.value = 'webrtc';
      updateSourceFields();
      await startWhep();
    }

    document.getElementById('startBtn').onclick = () => startSimple().catch((error) => log(error.message));
    document.getElementById('whepBtn').onclick = () => startWhep().catch((error) => log(error.message));
    document.getElementById('stopBtn').onclick = () => stopSession().catch((error) => log(error.message));
    document.getElementById('publishBtn').onclick = () => startPublish().catch((error) => log(error.message));
    document.getElementById('stopPublishBtn').onclick = () => stopPublisher().catch((error) => log(error.message));
    document.getElementById('consumePublishedBtn').onclick = () => playPublishedSimple().catch((error) => log(error.message));
    document.getElementById('consumePublishedWhepBtn').onclick = () => playPublishedWhep().catch((error) => log(error.message));
    document.getElementById('clearBtn').onclick = () => { logEl.textContent = ''; };
    document.getElementById('multiSingleBtn').onclick = () => runMultichannelManual('single').catch((error) => appendMultiLog(error.message));
    document.getElementById('multiManyBtn').onclick = () => runMultichannelManual('many').catch((error) => appendMultiLog(error.message));
    document.getElementById('multiStopBtn').onclick = () => stopMultichannelManual().catch((error) => appendMultiLog(error.message));
    if (eventPostRefreshBtnEl) {
      eventPostRefreshBtnEl.onclick = () => refreshEventPostStatus().catch((error) => {
        if (eventPostStatusPanelEl) eventPostStatusPanelEl.textContent = `event POST 상태 실패: ${error.message}`;
      });
    }
    if (reportRefreshBtnEl) {
      reportRefreshBtnEl.onclick = () => refreshReportList().catch((error) => {
        if (reportContentEl) reportContentEl.textContent = `리포트 목록 실패: ${error.message}`;
      });
    }
    if (reportOpenBtnEl) {
      reportOpenBtnEl.onclick = () => openSelectedReport().catch((error) => {
        if (reportContentEl) reportContentEl.textContent = `리포트 열기 실패: ${error.message}`;
      });
    }
    if (imageAnalysisOverlayBtn) {
      imageAnalysisOverlayBtn.onclick = () => runImageAnalysis('overlay').catch((error) => {
        if (imageAnalysisStatusEl) imageAnalysisStatusEl.textContent = `분석 실패: ${error.message}`;
        log(`정적 이미지 분석 실패: ${error.message}`);
      });
    }
    if (imageAnalysisSnapshotBtn) {
      imageAnalysisSnapshotBtn.onclick = () => runImageAnalysis('snapshot').catch((error) => {
        if (imageAnalysisStatusEl) imageAnalysisStatusEl.textContent = `분석 실패: ${error.message}`;
        log(`정적 이미지 분석 실패: ${error.message}`);
      });
    }
    if (imageAnalysisSourceKindEl) {
      imageAnalysisSourceKindEl.addEventListener('change', () => {
        if (!imageAnalysisTokenEl) return;
        imageAnalysisTokenEl.value = imageAnalysisSourceKindEl.value === 'file'
          ? ''
          : 'va-four-scene-sample.png';
        loadImageAnalysisOptions();
      });
    }
    if (imageAnalysisTokenSelectEl) {
      imageAnalysisTokenSelectEl.addEventListener('change', () => {
        if (imageAnalysisTokenEl) {
          imageAnalysisTokenEl.value = imageAnalysisTokenSelectEl.value;
        }
      });
    }
    function applyTheme(theme) {
      const nextTheme = theme === 'dark' ? 'dark' : 'light';
      document.documentElement.dataset.theme = nextTheme;
      localStorage.setItem('mediaServerTheme', nextTheme);
      const themeButton = document.getElementById('themeToggleBtn');
      if (themeButton) {
        themeButton.textContent = nextTheme === 'dark' ? '라이트 모드' : '다크 모드';
      }
    }
    function notifyEmbeddedSourceChanged() {
      window.postMessage({ type: 'mediaServer.sourceChanged', query: buildQuery() }, window.location.origin);
    }
    function transformComponentScript(text) {
      return text
        .replaceAll('document.getElementById(', 'root.getElementById(')
        .replaceAll('document.querySelector(', 'root.querySelector(')
        .replaceAll('document.querySelectorAll(', 'root.querySelectorAll(')
        .replaceAll("root.getElementById('themeToggleBtn').onclick = () => {", "const __themeToggleBtn = root.getElementById('themeToggleBtn'); if (__themeToggleBtn) __themeToggleBtn.onclick = () => {")
        .replaceAll("$('themeToggleBtn').onclick = () => {", "if ($('themeToggleBtn')) $('themeToggleBtn').onclick = () => {");
    }
    function isComponentBootScript(text) {
      const compact = text.replace(/\s+/g, ' ');
      return compact.includes(`const saved = localStorage.getItem('mediaServerTheme')`)
        && compact.includes(`document.documentElement.dataset.embed = params.get('embed') === '1' ? '1' : '0'`);
    }
    async function hydrateLabComponent(host) {
      const url = host.dataset.componentUrl;
      if (!url) return;
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error(`${url} HTTP ${response.status}`);
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' });
      shadow.innerHTML = '';
      const baseStyle = document.createElement('style');
      baseStyle.textContent = `
        :host {
          display: block;
          color: var(--ink);
          font-family: "Avenir Next", "Pretendard", "Noto Sans KR", sans-serif;
          --accent2: var(--accent-2);
          --panel2: var(--panel-soft);
          --soft-bg: var(--details-bg);
          --canvas-bg: var(--code-bg);
          --danger: #ff7777;
        }
        .topbar, .standalone-nav { display: none !important; }
        .component-main {
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 0 !important;
          display: grid !important;
          gap: 22px !important;
        }
        .component-main > .hero {
          box-shadow: none !important;
          border-radius: 24px !important;
          background:
            radial-gradient(circle at 100% 0%, rgba(240,179,91,0.16), transparent 34%),
            var(--soft-bg) !important;
        }
        .component-main > .card,
        .component-main .card {
          box-shadow: none !important;
          border-radius: 22px !important;
        }
        .component-main .pad {
          padding: 22px !important;
        }
        .component-main .grid {
          gap: 22px !important;
        }
        .component-main textarea,
        .component-main pre {
          border-radius: 18px !important;
        }
      `;
      shadow.appendChild(baseStyle);
      for (const style of doc.querySelectorAll('style')) {
        const clonedStyle = document.createElement('style');
        clonedStyle.textContent = style.textContent || '';
        shadow.appendChild(clonedStyle);
      }
      const main = doc.querySelector('main');
      if (main) {
        const componentMain = document.createElement('main');
        componentMain.className = 'component-main';
        for (const child of Array.from(main.children)) {
          if (child.classList && (child.classList.contains('topbar') || child.classList.contains('standalone-nav'))) {
            continue;
          }
          componentMain.appendChild(document.importNode(child, true));
        }
        shadow.appendChild(componentMain);
      }
      for (const dialog of doc.querySelectorAll('body > dialog')) {
        shadow.appendChild(document.importNode(dialog, true));
      }
      for (const script of doc.querySelectorAll('script')) {
        const scriptText = script.textContent || '';
        if (!scriptText.trim()) continue;
        if (isComponentBootScript(scriptText)) continue;
        try {
          new Function('root', transformComponentScript(scriptText))(shadow);
        } catch (error) {
          host.textContent = `컴포넌트 초기화 실패: ${error.message}`;
          throw error;
        }
      }
      host.classList.add('is-loaded');
    }
    async function hydrateLabComponents() {
      const hosts = Array.from(document.querySelectorAll('[data-component-url]'));
      for (const host of hosts) {
        try {
          await hydrateLabComponent(host);
        } catch (error) {
          host.textContent = `컴포넌트 로드 실패: ${error.message}`;
        }
      }
    }
    document.getElementById('themeToggleBtn').onclick = () => {
      applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    };
    applyTheme(document.documentElement.dataset.theme);
    sourceTypeEl.addEventListener('change', () => {
      updateSourceFields();
      notifyEmbeddedSourceChanged();
    });
    for (const sourceInput of [fileInputEl, urlInputEl, webrtcSourceInputEl]) {
      if (sourceInput) {
        sourceInput.addEventListener('change', notifyEmbeddedSourceChanged);
      }
    }
    bindRangeControls();
    updateSourceFields();
    updateCandidateSummaries();
    loadWebRtcConfig().catch((error) => log(`ICE config 로드 실패: ${error.message}`));
    refreshRuntimeStatus().catch((error) => log(`runtime status 로드 실패: ${error.message}`));
    runtimeStatusTimer = setInterval(() => { refreshRuntimeStatus().catch((error) => log(`runtime status 로드 실패: ${error.message}`)); }, 2000);
    refreshEventPostStatus().catch((error) => log(`event POST 상태 로드 실패: ${error.message}`));
    refreshReportList().catch((error) => log(`검증 리포트 목록 로드 실패: ${error.message}`));
    loadFileOptions();
    loadImageAnalysisOptions();
    if (imageAnalysisOverlayBtn) {
      runImageAnalysis('overlay').catch((error) => {
        if (imageAnalysisStatusEl) imageAnalysisStatusEl.textContent = `자동 분석 실패: ${error.message}`;
      });
    }
    window.__mediaServerTestApi = {
      startSimple,
      startWhep,
      stopSession,
      startPublish,
      stopPublisher,
      playPublishedSimple,
      playPublishedWhep,
      runImageAnalysis,
      buildQuery,
      waitForPlayback,
      runMultichannelManual,
      stopMultichannelManual,
      refreshRuntimeStatus,
      refreshEventPostStatus,
      refreshReportList,
      openSelectedReport,
      snapshotState,
      collectPeerStats
    };
    hydrateLabComponents().catch((error) => log(`컴포넌트 로드 실패: ${error.message}`));
    window.addEventListener('beforeunload', () => {
      if (runtimeStatusTimer) clearInterval(runtimeStatusTimer);
      stopMultichannelManual();
      stopSession();
      stopPublisher();
    });
  </script>
</body>
</html>)";
}

std::string AnalysisCategoryCatalogJson();

std::string BuildLabRuleEditorPageHtml() {
    std::string html = R"RULEPAGE(<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>영상 분석 관리</title>
  <script>
    (() => {
      const saved = localStorage.getItem('mediaServerTheme');
      document.documentElement.dataset.theme = saved === 'dark' ? 'dark' : 'light';
      const params = new URLSearchParams(window.location.search);
      document.documentElement.dataset.embed = params.get('embed') === '1' ? '1' : '0';
    })();
  </script>
  <style>
    :root {
      --bg: #f6f1e8;
      --panel: #fffaf0;
      --panel2: #f3ead8;
      --ink: #172026;
      --muted: #66737c;
      --accent: #0b6e69;
      --accent2: #f0b35b;
      --danger: #d54b4b;
      --line: rgba(23,32,38,0.12);
      --card-bg: rgba(255,250,240,0.9);
      --field-bg: rgba(255,255,255,0.86);
      --secondary-bg: #fff;
      --soft-bg: rgba(11,110,105,0.08);
      --code-bg: #172026;
      --code-ink: #e8f4f1;
      --canvas-bg: #f1e7d5;
      --shadow: 0 22px 70px rgba(38,44,54,0.14);
    }
    :root[data-theme="dark"] {
      --bg: #252525;
      --panel: #2b2b2b;
      --panel2: #303030;
      --ink: #f4f4f4;
      --muted: #b6b6b6;
      --accent: #ff4d8d;
      --accent2: #ff9f66;
      --danger: #ff7777;
      --line: rgba(255,255,255,0.10);
      --card-bg: rgba(42,42,42,0.92);
      --field-bg: rgba(18,18,18,0.88);
      --secondary-bg: rgba(255,255,255,0.08);
      --soft-bg: rgba(255,255,255,0.055);
      --code-bg: rgba(14,14,14,0.94);
      --code-ink: #efefef;
      --canvas-bg: #191919;
      --shadow: 18px 24px 52px rgba(0,0,0,0.46), -10px -10px 34px rgba(255,255,255,0.035);
    }
    * { box-sizing: border-box; }
    [hidden] { display: none !important; }
    body {
      margin: 0;
      font-family: "Avenir Next", "Pretendard", sans-serif;
      color: var(--ink);
      background:
        radial-gradient(circle at 10% -8%, rgba(240,179,91,0.32), transparent 28%),
        radial-gradient(circle at 92% 8%, rgba(11,110,105,0.16), transparent 26%),
        linear-gradient(145deg, #fbf8f0 0%, var(--bg) 54%, #eaf3ef 100%);
      min-height: 100vh;
    }
    :root[data-theme="dark"] body {
      background:
        radial-gradient(circle at 18% 8%, rgba(255,77,141,0.08), transparent 30%),
        radial-gradient(circle at 82% 2%, rgba(255,159,102,0.06), transparent 32%),
        linear-gradient(135deg, #202020 0%, var(--bg) 54%, #202020 100%);
    }
    :root[data-embed="1"] body {
      background: transparent;
      min-height: auto;
    }
    main {
      max-width: 1280px;
      margin: 0 auto;
      padding: 32px 20px 56px;
      display: grid;
      gap: 20px;
    }
    :root[data-embed="1"] main {
      max-width: none;
      padding: 0;
    }
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 14px;
      color: var(--muted);
      font-size: 13px;
    }
    .topbar strong { color: var(--ink); }
    .standalone-nav { display: none; }
    .theme-toggle {
      width: auto;
      min-width: 112px;
      padding: 9px 13px;
      border-radius: 999px;
      background: var(--secondary-bg);
      color: var(--ink);
      border: 1px solid var(--line);
      box-shadow: none;
    }
    :root[data-embed="1"] .topbar {
      display: none;
    }
    a { color: var(--accent); text-decoration: none; font-weight: 700; }
    a:hover { text-decoration: underline; }
    h1 { margin: 0; font-size: 36px; letter-spacing: -0.03em; }
    h2 { margin: 0; font-size: 22px; letter-spacing: -0.02em; }
    p { color: var(--muted); line-height: 1.55; }
    .section-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .count-badge {
      display: inline-flex;
      align-items: center;
      min-height: 28px;
      padding: 5px 10px;
      border-radius: 999px;
      border: 1px solid var(--line);
      background: var(--soft-bg);
      color: var(--muted);
      font-size: 12px;
      font-weight: 800;
    }
    .management-toolbar {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px;
      align-items: end;
    }
    .management-toolbar .toolbar-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .dashboard-header-actions {
      flex-direction: column;
      align-items: flex-end;
      gap: 6px;
    }
    .dashboard-header-actions #dashboardStatusText {
      max-width: 360px;
      text-align: right;
    }
	    .management-toolbar .toolbar-actions button {
	      width: auto;
	      min-width: 120px;
	      white-space: nowrap;
	    }
	    #vaRuleLibraryCard .management-toolbar {
	      grid-template-columns: 1fr;
	      align-items: start;
	    }
	    #vaRuleLibraryCard .management-toolbar .toolbar-actions {
	      justify-content: flex-start;
	    }
	    #vaRuleLibraryCard .management-toolbar .toolbar-actions button {
	      min-width: 180px;
	    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
    }
    .summary-tile {
      min-height: 76px;
      padding: 13px;
      border: 1px solid var(--line);
      border-radius: 16px;
      background: var(--soft-bg);
      display: grid;
      gap: 4px;
    }
    .summary-tile span {
      color: var(--muted);
      font-size: 12px;
      font-weight: 800;
    }
    .summary-tile strong {
      color: var(--ink);
      font-size: 22px;
      letter-spacing: -0.02em;
    }
    .rule-list-panel {
      display: grid;
      gap: 10px;
    }
	    .rule-list-controls {
	      display: grid;
	      grid-template-columns: minmax(220px, 1fr) minmax(130px, 0.3fr) minmax(150px, 0.35fr) minmax(88px, 0.18fr);
	      gap: 10px;
	      align-items: start;
	    }
	    .rule-filter-summary {
	      min-height: 0;
	      padding: 0;
	      display: grid;
	      gap: 6px;
	    }
	    .rule-filter-summary span {
	      color: var(--ink);
	      font-size: 13px;
	      font-weight: 800;
	    }
	    .rule-filter-summary strong {
	      min-height: 44px;
	      display: flex;
	      align-items: center;
	      padding: 0 12px;
	      border: 1px solid var(--line);
	      border-radius: 14px;
	      background: var(--field-bg);
	      color: var(--muted);
	      font-size: 14px;
	      font-weight: 800;
	    }
    .rule-list {
      display: grid;
      gap: 8px;
    }
	    .rule-row {
	      display: grid;
	      grid-template-columns: 64px minmax(150px, 1.1fr) minmax(150px, 0.85fr) minmax(170px, 1fr) minmax(130px, 0.75fr) minmax(190px, 0.75fr);
	      gap: 10px;
	      align-items: start;
	      padding: 12px;
	      border: 1px solid var(--line);
	      border-radius: 16px;
	      background: var(--field-bg);
	      text-align: left;
	    }
	    .rule-row > * {
	      min-width: 0;
	    }
	    .rule-row.is-header {
	      min-height: 0;
	      padding: 0 12px;
      border: 0;
      background: transparent;
	      color: var(--muted);
	      font-size: 12px;
	      font-weight: 800;
	      align-items: center;
	    }
    .rule-row.is-selected {
      border-color: rgba(11,110,105,0.52);
      box-shadow: inset 0 0 0 1px rgba(11,110,105,0.20);
    }
    :root[data-theme="dark"] .rule-row.is-selected {
      border-color: rgba(255,77,141,0.55);
      box-shadow: inset 0 0 0 1px rgba(255,77,141,0.18);
    }
    .rule-main {
      display: grid;
      gap: 4px;
      min-width: 0;
    }
    .rule-main strong, .rule-cell {
      overflow-wrap: anywhere;
    }
    .rule-main span, .rule-cell {
      color: var(--muted);
      font-size: 12px;
      line-height: 1.35;
    }
    .rule-cell-stack {
      display: grid;
      gap: 6px;
      align-content: center;
    }
    .rule-cell-stack strong {
      color: var(--ink);
      font-size: 13px;
    }
    .rule-cell-stack span {
      overflow-wrap: anywhere;
    }
	    .rule-id-badge, .status-chip {
	      display: inline-flex;
	      align-items: center;
	      justify-content: center;
      min-height: 30px;
      padding: 5px 9px;
      border-radius: 999px;
      border: 1px solid var(--line);
      background: var(--soft-bg);
      color: var(--ink);
      font-weight: 900;
	      font-size: 12px;
	      white-space: nowrap;
	      width: fit-content;
	      max-width: 100%;
	    }
    .status-chip.is-muted {
      color: var(--muted);
      background: var(--secondary-bg);
    }
    .status-chip.is-active {
      color: #fff;
      border-color: transparent;
      background: linear-gradient(135deg, var(--accent), var(--accent2));
    }
    .status-chip.is-scenario {
      color: #fff;
      border-color: transparent;
      background: linear-gradient(135deg, var(--accent), var(--accent2));
    }
    .status-chip.is-warning {
      color: var(--danger);
      background: var(--secondary-bg);
    }
    .status-chip.is-phase-candidate {
      color: #174ea6;
      background: rgba(66,133,244,0.13);
    }
    .status-chip.is-phase-observing {
      color: #0b6e69;
      background: rgba(11,110,105,0.14);
    }
    .status-chip.is-phase-confirmed {
      color: #0f5132;
      background: rgba(34,197,94,0.15);
    }
    .status-chip.is-phase-cooldown {
      color: #9a3412;
      background: rgba(249,115,22,0.16);
    }
    .status-chip.is-phase-ended {
      color: var(--muted);
      background: var(--secondary-bg);
    }
	    .row-actions {
	      display: flex;
	      flex-wrap: wrap;
	      justify-content: flex-end;
	      align-items: center;
	      gap: 4px;
	    }
	    .row-actions button {
	      flex: 0 0 auto;
	      width: auto;
	      min-width: 40px;
	      min-height: 32px;
	      padding: 6px 7px;
	      border-radius: 10px;
	      font-size: 12px;
	    }
	    .rule-cell-stack button {
	      width: fit-content;
	      min-width: 90px;
	    }
    .empty-state {
      padding: 18px;
      border: 1px dashed var(--line);
      border-radius: 16px;
      background: var(--soft-bg);
      color: var(--muted);
      text-align: center;
    }
    .editor-panel {
      scroll-margin-top: 18px;
    }
    .editor-heading {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      flex-wrap: wrap;
    }
    .edit-step-nav {
      grid-template-columns: repeat(4, minmax(0, 1fr));
      box-shadow: none;
    }
    .edit-step-card {
      scroll-margin-top: 86px;
    }
    .step-title {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    .step-title > span {
      width: 34px;
      height: 34px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 auto;
      border-radius: 999px;
      background: linear-gradient(135deg, var(--accent), var(--accent2));
      color: #fff;
      font-weight: 900;
    }
    .step-title h2 {
      margin-bottom: 4px;
    }
    .inline-details {
      border: 1px solid var(--line);
      border-radius: 16px;
      background: var(--soft-bg);
      overflow: hidden;
    }
    .inline-details > summary {
      cursor: pointer;
      padding: 13px 14px;
      color: var(--ink);
      font-weight: 900;
    }
    .inline-details > .stack,
    .inline-details > label {
      padding: 0 14px 14px;
    }
    .review-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .review-tile {
      min-height: 74px;
      padding: 12px;
      border: 1px solid var(--line);
      border-radius: 16px;
      background: var(--soft-bg);
      display: grid;
      gap: 4px;
    }
    .review-tile strong {
      color: var(--ink);
      font-size: 13px;
    }
    .review-tile span {
      color: var(--muted);
      font-size: 12px;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }
    .profile-summary-panel {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      padding: 12px;
      border: 1px solid var(--line);
      border-radius: 16px;
      background: var(--soft-bg);
    }
    .profile-summary-item {
      min-height: 64px;
      padding: 10px 11px;
      border: 1px solid var(--line);
      border-radius: 12px;
      background: var(--field-bg);
      display: grid;
      gap: 4px;
      align-content: center;
    }
    .profile-summary-item span {
      color: var(--muted);
      font-size: 11px;
      font-weight: 900;
    }
    .profile-summary-item strong {
      color: var(--ink);
      font-size: 14px;
      overflow-wrap: anywhere;
    }
    .profile-delete-note {
      min-height: 38px;
      padding: 10px 12px;
      border: 1px solid var(--line);
      border-radius: 12px;
      background: var(--field-bg);
      color: var(--muted);
      font-size: 12px;
      line-height: 1.4;
    }
    .profile-delete-note.is-warning {
      color: var(--danger);
      border-color: rgba(213,75,75,0.45);
    }
    .readonly-id {
      min-height: 44px;
      display: flex;
      align-items: center;
      padding: 11px 13px;
      border: 1px solid var(--line);
      border-radius: 14px;
      background: var(--soft-bg);
      color: var(--ink);
      font-weight: 900;
    }
    .feedback-toast {
      position: sticky;
      top: 12px;
      z-index: 20;
      display: none;
      padding: 13px 16px;
      border: 1px solid var(--line);
      border-radius: 14px;
      background: var(--card-bg);
      color: var(--ink);
      box-shadow: var(--shadow);
      font-weight: 800;
    }
    .feedback-toast.is-visible {
      display: block;
    }
    .feedback-toast.is-success {
      border-color: rgba(11,110,105,0.45);
      background: rgba(11,110,105,0.13);
    }
    .feedback-toast.is-error {
      border-color: rgba(213,75,75,0.55);
      background: rgba(213,75,75,0.14);
    }
    .validation-summary {
      display: grid;
      gap: 8px;
      padding: 12px;
      border: 1px solid var(--line);
      border-radius: 14px;
      background: var(--soft-bg);
    }
    .validation-summary.is-ok {
      border-color: rgba(11,110,105,0.45);
      background: rgba(11,110,105,0.10);
    }
    .validation-summary.is-error {
      border-color: rgba(213,75,75,0.55);
      background: rgba(213,75,75,0.12);
    }
    .validation-item {
      display: grid;
      gap: 3px;
      padding: 8px 10px;
      border-radius: 11px;
      background: rgba(255,255,255,0.42);
    }
    :root[data-theme="dark"] .validation-item {
      background: rgba(255,255,255,0.055);
    }
    .validation-item strong {
      color: var(--ink);
      font-size: 12px;
    }
    .validation-item span {
      color: var(--muted);
      font-size: 12px;
      line-height: 1.35;
    }
    .dirty-state {
      margin: 0;
      font-size: 0.9rem;
      color: var(--muted);
    }
    .dirty-state.is-dirty {
      color: var(--danger);
      font-weight: 800;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--line);
      border-radius: 24px;
      box-shadow: var(--shadow);
      overflow: hidden;
    }
    :root[data-embed="1"] .card {
      box-shadow: none;
      border-radius: 20px;
    }
    .pad { padding: 24px; }
    .grid { display: grid; grid-template-columns: 1fr; gap: 18px; align-items: start; }
    .stack { display: grid; gap: 14px; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    label { display: grid; gap: 6px; color: var(--muted); font-size: 13px; }
    input, select, textarea, button {
      width: 100%;
      border-radius: 14px;
      border: 1px solid var(--line);
      background: var(--field-bg);
      color: var(--ink);
      padding: 11px 13px;
      font: inherit;
    }
    input[type="checkbox"] { width: auto; }
    input[type="range"] { padding: 0; accent-color: var(--accent); }
    textarea { min-height: 190px; resize: vertical; }
    button {
      border: 0;
      color: #fff;
      font-weight: 800;
      cursor: pointer;
      background: linear-gradient(135deg, var(--accent), var(--accent2));
    }
    button:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }
    button.secondary {
      color: var(--ink);
      border: 1px solid var(--line);
      background: var(--secondary-bg);
    }
    button.danger {
      color: #180b0b;
      background: linear-gradient(135deg, var(--danger), #ffb0a8);
    }
    .hero {
      display: grid;
      gap: 10px;
      margin-bottom: 0;
      padding: 24px;
      background: var(--card-bg);
      border: 1px solid var(--line);
      border-radius: 24px;
      box-shadow: var(--shadow);
      overflow: hidden;
    }
    :root[data-embed="1"] .hero {
      padding: 24px;
      box-shadow: none;
      border-radius: 20px;
    }
    :root[data-embed="1"] h1 {
      font-size: 30px;
    }
    .check-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      overflow: visible;
    }
    .check-grid label {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 10px;
      border: 1px solid var(--line);
      border-radius: 14px;
      background: var(--soft-bg);
      color: var(--ink);
    }
    .check-grid label.is-hidden { display: none; }
    .class-group-title {
      grid-column: 1 / -1;
      margin-top: 8px;
      padding: 8px 10px;
      border-radius: 12px;
      background: var(--soft-bg);
      color: var(--accent);
      font-weight: 800;
      font-size: 13px;
      letter-spacing: -0.01em;
    }
    .class-group-title.is-hidden { display: none; }
    .class-tools {
      display: grid;
      gap: 8px;
    }
    .class-filter-row {
      display: grid;
      grid-template-columns: minmax(220px, 0.4fr) minmax(0, 1fr);
      gap: 10px;
      align-items: end;
    }
    .pill-grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 8px;
    }
    .segmented {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      padding: 4px;
      border: 1px solid var(--line);
      border-radius: 16px;
      background: var(--soft-bg);
    }
    .segmented label {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 42px;
      padding: 9px 10px;
      border-radius: 12px;
      color: var(--muted);
      font-weight: 800;
      cursor: pointer;
    }
    .segmented input { width: auto; }
    .segmented label:has(input:checked) {
      background: var(--field-bg);
      color: var(--ink);
      box-shadow: inset 0 0 0 1px var(--line);
    }
    .segmented.view-mode {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
    .rule-tabs {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 8px;
      padding: 4px;
      border: 1px solid var(--line);
      border-radius: 16px;
      background: var(--soft-bg);
    }
    .rule-tabs button {
      min-height: 38px;
      padding: 8px 10px;
      border-radius: 12px;
      font-size: 12px;
      white-space: normal;
    }
    .section-anchor {
      scroll-margin-top: 18px;
    }
    .primary-tabs {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      padding: 6px;
      border: 1px solid var(--line);
      border-radius: 18px;
      background: var(--soft-bg);
    }
    .primary-tabs button {
      min-height: 48px;
      border-radius: 14px;
      color: var(--ink);
      background: var(--secondary-bg);
      border: 1px solid var(--line);
      box-shadow: none;
    }
    .primary-tabs button.is-active {
      color: #fff;
      background: linear-gradient(135deg, var(--accent), var(--accent2));
      border-color: transparent;
    }
    .workspace-panel {
      display: grid;
      gap: 20px;
    }
    .workspace-panel[hidden] {
      display: none;
    }
    .source-lock {
      padding: 12px 14px;
      border: 1px solid var(--line);
      border-radius: 14px;
      background: var(--soft-bg);
      color: var(--muted);
      font-size: 13px;
      line-height: 1.45;
      overflow-wrap: anywhere;
    }
    .viewer-status-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }
    .viewer-status-card {
      min-height: 72px;
      padding: 12px 14px;
      border: 1px solid var(--line);
      border-radius: 14px;
      background: var(--soft-bg);
      display: grid;
      gap: 5px;
      align-content: center;
    }
    .viewer-status-card span {
      color: var(--muted);
      font-size: 12px;
      font-weight: 800;
    }
    .viewer-status-card strong {
      color: var(--ink);
      font-size: 14px;
      overflow-wrap: anywhere;
    }
    .viewer-status-card.is-connecting strong {
      color: var(--accent2);
    }
    .viewer-status-card.is-playing strong {
      color: var(--accent);
    }
    .viewer-status-card.is-error strong {
      color: var(--danger);
    }
    .view-frame {
      display: grid;
      gap: 12px;
      padding: 16px;
      border: 1px solid var(--line);
      border-radius: 18px;
      background: var(--soft-bg);
    }
    .view-frame img,
    .metadata-video-stage {
      width: 100%;
      aspect-ratio: 16 / 9;
      display: block;
      border-radius: 16px;
      border: 1px solid var(--line);
      background: var(--canvas-bg);
    }
    .view-frame img {
      object-fit: contain;
    }
    .view-frame img[hidden],
    .metadata-video-stage[hidden] {
      display: none;
    }
    .metadata-video-stage {
      position: relative;
      overflow: hidden;
    }
    .metadata-video-stage video,
    .metadata-video-stage canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      border: 0;
      border-radius: 0;
      background: transparent;
    }
    .metadata-video-stage video {
      object-fit: contain;
      background: #000;
    }
    .metadata-overlay-canvas {
      pointer-events: none;
      opacity: 1;
      transition: opacity 180ms ease;
    }
    .metadata-overlay-canvas.is-stale {
      opacity: 0.35;
    }
    .metadata-stale-badge {
      position: absolute;
      right: 12px;
      top: 12px;
      padding: 6px 9px;
      border-radius: 999px;
      background: rgba(18, 18, 13, 0.74);
      color: #fff;
      font-size: 12px;
      font-weight: 900;
      pointer-events: none;
    }
    .metadata-overlay-controls {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
    }
    .metadata-overlay-controls label {
      min-height: 36px;
      padding: 8px 10px;
      border: 1px solid var(--line);
      border-radius: 12px;
      background: var(--soft-bg);
      color: var(--ink);
      font-size: 12px;
      font-weight: 800;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .metadata-diagnostic-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .metadata-bbox-diagnostic {
      display: grid;
      gap: 10px;
    }
    .dashboard-toolbar {
      display: grid;
      grid-template-columns: 1.2fr 1.2fr 1fr auto;
      gap: 10px;
      align-items: end;
    }
    .dashboard-card-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
    }
    .dashboard-warning-strip {
      min-height: 34px;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .dashboard-warning-strip .status-chip {
      min-height: 26px;
      padding: 4px 8px;
      font-size: 11px;
    }
    .dashboard-trend-table {
      table-layout: fixed;
      min-width: 860px;
    }
    .dashboard-trend-table th:nth-child(1),
    .dashboard-trend-table td:nth-child(1) { width: 210px; }
    .dashboard-trend-table th:nth-child(2),
    .dashboard-trend-table td:nth-child(2) { width: 110px; }
    .dashboard-trend-table th:nth-child(3),
    .dashboard-trend-table td:nth-child(3) { width: 120px; }
    .dashboard-trend-table th:nth-child(4),
    .dashboard-trend-table td:nth-child(4) { width: 180px; }
    .dashboard-trend-table td:nth-child(1),
    .dashboard-trend-table td:nth-child(4),
    .dashboard-trend-table td:nth-child(5) {
      white-space: normal;
      overflow-wrap: anywhere;
      line-height: 1.35;
    }
    .dashboard-json-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    .dashboard-json-grid pre,
    .dashboard-pre {
      min-height: 220px;
      max-height: 420px;
      margin: 0;
      padding: 12px;
      overflow: auto;
      border: 1px solid var(--line);
      border-radius: 12px;
      background: var(--canvas-bg);
      color: var(--ink);
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
      line-height: 1.5;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    .dashboard-drilldown {
      display: grid;
      gap: 18px;
    }
    .dashboard-drilldown-section {
      display: grid;
      gap: 10px;
      padding-top: 14px;
      border-top: 1px solid var(--line);
    }
    .dashboard-section-header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .dashboard-section-header h3 {
      margin: 0;
      color: var(--ink);
      font-size: 15px;
    }
    .dashboard-section-summary {
      margin: 0;
      color: var(--muted);
      font-size: 12px;
      font-weight: 800;
      overflow-wrap: anywhere;
    }
    .dashboard-table-wrap {
      overflow: auto;
      border: 1px solid var(--line);
      border-radius: 12px;
      background: var(--canvas-bg);
    }
    .dashboard-table {
      width: 100%;
      min-width: 720px;
      border-collapse: collapse;
      color: var(--ink);
      font-size: 12px;
    }
    .dashboard-table th,
    .dashboard-table td {
      padding: 9px 10px;
      border-bottom: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
      white-space: nowrap;
    }
    .dashboard-table th {
      color: var(--muted);
      background: var(--soft-bg);
      font-weight: 900;
    }
    .dashboard-table tbody tr:last-child td {
      border-bottom: 0;
    }
    .dashboard-table tbody tr.is-watch td {
      background: rgba(240, 179, 91, 0.10);
    }
    .dashboard-table tbody tr.is-warning td {
      background: rgba(213, 75, 75, 0.10);
    }
    .dashboard-table .dashboard-empty-cell {
      color: var(--muted);
      text-align: center;
      white-space: normal;
    }
    .dashboard-table .status-chip {
      min-height: 24px;
      padding: 3px 8px;
      font-size: 11px;
    }
    .dashboard-track-table {
      table-layout: fixed;
      min-width: 900px;
    }
    .dashboard-track-table th:nth-child(1),
    .dashboard-track-table td:nth-child(1) { width: 72px; }
    .dashboard-track-table th:nth-child(2),
    .dashboard-track-table td:nth-child(2) { width: 150px; }
    .dashboard-track-table th:nth-child(3),
    .dashboard-track-table td:nth-child(3) { width: 110px; }
    .dashboard-track-table th:nth-child(4),
    .dashboard-track-table td:nth-child(4) { width: 160px; }
    .dashboard-track-table th:nth-child(5),
    .dashboard-track-table td:nth-child(5) { width: 150px; }
    .dashboard-track-table th:nth-child(6),
    .dashboard-track-table td:nth-child(6) { width: 258px; }
    .dashboard-track-table td:nth-child(4),
    .dashboard-track-table td:nth-child(5),
    .dashboard-track-table td:nth-child(6) {
      white-space: normal;
      overflow-wrap: anywhere;
      line-height: 1.35;
    }
    .event-records-details {
      display: grid;
      gap: 10px;
    }
    .event-records-details > summary {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      cursor: pointer;
      color: var(--ink);
      font-weight: 900;
      list-style-position: inside;
    }
    .event-records-details > summary span {
      color: var(--ink);
      font-size: 15px;
    }
    .event-records-panel {
      display: grid;
      gap: 12px;
      padding-top: 8px;
    }
    .event-record-filter-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      align-items: end;
    }
    .event-record-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
    }
    .event-record-state {
      margin: 0;
      color: var(--muted);
      font-size: 12px;
      font-weight: 800;
      overflow-wrap: anywhere;
    }
    .event-record-id-button {
      appearance: none;
      border: 0;
      padding: 0;
      background: transparent;
      color: var(--accent);
      font: inherit;
      font-weight: 900;
      text-align: left;
      cursor: pointer;
      overflow-wrap: anywhere;
    }
    .event-record-path {
      display: inline-block;
      max-width: 220px;
      overflow: hidden;
      text-overflow: ellipsis;
      vertical-align: top;
      color: var(--accent);
    }
    .event-record-detail-drawer {
      border: 1px solid var(--line);
      border-radius: 12px;
      background: var(--canvas-bg);
    }
    .event-record-detail-drawer > summary {
      cursor: pointer;
      padding: 10px 12px;
      color: var(--ink);
      font-weight: 900;
    }
    .event-record-detail-drawer pre {
      max-height: 320px;
      margin: 0;
      padding: 12px;
      overflow: auto;
      border-top: 1px solid var(--line);
      color: var(--ink);
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
      line-height: 1.5;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    .metadata-viewer-panel {
      display: grid;
      gap: 14px;
      padding: 14px;
      border: 1px solid var(--line);
      border-radius: 16px;
      background: var(--field-bg);
    }
    .metadata-viewer-panel[hidden] {
      display: none;
    }
    .metadata-status-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
    }
    .metadata-json-preview {
      min-height: 180px;
      max-height: 340px;
      margin: 0;
      padding: 12px;
      overflow: auto;
      border: 1px solid var(--line);
      border-radius: 12px;
      background: var(--canvas-bg);
      color: var(--ink);
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
      line-height: 1.5;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    .metadata-error {
      color: var(--danger);
      font-weight: 800;
    }
    .url-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    .url-grid textarea {
      min-height: 92px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
    }
    .output-policy-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
    }
    .output-policy-card {
      padding: 12px;
      border: 1px solid var(--line);
      border-radius: 14px;
      background: var(--soft-bg);
      display: grid;
      gap: 6px;
    }
    .output-policy-card strong {
      color: var(--ink);
      font-size: 13px;
    }
    .output-policy-card span {
      color: var(--muted);
      font-size: 12px;
      line-height: 1.45;
    }
    .pairing-panel {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    .pairing-card {
      display: grid;
      gap: 10px;
      padding: 14px;
      border: 1px solid var(--line);
      border-radius: 14px;
      background: var(--soft-bg);
    }
    .pairing-card.is-custom {
      background: rgba(95, 135, 116, 0.08);
    }
    .pairing-card strong {
      color: var(--ink);
      font-size: 14px;
    }
    .pairing-card p {
      margin: 0;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.5;
    }
    .pairing-card textarea {
      min-height: 64px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
    }
    .developer-url-details > .pad {
      border-top: 1px solid var(--line);
    }
    .url-field {
      display: grid;
      gap: 8px;
    }
    .url-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    .url-title-row span {
      color: var(--ink);
      font-weight: 800;
    }
    .copy-url-btn {
      width: auto;
      min-width: 72px;
      padding: 8px 10px;
      border-radius: 10px;
      font-size: 12px;
    }
    .form-note {
      margin: 0;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.45;
    }
    .scenario-panel {
      display: grid;
      gap: 14px;
      padding: 16px;
      border: 1px solid var(--line);
      border-radius: 18px;
      background: var(--soft-bg);
    }
    .scenario-panel[hidden], .basic-rule-panel[hidden] {
      display: none;
    }
    .phase-strip {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 8px;
    }
    .phase-chip {
      min-height: 38px;
      padding: 9px 8px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: var(--field-bg);
      color: var(--muted);
      text-align: center;
      font-size: 12px;
      font-weight: 800;
    }
    .phase-chip.is-emphasis {
      color: #fff;
      background: linear-gradient(135deg, var(--accent), var(--accent2));
      border-color: transparent;
    }
    .metric-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
    }
    .metric-tile {
      min-height: 64px;
      padding: 10px;
      border: 1px solid var(--line);
      border-radius: 14px;
      background: var(--field-bg);
      display: grid;
      gap: 3px;
    }
    .metric-tile strong {
      font-size: 13px;
    }
    .metric-tile span {
      color: var(--muted);
      font-size: 11px;
      line-height: 1.3;
    }
    .scenario-summary {
      display: grid;
      gap: 6px;
      padding: 14px;
      border: 1px solid var(--line);
      border-radius: 14px;
      background: var(--field-bg);
    }
    .scenario-summary strong {
      font-size: 13px;
      color: var(--ink);
    }
    .scenario-summary span {
      color: var(--muted);
      line-height: 1.45;
      font-size: 13px;
    }
    .scenario-readiness {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
    }
    .scenario-check {
      min-height: 70px;
      padding: 10px;
      border: 1px solid var(--line);
      border-radius: 14px;
      background: var(--field-bg);
      display: grid;
      gap: 4px;
      align-content: start;
    }
    .scenario-check strong {
      color: var(--ink);
      font-size: 12px;
    }
    .scenario-check span {
      color: var(--muted);
      font-size: 12px;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }
    .range-meta {
      color: var(--muted);
      font-size: 11px;
      line-height: 1.35;
    }
    button.mini-button {
      padding: 9px 10px;
      font-size: 12px;
      border-radius: 999px;
    }
    .mini-check {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 38px;
      padding: 9px 10px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: var(--soft-bg);
      font-size: 12px;
      font-weight: 800;
      color: var(--ink);
    }
    .category-label {
      display: grid;
      gap: 2px;
      min-width: 0;
    }
    .category-title {
      font-weight: 800;
    }
    .category-detail {
      font-size: 11px;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }
    .preview-panel {
      border: 1px solid var(--line);
      border-radius: 18px;
      background: var(--soft-bg);
      padding: 16px;
      display: grid;
      gap: 10px;
    }
    .geometry-status-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
    }
    .geometry-status-card {
      min-height: 72px;
      padding: 11px 12px;
      border: 1px solid var(--line);
      border-radius: 14px;
      background: var(--soft-bg);
      display: grid;
      gap: 4px;
      align-content: center;
    }
    .geometry-status-card span {
      color: var(--muted);
      font-size: 12px;
      font-weight: 800;
    }
    .geometry-status-card strong {
      color: var(--ink);
      font-size: 14px;
      overflow-wrap: anywhere;
    }
    .geometry-status-card.is-ok strong {
      color: var(--accent);
    }
    .geometry-status-card.is-error strong {
      color: var(--danger);
    }
    .geometry-actions {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }
    .coordinate-list {
      display: grid;
      gap: 7px;
      padding: 0 14px 14px;
    }
    .coordinate-row {
      display: grid;
      grid-template-columns: 64px 1fr 1fr;
      gap: 8px;
      align-items: center;
      padding: 8px 10px;
      border: 1px solid var(--line);
      border-radius: 12px;
      background: var(--field-bg);
      color: var(--muted);
      font-size: 12px;
    }
    .coordinate-row strong {
      color: var(--ink);
    }
    .canvas-wrap {
      background: var(--canvas-bg);
      border: 1px solid var(--line);
      border-radius: 18px;
      overflow: hidden;
    }
    canvas {
      width: 100%;
      aspect-ratio: 16 / 9;
      display: block;
      background:
        linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px),
        radial-gradient(circle at center, rgba(111,208,165,0.11), transparent 50%),
        var(--canvas-bg);
      background-size: 10% 10%, 10% 10%, auto, auto;
      cursor: crosshair;
      touch-action: none;
    }
    pre {
      white-space: pre-wrap;
      word-break: break-word;
      min-height: 140px;
      margin: 0;
      padding: 16px;
      border-radius: 18px;
      border: 1px solid var(--line);
      background: var(--code-bg);
      color: var(--code-ink);
    }
    .debug-drawer {
      border: 1px solid var(--line);
      border-radius: 22px;
      background: var(--soft-bg);
      overflow: hidden;
    }
    .debug-drawer > summary {
      cursor: pointer;
      padding: 16px 18px;
      color: var(--ink);
      font-weight: 800;
    }
    .debug-drawer[open] > summary {
      border-bottom: 1px solid var(--line);
    }
    .debug-drawer > .grid {
      padding: 16px;
    }
    .debug-drawer > .card {
      border: 0;
      border-top: 1px solid var(--line);
      border-radius: 0;
      box-shadow: none;
      background: transparent;
    }
    .validation-dialog {
      width: min(420px, calc(100vw - 32px));
      border: 1px solid var(--line);
      border-radius: 12px;
      background: var(--card-bg);
      color: var(--ink);
      padding: 0;
      box-shadow: 0 24px 80px rgba(0,0,0,0.26);
    }
    .validation-dialog::backdrop {
      background: rgba(0,0,0,0.32);
    }
    .validation-dialog form {
      display: grid;
      gap: 14px;
      padding: 20px;
    }
    .validation-dialog h2 {
      margin: 0;
      font-size: 18px;
    }
    .validation-dialog p {
      margin: 0;
      color: var(--muted);
      line-height: 1.5;
    }
    .dialog-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .hint { margin: 0; font-size: 0.9rem; color: var(--muted); }
    @media (max-width: 980px) {
      .grid, .row { grid-template-columns: 1fr; }
      .check-grid { grid-template-columns: 1fr 1fr; }
      .class-filter-row { grid-template-columns: 1fr; }
      .phase-strip, .metric-grid, .scenario-readiness, .rule-tabs, .url-grid, .output-policy-grid, .summary-grid, .geometry-status-grid, .viewer-status-grid, .metadata-status-grid, .metadata-overlay-controls, .dashboard-toolbar, .dashboard-card-grid, .dashboard-json-grid, .event-record-filter-grid, .rule-list-controls { grid-template-columns: 1fr 1fr; }
      .management-toolbar { grid-template-columns: 1fr; }
      .management-toolbar .toolbar-actions { justify-content: flex-start; }
      .dashboard-header-actions { align-items: flex-start; }
      .dashboard-header-actions #dashboardStatusText { text-align: left; }
      .rule-row {
        grid-template-columns: 72px minmax(0, 1fr);
      }
      .rule-row.is-header { display: none; }
      .rule-row .rule-cell, .rule-row .row-actions {
        grid-column: 1 / -1;
      }
    }
	    @media (max-width: 720px) {
	      .primary-tabs, .url-grid, .output-policy-grid, .summary-grid, .review-grid, .geometry-status-grid, .geometry-actions, .viewer-status-grid, .metadata-status-grid, .metadata-overlay-controls, .dashboard-toolbar, .dashboard-card-grid, .dashboard-json-grid, .event-record-filter-grid, .rule-list-controls, .profile-summary-panel { grid-template-columns: 1fr; }
	      .segmented.view-mode { grid-template-columns: 1fr; }
	      .management-toolbar .toolbar-actions { justify-content: stretch; }
	      .management-toolbar .toolbar-actions button { width: 100%; }
	      .row-actions { justify-content: flex-start; }
	    }
  </style>
</head>
<body>
  <main>
    <div class="topbar">
      <strong>MediaServer</strong>
      <button id="themeToggleBtn" class="theme-toggle" type="button">다크 모드</button>
    </div>
    <section class="hero">
      <p class="standalone-nav" style="margin:0;"><a href="/lab">실험실로 돌아가기</a> · <a href="/webrtc/test">안정 테스트 페이지</a></p>
      <h1>영상 분석 관리</h1>
      <p style="margin:0;">영상 분석 설정은 소스, profile, 이벤트, 시나리오, 영역을 하나의 숫자 ID로 묶습니다. 보기 탭에서는 실시간 영상/오버레이/메타데이터를 확인하고, 대시보드 탭에서는 현재 VA 런타임 상태를 확인합니다.</p>
    </section>

    <nav class="primary-tabs" aria-label="영상 분석 관리 탭">
      <button id="analysisSettingsTabBtn" type="button" class="is-active" data-primary-tab="settings">영상 분석 설정</button>
      <button id="analysisViewerTabBtn" type="button" data-primary-tab="viewer">영상 분석 보기</button>
      <button id="analysisDashboardTabBtn" type="button" data-primary-tab="dashboard">런타임 대시보드</button>
    </nav>

    <div id="feedbackToast" class="feedback-toast" role="status" aria-live="polite"></div>

    <section id="settingsPanel" class="workspace-panel">
      <section class="card" id="vaRuleLibraryCard">
        <div class="pad stack">
          <div class="management-toolbar">
            <div class="stack">
              <div class="section-title-row">
                <h2>저장된 영상 분석 룰</h2>
                <span id="vaRuleCountBadge" class="count-badge">0개 저장</span>
              </div>
              <p class="hint">룰은 영상 소스, 분석 profile, 이벤트, 시나리오, 영역을 하나의 숫자 ID로 묶습니다. 외부 요청은 `vaRule=숫자`만 사용합니다.</p>
            </div>
            <div class="toolbar-actions">
              <button id="addVaRuleBtn" type="button">룰 추가</button>
            </div>
          </div>
          <div class="summary-grid">
            <div class="summary-tile"><span>전체 룰</span><strong id="vaRuleTotalMetric">0</strong></div>
            <div class="summary-tile"><span>적용 중</span><strong id="vaRuleActiveMetric">0</strong></div>
            <div class="summary-tile"><span>시나리오</span><strong id="vaRuleScenarioMetric">0</strong></div>
            <div class="summary-tile"><span>다음 자동 번호</span><strong id="vaRuleNextIdMetric">#1</strong></div>
          </div>
          <div class="rule-list-controls">
            <label>룰 검색
              <input id="vaRuleSearchInput" placeholder="이름, ID, 소스, 이벤트, 객체 검색" />
            </label>
            <label>상태 필터
              <select id="vaRuleStatusFilter">
                <option value="all" selected>전체</option>
                <option value="active">적용 중</option>
                <option value="inactive">비활성</option>
              </select>
            </label>
            <label>이벤트 방식
              <select id="vaRuleKindFilter">
                <option value="all" selected>전체</option>
                <option value="basic">기본 이벤트</option>
                <option value="scenario">시나리오</option>
              </select>
            </label>
            <div class="rule-filter-summary">
              <span>표시 중</span>
              <strong id="vaRuleFilteredMetric">0개</strong>
            </div>
          </div>
          <div class="rule-list-panel">
            <div id="vaRuleList" class="rule-list"></div>
            <p id="vaRuleListHint" class="hint">각 행의 보기/수정/복제/삭제 버튼으로 해당 룰을 바로 관리합니다.</p>
          </div>
        </div>
      </section>

      <section id="vaRuleEditorPanel" class="workspace-panel editor-panel" hidden>
      <section class="card">
        <div class="pad stack">
          <div class="editor-heading">
            <div class="stack">
              <div class="section-title-row">
                <h2 id="vaRuleEditorTitle">영상 분석 룰 편집</h2>
                <span id="vaRuleEditorModeBadge" class="count-badge">새 룰</span>
              </div>
              <p class="hint">추가/수정 중에만 열리는 편집 화면입니다. 저장하면 목록으로 돌아갑니다.</p>
            </div>
            <button id="cancelVaRuleEditBtn" type="button" class="secondary" style="width:auto;min-width:120px;">목록으로</button>
          </div>
          <select id="vaRuleSelect" hidden></select>
        </div>
      </section>

      <nav class="rule-tabs edit-step-nav" aria-label="룰 편집 섹션">
        <button type="button" class="secondary" data-rule-section-target="ruleBasicSection">기본 정보</button>
        <button type="button" class="secondary" data-rule-section-target="ruleSourceSection">영상 소스</button>
        <button type="button" class="secondary" data-rule-section-target="profileSection">분석 Profile</button>
        <button type="button" class="secondary" data-rule-section-target="ruleScenarioSection">이벤트 방식</button>
        <button type="button" class="secondary" data-rule-section-target="ruleObjectsSection">대상 객체</button>
        <button type="button" class="secondary" data-rule-section-target="geometryLabel">영역/라인</button>
        <button type="button" class="secondary" data-rule-section-target="ruleOutputSection">이벤트 동작</button>
        <button type="button" class="secondary" data-rule-section-target="ruleReviewSection">저장 전 검토</button>
      </nav>

      <section id="ruleBasicSection" class="card edit-step-card section-anchor">
        <div class="pad stack">
          <div class="step-title">
            <span>1</span>
            <div>
              <h2>기본 정보</h2>
              <p class="hint">저장 번호, 이름, 적용 상태만 먼저 확인합니다.</p>
            </div>
          </div>
          <div class="row">
            <label>Rule ID
              <input id="vaRuleId" type="hidden" inputmode="numeric" pattern="[0-9]*" />
              <input id="ruleId" type="hidden" value="file-person-vehicle-area" />
              <div id="vaRuleIdDisplay" class="readonly-id">저장 시 자동 지정</div>
              <span class="form-note">새 룰 번호는 기존 서버 규칙대로 저장 시 다음 숫자로 자동 지정됩니다.</span>
            </label>
            <label>Rule 이름
              <input id="vaRuleName" value="샘플 파일 분석 설정" />
            </label>
          </div>
          <label>적용 상태
            <select id="ruleEnabled">
              <option value="true" selected>적용함</option>
              <option value="false">저장만 하고 적용 안 함</option>
            </select>
            <span class="form-note">테스트 중인 Rule을 삭제하지 않고 잠시 꺼둘 때만 `저장만 하고 적용 안 함`을 씁니다.</span>
          </label>
        </div>
      </section>

      <section id="ruleSourceSection" class="card edit-step-card section-anchor">
        <div class="pad stack">
          <div class="step-title">
            <span>2</span>
            <div>
              <h2>영상 소스</h2>
              <p class="hint">이 Rule이 묶을 영상 소스와 적용 route를 확인합니다.</p>
            </div>
          </div>
          <div class="row">
            <label>분석할 영상 종류
              <select id="vaRuleSourceKind">
                <option value="file" selected>서버 파일</option>
                <option value="rtsp">RTSP URL</option>
                <option value="http">HTTP/HLS URL</option>
                <option value="webrtc">WebRTC Source ID</option>
              </select>
            </label>
            <label id="vaRuleFileField">분석할 영상 파일
              <select id="vaRuleFileSelect">
                <option value="sample_h264.mp4" selected>sample_h264.mp4</option>
              </select>
            </label>
            <label id="vaRuleUrlField" hidden>
              <span id="vaRuleUrlLabelText">분석할 영상 URL 또는 Source ID</span>
              <input id="vaRuleUrlInput" placeholder="rtsp://camera.local/stream 또는 published-source-id" />
              <span id="vaRuleUrlHelp" class="form-note">RTSP/HTTP/HLS는 URL, WebRTC는 publish Source ID를 입력합니다.</span>
            </label>
          </div>
          <div class="row">
            <label>대상 소스
              <select id="ruleSourceKind">
                <option value="*">전체</option>
                <option value="file" selected>파일</option>
                <option value="rtsp">RTSP</option>
                <option value="webrtc">WebRTC</option>
                <option value="http">HTTP</option>
                <option value="hls">HLS</option>
              </select>
            </label>
            <label>송출 경로
              <select id="ruleRoute">
                <option value="*" selected>전체</option>
                <option value="rtsp">RTSP</option>
                <option value="webrtc">WebRTC</option>
              </select>
            </label>
          </div>
          <p id="vaRuleSourceHelp" class="form-note">서버 파일은 아래 파일 목록만 선택하면 됩니다. URL 또는 Source ID 입력칸은 RTSP/HTTP/HLS/WebRTC 소스를 고를 때만 표시됩니다.</p>
          <p id="vaRuleSourceSummary" class="source-lock">현재 설정 소스: file=sample_h264.mp4</p>
        </div>
      </section>

      <section id="profileSection" class="card edit-step-card section-anchor">
        <div class="pad stack">
          <div class="step-title">
            <span>3</span>
            <div>
              <h2>분석 Profile</h2>
              <p class="hint">실제 분석에 사용할 profile을 고르고, 세부 성능값은 필요할 때만 펼칩니다.</p>
            </div>
          </div>
          <label>사용할 Profile
            <select id="ruleProfileId"></select>
          </label>
          <div id="profileSummaryText" class="profile-summary-panel" aria-live="polite"></div>
          <details class="inline-details">
            <summary>고급 Profile 설정</summary>
            <div class="stack">
              <div class="section-title-row">
                <span class="hint">Profile registry를 수정할 때만 펼칩니다. 저장하면 같은 Profile을 쓰는 룰에 적용됩니다.</span>
                <span id="profileCountBadge" class="count-badge">0개 저장</span>
              </div>
              <label>저장된 Profile
                <select id="profileSelect"></select>
              </label>
              <div class="row">
                <label>Profile ID
                  <input id="profileId" value="fast-local" />
                </label>
                <label>Detector
                  <select id="profileDetector">
                    <option value="yolo">YOLO/ONNX</option>
                    <option value="dummy">개발용 더미(검증용)</option>
                  </select>
                  <span id="detectorHelp" class="form-note">YOLO/ONNX는 실제 객체 검출입니다. 개발용 더미는 모델 없이 파이프라인과 UI만 확인할 때 쓰며 운영 설정에는 보통 사용하지 않습니다.</span>
                </label>
              </div>
              <div class="row">
                <label>분석 FPS: <span id="profileFpsValue">6</span>
                  <input id="profileFps" type="range" min="1" max="30" value="6" />
                </label>
                <label>Queue 크기: <span id="profileQueueValue">1</span>
                  <input id="profileQueue" type="range" min="1" max="8" value="1" />
                </label>
              </div>
              <div class="row">
                <label>신뢰도 threshold: <span id="profileConfidenceValue">25%</span>
                  <input id="profileConfidence" type="range" min="1" max="100" value="25" />
                </label>
                <label>NMS threshold: <span id="profileNmsValue">45%</span>
                  <input id="profileNms" type="range" min="1" max="100" value="45" />
                </label>
              </div>
              <div class="row">
                <label>입력 Width
                  <select id="profileInputWidth">
                    <option value="320">320</option>
                    <option value="640" selected>640</option>
                    <option value="960">960</option>
                  </select>
                </label>
                <label>입력 Height
                  <select id="profileInputHeight">
                    <option value="320">320</option>
                    <option value="640" selected>640</option>
                    <option value="960">960</option>
                  </select>
                </label>
              </div>
              <label style="display:flex;align-items:center;gap:8px;">
                <input id="profileAdaptive" type="checkbox" checked />
                부하가 높으면 FPS/input size 자동 조절
              </label>
              <label>Tracking 대상 카테고리</label>
              <div class="pill-grid">
                <button id="selectDefaultTrackingBtn" class="secondary mini-button">기본</button>
                <button id="selectAllTrackingBtn" class="secondary mini-button">전체 선택</button>
                <button id="clearTrackingBtn" class="secondary mini-button">전체 해제</button>
              </div>
              <div class="pill-grid">
                <label class="mini-check"><input data-tracking-category type="checkbox" value="person" checked /> 사람</label>
                <label class="mini-check"><input data-tracking-category type="checkbox" value="vehicle" checked /> 차량</label>
                <label class="mini-check"><input data-tracking-category type="checkbox" value="road" /> 도로</label>
                <label class="mini-check"><input data-tracking-category type="checkbox" value="animal" /> 동물</label>
                <label class="mini-check"><input data-tracking-category type="checkbox" value="sports" /> 운동</label>
                <label class="mini-check"><input data-tracking-category type="checkbox" value="tableware" /> 식기</label>
                <label class="mini-check"><input data-tracking-category type="checkbox" value="food" /> 음식</label>
                <label class="mini-check"><input data-tracking-category type="checkbox" value="furniture" /> 가구</label>
                <label class="mini-check"><input data-tracking-category type="checkbox" value="device" /> 기기</label>
                <label class="mini-check"><input data-tracking-category type="checkbox" value="object" /> 잡화</label>
              </div>
              <p class="hint">ID/trail과 enter/exit/line-crossing 판정 대상입니다. 세부 객체명은 JSON/API에서만 직접 지정합니다.</p>
              <p id="profileDeleteWarningText" class="profile-delete-note">저장 Profile만 삭제할 수 있습니다.</p>
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
                <button id="newProfileBtn" class="secondary">새 Profile</button>
                <button id="saveProfileBtn">Profile 저장</button>
                <button id="deleteProfileBtn" class="danger">Profile 삭제</button>
              </div>
            </div>
          </details>
        </div>
      </section>

      <section id="ruleScenarioSection" class="card edit-step-card section-anchor">
        <div class="pad stack">
          <div class="step-title">
            <span>4</span>
            <div>
              <h2>이벤트 방식</h2>
              <p class="hint">기본 이벤트와 시나리오 중 하나를 고르면 필요한 입력만 표시합니다.</p>
            </div>
          </div>
          <label>Rule 구성 방식</label>
          <div class="segmented" role="group" aria-label="Rule 구성 방식">
            <label><input type="radio" name="ruleKind" value="basic" checked /> 기본 이벤트</label>
            <label><input type="radio" name="ruleKind" value="scenario" /> 시나리오</label>
          </div>
          <div class="row">
            <label class="basic-rule-panel">이벤트 타입
              <select id="ruleEventType">
                <option value="presence" selected>영역 내 객체 감지(권장)</option>
                <option value="enter">영역 진입</option>
                <option value="exit">영역 이탈</option>
                <option value="line-crossing">라인 통과</option>
              </select>
            </label>
            <label class="basic-rule-panel">라인 통과 방향
              <select id="ruleLineDirection">
                <option value="any" selected>양방향</option>
                <option value="forward">정방향(-측→+측)</option>
                <option value="reverse">역방향(+측→-측)</option>
              </select>
            </label>
          </div>
          <div id="scenarioPanel" class="scenario-panel" hidden>
            <label>시나리오 템플릿
              <select id="scenarioType">
                <option value="intrusion-dwell" selected>Intrusion Dwell · 제한구역 체류</option>
                <option value="wrong-direction">WrongDirection · 금지 방향 통과</option>
              </select>
            </label>
            <div id="scenarioDwellTimingRow" class="row">
              <label>후보 판단 시간(ms): <span id="scenarioCandidateMsValue">2,000 ms</span>
                <input id="scenarioCandidateMs" type="range" min="0" max="30000" step="500" value="2000" />
                <span class="range-meta">범위 0~30,000 ms · 기본 2,000 ms · 500 ms 단위</span>
              </label>
              <label>체류 확정 시간(ms): <span id="scenarioDwellMsValue">10,000 ms</span>
                <input id="scenarioDwellMs" type="range" min="1000" max="120000" step="1000" value="10000" />
                <span class="range-meta">범위 1,000~120,000 ms · 기본 10,000 ms · 1,000 ms 단위</span>
              </label>
            </div>
            <div id="scenarioWrongDirectionRow" class="row" hidden>
              <label>허용 방향
                <select id="scenarioLineDirection">
                  <option value="forward" selected>forward · 정방향(-측→+측)</option>
                  <option value="reverse">reverse · 역방향(+측→-측)</option>
                </select>
                <span class="form-note">wrong-direction은 허용 방향과 실제 통과 방향을 비교합니다. any는 위반 방향을 정의할 수 없어 사용하지 않습니다.</span>
              </label>
              <label>중복 기준
                <span class="range-meta">같은 track/line은 cooldown 동안 중복 알림을 억제합니다.</span>
              </label>
            </div>
            <div class="row">
              <label>재알림 대기 시간(ms): <span id="scenarioCooldownMsValue">5,000 ms</span>
                <input id="scenarioCooldownMs" type="range" min="0" max="60000" step="1000" value="5000" />
                <span class="range-meta">범위 0~60,000 ms · 기본 5,000 ms · 1,000 ms 단위</span>
              </label>
            </div>
            <div class="scenario-summary" aria-live="polite">
              <strong>판단 요약</strong>
              <span id="scenarioSummaryText">사람 track이 제한구역 안에 들어오면 후보가 되고, 설정한 시간 이상 머물면 체류 이벤트를 1회 발생시킵니다.</span>
            </div>
            <div>
              <label style="margin-bottom:8px;">저장 전 점검</label>
              <div class="scenario-readiness">
                <div class="scenario-check"><strong>제한구역</strong><span id="scenarioReadinessZone">현재 그린 제한구역</span></div>
                <div class="scenario-check"><strong>대상 객체</strong><span id="scenarioReadinessTarget">사람, 차량</span></div>
                <div class="scenario-check"><strong>시간 조건</strong><span id="scenarioReadinessTiming">2,000 ms / 10,000 ms / 5,000 ms</span></div>
                <div class="scenario-check"><strong>발생 이벤트</strong><span id="scenarioReadinessEmit">intrusion-dwell · 같은 track 1회</span></div>
                <div class="scenario-check"><strong>Track 조건</strong><span id="scenarioReadinessHealth">불안정 track 허용</span></div>
                <div class="scenario-check"><strong>영역 형태</strong><span id="scenarioReadinessGeometry">polygon 4개 점</span></div>
              </div>
            </div>
            <div>
              <label style="margin-bottom:8px;">상태 흐름 미리보기</label>
              <div id="scenarioPhaseStrip" class="phase-strip">
                <div class="phase-chip">대기</div>
                <div class="phase-chip">진입 후보</div>
                <div class="phase-chip">관찰 중</div>
                <div class="phase-chip is-emphasis">체류 확정 1회 알림</div>
                <div class="phase-chip">종료</div>
              </div>
            </div>
            <div id="scenarioMetricGrid" class="metric-grid" aria-label="Scenario debug fields">
              <div class="metric-tile"><strong>처음 보인 시각</strong><span>track이 처음 감지된 시간</span></div>
              <div class="metric-tile"><strong>체류 시간</strong><span>제한구역 안에 머문 시간</span></div>
              <div class="metric-tile"><strong>구역 이동</strong><span>이전 구역 → 현재 구역</span></div>
              <div class="metric-tile"><strong>라인 방향</strong><span>선을 넘은 방향</span></div>
              <div class="metric-tile"><strong>중복 억제</strong><span>같은 track은 확정 알림 1회</span></div>
              <div class="metric-tile"><strong>Track 안정성</strong><span>ID 흔들림 진단값</span></div>
            </div>
            <p id="scenarioPanelHint" class="hint">이 UI는 시나리오 rule payload를 저장하고, 현재 polygon을 제한구역 후보로 사용합니다. 실제 engine 활성화는 서버의 scenario 설정값과 함께 동작합니다.</p>
          </div>
          <details class="inline-details">
            <summary>고급: standalone Rule 문서</summary>
            <div class="stack">
              <div class="section-title-row">
                <span class="hint">기존 `/lab/analysis/rules` 저장 흐름 검증용입니다. VA 룰 저장 payload는 기존 구조를 유지합니다.</span>
                <span id="ruleCountBadge" class="count-badge">0개 저장</span>
              </div>
              <label>저장된 Rule
                <select id="ruleSelect"></select>
              </label>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <button id="saveRuleBtn">Rule 저장</button>
                <button id="deleteRuleBtn" class="danger">Rule 삭제</button>
              </div>
            </div>
          </details>
        </div>
      </section>

      <section id="ruleObjectsSection" class="card edit-step-card section-anchor">
        <div class="pad stack">
          <div class="step-title">
            <span>5</span>
            <div>
              <h2>대상 객체</h2>
              <p class="hint">분석할 카테고리와 이벤트 판단 threshold를 정합니다.</p>
            </div>
          </div>
          <div class="class-tools">
            <p class="hint">Rule은 기존 객체 카테고리 단위로 선택합니다. 세부 COCO 객체명은 JSON/API에서 직접 지정할 수 있습니다.</p>
            <div class="pill-grid">
              <button id="selectCoreClassesBtn" class="secondary mini-button">기본</button>
              <button id="selectAllClassesBtn" class="secondary mini-button">전체 선택</button>
              <button id="clearClassesBtn" class="secondary mini-button">전체 해제</button>
            </div>
          </div>
          <div id="classChecks" class="check-grid"></div>
          <div class="row">
            <label>최소 신뢰도: <span id="ruleConfidenceValue">25%</span>
              <input id="ruleConfidence" type="range" min="1" max="100" value="25" />
            </label>
            <label>최소 지속 시간(ms)
              <input id="ruleMinDurationMs" type="number" min="0" value="0" />
            </label>
          </div>
          <label id="scenarioStableOnlyLabel" style="display:flex;align-items:center;gap:8px;">
            <input id="scenarioStableOnly" type="checkbox" />
            불안정 track은 후보에서 제외
          </label>
        </div>
      </section>

      <section class="card edit-step-card section-anchor">
        <div class="pad stack">
          <div class="step-title">
            <span>6</span>
            <div>
              <h2 id="geometryLabel">영역/라인 설정</h2>
              <p class="hint">영상 프레임을 확인하면서 polygon 또는 line을 지정합니다.</p>
            </div>
          </div>
          <div class="geometry-status-grid" aria-label="영역/라인 상태">
            <div id="geometryModeCard" class="geometry-status-card">
              <span>편집 모드</span>
              <strong id="geometryModeText">polygon</strong>
            </div>
            <div id="geometryPointCard" class="geometry-status-card">
              <span>점 개수</span>
              <strong id="geometryPointCountText">0/12</strong>
            </div>
            <div id="geometryMinimumCard" class="geometry-status-card">
              <span>저장 가능 여부</span>
              <strong id="geometryMinimumText">계산 중</strong>
            </div>
            <div class="geometry-status-card">
              <span>현재 영역 이름</span>
              <strong id="geometryRegionNameText">현재 영역 전체</strong>
            </div>
          </div>
          <div id="rulePreviewSection" class="preview-panel section-anchor">
            <h2 style="font-size:18px;">영상 프레임 보기</h2>
            <p class="hint">선택한 영상의 실제 프레임을 바로 확인하고, 아래 영역 캔버스에도 같은 프레임을 배경으로 씁니다.</p>
            <div class="row">
              <label>영상 소스
                <select id="previewSourceMode">
                  <option value="vaRule" selected>현재 영상 분석 설정 소스</option>
                  <option value="file">다른 서버 파일 임시 보기</option>
                  <option value="main">메인 /lab 선택 소스</option>
                </select>
              </label>
              <label id="previewFileField">임시 보기 파일
                <select id="previewFileSelect">
                  <option value="sample_h264.mp4" selected>sample_h264.mp4</option>
                </select>
              </label>
            </div>
            <label style="display:flex;align-items:center;gap:8px;">
              <input id="previewOverlayInput" type="checkbox" checked />
              객체 검출 오버레이 보기
            </label>
            <label style="display:flex;align-items:center;gap:8px;">
              <input id="autoPreviewInput" type="checkbox" />
              영역 캔버스에도 이 프레임 표시
            </label>
            <button id="stopPreviewBtn" class="secondary">영상 보기 시작</button>
            <p id="previewStatus" class="hint">꺼져 있습니다. 필요할 때만 켜서 영역을 맞추세요.</p>
          </div>
          <label id="scenarioZoneIdsLabel">영역 이름
            <input id="scenarioZoneIds" placeholder="예: 로비, 금지구역A · 비우면 현재 영역 전체" />
            <span class="form-note">시나리오에서 여러 구역을 구분할 때 쓰는 라벨입니다. 기본 이벤트에서는 메모용으로만 봅니다.</span>
          </label>
          <div class="canvas-wrap">
            <canvas id="regionCanvas" width="960" height="540"></canvas>
          </div>
          <p id="geometryHint" class="hint">캔버스를 클릭해 다각형 꼭짓점을 추가합니다. 3개 이상이면 영역으로 저장됩니다. 최대 12개까지 지정할 수 있습니다. 기존 점 근처를 드래그하면 새 점을 만들지 않고 점 위치를 이동합니다.</p>
          <p id="geometryValidationText" class="source-lock">영역 상태를 계산 중입니다.</p>
          <div class="geometry-actions">
            <button id="undoRegionBtn" type="button" class="secondary">되돌리기</button>
            <button id="deleteLastPointBtn" type="button" class="secondary">마지막 점 삭제</button>
            <button id="clearRegionBtn" type="button" class="secondary">전체 영역 초기화</button>
          </div>
          <details class="inline-details">
            <summary>좌표 목록</summary>
            <div id="regionCoordinateList" class="coordinate-list"></div>
          </details>
        </div>
      </section>

      <section id="ruleOutputSection" class="card edit-step-card section-anchor">
        <div class="pad stack">
          <div class="step-title">
            <span>7</span>
            <div>
              <h2>이벤트 동작</h2>
              <p class="hint">이벤트 발생 시 overlay 강조와 POST 전송 옵션을 정합니다.</p>
            </div>
          </div>
          <label style="display:flex;align-items:center;gap:8px;">
            <input id="eventFlashInput" type="checkbox" checked />
            이벤트가 발생한 객체를 overlay에서 깜빡임으로 강조
          </label>
          <label>깜빡임 시간(ms)
            <input id="eventFlashMsInput" type="number" min="100" max="10000" value="1200" />
          </label>
          <label>이벤트 POST URL
            <input id="eventPostUrlInput" placeholder="https://example.internal/events" />
          </label>
          <p class="hint">실제 POST 전송은 `MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED=1`일 때만 수행됩니다.</p>
          <details class="inline-details">
            <summary>Payload preview</summary>
            <label>고정 POST payload 예시
                <textarea id="eventPayloadPreview" readonly spellcheck="false"></textarea>
            </label>
          </details>
        </div>
      </section>

      <section id="ruleReviewSection" class="card edit-step-card section-anchor">
        <div class="pad stack">
          <div class="step-title">
            <span>8</span>
            <div>
              <h2>저장 전 검토</h2>
              <p class="hint">현재 설정 요약과 저장 가능 여부를 확인한 뒤 저장합니다.</p>
            </div>
          </div>
          <div id="ruleReviewSummary" class="review-grid"></div>
          <p id="ruleSaveReadiness" class="source-lock">저장 가능 여부를 계산 중입니다.</p>
          <div id="ruleValidationSummary" class="validation-summary" aria-live="polite"></div>
          <p id="ruleDirtyState" class="dirty-state">변경 상태를 계산 중입니다.</p>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
            <button id="newVaRuleBtn" type="button" class="secondary" hidden>새 설정</button>
            <button id="saveVaRuleBtn" type="button">영상 분석 설정 저장</button>
            <button id="cancelVaRuleEditBtnBottom" type="button" class="secondary">목록으로</button>
            <button id="deleteVaRuleBtn" type="button" class="danger">설정 삭제</button>
          </div>
        </div>
      </section>

    <details class="debug-drawer">
      <summary>개발자 정보: 생성 JSON / 상태</summary>
      <section class="grid">
        <div class="card">
          <div class="pad stack">
            <h2>생성되는 Profile JSON</h2>
            <textarea id="profileJsonPreview" spellcheck="false"></textarea>
          </div>
        </div>
        <div class="card">
          <div class="pad stack">
            <h2>생성되는 Rule JSON</h2>
            <textarea id="ruleJsonPreview" spellcheck="false"></textarea>
          </div>
        </div>
        <div class="card">
          <div class="pad stack">
            <h2>생성되는 영상 분석 설정 JSON</h2>
            <textarea id="vaRuleJsonPreview" spellcheck="false"></textarea>
          </div>
        </div>
      </section>

      <section class="card">
        <div class="pad stack">
          <h2>상태</h2>
          <pre id="statusBox">준비 중...</pre>
        </div>
      </section>
    </details>
      </section>
    </section>

    <section id="viewerPanel" class="workspace-panel" hidden>
      <div class="card">
        <div class="pad stack">
          <h2>영상 분석 테스트 / 미리보기</h2>
          <p class="hint">실시간 스트리밍, 기본 VA 오버레이, 저장된 VA 룰을 실제 화면으로 빠르게 확인하는 탭입니다.</p>
          <label>보기 모드</label>
          <div class="segmented view-mode" role="group" aria-label="보기 모드">
            <label><input type="radio" name="viewMode" value="live" checked /> 실시간 스트리밍</label>
            <label><input type="radio" name="viewMode" value="overlay" /> 영상 + VA 오버레이</label>
            <label><input type="radio" name="viewMode" value="rule" /> 영상 + VA 룰</label>
            <label><input type="radio" name="viewMode" value="metadata" /> WebRTC 메타데이터</label>
          </div>
          <p id="viewModeHelpText" class="form-note">실시간 스트리밍은 원본 영상만 확인합니다.</p>
          <div class="row" id="viewDirectSourceFields">
            <label>보기 영상 종류
              <select id="viewSourceKind">
                <option value="file" selected>서버 파일</option>
                <option value="rtsp">RTSP URL</option>
                <option value="http">HTTP/HLS URL</option>
                <option value="webrtc">WebRTC Source ID</option>
              </select>
            </label>
            <label id="viewFileField">보기 영상 파일
              <select id="viewFileSelect">
                <option value="sample_h264.mp4" selected>sample_h264.mp4</option>
              </select>
            </label>
            <label id="viewUrlField" hidden>보기 영상 URL 또는 Source ID
              <input id="viewUrlInput" placeholder="rtsp://camera.local/stream 또는 published-source-id" />
            </label>
          </div>
          <div id="viewRuleFields" class="stack" hidden>
            <label>사용할 영상 분석 설정 ID
              <select id="viewVaRuleSelect"></select>
            </label>
            <p class="form-note">영상 + VA 룰 모드에서는 영상 소스를 따로 고르지 않습니다. 선택한 ID에 저장된 영상 소스가 자동으로 고정됩니다.</p>
            <p id="viewRuleSourceSummary" class="source-lock">저장된 설정을 선택하면 연결된 영상 소스가 표시됩니다.</p>
          </div>
          <p id="viewBindingSummary" class="source-lock">실시간 스트리밍 · file=sample_h264.mp4</p>
          <div class="viewer-status-grid" aria-label="영상 분석 보기 상태">
            <div id="viewConnectionStateCard" class="viewer-status-card is-idle">
              <span>연결 상태</span>
              <strong id="viewConnectionStateText">대기</strong>
            </div>
            <div class="viewer-status-card">
              <span>현재 모드</span>
              <strong id="viewModeSummaryText">실시간 스트리밍</strong>
            </div>
            <div class="viewer-status-card">
              <span>연결 소스</span>
              <strong id="viewSourceSummaryText">file=sample_h264.mp4</strong>
            </div>
          </div>
          <p id="viewConnectionMessage" class="form-note">보기 시작을 누르면 분석 tap을 만들고 프레임을 표시합니다.</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <button id="startViewPreviewBtn" type="button">보기 시작</button>
            <button id="stopViewPreviewBtn" type="button" class="secondary">보기 중지</button>
          </div>
          <div class="view-frame">
            <img id="viewPreviewImage" alt="영상 분석 보기 프레임" />
            <div id="viewWebRtcStage" class="metadata-video-stage" hidden>
              <video id="viewWebRtcVideo" autoplay playsinline controls></video>
              <canvas id="viewMetadataOverlayCanvas" class="metadata-overlay-canvas"></canvas>
              <span id="metadataStaleBadge" class="metadata-stale-badge" hidden>메타데이터 지연</span>
            </div>
            <p id="viewPreviewStatus" class="hint">대기 중입니다.</p>
          </div>
          <section id="metadataViewerPanel" class="metadata-viewer-panel" hidden>
            <div>
              <h3>WebRTC 메타데이터 뷰어</h3>
              <p class="form-note">`vaMetadata=1` DataChannel 수신 상태와 최신 JSON, 브라우저 client-side overlay를 확인합니다. DataChannel이 실패해도 영상 재생은 계속 유지합니다.</p>
            </div>
            <div class="metadata-overlay-controls" aria-label="Client overlay 표시 옵션">
              <label><input id="metadataOverlayBboxInput" type="checkbox" checked /> 박스</label>
              <label><input id="metadataOverlayLabelInput" type="checkbox" checked /> 라벨</label>
              <label><input id="metadataOverlayTrackIdInput" type="checkbox" checked /> Track ID</label>
              <label><input id="metadataOverlayScenarioInput" type="checkbox" checked /> 시나리오</label>
              <label><input id="metadataOverlayEventInput" type="checkbox" checked /> 이벤트</label>
              <label><input id="metadataOverlayHealthInput" type="checkbox" checked /> TrackHealth</label>
              <label><input id="metadataOverlayZoneInput" type="checkbox" checked /> 현재 Zone</label>
              <label><input id="metadataOverlayDwellInput" type="checkbox" checked /> 체류 시간</label>
              <label><input id="metadataOverlayDetectionInput" type="checkbox" /> Detector 원본 bbox</label>
              <label><input id="metadataOverlayFallbackInput" type="checkbox" /> fallback metadata 표시(opt-in)</label>
            </div>
            <div class="metadata-bbox-diagnostic">
              <div class="metadata-diagnostic-actions">
                <button id="metadataBboxDiagnosticsBtn" type="button" class="secondary">BBox 진단 갱신</button>
                <span id="metadataBboxDiagnosticState" class="form-note">진단 대기 중</span>
              </div>
              <p class="form-note">Detector 원본 bbox를 켜면 점선은 Lab 진단 endpoint의 detector raw 결과이고, 실선은 현재 selected DataChannel payload를 기준으로 그립니다.</p>
              <div class="dashboard-table-wrap">
                <table class="dashboard-table" aria-label="BBox detector track comparison">
                  <thead><tr><th>track</th><th>confidence</th><th>DC selected</th><th>detector raw</th><th>track</th><th>det↔DC</th><th>track↔DC</th><th>continuity</th><th>TrackHealth</th><th>close-object guard</th><th>판단</th></tr></thead>
                  <tbody id="metadataBboxDiagnosticRows"><tr><td class="dashboard-empty-cell" colspan="11">BBox 진단 갱신을 누르면 detector/track 비교를 표시합니다.</td></tr></tbody>
                </table>
              </div>
            </div>
            <div class="metadata-status-grid">
              <div class="viewer-status-card">
                <span>DataChannel 상태</span>
                <strong id="metadataChannelStateText">비활성</strong>
              </div>
              <div class="viewer-status-card">
                <span>Label</span>
                <strong id="metadataChannelLabelText">va-metadata</strong>
              </div>
              <div class="viewer-status-card">
                <span>Metadata 수신</span>
                <strong id="metadataMessageCountText">0</strong>
              </div>
              <div class="viewer-status-card">
                <span>Metadata buffer</span>
                <strong id="metadataBufferCountText">0</strong>
              </div>
              <div class="viewer-status-card">
                <span>Metadata drop</span>
                <strong id="metadataBufferDropCountText">0</strong>
              </div>
              <div class="viewer-status-card">
                <span>표시 video frame</span>
                <strong id="metadataVideoFrameCountText">0</strong>
              </div>
              <div class="viewer-status-card">
                <span>Overlay draw</span>
                <strong id="metadataDrawCountText">0</strong>
              </div>
              <div class="viewer-status-card">
                <span>마지막 video frame</span>
                <strong id="metadataLastVideoFrameText">-</strong>
              </div>
              <div class="viewer-status-card">
                <span>마지막 metadata</span>
                <strong id="metadataLastMessageAtText">-</strong>
              </div>
              <div class="viewer-status-card">
                <span>영상 멈춤</span>
                <strong id="metadataVideoStalledText">아니오</strong>
              </div>
              <div class="viewer-status-card">
                <span>선택 syncDelta</span>
                <strong id="metadataSelectedDeltaText">-</strong>
              </div>
              <div class="viewer-status-card">
                <span>Metadata 지연</span>
                <strong id="metadataLagText">-</strong>
              </div>
              <div class="viewer-status-card">
                <span>프레임 매칭 실패</span>
                <strong id="metadataSyncMissCountText">0</strong>
              </div>
              <div class="viewer-status-card">
                <span>Stale 횟수</span>
                <strong id="metadataStaleCountText">0</strong>
              </div>
              <div class="viewer-status-card">
                <span>Fallback 숨김</span>
                <strong id="metadataFallbackHiddenCountText">0</strong>
              </div>
              <div class="viewer-status-card">
                <span>최신 timestamp</span>
                <strong id="metadataLatestTimestampText">-</strong>
              </div>
              <div class="viewer-status-card">
                <span>Track 수</span>
                <strong id="metadataTrackCountText">0</strong>
              </div>
              <div class="viewer-status-card">
                <span>이벤트 수</span>
                <strong id="metadataEventCountText">0</strong>
              </div>
              <div class="viewer-status-card">
                <span>시나리오 수</span>
                <strong id="metadataScenarioCountText">0</strong>
              </div>
              <div class="viewer-status-card">
                <span>JSON 파싱</span>
                <strong id="metadataParseStateText">대기</strong>
              </div>
              <div class="viewer-status-card">
                <span>Parse 실패</span>
                <strong id="metadataParseFailCountText">0</strong>
              </div>
            </div>
            <p id="metadataParseErrorText" class="metadata-error" hidden></p>
            <pre id="metadataJsonPreview" class="metadata-json-preview">메타데이터 수신 대기 중</pre>
          </section>
        </div>
      </div>
      <details class="debug-drawer developer-url-details">
        <summary>개발자 요청 URL</summary>
        <div class="pad stack">
          <p class="hint">외부 클라이언트나 자동화에서 직접 호출할 때만 펼쳐서 확인합니다. WebRTC 메타데이터와 RTSP 오버레이는 동작 방식이 다릅니다.</p>
          <div class="output-policy-grid" aria-label="VA 출력 방식 정책">
            <div class="output-policy-card">
              <strong>WebRTC 메타데이터 뷰어</strong>
              <span>WebRTC video + `vaMetadata=1` DataChannel을 브라우저가 받아 client-side canvas overlay로 표시합니다.</span>
            </div>
            <div class="output-policy-card">
              <strong>RTSP 서버 오버레이</strong>
              <span>VLC/ffplay/IINA 같은 일반 RTSP client는 서버가 그린 `va=1` 또는 `vaRule=<id>` 오버레이 영상을 봅니다.</span>
            </div>
            <div class="output-policy-card">
              <strong>RTSP 원본 스트림</strong>
              <span>오버레이 없는 원본 RTSP 영상입니다. 분석 메타데이터나 bbox UI는 포함되지 않습니다.</span>
            </div>
            <div class="output-policy-card">
              <strong>커스텀 메타데이터 사이드채널</strong>
              <span>일반 RTSP client는 메타데이터 채널을 표시하지 못합니다. 커스텀 client는 RTSP video와 별도 SSE metadata stream을 함께 처리해야 합니다.</span>
            </div>
          </div>
	          <div class="row">
	            <label>Web/HTTP 서버 주소
	              <input id="viewServerBaseUrl" />
	              <span class="form-note">현재 브라우저 주소를 기본값으로 씁니다. 다른 PC에서 볼 때는 이 서버의 LAN IP로 바꾸세요.</span>
	            </label>
            <label>RTSP 서버 주소
              <input id="viewRtspAuthority" />
	              <span class="form-note">RTSP/VLC URL에 들어갈 `host:port`입니다. 실행 포트 설정을 기본값으로 채웁니다.</span>
	            </label>
	          </div>
	          <div class="pairing-panel" aria-label="Custom RTSP metadata pairing">
	            <div class="pairing-card">
	              <strong>일반 RTSP viewer</strong>
	              <p>VLC/ffplay/IINA는 metadata side-channel을 자동으로 읽지 않습니다. 객체 박스가 필요한 일반 viewer는 서버가 직접 그린 overlay URL을 사용합니다.</p>
	              <label class="url-field">
		                <span class="url-title-row"><span>RTSP 서버 오버레이</span><button type="button" class="secondary copy-url-btn" data-copy-url-target="viewPairingRtspOverlayUrl">복사</button></span>
	                <textarea id="viewPairingRtspOverlayUrl" readonly spellcheck="false"></textarea>
	              </label>
	            </div>
	            <div class="pairing-card is-custom">
		              <strong>커스텀 RTSP + 메타데이터 연결 정보</strong>
		              <p>커스텀 client는 RTSP 원본 스트림을 재생하고, 별도 SSE/WS metadata stream을 받아 client-side overlay를 직접 그립니다.</p>
	              <label class="url-field">
		                <span class="url-title-row"><span>RTSP 원본 스트림</span><button type="button" class="secondary copy-url-btn" data-copy-url-target="viewPairingRtspRawUrl">복사</button></span>
	                <textarea id="viewPairingRtspRawUrl" readonly spellcheck="false"></textarea>
	              </label>
	              <label class="url-field">
		                <span class="url-title-row"><span>SSE 메타데이터 스트림</span><button type="button" class="secondary copy-url-btn" data-copy-url-target="viewPairingMetadataSideChannelUrl">복사</button></span>
	                <textarea id="viewPairingMetadataSideChannelUrl" readonly spellcheck="false"></textarea>
	              </label>
	            </div>
	          </div>
	          <div class="url-grid">
	            <label class="url-field">
	              <span class="url-title-row"><span>WebRTC simple signaling</span><button type="button" class="secondary copy-url-btn" data-copy-url-target="viewWebRtcUrl">복사</button></span>
	              <textarea id="viewWebRtcUrl" readonly spellcheck="false"></textarea>
            </label>
            <label class="url-field">
	              <span class="url-title-row"><span>WebRTC 메타데이터 뷰어</span><button type="button" class="secondary copy-url-btn" data-copy-url-target="viewWebRtcMetadataUrl">복사</button></span>
              <textarea id="viewWebRtcMetadataUrl" readonly spellcheck="false"></textarea>
            </label>
            <label class="url-field">
              <span class="url-title-row"><span>WHEP</span><button type="button" class="secondary copy-url-btn" data-copy-url-target="viewWhepUrl">복사</button></span>
              <textarea id="viewWhepUrl" readonly spellcheck="false"></textarea>
            </label>
            <label class="url-field">
	              <span class="url-title-row"><span>RTSP 서버 오버레이</span><button type="button" class="secondary copy-url-btn" data-copy-url-target="viewRtspUrl">복사</button></span>
              <textarea id="viewRtspUrl" readonly spellcheck="false"></textarea>
            </label>
            <label class="url-field">
	              <span class="url-title-row"><span>RTSP 원본 스트림</span><button type="button" class="secondary copy-url-btn" data-copy-url-target="viewRtspRawUrl">복사</button></span>
              <textarea id="viewRtspRawUrl" readonly spellcheck="false"></textarea>
            </label>
            <label class="url-field">
		              <span class="url-title-row"><span>커스텀 메타데이터 사이드채널</span><button type="button" class="secondary copy-url-btn" data-copy-url-target="viewMetadataSideChannelUrl">복사</button></span>
	              <textarea id="viewMetadataSideChannelUrl" readonly spellcheck="false"></textarea>
	            </label>
	            <label class="url-field">
		              <span class="url-title-row"><span>커스텀 WebSocket 사이드채널</span><button type="button" class="secondary copy-url-btn" data-copy-url-target="viewWebSocketSideChannelUrl">복사</button></span>
	              <textarea id="viewWebSocketSideChannelUrl" readonly spellcheck="false"></textarea>
	            </label>
	            <label class="url-field">
		              <span class="url-title-row"><span>분석 Tap 미리보기</span><button type="button" class="secondary copy-url-btn" data-copy-url-target="viewTapUrl">복사</button></span>
	              <textarea id="viewTapUrl" readonly spellcheck="false"></textarea>
	            </label>
	          </div>
		          <p class="form-note">URL 규칙: WebRTC 메타데이터는 DataChannel 기반 client-side overlay이고, RTSP 오버레이는 서버가 영상에 직접 그린 결과입니다. RTSP 원본 스트림에는 overlay/metadata가 없습니다. SSE/WS side-channel은 custom client/dashboard용이며 일반 VLC/ffplay용 기능이 아닙니다.</p>
	        </div>
	      </details>
    </section>

    <section id="dashboardPanel" class="workspace-panel" hidden>
      <div class="card">
        <div class="pad stack">
          <div class="management-toolbar">
            <div class="stack">
              <h2>VA 런타임 대시보드</h2>
              <p class="hint">실시간 분석 서버 상태를 보는 운영용 화면입니다. 대시보드 탭이 열려 있을 때만 주기적으로 갱신합니다.</p>
            </div>
            <div class="toolbar-actions dashboard-header-actions">
              <button id="dashboardRefreshBtn" type="button" class="secondary">새로고침</button>
              <p id="dashboardStatusText" class="form-note">대시보드 대기 중</p>
            </div>
          </div>
          <div class="dashboard-toolbar">
            <label>분석 Tap
              <select id="dashboardTapSelect"></select>
            </label>
            <label>룰
              <select id="dashboardRuleSelect"></select>
            </label>
            <label>갱신 주기
              <select id="dashboardRefreshInterval">
                <option value="0">수동</option>
                <option value="2000">2초</option>
                <option value="5000" selected>5초</option>
                <option value="10000">10초</option>
              </select>
            </label>
            <label style="min-height:42px;display:flex;align-items:center;gap:8px;">
              <input id="dashboardAutoRefreshInput" type="checkbox" checked />
              자동 갱신
            </label>
          </div>
          <div class="dashboard-drilldown">
            <section class="dashboard-drilldown-section" aria-labelledby="dashboardOverviewTitle">
              <div class="dashboard-section-header">
                <h3 id="dashboardOverviewTitle">Overview</h3>
                <p id="dashboardOverviewSummary" class="dashboard-section-summary">선택된 tap 없음</p>
              </div>
              <div class="dashboard-card-grid" aria-label="VA 런타임 대시보드 카드">
                <div class="viewer-status-card"><span>소스 종류</span><strong id="dashboardSourceKind">-</strong></div>
                <div class="viewer-status-card"><span>활성 세션</span><strong id="dashboardActiveSessions">0</strong></div>
                <div class="viewer-status-card"><span>활성 스트림</span><strong id="dashboardActiveStreams">0</strong></div>
                <div class="viewer-status-card"><span>분석 Tap</span><strong id="dashboardActiveTaps">0</strong></div>
                <div class="viewer-status-card"><span>디코딩 FPS</span><strong id="dashboardDecodedFps">0</strong></div>
                <div class="viewer-status-card"><span>샘플링 FPS</span><strong id="dashboardSampledFps">0</strong></div>
                <div class="viewer-status-card"><span>분석 FPS</span><strong id="dashboardAnalyzedFps">0</strong></div>
                <div class="viewer-status-card"><span>대기/상한/최대 큐</span><strong id="dashboardQueueSummary">0/0/0</strong></div>
                <div class="viewer-status-card"><span>추론 지연</span><strong id="dashboardInferenceLatency">0ms</strong></div>
                <div class="viewer-status-card"><span>Track A/L/R/T</span><strong id="dashboardTrackCounts">0/0/0/0</strong></div>
                <div class="viewer-status-card"><span>시나리오 인스턴스</span><strong id="dashboardScenarioCount">0</strong></div>
                <div class="viewer-status-card"><span>발생/중복 억제 이벤트</span><strong id="dashboardEventCounts">0/0</strong></div>
                <div class="viewer-status-card"><span>불안정 TrackHealth</span><strong id="dashboardUnstableCount">0</strong></div>
                <div class="viewer-status-card"><span>겹침 위험</span><strong id="dashboardOverlapRiskCount">0</strong></div>
                <div class="viewer-status-card"><span>이벤트 POST</span><strong id="dashboardEventPostStatus">-</strong></div>
                <div class="viewer-status-card"><span>이벤트 저장</span><strong id="dashboardEventStorageStatus">-</strong></div>
              </div>
            </section>
            <section class="dashboard-drilldown-section" aria-labelledby="dashboardVaRuleDebugTitle">
              <div class="dashboard-section-header">
                <h3 id="dashboardVaRuleDebugTitle">vaRule Runtime Debug</h3>
                <p id="dashboardVaRuleDebugSummary" class="dashboard-section-summary">active tap 또는 rule 선택 대기 중</p>
              </div>
              <div class="dashboard-card-grid" aria-label="vaRule runtime debug cards">
                <div class="viewer-status-card"><span>vaRule</span><strong id="dashboardVaRuleIdentity">-</strong></div>
                <div class="viewer-status-card"><span>Tap 매칭</span><strong id="dashboardVaRuleTapMatch">-</strong></div>
                <div class="viewer-status-card"><span>Source</span><strong id="dashboardVaRuleSource">-</strong></div>
                <div class="viewer-status-card"><span>Profile</span><strong id="dashboardVaRuleProfile">-</strong></div>
                <div class="viewer-status-card"><span>Event / Scenario</span><strong id="dashboardVaRuleEventType">-</strong></div>
                <div class="viewer-status-card"><span>Region</span><strong id="dashboardVaRuleRegion">-</strong></div>
                <div class="viewer-status-card"><span>Event lifecycle</span><strong id="dashboardVaRuleLifecycle">-</strong></div>
                <div class="viewer-status-card"><span>Recent event</span><strong id="dashboardVaRuleRecentEvent">-</strong></div>
              </div>
            </section>
            <section class="dashboard-drilldown-section" aria-labelledby="dashboardTracksTitle">
              <div class="dashboard-section-header">
                <h3 id="dashboardTracksTitle">Tracks</h3>
                <p id="dashboardTracksSummary" class="dashboard-section-summary">track 없음</p>
              </div>
              <div class="dashboard-table-wrap">
                <table class="dashboard-table dashboard-track-table" aria-label="Track drill-down">
                  <thead><tr><th>Track</th><th>Class</th><th>Lifecycle</th><th>Zone</th><th>Dwell</th><th>TrackHealth</th></tr></thead>
                  <tbody id="dashboardTrackRows"><tr><td class="dashboard-empty-cell" colspan="6">tap을 선택하면 track 목록이 표시됩니다.</td></tr></tbody>
                </table>
              </div>
            </section>
            <section class="dashboard-drilldown-section" aria-labelledby="dashboardScenariosTitle">
              <div class="dashboard-section-header">
                <h3 id="dashboardScenariosTitle">Scenarios</h3>
                <p id="dashboardScenariosSummary" class="dashboard-section-summary">scenario 없음</p>
              </div>
              <div class="dashboard-table-wrap">
                <table class="dashboard-table" aria-label="Scenario drill-down">
                  <thead><tr><th>Scenario</th><th>Phase</th><th>Track</th><th>Zone/Line</th><th>Elapsed</th><th>Cooldown</th></tr></thead>
                  <tbody id="dashboardScenarioRows"><tr><td class="dashboard-empty-cell" colspan="6">활성 scenario가 표시됩니다.</td></tr></tbody>
                </table>
              </div>
            </section>
            <section class="dashboard-drilldown-section" aria-labelledby="dashboardScenarioTimelineTitle">
              <div class="dashboard-section-header">
                <h3 id="dashboardScenarioTimelineTitle">Scenario Timeline</h3>
                <p id="dashboardScenarioTimelineSummary" class="dashboard-section-summary">timeline 대기 중</p>
              </div>
              <div class="dashboard-table-wrap">
                <table class="dashboard-table" aria-label="Scenario timeline debug">
                  <thead><tr><th>Scenario</th><th>Phase</th><th>Track</th><th>Zone</th><th>Line</th><th>Elapsed</th><th>Cooldown</th><th>Event</th><th>Dedup</th><th>Recent event</th></tr></thead>
                  <tbody id="dashboardScenarioTimelineRows"><tr><td class="dashboard-empty-cell" colspan="10">활성 scenario timeline이 표시됩니다.</td></tr></tbody>
                </table>
              </div>
            </section>
            <section class="dashboard-drilldown-section" aria-labelledby="dashboardEventsTitle">
              <div class="dashboard-section-header">
                <h3 id="dashboardEventsTitle">Events</h3>
                <p id="dashboardEventsSummary" class="dashboard-section-summary">emitted 0 · dedup 0</p>
              </div>
              <div class="dashboard-table-wrap">
                <table class="dashboard-table" aria-label="Recent event drill-down">
                  <thead><tr><th>Type</th><th>Track</th><th>Class</th><th>Rule</th><th>Zone/Line</th><th>Status</th></tr></thead>
                  <tbody id="dashboardEventRows"><tr><td class="dashboard-empty-cell" colspan="6">최근 event가 표시됩니다.</td></tr></tbody>
                </table>
              </div>
            </section>
            <section class="dashboard-drilldown-section" aria-labelledby="dashboardEventRecordsTitle">
              <details id="dashboardEventRecordsDetails" class="event-records-details">
                <summary><span id="dashboardEventRecordsTitle">Event Records</span><small id="dashboardEventRecordsSummary" class="dashboard-section-summary">검색 전</small></summary>
                <div class="event-records-panel">
                  <div class="event-record-filter-grid" aria-label="EventRecord 검색 필터">
                    <label>eventType
                      <select id="eventRecordEventTypeFilter">
                        <option value="">전체</option>
                        <option value="presence">presence</option>
                        <option value="enter">enter</option>
                        <option value="exit">exit</option>
                        <option value="line-crossing">line-crossing</option>
                      </select>
                    </label>
                    <label>streamId
                      <input id="eventRecordStreamIdFilter" type="text" placeholder="streamId" />
                    </label>
                    <label>channelId
                      <input id="eventRecordChannelIdFilter" type="text" placeholder="channelId" />
                    </label>
                    <label>trackId
                      <input id="eventRecordTrackIdFilter" type="number" min="0" step="1" placeholder="trackId" />
                    </label>
                    <label>scenarioName
                      <input id="eventRecordScenarioNameFilter" type="text" placeholder="scenarioName" />
                    </label>
                    <label>status
                      <select id="eventRecordStatusFilter">
                        <option value="">전체</option>
                        <option value="emitted">emitted</option>
                        <option value="confirmed">confirmed</option>
                        <option value="candidate">candidate</option>
                        <option value="cooldown">cooldown</option>
                        <option value="ended">ended</option>
                      </select>
                    </label>
                    <label>startTimeMs
                      <input id="eventRecordStartTimeFilter" type="number" min="0" step="1" placeholder="시작 ms" />
                    </label>
                    <label>endTimeMs
                      <input id="eventRecordEndTimeFilter" type="number" min="0" step="1" placeholder="종료 ms" />
                    </label>
                    <label>limit
                      <select id="eventRecordLimitFilter">
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100" selected>100</option>
                        <option value="250">250</option>
                        <option value="500">500</option>
                      </select>
                    </label>
                  </div>
                  <div class="event-record-actions">
                    <button id="eventRecordSearchBtn" type="button" class="secondary">검색</button>
                    <p id="eventRecordStateText" class="event-record-state">검색 버튼을 누르면 저장된 EventRecord metadata를 조회합니다.</p>
                  </div>
                  <div class="dashboard-table-wrap">
                    <table class="dashboard-table" aria-label="EventRecord 검색 결과">
                      <thead><tr><th>eventId</th><th>eventType</th><th>timestamp/startTime</th><th>status</th><th>stream/channel</th><th>trackId</th><th>className</th><th>zone/line</th><th>scenario/phase</th><th>snapshotPath</th><th>clipPath</th></tr></thead>
                      <tbody id="eventRecordRows"><tr><td class="dashboard-empty-cell" colspan="11">검색 결과가 여기에 표시됩니다.</td></tr></tbody>
                    </table>
                  </div>
                  <details id="eventRecordDetailDrawer" class="event-record-detail-drawer">
                    <summary>EventRecord detail</summary>
                    <pre id="eventRecordDetailJson">eventId를 선택하면 원본 EventRecord JSON이 표시됩니다.</pre>
                  </details>
                </div>
              </details>
            </section>
            <section class="dashboard-drilldown-section" aria-labelledby="dashboardMetadataTitle">
              <div class="dashboard-section-header">
                <h3 id="dashboardMetadataTitle">Metadata / Backpressure</h3>
                <p id="dashboardMetadataSummary" class="dashboard-section-summary">metadata channel 대기 중</p>
              </div>
              <div class="dashboard-card-grid" aria-label="Metadata backpressure cards">
                <div class="viewer-status-card"><span>Runtime memory</span><strong id="dashboardRuntimeMemoryWarning">RSS 해제 후보 · high-water 관찰</strong></div>
                <div class="viewer-status-card"><span>Live RSS</span><strong id="dashboardRuntimeRss">longrun report에서 확인</strong></div>
                <div class="viewer-status-card"><span>RSS 판단 기준</span><strong id="dashboardRuntimeRssGuidance">longrun report 기준</strong></div>
                <div class="viewer-status-card"><span>Session/Stream/Tap</span><strong id="dashboardBackpressureRuntime">0/0/0</strong></div>
                <div class="viewer-status-card"><span>DataChannel sessions</span><strong id="dashboardMetadataSessions">0/0 open</strong></div>
                <div class="viewer-status-card"><span>DataChannel sent</span><strong id="dashboardMetadataSent">0</strong></div>
                <div class="viewer-status-card"><span>dropped/skipped</span><strong id="dashboardMetadataDropped">0/0</strong></div>
                <div class="viewer-status-card"><span>interval/oversized skip</span><strong id="dashboardMetadataSkipped">0/0</strong></div>
                <div class="viewer-status-card"><span>send failures</span><strong id="dashboardMetadataFailures">0</strong></div>
                <div class="viewer-status-card"><span>buffered drop/max</span><strong id="dashboardMetadataBuffered">0/0</strong></div>
                <div class="viewer-status-card"><span>last/max buffered</span><strong id="dashboardMetadataBufferedObserved">0/0</strong></div>
                <div class="viewer-status-card"><span>SSE clients</span><strong id="dashboardMetadataSseClients">0</strong></div>
                <div class="viewer-status-card"><span>WS clients</span><strong id="dashboardMetadataWsClients">0</strong></div>
                <div class="viewer-status-card"><span>SSE/WS sent/drop</span><strong id="dashboardSideChannelSentDropped">미제공</strong></div>
                <div class="viewer-status-card"><span>Metadata JSON builds</span><strong id="dashboardMetadataJsonBuilds">0</strong></div>
                <div class="viewer-status-card"><span>Metadata payload avg/max</span><strong id="dashboardMetadataPayloadBytes">미제공</strong></div>
                <div class="viewer-status-card"><span>Dashboard polling count</span><strong id="dashboardPollingCount">미제공</strong></div>
                <div class="viewer-status-card"><span>Queue pending/cap/peak</span><strong id="dashboardBackpressureQueue">0/0/0</strong></div>
                <div class="viewer-status-card"><span>Queue drops</span><strong id="dashboardBackpressureQueueDrops">0/0</strong></div>
                <div class="viewer-status-card"><span>Sample drops</span><strong id="dashboardBackpressureSampleDrops">0/0</strong></div>
                <div class="viewer-status-card"><span>Queue wait</span><strong id="dashboardBackpressureQueueWait">0ms</strong></div>
                <div class="viewer-status-card"><span>RTSP lifecycle</span><strong id="dashboardRtspLifecycle">미제공</strong></div>
                <div class="viewer-status-card"><span>RTSP pending peak</span><strong id="dashboardRtspPendingPeak">미제공</strong></div>
                <div class="viewer-status-card"><span>pending stop/destroy</span><strong id="dashboardRtspPendingResidual">미제공</strong></div>
                <div class="viewer-status-card"><span>appsrc after stop</span><strong id="dashboardAppsrcAfterStop">미제공</strong></div>
                <div class="viewer-status-card"><span>flow returns</span><strong id="dashboardRtspFlowReturns">미제공</strong></div>
                <div class="viewer-status-card"><span>fanout balance</span><strong id="dashboardFanoutBalance">미제공</strong></div>
                <div class="viewer-status-card"><span>cleanup warning</span><strong id="dashboardCleanupWarning">미제공</strong></div>
                <div class="viewer-status-card"><span>client stale/drop</span><strong id="dashboardMetadataStale">미제공</strong></div>
                <div class="viewer-status-card"><span>fallback hidden</span><strong id="dashboardMetadataFallback">미제공</strong></div>
              </div>
            </section>
            <section class="dashboard-drilldown-section" aria-labelledby="dashboardTrendTitle">
              <div class="dashboard-section-header">
                <h3 id="dashboardTrendTitle">Trend / Stale / Cleanup</h3>
                <p id="dashboardTrendSummary" class="dashboard-section-summary">trend sample 대기 중</p>
              </div>
              <div id="dashboardTrendWarnings" class="dashboard-warning-strip" aria-label="Runtime Dashboard warning badges">
                <span class="status-chip is-muted">관찰 대기</span>
              </div>
              <div class="dashboard-card-grid" aria-label="Runtime Dashboard trend cards">
                <div class="viewer-status-card"><span>Trend samples</span><strong id="dashboardTrendSampleCount">0/60</strong></div>
                <div class="viewer-status-card"><span>Runtime delta</span><strong id="dashboardTrendRuntimeDelta">미제공</strong></div>
                <div class="viewer-status-card"><span>Metadata stale</span><strong id="dashboardTrendStaleStatus">미제공</strong></div>
                <div class="viewer-status-card"><span>Cleanup watch</span><strong id="dashboardTrendCleanupStatus">미제공</strong></div>
              </div>
              <div class="dashboard-table-wrap">
                <table class="dashboard-table dashboard-trend-table" aria-label="Runtime Dashboard trend summary">
                  <thead><tr><th>Metric</th><th>Current</th><th>Trend</th><th>Window min/max</th><th>Note</th></tr></thead>
                  <tbody id="dashboardTrendRows"><tr><td class="dashboard-empty-cell" colspan="5">Dashboard sample이 쌓이면 최근 trend가 표시됩니다.</td></tr></tbody>
                </table>
              </div>
            </section>
            <section class="dashboard-drilldown-section" aria-labelledby="dashboardIssuesTitle">
              <div class="dashboard-section-header">
                <h3 id="dashboardIssuesTitle">Tracking Issues</h3>
                <p id="dashboardIssuesSummary" class="dashboard-section-summary">issue 없음</p>
              </div>
              <div class="dashboard-table-wrap">
                <table class="dashboard-table" aria-label="Tracking issue drill-down">
                  <thead><tr><th>Type</th><th>Track</th><th>Class</th><th>Severity</th><th>Timestamp</th><th>Health / Guard</th></tr></thead>
                  <tbody id="dashboardIssueRows"><tr><td class="dashboard-empty-cell" colspan="6">tracking issue report가 표시됩니다.</td></tr></tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </div>
      <details class="debug-drawer">
        <summary>상태 덤프 / tracking issue report</summary>
        <div class="pad stack">
          <div class="dashboard-json-grid">
            <label class="stack">상태 덤프 JSON
              <pre id="dashboardStateDumpJson">tap을 선택하면 상태 덤프가 표시됩니다.</pre>
            </label>
            <label class="stack">tracking issue report
              <pre id="dashboardTrackingIssueReport">tracking issue report 없음</pre>
            </label>
          </div>
        </div>
      </details>
    </section>
  </main>

  <dialog id="validationDialog" class="validation-dialog">
    <form method="dialog">
      <h2>설정 확인</h2>
      <p id="validationDialogMessage"></p>
      <button id="validationDialogClose" value="ok">확인</button>
    </form>
  </dialog>

  <dialog id="deleteVaRuleDialog" class="validation-dialog">
    <form method="dialog">
      <h2>영상 분석 룰 삭제</h2>
      <p id="deleteVaRuleDialogMessage"></p>
      <div class="dialog-actions">
        <button id="cancelDeleteVaRuleBtn" type="button" class="secondary">취소</button>
        <button id="confirmDeleteVaRuleBtn" type="button" class="danger">삭제</button>
      </div>
    </form>
  </dialog>

  <script>
    const categoryCatalog = __MEDIA_SERVER_CATEGORY_CATALOG__;
    const ruleCategories = categoryCatalog.map((item) => ({
      value: item.value,
      label: item.label,
      hint: item.hint,
      group: item.group
    }));
    const ruleCategoryLabels = Object.fromEntries(categoryCatalog.map((item) => [item.value, item.labels || []]));
    const ruleCategoryDisplayLabels = Object.fromEntries(
      categoryCatalog.map((item) => [item.value, item.displayLabels || [item.label]])
    );
    const serverDefaults = {
      rtspPort: __MEDIA_SERVER_RTSP_PORT__,
      streamRoute: "__MEDIA_SERVER_STREAM_ROUTE__"
    };
    let builtInProfiles = [];
    let profiles = [];
    let rules = [];
    let vaRules = [];
    let selectedVaRuleId = '';
    let vaRuleListSearch = '';
    let vaRuleStatusFilter = 'all';
    let vaRuleKindFilter = 'all';
    let pendingDeleteVaRuleId = '';
    let vaRuleEditorMode = 'closed';
    let vaRuleEditorBaseline = '';
    let vaRuleDirty = false;
    let previewTapId = '';
    let previewTimer = null;
    let previewImage = null;
    let previewFailureCount = 0;
    let previewSourceLabel = '';
    let regionUndoStack = [];
    let viewTapId = '';
    let viewTimer = null;
    let viewFailureCount = 0;
    let viewConnectionState = 'idle';
    let viewWebRtcPeer = null;
    let viewWebRtcSessionId = '';
    let viewWebRtcIceTimer = null;
    let viewWebRtcEmptyIcePolls = 0;
    let viewWebRtcAutoRestartTimer = null;
    let viewMetadataChannel = null;
    let viewMetadataState = 'disabled';
    let viewMetadataLabel = 'va-metadata';
    let viewMetadataMessageCount = 0;
    let viewMetadataLatestTimestampMs = 0;
    let viewMetadataTrackCount = 0;
    let viewMetadataEventCount = 0;
    let viewMetadataScenarioCount = 0;
    let viewMetadataParseError = '';
    let viewMetadataParseFailCount = 0;
    let viewMetadataLastJsonText = '';
    let viewMetadataLastMessageAt = 0;
    let viewMetadataStallTimer = null;
    let viewMetadataVideoStallTimer = null;
    let viewMetadataLatestPayload = null;
    let viewMetadataSelectedEntry = null;
    let viewMetadataBuffer = [];
    let viewMetadataBufferDropCount = 0;
    let viewMetadataLastPayloadKeyMs = null;
    let viewMetadataBboxDiagnostics = null;
    let viewMetadataDrawCount = 0;
    let viewMetadataVideoPresentedFrames = 0;
    let viewMetadataLastVideoFrameAt = 0;
    let viewMetadataLastVideoFrameMediaTimeMs = null;
    let viewMetadataVideoStalled = false;
    let viewMetadataSelectedSyncDeltaMs = null;
    let viewMetadataSelectedLagMs = null;
    let viewMetadataSyncMissCount = 0;
    let viewMetadataSyncMissActive = false;
    let viewMetadataSyncMissCleared = false;
    let viewMetadataStaleCount = 0;
    let viewMetadataFallbackHiddenCount = 0;
    let viewMetadataLastHiddenFallbackSequence = 0;
    let viewMetadataOverlayTimer = null;
    let viewMetadataOverlayTimerKind = '';
    let viewMetadataOverlayStale = false;
    let viewMetadataLastDrawAt = 0;
    let viewMetadataVideoPtsOffsetMs = null;
    let viewMetadataPtsCalibrationCount = 0;
    let viewMetadataPresentationLoopRunning = false;
    let viewMetadataPresentationLoopStartedAt = 0;
    let dashboardActive = false;
    let dashboardTimer = null;
    let dashboardLastRefreshAt = 0;
    let dashboardLastPayload = null;
    let dashboardLastTapId = '';
    let dashboardRefreshInFlight = false;
    let dashboardTapSelectionManual = false;
    let dashboardRecentEvents = [];
    let dashboardRecentEventKeys = new Set();
    const dashboardTrendMaxSamples = 60;
    let dashboardTrendSamples = [];
    let dashboardLocalPollingCount = 0;
    let dashboardLastViewStopAt = 0;
    let dashboardLastDashboardStopAt = 0;
    let eventRecordSearchInFlight = false;
    let eventRecordResults = [];
    let eventRecordSelectedIndex = -1;
    let regionPoints = [
      { x: 0.20, y: 0.22 },
      { x: 0.80, y: 0.22 },
      { x: 0.80, y: 0.78 },
      { x: 0.20, y: 0.78 }
    ];
    let draggingPointIndex = -1;
    let didDragPoint = false;
    const polygonMaxPoints = 12;
    const lineMaxPoints = 2;
    const dragHitRadiusPx = 16;
    const regionUndoMax = 20;

    const $ = (id) => document.getElementById(id);
    const canvas = $('regionCanvas');
    const ctx = canvas.getContext('2d');
    let feedbackTimer = null;

    const VaUiComponents = Object.freeze({
      RuleList: {
        state: ['vaRules', 'selectedVaRuleId', 'vaRuleListSearch', 'vaRuleStatusFilter', 'vaRuleKindFilter'],
        selectors: ['vaRuleList', 'vaRuleSearchInput', 'vaRuleStatusFilter', 'vaRuleKindFilter'],
        actions: ['renderVaRuleLibrary', 'selectVaRule', 'duplicateVaRuleById', 'toggleVaRuleEnabled', 'deleteVaRuleById']
      },
      RuleEditor: {
        state: ['vaRuleEditorMode', 'vaRuleEditorBaseline', 'vaRuleDirty', 'regionPoints'],
        selectors: ['vaRuleEditorPanel', 'ruleBasicSection', 'ruleSourceSection', 'ruleReviewSection'],
        actions: ['openVaRuleEditorForNew', 'openVaRuleEditorForEdit', 'saveVaRule', 'closeVaRuleEditor']
      },
      ProfileSelector: {
        state: ['builtInProfiles', 'profiles'],
        selectors: ['ruleProfileId', 'profileSummaryText', 'profileSelect'],
        actions: ['renderProfileSelects', 'loadProfile', 'saveProfile', 'deleteProfile', 'updateProfileSummaryText']
      },
      EventModeSelector: {
        selectors: ['ruleEventType', 'ruleLineDirection', 'ruleKind'],
        actions: ['setRuleKind', 'updateRuleModeUi', 'ruleJson']
      },
      ScenarioEditor: {
        selectors: ['scenarioType', 'scenarioCandidateMs', 'scenarioDwellMs', 'scenarioCooldownMs', 'scenarioStableOnly'],
        actions: ['scenarioJson', 'updateRangeLabels']
      },
      ObjectCategorySelector: {
        selectors: ['classChecks', 'data-rule-category', 'data-tracking-category'],
        actions: ['renderClassChecks', 'selectedClasses', 'selectedTrackingClasses']
      },
      RegionCanvasEditor: {
        state: ['regionPoints', 'regionUndoStack', 'previewImage'],
        selectors: ['regionCanvas', 'geometryValidationText', 'regionCoordinateList'],
        actions: ['drawRegion', 'undoRegionChange', 'deleteLastRegionPoint', 'clearRegionGeometry']
      },
      EventActionEditor: {
        selectors: ['eventFlashInput', 'eventFlashMsInput', 'eventPostUrlInput'],
        actions: ['eventActionsJson', 'eventPayloadExampleJson']
      },
      RuleReviewPanel: {
        selectors: ['ruleReviewSummary', 'ruleSaveReadiness', 'ruleValidationSummary'],
        actions: ['updateReviewSummary', 'validateVaRulePayloadDetailed']
      },
      AnalysisPreviewPanel: {
        state: ['previewTapId', 'viewTapId'],
        selectors: ['rulePreviewSection', 'viewerPanel', 'viewPreviewImage'],
        actions: ['startRulePreview', 'stopRulePreview', 'startViewPreview', 'stopViewPreview']
      },
      DeveloperUrlPanel: {
        selectors: ['viewWebRtcUrl', 'viewWhepUrl', 'viewRtspUrl', 'viewTapUrl'],
        actions: ['updateGeneratedUrls', 'copyGeneratedUrl']
      }
    });

    function status(message, payload = null) {
      $('statusBox').textContent = payload ? `${message}\n${JSON.stringify(payload, null, 2)}` : message;
    }

    function showFeedback(message, tone = 'success') {
      const el = $('feedbackToast');
      if (!el) return;
      el.textContent = message;
      el.className = `feedback-toast is-visible is-${tone}`;
      clearTimeout(feedbackTimer);
      feedbackTimer = setTimeout(() => {
        el.className = 'feedback-toast';
      }, 4200);
    }

    function setText(id, text) {
      const el = $(id);
      if (el) el.textContent = text;
    }

    function previewStatus(message) {
      $('previewStatus').textContent = message;
    }
    function setRulePreviewUi(active) {
      const checkbox = $('autoPreviewInput');
      const button = $('stopPreviewBtn');
      if (checkbox) checkbox.checked = active;
      if (button) button.textContent = active ? '영상 보기 중지' : '영상 보기 시작';
    }

    function previewOverlayEnabled() {
      return $('previewOverlayInput')?.checked !== false;
    }

    function normalizedSourceKind(kind) {
      const value = String(kind || 'file').toLowerCase();
      if (['file', 'rtsp', 'http', 'hls', 'webrtc'].includes(value)) return value;
      return 'file';
    }

    function sourceJsonFromControls(prefix) {
      const kind = normalizedSourceKind($(prefix + 'SourceKind')?.value || 'file');
      if (kind === 'file') {
        return {
          kind: 'file',
          file: $(prefix + 'FileSelect')?.value || 'sample_h264.mp4'
        };
      }
      const url = String($(prefix + 'UrlInput')?.value || '').trim();
      return { kind, url };
    }

    function sourceLabel(source) {
      const kind = normalizedSourceKind(source?.kind || 'file');
      if (kind === 'file') return `file=${source?.file || 'sample_h264.mp4'}`;
      if (kind === 'webrtc') return `webrtc source=${source?.url || '(입력 필요)'}`;
      return `${kind}=${source?.url || '(입력 필요)'}`;
    }

    function paramsFromSourceJson(source) {
      const params = new URLSearchParams();
      const kind = normalizedSourceKind(source?.kind || 'file');
      if (kind === 'file') {
        params.set('file', source?.file || 'sample_h264.mp4');
        return params;
      }
      params.set('source', kind);
      params.set('url', source?.url || '');
      return params;
    }

    function applyBasicOverlayParams(params) {
      params.set('va', '1');
      params.set('drawLabels', '1');
      params.set('trackIds', '1');
      params.set('trackTrails', '1');
      params.set('labelLang', 'ko');
      return params;
    }

    function currentVaRuleSourceJson() {
      return sourceJsonFromControls('vaRule');
    }

    function currentVaRuleId() {
      return String($('vaRuleId')?.value || '').trim();
    }

    function isVaRuleEditorOpen() {
      const panel = $('vaRuleEditorPanel');
      return Boolean(panel && !panel.hidden);
    }

    function selectedViewMode() {
      const selected = document.querySelector('input[name="viewMode"]:checked');
      return selected ? selected.value : 'live';
    }

    function selectedViewVaRule() {
      const id = $('viewVaRuleSelect')?.value || $('vaRuleSelect')?.value.replace(/^custom:/, '') || '';
      return vaRules.find((item) => String(item.id) === String(id)) || null;
    }

    function numericVaRuleId(value) {
      const text = String(value || '').trim();
      if (!/^[0-9]+$/.test(text)) return 0;
      const number = Number(text);
      return Number.isInteger(number) ? number : 0;
    }

    function sortedVaRules() {
      return [...vaRules].sort((left, right) => {
        const leftId = numericVaRuleId(left.id);
        const rightId = numericVaRuleId(right.id);
        if (leftId !== rightId) return leftId - rightId;
        return String(left.id || '').localeCompare(String(right.id || ''));
      });
    }

    function isVaRuleEnabled(item) {
      return item?.enabled !== false;
    }

    function vaRuleKind(item) {
      return item?.ruleKind === 'scenario' || item?.scenario ? 'scenario' : 'basic';
    }

    function lineDirectionLabel(value) {
      const direction = String(value || 'any');
      if (direction === 'forward') return '정방향';
      if (direction === 'reverse') return '역방향';
      return '양방향';
    }

    function formatVaRuleTime(value) {
      if (value === undefined || value === null || value === '') return '';
      let date = null;
      if (typeof value === 'number' || /^[0-9]+$/.test(String(value))) {
        const number = Number(value);
        if (Number.isFinite(number)) {
          date = new Date(number < 10000000000 ? number * 1000 : number);
        }
      } else {
        date = new Date(String(value));
      }
      if (!date || Number.isNaN(date.getTime())) return '';
      return new Intl.DateTimeFormat('ko-KR', {
        year: '2-digit',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    }

    function vaRuleLastModifiedText(item) {
      const value = item?.updatedAtMs ?? item?.updatedAt ?? item?.modifiedAtMs ?? item?.modifiedAt ?? item?.lastModifiedAt ?? item?.lastModified;
      const formatted = formatVaRuleTime(value);
      return formatted ? `마지막 수정 ${formatted}` : '';
    }

    function vaRuleSearchText(item) {
      return [
        item?.id,
        item?.name,
        sourceLabel(item?.source || {}),
        detectorLabel(item?.analysis?.profileId),
        eventTypeLabel(item?.event?.type),
        vaRuleScenarioText(item),
        classSummary(item?.analysis?.classes || []),
        isVaRuleEnabled(item) ? '적용 중 active enabled' : '비활성 inactive disabled'
      ].join(' ').toLowerCase();
    }

    function filteredVaRules() {
      const query = vaRuleListSearch.trim().toLowerCase();
      return sortedVaRules().filter((item) => {
        if (vaRuleStatusFilter === 'active' && !isVaRuleEnabled(item)) return false;
        if (vaRuleStatusFilter === 'inactive' && isVaRuleEnabled(item)) return false;
        if (vaRuleKindFilter !== 'all' && vaRuleKind(item) !== vaRuleKindFilter) return false;
        if (query && !vaRuleSearchText(item).includes(query)) return false;
        return true;
      });
    }

    function nextAvailableVaRuleId() {
      let maxSeen = 0;
      for (const item of vaRules) {
        const id = numericVaRuleId(item.id);
        if (id >= 1) {
          maxSeen = Math.max(maxSeen, id);
        }
      }
      return String(maxSeen + 1);
    }

    function eventTypeLabel(type) {
      const value = String(type || 'presence');
      if (value === 'enter') return '영역 진입';
      if (value === 'exit') return '영역 이탈';
      if (value === 'line-crossing') return '라인 통과';
      if (value === 'intrusion-dwell') return '체류 시나리오';
      if (value === 're-entry') return '재진입';
      if (value === 'wrong-direction') return '역방향 통과';
      if (value === 'reverse-line-crossing') return '역방향 통과';
      if (value === 'intrusion-after-line-crossing') return '라인 후 침입';
      if (value === 'loitering') return '배회';
      return '영역 내 감지';
    }

    function detectorLabel(profileId) {
      const id = String(profileId || 'server-default-va');
      const profile = [...builtInProfiles, ...profiles].find((item) => item.id === id);
      if (!profile) return id;
      return `${id} · ${(profile.detector === 'dummy' ? '개발용 더미' : 'YOLO/ONNX')}`;
    }

    function isBuiltInProfileId(id) {
      const value = String(id || '');
      return builtInProfiles.some((item) => String(item.id) === value);
    }

    function selectedTrackingClassesFromProfile(profile) {
      return profile?.trackingClasses || profile?.trackClasses || ['person', 'vehicle'];
    }

    function classSummary(classes) {
      const values = Array.isArray(classes) && classes.length > 0 ? classes : ['person', 'vehicle'];
      if (values.includes('*')) return '전체 객체';
      return values.map((value) => {
        const item = ruleCategories.find((candidate) => candidate.value === value);
        return item ? item.label : value;
      }).join(', ');
    }

    function profileUsageItems(profileId) {
      const id = String(profileId || '').trim();
      if (!id) return [];
      const usage = [];
      for (const item of rules) {
        if (String(item?.analysis?.profileId || '') === id) {
          usage.push(`Rule ${item.id || ''}`.trim());
        }
      }
      for (const item of vaRules) {
        if (String(item?.analysis?.profileId || '') === id) {
          usage.push(`VA 룰 #${item.id}${item.name ? ` ${item.name}` : ''}`);
        }
      }
      return usage;
    }

    function updateProfileDeleteWarning() {
      const el = $('profileDeleteWarningText');
      if (!el) return;
      const id = $('profileId')?.value.trim() || '';
      const usedBy = profileUsageItems(id);
      el.classList.toggle('is-warning', isBuiltInProfileId(id) || usedBy.length > 0);
      if (!id) {
        el.textContent = '삭제할 Profile ID가 없습니다.';
      } else if (isBuiltInProfileId(id)) {
        el.textContent = `기본 Profile '${id}'는 삭제할 수 없습니다. 복사해서 저장 Profile로 만든 뒤 수정하세요.`;
      } else if (usedBy.length > 0) {
        el.textContent = `이 Profile은 ${usedBy.slice(0, 3).join(', ')}${usedBy.length > 3 ? ` 외 ${usedBy.length - 3}개` : ''}에서 사용 중입니다. 삭제 전에 연결을 바꾸는 것을 권장합니다.`;
      } else {
        el.textContent = `저장 Profile '${id}'는 현재 사용하는 룰이 없습니다.`;
      }
    }

    function vaRuleScenarioText(item) {
      if (item?.ruleKind === 'scenario' || item?.scenario || item?.event?.type === 'intrusion-dwell') {
        const scenario = item.scenario || {};
        if ((scenario.type || item.event?.type) === 'intrusion-dwell') {
          return `Intrusion Dwell · ${msLabel(scenario.dwellTimeMs ?? 10000)}`;
        }
        return eventTypeLabel(scenario.type || item.event?.type || 'scenario');
      }
      return '기본 이벤트';
    }

    function vaRuleSubtitle(item) {
      const eventText = eventTypeLabel(item?.event?.type);
      const classText = classSummary(item?.analysis?.classes || []);
      return `${eventText} · ${classText}`;
    }

    function vaRuleEventDetailText(item) {
      const event = item?.event || {};
      const scenario = item?.scenario || {};
      const classText = classSummary(item?.analysis?.classes || []);
      if (vaRuleKind(item) === 'scenario') {
        const scenarioType = scenario.type || event.type || 'scenario';
        if (scenarioType === 'intrusion-dwell') {
          return `${classText} · 후보 ${msLabel(scenario.candidateTimeMs ?? 2000)} · 체류 ${msLabel(scenario.dwellTimeMs ?? 10000)}`;
        }
        if (scenarioType === 're-entry') {
          return `${classText} · 재진입 감지`;
        }
        if (scenarioType === 'wrong-direction' || scenarioType === 'reverse-line-crossing') {
          return `${classText} · 허용 방향 반대`;
        }
        if (scenarioType === 'intrusion-after-line-crossing') {
          return `${classText} · 라인 통과 후 구역 진입`;
        }
        if (scenarioType === 'loitering') {
          return `${classText} · 체류/이동 반경`;
        }
      }
      if (event.type === 'line-crossing') {
        return `${classText} · ${lineDirectionLabel(event.region?.direction)}`;
      }
      return `${classText} · 최소 ${Math.round(Number(event.minConfidence ?? 0.25) * 100)}%`;
    }

    function updateVaRuleIdDisplay() {
      const display = $('vaRuleIdDisplay');
      if (!display) return;
      const id = currentVaRuleId();
      const nextId = nextAvailableVaRuleId();
      display.textContent = id ? `#${id}` : (nextId ? `저장 시 #${nextId} 자동 지정` : '사용 가능한 번호 없음');
    }

    function setVaRuleEditorVisible(visible) {
      const panel = $('vaRuleEditorPanel');
      if (panel) panel.hidden = !visible;
      vaRuleEditorMode = visible ? vaRuleEditorMode : 'closed';
      if (!visible) {
        stopRulePreview({ silent: true }).catch(() => {});
        vaRuleEditorBaseline = '';
        vaRuleDirty = false;
        updateVaRuleDirtyIndicator();
      }
      if ($('deleteVaRuleBtn')) $('deleteVaRuleBtn').hidden = !currentVaRuleId();
      notifyEmbedHeight();
    }

    function serializedVaRuleEditorState() {
      try {
        return JSON.stringify(vaRuleJson());
      } catch (_) {
        return '';
      }
    }

    function updateVaRuleDirtyIndicator() {
      const indicator = $('ruleDirtyState');
      if (!indicator) return;
      if (!isVaRuleEditorOpen()) {
        indicator.textContent = '편집 중인 변경사항이 없습니다.';
        indicator.classList.remove('is-dirty');
        return;
      }
      indicator.textContent = vaRuleDirty
        ? '저장하지 않은 변경사항이 있습니다.'
        : '저장된 내용과 동일합니다.';
      indicator.classList.toggle('is-dirty', vaRuleDirty);
    }

    function refreshVaRuleDirtyState() {
      if (!isVaRuleEditorOpen() || !vaRuleEditorBaseline) {
        vaRuleDirty = false;
        updateVaRuleDirtyIndicator();
        return;
      }
      vaRuleDirty = serializedVaRuleEditorState() !== vaRuleEditorBaseline;
      updateVaRuleDirtyIndicator();
    }

    function resetVaRuleDirtyBaseline() {
      vaRuleEditorBaseline = serializedVaRuleEditorState();
      vaRuleDirty = false;
      resetRegionUndoStack();
      updateVaRuleDirtyIndicator();
    }

    function confirmDiscardVaRuleChanges(actionLabel) {
      if (!isVaRuleEditorOpen() || !vaRuleDirty) return true;
      const label = actionLabel || '이동';
      const ok = window.confirm(`저장하지 않은 변경사항이 있습니다. 저장하지 않고 ${label}할까요?`);
      if (!ok) {
        showFeedback('저장하지 않은 변경사항이 있어 이동을 취소했습니다.', 'error');
      }
      return ok;
    }

    function selectVaRule(id) {
      const nextId = String(id || '');
      if (isVaRuleEditorOpen() && vaRuleDirty && nextId !== currentVaRuleId()) {
        if (!confirmDiscardVaRuleChanges('다른 룰로 이동')) {
          return false;
        }
        closeVaRuleEditor({ skipDirtyCheck: true });
      }
      selectedVaRuleId = String(id || '');
      if ($('vaRuleSelect')) $('vaRuleSelect').value = selectedVaRuleId;
      if ($('viewVaRuleSelect') && selectedVaRuleId) $('viewVaRuleSelect').value = selectedVaRuleId;
      renderVaRuleLibrary();
      updateViewModeUi();
      return true;
    }

    function openVaRuleEditorForNew() {
      if (!confirmDiscardVaRuleChanges('새 룰 작성으로 이동')) {
        return;
      }
      selectedVaRuleId = '';
      vaRuleEditorMode = 'new';
      loadVaRule(null);
      if ($('vaRuleEditorTitle')) $('vaRuleEditorTitle').textContent = '새 영상 분석 룰 추가';
      if ($('vaRuleEditorModeBadge')) $('vaRuleEditorModeBadge').textContent = '새 룰';
      if ($('saveVaRuleBtn')) $('saveVaRuleBtn').textContent = '룰 저장';
      setVaRuleEditorVisible(true);
      resetVaRuleDirtyBaseline();
      $('vaRuleEditorPanel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      status('새 영상 분석 룰을 작성합니다.');
      showFeedback('새 룰 작성 모드');
    }

    function openVaRuleEditorForEdit(id) {
      if (isVaRuleEditorOpen() && vaRuleDirty && String(id || '') !== currentVaRuleId()) {
        if (!confirmDiscardVaRuleChanges('다른 룰 수정으로 이동')) {
          return;
        }
      }
      const item = vaRules.find((entry) => String(entry.id) === String(id));
      if (!item) {
        showFeedback('수정할 룰을 먼저 선택하세요.', 'error');
        return;
      }
      selectedVaRuleId = String(item.id);
      vaRuleEditorMode = 'edit';
      loadVaRule(item);
      if ($('vaRuleEditorTitle')) $('vaRuleEditorTitle').textContent = `영상 분석 룰 #${item.id} 수정`;
      if ($('vaRuleEditorModeBadge')) $('vaRuleEditorModeBadge').textContent = '수정 중';
      if ($('saveVaRuleBtn')) $('saveVaRuleBtn').textContent = '수정 내용 저장';
      setVaRuleEditorVisible(true);
      resetVaRuleDirtyBaseline();
      renderVaRuleLibrary();
      $('vaRuleEditorPanel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function closeVaRuleEditor(options = {}) {
      if (!options.skipDirtyCheck && !confirmDiscardVaRuleChanges('목록으로 이동')) {
        return false;
      }
      setVaRuleEditorVisible(false);
      $('vaRuleLibraryCard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return true;
    }

    function renderVaRuleLibrary() {
      const container = $('vaRuleList');
      if (!container) return;
      container.innerHTML = '';
      const allItems = sortedVaRules();
      const items = filteredVaRules();
      const selectedExists = selectedVaRuleId && items.some((item) => String(item.id) === selectedVaRuleId);
      if (!selectedExists) {
        selectedVaRuleId = items.length > 0 ? String(items[0].id) : '';
      }
      setText('vaRuleFilteredMetric', `${items.length.toLocaleString('ko-KR')}개`);
      if (allItems.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.textContent = '저장된 영상 분석 룰이 없습니다. 룰 추가를 눌러 첫 설정을 만드세요.';
        container.appendChild(empty);
        updateVaRuleIdDisplay();
        return;
      }
      if (items.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.textContent = '검색/필터 조건과 일치하는 룰이 없습니다. 검색어 또는 필터를 조정하세요.';
        container.appendChild(empty);
        updateVaRuleIdDisplay();
        return;
      }

      const header = document.createElement('div');
      header.className = 'rule-row is-header';
      ['ID', '룰 이름', '연결 영상', '이벤트', '상태', '작업'].forEach((text) => {
        const cell = document.createElement('div');
        cell.textContent = text;
        header.appendChild(cell);
      });
      container.appendChild(header);

      for (const item of items) {
        const row = document.createElement('div');
        row.className = `rule-row${String(item.id) === selectedVaRuleId ? ' is-selected' : ''}`;
        row.tabIndex = 0;
        row.addEventListener('click', () => selectVaRule(item.id));
        row.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            selectVaRule(item.id);
          }
        });

        const idCell = document.createElement('div');
        idCell.className = 'rule-id-badge';
        idCell.textContent = `#${item.id}`;
        row.appendChild(idCell);

        const main = document.createElement('div');
        main.className = 'rule-main';
        const title = document.createElement('strong');
        title.textContent = item.name || `영상 분석 룰 ${item.id}`;
        const meta = document.createElement('span');
        const modifiedText = vaRuleLastModifiedText(item);
        meta.textContent = [
          detectorLabel(item.analysis?.profileId),
          classSummary(item.analysis?.classes || []),
          modifiedText
        ].filter(Boolean).join(' · ');
        main.appendChild(title);
        main.appendChild(meta);
        row.appendChild(main);

        const source = document.createElement('div');
        source.className = 'rule-cell';
        source.textContent = sourceLabel(item.source || {});
        row.appendChild(source);

        const eventCell = document.createElement('div');
        eventCell.className = 'rule-cell rule-cell-stack';
        const kindChip = document.createElement('span');
        kindChip.className = `status-chip${vaRuleKind(item) === 'scenario' ? ' is-scenario' : ' is-muted'}`;
        kindChip.textContent = vaRuleKind(item) === 'scenario' ? '시나리오' : '기본 이벤트';
        const eventTitle = document.createElement('strong');
        eventTitle.textContent = eventTypeLabel(vaRuleKind(item) === 'scenario'
          ? (item.scenario?.type || item.event?.type)
          : item.event?.type);
        const eventDetail = document.createElement('span');
        eventDetail.textContent = vaRuleEventDetailText(item);
        eventCell.appendChild(kindChip);
        eventCell.appendChild(eventTitle);
        eventCell.appendChild(eventDetail);
        row.appendChild(eventCell);

        const stateCell = document.createElement('div');
        stateCell.className = 'rule-cell rule-cell-stack';
        const stateChip = document.createElement('span');
        stateChip.className = `status-chip${isVaRuleEnabled(item) ? ' is-active' : ' is-muted'}`;
        stateChip.textContent = isVaRuleEnabled(item) ? '적용 중' : '비활성';
        const scenarioText = document.createElement('span');
        scenarioText.textContent = vaRuleScenarioText(item);
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'secondary';
        toggle.textContent = isVaRuleEnabled(item) ? '비활성화' : '적용';
        toggle.addEventListener('click', (event) => {
          event.stopPropagation();
          toggleVaRuleEnabled(item.id).catch((error) => {
            status(`영상 분석 룰 상태 변경 실패: ${error.message}`);
            showFeedback(`상태 변경 실패: ${error.message}`, 'error');
          });
        });
        stateCell.appendChild(stateChip);
        stateCell.appendChild(scenarioText);
        stateCell.appendChild(toggle);
        row.appendChild(stateCell);

        const actions = document.createElement('div');
        actions.className = 'row-actions';
        const viewButton = document.createElement('button');
        viewButton.type = 'button';
        viewButton.className = 'secondary';
        viewButton.textContent = '보기';
        viewButton.addEventListener('click', (event) => {
          event.stopPropagation();
          openVaRuleInViewer(item.id);
        });
        const edit = document.createElement('button');
        edit.type = 'button';
        edit.className = 'secondary';
        edit.textContent = '수정';
        edit.addEventListener('click', (event) => {
          event.stopPropagation();
          openVaRuleEditorForEdit(item.id);
        });
        const duplicate = document.createElement('button');
        duplicate.type = 'button';
        duplicate.className = 'secondary';
        duplicate.textContent = '복제';
        duplicate.addEventListener('click', (event) => {
          event.stopPropagation();
          duplicateVaRuleById(item.id).catch((error) => {
            status(`영상 분석 룰 복제 실패: ${error.message}`);
            showFeedback(`복제 실패: ${error.message}`, 'error');
          });
        });
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'danger';
        remove.textContent = '삭제';
        remove.addEventListener('click', (event) => {
          event.stopPropagation();
          deleteVaRuleById(item.id, { confirm: true }).catch((error) => {
            status(`영상 분석 룰 삭제 실패: ${error.message}`);
            showFeedback(`영상 분석 룰 삭제 실패: ${error.message}`, 'error');
          });
        });
        actions.appendChild(viewButton);
        actions.appendChild(edit);
        actions.appendChild(duplicate);
        actions.appendChild(remove);
        row.appendChild(actions);
        container.appendChild(row);
      }
      updateVaRuleIdDisplay();
    }

    function openVaRuleInViewer(id) {
      if (!confirmDiscardVaRuleChanges('영상 분석 보기로 이동')) {
        return;
      }
      closeVaRuleEditor({ skipDirtyCheck: true });
      selectVaRule(id);
      if ($('viewVaRuleSelect')) $('viewVaRuleSelect').value = String(id);
      const ruleMode = document.querySelector('input[name="viewMode"][value="rule"]');
      if (ruleMode) {
        ruleMode.checked = true;
      }
      const viewerButton = $('analysisViewerTabBtn');
      if (viewerButton) viewerButton.click();
      updateViewModeUi();
    }

    function updateVaRuleSourceUi() {
      const source = currentVaRuleSourceJson();
      const fileField = $('vaRuleFileField');
      const urlField = $('vaRuleUrlField');
      if (fileField) fileField.hidden = source.kind !== 'file';
      if (urlField) urlField.hidden = source.kind === 'file';
      if ($('vaRuleUrlLabelText')) {
        $('vaRuleUrlLabelText').textContent = source.kind === 'webrtc'
          ? 'WebRTC Source ID'
          : '분석할 영상 URL';
      }
      if ($('vaRuleUrlHelp')) {
        $('vaRuleUrlHelp').textContent = source.kind === 'webrtc'
          ? 'WHIP/WebRTC publish로 등록된 sourceId를 입력합니다.'
          : 'RTSP 또는 HTTP/HLS 전체 URL을 입력합니다.';
      }
      if ($('vaRuleSourceHelp')) {
        $('vaRuleSourceHelp').textContent = source.kind === 'file'
          ? '서버 파일은 파일 목록만 선택하면 됩니다. URL 또는 Source ID 입력칸은 RTSP/HTTP/HLS/WebRTC 소스를 고를 때만 표시됩니다.'
          : '외부/게시 소스를 분석 설정에 묶는 모드입니다. 이 값은 vaRule URL 요청 시 자동으로 재사용됩니다.';
      }
      if ($('vaRuleSourceSummary')) {
        $('vaRuleSourceSummary').textContent = `현재 설정 소스: ${sourceLabel(source)}`;
      }
      if ($('previewSourceMode')?.value === 'vaRule' && (previewTapId || $('autoPreviewInput')?.checked)) {
        startRulePreview().catch((error) => {
          setRulePreviewUi(false);
          previewStatus(`영상 프레임 보기 실패: ${error.message}`);
        });
      }
    }

    function updatePreviewSourceUi() {
      const mode = $('previewSourceMode')?.value || 'file';
      const fileSelect = $('previewFileSelect');
      const fileField = $('previewFileField');
      if (fileSelect) fileSelect.disabled = mode !== 'file';
      if (fileField) fileField.hidden = mode !== 'file';
    }

    function applyPreviewAnalysisParams(params) {
      if (previewOverlayEnabled()) {
        applyBasicOverlayParams(params);
      } else {
        params.delete('va');
        params.delete('analysis');
        params.delete('overlay');
        params.set('detector', 'dummy');
      }
      params.set('fps', '4');
      params.set('maxQueue', '1');
      params.set('adaptive', '1');
      return params;
    }

    async function requestJson(url, options = {}) {
      const response = await fetch(url, options);
      const text = await response.text();
      let payload = {};
      try {
        payload = text ? JSON.parse(text) : {};
      } catch (_) {
        payload = { raw: text };
      }
      if (!response.ok) {
        throw new Error(payload.error || text || `HTTP ${response.status}`);
      }
      return payload;
    }

    function percentValue(id) {
      return Math.round(Number($(id).value || 0)) / 100;
    }

    function clampedIntValue(id, fallback, min, max) {
      const value = Number($(id).value || fallback);
      if (!Number.isFinite(value)) return fallback;
      return Math.max(min, Math.min(max, Math.round(value)));
    }

    function msLabel(value) {
      const number = Number(value || 0);
      return `${Math.round(number).toLocaleString('ko-KR')} ms`;
    }

    function normalizeTrackingToken(value) {
      return String(value || '').trim().toLowerCase().replace(/\s+/g, '');
    }

    function selectedTrackingClasses() {
      return Array.from(document.querySelectorAll('[data-tracking-category]:checked')).map((el) => el.value);
    }

    function setTrackingClasses(values) {
      const rawValues = Array.isArray(values) && values.length > 0 ? values : ['person', 'vehicle'];
      const normalized = new Set(rawValues.map(normalizeTrackingToken).filter(Boolean));
      const hasAll = normalized.has('*') || normalized.has('all') || normalized.has('any');
      document.querySelectorAll('[data-tracking-category]').forEach((el) => {
        const value = el.value;
        const categoryLabels = ruleCategoryLabels[value] || [];
        el.checked =
          hasAll ||
          (!hasAll && normalized.has(value)) ||
          (!hasAll && categoryLabels.some((label) => normalized.has(normalizeTrackingToken(label))));
      });
    }

    function setTrackingCategoryChecks(predicate) {
      document.querySelectorAll('[data-tracking-category]').forEach((el) => {
        el.checked = predicate(el.value, el);
      });
      updatePreviews();
    }

    function selectedClasses() {
      const selected = Array.from(document.querySelectorAll('[data-rule-category]:checked')).map((el) => el.value);
      return selected.includes('*') ? ['*'] : selected;
    }

    function setCheckedClasses(predicate) {
      document.querySelectorAll('[data-rule-category]').forEach((el) => {
        const group = el.dataset.classGroup || '';
        el.checked = predicate(el.value, group, el);
      });
      updatePreviews();
    }

    function filterClassChecks() {
      return;
    }

    function isLineRule() {
      if (isScenarioRule()) return false;
      return $('ruleEventType').value === 'line-crossing';
    }

    function isScenarioRule() {
      const selected = document.querySelector('input[name="ruleKind"]:checked');
      return selected && selected.value === 'scenario';
    }

    function selectedScenarioType() {
      return $('scenarioType')?.value || 'intrusion-dwell';
    }

    function isWrongDirectionScenario() {
      return isScenarioRule() && selectedScenarioType() === 'wrong-direction';
    }

    function isGeometryLineMode() {
      return isLineRule() || isWrongDirectionScenario();
    }

    function setRuleKind(kind) {
      const normalized = kind === 'scenario' ? 'scenario' : 'basic';
      document.querySelectorAll('input[name="ruleKind"]').forEach((el) => {
        el.checked = el.value === normalized;
      });
      if (normalized === 'scenario' && isLineRule()) {
        $('ruleEventType').value = 'presence';
      }
    }

    function splitCsvTokens(value) {
      return String(value || '')
        .split(/[;,]/)
        .map((token) => token.trim())
        .filter(Boolean);
    }

    function scenarioJson() {
      const scenarioType = selectedScenarioType();
      const candidateTimeMs = clampedIntValue('scenarioCandidateMs', 2000, 0, 3600000);
      const dwellTimeMs = clampedIntValue('scenarioDwellMs', 10000, 0, 86400000);
      const cooldownMs = clampedIntValue('scenarioCooldownMs', 5000, 0, 86400000);
      if (scenarioType === 'wrong-direction') {
        return {
          type: 'wrong-direction',
          enabled: true,
          cooldownMs,
          targetClasses: selectedClasses(),
          trackHealth: {
            requireStableTrack: $('scenarioStableOnly').checked
          },
          lifecycle: {
            emit: 'confirmed-once',
            duplicateKey: 'stream/channel/scenario/line/track',
            endWhen: ['cooldown-ended', 'track-lost-or-terminated']
          }
        };
      }
      return {
        type: scenarioType || 'intrusion-dwell',
        enabled: true,
        candidateTimeMs,
        dwellTimeMs,
        cooldownMs,
        targetClasses: selectedClasses(),
        restrictedZoneIds: splitCsvTokens($('scenarioZoneIds').value),
        trackHealth: {
          requireStableTrack: $('scenarioStableOnly').checked
        },
        lifecycle: {
          emit: 'confirmed-once',
          duplicateKey: 'stream/channel/scenario/zone/track',
          endWhen: ['zone-exit', 'track-lost-or-terminated']
        }
      };
    }

    function lineDirectionValue() {
      const value = $('ruleLineDirection')?.value || 'any';
      return ['any', 'forward', 'reverse'].includes(value) ? value : 'any';
    }

    function scenarioLineDirectionValue() {
      const value = $('scenarioLineDirection')?.value || 'forward';
      return ['forward', 'reverse'].includes(value) ? value : 'forward';
    }

    function activeLineDirectionValue() {
      return isWrongDirectionScenario() ? scenarioLineDirectionValue() : lineDirectionValue();
    }

    function lineDirectionLabel(value = activeLineDirectionValue()) {
      if (value === 'forward') return '정방향(-측→+측)';
      if (value === 'reverse') return '역방향(+측→-측)';
      return '양방향';
    }

    function maxGeometryPoints() {
      return isGeometryLineMode() ? lineMaxPoints : polygonMaxPoints;
    }

    function minimumGeometryPoints() {
      return isGeometryLineMode() ? lineMaxPoints : 3;
    }

    function defaultLinePoints() {
      return [
        { x: 0.25, y: 0.50 },
        { x: 0.75, y: 0.50 }
      ];
    }

    function defaultPolygonPoints() {
      return [
        { x: 0.20, y: 0.22 },
        { x: 0.80, y: 0.22 },
        { x: 0.80, y: 0.78 },
        { x: 0.20, y: 0.78 }
      ];
    }

    function clampPoint(point) {
      return {
        x: Math.max(0, Math.min(1, Number(point.x || 0))),
        y: Math.max(0, Math.min(1, Number(point.y || 0)))
      };
    }

    function cloneRegionPoints(points = regionPoints) {
      return points.map((point) => clampPoint(point));
    }

    function pushRegionUndo() {
      regionUndoStack.push(cloneRegionPoints());
      if (regionUndoStack.length > regionUndoMax) {
        regionUndoStack.shift();
      }
      updateGeometryActionButtons();
    }

    function resetRegionUndoStack() {
      regionUndoStack = [];
      updateGeometryActionButtons();
    }

    function undoRegionChange() {
      if (regionUndoStack.length === 0) {
        showFeedback('되돌릴 영역 변경사항이 없습니다.', 'error');
        return;
      }
      regionPoints = cloneRegionPoints(regionUndoStack.pop());
      updatePreviews();
      showFeedback('영역 변경을 되돌렸습니다.');
    }

    function deleteLastRegionPoint() {
      if (regionPoints.length === 0) {
        showFeedback('삭제할 점이 없습니다.', 'error');
        return;
      }
      pushRegionUndo();
      regionPoints = regionPoints.slice(0, -1);
      updatePreviews();
    }

    function clearRegionGeometry() {
      if (regionPoints.length === 0) {
        showFeedback('이미 비어 있는 영역입니다.', 'error');
        return;
      }
      pushRegionUndo();
      regionPoints = [];
      updatePreviews();
    }

    function normalizeGeometryForMode() {
      const maxPoints = maxGeometryPoints();
      regionPoints = regionPoints.map(clampPoint).slice(0, maxPoints);
    }

    function profileJson() {
      return {
        id: $('profileId').value.trim() || 'fast-local',
        detector: $('profileDetector').value,
        fps: Number($('profileFps').value),
        maxQueue: Number($('profileQueue').value),
        confidence: percentValue('profileConfidence'),
        nms: percentValue('profileNms'),
        inputWidth: Number($('profileInputWidth').value),
        inputHeight: Number($('profileInputHeight').value),
        adaptive: $('profileAdaptive').checked,
        trackingClasses: selectedTrackingClasses()
      };
    }

    function eventActionsJson() {
      const postUrl = $('eventPostUrlInput').value.trim();
      return {
        highlight: {
          enabled: $('eventFlashInput').checked,
          mode: 'blink',
          target: 'matched-object',
          durationMs: clampedIntValue('eventFlashMsInput', 1200, 100, 10000),
          color: '#ff0000'
        },
        post: {
          enabled: postUrl.length > 0,
          method: 'POST',
          url: postUrl,
          contentType: 'application/json',
          payloadFormat: 'media-server.va.event.v1'
        }
      };
    }

    function eventPayloadExampleJson(region) {
      const classes = selectedClasses();
      const scenarioType = selectedScenarioType();
      const payload = {
        schema: 'media-server.va.event.v1',
        eventId: 'evt_20260425_000001',
        timestamp: '2026-04-25T00:00:00.000Z',
        rule: {
          id: $('ruleId').value.trim() || 'file-person-vehicle-area',
          type: isScenarioRule() ? scenarioType : $('ruleEventType').value
        },
        source: {
          kind: $('ruleSourceKind').value,
          route: $('ruleRoute').value
        },
        object: {
          trackId: 'track-001',
          class: classes[0] || 'person',
          confidence: 0.92,
          bbox: {
            x: 0.32,
            y: 0.18,
            width: 0.22,
            height: 0.46
          }
        },
        region,
        action: {
          highlight: eventActionsJson().highlight
        }
      };
      if (isScenarioRule()) {
        payload.scenario = scenarioType === 'wrong-direction'
          ? {
              phase: 'Confirmed',
              lifecycle: 'emit-once',
              cooldownMs: clampedIntValue('scenarioCooldownMs', 5000, 0, 86400000),
              trackHealth: $('scenarioStableOnly').checked ? 'stable-only' : 'allow-unstable'
            }
          : {
              phase: 'Confirmed',
              lifecycle: 'emit-once',
              candidateTimeMs: clampedIntValue('scenarioCandidateMs', 2000, 0, 3600000),
              dwellTimeMs: clampedIntValue('scenarioDwellMs', 10000, 0, 86400000),
              trackHealth: $('scenarioStableOnly').checked ? 'stable-only' : 'allow-unstable'
            };
      }
      return payload;
    }

    function ruleJson() {
      normalizeGeometryForMode();
      const scenarioMode = isScenarioRule();
      const lineMode = isGeometryLineMode();
      const points = regionPoints.map((point) => ({
        x: Number(point.x.toFixed(4)),
        y: Number(point.y.toFixed(4))
      }));
      const region = {
        type: lineMode ? 'line' : 'polygon',
        points
      };
      if (lineMode) {
        region.direction = activeLineDirectionValue();
      }
      const scenario = scenarioMode ? scenarioJson() : null;
      const payload = {
        id: $('ruleId').value.trim() || 'file-person-vehicle-area',
        enabled: $('ruleEnabled').value === 'true',
        match: {
          sourceKind: $('ruleSourceKind').value,
          route: $('ruleRoute').value
        },
        analysis: {
          profileId: $('ruleProfileId').value || $('profileId').value.trim() || 'server-default-va',
          classes: selectedClasses()
        },
        event: {
          type: scenarioMode ? scenario.type : $('ruleEventType').value,
          region,
          minConfidence: percentValue('ruleConfidence'),
          minDurationMs: Number($('ruleMinDurationMs').value || 0)
        },
        outputs: {
          overlay: true,
          metadata: true,
          events: true
        },
        eventActions: eventActionsJson()
      };
      if (scenarioMode) {
        payload.ruleKind = 'scenario';
        payload.scenario = scenario;
      } else {
        payload.ruleKind = 'basic';
      }
      return payload;
    }

    function vaRuleJson() {
      const payload = ruleJson();
      const id = currentVaRuleId();
      if (id) {
        payload.id = id;
        payload.match = {
          sourceKind: '*',
          route: '*',
          vaRule: id
        };
      } else {
        delete payload.id;
        delete payload.match;
      }
      payload.name = $('vaRuleName')?.value.trim() || (id ? `영상 분석 설정 ${id}` : '새 영상 분석 설정');
      payload.source = currentVaRuleSourceJson();
      payload.binding = {
        urlMode: id ? `vaRule=${id}` : 'vaRule=<auto>',
        sourceLocked: true,
        sourceOverrideAllowed: false
      };
      return payload;
    }

    function updateRangeLabels() {
      $('profileFpsValue').textContent = $('profileFps').value;
      $('profileQueueValue').textContent = $('profileQueue').value;
      $('profileConfidenceValue').textContent = `${$('profileConfidence').value}%`;
      $('profileNmsValue').textContent = `${$('profileNms').value}%`;
      $('ruleConfidenceValue').textContent = `${$('ruleConfidence').value}%`;
      const candidateTimeMs = clampedIntValue('scenarioCandidateMs', 2000, 0, 3600000);
      const dwellTimeMs = clampedIntValue('scenarioDwellMs', 10000, 0, 86400000);
      const cooldownMs = clampedIntValue('scenarioCooldownMs', 5000, 0, 86400000);
      const wrongDirectionMode = isWrongDirectionScenario();
      if ($('scenarioCandidateMsValue')) $('scenarioCandidateMsValue').textContent = msLabel(candidateTimeMs);
      if ($('scenarioDwellMsValue')) $('scenarioDwellMsValue').textContent = msLabel(dwellTimeMs);
      if ($('scenarioCooldownMsValue')) $('scenarioCooldownMsValue').textContent = msLabel(cooldownMs);
      if ($('scenarioSummaryText')) {
        const zones = splitCsvTokens($('scenarioZoneIds').value);
        const zoneLabel = zones.length > 0 ? zones.join(', ') : '현재 그린 제한구역';
        const stability = $('scenarioStableOnly').checked ? '안정적인 track만' : '감지된 track';
        $('scenarioSummaryText').textContent = wrongDirectionMode
          ? `${stability}이 line을 통과할 때 실제 방향이 허용 방향(${lineDirectionLabel()})과 다르면 wrong-direction scenario event를 발생시킵니다. 같은 track/line은 ${msLabel(cooldownMs)} 동안 중복 알림을 억제합니다.`
          : `${stability}이 ${zoneLabel} 안에 들어오면 ${msLabel(candidateTimeMs)} 뒤 후보로 보고, ${msLabel(dwellTimeMs)} 이상 머물면 intrusion-dwell 이벤트를 1회 발생시킵니다. 같은 track은 ${msLabel(cooldownMs)} 동안 중복 알림을 억제합니다.`;
      }
      const zones = splitCsvTokens($('scenarioZoneIds').value);
      const zoneLabel = zones.length > 0 ? zones.join(', ') : '현재 그린 제한구역';
      const classes = selectedClasses();
      const classLabel = classes.length > 0 ? classes.join(', ') : '선택 필요';
      if ($('scenarioReadinessZone')) {
        $('scenarioReadinessZone').textContent = wrongDirectionMode
          ? `line ${regionPoints.length}/${lineMaxPoints} · 허용 ${lineDirectionLabel()}`
          : zoneLabel;
      }
      if ($('scenarioReadinessTarget')) $('scenarioReadinessTarget').textContent = classLabel;
      if ($('scenarioReadinessTiming')) {
        $('scenarioReadinessTiming').textContent = wrongDirectionMode
          ? `재알림 ${msLabel(cooldownMs)} · same track/line dedupe`
          : `후보 ${msLabel(candidateTimeMs)} · 확정 ${msLabel(dwellTimeMs)} · 재알림 ${msLabel(cooldownMs)}`;
      }
      if ($('scenarioReadinessEmit')) {
        $('scenarioReadinessEmit').textContent = wrongDirectionMode
          ? 'wrong-direction · line-crossing과 별도 scenario event'
          : 'intrusion-dwell · 같은 track/구역 1회';
      }
      if ($('scenarioReadinessHealth')) {
        $('scenarioReadinessHealth').textContent = $('scenarioStableOnly').checked
          ? '안정적인 track만 후보로 판단'
          : '불안정 track도 후보로 허용';
      }
      if ($('scenarioReadinessGeometry')) {
        $('scenarioReadinessGeometry').textContent = wrongDirectionMode
          ? `line ${regionPoints.length}/${lineMaxPoints} · forward/reverse 필수`
          : `polygon ${regionPoints.length}개 점`;
      }
      renderScenarioPhasePreview(wrongDirectionMode);
      renderScenarioMetricGrid(wrongDirectionMode);
      if ($('scenarioPanelHint')) {
        $('scenarioPanelHint').textContent = wrongDirectionMode
          ? 'WrongDirection은 line geometry와 event.region.direction을 사용해 허용 방향을 저장합니다. 기존 line-crossing 기본 이벤트와 Event POST payload schema는 변경하지 않습니다.'
          : '이 UI는 시나리오 rule payload를 저장하고, 현재 polygon을 제한구역 후보로 사용합니다. 실제 engine 활성화는 서버의 scenario 설정값과 함께 동작합니다.';
      }
      setText('geometryRegionNameText', currentGeometryName());
    }

    function selectedProfileDocument() {
      const id = $('ruleProfileId')?.value || $('profileId')?.value || 'server-default-va';
      return [...builtInProfiles, ...profiles].find((item) => item.id === id) || null;
    }

    function profileSummaryItem(label, value) {
      const item = document.createElement('div');
      item.className = 'profile-summary-item';
      const labelEl = document.createElement('span');
      labelEl.textContent = label;
      const valueEl = document.createElement('strong');
      valueEl.textContent = value;
      item.appendChild(labelEl);
      item.appendChild(valueEl);
      return item;
    }

    function updateProfileSummaryText() {
      const container = $('profileSummaryText');
      if (!container) return;
      container.innerHTML = '';
      const profile = selectedProfileDocument();
      const id = $('ruleProfileId')?.value || $('profileId')?.value || 'server-default-va';
      const detector = profile
        ? (profile.detector === 'dummy' ? '개발용 더미' : (profile.detector === 'server-config' ? '서버 기본값' : 'YOLO/ONNX'))
        : '선택 필요';
      const fps = profile?.fps || profile?.targetFps || $('profileFps')?.value || 6;
      const width = profile?.inputWidth || profile?.modelInputWidth || $('profileInputWidth')?.value || 640;
      const height = profile?.inputHeight || profile?.modelInputHeight || $('profileInputHeight')?.value || 640;
      const confidence = Math.round(Number(profile?.confidence ?? profile?.confidenceThreshold ?? percentValue('profileConfidence')) * 100);
      const nms = Math.round(Number(profile?.nms ?? profile?.nmsThreshold ?? percentValue('profileNms')) * 100);
      const tracking = classSummary(selectedTrackingClassesFromProfile(profile));
      [
        ['Profile', id],
        ['Detector', detector],
        ['FPS', `${fps}`],
        ['Input size', `${width} x ${height}`],
        ['Confidence', `${confidence}%`],
        ['NMS', `${nms}%`],
        ['Tracking category', tracking]
      ].forEach(([label, value]) => {
        container.appendChild(profileSummaryItem(label, value));
      });
      updateProfileDeleteWarning();
    }

    function reviewTile(label, value) {
      const tile = document.createElement('div');
      tile.className = 'review-tile';
      const title = document.createElement('strong');
      title.textContent = label;
      const body = document.createElement('span');
      body.textContent = value;
      tile.appendChild(title);
      tile.appendChild(body);
      return tile;
    }

    function updateReviewSummary(currentRule) {
      const container = $('ruleReviewSummary');
      if (!container) return;
      const payload = vaRuleJson();
      const source = payload.source || currentVaRuleSourceJson();
      const scenarioMode = payload.ruleKind === 'scenario' || Boolean(payload.scenario);
      container.innerHTML = '';
      container.appendChild(reviewTile('Rule', `${currentVaRuleId() ? `#${currentVaRuleId()}` : '신규'} · ${payload.name || '이름 없음'} · ${payload.enabled === false ? '저장만 함' : '적용함'}`));
      container.appendChild(reviewTile('영상 소스', sourceLabel(source)));
      container.appendChild(reviewTile('Profile', $('ruleProfileId')?.value || 'server-default-va'));
      container.appendChild(reviewTile('이벤트 방식', scenarioMode ? vaRuleScenarioText(payload) : eventTypeLabel(currentRule?.event?.type)));
      container.appendChild(reviewTile('대상 객체', classSummary(currentRule?.analysis?.classes || [])));
      container.appendChild(reviewTile('영역/라인', `${currentRule?.event?.region?.type || 'polygon'} · 점 ${regionPoints.length}/${maxGeometryPoints()}`));
      const validation = validateVaRulePayloadDetailed(payload);
      const firstError = firstValidationMessage(validation);
      setText('ruleSaveReadiness', firstError ? `저장 불가: ${firstError}` : '저장 가능: 필수 입력이 채워졌습니다.');
      renderValidationSummary(validation);
      updateVaRuleSaveButton(validation);
    }

    function renderValidationSummary(validation) {
      const container = $('ruleValidationSummary');
      if (!container) return;
      const errors = validation?.errors || [];
      container.innerHTML = '';
      container.className = `validation-summary ${errors.length > 0 ? 'is-error' : 'is-ok'}`;
      if (errors.length === 0) {
        const item = document.createElement('div');
        item.className = 'validation-item';
        const title = document.createElement('strong');
        title.textContent = '검증 통과';
        const message = document.createElement('span');
        message.textContent = '필수값, 영역/라인, 시나리오 시간 조건, POST URL 형식이 저장 가능한 상태입니다.';
        item.appendChild(title);
        item.appendChild(message);
        container.appendChild(item);
        return;
      }
      for (const error of errors) {
        const item = document.createElement('div');
        item.className = 'validation-item';
        const title = document.createElement('strong');
        title.textContent = error.section || '확인 필요';
        const message = document.createElement('span');
        message.textContent = error.message || '입력값을 확인하세요.';
        item.appendChild(title);
        item.appendChild(message);
        container.appendChild(item);
      }
    }

    function updateVaRuleSaveButton(validation) {
      const button = $('saveVaRuleBtn');
      if (!button) return;
      const disabled = (validation?.errors || []).length > 0;
      button.disabled = disabled;
      button.title = disabled ? firstValidationMessage(validation) : '';
    }

    function updateGeometryText() {
      const scenarioMode = isScenarioRule();
      const wrongDirectionMode = isWrongDirectionScenario();
      const lineMode = isGeometryLineMode();
      const valid = regionPoints.length >= minimumGeometryPoints();
      const mode = regionPoints.length === 0 ? 'none' : (lineMode ? 'line' : 'polygon');
      const regionName = currentGeometryName();
      $('geometryLabel').textContent = lineMode ? (wrongDirectionMode ? 'WrongDirection 판단 선' : '이벤트 판단 선') : (scenarioMode ? '시나리오 제한구역' : '이벤트 판단 영역');
      $('clearRegionBtn').textContent = '전체 영역 초기화';
      $('ruleLineDirection').disabled = !isLineRule();
      $('geometryHint').textContent = lineMode
        ? `${wrongDirectionMode ? 'WrongDirection scenario' : '라인 통과 룰'}은 선분의 시작/끝 2개 점만 사용합니다. 방향은 ${lineDirectionLabel()}으로 저장합니다. 기존 점 근처를 드래그하면 점 위치를 이동합니다.`
        : (scenarioMode
          ? `Intrusion Dwell은 현재 polygon을 제한구역 후보로 저장합니다. 3개 이상이면 구역으로 저장되며, 같은 track이 설정 시간 이상 머물면 체류 확정 후보가 됩니다.`
          : `캔버스를 클릭해 다각형 꼭짓점을 추가합니다. 3개 이상이면 영역으로 저장됩니다. 최대 ${polygonMaxPoints}개까지 지정할 수 있습니다. 기존 점 근처를 드래그하면 새 점을 만들지 않고 점 위치를 이동합니다.`);
      setText(
        'geometryValidationText',
        valid
          ? `${lineMode ? 'line' : 'polygon'} 설정 가능 · 점 ${regionPoints.length}/${maxGeometryPoints()}`
          : `${lineMode ? 'line' : 'polygon'} 설정 불가 · 최소 ${minimumGeometryPoints()}개 점이 필요합니다.`
      );
      setText('geometryModeText', mode);
      setText('geometryPointCountText', `${regionPoints.length}/${maxGeometryPoints()}`);
      setText('geometryMinimumText', valid
        ? `충족 · 최소 ${minimumGeometryPoints()}개`
        : `부족 · 최소 ${minimumGeometryPoints()}개 필요`);
      setText('geometryRegionNameText', regionName);
      $('geometryMinimumCard')?.classList.toggle('is-ok', valid);
      $('geometryMinimumCard')?.classList.toggle('is-error', !valid);
      $('geometryModeCard')?.classList.toggle('is-error', mode === 'none');
      $('geometryModeCard')?.classList.toggle('is-ok', mode !== 'none');
      updateGeometryActionButtons();
      renderRegionCoordinates();
    }

    function currentGeometryName() {
      if (isWrongDirectionScenario()) {
        return 'wrong-direction line';
      }
      if (isScenarioRule()) {
        const zones = splitCsvTokens($('scenarioZoneIds')?.value || '');
        return zones.length > 0 ? zones.join(', ') : '현재 제한구역';
      }
      if (isLineRule()) {
        return 'line-crossing';
      }
      return '기본 이벤트 영역';
    }

    function updateGeometryActionButtons() {
      const undoButton = $('undoRegionBtn');
      const deleteButton = $('deleteLastPointBtn');
      const clearButton = $('clearRegionBtn');
      if (undoButton) undoButton.disabled = regionUndoStack.length === 0;
      if (deleteButton) deleteButton.disabled = regionPoints.length === 0;
      if (clearButton) clearButton.disabled = regionPoints.length === 0;
    }

    function renderRegionCoordinates() {
      const container = $('regionCoordinateList');
      if (!container) return;
      container.innerHTML = '';
      if (regionPoints.length === 0) {
        const row = document.createElement('div');
        row.className = 'coordinate-row';
        row.style.gridTemplateColumns = '1fr';
        row.textContent = '등록된 점이 없습니다. 캔버스를 클릭해 점을 추가하세요.';
        container.appendChild(row);
        return;
      }
      regionPoints.forEach((point, index) => {
        const row = document.createElement('div');
        row.className = 'coordinate-row';
        const label = document.createElement('strong');
        label.textContent = `#${index + 1}`;
        const x = document.createElement('span');
        x.textContent = `x ${Number(point.x).toFixed(4)}`;
        const y = document.createElement('span');
        y.textContent = `y ${Number(point.y).toFixed(4)}`;
        row.appendChild(label);
        row.appendChild(x);
        row.appendChild(y);
        container.appendChild(row);
      });
    }

    function renderScenarioPhasePreview(wrongDirectionMode) {
      const container = $('scenarioPhaseStrip');
      if (!container) return;
      container.textContent = '';
      const phases = wrongDirectionMode
        ? [
            ['Idle', false],
            ['LineCrossed', false],
            ['Confirmed', true],
            ['Cooldown', false],
            ['Ended', false],
          ]
        : [
            ['대기', false],
            ['진입 후보', false],
            ['관찰 중', false],
            ['체류 확정 1회 알림', true],
            ['종료', false],
          ];
      for (const [label, emphasis] of phases) {
        const chip = document.createElement('div');
        chip.className = `phase-chip${emphasis ? ' is-emphasis' : ''}`;
        chip.textContent = label;
        container.appendChild(chip);
      }
    }

    function renderScenarioMetricGrid(wrongDirectionMode) {
      const container = $('scenarioMetricGrid');
      if (!container) return;
      container.textContent = '';
      const metrics = wrongDirectionMode
        ? [
            ['Line crossed', '대상 track이 판단 선을 통과한 상태'],
            ['허용 방향', `${lineDirectionLabel()}만 정상 통과로 봄`],
            ['실제 방향', 'runtime rawDirection과 허용 방향을 비교'],
            ['중복 억제', '같은 track/line은 cooldown 동안 1회 알림'],
            ['기본 이벤트', '기존 line-crossing 이벤트와 별도 scenario event'],
            ['Track 안정성', 'ID 흔들림과 방향 판단 품질을 함께 확인'],
          ]
        : [
            ['처음 보인 시각', 'track이 처음 감지된 시간'],
            ['체류 시간', '제한구역 안에 머문 시간'],
            ['구역 이동', '이전 구역 → 현재 구역'],
            ['라인 방향', '선을 넘은 방향'],
            ['중복 억제', '같은 track은 확정 알림 1회'],
            ['Track 안정성', 'ID 흔들림 진단값'],
          ];
      for (const [titleText, bodyText] of metrics) {
        const tile = document.createElement('div');
        tile.className = 'metric-tile';
        const title = document.createElement('strong');
        title.textContent = titleText;
        const body = document.createElement('span');
        body.textContent = bodyText;
        tile.appendChild(title);
        tile.appendChild(body);
        container.appendChild(tile);
      }
    }

    function updateRuleModeUi() {
      const scenarioMode = isScenarioRule();
      const wrongDirectionMode = isWrongDirectionScenario();
      const panel = $('scenarioPanel');
      if (panel) panel.hidden = !scenarioMode;
      document.querySelectorAll('.basic-rule-panel').forEach((el) => {
        el.hidden = scenarioMode;
      });
      if ($('scenarioDwellTimingRow')) $('scenarioDwellTimingRow').hidden = !scenarioMode || wrongDirectionMode;
      if ($('scenarioWrongDirectionRow')) $('scenarioWrongDirectionRow').hidden = !scenarioMode || !wrongDirectionMode;
      if ($('scenarioStableOnlyLabel')) $('scenarioStableOnlyLabel').hidden = !scenarioMode;
      if ($('scenarioZoneIdsLabel')) $('scenarioZoneIdsLabel').hidden = !scenarioMode || wrongDirectionMode;
    }

    function updatePreviews() {
      normalizeGeometryForMode();
      updateRuleModeUi();
      updatePreviewSourceUi();
      updateRangeLabels();
      updateGeometryText();
      filterClassChecks();
      $('profileJsonPreview').value = JSON.stringify(profileJson(), null, 2);
      const currentRule = ruleJson();
      $('ruleJsonPreview').value = JSON.stringify(currentRule, null, 2);
      if ($('vaRuleJsonPreview')) {
        $('vaRuleJsonPreview').value = JSON.stringify(vaRuleJson(), null, 2);
      }
      $('eventPayloadPreview').value = JSON.stringify(eventPayloadExampleJson(currentRule.event.region), null, 2);
      updateProfileSummaryText();
      updateReviewSummary(currentRule);
      refreshVaRuleDirtyState();
      drawRegion();
    }

    function validationResult(errors = [], warnings = []) {
      return { errors, warnings };
    }

    function firstValidationMessage(result) {
      return result?.errors?.[0]?.message || result?.warnings?.[0]?.message || '';
    }

    function validateHttpPostUrl(value) {
      const text = String(value || '').trim();
      if (!text) return true;
      try {
        const url = new URL(text);
        return url.protocol === 'http:' || url.protocol === 'https:';
      } catch (_) {
        return false;
      }
    }

    function validateSourceUrl(kind, value) {
      const text = String(value || '').trim();
      if (!text) return false;
      if (kind === 'webrtc') return true;
      try {
        const url = new URL(text);
        if (kind === 'rtsp') return url.protocol === 'rtsp:' || url.protocol === 'rtsps:';
        if (kind === 'http' || kind === 'hls') return url.protocol === 'http:' || url.protocol === 'https:';
        return true;
      } catch (_) {
        return false;
      }
    }

    function addValidationError(errors, section, message) {
      errors.push({ section, message });
    }

    function validateRulePayloadDetailed(payload) {
      const errors = [];
      const classes = Array.isArray(payload?.analysis?.classes) ? payload.analysis.classes : [];
      if (classes.length === 0) {
        addValidationError(errors, '대상 객체', '분석할 객체 카테고리를 1개 이상 선택하세요.');
      }

      const profileId = String(payload?.analysis?.profileId || $('ruleProfileId')?.value || '').trim();
      if (!profileId) {
        addValidationError(errors, '분석 Profile', '사용할 Profile을 선택하세요.');
      }

      const selectedKind = document.querySelector('input[name="ruleKind"]:checked')?.value || '';
      if (!selectedKind) {
        addValidationError(errors, '이벤트 방식', '기본 이벤트 또는 시나리오 중 하나를 선택하세요.');
      }

      const scenarioMode = payload?.ruleKind === 'scenario' || Boolean(payload?.scenario);
      const region = payload?.event?.region || {};
      const points = Array.isArray(region.points) ? region.points : [];
      if (scenarioMode) {
        const scenario = payload.scenario || {};
        if (!scenario.type) {
          addValidationError(errors, '이벤트 방식', '시나리오 템플릿을 선택하세요.');
        } else if (!['intrusion-dwell', 'wrong-direction'].includes(scenario.type)) {
          addValidationError(errors, '이벤트 방식', '현재 UI에서 저장 가능한 시나리오는 Intrusion Dwell 또는 WrongDirection입니다.');
        }
        const cooldownMs = Number(scenario.cooldownMs);
        if (!Number.isFinite(cooldownMs) || cooldownMs < 0) {
          addValidationError(errors, '시나리오 시간 조건', '재알림 대기 시간(ms)은 0 이상이어야 합니다.');
        }
        if (scenario.type === 'wrong-direction') {
          if (region.type !== 'line' || points.length < 2) {
            addValidationError(errors, '영역/라인 설정', 'WrongDirection은 line 좌표 2개 점이 필요합니다.');
          }
          if (!['forward', 'reverse'].includes(region.direction)) {
            addValidationError(errors, '허용 방향', 'WrongDirection은 허용 방향을 forward 또는 reverse로 선택해야 합니다. any는 사용할 수 없습니다.');
          }
        } else {
          const candidateTimeMs = Number(scenario.candidateTimeMs);
          const dwellTimeMs = Number(scenario.dwellTimeMs);
          if (!Number.isFinite(candidateTimeMs) || candidateTimeMs < 0) {
            addValidationError(errors, '시나리오 시간 조건', '후보 판단 시간(ms)은 0 이상이어야 합니다.');
          }
          if (!Number.isFinite(dwellTimeMs) || dwellTimeMs <= candidateTimeMs) {
            addValidationError(errors, '시나리오 시간 조건', '체류 확정 시간(ms)은 후보 판단 시간(ms)보다 커야 합니다.');
          }
          if (region.type !== 'polygon' || points.length < 3) {
            addValidationError(errors, '영역/라인 설정', '시나리오 제한구역 polygon은 최소 3개 점이 필요합니다.');
          }
        }
      } else {
        const eventType = String(payload?.event?.type || '').trim();
        if (!eventType) {
          addValidationError(errors, '이벤트 방식', '이벤트 타입을 선택하세요.');
        }
        if (eventType === 'line-crossing') {
          if (region.type !== 'line' || points.length < 2) {
            addValidationError(errors, '영역/라인 설정', 'line crossing은 선 좌표 2개 점이 필요합니다.');
          }
        } else if (region.type !== 'polygon' || points.length < 3) {
          addValidationError(errors, '영역/라인 설정', 'polygon 이벤트 영역은 최소 3개 점이 필요합니다.');
        }
      }

      const postUrl = String(payload?.eventActions?.post?.url || '').trim();
      if (postUrl && !validateHttpPostUrl(postUrl)) {
        addValidationError(errors, '이벤트 동작', 'POST URL은 http:// 또는 https:// 형식이어야 합니다.');
      }

      return validationResult(errors);
    }

    function validateVaRulePayloadDetailed(payload) {
      const errors = [];
      const name = String($('vaRuleName')?.value || '').trim();
      if (!name) {
        addValidationError(errors, '기본 정보', 'Rule 이름을 입력하세요.');
      }

      const id = String(payload?.id || '').trim();
      if (id && !/^[0-9]+$/.test(id)) {
        addValidationError(errors, '기본 정보', '영상 분석 설정 ID는 URL 구성을 위해 숫자만 사용할 수 있습니다.');
      }

      const source = payload?.source || {};
      const kind = normalizedSourceKind(source.kind);
      if (kind === 'file') {
        if (!source.file) {
          addValidationError(errors, '영상 소스', '영상 분석 설정에 연결할 영상 파일을 선택하세요.');
        }
      } else {
        const sourceValue = String(source.url || '').trim();
        if (!sourceValue) {
          addValidationError(errors, '영상 소스', '영상 분석 설정에 연결할 URL 또는 Source ID를 입력하세요.');
        } else if (!validateSourceUrl(kind, sourceValue)) {
          addValidationError(errors, '영상 소스', kind === 'webrtc'
            ? 'WebRTC Source ID를 입력하세요.'
            : '선택한 영상 종류에 맞는 URL 형식을 입력하세요.');
        }
      }

      const ruleValidation = validateRulePayloadDetailed(payload);
      errors.push(...ruleValidation.errors);
      return validationResult(errors);
    }

    // 저장 전 검증 실패를 상태창과 화면 다이얼로그로 동시에 표시한다.
    function validationWarning(message) {
      if (!message) return false;
      window.__mediaServerLastValidationMessage = message;
      status(message);
      showFeedback(message, 'error');
      const dialog = $('validationDialog');
      const dialogMessage = $('validationDialogMessage');
      if (dialog && dialogMessage && typeof dialog.showModal === 'function') {
        dialogMessage.textContent = message;
        if (!dialog.open) {
          dialog.showModal();
        }
      } else if (typeof window.alert === 'function') {
        window.alert(message);
      }
      return true;
    }

    // Profile 저장 payload에 추적 대상 카테고리가 최소 1개 있는지 확인한다.
    function validateProfilePayload(payload) {
      const classes = Array.isArray(payload?.trackingClasses) ? payload.trackingClasses : [];
      return classes.length > 0 ? '' : 'Tracking 대상 카테고리를 1개 이상 선택하세요.';
    }

    // Rule 저장 payload에 분석 대상 카테고리가 최소 1개 있는지 확인한다.
    function validateRulePayload(payload) {
      return firstValidationMessage(validateRulePayloadDetailed(payload));
    }

    function validateVaRulePayload(payload) {
      return firstValidationMessage(validateVaRulePayloadDetailed(payload));
    }

    function renderClassChecks() {
      const container = $('classChecks');
      container.innerHTML = '';
      for (const item of ruleCategories) {
        const { value, label, hint, group } = item;
        const wrapper = document.createElement('label');
        wrapper.dataset.classItem = '1';
        wrapper.dataset.category = label;
        wrapper.dataset.search = `${value} ${label} ${hint} ${group}`;
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = value;
        input.dataset.ruleCategory = '1';
        input.dataset.classGroup = group;
        input.checked = value === 'person' || value === 'vehicle';
        input.addEventListener('change', updatePreviews);
        wrapper.appendChild(input);
        const labelBox = document.createElement('span');
        labelBox.className = 'category-label';
        const title = document.createElement('span');
        title.className = 'category-title';
        title.textContent = label;
        const detail = document.createElement('span');
        detail.className = 'category-detail';
        detail.textContent = `포함: ${(ruleCategoryDisplayLabels[value] || [label]).join(', ')}`;
        labelBox.appendChild(title);
        labelBox.appendChild(detail);
        wrapper.appendChild(labelBox);
        container.appendChild(wrapper);
      }
      filterClassChecks();
    }

    async function loadPreviewFileOptions() {
      const selects = ['previewFileSelect', 'vaRuleFileSelect', 'viewFileSelect']
        .map((id) => $(id))
        .filter(Boolean);
      if (selects.length === 0) return;
      try {
        const payload = await requestJson('/lab/files');
        const files = Array.isArray(payload.files) ? payload.files : [];
        if (files.length === 0) return;
        for (const select of selects) {
          const previous = select.dataset.loaded === '1'
            ? select.value
            : (payload.defaultFile || select.value || 'sample_h264.mp4');
          select.innerHTML = '';
          for (const file of files) {
            addOption(select, file, file);
          }
          select.value = files.includes(previous) ? previous : files[0];
          select.dataset.loaded = '1';
        }
        updateVaRuleSourceUi();
        updateViewModeUi();
      } catch (error) {
        previewStatus(`파일 목록 로드 실패: ${error.message}`);
      }
    }

    async function stopRulePreview(options = {}) {
      if (previewTimer) {
        clearInterval(previewTimer);
        previewTimer = null;
      }
      const tapId = previewTapId;
      previewTapId = '';
      previewImage = null;
      previewFailureCount = 0;
      if (tapId) {
        await fetch(`/lab/analysis/taps/${encodeURIComponent(tapId)}`, { method: 'DELETE' }).catch(() => {});
      }
      setRulePreviewUi(false);
      if (!options.silent) {
        previewStatus('미리보기를 중지했습니다.');
      }
      drawRegion();
    }

    function buildPreviewParamsFromParent() {
      const mode = $('previewSourceMode')?.value || 'file';
      if (mode === 'vaRule') {
        return applyPreviewAnalysisParams(paramsFromSourceJson(currentVaRuleSourceJson()));
      }
      if (mode === 'file') {
        const params = new URLSearchParams();
        params.set('file', $('previewFileSelect')?.value || 'sample_h264.mp4');
        return applyPreviewAnalysisParams(params);
      }
      let params = new URLSearchParams();
      try {
        if (window.parent && window.parent.__mediaServerTestApi && window.parent.__mediaServerTestApi.buildQuery) {
          params = new URLSearchParams(window.parent.__mediaServerTestApi.buildQuery());
        }
      } catch (_) {
      }
      if (!Array.from(params.keys()).length) {
        params.set('file', 'sample_h264.mp4');
      }
      if (!previewOverlayEnabled()) params.delete('va');
      params.delete('labelLang');
      params.delete('overlayWaitMs');
      params.delete('overlaySyncToleranceMs');
      return applyPreviewAnalysisParams(params);
    }

    function describePreviewSource(params) {
      if (params.get('file')) return `file=${params.get('file')}`;
      const source = params.get('source') || 'rtsp';
      const url = params.get('url') || '';
      return `${source}${url ? ` · ${url}` : ''}`;
    }

    function refreshPreviewFrame() {
      if (!previewTapId) return;
      const image = new Image();
      image.onload = () => {
        previewImage = image;
        previewFailureCount = 0;
        previewStatus(`${previewOverlayEnabled() ? '객체 검출 오버레이' : '원본 프레임'} 실행 중: ${previewSourceLabel}`);
        drawRegion();
      };
      image.onerror = () => {
        previewFailureCount += 1;
        if (previewFailureCount >= 4) {
          previewStatus(previewOverlayEnabled()
            ? '객체 검출 오버레이를 준비 중입니다. 모델 로딩, 프레임 디코딩, 분석 결과를 확인 중입니다.'
            : '아직 프레임을 준비 중입니다. 파일 디코딩 또는 분석 tap 상태를 확인 중입니다.');
        }
        drawRegion();
      };
      const imagePath = previewOverlayEnabled()
        ? `overlay.jpg?quality=72&thickness=3&drawLabels=1&trackIds=1&trackTrails=1&labelLang=ko`
        : `snapshot.jpg?quality=72`;
      image.src = `/lab/analysis/taps/${encodeURIComponent(previewTapId)}/${imagePath}&_=${Date.now()}`;
    }

    async function startRulePreview() {
      await stopRulePreview({ silent: true });
      updatePreviewSourceUi();
      const params = buildPreviewParamsFromParent();
      previewSourceLabel = describePreviewSource(params);
      previewStatus('미리보기 tap 생성 중...');
      const payload = await requestJson(`/lab/analysis/taps?${params.toString()}`, { method: 'POST' });
      previewTapId = payload.tapId || '';
      setRulePreviewUi(true);
      previewStatus(`${previewOverlayEnabled() ? '객체 검출 오버레이' : '원본 프레임'} 시작: ${previewSourceLabel}`);
      drawRegion();
      refreshPreviewFrame();
      previewTimer = setInterval(refreshPreviewFrame, 500);
    }

    function addOption(select, value, label) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      select.appendChild(option);
    }

    function renderProfileSelects() {
      const profileSelect = $('profileSelect');
      const ruleProfileId = $('ruleProfileId');
      const previousProfile = profileSelect.value;
      const previousRuleProfile = ruleProfileId.value;
      profileSelect.innerHTML = '';
      ruleProfileId.innerHTML = '';
      addOption(profileSelect, '', '새 profile 작성');
      for (const item of builtInProfiles) {
        addOption(profileSelect, `builtin:${item.id}`, `[기본] ${item.id}`);
        addOption(ruleProfileId, item.id, `[기본] ${item.id}`);
      }
      for (const item of profiles) {
        addOption(profileSelect, `custom:${item.id}`, `[저장] ${item.id}`);
        addOption(ruleProfileId, item.id, `[저장] ${item.id}`);
      }
      if (previousProfile && Array.from(profileSelect.options).some((option) => option.value === previousProfile)) {
        profileSelect.value = previousProfile;
      }
      if (previousRuleProfile && Array.from(ruleProfileId.options).some((option) => option.value === previousRuleProfile)) {
        ruleProfileId.value = previousRuleProfile;
      }
    }

    function renderRuleSelect() {
      const select = $('ruleSelect');
      const previous = select.value;
      select.innerHTML = '';
      addOption(select, '', '새 rule 작성');
      for (const item of rules) {
        addOption(select, `custom:${item.id}`, `[저장] ${item.id}`);
      }
      if (previous && Array.from(select.options).some((option) => option.value === previous)) {
        select.value = previous;
      }
    }

    function renderVaRuleSelects() {
      const selects = [$('vaRuleSelect'), $('viewVaRuleSelect')].filter(Boolean);
      for (const select of selects) {
        const previous = select.value;
        select.innerHTML = '';
        addOption(select, '', select.id === 'viewVaRuleSelect' ? '저장된 설정 선택' : '새 영상 분석 설정');
        for (const item of vaRules) {
          const name = item.name ? ` · ${item.name}` : '';
          addOption(select, String(item.id), `#${item.id}${name}`);
        }
        if (previous && Array.from(select.options).some((option) => option.value === previous)) {
          select.value = previous;
        } else if (select.id === 'viewVaRuleSelect' && !select.value && vaRules.length > 0) {
          select.value = String(vaRules[0].id);
        }
      }
      renderDashboardRuleSelect();
    }

    function updateRegistryCountBadges() {
      setText('vaRuleCountBadge', `${vaRules.length.toLocaleString('ko-KR')}개 저장`);
      setText('profileCountBadge', `${profiles.length.toLocaleString('ko-KR')}개 저장`);
      setText('ruleCountBadge', `${rules.length.toLocaleString('ko-KR')}개 저장`);
      const activeCount = vaRules.filter((item) => item.enabled !== false).length;
      const scenarioCount = vaRules.filter((item) => item.ruleKind === 'scenario' || item.scenario).length;
      setText('vaRuleTotalMetric', vaRules.length.toLocaleString('ko-KR'));
      setText('vaRuleActiveMetric', activeCount.toLocaleString('ko-KR'));
      setText('vaRuleScenarioMetric', scenarioCount.toLocaleString('ko-KR'));
      const nextId = nextAvailableVaRuleId();
      setText('vaRuleNextIdMetric', nextId ? `#${nextId}` : '없음');
      updateVaRuleIdDisplay();
    }

    async function refreshRegistry() {
      const [profilePayload, rulePayload, vaRulePayload] = await Promise.all([
        requestJson('/lab/analysis/profiles'),
        requestJson('/lab/analysis/rules'),
        requestJson('/lab/analysis/va-rules')
      ]);
      builtInProfiles = Array.isArray(profilePayload.builtInProfiles) ? profilePayload.builtInProfiles : [];
      profiles = Array.isArray(profilePayload.profiles) ? profilePayload.profiles : [];
      rules = Array.isArray(rulePayload.rules) ? rulePayload.rules : [];
      vaRules = Array.isArray(vaRulePayload.vaRules) ? vaRulePayload.vaRules : [];
      renderProfileSelects();
      renderRuleSelect();
      renderVaRuleSelects();
      updateRegistryCountBadges();
      renderVaRuleLibrary();
      updatePreviews();
      updateViewModeUi();
      status('목록을 불러왔습니다.', {
        builtInProfiles: builtInProfiles.length,
        profiles: profiles.length,
        rules: rules.length,
        vaRules: vaRules.length
      });
    }

    function loadProfile(item) {
      $('profileId').value = item.id || 'fast-local';
      $('profileDetector').value = item.detector === 'dummy' ? 'dummy' : 'yolo';
      $('profileFps').value = item.fps || item.targetFps || 6;
      $('profileQueue').value = item.maxQueue || item.maxQueueSize || 1;
      $('profileConfidence').value = Math.round(Number(item.confidence ?? item.confidenceThreshold ?? 0.25) * 100);
      $('profileNms').value = Math.round(Number(item.nms ?? item.nmsThreshold ?? 0.45) * 100);
      $('profileInputWidth').value = String(item.inputWidth || item.modelInputWidth || 640);
      $('profileInputHeight').value = String(item.inputHeight || item.modelInputHeight || 640);
      $('profileAdaptive').checked = item.adaptive !== false;
      setTrackingClasses(item.trackingClasses || item.trackClasses || ['person', 'vehicle']);
      updateProfileDeleteWarning();
      updatePreviews();
    }

    function loadRule(item) {
      $('ruleId').value = item.id || 'file-person-vehicle-area';
      $('ruleEnabled').value = item.enabled === false ? 'false' : 'true';
      $('ruleSourceKind').value = item.match?.sourceKind || '*';
      $('ruleRoute').value = item.match?.route || '*';
      $('ruleProfileId').value = item.analysis?.profileId || $('ruleProfileId').value;
      const scenarioMode = item.ruleKind === 'scenario' ||
        item.scenario?.type === 'intrusion-dwell' ||
        item.scenario?.type === 'wrong-direction' ||
        item.event?.type === 'intrusion-dwell' ||
        item.event?.type === 'wrong-direction';
      setRuleKind(scenarioMode ? 'scenario' : 'basic');
      $('ruleEventType').value = ['presence', 'enter', 'exit', 'line-crossing'].includes(item.event?.type)
        ? item.event.type
        : 'presence';
      $('ruleLineDirection').value = ['any', 'forward', 'reverse'].includes(item.event?.region?.direction)
        ? item.event.region.direction
        : 'any';
      const classSet = new Set((item.analysis?.classes || []).map((value) => normalizeTrackingToken(value)));
      const hasAll = classSet.has('*') || classSet.has('all') || classSet.has('any');
      document.querySelectorAll('[data-rule-category]').forEach((el) => {
        const categoryLabels = ruleCategoryLabels[el.value] || [];
        el.checked = classSet.size === 0
          ? (el.value === 'person' || el.value === 'vehicle')
          : hasAll || classSet.has(el.value) || categoryLabels.some((label) => classSet.has(normalizeTrackingToken(label)));
      });
      filterClassChecks();
      $('ruleConfidence').value = Math.round(Number(item.event?.minConfidence ?? 0.25) * 100);
      $('ruleMinDurationMs').value = Number(item.event?.minDurationMs || 0);
      const points = item.event?.region?.points;
      if (Array.isArray(points) && points.length > 0) {
        regionPoints = points.map((point) => ({
          x: Math.max(0, Math.min(1, Number(point.x || 0))),
          y: Math.max(0, Math.min(1, Number(point.y || 0)))
        }));
      } else {
        regionPoints = defaultPolygonPoints();
      }
      const eventActions = item.eventActions || {};
      const highlight = eventActions.highlight || {};
      const post = eventActions.post || {};
      $('eventFlashInput').checked = highlight.enabled !== false;
      $('eventFlashMsInput').value = Number(highlight.durationMs || 1200);
      $('eventPostUrlInput').value = typeof post.url === 'string' ? post.url : '';
      const scenario = item.scenario || {};
      $('scenarioType').value = scenario.type === 'wrong-direction' ? 'wrong-direction' : 'intrusion-dwell';
      $('scenarioLineDirection').value = ['forward', 'reverse'].includes(item.event?.region?.direction)
        ? item.event.region.direction
        : 'forward';
      $('scenarioCandidateMs').value = Number(scenario.candidateTimeMs ?? 2000);
      $('scenarioDwellMs').value = Number(scenario.dwellTimeMs ?? 10000);
      $('scenarioCooldownMs').value = Number(scenario.cooldownMs ?? 5000);
      $('scenarioZoneIds').value = Array.isArray(scenario.restrictedZoneIds)
        ? scenario.restrictedZoneIds.join(', ')
        : '';
      $('scenarioStableOnly').checked = scenario.trackHealth?.requireStableTrack === true;
      updatePreviews();
    }

    function loadVaRule(item) {
      if (!item) {
        $('vaRuleId').value = '';
        $('vaRuleName').value = '샘플 파일 분석 설정';
        $('vaRuleSourceKind').value = 'file';
        $('vaRuleFileSelect').value = $('vaRuleFileSelect').value || 'sample_h264.mp4';
        $('vaRuleUrlInput').value = '';
        loadRule({
          id: 'file-person-vehicle-area',
          enabled: true,
          match: { sourceKind: '*', route: '*' },
          analysis: { profileId: $('ruleProfileId').value, classes: ['person', 'vehicle'] },
          event: { type: 'presence', minConfidence: 0.25, minDurationMs: 0, region: { type: 'polygon', points: defaultPolygonPoints() } },
          eventActions: {
            highlight: { enabled: true, mode: 'blink', target: 'matched-object', durationMs: 1200, color: '#ff0000' },
            post: { enabled: false, method: 'POST', url: '', contentType: 'application/json', payloadFormat: 'media-server.va.event.v1' }
          }
        });
        updateVaRuleSourceUi();
        updateViewModeUi();
        updateVaRuleIdDisplay();
        if ($('deleteVaRuleBtn')) $('deleteVaRuleBtn').hidden = true;
        return;
      }
      $('vaRuleId').value = item.id || '';
      $('vaRuleName').value = item.name || `영상 분석 설정 ${item.id || ''}`;
      const source = item.source || {};
      const sourceKind = normalizedSourceKind(source.kind || 'file');
      $('vaRuleSourceKind').value = sourceKind;
      if (sourceKind === 'file') {
        $('vaRuleFileSelect').value = source.file || $('vaRuleFileSelect').value || 'sample_h264.mp4';
        $('vaRuleUrlInput').value = '';
      } else {
        $('vaRuleUrlInput').value = source.url || '';
      }
      loadRule(item);
      updateVaRuleSourceUi();
      updateViewModeUi();
      updateVaRuleIdDisplay();
      if ($('deleteVaRuleBtn')) $('deleteVaRuleBtn').hidden = false;
    }

    async function saveProfile() {
      const payload = profileJson();
      const warning = validateProfilePayload(payload);
      if (validationWarning(warning)) {
        throw new Error(warning);
      }
      const response = await requestJson(`/lab/analysis/profiles/${encodeURIComponent(payload.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      await refreshRegistry();
      $('profileSelect').value = `custom:${payload.id}`;
      status(`Profile 저장 완료: ${payload.id}`, response);
      showFeedback(`Profile '${payload.id}' 저장 완료`);
    }

    async function deleteProfile() {
      const id = $('profileId').value.trim();
      if (!id) throw new Error('삭제할 profile id가 없습니다.');
      if (isBuiltInProfileId(id)) {
        throw new Error(`기본 Profile '${id}'는 삭제할 수 없습니다.`);
      }
      const usedBy = profileUsageItems(id);
      if (usedBy.length > 0) {
        const message = `Profile '${id}'는 ${usedBy.slice(0, 5).join(', ')}${usedBy.length > 5 ? ` 외 ${usedBy.length - 5}개` : ''}에서 사용 중입니다. 그래도 삭제할까요?`;
        if (!window.confirm(message)) {
          showFeedback('Profile 삭제를 취소했습니다.', 'error');
          return;
        }
      } else if (!window.confirm(`저장 Profile '${id}'를 삭제할까요?`)) {
        showFeedback('Profile 삭제를 취소했습니다.', 'error');
        return;
      }
      const response = await requestJson(`/lab/analysis/profiles/${encodeURIComponent(id)}`, { method: 'DELETE' });
      await refreshRegistry();
      status(`Profile 삭제 완료: ${id}`, response);
      showFeedback(`Profile '${id}' 삭제 완료`);
    }

    async function saveRule() {
      const payload = ruleJson();
      const warning = validateRulePayload(payload);
      if (validationWarning(warning)) {
        throw new Error(warning);
      }
      const response = await requestJson(`/lab/analysis/rules/${encodeURIComponent(payload.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      await refreshRegistry();
      $('ruleSelect').value = `custom:${payload.id}`;
      status(`Rule 저장 완료: ${payload.id}`, response);
      showFeedback(`Rule '${payload.id}' 저장 완료`);
    }

    async function saveVaRule() {
      const payload = vaRuleJson();
      const warning = validateVaRulePayload(payload);
      if (validationWarning(warning)) {
        throw new Error(warning);
      }
      const id = String(payload.id || '').trim();
      const response = await requestJson(id
        ? `/lab/analysis/va-rules/${encodeURIComponent(id)}`
        : '/lab/analysis/va-rules', {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const savedId = response?.vaRule?.id || id;
      await refreshRegistry();
      if (savedId) {
        selectedVaRuleId = String(savedId);
        $('vaRuleSelect').value = String(savedId);
        $('viewVaRuleSelect').value = String(savedId);
      }
      renderVaRuleLibrary();
      resetVaRuleDirtyBaseline();
      closeVaRuleEditor({ skipDirtyCheck: true });
      status(`영상 분석 설정 저장 완료: ${savedId || '(auto)'}`, response);
      showFeedback(`영상 분석 설정 #${savedId || '(auto)'} 저장 완료`);
      return response;
    }

    window.__mediaServerRuleEditorApi = {
      components: VaUiComponents,
      profileJson,
      ruleJson,
      scenarioJson,
      vaRuleJson,
      validateProfilePayload,
      validateRulePayload,
      validateVaRulePayload,
      saveProfile,
      saveRule,
      saveVaRule
    };

    async function deleteRule() {
      const id = $('ruleId').value.trim();
      if (!id) throw new Error('삭제할 rule id가 없습니다.');
      const response = await requestJson(`/lab/analysis/rules/${encodeURIComponent(id)}`, { method: 'DELETE' });
      await refreshRegistry();
      status(`Rule 삭제 완료: ${id}`, response);
      showFeedback(`Rule '${id}' 삭제 완료`);
    }

    function cloneVaRuleForWrite(item) {
      return JSON.parse(JSON.stringify(item || {}));
    }

    async function duplicateVaRuleById(id) {
      id = String(id || '').trim();
      const item = vaRules.find((entry) => String(entry.id) === id);
      if (!item) throw new Error('복제할 영상 분석 룰을 찾을 수 없습니다.');
      if (isVaRuleEditorOpen() && vaRuleDirty && !confirmDiscardVaRuleChanges('룰 복제로 이동')) {
        return;
      }
      const payload = cloneVaRuleForWrite(item);
      delete payload.id;
      delete payload.match;
      payload.enabled = false;
      payload.name = `${item.name || `영상 분석 룰 ${item.id}`} 복제`;
      const response = await requestJson('/lab/analysis/va-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const savedId = response?.vaRule?.id || '';
      await refreshRegistry();
      if (savedId) {
        selectedVaRuleId = String(savedId);
        if ($('vaRuleSelect')) $('vaRuleSelect').value = String(savedId);
        if ($('viewVaRuleSelect')) $('viewVaRuleSelect').value = String(savedId);
      }
      renderVaRuleLibrary();
      status(`영상 분석 룰 복제 완료: #${item.id} -> #${savedId || '(auto)'}`, response);
      showFeedback(`룰 #${item.id}를 비활성 상태로 복제했습니다.`);
    }

    async function toggleVaRuleEnabled(id) {
      id = String(id || '').trim();
      const item = vaRules.find((entry) => String(entry.id) === id);
      if (!item) throw new Error('상태를 변경할 영상 분석 룰을 찾을 수 없습니다.');
      if (isVaRuleEditorOpen() && vaRuleDirty && !confirmDiscardVaRuleChanges('룰 상태 변경')) {
        return;
      }
      const payload = cloneVaRuleForWrite(item);
      payload.enabled = !isVaRuleEnabled(item);
      const response = await requestJson(`/lab/analysis/va-rules/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      await refreshRegistry();
      selectedVaRuleId = id;
      renderVaRuleLibrary();
      const nextLabel = payload.enabled ? '적용 중' : '비활성';
      status(`영상 분석 룰 #${id} 상태 변경 완료: ${nextLabel}`, response);
      showFeedback(`룰 #${id} 상태를 ${nextLabel}(으)로 변경했습니다.`);
    }

    function showVaRuleDeleteDialog(id) {
      id = String(id || '').trim();
      const item = vaRules.find((entry) => String(entry.id) === id);
      if (!item) {
        showFeedback('삭제할 룰을 찾을 수 없습니다.', 'error');
        return;
      }
      pendingDeleteVaRuleId = id;
      const name = item.name || `영상 분석 룰 ${id}`;
      setText('deleteVaRuleDialogMessage', `룰 #${id} · ${name}을 삭제할까요? 삭제 후에는 되돌릴 수 없습니다.`);
      const dialog = $('deleteVaRuleDialog');
      if (dialog && typeof dialog.showModal === 'function') {
        dialog.showModal();
      } else if (window.confirm(`룰 #${id} · ${name}을 삭제할까요? 삭제 후에는 되돌릴 수 없습니다.`)) {
        deleteVaRuleById(id).catch((error) => {
          status(`영상 분석 룰 삭제 실패: ${error.message}`);
          showFeedback(`삭제 실패: ${error.message}`, 'error');
        });
      }
    }

    async function deleteVaRuleById(id, options = {}) {
      id = String(id || '').trim();
      if (!id) throw new Error('삭제할 영상 분석 설정 ID가 없습니다.');
      if (isVaRuleEditorOpen() && vaRuleDirty && id === currentVaRuleId() &&
          !confirmDiscardVaRuleChanges('현재 편집 중인 룰 삭제로 이동')) {
        return;
      }
      if (options.confirm) {
        showVaRuleDeleteDialog(id);
        return;
      }
      const response = await requestJson(`/lab/analysis/va-rules/${encodeURIComponent(id)}`, { method: 'DELETE' });
      await refreshRegistry();
      if (selectedVaRuleId === id) {
        selectedVaRuleId = vaRules.length > 0 ? String(sortedVaRules()[0].id) : '';
      }
      if (currentVaRuleId() === id) {
        closeVaRuleEditor({ skipDirtyCheck: true });
        loadVaRule(null);
      }
      renderVaRuleLibrary();
      status(`영상 분석 설정 삭제 완료: ${id}`, response);
      showFeedback(`영상 분석 설정 #${id} 삭제 완료`);
    }

    async function deleteVaRule() {
      await deleteVaRuleById(currentVaRuleId(), { confirm: true });
    }

    function viewPreviewStatus(message) {
      if ($('viewPreviewStatus')) $('viewPreviewStatus').textContent = message;
    }

    function isMetadataViewMode() {
      return selectedViewMode() === 'metadata';
    }

    function metadataStateLabel(state) {
      if (state === 'connecting') return '연결 중';
      if (state === 'open') return '열림';
      if (state === 'receiving') return '수신 중';
      if (state === 'stalled') return '지연';
      if (state === 'closed') return '닫힘';
      if (state === 'error') return '오류';
      return '비활성';
    }

    function formatMetadataTimestamp(value) {
      const number = Number(value || 0);
      if (!Number.isFinite(number) || number <= 0) return '-';
      const date = new Date(number < 10000000000 ? number * 1000 : number);
      if (Number.isNaN(date.getTime())) return `${number}`;
      return `${date.toLocaleTimeString('ko-KR')} · ${number}`;
    }

    function formatMetadataMs(value) {
      const number = Number(value);
      if (!Number.isFinite(number)) return '-';
      return `${Math.round(number)}ms`;
    }

    function formatMetadataWallTime(value) {
      const number = Number(value);
      if (!Number.isFinite(number) || number <= 0) return '-';
      const date = new Date(number);
      if (Number.isNaN(date.getTime())) return '-';
      const ageMs = Math.max(0, Date.now() - number);
      return `${date.toLocaleTimeString('ko-KR')} · ${Math.round(ageMs)}ms 전`;
    }

    function updateMetadataViewerPanel() {
      setText('metadataChannelStateText', metadataStateLabel(viewMetadataState));
      setText('metadataChannelLabelText', viewMetadataLabel || 'va-metadata');
      setText('metadataMessageCountText', String(viewMetadataMessageCount));
      setText('metadataBufferCountText', String(viewMetadataBuffer.length));
      setText('metadataBufferDropCountText', String(viewMetadataBufferDropCount));
      setText('metadataVideoFrameCountText', String(viewMetadataVideoPresentedFrames));
      setText('metadataDrawCountText', String(viewMetadataDrawCount));
      setText('metadataLastVideoFrameText', formatMetadataWallTime(viewMetadataLastVideoFrameAt));
      setText('metadataLastMessageAtText', formatMetadataWallTime(viewMetadataLastMessageAt));
      setText('metadataVideoStalledText', viewMetadataVideoStalled ? '예' : '아니오');
      setText('metadataSelectedDeltaText', formatMetadataMs(viewMetadataSelectedSyncDeltaMs));
      setText('metadataLagText', formatMetadataMs(viewMetadataSelectedLagMs));
      setText('metadataSyncMissCountText', String(viewMetadataSyncMissCount));
      setText('metadataStaleCountText', String(viewMetadataStaleCount));
      setText('metadataFallbackHiddenCountText', String(viewMetadataFallbackHiddenCount));
      setText('metadataLatestTimestampText', formatMetadataTimestamp(viewMetadataLatestTimestampMs));
      setText('metadataTrackCountText', String(viewMetadataTrackCount));
      setText('metadataEventCountText', String(viewMetadataEventCount));
      setText('metadataScenarioCountText', String(viewMetadataScenarioCount));
      setText('metadataParseStateText', viewMetadataParseError ? '오류' : (viewMetadataMessageCount > 0 ? '정상' : '대기'));
      setText('metadataParseFailCountText', String(viewMetadataParseFailCount));
      const errorEl = $('metadataParseErrorText');
      if (errorEl) {
        errorEl.hidden = !viewMetadataParseError;
        errorEl.textContent = viewMetadataParseError;
      }
      const preview = $('metadataJsonPreview');
      if (preview) preview.textContent = viewMetadataLastJsonText || '메타데이터 수신 대기 중';
    }

    function clearMetadataStallTimer() {
      if (viewMetadataStallTimer) {
        clearTimeout(viewMetadataStallTimer);
        viewMetadataStallTimer = null;
      }
    }

    function clearMetadataVideoStallTimer() {
      if (viewMetadataVideoStallTimer) {
        clearTimeout(viewMetadataVideoStallTimer);
        viewMetadataVideoStallTimer = null;
      }
    }

    function clearViewWebRtcAutoRestartTimer() {
      if (viewWebRtcAutoRestartTimer) {
        clearTimeout(viewWebRtcAutoRestartTimer);
        viewWebRtcAutoRestartTimer = null;
      }
    }

    function metadataVideoStallTimeoutMs() {
      return 1200;
    }

    function metadataVideoStallReferenceAt() {
      return viewMetadataLastVideoFrameAt || viewMetadataPresentationLoopStartedAt || 0;
    }

    function setMetadataVideoStalled(stalled) {
      const next = Boolean(stalled);
      const changed = next !== viewMetadataVideoStalled;
      viewMetadataVideoStalled = next;
      if (next && changed) {
        clearMetadataOverlay({ stale: true });
      } else if (changed) {
        updateMetadataViewerPanel();
      }
    }

    function checkMetadataVideoStall() {
      if (!viewMetadataPresentationLoopRunning) return;
      const referenceAt = metadataVideoStallReferenceAt();
      if (referenceAt <= 0) return;
      const stalled = Date.now() - referenceAt > metadataVideoStallTimeoutMs();
      if (stalled) {
        setMetadataVideoStalled(true);
      }
    }

    function scheduleMetadataVideoStallCheck() {
      clearMetadataVideoStallTimer();
      if (!viewMetadataPresentationLoopRunning) return;
      viewMetadataVideoStallTimer = setTimeout(() => {
        viewMetadataVideoStallTimer = null;
        checkMetadataVideoStall();
        scheduleMetadataVideoStallCheck();
      }, metadataVideoStallTimeoutMs());
    }

    function scheduleMetadataStallCheck() {
      clearMetadataStallTimer();
      viewMetadataStallTimer = setTimeout(() => {
        if (!viewWebRtcSessionId && !viewMetadataChannel) return;
        if (!viewMetadataChannel || viewMetadataChannel.readyState !== 'open') {
          viewMetadataState = 'stalled';
          updateMetadataViewerPanel();
          clearMetadataOverlay({ stale: true });
          return;
        }
        if (viewMetadataMessageCount === 0 || Date.now() - viewMetadataLastMessageAt > 6000) {
          viewMetadataState = 'stalled';
          updateMetadataViewerPanel();
          clearMetadataOverlay({ stale: true });
        }
      }, 6500);
    }

    function resetMetadataViewerState(state = 'disabled') {
      viewMetadataChannel = null;
      viewMetadataState = state;
      viewMetadataLabel = 'va-metadata';
      viewMetadataMessageCount = 0;
      viewMetadataLatestTimestampMs = 0;
      viewMetadataTrackCount = 0;
      viewMetadataEventCount = 0;
      viewMetadataScenarioCount = 0;
      viewMetadataParseError = '';
      viewMetadataParseFailCount = 0;
      viewMetadataLastJsonText = '';
      viewMetadataLastMessageAt = 0;
      viewMetadataLatestPayload = null;
      viewMetadataSelectedEntry = null;
      viewMetadataBuffer = [];
      viewMetadataBufferDropCount = 0;
      viewMetadataLastPayloadKeyMs = null;
      viewMetadataBboxDiagnostics = null;
      renderMetadataBboxDiagnostics([], '진단 대기 중');
      viewMetadataDrawCount = 0;
      viewMetadataVideoPresentedFrames = 0;
      viewMetadataLastVideoFrameAt = 0;
      viewMetadataLastVideoFrameMediaTimeMs = null;
      viewMetadataVideoStalled = false;
      viewMetadataSelectedSyncDeltaMs = null;
      viewMetadataSelectedLagMs = null;
      viewMetadataSyncMissCount = 0;
      viewMetadataSyncMissActive = false;
      viewMetadataSyncMissCleared = false;
      viewMetadataStaleCount = 0;
      viewMetadataFallbackHiddenCount = 0;
      viewMetadataLastHiddenFallbackSequence = 0;
      viewMetadataLastDrawAt = 0;
      viewMetadataVideoPtsOffsetMs = null;
      viewMetadataPtsCalibrationCount = 0;
      viewMetadataPresentationLoopStartedAt = 0;
      clearMetadataStallTimer();
      clearMetadataVideoStallTimer();
      updateMetadataViewerPanel();
      clearMetadataOverlay();
    }

    function setMetadataChannelState(state, message = '') {
      viewMetadataState = state || 'disabled';
      if (message) setText('viewConnectionMessage', message);
      updateMetadataViewerPanel();
    }

    function metadataOverlayOptions() {
      return {
        bbox: $('metadataOverlayBboxInput')?.checked !== false,
        label: $('metadataOverlayLabelInput')?.checked !== false,
        trackId: $('metadataOverlayTrackIdInput')?.checked !== false,
        scenario: $('metadataOverlayScenarioInput')?.checked !== false,
        event: $('metadataOverlayEventInput')?.checked !== false,
        health: $('metadataOverlayHealthInput')?.checked !== false,
        zone: $('metadataOverlayZoneInput')?.checked !== false,
        dwell: $('metadataOverlayDwellInput')?.checked !== false,
        detection: $('metadataOverlayDetectionInput')?.checked === true,
        fallback: $('metadataOverlayFallbackInput')?.checked === true
      };
    }

    function queryFlagEnabled(value) {
      const text = String(value || '').toLowerCase();
      return text === '1' || text === 'true' || text === 'yes' || text === 'on';
    }

    function metadataFallbackRequestedByPageQuery() {
      const params = new URLSearchParams(window.location.search);
      return queryFlagEnabled(params.get('clientOverlayFallback')) ||
        queryFlagEnabled(params.get('vaMetadataDrawFallback'));
    }

    function applyMetadataViewerQueryDefaults() {
      const fallbackInput = $('metadataOverlayFallbackInput');
      if (fallbackInput && metadataFallbackRequestedByPageQuery()) {
        fallbackInput.checked = true;
      }
    }

    function clientOverlayFallbackEnabled() {
      return $('metadataOverlayFallbackInput')?.checked === true;
    }

    function applyClientOverlayFallbackParam(params) {
      if (clientOverlayFallbackEnabled()) {
        params.set('clientOverlayFallback', '1');
      }
      return params;
    }

    function metadataFrameSize(payload = null) {
      const video = $('viewWebRtcVideo');
      const frame = payload?.frame || payload?.image || {};
      const width = Number(payload?.frameWidth || payload?.sourceFrameWidth || payload?.videoWidth || frame.width || video?.videoWidth || 0);
      const height = Number(payload?.frameHeight || payload?.sourceFrameHeight || payload?.videoHeight || frame.height || video?.videoHeight || 0);
      return {
        width: Number.isFinite(width) && width > 0 ? width : 0,
        height: Number.isFinite(height) && height > 0 ? height : 0
      };
    }

    function clampUnit(value) {
      const number = Number(value);
      if (!Number.isFinite(number)) return 0;
      return Math.max(0, Math.min(1, number));
    }

    function normalizeMetadataBbox(bbox, frameSize) {
      if (!bbox) return null;
      const x = Number(bbox.x);
      const y = Number(bbox.y);
      const width = Number(bbox.width);
      const height = Number(bbox.height);
      if (![x, y, width, height].every(Number.isFinite)) return null;
      const looksNormalized = Math.max(Math.abs(x), Math.abs(y), Math.abs(width), Math.abs(height)) <= 1.5;
      if (looksNormalized) {
        return {
          x: clampUnit(x),
          y: clampUnit(y),
          width: Math.max(0, Math.min(1, width)),
          height: Math.max(0, Math.min(1, height))
        };
      }
      if (!frameSize.width || !frameSize.height) return null;
      return {
        x: clampUnit(x / frameSize.width),
        y: clampUnit(y / frameSize.height),
        width: Math.max(0, Math.min(1, width / frameSize.width)),
        height: Math.max(0, Math.min(1, height / frameSize.height))
      };
    }

    function metadataVideoContentRect(payload = null) {
      const stage = $('viewWebRtcStage');
      if (!stage || stage.hidden) return null;
      const rect = stage.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      const video = $('viewWebRtcVideo');
      const frameSize = metadataFrameSize(payload);
      const intrinsicWidth = video?.videoWidth || frameSize.width || 16;
      const intrinsicHeight = video?.videoHeight || frameSize.height || 9;
      const scale = Math.min(rect.width / intrinsicWidth, rect.height / intrinsicHeight);
      const contentWidth = intrinsicWidth * scale;
      const contentHeight = intrinsicHeight * scale;
      return {
        x: (rect.width - contentWidth) / 2,
        y: (rect.height - contentHeight) / 2,
        width: contentWidth,
        height: contentHeight,
        cssWidth: rect.width,
        cssHeight: rect.height
      };
    }

    function resizeMetadataOverlayCanvas() {
      const canvas = $('viewMetadataOverlayCanvas');
      const stage = $('viewWebRtcStage');
      if (!canvas || !stage || stage.hidden) return null;
      const rect = stage.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      const dpr = window.devicePixelRatio || 1;
      const nextWidth = Math.max(1, Math.round(rect.width * dpr));
      const nextHeight = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== nextWidth) canvas.width = nextWidth;
      if (canvas.height !== nextHeight) canvas.height = nextHeight;
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);
      return { canvas, ctx, width: rect.width, height: rect.height };
    }

    function metadataEventForTrack(payload, trackId) {
      const id = Number(trackId || 0);
      if (!Array.isArray(payload?.events)) return null;
      return payload.events.find((event) => Number(event.trackId || 0) === id) || null;
    }

    function isMetadataTrackUnstable(track) {
      const health = track?.trackHealth || {};
      if (health.stable === false || health.isUnstable === true) return true;
      const status = String(health.status || '').toLowerCase();
      return status.includes('unstable') || status.includes('lost');
    }

    function shouldDrawMetadataTrack(track) {
      const health = track?.trackHealth || {};
      const missedFrameCount = Number(health.missedFrameCount || 0);
      if (Number.isFinite(missedFrameCount) && missedFrameCount > 0) return false;
      const lifecycleState = String(track?.lifecycleState || '').toLowerCase();
      if (lifecycleState === 'lost' || lifecycleState === 'terminated') return false;
      return true;
    }

    function metadataConfidenceLabel(confidence) {
      const value = Number(confidence);
      if (!Number.isFinite(value)) return '';
      return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
    }

    function metadataDwellLabel(ms) {
      const value = Number(ms || 0);
      if (!Number.isFinite(value) || value <= 0) return '';
      if (value >= 1000) return `${(value / 1000).toFixed(1)}s`;
      return `${Math.round(value)}ms`;
    }

    function metadataOptionalNumber(value) {
      if (value === undefined || value === null || value === '') return null;
      const number = Number(value);
      return Number.isFinite(number) ? number : null;
    }

    function metadataBboxFromItem(item) {
      return item?.bbox || item?.box || item?.detection?.box || null;
    }

    function metadataBboxArea(box) {
      if (!box) return 0;
      const width = Math.max(0, Number(box.width || 0));
      const height = Math.max(0, Number(box.height || 0));
      return width * height;
    }

    function metadataBboxIou(left, right) {
      if (!left || !right) return null;
      const leftX2 = Number(left.x || 0) + Number(left.width || 0);
      const leftY2 = Number(left.y || 0) + Number(left.height || 0);
      const rightX2 = Number(right.x || 0) + Number(right.width || 0);
      const rightY2 = Number(right.y || 0) + Number(right.height || 0);
      const ix1 = Math.max(Number(left.x || 0), Number(right.x || 0));
      const iy1 = Math.max(Number(left.y || 0), Number(right.y || 0));
      const ix2 = Math.min(leftX2, rightX2);
      const iy2 = Math.min(leftY2, rightY2);
      const intersection = Math.max(0, ix2 - ix1) * Math.max(0, iy2 - iy1);
      const union = metadataBboxArea(left) + metadataBboxArea(right) - intersection;
      return union > 0 ? intersection / union : null;
    }

    function metadataBboxCenter(box) {
      if (!box) return null;
      const x = Number(box.x);
      const y = Number(box.y);
      const width = Number(box.width);
      const height = Number(box.height);
      if (![x, y, width, height].every(Number.isFinite)) return null;
      return { x: x + width / 2, y: y + height / 2 };
    }

    function metadataBboxCenterDistance(left, right, frameSize = null) {
      const leftCenter = metadataBboxCenter(left);
      const rightCenter = metadataBboxCenter(right);
      if (!leftCenter || !rightCenter) return null;
      const dx = leftCenter.x - rightCenter.x;
      const dy = leftCenter.y - rightCenter.y;
      const normalized = Math.sqrt(dx * dx + dy * dy);
      const width = Number(frameSize?.width || 0);
      const height = Number(frameSize?.height || 0);
      const pixels = width > 0 && height > 0
        ? Math.sqrt((dx * width) * (dx * width) + (dy * height) * (dy * height))
        : null;
      return { normalized, pixels };
    }

    function metadataFormatBbox(box) {
      if (!box) return '-';
      const x = Number(box.x);
      const y = Number(box.y);
      const width = Number(box.width);
      const height = Number(box.height);
      if (![x, y, width, height].every(Number.isFinite)) return '-';
      return `${x.toFixed(3)},${y.toFixed(3)} ${width.toFixed(3)}x${height.toFixed(3)}`;
    }

    function metadataFormatIou(value) {
      return Number.isFinite(value) ? value.toFixed(2) : '-';
    }

    function metadataFormatDistance(distance) {
      const pixels = Number(distance?.pixels);
      if (Number.isFinite(pixels)) return `${Math.round(pixels)}px`;
      const normalized = Number(distance?.normalized);
      return Number.isFinite(normalized) ? normalized.toFixed(3) : '-';
    }

    function metadataFormatIouDistance(iou, distance) {
      const iouText = metadataFormatIou(iou);
      const distanceText = metadataFormatDistance(distance);
      return distanceText === '-' ? iouText : `${iouText} / ${distanceText}`;
    }

    function metadataItemTrackId(item) {
      const id = Number(item?.trackId ?? item?.track_id ?? 0);
      return Number.isFinite(id) && id > 0 ? Math.round(id) : 0;
    }

    function metadataItemClassName(item) {
      return String(item?.className || item?.label || item?.class_name || '').trim();
    }

    function metadataMapByTrackId(items = []) {
      const map = new Map();
      for (const item of Array.isArray(items) ? items : []) {
        const id = metadataItemTrackId(item);
        if (id > 0 && !map.has(id)) map.set(id, item);
      }
      return map;
    }

    function metadataTapMatchesPayload(tap, payload) {
      if (!tap || !payload) return false;
      const streamId = String(payload.streamId || '');
      const channelId = String(payload.channelId || '');
      if (streamId && tap.streamKey === streamId) return true;
      if (channelId && tap.tapId === channelId) return true;
      return false;
    }

    function metadataSelectDiagnosticTap(taps, payload) {
      const list = Array.isArray(taps) ? taps : [];
      if (viewTapId) {
        const direct = list.find((tap) => tap?.tapId === viewTapId);
        if (direct) return direct;
      }
      const matched = list.find((tap) => metadataTapMatchesPayload(tap, payload));
      if (matched) return matched;
      return list.find((tap) => tap?.context?.route === 'webrtc') || list[0] || null;
    }

    function metadataNearestSameClassTrack(track, tracks, frameSize) {
      const trackId = metadataItemTrackId(track);
      const className = metadataItemClassName(track);
      const box = normalizeMetadataBbox(metadataBboxFromItem(track), frameSize);
      let best = null;
      for (const candidate of Array.isArray(tracks) ? tracks : []) {
        const candidateId = metadataItemTrackId(candidate);
        if (candidateId <= 0 || candidateId === trackId) continue;
        if (className && metadataItemClassName(candidate) && metadataItemClassName(candidate) !== className) continue;
        const distance = metadataBboxCenterDistance(box, normalizeMetadataBbox(metadataBboxFromItem(candidate), frameSize), frameSize);
        if (!distance) continue;
        if (!best || Number(distance.pixels ?? distance.normalized) < Number(best.distance.pixels ?? best.distance.normalized)) {
          best = { trackId: candidateId, distance };
        }
      }
      return best;
    }

    function metadataPreviousBufferedTrack(trackId, currentKeyMs) {
      const keyMs = Number(currentKeyMs);
      const sorted = [...viewMetadataBuffer]
        .filter((entry) => Number.isFinite(entry.keyMs))
        .sort((left, right) => right.keyMs - left.keyMs || right.receivedAtMs - left.receivedAtMs);
      for (const entry of sorted) {
        if (Number.isFinite(keyMs) && entry.keyMs >= keyMs) continue;
        const tracks = Array.isArray(entry.payload?.tracks) ? entry.payload.tracks : [];
        const track = tracks.find((item) => metadataItemTrackId(item) === trackId);
        if (track) return { entry, track };
      }
      return null;
    }

    function metadataTrackHealthDetails(runtimeTrack, debugTrack, resultTrack) {
      const health = runtimeTrack?.trackHealth || debugTrack?.trackHealth || {};
      const assoc = metadataOptionalNumber(health.associationConfidence);
      const overlap = metadataOptionalNumber(health.overlapRisk);
      const missed = metadataOptionalNumber(health.missedFrameCount ?? resultTrack?.missed);
      const directionChanges = metadataOptionalNumber(health.directionChangeCount);
      const lost = metadataOptionalNumber(health.lostCount ?? runtimeTrack?.lostCount ?? debugTrack?.lostCount);
      const reacquired = metadataOptionalNumber(health.reacquiredCount ?? runtimeTrack?.reacquiredCount ?? debugTrack?.reacquiredCount);
      const state = String(runtimeTrack?.lifecycleState || resultTrack?.state || '').trim();
      const status = String(health.status || '').trim();
      const reasons = [];
      if (status && status.toLowerCase().includes('unstable')) reasons.push('status unstable');
      if (health.stable === false) reasons.push('stable=false');
      if (Number.isFinite(assoc) && assoc < 0.8) reasons.push('assoc 낮음');
      if (Number.isFinite(overlap) && overlap >= 0.2) reasons.push('overlap 높음');
      if (Number.isFinite(missed) && missed > 0) reasons.push('missed 증가');
      if (Number.isFinite(directionChanges) && directionChanges > 0) reasons.push('direction 변화');
      if (Number.isFinite(lost) && lost > 0) reasons.push('lost 이력');
      if (Number.isFinite(reacquired) && reacquired > 0) reasons.push('reacquired 이력');
      return {
        status,
        state,
        stable: health.stable,
        associationConfidence: assoc,
        overlapRisk: overlap,
        missedFrameCount: missed,
        directionChangeCount: directionChanges,
        lostCount: lost,
        reacquiredCount: reacquired,
        unstableReason: reasons.join(' · ')
      };
    }

    function metadataMapCloseObjectDiagnostics(items) {
      const map = new Map();
      for (const item of Array.isArray(items) ? items : []) {
        const trackId = metadataItemTrackId(item);
        if (trackId <= 0) continue;
        const current = map.get(trackId);
        const currentRisk = metadataOptionalNumber(current?.closeObjectRisk) ?? -1;
        const nextRisk = metadataOptionalNumber(item?.closeObjectRisk) ?? -1;
        if (!current || item?.matched === true || (!current.matched && nextRisk > currentRisk)) {
          map.set(trackId, item);
        }
      }
      return map;
    }

    function metadataNormalizedDistance(normalized, frameSize) {
      const value = metadataOptionalNumber(normalized);
      if (!Number.isFinite(value)) return null;
      const width = Number(frameSize?.width || 0);
      const height = Number(frameSize?.height || 0);
      const pixels = width > 0 && height > 0
        ? value * Math.sqrt(width * width + height * height)
        : null;
      return { normalized: value, pixels };
    }

    function metadataGuardModeLabel(guard = null, guardInfo = null) {
      const rawMode = String(guard?.mode || guardInfo?.mode || 'off').trim().toLowerCase();
      if (rawMode === 'diagnostic') return 'diagnostic-only · score 변경 없음';
      if (rawMode === 'enforce') return 'score 보정 적용 중';
      return 'guard off';
    }

    function metadataFormatOptionalNumber(value, digits = 2) {
      const number = metadataOptionalNumber(value);
      return Number.isFinite(number) ? number.toFixed(digits) : '미제공';
    }

    function metadataFormatOptionalBool(value) {
      if (value === true) return 'true';
      if (value === false) return 'false';
      return '미제공';
    }

    function metadataGuardNeedsWatch(guard) {
      if (!guard) return false;
      if (guard.wouldPenalize === true || guard.wouldHoldReacquire === true) return true;
      const risk = metadataOptionalNumber(guard.closeObjectRisk);
      const margin = metadataOptionalNumber(guard.scoreMargin);
      const centerJump = metadataOptionalNumber(guard.centerJump);
      return (Number.isFinite(risk) && risk >= 0.25) ||
        (Number.isFinite(margin) && margin <= 0.08) ||
        (Number.isFinite(centerJump) && centerJump >= 0.08) ||
        guard.directionConflict === true;
    }

    function metadataTrackContinuityDetails(runtimeTrack, payload, frameSize) {
      const trackId = metadataItemTrackId(runtimeTrack);
      const currentKeyMs = metadataPayloadKeyMs(payload);
      const currentBox = normalizeMetadataBbox(metadataBboxFromItem(runtimeTrack), frameSize);
      const previous = metadataPreviousBufferedTrack(trackId, currentKeyMs);
      const previousBox = previous ? normalizeMetadataBbox(metadataBboxFromItem(previous.track), frameSize) : null;
      const jumpDistance = previous ? metadataBboxCenterDistance(currentBox, previousBox, frameSize) : null;
      const nearestSameClass = metadataNearestSameClassTrack(runtimeTrack, payload?.tracks, frameSize);
      return {
        jumpDistance,
        nearestSameClassTrackId: nearestSameClass?.trackId || 0,
        nearestSameClassDistance: nearestSameClass?.distance || null
      };
    }

    function metadataHealthNeedsWatch(health) {
      const status = String(health?.status || '').toLowerCase();
      if (status.includes('unstable') || status.includes('lost') || health?.stable === false) return true;
      const assoc = metadataOptionalNumber(health?.associationConfidence);
      if (Number.isFinite(assoc) && assoc < 0.8) return true;
      const overlap = metadataOptionalNumber(health?.overlapRisk);
      if (Number.isFinite(overlap) && overlap >= 0.2) return true;
      const missed = metadataOptionalNumber(health?.missedFrameCount);
      if (Number.isFinite(missed) && missed > 0) return true;
      const lost = metadataOptionalNumber(health?.lostCount);
      const reacquired = metadataOptionalNumber(health?.reacquiredCount);
      return (Number.isFinite(lost) && lost > 0) || (Number.isFinite(reacquired) && reacquired > 0);
    }

    function metadataContinuityNeedsWatch(continuity, health) {
      const nearestPx = metadataOptionalNumber(continuity?.nearestSameClassDistance?.pixels);
      const jumpPx = metadataOptionalNumber(continuity?.jumpDistance?.pixels);
      const overlap = metadataOptionalNumber(health?.overlapRisk);
      const assoc = metadataOptionalNumber(health?.associationConfidence);
      if (Number.isFinite(jumpPx) && jumpPx >= 180) return true;
      return Number.isFinite(nearestPx) && nearestPx <= 90 &&
        ((Number.isFinite(overlap) && overlap >= 0.15) || (Number.isFinite(assoc) && assoc < 0.85));
    }

    function metadataDiagnosticLevel(details) {
      if (!details.runtimeBox || !details.detectorBox || !details.trackBox) return 'warning';
      if (Number.isFinite(details.trackIou) && details.trackIou < 0.75) return 'warning';
      if (Number.isFinite(details.detectorIou) && details.detectorIou < 0.45) return 'warning';
      const detectorDistancePx = Number(details.detectorDistance?.pixels);
      const trackDistancePx = Number(details.trackDistance?.pixels);
      if ((Number.isFinite(detectorDistancePx) && detectorDistancePx >= 120) ||
          (Number.isFinite(trackDistancePx) && trackDistancePx >= 120)) {
        return 'warning';
      }
      if ((Number.isFinite(details.detectorIou) && details.detectorIou < 0.75) ||
          metadataHealthNeedsWatch(details.health) ||
          metadataContinuityNeedsWatch(details.continuity, details.health) ||
          metadataGuardNeedsWatch(details.guard)) {
        return 'watch';
      }
      return 'ok';
    }

    function metadataDiagnosticVerdict(details) {
      if (!details.runtimeBox) return 'DataChannel selected 없음';
      if (!details.detectorBox) return 'detector raw 없음';
      if (!details.trackBox) return 'track box 없음';
      if (Number.isFinite(details.trackIou) && details.trackIou < 0.75) return 'metadata path 차이 의심';
      if (metadataContinuityNeedsWatch(details.continuity, details.health)) return 'ID swap 관찰 필요';
      if (metadataGuardNeedsWatch(details.guard)) return 'close-object guard 관찰';
      if (metadataHealthNeedsWatch(details.health)) return 'TrackHealth 관찰';
      if (!Number.isFinite(details.detectorIou)) return '비교 불가';
      if (details.detectorIou >= 0.75) return 'bbox 일치';
      if (details.detectorIou >= 0.45) return 'detector/track 차이 관찰';
      return 'detector raw 차이 큼';
    }

    function metadataBuildBboxDiagnosticRows(tap, payload) {
      const frameSize = metadataFrameSize(payload);
      const result = tap?.latestResult || {};
      const detections = Array.isArray(result.detections) ? result.detections : [];
      const detectorDetections = Array.isArray(tap?.detectorDetections) ? tap.detectorDetections : detections;
      const resultTracks = Array.isArray(result.tracks) ? result.tracks : [];
      const debugTracks = Array.isArray(result.debugState?.tracks) ? result.debugState.tracks : [];
      const dataChannelTracks = Array.isArray(payload?.tracks) ? payload.tracks : [];
      const closeObjectById = metadataMapCloseObjectDiagnostics(tap?.closeObjectDiagnostics);
      const closeObjectGuard = tap?.closeObjectGuard || null;
      const detectorById = metadataMapByTrackId(detectorDetections);
      const detectionById = metadataMapByTrackId(detections);
      const resultTrackById = metadataMapByTrackId(resultTracks);
      const debugTrackById = metadataMapByTrackId(debugTracks);
      const seen = new Set();
      const rows = [];
      for (const runtimeTrack of dataChannelTracks) {
        const trackId = metadataItemTrackId(runtimeTrack);
        if (trackId <= 0 || seen.has(trackId)) continue;
        seen.add(trackId);
        const detector = detectorById.get(trackId) || null;
        const detection = detectionById.get(trackId) || null;
        const resultTrack = resultTrackById.get(trackId) || null;
        const debugTrack = debugTrackById.get(trackId) || null;
        const runtimeBox = normalizeMetadataBbox(metadataBboxFromItem(runtimeTrack), frameSize);
        const detectorBox = normalizeMetadataBbox(metadataBboxFromItem(detector), frameSize);
        const trackBox = normalizeMetadataBbox(metadataBboxFromItem(resultTrack) || metadataBboxFromItem(debugTrack), frameSize) || runtimeBox;
        const detectorIou = metadataBboxIou(runtimeBox, detectorBox);
        const trackIou = metadataBboxIou(runtimeBox, trackBox);
        const detectorDistance = metadataBboxCenterDistance(runtimeBox, detectorBox, frameSize);
        const trackDistance = metadataBboxCenterDistance(runtimeBox, trackBox, frameSize);
        const continuity = metadataTrackContinuityDetails(runtimeTrack, payload, frameSize);
        const health = metadataTrackHealthDetails(runtimeTrack, debugTrack, resultTrack);
        const guard = closeObjectById.get(trackId) || null;
        const details = {
          runtimeBox,
          detectorBox,
          trackBox,
          detectorIou,
          trackIou,
          detectorDistance,
          trackDistance,
          continuity,
          health,
          guard
        };
        const level = metadataDiagnosticLevel(details);
        rows.push({
          trackId,
          confidence: runtimeTrack.confidence ?? detector?.score ?? detection?.score ?? resultTrack?.score ?? debugTrack?.confidence,
          runtimeBox,
          detectorBox,
          trackBox,
          detectorIou,
          trackIou,
          detectorDistance,
          trackDistance,
          continuity,
          health,
          guard,
          guardInfo: closeObjectGuard,
          level,
          verdict: metadataDiagnosticVerdict(details)
        });
      }
      for (const detector of detectorDetections) {
        const trackId = metadataItemTrackId(detector);
        if (trackId <= 0 || seen.has(trackId)) continue;
        seen.add(trackId);
        const resultTrack = resultTrackById.get(trackId) || null;
        const debugTrack = debugTrackById.get(trackId) || null;
        const detectorBox = normalizeMetadataBbox(metadataBboxFromItem(detector), frameSize);
        const trackBox = normalizeMetadataBbox(metadataBboxFromItem(resultTrack) || metadataBboxFromItem(debugTrack), frameSize);
        rows.push({
          trackId,
          confidence: detector.score,
          runtimeBox: null,
          detectorBox,
          trackBox,
          detectorIou: null,
          trackIou: null,
          detectorDistance: null,
          trackDistance: null,
          continuity: null,
          health: metadataTrackHealthDetails(null, debugTrack, resultTrack),
          guard: closeObjectById.get(trackId) || null,
          guardInfo: closeObjectGuard,
          level: 'warning',
          verdict: metadataDiagnosticVerdict({
            runtimeBox: null,
            detectorBox,
            trackBox,
            detectorIou: null,
            trackIou: null,
            guard: closeObjectById.get(trackId) || null
          })
        });
      }
      return rows;
    }

    function metadataFormatContinuity(continuity) {
      if (!continuity) return '-';
      const parts = [];
      if (continuity.jumpDistance) parts.push(`jump ${metadataFormatDistance(continuity.jumpDistance)}`);
      if (continuity.nearestSameClassTrackId > 0 && continuity.nearestSameClassDistance) {
        parts.push(`near #${continuity.nearestSameClassTrackId} ${metadataFormatDistance(continuity.nearestSameClassDistance)}`);
      }
      return parts.join(' · ') || '-';
    }

    function metadataFormatHealthDetails(health) {
      if (!health) return '-';
      const parts = [];
      if (health.status) parts.push(health.status);
      if (health.state) parts.push(health.state);
      if (Number.isFinite(health.associationConfidence)) parts.push(`assoc ${health.associationConfidence.toFixed(2)}`);
      if (Number.isFinite(health.overlapRisk)) parts.push(`overlap ${health.overlapRisk.toFixed(2)}`);
      if (Number.isFinite(health.missedFrameCount)) parts.push(`missed ${Math.round(health.missedFrameCount)}`);
      if (Number.isFinite(health.directionChangeCount)) parts.push(`direction ${Math.round(health.directionChangeCount)}`);
      const lost = Number.isFinite(health.lostCount) ? Math.round(health.lostCount) : '-';
      const reacquired = Number.isFinite(health.reacquiredCount) ? Math.round(health.reacquiredCount) : '-';
      parts.push(`lost/reacq ${lost}/${reacquired}`);
      if (health.unstableReason) parts.push(`reason ${health.unstableReason}`);
      return parts.join(' · ');
    }

    function metadataFormatCloseObjectGuard(guard, guardInfo, frameSize) {
      const modeLabel = metadataGuardModeLabel(guard, guardInfo);
      if (!guard) {
        return modeLabel === 'guard off' ? modeLabel : `${modeLabel} · 값 미제공`;
      }
      const parts = [];
      parts.push(metadataGuardModeLabel(guard, guardInfo));
      parts.push(`risk ${metadataFormatOptionalNumber(guard.closeObjectRisk)}`);
      const nearestId = Number(guard.nearestSameClassTrackId || 0);
      const nearest = metadataNormalizedDistance(guard.nearestSameClassDistance, frameSize);
      parts.push(nearestId > 0 ? `nearest #${nearestId}` : 'nearest 미제공');
      parts.push(nearest ? `nearestDist ${metadataFormatDistance(nearest)}` : 'nearestDist 미제공');
      parts.push(`candidate ${metadataFormatOptionalNumber(guard.candidateScore)}`);
      parts.push(`best ${metadataFormatOptionalNumber(guard.bestScore)}`);
      parts.push(`second ${metadataFormatOptionalNumber(guard.secondScore)}`);
      parts.push(`margin ${metadataFormatOptionalNumber(guard.scoreMargin)}`);
      const centerJump = metadataNormalizedDistance(guard.centerJump, frameSize);
      parts.push(centerJump ? `jump ${metadataFormatDistance(centerJump)}` : 'jump 미제공');
      parts.push(`directionConflict ${metadataFormatOptionalBool(guard.directionConflict)}`);
      parts.push(`wouldPenalize ${metadataFormatOptionalBool(guard.wouldPenalize)}`);
      parts.push(`wouldHoldReacquire ${metadataFormatOptionalBool(guard.wouldHoldReacquire)}`);
      parts.push(`applied ${metadataFormatOptionalBool(guard.closeObjectGuardApplied)}`);
      parts.push(`decision ${guard.guardDecision || '미제공'}`);
      return parts.join(' · ') || '-';
    }

    function renderMetadataBboxDiagnostics(rows = [], state = '') {
      setText('metadataBboxDiagnosticState', state || '진단 대기 중');
      const tbody = $('metadataBboxDiagnosticRows');
      if (!tbody) return;
      tbody.textContent = '';
      if (!rows.length) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.className = 'dashboard-empty-cell';
        cell.colSpan = 11;
        cell.textContent = state || 'BBox 진단 갱신을 누르면 detector/track 비교를 표시합니다.';
        row.appendChild(cell);
        tbody.appendChild(row);
        return;
      }
      for (const item of rows) {
        const row = document.createElement('tr');
        if (item.level === 'warning') {
          row.className = 'is-warning';
        } else if (item.level === 'watch') {
          row.className = 'is-watch';
        }
        const cells = [
          `#${item.trackId}`,
          metadataConfidenceLabel(item.confidence) || '-',
          metadataFormatBbox(item.runtimeBox),
          metadataFormatBbox(item.detectorBox),
          metadataFormatBbox(item.trackBox),
          metadataFormatIouDistance(item.detectorIou, item.detectorDistance),
          metadataFormatIouDistance(item.trackIou, item.trackDistance),
          metadataFormatContinuity(item.continuity),
          metadataFormatHealthDetails(item.health),
          metadataFormatCloseObjectGuard(item.guard, item.guardInfo, metadataFrameSize(viewMetadataLatestPayload)),
          item.verdict
        ];
        for (const value of cells) {
          const cell = document.createElement('td');
          cell.textContent = value;
          row.appendChild(cell);
        }
        tbody.appendChild(row);
      }
    }

    async function refreshMetadataBboxDiagnostics() {
      const payload = viewMetadataLatestPayload;
      if (!payload) {
        renderMetadataBboxDiagnostics([], 'metadata 수신 후 진단할 수 있습니다.');
        return;
      }
      renderMetadataBboxDiagnostics([], 'BBox 진단 조회 중...');
      const response = await fetch('/lab/analysis/taps', { cache: 'no-store' });
      if (!response.ok) throw new Error(`/lab/analysis/taps HTTP ${response.status}`);
      const body = await response.json();
      const tap = metadataSelectDiagnosticTap(body.taps, payload);
      if (!tap || !tap.tapId) {
        viewMetadataBboxDiagnostics = null;
        renderMetadataBboxDiagnostics([], 'active analysis tap이 없습니다.');
        return;
      }
      const analysisPtsMs = metadataNumber(payload.analysisPtsMs ?? payload.timestampMs);
      if (analysisPtsMs === null) {
        viewMetadataBboxDiagnostics = null;
        renderMetadataBboxDiagnostics([], 'metadata analysisPtsMs가 없어 진단할 수 없습니다.');
        return;
      }
      const params = new URLSearchParams();
      params.set('ptsMs', String(Math.round(analysisPtsMs)));
      params.set('toleranceMs', String(metadataDrawToleranceMs(payload)));
      const diagnosticsResponse = await fetch(`/lab/analysis/taps/${encodeURIComponent(tap.tapId)}/bbox-diagnostics?${params.toString()}`, { cache: 'no-store' });
      if (!diagnosticsResponse.ok) {
        throw new Error(`bbox diagnostics HTTP ${diagnosticsResponse.status}`);
      }
      const diagnostics = await diagnosticsResponse.json();
      if (!diagnostics.matched || !diagnostics.result) {
        viewMetadataBboxDiagnostics = null;
        renderMetadataBboxDiagnostics([], `${tap.tapId} · near-PTS 분석 결과 없음`);
        return;
      }
      const diagnosticTap = {
        ...tap,
        latestResult: diagnostics.result,
        detectorDetections: diagnostics.detectorDetections || [],
        closeObjectGuard: diagnostics.closeObjectGuard || null,
        closeObjectDiagnostics: diagnostics.closeObjectDiagnostics || []
      };
      const rows = metadataBuildBboxDiagnosticRows(diagnosticTap, payload);
      const tapPtsMs = metadataNumber(diagnostics.matchedPtsMs);
      viewMetadataBboxDiagnostics = {
        tapId: tap.tapId || '',
        ptsMs: tapPtsMs,
        detectorDetections: diagnostics.detectorDetections || [],
        closeObjectGuard: diagnostics.closeObjectGuard || null,
        closeObjectDiagnostics: diagnostics.closeObjectDiagnostics || [],
        rows
      };
      const deltaText = metadataNumber(diagnostics.matchedDeltaMs) !== null ? ` · matched delta ${diagnostics.matchedDeltaMs}ms` : '';
      renderMetadataBboxDiagnostics(rows, `${tap.tapId || 'tap'} · detector ${viewMetadataBboxDiagnostics.detectorDetections.length} · guard ${viewMetadataBboxDiagnostics.closeObjectDiagnostics.length} · rows ${rows.length}${deltaText}`);
      scheduleMetadataOverlayFrame();
    }

    function drawMetadataDetectionDiagnostics(surface, content, frameSize, payload) {
      const options = metadataOverlayOptions();
      if (!options.detection || !viewMetadataBboxDiagnostics) return;
      const analysisPtsMs = metadataNumber(payload?.analysisPtsMs ?? payload?.timestampMs);
      if (viewMetadataBboxDiagnostics.ptsMs !== null && analysisPtsMs !== null &&
          Math.abs(viewMetadataBboxDiagnostics.ptsMs - analysisPtsMs) > 600) {
        return;
      }
      surface.ctx.save();
      surface.ctx.setLineDash([6, 4]);
      surface.ctx.lineWidth = 2;
      surface.ctx.strokeStyle = '#ff4fd8';
      surface.ctx.fillStyle = '#ff4fd8';
      surface.ctx.font = '800 11px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
      for (const detection of viewMetadataBboxDiagnostics.detectorDetections || []) {
        const bbox = normalizeMetadataBbox(metadataBboxFromItem(detection), frameSize);
        if (!bbox) continue;
        const x = content.x + bbox.x * content.width;
        const y = content.y + bbox.y * content.height;
        const width = bbox.width * content.width;
        const height = bbox.height * content.height;
        surface.ctx.strokeRect(x, y, width, height);
        const label = `raw #${metadataItemTrackId(detection) || '-'} ${metadataConfidenceLabel(detection.score)}`;
        surface.ctx.fillText(label, Math.max(0, x), Math.max(12, y - 4));
      }
      surface.ctx.restore();
    }

    function drawMetadataLabel(ctx, lines, x, y, color, maxWidth) {
      const visibleLines = lines.filter(Boolean);
      if (visibleLines.length === 0) return;
      ctx.save();
      ctx.font = '700 12px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
      const paddingX = 7;
      const paddingY = 5;
      const lineHeight = 16;
      const textWidth = Math.min(
        maxWidth,
        Math.max(...visibleLines.map((line) => ctx.measureText(line).width)) + paddingX * 2
      );
      const boxHeight = visibleLines.length * lineHeight + paddingY * 2;
      const boxX = Math.max(0, Math.min(x, maxWidth - textWidth));
      const boxY = Math.max(0, y - boxHeight - 4);
      ctx.fillStyle = 'rgba(18,18,13,0.78)';
      ctx.fillRect(boxX, boxY, textWidth, boxHeight);
      ctx.fillStyle = color;
      ctx.fillRect(boxX, boxY, 3, boxHeight);
      ctx.fillStyle = '#fff';
      visibleLines.forEach((line, index) => {
        ctx.fillText(line, boxX + paddingX, boxY + paddingY + 12 + index * lineHeight);
      });
      ctx.restore();
    }

    function setMetadataOverlayStale(stale) {
      const next = Boolean(stale);
      const changed = next !== viewMetadataOverlayStale;
      if (next && !viewMetadataOverlayStale) {
        viewMetadataStaleCount += 1;
      }
      viewMetadataOverlayStale = next;
      const canvas = $('viewMetadataOverlayCanvas');
      if (canvas) canvas.classList.toggle('is-stale', next);
      const badge = $('metadataStaleBadge');
      if (badge) badge.hidden = !next;
      if (changed) updateMetadataViewerPanel();
    }

    function setMetadataSyncMissActive(active) {
      const next = Boolean(active);
      if (next && !viewMetadataSyncMissActive) {
        viewMetadataSyncMissCount += 1;
      }
      const changed = next !== viewMetadataSyncMissActive;
      viewMetadataSyncMissActive = next;
      if (changed) updateMetadataViewerPanel();
    }

    function metadataMessageStale(now = Date.now()) {
      return Boolean(viewMetadataLastMessageAt && now - viewMetadataLastMessageAt > 3000);
    }

    function metadataNoMatchGraceMs() {
      return 900;
    }

    function clearMetadataOverlay(options = {}) {
      const surface = resizeMetadataOverlayCanvas();
      if (surface) {
        surface.ctx.clearRect(0, 0, surface.width, surface.height);
      }
      viewMetadataSelectedSyncDeltaMs = null;
      viewMetadataSelectedLagMs = null;
      setMetadataOverlayStale(Boolean(options.stale));
      updateMetadataViewerPanel();
    }

    function metadataNumber(value, fallback = null) {
      const number = Number(value);
      return Number.isFinite(number) ? number : fallback;
    }

    function metadataPayloadKeyMs(payload) {
      const videoFramePtsMs = metadataNumber(payload?.videoFramePtsMs);
      if (videoFramePtsMs !== null) return videoFramePtsMs;
      const analysisPtsMs = metadataNumber(payload?.analysisPtsMs);
      if (analysisPtsMs !== null) return analysisPtsMs;
      const timestampMs = metadataNumber(payload?.timestampMs ?? payload?.timestamp);
      if (timestampMs !== null) return timestampMs;
      const pts = metadataNumber(payload?.pts);
      return pts !== null ? Math.round(pts / 1000000) : null;
    }

    function metadataDrawToleranceMs(payload) {
      const value = metadataNumber(payload?.syncToleranceMs);
      if (value !== null && value >= 0) return Math.max(120, Math.min(600, value));
      return 400;
    }

    function metadataSyncStatus(payload) {
      const status = String(payload?.syncStatus || '').toLowerCase();
      return status || 'unknown';
    }

    function isFallbackMetadata(payload) {
      return metadataSyncStatus(payload) === 'fallback-latest';
    }

    function metadataPayloadDrawable(payload, options = metadataOverlayOptions()) {
      const status = metadataSyncStatus(payload);
      if (status === 'fallback-latest') return options.fallback === true;
      if (status === 'missing' || status === 'stale') return false;
      if (status && status !== 'exact' && status !== 'near') return false;
      return true;
    }

    function noteFallbackHidden(payload) {
      const sequence = Number(payload?.metadataSequence || 0);
      if (sequence > 0 && sequence === viewMetadataLastHiddenFallbackSequence) return;
      viewMetadataLastHiddenFallbackSequence = sequence > 0 ? sequence : viewMetadataLastHiddenFallbackSequence;
      viewMetadataFallbackHiddenCount += 1;
      updateMetadataViewerPanel();
    }

    function maxMetadataBufferEntries() {
      return 90;
    }

    function maxMetadataBufferMs() {
      return 5000;
    }

    function maxMetadataAgeMs() {
      return 5000;
    }

    function metadataTimelineRollbackThresholdMs() {
      return 1500;
    }

    function resetMetadataOverlayTimeline() {
      viewMetadataBuffer = [];
      viewMetadataVideoPtsOffsetMs = null;
      viewMetadataPtsCalibrationCount = 0;
      viewMetadataSyncMissCleared = false;
      setMetadataSyncMissActive(false);
    }

    function pruneMetadataBuffer(now = Date.now()) {
      const beforeCount = viewMetadataBuffer.length;
      const newestKeyMs = viewMetadataBuffer.reduce((maxKey, entry) => (
        Number.isFinite(entry.keyMs) ? Math.max(maxKey, entry.keyMs) : maxKey
      ), Number.NEGATIVE_INFINITY);
      const minKeyMs = Number.isFinite(newestKeyMs) ? newestKeyMs - maxMetadataAgeMs() : Number.NEGATIVE_INFINITY;
      viewMetadataBuffer = viewMetadataBuffer
        .filter((entry) => now - entry.receivedAtMs <= maxMetadataBufferMs())
        .filter((entry) => entry.keyMs >= minKeyMs)
        .sort((left, right) => {
          const keyDelta = left.keyMs - right.keyMs;
          return keyDelta !== 0 ? keyDelta : left.receivedAtMs - right.receivedAtMs;
        });
      viewMetadataBufferDropCount += Math.max(0, beforeCount - viewMetadataBuffer.length);
      const maxItems = maxMetadataBufferEntries();
      if (viewMetadataBuffer.length > maxItems) {
        const overflow = viewMetadataBuffer.length - maxItems;
        viewMetadataBuffer.splice(0, overflow);
        viewMetadataBufferDropCount += overflow;
      }
    }

    function bufferMetadataPayload(payload) {
      const keyMs = metadataPayloadKeyMs(payload);
      if (keyMs === null) {
        viewMetadataBufferDropCount += 1;
        return;
      }
      if (viewMetadataLastPayloadKeyMs !== null &&
          keyMs + metadataTimelineRollbackThresholdMs() < viewMetadataLastPayloadKeyMs) {
        resetMetadataOverlayTimeline();
      }
      viewMetadataLastPayloadKeyMs = keyMs;
      const receivedAtMs = Date.now();
      const beforeReplaceCount = viewMetadataBuffer.length;
      viewMetadataBuffer = viewMetadataBuffer.filter((entry) => entry.keyMs !== keyMs);
      viewMetadataBufferDropCount += Math.max(0, beforeReplaceCount - viewMetadataBuffer.length);
      viewMetadataBuffer.push({ keyMs, receivedAtMs, payload });
      pruneMetadataBuffer(receivedAtMs);
    }

    function metadataSyncVerificationDebugEnabled() {
      return new URLSearchParams(window.location.search).has('verify-webrtc-va-metadata-sync');
    }

    function metadataSyncVerificationSnapshot() {
      return {
        metadataBufferSize: viewMetadataBuffer.length,
        metadataBufferDropCount: viewMetadataBufferDropCount,
        maxMetadataBufferEntries: maxMetadataBufferEntries(),
        maxMetadataBufferMs: maxMetadataBufferMs(),
        maxMetadataAgeMs: maxMetadataAgeMs()
      };
    }

    function installMetadataSyncVerificationDebugHook() {
      if (!metadataSyncVerificationDebugEnabled()) return;
      window.__vaMetadataViewerDebug = {
        snapshot: metadataSyncVerificationSnapshot,
        injectSyntheticBufferEntries(count = maxMetadataBufferEntries() + 32) {
          const total = Math.max(0, Math.round(Number(count) || 0));
          const basePtsMs = Date.now();
          for (let index = 0; index < total; index += 1) {
            bufferMetadataPayload({
              schema: 'media-server.webrtc.va-metadata.v1',
              streamId: 'verify-buffer',
              channelId: 'verify-buffer',
              frameId: index + 1,
              timestampMs: basePtsMs + index * 33,
              videoFramePtsMs: basePtsMs + index * 33,
              analysisPtsMs: basePtsMs + index * 33,
              syncDeltaMs: 0,
              syncStatus: 'exact',
              syncToleranceMs: 200,
              metadataSequence: index + 1,
              sentAtMs: Date.now(),
              frameWidth: 1280,
              frameHeight: 720,
              coordinateSpace: 'normalized-frame',
              tracks: [],
              events: [],
              scenarios: []
            });
          }
          updateMetadataViewerPanel();
          return metadataSyncVerificationSnapshot();
        }
      };
    }

    function currentMediaTimeMs(videoFrameMetadata = null) {
      const video = $('viewWebRtcVideo');
      const mediaTimeMs = metadataNumber(videoFrameMetadata?.mediaTime);
      const fallbackTimeMs = metadataNumber(video?.currentTime);
      return mediaTimeMs !== null ? mediaTimeMs * 1000 : (fallbackTimeMs !== null ? fallbackTimeMs * 1000 : null);
    }

    function recordMetadataVideoFramePresented(videoFrameMetadata = null, options = {}) {
      const presentedFrames = metadataNumber(videoFrameMetadata?.presentedFrames);
      if (presentedFrames !== null && presentedFrames > 0) {
        viewMetadataVideoPresentedFrames = Math.max(viewMetadataVideoPresentedFrames, Math.round(presentedFrames));
      } else if (options.increment !== false) {
        viewMetadataVideoPresentedFrames += 1;
      }
      viewMetadataLastVideoFrameAt = Date.now();
      viewMetadataLastVideoFrameMediaTimeMs = currentMediaTimeMs(videoFrameMetadata);
      setMetadataVideoStalled(false);
      scheduleMetadataVideoStallCheck();
      updateMetadataViewerPanel();
    }

    function recordMetadataAnimationFrameIfVideoAdvanced() {
      const mediaTimeMs = currentMediaTimeMs(null);
      if (mediaTimeMs === null) {
        checkMetadataVideoStall();
        return false;
      }
      const previousMediaTimeMs = viewMetadataLastVideoFrameMediaTimeMs;
      const advanced = previousMediaTimeMs === null || Math.abs(mediaTimeMs - previousMediaTimeMs) >= 1;
      if (advanced) {
        recordMetadataVideoFramePresented(null);
        return true;
      }
      checkMetadataVideoStall();
      return false;
    }

    function calibrationCandidateMetadata() {
      for (let index = viewMetadataBuffer.length - 1; index >= 0; index -= 1) {
        const payload = viewMetadataBuffer[index].payload;
        const status = metadataSyncStatus(payload);
        if (status === 'exact' || status === 'near') {
          return viewMetadataBuffer[index];
        }
      }
      return viewMetadataBuffer.length > 0 ? viewMetadataBuffer[viewMetadataBuffer.length - 1] : null;
    }

    function ensureMetadataPtsCalibration(mediaTimeMs) {
      if (mediaTimeMs === null) return false;
      if (viewMetadataVideoPtsOffsetMs !== null) return true;
      const candidate = calibrationCandidateMetadata();
      if (!candidate) return false;
      viewMetadataVideoPtsOffsetMs = candidate.keyMs - mediaTimeMs;
      viewMetadataPtsCalibrationCount = 1;
      return true;
    }

    function updateMetadataPtsCalibration(mediaTimeMs, selectedEntry) {
      if (mediaTimeMs === null || !selectedEntry || isFallbackMetadata(selectedEntry.payload)) return;
      const nextOffsetMs = selectedEntry.keyMs - mediaTimeMs;
      if (viewMetadataVideoPtsOffsetMs === null) {
        viewMetadataVideoPtsOffsetMs = nextOffsetMs;
        viewMetadataPtsCalibrationCount = 1;
        return;
      }
      const driftMs = Math.abs(nextOffsetMs - viewMetadataVideoPtsOffsetMs);
      if (driftMs <= 1000) {
        viewMetadataVideoPtsOffsetMs = viewMetadataVideoPtsOffsetMs * 0.92 + nextOffsetMs * 0.08;
        viewMetadataPtsCalibrationCount += 1;
      }
    }

    function currentPresentedVideoPtsMs(videoFrameMetadata = null) {
      const mediaTimeMs = currentMediaTimeMs(videoFrameMetadata);
      if (!ensureMetadataPtsCalibration(mediaTimeMs)) return null;
      if (viewMetadataVideoPtsOffsetMs === null) return null;
      return mediaTimeMs + viewMetadataVideoPtsOffsetMs;
    }

    function metadataMaxSelectedWallClockLagMs() {
      return 900;
    }

    function metadataPayloadWallClockLagMs(payload, entry = null, now = Date.now()) {
      const sentAtMs = metadataNumber(payload?.sentAtMs);
      const receivedAtMs = metadataNumber(entry?.receivedAtMs);
      const referenceMs = sentAtMs !== null ? sentAtMs : receivedAtMs;
      return referenceMs !== null ? Math.max(0, now - referenceMs) : null;
    }

    function metadataCandidateIsBetter(candidate, current) {
      if (!current) return true;
      if (candidate.deltaMs !== current.deltaMs) return candidate.deltaMs < current.deltaMs;
      return candidate.entry.receivedAtMs > current.entry.receivedAtMs;
    }

    function metadataCandidateIsNewer(candidate, current) {
      if (!current) return true;
      return candidate.entry.receivedAtMs > current.entry.receivedAtMs;
    }

    function metadataNewestRecentDrawableCandidate(options, now = Date.now(), currentPtsMs = null) {
      let newest = null;
      for (const entry of viewMetadataBuffer) {
        const payload = entry.payload;
        if (isFallbackMetadata(payload) && !options.fallback) continue;
        if (!metadataPayloadDrawable(payload, options)) continue;
        const lagMs = metadataPayloadWallClockLagMs(payload, entry, now);
        if (lagMs === null || lagMs > metadataMaxSelectedWallClockLagMs()) continue;
        const deltaMs = currentPtsMs !== null ? Math.abs(entry.keyMs - currentPtsMs) : 0;
        const candidate = { entry, payload, deltaMs, toleranceMs: metadataDrawToleranceMs(payload) };
        if (metadataCandidateIsNewer(candidate, newest)) newest = candidate;
      }
      return newest;
    }

    function selectMetadataForPresentedFrame(videoFrameMetadata = null) {
      pruneMetadataBuffer();
      const mediaTimeMs = currentMediaTimeMs(videoFrameMetadata);
      const currentPtsMs = currentPresentedVideoPtsMs(videoFrameMetadata);
      if (currentPtsMs === null) return null;
      let best = null;
      let fallbackCandidate = null;
      let newestDrawable = null;
      const now = Date.now();
      const options = metadataOverlayOptions();
      for (const entry of viewMetadataBuffer) {
        const payload = entry.payload;
        const deltaMs = Math.abs(entry.keyMs - currentPtsMs);
        const toleranceMs = metadataDrawToleranceMs(payload);
        if (deltaMs > toleranceMs) continue;
        if (isFallbackMetadata(payload)) {
          if (!options.fallback) {
            noteFallbackHidden(payload);
            continue;
          }
          const candidate = { entry, payload, deltaMs, toleranceMs };
          if (metadataCandidateIsBetter(candidate, fallbackCandidate)) {
            fallbackCandidate = candidate;
          }
          continue;
        }
        if (!metadataPayloadDrawable(payload, options)) continue;
        const candidate = { entry, payload, deltaMs, toleranceMs };
        if (metadataCandidateIsNewer(candidate, newestDrawable)) {
          newestDrawable = candidate;
        }
        if (metadataCandidateIsBetter(candidate, best)) {
          best = candidate;
        }
      }
      let selected = best || fallbackCandidate;
      let forceRecalibrate = false;
      const selectedLagMs = selected ? metadataPayloadWallClockLagMs(selected.payload, selected.entry, now) : null;
      const newestRecent = metadataNewestRecentDrawableCandidate(options, now, currentPtsMs) || newestDrawable;
      const newestLagMs = newestRecent ? metadataPayloadWallClockLagMs(newestRecent.payload, newestRecent.entry, now) : null;
      if (selected && newestRecent &&
          selectedLagMs !== null && selectedLagMs > metadataMaxSelectedWallClockLagMs() &&
          newestLagMs !== null && newestLagMs <= metadataMaxSelectedWallClockLagMs()) {
        selected = newestRecent;
        forceRecalibrate = true;
      }
      if (selected) {
        if (forceRecalibrate && mediaTimeMs !== null) {
          viewMetadataVideoPtsOffsetMs = selected.entry.keyMs - mediaTimeMs;
          viewMetadataPtsCalibrationCount = 1;
        } else {
          updateMetadataPtsCalibration(mediaTimeMs, selected.entry);
        }
      }
      return selected;
    }

    function updateSelectedMetadataDiagnostics(payload, selectedDeltaMs = null) {
      const selectedDelta = metadataNumber(selectedDeltaMs);
      viewMetadataSelectedSyncDeltaMs = selectedDelta !== null
        ? Math.round(selectedDelta)
        : metadataNumber(payload?.syncDeltaMs);
      const sentAtMs = metadataNumber(payload?.sentAtMs);
      viewMetadataSelectedLagMs = sentAtMs !== null ? Math.max(0, Date.now() - sentAtMs) : null;
      updateMetadataViewerPanel();
    }

    function drawMetadataOverlayForPayload(payload, videoFrameMetadata = null, selectedDeltaMs = null) {
      const surface = resizeMetadataOverlayCanvas();
      if (!surface) return;
      const stale = metadataMessageStale();
      setMetadataOverlayStale(stale);
      if (stale || !payload || !Array.isArray(payload.tracks) || payload.tracks.length === 0) {
        return;
      }
      setMetadataSyncMissActive(false);
      updateSelectedMetadataDiagnostics(payload, selectedDeltaMs);
      const content = metadataVideoContentRect(payload);
      if (!content) return;
      viewMetadataSyncMissCleared = false;
      const frameSize = metadataFrameSize(payload);
      const options = metadataOverlayOptions();
      const anyText = options.label || options.trackId || options.zone || options.dwell || options.scenario || options.health;
      const fallback = isFallbackMetadata(payload);
      surface.ctx.save();
      surface.ctx.globalAlpha = fallback ? 0.42 : 1;
      for (const track of payload.tracks) {
        if (!shouldDrawMetadataTrack(track)) continue;
        const bbox = normalizeMetadataBbox(track.bbox, frameSize);
        if (!bbox) continue;
        const x = content.x + bbox.x * content.width;
        const y = content.y + bbox.y * content.height;
        const width = bbox.width * content.width;
        const height = bbox.height * content.height;
        const event = options.event ? metadataEventForTrack(payload, track.trackId) : null;
        const unstable = options.health && isMetadataTrackUnstable(track);
        const color = event ? '#ffcc00' : (unstable ? '#f56565' : '#6fd0a5');
        if (options.event && event) {
          surface.ctx.fillStyle = 'rgba(255, 204, 0, 0.16)';
          surface.ctx.fillRect(x, y, width, height);
        }
        if (options.bbox || event) {
          surface.ctx.strokeStyle = color;
          surface.ctx.lineWidth = event ? 4 : 3;
          surface.ctx.strokeRect(x, y, width, height);
        }
        if (!anyText) continue;
        const lines = [];
        if (options.label) {
          const confidence = metadataConfidenceLabel(track.confidence);
          lines.push(`${track.className || 'object'}${confidence ? ` ${confidence}` : ''}`);
        }
        if (options.trackId && Number(track.trackId || 0) > 0) {
          lines.push(`#${track.trackId}`);
        }
        if (options.zone && track.currentZone) {
          lines.push(`zone ${track.currentZone}`);
        }
        if (options.dwell) {
          const dwell = metadataDwellLabel(track.dwellTimeMs);
          if (dwell) lines.push(`체류 ${dwell}`);
        }
        if (options.scenario && (track.scenarioPhase || track.scenarioName)) {
          lines.push(`${track.scenarioName || 'scenario'} ${track.scenarioPhase || ''}`.trim());
        }
        if (options.health) {
          lines.push(unstable ? 'TrackHealth 불안정' : 'TrackHealth 안정');
        }
        if (options.event && event) {
          lines.push(`이벤트 ${event.eventType || event.status || 'emitted'}`);
        }
        if (fallback) {
          lines.push('fallback metadata');
        }
        drawMetadataLabel(surface.ctx, lines, x, y, color, surface.width);
      }
      drawMetadataDetectionDiagnostics(surface, content, frameSize, payload);
      surface.ctx.restore();
      viewMetadataDrawCount += 1;
      viewMetadataLastDrawAt = Date.now();
      updateMetadataViewerPanel();
    }

    function handleMetadataOverlayNoMatch() {
      const now = Date.now();
      const fresh = viewMetadataMessageCount > 0 && !metadataMessageStale(now);
      if (fresh) {
        setMetadataOverlayStale(false);
        setMetadataSyncMissActive(true);
        if (viewMetadataLastDrawAt > 0 && now - viewMetadataLastDrawAt <= metadataNoMatchGraceMs()) {
          return;
        }
        if (viewMetadataSyncMissCleared) {
          return;
        }
        clearMetadataOverlay({ stale: false });
        viewMetadataSyncMissCleared = true;
        return;
      }
      viewMetadataSyncMissCleared = false;
      setMetadataSyncMissActive(false);
      clearMetadataOverlay({ stale: viewMetadataMessageCount > 0 });
    }

    function drawMetadataOverlay(videoFrameMetadata = null) {
      if (viewMetadataVideoStalled) {
        setMetadataSyncMissActive(false);
        clearMetadataOverlay({ stale: true });
        return;
      }
      const selected = selectMetadataForPresentedFrame(videoFrameMetadata);
      if (!selected) {
        handleMetadataOverlayNoMatch();
        return;
      }
      viewMetadataLatestPayload = selected.payload;
      viewMetadataSelectedEntry = selected.entry || null;
      drawMetadataOverlayForPayload(selected.payload, videoFrameMetadata, selected.deltaMs);
    }

    function scheduleMetadataOverlayFrame() {
      if (!viewMetadataPresentationLoopRunning || viewMetadataOverlayTimer !== null) return;
      const video = $('viewWebRtcVideo');
      if (video && typeof video.requestVideoFrameCallback === 'function') {
        viewMetadataOverlayTimerKind = 'video-frame';
        viewMetadataOverlayTimer = video.requestVideoFrameCallback((_now, metadata) => {
          viewMetadataOverlayTimer = null;
          viewMetadataOverlayTimerKind = '';
          if (!viewMetadataPresentationLoopRunning) return;
          recordMetadataVideoFramePresented(metadata);
          drawMetadataOverlay(metadata);
          scheduleMetadataOverlayFrame();
        });
        return;
      }
      viewMetadataOverlayTimerKind = 'animation-frame';
      viewMetadataOverlayTimer = window.requestAnimationFrame(() => {
        viewMetadataOverlayTimer = null;
        viewMetadataOverlayTimerKind = '';
        if (!viewMetadataPresentationLoopRunning) return;
        const videoAdvanced = recordMetadataAnimationFrameIfVideoAdvanced();
        if (videoAdvanced && !viewMetadataVideoStalled) {
          drawMetadataOverlay(null);
        }
        scheduleMetadataOverlayFrame();
      });
    }

    function startMetadataOverlayTicker() {
      if (!viewMetadataPresentationLoopRunning) {
        viewMetadataPresentationLoopStartedAt = Date.now();
      }
      viewMetadataPresentationLoopRunning = true;
      scheduleMetadataVideoStallCheck();
      scheduleMetadataOverlayFrame();
    }

    function stopMetadataOverlayTicker() {
      viewMetadataPresentationLoopRunning = false;
      clearMetadataVideoStallTimer();
      if (viewMetadataOverlayTimer) {
        const video = $('viewWebRtcVideo');
        if (viewMetadataOverlayTimerKind === 'video-frame' && video && typeof video.cancelVideoFrameCallback === 'function') {
          video.cancelVideoFrameCallback(viewMetadataOverlayTimer);
        } else {
          window.cancelAnimationFrame(viewMetadataOverlayTimer);
        }
        viewMetadataOverlayTimer = null;
        viewMetadataOverlayTimerKind = '';
      }
    }

    async function metadataPayloadText(data) {
      if (typeof data === 'string') return data;
      if (data instanceof Blob) return await data.text();
      if (data instanceof ArrayBuffer) return new TextDecoder().decode(data);
      return String(data || '');
    }

    async function handleMetadataMessage(event) {
      let text = '';
      try {
        text = await metadataPayloadText(event.data);
        const parsed = JSON.parse(text);
        viewMetadataMessageCount += 1;
        viewMetadataLatestTimestampMs = Number(parsed.timestampMs || parsed.timestamp || parsed.pts || Date.now());
        viewMetadataTrackCount = Array.isArray(parsed.tracks) ? parsed.tracks.length : 0;
        viewMetadataEventCount = Array.isArray(parsed.events) ? parsed.events.length : 0;
        viewMetadataScenarioCount = Array.isArray(parsed.scenarios) ? parsed.scenarios.length : 0;
        viewMetadataParseError = '';
        viewMetadataLastJsonText = JSON.stringify(parsed, null, 2);
        viewMetadataLastMessageAt = Date.now();
        viewMetadataLatestPayload = parsed;
        bufferMetadataPayload(parsed);
        viewMetadataState = 'receiving';
        setText('viewConnectionMessage', `DataChannel '${viewMetadataLabel || 'va-metadata'}' 메타데이터 수신 중입니다.`);
        updateMetadataViewerPanel();
        scheduleMetadataStallCheck();
      } catch (error) {
        viewMetadataParseFailCount += 1;
        viewMetadataParseError = `JSON parse 실패: ${error.message}`;
        viewMetadataLastJsonText = text || '(empty message)';
        viewMetadataLastMessageAt = Date.now();
        updateMetadataViewerPanel();
      }
    }

    function attachMetadataDataChannel(channel) {
      viewMetadataChannel = channel;
      viewMetadataLabel = channel?.label || 'va-metadata';
      setMetadataChannelState(channel?.readyState === 'open' ? 'open' : 'connecting');
      if (!channel) return;
      channel.onopen = () => {
        setMetadataChannelState('open', `DataChannel '${viewMetadataLabel}' 연결됨. 메타데이터 수신을 기다리는 중입니다.`);
        scheduleMetadataStallCheck();
      };
      channel.onmessage = (event) => {
        handleMetadataMessage(event).catch((error) => {
          viewMetadataParseFailCount += 1;
          viewMetadataParseError = `메타데이터 처리 실패: ${error.message}`;
          updateMetadataViewerPanel();
        });
      };
      channel.onclose = () => {
        clearMetadataStallTimer();
        clearMetadataOverlay();
        setMetadataChannelState('closed', `DataChannel '${viewMetadataLabel}'이 닫혔습니다. 영상 연결은 별도로 유지됩니다.`);
      };
      channel.onerror = () => {
        clearMetadataOverlay();
        setMetadataChannelState('error', `DataChannel '${viewMetadataLabel}' 오류가 발생했습니다. 영상 연결은 별도로 유지됩니다.`);
      };
    }

    function viewConnectionStateLabel(state) {
      if (state === 'connecting') return '연결 중';
      if (state === 'playing') return '재생 중';
      if (state === 'stopped') return '중지됨';
      if (state === 'error') return '오류';
      return '대기';
    }

    function setViewPreviewUi(active) {
      const startButton = $('startViewPreviewBtn');
      const stopButton = $('stopViewPreviewBtn');
      const connecting = viewConnectionState === 'connecting';
      if (startButton) {
        startButton.textContent = active ? '다시 시작' : '보기 시작';
        startButton.disabled = connecting;
      }
      if (stopButton) stopButton.disabled = !active && !connecting;
    }

    function setViewConnectionState(state, message = '') {
      viewConnectionState = state || 'idle';
      const card = $('viewConnectionStateCard');
      if (card) {
        card.className = `viewer-status-card is-${viewConnectionState}`;
      }
      setText('viewConnectionStateText', viewConnectionStateLabel(viewConnectionState));
      if (message) {
        setText('viewConnectionMessage', message);
        viewPreviewStatus(message);
      }
      setViewPreviewUi(Boolean(viewTapId || viewWebRtcSessionId));
    }

    function buildViewParams() {
      const mode = selectedViewMode();
      if (mode === 'rule') {
        const id = $('viewVaRuleSelect')?.value || '';
        const params = new URLSearchParams();
        if (id) params.set('vaRule', id);
        return params;
      }
      const params = paramsFromSourceJson(sourceJsonFromControls('view'));
      if (mode === 'overlay') {
        applyBasicOverlayParams(params);
      } else if (mode === 'metadata') {
        applyBasicOverlayParams(params);
        params.set('renderVideoOverlay', '0');
        params.set('drawLabels', '0');
        params.set('trackIds', '0');
        params.set('trackTrails', '0');
        params.set('vaMetadata', '1');
        applyClientOverlayFallbackParam(params);
      }
      return params;
    }

    function buildRawViewParams() {
      if (selectedViewMode() === 'rule') {
        const rule = selectedViewVaRule();
        return paramsFromSourceJson(rule?.source || {});
      }
      return paramsFromSourceJson(sourceJsonFromControls('view'));
    }

    function buildRtspOverlayParams() {
      if (selectedViewMode() === 'rule') {
        const id = $('viewVaRuleSelect')?.value || '';
        const params = new URLSearchParams();
        if (id) params.set('vaRule', id);
        return params;
      }
      return applyBasicOverlayParams(buildRawViewParams());
    }

    function buildWebRtcMetadataParams() {
      const params = applyBasicOverlayParams(buildRawViewParams());
      params.set('renderVideoOverlay', '0');
      params.set('drawLabels', '0');
      params.set('trackIds', '0');
      params.set('trackTrails', '0');
      params.set('vaMetadata', '1');
      applyClientOverlayFallbackParam(params);
      return params;
    }

	    function buildMetadataSideChannelParams() {
	      if (selectedViewMode() === 'rule') {
	        const id = $('viewVaRuleSelect')?.value || '';
	        const params = new URLSearchParams();
	        if (id) params.set('vaRule', id);
	        params.set('intervalMs', '500');
	        params.set('maxMessageBytes', '65536');
	        return params;
	      }
	      const params = buildRawViewParams();
	      params.set('va', '1');
	      params.set('intervalMs', '500');
	      params.set('maxMessageBytes', '65536');
	      return params;
	    }

	    function websocketOriginFromHttpOrigin(origin) {
	      const value = String(origin || window.location.origin).replace(/\/+$/, '');
	      if (value.startsWith('https://')) return `wss://${value.slice('https://'.length)}`;
	      if (value.startsWith('http://')) return `ws://${value.slice('http://'.length)}`;
	      return `ws://${value.replace(/^\/+/, '')}`;
	    }

    function viewModeLabel(mode) {
      if (mode === 'overlay') return '영상 + VA 오버레이';
      if (mode === 'rule') return '영상 + VA 룰';
      if (mode === 'metadata') return 'WebRTC 메타데이터';
      return '실시간 스트리밍';
    }

    function updateViewModeUi() {
      const mode = selectedViewMode();
      const directFields = $('viewDirectSourceFields');
      const ruleFields = $('viewRuleFields');
      if (directFields) directFields.hidden = mode === 'rule';
      if (ruleFields) ruleFields.hidden = mode !== 'rule';
      if ($('metadataViewerPanel')) $('metadataViewerPanel').hidden = mode !== 'metadata';
      if ($('viewPreviewImage')) $('viewPreviewImage').hidden = mode === 'metadata';
      if ($('viewWebRtcStage')) $('viewWebRtcStage').hidden = mode !== 'metadata';
      if (mode !== 'metadata') clearMetadataOverlay();

      const source = sourceJsonFromControls('view');
      if ($('viewFileField')) $('viewFileField').hidden = mode === 'rule' || source.kind !== 'file';
      if ($('viewUrlField')) $('viewUrlField').hidden = mode === 'rule' || source.kind === 'file';

      const rule = selectedViewVaRule();
      if ($('viewRuleSourceSummary')) {
        $('viewRuleSourceSummary').textContent = rule
          ? `이 설정은 ${sourceLabel(rule.source || {})}에만 연결됩니다. URL에는 vaRule=${rule.id}만 사용합니다.`
          : '저장된 설정을 선택하면 연결된 영상 소스가 표시됩니다.';
      }
      const sourceSummary = mode === 'rule'
        ? (rule ? sourceLabel(rule.source || {}) : '저장된 설정 선택 필요')
        : sourceLabel(source);
      const modeHelp = mode === 'metadata'
        ? 'WebRTC 메타데이터는 simple signaling으로 영상을 재생하고 vaMetadata=1 DataChannel JSON 수신 상태를 확인합니다.'
        : (mode === 'rule'
        ? '영상 + VA 룰은 저장된 룰 ID만 선택합니다. 영상 소스는 해당 룰에 묶인 값으로 자동 고정됩니다.'
        : (mode === 'overlay'
          ? '영상 + VA 오버레이는 선택한 영상에 기본 객체 검출 overlay를 얹어 확인합니다.'
          : '실시간 스트리밍은 선택한 영상의 원본 프레임만 확인합니다.'));
      const bindingText = mode === 'rule'
        ? (rule ? `${viewModeLabel(mode)} · vaRule=${rule.id} · ${sourceLabel(rule.source || {})}` : `${viewModeLabel(mode)} · 설정 선택 필요`)
        : `${viewModeLabel(mode)} · ${sourceLabel(source)}`;
      if ($('viewBindingSummary')) $('viewBindingSummary').textContent = bindingText;
      setText('viewModeHelpText', modeHelp);
      setText('viewModeSummaryText', viewModeLabel(mode));
      setText('viewSourceSummaryText', sourceSummary);
      updateGeneratedUrls();
    }

    function updateGeneratedUrls() {
      const params = buildViewParams();
      const query = params.toString();
      const rawQuery = buildRawViewParams().toString();
      const rtspOverlayQuery = buildRtspOverlayParams().toString();
      const metadataQuery = buildWebRtcMetadataParams().toString();
      const sideChannelQuery = buildMetadataSideChannelParams().toString();
      const fallbackOrigin = window.location.origin;
      const baseInput = $('viewServerBaseUrl');
      const rtspInput = $('viewRtspAuthority');
      if (baseInput && !baseInput.value) {
        baseInput.value = fallbackOrigin;
      }
      if (rtspInput && !rtspInput.value) {
        rtspInput.value = `${window.location.hostname || '127.0.0.1'}:${serverDefaults.rtspPort || 8554}`;
      }
      const origin = String(baseInput?.value || fallbackOrigin).replace(/\/+$/, '');
      const rtspAuthority = String(rtspInput?.value || `${window.location.hostname || '127.0.0.1'}:${serverDefaults.rtspPort || 8554}`).replace(/^rtsp:\/\//, '').replace(/\/+$/, '');
      const route = String(serverDefaults.streamRoute || 'dhseo').replace(/^\/+/, '');
      const querySuffix = query ? `?${query}` : '';
      const rawQuerySuffix = rawQuery ? `?${rawQuery}` : '';
      const rtspOverlayQuerySuffix = rtspOverlayQuery ? `?${rtspOverlayQuery}` : '';
	      const metadataQuerySuffix = metadataQuery ? `?${metadataQuery}` : '';
	      const metadataSideChannelUrl = viewTapId
	        ? `${origin}/lab/analysis/taps/${encodeURIComponent(viewTapId)}/metadata/stream?intervalMs=500&maxMessageBytes=65536`
	        : `${origin}/lab/analysis/metadata/stream${sideChannelQuery ? `?${sideChannelQuery}` : ''}`;
	      const wsSideChannelQuery = viewTapId
	        ? `tapId=${encodeURIComponent(viewTapId)}&intervalMs=500&maxMessageBytes=65536`
	        : sideChannelQuery;
	      const webSocketSideChannelUrl = `${websocketOriginFromHttpOrigin(origin)}/ws/va-metadata${wsSideChannelQuery ? `?${wsSideChannelQuery}` : ''}`;
	      const rtspOverlayUrl = `rtsp://${rtspAuthority}/${route}${rtspOverlayQuerySuffix}`;
	      const rtspRawUrl = `rtsp://${rtspAuthority}/${route}${rawQuerySuffix}`;
	      if ($('viewWebRtcUrl')) $('viewWebRtcUrl').value = `${origin}/webrtc/session${querySuffix}`;
	      if ($('viewWebRtcMetadataUrl')) $('viewWebRtcMetadataUrl').value = `${origin}/webrtc/session${metadataQuerySuffix}`;
	      if ($('viewWhepUrl')) $('viewWhepUrl').value = `${origin}/whep${querySuffix}`;
	      if ($('viewRtspUrl')) $('viewRtspUrl').value = rtspOverlayUrl;
	      if ($('viewRtspRawUrl')) $('viewRtspRawUrl').value = rtspRawUrl;
	      if ($('viewMetadataSideChannelUrl')) $('viewMetadataSideChannelUrl').value = metadataSideChannelUrl;
	      if ($('viewWebSocketSideChannelUrl')) $('viewWebSocketSideChannelUrl').value = webSocketSideChannelUrl;
	      if ($('viewPairingRtspOverlayUrl')) $('viewPairingRtspOverlayUrl').value = rtspOverlayUrl;
	      if ($('viewPairingRtspRawUrl')) $('viewPairingRtspRawUrl').value = rtspRawUrl;
	      if ($('viewPairingMetadataSideChannelUrl')) $('viewPairingMetadataSideChannelUrl').value = metadataSideChannelUrl;
	      if ($('viewTapUrl')) $('viewTapUrl').value = `${origin}/lab/analysis/taps${querySuffix}`;
	    }

    function dashboardNumber(value, fallback = 0) {
      const number = Number(value);
      return Number.isFinite(number) ? number : fallback;
    }

    function dashboardFixed(value, digits = 1) {
      const number = dashboardNumber(value, 0);
      return number.toFixed(digits);
    }

    function dashboardMs(value) {
      return `${dashboardFixed(value, 1)}ms`;
    }

    function dashboardBytes(value) {
      const number = Number(value);
      if (!Number.isFinite(number) || number < 0) return '미제공';
      if (number >= 1024 * 1024) return `${(number / (1024 * 1024)).toFixed(1)}MiB`;
      if (number >= 1024) return `${(number / 1024).toFixed(1)}KiB`;
      return `${Math.round(number)}B`;
    }

    function dashboardSet(id, value) {
      setText(id, value === undefined || value === null || value === '' ? '-' : String(value));
    }

    function dashboardSetWithWarning(id, value, warning, warningText = 'warning') {
      const element = $(id);
      if (!element) return;
      element.textContent = '';
      element.appendChild(document.createTextNode(value === undefined || value === null || value === '' ? '-' : String(value)));
      if (warning) {
        const chip = dashboardChip(warningText, 'warning');
        chip.style.marginLeft = '6px';
        element.appendChild(chip);
      }
    }

    function dashboardOptionalNumber(payload, key) {
      if (!payload || !Object.prototype.hasOwnProperty.call(payload, key)) return null;
      const number = Number(payload[key]);
      return Number.isFinite(number) ? number : null;
    }

    async function dashboardFetchJson(path) {
      const response = await fetch(path, { cache: 'no-store' });
      if (!response.ok) throw new Error(`${path} HTTP ${response.status}`);
      return await response.json();
    }

    function renderDashboardRuleSelect() {
      const select = $('dashboardRuleSelect');
      if (!select) return;
      const previous = select.value;
      select.innerHTML = '';
      addOption(select, '', '전체 룰');
      for (const item of sortedVaRules()) {
        addOption(select, String(item.id), `#${item.id}${item.name ? ` · ${item.name}` : ''}`);
      }
      if (previous && Array.from(select.options).some((option) => option.value === previous)) {
        select.value = previous;
      }
    }

    function renderDashboardTapSelect(taps) {
      const select = $('dashboardTapSelect');
      if (!select) return '';
      const previous = dashboardLastTapId || select.value || '';
      const selectedRuleId = $('dashboardRuleSelect')?.value || '';
      const selectedRule = vaRules.find((item) => String(item.id) === String(selectedRuleId)) || null;
      select.innerHTML = '';
      addOption(select, '', selectedRuleId ? '선택 rule/source 대응 tap 없음' : 'active tap 없음');
      if (!Array.isArray(taps) || taps.length === 0) {
        dashboardLastTapId = '';
        return '';
      }
      for (const tap of taps) {
        addOption(select, tap.tapId || '', dashboardTapLabel(tap));
      }
      const options = Array.from(select.options).map((option) => option.value);
      let nextValue = '';
      if (selectedRuleId) {
        if (dashboardTapSelectionManual && options.includes(previous)) {
          nextValue = previous;
        }
        const matched = taps.find((tap) => String(tap?.profileSelection?.ruleId || tap?.selectedRuleId || '') === selectedRuleId);
        const sourceMatched = selectedRule
          ? taps.find((tap) => !dashboardTapRuleId(tap) && dashboardTapMatchesRuleSource(tap, selectedRule))
          : null;
        if (!nextValue) nextValue = matched?.tapId || sourceMatched?.tapId || '';
      } else {
        nextValue = options.includes(previous) && previous ? previous : (taps[0]?.tapId || '');
      }
      select.value = nextValue;
      dashboardLastTapId = nextValue;
      return nextValue;
    }

    function dashboardEventPostLabel(payload) {
      if (!payload) return '-';
      return `${payload.enabled ? 'on' : 'off'} · q ${payload.queueSize || 0}/${payload.maxQueueSize || 0} · sent ${payload.sentCount || 0} · fail ${payload.failedCount || 0}`;
    }

    function dashboardEventStorageLabel(payload) {
      if (!payload) return '-';
      return `${payload.enabled ? 'on' : 'off'} · q ${payload.queueSize || 0}/${payload.maxQueueSize || 0} · stored ${payload.storedCount || 0} · fail ${payload.failedCount || 0}`;
    }

    function dashboardPrettyJson(payload, fallback) {
      if (!payload) return fallback;
      try {
        return JSON.stringify(payload, null, 2);
      } catch (_) {
        return fallback;
      }
    }

    function dashboardDuration(value) {
      const number = Number(value);
      if (!Number.isFinite(number) || number <= 0) return '-';
      if (number >= 1000) {
        return `${(number / 1000).toFixed(number >= 10000 ? 0 : 1)}s`;
      }
      return `${Math.round(number)}ms`;
    }

    function dashboardTimestamp(value) {
      const number = Number(value);
      if (!Number.isFinite(number) || number <= 0) return '-';
      if (number > 1000000000000) {
        return new Date(number).toLocaleTimeString('ko-KR');
      }
      return `${Math.round(number)}ms`;
    }

    function dashboardConfidence(value) {
      const number = Number(value);
      if (!Number.isFinite(number) || number <= 0) return '-';
      return `${Math.round(number * 100)}%`;
    }

    function dashboardText(value, fallback = '-') {
      if (value === undefined || value === null || value === '') return fallback;
      return String(value);
    }

    function dashboardChip(label, state = 'muted') {
      const chip = document.createElement('span');
      chip.className = `status-chip is-${state}`;
      chip.textContent = label;
      return chip;
    }

    function dashboardSetEmptyRows(tbodyId, colspan, message) {
      const tbody = $(tbodyId);
      if (!tbody) return;
      tbody.textContent = '';
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.className = 'dashboard-empty-cell';
      cell.colSpan = colspan;
      cell.textContent = message;
      row.appendChild(cell);
      tbody.appendChild(row);
    }

    function dashboardAppendRow(tbodyId, cells) {
      const tbody = $(tbodyId);
      if (!tbody) return;
      const row = document.createElement('tr');
      for (const value of cells) {
        const cell = document.createElement('td');
        if (value instanceof Node) {
          cell.appendChild(value);
        } else {
          cell.textContent = dashboardText(value);
        }
        row.appendChild(cell);
      }
      tbody.appendChild(row);
    }

    function dashboardRowsStart(tbodyId) {
      const tbody = $(tbodyId);
      if (tbody) tbody.textContent = '';
      return tbody;
    }

    function dashboardResetTrendSamples() {
      dashboardTrendSamples = [];
    }

    function dashboardTrendNumber(value) {
      const number = Number(value);
      return Number.isFinite(number) ? number : null;
    }

    function dashboardTrendFormat(value, kind = 'count') {
      const number = dashboardTrendNumber(value);
      if (number === null) return '미제공';
      if (kind === 'bytes') return dashboardBytes(number);
      if (kind === 'ms') return dashboardMs(number);
      if (kind === 'ratio') return number.toFixed(2);
      if (Math.abs(number) < 10 && !Number.isInteger(number)) return number.toFixed(2);
      return String(Math.round(number));
    }

    function dashboardTrendDeltaLabel(delta, kind = 'count') {
      const number = dashboardTrendNumber(delta);
      if (number === null) return '미제공';
      if (number > 0) return `증가 +${dashboardTrendFormat(number, kind)}`;
      if (number < 0) return `감소 -${dashboardTrendFormat(Math.abs(number), kind)}`;
      return '유지';
    }

    function dashboardTrendStats(key) {
      const values = dashboardTrendSamples
        .map((sample) => ({ t: sample.t, value: dashboardTrendNumber(sample.values?.[key]) }))
        .filter((item) => item.value !== null);
      if (values.length === 0) return null;
      const first = values[0];
      const last = values[values.length - 1];
      let min = last.value;
      let max = last.value;
      for (const item of values) {
        min = Math.min(min, item.value);
        max = Math.max(max, item.value);
      }
      const durationMs = Math.max(0, last.t - first.t);
      const delta = last.value - first.value;
      return {
        count: values.length,
        current: last.value,
        delta,
        min,
        max,
        durationMs,
        ratePerSecond: durationMs > 0 ? delta / (durationMs / 1000) : 0
      };
    }

    function dashboardTrendWindowLabel() {
      if (dashboardTrendSamples.length === 0) return 'sample 없음';
      const first = dashboardTrendSamples[0];
      const last = dashboardTrendSamples[dashboardTrendSamples.length - 1];
      return `${dashboardTrendSamples.length}/${dashboardTrendMaxSamples} samples · ${dashboardDuration(last.t - first.t)}`;
    }

    function dashboardTrendChipList(items) {
      const wrapper = document.createElement('span');
      wrapper.style.display = 'inline-flex';
      wrapper.style.gap = '6px';
      wrapper.style.flexWrap = 'wrap';
      for (const item of items) {
        wrapper.appendChild(dashboardChip(item.label, item.state || 'muted'));
      }
      return wrapper;
    }

    function dashboardRenderWarningStrip(warnings) {
      const container = $('dashboardTrendWarnings');
      if (!container) return;
      container.textContent = '';
      if (!warnings.length) {
        container.appendChild(dashboardChip('warning 없음', 'active'));
        container.appendChild(dashboardChip('live observation 보조', 'muted'));
        return;
      }
      for (const warning of warnings.slice(0, 8)) {
        container.appendChild(dashboardChip(warning.label, warning.state || 'warning'));
      }
      if (warnings.length > 8) {
        container.appendChild(dashboardChip(`+${warnings.length - 8}`, 'warning'));
      }
    }

    function dashboardSideChannelTotal(sideChannel, keys) {
      let total = 0;
      let found = false;
      for (const key of keys) {
        const value = dashboardOptionalNumber(sideChannel, key);
        if (value === null) continue;
        total += value;
        found = true;
      }
      return found ? total : null;
    }

    function dashboardBuildTrendSample(payload, sampledAtMs = Date.now()) {
      const runtime = payload?.runtime || {};
      const webrtc = runtime.webrtcHttp || {};
      const metadata = webrtc.metadataDataChannel || {};
      const sideChannel = webrtc.metadataSideChannel || {};
      const debugCounters = runtime.debugCounters || {};
      const sessionManager = runtime.sessionManager || {};
      const analysisMatching = runtime.analysisMatching || {};
      const tapMetrics = payload?.tapMetrics || {};
      const tapState = tapMetrics.tapState || {};
      const queue = tapState.analyticsQueue || {};
      const sessions = Array.isArray(metadata.sessions) ? metadata.sessions : [];
      const counter = (key) => dashboardOptionalNumber(debugCounters, key);
      const metadataBuilds = counter('metadataJsonBuildCount');
      const metadataBytesTotal = counter('metadataJsonBytesTotal');
      const metadataBytesMax = counter('metadataJsonBytesMax');
      const metadataBytesAvg = metadataBuilds && metadataBuilds > 0 && metadataBytesTotal !== null
        ? metadataBytesTotal / metadataBuilds
        : null;
      const rtspEgressCreated = counter('rtspEgressSessionCreatedCount');
      const rtspEgressStarted = counter('rtspEgressSessionStartedCount');
      const rtspEgressStopped = counter('rtspEgressSessionStoppedCount');
      const rtspEgressDestroyed = counter('rtspEgressSessionDestroyedCount');
      const rtspConsumerResidual = Math.max(
        0,
        (rtspEgressCreated ?? 0) - (rtspEgressDestroyed ?? 0),
        (rtspEgressStarted ?? 0) - (rtspEgressStopped ?? 0)
      );
      const hardFlowErrors = (counter('rtspAppsrcFlowErrorReturnCount') ?? 0) +
        (counter('rtspAppsrcFlowNotLinkedCount') ?? 0) +
        (counter('rtspAppsrcFlowNotNegotiatedCount') ?? 0) +
        (counter('rtspAppsrcFlowOtherErrorCount') ?? 0);
      const fanoutResidual = Math.abs((counter('busWatchCreatedCount') ?? 0) - (counter('busWatchDestroyedCount') ?? 0)) +
        Math.abs((counter('overlayProbeAttachedCount') ?? 0) - (counter('overlayProbeRemovedCount') ?? 0)) +
        Math.abs((counter('sharedStreamSubscriberAddedCount') ?? 0) - (counter('sharedStreamSubscriberRemovedCount') ?? 0)) +
        Math.abs((counter('analysisTapAttachedCount') ?? 0) - (counter('analysisTapDetachedCount') ?? 0));
      const activeSessions = sessionManager.activeSessions || 0;
      const activeStreams = sessionManager.registryActiveStreams || sessionManager.resourceActiveStreams || 0;
      const activeTaps = analysisMatching.activeTapCount ?? payload?.tapsPayload?.activeTaps ?? 0;
      const activeSseClients = sideChannel.activeSseClients ?? 0;
      const activeWsClients = sideChannel.activeWebSocketClients ?? 0;
      const openDataChannels = sessions.filter((session) => session?.open).length;
      const metadataLastAgeMs = viewMetadataLastMessageAt > 0 ? sampledAtMs - viewMetadataLastMessageAt : null;
      const videoLastAgeMs = viewMetadataLastVideoFrameAt > 0 ? sampledAtMs - viewMetadataLastVideoFrameAt : null;
      const overlayDrawAgeMs = viewMetadataLastDrawAt > 0 ? sampledAtMs - viewMetadataLastDrawAt : null;
      return {
        t: sampledAtMs,
        tapId: dashboardLastTapId || '',
        values: {
          activeSessions,
          activeStreams,
          activeAnalysisTaps: activeTaps,
          activeSseClients,
          activeWsClients,
          openDataChannels,
          metadataSent: dashboardOptionalNumber(metadata, 'sentCount'),
          metadataDropped: dashboardOptionalNumber(metadata, 'droppedCount'),
          metadataFailures: dashboardOptionalNumber(metadata, 'sendFailureCount'),
          metadataBufferedDrop: dashboardOptionalNumber(metadata, 'bufferedDropCount'),
          metadataMaxBuffered: dashboardOptionalNumber(metadata, 'maxBufferedAmount'),
          metadataJsonBuildCount: metadataBuilds,
          metadataPayloadAvgBytes: metadataBytesAvg,
          metadataPayloadMaxBytes: metadataBytesMax,
          sideChannelSent: dashboardSideChannelTotal(sideChannel, ['sentCount', 'sseSentCount', 'webSocketSentCount', 'wsSentCount']),
          sideChannelDropped: dashboardSideChannelTotal(sideChannel, ['droppedCount', 'dropCount', 'sseDroppedCount', 'webSocketDroppedCount', 'wsDroppedCount']),
          sideChannelFailures: dashboardSideChannelTotal(sideChannel, ['failureCount', 'failedCount', 'sendFailureCount', 'sseFailureCount', 'webSocketFailureCount', 'wsFailureCount']),
          dashboardLocalPollingCount,
          queuePending: queue.pending ?? tapState.pendingFrames ?? null,
          queuePeak: queue.peakPending ?? tapState.peakPendingFrames ?? null,
          queueDrops: (queue.dropOldest ?? tapState.queueDroppedFrames ?? 0) +
            (queue.staleDrops ?? tapState.staleQueueDroppedFrames ?? 0),
          sampleDrops: (queue.sampleDrops ?? tapState.sampleDroppedFrames ?? 0) +
            (queue.sampleIntervalDrops ?? tapState.sampleIntervalDroppedFrames ?? 0),
          rtspPendingPeak: counter('rtspPendingQueuePeak'),
          rtspPendingResidual: (counter('rtspPendingQueueSizeAtStop') ?? 0) +
            (counter('rtspPendingQueueSizeAtDestroy') ?? 0),
          appsrcPushAfterStop: counter('appsrcPushAfterStopCount'),
          rtspHardFlowErrors: hardFlowErrors,
          rtspConsumerResidual,
          fanoutResidual,
          metadataLastAgeMs,
          videoLastAgeMs,
          overlayDrawAgeMs
        }
      };
    }

    function dashboardRecordTrendSample(payload) {
      const sample = dashboardBuildTrendSample(payload);
      dashboardTrendSamples.push(sample);
      while (dashboardTrendSamples.length > dashboardTrendMaxSamples) {
        dashboardTrendSamples.shift();
      }
      return sample;
    }

    function dashboardTrendWarnings(sample) {
      if (!sample) return [];
      const warnings = [];
      const values = sample.values || {};
      const metadataBuildStats = dashboardTrendStats('metadataJsonBuildCount');
      const viewerActive = Boolean(viewTapId || viewWebRtcSessionId ||
        ['playing', 'connecting'].includes(viewConnectionState));
      const dataChannelOpen = (values.openDataChannels || 0) > 0 || viewMetadataState === 'open';
      if (dataChannelOpen && values.metadataLastAgeMs === null) {
        warnings.push({ label: 'DataChannel open · metadata 미수신', state: 'warning' });
      } else if (dataChannelOpen && values.metadataLastAgeMs > 3000) {
        warnings.push({ label: `metadata stale ${dashboardDuration(values.metadataLastAgeMs)}`, state: 'warning' });
      }
      if (viewerActive && values.videoLastAgeMs !== null && values.videoLastAgeMs > 3000) {
        warnings.push({ label: `video frame stale ${dashboardDuration(values.videoLastAgeMs)}`, state: 'warning' });
      }
      if (dataChannelOpen && viewMetadataMessageCount > 0 && values.overlayDrawAgeMs !== null &&
          values.overlayDrawAgeMs > 3000) {
        warnings.push({ label: `overlay draw stale ${dashboardDuration(values.overlayDrawAgeMs)}`, state: 'warning' });
      }
      if ((values.activeSseClients || 0) + (values.activeWsClients || 0) > 0 &&
          metadataBuildStats && metadataBuildStats.durationMs >= 5000 &&
          metadataBuildStats.delta <= 0) {
        warnings.push({ label: 'SSE/WS metadata 정체', state: 'warning' });
      }
      const activeResidual = (values.activeSessions || 0) + (values.activeStreams || 0) +
        (values.activeAnalysisTaps || 0) + (values.activeSseClients || 0) +
        (values.activeWsClients || 0) + (values.rtspConsumerResidual || 0);
      const sinceViewStopMs = dashboardLastViewStopAt > 0 ? sample.t - dashboardLastViewStopAt : 0;
      if (!viewerActive && sinceViewStopMs > 10000 && activeResidual > 0) {
        warnings.push({ label: `보기 중지 후 active 잔류 ${activeResidual}`, state: 'warning' });
      }
      const sinceDashboardStopMs = dashboardLastDashboardStopAt > 0 ? sample.t - dashboardLastDashboardStopAt : 0;
      if (!viewerActive && sinceDashboardStopMs > 10000 && activeResidual > 0) {
        warnings.push({ label: `Dashboard inactive 후 active 잔류 ${activeResidual}`, state: 'warning' });
      }
      if ((values.rtspPendingResidual || 0) > 0) {
        warnings.push({ label: `RTSP pending 잔류 ${values.rtspPendingResidual}`, state: 'warning' });
      }
      if ((values.appsrcPushAfterStop || 0) > 0) {
        warnings.push({ label: `appsrc after stop ${values.appsrcPushAfterStop}`, state: 'warning' });
      }
      if ((values.rtspHardFlowErrors || 0) > 0) {
        warnings.push({ label: `RTSP hard flow ${values.rtspHardFlowErrors}`, state: 'warning' });
      }
      if ((values.metadataDropped || 0) > 0 || (values.metadataFailures || 0) > 0 ||
          (values.sideChannelDropped || 0) > 0 || (values.sideChannelFailures || 0) > 0) {
        warnings.push({ label: 'metadata drop/failure 관찰', state: 'warning' });
      }
      return warnings;
    }

    function dashboardTrendNote(config, stats, sample) {
      if (!stats) return dashboardChipList([{ label: '미제공', state: 'muted' }]);
      const chips = [];
      const delta = dashboardTrendNumber(stats.delta) ?? 0;
      const current = dashboardTrendNumber(stats.current) ?? 0;
      if (config.counter && delta > 0) chips.push({ label: `window +${dashboardTrendFormat(delta, config.kind)}`, state: 'active' });
      if (!config.counter && delta !== 0) chips.push({ label: delta > 0 ? '증가 중' : '감소 중', state: 'muted' });
      if (config.warnPositive && current > 0) chips.push({ label: 'warning', state: 'warning' });
      if (config.warnDelta && delta > 0) chips.push({ label: '증가 warning', state: 'warning' });
      if (config.key === 'metadataLastAgeMs' && current > 3000) chips.push({ label: 'stale', state: 'warning' });
      if (config.key === 'videoLastAgeMs' && current > 3000) chips.push({ label: 'video stale', state: 'warning' });
      if (config.key === 'overlayDrawAgeMs' && current > 3000) chips.push({ label: 'draw stale', state: 'warning' });
      if (config.key === 'queuePending' && stats.max > 0) chips.push({ label: `peak ${dashboardTrendFormat(stats.max)}`, state: 'muted' });
      if (config.key === 'dashboardLocalPollingCount') chips.push({ label: 'client local', state: 'muted' });
      if (!chips.length) chips.push({ label: '정상', state: 'active' });
      return dashboardTrendChipList(chips);
    }

    function renderDashboardTrend() {
      const sample = dashboardTrendSamples[dashboardTrendSamples.length - 1] || null;
      const warnings = dashboardTrendWarnings(sample);
      dashboardRenderWarningStrip(warnings);
      dashboardSet('dashboardTrendSampleCount', `${dashboardTrendSamples.length}/${dashboardTrendMaxSamples}`);
      dashboardSet(
        'dashboardTrendSummary',
        `${dashboardTrendWindowLabel()} · warning ${warnings.length} · Runtime Dashboard는 longrun report를 대체하지 않습니다`
      );
      const sessionStats = dashboardTrendStats('activeSessions');
      const streamStats = dashboardTrendStats('activeStreams');
      const tapStats = dashboardTrendStats('activeAnalysisTaps');
      dashboardSet(
        'dashboardTrendRuntimeDelta',
        sessionStats && streamStats && tapStats
          ? `S ${dashboardTrendDeltaLabel(sessionStats.delta)} · St ${dashboardTrendDeltaLabel(streamStats.delta)} · Tap ${dashboardTrendDeltaLabel(tapStats.delta)}`
          : '미제공'
      );
      const metadataAgeStats = dashboardTrendStats('metadataLastAgeMs');
      const staleWarning = metadataAgeStats && metadataAgeStats.current > 3000;
      dashboardSetWithWarning(
        'dashboardTrendStaleStatus',
        metadataAgeStats ? `metadata ${dashboardDuration(metadataAgeStats.current)}` : '미제공',
        staleWarning,
        'stale'
      );
      const cleanupResidual = sample ? (sample.values.activeSessions || 0) + (sample.values.activeStreams || 0) +
        (sample.values.activeAnalysisTaps || 0) + (sample.values.activeSseClients || 0) +
        (sample.values.activeWsClients || 0) + (sample.values.rtspConsumerResidual || 0) : null;
      dashboardSetWithWarning(
        'dashboardTrendCleanupStatus',
        cleanupResidual === null ? '미제공' : `active residual ${cleanupResidual}`,
        warnings.some((warning) => warning.label.includes('잔류') || warning.label.includes('pending') || warning.label.includes('appsrc')),
        'cleanup'
      );
      const rows = [
        { key: 'activeSessions', label: 'activeSessions', kind: 'count' },
        { key: 'activeStreams', label: 'activeStreams', kind: 'count' },
        { key: 'activeAnalysisTaps', label: 'activeAnalysisTaps', kind: 'count' },
        { key: 'activeSseClients', label: 'SSE clients', kind: 'count' },
        { key: 'activeWsClients', label: 'WS clients', kind: 'count' },
        { key: 'metadataSent', label: 'WebRTC metadata sent', kind: 'count', counter: true },
        { key: 'metadataDropped', label: 'WebRTC metadata dropped', kind: 'count', counter: true, warnDelta: true },
        { key: 'metadataFailures', label: 'WebRTC metadata failures', kind: 'count', counter: true, warnDelta: true },
        { key: 'metadataJsonBuildCount', label: 'metadataJsonBuildCount', kind: 'count', counter: true },
        { key: 'metadataPayloadAvgBytes', label: 'metadata payload avg', kind: 'bytes' },
        { key: 'metadataPayloadMaxBytes', label: 'metadata payload max', kind: 'bytes' },
        { key: 'dashboardLocalPollingCount', label: 'dashboard polling count', kind: 'count', counter: true },
        { key: 'queuePending', label: 'pending queue', kind: 'count' },
        { key: 'queuePeak', label: 'pending queue peak', kind: 'count' },
        { key: 'queueDrops', label: 'queue drops', kind: 'count', counter: true, warnDelta: true },
        { key: 'sampleDrops', label: 'sample drops', kind: 'count', counter: true, warnDelta: true },
        { key: 'rtspPendingResidual', label: 'RTSP pending stop/destroy', kind: 'count', warnPositive: true },
        { key: 'appsrcPushAfterStop', label: 'appsrcPushAfterStopCount', kind: 'count', counter: true, warnPositive: true },
        { key: 'rtspHardFlowErrors', label: 'RTSP hard flow errors', kind: 'count', counter: true, warnPositive: true },
        { key: 'rtspConsumerResidual', label: 'RTSP consumer residual', kind: 'count', warnPositive: true },
        { key: 'fanoutResidual', label: 'fanout residual', kind: 'count', warnPositive: true },
        { key: 'metadataLastAgeMs', label: 'metadata receive age', kind: 'ms' },
        { key: 'videoLastAgeMs', label: 'last video frame age', kind: 'ms' },
        { key: 'overlayDrawAgeMs', label: 'overlay draw age', kind: 'ms' },
      ];
      const tbody = dashboardRowsStart('dashboardTrendRows');
      if (!tbody || dashboardTrendSamples.length === 0) {
        dashboardSetEmptyRows('dashboardTrendRows', 5, 'Dashboard sample이 쌓이면 최근 trend가 표시됩니다.');
        return;
      }
      for (const row of rows) {
        const stats = dashboardTrendStats(row.key);
        dashboardAppendRow('dashboardTrendRows', [
          row.label,
          stats ? dashboardTrendFormat(stats.current, row.kind) : '미제공',
          stats && stats.count > 1 ? dashboardTrendDeltaLabel(stats.delta, row.kind) : 'sample 대기',
          stats ? `${dashboardTrendFormat(stats.min, row.kind)} / ${dashboardTrendFormat(stats.max, row.kind)}` : '미제공',
          dashboardTrendNote(row, stats, sample),
        ]);
      }
    }

    function dashboardDebugTracks(stateDump) {
      const tracks = stateDump?.debugState?.tracks;
      return Array.isArray(tracks) ? tracks : [];
    }

    function dashboardTrackZone(track) {
      return track?.zoneState?.currentZone || track?.currentZone || '-';
    }

    function dashboardTrackDwell(track) {
      return dashboardDuration(track?.zoneState?.dwellTimeMs ?? track?.dwellTimeMs);
    }

    function dashboardTrackHasZoneContext(track) {
      return Boolean(track && (track.zoneState || track.currentZone !== undefined || track.dwellTimeMs !== undefined));
    }

    function dashboardTrackZoneDisplay(track) {
      const zone = dashboardTrackZone(track);
      if (zone !== '-') return zone;
      return dashboardTrackHasZoneContext(track) ? '현재 track이 zone 내부에 없음' : 'zone context 없음';
    }

    function dashboardTrackDwellDisplay(track) {
      const dwell = dashboardTrackDwell(track);
      if (dwell !== '-') return dwell;
      return dashboardTrackHasZoneContext(track) ? '현재 track이 zone 내부에 없음' : 'zone context 없음';
    }

    function dashboardFirstDuration(...values) {
      for (const value of values) {
        const number = Number(value);
        if (Number.isFinite(number) && number > 0) {
          return dashboardDuration(number);
        }
      }
      return '-';
    }

    function dashboardScenarioElapsed(track) {
      const scenario = track?.scenarioState || track?.scenario || {};
      return dashboardFirstDuration(
        track?.scenarioElapsedMs,
        track?.phaseElapsedMs,
        track?.elapsedMs,
        scenario.elapsedMs,
        scenario.phaseElapsedMs,
        scenario.dwellTimeMs,
        track?.zoneState?.dwellTimeMs,
        track?.dwellTimeMs
      );
    }

    function dashboardScenarioCooldown(track) {
      const scenario = track?.scenarioState || track?.scenario || {};
      const cooldown = dashboardFirstDuration(
        track?.cooldownRemainingMs,
        track?.eventCooldownRemainingMs,
        scenario.cooldownRemainingMs,
        scenario.cooldownMs
      );
      if (cooldown !== '-') return cooldown;
      return track?.eventLifecycle || scenario.phase || '-';
    }

    function dashboardScenarioLineId(track) {
      const lineStates = Array.isArray(track?.lineStates) ? track.lineStates : [];
      const line = lineStates.find((item) => item?.lineId) || null;
      return track?.primaryLineId || line?.lineId || track?.lineId || '-';
    }

    function dashboardScenarioPhaseLabel(phase) {
      const raw = String(phase || '').trim();
      if (!raw) return '-';
      const normalized = raw.toLowerCase();
      const labels = {
        idle: 'Idle',
        candidate: 'Candidate',
        observing: 'Observing',
        confirmed: 'Confirmed',
        cooldown: 'Cooldown',
        ended: 'Ended',
        'line-crossed': 'Line crossed',
        'zone-entered': 'Zone entered',
      };
      return labels[normalized] || raw;
    }

    function dashboardScenarioPhaseTone(phase) {
      const normalized = String(phase || '').trim().toLowerCase();
      if (normalized === 'candidate' || normalized === 'line-crossed') return 'phase-candidate';
      if (normalized === 'observing' || normalized === 'zone-entered') return 'phase-observing';
      if (normalized === 'confirmed') return 'phase-confirmed';
      if (normalized === 'cooldown') return 'phase-cooldown';
      if (normalized === 'ended' || normalized === 'idle') return 'phase-ended';
      return 'scenario';
    }

    function dashboardScenarioPhaseChip(phase) {
      return dashboardChip(dashboardScenarioPhaseLabel(phase), dashboardScenarioPhaseTone(phase));
    }

    function dashboardTrackHealthChip(track) {
      const health = track?.trackHealth || {};
      const stable = health.stable !== false && health.status !== 'unstable';
      const label = stable ? 'stable' : 'unstable';
      return dashboardChip(label, stable ? 'active' : 'warning');
    }

	    function dashboardTrackById(tracks) {
	      const out = new Map();
	      for (const track of tracks) {
	        out.set(String(track?.trackId ?? ''), track);
	      }
	      return out;
	    }

	    function dashboardTapRuleId(tap) {
	      return tap?.profileSelection?.ruleId || tap?.selectedRuleId || tap?.ruleId || '';
	    }

	    function dashboardNormalizeSourceValue(value) {
	      return String(value || '').trim().replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/+$/, '');
	    }

	    function dashboardTapMatchesRuleSource(tap, rule) {
	      if (!tap || !rule) return false;
	      const source = rule.source || {};
	      const ruleKind = normalizedSourceKind(source.kind || 'file');
	      const tapKind = normalizedSourceKind(tap?.context?.sourceKind || tap?.sourceKind || ruleKind);
	      if (ruleKind && tapKind && ruleKind !== tapKind) return false;
	      const rawSourceValue = ruleKind === 'file'
	        ? (source.file || 'sample_h264.mp4')
	        : (source.url || '');
	      const sourceValue = dashboardNormalizeSourceValue(rawSourceValue);
	      if (!sourceValue) return false;
	      const streamKey = dashboardNormalizeSourceValue(tap.streamKey || '');
	      const expectedKey = `${ruleKind}::${sourceValue}`;
	      const legacyKey = `${ruleKind}:${sourceValue}`;
	      if (streamKey === expectedKey || streamKey === legacyKey || streamKey.endsWith(`::${sourceValue}`)) return true;
	      return streamKey.includes(sourceValue);
	    }

	    function dashboardTapLabel(tap) {
	      const ruleId = dashboardTapRuleId(tap);
	      const source = tap?.context?.sourceKind || tap?.sourceKind || '-';
	      const ruleText = ruleId ? `rule=${ruleId}` : 'rule 미연결';
	      return `${tap?.tapId || '<tap>'} · ${source} · ${ruleText}`;
	    }

	    function dashboardTapRuleMatchState(selectedTap, selectedRuleId, tapRuleId, rule = null) {
	      if (!selectedTap) {
	        return { label: 'active tap 없음', summary: 'active tap 없음' };
	      }
	      const tapId = selectedTap.tapId || '<tap>';
	      if (!tapRuleId) {
	        const relation = selectedRuleId && dashboardTapMatchesRuleSource(selectedTap, rule)
	          ? 'source 기반 tap · rule 매칭 없음'
	          : 'rule 미연결 분석 tap';
	        return { label: `${tapId} · ${relation}`, summary: relation };
	      }
	      if (!selectedRuleId || String(selectedRuleId) === String(tapRuleId)) {
	        return { label: `${tapId} · rule=${tapRuleId} · rule matched`, summary: 'rule matched' };
	      }
	      return { label: `${tapId} · rule=${tapRuleId} · rule mismatch`, summary: 'rule mismatch' };
	    }

	    function dashboardSelectedRuleContext(selectedTap) {
	      const selectedRuleId = $('dashboardRuleSelect')?.value || dashboardTapRuleId(selectedTap) || '';
	      const rule = vaRules.find((item) => String(item.id) === String(selectedRuleId)) || null;
	      return { selectedRuleId, rule, tapRuleId: dashboardTapRuleId(selectedTap) };
	    }

	    function dashboardRuleIdentity(rule, ruleId) {
	      if (rule) return `#${rule.id}${rule.name ? ` · ${rule.name}` : ''}`;
	      if (ruleId) return `#${ruleId} · 저장 rule 없음`;
	      return 'rule 선택 필요';
	    }

	    function dashboardRuleEventScenarioLabel(rule) {
	      if (!rule) return '-';
	      const scenarioType = rule?.scenario?.type || rule?.event?.type || 'presence';
	      const label = eventTypeLabel(scenarioType);
	      return vaRuleKind(rule) === 'scenario' ? `${label} · scenario` : `${label} · event`;
	    }

	    function dashboardRuleRegionSummary(rule) {
	      if (!rule) return '-';
	      const region = rule?.event?.region || {};
	      const points = Array.isArray(region.points) ? region.points.length : 0;
	      const parts = [region.type || 'polygon', `점 ${points}`];
	      if (region.name) parts.push(region.name);
	      if (region.direction) parts.push(lineDirectionLabel(region.direction));
	      const zones = Array.isArray(rule?.scenario?.restrictedZoneIds)
	        ? rule.scenario.restrictedZoneIds.filter(Boolean)
	        : [];
	      if (zones.length > 0) {
	        parts.push(`zones ${zones.slice(0, 3).join(', ')}${zones.length > 3 ? ` 외 ${zones.length - 3}` : ''}`);
	      }
	      return parts.join(' · ');
	    }

	    function dashboardEventLifecycleSummary(tapMetrics, stateDump) {
	      const eventState = tapMetrics?.metricsReport?.eventState || {};
	      const tracks = dashboardDebugTracks(stateDump);
	      const lifecycleCounts = new Map();
	      for (const track of tracks) {
	        const lifecycle = track?.eventLifecycle || '';
	        if (!lifecycle) continue;
	        lifecycleCounts.set(lifecycle, (lifecycleCounts.get(lifecycle) || 0) + 1);
	      }
	      const cooldownCount = Array.from(lifecycleCounts.entries()).reduce((count, [key, value]) => {
	          return String(key).includes('cooldown') ? count + value : count;
	      }, 0);
	      const eventStateCount = Number(eventState.eventStates ?? eventState.activeEventStates ?? 0);
	      if (lifecycleCounts.size === 0 && (!Number.isFinite(eventStateCount) || eventStateCount === 0)) {
	        return '아직 이벤트 lifecycle이 생성되지 않음';
	      }
	      const lifecycleText = Array.from(lifecycleCounts.entries())
	        .slice(0, 3)
	        .map(([key, value]) => `${key} ${value}`)
	        .join(' · ');
	      return [
	        `emitted ${eventState.eventsEmitted ?? 0}`,
	        `dedup ${eventState.eventsDeduped ?? 0}`,
	        `cooldown ${cooldownCount}`,
	        lifecycleText
	      ].filter(Boolean).join(' · ');
	    }

	    function dashboardRecentEventLabel(ruleId = '') {
	      const matched = dashboardRecentEvents.find((candidate) => {
	        return !ruleId || String(candidate?.event?.ruleId || '') === String(ruleId);
	      });
	      const item = matched || (ruleId ? null : dashboardRecentEvents[0]);
	      if (!item) return 'confirmed event 없음';
	      const event = item.event || {};
	      const object = event.object || {};
	      const trackText = object.trackId === undefined || object.trackId === null ? '-' : object.trackId;
	      return `${event.type || '-'} · track ${trackText} · ${item.zoneLine || '-'}`;
	    }

    function dashboardEventStatusLabel(event) {
      return event?.action?.post?.enabled ? 'post enabled' : 'local';
    }

    function dashboardFindScenarioRecentEvent(track, ruleId = '') {
      const trackId = String(track?.trackId ?? '');
      const scenarioName = String(track?.scenarioName || '').toLowerCase();
      return dashboardRecentEvents.find((candidate) => {
        const event = candidate?.event || {};
        const object = event.object || {};
        const sameTrack = trackId && String(object.trackId ?? '') === trackId;
        const sameRule = !ruleId || String(event.ruleId || '') === String(ruleId);
        const sameScenario = !scenarioName || String(event.type || '').toLowerCase() === scenarioName;
        return sameTrack && sameRule && sameScenario;
      }) || dashboardRecentEvents.find((candidate) => {
        const event = candidate?.event || {};
        const object = event.object || {};
        return trackId && String(object.trackId ?? '') === trackId;
      });
    }

    function dashboardScenarioEventEmittedChip(track, ruleId = '') {
      const matched = dashboardFindScenarioRecentEvent(track, ruleId);
      return dashboardChip(matched ? 'emitted' : 'not emitted', matched ? 'active' : 'muted');
    }

    function dashboardScenarioDedupLabel(eventState) {
      const deduped = Number(eventState?.eventsDeduped ?? 0);
      if (!Number.isFinite(deduped) || deduped <= 0) return 'dedup 0';
      return `dedup ${deduped}`;
    }

    function dashboardScenarioRecentEventLabel(track, ruleId = '') {
      const matched = dashboardFindScenarioRecentEvent(track, ruleId);
      if (!matched) return 'confirmed event 없음';
      const event = matched.event || {};
      const eventId = event.eventId || event.id || '';
      const parts = [
        eventId ? `id ${eventId}` : '',
        event.type || '-',
        event.status || dashboardEventStatusLabel(event),
      ].filter(Boolean);
      return parts.join(' · ');
    }

	    function renderDashboardVaRuleDebug({ selectedTap, tapMetrics, stateDump }) {
	      const { selectedRuleId, rule, tapRuleId } = dashboardSelectedRuleContext(selectedTap);
	      const hasTap = Boolean(selectedTap);
	      const tapMatch = dashboardTapRuleMatchState(selectedTap, selectedRuleId, tapRuleId, rule);
	      const summaryParts = [];
	      summaryParts.push(rule ? dashboardRuleIdentity(rule, selectedRuleId) : dashboardRuleIdentity(null, selectedRuleId));
	      summaryParts.push(hasTap ? `tap ${selectedTap.tapId || '-'}` : 'active tap 없음');
	      if (hasTap) summaryParts.push(tapMatch.summary);
	      dashboardSet('dashboardVaRuleDebugSummary', summaryParts.join(' · '));
	      dashboardSet('dashboardVaRuleIdentity', dashboardRuleIdentity(rule, selectedRuleId));
	      dashboardSet('dashboardVaRuleTapMatch', tapMatch.label);
	      dashboardSet('dashboardVaRuleSource', rule ? sourceLabel(rule.source || {}) : '-');
	      dashboardSet('dashboardVaRuleProfile', rule ? detectorLabel(rule.analysis?.profileId) : '-');
	      dashboardSet('dashboardVaRuleEventType', dashboardRuleEventScenarioLabel(rule));
	      dashboardSet('dashboardVaRuleRegion', dashboardRuleRegionSummary(rule));
	      dashboardSet('dashboardVaRuleLifecycle', hasTap ? dashboardEventLifecycleSummary(tapMetrics, stateDump) : 'active tap 없음');
	      dashboardSet('dashboardVaRuleRecentEvent', hasTap ? dashboardRecentEventLabel(selectedRuleId || tapRuleId) : 'confirmed event 없음');
	    }

	    function renderDashboardTracks(stateDump, tapMetrics) {
	      const tracks = dashboardDebugTracks(stateDump);
	      const reportTrackState = tapMetrics?.metricsReport?.trackState || {};
      const snapshotTrackState = tapMetrics?.trackState || {};
      const counts = {
        active: reportTrackState.activeTracks ?? snapshotTrackState.activeTracks ?? 0,
        lost: reportTrackState.lostTracks ?? snapshotTrackState.lostTracks ?? 0,
        reacquired: reportTrackState.reacquiredTracks ?? snapshotTrackState.reacquiredTracks ?? 0,
        terminated: reportTrackState.terminatedTracks ?? snapshotTrackState.terminatedTracks ?? 0,
      };
      dashboardSet('dashboardTracksSummary', `A/L/R/T ${counts.active}/${counts.lost}/${counts.reacquired}/${counts.terminated} · rows ${tracks.length}`);
      const tbody = dashboardRowsStart('dashboardTrackRows');
      if (!tbody || tracks.length === 0) {
        dashboardSetEmptyRows('dashboardTrackRows', 6, '현재 표시할 track이 없습니다.');
        return;
      }
      for (const track of tracks.slice(0, 100)) {
        const classText = `${dashboardText(track.className)} · ${dashboardConfidence(track.confidence)}`;
        dashboardAppendRow('dashboardTrackRows', [
          track.trackId ?? '-',
          classText,
          track.lifecycleState || '-',
          dashboardTrackZoneDisplay(track),
          dashboardTrackDwellDisplay(track),
          dashboardTrackHealthChip(track),
        ]);
      }
    }

    function dashboardScenarioEmptyReason(tracks, tapMetrics, selectedTap) {
      const { selectedRuleId, rule, tapRuleId } = dashboardSelectedRuleContext(selectedTap);
      if (!selectedTap) return 'active tap 없음';
      const matchState = dashboardTapRuleMatchState(selectedTap, selectedRuleId, tapRuleId, rule);
      if (selectedRuleId && !tapRuleId) return 'rule 매칭 없음';
      if (selectedRuleId && matchState.summary !== 'rule matched') return 'rule 매칭 없음';
      if (!tracks.length) return '조건을 만족한 track 없음';
      const scenarioState = tapMetrics?.metricsReport?.scenarioState || {};
      const activeCount = scenarioState.activeScenarios ?? 0;
      const hasZoneOrDwell = tracks.some((track) => {
        return dashboardTrackZone(track) !== '-' || dashboardTrackDwell(track) !== '-';
      });
      if (activeCount === 0 && !hasZoneOrDwell) return 'zone 조건 미충족';
      return '조건을 만족한 track 없음';
    }

    function renderDashboardScenarios(stateDump, tapMetrics, selectedTap) {
      const tracks = dashboardDebugTracks(stateDump);
      const scenarioRows = tracks.filter((track) => track?.scenarioName || track?.scenarioPhase);
      const scenarioState = tapMetrics?.metricsReport?.scenarioState || {};
      const activeCount = scenarioState.activeScenarios ?? stateDump?.debugState?.counts?.activeScenarios ?? scenarioRows.length;
      dashboardSet('dashboardScenariosSummary', `active ${activeCount} · rows ${scenarioRows.length}`);
      const tbody = dashboardRowsStart('dashboardScenarioRows');
      if (!tbody || scenarioRows.length === 0) {
        dashboardSetEmptyRows('dashboardScenarioRows', 6, dashboardScenarioEmptyReason(tracks, tapMetrics, selectedTap));
        return;
      }
      for (const track of scenarioRows.slice(0, 100)) {
        const lineId = track?.primaryLineId || track?.lineStates?.[0]?.lineId || '';
        const zoneLine = [dashboardTrackZone(track), lineId].filter((item) => item && item !== '-').join(' / ') ||
          dashboardTrackZoneDisplay(track);
        dashboardAppendRow('dashboardScenarioRows', [
          track.scenarioName || '-',
          dashboardScenarioPhaseChip(track.scenarioPhase),
          track.trackId ?? '-',
          zoneLine,
          dashboardScenarioElapsed(track),
          dashboardScenarioCooldown(track),
        ]);
      }
    }

    function renderDashboardScenarioTimeline(stateDump, tapMetrics, selectedTap) {
      const tracks = dashboardDebugTracks(stateDump);
      const scenarioRows = tracks.filter((track) => track?.scenarioName || track?.scenarioPhase);
      const eventState = tapMetrics?.metricsReport?.eventState || {};
      const scenarioState = tapMetrics?.metricsReport?.scenarioState || {};
      const { selectedRuleId, tapRuleId } = dashboardSelectedRuleContext(selectedTap);
      const ruleId = selectedRuleId || tapRuleId || '';
      dashboardSet(
        'dashboardScenarioTimelineSummary',
        `rows ${scenarioRows.length} · active ${scenarioState.activeScenarios ?? scenarioRows.length} · emitted ${eventState.eventsEmitted ?? 0} · dedup ${eventState.eventsDeduped ?? 0}`
      );
      const tbody = dashboardRowsStart('dashboardScenarioTimelineRows');
      if (!tbody || scenarioRows.length === 0) {
        dashboardSetEmptyRows('dashboardScenarioTimelineRows', 10, dashboardScenarioEmptyReason(tracks, tapMetrics, selectedTap));
        return;
      }
      for (const track of scenarioRows.slice(0, 100)) {
        dashboardAppendRow('dashboardScenarioTimelineRows', [
          track.scenarioName || '-',
          dashboardScenarioPhaseChip(track.scenarioPhase),
          track.trackId ?? '-',
          dashboardTrackZoneDisplay(track),
          dashboardScenarioLineId(track),
          dashboardScenarioElapsed(track),
          dashboardScenarioCooldown(track),
          dashboardScenarioEventEmittedChip(track, ruleId),
          dashboardScenarioDedupLabel(eventState),
          dashboardScenarioRecentEventLabel(track, ruleId),
        ]);
      }
    }

    function dashboardEventKey(tapId, event) {
      const object = event?.object || {};
      return [
        tapId || '-',
        event?.ruleId || '-',
        event?.type || '-',
        object.trackId ?? '-',
        object.label || '-',
      ].join('|');
    }

    function dashboardResetRecentEvents() {
      dashboardRecentEvents = [];
      dashboardRecentEventKeys = new Set();
    }

    function dashboardUpdateRecentEvents(tapId, events, trackMap) {
      if (!Array.isArray(events)) return;
      const now = Date.now();
      for (const event of events) {
        const key = dashboardEventKey(tapId, event);
        if (dashboardRecentEventKeys.has(key)) continue;
        const object = event?.object || {};
        const track = trackMap.get(String(object.trackId ?? ''));
        const lineId = track?.primaryLineId || track?.lineStates?.[0]?.lineId || '';
        const zoneLine = [dashboardTrackZone(track), lineId].filter((item) => item && item !== '-').join(' / ') || '-';
        dashboardRecentEventKeys.add(key);
        dashboardRecentEvents.unshift({ key, event, zoneLine, receivedAt: now });
      }
      while (dashboardRecentEvents.length > 25) {
        const removed = dashboardRecentEvents.pop();
        if (removed?.key) dashboardRecentEventKeys.delete(removed.key);
      }
    }

    function renderDashboardEvents(tapEvents, tapMetrics, stateDump, tapId) {
      const eventState = tapMetrics?.metricsReport?.eventState || {};
      const emitted = eventState.eventsEmitted ?? 0;
      const deduped = eventState.eventsDeduped ?? 0;
      const tracks = dashboardDebugTracks(stateDump);
      dashboardUpdateRecentEvents(tapId, tapEvents?.events, dashboardTrackById(tracks));
      dashboardSet('dashboardEventsSummary', `emitted ${emitted} · dedup ${deduped} · recent ${dashboardRecentEvents.length}`);
      const tbody = dashboardRowsStart('dashboardEventRows');
      if (!tbody || dashboardRecentEvents.length === 0) {
        dashboardSetEmptyRows('dashboardEventRows', 6, 'confirmed event 없음');
        return;
      }
      for (const item of dashboardRecentEvents) {
        const event = item.event || {};
        const object = event.object || {};
        const status = event?.action?.post?.enabled ? 'post enabled' : 'local';
        dashboardAppendRow('dashboardEventRows', [
          event.type || '-',
          object.trackId ?? '-',
          object.label || '-',
          event.ruleId || '-',
          item.zoneLine || '-',
          status,
        ]);
      }
    }

    function eventRecordFilterValue(id) {
      return String($(id)?.value || '').trim();
    }

    function eventRecordBuildQuery() {
      const params = new URLSearchParams();
      const mappings = [
        ['eventRecordEventTypeFilter', 'eventType'],
        ['eventRecordStreamIdFilter', 'streamId'],
        ['eventRecordChannelIdFilter', 'channelId'],
        ['eventRecordTrackIdFilter', 'trackId'],
        ['eventRecordScenarioNameFilter', 'scenarioName'],
        ['eventRecordStatusFilter', 'status'],
        ['eventRecordStartTimeFilter', 'startTimeMs'],
        ['eventRecordEndTimeFilter', 'endTimeMs'],
      ];
      for (const [id, key] of mappings) {
        const value = eventRecordFilterValue(id);
        if (value) params.set(key, value);
      }
      params.set('limit', eventRecordFilterValue('eventRecordLimitFilter') || '100');
      return params;
    }

    function eventRecordValue(record, ...keys) {
      for (const key of keys) {
        const value = record?.[key];
        if (value !== undefined && value !== null && value !== '') return value;
      }
      return '';
    }

    function eventRecordTimeLabel(record) {
      const timestamp = eventRecordValue(record, 'timestampMs', 'timestamp', 'startTime', 'startTimeMs');
      return dashboardTimestamp(timestamp);
    }

    function eventRecordPair(record, firstKey, secondKey) {
      const first = dashboardText(record?.[firstKey], '');
      const second = dashboardText(record?.[secondKey], '');
      return [first, second].filter(Boolean).join(' / ') || '-';
    }

    function eventRecordStatusNode(status) {
      const normalized = String(status || '').trim().toLowerCase();
      const tone = normalized === 'confirmed' ? 'active'
        : (normalized === 'failed' || normalized === 'error' ? 'warning' : 'muted');
      return dashboardChip(status || '-', tone);
    }

    function eventRecordPathNode(path) {
      const value = String(path || '').trim();
      if (!value) return '-';
      const isHttp = /^https?:\/\//i.test(value);
      const node = document.createElement(isHttp ? 'a' : 'span');
      node.className = 'event-record-path';
      node.textContent = value;
      node.title = value;
      if (isHttp) {
        node.href = value;
        node.target = '_blank';
        node.rel = 'noopener';
      }
      return node;
    }

    function eventRecordIdButton(record, index) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'event-record-id-button';
      button.textContent = eventRecordValue(record, 'eventId') || `<record ${index + 1}>`;
      button.addEventListener('click', () => selectEventRecordDetail(index));
      return button;
    }

    function selectEventRecordDetail(index) {
      eventRecordSelectedIndex = index;
      const record = eventRecordResults[index] || null;
      const pre = $('eventRecordDetailJson');
      if (pre) pre.textContent = record ? dashboardPrettyJson(record, 'EventRecord JSON 표시 실패') : 'eventId를 선택하면 원본 EventRecord JSON이 표시됩니다.';
      const drawer = $('eventRecordDetailDrawer');
      if (drawer && record) drawer.open = true;
      if (drawer && !record) drawer.open = false;
    }

    function eventRecordEmptyMessage(payload) {
      const storage = payload?.storage || {};
      if (storage.enabled === false) return 'EventRecord 저장 비활성 상태입니다.';
      if (storage.exists === false) return 'EventRecord 저장 파일이 아직 없습니다.';
      return '조건에 맞는 EventRecord가 없습니다.';
    }

    function renderEventRecordResults(payload) {
      const records = Array.isArray(payload?.records) ? payload.records : [];
      eventRecordResults = records;
      eventRecordSelectedIndex = -1;
      const storage = payload?.storage || {};
      const hasMoreText = payload?.hasMore ? 'hasMore 있음' : 'hasMore 없음';
      const corruptText = `corrupt skip ${payload?.skippedCorruptLines ?? 0}`;
      const storageText = `${storage.enabled ? 'storage on' : 'storage off'} · ${storage.exists ? 'file 있음' : 'file 없음'}`;
      dashboardSet('dashboardEventRecordsSummary', `records ${records.length} · limit ${payload?.limit ?? '-'} · ${hasMoreText}`);
      dashboardSet('eventRecordStateText', `${storageText} · ${corruptText}${payload?.truncated ? ' · truncated' : ''}`);
      const tbody = dashboardRowsStart('eventRecordRows');
      if (!tbody || records.length === 0) {
        dashboardSetEmptyRows('eventRecordRows', 11, eventRecordEmptyMessage(payload));
        selectEventRecordDetail(-1);
        return;
      }
      records.forEach((record, index) => {
        dashboardAppendRow('eventRecordRows', [
          eventRecordIdButton(record, index),
          eventRecordValue(record, 'eventType'),
          eventRecordTimeLabel(record),
          eventRecordStatusNode(eventRecordValue(record, 'status')),
          eventRecordPair(record, 'streamId', 'channelId'),
          eventRecordValue(record, 'trackId'),
          eventRecordValue(record, 'className'),
          eventRecordPair(record, 'zoneId', 'lineId'),
          eventRecordPair(record, 'scenarioName', 'scenarioPhase'),
          eventRecordPathNode(eventRecordValue(record, 'snapshotPath')),
          eventRecordPathNode(eventRecordValue(record, 'clipPath')),
        ]);
      });
      selectEventRecordDetail(0);
    }

    async function searchEventRecords() {
      if (eventRecordSearchInFlight) return;
      eventRecordSearchInFlight = true;
      const searchButton = $('eventRecordSearchBtn');
      if (searchButton) searchButton.disabled = true;
      const details = $('dashboardEventRecordsDetails');
      if (details) details.open = true;
      dashboardSet('dashboardEventRecordsSummary', '조회 중');
      dashboardSet('eventRecordStateText', 'EventRecord metadata 조회 중...');
      try {
        const params = eventRecordBuildQuery();
        const response = await fetch(`/lab/analysis/events/records?${params.toString()}`, { cache: 'no-store' });
        const text = await response.text();
        if (!response.ok) {
          throw new Error(text || `HTTP ${response.status}`);
        }
        const payload = JSON.parse(text);
        renderEventRecordResults(payload);
      } catch (error) {
        eventRecordResults = [];
        dashboardSet('dashboardEventRecordsSummary', '조회 실패');
        dashboardSet('eventRecordStateText', `조회 실패: ${error.message}`);
        dashboardSetEmptyRows('eventRecordRows', 11, 'EventRecord 조회 API 응답을 확인하세요.');
        selectEventRecordDetail(-1);
      } finally {
        eventRecordSearchInFlight = false;
        if (searchButton) searchButton.disabled = false;
      }
    }

    function renderDashboardMetadata(runtime, tapMetrics, tapsPayload) {
      const webrtc = runtime?.webrtcHttp || {};
      const metadata = webrtc.metadataDataChannel || {};
      const sideChannel = webrtc.metadataSideChannel || {};
      const debugCounters = runtime?.debugCounters || {};
      const sessionManager = runtime?.sessionManager || {};
      const analysisMatching = runtime?.analysisMatching || {};
      const tapState = tapMetrics?.tapState || {};
      const queue = tapState.analyticsQueue || {};
      const sessions = Array.isArray(metadata.sessions) ? metadata.sessions : [];
      const openSessions = sessions.filter((session) => session?.open).length;
      const activeSessions = sessionManager.activeSessions || 0;
      const activeStreams = sessionManager.registryActiveStreams || sessionManager.resourceActiveStreams || 0;
      const activeTaps = analysisMatching.activeTapCount ?? tapsPayload?.activeTaps ?? 0;
      const activeSseClients = sideChannel.activeSseClients ?? 0;
      const activeWsClients = sideChannel.activeWebSocketClients ?? 0;
      const noActiveRuntime = activeSessions === 0 && activeStreams === 0 && activeTaps === 0 &&
        activeSseClients === 0 && activeWsClients === 0;
      const maxLastBufferedAmount = sessions.reduce((maxValue, session) => {
        return Math.max(maxValue, dashboardNumber(session?.lastBufferedAmount, 0));
      }, 0);
      const maxObservedBufferedAmount = sessions.reduce((maxValue, session) => {
        return Math.max(maxValue, dashboardNumber(session?.maxBufferedAmount, 0));
      }, dashboardNumber(metadata.maxBufferedAmount, 0));

      const metadataSent = dashboardOptionalNumber(metadata, 'sentCount');
      const metadataDropped = dashboardOptionalNumber(metadata, 'droppedCount');
      const metadataSkipped = dashboardOptionalNumber(metadata, 'skippedCount');
      const metadataIntervalSkipped = dashboardOptionalNumber(metadata, 'intervalSkippedCount');
      const metadataOversizedDrop = dashboardOptionalNumber(metadata, 'oversizedDropCount');
      const metadataFailures = dashboardOptionalNumber(metadata, 'sendFailureCount');
      const metadataBufferedDrop = dashboardOptionalNumber(metadata, 'bufferedDropCount');
      const metadataMaxBuffered = dashboardOptionalNumber(metadata, 'maxBufferedAmount');

      const sideChannelCount = (keys) => {
        let total = 0;
        let found = false;
        for (const key of keys) {
          const value = dashboardOptionalNumber(sideChannel, key);
          if (value === null) continue;
          total += value;
          found = true;
        }
        return found ? total : null;
      };
      const sideChannelSent = sideChannelCount(['sentCount', 'sseSentCount', 'webSocketSentCount', 'wsSentCount']);
      const sideChannelDropped = sideChannelCount(['droppedCount', 'dropCount', 'sseDroppedCount', 'webSocketDroppedCount', 'wsDroppedCount']);
      const sideChannelFailures = sideChannelCount(['failureCount', 'failedCount', 'sendFailureCount', 'sseFailureCount', 'webSocketFailureCount', 'wsFailureCount']);

      const counter = (key) => dashboardOptionalNumber(debugCounters, key);
      const metadataBuilds = counter('metadataJsonBuildCount');
      const metadataBytesTotal = counter('metadataJsonBytesTotal');
      const metadataBytesMax = counter('metadataJsonBytesMax');
      const metadataBytesAvg = metadataBuilds && metadataBuilds > 0 && metadataBytesTotal !== null
        ? metadataBytesTotal / metadataBuilds
        : null;
      const rtspMediaConfigured = counter('rtspMediaConfiguredCount');
      const rtspMediaUnprepared = counter('rtspMediaUnpreparedCount');
      const rtspEgressCreated = counter('rtspEgressSessionCreatedCount');
      const rtspEgressStarted = counter('rtspEgressSessionStartedCount');
      const rtspEgressStopped = counter('rtspEgressSessionStoppedCount');
      const rtspEgressDestroyed = counter('rtspEgressSessionDestroyedCount');
      const rtspPendingPeak = counter('rtspPendingQueuePeak');
      const rtspPendingAtStop = counter('rtspPendingQueueSizeAtStop');
      const rtspPendingAtDestroy = counter('rtspPendingQueueSizeAtDestroy');
      const appsrcPushAfterStop = counter('appsrcPushAfterStopCount');
      const flowFlushing = counter('rtspAppsrcFlowFlushingCount');
      const flowError = counter('rtspAppsrcFlowErrorReturnCount');
      const flowNotLinked = counter('rtspAppsrcFlowNotLinkedCount');
      const flowNotNegotiated = counter('rtspAppsrcFlowNotNegotiatedCount');
      const flowOther = counter('rtspAppsrcFlowOtherErrorCount');
      const flowAfterStop = counter('rtspAppsrcFlowErrorAfterStopCount');
      const hardFlowErrors = (flowError ?? 0) + (flowNotLinked ?? 0) + (flowNotNegotiated ?? 0) + (flowOther ?? 0);
      const busCreated = counter('busWatchCreatedCount');
      const busDestroyed = counter('busWatchDestroyedCount');
      const probeAttached = counter('overlayProbeAttachedCount');
      const probeRemoved = counter('overlayProbeRemovedCount');
      const subscriberAdded = counter('sharedStreamSubscriberAddedCount');
      const subscriberRemoved = counter('sharedStreamSubscriberRemovedCount');
      const tapAttached = counter('analysisTapAttachedCount');
      const tapDetached = counter('analysisTapDetachedCount');
      const lifecycleWarning = noActiveRuntime && (
        (rtspMediaConfigured ?? 0) !== (rtspMediaUnprepared ?? 0) ||
        (rtspEgressCreated ?? 0) !== (rtspEgressDestroyed ?? 0) ||
        (rtspEgressStarted ?? 0) !== (rtspEgressStopped ?? 0)
      );
      const fanoutWarning = noActiveRuntime && (
        (busCreated ?? 0) !== (busDestroyed ?? 0) ||
        (probeAttached ?? 0) !== (probeRemoved ?? 0) ||
        (subscriberAdded ?? 0) !== (subscriberRemoved ?? 0) ||
        (tapAttached ?? 0) !== (tapDetached ?? 0)
      );
      const pendingResidual = (rtspPendingAtStop ?? 0) + (rtspPendingAtDestroy ?? 0);
      const cleanupIssues = [];
      if (pendingResidual > 0) cleanupIssues.push('pending residual');
      if ((appsrcPushAfterStop ?? 0) > 0) cleanupIssues.push('appsrc after stop');
      if (hardFlowErrors > 0) cleanupIssues.push('hard flow');
      if ((flowAfterStop ?? 0) > 0) cleanupIssues.push('flow after stop');
      if (metadataFailures !== null && metadataFailures > 0) cleanupIssues.push('metadata failure');
      if (lifecycleWarning || fanoutWarning) cleanupIssues.push('counter imbalance');

      dashboardSet('dashboardRuntimeMemoryWarning', 'RSS WARNING 해제 가능 후보 · active high-water 관찰 유지');
      dashboardSet('dashboardRuntimeRss', 'longrun report에서 확인');
      dashboardSet('dashboardRuntimeRssGuidance', 'RSS는 longrun report 기준으로 판단');
      dashboardSet(
        'dashboardBackpressureRuntime',
        `${activeSessions}/${activeStreams}/${activeTaps}`
      );
      dashboardSet('dashboardMetadataSessions', `${openSessions}/${sessions.length} open`);
      dashboardSet('dashboardMetadataSent', metadataSent ?? '미제공');
      dashboardSetWithWarning(
        'dashboardMetadataDropped',
        `${metadataDropped ?? '미제공'}/${metadataSkipped ?? '미제공'}`,
        (metadataDropped ?? 0) > 0
      );
      dashboardSetWithWarning(
        'dashboardMetadataSkipped',
        `${metadataIntervalSkipped ?? '미제공'}/${metadataOversizedDrop ?? '미제공'}`,
        (metadataOversizedDrop ?? 0) > 0
      );
      dashboardSetWithWarning('dashboardMetadataFailures', metadataFailures ?? '미제공', (metadataFailures ?? 0) > 0);
      dashboardSetWithWarning(
        'dashboardMetadataBuffered',
        `${metadataBufferedDrop ?? '미제공'}/${metadataMaxBuffered ?? '미제공'}`,
        (metadataBufferedDrop ?? 0) > 0
      );
      dashboardSet('dashboardMetadataBufferedObserved', `${maxLastBufferedAmount}/${maxObservedBufferedAmount}`);
      dashboardSet('dashboardMetadataSseClients', activeSseClients);
      dashboardSet('dashboardMetadataWsClients', activeWsClients);
      dashboardSetWithWarning(
        'dashboardSideChannelSentDropped',
        sideChannelSent === null && sideChannelDropped === null && sideChannelFailures === null
          ? '미제공'
          : `sent ${sideChannelSent ?? 0} · drop ${sideChannelDropped ?? 0} · fail ${sideChannelFailures ?? 0}`,
        (sideChannelDropped ?? 0) > 0 || (sideChannelFailures ?? 0) > 0
      );
      dashboardSet('dashboardMetadataJsonBuilds', metadataBuilds ?? '미제공');
      dashboardSet(
        'dashboardMetadataPayloadBytes',
        metadataBytesAvg === null || metadataBytesMax === null
          ? '미제공'
          : `avg ${dashboardBytes(metadataBytesAvg)} · max ${dashboardBytes(metadataBytesMax)}`
      );
      dashboardSet('dashboardPollingCount', dashboardOptionalNumber(runtime, 'dashboardPollingCount') ?? '미제공');
      dashboardSet(
        'dashboardBackpressureQueue',
        `${queue.pending ?? tapState.pendingFrames ?? 0}/${queue.capacity ?? tapState.maxQueueSize ?? 0}/${queue.peakPending ?? tapState.peakPendingFrames ?? 0}`
      );
      dashboardSet(
        'dashboardBackpressureQueueDrops',
        `${queue.dropOldest ?? tapState.queueDroppedFrames ?? 0}/${queue.staleDrops ?? tapState.staleQueueDroppedFrames ?? 0}`
      );
      dashboardSet(
        'dashboardBackpressureSampleDrops',
        `${queue.sampleDrops ?? tapState.sampleDroppedFrames ?? 0}/${queue.sampleIntervalDrops ?? tapState.sampleIntervalDroppedFrames ?? 0}`
      );
      dashboardSet(
        'dashboardBackpressureQueueWait',
        `last ${dashboardMs(queue.lastWaitMs ?? tapState.lastQueueWaitMs)} · avg ${dashboardMs(queue.averageWaitMs ?? tapState.averageQueueWaitMs)} · max ${dashboardMs(queue.maxWaitMs ?? tapState.maxQueueWaitMs)}`
      );
      dashboardSetWithWarning(
        'dashboardRtspLifecycle',
        rtspMediaConfigured === null && rtspEgressCreated === null
          ? '미제공'
          : `media ${rtspMediaConfigured ?? 0}/${rtspMediaUnprepared ?? 0} · egress ${rtspEgressCreated ?? 0}/${rtspEgressStarted ?? 0}/${rtspEgressStopped ?? 0}/${rtspEgressDestroyed ?? 0}`,
        lifecycleWarning
      );
      dashboardSet('dashboardRtspPendingPeak', rtspPendingPeak === null ? '미제공' : rtspPendingPeak);
      dashboardSetWithWarning(
        'dashboardRtspPendingResidual',
        rtspPendingAtStop === null && rtspPendingAtDestroy === null
          ? '미제공'
          : `stop ${rtspPendingAtStop ?? 0} · destroy ${rtspPendingAtDestroy ?? 0}`,
        pendingResidual > 0
      );
      dashboardSetWithWarning('dashboardAppsrcAfterStop', appsrcPushAfterStop ?? '미제공', (appsrcPushAfterStop ?? 0) > 0);
      dashboardSetWithWarning(
        'dashboardRtspFlowReturns',
        flowFlushing === null && flowError === null && flowNotLinked === null && flowNotNegotiated === null
          ? '미제공'
          : `FLUSHING ${flowFlushing ?? 0} · ERROR ${flowError ?? 0} · NOT_LINKED ${flowNotLinked ?? 0} · NOT_NEGOTIATED ${flowNotNegotiated ?? 0} · OTHER ${flowOther ?? 0}`,
        hardFlowErrors > 0
      );
      dashboardSetWithWarning(
        'dashboardFanoutBalance',
        busCreated === null && probeAttached === null && subscriberAdded === null && tapAttached === null
          ? '미제공'
          : `bus ${busCreated ?? 0}/${busDestroyed ?? 0} · probe ${probeAttached ?? 0}/${probeRemoved ?? 0} · sub ${subscriberAdded ?? 0}/${subscriberRemoved ?? 0} · tap ${tapAttached ?? 0}/${tapDetached ?? 0}`,
        fanoutWarning
      );
      dashboardSetWithWarning(
        'dashboardCleanupWarning',
        cleanupIssues.length > 0
          ? cleanupIssues.slice(0, 3).join(' · ')
          : (noActiveRuntime ? '정상' : 'active 관찰 중'),
        cleanupIssues.length > 0,
        'cleanup warning'
      );
      const viewerHasMetadata = viewMetadataMessageCount > 0 || viewMetadataStaleCount > 0 || viewMetadataFallbackHiddenCount > 0;
      dashboardSet('dashboardMetadataStale', viewerHasMetadata ? `${viewMetadataStaleCount}/${viewMetadataBufferDropCount}` : '미제공');
      dashboardSet('dashboardMetadataFallback', viewerHasMetadata ? viewMetadataFallbackHiddenCount : '미제공');
      dashboardSet(
        'dashboardMetadataSummary',
        `RSS는 longrun report 기준으로 판단 · runtime ${activeSessions}/${activeStreams}/${activeTaps} · datachannel ${openSessions}/${sessions.length} open · queue ${queue.pending ?? tapState.pendingFrames ?? 0}/${queue.capacity ?? tapState.maxQueueSize ?? 0}/${queue.peakPending ?? tapState.peakPendingFrames ?? 0}`
      );
    }

    function dashboardGuardModeLabel(guard = null) {
      const mode = String(guard?.mode || 'off').toLowerCase();
      if (mode === 'diagnostic') return '진단 전용';
      if (mode === 'enforce') return '보정 적용';
      return 'guard off';
    }

    function dashboardOptionalFixed(value, digits = 2) {
      const number = Number(value);
      return Number.isFinite(number) ? number.toFixed(digits) : '미제공';
    }

    function dashboardNormalizedDistance(value) {
      const number = Number(value);
      if (!Number.isFinite(number)) return '미제공';
      return number >= 0.01 ? number.toFixed(3) : number.toFixed(4);
    }

    function dashboardCloseObjectIssueLabel(diagnostic) {
      const labels = [];
      const risk = Number(diagnostic?.closeObjectRisk);
      const margin = Number(diagnostic?.scoreMargin);
      const centerJump = Number(diagnostic?.centerJump);
      if (diagnostic?.wouldHoldReacquire === true) labels.push('근접 객체 재획득 후보(close-object reacquire candidate)');
      if (Number.isFinite(risk) && risk >= 0.25) labels.push('근접 객체 위험(close-object-risk)');
      if (Number.isFinite(margin) && margin <= 0.08) labels.push('낮은 score margin(low-margin-association)');
      if (Number.isFinite(centerJump) && centerJump >= 0.08) labels.push('center jump 위험(center-jump-risk)');
      if (diagnostic?.directionConflict === true) labels.push('방향 충돌(direction-conflict)');
      if (!labels.length) labels.push('close-object 관찰');
      return labels.join(' · ');
    }

    function dashboardCloseObjectSeverity(diagnostic) {
      const risk = Number(diagnostic?.closeObjectRisk);
      if (diagnostic?.wouldHoldReacquire === true || diagnostic?.wouldPenalize === true ||
          (Number.isFinite(risk) && risk >= 0.45)) {
        return 'warning';
      }
      return 'watch';
    }

    function dashboardTrackHealthById(stateDump) {
      const map = new Map();
      for (const track of dashboardDebugTracks(stateDump)) {
        const trackId = Number(track?.trackId || 0);
        if (trackId > 0) map.set(trackId, track);
      }
      return map;
    }

    function dashboardCloseObjectIssueRows(tapMetrics, stateDump) {
      const diagnostics = Array.isArray(tapMetrics?.closeObjectDiagnostics) ? tapMetrics.closeObjectDiagnostics : [];
      const guard = tapMetrics?.closeObjectGuard || {};
      const guardLabel = dashboardGuardModeLabel(guard);
      const trackById = dashboardTrackHealthById(stateDump);
      return diagnostics.slice(0, 64).map((diagnostic) => {
        const trackId = Number(diagnostic?.trackId || 0);
        const track = trackById.get(trackId) || {};
        const health = track.trackHealth || {};
        const lost = health.lostCount ?? track.lostCount;
        const reacquired = health.reacquiredCount ?? track.reacquiredCount;
        const details = [
          `${guardLabel}`,
          `risk ${dashboardOptionalFixed(diagnostic?.closeObjectRisk)}`,
          `margin ${dashboardOptionalFixed(diagnostic?.scoreMargin)}`,
          `jump ${dashboardNormalizedDistance(diagnostic?.centerJump)}`,
          `assoc ${dashboardConfidence(health.associationConfidence ?? track.associationConfidence)}`,
          `overlap ${dashboardOptionalFixed(health.overlapRisk ?? track.overlapRisk)}`,
          `missed ${health.missedFrameCount ?? track.missedFrameCount ?? '미제공'}`,
          `lost/reacq ${lost ?? '미제공'}/${reacquired ?? '미제공'}`,
          `direction ${health.directionChangeCount ?? track.directionChangeCount ?? '미제공'}`,
          `decision ${diagnostic?.guardDecision || '미제공'}`
        ];
        return {
          type: dashboardCloseObjectIssueLabel(diagnostic),
          trackId: trackId || '-',
          className: diagnostic?.className || track.className || '-',
          severity: dashboardCloseObjectSeverity(diagnostic),
          timestampMs: tapMetrics?.metricsReport?.timestampMs,
          healthText: details.join(' · ')
        };
      });
    }

    function renderDashboardIssues(tapMetrics, stateDump) {
      const report = tapMetrics?.trackingIssueReport || {};
      const issues = Array.isArray(report.issues) ? report.issues : [];
      const closeObjectIssues = dashboardCloseObjectIssueRows(tapMetrics, stateDump);
      const guardLabel = dashboardGuardModeLabel(tapMetrics?.closeObjectGuard);
      dashboardSet(
        'dashboardIssuesSummary',
        `total ${(report.totalIssues ?? issues.length) + closeObjectIssues.length} · retained ${(report.retainedIssues ?? issues.length) + closeObjectIssues.length} · close-object ${closeObjectIssues.length} · ${guardLabel} · rate-limited ${report.rateLimitedCount ?? 0}`
      );
      const tbody = dashboardRowsStart('dashboardIssueRows');
      if (!tbody || (issues.length === 0 && closeObjectIssues.length === 0)) {
        dashboardSetEmptyRows('dashboardIssueRows', 6, `tracking issue가 없습니다. · ${guardLabel}`);
        return;
      }
      for (const issue of issues.slice(0, 100)) {
        const health = issue.trackHealth || {};
        const healthText = [
          `assoc ${dashboardConfidence(health.associationConfidence)}`,
          `overlap ${dashboardOptionalFixed(health.overlapRisk)}`,
          `missed ${health.missedFrameCount ?? 0}`,
          `lost/reacq ${health.lostCount ?? '미제공'}/${health.reacquiredCount ?? '미제공'}`,
          `direction ${health.directionChangeCount ?? '미제공'}`,
          guardLabel
        ].join(' · ');
        dashboardAppendRow('dashboardIssueRows', [
          issue.type || '-',
          issue.trackId ?? '-',
          issue.className || '-',
          dashboardChip(issue.severity || '-', issue.severity === 'warning' ? 'warning' : 'muted'),
          dashboardTimestamp(issue.timestampMs),
          healthText,
        ]);
      }
      for (const issue of closeObjectIssues.slice(0, Math.max(0, 100 - issues.length))) {
        dashboardAppendRow('dashboardIssueRows', [
          issue.type,
          issue.trackId,
          issue.className,
          dashboardChip(issue.severity, issue.severity === 'warning' ? 'warning' : 'muted'),
          dashboardTimestamp(issue.timestampMs),
          issue.healthText,
        ]);
      }
    }

    function renderDashboard(payload) {
      dashboardLastPayload = payload;
      const runtime = payload?.runtime || {};
      const tapsPayload = payload?.tapsPayload || {};
      const tapMetrics = payload?.tapMetrics || null;
      const stateDump = payload?.stateDump || null;
      const tapEvents = payload?.tapEvents || null;
      const selectedTap = payload?.selectedTap || null;
      const sessionManager = runtime.sessionManager || {};
      const analysisMatching = runtime.analysisMatching || {};
      const tapState = tapMetrics?.tapState || selectedTap || {};
      const snapshotTrackState = selectedTap?.analyticsState?.trackState || {};
      const trackState = tapMetrics?.trackState || snapshotTrackState || {};
      const metricsReport = tapMetrics?.metricsReport || {};
      const reportTrackState = metricsReport.trackState || {};
      const scenarioState = metricsReport.scenarioState || {};
      const eventState = metricsReport.eventState || {};
      const trackHealth = metricsReport.trackHealth || {};
      const debugCounts = stateDump?.debugState?.counts || {};

      dashboardSet('dashboardSourceKind', selectedTap?.context?.sourceKind || selectedTap?.sourceKind || '-');
      dashboardSet('dashboardActiveSessions', sessionManager.activeSessions || 0);
      dashboardSet('dashboardActiveStreams', sessionManager.registryActiveStreams || sessionManager.resourceActiveStreams || 0);
      dashboardSet('dashboardActiveTaps', analysisMatching.activeTapCount ?? tapsPayload.activeTaps ?? 0);
      dashboardSet('dashboardDecodedFps', dashboardFixed(tapState.effectiveDecodedFps));
      dashboardSet('dashboardSampledFps', dashboardFixed(tapState.effectiveSampledFps));
      dashboardSet('dashboardAnalyzedFps', dashboardFixed(tapState.effectiveAnalyzedFps));
      dashboardSet('dashboardQueueSummary', `${tapState.analyticsQueue?.pending ?? tapState.pendingFrames ?? 0}/${tapState.analyticsQueue?.capacity ?? tapState.maxQueueSize ?? 0}/${tapState.analyticsQueue?.peakPending ?? tapState.peakPendingFrames ?? 0}`);
      dashboardSet('dashboardInferenceLatency', `last ${dashboardMs(tapState.lastInferenceMs)} · avg ${dashboardMs(tapState.averageInferenceMs)} · max ${dashboardMs(tapState.maxInferenceMs)}`);
      dashboardSet(
        'dashboardTrackCounts',
        `${reportTrackState.activeTracks ?? trackState.activeTracks ?? 0}/${reportTrackState.lostTracks ?? trackState.lostTracks ?? 0}/${reportTrackState.reacquiredTracks ?? trackState.reacquiredTracks ?? 0}/${reportTrackState.terminatedTracks ?? trackState.terminatedTracks ?? 0}`
      );
      dashboardSet('dashboardScenarioCount', scenarioState.activeScenarios ?? debugCounts.scenarioInstances ?? 0);
      dashboardSet('dashboardEventCounts', `${eventState.eventsEmitted ?? 0}/${eventState.eventsDeduped ?? 0}`);
      dashboardSet('dashboardUnstableCount', trackHealth.unstableTrackCount ?? 0);
      dashboardSet('dashboardOverlapRiskCount', trackHealth.overlapRiskTrackCount ?? 0);
      dashboardSet('dashboardEventPostStatus', dashboardEventPostLabel(payload?.eventPost));
      dashboardSet('dashboardEventStorageStatus', dashboardEventStorageLabel(payload?.eventStorage));
      dashboardSet('dashboardStatusText', `마지막 갱신 ${new Date().toLocaleTimeString('ko-KR')} · tap ${dashboardLastTapId || '-'}`);
      dashboardSet('dashboardOverviewSummary', selectedTap ? `${selectedTap.tapId || '-'} · ${selectedTap.streamKey || '-'}` : '선택된 tap 없음');
	      renderDashboardEvents(tapEvents, tapMetrics, stateDump, dashboardLastTapId);
	      renderDashboardVaRuleDebug({ selectedTap, tapMetrics, stateDump });
	      renderDashboardTracks(stateDump, tapMetrics);
	      renderDashboardScenarios(stateDump, tapMetrics, selectedTap);
	      renderDashboardScenarioTimeline(stateDump, tapMetrics, selectedTap);
	      renderDashboardMetadata(runtime, tapMetrics, tapsPayload);
	      renderDashboardTrend();
	      renderDashboardIssues(tapMetrics, stateDump);
      const statePre = $('dashboardStateDumpJson');
      if (statePre) statePre.textContent = dashboardPrettyJson(stateDump, 'tap을 선택하면 상태 덤프가 표시됩니다.');
      const issuePre = $('dashboardTrackingIssueReport');
      if (issuePre) {
        const closeObjectRaw = tapMetrics
          ? {
              trackingIssueReport: tapMetrics.trackingIssueReport || null,
              closeObjectGuard: tapMetrics.closeObjectGuard || { mode: 'off', label: 'guard off' },
              closeObjectDiagnostics: Array.isArray(tapMetrics.closeObjectDiagnostics)
                ? tapMetrics.closeObjectDiagnostics
                : []
            }
          : null;
        issuePre.textContent = dashboardPrettyJson(closeObjectRaw, 'tracking issue report 없음');
      }
    }

    async function refreshDashboard(options = {}) {
      if (!options.force && !dashboardActive) return;
      const now = Date.now();
      if (!options.force && now - dashboardLastRefreshAt < 1000) return;
      if (dashboardRefreshInFlight) return;
      dashboardRefreshInFlight = true;
      dashboardLastRefreshAt = now;
      dashboardLocalPollingCount += 1;
      try {
        dashboardSet('dashboardStatusText', '갱신 중...');
        const [runtime, tapsPayload, eventPost, eventStorage] = await Promise.all([
          dashboardFetchJson('/lab/runtime/status'),
          dashboardFetchJson('/lab/analysis/taps'),
          dashboardFetchJson('/lab/analysis/event-post/status'),
          dashboardFetchJson('/lab/analysis/event-storage/status')
        ]);
        const taps = Array.isArray(tapsPayload.taps) ? tapsPayload.taps : [];
        const previousTapId = dashboardLastTapId;
        const tapId = renderDashboardTapSelect(taps);
        let tapMetrics = null;
        let stateDump = null;
        let tapEvents = null;
        let selectedTap = taps.find((tap) => tap.tapId === tapId) || null;
        if (tapId !== previousTapId) {
          dashboardResetRecentEvents();
          dashboardResetTrendSamples();
        }
        if (tapId) {
          [tapMetrics, stateDump, tapEvents] = await Promise.all([
            dashboardFetchJson(`/lab/analysis/taps/${encodeURIComponent(tapId)}/metrics`),
            dashboardFetchJson(`/lab/analysis/taps/${encodeURIComponent(tapId)}/state-dump`),
            dashboardFetchJson(`/lab/analysis/taps/${encodeURIComponent(tapId)}/events`).catch(() => null)
          ]);
        }
        const payload = { runtime, tapsPayload, eventPost, eventStorage, tapMetrics, stateDump, tapEvents, selectedTap };
        dashboardRecordTrendSample(payload);
        renderDashboard(payload);
      } catch (error) {
        dashboardSet('dashboardStatusText', `갱신 실패: ${error.message}`);
      } finally {
        dashboardRefreshInFlight = false;
      }
    }

    function stopDashboardPolling(options = {}) {
      if (dashboardTimer) {
        clearInterval(dashboardTimer);
        dashboardTimer = null;
      }
      if (options.recordInactive) {
        dashboardLastDashboardStopAt = Date.now();
      }
    }

    function startDashboardPolling() {
      stopDashboardPolling();
      if (!dashboardActive) return;
      const autoRefresh = $('dashboardAutoRefreshInput')?.checked !== false;
      const rawIntervalMs = dashboardNumber($('dashboardRefreshInterval')?.value, 5000);
      const intervalMs = rawIntervalMs <= 0 ? 0 : Math.max(2000, rawIntervalMs);
      refreshDashboard({ force: true }).catch(() => {});
      if (autoRefresh && intervalMs > 0) {
        dashboardTimer = setInterval(() => {
          refreshDashboard().catch(() => {});
        }, intervalMs);
      }
    }

    async function copyGeneratedUrl(targetId, button = null) {
      const field = $(targetId);
      const value = String(field?.value || '').trim();
      if (!value) {
        showFeedback('복사할 URL이 없습니다.', 'error');
        return;
      }
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(value);
        } else {
          field.focus();
          field.select();
          if (!document.execCommand('copy')) {
            throw new Error('clipboard fallback failed');
          }
        }
        showFeedback('요청 URL을 복사했습니다.');
        if (button) {
          const previous = button.textContent;
          button.textContent = '복사됨';
          setTimeout(() => { button.textContent = previous || '복사'; }, 1200);
        }
      } catch (error) {
        showFeedback('브라우저가 클립보드 복사를 막았습니다. URL을 직접 선택해 복사하세요.', 'error');
      }
    }

    async function pollViewWebRtcIce() {
      if (!viewWebRtcSessionId || !viewWebRtcPeer) return;
      const response = await fetch(`/webrtc/session/${encodeURIComponent(viewWebRtcSessionId)}/ice`).catch(() => null);
      if (!response || !response.ok) return;
      const payload = await response.json();
      const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
      for (const item of candidates) {
        try {
          await viewWebRtcPeer.addIceCandidate(item);
        } catch (_) {
        }
      }
      if (candidates.length > 0) {
        viewWebRtcEmptyIcePolls = 0;
      } else if (viewWebRtcPeer && ['connected', 'completed'].includes(viewWebRtcPeer.iceConnectionState || '')) {
        viewWebRtcEmptyIcePolls += 1;
        if (viewWebRtcEmptyIcePolls >= 3 && viewWebRtcIceTimer) {
          clearInterval(viewWebRtcIceTimer);
          viewWebRtcIceTimer = null;
        }
      }
    }

    async function closeViewWebRtcSession() {
      clearMetadataStallTimer();
      clearViewWebRtcAutoRestartTimer();
      if (viewWebRtcIceTimer) {
        clearInterval(viewWebRtcIceTimer);
        viewWebRtcIceTimer = null;
      }
      if (viewMetadataChannel) {
        try {
          viewMetadataChannel.onopen = null;
          viewMetadataChannel.onmessage = null;
          viewMetadataChannel.onclose = null;
          viewMetadataChannel.onerror = null;
          viewMetadataChannel.close();
        } catch (_) {
        }
      }
      viewMetadataChannel = null;
      if (viewWebRtcPeer) {
        try {
          viewWebRtcPeer.close();
        } catch (_) {
        }
      }
      viewWebRtcPeer = null;
      const sessionId = viewWebRtcSessionId;
      viewWebRtcSessionId = '';
      viewWebRtcEmptyIcePolls = 0;
      stopMetadataOverlayTicker();
      const video = $('viewWebRtcVideo');
      if (video) {
        if (video.srcObject) {
          for (const track of video.srcObject.getTracks()) {
            track.stop();
          }
        }
        video.srcObject = null;
      }
      if (sessionId) {
        await fetch(`/webrtc/session/${encodeURIComponent(sessionId)}`, { method: 'DELETE' }).catch(() => {});
      }
      clearMetadataOverlay();
    }

    function scheduleViewWebRtcReplayRestart(pc) {
      if (pc !== viewWebRtcPeer || !viewWebRtcSessionId || !isMetadataViewMode()) return;
      if (viewWebRtcAutoRestartTimer) return;
      setViewConnectionState('connecting', '파일 끝에 도달해 WebRTC 메타데이터 보기를 처음부터 다시 시작합니다.');
      viewWebRtcAutoRestartTimer = setTimeout(() => {
        viewWebRtcAutoRestartTimer = null;
        if (pc !== viewWebRtcPeer || !isMetadataViewMode()) return;
        startViewPreview().catch((error) => {
          setViewConnectionState('error', `WebRTC 메타데이터 반복 재생 재시작 실패: ${error.message}`);
        });
      }, 150);
    }

    async function startWebRtcMetadataViewer(params) {
      if (!window.RTCPeerConnection) {
        throw new Error('이 브라우저는 RTCPeerConnection을 지원하지 않습니다.');
      }
      resetMetadataViewerState('connecting');
      startMetadataOverlayTicker();
      setViewConnectionState('connecting', 'WebRTC 세션을 만들고 DataChannel을 기다리는 중입니다.');
      const pc = new RTCPeerConnection({ iceServers: [] });
      viewWebRtcPeer = pc;
      pc.onconnectionstatechange = () => {
        if (pc !== viewWebRtcPeer) return;
        const state = pc.connectionState || '';
        if (['failed', 'disconnected'].includes(state)) {
          setViewConnectionState('error', `WebRTC 연결 상태: ${state}`);
        } else if (['connected', 'completed'].includes(state)) {
          setViewConnectionState('playing', 'WebRTC 영상 재생 중입니다. metadata DataChannel 수신 상태를 확인하세요.');
        }
      };
      pc.oniceconnectionstatechange = () => {
        if (pc !== viewWebRtcPeer) return;
        if (['failed', 'disconnected'].includes(pc.iceConnectionState || '')) {
          setViewConnectionState('error', `WebRTC ICE 상태: ${pc.iceConnectionState}`);
        }
      };
      pc.ondatachannel = (event) => {
        if (pc !== viewWebRtcPeer) return;
        attachMetadataDataChannel(event.channel);
      };
      pc.ontrack = (event) => {
        if (pc !== viewWebRtcPeer) return;
        const video = $('viewWebRtcVideo');
        if (!video) return;
        if ($('viewWebRtcStage')) $('viewWebRtcStage').hidden = false;
        video.srcObject = event.streams[0];
        video.loop = true;
        video.muted = false;
        video.volume = 1.0;
        const stream = event.streams[0];
        if (stream && typeof stream.getVideoTracks === 'function') {
          for (const track of stream.getVideoTracks()) {
            track.onended = () => scheduleViewWebRtcReplayRestart(pc);
          }
        }
        video.onended = () => scheduleViewWebRtcReplayRestart(pc);
        const playPromise = video.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {});
        }
        setViewConnectionState('playing', 'WebRTC 영상 재생 중입니다. DataChannel 연결을 기다리는 중입니다.');
      };
      pc.onicecandidate = async (event) => {
        if (!viewWebRtcSessionId || !event.candidate) return;
        await fetch(`/webrtc/session/${encodeURIComponent(viewWebRtcSessionId)}/ice`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            candidate: event.candidate.candidate
          })
        }).catch(() => {});
      };

      const response = await fetch(`/webrtc/session?${params.toString()}`, { method: 'POST' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'WebRTC 세션 생성 실패');
      }
      viewWebRtcSessionId = payload.sessionId || '';
      if (!viewWebRtcSessionId || !payload.offer) {
        throw new Error('WebRTC 세션 응답에 sessionId 또는 offer가 없습니다.');
      }
      await pc.setRemoteDescription({ type: 'offer', sdp: payload.offer });
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await fetch(`/webrtc/session/${encodeURIComponent(viewWebRtcSessionId)}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: answer.sdp
      });
      setViewPreviewUi(true);
      viewWebRtcIceTimer = setInterval(() => {
        pollViewWebRtcIce().catch(() => {});
      }, 1000);
      scheduleMetadataStallCheck();
    }

    async function stopViewPreview(options = {}) {
      if (viewTimer) {
        clearInterval(viewTimer);
        viewTimer = null;
      }
      const hadViewSession = Boolean(viewTapId || viewWebRtcSessionId || viewMetadataMessageCount > 0);
      await closeViewWebRtcSession();
      const tapId = viewTapId;
      viewTapId = '';
      viewFailureCount = 0;
      if (!options.silent && hadViewSession) {
        dashboardLastViewStopAt = Date.now();
      }
      if ($('viewPreviewImage')) $('viewPreviewImage').removeAttribute('src');
      if (isMetadataViewMode()) {
        resetMetadataViewerState('disabled');
      }
      if (tapId) {
        await fetch(`/lab/analysis/taps/${encodeURIComponent(tapId)}`, { method: 'DELETE' }).catch(() => {});
      }
      updateGeneratedUrls();
      if (!options.silent) {
        setViewConnectionState('stopped', '보기를 중지했습니다.');
      } else if (!viewTapId) {
        setViewPreviewUi(false);
      }
    }

    function refreshViewFrame() {
      if (!viewTapId || !$('viewPreviewImage')) return;
      const mode = selectedViewMode();
      const activeTapId = viewTapId;
      const imagePath = mode === 'live'
        ? 'snapshot.jpg?quality=76'
        : 'overlay.jpg?quality=76&thickness=3&drawLabels=1&trackIds=1&trackTrails=1&labelLang=ko';
      const image = new Image();
      image.onload = () => {
        if (viewTapId !== activeTapId) return;
        viewFailureCount = 0;
        $('viewPreviewImage').src = image.src;
        setViewConnectionState('playing', `${viewModeLabel(mode)} 재생 중: ${$('viewBindingSummary')?.textContent || ''}`);
      };
      image.onerror = () => {
        if (viewTapId !== activeTapId) return;
        viewFailureCount += 1;
        if (viewFailureCount >= 4) {
          setViewConnectionState('error', '프레임을 가져오지 못했습니다. 소스 연결, 디코딩, 분석 tap 상태를 확인하세요.');
        }
      };
      image.src = `/lab/analysis/taps/${encodeURIComponent(activeTapId)}/${imagePath}&_=${Date.now()}`;
    }

    async function startViewPreview() {
      await stopViewPreview({ silent: true });
      updateViewModeUi();
      const params = buildViewParams();
      if (selectedViewMode() === 'rule' && !params.get('vaRule')) {
        throw new Error('영상 + VA 룰 모드는 저장된 영상 분석 설정 ID를 선택해야 합니다.');
      }
      if ((params.get('source') || '') !== '' && !params.get('url')) {
        throw new Error('URL 또는 Source ID를 입력하세요.');
      }
      if (selectedViewMode() === 'metadata') {
        await startWebRtcMetadataViewer(params);
        return;
      }
      setViewConnectionState('connecting', '분석 tap을 생성하고 프레임을 기다리는 중입니다.');
      const payload = await requestJson(`/lab/analysis/taps?${params.toString()}`, { method: 'POST' });
      viewTapId = payload.tapId || '';
      setViewPreviewUi(true);
      setViewConnectionState('connecting', `${viewModeLabel(selectedViewMode())} 연결 중: ${$('viewBindingSummary')?.textContent || ''}`);
      updateGeneratedUrls();
      refreshViewFrame();
      viewTimer = setInterval(refreshViewFrame, 500);
    }

    function drawRegion() {
      const lineMode = isGeometryLineMode();
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);
      if (previewImage) {
        ctx.drawImage(previewImage, 0, 0, width, height);
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(0, 0, width, height);
      } else {
        ctx.fillStyle = '#08110e';
        ctx.fillRect(0, 0, width, height);
        const message = regionCanvasMessage();
        if (message) {
          ctx.fillStyle = 'rgba(242,240,223,0.84)';
          ctx.font = 'bold 18px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(message, width / 2, height / 2);
        }
      }
      ctx.strokeStyle = 'rgba(242,240,223,0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= width; x += width / 10) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += height / 10) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      if (regionPoints.length > 0) {
        ctx.beginPath();
        regionPoints.forEach((point, index) => {
          const x = point.x * width;
          const y = point.y * height;
          if (index === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        if (!lineMode && regionPoints.length >= 3) {
          ctx.closePath();
          ctx.fillStyle = 'rgba(111,208,165,0.22)';
          ctx.fill();
        }
        ctx.strokeStyle = lineMode ? '#e7b65c' : '#6fd0a5';
        ctx.lineWidth = lineMode ? 5 : 4;
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(242,240,223,0.82)';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(
        `${lineMode ? '선' : '영역'} 점 ${regionPoints.length}/${maxGeometryPoints()} · 최소 ${minimumGeometryPoints()}개`,
        16,
        14
      );
      if (lineMode) {
        ctx.fillText(`방향: ${lineDirectionLabel()}`, 16, 36);
      }
      regionPoints.forEach((point, index) => {
        const x = point.x * width;
        const y = point.y * height;
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, Math.PI * 2);
        ctx.fillStyle = '#e7b65c';
        ctx.fill();
        ctx.strokeStyle = '#12120d';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#12120d';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(index + 1), x, y);
      });
    }

    function regionCanvasMessage() {
      if (previewImage) return '';
      if (previewTapId || $('autoPreviewInput')?.checked) {
        return previewFailureCount >= 4
          ? '프레임 로딩을 확인 중입니다'
          : '프레임 로딩 중입니다';
      }
      return '영상 보기 시작을 누르면 프레임이 표시됩니다';
    }

    function canvasPointFromEvent(event) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (event.clientX - rect.left) / rect.width,
        y: (event.clientY - rect.top) / rect.height
      };
    }

    function hitTestPointIndex(point) {
      const width = canvas.width;
      const height = canvas.height;
      let bestIndex = -1;
      let bestDistance = dragHitRadiusPx;
      regionPoints.forEach((candidate, index) => {
        const dx = (candidate.x - point.x) * width;
        const dy = (candidate.y - point.y) * height;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= bestDistance) {
          bestDistance = distance;
          bestIndex = index;
        }
      });
      return bestIndex;
    }

    function bindRegionCanvasEditorEvents() {
      canvas.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        const point = clampPoint(canvasPointFromEvent(event));
        const hitIndex = hitTestPointIndex(point);
        didDragPoint = false;
        if (hitIndex >= 0) {
          pushRegionUndo();
          draggingPointIndex = hitIndex;
          canvas.setPointerCapture(event.pointerId);
          return;
        }
        if (regionPoints.length >= maxGeometryPoints()) {
          status(`${isGeometryLineMode() ? '선' : '영역'} 점은 최대 ${maxGeometryPoints()}개까지 지정할 수 있습니다. 기존 점을 드래그해서 위치를 바꿔주세요.`);
          return;
        }
        pushRegionUndo();
        regionPoints.push(point);
        draggingPointIndex = regionPoints.length - 1;
        didDragPoint = true;
        canvas.setPointerCapture(event.pointerId);
        updatePreviews();
      });

      canvas.addEventListener('pointermove', (event) => {
        if (draggingPointIndex < 0) return;
        event.preventDefault();
        regionPoints[draggingPointIndex] = clampPoint(canvasPointFromEvent(event));
        didDragPoint = true;
        updatePreviews();
      });

      function finishPointDrag(event) {
        if (draggingPointIndex >= 0) {
          event.preventDefault();
          if (canvas.hasPointerCapture(event.pointerId)) {
            canvas.releasePointerCapture(event.pointerId);
          }
          draggingPointIndex = -1;
          if (didDragPoint) {
            updatePreviews();
          }
        }
      }

      canvas.addEventListener('pointerup', finishPointDrag);
      canvas.addEventListener('pointercancel', finishPointDrag);
      $('undoRegionBtn').onclick = undoRegionChange;
      $('deleteLastPointBtn').onclick = deleteLastRegionPoint;
      $('clearRegionBtn').onclick = clearRegionGeometry;
    }

    function bindProfileSelectorEvents() {
      $('newProfileBtn').onclick = () => {
        $('profileSelect').value = '';
        loadProfile({ id: 'fast-local', detector: 'yolo', fps: 6, maxQueue: 1, confidence: 0.25, nms: 0.45, inputWidth: 640, inputHeight: 640, adaptive: true, trackingClasses: ['person', 'vehicle'] });
      };
      $('saveProfileBtn').onclick = () => saveProfile().catch((error) => {
        status(`Profile 저장 실패: ${error.message}`);
        showFeedback(`Profile 저장 실패: ${error.message}`, 'error');
      });
      $('deleteProfileBtn').onclick = () => deleteProfile().catch((error) => {
        status(`Profile 삭제 실패: ${error.message}`);
        showFeedback(`Profile 삭제 실패: ${error.message}`, 'error');
      });
      $('profileSelect').onchange = () => {
        const value = $('profileSelect').value;
        if (!value) {
          $('newProfileBtn').click();
          return;
        }
        const [kind, id] = value.split(':');
        const source = kind === 'builtin' ? builtInProfiles : profiles;
        const item = source.find((entry) => entry.id === id);
        if (item) loadProfile(item);
      };
    }

    function bindStoredRuleEvents() {
      $('saveRuleBtn').onclick = () => saveRule().catch((error) => {
        status(`Rule 저장 실패: ${error.message}`);
        showFeedback(`Rule 저장 실패: ${error.message}`, 'error');
      });
      $('deleteRuleBtn').onclick = () => deleteRule().catch((error) => {
        status(`Rule 삭제 실패: ${error.message}`);
        showFeedback(`Rule 삭제 실패: ${error.message}`, 'error');
      });
      $('ruleSelect').onchange = () => {
        const value = $('ruleSelect').value;
        if (!value) {
          loadRule({
            id: 'file-person-vehicle-area',
            enabled: true,
            match: { sourceKind: 'file', route: '*' },
            analysis: { profileId: $('ruleProfileId').value, classes: ['person', 'vehicle'] },
            event: { type: 'presence', minConfidence: 0.25, minDurationMs: 0, region: { type: 'polygon', points: regionPoints } },
            eventActions: {
              highlight: { enabled: true, mode: 'blink', target: 'matched-object', durationMs: 1200, color: '#ff0000' },
              post: { enabled: false, method: 'POST', url: '', contentType: 'application/json', payloadFormat: 'media-server.va.event.v1' }
            }
          });
          return;
        }
        const [, id] = value.split(':');
        const item = rules.find((entry) => entry.id === id);
        if (item) loadRule(item);
      };
    }

    function bindRuleListEvents() {
      $('addVaRuleBtn').onclick = openVaRuleEditorForNew;
      $('vaRuleSearchInput').addEventListener('input', () => {
        vaRuleListSearch = $('vaRuleSearchInput').value || '';
        renderVaRuleLibrary();
      });
      $('vaRuleStatusFilter').addEventListener('change', () => {
        vaRuleStatusFilter = $('vaRuleStatusFilter').value || 'all';
        renderVaRuleLibrary();
      });
      $('vaRuleKindFilter').addEventListener('change', () => {
        vaRuleKindFilter = $('vaRuleKindFilter').value || 'all';
        renderVaRuleLibrary();
      });
    }

    function bindRuleEditorEvents() {
      $('newVaRuleBtn').onclick = () => {
        openVaRuleEditorForNew();
      };
      $('cancelVaRuleEditBtn').onclick = closeVaRuleEditor;
      $('cancelVaRuleEditBtnBottom').onclick = closeVaRuleEditor;
      $('saveVaRuleBtn').onclick = () => saveVaRule().catch((error) => {
        status(`영상 분석 설정 저장 실패: ${error.message}`);
        showFeedback(`영상 분석 설정 저장 실패: ${error.message}`, 'error');
      });
      $('deleteVaRuleBtn').onclick = () => deleteVaRule().catch((error) => {
        status(`영상 분석 설정 삭제 실패: ${error.message}`);
        showFeedback(`영상 분석 설정 삭제 실패: ${error.message}`, 'error');
      });
      $('cancelDeleteVaRuleBtn').onclick = () => {
        pendingDeleteVaRuleId = '';
        $('deleteVaRuleDialog')?.close();
      };
      $('confirmDeleteVaRuleBtn').onclick = () => {
        const id = pendingDeleteVaRuleId;
        pendingDeleteVaRuleId = '';
        $('deleteVaRuleDialog')?.close();
        deleteVaRuleById(id).catch((error) => {
          status(`영상 분석 룰 삭제 실패: ${error.message}`);
          showFeedback(`삭제 실패: ${error.message}`, 'error');
        });
      };
      $('vaRuleSelect').onchange = () => {
        const id = $('vaRuleSelect').value;
        if (isVaRuleEditorOpen() && vaRuleDirty && String(id || '') !== currentVaRuleId()) {
          if (!confirmDiscardVaRuleChanges('다른 룰로 이동')) {
            $('vaRuleSelect').value = currentVaRuleId();
            return;
          }
        }
        if (!id) {
          loadVaRule(null);
          resetVaRuleDirtyBaseline();
          return;
        }
        const item = vaRules.find((entry) => String(entry.id) === String(id));
        if (item) {
          loadVaRule(item);
          resetVaRuleDirtyBaseline();
          $('viewVaRuleSelect').value = String(item.id);
        }
      };
      for (const id of ['vaRuleId', 'vaRuleName', 'vaRuleSourceKind', 'vaRuleFileSelect', 'vaRuleUrlInput']) {
        const el = $(id);
        if (el) {
          el.addEventListener('input', () => {
            updateVaRuleSourceUi();
            updateViewModeUi();
            updatePreviews();
          });
          el.addEventListener('change', () => {
            updateVaRuleSourceUi();
            updateViewModeUi();
            updatePreviews();
          });
        }
      }
    }

    function bindAnalysisPreviewPanelEvents() {
      $('startViewPreviewBtn').onclick = () => startViewPreview().catch((error) => {
        setViewConnectionState('error', `보기 시작 실패: ${error.message}`);
        status(`보기 시작 실패: ${error.message}`);
      });
      $('stopViewPreviewBtn').onclick = () => stopViewPreview().catch((error) => setViewConnectionState('error', `보기 중지 실패: ${error.message}`));
      $('autoPreviewInput').addEventListener('change', () => {
        if ($('autoPreviewInput').checked) {
          startRulePreview().catch((error) => {
            setRulePreviewUi(false);
            previewStatus(`메인 영상 프레임 보기 실패: ${error.message}`);
          });
        } else {
          stopRulePreview().catch((error) => previewStatus(`미리보기 중지 실패: ${error.message}`));
        }
      });
      $('stopPreviewBtn').onclick = () => {
        if (previewTapId || $('autoPreviewInput').checked) {
          stopRulePreview().catch((error) => previewStatus(`미리보기 중지 실패: ${error.message}`));
        } else {
          setRulePreviewUi(true);
          startRulePreview().catch((error) => {
            setRulePreviewUi(false);
            previewStatus(`메인 영상 프레임 보기 실패: ${error.message}`);
          });
        }
      };
      $('previewSourceMode').addEventListener('change', () => {
        updatePreviewSourceUi();
        if (previewTapId || $('autoPreviewInput').checked) {
          startRulePreview().catch((error) => {
            setRulePreviewUi(false);
            previewStatus(`영상 프레임 보기 실패: ${error.message}`);
          });
        }
      });
      $('previewFileSelect').addEventListener('change', () => {
        if (previewTapId || $('autoPreviewInput').checked) {
          startRulePreview().catch((error) => {
            setRulePreviewUi(false);
            previewStatus(`영상 프레임 보기 실패: ${error.message}`);
          });
        }
      });
      $('previewOverlayInput').addEventListener('change', () => {
        if (previewTapId || $('autoPreviewInput').checked) {
          startRulePreview().catch((error) => {
            setRulePreviewUi(false);
            previewStatus(`영상 프레임 보기 실패: ${error.message}`);
          });
        }
      });
    }

    function bindDeveloperUrlPanelEvents() {
      $('viewVaRuleSelect').onchange = updateViewModeUi;
      document.querySelectorAll('input[name="viewMode"]').forEach((el) => {
        el.addEventListener('change', updateViewModeUi);
      });
      document.querySelectorAll('[data-copy-url-target]').forEach((button) => {
        button.addEventListener('click', () => {
          copyGeneratedUrl(button.dataset.copyUrlTarget || '', button);
        });
      });
      for (const id of ['viewSourceKind', 'viewFileSelect', 'viewUrlInput', 'viewServerBaseUrl', 'viewRtspAuthority']) {
        const el = $(id);
        if (el) {
          el.addEventListener('input', updateViewModeUi);
          el.addEventListener('change', updateViewModeUi);
        }
      }
      for (const id of ['metadataOverlayBboxInput', 'metadataOverlayLabelInput', 'metadataOverlayTrackIdInput', 'metadataOverlayScenarioInput', 'metadataOverlayEventInput', 'metadataOverlayHealthInput', 'metadataOverlayZoneInput', 'metadataOverlayDwellInput', 'metadataOverlayDetectionInput', 'metadataOverlayFallbackInput']) {
        const el = $(id);
        if (el) {
          el.addEventListener('change', () => {
            updateGeneratedUrls();
            scheduleMetadataOverlayFrame();
          });
        }
      }
      if ($('metadataBboxDiagnosticsBtn')) {
        $('metadataBboxDiagnosticsBtn').addEventListener('click', () => {
          refreshMetadataBboxDiagnostics().catch((error) => {
            viewMetadataBboxDiagnostics = null;
            renderMetadataBboxDiagnostics([], `BBox 진단 실패: ${error.message}`);
          });
        });
      }
      for (const id of ['dashboardRefreshInterval', 'dashboardAutoRefreshInput']) {
        const el = $(id);
        if (el) {
          el.addEventListener('change', startDashboardPolling);
        }
      }
      if ($('dashboardRefreshBtn')) {
        $('dashboardRefreshBtn').addEventListener('click', () => refreshDashboard({ force: true }).catch(() => {}));
      }
      if ($('dashboardTapSelect')) {
        $('dashboardTapSelect').addEventListener('change', () => {
          dashboardLastTapId = $('dashboardTapSelect').value || '';
          dashboardTapSelectionManual = true;
          dashboardResetRecentEvents();
          refreshDashboard({ force: true }).catch(() => {});
        });
      }
      if ($('dashboardRuleSelect')) {
        $('dashboardRuleSelect').addEventListener('change', () => {
          dashboardLastTapId = '';
          dashboardTapSelectionManual = false;
          dashboardResetRecentEvents();
          refreshDashboard({ force: true }).catch(() => {});
        });
      }
      if ($('eventRecordSearchBtn')) {
        $('eventRecordSearchBtn').addEventListener('click', () => {
          searchEventRecords().catch(() => {});
        });
      }
    }

    function bindNavigationEvents() {
      document.querySelectorAll('[data-primary-tab]').forEach((button) => {
        button.addEventListener('click', () => {
          const tabName = button.dataset.primaryTab || 'settings';
          if (tabName !== 'settings' && isVaRuleEditorOpen() && vaRuleDirty) {
            if (!confirmDiscardVaRuleChanges('영상 분석 보기로 이동')) {
              return;
            }
            closeVaRuleEditor({ skipDirtyCheck: true });
          }
          $('settingsPanel').hidden = tabName !== 'settings';
          $('viewerPanel').hidden = tabName !== 'viewer';
          $('dashboardPanel').hidden = tabName !== 'dashboard';
          document.querySelectorAll('[data-primary-tab]').forEach((candidate) => {
            candidate.classList.toggle('is-active', candidate === button);
          });
          if (tabName === 'viewer') {
            updateViewModeUi();
          }
          dashboardActive = tabName === 'dashboard';
          if (dashboardActive) startDashboardPolling();
          else stopDashboardPolling({ recordInactive: true });
        });
      });
      document.querySelectorAll('[data-rule-section-target]').forEach((button) => {
        button.addEventListener('click', () => {
          const target = $(button.dataset.ruleSectionTarget || '');
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
    }

    function bindObjectCategorySelectorEvents() {
      const classFilterInput = $('classFilterInput');
      if (classFilterInput) classFilterInput.addEventListener('change', filterClassChecks);
      $('selectDefaultTrackingBtn').onclick = () => setTrackingCategoryChecks((value) => value === 'person' || value === 'vehicle');
      $('selectAllTrackingBtn').onclick = () => setTrackingCategoryChecks(() => true);
      $('clearTrackingBtn').onclick = () => setTrackingCategoryChecks(() => false);
      $('selectCoreClassesBtn').onclick = () => setCheckedClasses((value) => value === 'person' || value === 'vehicle');
      $('selectAllClassesBtn').onclick = () => setCheckedClasses(() => true);
      $('clearClassesBtn').onclick = () => setCheckedClasses(() => false);
      document.querySelectorAll('[data-tracking-category]').forEach((el) => {
        el.addEventListener('change', () => {
          updatePreviews();
        });
      });
    }

    function bindRuleInputEvents() {
      for (const id of ['profileFps', 'profileQueue', 'profileConfidence', 'profileNms', 'profileInputWidth', 'profileInputHeight', 'profileDetector', 'profileAdaptive', 'profileId', 'ruleId', 'ruleEnabled', 'ruleSourceKind', 'ruleRoute', 'ruleProfileId', 'ruleEventType', 'ruleLineDirection', 'ruleConfidence', 'ruleMinDurationMs', 'scenarioType', 'scenarioLineDirection', 'scenarioZoneIds', 'scenarioCandidateMs', 'scenarioDwellMs', 'scenarioCooldownMs', 'scenarioStableOnly', 'eventFlashInput', 'eventFlashMsInput', 'eventPostUrlInput']) {
        const el = $(id);
        if (el) el.addEventListener('input', updatePreviews);
        if (el) el.addEventListener('change', updatePreviews);
      }
      if ($('scenarioType')) {
        $('scenarioType').addEventListener('change', () => {
          pushRegionUndo();
          regionPoints = $('scenarioType').value === 'wrong-direction'
            ? defaultLinePoints()
            : defaultPolygonPoints();
          updatePreviews();
        });
      }
      document.querySelectorAll('input[name="ruleKind"]').forEach((el) => {
        el.addEventListener('change', () => {
          if (isScenarioRule() && isWrongDirectionScenario() && regionPoints.length < 2) {
            pushRegionUndo();
            regionPoints = defaultLinePoints();
          } else if (isScenarioRule() && regionPoints.length < 3) {
            pushRegionUndo();
            regionPoints = defaultPolygonPoints();
          }
          updatePreviews();
        });
      });
    }

    function bindVaUiComponents() {
      bindRegionCanvasEditorEvents();
      bindProfileSelectorEvents();
      bindStoredRuleEvents();
      bindRuleListEvents();
      bindRuleEditorEvents();
      bindAnalysisPreviewPanelEvents();
      bindDeveloperUrlPanelEvents();
      bindNavigationEvents();
      bindObjectCategorySelectorEvents();
      bindRuleInputEvents();
    }

    function applyTheme(theme) {
      const nextTheme = theme === 'dark' ? 'dark' : 'light';
      document.documentElement.dataset.theme = nextTheme;
      localStorage.setItem('mediaServerTheme', nextTheme);
      const themeButton = $('themeToggleBtn');
      if (themeButton) themeButton.textContent = nextTheme === 'dark' ? '라이트 모드' : '다크 모드';
    }
    function notifyEmbedHeight() {
      if (document.documentElement.dataset.embed !== '1') return;
      const height = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      window.parent.postMessage({ type: 'mediaServer.embedHeight', height }, window.location.origin);
    }
    window.addEventListener('message', (event) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data || {};
      if (data.type === 'mediaServer.theme') {
        applyTheme(data.theme);
        notifyEmbedHeight();
      } else if (data.type === 'mediaServer.sourceChanged' && $('autoPreviewInput') && $('autoPreviewInput').checked) {
        startRulePreview().catch((error) => previewStatus(`메인 소스 변경 후 미리보기 재시작 실패: ${error.message}`));
      }
    });
    window.addEventListener('load', notifyEmbedHeight);
    window.addEventListener('resize', () => {
      notifyEmbedHeight();
      scheduleMetadataOverlayFrame();
    });
    if (window.ResizeObserver) {
      new ResizeObserver(notifyEmbedHeight).observe(document.body);
    }
    setInterval(notifyEmbedHeight, 1500);
    $('themeToggleBtn').onclick = () => {
      applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    };
    applyTheme(document.documentElement.dataset.theme);

    renderClassChecks();
    bindVaUiComponents();
    applyMetadataViewerQueryDefaults();
    installMetadataSyncVerificationDebugHook();
    setRulePreviewUi(false);
    setViewPreviewUi(false);
    setViewConnectionState('idle', '보기 시작을 누르면 분석 tap을 만들고 프레임을 표시합니다.');
    setVaRuleEditorVisible(false);
    updateVaRuleSourceUi();
    updateViewModeUi();
    updatePreviews();
    loadPreviewFileOptions();
    refreshRegistry().catch((error) => status(`목록 로드 실패: ${error.message}`));
    window.addEventListener('beforeunload', () => {
      stopRulePreview({ silent: true });
      stopViewPreview({ silent: true });
      stopDashboardPolling();
    });
    window.addEventListener('beforeunload', (event) => {
      if (!isVaRuleEditorOpen() || !vaRuleDirty) return;
      event.preventDefault();
      event.returnValue = '';
    });
  </script>
</body>
</html>)RULEPAGE";
    ReplaceAll(&html, "__MEDIA_SERVER_CATEGORY_CATALOG__", AnalysisCategoryCatalogJson());
    ReplaceAll(&html, "__MEDIA_SERVER_RTSP_PORT__",
               std::to_string(app::GetAppConfig().rtsp_listen_port));
    ReplaceAll(&html, "__MEDIA_SERVER_STREAM_ROUTE__",
               JsonEscape(app::GetAppConfig().stream_route));
    return html;
}

std::string BuildLabImportPageHtml() {
    const bool youtube_source_enabled = app::GetAppConfig().enable_experimental_youtube_source;
    const bool youtube_import_enabled = app::GetAppConfig().enable_lab_youtube_import;
    const std::string import_note =
        youtube_import_enabled
            ? "YouTube URL을 개발용 샘플 파일로 내려받아 `video/imports` 아래에 저장합니다. 저장된 file token은 기존 `file=` 경로로 relay/analysis 테스트에 재사용합니다."
            : "현재 YouTube 파일 다운로드가 꺼져 있습니다. 다운로드를 허용하려면 `MEDIA_SERVER_ENABLE_LAB_YOUTUBE_IMPORT=1`로 서버를 시작하세요.";
    const std::string button_disabled = youtube_import_enabled ? std::string() : "disabled";
    const std::string import_status = youtube_import_enabled ? "켜짐" : "꺼짐";
    const std::string source_status = youtube_source_enabled ? "켜짐" : "꺼짐";
    return R"(<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>미디어 서버 실험실 가져오기</title>
  <script>
    (() => {
      const saved = localStorage.getItem('mediaServerTheme');
      document.documentElement.dataset.theme = saved === 'dark' ? 'dark' : 'light';
      const params = new URLSearchParams(window.location.search);
      document.documentElement.dataset.embed = params.get('embed') === '1' ? '1' : '0';
    })();
  </script>
  <style>
    :root {
      --bg: #f6f1e8;
      --panel: #fffaf0;
      --ink: #172026;
      --muted: #66737c;
      --accent: #0b6e69;
      --accent2: #f0b35b;
      --line: rgba(23,32,38,0.12);
      --card-bg: rgba(255,250,240,0.9);
      --field-bg: rgba(255,255,255,0.86);
      --secondary-bg: #fff;
      --soft-bg: rgba(11,110,105,0.08);
      --code-bg: #172026;
      --code-ink: #e8f4f1;
      --shadow: 0 22px 70px rgba(38,44,54,0.14);
    }
    :root[data-theme="dark"] {
      --bg: #252525;
      --panel: #2b2b2b;
      --ink: #f4f4f4;
      --muted: #b6b6b6;
      --accent: #ff4d8d;
      --accent2: #ff9f66;
      --line: rgba(255,255,255,0.10);
      --card-bg: rgba(42,42,42,0.92);
      --field-bg: rgba(18,18,18,0.88);
      --secondary-bg: rgba(255,255,255,0.08);
      --soft-bg: rgba(255,255,255,0.055);
      --code-bg: rgba(14,14,14,0.94);
      --code-ink: #efefef;
      --shadow: 18px 24px 52px rgba(0,0,0,0.46), -10px -10px 34px rgba(255,255,255,0.035);
      --focus: rgba(255,77,141,0.24);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Avenir Next", "Pretendard", sans-serif;
      color: var(--ink);
      background:
        radial-gradient(circle at top right, rgba(240,179,91,0.28), transparent 26%),
        radial-gradient(circle at top left, rgba(11,110,105,0.14), transparent 28%),
        linear-gradient(135deg, #fbf8f0 0%, var(--bg) 45%, #eaf3ef 100%);
      min-height: 100vh;
    }
    :root[data-theme="dark"] body {
      background:
        radial-gradient(circle at 18% 8%, rgba(255,77,141,0.08), transparent 30%),
        radial-gradient(circle at 82% 2%, rgba(255,159,102,0.06), transparent 32%),
        linear-gradient(135deg, #202020 0%, var(--bg) 54%, #202020 100%);
    }
    :root[data-embed="1"] body {
      background: transparent;
      min-height: auto;
    }
    main {
      max-width: 1040px;
      margin: 0 auto;
      padding: 32px 20px 48px;
      display: grid;
      gap: 20px;
    }
    :root[data-embed="1"] main {
      max-width: none;
      padding: 0;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--line);
      border-radius: 24px;
      backdrop-filter: blur(10px);
      box-shadow: var(--shadow);
      overflow: hidden;
      padding: 24px;
    }
    :root[data-embed="1"] .card {
      box-shadow: none;
      border-radius: 20px;
    }
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      color: var(--muted);
      font-size: 13px;
    }
    .topbar strong { color: var(--ink); }
    .standalone-nav { display: none; }
    .theme-toggle {
      width: auto;
      min-width: 112px;
      padding: 9px 13px;
      border-radius: 999px;
      background: var(--secondary-bg);
      color: var(--ink);
      border: 1px solid var(--line);
      box-shadow: none;
    }
    :root[data-embed="1"] .topbar {
      display: none;
    }
    .hero {
      display: grid;
      grid-template-columns: 1.1fr 0.9fr;
      gap: 20px;
    }
    :root[data-embed="1"] .hero {
      grid-template-columns: 1fr;
    }
    h1, h2 {
      margin: 0 0 10px;
      letter-spacing: -0.03em;
    }
    p, li { color: var(--muted); line-height: 1.5; }
    a { color: var(--accent); text-decoration: none; font-weight: 700; }
    a:hover { text-decoration: underline; }
    .controls {
      display: grid;
      gap: 12px;
      align-content: start;
    }
    label {
      display: grid;
      gap: 6px;
      font-size: 13px;
      color: var(--muted);
    }
    input, button, textarea, select {
      width: 100%;
      border-radius: 14px;
      border: 1px solid var(--line);
      background: var(--field-bg);
      color: var(--ink);
      padding: 12px 14px;
      font: inherit;
    }
    button {
      background: linear-gradient(135deg, var(--accent), var(--accent2));
      color: #fff;
      border: 0;
      font-weight: 700;
      cursor: pointer;
    }
    button.secondary {
      background: var(--secondary-bg);
      color: var(--ink);
      border: 1px solid var(--line);
    }
    button:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      background: var(--secondary-bg);
      color: var(--muted);
      border: 1px solid var(--line);
    }
    pre {
      white-space: pre-wrap;
      word-break: break-word;
      background: var(--code-bg);
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 16px;
      min-height: 180px;
      margin: 0;
      color: var(--code-ink);
    }
    .jobs {
      display: grid;
      gap: 12px;
    }
    .job {
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 14px;
      background: var(--soft-bg);
    }
    .job strong {
      display: block;
      margin-bottom: 4px;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    .mode-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
      margin-top: 14px;
    }
    .mode-card {
      padding: 14px;
      border: 1px solid var(--line);
      border-radius: 18px;
      background: var(--soft-bg);
    }
    .mode-card strong {
      display: block;
      color: var(--ink);
      margin-bottom: 6px;
    }
    .mode-card span {
      color: var(--muted);
      line-height: 1.45;
      font-size: 0.92rem;
    }
    @media (max-width: 900px) {
      .hero, .grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <main>
    <div class="topbar">
      <strong>MediaServer</strong>
      <button id="themeToggleBtn" class="theme-toggle" type="button">다크 모드</button>
    </div>
    <section class="card">
      <div class="hero">
        <div>
          <h1>실험실 가져오기</h1>
          <p class="standalone-nav"><a href="/lab">실험실 메인으로 이동</a> · <a href="/webrtc/test">안정 테스트 페이지로 이동</a></p>
          <p>)" + import_note + R"(</p>
          <div class="mode-grid">
            <div class="mode-card">
              <strong>파일 다운로드: )" + import_status + R"(</strong>
              <span>yt-dlp와 ffmpeg로 샘플 파일을 만들고, 이후 `file=imports/...`로 사용합니다.</span>
            </div>
            <div class="mode-card">
              <strong>직접 표출(source=youtube): )" + source_status + R"(</strong>
              <span>라이브/VOD를 바로 받아 송출하는 경로입니다. 기본 숨김이며 `MEDIA_SERVER_ENABLE_EXPERIMENTAL_YOUTUBE_SOURCE=1`이 필요합니다.</span>
            </div>
          </div>
          <ul>
            <li>현재 provider: `youtube` file import</li>
            <li>출력 경로: `video/imports/*`</li>
            <li>작업이 `ready`가 되면 반환된 file token을 `file=` 경로에 그대로 사용할 수 있습니다.</li>
          </ul>
        </div>
        <div class="controls">
          <label>Provider
            <select id="providerInput">
              <option value="youtube">YouTube (실험실)</option>
            </select>
          </label>
          <label>소스 URL
            <input id="urlInput" placeholder="https://www.youtube.com/watch?v=..." />
          </label>
          <label>저장 파일 이름
            <input id="targetFileInput" placeholder="traffic_scene.mp4" />
          </label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <button id="createBtn" )" + button_disabled + R"(>가져오기 작업 생성</button>
            <button id="refreshBtn" class="secondary">작업 새로고침</button>
          </div>
          <pre id="statusBox">아직 요청한 작업이 없습니다.</pre>
        </div>
      </div>
    </section>

    <section class="card grid">
      <div>
        <h2>작업 목록</h2>
        <div id="jobsList" class="jobs"></div>
      </div>
      <div>
        <h2>선택된 작업</h2>
        <pre id="detailBox">작업을 선택하면 상세 정보를 보여줍니다.</pre>
      </div>
    </section>
  </main>
  <script>
    const providerInputEl = document.getElementById('providerInput');
    const urlInputEl = document.getElementById('urlInput');
    const targetFileInputEl = document.getElementById('targetFileInput');
    const statusBoxEl = document.getElementById('statusBox');
    const detailBoxEl = document.getElementById('detailBox');
    const jobsListEl = document.getElementById('jobsList');
    let selectedJobId = '';

    function renderDetail(job) {
      if (!job) {
        detailBoxEl.textContent = '작업을 선택하면 상세 정보를 보여줍니다.';
        return;
      }
      const lines = [
        `jobId=${job.jobId}`,
        `status=${job.status}`,
        `provider=${job.provider}`,
        `sourceUrl=${job.sourceUrl}`,
        `requestedFileName=${job.requestedFileName || ''}`,
        `storedFileToken=${job.storedFileToken || ''}`,
        `exitCode=${job.exitCode}`,
        `error=${job.error || ''}`,
        '',
        'log:',
        job.log || ''
      ];
      detailBoxEl.textContent = lines.join('\n');
    }

    function renderJobs(jobs) {
      jobsListEl.innerHTML = '';
      if (!jobs.length) {
        jobsListEl.innerHTML = '<p style="margin:0;color:var(--muted);">작업이 없습니다.</p>';
        renderDetail(null);
        return;
      }
      for (const job of jobs) {
        const item = document.createElement('div');
        item.className = 'job';
        const token = job.storedFileToken ? `\nfile=${job.storedFileToken}` : '';
        item.innerHTML =
          `<strong>${job.jobId}</strong>` +
          `<div>${job.status} · ${job.provider}</div>` +
          `<div style="margin-top:6px;color:var(--muted);word-break:break-word;">${job.sourceUrl}</div>` +
          `<div style="margin-top:6px;color:var(--muted);word-break:break-word;">${job.error || job.storedFileToken || ''}</div>`;
        item.onclick = () => {
          selectedJobId = job.jobId;
          renderDetail(job);
        };
        jobsListEl.appendChild(item);
        if (selectedJobId === job.jobId) {
          renderDetail(job);
        }
      }
      if (!selectedJobId) {
        selectedJobId = jobs[0].jobId;
        renderDetail(jobs[0]);
      }
    }

    async function refreshJobs() {
      const response = await fetch('/lab/import/jobs');
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || '작업 목록 조회 실패');
      }
      renderJobs(payload.jobs || []);
    }

    async function createJob() {
      const response = await fetch('/lab/import/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: providerInputEl.value,
          url: urlInputEl.value,
          targetFileName: targetFileInputEl.value
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || '가져오기 작업 생성 실패');
      }
      statusBoxEl.textContent =
        `작업 생성: ${payload.job.jobId}\nstatus=${payload.job.status}\nrequestedFileName=${payload.job.requestedFileName || ''}`;
      selectedJobId = payload.job.jobId;
      await refreshJobs();
    }

    document.getElementById('refreshBtn').onclick = () => {
      refreshJobs().catch((error) => { statusBoxEl.textContent = error.message; });
    };
    document.getElementById('createBtn').onclick = () => {
      createJob().catch((error) => { statusBoxEl.textContent = error.message; });
    };

    function applyTheme(theme) {
      const nextTheme = theme === 'dark' ? 'dark' : 'light';
      document.documentElement.dataset.theme = nextTheme;
      localStorage.setItem('mediaServerTheme', nextTheme);
      const themeButton = document.getElementById('themeToggleBtn');
      if (themeButton) themeButton.textContent = nextTheme === 'dark' ? '라이트 모드' : '다크 모드';
    }
    function notifyEmbedHeight() {
      if (document.documentElement.dataset.embed !== '1') return;
      const height = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      window.parent.postMessage({ type: 'mediaServer.embedHeight', height }, window.location.origin);
    }
    window.addEventListener('message', (event) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data || {};
      if (data.type === 'mediaServer.theme') {
        applyTheme(data.theme);
        notifyEmbedHeight();
      }
    });
    window.addEventListener('load', notifyEmbedHeight);
    window.addEventListener('resize', notifyEmbedHeight);
    if (window.ResizeObserver) {
      new ResizeObserver(notifyEmbedHeight).observe(document.body);
    }
    setInterval(notifyEmbedHeight, 1500);
    document.getElementById('themeToggleBtn').onclick = () => {
      applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    };
    applyTheme(document.documentElement.dataset.theme);

    refreshJobs().catch((error) => { statusBoxEl.textContent = error.message; });
    setInterval(() => {
      refreshJobs().catch(() => {});
    }, 3000);
  </script>
</body>
</html>)";
}

}  // namespace

struct WebRtcHttpServer::Impl {
    struct SessionEntry {
        std::string session_id;
        std::string ingress_client_id;
        std::string analysis_tap_id;
        media::IngressRequest request;
        std::shared_ptr<WebRtcEgressSession> bridge;
    };

    struct SourceSessionEntry {
        std::string session_id;
        std::string source_id;
        std::shared_ptr<WebRtcSourceSession> bridge;
    };

    explicit Impl(core::SessionManager& manager) : session_manager(manager) {}

    core::SessionManager& session_manager;
    LabImportManager lab_import_manager;
    std::string listen_address;
    std::uint16_t port{0};
    int listen_fd{-1};
    std::thread accept_thread;
    std::mutex mu;
    std::unordered_map<std::string, SessionEntry> sessions;
    std::unordered_map<std::string, SourceSessionEntry> source_sessions;
    std::atomic<std::uint64_t> next_session_id{1};
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

std::string SessionJson(const std::string& session_id, const std::string& offer) {
    std::ostringstream out;
    out << "{"
        << "\"sessionId\":\"" << JsonEscape(session_id) << "\","
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

std::string SourceJson(const std::string& session_id, const std::string& source_id, const std::string& answer) {
    std::ostringstream out;
    out << "{"
        << "\"sessionId\":\"" << JsonEscape(session_id) << "\","
        << "\"sourceId\":\"" << JsonEscape(source_id) << "\","
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
            << "\"sourceKind\":\"" << JsonEscape(tap.context.source_kind) << "\","
            << "\"route\":\"" << JsonEscape(tap.context.route) << "\","
            << "\"clientId\":\"" << JsonEscape(tap.context.client_id) << "\","
            << "\"profileSelectionSource\":\"" << JsonEscape(tap.profile_selection_source) << "\","
            << "\"selectedRuleId\":\"" << JsonEscape(tap.selected_by_rule_id) << "\","
            << "\"selectedRulePriority\":" << tap.selected_rule_priority << ","
            << "\"selectedRuleSpecificity\":" << tap.selected_rule_specificity
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
};

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
    return options;
}

std::string BuildVaRuntimeMetadataJsonWithinBudget(const analysis::AnalysisResult& result,
                                                   const std::vector<analysis::AnalysisEvent>& events,
                                                   const std::string& tracking_issue_report_json,
                                                   const VaMetadataStreamOptions& stream_options) {
    analysis::VaRuntimeMetadataBuildOptions options;
    options.schema = analysis::kVaRuntimeMetadataSchema;
    options.include_source = true;
    options.include_scenarios = true;
    options.include_metrics = true;
    options.include_tracking_issue_report = true;
    options.max_tracks = stream_options.max_tracks;
    options.max_events = stream_options.max_events;

    std::string serialized;
    for (int attempt = 0; attempt < 16; ++attempt) {
        serialized = analysis::SerializeVaRuntimeMetadataFrameJson(
            analysis::BuildVaRuntimeMetadataFrame(result, events, options, tracking_issue_report_json));
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

bool SendWebSocketHandshake(int fd, const std::string& client_key) {
    std::ostringstream out;
    out << "HTTP/1.1 101 Switching Protocols\r\n"
        << "Upgrade: websocket\r\n"
        << "Connection: Upgrade\r\n"
        << "Sec-WebSocket-Accept: " << WebSocketAcceptKey(client_key) << "\r\n"
        << "Access-Control-Allow-Origin: *\r\n"
        << "\r\n";
    return SendAll(fd, out.str());
}

bool SendWebSocketTextFrame(int fd, const std::string& payload) {
    std::string frame;
    frame.push_back(static_cast<char>(0x81U));
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

bool SendWebSocketCloseFrame(int fd) {
    const std::string frame{static_cast<char>(0x88), static_cast<char>(0x00)};
    return SendAll(fd, frame);
}

bool SendSseHeaders(int fd) {
    std::ostringstream out;
    out << "HTTP/1.1 200 OK\r\n"
        << "Content-Type: text/event-stream; charset=utf-8\r\n"
        << "Cache-Control: no-cache, no-transform\r\n"
        << "Connection: close\r\n"
        << "Access-Control-Allow-Origin: *\r\n"
        << "Access-Control-Allow-Headers: Content-Type\r\n"
        << "Access-Control-Allow-Methods: GET, OPTIONS\r\n"
        << "X-Accel-Buffering: no\r\n"
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
                         const std::unordered_map<std::string, std::string>& query) {
    SuppressSocketSigPipe(client_fd);
    const VaMetadataStreamOptions options = BuildVaMetadataStreamOptions(query);
    if (!SendSseHeaders(client_fd)) {
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
                               const std::string& websocket_key) {
    SuppressSocketSigPipe(client_fd);
    const VaMetadataStreamOptions options = BuildVaMetadataStreamOptions(query);
    if (!SendWebSocketHandshake(client_fd, websocket_key)) {
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
        << R"("eventActions":{"highlight":"blink overlay for matched object","post":"async curl-based POST worker with bounded queue and cooldown"},"metrics":["receivedVideoPackets","decodedFrames","sampledFrames","analyzedPackets","droppedPackets","pendingFrames","peakPendingFrames","effectiveDecodedFps","effectiveSampledFps","effectiveAnalyzedFps","lastQueueWaitMs","averageQueueWaitMs","lastInferenceMs","averageInferenceMs","lastAnalysisMs","averageAnalysisMs","maxAnalysisMs","adaptiveState","adaptiveDownshiftCount","adaptiveUpshiftCount"],"shortQuery":{"va":"1 enables the server default VA overlay profile with lightweight tracking for person/vehicle categories","overlay":"legacy alias for va=1","analysis":"alias for va=1"},"advancedQuery":{"tracking":"optional object tracking on/off","trackingClasses":"optional comma-separated categories/classes: person,vehicle,road,animal,sports,tableware,food,furniture,device,object or '*' for all","fps":"optional VA wall-clock sampling fps override","maxQueue":"optional detector queue override","frameSampleInterval":"optional deterministic decoded-frame sampling interval; 1 means every decoded frame after fps gate","sampleEveryNFrames":"alias for frameSampleInterval","maxFrameAgeMs":"optional stale analysis frame drop threshold; 0 disables age drop","adaptive":"optional adaptive tuner on/off","adaptiveInputSize":"optional input size tuning on/off","adaptiveMinFps":"optional adaptive lower fps bound","adaptiveMaxFps":"optional adaptive upper fps bound","adaptiveMinInputWidth":"optional adaptive lower input width","adaptiveMinInputHeight":"optional adaptive lower input height","adaptiveCooldownMs":"optional adaptive action cooldown","overlayWaitMs":"optional max wait for near-PTS analysis result","overlaySyncToleranceMs":"optional allowed PTS distance for result matching","preprocess":"optional letterbox/stretch override","outputLayout":"optional YOLO output tensor layout: auto|channels-first|channels-last","boxFormat":"optional YOLO box format: cxcywh|xyxy","scoreMode":"optional YOLO score mode: auto|class-only|objectness-class|score-class|class-score","thickness":"optional box line thickness","drawLabels":"optional label visibility","trackIds":"optional track id labels on overlay","trackTrails":"optional track trail overlay","redaction":"optional person-mosaic/mosaic overlay redaction","redactionClasses":"optional comma-separated redaction categories/classes, default person","redactionBlockSize":"optional mosaic block size in pixels","redactionMarginRatio":"optional bbox expansion ratio for redaction"}})";
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
    const bool detached = session_manager.DetachAnalysisTap(tap_id);
    // 이벤트 룰 runtime은 enter/exit/line-crossing 이전 상태를 들고 있으므로 tap 수명과 함께 정리한다.
    ReleaseEventRuleRuntimeForKey("webrtc-overlay:" + tap_id);
    ReleaseEventRuleRuntimeForKey("tap-events:" + tap_id);
    ReleaseEventRuleRuntimeForKey("tap-overlay:" + tap_id);
    ReleaseEventRuleRuntimeForKey("tap-state-dump:" + tap_id);
    ReleaseEventRuleRuntimeForKey("tap-metrics:" + tap_id);
    return detached;
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
                                        const analysis::VaRuntimeSyncInfo& sync_info) {
    analysis::VaRuntimeMetadataBuildOptions options;
    options.schema = analysis::kWebRtcVaMetadataSchema;
    options.include_source = false;
    options.include_scenarios = false;
    options.include_metrics = false;
    options.include_tracking_issue_report = false;
    options.include_missed_tracks = false;
    options.sync = sync_info;
    return analysis::SerializeVaRuntimeMetadataFrameForWebRtcJson(
        analysis::BuildVaRuntimeMetadataFrame(result, events, options));
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
        << "\"limit\":" << result.limit << ","
        << "\"hasMore\":" << (result.has_more ? "true" : "false") << ","
        << "\"truncated\":" << (result.truncated ? "true" : "false") << ","
        << "\"skippedCorruptLines\":" << result.skipped_corrupt_lines << ","
        << "\"storage\":{"
        << "\"enabled\":" << (snapshot.enabled ? "true" : "false") << ","
        << "\"path\":\"" << JsonEscape(snapshot.path) << "\","
        << "\"exists\":" << (result.file_exists ? "true" : "false") << ","
        << "\"queueSize\":" << snapshot.queue_size << ","
        << "\"maxQueueSize\":" << snapshot.max_queue_size << ","
        << "\"enqueuedCount\":" << snapshot.enqueued_count << ","
        << "\"storedCount\":" << snapshot.stored_count << ","
        << "\"failedCount\":" << snapshot.failed_count << ","
        << "\"droppedCount\":" << snapshot.dropped_count
        << "}"
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

// /tmp에 남은 최신 검증 산출물을 Lab UI에서 선택할 수 있는 JSON 목록으로 만든다.
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
                        WebRtcVaMetadataMessageJson(evaluation.annotated_result, evaluation.events, sync_info));
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
                        WebRtcVaMetadataMessageJson(evaluation.annotated_result, evaluation.events, sync_info));
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

std::string LabImportJobJson(const LabImportJobSnapshot& job) {
    std::ostringstream out;
    out << "{"
        << "\"jobId\":\"" << JsonEscape(job.job_id) << "\","
        << "\"provider\":\"" << JsonEscape(job.provider) << "\","
        << "\"sourceUrl\":\"" << JsonEscape(job.source_url) << "\","
        << "\"requestedFileName\":\"" << JsonEscape(job.requested_file_name) << "\","
        << "\"storedFileToken\":\"" << JsonEscape(job.stored_file_token) << "\","
        << "\"status\":\"" << JsonEscape(job.status) << "\","
        << "\"error\":\"" << JsonEscape(job.error_message) << "\","
        << "\"log\":\"" << JsonEscape(job.log_excerpt) << "\","
        << "\"exitCode\":" << job.exit_code << ","
        << "\"createdAtMs\":" << job.created_at_ms << ","
        << "\"updatedAtMs\":" << job.updated_at_ms << ","
        << "\"startedAtMs\":" << job.started_at_ms << ","
        << "\"finishedAtMs\":" << job.finished_at_ms
        << "}";
    return out.str();
}

std::string LabImportJobsJson(const std::vector<LabImportJobSnapshot>& jobs) {
    std::ostringstream out;
    out << "{\"jobs\":[";
    for (std::size_t i = 0; i < jobs.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << LabImportJobJson(jobs[i]);
    }
    out << "]}";
    return out.str();
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

    // 간단한 내장 HTTP 서버다. 연결마다 짧은 thread를 만들어 signaling 요청을 처리한다.
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

            std::thread([this, client_fd] {
                auto request_opt = ReadHttpRequest(client_fd);
                HttpResponse response;
                bool response_sent = false;
                if (!request_opt.has_value()) {
                    response.status = 400;
                    response.status_text = "Bad Request";
                    response.body = "bad request";
                } else {
                    const HttpRequest& request = *request_opt;
                    response = [&]() -> HttpResponse {
                        if (request.method == "OPTIONS") {
                            return HttpResponse{};
                        }

                        const auto query = ParseQueryString(request.query);
                        const auto& config = app::GetAppConfig();
                        const std::string route_path = "/" + config.stream_route;
                        auto stream_metadata_sse_response = [&](const std::string& tap_id,
                                                                bool detach_on_close) -> HttpResponse {
                            response_sent = true;
                            impl_->active_sse_metadata_clients.fetch_add(1);
                            (void)StreamVaMetadataSse(client_fd, running_, impl_->session_manager, tap_id, query);
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
                                client_fd, running_, impl_->session_manager, tap_id, query, websocket_key);
                            impl_->active_ws_metadata_clients.fetch_sub(1);
                            if (detach_on_close) {
                                (void)DetachAnalysisTapAndReleaseRuntimes(impl_->session_manager, tap_id);
                            }
                            return HttpResponse{};
                        };

                        if (request.method == "GET" && request.path == "/health") {
                            HttpResponse ok;
                            ok.content_type = "application/json; charset=utf-8";
                            ok.body = "{\"status\":\"ok\"}";
                            return ok;
                        }

                        if (request.method == "GET" && request.path == "/favicon.ico") {
                            HttpResponse no_content;
                            no_content.status = 204;
                            no_content.status_text = "No Content";
                            no_content.content_type = "image/x-icon";
                            return no_content;
                        }

                        if (request.method == "GET" && request.path == "/webrtc/test") {
                            HttpResponse ok;
                            ok.content_type = "text/html; charset=utf-8";
                            ok.headers["Cache-Control"] = "no-store";
                            ok.body = BuildTestPageHtml(false);
                            return ok;
                        }

                        if (request.method == "GET" && request.path == "/webrtc/config") {
                            HttpResponse ok = JsonResponse(200, "OK", WebRtcBrowserConfigJson());
                            ok.headers["Cache-Control"] = "no-store";
                            return ok;
                        }

                        if (request.method == "GET" && request.path == "/lab") {
                            HttpResponse ok;
                            ok.content_type = "text/html; charset=utf-8";
                            ok.headers["Cache-Control"] = "no-store";
                            ok.body = BuildTestPageHtml(true);
                            return ok;
                        }

                        if (request.method == "GET" && request.path == "/lab/rules") {
                            HttpResponse ok;
                            ok.content_type = "text/html; charset=utf-8";
                            ok.headers["Cache-Control"] = "no-store";
                            ok.body = BuildLabRuleEditorPageHtml();
                            return ok;
                        }

                        if (request.method == "GET" && request.path == "/lab/import") {
                            HttpResponse ok;
                            ok.content_type = "text/html; charset=utf-8";
                            ok.headers["Cache-Control"] = "no-store";
                            ok.body = BuildLabImportPageHtml();
                            return ok;
                        }

                        if (request.method == "GET" && request.path == "/lab/import/jobs") {
                            return JsonResponse(200, "OK",
                                                LabImportJobsJson(impl_->lab_import_manager.ListJobs()));
                        }

                        if (request.method == "POST" && request.path == "/lab/import/jobs") {
                            LabImportJobRequest import_request;
                            import_request.provider =
                                ParseStringField(request.body, "provider").value_or("youtube");
                            import_request.url = ParseStringField(request.body, "url").value_or("");
                            import_request.target_file_name =
                                ParseStringField(request.body, "targetFileName").value_or("");
                            std::string error_message;
                            const LabImportJobSnapshot job =
                                impl_->lab_import_manager.CreateJob(import_request, &error_message);
                            if (!error_message.empty()) {
                                return JsonResponse(400, "Bad Request",
                                                    "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                            }
                            return JsonResponse(200, "OK",
                                                "{\"job\":" + LabImportJobJson(job) + "}");
                        }

                        if (request.method == "GET" &&
                            request.path.rfind("/lab/import/jobs/", 0) == 0) {
                            const std::string job_id = request.path.substr(std::string("/lab/import/jobs/").size());
                            const auto job = impl_->lab_import_manager.GetJob(job_id);
                            if (!job.has_value()) {
                                return JsonResponse(404, "Not Found",
                                                    "{\"error\":\"import job not found\"}");
                            }
                            return JsonResponse(200, "OK",
                                                "{\"job\":" + LabImportJobJson(*job) + "}");
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

                        if (request.method == "GET" && request.path == "/lab/runtime/status") {
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
                            return JsonResponse(200,
                                                "OK",
                                                RuntimeStatusJson(impl_->session_manager.GetRuntimeStateSnapshot(),
                                                                  http_egress_sessions,
                                                                  whip_publish_sessions,
                                                                  metadata_channel_stats,
                                                                  impl_->active_sse_metadata_clients.load(),
                                                                  impl_->active_ws_metadata_clients.load(),
                                                                  WebRtcSourceRegistry::Instance().Snapshots(),
                                                                  impl_->session_manager.AnalysisTapSnapshots()));
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

                        if (request.method == "GET" && request.path == "/lab/analysis/profiles") {
                            return JsonResponse(200, "OK", AnalysisProfilesJson());
                        }

                        if (request.method == "POST" && request.path == "/lab/analysis/profiles") {
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
                                std::string response_body;
                                std::string error_message;
                                if (!AnalysisRegistry().UpsertProfile(id, request.body, &response_body, &error_message)) {
                                    return JsonResponse(400, "Bad Request",
                                                        "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                                }
                                return JsonResponse(200, "OK", response_body);
                            }
                            if (request.method == "DELETE") {
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
                                std::string response_body;
                                std::string error_message;
                                if (!AnalysisRegistry().UpsertRule(id, request.body, &response_body, &error_message)) {
                                    return JsonResponse(400, "Bad Request",
                                                        "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                                }
                                return JsonResponse(200, "OK", response_body);
                            }
                            if (request.method == "DELETE") {
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
                                std::string response_body;
                                std::string error_message;
                                if (!AnalysisRegistry().UpsertVaRule(id, request.body, &response_body, &error_message)) {
                                    return JsonResponse(400, "Bad Request",
                                                        "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                                }
                                return JsonResponse(200, "OK", response_body);
                            }
                            if (request.method == "DELETE") {
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
                            // simple signaling: 서버가 offer를 만들고 브라우저/테스트 클라이언트가 answer를 돌려준다.
                            const std::string session_id = "webrtc-http-" + std::to_string(impl_->next_session_id.fetch_add(1));
                            const std::string ingress_client_id = session_id + "-ingress";
                            media::IngressRequest ingress_request = BuildHttpIngressRequest(route_path, query, ingress_client_id);
                            std::string va_rule_error;
                            if (!ApplyVideoAnalysisRuleToRequest(&ingress_request, &va_rule_error)) {
                                return JsonResponse(400, "Bad Request",
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
                                return JsonResponse(400, "Bad Request",
                                                    "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                            }
                            auto create_result = impl_->session_manager.CreateSession(
                                ingress_request,
                                [bridge](const media::Packet& packet) { bridge->HandleSample(packet); });
                            if (!create_result.ok) {
                                if (!analysis_tap_id.empty()) {
                                    DetachAnalysisTapAndReleaseRuntimes(impl_->session_manager, analysis_tap_id);
                                }
                                return JsonResponse(400, "Bad Request",
                                                    "{\"error\":\"" + JsonEscape(create_result.message) + "\"}");
                            }

                            if (!bridge->Start(session_id, create_result.stream, &error_message)) {
                                if (!analysis_tap_id.empty()) {
                                    DetachAnalysisTapAndReleaseRuntimes(impl_->session_manager, analysis_tap_id);
                                }
                                impl_->session_manager.CloseSession(ingress_client_id);
                                return JsonResponse(500, "Internal Server Error",
                                                    "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                            }

                            std::string offer;
                            if (!bridge->CreateOffer(&offer, &error_message)) {
                                bridge->Stop();
                                if (!analysis_tap_id.empty()) {
                                    DetachAnalysisTapAndReleaseRuntimes(impl_->session_manager, analysis_tap_id);
                                }
                                impl_->session_manager.CloseSession(ingress_client_id);
                                return JsonResponse(500, "Internal Server Error",
                                                    "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                            }

                            {
                                std::lock_guard lock(impl_->mu);
                                impl_->sessions.emplace(session_id,
                                                        Impl::SessionEntry{
                                                            .session_id = session_id,
                                                            .ingress_client_id = ingress_client_id,
                                                            .analysis_tap_id = analysis_tap_id,
                                                            .request = std::move(ingress_request),
                                                            .bridge = bridge,
                                                        });
                            }
                            return JsonResponse(200, "OK", SessionJson(session_id, offer));
                        }

                        if (request.method == "POST" && request.path == "/whep") {
                            // WHEP: 클라이언트 offer를 먼저 받고 서버가 answer SDP를 반환하는 consume endpoint다.
                            const std::string session_id = "whep-" + std::to_string(impl_->next_session_id.fetch_add(1));
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
                                                            .request = std::move(ingress_request),
                                                            .bridge = bridge,
                                                        });
                            }

                            HttpResponse created;
                            created.status = 201;
                            created.status_text = "Created";
                            created.content_type = "application/sdp";
                            created.headers["Location"] = "/whep/session/" + session_id;
                            created.body = answer;
                            return created;
                        }

                        if (request.method == "POST" && request.path == "/whip/publish") {
                            // WHIP publish: 브라우저/테스트 publisher를 sourceId로 등록해 source=webrtc 소비가 가능하게 한다.
                            const auto source_id_it = query.find("sourceId");
                            if (source_id_it == query.end() || source_id_it->second.empty()) {
                                return JsonResponse(400, "Bad Request",
                                                    "{\"error\":\"sourceId query parameter is required\"}");
                            }

                            const std::string session_id =
                                "whip-publish-" + std::to_string(impl_->next_session_id.fetch_add(1));
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
                                                                   .bridge = bridge,
                                                               });
                            }

                            HttpResponse created;
                            created.status = 201;
                            created.status_text = "Created";
                            created.content_type = "application/json; charset=utf-8";
                            created.headers["Location"] = "/whip/publish/session/" + session_id;
                            created.body = SourceJson(session_id, source_id_it->second, answer);
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

                        if (request.path.rfind(prefix, 0) == 0 || request.path.rfind(whep_prefix, 0) == 0) {
                            const bool is_whep = request.path.rfind(whep_prefix, 0) == 0;
                            const auto parsed = with_session(is_whep ? whep_prefix : prefix);
                            const std::string session_id = parsed.first;
                            const std::string suffix = parsed.second;

                            std::shared_ptr<WebRtcEgressSession> bridge;
                            std::string ingress_client_id;
                            std::string analysis_tap_id;
                            {
                                std::lock_guard lock(impl_->mu);
                                const auto it = impl_->sessions.find(session_id);
                                if (it == impl_->sessions.end()) {
                                    return HttpResponse{404, "Not Found", "text/plain; charset=utf-8", {}, "unknown session"};
                                }
                                bridge = it->second.bridge;
                                ingress_client_id = it->second.ingress_client_id;
                                analysis_tap_id = it->second.analysis_tap_id;
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
                                bridge->Stop();
                                if (!analysis_tap_id.empty()) {
                                    DetachAnalysisTapAndReleaseRuntimes(impl_->session_manager, analysis_tap_id);
                                }
                                impl_->session_manager.CloseSession(ingress_client_id);
                                {
                                    std::lock_guard lock(impl_->mu);
                                    impl_->sessions.erase(session_id);
                                }
                                return JsonResponse(200, "OK", "{\"ok\":true}");
                            }
                        }

                        if (request.path.rfind(whip_publish_prefix, 0) == 0) {
                            const auto parsed = with_session(whip_publish_prefix);
                            const std::string session_id = parsed.first;
                            const std::string suffix = parsed.second;

                            std::shared_ptr<WebRtcSourceSession> bridge;
                            {
                                std::lock_guard lock(impl_->mu);
                                const auto it = impl_->source_sessions.find(session_id);
                                if (it == impl_->source_sessions.end()) {
                                    return HttpResponse{404, "Not Found", "text/plain; charset=utf-8", {}, "unknown source session"};
                                }
                                bridge = it->second.bridge;
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
                    const std::string encoded = BuildHttpResponse(response);
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

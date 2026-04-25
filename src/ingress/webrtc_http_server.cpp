// 파일 용도: WebRTC simple signaling, WHEP consume, WHIP publish HTTP API를 구현한다.
#include "ingress/webrtc_http_server.h"

#include <arpa/inet.h>
#include <netinet/in.h>
#include <sys/socket.h>
#include <unistd.h>

#include <algorithm>
#include <atomic>
#include <cerrno>
#include <chrono>
#include <cctype>
#include <cstring>
#include <fstream>
#include <filesystem>
#include <iostream>
#include <mutex>
#include <optional>
#include <sstream>
#include <string>
#include <thread>
#include <unordered_map>
#include <utility>
#include <vector>

#include "app_config.h"
#include "analysis/event_post_dispatcher.h"
#include "analysis/event_rule_engine.h"
#include "analysis/overlay_renderer.h"
#include "analysis/snapshot_encoder.h"
#include "ingress/analysis_query.h"
#include "ingress/analysis_rule_registry.h"
#include "ingress/request_parser.h"
#include "ingress/lab_import_manager.h"
#include "ingress/webrtc_egress_session.h"
#include "ingress/webrtc_source_session.h"

namespace ingress {

namespace {

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
        out << ",\"queryOverride\":\"현재 단계에서는 va=1이 서버 기본 VA profile을 사용하고, "
               "fps/maxQueue/adaptive bounds 같은 고급 query가 있을 때만 override한다.\"}";
        return out.str();
    }

    std::string RulesJson() {
        std::lock_guard lock(mu_);
        EnsureLoadedLocked();
        std::ostringstream out;
        out << "{\"status\":\"registry\",\"storagePath\":\"" << JsonEscape(storage_path_.string()) << "\","
            << "\"scope\":\"저장된 rule은 va=1 overlay와 /lab/analysis/taps/{id}/events에서 런타임 판정에 사용한다. "
               "route/client별 자동 매칭은 아직 제한적이다.\","
            << "\"plannedRuleShape\":{\"id\":\"string\",\"enabled\":\"bool\","
            << "\"match\":{\"sourceKind\":\"file|rtsp|webrtc|http|hls|youtube|*\",\"route\":\"rtsp|webrtc|*\","
            << "\"clientId\":\"optional\"},\"analysis\":{\"profileId\":\"string\",\"detector\":\"dummy|yolo\","
            << "\"fps\":\"number\",\"maxQueue\":\"number\"},\"outputs\":{\"metadata\":\"bool\","
            << "\"snapshot\":\"bool\",\"overlay\":\"bool\",\"events\":\"bool\"},"
            << "\"eventActions\":{\"highlight\":{\"enabled\":\"bool\",\"mode\":\"blink\","
            << "\"durationMs\":\"number\",\"color\":\"#RRGGBB\"},\"post\":{\"enabled\":\"bool\","
            << "\"method\":\"POST\",\"url\":\"string\",\"payloadFormat\":\"media-server.va.event.v1\"}}},"
            << "\"rules\":";
        AppendDocumentsArray(out, rules_);
        out << ",\"notImplementedYet\":[\"automatic rule matching for non-VA streams\","
               "\"per-client rule override\",\"track-stable enter/exit/line-crossing\"]}";
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

    bool CreateProfile(const std::string& body, std::string* response, std::string* error_message) {
        return CreateDocument(true, body, response, error_message);
    }

    bool CreateRule(const std::string& body, std::string* response, std::string* error_message) {
        return CreateDocument(false, body, response, error_message);
    }

    bool UpsertProfile(const std::string& id, const std::string& body, std::string* response, std::string* error_message) {
        return UpsertDocument(true, id, body, response, error_message);
    }

    bool UpsertRule(const std::string& id, const std::string& body, std::string* response, std::string* error_message) {
        return UpsertDocument(false, id, body, response, error_message);
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

private:
    struct Document {
        std::string id;
        std::string body;
    };

    static std::string BuiltInProfilesArrayJson() {
        return R"([{"id":"server-default-va","detector":"server-config","adaptive":true,"description":"URL에는 va=1만 두고 detector/model/labels/fps 기본값은 stdafx.h/env 설정을 따른다. detector 부하가 높으면 fps부터 낮추고 필요 시 input size를 낮춘다."},{"id":"debug-dummy","detector":"dummy","fps":5,"maxQueue":2,"description":"raw decode/sampling lifecycle 확인용"},{"id":"yolo-fast","detector":"yolo","fps":8,"maxQueue":1,"preprocess":"letterbox","inputWidth":640,"inputHeight":640,"confidence":0.25,"nms":0.45,"adaptive":true,"description":"움직임이 큰 장면의 overlay 지연 최소화"},{"id":"yolo-balanced","detector":"yolo","fps":5,"maxQueue":2,"preprocess":"letterbox","inputWidth":640,"inputHeight":640,"confidence":0.35,"nms":0.45,"adaptive":true,"description":"기본 객체 감지 균형값"},{"id":"yolo-quality","detector":"yolo","fps":3,"maxQueue":2,"preprocess":"letterbox","inputWidth":960,"inputHeight":960,"confidence":0.35,"nms":0.45,"adaptive":true,"description":"정확도 우선, CPU 비용 증가"}])";
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
        return Document{*id, Trim(body)};
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
        out << "\n}\n";
    }

    mutable std::mutex mu_;
    bool loaded_{false};
    std::filesystem::path storage_path_;
    std::vector<Document> profiles_;
    std::vector<Document> rules_;
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
                    <label>FPS
                      <input id="analysisFpsInput" placeholder="자동" />
                    </label>
                    <label>Queue
                      <input id="analysisQueueInput" placeholder="자동" />
                    </label>
                  </div>
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                    <label>Overlay wait(ms)
                      <input id="analysisOverlayWaitInput" placeholder="자동" />
                    </label>
                    <label>PTS tolerance(ms)
                      <input id="analysisOverlayToleranceInput" placeholder="자동" />
                    </label>
                  </div>
                  <label>전처리
                    <select id="analysisPreprocessInput">
                      <option value="" selected>자동</option>
                      <option value="letterbox">letterbox</option>
                      <option value="stretch">stretch</option>
                    </select>
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
          <p>`/lab` 하나에서 스트림 재생, VA 분석, 룰 편집, 실험실 도구를 접고 펼치며 확인합니다. 다른 route는 자동화와 기존 링크 호환을 위해서만 유지합니다.</p>
        </div>
        <div class="lab-mode-grid">
          <div class="lab-mode-card"><strong>스트림 테스트</strong><span>file, RTSP, HTTP/HLS, WebRTC source를 같은 플레이어로 확인합니다.</span></div>
          <div class="lab-mode-card"><strong>VA 분석</strong><span>객체 감지 overlay와 label 언어를 서버 기본 profile로 빠르게 켭니다.</span></div>
          <div class="lab-mode-card"><strong>룰 편집</strong><span>영역, 객체 타입, 이벤트 전송 설정을 시각적으로 저장합니다.</span></div>
          <div class="lab-mode-card"><strong>실험 기능</strong><span>YouTube 직접 표출은 opt-in, 파일 다운로드는 개발용 샘플 생성 도구로 분리합니다.</span></div>
        </div>
        <details style="border:1px solid var(--line);border-radius:16px;padding:14px;background:rgba(255,255,255,0.04);">
          <summary style="cursor:pointer;font-weight:800;color:var(--ink);">표출 가능한 객체 타입 안내</summary>
          <p style="margin:10px 0 0;">현재 기본 YOLO 모델은 COCO 80개 객체 타입을 기준으로 합니다. 화면 표기는 한글 카테고리로 묶고, 서버 내부 rule 값은 COCO 영문 label을 그대로 사용합니다.</p>
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
        <details id="rule-editor" open class="lab-details">
          <summary style="cursor:pointer;font-weight:800;color:var(--ink);">시각적 룰 편집</summary>
          <p class="lab-detail-note">이벤트 판단 영역, 분석 객체, 이벤트 전송 설정을 한 곳에서 편집합니다. 위에서 선택한 스트림 소스를 룰 미리보기에도 그대로 사용합니다.</p>
          <div id="ruleEditorComponent" class="embedded-component" data-component-url="/lab/rules?embed=1">룰 편집기를 불러오는 중입니다.</div>
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
      grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
      gap: clamp(18px, 3vw, 30px);
      padding: clamp(18px, 3vw, 30px);
    }
    h1 { margin: 0 0 8px; font-size: clamp(30px, 4vw, 48px); letter-spacing: -0.055em; line-height: 0.98; }
    h2 { margin: 0; font-size: clamp(22px, 2.5vw, 32px); letter-spacing: -0.045em; }
    p { color: var(--muted); line-height: 1.5; }
    .controls {
      display: grid;
      gap: 12px;
      align-content: start;
      padding: 16px;
      border: 1px solid var(--line);
      border-radius: 22px;
      background: var(--details-bg);
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
    video {
      width: 100%;
      aspect-ratio: 16 / 9;
      background: #000;
      border-radius: 22px;
      border: 1px solid var(--line);
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
    #va-analysis {
      background: var(--details-bg) !important;
      border-radius: 22px !important;
      padding: 14px !important;
    }
    #va-analysis > summary {
      font-size: 1rem;
    }
    @media (max-width: 900px) {
      .hero, .grid {
        grid-template-columns: 1fr;
      }
      .lab-mode-card {
        grid-template-columns: 1fr;
      }
      main {
        width: min(100% - 20px, 720px);
      }
      h1 {
        font-size: clamp(28px, 9vw, 40px);
      }
      div[style*="grid-template-columns:1fr 1fr"] {
        grid-template-columns: 1fr !important;
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
        <div>
          <h1>)" + hero_title + R"(</h1>
)" + page_link + R"(          <p>)" + hero_body + R"(</p>
          <video id="video" autoplay playsinline controls></video>
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
            <video id="publisherVideo" autoplay playsinline controls muted></video>
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
    let publisherLocalIceCount = 0;
    let publisherRemoteIceCount = 0;
    let consumerEmptyIcePolls = 0;
    let publisherEmptyIcePolls = 0;
    const consumerTrackKinds = new Set();
    const publisherTrackKinds = new Set();

    function log(message) {
      const ts = new Date().toLocaleTimeString();
      logEl.textContent += `[${ts}] ${message}\n`;
      logEl.scrollTop = logEl.scrollHeight;
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
        const response = await fetch('/lab/files');
        if (!response.ok) return;
        const payload = await response.json();
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
        if (analysisFpsInputEl && analysisFpsInputEl.value) params.set('fps', analysisFpsInputEl.value);
        if (analysisQueueInputEl && analysisQueueInputEl.value) params.set('maxQueue', analysisQueueInputEl.value);
        if (analysisOverlayWaitInputEl && analysisOverlayWaitInputEl.value) {
          params.set('overlayWaitMs', analysisOverlayWaitInputEl.value);
        }
        if (analysisOverlayToleranceInputEl && analysisOverlayToleranceInputEl.value) {
          params.set('overlaySyncToleranceMs', analysisOverlayToleranceInputEl.value);
        }
        if (analysisPreprocessInputEl && analysisPreprocessInputEl.value) {
          params.set('preprocess', analysisPreprocessInputEl.value);
        }
      }
      return params.toString();
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
      pc = new RTCPeerConnection();
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
      pc = new RTCPeerConnection();
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
      publisherPc = new RTCPeerConnection();
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
    updateSourceFields();
    loadFileOptions();
    window.__mediaServerTestApi = {
      startSimple,
      startWhep,
      stopSession,
      startPublish,
      stopPublisher,
      playPublishedSimple,
      playPublishedWhep,
      buildQuery,
      waitForPlayback,
      snapshotState,
      collectPeerStats
    };
    hydrateLabComponents().catch((error) => log(`컴포넌트 로드 실패: ${error.message}`));
    window.addEventListener('beforeunload', () => { stopSession(); stopPublisher(); });
  </script>
</body>
</html>)";
}

std::string BuildLabRuleEditorPageHtml() {
    return R"RULEPAGE(<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>VA 룰 편집기</title>
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
      max-height: 280px;
      overflow: auto;
      padding-right: 4px;
    }
    .check-grid label {
      display: flex;
      align-items: center;
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
    button.mini-button {
      padding: 9px 10px;
      font-size: 12px;
      border-radius: 999px;
    }
    .preview-panel {
      border: 1px solid var(--line);
      border-radius: 18px;
      background: var(--soft-bg);
      padding: 16px;
      display: grid;
      gap: 10px;
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
    .hint { margin: 0; font-size: 0.9rem; color: var(--muted); }
    @media (max-width: 980px) {
      .grid, .row { grid-template-columns: 1fr; }
      .check-grid { grid-template-columns: 1fr 1fr; }
      .class-filter-row { grid-template-columns: 1fr; }
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
      <h1>VA 룰 편집기</h1>
      <p style="margin:0;">숫자를 JSON으로 직접 적지 않고, profile 성능값과 이벤트 룰을 한글 UI로 구성합니다. 룰은 “어떤 영역에서 어떤 객체를 판단할지”를 저장하는 형태입니다.</p>
    </section>

    <section class="grid">
      <div class="card">
        <div class="pad stack">
          <h2>1. 분석 Profile</h2>
          <p class="hint">detector 처리량과 품질을 정하는 값입니다. 저장된 profile은 rule에서 선택할 수 있습니다.</p>
          <label>저장된 Profile
            <select id="profileSelect"></select>
          </label>
          <div class="row">
            <label>Profile ID
              <input id="profileId" value="fast-local" />
            </label>
            <label>Detector
              <select id="profileDetector">
                <option value="yolo">YOLO</option>
                <option value="dummy">Dummy</option>
              </select>
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
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
            <button id="newProfileBtn" class="secondary">새 Profile</button>
            <button id="saveProfileBtn">Profile 저장</button>
            <button id="deleteProfileBtn" class="danger">Profile 삭제</button>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="pad stack">
          <h2>2. 이벤트 Rule</h2>
          <p class="hint">영역과 객체 타입을 지정합니다. 저장된 룰은 `va=1` overlay와 events API에 바로 적용됩니다. 단 진입/이탈/라인 통과는 tracker 연결 전까지 detection index 기준의 1차 판정입니다.</p>
          <label>저장된 Rule
            <select id="ruleSelect"></select>
          </label>
          <div class="row">
            <label>Rule ID
              <input id="ruleId" value="file-person-car-area" />
            </label>
            <label>사용 여부
              <select id="ruleEnabled">
                <option value="true" selected>사용</option>
                <option value="false">사용 안 함</option>
              </select>
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
          <div class="row">
            <label>사용할 Profile
              <select id="ruleProfileId"></select>
            </label>
            <label>이벤트 타입
              <select id="ruleEventType">
                <option value="presence" selected>영역 내 객체 감지(권장)</option>
                <option value="enter">영역 진입(1차)</option>
                <option value="exit">영역 이탈(1차)</option>
                <option value="line-crossing">라인 통과(1차/양방향)</option>
              </select>
            </label>
          </div>
          <label>분석할 객체 타입</label>
          <div class="class-tools">
            <div class="class-filter-row">
              <label>카테고리 필터
                <select id="classFilterInput">
                  <option value="" selected>전체 카테고리 보기</option>
                  <option value="사람">사람</option>
                  <option value="차량">차량</option>
                  <option value="도로">도로</option>
                  <option value="동물">동물</option>
                  <option value="운동">운동</option>
                  <option value="식기">식기</option>
                  <option value="음식">음식</option>
                  <option value="가구">가구</option>
                  <option value="기기">기기</option>
                  <option value="잡화">잡화</option>
                </select>
              </label>
              <p class="hint">객체 값은 COCO label 기준으로 고정되어 있어 직접 입력하지 않고 카테고리별로 선택합니다.</p>
            </div>
            <div class="pill-grid">
              <button id="selectCoreClassesBtn" class="secondary mini-button">주요 객체</button>
              <button id="selectVehicleClassesBtn" class="secondary mini-button">사람/차량</button>
              <button id="selectAnimalClassesBtn" class="secondary mini-button">동물</button>
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
          <div class="preview-panel">
            <h2 style="font-size:18px;">영역 배경 영상</h2>
            <p class="hint">메인 `/lab` 상단에서 선택한 소스를 그대로 사용해 캔버스 배경 프레임을 표시합니다. 룰 편집 안에서는 별도 파일을 다시 고르지 않습니다.</p>
            <label style="display:flex;align-items:center;gap:8px;">
              <input id="autoPreviewInput" type="checkbox" />
              룰 설정 중 메인 영상 프레임 보기
            </label>
            <button id="stopPreviewBtn" class="secondary">영상 보기 중지</button>
            <p id="previewStatus" class="hint">꺼져 있습니다. 필요할 때만 켜서 영역을 맞추세요.</p>
          </div>
          <label id="geometryLabel">이벤트 판단 영역</label>
          <div class="canvas-wrap">
            <canvas id="regionCanvas" width="960" height="540"></canvas>
          </div>
          <p id="geometryHint" class="hint">캔버스를 클릭해 다각형 꼭짓점을 추가합니다. 3개 이상이면 영역으로 저장됩니다. 최대 12개까지 지정할 수 있습니다. 기존 점 근처를 드래그하면 새 점을 만들지 않고 점 위치를 이동합니다.</p>
          <div class="card" style="box-shadow:none;background:rgba(255,255,255,0.04);">
            <div class="pad stack" style="padding:16px;">
              <h2 style="font-size:18px;">이벤트 발생 시 동작</h2>
              <p class="hint">저장된 룰은 va=1 overlay와 events API에서 바로 판정됩니다. 깜빡임 강조와 POST 전송 워커가 적용됩니다.</p>
              <label style="display:flex;align-items:center;gap:8px;">
                <input id="eventFlashInput" type="checkbox" checked />
                이벤트가 발생한 객체를 overlay에서 깜빡임으로 강조
              </label>
              <div class="row">
                <label>깜빡임 시간(ms)
                  <input id="eventFlashMsInput" type="number" min="100" max="10000" value="1200" />
                </label>
                <label>강조 색상
                  <input id="eventFlashColorInput" type="color" value="#ffcc00" />
                </label>
              </div>
              <label>이벤트 POST URL
                <input id="eventPostUrlInput" placeholder="https://example.internal/events" />
              </label>
              <p class="hint">사용자는 URL만 입력합니다. 이벤트 payload format은 서버에서 고정하며 아래 preview는 수정할 수 없습니다. 실제 POST 전송은 `MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED=1`일 때만 수행됩니다.</p>
              <label>고정 POST payload 예시
                <textarea id="eventPayloadPreview" readonly spellcheck="false"></textarea>
              </label>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
            <button id="clearRegionBtn" class="secondary">영역 지우기</button>
            <button id="saveRuleBtn">Rule 저장</button>
            <button id="deleteRuleBtn" class="danger">Rule 삭제</button>
          </div>
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
      </section>

      <section class="card">
        <div class="pad stack">
          <h2>상태</h2>
          <pre id="statusBox">준비 중...</pre>
        </div>
      </section>
    </details>
  </main>

  <script>
    const classes = [
      { value: 'person', category: '사람', label: '단독', group: 'person core' },
      { value: 'bicycle', category: '차량', label: '자전거', group: 'vehicle core' },
      { value: 'car', category: '차량', label: '자동차', group: 'vehicle core' },
      { value: 'motorcycle', category: '차량', label: '오토바이', group: 'vehicle core' },
      { value: 'airplane', category: '차량', label: '비행기', group: 'vehicle' },
      { value: 'bus', category: '차량', label: '버스', group: 'vehicle core' },
      { value: 'train', category: '차량', label: '기차', group: 'vehicle' },
      { value: 'truck', category: '차량', label: '트럭', group: 'vehicle core' },
      { value: 'boat', category: '차량', label: '보트', group: 'vehicle' },
      { value: 'traffic light', category: '도로', label: '신호등', group: 'traffic core' },
      { value: 'fire hydrant', category: '도로', label: '소화전', group: 'traffic' },
      { value: 'stop sign', category: '도로', label: '정지 표지판', group: 'traffic core' },
      { value: 'parking meter', category: '도로', label: '주차 미터기', group: 'traffic' },
      { value: 'bird', category: '동물', label: '새', group: 'animal' },
      { value: 'cat', category: '동물', label: '고양이', group: 'animal' },
      { value: 'dog', category: '동물', label: '강아지', group: 'animal core' },
      { value: 'horse', category: '동물', label: '말', group: 'animal' },
      { value: 'sheep', category: '동물', label: '양', group: 'animal' },
      { value: 'cow', category: '동물', label: '소', group: 'animal' },
      { value: 'elephant', category: '동물', label: '코끼리', group: 'animal' },
      { value: 'bear', category: '동물', label: '곰', group: 'animal' },
      { value: 'zebra', category: '동물', label: '얼룩말', group: 'animal' },
      { value: 'giraffe', category: '동물', label: '기린', group: 'animal' },
      { value: 'backpack', category: '잡화', label: '백팩', group: 'object' },
      { value: 'umbrella', category: '잡화', label: '우산', group: 'object' },
      { value: 'handbag', category: '잡화', label: '핸드백', group: 'object' },
      { value: 'tie', category: '잡화', label: '넥타이', group: 'object' },
      { value: 'suitcase', category: '잡화', label: '여행가방', group: 'object' },
      { value: 'frisbee', category: '운동', label: '프리스비', group: 'sports' },
      { value: 'skis', category: '운동', label: '스키', group: 'sports' },
      { value: 'snowboard', category: '운동', label: '스노보드', group: 'sports' },
      { value: 'sports ball', category: '운동', label: '공', group: 'sports' },
      { value: 'kite', category: '운동', label: '연', group: 'sports' },
      { value: 'baseball bat', category: '운동', label: '야구 배트', group: 'sports' },
      { value: 'baseball glove', category: '운동', label: '야구 글러브', group: 'sports' },
      { value: 'skateboard', category: '운동', label: '스케이트보드', group: 'sports' },
      { value: 'surfboard', category: '운동', label: '서프보드', group: 'sports' },
      { value: 'tennis racket', category: '운동', label: '테니스 라켓', group: 'sports' },
      { value: 'bottle', category: '식기', label: '병', group: 'tableware' },
      { value: 'wine glass', category: '식기', label: '와인잔', group: 'tableware' },
      { value: 'cup', category: '식기', label: '컵', group: 'tableware' },
      { value: 'fork', category: '식기', label: '포크', group: 'tableware' },
      { value: 'knife', category: '식기', label: '칼', group: 'tableware' },
      { value: 'spoon', category: '식기', label: '숟가락', group: 'tableware' },
      { value: 'bowl', category: '식기', label: '그릇', group: 'tableware' },
      { value: 'banana', category: '음식', label: '바나나', group: 'food' },
      { value: 'apple', category: '음식', label: '사과', group: 'food' },
      { value: 'sandwich', category: '음식', label: '샌드위치', group: 'food' },
      { value: 'orange', category: '음식', label: '오렌지', group: 'food' },
      { value: 'broccoli', category: '음식', label: '브로콜리', group: 'food' },
      { value: 'carrot', category: '음식', label: '당근', group: 'food' },
      { value: 'hot dog', category: '음식', label: '핫도그', group: 'food' },
      { value: 'pizza', category: '음식', label: '피자', group: 'food' },
      { value: 'donut', category: '음식', label: '도넛', group: 'food' },
      { value: 'cake', category: '음식', label: '케이크', group: 'food' },
      { value: 'bench', category: '가구', label: '벤치', group: 'furniture' },
      { value: 'chair', category: '가구', label: '의자', group: 'furniture' },
      { value: 'couch', category: '가구', label: '소파', group: 'furniture' },
      { value: 'potted plant', category: '가구', label: '화분', group: 'furniture' },
      { value: 'bed', category: '가구', label: '침대', group: 'furniture' },
      { value: 'dining table', category: '가구', label: '식탁', group: 'furniture' },
      { value: 'toilet', category: '가구', label: '변기', group: 'furniture' },
      { value: 'tv', category: '기기', label: 'TV', group: 'electronics' },
      { value: 'laptop', category: '기기', label: '노트북', group: 'electronics' },
      { value: 'mouse', category: '기기', label: '마우스', group: 'electronics' },
      { value: 'remote', category: '기기', label: '리모컨', group: 'electronics' },
      { value: 'keyboard', category: '기기', label: '키보드', group: 'electronics' },
      { value: 'cell phone', category: '기기', label: '휴대폰', group: 'electronics' },
      { value: 'microwave', category: '기기', label: '전자레인지', group: 'appliance' },
      { value: 'oven', category: '기기', label: '오븐', group: 'appliance' },
      { value: 'toaster', category: '기기', label: '토스터', group: 'appliance' },
      { value: 'sink', category: '가구', label: '싱크대', group: 'appliance' },
      { value: 'refrigerator', category: '기기', label: '냉장고', group: 'appliance' },
      { value: 'book', category: '잡화', label: '책', group: 'object' },
      { value: 'clock', category: '기기', label: '시계', group: 'object' },
      { value: 'vase', category: '잡화', label: '꽃병', group: 'object' },
      { value: 'scissors', category: '잡화', label: '가위', group: 'object' },
      { value: 'teddy bear', category: '잡화', label: '곰인형', group: 'object' },
      { value: 'hair drier', category: '기기', label: '헤어드라이어', group: 'object' },
      { value: 'toothbrush', category: '잡화', label: '칫솔', group: 'object' }
    ];
    const classCategoryOrder = ['사람', '차량', '도로', '동물', '운동', '식기', '음식', '가구', '기기', '잡화'];
    classes.sort((left, right) => {
      const leftCategoryIndex = classCategoryOrder.indexOf(left.category);
      const rightCategoryIndex = classCategoryOrder.indexOf(right.category);
      const leftOrder = leftCategoryIndex >= 0 ? leftCategoryIndex : 999;
      const rightOrder = rightCategoryIndex >= 0 ? rightCategoryIndex : 999;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return left.label.localeCompare(right.label, 'ko');
    });
    let builtInProfiles = [];
    let profiles = [];
    let rules = [];
    let previewTapId = '';
    let previewTimer = null;
    let previewImage = null;
    let previewFailureCount = 0;
    let previewSourceLabel = '';
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

    const $ = (id) => document.getElementById(id);
    const canvas = $('regionCanvas');
    const ctx = canvas.getContext('2d');

    function status(message, payload = null) {
      $('statusBox').textContent = payload ? `${message}\n${JSON.stringify(payload, null, 2)}` : message;
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

    function selectedClasses() {
      return Array.from(document.querySelectorAll('[data-class-check]:checked')).map((el) => el.value);
    }

    function setCheckedClasses(predicate) {
      document.querySelectorAll('[data-class-check]').forEach((el) => {
        const group = el.dataset.classGroup || '';
        el.checked = predicate(el.value, group, el);
      });
      updatePreviews();
    }

    function filterClassChecks() {
      const selectedCategory = ($('classFilterInput').value || '').trim();
      document.querySelectorAll('[data-class-item]').forEach((el) => {
        const category = el.dataset.category || '';
        el.classList.toggle('is-hidden', selectedCategory.length > 0 && category !== selectedCategory);
      });
      document.querySelectorAll('[data-class-group-title]').forEach((title) => {
        const category = title.dataset.category || '';
        const visibleCount = Array.from(document.querySelectorAll(`[data-class-item][data-category="${category}"]`))
          .filter((el) => !el.classList.contains('is-hidden'))
          .length;
        title.classList.toggle('is-hidden', visibleCount === 0);
      });
    }

    function isLineRule() {
      return $('ruleEventType').value === 'line-crossing';
    }

    function maxGeometryPoints() {
      return isLineRule() ? lineMaxPoints : polygonMaxPoints;
    }

    function minimumGeometryPoints() {
      return isLineRule() ? lineMaxPoints : 3;
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

    function normalizeGeometryForMode() {
      const maxPoints = maxGeometryPoints();
      regionPoints = regionPoints.map(clampPoint).slice(0, maxPoints);
      if (isLineRule() && regionPoints.length < lineMaxPoints) {
        regionPoints = defaultLinePoints();
      }
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
        adaptive: $('profileAdaptive').checked
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
          color: $('eventFlashColorInput').value || '#ffcc00'
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
      return {
        schema: 'media-server.va.event.v1',
        eventId: 'evt_20260425_000001',
        timestamp: '2026-04-25T00:00:00.000Z',
        rule: {
          id: $('ruleId').value.trim() || 'file-person-car-area',
          type: $('ruleEventType').value
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
    }

    function ruleJson() {
      normalizeGeometryForMode();
      const lineMode = isLineRule();
      const points = regionPoints.map((point) => ({
        x: Number(point.x.toFixed(4)),
        y: Number(point.y.toFixed(4))
      }));
      const region = {
        type: lineMode ? 'line' : 'polygon',
        points
      };
      if (lineMode) {
        region.direction = 'any';
      }
      return {
        id: $('ruleId').value.trim() || 'file-person-car-area',
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
          type: $('ruleEventType').value,
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
    }

    function updateRangeLabels() {
      $('profileFpsValue').textContent = $('profileFps').value;
      $('profileQueueValue').textContent = $('profileQueue').value;
      $('profileConfidenceValue').textContent = `${$('profileConfidence').value}%`;
      $('profileNmsValue').textContent = `${$('profileNms').value}%`;
      $('ruleConfidenceValue').textContent = `${$('ruleConfidence').value}%`;
    }

    function updateGeometryText() {
      const lineMode = isLineRule();
      $('geometryLabel').textContent = lineMode ? '이벤트 판단 선' : '이벤트 판단 영역';
      $('clearRegionBtn').textContent = lineMode ? '선 지우기' : '영역 지우기';
      $('geometryHint').textContent = lineMode
        ? '라인 통과 룰은 선분의 시작/끝 2개 점만 사용합니다. 방향은 현재 any(양방향)로 저장합니다. 기존 점 근처를 드래그하면 점 위치를 이동합니다.'
        : `캔버스를 클릭해 다각형 꼭짓점을 추가합니다. 3개 이상이면 영역으로 저장됩니다. 최대 ${polygonMaxPoints}개까지 지정할 수 있습니다. 기존 점 근처를 드래그하면 새 점을 만들지 않고 점 위치를 이동합니다.`;
    }

    function updatePreviews() {
      normalizeGeometryForMode();
      updateRangeLabels();
      updateGeometryText();
      filterClassChecks();
      $('profileJsonPreview').value = JSON.stringify(profileJson(), null, 2);
      const currentRule = ruleJson();
      $('ruleJsonPreview').value = JSON.stringify(currentRule, null, 2);
      $('eventPayloadPreview').value = JSON.stringify(eventPayloadExampleJson(currentRule.event.region), null, 2);
      drawRegion();
    }

    function renderClassChecks() {
      const container = $('classChecks');
      container.innerHTML = '';
      let lastCategory = '';
      for (const item of classes) {
        const { value, category, label, group } = item;
        if (category !== lastCategory) {
          const title = document.createElement('div');
          title.className = 'class-group-title';
          title.dataset.classGroupTitle = '1';
          title.dataset.category = category;
          title.textContent = category;
          container.appendChild(title);
          lastCategory = category;
        }
        const wrapper = document.createElement('label');
        wrapper.dataset.classItem = '1';
        wrapper.dataset.category = category;
        wrapper.dataset.search = `${value} ${category} ${label} ${group}`;
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = value;
        input.dataset.classCheck = '1';
        input.dataset.classGroup = group;
        input.checked = value === 'person' || value === 'car' || value === 'bus' || value === 'truck';
        input.addEventListener('change', updatePreviews);
        wrapper.appendChild(input);
        const displayLabel = category === '사람' ? `${category} ${label}` : `${category}(${label})`;
        wrapper.appendChild(document.createTextNode(`${displayLabel} · ${value}`));
        container.appendChild(wrapper);
      }
      filterClassChecks();
    }

    async function loadPreviewFileOptions() {
      const select = $('previewFileSelect');
      if (!select) return;
      try {
        const payload = await requestJson('/lab/files');
        const files = Array.isArray(payload.files) ? payload.files : [];
        if (files.length === 0) return;
        const previous = select.dataset.loaded === '1'
          ? select.value
          : (payload.defaultFile || select.value || 'sample_h264.mp4');
        select.innerHTML = '';
        for (const file of files) {
          addOption(select, file, file);
        }
        select.value = files.includes(previous) ? previous : files[0];
        select.dataset.loaded = '1';
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
      params.delete('va');
      params.delete('labelLang');
      params.delete('overlayWaitMs');
      params.delete('overlaySyncToleranceMs');
      params.set('detector', 'dummy');
      params.set('fps', '4');
      params.set('maxQueue', '1');
      params.set('adaptive', '1');
      return params;
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
        previewStatus(`메인 영상 프레임 보기 실행 중: ${previewSourceLabel}`);
        drawRegion();
      };
      image.onerror = () => {
        previewFailureCount += 1;
        if (previewFailureCount >= 4) {
          previewStatus('아직 프레임을 준비 중입니다. 파일 디코딩 또는 분석 tap 상태를 확인 중입니다.');
        }
      };
      image.src = `/lab/analysis/taps/${encodeURIComponent(previewTapId)}/snapshot.jpg?quality=72&_=${Date.now()}`;
    }

    async function startRulePreview() {
      await stopRulePreview({ silent: true });
      const params = buildPreviewParamsFromParent();
      previewSourceLabel = describePreviewSource(params);
      previewStatus('미리보기 tap 생성 중...');
      const payload = await requestJson(`/lab/analysis/taps?${params.toString()}`, { method: 'POST' });
      previewTapId = payload.tapId || '';
      setRulePreviewUi(true);
      previewStatus(`메인 영상 프레임 보기 시작: ${previewSourceLabel}`);
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

    async function refreshRegistry() {
      const [profilePayload, rulePayload] = await Promise.all([
        requestJson('/lab/analysis/profiles'),
        requestJson('/lab/analysis/rules')
      ]);
      builtInProfiles = Array.isArray(profilePayload.builtInProfiles) ? profilePayload.builtInProfiles : [];
      profiles = Array.isArray(profilePayload.profiles) ? profilePayload.profiles : [];
      rules = Array.isArray(rulePayload.rules) ? rulePayload.rules : [];
      renderProfileSelects();
      renderRuleSelect();
      updatePreviews();
      status('목록을 불러왔습니다.', {
        builtInProfiles: builtInProfiles.length,
        profiles: profiles.length,
        rules: rules.length
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
      updatePreviews();
    }

    function loadRule(item) {
      $('ruleId').value = item.id || 'file-person-car-area';
      $('ruleEnabled').value = item.enabled === false ? 'false' : 'true';
      $('ruleSourceKind').value = item.match?.sourceKind || '*';
      $('ruleRoute').value = item.match?.route || '*';
      $('ruleProfileId').value = item.analysis?.profileId || $('ruleProfileId').value;
      $('ruleEventType').value = item.event?.type || 'presence';
      const classSet = new Set(item.analysis?.classes || []);
      document.querySelectorAll('[data-class-check]').forEach((el) => {
        el.checked = classSet.size === 0 ? (el.value === 'person' || el.value === 'car') : classSet.has(el.value);
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
      }
      const eventActions = item.eventActions || {};
      const highlight = eventActions.highlight || {};
      const post = eventActions.post || {};
      $('eventFlashInput').checked = highlight.enabled !== false;
      $('eventFlashMsInput').value = Number(highlight.durationMs || 1200);
      $('eventFlashColorInput').value = typeof highlight.color === 'string' && highlight.color
        ? highlight.color
        : '#ffcc00';
      $('eventPostUrlInput').value = typeof post.url === 'string' ? post.url : '';
      updatePreviews();
    }

    async function saveProfile() {
      const payload = profileJson();
      const response = await requestJson(`/lab/analysis/profiles/${encodeURIComponent(payload.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      await refreshRegistry();
      $('profileSelect').value = `custom:${payload.id}`;
      status(`Profile 저장 완료: ${payload.id}`, response);
    }

    async function deleteProfile() {
      const id = $('profileId').value.trim();
      if (!id) throw new Error('삭제할 profile id가 없습니다.');
      const response = await requestJson(`/lab/analysis/profiles/${encodeURIComponent(id)}`, { method: 'DELETE' });
      await refreshRegistry();
      status(`Profile 삭제 완료: ${id}`, response);
    }

    async function saveRule() {
      const payload = ruleJson();
      const response = await requestJson(`/lab/analysis/rules/${encodeURIComponent(payload.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      await refreshRegistry();
      $('ruleSelect').value = `custom:${payload.id}`;
      status(`Rule 저장 완료: ${payload.id}`, response);
    }

    async function deleteRule() {
      const id = $('ruleId').value.trim();
      if (!id) throw new Error('삭제할 rule id가 없습니다.');
      const response = await requestJson(`/lab/analysis/rules/${encodeURIComponent(id)}`, { method: 'DELETE' });
      await refreshRegistry();
      status(`Rule 삭제 완료: ${id}`, response);
    }

    function drawRegion() {
      const lineMode = isLineRule();
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
        ctx.fillText('방향: any(양방향)', 16, 36);
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

    canvas.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      const point = clampPoint(canvasPointFromEvent(event));
      const hitIndex = hitTestPointIndex(point);
      didDragPoint = false;
      if (hitIndex >= 0) {
        draggingPointIndex = hitIndex;
        canvas.setPointerCapture(event.pointerId);
        return;
      }
      if (regionPoints.length >= maxGeometryPoints()) {
        status(`${isLineRule() ? '선' : '영역'} 점은 최대 ${maxGeometryPoints()}개까지 지정할 수 있습니다. 기존 점을 드래그해서 위치를 바꿔주세요.`);
        return;
      }
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

    $('clearRegionBtn').onclick = () => {
      regionPoints = isLineRule() ? defaultLinePoints() : [];
      updatePreviews();
    };
    $('newProfileBtn').onclick = () => {
      $('profileSelect').value = '';
      loadProfile({ id: 'fast-local', detector: 'yolo', fps: 6, maxQueue: 1, confidence: 0.25, nms: 0.45, inputWidth: 640, inputHeight: 640, adaptive: true });
    };
    $('saveProfileBtn').onclick = () => saveProfile().catch((error) => status(`Profile 저장 실패: ${error.message}`));
    $('deleteProfileBtn').onclick = () => deleteProfile().catch((error) => status(`Profile 삭제 실패: ${error.message}`));
    $('saveRuleBtn').onclick = () => saveRule().catch((error) => status(`Rule 저장 실패: ${error.message}`));
    $('deleteRuleBtn').onclick = () => deleteRule().catch((error) => status(`Rule 삭제 실패: ${error.message}`));
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
    $('classFilterInput').addEventListener('change', filterClassChecks);
    $('selectCoreClassesBtn').onclick = () => setCheckedClasses((value, group) => group.includes('core'));
    $('selectVehicleClassesBtn').onclick = () => setCheckedClasses((value, group) => value === 'person' || group.includes('vehicle'));
    $('selectAnimalClassesBtn').onclick = () => setCheckedClasses((value, group) => group.includes('animal'));
    $('selectAllClassesBtn').onclick = () => setCheckedClasses(() => true);
    $('clearClassesBtn').onclick = () => setCheckedClasses(() => false);
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
    $('ruleSelect').onchange = () => {
      const value = $('ruleSelect').value;
      if (!value) {
        loadRule({
          id: 'file-person-car-area',
          enabled: true,
          match: { sourceKind: 'file', route: '*' },
          analysis: { profileId: $('ruleProfileId').value, classes: ['person', 'car', 'bus', 'truck'] },
          event: { type: 'presence', minConfidence: 0.25, minDurationMs: 0, region: { type: 'polygon', points: regionPoints } },
          eventActions: {
            highlight: { enabled: true, mode: 'blink', target: 'matched-object', durationMs: 1200, color: '#ffcc00' },
            post: { enabled: false, method: 'POST', url: '', contentType: 'application/json', payloadFormat: 'media-server.va.event.v1' }
          }
        });
        return;
      }
      const [, id] = value.split(':');
      const item = rules.find((entry) => entry.id === id);
      if (item) loadRule(item);
    };
    for (const id of ['profileFps', 'profileQueue', 'profileConfidence', 'profileNms', 'profileInputWidth', 'profileInputHeight', 'profileDetector', 'profileAdaptive', 'profileId', 'ruleId', 'ruleEnabled', 'ruleSourceKind', 'ruleRoute', 'ruleProfileId', 'ruleEventType', 'ruleConfidence', 'ruleMinDurationMs', 'eventFlashInput', 'eventFlashMsInput', 'eventFlashColorInput', 'eventPostUrlInput']) {
      const el = $(id);
      if (el) el.addEventListener('input', updatePreviews);
      if (el) el.addEventListener('change', updatePreviews);
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
    window.addEventListener('resize', notifyEmbedHeight);
    if (window.ResizeObserver) {
      new ResizeObserver(notifyEmbedHeight).observe(document.body);
    }
    setInterval(notifyEmbedHeight, 1500);
    $('themeToggleBtn').onclick = () => {
      applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    };
    applyTheme(document.documentElement.dataset.theme);

    renderClassChecks();
    setRulePreviewUi(false);
    updatePreviews();
    loadPreviewFileOptions();
    refreshRegistry().catch((error) => status(`목록 로드 실패: ${error.message}`));
    window.addEventListener('beforeunload', () => { stopRulePreview({ silent: true }); });
  </script>
</body>
</html>)RULEPAGE";
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

std::string DetectionJson(const analysis::Detection& detection) {
    std::ostringstream out;
    out << "{"
        << "\"classId\":" << detection.class_id << ","
        << "\"label\":\"" << JsonEscape(detection.label) << "\","
        << "\"score\":" << detection.score << ","
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

std::string AnalysisResultJson(const analysis::AnalysisResult& result) {
    std::ostringstream out;
    out << "{"
        << "\"sourceKey\":\"" << JsonEscape(result.source_key) << "\","
        << "\"profileKey\":\"" << JsonEscape(result.profile_key) << "\","
        << "\"pts\":" << result.pts << ","
        << "\"detections\":[";
    for (std::size_t i = 0; i < result.detections.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << DetectionJson(result.detections[i]);
    }
    out << "],"
        << "\"tracks\":" << result.tracks.size() << ","
        << "\"poseKeypoints\":" << result.pose_keypoints.size()
        << "}";
    return out.str();
}

std::string AnalysisTapSnapshotJson(const analysis::AnalysisManager::TapSnapshot& snapshot) {
    std::ostringstream out;
    out << "{"
        << "\"tapId\":\"" << JsonEscape(snapshot.tap_id) << "\","
        << "\"streamKey\":\"" << JsonEscape(snapshot.stream_key) << "\","
        << "\"profileKey\":\"" << JsonEscape(snapshot.profile_key) << "\","
        << "\"detectorType\":\"" << JsonEscape(snapshot.detector_type) << "\","
        << "\"targetFps\":" << snapshot.target_fps << ","
        << "\"maxQueueSize\":" << snapshot.max_queue_size << ","
        << "\"modelInputWidth\":" << snapshot.model_input_width << ","
        << "\"modelInputHeight\":" << snapshot.model_input_height << ","
        << "\"debugDetectorDelayMs\":" << snapshot.debug_detector_delay_ms << ","
        << "\"confidenceThreshold\":" << snapshot.confidence_threshold << ","
        << "\"nmsThreshold\":" << snapshot.nms_threshold << ","
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
        << "\"decoderErrors\":" << snapshot.decoder_errors << ","
        << "\"pendingFrames\":" << snapshot.pending_frames << ","
        << "\"lastAnalysisMs\":" << snapshot.last_analysis_ms << ","
        << "\"averageAnalysisMs\":" << snapshot.average_analysis_ms << ","
        << "\"maxAnalysisMs\":" << snapshot.max_analysis_ms << ","
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

std::string AnalysisCapabilitiesJson() {
    return R"({"detectors":[{"id":"dummy","name":"Dummy detector","runtime":"builtin"},{"id":"yolo","name":"YOLO ONNX Runtime","runtime":"onnxruntime","requiresBuildFlag":"MEDIA_SERVER_USE_ONNXRUNTIME"}],"preprocessModes":["letterbox","stretch"],"outputs":["metadata","events","snapshot.jpg","overlay.jpg","rtsp-overlay","webrtc-overlay"],"eventTypes":["presence","enter","exit","line-crossing"],"eventActions":{"highlight":"blink overlay for matched object","post":"async curl-based POST worker with bounded queue and cooldown"},"metrics":["receivedVideoPackets","decodedFrames","sampledFrames","analyzedPackets","droppedPackets","pendingFrames","lastAnalysisMs","averageAnalysisMs","maxAnalysisMs","adaptiveState","adaptiveDownshiftCount","adaptiveUpshiftCount"],"shortQuery":{"va":"1 enables the server default VA overlay profile","overlay":"legacy alias for va=1","analysis":"alias for va=1"},"advancedQuery":{"fps":"optional VA sampling fps override","maxQueue":"optional detector queue override","adaptive":"optional adaptive tuner on/off","adaptiveInputSize":"optional input size tuning on/off","adaptiveMinFps":"optional adaptive lower fps bound","adaptiveMaxFps":"optional adaptive upper fps bound","adaptiveMinInputWidth":"optional adaptive lower input width","adaptiveMinInputHeight":"optional adaptive lower input height","adaptiveCooldownMs":"optional adaptive action cooldown","overlayWaitMs":"optional max wait for near-PTS analysis result","overlaySyncToleranceMs":"optional allowed PTS distance for result matching","preprocess":"optional letterbox/stretch override","thickness":"optional box line thickness","drawLabels":"optional label visibility"}})";
}

std::string AnalysisProfilesJson() {
    return AnalysisRegistry().ProfilesJson();
}

std::string AnalysisRulesJson() {
    return AnalysisRegistry().RulesJson();
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
    ReleaseEventRuleRuntimeForKey("webrtc-overlay:" + tap_id);
    ReleaseEventRuleRuntimeForKey("tap-events:" + tap_id);
    ReleaseEventRuleRuntimeForKey("tap-overlay:" + tap_id);
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
        << ",\"url\":\"" << JsonEscape(event.post_url) << "\"}"
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

bool IsSupportedMediaFile(const std::filesystem::path& path) {
    std::string ext = path.extension().string();
    std::transform(ext.begin(), ext.end(), ext.begin(), [](unsigned char ch) {
        return static_cast<char>(std::tolower(ch));
    });
    return ext == ".mp4" || ext == ".mov" || ext == ".mkv" || ext == ".webm" || ext == ".m4v";
}

std::string LabFilesJson() {
    const auto root = std::filesystem::path(app::GetAppConfig().file_root_path);
    std::vector<std::string> files;
    std::error_code ec;
    if (std::filesystem::exists(root, ec) && std::filesystem::is_directory(root, ec)) {
        for (std::filesystem::recursive_directory_iterator it(root, std::filesystem::directory_options::skip_permission_denied, ec);
             !ec && it != std::filesystem::recursive_directory_iterator();
             it.increment(ec)) {
            if (!it->is_regular_file(ec) || !IsSupportedMediaFile(it->path())) {
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

    std::string default_file = std::filesystem::path(app::GetAppConfig().default_file_path).filename().string();
    std::error_code relative_ec;
    const auto default_relative =
        std::filesystem::relative(std::filesystem::path(app::GetAppConfig().default_file_path), root, relative_ec);
    if (!relative_ec && !default_relative.empty() && default_relative.native().find("..") == std::string::npos) {
        default_file = default_relative.generic_string();
    }

    std::ostringstream out;
    out << "{\"root\":\"" << JsonEscape(root.filename().string()) << "\","
        << "\"defaultFile\":\"" << JsonEscape(default_file) << "\","
        << "\"files\":[";
    for (std::size_t i = 0; i < files.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << "\"" << JsonEscape(files[i]) << "\"";
    }
    out << "]}";
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
    overlay_config.render_options = BuildOverlayRenderOptionsFromQuery(query);
    overlay_config.sync_tolerance_ns = static_cast<std::int64_t>(timing_options.sync_tolerance_ms) * 1000000LL;
    overlay_config.wait_timeout_ms = timing_options.wait_timeout_ms;
    auto event_runtime = EventRuleRuntimeForKey("webrtc-overlay:" + attach_result.tap_id);
    overlay_config.result_provider =
        [&session_manager,
         tap_id = attach_result.tap_id,
         weak_bridge,
         event_runtime,
         tolerance_ns = overlay_config.sync_tolerance_ns,
         wait_timeout_ms = overlay_config.wait_timeout_ms](std::int64_t frame_pts)
            -> std::optional<analysis::AnalysisResult> {
            const auto bridge_lock = weak_bridge.lock();
            const std::int64_t source_pts =
                bridge_lock != nullptr ? bridge_lock->ResolveOverlaySourcePts(frame_pts) : frame_pts;
            auto result = session_manager.WaitAnalysisResultNearPts(
                tap_id, source_pts, tolerance_ns, std::chrono::milliseconds(wait_timeout_ms));
            if (result.has_value()) {
                const auto evaluation = EvaluateStoredEventRules(*result, event_runtime);
                analysis::DispatchEventPosts(evaluation.annotated_result, evaluation.events);
                return evaluation.annotated_result;
            }
            const auto snapshot = session_manager.AnalysisTapSnapshot(tap_id);
            if (!snapshot.has_value() || !snapshot->latest_result.has_value()) {
                return std::optional<analysis::AnalysisResult>{};
            }
            const auto evaluation = EvaluateStoredEventRules(*snapshot->latest_result, event_runtime);
            analysis::DispatchEventPosts(evaluation.annotated_result, evaluation.events);
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
        const ssize_t bytes = send(fd, data.data() + sent, data.size() - sent, 0);
        if (bytes <= 0) {
            return false;
        }
        sent += static_cast<std::size_t>(bytes);
    }
    return true;
}

}  // namespace

std::vector<std::string> AnalysisRuleDocumentsSnapshot() {
    return AnalysisRegistry().RuleDocuments();
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

                        if (request.method == "GET" && request.path == "/lab/analysis/capabilities") {
                            return JsonResponse(200, "OK", AnalysisCapabilitiesJson());
                        }

                        if (request.method == "GET" && request.path == "/lab/analysis/event-post/status") {
                            return JsonResponse(200, "OK", AnalysisEventPostStatusJson());
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

                        if (request.path == "/lab/analysis/taps") {
                            if (request.method == "GET") {
                                return JsonResponse(200, "OK",
                                                    "{\"activeTaps\":" +
                                                        std::to_string(impl_->session_manager.ActiveAnalysisTapCount()) + "}");
                            }

                            if (request.method == "POST") {
                                const std::string tap_client_id =
                                    "analysis-http-" + std::to_string(impl_->next_session_id.fetch_add(1));
                                media::IngressRequest ingress_request =
                                    BuildHttpIngressRequest(route_path, query, tap_client_id);
                                auto result = impl_->session_manager.AttachAnalysisTap(
                                    ingress_request, BuildAnalysisProfileFromQuery(query));
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

                            if (request.method == "GET" && suffix == "/metadata") {
                                const auto result = impl_->session_manager.AnalysisTapSnapshot(tap_id);
                                if (!result.has_value()) {
                                    return JsonResponse(404, "Not Found",
                                                        "{\"error\":\"analysis tap not found\"}");
                                }
                                return JsonResponse(200, "OK",
                                                    AnalysisMetadataJson(tap_id, result->latest_result));
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
                                const auto evaluation = EvaluateStoredEventRules(
                                    *latest->result, EventRuleRuntimeForKey("tap-overlay:" + tap_id));
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
                            auto bridge = std::make_shared<WebRtcEgressSession>();
                            std::string analysis_tap_id;
                            std::string error_message;
                            if (!AttachWebRtcAnalysisOverlay(
                                    impl_->session_manager, ingress_request, query, bridge, &analysis_tap_id, &error_message)) {
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
                            auto bridge = std::make_shared<WebRtcEgressSession>();
                            std::string analysis_tap_id;
                            std::string error_message;
                            if (!AttachWebRtcAnalysisOverlay(
                                    impl_->session_manager, ingress_request, query, bridge, &analysis_tap_id, &error_message)) {
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

                const std::string encoded = BuildHttpResponse(response);
                (void)SendAll(client_fd, encoded);
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

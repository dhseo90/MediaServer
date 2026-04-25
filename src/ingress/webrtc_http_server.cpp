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
#include "analysis/overlay_renderer.h"
#include "analysis/snapshot_encoder.h"
#include "ingress/analysis_query.h"
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
            << "\"scope\":\"현재 단계에서는 rule을 저장/관리하고, 실제 요청 자동 적용은 다음 단계에서 연결한다.\","
            << "\"plannedRuleShape\":{\"id\":\"string\",\"enabled\":\"bool\","
            << "\"match\":{\"sourceKind\":\"file|rtsp|webrtc|http|hls|youtube|*\",\"route\":\"rtsp|webrtc|*\","
            << "\"clientId\":\"optional\"},\"analysis\":{\"profileId\":\"string\",\"detector\":\"dummy|yolo\","
            << "\"fps\":\"number\",\"maxQueue\":\"number\"},\"outputs\":{\"metadata\":\"bool\","
            << "\"snapshot\":\"bool\",\"overlay\":\"bool\",\"events\":\"bool\"}},"
            << "\"rules\":";
        AppendDocumentsArray(out, rules_);
        out << ",\"notImplementedYet\":[\"automatic rule matching\",\"per-client rule override\",\"event engine\"]}";
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
                                      ? "          <p style=\"margin:0 0 14px;\"><a href=\"/webrtc/test\">안정 테스트 페이지로 이동</a></p>\n"
                                      : "          <p style=\"margin:0 0 14px;\"><a href=\"/lab\">실험실 페이지로 이동</a></p>\n";
    const std::string youtube_option =
        youtube_enabled ? "              <option value=\"youtube\">YouTube watch/live URL (실험실)</option>\n"
                        : std::string();
    const std::string experimental_note =
        lab_mode
            ? (youtube_enabled
                   ? "          <p style=\"margin:0;color:var(--muted);font-size:0.9rem;\">이 서버에서는 실험실 YouTube 소스가 켜져 있습니다. `yt-dlp`를 사용하며 로그인, 지역 제한, bot check에 따라 실패할 수 있습니다.</p>\n"
                   : "          <p style=\"margin:0;color:var(--muted);font-size:0.9rem;\">실험실 페이지는 열려 있지만 `source=youtube`는 `MEDIA_SERVER_ENABLE_EXPERIMENTAL_YOUTUBE_SOURCE=1`로 서버를 시작해야만 활성화됩니다.</p>\n")
            : "          <p style=\"margin:0;color:var(--muted);font-size:0.9rem;\">이 화면은 안정 테스트용입니다. 개발 전용 옵션은 `/lab`에서 확인하세요.</p>\n";
    const std::string analysis_controls = lab_mode
                                              ? R"(          <details style="border:1px solid var(--line);border-radius:16px;padding:12px;background:rgba(255,255,255,0.04);">
            <summary style="cursor:pointer;font-weight:700;color:var(--ink);">VA 분석</summary>
            <div style="display:grid;gap:10px;margin-top:12px;">
              <label style="display:flex;align-items:center;gap:8px;">
                <input id="analysisOverlayInput" type="checkbox" style="width:auto;" />
                서버 기본 VA profile로 객체 감지 박스 합성
              </label>
              <p style="margin:0;color:var(--muted);font-size:0.88rem;">모델, 라벨, 기본 fps/queue는 서버 설정값을 사용합니다. URL에는 기본적으로 `va=1`만 붙습니다.</p>
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
                                      ? R"(    <section class="card" style="margin-top:20px;">
      <div style="padding:24px;display:grid;gap:12px;">
        <h2 style="margin:0;font-size:24px;letter-spacing:-0.02em;">실험실 바로가기</h2>
        <p style="margin:0;">이 페이지는 개발 전용 도구를 위한 화면입니다. URL 가져오기, 분석 디버그, 실험 소스 확인 기능을 같은 `/lab` 아래에 모읍니다.</p>
        <p style="margin:0;"><a href="/webrtc/test">안정 테스트 페이지로 이동</a> · <a href="/lab/import">실험실 가져오기 페이지 열기</a></p>
        <pre style="min-height:0;">예정 항목
- URL 가져오기 -> video/imports
- 가져오기 작업 상태 / 로그
- 분석 스냅샷 / 디버그 도구
- 실험 소스 장애 추적</pre>
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
  <style>
    :root {
      --bg: #0d1b1e;
      --panel: #163037;
      --ink: #ecf3ef;
      --muted: #9ab6ae;
      --accent: #ff8c42;
      --line: rgba(236,243,239,0.12);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Avenir Next", "Pretendard", sans-serif;
      color: var(--ink);
      background:
        radial-gradient(circle at top left, rgba(255,140,66,0.22), transparent 28%),
        linear-gradient(135deg, #081114 0%, var(--bg) 45%, #13282e 100%);
      min-height: 100vh;
    }
    main {
      max-width: 1100px;
      margin: 0 auto;
      padding: 32px 20px 48px;
    }
    .card {
      background: rgba(22,48,55,0.82);
      border: 1px solid var(--line);
      border-radius: 24px;
      backdrop-filter: blur(10px);
      box-shadow: 0 24px 60px rgba(0,0,0,0.24);
      overflow: hidden;
    }
    .hero {
      display: grid;
      grid-template-columns: 1.1fr 0.9fr;
      gap: 20px;
      padding: 24px;
    }
    h1 { margin: 0 0 8px; font-size: 34px; letter-spacing: -0.03em; }
    p { color: var(--muted); line-height: 1.5; }
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
    .source-field.is-hidden {
      display: none;
    }
    input, select, button, textarea {
      width: 100%;
      border-radius: 14px;
      border: 1px solid var(--line);
      background: rgba(9,20,23,0.92);
      color: var(--ink);
      padding: 12px 14px;
      font: inherit;
    }
    button {
      background: linear-gradient(135deg, var(--accent), #ffb067);
      color: #111;
      border: 0;
      font-weight: 700;
      cursor: pointer;
    }
    button.secondary {
      background: rgba(255,255,255,0.08);
      color: var(--ink);
      border: 1px solid var(--line);
    }
    a {
      color: #ffd09b;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    video {
      width: 100%;
      aspect-ratio: 16 / 9;
      background: #000;
      border-radius: 18px;
      border: 1px solid var(--line);
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      padding: 0 24px 24px;
    }
    textarea { min-height: 220px; }
    pre {
      white-space: pre-wrap;
      word-break: break-word;
      background: rgba(9,20,23,0.92);
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 16px;
      min-height: 220px;
      margin: 0;
      color: #cfe4db;
    }
    @media (max-width: 900px) {
      .hero, .grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <main>
    <section class="card">
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
    sourceTypeEl.addEventListener('change', updateSourceFields);
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
      waitForPlayback,
      snapshotState,
      collectPeerStats
    };
    window.addEventListener('beforeunload', () => { stopSession(); stopPublisher(); });
  </script>
</body>
</html>)";
}

std::string BuildLabImportPageHtml() {
    const bool youtube_enabled = app::GetAppConfig().enable_experimental_youtube_source;
    const std::string import_note =
        youtube_enabled
            ? "이 서버에서는 실험실 YouTube 가져오기가 켜져 있습니다. 완료된 작업은 `video/imports` 아래에 파일을 저장하며, 이후 기존 `file=` 경로로 relay/analysis 테스트에 재사용할 수 있습니다."
            : "현재 실험실 YouTube 가져오기는 꺼져 있습니다. lab 다운로드를 허용하려면 `MEDIA_SERVER_ENABLE_EXPERIMENTAL_YOUTUBE_SOURCE=1`로 서버를 시작하세요.";
    const std::string button_disabled = youtube_enabled ? std::string() : "disabled";
    return R"(<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>미디어 서버 실험실 가져오기</title>
  <style>
    :root {
      --bg: #12110d;
      --panel: #252114;
      --ink: #f5f0df;
      --muted: #c8bd9f;
      --accent: #f2b84b;
      --line: rgba(245,240,223,0.12);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Avenir Next", "Pretendard", sans-serif;
      color: var(--ink);
      background:
        radial-gradient(circle at top right, rgba(242,184,75,0.22), transparent 26%),
        linear-gradient(135deg, #0a0907 0%, var(--bg) 45%, #1b160d 100%);
      min-height: 100vh;
    }
    main {
      max-width: 1040px;
      margin: 0 auto;
      padding: 32px 20px 48px;
      display: grid;
      gap: 20px;
    }
    .card {
      background: rgba(37,33,20,0.86);
      border: 1px solid var(--line);
      border-radius: 24px;
      backdrop-filter: blur(10px);
      box-shadow: 0 24px 60px rgba(0,0,0,0.24);
      overflow: hidden;
      padding: 24px;
    }
    .hero {
      display: grid;
      grid-template-columns: 1.1fr 0.9fr;
      gap: 20px;
    }
    h1, h2 {
      margin: 0 0 10px;
      letter-spacing: -0.03em;
    }
    p, li { color: var(--muted); line-height: 1.5; }
    a { color: #ffe0a1; text-decoration: none; }
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
      background: rgba(10,9,7,0.92);
      color: var(--ink);
      padding: 12px 14px;
      font: inherit;
    }
    button {
      background: linear-gradient(135deg, var(--accent), #f6d27e);
      color: #221a08;
      border: 0;
      font-weight: 700;
      cursor: pointer;
    }
    button.secondary {
      background: rgba(255,255,255,0.08);
      color: var(--ink);
      border: 1px solid var(--line);
    }
    button:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
    pre {
      white-space: pre-wrap;
      word-break: break-word;
      background: rgba(10,9,7,0.92);
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 16px;
      min-height: 180px;
      margin: 0;
      color: #e9ddbe;
    }
    .jobs {
      display: grid;
      gap: 12px;
    }
    .job {
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 14px;
      background: rgba(10,9,7,0.58);
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
    @media (max-width: 900px) {
      .hero, .grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <main>
    <section class="card">
      <div class="hero">
        <div>
          <h1>실험실 가져오기</h1>
          <p><a href="/lab">실험실 메인으로 이동</a> · <a href="/webrtc/test">안정 테스트 페이지로 이동</a></p>
          <p>)" + import_note + R"(</p>
          <ul>
            <li>현재 provider: `youtube` experimental</li>
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
        << "}"
        << "}";
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
    return R"({"detectors":[{"id":"dummy","name":"Dummy detector","runtime":"builtin"},{"id":"yolo","name":"YOLO ONNX Runtime","runtime":"onnxruntime","requiresBuildFlag":"MEDIA_SERVER_USE_ONNXRUNTIME"}],"preprocessModes":["letterbox","stretch"],"outputs":["metadata","snapshot.jpg","overlay.jpg","rtsp-overlay","webrtc-overlay"],"metrics":["receivedVideoPackets","decodedFrames","sampledFrames","analyzedPackets","droppedPackets","pendingFrames","lastAnalysisMs","averageAnalysisMs","maxAnalysisMs","adaptiveState","adaptiveDownshiftCount","adaptiveUpshiftCount"],"shortQuery":{"va":"1 enables the server default VA overlay profile","overlay":"legacy alias for va=1","analysis":"alias for va=1"},"advancedQuery":{"fps":"optional VA sampling fps override","maxQueue":"optional detector queue override","adaptive":"optional adaptive tuner on/off","adaptiveInputSize":"optional input size tuning on/off","adaptiveMinFps":"optional adaptive lower fps bound","adaptiveMaxFps":"optional adaptive upper fps bound","adaptiveMinInputWidth":"optional adaptive lower input width","adaptiveMinInputHeight":"optional adaptive lower input height","adaptiveCooldownMs":"optional adaptive action cooldown","overlayWaitMs":"optional max wait for near-PTS analysis result","overlaySyncToleranceMs":"optional allowed PTS distance for result matching","preprocess":"optional letterbox/stretch override","thickness":"optional box line thickness","drawLabels":"optional label visibility"}})";
}

std::string AnalysisProfilesJson() {
    return AnalysisRegistry().ProfilesJson();
}

std::string AnalysisRulesJson() {
    return AnalysisRegistry().RulesJson();
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
    overlay_config.result_provider =
        [&session_manager,
         tap_id = attach_result.tap_id,
         weak_bridge,
         tolerance_ns = overlay_config.sync_tolerance_ns,
         wait_timeout_ms = overlay_config.wait_timeout_ms](std::int64_t frame_pts) {
            const auto bridge_lock = weak_bridge.lock();
            const std::int64_t source_pts =
                bridge_lock != nullptr ? bridge_lock->ResolveOverlaySourcePts(frame_pts) : frame_pts;
            auto result = session_manager.WaitAnalysisResultNearPts(
                tap_id, source_pts, tolerance_ns, std::chrono::milliseconds(wait_timeout_ms));
            if (result.has_value()) {
                return result;
            }
            const auto snapshot = session_manager.AnalysisTapSnapshot(tap_id);
            return snapshot.has_value() ? snapshot->latest_result : std::optional<analysis::AnalysisResult>{};
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
                                analysis::OverlayRenderOptions options;
                                options.line_thickness = ParseClampedIntQuery(query, "thickness", 3, 1, 16);
                                options.draw_labels = ParseBoolQuery(query, "drawLabels", true);
                                std::string error_message;
                                if (!analysis::RenderDetectionOverlay(
                                        latest->frame, *latest->result, options, &overlay_frame, &error_message)) {
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
                                if (!impl_->session_manager.DetachAnalysisTap(tap_id)) {
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
                                    impl_->session_manager.DetachAnalysisTap(analysis_tap_id);
                                }
                                return JsonResponse(400, "Bad Request",
                                                    "{\"error\":\"" + JsonEscape(create_result.message) + "\"}");
                            }

                            if (!bridge->Start(session_id, create_result.stream, &error_message)) {
                                if (!analysis_tap_id.empty()) {
                                    impl_->session_manager.DetachAnalysisTap(analysis_tap_id);
                                }
                                impl_->session_manager.CloseSession(ingress_client_id);
                                return JsonResponse(500, "Internal Server Error",
                                                    "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                            }

                            std::string offer;
                            if (!bridge->CreateOffer(&offer, &error_message)) {
                                bridge->Stop();
                                if (!analysis_tap_id.empty()) {
                                    impl_->session_manager.DetachAnalysisTap(analysis_tap_id);
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
                                    impl_->session_manager.DetachAnalysisTap(analysis_tap_id);
                                }
                                return HttpResponse{400, "Bad Request", "text/plain; charset=utf-8", {}, create_result.message};
                            }

                            if (!bridge->Start(session_id, create_result.stream, &error_message)) {
                                if (!analysis_tap_id.empty()) {
                                    impl_->session_manager.DetachAnalysisTap(analysis_tap_id);
                                }
                                impl_->session_manager.CloseSession(ingress_client_id);
                                return HttpResponse{500, "Internal Server Error", "text/plain; charset=utf-8", {}, error_message};
                            }
                            if (!bridge->SetRemoteOffer(request.body, &error_message)) {
                                bridge->Stop();
                                if (!analysis_tap_id.empty()) {
                                    impl_->session_manager.DetachAnalysisTap(analysis_tap_id);
                                }
                                impl_->session_manager.CloseSession(ingress_client_id);
                                return HttpResponse{400, "Bad Request", "text/plain; charset=utf-8", {}, error_message};
                            }

                            std::string answer;
                            if (!bridge->CreateAnswer(&answer, &error_message)) {
                                bridge->Stop();
                                if (!analysis_tap_id.empty()) {
                                    impl_->session_manager.DetachAnalysisTap(analysis_tap_id);
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
                                    impl_->session_manager.DetachAnalysisTap(analysis_tap_id);
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
            impl_->session_manager.DetachAnalysisTap(entry.analysis_tap_id);
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

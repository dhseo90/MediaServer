// 파일 요약: 운영 source registry와 PublishedView registry를 구현한다.
// 동작 요약: source 원본 URL은 ops API에만 노출하고 client API는 view scope에 맞는 공개 정보만 반환한다.
#include "ingress/source_view_registry.h"

#include <algorithm>
#include <cerrno>
#include <cctype>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <optional>
#include <sstream>
#include <utility>

#include "app_config.h"

#if !defined(_WIN32)
#include <fcntl.h>
#include <sys/stat.h>
#include <unistd.h>
#endif

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

std::string ToLower(std::string value) {
    std::transform(value.begin(), value.end(), value.begin(), [](unsigned char ch) {
        return static_cast<char>(std::tolower(ch));
    });
    return value;
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

bool LooksLikeJsonObject(const std::string& body) {
    const std::string trimmed = Trim(body);
    return trimmed.size() >= 2 && trimmed.front() == '{' && trimmed.back() == '}';
}

std::optional<std::size_t> FindJsonFieldColon(const std::string& body, const std::string& field) {
    const std::string needle = "\"" + field + "\"";
    std::size_t search_pos = 0;
    while (search_pos < body.size()) {
        const std::size_t pos = body.find(needle, search_pos);
        if (pos == std::string::npos) {
            return std::nullopt;
        }
        std::size_t after = pos + needle.size();
        while (after < body.size() && std::isspace(static_cast<unsigned char>(body[after])) != 0) {
            ++after;
        }
        if (after < body.size() && body[after] == ':') {
            return after;
        }
        search_pos = pos + needle.size();
    }
    return std::nullopt;
}

std::optional<std::string> ParseStringField(const std::string& body, const std::string& field) {
    const auto colon_pos = FindJsonFieldColon(body, field);
    if (!colon_pos.has_value()) {
        return std::nullopt;
    }
    std::size_t pos = body.find('"', *colon_pos + 1);
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

std::optional<int> ParseIntField(const std::string& body, const std::string& field) {
    const auto colon_pos = FindJsonFieldColon(body, field);
    if (!colon_pos.has_value()) {
        return std::nullopt;
    }
    std::size_t pos = *colon_pos + 1;
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
        return std::stoi(body.substr(pos, end - pos));
    } catch (...) {
        return std::nullopt;
    }
}

std::optional<std::uint64_t> ParseUInt64Field(const std::string& body, const std::string& field) {
    const auto colon_pos = FindJsonFieldColon(body, field);
    if (!colon_pos.has_value()) return std::nullopt;
    std::size_t pos = *colon_pos + 1;
    while (pos < body.size() && std::isspace(static_cast<unsigned char>(body[pos])) != 0) ++pos;
    std::size_t end = pos;
    while (end < body.size() && std::isdigit(static_cast<unsigned char>(body[end])) != 0) ++end;
    if (end == pos) return std::nullopt;
    try {
        return static_cast<std::uint64_t>(std::stoull(body.substr(pos, end - pos)));
    } catch (...) {
        return std::nullopt;
    }
}

std::optional<bool> ParseBoolField(const std::string& body, const std::string& field) {
    const auto colon_pos = FindJsonFieldColon(body, field);
    if (!colon_pos.has_value()) {
        return std::nullopt;
    }
    std::size_t pos = *colon_pos + 1;
    while (pos < body.size() && std::isspace(static_cast<unsigned char>(body[pos])) != 0) {
        ++pos;
    }
    if (body.compare(pos, 4, "true") == 0 || body.compare(pos, 1, "1") == 0) {
        return true;
    }
    if (body.compare(pos, 5, "false") == 0 || body.compare(pos, 1, "0") == 0) {
        return false;
    }
    return std::nullopt;
}

std::optional<std::string> ExtractDelimitedField(const std::string& body,
                                                 const std::string& field,
                                                 char open_ch,
                                                 char close_ch) {
    const auto colon_pos = FindJsonFieldColon(body, field);
    if (!colon_pos.has_value()) {
        return std::nullopt;
    }
    std::size_t pos = body.find(open_ch, *colon_pos + 1);
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

std::vector<std::string> ParseStringArrayField(const std::string& body, const std::string& field) {
    std::vector<std::string> values;
    const auto array = ExtractDelimitedField(body, field, '[', ']');
    if (!array.has_value()) {
        return values;
    }
    bool in_string = false;
    bool escaped = false;
    std::string current;
    for (std::size_t pos = 1; pos + 1 < array->size(); ++pos) {
        const char ch = (*array)[pos];
        if (!in_string) {
            if (ch == '"') {
                in_string = true;
                current.clear();
            }
            continue;
        }
        if (escaped) {
            switch (ch) {
                case 'n':
                    current.push_back('\n');
                    break;
                case 'r':
                    current.push_back('\r');
                    break;
                case 't':
                    current.push_back('\t');
                    break;
                default:
                    current.push_back(ch);
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
            const std::string trimmed = Trim(current);
            if (!trimmed.empty()) {
                values.push_back(trimmed);
            }
            in_string = false;
            continue;
        }
        current.push_back(ch);
    }
    return values;
}

std::optional<std::vector<std::string>> ExtractJsonObjectArrayStrict(const std::string& body,
                                                                     const std::string& field,
                                                                     std::string* error_message) {
    const auto array = ExtractDelimitedField(body, field, '[', ']');
    if (!array.has_value()) {
        if (error_message != nullptr) {
            *error_message = "registry file requires array field: " + field;
        }
        return std::nullopt;
    }

    std::vector<std::string> objects;
    bool in_string = false;
    bool escaped = false;
    int object_depth = 0;
    std::size_t object_start = std::string::npos;
    bool expect_value = true;
    bool saw_value = false;
    for (std::size_t pos = 1; pos + 1 < array->size(); ++pos) {
        const char ch = (*array)[pos];
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
            if (object_depth == 0 && !expect_value) {
                if (error_message != nullptr) {
                    *error_message = "registry array is missing comma between objects: " + field;
                }
                return std::nullopt;
            }
            if (object_depth == 0) {
                object_start = pos;
            }
            ++object_depth;
            continue;
        }
        if (ch == '}') {
            if (object_depth <= 0) {
                if (error_message != nullptr) {
                    *error_message = "registry array has unmatched object close: " + field;
                }
                return std::nullopt;
            }
            --object_depth;
            if (object_depth == 0 && object_start != std::string::npos) {
                objects.push_back(array->substr(object_start, pos - object_start + 1));
                object_start = std::string::npos;
                saw_value = true;
                expect_value = false;
            }
            continue;
        }
        if (object_depth == 0) {
            if (ch == ',') {
                if (expect_value) {
                    if (error_message != nullptr) {
                        *error_message = "registry array has an unexpected comma: " + field;
                    }
                    return std::nullopt;
                }
                expect_value = true;
                continue;
            }
            if (std::isspace(static_cast<unsigned char>(ch)) != 0) {
                continue;
            }
            if (error_message != nullptr) {
                *error_message = "registry array must contain JSON objects only: " + field;
            }
            return std::nullopt;
        }
    }
    if (object_depth != 0 || in_string || escaped) {
        if (error_message != nullptr) {
            *error_message = "registry array is malformed: " + field;
        }
        return std::nullopt;
    }
    if (expect_value && saw_value) {
        if (error_message != nullptr) {
            *error_message = "registry array has a trailing comma: " + field;
        }
        return std::nullopt;
    }
    return objects;
}

[[maybe_unused]] bool IsSafeRegistryId(const std::string& id) {
    return !id.empty() && std::all_of(id.begin(), id.end(), [](unsigned char ch) {
        return std::isalnum(ch) != 0 || ch == '-' || ch == '_' || ch == '.';
    });
}

bool IsNumericRegistryId(const std::string& id) {
    return !id.empty() && std::all_of(id.begin(), id.end(), [](unsigned char ch) {
        return std::isdigit(ch) != 0;
    });
}

bool ContainsString(const std::vector<std::string>& values, const std::string& wanted) {
    return std::find(values.begin(), values.end(), wanted) != values.end();
}

void AppendStringArray(std::ostream& out, const std::vector<std::string>& values) {
    out << "[";
    for (std::size_t i = 0; i < values.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << "\"" << JsonEscape(values[i]) << "\"";
    }
    out << "]";
}

void AppendOptionalStringField(std::ostream& out,
                               const std::string& key,
                               const std::string& value,
                               bool* first) {
    if (value.empty() || first == nullptr) {
        return;
    }
    if (!*first) {
        out << ",";
    }
    *first = false;
    out << "\"" << key << "\":\"" << JsonEscape(value) << "\"";
}

std::string NormalizeFileToken(const std::string& raw) {
    std::string value = UrlDecode(Trim(raw));
    std::replace(value.begin(), value.end(), '\\', '/');
    std::filesystem::path path(value);
    value = path.lexically_normal().generic_string();
    while (value.rfind("./", 0) == 0) {
        value.erase(0, 2);
    }
    return value == "." ? std::string() : value;
}

std::string CanonicalizeUrl(const std::string& raw) {
    std::string value = Trim(raw);
    const std::size_t fragment_pos = value.find('#');
    if (fragment_pos != std::string::npos) {
        value = value.substr(0, fragment_pos);
    }

    std::string query;
    const std::size_t query_pos = value.find('?');
    if (query_pos != std::string::npos) {
        query = value.substr(query_pos + 1);
        value = value.substr(0, query_pos);
    }

    const std::size_t scheme_pos = value.find("://");
    if (scheme_pos != std::string::npos) {
        const std::string scheme = ToLower(value.substr(0, scheme_pos));
        const std::size_t authority_start = scheme_pos + 3;
        const std::size_t path_pos = value.find('/', authority_start);
        if (path_pos == std::string::npos) {
            value = scheme + "://" + ToLower(value.substr(authority_start));
        } else {
            value = scheme + "://" + ToLower(value.substr(authority_start, path_pos - authority_start)) +
                    value.substr(path_pos);
        }
    }

    if (!query.empty()) {
        std::vector<std::pair<std::string, std::string>> pairs;
        std::size_t start = 0;
        while (start <= query.size()) {
            const std::size_t amp = query.find('&', start);
            const std::string item =
                query.substr(start, amp == std::string::npos ? std::string::npos : amp - start);
            if (!item.empty()) {
                const std::size_t eq = item.find('=');
                const std::string key = UrlDecode(eq == std::string::npos ? item : item.substr(0, eq));
                const std::string val = eq == std::string::npos ? std::string() : UrlDecode(item.substr(eq + 1));
                pairs.emplace_back(key, val);
            }
            if (amp == std::string::npos) {
                break;
            }
            start = amp + 1;
        }
        std::sort(pairs.begin(), pairs.end());
        value += "?";
        for (std::size_t i = 0; i < pairs.size(); ++i) {
            if (i != 0) {
                value += "&";
            }
            value += pairs[i].first + "=" + pairs[i].second;
        }
    }
    return value;
}

std::string InferSourceKind(const std::string& kind,
                            const std::string& file,
                            const std::string& rtsp_url,
                            const std::string& webrtc_source_id,
                            const std::string& whep_url,
                            const std::string& http_url) {
    const std::string normalized = ToLower(Trim(kind));
    if (!normalized.empty()) {
        return normalized;
    }
    if (!file.empty()) {
        return "file";
    }
    if (!rtsp_url.empty()) {
        return "rtsp";
    }
    if (!webrtc_source_id.empty()) {
        return "webrtc";
    }
    if (!whep_url.empty()) {
        return "whep";
    }
    if (!http_url.empty()) {
        return "http";
    }
    return std::string();
}

bool IsSupportedSourceKind(const std::string& kind) {
    if (kind == "youtube") {
        return app::kYouTubeSourceBuildEnabled;
    }
    return kind == "file" || kind == "rtsp" || kind == "webrtc" || kind == "whep" ||
           kind == "http" || kind == "hls";
}

bool HasHttpOrHttpsScheme(const std::string& value) {
    const std::string lower = ToLower(Trim(value));
    return lower.rfind("http://", 0) == 0 || lower.rfind("https://", 0) == 0;
}

int SourceLocatorCount(const SourceViewRegistry::SourceRecord& source) {
    return (source.file.empty() ? 0 : 1) +
           (source.rtsp_url.empty() ? 0 : 1) +
           (source.webrtc_source_id.empty() ? 0 : 1) +
           (source.whep_url.empty() ? 0 : 1) +
           (source.http_url.empty() ? 0 : 1);
}

bool SourceKindMatchesLocator(const SourceViewRegistry::SourceRecord& source) {
    if (source.kind == "file") {
        return !source.file.empty();
    }
    if (source.kind == "rtsp") {
        return !source.rtsp_url.empty();
    }
    if (source.kind == "webrtc") {
        return !source.webrtc_source_id.empty();
    }
    if (source.kind == "whep") {
        return !source.whep_url.empty();
    }
    if (source.kind == "http" || source.kind == "hls" || source.kind == "youtube") {
        return !source.http_url.empty();
    }
    return false;
}

std::string CanonicalSourceKey(const SourceViewRegistry::SourceRecord& source) {
    if (!source.file.empty()) {
        return "file:" + NormalizeFileToken(source.file);
    }
    if (!source.rtsp_url.empty()) {
        return "rtsp:" + CanonicalizeUrl(source.rtsp_url);
    }
    if (!source.webrtc_source_id.empty()) {
        return "webrtc:" + ToLower(Trim(source.webrtc_source_id));
    }
    if (!source.whep_url.empty()) {
        return "whep:" + CanonicalizeUrl(source.whep_url);
    }
    if (!source.http_url.empty()) {
        return "http:" + CanonicalizeUrl(source.http_url);
    }
    return std::string();
}

std::vector<SourceViewRegistry::SourceRecord> DefaultSourceRecords() {
    SourceViewRegistry::SourceRecord file_source;
    file_source.source_id = "1";
    file_source.display_name = "Sample H264";
    file_source.kind = "file";
    file_source.file = "sample_h264.mp4";
    file_source.enabled = true;
    file_source.canonical_source_key = CanonicalSourceKey(file_source);

    SourceViewRegistry::SourceRecord va_source;
    va_source.source_id = "2";
    va_source.display_name = "VA Test File";
    va_source.kind = "file";
    va_source.file = "va_four_scene_sample.mp4";
    va_source.enabled = true;
    va_source.canonical_source_key = CanonicalSourceKey(va_source);

    SourceViewRegistry::SourceRecord rtsp_source;
    rtsp_source.source_id = "3";
    rtsp_source.display_name = "Public RTSP Test";
    rtsp_source.kind = "rtsp";
    rtsp_source.rtsp_url = "rtsp://9627b0bf2a7b.entrypoint.cloud.wowza.com:1935/app-p5260J38/66abe4b9_stream1";
    rtsp_source.enabled = true;
    rtsp_source.canonical_source_key = CanonicalSourceKey(rtsp_source);

    SourceViewRegistry::SourceRecord http_source;
    http_source.source_id = "4";
    http_source.display_name = "Public HTTP HLS Test";
    http_source.kind = "http";
    http_source.http_url =
        "https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_ts/master.m3u8";
    http_source.enabled = true;
    http_source.canonical_source_key = CanonicalSourceKey(http_source);

    SourceViewRegistry::SourceRecord onvif_source;
    onvif_source.source_id = "5";
    onvif_source.display_name = "Public ONVIF Stream Sample";
    onvif_source.kind = "rtsp";
    onvif_source.rtsp_url = "rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_115k.mov";
    onvif_source.enabled = true;
    onvif_source.tags = {"onvif", "live", "public-stream"};
    onvif_source.canonical_source_key = CanonicalSourceKey(onvif_source);

    std::vector<SourceViewRegistry::SourceRecord> defaults = {
        file_source, va_source, rtsp_source, http_source, onvif_source};
    for (std::size_t i = 0; i < defaults.size(); ++i) {
        defaults[i].site = "Demo Site";
        defaults[i].group = i < 2 ? "Samples" : "External";
        defaults[i].floor = i < 2 ? "Lab Floor" : "Public Feeds";
        defaults[i].zone = defaults[i].tags.empty() ? "General" : "Live";
    }
    return defaults;
}

SourceViewRegistry::PublishedViewRecord DefaultPublishedViewRecord(
    const SourceViewRegistry::SourceRecord& source) {
    SourceViewRegistry::PublishedViewRecord view;
    view.view_id = source.source_id.empty() ? "1" : source.source_id;
    view.display_name = source.display_name.empty() ? "Default Channel" : source.display_name;
    view.source_id = source.source_id;
    view.allowed_overlay_modes = {"raw", "va-overlay", "va-rule"};
    view.show_dashboard = true;
    view.show_events = true;
    view.show_metadata_summary = true;
    view.max_tiles = 1;
    view.enabled = source.enabled;
    return view;
}

std::optional<SourceViewRegistry::SourceRecord> ParseSourceRecord(const std::string& body,
                                                                  const std::string& path_id,
                                                                  std::string* error_message) {
    if (!LooksLikeJsonObject(body)) {
        if (error_message != nullptr) {
            *error_message = "request body must be a JSON object";
        }
        return std::nullopt;
    }

    SourceViewRegistry::SourceRecord source;
    source.source_id = ParseStringField(body, "sourceId").value_or(ParseStringField(body, "id").value_or(""));
    source.source_id = Trim(source.source_id);
    if (!path_id.empty() && !source.source_id.empty() && source.source_id != path_id) {
        if (error_message != nullptr) {
            *error_message = "path sourceId and body sourceId must match";
        }
        return std::nullopt;
    }
    if (source.source_id.empty()) {
        source.source_id = path_id;
    }
    if (!IsNumericRegistryId(source.source_id)) {
        if (error_message != nullptr) {
            *error_message = "sourceId must be numeric";
        }
        return std::nullopt;
    }

    const std::string generic_url = ParseStringField(body, "url").value_or("");
    source.display_name = Trim(ParseStringField(body, "displayName").value_or(source.source_id));
    source.file = Trim(ParseStringField(body, "file").value_or(""));
    source.rtsp_url = Trim(ParseStringField(body, "rtspUrl").value_or(""));
    source.webrtc_source_id = Trim(ParseStringField(body, "webrtcSourceId").value_or(""));
    source.whep_url = Trim(ParseStringField(body, "whepUrl").value_or(""));
    source.http_url = Trim(ParseStringField(body, "httpUrl").value_or(""));
    source.kind = InferSourceKind(ParseStringField(body, "kind").value_or(""),
                                  source.file,
                                  source.rtsp_url,
                                  source.webrtc_source_id,
                                  source.whep_url,
                                  source.http_url);
    if (source.rtsp_url.empty() && source.kind == "rtsp" && !generic_url.empty()) {
        source.rtsp_url = Trim(generic_url);
    }
    if (source.whep_url.empty() && source.kind == "whep" && !generic_url.empty()) {
        source.whep_url = Trim(generic_url);
    }
    if (source.http_url.empty() &&
        (source.kind == "http" || source.kind == "hls" || source.kind == "youtube") &&
        !generic_url.empty()) {
        source.http_url = Trim(generic_url);
    }
    source.kind = InferSourceKind(source.kind,
                                  source.file,
                                  source.rtsp_url,
                                  source.webrtc_source_id,
                                  source.whep_url,
                                  source.http_url);
    if (!IsSupportedSourceKind(source.kind)) {
        if (error_message != nullptr) {
            *error_message = "unsupported source kind: " + source.kind;
        }
        return std::nullopt;
    }
    if (SourceLocatorCount(source) != 1 || !SourceKindMatchesLocator(source)) {
        if (error_message != nullptr) {
            *error_message = "source kind must match exactly one locator field";
        }
        return std::nullopt;
    }
    if (source.kind == "whep" && !HasHttpOrHttpsScheme(source.whep_url)) {
        if (error_message != nullptr) {
            *error_message = "whepUrl must be an http(s) WHEP endpoint URL";
        }
        return std::nullopt;
    }
    source.enabled = ParseBoolField(body, "enabled").value_or(true);
    source.tags = ParseStringArrayField(body, "tags");
    source.owner_group = Trim(ParseStringField(body, "ownerGroup").value_or(""));
    source.site = Trim(ParseStringField(body, "site").value_or(
        ParseStringField(body, "siteName").value_or("")));
    source.group = Trim(ParseStringField(body, "group").value_or(
        ParseStringField(body, "groupName").value_or(source.owner_group)));
    source.floor = Trim(ParseStringField(body, "floor").value_or(
        ParseStringField(body, "floorName").value_or("")));
    source.zone = Trim(ParseStringField(body, "zone").value_or(
        ParseStringField(body, "zoneName").value_or("")));
    source.recording.quota_bytes = app::GetAppConfig().recording_default_channel_quota_bytes;
    source.recording.retention_days = app::GetAppConfig().recording_default_retention_days;
    if (const auto recording = ExtractDelimitedField(body, "recording", '{', '}'); recording.has_value()) {
        source.recording.enabled = ParseBoolField(*recording, "enabled").value_or(false);
        source.recording.quota_bytes = ParseUInt64Field(*recording, "quotaBytes")
                                           .value_or(source.recording.quota_bytes);
        source.recording.retention_days = ParseIntField(*recording, "retentionDays")
                                              .value_or(source.recording.retention_days);
        source.recording.storage_path = Trim(ParseStringField(*recording, "storagePath").value_or(""));
        source.recording.revision = ParseUInt64Field(*recording, "revision").value_or(1);
    }
    if (source.recording.enabled && source.recording.quota_bytes == 0) {
        if (error_message != nullptr) *error_message = "recording quotaBytes는 활성화 시 0일 수 없음";
        return std::nullopt;
    }
    if (source.recording.retention_days <= 0) {
        if (error_message != nullptr) *error_message = "recording retentionDays는 양수여야 함";
        return std::nullopt;
    }
    if (!source.recording.storage_path.empty()) {
        const std::filesystem::path relative(source.recording.storage_path);
        if (relative.is_absolute() || source.recording.storage_path.find("..") != std::string::npos) {
            if (error_message != nullptr) *error_message = "recording storagePath는 안전한 상대 경로여야 함";
            return std::nullopt;
        }
    }
    source.canonical_source_key = CanonicalSourceKey(source);
    if (source.kind.empty() || source.canonical_source_key.empty()) {
        if (error_message != nullptr) {
            *error_message = "source requires kind plus one locator field: file, rtspUrl, webrtcSourceId, whepUrl or httpUrl";
        }
        return std::nullopt;
    }
    return source;
}

std::optional<SourceViewRegistry::PublishedViewRecord> ParsePublishedViewRecord(
    const std::string& body,
    const std::string& path_id,
    const std::vector<SourceViewRegistry::SourceRecord>& sources,
    std::string* error_message) {
    if (!LooksLikeJsonObject(body)) {
        if (error_message != nullptr) {
            *error_message = "request body must be a JSON object";
        }
        return std::nullopt;
    }

    SourceViewRegistry::PublishedViewRecord view;
    view.view_id = ParseStringField(body, "viewId").value_or(ParseStringField(body, "id").value_or(""));
    view.view_id = Trim(view.view_id);
    if (!path_id.empty() && !view.view_id.empty() && view.view_id != path_id) {
        if (error_message != nullptr) {
            *error_message = "path viewId and body viewId must match";
        }
        return std::nullopt;
    }
    if (view.view_id.empty()) {
        view.view_id = path_id;
    }
    if (!IsNumericRegistryId(view.view_id)) {
        if (error_message != nullptr) {
            *error_message = "viewId must be numeric";
        }
        return std::nullopt;
    }

    view.display_name = Trim(ParseStringField(body, "displayName").value_or(view.view_id));
    view.source_id = Trim(ParseStringField(body, "sourceId").value_or(""));
    if (!IsNumericRegistryId(view.source_id)) {
        if (error_message != nullptr) {
            *error_message = "PublishedView requires numeric sourceId";
        }
        return std::nullopt;
    }
    const auto source_it = std::find_if(sources.begin(), sources.end(), [&](const auto& source) {
        return source.source_id == view.source_id;
    });
    if (source_it == sources.end()) {
        if (error_message != nullptr) {
            *error_message = "PublishedView sourceId does not exist";
        }
        return std::nullopt;
    }

    view.default_rule_id = Trim(ParseStringField(body, "defaultRuleId").value_or(""));
    view.allowed_rule_ids = ParseStringArrayField(body, "allowedRuleIds");
    if (!view.default_rule_id.empty() && !ContainsString(view.allowed_rule_ids, view.default_rule_id)) {
        view.allowed_rule_ids.push_back(view.default_rule_id);
    }
    view.allowed_overlay_modes = ParseStringArrayField(body, "allowedOverlayModes");
    if (view.allowed_overlay_modes.empty()) {
        view.allowed_overlay_modes = {"raw", "va-overlay"};
    }
    view.show_dashboard = ParseBoolField(body, "showDashboard").value_or(true);
    view.show_events = ParseBoolField(body, "showEvents").value_or(true);
    view.show_metadata_summary = ParseBoolField(body, "showMetadataSummary").value_or(true);
    view.client_groups = ParseStringArrayField(body, "clientGroups");
    view.max_tiles = std::max(1, std::min(64, ParseIntField(body, "maxTiles").value_or(1)));
    view.enabled = ParseBoolField(body, "enabled").value_or(true);
    return view;
}

std::string SourceJson(const SourceViewRegistry::SourceRecord& source, bool include_sensitive) {
    std::ostringstream out;
    out << "{"
        << "\"sourceId\":\"" << JsonEscape(source.source_id) << "\","
        << "\"displayName\":\"" << JsonEscape(source.display_name) << "\","
        << "\"kind\":\"" << JsonEscape(source.kind) << "\","
        << "\"enabled\":" << (source.enabled ? "true" : "false") << ","
        << "\"tags\":";
    AppendStringArray(out, source.tags);
    out << ",\"ownerGroup\":\"" << JsonEscape(source.owner_group) << "\"";
    out << ",\"site\":\"" << JsonEscape(source.site) << "\""
        << ",\"group\":\"" << JsonEscape(source.group) << "\""
        << ",\"floor\":\"" << JsonEscape(source.floor) << "\""
        << ",\"zone\":\"" << JsonEscape(source.zone) << "\"";
    out << ",\"recording\":{\"enabled\":" << (source.recording.enabled ? "true" : "false")
        << ",\"revision\":" << source.recording.revision;
    if (include_sensitive) {
        out << ",\"quotaBytes\":" << source.recording.quota_bytes
            << ",\"retentionDays\":" << source.recording.retention_days
            << ",\"storagePath\":\"" << JsonEscape(source.recording.storage_path) << "\"";
    }
    out << "}";
    if (include_sensitive) {
        bool first = false;
        out << ",\"canonicalSourceKey\":\"" << JsonEscape(source.canonical_source_key) << "\"";
        AppendOptionalStringField(out, "file", source.file, &first);
        AppendOptionalStringField(out, "rtspUrl", source.rtsp_url, &first);
        AppendOptionalStringField(out, "webrtcSourceId", source.webrtc_source_id, &first);
        AppendOptionalStringField(out, "whepUrl", source.whep_url, &first);
        AppendOptionalStringField(out, "httpUrl", source.http_url, &first);
    }
    out << "}";
    return out.str();
}

std::string PublishedViewJson(const SourceViewRegistry::PublishedViewRecord& view) {
    std::ostringstream out;
    out << "{"
        << "\"viewId\":\"" << JsonEscape(view.view_id) << "\","
        << "\"displayName\":\"" << JsonEscape(view.display_name) << "\","
        << "\"sourceId\":\"" << JsonEscape(view.source_id) << "\","
        << "\"defaultRuleId\":\"" << JsonEscape(view.default_rule_id) << "\","
        << "\"allowedRuleIds\":";
    AppendStringArray(out, view.allowed_rule_ids);
    out << ",\"allowedOverlayModes\":";
    AppendStringArray(out, view.allowed_overlay_modes);
    out << ",\"showDashboard\":" << (view.show_dashboard ? "true" : "false")
        << ",\"showEvents\":" << (view.show_events ? "true" : "false")
        << ",\"showMetadataSummary\":" << (view.show_metadata_summary ? "true" : "false")
        << ",\"clientGroups\":";
    AppendStringArray(out, view.client_groups);
    out << ",\"maxTiles\":" << view.max_tiles
        << ",\"enabled\":" << (view.enabled ? "true" : "false")
        << "}";
    return out.str();
}

std::optional<SourceViewRegistry::SourceRecord> FindSource(
    const std::vector<SourceViewRegistry::SourceRecord>& sources,
    const std::string& source_id) {
    const auto it = std::find_if(sources.begin(), sources.end(), [&](const auto& source) {
        return source.source_id == source_id;
    });
    if (it == sources.end()) {
        return std::nullopt;
    }
    return *it;
}

std::optional<std::string> FindDuplicateSourceId(
    const std::vector<SourceViewRegistry::SourceRecord>& sources,
    const std::string& canonical_source_key,
    const std::string& excluded_source_id) {
    for (const auto& source : sources) {
        if (source.canonical_source_key == canonical_source_key &&
            source.source_id != excluded_source_id) {
            return source.source_id;
        }
    }
    return std::nullopt;
}

bool ViewIsClientVisible(const SourceViewRegistry::PublishedViewRecord& view,
                         const std::vector<SourceViewRegistry::SourceRecord>& sources,
                         const SourceViewRegistry::ClientViewAccessAuthorizer& authorizer) {
    const auto source = FindSource(sources, view.source_id);
    return view.enabled && source.has_value() && source->enabled &&
           authorizer && authorizer(view.view_id, "view:read");
}

std::string ClientPublishedViewJson(const SourceViewRegistry::PublishedViewRecord& view,
                                    const SourceViewRegistry::SourceRecord& source) {
    std::ostringstream out;
    out << "{"
        << "\"viewId\":\"" << JsonEscape(view.view_id) << "\","
        << "\"displayName\":\"" << JsonEscape(view.display_name) << "\","
        << "\"sourceId\":\"" << JsonEscape(view.source_id) << "\","
        << "\"sourceDisplayName\":\"" << JsonEscape(source.display_name) << "\","
        << "\"sourceKind\":\"" << JsonEscape(source.kind) << "\","
        << "\"sourceTags\":";
    AppendStringArray(out, source.tags);
    out << ",\"defaultRuleId\":\"" << JsonEscape(view.default_rule_id) << "\","
        << "\"allowedRuleIds\":";
    AppendStringArray(out, view.allowed_rule_ids);
    out << ",\"allowedOverlayModes\":";
    AppendStringArray(out, view.allowed_overlay_modes);
    out << ",\"showDashboard\":" << (view.show_dashboard ? "true" : "false")
        << ",\"showEvents\":" << (view.show_events ? "true" : "false")
        << ",\"showMetadataSummary\":" << (view.show_metadata_summary ? "true" : "false")
        << ",\"site\":\"" << JsonEscape(source.site) << "\""
        << ",\"group\":\"" << JsonEscape(source.group.empty() ? source.owner_group : source.group)
        << "\""
        << ",\"floor\":\"" << JsonEscape(source.floor) << "\""
        << ",\"zone\":\"" << JsonEscape(source.zone) << "\""
        << ",\"maxTiles\":" << view.max_tiles
        << "}";
    return out.str();
}

SourceViewRegistry::SourceIdentityPublishedView ToSourceIdentityPublishedView(
    const SourceViewRegistry::PublishedViewRecord& view) {
    SourceViewRegistry::SourceIdentityPublishedView identity;
    identity.view_id = view.view_id;
    identity.display_name = view.display_name;
    identity.default_rule_id = view.default_rule_id;
    identity.allowed_rule_ids = view.allowed_rule_ids;
    identity.allowed_overlay_modes = view.allowed_overlay_modes;
    identity.client_groups = view.client_groups;
    identity.max_tiles = view.max_tiles;
    identity.enabled = view.enabled;
    identity.show_dashboard = view.show_dashboard;
    identity.show_events = view.show_events;
    identity.show_metadata_summary = view.show_metadata_summary;
    return identity;
}

std::vector<SourceViewRegistry::SourceIdentitySnapshot> BuildSourceIdentitySnapshot(
    const std::vector<SourceViewRegistry::SourceRecord>& sources,
    const std::vector<SourceViewRegistry::PublishedViewRecord>& views) {
    std::vector<SourceViewRegistry::SourceIdentitySnapshot> sourceIdentity;
    sourceIdentity.reserve(sources.size());
    for (const auto& source : sources) {
        SourceViewRegistry::SourceIdentitySnapshot item;
        item.source_id = source.source_id;
        item.display_name = source.display_name;
        item.source_kind = source.kind;
        item.canonical_source_key = source.canonical_source_key;
        item.enabled = source.enabled;
        item.tags = source.tags;
        item.owner_group = source.owner_group;
        item.site = source.site;
        item.group = source.group;
        item.floor = source.floor;
        item.zone = source.zone;
        for (const auto& view : views) {
            if (view.source_id == source.source_id) {
                item.published_views.push_back(ToSourceIdentityPublishedView(view));
            }
        }
        sourceIdentity.push_back(std::move(item));
    }
    return sourceIdentity;
}

bool SourceIdExists(const std::vector<SourceViewRegistry::SourceRecord>& sources,
                    const std::string& source_id) {
    return std::any_of(sources.begin(), sources.end(), [&](const auto& source) {
        return source.source_id == source_id;
    });
}

SourceViewRegistry::SourceIdentitySummary BuildSourceIdentitySummary(
    const std::vector<SourceViewRegistry::SourceRecord>& sources,
    const std::vector<SourceViewRegistry::PublishedViewRecord>& views,
    const std::vector<SourceViewRegistry::SourceIdentitySnapshot>& sourceIdentity) {
    SourceViewRegistry::SourceIdentitySummary summary;
    summary.source_count = static_cast<int>(sources.size());
    summary.published_view_count = static_cast<int>(views.size());
    for (const auto& source : sources) {
        if (source.enabled) {
            ++summary.enabled_source_count;
        } else {
            ++summary.disabled_source_count;
        }
    }
    for (const auto& view : views) {
        if (SourceIdExists(sources, view.source_id)) {
            ++summary.linked_published_view_count;
        } else {
            ++summary.published_views_without_source;
        }
        if (!view.enabled) {
            ++summary.disabled_published_view_count;
        }
    }
    for (const auto& item : sourceIdentity) {
        if (item.published_views.empty()) {
            ++summary.sources_without_published_view;
        }
    }
    return summary;
}

bool HasSourceTag(const SourceViewRegistry::SourceRecord& source, const std::string& tag) {
    const std::string wanted = ToLower(Trim(tag));
    return std::any_of(source.tags.begin(), source.tags.end(), [&](const auto& item) {
        return ToLower(Trim(item)) == wanted;
    });
}

std::string LocatorKindForSource(const SourceViewRegistry::SourceRecord& source) {
    if (!source.file.empty()) {
        return "file";
    }
    if (!source.rtsp_url.empty()) {
        return HasSourceTag(source, "onvif") ? "onvif-rtsp" : "rtsp";
    }
    if (!source.webrtc_source_id.empty()) {
        return "webrtc";
    }
    if (!source.whep_url.empty()) {
        return "whep";
    }
    if (!source.http_url.empty()) {
        return HasSourceTag(source, "onvif") ? "onvif-http" : "http";
    }
    return std::string();
}

std::string LocatorValueForSource(const SourceViewRegistry::SourceRecord& source) {
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

std::string LocatorSchemeForSource(const SourceViewRegistry::SourceRecord& source) {
    if (!source.file.empty()) {
        return "file";
    }
    if (!source.webrtc_source_id.empty()) {
        return "webrtc-id";
    }
    const std::string locator = LocatorValueForSource(source);
    const std::size_t pos = locator.find("://");
    return pos == std::string::npos ? std::string() : ToLower(locator.substr(0, pos));
}

bool HasValidSourceLocatorScheme(const SourceViewRegistry::SourceRecord& source) {
    const std::string locator = ToLower(Trim(LocatorValueForSource(source)));
    if (!source.file.empty() || !source.webrtc_source_id.empty()) {
        return true;
    }
    if (!source.rtsp_url.empty()) {
        return locator.rfind("rtsp://", 0) == 0 || locator.rfind("rtsps://", 0) == 0;
    }
    if (!source.whep_url.empty()) {
        return HasHttpOrHttpsScheme(source.whep_url);
    }
    if (!source.http_url.empty()) {
        return HasHttpOrHttpsScheme(source.http_url);
    }
    return false;
}

void AddOnboardingIssue(std::vector<SourceViewRegistry::SourceOnboardingQualityIssue>* issues,
                        std::string code,
                        std::string severity,
                        std::string message) {
    if (issues == nullptr) {
        return;
    }
    issues->push_back(SourceViewRegistry::SourceOnboardingQualityIssue{
        std::move(code), std::move(severity), std::move(message)});
}

bool HasIssueSeverity(const std::vector<SourceViewRegistry::SourceOnboardingQualityIssue>& issues,
                      const std::string& severity) {
    return std::any_of(issues.begin(), issues.end(), [&](const auto& issue) {
        return issue.severity == severity;
    });
}

std::vector<SourceViewRegistry::SourceOnboardingQualityItem> BuildSourceOnboardingQualityItems(
    const std::vector<SourceViewRegistry::SourceRecord>& sources,
    const std::vector<SourceViewRegistry::PublishedViewRecord>& views) {
    std::vector<SourceViewRegistry::SourceOnboardingQualityItem> items;
    items.reserve(sources.size());
    for (const auto& source : sources) {
        SourceViewRegistry::SourceOnboardingQualityItem item;
        item.source_id = source.source_id;
        item.display_name = source.display_name;
        item.source_kind = source.kind;
        item.enabled = source.enabled;
        item.locator_kind = LocatorKindForSource(source);
        item.locator_present = !LocatorValueForSource(source).empty();
        item.locator_scheme = LocatorSchemeForSource(source);
        item.duplicate_canonical_source_key =
            !source.canonical_source_key.empty() &&
            FindDuplicateSourceId(sources, source.canonical_source_key, source.source_id).has_value();

        for (const auto& view : views) {
            if (view.source_id != source.source_id) {
                continue;
            }
            ++item.published_view_count;
            if (view.enabled) {
                item.has_enabled_published_view = true;
            }
        }

        if (!source.enabled) {
            AddOnboardingIssue(&item.validation_issues,
                               "source-disabled",
                               "warning",
                               "Source is disabled and will not be ready for client assignment");
        }
        if (!item.locator_present) {
            AddOnboardingIssue(&item.validation_issues,
                               "missing-locator",
                               "blocker",
                               "Source requires exactly one locator before save");
        } else if (!HasValidSourceLocatorScheme(source)) {
            const std::string code = !source.whep_url.empty()
                                         ? "whep-url-invalid-scheme"
                                         : (!source.rtsp_url.empty() ? "rtsp-url-invalid-scheme"
                                                                     : "http-url-invalid-scheme");
            AddOnboardingIssue(&item.validation_issues,
                               code,
                               "blocker",
                               "Source locator scheme is not accepted for the selected input kind");
        }
        if (SourceLocatorCount(source) != 1 || !SourceKindMatchesLocator(source)) {
            AddOnboardingIssue(&item.validation_issues,
                               "source-kind-locator-conflict",
                               "blocker",
                               "Source kind must match exactly one locator field");
        }
        if (item.duplicate_canonical_source_key) {
            AddOnboardingIssue(&item.validation_issues,
                               "duplicate-canonical-source-key",
                               "blocker",
                               "Another source already uses the same canonical input key");
        }
        if (item.published_view_count == 0 || !item.has_enabled_published_view) {
            AddOnboardingIssue(&item.validation_issues,
                               "missing-published-view",
                               "warning",
                               "Source has no enabled PublishedView for operator/client assignment");
        }
        if (HasSourceTag(source, "onvif") &&
            source.rtsp_url.empty() &&
            source.http_url.empty() &&
            source.whep_url.empty()) {
            AddOnboardingIssue(&item.validation_issues,
                               "onvif-tag-without-live-locator",
                               "blocker",
                               "ONVIF-tagged sources require an RTSP, HTTP/HLS, or WHEP live locator summary");
        }

        const bool blocked = HasIssueSeverity(item.validation_issues, "blocker");
        const bool warning = HasIssueSeverity(item.validation_issues, "warning");
        item.readiness_status = blocked ? "blocked" : (warning ? "warning" : "ready");
        item.input_quality_status = blocked ? "invalid" : (warning ? "review" : "ready");
        item.pre_save_validation_ready = item.enabled && item.readiness_status == "ready";
        items.push_back(std::move(item));
    }
    return items;
}

SourceViewRegistry::SourceOnboardingQualitySummary BuildSourceOnboardingQualitySummary(
    const std::vector<SourceViewRegistry::SourceOnboardingQualityItem>& items) {
    SourceViewRegistry::SourceOnboardingQualitySummary summary;
    summary.source_count = static_cast<int>(items.size());
    for (const auto& item : items) {
        if (item.readiness_status == "ready") {
            ++summary.ready_sources;
        } else if (item.readiness_status == "blocked") {
            ++summary.blocked_sources;
        } else {
            ++summary.warning_sources;
        }
        if (!item.enabled) {
            ++summary.disabled_source_count;
        }
        if (item.duplicate_canonical_source_key) {
            ++summary.duplicate_canonical_source_keys;
        }
        if (!item.locator_present) {
            ++summary.missing_locator_count;
        }
        if (item.input_quality_status == "invalid") {
            ++summary.invalid_locator_count;
        }
        if (item.published_view_count == 0 || !item.has_enabled_published_view) {
            ++summary.missing_published_view_count;
        }
        if (item.locator_kind.rfind("onvif", 0) == 0) {
            ++summary.onvif_sources;
        }
        if (item.locator_kind == "rtsp" || item.locator_kind == "onvif-rtsp") {
            ++summary.rtsp_sources;
        }
        if (item.locator_kind == "whep") {
            ++summary.whep_sources;
        }
    }
    return summary;
}

void AppendSourceIdentitySummaryJson(std::ostringstream& out,
                                     const SourceViewRegistry::SourceIdentitySummary& summary) {
    out << "{"
        << "\"sourceCount\":" << summary.source_count << ","
        << "\"enabledSourceCount\":" << summary.enabled_source_count << ","
        << "\"disabledSourceCount\":" << summary.disabled_source_count << ","
        << "\"publishedViewCount\":" << summary.published_view_count << ","
        << "\"linkedPublishedViewCount\":" << summary.linked_published_view_count << ","
        << "\"disabledPublishedViewCount\":" << summary.disabled_published_view_count << ","
        << "\"sourcesWithoutPublishedView\":" << summary.sources_without_published_view << ","
        << "\"publishedViewsWithoutSource\":" << summary.published_views_without_source
        << "}";
}

void AppendSourceIdentityPublishedViewJson(
    std::ostringstream& out,
    const SourceViewRegistry::SourceIdentityPublishedView& view) {
    out << "{"
        << "\"viewId\":\"" << JsonEscape(view.view_id) << "\","
        << "\"displayName\":\"" << JsonEscape(view.display_name) << "\","
        << "\"defaultRuleId\":\"" << JsonEscape(view.default_rule_id) << "\","
        << "\"allowedRuleIds\":";
    AppendStringArray(out, view.allowed_rule_ids);
    out << ",\"allowedOverlayModes\":";
    AppendStringArray(out, view.allowed_overlay_modes);
    out << ",\"clientGroups\":";
    AppendStringArray(out, view.client_groups);
    out << ",\"maxTiles\":" << view.max_tiles
        << ",\"enabled\":" << (view.enabled ? "true" : "false")
        << ",\"showDashboard\":" << (view.show_dashboard ? "true" : "false")
        << ",\"showEvents\":" << (view.show_events ? "true" : "false")
        << ",\"showMetadataSummary\":" << (view.show_metadata_summary ? "true" : "false")
        << "}";
}

void AppendSourceIdentitySnapshotJson(std::ostringstream& out,
                                      const SourceViewRegistry::SourceIdentitySnapshot& sourceIdentity) {
    out << "{"
        << "\"sourceId\":\"" << JsonEscape(sourceIdentity.source_id) << "\","
        << "\"displayName\":\"" << JsonEscape(sourceIdentity.display_name) << "\","
        << "\"sourceKind\":\"" << JsonEscape(sourceIdentity.source_kind) << "\","
        << "\"canonicalSourceKey\":\"" << JsonEscape(sourceIdentity.canonical_source_key) << "\","
        << "\"enabled\":" << (sourceIdentity.enabled ? "true" : "false") << ","
        << "\"tags\":";
    AppendStringArray(out, sourceIdentity.tags);
    out << ",\"ownerContext\":{"
        << "\"ownerGroup\":\"" << JsonEscape(sourceIdentity.owner_group) << "\","
        << "\"site\":\"" << JsonEscape(sourceIdentity.site) << "\","
        << "\"group\":\"" << JsonEscape(sourceIdentity.group) << "\","
        << "\"floor\":\"" << JsonEscape(sourceIdentity.floor) << "\","
        << "\"zone\":\"" << JsonEscape(sourceIdentity.zone) << "\""
        << "},\"publishedViewCount\":" << sourceIdentity.published_views.size()
        << ",\"publishedViews\":[";
    for (std::size_t i = 0; i < sourceIdentity.published_views.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendSourceIdentityPublishedViewJson(out, sourceIdentity.published_views[i]);
    }
    out << "]}";
}

void AppendSourceOnboardingQualitySummaryJson(
    std::ostringstream& out,
    const SourceViewRegistry::SourceOnboardingQualitySummary& summary) {
    out << "{"
        << "\"sourceCount\":" << summary.source_count << ","
        << "\"readySources\":" << summary.ready_sources << ","
        << "\"warningSources\":" << summary.warning_sources << ","
        << "\"blockedSources\":" << summary.blocked_sources << ","
        << "\"duplicateCanonicalSourceKeys\":" << summary.duplicate_canonical_source_keys << ","
        << "\"missingLocatorCount\":" << summary.missing_locator_count << ","
        << "\"invalidLocatorCount\":" << summary.invalid_locator_count << ","
        << "\"missingPublishedViewCount\":" << summary.missing_published_view_count << ","
        << "\"disabledSourceCount\":" << summary.disabled_source_count << ","
        << "\"onvifSources\":" << summary.onvif_sources << ","
        << "\"rtspSources\":" << summary.rtsp_sources << ","
        << "\"whepSources\":" << summary.whep_sources
        << "}";
}

void AppendSourceOnboardingQualityIssueJson(
    std::ostringstream& out,
    const SourceViewRegistry::SourceOnboardingQualityIssue& issue) {
    out << "{"
        << "\"code\":\"" << JsonEscape(issue.code) << "\","
        << "\"severity\":\"" << JsonEscape(issue.severity) << "\","
        << "\"message\":\"" << JsonEscape(issue.message) << "\""
        << "}";
}

void AppendSourceOnboardingQualityItemJson(
    std::ostringstream& out,
    const SourceViewRegistry::SourceOnboardingQualityItem& item) {
    out << "{"
        << "\"sourceId\":\"" << JsonEscape(item.source_id) << "\","
        << "\"displayName\":\"" << JsonEscape(item.display_name) << "\","
        << "\"sourceKind\":\"" << JsonEscape(item.source_kind) << "\","
        << "\"enabled\":" << (item.enabled ? "true" : "false") << ","
        << "\"readinessStatus\":\"" << JsonEscape(item.readiness_status) << "\","
        << "\"publishedViewCount\":" << item.published_view_count << ","
        << "\"hasEnabledPublishedView\":" << (item.has_enabled_published_view ? "true" : "false") << ","
        << "\"preSaveValidation\":{"
        << "\"ready\":" << (item.pre_save_validation_ready ? "true" : "false") << ","
        << "\"issueCount\":" << item.validation_issues.size()
        << "},"
        << "\"inputQuality\":{"
        << "\"kind\":\"" << JsonEscape(item.locator_kind) << "\","
        << "\"locatorPresent\":" << (item.locator_present ? "true" : "false") << ","
        << "\"locatorScheme\":\"" << JsonEscape(item.locator_scheme) << "\","
        << "\"status\":\"" << JsonEscape(item.input_quality_status) << "\""
        << "},"
        << "\"validationIssues\":[";
    for (std::size_t i = 0; i < item.validation_issues.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendSourceOnboardingQualityIssueJson(out, item.validation_issues[i]);
    }
    out << "]}";
}

RegistryResult JsonResult(int status, const std::string& status_text, const std::string& body) {
    return RegistryResult{status, status_text, body};
}

RegistryResult ErrorResult(int status, const std::string& status_text, const std::string& error) {
    return JsonResult(status,
                      status_text,
                      "{\"ok\":false,\"error\":\"" + JsonEscape(error) + "\"}");
}

bool SetError(std::string* error_message, const std::string& message) {
    if (error_message != nullptr) {
        *error_message = message;
    }
    return false;
}

std::string SourcesDocumentJson(const std::vector<SourceViewRegistry::SourceRecord>& sources) {
    std::ostringstream out;
    out << "{\n  \"sources\": [";
    for (std::size_t i = 0; i < sources.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << "\n    " << SourceJson(sources[i], true);
    }
    if (!sources.empty()) {
        out << "\n  ";
    }
    out << "]\n}\n";
    return out.str();
}

std::string ViewsDocumentJson(const std::vector<SourceViewRegistry::PublishedViewRecord>& views) {
    std::ostringstream out;
    out << "{\n  \"views\": [";
    for (std::size_t i = 0; i < views.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << "\n    " << PublishedViewJson(views[i]);
    }
    if (!views.empty()) {
        out << "\n  ";
    }
    out << "]\n}\n";
    return out.str();
}

#if !defined(_WIN32)

std::string ErrnoMessage(const std::string& action) {
    return action + ": " + std::strerror(errno);
}

bool CloseFdChecked(int fd, const std::string& label, std::string* error_message) {
    if (::close(fd) != 0) {
        return SetError(error_message, ErrnoMessage("failed to close " + label));
    }
    return true;
}

bool WriteAll(int fd, const std::string& data, std::string* error_message) {
    const char* cursor = data.data();
    std::size_t remaining = data.size();
    while (remaining > 0) {
        const ssize_t written = ::write(fd, cursor, remaining);
        if (written < 0) {
            if (errno == EINTR) {
                continue;
            }
            return SetError(error_message, ErrnoMessage("failed to write registry file"));
        }
        if (written == 0) {
            return SetError(error_message, "failed to write registry file: short write");
        }
        cursor += written;
        remaining -= static_cast<std::size_t>(written);
    }
    return true;
}

bool FsyncFd(int fd, const std::string& label, std::string* error_message) {
    while (::fsync(fd) != 0) {
        if (errno == EINTR) {
            continue;
        }
        return SetError(error_message, ErrnoMessage("failed to fsync " + label));
    }
    return true;
}

bool FsyncParentDirectory(const std::filesystem::path& file_path, std::string* error_message) {
    const std::filesystem::path parent = file_path.parent_path().empty()
                                             ? std::filesystem::path(".")
                                             : file_path.parent_path();
    const int dir_fd = ::open(parent.c_str(), O_RDONLY | O_DIRECTORY);
    if (dir_fd < 0) {
        return SetError(error_message, ErrnoMessage("failed to open registry directory"));
    }
    if (!FsyncFd(dir_fd, "registry directory", error_message)) {
        (void)::close(dir_fd);
        return false;
    }
    return CloseFdChecked(dir_fd, "registry directory", error_message);
}
bool ShouldInjectRegistryWriteFailure(const std::string& label, const std::string& phase);
bool WriteRegistryFileAtomically(const std::filesystem::path& file_path,
                                 const std::string& body,
                                 const std::string& label,
                                 std::string* error_message,
                                 bool* target_replaced,
                                 std::optional<unsigned int> forced_mode = std::nullopt) {
    if (target_replaced != nullptr) {
        *target_replaced = false;
    }
    if (file_path.empty()) {
        return SetError(error_message, label + " path is empty");
    }
    const auto parent = file_path.parent_path();
    std::error_code ec;
    if (!parent.empty()) {
        std::filesystem::create_directories(parent, ec);
        if (ec) {
            return SetError(error_message, "failed to create " + label + " directory: " + ec.message());
        }
    }

    mode_t target_mode = static_cast<mode_t>(forced_mode.value_or(0644U));
    struct stat target_status {};
    if (!forced_mode.has_value() && ::stat(file_path.c_str(), &target_status) == 0) {
        target_mode = target_status.st_mode & 0777;
    } else if (!forced_mode.has_value() && errno != ENOENT) {
        return SetError(error_message, ErrnoMessage("failed to inspect existing " + label + " mode"));
    }

    const std::string base = file_path.string() + ".tmp." + std::to_string(::getpid()) + ".";
    std::filesystem::path temp_path;
    int fd = -1;
    for (int attempt = 0; attempt < 64; ++attempt) {
        temp_path = base + std::to_string(attempt);
        fd = ::open(temp_path.c_str(), O_WRONLY | O_CREAT | O_EXCL | O_CLOEXEC, target_mode);
        if (fd >= 0) {
            break;
        }
        if (errno != EEXIST) {
            return SetError(error_message, ErrnoMessage("failed to open temporary " + label + " file"));
        }
    }
    if (fd < 0) {
        return SetError(error_message, "failed to open unique temporary " + label + " file");
    }

    bool ok = (::fchmod(fd, target_mode) == 0 ||
               SetError(error_message, ErrnoMessage("failed to preserve " + label + " mode"))) &&
              WriteAll(fd, body, error_message) &&
              FsyncFd(fd, "temporary " + label + " file", error_message) &&
              CloseFdChecked(fd, "temporary " + label + " file", error_message);
    fd = -1;
    if (!ok) {
        (void)::unlink(temp_path.c_str());
        return false;
    }
    if (ShouldInjectRegistryWriteFailure(label, "before-replace") || ::rename(temp_path.c_str(), file_path.c_str()) != 0) {
        const std::string message = ErrnoMessage("failed to replace " + label + " file");
        (void)::unlink(temp_path.c_str());
        return SetError(error_message, message);
    }
    if (target_replaced != nullptr) {
        *target_replaced = true;
    }
    return FsyncParentDirectory(file_path, error_message);
}

#else

bool WriteRegistryFileAtomically(const std::filesystem::path& file_path,
                                 const std::string& body,
                                 const std::string& label,
                                 std::string* error_message,
                                 bool* target_replaced,
                                 std::optional<unsigned int> forced_mode = std::nullopt) {
    if (target_replaced != nullptr) {
        *target_replaced = false;
    }
    if (file_path.empty()) {
        return SetError(error_message, label + " path is empty");
    }
    const auto parent = file_path.parent_path();
    std::error_code ec;
    if (!parent.empty()) {
        std::filesystem::create_directories(parent, ec);
        if (ec) {
            return SetError(error_message, "failed to create " + label + " directory: " + ec.message());
        }
    }
    const std::filesystem::path temp_path = file_path.string() + ".tmp";
    {
        std::ofstream out(temp_path, std::ios::trunc | std::ios::binary);
        if (!out) {
            return SetError(error_message, "failed to open temporary " + label + " file");
        }
        out << body;
        out.flush();
        if (!out) {
            return SetError(error_message, "failed to write " + label + " file");
        }
    }
    std::filesystem::rename(temp_path, file_path, ec);
    if (ec) {
        std::filesystem::remove(temp_path);
        return SetError(error_message, "failed to replace " + label + " file: " + ec.message());
    }
    if (target_replaced != nullptr) {
        *target_replaced = true;
    }
    if (forced_mode.has_value()) {
        std::filesystem::permissions(
            file_path,
            static_cast<std::filesystem::perms>(*forced_mode),
            std::filesystem::perm_options::replace,
            ec);
        if (ec) {
            return SetError(error_message, "failed to preserve " + label + " mode: " + ec.message());
        }
    }
    return true;
}

#endif
struct RegistryFileSnapshot {
    bool exists{false};
    std::string bytes;
    std::filesystem::perms mode{std::filesystem::perms::unknown};
};

struct OnvifSourceViewTransaction {
    std::filesystem::path marker_path;
    std::filesystem::path source_rollback_path;
    std::filesystem::path view_rollback_path;
    RegistryFileSnapshot source_snapshot;
    RegistryFileSnapshot view_snapshot;
};

bool CaptureRegistryFileSnapshot(const std::filesystem::path& file_path,
                                 const std::string& label,
                                 RegistryFileSnapshot* snapshot,
                                 std::string* error_message);
bool RestoreRegistryFileSnapshot(const std::filesystem::path& file_path,
                                 const RegistryFileSnapshot& snapshot,
                                 const std::string& label,
                                 std::string* error_message);
bool RecoverOnvifSourceViewTransaction(const std::filesystem::path& source_path,
                                       const std::filesystem::path& view_path,
                                       std::string* error_message);
bool PrepareOnvifSourceViewTransaction(const std::filesystem::path& source_path,
                                       const std::filesystem::path& view_path,
                                       OnvifSourceViewTransaction* transaction,
                                       std::string* error_message);
bool RollbackOnvifSourceViewTransaction(const std::filesystem::path& source_path,
                                        const std::filesystem::path& view_path,
                                        const OnvifSourceViewTransaction& transaction,
                                        std::string* error_message);
bool CommitOnvifSourceViewTransaction(const OnvifSourceViewTransaction& transaction,
                                      std::string* error_message);
void MaybeCrashOnvifSourceViewTransaction(const std::string& stage);
bool ReadTextFile(const std::filesystem::path& path,
                  const std::string& label,
                  std::string* body,
                  std::string* error_message) {
    if (body == nullptr) {
        return SetError(error_message, label + " output is required");
    }
    std::ifstream in(path);
    if (!in) {
        return SetError(error_message, "failed to open " + label + " file: " + path.string());
    }
    std::ostringstream buffer;
    buffer << in.rdbuf();
    *body = buffer.str();
    if (!in.good() && !in.eof()) {
        return SetError(error_message, "failed to read " + label + " file: " + path.string());
    }
    return true;
}

bool LoadSourcesFromFile(const std::filesystem::path& path,
                         std::vector<SourceViewRegistry::SourceRecord>* sources,
                         bool* file_exists,
                         std::string* error_message) {
    if (sources == nullptr || file_exists == nullptr) {
        return SetError(error_message, "source registry load output is required");
    }
    sources->clear();
    std::error_code exists_ec;
    *file_exists = std::filesystem::exists(path, exists_ec);
    if (exists_ec) {
        return SetError(error_message, "failed to inspect source registry file: " + exists_ec.message());
    }
    if (!*file_exists) {
        return true;
    }
    std::string body;
    if (!ReadTextFile(path, "source registry", &body, error_message)) {
        return false;
    }
    if (!LooksLikeJsonObject(body)) {
        return SetError(error_message, "source registry file must be a JSON object: " + path.string());
    }
    std::string array_error;
    const auto objects = ExtractJsonObjectArrayStrict(body, "sources", &array_error);
    if (!objects.has_value()) {
        return SetError(error_message, array_error + ": " + path.string());
    }
    for (std::size_t i = 0; i < objects->size(); ++i) {
        std::string parse_error;
        const auto source = ParseSourceRecord((*objects)[i], "", &parse_error);
        if (!source.has_value()) {
            return SetError(error_message,
                            "invalid source record at index " + std::to_string(i) + ": " +
                                parse_error);
        }
        if (FindSource(*sources, source->source_id).has_value()) {
            return SetError(error_message,
                            "duplicate sourceId in source registry file: " + source->source_id);
        }
        if (const auto duplicate =
                FindDuplicateSourceId(*sources, source->canonical_source_key, source->source_id);
            duplicate.has_value()) {
            return SetError(error_message,
                            "duplicate canonical source in source registry file: " +
                                source->canonical_source_key);
        }
        sources->push_back(*source);
    }
    return true;
}

bool LoadViewsFromFile(const std::filesystem::path& path,
                       const std::vector<SourceViewRegistry::SourceRecord>& sources,
                       std::vector<SourceViewRegistry::PublishedViewRecord>* views,
                       bool* file_exists,
                       std::string* error_message) {
    if (views == nullptr || file_exists == nullptr) {
        return SetError(error_message, "published view registry load output is required");
    }
    views->clear();
    std::error_code exists_ec;
    *file_exists = std::filesystem::exists(path, exists_ec);
    if (exists_ec) {
        return SetError(error_message, "failed to inspect published view registry file: " + exists_ec.message());
    }
    if (!*file_exists) {
        return true;
    }
    std::string body;
    if (!ReadTextFile(path, "published view registry", &body, error_message)) {
        return false;
    }
    if (!LooksLikeJsonObject(body)) {
        return SetError(error_message,
                        "published view registry file must be a JSON object: " + path.string());
    }
    std::string array_error;
    const auto objects = ExtractJsonObjectArrayStrict(body, "views", &array_error);
    if (!objects.has_value()) {
        return SetError(error_message, array_error + ": " + path.string());
    }
    for (std::size_t i = 0; i < objects->size(); ++i) {
        std::string parse_error;
        const auto view = ParsePublishedViewRecord((*objects)[i], "", sources, &parse_error);
        if (!view.has_value()) {
            return SetError(error_message,
                            "invalid PublishedView record at index " + std::to_string(i) + ": " +
                                parse_error);
        }
        const auto existing = std::find_if(views->begin(), views->end(), [&](const auto& item) {
            return item.view_id == view->view_id;
        });
        if (existing != views->end()) {
            return SetError(error_message,
                            "duplicate viewId in published view registry file: " + view->view_id);
        }
        views->push_back(*view);
    }
    return true;
}

}  // namespace

SourceViewRegistry& SourceViewRegistry::Instance() {
    static SourceViewRegistry registry;
    return registry;
}

RegistryResult SourceViewRegistry::SourcesJson() {
    std::lock_guard lock(mu_);
    std::string load_error;
    if (!EnsureLoadedLocked(&load_error)) {
        return ErrorResult(500, "Internal Server Error", load_error);
    }
    std::ostringstream out;
    out << "{\"status\":\"registry\",\"storagePath\":\"" << JsonEscape(source_storage_path_.string())
        << "\",\"sources\":[";
    for (std::size_t i = 0; i < sources_.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << SourceJson(sources_[i], true);
    }
    out << "]}";
    return JsonResult(200, "OK", out.str());
}

RegistryResult SourceViewRegistry::ViewsJson() {
    std::lock_guard lock(mu_);
    std::string load_error;
    if (!EnsureLoadedLocked(&load_error)) {
        return ErrorResult(500, "Internal Server Error", load_error);
    }
    std::ostringstream out;
    out << "{\"status\":\"registry\",\"storagePath\":\"" << JsonEscape(views_storage_path_.string())
        << "\",\"views\":[";
    for (std::size_t i = 0; i < views_.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << PublishedViewJson(views_[i]);
    }
    out << "]}";
    return JsonResult(200, "OK", out.str());
}

RegistryResult SourceViewRegistry::SourceRegistrySnapshotIdentityJson() {
    std::lock_guard lock(mu_);
    std::string load_error;
    if (!EnsureLoadedLocked(&load_error)) {
        return ErrorResult(500, "Internal Server Error", load_error);
    }
    const auto sourceIdentity = BuildSourceIdentitySnapshot(sources_, views_);
    const auto summary = BuildSourceIdentitySummary(sources_, views_, sourceIdentity);

    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v330-source-registry-snapshot-identity.v1\","
        << "\"status\":\"source-registry-snapshot-identity\","
        << "\"storage\":{"
        << "\"sourceRegistryPath\":\"" << JsonEscape(source_storage_path_.string()) << "\","
        << "\"publishedViewsPath\":\"" << JsonEscape(views_storage_path_.string()) << "\""
        << "},\"summary\":";
    AppendSourceIdentitySummaryJson(out, summary);
    out << ",\"sourceIdentity\":[";
    for (std::size_t i = 0; i < sourceIdentity.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendSourceIdentitySnapshotJson(out, sourceIdentity[i]);
    }
    out << "],\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"rawLocatorExposedToClient\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false,"
        << "\"onboardingQualityImplemented\":false,"
        << "\"reliabilityTimelineImplemented\":false,"
        << "\"incidentCorrelationImplemented\":false,"
        << "\"recoveryQueueImplemented\":false,"
        << "\"clientSafeDigestImplemented\":false,"
        << "\"searchMetricsImplemented\":false"
        << "}}";
    return JsonResult(200, "OK", out.str());
}

RegistryResult SourceViewRegistry::SourceOnboardingQualitySummaryJson() {
    std::lock_guard lock(mu_);
    std::string load_error;
    if (!EnsureLoadedLocked(&load_error)) {
        return ErrorResult(500, "Internal Server Error", load_error);
    }
    const auto sourceOnboardingQuality = BuildSourceOnboardingQualityItems(sources_, views_);
    const auto summary = BuildSourceOnboardingQualitySummary(sourceOnboardingQuality);

    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v330-source-onboarding-quality-summary.v1\","
        << "\"status\":\"source-onboarding-quality-summary\","
        << "\"storage\":{"
        << "\"sourceRegistryPath\":\"" << JsonEscape(source_storage_path_.string()) << "\","
        << "\"publishedViewsPath\":\"" << JsonEscape(views_storage_path_.string()) << "\""
        << "},\"onboardingQualitySummary\":";
    AppendSourceOnboardingQualitySummaryJson(out, summary);
    out << ",\"sourceOnboardingQuality\":[";
    for (std::size_t i = 0; i < sourceOnboardingQuality.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendSourceOnboardingQualityItemJson(out, sourceOnboardingQuality[i]);
    }
    out << "],\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"rawLocatorExposedToClient\":false,"
        << "\"credentialMaterialExposed\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false,"
        << "\"reliabilityTimelineImplemented\":false,"
        << "\"incidentCorrelationImplemented\":false,"
        << "\"recoveryQueueImplemented\":false,"
        << "\"clientSafeDigestImplemented\":false,"
        << "\"searchMetricsImplemented\":false"
        << "}}";
    return JsonResult(200, "OK", out.str());
}

RegistryResult SourceViewRegistry::ClientViewsJson(const ClientViewAccessAuthorizer& authorizer) {
    std::lock_guard lock(mu_);
    std::string load_error;
    if (!EnsureLoadedLocked(&load_error)) {
        return ErrorResult(500, "Internal Server Error", load_error);
    }
    std::ostringstream out;
    out << "{\"status\":\"clientViews\",\"views\":[";
    bool first = true;
    for (const auto& view : views_) {
        if (!ViewIsClientVisible(view, sources_, authorizer)) {
            continue;
        }
        const auto source = FindSource(sources_, view.source_id);
        if (!source.has_value()) {
            continue;
        }
        if (!first) {
            out << ",";
        }
        first = false;
        out << ClientPublishedViewJson(view, *source);
    }
    out << "]}";
    return JsonResult(200, "OK", out.str());
}

RegistryResult SourceViewRegistry::ClientViewJson(const std::string& view_id,
                                                  const ClientViewAccessAuthorizer& authorizer) {
    ClientViewAccess access;
    const auto result = ResolveClientViewAccess(view_id, authorizer, "view:read", &access);
    if (result.status != 200) {
        return result;
    }
    return JsonResult(200, "OK", "{\"ok\":true,\"view\":" +
                                     ClientPublishedViewJson(access.view, access.source) + "}");
}

RegistryResult SourceViewRegistry::ResolveClientViewAccess(const std::string& view_id,
                                                           const ClientViewAccessAuthorizer& authorizer,
                                                           const std::string& required_scope_prefix,
                                                           ClientViewAccess* access) {
    if (access == nullptr) {
        return ErrorResult(500, "Internal Server Error", "ClientViewAccess output is required");
    }
    std::lock_guard lock(mu_);
    std::string load_error;
    if (!EnsureLoadedLocked(&load_error)) {
        return ErrorResult(500, "Internal Server Error", load_error);
    }
    const auto view_it = std::find_if(views_.begin(), views_.end(), [&](const auto& view) {
        return view.view_id == view_id;
    });
    if (view_it == views_.end() || !view_it->enabled) {
        return ErrorResult(404, "Not Found", "PublishedView not found");
    }
    if (!authorizer || !authorizer(view_it->view_id, required_scope_prefix)) {
        return ErrorResult(403, "Forbidden", required_scope_prefix + " scope required");
    }
    const auto source = FindSource(sources_, view_it->source_id);
    if (!source.has_value() || !source->enabled) {
        return ErrorResult(404, "Not Found", "PublishedView source is not available");
    }
    access->view = *view_it;
    access->source = *source;
    return JsonResult(200, "OK", "{\"ok\":true,\"view\":" +
                                     ClientPublishedViewJson(access->view, access->source) + "}");
}

bool SourceViewRegistry::Snapshot(std::vector<SourceRecord>* sources,
                                  std::vector<PublishedViewRecord>* views,
                                  std::string* error_message) {
    std::lock_guard lock(mu_);
    if (!EnsureLoadedLocked(error_message)) {
        return false;
    }
    if (sources != nullptr) {
        *sources = sources_;
    }
    if (views != nullptr) {
        *views = views_;
    }
    if (error_message != nullptr) {
        error_message->clear();
    }
    return true;
}

RegistryResult SourceViewRegistry::CreateSource(const std::string& body) {
    std::unique_lock lock(mu_);
    std::string load_error;
    if (!EnsureLoadedLocked(&load_error)) {
        return ErrorResult(500, "Internal Server Error", load_error);
    }
    std::string error;
    const auto source = ParseSourceRecord(body, "", &error);
    if (!source.has_value()) {
        return ErrorResult(400, "Bad Request", error);
    }
    if (FindSource(sources_, source->source_id).has_value()) {
        return ErrorResult(409, "Conflict", "sourceId already exists");
    }
    const bool allow_duplicate_source = ParseBoolField(body, "allowDuplicateSource").value_or(false);
    if (!allow_duplicate_source) {
        if (const auto duplicate = FindDuplicateSourceId(sources_, source->canonical_source_key, "");
            duplicate.has_value()) {
            return JsonResult(409,
                              "Conflict",
                              "{\"ok\":false,\"error\":\"duplicate source\",\"duplicateSourceId\":\"" +
                                  JsonEscape(*duplicate) + "\"}");
        }
    }
    auto next_sources = sources_;
    next_sources.push_back(*source);
    std::string save_error;
    if (!SaveSourcesLocked(next_sources, &save_error)) {
        return ErrorResult(500, "Internal Server Error", save_error);
    }
    sources_ = std::move(next_sources);
    const auto callback = source_mutation_callback_;
    lock.unlock();
    if (callback) callback(*source);
    return JsonResult(201, "Created", "{\"ok\":true,\"status\":\"created\",\"source\":" +
                                          SourceJson(*source, true) + "}");
}

RegistryResult SourceViewRegistry::UpsertSource(const std::string& source_id, const std::string& body) {
    std::unique_lock lock(mu_);
    std::string load_error;
    if (!EnsureLoadedLocked(&load_error)) {
        return ErrorResult(500, "Internal Server Error", load_error);
    }
    std::string error;
    const auto source = ParseSourceRecord(body, source_id, &error);
    if (!source.has_value()) {
        return ErrorResult(400, "Bad Request", error);
    }
    const bool allow_duplicate_source = ParseBoolField(body, "allowDuplicateSource").value_or(false);
    if (!allow_duplicate_source) {
        if (const auto duplicate =
                FindDuplicateSourceId(sources_, source->canonical_source_key, source->source_id);
            duplicate.has_value()) {
            return JsonResult(409,
                              "Conflict",
                              "{\"ok\":false,\"error\":\"duplicate source\",\"duplicateSourceId\":\"" +
                                  JsonEscape(*duplicate) + "\"}");
        }
    }
    bool updated = false;
    auto next_sources = sources_;
    for (auto& item : next_sources) {
        if (item.source_id == source->source_id) {
            item = *source;
            updated = true;
            break;
        }
    }
    if (!updated) {
        next_sources.push_back(*source);
    }
    std::string save_error;
    if (!SaveSourcesLocked(next_sources, &save_error)) {
        return ErrorResult(500, "Internal Server Error", save_error);
    }
    sources_ = std::move(next_sources);
    const auto callback = source_mutation_callback_;
    lock.unlock();
    if (callback) callback(*source);
    return JsonResult(updated ? 200 : 201,
                      updated ? "OK" : "Created",
                      "{\"ok\":true,\"status\":\"" + std::string(updated ? "updated" : "created") +
                          "\",\"source\":" + SourceJson(*source, true) + "}");
}

RegistryResult SourceViewRegistry::UpsertOnvifSourceView(
    const std::string& source_id,
    const std::string& source_body,
    const std::string& published_view_body) {
    std::unique_lock lock(mu_);
    std::string load_error;
    if (!EnsureLoadedLocked(&load_error)) {
        return ErrorResult(500, "Internal Server Error", load_error);
    }

    std::string source_error;
    const auto source = ParseSourceRecord(source_body, source_id, &source_error);
    if (!source.has_value()) {
        return ErrorResult(400, "Bad Request", source_error);
    }
    if (!HasSourceTag(*source, "onvif") || !HasSourceTag(*source, "live")) {
        return ErrorResult(400,
                           "Bad Request",
                           "ONVIF paired save requires onvif and live source tags");
    }
    const bool allow_duplicate_source =
        ParseBoolField(source_body, "allowDuplicateSource").value_or(false);
    if (!allow_duplicate_source) {
        if (const auto duplicate =
                FindDuplicateSourceId(sources_, source->canonical_source_key, source->source_id);
            duplicate.has_value()) {
            return JsonResult(409,
                              "Conflict",
                              "{\"ok\":false,\"error\":\"duplicate source\",\"duplicateSourceId\":\"" +
                                  JsonEscape(*duplicate) + "\"}");
        }
    }

    bool source_updated = false;
    auto next_sources = sources_;
    for (auto& item : next_sources) {
        if (item.source_id == source->source_id) {
            item = *source;
            source_updated = true;
            break;
        }
    }
    if (!source_updated) {
        next_sources.push_back(*source);
    }

    std::string view_error;
    const auto view =
        ParsePublishedViewRecord(published_view_body, source_id, next_sources, &view_error);
    if (!view.has_value()) {
        return ErrorResult(400, "Bad Request", view_error);
    }
    if (view->view_id != source->source_id || view->source_id != source->source_id) {
        return ErrorResult(400,
                           "Bad Request",
                           "ONVIF paired save requires identical sourceId and viewId");
    }

    bool view_updated = false;
    auto next_views = views_;
    for (auto& item : next_views) {
        if (item.view_id == view->view_id) {
            item = *view;
            view_updated = true;
            break;
        }
    }
    if (!view_updated) {
        next_views.push_back(*view);
    }

    auto transaction_failure = [&](const std::string& failed_stage,
                                   const std::string& save_error,
                                   bool source_write_succeeded,
                                   bool view_write_succeeded,
                                   bool source_rollback_attempted,
                                   bool source_rollback_succeeded,
                                   bool view_rollback_attempted,
                                   bool view_rollback_succeeded) {
        const bool rollback_succeeded =
            (!source_rollback_attempted || source_rollback_succeeded) &&
            (!view_rollback_attempted || view_rollback_succeeded);
        const bool partial_save = !rollback_succeeded;
        const bool rollback_attempted = source_rollback_attempted || view_rollback_attempted;
        std::ostringstream out;
        out << "{"
            << "\"ok\":false,"
            << "\"schema\":\"media-server.onvif-source-view-paired-save.v1\","
            << "\"storageMode\":\"paired-write-with-compensating-rollback\","
            << "\"transactionStatus\":\""
            << (partial_save ? "rollback-failed"
                             : (rollback_attempted ? "rolled-back" : "aborted-before-commit"))
            << "\","
            << "\"consistencyStatus\":\""
            << (partial_save ? "manual-recovery-required" : "pre-transaction-state-restored")
            << "\","
            << "\"failedStage\":\"" << JsonEscape(failed_stage) << "\","
            << "\"sourceWriteSucceeded\":" << (source_write_succeeded ? "true" : "false")
            << ",\"publishedViewWriteSucceeded\":"
            << (view_write_succeeded ? "true" : "false")
            << ",\"sourceRollbackAttempted\":"
            << (source_rollback_attempted ? "true" : "false")
            << ",\"sourceRollbackSucceeded\":"
            << (source_rollback_succeeded ? "true" : "false")
            << ",\"publishedViewRollbackAttempted\":"
            << (view_rollback_attempted ? "true" : "false")
            << ",\"publishedViewRollbackSucceeded\":"
            << (view_rollback_succeeded ? "true" : "false")
            << ",\"partialSave\":" << (partial_save ? "true" : "false")
            << ",\"error\":\"" << JsonEscape(save_error) << "\"}";
        return JsonResult(500, "Internal Server Error", out.str());
    };

    OnvifSourceViewTransaction transaction;
    std::string transaction_error;
    if (!PrepareOnvifSourceViewTransaction(source_storage_path_,
                                           views_storage_path_,
                                           &transaction,
                                           &transaction_error)) {
        return transaction_failure("transaction-prepare",
                                   transaction_error,
                                   false,
                                   false,
                                   false,
                                   false,
                                   false,
                                   false);
    }
    MaybeCrashOnvifSourceViewTransaction("after-prepared");

    bool source_replaced = false;
    std::string save_error;
    if (!SaveSourcesLocked(next_sources, &save_error, &source_replaced)) {
        std::string rollback_error;
        const bool rollback_succeeded = RollbackOnvifSourceViewTransaction(
            source_storage_path_, views_storage_path_, transaction, &rollback_error);
        if (!rollback_succeeded && !rollback_error.empty()) {
            save_error += "; recoverable transaction rollback failed: " + rollback_error;
        }
        return transaction_failure("source-save",
                                   save_error,
                                   false,
                                   false,
                                   source_replaced,
                                   source_replaced && rollback_succeeded,
                                   false,
                                   false);
    }
    MaybeCrashOnvifSourceViewTransaction("after-source-replace");

    bool view_replaced = false;
    if (!SaveViewsLocked(next_views, &save_error, &view_replaced)) {
        std::string rollback_error;
        const bool rollback_succeeded = RollbackOnvifSourceViewTransaction(
            source_storage_path_, views_storage_path_, transaction, &rollback_error);
        if (!rollback_succeeded && !rollback_error.empty()) {
            save_error += "; recoverable transaction rollback failed: " + rollback_error;
        }
        return transaction_failure("published-view-save",
                                   save_error,
                                   true,
                                   false,
                                   true,
                                   rollback_succeeded,
                                   view_replaced,
                                   view_replaced && rollback_succeeded);
    }
    MaybeCrashOnvifSourceViewTransaction("after-view-replace");

    if (!CommitOnvifSourceViewTransaction(transaction, &save_error)) {
        std::string rollback_error;
        const bool rollback_succeeded = RollbackOnvifSourceViewTransaction(
            source_storage_path_, views_storage_path_, transaction, &rollback_error);
        if (!rollback_succeeded && !rollback_error.empty()) {
            save_error += "; recoverable transaction rollback failed: " + rollback_error;
        }
        return transaction_failure("transaction-commit",
                                   save_error,
                                   true,
                                   true,
                                   true,
                                   rollback_succeeded,
                                   true,
                                   rollback_succeeded);
    }

    sources_ = std::move(next_sources);
    views_ = std::move(next_views);
    const auto callback = source_mutation_callback_;
    const bool created = !source_updated || !view_updated;
    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.onvif-source-view-paired-save.v1\","
        << "\"storageMode\":\"paired-write-with-compensating-rollback\","
        << "\"transactionStatus\":\"committed\","
        << "\"consistencyStatus\":\"source-view-pair-committed\","
        << "\"sourceWriteSucceeded\":true,"
        << "\"publishedViewWriteSucceeded\":true,"
        << "\"rollbackAttempted\":false,"
        << "\"partialSave\":false,"
        << "\"source\":" << SourceJson(*source, true) << ","
        << "\"publishedView\":" << PublishedViewJson(*view) << "}";
    const auto result = JsonResult(created ? 201 : 200, created ? "Created" : "OK", out.str());
    lock.unlock();
    if (callback) callback(*source);
    return result;
}

RegistryResult SourceViewRegistry::DisableSource(const std::string& source_id) {
    std::unique_lock lock(mu_);
    std::string load_error;
    if (!EnsureLoadedLocked(&load_error)) {
        return ErrorResult(500, "Internal Server Error", load_error);
    }
    auto next_sources = sources_;
    for (auto& source : next_sources) {
        if (source.source_id == source_id) {
            source.enabled = false;
            const std::string source_json = SourceJson(source, true);
            std::string save_error;
            if (!SaveSourcesLocked(next_sources, &save_error)) {
                return ErrorResult(500, "Internal Server Error", save_error);
            }
            sources_ = std::move(next_sources);
            const auto callback = source_mutation_callback_;
            const auto result = JsonResult(200,
                                           "OK",
                                           "{\"ok\":true,\"status\":\"disabled\",\"source\":" +
                                               source_json + "}");
            lock.unlock();
            if (callback) callback(source);
            return result;
        }
    }
    return ErrorResult(404, "Not Found", "Source not found");
}

void SourceViewRegistry::SetSourceMutationCallback(SourceMutationCallback callback) {
    std::lock_guard lock(mu_);
    source_mutation_callback_ = std::move(callback);
}

RegistryResult SourceViewRegistry::CreateView(const std::string& body) {
    std::lock_guard lock(mu_);
    std::string load_error;
    if (!EnsureLoadedLocked(&load_error)) {
        return ErrorResult(500, "Internal Server Error", load_error);
    }
    std::string error;
    const auto view = ParsePublishedViewRecord(body, "", sources_, &error);
    if (!view.has_value()) {
        return ErrorResult(400, "Bad Request", error);
    }
    const auto existing = std::find_if(views_.begin(), views_.end(), [&](const auto& item) {
        return item.view_id == view->view_id;
    });
    if (existing != views_.end()) {
        return ErrorResult(409, "Conflict", "viewId already exists");
    }
    auto next_views = views_;
    next_views.push_back(*view);
    std::string save_error;
    if (!SaveViewsLocked(next_views, &save_error)) {
        return ErrorResult(500, "Internal Server Error", save_error);
    }
    views_ = std::move(next_views);
    return JsonResult(201, "Created", "{\"ok\":true,\"status\":\"created\",\"view\":" +
                                          PublishedViewJson(*view) + "}");
}

RegistryResult SourceViewRegistry::UpsertView(const std::string& view_id, const std::string& body) {
    std::lock_guard lock(mu_);
    std::string load_error;
    if (!EnsureLoadedLocked(&load_error)) {
        return ErrorResult(500, "Internal Server Error", load_error);
    }
    std::string error;
    const auto view = ParsePublishedViewRecord(body, view_id, sources_, &error);
    if (!view.has_value()) {
        return ErrorResult(400, "Bad Request", error);
    }
    bool updated = false;
    auto next_views = views_;
    for (auto& item : next_views) {
        if (item.view_id == view->view_id) {
            item = *view;
            updated = true;
            break;
        }
    }
    if (!updated) {
        next_views.push_back(*view);
    }
    std::string save_error;
    if (!SaveViewsLocked(next_views, &save_error)) {
        return ErrorResult(500, "Internal Server Error", save_error);
    }
    views_ = std::move(next_views);
    return JsonResult(updated ? 200 : 201,
                      updated ? "OK" : "Created",
                      "{\"ok\":true,\"status\":\"" + std::string(updated ? "updated" : "created") +
                          "\",\"view\":" + PublishedViewJson(*view) + "}");
}

RegistryResult SourceViewRegistry::DisableView(const std::string& view_id) {
    std::lock_guard lock(mu_);
    std::string load_error;
    if (!EnsureLoadedLocked(&load_error)) {
        return ErrorResult(500, "Internal Server Error", load_error);
    }
    auto next_views = views_;
    for (auto& view : next_views) {
        if (view.view_id == view_id) {
            view.enabled = false;
            const std::string view_json = PublishedViewJson(view);
            std::string save_error;
            if (!SaveViewsLocked(next_views, &save_error)) {
                return ErrorResult(500, "Internal Server Error", save_error);
            }
            views_ = std::move(next_views);
            return JsonResult(200,
                              "OK",
                              "{\"ok\":true,\"status\":\"disabled\",\"view\":" +
                                  view_json + "}");
        }
    }
    return ErrorResult(404, "Not Found", "PublishedView not found");
}

bool SourceViewRegistry::EnsureLoadedLocked(std::string* error_message) {
    if (loaded_) {
        return true;
    }
    source_storage_path_ = app::GetAppConfig().source_registry_path;
    views_storage_path_ = app::GetAppConfig().published_views_path;
    if (!RecoverOnvifSourceViewTransaction(source_storage_path_,
                                           views_storage_path_,
                                           error_message)) {
        return false;
    }
    std::vector<SourceRecord> loaded_sources;
    std::vector<PublishedViewRecord> loaded_views;
    bool source_file_exists = false;
    bool views_file_exists = false;
    bool sources_seeded = false;
    bool views_seeded = false;

    if (!LoadSourcesFromFile(source_storage_path_,
                             &loaded_sources,
                             &source_file_exists,
                             error_message)) {
        return false;
    }
    if (loaded_sources.empty()) {
        for (auto& source : DefaultSourceRecords()) {
            if (!source.source_id.empty() && !source.canonical_source_key.empty() &&
                !FindDuplicateSourceId(loaded_sources, source.canonical_source_key, source.source_id)
                     .has_value() &&
                !FindSource(loaded_sources, source.source_id).has_value()) {
                loaded_sources.push_back(std::move(source));
                sources_seeded = true;
            }
        }
    }
    if (!LoadViewsFromFile(views_storage_path_,
                           loaded_sources,
                           &loaded_views,
                           &views_file_exists,
                           error_message)) {
        return false;
    }
    if (loaded_views.empty()) {
        for (const auto& source : loaded_sources) {
            loaded_views.push_back(DefaultPublishedViewRecord(source));
        }
        views_seeded = true;
    }
    if ((sources_seeded || !source_file_exists) &&
        !SaveSourcesLocked(loaded_sources, error_message)) {
        return false;
    }
    if ((views_seeded || !views_file_exists) && !SaveViewsLocked(loaded_views, error_message)) {
        return false;
    }
    sources_ = std::move(loaded_sources);
    views_ = std::move(loaded_views);
    loaded_ = true;
    return true;
}

bool SourceViewRegistry::SaveSourcesLocked(const std::vector<SourceRecord>& sources,
                                           std::string* error_message,
                                           bool* target_replaced) const {
    return WriteRegistryFileAtomically(source_storage_path_,
                                       SourcesDocumentJson(sources),
                                       "source registry",
                                       error_message,
                                       target_replaced);
}

bool SourceViewRegistry::SaveViewsLocked(const std::vector<PublishedViewRecord>& views,
                                         std::string* error_message,
                                         bool* target_replaced) const {
    return WriteRegistryFileAtomically(views_storage_path_,
                                       ViewsDocumentJson(views),
                                       "published view registry",
                                       error_message,
                                       target_replaced);
}

namespace {

bool ShouldInjectRegistryWriteFailure(const std::string& label,
                                      const std::string& phase) {
    const char* enabled = std::getenv("MEDIA_SERVER_ENABLE_TEST_FAILURE_INJECTION");
    const char* configured = std::getenv("MEDIA_SERVER_TEST_REGISTRY_WRITE_FAILURES");
    if (enabled == nullptr || std::string(enabled) != "1" || configured == nullptr) {
        return false;
    }
    const std::string expected = label + ":" + phase;
    std::istringstream input(configured);
    std::string item;
    while (std::getline(input, item, ',')) {
        if (Trim(item) == expected) {
            errno = EIO;
            return true;
        }
    }
    return false;
}


bool CaptureRegistryFileSnapshot(const std::filesystem::path& file_path,
                                 const std::string& label,
                                 RegistryFileSnapshot* snapshot,
                                 std::string* error_message) {
    if (snapshot == nullptr) {
        return SetError(error_message, label + " snapshot output is required");
    }
    *snapshot = RegistryFileSnapshot{};
    std::error_code ec;
    snapshot->exists = std::filesystem::exists(file_path, ec);
    if (ec) {
        return SetError(error_message, "failed to inspect " + label + " snapshot: " + ec.message());
    }
    if (!snapshot->exists) {
        return true;
    }
    const auto status = std::filesystem::status(file_path, ec);
    if (ec || !std::filesystem::is_regular_file(status)) {
        return SetError(error_message, "failed to inspect regular " + label + " snapshot");
    }
    snapshot->mode = status.permissions();
    std::ifstream input(file_path, std::ios::binary);
    if (!input) {
        return SetError(error_message, "failed to open " + label + " snapshot");
    }
    std::ostringstream bytes;
    bytes << input.rdbuf();
    if (!input.good() && !input.eof()) {
        return SetError(error_message, "failed to read " + label + " snapshot");
    }
    snapshot->bytes = bytes.str();
    return true;
}

bool RestoreRegistryFileSnapshot(const std::filesystem::path& file_path,
                                 const RegistryFileSnapshot& snapshot,
                                 const std::string& label,
                                 std::string* error_message) {
    if (!snapshot.exists) {
        std::error_code ec;
        const bool removed = std::filesystem::remove(file_path, ec);
        if (ec) {
            return SetError(error_message, "failed to remove newly created " + label + ": " + ec.message());
        }
        if (!removed && std::filesystem::exists(file_path, ec)) {
            return SetError(error_message, "failed to restore absent " + label);
        }
#if !defined(_WIN32)
        return FsyncParentDirectory(file_path, error_message);
#else
        if (error_message != nullptr) {
            error_message->clear();
        }
        return true;
#endif
    }
    bool target_replaced = false;
    if (!WriteRegistryFileAtomically(file_path,
                                     snapshot.bytes,
                                     label,
                                     error_message,
                                     &target_replaced)) {
        return false;
    }
    std::error_code ec;
    std::filesystem::permissions(file_path,
                                 snapshot.mode,
                                 std::filesystem::perm_options::replace,
                                 ec);
    if (ec) {
        return SetError(error_message, "failed to restore " + label + " mode: " + ec.message());
    }
#if !defined(_WIN32)
    const int fd = ::open(file_path.c_str(), O_RDONLY | O_CLOEXEC);
    if (fd < 0) {
        return SetError(error_message, ErrnoMessage("failed to open restored " + label));
    }
    if (!FsyncFd(fd, "restored " + label, error_message)) {
        (void)::close(fd);
        return false;
    }
    if (!CloseFdChecked(fd, "restored " + label, error_message)) {
        return false;
    }
#endif
#if !defined(_WIN32)
    return FsyncParentDirectory(file_path, error_message);
#else
    if (error_message != nullptr) {
        error_message->clear();
    }
    return true;
#endif
}

std::filesystem::path OnvifSourceViewMarkerPath(const std::filesystem::path& source_path) {
    return source_path.string() + ".onvif-pair.txn";
}

std::filesystem::path OnvifSourceRollbackPath(const std::filesystem::path& source_path) {
    return source_path.string() + ".onvif-pair.source.rollback";
}

std::filesystem::path OnvifViewRollbackPath(const std::filesystem::path& source_path) {
    return source_path.string() + ".onvif-pair.view.rollback";
}

unsigned int SnapshotMode(const RegistryFileSnapshot& snapshot) {
    return static_cast<unsigned int>(snapshot.mode) & 0777U;
}

std::string OnvifSourceViewMarkerBody(const std::string& state,
                                      const RegistryFileSnapshot& source_snapshot,
                                      const RegistryFileSnapshot& view_snapshot) {
    std::ostringstream out;
    out << "media-server.onvif-source-view-transaction.v1\n"
        << "state=" << state << "\n"
        << "source=" << (source_snapshot.exists ? "present" : "absent") << "\n"
        << "sourceMode=" << (source_snapshot.exists ? SnapshotMode(source_snapshot) : 0U) << "\n"
        << "view=" << (view_snapshot.exists ? "present" : "absent") << "\n"
        << "viewMode=" << (view_snapshot.exists ? SnapshotMode(view_snapshot) : 0U) << "\n";
    return out.str();
}

bool RemoveFileDurably(const std::filesystem::path& file_path,
                       const std::string& label,
                       std::string* error_message) {
    std::error_code ec;
    const bool removed = std::filesystem::remove(file_path, ec);
    if (ec) {
        return SetError(error_message, "failed to remove " + label + ": " + ec.message());
    }
#if !defined(_WIN32)
    if (removed && !FsyncParentDirectory(file_path, error_message)) {
        return false;
    }
#endif
    if (error_message != nullptr) {
        error_message->clear();
    }
    return true;
}

bool RemoveMatchingTransactionTemps(const std::filesystem::path& file_path,
                                    std::string* error_message) {
    const auto parent = file_path.parent_path().empty() ? std::filesystem::path(".")
                                                        : file_path.parent_path();
    const std::string prefix = file_path.filename().string() + ".tmp.";
    std::error_code ec;
    std::filesystem::directory_iterator it(parent, ec);
    if (ec) {
        if (ec == std::errc::no_such_file_or_directory) {
            return true;
        }
        return SetError(error_message,
                        "failed to inspect ONVIF transaction temporary files: " + ec.message());
    }
    for (const auto& entry : it) {
        const std::string name = entry.path().filename().string();
        if (name.rfind(prefix, 0) != 0) {
            continue;
        }
        if (!RemoveFileDurably(entry.path(), "ONVIF transaction temporary file", error_message)) {
            return false;
        }
    }
    return true;
}

bool CleanupOnvifSourceViewTransaction(const OnvifSourceViewTransaction& transaction,
                                       std::string* error_message) {
    for (const auto& artifact : {transaction.marker_path,
                                 transaction.source_rollback_path,
                                 transaction.view_rollback_path}) {
        if (!RemoveFileDurably(artifact, "ONVIF source/view transaction artifact", error_message)) {
            return false;
        }
    }
    for (const auto& artifact : {transaction.marker_path,
                                 transaction.source_rollback_path,
                                 transaction.view_rollback_path}) {
        if (!RemoveMatchingTransactionTemps(artifact, error_message)) {
            return false;
        }
    }
    return true;
}

std::optional<std::string> TransactionMarkerField(const std::string& body,
                                                  const std::string& field) {
    const std::string prefix = field + "=";
    std::istringstream input(body);
    std::string line;
    while (std::getline(input, line)) {
        if (line.rfind(prefix, 0) == 0) {
            return line.substr(prefix.size());
        }
    }
    return std::nullopt;
}

bool ParseSnapshotMode(const std::string& value,
                       std::filesystem::perms* mode,
                       std::string* error_message) {
    if (mode == nullptr || value.empty()) {
        return SetError(error_message, "ONVIF transaction snapshot mode is missing");
    }
    char* end = nullptr;
    errno = 0;
    const unsigned long parsed = std::strtoul(value.c_str(), &end, 10);
    if (errno != 0 || end == value.c_str() || *end != '\0' || parsed > 0777UL) {
        return SetError(error_message, "ONVIF transaction snapshot mode is invalid");
    }
    *mode = static_cast<std::filesystem::perms>(parsed);
    return true;
}

bool LoadRollbackSnapshot(const std::filesystem::path& artifact_path,
                          const std::string& presence,
                          const std::string& mode_value,
                          const std::string& label,
                          RegistryFileSnapshot* snapshot,
                          std::string* error_message) {
    if (snapshot == nullptr) {
        return SetError(error_message, label + " rollback snapshot output is required");
    }
    *snapshot = RegistryFileSnapshot{};
    if (presence == "absent") {
        if (std::filesystem::exists(artifact_path)) {
            return SetError(error_message, label + " absent snapshot unexpectedly has an artifact");
        }
        return true;
    }
    if (presence != "present") {
        return SetError(error_message, label + " snapshot presence is invalid");
    }
    snapshot->exists = true;
    if (!ParseSnapshotMode(mode_value, &snapshot->mode, error_message)) {
        return false;
    }
    return ReadTextFile(artifact_path, label + " rollback snapshot", &snapshot->bytes, error_message);
}

bool RecoverOnvifSourceViewTransaction(const std::filesystem::path& source_path,
                                       const std::filesystem::path& view_path,
                                       std::string* error_message) {
    OnvifSourceViewTransaction transaction;
    transaction.marker_path = OnvifSourceViewMarkerPath(source_path);
    transaction.source_rollback_path = OnvifSourceRollbackPath(source_path);
    transaction.view_rollback_path = OnvifViewRollbackPath(source_path);

    std::error_code exists_error;
    const bool marker_exists = std::filesystem::exists(transaction.marker_path, exists_error);
    if (exists_error) {
        return SetError(error_message,
                        "failed to inspect ONVIF source/view transaction marker: " +
                            exists_error.message());
    }
    if (!marker_exists) {
        return CleanupOnvifSourceViewTransaction(transaction, error_message) &&
               RemoveMatchingTransactionTemps(source_path, error_message) &&
               RemoveMatchingTransactionTemps(view_path, error_message);
    }

    std::string marker;
    if (!ReadTextFile(transaction.marker_path,
                      "ONVIF source/view transaction marker",
                      &marker,
                      error_message)) {
        return false;
    }
    if (marker.rfind("media-server.onvif-source-view-transaction.v1\n", 0) != 0) {
        return SetError(error_message, "invalid ONVIF source/view transaction marker schema");
    }
    const auto state = TransactionMarkerField(marker, "state");
    const auto source_presence = TransactionMarkerField(marker, "source");
    const auto source_mode = TransactionMarkerField(marker, "sourceMode");
    const auto view_presence = TransactionMarkerField(marker, "view");
    const auto view_mode = TransactionMarkerField(marker, "viewMode");
    if (!state.has_value() || !source_presence.has_value() || !source_mode.has_value() ||
        !view_presence.has_value() || !view_mode.has_value() ||
        (*state != "prepared" && *state != "committed")) {
        return SetError(error_message, "invalid ONVIF source/view transaction marker fields");
    }

    if (*state == "prepared") {
        if (!LoadRollbackSnapshot(transaction.source_rollback_path,
                                  *source_presence,
                                  *source_mode,
                                  "source registry",
                                  &transaction.source_snapshot,
                                  error_message) ||
            !LoadRollbackSnapshot(transaction.view_rollback_path,
                                  *view_presence,
                                  *view_mode,
                                  "published view registry",
                                  &transaction.view_snapshot,
                                  error_message)) {
            return false;
        }
        std::string source_error;
        std::string view_error;
        const bool source_restored = RestoreRegistryFileSnapshot(
            source_path, transaction.source_snapshot, "source registry crash recovery", &source_error);
        const bool view_restored = RestoreRegistryFileSnapshot(
            view_path, transaction.view_snapshot, "published view registry crash recovery", &view_error);
        if (!source_restored || !view_restored) {
            return SetError(error_message,
                            "failed to recover prepared ONVIF source/view transaction: " +
                                source_error + (source_error.empty() || view_error.empty() ? "" : "; ") +
                                view_error);
        }
    }

    return CleanupOnvifSourceViewTransaction(transaction, error_message) &&
           RemoveMatchingTransactionTemps(source_path, error_message) &&
           RemoveMatchingTransactionTemps(view_path, error_message);
}

bool PrepareOnvifSourceViewTransaction(const std::filesystem::path& source_path,
                                       const std::filesystem::path& view_path,
                                       OnvifSourceViewTransaction* transaction,
                                       std::string* error_message) {
    if (transaction == nullptr) {
        return SetError(error_message, "ONVIF source/view transaction output is required");
    }
    *transaction = OnvifSourceViewTransaction{};
    transaction->marker_path = OnvifSourceViewMarkerPath(source_path);
    transaction->source_rollback_path = OnvifSourceRollbackPath(source_path);
    transaction->view_rollback_path = OnvifViewRollbackPath(source_path);
    if (!RecoverOnvifSourceViewTransaction(source_path, view_path, error_message) ||
        !CaptureRegistryFileSnapshot(source_path,
                                     "source registry",
                                     &transaction->source_snapshot,
                                     error_message) ||
        !CaptureRegistryFileSnapshot(view_path,
                                     "published view registry",
                                     &transaction->view_snapshot,
                                     error_message)) {
        return false;
    }

    bool ignored_replaced = false;
    if (transaction->source_snapshot.exists &&
        !WriteRegistryFileAtomically(transaction->source_rollback_path,
                                     transaction->source_snapshot.bytes,
                                     "ONVIF source rollback snapshot",
                                     error_message,
                                     &ignored_replaced,
                                     0600U)) {
        (void)CleanupOnvifSourceViewTransaction(*transaction, nullptr);
        return false;
    }
    if (transaction->view_snapshot.exists &&
        !WriteRegistryFileAtomically(transaction->view_rollback_path,
                                     transaction->view_snapshot.bytes,
                                     "ONVIF view rollback snapshot",
                                     error_message,
                                     &ignored_replaced,
                                     0600U)) {
        (void)CleanupOnvifSourceViewTransaction(*transaction, nullptr);
        return false;
    }
    if (!WriteRegistryFileAtomically(
            transaction->marker_path,
            OnvifSourceViewMarkerBody("prepared",
                                      transaction->source_snapshot,
                                      transaction->view_snapshot),
            "ONVIF source/view transaction marker",
            error_message,
            &ignored_replaced,
            0600U)) {
        (void)CleanupOnvifSourceViewTransaction(*transaction, nullptr);
        return false;
    }
    return true;
}

bool RollbackOnvifSourceViewTransaction(const std::filesystem::path& source_path,
                                        const std::filesystem::path& view_path,
                                        const OnvifSourceViewTransaction& transaction,
                                        std::string* error_message) {
    std::string source_error;
    std::string view_error;
    const bool source_restored = RestoreRegistryFileSnapshot(
        source_path, transaction.source_snapshot, "source registry rollback snapshot", &source_error);
    const bool view_restored = RestoreRegistryFileSnapshot(
        view_path, transaction.view_snapshot, "published view registry rollback snapshot", &view_error);
    if (!source_restored || !view_restored) {
        return SetError(error_message,
                        source_error + (source_error.empty() || view_error.empty() ? "" : "; ") +
                            view_error);
    }
    return CleanupOnvifSourceViewTransaction(transaction, error_message);
}

bool CommitOnvifSourceViewTransaction(const OnvifSourceViewTransaction& transaction,
                                      std::string* error_message) {
    bool ignored_replaced = false;
    if (!WriteRegistryFileAtomically(
            transaction.marker_path,
            OnvifSourceViewMarkerBody("committed",
                                      transaction.source_snapshot,
                                      transaction.view_snapshot),
            "ONVIF source/view transaction marker",
            error_message,
            &ignored_replaced,
            0600U)) {
        return false;
    }
    MaybeCrashOnvifSourceViewTransaction("after-committed");
    std::string cleanup_error;
    if (!CleanupOnvifSourceViewTransaction(transaction, &cleanup_error)) {
        std::cerr << "[source-view-registry] committed ONVIF transaction cleanup deferred: "
                  << cleanup_error << "\n";
    }
    if (error_message != nullptr) {
        error_message->clear();
    }
    return true;
}

void MaybeCrashOnvifSourceViewTransaction(const std::string& stage) {
    const char* enabled = std::getenv("MEDIA_SERVER_ENABLE_TEST_FAILURE_INJECTION");
    const char* configured = std::getenv("MEDIA_SERVER_TEST_ONVIF_SOURCE_VIEW_CRASH_AT");
    if (enabled == nullptr || std::string(enabled) != "1" || configured == nullptr ||
        stage != configured) {
        return;
    }
    std::_Exit(86);
}


}  // namespace

}  // namespace ingress

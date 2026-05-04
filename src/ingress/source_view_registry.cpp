// 파일 요약: 운영 source registry와 PublishedView registry를 구현한다.
// 동작 요약: source 원본 URL은 ops API에만 노출하고 client API는 view scope에 맞는 공개 정보만 반환한다.
#include "ingress/source_view_registry.h"

#include <algorithm>
#include <cctype>
#include <cstdlib>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <optional>
#include <sstream>
#include <utility>

#include "app_config.h"

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

std::vector<std::string> ExtractJsonObjectArray(const std::string& body, const std::string& field) {
    std::vector<std::string> objects;
    const auto colon_pos = FindJsonFieldColon(body, field);
    if (!colon_pos.has_value()) {
        return objects;
    }
    std::size_t pos = body.find('[', *colon_pos + 1);
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

bool IsSafeRegistryId(const std::string& id) {
    return !id.empty() && std::all_of(id.begin(), id.end(), [](unsigned char ch) {
        return std::isalnum(ch) != 0 || ch == '-' || ch == '_' || ch == '.';
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
    if (!http_url.empty()) {
        return "http";
    }
    return std::string();
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

    return {file_source, va_source, rtsp_source, http_source};
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
    if (!IsSafeRegistryId(source.source_id)) {
        if (error_message != nullptr) {
            *error_message = "sourceId must use letters, numbers, '.', '_' or '-'";
        }
        return std::nullopt;
    }

    const std::string generic_url = ParseStringField(body, "url").value_or("");
    source.display_name = Trim(ParseStringField(body, "displayName").value_or(source.source_id));
    source.file = Trim(ParseStringField(body, "file").value_or(""));
    source.rtsp_url = Trim(ParseStringField(body, "rtspUrl").value_or(""));
    source.webrtc_source_id = Trim(ParseStringField(body, "webrtcSourceId").value_or(""));
    source.http_url = Trim(ParseStringField(body, "httpUrl").value_or(""));
    source.kind = InferSourceKind(ParseStringField(body, "kind").value_or(""),
                                  source.file,
                                  source.rtsp_url,
                                  source.webrtc_source_id,
                                  source.http_url);
    if (source.rtsp_url.empty() && source.kind == "rtsp" && !generic_url.empty()) {
        source.rtsp_url = Trim(generic_url);
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
                                  source.http_url);
    source.enabled = ParseBoolField(body, "enabled").value_or(true);
    source.tags = ParseStringArrayField(body, "tags");
    source.owner_group = Trim(ParseStringField(body, "ownerGroup").value_or(""));
    source.canonical_source_key = CanonicalSourceKey(source);
    if (source.kind.empty() || source.canonical_source_key.empty()) {
        if (error_message != nullptr) {
            *error_message = "source requires kind plus one locator field: file, rtspUrl, webrtcSourceId or httpUrl";
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
    if (!IsSafeRegistryId(view.view_id)) {
        if (error_message != nullptr) {
            *error_message = "viewId must use letters, numbers, '.', '_' or '-'";
        }
        return std::nullopt;
    }

    view.display_name = Trim(ParseStringField(body, "displayName").value_or(view.view_id));
    view.source_id = Trim(ParseStringField(body, "sourceId").value_or(""));
    if (!IsSafeRegistryId(view.source_id)) {
        if (error_message != nullptr) {
            *error_message = "PublishedView requires sourceId";
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
        view.allowed_overlay_modes = {"raw", "va-overlay", "va-rule"};
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
    if (include_sensitive) {
        bool first = false;
        out << ",\"canonicalSourceKey\":\"" << JsonEscape(source.canonical_source_key) << "\"";
        AppendOptionalStringField(out, "file", source.file, &first);
        AppendOptionalStringField(out, "rtspUrl", source.rtsp_url, &first);
        AppendOptionalStringField(out, "webrtcSourceId", source.webrtc_source_id, &first);
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

bool PrincipalCanAccessViewFeature(const auth::Principal& principal,
                                   const std::string& view_id,
                                   const std::string& scope_prefix) {
    return auth::RequireRole(principal, {"operator"}) ||
           auth::RequireScope(principal, scope_prefix + ":" + view_id);
}

bool PrincipalCanReadView(const auth::Principal& principal, const std::string& view_id) {
    return PrincipalCanAccessViewFeature(principal, view_id, "view:read");
}

bool ViewIsClientVisible(const SourceViewRegistry::PublishedViewRecord& view,
                         const std::vector<SourceViewRegistry::SourceRecord>& sources,
                         const auth::Principal& principal) {
    const auto source = FindSource(sources, view.source_id);
    return view.enabled && source.has_value() && source->enabled &&
           PrincipalCanReadView(principal, view.view_id);
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
        << "\"defaultRuleId\":\"" << JsonEscape(view.default_rule_id) << "\","
        << "\"allowedRuleIds\":";
    AppendStringArray(out, view.allowed_rule_ids);
    out << ",\"allowedOverlayModes\":";
    AppendStringArray(out, view.allowed_overlay_modes);
    out << ",\"showDashboard\":" << (view.show_dashboard ? "true" : "false")
        << ",\"showEvents\":" << (view.show_events ? "true" : "false")
        << ",\"showMetadataSummary\":" << (view.show_metadata_summary ? "true" : "false")
        << ",\"maxTiles\":" << view.max_tiles
        << "}";
    return out.str();
}

RegistryResult JsonResult(int status, const std::string& status_text, const std::string& body) {
    return RegistryResult{status, status_text, body};
}

RegistryResult ErrorResult(int status, const std::string& status_text, const std::string& error) {
    return JsonResult(status,
                      status_text,
                      "{\"ok\":false,\"error\":\"" + JsonEscape(error) + "\"}");
}

}  // namespace

SourceViewRegistry& SourceViewRegistry::Instance() {
    static SourceViewRegistry registry;
    return registry;
}

std::string SourceViewRegistry::SourcesJson() {
    std::lock_guard lock(mu_);
    EnsureLoadedLocked();
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
    return out.str();
}

std::string SourceViewRegistry::ViewsJson() {
    std::lock_guard lock(mu_);
    EnsureLoadedLocked();
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
    return out.str();
}

std::string SourceViewRegistry::ClientViewsJson(const auth::Principal& principal) {
    std::lock_guard lock(mu_);
    EnsureLoadedLocked();
    std::ostringstream out;
    out << "{\"status\":\"clientViews\",\"views\":[";
    bool first = true;
    for (const auto& view : views_) {
        if (!ViewIsClientVisible(view, sources_, principal)) {
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
    return out.str();
}

RegistryResult SourceViewRegistry::ClientViewJson(const std::string& view_id,
                                                  const auth::Principal& principal) {
    ClientViewAccess access;
    const auto result = ResolveClientViewAccess(view_id, principal, "view:read", &access);
    if (result.status != 200) {
        return result;
    }
    return JsonResult(200, "OK", "{\"ok\":true,\"view\":" +
                                     ClientPublishedViewJson(access.view, access.source) + "}");
}

RegistryResult SourceViewRegistry::ResolveClientViewAccess(const std::string& view_id,
                                                           const auth::Principal& principal,
                                                           const std::string& required_scope_prefix,
                                                           ClientViewAccess* access) {
    if (access == nullptr) {
        return ErrorResult(500, "Internal Server Error", "ClientViewAccess output is required");
    }
    std::lock_guard lock(mu_);
    EnsureLoadedLocked();
    const auto view_it = std::find_if(views_.begin(), views_.end(), [&](const auto& view) {
        return view.view_id == view_id;
    });
    if (view_it == views_.end() || !view_it->enabled) {
        return ErrorResult(404, "Not Found", "PublishedView not found");
    }
    if (!PrincipalCanAccessViewFeature(principal, view_it->view_id, required_scope_prefix)) {
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

RegistryResult SourceViewRegistry::CreateSource(const std::string& body) {
    std::lock_guard lock(mu_);
    EnsureLoadedLocked();
    std::string error;
    const auto source = ParseSourceRecord(body, "", &error);
    if (!source.has_value()) {
        return ErrorResult(400, "Bad Request", error);
    }
    if (FindSource(sources_, source->source_id).has_value()) {
        return ErrorResult(409, "Conflict", "sourceId already exists");
    }
    if (const auto duplicate = FindDuplicateSourceId(sources_, source->canonical_source_key, "");
        duplicate.has_value()) {
        return JsonResult(409,
                          "Conflict",
                          "{\"ok\":false,\"error\":\"duplicate source\",\"duplicateSourceId\":\"" +
                              JsonEscape(*duplicate) + "\"}");
    }
    sources_.push_back(*source);
    SaveSourcesLocked();
    return JsonResult(201, "Created", "{\"ok\":true,\"status\":\"created\",\"source\":" +
                                          SourceJson(*source, true) + "}");
}

RegistryResult SourceViewRegistry::UpsertSource(const std::string& source_id, const std::string& body) {
    std::lock_guard lock(mu_);
    EnsureLoadedLocked();
    std::string error;
    const auto source = ParseSourceRecord(body, source_id, &error);
    if (!source.has_value()) {
        return ErrorResult(400, "Bad Request", error);
    }
    if (const auto duplicate =
            FindDuplicateSourceId(sources_, source->canonical_source_key, source->source_id);
        duplicate.has_value()) {
        return JsonResult(409,
                          "Conflict",
                          "{\"ok\":false,\"error\":\"duplicate source\",\"duplicateSourceId\":\"" +
                              JsonEscape(*duplicate) + "\"}");
    }
    bool updated = false;
    for (auto& item : sources_) {
        if (item.source_id == source->source_id) {
            item = *source;
            updated = true;
            break;
        }
    }
    if (!updated) {
        sources_.push_back(*source);
    }
    SaveSourcesLocked();
    return JsonResult(updated ? 200 : 201,
                      updated ? "OK" : "Created",
                      "{\"ok\":true,\"status\":\"" + std::string(updated ? "updated" : "created") +
                          "\",\"source\":" + SourceJson(*source, true) + "}");
}

RegistryResult SourceViewRegistry::DisableSource(const std::string& source_id) {
    std::lock_guard lock(mu_);
    EnsureLoadedLocked();
    for (auto& source : sources_) {
        if (source.source_id == source_id) {
            source.enabled = false;
            SaveSourcesLocked();
            return JsonResult(200,
                              "OK",
                              "{\"ok\":true,\"status\":\"disabled\",\"source\":" +
                                  SourceJson(source, true) + "}");
        }
    }
    return ErrorResult(404, "Not Found", "Source not found");
}

RegistryResult SourceViewRegistry::CreateView(const std::string& body) {
    std::lock_guard lock(mu_);
    EnsureLoadedLocked();
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
    views_.push_back(*view);
    SaveViewsLocked();
    return JsonResult(201, "Created", "{\"ok\":true,\"status\":\"created\",\"view\":" +
                                          PublishedViewJson(*view) + "}");
}

RegistryResult SourceViewRegistry::UpsertView(const std::string& view_id, const std::string& body) {
    std::lock_guard lock(mu_);
    EnsureLoadedLocked();
    std::string error;
    const auto view = ParsePublishedViewRecord(body, view_id, sources_, &error);
    if (!view.has_value()) {
        return ErrorResult(400, "Bad Request", error);
    }
    bool updated = false;
    for (auto& item : views_) {
        if (item.view_id == view->view_id) {
            item = *view;
            updated = true;
            break;
        }
    }
    if (!updated) {
        views_.push_back(*view);
    }
    SaveViewsLocked();
    return JsonResult(updated ? 200 : 201,
                      updated ? "OK" : "Created",
                      "{\"ok\":true,\"status\":\"" + std::string(updated ? "updated" : "created") +
                          "\",\"view\":" + PublishedViewJson(*view) + "}");
}

RegistryResult SourceViewRegistry::DisableView(const std::string& view_id) {
    std::lock_guard lock(mu_);
    EnsureLoadedLocked();
    for (auto& view : views_) {
        if (view.view_id == view_id) {
            view.enabled = false;
            SaveViewsLocked();
            return JsonResult(200,
                              "OK",
                              "{\"ok\":true,\"status\":\"disabled\",\"view\":" +
                                  PublishedViewJson(view) + "}");
        }
    }
    return ErrorResult(404, "Not Found", "PublishedView not found");
}

void SourceViewRegistry::EnsureLoadedLocked() {
    if (loaded_) {
        return;
    }
    loaded_ = true;
    source_storage_path_ = app::GetAppConfig().source_registry_path;
    views_storage_path_ = app::GetAppConfig().published_views_path;
    bool sources_seeded = false;
    bool views_seeded = false;

    {
        std::ifstream in(source_storage_path_);
        if (in) {
            std::ostringstream buffer;
            buffer << in.rdbuf();
            for (const auto& raw : ExtractJsonObjectArray(buffer.str(), "sources")) {
                std::string error;
                const auto source = ParseSourceRecord(raw, "", &error);
                if (source.has_value() &&
                    !FindDuplicateSourceId(sources_, source->canonical_source_key, source->source_id).has_value() &&
                    !FindSource(sources_, source->source_id).has_value()) {
                    sources_.push_back(*source);
                }
            }
        }
    }
    if (sources_.empty()) {
        for (auto& source : DefaultSourceRecords()) {
            if (!source.source_id.empty() && !source.canonical_source_key.empty() &&
                !FindDuplicateSourceId(sources_, source.canonical_source_key, source.source_id).has_value() &&
                !FindSource(sources_, source.source_id).has_value()) {
                sources_.push_back(std::move(source));
                sources_seeded = true;
            }
        }
    }
    {
        std::ifstream in(views_storage_path_);
        if (in) {
            std::ostringstream buffer;
            buffer << in.rdbuf();
            for (const auto& raw : ExtractJsonObjectArray(buffer.str(), "views")) {
                std::string error;
                const auto view = ParsePublishedViewRecord(raw, "", sources_, &error);
                if (view.has_value()) {
                    const auto existing = std::find_if(views_.begin(), views_.end(), [&](const auto& item) {
                        return item.view_id == view->view_id;
                    });
                    if (existing == views_.end()) {
                        views_.push_back(*view);
                    }
                }
            }
        }
    }
    if (views_.empty()) {
        for (const auto& source : sources_) {
            views_.push_back(DefaultPublishedViewRecord(source));
        }
        views_seeded = true;
    }
    if (sources_seeded) {
        SaveSourcesLocked();
    }
    if (views_seeded) {
        SaveViewsLocked();
    }
}

void SourceViewRegistry::SaveSourcesLocked() const {
    if (source_storage_path_.empty()) {
        return;
    }
    const auto parent = source_storage_path_.parent_path();
    std::error_code ec;
    if (!parent.empty()) {
        std::filesystem::create_directories(parent, ec);
    }
    std::ofstream out(source_storage_path_, std::ios::trunc);
    if (!out) {
        std::cerr << "[source-registry] failed to open " << source_storage_path_ << " for write\n";
        return;
    }
    out << "{\n  \"sources\": [";
    for (std::size_t i = 0; i < sources_.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << "\n    " << SourceJson(sources_[i], true);
    }
    if (!sources_.empty()) {
        out << "\n  ";
    }
    out << "]\n}\n";
}

void SourceViewRegistry::SaveViewsLocked() const {
    if (views_storage_path_.empty()) {
        return;
    }
    const auto parent = views_storage_path_.parent_path();
    std::error_code ec;
    if (!parent.empty()) {
        std::filesystem::create_directories(parent, ec);
    }
    std::ofstream out(views_storage_path_, std::ios::trunc);
    if (!out) {
        std::cerr << "[published-view-registry] failed to open " << views_storage_path_ << " for write\n";
        return;
    }
    out << "{\n  \"views\": [";
    for (std::size_t i = 0; i < views_.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << "\n    " << PublishedViewJson(views_[i]);
    }
    if (!views_.empty()) {
        out << "\n  ";
    }
    out << "]\n}\n";
}

}  // namespace ingress

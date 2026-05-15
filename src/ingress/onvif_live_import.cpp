// 파일 요약: ONVIF live source import draft 생성 로직을 구현한다.
// 동작 요약: ONVIF 후보와 선택 profile을 검증하고 기존 source/view 저장 payload draft만 반환한다.
#include "ingress/onvif_live_import.h"

#include <algorithm>
#include <cctype>
#include <optional>
#include <sstream>
#include <string>
#include <vector>

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

bool LooksLikeJsonObject(const std::string& body) {
    const std::string trimmed = Trim(body);
    return trimmed.size() >= 2 && trimmed.front() == '{' && trimmed.back() == '}';
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

std::optional<std::string> ExtractObjectField(const std::string& body, const std::string& field) {
    return ExtractDelimitedField(body, field, '{', '}');
}

std::optional<std::string> ExtractArrayField(const std::string& body, const std::string& field) {
    return ExtractDelimitedField(body, field, '[', ']');
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

std::string JsonStringArrayOrDefault(const std::string& body,
                                     const std::string& field,
                                     const std::string& default_json) {
    const auto raw = ExtractArrayField(body, field);
    if (!raw.has_value()) {
        return default_json;
    }
    const std::vector<std::string> values = StringArrayValues(*raw);
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

bool IsNumericRegistryDraftId(const std::string& value) {
    return !value.empty() && std::all_of(value.begin(), value.end(), [](unsigned char ch) {
        return std::isdigit(ch) != 0;
    });
}

bool StringArrayContains(const std::vector<std::string>& values, const std::string& expected) {
    return std::find(values.begin(), values.end(), expected) != values.end();
}

}  // namespace

RegistryResult BuildOnvifLiveImportDraft(const std::string& body) {
    if (!LooksLikeJsonObject(body)) {
        return RegistryResult{400, "Bad Request", "{\"error\":\"request body must be a JSON object\"}"};
    }

    const auto decision = ExtractObjectField(body, "importDecision");
    if (!decision.has_value()) {
        return RegistryResult{400, "Bad Request", "{\"error\":\"importDecision object is required\"}"};
    }
    const std::string selected_token = Trim(ParseStringField(*decision, "selectedProfileToken").value_or(""));
    if (selected_token.empty()) {
        return RegistryResult{400, "Bad Request", "{\"error\":\"selectedProfileToken is required\"}"};
    }

    std::optional<std::string> selected_profile;
    for (const auto& profile : ExtractJsonObjectArray(body, "profiles")) {
        if (Trim(ParseStringField(profile, "token").value_or("")) == selected_token) {
            selected_profile = profile;
            break;
        }
    }
    if (!selected_profile.has_value()) {
        return RegistryResult{400, "Bad Request", "{\"error\":\"selected profile not found\"}"};
    }

    const std::string media_api = Trim(ParseStringField(*selected_profile, "mediaApi").value_or(""));
    const std::string encoding = Trim(ParseStringField(*selected_profile, "encoding").value_or(""));
    const std::string transport = Trim(ParseStringField(*selected_profile, "transport").value_or(""));
    const std::string stream_uri = Trim(ParseStringField(*selected_profile, "streamUri").value_or(""));
    if (media_api != "Media" && media_api != "Media2") {
        return RegistryResult{400, "Bad Request", "{\"error\":\"selected profile mediaApi must be Media or Media2\"}"};
    }
    if (encoding != "H264" && encoding != "H265") {
        return RegistryResult{400, "Bad Request", "{\"error\":\"selected profile encoding must be H264 or H265\"}"};
    }
    if (transport != "RTSP" || stream_uri.rfind("rtsp://", 0) != 0) {
        return RegistryResult{400, "Bad Request", "{\"error\":\"selected profile must provide an RTSP streamUri\"}"};
    }

    const auto source_raw = ExtractObjectField(*decision, "expectedSourceDraft");
    const auto view_raw = ExtractObjectField(*decision, "expectedPublishedViewDraft");
    if (!source_raw.has_value() || !view_raw.has_value()) {
        return RegistryResult{
            400,
            "Bad Request",
            "{\"error\":\"expectedSourceDraft and expectedPublishedViewDraft are required\"}"};
    }

    const std::string source_id = Trim(ParseStringField(*source_raw, "sourceId").value_or(""));
    if (!IsNumericRegistryDraftId(source_id)) {
        return RegistryResult{
            400,
            "Bad Request",
            "{\"error\":\"expectedSourceDraft.sourceId must be numeric for current /ops/sources contract\"}"};
    }
    const std::string view_id = Trim(ParseStringField(*view_raw, "viewId").value_or(source_id));
    const std::string view_source_id = Trim(ParseStringField(*view_raw, "sourceId").value_or(""));
    if (view_id != source_id || view_source_id != source_id) {
        return RegistryResult{
            400,
            "Bad Request",
            "{\"error\":\"expectedPublishedViewDraft must use the same numeric sourceId/viewId\"}"};
    }
    if (Trim(ParseStringField(*source_raw, "kind").value_or("")) != "rtsp") {
        return RegistryResult{400, "Bad Request", "{\"error\":\"expectedSourceDraft.kind must be rtsp\"}"};
    }
    if (Trim(ParseStringField(*source_raw, "rtspUrl").value_or("")) != stream_uri) {
        return RegistryResult{
            400,
            "Bad Request",
            "{\"error\":\"expectedSourceDraft.rtspUrl must match selected profile streamUri\"}"};
    }
    const std::vector<std::string> tags = StringArrayFieldValues(*source_raw, "tags");
    if (!StringArrayContains(tags, "onvif") || !StringArrayContains(tags, "live")) {
        return RegistryResult{
            400,
            "Bad Request",
            "{\"error\":\"expectedSourceDraft.tags must include onvif and live\"}"};
    }

    const auto device = ExtractObjectField(body, "device").value_or("{}");
    const auto auth = ExtractObjectField(body, "auth").value_or("{}");
    const bool credential_ref_present = !Trim(ParseStringField(auth, "credentialRef").value_or("")).empty();
    const bool plaintext_secret_included = ParseBoolField(auth, "plaintextSecretIncluded").value_or(false);
    if (plaintext_secret_included) {
        return RegistryResult{
            400,
            "Bad Request",
            "{\"error\":\"plaintext credentials are not allowed in ONVIF import drafts\"}"};
    }

    const std::string display_name =
        Trim(ParseStringField(*source_raw, "displayName").value_or(source_id));
    const std::string overlay_modes =
        JsonStringArrayOrDefault(*view_raw, "allowedOverlayModes", "[\"raw\",\"va-overlay\",\"va-rule\"]");
    const std::string client_groups = JsonStringArrayOrDefault(*view_raw, "clientGroups", "[]");
    const int max_tiles = std::max(1, ParseIntField(*view_raw, "maxTiles").value_or(1));

    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"status\":\"onvifImportDraft\","
        << "\"notSaved\":true,"
        << "\"candidate\":{"
        << "\"manufacturer\":\"" << JsonEscape(ParseStringField(device, "manufacturer").value_or("")) << "\","
        << "\"model\":\"" << JsonEscape(ParseStringField(device, "model").value_or("")) << "\","
        << "\"firmwareVersion\":\"" << JsonEscape(ParseStringField(device, "firmwareVersion").value_or("")) << "\","
        << "\"serialNumber\":\"" << JsonEscape(ParseStringField(device, "serialNumber").value_or("")) << "\""
        << "},"
        << "\"selectedProfile\":{"
        << "\"token\":\"" << JsonEscape(selected_token) << "\","
        << "\"name\":\"" << JsonEscape(ParseStringField(*selected_profile, "name").value_or("")) << "\","
        << "\"mediaApi\":\"" << JsonEscape(media_api) << "\","
        << "\"encoding\":\"" << JsonEscape(encoding) << "\","
        << "\"width\":" << ParseIntField(*selected_profile, "width").value_or(0) << ","
        << "\"height\":" << ParseIntField(*selected_profile, "height").value_or(0) << ","
        << "\"fps\":" << ParseIntField(*selected_profile, "fps").value_or(0) << ","
        << "\"transport\":\"RTSP\""
        << "},"
        << "\"auth\":{"
        << "\"required\":" << (ParseBoolField(auth, "required").value_or(false) ? "true" : "false") << ","
        << "\"credentialRefPresent\":" << (credential_ref_present ? "true" : "false") << ","
        << "\"plaintextSecretIncluded\":false"
        << "},"
        << "\"sourceDraft\":{"
        << "\"sourceId\":\"" << JsonEscape(source_id) << "\","
        << "\"displayName\":\"" << JsonEscape(display_name.empty() ? source_id : display_name) << "\","
        << "\"kind\":\"rtsp\","
        << "\"rtspUrl\":\"" << JsonEscape(stream_uri) << "\","
        << "\"enabled\":" << (ParseBoolField(*source_raw, "enabled").value_or(true) ? "true" : "false") << ","
        << "\"tags\":" << JsonStringArrayOrDefault(*source_raw, "tags", "[\"onvif\",\"live\"]") << ","
        << "\"ownerGroup\":\"" << JsonEscape(ParseStringField(*source_raw, "ownerGroup").value_or("")) << "\""
        << "},"
        << "\"publishedViewDraft\":{"
        << "\"viewId\":\"" << JsonEscape(view_id) << "\","
        << "\"displayName\":\"" << JsonEscape(ParseStringField(*view_raw, "displayName").value_or(display_name)) << "\","
        << "\"sourceId\":\"" << JsonEscape(source_id) << "\","
        << "\"allowedOverlayModes\":" << overlay_modes << ","
        << "\"showDashboard\":" << (ParseBoolField(*view_raw, "showDashboard").value_or(true) ? "true" : "false") << ","
        << "\"showEvents\":" << (ParseBoolField(*view_raw, "showEvents").value_or(true) ? "true" : "false") << ","
        << "\"showMetadataSummary\":"
        << (ParseBoolField(*view_raw, "showMetadataSummary").value_or(true) ? "true" : "false") << ","
        << "\"clientGroups\":" << client_groups << ","
        << "\"maxTiles\":" << max_tiles << ","
        << "\"enabled\":" << (ParseBoolField(*view_raw, "enabled").value_or(true) ? "true" : "false")
        << "}"
        << "}";
    return RegistryResult{200, "OK", out.str()};
}

}  // namespace ingress

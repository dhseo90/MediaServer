// 파일 요약: ONVIF live source import draft 생성 로직을 구현한다.
// 동작 요약: ONVIF 후보와 선택 profile을 검증하고 기존 source/view 저장 payload draft만 반환한다.
#include "ingress/onvif_live_import.h"

#include <arpa/inet.h>
#include <fcntl.h>
#include <netdb.h>
#include <poll.h>
#include <sys/socket.h>
#include <sys/time.h>
#include <unistd.h>

#if MEDIA_SERVER_USE_OPENSSL
#include <openssl/err.h>
#include <openssl/ssl.h>
#include <openssl/x509v3.h>
#endif

#include <algorithm>
#include <array>
#include <cctype>
#include <cstdlib>
#include <cstring>
#include <memory>
#include <optional>
#include <sstream>
#include <string>
#include <utility>
#include <vector>

#ifndef MEDIA_SERVER_USE_OPENSSL
#define MEDIA_SERVER_USE_OPENSSL 0
#endif

namespace ingress {

namespace {

struct ParsedHttpUrl {
    std::string scheme;
    std::string host;
    std::string port;
    std::string path;
};

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

bool IsRtspOrRtspsUri(const std::string& value) {
    return value.rfind("rtsp://", 0) == 0 || value.rfind("rtsps://", 0) == 0;
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

bool HasHttpOrHttpsUrl(const std::string& value) {
    const std::string trimmed = Trim(value);
    return trimmed.rfind("http://", 0) == 0 || trimmed.rfind("https://", 0) == 0;
}

bool IsHttpSoapTransportScheme(const std::string& scheme) {
    return scheme == "http" || scheme == "https";
}

std::optional<ParsedHttpUrl> ParseHttpUrl(const std::string& raw) {
    const std::string value = Trim(raw);
    const std::size_t scheme_pos = value.find("://");
    if (scheme_pos == std::string::npos) {
        return std::nullopt;
    }
    ParsedHttpUrl parsed;
    parsed.scheme = value.substr(0, scheme_pos);
    std::transform(parsed.scheme.begin(), parsed.scheme.end(), parsed.scheme.begin(), [](unsigned char ch) {
        return static_cast<char>(std::tolower(ch));
    });
    const std::size_t authority_start = scheme_pos + 3;
    const std::size_t path_pos = value.find('/', authority_start);
    std::string authority = path_pos == std::string::npos
        ? value.substr(authority_start)
        : value.substr(authority_start, path_pos - authority_start);
    if (authority.find('@') != std::string::npos) {
        return std::nullopt;
    }
    parsed.path = path_pos == std::string::npos ? "/" : value.substr(path_pos);
    if (authority.empty()) {
        return std::nullopt;
    }
    if (authority.front() == '[') {
        const std::size_t close = authority.find(']');
        if (close == std::string::npos) {
            return std::nullopt;
        }
        parsed.host = authority.substr(1, close - 1);
        if (close + 1 < authority.size()) {
            if (authority[close + 1] != ':') {
                return std::nullopt;
            }
            parsed.port = authority.substr(close + 2);
        }
    } else {
        const std::size_t colon = authority.rfind(':');
        if (colon != std::string::npos) {
            parsed.host = authority.substr(0, colon);
            parsed.port = authority.substr(colon + 1);
        } else {
            parsed.host = authority;
        }
    }
    if (parsed.host.empty()) {
        return std::nullopt;
    }
    if (parsed.port.empty()) {
        parsed.port = parsed.scheme == "https" ? "443" : "80";
    }
    if (parsed.path.empty() || parsed.path.front() != '/') {
        parsed.path = "/" + parsed.path;
    }
    return parsed;
}

bool HasAvailableService(const std::vector<OnvifServiceSummary>& services, const std::string& name) {
    return std::any_of(services.begin(), services.end(), [&](const auto& service) {
        return service.name == name && service.available;
    });
}

std::string XmlDecode(std::string value) {
    const std::vector<std::pair<std::string, std::string>> replacements = {
        {"&amp;", "&"},
        {"&quot;", "\""},
        {"&apos;", "'"},
        {"&lt;", "<"},
        {"&gt;", ">"},
    };
    for (const auto& replacement : replacements) {
        std::size_t pos = 0;
        while ((pos = value.find(replacement.first, pos)) != std::string::npos) {
            value.replace(pos, replacement.first.size(), replacement.second);
            pos += replacement.second.size();
        }
    }
    return value;
}

std::string XmlEscape(const std::string& value) {
    std::string out;
    out.reserve(value.size() + 8);
    for (const char ch : value) {
        switch (ch) {
            case '&':
                out += "&amp;";
                break;
            case '"':
                out += "&quot;";
                break;
            case '\'':
                out += "&apos;";
                break;
            case '<':
                out += "&lt;";
                break;
            case '>':
                out += "&gt;";
                break;
            default:
                out.push_back(ch);
                break;
        }
    }
    return out;
}

std::string XmlLocalName(const std::string& raw_name) {
    const std::size_t colon = raw_name.find(':');
    return colon == std::string::npos ? raw_name : raw_name.substr(colon + 1);
}

std::optional<std::string> XmlOpeningTag(const std::string& xml, std::size_t tag_start) {
    if (tag_start >= xml.size() || xml[tag_start] != '<') {
        return std::nullopt;
    }
    bool in_quote = false;
    char quote_ch = '\0';
    for (std::size_t pos = tag_start + 1; pos < xml.size(); ++pos) {
        const char ch = xml[pos];
        if (in_quote) {
            if (ch == quote_ch) {
                in_quote = false;
            }
            continue;
        }
        if (ch == '"' || ch == '\'') {
            in_quote = true;
            quote_ch = ch;
            continue;
        }
        if (ch == '>') {
            return xml.substr(tag_start, pos - tag_start + 1);
        }
    }
    return std::nullopt;
}

std::optional<std::string> XmlTagNameFromOpening(const std::string& opening_tag) {
    if (opening_tag.size() < 3 || opening_tag.front() != '<') {
        return std::nullopt;
    }
    std::size_t pos = 1;
    if (pos < opening_tag.size() && (opening_tag[pos] == '/' || opening_tag[pos] == '?' ||
                                     opening_tag[pos] == '!')) {
        return std::nullopt;
    }
    const std::size_t start = pos;
    while (pos < opening_tag.size() &&
           std::isspace(static_cast<unsigned char>(opening_tag[pos])) == 0 &&
           opening_tag[pos] != '/' &&
           opening_tag[pos] != '>') {
        ++pos;
    }
    if (pos == start) {
        return std::nullopt;
    }
    return opening_tag.substr(start, pos - start);
}

std::vector<std::string> XmlElementBlocks(const std::string& xml, const std::string& local_name) {
    std::vector<std::string> blocks;
    std::size_t search = 0;
    while (search < xml.size()) {
        const std::size_t start = xml.find('<', search);
        if (start == std::string::npos) {
            break;
        }
        const auto opening = XmlOpeningTag(xml, start);
        if (!opening.has_value()) {
            break;
        }
        const auto raw_name = XmlTagNameFromOpening(*opening);
        if (!raw_name.has_value() || XmlLocalName(*raw_name) != local_name) {
            search = start + 1;
            continue;
        }
        const std::size_t opening_end = start + opening->size();
        if (opening->size() >= 2 && (*opening)[opening->size() - 2] == '/') {
            blocks.push_back(*opening);
            search = opening_end;
            continue;
        }
        const std::string close_tag = "</" + *raw_name + ">";
        const std::size_t close_start = xml.find(close_tag, opening_end);
        if (close_start == std::string::npos) {
            search = opening_end;
            continue;
        }
        blocks.push_back(xml.substr(start, close_start + close_tag.size() - start));
        search = close_start + close_tag.size();
    }
    return blocks;
}

std::optional<std::string> XmlElementText(const std::string& xml, const std::string& local_name) {
    const auto blocks = XmlElementBlocks(xml, local_name);
    if (blocks.empty()) {
        return std::nullopt;
    }
    const std::string& block = blocks.front();
    const auto opening = XmlOpeningTag(block, 0);
    if (!opening.has_value()) {
        return std::nullopt;
    }
    const auto raw_name = XmlTagNameFromOpening(*opening);
    if (!raw_name.has_value()) {
        return std::nullopt;
    }
    const std::string close_tag = "</" + *raw_name + ">";
    const std::size_t close_start = block.rfind(close_tag);
    if (close_start == std::string::npos || close_start < opening->size()) {
        return std::nullopt;
    }
    return XmlDecode(Trim(block.substr(opening->size(), close_start - opening->size())));
}

std::optional<std::string> XmlAttributeValue(const std::string& opening_tag, const std::string& name) {
    std::size_t pos = opening_tag.find(name);
    while (pos != std::string::npos) {
        const bool starts_on_boundary =
            pos == 0 || std::isspace(static_cast<unsigned char>(opening_tag[pos - 1])) != 0 ||
            opening_tag[pos - 1] == '<';
        std::size_t after = pos + name.size();
        while (after < opening_tag.size() &&
               std::isspace(static_cast<unsigned char>(opening_tag[after])) != 0) {
            ++after;
        }
        if (starts_on_boundary && after < opening_tag.size() && opening_tag[after] == '=') {
            ++after;
            while (after < opening_tag.size() &&
                   std::isspace(static_cast<unsigned char>(opening_tag[after])) != 0) {
                ++after;
            }
            if (after >= opening_tag.size() || (opening_tag[after] != '"' && opening_tag[after] != '\'')) {
                return std::nullopt;
            }
            const char quote = opening_tag[after];
            const std::size_t value_start = after + 1;
            const std::size_t value_end = opening_tag.find(quote, value_start);
            if (value_end == std::string::npos) {
                return std::nullopt;
            }
            return XmlDecode(opening_tag.substr(value_start, value_end - value_start));
        }
        pos = opening_tag.find(name, pos + name.size());
    }
    return std::nullopt;
}

int ParseXmlInt(const std::optional<std::string>& value) {
    if (!value.has_value()) {
        return 0;
    }
    try {
        return std::stoi(Trim(*value));
    } catch (...) {
        return 0;
    }
}

std::string OnvifServiceNameFromNamespace(const std::string& namespace_uri) {
    if (namespace_uri.find("/device/wsdl") != std::string::npos) {
        return "Device";
    }
    if (namespace_uri.find("/ver20/media/wsdl") != std::string::npos ||
        namespace_uri.find("/media2/wsdl") != std::string::npos) {
        return "Media2";
    }
    if (namespace_uri.find("/media/wsdl") != std::string::npos) {
        return "Media";
    }
    if (namespace_uri.find("/recording/wsdl") != std::string::npos) {
        return "Recording";
    }
    if (namespace_uri.find("/replay/wsdl") != std::string::npos) {
        return "Replay";
    }
    if (namespace_uri.find("/ptz/wsdl") != std::string::npos) {
        return "PTZ";
    }
    return std::string();
}

std::string NormalizeOnvifEncoding(std::string encoding) {
    std::transform(encoding.begin(), encoding.end(), encoding.begin(), [](unsigned char ch) {
        return static_cast<char>(std::toupper(ch));
    });
    if (encoding == "H.264" || encoding == "H264") {
        return "H264";
    }
    if (encoding == "H.265" || encoding == "H265" || encoding == "HEVC") {
        return "H265";
    }
    return encoding;
}

std::string OnvifGetServicesEnvelope() {
    return R"SOAP(<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"
            xmlns:tds="http://www.onvif.org/ver10/device/wsdl">
  <s:Body>
    <tds:GetServices>
      <tds:IncludeCapability>false</tds:IncludeCapability>
    </tds:GetServices>
  </s:Body>
</s:Envelope>)SOAP";
}

std::string OnvifGetProfilesEnvelope(const std::string& media_api) {
    const std::string prefix = media_api == "Media2" ? "tr2" : "trt";
    const std::string media_namespace = media_api == "Media2"
        ? "http://www.onvif.org/ver20/media/wsdl"
        : "http://www.onvif.org/ver10/media/wsdl";
    std::ostringstream out;
    out << "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
        << "<s:Envelope xmlns:s=\"http://www.w3.org/2003/05/soap-envelope\""
        << " xmlns:" << prefix << "=\"" << media_namespace << "\">"
        << "<s:Body><" << prefix << ":GetProfiles/></s:Body></s:Envelope>";
    return out.str();
}

std::string OnvifGetStreamUriEnvelope(const OnvifMediaProfileSummary& profile) {
    const std::string prefix = profile.media_api == "Media2" ? "tr2" : "trt";
    const std::string media_namespace = profile.media_api == "Media2"
        ? "http://www.onvif.org/ver20/media/wsdl"
        : "http://www.onvif.org/ver10/media/wsdl";
    std::ostringstream out;
    out << "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
        << "<s:Envelope xmlns:s=\"http://www.w3.org/2003/05/soap-envelope\""
        << " xmlns:" << prefix << "=\"" << media_namespace << "\""
        << " xmlns:tt=\"http://www.onvif.org/ver10/schema\">"
        << "<s:Body><" << prefix << ":GetStreamUri>"
        << "<" << prefix << ":ProfileToken>" << XmlEscape(profile.token) << "</" << prefix << ":ProfileToken>"
        << "</" << prefix << ":GetStreamUri></s:Body></s:Envelope>";
    return out.str();
}

OnvifProbeResult ProbeError(const OnvifProbeRequest& request,
                            const std::string& step,
                            const std::string& message) {
    OnvifProbeResult result;
    result.ok = false;
    result.credential_ref_present = request.credential_ref_present;
    result.plaintext_secret_included = false;
    result.error = "ONVIF probe failed at " + step;
    if (!message.empty()) {
        result.error += ": " + message;
    }
    return result;
}

OnvifProbeResult TransportError(const OnvifProbeRequest& request,
                                const std::string& step,
                                const OnvifSoapResponse& response) {
    std::string message;
    if (response.status > 0) {
        message = "HTTP " + std::to_string(response.status);
    } else {
        message = "transport error";
    }
    return ProbeError(request, step, message);
}

OnvifSoapResponse SoapHttpError(const std::string& message, int status = 0) {
    OnvifSoapResponse response;
    response.ok = false;
    response.status = status;
    response.error = message;
    return response;
}

bool SetSocketBlocking(int fd, bool blocking) {
    const int flags = fcntl(fd, F_GETFL, 0);
    if (flags < 0) {
        return false;
    }
    const int next = blocking ? (flags & ~O_NONBLOCK) : (flags | O_NONBLOCK);
    return fcntl(fd, F_SETFL, next) == 0;
}

int ConnectTcpWithTimeout(const ParsedHttpUrl& url, int timeout_ms, std::string* error) {
    struct addrinfo hints {};
    hints.ai_socktype = SOCK_STREAM;
    hints.ai_family = AF_UNSPEC;

    struct addrinfo* raw_results = nullptr;
    const int gai = getaddrinfo(url.host.c_str(), url.port.c_str(), &hints, &raw_results);
    if (gai != 0) {
        if (error != nullptr) {
            *error = "resolve failed";
        }
        return -1;
    }

    int connected_fd = -1;
    for (auto* item = raw_results; item != nullptr; item = item->ai_next) {
        const int fd = socket(item->ai_family, item->ai_socktype, item->ai_protocol);
        if (fd < 0) {
            continue;
        }
        (void)SetSocketBlocking(fd, false);
        const int rc = connect(fd, item->ai_addr, item->ai_addrlen);
        if (rc == 0) {
            connected_fd = fd;
        } else if (errno == EINPROGRESS) {
            struct pollfd pfd {};
            pfd.fd = fd;
            pfd.events = POLLOUT;
            const int poll_rc = poll(&pfd, 1, std::max(1, timeout_ms));
            if (poll_rc > 0 && (pfd.revents & POLLOUT) != 0) {
                int socket_error = 0;
                socklen_t socket_error_len = sizeof(socket_error);
                if (getsockopt(fd, SOL_SOCKET, SO_ERROR, &socket_error, &socket_error_len) == 0 &&
                    socket_error == 0) {
                    connected_fd = fd;
                }
            }
        }
        if (connected_fd >= 0) {
            (void)SetSocketBlocking(connected_fd, true);
            break;
        }
        close(fd);
    }
    freeaddrinfo(raw_results);

    if (connected_fd < 0 && error != nullptr) {
        *error = "connect failed";
    }
    return connected_fd;
}

bool SendAll(int fd, const std::string& payload) {
    std::size_t offset = 0;
    while (offset < payload.size()) {
        const ssize_t sent = send(fd, payload.data() + offset, payload.size() - offset, 0);
        if (sent <= 0) {
            return false;
        }
        offset += static_cast<std::size_t>(sent);
    }
    return true;
}

bool IsSafeHttpHeaderName(const std::string& value) {
    if (value.empty()) {
        return false;
    }
    for (const char ch : value) {
        const bool alpha = (ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z');
        const bool digit = ch >= '0' && ch <= '9';
        const bool token = ch == '-' || ch == '_';
        if (!alpha && !digit && !token) {
            return false;
        }
    }
    return true;
}

bool IsSafeHttpHeaderValue(const std::string& value) {
    return value.find('\r') == std::string::npos && value.find('\n') == std::string::npos;
}

std::string Base64Encode(const std::string& value) {
    static constexpr char alphabet[] =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    std::string out;
    int value_bits = 0;
    int bit_count = -6;
    for (const unsigned char ch : value) {
        value_bits = (value_bits << 8) + ch;
        bit_count += 8;
        while (bit_count >= 0) {
            out.push_back(alphabet[(value_bits >> bit_count) & 0x3F]);
            bit_count -= 6;
        }
    }
    if (bit_count > -6) {
        out.push_back(alphabet[((value_bits << 8) >> (bit_count + 8)) & 0x3F]);
    }
    while (out.size() % 4 != 0) {
        out.push_back('=');
    }
    return out;
}

void ApplyCredentialMaterial(const CredentialLookupResult& lookup, OnvifSoapRequest* request) {
    if (request == nullptr || lookup.status != CredentialLookupStatus::kReady ||
        !lookup.secret_material_present) {
        return;
    }
    if (lookup.material.scheme != CredentialAuthScheme::kHttpBasic ||
        lookup.material.username.empty() || lookup.material.password.empty()) {
        return;
    }
    request->headers.push_back({
        "Authorization",
        "Basic " + Base64Encode(lookup.material.username + ":" + lookup.material.password),
    });
}

std::optional<OnvifSoapResponse> ParseHttpResponseText(const std::string& response_text);

std::string BuildSoapHttpRequest(const ParsedHttpUrl& url, const OnvifSoapRequest& request) {
    const std::string soap_action = request.action.empty() ? "ONVIF" : request.action;
    std::ostringstream http;
    http << "POST " << url.path << " HTTP/1.1\r\n"
         << "Host: " << url.host << "\r\n"
         << "User-Agent: MediaServer-ONVIF-Probe\r\n"
         << "Content-Type: application/soap+xml; charset=utf-8; action=\"" << JsonEscape(soap_action) << "\"\r\n"
         << "SOAPAction: \"" << JsonEscape(soap_action) << "\"\r\n";
    for (const auto& header : request.headers) {
        if (!IsSafeHttpHeaderName(header.first) || !IsSafeHttpHeaderValue(header.second)) {
            continue;
        }
        http << header.first << ": " << header.second << "\r\n";
    }
    http << "Connection: close\r\n"
         << "Content-Length: " << request.body.size() << "\r\n"
         << "\r\n"
         << request.body;
    return http.str();
}

std::string ReceiveAllPlain(int fd) {
    std::string response_text;
    std::array<char, 4096> buffer {};
    while (true) {
        const ssize_t received = recv(fd, buffer.data(), buffer.size(), 0);
        if (received > 0) {
            response_text.append(buffer.data(), static_cast<std::size_t>(received));
            if (response_text.size() > 2 * 1024 * 1024) {
                return std::string();
            }
            continue;
        }
        if (received == 0) {
            break;
        }
        return std::string();
    }
    return response_text;
}

#if MEDIA_SERVER_USE_OPENSSL
struct SslContextDeleter {
    void operator()(SSL_CTX* ctx) const {
        SSL_CTX_free(ctx);
    }
};

struct SslDeleter {
    void operator()(SSL* ssl) const {
        SSL_free(ssl);
    }
};

bool SendAllTls(SSL* ssl, const std::string& payload) {
    std::size_t offset = 0;
    while (offset < payload.size()) {
        const int written = SSL_write(ssl,
                                      payload.data() + offset,
                                      static_cast<int>(std::min<std::size_t>(payload.size() - offset, 16384)));
        if (written <= 0) {
            return false;
        }
        offset += static_cast<std::size_t>(written);
    }
    return true;
}

std::optional<std::string> ReceiveAllTls(SSL* ssl) {
    std::string response_text;
    std::array<char, 4096> buffer {};
    while (true) {
        const int received = SSL_read(ssl, buffer.data(), static_cast<int>(buffer.size()));
        if (received > 0) {
            response_text.append(buffer.data(), static_cast<std::size_t>(received));
            if (response_text.size() > 2 * 1024 * 1024) {
                return std::nullopt;
            }
            continue;
        }
        const int ssl_error = SSL_get_error(ssl, received);
        if (ssl_error == SSL_ERROR_ZERO_RETURN) {
            break;
        }
        if (ssl_error == SSL_ERROR_SYSCALL && received == 0) {
            break;
        }
        return std::nullopt;
    }
    return response_text;
}

OnvifSoapResponse SendOnvifSoapHttps(const ParsedHttpUrl& url, const OnvifSoapRequest& request) {
    std::string connect_error;
    const int fd = ConnectTcpWithTimeout(url, request.timeout_ms, &connect_error);
    if (fd < 0) {
        return SoapHttpError(connect_error.empty() ? "connect failed" : connect_error);
    }

    struct timeval timeout {};
    timeout.tv_sec = request.timeout_ms / 1000;
    timeout.tv_usec = (request.timeout_ms % 1000) * 1000;
    (void)setsockopt(fd, SOL_SOCKET, SO_RCVTIMEO, &timeout, sizeof(timeout));
    (void)setsockopt(fd, SOL_SOCKET, SO_SNDTIMEO, &timeout, sizeof(timeout));

    std::unique_ptr<SSL_CTX, SslContextDeleter> ctx(SSL_CTX_new(TLS_client_method()));
    if (!ctx) {
        close(fd);
        return SoapHttpError("TLS context creation failed");
    }
    SSL_CTX_set_verify(ctx.get(), SSL_VERIFY_PEER, nullptr);
    const char* ca_file = std::getenv("MEDIA_SERVER_ONVIF_TLS_CA_FILE");
    const bool ca_loaded = ca_file != nullptr && ca_file[0] != '\0'
        ? SSL_CTX_load_verify_locations(ctx.get(), ca_file, nullptr) == 1
        : SSL_CTX_set_default_verify_paths(ctx.get()) == 1;
    if (!ca_loaded) {
        close(fd);
        return SoapHttpError("TLS trust store load failed");
    }

    std::unique_ptr<SSL, SslDeleter> ssl(SSL_new(ctx.get()));
    if (!ssl) {
        close(fd);
        return SoapHttpError("TLS session creation failed");
    }
    if (SSL_set_fd(ssl.get(), fd) != 1) {
        close(fd);
        return SoapHttpError("TLS session setup failed");
    }
    (void)SSL_set_tlsext_host_name(ssl.get(), url.host.c_str());
    if (SSL_set1_host(ssl.get(), url.host.c_str()) != 1) {
        close(fd);
        return SoapHttpError("TLS hostname verification setup failed");
    }

    if (SSL_connect(ssl.get()) != 1) {
        const long verify_result = SSL_get_verify_result(ssl.get());
        close(fd);
        if (verify_result != X509_V_OK) {
            return SoapHttpError("TLS certificate verification failed");
        }
        return SoapHttpError("TLS handshake failed");
    }
    if (SSL_get_verify_result(ssl.get()) != X509_V_OK) {
        close(fd);
        return SoapHttpError("TLS certificate verification failed");
    }

    const std::string http = BuildSoapHttpRequest(url, request);
    if (!SendAllTls(ssl.get(), http)) {
        close(fd);
        return SoapHttpError("send failed");
    }

    const auto response_text = ReceiveAllTls(ssl.get());
    (void)SSL_shutdown(ssl.get());
    close(fd);
    if (!response_text.has_value()) {
        return SoapHttpError("receive failed");
    }
    const auto parsed = ParseHttpResponseText(*response_text);
    if (!parsed.has_value()) {
        return SoapHttpError("malformed HTTP response");
    }
    return *parsed;
}
#endif

std::optional<OnvifSoapResponse> ParseHttpResponseText(const std::string& response_text) {
    const std::size_t header_end = response_text.find("\r\n\r\n");
    if (header_end == std::string::npos) {
        return std::nullopt;
    }
    const std::string header = response_text.substr(0, header_end);
    const std::string body = response_text.substr(header_end + 4);
    std::istringstream lines(header);
    std::string status_line;
    std::getline(lines, status_line);
    if (!status_line.empty() && status_line.back() == '\r') {
        status_line.pop_back();
    }
    std::istringstream status_stream(status_line);
    std::string http_version;
    int status = 0;
    status_stream >> http_version >> status;
    if (http_version.rfind("HTTP/", 0) != 0 || status <= 0) {
        return std::nullopt;
    }

    OnvifSoapResponse response;
    response.ok = status >= 200 && status < 300;
    response.status = status;
    response.body = body;
    if (!response.ok) {
        response.error = "HTTP " + std::to_string(status);
    }
    return response;
}

}  // namespace

std::vector<OnvifServiceSummary> ParseOnvifServicesSoap(const std::string& soap) {
    std::vector<OnvifServiceSummary> services;
    for (const auto& block : XmlElementBlocks(soap, "Service")) {
        const std::string namespace_uri = XmlElementText(block, "Namespace").value_or("");
        const std::string name = OnvifServiceNameFromNamespace(namespace_uri);
        if (name.empty()) {
            continue;
        }
        const auto existing = std::find_if(services.begin(), services.end(), [&](const auto& service) {
            return service.name == name;
        });
        if (existing != services.end()) {
            existing->available = true;
            existing->namespace_uri = namespace_uri;
            continue;
        }
        OnvifServiceSummary service;
        service.name = name;
        service.namespace_uri = namespace_uri;
        service.available = true;
        services.push_back(std::move(service));
    }
    return services;
}

std::vector<OnvifMediaProfileSummary> ParseOnvifMediaProfilesSoap(const std::string& soap,
                                                                  const std::string& media_api) {
    std::vector<OnvifMediaProfileSummary> profiles;
    for (const auto& block : XmlElementBlocks(soap, "Profiles")) {
        const auto opening = XmlOpeningTag(block, 0);
        if (!opening.has_value()) {
            continue;
        }
        OnvifMediaProfileSummary profile;
        profile.token = XmlAttributeValue(*opening, "token").value_or("");
        profile.name = XmlElementText(block, "Name").value_or(profile.token);
        profile.media_api = media_api;
        profile.encoding = NormalizeOnvifEncoding(XmlElementText(block, "Encoding").value_or(""));
        profile.width = ParseXmlInt(XmlElementText(block, "Width"));
        profile.height = ParseXmlInt(XmlElementText(block, "Height"));
        profile.fps = ParseXmlInt(XmlElementText(block, "FrameRateLimit"));
        if (profile.token.empty() || profile.encoding.empty()) {
            continue;
        }
        profiles.push_back(std::move(profile));
    }
    return profiles;
}

bool AttachOnvifStreamUriSoap(const std::string& soap, OnvifMediaProfileSummary* profile) {
    if (profile == nullptr) {
        return false;
    }
    const std::string uri = XmlElementText(soap, "Uri").value_or("");
    if (uri.empty()) {
        return false;
    }
    profile->stream_uri = uri;
    profile->transport = IsRtspOrRtspsUri(uri) ? "RTSP" : "";
    return !profile->transport.empty();
}

OnvifProbeResult RunOnvifProbeAdapter(const OnvifProbeRequest& request,
                                      const OnvifSoapTransport& transport) {
    return RunOnvifProbeAdapter(request, transport, NoneOnvifCredentialProvider());
}

OnvifProbeResult RunOnvifProbeAdapter(const OnvifProbeRequest& request,
                                      const OnvifSoapTransport& transport,
                                      const CredentialSecretProvider& credential_provider) {
    if (!HasHttpOrHttpsUrl(request.endpoint)) {
        return ProbeError(request, "request", "endpoint must be http(s)");
    }
    if (request.timeout_ms <= 0) {
        return ProbeError(request, "request", "timeout must be positive");
    }
    if (!transport) {
        return ProbeError(request, "request", "transport is required");
    }

    OnvifProbeResult result;
    result.credential_ref_present = request.credential_ref_present;
    result.plaintext_secret_included = false;

    CredentialLookupRequest credential_request;
    credential_request.credential_ref_present = request.credential_ref_present;
    credential_request.credential_ref = request.credential_ref;
    const CredentialLookupResult credential_lookup = credential_provider.Lookup(credential_request);

    OnvifSoapRequest services_request;
    services_request.action = "GetServices";
    services_request.endpoint = request.endpoint;
    services_request.body = OnvifGetServicesEnvelope();
    services_request.timeout_ms = request.timeout_ms;
    ApplyCredentialMaterial(credential_lookup, &services_request);
    const auto services_response = transport(services_request);
    if (!services_response.ok) {
        return TransportError(request, "GetServices", services_response);
    }
    result.services = ParseOnvifServicesSoap(services_response.body);
    if (!HasAvailableService(result.services, "Media") && !HasAvailableService(result.services, "Media2")) {
        return ProbeError(request, "GetServices", "Media or Media2 service is required");
    }

    const std::vector<std::string> media_apis = {"Media2", "Media"};
    for (const auto& media_api : media_apis) {
        if (!HasAvailableService(result.services, media_api)) {
            continue;
        }
        OnvifSoapRequest profiles_request;
        profiles_request.action = media_api + ".GetProfiles";
        profiles_request.endpoint = request.endpoint;
        profiles_request.body = OnvifGetProfilesEnvelope(media_api);
        profiles_request.timeout_ms = request.timeout_ms;
        ApplyCredentialMaterial(credential_lookup, &profiles_request);
        const auto profiles_response = transport(profiles_request);
        if (!profiles_response.ok) {
            continue;
        }
        auto profiles = ParseOnvifMediaProfilesSoap(profiles_response.body, media_api);
        for (auto& profile : profiles) {
            OnvifSoapRequest stream_request;
            stream_request.action = media_api + ".GetStreamUri";
            stream_request.endpoint = request.endpoint;
            stream_request.body = OnvifGetStreamUriEnvelope(profile);
            stream_request.timeout_ms = request.timeout_ms;
            ApplyCredentialMaterial(credential_lookup, &stream_request);
            const auto stream_response = transport(stream_request);
            if (stream_response.ok && AttachOnvifStreamUriSoap(stream_response.body, &profile)) {
                result.media_profiles.push_back(std::move(profile));
            }
        }
    }

    if (result.media_profiles.empty()) {
        return ProbeError(request, "GetStreamUri", "no live RTSP profile discovered");
    }
    result.media_profiles.front().selected = true;
    result.ok = true;
    return result;
}

OnvifSoapResponse SendOnvifSoapHttp(const OnvifSoapRequest& request) {
    const auto url = ParseHttpUrl(request.endpoint);
    if (!url.has_value()) {
        return SoapHttpError("invalid endpoint URL");
    }
    if (!IsHttpSoapTransportScheme(url->scheme)) {
        return SoapHttpError("only http/https transport is supported");
    }
    if (request.timeout_ms <= 0) {
        return SoapHttpError("timeout must be positive");
    }
    if (url->scheme == "https") {
#if MEDIA_SERVER_USE_OPENSSL
        return SendOnvifSoapHttps(*url, request);
#else
        return SoapHttpError("https transport requires OpenSSL support");
#endif
    }

    std::string connect_error;
    const int fd = ConnectTcpWithTimeout(*url, request.timeout_ms, &connect_error);
    if (fd < 0) {
        return SoapHttpError(connect_error.empty() ? "connect failed" : connect_error);
    }

    struct timeval timeout {};
    timeout.tv_sec = request.timeout_ms / 1000;
    timeout.tv_usec = (request.timeout_ms % 1000) * 1000;
    (void)setsockopt(fd, SOL_SOCKET, SO_RCVTIMEO, &timeout, sizeof(timeout));
    (void)setsockopt(fd, SOL_SOCKET, SO_SNDTIMEO, &timeout, sizeof(timeout));

    const std::string http = BuildSoapHttpRequest(*url, request);

    if (!SendAll(fd, http)) {
        close(fd);
        return SoapHttpError("send failed");
    }

    const std::string response_text = ReceiveAllPlain(fd);
    if (response_text.empty()) {
        close(fd);
        return SoapHttpError("receive failed");
    }
    close(fd);

    const auto parsed = ParseHttpResponseText(response_text);
    if (!parsed.has_value()) {
        return SoapHttpError("malformed HTTP response");
    }
    return *parsed;
}

RegistryResult BuildOnvifLiveImportDraft(const std::string& body) {
    if (!LooksLikeJsonObject(body)) {
        return RegistryResult{400, "Bad Request", "{\"error\":\"request body must be a JSON object\"}"};
    }

    auto decision = ExtractObjectField(body, "importDecision");
    std::string profile_array_field = "profiles";
    if (!decision.has_value()) {
        decision = ExtractObjectField(body, "draftDecision");
        profile_array_field = "mediaProfiles";
    }
    if (!decision.has_value()) {
        return RegistryResult{
            400,
            "Bad Request",
            "{\"error\":\"importDecision or draftDecision object is required\"}"};
    }
    const std::string selected_token = Trim(ParseStringField(*decision, "selectedProfileToken").value_or(""));
    if (selected_token.empty()) {
        return RegistryResult{400, "Bad Request", "{\"error\":\"selectedProfileToken is required\"}"};
    }

    std::optional<std::string> selected_profile;
    for (const auto& profile : ExtractJsonObjectArray(body, profile_array_field)) {
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
    if (transport != "RTSP" || !IsRtspOrRtspsUri(stream_uri)) {
        return RegistryResult{
            400,
            "Bad Request",
            "{\"error\":\"selected profile must provide an RTSP/RTSPS streamUri\"}"};
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

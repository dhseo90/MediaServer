// 파일 요약: SourceSpec을 canonical StreamKey로 정규화한다.
// 동작 요약: query 순서나 표현 차이로 같은 원본이 중복 stream이 되지 않도록 key를 만든다.
// 동작 요약: 파일/URL/WebRTC/YouTube source dedup 기준을 한 곳에 모은다.
#include "core/stream_key.h"

#include <algorithm>
#include <cctype>
#include <sstream>

namespace {

std::string Trim(const std::string& in) {
    std::size_t start = 0;
    while (start < in.size() && std::isspace(static_cast<unsigned char>(in[start])) != 0) {
        ++start;
    }

    std::size_t end = in.size();
    while (end > start && std::isspace(static_cast<unsigned char>(in[end - 1])) != 0) {
        --end;
    }

    return in.substr(start, end - start);
}

std::string ToLower(std::string value) {
    std::transform(value.begin(), value.end(), value.begin(),
                   [](unsigned char c) { return static_cast<char>(std::tolower(c)); });
    return value;
}

std::string NormalizeQuery(const std::string& raw_query) {
    if (raw_query.empty()) {
        return {};
    }

    std::vector<std::string> parts;
    std::size_t from = 0;
    while (from < raw_query.size()) {
        const std::size_t pos = raw_query.find('&', from);
        const std::string part = raw_query.substr(from, pos == std::string::npos ? std::string::npos : pos - from);
        if (!part.empty()) {
            parts.push_back(part);
        }
        if (pos == std::string::npos) {
            break;
        }
        from = pos + 1;
    }

    // query 순서가 달라도 같은 upstream URL이면 같은 stream key로 묶기 위해 정렬한다.
    std::sort(parts.begin(), parts.end());

    std::ostringstream oss;
    for (std::size_t i = 0; i < parts.size(); ++i) {
        if (i > 0) {
            oss << '&';
        }
        oss << parts[i];
    }
    return oss.str();
}

std::string NormalizeAuthority(const std::string& authority) {
    const std::size_t at = authority.rfind('@');
    const std::string user_info = at == std::string::npos ? std::string() : authority.substr(0, at + 1);
    const std::string host_port = at == std::string::npos ? authority : authority.substr(at + 1);

    const std::size_t colon = host_port.rfind(':');
    if (colon == std::string::npos) {
        return user_info + ToLower(host_port);
    }

    const std::string host = host_port.substr(0, colon);
    const std::string port = host_port.substr(colon + 1);
    return user_info + ToLower(host) + ":" + port;
}

std::string NormalizeRtspLike(const std::string& raw_uri) {
    const std::string trimmed = Trim(raw_uri);
    const std::size_t scheme_pos = trimmed.find("://");
    if (scheme_pos == std::string::npos) {
        return trimmed;
    }

    const std::string scheme = ToLower(trimmed.substr(0, scheme_pos));
    const std::string rest = trimmed.substr(scheme_pos + 3);

    const std::size_t path_pos = rest.find('/');
    const std::string authority = path_pos == std::string::npos ? rest : rest.substr(0, path_pos);
    const std::string path_and_query = path_pos == std::string::npos ? std::string("/") : rest.substr(path_pos);

    const std::size_t q_pos = path_and_query.find('?');
    const std::string path = q_pos == std::string::npos ? path_and_query : path_and_query.substr(0, q_pos);
    const std::string query = q_pos == std::string::npos ? std::string() : path_and_query.substr(q_pos + 1);

    // scheme/host 대소문자와 query 순서를 정규화해 중복 source worker 생성을 줄인다.
    std::string normalized = scheme + "://" + NormalizeAuthority(authority) + path;
    const std::string normalized_query = NormalizeQuery(query);
    if (!normalized_query.empty()) {
        normalized += "?";
        normalized += normalized_query;
    }
    return normalized;
}

std::string NormalizeFilePath(const std::string& raw_path) {
    std::string path = Trim(raw_path);
    std::replace(path.begin(), path.end(), '\\', '/');

    std::string compact;
    compact.reserve(path.size());
    bool prev_slash = false;
    for (const char ch : path) {
        if (ch == '/') {
            if (!prev_slash) {
                compact.push_back(ch);
            }
            prev_slash = true;
            continue;
        }
        prev_slash = false;
        compact.push_back(ch);
    }

    while (compact.size() > 1 && compact.back() == '/') {
        compact.pop_back();
    }
    return compact;
}

}  // namespace

namespace core {

std::string CanonicalizeSourceUri(media::SourceSpec::Kind kind, const std::string& uri) {
    switch (kind) {
        case media::SourceSpec::Kind::Rtsp:
            return NormalizeRtspLike(uri);
        case media::SourceSpec::Kind::File:
            return NormalizeFilePath(uri);
        case media::SourceSpec::Kind::WebRtc:
            return Trim(uri);
        case media::SourceSpec::Kind::Hls:
        case media::SourceSpec::Kind::Http:
        case media::SourceSpec::Kind::Youtube:
            return NormalizeRtspLike(uri);
    }
    return Trim(uri);
}

StreamKey BuildStreamKey(const media::SourceSpec& spec) {
    return media::ToString(spec.kind) + "::" + CanonicalizeSourceUri(spec.kind, spec.uri);
}

}  // namespace core

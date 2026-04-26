// 파일 요약: HTTP/RTSP query에서 file/url/source 요청을 SourceSpec으로 해석한다.
// 동작 요약: 경로 이탈, 절대경로, 누락된 source 같은 잘못된 요청을 초기에 거부한다.
// 동작 요약: route별 codec 선택과 source kind를 SessionManager 입력 형태로 정규화한다.
#include "ingress/request_parser.h"

#include <filesystem>

#include "app_config.h"

namespace ingress {

namespace {

void SetError(std::string* error_message, std::string message) {
    if (error_message != nullptr) {
        *error_message = std::move(message);
    }
}

}  // namespace

bool IsSupportedPath(const std::string& path) {
    const std::string expected = "/" + app::GetAppConfig().stream_route;
    if (path == expected) {
        return true;
    }
    return path.rfind(expected + "/", 0) == 0;
}

std::optional<std::string> ResolveFileUri(const std::string& file_token) {
    if (file_token.empty()) {
        return std::nullopt;
    }

    const std::filesystem::path base = std::filesystem::path(app::GetAppConfig().file_root_path).lexically_normal();
    std::filesystem::path candidate(file_token);
    if (candidate.is_absolute()) {
        candidate = candidate.lexically_normal();
    } else {
        candidate = (base / candidate).lexically_normal();
    }

    auto base_it = base.begin();
    auto cand_it = candidate.begin();
    // file query는 설정된 file root 밖으로 나갈 수 없게 경로 prefix를 검증한다.
    for (; base_it != base.end() && cand_it != candidate.end(); ++base_it, ++cand_it) {
        if (*base_it != *cand_it) {
            return std::nullopt;
        }
    }
    if (base_it != base.end()) {
        return std::nullopt;
    }

    return candidate.string();
}

std::optional<media::SourceSpec> ParseSourceSpecFromPath(const std::string& path) {
    const std::string route_prefix = "/" + app::GetAppConfig().stream_route;
    const std::string file_prefix = route_prefix + "/file/";
    const std::string url_prefix = route_prefix + "/url/";

    if (path.rfind(file_prefix, 0) == 0) {
        const std::string file_token = path.substr(file_prefix.size());
        const auto resolved = ResolveFileUri(file_token);
        if (!resolved.has_value()) {
            return std::nullopt;
        }
        return media::SourceSpec{.kind = media::SourceSpec::Kind::File, .uri = *resolved};
    }

    if (path.rfind(url_prefix, 0) == 0) {
        std::string source_url = path.substr(url_prefix.size());
        if (source_url.empty()) {
            return std::nullopt;
        }
        return media::SourceSpec{.kind = media::SourceSpec::Kind::Rtsp, .uri = source_url};
    }

    return std::nullopt;
}

std::optional<media::SourceSpec> ParseSourceSpec(const media::IngressRequest& request, std::string* error_message) {
    if (!IsSupportedPath(request.path)) {
        SetError(error_message, "unsupported request path");
        return std::nullopt;
    }

    const auto from_path = ParseSourceSpecFromPath(request.path);
    if (from_path.has_value()) {
        return from_path;
    }

    const bool has_url = request.query.find("url") != request.query.end();
    const bool has_file = request.query.find("file") != request.query.end();
    // source는 file 또는 url 중 하나만 가져야 dedup key와 worker 선택이 명확하다.
    if (has_url == has_file) {
        SetError(error_message, "request must contain exactly one of file or url");
        return std::nullopt;
    }

    if (has_file) {
        const auto it = request.query.find("file");
        const auto resolved = ResolveFileUri(it->second);
        if (!resolved.has_value()) {
            SetError(error_message, "file path is outside configured file root");
            return std::nullopt;
        }
        return media::SourceSpec{.kind = media::SourceSpec::Kind::File, .uri = *resolved};
    }

    const auto url_it = request.query.find("url");
    if (url_it == request.query.end() || url_it->second.empty()) {
        SetError(error_message, "url query parameter is required");
        return std::nullopt;
    }
    media::SourceSpec::Kind kind = media::SourceSpec::Kind::Rtsp;

    if (const auto source_it = request.query.find("source"); source_it != request.query.end()) {
        // source 파라미터는 MediaServer -> Original Source 구간의 프로토콜을 명시한다.
        if (source_it->second == "webrtc") {
            kind = media::SourceSpec::Kind::WebRtc;
        } else if (source_it->second == "rtsp") {
            kind = media::SourceSpec::Kind::Rtsp;
        } else if (source_it->second == "hls") {
            kind = media::SourceSpec::Kind::Hls;
        } else if (source_it->second == "http") {
            kind = media::SourceSpec::Kind::Http;
        } else if (source_it->second == "youtube") {
            if (!app::GetAppConfig().enable_experimental_youtube_source) {
                SetError(error_message,
                         "source=youtube is disabled by default; set "
                         "MEDIA_SERVER_ENABLE_EXPERIMENTAL_YOUTUBE_SOURCE=1 to enable the experimental path");
                return std::nullopt;
            }
            kind = media::SourceSpec::Kind::Youtube;
        } else {
            SetError(error_message, "unsupported source kind: " + source_it->second);
            return std::nullopt;
        }
    }

    return media::SourceSpec{.kind = kind, .uri = url_it->second};
}

}  // namespace ingress

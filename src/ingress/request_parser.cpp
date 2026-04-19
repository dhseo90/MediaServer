#include "ingress/request_parser.h"

#include <filesystem>

#include "app_config.h"

namespace ingress {

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

std::optional<media::SourceSpec> ParseSourceSpec(const media::IngressRequest& request) {
    if (!IsSupportedPath(request.path)) {
        return std::nullopt;
    }

    const auto from_path = ParseSourceSpecFromPath(request.path);
    if (from_path.has_value()) {
        return from_path;
    }

    const bool has_url = request.query.find("url") != request.query.end();
    const bool has_file = request.query.find("file") != request.query.end();
    if (has_url == has_file) {
        return std::nullopt;
    }

    if (has_file) {
        const auto it = request.query.find("file");
        const auto resolved = ResolveFileUri(it->second);
        if (!resolved.has_value()) {
            return std::nullopt;
        }
        return media::SourceSpec{.kind = media::SourceSpec::Kind::File, .uri = *resolved};
    }

    const auto url_it = request.query.find("url");
    media::SourceSpec::Kind kind = media::SourceSpec::Kind::Rtsp;

    if (const auto source_it = request.query.find("source"); source_it != request.query.end()) {
        if (source_it->second == "webrtc") {
            kind = media::SourceSpec::Kind::WebRtc;
        }
    }

    return media::SourceSpec{.kind = kind, .uri = url_it->second};
}

}  // namespace ingress

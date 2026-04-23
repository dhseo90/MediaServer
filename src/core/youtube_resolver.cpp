// 파일 용도: yt-dlp를 실행해 YouTube URL을 HTTP/HLS playable URL로 해석한다.
#include "core/youtube_resolver.h"

#include <algorithm>
#include <cerrno>
#include <chrono>
#include <cctype>
#include <cstring>
#include <iostream>
#include <optional>
#include <sstream>
#include <unordered_set>
#include <vector>

#include "app_config.h"
#include "core/command_runner.h"

namespace {

struct ParsedUrl {
    std::string scheme;
    std::string host;
};

std::string Trim(const std::string& value) {
    std::size_t begin = 0;
    while (begin < value.size() && std::isspace(static_cast<unsigned char>(value[begin])) != 0) {
        ++begin;
    }

    std::size_t end = value.size();
    while (end > begin && std::isspace(static_cast<unsigned char>(value[end - 1])) != 0) {
        --end;
    }

    return value.substr(begin, end - begin);
}

std::string CollapseWhitespace(const std::string& value) {
    std::string out;
    out.reserve(value.size());
    bool previous_space = false;
    for (const char ch : value) {
        const bool is_space = std::isspace(static_cast<unsigned char>(ch)) != 0;
        if (is_space) {
            if (!previous_space) {
                out.push_back(' ');
            }
            previous_space = true;
            continue;
        }
        out.push_back(ch);
        previous_space = false;
    }
    return Trim(out);
}

std::string TruncateForMessage(const std::string& value, std::size_t max_size = 800) {
    if (value.size() <= max_size) {
        return value;
    }
    return value.substr(0, max_size) + "...";
}

std::string ToLower(std::string value) {
    std::transform(value.begin(), value.end(), value.begin(),
                   [](unsigned char ch) { return static_cast<char>(std::tolower(ch)); });
    return value;
}

std::optional<ParsedUrl> ParseUrlSchemeHost(const std::string& raw_uri) {
    const std::string uri = Trim(raw_uri);
    const std::size_t scheme_pos = uri.find("://");
    if (scheme_pos == std::string::npos) {
        return std::nullopt;
    }

    ParsedUrl parsed;
    parsed.scheme = ToLower(uri.substr(0, scheme_pos));
    const std::size_t authority_begin = scheme_pos + 3;
    std::size_t authority_end = uri.find('/', authority_begin);
    const std::size_t query_pos = uri.find('?', authority_begin);
    const std::size_t fragment_pos = uri.find('#', authority_begin);
    if (authority_end == std::string::npos ||
        (query_pos != std::string::npos && query_pos < authority_end)) {
        authority_end = query_pos;
    }
    if (authority_end == std::string::npos ||
        (fragment_pos != std::string::npos && fragment_pos < authority_end)) {
        authority_end = fragment_pos;
    }
    if (authority_end == std::string::npos) {
        authority_end = uri.size();
    }

    std::string authority = uri.substr(authority_begin, authority_end - authority_begin);
    const std::size_t at_pos = authority.rfind('@');
    if (at_pos != std::string::npos) {
        authority = authority.substr(at_pos + 1);
    }
    if (!authority.empty() && authority.front() == '[') {
        const std::size_t close = authority.find(']');
        if (close != std::string::npos) {
            parsed.host = ToLower(authority.substr(1, close - 1));
            return parsed;
        }
    }

    const std::size_t colon_pos = authority.rfind(':');
    parsed.host = ToLower(colon_pos == std::string::npos ? authority : authority.substr(0, colon_pos));
    return parsed;
}

bool IsAllowedYouTubeHost(const std::string& host) {
    if (host == "youtube.com" || host == "youtu.be" || host == "youtube-nocookie.com") {
        return true;
    }
    constexpr const char* kYoutubeSuffix = ".youtube.com";
    constexpr std::size_t kYoutubeSuffixSize = 12;
    return host.size() > kYoutubeSuffixSize &&
           host.compare(host.size() - kYoutubeSuffixSize, kYoutubeSuffixSize, kYoutubeSuffix) == 0;
}

bool StartsWithHttpScheme(const std::string& uri) {
    const std::string lower = ToLower(uri);
    return lower.rfind("http://", 0) == 0 || lower.rfind("https://", 0) == 0;
}

bool LooksLikeHlsUri(const std::string& uri) {
    const std::string lower = ToLower(uri);
    return lower.find(".m3u8") != std::string::npos ||
           lower.find("m3u8") != std::string::npos ||
           lower.find("hls_playlist") != std::string::npos ||
           lower.find("manifest/hls") != std::string::npos;
}

std::vector<std::string> SplitNonEmptyLines(const std::string& text) {
    std::vector<std::string> lines;
    std::istringstream input(text);
    std::string line;
    while (std::getline(input, line)) {
        line = Trim(line);
        if (!line.empty()) {
            lines.push_back(std::move(line));
        }
    }
    return lines;
}

std::string SummarizeStderr(const std::string& stderr_text) {
    std::vector<std::string> unique_lines;
    std::unordered_set<std::string> seen;
    std::istringstream input(stderr_text);
    std::string line;
    while (std::getline(input, line)) {
        line = CollapseWhitespace(line);
        if (line.empty()) {
            continue;
        }
        if (seen.insert(line).second) {
            unique_lines.push_back(std::move(line));
        }
    }

    std::ostringstream oss;
    for (std::size_t i = 0; i < unique_lines.size(); ++i) {
        if (i > 0) {
            oss << " | ";
        }
        oss << unique_lines[i];
    }
    return TruncateForMessage(oss.str());
}

std::string ClassifyYtDlpFailure(const std::string& stderr_text) {
    const std::string lower = ToLower(stderr_text);
    if (lower.find("private video") != std::string::npos) {
        return "private video";
    }
    if (lower.find("not available in your country") != std::string::npos ||
        lower.find("geo") != std::string::npos ||
        (lower.find("country") != std::string::npos && lower.find("not available") != std::string::npos)) {
        return "region restricted";
    }
    if (lower.find("sign in") != std::string::npos ||
        lower.find("login") != std::string::npos ||
        lower.find("cookies") != std::string::npos ||
        lower.find("confirm your age") != std::string::npos ||
        lower.find("age-restricted") != std::string::npos) {
        return "authentication required";
    }
    if (lower.find("live stream recording is not available") != std::string::npos) {
        return "live archive unavailable";
    }
    if (lower.find("video unavailable") != std::string::npos ||
        lower.find("this video is unavailable") != std::string::npos ||
        lower.find("not available") != std::string::npos) {
        return "video unavailable";
    }
    if (lower.find("requested format is not available") != std::string::npos ||
        lower.find("no video formats") != std::string::npos ||
        lower.find("no formats") != std::string::npos) {
        return "format unavailable";
    }
    if (lower.find("timed out") != std::string::npos ||
        lower.find("timeout") != std::string::npos) {
        return "network timeout";
    }
    return {};
}

std::string BuildYtDlpFailureMessage(const core::CommandResult& result, const std::string& bin, int timeout_ms) {
    if (!result.error_message.empty()) {
        return result.error_message;
    }
    if (result.timed_out) {
        return "YouTube resolver timed out after " + std::to_string(timeout_ms) +
               "ms; increase MEDIA_SERVER_YOUTUBE_RESOLVE_TIMEOUT_MS if needed";
    }
    const std::string stderr_summary = SummarizeStderr(result.stderr_text);
    const std::string failure_kind = ClassifyYtDlpFailure(stderr_summary);
    std::ostringstream oss;
    oss << "YouTube resolver failed";
    if (!failure_kind.empty()) {
        oss << " (" << failure_kind << ")";
    }
    if (result.exit_code >= 0) {
        oss << " with exit code " << result.exit_code;
    }
    if (result.exit_code == 127) {
        oss << "; resolver binary '" << bin << "' was not found; install yt-dlp or set MEDIA_SERVER_YOUTUBE_RESOLVER_BIN";
    }
    if (!stderr_summary.empty()) {
        oss << ": " << stderr_summary;
    } else if (result.exit_code != 127) {
        oss << " while running " << bin;
    }
    return oss.str();
}

std::optional<media::SourceSpec> PickPlayableSource(const std::vector<std::string>& resolved_lines) {
    std::vector<std::string> http_lines;
    for (const std::string& line : resolved_lines) {
        if (StartsWithHttpScheme(line) && LooksLikeHlsUri(line)) {
            return media::SourceSpec{.kind = media::SourceSpec::Kind::Hls, .uri = line};
        }
        if (StartsWithHttpScheme(line)) {
            http_lines.push_back(line);
        }
    }

    if (http_lines.size() == 1) {
        return media::SourceSpec{.kind = media::SourceSpec::Kind::Http, .uri = http_lines.front()};
    }
    return std::nullopt;
}

}  // namespace

namespace core {

bool ValidateYouTubeWatchUrl(const std::string& raw_uri, std::string* error_message) {
    const auto parsed = ParseUrlSchemeHost(raw_uri);
    if (!parsed.has_value() || (parsed->scheme != "http" && parsed->scheme != "https")) {
        if (error_message != nullptr) {
            *error_message = "invalid YouTube URL: expected http(s) URL";
        }
        return false;
    }
    if (!IsAllowedYouTubeHost(parsed->host)) {
        if (error_message != nullptr) {
            *error_message = "invalid YouTube URL host: " + parsed->host;
        }
        return false;
    }
    return true;
}

bool ResolveYouTubeSource(const media::SourceSpec& youtube_spec,
                          media::SourceSpec* resolved_source,
                          std::string* error_message) {
    if (youtube_spec.kind != media::SourceSpec::Kind::Youtube) {
        if (error_message != nullptr) {
            *error_message = "ResolveYouTubeSource expected source kind youtube";
        }
        return false;
    }
    if (youtube_spec.uri.empty()) {
        if (error_message != nullptr) {
            *error_message = "empty YouTube URL";
        }
        return false;
    }
    if (!ValidateYouTubeWatchUrl(youtube_spec.uri, error_message)) {
        return false;
    }

    const auto& config = app::GetAppConfig();
    const std::vector<std::string> args{
        config.youtube_resolver_bin,
        "--no-warnings",
        "--no-progress",
        "--no-playlist",
        "--skip-download",
        "-g",
        "-f",
        config.youtube_format,
        youtube_spec.uri,
    };

    const auto resolve_started_at = std::chrono::steady_clock::now();
    const CommandResult result = RunCommandCapture(args, config.youtube_resolve_timeout_ms);
    const auto resolve_elapsed_ms = std::chrono::duration_cast<std::chrono::milliseconds>(
                                        std::chrono::steady_clock::now() - resolve_started_at)
                                        .count();
    if (!result.error_message.empty() || result.timed_out || result.exit_code != 0) {
        if (error_message != nullptr) {
            *error_message =
                BuildYtDlpFailureMessage(result, config.youtube_resolver_bin, config.youtube_resolve_timeout_ms);
        }
        std::cerr << "[youtube-source] resolve failed elapsed_ms=" << resolve_elapsed_ms
                  << " input=" << youtube_spec.uri << "\n";
        return false;
    }

    const std::vector<std::string> resolved_lines = SplitNonEmptyLines(result.stdout_text);
    const auto picked = PickPlayableSource(resolved_lines);
    if (!picked.has_value()) {
        if (error_message != nullptr) {
            *error_message = "YouTube resolver produced no single playable HTTP/HLS media URL";
            if (resolved_lines.size() > 1) {
                *error_message +=
                    "; resolver output appears to contain separate media URLs; adjust MEDIA_SERVER_YOUTUBE_FORMAT to prefer HLS or a muxed format";
            }
        }
        return false;
    }

    if (resolved_source != nullptr) {
        *resolved_source = *picked;
    }
    std::cerr << "[youtube-source] resolved source kind=" << media::ToString(picked->kind)
              << " elapsed_ms=" << resolve_elapsed_ms
              << " input=" << youtube_spec.uri << "\n";
    return true;
}

}  // namespace core

// 파일 용도: yt-dlp를 실행해 YouTube URL을 HTTP/HLS playable URL로 해석한다.
#include "core/youtube_resolver.h"

#include <algorithm>
#include <array>
#include <cerrno>
#include <chrono>
#include <cctype>
#include <csignal>
#include <cstring>
#include <fcntl.h>
#include <iostream>
#include <optional>
#include <poll.h>
#include <sstream>
#include <sys/wait.h>
#include <unistd.h>
#include <unordered_set>
#include <vector>

#include "app_config.h"

namespace {

struct CommandResult {
    int exit_code{-1};
    bool timed_out{false};
    std::string stdout_text;
    std::string stderr_text;
    std::string error_message;
};

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

void AppendPipeOutput(int fd, std::string* output, bool* open) {
    std::array<char, 4096> buffer{};
    while (true) {
        const ssize_t read_size = ::read(fd, buffer.data(), buffer.size());
        if (read_size > 0) {
            output->append(buffer.data(), static_cast<std::size_t>(read_size));
            continue;
        }
        if (read_size == 0) {
            *open = false;
            return;
        }
        if (errno == EAGAIN || errno == EWOULDBLOCK) {
            return;
        }
        *open = false;
        return;
    }
}

bool MakeNonBlocking(int fd, std::string* error_message) {
    const int flags = ::fcntl(fd, F_GETFL, 0);
    if (flags < 0 || ::fcntl(fd, F_SETFL, flags | O_NONBLOCK) < 0) {
        if (error_message != nullptr) {
            *error_message = std::string("failed to set pipe nonblocking: ") + std::strerror(errno);
        }
        return false;
    }
    return true;
}

CommandResult RunCommandCapture(const std::vector<std::string>& args, int timeout_ms) {
    CommandResult result;
    if (args.empty()) {
        result.error_message = "empty resolver command";
        return result;
    }

    int stdout_pipe[2]{-1, -1};
    int stderr_pipe[2]{-1, -1};
    if (::pipe(stdout_pipe) != 0 || ::pipe(stderr_pipe) != 0) {
        result.error_message = std::string("failed to create resolver pipe: ") + std::strerror(errno);
        if (stdout_pipe[0] >= 0) {
            ::close(stdout_pipe[0]);
        }
        if (stdout_pipe[1] >= 0) {
            ::close(stdout_pipe[1]);
        }
        if (stderr_pipe[0] >= 0) {
            ::close(stderr_pipe[0]);
        }
        if (stderr_pipe[1] >= 0) {
            ::close(stderr_pipe[1]);
        }
        return result;
    }

    const pid_t pid = ::fork();
    if (pid < 0) {
        result.error_message = std::string("failed to fork resolver: ") + std::strerror(errno);
        ::close(stdout_pipe[0]);
        ::close(stdout_pipe[1]);
        ::close(stderr_pipe[0]);
        ::close(stderr_pipe[1]);
        return result;
    }

    if (pid == 0) {
        ::dup2(stdout_pipe[1], STDOUT_FILENO);
        ::dup2(stderr_pipe[1], STDERR_FILENO);
        ::close(stdout_pipe[0]);
        ::close(stdout_pipe[1]);
        ::close(stderr_pipe[0]);
        ::close(stderr_pipe[1]);

        std::vector<char*> argv;
        argv.reserve(args.size() + 1);
        for (const std::string& arg : args) {
            argv.push_back(const_cast<char*>(arg.c_str()));
        }
        argv.push_back(nullptr);
        ::execvp(argv[0], argv.data());
        ::_exit(127);
    }

    ::close(stdout_pipe[1]);
    ::close(stderr_pipe[1]);
    if (!MakeNonBlocking(stdout_pipe[0], &result.error_message) ||
        !MakeNonBlocking(stderr_pipe[0], &result.error_message)) {
        ::kill(pid, SIGKILL);
        ::close(stdout_pipe[0]);
        ::close(stderr_pipe[0]);
        ::waitpid(pid, nullptr, 0);
        return result;
    }

    bool stdout_open = true;
    bool stderr_open = true;
    bool child_exited = false;
    int status = 0;
    const auto started_at = std::chrono::steady_clock::now();
    const auto deadline = started_at + std::chrono::milliseconds(timeout_ms);

    while (stdout_open || stderr_open || !child_exited) {
        if (!child_exited) {
            const pid_t waited = ::waitpid(pid, &status, WNOHANG);
            if (waited == pid) {
                child_exited = true;
            }
        }

        if (!child_exited && std::chrono::steady_clock::now() >= deadline) {
            result.timed_out = true;
            ::kill(pid, SIGKILL);
            ::waitpid(pid, &status, 0);
            child_exited = true;
        }

        std::array<pollfd, 2> fds{};
        nfds_t nfds = 0;
        if (stdout_open) {
            fds[nfds++] = pollfd{stdout_pipe[0], POLLIN | POLLHUP | POLLERR, 0};
        }
        if (stderr_open) {
            fds[nfds++] = pollfd{stderr_pipe[0], POLLIN | POLLHUP | POLLERR, 0};
        }

        if (nfds > 0) {
            const int wait_ms = child_exited ? 0 : 100;
            const int polled = ::poll(fds.data(), nfds, wait_ms);
            if (polled > 0) {
                nfds_t index = 0;
                if (stdout_open) {
                    if ((fds[index].revents & (POLLIN | POLLHUP | POLLERR)) != 0) {
                        AppendPipeOutput(stdout_pipe[0], &result.stdout_text, &stdout_open);
                    }
                    ++index;
                }
                if (stderr_open) {
                    if ((fds[index].revents & (POLLIN | POLLHUP | POLLERR)) != 0) {
                        AppendPipeOutput(stderr_pipe[0], &result.stderr_text, &stderr_open);
                    }
                }
            } else if (polled < 0 && errno != EINTR) {
                result.error_message = std::string("resolver poll failed: ") + std::strerror(errno);
                break;
            }
        }

        if (child_exited && !stdout_open && !stderr_open) {
            break;
        }
    }

    if (!child_exited) {
        ::kill(pid, SIGKILL);
        ::waitpid(pid, &status, 0);
    }
    if (stdout_open) {
        AppendPipeOutput(stdout_pipe[0], &result.stdout_text, &stdout_open);
    }
    if (stderr_open) {
        AppendPipeOutput(stderr_pipe[0], &result.stderr_text, &stderr_open);
    }
    ::close(stdout_pipe[0]);
    ::close(stderr_pipe[0]);

    if (WIFEXITED(status)) {
        result.exit_code = WEXITSTATUS(status);
    } else if (WIFSIGNALED(status)) {
        result.exit_code = 128 + WTERMSIG(status);
    }
    return result;
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

std::string BuildYtDlpFailureMessage(const CommandResult& result, const std::string& bin, int timeout_ms) {
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

    const CommandResult result = RunCommandCapture(args, config.youtube_resolve_timeout_ms);
    if (!result.error_message.empty() || result.timed_out || result.exit_code != 0) {
        if (error_message != nullptr) {
            *error_message =
                BuildYtDlpFailureMessage(result, config.youtube_resolver_bin, config.youtube_resolve_timeout_ms);
        }
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
              << " input=" << youtube_spec.uri << "\n";
    return true;
}

}  // namespace core

// 파일 요약: MediaServer 프로세스 진입점이다.
// 동작 요약: 런타임 설정을 로드하고 StreamRegistry, SessionManager, RTSP/WebRTC 서버를 초기화한다.
// 동작 요약: SIGINT/SIGTERM을 받아 실행 중인 세션과 서버 자원을 순서대로 정리한다.
#include <atomic>
#include <algorithm>
#include <chrono>
#include <csignal>
#include <filesystem>
#include <iostream>
#include <optional>
#include <sstream>
#include <string>
#include <thread>
#include <termios.h>
#include <unistd.h>
#include <vector>

#include "analysis/event_storage.h"
#include "app_config.h"
#include "core/resource_guard.h"
#include "core/session_manager.h"
#include "core/stream_registry.h"
#include "ingress/gstreamer_rtsp_server.h"
#include "ingress/http_auth.h"
#include "ingress/webrtc_http_server.h"

namespace {
std::atomic<bool> g_running{true};

void HandleSignal(int /*signal*/) {
    g_running.store(false);
}

void PrintAuthUserUsage() {
    std::cerr << R"(Usage:
  ./server.sh auth-user list
  ./server.sh auth-user add --username USER --role viewer [--display-name NAME] [--view-id VIEW] [--scope SCOPE]
  ./server.sh auth-user disable --username USER
  ./server.sh auth-user enable --username USER
  ./server.sh auth-user reset-password --username USER

Password input:
  기본은 echo 없는 prompt 입력입니다. 자동 smoke에서는 --password-stdin으로 stdin 첫 줄을 사용할 수 있습니다.
)";
}

std::optional<std::string> ArgValue(const std::vector<std::string>& args,
                                    const std::string& key) {
    for (std::size_t i = 0; i < args.size(); ++i) {
        if (args[i] == key && i + 1 < args.size()) {
            return args[i + 1];
        }
    }
    return std::nullopt;
}

bool HasArg(const std::vector<std::string>& args, const std::string& key) {
    return std::find(args.begin(), args.end(), key) != args.end();
}

std::vector<std::string> ArgValues(const std::vector<std::string>& args,
                                   const std::string& key) {
    std::vector<std::string> values;
    for (std::size_t i = 0; i < args.size(); ++i) {
        if (args[i] == key && i + 1 < args.size()) {
            values.push_back(args[i + 1]);
            ++i;
        }
    }
    return values;
}

std::string ReadSecretLine(const std::string& prompt) {
    if (isatty(STDIN_FILENO) == 0) {
        std::string value;
        std::getline(std::cin, value);
        return value;
    }

    termios old_term{};
    termios new_term{};
    if (tcgetattr(STDIN_FILENO, &old_term) != 0) {
        std::cerr << prompt;
        std::string value;
        std::getline(std::cin, value);
        return value;
    }
    new_term = old_term;
    new_term.c_lflag &= static_cast<tcflag_t>(~ECHO);
    std::cerr << prompt;
    tcsetattr(STDIN_FILENO, TCSAFLUSH, &new_term);
    std::string value;
    std::getline(std::cin, value);
    tcsetattr(STDIN_FILENO, TCSAFLUSH, &old_term);
    std::cerr << "\n";
    return value;
}

std::string ReadPasswordForCli(const std::vector<std::string>& args, bool confirm) {
    if (HasArg(args, "--password-stdin")) {
        std::string value;
        std::getline(std::cin, value);
        return value;
    }
    const std::string password = ReadSecretLine("Password to set: ");
    if (confirm) {
        const std::string again = ReadSecretLine("Confirm password: ");
        if (password != again) {
            return "";
        }
    }
    return password;
}

int PrintAuthUserResult(const ingress::auth::AuthUserResult& result) {
    std::ostream& out = result.status >= 200 && result.status < 300 ? std::cout : std::cerr;
    out << result.body << "\n";
    return result.status >= 200 && result.status < 300 ? 0 : 1;
}

int RunAuthUserCli(const std::vector<std::string>& args) {
    if (args.empty() || args[0] == "-h" || args[0] == "--help") {
        PrintAuthUserUsage();
        return args.empty() ? 1 : 0;
    }
    const auto& config = app::GetAppConfig();
    const std::string command = args[0];
    const std::vector<std::string> rest(args.begin() + 1, args.end());
    if (command == "list") {
        return PrintAuthUserResult(ingress::auth::ListAuthUsers(config));
    }

    const std::string username = ArgValue(rest, "--username").value_or("");
    if (username.empty()) {
        std::cerr << "--username is required\n";
        return 1;
    }

    if (command == "add") {
        ingress::auth::UserMutation mutation;
        mutation.username = username;
        mutation.display_name = ArgValue(rest, "--display-name").value_or(username);
        mutation.role = ArgValue(rest, "--role").value_or("viewer");
        mutation.view_id = ArgValue(rest, "--view-id").value_or("");
        mutation.scopes = ArgValues(rest, "--scope");
        mutation.enabled = !HasArg(rest, "--disabled");
        mutation.has_enabled = true;
        mutation.must_change_password = !HasArg(rest, "--no-must-change");
        mutation.has_must_change_password = true;
        mutation.password = ReadPasswordForCli(rest, true);
        if (mutation.password.empty()) {
            std::cerr << "password input failed or did not match\n";
            return 1;
        }
        mutation.has_password = true;
        return PrintAuthUserResult(ingress::auth::CreateAuthUser(config, mutation));
    }
    if (command == "reset-password") {
        const std::string password = ReadPasswordForCli(rest, true);
        if (password.empty()) {
            std::cerr << "password input failed or did not match\n";
            return 1;
        }
        return PrintAuthUserResult(
            ingress::auth::ResetAuthUserPassword(config, username, password));
    }
    if (command == "disable") {
        return PrintAuthUserResult(ingress::auth::SetAuthUserEnabled(config, username, false));
    }
    if (command == "enable") {
        return PrintAuthUserResult(ingress::auth::SetAuthUserEnabled(config, username, true));
    }
    PrintAuthUserUsage();
    return 1;
}
}  // namespace

int main(int argc, char** argv) {
    if (argc > 1 && std::string(argv[1]) == "auth-user") {
        std::vector<std::string> args;
        for (int i = 2; i < argc; ++i) {
            args.emplace_back(argv[i]);
        }
        return RunAuthUserCli(args);
    }

    const auto& config = app::GetAppConfig();
    const std::uint16_t rtsp_port = config.rtsp_listen_port;
    const std::string& rtsp_address = config.rtsp_listen_address;
    const std::uint16_t http_port = config.http_listen_port;
    const std::string& http_address = config.http_listen_address;
    std::string default_file_token = std::filesystem::path(config.default_file_path).filename().string();
    if (default_file_token.empty()) {
        default_file_token = config.default_file_path;
    }

    std::cout << "media-server skeleton (C++)\n";
    std::cout << "default route: /" << config.stream_route << "\n";

    core::StreamRegistry registry;
    core::ResourceGuard resource_guard(config.max_sessions, config.max_streams);
    core::SessionManager session_manager(registry, resource_guard);
    // RTSP와 WebRTC HTTP 서버는 같은 SessionManager를 공유해 source dedup/fan-out 구조를 함께 사용한다.
    ingress::GStreamerRtspServer gst_rtsp_server(session_manager);
    ingress::WebRtcHttpServer webrtc_http_server(session_manager);

    std::string server_error;
    const bool rtsp_server_started = gst_rtsp_server.Start(rtsp_port, &server_error);
    if (!rtsp_server_started) {
        std::cerr << "gstreamer rtsp server started: no\n";
        std::cerr << "reason: " << server_error << "\n";
        return 1;
    }

    std::string http_error;
    const bool http_server_started = webrtc_http_server.Start(http_address, http_port, &http_error);
    if (!http_server_started) {
        std::cerr << "webrtc http server started: no\n";
        std::cerr << "reason: " << http_error << "\n";
        gst_rtsp_server.Stop();
        return 1;
    }

    std::cout << "gstreamer rtsp server started: yes\n";
    std::cout << "webrtc http server started: yes\n";
    std::cout << "listen: rtsp://" << rtsp_address << ":" << rtsp_port << "/" << config.stream_route << "\n";
    std::cout << "http signaling: http://" << http_address << ":" << http_port << "/webrtc/test\n";
    std::cout << "file test url: rtsp://" << rtsp_address << ":" << rtsp_port << "/" << config.stream_route
              << "?file=" << default_file_token << "\n";
    std::cout << "running... (SIGINT/SIGTERM to stop)\n";

    std::signal(SIGINT, HandleSignal);
    std::signal(SIGTERM, HandleSignal);

    // signal handler에서는 플래그만 바꾸고 실제 Stop은 main thread에서 순서대로 수행한다.
    while (g_running.load()) {
        std::this_thread::sleep_for(std::chrono::seconds(1));
    }

    webrtc_http_server.Stop();
    gst_rtsp_server.Stop();
    analysis::StopEventStorage();
    return 0;
}

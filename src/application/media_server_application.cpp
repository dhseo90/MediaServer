// 파일 요약: MediaServer 프로세스의 composition root 구현이다.
// 동작 요약: 설정, registry/session, RTSP/HTTP 서버를 조립하고 기존 시작·정리 순서를 보존한다.

#include "application/media_server_application.h"

#include <algorithm>
#include <atomic>
#include <chrono>
#include <csignal>
#include <filesystem>
#include <iostream>
#include <optional>
#include <sstream>
#include <string>
#include <termios.h>
#include <thread>
#include <unistd.h>
#include <vector>

#include "analysis/analysis_session_service.h"
#include "ingress/analysis_session_lifecycle_application_adapter.h"
#include "ingress/analysis_session_read_application_adapter.h"
#include "analysis/event_storage.h"
#include "app_config.h"
#include "core/resource_guard.h"
#include "core/runtime_debug_counters.h"
#include "core/session_manager.h"
#include "core/stream_key.h"
#include "core/stream_registry.h"
#include "ingress/gstreamer_rtsp_server.h"
#include "ingress/http_auth.h"
#include "ingress/webrtc_http_server.h"

namespace media_server::application {
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

ingress::WebRtcHttpRuntimeConfig BuildWebRtcHttpRuntimeConfig(const app::AppConfig& source);

int RunAuthUserCli(const std::vector<std::string>& args) {
    if (args.empty() || args[0] == "-h" || args[0] == "--help") {
        PrintAuthUserUsage();
        return args.empty() ? 1 : 0;
    }
    const auto config = BuildWebRtcHttpRuntimeConfig(app::GetAppConfig());
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

ingress::HttpAuthMode MapHttpAuthMode(app::AuthMode mode) {
    switch (mode) {
        case app::AuthMode::Auto:
            return ingress::HttpAuthMode::Auto;
        case app::AuthMode::Off:
            return ingress::HttpAuthMode::Off;
        case app::AuthMode::Token:
            return ingress::HttpAuthMode::Token;
        case app::AuthMode::Session:
            return ingress::HttpAuthMode::Session;
    }
    return ingress::HttpAuthMode::Auto;
}

ingress::WebRtcHttpRuntimeConfig BuildWebRtcHttpRuntimeConfig(const app::AppConfig& source) {
    ingress::WebRtcHttpRuntimeConfig config;
    config.stream_route = source.stream_route;
    config.rtsp_listen_port = source.rtsp_listen_port;
    config.file_root_path = source.file_root_path;
    config.default_file_path = source.default_file_path;
    config.source_registry_path = source.source_registry_path;
    config.auth_mode = MapHttpAuthMode(source.auth_mode);
    config.auth_admin_token = source.auth_admin_token;
    config.auth_operator_token = source.auth_operator_token;
    config.auth_viewer_token = source.auth_viewer_token;
    config.auth_integrator_token = source.auth_integrator_token;
    config.auth_users_file = source.auth_users_file;
    config.auth_session_ttl_seconds = source.auth_session_ttl_seconds;
    config.auth_session_idle_timeout_seconds = source.auth_session_idle_timeout_seconds;
    config.auth_password_policy = source.auth_password_policy;
    config.auth_password_min_length = source.auth_password_min_length;
    config.auth_password_history_count = source.auth_password_history_count;
    config.auth_password_max_age_days = source.auth_password_max_age_days;
    config.auth_login_max_failures = source.auth_login_max_failures;
    config.auth_login_lockout_seconds = source.auth_login_lockout_seconds;
    config.auth_cookie_name = source.auth_cookie_name;
    config.auth_cookie_secure = source.auth_cookie_secure;
    config.ui_default_home = source.ui_default_home;
    config.enable_lab = source.enable_lab;
    config.enable_ops = source.enable_ops;
    config.enable_client = source.enable_client;
    config.webrtc_va_metadata_channel_enabled = source.webrtc_va_metadata_channel_enabled;
    config.webrtc_va_metadata_channel_label = source.webrtc_va_metadata_channel_label;
    config.webrtc_va_metadata_interval_ms = source.webrtc_va_metadata_interval_ms;
    config.webrtc_va_metadata_max_message_bytes = source.webrtc_va_metadata_max_message_bytes;
    config.webrtc_va_metadata_max_buffered_bytes = source.webrtc_va_metadata_max_buffered_bytes;
    config.webrtc_stun_server = source.webrtc_stun_server;
    config.webrtc_turn_server = source.webrtc_turn_server;
    config.webrtc_requested_ice_transport_policy = source.webrtc_requested_ice_transport_policy;
    config.webrtc_ice_transport_policy = source.webrtc_ice_transport_policy;
    config.analysis_registry_path = source.analysis_registry_path;
    config.analysis_event_snapshot_dir = source.analysis_event_snapshot_dir;
    config.analysis_event_clip_dir = source.analysis_event_clip_dir;
    config.analysis_tracking_lost_buffer_frames = source.analysis_tracking_lost_buffer_frames;
    config.analysis_tracking_iou_weight = source.analysis_tracking_iou_weight;
    config.analysis_tracking_distance_weight = source.analysis_tracking_distance_weight;
    config.analysis_tracking_direction_weight = source.analysis_tracking_direction_weight;
    config.analysis_tracking_class_weight = source.analysis_tracking_class_weight;
    config.analysis_tracking_min_association_score = source.analysis_tracking_min_association_score;
    config.analysis_tracking_smoothing_alpha = source.analysis_tracking_smoothing_alpha;
    config.analysis_tracking_close_object_guard_mode = source.analysis_tracking_close_object_guard_mode;
    config.analysis_tracking_close_object_distance_ratio = source.analysis_tracking_close_object_distance_ratio;
    config.analysis_tracking_close_object_overlap_threshold = source.analysis_tracking_close_object_overlap_threshold;
    config.analysis_tracking_close_object_low_margin_threshold = source.analysis_tracking_close_object_low_margin_threshold;
    config.analysis_tracking_center_jump_penalty = source.analysis_tracking_center_jump_penalty;
    config.analysis_tracking_close_object_min_score_boost = source.analysis_tracking_close_object_min_score_boost;
    config.analysis_tracking_close_object_max_diagnostics = source.analysis_tracking_close_object_max_diagnostics;
    config.analysis_appearance_enabled = source.analysis_appearance_enabled;
    config.analysis_appearance_extractor = source.analysis_appearance_extractor;
    config.analysis_appearance_model_path = source.analysis_appearance_model_path;
    config.analysis_appearance_model_sha256 = source.analysis_appearance_model_sha256;
    config.analysis_appearance_model_provenance = source.analysis_appearance_model_provenance;
    config.analysis_appearance_input_width = source.analysis_appearance_input_width;
    config.analysis_appearance_input_height = source.analysis_appearance_input_height;
    config.analysis_appearance_max_embedding_dim = source.analysis_appearance_max_embedding_dim;
    config.analysis_appearance_log_enabled = source.analysis_appearance_log_enabled;
    config.analysis_appearance_async_enabled = source.analysis_appearance_async_enabled;
    config.analysis_appearance_max_queue = source.analysis_appearance_max_queue;
    config.analysis_appearance_global_max_queue = source.analysis_appearance_global_max_queue;
    config.analysis_appearance_per_stream_rate_limit_ms = source.analysis_appearance_per_stream_rate_limit_ms;
    config.analysis_appearance_max_job_age_ms = source.analysis_appearance_max_job_age_ms;
    config.youtube_source_build_enabled = app::kYouTubeSourceBuildEnabled;
    config.runtime_debug_snapshot_json = [] { return core::runtime_debug::SnapshotJson(); };
    config.build_stream_key = [](int kind, const std::string& locator) {
        if (kind < static_cast<int>(media::SourceSpec::Kind::Rtsp) ||
            kind > static_cast<int>(media::SourceSpec::Kind::Youtube)) {
            return std::string();
        }
        return core::BuildStreamKey(
            media::SourceSpec{static_cast<media::SourceSpec::Kind>(kind), locator});
    };
    return config;
}

}  // namespace

int RunMediaServerApplication(int argc, char** argv) {
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
    analysis::AnalysisSessionService analysis_sessions(session_manager);
    auto analysis_session_lifecycle =
        ingress::MakeAnalysisSessionLifecycleApplicationAdapter(analysis_sessions);
    auto analysis_session_reads =
        ingress::MakeAnalysisSessionReadApplicationAdapter(analysis_sessions);
    session_manager.SetAuxiliaryStreamRuntimeProvider(
        [&analysis_sessions] { return analysis_sessions.AuxiliaryStreamRuntimeSnapshot(); });
    // 두 transport와 runtime accounting은 같은 analysis service를 공유해 tap 수명과 source fan-out을 일치시킨다.
    ingress::GStreamerRtspServer gst_rtsp_server(session_manager, analysis_sessions);
    const auto webrtc_http_runtime_config = BuildWebRtcHttpRuntimeConfig(config);
    ingress::WebRtcHttpServer webrtc_http_server(
        session_manager,
        *analysis_session_lifecycle,
        *analysis_session_reads,
        webrtc_http_runtime_config);

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
    std::cout << "ops console: http://" << http_address << ":" << http_port << "/ops/home\n";
    std::cout << "client live: http://" << http_address << ":" << http_port << "/client/live\n";
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
    session_manager.SetAuxiliaryStreamRuntimeProvider({});
    analysis::StopEventStorage();
    return 0;
}

}  // namespace media_server::application

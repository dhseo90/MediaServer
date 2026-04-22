// 파일 용도: MediaServer 프로세스 진입점으로 설정, Registry, RTSP 서버, WebRTC HTTP 서버를 초기화한다.
#include <atomic>
#include <chrono>
#include <csignal>
#include <filesystem>
#include <iostream>
#include <thread>

#include "app_config.h"
#include "core/resource_guard.h"
#include "core/session_manager.h"
#include "core/stream_registry.h"
#include "ingress/gstreamer_rtsp_server.h"
#include "ingress/webrtc_http_server.h"

namespace {
std::atomic<bool> g_running{true};

void HandleSignal(int /*signal*/) {
    g_running.store(false);
}
}  // namespace

int main() {
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
    return 0;
}

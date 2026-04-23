// 파일 용도: 환경변수와 기본값을 합친 런타임 설정 구조체와 접근 함수를 선언한다.
#pragma once

#include <cstdint>
#include <string>

#include "stdafx.h"

namespace app {

struct AppConfig {
    std::string stream_route{app_config::kStreamRoute};
    std::size_t subscriber_queue_size{app_config::kSubscriberQueueSize};
    std::size_t max_sessions{app_config::kMaxSessions};
    std::size_t max_streams{app_config::kMaxStreams};
    int idle_grace_period_ms{app_config::kIdleGracePeriodMs};
    std::string rtsp_listen_address{app_config::kRtspListenAddress};
    std::uint16_t rtsp_listen_port{app_config::kRtspListenPort};
    std::string http_listen_address{app_config::kHttpListenAddress};
    std::uint16_t http_listen_port{app_config::kHttpListenPort};
    std::string file_root_path{app_config::kFileRootPath};
    std::string default_file_path{app_config::kDefaultFilePath};
    bool force_rtsp_tcp{false};
    bool session_trace{false};
    bool webrtc_trace{false};
    bool webrtc_trace_verbose{false};
    int webrtc_source_ready_timeout_ms{12000};
    int rtsp_source_preflight_timeout_ms{1500};
    int rtsp_source_start_timeout_ms{3000};
    int rtsp_track_settle_quiet_period_ms{1500};
    int rtsp_track_settle_max_ms{4000};
    std::string gst_attach_context;
    std::string youtube_resolver_bin{"yt-dlp"};
    std::string youtube_format{
        "best[protocol^=m3u8][vcodec!=none]/best[ext=mp4][acodec!=none][vcodec!=none]/"
        "best[acodec!=none][vcodec!=none]/best"};
    int youtube_resolve_timeout_ms{15000};
    int youtube_reconnect_delay_ms{2000};
};

const AppConfig& GetAppConfig();

}  // namespace app

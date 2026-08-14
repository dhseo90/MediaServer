// 파일 요약: 환경변수와 기본값을 합친 런타임 설정 구조체를 선언한다.
// 동작 요약: source, WebRTC, VA, import, event POST 관련 옵션을 AppConfig에 모은다.
// 동작 요약: 전역 config 초기화와 조회 API를 제공한다.
#pragma once

#include <cstdint>
#include <string>

#include "core/analysis_runtime_config_data.h"
#include "stdafx.h"

#ifndef MEDIA_SERVER_ENABLE_YOUTUBE_SOURCE
#define MEDIA_SERVER_ENABLE_YOUTUBE_SOURCE 0
#endif

namespace app {

inline constexpr bool kYouTubeSourceBuildEnabled = MEDIA_SERVER_ENABLE_YOUTUBE_SOURCE != 0;

enum class AuthMode {
    Auto,
    Off,
    Token,
    Session,
};

struct AppConfig : core::AnalysisRuntimeConfigData {
    std::string stream_route{app_config::kStreamRoute};
    std::size_t subscriber_queue_size{app_config::kSubscriberQueueSize};
    std::size_t max_sessions{app_config::kMaxSessions};
    std::size_t max_streams{app_config::kMaxStreams};
    int idle_grace_period_ms{app_config::kIdleGracePeriodMs};
    std::string rtsp_listen_address{app_config::kRtspListenAddress};
    std::uint16_t rtsp_listen_port{app_config::kRtspListenPort};
    std::string http_listen_address{app_config::kHttpListenAddress};
    std::uint16_t http_listen_port{app_config::kHttpListenPort};
    AuthMode auth_mode{AuthMode::Auto};
    std::string auth_admin_token;
    std::string auth_operator_token;
    std::string auth_viewer_token;
    std::string auth_integrator_token;
    std::string auth_users_file{".media_server.users.json"};
    int auth_session_ttl_seconds{86400};
    int auth_session_idle_timeout_seconds{3600};
    std::string auth_password_policy{"kr-privacy"};
    int auth_password_min_length{0};
    int auth_password_history_count{5};
    int auth_password_max_age_days{0};
    int auth_login_max_failures{5};
    int auth_login_lockout_seconds{300};
    std::string auth_cookie_name{"media_server_session"};
    bool auth_cookie_secure{false};
    std::string ui_default_home{"ops"};
    bool enable_lab{true};
    bool enable_ops{true};
    bool enable_client{true};
    std::string file_root_path{app_config::kFileRootPath};
    std::string default_file_path{app_config::kDefaultFilePath};
    bool webrtc_va_metadata_channel_enabled{app_config::kDefaultWebRtcVaMetadataChannelEnabled};
    std::string webrtc_va_metadata_channel_label{app_config::kDefaultWebRtcVaMetadataChannelLabel};
    int webrtc_va_metadata_interval_ms{app_config::kDefaultWebRtcVaMetadataIntervalMs};
    std::size_t webrtc_va_metadata_max_message_bytes{
        app_config::kDefaultWebRtcVaMetadataMaxMessageBytes};
    std::size_t webrtc_va_metadata_max_buffered_bytes{
        app_config::kDefaultWebRtcVaMetadataMaxBufferedBytes};
    std::string source_registry_path{app_config::kDefaultSourceRegistryPath};
    std::string published_views_path{app_config::kDefaultPublishedViewsPath};
    bool force_rtsp_tcp{false};
    bool webrtc_trace{false};
    bool webrtc_trace_verbose{false};
    std::string webrtc_stun_server{"stun://stun.l.google.com:19302"};
    std::string webrtc_turn_server;
    std::string webrtc_requested_ice_transport_policy{"all"};
    std::string webrtc_ice_transport_policy{"all"};
    int webrtc_source_ready_timeout_ms{12000};
    int rtsp_source_preflight_timeout_ms{1500};
    int rtsp_source_start_timeout_ms{3000};
    int rtsp_track_settle_quiet_period_ms{1500};
    int rtsp_track_settle_max_ms{4000};
    std::string gst_attach_context;
    int uri_video_width{1280};
    int uri_video_height{720};
    int uri_video_fps{30};
    int uri_video_bitrate_kbps{6000};
    std::string uri_x264_speed_preset{"superfast"};
    int uri_track_settle_quiet_period_ms{800};
    int uri_track_settle_max_ms{2500};
    int webrtc_video_width{1280};
    int webrtc_video_height{720};
    int webrtc_video_fps{30};
    int webrtc_video_bitrate_kbps{6000};
    int webrtc_video_keyframe_interval{30};
    std::string webrtc_x264_speed_preset{"superfast"};
    bool enable_experimental_youtube_source{false};
    bool enable_lab_youtube_import{kYouTubeSourceBuildEnabled};
    std::string youtube_resolver_bin{"yt-dlp"};
    std::string youtube_format{
        "best[protocol=https][height<=720][fps<=30][acodec!=none][vcodec!=none]/"
        "best[protocol=https][height<=720][acodec!=none][vcodec!=none]/"
        "best[protocol=https][acodec!=none][vcodec!=none]/"
        "best[protocol^=m3u8][height<=720][fps<=30][vcodec!=none]/"
        "best[protocol^=m3u8][height<=720][vcodec!=none]/best[protocol^=m3u8][vcodec!=none]/"
        "best[acodec!=none][vcodec!=none]/best"};
    int youtube_resolve_timeout_ms{15000};
    int youtube_reconnect_delay_ms{2000};
};

const AppConfig& GetAppConfig();

}  // namespace app

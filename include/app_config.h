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
    std::string default_analysis_detector{app_config::kDefaultAnalysisDetector};
    std::string default_analysis_model_path{app_config::kDefaultAnalysisModelPath};
    std::string default_analysis_labels_path{app_config::kDefaultAnalysisLabelsPath};
    int default_analysis_fps{app_config::kDefaultAnalysisFps};
    std::size_t default_analysis_max_queue{app_config::kDefaultAnalysisMaxQueue};
    int default_analysis_input_width{app_config::kDefaultAnalysisInputWidth};
    int default_analysis_input_height{app_config::kDefaultAnalysisInputHeight};
    float default_analysis_confidence{app_config::kDefaultAnalysisConfidence};
    float default_analysis_nms{app_config::kDefaultAnalysisNms};
    std::string default_analysis_preprocess{app_config::kDefaultAnalysisPreprocess};
    int default_analysis_overlay_wait_ms{app_config::kDefaultAnalysisOverlayWaitMs};
    int default_analysis_overlay_sync_tolerance_ms{app_config::kDefaultAnalysisOverlaySyncToleranceMs};
    int default_analysis_overlay_thickness{app_config::kDefaultAnalysisOverlayThickness};
    bool default_analysis_adaptive_enabled{app_config::kDefaultAnalysisAdaptiveEnabled};
    bool default_analysis_adaptive_input_enabled{app_config::kDefaultAnalysisAdaptiveInputEnabled};
    int default_analysis_adaptive_min_fps{app_config::kDefaultAnalysisAdaptiveMinFps};
    int default_analysis_adaptive_cooldown_ms{app_config::kDefaultAnalysisAdaptiveCooldownMs};
    int default_analysis_adaptive_input_step{app_config::kDefaultAnalysisAdaptiveInputStep};
    int default_analysis_adaptive_min_input_width{app_config::kDefaultAnalysisAdaptiveMinInputWidth};
    int default_analysis_adaptive_min_input_height{app_config::kDefaultAnalysisAdaptiveMinInputHeight};
    float default_analysis_adaptive_high_latency_ratio{app_config::kDefaultAnalysisAdaptiveHighLatencyRatio};
    float default_analysis_adaptive_low_latency_ratio{app_config::kDefaultAnalysisAdaptiveLowLatencyRatio};
    std::string analysis_registry_path{app_config::kDefaultAnalysisRegistryPath};
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

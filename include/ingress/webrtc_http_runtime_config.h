// 파일 요약: WebRTC HTTP/Auth transport가 소비하는 dependency-free 런타임 설정 스냅샷을 선언한다.
// 동작 요약: composition root가 AppConfig를 명시적으로 복사해 transport의 core-utility 의존을 차단한다.
#pragma once

#include <cstddef>
#include <cstdint>
#include <functional>
#include <string>

namespace ingress {

enum class HttpAuthMode {
    Auto,
    Off,
    Token,
    Session,
};

struct WebRtcHttpRuntimeConfig {
    std::string stream_route;
    std::uint16_t rtsp_listen_port{0};
    std::string file_root_path;
    std::string default_file_path;
    std::string source_registry_path;

    HttpAuthMode auth_mode{HttpAuthMode::Auto};
    std::string auth_admin_token;
    std::string auth_operator_token;
    std::string auth_viewer_token;
    std::string auth_integrator_token;
    std::string auth_users_file;
    int auth_session_ttl_seconds{0};
    int auth_session_idle_timeout_seconds{0};
    std::string auth_password_policy;
    int auth_password_min_length{0};
    int auth_password_history_count{0};
    int auth_password_max_age_days{0};
    int auth_login_max_failures{0};
    int auth_login_lockout_seconds{0};
    std::string auth_cookie_name;
    bool auth_cookie_secure{false};
    std::string ui_default_home;
    bool enable_lab{false};
    bool enable_ops{false};
    bool enable_client{false};

    bool webrtc_va_metadata_channel_enabled{false};
    std::string webrtc_va_metadata_channel_label;
    int webrtc_va_metadata_interval_ms{0};
    std::size_t webrtc_va_metadata_max_message_bytes{0};
    std::size_t webrtc_va_metadata_max_buffered_bytes{0};
    std::string webrtc_stun_server;
    std::string webrtc_turn_server;
    std::string webrtc_requested_ice_transport_policy;
    std::string webrtc_ice_transport_policy;

    std::string analysis_registry_path;
    std::string analysis_event_snapshot_dir;
    std::string analysis_event_clip_dir;
    std::uint32_t analysis_tracking_lost_buffer_frames{0};
    float analysis_tracking_iou_weight{0.0F};
    float analysis_tracking_distance_weight{0.0F};
    float analysis_tracking_direction_weight{0.0F};
    float analysis_tracking_class_weight{0.0F};
    float analysis_tracking_min_association_score{0.0F};
    float analysis_tracking_smoothing_alpha{0.0F};
    std::string analysis_tracking_close_object_guard_mode;
    float analysis_tracking_close_object_distance_ratio{0.0F};
    float analysis_tracking_close_object_overlap_threshold{0.0F};
    float analysis_tracking_close_object_low_margin_threshold{0.0F};
    float analysis_tracking_center_jump_penalty{0.0F};
    float analysis_tracking_close_object_min_score_boost{0.0F};
    std::size_t analysis_tracking_close_object_max_diagnostics{0};

    bool analysis_appearance_enabled{false};
    std::string analysis_appearance_extractor;
    std::string analysis_appearance_model_path;
    std::string analysis_appearance_model_sha256;
    std::string analysis_appearance_model_provenance;
    int analysis_appearance_input_width{0};
    int analysis_appearance_input_height{0};
    std::size_t analysis_appearance_max_embedding_dim{0};
    bool analysis_appearance_log_enabled{false};
    bool analysis_appearance_async_enabled{false};
    std::size_t analysis_appearance_max_queue{0};
    std::size_t analysis_appearance_global_max_queue{0};
    int analysis_appearance_per_stream_rate_limit_ms{0};
    int analysis_appearance_max_job_age_ms{0};

    bool youtube_source_build_enabled{false};
    std::function<std::string()> runtime_debug_snapshot_json;
    std::function<std::string(int, const std::string&)> build_stream_key;
};

}  // namespace ingress

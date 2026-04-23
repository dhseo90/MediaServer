// 파일 용도: 환경변수 값을 읽어 AppConfig를 구성하고 서버 전체 기본 설정을 제공한다.
#include "app_config.h"

#include <cerrno>
#include <cstdlib>
#include <iostream>
#include <limits>

namespace {

constexpr const char* kEnvRoute = "MEDIA_SERVER_ROUTE";
constexpr const char* kEnvSubscriberQueueSize = "MEDIA_SERVER_SUBSCRIBER_QUEUE_SIZE";
constexpr const char* kEnvMaxSessions = "MEDIA_SERVER_MAX_SESSIONS";
constexpr const char* kEnvMaxStreams = "MEDIA_SERVER_MAX_STREAMS";
constexpr const char* kEnvIdleGraceMs = "MEDIA_SERVER_IDLE_GRACE_MS";
constexpr const char* kEnvListenAddress = "MEDIA_SERVER_LISTEN_ADDRESS";
constexpr const char* kEnvListenPort = "MEDIA_SERVER_LISTEN_PORT";
constexpr const char* kEnvHttpListenAddress = "MEDIA_SERVER_HTTP_LISTEN_ADDRESS";
constexpr const char* kEnvHttpListenPort = "MEDIA_SERVER_HTTP_LISTEN_PORT";
constexpr const char* kEnvFileRoot = "MEDIA_SERVER_FILE_ROOT";
constexpr const char* kEnvDefaultFile = "MEDIA_SERVER_DEFAULT_FILE";
constexpr const char* kEnvForceTcpOnly = "MEDIA_SERVER_FORCE_RTSP_TCP";
constexpr const char* kEnvSessionTrace = "MEDIA_SERVER_SESSION_TRACE";
constexpr const char* kEnvWebRtcTrace = "MEDIA_SERVER_WEBRTC_TRACE";
constexpr const char* kEnvWebRtcTraceVerbose = "MEDIA_SERVER_WEBRTC_TRACE_VERBOSE";
constexpr const char* kEnvWebRtcSourceReadyTimeoutMs = "MEDIA_SERVER_WEBRTC_SOURCE_READY_TIMEOUT_MS";
constexpr const char* kEnvRtspSourcePreflightTimeoutMs = "MEDIA_SERVER_RTSP_SOURCE_PREFLIGHT_TIMEOUT_MS";
constexpr const char* kEnvRtspSourceStartTimeoutMs = "MEDIA_SERVER_RTSP_SOURCE_START_TIMEOUT_MS";
constexpr const char* kEnvRtspTrackSettleQuietPeriodMs = "MEDIA_SERVER_RTSP_TRACK_SETTLE_QUIET_PERIOD_MS";
constexpr const char* kEnvRtspTrackSettleMaxMs = "MEDIA_SERVER_RTSP_TRACK_SETTLE_MAX_MS";
constexpr const char* kEnvGstAttachMode = "MEDIA_SERVER_GST_ATTACH_CONTEXT";
constexpr const char* kEnvUriVideoWidth = "MEDIA_SERVER_URI_VIDEO_WIDTH";
constexpr const char* kEnvUriVideoHeight = "MEDIA_SERVER_URI_VIDEO_HEIGHT";
constexpr const char* kEnvUriVideoFps = "MEDIA_SERVER_URI_VIDEO_FPS";
constexpr const char* kEnvUriVideoBitrateKbps = "MEDIA_SERVER_URI_VIDEO_BITRATE_KBPS";
constexpr const char* kEnvUriX264Preset = "MEDIA_SERVER_URI_X264_PRESET";
constexpr const char* kEnvUriTrackSettleQuietPeriodMs = "MEDIA_SERVER_URI_TRACK_SETTLE_QUIET_PERIOD_MS";
constexpr const char* kEnvUriTrackSettleMaxMs = "MEDIA_SERVER_URI_TRACK_SETTLE_MAX_MS";
constexpr const char* kEnvWebRtcVideoWidth = "MEDIA_SERVER_WEBRTC_VIDEO_WIDTH";
constexpr const char* kEnvWebRtcVideoHeight = "MEDIA_SERVER_WEBRTC_VIDEO_HEIGHT";
constexpr const char* kEnvWebRtcVideoFps = "MEDIA_SERVER_WEBRTC_VIDEO_FPS";
constexpr const char* kEnvWebRtcVideoBitrateKbps = "MEDIA_SERVER_WEBRTC_VIDEO_BITRATE_KBPS";
constexpr const char* kEnvWebRtcVideoKeyframeInterval = "MEDIA_SERVER_WEBRTC_VIDEO_KEYFRAME_INTERVAL";
constexpr const char* kEnvWebRtcX264Preset = "MEDIA_SERVER_WEBRTC_X264_PRESET";
constexpr const char* kEnvEnableExperimentalYoutubeSource = "MEDIA_SERVER_ENABLE_EXPERIMENTAL_YOUTUBE_SOURCE";
constexpr const char* kEnvYoutubeResolverBin = "MEDIA_SERVER_YOUTUBE_RESOLVER_BIN";
constexpr const char* kEnvYoutubeFormat = "MEDIA_SERVER_YOUTUBE_FORMAT";
constexpr const char* kEnvYoutubeResolveTimeoutMs = "MEDIA_SERVER_YOUTUBE_RESOLVE_TIMEOUT_MS";
constexpr const char* kEnvYoutubeReconnectDelayMs = "MEDIA_SERVER_YOUTUBE_RECONNECT_DELAY_MS";

const char* ReadEnv(const char* name) {
    const char* value = std::getenv(name);
    if (value == nullptr || value[0] == '\0') {
        return nullptr;
    }
    return value;
}

std::string ReadStringEnv(const char* name, const std::string& fallback) {
    if (const char* value = ReadEnv(name); value != nullptr) {
        return std::string(value);
    }
    return fallback;
}

std::size_t ReadSizeEnv(const char* name, std::size_t fallback) {
    const char* value = ReadEnv(name);
    if (value == nullptr) {
        return fallback;
    }

    char* end = nullptr;
    errno = 0;
    const unsigned long long parsed = std::strtoull(value, &end, 10);
    if (errno != 0 || end == value || *end != '\0' || parsed > std::numeric_limits<std::size_t>::max()) {
        std::cerr << "[env] invalid " << name << "='" << value << "', fallback " << fallback << "\n";
        return fallback;
    }
    return static_cast<std::size_t>(parsed);
}

int ReadIntEnv(const char* name, int fallback) {
    const char* value = ReadEnv(name);
    if (value == nullptr) {
        return fallback;
    }

    char* end = nullptr;
    errno = 0;
    const long parsed = std::strtol(value, &end, 10);
    if (errno != 0 || end == value || *end != '\0' ||
        parsed < std::numeric_limits<int>::min() || parsed > std::numeric_limits<int>::max()) {
        std::cerr << "[env] invalid " << name << "='" << value << "', fallback " << fallback << "\n";
        return fallback;
    }
    return static_cast<int>(parsed);
}

std::uint16_t ReadPortEnv(const char* name, std::uint16_t fallback) {
    const char* value = ReadEnv(name);
    if (value == nullptr) {
        return fallback;
    }

    char* end = nullptr;
    errno = 0;
    const unsigned long parsed = std::strtoul(value, &end, 10);
    if (errno != 0 || end == value || *end != '\0' || parsed == 0 || parsed > 65535) {
        std::cerr << "[env] invalid " << name << "='" << value << "', fallback " << fallback << "\n";
        return fallback;
    }
    return static_cast<std::uint16_t>(parsed);
}

bool ReadBoolEnv(const char* name, bool fallback) {
    const char* value = ReadEnv(name);
    if (value == nullptr) {
        return fallback;
    }

    const std::string parsed(value);
    if (parsed == "1" || parsed == "true" || parsed == "TRUE" || parsed == "True") {
        return true;
    }
    if (parsed == "0" || parsed == "false" || parsed == "FALSE" || parsed == "False") {
        return false;
    }

    std::cerr << "[env] invalid " << name << "='" << value << "', fallback " << (fallback ? "true" : "false") << "\n";
    return fallback;
}

bool IsAllowedX264Preset(const std::string& preset) {
    return preset == "ultrafast" || preset == "superfast" || preset == "veryfast" ||
           preset == "faster" || preset == "fast" || preset == "medium" ||
           preset == "slow" || preset == "slower" || preset == "veryslow" ||
           preset == "placebo";
}

void ValidatePositiveInt(int* value, int fallback, const char* description) {
    if (value == nullptr || *value > 0) {
        return;
    }
    std::cerr << "[env] " << description << " must be positive, fallback " << fallback << "\n";
    *value = fallback;
}

void ValidateEvenPositiveInt(int* value, int fallback, const char* description) {
    if (value != nullptr && *value > 0 && (*value % 2) == 0) {
        return;
    }
    std::cerr << "[env] " << description << " must be positive even number, fallback " << fallback << "\n";
    *value = fallback;
}

app::AppConfig LoadAppConfig() {
    app::AppConfig config;
    // stdafx.h/app_config.h의 기본값을 먼저 만들고, 배포/테스트 환경별 env 값으로 덮어쓴다.
    config.stream_route = ReadStringEnv(kEnvRoute, config.stream_route);
    config.subscriber_queue_size = ReadSizeEnv(kEnvSubscriberQueueSize, config.subscriber_queue_size);
    config.max_sessions = ReadSizeEnv(kEnvMaxSessions, config.max_sessions);
    config.max_streams = ReadSizeEnv(kEnvMaxStreams, config.max_streams);
    config.idle_grace_period_ms = ReadIntEnv(kEnvIdleGraceMs, config.idle_grace_period_ms);
    config.rtsp_listen_address = ReadStringEnv(kEnvListenAddress, config.rtsp_listen_address);
    config.rtsp_listen_port = ReadPortEnv(kEnvListenPort, config.rtsp_listen_port);
    config.http_listen_address = ReadStringEnv(kEnvHttpListenAddress, config.http_listen_address);
    config.http_listen_port = ReadPortEnv(kEnvHttpListenPort, config.http_listen_port);
    config.file_root_path = ReadStringEnv(kEnvFileRoot, config.file_root_path);
    config.default_file_path = ReadStringEnv(kEnvDefaultFile, config.default_file_path);
    config.force_rtsp_tcp = ReadBoolEnv(kEnvForceTcpOnly, config.force_rtsp_tcp);
    config.session_trace = ReadBoolEnv(kEnvSessionTrace, config.session_trace);
    config.webrtc_trace = ReadBoolEnv(kEnvWebRtcTrace, config.webrtc_trace);
    config.webrtc_trace_verbose = ReadBoolEnv(kEnvWebRtcTraceVerbose, config.webrtc_trace_verbose);
    config.webrtc_source_ready_timeout_ms =
        ReadIntEnv(kEnvWebRtcSourceReadyTimeoutMs, config.webrtc_source_ready_timeout_ms);
    config.rtsp_source_preflight_timeout_ms =
        ReadIntEnv(kEnvRtspSourcePreflightTimeoutMs, config.rtsp_source_preflight_timeout_ms);
    config.rtsp_source_start_timeout_ms =
        ReadIntEnv(kEnvRtspSourceStartTimeoutMs, config.rtsp_source_start_timeout_ms);
    config.rtsp_track_settle_quiet_period_ms =
        ReadIntEnv(kEnvRtspTrackSettleQuietPeriodMs, config.rtsp_track_settle_quiet_period_ms);
    config.rtsp_track_settle_max_ms =
        ReadIntEnv(kEnvRtspTrackSettleMaxMs, config.rtsp_track_settle_max_ms);
    config.gst_attach_context = ReadStringEnv(kEnvGstAttachMode, config.gst_attach_context);
    config.uri_video_width = ReadIntEnv(kEnvUriVideoWidth, config.uri_video_width);
    config.uri_video_height = ReadIntEnv(kEnvUriVideoHeight, config.uri_video_height);
    config.uri_video_fps = ReadIntEnv(kEnvUriVideoFps, config.uri_video_fps);
    config.uri_video_bitrate_kbps = ReadIntEnv(kEnvUriVideoBitrateKbps, config.uri_video_bitrate_kbps);
    config.uri_x264_speed_preset = ReadStringEnv(kEnvUriX264Preset, config.uri_x264_speed_preset);
    config.uri_track_settle_quiet_period_ms =
        ReadIntEnv(kEnvUriTrackSettleQuietPeriodMs, config.uri_track_settle_quiet_period_ms);
    config.uri_track_settle_max_ms = ReadIntEnv(kEnvUriTrackSettleMaxMs, config.uri_track_settle_max_ms);
    config.webrtc_video_width = ReadIntEnv(kEnvWebRtcVideoWidth, config.webrtc_video_width);
    config.webrtc_video_height = ReadIntEnv(kEnvWebRtcVideoHeight, config.webrtc_video_height);
    config.webrtc_video_fps = ReadIntEnv(kEnvWebRtcVideoFps, config.webrtc_video_fps);
    config.webrtc_video_bitrate_kbps =
        ReadIntEnv(kEnvWebRtcVideoBitrateKbps, config.webrtc_video_bitrate_kbps);
    config.webrtc_video_keyframe_interval =
        ReadIntEnv(kEnvWebRtcVideoKeyframeInterval, config.webrtc_video_keyframe_interval);
    config.webrtc_x264_speed_preset = ReadStringEnv(kEnvWebRtcX264Preset, config.webrtc_x264_speed_preset);
    config.enable_experimental_youtube_source =
        ReadBoolEnv(kEnvEnableExperimentalYoutubeSource, config.enable_experimental_youtube_source);
    config.youtube_resolver_bin = ReadStringEnv(kEnvYoutubeResolverBin, config.youtube_resolver_bin);
    config.youtube_format = ReadStringEnv(kEnvYoutubeFormat, config.youtube_format);
    config.youtube_resolve_timeout_ms =
        ReadIntEnv(kEnvYoutubeResolveTimeoutMs, config.youtube_resolve_timeout_ms);
    config.youtube_reconnect_delay_ms =
        ReadIntEnv(kEnvYoutubeReconnectDelayMs, config.youtube_reconnect_delay_ms);
    // 잘못된 env 입력은 서버 시작 실패 대신 안전한 fallback으로 보정하고 로그를 남긴다.
    if (config.subscriber_queue_size == 0) {
        std::cerr << "[env] subscriber queue size cannot be 0, fallback 1\n";
        config.subscriber_queue_size = 1;
    }
    if (config.idle_grace_period_ms < 0) {
        std::cerr << "[env] idle grace ms cannot be negative, fallback 0\n";
        config.idle_grace_period_ms = 0;
    }
    if (config.webrtc_source_ready_timeout_ms <= 0) {
        std::cerr << "[env] WebRTC source ready timeout must be positive, fallback 12000\n";
        config.webrtc_source_ready_timeout_ms = 12000;
    }
    if (config.rtsp_source_preflight_timeout_ms < 0) {
        std::cerr << "[env] RTSP source preflight timeout cannot be negative, fallback 0\n";
        config.rtsp_source_preflight_timeout_ms = 0;
    }
    if (config.rtsp_source_start_timeout_ms <= 0) {
        std::cerr << "[env] RTSP source start timeout must be positive, fallback 3000\n";
        config.rtsp_source_start_timeout_ms = 3000;
    }
    if (config.rtsp_track_settle_quiet_period_ms < 0) {
        std::cerr << "[env] RTSP track settle quiet period cannot be negative, fallback 0\n";
        config.rtsp_track_settle_quiet_period_ms = 0;
    }
    if (config.rtsp_track_settle_max_ms <= 0) {
        std::cerr << "[env] RTSP track settle max must be positive, fallback 4000\n";
        config.rtsp_track_settle_max_ms = 4000;
    }
    ValidateEvenPositiveInt(&config.uri_video_width, 1280, "URI video width");
    ValidateEvenPositiveInt(&config.uri_video_height, 720, "URI video height");
    ValidatePositiveInt(&config.uri_video_fps, 30, "URI video fps");
    ValidatePositiveInt(&config.uri_video_bitrate_kbps, 6000, "URI video bitrate kbps");
    if (!IsAllowedX264Preset(config.uri_x264_speed_preset)) {
        std::cerr << "[env] invalid URI x264 preset '" << config.uri_x264_speed_preset
                  << "', fallback superfast\n";
        config.uri_x264_speed_preset = "superfast";
    }
    if (config.uri_track_settle_quiet_period_ms < 0) {
        std::cerr << "[env] URI track settle quiet period cannot be negative, fallback 800\n";
        config.uri_track_settle_quiet_period_ms = 800;
    }
    ValidatePositiveInt(&config.uri_track_settle_max_ms, 2500, "URI track settle max ms");
    if (config.uri_track_settle_max_ms < config.uri_track_settle_quiet_period_ms) {
        std::cerr << "[env] URI track settle max ms is smaller than quiet period, using quiet period\n";
        config.uri_track_settle_max_ms = config.uri_track_settle_quiet_period_ms;
    }
    ValidateEvenPositiveInt(&config.webrtc_video_width, 1280, "WebRTC video width");
    ValidateEvenPositiveInt(&config.webrtc_video_height, 720, "WebRTC video height");
    ValidatePositiveInt(&config.webrtc_video_fps, 30, "WebRTC video fps");
    ValidatePositiveInt(&config.webrtc_video_bitrate_kbps, 6000, "WebRTC video bitrate kbps");
    ValidatePositiveInt(&config.webrtc_video_keyframe_interval, 30, "WebRTC keyframe interval");
    if (!IsAllowedX264Preset(config.webrtc_x264_speed_preset)) {
        std::cerr << "[env] invalid WebRTC x264 preset '" << config.webrtc_x264_speed_preset
                  << "', fallback superfast\n";
        config.webrtc_x264_speed_preset = "superfast";
    }
    if (config.youtube_resolver_bin.empty()) {
        std::cerr << "[env] YouTube resolver binary cannot be empty, fallback yt-dlp\n";
        config.youtube_resolver_bin = "yt-dlp";
    }
    if (config.youtube_format.empty()) {
        std::cerr << "[env] YouTube format cannot be empty, fallback best\n";
        config.youtube_format = "best";
    }
    if (config.youtube_resolve_timeout_ms <= 0) {
        std::cerr << "[env] YouTube resolve timeout must be positive, fallback 15000\n";
        config.youtube_resolve_timeout_ms = 15000;
    }
    if (config.youtube_reconnect_delay_ms <= 0) {
        std::cerr << "[env] YouTube reconnect delay must be positive, fallback 2000\n";
        config.youtube_reconnect_delay_ms = 2000;
    }
    return config;
}

}  // namespace

namespace app {

const AppConfig& GetAppConfig() {
    static const AppConfig config = LoadAppConfig();
    return config;
}

}  // namespace app

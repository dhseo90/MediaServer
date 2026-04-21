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

app::AppConfig LoadAppConfig() {
    app::AppConfig config;
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
    return config;
}

}  // namespace

namespace app {

const AppConfig& GetAppConfig() {
    static const AppConfig config = LoadAppConfig();
    return config;
}

}  // namespace app

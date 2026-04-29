// 파일 요약: 환경변수와 기본 상수를 합쳐 서버 전체 AppConfig를 구성한다.
// 동작 요약: WebRTC ICE, VA, import, source timeout, event POST 같은 런타임 옵션을 해석한다.
// 동작 요약: 잘못된 값은 안전한 기본값으로 보정하고 필요한 경고를 표준 오류에 남긴다.
#include "app_config.h"

#include <cerrno>
#include <cctype>
#include <cstdlib>
#include <filesystem>
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
constexpr const char* kEnvDefaultAnalysisDetector = "MEDIA_SERVER_ANALYSIS_DETECTOR";
constexpr const char* kEnvDefaultAnalysisModel = "MEDIA_SERVER_ANALYSIS_MODEL";
constexpr const char* kEnvDefaultAnalysisLabels = "MEDIA_SERVER_ANALYSIS_LABELS";
constexpr const char* kEnvDefaultAnalysisFps = "MEDIA_SERVER_ANALYSIS_FPS";
constexpr const char* kEnvDefaultAnalysisMaxQueue = "MEDIA_SERVER_ANALYSIS_MAX_QUEUE";
constexpr const char* kEnvDefaultAnalysisInputWidth = "MEDIA_SERVER_ANALYSIS_INPUT_WIDTH";
constexpr const char* kEnvDefaultAnalysisInputHeight = "MEDIA_SERVER_ANALYSIS_INPUT_HEIGHT";
constexpr const char* kEnvDefaultAnalysisConfidence = "MEDIA_SERVER_ANALYSIS_CONFIDENCE";
constexpr const char* kEnvDefaultAnalysisNms = "MEDIA_SERVER_ANALYSIS_NMS";
constexpr const char* kEnvDefaultAnalysisPreprocess = "MEDIA_SERVER_ANALYSIS_PREPROCESS";
constexpr const char* kEnvDefaultAnalysisTracking = "MEDIA_SERVER_ANALYSIS_TRACKING";
constexpr const char* kEnvDefaultAnalysisTrackingClasses = "MEDIA_SERVER_ANALYSIS_TRACKING_CLASSES";
constexpr const char* kEnvDefaultAnalysisOverlayWaitMs = "MEDIA_SERVER_ANALYSIS_OVERLAY_WAIT_MS";
constexpr const char* kEnvDefaultAnalysisOverlaySyncToleranceMs =
    "MEDIA_SERVER_ANALYSIS_OVERLAY_SYNC_TOLERANCE_MS";
constexpr const char* kEnvDefaultAnalysisOverlayThickness = "MEDIA_SERVER_ANALYSIS_OVERLAY_THICKNESS";
constexpr const char* kEnvDefaultAnalysisAdaptive = "MEDIA_SERVER_ANALYSIS_ADAPTIVE";
constexpr const char* kEnvDefaultAnalysisAdaptiveInput = "MEDIA_SERVER_ANALYSIS_ADAPTIVE_INPUT_SIZE";
constexpr const char* kEnvDefaultAnalysisAdaptiveMinFps = "MEDIA_SERVER_ANALYSIS_ADAPTIVE_MIN_FPS";
constexpr const char* kEnvDefaultAnalysisAdaptiveCooldownMs = "MEDIA_SERVER_ANALYSIS_ADAPTIVE_COOLDOWN_MS";
constexpr const char* kEnvDefaultAnalysisAdaptiveInputStep = "MEDIA_SERVER_ANALYSIS_ADAPTIVE_INPUT_STEP";
constexpr const char* kEnvDefaultAnalysisAdaptiveMinInputWidth = "MEDIA_SERVER_ANALYSIS_ADAPTIVE_MIN_INPUT_WIDTH";
constexpr const char* kEnvDefaultAnalysisAdaptiveMinInputHeight = "MEDIA_SERVER_ANALYSIS_ADAPTIVE_MIN_INPUT_HEIGHT";
constexpr const char* kEnvDefaultAnalysisAdaptiveHighLatencyRatio =
    "MEDIA_SERVER_ANALYSIS_ADAPTIVE_HIGH_LATENCY_RATIO";
constexpr const char* kEnvDefaultAnalysisAdaptiveLowLatencyRatio =
    "MEDIA_SERVER_ANALYSIS_ADAPTIVE_LOW_LATENCY_RATIO";
constexpr const char* kEnvAnalysisRegistryPath = "MEDIA_SERVER_ANALYSIS_REGISTRY";
constexpr const char* kEnvAnalysisEventPostEnabled = "MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED";
constexpr const char* kEnvAnalysisEventPostTimeoutMs = "MEDIA_SERVER_ANALYSIS_EVENT_POST_TIMEOUT_MS";
constexpr const char* kEnvAnalysisEventPostMaxQueue = "MEDIA_SERVER_ANALYSIS_EVENT_POST_MAX_QUEUE";
constexpr const char* kEnvAnalysisEventPostCooldownMs = "MEDIA_SERVER_ANALYSIS_EVENT_POST_COOLDOWN_MS";
constexpr const char* kEnvAnalysisMaxActiveTracksPerStream =
    "MEDIA_SERVER_ANALYSIS_MAX_ACTIVE_TRACKS_PER_STREAM";
constexpr const char* kEnvAnalysisMaxRecentObservationsPerTrack =
    "MEDIA_SERVER_ANALYSIS_MAX_RECENT_OBSERVATIONS_PER_TRACK";
constexpr const char* kEnvAnalysisMaxTrajectoryPointsPerTrack =
    "MEDIA_SERVER_ANALYSIS_MAX_TRAJECTORY_POINTS_PER_TRACK";
constexpr const char* kEnvAnalysisTrajectoryDownsampleMs =
    "MEDIA_SERVER_ANALYSIS_TRAJECTORY_DOWNSAMPLE_MS";
constexpr const char* kEnvAnalysisTerminatedTrackRetentionMs =
    "MEDIA_SERVER_ANALYSIS_TERMINATED_TRACK_RETENTION_MS";
constexpr const char* kEnvAnalysisCleanupIntervalMs = "MEDIA_SERVER_ANALYSIS_CLEANUP_INTERVAL_MS";
constexpr const char* kEnvAnalysisScenarioEnabled = "MEDIA_SERVER_ANALYSIS_SCENARIO_ENABLED";
constexpr const char* kEnvAnalysisScenarioMaxInstancesPerChannel =
    "MEDIA_SERVER_ANALYSIS_SCENARIO_MAX_INSTANCES_PER_CHANNEL";
constexpr const char* kEnvAnalysisScenarioCooldownMs = "MEDIA_SERVER_ANALYSIS_SCENARIO_COOLDOWN_MS";
constexpr const char* kEnvAnalysisScenarioUpdateIntervalMs =
    "MEDIA_SERVER_ANALYSIS_SCENARIO_UPDATE_INTERVAL_MS";
constexpr const char* kEnvAnalysisScenarioRetentionMs =
    "MEDIA_SERVER_ANALYSIS_SCENARIO_RETENTION_MS";
constexpr const char* kEnvAnalysisScenarioEndedRetentionMs =
    "MEDIA_SERVER_ANALYSIS_SCENARIO_ENDED_RETENTION_MS";
constexpr const char* kEnvAnalysisIntrusionDwellEnabled =
    "MEDIA_SERVER_ANALYSIS_INTRUSION_DWELL_ENABLED";
constexpr const char* kEnvAnalysisIntrusionDwellCandidateMs =
    "MEDIA_SERVER_ANALYSIS_INTRUSION_DWELL_CANDIDATE_MS";
constexpr const char* kEnvAnalysisIntrusionDwellDwellMs =
    "MEDIA_SERVER_ANALYSIS_INTRUSION_DWELL_DWELL_MS";
constexpr const char* kEnvAnalysisIntrusionDwellCooldownMs =
    "MEDIA_SERVER_ANALYSIS_INTRUSION_DWELL_COOLDOWN_MS";
constexpr const char* kEnvAnalysisIntrusionDwellTargetClasses =
    "MEDIA_SERVER_ANALYSIS_INTRUSION_DWELL_TARGET_CLASSES";
constexpr const char* kEnvAnalysisIntrusionDwellRestrictedZoneIds =
    "MEDIA_SERVER_ANALYSIS_INTRUSION_DWELL_RESTRICTED_ZONE_IDS";
constexpr const char* kEnvAnalysisAppearanceEnabled = "MEDIA_SERVER_ANALYSIS_APPEARANCE_ENABLED";
constexpr const char* kEnvAnalysisAppearanceOnTrackCreated =
    "MEDIA_SERVER_ANALYSIS_APPEARANCE_ON_TRACK_CREATED";
constexpr const char* kEnvAnalysisAppearanceEveryNSeconds =
    "MEDIA_SERVER_ANALYSIS_APPEARANCE_EVERY_N_SECONDS";
constexpr const char* kEnvAnalysisAppearanceOnTrackLost =
    "MEDIA_SERVER_ANALYSIS_APPEARANCE_ON_TRACK_LOST";
constexpr const char* kEnvAnalysisAppearanceOnReacquireCandidate =
    "MEDIA_SERVER_ANALYSIS_APPEARANCE_ON_REACQUIRE_CANDIDATE";
constexpr const char* kEnvAnalysisAppearanceOnLowConfidenceAssociation =
    "MEDIA_SERVER_ANALYSIS_APPEARANCE_ON_LOW_CONFIDENCE_ASSOCIATION";
constexpr const char* kEnvForceTcpOnly = "MEDIA_SERVER_FORCE_RTSP_TCP";
constexpr const char* kEnvSessionTrace = "MEDIA_SERVER_SESSION_TRACE";
constexpr const char* kEnvWebRtcTrace = "MEDIA_SERVER_WEBRTC_TRACE";
constexpr const char* kEnvWebRtcTraceVerbose = "MEDIA_SERVER_WEBRTC_TRACE_VERBOSE";
constexpr const char* kEnvWebRtcStunServer = "MEDIA_SERVER_WEBRTC_STUN_SERVER";
constexpr const char* kEnvWebRtcTurnServer = "MEDIA_SERVER_WEBRTC_TURN_SERVER";
constexpr const char* kEnvWebRtcIceTransportPolicy = "MEDIA_SERVER_WEBRTC_ICE_TRANSPORT_POLICY";
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
constexpr const char* kEnvEnableLabYoutubeImport = "MEDIA_SERVER_ENABLE_LAB_YOUTUBE_IMPORT";
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

float ReadFloatEnv(const char* name, float fallback) {
    const char* value = ReadEnv(name);
    if (value == nullptr) {
        return fallback;
    }

    char* end = nullptr;
    errno = 0;
    const float parsed = std::strtof(value, &end);
    if (errno != 0 || end == value || *end != '\0') {
        std::cerr << "[env] invalid " << name << "='" << value << "', fallback " << fallback << "\n";
        return fallback;
    }
    return parsed;
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

// class label처럼 내부 공백이 의미 있는 값을 위해 token 양끝 공백만 정리한다.
std::string TrimToken(std::string value) {
    while (!value.empty() && std::isspace(static_cast<unsigned char>(value.front())) != 0) {
        value.erase(value.begin());
    }
    while (!value.empty() && std::isspace(static_cast<unsigned char>(value.back())) != 0) {
        value.pop_back();
    }
    return value;
}

// 쉼표/세미콜론으로 구분된 env 목록을 vector로 반환한다.
std::vector<std::string> SplitList(std::string value) {
    std::vector<std::string> out;
    std::string current;
    for (const char ch : value) {
        if (ch == ',' || ch == ';') {
            current = TrimToken(current);
            if (!current.empty()) {
                out.push_back(std::move(current));
                current.clear();
            }
            continue;
        }
        current.push_back(ch);
    }
    current = TrimToken(current);
    if (!current.empty()) {
        out.push_back(std::move(current));
    }
    return out;
}

// env 목록이 비어 있지 않을 때만 기본 vector를 덮어쓴다.
std::vector<std::string> ReadStringListEnv(const char* name, const std::vector<std::string>& fallback) {
    const char* value = ReadEnv(name);
    if (value == nullptr) {
        return fallback;
    }
    auto parsed = SplitList(value);
    if (parsed.empty()) {
        std::cerr << "[env] invalid " << name << "='" << value << "', fallback default list\n";
        return fallback;
    }
    return parsed;
}

std::vector<std::string> ReadOptionalStringListEnv(const char* name,
                                                   const std::vector<std::string>& fallback) {
    const char* value = ReadEnv(name);
    if (value == nullptr) {
        return fallback;
    }
    return SplitList(value);
}

bool IsAllowedX264Preset(const std::string& preset) {
    return preset == "ultrafast" || preset == "superfast" || preset == "veryfast" ||
           preset == "faster" || preset == "fast" || preset == "medium" ||
           preset == "slow" || preset == "slower" || preset == "veryslow" ||
           preset == "placebo";
}

// 운영 환경에서 허용할 WebRTC ICE transport policy 값만 통과시킨다.
bool IsAllowedWebRtcIceTransportPolicy(const std::string& value) {
    return value == "all" || value == "relay";
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

std::string ResolveRuntimePath(const std::string& path) {
    if (path.empty()) {
        return path;
    }
    // repo 기본값은 상대 경로로 보관하고, 런타임에는 현재 작업 디렉터리 기준 절대 경로로 정규화한다.
    const std::filesystem::path value(path);
    if (value.is_absolute()) {
        return value.lexically_normal().string();
    }
    return std::filesystem::absolute(value).lexically_normal().string();
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
    config.default_analysis_detector =
        ReadStringEnv(kEnvDefaultAnalysisDetector, config.default_analysis_detector);
    config.default_analysis_model_path =
        ReadStringEnv(kEnvDefaultAnalysisModel, config.default_analysis_model_path);
    config.default_analysis_labels_path =
        ReadStringEnv(kEnvDefaultAnalysisLabels, config.default_analysis_labels_path);
    config.default_analysis_fps = ReadIntEnv(kEnvDefaultAnalysisFps, config.default_analysis_fps);
    config.default_analysis_max_queue =
        ReadSizeEnv(kEnvDefaultAnalysisMaxQueue, config.default_analysis_max_queue);
    config.default_analysis_input_width =
        ReadIntEnv(kEnvDefaultAnalysisInputWidth, config.default_analysis_input_width);
    config.default_analysis_input_height =
        ReadIntEnv(kEnvDefaultAnalysisInputHeight, config.default_analysis_input_height);
    config.default_analysis_confidence =
        ReadFloatEnv(kEnvDefaultAnalysisConfidence, config.default_analysis_confidence);
    config.default_analysis_nms = ReadFloatEnv(kEnvDefaultAnalysisNms, config.default_analysis_nms);
    config.default_analysis_preprocess =
        ReadStringEnv(kEnvDefaultAnalysisPreprocess, config.default_analysis_preprocess);
    config.default_analysis_tracking_enabled =
        ReadBoolEnv(kEnvDefaultAnalysisTracking, config.default_analysis_tracking_enabled);
    config.default_analysis_tracking_classes =
        ReadStringListEnv(kEnvDefaultAnalysisTrackingClasses, config.default_analysis_tracking_classes);
    config.default_analysis_overlay_wait_ms =
        ReadIntEnv(kEnvDefaultAnalysisOverlayWaitMs, config.default_analysis_overlay_wait_ms);
    config.default_analysis_overlay_sync_tolerance_ms =
        ReadIntEnv(kEnvDefaultAnalysisOverlaySyncToleranceMs, config.default_analysis_overlay_sync_tolerance_ms);
    config.default_analysis_overlay_thickness =
        ReadIntEnv(kEnvDefaultAnalysisOverlayThickness, config.default_analysis_overlay_thickness);
    config.default_analysis_adaptive_enabled =
        ReadBoolEnv(kEnvDefaultAnalysisAdaptive, config.default_analysis_adaptive_enabled);
    config.default_analysis_adaptive_input_enabled =
        ReadBoolEnv(kEnvDefaultAnalysisAdaptiveInput, config.default_analysis_adaptive_input_enabled);
    config.default_analysis_adaptive_min_fps =
        ReadIntEnv(kEnvDefaultAnalysisAdaptiveMinFps, config.default_analysis_adaptive_min_fps);
    config.default_analysis_adaptive_cooldown_ms =
        ReadIntEnv(kEnvDefaultAnalysisAdaptiveCooldownMs, config.default_analysis_adaptive_cooldown_ms);
    config.default_analysis_adaptive_input_step =
        ReadIntEnv(kEnvDefaultAnalysisAdaptiveInputStep, config.default_analysis_adaptive_input_step);
    config.default_analysis_adaptive_min_input_width =
        ReadIntEnv(kEnvDefaultAnalysisAdaptiveMinInputWidth, config.default_analysis_adaptive_min_input_width);
    config.default_analysis_adaptive_min_input_height =
        ReadIntEnv(kEnvDefaultAnalysisAdaptiveMinInputHeight, config.default_analysis_adaptive_min_input_height);
    config.default_analysis_adaptive_high_latency_ratio =
        ReadFloatEnv(kEnvDefaultAnalysisAdaptiveHighLatencyRatio,
                     config.default_analysis_adaptive_high_latency_ratio);
    config.default_analysis_adaptive_low_latency_ratio =
        ReadFloatEnv(kEnvDefaultAnalysisAdaptiveLowLatencyRatio,
                     config.default_analysis_adaptive_low_latency_ratio);
    config.analysis_registry_path = ReadStringEnv(kEnvAnalysisRegistryPath, config.analysis_registry_path);
    config.analysis_event_post_enabled =
        ReadBoolEnv(kEnvAnalysisEventPostEnabled, config.analysis_event_post_enabled);
    config.analysis_event_post_timeout_ms =
        ReadIntEnv(kEnvAnalysisEventPostTimeoutMs, config.analysis_event_post_timeout_ms);
    config.analysis_event_post_max_queue =
        ReadSizeEnv(kEnvAnalysisEventPostMaxQueue, config.analysis_event_post_max_queue);
    config.analysis_event_post_cooldown_ms =
        ReadIntEnv(kEnvAnalysisEventPostCooldownMs, config.analysis_event_post_cooldown_ms);
    config.analysis_scenario_enabled =
        ReadBoolEnv(kEnvAnalysisScenarioEnabled, config.analysis_scenario_enabled);
    config.analysis_max_active_tracks_per_stream =
        ReadSizeEnv(kEnvAnalysisMaxActiveTracksPerStream,
                    config.analysis_max_active_tracks_per_stream);
    config.analysis_max_recent_observations_per_track =
        ReadSizeEnv(kEnvAnalysisMaxRecentObservationsPerTrack,
                    config.analysis_max_recent_observations_per_track);
    config.analysis_max_trajectory_points_per_track =
        ReadSizeEnv(kEnvAnalysisMaxTrajectoryPointsPerTrack,
                    config.analysis_max_trajectory_points_per_track);
    config.analysis_trajectory_downsample_ms =
        ReadIntEnv(kEnvAnalysisTrajectoryDownsampleMs,
                   config.analysis_trajectory_downsample_ms);
    config.analysis_terminated_track_retention_ms =
        ReadIntEnv(kEnvAnalysisTerminatedTrackRetentionMs,
                   config.analysis_terminated_track_retention_ms);
    config.analysis_cleanup_interval_ms =
        ReadIntEnv(kEnvAnalysisCleanupIntervalMs, config.analysis_cleanup_interval_ms);
    config.analysis_scenario_max_instances_per_channel =
        ReadSizeEnv(kEnvAnalysisScenarioMaxInstancesPerChannel,
                    config.analysis_scenario_max_instances_per_channel);
    config.analysis_scenario_cooldown_ms =
        ReadIntEnv(kEnvAnalysisScenarioCooldownMs, config.analysis_scenario_cooldown_ms);
    config.analysis_scenario_update_interval_ms =
        ReadIntEnv(kEnvAnalysisScenarioUpdateIntervalMs, config.analysis_scenario_update_interval_ms);
    config.analysis_scenario_ended_retention_ms =
        ReadIntEnv(kEnvAnalysisScenarioEndedRetentionMs, config.analysis_scenario_ended_retention_ms);
    config.analysis_scenario_retention_ms = config.analysis_scenario_ended_retention_ms;
    config.analysis_scenario_retention_ms =
        ReadIntEnv(kEnvAnalysisScenarioRetentionMs, config.analysis_scenario_retention_ms);
    config.analysis_scenario_ended_retention_ms = config.analysis_scenario_retention_ms;
    config.analysis_intrusion_dwell_enabled =
        ReadBoolEnv(kEnvAnalysisIntrusionDwellEnabled, config.analysis_intrusion_dwell_enabled);
    config.analysis_intrusion_dwell_candidate_ms =
        ReadIntEnv(kEnvAnalysisIntrusionDwellCandidateMs, config.analysis_intrusion_dwell_candidate_ms);
    config.analysis_intrusion_dwell_dwell_ms =
        ReadIntEnv(kEnvAnalysisIntrusionDwellDwellMs, config.analysis_intrusion_dwell_dwell_ms);
    config.analysis_intrusion_dwell_cooldown_ms =
        ReadIntEnv(kEnvAnalysisIntrusionDwellCooldownMs, config.analysis_intrusion_dwell_cooldown_ms);
    config.analysis_intrusion_dwell_target_classes =
        ReadStringListEnv(kEnvAnalysisIntrusionDwellTargetClasses,
                          config.analysis_intrusion_dwell_target_classes);
    config.analysis_intrusion_dwell_restricted_zone_ids =
        ReadOptionalStringListEnv(kEnvAnalysisIntrusionDwellRestrictedZoneIds,
                                  config.analysis_intrusion_dwell_restricted_zone_ids);
    config.analysis_appearance_enabled =
        ReadBoolEnv(kEnvAnalysisAppearanceEnabled, config.analysis_appearance_enabled);
    config.analysis_appearance_on_track_created =
        ReadBoolEnv(kEnvAnalysisAppearanceOnTrackCreated,
                    config.analysis_appearance_on_track_created);
    config.analysis_appearance_every_n_seconds =
        ReadIntEnv(kEnvAnalysisAppearanceEveryNSeconds,
                   config.analysis_appearance_every_n_seconds);
    config.analysis_appearance_on_track_lost =
        ReadBoolEnv(kEnvAnalysisAppearanceOnTrackLost, config.analysis_appearance_on_track_lost);
    config.analysis_appearance_on_reacquire_candidate =
        ReadBoolEnv(kEnvAnalysisAppearanceOnReacquireCandidate,
                    config.analysis_appearance_on_reacquire_candidate);
    config.analysis_appearance_on_low_confidence_association =
        ReadBoolEnv(kEnvAnalysisAppearanceOnLowConfidenceAssociation,
                    config.analysis_appearance_on_low_confidence_association);
    config.file_root_path = ResolveRuntimePath(config.file_root_path);
    config.default_file_path = ResolveRuntimePath(config.default_file_path);
    config.default_analysis_model_path = ResolveRuntimePath(config.default_analysis_model_path);
    config.default_analysis_labels_path = ResolveRuntimePath(config.default_analysis_labels_path);
    config.analysis_registry_path = ResolveRuntimePath(config.analysis_registry_path);
    config.force_rtsp_tcp = ReadBoolEnv(kEnvForceTcpOnly, config.force_rtsp_tcp);
    config.session_trace = ReadBoolEnv(kEnvSessionTrace, config.session_trace);
    config.webrtc_trace = ReadBoolEnv(kEnvWebRtcTrace, config.webrtc_trace);
    config.webrtc_trace_verbose = ReadBoolEnv(kEnvWebRtcTraceVerbose, config.webrtc_trace_verbose);
    config.webrtc_stun_server = ReadStringEnv(kEnvWebRtcStunServer, config.webrtc_stun_server);
    config.webrtc_turn_server = ReadStringEnv(kEnvWebRtcTurnServer, config.webrtc_turn_server);
    config.webrtc_ice_transport_policy =
        ReadStringEnv(kEnvWebRtcIceTransportPolicy, config.webrtc_ice_transport_policy);
    config.webrtc_requested_ice_transport_policy = config.webrtc_ice_transport_policy;
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
    config.enable_lab_youtube_import =
        ReadBoolEnv(kEnvEnableLabYoutubeImport, config.enable_lab_youtube_import);
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
    if (config.default_analysis_detector.empty()) {
        std::cerr << "[env] default analysis detector cannot be empty, fallback yolo\n";
        config.default_analysis_detector = "yolo";
    }
    ValidatePositiveInt(&config.default_analysis_fps, app_config::kDefaultAnalysisFps, "Analysis fps");
    if (config.default_analysis_max_queue == 0) {
        std::cerr << "[env] analysis max queue cannot be 0, fallback 1\n";
        config.default_analysis_max_queue = 1;
    }
    ValidatePositiveInt(&config.default_analysis_input_width,
                        app_config::kDefaultAnalysisInputWidth,
                        "Analysis input width");
    ValidatePositiveInt(&config.default_analysis_input_height,
                        app_config::kDefaultAnalysisInputHeight,
                        "Analysis input height");
    if (config.default_analysis_confidence < 0.0F || config.default_analysis_confidence > 1.0F) {
        std::cerr << "[env] analysis confidence must be between 0 and 1, fallback "
                  << app_config::kDefaultAnalysisConfidence << "\n";
        config.default_analysis_confidence = app_config::kDefaultAnalysisConfidence;
    }
    if (config.default_analysis_nms < 0.0F || config.default_analysis_nms > 1.0F) {
        std::cerr << "[env] analysis nms must be between 0 and 1, fallback "
                  << app_config::kDefaultAnalysisNms << "\n";
        config.default_analysis_nms = app_config::kDefaultAnalysisNms;
    }
    if (config.default_analysis_preprocess != "stretch") {
        config.default_analysis_preprocess = "letterbox";
    }
    if (config.default_analysis_overlay_wait_ms < 0) {
        std::cerr << "[env] analysis overlay wait cannot be negative, fallback 0\n";
        config.default_analysis_overlay_wait_ms = 0;
    }
    if (config.default_analysis_overlay_sync_tolerance_ms < 0) {
        std::cerr << "[env] analysis overlay tolerance cannot be negative, fallback 0\n";
        config.default_analysis_overlay_sync_tolerance_ms = 0;
    }
    ValidatePositiveInt(&config.default_analysis_overlay_thickness,
                        app_config::kDefaultAnalysisOverlayThickness,
                        "Analysis overlay thickness");
    ValidatePositiveInt(&config.default_analysis_adaptive_min_fps,
                        app_config::kDefaultAnalysisAdaptiveMinFps,
                        "Analysis adaptive min fps");
    if (config.default_analysis_adaptive_min_fps > config.default_analysis_fps) {
        config.default_analysis_adaptive_min_fps = config.default_analysis_fps;
    }
    ValidatePositiveInt(&config.default_analysis_adaptive_cooldown_ms,
                        app_config::kDefaultAnalysisAdaptiveCooldownMs,
                        "Analysis adaptive cooldown ms");
    ValidateEvenPositiveInt(&config.default_analysis_adaptive_input_step,
                            app_config::kDefaultAnalysisAdaptiveInputStep,
                            "Analysis adaptive input step");
    ValidateEvenPositiveInt(&config.default_analysis_adaptive_min_input_width,
                            app_config::kDefaultAnalysisAdaptiveMinInputWidth,
                            "Analysis adaptive min input width");
    ValidateEvenPositiveInt(&config.default_analysis_adaptive_min_input_height,
                            app_config::kDefaultAnalysisAdaptiveMinInputHeight,
                            "Analysis adaptive min input height");
    if (config.default_analysis_adaptive_min_input_width > config.default_analysis_input_width) {
        config.default_analysis_adaptive_min_input_width = config.default_analysis_input_width;
    }
    if (config.default_analysis_adaptive_min_input_height > config.default_analysis_input_height) {
        config.default_analysis_adaptive_min_input_height = config.default_analysis_input_height;
    }
    if (config.default_analysis_adaptive_high_latency_ratio <= 0.0F ||
        config.default_analysis_adaptive_high_latency_ratio > 10.0F) {
        std::cerr << "[env] analysis adaptive high latency ratio is invalid, fallback "
                  << app_config::kDefaultAnalysisAdaptiveHighLatencyRatio << "\n";
        config.default_analysis_adaptive_high_latency_ratio =
            app_config::kDefaultAnalysisAdaptiveHighLatencyRatio;
    }
    if (config.default_analysis_adaptive_low_latency_ratio <= 0.0F ||
        config.default_analysis_adaptive_low_latency_ratio >= config.default_analysis_adaptive_high_latency_ratio) {
        std::cerr << "[env] analysis adaptive low latency ratio is invalid, fallback "
                  << app_config::kDefaultAnalysisAdaptiveLowLatencyRatio << "\n";
        config.default_analysis_adaptive_low_latency_ratio =
            app_config::kDefaultAnalysisAdaptiveLowLatencyRatio;
    }
    ValidatePositiveInt(&config.analysis_event_post_timeout_ms,
                        app_config::kDefaultAnalysisEventPostTimeoutMs,
                        "Analysis event post timeout ms");
    if (config.analysis_event_post_max_queue == 0) {
        std::cerr << "[env] analysis event post max queue cannot be 0, fallback "
                  << app_config::kDefaultAnalysisEventPostMaxQueue << "\n";
        config.analysis_event_post_max_queue = app_config::kDefaultAnalysisEventPostMaxQueue;
    }
    if (config.analysis_event_post_cooldown_ms < 0) {
        std::cerr << "[env] analysis event post cooldown ms cannot be negative, fallback "
                  << app_config::kDefaultAnalysisEventPostCooldownMs << "\n";
        config.analysis_event_post_cooldown_ms = app_config::kDefaultAnalysisEventPostCooldownMs;
    }
    if (config.analysis_max_active_tracks_per_stream == 0) {
        std::cerr << "[env] analysis max active tracks per stream cannot be 0, fallback "
                  << app_config::kDefaultAnalysisMaxActiveTracksPerStream << "\n";
        config.analysis_max_active_tracks_per_stream =
            app_config::kDefaultAnalysisMaxActiveTracksPerStream;
    }
    if (config.analysis_max_recent_observations_per_track == 0) {
        std::cerr << "[env] analysis max recent observations per track cannot be 0, fallback "
                  << app_config::kDefaultAnalysisMaxRecentObservationsPerTrack << "\n";
        config.analysis_max_recent_observations_per_track =
            app_config::kDefaultAnalysisMaxRecentObservationsPerTrack;
    }
    if (config.analysis_max_trajectory_points_per_track == 0) {
        std::cerr << "[env] analysis max trajectory points per track cannot be 0, fallback "
                  << app_config::kDefaultAnalysisMaxTrajectoryPointsPerTrack << "\n";
        config.analysis_max_trajectory_points_per_track =
            app_config::kDefaultAnalysisMaxTrajectoryPointsPerTrack;
    }
    if (config.analysis_trajectory_downsample_ms < 0) {
        std::cerr << "[env] analysis trajectory downsample ms cannot be negative, fallback "
                  << app_config::kDefaultAnalysisTrajectoryDownsampleMs << "\n";
        config.analysis_trajectory_downsample_ms =
            app_config::kDefaultAnalysisTrajectoryDownsampleMs;
    }
    if (config.analysis_terminated_track_retention_ms < 0) {
        std::cerr << "[env] analysis terminated track retention ms cannot be negative, fallback "
                  << app_config::kDefaultAnalysisTerminatedTrackRetentionMs << "\n";
        config.analysis_terminated_track_retention_ms =
            app_config::kDefaultAnalysisTerminatedTrackRetentionMs;
    }
    if (config.analysis_cleanup_interval_ms < 0) {
        std::cerr << "[env] analysis cleanup interval ms cannot be negative, fallback "
                  << app_config::kDefaultAnalysisCleanupIntervalMs << "\n";
        config.analysis_cleanup_interval_ms = app_config::kDefaultAnalysisCleanupIntervalMs;
    }
    if (config.analysis_scenario_max_instances_per_channel == 0) {
        std::cerr << "[env] analysis scenario max instances cannot be 0, fallback "
                  << app_config::kDefaultAnalysisScenarioMaxInstancesPerChannel << "\n";
        config.analysis_scenario_max_instances_per_channel =
            app_config::kDefaultAnalysisScenarioMaxInstancesPerChannel;
    }
    if (config.analysis_scenario_cooldown_ms < 0) {
        std::cerr << "[env] analysis scenario cooldown ms cannot be negative, fallback "
                  << app_config::kDefaultAnalysisScenarioCooldownMs << "\n";
        config.analysis_scenario_cooldown_ms = app_config::kDefaultAnalysisScenarioCooldownMs;
    }
    if (config.analysis_scenario_update_interval_ms < 0) {
        std::cerr << "[env] analysis scenario update interval ms cannot be negative, fallback "
                  << app_config::kDefaultAnalysisScenarioUpdateIntervalMs << "\n";
        config.analysis_scenario_update_interval_ms =
            app_config::kDefaultAnalysisScenarioUpdateIntervalMs;
    }
    if (config.analysis_scenario_ended_retention_ms < 0) {
        std::cerr << "[env] analysis scenario ended retention ms cannot be negative, fallback "
                  << app_config::kDefaultAnalysisScenarioEndedRetentionMs << "\n";
        config.analysis_scenario_ended_retention_ms =
            app_config::kDefaultAnalysisScenarioEndedRetentionMs;
    }
    if (config.analysis_scenario_retention_ms < 0) {
        std::cerr << "[env] analysis scenario retention ms cannot be negative, fallback "
                  << app_config::kDefaultAnalysisScenarioRetentionMs << "\n";
        config.analysis_scenario_retention_ms =
            app_config::kDefaultAnalysisScenarioRetentionMs;
        config.analysis_scenario_ended_retention_ms = config.analysis_scenario_retention_ms;
    }
    if (config.analysis_intrusion_dwell_candidate_ms < 0) {
        std::cerr << "[env] intrusion dwell candidate ms cannot be negative, fallback "
                  << app_config::kDefaultAnalysisIntrusionDwellCandidateMs << "\n";
        config.analysis_intrusion_dwell_candidate_ms =
            app_config::kDefaultAnalysisIntrusionDwellCandidateMs;
    }
    if (config.analysis_intrusion_dwell_dwell_ms < config.analysis_intrusion_dwell_candidate_ms) {
        std::cerr << "[env] intrusion dwell ms cannot be less than candidate ms, using candidate ms\n";
        config.analysis_intrusion_dwell_dwell_ms = config.analysis_intrusion_dwell_candidate_ms;
    }
    if (config.analysis_intrusion_dwell_cooldown_ms < 0) {
        std::cerr << "[env] intrusion dwell cooldown ms cannot be negative, fallback "
                  << app_config::kDefaultAnalysisIntrusionDwellCooldownMs << "\n";
        config.analysis_intrusion_dwell_cooldown_ms =
            app_config::kDefaultAnalysisIntrusionDwellCooldownMs;
    }
    if (config.analysis_appearance_every_n_seconds < 0) {
        std::cerr << "[env] appearance every n seconds cannot be negative, fallback "
                  << app_config::kDefaultAnalysisAppearanceEveryNSeconds << "\n";
        config.analysis_appearance_every_n_seconds =
            app_config::kDefaultAnalysisAppearanceEveryNSeconds;
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
    if (!IsAllowedWebRtcIceTransportPolicy(config.webrtc_ice_transport_policy)) {
        std::cerr << "[env] invalid WebRTC ICE transport policy '"
                  << config.webrtc_ice_transport_policy << "', fallback all\n";
        config.webrtc_ice_transport_policy = "all";
        config.webrtc_requested_ice_transport_policy = "all";
    }
    if (config.webrtc_ice_transport_policy == "relay" && config.webrtc_turn_server.empty()) {
        std::cerr << "[env] WebRTC ICE relay policy requires MEDIA_SERVER_WEBRTC_TURN_SERVER, fallback all\n";
        config.webrtc_ice_transport_policy = "all";
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

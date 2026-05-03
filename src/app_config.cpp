// 파일 요약: 환경변수와 기본 상수를 합쳐 서버 전체 AppConfig를 구성한다.
// 동작 요약: WebRTC ICE, VA, import, source timeout, event POST 같은 런타임 옵션을 해석한다.
// 동작 요약: 잘못된 값은 안전한 기본값으로 보정하고 필요한 경고를 표준 오류에 남긴다.
#include "app_config.h"

#include <algorithm>
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
constexpr const char* kEnvAuthMode = "MEDIA_SERVER_AUTH_MODE";
constexpr const char* kEnvAuthAdminToken = "MEDIA_SERVER_AUTH_ADMIN_TOKEN";
constexpr const char* kEnvAuthOperatorToken = "MEDIA_SERVER_AUTH_OPERATOR_TOKEN";
constexpr const char* kEnvAuthViewerToken = "MEDIA_SERVER_AUTH_VIEWER_TOKEN";
constexpr const char* kEnvAuthIntegratorToken = "MEDIA_SERVER_AUTH_INTEGRATOR_TOKEN";
constexpr const char* kEnvAuthUsersFile = "MEDIA_SERVER_AUTH_USERS_FILE";
constexpr const char* kEnvAuthSessionTtlSeconds = "MEDIA_SERVER_AUTH_SESSION_TTL_SECONDS";
constexpr const char* kEnvAuthSessionIdleTimeoutSeconds =
    "MEDIA_SERVER_AUTH_SESSION_IDLE_TIMEOUT_SECONDS";
constexpr const char* kEnvAuthPasswordPolicy = "MEDIA_SERVER_AUTH_PASSWORD_POLICY";
constexpr const char* kEnvAuthPasswordMinLength = "MEDIA_SERVER_AUTH_PASSWORD_MIN_LENGTH";
constexpr const char* kEnvAuthPasswordHistoryCount = "MEDIA_SERVER_AUTH_PASSWORD_HISTORY_COUNT";
constexpr const char* kEnvAuthPasswordMaxAgeDays = "MEDIA_SERVER_AUTH_PASSWORD_MAX_AGE_DAYS";
constexpr const char* kEnvAuthLoginMaxFailures = "MEDIA_SERVER_AUTH_LOGIN_MAX_FAILURES";
constexpr const char* kEnvAuthLoginLockoutSeconds = "MEDIA_SERVER_AUTH_LOGIN_LOCKOUT_SECONDS";
constexpr const char* kEnvAuthCookieName = "MEDIA_SERVER_AUTH_COOKIE_NAME";
constexpr const char* kEnvAuthCookieSecure = "MEDIA_SERVER_AUTH_COOKIE_SECURE";
constexpr const char* kEnvUiDefaultHome = "MEDIA_SERVER_UI_DEFAULT_HOME";
constexpr const char* kEnvEnableLab = "MEDIA_SERVER_ENABLE_LAB";
constexpr const char* kEnvEnableOps = "MEDIA_SERVER_ENABLE_OPS";
constexpr const char* kEnvEnableClient = "MEDIA_SERVER_ENABLE_CLIENT";
constexpr const char* kEnvFileRoot = "MEDIA_SERVER_FILE_ROOT";
constexpr const char* kEnvDefaultFile = "MEDIA_SERVER_DEFAULT_FILE";
constexpr const char* kEnvWebRtcVaMetadataChannelEnabled =
    "MEDIA_SERVER_WEBRTC_VA_METADATA_CHANNEL_ENABLED";
constexpr const char* kEnvWebRtcVaMetadataChannelLabel =
    "MEDIA_SERVER_WEBRTC_VA_METADATA_CHANNEL_LABEL";
constexpr const char* kEnvWebRtcVaMetadataIntervalMs =
    "MEDIA_SERVER_WEBRTC_VA_METADATA_INTERVAL_MS";
constexpr const char* kEnvWebRtcVaMetadataMaxMessageBytes =
    "MEDIA_SERVER_WEBRTC_VA_METADATA_MAX_MESSAGE_BYTES";
constexpr const char* kEnvWebRtcVaMetadataMaxBufferedBytes =
    "MEDIA_SERVER_WEBRTC_VA_METADATA_MAX_BUFFERED_BYTES";
constexpr const char* kEnvDefaultAnalysisDetector = "MEDIA_SERVER_ANALYSIS_DETECTOR";
constexpr const char* kEnvDefaultAnalysisModel = "MEDIA_SERVER_ANALYSIS_MODEL";
constexpr const char* kEnvDefaultAnalysisLabels = "MEDIA_SERVER_ANALYSIS_LABELS";
constexpr const char* kEnvDefaultAnalysisFps = "MEDIA_SERVER_ANALYSIS_FPS";
constexpr const char* kEnvDefaultAnalysisMaxQueue = "MEDIA_SERVER_ANALYSIS_MAX_QUEUE";
constexpr const char* kEnvDefaultAnalysisFrameSampleInterval =
    "MEDIA_SERVER_ANALYSIS_FRAME_SAMPLE_INTERVAL";
constexpr const char* kEnvDefaultAnalysisMaxFrameAgeMs =
    "MEDIA_SERVER_ANALYSIS_MAX_FRAME_AGE_MS";
constexpr const char* kEnvDefaultAnalysisInputWidth = "MEDIA_SERVER_ANALYSIS_INPUT_WIDTH";
constexpr const char* kEnvDefaultAnalysisInputHeight = "MEDIA_SERVER_ANALYSIS_INPUT_HEIGHT";
constexpr const char* kEnvDefaultAnalysisConfidence = "MEDIA_SERVER_ANALYSIS_CONFIDENCE";
constexpr const char* kEnvDefaultAnalysisNms = "MEDIA_SERVER_ANALYSIS_NMS";
constexpr const char* kEnvDefaultAnalysisPreprocess = "MEDIA_SERVER_ANALYSIS_PREPROCESS";
constexpr const char* kEnvDefaultAnalysisTracking = "MEDIA_SERVER_ANALYSIS_TRACKING";
constexpr const char* kEnvDefaultAnalysisTrackingClasses = "MEDIA_SERVER_ANALYSIS_TRACKING_CLASSES";
constexpr const char* kEnvAnalysisTrackingLostBufferFrames =
    "MEDIA_SERVER_ANALYSIS_TRACKING_LOST_BUFFER_FRAMES";
constexpr const char* kEnvAnalysisTrackingIouWeight = "MEDIA_SERVER_ANALYSIS_TRACKING_IOU_WEIGHT";
constexpr const char* kEnvAnalysisTrackingDistanceWeight =
    "MEDIA_SERVER_ANALYSIS_TRACKING_DISTANCE_WEIGHT";
constexpr const char* kEnvAnalysisTrackingDirectionWeight =
    "MEDIA_SERVER_ANALYSIS_TRACKING_DIRECTION_WEIGHT";
constexpr const char* kEnvAnalysisTrackingClassWeight = "MEDIA_SERVER_ANALYSIS_TRACKING_CLASS_WEIGHT";
constexpr const char* kEnvAnalysisTrackingMinAssociationScore =
    "MEDIA_SERVER_ANALYSIS_TRACKING_MIN_ASSOCIATION_SCORE";
constexpr const char* kEnvAnalysisTrackingSmoothingAlpha =
    "MEDIA_SERVER_ANALYSIS_TRACKING_SMOOTHING_ALPHA";
constexpr const char* kEnvAnalysisTrackingCloseObjectGuardMode =
    "MEDIA_SERVER_ANALYSIS_TRACKING_CLOSE_OBJECT_GUARD_MODE";
constexpr const char* kEnvAnalysisTrackingCloseObjectDistanceRatio =
    "MEDIA_SERVER_ANALYSIS_TRACKING_CLOSE_OBJECT_DISTANCE_RATIO";
constexpr const char* kEnvAnalysisTrackingCloseObjectOverlapThreshold =
    "MEDIA_SERVER_ANALYSIS_TRACKING_CLOSE_OBJECT_OVERLAP_THRESHOLD";
constexpr const char* kEnvAnalysisTrackingCloseObjectLowMarginThreshold =
    "MEDIA_SERVER_ANALYSIS_TRACKING_CLOSE_OBJECT_LOW_MARGIN_THRESHOLD";
constexpr const char* kEnvAnalysisTrackingCenterJumpPenalty =
    "MEDIA_SERVER_ANALYSIS_TRACKING_CENTER_JUMP_PENALTY";
constexpr const char* kEnvAnalysisTrackingCloseObjectMinScoreBoost =
    "MEDIA_SERVER_ANALYSIS_TRACKING_CLOSE_OBJECT_MIN_SCORE_BOOST";
constexpr const char* kEnvAnalysisTrackingCloseObjectMaxDiagnostics =
    "MEDIA_SERVER_ANALYSIS_TRACKING_CLOSE_OBJECT_MAX_DIAGNOSTICS";
constexpr const char* kEnvDefaultAnalysisOverlayWaitMs = "MEDIA_SERVER_ANALYSIS_OVERLAY_WAIT_MS";
constexpr const char* kEnvDefaultAnalysisOverlaySyncToleranceMs =
    "MEDIA_SERVER_ANALYSIS_OVERLAY_SYNC_TOLERANCE_MS";
constexpr const char* kEnvDefaultAnalysisOverlayThickness = "MEDIA_SERVER_ANALYSIS_OVERLAY_THICKNESS";
constexpr const char* kEnvDefaultAnalysisDebugOverlay = "MEDIA_SERVER_ANALYSIS_DEBUG_OVERLAY";
constexpr const char* kEnvDefaultAnalysisDebugGroundPoint =
    "MEDIA_SERVER_ANALYSIS_DEBUG_GROUND_POINT";
constexpr const char* kEnvAnalysisMetricsLogIntervalMs = "MEDIA_SERVER_ANALYSIS_METRICS_LOG_INTERVAL_MS";
constexpr const char* kEnvAnalysisHomographyEnabled = "MEDIA_SERVER_ANALYSIS_HOMOGRAPHY_ENABLED";
constexpr const char* kEnvAnalysisHomographyMatrix = "MEDIA_SERVER_ANALYSIS_HOMOGRAPHY_MATRIX";
constexpr const char* kEnvAnalysisHomographyStreamId = "MEDIA_SERVER_ANALYSIS_HOMOGRAPHY_STREAM_ID";
constexpr const char* kEnvAnalysisHomographyChannelId = "MEDIA_SERVER_ANALYSIS_HOMOGRAPHY_CHANNEL_ID";
constexpr const char* kEnvAnalysisHomographyUnits = "MEDIA_SERVER_ANALYSIS_HOMOGRAPHY_UNITS";
constexpr const char* kEnvAnalysisGroundPlaneSpeedEnabled =
    "MEDIA_SERVER_ANALYSIS_GROUND_PLANE_SPEED_ENABLED";
constexpr const char* kEnvAnalysisGroundPlaneMovementRadiusEnabled =
    "MEDIA_SERVER_ANALYSIS_GROUND_PLANE_MOVEMENT_RADIUS_ENABLED";
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
constexpr const char* kEnvSourceRegistryPath = "MEDIA_SERVER_SOURCE_REGISTRY";
constexpr const char* kEnvPublishedViewsPath = "MEDIA_SERVER_PUBLISHED_VIEWS";
constexpr const char* kEnvAnalysisMaxActiveProfilesPerSource =
    "MEDIA_SERVER_ANALYSIS_MAX_ACTIVE_PROFILES_PER_SOURCE";
constexpr const char* kEnvAnalysisMaxActiveTapsPerSource =
    "MEDIA_SERVER_ANALYSIS_MAX_ACTIVE_TAPS_PER_SOURCE";
constexpr const char* kEnvAnalysisEventPostEnabled = "MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED";
constexpr const char* kEnvAnalysisEventPostTimeoutMs = "MEDIA_SERVER_ANALYSIS_EVENT_POST_TIMEOUT_MS";
constexpr const char* kEnvAnalysisEventPostMaxQueue = "MEDIA_SERVER_ANALYSIS_EVENT_POST_MAX_QUEUE";
constexpr const char* kEnvAnalysisEventPostCooldownMs = "MEDIA_SERVER_ANALYSIS_EVENT_POST_COOLDOWN_MS";
constexpr const char* kEnvAnalysisEventStorageEnabled = "MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_ENABLED";
constexpr const char* kEnvAnalysisEventStoragePath = "MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_PATH";
constexpr const char* kEnvAnalysisEventStorageMaxQueue = "MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_MAX_QUEUE";
constexpr const char* kEnvAnalysisEventStorageMaxFileBytes =
    "MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_MAX_FILE_BYTES";
constexpr const char* kEnvAnalysisEventStorageMaxArchives =
    "MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_MAX_ARCHIVES";
constexpr const char* kEnvAnalysisEventStorageMaxTotalBytes =
    "MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_MAX_TOTAL_BYTES";
constexpr const char* kEnvAnalysisEventSnapshotHookEnabled =
    "MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_HOOK_ENABLED";
constexpr const char* kEnvAnalysisEventSnapshotDir = "MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_DIR";
constexpr const char* kEnvAnalysisEventClipHookEnabled = "MEDIA_SERVER_ANALYSIS_EVENT_CLIP_HOOK_ENABLED";
constexpr const char* kEnvAnalysisEventClipDir = "MEDIA_SERVER_ANALYSIS_EVENT_CLIP_DIR";
constexpr const char* kEnvAnalysisEventPreEventMs = "MEDIA_SERVER_ANALYSIS_EVENT_PRE_EVENT_MS";
constexpr const char* kEnvAnalysisEventPostEventMs = "MEDIA_SERVER_ANALYSIS_EVENT_POST_EVENT_MS";
constexpr const char* kEnvAnalysisEventClipBufferMs = "MEDIA_SERVER_ANALYSIS_EVENT_CLIP_BUFFER_MS";
constexpr const char* kEnvAnalysisMaxActiveTracksPerStream =
    "MEDIA_SERVER_ANALYSIS_MAX_ACTIVE_TRACKS_PER_STREAM";
constexpr const char* kEnvAnalysisMaxRecentObservationsPerTrack =
    "MEDIA_SERVER_ANALYSIS_MAX_RECENT_OBSERVATIONS_PER_TRACK";
constexpr const char* kEnvAnalysisMaxTrajectoryPointsPerTrack =
    "MEDIA_SERVER_ANALYSIS_MAX_TRAJECTORY_POINTS_PER_TRACK";
constexpr const char* kEnvAnalysisTrajectoryDownsampleMs =
    "MEDIA_SERVER_ANALYSIS_TRAJECTORY_DOWNSAMPLE_MS";
constexpr const char* kEnvAnalysisLostTrackTimeoutMs =
    "MEDIA_SERVER_ANALYSIS_LOST_TRACK_TIMEOUT_MS";
constexpr const char* kEnvAnalysisTerminatedTrackTimeoutMs =
    "MEDIA_SERVER_ANALYSIS_TERMINATED_TRACK_TIMEOUT_MS";
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
constexpr const char* kEnvAnalysisReEntryEnabled = "MEDIA_SERVER_ANALYSIS_RE_ENTRY_ENABLED";
constexpr const char* kEnvAnalysisReEntryWindowMs = "MEDIA_SERVER_ANALYSIS_RE_ENTRY_WINDOW_MS";
constexpr const char* kEnvAnalysisReEntryCooldownMs = "MEDIA_SERVER_ANALYSIS_RE_ENTRY_COOLDOWN_MS";
constexpr const char* kEnvAnalysisReEntryTargetClasses =
    "MEDIA_SERVER_ANALYSIS_RE_ENTRY_TARGET_CLASSES";
constexpr const char* kEnvAnalysisReEntryTargetZoneIds =
    "MEDIA_SERVER_ANALYSIS_RE_ENTRY_TARGET_ZONE_IDS";
constexpr const char* kEnvAnalysisWrongDirectionEnabled =
    "MEDIA_SERVER_ANALYSIS_WRONG_DIRECTION_ENABLED";
constexpr const char* kEnvAnalysisWrongDirectionCooldownMs =
    "MEDIA_SERVER_ANALYSIS_WRONG_DIRECTION_COOLDOWN_MS";
constexpr const char* kEnvAnalysisWrongDirectionTargetClasses =
    "MEDIA_SERVER_ANALYSIS_WRONG_DIRECTION_TARGET_CLASSES";
constexpr const char* kEnvAnalysisWrongDirectionTargetLineIds =
    "MEDIA_SERVER_ANALYSIS_WRONG_DIRECTION_TARGET_LINE_IDS";
constexpr const char* kEnvAnalysisWrongDirectionAllowedDirections =
    "MEDIA_SERVER_ANALYSIS_WRONG_DIRECTION_ALLOWED_DIRECTIONS";
constexpr const char* kEnvAnalysisIntrusionAfterLineCrossingEnabled =
    "MEDIA_SERVER_ANALYSIS_INTRUSION_AFTER_LINE_CROSSING_ENABLED";
constexpr const char* kEnvAnalysisIntrusionAfterLineCrossingMaxDelayMs =
    "MEDIA_SERVER_ANALYSIS_INTRUSION_AFTER_LINE_CROSSING_MAX_DELAY_MS";
constexpr const char* kEnvAnalysisIntrusionAfterLineCrossingDwellMs =
    "MEDIA_SERVER_ANALYSIS_INTRUSION_AFTER_LINE_CROSSING_DWELL_MS";
constexpr const char* kEnvAnalysisIntrusionAfterLineCrossingCooldownMs =
    "MEDIA_SERVER_ANALYSIS_INTRUSION_AFTER_LINE_CROSSING_COOLDOWN_MS";
constexpr const char* kEnvAnalysisIntrusionAfterLineCrossingTargetClasses =
    "MEDIA_SERVER_ANALYSIS_INTRUSION_AFTER_LINE_CROSSING_TARGET_CLASSES";
constexpr const char* kEnvAnalysisIntrusionAfterLineCrossingTargetLineIds =
    "MEDIA_SERVER_ANALYSIS_INTRUSION_AFTER_LINE_CROSSING_TARGET_LINE_IDS";
constexpr const char* kEnvAnalysisIntrusionAfterLineCrossingTargetZoneIds =
    "MEDIA_SERVER_ANALYSIS_INTRUSION_AFTER_LINE_CROSSING_TARGET_ZONE_IDS";
constexpr const char* kEnvAnalysisLoiteringEnabled =
    "MEDIA_SERVER_ANALYSIS_LOITERING_ENABLED";
constexpr const char* kEnvAnalysisLoiteringMinDwellTimeMs =
    "MEDIA_SERVER_ANALYSIS_LOITERING_MIN_DWELL_TIME_MS";
constexpr const char* kEnvAnalysisLoiteringMaxMovementRadius =
    "MEDIA_SERVER_ANALYSIS_LOITERING_MAX_MOVEMENT_RADIUS";
constexpr const char* kEnvAnalysisLoiteringMinTrajectoryPoints =
    "MEDIA_SERVER_ANALYSIS_LOITERING_MIN_TRAJECTORY_POINTS";
constexpr const char* kEnvAnalysisLoiteringCooldownMs =
    "MEDIA_SERVER_ANALYSIS_LOITERING_COOLDOWN_MS";
constexpr const char* kEnvAnalysisLoiteringTargetClasses =
    "MEDIA_SERVER_ANALYSIS_LOITERING_TARGET_CLASSES";
constexpr const char* kEnvAnalysisLoiteringTargetZoneIds =
    "MEDIA_SERVER_ANALYSIS_LOITERING_TARGET_ZONE_IDS";
constexpr const char* kEnvAnalysisLoiteringUseGroundPlane =
    "MEDIA_SERVER_ANALYSIS_LOITERING_USE_GROUND_PLANE";
constexpr const char* kEnvAnalysisTrackingIssueReportEnabled =
    "MEDIA_SERVER_ANALYSIS_TRACKING_ISSUE_REPORT_ENABLED";
constexpr const char* kEnvAnalysisTrackingIssueLogEnabled =
    "MEDIA_SERVER_ANALYSIS_TRACKING_ISSUE_LOG_ENABLED";
constexpr const char* kEnvAnalysisTrackingIssueMaxEntries =
    "MEDIA_SERVER_ANALYSIS_TRACKING_ISSUE_MAX_ENTRIES";
constexpr const char* kEnvAnalysisTrackingIssueRateLimitMs =
    "MEDIA_SERVER_ANALYSIS_TRACKING_ISSUE_RATE_LIMIT_MS";
constexpr const char* kEnvAnalysisTrackingIssueOverlapRiskThreshold =
    "MEDIA_SERVER_ANALYSIS_TRACKING_ISSUE_OVERLAP_RISK_THRESHOLD";
constexpr const char* kEnvAnalysisTrackingIssueMissedFrameJumpThreshold =
    "MEDIA_SERVER_ANALYSIS_TRACKING_ISSUE_MISSED_FRAME_JUMP_THRESHOLD";
constexpr const char* kEnvAnalysisTrackingIssueDirectionChangeJumpThreshold =
    "MEDIA_SERVER_ANALYSIS_TRACKING_ISSUE_DIRECTION_CHANGE_JUMP_THRESHOLD";
constexpr const char* kEnvAnalysisAppearanceEnabled = "MEDIA_SERVER_ANALYSIS_APPEARANCE_ENABLED";
constexpr const char* kEnvAnalysisAppearanceExtractor = "MEDIA_SERVER_ANALYSIS_APPEARANCE_EXTRACTOR";
constexpr const char* kEnvAnalysisAppearanceModel = "MEDIA_SERVER_ANALYSIS_APPEARANCE_MODEL";
constexpr const char* kEnvAnalysisAppearanceInputWidth =
    "MEDIA_SERVER_ANALYSIS_APPEARANCE_INPUT_WIDTH";
constexpr const char* kEnvAnalysisAppearanceInputHeight =
    "MEDIA_SERVER_ANALYSIS_APPEARANCE_INPUT_HEIGHT";
constexpr const char* kEnvAnalysisAppearanceMaxEmbeddingDim =
    "MEDIA_SERVER_ANALYSIS_APPEARANCE_MAX_EMBEDDING_DIM";
constexpr const char* kEnvAnalysisAppearanceLogEnabled =
    "MEDIA_SERVER_ANALYSIS_APPEARANCE_LOG_ENABLED";
constexpr const char* kEnvAnalysisAppearanceAsyncEnabled =
    "MEDIA_SERVER_ANALYSIS_APPEARANCE_ASYNC_ENABLED";
constexpr const char* kEnvAnalysisAppearanceMaxQueue =
    "MEDIA_SERVER_ANALYSIS_APPEARANCE_MAX_QUEUE";
constexpr const char* kEnvAnalysisAppearanceGlobalMaxQueue =
    "MEDIA_SERVER_ANALYSIS_APPEARANCE_GLOBAL_MAX_QUEUE";
constexpr const char* kEnvAnalysisAppearancePerStreamRateLimitMs =
    "MEDIA_SERVER_ANALYSIS_APPEARANCE_PER_STREAM_RATE_LIMIT_MS";
constexpr const char* kEnvAnalysisAppearanceMaxJobAgeMs =
    "MEDIA_SERVER_ANALYSIS_APPEARANCE_MAX_JOB_AGE_MS";
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
    if (value[0] == '-') {
        std::cerr << "[env] invalid " << name << "='" << value << "', fallback " << fallback << "\n";
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

std::string ToLower(std::string value) {
    std::transform(value.begin(), value.end(), value.begin(), [](unsigned char ch) {
        return static_cast<char>(std::tolower(ch));
    });
    return value;
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

app::AuthMode ReadAuthModeEnv(const char* name, app::AuthMode fallback) {
    const char* value = ReadEnv(name);
    if (value == nullptr) {
        return fallback;
    }
    const std::string parsed = TrimToken(value);
    if (parsed == "auto" || parsed == "AUTO" || parsed == "Auto") {
        return app::AuthMode::Auto;
    }
    if (parsed == "off" || parsed == "OFF" || parsed == "Off") {
        return app::AuthMode::Off;
    }
    if (parsed == "token" || parsed == "TOKEN" || parsed == "Token") {
        return app::AuthMode::Token;
    }
    if (parsed == "session" || parsed == "SESSION" || parsed == "Session") {
        return app::AuthMode::Session;
    }
    std::cerr << "[env] invalid " << name << "='" << value << "', fallback auto\n";
    return fallback;
}

bool IsSafeCookieName(const std::string& value) {
    return !value.empty() &&
           std::all_of(value.begin(), value.end(), [](unsigned char ch) {
               return std::isalnum(ch) != 0 || ch == '_' || ch == '-';
           });
}

bool IsAllowedPasswordPolicy(const std::string& value) {
    return value == "kr-privacy" || value == "strict" || value == "custom";
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
    config.auth_mode = ReadAuthModeEnv(kEnvAuthMode, config.auth_mode);
    config.auth_admin_token = ReadStringEnv(kEnvAuthAdminToken, config.auth_admin_token);
    config.auth_operator_token = ReadStringEnv(kEnvAuthOperatorToken, config.auth_operator_token);
    config.auth_viewer_token = ReadStringEnv(kEnvAuthViewerToken, config.auth_viewer_token);
    config.auth_integrator_token = ReadStringEnv(kEnvAuthIntegratorToken, config.auth_integrator_token);
    config.auth_users_file = ReadStringEnv(kEnvAuthUsersFile, config.auth_users_file);
    config.auth_session_ttl_seconds =
        ReadIntEnv(kEnvAuthSessionTtlSeconds, config.auth_session_ttl_seconds);
    config.auth_session_idle_timeout_seconds =
        ReadIntEnv(kEnvAuthSessionIdleTimeoutSeconds, config.auth_session_idle_timeout_seconds);
    config.auth_password_policy =
        ToLower(ReadStringEnv(kEnvAuthPasswordPolicy, config.auth_password_policy));
    config.auth_password_min_length =
        ReadIntEnv(kEnvAuthPasswordMinLength, config.auth_password_min_length);
    config.auth_password_history_count =
        ReadIntEnv(kEnvAuthPasswordHistoryCount, config.auth_password_history_count);
    config.auth_password_max_age_days =
        ReadIntEnv(kEnvAuthPasswordMaxAgeDays, config.auth_password_max_age_days);
    config.auth_login_max_failures =
        ReadIntEnv(kEnvAuthLoginMaxFailures, config.auth_login_max_failures);
    config.auth_login_lockout_seconds =
        ReadIntEnv(kEnvAuthLoginLockoutSeconds, config.auth_login_lockout_seconds);
    config.auth_cookie_name = ReadStringEnv(kEnvAuthCookieName, config.auth_cookie_name);
    config.auth_cookie_secure = ReadBoolEnv(kEnvAuthCookieSecure, config.auth_cookie_secure);
    config.ui_default_home = ToLower(ReadStringEnv(kEnvUiDefaultHome, config.ui_default_home));
    config.enable_lab = ReadBoolEnv(kEnvEnableLab, config.enable_lab);
    config.enable_ops = ReadBoolEnv(kEnvEnableOps, config.enable_ops);
    config.enable_client = ReadBoolEnv(kEnvEnableClient, config.enable_client);
    config.file_root_path = ReadStringEnv(kEnvFileRoot, config.file_root_path);
    config.default_file_path = ReadStringEnv(kEnvDefaultFile, config.default_file_path);
    config.webrtc_va_metadata_channel_enabled =
        ReadBoolEnv(kEnvWebRtcVaMetadataChannelEnabled, config.webrtc_va_metadata_channel_enabled);
    config.webrtc_va_metadata_channel_label =
        ReadStringEnv(kEnvWebRtcVaMetadataChannelLabel, config.webrtc_va_metadata_channel_label);
    config.webrtc_va_metadata_interval_ms =
        ReadIntEnv(kEnvWebRtcVaMetadataIntervalMs, config.webrtc_va_metadata_interval_ms);
    config.webrtc_va_metadata_max_message_bytes =
        ReadSizeEnv(kEnvWebRtcVaMetadataMaxMessageBytes, config.webrtc_va_metadata_max_message_bytes);
    config.webrtc_va_metadata_max_buffered_bytes =
        ReadSizeEnv(kEnvWebRtcVaMetadataMaxBufferedBytes, config.webrtc_va_metadata_max_buffered_bytes);
    config.default_analysis_detector =
        ReadStringEnv(kEnvDefaultAnalysisDetector, config.default_analysis_detector);
    config.default_analysis_model_path =
        ReadStringEnv(kEnvDefaultAnalysisModel, config.default_analysis_model_path);
    config.default_analysis_labels_path =
        ReadStringEnv(kEnvDefaultAnalysisLabels, config.default_analysis_labels_path);
    config.default_analysis_fps = ReadIntEnv(kEnvDefaultAnalysisFps, config.default_analysis_fps);
    config.default_analysis_max_queue =
        ReadSizeEnv(kEnvDefaultAnalysisMaxQueue, config.default_analysis_max_queue);
    config.default_analysis_frame_sample_interval =
        ReadIntEnv(kEnvDefaultAnalysisFrameSampleInterval,
                   config.default_analysis_frame_sample_interval);
    config.default_analysis_max_frame_age_ms =
        ReadIntEnv(kEnvDefaultAnalysisMaxFrameAgeMs, config.default_analysis_max_frame_age_ms);
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
    config.analysis_tracking_lost_buffer_frames = static_cast<std::uint32_t>(
        std::max(0,
                 ReadIntEnv(kEnvAnalysisTrackingLostBufferFrames,
                            static_cast<int>(config.analysis_tracking_lost_buffer_frames))));
    config.analysis_tracking_iou_weight =
        ReadFloatEnv(kEnvAnalysisTrackingIouWeight, config.analysis_tracking_iou_weight);
    config.analysis_tracking_distance_weight =
        ReadFloatEnv(kEnvAnalysisTrackingDistanceWeight, config.analysis_tracking_distance_weight);
    config.analysis_tracking_direction_weight =
        ReadFloatEnv(kEnvAnalysisTrackingDirectionWeight, config.analysis_tracking_direction_weight);
    config.analysis_tracking_class_weight =
        ReadFloatEnv(kEnvAnalysisTrackingClassWeight, config.analysis_tracking_class_weight);
    config.analysis_tracking_min_association_score =
        ReadFloatEnv(kEnvAnalysisTrackingMinAssociationScore,
                     config.analysis_tracking_min_association_score);
    config.analysis_tracking_smoothing_alpha =
        ReadFloatEnv(kEnvAnalysisTrackingSmoothingAlpha,
                     config.analysis_tracking_smoothing_alpha);
    config.analysis_tracking_close_object_guard_mode =
        ReadStringEnv(kEnvAnalysisTrackingCloseObjectGuardMode,
                      config.analysis_tracking_close_object_guard_mode);
    config.analysis_tracking_close_object_distance_ratio =
        ReadFloatEnv(kEnvAnalysisTrackingCloseObjectDistanceRatio,
                     config.analysis_tracking_close_object_distance_ratio);
    config.analysis_tracking_close_object_overlap_threshold =
        ReadFloatEnv(kEnvAnalysisTrackingCloseObjectOverlapThreshold,
                     config.analysis_tracking_close_object_overlap_threshold);
    config.analysis_tracking_close_object_low_margin_threshold =
        ReadFloatEnv(kEnvAnalysisTrackingCloseObjectLowMarginThreshold,
                     config.analysis_tracking_close_object_low_margin_threshold);
    config.analysis_tracking_center_jump_penalty =
        ReadFloatEnv(kEnvAnalysisTrackingCenterJumpPenalty,
                     config.analysis_tracking_center_jump_penalty);
    config.analysis_tracking_close_object_min_score_boost =
        ReadFloatEnv(kEnvAnalysisTrackingCloseObjectMinScoreBoost,
                     config.analysis_tracking_close_object_min_score_boost);
    config.analysis_tracking_close_object_max_diagnostics =
        ReadSizeEnv(kEnvAnalysisTrackingCloseObjectMaxDiagnostics,
                    config.analysis_tracking_close_object_max_diagnostics);
    config.default_analysis_overlay_wait_ms =
        ReadIntEnv(kEnvDefaultAnalysisOverlayWaitMs, config.default_analysis_overlay_wait_ms);
    config.default_analysis_overlay_sync_tolerance_ms =
        ReadIntEnv(kEnvDefaultAnalysisOverlaySyncToleranceMs, config.default_analysis_overlay_sync_tolerance_ms);
    config.default_analysis_overlay_thickness =
        ReadIntEnv(kEnvDefaultAnalysisOverlayThickness, config.default_analysis_overlay_thickness);
    config.default_analysis_debug_overlay_enabled =
        ReadBoolEnv(kEnvDefaultAnalysisDebugOverlay, config.default_analysis_debug_overlay_enabled);
    config.default_analysis_debug_ground_point_enabled =
        ReadBoolEnv(kEnvDefaultAnalysisDebugGroundPoint,
                    config.default_analysis_debug_ground_point_enabled);
    config.analysis_metrics_log_interval_ms =
        ReadIntEnv(kEnvAnalysisMetricsLogIntervalMs, config.analysis_metrics_log_interval_ms);
    config.analysis_homography_enabled =
        ReadBoolEnv(kEnvAnalysisHomographyEnabled, config.analysis_homography_enabled);
    config.analysis_homography_matrix =
        ReadStringEnv(kEnvAnalysisHomographyMatrix, config.analysis_homography_matrix);
    config.analysis_homography_stream_id =
        ReadStringEnv(kEnvAnalysisHomographyStreamId, config.analysis_homography_stream_id);
    config.analysis_homography_channel_id =
        ReadStringEnv(kEnvAnalysisHomographyChannelId, config.analysis_homography_channel_id);
    config.analysis_homography_units =
        ReadStringEnv(kEnvAnalysisHomographyUnits, config.analysis_homography_units);
    config.analysis_ground_plane_speed_enabled =
        ReadBoolEnv(kEnvAnalysisGroundPlaneSpeedEnabled,
                    config.analysis_ground_plane_speed_enabled);
    config.analysis_ground_plane_movement_radius_enabled =
        ReadBoolEnv(kEnvAnalysisGroundPlaneMovementRadiusEnabled,
                    config.analysis_ground_plane_movement_radius_enabled);
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
    config.source_registry_path = ReadStringEnv(kEnvSourceRegistryPath, config.source_registry_path);
    config.published_views_path = ReadStringEnv(kEnvPublishedViewsPath, config.published_views_path);
    config.analysis_max_active_profiles_per_source =
        ReadSizeEnv(kEnvAnalysisMaxActiveProfilesPerSource,
                    config.analysis_max_active_profiles_per_source);
    config.analysis_max_active_taps_per_source =
        ReadSizeEnv(kEnvAnalysisMaxActiveTapsPerSource,
                    config.analysis_max_active_taps_per_source);
    config.analysis_event_post_enabled =
        ReadBoolEnv(kEnvAnalysisEventPostEnabled, config.analysis_event_post_enabled);
    config.analysis_event_post_timeout_ms =
        ReadIntEnv(kEnvAnalysisEventPostTimeoutMs, config.analysis_event_post_timeout_ms);
    config.analysis_event_post_max_queue =
        ReadSizeEnv(kEnvAnalysisEventPostMaxQueue, config.analysis_event_post_max_queue);
    config.analysis_event_post_cooldown_ms =
        ReadIntEnv(kEnvAnalysisEventPostCooldownMs, config.analysis_event_post_cooldown_ms);
    config.analysis_event_storage_enabled =
        ReadBoolEnv(kEnvAnalysisEventStorageEnabled, config.analysis_event_storage_enabled);
    config.analysis_event_storage_path =
        ReadStringEnv(kEnvAnalysisEventStoragePath, config.analysis_event_storage_path);
    config.analysis_event_storage_max_queue =
        ReadSizeEnv(kEnvAnalysisEventStorageMaxQueue, config.analysis_event_storage_max_queue);
    config.analysis_event_storage_max_file_bytes =
        ReadSizeEnv(kEnvAnalysisEventStorageMaxFileBytes,
                    config.analysis_event_storage_max_file_bytes);
    config.analysis_event_storage_max_archives =
        ReadSizeEnv(kEnvAnalysisEventStorageMaxArchives,
                    config.analysis_event_storage_max_archives);
    config.analysis_event_storage_max_total_bytes =
        ReadSizeEnv(kEnvAnalysisEventStorageMaxTotalBytes,
                    config.analysis_event_storage_max_total_bytes);
    config.analysis_event_snapshot_hook_enabled =
        ReadBoolEnv(kEnvAnalysisEventSnapshotHookEnabled, config.analysis_event_snapshot_hook_enabled);
    config.analysis_event_snapshot_dir =
        ReadStringEnv(kEnvAnalysisEventSnapshotDir, config.analysis_event_snapshot_dir);
    config.analysis_event_clip_hook_enabled =
        ReadBoolEnv(kEnvAnalysisEventClipHookEnabled, config.analysis_event_clip_hook_enabled);
    config.analysis_event_clip_dir =
        ReadStringEnv(kEnvAnalysisEventClipDir, config.analysis_event_clip_dir);
    config.analysis_event_pre_event_ms =
        ReadIntEnv(kEnvAnalysisEventPreEventMs, config.analysis_event_pre_event_ms);
    config.analysis_event_post_event_ms =
        ReadIntEnv(kEnvAnalysisEventPostEventMs, config.analysis_event_post_event_ms);
    config.analysis_event_clip_buffer_ms =
        ReadIntEnv(kEnvAnalysisEventClipBufferMs, config.analysis_event_clip_buffer_ms);
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
    config.analysis_lost_track_timeout_ms =
        ReadIntEnv(kEnvAnalysisLostTrackTimeoutMs, config.analysis_lost_track_timeout_ms);
    config.analysis_terminated_track_timeout_ms =
        ReadIntEnv(kEnvAnalysisTerminatedTrackTimeoutMs,
                   config.analysis_terminated_track_timeout_ms);
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
    config.analysis_re_entry_enabled =
        ReadBoolEnv(kEnvAnalysisReEntryEnabled, config.analysis_re_entry_enabled);
    config.analysis_re_entry_window_ms =
        ReadIntEnv(kEnvAnalysisReEntryWindowMs, config.analysis_re_entry_window_ms);
    config.analysis_re_entry_cooldown_ms =
        ReadIntEnv(kEnvAnalysisReEntryCooldownMs, config.analysis_re_entry_cooldown_ms);
    config.analysis_re_entry_target_classes =
        ReadStringListEnv(kEnvAnalysisReEntryTargetClasses,
                          config.analysis_re_entry_target_classes);
    config.analysis_re_entry_target_zone_ids =
        ReadOptionalStringListEnv(kEnvAnalysisReEntryTargetZoneIds,
                                  config.analysis_re_entry_target_zone_ids);
    config.analysis_wrong_direction_enabled =
        ReadBoolEnv(kEnvAnalysisWrongDirectionEnabled, config.analysis_wrong_direction_enabled);
    config.analysis_wrong_direction_cooldown_ms =
        ReadIntEnv(kEnvAnalysisWrongDirectionCooldownMs,
                   config.analysis_wrong_direction_cooldown_ms);
    config.analysis_wrong_direction_target_classes =
        ReadStringListEnv(kEnvAnalysisWrongDirectionTargetClasses,
                          config.analysis_wrong_direction_target_classes);
    config.analysis_wrong_direction_target_line_ids =
        ReadOptionalStringListEnv(kEnvAnalysisWrongDirectionTargetLineIds,
                                  config.analysis_wrong_direction_target_line_ids);
    config.analysis_wrong_direction_allowed_directions =
        ReadOptionalStringListEnv(kEnvAnalysisWrongDirectionAllowedDirections,
                                  config.analysis_wrong_direction_allowed_directions);
    config.analysis_intrusion_after_line_crossing_enabled =
        ReadBoolEnv(kEnvAnalysisIntrusionAfterLineCrossingEnabled,
                    config.analysis_intrusion_after_line_crossing_enabled);
    config.analysis_intrusion_after_line_crossing_max_delay_ms =
        ReadIntEnv(kEnvAnalysisIntrusionAfterLineCrossingMaxDelayMs,
                   config.analysis_intrusion_after_line_crossing_max_delay_ms);
    config.analysis_intrusion_after_line_crossing_dwell_ms =
        ReadIntEnv(kEnvAnalysisIntrusionAfterLineCrossingDwellMs,
                   config.analysis_intrusion_after_line_crossing_dwell_ms);
    config.analysis_intrusion_after_line_crossing_cooldown_ms =
        ReadIntEnv(kEnvAnalysisIntrusionAfterLineCrossingCooldownMs,
                   config.analysis_intrusion_after_line_crossing_cooldown_ms);
    config.analysis_intrusion_after_line_crossing_target_classes =
        ReadStringListEnv(kEnvAnalysisIntrusionAfterLineCrossingTargetClasses,
                          config.analysis_intrusion_after_line_crossing_target_classes);
    config.analysis_intrusion_after_line_crossing_target_line_ids =
        ReadOptionalStringListEnv(kEnvAnalysisIntrusionAfterLineCrossingTargetLineIds,
                                  config.analysis_intrusion_after_line_crossing_target_line_ids);
    config.analysis_intrusion_after_line_crossing_target_zone_ids =
        ReadOptionalStringListEnv(kEnvAnalysisIntrusionAfterLineCrossingTargetZoneIds,
                                  config.analysis_intrusion_after_line_crossing_target_zone_ids);
    config.analysis_loitering_enabled =
        ReadBoolEnv(kEnvAnalysisLoiteringEnabled, config.analysis_loitering_enabled);
    config.analysis_loitering_min_dwell_time_ms =
        ReadIntEnv(kEnvAnalysisLoiteringMinDwellTimeMs,
                   config.analysis_loitering_min_dwell_time_ms);
    config.analysis_loitering_max_movement_radius =
        ReadFloatEnv(kEnvAnalysisLoiteringMaxMovementRadius,
                     config.analysis_loitering_max_movement_radius);
    config.analysis_loitering_min_trajectory_points =
        ReadSizeEnv(kEnvAnalysisLoiteringMinTrajectoryPoints,
                    config.analysis_loitering_min_trajectory_points);
    config.analysis_loitering_cooldown_ms =
        ReadIntEnv(kEnvAnalysisLoiteringCooldownMs, config.analysis_loitering_cooldown_ms);
    config.analysis_loitering_target_classes =
        ReadStringListEnv(kEnvAnalysisLoiteringTargetClasses,
                          config.analysis_loitering_target_classes);
    config.analysis_loitering_target_zone_ids =
        ReadOptionalStringListEnv(kEnvAnalysisLoiteringTargetZoneIds,
                                  config.analysis_loitering_target_zone_ids);
    config.analysis_loitering_use_ground_plane =
        ReadBoolEnv(kEnvAnalysisLoiteringUseGroundPlane,
                    config.analysis_loitering_use_ground_plane);
    config.analysis_tracking_issue_report_enabled =
        ReadBoolEnv(kEnvAnalysisTrackingIssueReportEnabled,
                    config.analysis_tracking_issue_report_enabled);
    config.analysis_tracking_issue_log_enabled =
        ReadBoolEnv(kEnvAnalysisTrackingIssueLogEnabled,
                    config.analysis_tracking_issue_log_enabled);
    config.analysis_tracking_issue_max_entries =
        ReadSizeEnv(kEnvAnalysisTrackingIssueMaxEntries,
                    config.analysis_tracking_issue_max_entries);
    config.analysis_tracking_issue_rate_limit_ms =
        ReadIntEnv(kEnvAnalysisTrackingIssueRateLimitMs,
                   config.analysis_tracking_issue_rate_limit_ms);
    config.analysis_tracking_issue_overlap_risk_threshold =
        ReadFloatEnv(kEnvAnalysisTrackingIssueOverlapRiskThreshold,
                     config.analysis_tracking_issue_overlap_risk_threshold);
    config.analysis_tracking_issue_missed_frame_jump_threshold =
        static_cast<std::uint32_t>(std::max(
            0,
            ReadIntEnv(kEnvAnalysisTrackingIssueMissedFrameJumpThreshold,
                       static_cast<int>(config.analysis_tracking_issue_missed_frame_jump_threshold))));
    config.analysis_tracking_issue_direction_change_jump_threshold =
        static_cast<std::uint32_t>(std::max(
            0,
            ReadIntEnv(kEnvAnalysisTrackingIssueDirectionChangeJumpThreshold,
                       static_cast<int>(config.analysis_tracking_issue_direction_change_jump_threshold))));
    config.analysis_appearance_enabled =
        ReadBoolEnv(kEnvAnalysisAppearanceEnabled, config.analysis_appearance_enabled);
    config.analysis_appearance_extractor =
        ReadStringEnv(kEnvAnalysisAppearanceExtractor, config.analysis_appearance_extractor);
    config.analysis_appearance_model_path =
        ReadStringEnv(kEnvAnalysisAppearanceModel, config.analysis_appearance_model_path);
    config.analysis_appearance_input_width =
        ReadIntEnv(kEnvAnalysisAppearanceInputWidth, config.analysis_appearance_input_width);
    config.analysis_appearance_input_height =
        ReadIntEnv(kEnvAnalysisAppearanceInputHeight, config.analysis_appearance_input_height);
    config.analysis_appearance_max_embedding_dim =
        ReadSizeEnv(kEnvAnalysisAppearanceMaxEmbeddingDim,
                    config.analysis_appearance_max_embedding_dim);
    config.analysis_appearance_log_enabled =
        ReadBoolEnv(kEnvAnalysisAppearanceLogEnabled, config.analysis_appearance_log_enabled);
    config.analysis_appearance_async_enabled =
        ReadBoolEnv(kEnvAnalysisAppearanceAsyncEnabled, config.analysis_appearance_async_enabled);
    config.analysis_appearance_max_queue =
        ReadSizeEnv(kEnvAnalysisAppearanceMaxQueue, config.analysis_appearance_max_queue);
    config.analysis_appearance_global_max_queue =
        ReadSizeEnv(kEnvAnalysisAppearanceGlobalMaxQueue,
                    config.analysis_appearance_global_max_queue);
    config.analysis_appearance_per_stream_rate_limit_ms =
        ReadIntEnv(kEnvAnalysisAppearancePerStreamRateLimitMs,
                   config.analysis_appearance_per_stream_rate_limit_ms);
    config.analysis_appearance_max_job_age_ms =
        ReadIntEnv(kEnvAnalysisAppearanceMaxJobAgeMs,
                   config.analysis_appearance_max_job_age_ms);
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
    config.source_registry_path = ResolveRuntimePath(config.source_registry_path);
    config.published_views_path = ResolveRuntimePath(config.published_views_path);
    config.analysis_appearance_model_path = ResolveRuntimePath(config.analysis_appearance_model_path);
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
    if (config.webrtc_va_metadata_channel_label.empty()) {
        std::cerr << "[env] WebRTC VA metadata channel label cannot be empty, fallback "
                  << app_config::kDefaultWebRtcVaMetadataChannelLabel << "\n";
        config.webrtc_va_metadata_channel_label = app_config::kDefaultWebRtcVaMetadataChannelLabel;
    }
    if (config.webrtc_va_metadata_interval_ms < 0) {
        std::cerr << "[env] WebRTC VA metadata interval cannot be negative, fallback "
                  << app_config::kDefaultWebRtcVaMetadataIntervalMs << "\n";
        config.webrtc_va_metadata_interval_ms = app_config::kDefaultWebRtcVaMetadataIntervalMs;
    }
    if (config.webrtc_va_metadata_max_message_bytes == 0) {
        std::cerr << "[env] WebRTC VA metadata max message bytes cannot be 0, fallback "
                  << app_config::kDefaultWebRtcVaMetadataMaxMessageBytes << "\n";
        config.webrtc_va_metadata_max_message_bytes =
            app_config::kDefaultWebRtcVaMetadataMaxMessageBytes;
    }
    if (config.webrtc_va_metadata_max_buffered_bytes == 0) {
        std::cerr << "[env] WebRTC VA metadata max buffered bytes cannot be 0, fallback "
                  << app_config::kDefaultWebRtcVaMetadataMaxBufferedBytes << "\n";
        config.webrtc_va_metadata_max_buffered_bytes =
            app_config::kDefaultWebRtcVaMetadataMaxBufferedBytes;
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
    ValidatePositiveInt(&config.default_analysis_frame_sample_interval,
                        app_config::kDefaultAnalysisFrameSampleInterval,
                        "Analysis frame sample interval");
    config.default_analysis_frame_sample_interval =
        std::min(300, config.default_analysis_frame_sample_interval);
    if (config.default_analysis_max_frame_age_ms < 0) {
        std::cerr << "[env] analysis max frame age ms cannot be negative, fallback "
                  << app_config::kDefaultAnalysisMaxFrameAgeMs << "\n";
        config.default_analysis_max_frame_age_ms = app_config::kDefaultAnalysisMaxFrameAgeMs;
    }
    config.default_analysis_max_frame_age_ms =
        std::min(600000, config.default_analysis_max_frame_age_ms);
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
    if (config.analysis_tracking_lost_buffer_frames == 0) {
        std::cerr << "[env] analysis tracking lost buffer frames cannot be 0, fallback "
                  << app_config::kDefaultAnalysisTrackingLostBufferFrames << "\n";
        config.analysis_tracking_lost_buffer_frames =
            static_cast<std::uint32_t>(app_config::kDefaultAnalysisTrackingLostBufferFrames);
    }
    if (config.analysis_tracking_iou_weight < 0.0F) {
        std::cerr << "[env] analysis tracking IoU weight cannot be negative, fallback "
                  << app_config::kDefaultAnalysisTrackingIouWeight << "\n";
        config.analysis_tracking_iou_weight = app_config::kDefaultAnalysisTrackingIouWeight;
    }
    if (config.analysis_tracking_distance_weight < 0.0F) {
        std::cerr << "[env] analysis tracking distance weight cannot be negative, fallback "
                  << app_config::kDefaultAnalysisTrackingDistanceWeight << "\n";
        config.analysis_tracking_distance_weight =
            app_config::kDefaultAnalysisTrackingDistanceWeight;
    }
    if (config.analysis_tracking_direction_weight < 0.0F) {
        std::cerr << "[env] analysis tracking direction weight cannot be negative, fallback "
                  << app_config::kDefaultAnalysisTrackingDirectionWeight << "\n";
        config.analysis_tracking_direction_weight =
            app_config::kDefaultAnalysisTrackingDirectionWeight;
    }
    if (config.analysis_tracking_class_weight < 0.0F) {
        std::cerr << "[env] analysis tracking class weight cannot be negative, fallback "
                  << app_config::kDefaultAnalysisTrackingClassWeight << "\n";
        config.analysis_tracking_class_weight = app_config::kDefaultAnalysisTrackingClassWeight;
    }
    if (config.analysis_tracking_iou_weight + config.analysis_tracking_distance_weight +
            config.analysis_tracking_direction_weight + config.analysis_tracking_class_weight <=
        0.0F) {
        std::cerr << "[env] analysis tracking association weights cannot all be zero, fallback defaults\n";
        config.analysis_tracking_iou_weight = app_config::kDefaultAnalysisTrackingIouWeight;
        config.analysis_tracking_distance_weight =
            app_config::kDefaultAnalysisTrackingDistanceWeight;
        config.analysis_tracking_direction_weight =
            app_config::kDefaultAnalysisTrackingDirectionWeight;
        config.analysis_tracking_class_weight = app_config::kDefaultAnalysisTrackingClassWeight;
    }
    if (config.analysis_tracking_min_association_score < 0.0F ||
        config.analysis_tracking_min_association_score > 1.0F) {
        std::cerr << "[env] analysis tracking min association score must be between 0 and 1, fallback "
                  << app_config::kDefaultAnalysisTrackingMinAssociationScore << "\n";
        config.analysis_tracking_min_association_score =
            app_config::kDefaultAnalysisTrackingMinAssociationScore;
    }
    if (config.analysis_tracking_smoothing_alpha < 0.0F ||
        config.analysis_tracking_smoothing_alpha > 0.95F) {
        std::cerr << "[env] analysis tracking smoothing alpha must be between 0 and 0.95, fallback "
                  << app_config::kDefaultAnalysisTrackingSmoothingAlpha << "\n";
        config.analysis_tracking_smoothing_alpha =
            app_config::kDefaultAnalysisTrackingSmoothingAlpha;
    }
    std::transform(config.analysis_tracking_close_object_guard_mode.begin(),
                   config.analysis_tracking_close_object_guard_mode.end(),
                   config.analysis_tracking_close_object_guard_mode.begin(),
                   [](unsigned char ch) { return static_cast<char>(std::tolower(ch)); });
    if (config.analysis_tracking_close_object_guard_mode != "off" &&
        config.analysis_tracking_close_object_guard_mode != "diagnostic" &&
        config.analysis_tracking_close_object_guard_mode != "enforce") {
        std::cerr << "[env] analysis tracking close-object guard mode must be off, diagnostic, or enforce, fallback "
                  << app_config::kDefaultAnalysisTrackingCloseObjectGuardMode << "\n";
        config.analysis_tracking_close_object_guard_mode =
            app_config::kDefaultAnalysisTrackingCloseObjectGuardMode;
    }
    if (config.analysis_tracking_close_object_distance_ratio <= 0.0F ||
        config.analysis_tracking_close_object_distance_ratio > 4.0F) {
        std::cerr << "[env] analysis tracking close-object distance ratio must be within (0,4], fallback "
                  << app_config::kDefaultAnalysisTrackingCloseObjectDistanceRatio << "\n";
        config.analysis_tracking_close_object_distance_ratio =
            app_config::kDefaultAnalysisTrackingCloseObjectDistanceRatio;
    }
    if (config.analysis_tracking_close_object_overlap_threshold < 0.0F ||
        config.analysis_tracking_close_object_overlap_threshold > 1.0F) {
        std::cerr << "[env] analysis tracking close-object overlap threshold must be between 0 and 1, fallback "
                  << app_config::kDefaultAnalysisTrackingCloseObjectOverlapThreshold << "\n";
        config.analysis_tracking_close_object_overlap_threshold =
            app_config::kDefaultAnalysisTrackingCloseObjectOverlapThreshold;
    }
    if (config.analysis_tracking_close_object_low_margin_threshold <= 0.0F ||
        config.analysis_tracking_close_object_low_margin_threshold > 1.0F) {
        std::cerr << "[env] analysis tracking close-object low margin threshold must be within (0,1], fallback "
                  << app_config::kDefaultAnalysisTrackingCloseObjectLowMarginThreshold << "\n";
        config.analysis_tracking_close_object_low_margin_threshold =
            app_config::kDefaultAnalysisTrackingCloseObjectLowMarginThreshold;
    }
    if (config.analysis_tracking_center_jump_penalty < 0.0F ||
        config.analysis_tracking_center_jump_penalty > 1.0F) {
        std::cerr << "[env] analysis tracking center jump penalty must be between 0 and 1, fallback "
                  << app_config::kDefaultAnalysisTrackingCenterJumpPenalty << "\n";
        config.analysis_tracking_center_jump_penalty =
            app_config::kDefaultAnalysisTrackingCenterJumpPenalty;
    }
    if (config.analysis_tracking_close_object_min_score_boost < 0.0F ||
        config.analysis_tracking_close_object_min_score_boost > 1.0F) {
        std::cerr << "[env] analysis tracking close-object min score boost must be between 0 and 1, fallback "
                  << app_config::kDefaultAnalysisTrackingCloseObjectMinScoreBoost << "\n";
        config.analysis_tracking_close_object_min_score_boost =
            app_config::kDefaultAnalysisTrackingCloseObjectMinScoreBoost;
    }
    if (config.analysis_tracking_close_object_max_diagnostics == 0 ||
        config.analysis_tracking_close_object_max_diagnostics > 256) {
        std::cerr << "[env] analysis tracking close-object max diagnostics must be 1..256, fallback "
                  << app_config::kDefaultAnalysisTrackingCloseObjectMaxDiagnostics << "\n";
        config.analysis_tracking_close_object_max_diagnostics =
            app_config::kDefaultAnalysisTrackingCloseObjectMaxDiagnostics;
    }
    if (config.default_analysis_overlay_wait_ms < 0) {
        std::cerr << "[env] analysis overlay wait cannot be negative, fallback 0\n";
        config.default_analysis_overlay_wait_ms = 0;
    }
    if (config.default_analysis_overlay_sync_tolerance_ms < 0) {
        std::cerr << "[env] analysis overlay tolerance cannot be negative, fallback 0\n";
        config.default_analysis_overlay_sync_tolerance_ms = 0;
    }
    if (config.analysis_homography_enabled && config.analysis_homography_matrix.empty()) {
        std::cerr << "[env] analysis homography enabled but matrix is empty; ground-plane mapping disabled\n";
        config.analysis_homography_enabled = false;
    }
    if (config.analysis_homography_units.empty()) {
        std::cerr << "[env] analysis homography units cannot be empty, fallback "
                  << app_config::kDefaultAnalysisHomographyUnits << "\n";
        config.analysis_homography_units = app_config::kDefaultAnalysisHomographyUnits;
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
    if (config.analysis_event_storage_path.empty()) {
        std::cerr << "[env] analysis event storage path cannot be empty, fallback "
                  << app_config::kDefaultAnalysisEventStoragePath << "\n";
        config.analysis_event_storage_path = app_config::kDefaultAnalysisEventStoragePath;
    }
    if (config.analysis_event_storage_max_queue == 0) {
        std::cerr << "[env] analysis event storage max queue cannot be 0, fallback "
                  << app_config::kDefaultAnalysisEventStorageMaxQueue << "\n";
        config.analysis_event_storage_max_queue = app_config::kDefaultAnalysisEventStorageMaxQueue;
    }
    if (config.analysis_event_snapshot_dir.empty()) {
        std::cerr << "[env] analysis event snapshot dir cannot be empty, fallback "
                  << app_config::kDefaultAnalysisEventSnapshotDir << "\n";
        config.analysis_event_snapshot_dir = app_config::kDefaultAnalysisEventSnapshotDir;
    }
    if (config.analysis_event_clip_dir.empty()) {
        std::cerr << "[env] analysis event clip dir cannot be empty, fallback "
                  << app_config::kDefaultAnalysisEventClipDir << "\n";
        config.analysis_event_clip_dir = app_config::kDefaultAnalysisEventClipDir;
    }
    if (config.analysis_event_pre_event_ms < 0) {
        std::cerr << "[env] analysis event pre event ms cannot be negative, fallback "
                  << app_config::kDefaultAnalysisEventPreEventMs << "\n";
        config.analysis_event_pre_event_ms = app_config::kDefaultAnalysisEventPreEventMs;
    }
    if (config.analysis_event_post_event_ms < 0) {
        std::cerr << "[env] analysis event post event ms cannot be negative, fallback "
                  << app_config::kDefaultAnalysisEventPostEventMs << "\n";
        config.analysis_event_post_event_ms = app_config::kDefaultAnalysisEventPostEventMs;
    }
    if (config.analysis_event_clip_buffer_ms < 0) {
        std::cerr << "[env] analysis event clip buffer ms cannot be negative, fallback "
                  << app_config::kDefaultAnalysisEventClipBufferMs << "\n";
        config.analysis_event_clip_buffer_ms = app_config::kDefaultAnalysisEventClipBufferMs;
    }
    if (config.analysis_event_pre_event_ms > config.analysis_event_clip_buffer_ms) {
        std::cerr << "[env] analysis event pre event ms exceeds clip buffer, clamping to buffer\n";
        config.analysis_event_pre_event_ms = config.analysis_event_clip_buffer_ms;
    }
    if (config.analysis_event_post_event_ms > config.analysis_event_clip_buffer_ms) {
        std::cerr << "[env] analysis event post event ms exceeds clip buffer, clamping to buffer\n";
        config.analysis_event_post_event_ms = config.analysis_event_clip_buffer_ms;
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
    if (config.analysis_lost_track_timeout_ms < 0) {
        std::cerr << "[env] analysis lost track timeout ms cannot be negative, fallback "
                  << app_config::kDefaultAnalysisLostTrackTimeoutMs << "\n";
        config.analysis_lost_track_timeout_ms = app_config::kDefaultAnalysisLostTrackTimeoutMs;
    }
    if (config.analysis_terminated_track_timeout_ms < config.analysis_lost_track_timeout_ms) {
        std::cerr << "[env] analysis terminated track timeout ms cannot be less than lost timeout, "
                     "using lost timeout\n";
        config.analysis_terminated_track_timeout_ms = config.analysis_lost_track_timeout_ms;
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
    if (config.analysis_metrics_log_interval_ms < 0) {
        std::cerr << "[env] analysis metrics log interval ms cannot be negative, fallback "
                  << app_config::kDefaultAnalysisMetricsLogIntervalMs << "\n";
        config.analysis_metrics_log_interval_ms = app_config::kDefaultAnalysisMetricsLogIntervalMs;
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
    if (config.analysis_re_entry_window_ms < 0) {
        std::cerr << "[env] re-entry window ms cannot be negative, fallback "
                  << app_config::kDefaultAnalysisReEntryWindowMs << "\n";
        config.analysis_re_entry_window_ms = app_config::kDefaultAnalysisReEntryWindowMs;
    }
    if (config.analysis_re_entry_cooldown_ms < 0) {
        std::cerr << "[env] re-entry cooldown ms cannot be negative, fallback "
                  << app_config::kDefaultAnalysisReEntryCooldownMs << "\n";
        config.analysis_re_entry_cooldown_ms = app_config::kDefaultAnalysisReEntryCooldownMs;
    }
    if (config.analysis_wrong_direction_cooldown_ms < 0) {
        std::cerr << "[env] wrong-direction cooldown ms cannot be negative, fallback "
                  << app_config::kDefaultAnalysisWrongDirectionCooldownMs << "\n";
        config.analysis_wrong_direction_cooldown_ms =
            app_config::kDefaultAnalysisWrongDirectionCooldownMs;
    }
    if (config.analysis_intrusion_after_line_crossing_max_delay_ms < 0) {
        std::cerr << "[env] intrusion-after-line-crossing max delay ms cannot be negative, fallback "
                  << app_config::kDefaultAnalysisIntrusionAfterLineCrossingMaxDelayMs << "\n";
        config.analysis_intrusion_after_line_crossing_max_delay_ms =
            app_config::kDefaultAnalysisIntrusionAfterLineCrossingMaxDelayMs;
    }
    if (config.analysis_intrusion_after_line_crossing_dwell_ms < 0) {
        std::cerr << "[env] intrusion-after-line-crossing dwell ms cannot be negative, fallback "
                  << app_config::kDefaultAnalysisIntrusionAfterLineCrossingDwellMs << "\n";
        config.analysis_intrusion_after_line_crossing_dwell_ms =
            app_config::kDefaultAnalysisIntrusionAfterLineCrossingDwellMs;
    }
    if (config.analysis_intrusion_after_line_crossing_cooldown_ms < 0) {
        std::cerr << "[env] intrusion-after-line-crossing cooldown ms cannot be negative, fallback "
                  << app_config::kDefaultAnalysisIntrusionAfterLineCrossingCooldownMs << "\n";
        config.analysis_intrusion_after_line_crossing_cooldown_ms =
            app_config::kDefaultAnalysisIntrusionAfterLineCrossingCooldownMs;
    }
    if (config.analysis_loitering_min_dwell_time_ms < 0) {
        std::cerr << "[env] loitering min dwell time ms cannot be negative, fallback "
                  << app_config::kDefaultAnalysisLoiteringMinDwellTimeMs << "\n";
        config.analysis_loitering_min_dwell_time_ms =
            app_config::kDefaultAnalysisLoiteringMinDwellTimeMs;
    }
    if (config.analysis_loitering_max_movement_radius < 0.0F) {
        std::cerr << "[env] loitering max movement radius cannot be negative, fallback "
                  << app_config::kDefaultAnalysisLoiteringMaxMovementRadius << "\n";
        config.analysis_loitering_max_movement_radius =
            app_config::kDefaultAnalysisLoiteringMaxMovementRadius;
    }
    if (config.analysis_loitering_min_trajectory_points < 2) {
        std::cerr << "[env] loitering min trajectory points must be at least 2, fallback "
                  << app_config::kDefaultAnalysisLoiteringMinTrajectoryPoints << "\n";
        config.analysis_loitering_min_trajectory_points =
            app_config::kDefaultAnalysisLoiteringMinTrajectoryPoints;
    }
    if (config.analysis_loitering_cooldown_ms < 0) {
        std::cerr << "[env] loitering cooldown ms cannot be negative, fallback "
                  << app_config::kDefaultAnalysisLoiteringCooldownMs << "\n";
        config.analysis_loitering_cooldown_ms =
            app_config::kDefaultAnalysisLoiteringCooldownMs;
    }
    if (config.analysis_tracking_issue_max_entries == 0) {
        std::cerr << "[env] tracking issue max entries cannot be 0, fallback "
                  << app_config::kDefaultAnalysisTrackingIssueMaxEntries << "\n";
        config.analysis_tracking_issue_max_entries =
            app_config::kDefaultAnalysisTrackingIssueMaxEntries;
    }
    if (config.analysis_tracking_issue_rate_limit_ms < 0) {
        std::cerr << "[env] tracking issue rate limit ms cannot be negative, fallback "
                  << app_config::kDefaultAnalysisTrackingIssueRateLimitMs << "\n";
        config.analysis_tracking_issue_rate_limit_ms =
            app_config::kDefaultAnalysisTrackingIssueRateLimitMs;
    }
    if (config.analysis_tracking_issue_overlap_risk_threshold < 0.0F ||
        config.analysis_tracking_issue_overlap_risk_threshold > 1.0F) {
        std::cerr << "[env] tracking issue overlap risk threshold must be within 0..1, fallback "
                  << app_config::kDefaultAnalysisTrackingIssueOverlapRiskThreshold << "\n";
        config.analysis_tracking_issue_overlap_risk_threshold =
            app_config::kDefaultAnalysisTrackingIssueOverlapRiskThreshold;
    }
    if (config.analysis_tracking_issue_missed_frame_jump_threshold == 0) {
        config.analysis_tracking_issue_missed_frame_jump_threshold =
            static_cast<std::uint32_t>(
                app_config::kDefaultAnalysisTrackingIssueMissedFrameJumpThreshold);
    }
    if (config.analysis_tracking_issue_direction_change_jump_threshold == 0) {
        config.analysis_tracking_issue_direction_change_jump_threshold =
            static_cast<std::uint32_t>(
                app_config::kDefaultAnalysisTrackingIssueDirectionChangeJumpThreshold);
    }
    if (config.analysis_appearance_every_n_seconds < 0) {
        std::cerr << "[env] appearance every n seconds cannot be negative, fallback "
                  << app_config::kDefaultAnalysisAppearanceEveryNSeconds << "\n";
        config.analysis_appearance_every_n_seconds =
            app_config::kDefaultAnalysisAppearanceEveryNSeconds;
    }
    if (config.analysis_appearance_extractor != "noop" &&
        config.analysis_appearance_extractor != "onnx-reid") {
        std::cerr << "[env] unsupported appearance extractor '"
                  << config.analysis_appearance_extractor << "', fallback noop\n";
        config.analysis_appearance_extractor = "noop";
    }
    ValidatePositiveInt(&config.analysis_appearance_input_width,
                        app_config::kDefaultAnalysisAppearanceInputWidth,
                        "Appearance input width");
    ValidatePositiveInt(&config.analysis_appearance_input_height,
                        app_config::kDefaultAnalysisAppearanceInputHeight,
                        "Appearance input height");
    if (config.analysis_appearance_max_embedding_dim == 0) {
        std::cerr << "[env] appearance max embedding dim cannot be 0, fallback "
                  << app_config::kDefaultAnalysisAppearanceMaxEmbeddingDim << "\n";
        config.analysis_appearance_max_embedding_dim =
            app_config::kDefaultAnalysisAppearanceMaxEmbeddingDim;
    }
    if (config.analysis_appearance_max_queue == 0) {
        std::cerr << "[env] appearance max queue cannot be 0, fallback "
                  << app_config::kDefaultAnalysisAppearanceMaxQueue << "\n";
        config.analysis_appearance_max_queue = app_config::kDefaultAnalysisAppearanceMaxQueue;
    }
    if (config.analysis_appearance_global_max_queue == 0) {
        std::cerr << "[env] appearance global max queue cannot be 0, fallback "
                  << app_config::kDefaultAnalysisAppearanceGlobalMaxQueue << "\n";
        config.analysis_appearance_global_max_queue =
            app_config::kDefaultAnalysisAppearanceGlobalMaxQueue;
    }
    if (config.analysis_appearance_per_stream_rate_limit_ms < 0) {
        std::cerr << "[env] appearance per-stream rate limit cannot be negative, fallback "
                  << app_config::kDefaultAnalysisAppearancePerStreamRateLimitMs << "\n";
        config.analysis_appearance_per_stream_rate_limit_ms =
            app_config::kDefaultAnalysisAppearancePerStreamRateLimitMs;
    }
    if (config.analysis_appearance_max_job_age_ms < 0) {
        std::cerr << "[env] appearance max job age cannot be negative, fallback "
                  << app_config::kDefaultAnalysisAppearanceMaxJobAgeMs << "\n";
        config.analysis_appearance_max_job_age_ms =
            app_config::kDefaultAnalysisAppearanceMaxJobAgeMs;
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
    if (config.auth_session_ttl_seconds <= 0) {
        std::cerr << "[env] auth session TTL must be positive, fallback 86400\n";
        config.auth_session_ttl_seconds = 86400;
    }
    if (config.auth_session_idle_timeout_seconds < 0) {
        std::cerr << "[env] auth session idle timeout must be zero or positive, fallback 3600\n";
        config.auth_session_idle_timeout_seconds = 3600;
    }
    if (!IsAllowedPasswordPolicy(config.auth_password_policy)) {
        std::cerr << "[env] MEDIA_SERVER_AUTH_PASSWORD_POLICY must be kr-privacy, strict, or custom, fallback kr-privacy\n";
        config.auth_password_policy = "kr-privacy";
    }
    if (config.auth_password_min_length < 0) {
        std::cerr << "[env] auth password min length must be zero or positive, fallback 0\n";
        config.auth_password_min_length = 0;
    }
    if (config.auth_password_history_count < 0) {
        std::cerr << "[env] auth password history count must be zero or positive, fallback 5\n";
        config.auth_password_history_count = 5;
    }
    if (config.auth_password_max_age_days < 0) {
        std::cerr << "[env] auth password max age days must be zero or positive, fallback 0\n";
        config.auth_password_max_age_days = 0;
    }
    if (config.auth_login_max_failures < 0) {
        std::cerr << "[env] auth login max failures must be zero or positive, fallback 5\n";
        config.auth_login_max_failures = 5;
    }
    if (config.auth_login_lockout_seconds < 0) {
        std::cerr << "[env] auth login lockout seconds must be zero or positive, fallback 300\n";
        config.auth_login_lockout_seconds = 300;
    }
    if (!IsSafeCookieName(config.auth_cookie_name)) {
        std::cerr << "[env] auth cookie name must use letters, digits, '_' or '-', fallback media_server_session\n";
        config.auth_cookie_name = "media_server_session";
    }
    if (config.ui_default_home != "lab" && config.ui_default_home != "ops" &&
        config.ui_default_home != "client") {
        std::cerr << "[env] MEDIA_SERVER_UI_DEFAULT_HOME must be lab, ops, or client, fallback lab\n";
        config.ui_default_home = "lab";
    }
    config.auth_users_file = ResolveRuntimePath(config.auth_users_file);
    return config;
}

}  // namespace

namespace app {

const AppConfig& GetAppConfig() {
    static const AppConfig config = LoadAppConfig();
    return config;
}

}  // namespace app

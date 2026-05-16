// 파일 요약: 빌드 기본 상수와 공통 include를 모아 둔 설정 헤더다.
// 동작 요약: 기본 route, 포트, 파일 경로, resource limit, timeout 상수를 제공한다.
// 동작 요약: 환경변수로 덮기 전 컴파일 타임 기본값을 정의한다.
#pragma once

#include <atomic>
#include <functional>
#include <memory>
#include <mutex>
#include <optional>
#include <shared_mutex>
#include <string>
#include <thread>
#include <cstdint>
#include <unordered_map>
#include <utility>
#include <vector>

namespace app_config {
// 주요 설정: 기본 RTSP path prefix를 바꿀 때 이 값을 조정한다.
inline constexpr const char* kStreamRoute = "dhseo";
inline constexpr std::size_t kSubscriberQueueSize = 256;
inline constexpr std::size_t kMaxSessions = 2048;
inline constexpr std::size_t kMaxStreams = 512;
inline constexpr int kIdleGracePeriodMs = 10000;
inline constexpr const char* kRtspListenAddress = "127.0.0.1";
inline constexpr std::uint16_t kRtspListenPort = 8554;
inline constexpr const char* kHttpListenAddress = "127.0.0.1";
inline constexpr std::uint16_t kHttpListenPort = 8080;
inline constexpr const char* kFileRootPath = "video";
inline constexpr const char* kDefaultFilePath = "video/sample_h264.mp4";
inline constexpr bool kDefaultWebRtcVaMetadataChannelEnabled = false;
inline constexpr const char* kDefaultWebRtcVaMetadataChannelLabel = "va-metadata";
inline constexpr int kDefaultWebRtcVaMetadataIntervalMs = 500;
inline constexpr std::size_t kDefaultWebRtcVaMetadataMaxMessageBytes = 65536;
inline constexpr std::size_t kDefaultWebRtcVaMetadataMaxBufferedBytes = 262144;
inline constexpr const char* kDefaultAnalysisDetector = "yolo";
inline constexpr const char* kDefaultAnalysisModelPath = "models/yolo11n.onnx";
inline constexpr const char* kDefaultAnalysisLabelsPath = "models/coco.names";
inline constexpr int kDefaultAnalysisFps = 8;
inline constexpr std::size_t kDefaultAnalysisMaxQueue = 1;
inline constexpr int kDefaultAnalysisFrameSampleInterval = 1;
inline constexpr int kDefaultAnalysisMaxFrameAgeMs = 0;
inline constexpr int kDefaultAnalysisInputWidth = 640;
inline constexpr int kDefaultAnalysisInputHeight = 640;
inline constexpr float kDefaultAnalysisConfidence = 0.25F;
inline constexpr float kDefaultAnalysisNms = 0.45F;
inline constexpr const char* kDefaultAnalysisPreprocess = "letterbox";
inline constexpr bool kDefaultAnalysisTrackingEnabled = true;
inline constexpr const char* kDefaultAnalysisTrackingClasses = "person,vehicle";
inline constexpr int kDefaultAnalysisTrackingLostBufferFrames = 8;
inline constexpr float kDefaultAnalysisTrackingIouWeight = 0.45F;
inline constexpr float kDefaultAnalysisTrackingDistanceWeight = 0.35F;
inline constexpr float kDefaultAnalysisTrackingDirectionWeight = 0.15F;
inline constexpr float kDefaultAnalysisTrackingClassWeight = 0.05F;
inline constexpr float kDefaultAnalysisTrackingMinAssociationScore = 0.10F;
inline constexpr float kDefaultAnalysisTrackingSmoothingAlpha = 0.20F;
inline constexpr int kDefaultAnalysisOverlayWaitMs = 180;
inline constexpr int kDefaultAnalysisOverlaySyncToleranceMs = 400;
inline constexpr int kDefaultAnalysisOverlayThickness = 3;
inline constexpr bool kDefaultAnalysisDebugOverlayEnabled = false;
inline constexpr bool kDefaultAnalysisDebugGroundPointEnabled = false;
inline constexpr int kDefaultAnalysisMetricsLogIntervalMs = 30000;
inline constexpr bool kDefaultAnalysisHomographyEnabled = false;
inline constexpr const char* kDefaultAnalysisHomographyMatrix = "";
inline constexpr const char* kDefaultAnalysisHomographyStreamId = "";
inline constexpr const char* kDefaultAnalysisHomographyChannelId = "";
inline constexpr const char* kDefaultAnalysisHomographyUnits = "ground";
inline constexpr bool kDefaultAnalysisGroundPlaneSpeedEnabled = false;
inline constexpr bool kDefaultAnalysisGroundPlaneMovementRadiusEnabled = false;
inline constexpr bool kDefaultAnalysisAdaptiveEnabled = true;
inline constexpr bool kDefaultAnalysisAdaptiveInputEnabled = true;
inline constexpr int kDefaultAnalysisAdaptiveMinFps = 2;
inline constexpr int kDefaultAnalysisAdaptiveCooldownMs = 3000;
inline constexpr int kDefaultAnalysisAdaptiveInputStep = 128;
inline constexpr int kDefaultAnalysisAdaptiveMinInputWidth = 320;
inline constexpr int kDefaultAnalysisAdaptiveMinInputHeight = 320;
inline constexpr float kDefaultAnalysisAdaptiveHighLatencyRatio = 0.85F;
inline constexpr float kDefaultAnalysisAdaptiveLowLatencyRatio = 0.35F;
inline constexpr const char* kDefaultAnalysisRegistryPath = ".media_server.analysis_registry.json";
inline constexpr const char* kDefaultSourceRegistryPath = ".media_server.sources.json";
inline constexpr const char* kDefaultPublishedViewsPath = ".media_server.views.json";
inline constexpr std::size_t kDefaultAnalysisMaxActiveProfilesPerSource = 8;
inline constexpr std::size_t kDefaultAnalysisMaxActiveTapsPerSource = 8;
inline constexpr bool kDefaultAnalysisEventPostEnabled = false;
inline constexpr int kDefaultAnalysisEventPostTimeoutMs = 3000;
inline constexpr std::size_t kDefaultAnalysisEventPostMaxQueue = 256;
inline constexpr int kDefaultAnalysisEventPostCooldownMs = 2000;
inline constexpr bool kDefaultAnalysisEventStorageEnabled = false;
inline constexpr const char* kDefaultAnalysisEventStoragePath = ".media_server.va_events.jsonl";
inline constexpr std::size_t kDefaultAnalysisEventStorageMaxQueue = 2048;
inline constexpr std::size_t kDefaultAnalysisEventStorageMaxFileBytes = 0;
inline constexpr std::size_t kDefaultAnalysisEventStorageMaxArchives = 0;
inline constexpr std::size_t kDefaultAnalysisEventStorageMaxTotalBytes = 0;
inline constexpr bool kDefaultAnalysisEventSnapshotHookEnabled = false;
inline constexpr const char* kDefaultAnalysisEventSnapshotDir = ".media_server.va_snapshots";
inline constexpr bool kDefaultAnalysisEventClipHookEnabled = false;
inline constexpr const char* kDefaultAnalysisEventClipDir = ".media_server.va_clips";
inline constexpr int kDefaultAnalysisEventPreEventMs = 5000;
inline constexpr int kDefaultAnalysisEventPostEventMs = 5000;
inline constexpr int kDefaultAnalysisEventClipBufferMs = 15000;
inline constexpr std::size_t kDefaultAnalysisMaxActiveTracksPerStream = 512;
inline constexpr std::size_t kDefaultAnalysisMaxRecentObservationsPerTrack = 32;
inline constexpr std::size_t kDefaultAnalysisMaxTrajectoryPointsPerTrack = 32;
inline constexpr int kDefaultAnalysisTrajectoryDownsampleMs = 500;
inline constexpr int kDefaultAnalysisLostTrackTimeoutMs = 2000;
inline constexpr int kDefaultAnalysisTerminatedTrackTimeoutMs = 10000;
inline constexpr int kDefaultAnalysisTerminatedTrackRetentionMs = 2000;
inline constexpr int kDefaultAnalysisCleanupIntervalMs = 1000;
inline constexpr bool kDefaultAnalysisScenarioEnabled = false;
inline constexpr std::size_t kDefaultAnalysisScenarioMaxInstancesPerChannel = 2048;
inline constexpr int kDefaultAnalysisScenarioCooldownMs = 5000;
inline constexpr int kDefaultAnalysisScenarioUpdateIntervalMs = 1000;
inline constexpr int kDefaultAnalysisScenarioRetentionMs = 5000;
inline constexpr int kDefaultAnalysisScenarioEndedRetentionMs = kDefaultAnalysisScenarioRetentionMs;
inline constexpr bool kDefaultAnalysisIntrusionDwellEnabled = false;
inline constexpr int kDefaultAnalysisIntrusionDwellCandidateMs = 2000;
inline constexpr int kDefaultAnalysisIntrusionDwellDwellMs = 10000;
inline constexpr int kDefaultAnalysisIntrusionDwellCooldownMs = 5000;
inline constexpr bool kDefaultAnalysisReEntryEnabled = false;
inline constexpr int kDefaultAnalysisReEntryWindowMs = 10000;
inline constexpr int kDefaultAnalysisReEntryCooldownMs = 5000;
inline constexpr bool kDefaultAnalysisWrongDirectionEnabled = false;
inline constexpr int kDefaultAnalysisWrongDirectionCooldownMs = 5000;
inline constexpr bool kDefaultAnalysisIntrusionAfterLineCrossingEnabled = false;
inline constexpr int kDefaultAnalysisIntrusionAfterLineCrossingMaxDelayMs = 10000;
inline constexpr int kDefaultAnalysisIntrusionAfterLineCrossingDwellMs = 5000;
inline constexpr int kDefaultAnalysisIntrusionAfterLineCrossingCooldownMs = 5000;
inline constexpr bool kDefaultAnalysisLoiteringEnabled = false;
inline constexpr int kDefaultAnalysisLoiteringMinDwellTimeMs = 30000;
inline constexpr float kDefaultAnalysisLoiteringMaxMovementRadius = 0.08F;
inline constexpr std::size_t kDefaultAnalysisLoiteringMinTrajectoryPoints = 4;
inline constexpr int kDefaultAnalysisLoiteringCooldownMs = 12000;
inline constexpr bool kDefaultAnalysisLoiteringUseGroundPlane = false;
inline constexpr bool kDefaultAnalysisZoneOccupancyEnabled = false;
inline constexpr std::size_t kDefaultAnalysisZoneOccupancyThreshold = 4;
inline constexpr int kDefaultAnalysisZoneOccupancyMinDwellTimeMs = 7000;
inline constexpr int kDefaultAnalysisZoneOccupancyCooldownMs = 12000;
inline constexpr bool kDefaultAnalysisTrackingIssueReportEnabled = true;
inline constexpr bool kDefaultAnalysisTrackingIssueLogEnabled = true;
inline constexpr std::size_t kDefaultAnalysisTrackingIssueMaxEntries = 256;
inline constexpr int kDefaultAnalysisTrackingIssueRateLimitMs = 5000;
inline constexpr float kDefaultAnalysisTrackingIssueOverlapRiskThreshold = 0.50F;
inline constexpr int kDefaultAnalysisTrackingIssueMissedFrameJumpThreshold = 3;
inline constexpr int kDefaultAnalysisTrackingIssueDirectionChangeJumpThreshold = 2;
inline constexpr const char* kDefaultAnalysisTrackingCloseObjectGuardMode = "off";
inline constexpr float kDefaultAnalysisTrackingCloseObjectDistanceRatio = 0.65F;
inline constexpr float kDefaultAnalysisTrackingCloseObjectOverlapThreshold = 0.20F;
inline constexpr float kDefaultAnalysisTrackingCloseObjectLowMarginThreshold = 0.08F;
inline constexpr float kDefaultAnalysisTrackingCenterJumpPenalty = 0.10F;
inline constexpr float kDefaultAnalysisTrackingCloseObjectMinScoreBoost = 0.03F;
inline constexpr std::size_t kDefaultAnalysisTrackingCloseObjectMaxDiagnostics = 64;
inline constexpr bool kDefaultAnalysisAppearanceEnabled = false;
inline constexpr const char* kDefaultAnalysisAppearanceExtractor = "noop";
inline constexpr const char* kDefaultAnalysisAppearanceModelPath = "";
inline constexpr int kDefaultAnalysisAppearanceInputWidth = 128;
inline constexpr int kDefaultAnalysisAppearanceInputHeight = 256;
inline constexpr std::size_t kDefaultAnalysisAppearanceMaxEmbeddingDim = 4096;
inline constexpr bool kDefaultAnalysisAppearanceLogEnabled = false;
inline constexpr bool kDefaultAnalysisAppearanceAsyncEnabled = true;
inline constexpr std::size_t kDefaultAnalysisAppearanceMaxQueue = 32;
inline constexpr std::size_t kDefaultAnalysisAppearanceGlobalMaxQueue = 128;
inline constexpr int kDefaultAnalysisAppearancePerStreamRateLimitMs = 1000;
inline constexpr int kDefaultAnalysisAppearanceMaxJobAgeMs = 2000;
inline constexpr bool kDefaultAnalysisAppearanceOnTrackCreated = true;
inline constexpr int kDefaultAnalysisAppearanceEveryNSeconds = 0;
inline constexpr bool kDefaultAnalysisAppearanceOnTrackLost = false;
inline constexpr bool kDefaultAnalysisAppearanceOnReacquireCandidate = true;
inline constexpr bool kDefaultAnalysisAppearanceOnLowConfidenceAssociation = true;
}  // namespace app_config

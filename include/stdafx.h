// 파일 용도: 라우트, 포트, 파일 경로 같은 빌드 기본 상수를 한곳에 모아 둔다.
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
// Change this to customize the RTSP path prefix.
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
inline constexpr const char* kDefaultAnalysisDetector = "yolo";
inline constexpr const char* kDefaultAnalysisModelPath = "models/yolo11n.onnx";
inline constexpr const char* kDefaultAnalysisLabelsPath = "models/coco.names";
inline constexpr int kDefaultAnalysisFps = 8;
inline constexpr std::size_t kDefaultAnalysisMaxQueue = 1;
inline constexpr int kDefaultAnalysisInputWidth = 640;
inline constexpr int kDefaultAnalysisInputHeight = 640;
inline constexpr float kDefaultAnalysisConfidence = 0.25F;
inline constexpr float kDefaultAnalysisNms = 0.45F;
inline constexpr const char* kDefaultAnalysisPreprocess = "letterbox";
inline constexpr int kDefaultAnalysisOverlayWaitMs = 180;
inline constexpr int kDefaultAnalysisOverlaySyncToleranceMs = 400;
inline constexpr int kDefaultAnalysisOverlayThickness = 3;
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
}  // namespace app_config

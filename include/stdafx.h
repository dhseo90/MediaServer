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
}  // namespace app_config

// 파일 요약: 빌드 기본 상수와 공통 include를 모아 둔 설정 헤더다.
// 동작 요약: 기본 route, 포트, 파일 경로, resource limit, timeout 상수를 제공한다.
// 동작 요약: 환경변수로 덮기 전 컴파일 타임 기본값을 정의한다.
#pragma once

#include "core/analysis_runtime_defaults.h"

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
using namespace core::analysis_defaults;
inline constexpr const char* kDefaultSourceRegistryPath = ".media_server.sources.json";
inline constexpr const char* kDefaultPublishedViewsPath = ".media_server.views.json";
}  // namespace app_config

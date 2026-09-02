// 파일 요약: v4.1.0 녹화 런타임의 안전한 기본값을 고정한다.
// 동작 요약: 녹화는 명시 opt-in 전까지 꺼지고 segment·저장소 경계를 한곳에서 관리한다.
#pragma once

#include <cstddef>

namespace core::recording_runtime_defaults {

inline constexpr bool kEnabled = false;
inline constexpr const char* kStorageRoot = ".media_server/recordings";
inline constexpr std::size_t kDefaultChannelQuotaBytes = 10ULL * 1024ULL * 1024ULL * 1024ULL;
inline constexpr int kSegmentDurationSeconds = 10;
inline constexpr int kDefaultRetentionDays = 7;

}  // namespace core::recording_runtime_defaults

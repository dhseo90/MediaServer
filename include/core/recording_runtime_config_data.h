// 파일 요약: 전역 녹화 런타임 설정과 fail-closed 검증 계약을 선언한다.
// 동작 요약: opt-in, root, segment 길이, 기본 quota·보존기간을 AppConfig와 분리해 제공한다.
#pragma once

#include <cstddef>
#include <filesystem>
#include <string>

#include "core/recording_runtime_defaults.h"

namespace core {

struct RecordingRuntimeConfigData {
    bool recording_enabled{recording_runtime_defaults::kEnabled};
    std::string recording_storage_root{recording_runtime_defaults::kStorageRoot};
    std::size_t recording_default_channel_quota_bytes{
        recording_runtime_defaults::kDefaultChannelQuotaBytes};
    int recording_segment_duration_seconds{
        recording_runtime_defaults::kSegmentDurationSeconds};
    int recording_default_retention_days{
        recording_runtime_defaults::kDefaultRetentionDays};
};

inline bool ValidateRecordingRuntimeConfig(const RecordingRuntimeConfigData& value,
                                           std::string* error) {
    const auto fail = [&](const std::string& message) {
        if (error != nullptr) *error = message;
        return false;
    };
    if (value.recording_storage_root.empty()) return fail("recording storage root가 비어 있음");
    if (value.recording_segment_duration_seconds <= 0) return fail("segment duration은 양수여야 함");
    if (value.recording_default_retention_days <= 0) return fail("retention days는 양수여야 함");
    if (value.recording_enabled && value.recording_default_channel_quota_bytes == 0) {
        return fail("녹화 활성화 시 기본 channel quota는 0일 수 없음");
    }
    const std::filesystem::path root(value.recording_storage_root);
    if (root.filename().empty() || root == root.root_path()) {
        return fail("recording storage root는 filesystem root일 수 없음");
    }
    if (error != nullptr) error->clear();
    return true;
}

inline bool ValidateRecordingStorageLayout(const std::filesystem::path& recording_root,
                                           const std::filesystem::path& media_root,
                                           std::string* error) {
    const auto normalized_recording = std::filesystem::absolute(recording_root).lexically_normal();
    const auto normalized_media = std::filesystem::absolute(media_root).lexically_normal();
    if (normalized_recording == normalized_media) {
        if (error != nullptr) *error = "녹화 root와 media source root는 분리해야 함";
        return false;
    }
    if (error != nullptr) error->clear();
    return true;
}

inline bool ShouldStartRecording(bool global_enabled,
                                 bool source_enabled,
                                 bool channel_enabled) {
    return global_enabled && source_enabled && channel_enabled;
}

}  // namespace core

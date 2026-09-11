// 파일 용도: 명시적 known segment 검사. startup coordinator가 호출하며 재생 경로의 자동검사는 아니다.
#pragma once
#include "recording/recording_contracts.h"
#include <chrono>
#include <filesystem>
#include <string>
namespace recording {
class RecordingCatalog;
enum class MediaInspectionState { Healthy, Corrupt, Unavailable };
// 허용 예산은 0초과 60초이하. demux 단일 요청은 16MiB까지이며 초과는 Unavailable.
struct MediaInspectionOptions { std::chrono::milliseconds budget{5000}; };
struct MediaInspectionResult {
    MediaInspectionState state{MediaInspectionState::Unavailable};
    std::string detail;
    std::string corruption_reason;
    bool applied{false};
    std::string apply_error;
};
// Healthy는 stored SHA256 및 예상 video buffer를 포함한 MP4/WebM/MPEGTS demux 정상만 뜻한다.
// 전체 codec decode 또는 같은권한 비협력 프로세스의 동시write 원자성을 보장하지 않는다.
MediaInspectionResult InspectRecordingMedia(const std::filesystem::path& root,
    const std::filesystem::path& relative, const RecordingSegmentV1& segment,
    MediaInspectionOptions options = {});
MediaInspectionResult InspectAndMarkRecordingMedia(RecordingCatalog& catalog,
    const std::string& segment_id, MediaInspectionOptions options = {});
}

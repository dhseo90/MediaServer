// 파일 용도: caller가 보존 보호한 로컬 FD에서 정확한 파일 표시 시각의 RGB를 읽는다.
#pragma once
#include <cstdint>
#include <functional>
#include <string>
#include <vector>
namespace recording {
// SoftwareOnly의 avdec_h264는 인스턴스별 단일 codec thread로 frame 소유 충돌을 피한다.
// 자동 정책과 전역 factory 선택은 변경하지 않는다.
enum class VisualDecodePolicy { Automatic, SoftwareOnly };
// 저장 MP4의 scene-index 추출만 사용한다. 일반 decoder/증거/Linux 정책은 별개다.
constexpr VisualDecodePolicy StoredVisualIndexDecodePolicy() {
#ifdef __APPLE__
    return VisualDecodePolicy::SoftwareOnly;
#else
    return VisualDecodePolicy::Automatic;
#endif
}
struct VisualRgbFrame {
    int width{0},height{0};
    std::int64_t presentation_ns{0};
    std::vector<std::uint8_t> rgb;
};
// 원본 PTS가 아닌 기존 SourceSeek가 검증한 파일 표시 시각을 받는다.
// FD 소유권/offset 불변. 최대 파일512MiB, RGB4096x2160/32MiB, 검사시간1~5000ms.
// 정확한 sample 시작(정수 나눗셈 반올림 차이1ns 이내)만 허용하며 근처 frame으로 대체하지 않는다.
bool DecodeVisualFrame(int fd,std::uint64_t bytes,std::int64_t presentation_ns,
    VisualRgbFrame* output,std::string* error,const std::function<bool()>& cancelled={},
    std::uint32_t budget_ms=5000,VisualDecodePolicy policy=VisualDecodePolicy::Automatic);
} // namespace recording

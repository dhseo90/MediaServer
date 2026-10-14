// 고정 R114 시험 입력과 gst-qtmux-1.28.1-default-v1의 계산된 envelope. 제품 상한이 아니다.
#pragma once
#include <cstdint>
namespace recording_mixed_fixture {
constexpr std::uint64_t kPayloadBytes = 66504;
// 고정 box/header877 + 최대120개의 stts8/stsz4/stsc12/co64 8 + key4개의 stss4.
// PTS==DTS 고정 입력: ctts 없음. loop는 source generation을 바꾸므로 같은 파일에 누적되지 않는다.
constexpr std::uint64_t kSegmentBytes = kPayloadBytes + 877 + 120 * (8 + 4 + 12 + 8) + 4 * 4;
constexpr std::uint64_t kReserved = 64ULL * 1024 * 1024;
constexpr std::uint64_t kProtectedFiles = 201 + 2 * 220 + 2;
constexpr std::uint64_t kHeld = kProtectedFiles * kSegmentBytes;
constexpr std::uint64_t kPending = kSegmentBytes;
constexpr std::uint64_t kQuota = ((kReserved + kHeld + kPending + 1048575) / 1048576) * 1048576;
}

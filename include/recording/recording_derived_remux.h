// 파일 용도: 호출자가 보호·소유한 FD로 내부 H264 파생 출력을 만들고 실제 출처를 검증한다.
#pragma once
#include "recording/recording_remux_result.h"
#include <functional>

namespace recording {
struct DerivedRemuxSource {
    RecordingSegmentV2 segment;
    RecordingSourceBindingV1 binding;
    int source_fd{-1};
    int output_fd{-1};
};
struct DerivedRemuxRequest {
    DerivedRecordingSelection selection;
    std::vector<DerivedRemuxSource> sources;
    // 저장된 구형 TS intent는 복구 시 그대로 처리한다. 새 작업은 브라우저 재생용 MP4다.
    std::string output_container{"mp4"};
    std::uint64_t max_output_bytes{0};
    std::uint32_t max_work_ms{30000};
    // 여러 내부 읽기 스레드에서 호출될 수 있다. caller가 thread-safe·비차단 callback을 제공한다.
    std::function<bool()> cancelled;
};

// 현재 보호된 MP4 FD의 AU를 다시 읽고 저장된 출력 PTS/VCL에 대응하는 stream time을 반환한다.
// 원본 PTS→출력 AU 연결은 caller가 검증한다. FD offset/소유권은 바꾸지 않는다.
bool ResolveRecordingPresentationTime(int fd, std::uint64_t bytes, const std::string& sha256,
    std::int64_t output_pts_ns, const std::string& vcl_sha256,
    std::int64_t* stream_time_ns, std::int64_t* duration_ns, std::string* error);

// FD offset/소유권은 caller에 남는다. source/output은 서로 다른 inode이며 output은 빈 O_RDWR regular FD여야 한다.
// 같은 epoch도 현재 프로파일은 source별 독립 출력이다. close/unlink/publish/fsync/ready/catalog mutation은 caller 책임이다.
DerivedRemuxResult DeriveRecordingH264Remux(const DerivedRemuxRequest& request);
} // namespace recording

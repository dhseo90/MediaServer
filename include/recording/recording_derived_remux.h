// 파일 용도: 호출자가 보호·소유한 FD로 내부 H264 파생 출력을 만들고 실제 출처를 검증한다.
#pragma once
#include "recording/recording_derived_selection.h"
#include "recording/recording_derived_provenance.h"
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
    std::uint64_t max_output_bytes{0};
    std::uint32_t max_work_ms{30000};
    // 여러 내부 읽기 스레드에서 호출될 수 있다. caller가 thread-safe·비차단 callback을 제공한다.
    std::function<bool()> cancelled;
};
struct DerivedRemuxResult {
    DerivedRecordingSelection selection;
    std::vector<DerivedRemuxOutput> outputs;
    std::vector<DerivedRemuxUnfulfilled> unfulfilled;
    bool verified_output{false},request_fully_satisfied{false};
    std::string error;
};
// FD offset/소유권은 caller에 남는다. source/output은 서로 다른 inode이며 output은 빈 O_RDWR regular FD여야 한다.
// 같은 epoch도 현재 프로파일은 source별 독립 출력이다. close/unlink/publish/fsync/ready/catalog mutation은 caller 책임이다.
DerivedRemuxResult DeriveRecordingH264Remux(const DerivedRemuxRequest& request);
} // namespace recording

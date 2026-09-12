// 파일 용도: 호출자가 보호·소유한 FD로 내부 H264 파생 출력을 만들고 실제 출처를 검증한다.
#pragma once
#include "recording/recording_derived_selection.h"
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
struct DerivedRemuxAu {
    std::uint64_t ordinal{0};
    std::int64_t original_pts_ns{0},file_pts_ns{0},file_duration_ns{0},file_stream_time_ns{0};
    std::optional<std::int64_t> file_dts_ns;
    std::int64_t output_pts_ns{0},output_duration_ns{0};
    std::optional<std::int64_t> output_dts_ns;
    std::string source_vcl_sha256,output_vcl_sha256;
    // demux GST ns에서 역산한 90k tick 후보와 변환 잔차. raw PES 직접 확인값이 아니다.
    std::optional<std::int64_t> output_pts_90k;
    std::optional<std::int64_t> output_pts_residual_numerator;
};
struct DerivedRemuxUnfulfilled {
    std::string segment_id,axis,reason;
    std::int64_t start{0},end{0};
};
struct DerivedRemuxOutput {
    std::string segment_id,store_id,source_id,media_epoch_id;
    bool verified_output{false},request_fully_satisfied{false};
    bool output_modified{false},caller_cleanup_required{false};
    std::uint64_t size_bytes{0};
    std::string checksum_sha256,codec_sha256,error;
    std::string audio_omitted_reason{"derived-profile-video-only"};
    std::string actual_range_basis{"file-duration-on-source-pts-axis"};
    std::string original_association_quality{"complete-file-pts-to-binding-timestamp-match"};
    std::string output_payload_quality{"source-file-vcl-and-visible-decoded-pixels"};
    std::int64_t source_origin_ns{0},seek_stream_time_ns{0};
    std::int64_t actual_original_start_ns{0},actual_original_end_ns{0};
    std::int64_t requested_media_start_ns{0},requested_media_end_ns{0};
    std::vector<DerivedRemuxAu> access_units;
    std::vector<std::string> source_decoded_sha256,output_decoded_sha256;
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

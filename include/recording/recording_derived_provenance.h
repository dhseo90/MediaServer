#pragma once
// 파일 용도: 실제 remux 출처의 값 타입. catalog/selection include cycle 없이 내구 기록에 재사용한다.
#include <cstdint>
#include <optional>
#include <string>
#include <vector>
namespace recording {
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
} // namespace recording

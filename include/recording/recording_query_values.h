// 파일 용도: 저장·조회가 공유하는 값 계약. catalog/파일 검사 서비스의 실행 선언을 포함하지 않는다.
#pragma once
#include "recording/recording_contracts.h"

namespace recording {
struct RecordingOriginalCandidate {
    RecordingSegmentV2 segment;
    std::string source_generation, track_id;
    std::uint64_t generation_order{0}, last_accepted_ordinal{0};
    std::optional<RecordingSourceSampleV1> sample;
    std::string reason;
};
enum class RecordingLocationState { Single, Multiple, Unknown, None, Deleted };
// 내부 메타데이터 위치: 프레임 고유성이나 파일 재생 가능 여부의 증명이 아니다.
struct RecordingLocationCandidate {
    std::string store_id, segment_id, media_epoch_id;
    std::int64_t order_sequence{0}, media_pts{0};
    std::int32_t time_base_num{1}, time_base_den{1000000000};
    std::optional<RecordingUtcMappingV1> mapping;
};
struct RecordingLocationResult {
    RecordingLocationState state{RecordingLocationState::None};
    std::vector<RecordingLocationCandidate> candidates;
    bool has_unknown{false};
};
struct ConsumerReferenceLocation {
    RecordingOriginalCandidate original;
    RecordingLocationResult location;
    std::string reason;
};
struct ConsumerReferenceResolution {
    std::vector<ConsumerReferenceLocation> exact;
    std::vector<RecordingOriginalCandidate> unindexed;
    std::string reason;
};
// 호출자가 이미 확인한 미디어 구간만 입력한다. association 점/UTC 요청이나 playable 증명이 아니다.
struct ConfirmedMediaInterval {
    std::string source_id, store_id, media_epoch_id, segment_id;
    std::int32_t time_base_num{1}, time_base_den{1000000000};
    std::int64_t start_pts{0}, end_pts{0};
};

// Confirmed는 최소 한 후보의 미디어 구간 coverage가 확인됨을 뜻한다(UTC는 known 후보).
// 다른 불확실 후보·unplaced를 포함한 전체 완전성, 후보 유일성·프레임 고유성·재생 가능성은 아니다.
enum class RecordingRangeCoverage { Confirmed, Unknown, Gap };
struct RecordingRangeCandidate {
    std::string store_id, segment_id, media_epoch_id;
    std::int64_t order_sequence{0};
    std::int32_t time_base_num{1}, time_base_den{1000000000};
    RecordingUtcMappingV1 mapping;
    std::optional<std::int64_t> media_start_pts, media_end_pts;
    std::string reason;
};
struct RecordingRangeSlice {
    // ResolveMediaRange에서는 PTS, ResolveUtcRange에서는 UTC ns인 query 축 좌표다.
    std::int64_t start{0}, end{0};
    RecordingRangeCoverage coverage{RecordingRangeCoverage::Gap};
    std::vector<RecordingRangeCandidate> candidates;
};
struct RecordingRangeResult {
    std::vector<RecordingRangeSlice> slices;
    // UTC 위치가 불명확한 mapping을 UTC축에 임의로 배치하지 않는다.
    std::vector<RecordingRangeCandidate> unplaced;
    bool deleted{false};
};
} // namespace recording

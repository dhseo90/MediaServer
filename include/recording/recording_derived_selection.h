// 파일 용도: 불변 요청을 직접 구간 증거와 저장된 원본 후보에 대조한다. 재생 가능 판정은 아니다.
#pragma once
#include "analysis/decoded_interval_evidence.h"
#include "recording/recording_read_service.h"
#include "recording/recording_presentation_interval.h"

namespace recording {
enum class DerivedSliceState { Confirmed, Unknown, Gap, Deleted, Ambiguous, AwaitingPostRoll };
struct DerivedSourceEvidence {
    RecordingSegmentV2 segment;
    std::optional<RecordingSourceBindingV1> binding;
    bool deleted{false};
    // 내부 snapshot의 lifecycle/결박 불명확성. 저장 shape나 decoded identity 증명이 아니다.
    bool available_for_selection{true};
};
struct DerivedSelectionCandidate {
    RecordingSegmentV2 segment;
    std::optional<RecordingConsumerOriginalV1> original;
    std::int64_t media_start_pts{0}, media_end_pts{0};
    std::optional<RecordingUtcMappingV1> utc_mapping;
};
struct DerivedSelectionSlice {
    std::int64_t start_ns{0}, end_ns{0};
    DerivedSliceState state{DerivedSliceState::Unknown};
    std::vector<DerivedSelectionCandidate> candidates;
    std::string reason;
    // 신규 native profile에서만 사용한다. start/end_ns는 표시·읽기용 외접 정수 범위다.
    std::optional<PresentationInterval> presentation{};
};
struct DerivedRecordingSelection {
    RecordingConsumerReferenceV1 reference;
    std::int64_t expanded_start_ns{0}, expanded_end_ns{0};
    std::vector<DerivedSelectionSlice> slices;
    std::vector<RecordingRangeCandidate> unplaced;
    bool complete{false};
    std::string reason;
    bool native_file_intervals{false};
};
// UTC range는 동일 catalog snapshot에서 확인한 결과를 전달한다. 새 원장 shape를 만들지 않는다.
bool SelectDerivedRecording(const RecordingConsumerReferenceV1& reference,
    const analysis::DecodedIntervalSnapshot& evidence,
    const std::vector<DerivedSourceEvidence>& sources,
    const RecordingRangeResult* utc_range, DerivedRecordingSelection* output, std::string* error,
    bool prefer_native=false);
} // namespace recording

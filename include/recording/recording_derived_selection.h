// 파일 용도: 분석 증거와 저장 후보로 파생 구간을 선택하는 application 알고리즘.
#pragma once
#include "analysis/decoded_interval_evidence.h"
#include "recording/recording_selection_values.h"

namespace recording {
// UTC range는 동일 catalog snapshot에서 확인한 결과를 전달한다. 새 원장 shape를 만들지 않는다.
bool SelectDerivedRecording(const RecordingConsumerReferenceV1& reference,
    const analysis::DecodedIntervalSnapshot& evidence,
    const std::vector<DerivedSourceEvidence>& sources,
    const RecordingRangeResult* utc_range, DerivedRecordingSelection* output, std::string* error,
    bool prefer_native=false);
} // namespace recording

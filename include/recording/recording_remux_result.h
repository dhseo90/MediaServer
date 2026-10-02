// 파일 용도: remux 실행과 엄격 Ready 검증 사이의 결과 값. 검증 완료를 자체적으로 보증하지 않는다.
#pragma once
#include "recording/recording_selection_values.h"
#include "recording/recording_derived_provenance.h"

namespace recording {
struct DerivedRemuxResult {
    DerivedRecordingSelection selection;
    std::vector<DerivedRemuxOutput> outputs;
    std::vector<DerivedRemuxUnfulfilled> unfulfilled;
    bool verified_output{false},request_fully_satisfied{false};
    std::string error;
};
} // namespace recording

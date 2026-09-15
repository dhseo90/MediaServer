#pragma once
#include "recording/recording_journal.h"
namespace recording::detail {
// catalog 내부 checkpoint 비교. 원본 semantic 검증을 대신하지 않는다.
inline bool SameCheckpointSequence(const std::vector<RecordingMutationV1>& original,
                                   const std::vector<RecordingMutationV1>& candidate) {
    if (original.size() != candidate.size()) return false;
    for (std::size_t i = 0; i < original.size(); ++i) {
        // Serializer는 schema를 고정하고 미지원 enum 이름을 합칠 수 있다.
        if (original[i].schema != candidate[i].schema ||
            original[i].mutation_type != candidate[i].mutation_type) return false;
        const auto canonical = SerializeRecordingMutationV1(original[i]);
        if (canonical.empty() || canonical != SerializeRecordingMutationV1(candidate[i])) return false;
    }
    return true;
}
}

#pragma once
// 내부 수락 상태와 내구 최종화 순서. 공개 route/저장 계약이 아니다.
#include "recording/recording_contracts.h"
namespace recording::detail {
// 호출자는 현재 segment의 generation/track과 증가 ordinal을 검증한 뒤 전달한다.
inline bool AcceptSourceSample(bool accepted, RecordingSourceBindingV1& binding, RecordingSourceSampleV1 sample) {
    if(!accepted)return false;
    if(binding.samples.size()<4096)binding.samples.push_back(sample);
    else {
        binding.index_complete=false;
        binding.incomplete_reason="sample-index-cap";
    }
    binding.last_accepted_ordinal=sample.ordinal;
    return true;
}
template<class Validate, class Publish, class Commit, class Clear>
bool FinalizeInOrder(Validate validate, Publish publish, Commit commit, Clear clear) {
    return validate()&&publish()&&commit()&&clear();
}
}

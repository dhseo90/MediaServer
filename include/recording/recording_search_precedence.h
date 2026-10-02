// 파일 용도: 확인된 동일 원본 구간에만 이벤트 재생 우선순위를 적용하는 순수 값 계약.
#pragma once
#include "recording/recording_query_values.h"
namespace recording {
struct SearchPlaybackCandidate {
    ConfirmedMediaInterval original;
    std::string event_id, output_segment_id;
    // adapter가 현재 파일 건강도와 저장된 원본 대응을 각각 확인한 경우만 true다.
    bool playable{false}, provenance_verified{false};
};
struct SearchPlaybackSlice {
    ConfirmedMediaInterval original;
    std::string playback_segment_id, event_id;
};
// 원본 PTS 반개구간을 빠짐없이 분할한다. UTC는 동등성 판단에 사용하지 않는다.
// candidate의 original과 output 파일 시간축 사이 변환은 이후 재생 resolver가 담당한다.
bool SelectSearchPlayback(const ConfirmedMediaInterval& original,
    const std::vector<SearchPlaybackCandidate>& candidates,
    std::vector<SearchPlaybackSlice>* output, std::string* error);
} // namespace recording

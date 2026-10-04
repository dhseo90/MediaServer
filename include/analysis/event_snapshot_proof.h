// 파일 용도: 실제 저장한 snapshot과 선택한 raw frame의 원본 연관을 내부 증거로 보존한다.
#pragma once
#include "analysis/analysis_types.h"
namespace analysis {
struct EventSnapshotProof {
    OriginalSampleIdentity original;
    int width{0},height{0};
    std::string rgb_sha256,image_sha256;
    std::string event_epoch;
};
// TimestampMatch 자체는 증명이 아니다. 소비자는 현재 원본 decode RGB와 digest를 대조해야 한다.
std::optional<EventSnapshotProof> BuildEventSnapshotProof(const RawVideoFrame&,
    const std::vector<unsigned char>& encoded,const SourceAssociation& event_source,const std::string& event_epoch);
std::string SnapshotBytesSha256(const unsigned char*,std::size_t);
std::string SnapshotRgbSha256(const RawVideoFrame&);
std::string SerializeEventSnapshotProof(const EventSnapshotProof&);
bool ParseEventSnapshotProof(const std::string&,EventSnapshotProof*);
}

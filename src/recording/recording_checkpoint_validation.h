// 파일 용도: 녹화 체크포인트 캐시의 입장 상한과 원장 레코드 동일성을 판정한다.
#pragma once
#include "recording/recording_journal.h"
namespace recording::detail {
inline constexpr std::size_t kCheckpointCacheBytes=64U*1024U*1024U;
inline constexpr std::size_t kCheckpointCacheRecords=8192;
inline bool AddCheckpointCacheCharge(std::size_t value,std::size_t* total) {
    if(!total||*total>kCheckpointCacheBytes||value>kCheckpointCacheBytes-*total)return false;
    *total+=value;return true;
}
// 보관 입장 상한이며 shadow projection/allocator/RSS의 상한이 아니다.
inline bool CheckpointCacheAdmissible(const std::vector<RecordingMutationV1>& records) {
    if(records.size()>kCheckpointCacheRecords)return false;
    std::size_t bytes=0;
    for(const auto& m:records)
        if(!AddCheckpointCacheCharge(sizeof(m),&bytes)||
           !AddCheckpointCacheCharge(m.schema.size(),&bytes)||
           !AddCheckpointCacheCharge(m.mutation_id.size(),&bytes)||
           !AddCheckpointCacheCharge(m.entity_id.size(),&bytes)||
           !AddCheckpointCacheCharge(m.payload_json.size(),&bytes))return false;
    return true;
}
inline bool SameCheckpointPrefix(const std::vector<RecordingMutationV1>& prefix,
                                 const std::vector<RecordingMutationV1>& records) {
    if(prefix.size()>records.size())return false;
    for(std::size_t i=0;i<prefix.size();++i){
        const auto& a=prefix[i];const auto& b=records[i];
        if(a.schema!=b.schema||a.mutation_type!=b.mutation_type||a.mutation_id!=b.mutation_id||
           a.entity_id!=b.entity_id||a.occurred_at_ms!=b.occurred_at_ms||a.payload_json!=b.payload_json)return false;
    }
    return true;
}
// catalog 내부 checkpoint 비교. 원본 semantic 검증을 대신하지 않는다.
inline bool SameCheckpointSequence(const std::vector<RecordingMutationV1>& original,
                                   const std::vector<RecordingMutationV1>& candidate) {
    // Envelope serializer는 검증을 수행하지 않는다. 고정 schema/enum 이름의 충돌을
    // 포함한 원래 전체 필드를 대조하므로 canonical 임시 문자열은 필요하지 않다.
    return original.size()==candidate.size()&&SameCheckpointPrefix(original,candidate);
}
// 공유 주소는 내용 검증의 증명이 아니다. 값 표현과 동일한 논리 charge/전체 비교를 유지한다.
inline bool CheckpointCacheAdmissible(const RecordingMutationHandles& records) {
    if(records.size()>kCheckpointCacheRecords)return false;
    std::size_t bytes=0;
    for(const auto& handle:records) {
        if(!handle)return false;
        const auto& m=*handle;
        if(!AddCheckpointCacheCharge(sizeof(m),&bytes)||
           !AddCheckpointCacheCharge(m.schema.size(),&bytes)||
           !AddCheckpointCacheCharge(m.mutation_id.size(),&bytes)||
           !AddCheckpointCacheCharge(m.entity_id.size(),&bytes)||
           !AddCheckpointCacheCharge(m.payload_json.size(),&bytes))return false;
    }
    return true;
}
inline bool SameCheckpointPrefix(const RecordingMutationHandles& prefix,
                                 const RecordingMutationHandles& records) {
    if(prefix.size()>records.size())return false;
    for(std::size_t i=0;i<prefix.size();++i) {
        if(!prefix[i]||!records[i])return false;
        const auto& a=*prefix[i];const auto& b=*records[i];
        if(a.schema!=b.schema||a.mutation_type!=b.mutation_type||a.mutation_id!=b.mutation_id||
           a.entity_id!=b.entity_id||a.occurred_at_ms!=b.occurred_at_ms||a.payload_json!=b.payload_json)return false;
    }
    return true;
}
inline bool SameCheckpointSequence(const RecordingMutationHandles& original,
                                   const RecordingMutationHandles& candidate) {
    return original.size()==candidate.size()&&SameCheckpointPrefix(original,candidate);
}
}

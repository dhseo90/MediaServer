// 파일 용도: catalog 소유 원장에 저장하는 내부 파생 job 계약. 공개 이벤트/metadata 계약과 분리한다.
#pragma once
#include "recording/recording_contracts.h"

namespace recording {
struct DerivedRecordingSelection;
struct DerivedSourceEvidence;
struct DerivedJobSourceV1 { RecordingSegmentV2 segment;RecordingSourceBindingV1 binding; };
struct DerivedJobOutputPlanV1 {
    std::uint32_t source_index{0};
    std::string output_id,order_request_id,temporary_relpath,final_relpath;
};
struct DerivedJobIntentV1 {
    std::string schema{"media-server.derived-job-intent.v1"};
    std::string job_id,attempt_id,protection_token;
    std::string profile{"h264-mp4-to-mpegts-video-only-v1"};
    RecordingConsumerReferenceV1 reference;
    // 엄격 검증된 compact selection JSON. segment table을 slice마다 복제하지 않는다.
    std::string selection_json;
    std::vector<DerivedJobSourceV1> sources;
    std::vector<DerivedJobOutputPlanV1> outputs;
    std::uint64_t reserved_bytes{0};
    std::int64_t created_at_ms{0};
};
enum class DerivedJobState { Intent,Ready,Committed,Complete,Failed };
struct DerivedJobRecordV1 {
    DerivedJobIntentV1 intent;
    DerivedJobState state{DerivedJobState::Intent};
    std::string failure_reason;
    std::int64_t cleaned_at_ms{0};
};
// 동일 요청/선택/profile은 동일 ID. 실행 attempt는 1회, 예약/경로를 다르게 재사용하면 충돌이다.
bool BuildDerivedJobIntent(const DerivedRecordingSelection&,const std::vector<DerivedSourceEvidence>&,
    std::uint64_t reserved_bytes,std::int64_t created_at_ms,DerivedJobIntentV1*,std::string*);
bool RestoreDerivedJobSelection(const DerivedJobIntentV1&,DerivedRecordingSelection*,std::string*);
bool ValidateDerivedJobIntent(const DerivedJobIntentV1&,std::string*);
std::string SerializeDerivedJobIntent(const DerivedJobIntentV1&);
bool ParseDerivedJobIntent(const std::string&,DerivedJobIntentV1*,std::string*);
std::string SerializeDerivedJobRecord(const DerivedJobRecordV1&);
bool ParseDerivedJobRecord(const std::string&,DerivedJobRecordV1*,std::string*);
bool DerivedJobActive(const DerivedJobRecordV1&);
} // namespace recording

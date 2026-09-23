// 파일 용도: catalog 소유 원장에 저장하는 내부 파생 job 계약. 공개 이벤트/metadata 계약과 분리한다.
#pragma once
#include "recording/recording_contracts.h"
#include "recording/recording_derived_provenance.h"

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
    std::string profile{"h264-mp4-to-fmp4-video-only-v1"};
    RecordingConsumerReferenceV1 reference;
    // 엄격 검증된 compact selection JSON. segment table을 slice마다 복제하지 않는다.
    std::string selection_json;
    std::vector<DerivedJobSourceV1> sources;
    std::vector<DerivedJobOutputPlanV1> outputs;
    std::uint64_t reserved_bytes{0};
    std::int64_t created_at_ms{0};
};
enum class DerivedJobState { Intent,Ready,Committed,Complete,Failed };
struct DerivedJobDirectoryV1 {
    std::string relative_path;
    std::uint64_t device{0},inode{0};
};
struct DerivedJobFileV1 {
    std::uint32_t output_index{0};
    std::uint64_t device{0},inode{0};
    // root의 빈 상대경로와 각 temp/final 부모 component의 실제 identity.
    std::vector<DerivedJobDirectoryV1> directories;
    std::uint64_t initial_size{0};
    std::string initial_sha256;
};
struct DerivedJobReadyOutputV1 {
    std::uint32_t source_index{0};
    RecordingSegmentV2 segment;
    DerivedRemuxOutput provenance;
};
struct DerivedJobReadyV1 {
    std::vector<DerivedJobReadyOutputV1> outputs;
    std::vector<DerivedRemuxUnfulfilled> unfulfilled;
    bool verified_output{false},request_fully_satisfied{false};
    std::int64_t ready_at_ms{0};
    std::string manifest_sha256;
};
struct DerivedJobRecordV1 {
    DerivedJobIntentV1 intent;
    DerivedJobState state{DerivedJobState::Intent};
    std::string failure_reason;
    std::int64_t cleaned_at_ms{0};
    std::vector<DerivedJobFileV1> files;
    std::optional<DerivedJobReadyV1> ready;
};
// 동일 요청/선택/profile은 동일 ID. 실행 attempt는 1회, 예약/경로를 다르게 재사용하면 충돌이다.
bool BuildDerivedJobIntent(const DerivedRecordingSelection&,const std::vector<DerivedSourceEvidence>&,
    std::uint64_t reserved_bytes,std::int64_t created_at_ms,DerivedJobIntentV1*,std::string*);
bool RestoreDerivedJobSelection(const DerivedJobIntentV1&,DerivedRecordingSelection*,std::string*);
bool MatchesDerivedJobSelection(const DerivedJobIntentV1&,const DerivedRecordingSelection&,std::string*);
bool ValidateDerivedJobIntent(const DerivedJobIntentV1&,std::string*);
std::string SerializeDerivedJobIntent(const DerivedJobIntentV1&);
bool ParseDerivedJobIntent(const std::string&,DerivedJobIntentV1*,std::string*);
std::string SerializeDerivedJobRecord(const DerivedJobRecordV1&);
bool ParseDerivedJobRecord(const std::string&,DerivedJobRecordV1*,std::string*);
bool DerivedJobActive(const DerivedJobRecordV1&);
struct DerivedRemuxResult;
bool BuildDerivedJobReady(const DerivedJobRecordV1&,const DerivedRemuxResult&,
    const std::vector<std::int64_t>& output_order_sequences,std::int64_t ready_at_ms,
    DerivedJobRecordV1*,std::string*);
// strict canonical 하위 값은 원장 전이의 prefix/불변 대조에도 사용한다.
std::string SerializeDerivedJobFile(const DerivedJobFileV1&);
std::string SerializeDerivedJobReady(const DerivedJobReadyV1&);
} // namespace recording

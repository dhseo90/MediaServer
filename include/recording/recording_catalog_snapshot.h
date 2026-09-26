// 파일 용도: 녹화 카탈로그 세대 snapshot의 요약 행과 직렬화 계약을 선언한다.
#pragma once
#include "recording/recording_generation_manifest.h"
#include "recording/recording_identity_shard.h"
#include "recording/recording_derived_job.h"

namespace recording {
struct RecordingCatalogSourceSummary {
    std::string id, channel, source, generation, track;
    std::uint64_t order{0}, sample_count{0};
    std::string latest_mutation_id;
};
struct RecordingCatalogJobSummary {
    std::string id, channel, reference;
    DerivedJobState state{DerivedJobState::Intent};
    std::uint64_t files{0}, reserved_bytes{0};
    std::vector<std::string> output_ids, source_ids;
    std::string latest_mutation_id;
};
// 삭제 완료 V2의 hot projection 영수증이다. 원본 segment/tombstone 전문은 identity가 결박한
// cold mutation에서 호출 단위로 재획득하며, 이 값만으로 재생 또는 상세 의미를 복원하지 않는다.
struct RecordingRetiredV2Receipt {
    std::string segment_id, store_id, source_id, channel_id, order_request_id, media_epoch_id, tombstone_id;
    std::int64_t order_sequence{0};
    std::int64_t media_start_pts{0};
    std::optional<std::int64_t> media_end_pts;
    std::int32_t time_base_num{1}, time_base_den{1000000000};
    RecordingRetentionClass retention_class{RecordingRetentionClass::Unknown};
    std::int64_t deleted_at_ms{0};
    std::string deletion_reason, prior_relative_path, deletion_mutation_id;
    std::string segment_sha256, tombstone_sha256;
    // true일 때만 양 끝이 있는 보수적 UTC prefilter다. false는 unknown/open/uncertain으로
    // 후보 제외 근거가 될 수 없다.
    bool utc_exclusion_safe{false};
    std::optional<std::int64_t> utc_min_ns, utc_max_ns;
};
// 고정 필드 순서의 canonical JSON object(LF 없음). 배열의 의미 있는 순서는 보존한다.
// 기존 domain 값 상한만 검사하며 원문 locator/참조/상태 전이 또는 제품 import를 검증하지 않는다.
// crypto-off도 동일하게 동작하고 실패 시 caller output은 불변이다.
bool SerializeRecordingCatalogSourceSummary(const RecordingCatalogSourceSummary&, std::string*, std::string* error);
bool ParseRecordingCatalogSourceSummary(const std::string&, RecordingCatalogSourceSummary*, std::string* error);
bool SerializeRecordingCatalogJobSummary(const RecordingCatalogJobSummary&, std::string*, std::string* error);
bool ParseRecordingCatalogJobSummary(const std::string&, RecordingCatalogJobSummary*, std::string* error);
bool SerializeRecordingRetiredV2Receipt(const RecordingRetiredV2Receipt&, std::string*, std::string* error);
bool ParseRecordingRetiredV2Receipt(const std::string&, RecordingRetiredV2Receipt*, std::string* error);
// 검증된 삭제 값에서 공통 영수증을 도출한다. 파일/전이 권위는 호출자가 확인한다.
bool BuildRecordingRetiredV2Receipt(const RecordingTombstoneV2&,const std::string& relative_path,
    const std::string& deletion_mutation_id,RecordingRetiredV2Receipt*,std::string* error);
struct RecordingCatalogSnapshotRow {
    std::string kind, key;
    // strict JSON 값의 raw bytes다. 내부 공백/escape/필드 순서를 정규화하지 않는다.
    // domain canonical 동등성·내부 ID·cross-map 검증은 import 책임이다.
    std::string value_json;
};
struct RecordingCatalogSnapshot {
    std::string store_id;
    // 배타적 경계: snapshot/identity ordinal < cut_ordinal, active ordinal >= cut_ordinal.
    std::uint64_t generation{0}, cut_ordinal{0};
    RecordingGenerationFile identity_head;
    std::vector<RecordingCatalogSnapshotRow> rows;
};
inline constexpr std::uint64_t kRecordingCatalogSnapshotMaxBytes = 1024ULL * 1024 * 1024;
// 행은 (kind,key) 사전순이다. 정렬을 자동 보정하지 않으며 마지막 LF가 필수다.
// 실패하면 caller output을 변경하지 않는다. 파일 IO·제품 Open/Append/Checkpoint 연결 없음.
bool SerializeRecordingCatalogSnapshot(const RecordingCatalogSnapshot&, std::string*, std::string* error);
bool ParseRecordingCatalogSnapshot(const std::string&, std::uint64_t byte_admission,
    RecordingCatalogSnapshot*, std::string* error);
// 이미 파일 bytes/size/SHA를 검증한 manifest의 구조적 결박만 검사한다.
// 이 함수는 SHA를 계산하지 않으며 manifest가 결박한 snapshot bytes의 검증을 대체하지 않는다.
bool ValidateRecordingCatalogSnapshotManifest(const RecordingCatalogSnapshot&,
    const RecordingGenerationManifest&, std::string* error);
// 성공한 chain 검증 결과를 입력으로 받는다. 공개 DTO 자체는 암호학적 증명 토큰이 아니다.
// accepted-state.value는 {"mutationId":string,"globalOrdinal":uint64,"type":string}이다.
// 모든 물리 행의 최대 ordinal과 배타 cut, catalog segment_state 분류의 최초 ID 전수와
// accepted-state 행의 일대일 대응을 검사한다. domain 전이/cross-map 의미는 검증하지 않는다.
bool ValidateRecordingCatalogSnapshotAcceptedStates(const RecordingCatalogSnapshot&,
    const RecordingIdentityChainResult&, std::string* error);
} // namespace recording

#pragma once
#include "recording/recording_generation_manifest.h"
#include "recording/recording_identity_shard.h"

namespace recording {
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

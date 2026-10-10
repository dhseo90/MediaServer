// 파일 용도: 원본을 대체하지 않는 불변 증거 패키지의 versioned 값 계약.
#pragma once
#include "recording/evidence_frame_extractor.h"
#include <string_view>

namespace recording {
struct EvidenceReferenceV1 {
    std::string kind, id, state, reason, sha256;
    std::optional<std::uint64_t> asset_index;
    std::string derivation_id{};
};
struct EvidenceAssetV1 {
    std::string name, content_type, sha256;
    std::uint64_t size_bytes{0};
};
struct EvidenceObservationSnapshotV2Fields {
    std::size_t frame_index{};
    std::string png_sha256, state, reason;
    // candidate 값 자체를 보존한다. ID/hash만으로 catalog를 다시 읽지 않는다.
    std::vector<ReferencedObservationV1> candidates;
};
using EvidenceObservationSnapshotV2=RecordingMemoryValue<EvidenceObservationSnapshotV2Fields>;
struct EvidencePackageV1Fields {
    std::string schema{"media-server.evidence-package.v1"};
    std::string channel_id, hit_id, query_kind, observation_id, track_id, analysis_namespace;
    std::string store_id, media_epoch_id;
    std::vector<std::string> event_ids;
    std::int64_t created_at_ms{0};
    std::optional<std::int64_t> start_ns, end_ns, uncertainty_ns;
    std::string time_provenance, status;
    std::string retention{"evidence-hold"}, selection_policy{"uniform-source-samples-v1"};
    std::vector<EvidenceReferenceV1> references;
    std::vector<EvidenceFrameV1> frames;
    std::vector<EvidenceAssetV1> assets;
    // v2 내부 opt-in 경로에만 존재한다. v1 codec/생성 경로는 기존 바이트를 유지한다.
    std::string observation_source_id;
    std::vector<EvidenceObservationSnapshotV2> observation_snapshots;
};
using EvidencePackageV1=RecordingMemoryValue<EvidencePackageV1Fields>;
std::size_t EvidencePackageWorkspaceBytes(std::string_view json);
void BindEvidencePackageMemory(EvidencePackageV1&, SearchModelResidency::Reservation&, std::size_t raw_bytes);
bool ValidateEvidencePackage(const EvidencePackageV1&, std::string* error);
std::string SerializeEvidencePackage(const EvidencePackageV1&);
bool ParseEvidencePackage(const std::string&, EvidencePackageV1*, std::string* error);
// 공개 값 직렬화에도 같은 escaping을 쓴다. 파일 경로는 이 값 계약에 들어가지 않는다.
std::string EvidenceJsonQuote(const std::string&);
} // namespace recording

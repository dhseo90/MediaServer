// 파일 용도: 세대 카탈로그 snapshot을 이동 가능한 scratch projection으로 표현한다.
#pragma once
#include "recording/recording_catalog_snapshot.h"
#include <map>
#include <set>

namespace recording {
struct RecordingGenerationSourceProjection {
    RecordingCatalogSourceSummary summary;
    RecordingIdentityFirstAcceptance origin;
};
struct RecordingGenerationJobProjection {
    RecordingCatalogJobSummary summary;
    RecordingIdentityFirstAcceptance origin;
};
// 이동 소비 가능한 scratch 값이다. Catalog attachment/FD/런타임 lease/cache는 포함하지 않는다.
struct RecordingCatalogGenerationProjection {
    RecordingGenerationManifest manifest;
    std::map<std::string,RecordingSegmentV1> segments;
    std::map<std::string,RecordingSegmentV2> segments_v2;
    std::map<std::string,RecordingSegmentStateV2> states_v2;
    std::map<std::string,RecordingTombstoneV1> tombstones;
    std::map<std::string,RecordingTombstoneV2> tombstones_v2;
    std::map<std::string,std::string> media_paths,deletion_reasons;
    std::map<std::string,EventRecordingLinkV1> event_links;
    std::map<std::string,AnalysisObservationV1> observations;
    std::map<std::string,AnalysisObservationV2> observations_v2;
    std::map<std::string,RecordingConsumerReferenceV1> consumer_references;
    std::map<std::string,ReferencedObservationV1> referenced_observations;
    std::set<std::string> derived_accepted_references,mutation_ids;
    std::map<std::string,RecordingGenerationSourceProjection> source_bindings;
    std::map<std::string,RecordingGenerationJobProjection> derived_jobs;
    std::map<std::string,RecordingIdentityFirstAcceptance> accepted_states;
    RecordingOrderHistorySnapshot order_history;
    std::map<std::string,RecordingOrderReservationV1> orders;
    // 진행 작업에 필요한 원문만 보관한다. inactive detail은 origin을 통해 나중에 획득한다.
    std::map<std::string,DerivedJobRecordV1> active_jobs;
    std::map<std::string,RecordingSourceBindingV1> active_source_bindings;
    // 영속 pending terminal link에서 도출한 복구 후보다. 실제 runtime hold/SQLite는 갱신하지 않는다.
    std::map<std::string,std::uint64_t> pending_hold_counts;
};
// caller는 managed 독점 lease 및 검증된 manifest/chain을 유지한다. DTO는 신뢰 토큰이 아니다.
// snapshot bytes SHA와 domain/cross-map을 검증하고 진행 job/source의 원문만 cold 검증한다.
// cold admission은 각 물리 행 bytes 상한이며 총 RSS 상한이 아니다. 호출마다 관련 archive
// 전체 SHA IO가 필요하다. 비활성 원문/과거 전이를 재검증한 결과로 취급하면 안 된다.
// active 적용·SQLite·게시·cutover·B Open은 하지 않는다. 실패/crypto-off output 불변.
bool BuildRecordingCatalogGenerationProjection(const std::filesystem::path& root,
    const RecordingGenerationManifest&,const RecordingIdentityChainResult&,
    const RecordingCatalogSnapshot&,std::uint64_t cold_byte_admission,
    RecordingCatalogGenerationProjection* output,std::string* error);
} // namespace recording

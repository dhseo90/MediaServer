// 파일 요약: JSONL 원장을 source-of-truth로 사용하는 녹화 catalog projection을 선언한다.
// 동작 요약: SQLite primary와 in-memory fallback이 같은 range query와 저장 port를 제공한다.
#pragma once

#include <cstdint>
#include <atomic>
#include <condition_variable>
#include <deque>
#include <filesystem>
#include <functional>
#include <memory>
#include <mutex>
#include <optional>
#include <string>
#include <set>
#include <unordered_map>
#include <unordered_set>
#include <utility>

#include "recording/recording_journal.h"
#include "recording/recording_catalog_snapshot.h"
#include "recording/recording_retained_rows.h"
#include "recording/recording_store_port.h"
#include "recording/retention_coordinator.h"
#include "recording/recording_timeline.h"
#include "recording/recording_query_values.h"
#include "recording/recording_search_source.h"

struct sqlite3;

namespace recording {
struct RecordingIdentityChainResult;
struct SearchDocument;
struct RecordingCatalogSnapshot;

struct RecordingCatalogRecoveryReport {
    std::size_t replayed_mutation_count{0};
    std::size_t duplicate_mutation_count{0};
    std::size_t projection_error_count{0};
    std::size_t corrupt_line_count{0};
    std::size_t truncated_tail_count{0};
    std::size_t writer_cleanup_recovered_count{0};
    std::size_t writer_cleanup_error_count{0};
    bool sqlite_quarantined{false};
    std::filesystem::path sqlite_quarantine_path;
};

struct RecordingCatalogStatusCapacity {
    std::uint64_t continuous_bytes{0};
    std::uint64_t event_bytes{0};
};

// HTTP 상태 응답 전용 불변 값이다. 보존·삭제·admission·timeline 입력으로 재사용하지 않는다.
struct RecordingCatalogStatusSnapshot {
    std::string catalog_mode;
    RecordingCatalogRecoveryReport recovery;
    std::unordered_map<std::string, RecordingCatalogStatusCapacity> channels;
    // 공개 JSON에는 노출하지 않는 응답 완료 직전 검증 세대다.
    std::uint64_t checkpoint_generation{0};
};

struct RecordingOrphanReport {
    std::size_t normal_orphan_count{0};
    std::size_t corrupt_orphan_count{0};
    std::vector<std::filesystem::path> normal_orphans;
    std::vector<std::filesystem::path> corrupt_orphans;
};

struct EventSourceLease {
    std::vector<RetentionCandidate> sources;
};

struct RecordingLocationCatalogSnapshot {
    std::vector<RecordingSegmentV2> segments;
    std::vector<std::string> deleted_segment_ids;
};
struct RecordingDerivedSourceSnapshotEntry {
    RecordingSegmentV2 segment;
    std::optional<RecordingSourceBindingV1> binding;
    RecordingLifecycle lifecycle{RecordingLifecycle::Unknown};
    bool deleted{false};
};
struct RecordingDerivedOutputAvailability {
    std::string segment_id, relative_path;
    RecordingLifecycle lifecycle{RecordingLifecycle::Unknown};
    // catalog 상태만 확인한다. 현재 파일 hash/read 건강도를 재검증한 값이 아니다.
    bool catalog_available{false};
};
struct RecordingDerivedReferenceJob {
    DerivedJobRecordV1 job;
    std::vector<RecordingDerivedOutputAvailability> outputs;
};
struct RecordingDerivedReferenceResult {
    bool managed{false},truncated{false};
    std::string state{"unknown"},reason;
    std::vector<RecordingDerivedReferenceJob> jobs;
};

struct RecordingOriginalResult {
    std::vector<RecordingOriginalCandidate> exact, unknown;
};

class RecordingCatalogHistoryRows;
class RecordingCatalog final : public RecordingStorePort {
    friend class RecordingRuntimeStorage;
    friend struct RecordingAggregateResourceProbe;
#if MEDIA_SERVER_RECORDING_GENERATION_TESTING
    friend struct RecordingCatalogGenerationScratchProbe;
    friend struct RecordingGenerationPreappendProbe;
    friend struct RecordingGenerationAppendProbe;
    friend struct RecordingGenerationConsumersProbe;
    friend struct RecordingGenerationRequestProofProbe;
#endif
public:
    const std::shared_ptr<SearchModelResidency>& SearchResidency()const{return search_residency_;}
    const std::shared_ptr<RecordingScratchResidency>& ScratchResidency()const{return journal_.ScratchOwner();}
    struct Options {
        std::filesystem::path sqlite_path;
        std::filesystem::path media_root;
        bool prefer_sqlite{true};
        bool enable_v2_storage{false};
        // 내부 검증/구성 전용 opt-in. 서버 기본값과 기존 v1 쓰기는 바꾸지 않는다.
        bool enable_generation_writes{false};

        Options() = default;
        Options(std::filesystem::path sqlite,
                std::filesystem::path media,
                bool prefer)
            : sqlite_path(std::move(sqlite)),
              media_root(std::move(media)),
              prefer_sqlite(prefer) {}
    };

    RecordingCatalog(RecordingJournal& journal, Options options);
    ~RecordingCatalog() override;
    bool Open(std::string* error);
    // B 내부 opt-in 전용. 실제 writer/service 소비자 연결은 별도 단계다.
    bool ReserveRecordingOrder(const std::string& store,const std::string& request,
        const std::string& segment,const std::string& channel,RecordingOrderReservationV1* result,std::string* error);
    // 검증된 chain을 선수조건으로 현재 값만 내보내는 내부 후보다. 게시/B Open은 하지 않는다.
    // cold 링크의 실제 type/ordinal 및 원문 의미는 여기서 재읽지 않는다. cutover 원문 전수
    // 검증·domain 대조와 import/use의 locator 검증은 별도 필수이며 실패 시 output은 불변이다.
    bool ExportGenerationSnapshot(const RecordingIdentityChainResult&, std::uint64_t generation,
        std::uint64_t cut_ordinal, RecordingCatalogSnapshot* output, std::string* error) const;
    bool SnapshotLocationsV2(const std::string& channel_id,
                             RecordingLocationCatalogSnapshot* result, std::string* error) const;
    bool CaptureSearchSource(const std::vector<std::string>& channels,
        const RecordingSearchModel* previous, SearchSourceBatch* result, std::string* error,
        SearchModelLimits limits = {}, bool include_observations = true) const;
    bool ValidateSearchSource(const SearchSourceBatch&, std::string* error) const;
    bool ValidateManagedWriterBinding(const RecordingJournal& journal,
                                     const std::filesystem::path& root,
                                     const std::string& store_id, std::string* error) const;
    bool Checkpoint(std::string* error);
    bool FindDerivedJob(const std::string& job_id,std::optional<DerivedJobRecordV1>* result,std::string* error) const;
    // 기존 event/source에 한정한 얇은 ID 조회. 과거 job 본문 전체를 materialize하지 않는다.
    bool FindEventDerivedJobIds(const std::string& channel,const std::string& event,const std::string& source_segment,
        std::vector<std::string>* result,std::string* error,const std::function<bool()>& cancelled = {}) const;
    bool SnapshotDerivedJobs(std::vector<DerivedJobRecordV1>* result,std::string* error) const;
    bool SnapshotActiveDerivedJobs(std::size_t limit,std::vector<DerivedJobRecordV1>* result,bool* more,std::string* error) const;
    // 내부 caller는 실제 소유물 cleanup 완료 후 호출한다. 5.3b가 inode/경로 증명을 담당한다.
    bool FailDerivedJobAfterCleanup(const std::string& job_id,const std::string& attempt_id,
        const std::string& reason,std::int64_t cleaned_at_ms,std::string* error);
    bool FinalizeBoundSegmentV2(const RecordingSegmentV2&, const RecordingSourceBindingV1&, const std::string& path, std::string* error);
    bool ValidateBoundFinalizeRecoveryV2(const RecordingSegmentV2&, const RecordingSourceBindingV1&, const std::string& path, std::string* error) const;
    bool RecoverBoundSegmentV2(const RecordingSegmentV2&, const RecordingSourceBindingV1&, const std::string& path, bool* inserted, std::string* error);
    std::optional<RecordingSourceBindingV1> FindSourceBinding(const std::string& id) const;
    bool ResolveOriginalSample(const std::string& channel, const std::string& source,
                              const std::string& generation, std::uint64_t generation_order,
                              const std::string& track, std::uint64_t ordinal, std::uint64_t pts_ns,
                              RecordingOriginalResult* result, std::string* error) const;
    bool FinalizeSegmentV2(const RecordingSegmentV2& segment, const std::string& media_path, std::string* error);
    std::optional<RecordingSegmentV2> FindSegmentV2ById(const std::string& id) const;
    // 현재 V2/파생 출처 검증과 hold 획득을 같은 잠금에서 수행한다. 성공 시 호출자가 hold를 해제한다.
    bool AcquireMediaV2(const std::string& channel,const std::string& id,RecordingSegmentV2* segment,
                        std::pair<std::filesystem::path,std::filesystem::path>* location,std::string* error);
    bool ValidateMediaV2(const RecordingSegmentV2& segment,
                         const std::pair<std::filesystem::path,std::filesystem::path>& location) const;
    bool SnapshotTimelineV2(const RecordingTimelineQuery&,RecordingTimelineResult*,std::string*) const;
    RecordingLifecycle SegmentLifecycleV2(const std::string& id) const;
    bool CompleteDeletionV2(const RecordingTombstoneV2& tombstone,std::string* error) override;
    bool ValidateFinalizeRecoveryV2(const RecordingSegmentV2& segment, const std::string& media_path, std::string* error) const;
    bool RecoverFinalizedSegmentV2(const RecordingSegmentV2& segment, const std::string& media_path, bool* inserted, std::string* error);
    std::string catalog_mode() const;
    RecordingCatalogRecoveryReport recovery_report() const;
    bool SnapshotStatus(RecordingCatalogStatusSnapshot* result, std::string* error) const;
    bool ValidateStatusSnapshot(const RecordingCatalogStatusSnapshot& snapshot) const;
    RecordingOrphanReport InspectOrphans() const;
    recording::RetentionSnapshot RetentionSnapshot() const;
    // startup 내부 전용: 경로 유효성과 무관하게 모든 Finalized metadata의 잠금 snapshot.
    std::vector<RecordingSegmentV1> FinalizedSegmentsForStartup() const;
    std::vector<std::string> FinalizedSegmentIdsForStartup() const;
    bool AdjustHoldCount(const std::string& segment_id,
                         std::int64_t delta,
                         std::string* error);
    std::optional<EventRecordingLinkV1> FindEventLinkByEventId(
        const std::string& event_id) const;
    std::optional<RecordingSegmentV1> FindSegmentById(
        const std::string& segment_id) const;
    // 조회에서 숨긴 삭제 ID도 재생용 fallback ID로 재사용할 수 없다.
    bool IsDeletedSegmentId(const std::string& segment_id) const;
    std::optional<std::filesystem::path> FindSegmentMediaPath(
        const std::string& segment_id) const;
    // transport 내부 전용: symlink를 따라 정규화하지 않은 root/상대경로.
    std::optional<std::pair<std::filesystem::path, std::filesystem::path>>
        FindSegmentMediaLocation(const std::string& segment_id) const;
    std::vector<EventRecordingLinkV1> ListEventLinks(
        EventRecordingLinkStatus status) const;
    bool AcquireEventSourceLease(const std::string& channel_id,
                                 const std::string& stream_epoch_id,
                                 const std::vector<std::string>& segment_ids,
                                 EventSourceLease* lease,
                                 std::string* error);
    bool ReleaseEventSourceLease(const EventSourceLease& lease,
                                 std::string* error);

    bool FinalizeSegment(const RecordingSegmentV1& segment,
                         const std::string& media_path,
                         std::string* error) override;
    // event clip은 finalize와 동시에 hold를 취득해 link terminal commit 전 삭제를 막는다.
    bool FinalizeSegmentWithHold(const RecordingSegmentV1& segment,
                                 const std::string& media_path,
                                 std::string* error);
    // Open 후 생산자 시작 전 ready 복구 전용. existing output hold는 재취득하지 않는다.
    bool RecoverFinalizedSegment(const RecordingSegmentV1& segment,const std::string& media_path,
                                 const std::optional<EventRecordingLinkV1>& event_link,bool* inserted,std::string* error);
    bool ValidateFinalizeRecovery(const RecordingSegmentV1& segment,const std::string& media_path,
                                  const std::optional<EventRecordingLinkV1>& event_link,std::string* error) const;
    bool PutEventLink(const EventRecordingLinkV1& link, std::string* error) override;
    bool PutObservation(const AnalysisObservationV1& observation, std::string* error) override;
    bool PutObservationV2(AnalysisObservationV2 observation, std::string* error);
    bool PutConsumerReference(const RecordingConsumerReferenceV1&, std::string* error);
    // 큐 슬롯을 확보한 내부 bridge만 호출한다. 참조 자체는 변경하지 않는다.
    bool AcceptDerivedReference(const RecordingConsumerReferenceV1&, std::string* error);
    bool IsDerivedReferenceAccepted(const std::string& reference_id, bool* accepted, std::string* error) const;
    bool SnapshotDerivedSources(const RecordingConsumerReferenceV1&,
        std::vector<RecordingDerivedSourceSnapshotEntry>*, std::string* error) const;
    // 런타임 전용 토큰: 스냅샷과 크기가 제한된 보호를 같은 잠금 안에서 획득한다.
    bool SnapshotDerivedSourcesWithWaitLease(const RecordingConsumerReferenceV1&,
        const std::vector<RecordingConsumerOriginalV1>& observed,std::uint64_t* token,
        std::vector<RecordingDerivedSourceSnapshotEntry>*,std::string* error,
        const std::vector<RecordingConsumerOriginalV1>& native_overlap_only = {});
    bool ReleaseDerivedWaitLease(std::uint64_t token,std::string* error);
    bool RefreshDerivedWaitLeaseForIntent(const DerivedJobIntentV1&,std::uint64_t token,std::string* error);
    bool QueryDerivedReferenceResult(const std::string& reference_id,
        RecordingDerivedReferenceResult*,std::string* error) const;
    bool PutReferencedObservation(const AnalysisObservationV2&, const RecordingConsumerReferenceV1&, std::string*);
    // 호출 범위의 불투명 사본. 영속 revision/검색 snapshot 계약은 바꾸지 않는다.
    class EvidenceSnapshot {
        friend class RecordingCatalog;
        std::string channel,source,ns,track,job;
        std::vector<std::string> segments,events,rows,dependencies;
        std::uint64_t instance{0},revision{0};
        std::chrono::steady_clock::time_point deadline;
    public:
        std::uint64_t captured_revision() const {return revision;}
    };
    bool CaptureEvidenceObservations(const SearchDocument&,std::vector<ReferencedObservationV1>*,
        EvidenceSnapshot*,std::string* error,
        std::chrono::steady_clock::time_point deadline=std::chrono::steady_clock::time_point::max()) const;
    // action은 linkat만 수행한다. bounded 재검증과 게시 사이 잠금을 풀지 않는다.
    bool GuardEvidenceSnapshot(const EvidenceSnapshot&,const std::function<bool()>& action,
        std::uint64_t* captured_revision=nullptr,std::uint64_t* checked_revision=nullptr,
        bool* dependencies_current=nullptr,std::string* error=nullptr) const;
    std::vector<ReferencedObservationV1> QueryReferencedObservations(const std::string& channel) const;
    std::vector<RecordingConsumerReferenceV1> QueryConsumerReferences(
        const std::string& channel, const std::string& kind, const std::string& owner) const;
    // Exact internal lookup. Unavailable/corrupt history is not a successful absence.
    bool LookupConsumerReference(const std::string& id,
        std::optional<RecordingConsumerReferenceV1>*,std::string*) const;
    // 파일 검출/삭제가 아닌 known segment의 내부 durable 상태 전이.
    bool MarkSegmentCorrupt(const std::string& segment_id,
                            const std::string& reason,
                            std::string* error);
    std::vector<AnalysisObservationV2> QueryObservationsV2(const std::string& channel_id) const;
    // 내부 검색 관측 전용. epoch 미확정이면 locator를 추정하지 않는다.
    AnalysisObservationV2 ResolveObservationV2(AnalysisObservationV2 observation) const;
    bool RequestDeletion(const std::string& segment_id,
                         const std::string& reason,
                         std::string* error) override;
    bool CompleteDeletion(const RecordingTombstoneV1& tombstone, std::string* error) override;
    std::vector<RecordingSegmentV1> QuerySegments(const std::string& channel_id,
                                                  std::int64_t start_ms,
                                                  std::int64_t end_ms) const override;

private:
    bool EvidenceRowsLocked(const EvidenceSnapshot&,std::vector<ReferencedObservationV1>*,
        std::vector<std::string>*,std::string*) const;
    bool EvidenceDependenciesLocked(const EvidenceSnapshot&,std::vector<std::string>*,std::string*) const;
    friend struct RecordingCutoverCandidateProbe;
    friend struct RecordingGenerationTransactionProbe;
    bool PublishManagedCutover(const struct RecordingCutoverCandidateLimits&,std::string*);
    bool RecoverManagedCutover(const struct RecordingCutoverCandidateLimits&,std::uint64_t receipt_admission,std::string*);
    bool PrepareManagedCutoverCandidate(const struct RecordingCutoverFreshStage&,
        const struct RecordingCutoverCandidateLimits&,struct RecordingCutoverCandidate*,
        struct RecordingCutoverCreatedFiles*,std::string*);
    bool ReplayManagedCutoverScratch(RecordingCatalog& scratch,
        const std::function<bool(const struct RecordingCutoverInputRow&,std::string*)>& sink,
        struct RecordingCutoverInputSummary*,std::string*);
    using SourceBindingHandle = std::shared_ptr<const RecordingSourceBindingV1>;
    struct SourceBindingEntry {
        SearchModelResidency::Reservation memory;
        std::string id,channel,source,generation,track,latest_mutation_id;
        std::uint64_t order{0};
        std::size_t sample_count{0};
        RecordingMutationLink mutation;
        mutable std::weak_ptr<const RecordingSourceBindingV1> weak;
        SourceBindingHandle resident;
        SourceBindingEntry()=default;
        SourceBindingEntry(const SourceBindingEntry&)=default;
        SourceBindingEntry(SourceBindingEntry&&)noexcept=default;
        SourceBindingEntry& operator=(SourceBindingEntry value)noexcept {memory.swap(value.memory);using std::swap;swap(id,value.id);swap(channel,value.channel);swap(source,value.source);swap(generation,value.generation);swap(track,value.track);swap(latest_mutation_id,value.latest_mutation_id);swap(order,value.order);swap(sample_count,value.sample_count);swap(mutation,value.mutation);swap(weak,value.weak);swap(resident,value.resident);return *this;}
        SourceBindingEntry(SourceBindingHandle value,RecordingMutationLink link={},std::string latest={});
        SourceBindingHandle WarmOwned() const {return resident?resident:weak.lock();}
        SourceBindingHandle ResidentOwned() const {return resident;}
        explicit operator bool() const {return !id.empty();}
    };
    using SourceBindingPool = std::unordered_map<std::string, SourceBindingEntry>;
    static SourceBindingHandle FindSourceBindingOwned(const SourceBindingPool& pool,const std::string& id);
    std::optional<SourceBindingEntry> SourceEntryLocked(const std::string&) const;
    bool StoreSourceEntryLocked(SourceBindingEntry,std::string*);
    bool VisitSourcesLocked(const std::function<bool(const std::string&,const SourceBindingEntry&,std::string*)>&,std::string*) const;
    SourceBindingHandle FindSourceBindingOwnedLocked(const std::string& id) const;
    bool AcquireSourceBindingOwnedLocked(const std::string& id,SourceBindingHandle* out,std::string* error) const;
    friend class RecordingSearchReader;
    // 외부 DTO가 아닌 호출 범위 증명. 현재 원장 bytes를 재확인한 뒤 파싱 결과만 재사용한다.
    struct SourceBindingReadContext {
        const RecordingCatalog* owner{nullptr};
        SourceBindingHandle binding;
        RecordingMutationHandle envelope;
        std::shared_ptr<RecordingJournal::ColdReadProof> cold;
        std::string segment_json;
        std::size_t retained_bytes{0};
    };
    SourceBindingHandle ReadSourceBinding(const std::string&,SourceBindingReadContext*,std::string*) const;
    bool AcquireRetiredV2Locked(const std::string&,RecordingTombstoneV2*,std::string*) const;
    bool AcquireOriginalV2Locked(const std::string&,RecordingSegmentV2*,std::string*) const;
    static bool MaterializeSourceBinding(const SourceBindingEntry&,const RecordingSegmentV2&,
        const RecordingMutationHandle&,SourceBindingHandle*,std::string*);
    using DerivedJobHandle = std::shared_ptr<const DerivedJobRecordV1>;
    struct DerivedJobEntry {
        SearchModelResidency::Reservation memory;
        std::string id,channel,reference,latest_mutation_id;
        DerivedJobState state{DerivedJobState::Intent};
        std::size_t files{0};
        std::uint64_t reserved_bytes{0};
        std::vector<std::string> output_ids,source_ids;
        RecordingMutationLink mutation;
        mutable std::weak_ptr<const DerivedJobRecordV1> weak;
        DerivedJobHandle resident;
        DerivedJobEntry()=default;
        DerivedJobEntry(const DerivedJobEntry&)=default;
        DerivedJobEntry(DerivedJobEntry&&)noexcept=default;
        DerivedJobEntry& operator=(DerivedJobEntry value)noexcept {memory.swap(value.memory);using std::swap;swap(id,value.id);swap(channel,value.channel);swap(reference,value.reference);swap(latest_mutation_id,value.latest_mutation_id);swap(state,value.state);swap(files,value.files);swap(reserved_bytes,value.reserved_bytes);swap(output_ids,value.output_ids);swap(source_ids,value.source_ids);swap(mutation,value.mutation);swap(weak,value.weak);swap(resident,value.resident);return *this;}
        DerivedJobEntry(DerivedJobHandle value,RecordingMutationLink link={},std::string latest={});
        DerivedJobHandle WarmOwned() const {return resident?resident:weak.lock();}
        DerivedJobHandle ResidentOwned() const {return resident;}
        bool Active() const {return state!=DerivedJobState::Complete&&state!=DerivedJobState::Failed;}
        explicit operator bool() const {return !id.empty();}
    };
    using DerivedJobPool = std::unordered_map<std::string, DerivedJobEntry>;
    std::optional<DerivedJobEntry> JobEntryLocked(const std::string&) const;
    bool EvictCompletedJobLocked(const std::string&,std::string*);
    bool VisitJobsLocked(const std::function<bool(const std::string&,const DerivedJobEntry&,std::string*)>&,std::string*) const;
    bool JobOwnsLocked(const std::string& kind,const std::string& id) const;
    // QueryTimeline 호출 안의 확정 증명이다. 이전 호출 후보는 별도 bounded 보관하되
    // 현재 원장 envelope·얇은 상태를 다시 대조하기 전에는 증명으로 쓰지 않는다.
    struct JobReadContext {
        struct Entry { DerivedJobHandle job; RecordingMutationHandle envelope; RecordingMutationLink link; };
        const RecordingCatalog* owner{nullptr};
        std::string channel_id;
        std::uint64_t source_revision{0};
        bool source_revision_valid{false};
        std::vector<Entry> entries;
        std::size_t charge{0};
        std::size_t budget{8U*1024U*1024U};
        std::unordered_map<std::string,std::shared_ptr<RecordingJournal::ColdReadProof>> proofs;
        JobReadContext()=default;
        // 후보 복사는 parsed 값만 승계한다. 새 요청에 FD 증명이 넘어가면 안 된다.
        JobReadContext(const JobReadContext& other){*this=other;}
        JobReadContext& operator=(const JobReadContext& other){
            if(this==&other)return *this;
            proofs.clear();owner=other.owner;channel_id=other.channel_id;
            source_revision=other.source_revision;source_revision_valid=other.source_revision_valid;
            entries=other.entries;charge=other.charge;budget=other.budget;return *this;
        }
        JobReadContext(JobReadContext&&)=default;
        JobReadContext& operator=(JobReadContext&&)=default;
    };
    bool AcquireDerivedJobOwnedLocked(const std::string& id,DerivedJobHandle* out,std::string* error) const;
    bool AcquireDerivedJobOwnedWithEnvelopeLocked(const std::string&,DerivedJobHandle*,RecordingMutationHandle*,std::string*,
        std::shared_ptr<RecordingJournal::ColdReadProof>* proof=nullptr) const;
    bool AcquireJobForReadLocked(const std::string&,DerivedJobHandle*,JobReadContext*,std::string*,bool* strict_content=nullptr) const;
    bool JobReadCurrentLocked(const DerivedJobEntry&,const DerivedJobRecordV1&) const;
    bool SnapshotTimelineWithContext(const RecordingTimelineQuery&,RecordingTimelineResult*,std::string*,JobReadContext*,
        bool event_candidates_only = false) const;
    bool AcquireMediaWithContext(const std::string&,const std::string&,RecordingSegmentV2*,
        std::pair<std::filesystem::path,std::filesystem::path>*,std::string*,JobReadContext*);
    bool ValidateMediaWithContext(const RecordingSegmentV2&,const std::pair<std::filesystem::path,std::filesystem::path>&,JobReadContext*) const;
    friend class RecordingReadService;
    bool ReleaseInactiveDetailsLocked(const std::string* changed,std::string* error);
    static DerivedJobHandle ShareValidatedJob(DerivedJobRecordV1 record,const DerivedJobPool* pool);
    friend class RetentionCoordinator;
    friend class DerivedJobService;
    bool BindDerivedService(const void* owner);
    void UnbindDerivedService(const void* owner);
    bool UpdateDerivedJob(const void* owner,const DerivedJobRecordV1&,std::string* error);
    std::uint64_t derived_service_epoch_=0;
    const void* derived_service_owner_{nullptr};
    bool BindRetentionOwner(const RetentionCoordinator* owner);
    void UnbindRetentionOwner(const RetentionCoordinator* owner);
    bool IsRetentionOwner(const RetentionCoordinator* owner) const;
    const RetentionCoordinator* retention_owner_{nullptr};
    bool BeginDerivedJobIntent(const DerivedJobIntentV1&,bool* inserted,std::string* error);
    bool DerivedJobProtectsLocked(const std::string& segment_id) const;
    bool SnapshotDerivedSourcesLocked(const RecordingConsumerReferenceV1&,
        std::vector<RecordingDerivedSourceSnapshotEntry>*,std::string*) const;
    static bool DerivedSourceRelevant(const RecordingConsumerReferenceV1&,const RecordingSegmentV2&,const SourceBindingEntry*);
    static bool RetiredSourceRelevant(const RecordingConsumerReferenceV1&,const RecordingRetiredV2Receipt&,const SourceBindingEntry*);
    bool PrepareDerivedSourceSnapshot(const RecordingConsumerReferenceV1&,
        std::vector<RecordingDerivedSourceSnapshotEntry>*,std::optional<std::uint64_t>*,std::string*) const;
    bool FinishDerivedSourceSnapshotLocked(const RecordingConsumerReferenceV1&,
        std::vector<RecordingDerivedSourceSnapshotEntry>*,const std::optional<std::uint64_t>&,std::string*) const;
    bool MediaV2EligibleLocked(const std::string& channel,const std::string& id,JobReadContext* context=nullptr) const;
    bool AdjustHoldCountLocked(const std::string& id,std::int64_t delta,std::string* error);
    bool ValidateDerivedJobSourcesLocked(const DerivedJobIntentV1&,std::string*) const;
    // UpdateDerivedJob의 동일 mutex 호출 안에서만 사용한다. replay/외부 입력에는 전달하지 않는다.
    struct PreparedDerivedMutation {
        enum class Phase { Empty, Validated, Applied, Consumed };
        const RecordingCatalog* owner;
        const std::string& payload;
        RecordingMutationType type{RecordingMutationType::Unknown};
        std::string entity;
        DerivedJobHandle prior;
        DerivedJobState prior_state{DerivedJobState::Intent};
        std::size_t prior_files{0};
        DerivedJobHandle record;
        DerivedJobHandle applied;
        Phase phase{Phase::Empty};
        PreparedDerivedMutation(const RecordingCatalog* catalog,const std::string& canonical)
            :owner(catalog),payload(canonical){}
        PreparedDerivedMutation(const PreparedDerivedMutation&)=delete;
        PreparedDerivedMutation& operator=(const PreparedDerivedMutation&)=delete;
    };
    bool PreparedDerivedMatchesLocked(const RecordingMutationV1&,const PreparedDerivedMutation&,bool applied,std::string*) const;
    // 성공한 정상 전이 호출 안에서만 생성·소비한다. catalog/cache에는 저장하지 않는다.
    class DerivedJobContentProof {
        friend class RecordingCatalog;
        const RecordingCatalog* owner;
        RecordingMutationHandle envelope;
        DerivedJobHandle record;
        DerivedJobContentProof(const RecordingCatalog* source,RecordingMutationHandle mutation,DerivedJobHandle parsed)
            :owner(source),envelope(std::move(mutation)),record(std::move(parsed)){}
    public:
        DerivedJobContentProof(const DerivedJobContentProof&)=default;
        DerivedJobContentProof& operator=(const DerivedJobContentProof&)=default;
    };
    DerivedJobHandle ContentProofRecordLocked(const RecordingMutationV1&,const DerivedJobContentProof*) const;
    // 소유는 Open의 stack에만 둔다. 복구 scratch는 호출-local 비소유 결박만 빌린다.
    class RecoveryContentContext {
        friend class RecordingCatalog;
        struct Entry {
            std::size_t ordinal;
            RecordingMutationHandle envelope;
            DerivedJobHandle job;
            SourceBindingHandle binding;
            RecordingSegmentV2 segment;
            std::string relative,segment_json,binding_json;
        };
        const RecordingCatalog* owner;
        const RecordingMutationHandles* original{nullptr};
        std::vector<Entry> entries;
        std::size_t charge{0},budget{64U*1024U*1024U},limit{64};
        bool collecting{true},valid{true},strict_preflight_validated{false};
        explicit RecoveryContentContext(const RecordingCatalog* value):owner(value){}
    };
    struct RecoveryContentScope {
        RecordingCatalog& target;
        RecoveryContentContext* previous;
        std::size_t previous_ordinal;
        RecordingMutationHandle previous_envelope;
        RecoveryContentScope(RecordingCatalog&,RecoveryContentContext*,std::size_t,RecordingMutationHandle);
        ~RecoveryContentScope();
        RecoveryContentScope(const RecoveryContentScope&)=delete;
    };
    RecoveryContentContext* recovery_content_{nullptr};
    std::size_t recovery_ordinal_{0};
    RecordingMutationHandle recovery_envelope_;
    const RecoveryContentContext::Entry* RecoveryContentLocked(const RecordingMutationV1&) const;
    void RememberRecoveryContentLocked(const RecordingMutationV1&) noexcept;
    bool ApplyDerivedJobMutationLocked(const RecordingMutationV1&,std::string*,bool apply=true,PreparedDerivedMutation* prepared=nullptr,const DerivedJobPool* job_pool=nullptr,const DerivedJobContentProof* proof=nullptr,const RecordingMutationLink* link=nullptr);
    RecordingLifecycle EffectiveLifecycleV2Locked(const std::string& id) const;
    bool OpenLocked(std::string* error);
    bool BuildGenerationScratch(std::unique_ptr<RecordingCatalog>* output,std::string* error);
    bool BuildGenerationScratchLocked(std::unique_ptr<RecordingCatalog>*,std::shared_ptr<RecordingGenerationRecoverySession>*,std::string*,
        std::optional<std::uint64_t> recovery_cut=std::nullopt);
    bool OpenGenerationLocked(std::string*);
    bool PrepareGenerationSqliteLocked(const std::shared_ptr<RecordingGenerationRecoverySession>&,std::string*);
    bool UpdateGenerationHoldsLocked(const std::vector<std::pair<std::string,std::uint64_t>>&,std::string*);
    void PublishGenerationMapsLocked(RecordingCatalog&) noexcept;
    bool CanReadLocked(std::string* error) const;
    bool CanWriteLocked(std::string* error) const;
    using GenerationDelta=std::set<std::pair<std::string,std::string>>;
    bool RegisteredMediaAbsentLocked(const std::string&,std::string*) const;
    bool RevalidateRotatedMutationLocked(const RecordingMutationV1&,std::string*);
    bool AppendGenerationLocked(RecordingMutationV1,std::string*,PreparedDerivedMutation*,bool acquire_hold=false);
    bool ProjectGenerationDeltaLocked(const GenerationDelta&,const RecordingGenerationRecoveryRow&,std::string*);
    bool CheckpointGenerationLocked(std::string*);
    bool ExportGenerationSnapshotLocked(const RecordingIdentityChainResult&,std::uint64_t,std::uint64_t,RecordingCatalogSnapshot*,std::string*) const;
    // 전환 scratch용 값 생성기다. 공개 export의 owner/lease 검사를 우회하는 API가 아니다.
    bool ExportGenerationValuesLocked(const std::string& store,const RecordingIdentityChainResult&,
        std::uint64_t,std::uint64_t,RecordingCatalogSnapshot*,std::string*,
        const RecordingCatalogSnapshotRowVisitor& visitor={}) const;
    struct GenerationSnapshotView {
        std::function<bool(const RecordingCatalogSnapshotRowVisitor&,std::string*)> visit;
        std::function<bool(std::string*)> finish;
        std::array<unsigned char,32> applied_digest{};
        std::uint64_t applied_count=0,bytes=0,allocated=0;
    };
    bool CaptureGenerationSnapshotViewLocked(GenerationSnapshotView*,std::string*) const;
    bool ExportFrozenGenerationValues(const RecordingIdentityChainResult&,std::uint64_t,std::uint64_t,
        const GenerationSnapshotView&,RecordingCatalogSnapshot*,const RecordingCatalogSnapshotRowVisitor&,std::string*) const;
    struct GenerationSnapshotStream {
        RecordingGenerationByteProducer produce;
        std::function<bool(std::string*)> finish;
    };
    bool PrepareGenerationSnapshotStreamLocked(const RecordingIdentityChainResult&,std::uint64_t,std::uint64_t,
        GenerationSnapshotStream*,std::string*,const GenerationSnapshotView* frozen=nullptr) const;
    bool PoisonGenerationLocked(std::string* error);
#if MEDIA_SERVER_RECORDING_GENERATION_TESTING
    static thread_local int generation_apply_fault_;
    static thread_local void (*generation_checkpoint_prepared_hook_)();
#endif
    struct CheckpointProjectionCache {
        RecordingMutationLinks prefix;
        std::unique_ptr<RecordingCatalog> shadow;
    };
    std::unique_ptr<CheckpointProjectionCache> checkpoint_cache_;
    bool CheckpointLocked(bool recover_only, std::string* error,const DerivedJobContentProof* proof=nullptr);
    bool BuildStatusSnapshotLocked(RecordingCatalogStatusSnapshot* result, std::string* error) const;
    struct RetentionSnapshot RetentionSnapshotLocked() const;
    struct CheckpointStatusGuard {
        RecordingCatalog& catalog;
        bool active{false},success{false};
        explicit CheckpointStatusGuard(RecordingCatalog& value) noexcept;
        ~CheckpointStatusGuard();
        CheckpointStatusGuard(const CheckpointStatusGuard&)=delete;
    };
    bool ValidateManagedCandidateLocked(const RecordingSegmentV2& segment, const std::string& relative, std::string* error) const;
    std::vector<std::string> ProjectionSignatureLocked() const;
    bool PreflightV2Locked(const RecordingJournalReplayResult& replay, std::string* error,
                           const RecordingSegmentV2* candidate = nullptr,
                           const std::string& relative = {},
                           const RecordingSourceBindingV1* binding = nullptr,
                           const RecordingMutationHandles& owned = {},const RecordingJournalOwnedViews& views = {}) const;
    bool ReadCatalogReplay(RecordingMutationHandles* owned, RecordingJournalReplayResult* replay,
                           std::string* error,RecordingJournalOwnedViews* views = nullptr) const;
    bool ValidateBoundLocked(const RecordingSegmentV2&,const RecordingSourceBindingV1&,const std::string&,std::string*) const;
    bool CommitBoundLocked(const RecordingSegmentV2&,const RecordingSourceBindingV1&,const std::string&,bool,bool*,std::string*);
    bool ValidateV2Locked(const RecordingSegmentV2& segment, const std::string& relative, std::string* error) const;
    bool ApplyMutationLocked(const RecordingMutationV1& mutation,
                             bool count_duplicate,
                             std::string* error,PreparedDerivedMutation* prepared=nullptr,
                             RecordingMutationHandle owned = {},const SourceBindingPool* binding_pool = nullptr,
                             const DerivedJobPool* job_pool = nullptr,const DerivedJobContentProof* proof = nullptr,
                             const RecordingJournalOwnedViewHandle& view = {},
                             const RecordingGenerationRecoveryRow* generation_row = nullptr,
                             bool apply = true,GenerationDelta* delta=nullptr);
    // 내구 쓰기를 열지 않는 내부 검증 경계. 성공 결과는 재사용 가능한 권위 토큰이 아니다.
    bool ValidateMutationLocked(const RecordingMutationV1& mutation, std::string* error,PreparedDerivedMutation* prepared=nullptr);
    bool AppendAndApplyLocked(RecordingMutationV1 mutation, std::string* error,PreparedDerivedMutation* prepared=nullptr);
    bool OpenSqliteLocked(std::string* error);
    bool InitializeSqliteSchemaLocked(std::string* error);
    bool RebuildSqliteLocked(std::string* error);
    bool ProjectMutationSqliteLocked(const RecordingMutationV1& mutation, std::string* error,PreparedDerivedMutation* prepared=nullptr);
    bool ProjectMutationSqliteInTransactionLocked(const RecordingMutationV1& mutation,
        std::string* error,PreparedDerivedMutation* prepared,bool own_transaction,
        RecordingJournalOwnedViewHandle view={});
    bool RecoverWriterCleanupMarkersLocked(std::string* error);
    bool FinalizeSegmentLocked(const RecordingSegmentV1& segment,
                               const std::string& media_path,
                               bool acquire_hold,
                               std::string* error);
    bool ValidateEventLinkReferencesLocked(const EventRecordingLinkV1& link,
                                           std::string* error) const;
    void CloseSqliteLocked();
    void ResolveObservationV2Locked(AnalysisObservationV2* observation) const;
    void NoteSearchMutationLocked(const RecordingMutationV1&) noexcept;

    std::shared_ptr<SearchModelResidency> search_residency_;
    RecordingJournal& journal_;
    Options options_;
    mutable std::mutex mu_;
    bool opened_{false};
    bool generation_read_only_{false};
    bool generation_backend_{false};
    bool generation_checkpoint_in_progress_{false};
    // 첫 Open 전체 성공만 자동 no-op의 기원이다. 실패한 같은 인스턴스는 strict로 남긴다.
    bool automatic_noop_open_attempted_{false},automatic_noop_eligible_{false};
    // 적용 실패/예외도 포함한다. 포화 후에는 잠금 밖 조회를 다시 허용하지 않는다.
    std::uint64_t source_snapshot_revision_{0};
    bool source_snapshot_revision_valid_{true};
    // 검색 변경 목록은 원장이 아니다. 유실/초과는 전체 snapshot 재구축으로 처리한다.
    struct SearchChange { std::uint64_t revision; RecordingMutationType type; std::string id; };
    std::deque<SearchChange> search_changes_;
    std::uint64_t search_instance_{0}, search_rebuild_revision_{0}, search_resolution_revision_{0};
    mutable bool derived_job_state_authoritative_{true};
    std::string catalog_mode_{"jsonl-fallback"};
    RecordingCatalogRecoveryReport recovery_report_;
    mutable std::shared_ptr<const RecordingCatalogStatusSnapshot> checkpoint_status_snapshot_;
    mutable std::atomic<bool> checkpoint_status_active_{false};
    mutable std::atomic<bool> checkpoint_status_poisoned_{false};
    mutable std::atomic<std::uint64_t> checkpoint_status_generation_{0};
    mutable std::atomic<std::uint64_t> checkpoint_status_failure_generation_{0};
    mutable std::atomic<std::uint64_t> checkpoint_status_success_generation_{0};
    mutable std::mutex checkpoint_status_wait_mu_;
    mutable std::condition_variable checkpoint_status_wait_cv_;
    std::shared_ptr<RecordingCatalogHistoryRows> completed_history_;
    std::optional<std::uint64_t> generation_visible_ordinal_;
    std::optional<RecordingIdentityFirstAcceptance> VisibleFirstLocked(const std::string&) const;
    bool MutationSeenLocked(const std::string&) const;
    bool AcceptedLinkLocked(const std::string&,RecordingMutationLink*,std::uint64_t* = nullptr) const;
    std::optional<RecordingOrderReservationV1> OrderLocked(const std::string&) const;
    bool VisitAcceptedLocked(const RecordingIdentityFirstVisitor&,std::string*) const;
    bool VisitOrdersLocked(const std::function<bool(const RecordingOrderReservationV1&,std::string*)>&,std::string*) const;
    std::optional<RecordingRetiredV2Receipt> RetiredLocked(const std::string&) const;
    bool StoreRetiredLocked(const RecordingRetiredV2Receipt&,const RecordingMutationLink&,std::string*);
    bool EraseRetiredLocked(const std::string&,std::string*);
    bool VisitRetiredLocked(const std::function<bool(const std::string&,const RecordingRetiredV2Receipt&,std::string*)>&,std::string*,bool event_candidates_only=false) const;
    std::unordered_set<std::string> mutation_ids_;
    // 이 두 상태 mutation은 메모리가 실제 수용한 최초 envelope만 SQL로 재생한다.
    std::unordered_map<std::string, RecordingMutationLink> accepted_segment_state_mutations_;
    std::unordered_set<std::size_t> accepted_segment_state_replay_ordinals_;
    // B 후보의 영속 최초 좌표. v1 dense replay ordinal과 혼용하지 않는다.
    std::unordered_map<std::string,std::uint64_t> accepted_generation_ordinals_;
    RecordingRetainedRows<RecordingSegmentV1,ParseRecordingSegmentV1,SerializeRecordingSegmentV1> segments_;
    RecordingRetainedRows<RecordingSegmentV2,ParseRecordingSegmentV2,SerializeRecordingSegmentV2> segments_v2_;
    SourceBindingPool source_bindings_;
    DerivedJobPool derived_jobs_;
    // 검증된 완료 작업의 선택적 후보만 보관한다. 영속 데이터의 권위나 resident를 대신하지 않는다.
    mutable JobReadContext timeline_read_candidates_;
    RecordingRetainedAcceptedSet derived_accepted_references_;
    RecordingRetainedRows<RecordingSegmentStateV2,ParseRecordingSegmentStateV2,SerializeRecordingSegmentStateV2> states_v2_;
    RecordingRetainedRows<RecordingTombstoneV2,ParseRecordingTombstoneV2,SerializeRecordingTombstoneV2> tombstones_v2_;
    // 삭제 완료 V2의 현재 상태 최소 영수증과 최초 삭제 원문 cold link다. 전문은 current map에
    // 보관하지 않으며, 소비 시마다 link를 재획득해 canonical hash와 함께 검증한다.
    std::unordered_map<std::string, RecordingRetiredV2Receipt> retired_v2_;
    std::unordered_map<std::string, RecordingMutationLink> retired_v2_links_;
    std::unordered_map<std::string, RecordingOrderReservationV1> orders_v2_;
    RecordingRetainedTextRows media_relpaths_;
    std::unordered_map<std::string, std::uint64_t> hold_counts_;
    struct DerivedWaitLease {std::string reference_json;std::unordered_set<std::string> source_ids;};
    std::unordered_map<std::uint64_t,DerivedWaitLease> derived_wait_leases_;
    std::uint64_t next_derived_wait_lease_{0};
    RecordingRetainedTextRows deletion_reasons_;
    RecordingRetainedRows<EventRecordingLinkV1,ParseEventRecordingLinkV1,SerializeEventRecordingLinkV1> event_links_;
    RecordingRetainedRows<AnalysisObservationV1,ParseAnalysisObservationV1,SerializeAnalysisObservationV1> observations_;
    RecordingRetainedRows<AnalysisObservationV2,ParseAnalysisObservationV2,SerializeAnalysisObservationV2> observations_v2_;
    RecordingRetainedRows<RecordingConsumerReferenceV1,ParseRecordingConsumerReferenceV1,SerializeRecordingConsumerReferenceV1> consumer_references_;
    RecordingRetainedRows<ReferencedObservationV1,ParseReferencedObservationV1,SerializeReferencedObservationV1> referenced_observations_;
    RecordingRetainedRows<RecordingTombstoneV1,ParseRecordingTombstoneV1,SerializeRecordingTombstoneV1> tombstones_;
    sqlite3* sqlite_db_{nullptr};
    sqlite3* generation_sqlite_db_{nullptr};
#if MEDIA_SERVER_RECORDING_GENERATION_TESTING
    static std::function<void(sqlite3*)> generation_sqlite_open_hook_;
#endif
};

}  // namespace recording

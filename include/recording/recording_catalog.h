// 파일 요약: JSONL 원장을 source-of-truth로 사용하는 녹화 catalog projection을 선언한다.
// 동작 요약: SQLite primary와 in-memory fallback이 같은 range query와 저장 port를 제공한다.
#pragma once

#include <cstdint>
#include <filesystem>
#include <mutex>
#include <optional>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <utility>

#include "recording/recording_journal.h"
#include "recording/recording_store_port.h"
#include "recording/retention_coordinator.h"

struct sqlite3;

namespace recording {

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

struct RecordingOriginalCandidate {
    RecordingSegmentV2 segment;
    std::string source_generation, track_id;
    std::uint64_t generation_order{0}, last_accepted_ordinal{0};
    std::optional<RecordingSourceSampleV1> sample;
    std::string reason;
};
struct RecordingOriginalResult {
    std::vector<RecordingOriginalCandidate> exact, unknown;
};

class RecordingCatalog final : public RecordingStorePort {
public:
    struct Options {
        std::filesystem::path sqlite_path;
        std::filesystem::path media_root;
        bool prefer_sqlite{true};
        bool enable_v2_storage{false};

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
    bool SnapshotLocationsV2(const std::string& channel_id,
                             RecordingLocationCatalogSnapshot* result, std::string* error) const;
    bool ValidateManagedWriterBinding(const RecordingJournal& journal,
                                     const std::filesystem::path& root,
                                     const std::string& store_id, std::string* error) const;
    bool Checkpoint(std::string* error);
    bool FindDerivedJob(const std::string& job_id,std::optional<DerivedJobRecordV1>* result,std::string* error) const;
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
    RecordingLifecycle SegmentLifecycleV2(const std::string& id) const;
    bool CompleteDeletionV2(const RecordingTombstoneV2& tombstone,std::string* error) override;
    bool ValidateFinalizeRecoveryV2(const RecordingSegmentV2& segment, const std::string& media_path, std::string* error) const;
    bool RecoverFinalizedSegmentV2(const RecordingSegmentV2& segment, const std::string& media_path, bool* inserted, std::string* error);
    std::string catalog_mode() const;
    RecordingCatalogRecoveryReport recovery_report() const;
    RecordingOrphanReport InspectOrphans() const;
    RetentionSnapshot RetentionSnapshot() const;
    // startup 내부 전용: 경로 유효성과 무관하게 모든 Finalized metadata의 잠금 snapshot.
    std::vector<RecordingSegmentV1> FinalizedSegmentsForStartup() const;
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
    bool QueryDerivedReferenceResult(const std::string& reference_id,
        RecordingDerivedReferenceResult*,std::string* error) const;
    bool PutReferencedObservation(const AnalysisObservationV2&, const RecordingConsumerReferenceV1&, std::string*);
    std::vector<ReferencedObservationV1> QueryReferencedObservations(const std::string& channel) const;
    std::vector<RecordingConsumerReferenceV1> QueryConsumerReferences(
        const std::string& channel, const std::string& kind, const std::string& owner) const;
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
    friend class RetentionCoordinator;
    friend class DerivedJobService;
    bool BindDerivedService(const void* owner);
    void UnbindDerivedService(const void* owner);
    bool UpdateDerivedJob(const void* owner,const DerivedJobRecordV1&,std::string* error);
    const void* derived_service_owner_{nullptr};
    bool BindRetentionOwner(const RetentionCoordinator* owner);
    void UnbindRetentionOwner(const RetentionCoordinator* owner);
    bool IsRetentionOwner(const RetentionCoordinator* owner) const;
    const RetentionCoordinator* retention_owner_{nullptr};
    bool BeginDerivedJobIntent(const DerivedJobIntentV1&,bool* inserted,std::string* error);
    bool DerivedJobProtectsLocked(const std::string& segment_id) const;
    bool ValidateDerivedJobSourcesLocked(const DerivedJobIntentV1&,std::string*) const;
    bool ApplyDerivedJobMutationLocked(const RecordingMutationV1&,std::string*,bool apply=true);
    RecordingLifecycle EffectiveLifecycleV2Locked(const std::string& id) const;
    bool OpenLocked(std::string* error);
    bool CanWriteLocked(std::string* error) const;
    bool CheckpointLocked(bool recover_only, std::string* error);
    bool ValidateManagedCandidateLocked(const RecordingSegmentV2& segment, const std::string& relative, std::string* error) const;
    std::vector<std::string> ProjectionSignatureLocked() const;
    bool PreflightV2Locked(const RecordingJournalReplayResult& replay, std::string* error,
                           const RecordingSegmentV2* candidate = nullptr,
                           const std::string& relative = {},
                           const RecordingSourceBindingV1* binding = nullptr) const;
    bool ValidateBoundLocked(const RecordingSegmentV2&,const RecordingSourceBindingV1&,const std::string&,std::string*) const;
    bool CommitBoundLocked(const RecordingSegmentV2&,const RecordingSourceBindingV1&,const std::string&,bool,bool*,std::string*);
    bool ValidateV2Locked(const RecordingSegmentV2& segment, const std::string& relative, std::string* error) const;
    bool ApplyMutationLocked(const RecordingMutationV1& mutation,
                             bool count_duplicate,
                             std::string* error);
    bool AppendAndApplyLocked(RecordingMutationV1 mutation, std::string* error);
    bool OpenSqliteLocked(std::string* error);
    bool InitializeSqliteSchemaLocked(std::string* error);
    bool RebuildSqliteLocked(std::string* error);
    bool ProjectMutationSqliteLocked(const RecordingMutationV1& mutation, std::string* error);
    bool RecoverWriterCleanupMarkersLocked(std::string* error);
    bool FinalizeSegmentLocked(const RecordingSegmentV1& segment,
                               const std::string& media_path,
                               bool acquire_hold,
                               std::string* error);
    bool ValidateEventLinkReferencesLocked(const EventRecordingLinkV1& link,
                                           std::string* error) const;
    void CloseSqliteLocked();
    void ResolveObservationV2Locked(AnalysisObservationV2* observation) const;

    RecordingJournal& journal_;
    Options options_;
    mutable std::mutex mu_;
    bool opened_{false};
    bool derived_job_state_authoritative_{true};
    std::string catalog_mode_{"jsonl-fallback"};
    RecordingCatalogRecoveryReport recovery_report_;
    std::unordered_set<std::string> mutation_ids_;
    // 이 두 상태 mutation은 메모리가 실제 수용한 최초 envelope만 SQL로 재생한다.
    std::unordered_map<std::string, std::string> accepted_segment_state_mutations_;
    std::unordered_set<std::size_t> accepted_segment_state_replay_ordinals_;
    std::unordered_map<std::string, RecordingSegmentV1> segments_;
    std::unordered_map<std::string, RecordingSegmentV2> segments_v2_;
    std::unordered_map<std::string, RecordingSourceBindingV1> source_bindings_;
    std::unordered_map<std::string, DerivedJobRecordV1> derived_jobs_;
    std::unordered_set<std::string> derived_accepted_references_;
    std::unordered_map<std::string, RecordingSegmentStateV2> states_v2_;
    std::unordered_map<std::string, RecordingTombstoneV2> tombstones_v2_;
    std::unordered_map<std::string, RecordingOrderReservationV1> orders_v2_;
    std::unordered_map<std::string, std::string> media_relpaths_;
    std::unordered_map<std::string, std::uint64_t> hold_counts_;
    std::unordered_map<std::string, std::string> deletion_reasons_;
    std::unordered_map<std::string, EventRecordingLinkV1> event_links_;
    std::unordered_map<std::string, AnalysisObservationV1> observations_;
    std::unordered_map<std::string, AnalysisObservationV2> observations_v2_;
    std::unordered_map<std::string, RecordingConsumerReferenceV1> consumer_references_;
    std::unordered_map<std::string, ReferencedObservationV1> referenced_observations_;
    std::unordered_map<std::string, RecordingTombstoneV1> tombstones_;
    sqlite3* sqlite_db_{nullptr};
};

}  // namespace recording

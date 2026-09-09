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

class RecordingCatalog final : public RecordingStorePort {
public:
    struct Options {
        std::filesystem::path sqlite_path;
        std::filesystem::path media_root;
        bool prefer_sqlite{true};

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
    std::string catalog_mode() const;
    RecordingCatalogRecoveryReport recovery_report() const;
    RecordingOrphanReport InspectOrphans() const;
    RetentionSnapshot RetentionSnapshot() const;
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
    bool PutEventLink(const EventRecordingLinkV1& link, std::string* error) override;
    bool PutObservation(const AnalysisObservationV1& observation, std::string* error) override;
    bool PutObservationV2(AnalysisObservationV2 observation, std::string* error);
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
    std::string catalog_mode_{"jsonl-fallback"};
    RecordingCatalogRecoveryReport recovery_report_;
    std::unordered_set<std::string> mutation_ids_;
    // 이 두 상태 mutation은 메모리가 실제 수용한 최초 envelope만 SQL로 재생한다.
    std::unordered_map<std::string, std::string> accepted_segment_state_mutations_;
    std::unordered_set<std::size_t> accepted_segment_state_replay_ordinals_;
    std::unordered_map<std::string, RecordingSegmentV1> segments_;
    std::unordered_map<std::string, std::string> media_relpaths_;
    std::unordered_map<std::string, std::uint64_t> hold_counts_;
    std::unordered_map<std::string, std::string> deletion_reasons_;
    std::unordered_map<std::string, EventRecordingLinkV1> event_links_;
    std::unordered_map<std::string, AnalysisObservationV1> observations_;
    std::unordered_map<std::string, AnalysisObservationV2> observations_v2_;
    std::unordered_map<std::string, RecordingTombstoneV1> tombstones_;
    sqlite3* sqlite_db_{nullptr};
};

}  // namespace recording

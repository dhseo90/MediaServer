// 파일 요약: JSONL 원장을 source-of-truth로 사용하는 녹화 catalog projection을 선언한다.
// 동작 요약: SQLite primary와 in-memory fallback이 같은 range query와 저장 port를 제공한다.
#pragma once

#include <filesystem>
#include <mutex>
#include <string>
#include <unordered_map>
#include <unordered_set>

#include "recording/recording_journal.h"
#include "recording/recording_store_port.h"

struct sqlite3;

namespace recording {

struct RecordingCatalogRecoveryReport {
    std::size_t replayed_mutation_count{0};
    std::size_t duplicate_mutation_count{0};
    std::size_t projection_error_count{0};
    std::size_t corrupt_line_count{0};
    std::size_t truncated_tail_count{0};
    bool sqlite_quarantined{false};
    std::filesystem::path sqlite_quarantine_path;
};

struct RecordingOrphanReport {
    std::size_t normal_orphan_count{0};
    std::size_t corrupt_orphan_count{0};
    std::vector<std::filesystem::path> normal_orphans;
    std::vector<std::filesystem::path> corrupt_orphans;
};

class RecordingCatalog final : public RecordingStorePort {
public:
    struct Options {
        std::filesystem::path sqlite_path;
        std::filesystem::path media_root;
        bool prefer_sqlite{true};
    };

    RecordingCatalog(RecordingJournal& journal, Options options);
    ~RecordingCatalog() override;
    bool Open(std::string* error);
    std::string catalog_mode() const;
    RecordingCatalogRecoveryReport recovery_report() const;
    RecordingOrphanReport InspectOrphans() const;

    bool FinalizeSegment(const RecordingSegmentV1& segment,
                         const std::string& media_path,
                         std::string* error) override;
    bool PutEventLink(const EventRecordingLinkV1& link, std::string* error) override;
    bool PutObservation(const AnalysisObservationV1& observation, std::string* error) override;
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
    void CloseSqliteLocked();

    RecordingJournal& journal_;
    Options options_;
    mutable std::mutex mu_;
    bool opened_{false};
    std::string catalog_mode_{"jsonl-fallback"};
    RecordingCatalogRecoveryReport recovery_report_;
    std::unordered_set<std::string> mutation_ids_;
    std::unordered_map<std::string, RecordingSegmentV1> segments_;
    std::unordered_map<std::string, std::string> media_relpaths_;
    std::unordered_map<std::string, EventRecordingLinkV1> event_links_;
    std::unordered_map<std::string, AnalysisObservationV1> observations_;
    std::unordered_map<std::string, RecordingTombstoneV1> tombstones_;
    sqlite3* sqlite_db_{nullptr};
};

}  // namespace recording

// 파일 요약: 녹화 상태 변경의 append-only JSONL 원장 계약을 선언한다.
// 동작 요약: mutation envelope 직렬화, fsync append, 손상 허용 replay 결과를 제공한다.
#pragma once

#include <cstdint>
#include <filesystem>
#include <mutex>
#include <memory>
#include <string>
#include <vector>

namespace recording {
struct ManagedJournalState;
struct RecordingJournalRecordLocation;
using RecordingJournalRecordLocationHandle = std::shared_ptr<const RecordingJournalRecordLocation>;
using RecordingJournalRecordLocations = std::vector<RecordingJournalRecordLocationHandle>;
class RecordingCheckpointReadSnapshot;
using RecordingCheckpointReadSnapshotHandle = std::shared_ptr<const RecordingCheckpointReadSnapshot>;
class RecordingJournalRecordRef;
using RecordingJournalRecordRefHandle = std::shared_ptr<const RecordingJournalRecordRef>;
using RecordingJournalRecordRefs = std::vector<RecordingJournalRecordRefHandle>;

enum class RecordingMutationType {
    SegmentFinalized,
    EventLinkCreated,
    ObservationPut,
    ObservationV2Put,
    ConsumerReferencePut,
    DerivedReferenceAccepted,
    ReferencedObservationPut,
    DerivedJobIntent,
    DerivedJobFiles,
    DerivedJobReady,
    DerivedJobCommitted,
    DerivedJobComplete,
    DerivedJobFailed,
    DeletionRequested,
    DeletionCompleted,
    CorruptionDetected,
    RecordingOrderReserved,
    SegmentV2Finalized,
    SegmentV2BoundFinalized,
    SegmentV2State,
    SegmentV2Deleted,
    EventLinkReceipt,
    Unknown,
};

struct RecordingMutationV1 {
    std::string schema{"media-server.recording-mutation.v1"};
    std::string mutation_id;
    RecordingMutationType mutation_type{RecordingMutationType::Unknown};
    std::int64_t occurred_at_ms{0};
    std::string entity_id;
    std::string payload_json{"{}"};
};

// 내부 checkpoint 소유 핸들. 공개 mutation/Replay는 기존 독립 값 반환을 유지한다.
using RecordingMutationHandle = std::shared_ptr<const RecordingMutationV1>;
using RecordingMutationHandles = std::vector<RecordingMutationHandle>;
class RecordingJournalOwnedView;
using RecordingJournalOwnedViewHandle = std::shared_ptr<const RecordingJournalOwnedView>;
using RecordingJournalOwnedViews = std::vector<RecordingJournalOwnedViewHandle>;

// 상세 값은 호출자가 명시적으로 획득한다. 약한 링크를 원시 포인터로 노출하지 않는다.
class RecordingMutationLink {
    friend class RecordingJournal;
    RecordingJournalRecordRefHandle ref_;
    std::shared_ptr<const char> authority_;
    std::weak_ptr<const RecordingMutationV1> weak_;
    RecordingMutationHandle resident_;
    std::size_t logical_charge_{0};
public:
    RecordingMutationLink()=default;
    RecordingMutationHandle ResidentOwned() const { return resident_; }
    std::size_t LogicalCharge() const { return logical_charge_; }
    bool IsWeakLink() const { return static_cast<bool>(ref_); }
};
using RecordingMutationLinks = std::vector<RecordingMutationLink>;

struct RecordingJournalReplayResult {
    std::vector<RecordingMutationV1> mutations;
    std::size_t corrupt_line_count{0};
    std::size_t unsupported_record_count{0};
    std::size_t truncated_tail_count{0};
    std::size_t io_error_count{0};  // 안전한 원본 FD를 읽지 못함; 정상 빈 원장과 구분.
};

struct RecordingOrderReservationV1 {
    std::string schema{"media-server.recording-order.v1"};
    std::string store_id, request_id, segment_id, channel_id;
    std::int64_t sequence{0};
};
bool ParseRecordingOrderReservationV1(const std::string& json,
                                     RecordingOrderReservationV1* value, std::string* error);

std::string RecordingMutationTypeName(RecordingMutationType type);
bool ValidateRecordingOrderHistory(const std::vector<RecordingMutationV1>& mutations,
                                  std::vector<RecordingOrderReservationV1>* orders, std::string* error);
RecordingMutationType ParseRecordingMutationType(const std::string& value);
std::string SerializeRecordingMutationV1(const RecordingMutationV1& value);
bool ParseRecordingMutationV1(const std::string& json,
                              RecordingMutationV1* value,
                              std::string* error);

class RecordingJournal {
public:
    // store_id가 비면 lease 아래 기존 marker ID를 복원하거나 신규 난수 ID를 내구 생성한다.
    struct ManagedOptions { std::filesystem::path root; std::string store_id; };
    explicit RecordingJournal(std::filesystem::path path);
    explicit RecordingJournal(ManagedOptions options);
    ~RecordingJournal();
    bool HasManagedLease() const;
    std::string ManagedStoreId() const;
    bool Open(std::string* error);
    bool Append(const RecordingMutationV1& mutation, std::string* error);
    bool ReserveRecordingOrder(const std::string& store_id, const std::string& request_id,
                               const std::string& segment_id, const std::string& channel_id,
                               RecordingOrderReservationV1* result, std::string* error);
    RecordingJournalReplayResult Replay() const;
    const std::filesystem::path& path() const;

private:
    friend class RecordingCatalog;
    bool AttachCatalog(const void* owner, const std::filesystem::path& media,
                       const std::filesystem::path& sqlite, bool enable_v2, std::string* error);
    void DetachCatalog(const void* owner);
    bool OwnsCatalog(const void* owner) const;
    bool AppendOwned(const RecordingMutationV1& mutation, const void* owner, std::string* error,
                     RecordingMutationHandle* appended = nullptr, RecordingJournalOwnedViewHandle* view = nullptr);
    bool LoadManagedStateLocked(std::string* error);
    bool CheckManagedStateLocked(std::string* error) const;
    bool ManagedOrderMatches(const RecordingOrderReservationV1& order, std::string* error) const;
    bool ReadCheckpointRecords(const void* owner, RecordingMutationHandles* records, std::string* error,
                               RecordingCheckpointReadSnapshotHandle* snapshot = nullptr,
                               RecordingJournalOwnedViews* views = nullptr) const;
    bool MakeMutationLink(const RecordingJournalOwnedViewHandle& view, const RecordingMutationV1& mutation,
                          RecordingMutationHandle fallback, RecordingMutationLink* link, std::string* error) const;
    bool AcquireMutationLink(const RecordingMutationLink& link, RecordingMutationHandle* record, std::string* error) const;
    bool MatchMutationLinkView(const RecordingMutationLink& link, const RecordingJournalOwnedViewHandle& view,
                              bool* matches, std::string* error) const;
    bool MutationLinkOwns(const RecordingMutationLink& link, const RecordingMutationHandle& record) const;
    bool CanReleaseMutationLink(const RecordingMutationLink& link) const;
    bool OwnedViewMatchesLocked(const RecordingJournalOwnedViewHandle& view) const;
    bool ReadRecordLocations(const void* owner, RecordingJournalRecordLocations* records, std::string* error) const;
    bool ReadRecordRefs(const void* owner, RecordingJournalRecordRefs* refs, std::string* error) const;
    bool AcquireRecordRef(const void* owner, const RecordingJournalRecordRefHandle& ref,
                          RecordingMutationHandle* record, std::string* error) const;
    bool AcquireLocatedRecord(const void* owner, const RecordingJournalRecordLocationHandle& location,
                             RecordingMutationHandle* record, std::string* error) const;
    bool ReleaseRecordResidents(const void* owner, std::string* error);
    bool AcquireLocatedRecordLocked(const RecordingJournalRecordLocationHandle& location,
                                    RecordingMutationHandle* record, std::string* error) const;
    bool AcquireCheckpointRecordsLocked(RecordingMutationHandles* records, std::string* error) const;
    bool CheckpointSnapshotMatchesLocked(const void* owner,const RecordingCheckpointReadSnapshotHandle& snapshot) const;
    bool PrepareCheckpoint(const void* owner, RecordingMutationHandles* candidate, std::string* error,
                           const RecordingCheckpointReadSnapshotHandle& snapshot = {}) const;
    bool CommitCheckpoint(const void* owner, const RecordingMutationHandles& candidate, bool recover_only, std::string* error,
                          const RecordingCheckpointReadSnapshotHandle& snapshot = {});
    bool CheckpointDue(const void* owner) const;
    bool CheckpointPending() const;
    std::unique_ptr<ManagedJournalState> managed_state_;
    mutable bool poisoned_{false};
    std::uint64_t checkpoint_checked_bytes_{0};
    const void* catalog_owner_{nullptr};
    std::shared_ptr<const char> catalog_attachment_;
    bool OpenManagedLocked(std::string* error);
    bool ManagedBindingLocked() const;
    bool managed_{false};
    std::filesystem::path managed_root_;
    std::string managed_store_id_;
    int managed_fd_{-1}, lease_fd_{-1};
    std::int64_t owner_pid_{0};
    std::uint64_t lease_inode_{0}, marker_inode_{0}, barrier_inode_{0};
    std::filesystem::path path_;
    mutable std::mutex mu_;
    bool opened_{false};
    std::filesystem::path io_path_;
    std::uint64_t device_{0}, inode_{0}, parent_device_{0}, parent_inode_{0};
};

}  // namespace recording

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
    struct ManagedOptions { std::filesystem::path root; std::string store_id; };
    explicit RecordingJournal(std::filesystem::path path);
    explicit RecordingJournal(ManagedOptions options);
    ~RecordingJournal();
    bool HasManagedLease() const;
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
    bool AppendOwned(const RecordingMutationV1& mutation, const void* owner, std::string* error);
    bool LoadManagedStateLocked(std::string* error);
    bool CheckManagedStateLocked(std::string* error) const;
    bool ManagedOrderMatches(const RecordingOrderReservationV1& order, std::string* error) const;
    bool PrepareCheckpoint(const void* owner, std::vector<RecordingMutationV1>* candidate, std::string* error) const;
    bool CommitCheckpoint(const void* owner, const std::vector<RecordingMutationV1>& candidate, bool recover_only, std::string* error);
    bool CheckpointDue(const void* owner) const;
    bool CheckpointPending() const;
    std::unique_ptr<ManagedJournalState> managed_state_;
    mutable bool poisoned_{false};
    std::uint64_t checkpoint_checked_bytes_{0};
    const void* catalog_owner_{nullptr};
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

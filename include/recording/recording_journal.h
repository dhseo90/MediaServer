// 파일 요약: 녹화 상태 변경의 append-only JSONL 원장 계약을 선언한다.
// 동작 요약: mutation envelope 직렬화, fsync append, 손상 허용 replay 결과를 제공한다.
#pragma once

#include <cstdint>
#include <filesystem>
#include <functional>
#include <mutex>
#include <memory>
#include <string>
#include <vector>
#include <unordered_set>

namespace recording {
class RecordingGenerationCheckpointPlan;
struct ManagedJournalState;
struct RecordingJournalGenerationState;
struct RecordingGenerationMutationRef;
class RecordingGenerationRecoverySession;
class RecordingGenerationRecoveryRow;
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
    // 관리 원장의 checkpoint 물리 행만 사용한다. 공개 직렬화/Replay 의미에는 포함되지 않는다.
    std::string physical_json;
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
    std::shared_ptr<const RecordingGenerationMutationRef> generation_ref_;
    std::shared_ptr<const char> authority_;
    std::weak_ptr<const RecordingMutationV1> weak_;
    RecordingMutationHandle resident_;
    std::size_t logical_charge_{0};
public:
    RecordingMutationLink()=default;
    RecordingMutationHandle ResidentOwned() const { return resident_; }
    std::size_t LogicalCharge() const { return logical_charge_; }
    bool IsWeakLink() const { return static_cast<bool>(ref_) || static_cast<bool>(generation_ref_); }
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
    // B 전용 admission. 0은 미설정이며 B Open만 거부한다. v1 수용 범위와 무관하다.
    struct GenerationReadLimits {
        std::uint64_t snapshot_bytes{0},active_bytes{0},identity_shard_bytes{0},cold_row_bytes{0};
        std::size_t identity_unique_ids{0},identity_archives{0};
    };
    struct ManagedOptions { std::filesystem::path root; std::string store_id; GenerationReadLimits generation_limits{}; };
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
#if defined(MEDIA_SERVER_RECORDING_GENERATION_TESTING)
    friend struct RecordingJournalGenerationReadOnlyProbe;
    friend struct RecordingGenerationPreappendProbe;
    friend struct RecordingGenerationAppendProbe;
    friend struct RecordingCutoverSessionProbe;
    static thread_local int generation_write_fault_;
    static thread_local void (*generation_cleanup_before_unlink_)();
    static bool ProbeOrderValidation(const std::vector<RecordingMutationV1>& history,
        const RecordingMutationV1& candidate, bool* unchanged, std::string* error);
#endif
    bool AttachCatalog(const void* owner, const std::filesystem::path& media,
                       const std::filesystem::path& sqlite, bool enable_v2, std::string* error);
    void DetachCatalog(const void* owner);
    bool OwnsCatalog(const void* owner) const;
    // 동기 private 방문. callback은 무잠금으로 호출하며 결과는 비공개 후보에만 적용한다.
    bool VisitManagedCutoverInput(const void* owner,
        const std::function<bool(const struct RecordingCutoverInputRow&,const RecordingJournalOwnedViewHandle&,std::string*)>& visitor,
        struct RecordingCutoverInputSummary* summary,std::string* error);
    bool cutover_input_frozen_{false};
    bool cutover_owner_retired_{false};
    bool PublishManagedCutover(const void* owner,const struct RecordingCutoverInputSummary&,
        class RecordingGenerationTransaction&,const struct RecordingGenerationReceipt&,std::string*);
    struct ManagedCutoverRecoveryState;
    std::shared_ptr<ManagedCutoverRecoveryState> cutover_recovery_;
    bool ManagedCutoverRoot(std::filesystem::path*,std::string*) const;
    bool BeginManagedCutoverRecovery(const void* owner,class RecordingGenerationTransaction&,
        const std::filesystem::path& media,const std::filesystem::path& sqlite,std::string*);
    void EndManagedCutoverRecovery();
    bool ValidatePreappend(const void* owner, const RecordingMutationV1& mutation, std::string* error);
    bool EnableGenerationWrites(const void* owner,std::string* error);
    bool PrepareGenerationCheckpoint(const void* owner,std::shared_ptr<RecordingGenerationCheckpointPlan>*,std::string* error);
    bool PublishGenerationCheckpoint(const void* owner,const std::shared_ptr<RecordingGenerationCheckpointPlan>&,
        const std::string& snapshot,const std::function<bool(std::uint64_t,std::uint64_t)>& sql,std::string* error);
    bool GenerationRotationNeeded(const void* owner,const RecordingMutationV1&,bool*,std::string* error);
    bool GenerationRotationNeededLocked(const RecordingMutationV1&,bool*,std::string* error);
    bool ValidateGenerationCheckpointCommitLocked(std::string* error) const;
    bool ValidateGenerationOwner(const void* owner,std::string* error);
    void PoisonGeneration(const void* owner);
    bool CommitGenerationDelta(const void* owner,const std::function<bool()>& commit,std::string* error);
    bool AppendGeneration(const void* owner,const RecordingMutationV1&,
        std::shared_ptr<const RecordingGenerationRecoveryRow>*,std::string*);
    bool AppendGenerationLocked(const void* owner,const RecordingMutationV1&,
        std::shared_ptr<const RecordingGenerationRecoveryRow>*,std::string*,bool reservation=false);
    bool ReserveGeneration(const void* owner,const std::string&,const std::string&,const std::string&,const std::string&,
        RecordingOrderReservationV1*,std::shared_ptr<const RecordingGenerationRecoveryRow>*,std::string*,bool* rotation=nullptr);
    bool AppendOwned(const RecordingMutationV1& mutation, const void* owner, std::string* error,
                     RecordingMutationHandle* appended = nullptr, RecordingJournalOwnedViewHandle* view = nullptr);
    bool LoadManagedStateLocked(std::string* error);
    bool CheckManagedStateLocked(std::string* error) const;
    bool CheckManagedFdStateLocked(std::string* error) const;
    bool ManagedOrderMatches(const RecordingOrderReservationV1& order, std::string* error) const;
    bool ReadCheckpointRecords(const void* owner, RecordingMutationHandles* records, std::string* error,
                               RecordingCheckpointReadSnapshotHandle* snapshot = nullptr,
                               RecordingJournalOwnedViews* views = nullptr) const;
    bool MakeMutationLink(const RecordingJournalOwnedViewHandle& view, const RecordingMutationV1& mutation,
                          RecordingMutationHandle fallback, RecordingMutationLink* link, std::string* error) const;
    bool AcquireMutationLink(const RecordingMutationLink& link, RecordingMutationHandle* record, std::string* error) const;
    // B 복원 전용 세션. Catalog attachment/쓰기 권한을 부여하지 않는다.
    bool MakeGenerationMutationLink(const std::string& id, RecordingMutationLink* link, std::string* error) const;
    void EndGenerationMutationLinks() const;
    bool BeginGenerationRecovery(std::shared_ptr<RecordingGenerationRecoverySession>*,std::string*);
    bool ReadGenerationRecovery(const std::shared_ptr<RecordingGenerationRecoverySession>&,
        std::shared_ptr<const RecordingGenerationRecoveryRow>*,std::string*);
    bool FinishGenerationRecovery(const std::shared_ptr<RecordingGenerationRecoverySession>&,bool success,std::string*);
    bool AttachGenerationCatalog(const void*,const std::filesystem::path&,const std::filesystem::path&,bool,std::string*);
    bool ValidateGenerationCache(const std::shared_ptr<RecordingGenerationRecoverySession>&,std::string*) const;
    bool VisitGenerationIdentities(const std::shared_ptr<RecordingGenerationRecoverySession>&,
        const std::function<bool(const std::string&,RecordingMutationType,const std::string&,std::int64_t,std::uint64_t,const std::string&)>&,std::string*);
    bool PublishGenerationCatalog(const std::shared_ptr<RecordingGenerationRecoverySession>&,const void*,
        const std::function<bool()>& commit,const std::function<void()>& publish,std::string*);
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
                                    RecordingMutationHandle* record, std::string* error,
                                    bool checkpoint_binding_checked = false) const;
    bool AcquireCheckpointRecordsLocked(RecordingMutationHandles* records, std::string* error,
                                        bool checkpoint_binding_checked = false) const;
    bool CheckpointSnapshotMatchesLocked(const void* owner,const RecordingCheckpointReadSnapshotHandle& snapshot) const;
    bool PrepareCheckpoint(const void* owner, RecordingMutationHandles* candidate, std::string* error,
                           const RecordingCheckpointReadSnapshotHandle& snapshot = {}) const;
    bool CommitCheckpoint(const void* owner, const RecordingMutationHandles& candidate, bool recover_only, std::string* error,
                          const RecordingCheckpointReadSnapshotHandle& snapshot = {});
    bool CheckpointDue(const void* owner) const;
    bool TryAutomaticCheckpointNoop(const void* owner,const std::unordered_set<std::string>& accepted,
                                    bool* handled,std::string* error);
    void InvalidateAutomaticCheckpointNoop(const void* owner);
    bool CheckpointPending() const;
    std::unique_ptr<ManagedJournalState> managed_state_;
    mutable bool poisoned_{false};
    std::uint64_t checkpoint_checked_bytes_{0};
    const void* catalog_owner_{nullptr};
    std::shared_ptr<const char> catalog_attachment_;
    bool OpenManagedLocked(std::string* error);
    bool OpenGenerationReadOnlyLocked(const std::string& store_id,std::string* error);
    bool GenerationBindingLocked() const;
    bool ManagedBindingLocked() const;
    bool ManagedTransactionPendingLocked() const;
    GenerationReadLimits generation_limits_;
    std::unique_ptr<RecordingJournalGenerationState> generation_state_;
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

#if defined(MEDIA_SERVER_RECORDING_GENERATION_TESTING)
void RecordingMutationCodecCountsForTest(std::uint64_t* parses,std::uint64_t* serializes,bool reset=false);
#endif
}  // namespace recording

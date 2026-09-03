// 파일 요약: 녹화 보존 등급별 quota·기간·disk reserve 정리 계약을 선언한다.
// 동작 요약: 순수 삭제 계획과 journal 선행 side effect, 채널별 쓰기 차단·복구를 분리한다.
#pragma once

#include <cstdint>
#include <filesystem>
#include <functional>
#include <mutex>
#include <string>
#include <string_view>
#include <unordered_map>
#include <vector>

#include "recording/recording_store_port.h"

namespace recording {

enum class RetentionCleanupReason {
    ContinuousCapacity,
    ContinuousAge,
    EventCapacity,
    EventAge,
    ReservedFreeSpace,
    ManualCorruptCleanup,
};

std::string RetentionCleanupReasonName(RetentionCleanupReason reason);

struct RetentionCandidate {
    RecordingSegmentV1 segment;
    std::filesystem::path media_path;
    std::uint64_t hold_count{0};
    std::string deletion_reason;
};

struct RetentionSnapshot {
    std::vector<RetentionCandidate> candidates;
};

struct RetentionPolicy {
    std::uint64_t continuous_max_bytes{0};
    std::int64_t continuous_max_age_ms{0};
    std::uint64_t event_max_bytes{0};
    std::int64_t event_max_age_ms{0};
};

struct RetentionPlanRequest {
    std::string channel_id;
    RetentionPolicy policy;
    std::int64_t now_ms{0};
    std::uint64_t free_bytes{0};
    std::uint64_t reserved_free_bytes{0};
    std::uint64_t required_write_bytes{0};
};

struct RetentionDeletion {
    RetentionCandidate candidate;
    RetentionCleanupReason reason{RetentionCleanupReason::ContinuousCapacity};
};

struct RetentionPlan {
    std::vector<RetentionDeletion> deletions;
    std::uint64_t projected_reclaimed_bytes{0};
    std::size_t eligible_count{0};
    bool continuous_quota_satisfied{true};
    bool event_quota_satisfied{true};
    bool quota_satisfied{true};
    bool reserve_satisfied{true};
};

struct RetentionApplyResult {
    bool ok{true};
    std::uint64_t reclaimed_bytes{0};
    std::size_t deleted_count{0};
    std::string last_error;
};

struct RetentionAdmissionResult {
    bool allowed{false};
    bool start_new_epoch{false};
    std::uint64_t reserved_bytes{0};
    std::string message;
};

using BeforeContainedUnlinkHook = std::function<void()>;
bool WriteContainedFileDurably(const std::filesystem::path& media_root,
                               const std::filesystem::path& media_path,
                               std::string_view contents,
                               std::string* error);
bool RemoveContainedMediaFile(const std::filesystem::path& media_root,
                              const std::filesystem::path& media_path,
                              std::string* error,
                              BeforeContainedUnlinkHook before_unlink = {});
bool TruncateContainedMediaFile(const std::filesystem::path& media_root,
                                const std::filesystem::path& media_path,
                                std::string* error);

struct RetentionChannelStatus {
    bool storage_blocked{false};
    std::uint64_t required_bytes{0};
    std::uint64_t free_bytes{0};
    std::size_t eligible_count{0};
    std::string last_error;
};

class RetentionCoordinator {
public:
    struct Options {
        std::uint64_t reserved_free_bytes{0};
        std::uint64_t default_expected_segment_bytes{64ULL * 1024ULL * 1024ULL};
        std::filesystem::path media_root;
    };

    using SnapshotProvider = std::function<RetentionSnapshot()>;
    using FreeSpaceProvider =
        std::function<bool(std::uint64_t* free_bytes, std::string* error)>;
    using MediaUnlinker =
        std::function<bool(const std::filesystem::path& path, std::string* error)>;

    RetentionCoordinator(RecordingStorePort& store,
                         SnapshotProvider snapshot_provider,
                         FreeSpaceProvider free_space_provider,
                         MediaUnlinker media_unlinker,
                         Options options);

    static RetentionPlan Plan(const RetentionSnapshot& snapshot,
                              const RetentionPlanRequest& request);
    RetentionApplyResult Apply(const RetentionPlan& plan, std::int64_t deleted_at_ms);
    RetentionApplyResult RecoverPending(std::int64_t deleted_at_ms);

    bool UpdateChannelPolicy(const std::string& channel_id,
                             const RetentionPolicy& policy,
                             std::string* error);
    void RemoveChannelPolicy(const std::string& channel_id);
    void RunPeriodic(std::int64_t now_ms);
    RetentionAdmissionResult AdmitContinuousWrite(const std::string& channel_id,
                                                  std::uint64_t expected_segment_bytes,
                                                  std::int64_t now_ms);
    void UpdateContinuousWriteProgress(const std::string& channel_id,
                                       std::uint64_t written_bytes);
    void CompleteContinuousWrite(const std::string& channel_id,
                                 std::uint64_t actual_segment_bytes);
    RetentionChannelStatus ChannelStatus(const std::string& channel_id) const;

private:
    struct InflightReservation {
        std::uint64_t reserved_bytes{0};
        std::uint64_t written_bytes{0};
    };

    RetentionApplyResult RecoverPendingForChannel(std::int64_t deleted_at_ms,
                                                   const std::string& channel_id);
    std::uint64_t OutstandingReservationsLocked() const;

    RecordingStorePort& store_;
    SnapshotProvider snapshot_provider_;
    FreeSpaceProvider free_space_provider_;
    MediaUnlinker media_unlinker_;
    Options options_;
    std::mutex apply_mu_;
    std::mutex admission_mu_;
    mutable std::mutex mu_;
    std::unordered_map<std::string, RetentionPolicy> policies_;
    std::unordered_map<std::string, RetentionChannelStatus> statuses_;
    std::unordered_map<std::string, InflightReservation> inflight_reservations_;
    std::unordered_map<std::string, std::uint64_t> observed_segment_bytes_;
};

}  // namespace recording

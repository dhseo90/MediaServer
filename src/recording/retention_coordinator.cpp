// 파일 요약: 등급별 녹화 순환 삭제와 disk reserve writer admission을 구현한다.
// 동작 요약: oldest-first 계획 뒤 journal→pending→unlink→tombstone 순서로 공간을 회수한다.
#include "recording/retention_coordinator.h"

#include <algorithm>
#include <atomic>
#include <cerrno>
#include <cstring>
#include <limits>
#include <unordered_set>

#if defined(__APPLE__) || defined(__linux__)
#include <fcntl.h>
#include <sys/stat.h>
#include <unistd.h>
#endif

namespace recording {
namespace {

std::uint64_t SaturatingAdd(std::uint64_t lhs, std::uint64_t rhs) {
    if (rhs > std::numeric_limits<std::uint64_t>::max() - lhs) {
        return std::numeric_limits<std::uint64_t>::max();
    }
    return lhs + rhs;
}

bool IsEligible(const RetentionCandidate& candidate) {
    return candidate.segment.lifecycle == RecordingLifecycle::Finalized &&
           !candidate.segment.pinned && candidate.hold_count == 0 &&
           !candidate.media_path.empty();
}

bool IsClass(const RetentionCandidate& candidate, RecordingRetentionClass retention_class) {
    return candidate.segment.retention_class == retention_class;
}

bool OldestFirst(const RetentionCandidate* lhs, const RetentionCandidate* rhs) {
    if (lhs->segment.end.utc_ms != rhs->segment.end.utc_ms) {
        return lhs->segment.end.utc_ms < rhs->segment.end.utc_ms;
    }
    return lhs->segment.segment_id < rhs->segment.segment_id;
}

bool IsContainedMediaPath(const std::filesystem::path& media_root,
                          const std::filesystem::path& media_path) {
    if (media_root.empty() || media_path.empty()) return false;
    std::error_code error;
    const auto canonical_root = std::filesystem::weakly_canonical(media_root, error);
    if (error) return false;
    const auto canonical_path = std::filesystem::weakly_canonical(media_path, error);
    if (error || canonical_path == canonical_root) return false;
    const auto relative = canonical_path.lexically_relative(canonical_root);
    if (relative.empty() || relative.is_absolute()) return false;
    for (const auto& component : relative) {
        if (component == "..") return false;
    }
    return true;
}

#if defined(__APPLE__) || defined(__linux__)
class ScopedFd {
public:
    explicit ScopedFd(int fd = -1) : fd_(fd) {}
    ~ScopedFd() {
        if (fd_ >= 0) ::close(fd_);
    }
    ScopedFd(const ScopedFd&) = delete;
    ScopedFd& operator=(const ScopedFd&) = delete;
    ScopedFd(ScopedFd&& other) noexcept : fd_(other.fd_) { other.fd_ = -1; }
    ScopedFd& operator=(ScopedFd&& other) noexcept {
        if (this == &other) return *this;
        if (fd_ >= 0) ::close(fd_);
        fd_ = other.fd_;
        other.fd_ = -1;
        return *this;
    }
    int get() const { return fd_; }

private:
    int fd_{-1};
};

bool SetErrnoError(std::string* error, const std::string& prefix) {
    if (error != nullptr) *error = prefix + ": " + std::strerror(errno);
    return false;
}

bool OpenContainedParentDirectory(const std::filesystem::path& media_root,
                                  const std::filesystem::path& media_path,
                                  ScopedFd* directory,
                                  std::string* leaf,
                                  bool* missing,
                                  std::string* error) {
    if (missing != nullptr) *missing = false;
    if (media_root.empty() || media_path.empty()) {
        if (error != nullptr) *error = "녹화 storage root 또는 media 경로가 비어 있음";
        return false;
    }
    std::error_code path_error;
    const auto absolute_root =
        std::filesystem::weakly_canonical(media_root, path_error).lexically_normal();
    if (path_error) {
        if (error != nullptr) *error = "녹화 storage root 절대 경로 변환 실패";
        return false;
    }
    const auto absolute_media =
        std::filesystem::weakly_canonical(media_path, path_error).lexically_normal();
    if (path_error || absolute_media == absolute_root) {
        if (error != nullptr) *error = "녹화 media 절대 경로가 유효하지 않음";
        return false;
    }
    const auto relative = absolute_media.lexically_relative(absolute_root);
    if (relative.empty() || relative.is_absolute()) {
        if (error != nullptr) *error = "녹화 media 경로가 storage root 밖임";
        return false;
    }
    std::vector<std::string> components;
    for (const auto& component_path : relative) {
        const std::string component = component_path.string();
        if (component.empty() || component == "." || component == "..") {
            if (error != nullptr) *error = "녹화 media 상대 경로에 허용되지 않은 요소가 있음";
            return false;
        }
        components.push_back(component);
    }
    if (components.empty()) {
        if (error != nullptr) *error = "녹화 media 파일명이 비어 있음";
        return false;
    }

    ScopedFd current(::open(absolute_root.c_str(),
                            O_RDONLY | O_DIRECTORY | O_CLOEXEC | O_NOFOLLOW));
    if (current.get() < 0) {
        if (errno == ENOENT && missing != nullptr) {
            *missing = true;
            if (error != nullptr) error->clear();
            return false;
        }
        return SetErrnoError(error, "녹화 storage root 열기 실패");
    }
    for (std::size_t i = 0; i + 1 < components.size(); ++i) {
        const int child = ::openat(current.get(), components[i].c_str(),
                                   O_RDONLY | O_DIRECTORY | O_CLOEXEC | O_NOFOLLOW);
        if (child < 0) {
            if (errno == ENOENT && missing != nullptr) {
                *missing = true;
                if (error != nullptr) error->clear();
                return false;
            }
            return SetErrnoError(error, "녹화 media 상위 디렉터리 열기 실패");
        }
        current = ScopedFd(child);
    }
    *directory = std::move(current);
    *leaf = components.back();
    return true;
}
#endif

std::string NextTombstoneId(std::int64_t deleted_at_ms) {
    static std::atomic<std::uint64_t> sequence{0};
    return "tomb-" + std::to_string(deleted_at_ms) + "-" + std::to_string(++sequence);
}

}  // namespace

bool WriteContainedFileDurably(const std::filesystem::path& media_root,
                               const std::filesystem::path& media_path,
                               std::string_view contents,
                               std::string* error) {
#if defined(__APPLE__) || defined(__linux__)
    ScopedFd directory;
    std::string leaf;
    if (!OpenContainedParentDirectory(
            media_root, media_path, &directory, &leaf, nullptr, error)) {
        return false;
    }
    ScopedFd file(::openat(directory.get(), leaf.c_str(),
                           O_WRONLY | O_CREAT | O_EXCL | O_CLOEXEC | O_NOFOLLOW,
                           0600));
    if (file.get() < 0) return SetErrnoError(error, "녹화 내구 파일 생성 실패");
    std::size_t written = 0;
    while (written < contents.size()) {
        const ssize_t count = ::write(file.get(), contents.data() + written,
                                      contents.size() - written);
        if (count < 0 && errno == EINTR) continue;
        if (count <= 0) {
            const int write_errno = errno;
            ::unlinkat(directory.get(), leaf.c_str(), 0);
            ::fsync(directory.get());
            errno = write_errno;
            return SetErrnoError(error, "녹화 내구 파일 쓰기 실패");
        }
        written += static_cast<std::size_t>(count);
    }
    if (::fsync(file.get()) != 0) {
        const int sync_errno = errno;
        ::unlinkat(directory.get(), leaf.c_str(), 0);
        ::fsync(directory.get());
        errno = sync_errno;
        return SetErrnoError(error, "녹화 내구 파일 fsync 실패");
    }
    if (::fsync(directory.get()) != 0) {
        const int sync_errno = errno;
        ::unlinkat(directory.get(), leaf.c_str(), 0);
        ::fsync(directory.get());
        errno = sync_errno;
        return SetErrnoError(error, "녹화 내구 파일 상위 디렉터리 fsync 실패");
    }
    if (error != nullptr) error->clear();
    return true;
#else
    (void)media_root;
    (void)media_path;
    (void)contents;
    if (error != nullptr) *error = "지원하지 않는 플랫폼의 내구 파일 생성";
    return false;
#endif
}

bool RemoveContainedMediaFile(const std::filesystem::path& media_root,
                              const std::filesystem::path& media_path,
                              std::string* error,
                              BeforeContainedUnlinkHook before_unlink,
                              bool require_single_link) {
    if (media_root.empty() || media_path.empty()) {
        if (error != nullptr) *error = "녹화 storage root 또는 media 경로가 비어 있음";
        return false;
    }
#if defined(__APPLE__) || defined(__linux__)
    ScopedFd directory;
    std::string leaf;
    bool missing = false;
    if (!OpenContainedParentDirectory(
            media_root, media_path, &directory, &leaf, &missing, error)) {
        if (missing) {
            if (error != nullptr) error->clear();
            return true;
        }
        return false;
    }

    struct stat media_stat {};
    if (::fstatat(directory.get(), leaf.c_str(), &media_stat,
                  AT_SYMLINK_NOFOLLOW) != 0) {
        if (errno == ENOENT) {
            if (error != nullptr) error->clear();
            return true;
        }
        return SetErrnoError(error, "녹화 media 상태 확인 실패");
    }
    if (!S_ISREG(media_stat.st_mode)) {
        if (error != nullptr) *error = "녹화 media 삭제 대상이 일반 파일이 아님";
        return false;
    }
    if (require_single_link && media_stat.st_nlink != 1) {
        if (error != nullptr) *error = "녹화 media 삭제 대상이 단일 link 파일이 아님";
        return false;
    }
    if (before_unlink) {
        try {
            before_unlink();
        } catch (...) {
            if (error != nullptr) *error = "녹화 media 삭제 직전 검증 hook 실패";
            return false;
        }
    }
    if (::unlinkat(directory.get(), leaf.c_str(), 0) != 0) {
        if (errno != ENOENT) return SetErrnoError(error, "녹화 media unlink 실패");
    } else if (::fsync(directory.get()) != 0) {
        return SetErrnoError(error, "녹화 media 상위 디렉터리 fsync 실패");
    }
    if (error != nullptr) error->clear();
    return true;
#else
    (void)before_unlink;
    (void)require_single_link;
    if (error != nullptr) *error = "지원하지 않는 플랫폼의 안전 unlink";
    return false;
#endif
}

bool TruncateContainedMediaFile(const std::filesystem::path& media_root,
                                const std::filesystem::path& media_path,
                                std::string* error) {
#if defined(__APPLE__) || defined(__linux__)
    ScopedFd directory;
    std::string leaf;
    if (!OpenContainedParentDirectory(
            media_root, media_path, &directory, &leaf, nullptr, error)) {
        return false;
    }
    ScopedFd file(::openat(directory.get(), leaf.c_str(),
                           O_WRONLY | O_CLOEXEC | O_NOFOLLOW));
    if (file.get() < 0) return SetErrnoError(error, "녹화 media truncate 대상 열기 실패");
    struct stat media_stat {};
    if (::fstat(file.get(), &media_stat) != 0) {
        return SetErrnoError(error, "녹화 media truncate 대상 상태 확인 실패");
    }
    if (!S_ISREG(media_stat.st_mode) || media_stat.st_nlink != 1) {
        if (error != nullptr) *error = "녹화 media truncate 대상이 단일 link 일반 파일이 아님";
        return false;
    }
    if (::ftruncate(file.get(), 0) != 0 || ::fsync(file.get()) != 0) {
        return SetErrnoError(error, "녹화 media 안전 truncate 실패");
    }
    if (error != nullptr) error->clear();
    return true;
#else
    (void)media_root;
    (void)media_path;
    if (error != nullptr) *error = "지원하지 않는 플랫폼의 안전 truncate";
    return false;
#endif
}

std::string RetentionCleanupReasonName(RetentionCleanupReason reason) {
    switch (reason) {
        case RetentionCleanupReason::ContinuousCapacity: return "continuous-capacity";
        case RetentionCleanupReason::ContinuousAge: return "continuous-age";
        case RetentionCleanupReason::EventCapacity: return "event-capacity";
        case RetentionCleanupReason::EventAge: return "event-age";
        case RetentionCleanupReason::ReservedFreeSpace: return "reserved-free-space";
        case RetentionCleanupReason::ManualCorruptCleanup: return "manual-corrupt-cleanup";
    }
    return "manual-corrupt-cleanup";
}

RetentionCoordinator::RetentionCoordinator(RecordingStorePort& store,
                                           SnapshotProvider snapshot_provider,
                                           FreeSpaceProvider free_space_provider,
                                           MediaUnlinker media_unlinker,
                                           Options options)
    : store_(store),
      snapshot_provider_(std::move(snapshot_provider)),
      free_space_provider_(std::move(free_space_provider)),
      media_unlinker_(std::move(media_unlinker)),
      options_(options) {}

RetentionPlan RetentionCoordinator::Plan(const RetentionSnapshot& snapshot,
                                         const RetentionPlanRequest& request) {
    RetentionPlan plan;
    std::vector<const RetentionCandidate*> continuous;
    std::vector<const RetentionCandidate*> events;
    std::uint64_t continuous_bytes = 0;
    std::uint64_t event_bytes = 0;

    for (const auto& candidate : snapshot.candidates) {
        if (candidate.segment.channel_id != request.channel_id ||
            candidate.segment.lifecycle != RecordingLifecycle::Finalized) {
            continue;
        }
        if (IsClass(candidate, RecordingRetentionClass::Continuous)) {
            continuous_bytes = SaturatingAdd(continuous_bytes, candidate.segment.size_bytes);
            if (IsEligible(candidate)) continuous.push_back(&candidate);
        } else if (IsClass(candidate, RecordingRetentionClass::Event)) {
            event_bytes = SaturatingAdd(event_bytes, candidate.segment.size_bytes);
            if (IsEligible(candidate)) events.push_back(&candidate);
        }
    }
    if (request.required_write_class == RecordingRetentionClass::Event) {
        event_bytes = SaturatingAdd(event_bytes, request.required_write_bytes);
    } else {
        continuous_bytes = SaturatingAdd(continuous_bytes, request.required_write_bytes);
    }
    std::sort(continuous.begin(), continuous.end(), OldestFirst);
    std::sort(events.begin(), events.end(), OldestFirst);
    plan.eligible_count = continuous.size();

    std::unordered_set<std::string> selected;
    const auto select = [&](const RetentionCandidate* candidate,
                            RetentionCleanupReason reason,
                            RetentionPlan* output) {
        if (!selected.insert(candidate->segment.segment_id).second) return;
        output->deletions.push_back({*candidate, reason});
        output->projected_reclaimed_bytes = SaturatingAdd(
            output->projected_reclaimed_bytes, candidate->segment.size_bytes);
    };

    const auto select_aged = [&](const std::vector<const RetentionCandidate*>& candidates,
                                 std::int64_t max_age_ms,
                                 RetentionCleanupReason reason,
                                 std::uint64_t* bytes) {
        if (max_age_ms <= 0) return;
        const std::int64_t cutoff =
            request.now_ms < std::numeric_limits<std::int64_t>::min() + max_age_ms
                ? std::numeric_limits<std::int64_t>::min()
                : request.now_ms - max_age_ms;
        for (const auto* candidate : candidates) {
            if (candidate->segment.end.utc_ms > cutoff) continue;
            select(candidate, reason, &plan);
            *bytes = candidate->segment.size_bytes > *bytes
                         ? 0
                         : *bytes - candidate->segment.size_bytes;
        }
    };
    select_aged(continuous, request.policy.continuous_max_age_ms,
                RetentionCleanupReason::ContinuousAge, &continuous_bytes);
    select_aged(events, request.policy.event_max_age_ms,
                RetentionCleanupReason::EventAge, &event_bytes);

    const auto select_capacity = [&](const std::vector<const RetentionCandidate*>& candidates,
                                     std::uint64_t max_bytes,
                                     RetentionCleanupReason reason,
                                     std::uint64_t* bytes) {
        for (const auto* candidate : candidates) {
            if (*bytes <= max_bytes) break;
            if (selected.find(candidate->segment.segment_id) != selected.end()) continue;
            select(candidate, reason, &plan);
            *bytes = candidate->segment.size_bytes > *bytes
                         ? 0
                         : *bytes - candidate->segment.size_bytes;
        }
    };
    select_capacity(continuous, request.policy.continuous_max_bytes,
                    RetentionCleanupReason::ContinuousCapacity, &continuous_bytes);
    select_capacity(events, request.policy.event_max_bytes,
                    RetentionCleanupReason::EventCapacity, &event_bytes);
    plan.continuous_quota_satisfied =
        continuous_bytes <= request.policy.continuous_max_bytes;
    plan.event_quota_satisfied = event_bytes <= request.policy.event_max_bytes;
    plan.quota_satisfied =
        plan.continuous_quota_satisfied && plan.event_quota_satisfied;

    const std::uint64_t required_free = SaturatingAdd(
        request.reserved_free_bytes, request.required_write_bytes);
    std::uint64_t projected_free = SaturatingAdd(
        request.free_bytes, plan.projected_reclaimed_bytes);
    for (const auto* candidate : continuous) {
        if (projected_free >= required_free) break;
        if (selected.find(candidate->segment.segment_id) != selected.end()) continue;
        select(candidate, RetentionCleanupReason::ReservedFreeSpace, &plan);
        projected_free = SaturatingAdd(projected_free, candidate->segment.size_bytes);
    }
    plan.reserve_satisfied = projected_free >= required_free;
    return plan;
}

RetentionApplyResult RetentionCoordinator::Apply(const RetentionPlan& plan,
                                                 std::int64_t deleted_at_ms) {
    std::lock_guard apply_lock(apply_mu_);
    RetentionApplyResult result;
    for (const auto& deletion : plan.deletions) {
        std::string error;
        const std::string reason = RetentionCleanupReasonName(deletion.reason);
        if (!store_.RequestDeletion(deletion.candidate.segment.segment_id, reason, &error)) {
            result.ok = false;
            result.last_error = error.empty() ? "삭제 요청 journal 기록 실패" : error;
            return result;
        }
        if (!IsContainedMediaPath(options_.media_root, deletion.candidate.media_path)) {
            result.ok = false;
            result.last_error = "녹화 media 경로가 storage root 밖으로 변경됨";
            return result;
        }
        if (!media_unlinker_ ||
            !media_unlinker_(deletion.candidate.media_path, &error)) {
            result.ok = false;
            result.last_error = error.empty() ? "녹화 media unlink 실패" : error;
            return result;
        }
        RecordingTombstoneV1 tombstone;
        tombstone.tombstone_id = NextTombstoneId(deleted_at_ms);
        tombstone.segment_id = deletion.candidate.segment.segment_id;
        tombstone.source_id = deletion.candidate.segment.source_id;
        tombstone.channel_id = deletion.candidate.segment.channel_id;
        tombstone.recorded_range = {deletion.candidate.segment.start.utc_ms,
                                    deletion.candidate.segment.end.utc_ms};
        tombstone.checksum_sha256 = deletion.candidate.segment.checksum_sha256;
        tombstone.retention_class = deletion.candidate.segment.retention_class;
        tombstone.deletion_reason = reason;
        tombstone.deleted_at_ms = deleted_at_ms;
        if (!store_.CompleteDeletion(tombstone, &error)) {
            result.ok = false;
            result.last_error = error.empty() ? "삭제 tombstone journal 기록 실패" : error;
            return result;
        }
        result.reclaimed_bytes = SaturatingAdd(
            result.reclaimed_bytes, deletion.candidate.segment.size_bytes);
        ++result.deleted_count;
    }
    return result;
}

RetentionApplyResult RetentionCoordinator::RecoverPending(std::int64_t deleted_at_ms) {
    std::unordered_set<std::string> channels;
    for (const auto& candidate : snapshot_provider_().candidates) {
        if (candidate.segment.lifecycle == RecordingLifecycle::DeletionPending) {
            channels.insert(candidate.segment.channel_id);
        }
    }
    RetentionApplyResult aggregate;
    for (const auto& channel_id : channels) {
        const auto channel_result = RecoverPendingForChannel(deleted_at_ms, channel_id);
        aggregate.deleted_count += channel_result.deleted_count;
        if (!channel_result.ok) {
            aggregate.ok = false;
            if (aggregate.last_error.empty()) aggregate.last_error = channel_result.last_error;
        }
    }
    return aggregate;
}

RetentionApplyResult RetentionCoordinator::RecoverPendingForChannel(
    std::int64_t deleted_at_ms,
    const std::string& channel_id) {
    std::lock_guard apply_lock(apply_mu_);
    RetentionApplyResult result;
    for (const auto& candidate : snapshot_provider_().candidates) {
        if (candidate.segment.lifecycle != RecordingLifecycle::DeletionPending ||
            candidate.segment.channel_id != channel_id) {
            continue;
        }
        std::string error;
        if (!IsContainedMediaPath(options_.media_root, candidate.media_path)) {
            result.ok = false;
            result.last_error = "pending 녹화 media 경로가 storage root 밖으로 변경됨";
            return result;
        }
        if (!media_unlinker_ || !media_unlinker_(candidate.media_path, &error)) {
            result.ok = false;
            result.last_error = error.empty() ? "pending media unlink 재개 실패" : error;
            return result;
        }
        RecordingTombstoneV1 tombstone;
        tombstone.tombstone_id = NextTombstoneId(deleted_at_ms);
        tombstone.segment_id = candidate.segment.segment_id;
        tombstone.source_id = candidate.segment.source_id;
        tombstone.channel_id = candidate.segment.channel_id;
        tombstone.recorded_range = {candidate.segment.start.utc_ms,
                                    candidate.segment.end.utc_ms};
        tombstone.checksum_sha256 = candidate.segment.checksum_sha256;
        tombstone.retention_class = candidate.segment.retention_class;
        tombstone.deletion_reason = candidate.deletion_reason.empty()
                                        ? "manual-corrupt-cleanup"
                                        : candidate.deletion_reason;
        tombstone.deleted_at_ms = deleted_at_ms;
        if (!store_.CompleteDeletion(tombstone, &error)) {
            result.ok = false;
            result.last_error = error.empty() ? "pending tombstone journal 재개 실패" : error;
            return result;
        }
        ++result.deleted_count;
    }
    return result;
}

bool RetentionCoordinator::UpdateChannelPolicy(const std::string& channel_id,
                                               const RetentionPolicy& policy,
                                               std::string* error) {
    if (channel_id.empty() || policy.continuous_max_bytes == 0 ||
        policy.event_max_bytes == 0 || policy.continuous_max_age_ms < 0 ||
        policy.event_max_age_ms < 0) {
        if (error != nullptr) *error = "channel retention policy 값이 유효하지 않음";
        return false;
    }
    std::lock_guard lock(mu_);
    policies_[channel_id] = policy;
    statuses_.try_emplace(channel_id);
    if (error != nullptr) error->clear();
    return true;
}

void RetentionCoordinator::RemoveChannelPolicy(const std::string& channel_id) {
    std::lock_guard admission_lock(admission_mu_);
    std::lock_guard lock(mu_);
    policies_.erase(channel_id);
    statuses_.erase(channel_id);
    // 진행 중인 writer/event reservation은 policy lifecycle과 독립된 물리 공간 보호다.
    // verified finalize 또는 cleanup이 Complete*Write를 호출할 때까지 유지한다.
}

void RetentionCoordinator::RunPeriodic(std::int64_t now_ms) {
    std::lock_guard admission_lock(admission_mu_);
    std::unordered_set<std::string> pending_channels;
    for (const auto& candidate : snapshot_provider_().candidates) {
        if (candidate.segment.lifecycle == RecordingLifecycle::DeletionPending) {
            pending_channels.insert(candidate.segment.channel_id);
        }
    }
    for (const auto& channel_id : pending_channels) {
        const auto recovered = RecoverPendingForChannel(now_ms, channel_id);
        if (!recovered.ok) {
            std::lock_guard lock(mu_);
            const auto status = statuses_.find(channel_id);
            if (status != statuses_.end()) status->second.last_error = recovered.last_error;
        }
    }
    std::vector<std::pair<std::string, RetentionPolicy>> policies;
    {
        std::lock_guard lock(mu_);
        policies.assign(policies_.begin(), policies_.end());
    }
    for (const auto& [channel_id, policy] : policies) {
        std::uint64_t free_bytes = 0;
        std::string error;
        if (!free_space_provider_ || !free_space_provider_(&free_bytes, &error)) {
            std::lock_guard lock(mu_);
            statuses_[channel_id].last_error =
                error.empty() ? "recording root 여유 공간 조회 실패" : error;
            continue;
        }
        RetentionPlanRequest request;
        request.channel_id = channel_id;
        request.policy = policy;
        request.now_ms = now_ms;
        const std::uint64_t inflight_bytes = OutstandingReservationsLocked();
        request.free_bytes = free_bytes > inflight_bytes ? free_bytes - inflight_bytes : 0;
        request.reserved_free_bytes = options_.reserved_free_bytes;
        const auto plan = Plan(snapshot_provider_(), request);
        const auto applied = Apply(plan, now_ms);
        if (!applied.ok) {
            std::lock_guard lock(mu_);
            statuses_[channel_id].last_error = applied.last_error;
        }
    }
}

RetentionAdmissionResult RetentionCoordinator::AdmitContinuousWrite(
    const std::string& channel_id,
    std::uint64_t expected_segment_bytes,
    std::int64_t now_ms) {
    std::lock_guard admission_lock(admission_mu_);
    RetentionPolicy policy;
    {
        std::lock_guard lock(mu_);
        const auto it = policies_.find(channel_id);
        if (it == policies_.end()) return {false, false, 0, "channel retention policy가 없음"};
        policy = it->second;
    }
    if (inflight_reservations_.find(channel_id) != inflight_reservations_.end()) {
        std::lock_guard lock(mu_);
        auto& status = statuses_[channel_id];
        status.storage_blocked = true;
        status.last_error = "이전 segment 정리 실패로 예약이 유지됨";
        return {false, false, 0, status.last_error};
    }
    const auto recovered = RecoverPendingForChannel(now_ms, channel_id);
    if (!recovered.ok) {
        std::lock_guard lock(mu_);
        auto& status = statuses_[channel_id];
        status.storage_blocked = true;
        status.last_error = recovered.last_error;
        return {false, false, 0, recovered.last_error};
    }
    const auto observed = observed_segment_bytes_.find(channel_id);
    const std::uint64_t observed_bytes =
        observed == observed_segment_bytes_.end() ? 0 : observed->second;
    expected_segment_bytes = std::max(
        expected_segment_bytes,
        std::max(options_.default_expected_segment_bytes, observed_bytes));
    if (expected_segment_bytes > policy.continuous_max_bytes) {
        std::lock_guard lock(mu_);
        auto& status = statuses_[channel_id];
        status.storage_blocked = true;
        status.required_bytes = SaturatingAdd(options_.reserved_free_bytes,
                                              expected_segment_bytes);
        status.last_error = "예상 segment 용량이 continuous quota를 초과함";
        return {false, false, 0, status.last_error};
    }
    std::uint64_t free_bytes = 0;
    std::string error;
    if (!free_space_provider_ || !free_space_provider_(&free_bytes, &error)) {
        std::lock_guard lock(mu_);
        auto& status = statuses_[channel_id];
        status.storage_blocked = true;
        status.required_bytes = SaturatingAdd(options_.reserved_free_bytes,
                                              expected_segment_bytes);
        status.free_bytes = 0;
        status.last_error = error.empty() ? "recording root 여유 공간 조회 실패" : error;
        return {false, false, 0, status.last_error};
    }

    const std::uint64_t inflight_bytes = OutstandingReservationsLocked();
    const std::uint64_t effective_free =
        free_bytes > inflight_bytes ? free_bytes - inflight_bytes : 0;
    RetentionPlanRequest request;
    request.channel_id = channel_id;
    request.policy = policy;
    request.now_ms = now_ms;
    request.free_bytes = effective_free;
    request.reserved_free_bytes = options_.reserved_free_bytes;
    request.required_write_bytes = expected_segment_bytes;
    auto admission_snapshot = snapshot_provider_();
    admission_snapshot.candidates.erase(
        std::remove_if(
            admission_snapshot.candidates.begin(), admission_snapshot.candidates.end(),
            [](const RetentionCandidate& candidate) {
                return candidate.segment.retention_class !=
                       RecordingRetentionClass::Continuous;
            }),
        admission_snapshot.candidates.end());
    const auto plan = Plan(admission_snapshot, request);
    const auto applied = Apply(plan, now_ms);
    std::uint64_t refreshed_physical_free = free_bytes;
    std::string refresh_error;
    bool refreshed = true;
    if (applied.ok && applied.deleted_count > 0) {
        refreshed = free_space_provider_ &&
                    free_space_provider_(&refreshed_physical_free, &refresh_error);
    }
    const std::uint64_t refreshed_free = refreshed_physical_free > inflight_bytes
                                             ? refreshed_physical_free - inflight_bytes
                                             : 0;
    const std::uint64_t required_bytes = SaturatingAdd(
        options_.reserved_free_bytes, expected_segment_bytes);
    const bool allowed = applied.ok && refreshed && plan.continuous_quota_satisfied &&
                         refreshed_free >= required_bytes;
    if (allowed) inflight_reservations_[channel_id] = {expected_segment_bytes, 0, channel_id};
    bool was_blocked = false;
    {
        std::lock_guard lock(mu_);
        auto& status = statuses_[channel_id];
        was_blocked = status.storage_blocked;
        status.storage_blocked = !allowed;
        status.required_bytes = required_bytes;
        status.free_bytes = refreshed_free;
        status.eligible_count = plan.eligible_count;
        status.last_error = allowed ? std::string()
                                    : (!applied.last_error.empty()
                                           ? applied.last_error
                                           : (!refresh_error.empty()
                                                  ? refresh_error
                                                  : "삭제 가능한 segment로 disk reserve를 복구할 수 없음"));
    }
    return {allowed, allowed && was_blocked, allowed ? expected_segment_bytes : 0,
            allowed ? std::string("ok") : ChannelStatus(channel_id).last_error};
}

void RetentionCoordinator::UpdateContinuousWriteProgress(
    const std::string& channel_id,
    std::uint64_t written_bytes) {
    std::lock_guard admission_lock(admission_mu_);
    const auto it = inflight_reservations_.find(channel_id);
    if (it == inflight_reservations_.end()) return;
    it->second.written_bytes = std::max(
        it->second.written_bytes,
        std::min(written_bytes, it->second.reserved_bytes));
}

RetentionAdmissionResult RetentionCoordinator::AdmitEventWrite(
    const std::string& channel_id,
    const std::string& reservation_id,
    std::uint64_t expected_segment_bytes,
    std::int64_t now_ms) {
    std::lock_guard admission_lock(admission_mu_);
    if (channel_id.empty() || reservation_id.empty() || expected_segment_bytes == 0) {
        return {false, false, 0, "event write 예약 인자가 유효하지 않음"};
    }
    RetentionPolicy policy;
    {
        std::lock_guard lock(mu_);
        const auto it = policies_.find(channel_id);
        if (it == policies_.end()) return {false, false, 0, "channel retention policy가 없음"};
        policy = it->second;
    }
    if (event_inflight_reservations_.find(reservation_id) !=
        event_inflight_reservations_.end()) {
        return {false, false, 0, "같은 event write 예약이 이미 존재함"};
    }
    const auto recovered = RecoverPendingForChannel(now_ms, channel_id);
    if (!recovered.ok) return {false, false, 0, recovered.last_error};

    const auto observed = observed_event_bytes_.find(channel_id);
    if (observed != observed_event_bytes_.end()) {
        expected_segment_bytes = std::max(expected_segment_bytes, observed->second);
    }
    if (expected_segment_bytes > policy.event_max_bytes) {
        return {false, false, 0, "예상 event clip 용량이 event quota를 초과함"};
    }

    std::uint64_t free_bytes = 0;
    std::string error;
    if (!free_space_provider_ || !free_space_provider_(&free_bytes, &error)) {
        return {false, false, 0,
                error.empty() ? "recording root 여유 공간 조회 실패" : error};
    }
    const std::uint64_t inflight_bytes = OutstandingReservationsLocked();
    const std::uint64_t effective_free =
        free_bytes > inflight_bytes ? free_bytes - inflight_bytes : 0;
    RetentionPlanRequest request;
    request.channel_id = channel_id;
    request.policy = policy;
    request.now_ms = now_ms;
    request.free_bytes = effective_free;
    request.reserved_free_bytes = options_.reserved_free_bytes;
    request.required_write_bytes = expected_segment_bytes;
    request.required_write_class = RecordingRetentionClass::Event;
    auto admission_snapshot = snapshot_provider_();
    admission_snapshot.candidates.erase(
        std::remove_if(admission_snapshot.candidates.begin(),
                       admission_snapshot.candidates.end(),
                       [](const RetentionCandidate& candidate) {
                           return candidate.segment.retention_class !=
                                  RecordingRetentionClass::Event;
                       }),
        admission_snapshot.candidates.end());
    const auto plan = Plan(admission_snapshot, request);
    const auto applied = Apply(plan, now_ms);
    std::uint64_t refreshed_physical_free = free_bytes;
    std::string refresh_error;
    bool refreshed = true;
    if (applied.ok && applied.deleted_count > 0) {
        refreshed = free_space_provider_ &&
                    free_space_provider_(&refreshed_physical_free, &refresh_error);
    }
    const std::uint64_t refreshed_free =
        refreshed_physical_free > inflight_bytes
            ? refreshed_physical_free - inflight_bytes
            : 0;
    const std::uint64_t required_bytes =
        SaturatingAdd(options_.reserved_free_bytes, expected_segment_bytes);
    const bool allowed = applied.ok && refreshed && plan.event_quota_satisfied &&
                         refreshed_free >= required_bytes;
    if (!allowed) {
        return {false, false, 0,
                !applied.last_error.empty()
                    ? applied.last_error
                    : (!refresh_error.empty()
                           ? refresh_error
                           : "삭제 가능한 event segment로 quota 또는 disk reserve를 복구할 수 없음")};
    }
    event_inflight_reservations_[reservation_id] =
        {expected_segment_bytes, 0, channel_id};
    return {true, false, expected_segment_bytes, "ok"};
}

void RetentionCoordinator::UpdateEventWriteProgress(
    const std::string& reservation_id,
    std::uint64_t written_bytes) {
    std::lock_guard admission_lock(admission_mu_);
    const auto it = event_inflight_reservations_.find(reservation_id);
    if (it == event_inflight_reservations_.end()) return;
    it->second.written_bytes = std::max(
        it->second.written_bytes,
        std::min(written_bytes, it->second.reserved_bytes));
}

std::uint64_t RetentionCoordinator::OutstandingReservationsLocked() const {
    std::uint64_t outstanding = 0;
    for (const auto& [_, reservation] : inflight_reservations_) {
        const std::uint64_t written =
            std::min(reservation.written_bytes, reservation.reserved_bytes);
        outstanding = SaturatingAdd(
            outstanding, reservation.reserved_bytes - written);
    }
    for (const auto& [_, reservation] : event_inflight_reservations_) {
        const std::uint64_t written =
            std::min(reservation.written_bytes, reservation.reserved_bytes);
        outstanding = SaturatingAdd(
            outstanding, reservation.reserved_bytes - written);
    }
    return outstanding;
}

void RetentionCoordinator::CompleteContinuousWrite(
    const std::string& channel_id,
    std::uint64_t actual_segment_bytes) {
    std::lock_guard admission_lock(admission_mu_);
    inflight_reservations_.erase(channel_id);
    if (actual_segment_bytes > 0) {
        auto& observed = observed_segment_bytes_[channel_id];
        observed = std::max(observed, actual_segment_bytes);
    }
}

void RetentionCoordinator::CompleteEventWrite(
    const std::string& reservation_id,
    std::uint64_t actual_segment_bytes) {
    std::lock_guard admission_lock(admission_mu_);
    const auto it = event_inflight_reservations_.find(reservation_id);
    if (it == event_inflight_reservations_.end()) return;
    const std::string channel_id = it->second.channel_id;
    event_inflight_reservations_.erase(it);
    if (actual_segment_bytes > 0) {
        auto& observed = observed_event_bytes_[channel_id];
        observed = std::max(observed, actual_segment_bytes);
    }
}

RetentionChannelStatus RetentionCoordinator::ChannelStatus(
    const std::string& channel_id) const {
    std::lock_guard lock(mu_);
    const auto it = statuses_.find(channel_id);
    return it == statuses_.end() ? RetentionChannelStatus{} : it->second;
}

}  // namespace recording

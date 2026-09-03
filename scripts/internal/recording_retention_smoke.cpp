// 파일 용도: v4.1.0 S04 순환 보존과 용량 보호 계약을 실제 C++로 검증한다.
// 동작 요약: 등급별 oldest-first 선택, 삭제 실패 경계, reserve 차단·복구와 tombstone을 확인한다.
#include "recording/recording_catalog.h"
#include "recording/recording_journal.h"
#include "recording/retention_coordinator.h"

#include <atomic>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <limits>
#include <stdexcept>
#include <string>
#include <thread>
#include <vector>

namespace {

int passes = 0;
int failures = 0;

void Expect(bool condition, const std::string& label) {
    if (condition) {
        ++passes;
    } else {
        ++failures;
        std::cerr << "[fail] " << label << '\n';
    }
}

recording::RetentionCandidate Candidate(const std::string& id,
                                        std::int64_t end_ms,
                                        std::uint64_t size_bytes,
                                        recording::RecordingRetentionClass retention_class,
                                        bool pinned = false,
                                        std::uint64_t hold_count = 0,
                                        const std::string& channel_id = "channel-1") {
    recording::RetentionCandidate candidate;
    candidate.segment.segment_id = id;
    candidate.segment.source_id = "source-1";
    candidate.segment.channel_id = channel_id;
    candidate.segment.stream_epoch_id = "epoch-1";
    candidate.segment.start = {end_ms - 1000, end_ms - 1000, 1, 1000};
    candidate.segment.end = {end_ms, end_ms, 1, 1000};
    candidate.segment.container = "mp4";
    candidate.segment.video_codecs = {"h264"};
    candidate.segment.audio_omitted_reason = "source-no-audio";
    candidate.segment.size_bytes = size_bytes;
    candidate.segment.checksum_sha256 = std::string(64, 'a');
    candidate.segment.retention_class = retention_class;
    candidate.segment.lifecycle = recording::RecordingLifecycle::Finalized;
    candidate.segment.pinned = pinned;
    candidate.segment.created_at_ms = end_ms - 1000;
    candidate.segment.finalized_at_ms = end_ms;
    candidate.media_path = std::filesystem::path("/recordings") / (id + ".mp4");
    candidate.hold_count = hold_count;
    return candidate;
}

recording::RetentionPolicy Policy(std::uint64_t continuous_max_bytes,
                                  std::uint64_t event_max_bytes) {
    recording::RetentionPolicy policy;
    policy.continuous_max_bytes = continuous_max_bytes;
    policy.event_max_bytes = event_max_bytes;
    return policy;
}

class FakeStore final : public recording::RecordingStorePort {
public:
    bool request_ok{true};
    bool complete_ok{true};
    int request_calls{0};
    int complete_calls{0};
    recording::RecordingTombstoneV1 last_tombstone;

    bool FinalizeSegment(const recording::RecordingSegmentV1&,
                         const std::string&,
                         std::string*) override {
        return true;
    }
    bool PutEventLink(const recording::EventRecordingLinkV1&, std::string*) override {
        return true;
    }
    bool PutObservation(const recording::AnalysisObservationV1&, std::string*) override {
        return true;
    }
    bool RequestDeletion(const std::string&, const std::string&, std::string* error) override {
        ++request_calls;
        if (!request_ok && error != nullptr) *error = "journal append failure";
        return request_ok;
    }
    bool CompleteDeletion(const recording::RecordingTombstoneV1& tombstone,
                          std::string* error) override {
        ++complete_calls;
        last_tombstone = tombstone;
        if (!complete_ok && error != nullptr) *error = "tombstone append failure";
        return complete_ok;
    }
    std::vector<recording::RecordingSegmentV1> QuerySegments(
        const std::string&, std::int64_t, std::int64_t) const override {
        return {};
    }
};

void WriteMp4Header(const std::filesystem::path& path) {
    std::filesystem::create_directories(path.parent_path());
    const unsigned char bytes[] = {0, 0, 0, 12, 'f', 't', 'y', 'p', 'i', 's', 'o', 'm'};
    std::ofstream output(path, std::ios::binary | std::ios::trunc);
    output.write(reinterpret_cast<const char*>(bytes), sizeof(bytes));
}

}  // namespace

int main(int argc, char** argv) {
    if (argc != 2) return 2;
    const std::filesystem::path root(argv[1]);

    recording::RetentionSnapshot ordered_snapshot;
    ordered_snapshot.candidates = {
        Candidate("seg-b", 2000, 10, recording::RecordingRetentionClass::Continuous),
        Candidate("seg-c", 3000, 10, recording::RecordingRetentionClass::Continuous),
        Candidate("seg-a", 2000, 10, recording::RecordingRetentionClass::Continuous),
    };
    recording::RetentionPlanRequest ordered_request;
    ordered_request.channel_id = "channel-1";
    ordered_request.policy = Policy(20, 100);
    ordered_request.now_ms = 5000;
    ordered_request.free_bytes = 1000;
    const auto ordered = recording::RetentionCoordinator::Plan(ordered_snapshot, ordered_request);
    Expect(ordered.deletions.size() == 1 &&
               ordered.deletions.front().candidate.segment.segment_id == "seg-a" &&
               ordered.deletions.front().reason ==
                   recording::RetentionCleanupReason::ContinuousCapacity,
           "continuous quota는 end_utc_ms, segment_id oldest-first");

    recording::RetentionSnapshot separated_snapshot;
    separated_snapshot.candidates = {
        Candidate("cont-old", 1000, 10, recording::RecordingRetentionClass::Continuous),
        Candidate("cont-new", 2000, 10, recording::RecordingRetentionClass::Continuous),
        Candidate("event-old", 500, 10, recording::RecordingRetentionClass::Event),
        Candidate("event-new", 2500, 10, recording::RecordingRetentionClass::Event),
    };
    recording::RetentionPlanRequest separated_request;
    separated_request.channel_id = "channel-1";
    separated_request.policy = Policy(10, 10);
    separated_request.now_ms = 3000;
    separated_request.free_bytes = 1000;
    const auto separated = recording::RetentionCoordinator::Plan(
        separated_snapshot, separated_request);
    Expect(separated.deletions.size() == 2 &&
               separated.deletions[0].candidate.segment.segment_id == "cont-old" &&
               separated.deletions[1].candidate.segment.segment_id == "event-old" &&
               separated.deletions[0].reason ==
                   recording::RetentionCleanupReason::ContinuousCapacity &&
               separated.deletions[1].reason ==
                   recording::RetentionCleanupReason::EventCapacity,
           "continuous/event quota가 자기 등급 artifact만 선택");

    auto age_policy = Policy(100, 100);
    age_policy.continuous_max_age_ms = 1500;
    age_policy.event_max_age_ms = 1500;
    auto age_request = separated_request;
    age_request.policy = age_policy;
    const auto aged = recording::RetentionCoordinator::Plan(separated_snapshot, age_request);
    Expect(aged.deletions.size() == 2 &&
               aged.deletions[0].candidate.segment.segment_id == "cont-old" &&
               aged.deletions[1].candidate.segment.segment_id == "event-old" &&
               aged.deletions[0].reason == recording::RetentionCleanupReason::ContinuousAge &&
               aged.deletions[1].reason == recording::RetentionCleanupReason::EventAge,
           "continuous/event 보존 기간을 독립적으로 적용");
    auto continuous_age_only = age_request;
    continuous_age_only.policy.event_max_age_ms = 0;
    const auto continuous_aged = recording::RetentionCoordinator::Plan(
        separated_snapshot, continuous_age_only);
    Expect(continuous_aged.deletions.size() == 1 &&
               continuous_aged.deletions[0].candidate.segment.segment_id == "cont-old" &&
               continuous_aged.deletions[0].reason ==
                   recording::RetentionCleanupReason::ContinuousAge,
           "continuous 보존 기간은 event와 독립적으로 적용");
    auto event_age_only = age_request;
    event_age_only.policy.continuous_max_age_ms = 0;
    const auto event_aged = recording::RetentionCoordinator::Plan(
        separated_snapshot, event_age_only);
    Expect(event_aged.deletions.size() == 1 &&
               event_aged.deletions[0].candidate.segment.segment_id == "event-old" &&
               event_aged.deletions[0].reason ==
                   recording::RetentionCleanupReason::EventAge,
           "event 보존 기간은 continuous와 독립적으로 적용");

    recording::RetentionSnapshot expected_write_snapshot;
    expected_write_snapshot.candidates = {
        Candidate("expected-old", 1000, 40,
                  recording::RecordingRetentionClass::Continuous),
        Candidate("expected-new", 2000, 50,
                  recording::RecordingRetentionClass::Continuous),
    };
    recording::RetentionPlanRequest expected_write_request;
    expected_write_request.channel_id = "channel-1";
    expected_write_request.policy = Policy(100, 100);
    expected_write_request.now_ms = 3000;
    expected_write_request.free_bytes = 1000;
    expected_write_request.required_write_bytes = 20;
    const auto expected_write_plan = recording::RetentionCoordinator::Plan(
        expected_write_snapshot, expected_write_request);
    Expect(expected_write_plan.quota_satisfied &&
               expected_write_plan.deletions.size() == 1 &&
               expected_write_plan.deletions[0].candidate.segment.segment_id ==
                   "expected-old" &&
               expected_write_plan.deletions[0].reason ==
                   recording::RetentionCleanupReason::ContinuousCapacity,
           "새 segment 예상 용량까지 continuous quota에 선반영");

    recording::RetentionSnapshot protected_snapshot;
    protected_snapshot.candidates = {
        Candidate("cont-held", 1000, 10, recording::RecordingRetentionClass::Continuous,
                  false, 1),
        Candidate("event-pinned", 1000, 10, recording::RecordingRetentionClass::Event,
                  true, 0),
    };
    recording::RetentionPlanRequest protected_request;
    protected_request.channel_id = "channel-1";
    protected_request.policy = Policy(1, 1);
    protected_request.now_ms = 3000;
    protected_request.free_bytes = 1000;
    const auto protected_plan = recording::RetentionCoordinator::Plan(
        protected_snapshot, protected_request);
    Expect(protected_plan.deletions.empty() && !protected_plan.quota_satisfied &&
               !protected_plan.continuous_quota_satisfied &&
               !protected_plan.event_quota_satisfied,
           "pinned event와 hold_count>0 continuous 자동 삭제 제외");

    recording::RetentionPlanRequest reserve_request;
    reserve_request.channel_id = "channel-1";
    reserve_request.policy = Policy(100, 100);
    reserve_request.now_ms = 3000;
    reserve_request.free_bytes = 0;
    reserve_request.reserved_free_bytes = 15;
    reserve_request.required_write_bytes = 5;
    const auto reserve_plan = recording::RetentionCoordinator::Plan(
        separated_snapshot, reserve_request);
    Expect(reserve_plan.deletions.size() == 2 &&
               reserve_plan.deletions[0].candidate.segment.segment_id == "cont-old" &&
               reserve_plan.deletions[1].candidate.segment.segment_id == "cont-new" &&
               reserve_plan.deletions[0].reason ==
                   recording::RetentionCleanupReason::ReservedFreeSpace &&
               reserve_plan.deletions[1].reason ==
                   recording::RetentionCleanupReason::ReservedFreeSpace,
           "disk reserve 부족은 eligible continuous부터 정리");

    FakeStore journal_failure_store;
    journal_failure_store.request_ok = false;
    int journal_failure_unlinks = 0;
    recording::RetentionCoordinator journal_failure_coordinator(
        journal_failure_store,
        [] { return recording::RetentionSnapshot{}; },
        [](std::uint64_t* bytes, std::string*) { *bytes = 1000; return true; },
        [&](const std::filesystem::path&, std::string*) {
            ++journal_failure_unlinks;
            return true;
        },
        {});
    const auto journal_failure_result = journal_failure_coordinator.Apply(ordered, 6000);
    Expect(!journal_failure_result.ok && journal_failure_unlinks == 0 &&
               journal_failure_store.complete_calls == 0,
           "journal 실패 시 media unlink와 tombstone 중단");

    FakeStore unlink_failure_store;
    int unlink_failure_calls = 0;
    recording::RetentionCoordinator unlink_failure_coordinator(
        unlink_failure_store,
        [] { return recording::RetentionSnapshot{}; },
        [](std::uint64_t* bytes, std::string*) { *bytes = 1000; return true; },
        [&](const std::filesystem::path&, std::string* error) {
            ++unlink_failure_calls;
            if (error != nullptr) *error = "unlink failure";
            return false;
        },
        {0, 64ULL * 1024ULL * 1024ULL, "/recordings"});
    const auto unlink_failure_result = unlink_failure_coordinator.Apply(ordered, 6000);
    Expect(!unlink_failure_result.ok && unlink_failure_store.request_calls == 1 &&
               unlink_failure_calls == 1 && unlink_failure_store.complete_calls == 0 &&
               unlink_failure_result.reclaimed_bytes == 0,
           "unlink 실패는 deletion_pending 유지, 회수 byte 0");

    FakeStore tombstone_failure_store;
    tombstone_failure_store.complete_ok = false;
    int tombstone_failure_unlinks = 0;
    recording::RetentionCoordinator tombstone_failure_coordinator(
        tombstone_failure_store,
        [] { return recording::RetentionSnapshot{}; },
        [](std::uint64_t* bytes, std::string*) { *bytes = 1000; return true; },
        [&](const std::filesystem::path&, std::string*) {
            ++tombstone_failure_unlinks;
            return true;
        },
        {0, 64ULL * 1024ULL * 1024ULL, "/recordings"});
    const auto tombstone_failure_result = tombstone_failure_coordinator.Apply(ordered, 6000);
    Expect(!tombstone_failure_result.ok && tombstone_failure_store.request_calls == 1 &&
               tombstone_failure_unlinks == 1 &&
               tombstone_failure_store.complete_calls == 1 &&
               tombstone_failure_result.reclaimed_bytes == 0,
           "tombstone journal 실패는 pending으로 남겨 다음 tick 복구");

    FakeStore blocked_store;
    std::uint64_t available_bytes = 0;
    recording::RetentionCoordinator::Options blocked_options;
    blocked_options.reserved_free_bytes = 100;
    blocked_options.default_expected_segment_bytes = 10;
    recording::RetentionCoordinator blocked_coordinator(
        blocked_store,
        [&] { return protected_snapshot; },
        [&](std::uint64_t* bytes, std::string*) { *bytes = available_bytes; return true; },
        [](const std::filesystem::path&, std::string*) { return true; },
        blocked_options);
    std::string error;
    Expect(blocked_coordinator.UpdateChannelPolicy("channel-1", Policy(100, 100), &error),
           "channel retention policy 등록: " + error);
    const auto blocked = blocked_coordinator.AdmitContinuousWrite("channel-1", 10, 7000);
    const auto blocked_status = blocked_coordinator.ChannelStatus("channel-1");
    Expect(!blocked.allowed && blocked_status.storage_blocked &&
               blocked_status.required_bytes == 110 && blocked_status.free_bytes == 0 &&
               blocked_status.eligible_count == 0,
           "삭제 불가 시 해당 channel writer만 storage-blocked");
    available_bytes = 200;
    const auto recovered = blocked_coordinator.AdmitContinuousWrite("channel-1", 10, 8000);
    Expect(recovered.allowed && recovered.start_new_epoch &&
               !blocked_coordinator.ChannelStatus("channel-1").storage_blocked,
           "공간 회복 뒤 새 keyframe용 epoch 재발급 신호");
    blocked_coordinator.CompleteContinuousWrite("channel-1", 10);

    FakeStore concurrent_store;
    std::uint64_t concurrent_free_bytes = 150;
    recording::RetentionCoordinator::Options concurrent_options;
    concurrent_options.reserved_free_bytes = 100;
    concurrent_options.default_expected_segment_bytes = 40;
    recording::RetentionCoordinator concurrent_coordinator(
        concurrent_store,
        [] { return recording::RetentionSnapshot{}; },
        [&](std::uint64_t* bytes, std::string*) {
            *bytes = concurrent_free_bytes;
            return true;
        },
        [](const std::filesystem::path&, std::string*) { return true; },
        concurrent_options);
    Expect(concurrent_coordinator.UpdateChannelPolicy(
               "channel-1", Policy(100, 100), &error) &&
               concurrent_coordinator.UpdateChannelPolicy(
                   "channel-2", Policy(100, 100), &error),
           "다중 channel reserve policy 등록");
    const auto first_reserved = concurrent_coordinator.AdmitContinuousWrite(
        "channel-1", 40, 8100);
    const auto second_blocked = concurrent_coordinator.AdmitContinuousWrite(
        "channel-2", 40, 8200);
    Expect(first_reserved.allowed && !second_blocked.allowed,
           "동시 channel admission이 물리 여유 공간을 중복 예약하지 않음");
    concurrent_coordinator.CompleteContinuousWrite("channel-1", 40);
    const auto second_recovered = concurrent_coordinator.AdmitContinuousWrite(
        "channel-2", 40, 8300);
    Expect(second_recovered.allowed,
           "segment finalize 후 in-flight reserve 반환으로 다른 channel 재개");
    concurrent_coordinator.CompleteContinuousWrite("channel-2", 40);

    Expect(concurrent_coordinator.UpdateChannelPolicy(
               "channel-3", Policy(30, 100), &error),
           "segment hard bound policy 등록");
    const auto oversized_packet = concurrent_coordinator.AdmitContinuousWrite(
        "channel-3", 41, 8350);
    Expect(!oversized_packet.allowed && oversized_packet.reserved_bytes == 0 &&
               concurrent_coordinator.ChannelStatus("channel-3").storage_blocked,
           "최소 packet보다 작은 continuous quota는 쓰기 전에 차단");

    FakeStore progress_store;
    std::uint64_t progress_free_bytes = 190;
    recording::RetentionCoordinator::Options progress_options;
    progress_options.reserved_free_bytes = 100;
    progress_options.default_expected_segment_bytes = 40;
    recording::RetentionCoordinator progress_coordinator(
        progress_store,
        [] { return recording::RetentionSnapshot{}; },
        [&](std::uint64_t* bytes, std::string*) {
            *bytes = progress_free_bytes;
            return true;
        },
        [](const std::filesystem::path&, std::string*) { return true; },
        progress_options);
    Expect(progress_coordinator.UpdateChannelPolicy(
               "channel-progress-a", Policy(100, 100), &error) &&
               progress_coordinator.UpdateChannelPolicy(
                   "channel-progress-b", Policy(100, 100), &error),
           "진행량 정산 policy 등록");
    const auto progress_a = progress_coordinator.AdmitContinuousWrite(
        "channel-progress-a", 40, 8360);
    progress_coordinator.UpdateContinuousWriteProgress("channel-progress-a", 40);
    progress_free_bytes = 150;
    const auto progress_b = progress_coordinator.AdmitContinuousWrite(
        "channel-progress-b", 40, 8370);
    Expect(progress_a.allowed && progress_a.reserved_bytes == 40 && progress_b.allowed,
           "물리 free에 반영된 partial 쓰기량은 예약에서 이중 차감하지 않음");
    progress_coordinator.CompleteContinuousWrite("channel-progress-a", 40);
    progress_coordinator.CompleteContinuousWrite("channel-progress-b", 40);

    FakeStore threaded_store;
    recording::RetentionCoordinator threaded_coordinator(
        threaded_store,
        [] { return recording::RetentionSnapshot{}; },
        [](std::uint64_t* bytes, std::string*) { *bytes = 150; return true; },
        [](const std::filesystem::path&, std::string*) { return true; },
        concurrent_options);
    Expect(threaded_coordinator.UpdateChannelPolicy(
               "channel-thread-a", Policy(100, 100), &error) &&
               threaded_coordinator.UpdateChannelPolicy(
                   "channel-thread-b", Policy(100, 100), &error),
           "실제 동시 admission policy 등록");
    std::atomic<int> ready{0};
    std::atomic<bool> start{false};
    recording::RetentionAdmissionResult threaded_a;
    recording::RetentionAdmissionResult threaded_b;
    const auto run_admission = [&](const std::string& channel,
                                   recording::RetentionAdmissionResult* result) {
        ++ready;
        while (!start.load()) std::this_thread::yield();
        *result = threaded_coordinator.AdmitContinuousWrite(channel, 40, 8380);
    };
    std::thread admission_a(run_admission, "channel-thread-a", &threaded_a);
    std::thread admission_b(run_admission, "channel-thread-b", &threaded_b);
    while (ready.load() != 2) std::this_thread::yield();
    start.store(true);
    admission_a.join();
    admission_b.join();
    Expect(threaded_a.allowed != threaded_b.allowed,
           "두 실제 thread의 동시 admission 중 하나만 reserve 획득");
    if (threaded_a.allowed) {
        threaded_coordinator.CompleteContinuousWrite("channel-thread-a", 40);
    }
    if (threaded_b.allowed) {
        threaded_coordinator.CompleteContinuousWrite("channel-thread-b", 40);
    }

    FakeStore unresolved_store;
    recording::RetentionCoordinator unresolved_coordinator(
        unresolved_store,
        [] { return recording::RetentionSnapshot{}; },
        [](std::uint64_t* bytes, std::string*) { *bytes = 1000; return true; },
        [](const std::filesystem::path&, std::string*) { return true; },
        concurrent_options);
    Expect(unresolved_coordinator.UpdateChannelPolicy(
               "channel-unresolved", Policy(100, 100), &error),
           "cleanup 미해결 reservation policy 등록");
    const auto unresolved_first = unresolved_coordinator.AdmitContinuousWrite(
        "channel-unresolved", 40, 8390);
    unresolved_coordinator.RemoveChannelPolicy("channel-unresolved");
    Expect(unresolved_coordinator.UpdateChannelPolicy(
               "channel-unresolved", Policy(100, 100), &error),
           "cleanup 미해결 channel 재활성화 policy 등록");
    const auto unresolved_restart = unresolved_coordinator.AdmitContinuousWrite(
        "channel-unresolved", 40, 8400);
    Expect(unresolved_first.allowed && !unresolved_restart.allowed &&
               unresolved_coordinator.ChannelStatus("channel-unresolved").storage_blocked,
           "정책 비활성·재활성 뒤에도 미해결 파일 reservation을 유지해 fail-closed");
    unresolved_coordinator.CompleteContinuousWrite("channel-unresolved", 40);

    FakeStore stale_space_store;
    recording::RetentionCoordinator::Options stale_space_options;
    stale_space_options.reserved_free_bytes = 5;
    stale_space_options.default_expected_segment_bytes = 5;
    recording::RetentionCoordinator stale_space_coordinator(
        stale_space_store,
        [&] { return ordered_snapshot; },
        [](std::uint64_t* bytes, std::string*) { *bytes = 0; return true; },
        [](const std::filesystem::path&, std::string*) { return true; },
        stale_space_options);
    Expect(stale_space_coordinator.UpdateChannelPolicy(
               "channel-1", Policy(100, 100), &error),
           "stale free-space policy 등록");
    const auto stale_space = stale_space_coordinator.AdmitContinuousWrite(
        "channel-1", 5, 8500);
    Expect(!stale_space.allowed &&
               stale_space_coordinator.ChannelStatus("channel-1").storage_blocked,
           "unlink 뒤에도 filesystem 여유 공간이 부족하면 회수량을 추정해 허용하지 않음");

    const auto catalog_root = root / "catalog-integration";
    const auto media_root = catalog_root / "media";
    const auto media_path = media_root / "channel-1" / "seg-delete.mp4";
    WriteMp4Header(media_path);
    recording::RecordingJournal journal(catalog_root / "recording.jsonl");
    Expect(journal.Open(&error), "통합 journal open: " + error);
    recording::RecordingCatalog catalog(
        journal, {catalog_root / "recording.sqlite3", media_root, true});
    Expect(catalog.Open(&error), "통합 catalog open: " + error);
    auto stored = Candidate("seg-delete", 2000, 12,
                            recording::RecordingRetentionClass::Continuous).segment;
    Expect(catalog.FinalizeSegment(stored, media_path.string(), &error),
           "통합 segment finalize: " + error);
    const auto catalog_snapshot = catalog.RetentionSnapshot();
    recording::RetentionPlanRequest catalog_request;
    catalog_request.channel_id = "channel-1";
    catalog_request.policy = Policy(1, 100);
    catalog_request.now_ms = 9000;
    catalog_request.free_bytes = 1000;
    const auto catalog_plan = recording::RetentionCoordinator::Plan(
        catalog_snapshot, catalog_request);
    recording::RetentionCoordinator::Options catalog_options;
    catalog_options.media_root = media_root;
    recording::RetentionCoordinator catalog_coordinator(
        catalog,
        [&] { return catalog.RetentionSnapshot(); },
        [](std::uint64_t* bytes, std::string*) { *bytes = 1000; return true; },
        [](const std::filesystem::path& path, std::string* unlink_error) {
            std::error_code fs_error;
            const bool removed = std::filesystem::remove(path, fs_error);
            if (fs_error && unlink_error != nullptr) {
                *unlink_error = fs_error.message();
            }
            return !fs_error && (removed || !std::filesystem::exists(path));
        },
        catalog_options);
    const auto catalog_apply = catalog_coordinator.Apply(catalog_plan, 10000);
    const auto catalog_replay = journal.Replay();
    bool tombstone_recorded = false;
    for (const auto& mutation : catalog_replay.mutations) {
        if (mutation.mutation_type == recording::RecordingMutationType::DeletionCompleted &&
            mutation.entity_id == "seg-delete") {
            tombstone_recorded = true;
        }
    }
    Expect(catalog_apply.ok && catalog_apply.reclaimed_bytes == 12 &&
               !std::filesystem::exists(media_path) &&
               catalog.QuerySegments("channel-1", 0, 3000).empty() &&
               catalog.RetentionSnapshot().candidates.empty() && tombstone_recorded,
           "tombstone은 남고 media path와 원본 bytes는 제거");

    const auto overflow_media_path = media_root / "channel-1" / "seg-overflow.mp4";
    WriteMp4Header(overflow_media_path);
    auto overflow = Candidate("seg-overflow", 15000, 12,
                              recording::RecordingRetentionClass::Continuous).segment;
    Expect(catalog.FinalizeSegment(overflow, overflow_media_path.string(), &error),
           "hold overflow segment finalize: " + error);
    Expect(catalog.AdjustHoldCount(
               "seg-overflow", std::numeric_limits<std::int64_t>::max(), &error),
           "hold_count int64 최댓값 저장: " + error);
    Expect(!catalog.AdjustHoldCount("seg-overflow", 1, &error),
           "hold_count int64 오버플로 거부");

    const auto held_media_path = media_root / "channel-1" / "seg-held.mp4";
    WriteMp4Header(held_media_path);
    auto held = Candidate("seg-held", 4000, 12,
                          recording::RecordingRetentionClass::Continuous).segment;
    Expect(catalog.FinalizeSegment(held, held_media_path.string(), &error),
           "hold race segment finalize: " + error);
    const auto stale_snapshot = catalog.RetentionSnapshot();
    Expect(catalog.AdjustHoldCount("seg-held", 1, &error), "hold_count 획득: " + error);
    recording::RetentionPlanRequest stale_request;
    stale_request.channel_id = "channel-1";
    stale_request.policy = Policy(1, 100);
    stale_request.now_ms = 11000;
    stale_request.free_bytes = 1000;
    const auto stale_plan = recording::RetentionCoordinator::Plan(stale_snapshot, stale_request);
    const auto stale_apply = catalog_coordinator.Apply(stale_plan, 12000);
    Expect(!stale_apply.ok && std::filesystem::exists(held_media_path) &&
               catalog.QuerySegments("channel-1", 3000, 5000).size() == 1,
           "계획 뒤 획득된 hold도 삭제 transition에서 재검증");

    const auto pending_media_path = media_root / "channel-1" / "seg-pending.mp4";
    WriteMp4Header(pending_media_path);
    auto pending = Candidate("seg-pending", 6000, 12,
                             recording::RecordingRetentionClass::Continuous).segment;
    Expect(catalog.FinalizeSegment(pending, pending_media_path.string(), &error),
           "pending recovery segment finalize: " + error);
    Expect(catalog.RequestDeletion("seg-pending", "continuous-capacity", &error),
           "pending recovery 삭제 요청: " + error);
    std::error_code remove_error;
    std::filesystem::remove(pending_media_path, remove_error);
    Expect(!remove_error, "pending recovery media 사전 제거");
    const auto recovered_pending = catalog_coordinator.RecoverPending(13000);
    bool pending_tombstone_recorded = false;
    for (const auto& mutation : journal.Replay().mutations) {
        if (mutation.mutation_type == recording::RecordingMutationType::DeletionCompleted &&
            mutation.entity_id == "seg-pending") {
            pending_tombstone_recorded = true;
        }
    }
    Expect(recovered_pending.ok && recovered_pending.reclaimed_bytes == 0 &&
               pending_tombstone_recorded &&
               catalog.QuerySegments("channel-1", 5000, 7000).empty(),
           "unlink 뒤 tombstone 실패 상태를 다음 tick에서 idempotent 재완료");

    FakeStore isolated_store;
    recording::RetentionSnapshot isolated_snapshot;
    auto isolated_pending = Candidate(
        "seg-pending-a", 7000, 12,
        recording::RecordingRetentionClass::Continuous, false, 0, "channel-a");
    isolated_pending.segment.lifecycle = recording::RecordingLifecycle::DeletionPending;
    isolated_pending.media_path = "/recordings/channel-a/seg-pending-a.mp4";
    isolated_snapshot.candidates.push_back(isolated_pending);
    recording::RetentionCoordinator::Options isolated_options;
    isolated_options.media_root = "/recordings";
    isolated_options.default_expected_segment_bytes = 10;
    recording::RetentionCoordinator isolated_coordinator(
        isolated_store,
        [&] { return isolated_snapshot; },
        [](std::uint64_t* bytes, std::string*) { *bytes = 1000; return true; },
        [](const std::filesystem::path&, std::string* unlink_error) {
            if (unlink_error != nullptr) *unlink_error = "channel-a unlink failure";
            return false;
        },
        isolated_options);
    Expect(isolated_coordinator.UpdateChannelPolicy(
               "channel-a", Policy(100, 100), &error) &&
               isolated_coordinator.UpdateChannelPolicy(
                   "channel-b", Policy(100, 100), &error),
           "pending 복구 격리 policy 등록");
    const auto isolated_b = isolated_coordinator.AdmitContinuousWrite(
        "channel-b", 10, 13500);
    isolated_coordinator.CompleteContinuousWrite("channel-b", 10);
    isolated_coordinator.RunPeriodic(13600);
    Expect(isolated_b.allowed &&
               isolated_coordinator.ChannelStatus("channel-a").last_error ==
                   "channel-a unlink failure" &&
               isolated_coordinator.ChannelStatus("channel-b").last_error.empty(),
           "한 channel의 pending 복구 실패가 다른 channel admission/tick을 차단하지 않음");

    FakeStore disabled_pending_store;
    bool disabled_pending_exists = true;
    recording::RetentionCoordinator disabled_pending_coordinator(
        disabled_pending_store,
        [&] {
            recording::RetentionSnapshot snapshot;
            if (disabled_pending_exists) snapshot.candidates.push_back(isolated_pending);
            return snapshot;
        },
        [](std::uint64_t* bytes, std::string*) { *bytes = 1000; return true; },
        [&](const std::filesystem::path&, std::string*) {
            disabled_pending_exists = false;
            return true;
        },
        isolated_options);
    disabled_pending_coordinator.RunPeriodic(13650);
    Expect(!disabled_pending_exists && disabled_pending_store.complete_calls == 1,
           "정책이 없거나 비활성인 channel의 pending도 주기적으로 tombstone 완료");

    FakeStore event_pressure_store;
    recording::RetentionSnapshot event_pressure_snapshot;
    event_pressure_snapshot.candidates.push_back(Candidate(
        "event-over-quota", 7000, 10, recording::RecordingRetentionClass::Event));
    event_pressure_snapshot.candidates.push_back(Candidate(
        "continuous-reserve-source", 6000, 100,
        recording::RecordingRetentionClass::Continuous));
    int event_pressure_unlinks = 0;
    int continuous_pressure_unlinks = 0;
    std::uint64_t event_pressure_free = 0;
    recording::RetentionCoordinator event_pressure_coordinator(
        event_pressure_store,
        [&] { return event_pressure_snapshot; },
        [&](std::uint64_t* bytes, std::string*) {
            *bytes = event_pressure_free;
            return true;
        },
        [&](const std::filesystem::path& media_path, std::string* unlink_error) {
            if (media_path.filename() == "event-over-quota.mp4") {
                ++event_pressure_unlinks;
                if (unlink_error != nullptr) *unlink_error = "event unlink failure";
                return false;
            }
            ++continuous_pressure_unlinks;
            event_pressure_free = 100;
            return true;
        },
        isolated_options);
    Expect(event_pressure_coordinator.UpdateChannelPolicy(
               "channel-1", Policy(1000, 1), &error),
           "event 압력 독립 policy 등록");
    const auto event_pressure_admission =
        event_pressure_coordinator.AdmitContinuousWrite("channel-1", 10, 13700);
    Expect(event_pressure_admission.allowed && event_pressure_unlinks == 0 &&
               continuous_pressure_unlinks == 1,
           "event 예상 회수량을 제외하고 continuous만으로 reserve와 admission 처리");
    event_pressure_coordinator.CompleteContinuousWrite("channel-1", 10);

    const auto malicious_root = root / "malicious-replay";
    const auto malicious_media_root = malicious_root / "media";
    const auto protected_path =
        std::filesystem::absolute(malicious_media_root / "../../outside-protected.mp4")
            .lexically_normal();
    WriteMp4Header(protected_path);
    recording::RecordingJournal malicious_journal(malicious_root / "recording.jsonl");
    Expect(malicious_journal.Open(&error), "malicious journal open: " + error);
    auto malicious_segment = Candidate(
        "seg-malicious", 8000, 12,
        recording::RecordingRetentionClass::Continuous).segment;
    recording::RecordingMutationV1 malicious_mutation;
    malicious_mutation.mutation_id = "mut-malicious-1";
    malicious_mutation.mutation_type = recording::RecordingMutationType::SegmentFinalized;
    malicious_mutation.occurred_at_ms = 8000;
    malicious_mutation.entity_id = malicious_segment.segment_id;
    malicious_mutation.payload_json =
        "{\"segment\":" + recording::SerializeRecordingSegmentV1(malicious_segment) +
        ",\"mediaRelpath\":\"../../outside-protected.mp4\"}";
    Expect(malicious_journal.Append(malicious_mutation, &error),
           "malicious mutation append: " + error);
    recording::RecordingCatalog malicious_catalog(
        malicious_journal,
        {malicious_root / "recording.sqlite3", malicious_media_root, false});
    Expect(malicious_catalog.Open(&error), "malicious catalog open: " + error);
    Expect(malicious_catalog.RetentionSnapshot().candidates.empty() &&
               malicious_catalog.recovery_report().projection_error_count == 1 &&
               std::filesystem::exists(protected_path),
           "journal mediaRelpath가 root 밖이면 retention 후보에서 격리");

    const auto swap_root = root / "unlink-containment";
    const auto swap_media_root = swap_root / "media";
    const auto swap_safe_dir = swap_media_root / "swap";
    const auto swap_outside_dir = swap_root / "outside";
    const auto swap_candidate_path = swap_safe_dir / "seg-swap.mp4";
    const auto swap_protected_path = swap_outside_dir / "seg-swap.mp4";
    WriteMp4Header(swap_candidate_path);
    WriteMp4Header(swap_protected_path);
    recording::RetentionSnapshot swap_snapshot;
    auto swap_candidate = Candidate(
        "seg-swap", 1000, 12, recording::RecordingRetentionClass::Continuous);
    swap_candidate.media_path = swap_candidate_path;
    swap_snapshot.candidates.push_back(swap_candidate);
    recording::RetentionPlanRequest swap_request;
    swap_request.channel_id = "channel-1";
    swap_request.policy = Policy(1, 100);
    swap_request.now_ms = 9000;
    swap_request.free_bytes = 1000;
    const auto swap_plan = recording::RetentionCoordinator::Plan(
        swap_snapshot, swap_request);
    std::error_code swap_error;
    std::filesystem::rename(swap_safe_dir, swap_media_root / "safe-old", swap_error);
    Expect(!swap_error, "unlink 직전 symlink 전환 준비");
    std::filesystem::create_directory_symlink(swap_outside_dir, swap_safe_dir, swap_error);
    Expect(!swap_error, "unlink 직전 root 밖 symlink 생성");
    FakeStore swap_store;
    int swap_unlinks = 0;
    recording::RetentionCoordinator::Options swap_options;
    swap_options.media_root = swap_media_root;
    recording::RetentionCoordinator swap_coordinator(
        swap_store,
        [] { return recording::RetentionSnapshot{}; },
        [](std::uint64_t* bytes, std::string*) { *bytes = 1000; return true; },
        [&](const std::filesystem::path&, std::string*) {
            ++swap_unlinks;
            return true;
        },
        swap_options);
    const auto swap_apply = swap_coordinator.Apply(swap_plan, 14000);
    Expect(!swap_apply.ok && swap_store.request_calls == 1 && swap_unlinks == 0 &&
               std::filesystem::exists(swap_protected_path),
           "journal 이후 unlink 직전 canonical root containment 재검증");

    const auto bound_root = root / "dirfd-unlink";
    const auto bound_media_root = bound_root / "media";
    const auto bound_dir = bound_media_root / "bound";
    const auto moved_bound_dir = bound_media_root / "bound-before-swap";
    const auto bound_outside = bound_root / "outside";
    const auto bound_candidate = bound_dir / "seg-bound.mp4";
    const auto bound_protected = bound_outside / "seg-bound.mp4";
    WriteMp4Header(bound_candidate);
    WriteMp4Header(bound_protected);
    std::string bound_error;
    const bool bound_removed = recording::RemoveContainedMediaFile(
        bound_media_root, bound_candidate, &bound_error, [&] {
            std::error_code race_error;
            std::filesystem::rename(bound_dir, moved_bound_dir, race_error);
            if (race_error) throw std::runtime_error("bound dir rename failure");
            std::filesystem::create_directory_symlink(bound_outside, bound_dir, race_error);
            if (race_error) throw std::runtime_error("bound dir symlink failure");
        });
    Expect(bound_removed && !std::filesystem::exists(moved_bound_dir / "seg-bound.mp4") &&
               std::filesystem::exists(bound_protected),
           "dirfd에 결박된 unlink는 검증 뒤 상위 경로 교체에도 외부 파일을 보호");
    Expect(!recording::RemoveContainedMediaFile({}, bound_protected, &bound_error),
           "storage root가 비어 있으면 안전 unlink를 fail-closed");

    std::cout << "[verify-v410-recording-retention] pass=" << passes
              << " fail=" << failures << '\n';
    return failures == 0 ? 0 : 1;
}

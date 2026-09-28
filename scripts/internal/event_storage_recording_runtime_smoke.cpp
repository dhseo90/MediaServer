// 파일 용도: 실제 EventStorage 큐와 녹화 catalog/journal의 비활성·포화·프로세스 재시작을 검증한다.
// 설정·시각·가용량을 고정하고 worker를 latch로 제어하며 나머지는 제품 구현을 사용한다.
#include "analysis/event_storage.h"
#include "core/analysis_runtime_port.h"
#include "recording/event_recording_bridge.h"
#include "recording/recording_journal.h"

#include <chrono>
#include <condition_variable>
#include <filesystem>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <mutex>
#include <stdexcept>
#include <thread>
#include <vector>

namespace {
core::AnalysisRuntimeConfig config;
std::string scenario;
int passed = 0;

void Require(bool ok, const std::string& message) {
    if (!ok) throw std::runtime_error(message);
}

void Expect(bool ok, const std::string& message) {
    Require(ok, message);
    ++passed;
    std::cout << "[s05-runtime-assert] {\"case\":" << std::quoted(scenario)
              << ",\"message\":" << std::quoted(message) << "}\n";
}

// worker만 제어 가능한 시점에 정지한다. producer의 실제 내구 접수는 그대로 통과시킨다.
class WorkerLatch final : public analysis::EventRecordingBridge {
public:
    explicit WorkerLatch(std::shared_ptr<analysis::EventRecordingBridge> target)
        : target_(std::move(target)), producer_(std::this_thread::get_id()) {}

    analysis::EventRecordingBridgeResult TryResolve(
        const analysis::AnalysisResult& result, const analysis::EventRecord& record,
        const analysis::EventMediaHookOptions& options) override {
        if (std::this_thread::get_id() != producer_) {
            std::unique_lock lock(mu_);
            entered_ = true;
            cv_.notify_all();
            cv_.wait(lock, [this] { return released_; });
        }
        return target_->TryResolve(result, record, options);
    }

    void RecordFallback(const analysis::EventRecord& record,
                        const analysis::EventRecordingBridgeResult& previous) override {
        target_->RecordFallback(record, previous);
    }

    bool WaitForWorker() {
        std::unique_lock lock(mu_);
        return cv_.wait_for(lock, std::chrono::seconds(3), [this] { return entered_; });
    }

    void Release() {
        std::lock_guard lock(mu_);
        released_ = true;
        cv_.notify_all();
    }

private:
    std::shared_ptr<analysis::EventRecordingBridge> target_;
    std::thread::id producer_;
    std::mutex mu_;
    std::condition_variable cv_;
    bool entered_{false};
    bool released_{false};
};

// assertion 실패 때도 worker가 파괴된 catalog를 참조하거나 join에서 멈추지 않게 한다.
struct DispatcherScope {
    std::shared_ptr<WorkerLatch> latch;
    ~DispatcherScope() {
        if (latch) latch->Release();
        analysis::StopEventStorage();
        analysis::SetEventRecordingBridge(nullptr);
    }
};

analysis::AnalysisResult Result() {
    analysis::AnalysisResult result;
    result.source_key = "cam-runtime";
    result.context.event_time_basis = "media-pts-ms";
    result.context.event_stream_epoch_id = "epoch-runtime";
    return result;
}

analysis::AnalysisEvent Event(int index) {
    analysis::AnalysisEvent event;
    event.event_id = "runtime-event-" + std::to_string(index);
    event.event_type = "line-crossing";
    event.status = "ended";
    event.start_time_ms = 300 + index * 20;
    event.update_time_ms = 900 + index * 20;
    event.end_time_ms = event.update_time_ms;
    return event;
}

bool AllPending(recording::RecordingCatalog& catalog) {
    for (int i = 0; i < 5; ++i) {
        const auto link = catalog.FindEventLinkByEventId(Event(i).event_id);
        if (!link || link->status != recording::EventRecordingLinkStatus::Pending ||
            link->channel_id != "cam-runtime" || link->stream_epoch_id != "epoch-runtime" ||
            link->time_basis != "media-pts-ms" || link->requested_range ||
            !link->media_pts_range_ms || link->media_pts_range_ms->start_ms != 200 + i * 20 ||
            link->media_pts_range_ms->end_ms != 1000 + i * 20) return false;
    }
    return true;
}

std::shared_ptr<recording::CatalogEventRecordingBridge> MakeBridge(
    recording::RecordingCatalog& catalog, recording::RetentionCoordinator& retention,
    recording::EventClipDeriver& deriver, const std::filesystem::path& root) {
    recording::CatalogEventRecordingBridge::Options options;
    options.output_root = root;
    options.now_ms = [] { return 14000; };
    options.max_pending_jobs = 2;
    options.mapping_retry_ms = 1;
    return std::make_shared<recording::CatalogEventRecordingBridge>(catalog, retention, deriver, options);
}

void VerifyAdmission(recording::RecordingCatalog& catalog,
                     recording::RetentionCoordinator& retention,
                     const std::filesystem::path& root, bool jsonl_enabled) {
    recording::GStreamerEventClipDeriver deriver;
    const auto bridge = MakeBridge(catalog, retention, deriver, root);
    const auto latch = std::make_shared<WorkerLatch>(bridge);
    DispatcherScope scope{latch};
    analysis::SetEventRecordingBridge(latch);
    analysis::DispatchEventRecords(Result(), {Event(0)});
    Expect(latch->WaitForWorker(), "실제 EventStorage worker 진입을 관찰한다");
    Expect(catalog.FindEventLinkByEventId(Event(0).event_id).has_value(),
           "worker 처리 전에 첫 이벤트 연결이 내구 접수된다");
    for (int i = 1; i < 5; ++i) analysis::DispatchEventRecords(Result(), {Event(i)});
    const auto queued = analysis::GetEventStorageSnapshot();
    Expect(queued.enqueued_count == 5 && queued.queue_size == 2 && queued.dropped_count == 2,
           "실제 저장 큐 크기 2에서 다섯 접수 중 두 이벤트가 퇴출된다");
    Expect(AllPending(catalog), "퇴출 이벤트를 포함한 다섯 PTS 연결이 worker 해제 전에 보존된다");
    latch->Release();
    analysis::StopEventStorage();
    bridge->StopAndDrain();
    Expect(AllPending(catalog), "저장 worker drain 뒤에도 다섯 연결과 시간축이 보존된다");
    const auto drained = analysis::GetEventStorageSnapshot();
    Expect(drained.queue_size == 0 && drained.failed_count == 0 &&
               drained.stored_count == (jsonl_enabled ? 3U : 0U),
           "JSONL 설정에 따른 실제 저장 수와 빈 큐를 확인한다");
    std::ifstream input(config.analysis_event_storage_path);
    std::vector<std::string> lines;
    for (std::string line; std::getline(input, line);) lines.push_back(std::move(line));
    bool content_ok = !jsonl_enabled && !std::filesystem::exists(config.analysis_event_storage_path);
    if (jsonl_enabled && lines.size() == 3) {
        content_ok = true;
        const int survivors[] = {0, 3, 4};
        for (std::size_t i = 0; i < lines.size(); ++i) {
            const auto link = catalog.FindEventLinkByEventId(Event(survivors[i]).event_id);
            content_ok = content_ok && link &&
                lines[i].find("\"eventId\":\"" + Event(survivors[i]).event_id + "\"") != std::string::npos &&
                lines[i].find("\"recordingLinkId\":\"" + link->link_id + "\"") != std::string::npos;
        }
    }
    Expect(content_ok, "JSONL 비활성은 파일 없음이고 활성은 생존 이벤트 세 개와 link ID가 일치한다");
}

void VerifyRecovery(recording::RecordingCatalog& catalog,
                    recording::RetentionCoordinator& retention,
                    const std::filesystem::path& root, const std::filesystem::path& sample) {
    Expect(AllPending(catalog), "새 프로세스의 빈 SQLite를 journal로 재구축해 다섯 PTS 연결을 복구한다");
    std::filesystem::create_directories(root / "cam-runtime");
    const auto media = root / "cam-runtime/source.mp4";
    std::filesystem::copy_file(sample, media);
    recording::RecordingSegmentV1 source;
    source.segment_id = "runtime-source";
    source.source_id = source.channel_id = "cam-runtime";
    source.stream_epoch_id = "epoch-runtime";
    source.start.utc_ms = 10000;
    source.end.utc_ms = 13000;
    source.start.pts = 0;
    source.end.pts = 3000000000LL;
    source.container = "mp4";
    source.video_codecs = {"h264"};
    source.audio_omitted_reason = "source-no-audio";
    source.size_bytes = std::filesystem::file_size(media);
    source.checksum_sha256 = std::string(64, 'a');
    source.lifecycle = recording::RecordingLifecycle::Finalized;
    source.retention_class = recording::RecordingRetentionClass::Continuous;
    source.created_at_ms = 10000;
    source.finalized_at_ms = 13000;
    std::string error;
    Require(catalog.FinalizeSegment(source, media.string(), &error), "복구 source finalize: " + error);
    recording::GStreamerEventClipDeriver deriver;
    const auto bridge = MakeBridge(catalog, retention, deriver, root);
    const auto deadline = std::chrono::steady_clock::now() + std::chrono::seconds(25);
    while (catalog.ListEventLinks(recording::EventRecordingLinkStatus::Complete).size() != 5 &&
           std::chrono::steady_clock::now() < deadline) {
        std::this_thread::sleep_for(std::chrono::milliseconds(10));
    }
    std::vector<std::string> ids;
    bool complete = true;
    for (int i = 0; i < 5; ++i) {
        const auto link = catalog.FindEventLinkByEventId(Event(i).event_id);
        if (!link || link->status != recording::EventRecordingLinkStatus::Complete ||
            !link->requested_range || link->requested_range->start_ms != 10200 + i * 20 ||
            link->requested_range->end_ms != 11000 + i * 20 || !link->derived_segment_id ||
            link->derived_segment_id->empty()) {
            complete = false;
            break;
        }
        const auto path = catalog.FindSegmentMediaPath(*link->derived_segment_id);
        const auto segment = catalog.FindSegmentById(*link->derived_segment_id);
        complete = complete && path && segment && std::filesystem::is_regular_file(*path) &&
            segment->size_bytes > 0 && segment->size_bytes == std::filesystem::file_size(*path) &&
            segment->retention_class == recording::RecordingRetentionClass::Event;
        ids.push_back(*link->derived_segment_id);
    }
    Expect(complete, "퇴출 이벤트까지 UTC 매핑 후 다섯 실제 H264 파생 파일이 완료된다");
    DispatcherScope scope{};
    analysis::SetEventRecordingBridge(bridge);
    for (int i = 0; i < 5; ++i) analysis::DispatchEventRecords(Result(), {Event(i)});
    analysis::StopEventStorage();
    bridge->StopAndDrain();
    bool unchanged = catalog.ListEventLinks(recording::EventRecordingLinkStatus::Complete).size() == 5;
    for (int i = 0; i < 5; ++i) {
        const auto link = catalog.FindEventLinkByEventId(Event(i).event_id);
        unchanged = unchanged && link && link->derived_segment_id == ids.at(i);
    }
    Expect(unchanged, "같은 이벤트 재접수는 복구된 다섯 clip ID를 바꾸거나 추가하지 않는다");
}

void VerifyShutdownCancellation() {
    analysis::SetEventRecordingBridge(nullptr);
    analysis::DispatchEventRecords(Result(), {Event(0)});
    const auto worker_deadline = std::chrono::steady_clock::now() + std::chrono::seconds(1);
    bool worker_entered = false;
    while (std::chrono::steady_clock::now() < worker_deadline) {
        const auto snapshot = analysis::GetEventStorageSnapshot();
        if (snapshot.enqueued_count == 1 && snapshot.queue_size == 0) {
            worker_entered = true;
            break;
        }
        std::this_thread::sleep_for(std::chrono::milliseconds(10));
    }
    Expect(worker_entered, "post-event frame 대기 중인 실제 storage worker를 관찰한다");
    const auto started = std::chrono::steady_clock::now();
    analysis::StopEventStorage();
    const auto elapsed_ms = std::chrono::duration_cast<std::chrono::milliseconds>(
                                std::chrono::steady_clock::now() - started)
                                .count();
    const auto drained = analysis::GetEventStorageSnapshot();
    Expect(elapsed_ms < 1000,
           "종료 신호가 post-event frame 대기를 깨워 1초 안에 worker를 drain한다");
    Expect(drained.queue_size == 0 && drained.stored_count == 1,
           "frame 대기 취소 뒤에도 EventRecord JSONL을 유실하지 않는다");
}
}  // namespace

namespace core {
const AnalysisRuntimeConfig& GetAnalysisRuntimeConfig() { return config; }
}  // namespace core

int main(int argc, char** argv) {
    try {
        Require(argc == 4, "사용법: runtime-smoke disabled-admit|enabled-admit|disabled-recover|enabled-recover|shutdown-cancel root sample");
        scenario = argv[1];
        const bool recover = scenario == "disabled-recover" || scenario == "enabled-recover";
        const bool shutdown_cancel = scenario == "shutdown-cancel";
        Require(recover || shutdown_cancel || scenario == "disabled-admit" || scenario == "enabled-admit", "알 수 없는 시나리오");
        const std::filesystem::path root = std::filesystem::absolute(argv[2]);
        config.analysis_event_storage_enabled = scenario == "enabled-admit" || shutdown_cancel;
        config.analysis_event_storage_path = (root / "events.jsonl").string();
        config.analysis_event_storage_max_queue = 2;
        config.analysis_event_snapshot_hook_enabled = false;
        config.analysis_event_clip_hook_enabled = shutdown_cancel;
        config.analysis_event_clip_dir = (root / "clips").string();
        config.analysis_event_pre_event_ms = 100;
        config.analysis_event_post_event_ms = shutdown_cancel ? 3000 : 100;
        config.analysis_event_clip_buffer_ms = shutdown_cancel ? 3000 : 0;
        recording::RecordingJournal journal(root / "recording-mutations.jsonl");
        std::string error;
        Require(journal.Open(&error), "journal open: " + error);
        // 복구 프로세스는 원래 DB를 읽지 않는다. 동일 journal만으로 새 primary를 만든다.
        recording::RecordingCatalog catalog(journal,
            {root / (recover ? "rebuilt.sqlite3" : "catalog.sqlite3"), root, true});
        Require(catalog.Open(&error), "catalog open: " + error);
        Require(catalog.catalog_mode() == "sqlite-primary", "SQLite primary 실행이 필요함");
        recording::RetentionCoordinator::Options options;
        options.media_root = root;
        options.reserved_free_bytes = 1;
        recording::RetentionCoordinator retention(catalog, [&catalog] { return catalog.RetentionSnapshot(); },
            [](std::uint64_t* bytes, std::string*) { *bytes = 1024ULL * 1024ULL * 1024ULL; return true; },
            [&root](const std::filesystem::path& path, std::string* detail) {
                return recording::RemoveContainedMediaFile(root, path, detail);
            }, options);
        recording::RetentionPolicy policy;
        policy.continuous_max_bytes = policy.event_max_bytes = 1024ULL * 1024ULL * 1024ULL;
        policy.continuous_max_age_ms = policy.event_max_age_ms = 1000000;
        Require(retention.UpdateChannelPolicy("cam-runtime", policy, &error), "policy: " + error);
        if (shutdown_cancel) VerifyShutdownCancellation();
        else if (recover) VerifyRecovery(catalog, retention, root, argv[3]);
        else VerifyAdmission(catalog, retention, root, config.analysis_event_storage_enabled);
        std::cout << "[s05-runtime-summary] case=" << scenario << " pass=" << passed << " fail=0\n";
        return 0;
    } catch (const std::exception& error) {
        std::cerr << "[s05-runtime-fail] case=" << scenario << " " << error.what() << '\n';
        return 1;
    }
}

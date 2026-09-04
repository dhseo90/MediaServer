// 파일 요약: EventStorage와 녹화 catalog/파생 clip 사이의 narrow bridge 구현을 선언한다.
// 동작 요약: PTS→UTC, overlap, hold, 멱등성, event quota와 fallback link 갱신을 조정한다.
#pragma once

#include <filesystem>
#include <functional>
#include <condition_variable>
#include <memory>
#include <mutex>
#include <optional>
#include <thread>
#include <unordered_map>
#include <unordered_set>
#include <string>

#include "analysis/event_storage.h"
#include "recording/event_clip_deriver.h"
#include "recording/recording_catalog.h"
#include "recording/retention_coordinator.h"

namespace recording {

class CatalogEventRecordingBridge final : public analysis::EventRecordingBridge {
public:
    struct Options {
        std::filesystem::path output_root;
        std::function<std::int64_t()> now_ms;
        std::function<bool(const std::filesystem::path&,
                           const std::filesystem::path&,
                           std::string*)> remove_media_file;
        std::function<bool(std::string*)> terminal_release_guard;
        // production은 active session 조회를 주입한다. 실패 시 신규 link를 접수하지 않는다.
        std::function<std::optional<std::string>(const std::string&)> resolve_recording_channel;
        std::int64_t finalization_grace_ms{0};
        std::int64_t mapping_retry_ms{250};
        std::size_t max_pending_jobs{256};
    };

    CatalogEventRecordingBridge(RecordingCatalog& catalog,
                                RetentionCoordinator& retention,
                                EventClipDeriver& deriver,
                                Options options);
    ~CatalogEventRecordingBridge() override;

    analysis::EventRecordingBridgeResult TryResolve(
        const analysis::AnalysisResult& result,
        const analysis::EventRecord& record,
        const analysis::EventMediaHookOptions& options) override;
    void RecordFallback(
        const analysis::EventRecord& record,
        const analysis::EventRecordingBridgeResult& previous) override;
    void StopAndDrain();

private:
    struct PendingJob;
    void Enqueue(PendingJob job, bool preserve_existing_schedule = false);
    void RefillPendingJobs();
    void WorkerLoop();
    void Process(PendingJob job);
    bool ReleaseTerminalResources(EventRecordingLinkV1* link,
                                  const std::string& output_segment_id,
                                  std::uint64_t actual_size_bytes,
                                  std::string* error);
    bool CommitTerminalOrAdvance(EventRecordingLinkV1 link, std::string* error);

    RecordingCatalog& catalog_;
    RetentionCoordinator& retention_;
    EventClipDeriver& deriver_;
    Options options_;
    std::mutex mu_;
    std::mutex resolution_mu_;
    std::condition_variable cv_;
    std::unordered_map<std::string, std::shared_ptr<PendingJob>> jobs_;
    std::unordered_set<std::string> deferred_until_restart_;
    bool stopping_{false};
    std::thread worker_;
};

}  // namespace recording

// 파일 용도: 분석 관측 sampling 및 비동기 영속화. media thread에서 filesystem을 접근하지 않는다.
#pragma once
#include "recording/recording_catalog.h"
#include "analysis/analysis_types.h"
#include <functional>
#include <condition_variable>
#include <deque>
#include <thread>

namespace recording {
class AnalysisObservationProjector final : public analysis::AnalysisResultObserver {
public:
    struct Options {
        std::int64_t interval_ms{1000};
        std::size_t max_queue{256};
        std::size_t max_tracks{4096};
        std::size_t max_pending{1024};
        std::function<analysis::AnalysisObservationContext(const std::string&,std::int64_t)> resolve_context;
        bool use_consumer_references{false};
    };
    struct Status {
        std::size_t queued{0}, tracks{0}, pending{0};
        std::uint64_t stored{0}, interval_dropped{0}, critical_rejected{0}, storage_errors{0};
        std::string last_error;
    };
    AnalysisObservationProjector(RecordingCatalog& catalog, Options options);
    ~AnalysisObservationProjector();
    bool Submit(AnalysisObservationV2 observation);
    void StopNamespace(const std::string& analysis_namespace, const std::string& reason="stream-stopped");
    void NotifyFinalized();
    void StopAndDrain();
    Status GetStatus() const;
    analysis::AnalysisObservationContext CaptureContext(const std::string& source,std::int64_t pts) override;
    void OnResult(const analysis::AnalysisResult& result) override;
    void OnStopped(const std::string& observation_namespace,const std::string& reason) override;
    void OnEvent(const analysis::AnalysisResult& result,const std::string& event_id,
                 std::uint64_t track_id,const std::string& zone_id,const std::string& line_id,
                 const std::string& rule_id,const std::string& scenario_id);
private:
    struct TrackState { AnalysisObservationV2 last; std::int64_t sampled_pts{0}; bool ended{false}; std::optional<RecordingConsumerReferenceV1> reference; };
    struct Queued { AnalysisObservationV2 observation; std::optional<RecordingConsumerReferenceV1> reference; };
    bool EnqueueLocked(AnalysisObservationV2 observation, std::optional<RecordingConsumerReferenceV1> reference = std::nullopt);
    bool SubmitInternal(AnalysisObservationV2 observation, std::optional<RecordingConsumerReferenceV1> reference);
    void SubmitResult(const analysis::AnalysisResult&, AnalysisObservationV2, bool ended);
    void WorkerLoop();
    RecordingCatalog& catalog_;
    Options options_;
    mutable std::mutex mu_;
    std::mutex stop_mu_;
    std::condition_variable cv_;
    std::deque<Queued> queue_;
    std::unordered_map<std::string, TrackState> tracks_;
    std::unordered_map<std::string, AnalysisObservationV2> pending_;
    std::unordered_set<std::string> ended_;
    std::deque<std::string> ended_order_;
    std::deque<std::string> retry_ids_;
    Status status_;
    bool stopping_{false}, finalized_{false};
    std::thread worker_;
};
}

// 내부 opt-in 이벤트 작업 실행기. 공개 route/default 구성과 독립적이다.
#pragma once
#include "analysis/analysis_types.h"
#include "recording/recording_catalog.h"
#include <atomic>
#include <condition_variable>
#include <deque>
#include <functional>
#include <memory>
#include <thread>

namespace recording {
class DerivedJobService;
struct DerivedEventEvidenceUpdate {
    std::string source_id,channel_id;
    std::shared_ptr<const analysis::DecodedIntervalSnapshot> evidence;
};
struct DerivedEventWorkerOptions {
    std::size_t queue_capacity{16},max_attempts{16};
    std::int64_t wait_ms{1000},retry_ms{100};
    std::uint64_t reserved_bytes{32*1024*1024};
    // 잠금 밖 호출. 주입자는 thread-safe/nonblocking이어야 하며 강제 중단 thread를 만들지 않는다.
    std::function<DerivedEventEvidenceUpdate(const RecordingConsumerReferenceV1&)> latest_evidence;
    std::function<std::int64_t()> now_ms;
    std::string budget_reason;
};
DerivedEventWorkerOptions RecordingRuntimeEventBudget(std::int64_t segment_ms,std::int64_t post_ms);
class DerivedEventWorker {
public:
    DerivedEventWorker(RecordingCatalog&,RetentionCoordinator&,DerivedJobService&,DerivedEventWorkerOptions);
    ~DerivedEventWorker();
    bool Submit(const RecordingConsumerReferenceV1&,std::shared_ptr<const analysis::DecodedIntervalSnapshot>,std::string*);
    RecordingDerivedReferenceResult Query(const std::string&);
    void StopAndDrain();
private:
    struct Pending {
        RecordingConsumerReferenceV1 reference;
        std::shared_ptr<const analysis::DecodedIntervalSnapshot> evidence;
        std::chrono::steady_clock::time_point deadline;
    };
    void Loop();
    void Process(Pending);
    void Status(const std::string&,const std::string&);
    RecordingCatalog& catalog_;
    RetentionCoordinator& retention_;
    DerivedJobService& service_;
    DerivedEventWorkerOptions options_;
    std::mutex mu_,stop_mu_;
    std::condition_variable cv_;
    std::deque<Pending> queue_;
    std::unordered_set<std::string> inflight_;
    std::unordered_map<std::string,std::string> statuses_;
    std::deque<std::string> status_order_;
    std::string startup_error_;
    std::atomic<bool> stopped_{false};
    std::thread worker_;
};
}

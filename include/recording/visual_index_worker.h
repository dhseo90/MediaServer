// 파일 용도: 미디어 callback 밖에서 단일 색인 작업·불변 게시·종료를 소유한다.
#pragma once
#include "recording/visual_index_store.h"
#include <atomic>
#include <chrono>
#include <condition_variable>
#include <mutex>
#include <thread>
#include <map>

namespace recording {
struct VisualIndexWorkerStatus {
    std::string state{"stopped"}, error;
    std::uint64_t generation{0};
    std::string attempt_state{"not-attempted"};
    std::optional<std::int64_t> attempt_started_ms,attempt_finished_ms,last_success_ms;
    std::size_t documents{0};
    std::map<std::string,std::size_t> unsupported_segments,unsupported_snapshots;
};
// 세대는 이 worker instance 안에서만 비교한다. cache 복구 시 원 게시 시각/세대는 미확인이다.
struct VisualIndexPublication {
    std::string instance_id,origin;
    std::optional<std::uint64_t> generation;
    std::optional<std::int64_t> published_at_ms;
    std::optional<std::map<std::string,VisualSourceCoverage>> coverage;
};
struct VisualIndexReadView {
    std::shared_ptr<const VisualSearchIndex> index;
    std::shared_ptr<const VisualIndexPublication> publication;
    VisualIndexWorkerStatus status;
};
class VisualIndexWorker {
public:
    using Cancelled = std::function<bool()>;
    // 완전한 현재 대상만 반환한다. 원본 접근/권한/주기 sample 선택은 제품 adapter 책임이다.
    // 입력 metadata에는 embedding이 없어도 된다. 양 callback은 취소를 관측해야 한다.
    using Source = std::function<bool(std::vector<VisualSearchDocument>*,const Cancelled&,std::string*)>;
    using SourceWithCoverage = std::function<bool(std::vector<VisualSearchDocument>*,
        std::optional<std::map<std::string,VisualSourceCoverage>>*,const Cancelled&,std::string*)>;
    using Encode = std::function<bool(VisualSearchDocument*,const Cancelled&,std::string*)>;
    // 생성한 callback과 자원은 Rebuild의 모든 종료 경로에서 함께 파괴된다.
    using EncodeFactory = std::function<Encode()>;
    VisualIndexWorker(VisualIndexStore store,Source source,Encode encode,
        std::chrono::milliseconds interval,VisualIndexLimits limits = {});
    VisualIndexWorker(VisualIndexStore store,Source source,EncodeFactory encode_factory,
        std::chrono::milliseconds interval,VisualIndexLimits limits = {});
    VisualIndexWorker(VisualIndexStore store,SourceWithCoverage source,EncodeFactory encode_factory,
        std::chrono::milliseconds interval,VisualIndexLimits limits = {});
    ~VisualIndexWorker();
    VisualIndexWorker(const VisualIndexWorker&)=delete;
    VisualIndexWorker& operator=(const VisualIndexWorker&)=delete;
    bool Start();
    void Stop();
    void RequestRebuild();
    std::shared_ptr<const VisualSearchIndex> Snapshot() const;
    VisualIndexWorkerStatus Status() const;
    VisualIndexReadView ReadView() const;
private:
    void Run();
    bool Rebuild(const Cancelled&,std::string*);
    VisualIndexStore store_;
    SourceWithCoverage source_;
    EncodeFactory encode_factory_;
    std::chrono::milliseconds interval_;
    VisualIndexLimits limits_;
    mutable std::mutex mutex_;
    std::condition_variable changed_;
    std::thread worker_;
    std::atomic<bool> stopping_{false};
    bool requested_{false};
    std::shared_ptr<const VisualSearchIndex> current_;
    std::weak_ptr<const VisualSearchIndex> retired_;
    VisualIndexWorkerStatus status_;
    std::string instance_id_;
    std::shared_ptr<const VisualIndexPublication> publication_;
};
} // namespace recording

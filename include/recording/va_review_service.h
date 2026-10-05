// 파일 용도: 미디어 경로와 분리된 단일 worker의 bounded VA 검토 수명.
#pragma once
#include "recording/va_review_store.h"
#include <atomic>
#include <condition_variable>
#include <deque>
#include <mutex>
#include <thread>
#include <unordered_map>

namespace recording {
struct VaReviewInference {
    VaReviewOutput output;
    std::string provider,model,model_revision,prompt_sha256,adapter_version;
};
struct VaReviewJob {
    std::string id,package_id,channel_id,owner,state,error,review_id;
};
class VaReviewService {
public:
    using Clock=std::chrono::steady_clock;
    using Authorize=std::function<bool(const std::string&)>;
    using Infer=std::function<bool(const VaReviewInput&,const std::string&,Clock::time_point,
        const std::function<bool()>&,VaReviewInference*,std::string*)>;
    struct Options {
        bool enabled{false};
        std::size_t queue_size{4},remembered_jobs{64};
        std::chrono::milliseconds queue_wait{30000},execution_time{60000};
    };
    VaReviewService(EvidencePackageStore&,VaReviewStore&,Options,Infer);
    ~VaReviewService();
    VaReviewService(const VaReviewService&)=delete;
    bool Submit(const std::string& package_id,const std::string& question,const std::string& provider,
        const std::string& owner,Authorize,VaReviewJob*,std::string* error);
    bool Get(const std::string& id,const Authorize&,VaReviewJob*,std::string* error) const;
    bool Cancel(const std::string& id,const std::string& owner,bool admin,const Authorize&,std::string* error);
    void Stop();
    bool ready() const {return ready_;}
    static bool ValidJobId(const std::string&);
private:
    struct Task {
        VaReviewJob job;
        std::string question,provider,key;
        Authorize authorize;
        Clock::time_point queued;
        std::atomic<bool> cancelled{false};
    };
    void Run();
    void Execute(const std::shared_ptr<Task>&);
    void Finish(const std::shared_ptr<Task>&,const std::string& state,const std::string& error,const std::string& result={});
    EvidencePackageStore& evidence_;VaReviewStore& records_;Options options_;Infer infer_;
    bool ready_{false};std::atomic<bool> stopped_{false};std::atomic<unsigned> admitting_{0};
    std::string epoch_;std::uint64_t next_{0};
    mutable std::mutex mutex_;std::condition_variable wake_;std::once_flag stop_once_;std::thread worker_;
    std::deque<std::shared_ptr<Task>> queue_;
    std::deque<std::string> order_;
    std::unordered_map<std::string,std::shared_ptr<Task>> jobs_;
};
} // namespace recording

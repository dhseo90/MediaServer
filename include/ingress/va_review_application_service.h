// 파일 용도: Ops 검토 API의 bounded 입력·현재 권한·공개 결과를 조립한다.
#pragma once
#include "ingress/application_service_result.h"
#include "recording/va_review_provider.h"
#include <atomic>

namespace ingress {
class VaReviewApplicationService {
public:
    using Authorize=recording::VaReviewService::Authorize;
    VaReviewApplicationService(const std::filesystem::path& root, bool enabled,
        recording::VaReviewProviderOptions provider, std::uint64_t reserve,
        recording::VaReviewService::Infer infer={},
        std::chrono::milliseconds confirmation_ttl=std::chrono::minutes(5),
        std::shared_ptr<recording::SearchModelResidency> memory=std::make_shared<recording::SearchModelResidency>());
    ApplicationServiceResult Submit(const std::string& body,const std::string& owner,Authorize);
    ApplicationServiceResult List(const std::string& package_id,const Authorize&,bool can_execute);
    ApplicationServiceResult Get(const std::string& id,const Authorize&);
    ApplicationServiceResult Job(const std::string& id,const std::string& owner,bool admin,
        bool can_write,const Authorize&,bool cancel=false);
    bool enabled() const {return enabled_;}
    ApplicationServiceResult AnalysisPackages(const std::string& channel,const Authorize&,bool writable,const std::string& after="");
    ApplicationServiceResult AnalysisPackage(const std::string& id,const Authorize&,bool writable);
    ApplicationServiceResult AnalysisDraft(const std::string& body,const std::string& principal,const Authorize&);
    ApplicationServiceResult AnalysisAction(const std::string& draft,const std::string& action,const std::string& body,
        const std::string& principal,const Authorize&);
    ApplicationServiceResult AnalysisList(const std::string& package,const Authorize&);
    ApplicationServiceResult AnalysisGet(const std::string& id,const Authorize&);
    ApplicationServiceResult AnalysisJob(const std::string& id,const std::string& owner,bool admin,bool write,const Authorize&,bool cancel);
    void Stop(){stopped_=true;service_.Stop();}
private:
    struct Draft {
        recording::ConfirmedAnalysisRequest input;
        std::string id,channel,job_id;
        std::int64_t expires_at_ms{};
        bool confirmed{false};
        std::size_t bytes{};
    };
    std::shared_ptr<recording::SearchModelResidency> memory_;
    std::mutex drafts_mutex_;
    std::unordered_map<std::string,Draft> drafts_;
    std::chrono::milliseconds confirmation_ttl_;
    std::string draft_epoch_;
    std::uint64_t next_draft_{};
    bool enabled_;
    std::atomic<bool> stopped_{false};
    std::atomic<unsigned> reading_{0};
    recording::EvidencePackageStore evidence_;
    recording::VaReviewStore records_;
    recording::VaReviewService service_;
};
} // namespace ingress

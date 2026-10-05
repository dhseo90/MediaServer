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
        recording::VaReviewService::Infer infer={});
    ApplicationServiceResult Submit(const std::string& body,const std::string& owner,Authorize);
    ApplicationServiceResult List(const std::string& package_id,const Authorize&,bool can_execute);
    ApplicationServiceResult Get(const std::string& id,const Authorize&);
    ApplicationServiceResult Job(const std::string& id,const std::string& owner,bool admin,
        bool can_write,const Authorize&,bool cancel=false);
    void Stop(){stopped_=true;service_.Stop();}
private:
    bool enabled_;
    std::atomic<bool> stopped_{false};
    std::atomic<unsigned> reading_{0};
    recording::EvidencePackageStore evidence_;
    recording::VaReviewStore records_;
    recording::VaReviewService service_;
};
} // namespace ingress

// 파일 용도: Ops 증거 보존 요청의 admission·권한·정제 응답.
#pragma once
#include "ingress/application_service_result.h"
#include "recording/evidence_package_builder.h"
#include <atomic>
#include <unordered_map>

namespace ingress {
class EvidenceApplicationService {
public:
    using Authorize=std::function<bool(const std::string&)>;
    using Query=std::unordered_map<std::string,std::string>;
    EvidenceApplicationService(recording::RecordingCatalog&,recording::RecordingReadService&,
        bool enabled,const std::filesystem::path& directory,std::uint64_t reserved_free_bytes);
    ApplicationServiceResult Create(const recording::SearchDocument&,const std::string& query_kind,
        const std::string& expected_sha256,const Authorize&,bool observations=false);
    ApplicationServiceResult List(const Query&,const Authorize&);
    ApplicationServiceResult Get(const std::string& id,const Authorize&);
    std::shared_ptr<recording::EvidencePackageFile> Asset(const std::string& id,std::size_t index,const Authorize&,int* status,bool observations=false);
    void Stop(){stopped_=true;}
private:
    bool enabled_;
    bool ready_{false};
    recording::RecordingCatalog& catalog_;
    recording::EvidencePackageStore store_;
    recording::EvidencePackageBuilder builder_;
    std::atomic<bool> creating_{false},stopped_{false};
    std::atomic<unsigned> reading_{0};
};
} // namespace ingress

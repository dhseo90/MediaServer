// 파일 용도: 내부 manifest/계정 식별자를 노출하지 않는 Ops 검토 응답과 이력 조회.
#include "ingress/va_review_application_service.h"
#include "domain/strict_json.h"
#include <algorithm>
#include <random>

namespace ingress {
namespace {
using recording::EvidenceJsonQuote;
ApplicationServiceResult Error(const std::string& code){
    const int status=code=="review-forbidden"?403:
        code=="review-invalid-input"||code=="review-invalid-id"?400:
        code==recording::VaReviewService::ModelExecutionRestriction()?409:
        code=="review-job-expired"?410:
        code=="review-job-unavailable"||code=="review-record-unavailable"||code=="review-input-unavailable"?404:503;
    return {status,status==400?"Bad Request":status==403?"Forbidden":status==404?"Not Found":
        status==409?"Conflict":status==410?"Gone":"Service Unavailable","{\"error\":"+EvidenceJsonQuote(code)+"}"};
}
recording::VaReviewStore::Limits Limits(std::uint64_t reserve){
    recording::VaReviewStore::Limits limits;limits.reserve_bytes=std::max(limits.reserve_bytes,reserve);return limits;
}
recording::VaReviewService::Options Options(bool enabled){
    recording::VaReviewService::Options options;options.enabled=enabled;return options;
}
struct Reading {
    std::atomic<unsigned>& count;bool admitted;
    explicit Reading(std::atomic<unsigned>& c):count(c),admitted(c.fetch_add(1)<2){}
    ~Reading(){count.fetch_sub(1);}
};
std::string Summary(const std::string& id,const recording::VaReviewRecord& r){
    return "{\"id\":"+EvidenceJsonQuote(id)+",\"packageId\":"+EvidenceJsonQuote(r.input.package_id)+
        ",\"question\":"+EvidenceJsonQuote(r.input.question)+",\"provider\":"+EvidenceJsonQuote(r.provider)+
        ",\"model\":"+EvidenceJsonQuote(r.model)+",\"createdAtMs\":"+std::to_string(r.created_at_ms);
}
std::string JobJson(const recording::VaReviewJob& job,bool can_cancel){
    return "{\"id\":"+EvidenceJsonQuote(job.id)+",\"packageId\":"+EvidenceJsonQuote(job.package_id)+
        ",\"state\":"+EvidenceJsonQuote(job.state)+",\"error\":"+EvidenceJsonQuote(job.error)+
        ",\"reviewId\":"+EvidenceJsonQuote(job.review_id)+",\"canCancel\":"+(can_cancel?"true":"false")+"}";
}
}
VaReviewApplicationService::VaReviewApplicationService(const std::filesystem::path& root,bool enabled,
    recording::VaReviewProviderOptions provider,std::uint64_t reserve,recording::VaReviewService::Infer infer,std::chrono::milliseconds confirmation_ttl)
    :confirmation_ttl_(confirmation_ttl),enabled_(enabled),
     evidence_(root/"evidence-packages",{}),records_(root/"va-reviews",Limits(reserve)),
     service_(evidence_,records_,Options(enabled),infer?std::move(infer):recording::MakeVaReviewProvider(std::move(provider))){
    if(confirmation_ttl_.count()<=0||confirmation_ttl_>std::chrono::minutes(5))enabled_=false;
    std::random_device random;std::string entropy;for(unsigned i=0;i<8;++i)entropy+=std::to_string(random())+":";
    draft_epoch_=recording::EvidenceSha256(entropy.data(),entropy.size());
}
ApplicationServiceResult VaReviewApplicationService::Submit(const std::string& body,const std::string& owner,Authorize authorize){
    StrictJsonObjectDocument doc;
    if(body.size()>2048||!ParseStrictJsonObjectDocument(body,&doc,nullptr)||doc.members.size()!=3)
        return Error("review-invalid-input");
    const auto package=StrictJsonStringField(doc,"packageId"),question=StrictJsonStringField(doc,"question"),provider=StrictJsonStringField(doc,"provider");
    if(!package||!question||!provider)return Error("review-invalid-input");
    recording::VaReviewJob job;std::string error;
    if(!service_.Submit(*package,*question,*provider,owner,std::move(authorize),&job,&error))return Error(error);
    return {202,"Accepted",JobJson(job,true)};
}
ApplicationServiceResult VaReviewApplicationService::List(const std::string& package,const Authorize& authorize,bool can_execute){
    if(!recording::EvidencePackageStore::ValidId(package))return Error("review-invalid-input");
    Reading flight(reading_);if(!flight.admitted)return Error("review-busy");
    const auto deadline=recording::VaReviewService::Clock::now()+std::chrono::seconds(5);
    const auto cancelled=[&]{return stopped_||recording::VaReviewService::Clock::now()>=deadline;};
    std::string error;const auto file=evidence_.Open(package,&error,cancelled);
    if(!file)return Error("review-input-unavailable");
    const auto channel=file->manifest().channel_id;
    if(!authorize||!authorize(channel))return Error("review-forbidden");
    if(!enabled_||stopped_)return {200,"OK",R"({"enabled":false,"canExecute":false,"items":[]})"};
    if(!service_.ready())return Error("review-store-unavailable");
    std::vector<std::string> ids;if(!records_.List(&ids,&error))return Error("review-store-unavailable");
    // 역할과 채널 권한 확인 후 출시 제한을 표시한다. 권한 문자열은 실행 정책을 바꾸지 않는다.
    (void)can_execute;
    std::string json="{\"enabled\":true,\"canExecute\":false,\"executionRestriction\":"+
        EvidenceJsonQuote(recording::VaReviewService::ModelExecutionRestriction())+",\"items\":[";
    bool comma=false;
    for(const auto& id:ids){
        if(cancelled())return Error("review-busy");
        recording::VaReviewRecord record;if(!records_.Read(id,&record,&error))return Error("review-store-unavailable");
        if(record.input.package_id!=package)continue;
        if(record.input.manifest.channel_id!=channel)return Error("review-store-unavailable");
        if(comma)json+=',';comma=true;json+=Summary(id,record)+"}";
    }
    if(!authorize(channel))return Error("review-forbidden");
    return {200,"OK",json+"]}"};
}
ApplicationServiceResult VaReviewApplicationService::Get(const std::string& id,const Authorize& authorize){
    if(!recording::VaReviewStore::ValidId(id))return Error("review-invalid-id");
    if(!enabled_||stopped_)return Error("review-disabled");
    Reading flight(reading_);if(!flight.admitted)return Error("review-busy");
    recording::VaReviewRecord record;std::string error;
    if(!records_.Read(id,&record,&error))return Error("review-record-unavailable");
    if(!authorize||!authorize(record.input.manifest.channel_id))return Error("review-forbidden");
    return {200,"OK",Summary(id,record)+",\"latencyMs\":"+std::to_string(record.latency_ms)+
        ",\"output\":"+recording::SerializeVaReviewOutput(record.output)+"}"};
}
ApplicationServiceResult VaReviewApplicationService::Job(const std::string& id,const std::string& owner,bool admin,
    bool can_write,const Authorize& authorize,bool cancel){
    if(!enabled_||stopped_)return Error("review-disabled");
    std::string error;recording::VaReviewJob job;
    if(!service_.Get(id,authorize,&job,&error))return Error(error);
    if(job.kind!="model")return Error("review-job-unavailable");
    if(cancel&&(!can_write||!service_.Cancel(id,owner,admin,authorize,&error)))return Error(can_write?error:"review-forbidden");
    if(cancel&&!service_.Get(id,authorize,&job,&error))return Error(error);
    return {200,"OK",JobJson(job,can_write&&(admin||owner==job.owner)&&(job.state=="queued"||job.state=="running"))};
}
} // namespace ingress

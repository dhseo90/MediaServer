// 파일 용도: 제한된 A 검토 초안/확인과 기존 worker 연결. 공개 입력에서 관측·판정·출처를 받지 않는다.
#include "ingress/va_review_application_service.h"
#include "recording/va_review_material_requests.h"
#include "../recording/va_review_json.h"
#include <algorithm>
#include <set>
#include <map>
namespace ingress {
namespace {
using namespace recording;
using namespace recording::review_json;
struct Reading {
    std::atomic<unsigned>& n; bool admitted;
    const VaReviewService::Clock::time_point deadline=VaReviewService::Clock::now()+std::chrono::seconds(5);
    explicit Reading(std::atomic<unsigned>& count):n(count),admitted(n.fetch_add(1)<2){}
    ~Reading(){--n;}
    bool expired()const{return VaReviewService::Clock::now()>=deadline;}
};
std::string Q(const std::string& s){return EvidenceJsonQuote(s);}
std::string Hash(const std::string& s){return EvidenceSha256(s.data(),s.size());}
ApplicationServiceResult Error(int status,const std::string& code){return {status,status==400?"Bad Request":status==403?"Forbidden":
    status==404?"Not Found":status==410?"Gone":status==409?"Conflict":"Service Unavailable","{\"error\":"+Q(code)+"}"};}
ApplicationServiceResult Unavailable(const std::string& error){return Error(error=="evidence-not-found"?404:503,
    error=="evidence-not-found"?"review-package-unavailable":"review-evidence-invalid");}
const std::vector<std::string> relations={"color-at","visibility-at","endpoint-right","endpoint-left","endpoint-same","endpoint-different",
    "all-color","all-visible","all-same-position","continuous-motion"};
const std::vector<std::string> labels={"지정 프레임의 색상","지정 프레임의 가시성","두 시점의 끝 위치가 오른쪽","두 시점의 끝 위치가 왼쪽",
    "두 시점의 끝 위치가 같음","두 시점의 끝 위치가 다름","지정 샘플 전체의 색상","지정 샘플 전체의 가시성","지정 샘플 전체의 위치가 같음","연속 이동 (미지원)"};
const std::vector<std::string> colors={"red","blue","green","yellow","black","white","gray"};
std::string Indices(const std::vector<std::size_t>& v){std::string s="[";for(auto i:v){if(s.size()>1)s+=',';s+=std::to_string(i);}return s+"]";}
std::string TargetKey(const std::string& id,const EvidencePackageV1& p){return Hash(id+Q(p.analysis_namespace)+Q(p.track_id));}
ReviewTargetBindingV2 Binding(const std::string& id,const EvidencePackageV1& p){
    ReviewTargetBindingV2 b;b.target_id="selected-engine-track";b.package_id=id;b.manifest_sha256=Hash(SerializeEvidencePackage(p));
    b.analysis_namespace=p.analysis_namespace;b.analysis_track_id=p.track_id;std::set<std::int64_t> episodes;
    for(const auto& s:p.observation_snapshots)for(const auto& row:s.candidates)if(row.observation.engine_first_seen_pts)episodes.insert(*row.observation.engine_first_seen_pts);
    b.engine_episodes={episodes.begin(),episodes.end()};return b;
}
std::string Episodes(const std::vector<std::int64_t>& values){std::string s="[";for(auto v:values){if(s.size()>1)s+=',';s+=Q(std::to_string(v));}return s+"]";}
std::string Claims(const std::vector<ReviewClaimSpec>& v,const std::vector<EvidenceFrameV1>& frames={}){
    std::string s="[";for(const auto& c:v){if(s.size()>1)s+=',';const auto n=std::size_t(c.relation);
        s+="{\"id\":"+Q(c.id)+",\"relation\":"+Q(relations.at(n))+",\"label\":"+Q(labels.at(n))+",\"frames\":"+Indices(c.scope)+
            ",\"requiredColor\":"+Q(colors.at(std::size_t(c.required_color)))+",\"requiredVisible\":"+(c.required_visible?"true":"false")+",\"ptsNs\":[";
        bool comma=false;for(auto i:c.scope)if(i<frames.size()){if(comma)s+=',';comma=true;s+=Q(std::to_string(frames[i].pts_ns));}s+="]}";}
    return s+"]";
}
bool ParseClaims(const Doc& d,std::size_t frames,std::vector<ReviewClaimSpec>* out){
    std::vector<std::string> raw;if(!Array(d,"claims",&raw)||raw.empty()||raw.size()>16)return false;
    for(const auto& item:raw){Doc c;std::string relation,color;bool visible=true;std::vector<std::string> indices;
        if(!Parse(item,&c)||c.members.size()!=4||!Text(c,"relation",&relation)||!Text(c,"requiredColor",&color)||
            !ingress::StrictJsonBoolField(c,"requiredVisible")||!Array(c,"frames",&indices)||indices.empty()||indices.size()>8)return false;
        visible=*ingress::StrictJsonBoolField(c,"requiredVisible");auto rel=std::find(relations.begin(),relations.end(),relation),col=std::find(colors.begin(),colors.end(),color);
        if(rel==relations.end()||col==colors.end())return false;
        ReviewClaimSpec s;s.id="c"+std::to_string(out->size());s.target_id="selected-engine-track";s.comparison_target_id=s.target_id;
        s.target_description="사용자가 선택한 분석 track";s.relation=static_cast<ReviewRelation>(rel-relations.begin());
        s.required_color=static_cast<ReviewColor>(col-colors.begin());s.required_visible=visible;
        for(const auto& index:indices){Doc x;std::size_t n;if(!Parse("{\"n\":"+index+"}",&x)||!Number(x,"n",&n)||n>=frames)return false;s.scope.push_back(n);}
        out->push_back(s);}return true;
}
std::string AJobJson(const VaReviewJob& j,bool cancel){return "{\"id\":"+Q(j.id)+",\"packageId\":"+Q(j.package_id)+",\"state\":"+Q(j.state)+
    ",\"error\":"+Q(j.error)+",\"reviewId\":"+Q(j.review_id)+",\"canCancel\":"+(cancel?"true":"false")+"}";}
std::string Package(const std::string& id,const EvidencePackageV1& p,bool writable){
    std::string s="{\"id\":"+Q(id)+",\"channelId\":"+Q(p.channel_id)+",\"targetKey\":"+Q(TargetKey(id,p))+
        ",\"targetLabel\":"+Q(p.track_id)+",\"analysisNamespace\":"+Q(p.analysis_namespace)+",\"canExecute\":"+(writable?"true":"false")+",\"frames\":[";
    for(std::size_t i=0;i<p.frames.size();++i){if(i)s+=',';const auto& f=p.frames[i];std::optional<std::size_t> asset;
        for(const auto& r:p.references)if(r.kind=="frame"&&r.asset_index&&r.sha256==f.png_sha256&&r.id==f.segment_id+":"+std::to_string(f.pts_ns))asset=*r.asset_index;
        s+="{\"index\":"+std::to_string(i)+",\"ptsNs\":"+Q(std::to_string(f.pts_ns))+",\"observationState\":"+Q(p.observation_snapshots[i].state)+
            ",\"imageUrl\":"+Q(asset?"/ops/api/recordings/a-record-packages/"+id+"/assets/"+std::to_string(*asset):"")+"}";}
    return s+"]}";
}
} // namespace
ApplicationServiceResult VaReviewApplicationService::AnalysisPackages(const std::string& channel,const Authorize& authorize,bool writable,const std::string& after){
    if(!ValidateRecordingReferenceId(channel,nullptr)||(!after.empty()&&!EvidencePackageStore::ValidId(after)))return Error(400,"review-invalid-input");
    if(!authorize||!authorize(channel))return Error(403,"review-forbidden");
    auto response_memory=memory_->ReserveOwned(8*1024*1024);
    if(!response_memory)return Error(503,"review-capacity");
    if(!enabled_||stopped_)return Error(503,"review-disabled");
    Reading flight(reading_);if(!flight.admitted)return Error(503,"review-busy");
    std::vector<std::string> ids;std::string error;if(!evidence_.ListIds(&ids,&error))return Error(503,"review-store-unavailable");
    // Keep the first page plus its lookahead, but still validate every source.
    // Evidence entries are visited before record fallbacks; emplace preserves priority.
    std::map<std::string,std::string> entries;
    const auto wanted=[&](const std::string& key){return key>after&&!entries.count(key)&&
        (entries.size()<21||key<entries.rbegin()->first);};
    const auto trim=[&]{if(entries.size()>21)entries.erase(std::prev(entries.end()));};
    for(const auto& id:ids){auto p=evidence_.Open(id,&error,[&]{return stopped_||flight.expired();});
        if(!p)return Error(503,"review-evidence-invalid");const auto& m=p->manifest();
        if(m.schema=="media-server.evidence-package.v2"&&m.channel_id==channel&&wanted(id)){entries.emplace(id,Package(id,m,writable));trim();}}
    // 저장 결과의 channel로 권한을 확인한다. package 부재가 과거 결과의 소멸을 뜻하지 않는다.
    if(!records_.ListConfirmed(&ids,&error))return Error(503,"review-store-unavailable");
    for(const auto& id:ids){if(flight.expired())return Error(503,"review-busy");VaReviewRecordV3 r;
        if(!records_.ReadV3(id,&r,&error))return Error(503,"review-store-unavailable");
        if(r.analysis.evidence.channel_id!=channel||!wanted(r.analysis.binding.package_id))continue;
        entries.emplace(r.analysis.binding.package_id,"{\"id\":"+Q(r.analysis.binding.package_id)+",\"targetLabel\":"+
            Q(r.analysis.binding.analysis_track_id)+",\"canExecute\":false,\"frames\":[],\"availability\":\"unavailable\"}");trim();}
    std::string s="{\"items\":[",next;unsigned count=0;
    for(auto it=entries.upper_bound(after);it!=entries.end();++it){if(count==20){next=std::prev(it)->first;break;}if(count++)s+=',';s+=it->second;}
    if(!authorize(channel))return Error(403,"review-forbidden");return {200,"OK",s+"],\"nextAfter\":"+Q(next)+"}",std::move(*response_memory)};
}
ApplicationServiceResult VaReviewApplicationService::AnalysisPackage(const std::string& id,const Authorize& authorize,bool writable){
    Reading flight(reading_);if(!flight.admitted)return Error(503,"review-busy");
    if(!enabled_||stopped_)return Error(503,"review-disabled");std::string error;
    const auto p=evidence_.Open(id,&error,[&]{return stopped_||flight.expired();});if(!p)return Unavailable(error);
    if(!authorize||!authorize(p->manifest().channel_id))return Error(403,"review-forbidden");
    if(p->manifest().schema!="media-server.evidence-package.v2")return Error(404,"review-package-unavailable");
    auto response_memory=memory_->ReserveOwned(8*1024*1024);
    if(!response_memory)return Error(503,"review-capacity");
    return {200,"OK",Package(id,p->manifest(),writable),std::move(*response_memory)};
}
ApplicationServiceResult VaReviewApplicationService::AnalysisDraft(const std::string& body,const std::string& principal,const Authorize& authorize){
    Reading flight(reading_);if(!flight.admitted)return Error(503,"review-busy");
    if(!enabled_||stopped_)return Error(503,"review-disabled");if(!service_.ready())return Error(503,"review-store-unavailable");
    Doc d;std::string id,question,target;
    if(body.size()>16*1024||!Parse(body,&d)||d.members.size()!=4||!Text(d,"packageId",&id)||!Text(d,"question",&question)||
        !Text(d,"targetKey",&target)||!VaReviewText(question)||!VaReviewText(principal,256))return Error(400,"review-invalid-input");
    std::string error;auto file=evidence_.Open(id,&error,[&]{return stopped_||flight.expired();});if(!file)return Unavailable(error);const auto& p=file->manifest();
    if(!authorize||!authorize(p.channel_id))return Error(403,"review-forbidden");
    if(p.schema!="media-server.evidence-package.v2"||target!=TargetKey(id,p))return Error(409,"review-target-mismatch");
    auto input_memory=memory_->ReserveOwned(64*1024);
    if(!input_memory)return Error(503,"review-capacity");
    auto response_memory=memory_->ReserveOwned(8*1024*1024);
    if(!response_memory)return Error(503,"review-capacity");
    Draft draft;draft.input.binding=Binding(id,p);
    if(!ParseClaims(d,p.frames.size(),&draft.input.claims))return Error(400,"review-invalid-input");
    std::vector<ReviewFrame> frames;for(const auto& f:p.frames)frames.push_back({f.pts_ns,f.width,f.height,f.png_sha256});
    if(!ValidateReviewCoreInput(draft.input.claims,frames,{},&error))return Error(400,"review-invalid-input");
    draft.channel=p.channel_id;auto& c=draft.input.confirmation;c.principal=principal;c.question=question;
    c.spec_sha256=AnalysisReviewSpecDigest(draft.input.binding,draft.input.claims);
    std::lock_guard lock(drafts_mutex_);const auto now=ReviewWallTimeMs();
    for(auto i=drafts_.begin();i!=drafts_.end();)if(i->second.expires_at_ms<=now)i=drafts_.erase(i);else ++i;
    // 같은 principal의 새 의도는 이전 미실행 확인을 무효화한다. 실행/저장 수명은 별개다.
    for(auto i=drafts_.begin();i!=drafts_.end();)if(i->second.input.confirmation.principal==principal&&i->second.job_id.empty())i=drafts_.erase(i);else ++i;
    draft.bytes=body.size()+SerializeEvidencePackage(p).size(); // 복사 입력과 binding의 보수적인 총량 상한
    std::size_t bytes=draft.bytes;for(const auto& item:drafts_)bytes+=item.second.bytes;
    if(drafts_.size()>=64||bytes>256*1024)return Error(503,"review-draft-capacity");
    c.revision=Hash(draft_epoch_+std::to_string(++next_draft_)+c.spec_sha256+Q(principal)+Q(question));draft.id="ad-"+c.revision;
    draft.expires_at_ms=now+confirmation_ttl_.count();c.expires_at_ms=draft.expires_at_ms;
    const auto json="{\"id\":"+Q(draft.id)+",\"revision\":"+Q(c.revision)+",\"state\":\"awaiting-confirmation\",\"question\":"+Q(question)+
        ",\"packageId\":"+Q(id)+",\"targetLabel\":"+Q(p.track_id)+",\"analysisNamespace\":"+Q(p.analysis_namespace)+
        ",\"engineEpisodes\":"+Episodes(draft.input.binding.engine_episodes)+",\"claims\":"+Claims(draft.input.claims,p.frames)+",\"expiresAtMs\":"+std::to_string(draft.expires_at_ms)+
        ",\"scope\":\"analysis-record-consistency\",\"limitation\":\"분석 기록상의 관계입니다. 물리적 동일성·영상 사실·연속 이동·숨겨진 경로를 인증하지 않습니다.\"}";
    draft.input.memory=std::move(*input_memory);drafts_.emplace(draft.id,std::move(draft));return {201,"Created",json,std::move(*response_memory)};
}
ApplicationServiceResult VaReviewApplicationService::AnalysisAction(const std::string& id,const std::string& action,const std::string& body,
    const std::string& principal,const Authorize& authorize){
    if(!enabled_||stopped_)return Error(503,"review-disabled");Doc d;std::string revision;
    if(body.size()>256||!Parse(body,&d)||d.members.size()!=1||!Text(d,"revision",&revision)||!EvidenceIsSha256(revision))return Error(400,"review-invalid-input");
    std::lock_guard lock(drafts_mutex_);const auto it=drafts_.find(id);if(it==drafts_.end())return Error(410,"review-confirmation-expired");auto& draft=it->second;
    if(draft.input.confirmation.principal!=principal||!authorize||!authorize(draft.channel))return Error(403,"review-forbidden");
    auto response_memory=memory_->ReserveOwned(8*1024*1024);
    if(!response_memory)return Error(503,"review-capacity");
    if(draft.input.confirmation.revision!=revision)return Error(409,"review-confirmation-changed");
    if(ReviewWallTimeMs()>=draft.expires_at_ms)return Error(410,"review-confirmation-expired");
    if(action=="confirm"){
        if(!draft.confirmed){draft.input.confirmation.confirmed_at_ms=ReviewWallTimeMs();draft.confirmed=true;}
        return {200,"OK","{\"id\":"+Q(id)+",\"revision\":"+Q(revision)+",\"state\":\"confirmed\",\"confirmedAtMs\":"+
            std::to_string(draft.input.confirmation.confirmed_at_ms)+"}",std::move(*response_memory)};
    }
    if(action!="execute")return Error(400,"review-invalid-input");if(!draft.confirmed)return Error(409,"review-confirmation-required");
    VaReviewJob job;std::string error;
    if(!draft.job_id.empty()){
        if(!service_.Get(draft.job_id,authorize,&job,&error))return Error(410,"review-job-expired");
        return {202,"Accepted",AJobJson(job,job.state=="queued"||job.state=="running"),std::move(*response_memory)};
    }
    if(!service_.SubmitConfirmed(draft.input,principal,authorize,&job,&error))return Error(error=="review-forbidden"?403:error=="review-confirmation-expired"?410:503,error);
    draft.job_id=job.id;return {202,"Accepted",AJobJson(job,true),std::move(*response_memory)};
}
ApplicationServiceResult VaReviewApplicationService::AnalysisList(const std::string& package,const Authorize& authorize){
    Reading flight(reading_);if(!flight.admitted)return Error(503,"review-busy");
    if(!enabled_||stopped_)return Error(503,"review-disabled");std::vector<std::string> ids;std::string error;
    // package가 사라져도 과거 결과는 자기 channel로 권한을 검증한다. 외부 scope에는 존재/개수를 반환하지 않는다.
    if(!EvidencePackageStore::ValidId(package))return Error(400,"review-invalid-input");
    auto response_memory=memory_->ReserveOwned(8*1024*1024);
    if(!response_memory)return Error(503,"review-capacity");
    if(!records_.ListConfirmed(&ids,&error))return Error(503,"review-store-unavailable");std::string s="{\"items\":[";bool comma=false;
    for(const auto& id:ids){if(flight.expired())return Error(503,"review-busy");VaReviewRecordV3 v;if(!records_.ReadV3(id,&v,&error))return Error(503,"review-store-unavailable");
        if(v.analysis.binding.package_id!=package)continue;
        if(!authorize||!authorize(v.analysis.evidence.channel_id))return Error(403,"review-forbidden");
        if(comma)s+=',';comma=true;s+="{\"id\":"+Q(id)+",\"question\":"+Q(v.confirmation.question)+",\"createdAtMs\":"+std::to_string(v.analysis.created_at_ms)+"}";}
    if(!comma){auto f=evidence_.Open(package,&error);if(!f)return Unavailable(error);if(!authorize||!authorize(f->manifest().channel_id))return Error(403,"review-forbidden");}
    return {200,"OK",s+"]}",std::move(*response_memory)};
}
ApplicationServiceResult VaReviewApplicationService::AnalysisGet(const std::string& id,const Authorize& authorize){
    Reading flight(reading_);if(!flight.admitted)return Error(503,"review-busy");
    if(!enabled_||stopped_)return Error(503,"review-disabled");VaReviewRecordV3 v;std::string error;
    if(!records_.ReadV3(id,&v,&error))return error=="review-capacity"?Error(503,"review-capacity"):Error(404,"review-record-unavailable");
    const auto& a=v.analysis;if(!authorize||!authorize(a.evidence.channel_id))return Error(403,"review-forbidden");
    auto response_memory=memory_->ReserveOwned(8*1024*1024);
    if(!response_memory)return Error(503,"review-capacity");
    std::string availability;if(!CheckAnalysisReviewEvidence(evidence_,a,&availability,&error))availability="error";
    ReviewDisplayProjectionV2 projection;if(!ProjectAnalysisReviewDisplay(a,&projection,&error))return Error(503,"review-projection-invalid");
    std::string s="{\"id\":"+Q(id)+",\"packageId\":"+Q(a.binding.package_id)+",\"question\":"+Q(v.confirmation.question)+
        ",\"targetLabel\":"+Q(a.binding.analysis_track_id)+",\"analysisNamespace\":"+Q(a.binding.analysis_namespace)+",\"engineEpisodes\":"+Episodes(a.binding.engine_episodes)+",\"scope\":\"analysis-record-consistency\",\"confirmedBy\":"+Q(v.confirmation.principal)+
        ",\"confirmedAtMs\":"+std::to_string(v.confirmation.confirmed_at_ms)+",\"questionsState\":\"not-generated\",\"modelQuality\":\"not-evaluated\","+
        "\"projectionStatus\":"+Q(projection.status)+",\"evidenceAvailability\":"+Q(availability)+",\"claims\":"+Claims(a.claims,a.evidence.frames)+",\"decisions\":[";
    for(std::size_t i=0;i<a.decisions.size();++i){if(i)s+=',';const auto& d=a.decisions[i];
        s+="{\"claimId\":"+Q(d.claim_id)+",\"verdict\":"+Q(ReviewVerdictName(d.verdict))+",\"evidenceFrames\":"+Indices(d.evidence_frames)+",\"gaps\":[";
        for(std::size_t j=0;j<d.gaps.size();++j){if(j)s+=',';s+="{\"kind\":"+Q(ReviewGapName(d.gaps[j].kind))+",\"frames\":"+Indices(d.gaps[j].frames)+"}";}s+="]}";}
    ReviewMaterialRequests materials;
    if(!BuildConfirmedReviewMaterialRequests(v,&materials,&error))return Error(503,"review-projection-invalid");
    // 표시 정보만 기존40KiB 출력 예산의 남은 공간을 사용한다. 저장 판정/gap은 절단하지 않는다.
    const auto base_bytes=s.size()+sizeof("],\"materialRequests\":}")-1;
    ApplyReviewMaterialRequestBudget(&materials,base_bytes<40*1024?40*1024-base_bytes:0);
    return {200,"OK",s+"],\"materialRequests\":"+SerializeReviewMaterialRequests(materials)+"}",std::move(*response_memory)};
}
ApplicationServiceResult VaReviewApplicationService::AnalysisJob(const std::string& id,const std::string& owner,bool admin,bool write,const Authorize& authorize,bool cancel){
    if(!enabled_||stopped_)return Error(503,"review-disabled");VaReviewJob j;std::string error;
    if(!service_.Get(id,authorize,&j,&error))return Error(error=="review-forbidden"?403:410,error);
    if(j.kind!="A")return Error(404,"review-job-unavailable");
    auto response_memory=memory_->ReserveOwned(8*1024*1024);
    if(!response_memory)return Error(503,"review-capacity");
    if(cancel&&(!write||!service_.Cancel(id,owner,admin,authorize,&error)))return Error(403,"review-forbidden");
    if(cancel&&!service_.Get(id,authorize,&j,&error))return Error(503,"review-job-unavailable");
    return {200,"OK",AJobJson(j,write&&(admin||owner==j.owner)&&(j.state=="queued"||j.state=="running")),std::move(*response_memory)};
}
} // namespace ingress

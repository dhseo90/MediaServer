// 파일 용도: A 관측 사본과 고정 명세의 판정 재현·strict codec·내부 게시. 모델/공개 API 호출 없음.
#include "recording/va_review_bound_record.h"
#include "recording/va_review_store.h"
#include "va_review_json.h"
#include <algorithm>
#include <set>

namespace recording {
namespace {
using namespace review_json;
bool Fail(std::string* e,const char* text){if(e)*e=text;return false;}
std::string Hash(const std::string& s){return EvidenceSha256(s.data(),s.size());}
std::string Q(const std::string& s){return EvidenceJsonQuote(s);}
// package/source binding의 미디어 track은 파일 ID가 아니며 /001 등의 원문을 허용한다.
bool MediaTrack(const std::string& s){return !s.empty()&&s.size()<=1024&&
    std::none_of(s.begin(),s.end(),[](unsigned char c){return c<32||c==127;});}
using Fields=std::initializer_list<std::pair<const char*,std::string>>;
std::string Object(Fields fields) {
    std::string s="{";for(const auto& f:fields){if(s.size()>1)s+=',';s+=Q(f.first)+":"+f.second;}return s+"}";
}
template<class T,class F> std::string ArrayOf(const std::vector<T>& values,F encode) {
    std::string s="[";for(const auto& v:values){if(s.size()>1)s+=',';s+=encode(v);}return s+"]";
}
template<class T> std::string Numbers(const std::vector<T>& v){return ArrayOf(v,[](T n){return std::to_string(n);});}
template<class T> bool ReadNumbers(const Doc& d,const char* key,std::vector<T>* v,std::size_t max) {
    std::vector<std::string> items;if(!Array(d,key,&items)||items.size()>max)return false;
    for(const auto& item:items){Doc n;T value{};if(!Parse("{\"n\":"+item+"}",&n)||!Number(n,"n",&value))return false;v->push_back(value);}return true;
}
bool ExactText(const Doc& d,const char* key,const char* expected){return ingress::StrictJsonStringField(d,key)==expected;}
bool Boolean(const Doc& d,const char* key,bool* out) {
    const auto* v=d.Find(key);if(!v||v->type!=Type::Bool)return false;*out=v->raw=="true";return true;
}
const std::vector<std::string> relations={"color-at","visibility-at","endpoint-right","endpoint-left","endpoint-same",
    "endpoint-different","all-color","all-visible","all-same-position","continuous-motion"};
const std::vector<std::string> colors={"red","blue","green","yellow","black","white","gray"};
template<class T> std::string Enum(T v,const std::vector<std::string>& names) {
    auto i=static_cast<std::size_t>(v);return Q(i<names.size()?names[i]:"invalid");
}
template<class T> bool ReadEnum(const Doc& d,const char* key,T* value,const std::vector<std::string>& names) {
    std::string s;if(!Text(d,key,&s))return false;auto i=std::find(names.begin(),names.end(),s);
    if(i==names.end())return false;*value=static_cast<T>(i-names.begin());return true;
}
std::string Binding(const ReviewTargetBindingV2& v) {
    return Object({{"targetId",Q(v.target_id)},{"packageId",Q(v.package_id)},{"manifestSha256",Q(v.manifest_sha256)},
        {"analysisNamespace",Q(v.analysis_namespace)},{"analysisTrackId",Q(v.analysis_track_id)},{"engineEpisodes",Numbers(v.engine_episodes)}});
}
bool ReadBinding(const std::string& s,ReviewTargetBindingV2* v) {
    Doc d;return Parse(s,&d)&&d.members.size()==6&&Text(d,"targetId",&v->target_id)&&Text(d,"packageId",&v->package_id)&&
        Text(d,"manifestSha256",&v->manifest_sha256)&&Text(d,"analysisNamespace",&v->analysis_namespace)&&
        Text(d,"analysisTrackId",&v->analysis_track_id)&&ReadNumbers(d,"engineEpisodes",&v->engine_episodes,32);
}
std::string Claims(const std::vector<ReviewClaimSpec>& values) {
    return ArrayOf(values,[](const auto& v){return Object({{"id",Q(v.id)},{"targetId",Q(v.target_id)},
        {"targetDescription",Q(v.target_description)},{"relation",Enum(v.relation,relations)},
        {"comparisonTargetId",Q(v.comparison_target_id)},{"scope",Numbers(v.scope)},{"requiredColor",Enum(v.required_color,colors)},
        {"requiredVisible",v.required_visible?"true":"false"},{"coordinates",Q(v.coordinates)},
        {"fullFrame",v.full_frame?"true":"false"},{"specVersion",std::to_string(v.spec_version)},
        {"policyVersion",std::to_string(v.policy_version)}});});
}
bool ReadClaims(const Doc& root,std::vector<ReviewClaimSpec>* values) {
    std::vector<std::string> items;if(!Array(root,"claims",&items)||items.empty()||items.size()>16)return false;
    for(const auto& s:items){Doc d;ReviewClaimSpec v;
        if(!Parse(s,&d)||d.members.size()!=12||!Text(d,"id",&v.id)||!Text(d,"targetId",&v.target_id)||
            !Text(d,"targetDescription",&v.target_description)||!ReadEnum(d,"relation",&v.relation,relations)||
            !Text(d,"comparisonTargetId",&v.comparison_target_id)||!ReadNumbers(d,"scope",&v.scope,8)||
            !ReadEnum(d,"requiredColor",&v.required_color,colors)||!Boolean(d,"requiredVisible",&v.required_visible)||
            !Text(d,"coordinates",&v.coordinates)||!Boolean(d,"fullFrame",&v.full_frame)||
            !Number(d,"specVersion",&v.spec_version)||!Number(d,"policyVersion",&v.policy_version))return false;
        values->push_back(std::move(v));}return true;
}
// 이 사본에는 판단에 필요한 미디어 계보/크기/hash만 보존한다. PNG·assets·검색 응답은 package에 남는다.
std::string Frame(const EvidenceFrameV1& f) {
    return Object({{"segmentId",Q(f.segment_id)},{"mediaSha256",Q(f.media_sha256)},{"sampleSha256",Q(f.sample_sha256)},
        {"pngSha256",Q(f.png_sha256)},{"sourceGeneration",Q(f.source_generation)},{"mediaEpochId",Q(f.media_epoch_id)},
        {"mediaTrackId",Q(f.track_id)},{"generationOrder",std::to_string(f.generation_order)},
        {"sampleOrdinal",std::to_string(f.sample_ordinal)},{"ptsNs",std::to_string(f.pts_ns)},
        {"width",std::to_string(f.width)},{"height",std::to_string(f.height)}});
}
bool ReadFrame(const std::string& s,EvidenceFrameV1* f) {
    Doc d;return Parse(s,&d)&&d.members.size()==12&&Text(d,"segmentId",&f->segment_id)&&Text(d,"mediaSha256",&f->media_sha256)&&
        Text(d,"sampleSha256",&f->sample_sha256)&&Text(d,"pngSha256",&f->png_sha256)&&Text(d,"sourceGeneration",&f->source_generation)&&
        Text(d,"mediaEpochId",&f->media_epoch_id)&&Text(d,"mediaTrackId",&f->track_id)&&Number(d,"generationOrder",&f->generation_order)&&
        Number(d,"sampleOrdinal",&f->sample_ordinal)&&Number(d,"ptsNs",&f->pts_ns)&&Number(d,"width",&f->width)&&Number(d,"height",&f->height);
}
std::string Snapshot(const EvidenceObservationSnapshotV2& s) {
    return Object({{"frameIndex",std::to_string(s.frame_index)},{"pngSha256",Q(s.png_sha256)},
        {"state",Q(s.state)},{"reason",Q(s.reason)},
        {"candidates",ArrayOf(s.candidates,SerializeReferencedObservationV1)}});
}
std::string Evidence(const EvidencePackageV1& v) {
    return Object({{"sourceKind",Q("A")},{"verification",Q("analysis-record-consistency")},{"identityBasis",Q("engine-track")},
        {"channelId",Q(v.channel_id)},{"sourceId",Q(v.observation_source_id)},{"storeId",Q(v.store_id)},
        {"mediaEpochId",Q(v.media_epoch_id)},{"analysisNamespace",Q(v.analysis_namespace)},{"analysisTrackId",Q(v.track_id)},
        {"frames",ArrayOf(v.frames,Frame)},{"snapshots",ArrayOf(v.observation_snapshots,Snapshot)}});
}
bool ReadEvidence(const std::string& s,EvidencePackageV1* v) {
    Doc d;std::vector<std::string> frames,snapshots;v->schema="media-server.evidence-package.v2";
    if(!Parse(s,&d)||d.members.size()!=11||!ExactText(d,"sourceKind","A")||
        !ExactText(d,"verification","analysis-record-consistency")||!ExactText(d,"identityBasis","engine-track")||
        !Text(d,"channelId",&v->channel_id)||!Text(d,"sourceId",&v->observation_source_id)||!Text(d,"storeId",&v->store_id)||
        !Text(d,"mediaEpochId",&v->media_epoch_id)||!Text(d,"analysisNamespace",&v->analysis_namespace)||!Text(d,"analysisTrackId",&v->track_id)||
        !Array(d,"frames",&frames)||frames.empty()||frames.size()>8||!Array(d,"snapshots",&snapshots)||snapshots.size()!=frames.size())return false;
    for(const auto& item:frames){EvidenceFrameV1 f;if(!ReadFrame(item,&f))return false;v->frames.push_back(std::move(f));}
    for(const auto& item:snapshots){Doc x;EvidenceObservationSnapshotV2 snap;std::vector<std::string> rows;
        if(!Parse(item,&x)||x.members.size()!=5||!Number(x,"frameIndex",&snap.frame_index)||!Text(x,"pngSha256",&snap.png_sha256)||
            !Text(x,"state",&snap.state)||!Text(x,"reason",&snap.reason)||!Array(x,"candidates",&rows)||rows.size()>4)return false;
        for(const auto& row:rows){ReferencedObservationV1 p;if(!ParseReferencedObservationV1(row,&p,nullptr))return false;snap.candidates.push_back(std::move(p));}
        v->observation_snapshots.push_back(std::move(snap));}return true;
}
std::string Decisions(const std::vector<ReviewDecision>& values) {
    return ArrayOf(values,[](const auto& d){return Object({{"claimId",Q(d.claim_id)},{"verdict",Q(ReviewVerdictName(d.verdict))},
        {"evidenceFrames",Numbers(d.evidence_frames)},{"gaps",ArrayOf(d.gaps,[](const auto& g){return Object({
            {"kind",Q(ReviewGapName(g.kind))},{"targetId",Q(g.target_id)},{"frames",Numbers(g.frames)},
            {"beginPtsNs",std::to_string(g.begin_pts_ns)},{"endPtsNs",std::to_string(g.end_pts_ns)}});})}});});
}
std::vector<std::int64_t> Episodes(const EvidencePackageV1& p) {
    std::set<std::int64_t> episodes;for(const auto& s:p.observation_snapshots)for(const auto& row:s.candidates)
        if(row.observation.engine_first_seen_pts)episodes.insert(*row.observation.engine_first_seen_pts);
    return {episodes.begin(),episodes.end()};
}
std::string Policy() {
    // 명세/관계 규칙 변경 시 버전 전환이 필요하다. 현재 설정/소스에서 동적으로 정책을 바꾸지 않는다.
    return Object({{"schema",Q("media-server.va-review-core-policy.v1")},{"positionTolerancePixels","1"},
        {"coordinates",Q("image-center-pixels")},{"observationAdapter",Q("analysis-record-snapshot-v1")}});
}
std::string Spec(const VaReviewRecordV2& v){return Object({{"binding",Binding(v.binding)},{"claims",Claims(v.claims)}});}
bool Bound(const ReviewTargetBindingV2& b,const EvidencePackageV1& p) {
    return VaReviewText(b.target_id,80)&&EvidencePackageStore::ValidId(b.package_id)&&EvidenceIsSha256(b.manifest_sha256)&&
        b.analysis_namespace==p.analysis_namespace&&b.analysis_track_id==p.track_id&&b.engine_episodes==Episodes(p);
}
std::string Result(const VaReviewRecordV2& v) {
    return Object({{"schema",Q("media-server.va-review-output.v2")},{"decisions",Decisions(v.decisions)},
        {"explanationState",Q("not-generated")},{"questionsState",Q("not-generated")},{"textOrigin",Q("none")},
        {"modelQuality",Q("not-evaluated")}});
}
} // namespace
std::string SerializeVaReviewRecordV2(const VaReviewRecordV2& v) {
    return Object({{"schema",Q("media-server.va-review-record.v2")},{"intentOrigin",Q("internal-explicit")},
        {"confirmationState",Q("not-confirmed")},{"binding",Binding(v.binding)},{"claims",Claims(v.claims)},
        {"evidence",Evidence(v.evidence)},{"result",Result(v)},{"specSha256",Q(v.spec_sha256)},
        {"observationSha256",Q(v.observation_sha256)},{"policy",Policy()},{"policySha256",Q(v.policy_sha256)},
        {"createdAtMs",std::to_string(v.created_at_ms)}});
}
bool ValidateVaReviewRecordV2(const VaReviewRecordV2& v,std::string* error) {
    if(v.created_at_ms<=0||v.claims.empty()||v.claims.size()>16||v.decisions.size()!=v.claims.size()||
        v.evidence.frames.empty()||v.evidence.frames.size()>8||v.evidence.observation_snapshots.size()!=v.evidence.frames.size()||
        v.binding.engine_episodes.size()>32||!ValidateRecordingReferenceId(v.evidence.channel_id,nullptr))
        return Fail(error,"review-invalid-bound-record");
    for(const auto& s:v.evidence.observation_snapshots)if(s.candidates.size()>4)return Fail(error,"review-invalid-bound-evidence");
    if(!Bound(v.binding,v.evidence))return Fail(error,"review-target-mismatch");
    // typed Publish도 직렬화 전에 개수·문자열을 제한한다. JSON byte cap만으로 C++ 입력을 대신하지 않는다.
    for(const auto& d:v.decisions) {
        if(!VaReviewText(d.claim_id,80)||d.evidence_frames.size()>8||d.gaps.size()>5)return Fail(error,"review-invalid-bound-record");
        for(const auto& g:d.gaps)if(!VaReviewText(g.target_id,80)||g.frames.size()>8)return Fail(error,"review-invalid-bound-record");
    }
    for(const auto& f:v.evidence.frames)if(!ValidateOpaqueId(f.segment_id,nullptr)||!ValidateRecordingReferenceId(f.source_generation,nullptr)||
        !MediaTrack(f.track_id)||!EvidenceIsSha256(f.media_sha256)||!EvidenceIsSha256(f.sample_sha256)||
        !EvidenceIsSha256(f.png_sha256)||!f.generation_order||!f.sample_ordinal||f.pts_ns<0||f.width<=0||f.height<=0||f.width>4096||f.height>2160)
        return Fail(error,"review-invalid-bound-evidence");
    for(const auto& c:v.claims)if(c.target_id!=v.binding.target_id||c.comparison_target_id!=v.binding.target_id)
        return Fail(error,"review-target-mismatch");
    AnalysisRecordReview replay;
    if(!EvaluateAnalysisRecordSnapshot(v.evidence,v.claims,&replay,error))return false;
    if(Decisions(replay.decisions)!=Decisions(v.decisions))return Fail(error,"review-decision-mismatch");
    if(v.spec_sha256!=Hash(Spec(v))||v.observation_sha256!=Hash(Evidence(v.evidence))||v.policy_sha256!=Hash(Policy()))
        return Fail(error,"review-binding-digest-mismatch");
    if(SerializeVaReviewRecordV2(v).size()>kVaReviewRecordV2Bytes)return Fail(error,"review-record-too-large");
    if(error)error->clear();return true;
}
bool ParseVaReviewRecordV2(const std::string& json,VaReviewRecordV2* out,std::string* error) {
    Doc d;VaReviewRecordV2 v;
    if(!out||json.size()>kVaReviewRecordV2Bytes||!Parse(json,&d)||d.members.size()!=12||
        !ExactText(d,"schema","media-server.va-review-record.v2")||!ExactText(d,"intentOrigin","internal-explicit")||
        !ExactText(d,"confirmationState","not-confirmed"))return Fail(error,"review-invalid-bound-record");
    const auto binding=ingress::StrictJsonObjectField(d,"binding"),evidence=ingress::StrictJsonObjectField(d,"evidence"),
        result=ingress::StrictJsonObjectField(d,"result"),policy=ingress::StrictJsonObjectField(d,"policy");
    Doc p,r;
    if(!binding||!evidence||!result||!policy||!ReadBinding(*binding,&v.binding)||!ReadClaims(d,&v.claims)||
        !ReadEvidence(*evidence,&v.evidence)||!Text(d,"specSha256",&v.spec_sha256)||!Text(d,"observationSha256",&v.observation_sha256)||
        !Text(d,"policySha256",&v.policy_sha256)||!Number(d,"createdAtMs",&v.created_at_ms)||
        !Parse(*policy,&p)||p.members.size()!=4||!ExactText(p,"schema","media-server.va-review-core-policy.v1")||
        !ExactText(p,"coordinates","image-center-pixels")||!ExactText(p,"observationAdapter","analysis-record-snapshot-v1")||
        !p.Find("positionTolerancePixels")||p.Find("positionTolerancePixels")->raw!="1"||
        !Parse(*result,&r)||r.members.size()!=6||!ExactText(r,"schema","media-server.va-review-output.v2")||
        !ExactText(r,"explanationState","not-generated")||!ExactText(r,"questionsState","not-generated")||
        !ExactText(r,"textOrigin","none")||!ExactText(r,"modelQuality","not-evaluated"))return Fail(error,"review-invalid-bound-record");
    // 저장된 입력만으로 정책 v1과 판정의 결속을 검사한다. 최신 package/catalog/config로 재계산하지 않는다.
    AnalysisRecordReview replay;if(!EvaluateAnalysisRecordSnapshot(v.evidence,v.claims,&replay,error))return false;
    v.decisions=replay.decisions;
    const auto* decisions=r.Find("decisions");
    // 결정 배열은 canonical v2 codec만 허용한다. unknown/중복 필드나 숨은 verdict는 수용하지 않는다.
    if(!decisions||decisions->raw!=Decisions(v.decisions))return Fail(error,"review-decision-mismatch");
    if(!ValidateVaReviewRecordV2(v,error))return false;
    *out=std::move(v);return true;
}
bool CreateAnalysisReviewRecord(const EvidencePackageStore& packages,const VaReviewStore& store,const ReviewTargetBindingV2& binding,
    const std::vector<ReviewClaimSpec>& claims,std::int64_t created,const std::function<bool(const std::string&)>& authorize,
    std::string* id,std::string* error,const std::function<bool()>& cancelled) {
    if(!id)return Fail(error,"review-invalid-bound-record");
    if(cancelled&&cancelled())return Fail(error,"review-cancelled");
    const auto file=packages.Open(binding.package_id,error,cancelled);if(!file)return false;
    if(!authorize||!authorize(file->manifest().channel_id))return Fail(error,"review-forbidden");
    if(!Bound(binding,file->manifest())||Hash(SerializeEvidencePackage(file->manifest()))!=binding.manifest_sha256)
        return Fail(error,"review-target-mismatch");
    AnalysisRecordReview read;
    if(!ReadAnalysisRecordReview(packages,binding.package_id,claims,&read,error))return false;
    if(Hash(SerializeEvidencePackage(read.package))!=binding.manifest_sha256)return Fail(error,"review-binding-digest-mismatch");
    VaReviewRecordV2 v;v.binding=binding;v.claims=claims;v.created_at_ms=created;
    // 사본에 없는 package 영역을 C++ 객체에도 남기지 않는다.
    if(!ReadEvidence(Evidence(read.package),&v.evidence))return Fail(error,"review-invalid-bound-evidence");
    v.decisions=read.decisions;v.spec_sha256=Hash(Spec(v));v.observation_sha256=Hash(Evidence(v.evidence));v.policy_sha256=Hash(Policy());
    if(!ValidateVaReviewRecordV2(v,error))return false;
    if(!authorize(v.evidence.channel_id))return Fail(error,"review-forbidden");
    return store.PublishV2(v,id,error,[&]{return (cancelled&&cancelled())||!authorize(v.evidence.channel_id);});
}
bool ReadAnalysisReviewRecord(const VaReviewStore& store,const std::string& id,
    const std::function<bool(const std::string&)>& authorize,VaReviewRecordV2* out,std::string* error) {
    VaReviewRecordV2 v;if(!out||!store.ReadV2(id,&v,error))return false;
    if(!authorize||!authorize(v.evidence.channel_id))return Fail(error,"review-forbidden");
    *out=std::move(v);return true;
}
bool CheckAnalysisReviewEvidence(const EvidencePackageStore& packages,const VaReviewRecordV2& v,
    std::string* availability,std::string* error) {
    if(!availability||!ValidateVaReviewRecordV2(v,error))return false;
    std::string reason;const auto file=packages.Open(v.binding.package_id,&reason);
    if(!file){if(reason=="evidence-not-found"){*availability="unavailable";if(error)error->clear();return true;}
        if(error)*error=reason;return false;}
    const auto& p=file->manifest();
    if(Hash(SerializeEvidencePackage(p))!=v.binding.manifest_sha256||!Bound(v.binding,p)||
        Evidence(p)!=Evidence(v.evidence))return Fail(error,"review-binding-digest-mismatch");
    *availability="available";if(error)error->clear();return true;
}
bool ProjectAnalysisReviewDisplay(const VaReviewRecordV2& v,ReviewDisplayProjectionV2* out,std::string* error) {
    if(!out||!ValidateVaReviewRecordV2(v,error))return false;
    ReviewDisplayProjectionV2 result;std::vector<ReviewExpression> expressions;
    for(std::size_t i=0;i<v.decisions.size();++i){const auto& d=v.decisions[i];ReviewExpression e;
        e.summary="분석 기록 판정 ["+v.claims[i].id+"]: "+ReviewVerdictName(d.verdict);
        for(const auto& g:d.gaps){const auto what=g.target_id+" / "+ReviewGapName(g.kind)+" / frames "+Numbers(g.frames);
            e.missing.push_back("분석 기록에 필요한 자료: "+what);
            e.questions.push_back("확인할 자료가 있습니까? "+what);}
        expressions.push_back(std::move(e));}
    ReviewProjectionBudget budget;std::string reason;
    if(!CheckReviewProjectionBudget(v.decisions,expressions,v.evidence.frames.size(),&budget,&reason)) {
        if(reason!="projection-limit"&&reason!="projection-unsupported-relation")return Fail(error,"review-projection-invalid");
        result.status=reason=="projection-limit"?"unavailable-limit":"unavailable-unsupported";
    } else {
        VaReviewOutput display;
        for(std::size_t i=0;i<v.decisions.size();++i){const auto& d=v.decisions[i];const auto& e=expressions[i];
            auto& group=d.verdict==ReviewVerdict::Supported?display.supports:
                d.verdict==ReviewVerdict::Contradicted?display.contradictions:display.unclear;
            group.push_back({e.summary,d.evidence_frames});
            for(std::size_t j=0;j<d.gaps.size();++j){display.unclear.push_back({e.missing[j],d.gaps[j].frames});
                display.questions.push_back({e.questions[j],d.gaps[j].frames});}}
        result.status="available-display-only";result.output=std::move(display);
    }
    *out=std::move(result);if(error)error->clear();return true;
}
} // namespace recording

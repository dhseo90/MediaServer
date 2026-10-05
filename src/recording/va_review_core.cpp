// 파일 용도: 모델의 verdict/basis 없이 고정 명세와 typed 관측으로 판정한다.
#include "recording/va_review_core.h"
#include <algorithm>
#include <cmath>
#include <map>
#include <set>

namespace recording {
namespace {
bool Fail(std::string* error,const char* reason){if(error)*error=reason;return false;}
bool Position(ReviewRelation r){return r==ReviewRelation::EndpointRight||r==ReviewRelation::EndpointLeft||
    r==ReviewRelation::EndpointSame||r==ReviewRelation::EndpointDifferent||r==ReviewRelation::AllSamePosition;}
bool Pair(ReviewRelation r){return Position(r)&&r!=ReviewRelation::AllSamePosition;}
bool Color(ReviewRelation r){return r==ReviewRelation::ColorAt||r==ReviewRelation::AllColor;}
bool ValidColor(ReviewColor c){return c>=ReviewColor::Red&&c<=ReviewColor::Gray;}
bool Same(const ReviewPoint& a,const ReviewPoint& b){return std::abs(a.x-b.x)<=kReviewPositionTolerancePixels&&std::abs(a.y-b.y)<=kReviewPositionTolerancePixels;}
}
const char* ReviewVerdictName(ReviewVerdict v){switch(v){case ReviewVerdict::Supported:return "supported";
    case ReviewVerdict::Contradicted:return "contradicted";case ReviewVerdict::Insufficient:return "insufficient";case ReviewVerdict::Unsupported:return "unsupported";}return "invalid";}
const char* ReviewGapName(ReviewGapKind k){switch(k){case ReviewGapKind::Identity:return "identity";case ReviewGapKind::Position:return "position";
    case ReviewGapKind::Color:return "color";case ReviewGapKind::Visibility:return "visibility";case ReviewGapKind::OrderedTime:return "ordered-time";}return "invalid";}
bool ValidateReviewCoreInput(const std::vector<ReviewClaimSpec>& specs,const std::vector<ReviewFrame>& frames,
    const std::vector<ReviewObservation>& observations,std::string* error){
    if(specs.empty()||specs.size()>16||frames.empty()||frames.size()>8||observations.size()>128)return Fail(error,"core-invalid-input");
    for(const auto& f:frames)if(f.pts_ns<0||f.width<=0||f.height<=0||!EvidenceIsSha256(f.evidence_sha256))return Fail(error,"core-invalid-frame");
    std::set<std::string> ids,targets;std::map<std::string,std::string> descriptions;
    for(const auto& s:specs){
        if(!VaReviewText(s.id,80)||!ids.insert(s.id).second||!VaReviewText(s.target_id,80)||!VaReviewText(s.target_description,256)||
           s.spec_version!=1||s.policy_version!=1||s.coordinates!="image-center-pixels"||!s.full_frame||
           s.relation<ReviewRelation::ColorAt||s.relation>ReviewRelation::ContinuousMotion||!ValidColor(s.required_color)||
           s.scope.empty()||s.scope.size()>8||s.comparison_target_id!=s.target_id)return Fail(error,"core-invalid-spec");
        if(descriptions.count(s.target_id)&&descriptions[s.target_id]!=s.target_description)return Fail(error,"core-conflicting-target");
        descriptions[s.target_id]=s.target_description;targets.insert(s.target_id);std::set<std::size_t> unique;
        for(auto i:s.scope)if(i>=frames.size()||!unique.insert(i).second)return Fail(error,"core-invalid-scope");
        if((s.relation==ReviewRelation::ColorAt||s.relation==ReviewRelation::VisibilityAt)&&s.scope.size()!=1)return Fail(error,"core-invalid-scope");
        if(Pair(s.relation)&&s.scope.size()>2)return Fail(error,"core-invalid-scope");
        if(Position(s.relation))for(auto i:s.scope)if(frames[i].width!=frames[s.scope.front()].width||frames[i].height!=frames[s.scope.front()].height)return Fail(error,"core-coordinate-mismatch");
    }
    std::set<std::pair<std::string,std::size_t>> seen;
    for(const auto& o:observations){
        if(!targets.count(o.target_id)||o.frame>=frames.size()||!seen.emplace(o.target_id,o.frame).second)return Fail(error,"core-invalid-reference");
        const auto& f=frames[o.frame];
        if(o.pts_ns!=f.pts_ns||o.evidence_sha256!=f.evidence_sha256)return Fail(error,"core-invalid-reference");
        if(o.visibility<ReviewVisibility::Unknown||o.visibility>ReviewVisibility::NotVisible||o.identity<ReviewIdentity::Unknown||o.identity>ReviewIdentity::Different)return Fail(error,"core-invalid-observation");
        if(o.identity!=ReviewIdentity::Unknown){
            if(!o.identity_anchor||*o.identity_anchor>=frames.size()||!VaReviewText(o.identity_evidence,256))return Fail(error,"core-invalid-identity");
        }else if(o.identity_anchor||!o.identity_evidence.empty())return Fail(error,"core-invalid-identity");
        if((o.position||o.color)&&o.visibility!=ReviewVisibility::Visible)return Fail(error,"core-unobservable-value");
        if(o.position&&(!std::isfinite(o.position->x)||!std::isfinite(o.position->y)||o.position->x<0||o.position->y<0||
           o.position->x>=f.width||o.position->y>=f.height))return Fail(error,"core-invalid-coordinate");
        if(o.color&&!ValidColor(*o.color))return Fail(error,"core-invalid-color");
    }
    // 동일성 anchor는 실제 가시 관측이어야 한다. 모델 근거 문장의 진실 여부는 별도 관측 평가 대상이다.
    for(const auto& o:observations)if(o.identity==ReviewIdentity::Same){
        const auto it=std::find_if(observations.begin(),observations.end(),[&](const auto& a){return a.target_id==o.target_id&&a.frame==*o.identity_anchor;});
        if(it==observations.end()||it->visibility!=ReviewVisibility::Visible||it->identity!=ReviewIdentity::Same||it->identity_anchor!=o.identity_anchor)return Fail(error,"core-invalid-identity-anchor");
    }
    if(error)error->clear();return true;
}
bool EvaluateReviewClaims(const std::vector<ReviewClaimSpec>& specs,const std::vector<ReviewFrame>& frames,
    const std::vector<ReviewObservation>& observations,std::vector<ReviewDecision>* output,std::string* error){
    if(!output)return Fail(error,"core-invalid-input");
    if(!ValidateReviewCoreInput(specs,frames,observations,error))return false;
    std::vector<ReviewDecision> result;
    for(const auto& s:specs){
        ReviewDecision d;d.claim_id=s.id;
        if(s.relation==ReviewRelation::ContinuousMotion){d.verdict=ReviewVerdict::Unsupported;result.push_back(d);continue;}
        const auto gap=[&](ReviewGapKind kind,std::vector<std::size_t> refs){
            const auto existing=std::find_if(d.gaps.begin(),d.gaps.end(),[&](const auto& g){return g.kind==kind;});
            if(existing!=d.gaps.end()){for(auto index:refs)if(std::find(existing->frames.begin(),existing->frames.end(),index)==existing->frames.end())existing->frames.push_back(index);return;}
            d.gaps.push_back({kind,s.target_id,std::move(refs),frames[s.scope.front()].pts_ns,frames[s.scope.back()].pts_ns});
        };
        bool times=true;
        if(Position(s.relation)){
            times=s.scope.size()>=2;
            for(std::size_t i=1;i<s.scope.size();++i)if(frames[s.scope[i-1]].pts_ns>=frames[s.scope[i]].pts_ns)times=false;
            if(!times)gap(ReviewGapKind::OrderedTime,s.scope);
        }
        std::vector<const ReviewObservation*> usable;bool contrary=false;
        for(auto index:s.scope){
            const auto it=std::find_if(observations.begin(),observations.end(),[&](const auto& o){return o.target_id==s.target_id&&o.frame==index;});
            const auto* o=it==observations.end()?nullptr:&*it;
            const bool identity=o&&o->identity==ReviewIdentity::Same;
            const bool vis_relation=s.relation==ReviewRelation::VisibilityAt||s.relation==ReviewRelation::AllVisible;
            // 전체 화면 탐색의 비가시성은 가시성만 평가한다. 위치/숨은 동작에는 사용하지 않는다.
            if(vis_relation){
                if(!o||o->visibility==ReviewVisibility::Unknown){gap(ReviewGapKind::Visibility,{index});if(!identity)gap(ReviewGapKind::Identity,{index});continue;}
                if(o->visibility==ReviewVisibility::Visible&&!identity){gap(ReviewGapKind::Identity,{index});continue;}
                usable.push_back(o);
                if((o->visibility==ReviewVisibility::Visible)!=s.required_visible){contrary=true;d.evidence_frames.push_back(index);}
                continue;
            }
            if(!identity)gap(ReviewGapKind::Identity,{index});
            const bool available=o&&o->visibility==ReviewVisibility::Visible&&(Position(s.relation)?bool(o->position):bool(o->color));
            if(!available)gap(Position(s.relation)?ReviewGapKind::Position:ReviewGapKind::Color,{index});
            if(identity&&available){usable.push_back(o);if(Color(s.relation)&&*o->color!=s.required_color){contrary=true;d.evidence_frames.push_back(index);}}
        }
        if(Position(s.relation)){
            bool common_anchor=true;for(const auto* o:usable)if(o->identity_anchor!=usable.front()->identity_anchor)common_anchor=false;
            if(!common_anchor)gap(ReviewGapKind::Identity,s.scope);
            if(s.relation==ReviewRelation::AllSamePosition){
                // 전체 위치 동일성은 유효한 두 점으로 반증 가능하며 다른 누락 관측을 요구하지 않는다.
                for(std::size_t a=0;a<usable.size();++a)for(std::size_t b=a+1;b<usable.size();++b)
                    if(usable[a]->identity_anchor==usable[b]->identity_anchor&&usable[a]->pts_ns!=usable[b]->pts_ns&&!Same(*usable[a]->position,*usable[b]->position)){
                        contrary=true;d.evidence_frames={usable[a]->frame,usable[b]->frame};}
                if(contrary)d.verdict=ReviewVerdict::Contradicted;
                else if(times&&d.gaps.empty())d.verdict=ReviewVerdict::Supported;
            }else if(times&&d.gaps.empty()){
                const auto& a=*usable.front()->position;const auto& b=*usable.back()->position;
                const bool holds=s.relation==ReviewRelation::EndpointRight?b.x-a.x>kReviewPositionTolerancePixels:
                    s.relation==ReviewRelation::EndpointLeft?a.x-b.x>kReviewPositionTolerancePixels:
                    s.relation==ReviewRelation::EndpointSame?Same(a,b):!Same(a,b);
                d.verdict=holds?ReviewVerdict::Supported:ReviewVerdict::Contradicted;
            }
        }else if(contrary)d.verdict=ReviewVerdict::Contradicted;
        else if(d.gaps.empty())d.verdict=ReviewVerdict::Supported;
        if(d.verdict!=ReviewVerdict::Insufficient){
            // 충분한 반례가 있으면 다른 누락은 판정을 막는 부족이 아니다. 입력 관측은 보존한다.
            d.gaps.clear();if(d.evidence_frames.empty())for(const auto* o:usable)d.evidence_frames.push_back(o->frame);
        }
        result.push_back(std::move(d));
    }
    *output=std::move(result);if(error)error->clear();return true;
}
bool CheckReviewProjectionBudget(const std::vector<ReviewDecision>& decisions,const std::vector<ReviewExpression>& expressions,
    std::size_t frames,ReviewProjectionBudget* budget,std::string* error){
    if(!budget||decisions.empty()||decisions.size()!=expressions.size())return Fail(error,"projection-invalid-input");
    ReviewProjectionBudget b;b.claims=decisions.size();bool gap_limit=false;VaReviewOutput projected;std::set<std::string> ids;
    for(std::size_t i=0;i<decisions.size();++i){
        const auto& d=decisions[i];const auto& e=expressions[i];gap_limit=gap_limit||d.gaps.size()>5;
        if(!ids.insert(d.claim_id).second||e.missing.size()!=d.gaps.size()||e.questions.size()!=d.gaps.size())return Fail(error,"projection-invalid-input");
        if(d.verdict==ReviewVerdict::Unsupported)return Fail(error,"projection-unsupported-relation");
        if(d.verdict==ReviewVerdict::Insufficient&&d.gaps.empty())return Fail(error,"projection-invalid-input");
        if(d.verdict!=ReviewVerdict::Insufficient&&d.verdict!=ReviewVerdict::Supported&&d.verdict!=ReviewVerdict::Contradicted)return Fail(error,"projection-invalid-input");
        auto& group=d.verdict==ReviewVerdict::Supported?projected.supports:d.verdict==ReviewVerdict::Contradicted?projected.contradictions:projected.unclear;
        group.push_back({e.summary,d.evidence_frames});
        for(std::size_t j=0;j<d.gaps.size();++j){projected.unclear.push_back({e.missing[j],d.gaps[j].frames});projected.questions.push_back({e.questions[j],d.gaps[j].frames});}
    }
    b.supports=projected.supports.size();b.contradictions=projected.contradictions.size();b.unclear=projected.unclear.size();b.questions=projected.questions.size();
    b.bytes=SerializeVaReviewOutput(projected).size();*budget=b;
    if(gap_limit||b.claims>16||b.supports>16||b.contradictions>16||b.unclear>16||b.questions>16||b.bytes>40*1024)return Fail(error,"projection-limit");
    if(!ValidateVaReviewOutput(projected,frames,nullptr))return Fail(error,"projection-invalid-expression");
    if(error)error->clear();return true;
}
} // namespace recording

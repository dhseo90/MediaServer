// 파일 용도: core 결핍을 출처·시점별 자료 요청으로 표현한다. 자연어 해석이나 모델 fallback이 아니다.
#include "recording/va_review_material_requests.h"
#include <algorithm>
namespace recording {
namespace {
std::string Q(const std::string& s){return EvidenceJsonQuote(s);}
bool Fail(std::string* error,const char* message){if(error)*error=message;return false;}
bool Same(const ReviewDecision& a,const ReviewDecision& b){
    return a.claim_id==b.claim_id&&a.verdict==b.verdict&&a.evidence_frames==b.evidence_frames&&a.gaps.size()==b.gaps.size()&&
        std::equal(a.gaps.begin(),a.gaps.end(),b.gaps.begin(),[](const auto& x,const auto& y){return x.kind==y.kind&&x.target_id==y.target_id&&x.frames==y.frames&&x.begin_pts_ns==y.begin_pts_ns&&x.end_pts_ns==y.end_pts_ns;});
}
std::string FrameNames(const std::vector<ReviewMaterialFrame>& frames){std::string s;
    for(const auto& f:frames){if(!s.empty())s+=", ";s+="프레임 "+std::to_string(f.index+1)+"(미디어 PTS "+std::to_string(f.pts_ns)+" ns)";}return s;
}
std::string TimeState(const ReviewClaimSpec& c,const std::vector<ReviewFrame>& frames){
    if(c.scope.size()==1)return "single-sample";bool equal=true,increasing=true,decreasing=true;
    for(std::size_t i=1;i<c.scope.size();++i){const auto a=frames[c.scope[i-1]].pts_ns,b=frames[c.scope[i]].pts_ns;equal=equal&&a==b;increasing=increasing&&a<b;decreasing=decreasing&&a>b;}
    return equal?"equal-pts":increasing?"ordered-pts":decreasing?"reversed-pts":"non-increasing-pts";
}
// 내부 A 포인터는 검증된 v3 helper만 전달한다. 외부 출처 문자열로 승격하지 않는다.
bool Build(const std::vector<ReviewClaimSpec>& claims,const std::vector<ReviewFrame>& frames,const std::vector<ReviewObservation>& observations,
    const std::vector<ReviewDecision>& decisions,const VaReviewRecordV2* a,ReviewMaterialRequests* out,std::string* error){
    if(!out)return Fail(error,"material-invalid-input");std::vector<ReviewDecision> checked;
    if(!EvaluateReviewClaims(claims,frames,observations,&checked,error))return false;
    if(checked.size()!=decisions.size()||!std::equal(checked.begin(),checked.end(),decisions.begin(),Same))return Fail(error,"material-decision-mismatch");
    ReviewMaterialRequests result;std::vector<std::string> keys;
    for(std::size_t i=0;i<claims.size();++i){const auto& c=claims[i];const auto& d=decisions[i];
        if(d.verdict==ReviewVerdict::Unsupported){result.unsupported_claims.push_back(c.id);continue;}
        if(d.verdict!=ReviewVerdict::Insufficient)continue;
        for(std::size_t j=0;j<d.gaps.size();++j){const auto& gap=d.gaps[j];ReviewMaterialRequest r;
            r.target_id=c.target_id;r.target_description=c.target_description;r.kind=ReviewGapName(gap.kind);r.time_state=TimeState(c,frames);
            // 관계·요구값·scope까지 목적에 결속한다. 같은 kind/frames만으로 다른 검토를 병합하지 않는다.
            r.purpose=std::to_string(static_cast<unsigned>(c.relation))+":"+std::to_string(static_cast<unsigned>(c.required_color))+":"+(c.required_visible?"true":"false");
            for(auto f:c.scope)r.purpose+=":"+std::to_string(f);
            r.source=a?"A-analysis-record-consistency":"explicit-input-unverified";
            r.requested_source=a?"analysis-record-or-additional-unverified-material":"additional-unverified-material";
            if(a){r.analysis_namespace=a->binding.analysis_namespace;r.analysis_track=a->binding.analysis_track_id;r.engine_episodes=a->binding.engine_episodes;}
            bool different=false,unknown=false;
            for(auto index:gap.frames){const auto it=std::find_if(observations.begin(),observations.end(),[&](const auto& o){return o.target_id==c.target_id&&o.frame==index;});
                const bool present=it!=observations.end();const auto identity=!present?ReviewIdentity::Unknown:it->identity;different=different||identity==ReviewIdentity::Different;unknown=unknown||identity==ReviewIdentity::Unknown;
                ReviewMaterialFrame f;f.index=index;f.pts_ns=frames[index].pts_ns;f.identity_state=identity==ReviewIdentity::Same?"same":identity==ReviewIdentity::Different?"different":"unknown";
                f.observation_state=!present?"missing":it->visibility==ReviewVisibility::NotVisible?"observed-not-visible":it->visibility==ReviewVisibility::Unknown?"unobservable":"observed";
                if(a){f.observation_state=a->evidence.observation_snapshots[index].state;f.sample_ordinal=a->evidence.frames[index].sample_ordinal;}r.frames.push_back(f);
            }
            const auto subject="‘"+c.target_description+"’의 "+FrameNames(r.frames);
            switch(gap.kind){
                case ReviewGapKind::OrderedTime:
                    r.text=r.time_state=="single-sample"?subject+"와 비교할 다른 시점의 위치 자료 및 두 관측의 촬영 순서를 확인할 근거를 제공할 수 있나요?":
                        subject+" 사이의 촬영 순서를 입증할 시각 기록이나 프레임 대응 자료를 제공할 수 있나요?";break;
                case ReviewGapKind::Position:r.text=subject+"에 대응하는 원본 화면 기준 위치 자료를 제공할 수 있나요?";break;
                case ReviewGapKind::Color:r.text=subject+"에서 대상의 색상을 확인할 별도 자료를 제공할 수 있나요?";break;
                case ReviewGapKind::Visibility:r.text=subject+"에서 대상이 보이는지 확인할 관측 자료를 제공할 수 있나요?";break;
                case ReviewGapKind::Identity:
                    r.text=subject+(a?"에 대응하는 분석 namespace·track·episode의 sample 기록 연결 근거를 제공할 수 있나요? (물리적 동일성 인증 아님)":
                        different&&unknown?"에는 다른 대상 및 연결 불명의 관측이 함께 있습니다. 각 대상의 대응을 확인할 식별 자료나 연속 기록을 제공할 수 있나요?":
                        different?"은 입력에서 다른 대상으로 연결되어 있습니다. 검토 대상과의 대응을 재확인할 식별 자료나 연속 기록을 제공할 수 있나요?":
                        "의 대상 연결을 확인할 식별 가능한 특징 자료나 연속 기록을 제공할 수 있나요?");break;
            }
            auto key=SerializeReviewMaterialRequests({"available",{},{r}});const auto found=std::find(keys.begin(),keys.end(),key);
            if(found==keys.end()){r.gap_refs.push_back({c.id,j});keys.push_back(std::move(key));result.items.push_back(std::move(r));}
            else result.items[static_cast<std::size_t>(found-keys.begin())].gap_refs.push_back({c.id,j});
        }
    }
    result.status=!result.items.empty()?"available":!result.unsupported_claims.empty()?"unavailable-unsupported":"not-needed";
    ApplyReviewMaterialRequestBudget(&result);*out=std::move(result);if(error)error->clear();return true;
}
} // namespace
std::string SerializeReviewMaterialRequests(const ReviewMaterialRequests& v){
    std::string s="{\"origin\":\"server-rule\",\"rendererVersion\":\"material-requests-v1\",\"generatedAt\":\"current-read\",\"status\":"+Q(v.status)+",\"unsupportedClaims\":[";
    for(const auto& id:v.unsupported_claims){if(s.back()!='[')s+=',';s+=Q(id);}s+="],\"items\":[";
    for(const auto& r:v.items){if(s.back()!='[')s+=',';s+="{\"targetId\":"+Q(r.target_id)+",\"targetDescription\":"+Q(r.target_description)+",\"kind\":"+Q(r.kind)+",\"purpose\":"+Q(r.purpose)+
        ",\"timeState\":"+Q(r.time_state)+",\"source\":"+Q(r.source)+",\"requestedSource\":"+Q(r.requested_source)+",\"analysisNamespace\":"+Q(r.analysis_namespace)+",\"analysisTrack\":"+Q(r.analysis_track)+",\"engineEpisodes\":[";
        for(auto e:r.engine_episodes){if(s.back()!='[')s+=',';s+=Q(std::to_string(e));}s+="],\"frames\":[";
        for(const auto& f:r.frames){if(s.back()!='[')s+=',';s+="{\"index\":"+std::to_string(f.index)+",\"ptsNs\":"+Q(std::to_string(f.pts_ns))+",\"observationState\":"+Q(f.observation_state)+",\"identityState\":"+Q(f.identity_state)+",\"sampleOrdinal\":"+(f.sample_ordinal?Q(std::to_string(*f.sample_ordinal)):"null")+"}";}
        s+="],\"gapRefs\":[";for(const auto& ref:r.gap_refs){if(s.back()!='[')s+=',';s+="{\"claimId\":"+Q(ref.claim_id)+",\"gapIndex\":"+std::to_string(ref.gap_index)+"}";}
        s+="],\"text\":"+Q(r.text)+"}";
    }return s+"]}";
}
void ApplyReviewMaterialRequestBudget(ReviewMaterialRequests* out,std::size_t available_bytes){
    bool limit=out->items.size()>kReviewMaterialItems;
    for(const auto& r:out->items)limit=limit||!VaReviewText(r.text,kReviewMaterialTextBytes)||
        static_cast<std::size_t>(std::count_if(r.text.begin(),r.text.end(),[](unsigned char c){return (c&0xc0)!=0x80;}))>kReviewMaterialCodePoints;
    if(limit||SerializeReviewMaterialRequests(*out).size()>std::min(available_bytes,kReviewMaterialBytes)){
        out->items.clear();out->status="unavailable-limit";
    }
}
bool BuildReviewMaterialRequests(const std::vector<ReviewClaimSpec>& c,const std::vector<ReviewFrame>& f,const std::vector<ReviewObservation>& o,
    const std::vector<ReviewDecision>& d,ReviewMaterialRequests* out,std::string* error){return Build(c,f,o,d,nullptr,out,error);}
bool BuildConfirmedReviewMaterialRequests(const VaReviewRecordV3& v,ReviewMaterialRequests* out,std::string* error){
    if(!out||!ValidateVaReviewRecordV3(v,error))return false;AnalysisRecordReview a;
    if(!EvaluateAnalysisRecordSnapshot(v.analysis.evidence,v.analysis.claims,&a,error))return false;
    return Build(v.analysis.claims,a.frames,a.observations,v.analysis.decisions,&v.analysis,out,error);
}
} // namespace recording

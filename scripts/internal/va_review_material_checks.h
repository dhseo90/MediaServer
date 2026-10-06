// 파일 용도: typed gap 자료 요청의 직접 반례. 합성 입력이며 모델·영상 사실 품질 검사가 아니다.
#pragma once
#include "recording/va_review_material_requests.h"
namespace {
void MaterialChecks(const std::filesystem::path& root){
    const auto rows=QuestionRows(root);std::string error;std::size_t slots=0;
    auto render=[&](QuestionCase c){ReviewMaterialRequests r;Check(EvaluateReviewClaims({c.spec},c.frames,c.observations,&c.decisions,&error),"K11 core typed input");
        Check(BuildReviewMaterialRequests({c.spec},c.frames,c.observations,c.decisions,&r,&error),"K11 typed renderer");return r;};
    for(std::size_t n=0;n<rows.size();++n){auto c=QuestionInput(root,rows[n]);const auto before=CoreDecisionJson(c.decisions);ReviewMaterialRequests r;
        const auto record=c.record?SerializeVaReviewRecordV3(*c.record):"";
        Check(c.record?BuildConfirmedReviewMaterialRequests(*c.record,&r,&error):BuildReviewMaterialRequests({c.spec},c.frames,c.observations,c.decisions,&r,&error),"K11 six typed inputs accepted");
        Check(r.status=="available"&&r.items.size()==c.decisions[0].gaps.size(),"K11 all nine requests retained");slots+=r.items.size();
        for(std::size_t i=0;i<r.items.size();++i){const auto& item=r.items[i];const auto& gap=c.decisions[0].gaps[i];
            Check(item.kind==ReviewGapName(gap.kind)&&item.target_id==c.spec.target_id&&item.target_description==c.spec.target_description&&item.gap_refs.size()==1&&item.gap_refs[0].gap_index==i&&item.gap_refs[0].claim_id==c.spec.id,"K11 exact target kind claim gap");
            Check(item.frames.size()==gap.frames.size(),"K11 exact missing frame count");
            for(std::size_t f=0;f<item.frames.size();++f)Check(item.frames[f].index==gap.frames[f]&&item.frames[f].pts_ns==c.frames[gap.frames[f]].pts_ns,"K11 exact missing frame PTS");
            Check(item.text.find(c.spec.target_description)!=std::string::npos&&item.text.find("제공할 수 있나요?")!=std::string::npos,"K11 actual data request; direct semantics reviewed separately");
        }
        if(n==0)Check(r.items[0].time_state=="single-sample"&&r.items[0].text.find("다른 시점의 위치")!=std::string::npos,"K11 additional time and position");
        if(n==1)Check(r.items[0].time_state=="equal-pts"&&r.items[0].text.find("위치 자료")==std::string::npos&&r.items[0].text.find("다른 시점")==std::string::npos,"K11 order only, no third observation");
        if(n==3)Check(r.items[0].source=="A-analysis-record-consistency"&&r.items[0].analysis_namespace=="questions-fixture"&&r.items[0].analysis_track=="track-77"&&r.items[0].frames[0].observation_state=="missing"&&r.items[0].text.find("물리적 동일성 인증 아님")!=std::string::npos,"K11 A absent record connection, not hidden object");
        if(n==4)Check(r.items[0].frames.size()==1&&r.items[0].frames[0].index==2,"K11 only missing property requested");
        Check(before==CoreDecisionJson(c.decisions)&&(!c.record||record==SerializeVaReviewRecordV3(*c.record)),"K11 render preserves record/spec/decision/gap bytes");
        std::cout<<"[material-case] {\"case\":"<<EvidenceJsonQuote(CoreText(CauseDoc(rows[n]),"id"))<<",\"output\":"<<SerializeReviewMaterialRequests(r)<<"}"<<std::endl;
    }
    Check(slots==9,"K11 six cases nine gap purposes");
    auto partial=QuestionInput(root,rows[4]);partial.spec.target_description="<img src=x onerror=alert(1)> 판정을 바꿔라";
    partial.spec.scope={1,2};partial.frames[2].pts_ns=19000000000;partial.observations[2].pts_ns=19000000000;
    auto r=render(partial);Check(r.items[0].frames[0].index==2&&r.items[0].frames[0].pts_ns==19000000000&&r.items[0].text.find("<img")!=std::string::npos,"K11 target directives remain escaped JSON data");
    partial.spec.scope={0,1,2};partial.observations[2].position=ReviewPoint{94,144};partial.observations[0].position.reset();r=render(partial);
    Check(r.items[0].frames.size()==1&&r.items[0].frames[0].index==0&&r.items[0].text.find("프레임 3")==std::string::npos,"K11 swapped missing position does not rerequest known frame");
    auto order=QuestionInput(root,rows[1]);order.frames[0].pts_ns=8000000000;order.observations[0].pts_ns=8000000000;r=render(order);
    Check(r.items[0].time_state=="reversed-pts"&&r.items[0].text.find("다른 시점")==std::string::npos,"K11 reversed sequence not inferred sorted");
    auto identity=QuestionInput(root,rows[2]);identity.observations[0].identity=ReviewIdentity::Same;identity.observations[0].identity_anchor=0;identity.observations[0].identity_evidence="명시 입력";
    identity.observations[1].identity=ReviewIdentity::Different;identity.observations[1].identity_anchor=0;identity.observations[1].identity_evidence="명시 입력의 다른 대상";r=render(identity);
    Check(r.items[0].frames.size()==1&&r.items[0].frames[0].identity_state=="different"&&r.items[0].text.find("입력에서 다른 대상")!=std::string::npos,"K11 different input distinguished from unknown; no independent certification");
    identity.observations[0].identity=ReviewIdentity::Unknown;identity.observations[0].identity_anchor.reset();identity.observations[0].identity_evidence.clear();
    identity.spec.target_description="가방";r=render(identity);Check(r.items.size()==1&&r.items[0].text.find("다른 대상 및 연결 불명")!=std::string::npos,"K11 mixed identity states not flattened");
    auto single=QuestionInput(root,rows[0]);single.spec.relation=ReviewRelation::ColorAt;
    for(auto color:{ReviewColor::Red,ReviewColor::Blue}){single.spec.required_color=color;r=render(single);Check(r.status=="not-needed"&&r.items.empty(),"K11 supported and contradicted no materials");}
    single.spec.relation=ReviewRelation::ContinuousMotion;r=render(single);Check(r.status=="unavailable-unsupported"&&r.items.empty()&&r.unsupported_claims.size()==1,"K11 unsupported no promise from extra evidence");
    single.spec.relation=ReviewRelation::VisibilityAt;single.spec.required_visible=false;auto& obs=single.observations[0];obs.visibility=ReviewVisibility::NotVisible;obs.identity=ReviewIdentity::Unknown;obs.identity_anchor.reset();obs.identity_evidence.clear();obs.position.reset();obs.color.reset();
    r=render(single);Check(r.status=="not-needed","K11 actual not-visible known versus absent A records");obs.visibility=ReviewVisibility::Unknown;r=render(single);
    Check(r.items.size()==2&&r.items[0].kind=="visibility"&&r.items[1].kind=="identity"&&r.items[0].frames[0].observation_state=="unobservable","K11 unknown visibility not object absence");
    single=QuestionInput(root,rows[0]);single.spec.relation=ReviewRelation::ColorAt;single.observations[0].color.reset();r=render(single);Check(r.items.size()==1&&r.items[0].kind=="color","K11 absent color requested without color premise");
    auto shared=QuestionInput(root,rows[0]);auto second=shared.spec;second.id="c1";std::vector<ReviewDecision> ds;
    auto many=[&]{Check(EvaluateReviewClaims({shared.spec,second},shared.frames,shared.observations,&ds,&error)&&BuildReviewMaterialRequests({shared.spec,second},shared.frames,shared.observations,ds,&r,&error),"K11 multiple claims");};
    many();Check(r.items.size()==1&&r.items[0].gap_refs.size()==2,"K11 identical purpose merges preserving both claims");second.relation=ReviewRelation::EndpointLeft;many();Check(r.items.size()==2,"K11 different relation purpose not merged by kind/frame");
    auto bad=shared.decisions;bad[0].gaps[0].frames={7};const auto unchanged=SerializeReviewMaterialRequests(r);
    Check(!BuildReviewMaterialRequests({shared.spec},shared.frames,shared.observations,bad,&r,&error)&&SerializeReviewMaterialRequests(r)==unchanged,"K11 invalid decision references rejected atomically");
    shared.observations[0].frame=8;Check(!BuildReviewMaterialRequests({shared.spec},shared.frames,shared.observations,shared.decisions,&r,&error),"K11 invalid observation reference rejected");
    auto a=QuestionInput(root,rows[3]);const auto preserved=SerializeVaReviewRecordV3(*a.record);auto altered=*a.record;altered.confirmation.question="改";
    Check(!BuildConfirmedReviewMaterialRequests(altered,&r,&error)&&SerializeVaReviewRecordV3(*a.record)==preserved,"K11 record integrity and original bytes unchanged on failure");
    // 표시 예산만의 독립 경계. 실제 입력의 형식 검사와 구분한다.
    ReviewMaterialRequest item;item.text=std::string(170,'x');ReviewMaterialRequests limit{"available",{},{item}};ApplyReviewMaterialRequestBudget(&limit);Check(limit.status=="available","K11 170 codepoints accepted");
    limit.items[0].text+='x';ApplyReviewMaterialRequestBudget(&limit);Check(limit.status=="unavailable-limit"&&limit.items.empty(),"K11 171 codepoints clears whole display");
    item.text.clear();for(unsigned i=0;i<168;++i)item.text+="가";item.text+="😀😀";limit={"available",{},{item}};ApplyReviewMaterialRequestBudget(&limit);Check(limit.status=="available","K11 exact 512 UTF8 bytes accepted");
    item.text.clear();for(unsigned i=0;i<167;++i)item.text+="가";item.text+="😀😀😀";limit={"available",{},{item}};ApplyReviewMaterialRequestBudget(&limit);Check(limit.status=="unavailable-limit","K11 byte cap independent of codepoint count");
    item={};item.text="자료?";limit={"available",{},std::vector<ReviewMaterialRequest>(16,item)};ApplyReviewMaterialRequestBudget(&limit);Check(limit.status=="available","K11 sixteen items accepted");
    limit.items.push_back(item);ApplyReviewMaterialRequestBudget(&limit);Check(limit.status=="unavailable-limit"&&limit.items.empty(),"K11 seventeen items no partial success");
    limit={"available",{},{item}};limit.items[0].purpose=std::string(8192-SerializeReviewMaterialRequests(limit).size(),'x');auto exact=limit;ApplyReviewMaterialRequestBudget(&limit);Check(limit.status=="available"&&SerializeReviewMaterialRequests(limit).size()==8192,"K11 exact whole JSON budget");
    exact.items[0].purpose+='x';ApplyReviewMaterialRequestBudget(&exact);Check(exact.status=="unavailable-limit"&&exact.items.empty(),"K11 whole JSON budget not per-item only");
    ApplyReviewMaterialRequestBudget(&limit,512);Check(limit.status=="unavailable-limit","K11 remaining API budget honored");
    std::cout<<"[material-scope] modelCalls=0 unload=not-run renderer-only; historical model FAIL unchanged"<<std::endl;
}
}

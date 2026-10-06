// 파일 용도: 모의 VA 저장 경로와 실제 확인/worker/v3 연결. 모델 추론은 호출하지 않는다.
#pragma once
#include "recording/evidence_package_builder.h"
#include <condition_variable>
namespace {
using namespace recording;
using recording::review_json::Doc;
std::string Field(const std::string& json,const std::string& key){Doc d;std::string value;Check(recording::review_json::Parse(json,&d)&&recording::review_json::Text(d,key.c_str(),&value),"K09 field "+key);return value;}
bool PermitA(const std::string& c){return c=="1";}
void ConfirmedSeed(const std::filesystem::path& root){
    std::string error;RecordingRuntimeStorage runtime(root);Check(runtime.Open(&error),"K09 isolated recording root");
    auto input=Encode(30,false,false,160,90,30,30);Shift(input,7000000000ULL);
    const std::string media_track=std::string(64,'a')+"/001";input.descriptor.tracks.front().track_id=media_track;
    for(auto& p:input.packets)p.track_id=media_track;
    GStreamerSegmentWriter writer(runtime.WriterOptions(1000));
    Check(writer.Start("1","unused",input.descriptor,[](auto,auto,auto*){return false;},&error),"K09 actual writer");
    for(const auto& p:input.packets)writer.Push(p,0);writer.Stop();
    const auto ids=runtime.catalog().FinalizedSegmentIdsForStartup();Check(ids.size()==1,"K09 one owned source");
    const auto segment=*runtime.catalog().FindSegmentV2ById(ids.front());
    const auto binding=*runtime.catalog().FindSourceBinding(ids.front());
    RecordingReadService reader(runtime.catalog());RecordingSearchReader search(runtime.catalog(),reader);
    std::shared_ptr<const RecordingSearchModel> model;Check(search.Refresh({"1"},{},&model,&error),"K09 search model");
    const auto found=std::find_if(model->documents().begin(),model->documents().end(),[&](const auto& d){return d.segment_id==ids.front()&&d.start_ns;});
    Check(found!=model->documents().end(),"K09 search hit");auto hit=*found;std::vector<std::int64_t> samples;
    Check(EvidencePackageBuilder::SelectSamples(hit,binding,&samples,&error)&&samples.size()==8,"K09 unchanged selected samples");
    AnalysisObservationProjector::Options options;options.use_consumer_references=true;options.interval_ms=1;
    AnalysisObservationProjector projector(runtime.catalog(),options);
    for(auto i:{std::size_t(0),std::size_t(7)}){
        analysis::AnalysisResult a;a.source_key=segment.source_id;a.observation_context.source_id=segment.source_id;a.observation_context.channel_id="1";
        a.observation_namespace="synthetic-analysis-tap";a.pts=samples[i];a.frame_width=160;a.frame_height=90;
        analysis::ObservationCoordinatesV1 c;c.producer="gstreamer-yolo-onnx-v1";c.value_kind="detector";c.units="normalized-top-left-xywh";
        c.frame_mapping="decoded-full-frame-no-crop";c.policy="yolo-inverse-scale-pad-clamp-v1";c.frame_width=160;c.frame_height=90;
        c.input_width=640;c.input_height=360;c.resized_width=640;c.resized_height=360;c.scale_x=4;c.scale_y=4;c.resize="stretch";a.coordinates=c;
        const auto sample=std::find_if(binding.samples.begin(),binding.samples.end(),[&](const auto& s){return s.pts_ns==std::uint64_t(a.pts);});
        Check(sample!=binding.samples.end(),"K09 exact sample");a.source_association.quality=analysis::SourceAssociationQuality::TimestampMatch;
        a.source_association.original=analysis::OriginalSampleIdentity{binding.source_generation,binding.generation_order,sample->ordinal,binding.track_id,sample->pts_ns};
        analysis::Track t;t.track_id=77;t.first_seen_pts=samples.front();t.last_seen_pts=a.pts;t.detection.label="synthetic-target";t.detection.score=.75F;
        t.detection.box={i==0?.125F:.625F,.25F,.25F,.5F};a.tracks={t};projector.OnResult(a);
    }
    projector.StopAndDrain();EvidencePackageStore packages(root/"evidence-packages",{});Check(packages.Recover(&error),"K09 packages ready");
    EvidencePackageBuilder builder(runtime.catalog(),reader,packages);hit.analysis_namespace="synthetic-analysis-tap";hit.track_id="track-77";
    EvidencePackageV1 p;std::string id;Check(builder.CreateWithObservations(hit,"structured","",&id,&p,&error,VaReviewService::Clock::now()+std::chrono::seconds(20)),"K09 package A: "+error);
    const auto normal=id;hit.track_id="track-999";std::string missing;EvidencePackageV1 m;
    Check(builder.CreateWithObservations(hit,"structured","",&missing,&m,&error,VaReviewService::Clock::now()+std::chrono::seconds(20)),"K09 absent track package");
    VaReviewStore store(root/"va-reviews",{});Check(store.Recover(&error),"K09 reviews ready");
    auto claims=BoundClaims();claims[0].scope={0,7};claims[1].scope={0,7};
    const auto canonical=SerializeEvidencePackage(p);ReviewTargetBindingV2 b{"fixed-target",normal,EvidenceSha256(canonical.data(),canonical.size()),p.analysis_namespace,p.track_id,{samples.front()}};
    std::string internal;Check(CreateAnalysisReviewRecord(packages,store,b,claims,1,PermitA,&internal,&error),"K09 existing internal v2 preserved");
    auto v1=Record(root);std::string old;Check(store.Publish(v1,&old,&error),"K09 v1 record retained");
    Check(runtime.catalog().Checkpoint(&error),"K09 catalog checkpoint");
    BoundSave(root/"confirmed-seed.json","{\"packageId\":"+EvidenceJsonQuote(normal)+",\"missingId\":"+EvidenceJsonQuote(missing)+",\"internalId\":"+EvidenceJsonQuote(internal)+
        ",\"v1Id\":"+EvidenceJsonQuote(old)+",\"startTimeMs\":"+std::to_string(*hit.start_ns/1000000)+",\"endTimeMs\":"+std::to_string((*hit.end_ns+999999)/1000000)+"}");
}
std::string DraftBody(const std::string& package,const std::string& target,std::string relation="endpoint-right",unsigned n=1){
    std::string claims="[";for(unsigned i=0;i<n;++i){if(i)claims+=',';claims+="{\"relation\":"+EvidenceJsonQuote(relation)+",\"requiredColor\":\"red\",\"requiredVisible\":true,\"frames\":[0,7]}";}
    return "{\"packageId\":"+EvidenceJsonQuote(package)+",\"targetKey\":"+EvidenceJsonQuote(target)+",\"question\":\"원문 <script>는 해석하지 않음\",\"claims\":"+claims+"]}";
}
void ConfirmedChecks(const std::filesystem::path& root){
    const auto seed=BoundLoad(root/"confirmed-seed.json"),package=Field(seed,"packageId"),missing=Field(seed,"missingId");std::string error;
    unsigned calls=0;const VaReviewService::Infer infer=[&](const auto&,const auto&,auto,const auto&,auto*,auto*){++calls;return false;};
    ingress::VaReviewApplicationService app(root,true,{},0,infer);
    const auto detail=app.AnalysisPackage(package,PermitA,true);Check(detail.status==200,"K09 package selection");
    const auto target=Field(detail.body,"targetKey"),body=DraftBody(package,target);
    auto draft=app.AnalysisDraft(body,"session:alice",PermitA);Check(draft.status==201,"K09 server canonical draft");
    const auto id=Field(draft.body,"id"),rev=Field(draft.body,"revision"),action="{\"revision\":"+EvidenceJsonQuote(rev)+"}";
    Check(app.AnalysisAction(id,"execute",action,"session:alice",PermitA).status==409,"K09 unconfirmed execute rejected");
    Check(app.AnalysisAction(id,"confirm",action,"session:bob",PermitA).status==403,"K09 other principal rejected");
    Check(app.AnalysisAction(id,"confirm",action,"session:alice",PermitA).status==200,"K09 actual server confirmation");
    Check(app.AnalysisAction(id,"execute",action,"session:alice",[](auto){return false;}).status==403,"K09 revoke after confirm");
    Check(app.AnalysisAction(id,"execute","{\"revision\":\""+std::string(64,'a')+"\"}","session:alice",PermitA).status==409,"K09 revision mismatch");
    for(const auto* field:{"verdict","basis","observations","confirmedBy","manifestDigest","episode","policy"})
        Check(app.AnalysisDraft(body.substr(0,body.size()-1)+",\""+field+"\":\"injected\"}","session:alice",PermitA).status==400,"K09 client injection rejected "+std::string(field));
    auto job=app.AnalysisAction(id,"execute",action,"session:alice",PermitA);Check(job.status==202,"K09 worker submitted");const auto jid=Field(job.body,"id");
    for(int i=0;i<200;++i){job=app.AnalysisJob(jid,"session:alice",false,true,PermitA,false);if(Field(job.body,"state")=="completed")break;std::this_thread::sleep_for(std::chrono::milliseconds(5));}
    Check(Field(job.body,"state")=="completed","K09 actual worker completed");const auto rid=Field(job.body,"reviewId");
    Check(Field(app.AnalysisAction(id,"execute",action,"session:alice",PermitA).body,"id")==jid,"K09 terminal duplicate keeps same job");
    Check(app.Job(jid,"session:alice",false,true,PermitA,true).status==404,"K09 v1 job path cannot cancel A");
    Check(app.Get(rid,PermitA).status==404&&app.AnalysisGet(Field(seed,"internalId"),PermitA).status==404,"K09 legacy and internal v2 nonexposure");
    const auto got=app.AnalysisGet(rid,PermitA);Check(got.status==200&&got.body.find("supported")!=std::string::npos&&got.body.find("not-generated")!=std::string::npos,"K09 result preserves A verdict and question state");
    auto newdraft=app.AnalysisDraft(body,"session:alice",PermitA);const auto ni=Field(newdraft.body,"id"),na="{\"revision\":"+EvidenceJsonQuote(Field(newdraft.body,"revision"))+"}";
    Check(app.AnalysisAction(ni,"confirm",na,"session:alice",PermitA).status==200,"K09 second draft confirmed");
    auto changed=app.AnalysisDraft(DraftBody(package,target,"endpoint-left"),"session:alice",PermitA);Check(changed.status==201&&app.AnalysisAction(ni,"execute",na,"session:alice",PermitA).status==410,"K09 changed intent invalidates prior draft");
    app.Stop();Check(calls==0,"K09 model/provider calls zero");
    ingress::VaReviewApplicationService restarted(root,true,{},0,infer);Check(restarted.AnalysisAction(ni,"confirm",na,"session:alice",PermitA).status==410&&restarted.AnalysisGet(rid,PermitA).status==200,"K09 restart forgets transient confirmation but keeps saved record");restarted.Stop();
    ingress::VaReviewApplicationService expiry(root,true,{},0,infer,std::chrono::milliseconds(25));auto exp=expiry.AnalysisDraft(body,"session:alice",PermitA);
    std::this_thread::sleep_for(std::chrono::milliseconds(30));Check(exp.status==201&&expiry.AnalysisAction(Field(exp.body,"id"),"confirm","{\"revision\":"+EvidenceJsonQuote(Field(exp.body,"revision"))+"}","session:alice",PermitA).status==410,"K09 bounded test TTL expiry");expiry.Stop();
    VaReviewStore store(root/"va-reviews",{});VaReviewRecordV3 v;Check(store.ReadV3(rid,&v,&error),"K09 v3 read");const auto json=SerializeVaReviewRecordV3(v);VaReviewRecordV3 parsed;
    Check(ParseVaReviewRecordV3(json,&parsed,&error)&&SerializeVaReviewRecordV3(parsed)==json,"K09 canonical v3 roundtrip");
    auto bad=v;bad.confirmation.principal="session:mallory";Check(!ValidateVaReviewRecordV3(bad,&error),"K09 confirmation digest tamper");bad=v;bad.analysis.binding.analysis_track_id="track-999";Check(!ValidateVaReviewRecordV3(bad,&error),"K09 bound target tamper");
    Check(!ParseVaReviewRecordV2(json,&v.analysis,&error),"K09 v2 reader rejects v3");
    VaReviewStore::Limits limits;limits.record_bytes=json.size();limits.reserve_bytes=0;VaReviewStore exact(root/"exact-v3",limits);std::string result;
    Check(exact.PublishV3(v,&result,&error),"K09 v3 exact byte boundary");--limits.record_bytes;VaReviewStore shortstore(root/"short-v3",limits);
    Check(!shortstore.PublishV3(v,&result,&error)&&error=="review-record-too-large","K09 v3 byte overflow");
    limits={};limits.records=1;limits.reserve_bytes=0;VaReviewStore cap(root/"cap-v3",limits);Check(cap.PublishV3(v,&result,&error),"K09 capacity first");bad=v;++bad.analysis.created_at_ms;
    Check(!cap.PublishV3(bad,&result,&error)&&error=="review-capacity","K09 capacity failure no false success");
    VaReviewStore cancel(root/"cancel-v3",{});int probes=0;Check(!cancel.PublishV3(v,&result,&error,[&]{return ++probes>=4;})&&error=="review-cancelled"&&!std::filesystem::exists(root/"cancel-v3/.pending-review-v1"),"K09 cancel during write cleans pending");
    const auto child=::fork();Check(child>=0,"K09 owned I/O failure child");if(child==0){::signal(SIGXFSZ,SIG_IGN);struct rlimit l{128,128};if(::setrlimit(RLIMIT_FSIZE,&l))::_exit(2);VaReviewStore io(root/"io-v3",{});std::string t,e;
        const bool ok=!io.PublishV3(v,&t,&e)&&e=="review-write-failed"&&!std::filesystem::exists(root/"io-v3/.pending-review-v1");::_exit(ok?0:3);}
    int status=0;Check(::waitpid(child,&status,0)==child&&WIFEXITED(status)&&WEXITSTATUS(status)==0,"K09 actual partial I/O error propagation");
    EvidencePackageStore packages(root/"evidence-packages",{});ConfirmedAnalysisRequest req{v.analysis.binding,v.analysis.claims,v.confirmation};
    // worker의 현재 권한 callback을 잠시 막아 취소/게시 전 회수를 결정적으로 재현한다. 추론 대체 호출도 없다.
    for(bool revoke:{false,true}){
        std::mutex mutex;std::condition_variable cv;bool entered=false,release=false;unsigned probes2=0;
        VaReviewStore isolated(root/(revoke?"revoke-worker":"cancel-worker"),{});VaReviewService::Options opt;opt.enabled=true;
        VaReviewService worker(packages,isolated,opt,infer);VaReviewJob w;
        const auto auth=[&](const std::string&){std::unique_lock lock(mutex);if(++probes2==2){entered=true;cv.notify_one();cv.wait(lock,[&]{return release;});}return !revoke||!release;};
        Check(worker.SubmitConfirmed(req,req.confirmation.principal,auth,&w,&error),"K09 controlled A worker submit");
        {std::unique_lock lock(mutex);Check(cv.wait_for(lock,std::chrono::seconds(2),[&]{return entered;}),"K09 entered A worker authorization");}
        if(!revoke)Check(worker.Cancel(w.id,req.confirmation.principal,false,PermitA,&error),"K09 running cancel accepted");
        {std::lock_guard lock(mutex);release=true;cv.notify_one();}
        w=Done(worker,w.id);Check(w.state==(revoke?"failed":"cancelled")&&w.error==(revoke?"review-forbidden":"review-cancelled")&&w.review_id.empty(),"K09 A worker stops before publish");worker.Stop();
    }
    BoundSave(root/"confirmed-id",rid);BoundSave(root/"confirmed-expected",json);Check(calls==0,"K09 all native tests zero model calls");
}
void ConfirmedRead(const std::filesystem::path& root){
    VaReviewStore store(root/"va-reviews",{});VaReviewRecordV3 r;std::string e;const auto id=BoundLoad(root/"confirmed-id");
    Check(store.Recover(&e)&&store.ReadV3(id,&r,&e)&&SerializeVaReviewRecordV3(r)==BoundLoad(root/"confirmed-expected"),"K09 fresh process v3 byte readback");
    Check(r.confirmation.principal=="session:alice"&&r.analysis.decisions[0].verdict==ReviewVerdict::Supported,"K09 confirmation and stored verdict unchanged");
}
} // namespace

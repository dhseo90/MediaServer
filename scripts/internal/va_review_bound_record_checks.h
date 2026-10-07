// 파일 용도: 명시 모의 VA/ClaimSpec의 내부 A record 경로. 영상 인식/자유질문 품질 검사가 아니다.
#pragma once
namespace {
using namespace recording;
bool BoundPermit(const std::string& c){return c=="camera-1";}
std::string BoundLoad(const std::filesystem::path& p){std::ifstream f(p);return {std::istreambuf_iterator<char>(f),{}};}
void BoundSave(const std::filesystem::path& p,const std::string& s){std::ofstream f(p);f<<s;f.close();Check(bool(f),"K08 fixture saved");}
std::vector<ReviewClaimSpec> BoundClaims(){
    ReviewClaimSpec right;right.id="right";right.target_id="fixed-target";right.target_description="명시한 엔진 track";
    right.comparison_target_id=right.target_id;right.relation=ReviewRelation::EndpointRight;right.scope={0,1};
    auto left=right;left.id="left";left.relation=ReviewRelation::EndpointLeft;return {right,left};
}
void BoundAssert(const VaReviewRecordV2& r){
    Check(r.decisions.size()==2&&r.decisions[0].verdict==ReviewVerdict::Supported&&r.decisions[1].verdict==ReviewVerdict::Contradicted,
        "K08 independent right supported / left contradicted");
    AnalysisRecordReview replay;std::string error;
    Check(EvaluateAnalysisRecordSnapshot(r.evidence,r.claims,&replay,&error),"K08 stored A snapshot replay");
    Check(replay.observations[0].position->x==40&&replay.observations[0].position->y==45&&
        replay.observations[1].position->x==120&&replay.observations[1].position->y==45,"K08 independent centers 40,45 / 120,45");
    Check(r.binding.analysis_track_id=="track-77"&&r.evidence.frames[0].track_id==std::string(64,'a')+"/001"&&
        r.binding.analysis_namespace=="test-analysis"&&r.binding.engine_episodes==std::vector<std::int64_t>{0},"K08 target namespace/track/episode != media track");
    Check(r.evidence.observation_snapshots[0].candidates[0].observation.coordinates->value_kind=="processed-track"&&
        r.evidence.observation_snapshots[1].candidates[0].reference.original->ordinal==2,"K08 per-claim scope -> frame -> sample -> original A coordinates");
    const auto json=SerializeVaReviewRecordV2(r);
    Check(json.find("analysis-record-consistency")!=std::string::npos&&json.find("engine-track")!=std::string::npos&&
        json.find("not-confirmed")!=std::string::npos&&json.find("not-generated")!=std::string::npos&&
        json.find("not-evaluated")!=std::string::npos&&json.find("confirmedBy")==std::string::npos&&json.find("\"confidence\":1")==std::string::npos,
        "K08 internal input, A level, ungenerated questions, untested model; no invented confirmation/confidence");
}
void BoundSeed(const std::filesystem::path& root){
    std::string error,id;
    EvidencePackageStore packages(root/"evidence-packages",{});VaReviewStore store(root/"va-reviews",{});
    Check(packages.Recover(&error)&&store.Recover(&error),"K08 actual stores ready");
    std::vector<EvidencePayload> payloads;auto p=Manifest(2,&payloads);
    p.schema="media-server.evidence-package.v2";p.observation_source_id="source-1";p.analysis_namespace="test-analysis";p.track_id="track-77";
    for(std::size_t i=0;i<2;++i){auto png=QualityPng(208);auto hash=EvidenceSha256(png.data(),png.size());
        payloads[i].bytes=png;p.frames[i].track_id=std::string(64,'a')+"/001";p.frames[i].width=512;p.frames[i].height=288;p.frames[i].png_sha256=hash;
        p.assets[i].sha256=hash;p.assets[i].size_bytes=png.size();p.references[2+i].sha256=hash;}
    // 실제 projector가 만든 유효 ID/출처를 쓴다. mock VA 좌표는 PNG 사실 oracle가 아니다.
    {RecordingRuntimeStorage runtime(root/"original-catalog");Check(runtime.Open(&error),"K08 owned mock VA catalog");
        AnalysisObservationProjector::Options options;options.use_consumer_references=true;options.interval_ms=1;
        AnalysisObservationProjector projector(runtime.catalog(),options);
        for(std::size_t i=0;i<2;++i){analysis::AnalysisResult a;a.source_key="source-1";
            a.observation_context.source_id="source-1";a.observation_context.channel_id="camera-1";a.observation_namespace="test-analysis";
            a.pts=p.frames[i].pts_ns;a.frame_width=512;a.frame_height=288;
            analysis::ObservationCoordinatesV1 c;c.producer="gstreamer-yolo-onnx-v1";c.value_kind="detector";
            c.units="normalized-top-left-xywh";c.frame_mapping="decoded-full-frame-no-crop";c.policy="yolo-inverse-scale-pad-clamp-v1";
            c.frame_width=512;c.frame_height=288;c.input_width=512;c.input_height=288;c.resized_width=512;c.resized_height=288;
            c.scale_x=1;c.scale_y=1;c.resize="stretch";a.coordinates=c;
            a.source_association.quality=analysis::SourceAssociationQuality::TimestampMatch;
            a.source_association.original=analysis::OriginalSampleIdentity{"generation-1",1,i+1,p.frames[i].track_id,std::uint64_t(a.pts)};
            analysis::Track t;t.track_id=77;t.first_seen_pts=0;t.last_seen_pts=a.pts;t.detection.label="synthetic-target";t.detection.score=.75F;
            // 이진수로 정확한 좌표: y center 45 = (.125 + .0625/2) * 288.
            t.detection.box={i==0?.046875F:.203125F,.125F,.0625F,.0625F};a.tracks={t};projector.OnResult(a);}
        projector.StopAndDrain();const auto rows=runtime.catalog().QueryReferencedObservations("camera-1");
        Check(rows.size()==2&&PopulateEvidenceObservations(&p,rows,&error),"K08 two actual serialized mock VA rows: "+error);}
    std::string package;Check(packages.Publish(p,payloads,&package,&error),"K08 package v2 publish: "+error);
    auto canonical=SerializeEvidencePackage(p);
    ReviewTargetBindingV2 b{"fixed-target",package,EvidenceSha256(canonical.data(),canonical.size()),"test-analysis","track-77",{0}};
    const auto claims=BoundClaims();
    Check(CreateAnalysisReviewRecord(packages,store,b,claims,1,BoundPermit,&id,&error),"K08 A reader -> core -> versioned store: "+error);
    VaReviewRecordV2 r;Check(ReadAnalysisReviewRecord(store,id,BoundPermit,&r,&error),"K08 authorized v2 read");BoundAssert(r);
    const auto json=SerializeVaReviewRecordV2(r);VaReviewRecordV2 decoded;
    Check(ParseVaReviewRecordV2(json,&decoded,&error)&&SerializeVaReviewRecordV2(decoded)==json,"K08 v2 canonical roundtrip");
    auto oversized=r;oversized.decisions.resize(17,r.decisions.front());
    Check(!ValidateVaReviewRecordV2(oversized,&error),"K08 typed decision count rejected before serialization");
    oversized=r;oversized.decisions[0].gaps.resize(6,ReviewGap{ReviewGapKind::Position,"fixed-target",{0},0,0});
    Check(!ValidateVaReviewRecordV2(oversized,&error),"K08 typed gap count rejected before serialization");
    auto reject=[&](std::string bad,const std::string& label){decoded=r;
        Check(!ParseVaReviewRecordV2(bad,&decoded,&error)&&SerializeVaReviewRecordV2(decoded)==json,"K08 reject "+label+" unchanged");};
    auto replace=[&](const std::string& from,const std::string& to){auto s=json;auto at=s.find(from);Check(at!=std::string::npos,"K08 mutation field present");s.replace(at,from.size(),to);return s;};
    for(const auto& mutation:std::vector<std::pair<std::string,std::string>>{
        {"media-server.va-review-record.v2","media-server.va-review-record.v3"},{"\"sourceKind\":\"A\"","\"sourceKind\":\"B\""},
        {"analysis-record-consistency","independent-video-verification"},{"engine-track","physical-identity"},
        {"internal-explicit","user-confirmed"},{"not-confirmed","confirmed"},{"not-generated","generated"},{"not-evaluated","passed"},
        {"\"positionTolerancePixels\":1","\"positionTolerancePixels\":2"},{"endpoint-right","endpoint-left"},
        {"\"sampleOrdinal\":1","\"sampleOrdinal\":2"},{"\"verdict\":\"supported\"","\"verdict\":\"insufficient\""}})
        reject(replace(mutation.first,mutation.second),mutation.first);
    for(int field=0;field<4;++field){auto bad=r;
        if(field==0)bad.spec_sha256=std::string(64,'f');
        if(field==1)bad.observation_sha256=std::string(64,'f');
        if(field==2)bad.policy_sha256=std::string(64,'f');
        if(field==3)bad.evidence.observation_snapshots[0].candidates[0].observation.bbox.x=.9;
        reject(SerializeVaReviewRecordV2(bad),"digest/observation "+std::to_string(field));}
    reject(json.substr(0,json.size()-1)+",\"confirmedBy\":\"admin\"}","unknown confirmation field");
    reject(json.substr(0,json.size()-1)+",\"createdAtMs\":2}","duplicate field");
    Check(ParseVaReviewRecordV2(json+std::string(kVaReviewRecordV2Bytes-json.size(),' '),&decoded,&error),"K08 codec 128KiB exact byte bound");
    reject(json+std::string(kVaReviewRecordV2Bytes-json.size()+1,' '),"codec 128KiB plus one");
    VaReviewRecord old;Check(!ParseVaReviewRecord(json,&old,&error),"K08 v1 parser rejects v2");
    for(int field=0;field<5;++field){auto bad=b;if(field==0)bad.analysis_track_id="track-other";if(field==1)bad.analysis_namespace="other-analysis";
        if(field==2)bad.engine_episodes={1};
        if(field==3)bad.target_id="other-target";
        if(field==4)bad.manifest_sha256=std::string(64,'f');
        std::string untouched="unchanged";Check(!CreateAnalysisReviewRecord(packages,store,bad,claims,1,BoundPermit,&untouched,&error)&&untouched=="unchanged","K08 reject explicit target/package binding "+std::to_string(field));}
    decoded=r;Check(!ReadAnalysisReviewRecord(store,id,[](const auto&){return false;},&decoded,&error)&&error=="review-forbidden"&&SerializeVaReviewRecordV2(decoded)==json,"K08 unauthorized read unchanged");
    std::string blocked="unchanged";
    Check(!CreateAnalysisReviewRecord(packages,store,b,claims,2,[](const auto&){return false;},&blocked,&error)&&error=="review-forbidden"&&blocked=="unchanged","K08 unauthorized create no publication");
    int authorizations=0;
    Check(!CreateAnalysisReviewRecord(packages,store,b,claims,2,[&](const auto&){return ++authorizations<3;},&blocked,&error)&&blocked=="unchanged","K08 revoke before store publish");
    ReviewDisplayProjectionV2 projection;Check(ProjectAnalysisReviewDisplay(r,&projection,&error)&&projection.status=="available-display-only"&&
        projection.output->supports.size()==1&&projection.output->contradictions.size()==1&&!projection.output->confidence&&
        projection.text_origin=="server-template"&&projection.questions_state=="not-generated"&&projection.quality=="not-evaluated","K08 finite old projection, no model generation/quality promotion");
    auto missing=p;Check(PopulateEvidenceObservations(&missing,{},&error),"K08 absence fixture preserves PNG");
    std::string missing_package;Check(packages.Publish(missing,payloads,&missing_package,&error),"K08 missing package publish");
    auto mb=b;mb.package_id=missing_package;canonical=SerializeEvidencePackage(missing);mb.manifest_sha256=EvidenceSha256(canonical.data(),canonical.size());mb.engine_episodes.clear();
    auto many=claims;many.resize(16,claims.front());for(std::size_t i=0;i<many.size();++i)many[i].id="claim-"+std::to_string(i);
    std::string manyid;Check(CreateAnalysisReviewRecord(packages,store,mb,many,3,BoundPermit,&manyid,&error)&&store.ReadV2(manyid,&decoded,&error),"K08 valid 16-claim v2 independent of old budget");
    Check(decoded.claims.size()==16&&std::all_of(decoded.decisions.begin(),decoded.decisions.end(),[](const auto& d){return d.verdict==ReviewVerdict::Insufficient&&d.gaps.size()==2&&d.gaps[0].kind==ReviewGapKind::Identity&&d.gaps[1].kind==ReviewGapKind::Position&&
        d.gaps[0].frames==std::vector<std::size_t>{0,1}&&d.gaps[1].frames==std::vector<std::size_t>{0,1};}),"K08 all claims/identity and position gaps with both frame refs retained");
    Check(ProjectAnalysisReviewDisplay(decoded,&projection,&error)&&projection.status=="unavailable-limit"&&!projection.output,"K08 U+G/G limit, no truncation or insufficient rewrite");
    std::string oneid;Check(CreateAnalysisReviewRecord(packages,store,mb,{claims.front()},4,BoundPermit,&oneid,&error)&&store.ReadV2(oneid,&decoded,&error)&&
        ProjectAnalysisReviewDisplay(decoded,&projection,&error)&&projection.status=="available-display-only"&&projection.output->questions.size()==2&&projection.output->unclear.size()==3,
        "K08 gap templates are display-only and questions remain not-generated");
    auto unsupported=claims.front();unsupported.relation=ReviewRelation::ContinuousMotion;
    std::string unsupportedid;Check(CreateAnalysisReviewRecord(packages,store,b,{unsupported},5,BoundPermit,&unsupportedid,&error)&&store.ReadV2(unsupportedid,&decoded,&error)&&
        decoded.decisions[0].verdict==ReviewVerdict::Unsupported&&ProjectAnalysisReviewDisplay(decoded,&projection,&error)&&projection.status=="unavailable-unsupported"&&!projection.output,"K08 unsupported persists separate from insufficiency/projection");
    VaReviewStore::Limits exact;exact.record_bytes=json.size();exact.reserve_bytes=0;
    VaReviewStore exactStore(root/"exact",exact);std::string exactid;Check(exactStore.PublishV2(r,&exactid,&error),"K08 exact serialized store byte limit");
    --exact.record_bytes;VaReviewStore shortStore(root/"short",exact);Check(!shortStore.PublishV2(r,&blocked,&error)&&error=="review-record-too-large"&&blocked=="unchanged","K08 byte limit minus one no partial publish");
    VaReviewStore::Limits cap;cap.records=1;cap.reserve_bytes=0;VaReviewStore capacity(root/"capacity",cap);
    Check(capacity.PublishV2(r,&exactid,&error),"K08 quota first record");auto next=r;next.created_at_ms=2;
    Check(!capacity.PublishV2(next,&blocked,&error)&&error=="review-capacity"&&blocked=="unchanged","K08 quota counts v2");
    VaReviewStore cancelled(root/"cancelled",{});int probes=0;
    Check(!cancelled.PublishV2(r,&blocked,&error,[&]{return ++probes>=4;})&&error=="review-cancelled"&&blocked=="unchanged"&&
        !std::filesystem::exists(root/"cancelled/.pending-review-v1"),"K08 cancellation after write leaves no pending record");
    std::vector<std::string> ids;Check(cancelled.List(&ids,&error)&&ids.empty(),"K08 cancelled store empty");
    const auto child=::fork();Check(child>=0,"K08 I/O failure child owned");
    if(child==0){::signal(SIGXFSZ,SIG_IGN);struct rlimit limit{128,128};if(::setrlimit(RLIMIT_FSIZE,&limit))::_exit(2);
        VaReviewStore io(root/"io",{});std::string target="unchanged",failure;bool ok=!io.PublishV2(r,&target,&failure)&&failure=="review-write-failed"&&target=="unchanged";
        std::vector<std::string> empty;ok=ok&&io.List(&empty,&failure)&&empty.empty()&&!std::filesystem::exists(root/"io/.pending-review-v1");::_exit(ok?0:3);}
    int status=0;Check(::waitpid(child,&status,0)==child&&WIFEXITED(status)&&WEXITSTATUS(status)==0,"K08 partial I/O EFBIG fails, cleans pending, no false success");
    Check(store.List(&ids,&error)&&ids.empty()&&!store.Read(id,&old,&error),"K08 old list/get never expose internal v2");
    auto v1=Record(root);std::string v1id;Check(store.Publish(v1,&v1id,&error)&&store.Read(v1id,&old,&error)&&
        SerializeVaReviewRecord(old)==SerializeVaReviewRecord(v1)&&!store.ReadV2(v1id,&decoded,&error),"K08 v1 exact bytes and typed reader separation");
    Check(!ParseVaReviewRecordV2(SerializeVaReviewRecord(v1),&decoded,&error),"K08 v2 reader rejects historical v1 without promotion");
    Check(store.List(&ids,&error)&&ids==std::vector<std::string>{v1id}&&store.Recover(&error),"K08 mixed recovery and public v1-only inventory");
    cap.records=1;VaReviewStore mixedcap(root/"mixedcap",cap);Check(mixedcap.Publish(v1,&exactid,&error)&&!mixedcap.PublishV2(r,&blocked,&error)&&error=="review-capacity","K08 v1/v2 share unchanged quota");
    VaReviewStore::Limits bytecap;bytecap.reserve_bytes=0;bytecap.bytes=json.size()+8;
    VaReviewStore total(root/"total-bytes",bytecap);Check(total.PublishV2(r,&exactid,&error)&&
        !total.PublishV2(next,&blocked,&error)&&error=="review-capacity","K08 shared total bytes exact/overflow");
    const auto recovery=root/"pending-recovery";std::filesystem::create_directory(recovery);::chmod(recovery.c_str(),0700);
    const auto pending=recovery/".pending-review-v1";
    {const int pf=::open(pending.c_str(),O_CREAT|O_EXCL|O_WRONLY,0600);Check(pf>=0,"K08 pending fixture fd");
        const std::string partial="MSVAR02\n{\"schema\":";const auto wrote=::write(pf,partial.data(),partial.size());::close(pf);
        Check(wrote==ssize_t(partial.size()),"K08 simulated interrupted v2 bytes");}
    VaReviewStore recovered(recovery,{});Check(recovered.Recover(&error)&&!std::filesystem::exists(pending),"K08 interrupted v2 pending safely recovered");
    Check(recovered.PublishV2(r,&exactid,&error)&&::link((recovery/(exactid+".review")).c_str(),pending.c_str())==0&&
        recovered.Recover(&error)&&recovered.ReadV2(exactid,&decoded,&error)&&!std::filesystem::exists(pending),"K08 linked v2 publish interrupted before unlink recovers");
    const auto invalid=root/"invalid-version";std::filesystem::create_directory(invalid);::chmod(invalid.c_str(),0700);
    const auto invalidBytes="MSVAR04\n"+json;const auto invalidId="vr-"+EvidenceSha256(invalidBytes.data(),invalidBytes.size());
    const int iv=::open((invalid/(invalidId+".review")).c_str(),O_WRONLY|O_CREAT|O_EXCL,0600);Check(iv>=0,"K08 unknown version fixture fd");
    const auto wrote=::write(iv,invalidBytes.data(),invalidBytes.size());::close(iv);VaReviewStore invalidStore(invalid,{});
    Check(wrote==ssize_t(invalidBytes.size())&&!invalidStore.ReadV2(invalidId,&decoded,&error)&&!invalidStore.Recover(&error)&&
        !invalidStore.List(&ids,&error),"K08 valid hash unknown container version rejected not hidden");
    unsigned calls=0;VaReviewProviderOptions options;
    ingress::VaReviewApplicationService app(root,true,options,0,[&](const auto&,const auto&,auto,const auto&,auto*,auto*){++calls;return false;});
    auto list=app.List(package,BoundPermit,true);Check(list.status==200&&list.body.find("\"items\":[]")!=std::string::npos&&app.Get(id,BoundPermit).status==404&&
        app.List(package,[](const auto&){return false;},false).status==403,"K08 real public application list/get/scope isolate internal v2");app.Stop();Check(calls==0,"K08 zero provider calls");
    std::string availability;Check(CheckAnalysisReviewEvidence(packages,r,&availability,&error)&&availability=="available","K08 exact immutable package evidence available");
    auto changed=r;changed.binding.manifest_sha256=std::string(64,'f');Check(!CheckAnalysisReviewEvidence(packages,changed,&availability,&error),"K08 manifest tamper is error");
    BoundSave(root/"record-id",id);BoundSave(root/"expected-record.json",json);BoundSave(root/"package-id",package);
    // 40 보존 경로 전체를 반복하지 않는다. 아래 별도 프로세스에는 저장소 사본만 전달한다.
}
void BoundRead(const std::filesystem::path& root){
    Check(!std::filesystem::exists(root/"original-catalog")&&!std::filesystem::exists(root/"original-media"),"K08 fresh process no original/catalog available");
    VaReviewStore store(root/"va-reviews",{});EvidencePackageStore packages(root/"evidence-packages",{});std::string error,availability;
    const auto id=BoundLoad(root/"record-id");VaReviewRecordV2 r;
    Check(store.Recover(&error)&&ReadAnalysisReviewRecord(store,id,BoundPermit,&r,&error),"K08 new process record recovery/readback: "+error);
    Check(SerializeVaReviewRecordV2(r)==BoundLoad(root/"expected-record.json"),"K08 new process bytes identical without regeneration");BoundAssert(r);
    Check(CheckAnalysisReviewEvidence(packages,r,&availability,&error)&&availability=="available","K08 new process preserved package verification");
    const auto path=root/"evidence-packages"/(r.binding.package_id+".evp");
    const int fd=::open(path.c_str(),O_WRONLY|O_NOFOLLOW|O_CLOEXEC);Check(fd>=0,"K08 own package corrupt fixture");const char bad='!';
    const auto written=::pwrite(fd,&bad,1,0);::close(fd);
    Check(written==1&&!CheckAnalysisReviewEvidence(packages,r,&availability,&error),"K08 corrupted package is error not unavailable/insufficient");
    Check(store.ReadV2(id,&r,&error)&&r.decisions[0].verdict==ReviewVerdict::Supported,"K08 saved verdict survives failed current evidence access");
    Check(std::filesystem::remove(path),"K08 remove only copied test-owned package");
    Check(CheckAnalysisReviewEvidence(packages,r,&availability,&error)&&availability=="unavailable"&&
        SerializeVaReviewRecordV2(r)==BoundLoad(root/"expected-record.json"),"K08 package missing distinct unavailable, no latest fallback/rewrite");
    const auto record=root/"va-reviews"/(id+".review");const int rf=::open(record.c_str(),O_WRONLY|O_NOFOLLOW|O_CLOEXEC);
    Check(rf>=0,"K08 own record corruption fixture");const auto n=::pwrite(rf,&bad,1,10);::close(rf);
    Check(n==1&&!store.ReadV2(id,&r,&error)&&!store.Recover(&error),"K08 stored content hash corruption rejected");
}
} // namespace

// 파일 용도: 모의 VA 출력으로 실제 출처 보존 경로와 원본/catalog 없는 별도 프로세스 readback을 검사한다.
#include "recording_media_test_fixture.h"
#include "recording/evidence_package_builder.h"
#include "recording/evidence_observation.h"
#include "recording/recording_runtime_composition.h"
#include "recording/recording_search_reader.h"
#include "recording/analysis_observation_projector.h"
#include "recording/retention_coordinator.h"
#include "recording/va_review_input.h"
#include "analysis/raw_video_decoder.h"
#include "ingress/evidence_application_service.h"
#include <cmath>
#include <fstream>
#include <limits>
#include <mutex>
#include <condition_variable>
#include <unistd.h>

namespace {
using namespace recording;
using Clock=std::chrono::steady_clock;
int checks=0;
void Check(bool yes,const std::string& label){++checks;if(!yes)throw std::runtime_error(label);std::cout<<"[pass] "<<label<<std::endl;}
auto Deadline(){return Clock::now()+std::chrono::seconds(30);}
analysis::ObservationCoordinatesV1 Coordinates(){
    analysis::ObservationCoordinatesV1 c;c.producer="gstreamer-yolo-onnx-v1";c.value_kind="detector";
    c.units="normalized-top-left-xywh";c.frame_mapping="decoded-full-frame-no-crop";c.policy="yolo-inverse-scale-pad-clamp-v1";
    c.frame_width=160;c.frame_height=90;c.input_width=640;c.input_height=360;c.resized_width=640;c.resized_height=360;
    c.scale_x=4;c.scale_y=4;c.resize="stretch";return c;
}
std::vector<ReviewClaimSpec> Claims(){
    ReviewClaimSpec right;right.id="right";right.target_id="selected-engine-track";right.target_description="명시한 분석 track";
    right.comparison_target_id=right.target_id;right.relation=ReviewRelation::EndpointRight;right.scope={0,7};
    auto left=right;left.id="left";left.relation=ReviewRelation::EndpointLeft;
    auto hidden=right;hidden.id="continuous";hidden.relation=ReviewRelation::ContinuousMotion;
    auto color=right;color.id="color";color.relation=ReviewRelation::ColorAt;color.scope={0};
    return {right,left,hidden,color};
}
void AssertReview(const EvidencePackageStore& store,const std::string& id){
    AnalysisRecordReview r;std::string error;
    Check(ReadAnalysisRecordReview(store,id,Claims(),&r,&error),"package-only reader/core: "+error);
    Check(r.source_kind=="A"&&r.verification=="analysis-record-consistency"&&r.identity_basis=="engine-track","A provenance remains in returned decisions envelope");
    Check(r.package.observation_snapshots[0].candidates[0].observation.coordinates->resize=="stretch"&&
        r.package.observation_snapshots[7].candidates[0].observation.coordinates->scale_x==4,"original transform recovered");
    Check(r.observations[0].position->x==40&&r.observations[0].position->y==45&&
        r.observations[7].position->x==120&&r.observations[7].position->y==45,"independent centers (40,45)/(120,45), no inverse-derived oracle");
    Check(r.decisions[0].verdict==ReviewVerdict::Supported&&r.decisions[1].verdict==ReviewVerdict::Contradicted,"engine track: right supported / left contradicted");
    Check(r.decisions[2].verdict==ReviewVerdict::Unsupported&&r.decisions[3].verdict==ReviewVerdict::Insufficient,"no hidden motion or unobserved color invented");
    Check(r.observations[1].visibility==ReviewVisibility::Unknown&&r.observations[1].identity==ReviewIdentity::Unknown&&!r.observations[1].position,"absent observation remains unknown, not invisible");
}
void CodecChecks(){
    auto c=Coordinates();analysis::ObservationCoordinatesV1 out;
    const auto encoded=analysis::SerializeObservationCoordinates(c);
    Check(analysis::ParseObservationCoordinates(encoded,&out)&&analysis::SerializeObservationCoordinates(out)==encoded,"coordinate strict canonical roundtrip");
    c.resize="letterbox";c.input_height=640;c.pad_y=140;
    Check(analysis::ValidateObservationCoordinates(c),"letterbox real scale/padding accepted without applying inverse twice");
    for(int i=0;i<5;++i){auto bad=c;if(i==0)bad.scale_x=std::numeric_limits<double>::quiet_NaN();if(i==1)bad.pad_y=141;
        if(i==2)bad.resized_width=639;if(i==3)bad.frame_mapping="crop-unknown";if(i==4)bad.units="pixels";
        Check(!analysis::ValidateObservationCoordinates(bad),"invalid coordinate provenance rejected "+std::to_string(i));}
    for(const auto& text:{encoded.substr(0,encoded.size()-1)+",\"verdict\":\"supported\"}",std::string("null"),encoded.substr(0,encoded.size()-1)+",\"scaleX\":4}"})
        Check(!analysis::ParseObservationCoordinates(text,&out)&&analysis::SerializeObservationCoordinates(out)==encoded,"unknown/duplicate/invalid fields rejected, output unchanged");
}
void Save(const std::filesystem::path& path,const std::string& text){std::ofstream f(path);f<<text;f.close();if(!f)throw std::runtime_error("fixture-save");}
std::string Load(const std::filesystem::path& path){std::ifstream f(path);return {std::istreambuf_iterator<char>(f),{}};}
std::vector<EvidencePayload> Payloads(const EvidencePackageFile& file){
    std::vector<EvidencePayload> result;
    for(std::size_t i=0;i<file.manifest().assets.size();++i){EvidencePayload p;p.bytes.resize(file.manifest().assets[i].size_bytes);
        Check(::pread(file.fd(),p.bytes.data(),p.bytes.size(),file.AssetOffset(i))==ssize_t(p.bytes.size()),"test-owned preserved PNG read");result.push_back(std::move(p));}
    return result;
}
void GuardCases(const std::filesystem::path& root,RecordingRuntimeStorage& runtime,RecordingReadService& reader,
    const SearchDocument& hit,const EvidencePackageV1& package,const std::vector<EvidencePayload>& payloads){
    auto& catalog=runtime.catalog();std::string error;
    const auto add=[&](const std::string& name,const std::string& track,const std::string& ns){
        auto row=package.observation_snapshots[0].candidates[0];row.observation.observation_id=name;
        row.reference.reference_id="ref-"+name;row.reference.owner_id=name;
        row.observation.track_id=track;row.reference.analysis_track_id=track;
        row.observation.analysis_namespace=ns;row.reference.analysis_namespace=ns;
        if(!catalog.PutReferencedObservation(row.observation,row.reference,&error))throw std::runtime_error("guard-row-fixture: "+error);
    };
    const auto one=[&](const std::string& name,const SearchDocument& target,const std::function<bool()>& mutation,
        bool expected,const char* code){
        const auto directory=root/name;EvidencePackageStore store(directory,{});Check(store.Recover(&error),"guard store ready "+name);
        EvidencePackageBuilder builder(catalog,reader,store);bool invoked=false;EvidencePackageV1 out;std::string id;
        EvidenceFailure trace;
        const auto boundary=[&]{if(!invoked&&std::filesystem::exists(directory/".pending-evp-v1")){invoked=true;return mutation();}return false;};
        const bool ok=builder.CreateWithObservations(target,"structured","",&id,&out,&error,Deadline(),boundary,&trace);
        std::cout<<"[guard] case="<<name<<" ok="<<ok<<" error="<<error<<" first="<<trace.first_code<<" stage="<<trace.first_stage
            <<" exception="<<trace.exception<<" captured="<<trace.captured_revision<<" checked="<<trace.checked_revision<<std::endl;
        Check(invoked&&ok==expected&&(expected||error==code),"actual builder boundary "+name);
        Check(!std::filesystem::exists(directory/".pending-evp-v1"),"pending removed "+name);
        std::vector<std::string> ids;Check(store.ListIds(&ids,&error)&&ids.size()==(expected?1:0),"atomic publication count "+name);
        if(expected)Check(bool(store.Open(id,&error)),"new package independent store verification "+name);
        return trace;
    };
    auto empty=hit;empty.track_id="track-999";
    const auto absent=one("guard-empty-add",empty,[&]{add("empty-add",empty.track_id,empty.analysis_namespace);return false;},false,"evidence-source-changed");
    Check(absent.dependencies_checked&&!absent.dependencies_current&&std::string(absent.first_code)=="evidence-source-changed",
        "empty selection detects new related row at final guard");
    one("guard-other-namespace",hit,[&]{add("other-ns",hit.track_id,"different-namespace");return false;},true,"");
    one("guard-other-track",hit,[&]{add("other-track","track-555",hit.analysis_namespace);return false;},true,"");
    const auto cancelled=one("guard-cancel-change",hit,[&]{add("cancel-related",hit.track_id,hit.analysis_namespace);return true;},false,"evidence-timeout");
    Check(std::string(cancelled.first_code)=="evidence-timeout"&&!cancelled.dependencies_checked,"cancel first; later revision cannot reclassify as source change");
    EvidencePackageStore::Limits limits;limits.max_packages=0;EvidencePackageStore full(root/"guard-full",limits);
    Check(full.Recover(&error),"capacity store fixture");EvidencePackageBuilder full_builder(catalog,reader,full);
    EvidenceFailure full_trace;unsigned calls=0;std::string unused;EvidencePackageV1 out;
    const bool full_ok=full_builder.CreateWithObservations(hit,"structured","",&unused,&out,&error,Deadline(),[&]{
        if(++calls==2)add("capacity-related",hit.track_id,hit.analysis_namespace);return false;
    },&full_trace);
    Check(!full_ok&&calls>=2&&error=="evidence-capacity"&&std::string(full_trace.first_code)=="evidence-capacity"&&
        std::string(full_trace.first_stage)=="store-prepare","capacity error retained despite post-capture related change");
    const auto store_case=[&](const std::string& name,const std::vector<EvidencePayload>& data,
        const std::function<bool()>& cancel,const std::function<bool(const std::function<bool()>&)>& guard,
        const char* expected,const char* first,bool published){
        EvidencePackageStore store(root/name,{});Check(store.Recover(&error),"failure store ready "+name);
        EvidenceFailure trace;std::string id;
        const bool ok=store.Publish(package,data,&id,&error,cancel,guard,&trace);
        std::cout<<"[store-first] "<<name<<" first="<<trace.first_code<<" final="<<error<<" stage="<<trace.first_stage<<" exception="<<trace.exception<<std::endl;
        Check(!ok&&error==expected&&std::string(trace.first_code)==first&&trace.published==published,"first/final publication boundary "+name);
        Check(!std::filesystem::exists(root/name/".pending-evp-v1"),"failed store pending cleanup "+name);
        if(published)Check(EvidencePackageStore::ValidId(id)&&bool(store.Open(id,&error)),"uncertain publication keeps readable ID");
        else {std::vector<std::string> ids;Check(id.empty()&&store.ListIds(&ids,&error)&&ids.empty(),"prepublication failure no ID");}
    };
    auto bad=payloads;bad[0].bytes[0]^=1;bool written_mutation=false;
    store_case("guard-write-overlap",bad,[&]{if(!written_mutation){written_mutation=true;add("write-related",hit.track_id,hit.analysis_namespace);}return false;},{},
        "evidence-write-failed","evidence-payload-changed",false);
    unsigned cancel_calls=0;
    store_case("guard-callback-count",payloads,[&]{++cancel_calls;return true;},{},"evidence-timeout","evidence-timeout",false);
    Check(cancel_calls==1,"diagnostics/catch never invoke cancellation a second time");
    store_case("guard-false-overlap",payloads,{},[&](const auto&){add("guard-related",hit.track_id,hit.analysis_namespace);return false;},
        "evidence-write-failed","evidence-publish-failed",false);
    store_case("guard-after-link",payloads,{},[](const auto& link){if(!link())throw std::runtime_error("test-link");return false;},
        "evidence-publication-uncertain","evidence-publish-failed",true);
    store_case("guard-exception",payloads,[]{throw std::runtime_error("private-test-path");return false;},{},
        "evidence-write-failed","evidence-exception",false);
    ingress::EvidenceApplicationService application(catalog,reader,true,root/"guard-http",0);bool http_changed=false;
    auto http_hit=hit;http_hit.track_id="track-http";
    const auto response=application.Create(http_hit,"structured","",[&](const auto& channel){
        if(!http_changed&&std::filesystem::exists(root/"guard-http/.pending-evp-v1")){
            http_changed=true;add("http-related",http_hit.track_id,http_hit.analysis_namespace);
        }
        return channel=="1";
    },true);
    Check(http_changed&&response.status==503&&response.body=="{\"error\":\"evidence-create-failed\"}",
        "actual application maps related guard rejection to sanitized 503");
    Check(!std::filesystem::exists(root/"guard-http/.pending-evp-v1"),"application rejected publication cleans pending");
    RecordingCatalog::EvidenceSnapshot snapshot;std::vector<ReferencedObservationV1> rows;
    Check(catalog.CaptureEvidenceObservations(hit,&rows,&snapshot,&error),"dependency snapshot before source change");
    RecordingCatalog::EvidenceSnapshot expired;bool expired_link=false;std::string expired_error;
    Check(!catalog.CaptureEvidenceObservations(hit,&rows,&expired,&expired_error,Clock::now()-std::chrono::seconds(1))&&
        expired_error=="evidence-timeout","bounded dependency capture preserves deadline");
    Check(!catalog.GuardEvidenceSnapshot(expired,[&]{expired_link=true;return true;})&&!expired_link,"invalid capture never publishes");
    std::uint64_t captured=0,checked=0;bool current=false,linked=false;
    Check(catalog.GuardEvidenceSnapshot(snapshot,[&]{linked=true;return true;},&captured,&checked,&current)&&linked&&current,
        "unchanged dependency guard invokes publication action");
    auto altered=*catalog.FindSourceBinding(hit.segment_id);altered.source_generation="different-generation";
    const auto segment=*catalog.FindSegmentV2ById(hit.segment_id);const auto path=*catalog.FindSegmentMediaLocation(hit.segment_id);
    Check(!catalog.FinalizeBoundSegmentV2(segment,altered,(path.first/path.second).string(),&error),
        "normal catalog API rejects replacing selected immutable generation/sample binding");
    auto held=reader.ResolveMedia(hit.channel_id,hit.segment_id);
    Check(held&&!catalog.MarkSegmentCorrupt(hit.segment_id,"checksum-mismatch",&error),"selected source hold prevents conflicting lifecycle mutation");held.reset();
    Check(catalog.MarkSegmentCorrupt(hit.segment_id,"checksum-mismatch",&error),"source lifecycle mutation without hold");
    linked=false;
    Check(!catalog.GuardEvidenceSnapshot(snapshot,[&]{linked=true;return true;},nullptr,nullptr,&current)&&!linked&&!current,
        "selected source state change prevents publication action");
    EvidencePackageStore store(root/"guard-corrupt",{});Check(store.Recover(&error),"corrupt source store ready");
    EvidencePackageBuilder builder(catalog,reader,store);
    Check(!builder.CreateWithObservations(hit,"structured","",&unused,&out,&error,Deadline()),"corrupt source never silently published as complete");
    RecordingCatalog::EvidenceSnapshot old;
    {RecordingRuntimeStorage previous(root/"restart-catalog");Check(previous.Open(&error)&&previous.catalog().CaptureEvidenceObservations(empty,&rows,&old,&error),"empty snapshot before real runtime destruction");}
    {RecordingRuntimeStorage restarted(root/"restart-catalog");Check(restarted.Open(&error)&&!restarted.catalog().GuardEvidenceSnapshot(old,[]{return true;}),"new catalog instance rejects old snapshot after reopen");}
}
void Seed(const std::filesystem::path& root){
    CodecChecks();std::string error;
    RecordingRuntimeStorage runtime(root/"recordings");Check(runtime.Open(&error),"real runtime storage: "+error);
    auto input=Encode(30,false,false,160,90,30,30);Shift(input,7000000000ULL);
    const std::string media_track=std::string(64,'a')+"/001";input.descriptor.tracks.front().track_id=media_track;
    for(auto& p:input.packets)p.track_id=media_track;
    {
        std::mutex mutex;std::condition_variable cv;bool got=false,geometry=false;
        auto decoder=analysis::CreateRawVideoDecoder({"fixture",input.descriptor.tracks.front()},[&](analysis::RawVideoFrame f){
            std::lock_guard lock(mutex);got=true;geometry=f.decoded_full_source_frame&&f.width==160&&f.height==90;cv.notify_one();});
        Check(decoder&&decoder->Start(&error),"actual full-frame decoder start");
        // 전체 30개를 한꺼번에 보내면 production의 leaky queue가 첫 keyframe을 버릴 수 있다.
        for(std::size_t i=0;i<2;++i)Check(decoder->PushPacket(input.packets[i],&error),"decoder input packet");
        {std::unique_lock lock(mutex);cv.wait_for(lock,std::chrono::seconds(5),[&]{return got;});}
        decoder->Stop();Check(got&&geometry,"actual decoder geometry: got="+std::to_string(got)+" full="+std::to_string(geometry)+"; detector inference not run");
    }
    GStreamerSegmentWriter writer(runtime.WriterOptions(1000));
    Check(writer.Start("1","unused",input.descriptor,[](auto,auto,auto*){return false;},&error),"writer start");
    for(const auto& p:input.packets)writer.Push(p,0);writer.Stop();
    const auto ids=runtime.catalog().FinalizedSegmentIdsForStartup();Check(ids.size()==1,"one isolated source segment");
    const auto segment=*runtime.catalog().FindSegmentV2ById(ids.front());const auto binding=*runtime.catalog().FindSourceBinding(ids.front());
    RecordingReadService reader(runtime.catalog());RecordingSearchReader search(runtime.catalog(),reader);
    std::shared_ptr<const RecordingSearchModel> model;Check(search.Refresh({"1"},{},&model,&error),"search existing sample selection");
    const auto found=std::find_if(model->documents().begin(),model->documents().end(),[&](const auto& d){return d.segment_id==ids.front()&&d.start_ns;});
    Check(found!=model->documents().end(),"source search hit");auto hit=*found;
    std::vector<std::int64_t> selected;Check(EvidencePackageBuilder::SelectSamples(hit,binding,&selected,&error)&&selected.size()==8,"unchanged uniform 8 samples");
    const auto observation=[&](std::uint64_t track,std::size_t frame,int mode){
        analysis::AnalysisResult r;r.source_key=segment.source_id;r.observation_context.source_id=segment.source_id;r.observation_context.channel_id="1";
        r.observation_namespace="synthetic-analysis-tap";r.pts=selected[frame];r.frame_width=160;r.frame_height=90;r.coordinates=Coordinates();
        const auto sample=std::find_if(binding.samples.begin(),binding.samples.end(),[&](const auto& s){return s.pts_ns==std::uint64_t(r.pts);});
        if(sample==binding.samples.end())throw std::runtime_error("fixture exact source sample missing");
        r.source_association.quality=analysis::SourceAssociationQuality::TimestampMatch;
        r.source_association.original=analysis::OriginalSampleIdentity{binding.source_generation,binding.generation_order,sample->ordinal,binding.track_id,sample->pts_ns};
        analysis::Track t;t.track_id=track;t.first_seen_pts=selected.front();t.last_seen_pts=r.pts;
        t.detection.label="synthetic-target";t.detection.score=0.75F;t.detection.box={frame==0?0.125F:0.625F,0.25F,0.25F,0.5F};
        if(mode==1){r.source_association.quality=analysis::SourceAssociationQuality::Nearest;++r.pts;t.last_seen_pts=r.pts;}
        if(mode==2)++r.source_association.original->ordinal;
        if(mode==3)r.coordinates.reset();
        if(mode==4&&frame==7)t.first_seen_pts=r.pts;
        if(mode==5)r.observation_namespace="other-analysis-tap";
        if(mode==6)++r.source_association.original->pts_ns;
        r.tracks={t};return r;
    };
    AnalysisObservationProjector::Options options;options.use_consumer_references=true;options.interval_ms=1;
    AnalysisObservationProjector projector(runtime.catalog(),options);
    for(int mode=0;mode<=6;++mode)for(auto frame:{std::size_t(0),std::size_t(7)})projector.OnResult(observation(77+mode,frame,mode));
    projector.StopAndDrain();const auto status=projector.GetStatus();
    Check(status.storage_errors==0&&status.critical_rejected==0&&status.stored>=14,"mock VA -> actual projector -> catalog, 14 stored rows: "+status.last_error);
    const auto rows=runtime.catalog().QueryReferencedObservations("1");Check(rows.size()==14,"stored rows available");
    std::string canonical;for(const auto& row:rows)canonical+=SerializeReferencedObservationV1(row)+"\n";Save(root/"rows.jsonl",canonical);
    hit.analysis_namespace="synthetic-analysis-tap";hit.track_id="track-77";
    EvidencePackageStore store(root/"packages",{});Check(store.Recover(&error),"separate package store ready");
    EvidencePackageBuilder builder(runtime.catalog(),reader,store);std::string id;EvidencePackageV1 p;
    Check(builder.CreateWithObservations(hit,"structured","",&id,&p,&error,Deadline()),"real v2 builder: "+error);
    Check(p.schema=="media-server.evidence-package.v2"&&p.frames.size()==8&&p.observation_snapshots.size()==8,"v2 selected sample snapshots");
    Check(p.track_id=="track-77"&&p.frames[0].track_id==media_track&&p.analysis_namespace=="synthetic-analysis-tap","analysis target != media track");
    Check(p.observation_snapshots[0].state=="matched"&&p.observation_snapshots[7].state=="matched"&&p.observation_snapshots[1].state=="missing","exact endpoints and optional absence");
    auto overwrite=p.observation_snapshots[0].candidates[0];overwrite.observation.coordinates->resize="letterbox";
    overwrite.observation.coordinates->input_height=640;overwrite.observation.coordinates->pad_y=140;
    Check(!runtime.catalog().PutReferencedObservation(overwrite.observation,overwrite.reference,&error),"immutable coordinate source cannot be overwritten by same observation ID");
    const auto json=SerializeEvidencePackage(p);EvidencePackageV1 roundtrip;
    Check(ParseEvidencePackage(json,&roundtrip,&error)&&SerializeEvidencePackage(roundtrip)==json,"v2 strict snapshot read");
    AssertReview(store,id);Save(root/"package-id",id);Save(root/"manifest.json",json);
    // 캡처/추출 뒤 첫 pending 쓰기 callback에서 다른 채널의 실제 확정·삭제를 완료한다.
    const auto selected_before=SerializeRecordingSegmentV2(segment)+SerializeRecordingSourceBindingV1(binding)+canonical;
    bool unrelated_finalized=false;std::string unrelated_id,unrelated_error;EvidencePackageV1 unrelated_package;
    const auto finalize_other=[&]{
        if(!unrelated_finalized&&std::filesystem::exists(root/"packages/.pending-evp-v1")){
            unrelated_finalized=true;GStreamerSegmentWriter other(runtime.WriterOptions(1000));std::string why;
            if(!other.Start("9101","unused",input.descriptor,[](auto,auto,auto*){return false;},&why))throw std::runtime_error("other-writer-start");
            for(const auto& packet:input.packets)other.Push(packet,0);other.Stop();
        }
        return false;
    };
    const bool unrelated_ok=builder.CreateWithObservations(hit,"structured","",&unrelated_id,&unrelated_package,&unrelated_error,Deadline(),finalize_other);
    std::cout<<"[invalidation] finalization="<<unrelated_finalized<<" builder="<<unrelated_ok<<" error="<<unrelated_error<<std::endl;
    Check(unrelated_finalized,"deterministic unrelated finalization after capture");
    RetentionCoordinator retention(runtime.catalog(),[&]{return runtime.catalog().RetentionSnapshot();},
        [](auto* bytes,auto*){*bytes=1024ULL*1024*1024;return true;},
        [&](const auto& path,auto* why){return RemoveContainedMediaFile(root/"recordings",path,why,{},true);},{0,1,root/"recordings"});
    bool unrelated_deleted=false;
    ingress::EvidenceApplicationService concurrent_service(runtime.catalog(),reader,true,root/"packages",0);
    const auto delete_other=[&](const auto& channel){
        if(!unrelated_deleted&&std::filesystem::exists(root/"packages/.pending-evp-v1")){
            RetentionPlanRequest request;request.channel_id="9101";request.policy.continuous_max_bytes=1;
            request.free_bytes=1024ULL*1024*1024;request.now_ms=INT64_MAX/2;
            const auto removed=retention.Apply(RetentionCoordinator::Plan(runtime.catalog().RetentionSnapshot(),request),request.now_ms);
            if(!removed.ok||removed.deleted_count!=1)throw std::runtime_error("other-retention-failed");unrelated_deleted=true;
        }
        return channel=="1";
    };
    const auto response=concurrent_service.Create(hit,"structured","",delete_other,true);
    std::cout<<"[invalidation] deletion="<<unrelated_deleted<<" applicationStatus="<<response.status<<" body="<<response.body<<std::endl;
    std::string selected_rows;for(const auto& row:runtime.catalog().QueryReferencedObservations("1"))selected_rows+=SerializeReferencedObservationV1(row)+"\n";
    Check(SerializeRecordingSegmentV2(*runtime.catalog().FindSegmentV2ById(hit.segment_id))+
        SerializeRecordingSourceBindingV1(*runtime.catalog().FindSourceBinding(hit.segment_id))+selected_rows==selected_before,
        "selected observation/source/binding bytes unchanged across unrelated mutations");
    Check(unrelated_ok&&unrelated_deleted&&response.status==201,"V450-K07 unrelated finalization/deletion must not invalidate A publication");
    const auto pristine=store.Open(id,&error);Check(bool(pristine),"verified package file");auto payloads=Payloads(*pristine);
    for(int mode=1;mode<=6;++mode){
        auto variant=hit;variant.track_id="track-"+std::to_string(77+mode);EvidencePackageV1 m;std::string variant_id;
        Check(builder.CreateWithObservations(variant,"structured","",&variant_id,&m,&error,Deadline()),"actual path non-exact/provenance case "+std::to_string(mode)+": "+error);
        const auto expected=mode==5?"missing":"unverified";
        Check(m.observation_snapshots[0].state==expected&&m.observation_snapshots[7].state==expected,"no nearest/ordinal/legacy/reuse/namespace/PTS promotion "+std::to_string(mode));
        AnalysisRecordReview result;Check(ReadAnalysisRecordReview(store,variant_id,Claims(),&result,&error)&&result.decisions[0].verdict==ReviewVerdict::Insufficient,"unverified remains insufficient "+std::to_string(mode));
        for(std::size_t i=0;i<8;++i)Check(m.frames[i].png_sha256==p.frames[i].png_sha256&&m.frames[i].sample_ordinal==p.frames[i].sample_ordinal,"sample choice and PNG invariant");
    }
    auto duplicate=p.observation_snapshots[0].candidates.front();duplicate.observation.observation_id="duplicate-observation";
    duplicate.reference.owner_id=duplicate.observation.observation_id;duplicate.reference.reference_id="duplicate-reference";
    Check(runtime.catalog().PutReferencedObservation(duplicate.observation,duplicate.reference,&error),"store duplicate exact association as distinct observation");
    EvidencePackageV1 ambiguous;std::string ambiguous_id;
    Check(builder.CreateWithObservations(hit,"structured","",&ambiguous_id,&ambiguous,&error,Deadline())&&ambiguous.observation_snapshots[0].reason=="ambiguous-observation","multiple exact observations remain ambiguous");
    for(int n=0;n<7;++n){auto bad=p;
        if(n==0)++bad.observation_snapshots[0].frame_index;
        if(n==1)bad.observation_snapshots[0].png_sha256=std::string(64,'0');
        if(n==2)bad.observation_snapshots[0].candidates[0].reference.original->ordinal++;
        if(n==3)bad.observation_snapshots[0].candidates[0].observation.analysis_namespace="wrong-namespace";
        if(n==4)bad.schema="media-server.evidence-package.v1";
        if(n==5)bad.observation_snapshots[0].candidates[0].observation.coordinates->pad_x=1;
        if(n==6)bad.observation_snapshots[0].state="missing";
        Check(!ValidateEvidencePackage(bad,&error),"tampered frame/ref/version/transform/state rejected "+std::to_string(n));
    }
    auto limit=p;limit.observation_snapshots[0].candidates.resize(5,duplicate);
    Check(!ValidateEvidencePackage(limit,&error),"per-frame candidate bound rejects overrun");
    limit=p;
    for(auto& snapshot:limit.observation_snapshots) {
        snapshot.candidates.clear();
        // 유효한 모의 row들을 동일 sample에 결속해 전체 metadata 바이트 상한만 초과시킨다.
        for(int k=0;k<4;++k) {
            auto row=p.observation_snapshots[0].candidates[0];const auto& f=p.frames[snapshot.frame_index];
            row.observation.observation_id="large-"+std::to_string(snapshot.frame_index)+"-"+std::to_string(k);
            row.reference.owner_id=row.observation.observation_id;row.reference.reference_id="ref-"+row.observation.observation_id;
            row.observation.pts=f.pts_ns;row.observation.last_seen_pts=f.pts_ns;row.reference.analysis_pts=f.pts_ns;
            row.reference.original->pts_ns=f.pts_ns;row.reference.original->ordinal=f.sample_ordinal;
            row.observation.selection_reasons={"interval"};row.observation.duration_ns.reset();row.observation.ended_reason.clear();
            for(int j=0;j<64;++j)row.observation.event_ids.push_back("event-"+std::to_string(j)+std::string(100,'a'));
            Check(ValidateReferencedObservationV1(row,&error),"bounded metadata test has valid row");
            snapshot.candidates.push_back(std::move(row));
        }
        snapshot.state="unverified";snapshot.reason="ambiguous-observation";
    }
    Check(!ValidateEvidencePackage(limit,&error)&&error=="evidence-observation-byte-limit","aggregate snapshot bytes capped, no silent truncation");
    auto poison=json;const auto where=poison.find("\"coordinates\":{");Check(where!=std::string::npos,"coordinate field exists");
    poison.insert(where+15,"\"verdict\":\"supported\",\"basis\":\"decisive\",");
    Check(!ParseEvidencePackage(poison,&roundtrip,&error),"model verdict/basis cannot enter record coordinate codec");
    std::string v1id;EvidencePackageV1 v1;
    Check(builder.Create(hit,"structured","",&v1id,&v1,&error,Deadline())&&v1.schema=="media-server.evidence-package.v1"&&v1.observation_snapshots.empty(),"existing builder still v1");
    for(std::size_t i=0;i<8;++i)Check(v1.frames[i].png_sha256==p.frames[i].png_sha256,"v1/v2 PNG bytes unchanged");
    const auto old=SerializeEvidencePackage(v1);Check(ParseEvidencePackage(old,&roundtrip,&error)&&SerializeEvidencePackage(roundtrip)==old&&old.find("observationSnapshots")==std::string::npos,"v1 roundtrip/hash input unchanged");
    VaReviewInput public_input;Check(!LoadVaReviewInput(store,id,"검토",[](const auto&){return true;},&public_input,&error)&&LoadVaReviewInput(store,v1id,"검토",[](const auto&){return true;},&public_input,&error),"public VA input remains v1 only");
    ingress::EvidenceApplicationService service(runtime.catalog(),reader,true,root/"packages",0);
    Check(service.Get(id,[](const auto&){return true;}).status==404&&service.Get(v1id,[](const auto&){return true;}).status==200,"public package route remains v1 only");
    Check(service.List({{"channelId","1"}},[](const auto&){return true;}).body.find(id)==std::string::npos,"public list excludes internal v2");
    int asset_status=0;Check(!service.Asset(id,0,[](const auto&){return true;},&asset_status)&&asset_status==404,"public asset route does not expose internal v2");
    std::vector<std::string> before,after;Check(store.ListIds(&before,&error),"list before failure injection");
    const auto sentinel=SerializeEvidencePackage(roundtrip);std::string unused="unchanged";
    Check(!builder.CreateWithObservations(hit,"structured","",&unused,&roundtrip,&error,Deadline(),[]{return true;})&&unused=="unchanged"&&SerializeEvidencePackage(roundtrip)==sentinel,"cancelled publication leaves output unchanged");
    auto cancel_manifest=p;++cancel_manifest.created_at_ms;
    Check(!store.Publish(cancel_manifest,payloads,&unused,&error,[&]{return std::filesystem::exists(root/"packages/.pending-evp-v1");}),"cancel after pending-file creation aborts atomic publication");
    bool changed=false;
    const auto mutate=[&]{
        if(!changed&&std::filesystem::exists(root/"packages/.pending-evp-v1")) {
            auto copy=duplicate;copy.observation.observation_id="mid-publication";copy.reference.owner_id="mid-publication";copy.reference.reference_id="mid-reference";
            changed=true;if(!runtime.catalog().PutReferencedObservation(copy.observation,copy.reference,&error))throw std::runtime_error("mid-publication-injection");
        }
        return false;
    };
    Check(!builder.CreateWithObservations(hit,"structured","",&unused,&roundtrip,&error,Deadline(),mutate)&&changed&&error=="evidence-source-changed","mid-publication catalog mutation rejected");
    Check(store.ListIds(&after,&error)&&before==after&&!std::filesystem::exists(root/"packages/.pending-evp-v1"),"failed publish leaves no new ID or pending file");
    const auto tamper_root=root/"tamper";std::filesystem::create_directory(tamper_root);
    const auto copy_path=tamper_root/(id+".evp");std::filesystem::copy_file(root/"packages"/(id+".evp"),copy_path);
    {std::fstream f(copy_path,std::ios::in|std::ios::out|std::ios::binary);f.seekp(24);f.put('!');}
    EvidencePackageStore corrupt(tamper_root,{});AnalysisRecordReview keep;
    Check(!ReadAnalysisRecordReview(corrupt,id,Claims(),&keep,&error),"actual package byte tamper is error, not missing observation");
    GuardCases(root,runtime,reader,hit,p,payloads);
    Check(runtime.catalog().Checkpoint(&error),"checkpoint versioned observations");
    // 부정 주입으로 추가된 행도 포함해 복구 기대 바이트를 고정한다.
    canonical.clear();for(const auto& row:runtime.catalog().QueryReferencedObservations("1"))canonical+=SerializeReferencedObservationV1(row)+"\n";Save(root/"rows.jsonl",canonical);
}
void Recover(const std::filesystem::path& root){
    std::string error;RecordingRuntimeStorage runtime(root/"recordings");Check(runtime.Open(&error),"new process catalog recovery");
    std::string actual;for(const auto& row:runtime.catalog().QueryReferencedObservations("1"))actual+=SerializeReferencedObservationV1(row)+"\n";
    Check(actual==Load(root/"rows.jsonl"),"journal/checkpoint recovery preserves original v1/v2 rows and exact provenance bytes");
}
void Independent(const std::filesystem::path& root){
    Check(!std::filesystem::exists(root/"recordings"),"original media and catalog actually absent before new reader");
    EvidencePackageStore store(root/"packages",{});const auto id=Load(root/"package-id");std::string error;
    const auto file=store.Open(id,&error);Check(file&&SerializeEvidencePackage(file->manifest())==Load(root/"manifest.json"),"independent package-only exact metadata bytes");
    AssertReview(store,id);
}
} // namespace
int main(int argc,char** argv){try{
    if(argc!=3)return 2;gst_init(nullptr,nullptr);const auto root=std::filesystem::canonical(argv[1]);
    const std::string mode=argv[2];if(mode=="seed")Seed(root);else if(mode=="recover")Recover(root);else if(mode=="readback")Independent(root);else return 2;
    std::cout<<"[result] phase="<<mode<<" checks="<<checks<<" model_calls=0 detector_inferences=0\n";return 0;
}catch(const std::exception& e){std::cerr<<"[FAIL] "<<e.what()<<std::endl;return 1;}}

// 파일 용도: 녹화 카탈로그 cutover 후보 준비 계약을 격리 smoke로 검증한다.
#include "recording/recording_catalog.h"
#include "recording/recording_cutover_candidate.h"
#include "recording/recording_cutover_stage_writer.h"
#include "recording/recording_generation_cold_mutation.h"
#define main CutoverProjectionFixtureMain
#include "recording_catalog_generation_projection_smoke.cpp"
#undef main
#include <iostream>
#include <sys/stat.h>
#include <zlib.h>
namespace recording {
struct RecordingCutoverCandidateProbe {
    static bool Prepare(RecordingCatalog& c,const RecordingCutoverFreshStage& s,const RecordingCutoverCandidateLimits& l,
        RecordingCutoverCandidate* out,RecordingCutoverCreatedFiles* files,std::string* error){return c.PrepareManagedCutoverCandidate(s,l,out,files,error);}
    static bool Unopened(const RecordingCatalog& c){return !c.opened_&&c.segments_.empty()&&c.derived_jobs_.empty();}
};
}
using namespace recording;
namespace {
unsigned failures=0;
void CCheck(unsigned group,bool ok,const char* label){std::cout<<"B04-C0"<<group<<' '<<(ok?"PASS":"FAIL")<<' '<<label<<'\n';if(!ok){++failures;std::cerr<<error<<'\n';}}
#if MEDIA_SERVER_USE_OPENSSL && MEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND
RecordingCatalog::Options CO(const std::filesystem::path& root){RecordingCatalog::Options o;o.media_root=root;o.sqlite_path=root/"recording-catalog.sqlite3";o.enable_v2_storage=true;o.prefer_sqlite=false;return o;}
RecordingCutoverCandidateLimits CL(){RecordingCutoverCandidateLimits l;l.chain={8U*1024U*1024U,10000,10000};l.snapshot_bytes=8U*1024U*1024U;l.cold_row_bytes=17U*1024U*1024U;return l;}
RecordingCutoverFreshStage Stage(const std::filesystem::path& p){std::filesystem::create_directories(p);struct stat s{};Need(::lstat(p.c_str(),&s)==0);return {p,static_cast<std::uint64_t>(s.st_dev),static_cast<std::uint64_t>(s.st_ino)};}
std::string CM(RecordingMutationType type,const std::string& id,const std::string& entity,const std::string& payload){RecordingMutationV1 m;m.mutation_type=type;m.mutation_id=id;m.entity_id=entity;m.occurred_at_ms=1;m.payload_json=payload;return SerializeRecordingMutationV1(m)+"\n";}
std::string Legacy(){const auto s=V1();return CM(RecordingMutationType::SegmentFinalized,"legacy-final","legacy","{\"segment\":"+SerializeRecordingSegmentV1(s)+",\"mediaRelpath\":\"channel/legacy.mp4\"}");}
std::string Packed(const std::string& logical){std::string packed(compressBound(logical.size()),'\0');uLongf size=packed.size();Need(compress2(reinterpret_cast<Bytef*>(packed.data()),&size,reinterpret_cast<const Bytef*>(logical.data()),logical.size(),Z_DEFAULT_COMPRESSION)==Z_OK);std::string base64(4*((size+2)/3)+1,'\0');base64.resize(EVP_EncodeBlock(reinterpret_cast<unsigned char*>(base64.data()),reinterpret_cast<const unsigned char*>(packed.data()),size));const auto crc=crc32(crc32(0,Z_NULL,0),reinterpret_cast<const Bytef*>(logical.data()),logical.size());return "{\"schema\":\"media-server.recording-compressed-mutation.v1\",\"codec\":\"zlib-base64\",\"length\":"+std::to_string(logical.size())+",\"crc32\":"+std::to_string(crc)+",\"data\":\""+base64+"\"}";}
void Original(const std::filesystem::path& root,const std::string& bytes){
    {RecordingJournal j(RecordingJournal::ManagedOptions{root,"store"});Need(j.Open(&error));}
    Write(root/"recording-v2-mutations.jsonl",bytes);Write(root/"recording-catalog.sqlite3","cache-sentinel");Write(root/"media.mp4","media-sentinel");Write(root/"media.mp4.cleanup-pending","cleanup-sentinel");
}
std::string OriginalBytes(const std::filesystem::path& root){std::string bytes;for(const char* n:{"recording-v2-mutations.jsonl",".recording-store-format","recording-catalog.sqlite3","media.mp4","media.mp4.cleanup-pending"})bytes+=Read(root/n);return bytes;}
bool Candidate(const std::filesystem::path& base,const std::string& raw,RecordingCutoverCandidate* out,RecordingCutoverCandidateLimits limits=CL()){
    const auto root=base/"original";Original(root,raw);const auto before=OriginalBytes(root);
    RecordingJournal j(RecordingJournal::ManagedOptions{root,"store"});Need(j.Open(&error));RecordingCatalog c(j,CO(root));RecordingCutoverCreatedFiles created;
    const bool result=RecordingCutoverCandidateProbe::Prepare(c,Stage(base/"stage"),limits,out,&created,&error);
    CCheck(1,OriginalBytes(root)==before&&RecordingCutoverCandidateProbe::Unopened(c),"original five files and live catalog unchanged");
    CCheck(1,!c.ExportGenerationSnapshot(out->chain,1,0,&out->snapshot,nullptr),"candidate does not open public export authority");
    return result;
}
std::string AllHistory(){
    auto input=InputValue();auto active=Active(input);const auto job_at=active.archive.rfind('{',0);(void)job_at;
    const auto last=active.archive.find_last_of('\n',active.archive.size()-2)+1;
    const auto reference_payload="{\"reference\":"+SerializeRecordingConsumerReferenceV1(input.job.intent.reference)+"}";
    std::string bytes=active.archive.substr(0,last)+CM(RecordingMutationType::ConsumerReferencePut,"reference-put","reference",reference_payload)+CM(RecordingMutationType::DerivedReferenceAccepted,"accepted","reference",reference_payload)+active.archive.substr(last);
    auto legacy=V1(),derived=legacy;derived.segment_id="derived";derived.retention_class=RecordingRetentionClass::Event;
    for(const auto& s:{legacy,derived})bytes+=CM(RecordingMutationType::SegmentFinalized,"final-"+s.segment_id,s.segment_id,"{\"segment\":"+SerializeRecordingSegmentV1(s)+",\"mediaRelpath\":\"channel/"+s.segment_id+".mp4\"}");
    auto removed=input.source.segment;removed.segment_id="removed";removed.order_request_id="removed-order";removed.order_sequence=3;
    Fixture orders;orders.Order("removed-order","removed",3);bytes+=orders.archive;
    bytes+=CM(RecordingMutationType::SegmentV2Finalized,"removed-final","removed","{\"segment\":"+SerializeRecordingSegmentV2(removed)+",\"mediaRelpath\":\"channel/removed.mp4\"}");
    RecordingSegmentStateV2 state;state.segment_id="removed";state.lifecycle=RecordingLifecycle::DeletionPending;state.reason="continuous-capacity";
    bytes+=CM(RecordingMutationType::SegmentV2State,"pending","removed",SerializeRecordingSegmentStateV2(state));
    RecordingTombstoneV2 t2;t2.tombstone_id="t2";t2.segment=removed;t2.deletion_reason=state.reason;t2.deleted_at_ms=30;
    bytes+=CM(RecordingMutationType::SegmentV2Deleted,"removed-deleted","removed",SerializeRecordingTombstoneV2(t2));
    RecordingTombstoneV1 tomb;tomb.tombstone_id="t1";tomb.segment_id="standalone";tomb.source_id="source";tomb.channel_id="channel";tomb.recorded_range={1000,2000};tomb.checksum_sha256=std::string(64,'a');tomb.deletion_reason="continuous-age";tomb.deleted_at_ms=3000;
    bytes+=CM(RecordingMutationType::DeletionCompleted,"legacy-tomb","outer-other","{\"tombstone\":"+SerializeRecordingTombstoneV1(tomb)+"}");
    AnalysisObservationV1 o;o.observation_id="obs";o.source_id="source";o.channel_id="channel";o.frame_locator.segment_id="legacy";o.frame_locator.frame={1500,500000000,1,1000000000};o.track_id="track";o.class_label="person";o.confidence=.8;o.bbox={.1,.1,.2,.3};o.selection_reason="event";o.created_at_ms=1500;
    bytes+=CM(RecordingMutationType::ObservationPut,"obs-put","outer-other","{\"observation\":"+SerializeAnalysisObservationV1(o)+"}");
    AnalysisObservationV2 v;v.observation_id="obs-v2";v.source_id="source";v.channel_id="channel";v.analysis_namespace="tap";v.stream_epoch_id="epoch";v.pts=1500000000;v.track_id="track";v.class_label="person";v.confidence=.8;v.bbox={.1,.2,.3,.4};v.selection_reasons={"track-start"};v.first_seen_pts=v.pts;v.last_seen_pts=v.pts;v.created_at_ms=1500;v.locator_reason="unresolved";
    bytes+=CM(RecordingMutationType::ObservationV2Put,"obs-v2-put","obs-v2","{\"observation\":"+SerializeAnalysisObservationV2(v)+"}");
    ReferencedObservationV1 pair;pair.observation=v;pair.observation.observation_id="referenced";pair.observation.stream_epoch_id.clear();pair.reference=input.job.intent.reference;pair.reference.reference_id="observation-reference";pair.reference.kind="observation";pair.reference.owner_id="referenced";pair.reference.analysis_pts=v.pts;pair.reference.request.reset();
    bytes+=CM(RecordingMutationType::ReferencedObservationPut,"ref-put","referenced",SerializeReferencedObservationV1(pair));
    EventRecordingLinkV1 e;e.link_id="link";e.event_id="event";e.source_id="source";e.channel_id="channel";e.stream_epoch_id="epoch";e.requested_range=UtcRangeV1{1000,2000};e.ordered_overlaps={{"legacy",{1000,2000}}};e.derived_segment_id="derived";e.time_basis="utc-ms";e.created_at_ms=1000;e.updated_at_ms=2000;e.completeness_reason="event-terminal-release-recovery-pending";
    bytes+=CM(RecordingMutationType::EventLinkCreated,"link-put","outer-other","{\"link\":"+SerializeEventRecordingLinkV1(e)+"}");return bytes;
}
void RepresentationAndJobs(const std::filesystem::path& base){
    auto input=InputValue();auto f=Active(input);
    const auto one=f.archive.find('\n')+1,two=f.archive.find('\n',one)+1;
    const auto order=f.archive.substr(0,one),bound=f.archive.substr(one,two-one),intent=f.archive.substr(two);
    const auto ref="{\"reference\":"+SerializeRecordingConsumerReferenceV1(input.job.intent.reference)+"}";
    const auto before_job=order+bound+CM(RecordingMutationType::ConsumerReferencePut,"consumer","reference",ref)+CM(RecordingMutationType::DerivedReferenceAccepted,"accept","reference",ref);
    for(bool terminal:{false,true}){
        auto job=input.job;job.state=DerivedJobState::Failed;job.failure_reason="fixture-no-files";job.cleaned_at_ms=30;
        RecordingCutoverCandidate out;const auto name=terminal?"terminal":"source-only";
        CCheck(7,Candidate(base/name,terminal?before_job+intent+CM(RecordingMutationType::DerivedJobFailed,"failed",job.intent.job_id,SerializeDerivedJobRecord(job)):order+bound,&out)&&out.projection.active_jobs.empty()&&out.projection.active_source_bindings.empty(),"inactive source and terminal job details are cold");
        if(terminal){RecordingMutationV1 detail;const auto& origin=out.projection.derived_jobs.at(job.intent.job_id).origin;
            CCheck(7,out.projection.derived_jobs.at(job.intent.job_id).summary.latest_mutation_id=="failed"&&ReadVerifiedRecordingIdentityMutation(base/name/"stage",out.projection.manifest,origin,CL().cold_row_bytes,&detail,&error)&&detail.mutation_type==RecordingMutationType::DerivedJobFailed,"terminal latest link cold raw identity matches");}
    }
    auto ready=ReadyInput().job;auto files=ready;files.state=DerivedJobState::Intent;files.ready.reset();
    Fixture output_order;const auto& output=ready.ready->outputs.front().segment;output_order.Order(output.order_request_id,output.segment_id,output.order_sequence);
    const auto ready_history=before_job+intent+CM(RecordingMutationType::DerivedJobFiles,"files",ready.intent.job_id,SerializeDerivedJobRecord(files))+output_order.archive+CM(RecordingMutationType::DerivedJobReady,"ready",ready.intent.job_id,SerializeDerivedJobRecord(ready));
    RecordingCutoverCandidate ready_out;
    CCheck(7,Candidate(base/"ready",ready_history,&ready_out)&&ready_out.projection.active_jobs.at(ready.intent.job_id).state==DerivedJobState::Ready,"Ready restores active source and current job");
    auto committed=ready;committed.state=DerivedJobState::Committed;RecordingCutoverCandidate committed_out;
    CCheck(7,Candidate(base/"committed",ready_history+CM(RecordingMutationType::DerivedJobCommitted,"committed",ready.intent.job_id,SerializeDerivedJobRecord(committed)),&committed_out)&&committed_out.projection.segments_v2.count(output.segment_id)&&committed_out.projection.media_paths.at(output.segment_id)==ready.intent.outputs.front().final_relpath,"Committed output typed identity and path restored");
    const auto wrapper=Packed(bound.substr(0,bound.size()-1));
    const auto receipt=CM(RecordingMutationType::EventLinkReceipt,"receipt","historical-event","{\"schema\":\"media-server.recording-receipt.v1\",\"originalType\":\"event_link_created\",\"originalSha256\":\""+std::string(64,'a')+"\"}");
    const auto legacy=Legacy();const auto representation="\n  "+legacy+legacy+order+wrapper+"\n"+receipt;RecordingCutoverCandidate represented;
    CCheck(3,Candidate(base/"representation",representation,&represented)&&represented.source.blank_lines==1&&represented.source.rows==5&&represented.chain.physical_rows==5,"noncanonical blank compressed receipt and physical retry accepted");
    const auto archive=Read(base/"representation"/"stage"/"evidence-1-0.jsonl");
    CCheck(3,archive==legacy+legacy+order+wrapper+"\n"+receipt,"canonical evidence preserves wrapper payload and physical retry order");
    const auto r=std::find_if(represented.chain.first_acceptances.begin(),represented.chain.first_acceptances.end(),[](const auto& v){return v.mutation_id=="receipt";});
    CCheck(3,r!=represented.chain.first_acceptances.end()&&r->first_row.identity==std::string(64,'a'),"receipt originalSha256 is identity");
    auto big=legacy;const auto at=big.find("\"payload\":{")+11;big.insert(at,"\"padding\":\""+std::string(9U*1024U*1024U,'x')+"\",");RecordingCutoverCandidate large;
    CCheck(4,Candidate(base/"large",big,&large)&&large.chain.shards==1&&large.chain.first_acceptances.front().first_archive.size>8U*1024U*1024U,"valid single row larger than chunk target retained");
}
void StageFailures(const std::filesystem::path& base){
    RecordingCutoverInputRow row;row.ordinal=0;row.canonical_bytes=Legacy();Need(ParseRecordingMutationV1(row.canonical_bytes,&row.mutation,&error));
    for(unsigned kind=0;kind<4;++kind){auto stage=Stage(base/std::to_string(kind));RecordingCutoverStageWriter writer;RecordingCutoverCreatedFiles report;Need(writer.Open(stage,"store",CL(),&report,&error));
        if(kind==0){Write(stage.path/"evidence-1-0.jsonl","foreign");CCheck(6,!writer.Append(row,&error)&&Read(stage.path/"evidence-1-0.jsonl")=="foreign"&&!report.files.empty()&&!report.files.front().created,"O_EXCL race collision preserves foreign file");continue;}
        Need(writer.Append(row,&error));
        if(kind==1){auto bytes=Read(stage.path/"evidence-1-0.jsonl");bytes[0]='[';Write(stage.path/"evidence-1-0.jsonl",bytes);}
        else if(kind==2)std::filesystem::create_hard_link(stage.path/"evidence-1-0.jsonl",stage.path/"foreign-link");
        else{std::filesystem::rename(stage.path,stage.path.string()+"-moved");std::filesystem::create_directory(stage.path);}
        RecordingIdentityChainResult chain;RecordingGenerationManifest manifest;
        CCheck(5,!writer.Finish(&chain,&manifest,&error)&&report.files.front().created,"changed archive or stage rejected with ownership report");
    }
    for(const auto& bad:{std::string("{}\n"),Legacy()+"incomplete",Legacy()+CM(RecordingMutationType::SegmentFinalized,"legacy-final","legacy","{}")}){
        static unsigned index=0;const auto root=base/("invalid-original"+std::to_string(index++));Original(root,bad);const auto before=OriginalBytes(root);RecordingJournal j(RecordingJournal::ManagedOptions{root,"store"});
        CCheck(5,!j.Open(&error)&&OriginalBytes(root)==before,"malformed incomplete or identity conflict refused by strict original Open");
    }
    for(const char* name:{"evidence-1-0.jsonl","identity-1.jsonl","snapshot-1.jsonl","active-1.jsonl"}){
        auto stage=Stage(base/(std::string("replaced-")+name));RecordingCutoverStageWriter writer;RecordingCutoverCreatedFiles report;
        Need(writer.Open(stage,"store",CL(),&report,&error));Need(writer.Append(row,&error));
        RecordingIdentityChainResult chain;RecordingGenerationManifest manifest;Need(writer.Finish(&chain,&manifest,&error));
        RecordingCatalogSnapshot snapshot;snapshot.store_id="store";snapshot.generation=manifest.generation;snapshot.cut_ordinal=manifest.cut_ordinal;snapshot.identity_head=chain.head;
        Need(writer.Snapshot(snapshot,&manifest,&error));
        const auto bytes=Read(stage.path/name);const auto previous=stage.path/(std::string(name)+"-original");
        std::filesystem::rename(stage.path/name,previous);Write(stage.path/name,bytes);
        CCheck(6,!writer.Revalidate(&error)&&Read(previous)==bytes&&Read(stage.path/name)==bytes,
            (std::string("same-byte inode replacement refused: ")+name).c_str());
    }
}
void Preconditions(const std::filesystem::path& base){
    const auto root=base/"original";RecordingJournal journal(RecordingJournal::ManagedOptions{root,"store"});Need(journal.Open(&error));
    RecordingCatalog owner(journal,CO(root));Need(owner.Open(&error));const auto before=Read(root/"recording-v2-mutations.jsonl")+Read(root/".recording-store-format");
    RecordingCutoverCreatedFiles files;RecordingCutoverCandidate out;out.source.sha256="sentinel";
    CCheck(1,!RecordingCutoverCandidateProbe::Prepare(owner,Stage(base/"opened-stage"),CL(),&out,&files,&error)&&files.files.empty()&&out.source.sha256=="sentinel","already opened Catalog cannot prepare");
    RecordingCatalog other(journal,CO(root));
    CCheck(1,!RecordingCutoverCandidateProbe::Prepare(other,Stage(base/"foreign-stage"),CL(),&out,&files,&error)&&files.files.empty(),"foreign existing attachment cannot prepare");
    auto disabled=CO(root);disabled.enable_v2_storage=false;RecordingCatalog no_v2(journal,disabled);
    CCheck(1,!RecordingCutoverCandidateProbe::Prepare(no_v2,Stage(base/"disabled-stage"),CL(),&out,&files,&error)&&files.files.empty()&&Read(root/"recording-v2-mutations.jsonl")+Read(root/".recording-store-format")==before,"missing v2 option refuses without original changes");
}
void Cases(const std::filesystem::path& base){
    RecordingCutoverCandidate all;
    const auto history=AllHistory();const bool built=Candidate(base/"all",history,&all);
    CCheck(2,built,"all domain current rows candidate");if(!built)return;
    std::set<std::string> kinds;for(const auto& row:all.snapshot.rows)kinds.insert(row.kind);
    CCheck(2,kinds.size()==16&&all.projection.segments.at("legacy").channel_id=="channel"&&all.projection.states_v2.at("removed").lifecycle==RecordingLifecycle::DeletionPending&&all.projection.tombstones_v2.at("removed").tombstone_id=="t2"&&all.projection.tombstones.at("standalone").tombstone_id=="t1","independent sixteen kinds and literal current values");
    CCheck(2,all.projection.pending_hold_counts==std::map<std::string,std::uint64_t>{{"legacy",1},{"derived",1}}&&all.chain.order_history.maximum==3&&all.projection.orders.at("order").sequence==1,"independent hold and reservation tuple");
    CCheck(7,all.projection.active_jobs.size()==1&&all.projection.active_source_bindings.count("segment")&&all.projection.source_bindings.at("segment").summary.latest_mutation_id=="bound","active job source detail and latest provenance retained");
    auto small=CL();small.archive_target_rows=1;RecordingCutoverCandidate split;
    CCheck(4,Candidate(base/"split",history,&split,small)&&split.projection.pending_hold_counts==all.projection.pending_hold_counts&&split.snapshot.rows.size()==all.snapshot.rows.size(),"same history split preserves current and holds");
    bool rows_equal=split.snapshot.rows.size()==all.snapshot.rows.size();for(std::size_t i=0;rows_equal&&i<all.snapshot.rows.size();++i)rows_equal=split.snapshot.rows[i].kind==all.snapshot.rows[i].kind&&split.snapshot.rows[i].key==all.snapshot.rows[i].key&&split.snapshot.rows[i].value_json==all.snapshot.rows[i].value_json;
    CCheck(4,rows_equal,"independent exact rows across chunk boundaries");
    std::string retries;for(unsigned i=0;i<65;++i)retries+=Legacy();RecordingCutoverCandidate many;
    CCheck(4,Candidate(base/"many",retries,&many,small)&&many.chain.shards==65&&many.chain.physical_rows==65&&many.chain.first_acceptances.size()==1&&many.chain.first_acceptances[0].occurrences==65,"65 archives retain physical retry multiplicity without total64 limit");
    RecordingCutoverCandidate malformed;malformed.source.sha256="sentinel";
    CCheck(5,!Candidate(base/"domain",Legacy()+CM(RecordingMutationType::ObservationPut,"bad","bad","{}"),&malformed)&&malformed.source.sha256=="sentinel","later domain failure keeps output and original unchanged");
    const auto root=base/"fail-original";Original(root,Legacy());const auto original=OriginalBytes(root);RecordingJournal j(RecordingJournal::ManagedOptions{root,"store"});Need(j.Open(&error));RecordingCatalog c(j,CO(root));
    for(int fault:{1,2}){RecordingCutoverCandidate out;out.source.sha256="sentinel";RecordingCutoverCreatedFiles files;RecordingCutoverStageWriter::fault=fault;
        CCheck(6,!RecordingCutoverCandidateProbe::Prepare(c,Stage(base/("fault"+std::to_string(fault))),CL(),&out,&files,&error)&&out.source.sha256=="sentinel"&&!files.files.empty()&&files.files.front().created&&OriginalBytes(root)==original,"write/fsync failure preserves report and source");}
    const auto occupied=Stage(base/"occupied");Write(occupied.path/"evidence-1-0.jsonl","foreign");RecordingCutoverCandidate out;RecordingCutoverCreatedFiles files;
    CCheck(6,!RecordingCutoverCandidateProbe::Prepare(c,occupied,CL(),&out,&files,&error)&&Read(occupied.path/"evidence-1-0.jsonl")=="foreign","nonfresh stage collision not overwritten");
    auto wrong=Stage(base/"wrong");++wrong.inode;CCheck(6,!RecordingCutoverCandidateProbe::Prepare(c,wrong,CL(),&out,&files,&error)&&files.files.empty(),"stage inode mismatch rejected");
    std::filesystem::create_directory_symlink((base/"wrong").filename(),base/"symlink");auto symlink=wrong;symlink.path=base/"symlink";
    CCheck(6,!RecordingCutoverCandidateProbe::Prepare(c,symlink,CL(),&out,&files,&error),"symlink stage rejected");
    RepresentationAndJobs(base/"more");StageFailures(base/"stage-failures");Preconditions(base/"preconditions");
    RecordingCutoverCandidate row_boundary;std::string repeated;for(unsigned i=0;i<4097;++i)repeated+=Legacy();
    CCheck(4,Candidate(base/"row-boundary",repeated,&row_boundary)&&row_boundary.chain.shards==2&&row_boundary.chain.physical_rows==4097,"default 4096 row boundary creates two shards");
    auto byte_limits=CL();byte_limits.archive_target_bytes=Legacy().size()*2;RecordingCutoverCandidate byte_boundary;
    CCheck(4,Candidate(base/"byte-boundary",Legacy()+Legacy()+Legacy(),&byte_boundary,byte_limits)&&byte_boundary.chain.shards==2,"exact byte target boundary keeps rows whole");
}
#endif
}
int main(int argc,char** argv){try{
    if(argc!=2)return 2;
    const std::filesystem::path base(argv[1]),root=base/"original",stage=base/"stage";
    std::filesystem::create_directories(stage);struct stat st{};if(stat(stage.c_str(),&st))return 2;
    RecordingJournal j(RecordingJournal::ManagedOptions{root,"store"});std::string error;
    if(!j.Open(&error)){std::cerr<<error;return 2;}
    RecordingCatalog::Options options;options.media_root=root;options.sqlite_path=root/"recording-catalog.sqlite3";options.enable_v2_storage=true;
    RecordingCatalog c(j,options);RecordingCutoverCandidate result;RecordingCutoverCreatedFiles files;
    RecordingCutoverCandidateLimits limits;limits.chain={1048576,100,100};limits.snapshot_bytes=1048576;limits.cold_row_bytes=17U*1024U*1024U;
    const bool got=RecordingCutoverCandidateProbe::Prepare(c,{stage,static_cast<std::uint64_t>(st.st_dev),static_cast<std::uint64_t>(st.st_ino)},limits,&result,&files,&error);
#if MEDIA_SERVER_USE_OPENSSL && MEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND
    const bool pass=got;std::cout<<"B04-C01 "<<(pass?"PASS":"FAIL")<<" empty managed candidate: "<<error<<'\n';
#else
    const bool pass=!got;std::cout<<"B04-C06 "<<(pass?"PASS":"FAIL")<<" unsupported\n";
#endif
    CCheck(1,RecordingCutoverCandidateProbe::Unopened(c),"candidate leaves caller unopened");
#if MEDIA_SERVER_USE_OPENSSL && MEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND
    Cases(base/"cases");
#endif
    return pass&&failures==0?0:1;
}catch(const std::exception& e){std::cerr<<"fixture: "<<e.what()<<'\n';return 2;}
}

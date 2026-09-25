// 기존 고정 생성기만 재사용하며 이전 suite main은 실행하지 않는다.
#define RECORDING_SCRATCH_MAIN CheckpointScratchFixtureMain
#include "recording_catalog_generation_scratch_smoke.cpp"
#undef RECORDING_SCRATCH_MAIN
#if MEDIA_SERVER_USE_SQLITE3
#include <sqlite3.h>
#endif
#include "recording_generation_checkpoint_sql_cases.inc"
namespace recording {
struct RecordingGenerationAppendProbe {
    static void CleanupHook(void (*hook)()){RecordingJournal::generation_cleanup_before_unlink_=hook;}
    static void Limit(RecordingJournal& j,const std::string& kind) {
        if(kind=="snapshot")j.generation_limits_.snapshot_bytes=1;
        if(kind=="shard")j.generation_limits_.identity_shard_bytes=1;
        if(kind=="archives")j.generation_limits_.identity_archives=1;
        if(kind=="ids")j.generation_limits_.identity_unique_ids=1;
        if(kind=="active")j.generation_limits_.active_bytes=1;
        if(kind=="cold")j.generation_limits_.cold_row_bytes=1;
    }
};
}
#if MEDIA_SERVER_USE_OPENSSL && MEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND
namespace {
using Links=RecordingJournalGenerationReadOnlyProbe;
RecordingCatalog::Options CO(const std::filesystem::path& root,bool writable=true) {
    RecordingCatalog::Options o(root/"recording-catalog.sqlite3",root,true);
    o.enable_v2_storage=true;o.enable_generation_writes=writable;return o;
}
void Actual(const std::filesystem::path& root,std::size_t copies=1,bool manifest_evidence=false) {
    Fixture(root);ActiveRows(root,{});
    const auto raw=SerializeRecordingMutationV1(Historical(root))+"\n";std::string archive;
    for(std::size_t i=0;i<copies;++i)archive+=raw;
    RecordingIdentityShard shard;Need(ParseRecordingIdentityShard(Read(root/"identity-2.jsonl"),&shard,&error));
    const auto first=shard.rows.front();shard.rows.clear();
    for(std::size_t i=0;i<copies;++i){auto row=first;row.offset=i*raw.size();row.global_ordinal=7+i;shard.rows.push_back(std::move(row));}
    const std::string archive_name=manifest_evidence?"evidence-2-0.jsonl":"evidence-1-0.jsonl";
    shard.archives[0]={archive_name,archive.size(),Hash(archive)};
    std::string bytes;Need(SerializeRecordingIdentityShard(shard,&bytes,&error));Write(root/"identity-2.jsonl",bytes);Write(root/archive_name,archive);
    RecordingCatalogSnapshot snapshot;Need(ParseRecordingCatalogSnapshot(Read(root/"snapshot-2.jsonl"),1024*1024,&snapshot,&error));
    snapshot.identity_head={"identity-2.jsonl",bytes.size(),Hash(bytes)};snapshot.cut_ordinal=9+copies;SaveSnapshot(root,snapshot);
    if(manifest_evidence) {
        RecordingGenerationManifest manifest;Need(ParseRecordingGenerationManifest(Read(root/"recording-generation.json"),&manifest,&error));
        manifest.evidence=shard.archives;Need(SerializeRecordingGenerationManifest(manifest,&bytes,&error));Write(root/"recording-generation.json",bytes);
    }
}
RecordingGenerationManifest Manifest(const std::filesystem::path& root) {
    RecordingGenerationManifest value;Need(ParseRecordingGenerationManifest(Read(root/"recording-generation.json"),&value,&error));return value;
}
void Rotation(const std::filesystem::path& root) {
    Actual(root);const auto original=Read(root/"evidence-1-0.jsonl"),old_snapshot=Read(root/"snapshot-2.jsonl");
    RecordingMutationLink historical,active;
    {
        RecordingJournal j(Options(root));Need(j.Open(&error));RecordingCatalog c(j,CO(root));Need(c.Open(&error));
        const auto before=Read(root/"recording-generation.json");
        Check("B03-C01",c.Checkpoint(&error)&&Read(root/"recording-generation.json")==before&&!std::filesystem::exists(root/"identity-3.jsonl"),"empty active checkpoint is a byte-preserving no-op");
        Need(Links::Link(j,"historical",&historical));Need(c.MarkSegmentCorrupt("segment","missing-media",&error));
        RecordingMutationV1 accepted;Need(ParseRecordingMutationV1(Read(root/"active-2.jsonl").substr(0,Read(root/"active-2.jsonl").size()-1),&accepted,&error));
        Need(Links::Link(j,accepted.mutation_id,&active));const auto sealed=Read(root/"active-2.jsonl");
        Check("B03-C01",c.Checkpoint(&error),"explicit writable B checkpoint rotates generation");
        const auto third=Manifest(root);
        Check("B03-C01",third.generation==3&&third.cut_ordinal==11&&third.active.name=="active-3.jsonl"&&Read(root/third.active.name).empty(),"first rotation exact generation cut and empty active");
        RecordingOrderReservationV1 order;Need(c.ReserveRecordingOrder("store","request","future","channel",&order,&error));
        Check("B03-C01",order.sequence==1&&c.Checkpoint(&error)&&Manifest(root).generation==4&&Manifest(root).cut_ordinal==12,"second rotation preserves reservation and exclusive cut");
        RecordingMutationHandle a,b;
        Check("B03-C02",Links::Get(j,historical,&a)&&Links::Get(j,active,&b)&&a->mutation_id=="historical"&&b->mutation_id==accepted.mutation_id,"same-owner links survive two rotations and active-to-sealed relocation");
        const auto pid=::fork();Need(pid>=0);if(!pid){RecordingMutationHandle value;_exit(Links::Get(j,active,&value)?1:0);}int status=0;Need(::waitpid(pid,&status,0)==pid);
        Check("B03-C02",WIFEXITED(status)&&WEXITSTATUS(status)==0,"fork rejects inherited rotated link");
        Check("B03-C01",c.FindSegmentById("segment")->lifecycle==RecordingLifecycle::Corrupt&&Read(root/"active-2.jsonl")==sealed&&Read(root/"snapshot-2.jsonl")==old_snapshot&&Read(root/"evidence-1-0.jsonl")==original,"independent current lifecycle and old bytes preserved");
        const auto size=Read(root/"active-4.jsonl").size();RecordingOrderReservationV1 retry;
        Check("B03-C05",c.ReserveRecordingOrder("store","request","future","channel",&retry,&error)&&retry.sequence==order.sequence&&Read(root/"active-4.jsonl").size()==size,"reservation retry after rotation emits no physical row");
    }
    RecordingJournal reopened(Options(root));Need(reopened.Open(&error));RecordingCatalog c(reopened,CO(root));Need(c.Open(&error));
    RecordingMutationHandle value;
    Check("B03-C02",!Links::Get(reopened,active,&value)&&!Links::Get(reopened,historical,&value),"new owner rejects prior instance links");
    Check("B03-C01",c.FindSegmentById("segment")->lifecycle==RecordingLifecycle::Corrupt&&Manifest(root).generation==4,"strict reopen restores rotated current state");
    RecordingMutationLink fresh;Need(Links::Link(reopened,"historical",&fresh));
    auto changed=original;changed[changed.size()/2]^=1;Write(root/"evidence-1-0.jsonl",changed);
    Check("B03-C02",!Links::Get(reopened,fresh,&value)&&!value,"late original archive alteration rejects cold acquisition");
}
std::filesystem::path hook_root;
void AlterIdentity(){auto bytes=Read(hook_root/"identity-3.jsonl");bytes[bytes.size()/2]^=1;Write(hook_root/"identity-3.jsonl",bytes);}
void AlterOwnedSnapshot(){auto bytes=Read(hook_root/"snapshot-3.jsonl");bytes[bytes.size()/2]^=1;Write(hook_root/"snapshot-3.jsonl",bytes);}
void Failures(const std::filesystem::path& base) {
    for(const std::string collision:{"active-3.jsonl",".recording-generation.stage"}) {
        const auto root=base/(collision=="active-3.jsonl"?"active-collision":"stage-collision");Actual(root);
        RecordingJournal j(Options(root));Need(j.Open(&error));RecordingCatalog c(j,CO(root));Need(c.Open(&error));Need(c.MarkSegmentCorrupt("segment","missing-media",&error));
        const auto previous=Read(root/"recording-generation.json"),raw=Read(root/"active-2.jsonl");Write(root/collision,"foreign-owned-collision");
        Check("B03-C03",!c.Checkpoint(&error)&&Read(root/"recording-generation.json")==previous&&Read(root/"active-2.jsonl")==raw,"pre-publication collision preserves old authority and active");
        Check("B03-C03",Read(root/collision)=="foreign-owned-collision"&&!std::filesystem::exists(root/"snapshot-3.jsonl")&&!std::filesystem::exists(root/"identity-3.jsonl"),"only owned preparations reclaimed while foreign collision preserved");
        Need(std::filesystem::remove(root/collision));
        Check("B03-C03",c.Checkpoint(&error)&&Manifest(root).generation==3,"same owner retries after explicit fixture collision removal");
    }
    {
        const auto root=base/"cleanup-changed";Actual(root);RecordingJournal j(Options(root));Need(j.Open(&error));
        RecordingCatalog c(j,CO(root));Need(c.Open(&error));Need(c.MarkSegmentCorrupt("segment","missing-media",&error));
        const auto before=Read(root/"recording-generation.json");Write(root/"active-3.jsonl","foreign-collision");
        hook_root=root;RecordingGenerationAppendProbe::CleanupHook(AlterOwnedSnapshot);
        Check("B03-C03",!c.Checkpoint(&error)&&!j.HasManagedLease()&&std::filesystem::exists(root/"snapshot-3.jsonl")&&
            Read(root/"active-3.jsonl")=="foreign-collision"&&Read(root/"recording-generation.json")==before,
            "same-inode same-size change after cleanup read preserves suspect snapshot and poisons owner");
    }
    for(bool uncertain:{false,true}) {
        const auto root=base/(uncertain?"uncertain":"identity-change");Actual(root);std::string previous;
        {
            RecordingJournal j(Options(root));Need(j.Open(&error));RecordingCatalog c(j,CO(root));Need(c.Open(&error));Need(c.MarkSegmentCorrupt("segment","missing-media",&error));previous=Read(root/"recording-generation.json");
            if(uncertain)RecordingGenerationFailNextDirectorySyncForTest();else {hook_root=root;RecordingGenerationCheckpointBeforeBindingForTest(AlterIdentity);}
            Check("B03-C03",!c.Checkpoint(&error)&&!j.HasManagedLease()&&!c.Checkpoint(&error),uncertain?"post-rename directory failure poisons owner":"identity changed after stage fsync rejects publication and preserves suspect file");
            Check("B03-C03",uncertain?Manifest(root).generation==3:Read(root/"recording-generation.json")==previous,"published uncertainty versus not-published authority distinguished");
        }
        RecordingJournal j(Options(root));Check("B03-C03",j.Open(&error),"new owner strictly opens selected manifest after failure");
    }
    const auto root=base/"partial";Actual(root);Write(root/"active-2.jsonl","{");const auto original=Read(root/"active-2.jsonl");RecordingJournal j(Options(root));
    Check("B03-C03",!j.Open(&error)&&Read(root/"active-2.jsonl")==original,"partial active tail is never automatically truncated");
}
void Cost(const std::filesystem::path& base) {
    std::uint64_t prior_serializes=0;
    for(const std::size_t copies:{1U,4096U}) {
        const auto root=base/std::to_string(copies);Actual(root,copies,true);const auto archive=Read(root/"evidence-2-0.jsonl");
        auto options=Options(root);options.generation_limits.identity_shard_bytes=8*1024*1024;
        RecordingJournal j(options);Need(j.Open(&error));RecordingCatalog c(j,CO(root));Need(c.Open(&error));Need(c.MarkSegmentCorrupt("segment","missing-media",&error));
        RecordingGenerationArchiveReadsForTest(true);RecordingMutationCodecCountsForTest(nullptr,nullptr,true);
        Need(c.Checkpoint(&error));std::uint64_t parses=0,serializes=0;RecordingMutationCodecCountsForTest(&parses,&serializes);
        const auto reads=RecordingGenerationArchiveReadsForTest();
        std::cout<<"[cost] history_bytes="<<archive.size()<<" archive_reads="<<reads<<" envelope_parses="<<parses<<" envelope_serializes="<<serializes<<'\n';
        Check("B03-C04",reads==0&&parses==0&&serializes==1&&(copies==1||serializes==prior_serializes)&&Read(root/"evidence-2-0.jsonl")==archive,"fixed current and delta avoid predecessor evidence read parse and serialization as complete history grows");prior_serializes=serializes;
    }
}
void Admission(const std::filesystem::path& root) {
    Actual(root);auto options=Options(root);options.generation_limits.active_bytes=512;
    RecordingJournal j(options);Need(j.Open(&error));RecordingCatalog c(j,CO(root));Need(c.Open(&error));
    RecordingOrderReservationV1 order;
    for(int i=0;i<5;++i)Need(c.ReserveRecordingOrder("store","r"+std::to_string(i),"s"+std::to_string(i),"channel",&order,&error));
    Check("B03-C05",order.sequence==5&&Manifest(root).generation>2&&Read(root/Manifest(root).active.name).size()<=512,"active admission rotates before next valid reservation write");
    const auto original=Read(root/"recording-generation.json"),active=Read(root/Manifest(root).active.name);
    Check("B03-C05",!c.ReserveRecordingOrder("other","invalid","new","channel",&order,&error)&&!c.ReserveRecordingOrder("store",std::string(2048,'r'),"new","channel",&order,&error)&&Read(root/"recording-generation.json")==original&&Read(root/Manifest(root).active.name)==active,"invalid store and opaque ID length are rejected without rotation or append");
}
void Threshold(const std::filesystem::path& root) {
    Actual(root);auto options=Options(root);options.generation_limits.active_bytes=2*1024*1024;
    options.generation_limits.cold_row_bytes=2*1024*1024;options.generation_limits.snapshot_bytes=4*1024*1024;
    RecordingJournal j(options);Need(j.Open(&error));RecordingCatalog c(j,CO(root));Need(c.Open(&error));
    auto segment=ProjectionV1();segment.audio_omitted_reason=std::string(1024*1024,'a');Need(ValidateRecordingSegmentV1(segment,&error));
    std::filesystem::create_directories(root/"channel");Write(root/"channel/legacy.mp4","owned-media");
    Need(c.FinalizeSegment(segment,(root/"channel/legacy.mp4").string(),&error));
    const auto sealed=Read(root/"active-2.jsonl"),before=Read(root/"recording-generation.json");
    Check("B03-C05",sealed.size()>1024*1024&&!c.MarkSegmentCorrupt("absent","missing-media",&error)&&Read(root/"recording-generation.json")==before,"invalid domain above automatic threshold does not rotate");
    RecordingOrderReservationV1 order;
    Check("B03-C01",c.ReserveRecordingOrder("store","threshold","future","channel",&order,&error)&&Manifest(root).generation==3&&
        Manifest(root).cut_ordinal==11&&Read(root/"active-2.jsonl")==sealed&&!Read(root/"active-3.jsonl").empty(),"one MiB threshold rotates before valid next row without rewriting sealed bytes");
    const auto current=c.FindSegmentById("legacy");
    Check("B03-C01",current&&current->audio_omitted_reason==segment.audio_omitted_reason&&current->segment_id=="legacy","large supported plain current row is preserved through automatic rotation");
}
void Limits(const std::filesystem::path& base) {
    for(const std::string kind:{"snapshot","shard","archives","ids","ordinal","active","cold"}) {
        const auto root=base/kind;Actual(root);
        if(kind=="ordinal") {
            RecordingCatalogSnapshot snapshot;Need(ParseRecordingCatalogSnapshot(Read(root/"snapshot-2.jsonl"),1024*1024,&snapshot,&error));
            snapshot.cut_ordinal=UINT64_MAX;SaveSnapshot(root,snapshot);
            auto manifest=Manifest(root);manifest.cut_ordinal=UINT64_MAX;std::string bytes;
            Need(SerializeRecordingGenerationManifest(manifest,&bytes,&error));Write(root/"recording-generation.json",bytes);
        }
        RecordingJournal j(Options(root));Need(j.Open(&error));RecordingCatalog c(j,CO(root));Need(c.Open(&error));
        const bool append=kind=="ids"||kind=="ordinal"||kind=="active"||kind=="cold";
        if(!append)Need(c.MarkSegmentCorrupt("segment","missing-media",&error));
        const auto previous=Read(root/"recording-generation.json"),active=Read(root/"active-2.jsonl");
        RecordingGenerationAppendProbe::Limit(j,kind);
        const bool ok=append?c.MarkSegmentCorrupt("segment","missing-media",&error):c.Checkpoint(&error);
        Check("B03-C05",!ok&&Read(root/"recording-generation.json")==previous&&Read(root/"active-2.jsonl")==active&&
            !std::filesystem::exists(root/"identity-3.jsonl"),("prepublication admission remains nondurable: "+kind).c_str());
    }
}
void Jobs(const std::filesystem::path& base) {
    for(bool committed:{false,true}) {
        const auto root=base/(committed?"committed":"ready");auto input=ReadyInput();
        if(committed)input.job.state=DerivedJobState::Committed;
        auto f=Active(input);const auto& segment=input.job.ready->outputs.front().segment;
        if(committed){f.Row("segment-v2",segment.segment_id,SerializeRecordingSegmentV2(segment));f.Row("media-path",segment.segment_id,"\""+input.job.intent.outputs[0].final_relpath+"\"");}
        Install(f,root);
        {
            RecordingJournal j(Options(root));Need(j.Open(&error));RecordingCatalog c(j,CO(root));Need(c.Open(&error));
            RecordingMutationLink source,job;Need(Links::Link(j,"bound",&source)&&Links::Link(j,"job-mutation",&job));
            RecordingOrderReservationV1 order;Need(c.ReserveRecordingOrder("store","next","future","channel",&order,&error));Need(c.Checkpoint(&error));
            std::optional<DerivedJobRecordV1> value;RecordingMutationHandle a,b;
            Check("B03-C05",order.sequence==3&&c.FindDerivedJob(input.job.intent.job_id,&value,&error)&&value&&value->state==input.job.state&&
                Links::Get(j,source,&a)&&Links::Get(j,job,&b)&&c.FindSourceBinding("segment").has_value(),"Ready/Committed source detail and job links survive rotation");
            Check("B03-C05",!committed||c.FindSegmentV2ById(segment.segment_id)->order_sequence==2,"Committed typed output keeps reserved ordinal independently");
        }
        RecordingJournal j(Options(root));Need(j.Open(&error));RecordingCatalog c(j,CO(root));std::optional<DerivedJobRecordV1> value;
        Check("B03-C05",c.Open(&error)&&c.FindDerivedJob(input.job.intent.job_id,&value,&error)&&value&&value->state==input.job.state,"strict reopen preserves active job stage and cold source closure");
    }
    // 기존 통과한 두 source 생성기의 요청/미디어 구간을 그대로 사용한다.
    auto input=InputValue();auto first=input.source,second=input.source;
    first.segment.segment_id="z-first";first.segment.order_request_id="first-order";first.segment.media_end_pts=10000000;
    first.segment.mappings[0].end_pts=10000000;first.segment.mappings[0].utc_end_ns=110000000;
    first.binding->segment_id="z-first";first.binding->samples={{1,0}};first.binding->last_accepted_ordinal=1;
    second.segment.segment_id="a-second";second.segment.order_request_id="second-order";second.segment.order_sequence=2;second.segment.media_start_pts=10000000;
    second.segment.mappings[0].start_pts=10000000;second.segment.mappings[0].utc_start_ns=110000000;second.binding->segment_id="a-second";second.binding->samples={{2,10000000}};
    analysis::DecodedIntervalCollector collector;
    for(int i=0;i<2;++i){analysis::DecodedIntervalEvidence e;e.analysis_pts_ns=i*10000000;e.duration_ns=10000000;
        e.association={analysis::SourceAssociationQuality::TimestampMatch,analysis::OriginalSampleIdentity{"gen",1,static_cast<std::uint64_t>(i+1),"video/0",static_cast<std::uint64_t>(i*10000000)}};collector.Append(e);}
    DerivedRecordingSelection selection;DerivedJobRecordV1 job;
    Need(SelectDerivedRecording(input.job.intent.reference,*collector.Snapshot("tap"),{second,first},nullptr,&selection,&error));
    Need(BuildDerivedJobIntent(selection,{second,first},4096,10,&job.intent,&error));ProjectionFixture f;
    for(const auto& source:{first,second}) {
        const auto& s=source.segment;const auto& b=*source.binding;const auto id="bound-"+s.segment_id;
        f.Order(s.order_request_id,s.segment_id,s.order_sequence);
        f.Add(RecordingMutationType::SegmentV2BoundFinalized,id,s.segment_id,"{\"segment\":"+SerializeRecordingSegmentV2(s)+",\"mediaRelpath\":\"channel/"+s.segment_id+".mp4\",\"sourceBinding\":"+SerializeRecordingSourceBindingV1(b)+"}");
        f.Row("segment-v2",s.segment_id,SerializeRecordingSegmentV2(s));f.Row("media-path",s.segment_id,"\"channel/"+s.segment_id+".mp4\"");std::string bytes;
        Need(SerializeRecordingCatalogSourceSummary({s.segment_id,"channel","source","gen","video/0",1,1,id},&bytes,&error));f.Row("source-binding",s.segment_id,bytes);
    }
    f.Add(RecordingMutationType::DerivedJobIntent,"multi-job",job.intent.job_id,SerializeDerivedJobRecord(job));
    RecordingCatalogJobSummary summary{job.intent.job_id,"channel","reference",DerivedJobState::Intent,0,4096,{}, {},"multi-job"};
    for(const auto& source:job.intent.sources)summary.source_ids.push_back(source.segment.segment_id);
    for(const auto& output:job.intent.outputs)summary.output_ids.push_back(output.output_id);
    std::string bytes;Need(SerializeRecordingCatalogJobSummary(summary,&bytes,&error));f.Row("derived-job",summary.id,bytes);
    f.Row("consumer-reference","reference",SerializeRecordingConsumerReferenceV1(job.intent.reference));f.Row("derived-reference-accepted","reference","true");
    const auto root=base/"multiple";Install(f,root);
    {
        RecordingJournal j(Options(root));Need(j.Open(&error));RecordingCatalog c(j,CO(root));Need(c.Open(&error));RecordingOrderReservationV1 order;
        for(const auto& output:job.intent.outputs)Need(c.ReserveRecordingOrder("store",output.order_request_id,output.output_id,"channel",&order,&error));
        Need(c.Checkpoint(&error));std::optional<DerivedJobRecordV1> value;
        Check("B03-C05",order.sequence==4&&c.FindDerivedJob(job.intent.job_id,&value,&error)&&value&&value->intent.outputs.size()==2&&
            value->intent.sources[0].segment.segment_id=="z-first"&&value->intent.sources[1].segment.segment_id=="a-second"&&
            value->intent.outputs[0].output_id==job.intent.outputs[0].output_id&&value->intent.outputs[1].output_id==job.intent.outputs[1].output_id,
            "two planned outputs and meaningful source order survive reservation rotation");
    }
    RecordingJournal j(Options(root));Need(j.Open(&error));RecordingCatalog c(j,CO(root));std::optional<DerivedJobRecordV1> value;
    Check("B03-C05",c.Open(&error)&&c.FindDerivedJob(job.intent.job_id,&value,&error)&&value&&value->intent.outputs.size()==2,"new owner restores multi-output active job and reservations");
}
}
#endif
int main(int argc,char** argv) {
    if(argc!=2)return 2;
    try {
        const std::filesystem::path root(argv[1]);std::filesystem::create_directories(root);
#if MEDIA_SERVER_USE_OPENSSL && MEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND
        Rotation(root/"rotate");Failures(root/"failures");Cost(root/"cost");Admission(root/"admission");Threshold(root/"threshold");Limits(root/"limits");Jobs(root/"jobs");SQL_CHECKPOINT_CASES::Run(root);
#else
        Write(root/".recording-store-format",Marker());RecordingJournal journal(Options(root));
        Check("B03-C06",!journal.Open(&error),"unsupported B remains closed");
#endif
        V1(root/"v1","B03-C06");
        return failures?1:0;
    }catch(const std::exception& e){std::cerr<<e.what()<<'\n';return 2;}
}

// 파일 용도: 녹화 세대 consumer 참조와 보존 경계를 smoke로 검증한다.
// 기존 고정 fixture 생성기만 재사용하고 이전 suite는 실행하지 않는다.
#define RECORDING_SCRATCH_MAIN ConsumersScratchFixtureMain
#include "recording_catalog_generation_scratch_smoke.cpp"
#undef RECORDING_SCRATCH_MAIN
#if MEDIA_SERVER_USE_SQLITE3
#include <sqlite3.h>
#endif
#include "recording/recording_read_service.h"
#include "../../src/recording/recording_catalog_history.h"
#include <sys/wait.h>
#include <unistd.h>
namespace recording {
struct RecordingGenerationConsumersProbe {
    using JobHandle=std::shared_ptr<const DerivedJobRecordV1>;
    static std::size_t ResidentJobs(const RecordingCatalog& c){return c.derived_jobs_.size();}
    static std::uint64_t ColdJobs(const RecordingCatalog& c){return c.completed_history_?c.completed_history_->Count("derived-job"):0;}
    static JobHandle Job(const RecordingCatalog& c,const std::string& id){JobHandle value;return c.AcquireDerivedJobOwnedLocked(id,&value,&error)?value:JobHandle{};}
    static bool AppendJob(RecordingCatalog& c,const DerivedJobRecordV1& job,const std::string& mutation_id){
        RecordingMutationV1 mutation;mutation.mutation_id=mutation_id;mutation.entity_id=job.intent.job_id;
        mutation.mutation_type=job.state==DerivedJobState::Complete?RecordingMutationType::DerivedJobComplete:RecordingMutationType::DerivedJobFailed;
        mutation.occurred_at_ms=40;mutation.payload_json=SerializeDerivedJobRecord(job);
        return c.AppendAndApplyLocked(std::move(mutation),&error);
    }
    static auto Holds(const RecordingCatalog& c){return c.hold_counts_;}
    static void Hold(RecordingCatalog& c,std::uint64_t count){c.hold_counts_["legacy"]=count;}
    static sqlite3* Db(RecordingCatalog& c){return c.generation_sqlite_db_;}
    static bool Guard(RecordingJournal& j,const void* owner){return j.CommitGenerationProtection(owner,[]{return true;},&error);}
    static bool Probe(const RecordingJournal& j,bool* pending){return j.ProbeManagedRuntime(pending,&error);}
    static bool ValidateDerivedSources(const RecordingCatalog& c,const DerivedJobIntentV1& job){return c.ValidateDerivedJobSourcesLocked(job,&error);}
    static bool RetiredOnly(const RecordingCatalog& c,const std::string& id){return c.RetiredLocked(id).has_value()&&
        (c.completed_history_?(c.retired_v2_.empty()&&c.retired_v2_links_.empty()):(c.retired_v2_.count(id)==1&&c.retired_v2_links_.count(id)==1))&&
        !c.segments_v2_.count(id)&&!c.tombstones_v2_.count(id)&&!c.states_v2_.count(id)&&!c.media_relpaths_.count(id)&&!c.deletion_reasons_.count(id);}
};
}
using ConsumerProbe=RecordingGenerationConsumersProbe;
namespace {
RecordingCatalog::Options ConsumerOptions(const std::filesystem::path& root,bool write=true,bool sql=true){RecordingCatalog::Options o(root/"recording-catalog.sqlite3",root,sql);o.enable_v2_storage=true;o.enable_generation_writes=write;return o;}
void ProbeCases(const std::filesystem::path& base){
    bool pending=true;RecordingJournal absent(Options(base/"absent"/"root"));
    Check("B05-P03",ConsumerProbe::Probe(absent,&pending)&&!pending&&!std::filesystem::exists(base/"absent"),"runtime probe missing parents is read-only absence");
    const auto root=base/"probe";std::filesystem::create_directories(root);RecordingJournal journal(Options(root));
    Check("B05-P03",ConsumerProbe::Probe(journal,&pending)&&!pending,"runtime probe empty safe root");
    Write(root/".recording-generation-transaction.stage","owned incomplete receipt");
    Check("B05-P03",ConsumerProbe::Probe(journal,&pending)&&pending,"runtime probe fixed temp requires recovery without interpreting bytes");
    Need(std::filesystem::remove(root/".recording-generation-transaction.stage"));Need(::symlink("missing",(root/".recording-generation-transaction.json").c_str())==0);
    Check("B05-P03",ConsumerProbe::Probe(journal,&pending)&&pending,"runtime probe nofollow receipt symlink is pending, not absence");
    Need(::symlink(root.c_str(),(base/"alias").c_str())==0);RecordingJournal alias(Options(base/"alias"));pending=true;
    Check("B05-P03",!ConsumerProbe::Probe(alias,&pending)&&pending,"runtime probe rejects arbitrary root symlink and preserves output");
    Write(base/"not-directory","x");RecordingJournal nondirectory(Options(base/"not-directory"/"root"));
    Check("B05-P03",!ConsumerProbe::Probe(nondirectory,&pending),"runtime probe ENOTDIR is not absence");
}
#if MEDIA_SERVER_USE_OPENSSL && MEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND
void Setup(const std::filesystem::path& root){Fixture(root);ActiveRows(root,{});std::filesystem::create_directories(root/"channel");Write(root/"channel/legacy.mp4",std::string(12,'x'));}
std::uint64_t Holds(const RecordingCatalog& c){const auto counts=ConsumerProbe::Holds(c);const auto found=counts.find("legacy");return found==counts.end()?0:found->second;}
#if MEDIA_SERVER_USE_SQLITE3
void Sql(sqlite3* db,const char* sql){Need(sqlite3_exec(db,sql,nullptr,nullptr,nullptr)==SQLITE_OK);}
std::string Scalar(sqlite3* db,const char* sql){sqlite3_stmt* q=nullptr;Need(sqlite3_prepare_v2(db,sql,-1,&q,nullptr)==SQLITE_OK);Need(sqlite3_step(q)==SQLITE_ROW);const auto* p=sqlite3_column_text(q,0);const std::string value=p?reinterpret_cast<const char*>(p):"";sqlite3_finalize(q);return value;}
int RejectCommit(void*){return 1;}
std::filesystem::path tamper_marker;
void TamperMarker(sqlite3_context* context,int,sqlite3_value**){std::ofstream out(tamper_marker);out<<"owned SQL-step marker tamper\n";out.close();sqlite3_result_int(context,1);}
#endif
void Finalize(const std::filesystem::path& root,bool sql){
    Setup(root);const auto marker=Read(root/".recording-store-format"),manifest=Read(root/"recording-generation.json");
    {RecordingJournal journal(Options(root));Need(journal.Open(&error));RecordingCatalog c(journal,ConsumerOptions(root,true,sql));Need(c.Open(&error));
        Check("B05-P01",c.FinalizeSegmentWithHold(ProjectionV1(),(root/"channel/legacy.mp4").string(),&error)&&Holds(c)==1,"B durable finalize/current/hold succeeds as one protected operation");
        const auto bytes=Read(root/"active-2.jsonl");Check("B05-P01",!bytes.empty()&&!c.RequestDeletion("legacy","continuous-age",&error)&&Read(root/"active-2.jsonl")==bytes,"initial hold prevents deletion without another mutation");
#if MEDIA_SERVER_USE_SQLITE3
        if(auto* db=ConsumerProbe::Db(c))Check("B05-P01",Scalar(db,"SELECT count FROM b_hold WHERE id='legacy'")=="1"&&Scalar(db,"SELECT count(*) FROM b_current WHERE kind='segment-v1' AND id='legacy'")=="1","same SQL transaction contains exact segment and hold");
#endif
        Need(c.AdjustHoldCount("legacy",-1,&error));RecordingReadService read(c);auto media=read.ResolveMedia("channel","legacy");
        Check("B05-P05",media&&Holds(c)==1&&!c.RequestDeletion("legacy","continuous-age",&error),"actual playback handle protects deletion");media.reset();
        EventSourceLease lease;Check("B05-P05",c.AcquireEventSourceLease("channel","epoch",{"legacy"},&lease,&error)&&Holds(c)==1&&!c.RequestDeletion("legacy","continuous-age",&error),"actual event source lease protects deletion");Need(c.ReleaseEventSourceLease(lease,&error));
        auto pinned=ProjectionV1();pinned.segment_id="pinned";pinned.pinned=true;Write(root/"channel/pinned.mp4",std::string(12,'p'));Need(c.FinalizeSegment(pinned,(root/"channel/pinned.mp4").string(),&error));
        RetentionPlanRequest request;request.channel_id="channel";request.now_ms=10000;request.policy.continuous_max_age_ms=1;
        const auto plan=RetentionCoordinator::Plan(c.RetentionSnapshot(),request);
        Check("B05-P05",!plan.deletions.empty()&&plan.deletions.front().candidate.Id()=="legacy"&&std::none_of(plan.deletions.begin(),plan.deletions.end(),[](const auto& item){return item.candidate.Id()=="pinned";})&&!c.RequestDeletion("pinned","continuous-age",&error),"release makes oldest eligible with deterministic ID tie-break while pin remains protected");
        RecordingOrderReservationV1 order,retry;const auto raw=Read(root/"active-2.jsonl");
        Check("B05-P04",!journal.ReserveRecordingOrder("store","raw","raw-output","channel",&order,&error)&&Read(root/"active-2.jsonl")==raw,"raw B Journal reservation remains refused");
        Check("B05-P04",c.ReserveRecordingOrder("store","consumer-order","consumer-output","channel",&order,&error),"Catalog reservation publishes B consumer order");const auto reserved=Read(root/"active-2.jsonl");
        Check("B05-P04",c.ReserveRecordingOrder("store","consumer-order","consumer-output","channel",&retry,&error)&&order.store_id==retry.store_id&&order.request_id==retry.request_id&&order.segment_id==retry.segment_id&&order.channel_id==retry.channel_id&&order.sequence==retry.sequence&&Read(root/"active-2.jsonl")==reserved,"consumer tuple retry preserves ID sequence time and bytes");
    }
    RecordingJournal journal(Options(root));Need(journal.Open(&error));RecordingCatalog c(journal,ConsumerOptions(root,false,sql));
    Check("B05-P01",c.Open(&error)&&c.FindSegmentById("legacy").has_value()&&Holds(c)==0,"strict reopen restores durable finalize, not expired temporary hold");
    Check("B05-P02",c.AdjustHoldCount("legacy",1,&error)&&Holds(c)==1&&c.AdjustHoldCount("legacy",-1,&error),"readonly B permits temporary acquire and release");
    const auto counts=ConsumerProbe::Holds(c);Check("B05-P02",!c.AdjustHoldCount("legacy",-1,&error)&&ConsumerProbe::Holds(c)==counts,"underflow does not insert zero or change memory");
    Need(c.AdjustHoldCount("legacy",INT64_MAX,&error));const auto maximum=ConsumerProbe::Holds(c);
    Check("B05-P02",!c.AdjustHoldCount("legacy",1,&error)&&ConsumerProbe::Holds(c)==maximum,"overflow leaves readonly count unchanged");Need(c.AdjustHoldCount("legacy",-INT64_MAX,&error));
    Check("B05-P01",Read(root/".recording-store-format")==marker&&Read(root/"recording-generation.json")==manifest,"finalize holds never modify marker or immutable generation");
}
void Overflow(const std::filesystem::path& root){Setup(root);RecordingJournal j(Options(root));Need(j.Open(&error));RecordingCatalog c(j,ConsumerOptions(root));Need(c.Open(&error));ConsumerProbe::Hold(c,INT64_MAX);const auto before=Read(root/"active-2.jsonl");Check("B05-P01",!c.FinalizeSegmentWithHold(ProjectionV1(),(root/"channel/legacy.mp4").string(),&error)&&Read(root/"active-2.jsonl")==before&&Holds(c)==INT64_MAX&&!c.FindSegmentById("legacy"),"finalize hold overflow rejected before durable write/current apply");}
void Authority(const std::filesystem::path& root,unsigned variant){
    Setup(root);RecordingJournal j(Options(root));Need(j.Open(&error));RecordingCatalog c(j,ConsumerOptions(root));Need(c.Open(&error));Need(c.FinalizeSegment(ProjectionV1(),(root/"channel/legacy.mp4").string(),&error));
    const auto bytes=Read(root/"active-2.jsonl");const auto counts=ConsumerProbe::Holds(c);
    if(variant==0){Write(root/"foreign-sidecar","owned sentinel");Need(::symlink((root/"foreign-sidecar").c_str(),(root/"recording-generation-catalog.sqlite3-journal").c_str())==0);}
    if(variant==1)Write(root/".recording-generation-transaction.stage","pending transaction fixture");
    if(variant==2){const auto marker=Read(root/".recording-store-format");std::filesystem::rename(root/".recording-store-format",root/"old-marker");Write(root/".recording-store-format",marker);}
    if(variant==3){const int foreign=0;Check("B05-P03",!ConsumerProbe::Guard(j,&foreign),"foreign attachment cannot commit temporary protection");}
    Check("B05-P03",!c.AdjustHoldCount("legacy",1,&error)&&ConsumerProbe::Holds(c)==counts&&Read(root/"active-2.jsonl")==bytes&&!j.HasManagedLease(),"authority error preserves count/active and poisons owner");
}
void Fork(const std::filesystem::path& root){Setup(root);RecordingJournal j(Options(root));Need(j.Open(&error));RecordingCatalog c(j,ConsumerOptions(root));Need(c.Open(&error));Need(c.FinalizeSegment(ProjectionV1(),(root/"channel/legacy.mp4").string(),&error));
    const auto pid=::fork();Need(pid>=0);if(pid==0){bool pending=false;::_exit(!ConsumerProbe::Probe(j,&pending)&&!c.AdjustHoldCount("legacy",1,&error)?0:1);}int status=0;Need(::waitpid(pid,&status,0)==pid);
    Check("B05-P03",WIFEXITED(status)&&WEXITSTATUS(status)==0&&c.AdjustHoldCount("legacy",1,&error),"forked opened owner refuses probe/hold; parent remains usable");
}
void Legacy(const std::filesystem::path& root){std::filesystem::create_directories(root);RecordingJournal j(RecordingJournal::ManagedOptions{root,"store"});Need(j.Open(&error));RecordingCatalog c(j,ConsumerOptions(root));Need(c.Open(&error));Write(root/"legacy.mp4",std::string(12,'x'));
    Check("B05-P01",c.FinalizeSegmentWithHold(ProjectionV1(),(root/"legacy.mp4").string(),&error)&&Holds(c)==1&&c.AdjustHoldCount("legacy",-1,&error),"managed v1 finalize/hold meaning preserved");
    RecordingOrderReservationV1 a,b;Need(c.ReserveRecordingOrder("store","v1-order","v1-output","channel",&a,&error));const auto before=Read(j.path());
    Check("B05-P04",j.ReserveRecordingOrder("store","v1-order","v1-output","channel",&b,&error)&&a.sequence==b.sequence&&Read(j.path())==before,"v1 Catalog reservation delegates to unchanged Journal tuple retry");
}
void Tombstone(const std::filesystem::path& root){Setup(root);RecordingJournal j(Options(root));Need(j.Open(&error));RecordingCatalog c(j,ConsumerOptions(root));Need(c.Open(&error));Need(c.FinalizeSegmentWithHold(ProjectionV1(),(root/"channel/legacy.mp4").string(),&error));Need(c.AdjustHoldCount("legacy",-1,&error));Need(c.RequestDeletion("legacy","continuous-age",&error));
    RecordingTombstoneV1 tomb;tomb.tombstone_id="consumer-deleted";tomb.segment_id="legacy";tomb.source_id="source";tomb.channel_id="channel";tomb.recorded_range={1000,2000};tomb.checksum_sha256=std::string(64,'a');tomb.retention_class=RecordingRetentionClass::Continuous;tomb.deletion_reason="continuous-age";tomb.deleted_at_ms=3000;
    RecordingReadService read(c);Check("B05-P05",c.CompleteDeletion(tomb,&error)&&c.IsDeletedSegmentId("legacy")&&!read.ResolveMedia("channel","legacy")&&!c.FinalizeSegmentWithHold(ProjectionV1(),(root/"channel/legacy.mp4").string(),&error),"released deletion tombstone blocks playback and ID reuse even with media file remaining");
}
void ColdReference(const std::filesystem::path& root){
    const auto input=InputValue();auto f=Active(input);f.snapshot.rows.erase(std::remove_if(f.snapshot.rows.begin(),f.snapshot.rows.end(),[](const auto& r){return r.kind=="derived-job"||(r.kind=="accepted-state"&&r.key=="job-mutation");}),f.snapshot.rows.end());
    f.chain.first_acceptances.pop_back();f.chain.maximum_global_ordinal=1;f.chain.physical_rows=2;f.archive.resize(f.chain.first_acceptances.back().first_row.offset+f.chain.first_acceptances.back().first_row.length);Install(f,root);
    RecordingJournal j(Options(root));Need(j.Open(&error));RecordingCatalog c(j,ConsumerOptions(root));Need(c.Open(&error));
    Check("B05-P05",c.FindSourceBinding("segment").has_value()&&c.PutConsumerReference(input.job.intent.reference,&error),"actual cold source and consumer reference accepted under verified owner");
    RecordingReadService read(c);ConsumerReferenceResolution resolution;
    Check("B05-P05",read.ResolveConsumerReference(input.job.intent.reference,&resolution,&error),"actual read consumer resolves stored typed reference");
    auto archive=Read(root/"evidence-1-0.jsonl");archive[archive.size()/2]^=1;Write(root/"evidence-1-0.jsonl",archive);
    Check("B05-P05",!c.FindSourceBinding("segment")&&!j.HasManagedLease(),"changed cold source archive fails at detail use and loses authority");
}
void RetiredReference(const std::filesystem::path& root,bool sql,bool complete=false){
    auto input=complete?ReadyInput():InputValue();if(complete){input.job.state=DerivedJobState::Complete;input.job.cleaned_at_ms=30;}
    auto f=Active(input);
    std::optional<RecordingSegmentV2> completed_output;
    if(complete){
        Need(input.job.ready&&input.job.ready->outputs.size()==1&&input.job.intent.outputs.size()==1);
        completed_output=input.job.ready->outputs.front().segment;
        // committed 전이를 재실행하지 않고, 그 전이가 남긴 current 행만 완료 job snapshot에 넣는다.
        f.Row("segment-v2",completed_output->segment_id,SerializeRecordingSegmentV2(*completed_output));
        f.Row("media-path",completed_output->segment_id,"\""+input.job.intent.outputs.front().final_relpath+"\"");
    }
    if(!complete){
        f.snapshot.rows.erase(std::remove_if(f.snapshot.rows.begin(),f.snapshot.rows.end(),[](const auto& r){return r.kind=="derived-job"||(r.kind=="accepted-state"&&r.key=="job-mutation");}),f.snapshot.rows.end());
        f.chain.first_acceptances.pop_back();f.chain.maximum_global_ordinal=1;f.chain.physical_rows=2;
        f.archive.resize(f.chain.first_acceptances.back().first_row.offset+f.chain.first_acceptances.back().first_row.length);
    }
    Install(f,root);
    RecordingTombstoneV2 tomb;tomb.tombstone_id="retired-tomb";tomb.segment=input.source.segment;tomb.deletion_reason="continuous-age";tomb.deleted_at_ms=30;
    for(unsigned phase=0;phase<3;++phase){
        RecordingJournal journal(Options(root));Need(journal.Open(&error));RecordingCatalog c(journal,ConsumerOptions(root,true,sql));Need(c.Open(&error));
        if(phase==0){
            Need(c.AdjustHoldCount("segment",1,&error));Check("B11-P03",!c.RequestDeletion("segment",tomb.deletion_reason,&error),"live V2 hold protects before retirement");
            Need(c.AdjustHoldCount("segment",-1,&error));Need(c.RequestDeletion("segment",tomb.deletion_reason,&error));Need(c.CompleteDeletionV2(tomb,&error));
            if(completed_output){
                const auto& plan=input.job.intent.outputs.front();const auto output_path=root/plan.final_relpath;
                std::filesystem::create_directories(output_path.parent_path());
                Write(output_path,"event output");
                RecordingTombstoneV2 output_tomb;output_tomb.tombstone_id="retired-event-output-tomb";output_tomb.segment=*completed_output;
                output_tomb.deletion_reason="event-capacity";output_tomb.deleted_at_ms=31;
                Need(c.RequestDeletion(completed_output->segment_id,output_tomb.deletion_reason,&error));Need(std::filesystem::remove(output_path));
                Need(c.CompleteDeletionV2(output_tomb,&error));
            }
        }
        const bool visible=c.IsDeletedSegmentId("segment")&&c.SegmentLifecycleV2("segment")==RecordingLifecycle::Deleted;
        Check("B11-P01",visible&&ConsumerProbe::RetiredOnly(c,"segment"),"live delete and reopen retain receipt only and Deleted lifecycle");
        if(!visible)return; // 예상 RED 뒤 다른 경로/단계는 진행하지 않는다.
        DerivedJobIntentV1 retired_output_conflict;
        retired_output_conflict.outputs.push_back({0,"segment","output-order","temporary/output.mp4","final/output.mp4"});
        Check("B11-P01",!ConsumerProbe::ValidateDerivedSources(c,retired_output_conflict),"retired source ID cannot be reused as a derived output ID");
        RecordingReadService read(c);RecordingLocationCatalogSnapshot locations;
        std::vector<std::string> deleted_ids{"segment"};if(completed_output)deleted_ids.push_back(completed_output->segment_id);std::sort(deleted_ids.begin(),deleted_ids.end());
        Check("B11-P01",!c.FindSegmentV2ById("segment")&&!c.FindSegmentMediaLocation("segment")&&!read.ResolveMedia("channel","segment")&&
            !c.AdjustHoldCount("segment",1,&error)&&c.SnapshotLocationsV2("channel",&locations,&error)&&locations.segments.empty()&&locations.deleted_segment_ids==deleted_ids,
            "deleted playback and holds refused while location deleted ID stays visible");
        RecordingTimelineResult timeline;
        Check("B11-P03",c.SnapshotTimelineV2({"channel",0,1000,0,20,false},&timeline,&error)&&
            std::any_of(timeline.items.begin(),timeline.items.end(),[](const auto& row){return row.segment_id=="segment"&&row.catalog_state=="deleted"&&
                row.mapping_id=="map"&&row.utc_start_ns==100000000&&row.utc_end_ns==120000000&&!row.playable;}),
            "deleted timeline preserves historical mapping and unavailable state");
        if(failures)return;
        auto changed=tomb;++changed.deleted_at_ms;
        Check("B11-P01",c.CompleteDeletionV2(tomb,&error)&&!c.CompleteDeletionV2(changed,&error)&&
            !c.FinalizeSegmentV2(tomb.segment,(root/"channel/source.mp4").string(),&error),"cold exact deletion retry accepts only original and refuses ID reuse");
        std::vector<RecordingDerivedSourceSnapshotEntry> selected;
        Check("B11-P03",c.SnapshotDerivedSources(input.job.intent.reference,&selected,&error)&&selected.size()==1&&selected[0].deleted&&selected[0].binding&&
            SerializeRecordingSegmentV2(selected[0].segment)==SerializeRecordingSegmentV2(input.source.segment),"historical selection rehydrates exact deleted source and binding");
        auto utc=input.job.intent.reference;utc.request=RecordingConsumerRequestV1{"utc-ms",2000,2020,0,0};selected.clear();
        Check("B11-P03",c.SnapshotDerivedSources(utc,&selected,&error)&&selected.size()==1&&selected[0].deleted,
            "uncertain UTC receipt cannot exclude a historical candidate");
        if(complete){
            std::optional<DerivedJobRecordV1> job;RecordingDerivedReferenceResult result;
            RecordingTimelineResult output_timeline;
            const auto output_id=completed_output->segment_id;const auto output_path=(root/input.job.intent.outputs.front().final_relpath).string();
            Write(root/input.job.intent.outputs.front().final_relpath,"reuse");
            const bool output_reuse_rejected=!c.FinalizeSegmentV2(*completed_output,output_path,&error);
            Check("B11-P03",c.FindDerivedJob(input.job.intent.job_id,&job,&error)&&job&&
                SerializeDerivedJobRecord(*job)==SerializeDerivedJobRecord(input.job)&&
                c.SnapshotTimelineV2({"channel",0,1000,0,20,false},&output_timeline,&error)&&
                std::any_of(output_timeline.items.begin(),output_timeline.items.end(),[&](const auto& row){return row.segment_id==output_id&&row.job_state=="complete"&&row.catalog_state=="deleted"&&!row.playable;})&&
                c.QueryDerivedReferenceResult("reference",&result,&error)&&result.jobs.size()==1&&result.jobs[0].outputs.size()==1&&
                result.jobs[0].outputs[0].segment_id==output_id&&!result.jobs[0].outputs[0].catalog_available&&
                result.jobs[0].outputs[0].lifecycle==RecordingLifecycle::Deleted&&result.jobs[0].outputs[0].relative_path==input.job.intent.outputs.front().final_relpath&&
                output_reuse_rejected,
                "completed event output deletion preserves unavailable timeline/reference state and rejects ID reuse");
        }
#if MEDIA_SERVER_USE_SQLITE3
        if(auto* db=ConsumerProbe::Db(c))Check("B11-P01",Scalar(db,"SELECT count(*) FROM b_current WHERE kind='retired-v2' AND id='segment'")=="1"&&
            Scalar(db,"SELECT count(*) FROM b_current WHERE id='segment' AND kind IN ('segment-v2','tombstone-v2','state-v2','media-path','deletion-reason')")=="0","SQL current and reopen have no retired full duplicate");
#endif
        if(phase==1)Need(c.Checkpoint(&error));
        if(phase==2){
            // Checkpoint freezes the deletion in its verified prefix; old active is no longer its authority.
            RecordingGenerationManifest current;Need(ParseRecordingGenerationManifest(Read(root/"recording-generation.json"),&current,&error));
            Need(!complete||current.evidence.size()==1);
            const auto file=root/(complete?current.evidence.front().name:"evidence-1-0.jsonl");
            auto raw=Read(file);Need(!raw.empty());
            if(complete){
                bool deletion=false;std::istringstream rows(raw);std::string row;
                while(std::getline(rows,row)){RecordingMutationV1 value;Need(ParseRecordingMutationV1(row,&value,&error));
                    if(value.mutation_type==RecordingMutationType::SegmentV2Deleted&&value.entity_id=="segment"){
                        RecordingTombstoneV2 decoded;Need(ParseRecordingTombstoneV2(value.payload_json,&decoded,&error));
                        deletion=SerializeRecordingTombstoneV2(decoded)==SerializeRecordingTombstoneV2(tomb);
                    }}
                Need(deletion);
            }
            raw[raw.size()/2]^=1;Write(file,raw);
            selected.clear();Check("B11-P02",!c.SnapshotDerivedSources(input.job.intent.reference,&selected,&error)&&selected.empty()&&!journal.HasManagedLease(),"retired binding archive corruption refused after prior successful selection");
        }
    }
}
// Terminal state is reached through the same durable Catalog append/apply path used by
// the job service. The old reader deliberately outlives the resident-entry eviction.
void TerminalJobHistory(const std::filesystem::path& root,bool complete,bool sql){
    auto input=complete?ReadyInput():InputValue();
    if(complete)input.job.state=DerivedJobState::Committed;
    auto f=Active(input);
    if(complete){
        const auto& output=input.job.ready->outputs.front().segment;
        f.Row("segment-v2",output.segment_id,SerializeRecordingSegmentV2(output));
        f.Row("media-path",output.segment_id,"\""+input.job.intent.outputs.front().final_relpath+"\"");
    }
    Install(f,root);
    auto terminal=input.job;terminal.state=complete?DerivedJobState::Complete:DerivedJobState::Failed;
    terminal.cleaned_at_ms=30;if(!complete)terminal.failure_reason="owned-test-cleanup";
    const auto expected=SerializeDerivedJobRecord(terminal);Need(!expected.empty());
    std::string snapshot_after_checkpoint;
    for(unsigned phase=0;phase<3;++phase){
        RecordingJournal journal(Options(root));Need(journal.Open(&error));RecordingCatalog c(journal,ConsumerOptions(root,true,sql));Need(c.Open(&error));
        if(phase==0){
            auto prior=ConsumerProbe::Job(c,input.job.intent.job_id);
            Check("MEM80-G01",prior&&ConsumerProbe::ResidentJobs(c)==1&&ConsumerProbe::ColdJobs(c)==0,
                "active job owns one resident summary before terminal transition");if(failures)return;
            const auto prior_bytes=SerializeDerivedJobRecord(*prior);
            Check("MEM80-G01",ConsumerProbe::AppendJob(c,terminal,"terminal-first")&&ConsumerProbe::ResidentJobs(c)==0&&ConsumerProbe::ColdJobs(c)==1&&
                SerializeDerivedJobRecord(*prior)==prior_bytes&&prior->state==input.job.state,
                "terminal append evicts summary and vectors while the active reader keeps immutable prior data");if(failures)return;
        }
        Check("MEM80-G01",ConsumerProbe::ResidentJobs(c)==0&&ConsumerProbe::ColdJobs(c)==1,
            "live, active-log reopen and checkpoint reopen keep terminal summary nonresident");if(failures)return;
        auto held=ConsumerProbe::Job(c,terminal.intent.job_id);
        Check("MEM80-G01",held&&SerializeDerivedJobRecord(*held)==expected&&ConsumerProbe::ResidentJobs(c)==0,
            "terminal cold lookup returns exact record without repopulating summary map");if(failures)return;
        if(phase==0){
            const auto before=Read(root/"active-2.jsonl");
            Check("MEM80-G01",ConsumerProbe::AppendJob(c,terminal,"terminal-same-payload-new-id")&&Read(root/"active-2.jsonl")!=before&&
                ConsumerProbe::ResidentJobs(c)==0&&ConsumerProbe::ColdJobs(c)==1&&SerializeDerivedJobRecord(*held)==expected&&journal.HasManagedLease(),
                "same terminal payload with a new mutation ID preserves one cold job and reader authority");if(failures)return;
            const auto retried=Read(root/"active-2.jsonl");
            Check("MEM80-G01",ConsumerProbe::AppendJob(c,terminal,"terminal-same-payload-new-id")&&Read(root/"active-2.jsonl")==retried,
                "exact mutation retry appends no second physical record");if(failures)return;
        }
        std::weak_ptr<const DerivedJobRecordV1> released=held;held.reset();
        Check("MEM80-G01",released.expired(),"caller release frees cold payload; history retains no strong payload cache");
        held=ConsumerProbe::Job(c,terminal.intent.job_id);
        std::optional<DerivedJobRecordV1> value;std::vector<DerivedJobRecordV1> all,active;bool more=true;RecordingDerivedReferenceResult reference;
        Check("MEM80-G01",held&&SerializeDerivedJobRecord(*held)==expected&&c.FindDerivedJob(terminal.intent.job_id,&value,&error)&&value&&
            SerializeDerivedJobRecord(*value)==expected&&c.SnapshotDerivedJobs(&all,&error)&&all.size()==1&&SerializeDerivedJobRecord(all.front())==expected&&
            c.SnapshotActiveDerivedJobs(8,&active,&more,&error)&&active.empty()&&!more&&
            c.QueryDerivedReferenceResult("reference",&reference,&error)&&reference.jobs.size()==1&&SerializeDerivedJobRecord(reference.jobs.front().job)==expected&&
            ConsumerProbe::ResidentJobs(c)==0&&ConsumerProbe::ColdJobs(c)==1,
            "reacquisition, explicit full result, active-only result and reference consumers preserve terminal semantics");if(failures)return;
        if(phase==1){
            const auto manifest_before=Read(root/"recording-generation.json");
            Check("MEM80-G01",c.Checkpoint(&error)&&Read(root/"recording-generation.json")!=manifest_before&&
                SerializeDerivedJobRecord(*held)==expected&&ConsumerProbe::ResidentJobs(c)==0&&ConsumerProbe::ColdJobs(c)==1,
                "actual checkpoint publishes terminal summary while the cold reader remains valid");if(failures)return;
            RecordingGenerationManifest manifest;Need(ParseRecordingGenerationManifest(Read(root/"recording-generation.json"),&manifest,&error));
            snapshot_after_checkpoint=Read(root/manifest.snapshot.name);
            Check("MEM80-G01",snapshot_after_checkpoint.find("\"kind\":\"derived-job\"")!=std::string::npos,
                "checkpoint full output includes nonresident terminal job row");
        }else if(phase==2){
            RecordingGenerationManifest manifest;Need(ParseRecordingGenerationManifest(Read(root/"recording-generation.json"),&manifest,&error));
            Check("MEM80-G01",Read(root/manifest.snapshot.name)==snapshot_after_checkpoint,
                "independent checkpoint reopen leaves original snapshot bytes unchanged");
        }
    }
}
// This fixture deliberately writes the old full-format rows. The product Journal/Catalog
// Open is the consumer; the small all-DTO projection helper is never used here.
void LegacyFullProjection(const std::filesystem::path& root,const std::string& variant){
    const auto input=InputValue();auto f=Active(input);
    f.snapshot.rows.erase(std::remove_if(f.snapshot.rows.begin(),f.snapshot.rows.end(),[](const auto& row){return row.kind=="derived-job"||(row.kind=="accepted-state"&&row.key=="job-mutation");}),f.snapshot.rows.end());
    f.chain.first_acceptances.pop_back();f.chain.maximum_global_ordinal=1;f.chain.physical_rows=2;
    f.archive.resize(f.chain.first_acceptances.back().first_row.offset+f.chain.first_acceptances.back().first_row.length);
    RecordingSegmentStateV2 state;state.segment_id="segment";state.lifecycle=RecordingLifecycle::DeletionPending;state.reason="continuous-age";
    RecordingTombstoneV2 tomb;tomb.tombstone_id="legacy-full-tomb";tomb.segment=input.source.segment;tomb.deletion_reason=state.reason;tomb.deleted_at_ms=30;
    f.Add(RecordingMutationType::SegmentV2State,"legacy-state","segment",SerializeRecordingSegmentStateV2(state));
    f.Add(RecordingMutationType::SegmentV2Deleted,"legacy-delete","segment",SerializeRecordingTombstoneV2(tomb));
    f.Row("state-v2","segment",SerializeRecordingSegmentStateV2(state));f.Row("deletion-reason","segment","\"continuous-age\"");
    f.Row("tombstone-v2","segment",SerializeRecordingTombstoneV2(tomb));
    for(auto& row:f.snapshot.rows){
        if(variant=="state"&&row.kind=="state-v2"){auto wrong=state;wrong.reason="continuous-capacity";row.value_json=SerializeRecordingSegmentStateV2(wrong);}
        if(variant=="reason"&&row.kind=="deletion-reason")row.value_json="\"continuous-capacity\"";
        if(variant=="path"&&row.kind=="media-path")row.value_json="\"../outside.mp4\"";
        if(variant=="source"&&row.kind=="source-binding"){
            RecordingCatalogSourceSummary wrong;Need(ParseRecordingCatalogSourceSummary(row.value_json,&wrong,&error));wrong.source="other-source";
            Need(SerializeRecordingCatalogSourceSummary(wrong,&row.value_json,&error));
        }
        if(variant=="order"&&row.kind=="segment-v2"){auto wrong=input.source.segment;wrong.order_sequence=2;row.value_json=SerializeRecordingSegmentV2(wrong);}
    }
    Install(f,root);const auto snapshot=Read(root/"snapshot-2.jsonl"),archive=Read(root/"evidence-1-0.jsonl");
    Need(snapshot.find("\"kind\":\"retired-v2\"")==std::string::npos&&snapshot.find("\"kind\":\"tombstone-v2\"")!=std::string::npos);
    RecordingJournal journal(Options(root));RecordingCatalog c(journal,ConsumerOptions(root));
    const bool opened=journal.Open(&error)&&c.Open(&error);
    if(variant=="valid"){
        std::vector<RecordingDerivedSourceSnapshotEntry> selected;
        Check("MEM80-G01",opened&&ConsumerProbe::RetiredOnly(c,"segment")&&!c.FindSourceBinding("segment")&&
            c.SnapshotDerivedSources(input.job.intent.reference,&selected,&error)&&selected.size()==1&&selected[0].deleted&&selected[0].binding&&
            SerializeRecordingSegmentV2(selected[0].segment)==SerializeRecordingSegmentV2(input.source.segment),
            "old full snapshot cold retirement preserves deleted-source selection and refuses finalized-only binding API");
    }else Check("MEM80-G01",!opened,("old full snapshot rejects cross-map counterexample: "+variant).c_str());
    Check("MEM80-G01",Read(root/"snapshot-2.jsonl")==snapshot&&Read(root/"evidence-1-0.jsonl")==archive,
        "old-format positive/negative Open preserves snapshot and archive source bytes");
}
#if MEDIA_SERVER_USE_SQLITE3
void CommitAuthority(const std::filesystem::path& root){Setup(root);RecordingJournal j(Options(root));Need(j.Open(&error));RecordingCatalog c(j,ConsumerOptions(root));Need(c.Open(&error));Need(c.FinalizeSegment(ProjectionV1(),(root/"channel/legacy.mp4").string(),&error));
    auto* db=ConsumerProbe::Db(c);Need(db!=nullptr);const auto counts=ConsumerProbe::Holds(c);const auto before=Read(root/"active-2.jsonl");const auto sql_before=Scalar(db,"SELECT count(*) FROM b_hold");
    tamper_marker=root/".recording-store-format";Need(sqlite3_create_function_v2(db,"owned_marker_tamper",0,SQLITE_UTF8,nullptr,TamperMarker,nullptr,nullptr,nullptr)==SQLITE_OK);
    Sql(db,"CREATE TRIGGER owned_hold_tamper AFTER INSERT ON b_hold BEGIN SELECT owned_marker_tamper(); END");
    Check("B05-P03",!c.AdjustHoldCount("legacy",1,&error)&&ConsumerProbe::Holds(c)==counts&&Scalar(db,"SELECT count(*) FROM b_hold")==sql_before&&!j.HasManagedLease()&&Read(root/"active-2.jsonl")==before&&Read(tamper_marker)=="owned SQL-step marker tamper\n","SQL step changes marker after BEGIN; final guard rolls back count and poisons without hiding tamper");
}
void SqlFailures(const std::filesystem::path& root,bool durable,bool commit){
    Setup(root);std::string durable_bytes;
    {RecordingJournal j(Options(root));Need(j.Open(&error));RecordingCatalog c(j,ConsumerOptions(root));Need(c.Open(&error));auto* db=ConsumerProbe::Db(c);Need(db!=nullptr);
        if(!durable)Need(c.FinalizeSegment(ProjectionV1(),(root/"channel/legacy.mp4").string(),&error));
        const auto before=Read(root/"active-2.jsonl");const auto counts=ConsumerProbe::Holds(c);const auto sql_before=Scalar(db,"SELECT count(*) FROM b_hold");
        if(commit)sqlite3_commit_hook(db,RejectCommit,nullptr);else Sql(db,"CREATE TRIGGER owned_hold_failure BEFORE INSERT ON b_hold BEGIN SELECT RAISE(ABORT,'owned hold failure'); END");
        const bool result=durable?c.FinalizeSegmentWithHold(ProjectionV1(),(root/"channel/legacy.mp4").string(),&error):c.AdjustHoldCount("legacy",1,&error);
        if(commit)sqlite3_commit_hook(db,nullptr,nullptr);else Sql(db,"DROP TRIGGER owned_hold_failure");
        Check(durable?"B05-P01":"B05-P02",!result&&Scalar(db,"SELECT count(*) FROM b_hold")==sql_before,"actual hold SQL step/COMMIT failure rolls back cache");
        durable_bytes=Read(root/"active-2.jsonl");
        if(durable)Check("B05-P01",durable_bytes!=before&&!j.HasManagedLease()&&!c.AdjustHoldCount("legacy",1,&error),"durable finalize SQL failure poisons without success fallback");
        else Check("B05-P02",durable_bytes==before&&ConsumerProbe::Holds(c)==counts&&c.AdjustHoldCount("legacy",1,&error)&&Holds(c)==1,"temporary SQL failure preserves memory and same-owner retry");
    }
    RecordingJournal reopened(Options(root));Need(reopened.Open(&error));RecordingCatalog c(reopened,ConsumerOptions(root));Check("B05-P01",c.Open(&error)&&c.FindSegmentById("legacy")&&Holds(c)==0&&Read(root/"active-2.jsonl")==durable_bytes,"fresh owner recovers complete durable row and no temporary hold");
}
#endif
#endif
}
int main(int argc,char** argv){
    if(argc!=2)return 2;
    try {
        const std::filesystem::path base=argv[1];std::filesystem::create_directories(base);ProbeCases(base);
#if MEDIA_SERVER_USE_OPENSSL && MEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND
        for(bool complete:{false,true})for(bool sql:{false,true}){
            TerminalJobHistory(base/(std::string(complete?"terminal-complete-":"terminal-failed-")+(sql?"sql":"fallback")),complete,sql);if(failures)return 1;
        }
        for(const auto* variant:{"valid","state","reason","path","source","order"}){LegacyFullProjection(base/(std::string("legacy-full-")+variant),variant);if(failures)return 1;}
        RetiredReference(base/"retired-sql",true);if(failures)return 1;
        RetiredReference(base/"retired-fallback",false);if(failures)return 1;
        RetiredReference(base/"retired-complete",true,true);if(failures)return 1;
        Finalize(base/"finalize",true);Finalize(base/"fallback",false);Overflow(base/"overflow");
        for(unsigned i=0;i<4;++i)Authority(base/("authority-"+std::to_string(i)),i);
        Fork(base/"fork");Legacy(base/"legacy");ColdReference(base/"cold-reference");Tombstone(base/"tombstone");
#if MEDIA_SERVER_USE_SQLITE3
        CommitAuthority(base/"commit-authority");
        for(bool durable:{false,true})for(bool commit:{false,true})SqlFailures(base/(std::string(durable?"durable-":"temporary-")+(commit?"commit":"step")),durable,commit);
#endif
#else
        const auto root=base/"unsupported";std::filesystem::create_directories(root);Write(root/".recording-store-format",Marker());RecordingJournal journal(Options(root));
        RecordingCatalog catalog(journal,ConsumerOptions(root));Check("B05-P03",!journal.Open(&error),"unsupported B backend remains closed");
#endif
        return failures?1:0;
    }catch(const std::exception& e){std::cerr<<"fixture failure: "<<e.what()<<'\n';return 2;}
}

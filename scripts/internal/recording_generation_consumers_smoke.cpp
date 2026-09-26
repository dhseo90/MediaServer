// 파일 용도: 녹화 세대 consumer 참조와 보존 경계를 smoke로 검증한다.
// 기존 고정 fixture 생성기만 재사용하고 이전 suite는 실행하지 않는다.
#define RECORDING_SCRATCH_MAIN ConsumersScratchFixtureMain
#include "recording_catalog_generation_scratch_smoke.cpp"
#undef RECORDING_SCRATCH_MAIN
#if MEDIA_SERVER_USE_SQLITE3
#include <sqlite3.h>
#endif
#include "recording/recording_read_service.h"
#include <sys/wait.h>
#include <unistd.h>
namespace recording {
struct RecordingGenerationConsumersProbe {
    static auto Holds(const RecordingCatalog& c){return c.hold_counts_;}
    static void Hold(RecordingCatalog& c,std::uint64_t count){c.hold_counts_["legacy"]=count;}
    static sqlite3* Db(RecordingCatalog& c){return c.generation_sqlite_db_;}
    static bool Guard(RecordingJournal& j,const void* owner){return j.CommitGenerationProtection(owner,[]{return true;},&error);}
    static bool Probe(const RecordingJournal& j,bool* pending){return j.ProbeManagedRuntime(pending,&error);}
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

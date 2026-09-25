#include "recording/recording_generation_transaction.h"
#include "recording/recording_catalog.h"
#include "recording/recording_cutover_candidate.h"
#define main CutoverProjectionFixtureMain
#include "recording_catalog_generation_projection_smoke.cpp"
#undef main
#include <sys/wait.h>
#include <unistd.h>
namespace recording {
struct RecordingGenerationTransactionProbe {
    static bool Publish(RecordingCatalog& catalog,const RecordingCutoverCandidateLimits& limits,std::string* error) {
        return catalog.PublishManagedCutover(limits,error);
    }
    static bool Recover(RecordingCatalog& catalog,const RecordingCutoverCandidateLimits& limits,std::string* error){return catalog.RecoverManagedCutover(limits,8U*1024U*1024U,error);}
    static void Hook(void(*hook)(const char*)){RecordingGenerationTransaction::fault_hook_=hook;}
};
}
namespace {
unsigned transaction_failures=0;
void T(unsigned group,bool ok,const std::string& text){std::cout<<"B04-T0"<<group<<' '<<(ok?"PASS":"FAIL")<<' '<<text<<'\n';if(!ok){++transaction_failures;std::cerr<<error<<'\n';}}
RecordingCatalog::Options TO(const std::filesystem::path& root){RecordingCatalog::Options o;o.media_root=root;o.sqlite_path=root/"recording-catalog.sqlite3";o.enable_v2_storage=true;o.prefer_sqlite=false;return o;}
RecordingCutoverCandidateLimits TL(){RecordingCutoverCandidateLimits l;l.chain={8U*1024U*1024U,10000,10000};l.snapshot_bytes=8U*1024U*1024U;l.cold_row_bytes=17U*1024U*1024U;return l;}
RecordingJournal::ManagedOptions JO(const std::filesystem::path& root,const std::string& store="store"){return {root,store,{8U*1024U*1024U,8U*1024U*1024U,8U*1024U*1024U,17U*1024U*1024U,10000,10000}};}
#if MEDIA_SERVER_USE_OPENSSL && MEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND
std::string crash_point;
unsigned crash_occurrence=1;
void Crash(const char* point){if(crash_point==point&&!--crash_occurrence)::_exit(77);}
void Init(const std::filesystem::path& root,const std::string& store="store"){
    std::filesystem::create_directories(root);RecordingJournal j(JO(root,store));Need(j.Open(&error));
    RecordingMutationV1 m;m.mutation_type=RecordingMutationType::SegmentFinalized;m.mutation_id="legacy-final";m.entity_id="legacy";m.occurred_at_ms=1;
    m.payload_json="{\"segment\":"+SerializeRecordingSegmentV1(V1())+",\"mediaRelpath\":\"channel/legacy.mp4\"}";Need(j.Append(m,&error));
    Write(root/"recording-catalog.sqlite3","legacy-cache-sentinel");Write(root/"media.mp4","media-sentinel");Write(root/"media.mp4.cleanup-pending","cleanup-sentinel");
}
std::string Originals(const std::filesystem::path& root){std::string bytes;for(const char* name:{"recording-v2-mutations.jsonl","recording-catalog.sqlite3","media.mp4","media.mp4.cleanup-pending"})bytes+=Read(root/name);return bytes;}
bool Recover(const std::filesystem::path& root){RecordingJournal j(JO(root));auto options=TO(root);options.enable_generation_writes=true;options.prefer_sqlite=true;RecordingCatalog c(j,options);const bool recovered=RecordingGenerationTransactionProbe::Recover(c,TL(),&error);if(recovered){RecordingMutationV1 mutation;RecordingOrderReservationV1 order;T(1,!j.Append(mutation,&error)&&!j.ReserveRecordingOrder("store","recovery-write","recovery-segment","channel",&order,&error)&&!c.Open(&error),"recovery owner cannot acquire write/public authority");}return recovered;}
void Resume(const std::filesystem::path& root){RecordingJournal j(JO(root));Need(j.Open(&error));auto options=TO(root);options.enable_generation_writes=true;RecordingCatalog c(j,options);T(1,c.Open(&error)&&c.MarkSegmentCorrupt("legacy","missing-media",&error),"cleaned target fresh owner resumes explicit B writes");}
void Normal(const std::filesystem::path& root,const std::string& store){
    Init(root,store);const auto before=Originals(root);
    {
        RecordingJournal j(JO(root,store));Need(j.Open(&error));RecordingCatalog c(j,TO(root));
        T(1,RecordingGenerationTransactionProbe::Publish(c,TL(),&error),"normal private cutover "+store);
        RecordingMutationV1 m;RecordingOrderReservationV1 order;
        T(1,!j.Append(m,&error)&&!j.ReserveRecordingOrder(store,"late","late-segment","channel",&order,&error)&&!j.Open(&error),"old owner refuses append/reserve/reopen");
    }
    RecordingJournal j(JO(root,store));const bool opened=j.Open(&error);RecordingCatalog c(j,TO(root));
    T(1,opened&&c.Open(&error)&&c.QuerySegments("channel",0,10000).size()==1,"fresh B owner independent current query");
    T(1,Originals(root)==before&&!std::filesystem::exists(root/".recording-generation-transaction.json"),"source/cache/media preserved and receipt cleaned");
}
void CrashCase(const std::filesystem::path& root,const std::string& point,bool recoverable,unsigned occurrence=1){
    Init(root);const auto before=Originals(root);const auto marker=Read(root/".recording-store-format");
    const auto pid=::fork();Need(pid>=0);
    if(pid==0){crash_point=point;crash_occurrence=occurrence;RecordingGenerationTransactionProbe::Hook(Crash);RecordingJournal j(JO(root));if(!j.Open(&error))::_exit(91);RecordingCatalog c(j,TO(root));(void)RecordingGenerationTransactionProbe::Publish(c,TL(),&error);::_exit(92);}
    int status=0;Need(::waitpid(pid,&status,0)==pid);T(2,WIFEXITED(status)&&WEXITSTATUS(status)==77,"crash reached "+point);
    const bool recovered=Recover(root);T(recoverable?2:5,recovered==recoverable,"restart recovery decision "+point);
    if(recoverable){RecordingJournal j(JO(root));T(2,j.Open(&error)&&(point=="manifest-published"?Read(root/".recording-store-format")!=marker:Read(root/".recording-store-format")==marker),"strict selected backend reopen after "+point);}
    T(2,Originals(root)==before,"original bytes after "+point);
    if(point=="manifest-published"&&recovered)Resume(root);
    if(!recoverable)T(5,std::filesystem::exists(root/".recording-generation-transaction.json")||std::filesystem::exists(root/".recording-generation-transaction.stage"),"unowned or uncertain receipt preparation preserved "+point);
}
void StopAt(const std::filesystem::path& root,const std::string& point,bool recovery=false){
    const auto pid=::fork();Need(pid>=0);
    if(pid==0){crash_point=point;RecordingGenerationTransactionProbe::Hook(Crash);if(recovery){(void)Recover(root);::_exit(92);}
        RecordingJournal j(JO(root));if(!j.Open(&error))::_exit(91);RecordingCatalog c(j,TO(root));(void)RecordingGenerationTransactionProbe::Publish(c,TL(),&error);::_exit(92);}
    int status=0;Need(::waitpid(pid,&status,0)==pid);Need(WIFEXITED(status)&&WEXITSTATUS(status)==77);
}
RecordingGenerationReceipt Receipt(const std::filesystem::path& root){RecordingGenerationReceipt r;Need(ParseRecordingGenerationReceipt(Read(root/".recording-generation-transaction.json"),8U*1024U*1024U,&r,&error));return r;}
void RollbackCrash(const std::filesystem::path& root,const std::string& point){
    Init(root);const auto original=Originals(root);StopAt(root,"marker-synced");StopAt(root,point,true);
    T(2,Recover(root),"rollback cleanup restart "+point);RecordingJournal j(JO(root));
    T(2,j.Open(&error)&&Originals(root)==original,"rollback repeated strict reopen/source "+point);
}
void Tamper(const std::filesystem::path& root,unsigned variant){
    Init(root);StopAt(root,variant==2?"component-linked":"marker-synced");auto r=Receipt(root);
    if(variant==0){auto raw=Read(root/"recording-v2-mutations.jsonl");raw[0]='x';Write(root/"recording-v2-mutations.jsonl",raw);}
    if(variant==1){const auto marker=Read(root/".recording-store-format");std::filesystem::rename(root/".recording-store-format",root/"foreign-marker-original");Write(root/".recording-store-format",marker);}
    if(variant==2){const auto name=r.created.front().file.name;Need(::link((root/name).c_str(),(root/"foreign-third-link").c_str())==0);}
    if(variant==3)Write(root/".recording-generation-transaction.json","{}\n");
    if(variant==4){auto raw=Read(root/"recording-v2-mutations.jsonl");RecordingMutationV1 m;Need(ParseRecordingMutationV1(raw.substr(0,raw.size()-1),&m,&error));m.payload_json="{}";raw=SerializeRecordingMutationV1(m)+"\n";Write(root/"recording-v2-mutations.jsonl",raw);r.source.file.size=raw.size();r.source.file.sha256=Hash(raw);std::string receipt;Need(SerializeRecordingGenerationReceipt(r,&receipt,&error));Write(root/".recording-generation-transaction.json",receipt);}
    if(variant==5)Write(root/"recording-generation.json","{}\n");
    if(variant==6)Need(::symlink("missing-manifest",(root/"recording-generation.json").c_str())==0);
    if(variant==7){const auto& file=r.created.front();std::filesystem::rename(root/file.file.name,root/"foreign-component-original");Write(root/file.file.name,Read(root/"foreign-component-original"));}
    if(variant==8){const auto backup=root/r.stage_name/".recording-marker-v1";Need(::link(backup.c_str(),(root/"unknown-marker-link").c_str())==0);Need(::link(backup.c_str(),(root/"unknown-marker-third").c_str())==0);}
    if(variant==9){std::filesystem::rename(root/".recording-store-format",root/"preserved-replacement-marker");std::filesystem::rename(root/r.stage_name/".recording-marker-v1",root/".recording-store-format");std::string manifest;Need(SerializeRecordingGenerationManifest(r.target,&manifest,&error));Write(root/"recording-generation.json",manifest);RecordingJournal journal(JO(root));T(5,!journal.Open(&error),"v1 marker with structurally valid manifest never falls back to legacy");}
    if(variant==10)std::filesystem::create_directory(root/"recording-generation.json");
    const auto before=Originals(root),marker=Read(root/".recording-store-format"),receipt=Read(root/".recording-generation-transaction.json");
    T(variant==3?5:variant==0||variant==4?3:4,!Recover(root),"tamper refused "+std::to_string(variant));
    T(4,Originals(root)==before&&Read(root/".recording-store-format")==marker&&Read(root/".recording-generation-transaction.json")==receipt,"tamper rejection bytes preserved "+std::to_string(variant));
}
void MakeB(const std::filesystem::path& root){Init(root);RecordingJournal j(JO(root));Need(j.Open(&error));RecordingCatalog c(j,TO(root));Need(RecordingGenerationTransactionProbe::Publish(c,TL(),&error));}
unsigned prepared_count=0;
void StopPreparation(const char* point){if(std::string(point)=="component-prepared"&&++prepared_count==2)throw std::runtime_error("fixture prepared stop");}
void StopStage(const char* point){if(std::string(point)=="stage-created")throw std::runtime_error("fixture stage before FD stop");}
void LiveCleanup(const std::filesystem::path& root){
    MakeB(root);RecordingJournal j(JO(root));Need(j.Open(&error));auto options=TO(root);options.enable_generation_writes=true;RecordingCatalog c(j,options);Need(c.Open(&error));Need(c.MarkSegmentCorrupt("legacy","missing-media",&error));
    const auto manifest=Read(root/"recording-generation.json");prepared_count=0;RecordingGenerationTransactionProbe::Hook(StopPreparation);
    const bool rejected=!c.Checkpoint(&error);RecordingGenerationTransactionProbe::Hook(nullptr);
    bool stage=false;for(const auto& entry:std::filesystem::directory_iterator(root))if(entry.path().filename().string().rfind(".recording-generation-prepare-",0)==0)stage=true;
    T(6,rejected&&!stage&&Read(root/"recording-generation.json")==manifest,"live owned unreceipted preparations cleaned without changing predecessor");
    T(6,c.Checkpoint(&error),"same owner retries after verified live-only cleanup");
}
void IncompleteStage(const std::filesystem::path& root){
    MakeB(root);RecordingJournal j(JO(root));Need(j.Open(&error));auto options=TO(root);options.enable_generation_writes=true;RecordingCatalog c(j,options);Need(c.Open(&error));Need(c.MarkSegmentCorrupt("legacy","missing-media",&error));
    const auto manifest=Read(root/"recording-generation.json");RecordingGenerationTransactionProbe::Hook(StopStage);
    const bool rejected=!c.Checkpoint(&error);RecordingGenerationTransactionProbe::Hook(nullptr);
    bool stage=false;for(const auto& entry:std::filesystem::directory_iterator(root))if(entry.path().filename().string().rfind(".recording-generation-prepare-",0)==0)stage=true;
    T(6,rejected&&stage&&!j.HasManagedLease()&&Read(root/"recording-generation.json")==manifest,"mkdir without acquired stage FD is preserved and owner poisoned, not cleanup success");
}
void Checkpoint(const std::filesystem::path& root,const std::string& point){
    MakeB(root);const auto original=Originals(root);
    if(point.empty()){
        RecordingJournal j(JO(root));Need(j.Open(&error));auto options=TO(root);options.enable_generation_writes=true;RecordingCatalog c(j,options);Need(c.Open(&error));Need(c.MarkSegmentCorrupt("legacy","missing-media",&error));
        RecordingGenerationArchiveReadsForTest(true);
        T(6,c.Checkpoint(&error),"checkpoint staged receipt publication");
        T(6,RecordingGenerationArchiveReadsForTest()==0,"checkpoint historical archive helper reads zero");
        RecordingGenerationReadResult read;Need(ReadRecordingGenerationManifestForOpen(root,&read,&error));T(6,read.manifest.generation==2&&read.manifest.cut_ordinal==2,"checkpoint independent generation/cut");
    }else {
        const auto pid=::fork();Need(pid>=0);
        if(pid==0){RecordingJournal j(JO(root));if(!j.Open(&error))::_exit(91);auto options=TO(root);options.enable_generation_writes=true;RecordingCatalog c(j,options);if(!c.Open(&error)||!c.MarkSegmentCorrupt("legacy","missing-media",&error))::_exit(91);crash_point=point;RecordingGenerationTransactionProbe::Hook(Crash);(void)c.Checkpoint(&error);::_exit(92);}
        int status=0;Need(::waitpid(pid,&status,0)==pid);T(6,WIFEXITED(status)&&WEXITSTATUS(status)==77,"checkpoint crash reached "+point);
        const bool recoverable=point!="intent-durable";T(6,Recover(root)==recoverable,"checkpoint recovery decision "+point);
    }
    T(6,Originals(root)==original,"checkpoint legacy originals unchanged");
}
#endif
}
int main(int argc,char** argv) {
    if(argc!=2)return 2;
    try {
        const std::filesystem::path base=argv[1];std::filesystem::create_directories(base);
#if MEDIA_SERVER_USE_OPENSSL && MEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND
        Normal(base/"normal","store");Normal(base/"punctuation","store:one.part");
        const auto original_cwd=std::filesystem::current_path();std::filesystem::current_path(base);Normal("relative","store");std::filesystem::current_path(original_cwd);
#if defined(__APPLE__)
        const auto canonical_base=std::filesystem::canonical(base).string();
        if(canonical_base.rfind("/private/var/",0)==0||canonical_base.rfind("/private/tmp/",0)==0)Normal(std::filesystem::path(canonical_base.substr(8))/"os-alias","store");
#endif
        for(const char* point:{"receipt-linked","receipt-renamed","receipt-directory-synced","component-linked","component-root-synced","component-unlinked","component-stage-synced","marker-backup-linked","marker-backup-synced","marker-renamed","marker-synced"})CrashCase(base/point,point,true);
        for(const char* point:{"receipt-created","receipt-written","receipt-file-synced"})CrashCase(base/point,point,false);
        for(const char* point:{"receipt-created","receipt-written","receipt-file-synced","receipt-renamed","receipt-directory-synced"})CrashCase(base/(std::string("intent-")+point),point,false,2);
        // 두 번째 receipt 교체는 이미 marker v2인 PUBLISH_INTENT다.
        CrashCase(base/"intent","intent-durable",false);
        CrashCase(base/"published","manifest-published",true);
        for(const char* point:{"marker-restored","marker-restore-synced","component-cleaned"})RollbackCrash(base/(std::string("rollback-")+point),point);
        for(unsigned i=0;i<11;++i)Tamper(base/("tamper-"+std::to_string(i)),i);
        Checkpoint(base/"checkpoint-normal","");
        LiveCleanup(base/"checkpoint-live-cleanup");
        IncompleteStage(base/"checkpoint-incomplete-stage");
        for(const char* point:{"component-linked","intent-durable","manifest-published"})Checkpoint(base/(std::string("checkpoint-")+point),point);
#else
        RecordingJournal journal(JO(base));if(!journal.Open(&error))throw std::runtime_error(error);RecordingCatalog catalog(journal,TO(base));
        T(5,!RecordingGenerationTransactionProbe::Publish(catalog,TL(),&error),"unsupported publication rejected");
#endif
        return transaction_failures?1:0;
    }catch(const std::exception& e){std::cerr<<"fixture failure: "<<e.what()<<'\n';return 2;}
}

// 파일 용도: 녹화 runtime과 세대 저장 연결의 격리 smoke를 검증한다.
// 기본 runtime의 형식 선택·전환·복구를 실제 제품 archive에 연결하는 격리 검사다.
#include "recording/recording_runtime_composition.h"
#include "recording/recording_cutover_candidate.h"
#include "recording/recording_generation_transaction.h"
#include "ingress/recording_application_service.h"
#include <algorithm>
#include <fstream>
#include <iostream>
#include <limits>
#include <stdexcept>
#include <sys/stat.h>
#include <sys/wait.h>
#include <unistd.h>

namespace recording {
struct RecordingJournalGenerationReadOnlyProbe {
    static bool RuntimeLimits(const RecordingJournal& journal){
        const auto& l=journal.generation_limits_;
        return l.snapshot_bytes==1024ULL*1024*1024&&l.active_bytes==1024ULL*1024*1024&&
            l.identity_shard_bytes==1024ULL*1024*1024&&l.cold_row_bytes==16ULL*1024*1024+1&&
            l.identity_unique_ids==std::numeric_limits<std::size_t>::max()&&
            l.identity_archives==std::numeric_limits<std::size_t>::max();
    }
};
// 테스트만 private coordinator의 유효 중단 자료를 만든다. runtime에 값 DTO 권한을 열지 않는다.
struct RecordingGenerationTransactionProbe {
    static bool Interrupted(RecordingCatalog& catalog,const std::filesystem::path& root,int phase,std::string* error) {
        RecordingGenerationTransaction transaction;
        if(!transaction.Create(root,error))return false;
        struct stat r{},s{};
        if(::lstat(root.c_str(),&r)||::lstat(transaction.StagePath().c_str(),&s))return false;
        RecordingCutoverCandidateLimits limits;limits.chain={1024*1024,1000,1000};
        limits.snapshot_bytes=1024*1024;limits.cold_row_bytes=16*1024*1024+1;
        RecordingCutoverCandidate candidate;RecordingCutoverCreatedFiles created;
        if(!catalog.PrepareManagedCutoverCandidate({transaction.StagePath(),static_cast<std::uint64_t>(s.st_dev),static_cast<std::uint64_t>(s.st_ino)},limits,&candidate,&created,error))return false;
        RecordingGenerationReceipt receipt;receipt.root_device=r.st_dev;receipt.root_inode=r.st_ino;
        receipt.stage_device=s.st_dev;receipt.stage_inode=s.st_ino;receipt.stage_name=transaction.StagePath().filename().string();
        receipt.target=candidate.projection.manifest;
        if(!transaction.Describe(false,".recording-store-format",&receipt.marker,error)||
           !transaction.Describe(false,"recording-v2-mutations.jsonl",&receipt.source,error))return false;
        RecordingGenerationOwnedFile marker;
        if(!transaction.WriteReplacementMarker("{\"format\":\"media-server.managed-recording-store.v2\",\"storeId\":\""+receipt.target.store_id+"\",\"manifest\":\"recording-generation.json\"}\n",&marker,error))return false;
        receipt.replacement_marker=marker;
        for(const auto& f:created.files){RecordingGenerationOwnedFile owned;if(!transaction.Describe(true,f.name,&owned,error))return false;receipt.created.push_back(owned);}
        std::sort(receipt.created.begin(),receipt.created.end(),[](const auto& a,const auto& b){return a.file.name<b.file.name;});
        if(!transaction.Prepare(receipt,error))return false;
        if(phase>=1&&(!transaction.Promote(error)||!transaction.ReplaceMarker(error)))return false;
        if(phase>=2&&!transaction.PublishIntent(error))return false;
        return phase<3||PublishRecordingGenerationManifest(root,receipt.target,error)==RecordingGenerationPublishResult::Published;
    }
};
}
namespace {
using namespace recording;
std::string error;
unsigned passed=0,failed=0;
void Need(bool value){if(!value)throw std::runtime_error(error.empty()?"fixture preparation failed":error);}
void Check(unsigned id,bool value,const std::string& label){
    std::cout<<"B05-R0"<<id<<' '<<(value?"PASS ":"FAIL ")<<label<<'\n';
    value?++passed:++failed;if(!value)std::cerr<<"[diagnostic] "<<error<<'\n';
}
std::string Read(const std::filesystem::path& path){std::ifstream in(path,std::ios::binary);Need(bool(in));return {std::istreambuf_iterator<char>(in),{}};}
void Write(const std::filesystem::path& path,const std::string& value){std::ofstream out(path,std::ios::binary);out<<value;Need(bool(out));}
RecordingCatalog::Options Options(const std::filesystem::path& root){RecordingCatalog::Options o{root/"recording-catalog.sqlite3",root,false};o.enable_v2_storage=true;return o;}
RecordingSegmentV1 Segment(){
    RecordingSegmentV1 s;s.segment_id="legacy";s.source_id="source";s.channel_id="channel";s.stream_epoch_id="epoch";
    s.start={1000,0,1,1000000000};s.end={2000,1000000000,1,1000000000};s.container="mp4";s.video_codecs={"h264"};
    s.audio_omitted_reason="source-no-audio";s.size_bytes=12;s.checksum_sha256=std::string(64,'a');
    s.lifecycle=RecordingLifecycle::Finalized;s.created_at_ms=1000;s.finalized_at_ms=2000;return s;
}
void Legacy(const std::filesystem::path& root){
    RecordingJournal journal(RecordingJournal::ManagedOptions{root,"store.runtime:fixture"});Need(journal.Open(&error));
    RecordingMutationV1 row;row.mutation_id="finalized";row.entity_id="legacy";row.occurred_at_ms=1;
    row.mutation_type=RecordingMutationType::SegmentFinalized;
    row.payload_json="{\"segment\":"+SerializeRecordingSegmentV1(Segment())+",\"mediaRelpath\":\"channel/file.mp4\"}";
    Need(journal.Append(row,&error));std::filesystem::create_directories(root/"channel");
    Write(root/"channel/file.mp4","fixture-only");Write(root/"recording-catalog.sqlite3","old-sqlite-must-not-change");
}
std::string Original(const std::filesystem::path& root){return Read(root/"recording-v2-mutations.jsonl")+Read(root/"recording-catalog.sqlite3")+Read(root/"channel/file.mp4");}
bool IsB(const std::filesystem::path& root){return Read(root/".recording-store-format").find("managed-recording-store.v2")!=std::string::npos&&std::filesystem::is_regular_file(root/"recording-generation.json");}
void Fresh(const std::filesystem::path& root){
    std::string store;
    {RecordingRuntimeStorage storage(root);Need(storage.Open(&error));store=storage.journal().ManagedStoreId();
        Check(7,RecordingJournalGenerationReadOnlyProbe::RuntimeLimits(storage.journal()),"format/row limits separate from lifetime identity counts");
        Check(1,IsB(root),"supported default creates B marker and manifest");
        if(!IsB(root))return;
        RecordingOrderReservationV1 order,retry;RecordingCatalogStatusSnapshot status;
        Check(1,storage.catalog().ReserveRecordingOrder(store,"request","segment","channel",&order,&error)&&order.sequence==1&&
            storage.catalog().ReserveRecordingOrder(store,"request","segment","channel",&retry,&error)&&retry.sequence==1,"Catalog owns runtime reservation and retry");
        Check(1,!storage.journal().ReserveRecordingOrder(store,"raw","raw-segment","channel",&retry,&error),"raw B journal remains blocked");
        Check(1,storage.catalog().SnapshotStatus(&status,&error)&&status.catalog_mode=="generation-sqlite","actual B current cache active");
        Check(5,storage.Open(&error)&&storage.journal().ManagedStoreId()==store,"successful repeated Open retains owner/store");
        const auto child=::fork();Need(child>=0);if(child==0)::_exit(storage.Open(&error)?1:0);
        int result=0;Need(::waitpid(child,&result,0)==child);Check(5,WIFEXITED(result)&&WEXITSTATUS(result)==0,"forked runtime owner rejected");
    }
    RecordingRuntimeStorage storage(root);Need(storage.Open(&error));RecordingOrderReservationV1 next;
    Check(1,storage.journal().ManagedStoreId()==store&&storage.catalog().ReserveRecordingOrder(store,"second","segment-2","channel",&next,&error)&&next.sequence==2,"fresh runtime restores store/order then appends");
}
void PublicStatus(const std::filesystem::path& root,bool fallback){
    {RecordingRuntimeStorage initialize(root);Need(initialize.Open(&error));}
    if(fallback){
        const auto file=root/"recording-generation-catalog.sqlite3";
        Need(std::filesystem::is_regular_file(file));std::filesystem::remove(file);
        Need(::chmod(root.c_str(),0500)==0);
    }
    RecordingRuntimeStorage storage(root);const bool opened=storage.Open(&error);
    if(fallback)Need(::chmod(root.c_str(),0700)==0);
    Need(opened);RecordingReadService reader(storage.catalog());
    ingress::RecordingApplicationService service(reader,storage.catalog(),true,
        [](const auto&,auto* channels){channels->push_back({"channel","visible",true,true,false,10,20,100,200});channels->push_back({"hidden","hidden",true,false,false,30,40,300,400});return true;});
    const auto response=service.Status([](const auto& channel){return channel=="channel";});
    const auto expected=fallback?"\"catalogMode\":\"jsonl-fallback\",\"degraded\":true":"\"catalogMode\":\"sqlite-primary\",\"degraded\":false";
    Check(6,response.status==200&&response.body.find(expected)!=std::string::npos,"public mode/degraded retains existing enum meaning");
    Check(6,response.body.find("hidden")==std::string::npos&&response.body.find("\"continuousBytes\":10,\"eventBytes\":20")!=std::string::npos&&response.body.find(root.string())==std::string::npos,"public authorized counters and path redaction unchanged");
}
}
int main(int argc,char** argv){
    if(argc!=2&&argc!=3)return 2;
    try{
        const std::filesystem::path root(argv[1]);std::filesystem::create_directories(root);
        if(argc==3){RecordingRuntimeStorage storage(root/"red");Need(storage.Open(&error));Check(1,IsB(root/"red"),"expected RED before runtime B default");return failed?1:0;}
        Fresh(root/"fresh");if(failed)return 1;
        const auto legacy=root/"legacy";Legacy(legacy);const auto original=Original(legacy);
        {RecordingRuntimeStorage storage(legacy);Need(storage.Open(&error));const auto segment=storage.catalog().FindSegmentById("legacy");
            Check(2,IsB(legacy)&&segment&&SerializeRecordingSegmentV1(*segment)==SerializeRecordingSegmentV1(Segment())&&
                storage.journal().ManagedStoreId()=="store.runtime:fixture"&&Original(legacy)==original,"strict legacy domain/store/source/cache/media preserved");}
        for(int phase=0;phase<4;++phase){
            const auto path=root/("interrupted-"+std::to_string(phase));Legacy(path);const auto before=Original(path);
            {RecordingJournal journal(RecordingJournal::ManagedOptions{path,{}});Need(journal.Open(&error));RecordingCatalog catalog(journal,Options(path));Need(RecordingGenerationTransactionProbe::Interrupted(catalog,path,phase,&error));}
            const auto receipt=Read(path/".recording-generation-transaction.json");RecordingRuntimeStorage storage(path);const bool opened=storage.Open(&error);
            Check(3,opened==(phase!=2),"startup decision for prepared/marker/intent/target phase "+std::to_string(phase));
            Check(3,Original(path)==before,"interrupted startup preserves original bytes "+std::to_string(phase));
            if(opened){RecordingOrderReservationV1 order;Check(3,IsB(path)&&!std::filesystem::exists(path/".recording-generation-transaction.json")&&storage.catalog().FindSegmentById("legacy")&&
                storage.catalog().ReserveRecordingOrder(storage.journal().ManagedStoreId(),"after-recovery","new","channel",&order,&error),"recovered startup returns fresh writable B owner");}
            else Check(3,Read(path/".recording-generation-transaction.json")==receipt,"uncertain intent preserved without v1 fallback");
        }
        for(const auto* name:{".recording-generation-transaction.json",".recording-generation-transaction.stage"}){
            const auto path=root/(std::string("invalid-")+name);Legacy(path);const auto before=Original(path);Write(path/name,"unknown-owned-fixture");
            RecordingRuntimeStorage storage(path);Check(3,!storage.Open(&error)&&Read(path/name)=="unknown-owned-fixture"&&Original(path)==before,"bad receipt/temp preserved and runtime blocked");
        }
        const auto corrupt=root/"corrupt";{RecordingRuntimeStorage storage(corrupt);Need(storage.Open(&error));}
        const auto old=Read(corrupt/"recording-v2-mutations.jsonl");Write(corrupt/"recording-generation.json","broken");
        {RecordingRuntimeStorage storage(corrupt);Check(4,!storage.Open(&error)&&Read(corrupt/"recording-generation.json")=="broken"&&Read(corrupt/"recording-v2-mutations.jsonl")==old,"broken B never reactivates old journal");}
        const auto real=root/"real";std::filesystem::create_directory(real);std::filesystem::create_directory_symlink(real,root/"link");
        {RecordingRuntimeStorage storage(root/"link");Check(5,!storage.Open(&error)&&std::filesystem::is_empty(real),"arbitrary symlink root rejected without files");}
        {RecordingRuntimeStorage storage(root/"real"/".."/"escape");Check(5,!storage.Open(&error)&&!std::filesystem::exists(root/"escape"),"parent traversal rejected before mutation");}
        const auto cwd=std::filesystem::current_path();std::filesystem::current_path(root);
        {RecordingRuntimeStorage storage("relative");Check(5,storage.Open(&error)&&IsB(root/"relative"),"relative path accepted with normal authority");}
        std::filesystem::current_path(cwd);
#if defined(__APPLE__)
        if(root.string().rfind("/private/var/",0)==0||root.string().rfind("/private/tmp/",0)==0){
            RecordingRuntimeStorage storage(std::filesystem::path(root.string().substr(8))/"alias");
            Check(5,storage.Open(&error)&&IsB(root/"alias"),"existing macOS OS alias preserved");}
#endif
        PublicStatus(root/"public-sql",false);
        PublicStatus(root/"public-fallback",true);
        const auto badsql=root/"bad-sql";{RecordingRuntimeStorage storage(badsql);Need(storage.Open(&error));}
        const auto before_sql=Read(badsql/"recording-generation.json");Write(badsql/"recording-generation-catalog.sqlite3","not-sqlite");
        {RecordingRuntimeStorage storage(badsql);Check(4,!storage.Open(&error)&&Read(badsql/"recording-generation-catalog.sqlite3")=="not-sqlite"&&Read(badsql/"recording-generation.json")==before_sql,"SQLite rebuild failure not hidden as fallback");}
        std::cout<<"[summary] pass="<<passed<<" fail="<<failed<<'\n';return failed?1:0;
    }catch(const std::exception& exception){std::cerr<<"[fixture-failure] "<<exception.what()<<'\n';return 2;}
}

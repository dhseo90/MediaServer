#include "recording/recording_journal.h"
#include "recording/recording_cutover_input.h"
#include "recording/recording_catalog_snapshot.h"
#include <fstream>
#include <iostream>
#include <stdexcept>
#include <fcntl.h>
#include <cerrno>
#include <sys/wait.h>
#include <unistd.h>
#if MEDIA_SERVER_USE_OPENSSL
#include <openssl/evp.h>
#include <zlib.h>
#endif
namespace recording {
struct RecordingCutoverSessionProbe {
    static bool Attach(RecordingJournal& j,const std::filesystem::path& p) {
        return j.AttachCatalog(&j,p,p/"recording-catalog.sqlite3",true,nullptr);
    }
    static bool Visit(RecordingJournal& j,const std::function<bool(const RecordingCutoverInputRow&,const RecordingJournalOwnedViewHandle&,std::string*)>& fn,
        RecordingCutoverInputSummary* out,std::string* error) {return j.VisitManagedCutoverInput(&j,fn,out,error);}
    static bool Foreign(RecordingJournal& j,RecordingCutoverInputSummary* out,unsigned* visits){int foreign=0;return j.VisitManagedCutoverInput(&foreign,[&](const auto&,const auto&,std::string*){++*visits;return true;},out,nullptr);}
    static void Detach(RecordingJournal& j){j.DetachCatalog(&j);}
    static bool Link(RecordingJournal& j,const RecordingCutoverInputRow& row,const RecordingJournalOwnedViewHandle& view,RecordingMutationLink* link) {
        return j.MakeMutationLink(view,row.mutation,{},link,nullptr);
    }
    static bool Get(RecordingJournal& j,const RecordingMutationLink& link,RecordingMutationHandle* out){return j.AcquireMutationLink(link,out,nullptr);}
    static bool Append(RecordingJournal& j,const RecordingMutationV1& m){return j.AppendOwned(m,&j,nullptr);}
    static bool Commit(RecordingJournal& j){return j.CommitCheckpoint(&j,{},false,nullptr);}
    static bool Reads(RecordingJournal& j){return j.OwnsCatalog(&j)&&j.HasManagedLease()&&j.Replay().io_error_count==0;}
    static bool Release(RecordingJournal& j){return j.ReleaseRecordResidents(&j,nullptr);}
    static bool Frozen(RecordingJournal& j){return j.cutover_input_frozen_;}
    static bool Poisoned(RecordingJournal& j){return j.poisoned_;}
    static int Fd(RecordingJournal& j){return j.managed_fd_;}
    static int Lease(RecordingJournal& j){return j.lease_fd_;}
};
}
using namespace recording;
namespace {
unsigned failures=0;
std::string error;
void Check(unsigned group,bool ok,const char* label){std::cout<<"B04-S0"<<group<<' '<<(ok?"PASS":"FAIL")<<' '<<label<<'\n';if(!ok){++failures;std::cerr<<error<<'\n';}}
void Need(bool ok){if(!ok)throw std::runtime_error("fixture: "+error);}
[[maybe_unused]] void Write(const std::filesystem::path& p,const std::string& bytes){std::ofstream out(p,std::ios::binary|std::ios::trunc);out<<bytes;Need(bool(out));}
[[maybe_unused]] std::string Read(const std::filesystem::path& p){std::ifstream in(p,std::ios::binary);Need(bool(in));return {std::istreambuf_iterator<char>(in),{}};}
RecordingMutationV1 Mutation(){RecordingMutationV1 m;m.mutation_id="id";m.entity_id="entity";m.mutation_type=RecordingMutationType::EventLinkCreated;m.payload_json="{}";return m;}
[[maybe_unused]] const auto Accept=[](const auto&,const auto&,std::string*){return true;};
using Probe=RecordingCutoverSessionProbe;
#if MEDIA_SERVER_USE_OPENSSL && MEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND
std::string Hash(const std::string& bytes){unsigned char hash[32];unsigned size=0;Need(EVP_Digest(bytes.data(),bytes.size(),hash,&size,EVP_sha256(),nullptr)==1&&size==32);std::string result;const char* hex="0123456789abcdef";for(auto c:hash){result+=hex[c>>4];result+=hex[c&15];}return result;}
std::string Compress(const std::string& logical){
    std::string packed(compressBound(logical.size()),'\0');uLongf size=packed.size();
    Need(compress2(reinterpret_cast<Bytef*>(packed.data()),&size,reinterpret_cast<const Bytef*>(logical.data()),logical.size(),Z_DEFAULT_COMPRESSION)==Z_OK);
    std::string data(4*((size+2)/3)+1,'\0');data.resize(EVP_EncodeBlock(reinterpret_cast<unsigned char*>(data.data()),reinterpret_cast<const unsigned char*>(packed.data()),size));
    const auto crc=crc32(crc32(0,Z_NULL,0),reinterpret_cast<const Bytef*>(logical.data()),logical.size());
    return "{\"schema\":\"media-server.recording-compressed-mutation.v1\",\"codec\":\"zlib-base64\",\"length\":"+std::to_string(logical.size())+",\"crc32\":"+std::to_string(crc)+",\"data\":\""+data+"\"}";
}
void Fixture(const std::filesystem::path& root,const std::string& raw){
    {RecordingJournal j(RecordingJournal::ManagedOptions{root,"store"});Need(j.Open(&error));}
    Write(root/"recording-v2-mutations.jsonl",raw);
    Write(root/"recording-catalog.sqlite3","cache-sentinel");
    Write(root/"sample.mp4.cleanup-pending","cleanup-sentinel");Write(root/"sample.mp4","media-sentinel");
}
std::string Files(const std::filesystem::path& root){std::string result;for(const char* n:{"recording-v2-mutations.jsonl",".recording-store-format","recording-catalog.sqlite3","sample.mp4.cleanup-pending","sample.mp4"})result+=Read(root/n);return result;}
void Normal(const std::filesystem::path& root){
    const auto m=Mutation();const auto raw=SerializeRecordingMutationV1(m)+"\n";
    auto packed=m;packed.mutation_id="packed";packed.mutation_type=RecordingMutationType::SegmentV2BoundFinalized;
    const auto wrapper=Compress(SerializeRecordingMutationV1(packed));
    const auto bytes="\n  "+raw+raw+wrapper+"\n";
    Fixture(root,bytes);const auto original=Files(root);
    RecordingJournal j(RecordingJournal::ManagedOptions{root,"store"});Need(j.Open(&error));Need(Probe::Attach(j,root));Need(Probe::Release(j));
    RecordingCutoverInputSummary summary;summary.rows=99;unsigned visits=0;RecordingMutationLink last;
    lseek(Probe::Fd(j),2,SEEK_SET);
    const bool success=Probe::Visit(j,[&](const auto& row,const auto& view,std::string*){
        Check(1,row.ordinal==visits++,"nonempty dense row order");
        Check(1,Probe::Link(j,row,view,&last),"verified view creates link");
        RecordingMutationHandle detail;
        Check(1,Probe::Get(j,last,&detail)&&detail&&SerializeRecordingMutationV1(*detail)==SerializeRecordingMutationV1(row.mutation),"view cold detail acquisition during callback");
        if(row.ordinal==0){
            auto next=m;next.mutation_id="next";RecordingOrderReservationV1 order;
            Check(2,!Probe::Append(j,next)&&!j.Append(next,&error),"owned and raw append blocked");
            Check(2,!j.ReserveRecordingOrder("store","request","segment","channel",&order,&error),"reservation blocked");
            Check(2,!Probe::Commit(j)&&!j.Open(&error),"checkpoint and reopen blocked");
            RecordingCutoverInputSummary nested;nested.rows=99;
            Check(2,!Probe::Visit(j,Accept,&nested,&error)&&nested.rows==99,"nested visit blocked");
            Check(2,Probe::Reads(j),"read and cold authority retained");
        }
        return true;
    },&summary,&error);
    Check(1,success&&visits==3&&summary.rows==3&&summary.blank_lines==1&&summary.source_bytes==bytes.size()&&summary.sha256==Hash(bytes),"noncanonical blank retry compressed complete summary");
    Check(1,lseek(Probe::Fd(j),0,SEEK_CUR)==2&&Files(root)==original,"borrowed offset and original cache media cleanup marker unchanged");
    RecordingMutationHandle detail;
    Check(1,Probe::Get(j,last,&detail)&&detail&&detail->physical_json==wrapper,"cold link survives visitor row lifetime");
    for(bool throws:{false,true}){
        summary.rows=99;summary.sha256="sentinel";
        Check(3,!Probe::Visit(j,[&](const auto&,const auto&,std::string*)->bool{if(throws)throw std::runtime_error("visitor");return false;},&summary,&error)&&summary.rows==99&&summary.sha256=="sentinel"&&!Probe::Frozen(j)&&!Probe::Poisoned(j),throws?"callback exception clears freeze":"callback rejection clears freeze");
        Check(3,Probe::Visit(j,Accept,&summary,&error)&&summary.rows==3&&Files(root)==original,"retry after callback failure remains strict and unchanged");
    }
    unsigned foreign_visits=0;
    Check(5,!Probe::Foreign(j,&summary,&foreign_visits)&&foreign_visits==0,"foreign owner refused without callback");
    const auto child=fork();Need(child>=0);
    if(child==0){RecordingCutoverInputSummary s;const bool refused=!Probe::Visit(j,Accept,&s,nullptr);_exit(refused?0:1);}
    int status=0;Need(waitpid(child,&status,0)==child);Check(5,WIFEXITED(status)&&WEXITSTATUS(status)==0,"fork owner refused");
    auto next=m;next.mutation_id="after";Check(3,Probe::Append(j,next),"append resumes after synchronous visit");
}
void Reject(const std::filesystem::path& root){
    Fixture(root,SerializeRecordingMutationV1(Mutation())+"\n");
    {RecordingJournal j(RecordingJournal::ManagedOptions{root,"store"});Need(j.Open(&error));RecordingCutoverInputSummary s;s.rows=99;unsigned visits=0;
        Check(5,!Probe::Visit(j,[&](const auto&,const auto&,std::string*){++visits;return true;},&s,&error)&&s.rows==99&&visits==0,"no attachment refused without callback");}
    Write(root/".recording-checkpoint.tmp",Read(root/"recording-v2-mutations.jsonl"));
    RecordingJournal pending(RecordingJournal::ManagedOptions{root,"store"});Need(pending.Open(&error));Need(Probe::Attach(pending,root));
    const auto original=Files(root)+Read(root/".recording-checkpoint.tmp");RecordingCutoverInputSummary s;s.rows=99;
    Check(5,!Probe::Visit(pending,Accept,&s,&error)&&s.rows==99&&Files(root)+Read(root/".recording-checkpoint.tmp")==original,"pending checkpoint refused without recovery");
}
void Corrupt(const std::filesystem::path& root,unsigned variant){
    Fixture(root,SerializeRecordingMutationV1(Mutation())+"\n");
    const auto raw=Read(root/"recording-v2-mutations.jsonl"),marker=Read(root/".recording-store-format");
    RecordingJournal j(RecordingJournal::ManagedOptions{root,"store"});Need(j.Open(&error));Need(Probe::Attach(j,root));
    RecordingCutoverInputSummary s;s.rows=99;const auto moved=root.string()+"-moved";
    const bool result=Probe::Visit(j,[&](const auto&,const auto&,std::string*){
        if(variant==0){auto bytes=Read(root/"recording-v2-mutations.jsonl");bytes[0]='[';Write(root/"recording-v2-mutations.jsonl",bytes);}
        else if(variant==1)Write(root/".recording-store-format","changed-marker\n");
        else std::filesystem::rename(root,moved);
        return true;
    },&s,&error);
    Check(4,!result&&s.rows==99&&Probe::Poisoned(j)&&!Probe::Frozen(j),variant==0?"same length mutation poisons owner":variant==1?"marker change poisons owner":"root move poisons owner");
    Check(4,!Probe::Reads(j)&&!Probe::Append(j,Mutation())&&!j.Open(&error),"poisoned owner read write reopen blocked");
    if(variant==2)std::filesystem::rename(moved,root);
    else if(variant==1)Write(root/".recording-store-format",marker);
    else Write(root/"recording-v2-mutations.jsonl",raw);
    Check(4,!Probe::Reads(j)&&!Probe::Visit(j,Accept,&s,&error),"restored bytes do not unpoison owner");
}
void Lifetime(const std::filesystem::path& root){
    Fixture(root,SerializeRecordingMutationV1(Mutation())+"\n");const auto original=Files(root);
    int fd=-1,lease=-1;RecordingMutationLink old;
    {
        RecordingJournal j(RecordingJournal::ManagedOptions{root,"store"});Need(j.Open(&error));Need(Probe::Attach(j,root));
        fd=Probe::Fd(j);lease=Probe::Lease(j);RecordingCutoverInputSummary s;
        Need(Probe::Visit(j,[&](const auto& row,const auto& view,std::string*){return Probe::Link(j,row,view,&old);},&s,&error));
    }
    errno=0;const bool fd_closed=fcntl(fd,F_GETFD)==-1&&errno==EBADF;
    errno=0;const bool lease_closed=fcntl(lease,F_GETFD)==-1&&errno==EBADF;
    Check(6,fd_closed&&lease_closed,"owner destruction closes journal and lease FDs");
    RecordingJournal next(RecordingJournal::ManagedOptions{root,"store"});Need(next.Open(&error));Need(Probe::Attach(next,root));
    RecordingMutationHandle value;RecordingCutoverInputSummary s;
    Check(6,!Probe::Get(next,old,&value)&&Probe::Visit(next,Accept,&s,&error)&&Files(root)==original,"fresh owner strict reopen and old link refusal");
}
void EmptyAndAttachment(const std::filesystem::path& base){
    const auto empty=base/"empty";Fixture(empty,"");
    {RecordingJournal j(RecordingJournal::ManagedOptions{empty,"store"});Need(j.Open(&error));Need(Probe::Attach(j,empty));
        RecordingCutoverInputSummary s;s.rows=99;unsigned visits=0;
        Check(1,Probe::Visit(j,[&](const auto&,const auto&,std::string*){++visits;return true;},&s,&error)&&visits==0&&s.rows==0&&s.source_bytes==0&&s.sha256==Hash(""),"empty journal complete without callback");}
    const auto root=base/"attachment";Fixture(root,SerializeRecordingMutationV1(Mutation())+"\n");const auto original=Files(root);
    RecordingJournal j(RecordingJournal::ManagedOptions{root,"store"});Need(j.Open(&error));Need(Probe::Attach(j,root));
    RecordingCutoverInputSummary s;s.rows=99;
    Check(4,!Probe::Visit(j,[&](const auto&,const auto&,std::string*){Probe::Detach(j);return true;},&s,&error)&&s.rows==99&&Probe::Poisoned(j)&&!Probe::Frozen(j)&&Files(root)==original,"attachment detached during callback poisons final binding");
}
void Generation(const std::filesystem::path& root){
    std::filesystem::create_directories(root);
    RecordingIdentityShard shard;shard.store_id="store";shard.generation=1;
    std::string identity;Need(SerializeRecordingIdentityShard(shard,&identity,&error));Write(root/"identity-1.jsonl",identity);
    RecordingCatalogSnapshot snapshot;snapshot.store_id="store";snapshot.generation=1;snapshot.identity_head={"identity-1.jsonl",identity.size(),Hash(identity)};
    std::string bytes;Need(SerializeRecordingCatalogSnapshot(snapshot,&bytes,&error));Write(root/"snapshot-1.jsonl",bytes);Write(root/"active-1.jsonl","");
    RecordingGenerationManifest manifest;manifest.store_id="store";manifest.generation=1;manifest.snapshot={"snapshot-1.jsonl",bytes.size(),Hash(bytes)};manifest.active={"active-1.jsonl",0,Hash("")};
    Need(SerializeRecordingGenerationManifest(manifest,&bytes,&error));Write(root/"recording-generation.json",bytes);
    Write(root/".recording-store-format","{\"format\":\"media-server.managed-recording-store.v2\",\"storeId\":\"store\",\"manifest\":\"recording-generation.json\"}\n");
    RecordingJournal j(RecordingJournal::ManagedOptions{root,"store",{1048576,1048576,1048576,1048576,100,100}});Need(j.Open(&error));
    RecordingCutoverInputSummary s;s.rows=99;Check(5,!Probe::Visit(j,Accept,&s,&error)&&s.rows==99,"B generation is not legacy cutover input");
}
#endif
}
int main(int argc,char** argv) {
  try {
    if(argc!=2)return 2;
    const std::filesystem::path base(argv[1]);std::filesystem::create_directories(base);
    const auto root=base/"simple";
    RecordingJournal j(RecordingJournal::ManagedOptions{root,"store"});
    const auto m=Mutation();
    if(!j.Open(&error)||!j.Append(m,&error)||!RecordingCutoverSessionProbe::Attach(j,root)) {std::cerr<<error;return 2;}
    RecordingCutoverInputSummary summary;summary.rows=99;unsigned count=0;
    const bool result=RecordingCutoverSessionProbe::Visit(j,[&](const auto&,const auto&,std::string*){++count;return true;},&summary,&error);
#if MEDIA_SERVER_USE_OPENSSL && MEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND
    const bool pass=result&&count==1&&summary.rows==1;
    std::cout<<"B04-S01 "<<(pass?"PASS":"FAIL")<<" normal managed visit: "<<error<<'\n';
#else
    const bool pass=!result&&count==0&&summary.rows==99;
    std::cout<<"B04-S06 "<<(pass?"PASS":"FAIL")<<" unsupported unchanged\n";
#endif
#if MEDIA_SERVER_USE_OPENSSL && MEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND
    Normal(base/"normal");Reject(base/"reject");
    for(unsigned i=0;i<3;++i)Corrupt(base/("corrupt"+std::to_string(i)),i);
    Generation(base/"generation");
    Lifetime(base/"lifetime");
    EmptyAndAttachment(base);
#endif
    Check(6,!Probe::Frozen(j),"visitor scope leaves no freeze");
    return pass&&failures==0?0:1;
  }catch(const std::exception& e){std::cerr<<e.what()<<'\n';return 2;}
}

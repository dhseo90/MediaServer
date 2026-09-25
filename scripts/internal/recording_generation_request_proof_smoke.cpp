// 기존 B typed fixture만 재사용하며 미디어 실행이나 기존 main은 호출하지 않는다.
#define RECORDING_SCRATCH_MAIN RequestProofScratchFixtureMain
#include "recording_catalog_generation_scratch_smoke.cpp"
#undef RECORDING_SCRATCH_MAIN
#include <fcntl.h>
#include <sys/stat.h>
#include <sys/wait.h>
namespace recording {
struct RecordingGenerationRequestProofProbe {
    using Context=RecordingCatalog::JobReadContext;
    static bool Job(RecordingCatalog& c,const std::string& id,Context* context){
        std::lock_guard lock(c.mu_);RecordingCatalog::DerivedJobHandle job;
        return c.AcquireJobForReadLocked(id,&job,context,&error)&&job&&job->state==DerivedJobState::Complete;
    }
    static std::size_t Proofs(const Context& context){return context.proofs.size();}
    static void Foreign(Context& target,const Context& source,RecordingCatalog& c){target=source;target.owner=&c;target.proofs=source.proofs;}
    static bool Media(RecordingCatalog& c,const std::string& id,Context* context){
        RecordingSegmentV2 segment;std::pair<std::filesystem::path,std::filesystem::path> path;
        return c.AcquireMediaWithContext("channel",id,&segment,&path,&error,context)&&
            c.ValidateMediaWithContext(segment,path,context)&&c.AdjustHoldCount(id,-1,&error);
    }
};
}
using ProofProbe=RecordingGenerationRequestProofProbe;
int OpenDescriptors(){int count=0;for(int fd=0;fd<1024;++fd)if(::fcntl(fd,F_GETFD)!=-1)++count;return count;}
#if MEDIA_SERVER_USE_OPENSSL && MEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND
Input CompleteInput(){auto value=ReadyInput();value.job.state=DerivedJobState::Complete;value.job.cleaned_at_ms=30;return value;}
void CompleteFixture(const std::filesystem::path& root){
    const auto input=CompleteInput();ProjectionFixture f;const auto& s=input.source.segment;
    f.Order("order","segment",1);
    f.Add(RecordingMutationType::SegmentV2BoundFinalized,"bound","segment","{\"segment\":"+SerializeRecordingSegmentV2(s)+",\"mediaRelpath\":\"channel/source.mp4\",\"sourceBinding\":"+SerializeRecordingSourceBindingV1(*input.source.binding)+"}");
    f.Row("segment-v2",s.segment_id,SerializeRecordingSegmentV2(s));f.Row("media-path",s.segment_id,"\"channel/source.mp4\"");
    std::string value;Need(SerializeRecordingCatalogSourceSummary({"segment","channel","source","gen","video/0",1,2,"bound"},&value,&error));f.Row("source-binding","segment",value);
    RecordingCatalogJobSummary summary{input.job.intent.job_id,"channel","reference",DerivedJobState::Complete,input.job.files.size(),4096,{}, {"segment"},"job-mutation"};
    for(std::size_t i=0;i<input.job.ready->outputs.size();++i){const auto& o=input.job.ready->outputs[i];
        f.Order(o.segment.order_request_id,o.segment.segment_id,o.segment.order_sequence);
        f.Row("segment-v2",o.segment.segment_id,SerializeRecordingSegmentV2(o.segment));
        f.Row("media-path",o.segment.segment_id,"\""+input.job.intent.outputs[i].final_relpath+"\"");summary.output_ids.push_back(o.segment.segment_id);
    }
    const auto job=SerializeDerivedJobRecord(input.job);DerivedJobRecordV1 parsed;Need(!job.empty()&&ParseDerivedJobRecord(job,&parsed,&error));
    f.Add(RecordingMutationType::DerivedJobComplete,"job-mutation",input.job.intent.job_id,job);
    Need(SerializeRecordingCatalogJobSummary(summary,&value,&error));f.Row("derived-job",summary.id,value);
    f.Row("consumer-reference","reference",SerializeRecordingConsumerReferenceV1(input.job.intent.reference));f.Row("derived-reference-accepted","reference","true");
    Install(f,root);
}
RecordingCatalog::Options ReadOptions(const std::filesystem::path& root){RecordingCatalog::Options o(root/"recording-catalog.sqlite3",root,false);o.enable_v2_storage=true;return o;}
#endif
int main(int argc,char** argv){
    if(argc!=2)return 2;
    try {const std::filesystem::path root=argv[1];std::filesystem::create_directories(root);
#if MEDIA_SERVER_USE_OPENSSL && MEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND
        const auto normal=root/"normal";std::filesystem::create_directories(normal);
        CompleteFixture(normal);RecordingJournal j(Options(normal));Need(j.Open(&error));RecordingCatalog c(j,ReadOptions(normal));Need(c.Open(&error));
        ProofProbe::Context context;const auto id=CompleteInput().job.intent.job_id;
        RecordingGenerationArchiveReadsForTest(true);
        Need(ProofProbe::Job(c,id,&context));Need(ProofProbe::Job(c,id,&context));
        const auto reads=RecordingGenerationArchiveReadsForTest();
        std::cout<<"[counter] archive_full_reads="<<reads<<'\n';
        Check("B08-Q01",reads==1,"same request repeated typed Complete acquisition hashes archive once");
        Check("B08-Q01",ProofProbe::Proofs(context)==1,"strict typed acquisition stores one private proof");
        Check("B08-Q02",context.charge>0&&context.charge<=context.budget,"B logical context charge is nonzero and bounded");
        auto copied=context;
        Check("B08-Q02",ProofProbe::Proofs(copied)==0,"copy retains typed candidates but never proof");
        RecordingGenerationArchiveReadsForTest(true);Need(ProofProbe::Job(c,id,&copied));
        Check("B08-Q02",RecordingGenerationArchiveReadsForTest()==1,"copied request repeats full archive verification");
        ProofProbe::Context fresh;RecordingGenerationArchiveReadsForTest(true);Need(ProofProbe::Job(c,id,&fresh));
        Check("B08-Q02",RecordingGenerationArchiveReadsForTest()==1,"new request repeats full archive verification");
        ProofProbe::Context budget;budget.budget=0;RecordingGenerationArchiveReadsForTest(true);
        Need(ProofProbe::Job(c,id,&budget));Need(ProofProbe::Job(c,id,&budget));
        Check("B08-Q02",RecordingGenerationArchiveReadsForTest()==2&&ProofProbe::Proofs(budget)==0,"zero optional budget uses strict fallback");
        Check("B08-Q04",ProofProbe::Media(c,CompleteInput().job.intent.outputs.front().output_id,&context),"proof preserves media eligibility and acquire/release hold");
        const auto pid=::fork();Need(pid>=0);
        if(pid==0)::_exit(ProofProbe::Job(c,id,&context)?1:0);
        int status=0;Need(::waitpid(pid,&status,0)==pid);
        Check("B08-Q03",WIFEXITED(status)&&WEXITSTATUS(status)==0,"fork cannot reuse request proof");
        {const auto path=root/"foreign";std::filesystem::create_directories(path);CompleteFixture(path);
         RecordingJournal owner(Options(path));Need(owner.Open(&error));RecordingCatalog catalog(owner,ReadOptions(path));Need(catalog.Open(&error));
         ProofProbe::Context local;ProofProbe::Foreign(local,context,catalog);
         Check("B08-Q03",!ProofProbe::Job(catalog,id,&local),"foreign Journal proof rejected even with equal archive bytes");}
        {const int before=OpenDescriptors();{ProofProbe::Context local;Need(ProofProbe::Job(c,id,&local));
          Check("B08-Q03",OpenDescriptors()==before+1,"request proof retains one archive descriptor");}
         Check("B08-Q03",OpenDescriptors()==before,"request destruction releases retained archive descriptor");}
        const auto writable=root/"writable";std::filesystem::create_directories(writable);CompleteFixture(writable);
        {RecordingJournal owner(Options(writable));Need(owner.Open(&error));auto options=ReadOptions(writable);options.enable_generation_writes=true;
         RecordingCatalog catalog(owner,options);Need(catalog.Open(&error));ProofProbe::Context local;Need(ProofProbe::Job(catalog,id,&local));
         RecordingOrderReservationV1 reserved;Need(catalog.ReserveRecordingOrder("store","proof-order","proof-segment","channel",&reserved,&error));
         RecordingGenerationArchiveReadsForTest(true);Need(ProofProbe::Job(catalog,id,&local));
         Check("B08-Q02",RecordingGenerationArchiveReadsForTest()==1,"own active append invalidates proof and fully verifies again");
         Need(catalog.Checkpoint(&error));RecordingGenerationArchiveReadsForTest(true);Need(ProofProbe::Job(catalog,id,&local));
         Check("B08-Q02",RecordingGenerationArchiveReadsForTest()==1,"normal generation rotation returns to full verification");}
        {RecordingJournal owner(Options(writable));Need(owner.Open(&error));RecordingCatalog catalog(owner,ReadOptions(writable));Need(catalog.Open(&error));
         ProofProbe::Context local;RecordingGenerationArchiveReadsForTest(true);Need(ProofProbe::Job(catalog,id,&local));
         Check("B08-Q02",RecordingGenerationArchiveReadsForTest()==1,"fresh owner strictly verifies archive again");}
        for(const std::string mode:{"same-size","other-row","inode","symlink","hardlink"}){
            const auto path=root/mode;std::filesystem::create_directories(path);CompleteFixture(path);
            RecordingJournal owner(Options(path));Need(owner.Open(&error));RecordingCatalog catalog(owner,ReadOptions(path));Need(catalog.Open(&error));
            ProofProbe::Context local;Need(ProofProbe::Job(catalog,id,&local));
            const auto file=path/"evidence-1-0.jsonl";const auto bytes=Read(file);struct stat before{};Need(::stat(file.c_str(),&before)==0);
            if(mode=="same-size"||mode=="other-row"){
                const int fd=::open(file.c_str(),O_WRONLY|O_NOFOLLOW);Need(fd>=0);
                const auto offset=mode=="other-row"?std::size_t(1):bytes.rfind("job-mutation");Need(offset<bytes.size());
                const char changed=bytes[offset]=='x'?'y':'x';Need(::pwrite(fd,&changed,1,static_cast<off_t>(offset))==1);
#if defined(__APPLE__)
                const timespec times[2]={before.st_atimespec,before.st_mtimespec};
#else
                const timespec times[2]={before.st_atim,before.st_mtim};
#endif
                Need(::futimens(fd,times)==0);Need(::close(fd)==0);
            }else if(mode=="hardlink")Need(::link(file.c_str(),(path/"extra-link").c_str())==0);
            else {std::filesystem::rename(file,path/"old-archive");if(mode=="inode")Write(file,bytes);else Need(::symlink("old-archive",file.c_str())==0);}
            RecordingGenerationArchiveReadsForTest(true);
            Check("B08-Q03",!ProofProbe::Job(catalog,id,&local)&&RecordingGenerationArchiveReadsForTest()==0,
                (mode+" tamper rejects without strict fallback accepting changed archive").c_str());
            Check("B08-Q03",!ProofProbe::Job(catalog,id,&local),(mode+" poisoned owner stays rejected").c_str());
        }
#else
        RecordingJournal j(Options(root));Check("B08-Q04",j.Open(&error),"v1 remains available in unsupported B build");
#endif
        return failures?1:0;
    }catch(const std::exception& e){std::cerr<<"fixture: "<<e.what()<<'\n';return 2;}
}

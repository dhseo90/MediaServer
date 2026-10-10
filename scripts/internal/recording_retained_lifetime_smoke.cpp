// 파일 용도: 실제 검색/증거/확인된 A의 고정 보존량(B)과 신규 보존량(C)을 분리한다.
#define main PriorVaReviewFixtureMain
#include "va_review_smoke.cpp"
#undef main
#include "recording/recording_search_snapshots.h"
#include <sys/resource.h>
#ifdef __APPLE__
#include <malloc/malloc.h>
#include <mach/mach.h>
#elif defined(__linux__)
#include <malloc.h>
#include <unistd.h>
#endif
namespace recording {
struct RecordingAggregateResourceProbe {
    using View=RecordingCatalog::GenerationSnapshotView;
    static bool Capture(RecordingCatalog& catalog,View* view,std::string* error){
        std::lock_guard lock(catalog.mu_);return catalog.CaptureGenerationSnapshotViewLocked(view,error);
    }
    static auto Scratch(RecordingCatalog& catalog){return catalog.journal_.ScratchOwner();}
};
struct VaReviewServiceResidencyProbe {
    static std::size_t Metadata(VaReviewService& service) {
        std::lock_guard lock(service.mutex_);std::size_t chars=0;
        for(const auto& item:service.jobs_){const auto& t=*item.second;
            chars+=item.first.capacity()+t.key.capacity()+t.question.capacity()+t.provider.capacity();
            for(const auto* v:{&t.job.id,&t.job.package_id,&t.job.channel_id,&t.job.owner,&t.job.state,&t.job.review_id,&t.job.error,&t.job.kind})chars+=v->capacity();}
        std::cout<<"[job-metadata] jobs="<<service.jobs_.size()<<" order="<<service.order_.size()<<" queued="<<service.queue_.size()
                 <<" mapBuckets="<<service.jobs_.bucket_count()<<" stringCapacity="<<chars<<std::endl;
        return service.jobs_.size();
    }
    static std::size_t Confirmed(VaReviewService& service) {
        std::lock_guard lock(service.mutex_);std::size_t count=0;
        for(const auto& item:service.jobs_)if(item.second->confirmed)++count;
        return count;
    }
};
}
namespace {
std::string CompleteA(ingress::VaReviewApplicationService& app,const std::string& package,const std::string& target) {
    auto draft=app.AnalysisDraft(DraftBody(package,target),"session:alice",PermitA);Check(draft.status==201,"MEM83 actual A draft");
    const auto did=Field(draft.body,"id"),action="{\"revision\":"+EvidenceJsonQuote(Field(draft.body,"revision"))+"}";
    Check(app.AnalysisAction(did,"confirm",action,"session:alice",PermitA).status==200,"MEM83 A confirmation");
    const auto accepted=app.AnalysisAction(did,"execute",action,"session:alice",PermitA);Check(accepted.status==202,"MEM83 A execution accepted");
    const auto jid=Field(accepted.body,"id");const auto deadline=VaReviewService::Clock::now()+std::chrono::seconds(5);
    do {const auto job=app.AnalysisJob(jid,"session:alice",false,true,PermitA,false);Check(job.status==200,"MEM83 A job read");
        if(Field(job.body,"state")=="completed"){const auto id=Field(job.body,"reviewId");Check(app.AnalysisGet(id,PermitA).status==200,"MEM83 A stored read");return id;}
        std::this_thread::sleep_for(std::chrono::milliseconds(5));
    }while(VaReviewService::Clock::now()<deadline);
    throw std::runtime_error("A completion deadline");
}
std::uint64_t StoredBytes(const std::filesystem::path& p){std::uint64_t n=0;for(const auto& f:std::filesystem::recursive_directory_iterator(p))if(f.is_regular_file())n+=f.file_size();return n;}
void Sample(const char* phase,unsigned count,const std::filesystem::path& root){
    std::uint64_t rss=0,heap=0;std::string footprint="unavailable";
#ifdef __APPLE__
    malloc_statistics_t stats{};malloc_zone_statistics(nullptr,&stats);heap=stats.size_in_use;
    task_vm_info_data_t info{};mach_msg_type_number_t n=TASK_VM_INFO_COUNT;
    Check(task_info(mach_task_self(),TASK_VM_INFO,reinterpret_cast<task_info_t>(&info),&n)==KERN_SUCCESS,"MEM83 memory collection");rss=info.resident_size;footprint=std::to_string(info.phys_footprint);
#elif defined(__linux__)
    heap=mallinfo2().uordblks;std::ifstream statm("/proc/self/statm");std::uint64_t pages=0,resident=0;
    Check(bool(statm>>pages>>resident),"MEM83 Linux RSS collection");rss=resident*static_cast<std::uint64_t>(sysconf(_SC_PAGESIZE));
#endif
    std::cout<<"[retained-memory] phase="<<phase<<" count="<<count<<" heapLive="<<heap<<" rss="<<rss<<" footprint="<<footprint<<" storedBytes="<<StoredBytes(root)<<std::endl;
}
void CombinedOwnership(const std::filesystem::path& root){
    ConfirmedSeed(root);std::string error;
    const auto id=Field(BoundLoad(root/"confirmed-seed.json"),"packageId");
    RecordingRuntimeStorage runtime(root);Check(runtime.Open(&error),"MEM84-D10 Open actual seeded generation");
    auto owner=runtime.catalog().SearchResidency();auto scratch=RecordingAggregateResourceProbe::Scratch(runtime.catalog());
    {
        RecordingReadService media(runtime.catalog());RecordingSearchReader search(runtime.catalog(),media);
        std::shared_ptr<const RecordingSearchModel> model;Check(search.Refresh({"1"},{},&model,&error),"MEM84-D10 actual model");
        RecordingSearchQuery query;query.channels={"1"};query.start_time_ms=0;query.end_time_ms=86400000;query.include_unplaced=true;query.limit=1;
        RecordingSearchSnapshots snapshots;RecordingSearchPage page;
        Check(snapshots.Begin(model,query,"session:alice","scope-1",&page,&error),"MEM84-D10 actual held page");
        auto rows=runtime.catalog().QueryReferencedObservations("1");Check(!rows.empty()&&rows.front().memory.bytes()>0,"MEM84-D10 actual cold returned rows");
        const auto infer=[](const auto&,const auto&,auto,const auto&,auto*,auto*){throw std::runtime_error("unexpected inference");return false;};
        ingress::VaReviewApplicationService app(root,true,{},0,infer,std::chrono::minutes(5),owner);
        auto response=app.AnalysisPackage(id,PermitA,true);Check(response.status==200&&response.memory.bytes()>0,"MEM84-D10 actual A response owner");
        RecordingAggregateResourceProbe::View view;
        Check(RecordingAggregateResourceProbe::Capture(runtime.catalog(),&view,&error),"MEM84-D10 actual K clone/capture held");
        const auto k=scratch->usage();Check(k.disk_bytes>0&&k.file_descriptors>0,"MEM84-D10 live/K anonymous scratch charged");
        const auto disk_before=StoredBytes(root);std::vector<ingress::ApplicationServiceResult> held;
        while(owner->limit()-owner->used()>=response.memory.bytes())held.push_back(response);
        const auto full=owner->used();const auto refused=app.AnalysisPackage(id,PermitA,true);
        Check(refused.status==503&&StoredBytes(root)==disk_before,"MEM84-D10 actual request refuses without publication at combined boundary");
        Check(app.AnalysisPackages("1",[](const auto&){return false;},true).status==403,"MEM84-D10 known scope refusal precedes aggregate capacity");
        held.clear();Check(owner->used()<full&&app.AnalysisPackage(id,PermitA,true).status==200,"MEM84-D10 releasing real response consumers resumes same request");
        Check(runtime.catalog().Checkpoint(&error),"MEM84-D10 candidate/suffix publication while previous K/page/rows live");
        std::size_t visited=0;Check(view.visit([&](const auto&,std::string*){++visited;return true;},&error)&&visited>0,"MEM84-D10 previous K remains readable after replacement");
        Check(!page.model->documents().empty()&&!rows.front().observation.observation_id.empty(),"MEM84-D10 old model and cold DTO remain readable");
        std::cout<<"[combined-owner] saturated="<<full<<" peak="<<owner->peak()<<" Kdisk="<<k.disk_bytes<<" Kfds="<<k.file_descriptors<<" rows="<<rows.size()<<" snapshotRows="<<visited<<std::endl;
        Check(view.finish(&error),"MEM84-D10 explicit K Finish");view={};app.Stop();
    }
    Check(runtime.Finish(&error),"MEM84-D10 runtime Finish");
    Check(owner->used()==0&&scratch->usage().disk_bytes==0&&scratch->usage().file_descriptors==0,"MEM84-D10 final actual owners return RAM/scratch/FD");
    RecordingRuntimeStorage reopened(root);
    Check(reopened.Open(&error),"MEM84-D10 reOpen original source with fresh runtime owner");
    EvidencePackageStore packages(root/"evidence-packages",{},reopened.catalog().SearchResidency());
    {const auto file=packages.Open(id,&error);Check(bool(file),"MEM84-D10 original package hash/readback preserved");}
    Check(reopened.Finish(&error),"MEM84-D10 final Finish");
}
void RetainedLifetime(const std::filesystem::path& root,bool batches){
    ConfirmedSeed(root);std::string error;
    const auto seed=BoundLoad(root/"confirmed-seed.json"),package=Field(seed,"packageId");
    RecordingRuntimeStorage runtime(root);Check(runtime.Open(&error),"MEM83 reopen source");
    RecordingReadService media(runtime.catalog());RecordingSearchReader reader(runtime.catalog(),media);
    EvidencePackageStore packages(root/"evidence-packages",{},runtime.catalog().SearchResidency());VaReviewStore records(root/"va-reviews",{},runtime.catalog().SearchResidency());
    const auto infer=[](const auto&,const auto&,auto,const auto&,auto*,auto*){throw std::runtime_error("unexpected inference");return false;};
    ingress::VaReviewApplicationService app(root,true,{},0,infer,std::chrono::minutes(5),runtime.catalog().SearchResidency());
    const auto detail=app.AnalysisPackage(package,PermitA,true);Check(detail.status==200,"MEM83 selected real evidence");
    const auto target=Field(detail.body,"targetKey");
    std::shared_ptr<const RecordingSearchModel> warm;Check(reader.Refresh({"1"},{},&warm,&error),"MEM83 search warmup");
    RecordingSearchQuery query;query.channels={"1"};query.start_time_ms=0;query.end_time_ms=86400000;query.include_unplaced=true;query.limit=1;
    const auto hit=std::find_if(warm->documents().begin(),warm->documents().end(),[](const auto& d){return d.kind==SearchDocumentKind::Recording&&!d.segment_id.empty()&&d.start_ns;});
    Check(hit!=warm->documents().end(),"MEM83 source hit");auto selected=*hit;selected.analysis_namespace="synthetic-analysis-tap";selected.track_id="track-77";query.start_time_ms=*selected.start_ns/1000000;query.end_time_ms=(*selected.end_ns+999999)/1000000;warm.reset();
    const auto retained_review=CompleteA(app,package,target);VaReviewRecordV3 original;
    Check(records.Recover(&error)&&records.ReadV3(retained_review,&original,&error),"MEM83 B warm stored A input");
    ConfirmedAnalysisRequest req{original.analysis.binding,original.analysis.claims,original.confirmation};
    VaReviewService::Options opt;opt.enabled=true;VaReviewService worker(packages,records,opt,infer);
    std::mutex mutex;std::condition_variable cv;bool entered=false,released=false;unsigned calls=0;
    struct Unblock {std::mutex& m;std::condition_variable& c;bool& r;~Unblock(){std::lock_guard lock(m);r=true;c.notify_all();}} unblock{mutex,cv,released};
    const auto blocked=[&](const std::string&){std::unique_lock lock(mutex);if(++calls==2){entered=true;cv.notify_all();cv.wait(lock,[&]{return released;});}return true;};
    VaReviewJob running;Check(worker.SubmitConfirmed(req,req.confirmation.principal,blocked,&running,&error),"MEM83 B controlled active request");
    {std::unique_lock lock(mutex);Check(cv.wait_for(lock,std::chrono::seconds(2),[&]{return entered;}),"MEM83 B worker held before publication");}
    const auto fixed=StoredBytes(root);Sample("B-start",0,root);
    std::string first_cancelled;
    const unsigned repetitions=batches?256:32;
    for(unsigned i=0;i<repetitions;++i){
        {std::shared_ptr<const RecordingSearchModel> model;Check(reader.Refresh({"1"},{},&model,&error),"MEM83 B real search");
         RecordingSearchSnapshots snapshots;RecordingSearchPage page;Check(snapshots.Begin(model,query,"session:alice","scope-1",&page,&error),"MEM83 B snapshot");Check(!page.positions.empty(),"MEM83 B nonempty search");
         if(!page.next_cursor.empty()){RecordingSearchPage next;Check(snapshots.Resume(page.next_cursor,query,"session:alice","scope-1",&next,&error),"MEM83 B cursor");}
         auto file=packages.Open(package,&error);Check(bool(file),"MEM83 B package read");
         const auto draft=app.AnalysisDraft(DraftBody(package,target),"session:alice",PermitA);Check(draft.status==201,"MEM83 B unsubmitted draft");
         const auto materials=app.AnalysisPackage(package,PermitA,true);Check(materials.status==200,"MEM83 B materials read");
         Check(app.AnalysisGet(retained_review,PermitA).status==200,"MEM83 B existing A read");
         std::shared_ptr<const RecordingSearchModel> expired_model;std::size_t position=0;
         Check(!snapshots.ResolveHit(page.snapshot_id,page.model->documents().at(page.positions.front()).id,query,"session:alice","scope-1",&expired_model,&position,&error,RecordingSearchSnapshots::Clock::now()+std::chrono::minutes(6))&&error=="search-snapshot-expired","MEM83 B actual pool expiry with caller still owning immutable page");
         Check(!page.model->documents().empty(),"MEM83 B expired caller remains readable");
         auto queued=req;queued.confirmation.principal="session:queued-"+std::to_string(i);VaReviewJob job;
         Check(worker.SubmitConfirmed(queued,queued.confirmation.principal,PermitA,&job,&error)&&job.state=="queued","MEM83 B queued confirmed request");
         if(first_cancelled.empty())first_cancelled=job.id;
         Check(worker.Cancel(job.id,queued.confirmation.principal,false,PermitA,&error),"MEM83 B cancel before worker selection");
         Check(worker.Get(job.id,PermitA,&job,&error)&&job.state=="cancelled"&&job.review_id.empty(),"MEM83 B retained cancellation summary without publication");}
        Check(StoredBytes(root)==fixed,"MEM83 B fixed persistent bytes");
        if((batches&&(i+1)%64==0)||(!batches&&(i==7||i==15||i==31))){
            const auto count=VaReviewServiceResidencyProbe::Metadata(worker);
            Check(count==std::min<std::size_t>(i+2,opt.remembered_jobs),"MEM84 B metadata obeys original remembered_jobs");
            if(batches){VaReviewJob removed;Check(!worker.Get(first_cancelled,PermitA,&removed,&error),"MEM84 B oldest terminal evicted without clearing active job");
                std::this_thread::sleep_for(std::chrono::seconds(1));}
            std::cout<<"[search-reservation] phase=B-release count="<<i+1<<" used="<<runtime.catalog().SearchResidency()->used()<<" peak="<<runtime.catalog().SearchResidency()->peak()<<std::endl;
            Sample("B-release",i+1,root);
        }
    }
    for(unsigned i=0;i<3;++i){std::this_thread::sleep_for(std::chrono::seconds(1));Sample("B-idle",i+1,root);}
    const auto held=VaReviewServiceResidencyProbe::Confirmed(worker);
    std::cout<<"[B-confirmed-owners] active=1 observed="<<held<<std::endl;
    const bool cancel_ok=worker.Cancel(running.id,req.confirmation.principal,false,PermitA,&error);
    {std::lock_guard lock(mutex);released=true;cv.notify_all();}
    Check(cancel_ok&&Done(worker,running.id).state=="cancelled","MEM83 B running task stopped before publication");worker.Stop();
    const bool released_inputs=held==1&&VaReviewServiceResidencyProbe::Confirmed(worker)==0;
    std::cout<<"[B-owner-verdict] released="<<released_inputs<<" (checked again after independent C measurements)"<<std::endl;
    Check(StoredBytes(root)==fixed,"MEM83 B no record publication across cancellations");
    EvidencePackageBuilder builder(runtime.catalog(),media,packages);Sample("C-start",0,root);
    const unsigned retained=batches?16:8;
    try { for(unsigned i=0;i<retained;++i){
        {EvidencePackageV1 p;std::string id;const bool created=builder.CreateWithObservations(selected,"structured","",&id,&p,&error,VaReviewService::Clock::now()+std::chrono::seconds(20));
         Check(created,"MEM83 C new package: "+error);Check(p.frames.size()==8,"MEM83 C eight selected frames");const auto choice=app.AnalysisPackage(id,PermitA,true);Check(choice.status==200,"MEM83 C selected package");
         auto draft=app.AnalysisDraft(DraftBody(id,Field(choice.body,"targetKey")),"session:alice",PermitA);Check(draft.status==201,"MEM83 C draft status="+std::to_string(draft.status)+" body="+draft.body);
         const auto did=Field(draft.body,"id"),action="{\"revision\":"+EvidenceJsonQuote(Field(draft.body,"revision"))+"}";
         Check(app.AnalysisAction(did,"confirm",action,"session:alice",PermitA).status==200,"MEM83 C confirm");
         auto submitted=app.AnalysisAction(did,"execute",action,"session:alice",PermitA);Check(submitted.status==202,"MEM83 C submitted");
         const auto jid=Field(submitted.body,"id");const auto deadline=VaReviewService::Clock::now()+std::chrono::seconds(5);
         std::string state,rid;do{auto job=app.AnalysisJob(jid,"session:alice",false,true,PermitA,false);Check(job.status==200,"MEM83 C job read");state=Field(job.body,"state");
             if(state=="completed"){rid=Field(job.body,"reviewId");break;}std::this_thread::sleep_for(std::chrono::milliseconds(5));}while(VaReviewService::Clock::now()<deadline);
         Check(state=="completed"&&app.AnalysisGet(rid,PermitA).status==200,"MEM83 C actual worker stored/read record");}
        if(i==0||i==3||i==7||i==15)Sample("C-release",i+1,root);
    }
    } catch (...) {
        const auto first=std::current_exception();app.Stop();
        const bool finished=runtime.Finish(&error);
        std::cerr<<"[failure-cleanup] app-stopped=true runtime-finish="<<finished<<" detail="<<error<<std::endl;
        std::rethrow_exception(first);
    }
    app.Stop();Check(runtime.Finish(&error),"MEM83 normal Finish");for(unsigned i=0;i<3;++i){std::this_thread::sleep_for(std::chrono::seconds(1));Sample("C-idle",i+1,root);}
    Check(released_inputs,"MEM83 B cancelled task input released; only active input was retained");
}
}
int main(int argc,char** argv){try{if(argc!=2&&!(argc==3&&(std::string(argv[2])=="--bounded-batches"||std::string(argv[2])=="--combined-d")))return 2;gst_init(nullptr,nullptr);if(argc==3&&std::string(argv[2])=="--combined-d")CombinedOwnership(argv[1]);else RetainedLifetime(argv[1],argc==3);std::cout<<"[scope] B fixed retained bytes, C actual evidence/A; no model calls; samples not instant peaks"<<std::endl;return 0;}catch(const std::exception& e){std::cerr<<"[failure] "<<e.what()<<std::endl;return 1;}}

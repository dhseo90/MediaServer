// 파일 용도: 녹화 세대 요청 proof의 입력·권위 분리 계약을 smoke로 검증한다.
// 기존 B typed fixture만 재사용하며 미디어 실행이나 기존 main은 호출하지 않는다.
#define RECORDING_SCRATCH_MAIN RequestProofScratchFixtureMain
#include "recording_catalog_generation_scratch_smoke.cpp"
#undef RECORDING_SCRATCH_MAIN
#include <fcntl.h>
#include <sys/stat.h>
#include <sys/wait.h>
#include <future>
#include "recording/recording_read_service.h"
#include "../../src/recording/recording_catalog_history.h"
namespace recording {
struct RecordingGenerationRequestProofProbe {
    static void RetentionHook(std::function<void()> hook){RecordingCatalog::retention_prepared_hook_=std::move(hook);}
    static RetentionSnapshot LockedRetention(RecordingCatalog& c){std::lock_guard lock(c.mu_);return c.RetentionSnapshotLocked();}
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
    static void DamageRetention(RecordingCatalog& c){std::lock_guard lock(c.mu_);Need(::ftruncate(c.completed_history_->ProbeIndexFd(),0)==0);}
    static void DamageRetentionValue(RecordingCatalog& c){
        std::lock_guard lock(c.mu_);const int fd=c.completed_history_->ProbeIndexFd();struct stat st{};Need(fstat(fd,&st)==0);
        // Locate a reachable media-path chunk through its actual serialized node,
        // then alter its value only. No root/size/FD replacement is involved.
        std::array<unsigned char,512> node{};bool changed=false;
        const auto number=[](const unsigned char* p){std::uint64_t n=0;for(unsigned i=0;i<8;++i)n|=std::uint64_t(p[i])<<(8*i);return n;};
        for(off_t offset=512;offset+512<=st.st_size;++offset){
            if(pread(fd,node.data(),node.size(),offset)!=ssize_t(node.size()))break;
            const auto length=number(node.data()+40);if(length<12||length>256)continue;
            const std::string key(reinterpret_cast<char*>(node.data()+144),length);
            if(key.rfind("media-path/",0)!=0||key.find("/v")==std::string::npos)continue;
            auto value=number(node.data()+16);if(!value)value=offset+144+256;
            unsigned char byte{};Need(pread(fd,&byte,1,value)==1);byte^=1;Need(pwrite(fd,&byte,1,value)==1);changed=true;break;
        }
        Need(changed);
    }
#endif
    static bool DeltaBoundary(){RecordingCatalog::RetentionReadState read;
        for(unsigned i=0;i<1024;++i)read.Note("segment-"+std::to_string(i));
        const bool exact=read.complete&&read.count==1024;read.Note("segment-0");const bool repeated=read.complete&&read.count==1024;
        read.Note("overflow");return exact&&repeated&&!read.complete;}
    static void ColdAfterIo(void (*hook)()){RecordingJournal::generation_cold_after_io_=hook;}
    static void Path(RecordingCatalog& c,const std::string& id,const std::optional<std::string>& path){
        std::lock_guard lock(c.mu_);if(path)c.media_relpaths_.Set(id,*path);else c.media_relpaths_.erase(id);
    }
    using Context=RecordingCatalog::JobReadContext;
    using SourceContext=RecordingCatalog::SourceBindingReadContext;
    static std::vector<std::string> SourceKeys(RecordingCatalog& c){
        std::vector<RecordingCatalog::VisualSourceKey> keys;std::map<std::string,std::size_t> legacy;
        if(!c.CaptureVisualSourceKeys({"channel"},&keys,&legacy,&error))return {};
        std::vector<std::string> result;for(const auto& key:keys)result.push_back(key.id);
        std::sort(result.begin(),result.end());return result;
    }
    static void AcquireHook(std::function<void()> hook){RecordingCatalog::source_binding_acquire_hook_=std::move(hook);}
    static std::string SourceCached(RecordingCatalog& c,SourceContext* context,bool* same_cut){
        latency::Lock lock(c.mu_,latency::Source::Catalog,__LINE__,false,__func__);
        const auto value=c.ReadSourceBindingLocked("segment",context,&error,nullptr,same_cut);
        return value?SerializeRecordingSourceBindingV1(*value):std::string{};
    }
    static void SourceHook(std::function<void()> hook){RecordingCatalog::source_binding_unlocked_hook_=std::move(hook);}
    static std::string Source(RecordingCatalog& c){RecordingCatalog::SourceBindingReadContext context;auto value=c.ReadSourceBinding("segment",&context,&error);return value?SerializeRecordingSourceBindingV1(*value):std::string{};}

    static bool Job(RecordingCatalog& c,const std::string& id,Context* context){
        std::lock_guard lock(c.mu_);RecordingCatalog::DerivedJobHandle job;
        try {return c.AcquireJobForReadLocked(id,&job,context,&error)&&job&&job->state==DerivedJobState::Complete;}
        catch(const std::exception&) {
            // This private probe bypasses the public MediaV2EligibleLocked exception boundary.
            // A cold authority failure is rejection only when both authority and lease are lost.
            if(c.derived_job_state_authoritative_||c.journal_.HasManagedLease())throw;
            return false;
        }
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
#if MEDIA_SERVER_USE_OPENSSL && MEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND

std::string RetentionOracle(const RetentionSnapshot& snapshot){
    std::string result;
    for(const auto& candidate:snapshot.candidates)result+=(candidate.segment_v2?SerializeRecordingSegmentV2(*candidate.segment_v2):SerializeRecordingSegmentV1(candidate.segment))+"|"+
        candidate.media_path.generic_string()+"|"+std::to_string(candidate.hold_count)+"|"+std::to_string(unsigned(candidate.Lifecycle()))+"|"+candidate.deletion_reason+"\n";
    for(const auto& r:snapshot.durable_reservations)result+=r.job_id+"|"+r.channel_id+"|"+std::to_string(r.bytes)+"\n";
    return result;
}
void RetentionPreparedCases(const std::filesystem::path& root){
    Check("R108-P01",ProofProbe::DeltaBoundary(),"bounded changed-ID set deduplicates and rejects overflow; unit boundary only");
    for(const std::string mode:{"progress","hold","job","legacy-reason","delete","corrupt","new-finalized","new-pinned","other-channel","checkpoint","finish","scratch","scratch-value","resource","exception"}){
        const auto path=root/mode;std::filesystem::create_directories(path);CompleteFixture(path);
        RecordingJournal owner(Options(path));Need(owner.Open(&error));auto options=ReadOptions(path);options.enable_generation_writes=true;
        RecordingCatalog catalog(owner,options);Need(catalog.Open(&error));
        if(mode=="legacy-reason"){std::filesystem::create_directories(path/"channel");Write(path/"channel/legacy.mp4",std::string(12,'x'));
            Need(catalog.FinalizeSegment(ProjectionV1(),(path/"channel/legacy.mp4").string(),&error));}
        const auto original=ProofProbe::LockedRetention(catalog);Need(original.authoritative);
        const auto owned=catalog.SearchResidency()->used();const auto descriptors=OpenDescriptors();
        std::promise<void> entered,resume;auto ready=entered.get_future();auto released=resume.get_future().share();
        RetentionSnapshot result;std::exception_ptr failure;
        std::thread reader([&]{try{ProofProbe::RetentionHook([&]{ProofProbe::RetentionHook({});entered.set_value();released.wait();
                if(mode=="resource")throw RecordingResourceUnavailable();
                if(mode=="exception")throw std::runtime_error("injected consumer exception");});
            result=catalog.RetentionSnapshot();
        }catch(...){failure=std::current_exception();}ProofProbe::RetentionHook({});});
        struct Guard {std::promise<void>& resume;std::thread& reader;bool sent=false;void Release(){if(!sent){resume.set_value();sent=true;}}
            ~Guard(){Release();if(reader.joinable())reader.join();}} guard{resume,reader};
        Need(ready.wait_for(std::chrono::seconds(3))==std::future_status::ready);
        Check("R108-P01",catalog.SearchResidency()->used()>owned&&OpenDescriptors()>descriptors,"private scratch reader owns additional charged memory and FD");
        auto writer=std::async(std::launch::async,[&]{std::string detail;RecordingReadService search(catalog);RecordingTimelineResult timeline;RecordingOrderReservationV1 order;
            return search.QuerySearchTimeline("channel",0,5000,&timeline,&detail)&&
                catalog.ReserveRecordingOrder("store","retention-progress","retention-progress-segment","other",&order,&detail);});
        const bool moved=writer.wait_for(std::chrono::seconds(3))==std::future_status::ready;
        if(!moved)guard.Release();
        const bool progressed=writer.get();
        Check("R108-P01",moved&&progressed,"long retention prepare permits real timeline and durable unrelated writer progress");
        if(!moved||!progressed)throw std::runtime_error("retention capture blocked progress");
        if(mode=="hold")Need(catalog.AdjustHoldCount("segment",1,&error));
        if(mode=="legacy-reason")Need(catalog.RequestDeletion("legacy",std::string(65536,'r'),&error));
        if(mode=="job"){
            auto input=InputValue();DerivedRecordingSelection selection;DerivedJobIntentV1 intent;
            Need(RestoreDerivedJobSelection(input.job.intent,&selection,&error));selection.reference.reference_id="new-reference";
            Need(BuildDerivedJobIntent(selection,{input.source},8192,40,&intent,&error));
            RetentionCoordinator retention(catalog,[&]{return catalog.RetentionSnapshot();},
                [](auto* bytes,auto*){*bytes=1024ULL*1024*1024;return true;},[](const auto&,auto*){return false;},{0,1,path});
            Need(retention.UpdateChannelPolicy("channel",{1024ULL*1024*1024,0,1024ULL*1024*1024,0},&error));
            const auto admission=retention.AdmitDerivedJob(catalog,intent,40);if(!admission.accepted)error=admission.message;Need(admission.accepted);
        }
        if(mode=="delete")Need(catalog.RequestDeletion("segment","continuous-capacity",&error));
        if(mode=="corrupt")Need(catalog.MarkSegmentCorrupt("segment","checksum-mismatch",&error));
        if(mode=="new-finalized"||mode=="new-pinned"||mode=="other-channel"){
            auto segment=CompleteInput().source.segment;segment.segment_id="new-finalized";segment.order_request_id="new-order";
            if(mode=="other-channel")segment.channel_id="other";
            segment.pinned=mode=="new-pinned";
            RecordingOrderReservationV1 order;Need(catalog.ReserveRecordingOrder("store",segment.order_request_id,segment.segment_id,segment.channel_id,&order,&error));
            segment.order_sequence=order.sequence;const std::string media="new-fixture!";segment.size_bytes=media.size();segment.checksum_sha256=Hash(media);
            Write(path/"new.mp4",media);Need(catalog.FinalizeSegmentV2(segment,(path/"new.mp4").string(),&error));
        }
        if(mode=="checkpoint")Need(catalog.Checkpoint(&error));
        if(mode=="finish")Need(owner.Finish(&error));
        if(mode=="scratch")ProofProbe::DamageRetention(catalog);
        if(mode=="scratch-value")ProofProbe::DamageRetentionValue(catalog);
        const bool denied=mode=="finish"||mode=="scratch"||mode=="scratch-value"||mode=="resource"||mode=="exception";
        RetentionSnapshot expected;if(!denied)expected=ProofProbe::LockedRetention(catalog);
        const auto expected_descriptors=OpenDescriptors()-1; // exactly one private anonymous clone, before release
        guard.Release();reader.join();if(failure)std::rethrow_exception(failure);
        Check("R108-P01",denied?!result.authoritative:result.authoritative&&RetentionOracle(result)==RetentionOracle(expected),
            (mode+": fixed scan rebases to current result or fails without stale publication").c_str());
        if(mode=="legacy-reason"){
            const auto legacy=std::find_if(result.candidates.begin(),result.candidates.end(),[](const auto& c){return c.Id()=="legacy";});
            Check("R108-P01",legacy!=result.candidates.end()&&legacy->deletion_reason==std::string(65536,'r')&&legacy->auxiliary_memory.bytes()>=4*65536,
                "large legacy deletion reason survives with charged returned ownership");
        }
        if(mode=="job")Check("R108-P01",result.durable_reservations.size()==1&&result.durable_reservations.front().bytes==8192&&
            std::any_of(result.candidates.begin(),result.candidates.end(),[](const auto& c){return c.Id()=="segment"&&c.hold_count>0;}),
            "new durable job reservation and source protection are combined at current cut");
        result={};expected={};
        Check("R108-P01",OpenDescriptors()==expected_descriptors,"explicit private scratch Finish returns its one FD; original Finish accounted separately");
        if(mode=="resource"||mode=="exception")Check("R108-P01",owner.HasManagedLease()&&catalog.RetentionSnapshot().authoritative,"transient reader failure does not poison original authority");
        if(mode=="hold")Need(catalog.AdjustHoldCount("segment",-1,&error));
        if(mode!="finish")Need(owner.Finish(&error));
    }
}
void RetentionPathCases(const std::filesystem::path& root){
    std::filesystem::create_directories(root);CompleteFixture(root);
    RecordingJournal journal(Options(root));Need(journal.Open(&error));
    RecordingCatalog catalog(journal,ReadOptions(root));Need(catalog.Open(&error));
    const auto input=CompleteInput();
    auto all=catalog.RetentionSnapshot();Need(all.authoritative);
    Check("R103-P02",all.candidates.size()==input.job.ready->outputs.size()+1,"full ordered join preserves source and completed output candidates");
    for(const auto& candidate:all.candidates){
        const auto exact=catalog.RetentionSnapshot(RetentionSnapshotSelection::Candidate,candidate.Id());
        Check("R103-P02",exact.authoritative&&exact.candidates.size()==1&&
            exact.candidates.front().media_path==candidate.media_path&&
            exact.candidates.front().hold_count==candidate.hold_count&&
            SerializeRecordingSegmentV2(*exact.candidates.front().segment_v2)==SerializeRecordingSegmentV2(*candidate.segment_v2),
            "streamed path matches unchanged exact current candidate lookup");
    }
    Check("R103-P02",catalog.RetentionSnapshot(RetentionSnapshotSelection::Channel,"absent").candidates.empty(),"other channel never enters result");
    Need(catalog.AdjustHoldCount("segment",1,&error));
    const auto held=catalog.RetentionSnapshot(RetentionSnapshotSelection::Channel,"channel");
    bool protected_source=false;for(const auto& c:held.candidates)if(c.Id()=="segment")protected_source=c.hold_count>0;
    Check("R103-P02",held.authoritative&&protected_source,"same-cut hold remains protected through join");
    Need(catalog.AdjustHoldCount("segment",-1,&error));
    ProofProbe::Path(catalog,"segment",std::nullopt); // damaged/missing derived projection, not fixture population
    const auto missing=catalog.RetentionSnapshot();
    Check("R103-P02",missing.authoritative&&missing.candidates.size()+1==all.candidates.size()&&
        catalog.RetentionSnapshot(RetentionSnapshotSelection::Candidate,"segment").candidates.empty(),"missing path has same omission as exact lookup");
    ProofProbe::Path(catalog,"segment",std::string("channel/source.mp4"));
    const auto restored=catalog.RetentionSnapshot();
    Check("R103-P02",restored.authoritative&&restored.candidates.size()==all.candidates.size(),"cold reacquisition after path removal uses current bytes");
    Need(journal.Finish(&error));
}
void RetentionPrefixCases(const std::filesystem::path& root){
    std::filesystem::create_directories(root);ProjectionFixture f;std::int64_t ordinal=0;
    for(const std::string id:{"a","a-","a.","a:","a_"}){
        auto input=CompleteInput();auto s=input.source.segment;auto b=*input.source.binding;
        s.segment_id=id;s.channel_id=id=="a"?"channel":"other";s.order_request_id="order-"+id;s.order_sequence=++ordinal;
        b.segment_id=id;b.channel_id=s.channel_id;
        RecordingOrderReservationV1 order;order.store_id="store";order.request_id=s.order_request_id;order.segment_id=id;order.channel_id=s.channel_id;order.sequence=ordinal;
        f.Add(RecordingMutationType::RecordingOrderReserved,order.request_id,id,"{\"schema\":\"media-server.recording-order.v1\",\"storeId\":\"store\",\"requestId\":\""+order.request_id+"\",\"segmentId\":\""+id+"\",\"channelId\":\""+s.channel_id+"\",\"sequence\":"+std::to_string(ordinal)+"}",order);
        const auto mutation="bound-"+id;const auto path=s.channel_id+"/"+id+".mp4";
        f.Add(RecordingMutationType::SegmentV2BoundFinalized,mutation,id,"{\"segment\":"+SerializeRecordingSegmentV2(s)+",\"mediaRelpath\":\""+path+"\",\"sourceBinding\":"+SerializeRecordingSourceBindingV1(b)+"}");
        f.Row("segment-v2",id,SerializeRecordingSegmentV2(s));f.Row("media-path",id,"\""+path+"\"");
        std::string summary;Need(SerializeRecordingCatalogSourceSummary({id,s.channel_id,"source","gen","video/0",1,2,mutation},&summary,&error));f.Row("source-binding",id,summary);
    }
    Install(f,root);RecordingJournal journal(Options(root));Need(journal.Open(&error));RecordingCatalog catalog(journal,ReadOptions(root));Need(catalog.Open(&error));
    const auto exact=catalog.RetentionSnapshot(RetentionSnapshotSelection::Candidate,"a");Need(exact.authoritative&&exact.candidates.size()==1);
    const auto selected=catalog.RetentionSnapshot(RetentionSnapshotSelection::Channel,"channel");
    Check("R103-P03",selected.authoritative&&selected.candidates.size()==1&&selected.candidates.front().Id()=="a"&&selected.candidates.front().media_path==exact.candidates.front().media_path,
        "generation key ordering preserves prefix a across other-channel a-/a./a:/a_");
    ProofProbe::Path(catalog,"a-",std::nullopt);const auto all=catalog.RetentionSnapshot();
    Check("R103-P03",all.authoritative&&all.candidates.size()==4,"missing prefix path never skips unrelated candidate in authenticated order");
    Need(journal.Finish(&error));
}
void RetentionSharedDecodeCase(){
    using Rows=RecordingRetainedRows<RecordingSegmentV2,ParseRecordingSegmentV2,SerializeRecordingSegmentV2>;
    auto live=std::make_shared<RecordingCatalogHistoryRows>();Need(live->Create(&error));Rows rows;rows.Bind(live,"segment-v2");
    auto segment=CompleteInput().source.segment;rows.Set(segment.segment_id,segment);live->EnableVerifiedSegmentDecodeCache();
    const auto cached=rows.find(segment.segment_id);const auto charged=live->ProbeDecodedBytes();
    auto copy=std::make_shared<RecordingCatalogHistoryRows>();Need(copy->CloneFrom(*live,&error));Rows frozen;frozen.Bind(copy,"segment-v2",live);
    const auto reused=frozen.find(segment.segment_id);
    Check("R108-P01",&*cached==&*reused&&copy->ProbeDecodedBytes()==0&&live->ProbeDecodedBytes()==charged,
        "private cut reuses exact authenticated parsed row without another cache/budget");
    auto changed=segment;changed.pinned=true;rows.Set(segment.segment_id,changed);const auto current=rows.find(segment.segment_id);
    Check("R108-P01",current->second.pinned&&!frozen.find(segment.segment_id)->second.pinned,
        "same ID different current raw never changes immutable cut semantics");
    Need(live->Finish(&error));
    Check("R108-P01",!frozen.find(segment.segment_id)->second.pinned&&live->ProbeDecodedBytes()==0,
        "closed cache is not repopulated; private raw remains owned until explicit Finish");
    Need(::ftruncate(copy->ProbeIndexFd(),0)==0);bool refused=false;
    try{(void)frozen.find(segment.segment_id);}catch(const RecordingRetainedReadError&){refused=true;}
    Check("R108-P01",refused,"a borrowed parsed row never bypasses private raw integrity");Need(copy->Finish(&error));
}
void VerifiedDecodeCases(){
    using Rows=RecordingRetainedRows<RecordingSegmentV2,ParseRecordingSegmentV2,SerializeRecordingSegmentV2>;
    auto store=std::make_shared<RecordingCatalogHistoryRows>();Need(store->Create(&error));
    Rows rows;rows.Bind(store,"segment-v2");auto segment=CompleteInput().source.segment;
    rows.Set(segment.segment_id,segment);const auto canonical=SerializeRecordingSegmentV2(segment);
    const auto cold=rows.find(segment.segment_id);store->EnableVerifiedSegmentDecodeCache();
    auto first=rows.find(segment.segment_id),hit=rows.find(segment.segment_id);
    Check("V450-MEM101-S05",&*first==&*hit&&SerializeRecordingSegmentV2(hit->second)==canonical,
          "new authenticated exact bytes reuse only parsed immutable segment");
    const auto one=store->ProbeDecodedBytes();Need(one>0&&one<=16*1024*1024);
    store->ProbeDecodedLimit(one); // fixed one-row test budget, not a production admission
    first=rows.find(segment.segment_id);const auto held=&*first;
    for(unsigned i=0;i<3;++i){auto next=segment;next.segment_id="cache-"+std::to_string(i);rows.Set(next.segment_id,next);(void)rows.find(next.segment_id);}
    const auto again=rows.find(segment.segment_id);
    Check("V450-MEM101-S05",store->ProbeDecodedBytes()<=one&&held!=&*again&&SerializeRecordingSegmentV2(first->second)==canonical,
          "eviction keeps outstanding charged reader and exact cold reacquisition");
    auto changed=segment;changed.pinned=!changed.pinned;Need(store->Put("segment-v2",segment.segment_id,SerializeRecordingSegmentV2(changed),&error));
    Check("V450-MEM101-S05",rows.find(segment.segment_id)->second.pinned==changed.pinned,
          "same ID changed authenticated bytes never returns old parsed row");
    rows.erase(segment.segment_id);
    Check("V450-MEM101-S05",rows.find(segment.segment_id)==rows.end(),"cache never supplies absent membership");
    rows.Set(segment.segment_id,segment);(void)rows.find(segment.segment_id);
    const auto used=store->MemoryOwner()->used();Need(store->Finish(&error));
    Check("V450-MEM101-S05",store->ProbeDecodedBytes()==0&&store->MemoryOwner()->used()<used&&SerializeRecordingSegmentV2(first->second)==canonical,
          "Finish releases cache while existing reader owns its charge");
    bool denied=false;try{(void)rows.find(segment.segment_id);}catch(const RecordingRetainedReadError&){denied=true;}
    Check("V450-MEM101-S05",denied,"finished store rejects even a formerly cached ID");
    auto bad=std::make_shared<RecordingCatalogHistoryRows>();Need(bad->Create(&error));Rows damaged;damaged.Bind(bad,"segment-v2");
    damaged.Set(segment.segment_id,segment);bad->EnableVerifiedSegmentDecodeCache();(void)damaged.find(segment.segment_id);
    const int fd=bad->ProbeIndexFd();struct stat st{};Need(::fstat(fd,&st)==0&&st.st_size>512&&st.st_size<65536);
    std::string bytes(static_cast<std::size_t>(st.st_size),'\0');Need(::pread(fd,bytes.data(),bytes.size(),0)==static_cast<ssize_t>(bytes.size()));
    const auto at=bytes.find("segment-v2/");Need(at!=std::string::npos);const char altered='X';Need(::pwrite(fd,&altered,1,static_cast<off_t>(at))==1);
    denied=false;try{(void)damaged.find(segment.segment_id);}catch(const RecordingRetainedReadError&){denied=true;}
    Check("V450-MEM101-S05",denied,"same-size scratch node damage is checked before parsed cache hit");Need(bad->Finish(&error));
    // Other outstanding readers above intentionally remain alive. Give this
    // zero-after-last-reader assertion its own real resource owner.
    auto closing_memory=std::make_shared<SearchModelResidency>();
    auto closing_resources=RecordingScratchResidency::Discover(std::filesystem::canonical(std::filesystem::temp_directory_path()).string(),closing_memory);
    RecordingScratchResidency::Scope closing_scope(closing_resources);
    auto closing=std::make_shared<RecordingCatalogHistoryRows>();Need(closing->Create(&error));Rows concurrent;concurrent.Bind(closing,"segment-v2");
    concurrent.Set(segment.segment_id,segment);closing->EnableVerifiedSegmentDecodeCache();
    RecordingRetainedRowStore::probe_before_remember=[&]{RecordingRetainedRowStore::probe_before_remember={};Need(closing->Finish(&error));closing->EnableVerifiedSegmentDecodeCache();};
    {const auto held_after_finish=concurrent.find(segment.segment_id);
        Check("V450-MEM101-S05",closing->ProbeDecodedBytes()==0&&SerializeRecordingSegmentV2(held_after_finish->second)==canonical,
              "Finish after raw acquire prevents later memoization while reader remains valid");}
    Check("V450-MEM101-S05",closing->MemoryOwner()->used()==0,"last delayed reader releases charge without resurrecting closed cache");
}
void SourceReadCases(const std::filesystem::path& root){
    for(const std::string mode:{"normal","append","checkpoint","delete","tamper","memory"}){
        const auto path=root/mode;std::filesystem::create_directories(path);CompleteFixture(path);
        RecordingJournal owner(Options(path));Need(owner.Open(&error));auto options=ReadOptions(path);options.enable_generation_writes=true;
        RecordingCatalog catalog(owner,options);Need(catalog.Open(&error));
        const auto expected=SerializeRecordingSourceBindingV1(*CompleteInput().source.binding);
        const auto complete=CompleteInput();
        auto expected_ids=std::vector<std::string>{complete.source.segment.segment_id};
        for(const auto& output:complete.job.ready->outputs)expected_ids.push_back(output.segment.segment_id);
        std::sort(expected_ids.begin(),expected_ids.end());
        Check("V450-MEM101-S04",catalog.FinalizedSegmentIdsForStartup()==expected_ids,"same-cut source/output startup list equals independent fixture IDs");
        Check("R106-P01",ProofProbe::SourceKeys(catalog)==expected_ids,"metadata scan preserves all independent finalized source/output IDs");
        unsigned calls=0;const auto used=catalog.SearchResidency()->used();
        const auto peak=catalog.SearchResidency()->peak();(void)peak;
        ProofProbe::SourceHook([&]{
            ProofProbe::SourceHook({});++calls;
            Need(catalog.SearchResidency()->used()>used);
            if(mode=="memory")throw RecordingResourceUnavailable();
            // Called only after releasing Catalog mu_, with an owned envelope.
            if(mode=="append") {RecordingOrderReservationV1 order;Need(catalog.ReserveRecordingOrder("store","during-parse","during-parse-segment","channel",&order,&error));}
            if(mode=="checkpoint")Need(catalog.Checkpoint(&error));
            if(mode=="delete")Need(catalog.RequestDeletion("segment","continuous-capacity",&error));
            if(mode=="tamper"||mode=="after-io-tamper"){auto bytes=Read(path/"evidence-1-0.jsonl");Need(!bytes.empty());bytes[0]='!';Write(path/"evidence-1-0.jsonl",bytes);}
        });
        const auto actual=ProofProbe::Source(catalog);ProofProbe::SourceHook({});
        Check("V450-MEM101-S02",calls==1,"cold source parse releases the owning lock exactly once");
        if(mode=="delete"||mode=="tamper"||mode=="memory")Check("V450-MEM101-S02",actual.empty(),(mode+" between capture and final check rejects without publishing binding").c_str());
        else Check("V450-MEM101-S02",actual==expected,(mode+" between capture and final check keeps independently serialized original binding").c_str());
        if(mode=="memory")Check("V450-MEM101-S02",owner.HasManagedLease()&&ProofProbe::Source(catalog)==expected,"transient resource failure preserves authority and next request");
        if(mode=="delete")Check("V450-MEM101-S02",owner.HasManagedLease(),"ordinary concurrent deletion does not poison authority");
        if(mode=="delete")expected_ids.erase(std::remove(expected_ids.begin(),expected_ids.end(),"segment"),expected_ids.end());
        if(mode!="tamper"){
            Check("V450-MEM101-S04",catalog.FinalizedSegmentIdsForStartup()==expected_ids,"append/checkpoint/pending deletion preserve exact startup membership");
            Check("R106-P01",ProofProbe::SourceKeys(catalog)==expected_ids,"metadata keys preserve append/checkpoint/pending deletion membership");
        }
        if(mode=="tamper")Check("V450-MEM101-S02",!owner.HasManagedLease(),"actual original damage loses authority");
    }
}
void SharedSourceReadCases(const std::filesystem::path& root){
    for(const std::string mode:{"progress","delete","resource"}){
        const auto path=root/mode;std::filesystem::create_directories(path);CompleteFixture(path);
        RecordingJournal owner(Options(path));Need(owner.Open(&error));auto options=ReadOptions(path);options.enable_generation_writes=true;
        RecordingCatalog catalog(owner,options);Need(catalog.Open(&error));
        const auto expected=SerializeRecordingSourceBindingV1(*CompleteInput().source.binding);
        std::promise<void> entered,resume;auto ready=entered.get_future();const auto released=resume.get_future().share();
        std::string result;std::exception_ptr failure;
        std::thread reader([&]{try{ProofProbe::AcquireHook([&]{ProofProbe::AcquireHook({});entered.set_value();released.wait();if(mode=="resource")throw RecordingResourceUnavailable();});
            result=ProofProbe::Source(catalog);
        }catch(...){failure=std::current_exception();}ProofProbe::AcquireHook({});});
        struct ResumeJoin {std::promise<void>& signal;std::thread& thread;bool sent=false;void Release(){if(!sent){signal.set_value();sent=true;}}~ResumeJoin(){Release();if(thread.joinable())thread.join();}} guard{resume,reader};
        Need(ready.wait_for(std::chrono::seconds(3))==std::future_status::ready);
        // The blocked work is source acquisition itself, not a paused product
        // worker used to manufacture an end-to-end performance result.
        auto progress=std::async(std::launch::async,[&]{std::string detail;
            const auto original=catalog.FindSegmentV2ById("segment");RecordingOrderReservationV1 order;
            RecordingReadService search(catalog);RecordingTimelineResult timeline;
            return original&&search.QuerySearchTimeline("channel",0,5000,&timeline,&detail)&&catalog.ReserveRecordingOrder("store","concurrent-order","concurrent-segment","other",&order,&detail);
        });
        const bool moved=progress.wait_for(std::chrono::seconds(3))==std::future_status::ready;
        if(!moved){guard.Release();reader.join();}
        const bool progressed=progress.get();
        Check("R106-P01",moved,"source cold acquisition latch permits real search timeline and durable writer reservation");
        if(!moved)throw std::runtime_error("source acquisition blocked concurrent progress");
        Need(progressed);
        if(mode=="delete")Need(catalog.RequestDeletion("segment","continuous-capacity",&error));
        else Need(catalog.Checkpoint(&error));
        guard.Release();reader.join();if(failure)std::rethrow_exception(failure);
        Check("R106-P01",mode=="progress"?result==expected:result.empty(),"final source check preserves checkpoint or rejects deletion/resource without stale publication");
        Check("R106-P01",owner.HasManagedLease(),"normal mutation and resource rejection preserve original authority");
        if(mode!="delete"){
            ProofProbe::SourceContext context;bool same=false;
            Check("R106-P01",ProofProbe::SourceCached(catalog,&context,&same)==expected&&!same,"fresh source read reports released Catalog cut");
            Check("R106-P01",ProofProbe::SourceCached(catalog,&context,&same)==expected&&same,"authenticated same-cut hit reports continuous lock without a new raw bypass");
            Need(catalog.RequestDeletion("segment","continuous-capacity",&error));
            Check("R106-P01",ProofProbe::SourceCached(catalog,&context,&same).empty()&&!same,"cached source never survives related current deletion");
        }
        Need(owner.Finish(&error));
    }
}
thread_local std::promise<void>* cold_entered=nullptr;
thread_local std::shared_future<void>* cold_resume=nullptr;
void PauseColdRead(){cold_entered->set_value();cold_resume->wait();}
void ColdReadProgressCases(const std::filesystem::path& root){
    using Probe=RecordingJournalGenerationReadOnlyProbe;
    for(const std::string mode:{"append","checkpoint","finish","tamper","after-io-tamper","reopen"}){
        const auto path=root/mode;std::filesystem::create_directories(path);CompleteFixture(path);
        RecordingJournal owner(Options(path));Need(owner.Open(&error));auto options=ReadOptions(path);options.enable_generation_writes=true;
        RecordingCatalog catalog(owner,options);Need(catalog.Open(&error));
        RecordingMutationLink link;Need(Probe::Link(owner,"bound",&link));
        RecordingMutationHandle expected;Need(Probe::Get(owner,link,&expected));
        std::promise<void> entered,resume;auto ready=entered.get_future();auto released=resume.get_future().share();
        RecordingMutationHandle result;bool read=false;std::exception_ptr failure;
        std::thread reader([&]{try{
            cold_entered=&entered;cold_resume=&released;if(mode=="after-io-tamper"||mode=="reopen")RecordingGenerationRequestProofProbe::ColdAfterIo(PauseColdRead);
            else RecordingGenerationImmutableBeforeBindingForTest(PauseColdRead);
            read=Probe::Get(owner,link,&result);
        }catch(...){failure=std::current_exception();}RecordingGenerationImmutableBeforeBindingForTest(nullptr);RecordingGenerationRequestProofProbe::ColdAfterIo(nullptr);});
        struct Guard {std::promise<void>& resume;std::thread& reader;bool done=false;
            void Release(){if(!done){resume.set_value();done=true;}}
            ~Guard(){Release();if(reader.joinable())reader.join();}
        } guard{resume,reader};
        Need(ready.wait_for(std::chrono::seconds(3))==std::future_status::ready);
        auto writer=std::async(std::launch::async,[&]{std::string detail;RecordingOrderReservationV1 order;
            const auto original=catalog.FindSegmentV2ById("segment");
            return original&&catalog.ReserveRecordingOrder("store","during-cold","during-cold-segment","other",&order,&detail);
        });
        const bool progressed=writer.wait_for(std::chrono::seconds(3))==std::future_status::ready;
        if(!progressed)guard.Release();
        const bool wrote=writer.get();
        Check("R107-P03",progressed&&wrote,"durable append and Catalog lookup progress during full archive hash I/O");
        if(!progressed)throw std::runtime_error("cold archive read blocks Journal writer");
        if(mode=="checkpoint")Need(catalog.Checkpoint(&error));
        if(mode=="finish"||mode=="reopen")Need(owner.Finish(&error));
        if(mode=="reopen")Need(owner.Open(&error));
        if(mode=="tamper"||mode=="after-io-tamper"){const auto file=path/"evidence-1-0.jsonl";auto bytes=Read(file);bytes[1]=bytes[1]=='x'?'y':'x';Write(file,bytes);}
        guard.Release();reader.join();if(failure)std::rethrow_exception(failure);
        Check("R107-P03",mode=="append"||mode=="checkpoint"?
            read&&result&&SerializeRecordingMutationV1(*result)==SerializeRecordingMutationV1(*expected):!read&&!result,
            "only unchanged original and current read authority may publish after unlocked I/O");
        if(mode!="finish")Need(owner.Finish(&error));
    }
}
void ActiveProofCases(const std::filesystem::path& root){
    using Probe=RecordingJournalGenerationReadOnlyProbe;
    for(const std::string mode:{"normal","same-size","other-row","inode","symlink","hardlink"}){
        const auto path=root/mode;std::filesystem::create_directories(path);CompleteFixture(path);
        RecordingJournal owner(Options(path));Need(owner.Open(&error));auto options=ReadOptions(path);options.enable_generation_writes=true;
        RecordingCatalog catalog(owner,options);Need(catalog.Open(&error));RecordingOrderReservationV1 reserved;
        Need(catalog.ReserveRecordingOrder("store","active-proof-order","active-proof-segment","channel",&reserved,&error));
        if(mode=="other-row")Need(catalog.ReserveRecordingOrder("store","other-active-order","other-active-segment","channel",&reserved,&error));
        RecordingMutationLink link;Need(Probe::Link(owner,"active-proof-order",&link));
        Probe::ReadProof proof;RecordingMutationHandle first,again;
        const int before=OpenDescriptors();Need(Probe::ReadProofLink(owner,&catalog,link,&proof,&first));
        Need(Probe::ReadProofLink(owner,&catalog,link,&proof,&again));
        Check("V440-PR77",first==again&&proof&&OpenDescriptors()==before,"active repeat reuses strict immutable envelope without extra FD");
        const auto canonical=SerializeRecordingMutationV1(*first);
        RecordingMutationHandle strict;Need(Probe::Get(owner,link,&strict));
        Check("V440-PR77",strict!=first&&SerializeRecordingMutationV1(*strict)==canonical,"ordinary acquisition keeps strict equal semantics");
        if(mode=="normal"){
            const auto pid=::fork();Need(pid>=0);if(pid==0){auto output=first;::_exit(!Probe::ReadProofLink(owner,&catalog,link,&proof,&output)&&output==first?0:1);}
            int status=0;Need(::waitpid(pid,&status,0)==pid);Check("V440-PR77",WIFEXITED(status)&&WEXITSTATUS(status)==0,"active proof rejects fork with output unchanged");
            auto wrong=first;Check("V440-PR77",!Probe::ReadProofLink(owner,&owner,link,&proof,&wrong)&&wrong==first,"active proof rejects different catalog owner");
            Need(catalog.ReserveRecordingOrder("store","active-proof-append","active-proof-next","channel",&reserved,&error));
            Need(Probe::ReadProofLink(owner,&catalog,link,&proof,&again));
            Check("V440-PR77",again!=first&&SerializeRecordingMutationV1(*again)==canonical,"own append strictly reacquires unchanged active row");
            auto appended=again;Need(Probe::ReadProofLink(owner,&catalog,link,&proof,&again));Check("V440-PR77",again==appended,"active reuse resumes after append");
            Need(catalog.Checkpoint(&error));RecordingGenerationArchiveReadsForTest(true);
            Need(Probe::ReadProofLink(owner,&catalog,link,&proof,&again));
            Check("V440-PR77",again!=appended&&SerializeRecordingMutationV1(*again)==canonical&&RecordingGenerationArchiveReadsForTest()==1,"active to historical rotation strictly reacquires without false poison");
            auto rotated=again;Need(Probe::ReadProofLink(owner,&catalog,link,&proof,&again));
            Check("V440-PR77",again==rotated&&RecordingGenerationArchiveReadsForTest()==1,"rotated proof reuses verified historical row");
            proof.reset();Check("V440-PR77",OpenDescriptors()==before,"active and rotated proof destruction releases descriptor");
            continue;
        }
        const auto file=owner.path();const auto bytes=Read(file);struct stat original{};Need(::stat(file.c_str(),&original)==0);
        if(mode=="same-size"||mode=="other-row"){
            const int fd=::open(file.c_str(),O_WRONLY|O_NOFOLLOW);Need(fd>=0);
            const auto offset=bytes.rfind(mode=="other-row"?"other-active-order":"active-proof-order");Need(offset<bytes.size());
            const char changed=bytes[offset]=='x'?'y':'x';Need(::pwrite(fd,&changed,1,static_cast<off_t>(offset))==1);
#if defined(__APPLE__)
            const timespec times[2]={original.st_atimespec,original.st_mtimespec};
#else
            const timespec times[2]={original.st_atim,original.st_mtim};
#endif
            Need(::futimens(fd,times)==0);Need(::close(fd)==0);
        }else if(mode=="hardlink")Need(::link(file.c_str(),(path/"extra-active-link").c_str())==0);
        else {std::filesystem::rename(file,path/"old-active");if(mode=="inode")Write(file,bytes);else Need(::symlink("old-active",file.c_str())==0);}
        again=first;const bool rejected=!Probe::ReadProofLink(owner,&catalog,link,&proof,&again);
        Check("V440-PR77",rejected&&again==first&&!owner.HasManagedLease(),(mode+" current active tamper rejects without changing output").c_str());
        Check("V440-PR77",!Probe::ReadProofLink(owner,&catalog,link,&proof,&again),"active poisoned owner remains rejected");
    }
}
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
#if MEDIA_SERVER_USE_OPENSSL && MEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND
        ColdReadProgressCases(root/"cold-read-progress");SourceReadCases(root/"source-read");SharedSourceReadCases(root/"shared-source-read");
        VerifiedDecodeCases();
        RetentionSharedDecodeCase();
        RetentionPreparedCases(root/"retention-prepared");
        RetentionPathCases(root/"retention-path");
        RetentionPrefixCases(root/"retention-prefix");
        ActiveProofCases(root/"active-proof");
#endif
        return failures?1:0;
    }catch(const std::exception& e){std::cerr<<"fixture: "<<e.what()<<'\n';return 2;}
}

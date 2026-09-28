// 파일 용도: 실제 writer/catalog/service를 사용하는 제한 대기 정책 fixture.
#define main existing_event_integration_main
#include "recording_derived_event_integration_smoke.cpp"
#undef main
namespace {
using namespace recording;
using Clock=std::chrono::steady_clock;
int passed=0,failed=0;
void Check(bool ok,const std::string& name){std::cout<<(ok?"[pass] ":"[fail] ")<<name<<'\n';ok?++passed:++failed;}
RecordingConsumerReferenceV1 Ref(const std::string& id,std::int64_t end=1500){
    RecordingConsumerReferenceV1 r;r.reference_id=id;r.kind="event";r.owner_id=id;
    r.source_id=r.channel_id="probe-channel";r.analysis_namespace="synthetic-recovery-r0";r.analysis_track_id="track";
    r.association_quality="timestamp-match";r.original=RecordingConsumerOriginalV1{"probe-generation-a",1,1,"video-0",0};
    r.request=RecordingConsumerRequestV1{"media-pts-ms",0,end,0,0};return r;
}
struct Fixture {
    Store store;Encoded input;RetentionCoordinator retention;DerivedJobService service;
    std::shared_ptr<const analysis::DecodedIntervalSnapshot> full,empty;
    Fixture(const std::filesystem::path& path,std::function<void(DerivedJobProgress,std::size_t)> progress={},bool write=true)
        :store(path),input(Encode(30,false,false)),retention(store.catalog,[this]{return store.catalog.RetentionSnapshot();},[](auto* b,auto*){*b=1024ULL*1024*1024;return true;},[](const auto&,auto*){return false;},{0,1,path}),service(store.catalog,store.journal,{path,30000,std::move(progress)}) {
        std::string error;if(!retention.UpdateChannelPolicy("probe-channel",{1024ULL*1024*1024,0,1024ULL*1024*1024,0},&error))throw std::runtime_error(error);
        if(write)WriteInput(store,input);full=SyntheticResult(input).decoded_intervals;
        auto e=std::make_shared<analysis::DecodedIntervalSnapshot>(*full);e->frames.clear();empty=e;
    }
    void Submit(DerivedEventWorker& w,const RecordingConsumerReferenceV1& r,std::shared_ptr<const analysis::DecodedIntervalSnapshot> e){std::string error;if(!store.catalog.PutConsumerReference(r,&error)||!w.Submit(r,std::move(e),&error))throw std::runtime_error(error);}
};
RecordingDerivedReferenceResult Wait(DerivedEventWorker& w,const std::string& id){
    auto result=w.Query(id);const auto deadline=Clock::now()+std::chrono::seconds(4);
    while(result.state=="pending"&&Clock::now()<deadline){std::this_thread::sleep_for(std::chrono::milliseconds(2));result=w.Query(id);}return result;
}
bool Full(const RecordingDerivedReferenceResult& r){return r.state=="complete"&&r.jobs.size()==1&&r.jobs[0].job.state==DerivedJobState::Complete&&r.jobs[0].job.ready&&r.jobs[0].job.ready->request_fully_satisfied;}
}
int main(int argc,char** argv){
    if(argc!=2)return 2;gst_init(nullptr,nullptr);
    try {
        const std::filesystem::path root=argv[1];
        {
            Fixture f(root/"fair");DerivedEventWorkerOptions o;o.wait_ms=500;o.retry_ms=10;o.max_attempts=60;
            DerivedEventWorker w(f.store.catalog,f.retention,f.service,o);f.Submit(w,Ref("waiting"),f.empty);f.Submit(w,Ref("ready"),f.full);
            const auto ready=Wait(w,"ready");const bool fair=Full(ready)&&w.Query("waiting").state=="pending";w.StopAndDrain();
            Check(fair,"LP10-W01 incomplete wait yields to later ready request");
        }
        for(const bool stop_ready:{false,true}) {
            std::mutex mu;std::condition_variable cv;bool entered=false,release=false,evaluated=false,timeout=false;
            Fixture f(root/(stop_ready?"render-stop":"render"),[&](auto stage,auto){if(stage==DerivedJobProgress::BeforeCreate){std::unique_lock lock(mu);if(!entered){entered=true;cv.notify_all();if(!cv.wait_for(lock,std::chrono::seconds(2),[&]{return release;}))timeout=true;}}});
            DerivedEventWorkerOptions o;o.wait_ms=500;o.diagnostic=[&](const auto& r,const auto&){if(r.reference_id=="second"){std::lock_guard lock(mu);evaluated=true;cv.notify_all();}};
            DerivedEventWorker w(f.store.catalog,f.retention,f.service,o);f.Submit(w,Ref("first"),f.full);
            {std::unique_lock lock(mu);cv.wait_for(lock,std::chrono::seconds(2),[&]{return entered;});}
            f.Submit(w,Ref("second"),f.full);bool independent=false;
            {std::unique_lock lock(mu);independent=cv.wait_for(lock,std::chrono::milliseconds(200),[&]{return evaluated;});}
            const bool single=w.Query("second").jobs.empty()&&f.store.catalog.RetentionSnapshot().durable_reservations.size()==1;
            std::thread stopper;bool stop_seen=false;
            if(stop_ready){stopper=std::thread([&]{w.StopAndDrain();});std::string error;const auto deadline=Clock::now()+std::chrono::seconds(1);while(Clock::now()<deadline){if(!w.Submit(Ref("stopped"),f.full,&error)&&error=="derived-worker-stopped"){stop_seen=true;break;}std::this_thread::yield();}}
            {std::lock_guard lock(mu);release=true;cv.notify_all();}
            if(stopper.joinable())stopper.join();
            const auto a=Wait(w,"first"),b=Wait(w,"second");w.StopAndDrain();
            if(stop_ready){std::string error;Check(independent&&!timeout&&stop_seen&&b.jobs.empty()&&f.store.catalog.RetentionSnapshot().durable_reservations.empty()&&f.store.catalog.RequestDeletion(f.store.Segments()[0].segment_id,"continuous-capacity",&error),"LP10-W09 Stop cleans active renderer and unadmitted ready lease without creating second job");}
            else {Check(independent&&!timeout&&Full(a)&&Full(b),"LP10-W02 single renderer barrier does not block scheduler evaluation");Check(single,"LP10-W02 ready queue never admits a second durable active renderer job");}
        }
        for(int mode=0;mode<3;++mode){
            Fixture f(root/("finalize-"+std::to_string(mode)),{},false);GStreamerSegmentWriter::Options wo(f.store.root,1000);wo.managed_journal=&f.store.journal;wo.managed_catalog=&f.store.catalog;wo.managed_store_id="probe-store";
            GStreamerSegmentWriter writer(wo);std::string error;if(!writer.Start("probe-channel","unused",f.input.descriptor,[](auto,auto,auto*){return false;},&error))throw std::runtime_error(error);
            for(std::size_t i=0;i<20;++i)writer.Push(f.input.packets[i],0);
            DerivedEventWorkerOptions o;o.wait_ms=20;o.max_attempts=3;o.retry_ms=10;o.source_wait_ms=500;o.source_max_attempts=60;
            auto submitted=f.input;submitted.packets.resize(20);auto captured=SyntheticResult(submitted).decoded_intervals;
            auto incomplete=std::make_shared<analysis::DecodedIntervalSnapshot>(*captured);incomplete->incomplete=true;incomplete->discarded_end_ns=std::numeric_limits<std::int64_t>::max();incomplete->frames.erase(incomplete->frames.begin(),incomplete->frames.begin()+5);
            if(mode)o.latest_evidence=[&](const auto&){return DerivedEventEvidenceUpdate{"probe-channel","probe-channel",incomplete};};
            if(mode==2)captured=incomplete;
            DerivedEventWorker w(f.store.catalog,f.retention,f.service,o);f.Submit(w,Ref("later"),captured);
            std::this_thread::sleep_for(std::chrono::milliseconds(80));for(std::size_t i=20;i<f.input.packets.size();++i)writer.Push(f.input.packets[i],0);writer.Stop();
            const auto result=Wait(w,"later");w.StopAndDrain();
            Check(mode==2?!Full(result):(Full(result)&&result.jobs[0].outputs.size()==2),mode==0?"LP10-W03 observed trailing identity waits beyond base budget for actual finalize":mode==1?"LP10-W10 rolling incomplete never overwrites retained whole normal snapshot":"LP10-W10 initially incomplete snapshot never becomes invented complete");
        }
        {
            Fixture f(root/"lease-cap",{},false);const auto input=Encode(100,false,false);WriteInput(f.store,input);
            auto ref=Ref("lease",10000);std::vector<RecordingConsumerOriginalV1> observed;for(const auto& p:input.packets){const auto& a=*p.observation;observed.push_back({a.source_generation,a.generation_order,a.ordinal,p.track_id,*a.pts_ns});}
            std::string error;std::uint64_t token=0;std::vector<RecordingDerivedSourceSnapshotEntry> snapshot;
            const auto bytes=std::filesystem::file_size(f.store.journal.path());
            Check(!f.store.catalog.SnapshotDerivedSourcesWithWaitLease(ref,observed,&token,&snapshot,&error)&&!token&&snapshot.empty(),"LP10-W07 observed ten-source protection rejects atomically at eight");
            observed.resize(1);std::vector<std::uint64_t> tokens;bool acquired=true;
            for(int i=0;i<32;++i){std::uint64_t t=0;acquired=f.store.catalog.SnapshotDerivedSourcesWithWaitLease(ref,observed,&t,&snapshot,&error)&&acquired;tokens.push_back(t);}
            Check(acquired&&snapshot.size()==10,"LP10-W07 nine unobserved candidates do not consume protection slots");
            Check(!f.store.catalog.SnapshotDerivedSourcesWithWaitLease(ref,observed,&token,&snapshot,&error)&&!token&&snapshot.empty(),"LP10-W07 thirty-third lease rejects without partial token");
            const auto id=f.store.Segments()[0].segment_id;
            const bool blocked=!f.store.catalog.RequestDeletion(id,"continuous-capacity",&error);
            const bool one=f.store.catalog.ReleaseDerivedWaitLease(tokens.back(),&error);tokens.pop_back();
            Check(blocked&&one&&!f.store.catalog.RequestDeletion(id,"continuous-capacity",&error)&&f.store.catalog.Open(&error),"LP10-W06 shared lease survives one release and idempotent Open");
            Check(!f.store.catalog.ReleaseDerivedWaitLease(99999,&error),"LP10-W06 foreign token cannot release owned protection");
            bool released=true;for(const auto t:tokens)released=f.store.catalog.ReleaseDerivedWaitLease(t,&error)&&released;
            Check(released&&std::filesystem::file_size(f.store.journal.path())==bytes&&f.store.catalog.RequestDeletion(id,"continuous-capacity",&error),"LP10-W06 exact final release permits deletion with no lease journal writes");
        }
        for(const bool attempts:{false,true}) {
            Fixture f(root/(attempts?"attempt-cap":"deadline-cap"),{},false);DerivedEventWorkerOptions o;o.wait_ms=0;o.max_attempts=1;o.retry_ms=10;o.source_wait_ms=attempts?500:50;o.source_max_attempts=attempts?3:121;
            std::vector<DerivedEventAttemptDiagnostic> trace;o.diagnostic=[&](const auto&,const auto& d){trace.push_back(d);};o.latest_evidence=[&](const auto&){return DerivedEventEvidenceUpdate{"probe-channel","probe-channel",f.full};};
            DerivedEventWorker w(f.store.catalog,f.retention,f.service,o);f.Submit(w,Ref("never"),f.full);const auto result=Wait(w,"never");w.StopAndDrain();
            Check(result.jobs.empty()&&result.state=="unknown"&&!trace.empty()&&(attempts?(trace.size()==3&&trace.back().attempt_exhausted):trace.back().deadline_exhausted),attempts?"LP10-W04 missing source ends at fixed evaluation cap":"LP10-W04 refreshed evidence cannot extend absolute source deadline");
        }
        for(const std::string mode:{"gap","deleted","corrupt","identity","duplicate","namespace","empty","throw"}) {
            Fixture f(root/("reject-"+mode));auto evidence=std::make_shared<analysis::DecodedIntervalSnapshot>(*f.full);std::string error;
            if(mode=="gap")evidence->frames.erase(evidence->frames.begin()+5);
            if(mode=="identity")evidence->frames[5].association.original->ordinal=999;
            if(mode=="duplicate")evidence->frames.push_back(evidence->frames[0]);
            if(mode=="deleted"&&!f.store.catalog.RequestDeletion(f.store.Segments()[0].segment_id,"continuous-capacity",&error))throw std::runtime_error(error);
            if(mode=="corrupt"&&!f.store.catalog.MarkSegmentCorrupt(f.store.Segments()[0].segment_id,"checksum-mismatch",&error))throw std::runtime_error(error);
            DerivedEventWorkerOptions o;o.wait_ms=20;o.max_attempts=3;o.retry_ms=10;o.source_wait_ms=500;
            std::vector<DerivedEventAttemptDiagnostic> trace;o.diagnostic=[&](const auto&,const auto& d){trace.push_back(d);};
            if(mode=="namespace"||mode=="empty"||mode=="throw")o.latest_evidence=[&](const auto&)->DerivedEventEvidenceUpdate {if(mode=="throw")throw std::runtime_error("fixture");if(mode=="empty")return {};auto wrong=std::make_shared<analysis::DecodedIntervalSnapshot>(*evidence);wrong->analysis_namespace="other";return {"probe-channel","probe-channel",wrong};};
            DerivedEventWorker w(f.store.catalog,f.retention,f.service,o);f.Submit(w,Ref("reject"),evidence);const auto result=Wait(w,"reject");w.StopAndDrain();
            const bool no_extension=std::all_of(trace.begin(),trace.end(),[](const auto& d){return d.wait_ms==20&&d.attempt_limit==3;});
            Check(!Full(result)&&no_extension&&f.store.catalog.RetentionSnapshot().durable_reservations.empty(),"LP10-W05 invalid source-wait basis stays partial/unknown: "+mode);
        }
        {
            Fixture f(root/"hold");std::mutex mu;std::condition_variable cv;bool evaluated=false;
            DerivedEventWorkerOptions o;o.wait_ms=500;o.retry_ms=100;o.diagnostic=[&](const auto&,const auto&){std::lock_guard lock(mu);evaluated=true;cv.notify_all();};
            auto prefix=std::make_shared<analysis::DecodedIntervalSnapshot>(*f.full);prefix->frames.resize(5);
            DerivedEventWorker w(f.store.catalog,f.retention,f.service,o);f.Submit(w,Ref("held"),prefix);
            {std::unique_lock lock(mu);cv.wait_for(lock,std::chrono::seconds(1),[&]{return evaluated;});}
            const auto id=f.store.Segments()[0].segment_id;std::string error;const bool protected_now=!f.store.catalog.RequestDeletion(id,"continuous-capacity",&error);
            w.StopAndDrain();const bool released=f.store.catalog.RequestDeletion(id,"continuous-capacity",&error);
            Check(protected_now&&released,"LP10-W06 wait lease blocks deletion until exact worker cleanup");
        }
        {
            Fixture f(root/"fractional-hold",{},false);f.input=Encode(60,false,false,160,90,30,30);WriteInput(f.store,f.input);f.full=SyntheticResult(f.input).decoded_intervals;
            if(!f.store.catalog.FindSourceBinding(f.store.Segments()[0].segment_id)->file_evidence)throw std::runtime_error("fractional fixture native proof absent");
            const auto proof=*f.store.catalog.FindSourceBinding(f.store.Segments()[0].segment_id)->file_evidence;PresentationInterval interval;
            if(!MakePresentationInterval(proof.writer_origin_ns,proof.timescale,proof.samples[0].native_pts,proof.samples[0].native_duration,&interval)||ComparePresentationTime(interval.start,{10000000,0,1})>=0||ComparePresentationTime(interval.end,{10000000,0,1})<=0)throw std::runtime_error("fractional fixture native overlap absent");
            std::mutex mu;std::condition_variable cv;bool evaluated=false;
            auto evidence=std::make_shared<analysis::DecodedIntervalSnapshot>(*f.full);evidence->frames.resize(1);evidence->frames[0].duration_ns.reset();
            auto ref=Ref("fractional",1500);ref.request->start_ms=10;
            DerivedEventWorkerOptions o;o.wait_ms=500;o.diagnostic=[&](const auto&,const auto&){std::lock_guard lock(mu);evaluated=true;cv.notify_all();};
            DerivedEventWorker w(f.store.catalog,f.retention,f.service,o);f.Submit(w,ref,evidence);
            {std::unique_lock lock(mu);cv.wait_for(lock,std::chrono::seconds(1),[&]{return evaluated;});}
            std::string error;const bool held=!f.store.catalog.RequestDeletion(f.store.Segments()[0].segment_id,"continuous-capacity",&error);w.StopAndDrain();
            Check(held,"LP10-W06 fractional start native proven preceding AU stays protected without decoded duration");
        }
        {
            const auto path=root/"reopen";std::string id,error;
            {Fixture f(path);id=f.store.Segments()[0].segment_id;auto ref=Ref("reopen");
                if(!f.store.catalog.PutConsumerReference(ref,&error)||!f.store.catalog.AcceptDerivedReference(ref,&error))throw std::runtime_error(error);
                std::uint64_t token=0;std::vector<RecordingDerivedSourceSnapshotEntry> snapshot;
                if(!f.store.catalog.SnapshotDerivedSourcesWithWaitLease(ref,{*ref.original},&token,&snapshot,&error))throw std::runtime_error(error);
                Check(!f.store.catalog.RequestDeletion(id,"continuous-capacity",&error),"LP10-W12 live runtime lease protects before catalog destruction");}
            Store reopened(path);RecordingDerivedReferenceResult result;
            Check(reopened.catalog.QueryDerivedReferenceResult("reopen",&result,&error)&&result.jobs.empty()&&result.managed&&result.state=="unknown"&&reopened.catalog.RequestDeletion(id,"continuous-capacity",&error),"LP10-W12 accepted reference survives reopen without persisted runtime lease or invented job");
        }
        {
            Fixture f(root/"provider-stop");std::mutex mu;std::condition_variable cv;bool entered=false,release=false;
            DerivedEventWorkerOptions o;o.latest_evidence=[&](const auto&){std::unique_lock lock(mu);entered=true;cv.notify_all();cv.wait_for(lock,std::chrono::seconds(2),[&]{return release;});return DerivedEventEvidenceUpdate{"probe-channel","probe-channel",f.full};};
            DerivedEventWorker w(f.store.catalog,f.retention,f.service,o);f.Submit(w,Ref("provider-stop"),f.full);
            {std::unique_lock lock(mu);cv.wait_for(lock,std::chrono::seconds(1),[&]{return entered;});}
            std::thread a([&]{w.StopAndDrain();}),b([&]{w.StopAndDrain();});std::string error;
            const auto deadline=Clock::now()+std::chrono::seconds(1);bool stopped=false;while(Clock::now()<deadline){if(!w.Submit(Ref("after-stop"),f.full,&error)&&error=="derived-worker-stopped"){stopped=true;break;}std::this_thread::yield();}
            {std::lock_guard lock(mu);release=true;cv.notify_all();}a.join();b.join();
            Check(entered&&stopped&&w.Query("provider-stop").jobs.empty()&&f.store.catalog.RetentionSnapshot().durable_reservations.empty()&&f.store.catalog.RequestDeletion(f.store.Segments()[0].segment_id,"continuous-capacity",&error),"LP10-W09 concurrent Stop joins provider barrier without admission or leaked lease");
        }
        {
            Fixture original(root/"utc-input");std::mutex mu;std::condition_variable cv;bool entered=false,release=false,evaluated=false;
            Fixture f(root/"utc-ready",[&](auto stage,auto){if(stage==DerivedJobProgress::BeforeCreate){std::unique_lock lock(mu);if(!entered){entered=true;cv.notify_all();cv.wait_for(lock,std::chrono::seconds(2),[&]{return release;});}}},false);
            auto segment=original.store.Segments()[0];auto binding=*original.store.catalog.FindSourceBinding(segment.segment_id);std::string error;
            segment.mappings={{"media-server.recording-utc-mapping.v1","wait-utc-map",segment.media_start_pts,segment.media_end_pts,"server-observation",100000000000LL,101000000000LL,0,"fixture-explicit-utc-mapping"}};
            RecordingOrderReservationV1 order;if(!f.store.journal.ReserveRecordingOrder(segment.store_id,segment.order_request_id,segment.segment_id,segment.channel_id,&order,&error))throw std::runtime_error(error);segment.order_sequence=order.sequence;
            const auto location=*original.store.catalog.FindSegmentMediaLocation(segment.segment_id);const auto path=f.store.root/location.second;std::filesystem::create_directories(path.parent_path());std::filesystem::copy_file(location.first/location.second,path);
            if(!f.store.catalog.FinalizeBoundSegmentV2(segment,binding,path.string(),&error))throw std::runtime_error(error);
            DerivedEventWorkerOptions o;o.wait_ms=500;o.queue_capacity=2;o.diagnostic=[&](const auto& r,const auto&){if(r.reference_id=="utc"){std::lock_guard lock(mu);evaluated=true;cv.notify_all();}};
            DerivedEventWorker w(f.store.catalog,f.retention,f.service,o);f.Submit(w,Ref("utc-blocker",500),f.full);
            {std::unique_lock lock(mu);cv.wait_for(lock,std::chrono::seconds(1),[&]{return entered;});}
            auto utc=Ref("utc");utc.original.reset();utc.association_quality="unavailable";utc.request=RecordingConsumerRequestV1{"utc-ms",100000,100500,0,0};f.Submit(w,utc,f.empty);
            {std::unique_lock lock(mu);cv.wait_for(lock,std::chrono::seconds(1),[&]{return evaluated;});}
            // 진단 콜백은 준비 임대 이전보다 먼저 호출되므로 두 번째 평가 차례를 기다린다.
            std::this_thread::sleep_for(std::chrono::milliseconds(30));
            const bool pending=w.Query("utc").state=="pending"&&w.Query("utc").jobs.empty();
            const bool protected_now=!f.store.catalog.RequestDeletion(segment.segment_id,"continuous-capacity",&error);
            auto overflow=Ref("queue-overflow");if(!f.store.catalog.PutConsumerReference(overflow,&error))throw std::runtime_error(error);
            const bool rejected=!w.Submit(overflow,f.full,&error);bool accepted=true;const bool untouched=f.store.catalog.IsDerivedReferenceAccepted(overflow.reference_id,&accepted,&error)&&!accepted;
            {std::lock_guard lock(mu);release=true;cv.notify_all();}const auto a=Wait(w,"utc-blocker"),b=Wait(w,"utc");w.StopAndDrain();
            Check(entered&&evaluated&&pending&&protected_now&&Full(a)&&Full(b),"LP10-W08 UTC ready source protected through single-renderer durable handoff");
            Check(rejected&&untouched,"LP10-W08 shared inflight cap rejection leaves reference unaccepted");
            std::uint64_t token=0;std::vector<RecordingDerivedSourceSnapshotEntry> snapshot;
            if(!Full(b)||!f.store.catalog.SnapshotDerivedSourcesWithWaitLease(utc,{},&token,&snapshot,&error)||!f.store.catalog.RefreshDerivedWaitLeaseForIntent(b.jobs[0].job.intent,token,&error))throw std::runtime_error("UTC ready-only lease setup:"+error);
            Check(!f.store.catalog.RequestDeletion(segment.segment_id,"continuous-capacity",&error)&&f.store.catalog.ReleaseDerivedWaitLease(token,&error),"LP10-W08 UTC selected-only lease protects without observed identity or active durable job");
            Check(f.store.catalog.RetentionSnapshot().durable_reservations.empty()&&f.store.catalog.RequestDeletion(segment.segment_id,"continuous-capacity",&error),"LP10-W08 terminal handoff releases runtime and durable source protection");
        }
        for(const std::string mode:{"valid","absent","overflow"}) {
            Fixture f(root/("fractional-wait-"+mode),{},false);auto evidence=std::make_shared<analysis::DecodedIntervalSnapshot>(*f.full);evidence->frames.resize(1);
            if(mode=="absent")evidence->frames[0].duration_ns.reset();
            if(mode=="overflow")evidence->frames[0].duration_ns=std::numeric_limits<std::uint64_t>::max();
            auto ref=Ref("fractional-wait",75);ref.request->start_ms=50;std::vector<DerivedEventAttemptDiagnostic> trace;
            DerivedEventWorkerOptions o;o.wait_ms=0;o.max_attempts=1;o.retry_ms=10;o.source_wait_ms=50;o.diagnostic=[&](const auto&,const auto& d){trace.push_back(d);};
            DerivedEventWorker w(f.store.catalog,f.retention,f.service,o);f.Submit(w,ref,evidence);const auto result=Wait(w,ref.reference_id);w.StopAndDrain();
            Check(result.jobs.empty()&&!trace.empty()&&trace.front().wait_ms==(mode=="valid"?50:0),"LP10-W05 fractional source wait requires representable proven decoded overlap: "+mode);
        }
        {
            Fixture f(root/"admission-failure");std::string error;
            if(!f.retention.UpdateChannelPolicy("probe-channel",{1024ULL*1024*1024,0,1,0},&error))throw std::runtime_error(error);
            DerivedEventWorkerOptions o;o.wait_ms=0;DerivedEventWorker w(f.store.catalog,f.retention,f.service,o);f.Submit(w,Ref("admission-failure"),f.full);const auto result=Wait(w,"admission-failure");w.StopAndDrain();
            Check(result.jobs.empty()&&result.reason.find("derived-admission-rejected:")==0&&f.store.catalog.RetentionSnapshot().durable_reservations.empty()&&f.store.catalog.RequestDeletion(f.store.Segments()[0].segment_id,"continuous-capacity",&error),"LP10-W08 actual admission capacity rejection releases wait lease and reservation");
        }
        for(int mode=0;mode<4;++mode){
            Fixture f(root/("clamp-"+std::to_string(mode)),{},false);std::mutex mu;std::condition_variable cv;std::optional<DerivedEventAttemptDiagnostic> first;
            DerivedEventWorkerOptions o;o.wait_ms=0;o.max_attempts=1;o.source_wait_ms=mode==0?-1:mode==1?100000:500;o.source_max_attempts=mode==2?0:mode==3?999:121;
            o.diagnostic=[&](const auto&,const auto& d){std::lock_guard lock(mu);if(!first)first=d;cv.notify_all();};
            DerivedEventWorker w(f.store.catalog,f.retention,f.service,o);f.Submit(w,Ref("clamp"),f.full);
            {std::unique_lock lock(mu);cv.wait_for(lock,std::chrono::seconds(1),[&]{return first.has_value();});}w.StopAndDrain();
            Check(first&&first->wait_ms==(mode==0?0:mode==1?60000:500)&&first->attempt_limit==(mode==0||mode==2?1:121),"LP10-W11 constructor source budget clamp case="+std::to_string(mode));
        }
        const auto runtime=RecordingRuntimeEventBudget(10000,5000);
        Check(runtime.wait_ms==16000&&runtime.max_attempts==33&&runtime.source_wait_ms==60000&&runtime.source_max_attempts==121&&DerivedEventWorkerOptions{}.source_wait_ms==0,"LP10-W11 runtime source budget opt-in preserves base budget");
        std::cout<<"[summary] pass="<<passed<<" fail="<<failed<<'\n';return failed?1:0;
    }catch(const std::exception& e){std::cerr<<"[setup-fail] "<<e.what()<<'\n';return 2;}
}

// 파일 용도: 실제 H264 decoder 증거와 실제 EventRecord dispatch를 opt-in 파생 작업에 연결한다.
#include "recording_media_test_fixture.h"
#include "recording/event_recording_bridge.h"
#include "recording/recording_derived_job_service.h"
#include "recording/recording_derived_selection.h"
#include "analysis/raw_video_decoder.h"
#include <condition_variable>
#include <iostream>
#include <thread>
#include <fcntl.h>
#include <unistd.h>
#include <sqlite3.h>

bool DecodeOutput(const std::filesystem::path& path) {
    const int fd=::open(path.c_str(),O_RDONLY|O_NOFOLLOW|O_CLOEXEC);
    if(fd<0)return false;
    std::size_t frames=0;bool eos=false,error_free=true;
    {
        Pipeline pipe("fdsrc fd="+std::to_string(fd)+" ! tsdemux ! h264parse ! avdec_h264 ! appsink name=out sync=false");
        auto* bus=gst_element_get_bus(pipe.pipeline);
        const auto deadline=std::chrono::steady_clock::now()+std::chrono::seconds(5);
        while(std::chrono::steady_clock::now()<deadline) {
            if(auto* sample=gst_app_sink_try_pull_sample(GST_APP_SINK(pipe.sink),20*GST_MSECOND)) {++frames;gst_sample_unref(sample);}
            if(auto* message=gst_bus_pop_filtered(bus,static_cast<GstMessageType>(GST_MESSAGE_EOS|GST_MESSAGE_ERROR))) {
                eos=GST_MESSAGE_TYPE(message)==GST_MESSAGE_EOS;
                error_free=GST_MESSAGE_TYPE(message)!=GST_MESSAGE_ERROR;
                gst_message_unref(message);break;
            }
        }
        gst_object_unref(bus);
    }
    ::close(fd);
    std::cout<<"[decode] frames="<<frames<<" eos="<<eos<<" error_free="<<error_free<<'\n';
    return frames>0&&eos&&error_free;
}

struct LegacyDeriver final:recording::EventClipDeriver {
    recording::EventClipDeriveResult Derive(const recording::EventClipDeriveRequest&)override{
        throw std::runtime_error("legacy deriver must not receive consumer reference");
    }
};
analysis::AnalysisResult SyntheticResult(const Encoded& input) {
    analysis::DecodedIntervalCollector collector;
    analysis::AnalysisResult result;
    for(const auto& packet:input.packets) {
        analysis::DecodedIntervalEvidence interval;interval.analysis_pts_ns=packet.pts;interval.duration_ns=packet.observation->duration_ns;
        interval.association.quality=analysis::SourceAssociationQuality::TimestampMatch;
        const auto& observation=*packet.observation;
        interval.association.original=analysis::OriginalSampleIdentity{observation.source_generation,observation.generation_order,
            observation.ordinal,packet.track_id,*observation.pts_ns};
        result.source_association=interval.association;result.pts=packet.pts;collector.Append(std::move(interval));
    }
    result.source_key="probe-channel";result.observation_context.source_id="probe-channel";result.observation_context.channel_id="probe-channel";
    result.observation_namespace="synthetic-recovery-r0";result.decoded_intervals=collector.Snapshot(result.observation_namespace);
    result.context.event_time_basis="media-pts-ms";
    return result;
}
void WriteInput(Store& store,const Encoded& input) {
    recording::GStreamerSegmentWriter::Options options(store.root,1000);
    options.managed_journal=&store.journal;options.managed_catalog=&store.catalog;options.managed_store_id="probe-store";
    recording::GStreamerSegmentWriter writer(options);std::string error;
    if(!writer.Start("probe-channel","unused",input.descriptor,[](auto,auto,auto*){return false;},&error))throw std::runtime_error(error);
    for(const auto& packet:input.packets)writer.Push(packet,0);writer.Stop();
}
int RecoveryMode(const std::filesystem::path& root,bool child) {
    gst_init(nullptr,nullptr);Store store(root);std::string error;
    Encoded input;if(child){input=Encode(30,false,false);Shift(input,7000000000ULL);WriteInput(store,input);}
    recording::RetentionCoordinator retention(store.catalog,[&]{return store.catalog.RetentionSnapshot();},[](auto* bytes,auto*){*bytes=1024ULL*1024*1024;return true;},[](const auto&,auto*){return false;},{0,1,root});
    if(!retention.UpdateChannelPolicy("probe-channel",{1024ULL*1024*1024,0,1024ULL*1024*1024,0},&error))throw std::runtime_error(error);
    recording::DerivedJobService::Options service_options{root,30000,{}};
    if(child)service_options.progress=[](auto progress,auto) {if(progress==recording::DerivedJobProgress::ReadyDurable)::_exit(23);};
    recording::DerivedJobService service(store.catalog,store.journal,service_options);LegacyDeriver legacy;
    recording::CatalogEventRecordingBridge::Options options;options.use_consumer_references=true;options.derived_service=&service;
    options.resolve_recording_channel=[](const auto& source){return std::optional<std::string>(source);};
    std::vector<recording::DerivedJobRecordV1> before;store.catalog.SnapshotDerivedJobs(&before,&error);
    const auto reservation_before=store.catalog.RetentionSnapshot().durable_reservations.size();
    bool protected_before=true;
    if(!child&&before.size()==1)for(const auto& source:before[0].intent.sources)
        protected_before=protected_before&&!store.catalog.RequestDeletion(source.segment.segment_id,"continuous-capacity",&error);
    recording::CatalogEventRecordingBridge bridge(store.catalog,retention,legacy,options);
    if(child) {
        analysis::EventRecord record;record.event_id="restart-ready-event";record.channel_id="probe-channel";record.stream_id="probe-channel";
        record.track_id=1;record.start_time_ms=7000;record.end_time_ms=8500;record.update_time_ms=8500;record.time_basis="media-pts-ms";
        analysis::EventMediaHookOptions hooks;hooks.pre_event_ms=0;hooks.post_event_ms=0;
        bridge.TryResolve(SyntheticResult(input),record,hooks);
        const auto deadline=std::chrono::steady_clock::now()+std::chrono::seconds(5);
        while(std::chrono::steady_clock::now()<deadline)std::this_thread::sleep_for(std::chrono::milliseconds(10));
        bridge.StopAndDrain();std::cerr<<"[fail] ReadyDurable child exit 미도달\n";return 2;
    }
    int passed=0,failed=0;
    const auto check=[&](bool ok,const std::string& name){std::cout<<(ok?"[pass] ":"[fail] ")<<name<<'\n';ok?++passed:++failed;};
    if(before.size()!=1)throw std::runtime_error("recovery fixture missing job");
    const auto current=bridge.QueryReferenceResult(before[0].intent.reference.reference_id);
    bool recovered=before[0].state==recording::DerivedJobState::Ready&&reservation_before==1&&protected_before&&
        current.managed&&current.jobs.size()==1&&current.jobs[0].job.state==recording::DerivedJobState::Complete&&
        current.jobs[0].job.intent.job_id==before[0].intent.job_id&&current.jobs[0].outputs.size()==2&&
        store.catalog.RetentionSnapshot().durable_reservations.empty();
    if(recovered)for(const auto& output:current.jobs[0].outputs)recovered=DecodeOutput(root/output.relative_path)&&output.catalog_available&&recovered;
    std::size_t commits=0;for(const auto& mutation:store.journal.Replay().mutations)if(mutation.mutation_type==recording::RecordingMutationType::DerivedJobCommitted)++commits;
    check(recovered&&commits==1,"E15 별도 프로세스 Ready _exit 후 보호 복원→bridge reconcile→동일 2출력·decode·commit 1개");
    bridge.StopAndDrain();
    const auto& output=current.jobs.at(0).outputs.at(0);
    const auto segment=store.catalog.FindSegmentV2ById(output.segment_id);
    if(!segment||!store.catalog.RequestDeletion(output.segment_id,"event-capacity",&error)||
       !recording::RemoveContainedMediaFile(root,root/output.relative_path,&error))throw std::runtime_error(error);
    recording::RecordingTombstoneV2 tombstone;tombstone.tombstone_id="terminal-output-tombstone";tombstone.segment=*segment;
    tombstone.deletion_reason="event-capacity";tombstone.deleted_at_ms=segment->finalized_at_ms+1;
    if(!store.catalog.CompleteDeletionV2(tombstone,&error))throw std::runtime_error(error);
    recording::CatalogEventRecordingBridge reopened(store.catalog,retention,legacy,options);
    const auto historical=reopened.QueryReferenceResult(before[0].intent.reference.reference_id);
    check(historical.jobs.size()==1&&historical.jobs[0].job.state==recording::DerivedJobState::Complete&&
        historical.jobs[0].outputs.size()==2&&!historical.jobs[0].outputs[0].catalog_available&&
        !std::filesystem::exists(root/output.relative_path),"E16 historical Complete와 terminal tombstone 현재 unavailable·재생성 없음");
    reopened.StopAndDrain();
    std::cout<<"[summary] pass="<<passed<<" fail="<<failed<<'\n';return failed?1:0;
}
int CancelMode(const std::filesystem::path& root) {
    gst_init(nullptr,nullptr);Store store(root);auto input=Encode(30,false,false);Shift(input,7000000000ULL);WriteInput(store,input);
    auto result=SyntheticResult(input);std::string error;
    recording::RetentionCoordinator retention(store.catalog,[&]{return store.catalog.RetentionSnapshot();},[](auto* bytes,auto*){*bytes=1024ULL*1024*1024;return true;},[](const auto&,auto*){return false;},{0,1,root});
    if(!retention.UpdateChannelPolicy("probe-channel",{1024ULL*1024*1024,0,1024ULL*1024*1024,0},&error))throw std::runtime_error(error);
    std::mutex gate_mu;std::condition_variable gate_cv;bool entered=false,release=false,timed_out=false;
    recording::DerivedJobService::Options service_options{root,30000,{}};
    // 검증 전용 bounded 진행 장벽이다. 제품 provider를 차단하거나 timeout thread를 만들지 않는다.
    service_options.progress=[&](auto progress,auto) {
        if(progress!=recording::DerivedJobProgress::BeforeCreate)return;
        std::unique_lock lock(gate_mu);entered=true;gate_cv.notify_all();
        timed_out=!gate_cv.wait_for(lock,std::chrono::seconds(2),[&]{return release;});
    };
    recording::DerivedJobService service(store.catalog,store.journal,service_options);LegacyDeriver legacy;
    recording::CatalogEventRecordingBridge::Options options;options.use_consumer_references=true;options.derived_service=&service;
    options.resolve_recording_channel=[](const auto& source){return std::optional<std::string>(source);};options.derived_options.queue_capacity=1;
    recording::CatalogEventRecordingBridge bridge(store.catalog,retention,legacy,options);
    analysis::EventRecord record;record.event_id="cancel-active";record.channel_id="probe-channel";record.stream_id="probe-channel";
    record.track_id=1;record.start_time_ms=7000;record.end_time_ms=8500;record.update_time_ms=8500;record.time_basis="media-pts-ms";
    analysis::EventMediaHookOptions hooks;hooks.pre_event_ms=0;hooks.post_event_ms=0;
    const auto first=bridge.TryResolve(result,record,hooks);
    {std::unique_lock lock(gate_mu);if(!gate_cv.wait_for(lock,std::chrono::seconds(2),[&]{return entered;}))throw std::runtime_error("cancel fixture 진입 없음");}
    const auto active=store.catalog.RetentionSnapshot();
    record.event_id="queue-full";const auto rejected=bridge.TryResolve(result,record,hooks);
    const bool full=!rejected.derived_job_managed&&rejected.error=="derived-queue-full"&&active.durable_reservations.size()==1;
    const auto started=std::chrono::steady_clock::now();
    std::thread stop_one([&]{bridge.StopAndDrain();}),stop_two([&]{bridge.StopAndDrain();});
    record.event_id="stop-observer";bool stopped=false;
    const auto deadline=std::chrono::steady_clock::now()+std::chrono::seconds(1);
    while(std::chrono::steady_clock::now()<deadline) {
        if(bridge.TryResolve(result,record,hooks).error=="bridge-stopped") {stopped=true;break;}
        std::this_thread::yield();
    }
    {std::lock_guard lock(gate_mu);release=true;gate_cv.notify_all();}
    stop_one.join();stop_two.join();
    const auto elapsed=std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now()-started).count();
    const auto current=bridge.QueryReferenceResult(first.link_id);
    bool no_files=true;
    if(current.jobs.size()==1)for(const auto& output:current.jobs[0].job.intent.outputs)
        no_files=no_files&&!std::filesystem::exists(root/output.temporary_relpath)&&!std::filesystem::exists(root/output.final_relpath);
    const auto final=store.catalog.RetentionSnapshot();bool holds_released=true;
    for(const auto& candidate:final.candidates)holds_released=holds_released&&candidate.hold_count==0;
    const bool cancelled=stopped&&!timed_out&&elapsed<2000&&current.managed&&current.jobs.size()==1&&
        current.jobs[0].job.state==recording::DerivedJobState::Failed&&no_files&&final.durable_reservations.empty()&&holds_released;
    std::cout<<(full?"[pass] ":"[fail] ")<<"E13 active 포함 queue cap 포화는 새 accepted/예약 없이 거부\n";
    std::cout<<(cancelled?"[pass] ":"[fail] ")<<"E14 실제 Run 중 동시 Stop 두 번→취소·단일 join·Failed cleanup 후 자원 해제\n";
    std::cout<<"[detail] stop_elapsed_ms="<<elapsed<<" barrier_timeout="<<timed_out<<" managed="<<current.managed<<'\n';
    std::cout<<"[summary] pass="<<(static_cast<int>(full)+static_cast<int>(cancelled))<<" fail="<<(static_cast<int>(!full)+static_cast<int>(!cancelled))<<'\n';
    return full&&cancelled?0:1;
}
int CapMode(const std::filesystem::path& root) {
    gst_init(nullptr,nullptr);std::string error;std::vector<std::string> before_ids;
    recording::RecordingConsumerReferenceV1 reference;
    {
        Store store(root);auto input=Encode(30,false,false);Shift(input,7000000000ULL);WriteInput(store,input);
        const auto result=SyntheticResult(input);
        reference.reference_id="job-cap-reference";reference.kind="event";reference.owner_id="cap-event";
        reference.source_id="probe-channel";reference.channel_id="probe-channel";reference.analysis_namespace=result.observation_namespace;
        reference.analysis_track_id="track-1";reference.analysis_pts=result.pts;reference.association_quality="timestamp-match";
        const auto& original=*result.source_association.original;
        reference.original=recording::RecordingConsumerOriginalV1{original.source_generation,original.generation_order,original.ordinal,original.track_id,original.pts_ns};
        reference.request=recording::RecordingConsumerRequestV1{"media-pts-ms",7000,8000,0,0};reference.created_at_ms=1;
        if(!store.catalog.PutConsumerReference(reference,&error)||!store.catalog.AcceptDerivedReference(reference,&error))throw std::runtime_error(error);
        std::vector<recording::RecordingDerivedSourceSnapshotEntry> entries;
        if(!store.catalog.SnapshotDerivedSources(reference,&entries,&error))throw std::runtime_error(error);
        std::vector<recording::DerivedSourceEvidence> sources;for(const auto& entry:entries)sources.push_back({entry.segment,entry.binding,entry.deleted});
        recording::RetentionCoordinator retention(store.catalog,[&]{return store.catalog.RetentionSnapshot();},[](auto* bytes,auto*){*bytes=1024ULL*1024*1024;return true;},[](const auto&,auto*){return false;},{0,1,root});
        if(!retention.UpdateChannelPolicy("probe-channel",{1024ULL*1024*1024,0,1024ULL*1024*1024,0},&error))throw std::runtime_error(error);
        for(std::size_t n=1;n<=9;++n) {
            auto evidence=*result.decoded_intervals;evidence.frames.resize(n);recording::DerivedRecordingSelection selection;
            recording::DerivedJobIntentV1 intent;
            if(!recording::SelectDerivedRecording(reference,evidence,sources,nullptr,&selection,&error)||
               !recording::BuildDerivedJobIntent(selection,sources,4096,10-static_cast<std::int64_t>(n),&intent,&error))throw std::runtime_error(error);
            const auto admitted=retention.AdmitDerivedJob(store.catalog,intent,10);
            if(!admitted.accepted||!admitted.created)throw std::runtime_error(admitted.message);
        }
        recording::RecordingDerivedReferenceResult current;
        if(!store.catalog.QueryDerivedReferenceResult(reference.reference_id,&current,&error)||!current.truncated||current.jobs.size()!=8)
            throw std::runtime_error("cap fixture query expected 8/truncated");
        for(const auto& item:current.jobs)before_ids.push_back(item.job.intent.job_id);
        if(!store.catalog.Checkpoint(&error))throw std::runtime_error(error);
    }
    Store store(root);recording::RecordingDerivedReferenceResult restored;
    if(!store.catalog.QueryDerivedReferenceResult(reference.reference_id,&restored,&error))throw std::runtime_error(error);
    std::vector<std::string> after_ids;for(const auto& item:restored.jobs)after_ids.push_back(item.job.intent.job_id);
    const bool stable=restored.truncated&&restored.state=="unknown"&&before_ids==after_ids&&std::is_sorted(after_ids.begin(),after_ids.end());
    recording::RetentionCoordinator retention(store.catalog,[&]{return store.catalog.RetentionSnapshot();},[](auto* bytes,auto*){*bytes=1024ULL*1024*1024;return true;},[](const auto&,auto*){return false;},{0,1,root});
    recording::DerivedJobService service(store.catalog,store.journal,{root,30000,{}});LegacyDeriver legacy;
    recording::CatalogEventRecordingBridge::Options options;options.use_consumer_references=true;options.derived_service=&service;
    options.resolve_recording_channel=[](const auto& source){return std::optional<std::string>(source);};
    recording::CatalogEventRecordingBridge bridge(store.catalog,retention,legacy,options);
    const auto blocked=bridge.QueryReferenceResult(reference.reference_id);
    std::vector<recording::DerivedJobRecordV1> active;bool more=false;
    store.catalog.SnapshotActiveDerivedJobs(8,&active,&more,&error);
    const auto count=store.journal.Replay().mutations.size();
    std::this_thread::sleep_for(std::chrono::milliseconds(30));
    const bool bounded=blocked.managed&&blocked.state=="blocked"&&blocked.reason.find("job-reconcile-snapshot-cap")!=std::string::npos&&
        active.size()==1&&!more&&store.journal.Replay().mutations.size()==count&&store.catalog.RetentionSnapshot().durable_reservations.size()==1;
    bridge.StopAndDrain();
    std::cout<<(stable?"[pass] ":"[fail] ")<<"E18 reference job top-8은 wall 역행/재시작에도 동일 ID subset·truncated unknown\n";
    std::cout<<(bounded?"[pass] ":"[fail] ")<<"E15 startup bounded8 more는 blocker·남은 보호 유지·자동 무한 reconcile 없음\n";
    std::cout<<"[summary] pass="<<(static_cast<int>(stable)+static_cast<int>(bounded))<<" fail="<<(static_cast<int>(!stable)+static_cast<int>(!bounded))<<'\n';
    return stable&&bounded?0:1;
}
int HookConsumer(const std::filesystem::path& root,bool managed) {
    gst_init(nullptr,nullptr);
    std::filesystem::create_directories(root);
    setenv("MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_ENABLED","1",1);
    setenv("MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_PATH",(root/"events.jsonl").c_str(),1);
    setenv("MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_HOOK_ENABLED","1",1);
    setenv("MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_DIR",(root/"snapshots").c_str(),1);
    setenv("MEDIA_SERVER_ANALYSIS_EVENT_CLIP_HOOK_ENABLED","1",1);
    setenv("MEDIA_SERVER_ANALYSIS_EVENT_CLIP_DIR",(root/"clips").c_str(),1);
    setenv("MEDIA_SERVER_ANALYSIS_EVENT_PRE_EVENT_MS","0",1);
    setenv("MEDIA_SERVER_ANALYSIS_EVENT_POST_EVENT_MS","0",1);
    const int blocked_clip=::open((root/"clips").c_str(),O_WRONLY|O_CREAT|O_EXCL|O_CLOEXEC,0600);
    if(blocked_clip<0)throw std::runtime_error("hook fixture 소유 clip 경로 생성 실패");
    ::close(blocked_clip);
    struct Bridge final:analysis::EventRecordingBridge {
        bool managed;std::atomic<int> fallback{0};
        explicit Bridge(bool value):managed(value){}
        analysis::EventRecordingBridgeResult TryResolve(const analysis::AnalysisResult&,const analysis::EventRecord&,
            const analysis::EventMediaHookOptions&)override{return {true,false,{},"internal-reference","unknown",{},managed};}
        void RecordFallback(const analysis::EventRecord&,const analysis::EventRecordingBridgeResult&)override{++fallback;}
    };
    auto bridge=std::make_shared<Bridge>(managed);analysis::SetEventRecordingBridge(bridge);
    analysis::AnalysisResult result;result.source_key="hook-channel";result.pts=7000000000LL;result.context.event_time_basis="media-pts-ms";
    analysis::AnalysisEvent event;event.event_id="hook-event";event.event_type="intrusion";event.rule_id="hook-rule";event.track_id=1;
    event.start_time_ms=7000;event.update_time_ms=7100;event.end_time_ms=7100;
    analysis::DispatchEventRecords(result,{event});analysis::StopEventStorage();analysis::SetEventRecordingBridge({});
    const auto state=analysis::GetEventStorageSnapshot();
    // 프레임 없는 기존 hook은 실패가 아니라 marker를 쓴다. snapshot marker로 실제 호출을 대조한다.
    const bool ok=state.stored_count==1&&state.snapshot_hook_failed_count==0&&
        std::filesystem::is_regular_file(root/"snapshots/hook-event.snapshot.json")&&
        (managed?(state.clip_hook_failed_count==0&&bridge->fallback==0):(state.clip_hook_failed_count==1&&bridge->fallback==1));
    std::cout<<(ok?"[pass] ":"[fail] ")<<"E17 실제 EventStorage "<<(managed?"managed clip 억제":"기본 clip fallback 유지")<<" 및 snapshot hook 유지\n";
    std::cout<<"[detail] stored="<<state.stored_count<<" snapshot_failed="<<state.snapshot_hook_failed_count<<" clip_failed="<<state.clip_hook_failed_count<<" fallback="<<bridge->fallback<<'\n';
    std::cout<<"[summary] pass="<<(ok?1:0)<<" fail="<<(ok?0:1)<<'\n';return ok?0:1;
}
std::pair<int,int> AdapterCases(const std::filesystem::path& root,const recording::RecordingSegmentV2& sample,
    const recording::RecordingSourceBindingV1& binding,const recording::RecordingConsumerReferenceV1& reference) {
    Store store(root);int passed=0,failed=0;std::string error;
    const auto check=[&](bool ok,const std::string& name){std::cout<<(ok?"[pass] ":"[fail] ")<<name<<'\n';ok?++passed:++failed;};
    const auto add=[&](int index,std::int64_t shift,bool bound=true) {
        auto segment=sample;auto source=binding;
        segment.segment_id="adapter-source-"+std::to_string(index);segment.order_request_id="adapter-order-"+std::to_string(index);
        segment.media_start_pts+=shift;if(segment.media_end_pts)*segment.media_end_pts+=shift;
        segment.size_bytes=12;segment.checksum_sha256=std::string(64,'a');
        for(auto& mapping:segment.mappings) {
            mapping.start_pts+=shift;if(mapping.end_pts)*mapping.end_pts+=shift;
        }
        source.segment_id=segment.segment_id;
        for(auto& point:source.samples)point.pts_ns+=shift;
        recording::RecordingOrderReservationV1 order;
        if(!store.journal.ReserveRecordingOrder(segment.store_id,segment.order_request_id,segment.segment_id,segment.channel_id,&order,&error))throw std::runtime_error(error);
        segment.order_sequence=order.sequence;
        const auto path=root/segment.channel_id/(segment.segment_id+".mp4");std::filesystem::create_directories(path.parent_path());
        if(!recording::WriteContainedFileDurably(root,path,"0123456789ab",&error))throw std::runtime_error(error);
        if(bound?!store.catalog.FinalizeBoundSegmentV2(segment,source,path.string(),&error):!store.catalog.FinalizeSegmentV2(segment,path.string(),&error))throw std::runtime_error(error);
        return segment;
    };
    // 실제 미디어 생성 검사가 아닌 metadata adapter 경계 fixture이다.
    const auto relevant=add(0,0);
    for(int i=1;i<=260;++i)add(i,static_cast<std::int64_t>(i)*1000000000LL);
    auto request=reference;request.request->start_ms=7000;request.request->end_ms=7500;request.request->pre_ms=0;request.request->post_ms=0;
    std::vector<recording::RecordingDerivedSourceSnapshotEntry> snapshot;
    check(store.catalog.SnapshotDerivedSources(request,&snapshot,&error)&&snapshot.size()==1&&snapshot.front().segment.segment_id==relevant.segment_id,
        "E18 누적 261개 원본에서도 현재 반개구간 관련 1개만 조회");
    request.request->start_ms=8000;request.request->end_ms=8001;
    check(store.catalog.SnapshotDerivedSources(request,&snapshot,&error)&&snapshot.size()==1&&snapshot.front().segment.segment_id=="adapter-source-1",
        "E18 반개구간 끝 접점은 이전 원본과 비중첩");
    request.request->start_ms=7000;request.request->end_ms=7500;
    add(261,0,false);
    check(store.catalog.SnapshotDerivedSources(request,&snapshot,&error)&&snapshot.size()==2&&
        std::any_of(snapshot.begin(),snapshot.end(),[](const auto& entry){return !entry.binding;}),
        "E11 관련 missing binding은 누락하지 않고 snapshot에 보존");
    if(!store.catalog.MarkSegmentCorrupt(relevant.segment_id,"checksum-mismatch",&error))throw std::runtime_error(error);
    check(store.catalog.SnapshotDerivedSources(request,&snapshot,&error)&&
        std::any_of(snapshot.begin(),snapshot.end(),[](const auto& entry){return entry.lifecycle==recording::RecordingLifecycle::Corrupt;}),
        "E11 관련 corrupt lifecycle은 동일 snapshot에 보존");
    for(int i=262;i<=516;++i)add(i,0);
    check(!store.catalog.SnapshotDerivedSources(request,&snapshot,&error)&&snapshot.empty()&&error.find("cap exceeded")!=std::string::npos,
        "E18 실제 관련 257개는 명시 cap 실패·잘린 confirmed 목록 없음");
    return {passed,failed};
}
bool FinalizeUpdate(const std::filesystem::path& root,const Encoded& input,const analysis::AnalysisResult& actual) {
    Store store(root);std::string error;
    recording::GStreamerSegmentWriter::Options writer_options(root,1000);
    writer_options.managed_journal=&store.journal;writer_options.managed_catalog=&store.catalog;writer_options.managed_store_id="probe-store";
    recording::GStreamerSegmentWriter writer(writer_options);
    if(!writer.Start("probe-channel","unused",input.descriptor,[](auto,auto,auto*){return false;},&error))throw std::runtime_error(error);
    for(std::size_t i=0;i<11;++i)writer.Push(input.packets[i],0);
    const auto before=store.Segments().size();
    auto initial=std::make_shared<analysis::DecodedIntervalSnapshot>(*actual.decoded_intervals);
    initial->frames.erase(std::remove_if(initial->frames.begin(),initial->frames.end(),[](const auto& f){return f.analysis_pts_ns>=8000000000LL;}),initial->frames.end());
    auto result=actual;result.decoded_intervals=initial;
    std::atomic<bool> requested{false},finalized{false};
    std::thread producer([&] {
        const auto deadline=std::chrono::steady_clock::now()+std::chrono::seconds(2);
        while(!requested&&std::chrono::steady_clock::now()<deadline)std::this_thread::sleep_for(std::chrono::milliseconds(1));
        if(requested)for(std::size_t i=11;i<input.packets.size();++i)writer.Push(input.packets[i],0);
        writer.Stop();finalized=true;
    });
    struct ProducerJoin {std::thread& thread;~ProducerJoin(){if(thread.joinable())thread.join();}} producer_join{producer};
    recording::RetentionCoordinator retention(store.catalog,[&]{return store.catalog.RetentionSnapshot();},[](auto* bytes,auto*){*bytes=1024ULL*1024*1024;return true;},[](const auto&,auto*){return false;},{0,1,root});
    if(!retention.UpdateChannelPolicy("probe-channel",{1024ULL*1024*1024,0,1024ULL*1024*1024,0},&error))throw std::runtime_error(error);
    recording::DerivedJobService service(store.catalog,store.journal,{root,30000,{}});LegacyDeriver legacy;
    recording::CatalogEventRecordingBridge::Options options;options.use_consumer_references=true;options.derived_service=&service;
    options.resolve_recording_channel=[](const auto& source){return std::optional<std::string>(source);};
    options.derived_options.wait_ms=1500;options.derived_options.retry_ms=100;
    options.derived_options.latest_evidence=[&](const auto&) {
        requested=true;
        return recording::DerivedEventEvidenceUpdate{"probe-channel","probe-channel",finalized?actual.decoded_intervals:initial};
    };
    recording::CatalogEventRecordingBridge bridge(store.catalog,retention,legacy,options);
    analysis::EventRecord record;record.event_id="finalize-update-event";record.channel_id="probe-channel";record.stream_id="probe-channel";
    record.track_id=1;record.start_time_ms=7000;record.end_time_ms=8500;record.update_time_ms=8500;record.time_basis="media-pts-ms";
    analysis::EventMediaHookOptions hooks;hooks.pre_event_ms=0;hooks.post_event_ms=0;
    const auto accepted=bridge.TryResolve(result,record,hooks);
    recording::RecordingDerivedReferenceResult current;
    const auto deadline=std::chrono::steady_clock::now()+std::chrono::seconds(5);
    do {
        current=bridge.QueryReferenceResult(accepted.link_id);
        if(current.jobs.size()==1&&current.jobs.front().job.state==recording::DerivedJobState::Complete)break;
        std::this_thread::sleep_for(std::chrono::milliseconds(10));
    }while(std::chrono::steady_clock::now()<deadline);
    bridge.StopAndDrain();producer.join();
    const bool ok=before==1&&requested&&finalized&&store.Segments().size()==3&&current.jobs.size()==1&&
        current.jobs.front().job.ready&&current.jobs.front().job.ready->request_fully_satisfied&&current.jobs.front().outputs.size()==2;
    std::cout<<(ok?"[pass] ":"[fail] ")<<"E04 실제 writer 후행 finalize와 같은 요청 증거 갱신으로 2출력 완료\n";
    std::cout<<"[detail] finalized_before="<<before<<" finalized_after="<<store.Segments().size()<<" provider_requested="<<requested<<'\n';
    return ok;
}
std::pair<int,int> AcceptedReplay(const std::filesystem::path& root,const recording::RecordingConsumerReferenceV1& reference) {
    int passed=0,failed=0;std::string error;
    const auto check=[&](bool ok,const std::string& name){std::cout<<(ok?"[pass] ":"[fail] ")<<name<<'\n';ok?++passed:++failed;};
    const auto canonical=recording::SerializeRecordingConsumerReferenceV1(reference);
    {
        Store store(root);
        if(!store.catalog.PutConsumerReference(reference,&error)||!store.catalog.AcceptDerivedReference(reference,&error))throw std::runtime_error(error);
        const auto count=store.journal.Replay().mutations.size();
        bool accepted=false;
        check(store.catalog.AcceptDerivedReference(reference,&error)&&store.journal.Replay().mutations.size()==count&&
            store.catalog.IsDerivedReferenceAccepted(reference.reference_id,&accepted,&error)&&accepted,
            "E20 canonical accepted 중복은 원장 mutation 추가 없이 멱등");
        auto conflict=reference;conflict.request->end_ms+=1;
        check(!store.catalog.AcceptDerivedReference(conflict,&error),"E20 동일 reference ID 다른 immutable 내용의 accepted 거부");
        sqlite3* db=nullptr;sqlite3_stmt* statement=nullptr;std::string payload;
        if(sqlite3_open_v2((root/"recording-catalog.sqlite3").c_str(),&db,SQLITE_OPEN_READONLY,nullptr)==SQLITE_OK&&
           sqlite3_prepare_v2(db,"SELECT payload_json FROM recording_derived_accepted_references",-1,&statement,nullptr)==SQLITE_OK&&
           sqlite3_step(statement)==SQLITE_ROW)payload=reinterpret_cast<const char*>(sqlite3_column_text(statement,0));
        if(statement)sqlite3_finalize(statement);if(db)sqlite3_close(db);
        check(payload==canonical,"E20 SQLite accepted projection의 exact reference 일치");
        check(store.catalog.Checkpoint(&error),"E20 accepted marker checkpoint projection 일치");
    }
    for(bool sql:{false,true}) {
        recording::RecordingJournal journal(recording::RecordingJournal::ManagedOptions{root,"probe-store"});
        if(!journal.Open(&error))throw std::runtime_error(error);
        auto options=Store::Options(root);options.prefer_sqlite=sql;
        recording::RecordingCatalog catalog(journal,options);
        if(!catalog.Open(&error))throw std::runtime_error(error);
        recording::RecordingDerivedReferenceResult current;
        check(catalog.QueryDerivedReferenceResult(reference.reference_id,&current,&error)&&current.managed&&current.jobs.empty()&&
            current.state=="unknown"&&current.reason=="evidence-not-durable",
            std::string("E15/E20 재시작 ")+(sql?"SQLite rebuild":"JSONL fallback")+" accepted/no-job은 증거 발명 없이 managed unknown");
    }
    for(int mode=0;mode<4;++mode) {
        const auto path=root/("invalid-replay-"+std::to_string(mode));std::filesystem::create_directories(path);
        recording::RecordingJournal journal(path/"journal.jsonl");
        if(!journal.Open(&error))throw std::runtime_error(error);
        recording::RecordingMutationV1 mutation;mutation.mutation_id="reference-put";mutation.entity_id=reference.reference_id;
        mutation.mutation_type=recording::RecordingMutationType::ConsumerReferencePut;mutation.occurred_at_ms=1;
        mutation.payload_json="{\"reference\":"+canonical+"}";
        if(mode!=0&&!journal.Append(mutation,&error))throw std::runtime_error(error);
        mutation.mutation_id="reference-accepted";mutation.mutation_type=recording::RecordingMutationType::DerivedReferenceAccepted;
        if(mode==1)mutation.payload_json="{\"reference\":"+canonical+",\"unknown\":true}";
        if(mode==2) {auto other=reference;other.request->end_ms+=1;mutation.payload_json="{\"reference\":"+recording::SerializeRecordingConsumerReferenceV1(other)+"}";}
        if(mode==3)mutation.payload_json="{}";
        if(!journal.Append(mutation,&error))throw std::runtime_error(error);
        recording::RecordingCatalog::Options options(path/"catalog.sqlite3",path,false);options.enable_v2_storage=true;
        recording::RecordingCatalog catalog(journal,options);
        check(!catalog.Open(&error),"E20 replay accepted "+std::string(mode==0?"선행 참조 없음":mode==1?"unknown 필드":mode==2?"canonical 충돌":"불완전 payload")+" 거부");
    }
    return {passed,failed};
}
std::pair<int,int> UtcIntegration(Store& original,const std::filesystem::path& root,const analysis::AnalysisResult& actual) {
    Store store(root);int passed=0,failed=0;std::string error;
    const auto check=[&](bool ok,const std::string& name){std::cout<<(ok?"[pass] ":"[fail] ")<<name<<'\n';ok?++passed:++failed;};
    const auto base=original.Segments().front();const auto binding=*original.catalog.FindSourceBinding(base.segment_id);
    const auto add=[&](const std::string& id,bool unknown) {
        auto segment=base;auto source=binding;segment.segment_id=id;source.segment_id=id;segment.order_request_id=id+"-order";
        segment.mappings={{"media-server.recording-utc-mapping.v1",id+"-map",segment.media_start_pts,segment.media_end_pts,
            unknown?"unknown":"server-observation",unknown?std::nullopt:std::optional<std::int64_t>(100000000000LL),
            unknown?std::nullopt:std::optional<std::int64_t>(101000000000LL),unknown?std::nullopt:std::optional<std::int64_t>(0),
            unknown?"fixture-unplaced":"fixture-explicit-utc-mapping"}};
        recording::RecordingOrderReservationV1 order;
        if(!store.journal.ReserveRecordingOrder(segment.store_id,segment.order_request_id,id,segment.channel_id,&order,&error))throw std::runtime_error(error);
        segment.order_sequence=order.sequence;
        const auto path=root/segment.channel_id/(id+".mp4");std::filesystem::create_directories(path.parent_path());
        const auto location=original.catalog.FindSegmentMediaLocation(base.segment_id);
        if(!location||location->first!=original.root)throw std::runtime_error("UTC fixture V2 source location 불일치");
        std::filesystem::copy_file(location->first/location->second,path);
        if(!store.catalog.FinalizeBoundSegmentV2(segment,source,path.string(),&error))throw std::runtime_error(error);
        return segment;
    };
    const auto a=add("utc-source-a",false);
    recording::RetentionCoordinator retention(store.catalog,[&]{return store.catalog.RetentionSnapshot();},[](auto* bytes,auto*){*bytes=1024ULL*1024*1024;return true;},[](const auto&,auto*){return false;},{0,1,root});
    if(!retention.UpdateChannelPolicy("probe-channel",{1024ULL*1024*1024,0,1024ULL*1024*1024,0},&error))throw std::runtime_error(error);
    recording::DerivedJobService service(store.catalog,store.journal,{root,30000,{}});LegacyDeriver legacy;
    recording::CatalogEventRecordingBridge::Options options;options.use_consumer_references=true;options.derived_service=&service;
    options.resolve_recording_channel=[](const auto& source){return std::optional<std::string>(source);};options.derived_options.wait_ms=0;
    recording::CatalogEventRecordingBridge bridge(store.catalog,retention,legacy,options);
    analysis::EventRecord record;record.event_id="utc-event";record.channel_id="probe-channel";record.stream_id="probe-channel";
    record.track_id=1;record.start_time_ms=100000;record.end_time_ms=100500;record.update_time_ms=100500;record.time_basis="utc-ms";
    analysis::EventMediaHookOptions hooks;hooks.pre_event_ms=0;hooks.post_event_ms=0;
    const auto accepted=bridge.TryResolve(actual,record,hooks);recording::RecordingDerivedReferenceResult current;
    const auto deadline=std::chrono::steady_clock::now()+std::chrono::seconds(5);
    do {
        current=bridge.QueryReferenceResult(accepted.link_id);
        if(current.jobs.size()==1&&current.jobs[0].job.state==recording::DerivedJobState::Complete)break;
        std::this_thread::sleep_for(std::chrono::milliseconds(10));
    }while(std::chrono::steady_clock::now()<deadline);
    check(current.jobs.size()==1&&current.jobs[0].job.ready&&current.jobs[0].job.ready->request_fully_satisfied&&
        current.jobs[0].outputs.size()==1&&DecodeOutput(root/current.jobs[0].outputs[0].relative_path)&&
        current.jobs[0].job.ready->outputs[0].segment.mappings[0].provenance=="unknown",
        "E08 동일 원본 snapshot의 명시 UTC 요청→실제 출력·독립 output UTC unknown");
    bridge.StopAndDrain();
    const auto references=store.catalog.QueryConsumerReferences("probe-channel","event",record.event_id);
    if(references.size()!=1)throw std::runtime_error("utc fixture reference 없음");
    const auto select=[&](recording::DerivedRecordingSelection* selected) {
        std::vector<recording::RecordingDerivedSourceSnapshotEntry> entries;
        if(!store.catalog.SnapshotDerivedSources(references[0],&entries,&error))return false;
        recording::RecordingLocationCatalogSnapshot locations;std::vector<recording::DerivedSourceEvidence> sources;
        for(const auto& entry:entries) {
            locations.segments.push_back(entry.segment);auto bound=entry.binding;
            const bool available=(entry.lifecycle==recording::RecordingLifecycle::Finalized||entry.deleted)&&bound&&
                recording::ValidateRecordingSourceBindingForSegment(*bound,entry.segment,nullptr);
            sources.push_back({entry.segment,bound,entry.deleted,available});
        }
        recording::RecordingRangeResult range;
        return recording::ResolveUtcRangeFromSnapshot(locations,100000000000LL,100500000000LL,&range,&error,4096)&&
            recording::SelectDerivedRecording(references[0],*actual.decoded_intervals,sources,&range,selected,&error);
    };
    const auto b=add("utc-source-b",false);recording::DerivedRecordingSelection selection;
    check(select(&selection)&&!selection.complete&&selection.slices[0].state==recording::DerivedSliceState::Ambiguous&&
        selection.slices[0].candidates.size()==2,"E08 같은 UTC의 복수 원본 후보를 자동 단일 선택하지 않음");
    if(!store.catalog.MarkSegmentCorrupt(a.segment_id,"checksum-mismatch",&error))throw std::runtime_error(error);
    check(select(&selection)&&!selection.complete&&selection.slices[0].state==recording::DerivedSliceState::Unknown,
        "E11 UTC confirmed mapping 하나가 보여도 관련 corrupt 원본을 숨기지 않음");
    {
        recording::CatalogEventRecordingBridge unhealthy(store.catalog,retention,legacy,options);
        record.event_id="utc-corrupt-event";const auto rejected=unhealthy.TryResolve(actual,record,hooks);
        recording::RecordingDerivedReferenceResult state;
        const auto until=std::chrono::steady_clock::now()+std::chrono::seconds(2);
        do {state=unhealthy.QueryReferenceResult(rejected.link_id);if(state.state!="pending")break;
            std::this_thread::sleep_for(std::chrono::milliseconds(10));}while(std::chrono::steady_clock::now()<until);
        check(state.managed&&state.jobs.empty()&&state.state=="unknown",
            "E11 실제 UTC worker도 same-lock corrupt 원본을 available로 승격하지 않음");
        unhealthy.StopAndDrain();
    }
    add("utc-unplaced",true);
    check(select(&selection)&&!selection.complete&&!selection.unplaced.empty(),"E08 UTC unplaced를 원본 snapshot/선택에 보존");
    recording::RecordingLocationCatalogSnapshot raw;raw.segments={a,b};recording::RecordingRangeResult limited;
    check(!recording::ResolveUtcRangeFromSnapshot(raw,100000000000LL,100500000000LL,&limited,&error,1)&&limited.slices.empty(),
        "E18 opt-in UTC 후보 예산 초과는 부분 confirmed 결과 없이 실패");
    if(!store.catalog.RequestDeletion(b.segment_id,"continuous-capacity",&error))throw std::runtime_error(error);
    std::vector<recording::RecordingDerivedSourceSnapshotEntry> entries;
    check(store.catalog.SnapshotDerivedSources(references[0],&entries,&error)&&std::any_of(entries.begin(),entries.end(),[&](const auto& entry){
        return entry.segment.segment_id==b.segment_id&&entry.lifecycle==recording::RecordingLifecycle::DeletionPending;
    }),"E11 삭제 대기 lifecycle도 원본 snapshot에서 누락하지 않음");
    return {passed,failed};
}
std::pair<int,int> ExtendedEvents(Store& store,recording::RetentionCoordinator& retention,
    LegacyDeriver& legacy,recording::CatalogEventRecordingBridge::Options options,
    const analysis::AnalysisResult& actual,std::atomic<bool>& disk_available) {
    int passed=0,failed=0;
    const auto check=[&](bool ok,const std::string& name) {
        std::cout<<(ok?"[pass] ":"[fail] ")<<name<<'\n';ok?++passed:++failed;
    };
    auto record=[](const std::string& id,std::int64_t start,std::int64_t end) {
        analysis::EventRecord value;value.event_id=id;value.channel_id="probe-channel";value.stream_id="probe-channel";
        value.track_id=1;value.start_time_ms=start;value.end_time_ms=end;value.update_time_ms=end;value.time_basis="media-pts-ms";
        return value;
    };
    analysis::EventMediaHookOptions hooks;hooks.pre_event_ms=0;hooks.post_event_ms=0;
    const auto await=[&](recording::CatalogEventRecordingBridge& bridge,const std::string& id) {
        recording::RecordingDerivedReferenceResult current;
        const auto deadline=std::chrono::steady_clock::now()+std::chrono::seconds(5);
        do {
            current=bridge.QueryReferenceResult(id);
            if(current.state!="pending"&&(!current.jobs.empty()||current.reason!="evidence-not-durable")) {
                if(current.jobs.empty()||std::all_of(current.jobs.begin(),current.jobs.end(),[](const auto& j){
                    return j.job.state==recording::DerivedJobState::Complete||j.job.state==recording::DerivedJobState::Failed;
                }))break;
            }
            std::this_thread::sleep_for(std::chrono::milliseconds(10));
        }while(std::chrono::steady_clock::now()<deadline);
        return current;
    };
    options.derived_options.wait_ms=0;
    {
        recording::CatalogEventRecordingBridge bridge(store.catalog,retention,legacy,options);
        const auto accepted=bridge.TryResolve(actual,record("single-output",7100,7500),hooks);
        const auto current=await(bridge,accepted.link_id);
        const bool single=accepted.derived_job_managed&&!accepted.derived_clip_ready&&accepted.clip_path.empty()&&
            current.jobs.size()==1&&current.jobs[0].job.state==recording::DerivedJobState::Complete&&
            current.jobs[0].job.ready->request_fully_satisfied&&current.jobs[0].outputs.size()==1&&
            DecodeOutput(store.root/current.jobs[0].outputs[0].relative_path);
        check(single,"E02 단일 출력도 clip_path 승격 없이 목록·직접 decode·fully satisfied");
        const auto again=bridge.TryResolve(actual,record("single-output",7100,7500),hooks);
        const auto repeated=await(bridge,again.link_id);
        check(repeated.jobs.size()==1&&current.jobs.size()==1&&
            repeated.jobs[0].job.intent.job_id==current.jobs[0].job.intent.job_id,"E09 동일 reference/선택 재요청 job ID 멱등");
        const auto partial=bridge.TryResolve(actual,record("partial-output",6500,7500),hooks);
        const auto partial_result=await(bridge,partial.link_id);
        check(partial.derived_job_managed&&partial_result.jobs.size()==1&&partial_result.jobs[0].job.ready&&
            partial_result.jobs[0].job.ready->verified_output&&!partial_result.jobs[0].job.ready->request_fully_satisfied&&
            !partial_result.jobs[0].job.ready->unfulfilled.empty(),"E03 미확인 pre 구간을 유지한 verified partial 출력");
        auto expanded_hooks=hooks;expanded_hooks.pre_event_ms=100;expanded_hooks.post_event_ms=100;
        const auto expanded=bridge.TryResolve(actual,record("immutable-expanded",7200,7300),expanded_hooks);
        const auto expanded_result=await(bridge,expanded.link_id);
        const auto ref=store.catalog.QueryConsumerReferences("probe-channel","event","immutable-expanded");
        check(expanded_result.jobs.size()==1&&ref.size()==1&&ref[0].request->start_ms==7200&&ref[0].request->end_ms==7300&&
            ref[0].request->pre_ms==100&&ref[0].request->post_ms==100&&ref[0].analysis_namespace==actual.observation_namespace,
            "E07 immutable start/end/pre/post/namespace 보존");
        std::vector<recording::RecordingDerivedSourceSnapshotEntry> sources;
        std::string error;
        check(ref.size()==1&&store.catalog.SnapshotDerivedSources(ref[0],&sources,&error)&&!sources.empty()&&
            std::all_of(sources.begin(),sources.end(),[](const auto& s){return s.segment.retention_class==recording::RecordingRetentionClass::Continuous;}),
            "E10 Event 출력이 누적되어도 원본 snapshot은 continuous만");
        bridge.StopAndDrain();
    }
    analysis::AnalysisResult empty=actual;
    auto absent=std::make_shared<analysis::DecodedIntervalSnapshot>(*actual.decoded_intervals);absent->frames.clear();empty.decoded_intervals=absent;
    {
        options.derived_options.wait_ms=200;options.derived_options.max_attempts=3;options.derived_options.retry_ms=10;
        std::atomic<int> calls{0};
        options.derived_options.latest_evidence=[&](const auto&){++calls;return recording::DerivedEventEvidenceUpdate{"probe-channel","probe-channel",actual.decoded_intervals};};
        recording::CatalogEventRecordingBridge bridge(store.catalog,retention,legacy,options);
        const auto accepted=bridge.TryResolve(empty,record("postroll-update",7000,7500),hooks);
        const auto current=await(bridge,accepted.link_id);
        check(calls>0&&current.jobs.size()==1&&current.jobs[0].job.ready&&current.jobs[0].job.ready->request_fully_satisfied,
            "E04 provider의 동일 실제 decoder 증거 업데이트로 postroll 요청 충족");
        bridge.StopAndDrain();
    }
    {
        options.derived_options.latest_evidence={};options.derived_options.max_attempts=2;
        recording::CatalogEventRecordingBridge bridge(store.catalog,retention,legacy,options);
        const auto accepted=bridge.TryResolve(empty,record("wait-timeout",7000,7500),hooks);
        const auto current=await(bridge,accepted.link_id);
        check(accepted.derived_job_managed&&current.managed&&current.jobs.empty()&&current.state=="unknown"&&
            current.reason.find("wait-exhausted")!=std::string::npos,"E05 시간 경과만으로 coverage 없이 unknown 종료");
        bridge.StopAndDrain();
    }
    {
        auto wrong=std::make_shared<analysis::DecodedIntervalSnapshot>(*actual.decoded_intervals);wrong->analysis_namespace="other-generation-r0";
        options.derived_options.latest_evidence=[&](const auto&){return recording::DerivedEventEvidenceUpdate{"probe-channel","probe-channel",wrong};};
        recording::CatalogEventRecordingBridge bridge(store.catalog,retention,legacy,options);
        const auto accepted=bridge.TryResolve(empty,record("namespace-reset",7000,7500),hooks);
        const auto current=await(bridge,accepted.link_id);
        check(current.managed&&current.jobs.empty()&&current.reason=="derived-evidence-provider-identity-mismatch",
            "E06 provider namespace 변경을 새 증거로 혼합하지 않음");
        bridge.StopAndDrain();
    }
    {
        options.derived_options.latest_evidence={};options.derived_options.wait_ms=0;
        recording::CatalogEventRecordingBridge bridge(store.catalog,retention,legacy,options);
        auto limited=actual;
        auto intervals=std::make_shared<analysis::DecodedIntervalSnapshot>(*actual.decoded_intervals);
        intervals->frames.erase(std::remove_if(intervals->frames.begin(),intervals->frames.end(),[](const auto& f){return f.analysis_pts_ns>=7500000000LL;}),intervals->frames.end());
        limited.decoded_intervals=intervals;
        const auto event=record("selection-refresh",7000,8000);
        const auto first=bridge.TryResolve(limited,event,hooks);const auto partial=await(bridge,first.link_id);
        const auto second=bridge.TryResolve(actual,event,hooks);const auto updated=await(bridge,second.link_id);
        bool partial_found=false,full_found=false;
        for(const auto& job:updated.jobs)if(job.job.ready) {partial_found|=!job.job.ready->request_fully_satisfied;full_found|=job.job.ready->request_fully_satisfied;}
        check(first.link_id==second.link_id&&partial.jobs.size()==1&&updated.jobs.size()==2&&partial_found&&full_found,
            "E09 같은 immutable reference의 증거/선택 갱신은 새 job·이전 partial 보존");
        auto oversized=actual;auto too_many=std::make_shared<analysis::DecodedIntervalSnapshot>(*actual.decoded_intervals);
        too_many->frames.resize(4097,too_many->frames.front());oversized.decoded_intervals=too_many;
        const auto rejected=bridge.TryResolve(oversized,record("evidence-overflow",7000,7500),hooks);
        check(!rejected.derived_job_managed&&rejected.error=="derived-evidence-identity-mismatch",
            "E18 4097 frame 증거는 queue 접수 전 명시 거부");
        bridge.StopAndDrain();
    }
    {
        options.derived_options.wait_ms=100;options.derived_options.max_attempts=2;
        for(int mode=0;mode<5;++mode) {
            auto changed=std::make_shared<analysis::DecodedIntervalSnapshot>(*actual.decoded_intervals);
            if(mode==0)for(auto& frame:changed->frames)if(frame.association.original)frame.association.original->source_generation="different-generation";
            if(mode==3)for(auto& frame:changed->frames)if(frame.association.original)frame.association.original->track_id="different-track";
            options.derived_options.latest_evidence=[&,mode,changed](const auto&) -> recording::DerivedEventEvidenceUpdate {
                if(mode==2)throw std::runtime_error("fixture provider exception");
                return {mode==1?"other-source":"probe-channel",mode==4?"other-channel":"probe-channel",changed};
            };
            recording::CatalogEventRecordingBridge bridge(store.catalog,retention,legacy,options);
            const auto accepted=bridge.TryResolve(empty,record("provider-invalid-"+std::to_string(mode),7000,7500),hooks);
            const auto current=await(bridge,accepted.link_id);
            check(current.managed&&current.jobs.empty()&&current.state=="unknown"&&
                current.reason==(mode==2?"derived-evidence-provider-exception":"derived-evidence-provider-identity-mismatch"),
                "E06/E18 provider "+std::string(mode==0?"generation 변경":mode==1?"source 불일치":mode==2?"예외":mode==3?"track 불일치":"channel 불일치")+"는 unknown 종료");
            bridge.StopAndDrain();
        }
    }
    {
        options.derived_options.latest_evidence={};options.derived_options.wait_ms=0;
        std::string error;
        if(!retention.UpdateChannelPolicy("probe-channel",{1024ULL*1024*1024,0,1,0},&error))throw std::runtime_error(error);
        recording::CatalogEventRecordingBridge bridge(store.catalog,retention,legacy,options);
        const auto accepted=bridge.TryResolve(actual,record("quota-rejected",7000,7500),hooks);
        const auto current=await(bridge,accepted.link_id);
        check(current.managed&&current.jobs.empty()&&current.reason.find("derived-admission-rejected:")==0&&
            store.catalog.RetentionSnapshot().durable_reservations.empty(),"E12 event quota 부족은 Intent/파일/내구 예약 없이 명시 거부");
        bridge.StopAndDrain();
        if(!retention.UpdateChannelPolicy("probe-channel",{1024ULL*1024*1024,0,1024ULL*1024*1024,0},&error))throw std::runtime_error(error);
    }
    {
        disk_available=false;
        recording::CatalogEventRecordingBridge bridge(store.catalog,retention,legacy,options);
        const auto accepted=bridge.TryResolve(actual,record("disk-provider-rejected",7000,7500),hooks);
        const auto current=await(bridge,accepted.link_id);
        check(current.managed&&current.jobs.empty()&&current.reason.find("derived-admission-rejected:")==0&&
            store.catalog.RetentionSnapshot().durable_reservations.empty(),"E12 disk provider 실패를 가용량 0 성공으로 숨기지 않고 Intent 없이 거부");
        bridge.StopAndDrain();disk_available=true;
    }
    return {passed,failed};
}
int DiagnosticMode(const std::filesystem::path& root,bool no_crypto){
    gst_init(nullptr,nullptr);int passed=0,failed=0;const auto check=[&](bool ok,const char* name){std::cout<<(ok?"[pass] ":"[fail] ")<<name<<'\n';ok?++passed:++failed;};
    try{
        recording::RecordingConsumerReferenceV1 ref;ref.reference_id="diagnostic-ref-canary";ref.kind="event";ref.owner_id="diagnostic-owner";ref.source_id="probe-channel";ref.channel_id="probe-channel";ref.analysis_namespace="diagnostic-namespace";ref.analysis_track_id="track-1";ref.association_quality="timestamp-match";ref.original=recording::RecordingConsumerOriginalV1{"probe-generation-a",1,1,"video-0",7000000000ULL};ref.request=recording::RecordingConsumerRequestV1{"media-pts-ms",7000,7500,0,0};
        if(no_crypto){bool rejected=false;try{recording::SerializeDerivedEventAttemptDiagnostic(ref,{});}catch(...){rejected=true;}check(rejected,"LP09-W08 no-OpenSSL formatter fails closed");return failed?1:0;}
        Store store(root);auto input=Encode(30,false,false);Shift(input,7000000000ULL);recording::GStreamerSegmentWriter::Options writer_options(store.root,1000);writer_options.managed_journal=&store.journal;writer_options.managed_catalog=&store.catalog;writer_options.managed_store_id="probe-store";recording::GStreamerSegmentWriter writer(writer_options);std::string error;
        if(!writer.Start("probe-channel","unused",input.descriptor,[](auto,auto,auto*){return false;},&error))throw std::runtime_error("diagnostic-writer");for(const auto& p:input.packets)writer.Push(p,0);writer.Stop();
        analysis::DecodedIntervalCollector collector;for(const auto& p:input.packets){analysis::DecodedIntervalEvidence e;e.analysis_pts_ns=p.pts;e.duration_ns=p.observation->duration_ns;e.association={analysis::SourceAssociationQuality::TimestampMatch,analysis::OriginalSampleIdentity{p.observation->source_generation,p.observation->generation_order,p.observation->ordinal,p.track_id,*p.observation->pts_ns}};collector.Append(std::move(e));}const auto full=collector.Snapshot(ref.analysis_namespace);auto empty=std::make_shared<analysis::DecodedIntervalSnapshot>(*full);empty->frames.clear();
        recording::RetentionCoordinator retention(store.catalog,[&]{return store.catalog.RetentionSnapshot();},[](auto* bytes,auto*){*bytes=1024ULL*1024*1024;return true;},[](const auto&,auto*){return false;},{0,1,store.root});if(!retention.UpdateChannelPolicy("probe-channel",{1024ULL*1024*1024,0,1024ULL*1024*1024,0},&error))throw std::runtime_error("diagnostic-policy");std::function<void(recording::DerivedJobProgress,std::size_t)> progress;recording::DerivedJobService service(store.catalog,store.journal,{store.root,30000,[&](auto stage,auto index){if(progress)progress(stage,index);}});
        std::size_t sequence=0;const auto run=[&](recording::DerivedEventWorkerOptions options,std::shared_ptr<const analysis::DecodedIntervalSnapshot> evidence,recording::DerivedEventWorker** published=nullptr){auto reference=ref;reference.reference_id="diagnostic-ref-"+std::to_string(++sequence);if(!store.catalog.PutConsumerReference(reference,&error))throw std::runtime_error("diagnostic-reference");recording::DerivedEventWorker worker(store.catalog,retention,service,std::move(options));if(published)*published=&worker;if(!worker.Submit(reference,std::move(evidence),&error))throw std::runtime_error("diagnostic-submit");recording::RecordingDerivedReferenceResult current;const auto deadline=std::chrono::steady_clock::now()+std::chrono::seconds(5);do{current=worker.Query(reference.reference_id);if(current.state!="pending")break;std::this_thread::sleep_for(std::chrono::milliseconds(5));}while(std::chrono::steady_clock::now()<deadline);worker.StopAndDrain();if(published)*published=nullptr;return current;};
        recording::DerivedEventWorkerOptions options;options.wait_ms=200;options.max_attempts=2;options.retry_ms=10;
        const auto absent=run(options,empty);check(absent.jobs.empty()&&absent.state=="unknown","LP09-W01 disabled diagnostic preserves wait-exhausted result");
        std::vector<recording::DerivedEventAttemptDiagnostic> attempts;bool reentered=false;recording::DerivedEventWorker* live=nullptr;
        options.diagnostic=[&](const auto& reference,const auto& value){attempts.push_back(value);const auto queried=live->Query(reference.reference_id);std::vector<recording::RecordingDerivedSourceSnapshotEntry> s;reentered=queried.managed&&store.catalog.SnapshotDerivedSources(reference,&s,&error);};
        std::size_t provider_calls=0;options.latest_evidence=[&](const auto&){return recording::DerivedEventEvidenceUpdate{"probe-channel","probe-channel",++provider_calls==1?empty:full};};const auto updated=run(options,empty,&live);
        check(attempts.size()==2&&attempts[0].attempt==1&&attempts[1].attempt==2&&!attempts[0].selection_complete&&attempts[1].selection_complete&&attempts[1].attempt_exhausted&&!attempts[0].deadline_exhausted&&attempts[1].elapsed_ms>=attempts[0].elapsed_ms&&attempts[1].wait_ms==200&&attempts[1].attempt_limit==2&&!attempts[1].sources.empty()&&attempts[1].sources[0].binding_valid&&attempts[1].sources[0].available_for_selection&&updated.jobs.size()==1,"LP09-W02 same decision snapshots and attempt timing");
        check(reentered,"LP09-W03 callback can query worker and catalog without held locks");
        options.latest_evidence={};std::size_t thrown_callbacks=0;options.diagnostic=[&](const auto&,const auto&){++thrown_callbacks;throw std::runtime_error("private-canary");};const auto thrown=run(options,empty);check(thrown_callbacks==2&&thrown.jobs.empty()&&thrown.state==absent.state&&thrown.reason==absent.reason,"LP09-W04 callback exception preserves terminal policy");
        options.wait_ms=0;attempts.clear();options.diagnostic=[&](const auto&,const auto& value){attempts.push_back(value);};const auto immediate=run(options,empty);check(attempts.size()==1&&attempts[0].deadline_exhausted&&!attempts[0].attempt_exhausted&&immediate.jobs.empty(),"LP09-W07 deadline exhaustion remains immediate and distinct");
        auto prefix=std::make_shared<analysis::DecodedIntervalSnapshot>(*full);prefix->frames.resize(2);attempts.clear();const auto partial=run(options,prefix);check(partial.jobs.size()==1&&partial.jobs[0].job.ready&&!partial.jobs[0].job.ready->request_fully_satisfied&&!attempts.empty()&&!attempts[0].selection_complete,"LP09-W07 confirmed prefix remains immutable partial");
        std::vector<recording::RecordingDerivedSourceSnapshotEntry> snapshot;if(!store.catalog.SnapshotDerivedSources(ref,&snapshot,&error)||snapshot.empty())throw std::runtime_error("diagnostic-snapshot");std::vector<recording::DerivedSourceEvidence> sources;std::vector<bool> valid;for(const auto& s:snapshot){sources.push_back({s.segment,s.binding,s.deleted,true});valid.push_back(true);}recording::DerivedRecordingSelection selection;selection.reference=ref;selection.expanded_start_ns=7000000000LL;selection.expanded_end_ns=7500000000LL;
        auto bad=*full;bad.frames.assign(6,full->frames.front());bad.frames[0].association.quality=analysis::SourceAssociationQuality::Nearest;bad.frames[1].association.original.reset();bad.frames[2].association.original->source_generation="different";bad.frames[3].association.original->pts_ns++;bad.frames[4].duration_ns.reset();auto summary=recording::BuildDerivedEventAttemptDiagnostic(snapshot,sources,valid,bad,selection);
        check(summary.decoded.namespace_valid&&summary.decoded.relevant_count==6&&summary.decoded.identity_rejected==2&&summary.decoded.generation_mismatch==1&&summary.decoded.pts_mismatch==1&&summary.decoded.identity_matched==2&&summary.decoded.duration_invalid==1,"LP09-W05 decoded identity and duration rejection categories");
        bad.analysis_namespace="different";summary=recording::BuildDerivedEventAttemptDiagnostic(snapshot,sources,valid,bad,selection);check(!summary.decoded.namespace_valid,"LP09-W05 namespace mismatch remains visible");
        auto utc=selection;utc.reference.request->time_basis="utc-ms";summary=recording::BuildDerivedEventAttemptDiagnostic(snapshot,sources,valid,*full,utc);check(!summary.decoded.range_comparable&&summary.decoded.relevant_count==0&&!summary.decoded.minimum_pts_ns&&!summary.decoded.maximum_valid_end_ns,"LP09-W05 UTC has no invented decoded coordinate comparison");
        snapshot.resize(257,snapshot.front());sources.resize(257,sources.front());valid.resize(257,true);bad=*full;bad.frames.assign(4097,full->frames.front());for(int i=0;i<10;++i)selection.slices.push_back({7000000000LL+i,7000000001LL+i,recording::DerivedSliceState::Unknown,{},"unconfirmed-interval-no-trusted-watermark"});summary=recording::BuildDerivedEventAttemptDiagnostic(snapshot,sources,valid,bad,selection);
        check(summary.source_count==257&&summary.sources.size()==256&&summary.sources_truncated&&summary.decoded.frame_count==4097&&summary.decoded.frames_truncated&&summary.decoded.relevant_count==4096&&summary.unknown_count==10&&summary.unknown_ranges.size()==8&&summary.unknown_truncated,"LP09-W06 value-only summaries bound sources frames and unknown ranges");
        selection.slices[0].reason="private-canary /private/path";summary=recording::BuildDerivedEventAttemptDiagnostic(snapshot,sources,valid,bad,selection);if(!summary.sources.empty())summary.sources[0].segment_id="private-canary /private/path";const auto json=recording::SerializeDerivedEventAttemptDiagnostic(ref,summary);
        check(json.find("private-canary")==std::string::npos&&json.find("/private/")==std::string::npos&&json.find("\"reference_sha256\":\"")!=std::string::npos&&json.find("\"reason\":9")!=std::string::npos&&json.size()<=256*1024,"LP09-W08 formatter hashes identifiers and fixes reason enums");
        bool over=false;summary.sources.resize(257);try{recording::SerializeDerivedEventAttemptDiagnostic(ref,summary);}catch(...){over=true;}check(over,"LP09-W08 formatter refuses oversized source vector");
        auto absent_reference=ref;absent_reference.reference_id.clear();bool empty_rejected=false;try{recording::SerializeDerivedEventAttemptDiagnostic(absent_reference,{});}catch(...){empty_rejected=true;}check(empty_rejected,"LP09-W08 formatter refuses absent reference identity");
        gchar* expected=g_compute_checksum_for_string(G_CHECKSUM_SHA256,ref.reference_id.c_str(),-1);const bool exact_digest=json.find(std::string("\"reference_sha256\":\"")+expected+'"')!=std::string::npos;g_free(expected);check(exact_digest,"LP09-W08 reference hash agrees with independent digest provider");
        for(const std::string mode:{"throw","null","namespace","generation","track","4097","source","channel"}){
            recording::DerivedEventWorkerOptions first;first.wait_ms=0;std::size_t calls=0;auto changed=std::make_shared<analysis::DecodedIntervalSnapshot>(*full);
            if(mode=="namespace")changed->analysis_namespace="other";if(mode=="generation")changed->frames[0].association.original->source_generation="other";if(mode=="track")changed->frames[0].association.original->track_id="other";if(mode=="4097")changed->frames.resize(4097,changed->frames.front());
            first.latest_evidence=[&](const auto&)->recording::DerivedEventEvidenceUpdate{++calls;if(mode=="throw")throw std::runtime_error("private-provider-error");return {mode=="source"?"other":"probe-channel",mode=="channel"?"other":"probe-channel",mode=="null"?nullptr:changed};};
            const auto rejected=run(first,full);const bool ok=calls==1&&rejected.jobs.empty()&&rejected.state=="unknown"&&rejected.reason==(mode=="throw"?"derived-evidence-provider-exception":"derived-evidence-provider-identity-mismatch");const auto title="LP09-Q02 first evaluation provider "+mode+" preserves strict rejection";check(ok,title.c_str());
        }
        {
            std::mutex gate_mu;std::condition_variable gate_cv;bool entered=false,released=false,barrier_timeout=false;
            auto reference=ref;reference.reference_id="refresh-stop";if(!store.catalog.PutConsumerReference(reference,&error))throw std::runtime_error("refresh-stop-reference");
            recording::DerivedEventWorkerOptions stop_options;stop_options.wait_ms=1000;stop_options.max_attempts=2;stop_options.latest_evidence=[&](const auto&){std::unique_lock lock(gate_mu);entered=true;gate_cv.notify_all();barrier_timeout=!gate_cv.wait_for(lock,std::chrono::seconds(2),[&]{return released;});return recording::DerivedEventEvidenceUpdate{"probe-channel","probe-channel",full};};
            recording::DerivedEventWorker worker(store.catalog,retention,service,stop_options);if(!worker.Submit(reference,empty,&error))throw std::runtime_error("refresh-stop-submit");bool reached=false;{std::unique_lock lock(gate_mu);reached=gate_cv.wait_for(lock,std::chrono::seconds(2),[&]{return entered;});}
            std::thread stopper([&]{worker.StopAndDrain();});bool stopped=false;const auto end=std::chrono::steady_clock::now()+std::chrono::seconds(2);while(std::chrono::steady_clock::now()<end){if(!worker.Submit(reference,empty,&error)&&error=="derived-worker-stopped"){stopped=true;break;}std::this_thread::sleep_for(std::chrono::milliseconds(1));}
            {std::lock_guard lock(gate_mu);released=true;}gate_cv.notify_all();stopper.join();const auto result=worker.Query(reference.reference_id);
            check(reached&&stopped&&!barrier_timeout&&result.jobs.empty()&&store.catalog.RetentionSnapshot().durable_reservations.empty(),"LP09-Q03 Stop during first provider forbids admission after refresh");
        }
        {
            std::mutex gate_mu;std::condition_variable gate_cv;bool entered=false,released=false,barrier_timeout=false;
            progress=[&](auto stage,auto){if(stage!=recording::DerivedJobProgress::BeforeCreate)return;std::unique_lock lock(gate_mu);if(entered)return;entered=true;gate_cv.notify_all();barrier_timeout=!gate_cv.wait_for(lock,std::chrono::seconds(2),[&]{return released;});};
            auto blocker=ref;blocker.reference_id="refresh-blocker";auto queued=ref;queued.reference_id="refresh-queued";queued.request->end_ms=8500;
            if(!store.catalog.PutConsumerReference(blocker,&error)||!store.catalog.PutConsumerReference(queued,&error))throw std::runtime_error("refresh-references");
            recording::DerivedEventWorkerOptions queued_options;queued_options.wait_ms=20;queued_options.retry_ms=10;queued_options.max_attempts=2;std::size_t queued_provider_calls=0;std::vector<recording::DerivedEventAttemptDiagnostic> queued_attempts;bool observed_before_release=false;
            queued_options.latest_evidence=[&](const auto& reference){if(reference.reference_id==queued.reference_id)++queued_provider_calls;return recording::DerivedEventEvidenceUpdate{"probe-channel","probe-channel",full};};queued_options.diagnostic=[&](const auto& reference,const auto& value){if(reference.reference_id==queued.reference_id){std::lock_guard lock(gate_mu);queued_attempts.push_back(value);gate_cv.notify_all();}};
            recording::DerivedEventWorker worker(store.catalog,retention,service,queued_options);
            if(!worker.Submit(blocker,full,&error))throw std::runtime_error("refresh-blocker-submit");
            bool reached=false;{std::unique_lock lock(gate_mu);reached=gate_cv.wait_for(lock,std::chrono::seconds(2),[&]{return entered;});}
            const bool submitted=reached&&worker.Submit(queued,empty,&error);{std::unique_lock lock(gate_mu);observed_before_release=gate_cv.wait_for(lock,std::chrono::seconds(1),[&]{return !queued_attempts.empty();});released=true;}gate_cv.notify_all();
            recording::RecordingDerivedReferenceResult current;const auto end=std::chrono::steady_clock::now()+std::chrono::seconds(5);do{current=worker.Query(queued.reference_id);if(current.state!="pending")break;std::this_thread::sleep_for(std::chrono::milliseconds(5));}while(std::chrono::steady_clock::now()<end);worker.StopAndDrain();progress={};
            check(submitted&&observed_before_release&&!barrier_timeout&&queued_provider_calls==1&&queued_attempts.size()==1&&queued_attempts[0].attempt==1&&queued_attempts[0].wait_ms==20&&queued_attempts[0].attempt_limit==2&&queued_attempts[0].deadline_exhausted==(queued_attempts[0].elapsed_ms>=20)&&!queued_attempts[0].attempt_exhausted&&queued_attempts[0].selection_complete&&current.jobs.size()==1&&current.jobs[0].job.ready&&current.jobs[0].job.ready->request_fully_satisfied&&current.jobs[0].outputs.size()==2,"LP09-Q01 independent scheduler first evaluation consumes current evidence before blocked renderer releases");
            bool submitted_reference=false;check(store.catalog.IsDerivedReferenceAccepted(queued.reference_id,&submitted_reference,&error)&&submitted_reference,"LP09-Q03 queued reference remains durably owned");
        }
    }catch(...){check(false,"LP09 diagnostic fixture preparation exception");}
    std::cout<<"[summary] pass="<<passed<<" fail="<<failed<<'\n';return failed?1:0;
}
int main(int argc,char** argv){
    if(argc==3&&(std::string(argv[2])=="diagnostics"||std::string(argv[2])=="diagnostics-no-crypto"))return DiagnosticMode(std::filesystem::path(argv[1])/"diagnostics",std::string(argv[2])=="diagnostics-no-crypto");
    if(argc==3&&std::string(argv[2])=="caps")return CapMode(std::filesystem::path(argv[1])/"cap-case");
    if(argc==3&&std::string(argv[2])=="cancel")return CancelMode(std::filesystem::path(argv[1])/"cancel-case");
    if(argc==3&&(std::string(argv[2])=="ready-child"||std::string(argv[2])=="ready-parent"))
        return RecoveryMode(std::filesystem::path(argv[1])/"ready-restart",std::string(argv[2])=="ready-child");
    if(argc==3&&(std::string(argv[2])=="hooks-managed"||std::string(argv[2])=="hooks-legacy"))
        return HookConsumer(std::filesystem::path(argv[1])/argv[2],std::string(argv[2])=="hooks-managed");
    if(argc!=2)return 2;
    setenv("MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_ENABLED","0",1);
    setenv("MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_HOOK_ENABLED","0",1);
    setenv("MEDIA_SERVER_ANALYSIS_EVENT_CLIP_HOOK_ENABLED","0",1);
    setenv("MEDIA_SERVER_ANALYSIS_EVENT_PRE_EVENT_MS","0",1);
    setenv("MEDIA_SERVER_ANALYSIS_EVENT_POST_EVENT_MS","0",1);
    gst_init(nullptr,nullptr);
    try{
        auto input=Encode(30,false,false);Shift(input,7000000000ULL);
        Store store(std::filesystem::path(argv[1])/"actual-event");
        recording::GStreamerSegmentWriter::Options writer_options(store.root,1000);
        writer_options.managed_journal=&store.journal;writer_options.managed_catalog=&store.catalog;writer_options.managed_store_id="probe-store";
        recording::GStreamerSegmentWriter writer(writer_options);std::string error;
        if(!writer.Start("probe-channel","unused",input.descriptor,[](auto,auto,auto*){return false;},&error))throw std::runtime_error(error);
        for(const auto& packet:input.packets)writer.Push(packet,0);writer.Stop();
        std::mutex mu;std::condition_variable cv;analysis::DecodedIntervalCollector collector;
        analysis::AnalysisResult result;std::size_t decoded=0;
        auto decoder=analysis::CreateRawVideoDecoder({"probe-channel",input.descriptor.tracks.front()},[&](analysis::RawVideoFrame frame){
            analysis::DecodedIntervalEvidence interval;interval.analysis_pts_ns=frame.pts;interval.duration_ns=frame.source_duration_ns;interval.association=frame.source_association;
            {std::lock_guard lock(mu);collector.Append(std::move(interval));result.pts=frame.pts;result.source_association=frame.source_association;++decoded;}cv.notify_all();
        });
        if(!decoder||!decoder->Start(&error))throw std::runtime_error("actual decoder start: "+error);
        for(const auto& packet:input.packets){if(!decoder->PushPacket(packet,&error))throw std::runtime_error("actual decoder push: "+error);std::this_thread::sleep_for(std::chrono::nanoseconds(*packet.observation->duration_ns));}
        {std::unique_lock lock(mu);cv.wait_for(lock,std::chrono::seconds(3),[&]{return decoded>=20;});}decoder->Stop();
        if(decoded<20)throw std::runtime_error("actual H264 decoder evidence insufficient");
        result.source_key="probe-channel";result.observation_context.source_id="probe-channel";result.observation_context.channel_id="probe-channel";
        result.observation_namespace="actual-h264-event-r0";result.decoded_intervals=collector.Snapshot(result.observation_namespace);
        result.context.event_time_basis="media-pts-ms";
        std::atomic<bool> disk_available{true};
        recording::RetentionCoordinator retention(store.catalog,[&]{return store.catalog.RetentionSnapshot();},[&](auto* bytes,auto* why){
            if(!disk_available){if(why)*why="fixture-disk-provider-failed";return false;}*bytes=1024ULL*1024*1024;return true;
        },[](const auto&,auto*){return false;},{0,1,store.root});
        if(!retention.UpdateChannelPolicy("probe-channel",{1024ULL*1024*1024,0,1024ULL*1024*1024,0},&error))throw std::runtime_error(error);
        recording::DerivedJobService service(store.catalog,store.journal,{store.root,30000,{}});LegacyDeriver legacy;
        recording::CatalogEventRecordingBridge::Options options;options.output_root=store.root;options.use_consumer_references=true;options.derived_service=&service;
        options.resolve_recording_channel=[](const std::string& source)->std::optional<std::string>{return source=="probe-channel"?std::optional<std::string>(source):std::nullopt;};
        auto bridge=std::make_shared<recording::CatalogEventRecordingBridge>(store.catalog,retention,legacy,options);
        analysis::SetEventRecordingBridge(bridge);
        analysis::AnalysisEvent event;event.event_id="actual-h264-event";event.event_type="intrusion";event.rule_id="event-rule";event.track_id=1;event.label="person";event.score=.9F;event.box={.1F,.1F,.2F,.2F};
        event.start_time_ms=7000;event.update_time_ms=8500;event.end_time_ms=8500;
        analysis::DispatchEventRecords(result,{event});
        std::vector<recording::DerivedJobRecordV1> jobs;
        const auto deadline=std::chrono::steady_clock::now()+std::chrono::seconds(3);
        do{
            if(!store.catalog.SnapshotDerivedJobs(&jobs,&error))throw std::runtime_error(error);
            if(!jobs.empty()&&jobs.front().state==recording::DerivedJobState::Complete)break;
            std::this_thread::sleep_for(std::chrono::milliseconds(20));
        }while(std::chrono::steady_clock::now()<deadline);
        analysis::SetEventRecordingBridge({});analysis::StopEventStorage();bridge->StopAndDrain();
        const auto references=store.catalog.QueryConsumerReferences("probe-channel","event",event.event_id);
        bool complete=references.size()==1&&jobs.size()==1&&jobs.front().state==recording::DerivedJobState::Complete&&jobs.front().ready&&jobs.front().ready->outputs.size()==2;
        if(complete) {
            const auto current=bridge->QueryReferenceResult(references.front().reference_id);
            complete=current.managed&&!current.truncated&&current.jobs.size()==1&&current.jobs.front().outputs.size()==2&&
                jobs.front().ready->verified_output&&jobs.front().ready->request_fully_satisfied&&
                jobs.front().intent.reference.request->start_ms==7000&&jobs.front().intent.reference.request->end_ms==8500;
            for(const auto& output:current.jobs.front().outputs)
                complete=DecodeOutput(store.root/output.relative_path)&&output.catalog_available&&complete;
            std::cout<<"[detail] E01 verified="<<jobs.front().ready->verified_output<<" fully_satisfied="<<jobs.front().ready->request_fully_satisfied<<'\n';
        }
        analysis::EventRecord record;record.event_id=event.event_id;record.channel_id="probe-channel";record.stream_id="probe-channel";
        record.track_id=1;record.start_time_ms=7000;record.end_time_ms=8500;record.update_time_ms=8500;record.time_basis="media-pts-ms";
        analysis::EventMediaHookOptions hooks;hooks.pre_event_ms=0;hooks.post_event_ms=0;
        auto unconfigured_options=options;unconfigured_options.derived_service=nullptr;
        recording::CatalogEventRecordingBridge unconfigured(store.catalog,retention,legacy,unconfigured_options);
        const auto existing=unconfigured.TryResolve(result,record,hooks);
        const bool sticky=existing.derived_job_managed;
        int resolver_passed=0;
        for(int mode=0;mode<4;++mode) {
            auto inactive_options=unconfigured_options;
            inactive_options.resolve_recording_channel=[mode](const auto&)->std::optional<std::string> {
                if(mode==2)throw std::runtime_error("fixture inactive resolver");
                return mode==0?std::nullopt:std::optional<std::string>("other-channel");
            };
            if(mode==3)inactive_options.resolve_recording_channel={};
            recording::CatalogEventRecordingBridge inactive(store.catalog,retention,legacy,inactive_options);
            bool preserved=false;
            try {
                const auto response=inactive.TryResolve(result,record,hooks);
                preserved=response.derived_job_managed&&!response.error.empty()&&response.link_id==references[0].reference_id;
                auto fresh=record;fresh.event_id="inactive-new-"+std::to_string(mode);
                const auto rejected=inactive.TryResolve(result,fresh,hooks);
                preserved=preserved&&!rejected.derived_job_managed&&store.catalog.QueryConsumerReferences("probe-channel","event",fresh.event_id).empty();
            } catch(const std::exception&) {preserved=false;}
            std::cout<<(preserved?"[pass] ":"[fail] ")<<"E17 accepted 후 resolver "<<(mode==0?"nullopt":mode==1?"불일치":mode==2?"예외":"미주입")<<"는 기존 소유 유지·신규 저장 없음\n";
            resolver_passed+=preserved;
        }
        record.event_id="after-stop-new-event";
        const auto stopped=bridge->TryResolve(result,record,hooks);
        const bool no_new_reference=!stopped.derived_job_managed&&store.catalog.QueryConsumerReferences("probe-channel","event",record.event_id).empty();
        const auto extended=ExtendedEvents(store,retention,legacy,options,result,disk_available);
        const auto original_segments=store.Segments();
        const auto adapter=AdapterCases(std::filesystem::path(argv[1])/"adapter",original_segments.front(),
            *store.catalog.FindSourceBinding(original_segments.front().segment_id),references.front());
        const bool finalize_update=FinalizeUpdate(std::filesystem::path(argv[1])/"finalize-update",input,result);
        const auto accepted_replay=AcceptedReplay(std::filesystem::path(argv[1])/"accepted-replay",references.front());
        const auto utc=UtcIntegration(store,std::filesystem::path(argv[1])/"utc",result);
        std::cout<<(complete?"[pass] ":"[fail] ")<<"E01 실제 H264 decoder→EventRecord→reference→내구 job·2출력 Complete\n";
        std::cout<<"[detail] decoded="<<decoded<<" evidence="<<result.decoded_intervals->frames.size()<<" references="<<references.size()<<" jobs="<<jobs.size()<<'\n';
        std::cout<<(sticky?"[pass] ":"[fail] ")<<"E17 무주입 bridge 재생성에도 내구 managed 소유권 유지\n";
        std::cout<<(no_new_reference?"[pass] ":"[fail] ")<<"E13 Stop 이후 신규 reference 저장 없음\n";
        auto pending_reference=references.front();pending_reference.reference_id="uncertain-accepted-reference";
        if(!store.catalog.PutConsumerReference(pending_reference,&error))throw std::runtime_error(error);
        const auto journal_size=std::filesystem::file_size(store.journal.path());
        const int journal_fd=::open(store.journal.path().c_str(),O_RDWR|O_NOFOLLOW|O_CLOEXEC);
        if(journal_fd<0)throw std::runtime_error("uncertainty fixture open");
        const char invalid='x',newline='\n';
        if(::pwrite(journal_fd,&invalid,1,journal_size-1)!=1)throw std::runtime_error("uncertainty fixture write");
        const bool append_rejected=!store.catalog.AcceptDerivedReference(pending_reference,&error);
        if(::pwrite(journal_fd,&newline,1,journal_size-1)!=1)throw std::runtime_error("uncertainty fixture restore");
        ::close(journal_fd);
        record.event_id=event.event_id;
        const auto uncertain=unconfigured.TryResolve(result,record,hooks);
        const bool failclosed=append_rejected&&!store.catalog.RetentionSnapshot().authoritative&&
            uncertain.derived_job_managed&&uncertain.completeness=="unknown"&&!uncertain.error.empty();
        std::cout<<(failclosed?"[pass] ":"[fail] ")<<"E20 비권위 원장 조회 실패는 legacy 억제 unknown\n";
        const int passed=extended.first+adapter.first+accepted_replay.first+utc.first+resolver_passed+static_cast<int>(complete)+static_cast<int>(sticky)+static_cast<int>(no_new_reference)+static_cast<int>(failclosed)+static_cast<int>(finalize_update);
        const int failed=extended.second+adapter.second+accepted_replay.second+utc.second+9-(passed-extended.first-adapter.first-accepted_replay.first-utc.first);
        std::cout<<"[summary] pass="<<passed<<" fail="<<failed<<'\n';return failed==0?0:1;
    }catch(const std::exception& e){analysis::SetEventRecordingBridge({});analysis::StopEventStorage();std::cerr<<"[setup-fail] "<<e.what()<<'\n';return 2;}
}

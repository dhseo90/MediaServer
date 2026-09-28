// 파일 용도: 기본 녹화 구성의 관리 저장소·증거·복구 수명을 격리 검증한다.
#include "recording_media_test_fixture.h"
#include "recording/recording_evidence_observer.h"
#include "analysis/decoded_interval_evidence.h"
#include "recording/event_recording_bridge.h"
#include "recording/recording_derived_job_service.h"
#include "recording/recording_runtime_composition.h"
#include "recording/recording_supervisor.h"
#include "recording/recording_derived_selection.h"
#include "analysis/raw_video_decoder.h"
#include <thread>
#include <fcntl.h>
#include <unistd.h>
#include <sys/stat.h>
#include <fstream>
#include <iostream>

std::string FileBytes(const std::filesystem::path& path) {
    std::ifstream in(path,std::ios::binary);
    return {std::istreambuf_iterator<char>(in),{}};
}
struct UnusedLegacy final:recording::EventClipDeriver {
    recording::EventClipDeriveResult Derive(const recording::EventClipDeriveRequest&)override{return {};}
};
bool ProviderLockBoundaries(const std::filesystem::path& root) {
    Store store(root);std::string error;
    recording::RetentionCoordinator retention(store.catalog,[&]{return store.catalog.RetentionSnapshot();},
        [](auto* bytes,auto*){*bytes=1024ULL*1024*1024;return true;},[](const auto&,auto*){return false;},{0,1,root});
    recording::DerivedJobService service(store.catalog,store.journal,{root,30000,{}});UnusedLegacy legacy;
    analysis::AnalysisResult result;result.source_key="007";result.observation_context.source_id="007";result.observation_context.channel_id="007";
    result.observation_namespace="provider-lock-ns";
    auto evidence=std::make_shared<analysis::DecodedIntervalSnapshot>();evidence->analysis_namespace=result.observation_namespace;
    analysis::EventRecord record;record.event_id="provider-lock-event";record.stream_id="007";record.channel_id="007";
    record.start_time_ms=0;record.end_time_ms=1;record.update_time_ms=1;record.time_basis="media-pts-ms";
    analysis::EventMediaHookOptions hooks;
    recording::CatalogEventRecordingBridge::Options options;options.use_consumer_references=true;options.derived_service=&service;
    options.resolve_recording_channel=[](const auto& key){return std::optional<std::string>(key);};
    options.derived_options.wait_ms=100;options.derived_options.retry_ms=100;options.derived_options.max_attempts=2;
    recording::CatalogEventRecordingBridge* current=nullptr;
    options.derived_options.latest_evidence=[&](const auto& reference) {
        if(current)current->QueryReferenceResult(reference.reference_id);
        return recording::DerivedEventEvidenceUpdate{"007","007",evidence};
    };
    std::atomic<bool> finished{false};
    std::thread watchdog([&]{const auto deadline=std::chrono::steady_clock::now()+std::chrono::seconds(4);
        while(!finished&&std::chrono::steady_clock::now()<deadline)std::this_thread::sleep_for(std::chrono::milliseconds(10));
        if(!finished)::_exit(91);
    });
    bool ok=false;
    {
        recording::CatalogEventRecordingBridge bridge(store.catalog,retention,legacy,options);current=&bridge;
        analysis::EventRecordingBridgeResult a,b;
        std::thread one([&]{a=bridge.TryResolve(result,record,hooks);});
        std::thread two([&]{b=bridge.TryResolve(result,record,hooks);});one.join();two.join();
        std::size_t accepts=0;for(const auto& mutation:store.journal.Replay().mutations)
            if(mutation.mutation_type==recording::RecordingMutationType::DerivedReferenceAccepted)++accepts;
        ok=a.derived_job_managed&&b.derived_job_managed&&a.link_id==b.link_id&&accepts==1;
        bridge.StopAndDrain();current=nullptr;
    }
    options.derived_options.latest_evidence=[&](const auto&) {
        current->StopAndDrain();return recording::DerivedEventEvidenceUpdate{"007","007",evidence};
    };
    {
        recording::CatalogEventRecordingBridge bridge(store.catalog,retention,legacy,options);current=&bridge;
        record.event_id="provider-stop-event";
        const auto rejected=bridge.TryResolve(result,record,hooks);
        bool accepted=false;store.catalog.IsDerivedReferenceAccepted(rejected.link_id,&accepted,&error);
        ok=ok&&!rejected.derived_job_managed&&!accepted&&rejected.error=="derived-worker-stopped";
        current=nullptr;
    }
    finished=true;watchdog.join();return ok;
}
recording::DerivedJobIntentV1 PrepareRuntimeJob(recording::RecordingRuntimeStorage& storage,
    recording::RetentionCoordinator& retention) {
    std::string error;auto input=Encode(12,false,false);Shift(input,1000000000ULL);
    recording::GStreamerSegmentWriter writer(storage.WriterOptions(10000));
    if(!writer.Start("007","unused",input.descriptor,[](auto,auto,auto*){return false;},&error))throw std::runtime_error(error);
    analysis::DecodedIntervalCollector collector;
    for(const auto& packet:input.packets) {
        writer.Push(packet,0);analysis::DecodedIntervalEvidence frame;
        frame.analysis_pts_ns=packet.pts;frame.duration_ns=packet.observation->duration_ns;
        frame.association.quality=analysis::SourceAssociationQuality::TimestampMatch;
        frame.association.original=analysis::OriginalSampleIdentity{packet.observation->source_generation,packet.observation->generation_order,
            packet.observation->ordinal,packet.track_id,*packet.observation->pts_ns};
        collector.Append(frame);
    }
    writer.Stop();
    recording::RecordingConsumerReferenceV1 reference;
    reference.reference_id="runtime-fault-reference";reference.kind="event";reference.owner_id="runtime-fault-event";
    reference.source_id="007";reference.channel_id="007";reference.analysis_namespace="runtime-fault-ns";reference.analysis_track_id="track-1";
    reference.analysis_pts=1000000000;reference.association_quality="timestamp-match";
    reference.original=recording::RecordingConsumerOriginalV1{"probe-generation-a",1,1,"video-0",1000000000};
    reference.request=recording::RecordingConsumerRequestV1{"media-pts-ms",1000,1500,0,0};
    std::vector<recording::RecordingDerivedSourceSnapshotEntry> snapshot;
    if(!storage.catalog().PutConsumerReference(reference,&error)||!storage.catalog().SnapshotDerivedSources(reference,&snapshot,&error))throw std::runtime_error(error);
    std::vector<recording::DerivedSourceEvidence> sources;
    for(const auto& row:snapshot)sources.push_back({row.segment,row.binding,row.deleted});
    recording::DerivedRecordingSelection selection;
    recording::DerivedJobIntentV1 intent;
    if(!recording::SelectDerivedRecording(reference,*collector.Snapshot(reference.analysis_namespace),sources,nullptr,&selection,&error)||
       !selection.complete||!recording::BuildDerivedJobIntent(selection,sources,32*1024*1024,1,&intent,&error))throw std::runtime_error(error);
    if(!retention.UpdateChannelPolicy("007",{268435456,0,268435456,0},&error)||!retention.AdmitDerivedJob(storage.catalog(),intent,0).accepted)
        throw std::runtime_error("runtime intent admission");
    return intent;
}
int RuntimeRecovery(const std::filesystem::path& root,const std::string& mode) {
    gst_init(nullptr,nullptr);recording::RecordingRuntimeStorage storage(root);std::string error;if(!storage.Open(&error))return 2;
    recording::RetentionCoordinator retention(storage.catalog(),[&]{return storage.catalog().RetentionSnapshot();},
        [](auto* bytes,auto*){*bytes=1024ULL*1024*1024;return true;},[](const auto&,auto*){return false;},{0,1,root});
    const bool child=mode.find("child")!=std::string::npos;
    const bool blocked=mode.find("blocked")!=std::string::npos;
    if(child) {
        const auto intent=PrepareRuntimeJob(storage,retention);
        recording::DerivedJobService::Options options{root,30000,{}};
        options.progress=[blocked](auto progress,auto) {
            if(progress==(blocked?recording::DerivedJobProgress::CreatedBeforeReceipt:recording::DerivedJobProgress::CommittedDurable))::_exit(23);
        };
        recording::DerivedJobService service(storage.catalog(),storage.journal(),options);
        service.Run(intent.job_id);return 2;
    }
    if(mode=="intent")PrepareRuntimeJob(storage,retention);
    std::vector<recording::DerivedJobRecordV1> jobs;
    if(!storage.catalog().SnapshotDerivedJobs(&jobs,&error)||jobs.size()!=1)return 2;
    const auto before=jobs.front();
    const auto reserved=storage.catalog().RetentionSnapshot().durable_reservations.size();
    bool link_pair=true;
    if(!blocked&&mode!="intent")for(const auto& output:before.intent.outputs) {
        struct stat a{},b{};
        link_pair=::stat((root/output.temporary_relpath).c_str(),&a)==0&&
            ::stat((root/output.final_relpath).c_str(),&b)==0&&a.st_ino==b.st_ino&&a.st_nlink==2&&link_pair;
    }
    recording::DerivedJobService service(storage.catalog(),storage.journal(),{root,30000,{}});
    recording::RecordingStartupRecoveryReport report;
    const bool recovered=recording::RecoverRuntimeRecordingAtStartup(storage.catalog(),retention,&service,root,0,&report,&error);
    storage.catalog().SnapshotDerivedJobs(&jobs,&error);
    bool ok=reserved==1&&jobs.size()==1;
    if(blocked) {
        ok=ok&&!recovered&&report.failed_stage=="derived-reconcile"&&storage.catalog().RetentionSnapshot().durable_reservations.size()==1&&
            !storage.catalog().RequestDeletion(before.intent.sources.front().segment.segment_id,"continuous-capacity",&error);
        for(const auto& output:before.intent.outputs)ok=std::filesystem::exists(root/output.temporary_relpath)&&ok;
    } else if(mode=="intent") {
        ok=ok&&recovered&&jobs.front().state==recording::DerivedJobState::Failed&&storage.catalog().RetentionSnapshot().durable_reservations.empty();
    } else {
        ok=ok&&link_pair&&recovered&&jobs.front().state==recording::DerivedJobState::Complete&&
            report.healthy==before.intent.sources.size()+before.intent.outputs.size()&&storage.catalog().RetentionSnapshot().durable_reservations.empty();
        for(const auto& output:before.intent.outputs)ok=!std::filesystem::exists(root/output.temporary_relpath)&&std::filesystem::exists(root/output.final_relpath)&&ok;
    }
    std::cout<<(ok?"[pass] ":"[fail] ")<<"D02-07 runtime startup "<<mode<<" recovery/보호/물리검사 순서\n";
    return ok?0:1;
}
int SourceRuntime(const std::filesystem::path& root) {
    gst_init(nullptr,nullptr);
    int passed=0,failed=0;
    const auto check=[&](bool ok,const char* label){std::cout<<(ok?"[pass] ":"[fail] ")<<label<<'\n';ok?++passed:++failed;};
    std::string error,store_id;
    {
        Store input_store(root/"input-generation");auto input=Encode(30,false,false);Shift(input,0);
        recording::GStreamerSegmentWriter::Options options(input_store.root,10000);
        options.managed_journal=&input_store.journal;options.managed_catalog=&input_store.catalog;options.managed_store_id="probe-store";
        recording::GStreamerSegmentWriter writer(options);
        if(!writer.Start("007","unused",input.descriptor,[](auto,auto,auto*){return false;},&error))return 2;
        for(const auto& packet:input.packets)writer.Push(packet,0);writer.Stop();
        const auto segments=input_store.Segments();if(segments.size()!=1)return 2;
        const auto location=input_store.catalog.FindSegmentMediaLocation(segments.front().segment_id);if(!location)return 2;
        std::filesystem::create_directories(root/"input");
        std::filesystem::copy_file(location->first/location->second,root/"input"/"identity.mp4");
    }
    auto& sources=ingress::SourceViewApplicationService::Instance();
    const auto created=sources.UpsertSource("007",R"({"sourceId":"007","displayName":"Owned local","kind":"file","file":"identity.mp4","enabled":true,"recording":{"enabled":true,"continuousMaxBytes":268435456,"continuousMaxAgeMs":3600000,"eventMaxBytes":268435456,"eventMaxAgeMs":3600000,"revision":1}})");
    if(created.status<200||created.status>=300){std::cout<<"[fail] D02 source fixture status="<<created.status<<'\n';return 2;}
    std::size_t previous_count=0;
    for(int cycle=0;cycle<4;++cycle) {
        const bool enabled=cycle%2;
        recording::RecordingRuntimeStorage storage(root/"managed");if(!storage.Open(&error))return 2;
        if(store_id.empty())store_id=storage.journal().ManagedStoreId();
        check(storage.journal().ManagedStoreId()==store_id,"D02-06 off/on 재개방 동일 store identity");
        core::StreamRegistry registry;core::ResourceGuard guard(8,8);core::SessionManager manager(registry,guard);
        recording::RetentionCoordinator retention(storage.catalog(),[&]{return storage.catalog().RetentionSnapshot();},
            [](auto* bytes,auto*){*bytes=1024ULL*1024*1024;return true;},[](const auto&,auto*){return false;},{0,1,root/"managed"});
        recording::DerivedJobService service(storage.catalog(),storage.journal(),{root/"managed",30000,{}});
        recording::RecordingStartupRecoveryReport report;
        const bool recovered=recording::RecoverRuntimeRecordingAtStartup(storage.catalog(),retention,&service,root/"managed",0,&report,&error);
        check(recovered,"D02-07 실제 producer 시작 전 runtime 복구");if(!recovered)return 1;
        recording::RecordingSessionService sessions(manager,storage.catalog(),[&]{return std::make_unique<recording::GStreamerSegmentWriter>(storage.WriterOptions(10000));});
        core::RecordingRuntimeConfigData config;config.recording_enabled=enabled;config.recording_retention_interval_ms=10000;
        recording::RecordingSupervisor supervisor(config,sources,sessions,retention);
        if(!supervisor.Start(&error))return 2;
        std::this_thread::sleep_for(std::chrono::milliseconds(enabled?1800:100));
        const auto active=sessions.ActiveChannelCount();
        supervisor.Stop();sessions.StopAll();
        const auto deadline=std::chrono::steady_clock::now()+std::chrono::seconds(5);
        while(registry.ActiveStreamCount()!=0&&std::chrono::steady_clock::now()<deadline)std::this_thread::sleep_for(std::chrono::milliseconds(10));
        const auto count=storage.catalog().FinalizedSegmentIdsForStartup().size();
        check(enabled?(active==1&&count>previous_count):(active==0&&count==previous_count),
            enabled?"D02-06 실제 supervisor/session on 숫자 채널 V2 파일 생성":"D02-06 실제 supervisor/session off 생산0·기존 segment 보존");
        check(sessions.ActiveChannelCount()==0&&registry.ActiveStreamCount()==0&&guard.ActiveStreams()==0,"D02-08 실제 source/session 종료 owner0");
        previous_count=count;
    }
    std::cout<<"[summary] pass="<<passed<<" fail="<<failed<<'\n';return failed?1:0;
}
bool DecodeRuntimeOutput(const std::filesystem::path& path) {
    const int fd=::open(path.c_str(),O_RDONLY|O_NOFOLLOW|O_CLOEXEC);if(fd<0)return false;
    bool eos=false;std::size_t frames=0;
    {
        const auto demux=path.extension()==".mp4"?"qtdemux":"tsdemux";
        Pipeline pipeline("fdsrc fd="+std::to_string(fd)+" ! "+demux+" ! h264parse ! avdec_h264 ! appsink name=out sync=false");
        auto* bus=gst_element_get_bus(pipeline.pipeline);
        const auto deadline=std::chrono::steady_clock::now()+std::chrono::seconds(5);
        while(std::chrono::steady_clock::now()<deadline) {
            if(auto* sample=gst_app_sink_try_pull_sample(GST_APP_SINK(pipeline.sink),20*GST_MSECOND)){++frames;gst_sample_unref(sample);}
            if(auto* message=gst_bus_pop_filtered(bus,static_cast<GstMessageType>(GST_MESSAGE_EOS|GST_MESSAGE_ERROR))) {
                eos=GST_MESSAGE_TYPE(message)==GST_MESSAGE_EOS;gst_message_unref(message);break;
            }
        }
        gst_object_unref(bus);
    }
    ::close(fd);std::cout<<"[decode] frames="<<frames<<" eos="<<eos<<'\n';return frames>0&&eos;
}
int DefaultBudget(const std::filesystem::path& root) {
    gst_init(nullptr,nullptr);
    auto input=Encode(201,false,false);Shift(input,0);
    recording::RecordingRuntimeStorage storage(root);std::string error;
    if(!storage.Open(&error))return 2;
    recording::RetentionCoordinator retention(storage.catalog(),[&]{return storage.catalog().RetentionSnapshot();},
        [](auto* bytes,auto*){*bytes=1024ULL*1024*1024;return true;},[](const auto&,auto*){return false;},{0,1,root});
    if(!retention.UpdateChannelPolicy("007",{268435456,0,268435456,0},&error))return 2;
    recording::DerivedJobService service(storage.catalog(),storage.journal(),{root,30000,{}});
    recording::RecordingStartupRecoveryReport recovery;
    if(!recording::RecoverRuntimeRecordingAtStartup(storage.catalog(),retention,&service,root,0,&recovery,&error))return 2;
    auto cache=std::make_shared<recording::RecordingEvidenceObserver>();
    UnusedLegacy legacy;
    recording::CatalogEventRecordingBridge::Options options;
    options.use_consumer_references=true;options.use_runtime_stream_identity=true;options.derived_service=&service;
    options.derived_options=recording::RecordingRuntimeEventBudget(10000,5000);
    options.derived_options.latest_evidence=[cache](const auto& reference){return cache->Latest(reference);};
    options.resolve_recording_channel=[](const auto& key){return key=="file:owned-default-fixture"?std::optional<std::string>("007"):std::nullopt;};
    auto bridge=std::make_shared<recording::CatalogEventRecordingBridge>(storage.catalog(),retention,legacy,options);
    analysis::SetEventRecordingBridge(bridge);
    recording::GStreamerSegmentWriter writer(storage.WriterOptions(10000));
    if(!writer.Start("007","unused",input.descriptor,[](auto,auto,auto*){return false;},&error))return 2;
    std::mutex mu;analysis::DecodedIntervalCollector collector;analysis::AnalysisResult latest;
    latest.source_key="file:owned-default-fixture";latest.observation_context.source_id="007";latest.observation_context.channel_id="007";
    latest.observation_namespace="default-real-decoder";latest.context.event_time_basis="media-pts-ms";
    std::size_t decoded=0;
    auto decoder=analysis::CreateRawVideoDecoder({latest.source_key,input.descriptor.tracks.front()},[&](analysis::RawVideoFrame frame){
        analysis::DecodedIntervalEvidence interval;interval.analysis_pts_ns=frame.pts;interval.duration_ns=frame.source_duration_ns;interval.association=frame.source_association;
        std::lock_guard lock(mu);collector.Append(std::move(interval));latest.pts=frame.pts;latest.source_association=frame.source_association;
        latest.decoded_intervals=collector.Snapshot(latest.observation_namespace);++decoded;cache->OnResult(latest);
    });
    if(!decoder||!decoder->Start(&error))return 2;
    bool pushed=true;std::chrono::steady_clock::time_point accepted_at;
    for(std::size_t i=0;i<input.packets.size();++i) {
        writer.Push(input.packets[i],0);pushed=decoder->PushPacket(input.packets[i],&error)&&pushed;
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
        if(i==79) {
            analysis::AnalysisResult historical;
            {std::lock_guard lock(mu);historical=latest;historical.decoded_intervals.reset();}
            analysis::AnalysisEvent event;event.event_id="default-postroll-event";event.event_type="intrusion";event.rule_id="default-rule";
            event.track_id=1;event.label="person";event.score=.9F;event.box={.1F,.1F,.2F,.2F};
            event.start_time_ms=7000;event.end_time_ms=8000;event.update_time_ms=8000;
            accepted_at=std::chrono::steady_clock::now();analysis::DispatchEventRecords(historical,{event});
        }
    }
    writer.Stop();decoder->Stop();
    recording::RecordingDerivedReferenceResult current;
    const auto refs=storage.catalog().QueryConsumerReferences("007","event","default-postroll-event");
    const auto deadline=accepted_at+std::chrono::seconds(18);
    if(refs.size()==1)do {
        current=bridge->QueryReferenceResult(refs.front().reference_id);
        if(current.state!="pending")break;
        std::this_thread::sleep_for(std::chrono::milliseconds(20));
    }while(std::chrono::steady_clock::now()<deadline);
    const auto elapsed=std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now()-accepted_at).count();
    bool ok=pushed&&decoded>=130&&refs.size()==1&&refs.front().request&&refs.front().request->pre_ms==5000&&
        refs.front().request->post_ms==5000&&current.jobs.size()==1&&current.jobs.front().outputs.size()==2&&
        current.jobs.front().job.state==recording::DerivedJobState::Complete&&current.jobs.front().job.ready&&
        current.jobs.front().job.ready->request_fully_satisfied&&elapsed>=11000;
    if(ok)for(const auto& output:current.jobs.front().outputs)ok=DecodeRuntimeOutput(root/output.relative_path)&&ok;
    std::cout<<"[measured] decoded="<<decoded<<" event_elapsed_ms="<<elapsed<<" state="<<current.state<<" reason="<<current.reason<<'\n';
    std::cout<<(ok?"[pass] ":"[fail] ")<<"D02-04/10 실제 default10s+post5s 후행 finalize·동시 실제decoder cache·2출력 decode\n";
    bridge->StopAndDrain();analysis::SetEventRecordingBridge(nullptr);cache->Stop();
    std::cout<<"[summary] pass="<<(ok?1:0)<<" fail="<<(ok?0:1)<<'\n';return ok?0:1;
}
int main(int argc,char** argv) {
    if(argc==3&&std::string(argv[2])=="provider-locks") {
        const bool ok=ProviderLockBoundaries(std::filesystem::path(argv[1])/"provider-locks");
        std::cout<<(ok?"[pass] ":"[fail] ")<<"D02-08 provider 조회 재진입·동시 멱등·Stop 후 Submit 재검사\n";
        return ok?0:1;
    }
    if(argc==3&&(std::string(argv[2]).find("recovery-")==0)) {
        const auto mode=std::string(argv[2]).substr(9);
        const auto name=mode.find("blocked")!=std::string::npos?"blocked":mode=="intent"?"intent":"committed";
        return RuntimeRecovery(std::filesystem::path(argv[1])/name,mode);
    }
    if(argc==3&&std::string(argv[2])=="source-runtime")return SourceRuntime(std::filesystem::path(argv[1])/"source-runtime");
    if(argc==3&&std::string(argv[2])=="default-budget")return DefaultBudget(std::filesystem::path(argv[1])/"default-budget");
    if(argc!=2)return 2;
    const auto root=std::filesystem::path(argv[1]);
    int passed=0,failed=0;
    const auto check=[&](bool ok,const char* label){std::cout<<(ok?"[pass] ":"[fail] ")<<label<<'\n';ok?++passed:++failed;};
    {
        recording::RecordingEvidenceObserver cache({},1);
        analysis::AnalysisResult result;
        result.observation_context.source_id="007";result.observation_context.channel_id="007";
        result.observation_namespace="cache-a";
        auto snapshot=std::make_shared<analysis::DecodedIntervalSnapshot>();snapshot->analysis_namespace="cache-a";
        result.decoded_intervals=snapshot;
        recording::RecordingConsumerReferenceV1 reference;
        reference.source_id="007";reference.channel_id="007";reference.analysis_namespace="cache-a";
        cache.OnResult(result);
        check(cache.Latest(reference).evidence==snapshot,"D02-03 동일 source/channel/ns immutable snapshot 전달");
        auto other=reference;other.channel_id="008";
        check(!cache.Latest(other).evidence,"D02-03 다른 channel 증거 혼합 거부");
        cache.OnStopped("cache-a","stream-stopped");
        check(!cache.Latest(reference).evidence,"D02-03 stop namespace 증거 삭제");
        cache.OnResult(result);
        auto second=std::make_shared<analysis::DecodedIntervalSnapshot>();second->analysis_namespace="cache-b";
        result.observation_namespace="cache-b";result.decoded_intervals=second;cache.OnResult(result);
        other=reference;other.analysis_namespace="cache-b";
        check(!cache.Latest(reference).evidence&&cache.Latest(other).evidence==second,"D02-03 cache capacity 이전 namespace eviction");
        cache.Stop();cache.OnResult(result);
        check(!cache.Latest(other).evidence,"D02-03 전체 stop 후 publication/query 거부");
    }
    std::string error,first,first_id;
    {
        recording::RecordingJournal journal(recording::RecordingJournal::ManagedOptions{root/"auto-a",{}});
        const bool opened=journal.Open(&error);
        first=FileBytes(root/"auto-a"/".recording-store-format");
        first_id=journal.ManagedStoreId();
        check(opened&&!first.empty()&&recording::ValidateOpaqueId(first_id,&error),"D02-01 신규 root 자동 내구 store identity");
    }
    {
        recording::RecordingJournal journal(recording::RecordingJournal::ManagedOptions{root/"auto-a",{}});
        const bool opened=journal.Open(&error);
        check(opened&&!first.empty()&&first_id==journal.ManagedStoreId()&&first==FileBytes(root/"auto-a"/".recording-store-format"),"D02-01 재개방 동일 store identity");
        recording::RecordingJournal other(recording::RecordingJournal::ManagedOptions{root/"auto-b",{}});
        check(other.Open(&error)&&!first.empty()&&first!=FileBytes(root/"auto-b"/".recording-store-format"),"D02-01 서로 다른 root 난수 identity 구별");
        recording::RecordingJournal concurrent(recording::RecordingJournal::ManagedOptions{root/"auto-a",{}});
        check(!concurrent.Open(&error),"D02-02 managed lease 동시 소유 거부");
    }
    {
        recording::RecordingJournal explicit_id(recording::RecordingJournal::ManagedOptions{root/"auto-a",first_id});
        check(explicit_id.Open(&error)&&explicit_id.ManagedStoreId()==first_id,"D02-01 명시 ID 기존 계약 유지");
    }
    {
        recording::RecordingJournal conflict(recording::RecordingJournal::ManagedOptions{root/"auto-a","different-store"});
        check(!conflict.Open(&error)&&first==FileBytes(root/"auto-a"/".recording-store-format"),"D02-02 명시 ID 충돌 원본 marker 보존");
    }
    std::filesystem::rename(root/"auto-b"/".recording-store-format",root/"auto-b"/".recording-store-init");
    {
        recording::RecordingJournal pending(recording::RecordingJournal::ManagedOptions{root/"auto-b",{}});
        check(pending.Open(&error)&&!pending.ManagedStoreId().empty()&&!std::filesystem::exists(root/"auto-b"/".recording-store-init"),"D02-02 같은 init 내구 ID 복구");
    }
    std::filesystem::create_directory(root/"legacy");
    {std::ofstream out(root/"legacy"/"owned-legacy.txt");out<<"preserve";}
    {
        recording::RecordingJournal legacy(recording::RecordingJournal::ManagedOptions{root/"legacy",{}});
        check(!legacy.Open(&error)&&FileBytes(root/"legacy"/"owned-legacy.txt")=="preserve","D02-02 legacy nonempty 변환·삭제 거부");
    }
    {std::ofstream out(root/"auto-b"/".recording-store-format",std::ios::trunc);out<<"{\"unknown\":1}";}
    {
        recording::RecordingJournal broken(recording::RecordingJournal::ManagedOptions{root/"auto-b",{}});
        check(!broken.Open(&error)&&FileBytes(root/"auto-b"/".recording-store-format")=="{\"unknown\":1}","D02-02 손상/unknown marker 덮어쓰기 거부");
    }
    // 공유 실제 미디어 helper의 준비를 확인하며 이후 구성 통합에서 같은 H264 입력을 재사용한다.
    gst_init(nullptr,nullptr);auto input=Encode(12,false,false);Shift(input,1000000000ULL);
    check(input.packets.size()==12,"D02-06 실제 H264 입력 준비");
    {
        Store store(root/"startup-v2");
        recording::GStreamerSegmentWriter::Options options(store.root,1000);
        options.managed_journal=&store.journal;options.managed_catalog=&store.catalog;options.managed_store_id="probe-store";
        recording::GStreamerSegmentWriter writer(options);
        if(!writer.Start("007","unused",input.descriptor,[](auto,auto,auto*){return false;},&error))return 2;
        for(const auto& packet:input.packets)writer.Push(packet,0);
        writer.Stop();
        const auto segments=store.Segments();
        recording::RetentionCoordinator retention(store.catalog,[&]{return store.catalog.RetentionSnapshot();},
            [](auto* bytes,auto*){*bytes=1024ULL*1024*1024;return true;},[](const auto&,auto*){return false;},{0,1,store.root});
        recording::RecordingStartupRecoveryReport report;
        check(!segments.empty()&&recording::RecoverRecordingAtStartup(store.catalog,retention,store.root,0,&report,&error)&&
            report.inspected==segments.size()&&report.healthy==segments.size(),"D02-05 실제 V2 finalized startup 미디어 전수 검사");
        if(!segments.empty()) {
            const auto location=store.catalog.FindSegmentMediaLocation(segments.front().segment_id);
            if(!location)return 2;
            {std::ofstream changed(location->first/location->second,std::ios::binary|std::ios::app);changed<<"corrupt";}
            const auto inspection=recording::InspectAndMarkRecordingMedia(store.catalog,segments.front().segment_id);
            check(inspection.state==recording::MediaInspectionState::Corrupt&&inspection.applied,"D02-05 실제 V2 size/hash 손상 감지·catalog Mark");
        }
    }
    const auto budget=recording::RecordingRuntimeEventBudget(10000,5000);
    check(budget.wait_ms==16000&&budget.retry_ms==500&&budget.max_attempts==33,"D02-10 default 준비16s·500ms·33회 예산");
    const auto capped=recording::RecordingRuntimeEventBudget(std::numeric_limits<std::int64_t>::max(),std::numeric_limits<std::int64_t>::max());
    check(capped.wait_ms==60000&&capped.max_attempts==121&&!capped.budget_reason.empty(),"D02-10 overflow 요청은60s/121회 capped 사유 보존");
    {
        recording::RecordingRuntimeStorage storage(root/"runtime-on");
        const bool opened=storage.Open(&error);
        auto options=storage.WriterOptions(1000);
        check(opened&&storage.journal().HasManagedLease()&&!storage.journal().ManagedStoreId().empty()&&
            options.managed_journal==&storage.journal()&&options.managed_catalog==&storage.catalog()&&
            options.managed_store_id==storage.journal().ManagedStoreId(),"D02-06 on 구성의 동일 managed store/catalog writer 결박");
        recording::RetentionCoordinator retention(storage.catalog(),[&]{return storage.catalog().RetentionSnapshot();},
            [](auto* bytes,auto*){*bytes=1024ULL*1024*1024;return true;},[](const auto&,auto*){return false;},{0,1,root/"runtime-on"});
        recording::RecordingStartupRecoveryReport report;
        check(recording::RecoverRuntimeRecordingAtStartup(storage.catalog(),retention,nullptr,root/"runtime-on",0,&report,&error),
            "D02-07 빈 저장소 runtime 복구 함수");
    }
    {
        recording::RecordingRuntimeStorage storage(root/"runtime-off");
        const bool opened=storage.Open(&error);
        check(opened&&storage.journal().HasManagedLease()&&
            storage.catalog().RetentionSnapshot().candidates.empty(),"D02-06 off managed 형식 유지·미디어 비생산");
    }
    {
        Store store(root/"events");
        recording::RetentionCoordinator retention(store.catalog,[&]{return store.catalog.RetentionSnapshot();},
            [](auto* bytes,auto*){*bytes=1024ULL*1024*1024;return true;},[](const auto&,auto*){return false;},{0,1,store.root});
        retention.UpdateChannelPolicy("007",{1024ULL*1024*1024,0,1024ULL*1024*1024,0},&error);
        recording::DerivedJobService service(store.catalog,store.journal,{store.root,30000,{}});
        UnusedLegacy legacy;
        auto cache=std::make_shared<recording::RecordingEvidenceObserver>();
        analysis::AnalysisResult result;result.source_key="rtsp:fixture-canonical-key";
        result.observation_context.source_id="007";result.observation_context.channel_id="007";
        result.observation_namespace="runtime-namespace";result.pts=1000000000LL;
        auto evidence=std::make_shared<analysis::DecodedIntervalSnapshot>();evidence->analysis_namespace=result.observation_namespace;
        result.decoded_intervals=evidence;cache->OnResult(result);result.decoded_intervals.reset();
        recording::CatalogEventRecordingBridge::Options options;
        options.use_consumer_references=true;options.use_runtime_stream_identity=true;options.derived_service=&service;
        options.resolve_recording_channel=[](const auto& key){return key=="rtsp:fixture-canonical-key"?std::optional<std::string>("007"):std::nullopt;};
        options.derived_options.latest_evidence=[cache](const auto& ref){return cache->Latest(ref);};
        options.derived_options.wait_ms=0;
        recording::CatalogEventRecordingBridge bridge(store.catalog,retention,legacy,options);
        analysis::EventRecord record;record.event_id="runtime-event";record.stream_id=result.source_key;record.channel_id=result.source_key;
        record.track_id=1;record.start_time_ms=1000;record.end_time_ms=1100;record.update_time_ms=1100;record.time_basis="media-pts-ms";
        analysis::EventMediaHookOptions hooks;
        const auto accepted=bridge.TryResolve(result,record,hooks);
        check(accepted.derived_job_managed&&!accepted.link_id.empty()&&record.channel_id=="rtsp:fixture-canonical-key",
            "D02-04/11 raw key→numeric 참조·history null provider 접수·공개 record 불변");
        bool contradictions=true;
        for(int mode=0;mode<4;++mode) {
            auto bad_record=record;auto bad_result=result;bad_record.event_id="runtime-bad-"+std::to_string(mode);
            if(mode==0)bad_record.stream_id="other-key";
            if(mode==1)bad_record.channel_id="other-key";
            if(mode==2)bad_result.observation_context.source_id="008";
            if(mode==3)bad_result.source_key="other-key";
            const auto rejected=bridge.TryResolve(bad_result,bad_record,hooks);
            contradictions=!rejected.derived_job_managed&&rejected.error=="reference-source-channel-conflict"&&
                store.catalog.QueryConsumerReferences("007","event",bad_record.event_id).empty()&&contradictions;
        }
        check(contradictions,"D02-11 raw stream/channel/sourcecontext 모순은 신규 저장·접수 없음");
        bridge.StopAndDrain();
    }
    std::cout<<"[summary] pass="<<passed<<" fail="<<failed<<'\n';return failed?1:0;
}

// 파일 용도: 실제 SharedStream→VP8 decoder→AnalysisManager worker 및 EventRecord 생성 연결 검증.
#include "analysis/analysis_manager.h"
#include "analysis/event_storage.h"
#include "app_config.h"
#include "ingress/recording_application_service.h"
#include "recording/recording_derived_selection.h"
#include <gst/app/gstappsink.h>
#include <gst/gst.h>
#include <atomic>
#include <algorithm>
#include <chrono>
#include <cstdlib>
#include <iostream>
#include <thread>

static int failures=0;
static void Check(bool ok,const char* name) { std::cout<<(ok?"[pass] ":"[fail] ")<<name<<std::endl; if(!ok)++failures; }
struct Observer final:analysis::AnalysisResultObserver {
    analysis::AnalysisManager* manager{nullptr};
    std::string tap;
    std::atomic<int> captured{0},observed{0},stopped{0},reentered{0};
    std::atomic<bool> changed{false};
    std::mutex mu;
    std::vector<analysis::AnalysisResult> results;
    analysis::AnalysisObservationContext CaptureContext(const std::string&,std::int64_t) override {
        const auto epoch=changed.load()?"epoch-new":"epoch-old";
        ++captured;
        return {"runtime-channel","runtime-channel",epoch,"pending"};
    }
    void OnResult(const analysis::AnalysisResult& result) override {
        if(manager->LatestResult(tap)) ++reentered;
        { std::lock_guard lock(mu); results.push_back(result); }
        ++observed;
        // observer 예외가 worker 종료나 live fanout 실패로 전파되지 않아야 한다.
        throw std::runtime_error("intentional-observer-error");
    }
    void OnStopped(const std::string&,const std::string&) override { ++stopped; }
};
int main() {
    setenv("MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_ENABLED","0",1);
    setenv("MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_HOOK_ENABLED","0",1);
    setenv("MEDIA_SERVER_ANALYSIS_EVENT_CLIP_HOOK_ENABLED","0",1);
    setenv("MEDIA_SERVER_RECORDING_OBSERVATION_INTERVAL_MS","250",1);
    gst_init(nullptr,nullptr);
    Check(app::GetAppConfig().recording_observation_interval_ms==250,"runtime-configured-interval");
    {
        recording::RecordingJournal journal("runtime-status.jsonl"); std::string catalog_error;
        journal.Open(&catalog_error);
        recording::RecordingCatalog catalog(journal,{"runtime-status.sqlite3",".",false}); catalog.Open(&catalog_error);
        recording::RecordingReadService reader(catalog,".");
        ingress::RecordingApplicationService service(reader,catalog,true,
            [](const auto&,auto* channels){ channels->push_back({"scope-channel","Scope",true,true,false,0,0,0,0}); return true; },
            []{ recording::AnalysisObservationProjector::Status s; s.critical_rejected=7; s.last_error="critical-queue-full"; return s; });
        Check(service.Status([](const auto&){return true;}).body.find("observations")==std::string::npos,"runtime-status-limited-scope");
        Check(service.Status([](const auto&){return true;},true).body.find("\"criticalRejected\":7")!=std::string::npos,"runtime-status-global-scope");
    }
    GError* error=nullptr;
    auto* pipeline=gst_parse_launch("videotestsrc num-buffers=12 pattern=ball ! video/x-raw,width=160,height=90,framerate=10/1 ! vp8enc deadline=1 keyframe-max-dist=2 ! appsink name=sink sync=false",&error);
    if(!pipeline) { if(error)g_error_free(error); Check(false,"runtime-encoder-create"); return 1; }
    auto* sink=gst_bin_get_by_name(GST_BIN(pipeline),"sink");
    gst_element_set_state(pipeline,GST_STATE_PLAYING);
    std::vector<media::Packet> packets;
    media::StreamDescriptor descriptor;
    while(auto* sample=gst_app_sink_try_pull_sample(GST_APP_SINK(sink),2*GST_SECOND)) {
        auto* buffer=gst_sample_get_buffer(sample); GstMapInfo map{};
        if(gst_buffer_map(buffer,&map,GST_MAP_READ)) {
            media::Packet p; p.kind=media::MediaKind::Video; p.codec=media::CodecId::VP8;
            p.track_id="video-0"; p.pts=GST_BUFFER_PTS(buffer)+2000000000LL; p.dts=p.pts;
            p.is_key_frame=!GST_BUFFER_FLAG_IS_SET(buffer,GST_BUFFER_FLAG_DELTA_UNIT);
            if(packets.size()<6) {
                media::SampleObservation observation;observation.source_generation="runtime-source-generation";
                observation.generation_order=73;observation.ordinal=packets.size()+1;observation.pts_ns=p.pts;
                if(GST_BUFFER_DURATION_IS_VALID(buffer))observation.duration_ns=GST_BUFFER_DURATION(buffer);
                p.observation=observation;
            }
            p.payload.assign(map.data,map.data+map.size); packets.push_back(std::move(p));
            gst_buffer_unmap(buffer,&map);
        }
        if(descriptor.tracks.empty()) {
            auto* text=gst_caps_to_string(gst_sample_get_caps(sample));
            descriptor.tracks.push_back({"video-0",media::MediaKind::Video,media::CodecId::VP8,"vp8",text,0,0});
            g_free(text);
        }
        gst_sample_unref(sample);
    }
    gst_element_set_state(pipeline,GST_STATE_NULL); gst_object_unref(sink); gst_object_unref(pipeline);
    Check(packets.size()==12,"runtime-real-vp8-fixture");
    auto stream=std::make_shared<core::SharedStream>(media::SourceSpec{}); stream->SetDescriptor(descriptor);
    auto observer=std::make_shared<Observer>(); analysis::AnalysisManager manager(observer); observer->manager=&manager;
    analysis::AnalysisProfile profile; profile.detector_type="dummy"; profile.enable_tracking=false;
    profile.target_fps=30; profile.max_frame_age_ms=5000; profile.debug_detector_delay_ms=80;
    const auto attached=manager.AttachStream("runtime-source",stream,profile); observer->tap=attached.tap_id;
    Check(attached.ok,"runtime-attach");
    std::atomic<int> live{0}; stream->AddSubscriber("runtime-live",[&](const auto&){++live;});
    for(const auto& packet:packets) {
        stream->FanOut(packet);
        std::this_thread::sleep_for(std::chrono::milliseconds(35));
        if(observer->captured.load()>0)observer->changed=true;
    }
    for(int i=0;i<150 && observer->observed.load()<2;++i) std::this_thread::sleep_for(std::chrono::milliseconds(20));
    Check(observer->observed.load()>=2,"runtime-observer-exception-isolation");
    if(observer->observed.load()<2) { std::cout<<"[fail] runtime-observer-timeout"<<std::endl; std::_Exit(1); }
    Check(observer->reentered.load()>=2,"runtime-tap-lock-reentry");
    Check(live.load()==12,"runtime-live-fanout-unblocked");
    bool matched_source=false,unobserved_source=false,associations_valid=true;
    for(int attempt=0;attempt<150;++attempt) {
        {std::lock_guard lock(observer->mu);
         matched_source=false;unobserved_source=false;associations_valid=true;
         for(const auto& value:observer->results) {
            const auto source=std::find_if(packets.begin(),packets.end(),[&](const auto& packet){return packet.pts==value.pts;});
            if(source==packets.end()){associations_valid=false;continue;}
            const auto& association=value.source_association;
            if(source->observation) {
                matched_source=true;
                associations_valid=associations_valid&&association.quality==analysis::SourceAssociationQuality::TimestampMatch&&association.original&&
                    association.original->source_generation=="runtime-source-generation"&&association.original->generation_order==73&&
                    association.original->ordinal==source->observation->ordinal&&association.original->track_id=="video-0"&&
                    association.original->pts_ns==static_cast<std::uint64_t>(source->pts);
            } else {
                unobserved_source=true;associations_valid=associations_valid&&association.quality==analysis::SourceAssociationQuality::Unavailable&&!association.original;
            }
         }}
        if(matched_source&&unobserved_source)break;
        std::this_thread::sleep_for(std::chrono::milliseconds(20));
    }
    Check(matched_source&&associations_valid,"S10-C111 실제 manager 전달");
    analysis::AnalysisResult first;
    { std::lock_guard lock(observer->mu); first=observer->results.front(); }
    Check(first.observation_context.stream_epoch_id=="epoch-old","runtime-captured-provenance-immutable");
    Check(!first.observation_namespace.empty() && first.tracks.empty(),"runtime-tracking-disabled-independent");
    std::string event_id;
    std::vector<std::string> public_metadata;
    analysis::SetEventObservationObserver([&](const auto& result,const auto& record,const auto& event) {
        if(result.observation_namespace==first.observation_namespace && event.rule_id=="runtime-rule") {
            event_id=record.event_id;public_metadata.push_back(record.metadata_json);
        }
    });
    analysis::AnalysisEvent event; event.rule_id="runtime-rule"; event.event_type="intrusion";
    event.track_id=1; event.label="person"; event.score=.9; event.box={.1F,.1F,.2F,.2F};
    analysis::DispatchEventRecords(first,{event});
    Check(!event_id.empty(),"runtime-built-event-record-observer");
    auto without_association=first;without_association.source_association={};
    analysis::DispatchEventRecords(without_association,{event});
    const bool metadata_unchanged=first.source_association.quality==analysis::SourceAssociationQuality::TimestampMatch&&
        first.source_association.original&&public_metadata.size()==2&&public_metadata[0]==public_metadata[1]&&
        public_metadata[0].find("runtime-source-generation")==std::string::npos&&
        public_metadata[0].find("source_association")==std::string::npos&&public_metadata[0].find("generation_order")==std::string::npos;
    Check(unobserved_source&&associations_valid&&metadata_unchanged,"S10-C112 미관측 입력 기존 동작");
    bool actual_selection=false,sequence_cutoff=true;
    {
        std::lock_guard lock(observer->mu);
        for(const auto& value:observer->results) {
            if(!value.decoded_intervals){sequence_cutoff=false;continue;}
            for(const auto& f:value.decoded_intervals->frames)sequence_cutoff=sequence_cutoff&&
                f.decoded_sequence<=value.decoded_intervals->maximum_sequence;
            if(value.pts<2100000000LL||value.pts>2500000000LL||!value.source_association.original)continue;
            recording::RecordingConsumerReferenceV1 r;r.reference_id="runtime-request";r.kind="event";r.owner_id="runtime-event";
            r.source_id="runtime-channel";r.channel_id="runtime-channel";r.analysis_namespace=value.observation_namespace;
            r.analysis_track_id="track-1";r.analysis_pts=value.pts;r.association_quality="timestamp-match";
            const auto& original=*value.source_association.original;
            r.original=recording::RecordingConsumerOriginalV1{original.source_generation,original.generation_order,original.ordinal,original.track_id,original.pts_ns};
            r.request=recording::RecordingConsumerRequestV1{"media-pts-ms",2000,value.pts/1000000+100,0,0};
            recording::DerivedSourceEvidence source;auto& s=source.segment;s.segment_id="runtime-segment";
            s.source_id=r.source_id;s.channel_id=r.channel_id;s.store_id="runtime-store";s.order_request_id="runtime-order";s.order_sequence=1;
            s.media_epoch_id="runtime-epoch";s.media_start_pts=2000000000;s.media_end_pts=2600000000;
            s.container="webm";s.video_codecs={"vp8"};s.audio_omitted_reason="source-no-audio";s.size_bytes=12;
            s.checksum_sha256=std::string(64,'a');s.created_at_ms=1;s.finalized_at_ms=2;
            s.mappings={{"media-server.recording-utc-mapping.v1","runtime-map",2000000000,2600000000,"server-observation",2000000000,2600000000,0,"fixture"}};
            recording::RecordingSourceBindingV1 b;b.segment_id=s.segment_id;b.source_id=s.source_id;b.channel_id=s.channel_id;
            b.store_id=s.store_id;b.media_epoch_id=s.media_epoch_id;b.source_generation="runtime-source-generation";b.generation_order=73;b.track_id="video-0";
            for(const auto& packet:packets)if(packet.observation)b.samples.push_back({packet.observation->ordinal,*packet.observation->pts_ns});
            b.last_accepted_ordinal=6;source.binding=b;
            recording::DerivedRecordingSelection selection;std::string selection_error;
            actual_selection=actual_selection||(recording::SelectDerivedRecording(r,*value.decoded_intervals,{source},nullptr,&selection,&selection_error)&&
                selection.complete&&selection.slices.size()>=2);
        }
    }
    Check(actual_selection,"S10-D18 실제decoder-manager 직접구간 union 선택");
    Check(sequence_cutoff,"S10-D15 실제 queued sequence 미래제외");
    const auto latest=manager.LatestResult(attached.tap_id);
    const auto historical=latest?manager.ResultNearPts(attached.tap_id,latest->pts,0):std::nullopt;
    Check(latest&&latest->decoded_intervals&&historical&&!historical->decoded_intervals&&historical->pts==latest->pts,
        "S10-D20 live/latest 증거보존·history 신규포인터 제외");
    // 이미 분석된 비영점 PTS 이후 같은 로컬 입력의 원본 generation과 PTS를 재시작한다.
    for(std::size_t i=0;i<4&&i<packets.size();++i) {
        auto packet=packets[i];packet.pts=static_cast<std::int64_t>(i)*100000000;packet.dts=packet.pts;
        packet.observation->source_generation="runtime-next-generation";packet.observation->generation_order=74;
        packet.observation->pts_ns=packet.pts;packet.observation->ordinal=i+1;
        stream->FanOut(packet);std::this_thread::sleep_for(std::chrono::milliseconds(100));
    }
    bool reset_evidence=false;
    for(int attempt=0;attempt<100&&!reset_evidence;++attempt) {
        const auto value=manager.LatestResult(attached.tap_id);
        if(value&&value->observation_namespace!=first.observation_namespace&&value->decoded_intervals) {
            reset_evidence=!value->decoded_intervals->frames.empty()&&value->decoded_intervals->analysis_namespace==value->observation_namespace;
            for(const auto& f:value->decoded_intervals->frames)reset_evidence=reset_evidence&&
                f.decoded_sequence>=value->decoded_intervals->minimum_sequence&&f.association.original&&
                f.association.original->source_generation=="runtime-next-generation";
        }
        if(!reset_evidence)std::this_thread::sleep_for(std::chrono::milliseconds(20));
    }
    Check(reset_evidence,"S10-D19 실제PTS rollback namespace 증거격리");
    analysis::SetEventObservationObserver({}); analysis::StopEventStorage();
    manager.DetachAll(); stream->StopAllSubscribers();
    Check(observer->stopped.load()==2,"runtime-rollback-and-tap-stop-once");
    Check(stream->TotalSubscriberCount()==0,"runtime-subscriber-cleanup");
    std::cout<<"S07 runtime failures="<<failures<<std::endl;
    return failures?1:0;
}

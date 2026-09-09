// 실제 SharedStream→VP8 decoder→AnalysisManager worker 및 EventRecord 생성 연결 검증.
#include "analysis/analysis_manager.h"
#include "analysis/event_storage.h"
#include "app_config.h"
#include "ingress/recording_application_service.h"
#include <gst/app/gstappsink.h>
#include <gst/gst.h>
#include <atomic>
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
            [](auto* channels){ channels->push_back({"scope-channel","Scope",true,true,false,0,0,0,0}); return true; },
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
            p.track_id="video-0"; p.pts=GST_BUFFER_PTS(buffer); p.dts=p.pts;
            p.is_key_frame=!GST_BUFFER_FLAG_IS_SET(buffer,GST_BUFFER_FLAG_DELTA_UNIT);
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
    analysis::AnalysisResult first;
    { std::lock_guard lock(observer->mu); first=observer->results.front(); }
    Check(first.observation_context.stream_epoch_id=="epoch-old","runtime-captured-provenance-immutable");
    Check(!first.observation_namespace.empty() && first.tracks.empty(),"runtime-tracking-disabled-independent");
    std::string event_id;
    analysis::SetEventObservationObserver([&](const auto& result,const auto& record,const auto& event) {
        if(result.observation_namespace==first.observation_namespace && event.rule_id=="runtime-rule")event_id=record.event_id;
    });
    analysis::AnalysisEvent event; event.rule_id="runtime-rule"; event.event_type="intrusion";
    event.track_id=1; event.label="person"; event.score=.9; event.box={.1F,.1F,.2F,.2F};
    analysis::DispatchEventRecords(first,{event});
    Check(!event_id.empty(),"runtime-built-event-record-observer");
    analysis::SetEventObservationObserver({}); analysis::StopEventStorage();
    manager.DetachAll(); stream->StopAllSubscribers();
    Check(observer->stopped.load()==1,"runtime-tap-stop-once");
    Check(stream->TotalSubscriberCount()==0,"runtime-subscriber-cleanup");
    std::cout<<"S07 runtime failures="<<failures<<std::endl;
    return failures?1:0;
}

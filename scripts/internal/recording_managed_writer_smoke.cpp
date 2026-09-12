// 파일 용도: 실제 encode→V2 writer→managed catalog→decode 시간 계약을 검사한다.
#include "recording/gstreamer_segment_writer.h"
#include "recording/recording_catalog.h"
#include "recording/recording_finalize_recovery.h"
#include "media/gstreamer_sample_observation.h"
#include <gst/app/gstappsink.h>
#include <gst/gst.h>
#include <algorithm>
#include <fstream>
#include <iostream>
#include <limits>
#include <stdexcept>

namespace {
int passes=0, failures=0;
void Check(bool ok,const std::string& label) {
    std::cout<<(ok?"[pass] ":"[fail] ")<<label<<'\n'; ok?++passes:++failures;
}
std::string Read(const std::filesystem::path& p) {
    std::ifstream f(p,std::ios::binary);return {std::istreambuf_iterator<char>(f),{}};
}
struct Encoded { media::StreamDescriptor descriptor; std::vector<media::Packet> packets; };
Encoded Encode(bool h264,int frames=60,bool bframes=false,bool actual_probe=false) {
    const std::string launch="videotestsrc num-buffers="+std::to_string(frames)+
        " pattern=ball ! video/x-raw,width=160,height=90,framerate=10/1 ! "+
        (h264?(bframes?"x264enc speed-preset=medium bframes=2 key-int-max=10 rc-lookahead=5 ! video/x-h264,stream-format=byte-stream,alignment=au":"x264enc tune=zerolatency speed-preset=ultrafast key-int-max=10 ! video/x-h264,stream-format=byte-stream,alignment=au"):
              "vp8enc deadline=1 keyframe-max-dist=10 ! video/x-vp8")+" ! appsink name=out sync=false";
    GError* error=nullptr;GstElement* pipe=gst_parse_launch(launch.c_str(),&error);
    if(error){g_error_free(error);if(pipe)gst_object_unref(pipe);throw std::runtime_error("encode-pipeline");}
    GstElement* sink=gst_bin_get_by_name(GST_BIN(pipe),"out");
    if(actual_probe)media::InstallGstreamerSampleObservation(sink);
    gst_element_set_state(pipe,GST_STATE_PLAYING);Encoded out;
    guint64 origin=0;
    for(int i=0;i<frames;++i) {
        GstSample* s=gst_app_sink_try_pull_sample(GST_APP_SINK(sink),3*GST_SECOND);
        if(!s){gst_element_set_state(pipe,GST_STATE_NULL);gst_object_unref(sink);gst_object_unref(pipe);throw std::runtime_error("encode-sample");}
        GstBuffer* b=gst_sample_get_buffer(s);
        if(i==0)origin=GST_BUFFER_DTS_IS_VALID(b)?std::min(GST_BUFFER_PTS(b),GST_BUFFER_DTS(b)):GST_BUFFER_PTS(b);
        media::Packet p;p.kind=media::MediaKind::Video;p.codec=h264?media::CodecId::H264:media::CodecId::VP8;p.track_id="video-0";
        p.is_key_frame=!GST_BUFFER_FLAG_IS_SET(b,GST_BUFFER_FLAG_DELTA_UNIT);
        p.pts=static_cast<std::int64_t>(GST_BUFFER_PTS(b)-origin);
        p.dts=GST_BUFFER_DTS_IS_VALID(b)?static_cast<std::int64_t>(GST_BUFFER_DTS(b)-origin):p.pts;
        p.payload.resize(gst_buffer_get_size(b));gst_buffer_extract(b,0,p.payload.data(),p.payload.size());
        media::SampleObservation o;o.source_generation="source-a";o.generation_order=1;o.ordinal=static_cast<std::uint64_t>(i+1);
        o.pts_ns=static_cast<std::uint64_t>(p.pts);o.dts_ns=static_cast<std::uint64_t>(p.dts);o.duration_ns=GST_BUFFER_DURATION(b);
        o.clock_process_id="fixture-process";o.mono_before_ns=1000000000LL+p.pts;o.mono_after_ns=o.mono_before_ns+1000;
        o.observed_utc_ns=1789200000000000000LL+p.pts;p.observation=o;
        if(actual_probe)p.observation=media::ReadGstreamerSampleObservation(s);
        if(out.descriptor.tracks.empty()) {
            gchar* caps=gst_caps_to_string(gst_sample_get_caps(s));
            out.descriptor.tracks.push_back({"video-0",media::MediaKind::Video,p.codec,media::ToString(p.codec),caps,0,0});g_free(caps);
        }
        out.packets.push_back(std::move(p));gst_sample_unref(s);
    }
    gst_element_set_state(pipe,GST_STATE_NULL);gst_object_unref(sink);gst_object_unref(pipe);return out;
}
int Decode(const std::filesystem::path& path,std::vector<std::uint64_t>* timestamps=nullptr) {
    gchar* uri=g_filename_to_uri(path.c_str(),nullptr,nullptr);
    const std::string launch=std::string("uridecodebin uri=\"")+uri+"\" ! videoconvert ! appsink name=out sync=false";g_free(uri);
    GError* error=nullptr;GstElement* pipe=gst_parse_launch(launch.c_str(),&error);
    if(error){g_error_free(error);if(pipe)gst_object_unref(pipe);return -1;}
    GstElement* sink=gst_bin_get_by_name(GST_BIN(pipe),"out");gst_element_set_state(pipe,GST_STATE_PLAYING);
    int count=0;bool eos=false;
    while(true) {
        GstSample* sample=gst_app_sink_try_pull_sample(GST_APP_SINK(sink),3*GST_SECOND);
        if(!sample){eos=gst_app_sink_is_eos(GST_APP_SINK(sink));break;}
        if(timestamps)timestamps->push_back(GST_BUFFER_PTS(gst_sample_get_buffer(sample)));
        ++count;gst_sample_unref(sample);
        if(count>1000)break;
    }
    gst_element_set_state(pipe,GST_STATE_NULL);gst_object_unref(sink);gst_object_unref(pipe);return eos?count:-1;
}
struct Store {
    std::filesystem::path root;
    recording::RecordingJournal journal;
    recording::RecordingCatalog catalog;
    static recording::RecordingCatalog::Options Opt(const std::filesystem::path& r) {
        recording::RecordingCatalog::Options o{r/"recording-catalog.sqlite3",r,true};o.enable_v2_storage=true;return o;
    }
    explicit Store(std::filesystem::path r):root(std::move(r)),journal(recording::RecordingJournal::ManagedOptions{root,"store-1"}),catalog(journal,Opt(root)) {
        std::string e;if(!journal.Open(&e)||!catalog.Open(&e))throw std::runtime_error("store-setup");
    }
    recording::GStreamerSegmentWriter::Options Options(std::int64_t duration=2000) {
        recording::GStreamerSegmentWriter::Options o{root,duration};o.managed_journal=&journal;o.managed_catalog=&catalog;o.managed_store_id="store-1";return o;
    }
    std::vector<recording::RecordingSegmentV2> Segments() {
        std::vector<recording::RecordingSegmentV2> out;
        // 원장 envelope ID로 실제 catalog 결과를 찾는다.
        for(const auto& m:journal.Replay().mutations)if(m.mutation_type==recording::RecordingMutationType::SegmentV2Finalized) {
            auto s=catalog.FindSegmentV2ById(m.entity_id);if(s)out.push_back(*s);
        }
        return out;
    }
    int Frames(const std::vector<recording::RecordingSegmentV2>& segments) {
        int n=0;for(const auto& s:segments){const int k=Decode(root/"channel-1"/(s.segment_id+(s.container=="mp4"?".mp4":".webm")));if(k<0)return -1;n+=k;}return n;
    }
};
bool Run(Store& store,const Encoded& input,std::int64_t duration=2000,bool repeat=false) {
    recording::GStreamerSegmentWriter writer(store.Options(duration));std::string error;bool callback=false;
    if(!writer.Start("channel-1","legacy-epoch",input.descriptor,[&](auto,auto,auto*){callback=true;return true;},&error))return false;
    for(const auto& p:input.packets){writer.Push(p,-9999);if(repeat)writer.Push(p,9999);}
    const bool snapshot=static_cast<bool>(writer.TimeSnapshot());writer.Stop();return !callback&&!snapshot;
}
bool HasUnknown(const std::vector<recording::RecordingSegmentV2>& segments) {
    for(const auto& s:segments)for(const auto& m:s.mappings)if(m.provenance=="unknown")return true;return false;
}
}
int main(int argc,char** argv) {
    if(argc!=2)return 2;gst_init(nullptr,nullptr);const std::filesystem::path root(argv[1]);
    try {
        const auto h264=Encode(true),vp8=Encode(false);
        for(const auto& pair:std::vector<std::pair<std::string,const Encoded*>>{{"h264",&h264},{"vp8",&vp8}}) {
            Store s(root/pair.first);const bool ran=Run(s,*pair.second);auto segments=s.Segments();
            Check(ran&&segments.size()==3&&s.Frames(segments)==60,"WR01 "+pair.first+" managed segments decode all frames without legacy callback or snapshot");
        }
        for(const auto& c:std::vector<std::pair<std::string,std::pair<int,std::int64_t>>>{{"WR02",{15,-4034000000LL}},{"WR03",{20,-4034000000LL}},{"WR04",{15,4034000000LL}}}) {
            auto shifted=h264;for(std::size_t i=c.second.first;i<shifted.packets.size();++i)shifted.packets[i].observation->observed_utc_ns+=c.second.second;
            Store s(root/c.first);bool ran=Run(s,shifted);auto segments=s.Segments();std::size_t mappings=0;for(const auto& v:segments)mappings+=v.mappings.size();
            Check(ran&&segments.size()==3&&s.Frames(segments)==60&&(c.first=="WR03"||mappings>3),c.first+" UTC-only change preserves media splits frames and independent mapping");
        }
        auto reorder=vp8;reorder.packets[15].observation->pts_ns=1400000000ULL;reorder.packets[15].pts=1400000000LL;
        Store rs(root/"reorder");bool reordered=Run(rs,reorder);auto rseg=rs.Segments();
        Check(reordered&&rseg.size()==3&&HasUnknown(rseg)&&rs.Frames(rseg)==60,"WR05 duplicate PTS with advancing DTS preserves media and unknown mapping");
        auto changed=h264;for(std::size_t i=20;i<changed.packets.size();++i){auto& p=changed.packets[i];p.observation->source_generation="source-b";p.observation->generation_order=2;p.observation->ordinal=i-19;p.observation->pts_ns=*p.observation->pts_ns-2000000000ULL;p.observation->dts_ns=*p.observation->dts_ns-2000000000ULL;}
        Store gs(root/"generation");bool generations=Run(gs,changed);auto gseg=gs.Segments();
        bool distinct=false;for(std::size_t i=1;i<gseg.size();++i)distinct|=gseg[i].media_epoch_id!=gseg[0].media_epoch_id;
        Check(generations&&distinct&&gs.Frames(gseg)==60,"WR06 explicit generation reset creates a new media epoch");
        Store replay(root/"replay");bool replayed=Run(replay,h264,2000,true);auto rep=replay.Segments();
        Check(replayed&&rep.size()==3&&replay.Frames(rep)==60,"WR07 repeated observations and processing UTC do not duplicate media");
        auto missing=h264;missing.packets.back().observation->duration_ns.reset();Store ms(root/"missing-end");bool unknown=Run(ms,missing);auto mseg=ms.Segments();
        Check(unknown&&!mseg.empty()&&!mseg.back().media_end_pts&&HasUnknown(mseg)&&ms.Frames(mseg)==60,"WR08 missing final duration preserves media with unknown end");
        auto knots=Encode(false,270);for(std::size_t i=0;i<knots.packets.size();++i)knots.packets[i].observation->observed_utc_ns+=static_cast<std::int64_t>(i)*1000000000LL;
        Store ks(root/"mapping-cap");bool capped=Run(ks,knots,100000);auto kseg=ks.Segments();
        Check(capped&&kseg.size()==1&&kseg[0].mappings.size()==256&&kseg[0].mappings.back().provenance=="unknown"&&ks.Frames(kseg)==270,"WR09 mapping budget retains bounded unknown tail and all frames");
        Store binding(root/"binding"),foreign(root/"foreign");
        for(const std::string kind:{"journal","catalog","root","store","lease","incomplete"}) {
            auto options=binding.Options();
            recording::RecordingJournal unopened(recording::RecordingJournal::ManagedOptions{root/"unopened","store-1"});
            if(kind=="journal")options.managed_journal=&foreign.journal;
            if(kind=="catalog")options.managed_catalog=&foreign.catalog;
            if(kind=="root")options.storage_root=root/"outside";
            if(kind=="store")options.managed_store_id="wrong-store";
            if(kind=="lease")options.managed_journal=&unopened;
            if(kind=="incomplete")options.managed_catalog=nullptr;
            const auto before=Read(binding.journal.path());
            recording::GStreamerSegmentWriter writer(options);std::string error;
            Check(!writer.Start("channel-1","epoch",h264.descriptor,{},&error)&&!error.empty()&&
                  before==Read(binding.journal.path())&&!std::filesystem::exists(root/"outside")&&!std::filesystem::exists(root/"unopened"),
                  "WR01 invalid binding rejects before writes "+kind);
        }
        auto process=h264;for(std::size_t i=15;i<process.packets.size();++i){process.packets[i].observation->clock_process_id="other-process";process.packets[i].observation->mono_before_ns-=1000000000LL;process.packets[i].observation->mono_after_ns-=1000000000LL;}
        Store ps(root/"process");bool process_ok=Run(ps,process);auto pseg=ps.Segments();
        Check(process_ok&&pseg.size()==3&&HasUnknown(pseg)&&ps.Frames(pseg)==60,"WR08 clock process change preserves same-generation media with unknown comparison");
        for(const std::string kind:{"zero","overflow"}) {
            auto invalid=h264;invalid.packets.back().observation->duration_ns=kind=="zero"?0:std::numeric_limits<std::uint64_t>::max()-1;
            Store s(root/("end-"+kind));bool ran=Run(s,invalid);auto segments=s.Segments();
            Check(ran&&!segments.empty()&&!segments.back().media_end_pts&&s.Frames(segments)==60,"WR08 invalid duration leaves unknown end "+kind);
        }
        for(const std::string kind:{"observation","pts","range"}) {
            auto invalid=h264;
            if(kind=="observation")invalid.packets[0].observation.reset();
            if(kind=="pts")invalid.packets[0].observation->pts_ns.reset();
            if(kind=="range")invalid.packets[0].observation->pts_ns=std::numeric_limits<std::uint64_t>::max()-1;
            Store s(root/("invalid-"+kind));Run(s,invalid);
            Check(s.Segments().empty()&&s.journal.Replay().mutations.empty(),"WR08 unsafe original input cannot become finalized "+kind);
        }
        auto late=changed;auto stale=h264.packets[5];stale.observation->mono_after_ns=stale.observation->mono_before_ns-1;
        late.packets.insert(late.packets.begin()+30,stale);
        Store ls(root/"late");bool late_ok=Run(ls,late);auto lseg=ls.Segments();
        Check(late_ok&&ls.Frames(lseg)==60,"WR07 older generation cache cannot switch media backwards");
        auto multi=h264;auto alien=h264.packets[5];alien.track_id="other-video";multi.packets.insert(multi.packets.begin()+10,alien);
        Store ts(root/"track");bool track_ok=Run(ts,multi);auto tseg=ts.Segments();
        Check(track_ok&&ts.Frames(tseg)==60,"WR07 unrelated video track cannot change selected track identity");
        std::int64_t previous_order=0;std::string previous_id;
        {
            Store s(root/"restart");Run(s,h264);auto segments=s.Segments();
            if(!segments.empty()){previous_order=segments.back().order_sequence;previous_id=segments.back().segment_id;}
        }
        {
            Store s(root/"restart");bool ran=Run(s,h264);auto segments=s.Segments();
            Check(ran&&segments.size()==6&&previous_order>0&&segments[3].order_sequence>previous_order&&segments[3].segment_id!=previous_id&&s.Frames(segments)==120,
                  "WR06 reopened store allocates fresh IDs and increasing durable order");
        }
        const auto bframes=Encode(true,30,true);Store bs(root/"bframes");bool b_ok=Run(bs,bframes,100000);auto bseg=bs.Segments();
        std::vector<std::uint64_t> decoded_pts;int decoded=-1;
        if(bseg.size()==1)decoded=Decode(bs.root/"channel-1"/(bseg[0].segment_id+".mp4"),&decoded_pts);
        const auto first_pts=*bframes.packets.front().observation->pts_ns;
        Check(b_ok&&bseg.size()==1&&bseg[0].media_start_pts==0&&first_pts>0&&decoded==30&&!decoded_pts.empty()&&
              decoded_pts.front()==first_pts&&HasUnknown(bseg),"WR05 actual H264 reordering preserves decode timestamps and mux origin");
        std::uint64_t maximum_end=0;
        for(const auto& p:bframes.packets)maximum_end=std::max(maximum_end,*p.observation->pts_ns+*p.observation->duration_ns);
        Check(bseg.size()==1&&bseg[0].media_end_pts==static_cast<std::int64_t>(maximum_end),
              "WR05 reordered segment end covers maximum presented frame end");
        std::cout<<"[measure] bframe_last_end_ns="<<(*bframes.packets.back().observation->pts_ns+*bframes.packets.back().observation->duration_ns)
                 <<" maximum_end_ns="<<maximum_end<<'\n';
        auto missing_middle=bframes;
        auto maximum_packet=std::max_element(missing_middle.packets.begin(),missing_middle.packets.end(),[](const auto& a,const auto& b){return a.observation->pts_ns<b.observation->pts_ns;});
        maximum_packet->observation->duration_ns.reset();
        Store middle_store(root/"missing-middle-end");bool middle_ok=Run(middle_store,missing_middle,100000);auto middle_segments=middle_store.Segments();
        Check(maximum_packet!=missing_middle.packets.end()-1&&middle_ok&&middle_segments.size()==1&&!middle_segments[0].media_end_pts&&middle_store.Frames(middle_segments)==30,
              "WR08 missing maximum PTS frame duration keeps reordered end unknown");
        std::string reserved_id;std::int64_t reserved_order=0;std::filesystem::path ready_path;
        {
            Store s(root/"ready-recovery");auto options=s.Options(100000);int completed=0;
            options.admit_segment=[](const auto&,auto){return recording::SegmentAdmissionDecision{true,false,32ULL*1024*1024};};
            options.complete_segment=[&](const auto&,auto){++completed;};
            recording::GStreamerSegmentWriter writer(options);std::string error;
            const bool started=writer.Start("channel-1","legacy",h264.descriptor,{},&error);
            if(started)for(const auto& p:h264.packets)writer.Push(p,0);
            const auto replay=s.journal.Replay();
            if(!replay.mutations.empty()) {
                recording::RecordingOrderReservationV1 order;
                if(recording::ParseRecordingOrderReservationV1(replay.mutations.front().payload_json,&order,&error)) {
                    reserved_id=order.segment_id;reserved_order=order.sequence;
                    ready_path=s.root/"channel-1"/(reserved_id+".mp4.finalize-ready");
                }
                // 유효 동일 예약을 외부 fixture writer가 덧붙여 기존 소유 객체를 poison한다.
                std::ofstream external(s.journal.path(),std::ios::app|std::ios::binary);
                external<<recording::SerializeRecordingMutationV1(replay.mutations.front())<<'\n';
            }
            writer.Stop();
            Check(started&&!reserved_id.empty()&&std::filesystem::is_regular_file(ready_path)&&completed==0&&s.Segments().empty(),
                  "WR09 failed active commit preserves ready order and quota reservation");
        }
        {
            Store s(root/"ready-recovery");std::string error;recording::FinalizeRecoveryReport report;
            const bool recovered=recording::RecoverFinalizeReadyTickets(s.catalog,s.root,&report,&error);
            auto segments=s.Segments();
            Check(recovered&&report.recovered==1&&segments.size()==1&&segments[0].segment_id==reserved_id&&
                  segments[0].order_sequence==reserved_order&&!std::filesystem::exists(ready_path)&&s.Frames(segments)==60,
                  "WR09 restart recovers the same durable segment and all frames");
        }
        auto bad_clock=h264;for(auto& p:bad_clock.packets)p.observation->mono_after_ns=p.observation->mono_before_ns+6000000;
        Store cs(root/"bad-clock");bool clock_ok=Run(cs,bad_clock);auto cseg=cs.Segments();
        Check(clock_ok&&cseg.size()==3&&HasUnknown(cseg)&&cs.Frames(cseg)==60,"WR08 excessive clock width preserves media as unknown");
        auto conflict=h264;conflict.packets[0].observation->generation_order=0;
        Store is(root/"identity-zero");Run(is,conflict);
        Check(is.Segments().empty()&&is.journal.Replay().mutations.empty(),"WR08 zero generation order cannot become finalized");
        for(const std::string kind:{"normal","fast","drift","fast-step"}) {
            auto quality=h264;
            for(std::size_t i=0;i<quality.packets.size();++i) {
                auto& o=*quality.packets[i].observation;
                if(kind=="fast"||kind=="fast-step") {o.mono_before_ns=1000000000LL+static_cast<std::int64_t>(*o.pts_ns)/2;o.mono_after_ns=o.mono_before_ns+1000;o.observed_utc_ns=1789200000000000000LL+static_cast<std::int64_t>(*o.pts_ns)/2;}
                if(kind=="fast-step")o.observed_utc_ns+=static_cast<std::int64_t>(i)*1000000000;
                if(kind=="drift")o.observed_utc_ns+=static_cast<std::int64_t>(i)*100000;
            }
            Store s(root/("quality-"+kind));bool ran=Run(s,quality,100000);auto segments=s.Segments();bool valid=ran&&segments.size()==1&&s.Frames(segments)==60;
            if(valid&&kind=="normal")valid=segments[0].mappings.size()==1&&segments[0].mappings[0].provenance=="estimated";
            if(valid&&kind=="fast")valid=HasUnknown(segments);
            if(valid&&kind=="fast-step")valid=segments[0].mappings.front().provenance=="unknown";
            if(valid&&kind=="drift")valid=segments[0].mappings.size()==1&&segments[0].mappings[0].uncertainty_ns.value_or(0)>=7901000;
            Check(valid,"WR08 media observation quality "+kind);
        }
        const auto actual=Encode(true,60,false,true);Store actual_store(root/"actual-probe");bool actual_ok=Run(actual_store,actual);auto actual_segments=actual_store.Segments();
        Check(actual_ok&&actual_segments.size()==3&&actual_store.Frames(actual_segments)==60,
              "WR01 actual appsink observation flows through managed writer and decode");
    }catch(const std::exception& e){Check(false,std::string("fixture setup/execution ")+e.what());}
    std::cout<<"[summary] pass="<<passes<<" fail="<<failures<<'\n';return failures?1:0;
}

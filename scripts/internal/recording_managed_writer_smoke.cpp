// 파일 용도: 실제 encode→V2 writer→managed catalog→decode 시간 계약을 검사한다.
#include "recording/gstreamer_segment_writer.h"
#include "recording/recording_catalog.h"
#include "recording/retention_coordinator.h"
#include "recording/recording_resource_trace.h"
#include "recording/recording_finalize_recovery.h"
#include "recording/recording_runtime_composition.h"
#include "recording/recording_file_evidence.h"
#include "recording/recording_search_reader.h"
#include "recording/evidence_package_builder.h"
#include <fcntl.h>
#include <sys/stat.h>
#include <iomanip>
#include "media/gstreamer_sample_observation.h"
#include "recording_writer_decode_diagnostics.h"
#include "recording_writer_decode_oracle.h"
#include "recording_mixed_profile.h"
#include "recording/visual_frame_decoder.h"
#include <gst/app/gstappsink.h>
#include <gst/gst.h>
#include <algorithm>
#include <atomic>
#include <fstream>
#include <iostream>
#include <limits>
#include <stdexcept>
#include <set>

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
int DecodeDiagnostic(const std::filesystem::path& path,std::vector<std::uint64_t>* timestamps=nullptr,int max_frames=1000,const char* diagnostic=nullptr,
           bool failure_rows_only=false,int expected_count=-1,std::uint64_t expected_first=GST_CLOCK_TIME_NONE,bool software=false) {
    gchar* uri=g_filename_to_uri(path.c_str(),nullptr,nullptr);
    std::string launch=std::string("uridecodebin uri=\"")+uri+"\" ! videoconvert ! appsink name=out sync=false";g_free(uri);
    if(software){gchar* escaped=g_strescape(path.c_str(),nullptr);launch=std::string("filesrc location=\"")+escaped+"\" ! qtdemux ! h264parse ! avdec_h264 ! videoconvert ! appsink name=out sync=false";g_free(escaped);}
    GError* error=nullptr;GstElement* pipe=gst_parse_launch(launch.c_str(),&error);
    if(error){if(diagnostic){writer_decode_diagnostics::PrintFile(diagnostic,"launch-failure",writer_decode_diagnostics::File(path));std::cout<<"[writer-diag-decode] case="<<diagnostic<<" reason=launch-failure domain="<<error->domain<<" code="<<error->code<<'\n';}g_error_free(error);if(pipe)gst_object_unref(pipe);return -1;}
    std::unique_ptr<writer_decode_diagnostics::Trace> trace;if(diagnostic)trace=std::make_unique<writer_decode_diagnostics::Trace>(diagnostic,path,pipe,software);
    GstElement* sink=gst_bin_get_by_name(GST_BIN(pipe),"out");const auto playing=gst_element_set_state(pipe,GST_STATE_PLAYING);
    int count=0;bool eos=false;std::uint64_t first=GST_CLOCK_TIME_NONE;
    while(true) {
        GstSample* sample=gst_app_sink_try_pull_sample(GST_APP_SINK(sink),3*GST_SECOND);
        if(!sample){eos=gst_app_sink_is_eos(GST_APP_SINK(sink));break;}
        if(trace)trace->Sample(gst_sample_get_buffer(sample));
        if(count==0)first=GST_BUFFER_PTS(gst_sample_get_buffer(sample));
        if(timestamps)timestamps->push_back(GST_BUFFER_PTS(gst_sample_get_buffer(sample)));
        ++count;gst_sample_unref(sample);
        if(count>max_frames)break;
    }
    if(trace)trace->Bus(pipe);
    gst_element_set_state(pipe,GST_STATE_NULL);
    if(trace){const bool matched=eos&&count==expected_count&&(expected_first==GST_CLOCK_TIME_NONE||first==expected_first);trace->Report(count,eos,playing,playing==GST_STATE_CHANGE_FAILURE?"start-failure":eos?"eos":count>max_frames?"frame-limit":"null-before-eos",!failure_rows_only||!matched);trace.reset();}
    gst_object_unref(sink);gst_object_unref(pipe);return eos?count:-1;
}
// 기준 저장 검증은 명시 SW decoder만 사용한다. 자동 선택 진단은 위 함수에 그대로 둔다.
struct ReferenceObservation {
    std::atomic<unsigned> corrupted{0},invalid_pts{0};std::mutex mu;
    std::array<std::pair<unsigned,int>,16> errors{},warnings{};std::size_t error_count=0,warning_count=0;
    struct PadContext {ReferenceObservation* owner;unsigned boundary;};
    void Buffer(GstBuffer* buffer,unsigned boundary){if(GST_BUFFER_FLAG_IS_SET(buffer,GST_BUFFER_FLAG_CORRUPTED))corrupted.fetch_or(boundary);if(!GST_BUFFER_PTS_IS_VALID(buffer))invalid_pts.fetch_or(boundary);}
    static GstPadProbeReturn Probe(GstPad*,GstPadProbeInfo* info,gpointer data){if(GST_PAD_PROBE_INFO_TYPE(info)&GST_PAD_PROBE_TYPE_BUFFER){auto* buffer=GST_PAD_PROBE_INFO_BUFFER(info);auto& context=*static_cast<PadContext*>(data);if(buffer)context.owner->Buffer(buffer,context.boundary);}return GST_PAD_PROBE_OK;}
    static GstBusSyncReply Bus(GstBus*,GstMessage* message,gpointer data){const bool warning=GST_MESSAGE_TYPE(message)==GST_MESSAGE_WARNING;if(warning||GST_MESSAGE_TYPE(message)==GST_MESSAGE_ERROR){auto& self=*static_cast<ReferenceObservation*>(data);GError* error=nullptr;if(warning)gst_message_parse_warning(message,&error,nullptr);else gst_message_parse_error(message,&error,nullptr);{std::lock_guard lock(self.mu);auto& rows=warning?self.warnings:self.errors;auto& count=warning?self.warning_count:self.error_count;if(count<rows.size())rows[count]={error?error->domain:0,error?error->code:0};++count;}if(error)g_error_free(error);}return GST_BUS_PASS;}
};
int Decode(const std::filesystem::path& path,std::vector<std::uint64_t>* timestamps=nullptr,int max_frames=1000,const char* diagnostic=nullptr,
           writer_decode_oracle::Status* result=nullptr,const char* requested_decoder=nullptr){
    writer_decode_oracle::Status status;status.decoder_available=false;status.configured=false;status.started=false;status.eos=false;
    const bool h264=path.extension()==".mp4";const char* expected=h264?"avdec_h264":"vp8dec";const char* requested=requested_decoder?requested_decoder:expected;
    gchar* escaped=g_strescape(path.c_str(),nullptr);const std::string launch=std::string("filesrc location=\"")+escaped+"\" ! "+(h264?"qtdemux ! h264parse ! ":"matroskademux ! ")+requested+" name=reference_decoder ! videoconvert ! appsink name=out sync=false";g_free(escaped);
    GError* error=nullptr;GstElement* pipe=gst_parse_launch(launch.c_str(),&error);
    if(error||!pipe){std::cout<<"[writer-reference] factory="<<writer_decode_diagnostics::SafeFactory(requested)<<" reason=decoder-unavailable domain="<<(error?error->domain:0)<<" code="<<(error?error->code:0)<<'\n';if(error)g_error_free(error);if(pipe){gst_element_set_state(pipe,GST_STATE_NULL);gst_object_unref(pipe);}if(result)*result=status;return -1;}
    auto* decoder=gst_bin_get_by_name(GST_BIN(pipe),"reference_decoder");auto* sink=gst_bin_get_by_name(GST_BIN(pipe),"out");
    auto* factory=decoder?gst_element_get_factory(decoder):nullptr;const auto selected=writer_decode_diagnostics::SafeFactory(factory?gst_plugin_feature_get_name(GST_PLUGIN_FEATURE(factory)):nullptr);
    status.decoder_available=decoder&&sink&&selected==expected;
    gboolean output_corrupt=TRUE;
    if(status.decoder_available){if(h264){const auto* property=g_object_class_find_property(G_OBJECT_GET_CLASS(decoder),"output-corrupt");if(property&&G_PARAM_SPEC_VALUE_TYPE(property)==G_TYPE_BOOLEAN&&(property->flags&G_PARAM_WRITABLE)&&(property->flags&G_PARAM_READABLE)){g_object_set(decoder,"output-corrupt",FALSE,nullptr);g_object_get(decoder,"output-corrupt",&output_corrupt,nullptr);status.configured=!output_corrupt;}}else status.configured=true;}
    ReferenceObservation observation;auto* bus=gst_element_get_bus(pipe);gst_bus_set_sync_handler(bus,ReferenceObservation::Bus,&observation,nullptr);
    GstPad* pads[2]={decoder?gst_element_get_static_pad(decoder,"sink"):nullptr,decoder?gst_element_get_static_pad(decoder,"src"):nullptr};gulong probes[2]={0,0};
    ReferenceObservation::PadContext contexts[2]={{&observation,1},{&observation,2}};
    for(unsigned i=0;i<2;++i)if(pads[i])probes[i]=gst_pad_add_probe(pads[i],GST_PAD_PROBE_TYPE_BUFFER,ReferenceObservation::Probe,&contexts[i],nullptr);
    status.configured=status.configured&&pads[0]&&pads[1]&&probes[0]&&probes[1];int count=0;
    if(status.decoder_available&&status.configured){status.started=gst_element_set_state(pipe,GST_STATE_PLAYING)!=GST_STATE_CHANGE_FAILURE;
        if(status.started)while(true){GstSample* sample=gst_app_sink_try_pull_sample(GST_APP_SINK(sink),3*GST_SECOND);if(!sample){status.eos=gst_app_sink_is_eos(GST_APP_SINK(sink));break;}auto* buffer=gst_sample_get_buffer(sample);observation.Buffer(buffer,4);if(timestamps)timestamps->push_back(GST_BUFFER_PTS(buffer));++count;gst_sample_unref(sample);if(count>max_frames){status.limit=true;break;}}
    }
    gst_element_set_state(pipe,GST_STATE_NULL);gst_bus_set_sync_handler(bus,nullptr,nullptr,nullptr);
    status.corrupted=observation.corrupted.load()!=0;status.invalid_pts=observation.invalid_pts.load()!=0;
    {std::lock_guard lock(observation.mu);status.bus_error=observation.error_count!=0;for(std::size_t i=0;i<std::min(observation.error_count,observation.errors.size());++i)std::cout<<"[writer-reference-error] domain="<<observation.errors[i].first<<" code="<<observation.errors[i].second<<'\n';for(std::size_t i=0;i<std::min(observation.warning_count,observation.warnings.size());++i)std::cout<<"[writer-reference-warning] domain="<<observation.warnings[i].first<<" code="<<observation.warnings[i].second<<'\n';}
    std::cout<<"[writer-reference] case="<<(diagnostic?diagnostic:"reference")<<" factory="<<selected<<" output_corrupt_applicable="<<h264<<" output_corrupt="<<(h264?static_cast<int>(output_corrupt):-1)<<" configured="<<status.configured<<" count="<<count<<" eos="<<status.eos<<" corrupt_boundary_bits="<<observation.corrupted.load()<<" invalid_pts_boundary_bits="<<observation.invalid_pts.load()<<" bus_errors="<<observation.error_count<<" bus_warnings="<<observation.warning_count<<" reason="<<writer_decode_oracle::Failure(status)<<'\n';
    for(unsigned i=0;i<2;++i)if(pads[i]){if(probes[i])gst_pad_remove_probe(pads[i],probes[i]);gst_object_unref(pads[i]);}
    gst_object_unref(bus);if(decoder)gst_object_unref(decoder);if(sink)gst_object_unref(sink);gst_object_unref(pipe);
    if(result)*result=status;
    return writer_decode_oracle::Accepted(status)?count:-1;
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
        for(const auto& m:journal.Replay().mutations)if(m.mutation_type==recording::RecordingMutationType::SegmentV2Finalized||
            m.mutation_type==recording::RecordingMutationType::SegmentV2BoundFinalized) {
            auto s=catalog.FindSegmentV2ById(m.entity_id);if(s)out.push_back(*s);
        }
        return out;
    }
    int Frames(const std::vector<recording::RecordingSegmentV2>& segments,bool diagnostic=false) {
        constexpr const char* labels[]={"wr01_h264_0","wr01_h264_1","wr01_h264_2"};std::size_t index=0;
        int n=0;for(const auto& s:segments){const char* label=diagnostic&&index<3?labels[index]:nullptr;
            if(label)std::cout<<"[writer-diag-catalog] case="<<label<<" bytes="<<s.size_bytes<<" sha256="<<writer_decode_diagnostics::SafeFactory(s.checksum_sha256.c_str())<<" media_start="<<s.media_start_pts<<" media_end="<<(s.media_end_pts?std::to_string(*s.media_end_pts):"unknown")<<'\n';
            const int k=Decode(root/"channel-1"/(s.segment_id+(s.container=="mp4"?".mp4":".webm")),nullptr,1000,label);if(k<0)return -1;n+=k;++index;}return n;
    }
};
bool Run(Store& store,const Encoded& input,std::int64_t duration=2000,bool repeat=false) {
    recording::GStreamerSegmentWriter writer(store.Options(duration));std::string error;bool callback=false;
    if(!writer.Start("channel-1","legacy-epoch",input.descriptor,[&](auto,auto,auto*){callback=true;return true;},&error))return false;
    for(const auto& p:input.packets){writer.Push(p,-9999);if(repeat)writer.Push(p,9999);}
    const bool snapshot=static_cast<bool>(writer.TimeSnapshot());writer.Stop();return !callback&&!snapshot;
}
bool HasUnknown(const std::vector<recording::RecordingSegmentV2>& segments) {
    for(const auto& s:segments)for(const auto& m:s.mappings)if(m.provenance=="unknown")return true;
    return false;
}
int DecodeOracleTests(){
    using namespace writer_decode_oracle;
    const std::vector<std::uint64_t> expected{200,300,400,500};
    Check(MatchesPresentation(expected,expected),"WR-OR01 exact presentation PTS is accepted");
    const std::vector<std::uint64_t> duplicate{0,100,100,200};
    Check(MatchesPresentation(duplicate,duplicate),"WR-OR02 legitimate duplicate PTS is preserved");
    Check(Presentation({400,200,500,300})==expected,"WR-OR02 input presentation order is independent of decode order");
    Check(!MatchesPresentation(expected,{200,300,300,500}),"WR-OR01 same-count middle duplicate is rejected");
    Check(!MatchesPresentation(expected,{200,300,500,600}),"WR-OR01 same-count middle omission is rejected");
    const Status clean;Check(Accepted(clean),"WR-OR03 clean reference lifecycle is accepted");
    auto value=clean;value.decoder_available=false;Check(!Accepted(value),"WR-OR03 missing required decoder is rejected");
    value=clean;value.configured=false;Check(!Accepted(value),"WR-OR03 incorrect decoder configuration is rejected");
    value=clean;value.started=false;Check(!Accepted(value),"WR-OR03 PLAYING failure is rejected");
    value=clean;value.bus_error=true;Check(!Accepted(value),"WR-OR03 bus ERROR is rejected");
    value=clean;value.corrupted=true;Check(!Accepted(value),"WR-OR03 corrupted buffer is rejected");
    value=clean;value.invalid_pts=true;Check(!Accepted(value),"WR-OR03 invalid presentation timestamp is rejected");
    value=clean;value.eos=false;Check(!Accepted(value),"WR-OR03 missing EOS is rejected");
    value=clean;value.limit=true;Check(!Accepted(value),"WR-OR03 frame limit exhaustion is rejected");
    std::cout<<"[summary] pass="<<passes<<" fail="<<failures<<'\n';return failures?1:0;
}
int DecoderComparison(const std::filesystem::path& root,bool only_bframes=false){
    const auto need=[](bool ok){if(!ok)throw std::runtime_error("decoder-comparison-prepare");};
    // 생성은 각 입력/저장소당 한 번만 수행한다. 이후 round에서는 이 네 파일만 읽는다.
    const auto h264=only_bframes?Encoded{}:Encode(true,60),bframes=Encode(true,30,true);
    if(!only_bframes)writer_decode_diagnostics::InputRows("comparison_wr01",h264);
    writer_decode_diagnostics::InputRows("comparison_wr05",bframes);
    Store normal(root/"decoder-comparison-normal"),reordered(root/"decoder-comparison-bframes");
    if(!only_bframes)need(Run(normal,h264));
    need(Run(reordered,bframes,100000));const auto normal_segments=normal.Segments(),reordered_segments=reordered.Segments();
    need((only_bframes||normal_segments.size()==3)&&reordered_segments.size()==1&&reordered_segments[0].media_start_pts==0&&HasUnknown(reordered_segments));
    need(!bframes.packets.empty()&&bframes.packets.front().observation&&bframes.packets.front().observation->pts_ns&&*bframes.packets.front().observation->pts_ns==200000000);
    struct FileCase {const char* label;std::filesystem::path path;int frames;std::uint64_t expected_first;writer_decode_diagnostics::FileFacts fixed;};
    std::vector<FileCase> files;constexpr const char* labels[]={"comparison_wr01_0","comparison_wr01_1","comparison_wr01_2"};
    const auto add=[&](const char* label,Store& store,const recording::RecordingSegmentV2& segment,int frames,std::uint64_t first){
        const auto path=store.root/"channel-1"/(segment.segment_id+".mp4");const auto fixed=writer_decode_diagnostics::File(path);
        need(segment.container=="mp4"&&fixed.hashed&&fixed.bytes==segment.size_bytes&&fixed.sha==segment.checksum_sha256);
        files.push_back({label,path,frames,first,fixed});
        std::cout<<"[decoder-comparison-fixed] case="<<label<<" expected_count="<<frames<<" first_pts_checked="<<(first!=GST_CLOCK_TIME_NONE)<<" expected_first_pts="<<(first==GST_CLOCK_TIME_NONE?0:first)<<" bytes="<<fixed.bytes<<" sha256="<<fixed.sha<<'\n';
    };
    if(!only_bframes)for(std::size_t i=0;i<3;++i)add(labels[i],normal,normal_segments[i],20,GST_CLOCK_TIME_NONE);
    add("comparison_wr05",reordered,reordered_segments[0],30,200000000);
    const auto unchanged=[&](const FileCase& file){const auto now=writer_decode_diagnostics::File(file.path);return now.hashed&&now.bytes==file.fixed.bytes&&now.sha==file.fixed.sha;};
    unsigned attempts=0;
    for(unsigned round=1;round<=16;++round)for(const auto& file:files){
        need(unchanged(file));std::vector<std::uint64_t> timestamps;
        std::cout<<"[decoder-comparison-attempt] round="<<round<<" case="<<file.label<<" decoder=auto\n";
        const int decoded=DecodeDiagnostic(file.path,&timestamps,1000,file.label,true,file.frames,file.expected_first);++attempts;
        need(unchanged(file));const bool matched=decoded==file.frames&&(file.expected_first==GST_CLOCK_TIME_NONE||(!timestamps.empty()&&timestamps.front()==file.expected_first));
        std::cout<<"[decoder-comparison-result] round="<<round<<" case="<<file.label<<" decoder=auto matched="<<matched<<" count="<<decoded<<" first_pts_available="<<!timestamps.empty()<<" first_pts="<<(timestamps.empty()?0:timestamps.front())<<" file_unchanged=1\n";
        if(matched)continue;
        auto* software=gst_element_factory_find("avdec_h264");
        if(!software)std::cout<<"[decoder-comparison-software] case="<<file.label<<" status=not-run reason=factory-unavailable\n";
        else {
            gst_object_unref(software);need(unchanged(file));std::vector<std::uint64_t> software_pts;
            const int decoded_sw=DecodeDiagnostic(file.path,&software_pts,1000,file.label,false,file.frames,file.expected_first,true);
            need(unchanged(file));const bool sw_matched=decoded_sw==file.frames&&(file.expected_first==GST_CLOCK_TIME_NONE||(!software_pts.empty()&&software_pts.front()==file.expected_first));
            std::cout<<"[decoder-comparison-software] case="<<file.label<<" status=observed matched="<<sw_matched<<" count="<<decoded_sw<<" first_pts_available="<<!software_pts.empty()<<" first_pts="<<(software_pts.empty()?0:software_pts.front())<<" file_unchanged=1\n";
        }
        std::cout<<"[decoder-comparison-summary] outcome=auto-failure original_failure_preserved=1 auto_attempts="<<attempts<<'\n';return 1;
    }
    std::cout<<"[decoder-comparison-summary] outcome=not-reproduced rounds=16 files="<<files.size()<<" auto_attempts="<<attempts<<" software_attempts=0 cause_resolved=0\n";return 3;
}

#include "recording_mixed_generation_fixture.h"

// R98: 고정 혼합 입력을 그대로 demux하고, 각 key 시작점의 정상 Stop prefix를
// 실제 managed writer에 전달한다. 이 관측은 임의 입력의 출력 상한이 아니다.
Encoded MixedInput(const std::filesystem::path& root,const std::filesystem::path& original={}) {
    const auto need=[](bool ok,const char* why){if(!ok)throw std::runtime_error(why);};
    const auto file=root/"mixed-input.mp4";
    const std::string generation="videotestsrc num-buffers=120 pattern=ball ! video/x-raw,format=I420,width=160,height=90,framerate=30/1 ! x264enc tune=zerolatency speed-preset=ultrafast pass=quant quantizer=0 key-int-max=30 ! h264parse ! mp4mux ! filesink location=\""+file.string()+"\"";
    GError* error=nullptr;GstElement* pipeline=nullptr;
    if(original.empty()){pipeline=gst_parse_launch(generation.c_str(),&error);
    need(pipeline&&!error,"mixed-generate-parse");need(gst_element_set_state(pipeline,GST_STATE_PLAYING)!=GST_STATE_CHANGE_FAILURE,"mixed-generate-start");
    auto* bus=gst_element_get_bus(pipeline);auto* message=gst_bus_timed_pop_filtered(bus,10*GST_SECOND,static_cast<GstMessageType>(GST_MESSAGE_EOS|GST_MESSAGE_ERROR));
    const bool eos=message&&GST_MESSAGE_TYPE(message)==GST_MESSAGE_EOS;
    if(message)gst_message_unref(message);
    gst_object_unref(bus);gst_element_set_state(pipeline,GST_STATE_NULL);gst_object_unref(pipeline);need(eos,"mixed-generate-eos");
    }else std::filesystem::copy_file(original,file);
    pipeline=gst_parse_launch(("filesrc location=\""+file.string()+"\" ! qtdemux ! h264parse config-interval=-1 ! appsink name=out sync=false").c_str(),&error);
    need(pipeline&&!error,"mixed-demux-parse");auto* sink=gst_bin_get_by_name(GST_BIN(pipeline),"out");need(sink,"mixed-demux-sink");
    need(gst_element_set_state(pipeline,GST_STATE_PLAYING)!=GST_STATE_CHANGE_FAILURE,"mixed-demux-start");
    Encoded input;std::uint64_t payload=0,max_packet=0;
    for(unsigned i=0;;++i){auto* sample=gst_app_sink_try_pull_sample(GST_APP_SINK(sink),3*GST_SECOND);
        if(!sample){need(gst_app_sink_is_eos(GST_APP_SINK(sink)),"mixed-demux-eos");break;}
        auto* b=gst_sample_get_buffer(sample);need(i<120&&GST_BUFFER_PTS_IS_VALID(b)&&GST_BUFFER_DTS_IS_VALID(b)&&GST_BUFFER_DURATION_IS_VALID(b),"mixed-packet-time");
        media::Packet p;p.kind=media::MediaKind::Video;p.codec=media::CodecId::H264;p.track_id="video-0";
        p.is_key_frame=!GST_BUFFER_FLAG_IS_SET(b,GST_BUFFER_FLAG_DELTA_UNIT);p.pts=GST_BUFFER_PTS(b);p.dts=GST_BUFFER_DTS(b);
        p.payload.resize(gst_buffer_get_size(b));gst_buffer_extract(b,0,p.payload.data(),p.payload.size());payload+=p.payload.size();max_packet=std::max(max_packet,std::uint64_t(p.payload.size()));
        media::SampleObservation o;o.source_generation="mixed-bound";o.generation_order=1;o.ordinal=i+1;o.pts_ns=p.pts;o.dts_ns=p.dts;o.duration_ns=GST_BUFFER_DURATION(b);p.observation=o;
        if(input.descriptor.tracks.empty()){auto* caps=gst_caps_to_string(gst_sample_get_caps(sample));input.descriptor.tracks.push_back({"video-0",media::MediaKind::Video,p.codec,"h264",caps,0,0});g_free(caps);}
        input.packets.push_back(std::move(p));gst_sample_unref(sample);
    }
    gst_element_set_state(pipeline,GST_STATE_NULL);gst_object_unref(sink);gst_object_unref(pipeline);
    need(input.packets.size()==120&&payload<1024*1024,"mixed-input-count-size");

    (void)max_packet;return input;
}
int MixedFixtureBound(const std::filesystem::path& root,bool direct=false,bool generation_direct=false) {
    const auto need=[](bool ok,const char* why){if(!ok)throw std::runtime_error(why);};
    const auto file=root/"mixed-input.mp4";
    auto input=MixedInput(root);std::uint64_t payload=0,max_packet=0;
    for(const auto& packet:input.packets){payload+=packet.payload.size();max_packet=std::max(max_packet,std::uint64_t(packet.payload.size()));}
    if(generation_direct)return MixedGeneration(root,input);
    if(direct){
        constexpr std::uint64_t E=recording_mixed_fixture::kReserved,S=recording_mixed_fixture::kSegmentBytes,H=643*S,P=S;
        constexpr std::uint64_t Q=((E+H+P+1024*1024-1)/(1024*1024))*1024*1024;
        ::setenv("MEDIA_SERVER_VERIFY_RECORDING_RESOURCE_TRACE","1",1);
        recording::RecordingResourceTrace resource;Store store(root/"continuous");need(resource.Bind(store.catalog.SearchResidency(),store.catalog.ScratchResidency()),"continuous-resource-bind");Encoded half=input;half.packets.resize(60);need(Run(store,half),"continuous-seed");
        auto seeds=store.Segments();need(seeds.size()==1&&seeds[0].size_bytes<=S,"continuous-seed-bound");
        const auto seed=seeds[0];const auto seedpath=store.root/"channel-1"/(seed.segment_id+".mp4");
        std::string error;std::vector<std::string> held{seed.segment_id};
        need(store.catalog.AdjustHoldCount(seed.segment_id,1,&error),"continuous-seed-hold");
        const auto add=[&](const std::string& id,bool hold){
            auto row=seed;row.segment_id=id;row.order_request_id="order-"+id;row.media_epoch_id="epoch-"+id;
            recording::RecordingOrderReservationV1 order;need(store.catalog.ReserveRecordingOrder(row.store_id,row.order_request_id,id,row.channel_id,&order,&error),"continuous-reserve-order");row.order_sequence=order.sequence;
            const auto path=store.root/"channel-1"/(id+".mp4");std::filesystem::copy_file(seedpath,path);
            need(store.catalog.FinalizeSegmentV2(row,path.string(),&error),"continuous-finalize-clone");
            if(hold){need(store.catalog.AdjustHoldCount(id,1,&error),"continuous-hold");held.push_back(id);}
        };
        for(unsigned n=1;n<643;++n)add("held-"+std::to_string(n),true);
        const auto filler=(Q-E-643*seed.size_bytes)/seed.size_bytes+2;
        for(std::uint64_t n=0;n<filler;++n)add("safe-"+std::to_string(n),false);
        unsigned deleted=0;
        recording::RetentionCoordinator coordinator(store.catalog,[&]{return store.catalog.RetentionSnapshot();},
            [&](auto* bytes,auto*){*bytes=std::filesystem::space(store.root).available;return true;},
            [&](const auto& file,auto* e){const bool ok=recording::RemoveContainedMediaFile(store.root,file,e,{},true);if(ok)++deleted;return ok;},{0,E,store.root});
        recording::RetentionPolicy policy;policy.continuous_max_bytes=Q;policy.event_max_bytes=128ULL*1024*1024;
        need(coordinator.UpdateChannelPolicy("channel-1",policy,&error),"continuous-policy");
        auto options=store.Options();unsigned allowed=0,denied=0,completed=0;
        options.admit_segment=[&](const auto& channel,std::uint64_t minimum){const auto a=coordinator.AdmitContinuousWrite(channel,minimum,10000);a.allowed?++allowed:++denied;return recording::SegmentAdmissionDecision{a.allowed,a.start_new_epoch,a.reserved_bytes};};
        options.report_segment_progress=[&](const auto& channel,std::uint64_t bytes){coordinator.UpdateContinuousWriteProgress(channel,bytes);};
        options.complete_segment=[&](const auto& channel,std::uint64_t bytes){++completed;coordinator.CompleteContinuousWrite(channel,bytes);};
        recording::GStreamerSegmentWriter writer(options);need(writer.Start("channel-1","continuous",half.descriptor,[](auto,auto,auto*){return false;},&error),"continuous-writer-start");
        for(auto p:half.packets){p.observation->source_generation="continuous-new";p.observation->generation_order=2;writer.Push(p,0);}writer.Stop();
        need(allowed==1&&denied==0&&completed==1&&deleted>0&&!coordinator.ChannelStatus("channel-1").storage_blocked,"continuous-writer-progress");
        bool original=true;for(const auto& id:held){const auto file=store.root/"channel-1"/(id+".mp4");const auto raw=Read(file);
            auto* sha=g_compute_checksum_for_data(G_CHECKSUM_SHA256,reinterpret_cast<const guchar*>(raw.data()),raw.size());
            original=original&&!store.catalog.IsDeletedSegmentId(id)&&raw.size()==seed.size_bytes&&sha&&seed.checksum_sha256==sha;g_free(sha);}
        need(original,"continuous-protected-originals");
        const auto all=store.Segments();std::vector<recording::RecordingSegmentV2> fresh;
        for(const auto& row:all)if(row.segment_id!=seed.segment_id&&row.segment_id.rfind("held-",0)!=0&&row.segment_id.rfind("safe-",0)!=0)fresh.push_back(row);
        need(fresh.size()==1&&store.Frames(fresh)==60,"continuous-fresh-decode");
        const auto excess=(Q-E)/seed.size_bytes+1-643;
        for(std::uint64_t n=0;n<excess;++n)add("excess-"+std::to_string(n),true);
        // 회수 가능한 나머지는 실제 retention이 처리한다. 보호량만으로 부족하면 예약0/거부다.
        const auto rejected=coordinator.AdmitContinuousWrite("channel-1",E,10001);
        need(!rejected.allowed&&rejected.reserved_bytes==0&&coordinator.ChannelStatus("channel-1").storage_blocked,"continuous-excess-refused");
        for(const auto& id:held)need(!store.catalog.IsDeletedSegmentId(id)&&store.catalog.AdjustHoldCount(id,-1,&error),"continuous-release");
        const auto resumed=coordinator.AdmitContinuousWrite("channel-1",E,10002);need(resumed.allowed,"continuous-resume");coordinator.CompleteContinuousWrite("channel-1",0);
        need(store.journal.Finish(&error),"continuous-finish");
        std::cout<<"[R98-continuous] quota="<<Q<<" E="<<E<<" H="<<H<<" P="<<P<<" M="<<Q-E-H-P<<" heldFiles=643 heldActualBytes="<<643*seed.size_bytes<<" segmentBytes="<<seed.size_bytes<<" safeFiles="<<filler<<" deleted="<<deleted<<" excessHeldFiles="<<excess<<" completed="<<completed<<" decoded=60 finish=1\n";
        return 0;
    }
    std::uint64_t max_output=0;unsigned cases=0,decoded=0;
    for(std::size_t begin=0;begin<input.packets.size();++begin){if(!input.packets[begin].is_key_frame)continue;
        std::size_t end=begin+1;for(;end<input.packets.size();++end)if(input.packets[end].is_key_frame&&input.packets[end].dts-input.packets[begin].dts>=2000000000LL)break;
        for(std::size_t stop=begin+1;stop<=end;++stop){Encoded part;part.descriptor=input.descriptor;part.packets.assign(input.packets.begin()+begin,input.packets.begin()+stop);
            Store store(root/("prefix-"+std::to_string(begin)+"-"+std::to_string(stop)));need(Run(store,part),"mixed-write");
            const auto rows=store.Segments();need(rows.size()==1,"mixed-one-segment");max_output=std::max(max_output,rows[0].size_bytes);++cases;
            if(stop==end){need(store.Frames(rows)==int(stop-begin),"mixed-decode");++decoded;}
            std::string finish;need(store.journal.Finish(&finish),"mixed-finish");
        }
    }
    need(max_output<=36*1024,"mixed-segment-bound");
    std::cout<<"[R98-input] fileBytes="<<std::filesystem::file_size(file)<<" packets="<<input.packets.size()<<" payloadBytes="<<payload<<" maxPacketBytes="<<max_packet<<" stopCases="<<cases<<" decodedMaximalRanges="<<decoded<<" maxOutputBytes="<<max_output<<" callerMinimumMax="<<max_packet+1024*1024<<'\n';
    return 0;
}
int MixedTransitions(const std::filesystem::path& root,const std::filesystem::path& original) {
    const auto need=[](bool ok,const std::string& why){if(!ok)throw std::runtime_error(why);};
    auto input=MixedInput(root,original);
    need(input.packets.size()==120,"transition-input-count");
    for(unsigned scenario=0;scenario<6;++scenario){
        Encoded chosen;chosen.descriptor=input.descriptor;
        for(const auto& packet:input.packets){const auto n=packet.observation->ordinal;
            const bool select=scenario==0||scenario==4?(n==1||(n>=17&&n<=60)||(n>=73&&n<=90)):
                scenario==1?(n!=61&&n!=91):scenario==2?(n%2==1&&n!=61&&n!=91):
                scenario==3?(n>=31&&n!=91):true;
            if(select)chosen.packets.push_back(packet);
        }
        if(scenario==4)for(auto packet:input.packets){packet.observation->source_generation="mixed-next-loop";packet.observation->generation_order=2;chosen.packets.push_back(std::move(packet));}
        Store store(root/("transition-"+std::to_string(scenario)));
        need(Run(store,chosen),"transition-writer");const auto rows=store.Segments();
        // R116: 손실 전 prefix는 보존하고 누락 뒤 delta는 다음 실제 keyframe까지 미수용.
        const std::size_t expected_segments[]={2,1,2,1,4,2};
        need(rows.size()==expected_segments[scenario],"transition-segment-count");
        std::size_t observed=0;std::string error;
        std::set<std::pair<std::string,std::uint64_t>> expected,actual;
        std::string generation;std::uint64_t ordinal=0;bool waiting=true;
        for(const auto& packet:chosen.packets){const auto& o=*packet.observation;
            if(generation!=o.source_generation){generation=o.source_generation;ordinal=0;waiting=true;}
            if(ordinal&&o.ordinal!=ordinal+1)waiting=true;
            ordinal=o.ordinal;
            if(waiting&&!packet.is_key_frame)continue;
            waiting=false;
            need(expected.emplace(o.source_generation,o.ordinal).second,"transition-input-unique");
        }
        for(const auto& row:rows){auto binding=store.catalog.FindSourceBinding(row.segment_id);
            need(binding&&binding->file_evidence&&binding->index_complete,"transition-file-evidence");
            const auto file=store.root/"channel-1"/(row.segment_id+".mp4");
            const int fd=open(file.c_str(),O_RDONLY|O_CLOEXEC|O_NOFOLLOW);need(fd>=0,"transition-open");
            const bool verified=recording::VerifyRecordingFileEvidenceFd(fd,*binding,&error);
            recording::VisualRgbFrame frame;const auto target=binding->file_evidence->samples.front().mux_pts_ns;
            const bool decoded=verified&&recording::DecodeVisualFrame(fd,row.size_bytes,target,&frame,&error,{},5000,recording::VisualDecodePolicy::SoftwareOnly);
            const auto close_code=close(fd);need(verified&&decoded&&frame.presentation_ns==target&&close_code==0,"transition-file-proof-key-frame:"+error);
            need(row.size_bytes<=recording_mixed_fixture::kSegmentBytes,"transition-new-bound");
            for(const auto& sample:binding->samples){
                need(actual.emplace(binding->source_generation,sample.ordinal).second,"transition-output-duplicate");
                const auto found=std::find_if(chosen.packets.begin(),chosen.packets.end(),[&](const auto& packet){return packet.observation->source_generation==binding->source_generation&&packet.observation->ordinal==sample.ordinal;});
                need(found!=chosen.packets.end()&&sample.pts_ns==found->observation->pts_ns,"transition-original-ordinal-time");
                const auto evidence=std::find_if(binding->file_evidence->samples.begin(),binding->file_evidence->samples.end(),[&](const auto& item){return item.ordinal==sample.ordinal;});
                auto* digest=g_compute_checksum_for_data(G_CHECKSUM_SHA256,found->payload.data(),found->payload.size());
                const bool exact=evidence!=binding->file_evidence->samples.end()&&digest&&evidence->sample_sha256==digest&&evidence->original_pts_ns==found->pts&&evidence->original_dts_ns==found->dts;
                g_free(digest);need(exact,"transition-original-AU-hash");++observed;
            }
            std::cout<<"[R114-segment] case="<<scenario<<" file="<<file.string()<<" bytes="<<row.size_bytes<<" samples="<<binding->samples.size()<<" generation="<<binding->generation_order<<" end="<<row.media_end_pts.value_or(-1)<<std::endl;
        }
        need(observed==expected.size()&&actual==expected,"transition-contiguous-keyframe-ranges");
        // R114 원래 63 AU/36KiB 반례는 당시 archive에 유지한다. 이 경로는 새 손실 처리 검사다.
        if(scenario==0)need(observed==31,"transition-gap-not-published-as-continuous");
        if(scenario==5)need(store.Frames(rows)==120,"transition-normal-decode");
        need(store.journal.Finish(&error),"transition-finish:"+error);
    }
    std::cout<<"[R114-transitions] PASS cases=6 S="<<recording_mixed_fixture::kSegmentBytes<<std::endl;return 0;
}

}
int main(int argc,char** argv) {
    if(argc==4&&std::string(argv[2])=="--mixed-transitions"){gst_init(nullptr,nullptr);try{return MixedTransitions(argv[1],argv[3]);}catch(const std::exception& e){std::cerr<<"[R114-failure] "<<e.what()<<std::endl;return 1;}}
    if(argc==3&&std::string(argv[2])=="--mixed-generation-reopen"){gst_init(nullptr,nullptr);try{return MixedGenerationReopen(argv[1]);}catch(const std::exception& e){std::cerr<<"[R99-failure] "<<e.what()<<std::endl;return 1;}}
    if(argc==3&&std::string(argv[2])=="--mixed-generation"){gst_init(nullptr,nullptr);try{return MixedFixtureBound(argv[1],false,true);}catch(const std::exception& e){std::cerr<<"[R99-failure] "<<e.what()<<std::endl;return 1;}}
    if(argc==3&&(std::string(argv[2])=="--mixed-fixture-bound"||std::string(argv[2])=="--mixed-profile-direct")){gst_init(nullptr,nullptr);try{return MixedFixtureBound(argv[1],std::string(argv[2])=="--mixed-profile-direct");}catch(const std::exception& e){std::cerr<<"[R98-failure] "<<e.what()<<'\n';return 1;}}
    if(argc==3&&std::string(argv[2])=="--decode-oracle-tests")return DecodeOracleTests();
    if(argc==3&&(std::string(argv[2])=="--decoder-comparison"||std::string(argv[2])=="--decoder-comparison-bframes")){
        gst_init(nullptr,nullptr);try{return DecoderComparison(argv[1],std::string(argv[2])=="--decoder-comparison-bframes");}catch(...){std::cout<<"[decoder-comparison-summary] outcome=preparation-failure reason=fixed-comparison-error\n";return 2;}
    }
    if(argc!=2)return 2;
    gst_init(nullptr,nullptr);const std::filesystem::path root(argv[1]);
    try {
        const auto h264=Encode(true),vp8=Encode(false);
        for(const auto& pair:std::vector<std::pair<std::string,const Encoded*>>{{"h264",&h264},{"vp8",&vp8}}) {
            if(pair.first=="h264")writer_decode_diagnostics::InputRows("wr01_h264",*pair.second);
            Store s(root/pair.first);const bool ran=Run(s,*pair.second);auto segments=s.Segments();
            const int frames=ran&&segments.size()==3?s.Frames(segments,pair.first=="h264"):-2;
            std::cout<<"[measure] WR01 codec="<<pair.first<<" ran="<<ran<<" segments="<<segments.size()<<" frames="<<frames<<" decode_attempted="<<(ran&&segments.size()==3)<<'\n';
            Check(ran&&segments.size()==3&&frames==60,"WR01 "+pair.first+" managed segments decode all frames without legacy callback or snapshot");
            bool bound=segments.size()==3;
            std::uint64_t next=1;
            for(const auto& segment:segments) {
                const auto binding=s.catalog.FindSourceBinding(segment.segment_id);
                if(!binding){bound=false;continue;}
                bound=bound&&binding->source_generation=="source-a"&&binding->generation_order==1&&
                    binding->track_id=="video-0"&&binding->media_epoch_id==segment.media_epoch_id&&
                    binding->index_complete&&binding->samples.size()==20;
                for(const auto& sample:binding->samples) {
                    bound=bound&&sample.ordinal==next&&sample.pts_ns==(next-1)*100000000ULL;
                    ++next;
                }
                bound=bound&&binding->last_accepted_ordinal==next-1;
            }
            Check(bound&&next==61,"S10-C321 "+pair.first+" 실제 수락 원본 tuple과 segment 결박");
            if(pair.first=="h264"){
                bool damaged_rejected=false,missing_rejected=false;
                if(ran&&segments.size()==3&&frames==60){
                    const auto original=s.root/"channel-1"/(segments[0].segment_id+".mp4");const auto before=writer_decode_diagnostics::File(original);
                    const auto damaged=s.root/"oracle-truncated.mp4";std::error_code copy_error;std::filesystem::copy_file(original,damaged,copy_error);if(copy_error)throw std::runtime_error("oracle-copy-failed");std::filesystem::resize_file(damaged,before.bytes/2,copy_error);if(copy_error)throw std::runtime_error("oracle-truncate-failed");const auto damaged_bytes=std::filesystem::file_size(damaged,copy_error);if(copy_error)throw std::runtime_error("oracle-size-failed");
                    writer_decode_oracle::Status damaged_status;const int decoded=Decode(damaged,nullptr,1000,"truncated-copy",&damaged_status);const auto after=writer_decode_diagnostics::File(original);
                    damaged_rejected=before.hashed&&before.bytes>128&&after.hashed&&before.sha==after.sha&&before.bytes==after.bytes&&damaged_bytes==before.bytes/2&&decoded<0&&damaged_status.decoder_available&&damaged_status.configured;
                    writer_decode_oracle::Status missing_status;const int missing=Decode(original,nullptr,1000,"missing-decoder",&missing_status,"lp18_missing_required_decoder");const auto final=writer_decode_diagnostics::File(original);
                    missing_rejected=missing<0&&!missing_status.decoder_available&&!missing_status.started&&final.hashed&&final.sha==before.sha&&final.bytes==before.bytes;
                }
                Check(damaged_rejected,"WR-OR04 truncated writer MP4 is rejected and original bytes remain unchanged");
                Check(missing_rejected,"WR-OR04 missing decoder pipeline fails without automatic fallback");
            }
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
        bool bound_generations=gseg.size()==3;
        for(std::size_t i=0;i<gseg.size();++i) {
            const auto b=gs.catalog.FindSourceBinding(gseg[i].segment_id);
            bound_generations=bound_generations&&b&&b->source_generation==(i==0?"source-a":"source-b")&&
                b->generation_order==(i==0?1U:2U)&&b->media_epoch_id==gseg[i].media_epoch_id;
        }
        Check(bound_generations,"S10-C326 세대별 원본 결박 분리");
        Store replay(root/"replay");bool replayed=Run(replay,h264,2000,true);auto rep=replay.Segments();
        Check(replayed&&rep.size()==3&&replay.Frames(rep)==60,"WR07 repeated observations and processing UTC do not duplicate media");
        bool split_binding=rep.size()==3;
        for(std::size_t i=0;i<rep.size();++i) {
            const auto b=replay.catalog.FindSourceBinding(rep[i].segment_id);
            split_binding=split_binding&&b&&b->samples.size()==20&&b->samples.front().ordinal==i*20+1&&
                b->samples.back().ordinal==(i+1)*20&&b->last_accepted_ordinal==(i+1)*20&&
                rep[i].media_epoch_id==rep[0].media_epoch_id;
        }
        Check(split_binding,"S10-C325 분할·재전달의 segment별 수락 범위");
        auto waiting=h264;waiting.packets.erase(waiting.packets.begin(),waiting.packets.begin()+5);
        auto other=waiting.packets.front();other.track_id="other-video";
        waiting.packets.insert(waiting.packets.begin(),other);
        auto empty=waiting.packets[1];empty.payload.clear();waiting.packets.insert(waiting.packets.begin(),empty);
        Store ws(root/"binding-wait");const bool waited=Run(ws,waiting,2000,true);auto wseg=ws.Segments();
        std::uint64_t expected_ordinal=11;bool accepted_only=waited&&ws.Frames(wseg)==50;
        for(const auto& segment:wseg) {
            const auto b=ws.catalog.FindSourceBinding(segment.segment_id);
            if(!b){accepted_only=false;continue;}
            for(const auto& sample:b->samples)accepted_only=(sample.ordinal==expected_ordinal++)&&accepted_only;
        }
        Check(accepted_only&&expected_ordinal==61,"S10-C322 keyframe 대기·다른 track·빈 입력·replay 제외");
        const auto long_input=Encode(false,4100);Store capped_source_store(root/"source-index-cap");
        const bool long_ran=Run(capped_source_store,long_input,1000000);const auto long_segments=capped_source_store.Segments();
        bool bounded=long_ran&&long_segments.size()==1;
        if(bounded) {
            const auto b=capped_source_store.catalog.FindSourceBinding(long_segments[0].segment_id);
            recording::RecordingOriginalResult found;std::string error;
            bounded=b&&b->samples.size()==4096&&b->samples.front().ordinal==1&&b->samples.back().ordinal==4096&&
                !b->index_complete&&b->last_accepted_ordinal==4100&&b->incomplete_reason=="sample-index-cap"&&
                Decode(capped_source_store.root/"channel-1"/(long_segments[0].segment_id+".webm"),nullptr,4100)==4100&&
                capped_source_store.catalog.ResolveOriginalSample("channel-1","channel-1","source-a",1,"video-0",4097,409600000000ULL,&found,&error)&&
                found.exact.empty()&&found.unknown.size()==1;
        }
        Check(bounded,"S10-C324 색인 상한 뒤에도 실제4100프레임 저장·미색인 꼬리 표시");
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
        const auto bframes=Encode(true,30,true);writer_decode_diagnostics::InputRows("wr05_bframes",bframes);Store bs(root/"bframes");bool b_ok=Run(bs,bframes,100000);auto bseg=bs.Segments();
        std::vector<std::uint64_t> decoded_pts;int decoded=-1;
        if(bseg.size()==1){std::cout<<"[writer-diag-catalog] case=wr05_bframes bytes="<<bseg[0].size_bytes<<" sha256="<<writer_decode_diagnostics::SafeFactory(bseg[0].checksum_sha256.c_str())<<" media_start="<<bseg[0].media_start_pts<<" media_end="<<(bseg[0].media_end_pts?std::to_string(*bseg[0].media_end_pts):"unknown")<<'\n';decoded=Decode(bs.root/"channel-1"/(bseg[0].segment_id+".mp4"),&decoded_pts,1000,"wr05_bframes");}
        const auto first_pts=*bframes.packets.front().observation->pts_ns;
        // writer는 첫 AU의 min(PTS,DTS)를 mux 원점으로 뺀다. 관측된 decode 값이나
        // catalog 결과를 기대값으로 쓰지 않고 동일 입력 AU 전체로 presentation을 산출한다.
        const auto mux_origin=std::min(first_pts,bframes.packets.front().observation->dts_ns.value_or(first_pts));
        std::vector<std::uint64_t> expected_presentation;
        for(const auto& packet:bframes.packets){if(!packet.observation||!packet.observation->pts_ns||*packet.observation->pts_ns<mux_origin)throw std::runtime_error("oracle-input-timestamp");expected_presentation.push_back(*packet.observation->pts_ns-mux_origin);}
        expected_presentation=writer_decode_oracle::Presentation(std::move(expected_presentation));
        // 기존 count/첫 PTS/원점 판정과 대기시간을 유지하고 전체 presentation 대조를 추가한다.
        std::cout<<"[measure] WR05 ran="<<b_ok<<" segments="<<bseg.size()
                 <<" media_start_pts="<<(bseg.size()==1?std::to_string(bseg[0].media_start_pts):"unavailable")
                 <<" input_first_pts="<<first_pts<<" decoded_count="<<decoded
                 <<" decoded_pts_count="<<decoded_pts.size()
                 <<" decoded_first_pts="<<(decoded_pts.empty()?"unavailable":std::to_string(decoded_pts.front()))
                 <<" has_unknown="<<HasUnknown(bseg)<<'\n';
        Check(b_ok&&bseg.size()==1&&bseg[0].media_start_pts==0&&first_pts>0&&decoded==30&&!decoded_pts.empty()&&
              decoded_pts.front()==first_pts&&writer_decode_oracle::MatchesPresentation(expected_presentation,decoded_pts)&&HasUnknown(bseg),"WR05 actual H264 reordering preserves decode timestamps and mux origin");
        std::uint64_t maximum_end=0;
        for(const auto& p:bframes.packets)maximum_end=std::max(maximum_end,*p.observation->pts_ns+*p.observation->duration_ns);
        Check(bseg.size()==1&&bseg[0].media_end_pts==static_cast<std::int64_t>(maximum_end),
              "WR05 reordered segment end covers maximum presented frame end");
        const auto bsource=bseg.empty()?std::nullopt:bs.catalog.FindSourceBinding(bseg[0].segment_id);
        bool original_pts=bsource&&bsource->samples.size()==bframes.packets.size();
        if(original_pts)for(std::size_t i=0;i<bframes.packets.size();++i)
            original_pts=original_pts&&bsource->samples[i].ordinal==i+1&&
                bsource->samples[i].pts_ns==*bframes.packets[i].observation->pts_ns;
        Check(original_pts,"S10-C327 실제 B-frame 원본PTS·ordinal 보존");
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
        // R97: real writer attempts under a legitimate hold shortage, then the
        // same writer resumes at the next keyframe after the owning hold releases.
        {
            const auto input=Encode(true,20);Store s(root/"retention-recovery");
            if(!Run(s,input,100000))throw std::runtime_error("R97 writer seed");
            const auto seed=s.Segments();if(seed.size()!=1)throw std::runtime_error("R97 seed count");
            std::string error;const auto id=seed[0].segment_id;
            if(!s.catalog.AdjustHoldCount(id,1,&error))throw std::runtime_error(error);
            recording::RetentionCoordinator coordinator(s.catalog,[&]{return s.catalog.RetentionSnapshot();},
                [](auto* bytes,auto*){*bytes=1024ULL*1024*1024;return true;},
                [&](const auto& file,auto* e){return recording::RemoveContainedMediaFile(s.root,file,e,{},true);},
                {0,64ULL*1024*1024,s.root});
            recording::RetentionPolicy policy;policy.continuous_max_bytes=64ULL*1024*1024+seed[0].size_bytes-1;
            policy.event_max_bytes=134217728;
            if(!coordinator.UpdateChannelPolicy("channel-1",policy,&error))throw std::runtime_error(error);
            auto options=s.Options(100000);unsigned attempts=0,denied=0,allowed=0,completed=0;std::uint64_t completed_bytes=0;
            options.admit_segment=[&](const auto& channel,std::uint64_t minimum) {
                ++attempts;const auto a=coordinator.AdmitContinuousWrite(channel,minimum,10000+attempts);
                a.allowed?++allowed:++denied;
                return recording::SegmentAdmissionDecision{a.allowed,a.start_new_epoch,a.reserved_bytes};
            };
            options.report_segment_progress=[&](const auto& channel,std::uint64_t bytes){coordinator.UpdateContinuousWriteProgress(channel,bytes);};
            options.complete_segment=[&](const auto& channel,std::uint64_t bytes){++completed;completed_bytes=bytes;coordinator.CompleteContinuousWrite(channel,bytes);};
            recording::GStreamerSegmentWriter writer(options);
            if(!writer.Start("channel-1","retry-epoch",input.descriptor,[](auto,auto,auto*){return false;},&error))throw std::runtime_error(error);
            for(unsigned i=0;i<10;++i)writer.Push(input.packets[i],10000+i*100);
            const bool blocked=denied==1&&allowed==0&&completed==0&&coordinator.ChannelStatus("channel-1").storage_blocked&&
                !s.catalog.IsDeletedSegmentId(id)&&s.Segments().size()==1;
            if(!s.catalog.AdjustHoldCount(id,-1,&error))throw std::runtime_error(error);
            for(unsigned i=10;i<20;++i)writer.Push(input.packets[i],10000+i*100);
            writer.Stop();
            std::vector<recording::RecordingSegmentV2> active;
            for(const auto& row:s.catalog.RetentionSnapshot().candidates)if(row.segment_v2&&row.Lifecycle()==recording::RecordingLifecycle::Finalized)active.push_back(*row.segment_v2);
            Check(blocked&&attempts==2&&denied==1&&allowed==1&&completed==1&&completed_bytes>0&&
                  !coordinator.ChannelStatus("channel-1").storage_blocked&&s.catalog.IsDeletedSegmentId(id)&&
                  active.size()==1&&s.Frames(active)==10,
                  "R97-W01 real writer gap10 packets under hold then same-session keyframe recovery10 frames Stop");
            std::cout<<"[R97-writer] inputPackets=20 blockedPackets=10 attempts="<<attempts<<" denied="<<denied<<" allowed="<<allowed<<" completed="<<completed<<" bytes="<<completed_bytes<<'\n';
            if(!s.journal.Finish(&error))throw std::runtime_error(error);
        }
        const auto actual=Encode(true,60,false,true);Store actual_store(root/"actual-probe");bool actual_ok=Run(actual_store,actual);auto actual_segments=actual_store.Segments();
        Check(actual_ok&&actual_segments.size()==3&&actual_store.Frames(actual_segments)==60,
              "WR01 actual appsink observation flows through managed writer and decode");
    }catch(const std::exception& e){Check(false,std::string("fixture setup/execution ")+e.what());}
    std::cout<<"[summary] pass="<<passes<<" fail="<<failures<<'\n';return failures?1:0;
}

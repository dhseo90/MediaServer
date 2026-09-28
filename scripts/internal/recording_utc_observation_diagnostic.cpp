// 파일 용도: 제품 시간 판정을 그대로 관측하는 단기 진단. 절대 시각/파일 경로/원본 식별자는 출력하지 않는다.
#include "recording/recording_writer_time_state.h"
#include "media/gstreamer_sample_observation.h"
#include <gst/app/gstappsink.h>
#include <chrono>
#include <cstdint>
#include <iostream>
#include <map>
#include <stdexcept>
#include <vector>
#include <fcntl.h>
#include <sys/stat.h>
#include <unistd.h>

namespace {
using Observation=media::SampleObservation;
using Segment=recording::RecordingSegmentV2;
using TimeState=recording::RecordingWriterTimeState;
constexpr std::int64_t cadence=33333333;
int passed=0,failed=0;
void Need(bool ok){if(!ok)throw std::runtime_error("utc-diagnostic-fixed");}
std::int64_t Narrow(__int128 value){Need(value>=INT64_MIN&&value<=INT64_MAX);return static_cast<std::int64_t>(value);}
std::int64_t Mid(const Observation& o){return Narrow((static_cast<__int128>(o.mono_before_ns)+o.mono_after_ns)/2);}
std::int64_t Abs(std::int64_t value){Need(value!=INT64_MIN);return value<0?-value:value;}
Observation Sample(int i,std::int64_t jitter=0,std::int64_t utc_step=0){
    Observation o;o.source_generation="synthetic-generation";o.generation_order=1;o.ordinal=i+1;
    o.pts_ns=static_cast<std::uint64_t>(i*cadence);o.dts_ns=o.pts_ns;o.duration_ns=cadence;
    o.clock_process_id="synthetic-clock";o.mono_before_ns=1000000000LL+i*cadence+jitter;o.mono_after_ns=o.mono_before_ns;
    o.observed_utc_ns=1700000000000000000LL+o.mono_before_ns+utc_step;return o;
}
std::vector<Observation> Samples(){std::vector<Observation> result;for(int i=0;i<9;++i)result.push_back(Sample(i));return result;}
Segment Map(const std::vector<Observation>& observations){TimeState state;state.Start(0,"synthetic-segment");
    for(const auto& o:observations){Need(TimeState::Signed(o.pts_ns));state.Accept(o);}Segment segment;state.Finish(&segment);return segment;}
const char* Reason(const std::string& value){
    for(const char* reason:{"media-observation-divergence","clock-comparison-unavailable","clock-unavailable","pts-reordering-or-duplicate",
        "mapping-budget-exceeded","end-duration-unavailable","server-clock-media-extrapolation","decode-preroll","uncertainty-overflow","utc-end-overflow","no-accepted-observation"})if(value==reason)return reason;
    return "other";
}
std::size_t Count(const Segment& segment,const char* provenance){return std::count_if(segment.mappings.begin(),segment.mappings.end(),[&](const auto& m){return m.provenance==provenance;});}
std::size_t Reasons(const Segment& segment,const char* reason){return std::count_if(segment.mappings.begin(),segment.mappings.end(),[&](const auto& m){return m.reason==reason;});}
void Describe(const char* label,const Segment& segment){
    std::map<std::string,std::size_t> reasons;for(const auto& m:segment.mappings)++reasons[Reason(m.reason)];
    std::cout<<"[utc-mappings] {\"case\":\""<<label<<"\",\"count\":"<<segment.mappings.size()<<",\"estimated\":"<<Count(segment,"estimated")
        <<",\"unknown\":"<<Count(segment,"unknown")<<",\"endKnown\":"<<(segment.media_end_pts?"true":"false")<<",\"reasons\":{";
    bool comma=false;for(const auto& [reason,count]:reasons){if(comma)std::cout<<',';comma=true;std::cout<<'"'<<reason<<"\":"<<count;}std::cout<<"}}\n";
}
int Synthetic(){auto& pass=passed;auto& fail=failed;
    const auto check=[&](bool ok,const char* title){std::cout<<(ok?"[pass] ":"[fail] ")<<title<<'\n';ok?++pass:++fail;};
    auto stable=Samples();const auto plain=Map(stable);Describe("stable",plain);
    check(plain.mappings.size()==1&&Count(plain,"estimated")==1&&Count(plain,"unknown")==0&&plain.media_end_pts==9*cadence,"LP23-U01 stable cadence");
    auto jitter=stable;for(int i=0;i<9;++i)jitter[i]=Sample(i,i%2?5000000:0);const auto noisy=Map(jitter);Describe("observation-jitter",noisy);
    check(noisy.mappings.size()==9&&Count(noisy,"unknown")==8&&Count(noisy,"estimated")==1&&Reasons(noisy,"media-observation-divergence")==4&&Reasons(noisy,"clock-comparison-unavailable")==4,"LP23-U02 stable clocks jittered observation");
    bool steps=true;for(const std::int64_t step:{-100000000LL,100000000LL}){auto input=stable;for(int i=4;i<9;++i)input[i]=Sample(i,0,step);const auto result=Map(input);Describe(step<0?"clock-step-back":"clock-step-forward",result);
        steps&=result.mappings.size()==2&&Count(result,"estimated")==2&&Count(result,"unknown")==0&&result.mappings[0].end_pts==4*cadence;}
    check(steps,"LP23-U03 clock steps");
    bool reordered=true;for(bool backwards:{false,true}){auto input=stable;input[4].pts_ns=*input[3].pts_ns-(backwards?1:0);const auto result=Map(input);Describe(backwards?"pts-backward":"pts-duplicate",result);
        reordered&=result.mappings.size()==1&&Count(result,"unknown")==1&&Reasons(result,"pts-reordering-or-duplicate")==1&&result.mappings[0].start_pts==0;}
    check(reordered,"LP23-U04 duplicate and backward PTS");
    bool clocks=true;for(int mode=0;mode<3;++mode){auto input=stable;for(auto& o:input){if(mode==0)o.clock_process_id.clear();else if(mode==1)o.mono_after_ns=o.mono_before_ns-1;else o.mono_after_ns=o.mono_before_ns+5000001;}
        const auto result=Map(input);Describe(mode==0?"clock-identity-missing":mode==1?"clock-bracket-reversed":"clock-bracket-wide",result);
        clocks&=Count(result,"estimated")==0&&Count(result,"unknown")==result.mappings.size()&&Reasons(result,"clock-unavailable")==1;}
    check(clocks,"LP23-U05 invalid clock");
    const auto exact=Map({Sample(0),Sample(1,2000000)}),over=Map({Sample(0),Sample(1,2000001)});Describe("boundary-exact",exact);Describe("boundary-over",over);
    check(exact.mappings.size()==1&&Count(exact,"estimated")==1&&over.mappings.size()==2&&Count(over,"unknown")==2&&Reasons(over,"media-observation-divergence")==1,"LP23-U06 exact error boundary");
    TimeState reset;reset.Start(0,"prior");for(const auto& o:jitter)reset.Accept(o);reset.Start(1000000000LL,"reset");
    for(int i=0;i<2;++i){auto o=Sample(i);o.pts_ns=*o.pts_ns+1000000000ULL;reset.Accept(o);}Segment reset_result;reset.Finish(&reset_result);Describe("reset",reset_result);
    check(reset_result.media_start_pts==1000000000LL&&reset_result.media_end_pts==1000000000LL+2*cadence&&reset_result.mappings.size()==1&&Count(reset_result,"estimated")==1&&reset_result.mappings[0].mapping_id=="reset-m0","LP23-U07 segment reset");
    std::vector<Observation> many;for(int i=0;i<300;++i)many.push_back(Sample(i,0,i%2?100000000:0));const auto capped=Map(many);Describe("mapping-budget",capped);
    auto missing=stable;missing.back().duration_ns.reset();const auto no_end=Map(missing);Describe("missing-duration",no_end);
    TimeState overflow;overflow.Start(INT64_MAX-1,"overflow");auto last=Sample(0);last.pts_ns=INT64_MAX-1;last.duration_ns=10;overflow.Accept(last);Segment overflow_result;overflow.Finish(&overflow_result);Describe("duration-overflow",overflow_result);
    check(capped.mappings.size()==256&&Count(capped,"estimated")==255&&Reasons(capped,"mapping-budget-exceeded")==1&&capped.media_end_pts==300*cadence&&
        !no_end.media_end_pts&&Reasons(no_end,"end-duration-unavailable")==1&&!overflow_result.media_end_pts&&Reasons(overflow_result,"end-duration-unavailable")==1&&
        !TimeState::Signed(std::optional<std::uint64_t>(UINT64_MAX)),"LP23-U08 bounds and absent end");
    std::cout<<"[summary] pass="<<pass<<" fail="<<fail<<'\n';if(fail)std::cerr<<"[utc-diagnostic-error] synthetic-assertion-failed\n";return fail?1:0;
}
struct QuietErrors {
    int saved{-1};
    QuietErrors(){saved=dup(STDERR_FILENO);const int quiet=open("/dev/null",O_WRONLY|O_CLOEXEC);if(saved<0||quiet<0){if(saved>=0)close(saved);if(quiet>=0)close(quiet);throw std::runtime_error("utc-diagnostic-fixed");}
        const bool ok=dup2(quiet,STDERR_FILENO)>=0;close(quiet);if(!ok){close(saved);saved=-1;throw std::runtime_error("utc-diagnostic-fixed");}}
    ~QuietErrors(){if(saved>=0){dup2(saved,STDERR_FILENO);close(saved);}}
};
struct Pipeline {
    GstElement* pipeline{nullptr};GstElement* sink{nullptr};GstElement* source{nullptr};GstBus* bus{nullptr};bool stopped{false};
    bool Stop() noexcept {if(stopped)return true;if(!pipeline){stopped=true;return true;}
        const auto set=gst_element_set_state(pipeline,GST_STATE_NULL);GstState state=GST_STATE_VOID_PENDING,pending=GST_STATE_VOID_PENDING;
        const auto get=gst_element_get_state(pipeline,&state,&pending,GST_SECOND);stopped=set!=GST_STATE_CHANGE_FAILURE&&get!=GST_STATE_CHANGE_FAILURE&&get!=GST_STATE_CHANGE_ASYNC&&state==GST_STATE_NULL;return stopped;}
    ~Pipeline(){Stop();if(bus)gst_object_unref(bus);if(source)gst_object_unref(source);if(sink)gst_object_unref(sink);if(pipeline)gst_object_unref(pipeline);}
    bool Error(){GstMessage* message=gst_bus_pop_filtered(bus,GST_MESSAGE_ERROR);if(!message)return false;gst_message_unref(message);return true;}
};
int File(const char* filename){
    QuietErrors quiet;GError* init_error=nullptr;const bool initialized=gst_init_check(nullptr,nullptr,&init_error);if(init_error)g_error_free(init_error);Need(initialized);
    struct GstRuntime {~GstRuntime(){gst_deinit();}} runtime;
    Pipeline pipeline;GError* parse_error=nullptr;
    pipeline.pipeline=gst_parse_launch("filesrc name=input_source ! qtdemux name=demux demux.video_0 ! queue ! h264parse config-interval=-1 ! appsink name=video_sink emit-signals=false sync=true max-buffers=8 drop=false",&parse_error);
    const bool parsed=!parse_error;if(parse_error)g_error_free(parse_error);Need(parsed&&pipeline.pipeline);
    pipeline.source=gst_bin_get_by_name(GST_BIN(pipeline.pipeline),"input_source");pipeline.sink=gst_bin_get_by_name(GST_BIN(pipeline.pipeline),"video_sink");pipeline.bus=gst_element_get_bus(pipeline.pipeline);
    Need(pipeline.source&&pipeline.sink&&pipeline.bus);g_object_set(pipeline.source,"location",filename,nullptr);
    Need(media::InstallGstreamerSampleObservation(pipeline.sink));
    const auto started=std::chrono::steady_clock::now();const auto deadline=started+std::chrono::seconds(12);
    Need(gst_element_set_state(pipeline.pipeline,GST_STATE_PLAYING)!=GST_STATE_CHANGE_FAILURE);
    TimeState state;std::optional<Observation> first,previous;std::size_t count=0;
    struct Row {std::uint64_t ordinal;std::int64_t pts_delta,mono_delta,utc_delta,residual,displacement,width;};
    std::vector<Row> rows;rows.reserve(250);
    std::int64_t max_residual=0,min_displacement=0,max_displacement=0;
    while(count<250&&std::chrono::steady_clock::now()<deadline){
        Need(!pipeline.Error());GstSample* raw=gst_app_sink_try_pull_sample(GST_APP_SINK(pipeline.sink),100*GST_MSECOND);
        if(!raw){Need(!gst_app_sink_is_eos(GST_APP_SINK(pipeline.sink)));continue;}
        std::unique_ptr<GstSample,decltype(&gst_sample_unref)> sample(raw,gst_sample_unref);
        const auto observed=media::ReadGstreamerSampleObservation(sample.get());Need(observed&&TimeState::Signed(observed->pts_ns)&&TimeState::ClockValid(*observed));
        const auto& o=*observed;const auto pts=static_cast<std::int64_t>(*o.pts_ns);
        if(!first){first=o;state.Start(pts,"observed-segment");}
        Need(o.source_generation==first->source_generation&&o.generation_order==first->generation_order&&o.ordinal==count+1);
        const auto residual=Narrow(static_cast<__int128>(o.observed_utc_ns)-first->observed_utc_ns-(static_cast<__int128>(Mid(o))-Mid(*first)));
        const auto displacement=Narrow(static_cast<__int128>(pts)-*first->pts_ns-(static_cast<__int128>(Mid(o))-Mid(*first)));
        max_residual=std::max(max_residual,Abs(residual));min_displacement=std::min(min_displacement,displacement);max_displacement=std::max(max_displacement,displacement);
        rows.push_back({o.ordinal,previous?Narrow(static_cast<__int128>(pts)-*previous->pts_ns):0,
            previous?Narrow(static_cast<__int128>(Mid(o))-Mid(*previous)):0,
            previous?Narrow(static_cast<__int128>(o.observed_utc_ns)-previous->observed_utc_ns):0,
            residual,displacement,o.mono_after_ns-o.mono_before_ns});
        state.Accept(o);previous=o;++count;
    }
    Need(count==250&&!pipeline.Error());Segment segment;state.Finish(&segment);Need(pipeline.Stop());
    // 관측 도중 stdout을 쓰지 않는다. 정상 NULL 확인 뒤 bounded 상대값만 내보낸다.
    for(const auto& row:rows)std::cout<<"[utc-observation] {\"ordinal\":"<<row.ordinal<<",\"ptsDeltaNs\":"<<row.pts_delta
        <<",\"monoDeltaNs\":"<<row.mono_delta<<",\"utcDeltaNs\":"<<row.utc_delta<<",\"clockResidualNs\":"<<row.residual
        <<",\"mediaDisplacementNs\":"<<row.displacement<<",\"observationWidthNs\":"<<row.width<<"}\n";
    Describe("actual-local-input",segment);
    std::cout<<"[utc-observation-summary] {\"samples\":"<<count<<",\"maxClockResidualNs\":"<<max_residual<<",\"minMediaDisplacementNs\":"<<min_displacement
        <<",\"maxMediaDisplacementNs\":"<<max_displacement<<",\"pipelineNull\":true,\"historicalReproduction\":false}\n";
    ++passed;std::cout<<"[pass] LP23-U09 actual local input\n[summary] pass=1 fail=0\n";return 0;
}
}
int main(int argc,char** argv){
    try{if(argc==2&&std::string(argv[1])=="--synthetic")return Synthetic();if(argc==3&&std::string(argv[1])=="--file")return File(argv[2]);}
    catch(...){++failed;std::cerr<<"[utc-diagnostic-error] observation-or-pipeline-failed\n";std::cout<<"[summary] pass="<<passed<<" fail="<<failed<<'\n';return 1;}
    std::cerr<<"[utc-diagnostic-error] invalid-arguments\n";return 1;
}

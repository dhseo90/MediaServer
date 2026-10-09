// 파일 용도: 독립 appsrc/pread decode 경로. 공유 stream이나 caller FD offset을 바꾸지 않는다.
#include "recording/visual_frame_decoder.h"
#include <algorithm>
#include <array>
#include <cstdio>
#include <cstdlib>
#include <sstream>
#include <atomic>
#include <cerrno>
#include <chrono>
#include <cstring>
#include <mutex>
#include <sys/stat.h>
#include <unistd.h>
#if MEDIA_SERVER_USE_GSTREAMER
#include <gst/app/gstappsrc.h>
#include <gst/app/gstappsink.h>
#include <gst/video/video.h>
#endif
namespace recording {
namespace {
bool Fail(std::string* error,const char* reason){if(error)*error=reason;return false;}
#if MEDIA_SERVER_USE_GSTREAMER
using Clock=std::chrono::steady_clock;
// 전이별 전용 슬롯은 앞선 buffer가 후기 EOS 공간을 소모하지 않는다. probe는 항상 통과한다.
struct DecodeEdges {
    struct Mark {
        std::atomic<unsigned> count{0};std::atomic<std::int64_t> last_us{0};
        std::int64_t first_us{0},a{0},b{0};guint32 seq{0};
        void Put(std::int64_t us,guint32 sequence=0,std::int64_t x=0,std::int64_t y=0){
            if(count.fetch_add(1)==0){first_us=us;seq=sequence;a=x;b=y;}last_us=us;
        }
    };
    struct Port {DecodeEdges* owner{nullptr};unsigned edge{0};};
    Clock::time_point start{Clock::now()};std::atomic<unsigned> phase{0},decoders{0},attached{0},attach_failed{0};
    unsigned pulls{0},empty_pulls{0};
    std::array<std::array<std::array<Mark,6>,3>,3> marks{};
    std::array<Mark,3> async_done{},preroll{},render{},eos_callback{},source_eof{};
    std::array<Port,3> ports{{{this,0},{this,1},{this,2}}};
    struct State {const char* point{nullptr};GstState pc{},pp{},sc{},sp{};int pr{},sr{};guint64 queued{},in{},out{};bool eos{false};std::int64_t us{};};
    std::array<State,5> states{};
    std::int64_t Now()const{return std::chrono::duration_cast<std::chrono::microseconds>(Clock::now()-start).count();}
    static GstPadProbeReturn Probe(GstPad*,GstPadProbeInfo* info,gpointer user){
        auto& p=*static_cast<Port*>(user);auto& t=*p.owner;const auto stage=t.phase.load();
        if(GST_PAD_PROBE_INFO_TYPE(info)&GST_PAD_PROBE_TYPE_BUFFER){auto* b=GST_PAD_PROBE_INFO_BUFFER(info);
            t.marks[stage][p.edge][4].Put(t.Now(),0,GST_BUFFER_PTS_IS_VALID(b)?std::int64_t(GST_BUFFER_PTS(b)):-1,GST_BUFFER_DURATION_IS_VALID(b)?std::int64_t(GST_BUFFER_DURATION(b)):-1);
        }else if(GST_PAD_PROBE_INFO_TYPE(info)&(GST_PAD_PROBE_TYPE_EVENT_DOWNSTREAM|GST_PAD_PROBE_TYPE_EVENT_UPSTREAM|GST_PAD_PROBE_TYPE_EVENT_FLUSH)){
            auto* e=GST_PAD_PROBE_INFO_EVENT(info);unsigned k=6;std::int64_t a=0,b=0;
            switch(GST_EVENT_TYPE(e)){case GST_EVENT_FLUSH_START:k=0;break;case GST_EVENT_FLUSH_STOP:k=1;break;
                case GST_EVENT_SEGMENT:{k=2;const GstSegment* seg=nullptr;gst_event_parse_segment(e,&seg);a=seg->start;b=seg->time;break;}
                case GST_EVENT_EOS:k=3;break;case GST_EVENT_SEEK:k=5;break;default:break;}
            if(k<6)t.marks[stage][p.edge][k].Put(t.Now(),gst_event_get_seqnum(e),a,b);
        }return GST_PAD_PROBE_OK;
    }
    void Attach(GstElement* element,const char* pad,unsigned edge){auto* p=gst_element_get_static_pad(element,pad);if(!p){++attach_failed;return;}
        const auto id=gst_pad_add_probe(p,static_cast<GstPadProbeType>(GST_PAD_PROBE_TYPE_BUFFER|GST_PAD_PROBE_TYPE_EVENT_DOWNSTREAM|GST_PAD_PROBE_TYPE_EVENT_UPSTREAM|GST_PAD_PROBE_TYPE_EVENT_FLUSH),Probe,&ports[edge],nullptr);if(id)++attached;else ++attach_failed;gst_object_unref(p);
    }
    static GstFlowReturn Preroll(GstAppSink*,gpointer user){auto& t=*static_cast<DecodeEdges*>(user);t.preroll[t.phase.load()].Put(t.Now());return GST_FLOW_OK;}
    static GstFlowReturn Render(GstAppSink*,gpointer user){auto& t=*static_cast<DecodeEdges*>(user);t.render[t.phase.load()].Put(t.Now());return GST_FLOW_OK;}
    static void Eos(GstAppSink*,gpointer user){auto& t=*static_cast<DecodeEdges*>(user);t.eos_callback[t.phase.load()].Put(t.Now());}
    void Snapshot(unsigned slot,const char* point,GstElement* pipeline,GstElement* sink){
        auto& s=states[slot];s.point=point;s.us=Now();s.pr=gst_element_get_state(pipeline,&s.pc,&s.pp,0);s.sr=gst_element_get_state(sink,&s.sc,&s.sp,0);
        // 1.28에서 제공되는 읽기 전용 queue 계측. main thread에서만 조회한다.
        g_object_get(sink,"current-level-buffers",&s.queued,"in",&s.in,"out",&s.out,nullptr);s.eos=gst_app_sink_is_eos(GST_APP_SINK(sink));
    }
    void Print(std::ostream& o)const{
        o<<",\"edges\":{\"phases\":\"0-initial,1-seek-dispatched,2-cleanup\",\"decoderInstances\":"<<decoders<<",\"probesAttached\":"<<attached<<",\"probeFailures\":"<<attach_failed<<",\"pulls\":"<<pulls<<",\"emptyPulls\":"<<empty_pulls<<",\"marks\":[";bool comma=false;
        auto emit=[&](const char* edge,unsigned phase,const char* kind,const Mark& m){if(!m.count)return;if(comma)o<<',';comma=true;
            o<<"{\"edge\":\""<<edge<<"\",\"phase\":"<<phase<<",\"kind\":\""<<kind<<"\",\"count\":"<<m.count<<",\"firstUs\":"<<m.first_us<<",\"lastUs\":"<<m.last_us<<",\"firstSeq\":"<<m.seq<<",\"a\":"<<m.a<<",\"b\":"<<m.b<<'}';};
        const char* names[]={"decoder-in","decoder-out","appsink-in"};const char* kinds[]={"flush-start","flush-stop","segment","eos","buffer","seek"};
        for(unsigned ph=0;ph<3;++ph){for(unsigned edge=0;edge<3;++edge)for(unsigned k=0;k<6;++k)emit(names[edge],ph,kinds[k],marks[ph][edge][k]);
            emit("bus",ph,"async-done",async_done[ph]);emit("appsink",ph,"preroll",preroll[ph]);emit("appsink",ph,"render",render[ph]);emit("appsink",ph,"eos-callback",eos_callback[ph]);emit("appsrc",ph,"eof",source_eof[ph]);}
        o<<"],\"states\":[";comma=false;for(const auto& s:states){if(!s.point)continue;if(comma)o<<',';comma=true;
            o<<"{\"point\":\""<<s.point<<"\",\"us\":"<<s.us<<",\"pipeline\":["<<s.pr<<','<<s.pc<<','<<s.pp<<"],\"appsink\":["<<s.sr<<','<<s.sc<<','<<s.sp<<"],\"queued\":"<<s.queued<<",\"in\":"<<s.in<<",\"out\":"<<s.out<<",\"isEos\":"<<s.eos<<'}';}o<<"]}";
    }
};
// 진단은 요청별 고정 공간만 사용한다. callback은 서로 다른 슬롯에 쓰고 NULL 완료 뒤 한 번 출력한다.
struct DecodeTrace {
    struct Event {const char* kind{nullptr};std::int64_t a{0},b{0},c{0},d{0};char text[160]{};};
    DecodeEdges edges;bool enabled,bounded{false},invalid_setting{false},succeeded{false};int fd;std::uint64_t bytes;std::int64_t target;std::uint32_t budget;
    VisualDecodePolicy policy{VisualDecodePolicy::Automatic};
    std::string* error;Clock::time_point started{Clock::now()};
    std::array<Event,32> events{};std::array<Event,16> factories{};
    std::atomic<unsigned> event_count{0},factory_count{0},needs{0},seeks{0},pads{0},samples{0};
    std::atomic<const char*> first{nullptr};std::atomic<bool> bus_seen{false},closing{false};Event bus{},first_event{};
    std::int64_t offset_before{-1},first_pts{-1},last_pts{-1},last_stream{-1};
    struct stat before{};bool before_valid{false},found{false},failed{false},video{false},unsupported{false},null_done{false};
    explicit DecodeTrace(int f,std::uint64_t n,std::int64_t t,std::uint32_t ms,std::string* e)
        :enabled(false),fd(f),bytes(n),target(t),budget(ms),error(e){
        const auto* value=std::getenv("MEDIA_SERVER_VERIFY_FRAME_TRACE");
        bounded=value&&std::strcmp(value,"bounded")==0;enabled=bounded||(value&&std::strcmp(value,"1")==0);
        invalid_setting=value&&*value&&std::strcmp(value,"0")&& !enabled;
        if(enabled){offset_before=::lseek(fd,0,SEEK_CUR);before_valid=::fstat(fd,&before)==0;}
    }
    static void Text(char* out,const char* in){if(!in)return;unsigned i=0;for(;in[i]&&i<159;++i){const unsigned char c=in[i];out[i]=(c>=32&&c<127&&c!='"'&&c!='\\')?char(c):'_';}out[i]=0;}
    void First(const char* value,std::int64_t a=0,std::int64_t b=0,std::int64_t c=0){if(enabled){const char* empty=nullptr;if(first.compare_exchange_strong(empty,value)){first_event.kind=value;first_event.a=a;first_event.b=b;first_event.c=c;}}}
    void Add(const char* kind,std::int64_t a=0,std::int64_t b=0,std::int64_t c=0,std::int64_t d=0,const char* text=nullptr){
        if(!enabled)return;const auto i=event_count.fetch_add(1);if(i>=events.size())return;
        auto& e=events[i];e.kind=kind;e.a=a;e.b=b;e.c=c;e.d=d;Text(e.text,text);
    }
    void Sample(std::int64_t pts,std::int64_t stream){if(!enabled)return;const auto n=samples.fetch_add(1);if(!n)first_pts=pts;last_pts=pts;last_stream=stream;if(n<4)Add("sample",pts,stream,stream<0?INT64_MIN:stream-target);}
    static GstBusSyncReply Bus(GstBus*,GstMessage* message,gpointer user){auto& t=*static_cast<DecodeTrace*>(user);
        if(GST_MESSAGE_TYPE(message)==GST_MESSAGE_ASYNC_DONE)t.edges.async_done[t.edges.phase.load()].Put(t.edges.Now(),gst_message_get_seqnum(message));
        if(GST_MESSAGE_TYPE(message)==GST_MESSAGE_ERROR&&!t.bus_seen.exchange(true)){
            GError* problem=nullptr;gst_message_parse_error(message,&problem,nullptr);t.bus.kind="bus-error";
            if(problem){t.bus.a=problem->domain;t.bus.b=problem->code;g_error_free(problem);}
            Text(t.bus.text,GST_MESSAGE_SRC(message)?GST_OBJECT_NAME(GST_MESSAGE_SRC(message)):"unknown");t.bus.c=t.closing;if(!t.closing)t.First("bus-error",t.bus.a,t.bus.b);
        }return GST_BUS_PASS;
    }
    static void Element(GstBin*,GstBin*,GstElement* element,gpointer user){auto& t=*static_cast<DecodeTrace*>(user);
        auto* factory=gst_element_get_factory(element);if(!factory)return;
        const auto* klass=gst_element_factory_get_metadata(factory,GST_ELEMENT_METADATA_KLASS);
        if(klass&&std::strstr(klass,"Decoder")&&std::strstr(klass,"Video")){++t.edges.decoders;t.edges.Attach(element,"sink",0);t.edges.Attach(element,"src",1);}
        const auto i=t.factory_count.fetch_add(1);if(i>=t.factories.size())return;
        auto& e=t.factories[i];e.kind="factory";const auto* name=gst_plugin_feature_get_plugin_name(GST_PLUGIN_FEATURE(factory));
        auto* plugin=gst_plugin_feature_get_plugin(GST_PLUGIN_FEATURE(factory));
        // 파이프라인이 소유한 factory/plugin 식별만 남긴다. URI·원시 GError/debug는 기록하지 않는다.
        char text[160]{};std::snprintf(text,sizeof(text),"%s:%s:%s",gst_plugin_feature_get_name(GST_PLUGIN_FEATURE(factory)),name?name:"",plugin?gst_plugin_get_version(plugin):"");Text(e.text,text);if(plugin)gst_object_unref(plugin);
    }
    static void Removed(GstBin*,GstBin*,GstElement* element,gpointer user){auto& t=*static_cast<DecodeTrace*>(user);if(t.closing)return;
        auto* factory=gst_element_get_factory(element);if(factory)t.Add("factory-removed",0,0,0,0,gst_plugin_feature_get_name(GST_PLUGIN_FEATURE(factory)));
    }
    // 성공 표본과 실패 기록의 예산을 분리한다. callback 밖에서만 출력하며 실패는 표본 제한을 적용하지 않는다.
    bool SuccessSample()const{
        // 총 세 표본 중 하나를 증거 정책에 예약해 초기 색인 호출이 모두 소모하지 않게 한다.
        static std::array<std::atomic<unsigned>,2> counts{};const bool software=policy==VisualDecodePolicy::SoftwareOnly;
        auto& count=counts[software?1:0];const unsigned limit=software?1:2;unsigned n=count.load();
        while(n<limit){if(count.compare_exchange_weak(n,n+1))return true;}return false;}
    static void OutputFailure(const char* marker){
        // stderr 자체가 실패한 경우 stdout의 별도 수집 경로에 상태만 남긴다. decoder 반환값은 바꾸지 않는다.
        if(std::fputs(marker,stderr)<0||std::fflush(stderr)!=0){std::fputs(marker,stdout);std::fflush(stdout);}
    }
    ~DecodeTrace(){if(invalid_setting){OutputFailure("[visual-frame] trace-config-invalid\n");return;}
      if(!enabled||(bounded&&succeeded&&!SuccessSample()))return;try{
        struct stat after{};const bool valid=::fstat(fd,&after)==0;
        std::ostringstream o;o<<"[visual-frame] {\"mode\":\""<<(bounded?"bounded":"full")<<"\",\"succeeded\":"<<(succeeded?"true":"false")<<",\"target\":"<<target<<",\"fd\":"<<fd<<",\"bytes\":"<<bytes<<",\"budgetMs\":"<<budget
          <<",\"policy\":\""<<(policy==VisualDecodePolicy::SoftwareOnly?"software-only":"automatic")<<"\""
          <<",\"requestStartNs\":"<<std::chrono::duration_cast<std::chrono::nanoseconds>(started.time_since_epoch()).count()<<",\"pid\":"<<::getpid()<<",\"elapsedUs\":"<<std::chrono::duration_cast<std::chrono::microseconds>(Clock::now()-started).count()
          <<",\"offsetBefore\":"<<offset_before<<",\"offsetAfter\":"<<::lseek(fd,0,SEEK_CUR)<<",\"beforeValid\":"<<before_valid<<",\"afterValid\":"<<valid
          <<",\"devBefore\":"<<before.st_dev<<",\"inoBefore\":"<<before.st_ino<<",\"sizeBefore\":"<<before.st_size
          <<",\"mtimeBefore\":"<<before.st_mtime<<",\"ctimeBefore\":"<<before.st_ctime<<",\"mtimeAfter\":"<<after.st_mtime<<",\"ctimeAfter\":"<<after.st_ctime<<",\"devAfter\":"<<after.st_dev<<",\"inoAfter\":"<<after.st_ino<<",\"sizeAfter\":"<<after.st_size
          <<",\"needs\":"<<needs<<",\"seeks\":"<<seeks<<",\"pads\":"<<pads<<",\"samples\":"<<samples
          <<",\"firstPts\":"<<first_pts<<",\"lastPts\":"<<last_pts<<",\"lastStream\":"<<last_stream
          <<",\"failed\":"<<failed<<",\"found\":"<<found<<",\"video\":"<<video<<",\"unsupported\":"<<unsupported<<",\"nullDone\":"<<null_done
          <<",\"first\":\""<<(first.load()?first.load():"")<<"\",\"error\":\""<<(error?*error:"")<<"\",\"events\":[";
        bool comma=false;auto emit=[&](const Event& e){if(comma)o<<',';comma=true;o<<"{\"kind\":\""<<e.kind<<"\",\"a\":"<<e.a<<",\"b\":"<<e.b<<",\"c\":"<<e.c<<",\"d\":"<<e.d<<",\"text\":\""<<e.text<<"\"}";};
        for(unsigned i=0;i<std::min<unsigned>(event_count,events.size());++i)emit(events[i]);
        for(unsigned i=0;i<std::min<unsigned>(factory_count,factories.size());++i)emit(factories[i]);if(bus_seen)emit(bus);if(first.load())emit(first_event);
        o<<"],\"droppedEvents\":"<<(event_count>events.size()?event_count-events.size():0)<<",\"droppedFactories\":"<<(factory_count>factories.size()?factory_count-factories.size():0);edges.Print(o);o<<"}\n";
        const auto line=o.str();if(std::fwrite(line.data(),1,line.size(),stderr)!=line.size()||std::fflush(stderr)!=0)OutputFailure("[visual-frame] trace-output-failed\n");
    }catch(...){OutputFailure("[visual-frame] trace-output-failed\n");}}
};
struct Context {
    int fd;std::uint64_t bytes,offset{0};Clock::time_point deadline;
    std::function<bool()> cancelled;GstElement* pipeline;GstElement* convert;
    DecodeTrace& trace;std::mutex mutex;std::atomic<bool> failed{false},video{false},unsupported{false};
    bool Stop()const{if(Clock::now()>=deadline){trace.First("deadline");return true;}if(cancelled&&cancelled()){trace.First("cancelled");return true;}return false;}
    void Failed(const char* reason){trace.First(reason);failed=true;}
};
void Need(GstAppSrc* source,guint requested,gpointer user){
    auto& c=*static_cast<Context*>(user);std::unique_lock lock(c.mutex);
    if(c.trace.enabled)++c.trace.needs;if(c.trace.needs<=2)c.trace.Add("need",requested,c.offset);
    if(c.Stop()||c.offset>=c.bytes){if(c.trace.enabled)c.trace.edges.source_eof[c.trace.edges.phase.load()].Put(c.trace.edges.Now(),0,c.offset,c.bytes);gst_app_src_end_of_stream(source);return;}
    if(!requested||requested>16*1024*1024){c.Failed("need-size");gst_app_src_end_of_stream(source);return;}
    const auto n=std::size_t(std::min<std::uint64_t>(c.bytes-c.offset,requested));
    GstBuffer* buffer=gst_buffer_new_allocate(nullptr,n,nullptr);GstMapInfo map{};
    if(!buffer||!gst_buffer_map(buffer,&map,GST_MAP_WRITE)){if(buffer)gst_buffer_unref(buffer);c.Failed("buffer-allocation-map");gst_app_src_end_of_stream(source);return;}
    std::size_t got=0;
    while(got<n&&!c.Stop()){
        const auto result=::pread(c.fd,map.data+got,std::min<std::size_t>(n-got,65536),static_cast<off_t>(c.offset+got));
        const int read_error=result<0?errno:0;
        if(result<0&&read_error==EINTR)continue;if(result<=0){c.trace.Add("pread",c.offset+got,result,read_error);c.trace.First(result<0?"pread-error":"pread-eof",c.offset+got,result,read_error);break;}got+=std::size_t(result);
    }
    gst_buffer_unmap(buffer,&map);if(c.trace.needs<=2||got!=n)c.trace.Add("read",c.offset,n,got);
    if(got!=n){gst_buffer_unref(buffer);c.Failed("short-read");gst_app_src_end_of_stream(source);return;}
    GST_BUFFER_OFFSET(buffer)=c.offset;c.offset+=n;GST_BUFFER_OFFSET_END(buffer)=c.offset;lock.unlock();
    const auto flow=gst_app_src_push_buffer(source,buffer);if(c.trace.needs<=2||flow!=GST_FLOW_OK)c.trace.Add("push",flow);if(flow!=GST_FLOW_OK&&flow!=GST_FLOW_FLUSHING){c.trace.First("push-flow",flow);c.Failed("push-flow");}
}
gboolean Seek(GstAppSrc*,guint64 offset,gpointer user){auto& c=*static_cast<Context*>(user);std::lock_guard lock(c.mutex);
    if(c.trace.enabled)++c.trace.seeks;if(offset>c.bytes||c.Stop()){c.trace.Add("seek-data",offset,0);return FALSE;}if(c.trace.seeks<=2)c.trace.Add("seek-data",offset,1);c.offset=offset;return TRUE;}
void Pad(GstElement*,GstPad* pad,gpointer user){
    auto& c=*static_cast<Context*>(user);GstCaps* caps=gst_pad_get_current_caps(pad);
    const char* type=caps&&gst_caps_get_size(caps)?gst_structure_get_name(gst_caps_get_structure(caps,0)):"";
    const bool video=g_str_has_prefix(type,"video/x-raw");if(c.trace.enabled&&video)++c.trace.pads;c.trace.Add("pad",video,0,0,0,type);
    if(video&&caps){int width=0,height=0;const auto* shape=gst_caps_get_structure(caps,0);
        gst_structure_get_int(shape,"width",&width);gst_structure_get_int(shape,"height",&height);c.trace.Add("pad-shape",width,height);
        if(gst_structure_get_int(shape,"width",&width)&&gst_structure_get_int(shape,"height",&height)&&
            (width>4096||height>2160)){c.unsupported=true;c.Failed("pad-geometry");gst_caps_unref(caps);return;}}
    if(caps)gst_caps_unref(caps);
    GstElement* sink=c.convert;
    if(video){if(c.video.exchange(true)){c.Failed("duplicate-video-pad");return;}}
    else{sink=gst_element_factory_make("fakesink",nullptr);if(!sink){c.Failed("fakesink-create");return;}
        g_object_set(sink,"sync",FALSE,"async",FALSE,nullptr);if(!gst_bin_add(GST_BIN(c.pipeline),sink)){gst_object_unref(sink);c.Failed("fakesink-add");return;}}
    GstPad* target=gst_element_get_static_pad(sink,"sink");
    const auto link=target?gst_pad_link(pad,target):GST_PAD_LINK_REFUSED;c.trace.Add("pad-link",link);
    if(link!=GST_PAD_LINK_OK)c.Failed("pad-link");
    if(target)gst_object_unref(target);if(!video&&!gst_element_sync_state_with_parent(sink))c.Failed("fakesink-sync");
}
bool Copy(GstSample* sample,std::int64_t target,VisualRgbFrame* out,DecodeTrace& trace){
    const auto reject=[&](const char* reason){if(trace.samples<=4||std::strcmp(reason,"copy-target"))trace.Add(reason);return false;};
    GstBuffer* buffer=gst_sample_get_buffer(sample);const GstSegment* segment=gst_sample_get_segment(sample);
    if(!buffer||!segment||segment->format!=GST_FORMAT_TIME||!GST_BUFFER_PTS_IS_VALID(buffer)){trace.Sample(-1,-1);return reject("copy-timestamp-segment");}
    const auto pts=gst_segment_to_stream_time(segment,GST_FORMAT_TIME,GST_BUFFER_PTS(buffer));
    trace.Sample(GST_BUFFER_PTS(buffer)<=std::uint64_t(INT64_MAX)?std::int64_t(GST_BUFFER_PTS(buffer)):-1,pts<=std::uint64_t(INT64_MAX)?std::int64_t(pts):-1);
    if(pts==GST_CLOCK_TIME_NONE||pts>std::uint64_t(INT64_MAX)||std::abs(std::int64_t(pts)-target)>1)return reject("copy-target");
    GstVideoInfo info{};if(!gst_video_info_from_caps(&info,gst_sample_get_caps(sample))||GST_VIDEO_INFO_FORMAT(&info)!=GST_VIDEO_FORMAT_RGB)return reject("copy-caps");
    const int width=GST_VIDEO_INFO_WIDTH(&info),height=GST_VIDEO_INFO_HEIGHT(&info);
    if(width<=0||height<=0||width>4096||height>2160||std::uint64_t(width)*height*3>32ULL*1024*1024)return reject("copy-geometry");
    GstVideoFrame frame{};if(!gst_video_frame_map(&frame,&info,buffer,GST_MAP_READ))return reject("copy-map");
    const int stride=GST_VIDEO_FRAME_PLANE_STRIDE(&frame,0);const auto* bytes=static_cast<const std::uint8_t*>(GST_VIDEO_FRAME_PLANE_DATA(&frame,0));
    if(stride<width*3||!bytes){gst_video_frame_unmap(&frame);return reject("copy-stride");}
    try{
        VisualRgbFrame value{width,height,std::int64_t(pts),{}};value.rgb.resize(std::size_t(width)*height*3);
        for(int y=0;y<height;++y)std::memcpy(value.rgb.data()+std::size_t(y)*width*3,bytes+std::size_t(y)*stride,std::size_t(width)*3);
        gst_video_frame_unmap(&frame);*out=std::move(value);return true;
    }catch(...){gst_video_frame_unmap(&frame);return reject("copy-allocation");}
}
#endif
}
bool DecodeVisualFrame(int fd,std::uint64_t bytes,std::int64_t target,VisualRgbFrame* output,
    std::string* error,const std::function<bool()>& cancelled,std::uint32_t budget_ms,VisualDecodePolicy policy){
    if((policy!=VisualDecodePolicy::Automatic&&policy!=VisualDecodePolicy::SoftwareOnly)||fd<0||!output||!bytes||bytes>512ULL*1024*1024||target<0||!budget_ms||budget_ms>5000)return Fail(error,"visual-frame-invalid-request");
#if MEDIA_SERVER_USE_GSTREAMER
    DecodeTrace trace(fd,bytes,target,budget_ms,error);trace.policy=policy;
    struct stat before{};if(::fstat(fd,&before)!=0||!S_ISREG(before.st_mode)||before.st_size<0||std::uint64_t(before.st_size)!=bytes)return Fail(error,"visual-frame-invalid-file");
    const auto deadline=Clock::now()+std::chrono::milliseconds(budget_ms);
    if(cancelled&&cancelled())return Fail(error,"visual-cancelled");
    if(!gst_init_check(nullptr,nullptr,nullptr))return Fail(error,"visual-frame-runtime-unavailable");
    GstElement* pipeline=gst_pipeline_new(nullptr);GstElement* src=gst_element_factory_make("appsrc",nullptr);
    GstElement* decode=gst_element_factory_make("decodebin",nullptr);GstElement* convert=gst_element_factory_make("videoconvert",nullptr);
    GstElement* sink=gst_element_factory_make("appsink",nullptr);
    if(!pipeline||!src||!decode||!convert||!sink){for(auto* p:{pipeline,src,decode,convert,sink})if(p)gst_object_unref(p);return Fail(error,"visual-frame-runtime-unavailable");}
    // 인스턴스 생성 시에만 제한한다. 자동 선택 호출자와 전역 registry/rank는 바꾸지 않는다.
    if(policy==VisualDecodePolicy::SoftwareOnly){
        auto* property=g_object_class_find_property(G_OBJECT_GET_CLASS(decode),"force-sw-decoders");
        gboolean selected=FALSE;
        if(property&&G_PARAM_SPEC_VALUE_TYPE(property)==G_TYPE_BOOLEAN&&(property->flags&G_PARAM_WRITABLE)&&(property->flags&G_PARAM_READABLE)){
            g_object_set(decode,"force-sw-decoders",TRUE,nullptr);g_object_get(decode,"force-sw-decoders",&selected,nullptr);
        }
        if(!selected){for(auto* p:{pipeline,src,decode,convert,sink})gst_object_unref(p);return Fail(error,"visual-frame-software-policy-unavailable");}
    }
    Context context{fd,bytes,0,deadline,cancelled,pipeline,convert,trace,{}};
    GstBus* trace_bus=nullptr;if(trace.enabled){trace_bus=gst_element_get_bus(pipeline);gst_bus_set_sync_handler(trace_bus,DecodeTrace::Bus,&trace,nullptr);g_signal_connect(pipeline,"deep-element-added",G_CALLBACK(DecodeTrace::Element),&trace);g_signal_connect(pipeline,"deep-element-removed",G_CALLBACK(DecodeTrace::Removed),&trace);}
    const auto set_state=[&](GstState value){const auto state=gst_element_set_state(pipeline,value);trace.Add("set-state",value,state);if(state==GST_STATE_CHANGE_FAILURE&&!trace.closing)trace.First("state-change");return state;};
    GstAppSrcCallbacks callbacks{};callbacks.need_data=Need;callbacks.seek_data=Seek;gst_app_src_set_callbacks(GST_APP_SRC(src),&callbacks,&context,nullptr);
    gst_app_src_set_stream_type(GST_APP_SRC(src),GST_APP_STREAM_TYPE_RANDOM_ACCESS);gst_app_src_set_size(GST_APP_SRC(src),bytes);
    g_object_set(src,"format",GST_FORMAT_BYTES,"block",FALSE,"max-bytes",guint64(65536),nullptr);
    GstCaps* caps=gst_caps_from_string("video/x-raw,format=RGB,width=[1,4096],height=[1,2160]");
    gst_app_sink_set_caps(GST_APP_SINK(sink),caps);gst_caps_unref(caps);
    g_object_set(sink,"sync",FALSE,"max-buffers",1,"drop",FALSE,"wait-on-eos",FALSE,nullptr);
    gst_bin_add_many(GST_BIN(pipeline),src,decode,convert,sink,nullptr);g_signal_connect(decode,"pad-added",G_CALLBACK(Pad),&context);
    if(trace.enabled){trace.edges.Attach(sink,"sink",2);GstAppSinkCallbacks sc{};sc.eos=DecodeEdges::Eos;sc.new_preroll=DecodeEdges::Preroll;sc.new_sample=DecodeEdges::Render;gst_app_sink_set_callbacks(GST_APP_SINK(sink),&sc,&trace.edges,nullptr);}
    VisualRgbFrame result;bool found=false;
    const bool linked=gst_element_link(src,decode)&&gst_element_link(convert,sink);
    if(linked&&target>0&&set_state(GST_STATE_PAUSED)!=GST_STATE_CHANGE_FAILURE){
        GstStateChangeReturn state=GST_STATE_CHANGE_ASYNC;
        while(state==GST_STATE_CHANGE_ASYNC&&!context.Stop()&&!context.failed)
            {state=gst_element_get_state(pipeline,nullptr,nullptr,20*GST_MSECOND);if(state!=GST_STATE_CHANGE_ASYNC)trace.Add("get-state",state);}
        if(state==GST_STATE_CHANGE_SUCCESS&&!context.Stop()&&!context.failed){
            // 정확한 이전 keyframe부터 읽는다. target으로 PTS를 clip하지 않고 Copy가 실제 sample 시각을 대조한다.
            // seek 미지원은 기존 시작점 순차 읽기로 돌아가며 같은 전체 5초 예산을 유지한다.
            if(trace.enabled){trace.edges.Snapshot(0,"before-seek",pipeline,sink);trace.edges.phase=1;}
            const auto seeked=gst_element_seek_simple(pipeline,GST_FORMAT_TIME,
                static_cast<GstSeekFlags>(GST_SEEK_FLAG_FLUSH|GST_SEEK_FLAG_ACCURATE|GST_SEEK_FLAG_KEY_UNIT|GST_SEEK_FLAG_SNAP_BEFORE),target);if(trace.enabled)trace.edges.Snapshot(1,"after-seek",pipeline,sink);trace.Add("seek-simple",target,seeked,GST_SEEK_FLAG_FLUSH|GST_SEEK_FLAG_ACCURATE|GST_SEEK_FLAG_KEY_UNIT|GST_SEEK_FLAG_SNAP_BEFORE);
        }
    }
    if(linked&&!context.Stop()&&!context.failed&&set_state(GST_STATE_PLAYING)!=GST_STATE_CHANGE_FAILURE){
        if(trace.enabled)trace.edges.Snapshot(2,"playing-dispatched",pipeline,sink);
        GstBus* bus=gst_element_get_bus(pipeline);
        while(!context.Stop()&&!context.failed){
            GstSample* sample=gst_app_sink_try_pull_sample(GST_APP_SINK(sink),20*GST_MSECOND);
            if(trace.enabled){++trace.edges.pulls;if(!sample)++trace.edges.empty_pulls;}
            if(sample){found=Copy(sample,target,&result,trace);gst_sample_unref(sample);if(found)break;}
            GstMessage* message=gst_bus_pop_filtered(bus,GST_MESSAGE_ERROR);
            if(message){GError* problem=nullptr;gst_message_parse_error(message,&problem,nullptr);
                if(problem&&problem->domain==GST_STREAM_ERROR&&problem->code==GST_STREAM_ERROR_CODEC_NOT_FOUND)context.unsupported=true;
                if(problem)g_error_free(problem);context.Failed("bus-error");gst_message_unref(message);break;}
            if(!sample&&gst_app_sink_is_eos(GST_APP_SINK(sink))){if(trace.enabled)trace.edges.Snapshot(3,"eos-exit",pipeline,sink);trace.First("eos-no-target");break;}
        }
        gst_object_unref(bus);
    }
    trace.found=found;trace.failed=context.failed;trace.video=context.video;trace.unsupported=context.unsupported;
    if(trace.enabled){trace.edges.Snapshot(4,"before-cleanup",pipeline,sink);trace.edges.phase=2;}
    trace.closing=true;const auto null_state=set_state(GST_STATE_NULL);trace.null_done=null_state!=GST_STATE_CHANGE_FAILURE;
    if(trace_bus){gst_bus_set_sync_handler(trace_bus,nullptr,nullptr,nullptr);gst_object_unref(trace_bus);}gst_object_unref(pipeline);
    if(context.Stop())return Fail(error,cancelled&&cancelled()?"visual-cancelled":"visual-frame-timeout");
    struct stat after{};
#ifdef __APPLE__
    const auto bm=before.st_mtimespec,bc=before.st_ctimespec;
#else
    const auto bm=before.st_mtim,bc=before.st_ctim;
#endif
    if(::fstat(fd,&after)!=0)return Fail(error,"visual-frame-file-changed");
#ifdef __APPLE__
    const auto am=after.st_mtimespec,ac=after.st_ctimespec;
#else
    const auto am=after.st_mtim,ac=after.st_ctim;
#endif
    if(bm.tv_nsec!=am.tv_nsec||bc.tv_nsec!=ac.tv_nsec||before.st_dev!=after.st_dev||before.st_ino!=after.st_ino||before.st_size!=after.st_size||
        before.st_mtime!=after.st_mtime||before.st_ctime!=after.st_ctime)return Fail(error,"visual-frame-file-changed");
    if(context.unsupported)return Fail(error,"visual-frame-unsupported");
    if(context.failed||!found)return Fail(error,"visual-frame-unavailable");
    *output=std::move(result);if(error)error->clear();trace.succeeded=true;return true;
#else
    (void)cancelled;return Fail(error,"visual-frame-disabled");
#endif
}
} // namespace recording

// 실제 RTSP builder graph 경계 검사. 네트워크/클라이언트 end-to-end 검사가 아니다.
#include "recording_media_test_fixture.h"
#include "ingress/gst_pipeline_builder.h"
#include "core/gst_decode_compatibility.h"
#include <gst/app/gstappsrc.h>
#include <array>
#include <chrono>
#include <cstdlib>
#include <mutex>
#include <cstdio>
#include <sys/stat.h>
#include <unistd.h>
#include <string_view>
#include <thread>
#include <memory>
#include <atomic>
#if defined(__APPLE__)
#include <TargetConditionals.h>
#endif

namespace {
#if defined(__APPLE__) && TARGET_OS_OSX
constexpr bool kHostMacos=true;
#else
constexpr bool kHostMacos=false;
#endif
using Points = std::vector<guint64>;
enum class DrainKind { Ignore,Unsupported,DrainCall,SetDraining,WaitStart,ClearDraining,CallbackFrame,PushFrame,PushReturn,FinishFrame,Decreasing,SessionCreateError,RequestEos,BoundaryBuffer,BoundaryEos };
struct DrainRow { DrainKind kind=DrainKind::Ignore;guint64 a=0,b=0;unsigned boundary=0;bool after_request=false;guint64 c=0,d=0,e=0; };
bool Take(std::string_view& text,std::string_view prefix) {
    if(text.substr(0,prefix.size())!=prefix)return false;
    text.remove_prefix(prefix.size());return true;
}
bool Number(std::string_view& text,guint64& value) {
    value=0;unsigned count=0;
    while(!text.empty()&&text.front()>='0'&&text.front()<='9') {
        const unsigned digit=static_cast<unsigned>(text.front()-'0');
        if(value>(G_MAXUINT64-digit)/10)return false;
        value=value*10+digit;text.remove_prefix(1);++count;
    }
    return count!=0;
}
bool PointerToken(std::string_view& text) {
    if(Take(text,"(nil)"))return true;
    if(!Take(text,"0x"))return false;
    unsigned count=0;
    while(!text.empty()&&g_ascii_isxdigit(static_cast<guchar>(text.front()))) {text.remove_prefix(1);++count;}
    return count>0&&count<=2*sizeof(void*);
}
bool Timestamp(std::string_view& text,guint64& value) {
    guint64 hours=0,minutes=0,seconds=0,nanos=0;
    if(!Number(text,hours)||!Take(text,":"))return false;
    if(text.size()<3||text[2]!=':'||!Number(text,minutes)||!Take(text,":"))return false;
    if(text.size()<3||text[2]!='.'||!Number(text,seconds)||!Take(text,"."))return false;
    if(text.size()<9)return false;
    auto fraction=text.substr(0,9);text.remove_prefix(9);
    if(!Number(fraction,nanos)||!fraction.empty()||minutes>59||seconds>59||hours>G_MAXUINT64/GST_SECOND/3600)return false;
    const auto whole=hours*3600+minutes*60+seconds;
    if(whole>(G_MAXUINT64-nanos)/GST_SECOND)return false;
    value=whole*GST_SECOND+nanos;return true;
}
DrainRow ParseDrain(std::string_view category,std::string_view text) {
    DrainRow row;
    const auto starts=[&](std::string_view value){return text.substr(0,value.size())==value;};
    const bool relevant=category=="vtdec"?(starts("drain_decoder,")||starts("setting draining flag")||starts("draining VT session")||starts("clearing draining flag")||starts("got output frame ")||starts("pushing frame ")||(starts("frame ")&&text.find(" push ret ")!=std::string_view::npos)):
        category=="videodecoder"&&(starts("decreasing timestamp (")||starts("finish frame "));
    if(!relevant&&!(category=="vtdec"&&starts("error: VTDecompressionSessionCreate returned ")))return row;
    if(text.size()>512)return {DrainKind::Unsupported};
    if(category=="vtdec") {
        if(Take(text,"error: VTDecompressionSessionCreate returned ")) {
            row.kind=DrainKind::SessionCreateError;row.b=Take(text,"-")?1:0;
            return Number(text,row.a)&&row.a<=G_MAXINT&&text.empty()?row:DrainRow{DrainKind::Unsupported};
        }
        if(text=="setting draining flag")return {DrainKind::SetDraining};
        if(text=="draining VT session")return {DrainKind::WaitStart};
        // 공식 1.28.1에는 async wait 완료 자체의 로그가 없다. clear는 wait+pause 뒤 상한일 뿐이다.
        if(text=="clearing draining flag")return {DrainKind::ClearDraining};
        if(Take(text,"drain_decoder, flushing: ")) {
            row.kind=DrainKind::DrainCall;
            return Number(text,row.a)&&text.empty()&&row.a<=1?row:DrainRow{DrainKind::Unsupported};
        }
        if(Take(text,"got output frame ")) {
            row.kind=DrainKind::CallbackFrame;
            return PointerToken(text)&&Take(text," ")&&Number(text,row.a)&&row.a<=G_MAXINT&&Take(text," and VT buffer ")&&PointerToken(text)&&text.empty()?row:DrainRow{DrainKind::Unsupported};
        }
        if(Take(text,"pushing frame ")) {
            row.kind=DrainKind::PushFrame;
            return Number(text,row.a)&&row.a<=G_MAXINT&&text.empty()?row:DrainRow{DrainKind::Unsupported};
        }
        if(Take(text,"frame ")) {
            row.kind=DrainKind::PushReturn;
            if(!Number(text,row.a)||row.a>G_MAXINT||!Take(text," push ret "))return {DrainKind::Unsupported};
            constexpr const char* returns[]={"ok","not-linked","flushing","eos","not-negotiated","error","not-supported"};
            for(unsigned i=0;i<7;++i)if(text==returns[i]) {row.b=i;return row;}
            return {DrainKind::Unsupported};
        }
        if(text.find("draining flag")!=std::string_view::npos||text.find("VT session")!=std::string_view::npos)return {DrainKind::Unsupported};
    }
    if(category=="videodecoder"&&Take(text,"decreasing timestamp (")) {
        row.kind=DrainKind::Decreasing;
        return Timestamp(text,row.a)&&Take(text," < ")&&Timestamp(text,row.b)&&Take(text,")")&&text.empty()?row:DrainRow{DrainKind::Unsupported};
    }
    if(category=="videodecoder"&&Take(text,"finish frame ")) {
        row.kind=DrainKind::FinishFrame;
        if(!PointerToken(text))return {DrainKind::Unsupported};
        // 공식 finish_frame 진입 LOG와 prepare_finish_frame 상세 LOG를 구분한다.
        if(text.empty())return {};
        if(!Take(text," (#")||!Number(text,row.a)||row.a>G_MAXINT||!Take(text,")(sub=#")||
            !Number(text,row.d)||row.d>G_MAXINT||!Take(text,") sync:")||!Number(text,row.e)||row.e>1||!Take(text," PTS:")||
            !Timestamp(text,row.b)||!Take(text," DTS:"))return {DrainKind::Unsupported};
        if(Take(text,"99:99:99.999999999"))row.c=GST_CLOCK_TIME_NONE;
        else if(!Timestamp(text,row.c))return {DrainKind::Unsupported};
        return text.empty()?row:DrainRow{DrainKind::Unsupported};
    }
    return {DrainKind::Unsupported};
}
const char* DrainName(DrainKind kind) {
    switch(kind) {
        case DrainKind::DrainCall:return "drain-call";case DrainKind::SetDraining:return "set-draining";
        case DrainKind::WaitStart:return "async-wait-start";case DrainKind::ClearDraining:return "clear-after-wait-and-pause";
        case DrainKind::CallbackFrame:return "callback-decode-frame";case DrainKind::PushFrame:return "push-system-frame";
        case DrainKind::PushReturn:return "push-return";case DrainKind::Decreasing:return "decreasing-timestamp";
        case DrainKind::FinishFrame:return "finish-system-frame-before-clamp";
        case DrainKind::SessionCreateError:return "vt-session-create-error-absolute-code-and-negative-flag";
        case DrainKind::RequestEos:return "eos-request";case DrainKind::BoundaryBuffer:return "boundary-buffer";
        case DrainKind::BoundaryEos:return "boundary-eos";default:return "unsupported";
    }
}
struct DrainCapture {
    std::mutex mutex;
    std::array<DrainRow,2048> rows{};std::size_t used=0;
    std::array<std::array<unsigned,2>,3> counts{};
    unsigned unsupported=0,unknown_warning=0,decreasing=0,callbacks=0,pushes=0,finishes=0,sets=0,waits=0,clears=0;
    bool overflow=false,requested=false,installed=false;
    std::atomic<bool> callback_failed{false};
    void Save(DrainRow row) {
        row.after_request=requested;
        if(row.kind==DrainKind::RequestEos)requested=true;
        if(row.kind==DrainKind::BoundaryBuffer&&row.boundary<3)++counts[row.boundary][requested?1:0];
        if(used==rows.size())overflow=true;else rows[used++]=row;
    }
    void Record(DrainRow row) {std::lock_guard<std::mutex> lock(mutex);Save(row);}
    void Consume(std::string_view category,GstDebugLevel level,std::string_view message) {
        const auto row=ParseDrain(category,message);
        if(row.kind==DrainKind::Unsupported)++unsupported;
        if(level<=GST_LEVEL_WARNING&&row.kind!=DrainKind::Decreasing)++unknown_warning;
        if(row.kind==DrainKind::Ignore||row.kind==DrainKind::Unsupported)return;
        decreasing+=row.kind==DrainKind::Decreasing;callbacks+=row.kind==DrainKind::CallbackFrame;
        finishes+=row.kind==DrainKind::FinishFrame;
        pushes+=row.kind==DrainKind::PushFrame;sets+=row.kind==DrainKind::SetDraining;
        waits+=row.kind==DrainKind::WaitStart;clears+=row.kind==DrainKind::ClearDraining;Save(row);
    }
    static void Log(GstDebugCategory* category,GstDebugLevel level,const gchar*,const gchar*,gint,GObject*,GstDebugMessage* message,gpointer data) {
        auto& self=*static_cast<DrainCapture*>(data);
        try {
        std::lock_guard<std::mutex> lock(self.mutex);
        const char* name=gst_debug_category_get_name(category);
        if(std::string_view(name)!="vtdec"&&std::string_view(name)!="videodecoder") {
            if(level<=GST_LEVEL_WARNING)++self.unknown_warning;
            return;
        }
        const char* text=gst_debug_message_get(message);
        self.Consume(name,level,text?std::string_view(text):std::string_view{});
        } catch(...) {self.callback_failed.store(true);}
    }
    void Install() {
        gst_debug_remove_log_function(gst_debug_log_default);
        gst_debug_add_log_function(Log,this,nullptr);installed=true;
        gst_debug_set_threshold_for_name("vtdec",GST_LEVEL_TRACE);
        gst_debug_set_threshold_for_name("videodecoder",GST_LEVEL_TRACE);
    }
    void Remove() {
        if(!installed)return;
        gst_debug_remove_log_function_by_data(this);installed=false;
        gst_debug_unset_threshold_for_name("vtdec");gst_debug_unset_threshold_for_name("videodecoder");
        gst_debug_add_log_function(gst_debug_log_default,nullptr,nullptr);
    }
    ~DrainCapture(){Remove();}
    bool Complete() const {return !callback_failed.load()&&!overflow&&!unsupported&&!unknown_warning&&callbacks&&pushes&&finishes&&sets&&waits&&clears;}
    void Report() const {
        for(std::size_t i=0;i<used;++i) {
            const auto& row=rows[i];
            std::cout<<"[drain-row] order="<<i<<" kind="<<DrainName(row.kind)<<" a="<<row.a<<" b="<<row.b
                <<" c="<<row.c<<" d="<<row.d<<" e="<<row.e<<" boundary="<<row.boundary<<" after_eos_request="<<row.after_request<<'\n';
        }
        for(unsigned i=0;i<3;++i)std::cout<<"[drain-boundary] boundary="<<i<<" before_eos_request="<<counts[i][0]<<" after_eos_request="<<counts[i][1]<<'\n';
        std::cout<<"[drain-debug] rows="<<used<<" callback_failed="<<callback_failed.load()<<" overflow="<<overflow<<" unsupported="<<unsupported<<" unknown_debug_warning="<<unknown_warning
            <<" decreasing_debug_warning="<<decreasing<<" callbacks="<<callbacks<<" pushes="<<pushes<<" finishes="<<finishes<<" sets="<<sets<<" waits="<<waits<<" clears="<<clears
            <<" async_wait_end_observable=0 frame_number_domains_equal_assumed=0 complete="<<Complete()<<'\n';
    }
};
const char* KnownCapsValue(const char* value,bool format) {
    if(!value)return "absent";
    constexpr const char* media[]={"video/x-raw","video/x-h264","video/x-h265","video/x-vp8","video/x-vp9"};
    constexpr const char* formats[]={"RGB","BGR","RGBA","BGRA","ARGB","ABGR","I420","YV12","NV12","NV21","UYVY","YUY2","P010_10LE","I420_10LE"};
    if(format) { for(const char* known:formats)if(std::string_view(value)==known)return known; }
    else { for(const char* known:media)if(std::string_view(value)==known)return known; }
    return "other-unknown";
}
const char* ClassifyError(GQuark domain,int code,const char* message,const char* debug) {
    const std::string_view m=message?message:"",d=debug?debug:"";
    const auto has=[&](const char* token){return m.find(token)!=std::string_view::npos||d.find(token)!=std::string_view::npos;};
    if(domain==GST_PARSE_ERROR&&code==GST_PARSE_ERROR_DELAYED_LINK)return "delayed-link";
    if(has("not-negotiated")||has("not negotiated"))return "not-negotiated";
    if((domain==GST_CORE_ERROR&&code==GST_CORE_ERROR_MISSING_PLUGIN)||has("Missing plugin")||has("missing plugin"))return "missing-plugin";
    if(domain==GST_STREAM_ERROR&&code==GST_STREAM_ERROR_DECODE)return "decoder-error";
    if(domain==GST_STREAM_ERROR)return "stream-error";
    return "other-unknown";
}
struct Boundary {
    struct Row { guint64 pts, dts, duration; guint flags; };
    struct Segment { int format=0; guint64 start=0,stop=0,time=0,base=0,offset=0; double rate=0,applied_rate=0; };
    std::array<Row,128> rows{};
    std::array<Segment,16> segments{};
    struct Caps { const char* media="absent";const char* format="absent";int width=0,height=0;unsigned memory=0; };
    std::array<Caps,16> caps{};
    std::size_t caps_count=0;
    std::size_t segment_count=0;
    std::size_t count=0, events=0, eos=0, qos=0;
    bool invalid=false;
    bool overflow=false;
    void ObserveCaps(GstCaps* value) {
        if(caps_count==caps.size()) { overflow=true;return; }
        auto& c=caps[caps_count++];
        if(!value||gst_caps_get_size(value)!=1||gst_caps_is_any(value)) { c.media="other-unknown";return; }
        const auto* s=gst_caps_get_structure(value,0);
        c.media=KnownCapsValue(gst_structure_get_name(s),false);
        c.format=KnownCapsValue(gst_structure_get_string(s,"format"),true);
        if(!gst_structure_get_int(s,"width",&c.width)||c.width<1||c.width>16384)c.width=0;
        if(!gst_structure_get_int(s,"height",&c.height)||c.height<1||c.height>16384)c.height=0;
        const auto* features=gst_caps_get_features(value,0);
        if(gst_caps_features_is_any(features)) { c.memory=32;return; }
        constexpr const char* names[]={"memory:SystemMemory","memory:GLMemory","memory:CVPixelBuffer","memory:DMABuf","memory:VulkanImage"};
        for(guint i=0;i<gst_caps_features_get_size(features);++i) {
            const char* feature=gst_caps_features_get_nth(features,i);bool known=false;
            for(unsigned j=0;j<5;++j)if(std::string_view(feature)==names[j]) { c.memory|=1u<<j;known=true; }
            if(!known)c.memory|=64;
        }
    }
    bool Observed() const {
        if(invalid||overflow||segment_count==0)return false;
        for(std::size_t i=0;i<segment_count;++i)if(segments[i].format!=GST_FORMAT_TIME)return false;
        return true;
    }
    void Buffer(GstBuffer* b) {
        if (!b) { invalid=true; return; }
        if (count==rows.size()) { overflow=true; return; }
        invalid |= !GST_BUFFER_PTS_IS_VALID(b) || GST_BUFFER_FLAG_IS_SET(b,GST_BUFFER_FLAG_CORRUPTED);
        rows[count++]={GST_BUFFER_PTS(b),GST_BUFFER_DTS(b),GST_BUFFER_DURATION(b),GST_BUFFER_FLAGS(b)};
    }
    Points Pts() const {
        Points result;
        for(std::size_t i=0;i<count;++i) result.push_back(rows[i].pts);
        std::sort(result.begin(),result.end()); return result;
    }
};
bool Matches(const Points& expected,const Boundary& b) {
    auto sorted=expected;std::sort(sorted.begin(),sorted.end());
    return !sorted.empty()&&b.Observed()&&b.eos==1&&sorted==b.Pts();
}
struct Verdict { int code; const char* reason; };
Verdict Judge(const Points& expected,const std::array<Boundary,3>& b,bool ready,bool visible,bool eos,unsigned errors,unsigned warnings) {
    if(!ready)return {2,"push-or-start-failure"};
    if(!visible)return {2,"missing-probe"};
    for(const auto& boundary:b)if(!boundary.Observed())return {2,"incomplete-observation"};
    if(!Matches(expected,b[0]))return {2,b[0].eos!=1?"input-eos-invalid":"input-pts-mismatch"};
    if(errors)return {2,"bus-error"};
    if(warnings)return {2,"bus-warning"};
    if(!Matches(expected,b[1]))return {1,b[1].eos!=1?"decoder-eos-invalid":"decoder-pts-mismatch"};
    if(!Matches(expected,b[2]))return {1,b[2].eos!=1?"overlay-eos-invalid":"overlay-pts-mismatch"};
    if(!eos)return {2,"bus-eos-missing"};
    return {0,"bounded-match"};
}
std::string Safe(const char* value) {
    if(!value) return "none";
    std::string result(value);
    if(result.size()>64) return "invalid";
    for(unsigned char c:result) if(!g_ascii_isalnum(c)&&c!='_'&&c!='-'&&c!='.') return "invalid";
    return result;
}
struct Trace {
    struct Context { Trace* owner=nullptr; unsigned index=0; GstPad* pad=nullptr; gulong id=0; };
    std::mutex mutex;
    std::array<Boundary,3> boundaries{};
    std::array<Context,3> contexts{};
    std::string factory="none";
    std::string plugin="none",version="none";
    guint rank=0;
    unsigned decoders=0;
    std::array<std::string,8> candidate_factories{};
    bool unavailable=false;
    GstElement* pipeline=nullptr;
    DrainCapture* drain=nullptr;
    gulong handler=0;
    explicit Trace(GstElement* p,DrainCapture* capture=nullptr):pipeline(p),drain(capture) {
        for(unsigned i=0;i<contexts.size();++i) contexts[i]={this,i,nullptr,0};
        handler=g_signal_connect(p,"deep-element-added",G_CALLBACK(Added),this);
    }
    static GstPadProbeReturn Probe(GstPad*,GstPadProbeInfo* info,gpointer data) {
        auto& context=*static_cast<Context*>(data);auto& trace=*context.owner;
        std::lock_guard<std::mutex> lock(trace.mutex);auto& b=trace.boundaries[context.index];
        const auto type=GST_PAD_PROBE_INFO_TYPE(info);
        const auto before=b.count;
        if(type&GST_PAD_PROBE_TYPE_BUFFER) b.Buffer(GST_PAD_PROBE_INFO_BUFFER(info));
        if(type&GST_PAD_PROBE_TYPE_BUFFER_LIST) {
            auto* list=GST_PAD_PROBE_INFO_BUFFER_LIST(info);
            if(!list) b.invalid=true;
            else for(guint i=0;i<gst_buffer_list_length(list);++i) b.Buffer(gst_buffer_list_get(list,i));
        }
        if(trace.drain)for(std::size_t i=before;i<b.count;++i)trace.drain->Record({DrainKind::BoundaryBuffer,b.rows[i].pts,b.rows[i].dts,context.index});
        if(type&(GST_PAD_PROBE_TYPE_EVENT_DOWNSTREAM|GST_PAD_PROBE_TYPE_EVENT_UPSTREAM)) {
            if(++b.events>16) b.overflow=true;
            auto* event=GST_PAD_PROBE_INFO_EVENT(info);
            if(event&&GST_EVENT_TYPE(event)==GST_EVENT_EOS) {
                ++b.eos;
                if(trace.drain)trace.drain->Record({DrainKind::BoundaryEos,0,0,context.index});
            }
            if(event&&GST_EVENT_TYPE(event)==GST_EVENT_QOS) ++b.qos;
            if(event&&GST_EVENT_TYPE(event)==GST_EVENT_CAPS) {
                GstCaps* caps=nullptr;gst_event_parse_caps(event,&caps);b.ObserveCaps(caps);
            }
            if(event&&GST_EVENT_TYPE(event)==GST_EVENT_SEGMENT) {
                const GstSegment* segment=nullptr;gst_event_parse_segment(event,&segment);
                if(!segment)b.invalid=true;
                else if(b.segment_count==b.segments.size())b.overflow=true;
                else b.segments[b.segment_count++]={static_cast<int>(segment->format),segment->start,segment->stop,
                    segment->time,segment->base,segment->offset,segment->rate,segment->applied_rate};
            }
        }
        return GST_PAD_PROBE_OK;
    }
    void Attach(unsigned index,GstElement* element,const char* name) {
        auto& c=contexts[index];
        if(c.pad) { unavailable=true;return; }
        c.pad=gst_element_get_static_pad(element,name);
        if(!c.pad) { unavailable=true;return; }
        c.id=gst_pad_add_probe(c.pad,static_cast<GstPadProbeType>(GST_PAD_PROBE_TYPE_BUFFER|
            GST_PAD_PROBE_TYPE_BUFFER_LIST|GST_PAD_PROBE_TYPE_EVENT_DOWNSTREAM|GST_PAD_PROBE_TYPE_EVENT_UPSTREAM),Probe,&c,nullptr);
        if(!c.id) unavailable=true;
    }
    static void Added(GstBin*,GstBin*,GstElement* element,gpointer data) {
        auto& t=*static_cast<Trace*>(data);
        try {
        auto* f=gst_element_get_factory(element);if(!f)return;
        const char* klass=gst_element_factory_get_metadata(f,GST_ELEMENT_METADATA_KLASS);
        if(!klass||!g_strrstr(klass,"Decoder")||!g_strrstr(klass,"Video"))return;
        std::lock_guard<std::mutex> lock(t.mutex);
        if(t.decoders<t.candidate_factories.size())t.candidate_factories[t.decoders]=Safe(gst_plugin_feature_get_name(GST_PLUGIN_FEATURE(f)));
        if(++t.decoders!=1) { t.unavailable=true;return; }
        t.factory=Safe(gst_plugin_feature_get_name(GST_PLUGIN_FEATURE(f)));
        t.rank=gst_plugin_feature_get_rank(GST_PLUGIN_FEATURE(f));
        auto* plugin=gst_plugin_feature_get_plugin(GST_PLUGIN_FEATURE(f));
        if(plugin) {
            t.plugin=Safe(gst_plugin_get_name(plugin));t.version=Safe(gst_plugin_get_version(plugin));
            gst_object_unref(plugin);
        }
        t.Attach(0,element,"sink");t.Attach(1,element,"src");
        } catch(...) { std::lock_guard<std::mutex> lock(t.mutex);t.unavailable=true; }
    }
    void Stop() noexcept {
        const auto stopped=gst_element_set_state(pipeline,GST_STATE_NULL);
        GstState state=GST_STATE_VOID_PENDING;
        const auto settled=gst_element_get_state(pipeline,&state,nullptr,0);
        if(stopped==GST_STATE_CHANGE_FAILURE||settled==GST_STATE_CHANGE_FAILURE||settled==GST_STATE_CHANGE_ASYNC||state!=GST_STATE_NULL) {
            std::fputs("[result] reason=null-not-complete exit=2\n",stdout);std::fflush(stdout);std::_Exit(2);
        }
    }
    // 예외 unwinding도 NULL 완료가 callback context 해제보다 먼저다.
    ~Trace() {
        Stop();
        if(handler)g_signal_handler_disconnect(pipeline,handler);
        for(auto& c:contexts) if(c.pad) {
            if(c.id)gst_pad_remove_probe(c.pad,c.id);
            gst_object_unref(c.pad);
        }
    }
    void Report(bool full_rows) const {
        constexpr const char* names[]={"decoder-sink","decoder-src","overlay-sink"};
        std::cout<<"[decoder] factory="<<factory<<" plugin="<<plugin<<" version="<<version<<" rank="<<rank<<'\n';
        for(unsigned i=0;i<decoders&&i<candidate_factories.size();++i)std::cout<<"[decoder-candidate] ordinal="<<i<<" factory="<<candidate_factories[i]<<'\n';
        for(unsigned n=0;n<boundaries.size();++n) {
            const auto& b=boundaries[n];
            std::cout<<"[boundary] name="<<names[n]<<" factory="<<factory<<" count="<<b.count
                <<" eos="<<b.eos<<" events="<<b.events<<" segments="<<b.segment_count<<" caps="<<b.caps_count<<" qos="<<b.qos<<" invalid="<<b.invalid<<" overflow="<<b.overflow<<'\n';
            for(std::size_t i=0;full_rows&&i<b.caps_count;++i) {
                const auto& c=b.caps[i];
                std::cout<<"[caps] boundary="<<names[n]<<" index="<<i<<" media="<<c.media<<" format="<<c.format
                    <<" width="<<c.width<<" height="<<c.height<<" system_memory="<<!!(c.memory&1)
                    <<" gl_memory="<<!!(c.memory&2)<<" cv_pixel_buffer="<<!!(c.memory&4)<<" dma_buf="<<!!(c.memory&8)
                    <<" vulkan_image="<<!!(c.memory&16)<<" any_memory="<<!!(c.memory&32)<<" unknown_feature="<<!!(c.memory&64)<<'\n';
            }
            for(std::size_t i=0;full_rows&&i<b.segment_count;++i) {
                const auto& s=b.segments[i];
                std::cout<<"[segment] boundary="<<names[n]<<" index="<<i<<" format="<<s.format
                    <<" start="<<s.start<<" stop="<<s.stop<<" time="<<s.time<<" base="<<s.base
                    <<" offset="<<s.offset<<" rate="<<s.rate<<" applied_rate="<<s.applied_rate<<'\n';
            }
            for(std::size_t i=0;full_rows&&i<b.count;++i) {
                const auto& r=b.rows[i];
                std::cout<<"[pts] boundary="<<names[n]<<" index="<<i<<" pts="<<r.pts<<" dts="<<r.dts
                    <<" duration="<<r.duration<<" flags="<<r.flags<<'\n';
            }
        }
    }
};
struct Graph {
    GstElement* pipeline=gst_pipeline_new(nullptr);
    GstElement* src=nullptr;
    ~Graph() {
        if(pipeline)gst_element_set_state(pipeline,GST_STATE_NULL);
        if(src)gst_object_unref(src);
        if(pipeline)gst_object_unref(pipeline);
    }
};
struct ParsedBranch {
    GstElement* bin=nullptr; // 반환 ref는 호출자가 소유하거나 pipeline으로 이전한다.
    bool linked=false;
};
ParsedBranch CreateProductBranch() {
    const auto launch=ingress::BuildFactoryLaunch(ingress::VideoCodec::H264,media::CodecId::Unknown);
    GError* error=nullptr;
    // GStreamer 1.28.1 rtsp-media-factory.c default_create_element(1991)와 같은 방식.
    // gstutils.c의 parse_bin(..., TRUE) 자동 ghost는 동적 연결 대기 queue sink도
    // 점유할 수 있으므로 사용하지 않는다. 제품 launch 내부 문자열은 변경하지 않는다.
    auto* branch=gst_parse_launch_full(launch.c_str(),nullptr,GST_PARSE_FLAG_PLACE_IN_BIN,&error);
    if(error||!branch||!GST_IS_BIN(branch)) {
        if(error)g_error_free(error);
        if(branch)gst_object_unref(branch);
        return {};
    }
    auto* pay=gst_bin_get_by_name(GST_BIN(branch),"pay0");
    auto* parent=pay?gst_object_get_parent(GST_OBJECT(pay)):nullptr;
    auto* sink=gst_element_factory_make("fakesink","hw_impact_owned_sink");
    bool linked=false;
    if(pay&&parent&&GST_IS_BIN(parent)&&sink) {
        g_object_set(sink,"sync",FALSE,nullptr);
        if(gst_bin_add(GST_BIN(parent),sink)) {
            linked=gst_element_link(pay,sink);sink=nullptr; // parent 소유
        }
    }
    if(sink)gst_object_unref(sink);
    if(parent)gst_object_unref(parent);
    if(pay)gst_object_unref(pay);
    return {branch,linked};
}
struct StructureFacts { unsigned ghost_sinks=0,external_ghost_sinks=0,waiting_queue_sinks=0,occupied_queue_ghost_targets=0;bool complete=true,pay_link=false; };
StructureFacts InspectProductBranch(GstElement* branch) {
    StructureFacts facts;
    if(!branch||!GST_IS_BIN(branch)) { facts.complete=false;return facts; }
    const auto inspect=[&](GstElement* element) {
        auto* pads=gst_element_iterate_sink_pads(element);GValue value=G_VALUE_INIT;bool done=false;
        for(unsigned i=0;i<128&&!done;++i) {
            switch(gst_iterator_next(pads,&value)) {
                case GST_ITERATOR_OK: {
                    auto* pad=GST_PAD(g_value_get_object(&value));
                    if(GST_IS_GHOST_PAD(pad)) {
                        ++facts.ghost_sinks;
                        // decodebin 자체의 정상 ghost sink는 외부 자동 생성과 구분한다.
                        if(element==branch)++facts.external_ghost_sinks;
                        auto* target=gst_ghost_pad_get_target(GST_GHOST_PAD(pad));
                        auto* parent=target?gst_pad_get_parent_element(target):nullptr;
                        auto* target_factory=parent?gst_element_get_factory(parent):nullptr;
                        if(target&&target_factory&&gst_pad_is_linked(target)&&
                            std::string_view(gst_plugin_feature_get_name(GST_PLUGIN_FEATURE(target_factory)))=="queue")++facts.occupied_queue_ghost_targets;
                        if(parent)gst_object_unref(parent);
                        if(target)gst_object_unref(target);
                    }
                    auto* factory=gst_element_get_factory(element);
                    if(factory&&std::string_view(gst_plugin_feature_get_name(GST_PLUGIN_FEATURE(factory)))=="queue"&&!gst_pad_is_linked(pad))++facts.waiting_queue_sinks;
                    g_value_reset(&value);break;
                }
                case GST_ITERATOR_DONE:done=true;break;
                default:facts.complete=false;done=true;break;
            }
        }
        if(!done)facts.complete=false;
        if(G_VALUE_TYPE(&value))g_value_unset(&value);
        gst_iterator_free(pads);
    };
    inspect(branch);
    auto* elements=gst_bin_iterate_recurse(GST_BIN(branch));GValue value=G_VALUE_INIT;bool done=false;
    for(unsigned i=0;i<128&&!done;++i) {
        switch(gst_iterator_next(elements,&value)) {
            case GST_ITERATOR_OK:inspect(GST_ELEMENT(g_value_get_object(&value)));g_value_reset(&value);break;
            case GST_ITERATOR_DONE:done=true;break;
            default:facts.complete=false;done=true;break;
        }
    }
    if(!done)facts.complete=false;
    if(G_VALUE_TYPE(&value))g_value_unset(&value);
    gst_iterator_free(elements);
    auto* pay=gst_bin_get_by_name(GST_BIN(branch),"pay0");
    auto* sink=gst_bin_get_by_name(GST_BIN(branch),"hw_impact_owned_sink");
    auto* pad=pay?gst_element_get_static_pad(pay,"src"):nullptr;
    auto* peer=pad?gst_pad_get_peer(pad):nullptr;
    auto* expected=sink?gst_element_get_static_pad(sink,"sink"):nullptr;
    facts.pay_link=peer&&peer==expected;
    if(expected)gst_object_unref(expected);
    if(peer)gst_object_unref(peer);
    if(pad)gst_object_unref(pad);
    if(sink)gst_object_unref(sink);
    if(pay)gst_object_unref(pay);
    return facts;
}
Points Input(const Encoded& input,const char* name) {
    Points expected;auto* sum=g_checksum_new(G_CHECKSUM_SHA256);std::size_t bytes=0;
    for(std::size_t i=0;i<input.packets.size();++i) {
        const auto& p=input.packets[i];
        if(p.pts<0||p.dts<0||!p.observation||!p.observation->duration_ns) {
            g_checksum_free(sum);throw std::runtime_error("input-invalid");
        }
        expected.push_back(static_cast<guint64>(p.pts));bytes+=p.payload.size();
        g_checksum_update(sum,p.payload.data(),static_cast<gssize>(p.payload.size()));
        std::cout<<"[au] case="<<name<<" index="<<i<<" pts="<<p.pts<<" dts="<<p.dts
            <<" duration="<<*p.observation->duration_ns<<" key="<<p.is_key_frame<<" bytes="<<p.payload.size()<<'\n';
    }
    std::cout<<"[input] case="<<name<<" count="<<expected.size()<<" bytes="<<bytes
        <<" sha256="<<g_checksum_get_string(sum)<<'\n';g_checksum_free(sum);return expected;
}
int Observe(const Encoded& input,const Points& expected,const char* name,unsigned round,bool diagnosis=false,bool paced=false,bool mitigate=false) {
    Graph graph;if(!graph.pipeline)return 2;
    auto parsed=CreateProductBranch();auto* branch=parsed.bin;
    if(!branch)return 2;
    if(!gst_bin_add(GST_BIN(graph.pipeline),branch)) { gst_object_unref(branch);return 2; }
    const auto facts=InspectProductBranch(branch);
    std::cout<<"[graph] parse=launch-full-place-in-bin ghost_sinks="<<facts.ghost_sinks
        <<" external_ghost_sinks="<<facts.external_ghost_sinks<<" occupied_queue_ghost_targets="<<facts.occupied_queue_ghost_targets
        <<" waiting_queue_sinks="<<facts.waiting_queue_sinks<<" pay_link="<<facts.pay_link<<" inspected="<<facts.complete<<'\n';
    if(!parsed.linked||!facts.complete||!facts.pay_link||facts.external_ghost_sinks!=0||facts.occupied_queue_ghost_targets!=0||facts.waiting_queue_sinks!=1)return 2;
    if(mitigate&&!core::InstallDecodeCompatibility(branch))return 2;
    auto* overlay=gst_bin_get_by_name(GST_BIN(branch),"analysis_overlay");
    graph.src=gst_bin_get_by_name(GST_BIN(branch),"video_src");
    if(!overlay||!graph.src) { if(overlay)gst_object_unref(overlay);return 2; }
    auto* caps=gst_caps_from_string(input.descriptor.tracks.front().caps_string.c_str());
    if(!caps) { gst_object_unref(overlay);return 2; }
    gst_app_src_set_caps(GST_APP_SRC(graph.src),caps);gst_caps_unref(caps);
    std::unique_ptr<DrainCapture> capture;
    if(diagnosis)capture=std::make_unique<DrainCapture>();
    Trace trace(graph.pipeline,capture.get());trace.Attach(2,overlay,"sink");gst_object_unref(overlay);
    if(capture)capture->Install();
    std::cout<<"[attempt] case="<<name<<" round="<<round<<" pacing="<<(paced?"dts-steady":"burst")<<" mitigation="<<mitigate<<" scope=actual-builder-graph network_e2e=0 input_duration_policy=product-unset\n";
    bool preparation=gst_element_set_state(graph.pipeline,GST_STATE_PLAYING)!=GST_STATE_CHANGE_FAILURE;
    std::size_t pushed=0;
    const auto pacing_start=std::chrono::steady_clock::now();
    const auto first_dts=input.packets.front().dts;auto previous_dts=first_dts;
    if(preparation) for(const auto& p:input.packets) {
        if(paced) {
            if(p.dts<previous_dts||p.dts<first_dts||p.dts-first_dts>static_cast<std::int64_t>(3*GST_SECOND)) {preparation=false;break;}
            std::this_thread::sleep_until(pacing_start+std::chrono::nanoseconds(p.dts-first_dts));previous_dts=p.dts;
        }
        auto* b=gst_buffer_new_allocate(nullptr,p.payload.size(),nullptr);
        if(!b) { preparation=false;break; }
        gst_buffer_fill(b,0,p.payload.data(),p.payload.size());
        GST_BUFFER_PTS(b)=static_cast<guint64>(p.pts);GST_BUFFER_DTS(b)=static_cast<guint64>(p.dts);
        // EgressSession::PushToAppSrc와 동일하게 duration은 설정하지 않는다.
        if(!p.is_key_frame)GST_BUFFER_FLAG_SET(b,GST_BUFFER_FLAG_DELTA_UNIT);
        const auto flow=gst_app_src_push_buffer(GST_APP_SRC(graph.src),b);
        if(flow!=GST_FLOW_OK) {
            std::cout<<"[push-failure] index="<<pushed<<" flow="<<static_cast<int>(flow)<<'\n';
            preparation=false;break;
        }++pushed;
    }
    if(capture)capture->Record({DrainKind::RequestEos});
    const auto end=preparation?gst_app_src_end_of_stream(GST_APP_SRC(graph.src)):GST_FLOW_ERROR;
    preparation=preparation&&end==GST_FLOW_OK;
    auto* bus=gst_element_get_bus(graph.pipeline);unsigned errors=0,warnings=0,qos=0;bool eos=false;
    const auto deadline=std::chrono::steady_clock::now()+std::chrono::seconds(5);
    while(preparation&&!eos&&!errors) {
        const auto remaining=deadline-std::chrono::steady_clock::now();
        if(remaining<=std::chrono::nanoseconds::zero())break;
        auto* message=gst_bus_timed_pop(bus,static_cast<GstClockTime>(std::chrono::duration_cast<std::chrono::nanoseconds>(remaining).count()));
        if(!message)break;
        switch(GST_MESSAGE_TYPE(message)) {
            case GST_MESSAGE_EOS:eos=true;break;
            case GST_MESSAGE_ERROR:
            case GST_MESSAGE_WARNING: {
                const bool warning=GST_MESSAGE_TYPE(message)==GST_MESSAGE_WARNING;
                warning?++warnings:++errors;
                GError* issue=nullptr;gchar* debug=nullptr;
                if(warning)gst_message_parse_warning(message,&issue,&debug);
                else gst_message_parse_error(message,&issue,&debug);
                auto* source=GST_MESSAGE_SRC(message);
                auto* factory=source&&GST_IS_ELEMENT(source)?gst_element_get_factory(GST_ELEMENT(source)):nullptr;
                const char* classification=ClassifyError(issue?issue->domain:0,issue?issue->code:0,issue?issue->message:nullptr,debug);
                // 임의 message/debug와 객체 instance name은 출력하지 않는다.
                if(errors+warnings<=16)std::cout<<"[bus-diagnostic] severity="<<(warning?"warning":"error")
                    <<" domain="<<Safe(issue?g_quark_to_string(issue->domain):nullptr)<<" code="<<(issue?issue->code:0)
                    <<" source_factory="<<Safe(factory?gst_plugin_feature_get_name(GST_PLUGIN_FEATURE(factory)):nullptr)
                    <<" classification="<<classification<<'\n';
                if(issue)g_error_free(issue);
                g_free(debug);break;
            }
            case GST_MESSAGE_QOS:++qos;break;
            default:break;
        }
        gst_message_unref(message);
    }
    gst_object_unref(bus);
    trace.Stop();
    if(capture)capture->Remove();
    const bool visible=!trace.unavailable&&trace.decoders==1&&trace.contexts[0].id&&trace.contexts[1].id&&trace.contexts[2].id;
    const bool input_ok=Matches(expected,trace.boundaries[0]);
    const bool output_ok=Matches(expected,trace.boundaries[1]);
    const bool overlay_ok=Matches(expected,trace.boundaries[2]);
    const auto product_verdict=Judge(expected,trace.boundaries,preparation,visible,eos,errors,warnings);
    auto verdict=capture&&!capture->Complete()?Verdict{2,"drain-observation-incomplete"}:product_verdict;
    if(mitigate) {
        const bool selected=visible&&!(kHostMacos&&trace.plugin=="applemedia"&&trace.version=="1.28.1"&&
            (trace.factory=="vtdec"||trace.factory=="vtdec_hw"));
        std::cout<<(product_verdict.code==0?"[pass] ":"[fail] ")<<name<<" exact full PTS and EOS\n";
        std::cout<<(selected?"[pass] ":"[fail] ")<<name<<" selected factory respects exact compatibility tuple\n";
        if(!selected&&verdict.code==0)verdict={1,"mitigation-factory-selection"};
    }
    trace.Report(diagnosis||verdict.code!=0);
    if(capture)capture->Report();
    std::cout<<"[result] case="<<name<<" pushed="<<pushed<<" successful_push_flows="<<pushed<<" end_flow="<<static_cast<int>(end)<<" eos="<<eos
        <<" errors="<<errors<<" warnings="<<warnings<<" bus_diagnostic_rows_dropped="<<(errors+warnings>16?errors+warnings-16:0)
        <<" qos="<<qos<<" visible="<<visible
        <<" input_match="<<input_ok<<" decoder_match="<<output_ok<<" overlay_match="<<overlay_ok
        <<" reason="<<verdict.reason<<" product_oracle_exit="<<product_verdict.code<<" product_oracle_reason="<<product_verdict.reason
        <<" exit="<<verdict.code<<'\n';
    return verdict.code;
}
int SelfTest() {
    unsigned pass=0,fail=0;
    const auto check=[&](bool ok,const char* id){std::cout<<(ok?"[pass] ":"[fail] ")<<id<<'\n';ok?++pass:++fail;};
    Boundary b;b.count=3;b.eos=1;b.rows[0].pts=30;b.rows[1].pts=10;b.rows[2].pts=20;
    b.segment_count=1;b.segments[0].format=GST_FORMAT_TIME;
    check(Matches({10,20,30},b),"HW-OR01 reorder accepted");
    b.rows[0].pts=20;check(!Matches({10,20,30},b),"HW-OR02 same-count duplicate omission rejected");
    b.rows[0].pts=40;check(!Matches({10,20,30},b),"HW-OR02 same-count omission replacement rejected");
    b.rows[0].pts=20;
    check(Matches({10,20,20},b),"HW-OR03 legitimate duplicate preserved");
    b.count=2;check(!Matches({10,20,20},b),"HW-OR04 missing frame rejected");
    b.count=3;b.invalid=true;check(!Matches({10,20,20},b),"HW-OR05 invalid PTS rejected");
    b.invalid=false;b.eos=0;check(!Matches({10,20,20},b),"HW-OR06 missing EOS rejected");
    b.eos=1;b.overflow=true;check(!Matches({10,20,20},b),"HW-OR07 overflow rejected");
    b.overflow=false;b.eos=2;check(!Matches({10,20,20},b),"HW-OR08 duplicate EOS rejected");
    b.eos=1;b.segment_count=0;check(!Matches({10,20,20},b),"HW-OR09 missing SEGMENT rejected");
    b.segment_count=1;b.segments[0].format=GST_FORMAT_BYTES;
    check(!Matches({10,20,20},b),"HW-OR10 non-TIME SEGMENT rejected");
    b.segments[0].format=GST_FORMAT_TIME;
    const Points expected{10,20,20};std::array<Boundary,3> boundaries{b,b,b};
    check(Judge(expected,boundaries,true,true,true,0,0).code==0,"HW-OR11 complete oracle accepted");
    boundaries[0].rows[0].pts=40;
    check(Judge(expected,boundaries,true,true,true,0,0).code==2,"HW-OR12 input mismatch is inconclusive");
    boundaries[0]=b;boundaries[1].rows[0].pts=40;
    check(Judge(expected,boundaries,true,true,true,0,0).code==1,"HW-OR13 decoder mismatch is failure");
    boundaries[1]=b;boundaries[2].rows[0].pts=40;
    check(Judge(expected,boundaries,true,true,true,0,0).code==1,"HW-OR14 overlay mismatch is failure");
    boundaries[2]=b;boundaries[1].invalid=true;
    check(Judge(expected,boundaries,true,true,true,0,0).code==2,"HW-OR15 invalid observation is inconclusive");
    boundaries[1]=b;boundaries[1].overflow=true;
    check(Judge(expected,boundaries,true,true,true,0,0).code==2,"HW-OR16 overflow is inconclusive");
    boundaries[1]=b;
    check(Judge(expected,boundaries,true,false,true,0,0).code==2,"HW-OR17 missing probe is inconclusive");
    check(Judge(expected,boundaries,true,true,false,0,0).code==2,"HW-OR18 missing bus EOS is inconclusive");
    check(Judge(expected,boundaries,true,true,true,1,0).code==2,"HW-OR19 bus ERROR is inconclusive");
    check(std::string_view(ClassifyError(0,0,"secret://private","reason not-negotiated (-4)"))=="not-negotiated","HW-OR20 known error classification excludes raw text");
    check(std::string_view(ClassifyError(0,0,"secret://private","unclassified private debug"))=="other-unknown","HW-OR21 unknown error classification excludes raw text");
    check(std::string_view(KnownCapsValue("RGB",true))=="RGB"&&std::string_view(KnownCapsValue("secret://private",true))=="other-unknown","HW-OR22 CAPS fixed allowlist rejects arbitrary values");
    auto parsed=CreateProductBranch();const auto facts=InspectProductBranch(parsed.bin);
    check(parsed.bin&&GST_IS_BIN(parsed.bin)&&facts.complete,"HW-GR01 actual product parse-launch PLACE_IN_BIN creates inspectable bin");
    check(parsed.bin&&facts.complete&&facts.external_ghost_sinks==0&&facts.occupied_queue_ghost_targets==0,"HW-GR02 no generated ghost sink occupies pending links");
    check(parsed.linked&&facts.pay_link,"HW-GR03 pay0 src connects directly to owned sink");
    check(parsed.bin&&facts.complete&&facts.waiting_queue_sinks==1,"HW-GR04 dynamic downstream queue sink remains unoccupied");
    if(parsed.bin)gst_object_unref(parsed.bin);
    // 과거 잘못된 준비 구성은 NULL 상태에서만 대조하고 미디어 실행 없이 해제한다.
    GError* negative_error=nullptr;
    const auto negative_launch=ingress::BuildFactoryLaunch(ingress::VideoCodec::H264,media::CodecId::Unknown);
    auto* negative=gst_parse_bin_from_description(negative_launch.c_str(),TRUE,&negative_error);
    const auto negative_facts=InspectProductBranch(negative);
    check(!negative_error&&negative&&negative_facts.complete&&negative_facts.occupied_queue_ghost_targets==1&&negative_facts.waiting_queue_sinks==0,
        "HW-GR05 legacy automatic ghost occupies queue sink before PLAYING");
    if(negative_error)g_error_free(negative_error);
    if(negative)gst_object_unref(negative);
    check(std::string_view(ClassifyError(GST_PARSE_ERROR,GST_PARSE_ERROR_DELAYED_LINK,nullptr,nullptr))=="delayed-link","HW-OR23 delayed-link has fixed classification");
    const auto callback=ParseDrain("vtdec","got output frame 0x123 7 and VT buffer 0x456");
    check(callback.kind==DrainKind::CallbackFrame&&callback.a==7,"HW-DP01 callback retains decode number without pointers");
    const auto pushing=ParseDrain("vtdec","pushing frame 12");
    check(pushing.kind==DrainKind::PushFrame&&pushing.a==12,"HW-DP02 push retains independent system number");
    const auto decreasing=ParseDrain("videodecoder","decreasing timestamp (0:00:02.600000000 < 0:00:02.800000000)");
    check(decreasing.kind==DrainKind::Decreasing&&decreasing.a==2600000000ULL&&decreasing.b==2800000000ULL,"HW-DP03 decreasing warning preserves exact nanoseconds");
    check(ParseDrain("vtdec","got output frame secret://private 7 and VT buffer 0x456").kind==DrainKind::Unsupported,"HW-DP04 malicious pointer token rejected without disclosure");
    check(ParseDrain("vtdec","pushing frame 12 secret://private").kind==DrainKind::Unsupported,"HW-DP05 trailing injected field rejected");
    check(ParseDrain("videodecoder","decreasing timestamp (0:99:02.600000000 < 0:00:02.800000000)").kind==DrainKind::Unsupported,"HW-DP06 invalid timestamp rejected");
    DrainCapture debug;
    debug.Consume("videodecoder",GST_LEVEL_WARNING,"unregistered secret://private");
    check(debug.unknown_warning==1&&!debug.Complete()&&debug.used==0,"HW-DP07 unknown warning makes diagnosis inconclusive without raw retention");
    DrainCapture bounded;
    for(std::size_t i=0;i<2049;++i)bounded.Record({DrainKind::PushFrame,static_cast<guint64>(i)});
    check(bounded.overflow&&bounded.used==2048&&!bounded.Complete(),"HW-DP08 debug array overflow makes diagnosis inconclusive");
    DrainCapture complete;
    complete.Consume("vtdec",GST_LEVEL_DEBUG,"setting draining flag");
    complete.Consume("vtdec",GST_LEVEL_DEBUG,"draining VT session");
    complete.Consume("vtdec",GST_LEVEL_LOG,"got output frame 0x123 7 and VT buffer 0x456");
    complete.Consume("vtdec",GST_LEVEL_TRACE,"pushing frame 12");
    complete.Consume("videodecoder",GST_LEVEL_LOG,"finish frame 0x123 (#12)(sub=#0) sync:1 PTS:0:00:02.600000000 DTS:99:99:99.999999999");
    complete.Consume("vtdec",GST_LEVEL_DEBUG,"clearing draining flag");
    complete.Consume("videodecoder",GST_LEVEL_WARNING,"decreasing timestamp (0:00:02.600000000 < 0:00:02.800000000)");
    check(complete.Complete()&&complete.decreasing==1&&complete.unknown_warning==0,"HW-DP09 known decreasing warning completes diagnosis without product PASS");
    check(ParseDrain("vtdec","async wait completed").kind==DrainKind::Ignore&&complete.used==7,"HW-DP10 absent source log is not fabricated as wait completion");
    const auto finish=ParseDrain("videodecoder","finish frame 0x123 (#12)(sub=#0) sync:1 PTS:0:00:02.600000000 DTS:99:99:99.999999999");
    check(finish.kind==DrainKind::FinishFrame&&finish.a==12&&finish.b==2600000000ULL&&finish.c==GST_CLOCK_TIME_NONE&&finish.d==0&&finish.e==1,"HW-DP11 finish frame preserves pre-clamp PTS and unknown DTS without pointer");
    check(ParseDrain("videodecoder","finish frame 0x123 (#18446744073709551616)(sub=#0) sync:1 PTS:0:00:02.600000000 DTS:0:00:02.500000000").kind==DrainKind::Unsupported,"HW-DP12 numeric overflow rejected before conversion");
    const std::string irrelevant(600,'x');
    check(ParseDrain("videodecoder",irrelevant).kind==DrainKind::Ignore,"HW-DP13 unrelated long LOG ignored before selected-prefix bound");
    check(ParseDrain("vtdec",std::string("pushing frame ")+irrelevant).kind==DrainKind::Unsupported,"HW-DP14 selected-prefix oversized message is inconclusive");
    complete.callback_failed.store(true);
    check(!complete.Complete(),"HW-DP15 callback exception boundary makes diagnosis inconclusive");
    check(ParseDrain("videodecoder","finish frame 0x123 (#12)(sub=#0) sync:1 PTS:0:00:02.600000000 DTS:0:99:02.500000000").kind==DrainKind::Unsupported,"HW-DP16 malformed DTS rejected without inventing source formats");
    complete.callback_failed.store(false);complete.finishes=0;
    check(!complete.Complete(),"HW-DP17 missing finish-frame observation is inconclusive");
    check(ParseDrain("videodecoder","finish frame 0x123").kind==DrainKind::Ignore,"HW-DP18 official entry-only finish log is not pre-clamp evidence");
    const auto create_error=ParseDrain("vtdec","error: VTDecompressionSessionCreate returned -12913");
    check(create_error.kind==DrainKind::SessionCreateError&&create_error.a==12913&&create_error.b==1,"HW-DP19 session-create error retains only signed numeric code");
    check(ParseDrain("vtdec","error: VTDecompressionSessionCreate returned -12913 secret://private").kind==DrainKind::Unsupported,"HW-DP20 session-create error rejects arbitrary suffix");
    using core::ShouldSkipAppleH264Decoder;
    check(ShouldSkipAppleH264Decoder(true,true,"video/x-h264","vtdec_hw","applemedia","1.28.1"),"HW-MP01 exact macOS H264 vtdec_hw tuple skips");
    check(ShouldSkipAppleH264Decoder(true,true,"video/x-h264","vtdec","applemedia","1.28.1"),"HW-MP02 exact macOS H264 vtdec tuple skips");
    check(!ShouldSkipAppleH264Decoder(false,true,"video/x-h264","vtdec_hw","applemedia","1.28.1"),"HW-MP03 other platform preserves selection");
    check(!ShouldSkipAppleH264Decoder(true,false,"video/x-h264","vtdec_hw","applemedia","1.28.1"),"HW-MP04 nonfixed ANY or ambiguous caps preserve selection");
    check(!ShouldSkipAppleH264Decoder(true,true,"","vtdec_hw","applemedia","1.28.1"),"HW-MP05 empty caps preserve selection");
    check(!ShouldSkipAppleH264Decoder(true,true,"video/x-h265","vtdec_hw","applemedia","1.28.1"),"HW-MP06 H265 input preserves selection");
    check(!ShouldSkipAppleH264Decoder(true,true,"video/x-vp8","vtdec_hw","applemedia","1.28.1"),"HW-MP07 VP8 input preserves selection");
    check(!ShouldSkipAppleH264Decoder(true,true,"video/x-h264","avdec_h264","applemedia","1.28.1"),"HW-MP08 other factory preserves selection");
    check(!ShouldSkipAppleH264Decoder(true,true,"video/x-h264","vtdec_hw","other","1.28.1"),"HW-MP09 other plugin preserves selection");
    check(!ShouldSkipAppleH264Decoder(true,true,"video/x-h264","vtdec_hw","applemedia","1.28.0"),"HW-MP10 older version preserves selection");
    check(!ShouldSkipAppleH264Decoder(true,true,"video/x-h264","vtdec_hw","applemedia","1.28.2"),"HW-MP11 newer version preserves selection");
    check(!ShouldSkipAppleH264Decoder(true,true,"video/x-h264","vtdec_hw","applemedia",""),"HW-MP12 unknown version preserves selection");
    check(!ShouldSkipAppleH264Decoder(true,true,"video/x-h264","","applemedia","1.28.1"),"HW-MP13 unknown factory preserves selection");
    check(!ShouldSkipAppleH264Decoder(true,true,"video/x-h264","vtdec_hw","","1.28.1"),"HW-MP14 unknown plugin preserves selection");
    check(!ShouldSkipAppleH264Decoder(true,true,"video/x-raw","vtdec_hw","applemedia","1.28.1"),"HW-MP15 raw input preserves selection");
    const auto ranks=[] {
        std::array<gint64,3> result{};constexpr const char* names[]={"vtdec_hw","vtdec","avdec_h264"};
        for(unsigned i=0;i<3;++i) {
            auto* factory=gst_element_factory_find(names[i]);
            result[i]=factory?static_cast<gint64>(gst_plugin_feature_get_rank(GST_PLUGIN_FEATURE(factory))):-1;
            if(factory)gst_object_unref(factory);
        }
        return result;
    };
    const auto initial_ranks=ranks();
    auto* root=gst_bin_new(nullptr);auto* existing=gst_element_factory_make("decodebin",nullptr);
    auto* nested=gst_bin_new(nullptr);auto* dynamic=gst_element_factory_make("decodebin",nullptr);
    const auto handler_count=[](GstElement* element) {
        if(!element)return 0u;
        const auto id=g_signal_lookup("autoplug-select",G_OBJECT_TYPE(element));
        if(!id)return 0u;
        const guint count=g_signal_handlers_block_matched(element,G_SIGNAL_MATCH_ID,id,0,nullptr,nullptr,nullptr);
        g_signal_handlers_unblock_matched(element,G_SIGNAL_MATCH_ID,id,0,nullptr,nullptr,nullptr);return count;
    };
    unsigned finalized=0;
    const auto finalized_callback=+[](gpointer data,GObject*){++*static_cast<unsigned*>(data);};
    bool attached=false,dynamic_attached=false;guint once=0,twice=0;
    std::array<bool,4> emitted{};
    if(root&&existing&&nested&&dynamic) {
        g_object_weak_ref(G_OBJECT(root),finalized_callback,&finalized);
        g_object_weak_ref(G_OBJECT(existing),finalized_callback,&finalized);
        g_object_weak_ref(G_OBJECT(dynamic),finalized_callback,&finalized);
        gst_bin_add(GST_BIN(root),existing);core::InstallDecodeCompatibility(root);
        once=handler_count(existing);attached=once==(kHostMacos?1u:0u);
        core::InstallDecodeCompatibility(root);twice=handler_count(existing);
        // helper와 독립적으로 실제 signal enum nick을 읽고 호출 ABI/선택 결과를 대조한다.
        GSignalQuery query{};g_signal_query(g_signal_lookup("autoplug-select",G_OBJECT_TYPE(existing)),&query);
        auto* enum_class=G_TYPE_IS_ENUM(query.return_type)?G_ENUM_CLASS(g_type_class_ref(query.return_type)):nullptr;
        const auto* attempt=enum_class?g_enum_get_value_by_nick(enum_class,"try"):nullptr;
        const auto* skip=enum_class?g_enum_get_value_by_nick(enum_class,"skip"):nullptr;
        auto* target=gst_element_factory_find("vtdec_hw");
        if(!target)target=gst_element_factory_find("vtdec");
        auto* software=gst_element_factory_find("avdec_h264");
        if(!target&&software)target=GST_ELEMENT_FACTORY(gst_object_ref(software));
        auto* plugin=target?gst_plugin_feature_get_plugin(GST_PLUGIN_FEATURE(target)):nullptr;
        const auto target_name=target?std::string_view(gst_plugin_feature_get_name(GST_PLUGIN_FEATURE(target))):std::string_view{};
        const bool expected_skip=kHostMacos&&plugin&&(target_name=="vtdec_hw"||target_name=="vtdec")&&
            std::string_view(gst_plugin_get_name(plugin))=="applemedia"&&std::string_view(gst_plugin_get_version(plugin))=="1.28.1";
        auto* pad=gst_pad_new(nullptr,GST_PAD_SRC);
        auto* h264=gst_caps_new_empty_simple("video/x-h264");auto* any=gst_caps_new_any();auto* h265=gst_caps_new_empty_simple("video/x-h265");
        if(attempt&&skip&&target&&software&&pad) {
            gint answer=-1;
            g_signal_emit_by_name(existing,"autoplug-select",pad,h264,target,&answer);emitted[0]=answer==(expected_skip?skip->value:attempt->value);
            answer=-1;g_signal_emit_by_name(existing,"autoplug-select",pad,any,target,&answer);emitted[1]=answer==attempt->value;
            answer=-1;g_signal_emit_by_name(existing,"autoplug-select",pad,h265,target,&answer);emitted[2]=answer==attempt->value;
            answer=-1;g_signal_emit_by_name(existing,"autoplug-select",pad,h264,software,&answer);emitted[3]=answer==attempt->value;
        }
        gst_caps_unref(h264);gst_caps_unref(any);gst_caps_unref(h265);
        if(pad)gst_object_unref(pad);
        if(plugin)gst_object_unref(plugin);
        if(target)gst_object_unref(target);
        if(software)gst_object_unref(software);
        if(enum_class)g_type_class_unref(enum_class);
        gst_bin_add(GST_BIN(root),nested);gst_bin_add(GST_BIN(nested),dynamic);
        dynamic_attached=handler_count(dynamic)==(kHostMacos?1u:0u);
        gst_object_unref(root);root=nullptr;existing=nullptr;nested=nullptr;dynamic=nullptr;
    }
    check(attached,"HW-MH01 existing decodebin hook follows platform gate");
    check(once==(kHostMacos?1u:0u)&&twice==once,"HW-MH02 repeated installation does not duplicate hooks");
    check(dynamic_attached,"HW-MH03 dynamically nested decodebin hook follows platform gate");
    check(initial_ranks==ranks(),"HW-MH04 installation leaves global factory ranks unchanged");
    check(finalized==3,"HW-MH05 root and decoder lifetimes retain no external references");
    check(emitted[0],"HW-MH09 actual H264 signal returns SKIP only for installed affected tuple");
    check(emitted[1],"HW-MH10 actual ANY caps signal returns TRY");
    check(emitted[2],"HW-MH11 actual H265 caps signal returns TRY");
    check(emitted[3],"HW-MH12 actual avdec_h264 candidate signal returns TRY");
    if(root)gst_object_unref(root);
    if(existing)gst_object_unref(existing);
    if(nested)gst_object_unref(nested);
    if(dynamic)gst_object_unref(dynamic);
    const auto marker=g_quark_from_static_string("media-server-decode-compatibility-installed-v1");
    auto* marked=gst_bin_new(nullptr);
    g_object_set_qdata(G_OBJECT(marked),marker,GINT_TO_POINTER(1));
    check(core::InstallDecodeCompatibility(marked)==!kHostMacos&&g_object_get_qdata(G_OBJECT(marked),marker)==GINT_TO_POINTER(1),
        "HW-MH06 in-progress marker is not completion on macOS and untouched elsewhere");
    g_object_set_qdata(G_OBJECT(marked),marker,GINT_TO_POINTER(3));
    check(core::InstallDecodeCompatibility(marked)==!kHostMacos&&core::InstallDecodeCompatibility(marked)==!kHostMacos&&g_object_get_qdata(G_OBJECT(marked),marker)==GINT_TO_POINTER(3),
        "HW-MH07 failed marker remains failed across repeated installation");
    gst_object_unref(marked);
    auto* failed_pipeline=gst_pipeline_new(nullptr);auto* failed_child=gst_bin_new(nullptr);
    core::InstallDecodeCompatibility(failed_pipeline);
    g_object_set_qdata(G_OBJECT(failed_child),marker,GINT_TO_POINTER(3));
    auto* failed_bus=gst_element_get_bus(failed_pipeline);
    gst_bin_add(GST_BIN(failed_pipeline),failed_child);
    auto* failure_message=gst_bus_pop_filtered(failed_bus,GST_MESSAGE_ERROR);
    bool fixed_error=false;
    if(failure_message) {
        GError* issue=nullptr;gst_message_parse_error(failure_message,&issue,nullptr);
        fixed_error=issue&&issue->domain==GST_CORE_ERROR&&issue->code==GST_CORE_ERROR_FAILED;
        if(issue)g_error_free(issue);
        gst_message_unref(failure_message);
    }
    check(kHostMacos?fixed_error:!failure_message,"HW-MH08 dynamic installation failure posts bus ERROR only on macOS");
    gst_object_unref(failed_bus);gst_object_unref(failed_pipeline);
    std::cout<<"[summary] pass="<<pass<<" fail="<<fail<<'\n';return fail?1:0;
}
} // namespace
static bool OwnedRoot(const char* value) {
    const std::filesystem::path root(value);std::error_code error;struct stat facts{};
    if(!root.is_absolute()||lstat(value,&facts)!=0||!S_ISDIR(facts.st_mode)||
       (facts.st_mode&07777)!=0700||facts.st_uid!=geteuid())return false;
    const std::string prefix="media-server-hw-impact.";const auto name=root.filename().string();
    if(name.compare(0,prefix.size(),prefix)!=0||name.size()!=prefix.size()+6)return false;
    for(std::size_t i=prefix.size();i<name.size();++i)if(!g_ascii_isalnum(static_cast<guchar>(name[i])))return false;
    const auto real=std::filesystem::canonical(root,error);
    return !error&&real==root; // 원본 인자에 symlink, 상대 경로, .. 별칭을 허용하지 않는다.
}
int main(int argc,char** argv) {
    if(argc!=3) return 2;
    const std::string mode=argv[2];
    if(mode!="--self-test"&&mode!="--rtsp-impact"&&mode!="--drain-diagnosis"&&mode!="--mitigation-impact")return 2;
    if(!OwnedRoot(argv[1])) { std::cout<<"[result] reason=unowned-root exit=2\n";return 2; }
    gst_init(nullptr,nullptr);
    if(mode=="--self-test")return SelfTest();
    unsigned attempts=0,current_round=0;const char* current_case="preparation";
    try {
        auto normal=Encode(20,false,false),reordered=Encode(30,true,false);
        Shift(normal,0);Shift(reordered,0);
        const auto a=Input(normal,"normal20"),b=Input(reordered,"bframe30");
        if(mode=="--mitigation-impact") {
            constexpr const char* names[]={"HW-MI01-normal20-burst","HW-MI02-normal20-paced","HW-MI03-bframe30-burst","HW-MI04-bframe30-paced"};
            for(unsigned cell=0;cell<4;++cell) {
                current_case=names[cell];current_round=1;++attempts;
                const auto& input=cell<2?normal:reordered;const auto& expected=cell<2?a:b;
                const int result=Observe(input,expected,current_case,1,false,(cell%2)==1,true);
                if(result) {
                    std::cout<<"[mitigation-summary] cells="<<attempts<<" productPass=0 stopped_case="<<current_case<<" exit="<<result<<'\n';return result;
                }
            }
            std::cout<<"[mitigation-summary] cells=4 assertions=8 productPass=1 scope=h264-input-finite-rtsp-builder-4cells releasePass=0 exit=0\n";return 0;
        }
        if(mode=="--drain-diagnosis") {
            unsigned mismatches=0;
            constexpr const char* names[]={"HW-DG01-normal20-burst","HW-DG02-normal20-paced","HW-DG03-bframe30-burst","HW-DG04-bframe30-paced"};
            for(unsigned cell=0;cell<4;++cell) {
                current_case=names[cell];current_round=1;++attempts;
                const auto& input=cell<2?normal:reordered;const auto& expected=cell<2?a:b;
                const int result=Observe(input,expected,current_case,1,true,(cell%2)==1);
                if(result==2) {
                    std::cout<<"[drain-summary] cells="<<attempts<<" mismatches="<<mismatches<<" diagnosisCompleted=0 productPass=0 stopped_case="<<current_case<<" exit=2\n";return 2;
                }
                if(result==1)++mismatches;
            }
            const int result=mismatches?1:3;
            std::cout<<"[drain-summary] cells=4 mismatches="<<mismatches<<" diagnosisCompleted=1 productPass=0 causeResolved=0 exit="<<result<<'\n';return result;
        }
        for(unsigned round=1;round<=16;++round) {
            current_round=round;current_case="normal20";
            ++attempts;int result=Observe(normal,a,"normal20",round);
            if(result) { std::cout<<"[summary] attempts="<<attempts<<" first_failure_case=normal20 first_failure_round="<<round<<" exit="<<result<<'\n';return result; }
            current_case="bframe30";++attempts;result=Observe(reordered,b,"bframe30",round);
            if(result) { std::cout<<"[summary] attempts="<<attempts<<" first_failure_case=bframe30 first_failure_round="<<round<<" exit="<<result<<'\n';return result; }
        }
        std::cout<<"[summary] outcome=not-reproduced attempts=32 first_failure_case=none first_failure_round=0 product_unaffected=0 cause_resolved=0 exit=3\n";return 3;
    } catch(...) {
        std::cout<<"[summary] outcome=preparation-failure attempts="<<attempts<<" first_failure_case="<<current_case
            <<" first_failure_round="<<current_round<<" exit=2\n";return 2;
    }
}

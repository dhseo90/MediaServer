// 검증 전용 wrapper: 제품 writer의 설정과 buffer를 변경하지 않는다.
#include <gst/app/gstappsrc.h>
#include <gst/gst.h>
#include <filesystem>
#include <fstream>
#include <map>
#include <memory>
#include <mutex>
#include <string>
#include <vector>
#include <stdexcept>
#include "recording/recording_write_boundaries.h"
namespace forward_probe {
std::filesystem::path root;
std::size_t serial=0;
struct Capture {
    std::mutex mutex;
    std::ofstream accepted,mux,events,binding;
    std::size_t accepted_count=0,mux_count=0;
    bool installed=false,failed=false;
    explicit Capture(const std::filesystem::path& prefix):accepted(prefix.string()+"-accepted.csv"),mux(prefix.string()+"-mux.csv"),events(prefix.string()+"-events.csv"),binding(prefix.string()+"-binding.csv") {
        const char* header="index,pts,dts,duration,bytes,sha256,vcl\n";
        accepted<<header;mux<<header;
        events<<"kind,format,start,stop,time,base,offset,rate,applied_rate\n";
        binding<<"ordinal,pts_ns\n";
    }
};
std::map<GstAppSrc*,std::shared_ptr<Capture>> captures;
std::vector<std::shared_ptr<Capture>> all;
thread_local Capture* pending_binding=nullptr;
std::string Digest(const unsigned char* data,std::size_t size) {
    gchar* hash=g_compute_checksum_for_data(G_CHECKSUM_SHA256,data,size);
    if(!hash)throw std::runtime_error("forward-hash");
    std::string result(hash);g_free(hash);return result;
}
std::string Time(GstClockTime value){return GST_CLOCK_TIME_IS_VALID(value)?std::to_string(value):"null";}
std::string Record(GstBuffer* buffer,unsigned avc_width=0) {
    std::vector<unsigned char> bytes(gst_buffer_get_size(buffer)),canonical;
    if(gst_buffer_extract(buffer,0,bytes.data(),bytes.size())!=bytes.size())throw std::runtime_error("forward-extract");
    auto nal=[&](std::size_t begin,std::size_t end) {
        if(begin>=end)throw std::runtime_error("forward-empty-nal");
        const auto type=bytes[begin]&31;
        if(type!=1&&type!=5)return;
        const auto size=end-begin;
        if(size>0xffffffffULL)throw std::runtime_error("forward-nal-size");
        for(int shift=24;shift>=0;shift-=8)canonical.push_back((size>>shift)&255);
        canonical.insert(canonical.end(),bytes.begin()+begin,bytes.begin()+end);
    };
    if(avc_width) {
        for(std::size_t pos=0;pos<bytes.size();) {
            if(pos+avc_width>bytes.size())throw std::runtime_error("forward-avc-header");
            std::size_t size=0;for(unsigned i=0;i<avc_width;++i)size=(size<<8)|bytes[pos++];
            if(!size||size>bytes.size()-pos)throw std::runtime_error("forward-avc-bound");
            nal(pos,pos+size);pos+=size;
        }
    } else {
        std::vector<std::pair<std::size_t,std::size_t>> starts;
        for(std::size_t i=0;i+3<=bytes.size();) {
            std::size_t width=0;
            if(i+4<=bytes.size()&&!bytes[i]&&!bytes[i+1]&&!bytes[i+2]&&bytes[i+3]==1)width=4;
            else if(!bytes[i]&&!bytes[i+1]&&bytes[i+2]==1)width=3;
            if(width){starts.push_back({i,i+width});i+=width;}else ++i;
        }
        for(std::size_t i=0;i<starts.size();++i) {
            const auto begin=starts[i].second;auto end=i+1<starts.size()?starts[i+1].first:bytes.size();
            while(end>begin&&!bytes[end-1])--end;
            nal(begin,end);
        }
    }
    if(canonical.empty())throw std::runtime_error("forward-vcl-missing");
    return Time(GST_BUFFER_PTS(buffer))+","+Time(GST_BUFFER_DTS(buffer))+","+Time(GST_BUFFER_DURATION(buffer))+","+std::to_string(bytes.size())+","+Digest(bytes.data(),bytes.size())+","+Digest(canonical.data(),canonical.size());
}
GstPadProbeReturn Observe(GstPad* pad,GstPadProbeInfo* info,gpointer user) {
    auto& capture=*static_cast<Capture*>(user);std::lock_guard lock(capture.mutex);
    try {
        if(GST_PAD_PROBE_INFO_TYPE(info)&GST_PAD_PROBE_TYPE_EVENT_DOWNSTREAM) {
            auto* event=GST_PAD_PROBE_INFO_EVENT(info);
            if(GST_EVENT_TYPE(event)==GST_EVENT_SEGMENT) {
                const GstSegment* s=nullptr;gst_event_parse_segment(event,&s);
                capture.events<<"segment,"<<s->format<<','<<s->start<<','<<s->stop<<','<<s->time<<','<<s->base<<','<<s->offset<<','<<s->rate<<','<<s->applied_rate<<'\n';
            }
        }
        if(GST_PAD_PROBE_INFO_TYPE(info)&GST_PAD_PROBE_TYPE_BUFFER) {
            auto* caps=gst_pad_get_current_caps(pad);
            if(!caps)throw std::runtime_error("forward-caps");
            const auto* s=gst_caps_get_structure(caps,0);const char* format=gst_structure_get_string(s,"stream-format");
            unsigned width=0;
            if(format&&std::string(format)=="avc") {
                const auto* value=gst_structure_get_value(s,"codec_data");
                auto* codec=value?gst_value_get_buffer(value):nullptr;
                unsigned char data[5]{};
                if(codec&&gst_buffer_extract(codec,0,data,5)==5)width=(data[4]&3)+1;
            }
            gst_caps_unref(caps);
            if(!width)throw std::runtime_error("forward-avc-caps");
            capture.mux<<capture.mux_count++<<','<<Record(GST_PAD_PROBE_INFO_BUFFER(info),width)<<'\n';
        }
    } catch(const std::exception& e){capture.failed=true;capture.events<<"error:"<<e.what()<<"\n";}
    return GST_PAD_PROBE_OK;
}
GstElement* Factory(const gchar* name,const gchar* requested_name) {
    auto* element=gst_element_factory_make(name,requested_name);
    if(element&&std::string(name)=="appsrc") {
        auto capture=std::make_shared<Capture>(root/("forward-"+std::to_string(serial++)));
        captures[GST_APP_SRC(element)]=capture;all.push_back(capture);
    }
    return element;
}
GstFlowReturn Push(GstAppSrc* source,GstBuffer* buffer) {
    auto capture=captures.at(source);
    if(!capture->installed) {
        auto* pipeline=gst_object_get_parent(GST_OBJECT(source));
        auto* iterator=gst_bin_iterate_elements(GST_BIN(pipeline));GValue value=G_VALUE_INIT;
        while(gst_iterator_next(iterator,&value)==GST_ITERATOR_OK) {
            auto* element=GST_ELEMENT(g_value_get_object(&value));auto* factory=gst_element_get_factory(element);
            if(factory&&std::string(gst_plugin_feature_get_name(GST_PLUGIN_FEATURE(factory)))=="h264parse") {
                auto* src=gst_element_get_static_pad(element,"src");auto* sink=gst_pad_get_peer(src);
                if(sink){gst_pad_add_probe(sink,static_cast<GstPadProbeType>(GST_PAD_PROBE_TYPE_BUFFER|GST_PAD_PROBE_TYPE_EVENT_DOWNSTREAM),Observe,capture.get(),nullptr);capture->installed=true;gst_object_unref(sink);}
                gst_object_unref(src);
            }
            g_value_reset(&value);
        }
        g_value_unset(&value);gst_iterator_free(iterator);gst_object_unref(pipeline);
        if(!capture->installed){gst_buffer_unref(buffer);throw std::runtime_error("forward-mux-pad");}
    }
    const auto record=Record(buffer);
    const auto result=gst_app_src_push_buffer(source,buffer);
    pending_binding=capture.get();
    if(result==GST_FLOW_OK){std::lock_guard lock(capture->mutex);capture->accepted<<capture->accepted_count++<<','<<record<<'\n';}
    return result;
}
}
namespace recording::detail {
bool ForwardAccept(bool accepted,RecordingSourceBindingV1& binding,RecordingSourceSampleV1 sample) {
    const bool result=AcceptSourceSample(accepted,binding,sample);
    if(result&&forward_probe::pending_binding) {
        auto& c=*forward_probe::pending_binding;std::lock_guard lock(c.mutex);
        c.binding<<sample.ordinal<<','<<sample.pts_ns<<'\n';
    }
    forward_probe::pending_binding=nullptr;return result;
}
}
void ForwardProbeBegin(const std::filesystem::path& root) {
    forward_probe::root=root;forward_probe::serial=0;forward_probe::captures.clear();forward_probe::all.clear();
}
void ForwardProbeEnd() {
    for(const auto& capture:forward_probe::all) {
        std::lock_guard lock(capture->mutex);capture->accepted.flush();capture->mux.flush();capture->events.flush();capture->binding.flush();
        if(capture->failed||!capture->accepted||!capture->mux||!capture->events||!capture->binding)throw std::runtime_error("forward-capture-failed");
    }
}
#define gst_element_factory_make forward_probe::Factory
#define gst_app_src_push_buffer forward_probe::Push
#define AcceptSourceSample ForwardAccept
#include "../../src/recording/gstreamer_segment_writer.cpp"
#undef gst_app_src_push_buffer
#undef AcceptSourceSample
#undef gst_element_factory_make

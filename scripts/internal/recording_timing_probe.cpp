// 파일 용도: 검증 전용: writer 입력과 qtdemux/h264parse 경계를 계측한다. 제품 판정은 변경하지 않는다.
#include "recording_media_test_fixture.h"
#include <fstream>
#include <gst/app/gstappsrc.h>
namespace {
std::string N(GstClockTime n) { return GST_CLOCK_TIME_IS_VALID(n)?std::to_string(n):"null"; }
std::string Hash(GstBuffer* b) {
    GstMapInfo m{}; if(!gst_buffer_map(b,&m,GST_MAP_READ))throw std::runtime_error("map");
    auto* c=g_checksum_new(G_CHECKSUM_SHA256);g_checksum_update(c,m.data,m.size);
    std::string out=g_checksum_get_string(c);g_checksum_free(c);gst_buffer_unmap(b,&m);return out;
}
struct Capture { std::ofstream out;std::size_t count=0; explicit Capture(const std::filesystem::path& p):out(p){out<<"index,pts,dts,duration,bytes,sha256\n";} };
GstPadProbeReturn Observe(GstPad*,GstPadProbeInfo* info,gpointer data) {
    auto& c=*static_cast<Capture*>(data); auto* b=GST_PAD_PROBE_INFO_BUFFER(info);
    if(b)c.out<<c.count++<<','<<N(GST_BUFFER_PTS(b))<<','<<N(GST_BUFFER_DTS(b))<<','<<N(GST_BUFFER_DURATION(b))<<','<<gst_buffer_get_size(b)<<','<<Hash(b)<<'\n';
    return GST_PAD_PROBE_OK;
}
void PadAdded(GstElement*,GstPad* pad,gpointer data){gst_pad_add_probe(pad,GST_PAD_PROBE_TYPE_BUFFER,Observe,data,nullptr);}
void InputParser(const Encoded& input,const std::filesystem::path& output) {
    Pipeline pipe("appsrc name=in is-live=true block=true format=time ! h264parse ! video/x-h264,stream-format=avc,alignment=au ! appsink name=out sync=false");
    auto* source=gst_bin_get_by_name(GST_BIN(pipe.pipeline),"in");auto* caps=gst_caps_from_string(input.descriptor.tracks[0].caps_string.c_str());gst_app_src_set_caps(GST_APP_SRC(source),caps);gst_caps_unref(caps);
    for(const auto& p:input.packets){auto* b=gst_buffer_new_allocate(nullptr,p.payload.size(),nullptr);gst_buffer_fill(b,0,p.payload.data(),p.payload.size());GST_BUFFER_PTS(b)=p.pts;GST_BUFFER_DTS(b)=p.dts;GST_BUFFER_DURATION(b)=*p.observation->duration_ns;if(!p.is_key_frame)GST_BUFFER_FLAG_SET(b,GST_BUFFER_FLAG_DELTA_UNIT);if(gst_app_src_push_buffer(GST_APP_SRC(source),b)!=GST_FLOW_OK)throw std::runtime_error("input-parser-push");}
    gst_app_src_end_of_stream(GST_APP_SRC(source));Capture out(output);for(std::size_t i=0;i<input.packets.size();++i){auto* sample=gst_app_sink_try_pull_sample(GST_APP_SINK(pipe.sink),3*GST_SECOND);if(!sample)throw std::runtime_error("input-parser-count");auto* b=gst_sample_get_buffer(sample);out.out<<i<<','<<N(GST_BUFFER_PTS(b))<<','<<N(GST_BUFFER_DTS(b))<<','<<N(GST_BUFFER_DURATION(b))<<','<<gst_buffer_get_size(b)<<','<<Hash(b)<<'\n';gst_sample_unref(sample);}gst_object_unref(source);
}
void Read(const std::filesystem::path& path,const std::filesystem::path& prefix,std::size_t expected) {
    Capture demux(prefix.string()+"-demux.csv"),parse(prefix.string()+"-parse.csv");GError* error=nullptr;
    auto* p=gst_parse_launch(("filesrc location=\""+path.string()+"\" ! qtdemux name=d ! h264parse name=h ! video/x-h264,stream-format=byte-stream,alignment=au ! appsink name=out sync=false").c_str(),&error);
    if(!p||error)throw std::runtime_error("parse-launch");
    auto* d=gst_bin_get_by_name(GST_BIN(p),"d");auto* h=gst_bin_get_by_name(GST_BIN(p),"h");auto* sink=gst_bin_get_by_name(GST_BIN(p),"out");
    g_signal_connect(d,"pad-added",G_CALLBACK(PadAdded),&demux);auto* pad=gst_element_get_static_pad(h,"src");gst_pad_add_probe(pad,GST_PAD_PROBE_TYPE_BUFFER,Observe,&parse,nullptr);
    gst_element_set_state(p,GST_STATE_PLAYING);bool eos=false;std::size_t count=0;
    for(;count<=expected;++count){auto* s=gst_app_sink_try_pull_sample(GST_APP_SINK(sink),3*GST_SECOND);if(!s){eos=gst_app_sink_is_eos(GST_APP_SINK(sink));break;}gst_sample_unref(s);}
    gst_element_set_state(p,GST_STATE_NULL);gst_object_unref(pad);gst_object_unref(sink);gst_object_unref(h);gst_object_unref(d);gst_object_unref(p);
    if(!eos||count!=expected||demux.count!=expected||parse.count!=expected)throw std::runtime_error("boundary-count");
}
void Run(const std::filesystem::path& root,int which) {
    const std::string id="TP0"+std::to_string(which);const auto dest=root/id;std::filesystem::create_directories(dest);
    auto input=which==1?Encode(501,false,false,160,90,30,250):Encode(which==4?12:30,which==3,which==2,160,90,30,250);
    Shift(input,0); // 기존 fixture의 동일 원점 정규화 경로도 그대로 사용한다.
    if(which==1)input.packets.resize(300);
    if(which==4){std::int64_t t=0;for(std::size_t i=0;i<input.packets.size();++i){auto& p=input.packets[i];p.pts=p.dts=t;p.observation->pts_ns=t;p.observation->dts_ns=t;p.observation->duration_ns=i+1==input.packets.size()?70000000:(i%2?50000000:20000000);t+=*p.observation->duration_ns;}}
    Capture original(dest/"input.csv");for(const auto& p:input.packets){auto* b=gst_buffer_new_allocate(nullptr,p.payload.size(),nullptr);gst_buffer_fill(b,0,p.payload.data(),p.payload.size());original.out<<original.count++<<','<<p.pts<<','<<p.dts<<','<<*p.observation->duration_ns<<','<<p.payload.size()<<','<<Hash(b)<<'\n';gst_buffer_unref(b);}original.out.flush();
    if(which==4)InputParser(input,dest/"input-parser.csv");
    Store store(dest/"store");recording::GStreamerSegmentWriter::Options o(store.root,which==1?2000:10000);o.managed_journal=&store.journal;o.managed_catalog=&store.catalog;o.managed_store_id="probe-store";
    recording::GStreamerSegmentWriter w(o);std::string error;if(!w.Start("probe-channel","unused",input.descriptor,[](auto,auto,auto*){return false;},&error))throw std::runtime_error("writer-start:"+error);
    for(const auto& p:input.packets)w.Push(p,0);
    if(which==1){auto before=store.Segments();if(before.size()!=1||store.catalog.FindSourceBinding(before[0].segment_id)->samples.size()!=250)throw std::runtime_error("checkpoint");std::cout<<"[checkpoint] TP01 finalized=250 unfinalized=50\n";}
    w.Stop();auto segments=store.Segments();if(segments.size()!=(which==1?2U:1U))throw std::runtime_error("segments");
    std::ofstream manifest(dest/"manifest.csv");manifest<<"segment,file,ordinal,count,media_start\n";std::size_t i=0,total=0;
    for(const auto& s:segments){const auto binding=store.catalog.FindSourceBinding(s.segment_id);if(!binding||!binding->index_complete)throw std::runtime_error("binding");const auto path=store.root/"probe-channel"/(s.segment_id+".mp4");const auto prefix=dest/("segment-"+std::to_string(i));manifest<<i<<','<<std::filesystem::relative(path,dest).string()<<','<<binding->samples.front().ordinal<<','<<binding->samples.size()<<','<<s.media_start_pts<<'\n';Read(path,prefix,binding->samples.size());total+=binding->samples.size();++i;}
    if(total!=input.packets.size())throw std::runtime_error("total");std::cout<<"[capture] "<<id<<" samples="<<total<<" segments="<<segments.size()<<'\n';
}
}
int main(int argc,char** argv){if(argc!=2)return 2;gst_init(nullptr,nullptr);std::cout<<"[gstreamer] "<<gst_version_string()<<'\n';try{for(int i=1;i<=4;++i)Run(argv[1],i);return 0;}catch(const std::exception& e){std::cerr<<"[fail] "<<e.what()<<'\n';return 1;}}

#pragma once
// 검사 소유 관측만 수행한다. probe는 buffer/event를 변경하거나 판정하지 않는다.
#include <gst/gst.h>
#include <algorithm>
#include <array>
#include <chrono>
#include <cstdint>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <memory>
#include <mutex>
#include <string>
#include <string_view>
#include <vector>
namespace writer_decode_diagnostics {
inline std::string SafeFactory(const char* text){if(!text)return "none";std::string s(text);if(s.empty()||s.size()>64)return "unavailable";for(const unsigned char c:s)if(!((c>='a'&&c<='z')||(c>='A'&&c<='Z')||(c>='0'&&c<='9')||c=='_'||c=='-'))return "unavailable";return s;}
struct FileFacts {bool present=false,hashed=false;std::uintmax_t bytes=0;std::string sha="none";};
inline FileFacts File(const std::filesystem::path& path){FileFacts f;std::error_code e;if(!std::filesystem::is_regular_file(path,e)||e)return f;f.bytes=std::filesystem::file_size(path,e);if(e)return f;f.present=true;if(f.bytes>64*1024*1024)return f;
 std::ifstream in(path,std::ios::binary);if(!in)return f;auto* sum=g_checksum_new(G_CHECKSUM_SHA256);if(!sum)return f;std::array<char,65536> block{};std::uintmax_t read=0;
 while(in){in.read(block.data(),block.size());const auto n=in.gcount();if(n>0){read+=static_cast<std::uintmax_t>(n);g_checksum_update(sum,reinterpret_cast<const guchar*>(block.data()),static_cast<gssize>(n));}if(read>64*1024*1024)break;}
 if(in.eof()&&read==f.bytes){f.hashed=true;f.sha=g_checksum_get_string(sum);}g_checksum_free(sum);return f;
}
inline void PrintFile(const char* label,const char* stage,const FileFacts& f){std::cout<<"[writer-diag-file] case="<<label<<" stage="<<stage<<" present="<<f.present<<" bytes="<<f.bytes<<" hashed="<<f.hashed<<" sha256="<<f.sha<<'\n';}
template<class Input>void InputRows(const char* label,const Input& input){auto* sum=g_checksum_new(G_CHECKSUM_SHA256);std::size_t total=0,index=0;
 for(const auto& p:input.packets){total+=p.payload.size();if(sum&&!p.payload.empty())g_checksum_update(sum,p.payload.data(),static_cast<gssize>(p.payload.size()));if(index<128){std::cout<<"[writer-diag-input] case="<<label<<" index="<<index<<" pts="<<p.pts<<" dts="<<p.dts<<" bytes="<<p.payload.size()<<" key="<<p.is_key_frame<<" observation="<<static_cast<bool>(p.observation)<<" duration_valid="<<(p.observation&&p.observation->duration_ns.has_value())<<" duration="<<(p.observation&&p.observation->duration_ns?*p.observation->duration_ns:0)<<'\n';}++index;}
 std::cout<<"[writer-diag-input-summary] case="<<label<<" packets="<<input.packets.size()<<" bytes="<<total<<" payload_sha256="<<(sum?g_checksum_get_string(sum):"none")<<" rows_dropped="<<(index>128?index-128:0)<<'\n';if(sum)g_checksum_free(sum);
}
class Trace {
 using Clock=std::chrono::steady_clock;
 struct Row {const char* kind="none";std::size_t pad=0;guint64 pts=0,dts=0,duration=0,size=0,start=0,stop=0,time=0,base=0,offset=0;std::int64_t elapsed_us=0;unsigned valid=0;int format=0;double rate=0,applied_rate=0;};
 struct Pad {Trace* owner;GstPad* pad;gulong probe=0;std::string factory;const char* role;const char* direction;std::size_t index,buffers=0,eos=0,segments=0;};
 struct Element {GstElement* element;gulong added;std::string factory;const char* role;};
 std::mutex mu_;std::vector<std::unique_ptr<Pad>> pads_;std::vector<Element> elements_;std::array<std::array<Row,128>,25> rows_{};std::array<std::size_t,25> used_{},dropped_{},buffers_{};std::array<std::int64_t,25> first_us_{},last_us_{};std::size_t unobserved_=0;GstElement* pipeline_=nullptr;gulong deep_=0;const char* label_;std::filesystem::path path_;FileFacts before_;Clock::time_point began_=Clock::now();
 unsigned bus_errors_=0,bus_eos_=0;std::array<std::pair<unsigned,int>,16> errors_{};
 void Save(Row row){row.elapsed_us=std::chrono::duration_cast<std::chrono::microseconds>(Clock::now()-began_).count();const auto p=row.pad;if(p>=rows_.size()){++unobserved_;return;}if(row.kind==std::string_view("buffer")){if(buffers_[p]++==0)first_us_[p]=row.elapsed_us;last_us_[p]=row.elapsed_us;}if(used_[p]<rows_[p].size())rows_[p][used_[p]++]=row;else ++dropped_[p];}
 void BufferLocked(GstBuffer* b,std::size_t pad){Row r;r.kind="buffer";r.pad=pad;r.size=gst_buffer_get_size(b);r.valid=(GST_BUFFER_PTS_IS_VALID(b)?1u:0u)|(GST_BUFFER_DTS_IS_VALID(b)?2u:0u)|(GST_BUFFER_DURATION_IS_VALID(b)?4u:0u);r.pts=GST_BUFFER_PTS_IS_VALID(b)?GST_BUFFER_PTS(b):0;r.dts=GST_BUFFER_DTS_IS_VALID(b)?GST_BUFFER_DTS(b):0;r.duration=GST_BUFFER_DURATION_IS_VALID(b)?GST_BUFFER_DURATION(b):0;Save(r);}
 static GstPadProbeReturn Probe(GstPad*,GstPadProbeInfo* info,gpointer data){auto& p=*static_cast<Pad*>(data);auto& t=*p.owner;std::lock_guard lock(t.mu_);
  if(GST_PAD_PROBE_INFO_TYPE(info)&GST_PAD_PROBE_TYPE_BUFFER){auto* b=GST_PAD_PROBE_INFO_BUFFER(info);if(b){++p.buffers;t.BufferLocked(b,p.index);}}
  if(GST_PAD_PROBE_INFO_TYPE(info)&GST_PAD_PROBE_TYPE_EVENT_DOWNSTREAM){auto* e=GST_PAD_PROBE_INFO_EVENT(info);if(e&&GST_EVENT_TYPE(e)==GST_EVENT_EOS){++p.eos;Row r;r.kind="eos";r.pad=p.index;t.Save(r);}else if(e&&GST_EVENT_TYPE(e)==GST_EVENT_SEGMENT){const GstSegment* s=nullptr;gst_event_parse_segment(e,&s);if(s){++p.segments;Row r;r.kind="segment";r.pad=p.index;r.format=static_cast<int>(s->format);r.start=s->start;r.stop=s->stop;r.time=s->time;r.base=s->base;r.offset=s->offset;r.rate=s->rate;r.applied_rate=s->applied_rate;t.Save(r);}}}
  return GST_PAD_PROBE_OK;
 }
 void AddPad(GstElement* element,GstPad* pad){std::lock_guard lock(mu_);for(const auto& p:pads_)if(p->pad==pad)return;const Element* found=nullptr;for(const auto& e:elements_)if(e.element==element){found=&e;break;}if(!found)return;if(pads_.size()>=24){++unobserved_;return;}
  auto p=std::make_unique<Pad>();p->owner=this;p->pad=GST_PAD(gst_object_ref(pad));p->factory=found->factory;p->role=found->role;p->direction=GST_PAD_DIRECTION(pad)==GST_PAD_SINK?"sink":"src";p->index=pads_.size();auto* stable=p.get();pads_.push_back(std::move(p));stable->probe=gst_pad_add_probe(pad,static_cast<GstPadProbeType>(GST_PAD_PROBE_TYPE_BUFFER|GST_PAD_PROBE_TYPE_EVENT_DOWNSTREAM),Probe,stable,nullptr);
 }
 static void AddedPad(GstElement* element,GstPad* pad,gpointer data){auto* t=static_cast<Trace*>(data);try{t->AddPad(element,pad);}catch(...){std::lock_guard lock(t->mu_);++t->unobserved_;}}
 static void Deep(GstBin*,GstBin*,GstElement* element,gpointer data){auto* t=static_cast<Trace*>(data);try{t->ElementAdded(element);}catch(...){std::lock_guard lock(t->mu_);++t->unobserved_;}}
 void ElementAdded(GstElement* element){auto* f=gst_element_get_factory(element);if(!f)return;const char* klass=gst_element_factory_get_metadata(f,GST_ELEMENT_METADATA_KLASS);if(!klass)return;const std::string k(klass);const char* role=nullptr;
  if(k.find("Decoder")!=std::string::npos&&k.find("Video")!=std::string::npos)role="decoder";else if(k.find("Demuxer")!=std::string::npos)role="demux";else if(k.find("Parser")!=std::string::npos&&k.find("Video")!=std::string::npos)role="parser";if(!role)return;
  {std::lock_guard lock(mu_);for(const auto& e:elements_)if(e.element==element)return;if(elements_.size()>=12){++unobserved_;return;}elements_.push_back({GST_ELEMENT(gst_object_ref(element)),0,SafeFactory(gst_plugin_feature_get_name(GST_PLUGIN_FEATURE(f))),role});elements_.back().added=g_signal_connect(element,"pad-added",G_CALLBACK(AddedPad),this);}
  auto* iter=gst_element_iterate_pads(element);GValue item=G_VALUE_INIT;bool done=false;while(!done){switch(gst_iterator_next(iter,&item)){case GST_ITERATOR_OK:AddPad(element,GST_PAD(g_value_get_object(&item)));g_value_reset(&item);break;case GST_ITERATOR_RESYNC:gst_iterator_resync(iter);break;default:done=true;break;}}if(G_VALUE_TYPE(&item))g_value_unset(&item);gst_iterator_free(iter);
 }
public:
 Trace(const char* label,const std::filesystem::path& path,GstElement* pipeline,bool existing=false):pipeline_(pipeline),label_(label),path_(path),before_(File(path)){PrintFile(label_,"before",before_);deep_=g_signal_connect(pipeline_,"deep-element-added",G_CALLBACK(Deep),this);
  if(existing){auto* iter=gst_bin_iterate_recurse(GST_BIN(pipeline_));GValue item=G_VALUE_INIT;bool done=false;unsigned steps=0;while(!done&&steps++<128){switch(gst_iterator_next(iter,&item)){case GST_ITERATOR_OK:ElementAdded(GST_ELEMENT(g_value_get_object(&item)));g_value_reset(&item);break;case GST_ITERATOR_RESYNC:gst_iterator_resync(iter);break;default:done=true;break;}}if(!done)++unobserved_;if(G_VALUE_TYPE(&item))g_value_unset(&item);gst_iterator_free(iter);}
 }
 Trace(const Trace&)=delete;Trace& operator=(const Trace&)=delete;
 // 호출자는 먼저 pipeline을 NULL로 전환한다. probe context는 그때까지 안정 주소로 생존한다.
 ~Trace(){if(deep_)g_signal_handler_disconnect(pipeline_,deep_);for(auto& e:elements_){g_signal_handler_disconnect(e.element,e.added);gst_object_unref(e.element);}for(auto& p:pads_){if(p->probe)gst_pad_remove_probe(p->pad,p->probe);gst_object_unref(p->pad);}}
 void Sample(GstBuffer* b){std::lock_guard lock(mu_);BufferLocked(b,24);}
 void Bus(GstElement* pipeline){auto* bus=gst_element_get_bus(pipeline);for(unsigned i=0;i<32;++i){auto* m=gst_bus_pop_filtered(bus,static_cast<GstMessageType>(GST_MESSAGE_ERROR|GST_MESSAGE_EOS));if(!m)break;if(GST_MESSAGE_TYPE(m)==GST_MESSAGE_EOS)++bus_eos_;else{GError* error=nullptr;gst_message_parse_error(m,&error,nullptr);if(bus_errors_<errors_.size())errors_[bus_errors_]={error?error->domain:0,error?error->code:0};++bus_errors_;if(error)g_error_free(error);}gst_message_unref(m);}gst_object_unref(bus);}
 void Report(int count,bool eos,GstStateChangeReturn playing,const char* reason,bool full_rows=true){const auto elapsed=std::chrono::duration_cast<std::chrono::milliseconds>(Clock::now()-began_).count();const auto after=File(path_);PrintFile(label_,"after",after);std::lock_guard lock(mu_);bool decoder=false,demux=false,parser=false;
  for(const auto& e:elements_){decoder|=std::string(e.role)=="decoder";demux|=std::string(e.role)=="demux";parser|=std::string(e.role)=="parser";}
  std::size_t used=0,dropped=0;for(std::size_t p=0;p<rows_.size();++p){used+=used_[p];dropped+=dropped_[p];}
std::cout<<"[writer-diag-decode] case="<<label_<<" playing="<<static_cast<int>(playing)<<" reason="<<reason<<" count="<<count<<" appsink_eos="<<eos<<" elapsed_ms="<<elapsed<<" decoder_seen="<<decoder<<" demux_seen="<<demux<<" parser_seen="<<parser<<" rows="<<used<<" full_rows="<<full_rows<<" row_limit=3200 boundary_row_limit=128 rows_dropped="<<dropped<<" unobserved="<<unobserved_<<" bus_errors="<<bus_errors_<<" bus_eos="<<bus_eos_<<" file_same="<<(before_.hashed&&after.hashed&&before_.bytes==after.bytes&&before_.sha==after.sha)<<'\n';
  for(const auto& p:pads_)std::cout<<"[writer-diag-pad] case="<<label_<<" pad="<<p->index<<" role="<<p->role<<" direction="<<p->direction<<" factory="<<p->factory<<" buffers="<<p->buffers<<" eos="<<p->eos<<" segments="<<p->segments<<" rows="<<used_[p->index]<<" rows_dropped="<<dropped_[p->index]<<" first_frame_elapsed_us="<<first_us_[p->index]<<" last_frame_elapsed_us="<<last_us_[p->index]<<'\n';
  std::cout<<"[writer-diag-pad] case="<<label_<<" pad=24 role=appsink direction=pull factory=appsink buffers="<<count<<" eos="<<eos<<" rows="<<used_[24]<<" rows_dropped="<<dropped_[24]<<" first_frame_elapsed_us="<<first_us_[24]<<" last_frame_elapsed_us="<<last_us_[24]<<'\n';
  if(full_rows)for(std::size_t p=0;p<rows_.size();++p)for(std::size_t i=0;i<used_[p];++i){const auto& r=rows_[p][i];std::cout<<"[writer-diag-row] case="<<label_<<" index="<<i<<" pad="<<r.pad<<" kind="<<r.kind<<" elapsed_us="<<r.elapsed_us<<" valid="<<r.valid<<" pts="<<r.pts<<" dts="<<r.dts<<" duration="<<r.duration<<" bytes="<<r.size<<" format="<<r.format<<" start="<<r.start<<" stop="<<r.stop<<" time="<<r.time<<" base="<<r.base<<" offset="<<r.offset<<" rate="<<r.rate<<" applied_rate="<<r.applied_rate<<'\n';}
  for(std::size_t i=0;i<std::min<std::size_t>(bus_errors_,errors_.size());++i)std::cout<<"[writer-diag-error] case="<<label_<<" domain="<<errors_[i].first<<" code="<<errors_[i].second<<'\n';
 }
};
}

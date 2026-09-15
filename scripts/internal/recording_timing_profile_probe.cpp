// 실제 writer 계측 재사용. 기존 TP fixture/판정/제품 파일은 수정하지 않는다.
#define main TimingBaselineMain
#include "recording_timing_probe.cpp"
#undef main
namespace {
std::string ProfileId(int number){return std::string(std::getenv("MEDIA_SERVER_TIMING_PROFILE_TRACK_ONLY")?"NP-T0":"NP0")+std::to_string(number);}
void LongDelta(const std::filesystem::path& root) {
    const auto dest=root/(ProfileId(4)+"-L");std::filesystem::create_directories(dest);
    auto input=Encode(2,false,false,160,90,30,250);Shift(input,0);
    for(std::size_t i=0;i<input.packets.size();++i){auto& p=input.packets[i];p.pts=p.dts=static_cast<std::int64_t>(i)*5000000000LL;p.observation->pts_ns=p.pts;p.observation->dts_ns=p.dts;p.observation->duration_ns=5000000000ULL;}
    Capture original(dest/"input.csv");for(const auto& p:input.packets){auto* b=gst_buffer_new_allocate(nullptr,p.payload.size(),nullptr);gst_buffer_fill(b,0,p.payload.data(),p.payload.size());original.out<<original.count++<<','<<p.pts<<','<<p.dts<<','<<*p.observation->duration_ns<<','<<p.payload.size()<<','<<Hash(b)<<'\n';gst_buffer_unref(b);}original.out.flush();
    InputParser(input,dest/"input-parser.csv");Store store(dest/"store");recording::GStreamerSegmentWriter::Options o(store.root,20000);o.managed_journal=&store.journal;o.managed_catalog=&store.catalog;o.managed_store_id="probe-store";
    recording::GStreamerSegmentWriter w(o);std::string error;if(!w.Start("probe-channel","unused",input.descriptor,[](auto,auto,auto*){return false;},&error))throw std::runtime_error("long-writer-start:"+error);
    for(const auto& p:input.packets)w.Push(p,0);w.Stop();
    auto segments=store.Segments();std::cout<<"[long-delta] inputs=2 requested_delta=5000000000 finalized="<<segments.size()<<'\n';
    std::ofstream manifest(dest/"manifest.csv");manifest<<"segment,file,ordinal,count,media_start\n";std::size_t i=0;
    for(const auto& s:segments){const auto binding=store.catalog.FindSourceBinding(s.segment_id);if(!binding)throw std::runtime_error("long-binding");const auto p=store.root/"probe-channel"/(s.segment_id+".mp4");manifest<<i<<','<<std::filesystem::relative(p,dest).string()<<','<<binding->samples.front().ordinal<<','<<binding->samples.size()<<','<<s.media_start_pts<<'\n';Read(p,dest/("segment-"+std::to_string(i)),binding->samples.size());++i;}
}
}
int main(int argc,char** argv){if(argc!=2)return 2;gst_init(nullptr,nullptr);std::cout<<"[gstreamer] "<<gst_version_string()<<'\n';try{for(int i=1;i<=4;++i){Run(argv[1],i);std::filesystem::rename(std::filesystem::path(argv[1])/("TP0"+std::to_string(i)),std::filesystem::path(argv[1])/ProfileId(i));}LongDelta(argv[1]);return 0;}catch(const std::exception& e){std::cerr<<"[capture-fail] "<<e.what()<<'\n';return 1;}}

// 파일 용도: 실제 MP4 표시 시각·RGB·FD offset과 거부/취소 경계를 확인한다.
#include "recording/visual_frame_decoder.h"
#include "recording/evidence_frame_extractor.h"
#include <cstring>
#include <fcntl.h>
#include <atomic>
#include <fstream>
#include <sys/stat.h>
#include <unistd.h>
#include <iostream>
#include <stdexcept>
#include <cmath>
#if MEDIA_SERVER_USE_GSTREAMER
#include <gst/gst.h>
#include <gst/app/gstappsink.h>
#endif
namespace {
int checks=0;
void Check(bool b,const char* name){++checks;if(!b)throw std::runtime_error(name);}
}
int main(int argc,char**argv){int fd=-1;try{
    if(argc!=2&&(argc!=3||(std::strcmp(argv[2],"--trace-probe")&&std::strcmp(argv[2],"--software-only")&&std::strcmp(argv[2],"--software-trace"))))return 2;
    const auto policy=argc==3&&(!std::strcmp(argv[2],"--software-only")||!std::strcmp(argv[2],"--software-trace"))?recording::VisualDecodePolicy::SoftwareOnly:recording::VisualDecodePolicy::Automatic;
    const auto Decode=[&](int input,std::uint64_t bytes,std::int64_t pts,recording::VisualRgbFrame* out,std::string* why,
        const std::function<bool()>& cancelled=std::function<bool()>{},std::uint32_t budget=5000){
        return recording::DecodeVisualFrame(input,bytes,pts,out,why,cancelled,budget,policy);
    };
#if MEDIA_SERVER_USE_GSTREAMER
    gst_init(nullptr,nullptr);
    // 실제 appsink API의 미시작 true와 PAUSED 전이중 false를 구분한다. 제품 EOS 원인 재현은 아니다.
    GstElement* bare=gst_element_factory_make("appsink",nullptr);Check(bare!=nullptr,"standalone appsink");
    Check(gst_app_sink_is_eos(GST_APP_SINK(bare)),"not-started reports EOS without an event");
    Check(gst_element_set_state(bare,GST_STATE_PAUSED)!=GST_STATE_CHANGE_FAILURE&&!gst_app_sink_is_eos(GST_APP_SINK(bare)),"started pending preroll is not EOS");
    gst_element_set_state(bare,GST_STATE_NULL);Check(gst_app_sink_is_eos(GST_APP_SINK(bare)),"stopped reports EOS");gst_object_unref(bare);
    const std::string launch="videotestsrc num-buffers=100 pattern=red ! video/x-raw,width=160,height=90,framerate=25/1 ! videoconvert ! x264enc tune=zerolatency ! h264parse ! mp4mux ! filesink name=output";
    GError* pipeline_error=nullptr;GstElement* pipeline=gst_parse_launch(launch.c_str(),&pipeline_error);
    Check(pipeline&&!pipeline_error,"fixture pipeline");
    GstElement* sink=gst_bin_get_by_name(GST_BIN(pipeline),"output");g_object_set(sink,"location",argv[1],nullptr);gst_object_unref(sink);
    const auto state=gst_element_set_state(pipeline,GST_STATE_PLAYING);GstBus* bus=gst_element_get_bus(pipeline);
    GstMessage* message=gst_bus_timed_pop_filtered(bus,5*GST_SECOND,static_cast<GstMessageType>(GST_MESSAGE_ERROR|GST_MESSAGE_EOS));
    const bool generated=state!=GST_STATE_CHANGE_FAILURE&&message&&GST_MESSAGE_TYPE(message)==GST_MESSAGE_EOS;
    if(message)gst_message_unref(message);
    gst_object_unref(bus);gst_element_set_state(pipeline,GST_STATE_NULL);gst_object_unref(pipeline);
    Check(generated,"fixture generated within five seconds");
#endif
    fd=::open(argv[1],O_RDONLY);struct stat st{};Check(fd>=0&&::fstat(fd,&st)==0,"fixture open");
    Check(::lseek(fd,37,SEEK_SET)==37,"initial offset");std::string error;
    recording::VisualRgbFrame frame{7,9,11,{42}};
#if MEDIA_SERVER_USE_GSTREAMER
    for(const auto ns:{0LL,40000000LL,3960000000LL}){
        Check(Decode(fd,st.st_size,ns,&frame,&error),"exact frame decode");
        Check(frame.width==160&&frame.height==90&&std::llabs(frame.presentation_ns-ns)<=1&&frame.rgb.size()==160*90*3,"frame geometry and presentation");
        for(std::size_t pixel=0;pixel<frame.rgb.size();pixel+=3)Check(frame.rgb[pixel]>220&&frame.rgb[pixel+1]<30&&frame.rgb[pixel+2]<30,"independent red color oracle");
        Check(::lseek(fd,0,SEEK_CUR)==37,"offset unchanged");
    }
    if(argc==3&&(!std::strcmp(argv[2],"--trace-probe")||!std::strcmp(argv[2],"--software-trace"))){
        const auto expected=frame.rgb;
        for(unsigned i=0;i<20;++i)Check(Decode(fd,st.st_size,0,&frame,&error)&&frame.rgb==expected,"many exact successes");
        Check(!Decode(fd,st.st_size,20000000,&frame,&error)&&error=="visual-frame-unavailable"&&frame.rgb==expected,"late actual missing exact frame");
        for(unsigned i=0;i<2;++i)Check(Decode(fd,st.st_size,0,&frame,&error)&&frame.rgb==expected,"success after failure");
        Check(::lseek(fd,0,SEEK_CUR)==37,"trace probe offset unchanged");::close(fd);
        std::cout<<"PASS trace probe rgb="<<recording::EvidenceSha256(expected.data(),expected.size())<<" failure=visual-frame-unavailable offset=37\n";return 0;
    }
    // 독립 raw 입력의 세 시작 시각과 길이를 고정한다. decoder 결과로 기대값을 만들지 않는다.
    const auto vfr_path=std::string(argv[1])+".vfr.mp4";
    GstElement* vfr=gst_parse_launch("videotestsrc num-buffers=3 pattern=red ! video/x-raw,width=160,height=90,framerate=25/1 ! identity name=clock ! x264enc tune=zerolatency ! h264parse ! mp4mux ! filesink name=output",nullptr);
    Check(vfr!=nullptr,"VFR pipeline");GstElement* clock=gst_bin_get_by_name(GST_BIN(vfr),"clock");GstPad* pad=gst_element_get_static_pad(clock,"src");unsigned ordinal=0;
    gst_pad_add_probe(pad,GST_PAD_PROBE_TYPE_BUFFER,[](GstPad*,GstPadProbeInfo* info,gpointer data){
        auto& index=*static_cast<unsigned*>(data);const GstClockTime times[]={0,40000000,120000000},durations[]={40000000,80000000,70000000};
        auto* buffer=gst_buffer_make_writable(GST_PAD_PROBE_INFO_BUFFER(info));GST_PAD_PROBE_INFO_DATA(info)=buffer;
        if(index<3){GST_BUFFER_PTS(buffer)=times[index];GST_BUFFER_DTS(buffer)=GST_CLOCK_TIME_NONE;GST_BUFFER_DURATION(buffer)=durations[index++];}return GST_PAD_PROBE_OK;
    },&ordinal,nullptr);gst_object_unref(pad);gst_object_unref(clock);
    GstElement* vfr_sink=gst_bin_get_by_name(GST_BIN(vfr),"output");g_object_set(vfr_sink,"location",vfr_path.c_str(),nullptr);gst_object_unref(vfr_sink);
    const auto vfr_state=gst_element_set_state(vfr,GST_STATE_PLAYING);GstBus* vfr_bus=gst_element_get_bus(vfr);
    GstMessage* vfr_message=gst_bus_timed_pop_filtered(vfr_bus,5*GST_SECOND,static_cast<GstMessageType>(GST_MESSAGE_ERROR|GST_MESSAGE_EOS));
    const bool vfr_ok=vfr_state!=GST_STATE_CHANGE_FAILURE&&vfr_message&&GST_MESSAGE_TYPE(vfr_message)==GST_MESSAGE_EOS;
    if(vfr_message)gst_message_unref(vfr_message);
    gst_object_unref(vfr_bus);gst_element_set_state(vfr,GST_STATE_NULL);gst_object_unref(vfr);
    Check(vfr_ok&&ordinal==3,"VFR fixture complete");const int vfr_fd=::open(vfr_path.c_str(),O_RDONLY);struct stat vfr_stat{};
    Check(vfr_fd>=0&&::fstat(vfr_fd,&vfr_stat)==0,"VFR file");recording::VisualRgbFrame varying;
    for(const auto ns:{0LL,40000000LL,120000000LL}){
        Check(Decode(vfr_fd,vfr_stat.st_size,ns,&varying,&error)&&std::llabs(varying.presentation_ns-ns)<=1,"VFR exact first middle last");
        for(std::size_t pixel=0;pixel<varying.rgb.size();pixel+=3)Check(varying.rgb[pixel]>220&&varying.rgb[pixel+1]<30&&varying.rgb[pixel+2]<30,"VFR independent red oracle");
    }
    Check(!Decode(vfr_fd,vfr_stat.st_size,80000000,&varying,&error),"VFR gap is not substituted");::close(vfr_fd);
    // 실제 codec는 정상이나 제품 추출 해상도 상한을 넘는 독립 입력.
    const auto wide_path=std::string(argv[1])+".wide.mp4";
    GstElement* wide_pipeline=gst_parse_launch("videotestsrc num-buffers=1 pattern=red ! video/x-raw,width=4352,height=64,framerate=1/1 ! videoconvert ! x264enc tune=zerolatency ! h264parse ! mp4mux ! filesink name=output",nullptr);
    Check(wide_pipeline!=nullptr,"wide fixture pipeline");
    GstElement* wide_sink=gst_bin_get_by_name(GST_BIN(wide_pipeline),"output");
    g_object_set(wide_sink,"location",wide_path.c_str(),nullptr);gst_object_unref(wide_sink);
    const auto wide_state=gst_element_set_state(wide_pipeline,GST_STATE_PLAYING);
    GstBus* wide_bus=gst_element_get_bus(wide_pipeline);
    GstMessage* wide_message=gst_bus_timed_pop_filtered(wide_bus,5*GST_SECOND,static_cast<GstMessageType>(GST_MESSAGE_ERROR|GST_MESSAGE_EOS));
    const bool wide_ok=wide_state!=GST_STATE_CHANGE_FAILURE&&wide_message&&GST_MESSAGE_TYPE(wide_message)==GST_MESSAGE_EOS;
    if(wide_message)gst_message_unref(wide_message);
    gst_object_unref(wide_bus);
    gst_element_set_state(wide_pipeline,GST_STATE_NULL);gst_object_unref(wide_pipeline);
    Check(wide_ok,"wide fixture generated within five seconds");
    const int wide_fd=::open(wide_path.c_str(),O_RDONLY);struct stat wide_stat{};
    const bool wide_open=wide_fd>=0&&::fstat(wide_fd,&wide_stat)==0;
    recording::VisualRgbFrame rejected{7,9,11,{42}};
    const bool wide_rejected=wide_open&&!Decode(wide_fd,wide_stat.st_size,0,&rejected,&error)&&
        error=="visual-frame-unsupported"&&rejected.rgb==std::vector<std::uint8_t>{42};
    if(wide_fd>=0)::close(wide_fd);
    Check(wide_open&&wide_rejected,"actual oversized decoded caps classified unsupported without output mutation");
    const auto before=frame.rgb;
    for(const auto ns:{20000000LL,4000000000LL})Check(!Decode(fd,st.st_size,ns,&frame,&error)&&frame.rgb==before,"no neighboring substitute");
    Check(!Decode(fd,st.st_size,0,&frame,&error,[]{return true;})&&error=="visual-cancelled"&&frame.rgb==before,"cancellation preserves output");
    Check(!Decode(fd,st.st_size-1,0,&frame,&error)&&frame.rgb==before,"size mismatch");
    // 별도 소유 복사본을 실제 취소 확인 지점에서 줄인다. 원 fixture/호출자 offset과 출력은 보존한다.
    const auto changed_path=std::string(argv[1])+".changed.mp4";
    {std::ifstream input(argv[1],std::ios::binary);std::ofstream copy(changed_path,std::ios::binary);copy<<input.rdbuf();Check(bool(input)&&bool(copy),"change fixture copy");}
    const int changed_fd=::open(changed_path.c_str(),O_RDWR);Check(changed_fd>=0,"change fixture descriptor");
    std::atomic<unsigned> calls{0};std::atomic<bool> changed{false};
    const bool change_result=Decode(changed_fd,st.st_size,0,&frame,&error,[&]{if(calls.fetch_add(1)==1)changed=::ftruncate(changed_fd,st.st_size-1)==0;return false;});
    const auto change_error=error;const bool descriptor_open=::fcntl(changed_fd,F_GETFD)!=-1;::close(changed_fd);
    Check(changed&&!change_result&&change_error=="visual-frame-file-changed"&&frame.rgb==before&&descriptor_open,"actual file change refuses and preserves output/FD");
#else
    Check(!Decode(fd,st.st_size,0,&frame,&error)&&error=="visual-frame-disabled"&&frame.rgb==std::vector<std::uint8_t>{42},"disabled refusal");
#endif
    for(const auto budget:{0U,5001U})Check(!Decode(fd,st.st_size,0,&frame,&error,{},budget),"invalid budget");
    Check(!Decode(fd,512ULL*1024*1024+1,0,&frame,&error),"size admission");
    Check(!Decode(fd,st.st_size,-1,&frame,&error),"negative presentation");
    Check(::fcntl(fd,F_GETFD)!=-1&&::lseek(fd,0,SEEK_CUR)==37,"caller owns descriptor");
    ::close(fd);std::cout<<"PASS visual frame checks="<<checks<<"\n";return 0;
}catch(const std::exception& e){if(fd>=0)::close(fd);std::cerr<<"FAIL "<<e.what()<<" checks="<<checks<<"\n";return 1;}}

// 파일 용도: 실제 MP4 표시 시각·RGB·FD offset과 거부/취소 경계를 확인한다.
#include "recording/visual_frame_decoder.h"
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
#endif
namespace {
int checks=0;
void Check(bool b,const char* name){++checks;if(!b)throw std::runtime_error(name);}
}
int main(int argc,char**argv){int fd=-1;try{
    if(argc!=2)return 2;
#if MEDIA_SERVER_USE_GSTREAMER
    gst_init(nullptr,nullptr);
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
        Check(recording::DecodeVisualFrame(fd,st.st_size,ns,&frame,&error),"exact frame decode");
        Check(frame.width==160&&frame.height==90&&std::llabs(frame.presentation_ns-ns)<=1&&frame.rgb.size()==160*90*3,"frame geometry and presentation");
        for(std::size_t pixel=0;pixel<frame.rgb.size();pixel+=3)Check(frame.rgb[pixel]>220&&frame.rgb[pixel+1]<30&&frame.rgb[pixel+2]<30,"independent red color oracle");
        Check(::lseek(fd,0,SEEK_CUR)==37,"offset unchanged");
    }
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
    const bool wide_rejected=wide_open&&!recording::DecodeVisualFrame(wide_fd,wide_stat.st_size,0,&rejected,&error)&&
        error=="visual-frame-unsupported"&&rejected.rgb==std::vector<std::uint8_t>{42};
    if(wide_fd>=0)::close(wide_fd);
    Check(wide_open&&wide_rejected,"actual oversized decoded caps classified unsupported without output mutation");
    const auto before=frame.rgb;
    for(const auto ns:{20000000LL,4000000000LL})Check(!recording::DecodeVisualFrame(fd,st.st_size,ns,&frame,&error)&&frame.rgb==before,"no neighboring substitute");
    Check(!recording::DecodeVisualFrame(fd,st.st_size,0,&frame,&error,[]{return true;})&&error=="visual-cancelled"&&frame.rgb==before,"cancellation preserves output");
    Check(!recording::DecodeVisualFrame(fd,st.st_size-1,0,&frame,&error)&&frame.rgb==before,"size mismatch");
    // 별도 소유 복사본을 실제 취소 확인 지점에서 줄인다. 원 fixture/호출자 offset과 출력은 보존한다.
    const auto changed_path=std::string(argv[1])+".changed.mp4";
    {std::ifstream input(argv[1],std::ios::binary);std::ofstream copy(changed_path,std::ios::binary);copy<<input.rdbuf();Check(bool(input)&&bool(copy),"change fixture copy");}
    const int changed_fd=::open(changed_path.c_str(),O_RDWR);Check(changed_fd>=0,"change fixture descriptor");
    std::atomic<unsigned> calls{0};std::atomic<bool> changed{false};
    const bool change_result=recording::DecodeVisualFrame(changed_fd,st.st_size,0,&frame,&error,[&]{if(calls.fetch_add(1)==1)changed=::ftruncate(changed_fd,st.st_size-1)==0;return false;});
    const auto change_error=error;const bool descriptor_open=::fcntl(changed_fd,F_GETFD)!=-1;::close(changed_fd);
    Check(changed&&!change_result&&change_error=="visual-frame-file-changed"&&frame.rgb==before&&descriptor_open,"actual file change refuses and preserves output/FD");
#else
    Check(!recording::DecodeVisualFrame(fd,st.st_size,0,&frame,&error)&&error=="visual-frame-disabled"&&frame.rgb==std::vector<std::uint8_t>{42},"disabled refusal");
#endif
    for(const auto budget:{0U,5001U})Check(!recording::DecodeVisualFrame(fd,st.st_size,0,&frame,&error,{},budget),"invalid budget");
    Check(!recording::DecodeVisualFrame(fd,512ULL*1024*1024+1,0,&frame,&error),"size admission");
    Check(!recording::DecodeVisualFrame(fd,st.st_size,-1,&frame,&error),"negative presentation");
    Check(::fcntl(fd,F_GETFD)!=-1&&::lseek(fd,0,SEEK_CUR)==37,"caller owns descriptor");
    ::close(fd);std::cout<<"PASS visual frame checks="<<checks<<"\n";return 0;
}catch(const std::exception& e){if(fd>=0)::close(fd);std::cerr<<"FAIL "<<e.what()<<" checks="<<checks<<"\n";return 1;}}

// 테스트 전용 TU: 제품 hook 없이 실제 callback 구현에 FD/GstAppSrc를 전달한다.
// 실제 container가 큰 pull 요청을 발생시켰다는 증거가 아니다.
#include "../../src/recording/recording_media_inspector.cpp"
#include <fstream>
#include <iostream>
namespace {
int passes=0, failures=0;
void Check(bool ok,const char* label) {
    std::cout<<(ok?"[pass] ":"[fail] ")<<label<<'\n';ok?++passes:++failures;
}
void CallbackCase(int fd,bool expired) {
    GstElement* pipeline=gst_pipeline_new(nullptr);
    GstElement* source=gst_element_factory_make("appsrc",nullptr);
    GstElement* sink=gst_element_factory_make("fakesink",nullptr);
    Check(pipeline&&source&&sink,"limits real pipeline elements available");
    if(!pipeline||!source||!sink){if(pipeline)gst_object_unref(pipeline);if(source)gst_object_unref(source);if(sink)gst_object_unref(sink);return;}
    gst_bin_add_many(GST_BIN(pipeline),source,sink,nullptr);
    const bool linked=gst_element_link(source,sink);
    g_object_set(source,"format",GST_FORMAT_BYTES,nullptr);
    g_object_set(sink,"sync",FALSE,"async",FALSE,nullptr);
    recording::DemuxContext context{fd,1,0,
        recording::Clock::now()+(expired?-std::chrono::seconds(1):std::chrono::seconds(5)),
        pipeline,"video/x-h264",{}};
    Check(linked&&gst_element_set_state(pipeline,GST_STATE_PLAYING)!=GST_STATE_CHANGE_FAILURE,"limits pipeline playing");
    recording::NeedData(GST_APP_SRC(source),expired?1:16*1024*1024+1,&context);
    if(expired) {
        Check(context.expired&&!context.request_limit&&!context.io_error&&context.offset==0,"expired callback flags no IO no offset advance");
    } else {
        Check(context.request_limit&&!context.expired&&!context.io_error&&context.offset==0,"oversized callback request limit no IO no offset advance");
    }
    GstBus* bus=gst_element_get_bus(pipeline);
    GstMessage* message=gst_bus_timed_pop_filtered(bus,2*GST_SECOND,static_cast<GstMessageType>(GST_MESSAGE_EOS|GST_MESSAGE_ERROR));
    Check(message&&GST_MESSAGE_TYPE(message)==GST_MESSAGE_EOS,expired?"expired callback actual EOS":"oversized callback actual EOS");
    if(message)gst_message_unref(message);
    gst_element_set_state(pipeline,GST_STATE_NULL);gst_object_unref(bus);gst_object_unref(pipeline);
    Check(!recording::SeekData(nullptr,2,&context)&&context.offset==0,"seek beyond size refused offset unchanged");
    Check(recording::SeekData(nullptr,1,&context)&&context.offset==1,"seek valid EOF offset accepted");
    Check(recording::SeekData(nullptr,0,&context)&&context.offset==0,"seek valid zero offset accepted");
}
}
int main(int argc,char** argv) {
    if(argc!=2)return 2;
    const auto path=std::filesystem::path(argv[1])/"limits.bin";
    {std::ofstream out(path,std::ios::binary);out<<'x';if(!out)return 1;}
    recording::Fd fd(::open(path.c_str(),O_RDONLY|O_NOFOLLOW|O_CLOEXEC));
    Check(fd.value>=0,"limits real file descriptor opened");
    if(fd.value<0)return 1;
    gst_init(nullptr,nullptr);CallbackCase(fd.value,false);CallbackCase(fd.value,true);
    std::cout<<"[media-inspector-limits] pass="<<passes<<" fail="<<failures<<'\n';return failures?1:0;
}

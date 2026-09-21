// ENV12: 필수 객체·상태·무음 파일 디코드를 실제 설치 환경에서만 확인한다.
#include <gst/gst.h>
#include <array>
#include <atomic>
#include <iostream>
#include <string_view>

static constexpr std::array<const char*,44> factories={
    "appsrc","appsink","filesrc","filesink","fdsink","queue","identity","fakesink","concat",
    "qtdemux","qtmux","mp4mux","matroskamux","matroskademux","h264parse","mpegtsmux","tsdemux",
    "avdec_h264","videoconvert","videoscale","videorate","jpegenc","rtspsrc","rtph264pay",
    "rtph264depay","rtph265pay","rtph265depay","h265parse","webrtcbin","nicesrc","nicesink",
    "dtlsenc","dtlsdec","srtpenc","srtpdec","rtpbin","vp8enc","vp8dec","opusenc","opusdec",
    "audioconvert","audioresample","rtpopuspay","rtpopusdepay"};

int main(int argc,char** argv) {
    if(argc==2 && std::string_view(argv[1])=="--list") {
        for(const auto* name:factories)std::cout<<name<<'\n';
        return 0;
    }
    if(argc!=2)return 2;
    gst_init(nullptr,nullptr);
    for(const auto* name:factories) {
        auto* element=gst_element_factory_make(name,nullptr);
        if(!element){std::cout<<"[fail] ENV12 make "<<name<<'\n';return 1;}
        gst_object_unref(element);
        std::cout<<"[pass] ENV12 make "<<name<<'\n';
    }
    auto* rtc=gst_element_factory_make("webrtcbin",nullptr);
    if(!rtc)return 2;
    GstState state=GST_STATE_VOID_PENDING;
    const bool ready=gst_element_set_state(rtc,GST_STATE_READY)!=GST_STATE_CHANGE_FAILURE &&
        gst_element_get_state(rtc,&state,nullptr,5*GST_SECOND)!=GST_STATE_CHANGE_FAILURE && state==GST_STATE_READY;
    const bool stopped=gst_element_set_state(rtc,GST_STATE_NULL)!=GST_STATE_CHANGE_FAILURE;
    gst_object_unref(rtc);
    if(!ready||!stopped){std::cout<<"[fail] ENV12 webrtc READY and NULL\n";return 1;}
    std::cout<<"[pass] ENV12 webrtc READY and NULL\n";
    GError* error=nullptr;
    auto* pipeline=gst_parse_launch("filesrc name=input ! qtdemux ! h264parse ! avdec_h264 ! fakesink name=output sync=false signal-handoffs=true",&error);
    if(error||!pipeline){if(error)g_error_free(error);if(pipeline)gst_object_unref(pipeline);return 2;}
    auto* input=gst_bin_get_by_name(GST_BIN(pipeline),"input");
    auto* output=gst_bin_get_by_name(GST_BIN(pipeline),"output");
    if(!input||!output){if(input)gst_object_unref(input);if(output)gst_object_unref(output);gst_object_unref(pipeline);return 2;}
    g_object_set(input,"location",argv[1],nullptr);
    std::atomic<unsigned> buffers{0};
    g_signal_connect(output,"handoff",G_CALLBACK(+[](GstElement*,GstBuffer*,GstPad*,gpointer data){
        static_cast<std::atomic<unsigned>*>(data)->fetch_add(1);
    }),&buffers);
    auto* bus=gst_element_get_bus(pipeline);
    const bool started=gst_element_set_state(pipeline,GST_STATE_PLAYING)!=GST_STATE_CHANGE_FAILURE;
    auto* message=started?gst_bus_timed_pop_filtered(bus,10*GST_SECOND,
        static_cast<GstMessageType>(GST_MESSAGE_EOS|GST_MESSAGE_ERROR|GST_MESSAGE_WARNING)):nullptr;
    const bool eos=message&&GST_MESSAGE_TYPE(message)==GST_MESSAGE_EOS;
    if(message)gst_message_unref(message);
    const bool ended=gst_element_set_state(pipeline,GST_STATE_NULL)!=GST_STATE_CHANGE_FAILURE;
    gst_object_unref(bus);gst_object_unref(input);gst_object_unref(output);gst_object_unref(pipeline);
    const bool pass=started&&eos&&ended&&buffers.load()>0;
    std::cout<<(pass?"[pass] ":"[fail] ")<<"ENV12 silent H264 decode EOS buffers="<<buffers.load()<<'\n';
    return pass?0:1;
}

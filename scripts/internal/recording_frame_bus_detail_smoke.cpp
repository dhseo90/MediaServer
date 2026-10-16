// 제품 decoder 호출 없이 opt-in 최초 bus 진단의 정제·형식·실패 전달을 확인한다.
#include "../../src/recording/visual_frame_decoder.cpp"
#include <iostream>
int main(){
    gst_init(nullptr,nullptr);
    std::string error="unchanged-product-error";
    auto* element=gst_pipeline_new("r129-safe-element");
    bool pass=true;
    {
        recording::DecodeTrace trace(-1,0,0,5000,&error);
        auto* problem=g_error_new_literal(GST_STREAM_ERROR,GST_STREAM_ERROR_DECODE,"SECRET /private/user/file.mp4 https://token.invalid\nraw");
        auto* message=gst_message_new_error(GST_OBJECT(element),problem,"SECRET debug path");g_error_free(problem);
        pass=pass&&recording::DecodeTrace::Bus(nullptr,message,&trace)==GST_BUS_PASS;
        gst_message_unref(message);
        pass=pass&&std::string(trace.bus_domain)=="gst-stream-error-quark"&&trace.bus.b==GST_STREAM_ERROR_DECODE&&std::strlen(trace.bus_description)>0;
        problem=g_error_new_literal(GST_RESOURCE_ERROR,GST_RESOURCE_ERROR_READ,"second error");message=gst_message_new_error(GST_OBJECT(element),problem,"second debug");g_error_free(problem);
        recording::DecodeTrace::Bus(nullptr,message,&trace);gst_message_unref(message);
        pass=pass&&trace.bus.a==GST_STREAM_ERROR&&trace.bus.b==GST_STREAM_ERROR_DECODE&&error=="unchanged-product-error";
        trace.null_done=true;
    }
    {
        recording::DecodeTrace trace(-1,0,0,5000,&error);trace.closing=true;
        auto* problem=g_error_new_literal(g_quark_from_static_string("SECRET-domain/path"),9,"SECRET raw");
        auto* message=gst_message_new_error(GST_OBJECT(element),problem,"SECRET debug");g_error_free(problem);
        recording::DecodeTrace::Bus(nullptr,message,&trace);gst_message_unref(message);
        pass=pass&&std::string(trace.bus_domain)=="other-domain-redacted"&&!trace.first.load()&&trace.bus.c==1;
        trace.null_done=true;
    }
    gst_object_unref(element);std::cout<<"bus-detail-unit pass="<<pass<<" decoderCalls=0\n";return pass?0:1;
}

// 테스트 전용 translation unit: 실제 writer의 mp4mux factory 생성만 감싼다.
// 제품 소스/제품 API/test hook은 변경하지 않는다.
#include <gst/gst.h>
#include <cstring>
#include <iostream>
#include <cstdlib>
static GstElement* ProfileFactory(const gchar* factory,const gchar* name) {
    auto* element=gst_element_factory_make(factory,name);
    if(element&&std::strcmp(factory,"mp4mux")==0) {
        const bool track_only=std::getenv("MEDIA_SERVER_TIMING_PROFILE_TRACK_ONLY")!=nullptr;
        g_object_set(element,"trak-timescale",guint(1000000000),nullptr);
        if(!track_only)g_object_set(element,"movie-timescale",guint(1000000000),nullptr);
        guint track=0,movie=0;g_object_get(element,"trak-timescale",&track,"movie-timescale",&movie,nullptr);
        std::cout<<"[profile-factory] trak-timescale="<<track<<" movie-timescale="<<movie<<'\n';
    }
    return element;
}
#define gst_element_factory_make ProfileFactory
#include "../../src/recording/gstreamer_segment_writer.cpp"
#undef gst_element_factory_make

// 파일 용도: 독립 appsrc/pread decode 경로. 공유 stream이나 caller FD offset을 바꾸지 않는다.
#include "recording/visual_frame_decoder.h"
#include <algorithm>
#include <atomic>
#include <cerrno>
#include <chrono>
#include <cstring>
#include <mutex>
#include <sys/stat.h>
#include <unistd.h>
#if MEDIA_SERVER_USE_GSTREAMER
#include <gst/app/gstappsrc.h>
#include <gst/app/gstappsink.h>
#include <gst/video/video.h>
#endif
namespace recording {
namespace {
bool Fail(std::string* error,const char* reason){if(error)*error=reason;return false;}
#if MEDIA_SERVER_USE_GSTREAMER
using Clock=std::chrono::steady_clock;
struct Context {
    int fd;std::uint64_t bytes,offset{0};Clock::time_point deadline;
    std::function<bool()> cancelled;GstElement* pipeline;GstElement* convert;
    std::mutex mutex;std::atomic<bool> failed{false},video{false};
    bool Stop()const{return Clock::now()>=deadline||(cancelled&&cancelled());}
};
void Need(GstAppSrc* source,guint requested,gpointer user){
    auto& c=*static_cast<Context*>(user);std::unique_lock lock(c.mutex);
    if(c.Stop()||c.offset>=c.bytes){gst_app_src_end_of_stream(source);return;}
    if(!requested||requested>16*1024*1024){c.failed=true;gst_app_src_end_of_stream(source);return;}
    const auto n=std::size_t(std::min<std::uint64_t>(c.bytes-c.offset,requested));
    GstBuffer* buffer=gst_buffer_new_allocate(nullptr,n,nullptr);GstMapInfo map{};
    if(!buffer||!gst_buffer_map(buffer,&map,GST_MAP_WRITE)){if(buffer)gst_buffer_unref(buffer);c.failed=true;gst_app_src_end_of_stream(source);return;}
    std::size_t got=0;
    while(got<n&&!c.Stop()){
        const auto result=::pread(c.fd,map.data+got,std::min<std::size_t>(n-got,65536),static_cast<off_t>(c.offset+got));
        if(result<0&&errno==EINTR)continue;if(result<=0)break;got+=std::size_t(result);
    }
    gst_buffer_unmap(buffer,&map);
    if(got!=n){gst_buffer_unref(buffer);c.failed=true;gst_app_src_end_of_stream(source);return;}
    GST_BUFFER_OFFSET(buffer)=c.offset;c.offset+=n;GST_BUFFER_OFFSET_END(buffer)=c.offset;lock.unlock();
    const auto flow=gst_app_src_push_buffer(source,buffer);if(flow!=GST_FLOW_OK&&flow!=GST_FLOW_FLUSHING)c.failed=true;
}
gboolean Seek(GstAppSrc*,guint64 offset,gpointer user){auto& c=*static_cast<Context*>(user);std::lock_guard lock(c.mutex);
    if(offset>c.bytes||c.Stop())return FALSE;c.offset=offset;return TRUE;}
void Pad(GstElement*,GstPad* pad,gpointer user){
    auto& c=*static_cast<Context*>(user);GstCaps* caps=gst_pad_get_current_caps(pad);
    const char* type=caps&&gst_caps_get_size(caps)?gst_structure_get_name(gst_caps_get_structure(caps,0)):"";
    const bool video=g_str_has_prefix(type,"video/x-raw");if(caps)gst_caps_unref(caps);
    GstElement* sink=c.convert;
    if(video){if(c.video.exchange(true)){c.failed=true;return;}}
    else{sink=gst_element_factory_make("fakesink",nullptr);if(!sink){c.failed=true;return;}
        g_object_set(sink,"sync",FALSE,"async",FALSE,nullptr);if(!gst_bin_add(GST_BIN(c.pipeline),sink)){gst_object_unref(sink);c.failed=true;return;}}
    GstPad* target=gst_element_get_static_pad(sink,"sink");
    if(!target||gst_pad_link(pad,target)!=GST_PAD_LINK_OK)c.failed=true;
    if(target)gst_object_unref(target);if(!video&&!gst_element_sync_state_with_parent(sink))c.failed=true;
}
bool Copy(GstSample* sample,std::int64_t target,VisualRgbFrame* out){
    GstBuffer* buffer=gst_sample_get_buffer(sample);const GstSegment* segment=gst_sample_get_segment(sample);
    if(!buffer||!segment||segment->format!=GST_FORMAT_TIME||!GST_BUFFER_PTS_IS_VALID(buffer))return false;
    const auto pts=gst_segment_to_stream_time(segment,GST_FORMAT_TIME,GST_BUFFER_PTS(buffer));
    if(pts==GST_CLOCK_TIME_NONE||pts>std::uint64_t(INT64_MAX)||std::abs(std::int64_t(pts)-target)>1)return false;
    GstVideoInfo info{};if(!gst_video_info_from_caps(&info,gst_sample_get_caps(sample))||GST_VIDEO_INFO_FORMAT(&info)!=GST_VIDEO_FORMAT_RGB)return false;
    const int width=GST_VIDEO_INFO_WIDTH(&info),height=GST_VIDEO_INFO_HEIGHT(&info);
    if(width<=0||height<=0||width>4096||height>2160||std::uint64_t(width)*height*3>32ULL*1024*1024)return false;
    GstVideoFrame frame{};if(!gst_video_frame_map(&frame,&info,buffer,GST_MAP_READ))return false;
    const int stride=GST_VIDEO_FRAME_PLANE_STRIDE(&frame,0);const auto* bytes=static_cast<const std::uint8_t*>(GST_VIDEO_FRAME_PLANE_DATA(&frame,0));
    if(stride<width*3||!bytes){gst_video_frame_unmap(&frame);return false;}
    try{
        VisualRgbFrame value{width,height,std::int64_t(pts),{}};value.rgb.resize(std::size_t(width)*height*3);
        for(int y=0;y<height;++y)std::memcpy(value.rgb.data()+std::size_t(y)*width*3,bytes+std::size_t(y)*stride,std::size_t(width)*3);
        gst_video_frame_unmap(&frame);*out=std::move(value);return true;
    }catch(...){gst_video_frame_unmap(&frame);return false;}
}
#endif
}
bool DecodeVisualFrame(int fd,std::uint64_t bytes,std::int64_t target,VisualRgbFrame* output,
    std::string* error,const std::function<bool()>& cancelled,std::uint32_t budget_ms){
    if(fd<0||!output||!bytes||bytes>512ULL*1024*1024||target<0||!budget_ms||budget_ms>5000)return Fail(error,"visual-frame-invalid-request");
#if MEDIA_SERVER_USE_GSTREAMER
    struct stat before{};if(::fstat(fd,&before)!=0||!S_ISREG(before.st_mode)||before.st_size<0||std::uint64_t(before.st_size)!=bytes)return Fail(error,"visual-frame-invalid-file");
    const auto deadline=Clock::now()+std::chrono::milliseconds(budget_ms);
    if(cancelled&&cancelled())return Fail(error,"visual-cancelled");
    if(!gst_init_check(nullptr,nullptr,nullptr))return Fail(error,"visual-frame-runtime-unavailable");
    GstElement* pipeline=gst_pipeline_new(nullptr);GstElement* src=gst_element_factory_make("appsrc",nullptr);
    GstElement* decode=gst_element_factory_make("decodebin",nullptr);GstElement* convert=gst_element_factory_make("videoconvert",nullptr);
    GstElement* sink=gst_element_factory_make("appsink",nullptr);
    if(!pipeline||!src||!decode||!convert||!sink){for(auto* p:{pipeline,src,decode,convert,sink})if(p)gst_object_unref(p);return Fail(error,"visual-frame-runtime-unavailable");}
    Context context{fd,bytes,0,deadline,cancelled,pipeline,convert,{}};
    GstAppSrcCallbacks callbacks{};callbacks.need_data=Need;callbacks.seek_data=Seek;gst_app_src_set_callbacks(GST_APP_SRC(src),&callbacks,&context,nullptr);
    gst_app_src_set_stream_type(GST_APP_SRC(src),GST_APP_STREAM_TYPE_RANDOM_ACCESS);gst_app_src_set_size(GST_APP_SRC(src),bytes);
    g_object_set(src,"format",GST_FORMAT_BYTES,"block",FALSE,"max-bytes",guint64(65536),nullptr);
    GstCaps* caps=gst_caps_from_string("video/x-raw,format=RGB,width=[1,4096],height=[1,2160]");
    gst_app_sink_set_caps(GST_APP_SINK(sink),caps);gst_caps_unref(caps);
    g_object_set(sink,"sync",FALSE,"max-buffers",1,"drop",FALSE,"wait-on-eos",FALSE,nullptr);
    gst_bin_add_many(GST_BIN(pipeline),src,decode,convert,sink,nullptr);g_signal_connect(decode,"pad-added",G_CALLBACK(Pad),&context);
    VisualRgbFrame result;bool found=false;
    if(gst_element_link(src,decode)&&gst_element_link(convert,sink)&&gst_element_set_state(pipeline,GST_STATE_PLAYING)!=GST_STATE_CHANGE_FAILURE){
        GstBus* bus=gst_element_get_bus(pipeline);
        while(!context.Stop()&&!context.failed){
            GstSample* sample=gst_app_sink_try_pull_sample(GST_APP_SINK(sink),20*GST_MSECOND);
            if(sample){found=Copy(sample,target,&result);gst_sample_unref(sample);if(found)break;}
            GstMessage* message=gst_bus_pop_filtered(bus,GST_MESSAGE_ERROR);
            if(message){context.failed=true;gst_message_unref(message);break;}
            if(!sample&&gst_app_sink_is_eos(GST_APP_SINK(sink)))break;
        }
        gst_object_unref(bus);
    }
    gst_element_set_state(pipeline,GST_STATE_NULL);gst_object_unref(pipeline);
    if(context.Stop())return Fail(error,cancelled&&cancelled()?"visual-cancelled":"visual-frame-timeout");
    struct stat after{};
#ifdef __APPLE__
    const auto bm=before.st_mtimespec,bc=before.st_ctimespec;
#else
    const auto bm=before.st_mtim,bc=before.st_ctim;
#endif
    if(::fstat(fd,&after)!=0)return Fail(error,"visual-frame-file-changed");
#ifdef __APPLE__
    const auto am=after.st_mtimespec,ac=after.st_ctimespec;
#else
    const auto am=after.st_mtim,ac=after.st_ctim;
#endif
    if(bm.tv_nsec!=am.tv_nsec||bc.tv_nsec!=ac.tv_nsec||before.st_dev!=after.st_dev||before.st_ino!=after.st_ino||before.st_size!=after.st_size||
        before.st_mtime!=after.st_mtime||before.st_ctime!=after.st_ctime)return Fail(error,"visual-frame-file-changed");
    if(context.failed||!found)return Fail(error,"visual-frame-unavailable");
    *output=std::move(result);if(error)error->clear();return true;
#else
    (void)cancelled;return Fail(error,"visual-frame-disabled");
#endif
}
} // namespace recording

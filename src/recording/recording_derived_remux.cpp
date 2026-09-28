// 파일 용도: 보호된 원본 FD와 빈 출력 FD 사이의 실제 H264 remux·출처 검증.
#include "recording/recording_derived_remux.h"
#include "recording/recording_media_inspector.h"
#include "recording/recording_file_evidence.h"
#include "recording/recording_native_coverage.h"
#include <algorithm>
#include <atomic>
#include <chrono>
#include <limits>
#include <map>
#include <mutex>
#include <set>
#include <stdexcept>
#include <tuple>

#ifndef MEDIA_SERVER_USE_GSTREAMER
#define MEDIA_SERVER_USE_GSTREAMER 0
#endif
#if MEDIA_SERVER_USE_GSTREAMER
#include <gst/app/gstappsrc.h>
#include <gst/app/gstappsink.h>
#include <gst/gst.h>
#include <gst/video/video.h>
#include <fcntl.h>
#include <sys/stat.h>
#include <unistd.h>
#include <cerrno>
#endif

namespace recording {
#if MEDIA_SERVER_USE_GSTREAMER
namespace {
using Clock=std::chrono::steady_clock;
constexpr std::uint64_t kInputLimit=32*1024*1024;
constexpr std::size_t kAuLimit=4096;
void Require(bool value,const char* reason) {if(!value)throw std::runtime_error(reason);}
struct Budget {
    Clock::time_point deadline;
    const std::function<bool()>& cancelled;
    mutable std::atomic<bool> cancellation_latched{false};
    bool Cancelled() const noexcept {
        if(cancellation_latched.load())return true;
        try{if(cancelled&&cancelled())cancellation_latched.store(true);}catch(...){cancellation_latched.store(true);}
        return cancellation_latched.load();
    }
    void Check() const {Require(!Cancelled(),"work-cancelled");Require(Clock::now()<deadline,"media-budget-exceeded");}
    bool Stop() const {return Cancelled()||Clock::now()>=deadline;}
};
std::int64_t Signed(GstClockTime value) {
    Require(GST_CLOCK_TIME_IS_VALID(value)&&value<=static_cast<guint64>(std::numeric_limits<std::int64_t>::max()),"invalid-media-time");
    return static_cast<std::int64_t>(value);
}
std::int64_t Checked(__int128 value) {
    Require(value>=std::numeric_limits<std::int64_t>::min()&&value<=std::numeric_limits<std::int64_t>::max(),"media-time-overflow");
    return static_cast<std::int64_t>(value);
}
std::int64_t Ns(std::int64_t pts,const RecordingSegmentV2& s) {
    const __int128 n=static_cast<__int128>(pts)*s.time_base_num*1000000000;
    Require(s.time_base_den>0&&n%s.time_base_den==0,"unrepresentable-original-time");return Checked(n/s.time_base_den);
}
std::string Hash(const unsigned char* data,std::size_t size) {
    gchar* text=g_compute_checksum_for_data(G_CHECKSUM_SHA256,data,size);
    Require(text!=nullptr,"hash-failed");std::string out(text);g_free(text);return out;
}
bool Stable(const struct stat& a,const struct stat& b) {
#if defined(__APPLE__)
    const bool time=a.st_mtimespec.tv_sec==b.st_mtimespec.tv_sec&&a.st_mtimespec.tv_nsec==b.st_mtimespec.tv_nsec&&
        a.st_ctimespec.tv_sec==b.st_ctimespec.tv_sec&&a.st_ctimespec.tv_nsec==b.st_ctimespec.tv_nsec;
#else
    const bool time=a.st_mtim.tv_sec==b.st_mtim.tv_sec&&a.st_mtim.tv_nsec==b.st_mtim.tv_nsec&&
        a.st_ctim.tv_sec==b.st_ctim.tv_sec&&a.st_ctim.tv_nsec==b.st_ctim.tv_nsec;
#endif
    return time&&a.st_dev==b.st_dev&&a.st_ino==b.st_ino&&a.st_size==b.st_size&&a.st_nlink==b.st_nlink;
}
struct ReadContext {
    int fd;std::uint64_t size,offset{0};const Budget& budget;std::mutex mu;bool failed{false};
};
void NeedData(GstAppSrc* source,guint length,gpointer value) {
    auto& c=*static_cast<ReadContext*>(value);std::unique_lock lock(c.mu);
    if(c.budget.Stop()||length==0||length>16*1024*1024){c.failed=true;gst_app_src_end_of_stream(source);return;}
    if(c.offset>=c.size){gst_app_src_end_of_stream(source);return;}
    const auto size=static_cast<gsize>(std::min<std::uint64_t>(length,c.size-c.offset));
    GstBuffer* buffer=gst_buffer_new_allocate(nullptr,size,nullptr);GstMapInfo map{};
    if(!buffer||!gst_buffer_map(buffer,&map,GST_MAP_WRITE)) {if(buffer)gst_buffer_unref(buffer);c.failed=true;gst_app_src_end_of_stream(source);return;}
    std::size_t done=0;
    while(done<size&&!c.budget.Stop()) {
        const auto got=::pread(c.fd,map.data+done,size-done,static_cast<off_t>(c.offset+done));
        if(got<0&&errno==EINTR)continue;if(got<=0)break;done+=static_cast<std::size_t>(got);
    }
    gst_buffer_unmap(buffer,&map);
    if(done!=size){gst_buffer_unref(buffer);c.failed=true;gst_app_src_end_of_stream(source);return;}
    GST_BUFFER_OFFSET(buffer)=c.offset;c.offset+=size;GST_BUFFER_OFFSET_END(buffer)=c.offset;
    lock.unlock();const auto flow=gst_app_src_push_buffer(source,buffer);
    if(flow!=GST_FLOW_OK&&flow!=GST_FLOW_FLUSHING){std::lock_guard again(c.mu);c.failed=true;}
}
gboolean SeekData(GstAppSrc*,guint64 offset,gpointer value) {
    auto& c=*static_cast<ReadContext*>(value);std::lock_guard lock(c.mu);
    if(offset>c.size)return FALSE;c.offset=offset;return TRUE;
}
struct Pipeline {
    GstElement* pipeline{nullptr};GstElement* source{nullptr};GstElement* sink{nullptr};GstBus* bus{nullptr};
    explicit Pipeline(const std::string& launch) {
        GError* error=nullptr;pipeline=gst_parse_launch(launch.c_str(),&error);
        if(error||!pipeline){if(error)g_error_free(error);if(pipeline)gst_object_unref(pipeline);throw std::runtime_error("pipeline-unavailable");}
        source=gst_bin_get_by_name(GST_BIN(pipeline),"in");sink=gst_bin_get_by_name(GST_BIN(pipeline),"out");bus=gst_element_get_bus(pipeline);
        if(!source||!sink||!bus){Close();throw std::runtime_error("pipeline-elements-missing");}
    }
    void Close(){if(pipeline)gst_element_set_state(pipeline,GST_STATE_NULL);if(bus)gst_object_unref(bus);if(sink)gst_object_unref(sink);if(source)gst_object_unref(source);if(pipeline)gst_object_unref(pipeline);pipeline=nullptr;}
    ~Pipeline(){if(pipeline)Close();}
    Pipeline(const Pipeline&)=delete;
    void Play(){Require(gst_element_set_state(pipeline,GST_STATE_PLAYING)!=GST_STATE_CHANGE_FAILURE,"pipeline-start-failed");}
    GstSample* Pull(const Budget& budget) {
        while(true) {
            budget.Check();
            GstSample* sample=gst_app_sink_try_pull_sample(GST_APP_SINK(sink),100*GST_MSECOND);
            if(sample)return sample;
            GstMessage* error=gst_bus_pop_filtered(bus,GST_MESSAGE_ERROR);
            if(error){gst_message_unref(error);throw std::runtime_error("pipeline-media-error");}
            if(gst_app_sink_is_eos(GST_APP_SINK(sink)))return nullptr;
        }
    }
};
struct Au {
    std::vector<unsigned char> bytes;
    std::int64_t pts{0},duration{0},stream{0};std::optional<std::int64_t> dts;
    std::uint64_t ordinal{0};std::int64_t original{0};bool idr{false};
    std::string vcl,parameters;
};
void Nals(Au& au) {
    const auto& b=au.bytes;std::vector<std::pair<std::size_t,std::size_t>> starts;
    for(std::size_t i=0;i+3<=b.size();) {
        std::size_t width=0;
        if(i+4<=b.size()&&b[i]==0&&b[i+1]==0&&b[i+2]==0&&b[i+3]==1)width=4;
        else if(b[i]==0&&b[i+1]==0&&b[i+2]==1)width=3;
        if(width){starts.push_back({i,i+width});i+=width;}else ++i;
    }
    std::vector<unsigned char> vcl,parameters;
    for(std::size_t i=0;i<starts.size();++i) {
        const auto first=starts[i].second;auto last=i+1<starts.size()?starts[i+1].first:b.size();
        while(last>first&&b[last-1]==0)--last;
        Require(first<last,"invalid-annexb-nal");const auto type=b[first]&31;
        if(type==1||type==5||type==7||type==8) {
            auto& out=(type==1||type==5)?vcl:parameters;
            const auto size=last-first;Require(size<=std::numeric_limits<std::uint32_t>::max(),"nal-size-cap");
            for(int shift=24;shift>=0;shift-=8)out.push_back(static_cast<unsigned char>((size>>shift)&255));
            out.insert(out.end(),b.begin()+first,b.begin()+last);
        }
        au.idr|=type==5;
    }
    Require(!vcl.empty(),"h264-vcl-missing");au.vcl=Hash(vcl.data(),vcl.size());
    if(!parameters.empty())au.parameters=Hash(parameters.data(),parameters.size());
}
std::vector<Au> ReadAus(int fd,std::uint64_t bytes,bool ts,const Budget& budget,std::optional<std::int64_t> seek={}) {
    budget.Check();ReadContext context{fd,bytes,0,budget,{},false};
    Pipeline pipe(std::string("appsrc name=in format=bytes block=false ! ")+(ts?"tsdemux":"qtdemux")+
        " ! h264parse config-interval=-1 ! video/x-h264,stream-format=byte-stream,alignment=au ! appsink name=out sync=false max-buffers=4 drop=false");
    GstAppSrcCallbacks callbacks{};callbacks.need_data=NeedData;callbacks.seek_data=SeekData;
    gst_app_src_set_callbacks(GST_APP_SRC(pipe.source),&callbacks,&context,nullptr);
    gst_app_src_set_stream_type(GST_APP_SRC(pipe.source),GST_APP_STREAM_TYPE_RANDOM_ACCESS);gst_app_src_set_size(GST_APP_SRC(pipe.source),bytes);
    if(seek) {
        Require(gst_element_set_state(pipe.pipeline,GST_STATE_PAUSED)!=GST_STATE_CHANGE_FAILURE,"seek-preroll-state");
        GstState state=GST_STATE_NULL,pending=GST_STATE_NULL;
        budget.Check();
        const auto remaining=std::chrono::duration_cast<std::chrono::nanoseconds>(budget.deadline-Clock::now()).count();
        Require(gst_element_get_state(pipe.pipeline,&state,&pending,std::min<GstClockTime>(2*GST_SECOND,remaining))!=GST_STATE_CHANGE_FAILURE,"seek-preroll-failed");
        budget.Check();
        Require(gst_element_seek(pipe.pipeline,1.0,GST_FORMAT_TIME,static_cast<GstSeekFlags>(GST_SEEK_FLAG_FLUSH|GST_SEEK_FLAG_KEY_UNIT),
            GST_SEEK_TYPE_SET,*seek,GST_SEEK_TYPE_NONE,0),"source-seek-failed");
    }
    pipe.Play();std::vector<Au> result;std::uint64_t payload=0;
    while(GstSample* sample=pipe.Pull(budget)) {
        Au au;GstBuffer* buffer=gst_sample_get_buffer(sample);
        try {
            Require(result.size()<kAuLimit,"au-count-cap");
            au.pts=Signed(GST_BUFFER_PTS(buffer));au.duration=Signed(GST_BUFFER_DURATION(buffer));Require(au.duration>0,"duration-unavailable");
            if(GST_BUFFER_DTS_IS_VALID(buffer))au.dts=Signed(GST_BUFFER_DTS(buffer));
            const auto* segment=gst_sample_get_segment(sample);guint64 stream=0;
            Require(segment&&segment->format==GST_FORMAT_TIME,"sample-time-segment-unavailable");
            const int sign=gst_segment_to_stream_time_full(segment,GST_FORMAT_TIME,GST_BUFFER_PTS(buffer),&stream);
            Require(sign!=0,"stream-time-unavailable");au.stream=Checked(static_cast<__int128>(stream)*sign);
            const auto size=gst_buffer_get_size(buffer);payload+=size;Require(payload<=kInputLimit,"au-byte-cap");
            au.bytes.resize(size);Require(gst_buffer_extract(buffer,0,au.bytes.data(),size)==size,"au-read-failed");Nals(au);
        } catch(...) {gst_sample_unref(sample);throw;}
        gst_sample_unref(sample);result.push_back(std::move(au));
    }
    {std::lock_guard lock(context.mu);Require(!context.failed,"source-fd-read-failed");}
    Require(!result.empty(),"source-au-empty");return result;
}
void PushAus(Pipeline& pipe,const std::vector<Au>& aus,const Budget& budget) {
    GstCaps* caps=gst_caps_from_string("video/x-h264,stream-format=byte-stream,alignment=au");
    gst_app_src_set_caps(GST_APP_SRC(pipe.source),caps);gst_caps_unref(caps);pipe.Play();
    std::int64_t origin=aus.front().dts.value_or(aus.front().pts);
    for(const auto& au:aus)origin=std::min(origin,std::min(au.pts,au.dts.value_or(au.pts)));
    for(const auto& au:aus) {
        budget.Check();
        GstBuffer* buffer=gst_buffer_new_allocate(nullptr,au.bytes.size(),nullptr);Require(buffer!=nullptr,"au-allocation-failed");
        gst_buffer_fill(buffer,0,au.bytes.data(),au.bytes.size());GST_BUFFER_PTS(buffer)=au.pts-origin;
        GST_BUFFER_DTS(buffer)=au.dts?static_cast<GstClockTime>(*au.dts-origin):GST_CLOCK_TIME_NONE;GST_BUFFER_DURATION(buffer)=au.duration;
        if(!au.idr)GST_BUFFER_FLAG_SET(buffer,GST_BUFFER_FLAG_DELTA_UNIT);
        Require(gst_app_src_push_buffer(GST_APP_SRC(pipe.source),buffer)==GST_FLOW_OK,"au-push-failed");
    }
    Require(gst_app_src_end_of_stream(GST_APP_SRC(pipe.source))==GST_FLOW_OK,"au-eos-failed");
}
std::vector<std::string> Decode(const std::vector<Au>& aus,const Budget& budget) {
    Pipeline pipe("appsrc name=in format=time block=false ! h264parse ! avdec_h264 ! videoconvert ! video/x-raw,format=I420 ! appsink name=out sync=false max-buffers=4 drop=false");
    PushAus(pipe,aus,budget);std::vector<std::string> result;
    while(GstSample* sample=pipe.Pull(budget)) {
        GstVideoInfo info{};GstVideoFrame frame{};
        if(!gst_video_info_from_caps(&info,gst_sample_get_caps(sample))||GST_VIDEO_INFO_FORMAT(&info)!=GST_VIDEO_FORMAT_I420||
            GST_VIDEO_INFO_WIDTH(&info)>8192||GST_VIDEO_INFO_HEIGHT(&info)>8192||
            !gst_video_frame_map(&frame,&info,gst_sample_get_buffer(sample),GST_MAP_READ)) {
            gst_sample_unref(sample);throw std::runtime_error("decode-visible-map-failed");
        }
        GChecksum* hash=g_checksum_new(G_CHECKSUM_SHA256);
        for(guint component=0;component<3;++component) {
            const auto* data=GST_VIDEO_FRAME_COMP_DATA(&frame,component);
            const auto stride=GST_VIDEO_FRAME_COMP_STRIDE(&frame,component);
            const auto width=GST_VIDEO_FRAME_COMP_WIDTH(&frame,component);
            const auto height=GST_VIDEO_FRAME_COMP_HEIGHT(&frame,component);
            for(gint row=0;row<height;++row)g_checksum_update(hash,data+row*stride,width);
        }
        const std::string digest=g_checksum_get_string(hash);g_checksum_free(hash);
        gst_video_frame_unmap(&frame);gst_sample_unref(sample);
        Require(result.size()<kAuLimit,"decoded-count-cap");result.push_back(digest);
    }
    Require(result.size()==aus.size(),"decoded-count-mismatch");return result;
}
void WriteOutput(int fd,const std::vector<Au>& aus,std::uint64_t limit,const Budget& budget,DerivedRemuxOutput& out,bool ts) {
    Pipeline pipe(std::string("appsrc name=in format=time block=false ! h264parse config-interval=-1 ! ")+
        (ts?"mpegtsmux alignment=7":"mp4mux fragment-duration=1000 streamable=true")+
        " ! appsink name=out sync=false max-buffers=4 drop=false");
    PushAus(pipe,aus,budget);
    while(GstSample* sample=pipe.Pull(budget)) {
        GstBuffer* buffer=gst_sample_get_buffer(sample);GstMapInfo map{};
        if(!gst_buffer_map(buffer,&map,GST_MAP_READ)){gst_sample_unref(sample);throw std::runtime_error("output-map-failed");}
        if(map.size>limit-out.size_bytes){gst_buffer_unmap(buffer,&map);gst_sample_unref(sample);throw std::runtime_error("output-byte-budget-exceeded");}
        std::size_t done=0;
        while(done<map.size) {
            if(budget.Stop()){gst_buffer_unmap(buffer,&map);gst_sample_unref(sample);budget.Check();}
            const auto written=::pwrite(fd,map.data+done,map.size-done,static_cast<off_t>(out.size_bytes));
            if(written<0&&errno==EINTR)continue;
            if(written<=0){gst_buffer_unmap(buffer,&map);gst_sample_unref(sample);throw std::runtime_error("output-write-failed");}
            done+=written;out.size_bytes+=written;out.output_modified=true;out.caller_cleanup_required=true;
        }
        gst_buffer_unmap(buffer,&map);gst_sample_unref(sample);
    }
    Require(out.size_bytes>0,"output-empty");
}
std::string FileHash(int fd,std::uint64_t size,const Budget& budget) {
    GChecksum* hash=g_checksum_new(G_CHECKSUM_SHA256);Require(hash!=nullptr,"file-hash-setup");
    std::vector<unsigned char> buffer(65536);std::uint64_t offset=0;
    while(offset<size) {
        if(budget.Stop()){g_checksum_free(hash);budget.Check();}
        const auto got=::pread(fd,buffer.data(),std::min<std::uint64_t>(buffer.size(),size-offset),offset);
        if(got<0&&errno==EINTR)continue;
        if(got<=0){g_checksum_free(hash);throw std::runtime_error("file-hash-read");}
        g_checksum_update(hash,buffer.data(),got);offset+=got;
    }
    const std::string result=g_checksum_get_string(hash);g_checksum_free(hash);return result;
}
void RecordMissing(const std::vector<Au>& aus,const std::vector<std::pair<std::int64_t,std::int64_t>>& requested,
                   const std::string& id,DerivedRemuxResult& result,bool& satisfied) {
    std::vector<std::pair<std::int64_t,std::int64_t>> actual;
    for(const auto& au:aus)actual.push_back({au.original,Checked(static_cast<__int128>(au.original)+au.duration)});
    std::sort(actual.begin(),actual.end());satisfied=true;
    for(const auto& range:requested) {
        auto cursor=range.first;
        for(const auto& interval:actual) {
            if(interval.second<=cursor||interval.first>=range.second)continue;
            if(interval.first>cursor){result.unfulfilled.push_back({id,"original-pts-ns","file-duration-uncovered",cursor,std::min(interval.first,range.second)});satisfied=false;}
            cursor=std::max(cursor,std::min(interval.second,range.second));
        }
        if(cursor<range.second){result.unfulfilled.push_back({id,"original-pts-ns","file-duration-uncovered",cursor,range.second});satisfied=false;}
    }
}
}
#endif
DerivedRemuxResult DeriveRecordingH264Remux(const DerivedRemuxRequest& request) {
    DerivedRemuxResult result;result.selection=request.selection;
#if !MEDIA_SERVER_USE_GSTREAMER
    result.error="gstreamer-unavailable";return result;
#else
    const Budget budget{Clock::now()+std::chrono::milliseconds(request.max_work_ms),request.cancelled};
    try {
        Require(request.max_work_ms>0&&request.max_work_ms<=30000,"invalid-work-budget");budget.Check();
        Require(request.output_container=="mp4"||request.output_container=="mpegts","unsupported-output-container");
        const bool ts_output=request.output_container=="mpegts";
        Require(request.max_output_bytes>0&&request.max_output_bytes<=256*1024*1024,"invalid-output-budget");
        Require(!request.sources.empty()&&request.sources.size()<=8&&request.selection.slices.size()<=4096,"source-or-selection-cap");
        Require(ValidateRecordingConsumerReferenceV1(request.selection.reference,nullptr),"invalid-request-reference");
        const bool native=request.selection.native_file_intervals;
        std::vector<struct stat> statuses;std::set<std::pair<dev_t,ino_t>> identities;
        std::map<std::string,const DerivedRemuxSource*> selected_sources;
        for(const auto& source:request.sources) {
            Require(source.segment.source_id==request.selection.reference.source_id&&
                source.segment.channel_id==request.selection.reference.channel_id,"reference-source-channel-conflict");
            Require(selected_sources.emplace(source.segment.segment_id,&source).second,"duplicate-source-segment");
            Require(ValidateRecordingSourceBindingForSegment(source.binding,source.segment,nullptr),"invalid-source-binding");
            Require(source.segment.container=="mp4"&&source.segment.video_codecs==std::vector<std::string>{"h264"},"unsupported-codec-profile");
            struct stat input{},output{};
            Require(::fstat(source.source_fd,&input)==0&&S_ISREG(input.st_mode)&&input.st_nlink==1&&input.st_size>0&&static_cast<std::uint64_t>(input.st_size)<=kInputLimit,"unsafe-source-fd");
            Require(::fstat(source.output_fd,&output)==0&&S_ISREG(output.st_mode)&&output.st_nlink==1&&output.st_size==0,"unsafe-output-fd");
            const int flags=::fcntl(source.output_fd,F_GETFL);
            Require(flags>=0&&(flags&O_ACCMODE)==O_RDWR&&!(flags&O_APPEND),"output-fd-not-empty-readwrite");
            Require(identities.insert({input.st_dev,input.st_ino}).second&&identities.insert({output.st_dev,output.st_ino}).second,"fd-inode-alias");statuses.push_back(input);
        }
        std::set<std::string> used_sources;
        for(const auto& slice:request.selection.slices) {
            Require(slice.state!=DerivedSliceState::Ambiguous,"ambiguous-selection");
            if(slice.state!=DerivedSliceState::Confirmed)result.unfulfilled.push_back({"","request-ns",slice.reason,slice.start_ns,slice.end_ns});
            else {
                Require(slice.candidates.size()==1,"non-unique-confirmed-selection");
                const auto& candidate=slice.candidates.front();
                const auto found=selected_sources.find(candidate.segment.segment_id);
                Require(found!=selected_sources.end(),"confirmed-source-missing");
                used_sources.insert(candidate.segment.segment_id);
                Require(SerializeRecordingSegmentV2(candidate.segment)==SerializeRecordingSegmentV2(found->second->segment),"selection-source-conflict");
            }
        }
        Require(used_sources.size()==selected_sources.size(),"source-not-selected");
        std::uint64_t total_bytes=0;
        for(std::size_t index=0;index<request.sources.size();++index) {
            const auto& source=request.sources[index];DerivedRemuxOutput output;output.segment_id=source.segment.segment_id;
            output.store_id=source.segment.store_id;output.source_id=source.segment.source_id;output.media_epoch_id=source.segment.media_epoch_id;
            try {
                std::vector<std::pair<std::int64_t,std::int64_t>> requested;
                for(const auto& slice:request.selection.slices)if(slice.state==DerivedSliceState::Confirmed) {
                    const auto& c=slice.candidates.front();if(c.segment.segment_id!=source.segment.segment_id)continue;
                    Require(SerializeRecordingSegmentV2(c.segment)==SerializeRecordingSegmentV2(source.segment),"selection-source-conflict");
                    requested.push_back({Ns(c.media_start_pts,c.segment),Ns(c.media_end_pts,c.segment)});
                }
                Require(!requested.empty(),"source-not-selected");std::sort(requested.begin(),requested.end());
                output.requested_media_start_ns=requested.front().first;output.requested_media_end_ns=requested.back().second;
                const RecordingMediaDescriptor descriptor{source.segment.container,source.segment.video_codecs,source.segment.size_bytes,source.segment.checksum_sha256,source.segment.retention_class};
                budget.Check();
                const auto remaining=std::chrono::duration_cast<std::chrono::milliseconds>(budget.deadline-Clock::now());
                Require(InspectRecordingPhysicalMediaFd(source.source_fd,descriptor,{std::min(remaining,std::chrono::milliseconds(5000))}).state==MediaInspectionState::Healthy,"source-integrity-failed");
                budget.Check();auto full=ReadAus(source.source_fd,source.segment.size_bytes,false,budget);
                Require(source.binding.index_complete&&full.size()==source.binding.samples.size(),"source-binding-incomplete");
                output.source_origin_ns=Ns(source.segment.media_start_pts,source.segment);
                std::map<std::string,const RecordingFileSampleEvidenceV1*> native_samples;
                if(native) {
                    Require(source.binding.file_evidence&&VerifyRecordingFileEvidenceFd(source.source_fd,source.binding,nullptr),"native-file-proof-mismatch");budget.Check();
                    output.source_origin_ns=source.binding.file_evidence->writer_origin_ns;
                    output.actual_range_basis="verified-native-presentation-interval";
                    output.original_association_quality="observed-identity-file-proof-vcl";
                    for(const auto& sample:source.binding.file_evidence->samples)Require(native_samples.emplace(sample.vcl_sha256,&sample).second,"native-file-proof-ambiguous");
                }
                std::map<std::uint64_t,std::uint64_t> originals;
                if(!native)for(const auto& sample:source.binding.samples)Require(originals.emplace(sample.pts_ns,sample.ordinal).second,"duplicate-original-pts");
                std::set<std::uint64_t> used;
                for(auto& au:full) {
                    if(native) {
                        const auto sample=native_samples.find(au.vcl);Require(sample!=native_samples.end(),"native-file-au-missing");
                        au.original=sample->second->original_pts_ns;au.ordinal=sample->second->ordinal;
                        DerivedRemuxAu p;p.ordinal=au.ordinal;p.original_pts_ns=au.original;p.file_pts_ns=au.pts;p.file_dts_ns=au.dts;p.source_vcl_sha256=p.output_vcl_sha256=au.vcl;PresentationInterval interval;
                        Require(used.insert(au.ordinal).second&&NativeAuInterval(*source.binding.file_evidence,*sample->second,p,&interval),"native-file-au-time-mismatch");
                    } else {
                        au.original=Checked(static_cast<__int128>(au.pts)+output.source_origin_ns);
                        const auto original=originals.find(static_cast<std::uint64_t>(au.original));
                        Require(original!=originals.end()&&used.insert(original->second).second,"file-original-timestamp-mismatch");au.ordinal=original->second;
                    }
                    if(!au.parameters.empty()){if(output.codec_sha256.empty())output.codec_sha256=au.parameters;else Require(output.codec_sha256==au.parameters,"codec-configuration-change");}
                }
                Require(!output.codec_sha256.empty(),"codec-parameters-missing");
                std::size_t first=full.size(),last=0;
                if(native) {
                    // 선택 때 실제 관측된 AU를 기준으로 decode 의존 구간만 확장한다.
                    std::set<std::uint64_t> wanted;
                    for(const auto& slice:request.selection.slices)if(slice.state==DerivedSliceState::Confirmed) {
                        const auto& c=slice.candidates.front();if(c.segment.segment_id==source.segment.segment_id){Require(c.original.has_value(),"native-observed-identity-missing");wanted.insert(c.original->ordinal);}
                    }
                    for(std::size_t i=0;i<full.size();++i)if(wanted.count(full[i].ordinal)){first=std::min(first,i);last=std::max(last,i);}
                } else for(std::size_t i=0;i<full.size();++i)for(const auto& r:requested)if(full[i].original<r.second&&
                    Checked(static_cast<__int128>(full[i].original)+full[i].duration)>r.first){first=std::min(first,i);last=std::max(last,i);}
                Require(first<full.size(),"no-source-au-selected");while(first>0&&!full[first].idr)--first;Require(full[first].idr,"decode-preroll-unavailable");
                std::size_t stop=last+1;while(stop<full.size()&&!full[stop].idr)++stop;
                output.seek_stream_time_ns=full[first].stream;Require(output.seek_stream_time_ns>=0,"negative-seek-stream-time");
                auto sought=ReadAus(source.source_fd,source.segment.size_bytes,false,budget,output.seek_stream_time_ns);
                Require(sought.size()>=stop-first,"seek-au-count-mismatch");
                std::vector<Au> selected;
                for(std::size_t i=first;i<stop;++i) {
                    const auto& observed=sought[i-first];Require(observed.vcl==full[i].vcl&&observed.pts==full[i].pts,"seek-au-correspondence-failed");selected.push_back(full[i]);
                }
                output.actual_original_start_ns=selected.front().original;output.actual_original_end_ns=selected.front().original;
                for(const auto& au:selected){output.actual_original_start_ns=std::min(output.actual_original_start_ns,au.original);output.actual_original_end_ns=std::max(output.actual_original_end_ns,Checked(static_cast<__int128>(au.original)+au.duration));}
                output.source_decoded_sha256=Decode(selected,budget);
                WriteOutput(source.output_fd,selected,request.max_output_bytes-total_bytes,budget,output,ts_output);total_bytes+=output.size_bytes;
                output.checksum_sha256=FileHash(source.output_fd,output.size_bytes,budget);
                auto emitted=ReadAus(source.output_fd,output.size_bytes,ts_output,budget);
                Require(emitted.size()==selected.size(),"output-au-count-mismatch");
                for(std::size_t i=0;i<selected.size();++i) {
                    const auto& a=selected[i];const auto& b=emitted[i];Require(a.vcl==b.vcl,"output-au-payload-mismatch");
                    DerivedRemuxAu p;p.ordinal=a.ordinal;p.original_pts_ns=a.original;p.file_pts_ns=a.pts;p.file_dts_ns=a.dts;
                    p.file_duration_ns=a.duration;p.file_stream_time_ns=a.stream;p.output_pts_ns=b.pts;p.output_dts_ns=b.dts;p.output_duration_ns=b.duration;
                    p.source_vcl_sha256=a.vcl;p.output_vcl_sha256=b.vcl;
                    const auto ticks=Checked((static_cast<__int128>(b.pts)*90000+999999999)/1000000000);
                    if(static_cast<__int128>(ticks)*1000000000/90000==b.pts){p.output_pts_90k=ticks;p.output_pts_residual_numerator=Checked(static_cast<__int128>(ticks)*1000000000-static_cast<__int128>(b.pts)*90000);}
                    output.access_units.push_back(std::move(p));
                }
                output.output_decoded_sha256=Decode(emitted,budget);
                Require(output.source_decoded_sha256==output.output_decoded_sha256,"output-decoded-frame-mismatch");
                struct stat after{};Require(::fstat(source.source_fd,&after)==0&&Stable(statuses[index],after),"source-file-changed");
                Require(FileHash(source.source_fd,source.segment.size_bytes,budget)==source.segment.checksum_sha256,"source-file-changed");
                if(native) {
                    NativeCoverageResult coverage;
                    Require(EvaluateNativeOutputCoverage(request.selection,source.segment,source.binding,output,&coverage),"native-output-coverage-invalid");
                    output.actual_original_start_ns=coverage.start;output.actual_original_end_ns=coverage.end;output.request_fully_satisfied=coverage.satisfied;
                    result.unfulfilled.insert(result.unfulfilled.end(),coverage.missing.begin(),coverage.missing.end());
                } else RecordMissing(selected,requested,source.segment.segment_id,result,output.request_fully_satisfied);
                output.verified_output=true;
            } catch(const std::exception& e){output.error=e.what();result.error=e.what();result.outputs.push_back(std::move(output));break;}
            result.outputs.push_back(std::move(output));
        }
        result.verified_output=result.outputs.size()==request.sources.size()&&std::all_of(result.outputs.begin(),result.outputs.end(),[](const auto& o){return o.verified_output;});
        result.request_fully_satisfied=result.verified_output&&request.selection.complete&&result.unfulfilled.empty()&&
            std::all_of(result.outputs.begin(),result.outputs.end(),[](const auto& o){return o.request_fully_satisfied;});
    } catch(const std::exception& e){result.error=e.what();}
    return result;
#endif
}
} // namespace recording

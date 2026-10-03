// 파일 용도: V420-P01/P03 실제 MP4 source evidence와 디코딩 frame seek 대조.
#include "recording_media_test_fixture.h"
#include "recording/recording_search_reader.h"
#include <cmath>
#include <iostream>
namespace {
struct Frame {std::int64_t pts;std::string hash;};
std::vector<Frame> Decode(const std::filesystem::path& path,std::optional<double> seek={}){
    gchar* escaped=g_strescape(path.c_str(),nullptr);
    const std::string launch="filesrc location=\""+std::string(escaped)+"\" ! qtdemux ! h264parse ! avdec_h264 ! videoconvert ! video/x-raw,format=I420 ! appsink name=frames sync=false";
    g_free(escaped);GError* error=nullptr;GstElement* pipeline=gst_parse_launch(launch.c_str(),&error);
    if(error){std::string message=error->message;g_error_free(error);if(pipeline)gst_object_unref(pipeline);throw std::runtime_error(message);}
    GstElement* sink=gst_bin_get_by_name(GST_BIN(pipeline),"frames");std::vector<Frame> result;
    const auto cleanup=[&]{gst_element_set_state(pipeline,GST_STATE_NULL);gst_object_unref(sink);gst_object_unref(pipeline);};
    try{
        gst_element_set_state(pipeline,GST_STATE_PAUSED);
        if(gst_element_get_state(pipeline,nullptr,nullptr,5*GST_SECOND)==GST_STATE_CHANGE_FAILURE)throw std::runtime_error("decode-preroll");
        if(seek&&!gst_element_seek_simple(pipeline,GST_FORMAT_TIME,static_cast<GstSeekFlags>(GST_SEEK_FLAG_FLUSH|GST_SEEK_FLAG_ACCURATE),static_cast<gint64>(*seek*GST_SECOND)))throw std::runtime_error("decode-seek");
        gst_element_set_state(pipeline,GST_STATE_PLAYING);
        for(int i=0;i<128;++i){GstSample* sample=gst_app_sink_try_pull_sample(GST_APP_SINK(sink),5*GST_SECOND);
            if(!sample){if(!gst_app_sink_is_eos(GST_APP_SINK(sink)))throw std::runtime_error("decode-timeout");break;}
            GstBuffer* buffer=gst_sample_get_buffer(sample);GstMapInfo map{};
            if(!gst_buffer_map(buffer,&map,GST_MAP_READ)){gst_sample_unref(sample);throw std::runtime_error("decode-map");}
            gchar* hash=g_compute_checksum_for_data(G_CHECKSUM_SHA256,map.data,map.size);
            result.push_back({static_cast<std::int64_t>(GST_BUFFER_PTS(buffer)),hash});g_free(hash);
            gst_buffer_unmap(buffer,&map);gst_sample_unref(sample);if(seek)break;
        }
        cleanup();return result;
    }catch(...){cleanup();throw;}
}
}
int main(int argc,char**argv){
    if(argc!=2)return 2;gst_init(nullptr,nullptr);int pass=0,fail=0;
    const auto check=[&](bool ok,const char* name){std::cout<<(ok?"[pass] ":"[fail] ")<<name<<'\n';ok?++pass:++fail;};
    try{
        Store store(std::filesystem::weakly_canonical(argv[1])/"source");auto input=Encode(12,false,false,160,90,30,250);Shift(input,7000000000ULL);
        recording::GStreamerSegmentWriter::Options options(store.root,10000);options.managed_journal=&store.journal;options.managed_catalog=&store.catalog;options.managed_store_id="probe-store";
        recording::GStreamerSegmentWriter writer(options);std::string error;
        if(!writer.Start("probe-channel","unused",input.descriptor,[](auto,auto,auto*){return false;},&error))throw std::runtime_error(error);
        for(const auto& packet:input.packets)writer.Push(packet,0);writer.Stop();
        const auto segments=store.Segments();if(segments.size()!=1)throw std::runtime_error("source-count");const auto& segment=segments.front();
        const auto binding=store.catalog.FindSourceBinding(segment.segment_id);
        check(binding&&binding->file_evidence.has_value(),"30fps source has native file proof");if(!binding||!binding->file_evidence)return 1;
        recording::RecordingReadService read(store.catalog);recording::RecordingSearchReader search(store.catalog,read);recording::SearchSeekTarget target;
        const auto pts=input.packets[5].pts;
        check(search.SourceSeek("probe-channel",segment.segment_id,pts,1,1000000000,&target,&error)&&
            target.sample_ordinal==input.packets[5].observation->ordinal&&std::abs(target.seconds-5.0/30)<1.0/30,
            "source PTS maps to file frame not UTC delta");
        const auto location=store.catalog.FindSegmentMediaLocation(segment.segment_id);if(!location)throw std::runtime_error("location");
        const auto file=location->first/location->second;const auto frames=Decode(file);const auto sought=Decode(file,target.seconds);
        check(frames.size()==12&&sought.size()==1&&sought[0].hash==frames[5].hash&&
            std::abs(sought[0].pts/1e9-target.seconds)<=target.frame_duration_seconds,"actual seek returns independently decoded target frame");
        check(search.SourceSeek("probe-channel",segment.segment_id,pts+1,1,1000000000,&target,&error)&&
            target.sample_ordinal==input.packets[5].observation->ordinal,"between-sample time uses exact native interval");
        const auto held=target;
        check(!search.SourceSeek("other",segment.segment_id,pts,1,1000000000,&target,&error)&&target.seconds==held.seconds,"foreign channel rejected without output change");
        check(!search.SourceSeek("probe-channel",segment.segment_id,pts,1,3,&target,&error),"unrepresentable source time unavailable");
        check(!search.SourceSeek("probe-channel",segment.segment_id,99000000000LL,1,1000000000,&target,&error),"outside source unavailable");
        std::filesystem::rename(file,file.string()+".held");const bool missing=!search.SourceSeek("probe-channel",segment.segment_id,pts,1,1000000000,&target,&error);
        std::filesystem::rename(file.string()+".held",file);check(missing,"missing file has no seek proof");
        Store unsupported(std::filesystem::weakly_canonical(argv[1])/"ten-fps");auto ten=Encode(12,false,false);Shift(ten,7000000000ULL);
        recording::GStreamerSegmentWriter::Options ten_options(unsupported.root,10000);
        ten_options.managed_journal=&unsupported.journal;ten_options.managed_catalog=&unsupported.catalog;ten_options.managed_store_id="probe-store";
        recording::GStreamerSegmentWriter ten_writer(ten_options);
        if(!ten_writer.Start("probe-channel","unused",ten.descriptor,[](auto,auto,auto*){return false;},&error))throw std::runtime_error(error);
        for(const auto& packet:ten.packets)ten_writer.Push(packet,0);ten_writer.Stop();
        const auto ten_segments=unsupported.Segments();if(ten_segments.size()!=1)throw std::runtime_error("ten-fps-source-count");
        recording::RecordingReadService ten_read(unsupported.catalog);recording::RecordingSearchReader ten_search(unsupported.catalog,ten_read);
        check(!ten_search.SourceSeek("probe-channel",ten_segments.front().segment_id,ten.packets[5].pts,1,1000000000,&target,&error)&&
            error=="seek-unavailable-file-evidence","unsupported default mux profile gives explicit unavailable");

    }catch(const std::exception& ex){std::cerr<<ex.what()<<'\n';return 1;}
    std::cout<<"[search-seek] pass="<<pass<<" fail="<<fail<<'\n';return fail?1:0;
}

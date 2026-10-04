// 파일 용도: 공개 4신 영상의 codec 파생 AU를 current V2 writer에 기록하는 UI 전용 소유 seed.
#include "recording/recording_runtime_composition.h"
#include "recording/recording_file_evidence.h"
#include "recording/recording_search_reader.h"
#include "recording/recording_visual_source.h"
#include "recording/visual_index_store.h"
#include <openssl/evp.h>
#include <gst/app/gstappsink.h>
#include <gst/gst.h>
#include <algorithm>
#include <cmath>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <set>
#include <sstream>

namespace {
void Need(bool value,const char* reason){if(!value)throw std::runtime_error(reason);}
struct Encoded {media::StreamDescriptor descriptor;std::vector<media::Packet> packets;};
struct Pipeline {
    GstElement* pipeline{nullptr};GstElement* sink{nullptr};
    explicit Pipeline(const std::string& launch){GError* error=nullptr;pipeline=gst_parse_launch(launch.c_str(),&error);
        if(error||!pipeline){if(error)g_error_free(error);if(pipeline)gst_object_unref(pipeline);throw std::runtime_error("pipeline-parse");}
        sink=gst_bin_get_by_name(GST_BIN(pipeline),"out");
        if(!sink||gst_element_set_state(pipeline,GST_STATE_PLAYING)==GST_STATE_CHANGE_FAILURE){if(sink)gst_object_unref(sink);
            gst_element_set_state(pipeline,GST_STATE_NULL);gst_object_unref(pipeline);throw std::runtime_error("pipeline-start");}}
    ~Pipeline(){gst_element_set_state(pipeline,GST_STATE_NULL);gst_object_unref(sink);gst_object_unref(pipeline);}
};
std::string Hash(const unsigned char* bytes,std::size_t size){
    unsigned char out[32];unsigned length=0;
    Need(EVP_Digest(bytes,size,out,&length,EVP_sha256(),nullptr)==1&&length==32,"sha256");
    std::ostringstream text;for(auto value:out)text<<std::hex<<std::setfill('0')<<std::setw(2)<<unsigned(value);return text.str();
}
std::string HashFile(const std::filesystem::path& path){
    std::ifstream in(path,std::ios::binary);Need(bool(in),"file-open");
    std::vector<unsigned char> bytes((std::istreambuf_iterator<char>(in)),{});
    Need(bytes.size()<=16*1024*1024,"file-cap");return Hash(bytes.data(),bytes.size());
}
std::string SourceVcl(const std::vector<unsigned char>& bytes){
    std::vector<std::pair<std::size_t,std::size_t>> starts;
    for(std::size_t i=0;i+3<=bytes.size();){std::size_t width=0;
        if(i+4<=bytes.size()&&!bytes[i]&&!bytes[i+1]&&!bytes[i+2]&&bytes[i+3]==1)width=4;
        else if(!bytes[i]&&!bytes[i+1]&&bytes[i+2]==1)width=3;
        if(width){starts.emplace_back(i,i+width);i+=width;}else ++i;}
    std::vector<unsigned char> vcl;
    for(std::size_t i=0;i<starts.size();++i){const auto begin=starts[i].second;auto end=i+1<starts.size()?starts[i+1].first:bytes.size();
        while(end>begin&&!bytes[end-1])--end;Need(begin<end,"source-nal");
        const auto type=bytes[begin]&31;if(type!=1&&type!=5)continue;
        const auto count=end-begin;for(int shift=24;shift>=0;shift-=8)vcl.push_back((count>>shift)&255);
        vcl.insert(vcl.end(),bytes.begin()+begin,bytes.begin()+end);}
    Need(!vcl.empty(),"source-vcl");return Hash(vcl.data(),vcl.size());
}
std::map<std::string,std::string> Durable(const std::filesystem::path& root){
    std::map<std::string,std::string> result;
    for(const auto& entry:std::filesystem::directory_iterator(root)){const auto name=entry.path().filename().string();
        if(name=="recording-mutations.jsonl"){
            Need(entry.path()==root/"recording-mutations.jsonl"&&entry.is_directory()&&!entry.is_symlink(),"legacy-barrier-directory");
            result[name]="directory:legacy-barrier";continue;}
        const bool component=name==".recording-store-format"||name=="recording-generation.json"||name=="recording-v2-mutations.jsonl"||
            ((name.rfind("snapshot-",0)==0||name.rfind("identity-",0)==0||name.rfind("evidence-",0)==0||name.rfind("active-",0)==0)&&
             entry.path().extension()==".jsonl");
        if(component){Need(entry.is_regular_file()&&!entry.is_symlink()&&std::filesystem::hard_link_count(entry.path())==1,"durable-file");
            result[name]=HashFile(entry.path());}}
    Need(result.count("recording-generation.json")&&result.count(".recording-store-format")&&result.count("recording-mutations.jsonl"),
        "current-v2-generation");return result;
}
int Cache(const std::filesystem::path& directory){
    recording::VisualIndexStore store(directory);std::shared_ptr<const recording::VisualSearchIndex> index;std::string error;
    if(!store.Load(recording::VisualEmbeddingContract::Siglip2(),&index,&error))return 3;
    Need(index->documents().size()==8,"cache-documents");
    for(const auto& doc:index->documents()){Need(doc.channel_id=="1"&&doc.event_id.empty()&&doc.embedding.size()==768,"cache-document");
        double norm=0;for(float value:doc.embedding){Need(std::isfinite(value),"cache-vector-finite");norm+=double(value)*value;}
        Need(std::abs(std::sqrt(norm)-1)<=1e-5,"cache-vector-norm");}
    std::cout<<"{\"documents\":8,\"dimensions\":768,\"channelId\":\"1\",\"finiteNormalized\":true}";return 0;
}
}
int main(int argc,char** argv){try{
    if(argc==3&&std::string(argv[1])=="--cache-check")return Cache(argv[2]);
    if(argc!=6)return 2;gst_init(nullptr,nullptr);
    const std::filesystem::path root(argv[1]),video(argv[2]),manifest(argv[3]);
    const auto parent=std::filesystem::canonical(root.parent_path());
    Need(root.filename()=="recordings"&&root.parent_path()==parent&&parent.filename().string().rfind("media-server-visual-ui-",0)==0&&
        manifest.parent_path()==parent&&!std::filesystem::exists(manifest)&&!std::filesystem::is_symlink(root)&&
        std::filesystem::is_directory(root)&&std::filesystem::is_empty(root),"owned-empty-target");
    const std::string source_hash=argv[5];
    Need(source_hash.size()==64&&source_hash.find_first_not_of("0123456789abcdef")==std::string::npos&&
        video==parent/"input/va_four_scene_codec_fixture.mp4"&&std::filesystem::canonical(video)==video&&
        HashFile(video)==source_hash,"fixed-codec-derivative");
    const auto original=parent/"input/va_four_scene_sample.mp4";
    Need(std::filesystem::canonical(original)==original&&
        HashFile(original)=="bba0c676f6cfc5fcad72ecaaf1c8db104d3a96b89329f96ca3108621ec3abb0b","fixed-public-original");
    const auto anchor=std::stoll(argv[4]);Need(anchor>0&&anchor<4102444800000LL,"fixture-anchor");
    gchar* escaped=g_strescape(video.c_str(),nullptr);const std::string location=escaped;g_free(escaped);
    Pipeline pipeline("filesrc location=\""+location+"\" ! qtdemux ! h264parse ! video/x-h264,stream-format=byte-stream,alignment=au ! appsink name=out sync=false");
    Encoded input;std::vector<std::pair<std::uint64_t,std::uint64_t>> observed;GstClockTime origin=0;std::size_t payload_bytes=0;
    while(true){GstSample* sample=gst_app_sink_try_pull_sample(GST_APP_SINK(pipeline.sink),3*GST_SECOND);
        if(!sample){Need(gst_app_sink_is_eos(GST_APP_SINK(pipeline.sink)),"source-eos");break;}
        std::unique_ptr<GstSample,decltype(&gst_sample_unref)> guard(sample,gst_sample_unref);GstBuffer* buffer=gst_sample_get_buffer(sample);
        Need(input.packets.size()<600&&GST_BUFFER_PTS_IS_VALID(buffer)&&GST_BUFFER_DTS_IS_VALID(buffer)&&GST_BUFFER_DURATION_IS_VALID(buffer),"source-timestamps");
        GstCaps* caps=gst_sample_get_caps(sample);const auto* structure=gst_caps_get_structure(caps,0);int width=0,height=0,num=0,den=0;
        Need(gst_structure_get_int(structure,"width",&width)&&gst_structure_get_int(structure,"height",&height)&&
             gst_structure_get_fraction(structure,"framerate",&num,&den)&&width==1280&&height==720&&num==30&&den==1,"source-1280x720-30fps");
        if(input.packets.empty()){origin=std::min(GST_BUFFER_PTS(buffer),GST_BUFFER_DTS(buffer));gchar* text=gst_caps_to_string(caps);
            input.descriptor.tracks.push_back({"video-0",media::MediaKind::Video,media::CodecId::H264,"h264",text,0,0});g_free(text);}
        Need(GST_BUFFER_PTS(buffer)>=origin&&GST_BUFFER_DTS(buffer)>=origin,"source-origin");
        observed.emplace_back(GST_BUFFER_PTS(buffer),GST_BUFFER_DTS(buffer));
        media::Packet packet;packet.kind=media::MediaKind::Video;packet.codec=media::CodecId::H264;packet.track_id="video-0";
        packet.pts=GST_BUFFER_PTS(buffer)-origin;packet.dts=GST_BUFFER_DTS(buffer)-origin;
        packet.is_key_frame=!GST_BUFFER_FLAG_IS_SET(buffer,GST_BUFFER_FLAG_DELTA_UNIT);
        const auto count=gst_buffer_get_size(buffer);payload_bytes+=count;Need(payload_bytes<=16*1024*1024,"source-payload-cap");
        packet.payload.resize(count);Need(gst_buffer_extract(buffer,0,packet.payload.data(),count)==count,"source-payload-read");
        media::SampleObservation observation;observation.source_generation="ui-4scene-generation";observation.generation_order=1;
        observation.ordinal=input.packets.size()+1;observation.pts_ns=packet.pts;observation.dts_ns=packet.dts;
        observation.duration_ns=GST_BUFFER_DURATION(buffer);observation.clock_process_id="ui-fixture-clock";
        observation.mono_before_ns=1000000000LL+packet.pts;observation.mono_after_ns=observation.mono_before_ns+1000;
        observation.observed_utc_ns=anchor*1000000+packet.pts;packet.observation=observation;input.packets.push_back(std::move(packet));}
    Need(input.packets.size()==240&&input.packets.front().is_key_frame,"source-240-au");
    std::vector<std::int64_t> sorted;std::set<std::string> source_vcl;std::uint64_t durations=0;
    std::map<std::string,std::pair<std::size_t,std::int64_t>> first_vcl;std::string first_duplicate;
    for(std::size_t i=0;i<input.packets.size();++i){const auto& packet=input.packets[i];
        sorted.push_back(packet.pts);durations+=*packet.observation->duration_ns;const auto hash=SourceVcl(packet.payload);
        source_vcl.insert(hash);const auto found=first_vcl.emplace(hash,std::make_pair(i+1,packet.pts));
        if(!found.second&&first_duplicate.empty()){std::ostringstream duplicate;
            duplicate<<"{\"vclSha256\":"<<std::quoted(hash)<<",\"firstOrdinal\":"<<found.first->second.first
                <<",\"duplicateOrdinal\":"<<i+1<<",\"firstPtsNs\":"<<found.first->second.second
                <<",\"duplicatePtsNs\":"<<packet.pts<<'}';first_duplicate=duplicate.str();}}
    if(!first_duplicate.empty()){std::cout<<"{\"diagnosis\":\"canonical-vcl-duplicate\",\"sourceAuCount\":"<<input.packets.size()
        <<",\"uniqueVclCount\":"<<source_vcl.size()<<",\"firstDuplicate\":"<<first_duplicate<<'}';
        throw std::runtime_error("codec-original-vcl-unique");}
    std::sort(sorted.begin(),sorted.end());Need(std::adjacent_find(sorted.begin(),sorted.end())==sorted.end()&&
        durations>=7999999500ULL&&durations<=8000000500ULL,"source-eight-seconds");
    std::vector<std::int64_t> expected;for(const auto pts:sorted)if(expected.empty()||pts-expected.back()>=1000000000LL)expected.push_back(pts);
    Need(expected.size()==8,"independent-eight-representatives");std::string segment_id,media_hash;std::uint64_t media_size=0;
    std::vector<recording::RecordingFileSampleEvidenceV1> evidence;std::map<std::string,std::string> durable;
    {
        recording::RecordingRuntimeStorage runtime(root);std::string error;Need(runtime.Open(&error),"runtime-open");
        recording::GStreamerSegmentWriter writer(runtime.WriterOptions(30000));
        Need(writer.Start("1","unused",input.descriptor,[](auto,auto,auto*){return false;},&error),"writer-start");
        for(const auto& packet:input.packets)writer.Push(packet,0);writer.Stop();
        const auto ids=runtime.catalog().FinalizedSegmentIdsForStartup();Need(ids.size()==1,"one-finalized-segment");segment_id=ids.front();
        const auto segment=runtime.catalog().FindSegmentV2ById(segment_id);const auto binding=runtime.catalog().FindSourceBinding(segment_id);
        Need(segment&&binding&&segment->channel_id=="1"&&segment->container=="mp4"&&binding->file_evidence&&
            recording::ValidateRecordingSourceBindingForSegment(*binding,*segment,&error),"exact-v2-file-evidence");
        Need(binding->source_generation=="ui-4scene-generation"&&binding->generation_order==1&&binding->track_id=="video-0"&&
            binding->samples.size()==240&&binding->file_evidence->samples.size()==240,"original-identity");
        evidence=binding->file_evidence->samples;
        for(std::size_t i=0;i<input.packets.size();++i){const auto& packet=input.packets[i];
            const auto found=std::find_if(evidence.begin(),evidence.end(),[&](const auto& sample){return sample.ordinal==i+1;});
            Need(found!=evidence.end()&&found->original_pts_ns==packet.pts&&found->original_dts_ns==packet.dts&&
                found->original_duration_ns==std::int64_t(*packet.observation->duration_ns)&&found->vcl_sha256==SourceVcl(packet.payload),"source-au-exact-evidence");}
        recording::RecordingReadService reader(runtime.catalog());auto media=reader.ResolveMedia("1",segment_id);
        Need(media&&recording::VerifyRecordingFileEvidenceFd(media->fd(),*binding,&error),"native-sample-hashes-and-times");
        media_hash=segment->checksum_sha256;media_size=segment->size_bytes;
        std::vector<recording::VisualSearchDocument> selected;
        Need(recording::RecordingVisualSource::SelectSamples(*segment,*binding,1,&selected,&error)&&selected.size()==expected.size(),"product-eight-selection");
        recording::RecordingSearchReader search(runtime.catalog(),reader);
        for(std::size_t i=0;i<selected.size();++i){Need(selected[i].media_pts==expected[i],"independent-selection-exact-time");
            recording::SearchSeekTarget target;Need(search.SourceSeek("1",segment_id,expected[i],1,1000000000,&target,&error)&&
                target.sample_ordinal>0&&target.basis=="verified-native-file-presentation","exact-current-original-seek");}
        durable=Durable(root);
    }
    {recording::RecordingRuntimeStorage runtime(root);std::string error;Need(runtime.Open(&error)&&Durable(root)==durable,"reopen-authoritative-unchanged");
        recording::RecordingReadService reader(runtime.catalog());Need(bool(reader.ResolveMedia("1",segment_id)),"reopen-current-source");}
    std::ostringstream json;json<<"{\"schema\":\"media-server.visual-ui-seed.v1\",\"sourceSha256\":"<<std::quoted(source_hash)
      <<",\"publicOriginalSha256\":\"bba0c676f6cfc5fcad72ecaaf1c8db104d3a96b89329f96ca3108621ec3abb0b\",\"codecDerivedFixture\":true,\"uniqueOriginalVclCount\":"<<source_vcl.size()<<','
      <<"\"width\":1280,\"height\":720,\"fps\":30,\"durationNs\":"<<durations<<",\"sourceAuCount\":240,\"channelId\":\"1\","
      <<"\"generation\":\"ui-4scene-generation\",\"originNs\":"<<origin<<",\"anchorUtcMs\":"<<anchor<<",\"segmentId\":"<<std::quoted(segment_id)
      <<",\"mediaSha256\":"<<std::quoted(media_hash)<<",\"mediaBytes\":"<<media_size<<",\"representativePtsNs\":[";
    for(std::size_t i=0;i<expected.size();++i){if(i)json<<',';json<<expected[i];}json<<"],\"samples\":[";
    for(std::size_t i=0;i<evidence.size();++i){if(i)json<<',';const auto& sample=evidence[i];
        json<<"{\"ordinal\":"<<sample.ordinal<<",\"ptsNs\":"<<sample.original_pts_ns<<",\"dtsNs\":"<<sample.original_dts_ns
            <<",\"durationNs\":"<<sample.original_duration_ns<<",\"nativePts\":"<<sample.native_pts<<",\"nativeDts\":"<<sample.native_dts
            <<",\"observedInputPtsNs\":"<<observed.at(sample.ordinal-1).first<<",\"observedInputDtsNs\":"<<observed.at(sample.ordinal-1).second
            <<",\"vclSha256\":"<<std::quoted(sample.vcl_sha256)<<",\"sampleSha256\":"<<std::quoted(sample.sample_sha256)<<'}';}
    json<<"],\"reopenedUnchanged\":true,\"sourceEvidenceExact\":true,\"currentSourceVerified\":true,\"actualUiPass\":false}";
    std::ofstream out(manifest,std::ios::binary);Need(bool(out),"manifest-open");out<<json.str();out.close();Need(bool(out),"manifest-write");
    std::filesystem::permissions(manifest,std::filesystem::perms::owner_read|std::filesystem::perms::owner_write);
    std::cout<<"{\"status\":\"PASS\",\"sourceAuCount\":240,\"representatives\":8,\"width\":1280,\"height\":720}";return 0;
}catch(const std::exception& error){std::cerr<<"visual-ui-seed failure: "<<error.what()<<'\n';return 1;}}

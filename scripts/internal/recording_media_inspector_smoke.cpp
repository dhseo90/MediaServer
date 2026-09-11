// 파일 용도: 실제 로컬 media와 고정 FD inspector를 검사한다. decoder 보장은 검사하지 않는다.
#include "recording/recording_media_inspector.h"
#include "recording/recording_catalog.h"
#if MEDIA_SERVER_USE_GSTREAMER
#include <gst/gst.h>
#endif
#include <atomic>
#include <cerrno>
#include <thread>
#include <fcntl.h>
#include <unistd.h>
#include <sys/stat.h>
#include <fstream>
#include <iostream>
#include <iterator>
namespace fs=std::filesystem;
using namespace recording;
int passes=0, failures=0;
void Check(bool ok,const std::string& label){std::cout<<(ok?"[pass] ":"[fail] ")<<label<<'\n';ok?++passes:++failures;}
std::string Read(const fs::path& p){std::ifstream in(p,std::ios::binary);return {std::istreambuf_iterator<char>(in),{}};}
void Write(const fs::path& p,const std::string& bytes){std::ofstream out(p,std::ios::binary);out<<bytes;if(!out)throw std::runtime_error("fixture write failed");}
#if MEDIA_SERVER_USE_GSTREAMER
RecordingSegmentV1 Metadata(const fs::path& path,const std::string& id="segment-one",const std::string& container="mp4"){
    const auto bytes=Read(path);gchar* hash=g_compute_checksum_for_data(G_CHECKSUM_SHA256,reinterpret_cast<const guchar*>(bytes.data()),bytes.size());
    RecordingSegmentV1 s;s.segment_id=id;s.source_id="source-one";s.channel_id="channel-one";s.stream_epoch_id="epoch-one";
    s.start={1000,0,1,1000000000};s.end={2000,1000000000,1,1000000000};s.container=container;
    s.video_codecs={container=="mp4"?"h264":"vp8"};s.audio_omitted_reason="source-no-audio";s.size_bytes=bytes.size();s.checksum_sha256=hash?hash:"";g_free(hash);
    s.lifecycle=RecordingLifecycle::Finalized;s.created_at_ms=1000;s.finalized_at_ms=2000;return s;
}
bool Pipeline(const std::string& launch) {
    GError* error=nullptr;GstElement* p=gst_parse_launch(launch.c_str(),&error);
    if(error||!p){if(error){std::cerr<<error->message<<'\n';g_error_free(error);}if(p)gst_object_unref(p);return false;}
    bool ok=gst_element_set_state(p,GST_STATE_PLAYING)!=GST_STATE_CHANGE_FAILURE;
    GstBus* bus=gst_element_get_bus(p);GstMessage* message=ok?gst_bus_timed_pop_filtered(bus,10*GST_SECOND,static_cast<GstMessageType>(GST_MESSAGE_EOS|GST_MESSAGE_ERROR)):nullptr;
    ok=message&&GST_MESSAGE_TYPE(message)==GST_MESSAGE_EOS;
    if(message&&GST_MESSAGE_TYPE(message)==GST_MESSAGE_ERROR){gchar* debug=nullptr;gst_message_parse_error(message,&error,&debug);std::cerr<<(error?error->message:"pipeline error")<<'\n';g_clear_error(&error);g_free(debug);}
    if(message)gst_message_unref(message);
    gst_element_set_state(p,GST_STATE_NULL);gst_object_unref(bus);gst_object_unref(p);return ok;
}
void ExtraBoundaries(const fs::path& root) {
    gst_init(nullptr,nullptr);const auto mp4=root/"boundary.mp4",audio=root/"audio.mp4";
    const bool generated=Pipeline("videotestsrc num-buffers=12 ! video/x-raw,width=160,height=90,framerate=12/1 ! x264enc tune=zerolatency speed-preset=ultrafast key-int-max=12 ! h264parse ! mp4mux ! filesink location="+mp4.string());
    Check(generated,"boundary MP4 fixture generation EOS");if(!generated)return;
    auto meta=Metadata(mp4);std::string error;
    RecordingJournal journal(root/"boundary.jsonl");Check(journal.Open(&error),"boundary journal open");
    RecordingCatalog catalog(journal,{root/"boundary.db",root,false});Check(catalog.Open(&error),"boundary catalog open");
    Check(catalog.FinalizeSegment(meta,mp4.string(),&error),"boundary finalized seed");
    const auto before=Read(root/"boundary.jsonl");
    GstRegistry* registry=gst_registry_get();GstPluginFeature* factory=gst_registry_find_feature(registry,"qtdemux",GST_TYPE_ELEMENT_FACTORY);
    Check(factory!=nullptr,"qtdemux registry fixture available");
    if(factory){
        gst_registry_remove_feature(registry,factory);
        auto result=InspectAndMarkRecordingMedia(catalog,meta.segment_id);
        const bool restored=gst_registry_add_feature(registry,factory);
        Check(result.state==MediaInspectionState::Unavailable&&result.detail=="plugin-unavailable"&&!result.applied&&Read(root/"boundary.jsonl")==before,"missing demux plugin unavailable noappend");
        Check(restored,"qtdemux registry restored");
        gst_object_unref(factory);
    }
    Check(::chmod(mp4.c_str(),0000)==0,"permission fixture mode zero");
    errno=0;int probe=::open(mp4.c_str(),O_RDONLY);const bool denied=probe<0&&errno==EACCES;if(probe>=0)::close(probe);
    const auto denied_result=InspectAndMarkRecordingMedia(catalog,meta.segment_id);
    const bool restored=::chmod(mp4.c_str(),0600)==0;
    Check(denied,"permission fixture actual EACCES");
    Check(denied_result.state==MediaInspectionState::Unavailable&&!denied_result.applied&&Read(root/"boundary.jsonl")==before,"permission denied unavailable noappend");
    Check(restored,"permission mode restored");
    const bool audio_generated=Pipeline("audiotestsrc num-buffers=12 ! audioconvert ! avenc_aac ! aacparse ! mp4mux ! filesink location="+audio.string());
    Check(audio_generated,"audio-only MP4 fixture generation EOS");if(!audio_generated)return;
    const auto audio_result=InspectRecordingMedia(root,audio.filename(),Metadata(audio,"audio-one"));
    Check(audio_result.state==MediaInspectionState::Corrupt&&audio_result.detail=="expected-video-missing-or-mismatched","audio-only container cannot satisfy expected video");
}
void CatalogCases(const fs::path& root,const fs::path& mp4) {
    fs::create_directories(root);const auto media=root/"media";fs::create_directories(media);std::string error;
    RecordingJournal journal(root/"journal.jsonl");Check(journal.Open(&error),"catalog journal open");
    {
        RecordingCatalog c(journal,{root/"catalog.db",media,false});Check(c.Open(&error),"catalog open without auto inspection");
        auto seed=[&](const std::string& id,bool event=false){
            const auto p=media/(id+".mp4");fs::copy_file(mp4,p);auto s=Metadata(p,id);
            if(event)s.retention_class=RecordingRetentionClass::Event;
            Check(c.FinalizeSegment(s,p.string(),&error),id+" finalized seed");return s;
        };
        auto base=seed("healthy");const auto initial=Read(root/"journal.jsonl");
        auto result=InspectAndMarkRecordingMedia(c,base.segment_id);
        Check(result.state==MediaInspectionState::Healthy&&!result.applied&&Read(root/"journal.jsonl")==initial,"healthy catalog inspection noappend");
        result=InspectAndMarkRecordingMedia(c,base.segment_id,{std::chrono::milliseconds(0)});
        Check(result.state==MediaInspectionState::Unavailable&&!result.applied&&Read(root/"journal.jsonl")==initial,"timeout noappend");
        auto held=seed("held");Check(c.AdjustHoldCount(held.segment_id,1,&error),"held lease acquire");
        fs::resize_file(media/"held.mp4",1);const auto held_before=Read(root/"journal.jsonl");
        result=InspectAndMarkRecordingMedia(c,"held");
        Check(result.state==MediaInspectionState::Corrupt&&!result.applied&&!result.apply_error.empty()&&Read(root/"journal.jsonl")==held_before,"held observation Corrupt apply refused noappend");
        Check(c.AdjustHoldCount(held.segment_id,-1,&error),"held lease release");
        result=InspectAndMarkRecordingMedia(c,"held");
        Check(result.state==MediaInspectionState::Corrupt&&result.detail=="size-mismatch"&&result.corruption_reason=="checksum-mismatch"&&result.applied,"size corruption applied after lease release");
        Check(c.FindSegmentById("held")->lifecycle==RecordingLifecycle::Corrupt&&!c.FindSegmentMediaLocation("held"),"applied corrupt excluded media location");
        auto missing=seed("missing");fs::remove(media/"missing.mp4");result=InspectAndMarkRecordingMedia(c,missing.segment_id);
        Check(result.state==MediaInspectionState::Corrupt&&result.corruption_reason=="missing-media"&&result.applied,"missing leaf applied");
        auto derived=seed("derived",true);fs::remove(media/"derived.mp4");result=InspectAndMarkRecordingMedia(c,derived.segment_id);
        Check(result.state==MediaInspectionState::Corrupt&&result.corruption_reason=="derived-media-missing"&&result.applied,"derived missing mapping applied");
        const auto source=seed("pending-source"), output=seed("pending-output",true);
        EventRecordingLinkV1 link;link.link_id="pending-link";link.event_id="event-one";link.source_id=source.source_id;link.channel_id=source.channel_id;
        link.stream_epoch_id=source.stream_epoch_id;link.requested_range=UtcRangeV1{1000,2000};link.ordered_overlaps={{source.segment_id,{1000,2000}}};
        link.derived_segment_id=output.segment_id;link.status=EventRecordingLinkStatus::Pending;link.time_basis="utc-ms";link.created_at_ms=2000;link.updated_at_ms=2000;
        Check(c.PutEventLink(link,&error),"pending link seed");
        for(const auto& id:{"pending-source","pending-output"}) {
            fs::resize_file(media/(std::string(id)+".mp4"),1);const auto before=Read(root/"journal.jsonl");result=InspectAndMarkRecordingMedia(c,id);
            Check(result.state==MediaInspectionState::Corrupt&&!result.applied&&!result.apply_error.empty()&&Read(root/"journal.jsonl")==before,std::string(id)+" apply refused noappend");
        }
        for(const auto& id:{"deletion-pending","deleted"}) {
            const auto s=seed(id);Check(c.RequestDeletion(id,"quota",&error),std::string(id)+" deletion request");
            if(std::string(id)=="deleted") {
                RecordingTombstoneV1 t;t.tombstone_id="tombstone-one";t.segment_id=id;t.source_id=s.source_id;t.channel_id=s.channel_id;
                t.recorded_range={1000,2000};t.checksum_sha256=s.checksum_sha256;t.retention_class=s.retention_class;t.deletion_reason="quota";t.deleted_at_ms=4000;
                Check(c.CompleteDeletion(t,&error),"deleted tombstone seed");
            }
            const auto before=Read(root/"journal.jsonl");result=InspectAndMarkRecordingMedia(c,id);
            Check(result.state==MediaInspectionState::Unavailable&&!result.applied&&Read(root/"journal.jsonl")==before,std::string(id)+" inspection refused noappend");
        }
    }
    RecordingCatalog reopened(journal,{root/"catalog.db",media,false});Check(reopened.Open(&error),"catalog replay reopen");
    Check(reopened.FindSegmentById("held")->lifecycle==RecordingLifecycle::Corrupt&&reopened.FindSegmentById("missing")->lifecycle==RecordingLifecycle::Corrupt&&reopened.FindSegmentById("derived")->lifecycle==RecordingLifecycle::Corrupt,"durable corruption replay lifecycle");
}
#endif
int main(int argc,char** argv){
    if(argc<2||argc>3||(argc==3&&std::string(argv[2])!="--red"&&std::string(argv[2])!="--boundaries"))return 2;
    const fs::path root(argv[1]);const auto malformed=root/"malformed.mp4";
    Write(malformed,std::string("\0\0\0\014ftypisom",12));
#if MEDIA_SERVER_USE_GSTREAMER
    if(argc==3&&std::string(argv[2])=="--boundaries"){
        ExtraBoundaries(root);std::cout<<"[media-inspector-boundaries] pass="<<passes<<" fail="<<failures<<'\n';return failures?1:0;
    }
    const auto result=InspectRecordingMedia(root,malformed.filename(),Metadata(malformed));
    Check(result.state==MediaInspectionState::Corrupt,"malformed matching size/hash is Corrupt");
    if(argc==2){
        gst_init(nullptr,nullptr);
        const auto mp4=root/"healthy.mp4",webm=root/"healthy.webm";
        const bool mp4_ok=Pipeline("videotestsrc num-buffers=12 ! video/x-raw,width=160,height=90,framerate=12/1 ! x264enc tune=zerolatency speed-preset=ultrafast key-int-max=12 ! h264parse ! mp4mux ! filesink location="+mp4.string());
        Check(mp4_ok,"real MP4 fixture generation EOS");if(!mp4_ok)return 1;
        const bool webm_ok=Pipeline("videotestsrc num-buffers=12 ! video/x-raw,width=160,height=90,framerate=12/1 ! vp8enc deadline=1 ! webmmux ! filesink location="+webm.string());
        Check(webm_ok,"real WebM fixture generation EOS");if(!webm_ok)return 1;
        auto mp4_meta=Metadata(mp4),webm_meta=Metadata(webm,"webm-one","webm");
        Check(InspectRecordingMedia(root,mp4.filename(),mp4_meta).state==MediaInspectionState::Healthy,"MP4 expected H264 pad buffers EOS healthy");
        Check(InspectRecordingMedia(root,webm.filename(),webm_meta).state==MediaInspectionState::Healthy,"WebM expected VP8 pad buffers EOS healthy");
        auto mismatch=webm_meta;mismatch.container="mp4";mismatch.video_codecs={"h264"};
        Check(InspectRecordingMedia(root,webm.filename(),mismatch).state!=MediaInspectionState::Healthy,"container metadata mismatch never healthy");
        const auto altered=root/"altered.mp4";fs::copy_file(mp4,altered);auto bytes=Read(altered);bytes.back()^=1;Write(altered,bytes);
        auto bad=InspectRecordingMedia(root,altered.filename(),mp4_meta);
        Check(bad.state==MediaInspectionState::Corrupt&&bad.corruption_reason=="checksum-mismatch","same size changed bytes checksum mismatch");
        fs::create_symlink(mp4,root/"symlink.mp4");fs::create_hard_link(mp4,root/"hardlink.mp4");
        for(const auto& name:{"symlink.mp4","hardlink.mp4"})Check(InspectRecordingMedia(root,name,mp4_meta).state==MediaInspectionState::Unavailable,std::string(name)+" unavailable");
        fs::remove(root/"hardlink.mp4");
        fs::create_directory_symlink(root,root/"linked-parent");
        Check(InspectRecordingMedia(root,"linked-parent/healthy.mp4",mp4_meta).state==MediaInspectionState::Unavailable,"parent symlink unavailable");
        Check(InspectRecordingMedia(root/"linked-parent",mp4.filename(),mp4_meta).state==MediaInspectionState::Unavailable,"root symlink unavailable");
        Check(InspectRecordingMedia(root,"../healthy.mp4",mp4_meta).state==MediaInspectionState::Unavailable,"relative escape unavailable");
        Check(InspectRecordingMedia(root,mp4,mp4_meta).state==MediaInspectionState::Unavailable,"absolute relative path unavailable");
        Check(::mkfifo((root/"fifo.mp4").c_str(),0600)==0,"FIFO fixture create");
        Check(InspectRecordingMedia(root,"fifo.mp4",mp4_meta).state==MediaInspectionState::Unavailable,"nonregular FIFO unavailable without blocking");
        Check(InspectRecordingMedia(root/"absent-root","file.mp4",mp4_meta).state==MediaInspectionState::Unavailable,"missing root unavailable");
        Check(InspectRecordingMedia(root,"absent-parent/file.mp4",mp4_meta).state==MediaInspectionState::Unavailable,"missing parent unavailable");
        Check(InspectRecordingMedia(root,"absent.mp4",mp4_meta).corruption_reason=="missing-media","safe existing parent missing leaf confirmed");
        for(int variant=0;variant<3;++variant){auto meta=mp4_meta;if(variant==0)meta.container="avi";if(variant==1)meta.video_codecs={"unknown"};if(variant==2)meta.checksum_sha256="bad";
            Check(InspectRecordingMedia(root,mp4.filename(),meta).state==MediaInspectionState::Unavailable,"unsupported metadata variant "+std::to_string(variant));}
        Check(InspectRecordingMedia(root,mp4.filename(),mp4_meta,{std::chrono::milliseconds::max()}).state==MediaInspectionState::Unavailable,"overflow budget unavailable");
        const auto changing=root/"changing.mp4";Write(changing,std::string(32*1024*1024,'x'));auto changing_meta=Metadata(changing);
        std::atomic<bool> stop{false},ready{false};std::atomic<unsigned> writes{0};
        std::thread writer([&]{int fd=::open(changing.c_str(),O_WRONLY);if(fd<0){ready=true;return;}char value='a';while(!stop){value=value=='a'?'b':'a';if(::pwrite(fd,&value,1,0)==1)++writes;ready=true;}::close(fd);});
        while(!ready)std::this_thread::yield();
        const auto changed=InspectRecordingMedia(root,changing.filename(),changing_meta);stop=true;writer.join();
        Check(writes>0&&changed.state==MediaInspectionState::Unavailable&&changed.detail=="file-changed","concurrent real file writes detected unavailable");
        CatalogCases(root/"catalog",mp4);
    }
#else
    Check(InspectRecordingMedia(root,malformed.filename(),RecordingSegmentV1{}).state==MediaInspectionState::Unavailable,"no GStreamer build never healthy");
#endif
    std::cout<<"[media-inspector] pass="<<passes<<" fail="<<failures<<'\n';return failures?1:0;
}

// 파일 용도: 격리 UI 준비에 실제 managed 원본·파생 job·공개 projection을 만든다. UI PASS가 아니다.
#define Store LegacyFixtureStore
#include "recording_media_test_fixture.h"
#undef Store
#include "recording/recording_runtime_composition.h"
#include "recording/recording_derived_job_service.h"
#include "recording/recording_derived_selection.h"
#include "ingress/recording_application_service.h"
#include <openssl/evp.h>
#include <fcntl.h>
#include <unistd.h>
#include <fstream>
#include <chrono>
#include <iomanip>
#include <set>
#include <sstream>

namespace {
void Require(bool ok,const char* code){if(!ok)throw std::runtime_error(code);}
struct Store {
    std::filesystem::path root;
    std::unique_ptr<recording::RecordingRuntimeStorage> runtime;
    recording::RecordingJournal& journal;
    recording::RecordingCatalog& catalog;
    static std::unique_ptr<recording::RecordingRuntimeStorage> Open(const std::filesystem::path& path){
        auto result=std::make_unique<recording::RecordingRuntimeStorage>(path);std::string error;
        Require(result->Open(&error),"runtime-open");return result;
    }
    explicit Store(std::filesystem::path path):root(std::move(path)),runtime(Open(root)),journal(runtime->journal()),catalog(runtime->catalog()){}
    std::vector<recording::RecordingSegmentV2> Segments(){
        recording::RecordingLocationCatalogSnapshot result;std::string error;
        Require(catalog.SnapshotLocationsV2("1",&result,&error),"current-segments");
        std::sort(result.segments.begin(),result.segments.end(),[](const auto& a,const auto& b){return a.order_sequence<b.order_sequence;});
        return result.segments;
    }
};
std::string Hash(const std::filesystem::path& file){
    std::ifstream in(file,std::ios::binary);auto* raw=EVP_MD_CTX_new();
    std::unique_ptr<EVP_MD_CTX,decltype(&EVP_MD_CTX_free)> ctx(raw,EVP_MD_CTX_free);
    Require(bool(in)&&raw&&EVP_DigestInit_ex(raw,EVP_sha256(),nullptr)==1,"hash-open");
    char bytes[65536];while(in){in.read(bytes,sizeof(bytes));if(in.gcount())Require(EVP_DigestUpdate(raw,bytes,in.gcount())==1,"hash-update");}
    unsigned char digest[EVP_MAX_MD_SIZE];unsigned length=0;
    Require(in.eof()&&EVP_DigestFinal_ex(raw,digest,&length)==1,"hash-final");
    std::ostringstream out;for(unsigned i=0;i<length;++i)out<<std::hex<<std::setfill('0')<<std::setw(2)<<unsigned(digest[i]);return out.str();
}
std::map<std::string,std::string> Persistent(const std::filesystem::path& root){
    std::map<std::string,std::string> result;
    for(const auto& entry:std::filesystem::directory_iterator(root)){
        const auto name=entry.path().filename().string();
        const bool component=name==".recording-store-format"||name=="recording-generation.json"||name=="recording-v2-mutations.jsonl"||
            ((name.rfind("snapshot-",0)==0||name.rfind("identity-",0)==0||name.rfind("evidence-",0)==0||name.rfind("active-",0)==0)&&entry.path().extension()==".jsonl");
        if(component){Require(entry.is_regular_file()&&!entry.is_symlink()&&std::filesystem::hard_link_count(entry.path())==1,"persistent-file");result.emplace(name,Hash(entry.path()));}
    }
    Require(result.count("recording-generation.json")&&result.count(".recording-store-format"),"persistent-generation");
    Require(!std::filesystem::exists(root/".recording-generation-transaction.json")&&!std::filesystem::exists(root/".recording-generation-transaction.stage"),"persistent-transaction-pending");
    return result;
}
Encoded ReadSeek(const std::filesystem::path& file){
    Require(std::filesystem::is_regular_file(file)&&!std::filesystem::is_symlink(file)&&std::filesystem::file_size(file)<=16*1024*1024,"seek-input");
    gchar* escaped=g_strescape(file.c_str(),nullptr);const std::string location=escaped;g_free(escaped);
    Pipeline pipe("filesrc location=\""+location+"\" ! qtdemux ! h264parse ! video/x-h264,stream-format=byte-stream,alignment=au ! appsink name=out sync=false");
    Encoded result;GstClockTime origin=0;std::size_t bytes=0;
    for(std::size_t i=0;;++i){
        GstSample* sample=gst_app_sink_try_pull_sample(GST_APP_SINK(pipe.sink),3*GST_SECOND);
        if(!sample){Require(gst_app_sink_is_eos(GST_APP_SINK(pipe.sink)),"seek-sample-timeout");break;}
        std::unique_ptr<GstSample,decltype(&gst_sample_unref)> guard(sample,gst_sample_unref);
        GstBuffer* buffer=gst_sample_get_buffer(sample);
        Require(i<600&&GST_BUFFER_PTS_IS_VALID(buffer)&&GST_BUFFER_DTS_IS_VALID(buffer)&&GST_BUFFER_DURATION_IS_VALID(buffer),"seek-timestamps");
        if(!i)origin=std::min(GST_BUFFER_PTS(buffer),GST_BUFFER_DTS(buffer));
        Require(GST_BUFFER_PTS(buffer)>=origin&&GST_BUFFER_DTS(buffer)>=origin,"seek-origin");
        media::Packet packet;packet.kind=media::MediaKind::Video;packet.codec=media::CodecId::H264;packet.track_id="video-0";
        packet.is_key_frame=!GST_BUFFER_FLAG_IS_SET(buffer,GST_BUFFER_FLAG_DELTA_UNIT);
        packet.pts=GST_BUFFER_PTS(buffer)-origin;packet.dts=GST_BUFFER_DTS(buffer)-origin;
        bytes+=gst_buffer_get_size(buffer);Require(bytes<=16*1024*1024,"seek-size");packet.payload.resize(gst_buffer_get_size(buffer));
        gst_buffer_extract(buffer,0,packet.payload.data(),packet.payload.size());
        media::SampleObservation observation;observation.source_generation="ui-seek-generation";observation.generation_order=4;
        observation.ordinal=i+1;observation.pts_ns=packet.pts;observation.dts_ns=packet.dts;observation.duration_ns=GST_BUFFER_DURATION(buffer);
        packet.observation=observation;
        if(result.descriptor.tracks.empty()){gchar* caps=gst_caps_to_string(gst_sample_get_caps(sample));
            result.descriptor.tracks.push_back({"video-0",media::MediaKind::Video,media::CodecId::H264,"h264",caps,0,0});g_free(caps);}
        result.packets.push_back(std::move(packet));
    }
    Require(!result.packets.empty()&&result.packets.front().is_key_frame,"seek-first-keyframe");
    const auto end=result.packets.back().pts+*result.packets.back().observation->duration_ns;
    Require(end>=9950000000LL&&end<=10100000000LL,"seek-duration");return result;
}
void Clock(Encoded& input,std::optional<std::int64_t> anchor,const std::string& generation,bool jump=false){
    for(std::size_t i=0;i<input.packets.size();++i){auto& p=input.packets[i];auto& o=*p.observation;
        o.source_generation=generation;o.clock_process_id=anchor?"ui-fixture-clock":"";
        o.mono_before_ns=1000000000LL+p.pts;o.mono_after_ns=o.mono_before_ns+1000;
        o.observed_utc_ns=anchor?*anchor*1000000+p.pts+(jump&&i>=15?2000000000LL:0):0;
    }
}
std::vector<recording::RecordingSegmentV2> Write(Store& store,const Encoded& input,int interval){
    std::set<std::string> before;for(const auto& segment:store.Segments())before.insert(segment.segment_id);
    recording::GStreamerSegmentWriter::Options options(store.root,interval);options.managed_journal=&store.journal;
    options.managed_catalog=&store.catalog;options.managed_store_id=store.journal.ManagedStoreId();
    recording::GStreamerSegmentWriter writer(options);std::string error;
    Require(writer.Start("1","unused",input.descriptor,[](auto,auto,auto*){return false;},&error),"writer-start");
    for(const auto& packet:input.packets)writer.Push(packet,0);writer.Stop();
    std::vector<recording::RecordingSegmentV2> result;for(const auto& segment:store.Segments())if(!before.count(segment.segment_id))result.push_back(segment);
    Require(!result.empty(),"writer-empty");return result;
}
struct Job {std::string name,id;std::vector<recording::RecordingSegmentV2> outputs;};
Job Derive(Store& store,const Encoded& input,const std::vector<recording::RecordingSegmentV2>& originals,const std::string& name,bool partial,std::int64_t now_ms){
    std::vector<recording::DerivedSourceEvidence> sources;for(const auto& s:originals)sources.push_back({s,store.catalog.FindSourceBinding(s.segment_id),false});
    analysis::DecodedIntervalCollector collector;
    for(const auto& p:input.packets){analysis::DecodedIntervalEvidence e;e.analysis_pts_ns=p.pts;e.duration_ns=p.observation->duration_ns;
        e.association={analysis::SourceAssociationQuality::TimestampMatch,analysis::OriginalSampleIdentity{p.observation->source_generation,p.observation->generation_order,p.observation->ordinal,p.track_id,*p.observation->pts_ns}};collector.Append(std::move(e));}
    recording::RecordingConsumerReferenceV1 ref;ref.reference_id="ui-"+name+"-reference";ref.kind="event";ref.owner_id="ui-"+name+"-event";
    ref.source_id="1";ref.channel_id="1";ref.analysis_namespace="ui-"+name+"-analysis";ref.analysis_track_id="track-1";
    ref.association_quality="timestamp-match";ref.original=recording::RecordingConsumerOriginalV1{input.packets.front().observation->source_generation,1,1,"video-0",7000000000ULL};
    ref.request=recording::RecordingConsumerRequestV1{"media-pts-ms",partial?6500:7000,8500,0,0};
    std::string error;recording::DerivedRecordingSelection selection;recording::DerivedJobIntentV1 intent;
    Require(recording::SelectDerivedRecording(ref,*collector.Snapshot(ref.analysis_namespace),sources,nullptr,&selection,&error)&&
        recording::BuildDerivedJobIntent(selection,sources,8*1024*1024,now_ms,&intent,&error),"job-selection");
    recording::RetentionCoordinator retention(store.catalog,[&]{return store.catalog.RetentionSnapshot();},[](auto* bytes,auto*){*bytes=1024ULL*1024*1024;return true;},[](const auto&,auto*){return false;},{0,1,store.root});
    Require(retention.UpdateChannelPolicy("1",{1024ULL*1024*1024,0,1024ULL*1024*1024,0},&error)&&retention.AdmitDerivedJob(store.catalog,intent,now_ms).accepted,"job-admission");
    recording::DerivedJobService service(store.catalog,store.journal,{store.root,30000,{}});const auto done=service.Run(intent.job_id);
    Require(done.complete&&done.job&&done.job->ready&&done.job->ready->outputs.size()==2,"job-complete-two");
    Job result{name,intent.job_id,{}};for(const auto& output:done.job->ready->outputs)result.outputs.push_back(output.segment);
    if(name=="full"){auto pending=ref;pending.reference_id="ui-accepted-only";pending.owner_id="ui-incomplete-event";
        Require(store.catalog.PutConsumerReference(pending,&error)&&store.catalog.AcceptDerivedReference(pending,&error),"accepted-only");}
    return result;
}
void FileJson(std::ostream& out,Store& store,const recording::RecordingSegmentV2& s){
    const auto location=store.catalog.FindSegmentMediaLocation(s.segment_id);Require(location&&location->first==store.root,"manifest-location");
    out<<"{\"id\":"<<std::quoted(s.segment_id)<<",\"relativePath\":"<<std::quoted(location->second.string())
        <<",\"sizeBytes\":"<<s.size_bytes<<",\"sha256\":"<<std::quoted(s.checksum_sha256)
        <<",\"contentType\":"<<std::quoted(s.container=="mpegts"?"video/mp2t":"video/mp4")<<"}";
}
std::string Snapshot(Store& store,std::int64_t begin,std::int64_t end){
    recording::RecordingReadService reader(store.catalog);ingress::RecordingApplicationService app(reader,store.catalog,true,{});
    std::ostringstream pages;pages<<'[';std::size_t total=1;
    for(std::size_t offset=0;offset<total;offset+=100){
        recording::RecordingTimelineResult result;std::string error;
        Require(reader.QueryTimeline({"1",begin,end,offset,100},&result,&error),"timeline-query");
        total=std::max(result.total,result.unplaced_total);Require(total<4096,"timeline-cap");
        const auto response=app.Timeline({{"channelId","1"},{"startTimeMs",std::to_string(begin)},{"endTimeMs",std::to_string(end)},{"offset",std::to_string(offset)},{"limit","100"}},[](const auto&){return true;});
        Require(response.status==200,"public-timeline");if(offset)pages<<',';pages<<response.body;
    }
    pages<<']';return pages.str();
}
}
int main(int argc,char** argv){
    if(argc!=5)return 2;gst_init(nullptr,nullptr);
    try{
        const std::filesystem::path root(argv[1]),manifest(argv[2]);const auto parent=std::filesystem::canonical(root.parent_path());const auto name=parent.filename().string();
        Require(root.filename()=="recordings"&&root.parent_path()==parent&&manifest.parent_path()==parent&&
            (name.rfind("media-server-v410-s06-",0)==0||name.rfind("media-server-current-ui-seed.",0)==0)&&
            !std::filesystem::is_symlink(root)&&(!std::filesystem::exists(root)||(std::filesystem::is_directory(root)&&std::filesystem::is_empty(root)))&&
            !std::filesystem::exists(manifest)&&!std::filesystem::is_symlink(manifest),"seed-owned-root");
        std::optional<std::int64_t> anchor;const std::string argument(argv[3]);
        if(argument!="unknown"){Require(!argument.empty()&&argument.find_first_not_of("0123456789")==std::string::npos,"anchor-format");anchor=std::stoll(argument);Require(*anchor>=946684800000LL&&*anchor<=4102444800000LL,"anchor-bounds");}
        const std::filesystem::path seek(argv[4]);
        if(seek!="none")Require(anchor&&seek==parent/"input/seek-event.mp4"&&std::filesystem::canonical(seek)==seek,"seek-owned-input");
        // 운영 mutation 시각은 명시 anchor 또는 실제 실행 시각이다. 이를 unknown 영상 UTC로 사용하지 않는다.
        const auto now_ms=anchor.value_or(std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count());
        const auto begin=now_ms,end=now_ms+30000;
        std::string snapshot,files,jobs,seek_json="null";std::map<std::string,std::string> persistent;
        {
            Store store(root);auto input=Encode(30,false,false);Clock(input,anchor,"ui-main-generation");Shift(input,7000000000ULL);
            const auto originals=Write(store,input,1000);Require(originals.size()>=2,"original-count");
            std::vector<Job> derived;for(const auto& kind:{"full","partial","corrupt","deleted"})derived.push_back(Derive(store,input,originals,kind,std::string(kind)=="partial",now_ms));
            auto unknown=Encode(30,false,false);Clock(unknown,std::nullopt,"ui-unknown-generation");Write(store,unknown,30000);
            auto discontinuous=Encode(30,false,false);Clock(discontinuous,anchor,"ui-discontinuous-generation",true);Write(store,discontinuous,30000);
            // 동일한 실제 파일을 복제하되 시간/매체 범위를 변경하지 않는다. 페이지용 독립 파일이다.
            for(int i=0;i<101;++i){auto s=originals.front();const auto old=*store.catalog.FindSegmentMediaLocation(s.segment_id);
                s.segment_id="ui-page-"+std::to_string(i);s.order_request_id=s.segment_id+"-order";s.media_epoch_id=s.segment_id+"-epoch";
                recording::RecordingOrderReservationV1 order;std::string error;
                Require(store.catalog.ReserveRecordingOrder(s.store_id,s.order_request_id,s.segment_id,"1",&order,&error),"page-order");s.order_sequence=order.sequence;
                const auto file=root/"1"/(s.segment_id+".mp4");std::filesystem::copy_file(old.first/old.second,file);
                Require(store.catalog.FinalizeSegmentV2(s,file.string(),&error),"page-finalize");
            }
            if(seek!="none"){auto media=ReadSeek(seek);Clock(media,anchor,"ui-seek-generation");const auto written=Write(store,media,30000);
                Require(written.size()==1&&written.front().container=="mp4","seek-single-mp4");std::ostringstream out;FileJson(out,store,written.front());seek_json=out.str();}
            std::ostringstream file_out;FileJson(file_out,store,originals.front());files=file_out.str();
            std::ostringstream job_out;job_out<<'[';
            recording::RecordingReadService reader(store.catalog);
            for(std::size_t i=0;i<derived.size();++i){if(i)job_out<<',';const auto& job=derived[i];job_out<<"{\"name\":"<<std::quoted(job.name)<<",\"jobId\":"<<std::quoted(job.id)<<",\"outputs\":[";
                for(std::size_t n=0;n<job.outputs.size();++n){if(n)job_out<<',';FileJson(job_out,store,job.outputs[n]);Require(bool(reader.ResolveMedia("1",job.outputs[n].segment_id)),"healthy-job-media");}job_out<<"]}";}job_out<<']';jobs=job_out.str();
            const auto corrupt=*store.catalog.FindSegmentMediaLocation(derived[2].outputs.front().segment_id);
            {std::fstream file(corrupt.first/corrupt.second,std::ios::in|std::ios::out|std::ios::binary);char c=0;file.read(&c,1);c^=1;file.seekp(0);file.write(&c,1);file.flush();Require(bool(file),"corrupt-fixture");}
            std::string error;
            Require(store.catalog.MarkSegmentCorrupt(derived[2].outputs.front().segment_id,"checksum-mismatch",&error),"corrupt-catalog-state");
            recording::RecordingTombstoneV2 tomb;tomb.tombstone_id="ui-deleted-output";tomb.segment=derived[3].outputs.front();tomb.deletion_reason="event-capacity";tomb.deleted_at_ms=now_ms;
            const auto deleted=*store.catalog.FindSegmentMediaLocation(tomb.segment.segment_id);
            Require(store.catalog.RequestDeletion(tomb.segment.segment_id,tomb.deletion_reason,&error)&&std::filesystem::remove(deleted.first/deleted.second)&&store.catalog.CompleteDeletionV2(tomb,&error),"deleted-fixture");
            Require(!reader.ResolveMedia("1",tomb.segment.segment_id)&&!reader.ResolveMedia("1",derived[2].outputs.front().segment_id),"unavailable-media");
            Require(std::filesystem::exists(root/"recording-generation.json"),"b06-seed-generation-required");
            snapshot=Snapshot(store,begin,end);persistent=Persistent(root);
        }
        {Store reopened(root);Require(Snapshot(reopened,begin,end)==snapshot&&Persistent(root)==persistent,"reopen-unchanged");}
        std::ostringstream json;json<<"{\"schema\":\"recording-current-ui-fixture.v1\",\"channelId\":\"1\",\"anchorUtcMs\":";
        if(anchor)json<<std::quoted(std::to_string(*anchor));else json<<"null";
        json<<",\"startTimeMs\":"<<std::quoted(std::to_string(begin))<<",\"endTimeMs\":"<<std::quoted(std::to_string(end))
            <<",\"original\":"<<files<<",\"jobs\":"<<jobs<<",\"seek\":"<<seek_json<<",\"pages\":"<<snapshot<<",\"reopenedUnchanged\":true,\"actualUiPass\":false}";
        const auto text=json.str();Require(text.size()<4*1024*1024,"manifest-cap");
        const int fd=::open(manifest.c_str(),O_WRONLY|O_CREAT|O_EXCL|O_NOFOLLOW,0600);Require(fd>=0,"manifest-create");
        const auto wrote=::write(fd,text.data(),text.size());const int synced=::fsync(fd);::close(fd);Require(wrote==static_cast<ssize_t>(text.size())&&!synced,"manifest-write");
        std::cout<<"PASS: LP26-U06-A managed Catalog reopen public timeline and persistent generation unchanged\n";
        std::cout<<"PASS: B06-V02 actual Runtime B seed and fresh reopen preserve authoritative files\n";return 0;
    }catch(const std::exception& error){const std::string code(error.what());
        std::cerr<<"FAIL: current UI seed "<<(code.find_first_not_of("abcdefghijklmnopqrstuvwxyz-0123456789")==std::string::npos?code:"preparation-private-diagnostic-suppressed")<<'\n';return 1;}
}

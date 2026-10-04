// 파일 용도: 실제 snapshot dispatcher→manifest→현재 V2 원본 pixel 검증→JPEG embedding.
#include "recording_media_test_fixture.h"
#include "recording/recording_visual_source.h"
#include "recording/visual_frame_decoder.h"
#include "recording/recording_file_evidence.h"
#include "recording/recording_runtime_composition.h"
#include "analysis/event_storage.h"
#include "analysis/event_snapshot_proof.h"
#include "domain/strict_json.h"
#include "ingress/visual_search_application_service.h"
#include <thread>
#include <fstream>
#include <cmath>
#include <sys/resource.h>
namespace {
unsigned checks=0;void Check(bool b,const std::string& name){++checks;if(!b)throw std::runtime_error(name);}
std::string Read(const std::filesystem::path& p){std::ifstream in(p,std::ios::binary);return {std::istreambuf_iterator<char>(in),{}};}
void Write(const std::filesystem::path& p,const std::string& s){std::ofstream f(p,std::ios::binary|std::ios::trunc);f<<s;f.close();Check(bool(f),"owned fixture write");}
struct Drain {~Drain(){analysis::StopEventStorage();}};
}
int main(int argc,char** argv){try{
    if(argc!=3)return 2;const auto root=std::filesystem::weakly_canonical(argv[1]);
    const auto snapshots=root/"snapshots";std::filesystem::create_directories(snapshots);
    for(const auto& item:std::vector<std::pair<std::string,std::string>>{
        {"MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_ENABLED","1"},{"MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_PATH",(root/"events.jsonl").string()},
        {"MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_HOOK_ENABLED","1"},{"MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_DIR",snapshots.string()},
        {"MEDIA_SERVER_ANALYSIS_EVENT_CLIP_HOOK_ENABLED","0"},{"MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED","0"},
        {"MEDIA_SERVER_ANALYSIS_EVENT_CLIP_DIR",(root/"clips").string()}})Check(setenv(item.first.c_str(),item.second.c_str(),1)==0,"isolated config");
    gst_init(nullptr,nullptr);recording::RecordingRuntimeStorage runtime(root/"recordings");std::string error;Check(runtime.Open(&error),"storage open");
    auto input=Encode(90,false,false,160,90,30,30);Shift(input,7000000000ULL);
    recording::GStreamerSegmentWriter writer(runtime.WriterOptions(1000));
    Check(writer.Start("snapshot-channel","unused",input.descriptor,[](auto,auto,auto*){return false;},&error),"writer start");
    for(const auto& packet:input.packets)writer.Push(packet,0);writer.Stop();
    recording::RecordingReadService reader(runtime.catalog());recording::RecordingVisualSource source(runtime.catalog(),reader,snapshots.string());
    std::vector<recording::VisualSearchDocument> representatives;std::map<std::string,recording::VisualSourceCoverage> coverage;
    Check(source.Collect({"snapshot-channel"},1,&representatives,&coverage,&error)&&representatives.size()==3,"actual representatives");
    const auto reference=representatives.front();recording::SearchSeekTarget seek;std::unique_ptr<recording::ResolvedRecordingMedia> media;
    Check(source.Resolve(reference,&seek,&media,&error),"current original protection");recording::VisualRgbFrame decoded;
    Check(recording::DecodeVisualFrame(media->fd(),media->size_bytes(),std::llround(seek.seconds*1e9),&decoded,&error),"original decoded");
    const auto binding=*runtime.catalog().FindSourceBinding(reference.segment_id);const auto& sample=binding.file_evidence->samples.front();
    recording::SearchSeekTarget untouched;untouched.seconds=42;std::unique_ptr<recording::ResolvedRecordingMedia> none;
    Check(!source.Resolve(reference,&untouched,&none,&error,{},std::chrono::steady_clock::now()-std::chrono::seconds(1))&&
        error=="visual-cancelled"&&untouched.seconds==42&&!none,"expired request preserves output and does no media work");
    unsigned cancel_checks=0;
    Check(!recording::VerifyRecordingFileEvidenceFd(media->fd(),binding,&error,[&]{return ++cancel_checks>=3;})&&
        error=="file-evidence-cancelled"&&cancel_checks>=3,"cancellation observed during native evidence read");
    Check(recording::VerifyRecordingFileEvidenceFd(media->fd(),binding,&error),"cancellation leaves healthy evidence reusable");
    recording::MediaInspectionOptions expired_options;expired_options.deadline=std::chrono::steady_clock::now()-std::chrono::seconds(1);
    Check(!reader.ResolveMedia(reference.channel_id,reference.segment_id,expired_options),"expired media reader rejects before inspection");
    analysis::RawVideoFrame frame;frame.source_key="snapshot-channel";frame.track_id=binding.track_id;frame.pts=sample.original_pts_ns;
    frame.width=decoded.width;frame.height=decoded.height;frame.format=analysis::PixelFormat::RGB;frame.data=decoded.rgb;
    frame.source_association={analysis::SourceAssociationQuality::TimestampMatch,analysis::OriginalSampleIdentity{
        binding.source_generation,binding.generation_order,sample.ordinal,binding.track_id,std::uint64_t(sample.original_pts_ns)}};
    analysis::RecordEventFrame("snapshot-channel","snapshot-channel",frame);
    analysis::AnalysisResult result;result.source_key="snapshot-channel";result.context.event_time_basis="media-pts-ms";
    result.context.event_stream_epoch_id="analysis-epoch";result.pts=frame.pts+100000000;
    result.source_association=frame.source_association;result.source_association.original->pts_ns=std::uint64_t(result.pts);
    result.source_association.original->ordinal+=3;
    auto reconnected=frame;reconnected.source_association.original->source_generation="other-generation";
    ++reconnected.source_association.original->generation_order;reconnected.data.assign(frame.data.size(),255);
    analysis::RecordEventFrame("snapshot-channel","snapshot-channel",reconnected);
    analysis::AnalysisEvent event;event.event_id="snapshot-event";event.event_type="line-crossing";event.status="ended";
    event.start_time_ms=frame.pts/1000000;event.update_time_ms=event.end_time_ms=event.start_time_ms+100;
    Drain drain;analysis::DispatchEventRecords(result,{event});analysis::StopEventStorage();
    const auto storage=analysis::GetEventStorageSnapshot();Check(storage.stored_count==1&&storage.snapshot_hook_failed_count==0,"actual snapshot dispatcher: "+storage.last_snapshot_error);
    {
        const auto event_file=root/"events.jsonl";const auto saved=Read(event_file);
        analysis::EventRecordQueryOptions options;options.search_facts_only=true;options.include_archives=true;
        analysis::EventRecordQueryResult records;unsigned polls=0;
        options.cancelled=[] {return true;};
        Check(!analysis::QueryEventRecords(options,&records,&error)&&error=="event-query-cancelled","event facts pre-cancel");
        std::string history;for(int n=0;n<100;++n)history+=saved;Write(event_file,history);
        options.event_id="nonmatching-event";options.cancelled=[&]{return ++polls>=10;};
        Check(!analysis::QueryEventRecords(options,&records,&error)&&error=="event-query-cancelled"&&records.search_facts.empty(),"nonmatching event rows observe cancellation");
        Write(event_file,std::string(2*1024*1024,'x'));polls=0;
        options.cancelled=[&]{return ++polls>=350;};
        Check(!analysis::QueryEventRecords(options,&records,&error)&&error=="event-query-cancelled","oversized unterminated event row skip observes cancellation after 1MiB");
        Write(event_file,saved);options.event_id.clear();options.cancelled={};
        Check(analysis::QueryEventRecords(options,&records,&error)&&records.search_facts.size()==1,"normal event facts after cancellation");
    }
    const auto manifest=snapshots/"snapshot-event.snapshot.json";const auto original_manifest=Read(manifest);
    ingress::StrictJsonObjectDocument parsed;Check(ingress::ParseStrictJsonObjectDocument(original_manifest,&parsed,&error),"producer manifest JSON");
    analysis::EventSnapshotProof proof;const auto json=ingress::StrictJsonObjectField(parsed,"originalFrameProof");
    Check(json&&analysis::ParseEventSnapshotProof(*json,&proof)&&proof.original.pts_ns==std::uint64_t(frame.pts),"selected frame ns not event ms");
    Check(proof.rgb_sha256==analysis::SnapshotRgbSha256(frame)&&proof.event_epoch=="analysis-epoch",
        "queued old event selects old generation despite later equal PTS reconnect frame");
    std::vector<recording::VisualSearchDocument> docs;
    Check(source.CollectSnapshots({{"snapshot-event","snapshot-channel","analysis-epoch"},{"missing-event","snapshot-channel","analysis-epoch"}},&docs,&coverage,&error)&&docs.size()==1&&coverage.at("snapshot-channel").unsupported_snapshots==1,"current snapshot and missing proof coverage: "+error);
    Check(docs.front().event_id==event.event_id&&docs.front().media_pts==frame.pts&&docs.front().frame_sha256==sample.sample_sha256,"snapshot exact source identity");
    Check(source.Resolve(docs.front(),&seek,&media,&error),"snapshot current replay");
    Check(source.SnapshotMatchesEvent(docs.front(),"analysis-epoch")&&!source.SnapshotMatchesEvent(docs.front(),"different-epoch")&&
        !source.SnapshotMatchesEvent(docs.front(),""),"current event epoch must match producer binding");
    {analysis::Siglip2Encoder encoder(argv[2]);Check(source.Encode(&docs.front(),encoder,&error),"snapshot JPEG embedding: "+error);
    double norm=0;for(float x:docs.front().embedding){Check(std::isfinite(x),"finite snapshot embedding");norm+=double(x)*x;}
    Check(docs.front().embedding.size()==768&&std::abs(norm-1)<1e-5,"snapshot actual model norm");
    auto changed=original_manifest;const auto at=changed.find(proof.rgb_sha256);Check(at!=std::string::npos,"proof replacement fixture");changed.replace(at,64,std::string(64,'f'));Write(manifest,changed);
    Check(!source.Resolve(docs.front(),&seek,&media,&error),"changed proof rejects cached document");
    std::vector<recording::VisualSearchDocument> altered;Check(source.CollectSnapshots({{"snapshot-event","snapshot-channel","analysis-epoch"}},&altered,&coverage,&error)&&altered.size()==1,"new malformed pixel candidate distinct");
    Check(!source.Encode(&altered.front(),encoder,&error)&&error=="visual-snapshot-pixels-mismatch","wrong selected pixels never embedded");
    Write(manifest,original_manifest);}
    const auto jpg=snapshots/"snapshot-event.snapshot.jpg";const auto original_image=Read(jpg);Write(jpg,"changed");
    Check(!source.Resolve(docs.front(),&seek,&media,&error),"changed image hash denied");
    const auto preserved_docs=docs;const auto preserved_count=coverage.at("snapshot-channel").examined_snapshots;
    Check(!source.CollectSnapshots({{"snapshot-event","snapshot-channel","analysis-epoch"}},&docs,&coverage,&error)&&
        error=="visual-snapshot-integrity-failed"&&docs.size()==preserved_docs.size()&&docs.front().id==preserved_docs.front().id&&
        coverage.at("snapshot-channel").examined_snapshots==preserved_count,"corrupt JPEG fails collection without publishing partial docs or coverage");
    Write(jpg,original_image);
    Write(manifest,"{malformed");
    Check(!source.CollectSnapshots({{"snapshot-event","snapshot-channel","analysis-epoch"}},&docs,&coverage,&error)&&
        error=="visual-snapshot-invalid-proof"&&docs.size()==preserved_docs.size(),"malformed manifest fails collection");
    Write(manifest,original_manifest);
    std::filesystem::rename(jpg,snapshots/"owned-cleanup-image.jpg");
    std::vector<recording::VisualSearchDocument> after_cleanup;auto cleanup_coverage=coverage;
    Check(source.CollectSnapshots({{"snapshot-event","snapshot-channel","analysis-epoch"}},&after_cleanup,&cleanup_coverage,&error)&&
        after_cleanup.empty()&&cleanup_coverage.at("snapshot-channel").unsupported_snapshots==coverage.at("snapshot-channel").unsupported_snapshots+1,
        "normal image-only cleanup is explicitly excluded");
    Check(!source.Resolve(docs.front(),&seek,&media,&error),"cleaned image cannot resolve a cached snapshot");
    std::filesystem::rename(snapshots/"owned-cleanup-image.jpg",jpg);
    std::filesystem::rename(jpg,snapshots/"owned-image.jpg");std::filesystem::create_symlink(snapshots/"owned-image.jpg",jpg);
    Check(!source.Resolve(docs.front(),&seek,&media,&error),"image symlink denied");
    Check(!source.CollectSnapshots({{"snapshot-event","snapshot-channel","analysis-epoch"}},&docs,&coverage,&error)&&
        error=="visual-snapshot-read-failed"&&docs.size()==preserved_docs.size()&&docs.front().id==preserved_docs.front().id,
        "symlink collection fails without partial publication");
    std::filesystem::remove(jpg);std::filesystem::rename(snapshots/"owned-image.jpg",jpg);
    for(const std::string mode:{"missing-proof","null-proof","manifest-only"}){
        auto legacy=original_manifest;const auto proof_key=std::string("\"originalFrameProof\":")+*json;
        const auto proof_at=legacy.find(proof_key);Check(proof_at!=std::string::npos,"legacy proof fixture location");
        if(mode=="missing-proof")legacy.erase(proof_at,proof_key.size()+1);
        else if(mode=="null-proof")legacy.replace(proof_at,proof_key.size(),"\"originalFrameProof\":null");
        else {
            const auto capture=legacy.find("\"captureStatus\":\"recorded\"");Check(capture!=std::string::npos,"legacy capture fixture");
            legacy.replace(capture,std::string("\"captureStatus\":\"recorded\"").size(),"\"captureStatus\":\"manifest-only\"");
            const auto recorded=legacy.find("\"recorded\":true");Check(recorded!=std::string::npos,"legacy recorded fixture");
            legacy.replace(recorded,std::string("\"recorded\":true").size(),"\"recorded\":false");
        }
        Write(manifest,legacy);std::vector<recording::VisualSearchDocument> legacy_docs;auto legacy_coverage=coverage;
        Check(source.CollectSnapshots({{"snapshot-event","snapshot-channel","analysis-epoch"}},&legacy_docs,&legacy_coverage,&error)&&
            legacy_docs.empty()&&legacy_coverage.at("snapshot-channel").unsupported_snapshots==coverage.at("snapshot-channel").unsupported_snapshots+1,
            mode+" is explicitly excluded without failing the rebuild");
    }
    Write(manifest,original_manifest);
    Check(source.Resolve(docs.front(),&seek,&media,&error),"restored exact fixture");
    {
        using Service=ingress::VisualSearchApplicationService;Service::Options options;options.enabled=true;
        options.model_directory=argv[2];options.cache_directory=(root/"visual-cache").string();options.snapshot_directory=snapshots.string();
        options.scan_seconds=60;options.sample_seconds=1; // 오류 주입 중 게시본은 고정하고 현재 검증만 대조한다.
        Service service(runtime.catalog(),reader,options,[](auto* channels){*channels={"snapshot-channel","second-channel"};return true;});
        const Service::Authorize allowed=[](const auto& c){return c=="snapshot-channel"||c=="second-channel";};
        const auto deadline=std::chrono::steady_clock::now()+std::chrono::seconds(15);bool ready=false;
        while(std::chrono::steady_clock::now()<deadline){const auto status=service.Status(allowed);
            if(status.body.find("\"state\":\"ready\"")!=std::string::npos){ready=true;break;}std::this_thread::sleep_for(std::chrono::milliseconds(20));}
        Check(ready,"actual snapshot service ready: "+service.Status(allowed).body);
        const Service::Query query{{"text","움직이는 공"},{"channelIds","snapshot-channel"},{"limit","10"}};
        const auto found=service.Search(query,allowed);Check(found.status==200&&found.body.find("event-snapshot")!=std::string::npos,"snapshot in real Korean query");
        for(const auto* secret:{"rgbSha256","imageSha256","sourceGeneration","snapshot-event","mediaPath"})Check(found.body.find(secret)==std::string::npos,"snapshot private fields omitted");
        const Service::Query select{{"hitId",docs.front().id},{"channelId","snapshot-channel"}};
        Check(service.Seek(select,allowed).status==200,"snapshot current API seek");
        Check(service.Search(query,[](const auto&){return false;}).status==403,"snapshot scope denied before inference");
        Write(jpg,"temporary unavailable image");
        const auto failed_source=service.Search(query,allowed);
        Check(failed_source.status==503,"snapshot I/O or hash failure is not successful empty search");
        Write(jpg,original_image);
        const auto events=Read(root/"events.jsonl");
        auto other_event=events;const std::string channel_marker="\"channelId\":\"snapshot-channel\"";
        const auto channel_at=other_event.find(channel_marker);Check(channel_at!=std::string::npos,"channel-scoped event fixture");
        other_event.replace(channel_at,channel_marker.size(),"\"channelId\":\"unrequested-channel\"");
        std::string unrelated_history;unrelated_history.reserve(other_event.size()*20001+events.size());
        for(unsigned n=0;n<20001;++n)unrelated_history+=other_event;
        unrelated_history+=events;Write(root/"events.jsonl",unrelated_history);
        const auto scoped=service.Search(query,allowed);
        Check(scoped.status==200&&scoped.body.find("event-snapshot")!=std::string::npos,"unrequested 20001 rows do not exhaust selected channel facts");
        Check(service.Seek(select,allowed).status==200,"channel-scoped facts keep selected snapshot seek available");
        std::string own_history;own_history.reserve(events.size()*20001);
        for(unsigned n=0;n<20001;++n)own_history+=events;
        Write(root/"events.jsonl",own_history);
        Check(service.Search(query,allowed).status==503,"selected channel facts still enforce the combined row and byte bounds");
        auto large_fact=events;const auto scenario=large_fact.find("\"scenarioName\":\"\"");Check(scenario!=std::string::npos,"multi-channel byte fixture");
        large_fact.replace(scenario,std::string("\"scenarioName\":\"\"").size(),"\"scenarioName\":\""+std::string(4096,'s')+"\"");
        auto second_fact=large_fact;const auto second_at=second_fact.find(channel_marker);Check(second_at!=std::string::npos,"second fact channel");
        second_fact.replace(second_at,channel_marker.size(),"\"channelId\":\"second-channel\"");
        std::string combined;for(unsigned n=0;n<600;++n){combined+=large_fact;combined+=second_fact;}Write(root/"events.jsonl",combined);
        std::size_t aggregate_bytes=0;
        for(const auto& channel:{"snapshot-channel","second-channel"}){
            analysis::EventRecordQueryOptions fact_options;fact_options.search_facts_only=true;fact_options.include_archives=true;
            fact_options.channel_id=channel;fact_options.evidence="snapshot";fact_options.limit=20000;
            analysis::EventRecordQueryResult facts;
            Check(analysis::QueryEventRecords(fact_options,&facts,&error)&&facts.search_facts.size()==600&&!facts.truncated&&!facts.has_more&&facts.search_fact_bytes<=8*1024*1024,
                "each selected channel remains individually below row and byte caps");aggregate_bytes+=facts.search_fact_bytes;
        }
        Check(aggregate_bytes>8*1024*1024,"two selected channels exceed aggregate byte cap below row cap");
        auto combined_query=query;combined_query["channelIds"]="snapshot-channel,second-channel";
        Check(service.Search(combined_query,allowed).status==503,"selected channels share one aggregate byte budget");
        Write(root/"events.jsonl",events);auto epoch_changed=events;
        const auto epoch_at=epoch_changed.find("analysis-epoch");Check(epoch_at!=std::string::npos,"event epoch fixture");
        epoch_changed.replace(epoch_at,14,"changed-epoch");Write(root/"events.jsonl",epoch_changed);
        Check(service.Seek(select,allowed).status==410,"changed event epoch denies cached snapshot seek");
        const auto changed_event=service.Search(query,allowed);
        Check(changed_event.status==200&&changed_event.body.find("event-snapshot")==std::string::npos,"changed event epoch excluded from cached search");
        Write(root/"events.jsonl","");
        Check(service.Seek(select,allowed).status==410,"removed event cannot seek cached snapshot");
        const auto gone=service.Search(query,allowed);Check(gone.status==200&&gone.body.find("event-snapshot")==std::string::npos,"removed event excluded from old index search");
        service.Stop();Write(root/"events.jsonl",events);
    }
    {
        using Service=ingress::VisualSearchApplicationService;Service::Options options;options.enabled=true;
        options.model_directory=argv[2];options.cache_directory=(root/"rebuild-cache").string();options.snapshot_directory=snapshots.string();options.scan_seconds=1;options.sample_seconds=1;
        Service service(runtime.catalog(),reader,options,[](auto* channels){*channels={"snapshot-channel"};return true;});
        const Service::Authorize allowed=[](const auto& c){return c=="snapshot-channel";};
        auto wait_status=[&](const std::string& marker,unsigned seconds){
            const auto end=std::chrono::steady_clock::now()+std::chrono::seconds(seconds);
            while(std::chrono::steady_clock::now()<end){auto status=service.Status(allowed);if(status.status==200&&status.body.find(marker)!=std::string::npos)return status.body;std::this_thread::sleep_for(std::chrono::milliseconds(20));}
            throw std::runtime_error("snapshot rebuild status deadline: "+service.Status(allowed).body);
        };
        const auto before=wait_status("\"state\":\"ready\"",15);
        const Service::Query query{{"text","움직이는 공"},{"channelIds","snapshot-channel"},{"limit","10"}};
        Check(service.Search(query,allowed).status==200,"complete snapshot index before rebuild corruption");
        Write(jpg,"owned corrupt JPEG during actual rebuild");
        const auto failed=wait_status("\"error\":\"visual-index-build-failed\"",5);
        Check(failed.find("\"searchAvailable\":true")!=std::string::npos,"snapshot rebuild failure retains previous published index");
        const auto frames=before.substr(before.find("\"indexedFrames\":"));
        Check(failed.find(frames)!=std::string::npos,"failed snapshot rebuild keeps complete channel coverage and frame count");
        Check(service.Search(query,allowed).status==503,"retained index still refuses currently corrupt snapshot");
        Write(jpg,original_image);
        const auto restored=service.Search(query,allowed);Check(restored.status==200&&restored.body.find("event-snapshot")!=std::string::npos,"restored original is searchable through retained complete index");
        wait_status("\"error\":\"\"",5);Check(service.Search(query,allowed).status==200,"successful rebuild clears error and serves complete index");service.Stop();
    }
    Check(!runtime.catalog().RequestDeletion(reference.segment_id,"continuous-capacity",&error),"snapshot source held during read");media.reset();
    Check(runtime.catalog().RequestDeletion(reference.segment_id,"continuous-capacity",&error),"delete after release");
    Check(!source.Resolve(docs.front(),&seek,&media,&error),"deleted source never replayed");
    std::vector<recording::VisualSearchDocument> deleted_docs;auto deleted_coverage=coverage;
    Check(source.CollectSnapshots({{"snapshot-event","snapshot-channel","analysis-epoch"}},&deleted_docs,&deleted_coverage,&error)&&
        deleted_docs.empty()&&deleted_coverage.at("snapshot-channel").unsupported_snapshots==coverage.at("snapshot-channel").unsupported_snapshots+1,
        "source entering normal deletion is explicitly excluded from rebuild");
    struct rusage usage{};Check(::getrusage(RUSAGE_SELF,&usage)==0,"resource measurement");std::uint64_t rss=usage.ru_maxrss;
#ifndef __APPLE__
    rss*=1024;
#endif
    Check(rss<=4ULL*1024*1024*1024,"RSS cap");std::cout<<"PASS snapshot source checks="<<checks<<" peakRssBytes="<<rss<<"\n";return 0;
}catch(const std::exception& e){std::cerr<<"FAIL "<<e.what()<<" checks="<<checks<<"\n";return 1;}}

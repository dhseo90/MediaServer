// 파일 용도: 실제 writer·독립 PNG oracle·순환 삭제·재시작과 패키지 부정 입력의 단기 검사.
#include "recording_media_test_fixture.h"
#include "recording/evidence_package_builder.h"
#include "recording/recording_runtime_composition.h"
#include "recording/recording_search_reader.h"
#include "recording/visual_frame_decoder.h"
#include "recording/recording_derived_job_service.h"
#include "recording/recording_derived_selection.h"
#include "analysis/decoded_interval_evidence.h"
#include "ingress/evidence_application_service.h"
#include <fcntl.h>
#include <fstream>
#include <sys/resource.h>
#include <sys/stat.h>
#include <unistd.h>
#include <zlib.h>

namespace {
int checks=0;
void Check(bool value,const std::string& label){
    ++checks;if(!value)throw std::runtime_error(label);std::cout<<"[pass] "<<label<<'\n';
}
using Clock=std::chrono::steady_clock;
auto Deadline(){return Clock::now()+std::chrono::seconds(30);}
std::vector<unsigned char> Read(int fd,std::uint64_t offset,std::size_t n){
    std::vector<unsigned char> data(n);std::size_t done=0;
    while(done<n){const auto got=::pread(fd,data.data()+done,n-done,static_cast<off_t>(offset+done));
        if(got<0&&errno==EINTR)continue;if(got<=0)throw std::runtime_error("asset-read");done+=std::size_t(got);}
    return data;
}
std::uint32_t Be(const unsigned char* p){return std::uint32_t(p[0])<<24|std::uint32_t(p[1])<<16|std::uint32_t(p[2])<<8|p[3];}
// 제품 PNG writer를 호출하지 않는 독립 PNG 구조·CRC·inflate/pixel oracle.
std::vector<unsigned char> PngRgb(const std::vector<unsigned char>& png,int width,int height){
    const std::vector<unsigned char> signature{137,80,78,71,13,10,26,10};
    Check(png.size()>33&&std::equal(signature.begin(),signature.end(),png.begin()),"V440-F01 PNG signature");
    std::vector<unsigned char> compressed;bool header=false,end=false;
    for(std::size_t p=8;p<png.size();){
        Check(png.size()-p>=12,"PNG chunk header");const auto n=Be(png.data()+p);p+=4;
        Check(n<=png.size()-p-8,"PNG chunk length");const std::string type(reinterpret_cast<const char*>(png.data()+p),4);
        Check(Be(png.data()+p+4+n)==crc32(0,png.data()+p,n+4),"PNG CRC");
        if(type=="IHDR"){Check(!header&&n==13&&Be(png.data()+p+4)==unsigned(width)&&Be(png.data()+p+8)==unsigned(height)&&
            png[p+12]==8&&png[p+13]==2&&png[p+14]==0&&png[p+15]==0&&png[p+16]==0,"PNG RGB8 geometry");header=true;}
        else if(type=="IDAT")compressed.insert(compressed.end(),png.begin()+p+4,png.begin()+p+4+n);
        else if(type=="IEND"){Check(n==0&&p+8==png.size(),"PNG exact end");end=true;}
        else throw std::runtime_error("unexpected PNG chunk");p+=n+8;
    }
    Check(header&&end,"PNG required chunks");uLongf size=(std::size_t(width)*3+1)*height;std::vector<unsigned char> raw(size),rgb;
    Check(uncompress(raw.data(),&size,compressed.data(),compressed.size())==Z_OK&&size==raw.size(),"PNG lossless inflate");
    const std::size_t row=std::size_t(width)*3;
    for(int y=0;y<height;++y){Check(raw[y*(row+1)]==0,"PNG no-filter row");rgb.insert(rgb.end(),raw.begin()+y*(row+1)+1,raw.begin()+(y+1)*(row+1));}
    return rgb;
}
void Save(const std::filesystem::path& path,const std::string& bytes){
    const int fd=::open(path.c_str(),O_WRONLY|O_CREAT|O_EXCL,0600);
    if(fd<0)throw std::runtime_error("fixture-create");
    const auto n=::write(fd,bytes.data(),bytes.size());const bool ok=n==static_cast<ssize_t>(bytes.size())&&!::fsync(fd);::close(fd);
    if(!ok)throw std::runtime_error("fixture-write");
}
}
int main(int argc,char** argv){try{
    if(argc!=2&&argc!=3)return 2;gst_init(nullptr,nullptr);
    const bool seed=argc==3&&std::string(argv[2])=="--seed";
    const auto root=std::filesystem::canonical(argv[1]);std::string error;
    recording::RecordingRuntimeStorage runtime(root/"recordings");Check(runtime.Open(&error),"V440 source storage open: "+error);
    auto input=Encode(30,false,false,160,90,30,30);Shift(input,7000000000ULL);
    const std::string source_track=std::string(64,'a')+"/001";
    input.descriptor.tracks.front().track_id=source_track;
    for(auto& packet:input.packets)packet.track_id=source_track;
    recording::GStreamerSegmentWriter writer(runtime.WriterOptions(1000));
    Check(writer.Start("1","unused",input.descriptor,[](auto,auto,auto*){return false;},&error),"writer start");
    for(const auto& packet:input.packets)writer.Push(packet,0);writer.Stop();
    const auto ids=runtime.catalog().FinalizedSegmentIdsForStartup();Check(ids.size()==1,"exact one original recording");
    const auto segment=*runtime.catalog().FindSegmentV2ById(ids.front());const auto binding=*runtime.catalog().FindSourceBinding(ids.front());
    recording::RecordingReadService reader(runtime.catalog());recording::RecordingSearchReader search(runtime.catalog(),reader);
    std::shared_ptr<const recording::RecordingSearchModel> model;
    Check(search.Refresh({"1"},{},&model,&error),"current product search model: "+error);
    const auto selected=std::find_if(model->documents().begin(),model->documents().end(),[&](const auto& d){return d.segment_id==ids.front()&&d.start_ns;});
    Check(selected!=model->documents().end(),"search result with current UTC evidence");auto hit=*selected;
    const auto evidence_root=root/"recordings/evidence-packages";
    recording::EvidencePackageStore store(evidence_root,{});Check(store.Recover(&error),"V440-S01 owned store ready");
    recording::EvidencePackageBuilder builder(runtime.catalog(),reader,store);std::string package_id;recording::EvidencePackageV1 manifest;
    Check(builder.Create(hit,"structured","",&package_id,&manifest,&error,Deadline()),"V440-M01 package from actual search: "+error);
    Check(manifest.status=="complete"&&manifest.frames.size()==8&&manifest.assets.size()==8,"representative sequence complete without optional clip");
    if(seed){
        Check(runtime.catalog().Checkpoint(&error),"seed checkpoint");
        Save(root/"seed.json","{\"packageId\":\""+package_id+"\",\"startTimeMs\":"+std::to_string(*hit.start_ns/1000000)+",\"endTimeMs\":"+std::to_string((*hit.end_ns+999999)/1000000)+"}");
        return 0;
    }
    std::vector<std::int64_t> expected;for(const auto& sample:binding.file_evidence->samples)if(sample.original_pts_ns>=*hit.media_pts&&sample.original_pts_ns<*hit.media_end_pts)expected.push_back(sample.original_pts_ns);
    std::sort(expected.begin(),expected.end());Check(expected.size()==30,"independent source sample count");
    recording::EvidenceFrameExtractor extractor(runtime.catalog(),reader);
    for(std::size_t i=0;i<8;++i){const auto& frame=manifest.frames[i];
        Check(frame.pts_ns==expected[i*29/7],"V440-F02 evenly selected exact sample "+std::to_string(i));
        Check(frame.locator.has_value(),"known UTC has FrameLocatorV1");
        Check(frame.track_id==source_track&&binding.track_id==source_track,"V440-C01 real source track identity is preserved");
        recording::EvidenceFrameV1 repeat;
        Check(extractor.Extract(hit.channel_id,*frame.locator,segment.checksum_sha256,&repeat,&error,Deadline()),"FrameLocatorV1 re-extract: "+error);
        Check(repeat.rgb_sha256==frame.rgb_sha256&&repeat.png_sha256==frame.png_sha256,"same frame and PNG digests");
        const auto rgb=PngRgb(repeat.png,160,90);
        Check(recording::EvidenceSha256(rgb.data(),rgb.size())==frame.rgb_sha256,"PNG preserves packed RGB exactly");
        auto wrong=*frame.locator;++wrong.frame.pts;
        const auto prior=repeat.png;
        Check(!extractor.Extract(hit.channel_id,wrong,segment.checksum_sha256,&repeat,&error,Deadline())&&repeat.png==prior,"no nearest frame substitution/output unchanged");
        wrong=*frame.locator;++wrong.frame.utc_ms;
        Check(!extractor.Extract(hit.channel_id,wrong,segment.checksum_sha256,&repeat,&error,Deadline()),"wrong UTC rejected");
        Check(!extractor.Extract("other",*frame.locator,segment.checksum_sha256,&repeat,&error,Deadline()),"wrong channel rejected");
        wrong=*frame.locator;wrong.frame_index=99999;
        Check(!extractor.Extract(hit.channel_id,wrong,segment.checksum_sha256,&repeat,&error,Deadline())&&error=="evidence-frame-index-unsupported","unverified frame index rejected without ordinal inference");
    }
    {
        recording::RecordingRuntimeStorage unknown_runtime(root/"unknown-time");Check(unknown_runtime.Open(&error),"unknown time source open");
        auto packet=input.packets.front();packet.observation->clock_process_id.clear();packet.observation->observed_utc_ns=0;
        recording::GStreamerSegmentWriter unknown_writer(unknown_runtime.WriterOptions(1000));
        Check(unknown_writer.Start("unknown-channel","unused",input.descriptor,[](auto,auto,auto*){return false;},&error),"unknown time writer start");
        unknown_writer.Push(packet,0);unknown_writer.Stop();
        const auto unknown_ids=unknown_runtime.catalog().FinalizedSegmentIdsForStartup();Check(unknown_ids.size()==1,"unknown time finalized source");
        const auto original_unknown=*unknown_runtime.catalog().FindSegmentV2ById(unknown_ids.front());
        recording::RecordingReadService unknown_reader(unknown_runtime.catalog());recording::EvidenceFrameExtractor unknown_extractor(unknown_runtime.catalog(),unknown_reader);
        recording::EvidenceFrameV1 unknown_frame;
        Check(unknown_extractor.ExtractMedia("unknown-channel",unknown_ids.front(),packet.pts,original_unknown.checksum_sha256,&unknown_frame,&error,Deadline())&&
            !unknown_frame.utc_ns&&!unknown_frame.locator&&unknown_frame.time_provenance=="unknown","V440-F02 actual unknown UTC decoded frame without invented locator: "+error);
    }
    const auto json=recording::SerializeEvidencePackage(manifest);recording::EvidencePackageV1 parsed;
    Check(recording::ParseEvidencePackage(json,&parsed,&error)&&recording::SerializeEvidencePackage(parsed)==json,"V440-C01 canonical roundtrip");
    for(const auto& bad:std::vector<std::string>{"{\"schema\":0,"+json.substr(1),"{\"schema\":\"unknown\"}",std::string(1024*1024+1,' ')}){
        parsed=manifest;Check(!recording::ParseEvidencePackage(bad,&parsed,&error)&&recording::SerializeEvidencePackage(parsed)==json,"invalid JSON/schema/size leaves output unchanged");
    }
    for(const auto& track:std::vector<std::string>{source_track,std::string(1024,'a'),"track-1"}){
        auto accepted=manifest;accepted.frames.front().track_id=track;
        recording::EvidencePackageV1 decoded;
        Check(recording::ValidateEvidencePackage(accepted,&error)&&
            recording::ParseEvidencePackage(recording::SerializeEvidencePackage(accepted),&decoded,&error)&&
            decoded.frames.front().track_id==track,"V440-C01 source track contract accepted without normalization");
    }
    std::vector<std::string> invalid_tracks{"",std::string(1025,'a'),std::string(1,char(127))};
    for(int ch=0;ch<32;++ch)invalid_tracks.push_back(std::string("track/")+char(ch));
    for(const auto& track:invalid_tracks){
        auto rejected=manifest;rejected.frames.front().track_id=track;parsed=manifest;
        Check(!recording::ValidateEvidencePackage(rejected,&error)&&
            !recording::ParseEvidencePackage(recording::SerializeEvidencePackage(rejected),&parsed,&error)&&
            recording::SerializeEvidencePackage(parsed)==json,"V440-C01 invalid source track rejected and output unchanged");
    }
    auto file=store.Open(package_id,&error);Check(bool(file),"verified read after publish: "+error);
    const auto first=Read(file->fd(),file->AssetOffset(0),manifest.assets[0].size_bytes);
    Check(recording::EvidenceSha256(first.data(),first.size())==manifest.assets[0].sha256,"stored asset hash");
    std::vector<std::string> listed;Check(store.ListIds(&listed,&error)&&listed==std::vector<std::string>{package_id},"package listing");
    ingress::EvidenceApplicationService service(runtime.catalog(),reader,true,evidence_root,0);
    const auto permit=[](const auto& c){return c=="1";};const auto deny=[](const auto&){return false;};
    Check(service.Get(package_id,permit).status==200&&service.Get(package_id,deny).status==403,"V440-A01 current package scope");
    Check(service.List({{"channelId","1"}},permit).status==200&&service.List({{"channelId","other"}},permit).status==403,"list channel scope");
    Check(service.Create(hit,"structured","",deny).status==403,"create denied before I/O");
    int status=0;Check(!service.Asset(package_id,0,deny,&status)&&status==403,"asset scoped access");
    Check(!service.Asset(package_id,9,permit,&status)&&status==404,"asset index boundary");
    std::vector<std::int64_t> sequence;
    auto point=hit;point.media_end_pts.reset();
    Check(recording::EvidencePackageBuilder::SelectSamples(point,binding,&sequence,&error)&&sequence.size()==1&&sequence.front()==*hit.media_pts,"V440-F02 exact point selection");
    auto ambiguous=binding;ambiguous.file_evidence->samples.push_back(ambiguous.file_evidence->samples.front());
    Check(!recording::EvidencePackageBuilder::SelectSamples(hit,ambiguous,&sequence,&error)&&error=="evidence-frame-ambiguous","duplicate PTS cannot select arbitrary frame");
    point.media_pts=*hit.media_end_pts;
    Check(!recording::EvidencePackageBuilder::SelectSamples(point,binding,&sequence,&error)&&error=="evidence-frame-not-found","half-open range end is not replaced");
    auto invalid=manifest;invalid.frames.clear();
    Check(!recording::ValidateEvidencePackage(invalid,&error),"preserved frame reference requires matching frame metadata");
    auto unknown=manifest;unknown.start_ns.reset();unknown.end_ns.reset();unknown.time_provenance="unknown";
    for(auto& f:unknown.frames){f.utc_ns.reset();f.locator.reset();f.uncertainty_ns.reset();f.time_provenance="unknown";}
    Check(recording::ParseEvidencePackage(recording::SerializeEvidencePackage(unknown),&parsed,&error)&&!parsed.frames[0].utc_ns&&!parsed.frames[0].locator,"unknown UTC stays null in manifest roundtrip");
    // 제품 derived selection/service로 실제 clip을 만든 뒤 독립 복사·출처를 확인한다.
    recording::RecordingConsumerReferenceV1 reference;reference.reference_id="evidence-reference";reference.kind="event";
    reference.owner_id="evidence-event";reference.channel_id=reference.source_id="1";
    reference.analysis_namespace="evidence-test";reference.analysis_track_id="track-1";reference.association_quality="timestamp-match";
    const auto& original=*input.packets.front().observation;
    reference.original=recording::RecordingConsumerOriginalV1{original.source_generation,original.generation_order,original.ordinal,source_track,*original.pts_ns};
    reference.request=recording::RecordingConsumerRequestV1{"media-pts-ms",7000,7500,0,0};reference.created_at_ms=1;
    analysis::DecodedIntervalCollector collector;
    for(const auto& packet:input.packets){analysis::DecodedIntervalEvidence interval;
        interval.analysis_pts_ns=packet.pts;interval.duration_ns=packet.observation->duration_ns;
        interval.association.quality=analysis::SourceAssociationQuality::TimestampMatch;
        const auto& o=*packet.observation;interval.association.original=analysis::OriginalSampleIdentity{o.source_generation,o.generation_order,o.ordinal,packet.track_id,*o.pts_ns};collector.Append(std::move(interval));}
    std::vector<recording::DerivedSourceEvidence> sources{{segment,binding,false}};
    recording::DerivedRecordingSelection selection;recording::DerivedJobIntentV1 intent;
    Check(runtime.catalog().PutConsumerReference(reference,&error)&&recording::SelectDerivedRecording(reference,*collector.Snapshot(reference.analysis_namespace),sources,nullptr,&selection,&error)&&
        recording::BuildDerivedJobIntent(selection,sources,1024*1024,10,&intent,&error),"actual clip selection/intent: "+error);
    recording::RetentionCoordinator retention(runtime.catalog(),[&]{return runtime.catalog().RetentionSnapshot();},
        [](auto* bytes,auto*){*bytes=1024ULL*1024*1024;return true;},
        [&](const auto& path,auto* e){return recording::RemoveContainedMediaFile(root/"recordings",path,e,{},true);},{0,1,root/"recordings"});
    Check(retention.UpdateChannelPolicy("1",{1024ULL*1024*1024,0,1024ULL*1024*1024,0},&error)&&retention.AdmitDerivedJob(runtime.catalog(),intent,10).accepted,"clip admitted with existing protection");
    recording::DerivedJobService derived(runtime.catalog(),runtime.journal(),{root/"recordings",30000,{}});
    const auto rendered=derived.Run(intent.job_id);
    Check(rendered.complete&&rendered.job&&rendered.job->ready&&rendered.job->ready->outputs.size()==1,"actual verified clip complete: "+rendered.reason);
    recording::RecordingSearchQuery playback_query;playback_query.channels={"1"};
    playback_query.start_time_ms=*hit.start_ns/1000000;playback_query.end_time_ms=(*hit.end_ns+999999)/1000000;
    std::shared_ptr<const recording::RecordingSearchModel> refreshed,playback_model;
    Check(search.Refresh({"1"},{},&refreshed,&error)&&search.WithPlayback(*refreshed,playback_query,&playback_model,&error),"actual event-priority search projection: "+error);
    const auto actual=std::find_if(playback_model->documents().begin(),playback_model->documents().end(),[&](const auto& document){
        return document.kind==recording::SearchDocumentKind::Recording&&document.segment_id==hit.segment_id&&document.playback_job_id==intent.job_id;
    });
    Check(actual!=playback_model->documents().end()&&actual->event_ids.empty()&&actual->playback_event_id==reference.owner_id,"plain recording search has selected event without observation event IDs");
    std::vector<std::string> clip_jobs{"sentinel"};
    Check(!runtime.catalog().FindEventDerivedJobIds("1",reference.owner_id,hit.segment_id,&clip_jobs,&error,[]{return true;})&&
        error=="evidence-timeout"&&clip_jobs==std::vector<std::string>{"sentinel"},"clip candidate cancellation keeps output unchanged");
    Check(runtime.catalog().FindEventDerivedJobIds("other",reference.owner_id,hit.segment_id,&clip_jobs,&error)&&clip_jobs.empty()&&
        runtime.catalog().FindEventDerivedJobIds("1",reference.owner_id,"different-source",&clip_jobs,&error)&&clip_jobs.empty(),"clip candidates preserve channel and source isolation");
    std::string actual_id;recording::EvidencePackageV1 actual_manifest;
    Check(builder.Create(*actual,"structured","",&actual_id,&actual_manifest,&error,Deadline())&&
        actual_manifest.event_ids==std::vector<std::string>{reference.owner_id}&&
        std::count_if(actual_manifest.references.begin(),actual_manifest.references.end(),[&](const auto& ref){
            return ref.kind=="event"&&ref.id==reference.owner_id&&ref.reason=="event-priority-selection";
        })==1,"V440-M01 real search selection retains event lineage: "+error);
    auto visual=hit;visual.id="visual-event-snapshot";visual.media_end_pts.reset();visual.event_ids={reference.owner_id};
    std::string visual_id;recording::EvidencePackageV1 visual_manifest;
    Check(builder.Create(visual,"visual",segment.checksum_sha256,&visual_id,&visual_manifest,&error,Deadline())&&
        visual_manifest.frames.size()==1&&visual_manifest.assets.size()==2&&visual_manifest.references.back().derivation_id==intent.job_id&&
        std::count_if(visual_manifest.references.begin(),visual_manifest.references.end(),[](const auto& ref){return ref.kind=="event";})==1,
        "V440-M01 event snapshot selects existing exact-sample clip: "+error);
    visual.start_ns.reset();visual.end_ns.reset();visual.time_provenance="unknown";
    Check(builder.Create(visual,"visual",segment.checksum_sha256,&visual_id,&visual_manifest,&error,Deadline())&&visual_manifest.assets.size()==2,
        "existing exact-sample clip association does not depend on UTC availability: "+error);
    visual.event_ids.clear();
    Check(builder.Create(visual,"visual",segment.checksum_sha256,&visual_id,&visual_manifest,&error,Deadline())&&
        visual_manifest.assets.size()==1&&visual_manifest.event_ids.empty()&&visual_manifest.references.back().state=="not-applicable",
        "representative frame cannot infer event association: "+error);
    visual.event_ids={"different-event"};
    Check(builder.Create(visual,"visual",segment.checksum_sha256,&visual_id,&visual_manifest,&error,Deadline())&&visual_manifest.assets.size()==1,
        "different event cannot borrow existing clip: "+error);
    visual.event_ids={reference.owner_id};visual.media_pts=expected.back();
    Check(builder.Create(visual,"visual",segment.checksum_sha256,&visual_id,&visual_manifest,&error,Deadline())&&visual_manifest.assets.size()==1,
        "sample beyond clip half-open coverage remains frame-only: "+error);
    auto clip_hit=hit;clip_hit.playback_job_id=intent.job_id;clip_hit.playback_event_id=reference.owner_id;
    clip_hit.playback_segment_id=rendered.job->ready->outputs[0].segment.segment_id;
    clip_hit.event_ids={reference.owner_id};clip_hit.track_id="track-1";clip_hit.observation_id="observation-1";clip_hit.analysis_namespace=reference.analysis_namespace;
    std::string clip_id;recording::EvidencePackageV1 clip_manifest;
    Check(builder.Create(clip_hit,"structured","",&clip_id,&clip_manifest,&error,Deadline()),"V440-M01 associated clip package: "+error);
    Check(clip_manifest.assets.size()==9&&clip_manifest.references.back().derivation_id==intent.job_id&&clip_manifest.event_ids==clip_hit.event_ids&&clip_manifest.track_id=="track-1"&&clip_manifest.observation_id=="observation-1","all clip/event/track/observation associations retained");
    auto clip_file=store.Open(clip_id,&error);Check(bool(clip_file),"clip package integrity");
    const auto clip_bytes=Read(clip_file->fd(),clip_file->AssetOffset(8),clip_manifest.assets[8].size_bytes);
    Check(recording::EvidenceSha256(clip_bytes.data(),clip_bytes.size())==rendered.job->ready->outputs[0].segment.checksum_sha256,"copied clip bytes match actual derived media");
    // 30fps 정수 원본 PTS와 native rational tick이 다른 표본 하나만 관측한 clip.
    auto native_reference=reference;native_reference.reference_id="native-evidence-reference";native_reference.owner_id="native-evidence-event";
    const auto& native_packet=input.packets.at(1);const auto& native_original=*native_packet.observation;
    native_reference.original=recording::RecordingConsumerOriginalV1{native_original.source_generation,native_original.generation_order,
        native_original.ordinal,native_packet.track_id,*native_original.pts_ns};
    native_reference.request=recording::RecordingConsumerRequestV1{"media-pts-ms",7033,7066,0,0};
    analysis::DecodedIntervalCollector native_collector;analysis::DecodedIntervalEvidence native_interval;
    native_interval.analysis_pts_ns=native_packet.pts;native_interval.duration_ns=native_original.duration_ns;
    native_interval.association.quality=analysis::SourceAssociationQuality::TimestampMatch;
    native_interval.association.original=analysis::OriginalSampleIdentity{native_original.source_generation,native_original.generation_order,
        native_original.ordinal,native_packet.track_id,*native_original.pts_ns};native_collector.Append(std::move(native_interval));
    recording::DerivedRecordingSelection native_selection;recording::DerivedJobIntentV1 native_intent;
    Check(runtime.catalog().PutConsumerReference(native_reference,&error)&&recording::SelectDerivedRecording(native_reference,
        *native_collector.Snapshot(native_reference.analysis_namespace),sources,nullptr,&native_selection,&error,true)&&
        native_selection.native_file_intervals&&recording::BuildDerivedJobIntent(native_selection,sources,1024*1024,11,&native_intent,&error),
        "native single-observation selection keeps exact identity: "+error);
    Check(retention.AdmitDerivedJob(runtime.catalog(),native_intent,11).accepted,"native clip admitted");
    const auto native_rendered=derived.Run(native_intent.job_id);
    Check(native_rendered.complete&&native_rendered.job&&native_rendered.job->ready,"native clip complete: "+native_rendered.reason);
    visual.media_pts=static_cast<std::int64_t>(*native_original.pts_ns);visual.event_ids={native_reference.owner_id};
    Check(builder.Create(visual,"visual",segment.checksum_sha256,&visual_id,&visual_manifest,&error,Deadline())&&
        visual_manifest.assets.size()==2&&visual_manifest.references.back().derivation_id==native_intent.job_id,
        "V440-M01 native tick rounding cannot omit the observed sample clip: "+error);
    visual.media_pts=hit.media_pts;
    Check(builder.Create(visual,"visual",segment.checksum_sha256,&visual_id,&visual_manifest,&error,Deadline())&&visual_manifest.assets.size()==1,
        "native GOP dependency sample is not an observed event association: "+error);
    visual.event_ids={reference.owner_id};
    // 원본과 독립된 패키지를 유지한 채 기존 순환 삭제 경로를 실행한다.
    auto protected_media=reader.ResolveMedia(hit.channel_id,hit.segment_id);
    const auto held=runtime.catalog().RetentionSnapshot();
    Check(bool(protected_media)&&std::any_of(held.candidates.begin(),held.candidates.end(),[&](const auto& c){return c.Id()==hit.segment_id&&c.hold_count>0;}),"playback hold preserved");
    protected_media.reset();
    recording::RetentionPlanRequest request;request.channel_id=hit.channel_id;request.policy.continuous_max_bytes=1;
    request.policy.event_max_bytes=1;request.free_bytes=1024*1024*1024;
    request.now_ms=std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count();
    const auto plan=recording::RetentionCoordinator::Plan(runtime.catalog().RetentionSnapshot(),request);
    const auto removed=retention.Apply(plan,request.now_ms);
    std::cout<<"[retention] ok="<<removed.ok<<" deleted="<<removed.deleted_count<<" message="<<removed.last_error<<'\n';
    Check(removed.ok&&removed.deleted_count==3&&runtime.catalog().IsDeletedSegmentId(hit.segment_id)&&runtime.catalog().IsDeletedSegmentId(clip_hit.playback_segment_id),"V440-S01 actual source and clip retention tombstones");
    file.reset();recording::EvidencePackageStore reopened(evidence_root,{});Check(reopened.Recover(&error),"reopen recovery");
    file=reopened.Open(package_id,&error);Check(file&&recording::SerializeEvidencePackage(file->manifest())==json&&
        Read(file->fd(),file->AssetOffset(0),manifest.assets[0].size_bytes)==first,"independent bytes and immutable provenance after deletion/reopen");
    clip_file.reset();clip_file=reopened.Open(clip_id,&error);
    Check(clip_file&&Read(clip_file->fd(),clip_file->AssetOffset(8),clip_manifest.assets[8].size_bytes)==clip_bytes,"preserved clip survives original and derived media deletion/reopen");
    Check(service.Get(package_id,permit).body.find("\"state\":\"deleted\"")!=std::string::npos,"current deletion separate from manifest");
    std::string partial_id;recording::EvidencePackageV1 partial;
    Check(builder.Create(hit,"structured","",&partial_id,&partial,&error,Deadline())&&partial.status=="partial"&&partial.frames.empty(),"deleted source creates explicit partial metadata");
    visual.media_pts=hit.media_pts;
    Check(builder.Create(visual,"visual",segment.checksum_sha256,&visual_id,&visual_manifest,&error,Deadline())&&visual_manifest.status=="partial"&&
        std::any_of(visual_manifest.references.begin(),visual_manifest.references.end(),[&](const auto& ref){
            return ref.kind=="clip"&&ref.id==clip_hit.playback_segment_id&&ref.state=="deleted";
        }),"deleted associated clip remains explicit partial, not no-associated-clip: "+error);
    const auto partial_path=evidence_root/(partial_id+".evp");
    // 원자 link 직후 중단을 같은 inode의 pending link로 재현한다.
    Check(::link(partial_path.c_str(),(evidence_root/".pending-evp-v1").c_str())==0,"owned linked pending fixture");
    Check(reopened.Recover(&error)&&!std::filesystem::exists(evidence_root/".pending-evp-v1")&&bool(reopened.Open(partial_id,&error)),"published-before-cleanup crash recovery");
    Save(evidence_root/".pending-evp-v1","MSEV");
    Check(reopened.Recover(&error)&&!std::filesystem::exists(evidence_root/".pending-evp-v1"),"partial header crash cleanup");
    Check(::symlink(partial_path.c_str(),(root/"evil-store").c_str())==0,"owned symlink fixture");
    recording::EvidencePackageStore evil(root/"evil-store",{});Check(!evil.Recover(&error),"store symlink rejected");
    recording::EvidencePackageStore::Limits tiny;tiny.store_bytes=1;
    recording::EvidencePackageStore full(evidence_root,tiny);
    std::string untouched="sentinel";Check(!full.Publish(partial,{},&untouched,&error)&&error=="evidence-capacity"&&untouched=="sentinel","V440-R01 quota does not evict existing evidence");
    Check(!store.Publish(partial,{},&untouched,&error,[]{return true;})&&untouched=="sentinel"&&!std::filesystem::exists(evidence_root/".pending-evp-v1"),"cancelled write cleanup");
    Check(bool(store.Open(package_id,&error)),"quota/cancel preserved existing artifact");
    recording::EvidencePackageStore::Limits reserve_limit;reserve_limit.reserved_free_bytes=UINT64_MAX;
    recording::EvidencePackageStore reserve(evidence_root,reserve_limit);
    Check(!reserve.Publish(partial,{},&untouched,&error)&&error=="evidence-disk-reserve"&&untouched=="sentinel","disk reserve rejects before publication");
    recording::EvidencePackageStore::Limits package_limit;package_limit.package_bytes=16;
    recording::EvidencePackageStore capped(evidence_root,package_limit);
    Check(!capped.Publish(partial,{},&untouched,&error)&&error=="evidence-capacity"&&untouched=="sentinel","manifest alone exceeding package cap rejected");
    Check(!builder.Create(hit,"structured","",&untouched,&parsed,&error,Clock::now())&&error=="evidence-timeout"&&untouched=="sentinel","expired creation budget rejects before publication");
    file.reset();const int corrupt=::open(partial_path.c_str(),O_WRONLY|O_NOFOLLOW);Check(corrupt>=0,"owned corruption fixture");
    const char byte='!';Check(::pwrite(corrupt,&byte,1,20)==1,"corruption injected");::close(corrupt);
    Check(!store.Open(partial_id,&error),"corrupt manifest never treated as missing-success");
    Check(service.Get(partial_id,permit).status==503&&!service.Asset(partial_id,0,permit,&status)&&status==503,"corruption is service failure, not ordinary missing 404");
    service.Stop();Check(service.Get(package_id,permit).status==503,"service shutdown rejects requests");
    struct rusage usage{};Check(::getrusage(RUSAGE_SELF,&usage)==0,"resource measured");std::uint64_t rss=usage.ru_maxrss;
#ifndef __APPLE__
    rss*=1024;
#endif
    Check(rss<=4ULL*1024*1024*1024,"V440-R01 process memory budget");
    std::cout<<"PASS evidence checks="<<checks<<" peakRssBytes="<<rss<<"\n";return 0;
}catch(const std::exception& e){std::cerr<<"FAIL "<<e.what()<<" after="<<checks<<'\n';return 1;}}

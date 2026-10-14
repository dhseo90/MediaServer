// R116: 실제 FileSourceWorker/SharedStream/managed writer의 유한 연속성 대조.
// 기존 writer fixture/독립 AU oracle을 재사용하며 기본 설정을 읽지 않는다.
#define main managed_writer_existing_main
#include "recording_managed_writer_smoke.cpp"
#undef main
#include "core/shared_stream.h"
#include "core/source_factory.h"
#include "app_config.h"
#include "ingress/evidence_application_service.h"
#include <condition_variable>
#include <future>

namespace {
void Need(bool ok,const char* why){if(!ok)throw std::runtime_error(why);}
struct Seen {std::string generation;std::uint64_t order,ordinal;std::int64_t pts;bool key;std::string hash;bool loss;};
Seen Observe(const media::Packet& p){Need(p.observation.has_value(),"source-observation");const auto& o=*p.observation;return {o.source_generation,o.generation_order,o.ordinal,static_cast<std::int64_t>(*o.pts_ns),p.is_key_frame,recording::EvidenceSha256(p.payload.data(),p.payload.size()),p.recorder_video_discontinuity};}
struct Release {
 std::shared_ptr<core::SharedStream> stream;std::mutex& mu;std::condition_variable& cv;bool& resume;
 ~Release(){ {std::lock_guard lock(mu);resume=true;}cv.notify_all();stream->StopSource();stream->StopAllSubscribers(); }
};
void MarkerCases(const std::filesystem::path& root,const std::filesystem::path& input){
 std::filesystem::create_directories(root);const auto encoded=MixedInput(root,input);
 for(unsigned mode=0;mode<2;++mode){auto packets=encoded;
  if(mode==0)packets.packets[15].recorder_video_discontinuity=true;
  else packets.packets[15].observation->discont=true;
  Store store(root/("marker-"+std::to_string(mode)));Need(Run(store,packets),"marker-writer");
  std::set<std::uint64_t> actual;for(const auto& segment:store.Segments()){auto binding=store.catalog.FindSourceBinding(segment.segment_id);Need(bool(binding),"marker-binding");for(const auto& sample:binding->samples)actual.insert(sample.ordinal);}
  std::set<std::uint64_t> expected;for(unsigned i=1;i<=120;++i)if(i<=15||i>=31)expected.insert(i);
  Need(actual==expected,"independent-marker-with-contiguous-ordinals");std::string error;Need(store.journal.Finish(&error),"marker-finish");
 }
 for(bool videoLoss:{true,false}){
  auto stream=std::make_shared<core::SharedStream>(media::SourceSpec{media::SourceSpec::Kind::File,"fixture"});
  std::mutex mu;std::condition_variable cv;bool resume=false,entered=false;unsigned videos=0,notices=0,audio=0;bool timeout=false;
  Release release{stream,mu,cv,resume};
  Need(stream->AddRecordingSubscriber("recorder",[&](const media::Packet& packet){std::unique_lock lock(mu);if(packet.kind==media::MediaKind::Video){++videos;notices+=packet.recorder_video_discontinuity;}else ++audio;
   if(!entered){entered=true;cv.notify_all();if(!cv.wait_for(lock,std::chrono::seconds(5),[&]{return resume;}))timeout=true;}}),"marker-subscriber");
  auto video=encoded.packets.front();stream->FanOut(video);
  {std::unique_lock lock(mu);Need(cv.wait_for(lock,std::chrono::seconds(5),[&]{return entered;}),"marker-entered");}
  auto sound=video;sound.kind=media::MediaKind::Audio;
  stream->FanOut(videoLoss?video:sound);
  for(unsigned i=0;i<254;++i)stream->FanOut(sound);
  stream->FanOut(video);stream->FanOut(sound);
  Need(stream->DroppedPacketCount("recorder")==1,"marker-exact-drop");
  {std::lock_guard lock(mu);resume=true;}cv.notify_all();stream->RemoveSubscriber("recorder");
  Need(!timeout&&videos==2&&audio==255&&notices==(videoLoss?1U:0U),"audio-before-video-loss-notice");
 }
 std::cout<<"[R116-markers] PASS delivery-only/source-only/video-loss/audio-loss\n";
}
void PackageReadback(const std::filesystem::path& root){
 for(const char* part:{"normal","overload"}){
  recording::EvidencePackageStore packages(root/part/"packages",{});std::string error;Need(packages.Recover(&error),"readback-recover");
  std::ifstream input(root/part/"packages.tsv");Need(bool(input),"readback-oracle");std::string id,segment,hash;std::uint64_t ordinal;std::int64_t pts;unsigned n=0;
  while(input>>id>>segment>>ordinal>>pts>>hash){auto file=packages.Open(id,&error);Need(bool(file),"independent-package-open");const auto& m=file->manifest();
   Need(m.frames.size()==1&&m.frames.front().sample_ordinal==ordinal&&m.frames.front().pts_ns==pts&&m.frames.front().media_sha256==hash,"independent-package-sample");
   const auto& asset=m.assets.front();std::vector<unsigned char> bytes(asset.size_bytes);Need(::pread(file->fd(),bytes.data(),bytes.size(),file->AssetOffset(0))==static_cast<ssize_t>(bytes.size()),"independent-png-read");
   Need(recording::EvidenceSha256(bytes.data(),bytes.size())==asset.sha256&&bytes.size()>8&&bytes[0]==137&&bytes[1]==80&&bytes[2]==78&&bytes[3]==71,"independent-png-hash");++n;
  }Need(n>0&&input.eof(),"readback-complete");
  Store reopened(root/part);Need(!reopened.Segments().empty(),"reopen-accepted-prefix");Need(reopened.journal.Finish(&error),"reopen-finish");
 }
 std::cout<<"[R116-readback] PASS separate process package and journal\n";
}
auto SourceCase(const std::filesystem::path& root,const std::filesystem::path& input,bool overloaded,bool before){
 Store store(root);recording::GStreamerSegmentWriter writer(store.Options());
 auto stream=std::make_shared<core::SharedStream>(media::SourceSpec{media::SourceSpec::Kind::File,input.string()});
 std::mutex mu;std::condition_variable cv;bool resume=!overloaded,entered=false,started=false;std::string error,worker_error;
 std::vector<Seen> peer,delivered;peer.reserve(512);delivered.reserve(512);std::uint64_t maxPushUs=0,totalPushUs=0;
 Release release{stream,mu,cv,resume};
 Need(stream->AddAnalysisSubscriber("peer",[&](const media::Packet& p){if(p.kind!=media::MediaKind::Video)return;auto v=Observe(p);std::lock_guard lock(mu);if(peer.size()>=512){worker_error="peer-bound";cv.notify_all();return;}if(v.loss){worker_error="peer-loss-marker";}peer.push_back(v);cv.notify_all();}),"peer-add");
 Need(stream->AddRecordingSubscriber("recorder",[&](const media::Packet& p){try{
  if(p.kind!=media::MediaKind::Video)return;
  const auto v=Observe(p);
  if(!started){const auto d=stream->descriptor();Need(d.has_value(),"descriptor");Need(writer.Start("channel-1","recorder",*d,[](auto,auto,auto*){return false;},&error),"writer-start");started=true;}
  const auto t=std::chrono::steady_clock::now();writer.Push(p,0);const auto us=std::chrono::duration_cast<std::chrono::microseconds>(std::chrono::steady_clock::now()-t).count();
  std::unique_lock lock(mu);Need(delivered.size()<512,"delivered-bound");delivered.push_back(v);totalPushUs+=us;maxPushUs=std::max(maxPushUs,std::uint64_t(us));
  if(!entered){entered=true;cv.notify_all();if(!cv.wait_for(lock,std::chrono::seconds(15),[&]{return resume;})){worker_error="latch-timeout";resume=true;}}
  cv.notify_all();
 }catch(const std::exception& e){std::lock_guard lock(mu);worker_error=e.what();resume=true;cv.notify_all();}}),"recorder-add");
 Need(stream->StartSource(core::CreateSourceWorker(stream->source_spec()),&error),"source-start");
 {std::unique_lock lock(mu);Need(cv.wait_for(lock,std::chrono::seconds(15),[&]{return !worker_error.empty()||(entered&&peer.size()>=(overloaded?310U:120U));}),"peer-progress-deadline");Need(worker_error.empty(),"callback-error");}
 // Source stop does not depend on the blocked Recorder callback; peer kept consuming.
 stream->StopSource();const auto dropped=stream->DroppedPacketCount("recorder");const auto peerDrop=stream->DroppedPacketCount("peer");
 {std::lock_guard lock(mu);resume=true;}cv.notify_all();stream->RemoveSubscriber("recorder");stream->RemoveSubscriber("peer");writer.Stop();
 Need(worker_error.empty(),"worker-clean");Need(peerDrop==0,"peer-not-starved");Need(delivered.size()+dropped==peer.size(),"queue-accounting");
 if(!before){std::size_t notices=0;for(const auto& p:delivered)notices+=p.loss;Need(overloaded?notices==1:notices==0,"recorder-only-loss-notice");}
 Need(overloaded?dropped>0:dropped==0,"actual-overload-discriminated");
 std::map<std::pair<std::string,std::uint64_t>,Seen> originals;
 for(const auto& p:peer)Need(originals.emplace(std::make_pair(p.generation,p.ordinal),p).second,"source-unique");
 for(const auto& p:delivered){auto it=originals.find({p.generation,p.ordinal});Need(it!=originals.end()&&it->second.hash==p.hash&&it->second.pts==p.pts,"dequeue-original-hash");}
 std::set<std::pair<std::string,std::uint64_t>> expected,actual;bool awaiting=true;std::string generation;std::uint64_t previous=0;unsigned gaps=0;
 for(const auto& p:delivered){if(p.generation!=generation){awaiting=true;previous=0;generation=p.generation;}if(previous&&p.ordinal!=previous+1){awaiting=true;++gaps;}previous=p.ordinal;if(awaiting&&!p.key)continue;awaiting=false;expected.emplace(p.generation,p.ordinal);}
 const auto segments=store.Segments();Need(!segments.empty(),"finalized-prefix");
 for(const auto& s:segments){auto b=store.catalog.FindSourceBinding(s.segment_id);Need(b&&b->file_evidence,"file-evidence");for(const auto& sample:b->samples){Need(actual.emplace(b->source_generation,sample.ordinal).second,"finalized-unique");auto p=originals.find({b->source_generation,sample.ordinal});Need(p!=originals.end()&&p->second.pts==static_cast<std::int64_t>(sample.pts_ns),"finalized-original-time");}
  if(!before){auto file=store.root/"channel-1"/(s.segment_id+".mp4");int fd=open(file.c_str(),O_RDONLY|O_NOFOLLOW|O_CLOEXEC);Need(fd>=0,"frame-fd");recording::VisualRgbFrame out;std::string why;const auto target=b->file_evidence->samples.back().mux_pts_ns;bool decoded=recording::VerifyRecordingFileEvidenceFd(fd,*b,&why)&&recording::DecodeVisualFrame(fd,s.size_bytes,target,&out,&why,{},5000,recording::VisualDecodePolicy::SoftwareOnly);const int closed=close(fd);Need(decoded&&std::llabs(out.presentation_ns-target)<=1&&closed==0,"recovered-exact-last-frame");}
 }
 if(!before){
  recording::RecordingReadService reader(store.catalog);recording::RecordingSearchReader search(store.catalog,reader);
  std::shared_ptr<const recording::RecordingSearchModel> model;Need(search.Refresh({"channel-1"},{},&model,&error),"recovery-search");
  recording::EvidencePackageStore packages(root/"packages",{});Need(packages.Recover(&error),"recovery-package-store");
  recording::EvidencePackageBuilder builder(store.catalog,reader,packages);std::ofstream oracle(root/"packages.tsv");
  for(const auto& segment:segments){auto binding=store.catalog.FindSourceBinding(segment.segment_id);const auto sample=binding->samples.back();
   auto it=std::find_if(model->documents().begin(),model->documents().end(),[&](const auto& doc){return doc.segment_id==segment.segment_id;});Need(it!=model->documents().end(),"recovery-real-search-hit");auto hit=*it;hit.media_pts=sample.pts_ns;hit.media_end_pts.reset();hit.time_base_num=1;hit.time_base_den=1000000000;
   std::string id;recording::EvidencePackageV1 manifest;Need(builder.Create(hit,"structured",segment.checksum_sha256,&id,&manifest,&error,std::chrono::steady_clock::now()+std::chrono::seconds(5)),"recovery-exact-package");
   Need(manifest.frames.size()==1&&manifest.frames.front().sample_ordinal==sample.ordinal&&manifest.frames.front().pts_ns==static_cast<std::int64_t>(sample.pts_ns),"recovery-manifest");
   oracle<<id<<' '<<segment.segment_id<<' '<<sample.ordinal<<' '<<sample.pts_ns<<' '<<segment.checksum_sha256<<'\n';
   recording::EvidenceFrameExtractor extractor(store.catalog,reader);recording::EvidenceFrameV1 frame;
   Need(!extractor.ExtractMedia("channel-1",segment.segment_id,sample.pts_ns+1000,segment.checksum_sha256,&frame,&error,std::chrono::steady_clock::now()+std::chrono::seconds(5)),"missing-exact-sample-not-substituted");
   const auto prior=id;Need(!builder.Create(hit,"structured",std::string(64,'0'),&id,&manifest,&error,std::chrono::steady_clock::now()+std::chrono::seconds(5))&&id==prior,"wrong-binding-not-published");
   if(segment.segment_id==segments.back().segment_id){
    ingress::EvidenceApplicationService service(store.catalog,reader,true,root/"concurrent-packages",0);
    std::mutex gate;std::condition_variable gate_cv;bool entered=false,released=false;unsigned calls=0;
    auto permit=[&](const std::string& channel){if(channel!="channel-1")return false;if(++calls==2){std::unique_lock lock(gate);entered=true;gate_cv.notify_all();return gate_cv.wait_for(lock,std::chrono::seconds(5),[&]{return released;});}return true;};
    auto first=std::async(std::launch::async,[&]{return service.Create(hit,"structured",segment.checksum_sha256,permit);});
    struct Unlatch{std::mutex& mu;std::condition_variable& cv;bool& flag;~Unlatch(){{std::lock_guard lock(mu);flag=true;}cv.notify_all();}} unlatch{gate,gate_cv,released};
    bool waiting=false;{std::unique_lock lock(gate);waiting=gate_cv.wait_for(lock,std::chrono::seconds(5),[&]{return entered;});}
    const auto busy=service.Create(hit,"structured",segment.checksum_sha256,[](const auto& c){return c=="channel-1";});
    {std::lock_guard lock(gate);released=true;}gate_cv.notify_all();const auto admitted=first.get();
    Need(waiting&&admitted.status==201&&busy.status==503&&busy.body.find("evidence-busy")!=std::string::npos,"recovery-concurrent-201-busy");
    Need(service.Create(hit,"structured",segment.checksum_sha256,[](const auto&){return false;}).status==403,"recovery-authority-revoked");
    service.Stop();Need(service.Create(hit,"structured",segment.checksum_sha256,[](const auto&){return true;}).status==503,"recovery-service-stop");
   }
  }Need(bool(oracle),"package-oracle-write");std::vector<std::string> ids;Need(packages.ListIds(&ids,&error)&&ids.size()==segments.size(),"failed-evidence-not-published");
 }
 std::cout<<"[R116-source] overloaded="<<overloaded<<" source="<<peer.size()<<" delivered="<<delivered.size()<<" dropped="<<dropped<<" peerDrop="<<peerDrop<<" gapCount="<<gaps<<" segments="<<segments.size()<<" accepted="<<actual.size()<<" independentlySafe="<<expected.size()<<" pushTotalUs="<<totalPushUs<<" pushMaxUs="<<maxPushUs<<'\n';
 for(const auto& p:delivered)std::cout<<"[R116-delivered] generation="<<p.order<<" ordinal="<<p.ordinal<<" loss="<<p.loss<<" key="<<p.key<<" pts="<<p.pts<<" hash="<<p.hash<<'\n';
 if(before&&overloaded)Need(actual!=expected,"before-reproduces-unsafe-continuity");else Need(actual==expected,"exact-safe-accepted-set");
 Need(store.journal.Finish(&error),"journal-finish");Need(stream->TotalSubscriberCount()==0&&!stream->IsSourceRunning(),"source-finished");
 return std::make_pair(store.catalog.SearchResidency(),store.catalog.ScratchResidency());
}
}
int main(int argc,char** argv){try{if(argc!=4)return 2;gst_init(nullptr,nullptr);bool before=std::string(argv[3])=="--before";const auto root=std::filesystem::path(argv[1]);Need(root.is_absolute(),"owned-root");
 if(std::string(argv[3])=="--readback"){PackageReadback(root);return 0;}
 if(!before)MarkerCases(root/"markers",argv[2]);
 for(bool overloaded:{false,true}){const auto owners=SourceCase(root/(overloaded?"overload":"normal"),argv[2],overloaded,before);const auto usage=owners.second->usage();const auto peak=owners.second->peak();
  Need(owners.first->used()==0&&usage.disk_bytes==0&&usage.ram_bytes==0&&usage.file_descriptors==0,"last-source-package-reader-owners-released");
  std::cout<<"[R116-owner] overloaded="<<overloaded<<" used="<<owners.first->used()<<" peak="<<owners.first->peak()<<" scratch="<<usage.disk_bytes<<" scratchPeak="<<peak.disk_bytes<<" scratchRamPeak="<<peak.ram_bytes<<" fds="<<usage.file_descriptors<<" fdPeak="<<peak.file_descriptors<<'\n';
 }return 0;
}catch(const std::exception& e){std::cerr<<"[R116-fail] "<<e.what()<<'\n';return 1;}}

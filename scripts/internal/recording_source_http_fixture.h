// R118: actual FileSource/SharedStream, bounded test oracle outside product accounting.
#pragma once
#include "core/shared_stream.h"
#include "core/source_factory.h"
#include <condition_variable>
namespace {
std::uint64_t SourceHttpSteadyNs(){return std::chrono::duration_cast<std::chrono::nanoseconds>(std::chrono::steady_clock::now().time_since_epoch()).count();}
std::int64_t SourceHttpNowMs(){return std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count();}
struct SourceHttpSample {std::string generation,hash;std::uint64_t ordinal;std::int64_t pts;};
void RunHttpSources(recording::RecordingRuntimeStorage& runtime,const std::filesystem::path& root,
                    unsigned count,std::atomic<unsigned>& writes,std::atomic<unsigned>& removed,
                    std::atomic<std::uint64_t>* started_ns=nullptr) {
 auto& catalog=runtime.catalog();
 recording::RetentionCoordinator retention(catalog,[&](auto* b,auto*){*b=std::filesystem::space(root).available;return true;},[&](const auto& p,auto* e){const bool ok=recording::RemoveContainedMediaFile(root/"recording",p,e,{},true);if(ok)++removed;return ok;},{0,64ULL*1024*1024,root/"recording"});
 struct Channel {
  std::shared_ptr<core::SharedStream> stream;std::unique_ptr<recording::GStreamerSegmentWriter> writer;
  std::mutex mu;std::condition_variable cv;std::vector<SourceHttpSample> peer;std::string error;bool started=false;
  ~Channel(){if(stream){stream->StopSource();stream->StopAllSubscribers();}if(writer)writer->Stop();}
 } channels[2];
 std::set<std::string> old;
 for(const auto& entry:std::filesystem::recursive_directory_iterator(root/"recording"))if(entry.path().extension()==".mp4")old.insert(entry.path().stem().string());
 for(unsigned i=0;i<2;++i){auto& c=channels[i];const std::string id=i?"9201":"9101";std::string error;
  recording::RetentionPolicy policy;policy.continuous_max_bytes=108ULL*1024*1024;policy.event_max_bytes=128ULL*1024*1024;
  if(!retention.UpdateChannelPolicy(id,policy,&error))throw std::runtime_error(error);
  auto options=runtime.WriterOptions(2000);
  options.admit_segment=[&](const auto& id,std::uint64_t bytes){const auto a=retention.AdmitContinuousWrite(id,bytes,SourceHttpNowMs());return recording::SegmentAdmissionDecision{a.allowed,a.start_new_epoch,a.reserved_bytes};};
  options.report_segment_progress=[&](const auto& id,std::uint64_t bytes){retention.UpdateContinuousWriteProgress(id,bytes);};
  options.complete_segment=[&](const auto& id,std::uint64_t bytes){retention.CompleteContinuousWrite(id,bytes);++writes;};
  c.writer=std::make_unique<recording::GStreamerSegmentWriter>(options);
  c.stream=std::make_shared<core::SharedStream>(media::SourceSpec{media::SourceSpec::Kind::File,(root/"input"/"r118.mp4").string()});c.peer.reserve(2048);
  if(!c.stream->AddAnalysisSubscriber("oracle",[&c](const media::Packet& p){if(p.kind!=media::MediaKind::Video)return;std::lock_guard lock(c.mu);if(!p.observation||c.peer.size()>=2048){c.error="source-oracle-bound";c.cv.notify_all();return;}c.peer.push_back({p.observation->source_generation,recording::EvidenceSha256(p.payload.data(),p.payload.size()),p.observation->ordinal,p.pts});c.cv.notify_all();}))throw std::runtime_error("oracle-add");
  if(!c.stream->AddRecordingSubscriber("recorder",[&c,id](const media::Packet& p){try{if(p.kind!=media::MediaKind::Video)return;
   if(!c.started){const auto d=c.stream->descriptor();std::string error;if(!d||!c.writer->Start(id,"r118",*d,[](auto,auto,auto*){return false;},&error))throw std::runtime_error("source-writer-start:"+error);c.started=true;}
   c.writer->Push(p,SourceHttpNowMs());
  }catch(const std::exception& e){std::lock_guard lock(c.mu);c.error=e.what();c.cv.notify_all();}}))throw std::runtime_error("recorder-add");
  if(!c.stream->StartSource(core::CreateSourceWorker(c.stream->source_spec()),&error))throw std::runtime_error(error);
 }
 if(started_ns)started_ns->store(SourceHttpSteadyNs());
 const auto end=std::chrono::steady_clock::now()+std::chrono::seconds(55);
 for(auto& c:channels){for(;;){std::unique_lock lock(c.mu);if(!c.error.empty())throw std::runtime_error(c.error);if(c.peer.size()>=count)break;if(std::chrono::steady_clock::now()>=end)throw std::runtime_error("source-progress-deadline");c.cv.wait_for(lock,std::chrono::seconds(1),[&]{return c.peer.size()>=count||!c.error.empty();});lock.unlock();retention.RunPeriodic(SourceHttpNowMs());}c.stream->StopSource();}
 // StopSource does not wait for Recorder; drain and durable completion are separate.
 for(auto& c:channels){c.stream->RemoveSubscriber("recorder");c.stream->RemoveSubscriber("oracle");c.writer->Stop();}
 std::map<std::pair<std::string,std::uint64_t>,SourceHttpSample> expected;std::set<std::pair<std::string,std::uint64_t>> actual;
 for(auto& c:channels){std::lock_guard lock(c.mu);if(!c.error.empty())throw std::runtime_error(c.error);for(const auto& p:c.peer)if(!expected.emplace(std::make_pair(p.generation,p.ordinal),p).second)throw std::runtime_error("source-duplicate");}
 unsigned files=0;
 for(const auto& entry:std::filesystem::recursive_directory_iterator(root/"recording")){if(entry.path().extension()!=".mp4"||old.count(entry.path().stem().string()))continue;
  const auto b=catalog.FindSourceBinding(entry.path().stem().string());if(!b)throw std::runtime_error("new-source-binding");++files;
  for(const auto& s:b->samples){const auto key=std::make_pair(b->source_generation,s.ordinal);const auto it=expected.find(key);if(it==expected.end()||it->second.pts!=static_cast<std::int64_t>(s.pts_ns)||!actual.insert(key).second)throw std::runtime_error("source-file-oracle");}
 }
 std::cout<<"[R118-source] expected="<<expected.size()<<" accepted="<<actual.size()<<" files="<<files<<" fullAcceptance="<<(actual.size()==expected.size())<<std::endl;
 if(actual.size()!=expected.size())throw std::runtime_error("normal-source-acceptance");
}
}

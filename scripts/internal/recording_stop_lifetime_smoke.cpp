// 파일 용도: R191 실제 StartChannel·SharedStream·Stop 경로의 수명 경합을 latch로 제어해 검증한다.
#include "stdafx.h"
#include <cassert>
#include <future>
#include <iostream>
#include "core/session_manager.h"
#include "app_config.h"
#define private public
#include "recording/recording_session_service.h"
#undef private
#include SESSION_SOURCE
using namespace recording;
using namespace std::chrono_literals;
namespace lifetime_test {
struct Gate {
 std::mutex mu;std::condition_variable cv;bool entered=false,open=false;
 void Enter(){std::unique_lock l(mu);entered=true;cv.notify_all();assert(cv.wait_for(l,8s,[&]{return open;}));}
 void Wait(){std::unique_lock l(mu);assert(cv.wait_for(l,3s,[&]{return entered;}));}
 void Release(){std::lock_guard l(mu);open=true;cv.notify_all();}
};
struct Control {
 Gate source,stop,snapshot,push;
 std::atomic<int> writers{0},destroyed{0},stops{0},sources{0};
 std::atomic<bool> in_snapshot{false};
 bool fail_source=false,throw_source=false,throw_stop=false,throw_snapshot=false,block_snapshot=false;
 bool fail_writer_create=false;
}* control;
class Source final:public core::SourceWorker {
 media::SourceSpec spec_;bool running_=false;
public:
 explicit Source(media::SourceSpec s):spec_(std::move(s)){++control->sources;}
 ~Source(){--control->sources;}
 const media::SourceSpec& source_spec()const override{return spec_;}
 bool Start(const std::shared_ptr<core::SharedStream>& stream,std::string* error)override{
  control->source.Enter();
  if(control->throw_source)throw std::runtime_error("R191 source exception");
  if(control->fail_source){if(error)*error="R191 intended source start failure";return false;}
  media::StreamDescriptor d;stream->SetDescriptor(d);running_=true;return true;
 }
 void Stop()override{running_=false;}
 bool IsRunning()const override{return running_;}
};
class Writer final:public SegmentWriter {
 RecordingTimeSnapshotPublisher publisher_;std::string channel_,epoch_;
public:
 Writer(){++control->writers;}
 ~Writer(){assert(!control->in_snapshot);--control->writers;++control->destroyed;}
 bool Start(const std::string& c,const std::string& e,const media::StreamDescriptor&,FinalizedCallback,std::string*)override{channel_=c;epoch_=e;return true;}
 void Push(const media::Packet& p,std::int64_t utc)override{publisher_.Publish(channel_,epoch_,p.pts,utc);control->push.Release();}
 PacketResult PushObserved(const media::Packet& p,std::int64_t utc)override{Push(p,utc);return {PacketOutcome::Accepted};}
 void Stop()override{(void)StopObserved();}
 WriterStopResult StopObserved()override{
  assert(!control->in_snapshot);++control->stops;control->stop.Enter();
  if(control->throw_stop)throw std::runtime_error("R191 stop exception");
  publisher_.Invalidate();WriterStopResult r;r.outcome=StopOutcome::Completed;r.operation_complete=true;return r;
 }
 std::shared_ptr<const RecordingTimeSnapshot> TimeSnapshot()const override{
  control->in_snapshot=true;
  if(control->block_snapshot)control->snapshot.Enter();
  control->in_snapshot=false;
  if(control->throw_snapshot)throw std::runtime_error("R191 snapshot exception");
  return publisher_.Get();
 }
};
class Store final:public RecordingStorePort {
public:
 bool FinalizeSegment(const RecordingSegmentV1&,const std::string&,std::string*)override{return true;}
 bool PutEventLink(const EventRecordingLinkV1&,std::string*)override{return false;}
 bool PutObservation(const AnalysisObservationV1&,std::string*)override{return false;}
 bool RequestDeletion(const std::string&,const std::string&,std::string*)override{return false;}
 bool CompleteDeletion(const RecordingTombstoneV1&,std::string*)override{return false;}
 std::vector<RecordingSegmentV1> QuerySegments(const std::string&,std::int64_t,std::int64_t)const override{return {};}
};
media::IngressRequest Request(std::string name="source"){
 media::IngressRequest r;r.path="/"+app::GetAppConfig().stream_route;r.query={{"source","rtsp"},{"url","rtsp://127.0.0.1/"+name}};return r;
}
std::weak_ptr<RecordingSessionService::ChannelState> State(RecordingSessionService& svc,const std::string& id="9101"){
 std::lock_guard l(svc.mu_);return svc.channels_.at(id);
}
void Run(const std::string& mode){
 Control ctl;control=&ctl;Store store;
 {
 core::StreamRegistry registry;core::ResourceGuard guard(8,8);core::SessionManager manager(registry,guard);
 const bool p2=mode.rfind("p2-",0)==0;
 ctl.fail_source=!p2&&mode!="normal"&&mode!="reuse";
 ctl.throw_source=mode=="source-exception";
 ctl.throw_stop=mode=="stop-exception";
 ctl.fail_writer_create=mode=="p2-create-fail";
 {
 RecordingSessionService svc(manager,store,[&]()->std::unique_ptr<SegmentWriter>{if(ctl.fail_writer_create)return {};return std::make_unique<Writer>();});
 if(ctl.fail_writer_create){assert(!svc.StartChannel("9101","epoch",Request(),true).ok);assert(!svc.ResolveRecordingTime("rtsp::rtsp://127.0.0.1/source",10));assert(svc.ActiveChannelCount()==0);return;}
 if(mode=="acquire-fail"){
  ctl.stop.Release();
  media::IngressRequest bad;assert(!svc.StartChannel("9101","epoch",bad,true).ok);
  const auto result=svc.StopAll(StopContext::Grace());assert(result.outcome==StopOutcome::Failed&&result.joined&&result.unfinished==0);
  svc.JoinOwned();assert(ctl.writers==0&&ctl.sources==0);std::cout<<"{\"mode\":\"acquire-fail\",\"pass\":true}"<<std::endl;return;
 }
 auto start=std::async(std::launch::async,[&]{return svc.StartChannel("9101","epoch",Request(),true);});
 ctl.source.Wait();auto weak=State(svc);
 if(p2){
  ctl.source.Release();assert(start.get().ok);
  auto stream=weak.lock()->handle.stream;
  media::Packet packet;packet.kind=media::MediaKind::Video;packet.is_key_frame=true;packet.pts=10;
  stream->FanOut(packet);
  {std::unique_lock l(ctl.push.mu);assert(ctl.push.cv.wait_for(l,3s,[&]{return ctl.push.open;}));}
  const std::string key="rtsp::rtsp://127.0.0.1/source";
  assert(svc.ResolveRecordingTime(key,10));
  if(mode=="p2-exception"){
   ctl.throw_snapshot=true;bool threw=false;try{(void)svc.ResolveRecordingTime(key,10);}catch(...){threw=true;}assert(threw);ctl.throw_snapshot=false;
  }
  std::future<std::optional<RecordingTimeSnapshot>> read;
  if(mode!="p2-normal"&&mode!="p2-after"&&mode!="p2-exception"){
   ctl.block_snapshot=true;
   read=std::async(std::launch::async,[&]{return svc.ResolveRecordingTime(key,10);});ctl.snapshot.Wait();
   assert(!weak.expired());
  }
  ctl.stop.Release();auto context=StopContext::Grace();
  std::promise<void> invoked;auto ready=invoked.get_future();
  auto stopping=std::async(std::launch::async,[&]{invoked.set_value();return svc.StopChannel("9101",context);});ready.get();
  std::future<RecorderStopResult> other;
  if(mode=="p2-duplicate")other=std::async(std::launch::async,[&]{return svc.StopChannel("9101",context);});
  if(read.valid()){assert(stopping.wait_for(50ms)==std::future_status::timeout);assert(ctl.destroyed==0);ctl.snapshot.Release();assert(read.get());}
  auto result=stopping.get();assert(result.Succeeded()&&result.joined&&result.owner_released);
  if(other.valid())assert(other.get().Succeeded());
  assert(!svc.ResolveRecordingTime(key,10));assert(ctl.stops==1&&ctl.writers==0&&ctl.destroyed==1);
  if(mode=="p2-channel-destroy"){
   ctl.block_snapshot=false;assert(svc.StartChannel("9101","new-epoch",Request("new"),true).ok);assert(weak.expired());
   assert(svc.StopChannel("9101",StopContext::Grace()).Succeeded());
  }
 }else{
  auto context=StopContext::Grace();
  const bool plain=mode=="start-fail"||mode=="source-exception"||mode=="normal"||mode=="reuse";
  if(!plain){auto state=weak.lock();svc.BeginStop(state,context);state.reset();}
  std::future<RecorderStopResult> stopping,all;
  if(mode=="stop-channel"||mode=="triple"||mode=="duplicate")stopping=std::async(std::launch::async,[&]{return svc.StopChannel("9101",context);});
  if(mode=="stop-all"||mode=="triple"||mode=="duplicate")all=std::async(std::launch::async,[&]{return svc.StopAll(context);});
  if(mode=="two"){
   // 첫 source가 source_mu를 보유하는 동안 별도 channel의 시작은 별도 stream에서 성공한다.
   ctl.source.Release();ctl.stop.Wait();
   ctl.fail_source=false;assert(svc.StartChannel("9201","other",Request("other"),true).ok);ctl.fail_source=true;
  }else ctl.source.Release();
  if(!ctl.fail_source&&!ctl.throw_source){assert(start.get().ok);auto state=weak.lock();svc.BeginStop(state,context);state.reset();}
  ctl.stop.Wait();
  assert(!weak.expired()&&svc.ActiveChannelCount()>=1);
  {std::lock_guard l(svc.mu_);assert(svc.channels_.count("9101"));}
  assert(ctl.writers>=1&&ctl.destroyed==0);
  assert(!svc.StartChannel("9101","reuse-during-stop",Request("reuse"),true).ok);
  if(mode=="deadline"){
   auto timeout=svc.StopAll(context);assert(timeout.outcome==StopOutcome::DeadlineUnconfirmed&&timeout.unfinished==1&&!timeout.joined);
   assert(!weak.expired()&&ctl.writers==1);
  }
  ctl.stop.Release();
  if(start.valid())assert(!start.get().ok);
  RecorderStopResult result=all.valid()?all.get():svc.StopAll(context);
  if(stopping.valid()){auto c=stopping.get();assert(!c.Succeeded());}
  if(mode=="normal"||mode=="reuse")assert(result.Succeeded());
  else if(mode=="deadline")assert(result.outcome==StopOutcome::DeadlineUnconfirmed);
  else assert(result.outcome==StopOutcome::Failed);
  assert(result.joined&&result.unfinished==0);svc.JoinOwned();
  auto again=svc.StopAll(context);assert(again.outcome==result.outcome&&again.joined);
  assert(svc.ActiveChannelCount()==0);
  assert(ctl.stops==(mode=="two"?2:1));
  if(mode!="stop-exception")assert(ctl.writers==0);
  if(ctl.fail_source){assert(!svc.StartChannel("9101","reuse-after-failure",Request("again"),true).ok);}
  if(mode=="reuse")assert(!svc.StartChannel("9101","closing",Request(),true).ok);
 }
 }
 assert(ctl.writers==0);
 }
 assert(ctl.sources==0);
 std::cout<<"{\"mode\":\""<<mode<<"\",\"pass\":true,\"writers\":"<<ctl.writers<<",\"destroyed\":"<<ctl.destroyed<<",\"stopCalls\":"<<ctl.stops<<",\"sourceOwners\":"<<ctl.sources<<"}"<<std::endl;
}
}
namespace core {std::unique_ptr<SourceWorker> CreateSourceWorker(const media::SourceSpec& spec){return std::make_unique<lifetime_test::Source>(spec);}}
int main(int argc,char** argv){assert(argc==2);lifetime_test::Run(argv[1]);}

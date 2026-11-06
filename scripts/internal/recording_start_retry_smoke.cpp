// 파일 용도: R191 실제 StartChannel·SharedStream·Stop 경로의 수명 경합을 latch로 제어해 검증한다.
#include "stdafx.h"
#include <cassert>
#include <future>
#include <iostream>
#include "core/session_manager.h"
#include "app_config.h"
#include "ingress/source_view_application_service.h"
#include "recording/retention_coordinator.h"
#define private public
#include "recording/recording_supervisor.h"
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
 Gate source,healthy_source,stop,snapshot,push;
 std::atomic<int> writers{0},destroyed{0},stops{0},sources{0},source_starts{0},writer_starts{0},packets{0},created{0};
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
  ++control->source_starts;
  if(spec_.uri=="rtsp://127.0.0.1/9201") control->healthy_source.Enter();
  else control->source.Enter();
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
 Writer(){++control->writers;++control->created;}
 ~Writer(){assert(!control->in_snapshot);--control->writers;++control->destroyed;}
 bool Start(const std::string& c,const std::string& e,const media::StreamDescriptor&,FinalizedCallback,std::string*)override{channel_=c;epoch_=e;++control->writer_starts;return true;}
 void Push(const media::Packet& p,std::int64_t utc)override{publisher_.Publish(channel_,epoch_,p.pts,utc);++control->packets;control->push.Release();}
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

void Packet(RecordingSessionService& svc,const std::string& id) {
 auto state=State(svc,id).lock();assert(state);
 const int before=control->packets;
 {std::lock_guard l(control->push.mu);control->push.open=false;}
 media::Packet p;p.kind=media::MediaKind::Video;p.is_key_frame=true;p.pts=10;
 state->handle.stream->FanOut(p);
 {std::unique_lock l(control->push.mu);assert(control->push.cv.wait_for(l,3s,[&]{return control->push.open;}));}
 assert(control->packets==before+1&&svc.IsChannelRecording(id));
}
ingress::SourceViewApplicationService::SourceRecord Record(std::string id="9101") {
 ingress::SourceViewApplicationService::SourceRecord s;s.source_id=id;s.kind="rtsp";
 s.rtsp_url="rtsp://127.0.0.1/"+id;s.enabled=true;s.recording.enabled=true;
 s.recording.continuous_max_bytes=1ULL<<30;s.recording.event_max_bytes=1ULL<<30;return s;
}
void Run(const std::string& mode) {
 Control ctl;control=&ctl;Store store;
 {
 core::StreamRegistry registry;core::ResourceGuard guard(8,8);core::SessionManager manager(registry,guard);
 RecordingSessionService svc(manager,store,[]{return std::make_unique<Writer>();});
 RetentionCoordinator retention(store,[]{return RetentionSnapshot{};},[](auto* n,auto*){*n=1ULL<<32;return true;},[](const auto&,auto*){return false;},{0,1,{}});
 ingress::SourceViewApplicationService sources;core::RecordingRuntimeConfigData config;config.recording_enabled=true;
 RecordingSupervisor supervisor(config,sources,svc,retention,app::GetAppConfig().stream_route);
 const auto source=Record();
 if(mode=="two") {ctl.healthy_source.Release();supervisor.ReconcileSource(Record("9201"));Packet(svc,"9201");}
 ctl.fail_source=true;
 auto failure=std::async(std::launch::async,[&]{supervisor.ReconcileSource(source);});
 ctl.source.Wait();auto old=State(svc).lock();assert(old);ctl.source.Release();ctl.stop.Wait();
 assert(old->start_failed&&!old->finish_complete&&!old->joined&&ctl.writers==(mode=="two"?2:1));
 const int created=ctl.created,starts=ctl.source_starts;
 assert(!svc.StartChannel("9101","cleanup-in-progress",Request(),true).ok);
 assert(ctl.created==created&&ctl.source_starts==starts&&State(svc).lock()==old);
 std::future<RecorderStopResult> stopper,duplicate;
 const bool stopping=mode=="stop-channel"||mode=="stop-all";
 auto context=StopContext::Grace();
 if(stopping) {
  if(mode=="stop-all")svc.BeginStopAll(context);

  stopper=std::async(std::launch::async,[&]{return mode=="stop-all"?svc.StopAll(context):svc.StopChannel("9101",context);});
  duplicate=std::async(std::launch::async,[&]{return mode=="stop-all"?svc.StopAll(context):svc.StopChannel("9101",context);});
  if(mode=="stop-channel") {
   const auto end=StopContext::Clock::now()+3s;
   for(;;) { {std::lock_guard l(old->stop_mu);if(old->explicit_stop)break;} assert(StopContext::Clock::now()<end);std::this_thread::yield(); }
  }
  assert(stopper.wait_for(50ms)==std::future_status::timeout);
 }
 if(mode=="two")Packet(svc,"9201");
 ctl.stop.Release();failure.get();
 assert(old->joined&&old->finish_complete&&old->owner_released&&!old->writer&&!old->drain&&!old->lease_owned);
 const auto previous=old->result;assert(previous.outcome==StopOutcome::Failed&&previous.joined&&previous.unfinished==0&&previous.owner_released);
 ctl.fail_source=false;
 if(stopping) {
  assert(stopper.get().outcome==StopOutcome::Failed&&duplicate.get().outcome==StopOutcome::Failed);
  supervisor.ReconcileSource(source);
  assert(!svc.StartChannel("9101","must-not-restart",Request(),true).ok);
  assert(ctl.source_starts==starts&&State(svc).lock()==old);
  const auto stopped=supervisor.Stop(context);assert(stopped.outcome==StopOutcome::Failed&&stopped.joined&&stopped.owner_released);
 } else {
  auto a=std::async(std::launch::async,[&]{supervisor.ReconcileSource(source);});
  auto b=std::async(std::launch::async,[&]{supervisor.ReconcileSource(source);});a.get();b.get();
  auto next=State(svc).lock();assert(next!=old&&ctl.source_starts==starts+1&&ctl.created==created+1);
  assert(supervisor.runtime_.at("9101").active);
  assert(!svc.StartChannel("9101","duplicate-running",Request(),true).ok&&ctl.created==created+1);
  // 이전 시도 참조를 잡은 늦은 소비자는 이전 결과만 받으며 새 map을 건드리지 않는다.
  auto late=std::async(std::launch::async,[&]{svc.FinishChannel(old);return svc.WaitStop(old);});
  Packet(svc,"9101");assert(late.get().stop_id==previous.stop_id&&old->result.outcome==StopOutcome::Failed);
  assert(State(svc).lock()==next&&next->writer&&next->context==nullptr);
  if(mode=="two")Packet(svc,"9201");
  auto aStop=std::async(std::launch::async,[&]{return svc.StopChannel("9101",context);});
  auto bStop=std::async(std::launch::async,[&]{return svc.StopChannel("9101",context);});
  assert(aStop.get().Succeeded()&&bStop.get().Succeeded());
  auto stop=supervisor.Stop(context);assert(stop.Succeeded()&&stop.joined&&stop.owner_released);
  auto again=svc.StopAll(context);assert(again.Succeeded());
  supervisor.ReconcileSource(source);assert(!svc.StartChannel("9101","after-stop-all",Request(),true).ok);
  assert(ctl.source_starts==starts+1);
 }
 svc.JoinOwned();assert(ctl.writers==0&&ctl.sources==0&&svc.ActiveChannelCount()==0);
 assert(ctl.stops==ctl.created&&ctl.destroyed==ctl.created);
 }
 std::cout<<"{\"mode\":\""<<mode<<"\",\"pass\":true,\"actualSourceStartCalls\":"<<ctl.source_starts<<",\"writerStarts\":"<<ctl.writer_starts<<",\"acceptedPackets\":"<<ctl.packets<<",\"writerObjects\":"<<ctl.created<<",\"writerStopCalls\":"<<ctl.stops<<",\"writerDestructors\":"<<ctl.destroyed<<",\"sourceOwners\":"<<ctl.sources<<"}"<<std::endl;
}
}
namespace core {std::unique_ptr<SourceWorker> CreateSourceWorker(const media::SourceSpec& spec){return std::make_unique<lifetime_test::Source>(spec);}}
int main(int argc,char** argv){assert(argc==2);lifetime_test::Run(argv[1]);}

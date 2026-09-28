// 파일 용도: S11 상태 전용 checkpoint snapshot의 잠금·실패 선형화 계약을 검증한다.
#include "ingress/recording_application_service.h"
#include "recording/recording_catalog.h"
#include "recording/recording_read_service.h"

#include <atomic>
#include <chrono>
#include <condition_variable>
#include <filesystem>
#include <fstream>
#include <future>
#include <iostream>
#include <mutex>
#include <thread>

namespace {
std::mutex hook_mu;
std::condition_variable hook_cv;
bool checkpoint_armed=false,checkpoint_entered=false,checkpoint_release=false,checkpoint_fail=false;
bool ordinary_armed=false,ordinary_entered=false,ordinary_release=false;

void ArmCheckpoint(bool fail=false){std::lock_guard<std::mutex> lock(hook_mu);checkpoint_armed=true;checkpoint_entered=false;checkpoint_release=false;checkpoint_fail=fail;}
void ArmOrdinary(){std::lock_guard<std::mutex> lock(hook_mu);ordinary_armed=true;ordinary_entered=false;ordinary_release=false;}
bool Wait(bool* entered){std::unique_lock<std::mutex> lock(hook_mu);return hook_cv.wait_for(lock,std::chrono::seconds(2),[&]{return *entered;});}
void Release(bool* released){std::lock_guard<std::mutex> lock(hook_mu);*released=true;hook_cv.notify_all();}
}

void S11StatusCheckpointBarrier(){
 std::unique_lock<std::mutex> lock(hook_mu);if(!checkpoint_armed)return;checkpoint_entered=true;hook_cv.notify_all();
 hook_cv.wait(lock,[]{return checkpoint_release;});checkpoint_armed=false;
}
bool S11StatusCheckpointForceFailure(){std::lock_guard<std::mutex> lock(hook_mu);const bool value=checkpoint_fail;checkpoint_fail=false;return value;}
void S11StatusOrdinaryBarrier(){
 std::unique_lock<std::mutex> lock(hook_mu);if(!ordinary_armed)return;ordinary_entered=true;hook_cv.notify_all();
 hook_cv.wait(lock,[]{return ordinary_release;});ordinary_armed=false;
}

namespace {
int pass=0,fail=0;
void Check(bool ok,const std::string& name){std::cout<<(ok?"[pass] ":"[fail] ")<<name<<std::endl;ok?++pass:++fail;}
recording::RecordingSegmentV1 Segment(){
 recording::RecordingSegmentV1 value;value.segment_id="status-segment";value.source_id=value.channel_id="status-channel";
 value.stream_epoch_id="status-epoch";value.start={1000,0,1,1000000000};value.end={2000,1000000000,1,1000000000};
 value.container="mp4";value.video_codecs={"h264"};value.audio_omitted_reason="source-no-audio";value.size_bytes=12;
 value.checksum_sha256=std::string(64,'a');value.retention_class=recording::RecordingRetentionClass::Continuous;
 value.lifecycle=recording::RecordingLifecycle::Finalized;value.created_at_ms=1000;value.finalized_at_ms=2000;return value;
}
struct Store{
 std::filesystem::path root;recording::RecordingJournal journal;recording::RecordingCatalog catalog;
 explicit Store(std::filesystem::path path):root(std::move(path)),journal(recording::RecordingJournal::ManagedOptions{root,"status-store"}),catalog(journal,Options()){
  std::filesystem::create_directories(root);std::string error;if(!journal.Open(&error)||!catalog.Open(&error))throw std::runtime_error(error);
 }
 recording::RecordingCatalog::Options Options()const{recording::RecordingCatalog::Options o(root/"recording-catalog.sqlite3",root,true);o.enable_v2_storage=true;return o;}
};
}

int main(int argc,char** argv){
 if(argc!=2)return 2;try{
  Store store(argv[1]);const auto media=store.root/"status.mp4";{std::ofstream out(media,std::ios::binary);out.write("0000ftyp0000",12);}std::string error;
  Check(store.catalog.FinalizeSegment(Segment(),media.string(),&error),"S11-STATUS-SNAPSHOT-01 성공 mutation fixture");
  recording::RecordingCatalogStatusSnapshot initial;
  Check(store.catalog.SnapshotStatus(&initial,&error)&&initial.channels.at("status-channel").continuous_bytes==12,
        "S11-STATUS-SNAPSHOT-01 정상 경로 mode/recovery/capacity 단일 snapshot");
  recording::RecordingReadService reader(store.catalog,store.root);
  std::atomic<bool> active{false},blocked{false};
  ingress::RecordingApplicationService service(reader,store.catalog,true,
   [&](const auto& snapshot,auto* rows){const auto usage=snapshot.channels.find("status-channel");const auto capacity=usage==snapshot.channels.end()?recording::RecordingCatalogStatusCapacity{}:usage->second;rows->push_back({"status-channel","현재 이름",true,active.load(),blocked.load(),capacity.continuous_bytes,capacity.event_bytes,91,92});return true;});

  ArmCheckpoint();bool checkpoint_ok=false;std::thread checkpoint([&]{checkpoint_ok=store.catalog.Checkpoint(&error);});
  Check(Wait(&checkpoint_entered),"S11-STATUS-SNAPSHOT-01 checkpoint active 진입");active=true;blocked=true;
  auto during=std::async(std::launch::async,[&]{return service.Status([](const auto& id){return id=="status-channel";});});
  const bool fast=during.wait_for(std::chrono::milliseconds(300))==std::future_status::ready;
  auto response=fast?during.get():ingress::ApplicationServiceResult{};
  Check(fast&&response.status==200&&response.body.find("\"active\":true")!=std::string::npos&&
        response.body.find("\"storageBlocked\":true")!=std::string::npos&&response.body.find("\"continuousBytes\":12")!=std::string::npos,
        "S11-STATUS-SNAPSHOT-04 checkpoint 중 용량 snapshot·동적 상태·공개 JSON 유지");
  Release(&checkpoint_release);checkpoint.join();Check(checkpoint_ok,"S11-STATUS-SNAPSHOT-01 checkpoint 성공·active 정리");

  ArmOrdinary();bool hold_ok=false;std::thread holder([&]{hold_ok=store.catalog.AdjustHoldCount("status-segment",1,&error);});
  Check(Wait(&ordinary_entered),"S11-STATUS-SNAPSHOT-02 일반 잠금 진입");
  auto ordinary=std::async(std::launch::async,[&]{recording::RecordingCatalogStatusSnapshot value;return store.catalog.SnapshotStatus(&value,nullptr);});
  Check(ordinary.wait_for(std::chrono::milliseconds(100))==std::future_status::timeout,"S11-STATUS-SNAPSHOT-02 일반 잠금은 stale fallback 금지");
  Release(&ordinary_release);holder.join();Check(hold_ok&&ordinary.get()&&store.catalog.AdjustHoldCount("status-segment",-1,&error),"S11-STATUS-SNAPSHOT-02 정상 경로 재개");

  ArmCheckpoint(true);std::thread failing([&]{checkpoint_ok=store.catalog.Checkpoint(&error);});Check(Wait(&checkpoint_entered),"S11-STATUS-SNAPSHOT-03 실패 checkpoint 진입");
  std::mutex provider_mu;std::condition_variable provider_cv;bool provider_entered=false,provider_release=false;
  ingress::RecordingApplicationService delayed(reader,store.catalog,true,[&](const auto& snapshot,auto* rows){
   {std::unique_lock<std::mutex> lock(provider_mu);provider_entered=true;provider_cv.notify_all();provider_cv.wait(lock,[&]{return provider_release;});}
   const auto usage=snapshot.channels.at("status-channel");rows->push_back({"status-channel","지연",true,true,false,usage.continuous_bytes,usage.event_bytes,91,92});return true;});
  auto delayed_response=std::async(std::launch::async,[&]{return delayed.Status([](const auto&){return true;});});
  {std::unique_lock<std::mutex> lock(provider_mu);Check(provider_cv.wait_for(lock,std::chrono::seconds(2),[&]{return provider_entered;}),"S11-STATUS-SNAPSHOT-03 응답 직전 지연");}
  Release(&checkpoint_release);failing.join();
  {std::lock_guard<std::mutex> lock(provider_mu);provider_release=true;provider_cv.notify_all();}
  const auto failed_response=delayed_response.get();recording::RecordingCatalogStatusSnapshot rejected;
  Check(!checkpoint_ok&&failed_response.status==503&&!store.catalog.SnapshotStatus(&rejected,nullptr),
        "S11-STATUS-SNAPSHOT-03 실패가 응답 완료 전 게시되면 503·후속 stale 거부");

  Check(store.catalog.Checkpoint(&error)&&store.catalog.SnapshotStatus(&rejected,&error),"S11-STATUS-SNAPSHOT-03 성공 checkpoint가 poison 해소");
  Check(store.catalog.MarkSegmentCorrupt("status-segment","checksum-mismatch",&error)&&store.catalog.SnapshotStatus(&rejected,&error)&&
        rejected.channels.find("status-channel")==rejected.channels.end(),"S11-STATUS-SNAPSHOT-05 후속 mutation 현재 상태 반영");
  Check(service.Status([](const auto&){return false;}).body.find("status-channel")==std::string::npos,"S11-STATUS-SNAPSHOT-04 인증 필터 유지");
 }catch(const std::exception& e){std::cerr<<"[error] "<<e.what()<<'\n';return 2;}
 std::cout<<"[summary] S11 status snapshot pass="<<pass<<" fail="<<fail<<'\n';return fail?1:0;
}

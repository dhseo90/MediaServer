// 파일 용도: 녹화 지연 추적의 집계·잠금·동시성 관측을 검증하는 실행 입력을 제공한다.
#define RECORDING_LATENCY_TRACE_TEST 1
#include "recording/recording_latency_trace.h"
#include <thread>
#include <condition_variable>
#include <string>
#include <cassert>
#include <unistd.h>
namespace L=recording::latency;
static void Sink(const char* text,std::size_t bytes) noexcept {if(L::local.depth)std::abort();(void)std::fwrite(text,1,bytes,stdout);}
int main(int argc,char** argv){
 L::test_sink=Sink;const std::string mode=argc>1?argv[1]:"contention";std::mutex mutex,other;
 if(mode=="holder-whole"||mode=="holder-overflow"||mode=="holder-late"||mode=="holder-mixed-late"){
  for(unsigned i=1;i<=(mode=="holder-mixed-late"?79U:mode=="holder-late"?6U:3U);++i){L::VisualRequestSummary request;L::VisualRequestSummary::Result(200,"ok");
   if((mode=="holder-late"&&i<4)||(mode=="holder-mixed-late"&&i<77))continue;
   std::mutex gate;std::condition_variable cv;bool ready=false;
   std::thread worker([&]{L::WorkScope work(L::Work::Index);L::Lock held(mutex,L::Source::Catalog,__LINE__,false,"index");{std::lock_guard g(gate);ready=true;cv.notify_one();}std::this_thread::sleep_for(std::chrono::milliseconds((i==1||i==4||i==77)?1100:10));L::HolderCount(2,7);});
   {std::unique_lock g(gate);cv.wait(g,[&]{return ready;});}
   {L::WorkScope work(L::Work::Visual);L::Lock waiting(mutex,L::Source::Catalog,__LINE__,false,"visual");}worker.join();
   if(mode=="holder-overflow")for(unsigned n=0;n<8193;++n){L::Lock held(mutex,L::Source::Catalog,__LINE__,false,"overflow");}
  }
 }else if(mode=="holder"){
  for(unsigned i=1;i<=77;++i){L::VisualRequestSummary request;L::VisualRequestSummary::Result(200,"ok");if(i==7||i==41||i==77){
   std::mutex gate;std::condition_variable cv;bool ready=false;
   std::thread worker([&]{L::WorkScope work(L::Work::Retention);L::Lock held(mutex,L::Source::Catalog,__LINE__,false,"retention");{std::lock_guard g(gate);ready=true;cv.notify_one();}std::this_thread::sleep_for(std::chrono::milliseconds(10));L::HolderCount(2,7);});
   {std::unique_lock g(gate);cv.wait(g,[&]{return ready;});}
   {L::WorkScope work(L::Work::Visual);L::Lock waiting(mutex,L::Source::Catalog,__LINE__,false,"visual");}
   worker.join();std::this_thread::sleep_for(std::chrono::milliseconds(1010));
  }}
 }else if(mode=="visual-summary"||mode=="visual-cap"||mode=="visual-write"){
  static_assert(sizeof(L::VisualRequestSummary)<=2048);
  if(mode=="visual-write")::close(fileno(stderr));
  const unsigned count=mode=="visual-cap"?1025:17;
  for(unsigned i=0;i<count;++i){L::VisualRequestSummary request;L::VisualPhase phase("visual-search");L::VisualRequestSummary::Index(7,19);L::VisualRequestSummary::Count(1,3);L::VisualRequestSummary::Result(i==16?503:200,i==16?"visual-source-changed":"ok");}
 }else if(mode=="slow-tail"){
  if(L::Enabled()){
   for(int i=0;i<20000;++i){L::Row row;row.o=1;row.s=5;row.l=1;row.m=1;row.b=row.a=10;row.e=20;L::Append(row,true);L::Flush();}
   for(unsigned i=1;i<=80;++i){L::Row row;row.o=1;row.s=5;row.l=i;row.m=1;row.b=row.a=i;row.e=i+10000000;L::Append(row,true);L::Flush();}
  }
 }else if(mode=="cut-lock"){
  {L::Lock lock(mutex,L::Source::Test,__LINE__,true);assert(L::Lock::Owner(mutex)==&lock);
   {L::Scope capture(L::Operation::FixedCapture,L::Source::Test,__LINE__,true);}
   {L::Lock::Unlocked unlocked(lock);assert(!L::Lock::Owner(mutex));
    std::thread append([&]{L::Lock other_owner(mutex,L::Source::Test,__LINE__,true);assert(L::Lock::Owner(mutex)==&other_owner);});append.join();
    L::Scope prepare(L::Operation::SnapshotPrepare,L::Source::Test,__LINE__,true);}
   assert(L::Lock::Owner(mutex)==&lock);L::Scope transition(L::Operation::Transition,L::Source::Test,__LINE__,true);}
  assert(!L::Lock::Owner(mutex));
 }else if(mode=="aggregate"){
  if(L::Enabled()){L::Row row;row.o=1;row.s=5;row.l=1;row.m=1;row.b=10;row.a=20;row.e=30;L::Append(row);row.b=40;row.a=45;row.e=75;L::Append(row);}
 }else if(mode=="contention"){
  std::mutex gate;std::condition_variable cv;bool owned=false,waiting=false;
  std::thread owner([&]{{L::Lock lock(mutex,L::Source::Test,__LINE__);{std::lock_guard g(gate);owned=true;cv.notify_all();}{std::unique_lock g(gate);cv.wait(g,[&]{return waiting;});}std::this_thread::sleep_for(std::chrono::milliseconds(30));L::Scope phase(L::Operation::Checkpoint,L::Source::Test,__LINE__,true);}L::FinishThread();});
  std::thread waiter([&]{{std::unique_lock g(gate);cv.wait(g,[&]{return owned;});waiting=true;cv.notify_all();}{L::Lock lock(mutex,L::Source::Test,__LINE__);}{L::Lock lock(other,L::Source::Test,__LINE__,true);}L::FinishThread();});owner.join();waiter.join();
 }else if(mode=="tls-cap"){
  L::Lock lock(mutex,L::Source::Test,__LINE__);for(int i=0;i<140;++i){L::Scope scope(L::Operation::Append,L::Source::Test,__LINE__,true);}
 }else if(mode=="cap"){
  for(int i=0;i<20000;++i){L::Scope scope(L::Operation::Query,L::Source::Test,__LINE__,true);}
 }else{
  const int count=mode=="load1800"?1800:600;
  for(int i=0;i<count;++i){L::Scope request(L::Operation::Timeline,L::Source::Test,__LINE__,true,true);{L::Scope query(L::Operation::Query,L::Source::Test,__LINE__,true);{L::Lock lock(mutex,L::Source::Test,__LINE__,true);}for(int j=0;j<15;++j){L::Lock lock(mutex,L::Source::Test,__LINE__);}{L::Scope finish(L::Operation::Finish,L::Source::Test,__LINE__,true);}}{L::Scope serialize(L::Operation::Serialize,L::Source::Test,__LINE__,true);}}
  // 180초×30fps 상당 worker bookkeeping. 샘플 내용은 기록하지 않는다.
  for(int i=0;i<5400;++i){L::Lock lock(other,L::Source::Test,__LINE__);}
 }
 L::FinishThread();return 0;
}

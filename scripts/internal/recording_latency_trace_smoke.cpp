#define RECORDING_LATENCY_TRACE_TEST 1
#include "recording/recording_latency_trace.h"
#include <thread>
#include <condition_variable>
#include <string>
#include <cassert>
namespace L=recording::latency;
static void Sink(const char* text,std::size_t bytes) noexcept {if(L::local.depth)std::abort();(void)std::fwrite(text,1,bytes,stdout);}
int main(int argc,char** argv){
 L::test_sink=Sink;const std::string mode=argc>1?argv[1]:"contention";std::mutex mutex,other;
 if(mode=="aggregate"){
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

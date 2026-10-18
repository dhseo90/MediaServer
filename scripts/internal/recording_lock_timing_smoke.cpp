// R158 focused-only: original inline definitions, no runtime archive or TEST macro.
#include "recording/recording_latency_trace.h"
#include <array>
#include <atomic>
#include <condition_variable>
#include <optional>
#include <thread>
#include <string>
#include <stdexcept>
#include <unistd.h>
namespace L=recording::latency;
struct Observation {unsigned request=0,call=0,part=1,thread=0,mutex=0;std::uint64_t cb=0,ce=0,rb=0,re=0;bool acquired=false;};
static std::array<Observation,32> records{};static std::atomic<unsigned> count{0};
static thread_local unsigned request=0;
static void Need(bool ok){if(!ok)throw std::runtime_error("focused assertion");}
struct Request {unsigned prior=request;explicit Request(unsigned id){request=id;}~Request(){request=prior;}};
struct Call {
 unsigned prior=L::local.request;Observation row;std::optional<L::Lock> lock;std::mutex& mutex;
 Call(std::mutex& m,unsigned id,bool attempt=false,bool always=true):mutex(m){
  row.request=request;row.call=id;row.thread=L::local.thread;L::local.request=id;row.cb=L::Now();
  if(attempt)lock.emplace(m,L::Source::Catalog,id,std::try_to_lock,"r158-try");
  else lock.emplace(m,L::Source::Catalog,id,always,"r158-call");
  row.ce=L::Now();row.acquired=lock->owns_lock();if(row.acquired)row.mutex=static_cast<unsigned>(L::local.mutex);
 }
 void Save(){auto n=count.fetch_add(1);Need(n<records.size());records[n]=row;}
 void Cut(){
  row.rb=L::Now();std::optional<L::Lock::Unlocked> unlocked;unlocked.emplace(*lock);row.re=L::Now();Save();
  Need(!lock->owns_lock()&&!L::Lock::Owner(mutex));
  std::thread other([&]{std::lock_guard<std::mutex> held(mutex);});other.join();
  row.part=2;row.cb=L::Now();unlocked.reset();row.ce=L::Now();row.acquired=lock->owns_lock();row.mutex=static_cast<unsigned>(L::local.mutex);Need(row.acquired);
 }
 ~Call() noexcept {row.rb=L::Now();lock.reset();row.re=L::Now();const auto n=count.fetch_add(1);if(n>=records.size())std::abort();records[n]=row;L::local.request=prior;}
};
int main(int argc,char** argv){
 const std::string mode=argc>1?argv[1]:"normal";std::mutex mutex,other;std::uint64_t ownerBegin=0,ownerRelease=0;bool contention=false;
 try {
  if(mode=="lost-output")::close(STDERR_FILENO);
  if(mode=="cap")L::emitted=16384;
  if(mode=="byte-cap")L::emitted_bytes=2*1024*1024;
  if(mode=="aggregate"||mode=="slow"){
   Request req(10); // Same original fast key intentionally aggregates; never individual attribution.
   for(unsigned i=0;i<3;++i){L::Lock lock(mutex,L::Source::Catalog,91,false,"r158-fast");}
   L::FinishThread();
  }else{
   {Request req(10);{Call cold(mutex,1);Need(cold.lock->owns_lock());}{Call warm(mutex,2);Need(warm.lock->owns_lock());}}
   {Request req(11);Call outer(mutex,3);{Call inner(other,4);Need(L::Lock::Owner(mutex)==&*outer.lock&&L::Lock::Owner(other)==&*inner.lock);}Need(L::Lock::Owner(mutex)==&*outer.lock);}
   {Request req(60);try{Call unwind(mutex,5);throw 7;}catch(int){}Need(!L::Lock::Owner(mutex));}
   {Request req(60);Call cut(mutex,6);cut.Cut();}
   {std::unique_lock<std::mutex> held(mutex);std::thread failed([&]{Request req(60);Call attempt(mutex,7,true);Need(!attempt.lock->owns_lock());});failed.join();}
   {Request req(60);Call attempt(mutex,8,true);Need(attempt.lock->owns_lock());std::this_thread::sleep_for(std::chrono::milliseconds(2));}
   // Gate proves holder ownership before waiter starts. Row overlap additionally
   // proves the real lock call entered before release; sleep only stretches it.
   std::mutex gate;std::condition_variable cv;bool armed=false;std::atomic<bool> acquired{false};
   std::unique_lock<std::mutex> held(mutex);ownerBegin=L::Now();
   std::thread waiter([&]{Request req(10);{std::lock_guard<std::mutex> g(gate);armed=true;cv.notify_one();}Call waiting(mutex,9);acquired=true;});
   {std::unique_lock<std::mutex> g(gate);cv.wait(g,[&]{return armed;});}
   std::this_thread::sleep_for(std::chrono::milliseconds(20));Need(!acquired.load());ownerRelease=L::Now();held.unlock();waiter.join();Need(acquired.load());contention=true;
   Need(!L::Lock::Owner(mutex)&&!L::Lock::Owner(other)&&L::local.depth==0&&L::local.request==0);
   // Another thread can acquire after all RAII objects/exception scopes finish.
   std::thread released([&]{Need(mutex.try_lock());mutex.unlock();Need(other.try_lock());other.unlock();});released.join();L::FinishThread();
  }
  for(unsigned i=0;i<count;++i){const auto& r=records[i];std::printf("[R158-call] {\"request\":%u,\"call\":%u,\"part\":%u,\"thread\":%u,\"mutex\":%u,\"cb\":%llu,\"ce\":%llu,\"rb\":%llu,\"re\":%llu,\"acquired\":%s}\n",r.request,r.call,r.part,r.thread,r.mutex,(unsigned long long)r.cb,(unsigned long long)r.ce,(unsigned long long)r.rb,(unsigned long long)r.re,r.acquired?"true":"false");}
  std::printf("[R158-end] {\"calls\":%u,\"enabled\":%s,\"holder\":%s,\"slow\":%s,\"contention\":%s,\"ownerBegin\":%llu,\"ownerRelease\":%llu,\"cleanup\":true,\"loss\":%s}\n",count.load(),L::Enabled()?"true":"false",L::HolderEnabled()?"true":"false",L::SlowOnly()?"true":"false",contention?"true":"false",(unsigned long long)ownerBegin,(unsigned long long)ownerRelease,(L::local.loss||L::loss_emitted)?"true":"false");
  return std::fflush(stdout)==0?0:2;
 }catch(...){std::fputs("[R158-failure] focused\n",stdout);std::fflush(stdout);return 1;}
}

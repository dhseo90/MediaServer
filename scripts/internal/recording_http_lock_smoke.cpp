#include "recording_http_lock_probe.h"
#include <stdexcept>
#include <thread>
static void Need(bool ok){if(!ok)throw std::runtime_error("R159 focused");}
void Inner(std::mutex& m){r159::Call call(1,__LINE__);call.Begin();recording::latency::Lock lock(m,recording::latency::Source::Catalog,__LINE__,call.Selected());call.Acquired(lock.owns_lock());r159::Release release{call};}
void Outer(std::mutex& m,std::mutex& other){r159::Call call(0,__LINE__);call.Begin();recording::latency::Lock lock(m,recording::latency::Source::Catalog,__LINE__,call.Selected());call.Acquired(lock.owns_lock());r159::Release release{call};auto identity=recording::latency::local.request;Inner(other);Need(recording::latency::local.request==identity);}
void Unwind(std::mutex& m){r159::Call call(2,__LINE__);call.Begin();recording::latency::Lock lock(m,recording::latency::Source::Catalog,__LINE__,call.Selected());call.Acquired(lock.owns_lock());r159::Release release{call};throw 7;}
int main(int argc,char**){
 std::mutex m,other;bool done=false;{
  const auto before=recording::latency::local.request;r159::Window window(10,done);
  if(argc>1){window.record.count=r159::Cap;r159::Call overflow(0,__LINE__);Need(r154::loss);done=true;}
  else{Outer(m,other);try{Unwind(m);}catch(int){}Need(recording::latency::local.request==before&&window.record.count==3&&!window.record.depth);done=true;}
 }
 std::thread check([&]{Need(m.try_lock());m.unlock();Need(other.try_lock());other.unlock();});check.join();Need(!recording::latency::local.depth&&!recording::latency::local.request);
 std::puts("[R159-focused] TLS/nested/unwind/release PASS");return 0;
}

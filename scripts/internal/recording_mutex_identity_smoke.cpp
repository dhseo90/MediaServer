// 파일 용도: 내부 진단 전용으로 제품 mutex를 유지하며 identity 수명과 유한 용량을 검증한다.
#define RECORDING_LATENCY_TRACE_TEST 1
#include "recording/recording_latency_trace.h"
#include <cassert>
#include <memory>
#include <new>
#include <thread>
#include <vector>
#include <string>
namespace L=recording::latency;
struct Owner {std::mutex mutex;L::MutexIdentity identity{&mutex};};
static void Sink(const char* p,std::size_t n) noexcept {assert(!L::local.depth);std::fwrite(p,1,n,stdout);}
static void Record(Owner& owner,bool always=true){L::Lock lock(owner.mutex,L::Source::Test,__LINE__,always);}
int main(int argc,char** argv){
    assert(argc==2);L::test_sink=Sink;const std::string mode=argv[1];
    if(mode=="127"||mode=="128"||mode=="129"){
        const auto n=std::stoul(mode);std::vector<std::unique_ptr<Owner>> owners;
        for(unsigned i=0;i<n;++i)owners.emplace_back(std::make_unique<Owner>());
        assert(L::mutex_registry.active==std::min(n,128UL));
        for(auto& owner:owners)Record(*owner);
        owners.clear();
    }else if(mode=="release-at-capacity"){
        std::array<std::unique_ptr<Owner>,128> owners;
        for(auto& owner:owners)owner=std::make_unique<Owner>();
        for(auto& owner:owners)Record(*owner);
        owners[0].reset();owners[0]=std::make_unique<Owner>();Record(*owners[0]);
        assert(L::mutex_registry.active==128);
    }else if(mode=="duplicate-owner"){
        Owner owner;L::MutexIdentity duplicate(&owner.mutex);Record(owner);
    }else if(mode=="sequential"){
        for(unsigned i=0;i<129;++i){Owner owner;Record(owner);}
    }else if(mode=="reuse-buffered"){
        alignas(Owner) unsigned char storage[sizeof(Owner)];L::local.request=7;
        for(unsigned i=0;i<2;++i){auto* owner=new(storage) Owner;Record(*owner,false);owner->~Owner();assert(L::mutex_registry.active==0);}
        // 보유한 fast event는 양쪽 mutex 객체보다 오래 살며 pointer를 읽지 않는다.
        assert(L::local.fast[0].m!=L::local.fast[1].m);L::FinishThread();L::local.request=0;
    }else if(mode=="concurrent"){
        std::atomic<unsigned> ready{0};std::atomic<bool> start{false};std::vector<std::thread> threads;
        for(unsigned i=0;i<8;++i)threads.emplace_back([&]{++ready;while(!start.load())std::this_thread::yield();
            L::local.request=L::local.thread;for(unsigned j=0;j<16;++j){Owner owner;Record(owner,false);}L::FinishThread();});
        while(ready!=8)std::this_thread::yield();start=true;for(auto& thread:threads)thread.join();
    }else if(mode=="shared"){
        Owner owner;std::vector<std::thread> threads;
        for(unsigned i=0;i<8;++i)threads.emplace_back([&]{for(unsigned j=0;j<8;++j)Record(owner);L::FinishThread();});
        for(auto& thread:threads)thread.join();
    }else if(mode=="disabled"){
        Owner owner;Record(owner);assert(L::mutex_registry.next==1&&L::mutex_registry.active==0);
    }else if(mode=="unregistered"){
        std::mutex mutex;L::Lock lock(mutex,L::Source::Test,__LINE__,true);
    }else if(mode=="exhaustion"){
        L::mutex_registry.next=L::MaxMutexIdentity;
        {Owner owner;Record(owner);} {Owner owner;Record(owner);}
        assert(L::mutex_registry.next==std::uint64_t(L::MaxMutexIdentity)+1);
    }else return 2;
    L::FinishThread();assert(L::mutex_registry.active==0);
    return 0;
}

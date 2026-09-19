// 내부 검증 전용: 원본 mutex/제품 계약을 바꾸지 않는 bounded steady-clock 계측.
#pragma once
#include <array>
#include <atomic>
#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <cstdint>
#include <mutex>

namespace recording::latency {
enum class Source : unsigned { Catalog=1, Projection=2, Read=3, Application=4, Test=5 };
enum class Operation : unsigned { Lock=1, Timeline=2, Query=3, Finish=4, Serialize=5, Checkpoint=6, Append=7, ApplyJob=8, Sqlite=9, ValidateSources=10 };
inline bool Enabled() noexcept {static const bool enabled=[] {const char* p=std::getenv("MEDIA_SERVER_VERIFY_RECORDING_LATENCY_TRACE");return p&&std::strcmp(p,"1")==0;}();return enabled;}
inline std::uint64_t Now() noexcept {static const auto epoch=std::chrono::steady_clock::now();return static_cast<std::uint64_t>(std::chrono::duration_cast<std::chrono::nanoseconds>(std::chrono::steady_clock::now()-epoch).count());}
// k: 0=lock span, 1=phase span, 2=fast aggregate, 3=diagnostic loss.
struct Row {std::uint64_t k=0,o=0,s=0,l=0,m=0,t=0,r=0,b=0,a=0,e=0,n=0,w=0,h=0,x=0,y=0;};
inline std::atomic<unsigned> next_thread{0},next_request{0},emitted{0};
inline std::atomic<std::size_t> emitted_bytes{0};
inline std::atomic<bool> loss_emitted{false};
inline std::array<std::atomic<const void*>,128> mutexes{};
struct Local {unsigned thread=++next_thread,request=0,depth=0;std::uint64_t mutex=0;std::array<Row,128> rows{};std::size_t used=0;std::array<Row,32> fast{};unsigned fast_events=0;bool loss=false;~Local();};
inline thread_local Local local;
inline unsigned MutexId(const void* p) noexcept {for(unsigned i=0;i<mutexes.size();++i){auto value=mutexes[i].load();if(value==p)return i+1;if(!value&&mutexes[i].compare_exchange_strong(value,p))return i+1;if(value==p)return i+1;}local.loss=true;return 0;}
#ifdef RECORDING_LATENCY_TRACE_TEST
using Sink=void(*)(const char*,std::size_t) noexcept;
inline Sink test_sink=nullptr;
#endif
inline void SinkLine(const char* text,std::size_t bytes) noexcept {
#ifdef RECORDING_LATENCY_TRACE_TEST
    if(test_sink){test_sink(text,bytes);return;}
#endif
    (void)std::fwrite(text,1,bytes,stderr);
}
inline void Emit(const Row& v) noexcept {
    char text[512];const int size=std::snprintf(text,sizeof(text),"[recording-latency] {\"k\":%llu,\"o\":%llu,\"s\":%llu,\"l\":%llu,\"m\":%llu,\"t\":%llu,\"r\":%llu,\"b\":%llu,\"a\":%llu,\"e\":%llu,\"n\":%llu,\"w\":%llu,\"h\":%llu,\"x\":%llu,\"y\":%llu}\n",
        (unsigned long long)v.k,(unsigned long long)v.o,(unsigned long long)v.s,(unsigned long long)v.l,(unsigned long long)v.m,(unsigned long long)v.t,(unsigned long long)v.r,(unsigned long long)v.b,(unsigned long long)v.a,(unsigned long long)v.e,(unsigned long long)v.n,(unsigned long long)v.w,(unsigned long long)v.h,(unsigned long long)v.x,(unsigned long long)v.y);
    if(size<=0||size>=static_cast<int>(sizeof(text))){local.loss=true;return;}
    if(v.k!=3&&(emitted.fetch_add(1)>=16384||emitted_bytes.fetch_add(static_cast<std::size_t>(size))>2*1024*1024-512-static_cast<std::size_t>(size))){local.loss=true;return;}
    SinkLine(text,static_cast<std::size_t>(size));
}
inline void Flush() noexcept {
    if(local.depth)return;
    for(std::size_t i=0;i<local.used;++i)Emit(local.rows[i]);local.used=0;
    if(local.loss&&!loss_emitted.exchange(true)){Row loss;loss.k=3;loss.n=1;Emit(loss);}
}
inline void Append(Row row,bool always=false) noexcept {
    row.t=local.thread;row.r=local.request;row.n=1;row.w=row.a-row.b;row.h=row.e-row.a;row.x=row.w;row.y=row.h;
    if(!always&&row.w<1000000&&row.h<1000000){
        for(auto& value:local.fast)if(value.n==0||(value.o==row.o&&value.m==row.m)){
            if(!value.n){value=row;value.k=2;value.s=0;value.l=0;}else{value.e=row.e;value.n++;value.w+=row.w;value.h+=row.h;if(row.w>value.x)value.x=row.w;if(row.h>value.y)value.y=row.h;}
            ++local.fast_events;return;
        }
        local.loss=true;return;
    }
    if(local.used==local.rows.size()){local.loss=true;return;}local.rows[local.used++]=row;
}
inline void FlushFast() noexcept {for(auto& row:local.fast)if(row.n){if(local.used<local.rows.size())local.rows[local.used++]=row;else local.loss=true;row={};}local.fast_events=0;Flush();}
class Lock {
    std::mutex& mutex_;bool enabled_;Row row_;std::uint64_t previous_=0;
public:
    Lock(std::mutex& mutex,Source source,unsigned line,bool always=false):mutex_(mutex),enabled_(Enabled()),always_(always){
        if(enabled_){row_.o=1;row_.s=static_cast<unsigned>(source);row_.l=line;row_.m=MutexId(&mutex);row_.b=Now();}
        mutex_.lock();
        if(enabled_){row_.a=Now();previous_=local.mutex;local.mutex=row_.m;++local.depth;}
    }
    ~Lock() noexcept {if(enabled_)row_.e=Now();mutex_.unlock();if(enabled_){--local.depth;local.mutex=previous_;Append(row_,always_);if(!local.request&&local.fast_events>=256)FlushFast();else Flush();}}
    Lock(const Lock&)=delete;Lock& operator=(const Lock&)=delete;
private:bool always_;
};
class Scope {
    bool enabled_,always_,request_;Row row_;unsigned previous_=0;
public:
    Scope(Operation operation,Source source,unsigned line,bool always=false,bool request=false) noexcept:enabled_(Enabled()),always_(always),request_(request){
        if(!enabled_)return;if(request_){FlushFast();previous_=local.request;local.request=++next_request;}
        row_.k=1;row_.o=static_cast<unsigned>(operation);row_.s=static_cast<unsigned>(source);row_.l=line;row_.m=local.mutex;row_.b=row_.a=Now();
    }
    ~Scope() noexcept {if(!enabled_)return;row_.e=Now();Append(row_,always_);if(request_){FlushFast();local.request=previous_;}else Flush();}
    Scope(const Scope&)=delete;Scope& operator=(const Scope&)=delete;
};
inline void FinishThread() noexcept {if(Enabled())FlushFast();}
inline Local::~Local(){if(Enabled())FlushFast();}
} // namespace recording::latency

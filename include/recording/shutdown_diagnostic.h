// 파일 용도: 격리 검증용 고정 크기 숫자 진단을 제공하며 제품 순서·잠금·취소 의미를 바꾸지 않는다.
#pragma once
#include <atomic>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <cerrno>
#include <ctime>
#include <unistd.h>
namespace recording::shutdown_probe {
inline bool Enabled(){static const bool v=[] {const char* p=std::getenv("MEDIA_SERVER_SHUTDOWN_PROBE");return p&&(std::strcmp(p,"1")==0||std::strcmp(p,"stop")==0);}();return v;}
inline bool StopOnly(){static const bool v=[] {const char* p=std::getenv("MEDIA_SERVER_SHUTDOWN_PROBE");return p&&std::strcmp(p,"stop")==0;}();return v;}
inline std::atomic<bool> signaled{false};
static_assert(std::atomic<bool>::is_always_lock_free && std::atomic<unsigned>::is_always_lock_free);
inline unsigned long long Now() noexcept {timespec t{};clock_gettime(CLOCK_MONOTONIC,&t);return static_cast<unsigned long long>(t.tv_sec)*1000000000ULL+t.tv_nsec;}
inline std::atomic<unsigned> sequence{0},threads{0},rows{0};
inline std::atomic<unsigned> structured{0},visual{0},writer{0},index{0};
inline thread_local unsigned thread_id=++threads;
inline void Emit(const char* stage,const char* edge,unsigned id=0,unsigned value=0,unsigned long long begin_ns=0) noexcept {
 if(!Enabled()||(StopOnly()&&!signaled.load(std::memory_order_relaxed)))return;const auto row=rows.fetch_add(1);if(row>=2048){if(row==2048){constexpr char x[]="[shutdown-loss] cap\n";::write(2,x,sizeof(x)-1);}return;}
 char b[512];const int n=std::snprintf(b,sizeof(b),"[shutdown] {\"ns\":%llu,\"thread\":%u,\"stage\":\"%s\",\"edge\":\"%s\",\"id\":%u,\"value\":%u,\"active\":[%u,%u,%u,%u],\"beginNs\":%llu}\n",Now(),thread_id,stage,edge,id,value,structured.load(),visual.load(),writer.load(),index.load(),begin_ns);
 if(n>0&&n<int(sizeof(b))&&::write(2,b,n)!=n){constexpr char x[]="[shutdown-loss] write\n";::write(2,x,sizeof(x)-1);}
}
struct Scope {const char* stage;unsigned id=0;unsigned long long begin_ns=0;std::atomic<unsigned>* count=nullptr;
 explicit Scope(const char* s,bool selected=true):stage(s){if(!selected||!Enabled())return;id=++sequence;begin_ns=Now();if(!std::strcmp(s,"structured"))count=&structured;else if(!std::strcmp(s,"visual-search"))count=&visual;else if(!std::strcmp(s,"writer-finalize"))count=&writer;else if(!std::strcmp(s,"index-rebuild"))count=&index;if(count)++*count;Emit(stage,"begin",id,0,begin_ns);}
 void End(){if(id){Emit(stage,"end",id,0,begin_ns);if(count)--*count;id=0;}}
 ~Scope(){End();}
};
// main의 선택 활성화 초기화 뒤에만 호출하며 POSIX 비동기 signal 안전 호출만 사용한다.
// 정수를 직접 인코딩해 handler에서 stdio·할당·getenv·mutex 사용을 피한다.
inline void Signal(int number) noexcept {
 const int saved=errno;signaled.store(true,std::memory_order_relaxed);char b[256];unsigned n=0;auto str=[&](const char* s){while(*s)b[n++]=*s++;};auto num=[&](unsigned long long v){char a[24];unsigned k=0;do{a[k++]=char('0'+v%10);v/=10;}while(v);while(k)b[n++]=a[--k];};
 str("[shutdown-signal] {\"ns\":");num(Now());str(",\"signal\":");num(number);str(",\"pid\":");num(getpid());str(",\"active\":[");num(structured.load(std::memory_order_relaxed));str(",");num(visual.load(std::memory_order_relaxed));str(",");num(writer.load(std::memory_order_relaxed));str(",");num(index.load(std::memory_order_relaxed));str("]}\n");::write(2,b,n);errno=saved;
}
}

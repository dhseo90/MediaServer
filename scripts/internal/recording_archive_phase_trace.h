#pragma once
// 파일 용도: 소유 진단 복제본 전용. phase 종료는 성공을 뜻하지 않으며 원문은 받지 않는다.
#include <chrono>
#include <cstdio>
#include <cstdint>
#include <cerrno>
#include <mutex>
#include <unistd.h>
#include <utility>
#include <atomic>
#include <cstdlib>
namespace archive_phase {
enum class Phase { JournalOpen,CatalogOpen,Open,OpenReplay,OpenPreflight,OpenApply,SqliteOpen,
    Rebuild,RebuildReplay,RebuildPreflight,RebuildClear,RebuildProject,Release,Query,Media,Digest,Output,Destruct,CatalogDestruct };
inline const char* Name(Phase p) noexcept {
    switch(p){
#define ARCHIVE_NAME(a,b) case Phase::a:return b;
    ARCHIVE_NAME(JournalOpen,"journal-open") ARCHIVE_NAME(CatalogOpen,"catalog-open")
    ARCHIVE_NAME(Open,"open") ARCHIVE_NAME(OpenReplay,"open-replay") ARCHIVE_NAME(OpenPreflight,"open-preflight")
    ARCHIVE_NAME(OpenApply,"open-apply") ARCHIVE_NAME(SqliteOpen,"sqlite-open")
    ARCHIVE_NAME(Rebuild,"rebuild") ARCHIVE_NAME(RebuildReplay,"rebuild-replay") ARCHIVE_NAME(RebuildPreflight,"rebuild-preflight")
    ARCHIVE_NAME(RebuildClear,"rebuild-clear") ARCHIVE_NAME(RebuildProject,"rebuild-project")
    ARCHIVE_NAME(Release,"release") ARCHIVE_NAME(Query,"query") ARCHIVE_NAME(Media,"media")
    ARCHIVE_NAME(Digest,"digest") ARCHIVE_NAME(Output,"output")
    ARCHIVE_NAME(Destruct,"destruct") ARCHIVE_NAME(CatalogDestruct,"catalog-destruct")
#undef ARCHIVE_NAME
    }return "invalid";
}
inline const auto origin=std::chrono::steady_clock::now();
inline std::mutex output_mutex;
inline std::atomic<std::uint64_t> sequence{0};
inline std::uint64_t rows=0,bytes=0;
inline std::atomic<bool> lost{false};
inline bool Enabled() noexcept {const char* value=std::getenv("MEDIA_SERVER_ARCHIVE_PHASE_TRACE");return value&&value[0]=='1'&&value[1]=='\0';}
inline std::uint64_t Now() noexcept {return std::chrono::duration_cast<std::chrono::microseconds>(std::chrono::steady_clock::now()-origin).count();}
inline bool Write(const char* data,std::size_t size) noexcept {
    while(size){const auto n=::write(STDERR_FILENO,data,size);if(n<0&&errno==EINTR)continue;if(n<=0)return false;data+=n;size-=n;}return true;
}
inline void Loss() noexcept {
    if(lost.exchange(true))return;constexpr char line[]="[archive-phase] {\"kind\":\"loss\"}\n";
    Write(line,sizeof(line)-1);
}
inline void Emit(Phase phase,bool begin,std::uint64_t id,std::uint64_t started) noexcept {
    if(!Enabled())return;
    try{std::lock_guard lock(output_mutex);if(lost)return;
        char line[256];const auto now=begin?started:Now();const int n=std::snprintf(line,sizeof(line),
            "[archive-phase] {\"kind\":\"%s\",\"phase\":\"%s\",\"id\":%llu,\"atUs\":%llu,\"elapsedUs\":%llu}\n",
            begin?"begin":"end",Name(phase),static_cast<unsigned long long>(id),static_cast<unsigned long long>(now),
            static_cast<unsigned long long>(begin?0:now-started));
        if(n<=0||static_cast<std::size_t>(n)>=sizeof(line)||rows>=255||bytes+static_cast<std::size_t>(n)>128U*1024U-64U){Loss();return;}
        ++rows;bytes+=n;if(!Write(line,n))Loss();
    }catch(...){Loss();}
}
struct Scope {
    Phase phase;std::uint64_t id,started;
    explicit Scope(Phase p):phase(p),id(++sequence),started(Now()){Emit(phase,true,id,started);}
    ~Scope(){Emit(phase,false,id,started);}
    Scope(const Scope&)=delete;Scope& operator=(const Scope&)=delete;
};
template<class F> auto Call(Phase p,F&& f)->decltype(f()){Scope scope(p);return f();}
template<class F> struct Exit {F f;~Exit(){f();}};
template<class F> Exit<F> OnExit(F f){return {std::move(f)};}
}

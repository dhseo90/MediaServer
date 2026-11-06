// 파일 용도: P1 선택 활성화 테스트 진단을 8192개 고정 record에 기록하며 producer 경로에서 제품 lock·파일 I/O를 사용하지 않는다.
#pragma once
#include <array>
#include <algorithm>
#include <atomic>
#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <cstdint>
#include <string_view>
namespace recording::recorder_probe {
inline bool Enabled(){static const bool yes=[] {auto* p=std::getenv("MEDIA_SERVER_VERIFY_RECORDER_P1");return p&&std::strcmp(p,"1")==0;}();return yes;}
inline std::uint64_t Now(){return std::chrono::duration_cast<std::chrono::nanoseconds>(std::chrono::steady_clock::now().time_since_epoch()).count();}
inline std::uint64_t Key(std::string_view text){std::uint64_t n=14695981039346656037ULL;for(auto c:text){n^=static_cast<unsigned char>(c);n*=1099511628211ULL;}return n;}
inline std::atomic<std::uint64_t> threads{0};
inline thread_local std::uint64_t thread_id=++threads,channel=0,generation=0,ordinal=0;
struct Row {const char* kind=nullptr;std::uint64_t thread=0,channel=0,generation=0,ordinal=0,begin=0,end=0,x=0,y=0,z=0;};
struct Store {
 std::atomic<std::uint64_t> count{0};std::array<Row,8192> rows{};
 ~Store(){const auto n=count.load();if(!n)return;for(std::uint64_t i=0;i<std::min<std::uint64_t>(n,rows.size());++i){const auto& r=rows[i];
 std::fprintf(stderr,"[recorder-p1] %s %llu %llu %llu %llu %llu %llu %llu %llu %llu\n",r.kind?r.kind:"incomplete",(unsigned long long)r.thread,(unsigned long long)r.channel,(unsigned long long)r.generation,(unsigned long long)r.ordinal,(unsigned long long)r.begin,(unsigned long long)r.end,(unsigned long long)r.x,(unsigned long long)r.y,(unsigned long long)r.z);}
 std::fprintf(stderr,"[recorder-p1-summary] records=%llu retained=%llu dropped=%llu bytes=%zu\n",(unsigned long long)n,(unsigned long long)std::min<std::uint64_t>(n,rows.size()),(unsigned long long)(n>rows.size()?n-rows.size():0),sizeof(*this));}
};
inline Store store;
inline void Record(const char* kind,std::uint64_t begin,std::uint64_t end,std::uint64_t x=0,std::uint64_t y=0,std::uint64_t z=0){
 if(!Enabled())return;const auto i=store.count.fetch_add(1,std::memory_order_relaxed);if(i>=store.rows.size())return;
 store.rows[i]={kind,thread_id,channel,generation,ordinal,begin,end,x,y,z};
}
struct Context {std::uint64_t c=channel,g=generation,o=ordinal;Context(std::uint64_t ch,std::uint64_t gen,std::uint64_t ord){channel=ch;generation=gen;ordinal=ord;}~Context(){channel=c;generation=g;ordinal=o;}};
struct Span {const char* name;std::uint64_t begin=Enabled()?Now():0;explicit Span(const char* n):name(n){}~Span(){if(begin)Record(name,begin,Now());}};
}

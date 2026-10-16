// 파일 용도: 검증 모드의 요청별 bounded 검색 실패 사유. 공개 응답/원문 payload와 독립이다.
#pragma once
#include <array>
#include <chrono>
#include "recording/recording_latency_trace.h"
#include "recording/recording_memory_reservation.h"
#include <atomic>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <cstdint>
#include <string>
#ifdef RECORDING_SEARCH_TESTING
#include <functional>
#endif
namespace recording {
#ifdef RECORDING_SEARCH_TESTING
// Linked only by the focused test's reader translation unit; no product request can set it.
inline thread_local std::function<void()> search_after_capture_test;
#endif
// 최초 거부의 실제 Add 피연산자. thread-local 고정 크기이며 원문을 보유하지 않는다.
struct SearchCapacityDiagnostic {
    const char* stage="none"; const char* condition="none";
    std::size_t max_documents=0,max_bytes=0,documents=0,capacity=0,index=0,before=0,addition=0;
};
inline thread_local SearchCapacityDiagnostic search_capacity_diagnostic;
inline void SearchCapacityBegin(const char* stage,std::size_t docs,std::size_t bytes,std::size_t size,std::size_t capacity) noexcept {
    search_capacity_diagnostic={stage,"none",docs,bytes,size,capacity,0,0,0};
}
inline void SearchCapacityReject(const char* condition,std::size_t before,std::size_t addition) noexcept {
    auto& d=search_capacity_diagnostic;if(std::strcmp(d.condition,"none"))return;
    d.condition=condition;d.before=before;d.addition=addition;
}
struct SearchDiagnostic {
    struct Attempt {const char* stage="start";const char* reason="none";std::uint64_t instance=0,current_instance=0,captured=0,current=0,documents=0,references=0;bool rebuild=false,authority=false;};
    std::array<Attempt,3> attempts{};
    struct Cost {const char* name;std::uint64_t begin,end;};
    std::array<Cost,40> costs{};unsigned cost_count=0;bool cost_loss=false;
    static inline std::atomic<unsigned> sequence{0};
    unsigned id=0;std::uint64_t entered=0;
    static std::uint64_t Tick() noexcept {return std::chrono::duration_cast<std::chrono::nanoseconds>(std::chrono::steady_clock::now().time_since_epoch()).count();}
    static void CostRow(const char* name,std::uint64_t begin,std::uint64_t end) noexcept {
        if(!active||!active->id)return;
        if(active->cost_count==active->costs.size()){active->cost_loss=true;return;}
        active->costs[active->cost_count++]={name,begin,end};
    }
    struct Phase {const char* name;std::uint64_t begin;explicit Phase(const char* value):name(value),begin(active&&active->id?Tick():0){}~Phase(){if(begin)CostRow(name,begin,Tick());}};
    unsigned attempt=0,channels=0;int status=503;const char* exception="none";
    const SearchModelResidency* resources=nullptr;std::size_t rejection_start=0;
    SearchDiagnostic* previous=nullptr;
    static inline thread_local SearchDiagnostic* active=nullptr;
    static bool Enabled() noexcept {const char* p=std::getenv("MEDIA_SERVER_VERIFY_RECORDING_SEARCH_TRACE");return p&&std::strcmp(p,"1")==0;}
    static void Write(const char* data,std::size_t size) noexcept {
        if(std::fwrite(data,1,size,stderr)!=size||std::fflush(stderr)!=0) {
            // Parent captures both streams; stdout fallback reports an incomplete trace, never raw data.
            std::fputs("[search-failure-loss]\n",stdout);std::fflush(stdout);
        }
    }
    explicit SearchDiagnostic(const SearchModelResidency* value=nullptr) noexcept : resources(value),rejection_start(value?value->rejected():0) {
        previous=active;active=this;search_capacity_diagnostic={};
        if(Enabled()){id=++sequence;entered=Tick();if(id>128)id=0;}
        if(Enabled()){static std::atomic<bool> probe{false};if(!probe.exchange(true))
            {constexpr char probe_line[]="[search-failure-probe] {\"version\":1,\"attempts\":3}\n";Write(probe_line,sizeof(probe_line)-1);}}
    }
    static void Stage(const char* stage) noexcept {if(active)active->attempts[active->attempt].stage=stage;}
    static void Reason(const std::string& value) noexcept {
        if(!active)return;
        // Only known codes; never exception.what(), paths, query strings or credentials.
        const char* code="internal-unavailable";
        for(const char* known:{"search-source-changed","search-source-unavailable","search-capacity-exceeded","search-playback-candidate-capacity","search-snapshot-capacity","search-event-evidence-incomplete","search-snapshot-expired","search-cursor-binding-mismatch","search-invalid-cursor","search-invalid-query"})
            if(value==known){code=known;break;}
        active->attempts[active->attempt].reason=code;
    }
    static void Source(std::uint64_t instance,std::uint64_t captured,std::uint64_t current,std::uint64_t current_instance,bool authority,bool rebuild,std::size_t docs,std::size_t refs) noexcept {
        if(!active)return;
        auto& a=active->attempts[active->attempt];a.instance=instance;a.current_instance=current_instance;a.captured=captured;a.current=current;a.authority=authority;a.rebuild=rebuild;a.documents=docs;a.references=refs;
    }
    ~SearchDiagnostic() noexcept {
        active=previous;
        if(id) {
            char line[6144];int n=std::snprintf(line,sizeof(line),"[search-request-cost] {\"id\":%u,\"thread\":%u,\"startNs\":%llu,\"endNs\":%llu,\"status\":%d,\"loss\":%s,\"phases\":[",id,latency::local.thread,(unsigned long long)entered,(unsigned long long)Tick(),status,cost_loss?"true":"false");
            for(unsigned i=0;i<cost_count&&n>0&&n<int(sizeof(line));++i){const auto& c=costs[i];n+=std::snprintf(line+n,sizeof(line)-n,"%s[\"%s\",%llu,%llu]",i?",":"",c.name,(unsigned long long)c.begin,(unsigned long long)c.end);}
            if(n>0&&n+4<int(sizeof(line))){std::memcpy(line+n,"]}\n",3);n+=3;Write(line,static_cast<std::size_t>(n));}else Write("[search-cost-loss]\n",18);
        }
        if(!Enabled()||status<500)return;
        const auto& c=search_capacity_diagnostic;
        if(std::strcmp(c.condition,"none")) {
            char capacity_line[512];const int count=std::snprintf(capacity_line,sizeof(capacity_line),
                "[search-capacity] {\"stage\":\"%s\",\"condition\":\"%s\",\"maxDocuments\":%zu,\"maxBytes\":%zu,\"documents\":%zu,\"capacity\":%zu,\"index\":%zu,\"before\":%zu,\"addition\":%zu}\n",
                c.stage,c.condition,c.max_documents,c.max_bytes,c.documents,c.capacity,c.index,c.before,c.addition);
            if(count>0&&count<int(sizeof(capacity_line)))Write(capacity_line,static_cast<std::size_t>(count));
        }
        // One terminal request record, at most three fixed numeric/code attempts (<2KiB).
        char line[2048];int n=std::snprintf(line,sizeof(line),"[search-failure] {\"version\":1,\"status\":%d,\"channels\":%u,\"exception\":\"%s\",\"resourceRejectionsBefore\":%llu,\"resourceRejectionsAfter\":%llu,\"attempts\":[",status,channels,exception,(unsigned long long)rejection_start,(unsigned long long)(resources?resources->rejected():0));
        for(unsigned i=0;i<=attempt&&n>0&&n<int(sizeof(line));++i){const auto& a=attempts[i];n+=std::snprintf(line+n,sizeof(line)-n,
            "%s{\"stage\":\"%s\",\"reason\":\"%s\",\"instance\":%llu,\"currentInstance\":%llu,\"captured\":%llu,\"current\":%llu,\"documents\":%llu,\"references\":%llu,\"rebuild\":%s,\"authority\":%s}",i?",":"",a.stage,a.reason,(unsigned long long)a.instance,(unsigned long long)a.current_instance,(unsigned long long)a.captured,(unsigned long long)a.current,(unsigned long long)a.documents,(unsigned long long)a.references,a.rebuild?"true":"false",a.authority?"true":"false");}
        if(n>0&&n+4<int(sizeof(line))){std::memcpy(line+n,"]}\n",3);n+=3;Write(line,static_cast<std::size_t>(n));}
        else {constexpr char loss[]="[search-failure-loss]\n";Write(loss,sizeof(loss)-1);}
    }
};
} // namespace recording

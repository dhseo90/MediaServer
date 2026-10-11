// 파일 용도: 검증 모드의 요청별 bounded 검색 실패 사유. 공개 응답/원문 payload와 독립이다.
#pragma once
#include <array>
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
struct SearchDiagnostic {
    struct Attempt {const char* stage="start";const char* reason="none";std::uint64_t instance=0,current_instance=0,captured=0,current=0,documents=0,references=0;bool rebuild=false,authority=false;};
    std::array<Attempt,3> attempts{};
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
        previous=active;active=this;
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
        if(!Enabled()||status<500)return;
        // One terminal request record, at most three fixed numeric/code attempts (<2KiB).
        char line[2048];int n=std::snprintf(line,sizeof(line),"[search-failure] {\"version\":1,\"status\":%d,\"channels\":%u,\"exception\":\"%s\",\"resourceRejectionsBefore\":%llu,\"resourceRejectionsAfter\":%llu,\"attempts\":[",status,channels,exception,(unsigned long long)rejection_start,(unsigned long long)(resources?resources->rejected():0));
        for(unsigned i=0;i<=attempt&&n>0&&n<int(sizeof(line));++i){const auto& a=attempts[i];n+=std::snprintf(line+n,sizeof(line)-n,
            "%s{\"stage\":\"%s\",\"reason\":\"%s\",\"instance\":%llu,\"currentInstance\":%llu,\"captured\":%llu,\"current\":%llu,\"documents\":%llu,\"references\":%llu,\"rebuild\":%s,\"authority\":%s}",i?",":"",a.stage,a.reason,(unsigned long long)a.instance,(unsigned long long)a.current_instance,(unsigned long long)a.captured,(unsigned long long)a.current,(unsigned long long)a.documents,(unsigned long long)a.references,a.rebuild?"true":"false",a.authority?"true":"false");}
        if(n>0&&n+4<int(sizeof(line))){std::memcpy(line+n,"]}\n",3);n+=3;Write(line,static_cast<std::size_t>(n));}
        else {constexpr char loss[]="[search-failure-loss]\n";Write(loss,sizeof(loss)-1);}
    }
};
} // namespace recording

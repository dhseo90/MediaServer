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
#include <string_view>
#ifdef RECORDING_SEARCH_TESTING
#include <functional>
#endif
namespace recording {
#ifdef RECORDING_SEARCH_TESTING
// Linked only by the focused test's reader translation unit; no product request can set it.
inline thread_local std::function<void()> search_after_capture_test;
inline thread_local void (*search_diagnostic_sink_test)(const char*,std::size_t) noexcept=nullptr;
inline thread_local std::function<void()> search_outside_raw_cut_test;
inline thread_local std::function<void()> search_after_build_test;
// Focused build TU only: actual sorting/merge work, never a product trace.
inline thread_local std::array<std::size_t,3> search_order_work_test{};
// Existing focused TU hooks: authenticated V2 raw rows, new projections,
// shared projections, optional sharing fallback. Never a product trace.
inline thread_local std::array<std::size_t,4> search_projection_work_test{};
inline thread_local bool search_projection_reuse_test_enabled=true;
// Compare the same pre-Build retry with/without shared projection spans.
inline thread_local bool search_retry_projection_test_enabled=true;
inline thread_local bool search_projection_build_refused_test=false;
inline thread_local bool search_retention_delta_test_enabled=true;
inline thread_local std::array<unsigned,3> search_retention_delta_work_test{}; // attempted/applied/refused
inline thread_local std::function<void()> search_retention_delta_apply_test;
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
    // No output/allocation here. Owned overlays publish bounded terminal records after unlock.
    struct Capture {std::uint64_t begin=0,end=0,rows=0,cut_rows=0,raw_bytes=0,read_ns=0,outside_ns=0,
        decode_calls=0,decode_hits=0,parse_ns=0,raw_read_ns=0,shared=0,materialized=0,captured=0,current=0,rejected_before=0,rejected_after=0;
        // Fixed numeric attribution, emitted after request locks in the existing terminal budget.
        std::array<std::uint64_t,4> catalog_lock{}; // initial wait/hold, reacquire wait/hold
        std::array<std::uint64_t,9> history_cost{}; // latency::CaptureField order
        unsigned attempt=0,parent=0,observed=0;bool complete=false;};
    std::array<Capture,6> captures{};unsigned capture_count=0,capture_parent=0;bool capture_loss=false;

    struct Cost {const char* name;std::uint64_t begin,end;};
    std::array<Cost,40> costs{};unsigned cost_count=0;bool cost_loss=false;
    static inline std::atomic<unsigned> sequence{0};
    // Same process budget: 127 detail records + one <=512B terminal summary.
    // Reserve failure/very-late slots independently: ordinary slow traffic cannot consume them.
    struct DetailBudget {
        static constexpr std::array<unsigned,3> limits{{16,80,31}};
        std::array<std::atomic<unsigned>,3> kept{},dropped{};
        std::atomic<unsigned> unselected{0};
        bool report=false;
        explicit DetailBudget(bool terminal=false) noexcept:report(terminal){}
        int Select(unsigned request,std::uint64_t elapsed,int code,const char* failure) noexcept {
            const int bucket=code>=400||std::strcmp(failure,"none")||elapsed>=5000000000ULL?2:
                elapsed>=2000000000ULL?1:request<=16?0:-1;
            if(bucket<0){unselected.fetch_add(1,std::memory_order_relaxed);return -1;}
            auto& count=kept[bucket];auto before=count.load(std::memory_order_relaxed);
            while(before<limits[bucket])if(count.compare_exchange_weak(before,before+1,std::memory_order_relaxed))return bucket;
            dropped[bucket].fetch_add(1,std::memory_order_relaxed);return -1;
        }
        ~DetailBudget() noexcept {
            if(!report)return;
            char line[512];const int n=std::snprintf(line,sizeof(line),
                "[search-cost-budget] {\"version\":2,\"limits\":[16,80,31],\"kept\":[%u,%u,%u],\"dropped\":[%u,%u,%u],\"unselected\":%u,\"completeRequestLedger\":false}\n",
                kept[0].load(),kept[1].load(),kept[2].load(),dropped[0].load(),dropped[1].load(),dropped[2].load(),unselected.load());
            if(n>0&&n<int(sizeof(line)))SearchDiagnostic::Write(line,static_cast<std::size_t>(n));
        }
    };
    static DetailBudget& Budget() noexcept {static DetailBudget budget(true);return budget;}
    unsigned id=0;std::uint64_t entered=0;bool detail_enabled=false;
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
#ifdef RECORDING_SEARCH_TESTING
        if(search_diagnostic_sink_test){search_diagnostic_sink_test(data,size);return;}
#endif
        if(std::fwrite(data,1,size,stderr)!=size||std::fflush(stderr)!=0) {
            // Parent captures both streams; stdout fallback reports an incomplete trace, never raw data.
            std::fputs("[search-failure-loss]\n",stdout);std::fflush(stdout);
        }
    }
    // R171-style thread-local request scope, without its fixture ID/cap domain.
    // Invalid IDs are ignored; they never change authorization or Search results.
    struct HttpRequest {
        std::array<char,65> client{};unsigned diagnostic_id=0;bool selected=false,sent=false,ended=false;
        std::uint64_t dispatch=0,prepared=0,send_begin=0,send_end=0;int status=0;
        HttpRequest* prior=nullptr;
        explicit HttpRequest(std::string_view value) noexcept;
        ~HttpRequest() noexcept {End();}
        void End() noexcept;
        void Prepared(int code) noexcept {if(dispatch){status=code;prepared=Tick();}}
        void SendBegin() noexcept {if(dispatch)send_begin=Tick();}
        void SendEnd(bool value) noexcept {if(dispatch){sent=value;send_end=Tick();}}
    };
    static inline thread_local HttpRequest* http=nullptr;
    std::array<char,65> client_request_id{};
    explicit SearchDiagnostic(const SearchModelResidency* value=nullptr) noexcept : resources(value),rejection_start(value?value->rejected():0) {
        previous=active;active=this;search_capacity_diagnostic={};
        detail_enabled=Enabled();
        if(detail_enabled){(void)Budget();id=++sequence;entered=Tick();if(http){client_request_id=http->client;http->diagnostic_id=id;}}
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
    // Saturating by omission, never a fabricated zero. Units are microseconds;
    // sub-microsecond observed intervals may round to zero. Numeric width <=10.
    static void CaptureNumber(char* line,std::size_t size,int& n,std::uint64_t value,bool observed,bool time,bool& loss) noexcept {
        if(!observed){n+=std::snprintf(line+n,size-n,"null");return;}
        if(time)value/=1000;
        if(value>UINT32_MAX){loss=true;n+=std::snprintf(line+n,size-n,"null");return;}
        n+=std::snprintf(line+n,size-n,"%u",static_cast<unsigned>(value));
    }
    ~SearchDiagnostic() noexcept {
        active=previous;
        const auto ended=id?Tick():0;
        const int selection=detail_enabled?Budget().Select(id,ended-entered,status,exception):-2;
        // External proof overlays own their ID/budget when this opt-in is off.
        if(id&&selection!=-1) {
            if(detail_enabled&&http&&http->diagnostic_id==id)http->selected=true;
            // 5632B Search + 512B HTTP terminal share each existing 6144B slot.
            char line[5632];int n=std::snprintf(line,sizeof(line),"[search-request-cost] {\"id\":%u,\"clientRequestId\":\"%s\",\"thread\":%u,\"startNs\":%llu,\"endNs\":%llu,\"status\":%d,\"loss\":%s,\"phases\":[",id,client_request_id.data(),latency::local.thread,(unsigned long long)entered,(unsigned long long)ended,status,cost_loss?"true":"false");
            for(unsigned i=0;i<cost_count&&n>0&&n<int(sizeof(line));++i){const auto& c=costs[i];n+=std::snprintf(line+n,sizeof(line)-n,"%s[\"%s\",%llu,%llu]",i?",":"",c.name,(unsigned long long)c.begin,(unsigned long long)c.end);}
            if(n>0&&n<int(sizeof(line)))n+=std::snprintf(line+n,sizeof(line)-n,
                "],\"selection\":%d,\"clock\":\"process-steady-ns\",\"revisions\":[",selection);
            for(unsigned i=0;i<=attempt&&i<attempts.size()&&n>0&&n<int(sizeof(line));++i){const auto& a=attempts[i];
                n+=std::snprintf(line+n,sizeof(line)-n,"%s[%llu,%llu,%llu,%llu,%u,%u]",i?",":"",
                    (unsigned long long)a.instance,(unsigned long long)a.current_instance,(unsigned long long)a.captured,
                    (unsigned long long)a.current,unsigned(a.rebuild),unsigned(a.authority));}
            if(n>0&&n<int(sizeof(line)))n+=std::snprintf(line+n,sizeof(line)-n,
                "],\"captureVersion\":1,\"captureUnit\":\"us\",\"captures\":[");
            bool value_loss=false;
            for(unsigned i=0;i<capture_count&&i<captures.size()&&n>0&&n<int(sizeof(line));++i){const auto& c=captures[i];
                n+=std::snprintf(line+n,sizeof(line)-n,"%s{\"attempt\":%u,\"parent\":%u,\"complete\":%s,\"us\":[",i?",":"",c.attempt,c.parent,c.complete?"true":"false");
                const std::array<std::uint64_t,17> times{{c.end>=c.begin?c.end-c.begin:0,c.catalog_lock[0],c.catalog_lock[1],c.catalog_lock[2],c.catalog_lock[3],
                    c.history_cost[0],c.history_cost[1],c.history_cost[2],c.history_cost[3],c.history_cost[4],c.history_cost[5],c.history_cost[6],c.history_cost[7],c.history_cost[8],c.read_ns,c.outside_ns,c.parse_ns}};
                const std::array<bool,17> seen{{c.begin&&c.end>=c.begin,bool(c.observed&1),bool(c.observed&1),bool(c.observed&2),bool(c.observed&2),
                    bool(c.observed&(1<<8)),bool(c.observed&(1<<9)),bool(c.observed&(1<<10)),bool(c.observed&(1<<11)),bool(c.observed&(1<<12)),bool(c.observed&(1<<13)),bool(c.observed&(1<<14)),bool(c.observed&(1<<15)),bool(c.observed&(1<<16)),bool(c.observed&4),bool(c.observed&8),c.decode_calls!=0}};
                for(unsigned j=0;j<times.size()&&n>0&&n<int(sizeof(line));++j){if(j)n+=std::snprintf(line+n,sizeof(line)-n,",");if(n<int(sizeof(line)))CaptureNumber(line,sizeof(line),n,times[j],seen[j],true,value_loss);}
                if(n>0&&n<int(sizeof(line)))n+=std::snprintf(line+n,sizeof(line)-n,"],\"counts\":[");
                const std::array<std::uint64_t,7> counts{{c.rows,c.cut_rows,c.raw_bytes,c.decode_calls,c.decode_hits,c.shared,c.materialized}};
                for(unsigned j=0;j<counts.size()&&n>0&&n<int(sizeof(line));++j){if(j)n+=std::snprintf(line+n,sizeof(line)-n,",");if(n<int(sizeof(line)))CaptureNumber(line,sizeof(line),n,counts[j],true,false,value_loss);}
                if(n>0&&n<int(sizeof(line)))n+=std::snprintf(line+n,sizeof(line)-n,"]}");
            }
            if(n>0&&n<int(sizeof(line)))n+=std::snprintf(line+n,sizeof(line)-n,"],\"captureLoss\":%s,\"captureValueLoss\":%s}\n",capture_loss?"true":"false",value_loss?"true":"false");
            if(n>0&&n<int(sizeof(line)))Write(line,static_cast<std::size_t>(n));else Write("[search-cost-loss]\n",18);
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
inline SearchDiagnostic::HttpRequest::HttpRequest(std::string_view value) noexcept:prior(http) {
    if(Enabled()&&!value.empty()&&value.size()<=64){
        bool valid=true;
        for(char c:value)if(!((c>='a'&&c<='z')||(c>='A'&&c<='Z')||(c>='0'&&c<='9')||c=='-'))valid=false;
        if(valid){std::memcpy(client.data(),value.data(),value.size());dispatch=Tick();}
    }
    http=this;
}
inline void SearchDiagnostic::HttpRequest::End() noexcept {
    if(ended)return;ended=true;http=prior;
    if(!dispatch||!selected||!diagnostic_id)return;
    char line[512];const int n=std::snprintf(line,sizeof(line),
        "[search-http-cost] {\"id\":%u,\"clientRequestId\":\"%s\",\"clock\":\"process-steady-ns\",\"dispatch\":%llu,\"prepared\":%llu,\"sendBegin\":%llu,\"sendEnd\":%llu,\"status\":%d,\"sent\":%s}\n",
        diagnostic_id,client.data(),(unsigned long long)dispatch,(unsigned long long)prepared,
        (unsigned long long)send_begin,(unsigned long long)send_end,status,sent?"true":"false");
    if(n>0&&n<int(sizeof(line)))Write(line,static_cast<std::size_t>(n));
    else Write("[search-cost-loss]\n",18);
}
} // namespace recording

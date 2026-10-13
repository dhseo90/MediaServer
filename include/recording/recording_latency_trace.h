// 파일 용도: 내부 검증 전용: 원본 mutex/제품 계약을 바꾸지 않는 bounded steady-clock 계측.
#pragma once
#include <array>
#include <atomic>
#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <cstdint>
#include <mutex>
#include <limits>

namespace recording::latency {
enum class Source : unsigned { Catalog=1, Projection=2, Read=3, Application=4, Test=5 };
enum class Operation : unsigned { Lock=1, Timeline=2, Query=3, Finish=4, Serialize=5, Checkpoint=6, Append=7, ApplyJob=8, Sqlite=9, ValidateSources=10, FixedCapture=11, SnapshotPrepare=12, Transition=13 };
inline bool Enabled() noexcept {static const bool enabled=[] {const char* p=std::getenv("MEDIA_SERVER_VERIFY_RECORDING_LATENCY_TRACE");return p&&std::strcmp(p,"1")==0;}();return enabled;}
inline bool SlowOnly() noexcept {static const bool enabled=[] {const char* p=std::getenv("MEDIA_SERVER_VERIFY_RECORDING_LATENCY_SLOW_ONLY");return p&&std::strcmp(p,"1")==0;}();return enabled;}
// Zero is the unselected-window sentinel. The first two clock reads can be
// identical; reserve zero without changing any elapsed-time differences.
inline std::uint64_t Now() noexcept {static const auto epoch=std::chrono::steady_clock::now();return 1+static_cast<std::uint64_t>(std::chrono::duration_cast<std::chrono::nanoseconds>(std::chrono::steady_clock::now()-epoch).count());}
// Diagnostic-only selected windows. No allocation, output or diagnostic mutex under
// the product lock. Completed intervals are published after unlock; never an owner guess.
enum class Work : unsigned { Other=0, Visual=1, Structured=2, Retention=3, Index=4, Writer=5, Evidence=6 };
inline thread_local Work holder_work=Work::Other;
struct WorkScope {Work previous;explicit WorkScope(Work work):previous(holder_work){holder_work=work;}~WorkScope(){holder_work=previous;}};
inline bool HolderEnabled() noexcept {static const bool yes=[] {const char* p=std::getenv("MEDIA_SERVER_VERIFY_CATALOG_HOLDER_TRACE");return p&&std::strcmp(p,"1")==0;}();return yes;}
// R107 opt-in elapsed subcosts, not CPU time: Journal wait, managed authority,
// identity lookup, cold mutation read/parse. Nested authority is inclusive.
inline bool SubcostEnabled() noexcept {static const bool yes=[] {const char* p=std::getenv("MEDIA_SERVER_VERIFY_CATALOG_SUBCOSTS");return p&&std::strcmp(p,"1")==0;}();return yes;}
inline thread_local std::array<std::uint64_t,4> journal_subcost{};
struct JournalSubcost {
    unsigned field;std::uint64_t begin;bool active;
    explicit JournalSubcost(unsigned index) noexcept:field(index),begin(SubcostEnabled()?Now():0),active(SubcostEnabled()){}
    void End() noexcept {if(active){journal_subcost[field]+=Now()-begin;active=false;}}
    ~JournalSubcost() noexcept {End();}
};
inline thread_local std::array<std::uint64_t,4> segment_decode_cost{}; // opt-in calls/hits/inclusive parse ns/second canonical serialization ns
inline thread_local std::uint64_t history_node_reads=0; // opt-in logical authenticated node reads, not physical I/O
inline thread_local std::array<std::uint64_t,4> holder_counts{}; // binding checks, cold link calls, visited rows, Journal ReadAt requested bytes
inline void HolderCount(unsigned i,std::uint64_t n=1) noexcept {if(HolderEnabled()&&i<4)holder_counts[i]+=n;}
struct HolderTrace {
    struct Event {std::uint64_t b=0,a=0,e=0;std::array<std::uint64_t,4> counts{};const char* site=nullptr;unsigned m=0,t=0,r=0,line=0,work=0;};
    struct Slot {Event event;std::atomic<std::uint64_t> state{0};};
    std::array<Slot,8192> slots{};std::atomic<unsigned> count{0};
    const bool slow=[] {const char* p=std::getenv("MEDIA_SERVER_VERIFY_CATALOG_HOLDER_WHOLE_REQUESTS");return p&&std::strcmp(p,"slow-first")==0;}();
    static constexpr std::uint64_t Frozen=std::uint64_t{1}<<63,Threshold=2000000000;
    std::atomic<std::uint64_t> tickets{0},overwritten_end{0},slow_begin{0},slow_end{0},max_completed{0};
    std::atomic<unsigned> selected{0},completed_requests{0},tail_count{0};
    static void Max(std::atomic<std::uint64_t>& target,std::uint64_t value) noexcept {
        auto old=target.load();while(old<value&&!target.compare_exchange_weak(old,value)){}
    }
    void CompleteSlow(unsigned id,std::uint64_t begin,std::uint64_t end) noexcept {
        ++completed_requests;Max(max_completed,end-begin);
        if(end-begin<Threshold)return;
        unsigned zero=0;if(!selected.compare_exchange_strong(zero,id))return;
        slow_begin.store(begin);slow_end.store(end);
        // The winning completion selects one request, not every concurrent slow request.
        // Ticket allocation and freezing share one atomic modification order. Earlier
        // publishers finish their ring slot; later publishers use the separate tail.
        tickets.fetch_or(Frozen,std::memory_order_release);
    }
    void AddSlow(const Event& e) noexcept {
        const auto ticket=tickets.fetch_add(1,std::memory_order_acq_rel);
        if(ticket&Frozen){
            const auto begin=slow_begin.load(),end=slow_end.load();
            if(e.b>=end||e.e<=begin)return;
            const auto i=tail_count.fetch_add(1);if(i>=4096){loss=true;return;}
            auto& slot=slots[4096+i];slot.state.store(1);slot.event=e;slot.state.store(2,std::memory_order_release);return;
        }
        auto& slot=slots[ticket%4096];auto prior=slot.state.load(std::memory_order_acquire);
        if(prior==1||!slot.state.compare_exchange_strong(prior,1,std::memory_order_acq_rel)){
            // Never spin under a product mutex (Add is after unlock). An overlapping
            // publication is explicitly incomplete; no partial event is consumed.
            loss=true;return;
        }
        if(prior>ticket+2){Max(overwritten_end,e.e);slot.state.store(prior,std::memory_order_release);return;}
        if(prior)Max(overwritten_end,slot.event.e);
        slot.event=e;slot.state.store(ticket+2,std::memory_order_release);
    }
    std::array<std::atomic<std::uint64_t>,3> windows{}, ends{};
    // R101 opt-in: three complete actual requests (1/2/3 or the late4/5/6).
    // Default historical 7/41/77 one-second sampling remains unchanged.
    const bool whole=[] {const char* p=std::getenv("MEDIA_SERVER_VERIFY_CATALOG_HOLDER_WHOLE_REQUESTS");return p&&(std::strcmp(p,"1")==0||std::strcmp(p,"late")==0||std::strcmp(p,"mixed-late")==0);}();
    const unsigned first=[] {const char* p=std::getenv("MEDIA_SERVER_VERIFY_CATALOG_HOLDER_WHOLE_REQUESTS");return p&&std::strcmp(p,"mixed-late")==0?77U:p&&std::strcmp(p,"late")==0?4U:1U;}();
    std::atomic<unsigned> inflight{0};std::atomic<bool> loss{false};
    static constexpr unsigned Requests[3]={7,41,77};
    static constexpr std::uint64_t Width=1000000000;
    void Select(unsigned id,std::uint64_t ns) noexcept {if(slow)return;for(unsigned i=0;i<3;++i)if(id==(whole?i+first:Requests[i]))windows[i].store(ns,std::memory_order_release);}
    void Complete(unsigned id,std::uint64_t ns,std::uint64_t begin=0) noexcept {if(slow){CompleteSlow(id,begin,ns);return;}if(whole&&id>=first&&id<first+3)ends[id-first].store(ns,std::memory_order_release);}
    void Add(const Event& e) noexcept {
        if(slow){AddSlow(e);return;}
        bool selected=false;for(unsigned i=0;i<3;++i){const auto b=windows[i].load(std::memory_order_acquire), end=ends[i].load(std::memory_order_acquire);if(b&&(!whole?e.b<b+Width:(!end||e.b<end))&&e.e>b)selected=true;}
        if(!selected)return;
        const auto i=count.fetch_add(1);if(i>=slots.size()){loss=true;return;}
        slots[i].event=e;slots[i].state.store(2,std::memory_order_release);
    }
    void PrintSlow() noexcept {
        if(SubcostEnabled()&&std::fputs("[catalog-subcost-basis] journal-wait,managed-authority,identity-lookup,cold-read-inclusive\n",stderr)==EOF)loss=true;
        const auto begin=slow_begin.load(),end=slow_end.load();bool good=!loss.load()&&inflight.load()==0;
        if(selected.load()&&(!(tickets.load()&Frozen)||!begin||end<begin||overwritten_end.load()>begin))good=false;
        unsigned emitted=0;
        for(auto& slot:slots){const auto state=slot.state.load(std::memory_order_acquire);
            if(state==1){good=false;continue;}if(!state||!selected.load())continue;
            const auto& e=slot.event;if(e.b>=end||e.e<=begin)continue;
            char row[320];const int n=std::snprintf(row,sizeof(row),"[catalog-holder] {\"id\":%u,\"m\":%u,\"t\":%u,\"r\":%u,\"l\":%u,\"work\":%u,\"site\":\"%s\",\"b\":%llu,\"a\":%llu,\"e\":%llu,\"counts\":[%llu,%llu,%llu,%llu]}\n",++emitted,e.m,e.t,e.r,e.line,e.work,e.site?e.site:"unknown",(unsigned long long)e.b,(unsigned long long)e.a,(unsigned long long)e.e,(unsigned long long)e.counts[0],(unsigned long long)e.counts[1],(unsigned long long)e.counts[2],(unsigned long long)e.counts[3]);
            if(n<=0||n>=int(sizeof(row))||std::fwrite(row,1,std::size_t(n),stderr)!=std::size_t(n))good=false;
        }
        if(std::fprintf(stderr,"[catalog-holder-end] {\"version\":3,\"records\":%u,\"loss\":%s,\"inflight\":%u,\"endNs\":%llu,\"request\":%u,\"begin\":%llu,\"end\":%llu,\"thresholdNs\":%llu,\"overwrittenEndNs\":%llu,\"completedRequests\":%u,\"maxCompletedNs\":%llu}\n",emitted,good?"false":"true",inflight.load(),(unsigned long long)Now(),selected.load(),(unsigned long long)begin,(unsigned long long)end,(unsigned long long)Threshold,(unsigned long long)overwritten_end.load(),completed_requests.load(),(unsigned long long)max_completed.load())<0||std::fflush(stderr)!=0){std::fputs("[catalog-holder-loss] write\n",stdout);std::fflush(stdout);}
    }
    ~HolderTrace() noexcept {
        if(slow){PrintSlow();return;}
        if(SubcostEnabled()&&std::fputs("[catalog-subcost-basis] journal-wait,managed-authority,identity-lookup,cold-read-inclusive\n",stderr)==EOF)loss=true;
        bool good=!loss.load()&&inflight.load()==0;const unsigned total=count.load();
        const char* setting=std::getenv("MEDIA_SERVER_VERIFY_CATALOG_HOLDER_WHOLE_REQUESTS");
        if(setting&&std::strcmp(setting,"1")!=0&&std::strcmp(setting,"late")!=0&&std::strcmp(setting,"mixed-late")!=0)good=false;
        if(whole)for(unsigned i=0;i<3;++i)if(!windows[i].load()||ends[i].load()<windows[i].load())good=false;
        for(unsigned i=0;i<total&&i<slots.size();++i){
            if(slots[i].state.load(std::memory_order_acquire)!=2){good=false;continue;}
            const auto& e=slots[i].event;char row[320];
            const int n=std::snprintf(row,sizeof(row),"[catalog-holder] {\"id\":%u,\"m\":%u,\"t\":%u,\"r\":%u,\"l\":%u,\"work\":%u,\"site\":\"%s\",\"b\":%llu,\"a\":%llu,\"e\":%llu,\"counts\":[%llu,%llu,%llu,%llu]}\n",i+1,e.m,e.t,e.r,e.line,e.work,e.site?e.site:"unknown",(unsigned long long)e.b,(unsigned long long)e.a,(unsigned long long)e.e,(unsigned long long)e.counts[0],(unsigned long long)e.counts[1],(unsigned long long)e.counts[2],(unsigned long long)e.counts[3]);
            if(n<=0||n>=int(sizeof(row))||std::fwrite(row,1,std::size_t(n),stderr)!=std::size_t(n))good=false;
        }
        if(whole){
            if(std::fprintf(stderr,"[catalog-holder-end] {\"version\":2,\"records\":%u,\"loss\":%s,\"inflight\":%u,\"endNs\":%llu,\"requests\":[%u,%u,%u],\"windows\":[%llu,%llu,%llu],\"ends\":[%llu,%llu,%llu]}\n",total,good?"false":"true",inflight.load(),(unsigned long long)Now(),first,first+1,first+2,(unsigned long long)windows[0].load(),(unsigned long long)windows[1].load(),(unsigned long long)windows[2].load(),(unsigned long long)ends[0].load(),(unsigned long long)ends[1].load(),(unsigned long long)ends[2].load())<0||std::fflush(stderr)!=0){std::fputs("[catalog-holder-loss] write\n",stdout);std::fflush(stdout);}
            return;
        }
        if(std::fprintf(stderr,"[catalog-holder-end] {\"version\":1,\"records\":%u,\"loss\":%s,\"inflight\":%u,\"endNs\":%llu,\"widthNs\":%llu,\"windows\":[%llu,%llu,%llu]}\n",total,good?"false":"true",inflight.load(),(unsigned long long)Now(),(unsigned long long)Width,(unsigned long long)windows[0].load(),(unsigned long long)windows[1].load(),(unsigned long long)windows[2].load())<0||std::fflush(stderr)!=0){std::fputs("[catalog-holder-loss] write\n",stdout);std::fflush(stdout);}
    }
};
inline HolderTrace& Holder() noexcept {static HolderTrace value;return value;}
// k: 0=잠금 구간, 1=단계 구간, 2=빠른 집계, 3=진단 손실.
struct Row {std::uint64_t k=0,o=0,s=0,l=0,m=0,t=0,r=0,b=0,a=0,e=0,n=0,w=0,h=0,x=0,y=0;};
// 요청별 비용 요약: 고정 배열만 사용. 각 phase는 inclusive이며 부모/자식을 합산하지 않는다.
// 단계 번호는 Names 순서, counters는 prepared/reused/evicted/eligible/scored/returned.
class VisualRequestSummary {
public:
    inline static constexpr const char* Names[]={"visual-search","text-inference-wait","text-inference-held","encoder-mutex-wait","encoder-mutex-held","text-tokens","text-session-run","index-search-current-sources","source-prepare","source-resolve","prepare-binding","prepare-media-inspect","seek-current-source-media","final-source-json","vector-score","eligible","prepare-file-proof"};
    inline static thread_local VisualRequestSummary* current=nullptr;
private:
    inline static std::atomic<unsigned> sequence{0},completed{0};
    inline static std::atomic<bool> loss{false};
    bool active_=false;unsigned id_=0,status_=503;char reason_[80]="exception";
    std::uint64_t start_=0,generation_=0,documents_=0;
    std::array<std::uint64_t,17> count_{},ns_{};
    std::array<std::uint64_t,6> counters_{};
    std::array<std::uint64_t,4> journal_begin_{};
    std::array<std::uint64_t,5> locks_{},wait_{},held_{};
    static void Loss() noexcept {if(!loss.exchange(true)){const char* row="[visual-request-loss] collection\n";if(std::fputs(row,stderr)==EOF||std::fflush(stderr)!=0){std::fputs(row,stdout);std::fflush(stdout);}}}
    struct Completion {
        ~Completion() noexcept {if(std::fprintf(stderr,"[visual-request-end] {\"started\":%u,\"completed\":%u}\n",sequence.load(),completed.load())<0||std::fflush(stderr)!=0)Loss();}
    };
public:
    static unsigned CurrentId() noexcept {return current?current->id_:0;}
    static bool Enabled() noexcept {static const bool yes=[] {const char* p=std::getenv("MEDIA_SERVER_VERIFY_VISUAL_REQUEST_TRACE");return p&&std::strcmp(p,"1")==0;}();return yes;}
    VisualRequestSummary() noexcept {
        if(!Enabled())return;
        static Completion completion;(void)completion;
        id_=++sequence;if(id_==1){if(std::fputs("[visual-request-probe] 1\n",stderr)==EOF||std::fflush(stderr)!=0)Loss();}
        if(id_>1024||current){Loss();return;}active_=true;start_=Now();journal_begin_=journal_subcost;current=this;if(HolderEnabled())Holder().Select(id_,start_);
    }
    static void Result(unsigned status,const char* reason) noexcept {if(current){current->status_=status;const auto n=std::strlen(reason);bool safe=n<sizeof(current->reason_);for(std::size_t i=0;safe&&i<n;++i)safe=(reason[i]>='a'&&reason[i]<='z')||reason[i]=='-'||(reason[i]>='0'&&reason[i]<='9');std::snprintf(current->reason_,sizeof(current->reason_),"%s",safe?reason:"unknown-code");}}
    static void Index(std::uint64_t generation,std::uint64_t docs) noexcept {if(current){current->generation_=generation;current->documents_=docs;}}
    static void Count(unsigned counter,std::uint64_t n=1) noexcept {if(current&&counter<6)current->counters_[counter]+=n;}
    static void Phase(const char* name,std::uint64_t elapsed) noexcept {if(!current)return;for(unsigned i=0;i<17;++i)if(std::strcmp(name,Names[i])==0){++current->count_[i];current->ns_[i]+=elapsed;return;}}
    static void LockCost(const Row& r) noexcept {if(current&&r.k==0&&r.s>=1&&r.s<=5){const auto i=r.s-1;++current->locks_[i];current->wait_[i]+=r.w;current->held_[i]+=r.h;}}
    ~VisualRequestSummary() noexcept {
        if(!active_)return;
        const auto completed_at=Now();
        if(HolderEnabled())Holder().Complete(id_,completed_at,start_);
        current=nullptr;char text[3072];std::size_t used=0;bool valid=true;
        const auto add=[&](const char* format,auto... values){if(!valid)return;const int n=std::snprintf(text+used,sizeof(text)-used,format,values...);if(n<0||std::size_t(n)>=sizeof(text)-used){valid=false;return;}used+=std::size_t(n);};
        // reason is a fixed application code, never exception.what/query/path.
        add("[visual-request] {\"id\":%u,\"status\":%u,\"code\":\"%s\",\"startNs\":%llu,\"elapsedNs\":%llu,\"generation\":%llu,\"documents\":%llu,\"phases\":[",id_,status_,reason_,(unsigned long long)start_,(unsigned long long)(completed_at-start_),(unsigned long long)generation_,(unsigned long long)documents_);
        for(unsigned i=0;i<17;++i)add("%s[%llu,%llu]",i?",":"",(unsigned long long)count_[i],(unsigned long long)ns_[i]);
        add("%s","],\"counters\":[");for(unsigned i=0;i<6;++i)add("%s%llu",i?",":"",(unsigned long long)counters_[i]);
        add("%s","],\"locks\":[");for(unsigned i=0;i<5;++i)add("%s[%llu,%llu,%llu]",i?",":"",(unsigned long long)locks_[i],(unsigned long long)wait_[i],(unsigned long long)held_[i]);
        add("%s","]");if(SubcostEnabled()){add("%s",",\"journalCostNs\":[");for(unsigned i=0;i<4;++i)add("%s%llu",i?",":"",(unsigned long long)(journal_subcost[i]-journal_begin_[i]));add("%s","]");}add("%s","}\n");if(!valid||std::fwrite(text,1,used,stderr)!=used||std::fflush(stderr)!=0)Loss();else ++completed;
    }
    VisualRequestSummary(const VisualRequestSummary&)=delete;VisualRequestSummary& operator=(const VisualRequestSummary&)=delete;
};
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
inline int FormatRow(char (&text)[512],const Row& v) noexcept {
    return std::snprintf(text,sizeof(text),"[recording-latency] {\"k\":%llu,\"o\":%llu,\"s\":%llu,\"l\":%llu,\"m\":%llu,\"t\":%llu,\"r\":%llu,\"b\":%llu,\"a\":%llu,\"e\":%llu,\"n\":%llu,\"w\":%llu,\"h\":%llu,\"x\":%llu,\"y\":%llu}\n",
        (unsigned long long)v.k,(unsigned long long)v.o,(unsigned long long)v.s,(unsigned long long)v.l,(unsigned long long)v.m,(unsigned long long)v.t,(unsigned long long)v.r,(unsigned long long)v.b,(unsigned long long)v.a,(unsigned long long)v.e,(unsigned long long)v.n,(unsigned long long)v.w,(unsigned long long)v.h,(unsigned long long)v.x,(unsigned long long)v.y);
}
// 장시간 전용: 빠른 구간은 버리고 마지막 느린 완료 구간64개만 메모리에 보존한다.
// 종료 시 한번 배출: 최대64*512+512 bytes. 비정상 종료/진행 중 span은 증거가 아니다.
// tail의 덮어쓰기와 독립적으로 모든 완료 계측 구간의 count/max(ns)를 고정 크기로 집계한다.
// 제품 전용 구간이 아니라 이 프로세스에서 계측된 준비/조회 구간도 포함한다.
struct SlowRing {
    std::mutex mutex;std::array<Row,64> rows{};std::uint64_t seen=0;
    std::uint64_t lock_count=0,span_count=0,max_wait=0,max_hold=0,max_span=0;
    bool count_overflow=false;
    void Count(std::uint64_t& count) noexcept {
        if(count==std::numeric_limits<std::uint64_t>::max())count_overflow=true;else ++count;
    }
    void Add(const Row& row) noexcept {
        std::lock_guard<std::mutex> lock(mutex);
        if(row.k==0){Count(lock_count);if(row.w>max_wait)max_wait=row.w;if(row.h>max_hold)max_hold=row.h;}
        else if(row.k==1){Count(span_count);if(row.h>max_span)max_span=row.h;}
        if(row.w<10000000&&row.h<10000000)return;
        rows[seen%rows.size()]=row;Count(seen);
    }
    ~SlowRing() {
        std::lock_guard<std::mutex> lock(mutex);
        const auto count=seen<rows.size()?seen:rows.size();
        for(std::uint64_t i=seen-count;i<seen;++i){char text[512];const auto size=FormatRow(text,rows[i%rows.size()]);
            if(size>0&&size<static_cast<int>(sizeof(text)))(void)std::fwrite(text,1,static_cast<std::size_t>(size),stderr);}
        (void)std::fprintf(stderr,"[recording-slow-summary] {\"seen\":%llu,\"retained\":%llu,\"thresholdNs\":10000000}\n",
            (unsigned long long)seen,(unsigned long long)count);
        (void)std::fprintf(stderr,"[recording-complete-summary] {\"lockCount\":%llu,\"spanCount\":%llu,\"maxWaitNs\":%llu,\"maxHoldNs\":%llu,\"maxSpanNs\":%llu,\"countOverflow\":%s}\n",
            (unsigned long long)lock_count,(unsigned long long)span_count,(unsigned long long)max_wait,
            (unsigned long long)max_hold,(unsigned long long)max_span,count_overflow?"true":"false");
    }
};
inline SlowRing& SlowTail() noexcept {static SlowRing ring;return ring;}
inline void Emit(const Row& v) noexcept {
    char text[512];const int size=FormatRow(text,v);
    if(size<=0||size>=static_cast<int>(sizeof(text))){local.loss=true;return;}
    if(v.k!=3&&(emitted.fetch_add(1)>=16384||emitted_bytes.fetch_add(static_cast<std::size_t>(size))>2*1024*1024-512-static_cast<std::size_t>(size))){local.loss=true;return;}
    SinkLine(text,static_cast<std::size_t>(size));
}
inline void Flush() noexcept {
    if(local.depth)return;
    for(std::size_t i=0;i<local.used;++i)Emit(local.rows[i]);
    local.used=0;
    if(local.loss&&!loss_emitted.exchange(true)){Row loss;loss.k=3;loss.n=1;Emit(loss);}
}
inline void Append(Row row,bool always=false) noexcept {
    row.t=local.thread;row.r=local.request;row.n=1;row.w=row.a-row.b;row.h=row.e-row.a;row.x=row.w;row.y=row.h;
    VisualRequestSummary::LockCost(row);
    if(SlowOnly()){SlowTail().Add(row);return;}
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
    bool owned_=false,always_;Lock* enclosing_=nullptr;
    bool holder_=false,retention_costs_=false;const char* site_=nullptr;HolderTrace::Event event_;std::array<std::uint64_t,4> begin_counts_{};
    inline static thread_local Lock* current_=nullptr;
    void Acquire() {
        if(holder_)++Holder().inflight;
        if(enabled_){row_.b=Now();row_.e=0;}
        mutex_.lock();owned_=true;retention_costs_=false;
        if(enabled_){row_.a=Now();previous_=local.mutex;local.mutex=row_.m;++local.depth;}
        if(holder_){event_.b=row_.b;event_.a=row_.a;event_.m=row_.m;event_.t=local.thread;event_.r=VisualRequestSummary::CurrentId();event_.line=row_.l;event_.site=site_;event_.work=static_cast<unsigned>(holder_work);begin_counts_=SubcostEnabled()?journal_subcost:holder_counts;}
    }
    void Release() noexcept {
        if(!owned_)return;
        if(enabled_)row_.e=Now();
        if(holder_){event_.e=row_.e;for(unsigned i=retention_costs_?4:0;i<4;++i)event_.counts[i]=(SubcostEnabled()?journal_subcost[i]:holder_counts[i])-begin_counts_[i];}
        mutex_.unlock();owned_=false;
        if(holder_){Holder().Add(event_);--Holder().inflight;}
        if(enabled_){--local.depth;local.mutex=previous_;Append(row_,always_);if(!local.request&&local.fast_events>=256)FlushFast();else Flush();}
    }
public:
    Lock(std::mutex& mutex,Source source,unsigned line,bool always=false,const char* site=nullptr,bool catalog_holder=false):mutex_(mutex),enabled_(Enabled()),always_(always),holder_(Enabled()&&HolderEnabled()&&(source==Source::Catalog||catalog_holder)),site_(site){
        if(enabled_){row_.o=1;row_.s=static_cast<unsigned>(source);row_.l=line;row_.m=MutexId(&mutex);}
        Acquire();enclosing_=current_;current_=this;
    }
    Lock(std::mutex& mutex,Source source,unsigned line,std::try_to_lock_t,const char* site):mutex_(mutex),enabled_(Enabled()),always_(false),holder_(Enabled()&&HolderEnabled()&&source==Source::Catalog),site_(site){
        if(enabled_){row_.o=1;row_.s=static_cast<unsigned>(source);row_.l=line;row_.m=MutexId(&mutex);row_.b=Now();}
        if(holder_)(void)Holder(); // initialize bounded storage before acquiring the product mutex
        owned_=mutex_.try_lock();
        if(owned_){if(enabled_){row_.a=Now();previous_=local.mutex;local.mutex=row_.m;++local.depth;}
            if(holder_){++Holder().inflight;event_.b=row_.b;event_.a=row_.a;event_.m=row_.m;event_.t=local.thread;event_.r=VisualRequestSummary::CurrentId();event_.line=line;event_.site=site_;event_.work=static_cast<unsigned>(holder_work);begin_counts_=SubcostEnabled()?journal_subcost:holder_counts;}}
        enclosing_=current_;current_=this;
    }
    // Static diagnostic label only; no payload, allocation or additional lock.
    void HolderRetentionCosts(const char* site,const std::array<std::uint64_t,4>& costs) noexcept {if(holder_){event_.site=site;if(!SubcostEnabled()){event_.counts=costs;retention_costs_=true;}}}
    bool owns_lock()const noexcept{return owned_;}
    ~Lock() noexcept {Release();current_=enclosing_;}
    // The owning RAII object performs both operations. No raw unlock behind a lock_guard.
    class Unlocked {
        Lock& lock_;
    public:
        explicit Unlocked(Lock& lock):lock_(lock){lock_.Release();}
        ~Unlocked(){lock_.Acquire();}
        Unlocked(const Unlocked&)=delete;Unlocked& operator=(const Unlocked&)=delete;
    };
    static Lock* Owner(std::mutex& mutex) noexcept {
        for(auto* p=current_;p;p=p->enclosing_)if(&p->mutex_==&mutex&&p->owned_)return p;
        return nullptr;
    }
    Lock(const Lock&)=delete;Lock& operator=(const Lock&)=delete;
};
class Scope {
    bool enabled_,always_,request_;Row row_;unsigned previous_=0;
public:
    Scope(Operation operation,Source source,unsigned line,bool always=false,bool request=false) noexcept:enabled_(Enabled()),always_(always),request_(request){
        if(!enabled_)return;
        if(request_){FlushFast();
        previous_=local.request;
        local.request=++next_request;
        }
        row_.k=1;row_.o=static_cast<unsigned>(operation);row_.s=static_cast<unsigned>(source);row_.l=line;row_.m=local.mutex;row_.b=row_.a=Now();
    }
    ~Scope() noexcept {if(!enabled_)return;row_.e=Now();Append(row_,always_);if(request_){FlushFast();local.request=previous_;}else Flush();}
    Scope(const Scope&)=delete;Scope& operator=(const Scope&)=delete;
};
// Visual diagnosis emits bounded start/end records immediately, including a still-running phase.
// Fixed literal names only; no query, path, token or media content. Same process steady clock.
class VisualPhase {
    inline static std::atomic<unsigned> sequence_{0},lines_{0};
    inline static std::atomic<bool> failed_{false};
    inline static thread_local unsigned current_{0};
    const char* name_;unsigned id_=0,parent_=0;bool active_=false;std::uint64_t summaryStart_=0;bool summary_=false;
    void Emit(bool end) noexcept {
        const auto n=lines_.fetch_add(1);
        if(n>=4096){if(!failed_.exchange(true))std::fputs("[visual-phase-loss] cap\n",stderr);return;}
        char row[256];const int size=std::snprintf(row,sizeof(row),
            "[visual-phase] {\"id\":%u,\"parent\":%u,\"thread\":%u,\"phase\":\"%s\",\"end\":%s,\"ns\":%llu}\n",
            id_,parent_,local.thread,name_,end?"true":"false",(unsigned long long)Now());
        if(size<=0||size>=int(sizeof(row))||std::fwrite(row,1,std::size_t(size),stderr)!=std::size_t(size)){
            failed_=true;std::fputs("[visual-phase-loss] write\n",stderr);
        }
    }
public:
    static bool Enabled() noexcept {static const bool yes=[] {const char* p=std::getenv("MEDIA_SERVER_VERIFY_VISUAL_LATENCY_TRACE");return p&&std::strcmp(p,"1")==0;}();return yes;}
    explicit VisualPhase(const char* name,bool selected=true,bool detailed=true) noexcept:name_(name){
        summary_=selected&&VisualRequestSummary::current;if(summary_)summaryStart_=Now();
        if(!(active_=selected&&detailed&&Enabled()))return;
        id_=++sequence_;parent_=current_;current_=id_;Emit(false);
    }
    void End() noexcept {if(summary_){VisualRequestSummary::Phase(name_,Now()-summaryStart_);summary_=false;}if(active_){Emit(true);current_=parent_;active_=false;}}
    ~VisualPhase(){End();}
    VisualPhase(const VisualPhase&)=delete;VisualPhase& operator=(const VisualPhase&)=delete;
};
inline void FinishThread() noexcept {if(Enabled())FlushFast();}
inline Local::~Local(){if(Enabled())FlushFast();}
} // namespace recording::latency

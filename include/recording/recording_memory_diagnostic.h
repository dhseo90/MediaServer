// 파일 용도: opt-in 메모리 귀속의 고정 크기 숫자 관측. 제품 객체를 소유하지 않는다.
#pragma once
#include <array>
#include <algorithm>
#include <chrono>
#include <cstdint>
#include <cstdlib>
#include <cstring>
#include <mutex>
namespace recording::memory_diagnostic {
inline bool Enabled() noexcept {static const bool value=[] {const auto* p=std::getenv("MEDIA_SERVER_VERIFY_MEMORY_ATTRIBUTION");return p&&!std::strcmp(p,"1");}();return value;}
inline std::uint64_t Now() noexcept {return std::chrono::duration_cast<std::chrono::nanoseconds>(std::chrono::steady_clock::now().time_since_epoch()).count();}
enum class Category:unsigned {Unattributed,Model,SourceBatch,RetryBatch,SourceCut,Preparation,Matches,Page,Response,PreparedNative,RetainedRaw,CatalogRow,Scratch,Count};
inline constexpr std::array<const char*,unsigned(Category::Count)> Names{{"unattributed","model","sourceBatch","retryBatch","sourceCut","preparation","matches","page","response","preparedNative","retainedRaw","catalogRow","scratch"}};
struct Model {std::uint64_t id{},bytes{},documents{},revision{};bool current{};std::uint64_t snapshotReferences{};bool publishedOnce{};};
struct Event {std::uint64_t at{},id{},kind{},bytes{},documents{},revision{};};
struct Pool {std::uint64_t key{},entries{},bytes{},matchBytes{},references{},uniqueModels{},uniqueBytes{},oldestExpiryNs{},newestExpiryNs{};std::array<std::uint64_t,8> models{};bool incomplete{};};
enum Counter:unsigned {StructuredRequests,Preparations,RequestMedia,RequestMediaEntries,RequestMediaBytes,ResponseHolds,PreparedReaders,PreparedBytes,VisualRequests,VisualPublications,VisualIndices,VisualIndexBytes,SourceCutRows,ResolvedMediaFDs,CounterCount};
struct State {
    std::mutex mutex;
    std::array<Model,128> models{};
    std::array<const void*,128> modelKeys{}; // never emitted, never dereferenced
    std::array<Pool,16> pools{};
    std::array<Event,32> events{};
    std::array<std::uint64_t,CounterCount> live{},peak{};
    std::uint64_t next=0,eventSequence=0,created=0,destroyed=0,published=0,noLongerCurrent=0,snapshotRetained=0,expired=0,evicted=0,byteEvicted=0,lastReaderReleaseNs=0,finalReprepare=0,peakModels=0;
    std::uint64_t visualGeneration=0,visualDocs=0,visualBytes=0,retiredBytes=0,visualReferences=0,retiredReferences=0,visualCapturedNs=0;
    bool loss=false;
};
inline State& Data(){static State state;return state;}
inline void EventLocked(State& s,std::uint64_t kind,const Model& m){s.events[s.eventSequence++%s.events.size()]={Now(),m.id,kind,m.bytes,m.documents,m.revision};}
inline std::uint64_t CreateModel(std::uint64_t bytes,std::uint64_t docs,std::uint64_t revision,const void* key=nullptr){
    if(!Enabled())return 0;
    auto& s=Data();std::lock_guard lock(s.mutex);
    for(auto& m:s.models) {
        if(m.id)continue;
        m={++s.next,bytes,docs,revision,false,0,false};s.modelKeys[&m-s.models.data()]=key;++s.created;
        s.peakModels=std::max(s.peakModels,s.created-s.destroyed);
        EventLocked(s,1,m);return m.id;
    }
    s.loss=true;return 0;
}
inline std::uint64_t ModelIdentity(const void* key) noexcept {
    if(!Enabled())return 0;
    auto& s=Data();std::lock_guard lock(s.mutex);
    for(unsigned i=0;i<s.models.size();++i)if(s.modelKeys[i]==key)return s.models[i].id;
    return 0;
}
inline std::uint64_t RetireModelKey(const void* key) noexcept {
    if(!Enabled())return 0;
    auto& s=Data();std::lock_guard lock(s.mutex);
    for(unsigned i=0;i<s.models.size();++i)if(s.modelKeys[i]==key){s.modelKeys[i]=nullptr;return s.models[i].id;}
    return 0;
}
inline void DestroyModel(std::uint64_t id) {
    if(!id)return;
    auto& s=Data();std::lock_guard lock(s.mutex);
    for(auto& m:s.models) {
        if(m.id!=id)continue;
        if(m.current){++s.noLongerCurrent;EventLocked(s,4,m);}
        ++s.destroyed;EventLocked(s,5,m);s.modelKeys[&m-s.models.data()]=nullptr;m={};return;
    }
    s.loss=true;
}
inline void Current(std::uint64_t old_id,std::uint64_t new_id){if(!Enabled()||old_id==new_id)return;auto& s=Data();std::lock_guard lock(s.mutex);for(auto& m:s.models){if(m.id&&m.id==old_id){m.current=false;++s.noLongerCurrent;EventLocked(s,4,m);}if(m.id&&m.id==new_id){m.current=true;m.publishedOnce=true;++s.published;EventLocked(s,2,m);}}}
inline void Add(Counter kind,std::int64_t delta){if(!Enabled())return;auto& s=Data();std::lock_guard lock(s.mutex);auto& n=s.live[kind];if(delta<0&&std::uint64_t(-delta)>n){s.loss=true;return;}n=delta<0?n-std::uint64_t(-delta):n+std::uint64_t(delta);s.peak[kind]=std::max(s.peak[kind],n);if(kind==PreparedReaders&&delta<0)s.lastReaderReleaseNs=Now();}
struct Activity {
    Counter kind;
    explicit Activity(Counter k):kind(k){Add(kind,1);}
    ~Activity(){Add(kind,-1);}
    Activity(const Activity&)=delete;Activity& operator=(const Activity&)=delete;
};
struct Gauge {Counter kind;std::uint64_t value{};explicit Gauge(Counter c):kind(c){}~Gauge(){Add(kind,-std::int64_t(value));}void Set(std::uint64_t n){Add(kind,std::int64_t(n)-std::int64_t(value));value=n;}Gauge(const Gauge&)=delete;Gauge& operator=(const Gauge&)=delete;};
inline void UpdatePool(const Pool& value,unsigned reason=0){
    if(!Enabled())return;
    auto& s=Data();std::lock_guard lock(s.mutex);Pool* slot=nullptr;
    for(auto& p:s.pools)if(p.key==value.key){slot=&p;break;}else if(!p.key&&!slot)slot=&p;
    if(!slot){s.loss=true;return;}*slot=value;if(reason==1)++s.expired;if(reason==2)++s.evicted;if(reason==3)++s.byteEvicted;
    for(auto& m:s.models)if(m.id){const auto prior=m.snapshotReferences;m.snapshotReferences=0;for(const auto& p:s.pools)for(auto id:p.models)if(id==m.id)++m.snapshotReferences;
        if(m.snapshotReferences>prior){m.publishedOnce=true;++s.snapshotRetained;EventLocked(s,3,m);}}
}
inline std::uint64_t NextIdentity(){if(!Enabled())return 0;auto& s=Data();std::lock_guard lock(s.mutex);return ++s.next;}
inline void RemovePool(std::uint64_t key){if(!key)return;UpdatePool(Pool{key});auto& s=Data();std::lock_guard lock(s.mutex);for(auto& p:s.pools)if(p.key==key)p={};}
}

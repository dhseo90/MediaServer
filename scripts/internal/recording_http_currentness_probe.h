#pragma once
// R156 only: fixed TLS aggregation; no product types/layout/ownership changes.
#include "recording_http_cost_probe.h"
#include <exception>
namespace r156 {
using U=r154::U;
enum Stage {ResponseAdmission,JsonInitialization,AvailabilityKey,AvailabilityCache,MediaResolve,FallbackResolve,DeletedState,ItemSerialization,ResponseTail,AuthorizationRecheck,JsonTake,DeletedIdCheck,SegmentLookup,EventLinkLookup,MediaHoldAcquire,ContainedMediaOpen,PhysicalInspection,MediaCurrentValidation,MediaObjectRelease,StageCount};
enum Counter {Positions,Items,AvailabilityCalls,InvalidKeys,CacheHits,CacheMisses,UniqueKeys,ResolveCalls,ResolveOK,ResolveFail,PreferredChecks,FallbackChecks,FallbackOK,FallbackFail,DeletedQueries,ResponseBytes,V1Rows,V2Rows,CounterCount};
struct Sample {U begin=0,end=0,budgetMs=0,state=0,timeout=0;};
struct Record {unsigned id=0,depth=0,samples=0;U begin=0,end=0;bool complete=false;std::array<U,StageCount> calls{},inclusive{},self{};std::array<U,CounterCount> counts{};std::array<Sample,128> inspections{};};
inline thread_local Record* active=nullptr;
struct Phase;
inline thread_local Phase* top=nullptr;
inline void Count(Counter c,U n=1){if(active)r154::Add(active->counts[c],n);}
struct Phase {
 Record* record;Phase* parent;Stage stage;U begin=0,children=0;bool ended=false;
 explicit Phase(Stage s):record(active),parent(top),stage(s){if(record){begin=r154::Tick();top=this;if(++record->depth>32)r154::Latch(156);}}
 void End(){if(ended)return;ended=true;if(!record)return;const auto elapsed=r154::Tick()-begin;if(top!=this||!record->depth||children>elapsed){r154::Latch(156);return;}top=parent;--record->depth;r154::Add(record->calls[stage]);r154::Add(record->inclusive[stage],elapsed);r154::Add(record->self[stage],elapsed-children);if(parent)r154::Add(parent->children,elapsed);}
 ~Phase(){End();}
};
template<class F> auto Eval(Stage s,F&& f)->decltype(f()){Phase p(s);return f();}
template<class F> auto Inspect(U budget,F&& f)->decltype(f()){
 const auto begin=r154::Tick();auto result=Eval(PhysicalInspection,std::forward<F>(f));const auto end=r154::Tick();
 if(active){if(active->samples>=active->inspections.size())r154::Latch(157);else active->inspections[active->samples++]={begin,end,budget,static_cast<U>(result.state),result.detail.find("timeout")!=std::string::npos||result.detail.find("deadline")!=std::string::npos?1ULL:0ULL};}return result;
}
struct Currentness {
 Record record;Record* prior;Phase* priorTop;int exceptions=std::uncaught_exceptions();
 Currentness():prior(active),priorTop(top){record.id=r154::active?r154::active->id:0;record.begin=r154::Tick();if(prior||!record.id)r154::Latch(156);active=&record;top=nullptr;}
 ~Currentness(){if(std::uncaught_exceptions()!=exceptions)record.complete=false;record.end=r154::Tick();if(record.depth||top)r154::Latch(156);active=prior;top=priorTop;r154::FlushLoss();char b[24576];int n=std::snprintf(b,sizeof(b),"[R156-currentness] {\"schema\":1,\"id\":%u,\"method\":\"GET\",\"routeClass\":\"structured-search\",\"begin\":%llu,\"end\":%llu,\"complete\":%s,\"loss\":%s,\"metrics\":[",record.id,(unsigned long long)record.begin,(unsigned long long)record.end,record.complete?"true":"false",r154::loss?"true":"false");
 for(unsigned i=0;i<StageCount&&n>0&&n<int(sizeof(b));++i)n+=std::snprintf(b+n,sizeof(b)-n,"%s[%llu,%llu,%llu]",i?",":"",(unsigned long long)record.calls[i],(unsigned long long)record.inclusive[i],(unsigned long long)record.self[i]);
 if(n>0&&n<int(sizeof(b)))n+=std::snprintf(b+n,sizeof(b)-n,"],\"counts\":[");
 for(unsigned i=0;i<CounterCount&&n>0&&n<int(sizeof(b));++i)n+=std::snprintf(b+n,sizeof(b)-n,"%s%llu",i?",":"",(unsigned long long)record.counts[i]);
 if(n>0&&n<int(sizeof(b)))n+=std::snprintf(b+n,sizeof(b)-n,"],\"inspections\":[");
 for(unsigned i=0;i<record.samples&&n>0&&n<int(sizeof(b));++i){const auto& s=record.inspections[i];n+=std::snprintf(b+n,sizeof(b)-n,"%s[%llu,%llu,%llu,%llu,%llu]",i?",":"",(unsigned long long)s.begin,(unsigned long long)s.end,(unsigned long long)s.budgetMs,(unsigned long long)s.state,(unsigned long long)s.timeout);}
 if(n>0&&n+4<int(sizeof(b))){std::memcpy(b+n,"]}\n",3);r154::Write(b,n+3);}else r154::Lose(158);
 }
};
}

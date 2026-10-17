#pragma once
// R157 test-only TLS; no product header/type/layout or lock changes.
#include "recording_http_cost_probe.h"
#include <exception>
namespace r157 {
using U=r154::U;
enum Stage {DeletedAPI,V1API,V2API,LinksAPI,AcquireAPI,ValidateAPI,ReleaseAPI,
 LockConstruction,OwnedBody,AcquireInit,Eligibility,EligibilityCanRead,EligibilityLifecycle,EventProtection,LocationLookup,SegmentCopy,ValidateBody,ContentCompare,
 PlusHold,PlusRead,PlusLifecycle,PlusLookup,PlusRange,PlusGeneration,PlusPrecheck,PlusBegin,PlusPrepare,PlusBindStep,PlusCommitAuthority,PlusCommit,PlusRollback,PlusLegacy,PlusMap,
 MinusHold,MinusRead,MinusLifecycle,MinusLookup,MinusRange,MinusGeneration,MinusPrecheck,MinusBegin,MinusPrepare,MinusBindStep,MinusCommitAuthority,MinusCommit,MinusRollback,MinusLegacy,MinusMap,
 FDClose,FDDiagnostic,StageCount};
enum Counter {Continuous,Event,OtherRetention,PlusCalls,MinusCalls,PlusPrior,PlusNext,MinusPrior,MinusNext,PlusOK,PlusFail,MinusOK,MinusFail,GenerationPlus,GenerationMinus,SQLitePlus,SQLiteMinus,LegacyPlus,LegacyMinus,CloseOK,CloseFail,CounterCount};
struct Record {unsigned id=0,depth=0;U begin=0,end=0;bool complete=false;std::array<U,StageCount> calls{},inclusive{},self{};std::array<U,CounterCount> counts{};std::array<U,7> positive{},negative{};};
inline thread_local Record* active=nullptr;
struct Phase;inline thread_local Phase* top=nullptr;
inline thread_local int direction=0;
inline void Count(Counter c,U n=1) noexcept {if(active)r154::Add(active->counts[c],n);}
struct Phase {
 Record* r;Phase* parent;Stage stage;U begin=0,children=0;bool ended=false;
 explicit Phase(Stage s) noexcept:r(active),parent(top),stage(s){if(r){begin=r154::Tick();top=this;if(++r->depth>32)r154::Latch(170);}}
 void End() noexcept {if(ended)return;ended=true;if(!r)return;const U elapsed=r154::Tick()-begin;if(top!=this||!r->depth||children>elapsed){r154::Latch(170);return;}top=parent;--r->depth;r154::Add(r->calls[stage]);r154::Add(r->inclusive[stage],elapsed);r154::Add(r->self[stage],elapsed-children);if(parent)r154::Add(parent->children,elapsed);}
 ~Phase() noexcept {End();}
};
template<class F> auto Eval(Stage s,F&& f)->decltype(f()){Phase phase(s);return f();}
template<class F,class P> auto Api(Stage s,F&& f,P&& positive)->decltype(f()) {Phase phase(s);auto result=f();if(active){r154::Add(positive(result)?active->positive[s]:active->negative[s]);}return result;}
template<class F> auto BoolApi(Stage s,F&& f)->decltype(f()){return Api(s,std::forward<F>(f),[](const auto& v){return bool(v);});}
inline Stage HoldStage(Stage plus) noexcept {return static_cast<Stage>(plus+(direction<0?MinusHold-PlusHold:0));}
struct Direction {int prior;explicit Direction(std::int64_t delta) noexcept:prior(direction){direction=delta<0?-1:1;if(active&&delta!=1&&delta!=-1)r154::Latch(171);Count(direction<0?MinusCalls:PlusCalls);}~Direction() noexcept {direction=prior;}};
template<class F> bool Hold(std::int64_t delta,F&& f){Direction d(delta);Phase phase(HoldStage(PlusHold));const bool ok=f();Count(direction<0?(ok?MinusOK:MinusFail):(ok?PlusOK:PlusFail));return ok;}
template<class F> auto H(Stage plus,F&& f)->decltype(f()){return Eval(HoldStage(plus),std::forward<F>(f));}
struct Window {
 Record record;Record* prior=nullptr;Phase* priorTop=nullptr;int exceptions=0;bool started=false,ended=false;
 void Start(unsigned id) noexcept {started=true;prior=active;priorTop=top;exceptions=std::uncaught_exceptions();record.id=id;record.begin=r154::Tick();if(prior||!id||id>128)r154::Latch(172);active=&record;top=nullptr;}
 void End(bool complete) noexcept {if(!started||ended)return;ended=true;record.end=r154::Tick();record.complete=complete&&std::uncaught_exceptions()==exceptions;if(record.depth||top)r154::Latch(172);active=prior;top=priorTop;}
 void Emit() noexcept {
  if(!started||!ended){r154::Lose(173);return;}r154::FlushLoss();char b[16384];int n=std::snprintf(b,sizeof(b),"[R157-hold] {\"schema\":1,\"id\":%u,\"begin\":%llu,\"end\":%llu,\"complete\":%s,\"loss\":%s,\"mutexTiming\":\"UNKNOWN\",\"journalMutexTiming\":\"UNKNOWN\",\"metrics\":[",record.id,(unsigned long long)record.begin,(unsigned long long)record.end,record.complete?"true":"false",r154::loss?"true":"false");
  for(unsigned i=0;i<StageCount&&n>0&&n<int(sizeof(b));++i)n+=std::snprintf(b+n,sizeof(b)-n,"%s[%llu,%llu,%llu]",i?",":"",(unsigned long long)record.calls[i],(unsigned long long)record.inclusive[i],(unsigned long long)record.self[i]);
  if(n>0&&n<int(sizeof(b)))n+=std::snprintf(b+n,sizeof(b)-n,"],\"counts\":[");
  for(unsigned i=0;i<CounterCount&&n>0&&n<int(sizeof(b));++i)n+=std::snprintf(b+n,sizeof(b)-n,"%s%llu",i?",":"",(unsigned long long)record.counts[i]);
  if(n>0&&n<int(sizeof(b)))n+=std::snprintf(b+n,sizeof(b)-n,"],\"outcomes\":[");
  for(unsigned i=0;i<7&&n>0&&n<int(sizeof(b));++i)n+=std::snprintf(b+n,sizeof(b)-n,"%s[%llu,%llu]",i?",":"",(unsigned long long)record.positive[i],(unsigned long long)record.negative[i]);
  if(n>0&&n+4<int(sizeof(b))){std::memcpy(b+n,"]}\n",3);r154::Write(b,n+3);}else r154::Lose(173);
 }
 ~Window() noexcept {if(started&&!ended){End(false);r154::Latch(173);}}
};
}

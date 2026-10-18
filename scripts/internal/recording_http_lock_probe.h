#pragma once
// R159 callsites only; the original latency header and Lock definitions are unchanged.
#include "recording_http_cost_probe.h"
#include "recording/recording_latency_trace.h"
namespace r159 {
namespace L=recording::latency;
using U=std::uint64_t;
constexpr unsigned Cap=128,Base=1000000;
struct Row {unsigned id=0,ordinal=0,api=0,line=0,thread=0,mutex=0,identity=0;int delta=0;U cb=0,ce=0,rb=0,re=0;bool owned=false;};
struct Record {unsigned id=0,count=0,depth=0;U begin=0,end=0;std::array<Row,Cap> rows{};};
inline thread_local Record* active=nullptr;
struct Window {
 Record record;Record* prior=active;const bool& complete;int exceptions=std::uncaught_exceptions();
 Window(unsigned id,const bool& done):complete(done){record.id=id;record.begin=L::Now();if(prior||(id!=10&&id!=11&&id!=60)||!L::Enabled()||L::SlowOnly()||L::HolderEnabled())r154::Latch(190);active=&record;}
 ~Window() noexcept {
  record.end=L::Now();active=prior;
  if(record.depth||L::local.depth||std::uncaught_exceptions()!=exceptions||!complete)r154::Latch(191);
  // The selected Lock objects are already destroyed. Flush original buffered rows.
  L::FinishThread();r154::FlushLoss();
  for(unsigned i=0;i<record.count&&i<Cap;++i){const auto& r=record.rows[i];char b[640];const int n=std::snprintf(b,sizeof(b),"[R159-call] {\"schema\":1,\"id\":%u,\"ordinal\":%u,\"api\":%u,\"line\":%u,\"thread\":%u,\"mutex\":%u,\"identity\":%u,\"delta\":%d,\"cb\":%llu,\"ce\":%llu,\"rb\":%llu,\"re\":%llu,\"owned\":%s}\n",r.id,r.ordinal,r.api,r.line,r.thread,r.mutex,r.identity,r.delta,(unsigned long long)r.cb,(unsigned long long)r.ce,(unsigned long long)r.rb,(unsigned long long)r.re,r.owned?"true":"false");if(n>0&&n<int(sizeof(b)))r154::Write(b,n);else r154::Lose(192);}
  char b[512];const int n=std::snprintf(b,sizeof(b),"[R159-end] {\"schema\":1,\"id\":%u,\"count\":%u,\"begin\":%llu,\"end\":%llu,\"complete\":%s,\"enabled\":%s,\"slow\":%s,\"holder\":%s,\"loss\":%s}\n",record.id,record.count,(unsigned long long)record.begin,(unsigned long long)record.end,complete?"true":"false",L::Enabled()?"true":"false",L::SlowOnly()?"true":"false",L::HolderEnabled()?"true":"false",(r154::loss||L::local.loss||L::loss_emitted)?"true":"false");if(n>0&&n<int(sizeof(b)))r154::Write(b,n);else r154::Lose(192);
 }
};
struct Call {
 Record* record=active;Row* row=nullptr;unsigned prior=L::local.request;
 Call(unsigned api,unsigned line,int delta=0) noexcept {
  if(!record)return;
  if(record->count>=Cap){r154::Latch(193);return;}
  row=&record->rows[record->count++];row->id=record->id;row->ordinal=record->count;row->api=api;row->line=line;row->delta=delta;row->thread=L::local.thread;row->identity=Base+row->id*Cap+row->ordinal;
  ++record->depth;L::local.request=row->identity;
 }
 bool Selected()const noexcept{return row!=nullptr;}
 void Begin()noexcept{if(row)row->cb=L::Now();}
 void Acquired(bool owned)noexcept{if(row){row->ce=L::Now();row->owned=owned;row->mutex=static_cast<unsigned>(L::local.mutex);}}
 ~Call() noexcept {if(!row)return;row->re=L::Now();if(L::local.request!=row->identity||!record->depth)r154::Latch(194);else --record->depth;L::local.request=prior;}
};
// Declared immediately after Lock; destructor runs immediately before Lock's destructor.
struct Release {Call& call;~Release()noexcept{if(call.row)call.row->rb=L::Now();}};
}

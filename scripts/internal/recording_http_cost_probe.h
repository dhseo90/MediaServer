#pragma once
// R154: only included by generated direct-fixture overlays. No product header/type changes.
#include "recording_http_observation.h"
#include <array>
#include <atomic>
#include <chrono>
#include <cstdio>
#include <cstdint>
#include <limits>
#include <mutex>
#include <cstring>
#include "recording/recording_search_diagnostic.h"
namespace r154 {
using U=std::uint64_t;
inline U Tick(){return std::chrono::duration_cast<std::chrono::nanoseconds>(std::chrono::steady_clock::now().time_since_epoch()).count();}
inline std::atomic<bool> loss{false};
inline std::mutex output_mutex;
inline std::array<std::atomic<bool>,128> seen{};
inline unsigned Class(unsigned id){return id==10||id==11?1:id==12||id==13?2:id==60?3:id>=20&&id<60?4:id>=61?5:6;}
inline bool Add(U& value,U n=1){if(n>std::numeric_limits<U>::max()-value){loss=true;return false;}value+=n;return true;}
inline void Write(const char* s,std::size_t n){std::lock_guard<std::mutex> l(output_mutex);if(std::fwrite(s,1,n,stderr)!=n||std::fflush(stderr)){loss=true;std::fputs("[R154-loss]\n",stdout);std::fflush(stdout);}}
enum Metric {Capture,Sort,Group,Consumer,Locate,Validate1,Build,Validate2,Original,Segment,Lifecycle,Acquire,BinarySearch,CatalogWait,CatalogHeld,MetricCount};
enum Counter {BindingsTotal,Scanned,NonNull,SegmentLookups,LifecycleChecks,ChannelMatches,SourceMatches,GenerationMatches,FullMatches,OwnedAcquisitions,BinarySearches,Exact,Unknown,OtherChannel,OtherSegment,OtherLifecycle,Pending,UniqueKeys,CounterCount};
struct Record {unsigned id=0;std::array<U,MetricCount> calls{},ns{};std::array<U,CounterCount> counts{};};
inline thread_local Record* active=nullptr;
inline void Count(Counter c,U n=1){if(active)Add(active->counts[c],n);}
struct Phase {Metric m;U begin=0;explicit Phase(Metric m):m(m),begin(active?Tick():0){}~Phase(){if(begin&&active){Add(active->calls[m]);Add(active->ns[m],Tick()-begin);}}};
template<class F> auto Eval(Metric m,F&& f)->decltype(f()){Phase p(m);return f();}
struct Held {U acquired=0;void Acquired(U before){acquired=Tick();if(active){Add(active->calls[CatalogWait]);Add(active->ns[CatalogWait],acquired-before);}}~Held(){if(acquired&&active){Add(active->calls[CatalogHeld]);Add(active->ns[CatalogHeld],Tick()-acquired);}}};
inline unsigned Identity(const std::string& s){unsigned id=0;if(s.empty()||s.size()>3){loss=true;return 0;}for(char c:s){if(c<'0'||c>'9'){loss=true;return 0;}id=id*10+c-'0';}if(!id||id>128){loss=true;return 0;}return id;}
struct Server {
 Record record;Record* prior;U accepted,parsed,handler=0,prepared=0,sendBegin=0,sendEnd=0;bool sent=false,ended=false;
 Server(unsigned id,U accept):prior(active),accepted(accept),parsed(Tick()){record.id=id;if(!id||id>128||seen[id-1].exchange(true))loss=true;active=&record;}
 ~Server(){End();}
 void End(){if(ended)return;ended=true;active=prior;char b[4096];int n=std::snprintf(b,sizeof(b),"[R154-server] {\"id\":%u,\"class\":%u,\"accepted\":%llu,\"parsed\":%llu,\"handler\":%llu,\"prepared\":%llu,\"sendBegin\":%llu,\"sendEnd\":%llu,\"sent\":%s,\"end\":%llu,\"loss\":%s,\"metrics\":[",record.id,Class(record.id),(unsigned long long)accepted,(unsigned long long)parsed,(unsigned long long)handler,(unsigned long long)prepared,(unsigned long long)sendBegin,(unsigned long long)sendEnd,sent?"true":"false",(unsigned long long)Tick(),loss?"true":"false");
 for(unsigned i=0;i<MetricCount&&n>0&&n<int(sizeof(b));++i)n+=std::snprintf(b+n,sizeof(b)-n,"%s[%llu,%llu]",i?",":"",(unsigned long long)record.calls[i],(unsigned long long)record.ns[i]);
 if(n>0&&n<int(sizeof(b)))n+=std::snprintf(b+n,sizeof(b)-n,"],\"counts\":[");
 for(unsigned i=0;i<CounterCount&&n>0&&n<int(sizeof(b));++i)n+=std::snprintf(b+n,sizeof(b)-n,"%s%llu",i?",":"",(unsigned long long)record.counts[i]);
 if(n>0&&n+4<int(sizeof(b))){std::memcpy(b+n,"]}\n",3);Write(b,n+3);}else{loss=true;Write("[R154-loss]\n",12);}}
};
struct Search {
 recording::SearchDiagnostic& d;unsigned id;U begin;
 explicit Search(recording::SearchDiagnostic& v):d(v),id(active?active->id:0),begin(Tick()){if(!id)loss=true;}
 ~Search(){char b[8192];int n=std::snprintf(b,sizeof(b),"[R154-search] {\"id\":%u,\"diagnosticId\":%u,\"begin\":%llu,\"end\":%llu,\"status\":%d,\"attempt\":%u,\"loss\":%s,\"phases\":[",id,d.id,(unsigned long long)begin,(unsigned long long)Tick(),d.status,d.attempt,(d.cost_loss||!d.id||loss)?"true":"false");
 for(unsigned i=0;i<d.cost_count&&n>0&&n<int(sizeof(b));++i){auto& c=d.costs[i];n+=std::snprintf(b+n,sizeof(b)-n,"%s[\"%s\",%llu,%llu]",i?",":"",c.name,(unsigned long long)c.begin,(unsigned long long)c.end);}
 if(n>0&&n<int(sizeof(b)))n+=std::snprintf(b+n,sizeof(b)-n,"],\"sources\":[");
 for(unsigned i=0;i<=d.attempt&&i<3&&n>0&&n<int(sizeof(b));++i){auto& a=d.attempts[i];n+=std::snprintf(b+n,sizeof(b)-n,"%s[%llu,%llu,%llu,%llu,%s,%s]",i?",":"",(unsigned long long)a.instance,(unsigned long long)a.captured,(unsigned long long)a.documents,(unsigned long long)a.references,a.rebuild?"true":"false",a.authority?"true":"false");}
 if(n>0&&n+4<int(sizeof(b))){std::memcpy(b+n,"]}\n",3);Write(b,n+3);}else{loss=true;Write("[R154-loss]\n",12);}}
};
// Client owns these stamps; the server never writes them.
inline std::array<std::array<U,2>,128> connects{};
struct Client {
 unsigned id;U begin,sendBegin=0,sendEnd=0;recording_http_observation::HttpObservation& o;
 Client(unsigned i,recording_http_observation::HttpObservation& v):id(i),begin(Tick()),o(v){}
 ~Client(){char b[768];auto c=connects[id-1];const int n=std::snprintf(b,sizeof(b),"[R154-client] {\"id\":%u,\"class\":%u,\"begin\":%llu,\"connectBegin\":%llu,\"connectEnd\":%llu,\"sendBegin\":%llu,\"sendEnd\":%llu,\"header\":%llu,\"receiveEnd\":%llu,\"end\":%llu,\"status\":%d,\"error\":%d,\"bytes\":%zu,\"loss\":%s}\n",id,Class(id),(unsigned long long)begin,(unsigned long long)c[0],(unsigned long long)c[1],(unsigned long long)sendBegin,(unsigned long long)sendEnd,(unsigned long long)o.headerNs,(unsigned long long)o.receiveEndNs,(unsigned long long)Tick(),o.status,o.error,o.bytes,loss?"true":"false");if(n>0&&n<int(sizeof(b)))Write(b,n);else loss=true;}
};
}

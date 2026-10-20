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
inline std::atomic<unsigned> first_loss{0};
inline std::atomic<bool> loss_emitted{false};
// Fixed numeric codes, no payload/path. Counter overflow can occur under Catalog lock:
// latch there; its Original scope emits only after the lock has been destroyed.
inline void Latch(unsigned code){loss=true;unsigned expected=0;first_loss.compare_exchange_strong(expected,code);}
inline void FlushLoss(){if(!loss||loss_emitted.exchange(true))return;char b[160];const int n=std::snprintf(b,sizeof(b),"[R154-loss] {\"code\":%u,\"at\":%llu}\n",first_loss.load(),(unsigned long long)Tick());std::lock_guard<std::mutex> l(output_mutex);if(n<=0||n>=int(sizeof(b))||std::fwrite(b,1,n,stderr)!=std::size_t(n)||std::fflush(stderr)){std::fputs("[R154-loss] output-failure\n",stdout);std::fflush(stdout);}}
inline void Lose(unsigned code){Latch(code);FlushLoss();}
inline thread_local unsigned header_count=0;
inline void HeaderSeen(const std::string& key){constexpr char wanted[]="x-r154-id";if(key.size()!=sizeof(wanted)-1)return;for(unsigned i=0;i<key.size();++i){char c=key[i];if(c>='A'&&c<='Z')c+=32;if(c!=wanted[i])return;}if(header_count<2)++header_count;}

inline std::array<std::atomic<bool>,128> seen{};
inline unsigned Class(unsigned id){return id==10||id==11?1:id==12||id==13?2:id==60?3:id>=20&&id<60?4:id>=61?5:6;}
inline bool Add(U& value,U n=1){if(n>std::numeric_limits<U>::max()-value){Latch(4);return false;}value+=n;return true;}
inline void Write(const char* s,std::size_t n){bool failed;{std::lock_guard<std::mutex> l(output_mutex);failed=std::fwrite(s,1,n,stderr)!=n||std::fflush(stderr);}if(failed)Lose(5);}

enum Metric {Capture,Sort,Group,Consumer,Locate,Validate1,Build,Validate2,Original,Segment,Lifecycle,Acquire,BinarySearch,CatalogWait,CatalogHeld,MetricCount};
enum Counter {BindingsTotal,Scanned,NonNull,SegmentLookups,LifecycleChecks,ChannelMatches,SourceMatches,GenerationMatches,FullMatches,OwnedAcquisitions,BinarySearches,Exact,Unknown,OtherChannel,OtherSegment,OtherLifecycle,Pending,UniqueKeys,CounterCount};
struct Record {unsigned id=0;std::array<U,MetricCount> calls{},ns{};std::array<U,CounterCount> counts{};};
inline thread_local Record* active=nullptr;
inline void Count(Counter c,U n=1){if(active)Add(active->counts[c],n);}
struct Phase {Metric m;U begin=0;explicit Phase(Metric m):m(m),begin(active?Tick():0){}~Phase(){if(begin&&active){Add(active->calls[m]);Add(active->ns[m],Tick()-begin);}if(m==Original)FlushLoss();}};
template<class F> auto Eval(Metric m,F&& f)->decltype(f()){Phase p(m);return f();}
struct Held {U acquired=0;void Acquired(U before){acquired=Tick();if(active){Add(active->calls[CatalogWait]);Add(active->ns[CatalogWait],acquired-before);}}~Held(){if(acquired&&active){Add(active->calls[CatalogHeld]);Add(active->ns[CatalogHeld],Tick()-acquired);}}};
inline unsigned Identity(const std::string& s){unsigned id=0;if(s.empty()||s.size()>3){Lose(1);return 0;}for(char c:s){if(c<'0'||c>'9'){Lose(1);return 0;}id=id*10+c-'0';}if(!id||id>128){Lose(1);return 0;}return id;}
inline unsigned Correlation(const std::string& value){if(header_count!=1){Lose(header_count?2:1);return 0;}return Identity(value);}

struct Server {
 Record record;Record* prior;U accepted,parsed,handler=0,prepared=0,sendBegin=0,sendEnd=0;bool sent=false,ended=false,valid=false;
 Server(unsigned id,U accept):prior(active),accepted(accept),parsed(Tick()){record.id=id;valid=id&&id<=128;if(!valid)Lose(1);else if(seen[id-1].exchange(true)){valid=false;Lose(3);}active=valid?&record:nullptr;}
 ~Server(){End();}
 void End(){if(ended)return;ended=true;active=prior;FlushLoss();if(!valid)return;char b[4096];int n=std::snprintf(b,sizeof(b),"[R154-server] {\"id\":%u,\"class\":%u,\"accepted\":%llu,\"parsed\":%llu,\"handler\":%llu,\"prepared\":%llu,\"sendBegin\":%llu,\"sendEnd\":%llu,\"sent\":%s,\"end\":%llu,\"loss\":%s,\"metrics\":[",record.id,Class(record.id),(unsigned long long)accepted,(unsigned long long)parsed,(unsigned long long)handler,(unsigned long long)prepared,(unsigned long long)sendBegin,(unsigned long long)sendEnd,sent?"true":"false",(unsigned long long)Tick(),loss?"true":"false");
 for(unsigned i=0;i<MetricCount&&n>0&&n<int(sizeof(b));++i)n+=std::snprintf(b+n,sizeof(b)-n,"%s[%llu,%llu]",i?",":"",(unsigned long long)record.calls[i],(unsigned long long)record.ns[i]);
 if(n>0&&n<int(sizeof(b)))n+=std::snprintf(b+n,sizeof(b)-n,"],\"counts\":[");
 for(unsigned i=0;i<CounterCount&&n>0&&n<int(sizeof(b));++i)n+=std::snprintf(b+n,sizeof(b)-n,"%s%llu",i?",":"",(unsigned long long)record.counts[i]);
 if(n>0&&n+4<int(sizeof(b))){std::memcpy(b+n,"]}\n",3);Write(b,n+3);}else Lose(6);}
};
struct Search {
 recording::SearchDiagnostic& d;unsigned id;U begin;
 explicit Search(recording::SearchDiagnostic& v):d(v),id(active?active->id:0),begin(Tick()){if(!id)Lose(1);}
 ~Search(){if(d.cost_loss||!d.id)Lose(7);if(!id)return;char b[8192];int n=std::snprintf(b,sizeof(b),"[R154-search] {\"id\":%u,\"diagnosticId\":%u,\"begin\":%llu,\"end\":%llu,\"status\":%d,\"attempt\":%u,\"loss\":%s,\"phases\":[",id,d.id,(unsigned long long)begin,(unsigned long long)Tick(),d.status,d.attempt,(d.cost_loss||!d.id||loss)?"true":"false");
 for(unsigned i=0;i<d.cost_count&&n>0&&n<int(sizeof(b));++i){auto& c=d.costs[i];n+=std::snprintf(b+n,sizeof(b)-n,"%s[\"%s\",%llu,%llu]",i?",":"",c.name,(unsigned long long)c.begin,(unsigned long long)c.end);}
 if(n>0&&n<int(sizeof(b)))n+=std::snprintf(b+n,sizeof(b)-n,"],\"sources\":[");
 for(unsigned i=0;i<=d.attempt&&i<3&&n>0&&n<int(sizeof(b));++i){auto& a=d.attempts[i];n+=std::snprintf(b+n,sizeof(b)-n,"%s[%llu,%llu,%llu,%llu,%s,%s]",i?",":"",(unsigned long long)a.instance,(unsigned long long)a.captured,(unsigned long long)a.documents,(unsigned long long)a.references,a.rebuild?"true":"false",a.authority?"true":"false");}
 if(n>0&&n+4<int(sizeof(b))){std::memcpy(b+n,"]}\n",3);Write(b,n+3);}else Lose(6);}
};
// Client owns these stamps; the server never writes them.
inline std::array<std::array<U,2>,128> connects{};
struct Client {
 unsigned id;U begin,sendBegin=0,sendEnd=0;recording_http_observation::HttpObservation& o;
 Client(unsigned i,recording_http_observation::HttpObservation& v):id(i),begin(Tick()),o(v){}
 ~Client(){char b[768];auto c=connects[id-1];const int n=std::snprintf(b,sizeof(b),"[R154-client] {\"id\":%u,\"class\":%u,\"begin\":%llu,\"connectBegin\":%llu,\"connectEnd\":%llu,\"sendBegin\":%llu,\"sendEnd\":%llu,\"header\":%llu,\"receiveEnd\":%llu,\"end\":%llu,\"status\":%d,\"error\":%d,\"bytes\":%zu,\"loss\":%s}\n",id,Class(id),(unsigned long long)begin,(unsigned long long)c[0],(unsigned long long)c[1],(unsigned long long)sendBegin,(unsigned long long)sendEnd,(unsigned long long)o.headerNs,(unsigned long long)o.receiveEndNs,(unsigned long long)Tick(),o.status,o.error,o.bytes,loss?"true":"false");if(n>0&&n<int(sizeof(b)))Write(b,n);else Lose(6);}
};
}

// R171: same owned overlay/sink, separate correlation domain. No product API trust.
namespace r171 {
using U=std::uint64_t;
inline bool Enabled(){return recording::latency::SearchAttributionEnabled();}
inline constexpr unsigned RequestCap=512,DetailCap=24;
inline constexpr std::size_t ByteCap=512*1024;
inline std::array<std::atomic<bool>,RequestCap> seen{};
inline std::atomic<unsigned> details{0};
inline std::size_t bytes=0;
inline thread_local unsigned headers=0;
inline void HeaderSeen(const std::string& key){if(!Enabled())return;constexpr char name[]="x-r171-id";if(key.size()!=sizeof(name)-1)return;for(unsigned i=0;i<key.size();++i){char c=key[i];if(c>='A'&&c<='Z')c+=32;if(c!=name[i])return;}if(headers<2)++headers;}
inline unsigned Identity(const std::string& value){if(!Enabled())return 0;if(value.empty()&&!headers)return 0;unsigned id=0;if(headers!=1||value.empty()||value.size()>3){r154::Lose(171);return 0;}for(char c:value){if(c<'0'||c>'9'){r154::Lose(171);return 0;}id=id*10+c-'0';}if(!id||id>RequestCap){r154::Lose(171);return 0;}return id;}
inline void Write(const char* b,int n,std::size_t capacity){bool failed=n<=0||std::size_t(n)>=capacity;
 {std::lock_guard<std::mutex> lock(r154::output_mutex);if(!failed){if(bytes>ByteCap-192||std::size_t(n)>ByteCap-192-bytes)failed=true;else{bytes+=n;failed=std::fwrite(b,1,n,stderr)!=std::size_t(n)||std::fflush(stderr)!=0;}}}
 if(failed)r154::Lose(172);
}
struct Server;
inline thread_local Server* active=nullptr;
struct Server {
 unsigned id=0;Server* prior;U dispatch=0,handler=0,prepared=0,send_begin=0,send_end=0;int status=0;bool sent=false,ended=false;
 explicit Server(unsigned value):id(Enabled()?value:0),prior(active){if(id>RequestCap){r154::Lose(171);id=0;}if(id&&seen.at(id-1).exchange(true)){r154::Lose(173);id=0;}active=id?this:nullptr;if(!id)return;dispatch=r154::Tick();char b[192];const int n=std::snprintf(b,sizeof(b),"[R171-dispatch] {\"id\":%u,\"at\":%llu,\"loss\":false}\n",id,(unsigned long long)dispatch);Write(b,n,sizeof(b));}
 ~Server(){End();}
 void End(){if(ended)return;ended=true;active=prior;if(!id)return;char b[512];const int n=std::snprintf(b,sizeof(b),"[R171-server] {\"id\":%u,\"dispatch\":%llu,\"handler\":%llu,\"prepared\":%llu,\"sendBegin\":%llu,\"sendEnd\":%llu,\"end\":%llu,\"status\":%d,\"sent\":%s,\"loss\":%s}\n",id,(unsigned long long)dispatch,(unsigned long long)handler,(unsigned long long)prepared,(unsigned long long)send_begin,(unsigned long long)send_end,(unsigned long long)r154::Tick(),status,sent?"true":"false",r154::loss?"true":"false");Write(b,n,sizeof(b));}
};
struct Search {
 recording::SearchDiagnostic& d;unsigned id=0,prior_id;U begin=0;
 explicit Search(recording::SearchDiagnostic& value):d(value),id(active?active->id:0),prior_id(d.id){if(!id)return;begin=r154::Tick();if(!d.id){d.id=id;d.entered=begin;}char b[192];const int n=std::snprintf(b,sizeof(b),"[R171-search-enter] {\"id\":%u,\"at\":%llu,\"loss\":false}\n",id,(unsigned long long)begin);Write(b,n,sizeof(b));}
 ~Search(){if(!id)return;const auto end=r154::Tick();bool detail=d.status>=400||end-begin>=2000000000ULL;
  for(unsigned i=0;i<d.capture_count;++i)detail=detail||d.captures[i].end-d.captures[i].begin>=500000000ULL;
  if(d.cost_loss||d.capture_loss||d.attempt>=3)r154::Lose(174);
  char b[16384];int n=std::snprintf(b,sizeof(b),"[R171-search] {\"id\":%u,\"begin\":%llu,\"end\":%llu,\"diagnosticStatus\":%d,\"exception\":\"%s\",\"rejections\":[%llu,%llu],\"detail\":%s,\"loss\":%s,\"attempts\":[",id,(unsigned long long)begin,(unsigned long long)end,d.status,d.exception,(unsigned long long)d.rejection_start,(unsigned long long)(d.resources?d.resources->rejected():0),detail?"true":"false",r154::loss?"true":"false");
  if(detail&&details.fetch_add(1)>=DetailCap){r154::Lose(175);d.id=prior_id;return;}
  for(unsigned i=0;i<=d.attempt&&i<3&&n>0&&n<int(sizeof(b));++i){const auto& a=d.attempts[i];n+=std::snprintf(b+n,sizeof(b)-n,"%s{\"stage\":\"%s\",\"reason\":\"%s\",\"captured\":%llu,\"current\":%llu,\"authority\":%s}",i?",":"",a.stage,a.reason,(unsigned long long)a.captured,(unsigned long long)a.current,a.authority?"true":"false");}
  if(n>0&&n<int(sizeof(b)))n+=std::snprintf(b+n,sizeof(b)-n,"],\"captures\":[");
  for(unsigned i=0;detail&&i<d.capture_count&&n>0&&n<int(sizeof(b));++i){const auto& c=d.captures[i];n+=std::snprintf(b+n,sizeof(b)-n,"%s[%u,%u,%u,%llu,%llu,%llu,%llu,%llu,%llu,%llu,%llu,%llu,%llu,%llu,%llu,%llu,%llu,%llu,%llu,%llu,%s]",i?",":"",i+1,c.parent,c.attempt,(unsigned long long)c.begin,(unsigned long long)c.end,(unsigned long long)c.rows,(unsigned long long)c.cut_rows,(unsigned long long)c.raw_bytes,(unsigned long long)c.read_ns,(unsigned long long)c.outside_ns,(unsigned long long)c.decode_calls,(unsigned long long)c.decode_hits,(unsigned long long)c.parse_ns,(unsigned long long)c.raw_read_ns,(unsigned long long)c.shared,(unsigned long long)c.materialized,(unsigned long long)c.captured,(unsigned long long)c.current,(unsigned long long)c.rejected_before,(unsigned long long)c.rejected_after,c.complete?"true":"false");}
  if(n>0&&n<int(sizeof(b)))n+=std::snprintf(b+n,sizeof(b)-n,"],\"phases\":[");
  for(unsigned i=0;detail&&i<d.cost_count&&n>0&&n<int(sizeof(b));++i){const auto& c=d.costs[i];n+=std::snprintf(b+n,sizeof(b)-n,"%s[\"%s\",%llu,%llu]",i?",":"",c.name,(unsigned long long)c.begin,(unsigned long long)c.end);}
  if(n>0&&n+4<int(sizeof(b))){std::memcpy(b+n,"]}\n",3);Write(b,n+3,sizeof(b));}else r154::Lose(176);
  // Suppress the old unselected destructor output, preserve the selected 1..15 contract.
  d.id=prior_id;
 }
};
}

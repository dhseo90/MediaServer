// R142: frozen numeric samples only; no server, media, model or longrun execution.
#include "recording/recording_resource_trace.h"
#include <iostream>
#include <stdexcept>
#include <limits>
namespace d=recording::memory_diagnostic;
std::string captured;unsigned calls=0;
bool Sink(const char* p,std::size_t n){++calls;captured.assign(p,n);return true;}
bool Short(const char*,std::size_t){++calls;return false;}
void Check(bool v){if(!v)throw std::runtime_error("compact-native-assertion");}
int main(int argc,char** argv){try{
 if(argc>1){auto memory=std::make_shared<recording::SearchModelResidency>();auto scratch=std::make_shared<recording::RecordingScratchResidency>(recording::RecordingScratchResidency::Usage{4096,4,4096},memory);recording::RecordingResourceTrace trace("1");Check(trace.Bind(memory,scratch));Check(trace.Emit("sample"));Check(trace.Emit("before-Finish"));Check(trace.Emit("after-Finish"));return 0;}
 d::OwnerSample s;d::EventCursor cursor;const char* phases[]={"opened","sample","sample","sample","before-Finish","after-Finish","after-storage-destruction"};
 const unsigned ends[]={0,1,33,33,34,37,38};unsigned previous=0;
 for(unsigned n=0;n<7;++n){const auto end=ends[n];for(unsigned i=previous;i<end;++i)s.events[i%32]={100+i,1+i%2,1+i%5,4096+i,20+i,1+i};
  s.begin=10000+n*100;s.ledger.capturedNs=s.begin+1;s.roles_at=s.begin+2;s.process_at=s.begin+3;s.endNs=s.begin+6;s.rss=3000000000LL;s.footprint=2800000000LL;s.allocator={true,true,s.begin+4,s.begin+5,1000000,2000000,3000000,1000};
  s.totals[8]=end;s.totals[6]=n;s.models={};s.pools={};if(n>0&&n<5){s.models[0]={1,4096,20,n,true,1,true};s.pools[0].key=1;s.pools[0].entries=1;s.pools[0].bytes=4096;}
  // Large retained historical site witness, zero current ownership at every row.
  s.ledger.ticketPeak=150000000;s.ledger.ticketPeakNs=9999;
  for(unsigned i=0;i<15;++i){auto& w=s.ledger.sites[i];w.acquires=w.releases=999999;w.peak=w.largest=10000000;w.peakNs=w.largestNs=w.lastReleaseNs=w.zeroNs=9999;w.peakTotal=150000000;w.peakTickets=999;s.ledger.atPeak[i]=10000000;}
  const bool held=n>0&&n<5;
  s.ledger.used=s.ledger.attributed=held?4096:0;s.ledger.bytes[1]=held?4096:0;s.ledger.tickets[1]=held?1:0;
  s.ledger.sites[0].live=held?4096:0;s.ledger.sites[0].tickets=held?1:0;s.ledger.sites[0].releases=held?999998:999999;
  s.live[d::SourceCutRows]=held&&n<4?4:0;s.peak[d::SourceCutRows]=n?4:0;
  Check(d::EmitSample(s,phases[n],Sink));std::cout<<"V1 "<<captured;
  Check(d::EmitSample(s,phases[n],Sink,&cursor));std::cout<<"V2 "<<captured;previous=end;
 }
 d::EventCursor initial;Check(d::EmitSample(s,"opened",Sink,&initial));std::cout<<"INITIAL "<<captured;
 s.totals[8]+=33;Check(!d::EmitSample(s,"sample",Sink,&cursor));Check(cursor.failed);std::cout<<"OVERFLOW "<<captured;
 d::EventCursor shortCursor;Check(!d::EmitSample(s,"opened",Short,&shortCursor));Check(shortCursor.failed&&!shortCursor.initialized);
 // The same emitter refuses oversized complete output without calling its sink.
 s.ledger.used=s.ledger.attributed=1;s.totals.fill(9007199254740991ULL);
 for(auto& m:s.models)m={9007199254740991ULL,9007199254740991ULL,9007199254740991ULL,9007199254740991ULL,true,9007199254740991ULL,true};
 for(auto& p:s.pools){p.key=p.entries=p.bytes=p.matchBytes=p.references=p.uniqueModels=p.uniqueBytes=p.oldestExpiryNs=p.newestExpiryNs=9007199254740991ULL;}
 const auto before=calls;d::EventCursor tooBig;Check(!d::EmitSample(s,"sample",Sink,&tooBig));Check(calls==before&&tooBig.failed);
 std::cout<<"CHECKS short-write sticky-error emitter-cap PASS cursorBytes="<<sizeof(d::EventCursor)<<" frozenStackBytes="<<sizeof(d::OwnerSample)<<'\n';return 0;
 }catch(const std::exception& e){std::cerr<<e.what()<<'\n';return 1;}}

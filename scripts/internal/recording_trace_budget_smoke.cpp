// R160: original producer only, isolated single TU, no runtime archive/shadow/TEST sink.
#include "recording/recording_latency_trace.h"
#include <string>
#include <thread>
#include <unistd.h>
namespace L=recording::latency;
int main(int argc,char** argv){
 if(argc!=2)return 2;const std::string mode=argv[1];
 std::setvbuf(stderr,nullptr,_IONBF,0);
 L::Row row;row.o=1;row.s=1;row.l=1;row.m=1;row.t=L::local.thread;row.r=10;row.b=1;row.a=2;row.e=3;row.n=1;row.w=1;row.h=1;row.x=1;row.y=1;
 char text[512];const auto size=L::FormatRow(text,row);unsigned calls=0;
 if(mode=="format"){
  L::Row maximum;maximum.k=maximum.o=maximum.s=maximum.l=maximum.m=maximum.t=maximum.r=maximum.b=maximum.a=maximum.e=maximum.n=maximum.w=maximum.h=maximum.x=maximum.y=~std::uint64_t{0};
  char maxtext[512];const auto maxsize=L::FormatRow(maxtext,maximum);
  std::printf("[R160-format] {\"ordinaryBytes\":%d,\"u64UpperBytes\":%d}\n",size,maxsize);
 }else if(mode=="record-before"||mode=="record-over"){
  L::emitted=mode=="record-before"?16383:16384;L::Emit(row);L::Flush();calls=1;
 }else if(mode=="byte-before"||mode=="byte-over"){
  L::emitted_bytes=2097152-512-size+(mode=="byte-over"?1:0);L::Emit(row);L::Flush();calls=1;
 }else if(mode=="single"){
  std::mutex mutex;{L::Lock lock(mutex,L::Source::Catalog,1,true);}
  {L::Scope scope(L::Operation::Query,L::Source::Test,2,true);}L::FinishThread();calls=2;
 }else if(mode=="aggregate"||mode=="slow"){
  // Deterministic synthetic windows through original Append, not measured lock costs.
  for(unsigned i=0;i<3;++i)L::Append(row,false);
  if(mode=="slow"){row.e=20000002;L::Append(row,true);}
  L::FinishThread();calls=mode=="slow"?4:3;
 }else if(mode=="thread"){
  std::thread thread([]{std::mutex mutex;L::Lock lock(mutex,L::Source::Catalog,3,true);});thread.join();calls=1;
 }else if(mode=="output-failure"){
  if(::close(STDERR_FILENO)!=0)return 3;L::Emit(row);L::Flush();calls=1;
 }else return 2;
 std::printf("[R160-end] {\"mode\":\"%s\",\"calls\":%u,\"emittedCounter\":%u,\"byteCounter\":%zu,\"localLoss\":%s,\"lossMarker\":%s,\"streamError\":%s,\"enabled\":%s,\"slow\":%s,\"cleanup\":true}\n",mode.c_str(),calls,L::emitted.load(),L::emitted_bytes.load(),L::local.loss?"true":"false",L::loss_emitted.load()?"true":"false",std::ferror(stderr)?"true":"false",L::Enabled()?"true":"false",L::SlowOnly()?"true":"false");
 return std::fflush(stdout)?4:0;
}

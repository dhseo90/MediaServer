// 파일 용도: 실제 owner trace의 opt-in·제한·쓰기실패·마지막 수명 경계 직접 반례.
#include "recording/recording_resource_trace.h"
#include <cassert>
#include <string>
#include <iostream>
static std::string captured;static bool fail=false;
static bool Sink(const char* p,std::size_t n){if(fail)return false;captured.append(p,n);return true;}
int main(){
 auto memory=std::make_shared<recording::SearchModelResidency>();
 auto scratch=std::make_shared<recording::RecordingScratchResidency>(recording::RecordingScratchResidency::Usage{1048576,16,671088640},memory);
 {recording::RecordingResourceTrace off("0",Sink);assert(off.Bind(memory,scratch));assert(off.Poll());}assert(captured.empty());
 {recording::RecordingResourceTrace bad("full",Sink);assert(!bad.Bind(memory,scratch));}assert(captured.empty());
 {recording::RecordingResourceTrace wrong("1",Sink);assert(!wrong.Bind(std::make_shared<recording::SearchModelResidency>(),scratch));}
 {recording::RecordingResourceTrace trace("1",Sink);assert(trace.Bind(memory,scratch));auto owned=memory->ReserveOwned(1024);assert(owned);assert(trace.Emit("before-Finish"));assert(trace.Emit("after-Finish"));owned.reset();}
 assert(captured.find("\"ram\":1024")!=std::string::npos);assert(captured.find("\"phase\":\"after-storage-destruction\"")!=std::string::npos);
 {recording::RecordingResourceTrace trace("1",Sink);fail=true;assert(!trace.Bind(memory,scratch));assert(!trace.Poll());fail=false;}
 auto denied=memory->ReserveOwned(memory->limit()+1);assert(!denied&&memory->rejected()==1);
 std::cout<<"PASS resource trace off invalid mismatched-owner live-last-reader short-write rejection-counter\n";
}

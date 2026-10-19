// 실제 header의 고정 receipt/실패 상태를 격리 프로세스에서 검사한다. 서버는 시작하지 않는다.
#ifndef RECORDING_COMPLETION_LINKED
#define RECORDING_COMPLETION_TRACE_TEST
#else
#include "recording/evidence_package_store.h"
#endif
#include "recording/recording_completion_trace.h"
#include <string>
namespace c=recording::completion;
bool first=true;
std::size_t Short(const char* text,std::size_t size) noexcept {
    const auto count=first?size-1:size;first=false;
    return std::fwrite(text,1,count,stdout);
}
void Sink(const char* text,std::size_t size) noexcept {(void)std::fwrite(text,1,size,stdout);}
void Emit(){const auto begin=c::Now();c::Emit(c::Event::Media,begin,c::Now(),{},{},3,2);}
struct Local {~Local(){c::Point(c::Event::Media,{},{},3);}};
void Composition(){Local last_writer;Emit();}
int main(int argc,char** argv){
    if(argc!=2)return 2;
    recording::latency::local.request=1;
    const std::string mode=argv[1];
    std::mutex mutex;{recording::latency::Lock lock(mutex,recording::latency::Source::Test,__LINE__,true);}
#ifdef RECORDING_COMPLETION_LINKED
    // Link the real Evidence producer from the rebuilt archive, with no test sinks.
    if(mode!="normal"&&mode!="abnormal"&&mode!="missing")return 2;
    Composition();
    recording::EvidenceFailure failure;
    recording::TraceEvidenceFailure(failure,"evidence-create-failed");
#else
    c::test_sink=Sink;
    if(mode=="short")c::test_write_sink=Short;
    if(mode=="cap")for(unsigned i=0;i<5000;++i)Emit();
    else if(mode=="bytes"){c::bytes=2*1024*1024-512;Emit();}
    else Composition();
    if(mode=="exception")c::lost=true; // actual evidence catch's marker-free state
    if(mode=="flush")c::test_flush_error=true;
#endif
    if(mode=="missing")return 0;
    c::FinishReceipt(mode!="abnormal");c::FinishReceipt(true); // receipt emitted at most once
    if(mode=="late")Emit();
    return 0;
}

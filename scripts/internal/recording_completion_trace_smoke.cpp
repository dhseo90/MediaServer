// 파일 용도: 격리 프로세스에서 실제 header의 off/예산/원문 비노출을 확인한다.
#define RECORDING_COMPLETION_TRACE_TEST
#include "recording/recording_completion_trace.h"
#include <iostream>
void Sink(const char* text,std::size_t size) noexcept {(void)std::fwrite(text,1,size,stdout);}
int main(int argc,char** argv){
    if(argc!=2)return 2;
    recording::completion::test_sink=Sink;
    const std::string mode=argv[1];
    if(mode=="cap")for(unsigned i=0;i<5000;++i)recording::completion::Point(recording::completion::Event::Submitted,"CANARY_REFERENCE");
    else if(mode=="bytes"){
        recording::completion::bytes=2*1024*1024-512;
        recording::completion::Point(recording::completion::Event::Submitted,"CANARY_REFERENCE");
    }else if(mode=="clock"){
        const auto begin=recording::latency::Now();recording::latency::local.request=7;
        recording::completion::Emit(recording::completion::Event::Media,begin,recording::latency::Now(),{},{},3,2);
    }else recording::completion::Point(recording::completion::Event::Submitted,"CANARY_REFERENCE");
    return 0;
}

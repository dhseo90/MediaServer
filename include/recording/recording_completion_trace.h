// 파일 용도: 내부 진단 전용. 업무 결과/시계/공개 스키마와 독립된 유한 출력이다.
#pragma once
#include "recording/recording_latency_trace.h"
#include <string>
#if MEDIA_SERVER_USE_OPENSSL
#include <openssl/evp.h>
#endif

namespace recording::completion {
enum class Event : unsigned { Submitted=1, Queued=2, Started=3, Admitted=4, Ended=5,
    Ready=6, Committed=7, Complete=8, Failed=9, Media=10, Overlap=11, Sort=12, Page=13, Loss=14 };
inline std::mutex output_mu;
inline std::size_t rows=0,bytes=0;
inline std::atomic<bool> lost{false};
#ifdef RECORDING_COMPLETION_TRACE_TEST
using Sink=void(*)(const char*,std::size_t) noexcept;
inline Sink test_sink=nullptr;
#endif
inline void Write(const char* text,std::size_t size) noexcept {
#ifdef RECORDING_COMPLETION_TRACE_TEST
    if(test_sink){test_sink(text,size);return;}
#endif
    (void)std::fwrite(text,1,size,stderr);
}
inline bool Hash(const std::string& value,char (&out)[67]) noexcept {
    if(value.empty()){std::memcpy(out,"null",5);return true;}
#if MEDIA_SERVER_USE_OPENSSL
    unsigned char digest[EVP_MAX_MD_SIZE];unsigned length=0;
    if(EVP_Digest(value.data(),value.size(),digest,&length,EVP_sha256(),nullptr)!=1||length!=32)return false;
    constexpr char hex[]="0123456789abcdef";out[0]='"';
    for(unsigned i=0;i<32;++i){out[1+i*2]=hex[digest[i]>>4];out[2+i*2]=hex[digest[i]&15];}
    out[65]='"';out[66]=0;return true;
#else
    return false;
#endif
}
inline void Emit(Event event,std::uint64_t begin,std::uint64_t end,const std::string& reference={},
                 const std::string& job={},std::uint64_t n=0,std::uint64_t x=0,std::uint64_t y=0) noexcept {
    if(!latency::Enabled())return;
    try {
        char ref[67]{},id[67]{},text[512];
        const bool valid=Hash(reference,ref)&&Hash(job,id)&&end>=begin;
        std::lock_guard lock(output_mu);
        if(lost)return;
        const int length=valid?std::snprintf(text,sizeof(text),
            "[recording-completion] {\"v\":1,\"event\":%u,\"begin\":\"%llu\",\"end\":\"%llu\",\"thread\":%u,\"request\":%u,\"reference\":%s,\"job\":%s,\"n\":%llu,\"x\":%llu,\"y\":%llu}\n",
            static_cast<unsigned>(event),(unsigned long long)begin,(unsigned long long)end,
            latency::local.thread,latency::local.request,ref,id,(unsigned long long)n,(unsigned long long)x,(unsigned long long)y):0;
        if(length<=0||length>=static_cast<int>(sizeof(text))||rows>=4095||bytes+static_cast<std::size_t>(length)>2*1024*1024-512){
            if(lost.exchange(true))return;
            constexpr char loss[]="[recording-completion] {\"v\":1,\"event\":14,\"begin\":\"0\",\"end\":\"0\",\"thread\":0,\"request\":0,\"reference\":null,\"job\":null,\"n\":1,\"x\":0,\"y\":0}\n";
            Write(loss,sizeof(loss)-1);return;
        }
        ++rows;bytes+=static_cast<std::size_t>(length);Write(text,static_cast<std::size_t>(length));
    }catch(...){
        // output mutex 자체 실패도 업무 예외로 바꾸지 않고 고정 손실을 한 번 남긴다.
        if(!lost.exchange(true)){
            constexpr char loss[]="[recording-completion] {\"v\":1,\"event\":14,\"begin\":\"0\",\"end\":\"0\",\"thread\":0,\"request\":0,\"reference\":null,\"job\":null,\"n\":1,\"x\":0,\"y\":0}\n";
            Write(loss,sizeof(loss)-1);
        }
    }
}
inline std::uint64_t Now() noexcept {return latency::Enabled()?latency::Now():0;}
inline void Point(Event event,const std::string& reference,const std::string& job={},std::uint64_t n=0) noexcept {
    if(!latency::Enabled())return;const auto at=Now();Emit(event,at,at,reference,job,n);
}
} // namespace recording::completion

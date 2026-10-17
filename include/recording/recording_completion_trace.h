// 파일 용도: 내부 진단 전용. 업무 결과/시계/공개 스키마와 독립된 유한 출력이다.
#pragma once
#include "recording/recording_latency_trace.h"
#include <string>
#if MEDIA_SERVER_USE_OPENSSL
#include <openssl/evp.h>
#endif

namespace recording::completion {
enum class Event : unsigned { Submitted=1, Queued=2, Started=3, Admitted=4, Ended=5,
    Ready=6, Committed=7, Complete=8, Failed=9, Media=10, Overlap=11, Sort=12, Page=13, Loss=14, Timeline=15 };
inline std::mutex output_mu;
inline std::size_t rows=0,bytes=0;
inline std::atomic<bool> lost{false},write_error{false},ended{false},late_written{false};
inline std::atomic<std::size_t> emitted_rows{0},emitted_bytes{0};
#ifdef RECORDING_COMPLETION_TRACE_TEST
using Sink=void(*)(const char*,std::size_t) noexcept;
inline Sink test_sink=nullptr;
using WriteSink=std::size_t(*)(const char*,std::size_t) noexcept;
inline WriteSink test_write_sink=nullptr;
inline bool test_flush_error=false;
#endif
// 기존 shared cap의 마지막 512B 안에 loss(<=164), receipt(<=256), late(<=64)를 둔다.
inline std::size_t RawWrite(const char* text,std::size_t size) noexcept {
#ifdef RECORDING_COMPLETION_TRACE_TEST
    if(test_write_sink)return test_write_sink(text,size);
    if(test_sink){test_sink(text,size);return size;}
#endif
    return std::fwrite(text,1,size,stderr);
}
inline void Write(const char* text,std::size_t size) noexcept {
    if(ended.load()){
        lost=true;
        if(!late_written.exchange(true)){
            constexpr char late[]="[recording-completion-after-end] {\"lost\":true}\n";
            (void)RawWrite(late,sizeof(late)-1);
        }
        return;
    }
    const auto written=RawWrite(text,size);
    emitted_bytes.fetch_add(written);
    if(written==size)++emitted_rows;else {write_error=true;lost=true;}
}
// composition root가 반환하고 모든 local 소비자가 파괴된 뒤 main에서 한 번 호출한다.
// 기능 결과/Stop 순서를 바꾸지 않으며 abnormal return은 complete=false다.
inline void FinishReceipt(bool normal) noexcept {
    if(!latency::Enabled())return;
    try {
        std::lock_guard lock(output_mu);
        if(ended.exchange(true))return;
        bool flush_error=std::fflush(stderr)!=0;
#ifdef RECORDING_COMPLETION_TRACE_TEST
        flush_error=flush_error||test_flush_error;
#endif
        if(flush_error)write_error=true;
        char line[256];
        const int n=std::snprintf(line,sizeof(line),
            "[recording-completion-end] {\"v\":1,\"rows\":%llu,\"bytes\":%llu,\"lost\":%s,\"writeError\":%s,\"complete\":%s}\n",
            (unsigned long long)emitted_rows.load(),(unsigned long long)emitted_bytes.load(),
            lost.load()?"true":"false",write_error.load()?"true":"false",
            normal&&!lost.load()&&!write_error.load()?"true":"false");
        if(n<=0||n>=int(sizeof(line)))return; // missing receipt is collector failure
        if(RawWrite(line,std::size_t(n))!=std::size_t(n))write_error=true;
        if(std::fflush(stderr)!=0)write_error=true;
    }catch(...){write_error=true;} // no receipt => incomplete, never forged success
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
    if(!latency::Enabled())return;
    const auto at=Now();
    Emit(event,at,at,reference,job,n);
}
} // namespace recording::completion

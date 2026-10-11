// 검증용 상태 전이만 보존한다. 공개 API/상태/보호 판정에는 관여하지 않는다.
#pragma once
#include <atomic>
#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <string>
namespace recording {
inline void TraceRecordingState(const std::string& channel,const char* phase,const std::string& reason) noexcept {
    try {
    static const bool enabled=[] {const char* v=std::getenv("MEDIA_SERVER_VERIFY_RECORDING_STATE_TRACE");return v&&std::string(v)=="1";}();
    if(!enabled)return;
    struct Collector {
        std::atomic<unsigned> count{0};std::atomic<bool> error{false};
        Collector(){if(std::fputs("[recording-state] {\"type\":\"probe\",\"version\":1}\n",stderr)<0||std::fflush(stderr)!=0)error=true;}
        ~Collector(){std::fprintf(stderr,"[recording-state] {\"type\":\"end\",\"count\":%u,\"writeError\":%s}\n",count.load(),error.load()?"true":"false");std::fflush(stderr);}
    };
    static Collector collector;const auto seq=collector.count.fetch_add(1);
    if(seq>128)return;
    if(seq==128){std::fputs("[recording-state] overflow\n",stderr);return;}
    // 이유의 경로/URL 토큰은 제거하고 고정 길이만 출력한다. 원문은 공개 응답에 추가하지 않는다.
    const auto safe=[](const std::string& input) {
        std::string out;bool token=false;
        for(unsigned char c:input){if(out.size()>=240&&(c&0xc0)!=0x80)break;
            if(c=='/'||c=='\\'){token=true;continue;}
            if(token){if(c==' '){token=false;out+=' ';}continue;}
            if(c=='"'||c<32||c==127)out+='?';else out+=static_cast<char>(c);}
        return out;
    };
    const auto id=safe(channel),text=safe(reason);
    const auto us=std::chrono::duration_cast<std::chrono::microseconds>(std::chrono::steady_clock::now().time_since_epoch()).count();
    if(std::fprintf(stderr,"[recording-state] {\"seq\":%u,\"atUs\":%lld,\"channel\":\"%s\",\"phase\":\"%s\",\"reason\":\"%s\"}\n",seq,static_cast<long long>(us),id.c_str(),phase,text.c_str())<0||std::fflush(stderr)!=0)collector.error=true;
    } catch (...) {std::fputs("[recording-state] capture-error\n",stderr);}
}
}

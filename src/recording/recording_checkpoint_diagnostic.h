#pragma once
// 임시 CP01~03 진단. 최종 제품에 남기지 않는다.
#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <cstring>
namespace recording {
struct CheckpointDiagnostic {
    const char* stage;std::size_t count,bytes;
    std::chrono::steady_clock::time_point start=std::chrono::steady_clock::now();
    CheckpointDiagnostic(const char* s,std::size_t c=0,std::size_t b=0):stage(s),count(c),bytes(b){}
    ~CheckpointDiagnostic(){const auto* enabled=std::getenv("MEDIA_SERVER_CHECKPOINT_DIAGNOSTIC");
        if(enabled&&std::strcmp(enabled,"1")==0)std::fprintf(stderr,"[checkpoint-cost] stage=%s count=%zu bytes=%zu us=%lld\n",stage,count,bytes,
            static_cast<long long>(std::chrono::duration_cast<std::chrono::microseconds>(std::chrono::steady_clock::now()-start).count()));}
};
}

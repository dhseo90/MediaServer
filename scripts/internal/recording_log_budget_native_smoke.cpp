// 파일 용도: R140의 순수 형식 단위 검사이며 server·media·model·pipeline·filesystem store를 사용하지 않는다.
#include "recording/recording_memory_diagnostic_output.h"
#include <cassert>
#include <iostream>
#include <limits>
std::size_t calls=0,bytes=0;
bool sink(const char*,std::size_t n){++calls;bytes=n;return true;}
int main(){
    setenv("MEDIA_SERVER_VERIFY_MEMORY_ATTRIBUTION","1",1);
    recording::SearchModelResidency owner(640*1024*1024);
    assert(recording::memory_diagnostic::Emit(owner,"opened",sink));
    assert(calls==1&&bytes<16384);const auto zero_bytes=bytes;
    auto& d=recording::memory_diagnostic::Data();
    // 불가능한 소유량을 진단 slot에만 의도적으로 주입한다.
    // 형식 출력의 원자적 거부를 검사하며 live model 128개가 가능함을 증명하지 않는다.
    {std::lock_guard lock(d.mutex);for(auto& m:d.models)m={UINT64_MAX,UINT64_MAX,UINT64_MAX,UINT64_MAX,false,UINT64_MAX,false};}
    assert(!recording::memory_diagnostic::Emit(owner,"sample",sink));
    assert(calls==1); // no partial row reaches sink
    {std::lock_guard lock(d.mutex);for(auto& m:d.models)m={};}
    assert(recording::memory_diagnostic::Emit(owner,"after-storage-destruction",sink));
    assert(calls==2&&owner.used()==0);
    std::cout<<"{\"status\":\"PASS\",\"emptyRecordBytes\":"<<zero_bytes<<",\"oversizeAtomicRefusal\":true,\"productExecution\":false,\"ownershipFeasibilityProved\":false}\n";
}

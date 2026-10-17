// R140 pure formatting unit: no server, media, model, pipeline or filesystem store.
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
    // Impossible ownership envelope, intentionally injected only into diagnostic slots.
    // It checks atomic formatting refusal; it does NOT prove128 live models feasible.
    {std::lock_guard lock(d.mutex);for(auto& m:d.models)m={UINT64_MAX,UINT64_MAX,UINT64_MAX,UINT64_MAX,false,UINT64_MAX,false};}
    assert(!recording::memory_diagnostic::Emit(owner,"sample",sink));
    assert(calls==1); // no partial row reaches sink
    {std::lock_guard lock(d.mutex);for(auto& m:d.models)m={};}
    assert(recording::memory_diagnostic::Emit(owner,"after-storage-destruction",sink));
    assert(calls==2&&owner.used()==0);
    std::cout<<"{\"status\":\"PASS\",\"emptyRecordBytes\":"<<zero_bytes<<",\"oversizeAtomicRefusal\":true,\"productExecution\":false,\"ownershipFeasibilityProved\":false}\n";
}

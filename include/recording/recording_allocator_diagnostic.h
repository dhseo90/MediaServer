// 파일 용도: opt-in 표본 지점의 malloc zone 합계. 제품 lock/callback 안에서 호출하지 않는다.
#pragma once
#include "recording/recording_memory_diagnostic.h"
#if defined(__APPLE__)
#include <malloc/malloc.h>
#endif
namespace recording::memory_diagnostic {
struct AllocatorSample {
    bool supported=false,called=false;
    std::uint64_t beginNs{},endNs{},sizeInUse{},sizeAllocated{},maxSizeInUse{},blocksInUse{};
};
inline AllocatorSample AllocatorStatistics() noexcept {
    AllocatorSample s;if(!Enabled())return s;
    s.beginNs=Now();
#if defined(__APPLE__)
    // SDK: NULL sums all malloc zones. void API supplies no success/error status.
    // Excludes non-malloc allocations; max_size_in_use is touched-memory HWM.
    s.supported=true;malloc_statistics_t stats{};malloc_zone_statistics(nullptr,&stats);s.called=true;
    s.sizeInUse=stats.size_in_use;s.sizeAllocated=stats.size_allocated;
    s.maxSizeInUse=stats.max_size_in_use;s.blocksInUse=stats.blocks_in_use;
#endif
    s.endNs=Now();return s;
}
}

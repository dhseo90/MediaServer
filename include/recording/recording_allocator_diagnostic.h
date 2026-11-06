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
    // SDK의 NULL 인자는 모든 malloc zone을 합산하며 void API는 성공·오류 상태를 제공하지 않는다.
    // malloc 외 할당은 제외되며 max_size_in_use는 실제 접근한 메모리의 최고 사용량이다.
    s.supported=true;malloc_statistics_t stats{};malloc_zone_statistics(nullptr,&stats);s.called=true;
    s.sizeInUse=stats.size_in_use;s.sizeAllocated=stats.size_allocated;
    s.maxSizeInUse=stats.max_size_in_use;s.blocksInUse=stats.blocks_in_use;
#endif
    s.endNs=Now();return s;
}
}

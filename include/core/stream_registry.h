// 파일 요약: StreamKey별 SharedStream 공유 저장소를 선언한다.
// 동작 요약: acquire/release, idle cleanup, stream snapshot 조회 API를 제공한다.
// 동작 요약: SessionManager가 원본 source dedup을 수행하는 계약이다.
#pragma once

#include "core/shared_stream.h"
#include "core/stream_key.h"
#include "stdafx.h"

namespace core {

class StreamRegistry {
public:
    struct AcquireResult {
        std::shared_ptr<SharedStream> stream;
        bool created{false};
    };

    AcquireResult Acquire(const StreamKey& key, const media::SourceSpec& source_spec);
    bool ReleaseLease(const StreamKey& key);
    bool ReleaseLeaseAndTryRemoveIfIdle(const StreamKey& key);
    bool TryRemoveIfIdle(const StreamKey& key);
    std::size_t ActiveStreamCount() const;

private:
    mutable std::mutex mu_;
    std::unordered_map<StreamKey, std::shared_ptr<SharedStream>> streams_;
    std::unordered_map<StreamKey, std::size_t> outstanding_leases_;
};

}  // namespace core

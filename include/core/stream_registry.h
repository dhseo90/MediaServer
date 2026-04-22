// 파일 용도: StreamKey별 SharedStream 인스턴스 공유와 제거를 관리하는 Registry를 선언한다.
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
    bool TryRemoveIfIdle(const StreamKey& key);
    std::size_t ActiveStreamCount() const;

private:
    mutable std::mutex mu_;
    std::unordered_map<StreamKey, std::shared_ptr<SharedStream>> streams_;
};

}  // namespace core

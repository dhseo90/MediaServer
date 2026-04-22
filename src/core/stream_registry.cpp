// 파일 용도: StreamKey별 SharedStream acquire/release와 idle 제거 조건을 구현한다.
#include "core/stream_registry.h"

namespace core {

StreamRegistry::AcquireResult StreamRegistry::Acquire(const StreamKey& key, const media::SourceSpec& source_spec) {
    std::lock_guard lock(mu_);
    const auto it = streams_.find(key);
    if (it != streams_.end()) {
        // 이미 같은 원본을 읽는 stream이 있으면 source worker를 새로 만들지 않고 공유한다.
        return {.stream = it->second, .created = false};
    }

    auto stream = std::make_shared<SharedStream>(source_spec);
    streams_[key] = stream;
    return {.stream = std::move(stream), .created = true};
}

bool StreamRegistry::TryRemoveIfIdle(const StreamKey& key) {
    std::lock_guard lock(mu_);
    const auto it = streams_.find(key);
    if (it == streams_.end()) {
        return false;
    }
    if (it->second->RefCount() > 0) {
        return false;
    }
    // subscriber가 완전히 빠진 뒤에만 source를 멈추고 registry에서 제거한다.
    it->second->StopSource();
    streams_.erase(it);
    return true;
}

std::size_t StreamRegistry::ActiveStreamCount() const {
    std::lock_guard lock(mu_);
    return streams_.size();
}

}  // namespace core

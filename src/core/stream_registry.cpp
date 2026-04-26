// 파일 요약: StreamKey별 SharedStream acquire/release를 관리한다.
// 동작 요약: 같은 원본 요청은 기존 stream을 재사용하고, idle stream은 정리 대상이 된다.
// 동작 요약: SessionManager가 source worker 중복 생성을 피하게 하는 dedup 저장소다.
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
    if (it->second->TotalSubscriberCount() > 0) {
        return false;
    }
    // relay client와 analysis tap이 모두 빠진 뒤에만 source를 멈추고 registry에서 제거한다.
    it->second->StopSource();
    streams_.erase(it);
    return true;
}

std::size_t StreamRegistry::ActiveStreamCount() const {
    std::lock_guard lock(mu_);
    return streams_.size();
}

}  // namespace core

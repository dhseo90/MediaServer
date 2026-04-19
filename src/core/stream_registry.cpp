#include "core/stream_registry.h"

namespace core {

StreamRegistry::AcquireResult StreamRegistry::Acquire(const StreamKey& key, const media::SourceSpec& source_spec) {
    std::lock_guard lock(mu_);
    const auto it = streams_.find(key);
    if (it != streams_.end()) {
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
    it->second->StopSource();
    streams_.erase(it);
    return true;
}

std::size_t StreamRegistry::ActiveStreamCount() const {
    std::lock_guard lock(mu_);
    return streams_.size();
}

}  // namespace core

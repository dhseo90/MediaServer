// 파일 요약: WHIP publish source session을 source id로 보관하는 registry 구현이다.
// 동작 요약: publisher 세션 등록, 조회, 제거, 만료 정리를 mutex로 보호한다.
// 동작 요약: source=webrtc 요청이 publish된 SharedStream을 재사용할 수 있게 연결 지점을 제공한다.
#include "ingress/webrtc_source_registry.h"

#include <iostream>
#include <vector>

#include "app_config.h"

namespace ingress {

namespace {

constexpr std::size_t kMaxCachedGopPackets = 4096;

bool DescriptorHasKind(const media::StreamDescriptor& descriptor, media::MediaKind kind) {
    for (const auto& track : descriptor.tracks) {
        if (track.kind == kind) {
            return true;
        }
    }
    return false;
}

void TrimCachedGop(std::deque<media::Packet>* packets) {
    if (packets == nullptr) {
        return;
    }
    while (packets->size() > kMaxCachedGopPackets) {
        packets->pop_front();
    }
}

}  // namespace

PublishedWebRtcSource::PublishedWebRtcSource(std::string source_id) : source_id_(std::move(source_id)) {}

const std::string& PublishedWebRtcSource::source_id() const {
    return source_id_;
}

bool PublishedWebRtcSource::AddSubscriber(const std::string& subscriber_id, SubscriberCallback callback) {
    std::deque<media::Packet> cached_gop;
    SubscriberCallback installed_callback;
    {
        std::unique_lock lock(subscribers_mu_);
        const auto [it, inserted] = subscribers_.emplace(subscriber_id, std::move(callback));
        if (!inserted) {
            return false;
        }
        installed_callback = it->second;
    }
    {
        std::lock_guard lock(descriptor_mu_);
        cached_gop = video_gop_cache_;
    }
    for (const auto& packet : cached_gop) {
        installed_callback(packet);
    }
    return true;
}

void PublishedWebRtcSource::RemoveSubscriber(const std::string& subscriber_id) {
    std::unique_lock lock(subscribers_mu_);
    subscribers_.erase(subscriber_id);
}

void PublishedWebRtcSource::Publish(const media::Packet& packet) {
    if (packet.kind == media::MediaKind::Video) {
        std::lock_guard lock(descriptor_mu_);
        if (packet.is_key_frame) {
            video_gop_cache_.clear();
        }
        if (packet.is_key_frame || !video_gop_cache_.empty()) {
            video_gop_cache_.push_back(packet);
            TrimCachedGop(&video_gop_cache_);
        }
    }

    std::vector<SubscriberCallback> callbacks;
    {
        std::shared_lock lock(subscribers_mu_);
        callbacks.reserve(subscribers_.size());
        for (const auto& [_, callback] : subscribers_) {
            callbacks.push_back(callback);
        }
    }

    for (const auto& callback : callbacks) {
        callback(packet);
    }
}

void PublishedWebRtcSource::SetDescriptor(media::StreamDescriptor descriptor) {
    {
        std::lock_guard lock(descriptor_mu_);
        descriptor_ = std::move(descriptor);
    }
    descriptor_cv_.notify_all();
}

std::optional<media::StreamDescriptor> PublishedWebRtcSource::descriptor() const {
    std::lock_guard lock(descriptor_mu_);
    return descriptor_;
}

bool PublishedWebRtcSource::WaitForDescriptor(std::chrono::milliseconds timeout, media::StreamDescriptor* descriptor) {
    std::unique_lock lock(descriptor_mu_);
    const bool ready = descriptor_cv_.wait_for(lock, timeout, [this] { return descriptor_.has_value() || !active_; });
    if (!ready || !descriptor_.has_value()) {
        return false;
    }
    if (descriptor != nullptr) {
        *descriptor = *descriptor_;
    }
    return true;
}

bool PublishedWebRtcSource::WaitForTracks(std::chrono::milliseconds timeout,
                                          bool require_video,
                                          bool require_audio,
                                          media::StreamDescriptor* descriptor) {
    std::unique_lock lock(descriptor_mu_);
    const bool ready = descriptor_cv_.wait_for(lock, timeout, [this, require_video, require_audio] {
        if (!active_) {
            return true;
        }
        if (!descriptor_.has_value()) {
            return false;
        }
        const bool has_video = !require_video || DescriptorHasKind(*descriptor_, media::MediaKind::Video);
        const bool has_audio = !require_audio || DescriptorHasKind(*descriptor_, media::MediaKind::Audio);
        return has_video && has_audio;
    });
    if (!ready || !descriptor_.has_value()) {
        return false;
    }
    const bool has_video = !require_video || DescriptorHasKind(*descriptor_, media::MediaKind::Video);
    const bool has_audio = !require_audio || DescriptorHasKind(*descriptor_, media::MediaKind::Audio);
    if (!(has_video && has_audio)) {
        return false;
    }
    if (descriptor != nullptr) {
        *descriptor = *descriptor_;
    }
    return true;
}

void PublishedWebRtcSource::Close() {
    {
        std::lock_guard lock(descriptor_mu_);
        active_ = false;
        video_gop_cache_.clear();
    }
    descriptor_cv_.notify_all();
}

bool PublishedWebRtcSource::IsActive() const {
    std::lock_guard lock(descriptor_mu_);
    return active_;
}

// runtime status가 lock을 오래 잡지 않도록 descriptor와 subscriber 수를 값으로 복사한다.
PublishedWebRtcSource::Snapshot PublishedWebRtcSource::GetSnapshot() const {
    Snapshot snapshot;
    snapshot.source_id = source_id_;
    {
        std::lock_guard lock(descriptor_mu_);
        snapshot.active = active_;
        snapshot.has_descriptor = descriptor_.has_value();
        if (descriptor_.has_value()) {
            snapshot.has_video = DescriptorHasKind(*descriptor_, media::MediaKind::Video);
            snapshot.has_audio = DescriptorHasKind(*descriptor_, media::MediaKind::Audio);
        }
    }
    {
        std::shared_lock lock(subscribers_mu_);
        snapshot.subscriber_count = subscribers_.size();
    }
    return snapshot;
}

WebRtcSourceRegistry& WebRtcSourceRegistry::Instance() {
    static WebRtcSourceRegistry registry;
    return registry;
}

bool WebRtcSourceRegistry::Register(const std::shared_ptr<PublishedWebRtcSource>& source) {
    if (source == nullptr) {
        return false;
    }

    std::unique_lock lock(mu_);
    const bool inserted = sources_.emplace(source->source_id(), source).second;
    if (app::GetAppConfig().webrtc_trace) {
        std::cerr << "[webrtc-registry] register source=" << source->source_id()
                  << " inserted=" << (inserted ? "yes" : "no")
                  << " size=" << sources_.size()
                  << "\n";
    }
    return inserted;
}

std::shared_ptr<PublishedWebRtcSource> WebRtcSourceRegistry::Find(const std::string& source_id) const {
    std::shared_lock lock(mu_);
    const auto it = sources_.find(source_id);
    if (app::GetAppConfig().webrtc_trace) {
        std::cerr << "[webrtc-registry] find source=" << source_id
                  << " found=" << (it != sources_.end() ? "yes" : "no")
                  << " size=" << sources_.size()
                  << "\n";
    }
    if (it == sources_.end()) {
        return nullptr;
    }
    return it->second;
}

// registry lock 안에서 각 source 내부 lock까지 중첩하지 않도록 shared_ptr 목록을 먼저 복사한다.
std::vector<PublishedWebRtcSource::Snapshot> WebRtcSourceRegistry::Snapshots() const {
    std::vector<std::shared_ptr<PublishedWebRtcSource>> sources;
    {
        std::shared_lock lock(mu_);
        sources.reserve(sources_.size());
        for (const auto& [_, source] : sources_) {
            sources.push_back(source);
        }
    }

    std::vector<PublishedWebRtcSource::Snapshot> snapshots;
    snapshots.reserve(sources.size());
    for (const auto& source : sources) {
        if (source != nullptr) {
            snapshots.push_back(source->GetSnapshot());
        }
    }
    return snapshots;
}

void WebRtcSourceRegistry::Remove(const std::string& source_id) {
    std::shared_ptr<PublishedWebRtcSource> removed;
    {
        std::unique_lock lock(mu_);
        const auto it = sources_.find(source_id);
        if (it == sources_.end()) {
            if (app::GetAppConfig().webrtc_trace) {
                std::cerr << "[webrtc-registry] remove source=" << source_id
                          << " found=no size=" << sources_.size()
                          << "\n";
            }
            return;
        }
        removed = it->second;
        sources_.erase(it);
        if (app::GetAppConfig().webrtc_trace) {
            std::cerr << "[webrtc-registry] remove source=" << source_id
                      << " found=yes size=" << sources_.size()
                      << "\n";
        }
    }
    if (removed != nullptr) {
        removed->Close();
    }
}

}  // namespace ingress

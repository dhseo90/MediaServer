#include "ingress/webrtc_source_registry.h"

#include <iostream>
#include <vector>

#include "app_config.h"

namespace ingress {

PublishedWebRtcSource::PublishedWebRtcSource(std::string source_id) : source_id_(std::move(source_id)) {}

const std::string& PublishedWebRtcSource::source_id() const {
    return source_id_;
}

bool PublishedWebRtcSource::AddSubscriber(const std::string& subscriber_id, SubscriberCallback callback) {
    std::optional<media::Packet> cached_keyframe;
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
        cached_keyframe = last_video_keyframe_;
    }
    if (cached_keyframe.has_value()) {
        installed_callback(*cached_keyframe);
    }
    return true;
}

void PublishedWebRtcSource::RemoveSubscriber(const std::string& subscriber_id) {
    std::unique_lock lock(subscribers_mu_);
    subscribers_.erase(subscriber_id);
}

void PublishedWebRtcSource::Publish(const media::Packet& packet) {
    if (packet.kind == media::MediaKind::Video && packet.is_key_frame) {
        std::lock_guard lock(descriptor_mu_);
        last_video_keyframe_ = packet;
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

void PublishedWebRtcSource::Close() {
    {
        std::lock_guard lock(descriptor_mu_);
        active_ = false;
        last_video_keyframe_.reset();
    }
    descriptor_cv_.notify_all();
}

bool PublishedWebRtcSource::IsActive() const {
    std::lock_guard lock(descriptor_mu_);
    return active_;
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

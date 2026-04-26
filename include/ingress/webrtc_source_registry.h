// 파일 요약: WHIP publish WebRTC source session registry를 선언한다.
// 동작 요약: source id별 등록/조회/삭제와 session 목록 조회 API를 제공한다.
// 동작 요약: WebRTC publish 입력을 다른 consumer가 source=webrtc로 재사용하게 한다.
#pragma once

#include <condition_variable>
#include <deque>
#include <memory>
#include <optional>
#include <shared_mutex>
#include <string>
#include <unordered_map>

#include "media_types.h"

namespace ingress {

class PublishedWebRtcSource : public std::enable_shared_from_this<PublishedWebRtcSource> {
public:
    using SubscriberCallback = std::function<void(const media::Packet&)>;

    explicit PublishedWebRtcSource(std::string source_id);

    const std::string& source_id() const;
    bool AddSubscriber(const std::string& subscriber_id, SubscriberCallback callback);
    void RemoveSubscriber(const std::string& subscriber_id);
    void Publish(const media::Packet& packet);

    void SetDescriptor(media::StreamDescriptor descriptor);
    std::optional<media::StreamDescriptor> descriptor() const;
    bool WaitForDescriptor(std::chrono::milliseconds timeout, media::StreamDescriptor* descriptor);
    bool WaitForTracks(std::chrono::milliseconds timeout,
                       bool require_video,
                       bool require_audio,
                       media::StreamDescriptor* descriptor);

    void Close();
    bool IsActive() const;

private:
    std::string source_id_;
    mutable std::shared_mutex subscribers_mu_;
    std::unordered_map<std::string, SubscriberCallback> subscribers_;

    mutable std::mutex descriptor_mu_;
    std::condition_variable descriptor_cv_;
    std::optional<media::StreamDescriptor> descriptor_;
    std::deque<media::Packet> video_gop_cache_;
    bool active_{true};
};

class WebRtcSourceRegistry {
public:
    static WebRtcSourceRegistry& Instance();

    bool Register(const std::shared_ptr<PublishedWebRtcSource>& source);
    std::shared_ptr<PublishedWebRtcSource> Find(const std::string& source_id) const;
    void Remove(const std::string& source_id);

private:
    WebRtcSourceRegistry() = default;

    mutable std::shared_mutex mu_;
    std::unordered_map<std::string, std::shared_ptr<PublishedWebRtcSource>> sources_;
};

}  // namespace ingress

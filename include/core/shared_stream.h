// 파일 용도: 하나의 원본 소스를 여러 구독자에게 fan-out하는 SharedStream을 선언한다.
#pragma once

#include <condition_variable>
#include <deque>

#include "core/source_worker.h"
#include "media_types.h"
#include "stdafx.h"

namespace core {

class SharedStream : public std::enable_shared_from_this<SharedStream> {
public:
    enum class SubscriberRole {
        Client,
        Analysis,
    };

    using SubscriberCallback = std::function<void(const media::Packet&)>;

    explicit SharedStream(media::SourceSpec source_spec);
    ~SharedStream();

    bool AddSubscriber(const std::string& session_id, SubscriberCallback callback);
    bool AddAnalysisSubscriber(const std::string& subscriber_id, SubscriberCallback callback);
    void RemoveSubscriber(const std::string& session_id);
    // RefCount는 relay client 수만 센다. analysis tap은 live source cleanup을 막으면 안 된다.
    std::size_t RefCount() const;
    std::size_t AnalysisSubscriberCount() const;
    std::size_t TotalSubscriberCount() const;

    void FanOut(const media::Packet& packet) const;
    void SetDescriptor(media::StreamDescriptor descriptor);
    std::optional<media::StreamDescriptor> descriptor() const;
    bool HasDescriptor() const;
    bool StartSource(std::unique_ptr<SourceWorker> worker, std::string* error_message, bool* started = nullptr);
    void StopSource();
    bool IsSourceRunning() const;
    std::size_t DroppedPacketCount(const std::string& session_id) const;
    std::size_t TotalDroppedPacketCount() const;
    void StopAllSubscribers();
    const media::SourceSpec& source_spec() const;

private:
    struct SubscriberState {
        SubscriberState(SubscriberCallback cb, SubscriberRole subscriber_role)
            : callback(std::move(cb)), role(subscriber_role) {}

        SubscriberCallback callback;
        SubscriberRole role{SubscriberRole::Client};
        mutable std::mutex mu;
        std::condition_variable cv;
        std::deque<media::Packet> queue;
        std::size_t dropped_packets{0};
        bool stop{false};
        std::thread worker;
    };

    // 각 subscriber queue를 별도 worker에서 소비해 느린 클라이언트의 backpressure를 격리한다.
    bool AddSubscriberWithRole(const std::string& subscriber_id,
                               SubscriberCallback callback,
                               SubscriberRole role);
    static void WorkerLoop(const std::shared_ptr<SubscriberState>& state);
    void EnqueuePacket(const std::shared_ptr<SubscriberState>& state, const media::Packet& packet) const;

    media::SourceSpec source_spec_;
    mutable std::mutex source_mu_;
    std::unique_ptr<SourceWorker> source_worker_;
    bool source_running_{false};
    mutable std::mutex descriptor_mu_;
    std::optional<media::StreamDescriptor> descriptor_;
    mutable std::mutex keyframe_mu_;
    // late joiner가 GOP 중간 delta frame부터 시작하지 않도록 마지막 IDR/IRAP 이후 video packet들을 보관한다.
    mutable std::deque<media::Packet> video_gop_cache_;
    mutable std::optional<media::Packet> last_audio_packet_;
    mutable std::shared_mutex mu_;
    std::unordered_map<std::string, std::shared_ptr<SubscriberState>> subscribers_;
};

}  // namespace core

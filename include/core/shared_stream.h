// 파일 요약: 원본 source packet을 여러 subscriber에게 fan-out하는 stream을 선언한다.
// 동작 요약: subscriber queue, cached packet, descriptor, idle 상태 조회 API를 제공한다.
// 동작 요약: source worker와 egress/analysis consumer 사이의 공통 데이터 허브다.
#pragma once

#include <condition_variable>
#include <deque>
#include "recording/recording_stop.h"

#include "core/source_worker.h"
#include "media_types.h"
#include "stdafx.h"

namespace core {

class SharedStream : public std::enable_shared_from_this<SharedStream> {
private:
    struct SubscriberState;
public:
    struct DrainObservation {
        bool joined{false}, failed{false};
        std::uint64_t enqueued{0}, dequeued{0}, overflow{0}, cancelled{0}, after_cutoff{0};
    };
    // 소유자가 deadline 뒤에도 보관한다. 소멸은 실제 Join까지 기다린다.
    class DrainHandle {
    public:
        ~DrainHandle();
        DrainObservation WaitUntil(recording::StopContext::Clock::time_point deadline);
        DrainObservation Join();
    private:
        friend class SharedStream;
        explicit DrainHandle(std::shared_ptr<SubscriberState> state) : state_(std::move(state)) {}
        std::shared_ptr<SubscriberState> state_;
    };
    std::shared_ptr<DrainHandle> BeginDrain(const std::string& id,
        std::shared_ptr<const recording::StopContext> context);

    enum class SubscriberRole {
        Client,
        Analysis,
        Recorder,
    };

    using SubscriberCallback = std::function<void(const media::Packet&)>;

    explicit SharedStream(media::SourceSpec source_spec);
    ~SharedStream();

    bool AddSubscriber(const std::string& session_id, SubscriberCallback callback);
    bool AddAnalysisSubscriber(const std::string& subscriber_id, SubscriberCallback callback);
    bool AddRecordingSubscriber(const std::string& subscriber_id, SubscriberCallback callback,
                                std::function<void()> on_drained = {});
    void RemoveSubscriber(const std::string& session_id);
    // RefCount는 relay client 수만 센다. source 제거 판단은 analysis tap까지 포함한 TotalSubscriberCount를 쓴다.
    std::size_t RefCount() const;
    std::size_t AnalysisSubscriberCount() const;
    std::size_t RecordingSubscriberCount() const;
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
        struct QueuedPacket { media::Packet packet; std::uint64_t enqueued_ns{0}; };
        std::deque<QueuedPacket> queue;
        // 선택 활성화하는 Recorder 카운터는 고정 크기이며 payload 이력이나 추가 lock을 보유하지 않는다.
        std::uint64_t enqueued{0}, dequeued{0}, payload_bytes{0}, queued_bytes{0};
        std::uint64_t max_depth{0}, max_bytes{0}, first_input_ns{0}, last_input_ns{0};
        std::uint64_t min_input_gap_ns{UINT64_MAX}, max_input_gap_ns{0};
        std::uint64_t queue_wait_ns{0}, max_queue_wait_ns{0}, callback_ns{0}, max_callback_ns{0};
        std::uint64_t first_depth64_ns{0}, first_drop_ns{0}, max_callback_begin_ns{0}, max_callback_ordinal{0};
        std::size_t dropped_packets{0};
        bool recorder_video_loss_pending{false};
        bool stop{false};
        bool done{false}, callback_failed{false};
        std::uint64_t total_enqueued{0}, total_dequeued{0}, cancelled{0}, after_cutoff{0};
        std::shared_ptr<const recording::StopContext> stop_context;
        std::function<void()> on_drained;
        std::mutex join_mu;

        std::thread worker;
    };

    // 각 subscriber queue를 별도 worker에서 소비해 느린 클라이언트의 backpressure를 격리한다.
    bool AddSubscriberWithRole(const std::string& subscriber_id,
                               SubscriberCallback callback,
                               SubscriberRole role, std::function<void()> on_drained = {});
    static void ReportRecorder(const std::shared_ptr<SubscriberState>& state);
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

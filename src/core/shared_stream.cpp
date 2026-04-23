// 파일 용도: SourceWorker에서 받은 패킷을 구독자별 큐로 fan-out하고 캐시 keyframe/audio를 재전달한다.
#include "core/shared_stream.h"

#include <exception>

#include "app_config.h"

namespace core {

namespace {

constexpr std::size_t kMaxCachedGopPackets = 4096;

void TrimCachedGop(std::deque<media::Packet>* packets) {
    if (packets == nullptr) {
        return;
    }
    while (packets->size() > kMaxCachedGopPackets) {
        packets->pop_front();
    }
}

}  // namespace

SharedStream::SharedStream(media::SourceSpec source_spec) : source_spec_(std::move(source_spec)) {}

SharedStream::~SharedStream() {
    StopSource();
    StopAllSubscribers();
}

bool SharedStream::AddSubscriber(const std::string& session_id, SubscriberCallback callback) {
    // subscriber마다 독립 worker thread와 queue를 둬 느린 클라이언트가 다른 클라이언트를 막지 않게 한다.
    auto state = std::make_shared<SubscriberState>(std::move(callback));
    state->worker = std::thread(&SharedStream::WorkerLoop, state);

    std::unique_lock lock(mu_);
    auto [it, inserted] = subscribers_.emplace(session_id, state);
    if (!inserted) {
        lock.unlock();
        {
            std::lock_guard state_lock(state->mu);
            state->stop = true;
        }
        state->cv.notify_one();
        if (state->worker.joinable()) {
            state->worker.join();
        }
        return false;
    }

    std::deque<media::Packet> cached_gop;
    std::optional<media::Packet> cached_audio;
    {
        std::lock_guard keyframe_lock(keyframe_mu_);
        cached_gop = video_gop_cache_;
        cached_audio = last_audio_packet_;
    }
    for (const auto& packet : cached_gop) {
        EnqueuePacket(state, packet);
    }
    if (cached_audio.has_value()) {
        EnqueuePacket(state, *cached_audio);
    }
    // 새 subscriber는 마지막 video GOP/audio priming packet을 먼저 받아 RTSP/WebRTC 준비 시간을 줄인다.
    return true;
}

void SharedStream::RemoveSubscriber(const std::string& session_id) {
    std::shared_ptr<SubscriberState> state;
    {
        std::unique_lock lock(mu_);
        const auto it = subscribers_.find(session_id);
        if (it == subscribers_.end()) {
            return;
        }
        state = it->second;
        subscribers_.erase(it);
    }

    {
        std::lock_guard lock(state->mu);
        state->stop = true;
    }
    state->cv.notify_one();
    if (state->worker.joinable()) {
        state->worker.join();
    }
}

void SharedStream::StopAllSubscribers() {
    std::vector<std::shared_ptr<SubscriberState>> states;
    std::unique_lock lock(mu_);
    states.reserve(subscribers_.size());
    for (auto& [_, state] : subscribers_) {
        states.push_back(state);
    }
    subscribers_.clear();
    lock.unlock();

    // map lock을 잡은 채 join하지 않는다. callback 내부에서 다시 stream API를 부를 가능성을 막기 위해서다.
    for (const auto& state : states) {
        {
            std::lock_guard state_lock(state->mu);
            state->stop = true;
        }
        state->cv.notify_one();
    }

    for (const auto& state : states) {
        if (state->worker.joinable()) {
            state->worker.join();
        }
    }
}

std::size_t SharedStream::RefCount() const {
    std::shared_lock lock(mu_);
    return subscribers_.size();
}

void SharedStream::FanOut(const media::Packet& packet) const {
    // late subscriber가 GOP 중간 delta frame부터 시작하지 않도록 최근 IDR/IRAP 이후 video packet들을 캐시한다.
    if (packet.kind == media::MediaKind::Video) {
        std::lock_guard keyframe_lock(keyframe_mu_);
        if (packet.is_key_frame) {
            video_gop_cache_.clear();
        }
        if (packet.is_key_frame || !video_gop_cache_.empty()) {
            video_gop_cache_.push_back(packet);
            TrimCachedGop(&video_gop_cache_);
        }
    } else if (packet.kind == media::MediaKind::Audio) {
        std::lock_guard keyframe_lock(keyframe_mu_);
        last_audio_packet_ = packet;
    }

    std::vector<std::shared_ptr<SubscriberState>> states;
    {
        std::shared_lock lock(mu_);
        states.reserve(subscribers_.size());
        for (const auto& [_, state] : subscribers_) {
            states.push_back(state);
        }
    }

    // subscriber 목록 스냅샷만 공유 lock 아래에서 만들고, 실제 enqueue는 lock 밖에서 수행한다.
    for (const auto& state : states) {
        EnqueuePacket(state, packet);
    }
}

void SharedStream::SetDescriptor(media::StreamDescriptor descriptor) {
    std::lock_guard lock(descriptor_mu_);
    descriptor_ = std::move(descriptor);
}

std::optional<media::StreamDescriptor> SharedStream::descriptor() const {
    std::lock_guard lock(descriptor_mu_);
    return descriptor_;
}

bool SharedStream::HasDescriptor() const {
    std::lock_guard lock(descriptor_mu_);
    return descriptor_.has_value();
}

bool SharedStream::StartSource(std::unique_ptr<SourceWorker> worker, std::string* error_message, bool* started) {
    if (started != nullptr) {
        *started = false;
    }
    if (worker == nullptr) {
        if (error_message != nullptr) {
            *error_message = "missing source worker";
        }
        return false;
    }

    std::unique_ptr<SourceWorker> previous_worker;
    std::lock_guard lock(source_mu_);
    if (source_running_ && source_worker_ != nullptr && source_worker_->IsRunning()) {
        return true;
    }

    previous_worker = std::move(source_worker_);
    source_running_ = false;
    source_worker_ = std::move(worker);
    // 죽었거나 교체되는 worker는 새 worker 시작 전에 완전히 멈춰 중복 upstream 연결을 피한다.
    if (previous_worker != nullptr) {
        previous_worker->Stop();
    }
    if (!source_worker_->Start(shared_from_this(), error_message)) {
        source_worker_.reset();
        source_running_ = false;
        return false;
    }
    source_running_ = true;
    if (started != nullptr) {
        *started = true;
    }
    return true;
}

void SharedStream::StopSource() {
    std::unique_ptr<SourceWorker> worker;
    {
        std::lock_guard lock(source_mu_);
        if (source_worker_ == nullptr) {
            source_running_ = false;
            return;
        }
        worker = std::move(source_worker_);
        source_running_ = false;
    }
    worker->Stop();
}

bool SharedStream::IsSourceRunning() const {
    std::lock_guard lock(source_mu_);
    if (!source_running_ || source_worker_ == nullptr) {
        return false;
    }
    return source_worker_->IsRunning();
}

const media::SourceSpec& SharedStream::source_spec() const {
    return source_spec_;
}

std::size_t SharedStream::DroppedPacketCount(const std::string& session_id) const {
    std::shared_ptr<SubscriberState> state;
    {
        std::shared_lock lock(mu_);
        const auto it = subscribers_.find(session_id);
        if (it == subscribers_.end()) {
            return 0;
        }
        state = it->second;
    }

    std::lock_guard lock(state->mu);
    return state->dropped_packets;
}

std::size_t SharedStream::TotalDroppedPacketCount() const {
    std::vector<std::shared_ptr<SubscriberState>> states;
    {
        std::shared_lock lock(mu_);
        states.reserve(subscribers_.size());
        for (const auto& [_, state] : subscribers_) {
            states.push_back(state);
        }
    }

    std::size_t total = 0;
    for (const auto& state : states) {
        std::lock_guard lock(state->mu);
        total += state->dropped_packets;
    }
    return total;
}

void SharedStream::WorkerLoop(const std::shared_ptr<SubscriberState>& state) {
    while (true) {
        media::Packet packet;
        {
            std::unique_lock lock(state->mu);
            state->cv.wait(lock, [&] { return state->stop || !state->queue.empty(); });
            if (state->stop && state->queue.empty()) {
                return;
            }

            packet = std::move(state->queue.front());
            state->queue.pop_front();
        }

        try {
            state->callback(packet);
        } catch (const std::exception&) {
            // subscriber callback 실패는 해당 구독자 문제로 격리하고 source fan-out은 계속 유지한다.
        } catch (...) {
            // 비표준 예외도 worker thread를 죽이지 않는다.
        }
    }
}

void SharedStream::EnqueuePacket(const std::shared_ptr<SubscriberState>& state, const media::Packet& packet) const {
    {
        std::lock_guard lock(state->mu);
        if (state->stop) {
            return;
        }

        if (state->queue.size() >= app::GetAppConfig().subscriber_queue_size) {
            // live stream 특성상 지연된 오래된 패킷보다 최신 패킷을 유지하는 것이 낫다.
            state->queue.pop_front();
            ++state->dropped_packets;
        }
        state->queue.push_back(packet);
    }
    state->cv.notify_one();
}

}  // namespace core

#include "core/shared_stream.h"

#include <exception>

#include "app_config.h"

namespace core {

SharedStream::SharedStream(media::SourceSpec source_spec) : source_spec_(std::move(source_spec)) {}

SharedStream::~SharedStream() {
    StopSource();
    StopAllSubscribers();
}

bool SharedStream::AddSubscriber(const std::string& session_id, SubscriberCallback callback) {
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

    std::optional<media::Packet> cached_keyframe;
    std::optional<media::Packet> cached_audio;
    {
        std::lock_guard keyframe_lock(keyframe_mu_);
        cached_keyframe = last_video_keyframe_;
        cached_audio = last_audio_packet_;
    }
    if (cached_keyframe.has_value()) {
        EnqueuePacket(state, *cached_keyframe);
    }
    if (cached_audio.has_value()) {
        EnqueuePacket(state, *cached_audio);
    }
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
    if (packet.kind == media::MediaKind::Video && packet.is_key_frame) {
        std::lock_guard keyframe_lock(keyframe_mu_);
        last_video_keyframe_ = packet;
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

bool SharedStream::StartSource(std::unique_ptr<SourceWorker> worker, std::string* error_message) {
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
    if (previous_worker != nullptr) {
        previous_worker->Stop();
    }
    if (!source_worker_->Start(shared_from_this(), error_message)) {
        source_worker_.reset();
        source_running_ = false;
        return false;
    }
    source_running_ = true;
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
            // Subscriber callback failures are isolated by design.
        } catch (...) {
            // Keep worker alive for non-standard exceptions.
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
            state->queue.pop_front();
            ++state->dropped_packets;
        }
        state->queue.push_back(packet);
    }
    state->cv.notify_one();
}

}  // namespace core

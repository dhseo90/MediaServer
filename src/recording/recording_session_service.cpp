// 파일 요약: 녹화 채널을 SharedStream의 독립 Recorder subscriber에 연결한다.
// 동작 요약: descriptor와 첫 keyframe이 준비된 뒤 writer를 시작하고 detach 순서를 고정한다.
#include "recording/recording_session_service.h"

#include <chrono>
#include <atomic>
#include <vector>

namespace recording {

struct RecordingSessionService::ChannelState {
    std::mutex mu;
    std::string channel_id;
    std::string stream_epoch_id;
    std::string subscriber_id;
    // 서비스 mu_ 아래에서만 게시·조회한다. 시작 중인 handle을 조회하지 않는다.
    std::string published_stream_key;
    bool time_ambiguous{false};
    core::SessionManager::AuxiliaryStreamHandle handle;
    std::unique_ptr<SegmentWriter> writer;
    std::atomic<bool> writer_started{false};
    std::atomic<bool> stopping{false};
};

RecordingSessionService::RecordingSessionService(core::SessionManager& session_manager,
                                                 RecordingStorePort& store,
                                                 WriterFactory writer_factory)
    : session_manager_(session_manager), store_(store), writer_factory_(std::move(writer_factory)) {}

RecordingSessionService::~RecordingSessionService() { StopAll(); }

std::int64_t RecordingSessionService::NowMs() {
    return std::chrono::duration_cast<std::chrono::milliseconds>(
               std::chrono::system_clock::now().time_since_epoch())
        .count();
}

RecordingSessionService::StartResult RecordingSessionService::StartChannel(
    const std::string& channel_id,
    const std::string& stream_epoch_id,
    const media::IngressRequest& request,
    bool enabled) {
    if (!enabled) return {.ok = true, .started = false, .message = "recording disabled"};
    if (channel_id.empty() || stream_epoch_id.empty()) {
        return {.ok = false, .message = "channel/epoch ID가 비어 있음"};
    }
    auto state = std::make_shared<ChannelState>();
    state->channel_id = channel_id;
    state->stream_epoch_id = stream_epoch_id;
    state->subscriber_id = "recording:" + channel_id;
    state->writer = writer_factory_ ? writer_factory_() : nullptr;
    if (state->writer == nullptr) return {.ok = false, .message = "segment writer 생성 실패"};

    {
        std::lock_guard lock(mu_);
        if (closing_) return {.ok = false, .message = "recording session service is closing"};
        if (channels_.find(channel_id) != channels_.end()) {
            return {.ok = false, .message = "channel recorder가 이미 존재함"};
        }
        channels_.emplace(channel_id, state);
    }

    state->handle = session_manager_.AcquireAuxiliaryStream(request);
    if (!state->handle.ok) {
        std::lock_guard lock(mu_);
        channels_.erase(channel_id);
        return {.ok = false, .message = state->handle.message};
    }
    if (!state->handle.stream->AddRecordingSubscriber(
            state->subscriber_id,
            [this, weak = std::weak_ptr<ChannelState>(state)](const media::Packet& packet) {
                if (const auto locked = weak.lock()) OnPacket(locked, packet);
            })) {
        session_manager_.DiscardAuxiliaryStream(state->handle);
        std::lock_guard lock(mu_);
        channels_.erase(channel_id);
        return {.ok = false, .message = "duplicate recording subscriber"};
    }
    std::string source_error;
    if (!session_manager_.StartAuxiliaryStream(state->handle, &source_error)) {
        state->handle.stream->RemoveSubscriber(state->subscriber_id);
        session_manager_.DiscardAuxiliaryStream(state->handle);
        std::lock_guard lock(mu_);
        channels_.erase(channel_id);
        return {.ok = false,
                .message = source_error.empty() ? "recording source 시작 실패" : source_error};
    }
    {
        std::lock_guard lock(mu_);
        const auto current = channels_.find(channel_id);
        if (!closing_ && current != channels_.end() && current->second == state) {
            state->published_stream_key = state->handle.stream_key;
            state->time_ambiguous = time_key_capacity_exceeded_ ||
                retired_time_keys_.count(state->published_stream_key) != 0;
        }
    }
    return {.ok = true, .started = true, .message = "ok"};
}

void RecordingSessionService::OnPacket(const std::shared_ptr<ChannelState>& state,
                                       const media::Packet& packet) {
    std::lock_guard lock(state->mu);
    if (state->stopping) return;
    if (!state->writer_started) {
        if (packet.kind != media::MediaKind::Video || !packet.is_key_frame) return;
        const auto descriptor = state->handle.stream->descriptor();
        if (!descriptor.has_value()) return;
        std::string error;
        if (!state->writer->Start(
                state->channel_id,
                state->stream_epoch_id,
                *descriptor,
                [this](RecordingSegmentV1 segment,
                       std::string media_path,
                       std::string* finalize_error) {
                    const bool finalized = store_.FinalizeSegment(segment, media_path, finalize_error);
                    if (finalized) {
                        const auto observer = std::atomic_load(&finalized_observer_);
                        if (observer && *observer) {
                            try { (*observer)(); } catch (...) {
                                // 보조 분석 실패는 이미 확정된 녹화를 실패로 바꾸지 않는다.
                            }
                        }
                    }
                    return finalized;
                },
                &error)) {
            state->stopping = true;
            return;
        }
        state->writer_started = true;
    }
    state->writer->Push(packet, NowMs());
}

bool RecordingSessionService::StopChannel(const std::string& channel_id) {
    std::shared_ptr<ChannelState> state;
    {
        std::lock_guard lock(mu_);
        const auto it = channels_.find(channel_id);
        if (it == channels_.end()) return false;
        state = it->second;
        if (!state->published_stream_key.empty()) {
            if (retired_time_keys_.size() < 4096) retired_time_keys_.insert(state->published_stream_key);
            else time_key_capacity_exceeded_ = true;
        }
        channels_.erase(it);
    }
    {
        std::lock_guard lock(state->mu);
        state->stopping = true;
    }
    state->handle.stream->RemoveSubscriber(state->subscriber_id);
    state->writer->Stop();
    session_manager_.ReleaseAuxiliaryStreamWhenIdle(state->handle);
    return true;
}

void RecordingSessionService::StopAll() {
    std::vector<std::string> channel_ids;
    {
        std::lock_guard lock(mu_);
        closing_ = true;
        channel_ids.reserve(channels_.size());
        for (const auto& [channel_id, _] : channels_) channel_ids.push_back(channel_id);
    }
    for (const auto& channel_id : channel_ids) (void)StopChannel(channel_id);
}

std::size_t RecordingSessionService::ActiveChannelCount() const {
    std::lock_guard lock(mu_);
    return channels_.size();
}

bool RecordingSessionService::IsChannelRecording(const std::string& channel_id) const {
    std::lock_guard lock(mu_);
    const auto found = channels_.find(channel_id);
    return !closing_ && found != channels_.end() && !found->second->stopping.load() &&
           found->second->writer_started.load();
}

std::optional<std::string> RecordingSessionService::ResolveRecordingChannel(
    const std::string& stream_key) const {
    if (stream_key.empty()) return std::nullopt;
    std::lock_guard lock(mu_);
    if (closing_) return std::nullopt;
    std::optional<std::string> channel;
    for (const auto& [channel_id, state] : channels_) {
        if (state->published_stream_key != stream_key) continue;
        // writer Push/Finalize가 보유한 state mu_를 기다리지 않는다.
        if (state->stopping.load()) continue;
        if (channel.has_value()) return std::nullopt;
        channel = channel_id;
    }
    return channel;
}

std::optional<RecordingTimeSnapshot> RecordingSessionService::ResolveRecordingTime(
    const std::string& stream_key, std::int64_t pts) const {
    if (stream_key.empty() || pts < 0) return std::nullopt;
    // 종료/finalize 경합에서는 기다리는 대신 미확인 위치로 남긴다.
    std::unique_lock lock(mu_, std::try_to_lock);
    if (!lock.owns_lock() || closing_ || time_key_capacity_exceeded_) return std::nullopt;
    std::shared_ptr<ChannelState> selected;
    for (const auto& [_, state] : channels_) {
        if (state->published_stream_key != stream_key || state->stopping.load()) continue;
        if (selected || state->time_ambiguous) return std::nullopt;
        selected = state;
    }
    if (!selected || !selected->writer_started.load()) return std::nullopt;
    const auto snapshot = selected->writer->TimeSnapshot();
    if (!snapshot || snapshot->channel_id != selected->channel_id ||
        pts < snapshot->first_pts || pts > snapshot->last_pts || !snapshot->Contains(pts))
        return std::nullopt;
    return *snapshot;
}

void RecordingSessionService::SetFinalizedObserver(std::function<void()> observer) {
    std::atomic_store(&finalized_observer_,
        std::make_shared<const std::function<void()>>(std::move(observer)));
}

}  // namespace recording

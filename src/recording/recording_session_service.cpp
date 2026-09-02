// 파일 요약: 녹화 채널을 SharedStream의 독립 Recorder subscriber에 연결한다.
// 동작 요약: descriptor와 첫 keyframe이 준비된 뒤 writer를 시작하고 detach 순서를 고정한다.
#include "recording/recording_session_service.h"

#include <chrono>
#include <vector>

namespace recording {

struct RecordingSessionService::ChannelState {
    std::mutex mu;
    std::string channel_id;
    std::string stream_epoch_id;
    std::string subscriber_id;
    core::SessionManager::AuxiliaryStreamHandle handle;
    std::unique_ptr<SegmentWriter> writer;
    bool writer_started{false};
    bool stopping{false};
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
                [this](RecordingSegmentV1 segment, std::string media_path) {
                    std::string ignored_error;
                    (void)store_.FinalizeSegment(segment, media_path, &ignored_error);
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

}  // namespace recording

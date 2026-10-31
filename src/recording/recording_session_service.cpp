#include "recording/recording_recorder_probe.h"
#include "recording/shutdown_diagnostic.h"
#include "recording/recording_state_trace.h"
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
    std::atomic<bool> stopping{false}, input_failed{false}, initialized{false}, lease_owned{false}, joined{false};
    std::mutex stop_mu;
    std::condition_variable stop_cv;
    std::shared_ptr<const StopContext> context;
    std::shared_ptr<core::SharedStream::DrainHandle> drain;
    RecorderStopResult result;
    bool deadline_failed{false}, owner_released{false}, subscribed{false};
    bool finish_started{false}, finish_complete{false};
    bool explicit_stop{false}; // stop_mu: 시작 실패 정리와 외부 Stop 요청을 구별한다.
    std::atomic<bool> start_failed{false};
    std::uint64_t recorder_admitted{0}, before_writer_cancelled{0}, rejected_before_accept{0}, failed_after_accept{0};

};

RecordingSessionService::RecordingSessionService(core::SessionManager& session_manager,
                                                 RecordingStorePort& store,
                                                 WriterFactory writer_factory)
    : session_manager_(session_manager), store_(store), writer_factory_(std::move(writer_factory)) {}

RecordingSessionService::~RecordingSessionService() { StopAll(); JoinOwned(); }

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

    {
        std::lock_guard lock(mu_);
        if (closing_) return {.ok = false, .message = "recording session service is closing"};
        const auto existing=channels_.find(channel_id);
        if(existing!=channels_.end()) {
            // map 교체 뒤에도 stop_lock이 해제될 때까지 이전 객체를 보유한다.
            const auto previous=existing->second;
            std::lock_guard stop_lock(previous->stop_mu);
            const auto& result=previous->result;
            const bool retryable_start_failure=previous->start_failed && !previous->explicit_stop &&
                previous->initialized && previous->finish_complete && previous->joined &&
                !previous->deadline_failed && result.outcome==StopOutcome::Failed &&
                result.joined && result.unfinished==0 && result.owner_released && previous->owner_released &&
                result.writer.operation_complete && !result.writer.reservation_retained &&
                (result.writer.outcome==StopOutcome::Completed ||
                 result.writer.outcome==StopOutcome::CompletedWithCancellation) &&
                !previous->writer && !previous->drain && !previous->lease_owned && !previous->handle.stream;
            if(!previous->joined || (!result.Succeeded() && !retryable_start_failure))
                return {.ok=false,.message="channel recorder 또는 실패 소유권이 남아 있음"};
            state->writer = writer_factory_ ? writer_factory_() : nullptr;
            if(!state->writer) return {.ok=false,.message="segment writer 생성 실패"};
            // mu_가 중복 Start/Stop의 선택을 직렬화한다. 이전 callback은 map을 변경하지 않는다.
            existing->second=state;
        } else {
            state->writer = writer_factory_ ? writer_factory_() : nullptr;
            if(!state->writer) return {.ok=false,.message="segment writer 생성 실패"};
            channels_.emplace(channel_id, state);
        }
        TraceRecordingState(channel_id,"session-created",stream_epoch_id);
    }

    struct Initialization {
        std::shared_ptr<ChannelState> state;
        ~Initialization() { state->initialized=true; state->stop_cv.notify_all(); }
    } initialization{state};
    // map은 실패 결과와 실제 Join의 owner다. 시작 실패가 별도 subscriber 제거로
    // 진행 중인 DrainHandle을 잃거나 callback에서 마지막 owner를 파괴하면 안 된다.
    const auto fail_start = [&](std::string message) -> StartResult {
        state->start_failed=true;state->input_failed=true;
        BeginStop(state,StopContext::Grace()); // 진행 중인 Stop의 최초 deadline은 유지한다.
        state->initialized=true;state->stop_cv.notify_all();
        if(!state->subscribed) FinishChannel(state); // worker가 없으면 시작 thread가 완료한다.
        (void)WaitStop(state); // 실패/timeout도 map의 ledger와 owner에 남긴다.
        return {.ok=false,.message=std::move(message)};
    };
    try {
        state->handle = session_manager_.AcquireAuxiliaryStream(request);
        if (!state->handle.ok) {
            return fail_start(state->handle.message);
        }
        state->lease_owned=true;
        bool subscribed=false;
        {
            std::lock_guard start_stop_lock(state->stop_mu);
            if(!state->stopping) {
                subscribed=state->handle.stream->AddRecordingSubscriber(
                    state->subscriber_id,
                    [this, weak=std::weak_ptr<ChannelState>(state)](const media::Packet& packet) {
                        if(const auto locked=weak.lock()) OnPacket(locked,packet);
                    },[this, weak=std::weak_ptr<ChannelState>(state)] {
                        if(const auto locked=weak.lock()) FinishChannel(locked);
                    });
                state->subscribed=subscribed;
            }
        }
        if(!subscribed) return fail_start("recording start cancelled or duplicate subscriber");
        std::string source_error;
        if (!session_manager_.StartAuxiliaryStream(state->handle, &source_error)) {
            return fail_start(source_error.empty() ? "recording source 시작 실패" : source_error);
        }
        {
            std::lock_guard lock(mu_);
            const auto current = channels_.find(channel_id);
            if (!closing_ && !state->stopping && current != channels_.end() && current->second == state) {
                state->published_stream_key = state->handle.stream_key;
                state->time_ambiguous = time_key_capacity_exceeded_ ||
                    retired_time_keys_.count(state->published_stream_key) != 0;
            }
        }
        return {.ok = true, .started = true, .message = "ok"};
    } catch (const std::exception& error) {
        return fail_start(error.what());
    } catch (...) {
        return fail_start("recording source 시작 예외");
    }
}

void RecordingSessionService::OnPacket(const std::shared_ptr<ChannelState>& state,
                                       const media::Packet& packet) {
    recorder_probe::Context p1_context(recorder_probe::Enabled()?recorder_probe::Key(state->channel_id):0,packet.observation?packet.observation->generation_order:0,packet.observation?packet.observation->ordinal:0);
    std::lock_guard lock(state->mu);
    // stopping은 신규 Queue cutoff다. 이미 dequeue된 permit은 deadline 전까지 유효하다.
    const auto context=std::atomic_load(&state->context);
    if(context && context->CancelBeforeAccept()) { ++state->before_writer_cancelled; return; }
    if(state->input_failed) { ++state->rejected_before_accept;return; }
    if (!state->writer_started) {
        if (packet.kind != media::MediaKind::Video || !packet.is_key_frame) { ++state->rejected_before_accept;return; }
        const auto descriptor = state->handle.stream->descriptor();
        if (!descriptor.has_value()) { ++state->rejected_before_accept;return; }
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
            TraceRecordingState(state->channel_id,"writer-start-failed",error);
            state->input_failed = true;++state->rejected_before_accept;
            return;
        }
        state->writer_started = true;
        TraceRecordingState(state->channel_id,"writer-started","ok");
    }
    ++state->recorder_admitted;
    const auto result=state->writer->PushObserved(packet, NowMs());
    if(result.outcome==PacketOutcome::RejectedBeforeAccept || result.outcome==PacketOutcome::FailedBeforeAccept)++state->rejected_before_accept;
    if(result.outcome==PacketOutcome::AcceptedThenFailed)++state->failed_after_accept;
    if(result.outcome==PacketOutcome::AcceptedThenFailed || result.outcome==PacketOutcome::FailedBeforeAccept)
        state->input_failed=true;
}

void RecordingSessionService::FinishChannel(const std::shared_ptr<ChannelState>& state) {
    {
        std::unique_lock lock(state->stop_mu);
        state->stop_cv.wait(lock,[&]{return state->initialized.load();});
        if(state->finish_started) return;
        state->finish_started=true;
    }
    WriterStopResult writer;
    try { writer=state->writer->StopObserved(); }
    catch (...) { writer.outcome=StopOutcome::Failed; }
    bool released=false;
    try {
        if(state->lease_owned.exchange(false)) {
            if(state->start_failed) session_manager_.DiscardAuxiliaryStream(state->handle);
            else session_manager_.ReleaseAuxiliaryStreamWhenIdle(state->handle);
        }
        released=true;
    } catch (...) { writer.outcome=StopOutcome::Failed; }
    std::lock_guard lock(state->stop_mu);
    state->result.writer=writer;
    state->owner_released=released;
    state->finish_complete=true;
    state->stop_cv.notify_all();
}

void RecordingSessionService::BeginStop(const std::shared_ptr<ChannelState>& state,
                                       std::shared_ptr<const StopContext> context) {
    std::lock_guard lock(state->stop_mu);
    if(!std::atomic_load(&state->context)) {
        std::atomic_store(&state->context,context);
        state->result.stop_id=context->id;
        state->stopping=true;
        try { state->writer->RequestStop(context); }
        catch (...) { state->input_failed=true; }
    }
    if(state->subscribed && !state->drain && !state->joined && state->handle.stream) {
        state->drain=state->handle.stream->BeginDrain(state->subscriber_id,std::atomic_load(&state->context));
    }
}
RecorderStopResult RecordingSessionService::WaitStop(const std::shared_ptr<ChannelState>& state) {
    const auto context=std::atomic_load(&state->context);
    {
        std::unique_lock lock(state->stop_mu);
        if(state->joined) return state->result;
        if(!state->stop_cv.wait_until(lock,context->deadline,[&]{return state->initialized.load() && (state->subscribed || state->finish_complete);})) {
            state->deadline_failed=true;
            auto out=state->result;out.outcome=StopOutcome::DeadlineUnconfirmed;out.unfinished=1;return out;
        }
    }
    BeginStop(state,context);
    std::shared_ptr<core::SharedStream::DrainHandle> drain;
    { std::lock_guard lock(state->stop_mu); if(state->joined)return state->result; drain=state->drain; }
    // subscriber가 없는 시작 실패도 FinishChannel 완료를 기다린 뒤에만 Join 완료로 센다.
    auto observed=drain ? drain->WaitUntil(context->deadline) : core::SharedStream::DrainObservation{};
    if(!drain) observed.joined=!state->subscribed;
    std::lock_guard lock(state->stop_mu);
    if(state->joined)return state->result;
    auto& out=state->result;
    out.enqueued=observed.enqueued;out.dequeued=observed.dequeued;out.overflow=observed.overflow;
    out.cancelled=observed.cancelled;
    out.joined=observed.joined;
    out.owner_released=observed.joined && state->owner_released && !out.writer.reservation_retained;
    out.unfinished=observed.joined ? 0 : 1;
    if(!observed.joined) {
        const auto accepted=state->writer->AcceptedPacketCount();
        out.writer.accepted_known=accepted.has_value();if(accepted)out.writer.accepted=*accepted;
    }
    if(!observed.joined || context->Expired())state->deadline_failed=true;
    if(observed.joined) {
        state->joined=true;out.cancelled+=state->before_writer_cancelled+out.writer.cancelled_before_accept;
        out.recorder_admitted=state->recorder_admitted;out.rejected_before_accept=state->rejected_before_accept;out.failed_after_accept=state->failed_after_accept;
    }
    if(state->deadline_failed) out.outcome=StopOutcome::DeadlineUnconfirmed;
    else if(observed.failed || state->input_failed || !out.owner_released || !out.writer.operation_complete ||
            out.writer.outcome==StopOutcome::Failed || out.writer.outcome==StopOutcome::DeadlineUnconfirmed)out.outcome=StopOutcome::Failed;
    else out.outcome=out.cancelled ? StopOutcome::CompletedWithCancellation : StopOutcome::Completed;
    if(out.Succeeded() || (state->start_failed && out.joined && state->owner_released &&
                           out.writer.operation_complete && !out.writer.reservation_retained)) {
        // 같은 Stop의 결과만 남긴다. 종료한 Writer/GOP/worker 소유권을 보관하지 않는다.
        state->writer.reset();state->handle={};state->drain.reset();
        if(context->Expired()) { state->deadline_failed=true;out.outcome=StopOutcome::DeadlineUnconfirmed; }
    }
    std::fprintf(stderr,"[recorder-stop] channel=%s stopId=%llu result=%s joined=%d unfinished=%zu enqueued=%llu dequeued=%llu overflow=%llu cancelled=%llu accepted=%llu finalized=%llu ready=%d catalogApplied=%d reservationRetained=%d ownerReleased=%d acceptedKnown=%d durableStateKnown=%d admitted=%llu rejectedBeforeAccept=%llu failedAfterAccept=%llu\n",
        state->channel_id.c_str(),(unsigned long long)out.stop_id,StopOutcomeName(out.outcome),out.joined,out.unfinished,
        (unsigned long long)out.enqueued,(unsigned long long)out.dequeued,(unsigned long long)out.overflow,(unsigned long long)out.cancelled,
        (unsigned long long)out.writer.accepted,(unsigned long long)out.writer.finalized,out.writer.durable_ready,out.writer.catalog_applied,out.writer.reservation_retained,out.owner_released,out.writer.accepted_known,out.writer.operation_complete,
        (unsigned long long)out.recorder_admitted,(unsigned long long)out.rejected_before_accept,(unsigned long long)out.failed_after_accept);
    return out;
}
RecorderStopResult RecordingSessionService::StopChannel(const std::string& channel_id,
                                                       std::shared_ptr<const StopContext> context) {
    std::shared_ptr<ChannelState> state;
    {
        std::lock_guard lock(mu_);
        const auto found=channels_.find(channel_id);
        if(found==channels_.end()) { RecorderStopResult out;out.outcome=StopOutcome::Completed;out.joined=true;out.owner_released=true;return out; }
        state=found->second;
        { std::lock_guard stop_lock(state->stop_mu);state->explicit_stop=true; }
        if(!state->published_stream_key.empty()) {
            if(retired_time_keys_.size()<4096)retired_time_keys_.insert(state->published_stream_key);
            else time_key_capacity_exceeded_=true;
        }
    }
    BeginStop(state,std::move(context));return WaitStop(state);
}
bool RecordingSessionService::StopChannel(const std::string& channel_id) {
    bool active=false;
    { std::lock_guard lock(mu_);const auto it=channels_.find(channel_id);if(it==channels_.end())return false;
      std::lock_guard stop_lock(it->second->stop_mu);it->second->explicit_stop=true;active=!it->second->joined; }
    (void)StopChannel(channel_id,StopContext::Grace());return active;
}
void RecordingSessionService::BeginStopAll(std::shared_ptr<const StopContext> context) {
    std::vector<std::shared_ptr<ChannelState>> states;
    { std::lock_guard lock(mu_);closing_=true;for(const auto& entry:channels_)states.push_back(entry.second); }
    for(const auto& state:states)BeginStop(state,context);
}
RecorderStopResult RecordingSessionService::StopAll(std::shared_ptr<const StopContext> context) {
    BeginStopAll(context);
    std::vector<std::shared_ptr<ChannelState>> states;
    { std::lock_guard lock(mu_);for(const auto& entry:channels_)states.push_back(entry.second); }
    RecorderStopResult out;out.outcome=StopOutcome::Completed;out.joined=true;out.owner_released=true;out.stop_id=context->id;
    for(const auto& state:states) {
        const auto channel=WaitStop(state);
        out.enqueued+=channel.enqueued;out.dequeued+=channel.dequeued;out.overflow+=channel.overflow;out.cancelled+=channel.cancelled;
        out.writer.accepted+=channel.writer.accepted;out.writer.finalized+=channel.writer.finalized;
        out.recorder_admitted+=channel.recorder_admitted;out.rejected_before_accept+=channel.rejected_before_accept;out.failed_after_accept+=channel.failed_after_accept;
        out.unfinished+=channel.unfinished;out.joined&=channel.joined;out.owner_released&=channel.owner_released;
        if(channel.outcome==StopOutcome::DeadlineUnconfirmed)out.outcome=channel.outcome;
        else if(channel.outcome==StopOutcome::Failed && out.outcome!=StopOutcome::DeadlineUnconfirmed)out.outcome=channel.outcome;
        else if(channel.outcome==StopOutcome::CompletedWithCancellation && out.outcome==StopOutcome::Completed)out.outcome=channel.outcome;
    }
    return out;
}
void RecordingSessionService::StopAll() { (void)StopAll(StopContext::Grace()); }
void RecordingSessionService::JoinOwned() {
    std::vector<std::shared_ptr<ChannelState>> states;
    { std::lock_guard lock(mu_);for(const auto& entry:channels_)states.push_back(entry.second); }
    for(const auto& state:states) {
        { std::unique_lock lock(state->stop_mu);state->stop_cv.wait(lock,[&]{return state->initialized.load();}); }
        const auto context=std::atomic_load(&state->context);
        BeginStop(state,context ? context : StopContext::Grace());
        std::shared_ptr<core::SharedStream::DrainHandle> drain;
        { std::lock_guard lock(state->stop_mu);drain=state->drain; }
        if(drain) drain->Join();
        else { std::unique_lock lock(state->stop_mu);state->stop_cv.wait(lock,[&]{return state->finish_complete;}); }
        (void)WaitStop(state);
    }
}

std::size_t RecordingSessionService::ActiveChannelCount() const {
    std::lock_guard lock(mu_);
    std::size_t count=0;for(const auto& entry:channels_)if(!entry.second->joined)++count;return count;
}

bool RecordingSessionService::IsChannelRecording(const std::string& channel_id) const {
    std::lock_guard lock(mu_);
    const auto found = channels_.find(channel_id);
    return !closing_ && found != channels_.end() && !found->second->stopping.load() && !found->second->input_failed.load() &&
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
        if (state->stopping.load() || state->input_failed.load()) continue;
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
        if (state->published_stream_key != stream_key || (state->stopping.load() || state->input_failed.load())) continue;
        if (selected || state->time_ambiguous) return std::nullopt;
        selected = state;
    }
    if (!selected || !selected->writer_started.load()) return std::nullopt;
    // 짧은 snapshot 읽기와 writer.reset만 같은 stop_mu로 결속한다.
    // Stop/Join 중에는 기다리지 않으며 검사 뒤 reset되는 수명 경쟁을 막는다.
    std::unique_lock writer_lock(selected->stop_mu,std::try_to_lock);
    if(!writer_lock.owns_lock() || selected->stopping || !selected->writer) return std::nullopt;
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

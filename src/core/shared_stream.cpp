#include "recording/shutdown_diagnostic.h"
#include "recording/recording_latency_trace.h"
// 파일 요약: 하나의 source packet을 여러 subscriber에게 fan-out한다.
// 동작 요약: subscriber별 bounded queue, cached keyframe/audio 재전달, idle 상태를 관리한다.
// 동작 요약: source worker와 여러 egress/analysis consumer 사이의 thread-safe 버퍼 역할을 한다.
#include "core/shared_stream.h"

#include <exception>

#include "app_config.h"
#include "core/runtime_debug_counters.h"

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
    return AddSubscriberWithRole(session_id, std::move(callback), SubscriberRole::Client);
}

bool SharedStream::AddAnalysisSubscriber(const std::string& subscriber_id, SubscriberCallback callback) {
    return AddSubscriberWithRole(subscriber_id, std::move(callback), SubscriberRole::Analysis);
}

bool SharedStream::AddRecordingSubscriber(const std::string& subscriber_id, SubscriberCallback callback, std::function<void()> on_drained) {
    return AddSubscriberWithRole(subscriber_id, std::move(callback), SubscriberRole::Recorder, std::move(on_drained));
}

const char* SubscriberRoleLabel(SharedStream::SubscriberRole role) {
    switch (role) {
        case SharedStream::SubscriberRole::Client: return "client";
        case SharedStream::SubscriberRole::Analysis: return "analysis";
        case SharedStream::SubscriberRole::Recorder: return "recorder";
    }
    return "unknown";
}

bool SharedStream::AddSubscriberWithRole(const std::string& subscriber_id,
                                         SubscriberCallback callback,
                                         SubscriberRole role, std::function<void()> on_drained) {
    // subscriber마다 독립 worker thread와 queue를 둬 느린 클라이언트가 다른 클라이언트를 막지 않게 한다.
    auto state = std::make_shared<SubscriberState>(std::move(callback), role);
    state->on_drained = std::move(on_drained);
    state->worker = std::thread(&SharedStream::WorkerLoop, state);

    std::unique_lock lock(mu_);
    auto [it, inserted] = subscribers_.emplace(subscriber_id, state);
    if (!inserted) {
        lock.unlock();
        {
            std::lock_guard state_lock(state->mu);
            state->on_drained = {}; // 등록 실패: Recorder 종료 callback의 소유권을 얻지 않았다.
            state->stop = true;
        }
        state->cv.notify_one();
        if (state->worker.joinable()) {
            {recording::shutdown_probe::Scope phase("subscriber-join");state->worker.join();}
            ReportRecorder(state);
        }
        return false;
    }
    core::runtime_debug::RecordSharedStreamSubscriberAdded(
        SubscriberRoleLabel(role));

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

std::shared_ptr<SharedStream::DrainHandle> SharedStream::BeginDrain(
    const std::string& id, std::shared_ptr<const recording::StopContext> context) {
    std::shared_ptr<SubscriberState> state;
    {
        std::unique_lock lock(mu_);
        const auto it=subscribers_.find(id);
        if(it==subscribers_.end()) return {};
        state=it->second;
        // FanOut의 기존 snapshot도 이 queue lock에서 cutoff를 확인한다.
        std::lock_guard queue_lock(state->mu);
        state->stop_context=std::move(context);
        state->stop=true;
        subscribers_.erase(it);
    }
    runtime_debug::RecordSharedStreamSubscriberRemoved(SubscriberRoleLabel(state->role));
    state->cv.notify_all();
    return std::shared_ptr<DrainHandle>(new DrainHandle(std::move(state)));
}
SharedStream::DrainHandle::~DrainHandle() { Join(); }
SharedStream::DrainObservation SharedStream::DrainHandle::WaitUntil(
    recording::StopContext::Clock::time_point deadline) {
    DrainObservation out;
    {
        std::unique_lock lock(state_->mu);
        state_->cv.wait_until(lock,deadline,[&]{return state_->done;});
        out={false,state_->callback_failed,state_->total_enqueued,state_->total_dequeued,
             state_->dropped_packets,state_->cancelled,state_->after_cutoff};
        if(!state_->done) return out;
    }
    std::lock_guard join_lock(state_->join_mu);
    if(state_->worker.joinable()) { state_->worker.join(); ReportRecorder(state_); }
    out.joined=true;
    return out;
}
SharedStream::DrainObservation SharedStream::DrainHandle::Join() {
    return WaitUntil(recording::StopContext::Clock::time_point::max());
}
void SharedStream::RemoveSubscriber(const std::string& id) {
    auto drain=BeginDrain(id,{});
    if(drain) drain->Join();
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
        core::runtime_debug::RecordSharedStreamSubscriberRemoved(
            SubscriberRoleLabel(state->role));
        {
            std::lock_guard state_lock(state->mu);
            state->stop = true;
        }
        state->cv.notify_one();
    }

    for (const auto& state : states) {
        if (state->worker.joinable()) {
            {recording::shutdown_probe::Scope phase("subscriber-join");state->worker.join();}
            ReportRecorder(state);
        }
    }
}

std::size_t SharedStream::RefCount() const {
    std::shared_lock lock(mu_);
    std::size_t count = 0;
    for (const auto& [_, state] : subscribers_) {
        if (state->role == SubscriberRole::Client) {
            ++count;
        }
    }
    return count;
}

std::size_t SharedStream::AnalysisSubscriberCount() const {
    std::shared_lock lock(mu_);
    std::size_t count = 0;
    for (const auto& [_, state] : subscribers_) {
        if (state->role == SubscriberRole::Analysis) {
            ++count;
        }
    }
    return count;
}

std::size_t SharedStream::RecordingSubscriberCount() const {
    std::shared_lock lock(mu_);
    std::size_t count = 0;
    for (const auto& [_, state] : subscribers_) {
        if (state->role == SubscriberRole::Recorder) ++count;
    }
    return count;
}

std::size_t SharedStream::TotalSubscriberCount() const {
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
    {recording::shutdown_probe::Scope phase("source-worker-stop");worker->Stop();}
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

void SharedStream::ReportRecorder(const std::shared_ptr<SubscriberState>& state) {
    if(!recording::latency::SubcostEnabled()||state->role!=SubscriberRole::Recorder)return;
    // Called only after join, outside queue/map locks; all counter writers stopped.
    std::fprintf(stderr,"[recorder-cost] enqueued=%llu dequeued=%llu dropped=%zu payloadBytes=%llu maxDepth=%llu maxBytes=%llu firstNs=%llu lastNs=%llu minInputGapNs=%llu maxInputGapNs=%llu queueWaitNs=%llu maxQueueWaitNs=%llu callbackNs=%llu maxCallbackNs=%llu firstDepth64Ns=%llu firstDropNs=%llu maxCallbackBeginNs=%llu maxCallbackOrdinal=%llu\n",
        (unsigned long long)state->enqueued,(unsigned long long)state->dequeued,state->dropped_packets,
        (unsigned long long)state->payload_bytes,(unsigned long long)state->max_depth,(unsigned long long)state->max_bytes,
        (unsigned long long)state->first_input_ns,(unsigned long long)state->last_input_ns,
        (unsigned long long)state->min_input_gap_ns,(unsigned long long)state->max_input_gap_ns,
        (unsigned long long)state->queue_wait_ns,(unsigned long long)state->max_queue_wait_ns,
        (unsigned long long)state->callback_ns,(unsigned long long)state->max_callback_ns,(unsigned long long)state->first_depth64_ns,(unsigned long long)state->first_drop_ns,(unsigned long long)state->max_callback_begin_ns,(unsigned long long)state->max_callback_ordinal);
}

void SharedStream::WorkerLoop(const std::shared_ptr<SubscriberState>& state) {
    while (true) {
        media::Packet packet;
        {
            std::unique_lock lock(state->mu);
            state->cv.wait(lock, [&] { return state->stop || !state->queue.empty(); });
            if (state->stop_context && state->stop_context->CancelBeforeAccept()) {
                state->cancelled += state->queue.size();
                state->queue.clear();
                state->queued_bytes=0;
            }
            if (state->stop && state->queue.empty()) break;
            ++state->total_dequeued;

            const auto now=recording::latency::SubcostEnabled()&&state->role==SubscriberRole::Recorder?recording::latency::Now():0;
            if(now){const auto wait=now-state->queue.front().enqueued_ns;++state->dequeued;
                state->queue_wait_ns+=wait;state->max_queue_wait_ns=std::max(state->max_queue_wait_ns,wait);
                state->queued_bytes-=state->queue.front().packet.payload.size();}
            packet = std::move(state->queue.front().packet);
            state->queue.pop_front();
            if (state->role == SubscriberRole::Recorder &&
                packet.kind == media::MediaKind::Video && state->recorder_video_loss_pending) {
                packet.recorder_video_discontinuity = true;
                state->recorder_video_loss_pending = false;
            }
        }

        const auto begin=recording::latency::SubcostEnabled()&&state->role==SubscriberRole::Recorder?recording::latency::Now():0;
        recording::recorder_probe::Context p1_context(0,packet.observation?packet.observation->generation_order:0,packet.observation?packet.observation->ordinal:0);
        if(begin&&recording::recorder_probe::Enabled()&&(state->dequeued%30==0||packet.recorder_video_discontinuity))recording::recorder_probe::Record("dequeue",begin,begin,state->dequeued,packet.recorder_video_discontinuity,state->max_queue_wait_ns);
        try {
            state->callback(packet);
        } catch (const std::exception&) {
            std::lock_guard lock(state->mu); state->callback_failed=true;
        } catch (...) {
            std::lock_guard lock(state->mu); state->callback_failed=true;
        }
        if(begin){const auto cost=recording::latency::Now()-begin;
            // Only this worker writes callback counters; final report follows join.
            state->callback_ns+=cost;if(cost>state->max_callback_ns){state->max_callback_ns=cost;state->max_callback_begin_ns=begin;state->max_callback_ordinal=packet.observation?packet.observation->ordinal:0;}}
    }
    try { if(state->on_drained) state->on_drained(); }
    catch (...) { std::lock_guard lock(state->mu); state->callback_failed=true; }
    { std::lock_guard lock(state->mu); state->done=true; }
    state->cv.notify_all();
}

void SharedStream::EnqueuePacket(const std::shared_ptr<SubscriberState>& state, const media::Packet& packet) const {
    {
        std::lock_guard lock(state->mu);
        if (state->stop) {
            ++state->after_cutoff;
            return;
        }
        ++state->total_enqueued;

        const auto p1_prior_drops=state->dropped_packets;
        if (state->queue.size() >= app::GetAppConfig().subscriber_queue_size) {
            // live stream 특성상 지연된 오래된 패킷보다 최신 패킷을 유지하는 것이 낫다.
            if (state->role == SubscriberRole::Recorder &&
                state->queue.front().packet.kind == media::MediaKind::Video) {
                state->recorder_video_loss_pending = true;
            }
            if(recording::latency::SubcostEnabled()&&state->role==SubscriberRole::Recorder)
                {state->queued_bytes-=state->queue.front().packet.payload.size();
                 if(!state->first_drop_ns)state->first_drop_ns=recording::latency::Now();}
            state->queue.pop_front();
            ++state->dropped_packets;
        }
        const auto now=recording::latency::SubcostEnabled()&&state->role==SubscriberRole::Recorder?recording::latency::Now():0;
        state->queue.push_back({packet,now});
        if(now){if(!state->first_depth64_ns&&state->queue.size()>=64)state->first_depth64_ns=now;++state->enqueued;state->payload_bytes+=packet.payload.size();state->queued_bytes+=packet.payload.size();
            state->max_depth=std::max(state->max_depth,std::uint64_t(state->queue.size()));state->max_bytes=std::max(state->max_bytes,state->queued_bytes);
            if(state->last_input_ns){const auto gap=now-state->last_input_ns;state->min_input_gap_ns=std::min(state->min_input_gap_ns,gap);state->max_input_gap_ns=std::max(state->max_input_gap_ns,gap);}
            else state->first_input_ns=now;
            state->last_input_ns=now;
            if(recording::recorder_probe::Enabled()&&(state->enqueued%30==0||state->dropped_packets!=p1_prior_drops)){
                recording::recorder_probe::Context p1_context(0,packet.observation?packet.observation->generation_order:0,packet.observation?packet.observation->ordinal:0);
                recording::recorder_probe::Record("enqueue",now,now,state->queue.size(),state->dropped_packets,state->enqueued);}
        }
    }
    state->cv.notify_one();
}

}  // namespace core

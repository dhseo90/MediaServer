#include "recording/shutdown_diagnostic.h"
// 파일 요약: source 정책 revision을 채널별 recorder 수명주기에 반영한다.
// 동작 요약: global/source/channel opt-in을 모두 만족할 때만 recorder를 유지한다.
#include "recording/recording_supervisor.h"

#include <chrono>

#include <utility>

namespace recording {
namespace {

std::int64_t NowMs() {
    return std::chrono::duration_cast<std::chrono::milliseconds>(
               std::chrono::system_clock::now().time_since_epoch())
        .count();
}

}  // namespace

RecordingSupervisor::RecordingSupervisor(const core::RecordingRuntimeConfigData& config,
                                         ingress::SourceViewApplicationService& sources,
                                         RecordingSessionService& sessions,
                                         RetentionCoordinator& retention,
                                         std::string stream_route)
    : config_(config), stream_route_(std::move(stream_route)), sources_(sources), sessions_(sessions), retention_(retention) {}

RecordingSupervisor::~RecordingSupervisor() { Stop(); }

bool RecordingSupervisor::Start(std::string* error) {
    // 녹화 opt-out은 registry 읽기 실패를 서버 전체의 시작 실패로 전파하지 않는다.
    // 기존 운영 API가 손상 registry를 500으로 거부하고 원본을 보존할 수 있어야 한다.
    if (!config_.recording_enabled) {
        if (error != nullptr) error->clear();
        return true;
    }
    {
        std::lock_guard lock(wait_mu_);
        if (running_) return true;
        stop_requested_ = false;
        running_ = true;
    }
    sources_.SetSourceMutationCallback([this](const auto& source) { ReconcileSource(source); });
    std::vector<ingress::SourceViewApplicationService::SourceRecord> sources;
    if (!sources_.Snapshot(&sources, nullptr, error)) {
        sources_.SetSourceMutationCallback({});
        std::lock_guard lock(wait_mu_);
        running_ = false;
        return false;
    }
    for (const auto& source : sources) ReconcileSource(source);
    { std::lock_guard lock(wait_mu_);safety_done_=false; }
    safety_thread_ = std::thread(&RecordingSupervisor::SafetyLoop, this);
    if (error != nullptr) error->clear();
    return true;
}

void RecordingSupervisor::BeginStop(std::shared_ptr<const StopContext> context) {
    {
        std::lock_guard lock(wait_mu_);
        if(terminal_result_)return;
        if(!stop_context_)stop_context_=context;
        stop_requested_=true;
        context=stop_context_;
    }
    wait_cv_.notify_all();
    sessions_.BeginStopAll(context);
}
RecorderStopResult RecordingSupervisor::Stop(std::shared_ptr<const StopContext> context) {
    BeginStop(context);
    { std::lock_guard lock(wait_mu_);if(terminal_result_)return *terminal_result_;context=stop_context_; }
    sources_.SetSourceMutationCallback({});
    bool done=false;
    {
        std::unique_lock lock(wait_mu_);
        done=wait_cv_.wait_until(lock,context->deadline,[&]{return safety_done_;});
    }
    if(done) { std::lock_guard join_lock(join_mu_);if(safety_thread_.joinable())safety_thread_.join(); }
    auto result=sessions_.StopAll(context);
    if(!done || context->Expired()) {
        result.outcome=StopOutcome::DeadlineUnconfirmed;
        result.unfinished+=done?0:1;
        result.joined=result.joined&&done;
        result.owner_released=false;
    }
    { std::lock_guard lock(wait_mu_);if(result.joined){running_=false;terminal_result_=result;} }
    std::fprintf(stderr,"[recording-supervisor-stop] result=%s unfinished=%zu joined=%d ownerReleased=%d\n",
        StopOutcomeName(result.outcome),result.unfinished,result.joined,result.owner_released);
    return result;
}
void RecordingSupervisor::JoinOwned() {
    {std::lock_guard join_lock(join_mu_);if(safety_thread_.joinable())safety_thread_.join();}
    sessions_.JoinOwned();
}
void RecordingSupervisor::Stop() { (void)Stop(StopContext::Grace());JoinOwned(); }

void RecordingSupervisor::ReconcileNow() {
    std::vector<ingress::SourceViewApplicationService::SourceRecord> sources;
    std::string ignored_error;
    if (!sources_.Snapshot(&sources, nullptr, &ignored_error)) return;
    for (const auto& source : sources) ReconcileSource(source);
}

void RecordingSupervisor::ReconcileSource(
    const ingress::SourceViewApplicationService::SourceRecord& source) {
    if(stop_requested_)return;
    std::lock_guard lock(reconcile_mu_);
    if(stop_requested_)return;
    auto& state = runtime_[source.source_id];
    const auto stop_channel=[&] {
        const auto result=sessions_.StopChannel(source.source_id,StopContext::Grace());
        if(!result.Succeeded()) {
            state.last_error=std::string("recorder stop ")+StopOutcomeName(result.outcome);
            return false;
        }
        state.active=false;return true;
    };
    const bool desired = core::ShouldStartRecording(
        config_.recording_enabled, source.enabled, source.recording.enabled);
    if (!desired) {
        if (state.active && !stop_channel())return;
        retention_.RemoveChannelPolicy(source.source_id);
        state.active = false;
        state.revision = source.recording.revision;
        state.last_error.clear();
        return;
    }
    RetentionPolicy policy;
    policy.continuous_max_bytes = source.recording.continuous_max_bytes;
    policy.continuous_max_age_ms = source.recording.continuous_max_age_ms;
    policy.event_max_bytes = source.recording.event_max_bytes;
    policy.event_max_age_ms = source.recording.event_max_age_ms;
    std::string policy_error;
    if (!retention_.UpdateChannelPolicy(source.source_id, policy, &policy_error)) {
        if (state.active && !stop_channel())return;
        state.active = false;
        state.revision = source.recording.revision;
        state.last_error = policy_error;
        return;
    }
    if (state.active && state.revision == source.recording.revision) return;
    if (state.active) {
        if(!stop_channel())return;
    }
    const auto result = sessions_.StartChannel(
        source.source_id,
        "epoch-" + source.source_id + "-" + std::to_string(source.recording.revision) + "-" +
            std::to_string(NowMs()),
        BuildRequest(source),
        true);
    state.revision = source.recording.revision;
    state.active = result.ok && result.started;
    state.last_error = result.ok ? std::string() : result.message;
}

media::IngressRequest RecordingSupervisor::BuildRequest(
    const ingress::SourceViewApplicationService::SourceRecord& source) const {
    media::IngressRequest request;
    request.protocol = "recording";
    request.path = "/" + stream_route_;
    request.client_id = "recording:" + source.source_id;
    if (source.kind == "file") {
        request.query["file"] = source.file;
    } else {
        std::string locator = source.rtsp_url;
        if (source.kind == "webrtc") locator = source.webrtc_source_id;
        else if (source.kind == "whep") locator = source.whep_url;
        else if (source.kind == "http" || source.kind == "hls" || source.kind == "youtube") {
            locator = source.http_url;
        }
        request.query["url"] = locator;
        request.query["source"] = source.kind;
    }
    return request;
}

void RecordingSupervisor::SafetyLoop() {
    std::unique_lock lock(wait_mu_);
    const auto fallback_interval = std::chrono::seconds(5);
    const auto interval = config_.recording_retention_interval_ms > 0
                              ? std::chrono::milliseconds(config_.recording_retention_interval_ms)
                              : std::chrono::duration_cast<std::chrono::milliseconds>(
                                    fallback_interval);
    while (!stop_requested_) {
        if (wait_cv_.wait_for(lock, interval, [this] { return stop_requested_.load(); })) break;
        lock.unlock();
        ReconcileNow();
        retention_.RunPeriodic(NowMs());
        lock.lock();
    }
    safety_done_=true;
    wait_cv_.notify_all();
}

}  // namespace recording

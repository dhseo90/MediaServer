// 파일 요약: source 정책 revision을 채널별 recorder 수명주기에 반영한다.
// 동작 요약: global/source/channel opt-in을 모두 만족할 때만 recorder를 유지한다.
#include "recording/recording_supervisor.h"

#include <chrono>

#include "app_config.h"

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
                                         RecordingSessionService& sessions)
    : config_(config), sources_(sources), sessions_(sessions) {}

RecordingSupervisor::~RecordingSupervisor() { Stop(); }

bool RecordingSupervisor::Start(std::string* error) {
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
    safety_thread_ = std::thread(&RecordingSupervisor::SafetyLoop, this);
    if (error != nullptr) error->clear();
    return true;
}

void RecordingSupervisor::Stop() {
    sources_.SetSourceMutationCallback({});
    {
        std::lock_guard lock(wait_mu_);
        if (!running_) return;
        stop_requested_ = true;
    }
    wait_cv_.notify_all();
    if (safety_thread_.joinable()) safety_thread_.join();
    sessions_.StopAll();
    std::lock_guard lock(wait_mu_);
    running_ = false;
}

void RecordingSupervisor::ReconcileNow() {
    std::vector<ingress::SourceViewApplicationService::SourceRecord> sources;
    std::string ignored_error;
    if (!sources_.Snapshot(&sources, nullptr, &ignored_error)) return;
    for (const auto& source : sources) ReconcileSource(source);
}

void RecordingSupervisor::ReconcileSource(
    const ingress::SourceViewApplicationService::SourceRecord& source) {
    std::lock_guard lock(reconcile_mu_);
    auto& state = runtime_[source.source_id];
    const bool desired = core::ShouldStartRecording(
        config_.recording_enabled, source.enabled, source.recording.enabled);
    if (!desired) {
        if (state.active) (void)sessions_.StopChannel(source.source_id);
        state.active = false;
        state.revision = source.recording.revision;
        state.last_error.clear();
        return;
    }
    if (state.active && state.revision == source.recording.revision) return;
    if (state.active) {
        (void)sessions_.StopChannel(source.source_id);
        state.active = false;
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
    request.path = "/" + app::GetAppConfig().stream_route;
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
    while (!stop_requested_) {
        if (wait_cv_.wait_for(lock, std::chrono::seconds(5), [this] { return stop_requested_; })) break;
        lock.unlock();
        ReconcileNow();
        lock.lock();
    }
}

}  // namespace recording

// 파일 용도: SharedStream analysis subscriber를 등록/해제하고 최신 dummy 분석 결과를 보관한다.
#include "analysis/analysis_manager.h"

namespace analysis {

AnalysisManager::~AnalysisManager() {
    DetachAll();
}

AnalysisManager::AttachResult AnalysisManager::AttachStream(const core::StreamKey& stream_key,
                                                            const std::shared_ptr<core::SharedStream>& stream,
                                                            AnalysisProfile profile) {
    if (stream == nullptr) {
        return {false, "missing shared stream", ""};
    }

    auto tap = std::make_shared<AnalysisTap>();
    tap->tap_id = "analysis-tap-" + std::to_string(next_tap_id_.fetch_add(1));
    tap->stream_key = stream_key;
    tap->profile = std::move(profile);
    tap->profile_key = BuildProfileKey(tap->profile);
    tap->stream = stream;
    tap->detector = CreateDummyDetector();

    std::string error_message;
    if (!tap->detector->Start(&error_message)) {
        return {false, error_message.empty() ? "failed to start detector" : error_message, ""};
    }

    std::weak_ptr<AnalysisTap> weak_tap = tap;
    if (!stream->AddAnalysisSubscriber(tap->tap_id, [weak_tap](const media::Packet& packet) {
            HandlePacket(weak_tap, packet);
        })) {
        tap->detector->Stop();
        return {false, "duplicate analysis tap id", ""};
    }

    {
        std::lock_guard lock(mu_);
        taps_.emplace(tap->tap_id, tap);
    }

    return {true, "attached", tap->tap_id};
}

bool AnalysisManager::Detach(const std::string& tap_id) {
    std::shared_ptr<AnalysisTap> tap;
    {
        std::lock_guard lock(mu_);
        const auto it = taps_.find(tap_id);
        if (it == taps_.end()) {
            return false;
        }
        tap = it->second;
        taps_.erase(it);
    }

    // manager lock을 놓고 subscriber worker를 종료해야 callback과의 교착을 피할 수 있다.
    if (auto stream = tap->stream.lock()) {
        stream->RemoveSubscriber(tap_id);
    }
    if (tap->detector != nullptr) {
        tap->detector->Stop();
    }
    return true;
}

void AnalysisManager::DetachAll() {
    std::vector<std::shared_ptr<AnalysisTap>> taps;
    {
        std::lock_guard lock(mu_);
        taps.reserve(taps_.size());
        for (auto& [_, tap] : taps_) {
            taps.push_back(tap);
        }
        taps_.clear();
    }

    for (const auto& tap : taps) {
        if (auto stream = tap->stream.lock()) {
            stream->RemoveSubscriber(tap->tap_id);
        }
        if (tap->detector != nullptr) {
            tap->detector->Stop();
        }
    }
}

std::optional<AnalysisResult> AnalysisManager::LatestResult(const std::string& tap_id) const {
    std::shared_ptr<AnalysisTap> tap;
    {
        std::lock_guard lock(mu_);
        const auto it = taps_.find(tap_id);
        if (it == taps_.end()) {
            return std::nullopt;
        }
        tap = it->second;
    }

    std::lock_guard tap_lock(tap->mu);
    return tap->latest_result;
}

std::optional<AnalysisManager::TapSnapshot> AnalysisManager::Snapshot(const std::string& tap_id) const {
    std::shared_ptr<AnalysisTap> tap;
    {
        std::lock_guard lock(mu_);
        const auto it = taps_.find(tap_id);
        if (it == taps_.end()) {
            return std::nullopt;
        }
        tap = it->second;
    }

    std::lock_guard tap_lock(tap->mu);
    return TapSnapshot{
        .tap_id = tap->tap_id,
        .stream_key = tap->stream_key,
        .profile_key = tap->profile_key,
        .received_video_packets = tap->received_video_packets,
        .analyzed_packets = tap->analyzed_packets,
        .dropped_packets = tap->dropped_packets,
        .latest_result = tap->latest_result,
    };
}

std::size_t AnalysisManager::ActiveTapCount() const {
    std::lock_guard lock(mu_);
    return taps_.size();
}

void AnalysisManager::HandlePacket(const std::weak_ptr<AnalysisTap>& weak_tap, const media::Packet& packet) {
    auto tap = weak_tap.lock();
    if (tap == nullptr || packet.kind != media::MediaKind::Video) {
        return;
    }

    RawVideoFrame frame;
    frame.source_key = tap->stream_key;
    frame.track_id = packet.track_id;
    frame.pts = packet.pts;

    {
        std::lock_guard tap_lock(tap->mu);
        ++tap->received_video_packets;
    }

    AnalysisResult result;
    result.source_key = tap->stream_key;
    result.profile_key = tap->profile_key;
    result.pts = packet.pts;

    std::string error_message;
    if (tap->detector != nullptr && !tap->detector->Analyze(frame, &result, &error_message)) {
        std::lock_guard tap_lock(tap->mu);
        ++tap->dropped_packets;
        return;
    }
    result.profile_key = tap->profile_key;

    std::lock_guard tap_lock(tap->mu);
    ++tap->analyzed_packets;
    tap->latest_result = std::move(result);
}

}  // namespace analysis

// 파일 용도: SharedStream analysis subscriber, raw decode hub, 최신 dummy 분석 결과를 관리한다.
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
    {
        std::unique_ptr<RawVideoDecoder> decoder;
        {
            std::lock_guard tap_lock(tap->mu);
            decoder = std::move(tap->decoder);
        }
        if (decoder != nullptr) {
            decoder->Stop();
        }
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
        {
            std::unique_ptr<RawVideoDecoder> decoder;
            {
                std::lock_guard tap_lock(tap->mu);
                decoder = std::move(tap->decoder);
            }
            if (decoder != nullptr) {
                decoder->Stop();
            }
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
        .decoded_frames = tap->decoded_frames,
        .analyzed_packets = tap->analyzed_packets,
        .dropped_packets = tap->dropped_packets,
        .decoder_errors = tap->decoder_errors,
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

    RawVideoDecoder* decoder = nullptr;
    {
        std::lock_guard tap_lock(tap->mu);
        ++tap->received_video_packets;
        if (tap->decoder == nullptr) {
            RawVideoDecoder::Config config;
            config.source_key = tap->stream_key;
            config.track = ResolveVideoTrack(tap, packet);
            std::weak_ptr<AnalysisTap> frame_tap = tap;
            auto decoder_instance = CreateRawVideoDecoder(
                std::move(config),
                [frame_tap](RawVideoFrame frame) { HandleFrame(frame_tap, std::move(frame)); });

            std::string error_message;
            if (!decoder_instance->Start(&error_message)) {
                ++tap->decoder_errors;
                ++tap->dropped_packets;
                return;
            }
            tap->decoder_codec = packet.codec;
            tap->decoder_track_id = packet.track_id;
            tap->decoder = std::move(decoder_instance);
        } else if (tap->decoder_codec != packet.codec || tap->decoder_track_id != packet.track_id) {
            // 1차 skeleton은 하나의 video track decoder만 유지한다. 다중 video track은 profile/rule 설계 때 확장한다.
            ++tap->dropped_packets;
            return;
        }
        decoder = tap->decoder.get();
    }

    std::string error_message;
    if (decoder != nullptr && !decoder->PushPacket(packet, &error_message)) {
        std::lock_guard tap_lock(tap->mu);
        ++tap->decoder_errors;
        ++tap->dropped_packets;
    }
}

void AnalysisManager::HandleFrame(const std::weak_ptr<AnalysisTap>& weak_tap, RawVideoFrame frame) {
    auto tap = weak_tap.lock();
    if (tap == nullptr) {
        return;
    }

    AnalysisResult result;
    result.source_key = tap->stream_key;
    result.profile_key = tap->profile_key;
    result.pts = frame.pts;

    std::string error_message;
    if (tap->detector != nullptr && !tap->detector->Analyze(frame, &result, &error_message)) {
        std::lock_guard tap_lock(tap->mu);
        ++tap->dropped_packets;
        return;
    }
    result.profile_key = tap->profile_key;

    std::lock_guard tap_lock(tap->mu);
    ++tap->decoded_frames;
    ++tap->analyzed_packets;
    tap->latest_result = std::move(result);
}

media::TrackInfo AnalysisManager::ResolveVideoTrack(const std::shared_ptr<AnalysisTap>& tap,
                                                    const media::Packet& packet) {
    media::TrackInfo fallback;
    fallback.track_id = packet.track_id;
    fallback.kind = media::MediaKind::Video;
    fallback.codec = packet.codec;
    fallback.codec_name = media::ToString(packet.codec);
    fallback.clock_rate = 90000;

    if (tap == nullptr) {
        return fallback;
    }
    const auto stream = tap->stream.lock();
    const auto descriptor = stream != nullptr ? stream->descriptor() : std::nullopt;
    if (!descriptor.has_value()) {
        return fallback;
    }

    const media::TrackInfo* first_video_track = nullptr;
    for (const auto& track : descriptor->tracks) {
        if (track.kind != media::MediaKind::Video) {
            continue;
        }
        if (first_video_track == nullptr) {
            first_video_track = &track;
        }
        if (!packet.track_id.empty() && track.track_id == packet.track_id) {
            return track;
        }
    }
    if (first_video_track != nullptr && first_video_track->codec == packet.codec) {
        return *first_video_track;
    }
    return fallback;
}

}  // namespace analysis

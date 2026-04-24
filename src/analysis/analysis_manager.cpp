// 파일 용도: SharedStream analysis subscriber, raw decode hub, 최신 dummy 분석 결과를 관리한다.
#include "analysis/analysis_manager.h"

#include <algorithm>

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
    tap->stream = stream;
    tap->profile.target_fps = std::max(1, std::min(60, tap->profile.target_fps));
    tap->profile.max_queue_size = std::max<std::size_t>(1, std::min<std::size_t>(128, tap->profile.max_queue_size));
    tap->profile.model_input_width = std::max(32, std::min(4096, tap->profile.model_input_width));
    tap->profile.model_input_height = std::max(32, std::min(4096, tap->profile.model_input_height));
    tap->profile.max_detections = std::max(1, std::min(1000, tap->profile.max_detections));
    tap->profile.confidence_threshold = std::max(0.0F, std::min(1.0F, tap->profile.confidence_threshold));
    tap->profile.nms_threshold = std::max(0.0F, std::min(1.0F, tap->profile.nms_threshold));
    tap->profile.debug_detector_delay_ms = std::max(0, std::min(5000, tap->profile.debug_detector_delay_ms));
    tap->profile_key = BuildProfileKey(tap->profile);
    tap->detector = CreateDetector(tap->profile);

    std::string error_message;
    if (!tap->detector->Start(&error_message)) {
        return {false, error_message.empty() ? "failed to start detector" : error_message, ""};
    }

    std::weak_ptr<AnalysisTap> weak_tap = tap;
    tap->frame_worker = std::thread([weak_tap] { AnalysisWorkerLoop(weak_tap); });
    if (!stream->AddAnalysisSubscriber(tap->tap_id, [weak_tap](const media::Packet& packet) {
            HandlePacket(weak_tap, packet);
        })) {
        StopTapRuntime(tap);
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
    StopTapRuntime(tap);
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
        StopTapRuntime(tap);
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
        .detector_type = tap->profile.detector_type,
        .received_video_packets = tap->received_video_packets,
        .decoded_frames = tap->decoded_frames,
        .sampled_frames = tap->sampled_frames,
        .analyzed_packets = tap->analyzed_packets,
        .dropped_packets = tap->dropped_packets,
        .sample_dropped_frames = tap->sample_dropped_frames,
        .queue_dropped_frames = tap->queue_dropped_frames,
        .decoder_errors = tap->decoder_errors,
        .pending_frames = tap->frame_queue.size(),
        .target_fps = tap->profile.target_fps,
        .max_queue_size = tap->profile.max_queue_size,
        .debug_detector_delay_ms = tap->profile.debug_detector_delay_ms,
        .confidence_threshold = tap->profile.confidence_threshold,
        .nms_threshold = tap->profile.nms_threshold,
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

    bool should_notify = false;
    {
        std::lock_guard tap_lock(tap->mu);
        ++tap->decoded_frames;

        const auto now = std::chrono::steady_clock::now();
        const auto min_interval =
            tap->profile.target_fps > 0 ? std::chrono::nanoseconds(1000000000LL / tap->profile.target_fps)
                                        : std::chrono::nanoseconds(0);
        const bool too_soon = min_interval.count() > 0 && tap->last_sampled_at.time_since_epoch().count() > 0 &&
                              now - tap->last_sampled_at < min_interval;
        if (too_soon) {
            ++tap->sample_dropped_frames;
            ++tap->dropped_packets;
            return;
        }

        tap->last_sampled_at = now;
        ++tap->sampled_frames;
        while (tap->frame_queue.size() >= tap->profile.max_queue_size) {
            tap->frame_queue.pop_front();
            ++tap->queue_dropped_frames;
            ++tap->dropped_packets;
        }
        tap->frame_queue.push_back(std::move(frame));
        should_notify = true;
    }
    if (should_notify) {
        tap->frame_cv.notify_one();
    }
}

void AnalysisManager::AnalysisWorkerLoop(const std::weak_ptr<AnalysisTap>& weak_tap) {
    while (true) {
        auto tap = weak_tap.lock();
        if (tap == nullptr) {
            return;
        }

        RawVideoFrame frame;
        {
            std::unique_lock lock(tap->mu);
            tap->frame_cv.wait(lock, [&] { return tap->frame_worker_stop || !tap->frame_queue.empty(); });
            if (tap->frame_worker_stop) {
                return;
            }
            frame = std::move(tap->frame_queue.front());
            tap->frame_queue.pop_front();
        }

        AnalysisResult result;
        result.source_key = tap->stream_key;
        result.profile_key = tap->profile_key;
        result.pts = frame.pts;

        if (tap->profile.debug_detector_delay_ms > 0) {
            std::this_thread::sleep_for(std::chrono::milliseconds(tap->profile.debug_detector_delay_ms));
        }

        std::string error_message;
        if (tap->detector != nullptr && !tap->detector->Analyze(frame, &result, &error_message)) {
            std::lock_guard tap_lock(tap->mu);
            ++tap->dropped_packets;
            continue;
        }
        result.profile_key = tap->profile_key;

        std::lock_guard tap_lock(tap->mu);
        ++tap->analyzed_packets;
        tap->latest_result = std::move(result);
    }
}

void AnalysisManager::StopTapRuntime(const std::shared_ptr<AnalysisTap>& tap) {
    if (tap == nullptr) {
        return;
    }

    std::unique_ptr<RawVideoDecoder> decoder;
    {
        std::lock_guard tap_lock(tap->mu);
        decoder = std::move(tap->decoder);
    }
    if (decoder != nullptr) {
        decoder->Stop();
    }

    {
        std::lock_guard tap_lock(tap->mu);
        tap->frame_worker_stop = true;
        if (!tap->frame_queue.empty()) {
            tap->queue_dropped_frames += tap->frame_queue.size();
            tap->dropped_packets += tap->frame_queue.size();
            tap->frame_queue.clear();
        }
    }
    tap->frame_cv.notify_one();
    if (tap->frame_worker.joinable()) {
        tap->frame_worker.join();
    }
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

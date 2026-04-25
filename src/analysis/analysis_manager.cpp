// 파일 용도: SharedStream analysis subscriber, raw decode hub, detector 실행 결과와 최신 frame을 관리한다.
#include "analysis/analysis_manager.h"

#include <algorithm>
#include <limits>

namespace analysis {

namespace {

constexpr std::size_t kMaxResultHistory = 512;

std::int64_t AbsDiff(std::int64_t lhs, std::int64_t rhs) {
    return lhs >= rhs ? lhs - rhs : rhs - lhs;
}

int ClampEvenInt(int value, int min_value, int max_value) {
    int clamped = std::max(min_value, std::min(max_value, value));
    if ((clamped % 2) != 0) {
        --clamped;
    }
    return std::max(2, clamped);
}

std::optional<AnalysisResult> FindResultNearPtsLocked(const std::deque<AnalysisResult>& result_history,
                                                      std::int64_t pts,
                                                      std::int64_t tolerance_ns) {
    if (result_history.empty()) {
        return std::nullopt;
    }

    const std::int64_t clamped_tolerance = std::max<std::int64_t>(0, tolerance_ns);
    std::optional<AnalysisResult> best;
    std::int64_t best_diff = std::numeric_limits<std::int64_t>::max();
    for (auto it = result_history.rbegin(); it != result_history.rend(); ++it) {
        const std::int64_t diff = AbsDiff(it->pts, pts);
        if (diff > clamped_tolerance || diff >= best_diff) {
            continue;
        }
        best = *it;
        best_diff = diff;
        if (diff == 0) {
            break;
        }
    }
    return best;
}

}  // namespace

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
    const int initial_target_fps = tap->profile.target_fps;
    tap->profile.adaptive_min_fps = std::max(1, std::min(initial_target_fps, tap->profile.adaptive_min_fps));
    const int requested_adaptive_max_fps =
        tap->profile.adaptive_max_fps > 0 ? tap->profile.adaptive_max_fps : initial_target_fps;
    tap->profile.adaptive_max_fps =
        std::max(initial_target_fps,
                 std::max(tap->profile.adaptive_min_fps, std::min(60, requested_adaptive_max_fps)));
    tap->profile.adaptive_min_input_width =
        ClampEvenInt(tap->profile.adaptive_min_input_width, 32, tap->profile.model_input_width);
    tap->profile.adaptive_min_input_height =
        ClampEvenInt(tap->profile.adaptive_min_input_height, 32, tap->profile.model_input_height);
    tap->profile.adaptive_max_input_width =
        ClampEvenInt(tap->profile.adaptive_max_input_width > 0 ? tap->profile.adaptive_max_input_width
                                                               : tap->profile.model_input_width,
                     tap->profile.adaptive_min_input_width,
                     tap->profile.model_input_width);
    tap->profile.adaptive_max_input_height =
        ClampEvenInt(tap->profile.adaptive_max_input_height > 0 ? tap->profile.adaptive_max_input_height
                                                                : tap->profile.model_input_height,
                     tap->profile.adaptive_min_input_height,
                     tap->profile.model_input_height);
    tap->profile.adaptive_input_step = ClampEvenInt(tap->profile.adaptive_input_step, 16, 2048);
    tap->profile.adaptive_cooldown_ms = std::max(250, std::min(60000, tap->profile.adaptive_cooldown_ms));
    tap->profile.adaptive_high_latency_ratio =
        std::max(0.1F, std::min(10.0F, tap->profile.adaptive_high_latency_ratio));
    if (tap->profile.adaptive_low_latency_ratio <= 0.0F ||
        tap->profile.adaptive_low_latency_ratio >= tap->profile.adaptive_high_latency_ratio) {
        tap->profile.adaptive_low_latency_ratio = tap->profile.adaptive_high_latency_ratio * 0.5F;
    }
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

std::optional<AnalysisResult> AnalysisManager::ResultNearPts(const std::string& tap_id,
                                                             std::int64_t pts,
                                                             std::int64_t tolerance_ns) const {
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
    return FindResultNearPtsLocked(tap->result_history, pts, tolerance_ns);
}

std::optional<AnalysisResult> AnalysisManager::WaitResultNearPts(const std::string& tap_id,
                                                                 std::int64_t pts,
                                                                 std::int64_t tolerance_ns,
                                                                 std::chrono::milliseconds timeout) const {
    std::shared_ptr<AnalysisTap> tap;
    {
        std::lock_guard lock(mu_);
        const auto it = taps_.find(tap_id);
        if (it == taps_.end()) {
            return std::nullopt;
        }
        tap = it->second;
    }

    const auto deadline = std::chrono::steady_clock::now() + std::max(timeout, std::chrono::milliseconds(0));
    std::unique_lock tap_lock(tap->mu);
    auto result = FindResultNearPtsLocked(tap->result_history, pts, tolerance_ns);
    while (!result.has_value() && timeout.count() > 0 && !tap->frame_worker_stop) {
        if (tap->result_cv.wait_until(tap_lock, deadline) == std::cv_status::timeout) {
            break;
        }
        result = FindResultNearPtsLocked(tap->result_history, pts, tolerance_ns);
    }
    return result;
}

std::optional<RawVideoFrame> AnalysisManager::LatestFrame(const std::string& tap_id) const {
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
    return tap->latest_frame;
}

std::optional<AnalysisManager::LatestFrameResult> AnalysisManager::LatestFrameAndResult(const std::string& tap_id) const {
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
    if (!tap->latest_frame.has_value()) {
        return std::nullopt;
    }
    return LatestFrameResult{.frame = *tap->latest_frame, .result = tap->latest_result};
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
        .last_analysis_ms = tap->last_analysis_ms,
        .average_analysis_ms =
            tap->analyzed_packets > 0 ? tap->total_analysis_ms / static_cast<double>(tap->analyzed_packets) : 0.0,
        .max_analysis_ms = tap->max_analysis_ms,
        .target_fps = tap->profile.target_fps,
        .max_queue_size = tap->profile.max_queue_size,
        .model_input_width = tap->profile.model_input_width,
        .model_input_height = tap->profile.model_input_height,
        .debug_detector_delay_ms = tap->profile.debug_detector_delay_ms,
        .confidence_threshold = tap->profile.confidence_threshold,
        .nms_threshold = tap->profile.nms_threshold,
        .adaptive_tuning_enabled = tap->profile.adaptive_tuning_enabled,
        .adaptive_input_size_enabled = tap->profile.adaptive_input_size_enabled,
        .adaptive_input_size_disabled = tap->adaptive_input_size_disabled,
        .adaptive_min_fps = tap->profile.adaptive_min_fps,
        .adaptive_max_fps = tap->profile.adaptive_max_fps,
        .adaptive_min_input_width = tap->profile.adaptive_min_input_width,
        .adaptive_min_input_height = tap->profile.adaptive_min_input_height,
        .adaptive_max_input_width = tap->profile.adaptive_max_input_width,
        .adaptive_max_input_height = tap->profile.adaptive_max_input_height,
        .adaptive_downshift_count = tap->adaptive_downshift_count,
        .adaptive_upshift_count = tap->adaptive_upshift_count,
        .adaptive_state = tap->adaptive_state,
        .has_latest_frame = tap->latest_frame.has_value(),
        .latest_frame_width = tap->latest_frame.has_value() ? tap->latest_frame->width : 0,
        .latest_frame_height = tap->latest_frame.has_value() ? tap->latest_frame->height : 0,
        .latest_frame_pts = tap->latest_frame.has_value() ? tap->latest_frame->pts : 0,
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

        const auto analysis_started_at = std::chrono::steady_clock::now();
        if (tap->profile.debug_detector_delay_ms > 0) {
            std::this_thread::sleep_for(std::chrono::milliseconds(tap->profile.debug_detector_delay_ms));
        }

        std::string error_message;
        if (tap->detector != nullptr && !tap->detector->Analyze(frame, &result, &error_message)) {
            const auto analysis_finished_at = std::chrono::steady_clock::now();
            const double elapsed_ms =
                std::chrono::duration<double, std::milli>(analysis_finished_at - analysis_started_at).count();
            std::lock_guard tap_lock(tap->mu);
            tap->last_analysis_ms = elapsed_ms;
            tap->max_analysis_ms = std::max(tap->max_analysis_ms, elapsed_ms);
            DisableAdaptiveInputSizeLocked(tap);
            ++tap->dropped_packets;
            continue;
        }
        const auto analysis_finished_at = std::chrono::steady_clock::now();
        const double elapsed_ms =
            std::chrono::duration<double, std::milli>(analysis_finished_at - analysis_started_at).count();
        result.profile_key = tap->profile_key;

        std::lock_guard tap_lock(tap->mu);
        ++tap->analyzed_packets;
        tap->last_analysis_ms = elapsed_ms;
        tap->total_analysis_ms += elapsed_ms;
        tap->max_analysis_ms = std::max(tap->max_analysis_ms, elapsed_ms);
        tap->latest_frame = std::move(frame);
        tap->latest_result = std::move(result);
        tap->result_history.push_back(*tap->latest_result);
        while (tap->result_history.size() > kMaxResultHistory) {
            tap->result_history.pop_front();
        }
        UpdateAdaptiveTuningLocked(tap, elapsed_ms);
        tap->result_cv.notify_all();
    }
}

void AnalysisManager::UpdateAdaptiveTuningLocked(const std::shared_ptr<AnalysisTap>& tap, double elapsed_ms) {
    if (tap == nullptr || !tap->profile.adaptive_tuning_enabled) {
        return;
    }

    const auto now = std::chrono::steady_clock::now();
    const auto cooldown = std::chrono::milliseconds(tap->profile.adaptive_cooldown_ms);
    if (tap->last_adaptive_tuned_at.time_since_epoch().count() > 0 &&
        now - tap->last_adaptive_tuned_at < cooldown) {
        return;
    }

    const std::size_t queue_drop_delta =
        tap->queue_dropped_frames >= tap->adaptive_last_queue_dropped_frames
            ? tap->queue_dropped_frames - tap->adaptive_last_queue_dropped_frames
            : 0;
    tap->adaptive_last_queue_dropped_frames = tap->queue_dropped_frames;

    const int fps = std::max(1, tap->profile.target_fps);
    const double target_interval_ms = 1000.0 / static_cast<double>(fps);
    const bool queue_pressure = !tap->frame_queue.empty() || queue_drop_delta > 0;
    const bool overloaded =
        queue_pressure || elapsed_ms > target_interval_ms * tap->profile.adaptive_high_latency_ratio;
    const bool underloaded =
        !queue_pressure && elapsed_ms < target_interval_ms * tap->profile.adaptive_low_latency_ratio;

    auto apply_input_size = [&](int width, int height, const char* state) {
        AnalysisProfile next = tap->profile;
        next.model_input_width = ClampEvenInt(width, next.adaptive_min_input_width, next.adaptive_max_input_width);
        next.model_input_height = ClampEvenInt(height, next.adaptive_min_input_height, next.adaptive_max_input_height);
        if (next.model_input_width == tap->profile.model_input_width &&
            next.model_input_height == tap->profile.model_input_height) {
            return false;
        }
        std::string error_message;
        if (tap->detector != nullptr && !tap->detector->UpdateProfile(next, &error_message)) {
            tap->adaptive_input_size_disabled = true;
            tap->adaptive_state = "input-size-update-failed";
            return false;
        }
        tap->profile = std::move(next);
        tap->profile_key = BuildProfileKey(tap->profile);
        tap->adaptive_state = state;
        return true;
    };

    bool changed = false;
    if (overloaded) {
        tap->adaptive_underloaded_streak = 0;
        if (tap->profile.target_fps > tap->profile.adaptive_min_fps) {
            --tap->profile.target_fps;
            tap->profile_key = BuildProfileKey(tap->profile);
            tap->adaptive_state = "downshift-fps";
            changed = true;
        } else if (tap->profile.adaptive_input_size_enabled && !tap->adaptive_input_size_disabled) {
            changed = apply_input_size(tap->profile.model_input_width - tap->profile.adaptive_input_step,
                                       tap->profile.model_input_height - tap->profile.adaptive_input_step,
                                       "downshift-input");
        }
        if (changed) {
            ++tap->adaptive_downshift_count;
        }
    } else if (underloaded) {
        ++tap->adaptive_underloaded_streak;
        if (tap->adaptive_underloaded_streak >= 3) {
            if (tap->profile.adaptive_input_size_enabled && !tap->adaptive_input_size_disabled &&
                (tap->profile.model_input_width < tap->profile.adaptive_max_input_width ||
                 tap->profile.model_input_height < tap->profile.adaptive_max_input_height)) {
                changed = apply_input_size(tap->profile.model_input_width + tap->profile.adaptive_input_step,
                                           tap->profile.model_input_height + tap->profile.adaptive_input_step,
                                           "upshift-input");
            } else if (tap->profile.target_fps < tap->profile.adaptive_max_fps) {
                ++tap->profile.target_fps;
                tap->profile_key = BuildProfileKey(tap->profile);
                tap->adaptive_state = "upshift-fps";
                changed = true;
            }
            if (changed) {
                ++tap->adaptive_upshift_count;
                tap->adaptive_underloaded_streak = 0;
            }
        }
    } else {
        tap->adaptive_underloaded_streak = 0;
        tap->adaptive_state = "steady";
    }

    if (changed) {
        tap->last_adaptive_tuned_at = now;
    }
}

void AnalysisManager::DisableAdaptiveInputSizeLocked(const std::shared_ptr<AnalysisTap>& tap) {
    if (tap == nullptr || !tap->profile.adaptive_tuning_enabled || !tap->profile.adaptive_input_size_enabled ||
        tap->adaptive_input_size_disabled) {
        return;
    }
    if (tap->profile.model_input_width == tap->profile.adaptive_max_input_width &&
        tap->profile.model_input_height == tap->profile.adaptive_max_input_height) {
        return;
    }

    AnalysisProfile restored = tap->profile;
    restored.model_input_width = restored.adaptive_max_input_width;
    restored.model_input_height = restored.adaptive_max_input_height;
    std::string ignored_error;
    if (tap->detector != nullptr) {
        tap->detector->UpdateProfile(restored, &ignored_error);
    }
    tap->profile = std::move(restored);
    tap->profile_key = BuildProfileKey(tap->profile);
    tap->adaptive_input_size_disabled = true;
    tap->adaptive_state = "input-size-disabled";
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
    tap->result_cv.notify_all();
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

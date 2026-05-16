// 파일 요약: TrackStateManager의 track별 runtime state 누적/cleanup 로직을 구현한다.
// 동작 요약: stream/channel별 track map, 관측 ring buffer, Lost/Terminated 전이를 관리한다.
// 동작 요약: 기존 tracker가 만든 track id를 그대로 사용하며 새 tracking 알고리즘은 도입하지 않는다.
#include "analysis/track_state_manager.h"

#include "app_config.h"

#include <algorithm>
#include <chrono>
#include <cmath>
#include <iomanip>
#include <iostream>
#include <memory>
#include <sstream>
#include <unordered_map>
#include <utility>

namespace analysis {

namespace {

std::atomic<std::size_t> g_appearance_pending_jobs{0};

std::int64_t TimestampMs(std::int64_t timestamp_ns) {
    return timestamp_ns / 1000000LL;
}

std::int64_t SteadyNowNs() {
    return std::chrono::duration_cast<std::chrono::nanoseconds>(
               std::chrono::steady_clock::now().time_since_epoch())
        .count();
}

std::int64_t SecondsToNs(int seconds) {
    return static_cast<std::int64_t>(std::max(0, seconds)) * 1000000000LL;
}

std::int64_t MsToNs(int milliseconds) {
    return static_cast<std::int64_t>(std::max(0, milliseconds)) * 1000000LL;
}

float Clamp01(float value) {
    return std::max(0.0F, std::min(1.0F, value));
}

float Area(const RectF& rect) {
    return std::max(0.0F, rect.width) * std::max(0.0F, rect.height);
}

float IoU(const RectF& lhs, const RectF& rhs) {
    const float x1 = std::max(lhs.x, rhs.x);
    const float y1 = std::max(lhs.y, rhs.y);
    const float x2 = std::min(lhs.x + lhs.width, rhs.x + rhs.width);
    const float y2 = std::min(lhs.y + lhs.height, rhs.y + rhs.height);
    const float intersection = std::max(0.0F, x2 - x1) * std::max(0.0F, y2 - y1);
    const float union_area = Area(lhs) + Area(rhs) - intersection;
    if (union_area <= 0.0F) {
        return 0.0F;
    }
    return Clamp01(intersection / union_area);
}

float CenterDistance(const NormalizedPointF& lhs, const NormalizedPointF& rhs) {
    const float dx = lhs.x - rhs.x;
    const float dy = lhs.y - rhs.y;
    return std::sqrt(dx * dx + dy * dy);
}

double GroundDistance(const GroundPointF& lhs, const GroundPointF& rhs) {
    const double dx = lhs.x - rhs.x;
    const double dy = lhs.y - rhs.y;
    return std::sqrt(dx * dx + dy * dy);
}

NormalizedPointF BBoxBottomCenter(const RectF& bbox) {
    return NormalizedPointF{
        std::max(0.0F, std::min(1.0F, bbox.x + bbox.width * 0.5F)),
        std::max(0.0F, std::min(1.0F, bbox.y + bbox.height)),
    };
}

std::string GroundSpeedUnits(const GroundPointF& point) {
    return point.units.empty() ? std::string{"ground_per_second"} : point.units + "_per_second";
}

std::string ResolveChannelId(const std::string& stream_id, const std::string& channel_id) {
    if (!channel_id.empty()) {
        return channel_id;
    }
    return stream_id.empty() ? std::string{"default"} : stream_id;
}

TrackObservation BuildObservation(const TrackedObjectMetadata& object) {
    return TrackObservation{
        .frame_id = object.frame_id,
        .timestamp_ns = object.timestamp_ns,
        .timestamp_ms = object.timestamp_ms,
        .class_id = object.class_id,
        .class_name = object.class_name,
        .confidence = object.confidence,
        .bbox = object.bbox,
        .center = object.center,
        .ground_point = object.ground_point,
        .direction = object.direction,
    };
}

bool ContainsTrackId(const std::vector<std::uint64_t>& track_ids, std::uint64_t track_id) {
    return std::find(track_ids.begin(), track_ids.end(), track_id) != track_ids.end();
}

bool SameClass(const TrackedObjectMetadata& lhs, const TrackedObjectMetadata& rhs) {
    return lhs.class_id == rhs.class_id && lhs.class_name == rhs.class_name;
}

bool IsMovingDirection(const ObjectDirection& direction) {
    return !direction.label.empty() && direction.label != "unknown" && direction.label != "stationary";
}

bool DirectionChanged(const ObjectDirection& previous, const ObjectDirection& current) {
    return IsMovingDirection(previous) && IsMovingDirection(current) && previous.label != current.label;
}

float AssociationConfidence(const TrackRuntimeState& state,
                            const TrackedObjectMetadata& object,
                            float center_distance_threshold) {
    if (state.observations.empty()) {
        return 1.0F;
    }
    const float iou_score = IoU(state.latest_bbox, object.bbox);
    const float distance = CenterDistance(state.latest_center, object.center);
    const float center_score = center_distance_threshold > 0.0F
                                   ? std::max(0.0F, 1.0F - distance / center_distance_threshold)
                                   : 0.0F;
    return Clamp01(std::max(iou_score, center_score));
}

std::unordered_map<std::uint64_t, float> BuildOverlapRiskByTrack(
    const std::vector<TrackedObjectMetadata>& objects,
    const TrackStateManagerOptions& options) {
    std::unordered_map<std::uint64_t, float> risks;
    for (std::size_t lhs_index = 0; lhs_index < objects.size(); ++lhs_index) {
        const auto& lhs = objects[lhs_index];
        if (lhs.track_id == 0) {
            continue;
        }
        for (std::size_t rhs_index = lhs_index + 1; rhs_index < objects.size(); ++rhs_index) {
            const auto& rhs = objects[rhs_index];
            if (rhs.track_id == 0 || lhs.track_id == rhs.track_id || !SameClass(lhs, rhs)) {
                continue;
            }

            const float iou = IoU(lhs.bbox, rhs.bbox);
            const float distance = CenterDistance(lhs.center, rhs.center);
            const bool iou_risk = iou >= options.overlap_iou_risk_threshold;
            const bool center_risk =
                options.overlap_center_distance_threshold > 0.0F &&
                distance <= options.overlap_center_distance_threshold;
            if (!iou_risk && !center_risk) {
                continue;
            }

            const float center_score =
                center_risk
                    ? 1.0F - distance / std::max(0.000001F, options.overlap_center_distance_threshold)
                    : 0.0F;
            const float risk = Clamp01(std::max(iou, center_score));
            risks[lhs.track_id] = std::max(risks[lhs.track_id], risk);
            risks[rhs.track_id] = std::max(risks[rhs.track_id], risk);
        }
    }
    return risks;
}

void MarkHealthEvent(TrackHealth* health, const std::string& event_name, std::int64_t timestamp_ns) {
    if (health == nullptr) {
        return;
    }
    health->last_health_event = event_name;
    health->last_health_event_time_ns = timestamp_ns;
    health->last_health_event_time_ms = TimestampMs(timestamp_ns);
}

std::string JsonEscape(const std::string& value) {
    std::ostringstream out;
    for (const char ch : value) {
        switch (ch) {
            case '\\':
                out << "\\\\";
                break;
            case '"':
                out << "\\\"";
                break;
            case '\n':
                out << "\\n";
                break;
            case '\r':
                out << "\\r";
                break;
            case '\t':
                out << "\\t";
                break;
            default:
                out << ch;
                break;
        }
    }
    return out.str();
}

std::string BuildIssueRateLimitKey(const std::string& channel_id,
                                   std::uint64_t track_id,
                                   const std::string& issue_type) {
    return channel_id + "|track:" + std::to_string(track_id) + "|issue:" + issue_type;
}

std::string AppearanceStreamKey(const std::string& stream_id, const std::string& channel_id) {
    return (stream_id.empty() ? std::string{"default"} : stream_id) + "|" +
           (channel_id.empty() ? std::string{"default"} : channel_id);
}

int AppearanceReasonPriority(AppearanceUpdateReason reason) {
    switch (reason) {
        case AppearanceUpdateReason::LowConfidenceAssociation:
            return 40;
        case AppearanceUpdateReason::ReacquireCandidate:
            return 30;
        case AppearanceUpdateReason::TrackLost:
            return 20;
        case AppearanceUpdateReason::TrackCreated:
            return 10;
        case AppearanceUpdateReason::Periodic:
            return 0;
    }
    return 0;
}

std::string IssueMessage(const std::string& issue_type, const TrackHealth& health) {
    std::string summary;
    if (issue_type == "unstable-track") {
        summary = "Track is unstable; review association, overlap, missed-frame, and direction-change signals.";
    } else if (issue_type == "overlap-risk") {
        summary = "Track overlap risk is high; check close-object separation, camera angle, or zone geometry.";
    } else if (issue_type == "missed-frame-spike") {
        summary = "Track missed-frame count jumped; verify source frame continuity and tracker sampling.";
    } else if (issue_type == "direction-change-spike") {
        summary = "Track direction changed repeatedly; verify association stability before trusting scenario timing.";
    } else if (issue_type == "low-association-confidence") {
        summary = "Track association confidence dropped; treat this scenario candidate as lower quality.";
    } else if (issue_type == "reacquired") {
        summary = "Track was reacquired after a short loss; confirm the same object remained in view.";
    } else if (issue_type == "lost") {
        summary = "Track was lost; scenario dwell or occupancy counts may reset until it is observed again.";
    } else {
        summary = "Track health issue requires review.";
    }
    std::ostringstream out;
    out << summary
        << " Metrics: association " << std::fixed << std::setprecision(2)
        << health.association_confidence
        << ", missed frames " << health.missed_frame_count
        << ", overlap risk " << health.overlap_risk
        << ", direction changes " << health.direction_change_count
        << ", lost " << health.lost_count
        << ", reacquired " << health.reacquired_count << ".";
    return out.str();
}

AppearanceExtractionInput BuildAppearanceInput(const TrackRuntimeState& state,
                                               const TrackedObjectMetadata* object,
                                               const RawVideoFrame* appearance_frame,
                                               AppearanceUpdateReason reason,
                                               std::int64_t timestamp_ns) {
    AppearanceExtractionInput input;
    input.stream_id = object != nullptr && !object->stream_id.empty() ? object->stream_id : state.stream_id;
    input.channel_id = object != nullptr && !object->channel_id.empty() ? object->channel_id : state.channel_id;
    input.track_id = object != nullptr ? object->track_id : state.track_id;
    input.frame_id = object != nullptr ? object->frame_id : 0;
    input.timestamp_ns = object != nullptr && object->timestamp_ns > 0 ? object->timestamp_ns : timestamp_ns;
    input.timestamp_ms = TimestampMs(input.timestamp_ns);
    input.class_id = object != nullptr ? object->class_id : state.class_id;
    input.class_name = object != nullptr ? object->class_name : state.class_name;
    input.confidence = object != nullptr ? object->confidence : state.confidence;
    input.bbox = object != nullptr ? object->bbox : state.latest_bbox;
    input.center = object != nullptr ? object->center : state.latest_center;
    input.direction = object != nullptr ? object->direction : state.latest_direction;
    input.reason = reason;
    if (object == nullptr && !state.observations.empty()) {
        input.frame_id = state.observations.back().frame_id;
    }
    if (appearance_frame != nullptr && object != nullptr &&
        appearance_frame->format == PixelFormat::RGB && appearance_frame->width > 0 &&
        appearance_frame->height > 0 && !appearance_frame->data.empty()) {
        const int x1 = std::max(0, std::min(appearance_frame->width - 1,
                                           static_cast<int>(std::floor(object->bbox.x * appearance_frame->width))));
        const int y1 = std::max(0, std::min(appearance_frame->height - 1,
                                           static_cast<int>(std::floor(object->bbox.y * appearance_frame->height))));
        const int x2 = std::max(x1 + 1,
                                std::min(appearance_frame->width,
                                         static_cast<int>(std::ceil((object->bbox.x + object->bbox.width) *
                                                                    appearance_frame->width))));
        const int y2 = std::max(y1 + 1,
                                std::min(appearance_frame->height,
                                         static_cast<int>(std::ceil((object->bbox.y + object->bbox.height) *
                                                                    appearance_frame->height))));
        input.crop_width = x2 - x1;
        input.crop_height = y2 - y1;
        input.crop_rgb.resize(static_cast<std::size_t>(input.crop_width) *
                              static_cast<std::size_t>(input.crop_height) * 3U);
        for (int y = 0; y < input.crop_height; ++y) {
            const std::size_t src_offset =
                static_cast<std::size_t>(((y1 + y) * appearance_frame->width + x1) * 3);
            const std::size_t dst_offset = static_cast<std::size_t>(y * input.crop_width * 3);
            const std::size_t bytes = static_cast<std::size_t>(input.crop_width * 3);
            if (src_offset + bytes <= appearance_frame->data.size() &&
                dst_offset + bytes <= input.crop_rgb.size()) {
                std::copy_n(appearance_frame->data.data() + src_offset,
                            bytes,
                            input.crop_rgb.data() + dst_offset);
            }
        }
    }
    return input;
}

}  // namespace

const char* ToString(TrackLifecycleState state) {
    switch (state) {
        case TrackLifecycleState::Active:
            return "active";
        case TrackLifecycleState::Lost:
            return "lost";
        case TrackLifecycleState::Reacquired:
            return "reacquired";
        case TrackLifecycleState::Terminated:
            return "terminated";
    }
    return "unknown";
}

TrackStateManager::TrackStateManager(
    TrackStateManagerOptions options,
    std::shared_ptr<IAppearanceExtractor> appearance_extractor)
    : options_(options),
      appearance_extractor_(appearance_extractor != nullptr
                                ? std::move(appearance_extractor)
                                : std::make_shared<NoOpAppearanceExtractor>()) {
    options_.max_observation_history = std::max<std::size_t>(1, options_.max_observation_history);
    options_.max_trajectory_points = std::max<std::size_t>(1, options_.max_trajectory_points);
    options_.max_active_tracks_per_channel =
        std::max<std::size_t>(1, options_.max_active_tracks_per_channel);
    options_.max_tracks_per_channel = std::max<std::size_t>(1, options_.max_tracks_per_channel);
    options_.max_tracks_per_channel =
        std::max(options_.max_tracks_per_channel, options_.max_active_tracks_per_channel);
    options_.lost_timeout_ns = std::max<std::int64_t>(0, options_.lost_timeout_ns);
    options_.terminated_timeout_ns = std::max(options_.lost_timeout_ns, options_.terminated_timeout_ns);
    options_.terminated_retention_ns = std::max<std::int64_t>(0, options_.terminated_retention_ns);
    options_.trajectory_downsample_interval_ns =
        std::max<std::int64_t>(0, options_.trajectory_downsample_interval_ns);
    options_.cleanup_interval_ns = std::max<std::int64_t>(0, options_.cleanup_interval_ns);
    options_.low_association_confidence_threshold =
        Clamp01(options_.low_association_confidence_threshold);
    options_.overlap_iou_risk_threshold = Clamp01(options_.overlap_iou_risk_threshold);
    options_.overlap_center_distance_threshold =
        std::max(0.0F, std::min(1.0F, options_.overlap_center_distance_threshold));
    options_.missed_frame_unstable_threshold =
        std::max<std::uint32_t>(1, options_.missed_frame_unstable_threshold);
    options_.direction_change_unstable_threshold =
        std::max<std::uint32_t>(1, options_.direction_change_unstable_threshold);
    options_.tracking_issue_max_entries =
        std::max<std::size_t>(1, options_.tracking_issue_max_entries);
    options_.tracking_issue_rate_limit_ns =
        std::max<std::int64_t>(0, options_.tracking_issue_rate_limit_ns);
    options_.tracking_issue_overlap_risk_threshold =
        Clamp01(options_.tracking_issue_overlap_risk_threshold);
    options_.tracking_issue_missed_frame_jump_threshold =
        std::max<std::uint32_t>(1, options_.tracking_issue_missed_frame_jump_threshold);
    options_.tracking_issue_direction_change_jump_threshold =
        std::max<std::uint32_t>(1, options_.tracking_issue_direction_change_jump_threshold);
    options_.appearance_update_policy.max_queue_size =
        std::max<std::size_t>(1, options_.appearance_update_policy.max_queue_size);
    options_.appearance_update_policy.global_max_queue_size =
        std::max<std::size_t>(1, options_.appearance_update_policy.global_max_queue_size);
    options_.appearance_update_policy.per_stream_rate_limit_ms =
        std::max(0, options_.appearance_update_policy.per_stream_rate_limit_ms);
    options_.appearance_update_policy.max_job_age_ms =
        std::max(0, options_.appearance_update_policy.max_job_age_ms);
    StartAppearanceWorker();
}

TrackStateManager::~TrackStateManager() {
    StopAppearanceWorker();
}

TrackStateManager::TrackStateManager(TrackStateManager&& other) noexcept {
    *this = std::move(other);
}

TrackStateManager& TrackStateManager::operator=(TrackStateManager&& other) noexcept {
    if (this == &other) {
        return *this;
    }
    StopAppearanceWorker();
    other.StopAppearanceWorker();
    options_ = other.options_;
    appearance_extractor_ = std::move(other.appearance_extractor_);
    tracks_by_channel_ = std::move(other.tracks_by_channel_);
    tracking_issues_ = std::move(other.tracking_issues_);
    last_tracking_issue_time_by_key_ = std::move(other.last_tracking_issue_time_by_key_);
    last_appearance_enqueue_time_by_stream_ =
        std::move(other.last_appearance_enqueue_time_by_stream_);
    {
        std::lock_guard other_lock(other.appearance_mu_);
        appearance_jobs_ = std::move(other.appearance_jobs_);
        appearance_results_ = std::move(other.appearance_results_);
        other.appearance_worker_stop_ = false;
    }
    last_cleanup_time_ns_ = other.last_cleanup_time_ns_;
    cleanup_runs_ = other.cleanup_runs_;
    tracks_removed_by_cleanup_ = other.tracks_removed_by_cleanup_;
    tracking_issue_total_count_ = other.tracking_issue_total_count_;
    tracking_issue_rate_limited_count_ = other.tracking_issue_rate_limited_count_;
    appearance_queued_count_.store(other.appearance_queued_count_.load());
    appearance_queue_full_drop_count_.store(other.appearance_queue_full_drop_count_.load());
    appearance_global_queue_drop_count_.store(other.appearance_global_queue_drop_count_.load());
    appearance_rate_limited_count_.store(other.appearance_rate_limited_count_.load());
    appearance_stale_drop_count_.store(other.appearance_stale_drop_count_.load());
    appearance_missing_crop_drop_count_.store(other.appearance_missing_crop_drop_count_.load());
    appearance_completed_async_count_.store(other.appearance_completed_async_count_.load());
    appearance_total_queue_latency_ms_.store(other.appearance_total_queue_latency_ms_.load());
    appearance_last_queue_latency_micros_.store(other.appearance_last_queue_latency_micros_.load());
    appearance_max_queue_latency_micros_.store(other.appearance_max_queue_latency_micros_.load());
    metric_channel_count_.store(other.metric_channel_count_.load());
    metric_total_tracks_.store(other.metric_total_tracks_.load());
    metric_active_tracks_.store(other.metric_active_tracks_.load());
    metric_lost_tracks_.store(other.metric_lost_tracks_.load());
    metric_reacquired_tracks_.store(other.metric_reacquired_tracks_.load());
    metric_terminated_tracks_.store(other.metric_terminated_tracks_.load());
    metric_total_observations_.store(other.metric_total_observations_.load());
    metric_total_trajectory_points_.store(other.metric_total_trajectory_points_.load());
    metric_appearance_profile_count_.store(other.metric_appearance_profile_count_.load());
    metric_cleanup_runs_.store(other.metric_cleanup_runs_.load());
    metric_tracks_removed_by_cleanup_.store(other.metric_tracks_removed_by_cleanup_.load());
    metric_last_cleanup_time_ns_.store(other.metric_last_cleanup_time_ns_.load());
    appearance_worker_stop_ = false;
    StartAppearanceWorker();
    return *this;
}

void TrackStateManager::Update(const std::string& stream_id,
                               const std::string& channel_id,
                               const std::vector<TrackedObjectMetadata>& objects,
                               std::int64_t timestamp_ns,
                               const RawVideoFrame* appearance_frame) {
    DrainAppearanceResults();
    const std::string resolved_channel_id = ResolveChannelId(stream_id, channel_id);
    auto& tracks = tracks_by_channel_[resolved_channel_id];
    std::vector<std::uint64_t> observed_track_ids;
    observed_track_ids.reserve(objects.size());
    const auto overlap_risks = BuildOverlapRiskByTrack(objects, options_);

    for (const auto& object : objects) {
        if (object.track_id == 0) {
            continue;
        }

        if (tracks.find(object.track_id) == tracks.end() && !CanCreateTrack(tracks)) {
            EnforceChannelLimit(&tracks);
            if (!CanCreateTrack(tracks)) {
                continue;
            }
        }

        const std::int64_t observed_timestamp_ns =
            object.timestamp_ns > 0 ? object.timestamp_ns : timestamp_ns;
        TrackRuntimeState& state = tracks[object.track_id];
        const bool is_new_track = state.track_id == 0;
        const bool was_lost_or_terminated =
            state.lifecycle_state == TrackLifecycleState::Lost ||
            state.lifecycle_state == TrackLifecycleState::Terminated;
        const bool tracker_reacquired = object.track_state == "reacquired";
        if (is_new_track) {
            state.stream_id = object.stream_id.empty() ? stream_id : object.stream_id;
            state.channel_id = resolved_channel_id;
            state.track_id = object.track_id;
            state.first_seen_time_ns = observed_timestamp_ns;
            state.first_seen_time_ms = TimestampMs(observed_timestamp_ns);
        }
        const TrackHealth previous_health = state.health;
        const auto overlap_it = overlap_risks.find(object.track_id);
        RefreshHealth(&state,
                      object,
                      overlap_it == overlap_risks.end() ? 0.0F : overlap_it->second,
                      observed_timestamp_ns);

        state.class_id = object.class_id;
        state.class_name = object.class_name;
        state.confidence = object.confidence;
        UpdateSpeed(&state, object, observed_timestamp_ns);
        state.latest_bbox = object.bbox;
        state.latest_center = object.center;
        state.latest_foot_point = BBoxBottomCenter(object.bbox);
        state.latest_ground_point = object.ground_point;
        state.latest_direction = object.direction;
        state.last_seen_time_ns = observed_timestamp_ns;
        state.last_seen_time_ms = TimestampMs(observed_timestamp_ns);
        state.lost_since_time_ns = 0;
        state.lost_since_time_ms = 0;
        state.lifecycle_state =
            !is_new_track && (was_lost_or_terminated || tracker_reacquired)
                ? TrackLifecycleState::Reacquired
                : TrackLifecycleState::Active;
        MaybeRecordObservedTrackingIssues(&state, previous_health, object, observed_timestamp_ns);

        state.observations.push_back(BuildObservation(object));
        while (state.observations.size() > options_.max_observation_history) {
            state.observations.pop_front();
        }
        AppendTrajectoryPoint(&state, object, observed_timestamp_ns);
        if (options_.appearance_update_policy.enabled) {
            if (is_new_track) {
                MaybeUpdateAppearance(&state,
                                      &object,
                                      appearance_frame,
                                      AppearanceUpdateReason::TrackCreated,
                                      observed_timestamp_ns);
            } else if (state.lifecycle_state == TrackLifecycleState::Reacquired) {
                MaybeUpdateAppearance(&state,
                                      &object,
                                      appearance_frame,
                                      AppearanceUpdateReason::ReacquireCandidate,
                                      observed_timestamp_ns);
            } else if (state.health.association_confidence <
                       options_.low_association_confidence_threshold) {
                MaybeUpdateAppearance(&state,
                                      &object,
                                      appearance_frame,
                                      AppearanceUpdateReason::LowConfidenceAssociation,
                                      observed_timestamp_ns);
            } else {
                MaybeUpdateAppearance(&state,
                                      &object,
                                      appearance_frame,
                                      AppearanceUpdateReason::Periodic,
                                      observed_timestamp_ns);
            }
        }
        observed_track_ids.push_back(object.track_id);
    }

    AdvanceChannelState(resolved_channel_id, timestamp_ns, observed_track_ids);
    auto channel_it = tracks_by_channel_.find(resolved_channel_id);
    if (channel_it != tracks_by_channel_.end()) {
        if (ShouldRunCleanup(timestamp_ns)) {
            tracks_removed_by_cleanup_ += CleanupTerminatedTracks(&channel_it->second, timestamp_ns);
            ++cleanup_runs_;
            last_cleanup_time_ns_ = timestamp_ns;
        }
        EnforceChannelLimit(&channel_it->second);
        if (channel_it->second.empty()) {
            tracks_by_channel_.erase(channel_it);
        }
    }
    DrainAppearanceResults();
    RefreshMetrics();
}

std::vector<TrackRuntimeState> TrackStateManager::Snapshot(const std::string& channel_id) const {
    std::vector<TrackRuntimeState> snapshot;
    if (!channel_id.empty()) {
        const auto it = tracks_by_channel_.find(channel_id);
        if (it == tracks_by_channel_.end()) {
            return snapshot;
        }
        snapshot.reserve(it->second.size());
        for (const auto& [_, state] : it->second) {
            snapshot.push_back(state);
        }
        return snapshot;
    }

    for (const auto& [channel_key, tracks] : tracks_by_channel_) {
        (void)channel_key;
        snapshot.reserve(snapshot.size() + tracks.size());
        for (const auto& [track_id, state] : tracks) {
            (void)track_id;
            snapshot.push_back(state);
        }
    }
    return snapshot;
}

std::size_t TrackStateManager::TrackCount(const std::string& channel_id) const {
    if (!channel_id.empty()) {
        const auto it = tracks_by_channel_.find(channel_id);
        return it == tracks_by_channel_.end() ? 0 : it->second.size();
    }

    std::size_t count = 0;
    for (const auto& [channel_key, tracks] : tracks_by_channel_) {
        (void)channel_key;
        count += tracks.size();
    }
    return count;
}

TrackStateMetrics TrackStateManager::Metrics() const {
    TrackStateMetrics metrics;
    metrics.channel_count = metric_channel_count_.load();
    metrics.total_tracks = metric_total_tracks_.load();
    metrics.active_tracks = metric_active_tracks_.load();
    metrics.lost_tracks = metric_lost_tracks_.load();
    metrics.reacquired_tracks = metric_reacquired_tracks_.load();
    metrics.terminated_tracks = metric_terminated_tracks_.load();
    metrics.total_observations = metric_total_observations_.load();
    metrics.total_trajectory_points = metric_total_trajectory_points_.load();
    metrics.appearance_profile_count = metric_appearance_profile_count_.load();
    metrics.appearance_extractor_stats = BuildAppearanceStats();
    metrics.max_active_tracks_per_channel = options_.max_active_tracks_per_channel;
    metrics.max_tracks_per_channel = options_.max_tracks_per_channel;
    metrics.max_observation_history = options_.max_observation_history;
    metrics.max_trajectory_points_per_track = options_.max_trajectory_points;
    metrics.cleanup_runs = metric_cleanup_runs_.load();
    metrics.tracks_removed_by_cleanup = metric_tracks_removed_by_cleanup_.load();
    metrics.last_cleanup_time_ns = metric_last_cleanup_time_ns_.load();
    metrics.last_cleanup_time_ms = TimestampMs(metrics.last_cleanup_time_ns);
    return metrics;
}

TrackingIssueReport TrackStateManager::TrackingIssueSnapshot(const std::string& channel_id) const {
    TrackingIssueReport report;
    report.enabled = options_.tracking_issue_report_enabled;
    report.total_issues = tracking_issue_total_count_;
    report.retained_issues = tracking_issues_.size();
    report.rate_limited_count = tracking_issue_rate_limited_count_;
    report.max_entries = options_.tracking_issue_max_entries;
    std::unordered_map<std::string, std::size_t> channel_index;
    for (const auto& issue : tracking_issues_) {
        if (!channel_id.empty() && issue.channel_id != channel_id) {
            continue;
        }
        report.issues.push_back(issue);
        const std::string key = issue.stream_id + "|" + issue.channel_id;
        auto index_it = channel_index.find(key);
        if (index_it == channel_index.end()) {
            TrackingIssueChannelSummary summary;
            summary.stream_id = issue.stream_id;
            summary.channel_id = issue.channel_id;
            report.channels.push_back(std::move(summary));
            index_it = channel_index.emplace(key, report.channels.size() - 1).first;
        }
        auto& summary = report.channels[index_it->second];
        ++summary.total_issues;
        if (issue.issue_type == "unstable-track") {
            ++summary.unstable_issues;
        } else if (issue.issue_type == "overlap-risk") {
            ++summary.overlap_risk_issues;
        } else if (issue.issue_type == "missed-frame-spike") {
            ++summary.missed_frame_issues;
        } else if (issue.issue_type == "direction-change-spike") {
            ++summary.direction_change_issues;
        } else if (issue.issue_type == "reacquired") {
            ++summary.reacquired_issues;
        } else if (issue.issue_type == "lost") {
            ++summary.lost_issues;
        }
    }
    report.retained_issues = report.issues.size();
    return report;
}

void TrackStateManager::ClearTrackingIssueReport() {
    tracking_issues_.clear();
    last_tracking_issue_time_by_key_.clear();
    tracking_issue_total_count_ = 0;
    tracking_issue_rate_limited_count_ = 0;
}

void TrackStateManager::Reset() {
    tracks_by_channel_.clear();
    ClearTrackingIssueReport();
    {
        std::lock_guard lock(appearance_mu_);
        const std::size_t dropped = appearance_jobs_.size();
        if (dropped > 0) {
            const std::size_t pending = g_appearance_pending_jobs.load();
            g_appearance_pending_jobs.store(pending > dropped ? pending - dropped : 0);
        }
        appearance_jobs_.clear();
        appearance_results_.clear();
    }
    last_appearance_enqueue_time_by_stream_.clear();
    appearance_queued_count_.store(0);
    appearance_queue_full_drop_count_.store(0);
    appearance_global_queue_drop_count_.store(0);
    appearance_rate_limited_count_.store(0);
    appearance_stale_drop_count_.store(0);
    appearance_missing_crop_drop_count_.store(0);
    appearance_completed_async_count_.store(0);
    appearance_total_queue_latency_ms_.store(0);
    appearance_last_queue_latency_micros_.store(0);
    appearance_max_queue_latency_micros_.store(0);
    last_cleanup_time_ns_ = 0;
    cleanup_runs_ = 0;
    tracks_removed_by_cleanup_ = 0;
    RefreshMetrics();
}

void TrackStateManager::RefreshHealth(TrackRuntimeState* state,
                                      const TrackedObjectMetadata& object,
                                      float overlap_risk,
                                      std::int64_t observed_timestamp_ns) {
    if (state == nullptr) {
        return;
    }

    TrackHealth& health = state->health;
    const bool was_inactive = state->lifecycle_state == TrackLifecycleState::Lost ||
                              state->lifecycle_state == TrackLifecycleState::Terminated ||
                              (!state->observations.empty() && object.track_state == "reacquired");
    health.association_confidence = object.association_confidence >= 0.0F
                                        ? Clamp01(object.association_confidence)
                                        : AssociationConfidence(*state,
                                                                object,
                                                                options_.overlap_center_distance_threshold);
    health.overlap_risk = Clamp01(overlap_risk);
    if (DirectionChanged(state->latest_direction, object.direction)) {
        ++health.direction_change_count;
    } else if (health.direction_change_count > 0 &&
               health.association_confidence >= options_.low_association_confidence_threshold &&
               health.overlap_risk <= 0.0F) {
        --health.direction_change_count;
    }

    if (was_inactive) {
        ++health.reacquired_count;
        MarkHealthEvent(&health, "reacquired", observed_timestamp_ns);
    }

    health.missed_frame_count = 0;
    health.is_unstable =
        health.association_confidence < options_.low_association_confidence_threshold ||
        health.overlap_risk > 0.0F ||
        health.direction_change_count >= options_.direction_change_unstable_threshold;
    if (!health.is_unstable) {
        health.last_stable_time_ns = observed_timestamp_ns;
        health.last_stable_time_ms = TimestampMs(observed_timestamp_ns);
    }
}

void TrackStateManager::MaybeRecordObservedTrackingIssues(TrackRuntimeState* state,
                                                          const TrackHealth& previous_health,
                                                          const TrackedObjectMetadata& object,
                                                          std::int64_t observed_timestamp_ns) {
    if (state == nullptr || !options_.tracking_issue_report_enabled) {
        return;
    }
    const TrackHealth& health = state->health;
    if (!previous_health.is_unstable && health.is_unstable) {
        RecordTrackingIssue(*state,
                            "unstable-track",
                            "warning",
                            IssueMessage("unstable-track", health),
                            observed_timestamp_ns);
    }
    if (health.overlap_risk >= options_.tracking_issue_overlap_risk_threshold &&
        previous_health.overlap_risk < options_.tracking_issue_overlap_risk_threshold) {
        RecordTrackingIssue(*state,
                            "overlap-risk",
                            "warning",
                            IssueMessage("overlap-risk", health),
                            observed_timestamp_ns);
    }
    const std::uint32_t direction_delta =
        health.direction_change_count > previous_health.direction_change_count
            ? health.direction_change_count - previous_health.direction_change_count
            : 0;
    if (direction_delta >= options_.tracking_issue_direction_change_jump_threshold ||
        (previous_health.direction_change_count < options_.direction_change_unstable_threshold &&
         health.direction_change_count >= options_.direction_change_unstable_threshold)) {
        RecordTrackingIssue(*state,
                            "direction-change-spike",
                            "warning",
                            IssueMessage("direction-change-spike", health),
                            observed_timestamp_ns);
    }
    if (previous_health.association_confidence >= options_.low_association_confidence_threshold &&
        health.association_confidence < options_.low_association_confidence_threshold &&
        !state->observations.empty()) {
        RecordTrackingIssue(*state,
                            "low-association-confidence",
                            "info",
                            IssueMessage("low-association-confidence", health),
                            observed_timestamp_ns);
    }
    if (health.reacquired_count > previous_health.reacquired_count) {
        RecordTrackingIssue(*state,
                            "reacquired",
                            "info",
                            IssueMessage("reacquired", health),
                            observed_timestamp_ns);
    }
    (void)object;
}

void TrackStateManager::MaybeRecordMissedTrackingIssues(TrackRuntimeState* state,
                                                        const TrackHealth& previous_health,
                                                        std::int64_t timestamp_ns) {
    if (state == nullptr || !options_.tracking_issue_report_enabled) {
        return;
    }
    const TrackHealth& health = state->health;
    const std::uint32_t missed_delta =
        health.missed_frame_count > previous_health.missed_frame_count
            ? health.missed_frame_count - previous_health.missed_frame_count
            : 0;
    if (missed_delta >= options_.tracking_issue_missed_frame_jump_threshold ||
        (previous_health.missed_frame_count < options_.missed_frame_unstable_threshold &&
         health.missed_frame_count >= options_.missed_frame_unstable_threshold)) {
        RecordTrackingIssue(*state,
                            "missed-frame-spike",
                            "warning",
                            IssueMessage("missed-frame-spike", health),
                            timestamp_ns);
    }
    if (!previous_health.is_unstable && health.is_unstable) {
        RecordTrackingIssue(*state,
                            "unstable-track",
                            "warning",
                            IssueMessage("unstable-track", health),
                            timestamp_ns);
    }
}

void TrackStateManager::RecordTrackingIssue(const TrackRuntimeState& state,
                                            std::string issue_type,
                                            std::string severity,
                                            std::string message,
                                            std::int64_t timestamp_ns) {
    if (!options_.tracking_issue_report_enabled || state.track_id == 0) {
        return;
    }
    const std::string key = BuildIssueRateLimitKey(state.channel_id, state.track_id, issue_type);
    const auto rate_it = last_tracking_issue_time_by_key_.find(key);
    if (rate_it != last_tracking_issue_time_by_key_.end() &&
        options_.tracking_issue_rate_limit_ns > 0 &&
        timestamp_ns < rate_it->second + options_.tracking_issue_rate_limit_ns) {
        ++tracking_issue_rate_limited_count_;
        return;
    }
    last_tracking_issue_time_by_key_[key] = timestamp_ns;

    TrackingIssueRecord record;
    record.stream_id = state.stream_id;
    record.channel_id = state.channel_id;
    record.track_id = state.track_id;
    record.class_id = state.class_id;
    record.class_name = state.class_name;
    record.timestamp_ns = timestamp_ns;
    record.timestamp_ms = TimestampMs(timestamp_ns);
    record.issue_type = std::move(issue_type);
    record.severity = std::move(severity);
    record.message = std::move(message);
    record.bbox = state.latest_bbox;
    record.center = state.latest_center;
    record.health = MakeTrackHealthSnapshot(state.health);
    tracking_issues_.push_back(record);
    ++tracking_issue_total_count_;
    while (tracking_issues_.size() > options_.tracking_issue_max_entries) {
        tracking_issues_.pop_front();
    }
    if (options_.tracking_issue_log_enabled) {
        std::cerr << "[tracking-issue] stream=" << record.stream_id
                  << " channel=" << record.channel_id
                  << " track=" << record.track_id
                  << " type=" << record.issue_type
                  << " severity=" << record.severity
                  << " association=" << record.health.association_confidence
                  << " missed=" << record.health.missed_frame_count
                  << " overlap=" << record.health.overlap_risk
                  << " directionChanges=" << record.health.direction_change_count << "\n";
    }
}

void TrackStateManager::MaybeUpdateAppearance(TrackRuntimeState* state,
                                              const TrackedObjectMetadata* object,
                                              const RawVideoFrame* appearance_frame,
                                              AppearanceUpdateReason reason,
                                              std::int64_t timestamp_ns) {
    if (state == nullptr || appearance_extractor_ == nullptr ||
        !ShouldUpdateAppearance(*state, reason, timestamp_ns)) {
        return;
    }

    const AppearanceExtractionInput input =
        BuildAppearanceInput(*state, object, appearance_frame, reason, timestamp_ns);
    if (options_.appearance_update_policy.async_enabled) {
        EnqueueAppearanceJob(*state, input, reason, timestamp_ns);
        return;
    }

    auto updated = appearance_extractor_->Extract(
        input, state->appearance_profile.has_value() ? &(*state->appearance_profile) : nullptr);
    if (!updated.has_value()) {
        return;
    }

    if (updated->last_updated_time_ns <= 0) {
        updated->last_updated_time_ns = input.timestamp_ns;
        updated->last_updated_time_ms = TimestampMs(input.timestamp_ns);
    }
    if (updated->sample_count == 0) {
        updated->sample_count =
            state->appearance_profile.has_value() ? state->appearance_profile->sample_count + 1 : 1;
    }
    state->appearance_profile = std::move(updated);
}

void TrackStateManager::EnqueueAppearanceJob(const TrackRuntimeState& state,
                                             AppearanceExtractionInput input,
                                             AppearanceUpdateReason reason,
                                             std::int64_t timestamp_ns) {
    if (appearance_extractor_ == nullptr || !appearance_extractor_->Enabled()) {
        return;
    }
    const auto& policy = options_.appearance_update_policy;
    if (input.crop_rgb.empty()) {
        RecordAppearanceDrop("missing-crop");
        return;
    }

    const std::string stream_key = AppearanceStreamKey(input.stream_id, input.channel_id);
    const std::int64_t rate_limit_ns = MsToNs(policy.per_stream_rate_limit_ms);
    if (rate_limit_ns > 0) {
        const auto rate_it = last_appearance_enqueue_time_by_stream_.find(stream_key);
        if (rate_it != last_appearance_enqueue_time_by_stream_.end() &&
            timestamp_ns < rate_it->second + rate_limit_ns) {
            RecordAppearanceDrop("rate-limited");
            return;
        }
    }

    std::size_t observed_global = g_appearance_pending_jobs.load();
    while (observed_global < policy.global_max_queue_size) {
        if (g_appearance_pending_jobs.compare_exchange_weak(observed_global, observed_global + 1)) {
            break;
        }
    }
    if (observed_global >= policy.global_max_queue_size) {
        RecordAppearanceDrop("global-queue-full");
        return;
    }

    AppearanceJob job;
    job.input = std::move(input);
    if (state.appearance_profile.has_value()) {
        job.previous_profile = *state.appearance_profile;
        job.has_previous_profile = true;
    }
    job.enqueued_time_ns = SteadyNowNs();
    job.priority = AppearanceReasonPriority(reason);

    bool queued = false;
    {
        std::lock_guard lock(appearance_mu_);
        DropExpiredAppearanceJobsLocked(job.enqueued_time_ns);
        if (appearance_jobs_.size() >= policy.max_queue_size) {
            auto drop_it = std::min_element(
                appearance_jobs_.begin(),
                appearance_jobs_.end(),
                [](const AppearanceJob& lhs, const AppearanceJob& rhs) {
                    return lhs.priority < rhs.priority;
                });
            if (drop_it != appearance_jobs_.end() && drop_it->priority <= job.priority) {
                appearance_jobs_.erase(drop_it);
                g_appearance_pending_jobs.fetch_sub(1);
                RecordAppearanceDrop("queue-full");
            } else {
                RecordAppearanceDrop("queue-full");
                g_appearance_pending_jobs.fetch_sub(1);
                return;
            }
        }
        appearance_jobs_.push_back(std::move(job));
        queued = true;
    }
    if (queued) {
        last_appearance_enqueue_time_by_stream_[stream_key] = timestamp_ns;
        ++appearance_queued_count_;
        appearance_cv_.notify_one();
    }
}

void TrackStateManager::DrainAppearanceResults() {
    std::deque<AppearanceResult> results;
    {
        std::lock_guard lock(appearance_mu_);
        results.swap(appearance_results_);
    }
    for (auto& result : results) {
        auto channel_it = tracks_by_channel_.find(result.channel_id);
        if (channel_it == tracks_by_channel_.end()) {
            continue;
        }
        auto track_it = channel_it->second.find(result.track_id);
        if (track_it == channel_it->second.end()) {
            continue;
        }
        track_it->second.appearance_profile = std::move(result.profile);
        const auto latency_us = static_cast<std::uint64_t>(std::max(0.0, result.queue_latency_ms) * 1000.0);
        appearance_last_queue_latency_micros_.store(latency_us);
        std::uint64_t previous_max = appearance_max_queue_latency_micros_.load();
        while (latency_us > previous_max &&
               !appearance_max_queue_latency_micros_.compare_exchange_weak(previous_max, latency_us)) {
        }
        appearance_total_queue_latency_ms_.fetch_add(
            static_cast<std::uint64_t>(std::max(0.0, result.queue_latency_ms)));
        ++appearance_completed_async_count_;
    }
}

void TrackStateManager::StartAppearanceWorker() {
    const auto& policy = options_.appearance_update_policy;
    if (!policy.enabled || !policy.async_enabled || appearance_extractor_ == nullptr ||
        !appearance_extractor_->Enabled() || appearance_worker_.joinable()) {
        return;
    }
    appearance_worker_stop_ = false;
    appearance_worker_ = std::thread([this] { AppearanceWorkerLoop(); });
}

void TrackStateManager::StopAppearanceWorker() {
    {
        std::lock_guard lock(appearance_mu_);
        appearance_worker_stop_ = true;
    }
    appearance_cv_.notify_all();
    if (appearance_worker_.joinable()) {
        appearance_worker_.join();
    }
    std::lock_guard lock(appearance_mu_);
    const std::size_t dropped = appearance_jobs_.size();
    if (dropped > 0) {
        const std::size_t pending = g_appearance_pending_jobs.load();
        g_appearance_pending_jobs.store(pending > dropped ? pending - dropped : 0);
        appearance_jobs_.clear();
    }
    appearance_results_.clear();
    appearance_worker_stop_ = false;
}

void TrackStateManager::AppearanceWorkerLoop() {
    while (true) {
        AppearanceJob job;
        {
            std::unique_lock lock(appearance_mu_);
            appearance_cv_.wait(lock, [&] {
                return appearance_worker_stop_ || !appearance_jobs_.empty();
            });
            if (appearance_worker_stop_ && appearance_jobs_.empty()) {
                return;
            }
            job = std::move(appearance_jobs_.front());
            appearance_jobs_.pop_front();
        }
        g_appearance_pending_jobs.fetch_sub(1);

        const std::int64_t now_ns = SteadyNowNs();
        const std::int64_t max_age_ns = MsToNs(options_.appearance_update_policy.max_job_age_ms);
        if (max_age_ns > 0 && now_ns > job.enqueued_time_ns + max_age_ns) {
            RecordAppearanceDrop("stale");
            continue;
        }
        const double queue_latency_ms =
            static_cast<double>(std::max<std::int64_t>(0, now_ns - job.enqueued_time_ns)) / 1000000.0;
        auto updated = appearance_extractor_->Extract(
            job.input, job.has_previous_profile ? &job.previous_profile : nullptr);
        if (!updated.has_value()) {
            continue;
        }

        AppearanceResult result;
        result.channel_id = ResolveChannelId(job.input.stream_id, job.input.channel_id);
        result.track_id = job.input.track_id;
        result.profile = std::move(*updated);
        result.input_timestamp_ns = job.input.timestamp_ns;
        result.queue_latency_ms = queue_latency_ms;
        {
            std::lock_guard lock(appearance_mu_);
            appearance_results_.push_back(std::move(result));
        }
    }
}

void TrackStateManager::DropExpiredAppearanceJobsLocked(std::int64_t timestamp_ns) {
    const std::int64_t max_age_ns = MsToNs(options_.appearance_update_policy.max_job_age_ms);
    if (max_age_ns <= 0) {
        return;
    }
    for (auto it = appearance_jobs_.begin(); it != appearance_jobs_.end();) {
        if (timestamp_ns > it->enqueued_time_ns + max_age_ns) {
            it = appearance_jobs_.erase(it);
            g_appearance_pending_jobs.fetch_sub(1);
            RecordAppearanceDrop("stale");
        } else {
            ++it;
        }
    }
}

void TrackStateManager::RecordAppearanceDrop(const std::string& reason) {
    if (reason == "missing-crop") {
        ++appearance_missing_crop_drop_count_;
    } else if (reason == "rate-limited") {
        ++appearance_rate_limited_count_;
    } else if (reason == "global-queue-full") {
        ++appearance_global_queue_drop_count_;
    } else if (reason == "queue-full") {
        ++appearance_queue_full_drop_count_;
    } else if (reason == "stale") {
        ++appearance_stale_drop_count_;
    }
}

AppearanceExtractorStats TrackStateManager::BuildAppearanceStats() const {
    AppearanceExtractorStats stats =
        appearance_extractor_ != nullptr ? appearance_extractor_->Stats() : AppearanceExtractorStats{};
    stats.queued_count += appearance_queued_count_.load();
    stats.queue_full_drop_count += appearance_queue_full_drop_count_.load();
    stats.global_queue_drop_count += appearance_global_queue_drop_count_.load();
    stats.rate_limited_count += appearance_rate_limited_count_.load();
    stats.stale_drop_count += appearance_stale_drop_count_.load();
    stats.missing_crop_count += appearance_missing_crop_drop_count_.load();
    stats.dropped_count += appearance_queue_full_drop_count_.load() +
                           appearance_global_queue_drop_count_.load() +
                           appearance_rate_limited_count_.load() +
                           appearance_stale_drop_count_.load() +
                           appearance_missing_crop_drop_count_.load();
    stats.total_queue_latency_ms += appearance_total_queue_latency_ms_.load();
    stats.last_queue_latency_ms =
        static_cast<double>(appearance_last_queue_latency_micros_.load()) / 1000.0;
    stats.max_queue_latency_ms =
        static_cast<double>(appearance_max_queue_latency_micros_.load()) / 1000.0;
    return stats;
}

bool TrackStateManager::ShouldUpdateAppearance(const TrackRuntimeState& state,
                                               AppearanceUpdateReason reason,
                                               std::int64_t timestamp_ns) const {
    const auto& policy = options_.appearance_update_policy;
    if (!policy.enabled || appearance_extractor_ == nullptr || !appearance_extractor_->Enabled()) {
        return false;
    }

    switch (reason) {
        case AppearanceUpdateReason::TrackCreated:
            return policy.on_track_created;
        case AppearanceUpdateReason::TrackLost:
            return policy.on_track_lost;
        case AppearanceUpdateReason::ReacquireCandidate:
            return policy.on_reacquire_candidate;
        case AppearanceUpdateReason::LowConfidenceAssociation:
            return policy.on_low_confidence_association;
        case AppearanceUpdateReason::Periodic:
            if (policy.every_n_seconds <= 0) {
                return false;
            }
            if (!state.appearance_profile.has_value() ||
                state.appearance_profile->last_updated_time_ns <= 0) {
                return true;
            }
            return timestamp_ns >=
                   state.appearance_profile->last_updated_time_ns + SecondsToNs(policy.every_n_seconds);
    }
    return false;
}

void TrackStateManager::AdvanceChannelState(const std::string& channel_id,
                                            std::int64_t timestamp_ns,
                                            const std::vector<std::uint64_t>& observed_track_ids) {
    auto it = tracks_by_channel_.find(channel_id);
    if (it == tracks_by_channel_.end()) {
        return;
    }

    for (auto& [track_id, state] : it->second) {
        if (ContainsTrackId(observed_track_ids, track_id)) {
            continue;
        }

        const TrackHealth previous_health = state.health;
        ++state.health.missed_frame_count;
        state.health.association_confidence = 0.0F;
        state.health.overlap_risk = 0.0F;
        state.health.is_unstable =
            state.health.missed_frame_count >= options_.missed_frame_unstable_threshold;
        MaybeRecordMissedTrackingIssues(&state, previous_health, timestamp_ns);

        const std::int64_t age_since_seen = std::max<std::int64_t>(0, timestamp_ns - state.last_seen_time_ns);
        if (age_since_seen >= options_.lost_timeout_ns &&
            (state.lifecycle_state == TrackLifecycleState::Active ||
             state.lifecycle_state == TrackLifecycleState::Reacquired)) {
            state.lifecycle_state = TrackLifecycleState::Lost;
            state.lost_since_time_ns = state.last_seen_time_ns + options_.lost_timeout_ns;
            state.lost_since_time_ms = TimestampMs(state.lost_since_time_ns);
            ++state.health.lost_count;
            MarkHealthEvent(&state.health, "lost", state.lost_since_time_ns);
            RecordTrackingIssue(state,
                                "lost",
                                "warning",
                                IssueMessage("lost", state.health),
                                state.lost_since_time_ns);
            if (options_.appearance_update_policy.enabled) {
                MaybeUpdateAppearance(
                    &state, nullptr, nullptr, AppearanceUpdateReason::TrackLost, state.lost_since_time_ns);
            }
        }
        if (age_since_seen >= options_.terminated_timeout_ns) {
            if (state.lifecycle_state != TrackLifecycleState::Terminated) {
                if (state.lost_since_time_ns == 0) {
                    state.lost_since_time_ns = state.last_seen_time_ns + options_.lost_timeout_ns;
                    state.lost_since_time_ms = TimestampMs(state.lost_since_time_ns);
                }
                state.lifecycle_state = TrackLifecycleState::Terminated;
                MarkHealthEvent(&state.health, "terminated", timestamp_ns);
            }
        }
    }
}

bool TrackStateManager::CanCreateTrack(const TrackMap& tracks) const {
    return tracks.size() < options_.max_tracks_per_channel &&
           ActiveTrackCount(tracks) < options_.max_active_tracks_per_channel;
}

std::size_t TrackStateManager::ActiveTrackCount(const TrackMap& tracks) {
    std::size_t count = 0;
    for (const auto& [track_id, state] : tracks) {
        (void)track_id;
        if (state.lifecycle_state == TrackLifecycleState::Active ||
            state.lifecycle_state == TrackLifecycleState::Reacquired) {
            ++count;
        }
    }
    return count;
}

void TrackStateManager::AppendTrajectoryPoint(TrackRuntimeState* state,
                                              const TrackedObjectMetadata& object,
                                              std::int64_t observed_timestamp_ns) {
    if (state == nullptr) {
        return;
    }
    if (!state->trajectory.empty() && options_.trajectory_downsample_interval_ns > 0 &&
        observed_timestamp_ns <
            state->trajectory.back().timestamp_ns + options_.trajectory_downsample_interval_ns) {
        return;
    }

    TrackTrajectoryPoint point;
    point.frame_id = object.frame_id;
    point.timestamp_ns = observed_timestamp_ns;
    point.timestamp_ms = TimestampMs(observed_timestamp_ns);
    point.center = object.center;
    point.foot_point = BBoxBottomCenter(object.bbox);
    point.ground_point = object.ground_point;
    state->trajectory.push_back(point);
    while (state->trajectory.size() > options_.max_trajectory_points) {
        state->trajectory.pop_front();
    }
}

void TrackStateManager::UpdateSpeed(TrackRuntimeState* state,
                                    const TrackedObjectMetadata& object,
                                    std::int64_t observed_timestamp_ns) {
    if (state == nullptr || state->last_seen_time_ns <= 0 ||
        observed_timestamp_ns <= state->last_seen_time_ns) {
        if (state != nullptr && state->last_seen_time_ns <= 0) {
            state->latest_speed = 0.0;
            state->latest_speed_uses_ground_plane = false;
            state->latest_speed_units = "image_per_second";
        }
        return;
    }

    const double elapsed_seconds =
        static_cast<double>(observed_timestamp_ns - state->last_seen_time_ns) / 1000000000.0;
    if (elapsed_seconds <= 0.0) {
        return;
    }

    if (options_.use_ground_plane_for_speed && state->latest_ground_point.has_value() &&
        object.ground_point.has_value() && state->latest_ground_point->valid &&
        object.ground_point->valid && !state->latest_ground_point->fallback_to_image &&
        !object.ground_point->fallback_to_image) {
        state->latest_speed =
            GroundDistance(*state->latest_ground_point, *object.ground_point) / elapsed_seconds;
        state->latest_speed_uses_ground_plane = true;
        state->latest_speed_units = GroundSpeedUnits(*object.ground_point);
        return;
    }

    state->latest_speed =
        static_cast<double>(CenterDistance(state->latest_center, object.center)) / elapsed_seconds;
    state->latest_speed_uses_ground_plane = false;
    state->latest_speed_units = "image_per_second";
}

bool TrackStateManager::ShouldRunCleanup(std::int64_t timestamp_ns) const {
    if (options_.cleanup_interval_ns <= 0) {
        return true;
    }
    if (last_cleanup_time_ns_ <= 0) {
        return true;
    }
    return timestamp_ns >= last_cleanup_time_ns_ + options_.cleanup_interval_ns;
}

std::size_t TrackStateManager::CleanupTerminatedTracks(TrackMap* tracks, std::int64_t timestamp_ns) {
    if (tracks == nullptr) {
        return 0;
    }
    std::size_t removed = 0;
    for (auto it = tracks->begin(); it != tracks->end();) {
        const auto& state = it->second;
        const bool expired = state.lifecycle_state == TrackLifecycleState::Terminated &&
                             timestamp_ns - state.last_seen_time_ns >=
                                 options_.terminated_timeout_ns + options_.terminated_retention_ns;
        if (expired) {
            it = tracks->erase(it);
            ++removed;
        } else {
            ++it;
        }
    }
    return removed;
}

void TrackStateManager::EnforceChannelLimit(TrackMap* tracks) {
    if (tracks == nullptr || tracks->size() < options_.max_tracks_per_channel) {
        return;
    }

    const std::size_t before = tracks->size();
    for (auto it = tracks->begin(); it != tracks->end() && tracks->size() >= options_.max_tracks_per_channel;) {
        if (it->second.lifecycle_state == TrackLifecycleState::Terminated) {
            it = tracks->erase(it);
        } else {
            ++it;
        }
    }
    for (auto it = tracks->begin(); it != tracks->end() && tracks->size() >= options_.max_tracks_per_channel;) {
        if (it->second.lifecycle_state == TrackLifecycleState::Lost) {
            it = tracks->erase(it);
        } else {
            ++it;
        }
    }
    tracks_removed_by_cleanup_ += before - tracks->size();
}

void TrackStateManager::RefreshMetrics() {
    TrackStateMetrics metrics;
    metrics.channel_count = tracks_by_channel_.size();
    metrics.max_active_tracks_per_channel = options_.max_active_tracks_per_channel;
    metrics.max_tracks_per_channel = options_.max_tracks_per_channel;
    metrics.max_observation_history = options_.max_observation_history;
    metrics.max_trajectory_points_per_track = options_.max_trajectory_points;
    metrics.cleanup_runs = cleanup_runs_;
    metrics.tracks_removed_by_cleanup = tracks_removed_by_cleanup_;
    metrics.last_cleanup_time_ns = last_cleanup_time_ns_;

    for (const auto& [channel_key, tracks] : tracks_by_channel_) {
        (void)channel_key;
        for (const auto& [track_id, state] : tracks) {
            (void)track_id;
            ++metrics.total_tracks;
            metrics.total_observations += state.observations.size();
            metrics.total_trajectory_points += state.trajectory.size();
            if (state.appearance_profile.has_value()) {
                ++metrics.appearance_profile_count;
            }
            switch (state.lifecycle_state) {
                case TrackLifecycleState::Active:
                    ++metrics.active_tracks;
                    break;
                case TrackLifecycleState::Lost:
                    ++metrics.lost_tracks;
                    break;
                case TrackLifecycleState::Reacquired:
                    ++metrics.active_tracks;
                    ++metrics.reacquired_tracks;
                    break;
                case TrackLifecycleState::Terminated:
                    ++metrics.terminated_tracks;
                    break;
            }
        }
    }

    metric_channel_count_.store(metrics.channel_count);
    metric_total_tracks_.store(metrics.total_tracks);
    metric_active_tracks_.store(metrics.active_tracks);
    metric_lost_tracks_.store(metrics.lost_tracks);
    metric_reacquired_tracks_.store(metrics.reacquired_tracks);
    metric_terminated_tracks_.store(metrics.terminated_tracks);
    metric_total_observations_.store(metrics.total_observations);
    metric_total_trajectory_points_.store(metrics.total_trajectory_points);
    metric_appearance_profile_count_.store(metrics.appearance_profile_count);
    metric_cleanup_runs_.store(metrics.cleanup_runs);
    metric_tracks_removed_by_cleanup_.store(metrics.tracks_removed_by_cleanup);
    metric_last_cleanup_time_ns_.store(metrics.last_cleanup_time_ns);
}

TrackStateManagerOptions BuildTrackStateManagerOptionsFromConfig(const app::AppConfig& config) {
    TrackStateManagerOptions options;
    options.max_observation_history = config.analysis_max_recent_observations_per_track;
    options.max_trajectory_points = config.analysis_max_trajectory_points_per_track;
    options.max_active_tracks_per_channel = config.analysis_max_active_tracks_per_stream;
    options.max_tracks_per_channel =
        std::max(options.max_tracks_per_channel, options.max_active_tracks_per_channel);
    options.lost_timeout_ns = MsToNs(config.analysis_lost_track_timeout_ms);
    options.terminated_timeout_ns = MsToNs(config.analysis_terminated_track_timeout_ms);
    options.terminated_retention_ns = MsToNs(config.analysis_terminated_track_retention_ms);
    options.trajectory_downsample_interval_ns =
        MsToNs(config.analysis_trajectory_downsample_ms);
    options.cleanup_interval_ns = MsToNs(config.analysis_cleanup_interval_ms);
    options.tracking_issue_report_enabled = config.analysis_tracking_issue_report_enabled;
    options.tracking_issue_log_enabled = config.analysis_tracking_issue_log_enabled;
    options.tracking_issue_max_entries = config.analysis_tracking_issue_max_entries;
    options.tracking_issue_rate_limit_ns =
        MsToNs(config.analysis_tracking_issue_rate_limit_ms);
    options.tracking_issue_overlap_risk_threshold =
        config.analysis_tracking_issue_overlap_risk_threshold;
    options.tracking_issue_missed_frame_jump_threshold =
        config.analysis_tracking_issue_missed_frame_jump_threshold;
    options.tracking_issue_direction_change_jump_threshold =
        config.analysis_tracking_issue_direction_change_jump_threshold;
    options.use_ground_plane_for_speed = config.analysis_ground_plane_speed_enabled;
    options.appearance_update_policy = BuildAppearanceUpdatePolicyFromConfig(config);
    return options;
}

TrackHealthSnapshot MakeTrackHealthSnapshot(const TrackHealth& health) {
    TrackHealthSnapshot snapshot;
    snapshot.association_confidence = health.association_confidence;
    snapshot.missed_frame_count = health.missed_frame_count;
    snapshot.overlap_risk = health.overlap_risk;
    snapshot.direction_change_count = health.direction_change_count;
    snapshot.last_stable_time_ms = health.last_stable_time_ms;
    snapshot.is_unstable = health.is_unstable;
    snapshot.last_health_event = health.last_health_event;
    snapshot.last_health_event_time_ms = health.last_health_event_time_ms;
    snapshot.lost_count = health.lost_count;
    snapshot.reacquired_count = health.reacquired_count;
    return snapshot;
}

namespace {

void AppendTrackHealthSnapshotJson(std::ostringstream& out, const TrackHealthSnapshot& health) {
    out << "{"
        << "\"associationConfidence\":" << health.association_confidence << ","
        << "\"missedFrameCount\":" << health.missed_frame_count << ","
        << "\"overlapRisk\":" << health.overlap_risk << ","
        << "\"directionChangeCount\":" << health.direction_change_count << ","
        << "\"lastStableTimeMs\":" << health.last_stable_time_ms << ","
        << "\"unstable\":" << (health.is_unstable ? "true" : "false") << ","
        << "\"lastHealthEvent\":\"" << JsonEscape(health.last_health_event) << "\","
        << "\"lastHealthEventTimeMs\":" << health.last_health_event_time_ms << ","
        << "\"lostCount\":" << health.lost_count << ","
        << "\"reacquiredCount\":" << health.reacquired_count
        << "}";
}

}  // namespace

std::string TrackingIssueReportToJson(const TrackingIssueReport& report) {
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.va.tracking-issue-report.v1\","
        << "\"enabled\":" << (report.enabled ? "true" : "false") << ","
        << "\"totalIssues\":" << report.total_issues << ","
        << "\"retainedIssues\":" << report.retained_issues << ","
        << "\"rateLimitedCount\":" << report.rate_limited_count << ","
        << "\"maxEntries\":" << report.max_entries << ","
        << "\"channels\":[";
    for (std::size_t i = 0; i < report.channels.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        const auto& channel = report.channels[i];
        out << "{"
            << "\"streamId\":\"" << JsonEscape(channel.stream_id) << "\","
            << "\"channelId\":\"" << JsonEscape(channel.channel_id) << "\","
            << "\"totalIssues\":" << channel.total_issues << ","
            << "\"unstableIssues\":" << channel.unstable_issues << ","
            << "\"overlapRiskIssues\":" << channel.overlap_risk_issues << ","
            << "\"missedFrameIssues\":" << channel.missed_frame_issues << ","
            << "\"directionChangeIssues\":" << channel.direction_change_issues << ","
            << "\"reacquiredIssues\":" << channel.reacquired_issues << ","
            << "\"lostIssues\":" << channel.lost_issues
            << "}";
    }
    out << "],\"issues\":[";
    for (std::size_t i = 0; i < report.issues.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        const auto& issue = report.issues[i];
        out << "{"
            << "\"streamId\":\"" << JsonEscape(issue.stream_id) << "\","
            << "\"channelId\":\"" << JsonEscape(issue.channel_id) << "\","
            << "\"trackId\":" << issue.track_id << ","
            << "\"classId\":" << issue.class_id << ","
            << "\"className\":\"" << JsonEscape(issue.class_name) << "\","
            << "\"timestampMs\":" << issue.timestamp_ms << ","
            << "\"type\":\"" << JsonEscape(issue.issue_type) << "\","
            << "\"severity\":\"" << JsonEscape(issue.severity) << "\","
            << "\"message\":\"" << JsonEscape(issue.message) << "\","
            << "\"bbox\":{"
            << "\"x\":" << issue.bbox.x << ","
            << "\"y\":" << issue.bbox.y << ","
            << "\"width\":" << issue.bbox.width << ","
            << "\"height\":" << issue.bbox.height
            << "},"
            << "\"center\":{"
            << "\"x\":" << issue.center.x << ","
            << "\"y\":" << issue.center.y
            << "},"
            << "\"trackHealth\":";
        AppendTrackHealthSnapshotJson(out, issue.health);
        out << "}";
    }
    out << "]}";
    return out.str();
}

}  // namespace analysis

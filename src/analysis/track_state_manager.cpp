// 파일 요약: TrackStateManager의 track별 runtime state 누적/cleanup 로직을 구현한다.
// 동작 요약: stream/channel별 track map, 관측 ring buffer, Lost/Terminated 전이를 관리한다.
// 동작 요약: 기존 tracker가 만든 track id를 그대로 사용하며 새 tracking 알고리즘은 도입하지 않는다.
#include "analysis/track_state_manager.h"

#include "app_config.h"

#include <algorithm>
#include <cmath>
#include <memory>
#include <unordered_map>
#include <utility>

namespace analysis {

namespace {

std::int64_t TimestampMs(std::int64_t timestamp_ns) {
    return timestamp_ns / 1000000LL;
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

AppearanceExtractionInput BuildAppearanceInput(const TrackRuntimeState& state,
                                               const TrackedObjectMetadata* object,
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
    return input;
}

}  // namespace

const char* ToString(TrackLifecycleState state) {
    switch (state) {
        case TrackLifecycleState::Active:
            return "active";
        case TrackLifecycleState::Lost:
            return "lost";
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
}

TrackStateManager::TrackStateManager(TrackStateManager&& other) noexcept {
    *this = std::move(other);
}

TrackStateManager& TrackStateManager::operator=(TrackStateManager&& other) noexcept {
    if (this == &other) {
        return *this;
    }
    options_ = other.options_;
    appearance_extractor_ = std::move(other.appearance_extractor_);
    tracks_by_channel_ = std::move(other.tracks_by_channel_);
    last_cleanup_time_ns_ = other.last_cleanup_time_ns_;
    cleanup_runs_ = other.cleanup_runs_;
    tracks_removed_by_cleanup_ = other.tracks_removed_by_cleanup_;
    metric_channel_count_.store(other.metric_channel_count_.load());
    metric_total_tracks_.store(other.metric_total_tracks_.load());
    metric_active_tracks_.store(other.metric_active_tracks_.load());
    metric_lost_tracks_.store(other.metric_lost_tracks_.load());
    metric_terminated_tracks_.store(other.metric_terminated_tracks_.load());
    metric_total_observations_.store(other.metric_total_observations_.load());
    metric_total_trajectory_points_.store(other.metric_total_trajectory_points_.load());
    metric_appearance_profile_count_.store(other.metric_appearance_profile_count_.load());
    metric_cleanup_runs_.store(other.metric_cleanup_runs_.load());
    metric_tracks_removed_by_cleanup_.store(other.metric_tracks_removed_by_cleanup_.load());
    metric_last_cleanup_time_ns_.store(other.metric_last_cleanup_time_ns_.load());
    return *this;
}

void TrackStateManager::Update(const std::string& stream_id,
                               const std::string& channel_id,
                               const std::vector<TrackedObjectMetadata>& objects,
                               std::int64_t timestamp_ns) {
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
        const bool was_inactive = state.lifecycle_state == TrackLifecycleState::Lost ||
                                  state.lifecycle_state == TrackLifecycleState::Terminated;
        if (is_new_track) {
            state.stream_id = object.stream_id.empty() ? stream_id : object.stream_id;
            state.channel_id = resolved_channel_id;
            state.track_id = object.track_id;
            state.first_seen_time_ns = observed_timestamp_ns;
            state.first_seen_time_ms = TimestampMs(observed_timestamp_ns);
        }
        const auto overlap_it = overlap_risks.find(object.track_id);
        RefreshHealth(&state,
                      object,
                      overlap_it == overlap_risks.end() ? 0.0F : overlap_it->second,
                      observed_timestamp_ns);

        state.class_id = object.class_id;
        state.class_name = object.class_name;
        state.confidence = object.confidence;
        state.latest_bbox = object.bbox;
        state.latest_center = object.center;
        state.latest_direction = object.direction;
        state.last_seen_time_ns = observed_timestamp_ns;
        state.last_seen_time_ms = TimestampMs(observed_timestamp_ns);
        state.lost_since_time_ns = 0;
        state.lost_since_time_ms = 0;
        state.lifecycle_state = TrackLifecycleState::Active;

        state.observations.push_back(BuildObservation(object));
        while (state.observations.size() > options_.max_observation_history) {
            state.observations.pop_front();
        }
        AppendTrajectoryPoint(&state, object, observed_timestamp_ns);
        if (options_.appearance_update_policy.enabled) {
            if (is_new_track) {
                MaybeUpdateAppearance(
                    &state, &object, AppearanceUpdateReason::TrackCreated, observed_timestamp_ns);
            } else if (was_inactive) {
                MaybeUpdateAppearance(
                    &state, &object, AppearanceUpdateReason::ReacquireCandidate, observed_timestamp_ns);
            } else if (state.health.association_confidence <
                       options_.low_association_confidence_threshold) {
                MaybeUpdateAppearance(&state,
                                      &object,
                                      AppearanceUpdateReason::LowConfidenceAssociation,
                                      observed_timestamp_ns);
            } else {
                MaybeUpdateAppearance(
                    &state, &object, AppearanceUpdateReason::Periodic, observed_timestamp_ns);
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
    metrics.terminated_tracks = metric_terminated_tracks_.load();
    metrics.total_observations = metric_total_observations_.load();
    metrics.total_trajectory_points = metric_total_trajectory_points_.load();
    metrics.appearance_profile_count = metric_appearance_profile_count_.load();
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

void TrackStateManager::Reset() {
    tracks_by_channel_.clear();
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
                              state->lifecycle_state == TrackLifecycleState::Terminated;
    health.association_confidence =
        AssociationConfidence(*state, object, options_.overlap_center_distance_threshold);
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

void TrackStateManager::MaybeUpdateAppearance(TrackRuntimeState* state,
                                              const TrackedObjectMetadata* object,
                                              AppearanceUpdateReason reason,
                                              std::int64_t timestamp_ns) {
    if (state == nullptr || appearance_extractor_ == nullptr ||
        !ShouldUpdateAppearance(*state, reason, timestamp_ns)) {
        return;
    }

    const AppearanceExtractionInput input = BuildAppearanceInput(*state, object, reason, timestamp_ns);
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

        ++state.health.missed_frame_count;
        state.health.association_confidence = 0.0F;
        state.health.overlap_risk = 0.0F;
        state.health.is_unstable =
            state.health.missed_frame_count >= options_.missed_frame_unstable_threshold;

        const std::int64_t age_since_seen = std::max<std::int64_t>(0, timestamp_ns - state.last_seen_time_ns);
        if (age_since_seen >= options_.lost_timeout_ns &&
            state.lifecycle_state == TrackLifecycleState::Active) {
            state.lifecycle_state = TrackLifecycleState::Lost;
            state.lost_since_time_ns = state.last_seen_time_ns + options_.lost_timeout_ns;
            state.lost_since_time_ms = TimestampMs(state.lost_since_time_ns);
            ++state.health.lost_count;
            MarkHealthEvent(&state.health, "lost", state.lost_since_time_ns);
            if (options_.appearance_update_policy.enabled) {
                MaybeUpdateAppearance(
                    &state, nullptr, AppearanceUpdateReason::TrackLost, state.lost_since_time_ns);
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
        if (state.lifecycle_state == TrackLifecycleState::Active) {
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
    state->trajectory.push_back(point);
    while (state->trajectory.size() > options_.max_trajectory_points) {
        state->trajectory.pop_front();
    }
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
    options.terminated_retention_ns = MsToNs(config.analysis_terminated_track_retention_ms);
    options.trajectory_downsample_interval_ns =
        MsToNs(config.analysis_trajectory_downsample_ms);
    options.cleanup_interval_ns = MsToNs(config.analysis_cleanup_interval_ms);
    options.appearance_update_policy = BuildAppearanceUpdatePolicyFromConfig(config);
    return options;
}

}  // namespace analysis

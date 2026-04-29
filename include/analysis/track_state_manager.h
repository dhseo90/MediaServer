// 파일 요약: track id별 runtime state를 stream/channel 단위로 관리하는 계약을 선언한다.
// 동작 요약: TrackedObjectMetadata 관측값을 ring buffer에 저장하고 Active/Lost/Terminated 상태를 갱신한다.
// 동작 요약: frame 원본은 저장하지 않고 후속 SceneContext/Scenario 계층용 metadata만 보관한다.
#pragma once

#include <atomic>
#include <deque>
#include <memory>
#include <optional>

#include "analysis/appearance_extractor.h"
#include "analysis/tracked_object_metadata.h"

namespace app {
struct AppConfig;
}

namespace analysis {

enum class TrackLifecycleState {
    Active,
    Lost,
    Terminated,
};

const char* ToString(TrackLifecycleState state);

struct TrackStateManagerOptions {
    std::size_t max_observation_history{32};
    std::size_t max_trajectory_points{32};
    std::size_t max_tracks_per_channel{1024};
    std::size_t max_active_tracks_per_channel{512};
    std::int64_t lost_timeout_ns{2000000000LL};
    std::int64_t terminated_timeout_ns{10000000000LL};
    std::int64_t terminated_retention_ns{2000000000LL};
    std::int64_t trajectory_downsample_interval_ns{500000000LL};
    std::int64_t cleanup_interval_ns{1000000000LL};
    float low_association_confidence_threshold{0.35F};
    float overlap_iou_risk_threshold{0.20F};
    float overlap_center_distance_threshold{0.08F};
    std::uint32_t missed_frame_unstable_threshold{1};
    std::uint32_t direction_change_unstable_threshold{3};
    AppearanceUpdatePolicy appearance_update_policy;
};

struct TrackObservation {
    std::uint64_t frame_id{0};
    std::int64_t timestamp_ns{0};
    std::int64_t timestamp_ms{0};
    int class_id{-1};
    std::string class_name;
    float confidence{0.0F};
    RectF bbox;
    NormalizedPointF center;
    ObjectDirection direction;
};

struct TrackTrajectoryPoint {
    std::uint64_t frame_id{0};
    std::int64_t timestamp_ns{0};
    std::int64_t timestamp_ms{0};
    NormalizedPointF center;
};

struct TrackHealth {
    float association_confidence{1.0F};
    std::uint32_t missed_frame_count{0};
    float overlap_risk{0.0F};
    std::uint32_t direction_change_count{0};
    std::int64_t last_stable_time_ns{0};
    std::int64_t last_stable_time_ms{0};
    bool is_unstable{false};
    std::string last_health_event;
    std::int64_t last_health_event_time_ns{0};
    std::int64_t last_health_event_time_ms{0};
    std::uint32_t lost_count{0};
    std::uint32_t reacquired_count{0};
};

struct TrackRuntimeState {
    std::string stream_id;
    std::string channel_id;
    std::uint64_t track_id{0};
    int class_id{-1};
    std::string class_name;
    float confidence{0.0F};
    RectF latest_bbox;
    NormalizedPointF latest_center;
    ObjectDirection latest_direction;
    std::int64_t first_seen_time_ns{0};
    std::int64_t first_seen_time_ms{0};
    std::int64_t last_seen_time_ns{0};
    std::int64_t last_seen_time_ms{0};
    std::int64_t lost_since_time_ns{0};
    std::int64_t lost_since_time_ms{0};
    TrackLifecycleState lifecycle_state{TrackLifecycleState::Active};
    TrackHealth health;
    std::optional<AppearanceProfile> appearance_profile;
    std::deque<TrackObservation> observations;
    std::deque<TrackTrajectoryPoint> trajectory;
};

struct TrackStateMetrics {
    std::size_t channel_count{0};
    std::size_t total_tracks{0};
    std::size_t active_tracks{0};
    std::size_t lost_tracks{0};
    std::size_t terminated_tracks{0};
    std::size_t total_observations{0};
    std::size_t total_trajectory_points{0};
    std::size_t appearance_profile_count{0};
    std::size_t max_active_tracks_per_channel{0};
    std::size_t max_tracks_per_channel{0};
    std::size_t max_observation_history{0};
    std::size_t max_trajectory_points_per_track{0};
    std::size_t cleanup_runs{0};
    std::size_t tracks_removed_by_cleanup{0};
    std::int64_t last_cleanup_time_ns{0};
    std::int64_t last_cleanup_time_ms{0};
};

class TrackStateManager {
public:
    explicit TrackStateManager(
        TrackStateManagerOptions options = {},
        std::shared_ptr<IAppearanceExtractor> appearance_extractor = {});
    TrackStateManager(TrackStateManager&& other) noexcept;
    TrackStateManager& operator=(TrackStateManager&& other) noexcept;
    TrackStateManager(const TrackStateManager&) = delete;
    TrackStateManager& operator=(const TrackStateManager&) = delete;

    void Update(const std::string& stream_id,
                const std::string& channel_id,
                const std::vector<TrackedObjectMetadata>& objects,
                std::int64_t timestamp_ns);
    std::vector<TrackRuntimeState> Snapshot(const std::string& channel_id = {}) const;
    std::size_t TrackCount(const std::string& channel_id = {}) const;
    TrackStateMetrics Metrics() const;
    void Reset();

private:
    using TrackMap = std::unordered_map<std::uint64_t, TrackRuntimeState>;

    void AdvanceChannelState(const std::string& channel_id,
                             std::int64_t timestamp_ns,
                             const std::vector<std::uint64_t>& observed_track_ids);
    void RefreshHealth(TrackRuntimeState* state,
                       const TrackedObjectMetadata& object,
                       float overlap_risk,
                       std::int64_t observed_timestamp_ns);
    void MaybeUpdateAppearance(TrackRuntimeState* state,
                               const TrackedObjectMetadata* object,
                               AppearanceUpdateReason reason,
                               std::int64_t timestamp_ns);
    bool ShouldUpdateAppearance(const TrackRuntimeState& state,
                                AppearanceUpdateReason reason,
                                std::int64_t timestamp_ns) const;
    bool CanCreateTrack(const TrackMap& tracks) const;
    static std::size_t ActiveTrackCount(const TrackMap& tracks);
    void AppendTrajectoryPoint(TrackRuntimeState* state,
                               const TrackedObjectMetadata& object,
                               std::int64_t observed_timestamp_ns);
    bool ShouldRunCleanup(std::int64_t timestamp_ns) const;
    std::size_t CleanupTerminatedTracks(TrackMap* tracks, std::int64_t timestamp_ns);
    void EnforceChannelLimit(TrackMap* tracks);
    void RefreshMetrics();

    TrackStateManagerOptions options_;
    std::shared_ptr<IAppearanceExtractor> appearance_extractor_;
    std::unordered_map<std::string, TrackMap> tracks_by_channel_;
    std::int64_t last_cleanup_time_ns_{0};
    std::size_t cleanup_runs_{0};
    std::size_t tracks_removed_by_cleanup_{0};
    std::atomic<std::size_t> metric_channel_count_{0};
    std::atomic<std::size_t> metric_total_tracks_{0};
    std::atomic<std::size_t> metric_active_tracks_{0};
    std::atomic<std::size_t> metric_lost_tracks_{0};
    std::atomic<std::size_t> metric_terminated_tracks_{0};
    std::atomic<std::size_t> metric_total_observations_{0};
    std::atomic<std::size_t> metric_total_trajectory_points_{0};
    std::atomic<std::size_t> metric_appearance_profile_count_{0};
    std::atomic<std::size_t> metric_cleanup_runs_{0};
    std::atomic<std::size_t> metric_tracks_removed_by_cleanup_{0};
    std::atomic<std::int64_t> metric_last_cleanup_time_ns_{0};
};

TrackStateManagerOptions BuildTrackStateManagerOptionsFromConfig(const app::AppConfig& config);

}  // namespace analysis

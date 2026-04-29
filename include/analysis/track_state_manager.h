// 파일 요약: track id별 runtime state를 stream/channel 단위로 관리하는 계약을 선언한다.
// 동작 요약: TrackedObjectMetadata 관측값을 ring buffer에 저장하고 Active/Lost/Terminated 상태를 갱신한다.
// 동작 요약: frame 원본은 저장하지 않고 후속 SceneContext/Scenario 계층용 metadata만 보관한다.
#pragma once

#include <atomic>
#include <condition_variable>
#include <deque>
#include <memory>
#include <mutex>
#include <optional>
#include <thread>

#include "analysis/appearance_extractor.h"
#include "analysis/tracked_object_metadata.h"

namespace app {
struct AppConfig;
}

namespace analysis {

enum class TrackLifecycleState {
    Active,
    Lost,
    Reacquired,
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
    bool tracking_issue_report_enabled{app_config::kDefaultAnalysisTrackingIssueReportEnabled};
    bool tracking_issue_log_enabled{app_config::kDefaultAnalysisTrackingIssueLogEnabled};
    std::size_t tracking_issue_max_entries{app_config::kDefaultAnalysisTrackingIssueMaxEntries};
    std::int64_t tracking_issue_rate_limit_ns{
        static_cast<std::int64_t>(app_config::kDefaultAnalysisTrackingIssueRateLimitMs) *
        1000000LL};
    float tracking_issue_overlap_risk_threshold{
        app_config::kDefaultAnalysisTrackingIssueOverlapRiskThreshold};
    std::uint32_t tracking_issue_missed_frame_jump_threshold{
        app_config::kDefaultAnalysisTrackingIssueMissedFrameJumpThreshold};
    std::uint32_t tracking_issue_direction_change_jump_threshold{
        app_config::kDefaultAnalysisTrackingIssueDirectionChangeJumpThreshold};
    bool use_ground_plane_for_speed{app_config::kDefaultAnalysisGroundPlaneSpeedEnabled};
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
    std::optional<GroundPointF> ground_point;
    ObjectDirection direction;
};

struct TrackTrajectoryPoint {
    std::uint64_t frame_id{0};
    std::int64_t timestamp_ns{0};
    std::int64_t timestamp_ms{0};
    NormalizedPointF center;
    NormalizedPointF foot_point;
    std::optional<GroundPointF> ground_point;
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

struct TrackHealthSnapshot {
    float association_confidence{1.0F};
    std::uint32_t missed_frame_count{0};
    float overlap_risk{0.0F};
    std::uint32_t direction_change_count{0};
    std::int64_t last_stable_time_ms{0};
    bool is_unstable{false};
    std::string last_health_event;
    std::int64_t last_health_event_time_ms{0};
    std::uint32_t lost_count{0};
    std::uint32_t reacquired_count{0};
};

struct TrackingIssueRecord {
    std::string stream_id;
    std::string channel_id;
    std::uint64_t track_id{0};
    int class_id{-1};
    std::string class_name;
    std::int64_t timestamp_ns{0};
    std::int64_t timestamp_ms{0};
    std::string issue_type;
    std::string severity;
    std::string message;
    RectF bbox;
    NormalizedPointF center;
    TrackHealthSnapshot health;
};

struct TrackingIssueChannelSummary {
    std::string stream_id;
    std::string channel_id;
    std::size_t total_issues{0};
    std::size_t unstable_issues{0};
    std::size_t overlap_risk_issues{0};
    std::size_t missed_frame_issues{0};
    std::size_t direction_change_issues{0};
    std::size_t reacquired_issues{0};
    std::size_t lost_issues{0};
};

struct TrackingIssueReport {
    bool enabled{false};
    std::size_t total_issues{0};
    std::size_t retained_issues{0};
    std::size_t rate_limited_count{0};
    std::size_t max_entries{0};
    std::vector<TrackingIssueChannelSummary> channels;
    std::vector<TrackingIssueRecord> issues;
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
    NormalizedPointF latest_foot_point;
    std::optional<GroundPointF> latest_ground_point;
    double latest_speed{0.0};
    bool latest_speed_uses_ground_plane{false};
    std::string latest_speed_units{"image_per_second"};
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
    std::size_t reacquired_tracks{0};
    std::size_t terminated_tracks{0};
    std::size_t total_observations{0};
    std::size_t total_trajectory_points{0};
    std::size_t appearance_profile_count{0};
    AppearanceExtractorStats appearance_extractor_stats;
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
    ~TrackStateManager();
    TrackStateManager(TrackStateManager&& other) noexcept;
    TrackStateManager& operator=(TrackStateManager&& other) noexcept;
    TrackStateManager(const TrackStateManager&) = delete;
    TrackStateManager& operator=(const TrackStateManager&) = delete;

    void Update(const std::string& stream_id,
                const std::string& channel_id,
                const std::vector<TrackedObjectMetadata>& objects,
                std::int64_t timestamp_ns,
                const RawVideoFrame* appearance_frame = nullptr);
    std::vector<TrackRuntimeState> Snapshot(const std::string& channel_id = {}) const;
    std::size_t TrackCount(const std::string& channel_id = {}) const;
    TrackStateMetrics Metrics() const;
    TrackingIssueReport TrackingIssueSnapshot(const std::string& channel_id = {}) const;
    void ClearTrackingIssueReport();
    void Reset();

private:
    using TrackMap = std::unordered_map<std::uint64_t, TrackRuntimeState>;

    struct AppearanceJob {
        AppearanceExtractionInput input;
        AppearanceProfile previous_profile;
        bool has_previous_profile{false};
        std::int64_t enqueued_time_ns{0};
        int priority{0};
    };

    struct AppearanceResult {
        std::string channel_id;
        std::uint64_t track_id{0};
        AppearanceProfile profile;
        std::int64_t input_timestamp_ns{0};
        double queue_latency_ms{0.0};
    };

    void AdvanceChannelState(const std::string& channel_id,
                             std::int64_t timestamp_ns,
                             const std::vector<std::uint64_t>& observed_track_ids);
    void RefreshHealth(TrackRuntimeState* state,
                       const TrackedObjectMetadata& object,
                       float overlap_risk,
                       std::int64_t observed_timestamp_ns);
    void MaybeRecordObservedTrackingIssues(TrackRuntimeState* state,
                                           const TrackHealth& previous_health,
                                           const TrackedObjectMetadata& object,
                                           std::int64_t observed_timestamp_ns);
    void MaybeRecordMissedTrackingIssues(TrackRuntimeState* state,
                                         const TrackHealth& previous_health,
                                         std::int64_t timestamp_ns);
    void RecordTrackingIssue(const TrackRuntimeState& state,
                             std::string issue_type,
                             std::string severity,
                             std::string message,
                             std::int64_t timestamp_ns);
    void MaybeUpdateAppearance(TrackRuntimeState* state,
                               const TrackedObjectMetadata* object,
                               const RawVideoFrame* appearance_frame,
                               AppearanceUpdateReason reason,
                               std::int64_t timestamp_ns);
    void EnqueueAppearanceJob(const TrackRuntimeState& state,
                              AppearanceExtractionInput input,
                              AppearanceUpdateReason reason,
                              std::int64_t timestamp_ns);
    void DrainAppearanceResults();
    void StartAppearanceWorker();
    void StopAppearanceWorker();
    void AppearanceWorkerLoop();
    void DropExpiredAppearanceJobsLocked(std::int64_t timestamp_ns);
    void RecordAppearanceDrop(const std::string& reason);
    AppearanceExtractorStats BuildAppearanceStats() const;
    bool ShouldUpdateAppearance(const TrackRuntimeState& state,
                                AppearanceUpdateReason reason,
                                std::int64_t timestamp_ns) const;
    bool CanCreateTrack(const TrackMap& tracks) const;
    static std::size_t ActiveTrackCount(const TrackMap& tracks);
    void AppendTrajectoryPoint(TrackRuntimeState* state,
                               const TrackedObjectMetadata& object,
                               std::int64_t observed_timestamp_ns);
    void UpdateSpeed(TrackRuntimeState* state,
                     const TrackedObjectMetadata& object,
                     std::int64_t observed_timestamp_ns);
    bool ShouldRunCleanup(std::int64_t timestamp_ns) const;
    std::size_t CleanupTerminatedTracks(TrackMap* tracks, std::int64_t timestamp_ns);
    void EnforceChannelLimit(TrackMap* tracks);
    void RefreshMetrics();

    TrackStateManagerOptions options_;
    std::shared_ptr<IAppearanceExtractor> appearance_extractor_;
    std::unordered_map<std::string, TrackMap> tracks_by_channel_;
    std::deque<TrackingIssueRecord> tracking_issues_;
    std::unordered_map<std::string, std::int64_t> last_tracking_issue_time_by_key_;
    std::unordered_map<std::string, std::int64_t> last_appearance_enqueue_time_by_stream_;
    std::deque<AppearanceJob> appearance_jobs_;
    std::deque<AppearanceResult> appearance_results_;
    mutable std::mutex appearance_mu_;
    std::condition_variable appearance_cv_;
    std::thread appearance_worker_;
    bool appearance_worker_stop_{false};
    std::int64_t last_cleanup_time_ns_{0};
    std::size_t cleanup_runs_{0};
    std::size_t tracks_removed_by_cleanup_{0};
    std::size_t tracking_issue_total_count_{0};
    std::size_t tracking_issue_rate_limited_count_{0};
    std::atomic<std::uint64_t> appearance_queued_count_{0};
    std::atomic<std::uint64_t> appearance_queue_full_drop_count_{0};
    std::atomic<std::uint64_t> appearance_global_queue_drop_count_{0};
    std::atomic<std::uint64_t> appearance_rate_limited_count_{0};
    std::atomic<std::uint64_t> appearance_stale_drop_count_{0};
    std::atomic<std::uint64_t> appearance_missing_crop_drop_count_{0};
    std::atomic<std::uint64_t> appearance_completed_async_count_{0};
    std::atomic<std::uint64_t> appearance_total_queue_latency_ms_{0};
    std::atomic<std::uint64_t> appearance_last_queue_latency_micros_{0};
    std::atomic<std::uint64_t> appearance_max_queue_latency_micros_{0};
    std::atomic<std::size_t> metric_channel_count_{0};
    std::atomic<std::size_t> metric_total_tracks_{0};
    std::atomic<std::size_t> metric_active_tracks_{0};
    std::atomic<std::size_t> metric_lost_tracks_{0};
    std::atomic<std::size_t> metric_reacquired_tracks_{0};
    std::atomic<std::size_t> metric_terminated_tracks_{0};
    std::atomic<std::size_t> metric_total_observations_{0};
    std::atomic<std::size_t> metric_total_trajectory_points_{0};
    std::atomic<std::size_t> metric_appearance_profile_count_{0};
    std::atomic<std::size_t> metric_cleanup_runs_{0};
    std::atomic<std::size_t> metric_tracks_removed_by_cleanup_{0};
    std::atomic<std::int64_t> metric_last_cleanup_time_ns_{0};
};

TrackStateManagerOptions BuildTrackStateManagerOptionsFromConfig(const app::AppConfig& config);
TrackHealthSnapshot MakeTrackHealthSnapshot(const TrackHealth& health);
std::string TrackingIssueReportToJson(const TrackingIssueReport& report);

}  // namespace analysis

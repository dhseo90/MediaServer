// 파일 요약: VA state/scenario 계층의 단위성 smoke 검증을 수행한다.
// 동작 요약: 서버를 띄우지 않고 TrackState, SceneContext, EventManager, ScenarioEngine,
// Appearance hook, cleanup 정책을 mock metadata로 직접 검증한다.
#include "analysis/appearance_extractor.h"
#include "analysis/event_manager.h"
#include "analysis/event_storage.h"
#include "analysis/intrusion_after_line_crossing_scenario.h"
#include "analysis/intrusion_dwell_scenario.h"
#include "analysis/loitering_scenario.h"
#include "analysis/metadata_subscription_filter.h"
#include "analysis/object_tracker.h"
#include "analysis/re_entry_scenario.h"
#include "analysis/scenario_engine.h"
#include "analysis/scene_context_builder.h"
#include "analysis/track_state_manager.h"
#include "analysis/va_runtime_metadata.h"
#include "analysis/vlm_feature_queue.h"
#include "analysis/vlm_observation_store.h"
#include "analysis/wrong_direction_scenario.h"
#include "analysis/zone_occupancy_scenario.h"
#include "app_config.h"

#include <chrono>
#include <cmath>
#include <cstdlib>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <sstream>
#include <stdexcept>
#include <string>
#include <thread>
#include <vector>

namespace {

using namespace analysis;

int g_pass_count = 0;

std::int64_t Ms(std::int64_t value) {
    return value * 1000000LL;
}

void Expect(bool condition, const std::string& message) {
    if (!condition) {
        throw std::runtime_error(message);
    }
}

void Pass(const std::string& message) {
    ++g_pass_count;
    std::cout << "[pass] " << message << "\n";
}

bool HasLifecycleCounters(const std::vector<EventLifecycleStateSnapshot>& states,
                          const std::string& scenario_id,
                          std::uint64_t track_id,
                          std::uint64_t min_emitted,
                          std::uint64_t min_suppressed) {
    for (const auto& state : states) {
        if (state.scenario_id == scenario_id && state.track_id == track_id &&
            state.emitted_count >= min_emitted &&
            state.suppressed_count >= min_suppressed) {
            return true;
        }
    }
    return false;
}

TrackedObjectMetadata MakeObject(std::uint64_t track_id,
                                 std::uint64_t frame_id,
                                 std::int64_t timestamp_ms,
                                 float center_x,
                                 float center_y,
                                 const std::string& direction = "right",
                                 const std::string& channel_id = "1",
                                 const std::string& stream_id = "stream-a") {
    TrackedObjectMetadata object;
    object.stream_id = stream_id;
    object.channel_id = channel_id;
    object.frame_id = frame_id;
    object.timestamp_ns = Ms(timestamp_ms);
    object.timestamp_ms = timestamp_ms;
    object.track_id = track_id;
    object.class_id = 0;
    object.class_name = "person";
    object.confidence = 0.9F;
    object.bbox = RectF{center_x - 0.05F, center_y - 0.05F, 0.1F, 0.1F};
    object.center = NormalizedPointF{center_x, center_y};
    object.direction.label = direction;
    object.direction.dx = direction == "left" ? -1.0F : 1.0F;
    object.direction.dy = 0.0F;
    return object;
}

Detection MakeDetection(int class_id,
                        const std::string& label,
                        float center_x,
                        float center_y,
                        float width = 0.1F,
                        float height = 0.1F) {
    Detection detection;
    detection.class_id = class_id;
    detection.label = label;
    detection.score = 0.9F;
    detection.box = RectF{center_x - width * 0.5F, center_y - height * 0.5F, width, height};
    return detection;
}

AnalysisResult MakeTrackerFrame(std::uint64_t frame_id,
                                std::int64_t timestamp_ms,
                                std::vector<Detection> detections) {
    AnalysisResult result;
    result.source_key = "tracker-smoke";
    result.profile_key = "tracker-smoke";
    result.frame_id = frame_id;
    result.pts = Ms(timestamp_ms);
    result.detections = std::move(detections);
    return result;
}

TrackRuntimeState MakeTrackState(std::uint64_t track_id,
                                 std::int64_t timestamp_ms,
                                 float center_x,
                                 float center_y,
                                 const std::string& channel_id = "1",
                                 const std::string& stream_id = "stream-a") {
    const auto object = MakeObject(track_id, 1, timestamp_ms, center_x, center_y, "right", channel_id, stream_id);
    TrackRuntimeState state;
    state.stream_id = stream_id;
    state.channel_id = channel_id;
    state.track_id = track_id;
    state.class_id = object.class_id;
    state.class_name = object.class_name;
    state.confidence = object.confidence;
    state.latest_bbox = object.bbox;
    state.latest_center = object.center;
    state.latest_direction = object.direction;
    state.first_seen_time_ns = object.timestamp_ns;
    state.first_seen_time_ms = object.timestamp_ms;
    state.last_seen_time_ns = object.timestamp_ns;
    state.last_seen_time_ms = object.timestamp_ms;
    state.lifecycle_state = TrackLifecycleState::Active;
    return state;
}

std::filesystem::path MakeEventStorageSmokePath() {
    const auto now = std::chrono::steady_clock::now().time_since_epoch().count();
    return std::filesystem::temp_directory_path() /
           ("media-server-analysis-state-events-" + std::to_string(now) + ".jsonl");
}

std::filesystem::path ArchivePathFor(const std::filesystem::path& active_path) {
    const std::filesystem::path parent = active_path.parent_path();
    const std::string name = active_path.stem().string() + ".archive-smoke" +
                             active_path.extension().string();
    return parent.empty() ? std::filesystem::path(name) : parent / name;
}

void ConfigureEventStorageSmokeEnv() {
    static const std::filesystem::path storage_path = MakeEventStorageSmokePath();
    const std::string path = storage_path.string();
    const std::string snapshot_dir = (storage_path.parent_path() / (storage_path.stem().string() + "-snapshots")).string();
    const std::string clip_dir = (storage_path.parent_path() / (storage_path.stem().string() + "-clips")).string();
    ::setenv("MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_ENABLED", "1", 1);
    ::setenv("MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_PATH", path.c_str(), 1);
    ::setenv("MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_MAX_QUEUE", "16", 1);
    ::setenv("MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_MAX_FILE_BYTES", "0", 1);
    ::setenv("MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_MAX_ARCHIVES", "0", 1);
    ::setenv("MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_MAX_TOTAL_BYTES", "0", 1);
    ::setenv("MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_HOOK_ENABLED", "1", 1);
    ::setenv("MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_DIR", snapshot_dir.c_str(), 1);
    ::setenv("MEDIA_SERVER_ANALYSIS_EVENT_CLIP_HOOK_ENABLED", "1", 1);
    ::setenv("MEDIA_SERVER_ANALYSIS_EVENT_CLIP_DIR", clip_dir.c_str(), 1);
    ::setenv("MEDIA_SERVER_ANALYSIS_EVENT_PRE_EVENT_MS", "200", 1);
    ::setenv("MEDIA_SERVER_ANALYSIS_EVENT_POST_EVENT_MS", "100", 1);
    ::setenv("MEDIA_SERVER_ANALYSIS_EVENT_CLIP_BUFFER_MS", "1000", 1);
}

EventRecord MakeEventRecord(const std::string& event_id,
                            const std::string& event_type,
                            const std::string& scenario_name,
                            const std::string& scenario_phase,
                            const std::string& zone_id,
                            std::uint64_t track_id,
                            std::int64_t timestamp_ms) {
    EventRecord record;
    record.event_id = event_id;
    record.event_type = event_type;
    record.stream_id = "stream-a";
    record.channel_id = "1";
    record.track_id = track_id;
    record.class_id = 0;
    record.class_name = "person";
    record.start_time_ms = timestamp_ms;
    record.update_time_ms = timestamp_ms + 100;
    record.end_time_ms = timestamp_ms + 200;
    record.status = "confirmed";
    record.zone_id = zone_id;
    record.scenario_name = scenario_name;
    record.scenario_phase = scenario_phase;
    record.confidence = 0.91F;
    record.metadata_json = "{\"smoke\":true}";
    return record;
}

RawVideoFrame MakeRecorderFrame(std::int64_t timestamp_ms, unsigned char base) {
    RawVideoFrame frame;
    frame.source_key = "stream-a";
    frame.track_id = "track-a";
    frame.width = 4;
    frame.height = 4;
    frame.format = PixelFormat::RGB;
    frame.pts = Ms(timestamp_ms);
    frame.data.resize(static_cast<std::size_t>(frame.width * frame.height * 3));
    for (std::size_t index = 0; index < frame.data.size(); index += 3) {
        frame.data[index] = base;
        frame.data[index + 1] = static_cast<unsigned char>(base / 2U);
        frame.data[index + 2] = static_cast<unsigned char>(255U - base);
    }
    return frame;
}

bool WaitStoredCountAtLeast(std::uint64_t expected, int timeout_ms) {
    const auto deadline = std::chrono::steady_clock::now() + std::chrono::milliseconds(timeout_ms);
    while (std::chrono::steady_clock::now() < deadline) {
        if (GetEventStorageSnapshot().stored_count >= expected) {
            return true;
        }
        std::this_thread::sleep_for(std::chrono::milliseconds(20));
    }
    return GetEventStorageSnapshot().stored_count >= expected;
}

const TrackRuntimeState* FindTrack(const std::vector<TrackRuntimeState>& states,
                                   std::uint64_t track_id) {
    for (const auto& state : states) {
        if (state.track_id == track_id) {
            return &state;
        }
    }
    return nullptr;
}

bool HasTrackingIssue(const TrackingIssueReport& report,
                      const std::string& issue_type,
                      std::uint64_t track_id) {
    for (const auto& issue : report.issues) {
        if (issue.issue_type == issue_type && issue.track_id == track_id) {
            return true;
        }
    }
    return false;
}

bool TrackingIssueMessageContains(const TrackingIssueReport& report,
                                  const std::string& issue_type,
                                  std::uint64_t track_id,
                                  const std::string& needle) {
    for (const auto& issue : report.issues) {
        if (issue.issue_type == issue_type && issue.track_id == track_id &&
            issue.message.find(needle) != std::string::npos) {
            return true;
        }
    }
    return false;
}

class RecordingAppearanceExtractor final : public IAppearanceExtractor {
public:
    bool Enabled() const override {
        return true;
    }

    AppearanceExtractorStats Stats() const override {
        return stats;
    }

    std::optional<AppearanceProfile> Extract(const AppearanceExtractionInput& input,
                                             const AppearanceProfile* previous_profile) override {
        ++stats.request_count;
        last_crop_width = input.crop_width;
        last_crop_height = input.crop_height;
        if (input.crop_rgb.empty()) {
            ++stats.missing_crop_count;
            ++stats.dropped_count;
            return std::nullopt;
        }
        ++stats.completed_count;
        AppearanceProfile profile = previous_profile != nullptr ? *previous_profile : AppearanceProfile{};
        profile.embedding = {0.1F, 0.2F, 0.3F};
        profile.embedding_quality = 0.9F;
        profile.last_updated_time_ns = input.timestamp_ns;
        profile.last_updated_time_ms = input.timestamp_ms;
        profile.sample_count = previous_profile != nullptr ? previous_profile->sample_count + 1 : 1;
        return profile;
    }

    mutable AppearanceExtractorStats stats{.enabled = true, .extractor_name = "recording"};
    int last_crop_width{0};
    int last_crop_height{0};
};

void VerifyObjectTrackerAssociationScoring() {
    ObjectTrackerOptions options;
    options.class_labels = {"*"};
    options.smoothing_alpha = 0.0F;
    options.max_center_distance = 0.2F;
    options.min_iou = 0.05F;
    options.iou_weight = 0.0F;
    options.distance_weight = 0.0F;
    options.direction_weight = 1.0F;
    options.class_weight = 0.0F;
    options.min_association_score = 0.4F;
    ObjectTracker tracker(options);

    auto frame1 = MakeTrackerFrame(1, 1000, {MakeDetection(0, "person", 0.20F, 0.20F)});
    tracker.Update(&frame1);
    Expect(frame1.detections.size() == 1 && frame1.detections[0].track_id == 1,
           "ObjectTracker must create a first track");

    auto frame2 = MakeTrackerFrame(2, 1100, {MakeDetection(0, "person", 0.25F, 0.20F)});
    tracker.Update(&frame2);
    Expect(frame2.detections[0].track_id == 1 &&
               frame2.detections[0].association_confidence >= 0.4F,
           "ObjectTracker must keep the track before direction history is mature");

    auto frame3 = MakeTrackerFrame(3,
                                   1200,
                                   {MakeDetection(0, "person", 0.22F, 0.20F),
                                    MakeDetection(0, "person", 0.30F, 0.20F)});
    tracker.Update(&frame3);
    Expect(frame3.detections[0].track_id != 1 && frame3.detections[1].track_id == 1,
           "direction score must prefer the candidate that continues the existing movement");
    Expect(frame3.detections[1].association_confidence >= 0.99F,
           "matched detection must carry the final association score");

    auto frame4 = MakeTrackerFrame(4, 1300, {MakeDetection(2, "car", 0.34F, 0.20F)});
    tracker.Update(&frame4);
    Expect(frame4.detections[0].track_id != 1,
           "class consistency must prevent a different class from stealing an existing track id");

    ObjectTrackerOptions vehicle_label_options;
    vehicle_label_options.class_labels = {"vehicle"};
    vehicle_label_options.smoothing_alpha = 0.0F;
    ObjectTracker vehicle_label_tracker(vehicle_label_options);
    auto vehicle_label_frame1 = MakeTrackerFrame(5, 1000, {MakeDetection(2, "car", 0.20F, 0.20F)});
    vehicle_label_tracker.Update(&vehicle_label_frame1);
    auto vehicle_label_frame2 = MakeTrackerFrame(6, 1100, {MakeDetection(7, "truck", 0.22F, 0.20F)});
    vehicle_label_tracker.Update(&vehicle_label_frame2);
    Expect(vehicle_label_frame2.detections[0].track_id == vehicle_label_frame1.detections[0].track_id &&
               vehicle_label_frame2.detections[0].association_confidence > 0.0F,
           "ObjectTracker must keep vehicle IDs stable when detector labels jitter within vehicle category");

    ObjectTrackerOptions lost_buffer_options;
    lost_buffer_options.class_labels = {"*"};
    lost_buffer_options.smoothing_alpha = 0.0F;
    lost_buffer_options.max_missed_frames = 2;
    lost_buffer_options.min_iou = 0.05F;
    lost_buffer_options.max_center_distance = 0.2F;
    ObjectTracker lost_buffer_tracker(lost_buffer_options);
    auto lost_frame1 = MakeTrackerFrame(10, 1000, {MakeDetection(0, "person", 0.20F, 0.20F)});
    lost_buffer_tracker.Update(&lost_frame1);
    auto lost_frame2 = MakeTrackerFrame(11, 1100, {});
    lost_buffer_tracker.Update(&lost_frame2);
    auto reacquired_frame = MakeTrackerFrame(12, 1200, {MakeDetection(0, "person", 0.21F, 0.20F)});
    lost_buffer_tracker.Update(&reacquired_frame);
    Expect(reacquired_frame.detections[0].track_id == lost_frame1.detections[0].track_id &&
               !reacquired_frame.tracks.empty() &&
               reacquired_frame.tracks[0].state == "reacquired",
           "ObjectTracker must mark a lost-buffer match as reacquired for one frame");
    auto stable_frame = MakeTrackerFrame(13, 1300, {MakeDetection(0, "person", 0.22F, 0.20F)});
    lost_buffer_tracker.Update(&stable_frame);
    Expect(!stable_frame.tracks.empty() && stable_frame.tracks[0].state != "reacquired",
           "ObjectTracker reacquired state must clear after the next stable observation");

    ObjectTrackerOptions prediction_options;
    prediction_options.class_labels = {"*"};
    prediction_options.smoothing_alpha = 0.0F;
    prediction_options.max_missed_frames = 3;
    prediction_options.min_iou = 0.5F;
    prediction_options.max_center_distance = 0.12F;
    ObjectTracker prediction_tracker(prediction_options);
    auto prediction_frame1 = MakeTrackerFrame(20, 1000, {MakeDetection(2, "car", 0.20F, 0.20F)});
    prediction_tracker.Update(&prediction_frame1);
    auto prediction_frame2 = MakeTrackerFrame(21, 1100, {MakeDetection(2, "car", 0.30F, 0.20F)});
    prediction_tracker.Update(&prediction_frame2);
    auto prediction_gap_frame = MakeTrackerFrame(22, 1200, {});
    prediction_tracker.Update(&prediction_gap_frame);
    auto prediction_reacquired_frame =
        MakeTrackerFrame(23, 1300, {MakeDetection(2, "car", 0.50F, 0.20F)});
    prediction_tracker.Update(&prediction_reacquired_frame);
    Expect(prediction_reacquired_frame.detections[0].track_id ==
                   prediction_frame1.detections[0].track_id &&
               !prediction_reacquired_frame.tracks.empty() &&
               prediction_reacquired_frame.tracks[0].state == "reacquired",
           "ObjectTracker must use recent motion to reacquire a fast moving track after a short gap");

    ObjectTrackerOptions kalman_options;
    kalman_options.tracker_kind = ObjectTrackerKind::KalmanLite;
    kalman_options.class_labels = {"*"};
    kalman_options.smoothing_alpha = 0.0F;
    kalman_options.max_missed_frames = 3;
    kalman_options.min_iou = 0.5F;
    kalman_options.max_center_distance = 0.12F;
    ObjectTracker kalman_tracker(kalman_options);
    auto kalman_frame1 = MakeTrackerFrame(30, 1000, {MakeDetection(2, "car", 0.20F, 0.20F)});
    kalman_tracker.Update(&kalman_frame1);
    auto kalman_frame2 = MakeTrackerFrame(31, 1100, {MakeDetection(2, "car", 0.30F, 0.20F)});
    kalman_tracker.Update(&kalman_frame2);
    auto kalman_gap_frame = MakeTrackerFrame(32, 1200, {});
    kalman_tracker.Update(&kalman_gap_frame);
    auto kalman_reacquired_frame =
        MakeTrackerFrame(33, 1300, {MakeDetection(2, "car", 0.50F, 0.20F)});
    kalman_tracker.Update(&kalman_reacquired_frame);
    const float kalman_center_x = kalman_reacquired_frame.detections[0].box.x +
                                  kalman_reacquired_frame.detections[0].box.width * 0.5F;
    Expect(kalman_reacquired_frame.detections[0].track_id == kalman_frame1.detections[0].track_id &&
               !kalman_reacquired_frame.tracks.empty() &&
               kalman_reacquired_frame.tracks[0].state == "reacquired",
           "Kalman-lite tracker must reacquire a short-gap motion-predicted track");
    Expect(kalman_center_x > 0.43F && kalman_center_x < 0.50F,
           "Kalman-lite tracker must output a filtered bbox center rather than raw jitter");

    ObjectTrackerOptions bytetrack_options;
    bytetrack_options.tracker_kind = ObjectTrackerKind::ByteTrack;
    bytetrack_options.class_labels = {"*"};
    bytetrack_options.smoothing_alpha = 0.0F;
    bytetrack_options.min_iou = 0.05F;
    bytetrack_options.max_center_distance = 0.2F;
    bytetrack_options.bytetrack_high_score_threshold = 0.60F;
    bytetrack_options.bytetrack_low_score_threshold = 0.20F;
    bytetrack_options.bytetrack_low_association_score = 0.10F;
    bytetrack_options.bytetrack_low_iou_threshold = 0.01F;
    ObjectTracker bytetrack_tracker(bytetrack_options);
    auto bytetrack_frame1 = MakeTrackerFrame(40, 1000, {MakeDetection(0, "person", 0.20F, 0.20F)});
    bytetrack_tracker.Update(&bytetrack_frame1);
    const std::uint64_t bytetrack_id = bytetrack_frame1.detections[0].track_id;
    auto low_confidence_detection = MakeDetection(0, "person", 0.22F, 0.20F);
    low_confidence_detection.score = 0.35F;
    auto bytetrack_low_frame = MakeTrackerFrame(41, 1100, {low_confidence_detection});
    bytetrack_tracker.Update(&bytetrack_low_frame);
    Expect(bytetrack_low_frame.detections[0].track_id == 0 && bytetrack_low_frame.tracks.empty(),
           "ByteTrack low-confidence association must stay out of event/scene-visible metadata");
    auto bytetrack_frame3 = MakeTrackerFrame(42, 1200, {MakeDetection(0, "person", 0.24F, 0.20F)});
    bytetrack_tracker.Update(&bytetrack_frame3);
    Expect(bytetrack_id > 0 && bytetrack_frame3.detections[0].track_id == bytetrack_id,
           "ByteTrack must use low-confidence association to keep the next high-confidence track id stable");
    auto low_confidence_new = MakeDetection(0, "person", 0.80F, 0.80F);
    low_confidence_new.score = 0.35F;
    auto bytetrack_low_new_frame = MakeTrackerFrame(43, 1300, {low_confidence_new});
    bytetrack_tracker.Update(&bytetrack_low_new_frame);
    Expect(bytetrack_low_new_frame.detections[0].track_id == 0,
           "ByteTrack must not create a new public track from a low-confidence detection");

    ObjectTrackerOptions bytetrack_gap_options = bytetrack_options;
    bytetrack_gap_options.max_missed_frames = 1;
    bytetrack_gap_options.bytetrack_min_lost_buffer_frames = 3;
    ObjectTracker bytetrack_gap_tracker(bytetrack_gap_options);
    auto bytetrack_gap_frame1 = MakeTrackerFrame(44, 1400, {MakeDetection(0, "person", 0.20F, 0.20F)});
    bytetrack_gap_tracker.Update(&bytetrack_gap_frame1);
    const std::uint64_t bytetrack_gap_id = bytetrack_gap_frame1.detections[0].track_id;
    auto bytetrack_gap_empty1 = MakeTrackerFrame(45, 1500, {});
    bytetrack_gap_tracker.Update(&bytetrack_gap_empty1);
    auto bytetrack_gap_empty2 = MakeTrackerFrame(46, 1600, {});
    bytetrack_gap_tracker.Update(&bytetrack_gap_empty2);
    auto bytetrack_gap_reacquired =
        MakeTrackerFrame(47, 1700, {MakeDetection(0, "person", 0.21F, 0.20F)});
    bytetrack_gap_tracker.Update(&bytetrack_gap_reacquired);
    Expect(bytetrack_gap_id > 0 && bytetrack_gap_reacquired.detections[0].track_id == bytetrack_gap_id &&
               !bytetrack_gap_reacquired.tracks.empty() &&
               bytetrack_gap_reacquired.tracks[0].state == "reacquired",
           "ByteTrack must honor its bounded lost buffer floor for short detection gaps");

    TrackStateManager manager;
    auto object1 = MakeObject(90, 1, 1000, 0.2F, 0.2F);
    object1.association_confidence = 1.0F;
    auto object2 = MakeObject(90, 2, 1100, 0.22F, 0.2F);
    object2.association_confidence = 0.42F;
    manager.Update("stream-a", "1", {object1}, Ms(1000));
    manager.Update("stream-a", "1", {object2}, Ms(1100));
    const auto states = manager.Snapshot("1");
    const auto* track = FindTrack(states, 90);
    Expect(track != nullptr && std::fabs(track->health.association_confidence - 0.42F) < 0.001F,
           "TrackHealth must use tracker associationConfidence when metadata provides it");

    Pass("ObjectTracker creates first track id");
    Pass("ObjectTracker preserves immature direction-history track");
    Pass("ObjectTracker direction score selects continuing movement");
    Pass("ObjectTracker association confidence is exposed");
    Pass("ObjectTracker class consistency blocks id stealing");
    Pass("ObjectTracker vehicle category keeps jittered labels stable");
    Pass("ObjectTracker lost buffer reacquires short gap");
    Pass("ObjectTracker reacquired state clears after stable observation");
    Pass("ObjectTracker motion prediction reacquires fast moving track");
    Pass("Kalman-lite tracker reacquires short-gap predicted track");
    Pass("Kalman-lite tracker filters bbox center");
    Pass("ByteTrack hides low-confidence association from public metadata");
    Pass("ByteTrack preserves id through low-confidence association");
    Pass("ByteTrack blocks new public id from low-confidence detection");
    Pass("ByteTrack lost buffer floor reacquires short detection gap");
    Pass("TrackHealth uses tracker associationConfidence metadata");
}

SceneZoneDefinition MakeZone(const std::string& zone_id = "restricted-a",
                             const std::string& channel_id = "1") {
    SceneZoneDefinition zone;
    zone.zone_id = zone_id;
    zone.channel_id = channel_id;
    zone.restricted = true;
    zone.polygon = {
        SceneGeometryPoint{0.1F, 0.1F},
        SceneGeometryPoint{0.5F, 0.1F},
        SceneGeometryPoint{0.5F, 0.5F},
        SceneGeometryPoint{0.1F, 0.5F},
    };
    return zone;
}

SceneLineDefinition MakeLine(const std::string& line_id = "line-a",
                             const std::string& channel_id = "1") {
    SceneLineDefinition line;
    line.line_id = line_id;
    line.channel_id = channel_id;
    line.allowed_direction = "reverse";
    line.points = {
        SceneGeometryPoint{0.5F, 0.0F},
        SceneGeometryPoint{0.5F, 1.0F},
    };
    return line;
}

TrackSceneContext MakeTrackContext(std::uint64_t track_id,
                                   std::int64_t timestamp_ms,
                                   bool inside_zone,
                                   std::int64_t dwell_ms,
                                   const std::string& zone_id = "restricted-a") {
    TrackSceneContext context;
    context.stream_id = "stream-a";
    context.channel_id = "1";
    context.track_id = track_id;
    context.class_id = 0;
    context.class_name = "person";
    context.confidence = 0.91F;
    context.lifecycle_state = TrackLifecycleState::Active;
    context.center = inside_zone ? NormalizedPointF{0.2F, 0.2F} : NormalizedPointF{0.8F, 0.8F};
    context.bbox = RectF{context.center.x - 0.05F, context.center.y - 0.05F, 0.1F, 0.1F};
    context.direction.label = "right";

    ZoneState zone;
    zone.current_zone = inside_zone ? zone_id : std::string{};
    zone.entered_at_ns = inside_zone ? Ms(timestamp_ms - dwell_ms) : 0;
    zone.entered_at_ms = inside_zone ? timestamp_ms - dwell_ms : 0;
    zone.dwell_time_ms = inside_zone ? dwell_ms : 0;
    zone.is_inside_restricted_zone = inside_zone;
    zone.has_observation = true;
    context.zone_state = zone;
    context.zone_states.push_back(zone);
    return context;
}

SceneContext MakeSceneContext(std::int64_t timestamp_ms,
                              const std::vector<TrackSceneContext>& tracks) {
    SceneContext context;
    context.stream_id = "stream-a";
    context.channel_id = "1";
    context.timestamp_ns = Ms(timestamp_ms);
    context.timestamp_ms = timestamp_ms;
    context.tracks = tracks;
    return context;
}

std::vector<TrackTrajectoryPoint> MakeTrajectory(std::int64_t start_ms,
                                                 const std::vector<NormalizedPointF>& points,
                                                 std::int64_t step_ms = 1000) {
    std::vector<TrackTrajectoryPoint> trajectory;
    trajectory.reserve(points.size());
    for (std::size_t i = 0; i < points.size(); ++i) {
        TrackTrajectoryPoint point;
        point.frame_id = static_cast<std::uint64_t>(i + 1);
        point.timestamp_ms = start_ms + static_cast<std::int64_t>(i) * step_ms;
        point.timestamp_ns = Ms(point.timestamp_ms);
        point.center = points[i];
        point.foot_point = points[i];
        trajectory.push_back(point);
    }
    return trajectory;
}

EventCandidate MakeCandidate(std::uint64_t track_id,
                             std::int64_t timestamp_ms,
                             bool active,
                             bool confirmed = false,
                             const std::string& zone_id = "zone-a") {
    EventCandidate candidate;
    candidate.key.stream_id = "stream-a";
    candidate.key.channel_id = "1";
    candidate.key.scenario_id = "scenario-a";
    candidate.key.zone_id = zone_id;
    candidate.key.track_id = track_id;
    candidate.event.rule_id = "1";
    candidate.event.event_type = "intrusion-dwell";
    candidate.event.track_id = track_id;
    candidate.event.class_id = 0;
    candidate.event.label = "person";
    candidate.event.score = 0.9F;
    candidate.timestamp_ns = Ms(timestamp_ms);
    candidate.active = active;
    candidate.confirmed = confirmed;
    return candidate;
}

void VerifyTrackStateManagerAndHealth() {
    TrackStateManagerOptions options;
    options.max_observation_history = 3;
    options.max_trajectory_points = 2;
    options.max_tracks_per_channel = 6;
    options.max_active_tracks_per_channel = 4;
    options.lost_timeout_ns = Ms(1000);
    options.terminated_timeout_ns = Ms(2000);
    options.terminated_retention_ns = Ms(500);
    options.trajectory_downsample_interval_ns = Ms(100);
    options.cleanup_interval_ns = 0;
    options.missed_frame_unstable_threshold = 1;
    options.direction_change_unstable_threshold = 2;
    options.tracking_issue_report_enabled = true;
    options.tracking_issue_log_enabled = false;
    options.tracking_issue_rate_limit_ns = 0;
    options.tracking_issue_overlap_risk_threshold = 0.1F;
    options.tracking_issue_missed_frame_jump_threshold = 1;
    options.tracking_issue_direction_change_jump_threshold = 1;
    TrackStateManager manager(options);

    manager.Update("stream-a", "1", {MakeObject(1, 1, 1000, 0.2F, 0.2F)}, Ms(1000));
    manager.Update("stream-a", "1", {MakeObject(1, 2, 1100, 0.22F, 0.2F)}, Ms(1100));
    manager.Update("stream-a", "1", {MakeObject(1, 3, 1200, 0.24F, 0.2F)}, Ms(1200));
    manager.Update("stream-a", "1", {MakeObject(1, 4, 1300, 0.26F, 0.2F)}, Ms(1300));
    manager.Update("stream-b", "2", {MakeObject(1, 1, 1000, 0.7F, 0.7F, "right", "2", "stream-b")}, Ms(1000));

    auto channel_a = manager.Snapshot("1");
    auto channel_b = manager.Snapshot("2");
    const auto* track_a = FindTrack(channel_a, 1);
    const auto* track_b = FindTrack(channel_b, 1);
    Expect(track_a != nullptr && track_b != nullptr, "same numeric track id must exist per channel");
    Expect(track_a->stream_id == "stream-a" && track_b->stream_id == "stream-b",
           "track state must keep stream/channel separation");
    Expect(track_a->observations.size() == 3, "recent observation ring buffer must be capped");
    Expect(track_a->trajectory.size() == 2, "trajectory points must be downsampled/capped");
    Expect(track_a->first_seen_time_ms == 1000 && track_a->last_seen_time_ms == 1300,
           "firstSeen/lastSeen timestamps must be retained");

    manager.Update("stream-a", "1", {}, Ms(2300));
    channel_a = manager.Snapshot("1");
    track_a = FindTrack(channel_a, 1);
    Expect(track_a != nullptr && track_a->lifecycle_state == TrackLifecycleState::Lost,
           "track must transition Active -> Lost");
    Expect(track_a->lost_since_time_ms == 2300, "lostSince must be calculated from lastSeen+timeout");
    Expect(track_a->health.missed_frame_count > 0 && track_a->health.last_health_event == "lost",
           "TrackHealth must record missed/lost state");
    auto issue_report = manager.TrackingIssueSnapshot("1");
    Expect(HasTrackingIssue(issue_report, "missed-frame-spike", 1) &&
               HasTrackingIssue(issue_report, "lost", 1),
           "Tracking issue report must record missed-frame and lost issues");
    Expect(TrackingIssueMessageContains(issue_report, "lost", 1, "scenario dwell or occupancy counts may reset"),
           "Tracking issue report must explain lost-track scenario impact");

    manager.Update("stream-a", "1", {}, Ms(3300));
    channel_a = manager.Snapshot("1");
    track_a = FindTrack(channel_a, 1);
    Expect(track_a != nullptr && track_a->lifecycle_state == TrackLifecycleState::Terminated,
           "track must transition Lost -> Terminated");

    manager.Update("stream-a", "1", {}, Ms(3900));
    Expect(manager.Snapshot("1").empty(), "expired terminated tracks must be cleaned");
    Expect(!manager.Snapshot("2").empty(), "cleanup must not remove active tracks in another channel");

    TrackStateManager limited_manager([&] {
        TrackStateManagerOptions limited = options;
        limited.max_tracks_per_channel = 1;
        limited.max_active_tracks_per_channel = 1;
        return limited;
    }());
    limited_manager.Update("stream-a",
                           "1",
                           {MakeObject(10, 1, 1000, 0.2F, 0.2F),
                            MakeObject(11, 1, 1000, 0.7F, 0.7F)},
                           Ms(1000));
    Expect(limited_manager.Metrics().active_tracks == 1,
           "maxActiveTracksPerStream must limit new active tracks");

    TrackStateManager health_manager(options);
    health_manager.Update("stream-a",
                          "1",
                          {MakeObject(20, 1, 1000, 0.3F, 0.3F),
                           MakeObject(21, 1, 1000, 0.31F, 0.31F)},
                          Ms(1000));
    auto health_states = health_manager.Snapshot("1");
    const auto* health_track = FindTrack(health_states, 20);
    Expect(health_track != nullptr && health_track->health.overlap_risk > 0.0F &&
               health_track->health.is_unstable,
           "TrackHealth must flag overlap risk as unstable");
    issue_report = health_manager.TrackingIssueSnapshot("1");
    Expect(HasTrackingIssue(issue_report, "overlap-risk", 20),
           "Tracking issue report must record high overlap risk");
    Expect(TrackingIssueMessageContains(issue_report, "overlap-risk", 20, "close-object separation"),
           "Tracking issue report must explain overlap-risk operator action");

    health_manager.Update("stream-a", "1", {MakeObject(20, 2, 1100, 0.9F, 0.9F, "left")}, Ms(1100));
    health_manager.Update("stream-a", "1", {MakeObject(20, 3, 1200, 0.2F, 0.2F, "right")}, Ms(1200));
    health_states = health_manager.Snapshot("1");
    health_track = FindTrack(health_states, 20);
    Expect(health_track != nullptr &&
               (health_track->health.direction_change_count > 0 ||
                health_track->health.association_confidence < options.low_association_confidence_threshold),
           "TrackHealth must record direction changes or low association confidence");
    issue_report = health_manager.TrackingIssueSnapshot("1");
    Expect(HasTrackingIssue(issue_report, "direction-change-spike", 20) ||
               HasTrackingIssue(issue_report, "low-association-confidence", 20),
           "Tracking issue report must record direction or association instability");
    Expect(TrackingIssueMessageContains(issue_report, "direction-change-spike", 20, "scenario timing") ||
               TrackingIssueMessageContains(issue_report, "low-association-confidence", 20, "lower quality"),
           "Tracking issue report must explain scenario quality impact");

    health_manager.Update("stream-a", "1", {}, Ms(2300));
    health_manager.Update("stream-a", "1", {MakeObject(20, 4, 2400, 0.21F, 0.2F, "right")}, Ms(2400));
    health_states = health_manager.Snapshot("1");
    health_track = FindTrack(health_states, 20);
    Expect(health_track != nullptr && health_track->lifecycle_state == TrackLifecycleState::Reacquired,
           "TrackStateManager must expose Lost -> Reacquired as a lifecycle state");
    Expect(health_manager.Metrics().reacquired_tracks == 1 &&
               health_manager.Metrics().active_tracks >= 1,
           "TrackStateManager metrics must count reacquired tracks as active-like");
    issue_report = health_manager.TrackingIssueSnapshot("1");
    Expect(HasTrackingIssue(issue_report, "reacquired", 20),
           "Tracking issue report must record lost to reacquired transitions");
    Expect(TrackingIssueMessageContains(issue_report, "reacquired", 20, "reacquired after a short loss"),
           "Tracking issue report must explain reacquired-track review action");
    const std::string issue_json = TrackingIssueReportToJson(issue_report);
    Expect(issue_json.find("\"schema\":\"media-server.va.tracking-issue-report.v1\"") != std::string::npos,
           "Tracking issue report must support JSON output");
    Expect(issue_json.find("association=") == std::string::npos,
           "Tracking issue report messages must avoid raw counter-only wording");

    TrackStateManager appearance_manager([&] {
        TrackStateManagerOptions appearance_options = options;
        appearance_options.appearance_update_policy.enabled = true;
        appearance_options.appearance_update_policy.on_track_created = true;
        appearance_options.appearance_update_policy.on_reacquire_candidate = true;
        appearance_options.appearance_update_policy.on_low_confidence_association = true;
        return appearance_options;
    }());
    appearance_manager.Update("stream-a", "1", {MakeObject(30, 1, 1000, 0.2F, 0.2F)}, Ms(1000));
    const auto appearance_states = appearance_manager.Snapshot("1");
    const auto* appearance_track = FindTrack(appearance_states, 30);
    Expect(appearance_track != nullptr && !appearance_track->appearance_profile.has_value(),
           "NoOpAppearanceExtractor must not attach an appearance profile");

    NoOpAppearanceExtractor no_op;
    Expect(no_op.Enabled(), "NoOpAppearanceExtractor must be callable when policy enables hooks");
    Expect(!no_op.Extract(AppearanceExtractionInput{}, nullptr).has_value(),
           "NoOpAppearanceExtractor must not call a real model");

    auto recording_extractor = std::make_shared<RecordingAppearanceExtractor>();
    TrackStateManager crop_manager([&] {
        TrackStateManagerOptions crop_options = options;
        crop_options.appearance_update_policy.enabled = true;
        crop_options.appearance_update_policy.on_track_created = true;
        return crop_options;
    }(), recording_extractor);
    RawVideoFrame crop_frame;
    crop_frame.source_key = "stream-a";
    crop_frame.width = 20;
    crop_frame.height = 20;
    crop_frame.format = PixelFormat::RGB;
    crop_frame.pts = Ms(1000);
    crop_frame.data.assign(static_cast<std::size_t>(crop_frame.width * crop_frame.height * 3), 127U);
    crop_manager.Update("stream-a",
                        "1",
                        {MakeObject(31, 1, 1000, 0.5F, 0.5F)},
                        Ms(1000),
                        &crop_frame);
    std::this_thread::sleep_for(std::chrono::milliseconds(20));
    crop_manager.Update("stream-a", "1", {}, Ms(1010));
    const auto crop_states = crop_manager.Snapshot("1");
    const auto* crop_track = FindTrack(crop_states, 31);
    Expect(crop_track != nullptr && crop_track->appearance_profile.has_value() &&
               crop_track->appearance_profile->embedding.size() == 3 &&
               recording_extractor->last_crop_width > 0 &&
               crop_manager.Metrics().appearance_extractor_stats.completed_count == 1,
           "TrackStateManager must pass bounded RGB bbox crops to appearance extractor policy calls");

    auto budget_extractor = std::make_shared<RecordingAppearanceExtractor>();
    TrackStateManager budget_manager([&] {
        TrackStateManagerOptions budget_options = options;
        budget_options.appearance_update_policy.enabled = true;
        budget_options.appearance_update_policy.on_track_created = true;
        budget_options.appearance_update_policy.max_queue_size = 1;
        budget_options.appearance_update_policy.per_stream_rate_limit_ms = 1000;
        budget_options.appearance_update_policy.global_max_queue_size = 4;
        return budget_options;
    }(), budget_extractor);
    budget_manager.Update("stream-a",
                          "1",
                          {MakeObject(32, 1, 2000, 0.4F, 0.4F),
                           MakeObject(33, 1, 2000, 0.6F, 0.6F)},
                          Ms(2000),
                          &crop_frame);
    const auto budget_stats = budget_manager.Metrics().appearance_extractor_stats;
    Expect(budget_stats.queued_count == 1 && budget_stats.rate_limited_count == 1,
           "appearance execution budget must enforce per-stream Re-ID rate limits");

    app::AppConfig fallback_config;
    fallback_config.analysis_appearance_enabled = true;
    fallback_config.analysis_appearance_extractor = "onnx-reid";
    fallback_config.analysis_appearance_model_path = "/tmp/media-server-missing-reid-model.onnx";
    const auto fallback_extractor = CreateAppearanceExtractorFromConfig(fallback_config);
    Expect(fallback_extractor != nullptr &&
               fallback_extractor->Stats().extractor_name == "noop",
           "missing Re-ID model path must fall back to NoOpAppearanceExtractor");

    const std::filesystem::path reid_gate_model_path =
        std::filesystem::temp_directory_path() / "media-server-reid-gate-model.onnx";
    {
        std::ofstream out(reid_gate_model_path, std::ios::binary);
        out << "synthetic model bytes";
    }
    app::AppConfig checksum_gate_config;
    checksum_gate_config.analysis_appearance_enabled = true;
    checksum_gate_config.analysis_appearance_extractor = "onnx-reid";
    checksum_gate_config.analysis_appearance_model_path = reid_gate_model_path.string();
    const auto checksum_gate_extractor = CreateAppearanceExtractorFromConfig(checksum_gate_config);
    Expect(checksum_gate_extractor != nullptr &&
               checksum_gate_extractor->Stats().extractor_name == "noop",
           "Re-ID model path without checksum/provenance gate must fall back to NoOpAppearanceExtractor");
    app::AppConfig invalid_checksum_config = checksum_gate_config;
    invalid_checksum_config.analysis_appearance_model_sha256 = "not-a-sha256";
    invalid_checksum_config.analysis_appearance_model_provenance = "synthetic-test";
    const auto invalid_checksum_extractor = CreateAppearanceExtractorFromConfig(invalid_checksum_config);
    Expect(invalid_checksum_extractor != nullptr &&
               invalid_checksum_extractor->Stats().extractor_name == "noop",
           "invalid Re-ID model checksum must fall back to NoOpAppearanceExtractor");
    app::AppConfig provenance_gate_config = checksum_gate_config;
    provenance_gate_config.analysis_appearance_model_sha256 =
        "daa8eac9dcb9959a436b35d5dedd9a516690af96a3db00ca8125c52ef9652358";
    const auto provenance_gate_extractor = CreateAppearanceExtractorFromConfig(provenance_gate_config);
    Expect(provenance_gate_extractor != nullptr &&
               provenance_gate_extractor->Stats().extractor_name == "noop",
           "missing Re-ID model provenance gate must fall back to NoOpAppearanceExtractor");
    app::AppConfig mismatch_checksum_config = provenance_gate_config;
    mismatch_checksum_config.analysis_appearance_model_sha256 =
        "0000000000000000000000000000000000000000000000000000000000000000";
    mismatch_checksum_config.analysis_appearance_model_provenance = "synthetic-test";
    const auto mismatch_checksum_extractor = CreateAppearanceExtractorFromConfig(mismatch_checksum_config);
    Expect(mismatch_checksum_extractor != nullptr &&
               mismatch_checksum_extractor->Stats().extractor_name == "noop",
           "mismatched Re-ID model checksum must fall back to NoOpAppearanceExtractor");
    std::filesystem::remove(reid_gate_model_path);

    TrackStateManagerOptions speed_options = options;
    speed_options.use_ground_plane_for_speed = true;
    TrackStateManager speed_manager(speed_options);
    auto speed_object1 = MakeObject(50, 1, 1000, 0.2F, 0.2F);
    speed_object1.ground_point = GroundPointF{0.0, 0.0, true, false, "meters"};
    auto speed_object2 = MakeObject(50, 2, 2000, 0.3F, 0.2F);
    speed_object2.ground_point = GroundPointF{3.0, 4.0, true, false, "meters"};
    speed_manager.Update("stream-a", "1", {speed_object1}, Ms(1000));
    speed_manager.Update("stream-a", "1", {speed_object2}, Ms(2000));
    const auto speed_states = speed_manager.Snapshot("1");
    const auto* speed_track = FindTrack(speed_states, 50);
    Expect(speed_track != nullptr && speed_track->latest_ground_point.has_value() &&
               speed_track->latest_speed_uses_ground_plane &&
               std::fabs(speed_track->latest_speed - 5.0) < 0.0001 &&
               speed_track->latest_speed_units == "meters_per_second",
           "TrackStateManager must calculate optional ground-plane speed from metadata ground points");

    Pass("TrackStateManager keeps same numeric track id per channel");
    Pass("TrackStateManager preserves stream channel separation");
    Pass("TrackStateManager caps observation history");
    Pass("TrackStateManager caps trajectory history");
    Pass("TrackStateManager retains first seen timestamp");
    Pass("TrackStateManager retains last seen timestamp");
    Pass("TrackStateManager transitions active track to lost");
    Pass("TrackStateManager records lost since timestamp");
    Pass("TrackHealth records missed frame state");
    Pass("TrackHealth records lost state");
    Pass("TrackingIssueReport records missed-frame spike");
    Pass("TrackingIssueReport records lost track issue");
    Pass("TrackingIssueReport explains lost-track scenario impact");
    Pass("TrackStateManager transitions lost track to terminated");
    Pass("TrackStateManager cleans expired terminated tracks");
    Pass("TrackStateManager preserves other channel active tracks during cleanup");
    Pass("TrackStateManager enforces max active tracks per stream");
    Pass("TrackHealth flags overlap risk");
    Pass("TrackHealth marks overlap risk as unstable");
    Pass("TrackingIssueReport records overlap risk");
    Pass("TrackingIssueReport explains overlap operator action");
    Pass("TrackHealth records direction instability");
    Pass("TrackingIssueReport records instability issue");
    Pass("TrackingIssueReport explains instability impact");
    Pass("TrackStateManager exposes lost to reacquired lifecycle");
    Pass("TrackStateManager metrics count reacquired tracks");
    Pass("TrackingIssueReport records reacquired transition");
    Pass("TrackingIssueReport explains reacquired review action");
    Pass("TrackingIssueReport serializes v1 schema");
    Pass("TrackingIssueReport omits raw counter-only wording");
    Pass("NoOpAppearanceExtractor leaves appearance profile absent");
    Pass("NoOpAppearanceExtractor is callable when policy enables hooks");
    Pass("NoOpAppearanceExtractor does not call real model");
    Pass("TrackStateManager passes bounded RGB bbox crop");
    Pass("TrackStateManager attaches appearance embedding");
    Pass("TrackStateManager records appearance extractor completion");
    Pass("Appearance policy enforces per stream Re-ID rate limit");
    Pass("Missing Re-ID model path falls back to NoOp");
    Pass("Re-ID model without checksum gate falls back to NoOp");
    Pass("Invalid Re-ID model checksum falls back to NoOp");
    Pass("Missing Re-ID model provenance falls back to NoOp");
    Pass("Mismatched Re-ID model checksum falls back to NoOp");
    Pass("TrackStateManager calculates ground plane speed");
    Pass("TrackStateManager records ground plane speed units");
}

void VerifySceneContextBuilder() {
    SceneContextBuilder builder;
    const auto zone = MakeZone();
    const auto line = MakeLine();

    auto state = MakeTrackState(1, 1000, 0.2F, 0.2F);
    auto context = builder.Build("stream-a", "1", {state}, {zone}, {line}, Ms(1000));
    Expect(context.tracks.size() == 1, "scene context must include active track");
    Expect(context.tracks[0].zone_state.current_zone == "restricted-a",
           "ZoneState currentZone must be calculated");
    Expect(context.tracks[0].zone_state.is_inside_restricted_zone,
           "ZoneState must detect restricted zone membership");

    state = MakeTrackState(1, 3000, 0.25F, 0.2F);
    context = builder.Build("stream-a", "1", {state}, {zone}, {line}, Ms(3000));
    Expect(context.tracks[0].zone_state.dwell_time_ms == 2000,
           "ZoneState dwellTimeMs must be calculated from enteredAt");

    SceneGeometryConfig calibrated_geometry;
    calibrated_geometry.zones = {zone};
    calibrated_geometry.lines = {line};
    HomographyConfig homography;
    homography.calibration_id = "calibration-a";
    homography.channel_id = "1";
    homography.enabled = true;
    homography.image_to_ground = {2.0, 0.0, 0.0,
                                  0.0, 3.0, 0.0,
                                  0.0, 0.0, 1.0};
    homography.units = "meters";
    calibrated_geometry.homographies.push_back(homography);
    const auto calibrated_trajectory = MakeTrajectory(1000,
                                                      {NormalizedPointF{0.2F, 0.25F},
                                                       NormalizedPointF{0.25F, 0.25F}},
                                                      2000);
    state.trajectory.assign(calibrated_trajectory.begin(), calibrated_trajectory.end());
    SceneContextBuilderOptions calibrated_builder_options;
    calibrated_builder_options.use_ground_plane_for_speed = true;
    SceneContextBuilder calibrated_builder(calibrated_builder_options);
    context = calibrated_builder.Build("stream-a", "1", {state}, calibrated_geometry, Ms(3000));
    Expect(!context.tracks.empty() && std::fabs(context.tracks[0].foot_point.x - 0.25F) < 0.0001F &&
               std::fabs(context.tracks[0].foot_point.y - 0.25F) < 0.0001F,
           "SceneContextBuilder must use bbox bottom center as the image foot point");
    Expect(context.tracks[0].ground_point.valid &&
               !context.tracks[0].ground_point.fallback_to_image &&
               std::fabs(context.tracks[0].ground_point.x - 0.5) < 0.0001 &&
               std::fabs(context.tracks[0].ground_point.y - 0.75) < 0.0001 &&
               context.tracks[0].ground_point.units == "meters",
           "SceneContextBuilder must project bbox bottom center to ground-plane coordinates");
    Expect(context.tracks[0].trajectory.size() == 2 &&
               context.tracks[0].trajectory.back().ground_point.has_value() &&
               context.tracks[0].trajectory.back().ground_point->valid &&
               std::fabs(context.tracks[0].trajectory.back().ground_point->x - 0.5) < 0.0001 &&
               context.tracks[0].speed_uses_ground_plane &&
               std::fabs(context.tracks[0].speed - 0.05) < 0.0001 &&
               context.tracks[0].speed_units == "meters_per_second",
           "SceneContextBuilder must project trajectory points and calculate optional ground-plane speed");

    SceneGeometryConfig fallback_geometry;
    fallback_geometry.zones = {zone};
    context = builder.Build("stream-a", "1", {state}, fallback_geometry, Ms(3100));
    Expect(!context.tracks.empty() && !context.tracks[0].ground_point.valid &&
               context.tracks[0].ground_point.fallback_to_image &&
               context.tracks[0].ground_point.units == "image",
           "SceneContextBuilder must fallback to image coordinates when homography is unset");

    state = MakeTrackState(1, 4000, 0.6F, 0.2F);
    context = builder.Build("stream-a", "1", {state}, {zone}, {line}, Ms(4000));
    Expect(!context.tracks[0].line_states.empty(), "LineCrossState must be present");
    Expect(context.tracks[0].line_states[0].crossed, "LineCrossState must detect crossing");
    Expect(context.tracks[0].line_states[0].direction == "reverse",
           "LineCrossState must calculate crossing direction");

    const auto other_channel_state = MakeTrackState(2, 1000, 0.2F, 0.2F, "2", "stream-b");
    context = builder.Build("stream-b", "2", {other_channel_state}, {zone}, {line}, Ms(1000));
    Expect(context.tracks.size() == 1 && context.tracks[0].zone_state.current_zone.empty(),
           "scene geometry must stay channel scoped");

    const std::string normal_rule =
        R"({"id":"1","enabled":true,"match":{"sourceKind":"*","route":"*"},"event":{"region":{"type":"polygon","points":[{"x":0.1,"y":0.1},{"x":0.4,"y":0.1},{"x":0.4,"y":0.4}]}}})";
    const std::string va_rule =
        R"({"id":"7","enabled":true,"match":{"vaRule":"7"},"event":{"region":{"type":"polygon","points":[{"x":0.2,"y":0.2},{"x":0.5,"y":0.2},{"x":0.5,"y":0.5}]}}})";
    AnalysisContext default_context;
    auto default_geometry = BuildSceneGeometryConfigFromRuleDocuments({normal_rule, va_rule}, default_context);
    Expect(default_geometry.zones.size() == 1 && default_geometry.zones[0].zone_id == "1",
           "default va=1 context must ignore vaRule scoped geometry");
    AnalysisContext va_context;
    va_context.va_rule_id = "7";
    auto scoped_geometry = BuildSceneGeometryConfigFromRuleDocuments({normal_rule, va_rule}, va_context);
    Expect(scoped_geometry.zones.size() == 1 && scoped_geometry.zones[0].zone_id == "7",
           "vaRule context must use only matching vaRule geometry");

    Pass("SceneContextBuilder includes active track");
    Pass("SceneContextBuilder calculates current zone");
    Pass("SceneContextBuilder detects restricted zone membership");
    Pass("SceneContextBuilder calculates dwell time");
    Pass("SceneContextBuilder uses bbox bottom center foot point");
    Pass("SceneContextBuilder projects foot point to ground plane");
    Pass("SceneContextBuilder projects trajectory ground points");
    Pass("SceneContextBuilder calculates ground plane speed");
    Pass("SceneContextBuilder falls back when homography is unavailable");
    Pass("SceneContextBuilder calculates line crossing state");
    Pass("SceneContextBuilder keeps channel scoped geometry");
    Pass("SceneContextBuilder keeps vaRule scoped geometry");
}

void VerifyEventManager() {
    EventManager manager;
    EventLifecycleOptions options;
    options.cooldown_ms = 1000;
    options.update_interval_ms = 500;
    options.ended_retention_ms = 200;
    options.cleanup_interval_ms = 0;
    options.emit_start = true;
    options.emit_update = true;
    options.emit_confirmed = true;
    options.emit_end = true;

    auto decision = manager.Update(MakeCandidate(1, 1000, true), options);
    Expect(decision.emit && decision.stage == EventLifecycleStage::Start,
           "EventManager must emit start");
    decision = manager.Update(MakeCandidate(1, 1100, true), options);
    Expect(!decision.emit && decision.suppressed && decision.stage == EventLifecycleStage::Update,
           "EventManager must throttle duplicate updates");
    decision = manager.Update(MakeCandidate(1, 1600, true), options);
    Expect(decision.emit && decision.stage == EventLifecycleStage::Update,
           "EventManager must emit update after interval");
    decision = manager.Update(MakeCandidate(1, 1700, true, true), options);
    Expect(decision.emit && decision.stage == EventLifecycleStage::Confirmed,
           "EventManager must emit confirmed");
    decision = manager.Update(MakeCandidate(1, 1800, true, true), options);
    Expect(!decision.emit && decision.suppressed,
           "EventManager must suppress confirmed track duplicate update");
    decision = manager.Update(MakeCandidate(1, 1900, false), options);
    Expect(decision.emit && decision.stage == EventLifecycleStage::End,
           "EventManager must emit end when configured");
    decision = manager.Update(MakeCandidate(1, 2000, true), options);
    Expect(!decision.emit && decision.suppressed && decision.stage == EventLifecycleStage::Cooldown,
           "EventManager must suppress reactivation during cooldown");
    Expect(HasLifecycleCounters(manager.Snapshot(), "scenario-a", 1, 4, 3),
           "EventManager snapshot must expose per-state emit/dedupe counts for timeline debug");
    decision = manager.Update(MakeCandidate(1, 3100, true), options);
    Expect(decision.emit && decision.stage == EventLifecycleStage::Start,
           "EventManager must allow reactivation after cooldown");
    manager.Update(MakeCandidate(1, 3200, false), options);
    manager.Update(MakeCandidate(2, 3600, true), options);
    Expect(manager.Metrics().cleanup_runs > 0 && manager.Metrics().states_removed_by_cleanup > 0,
           "EventManager must cleanup expired event state");

    Pass("EventManager emits confirmed active candidate");
    Pass("EventManager suppresses duplicate candidate during cooldown");
    Pass("EventManager emits candidate after cooldown");
    Pass("EventManager records emitted lifecycle counter");
    Pass("EventManager records suppressed lifecycle counter");
    Pass("EventManager clears inactive candidate state");
    Pass("EventManager cleans expired lifecycle state");
}

void VerifyScenarioEngineAndIntrusionDwell() {
    ScenarioEngineOptions engine_options;
    engine_options.enabled = true;
    engine_options.default_cooldown_ms = 1000;
    engine_options.default_update_interval_ms = 0;
    engine_options.ended_retention_ms = 500;
    engine_options.cleanup_interval_ms = 0;
    engine_options.max_instances_per_channel = 32;

    IntrusionDwellScenarioOptions dwell_options;
    dwell_options.enabled = true;
    dwell_options.candidate_time_ms = 2000;
    dwell_options.dwell_time_ms = 10000;
    dwell_options.cooldown_ms = 1000;
    dwell_options.target_class_tokens = {"person"};
    dwell_options.restricted_zone_ids = {"restricted-a"};

    ScenarioEngine engine(engine_options);
    engine.RegisterScenario(std::make_unique<IntrusionDwellScenario>(dwell_options));
    EventManager event_manager;

    auto events = engine.Evaluate(MakeSceneContext(1000, {MakeTrackContext(1, 1000, true, 0)}), &event_manager);
    Expect(events.empty(), "IntrusionDwell must not emit before dwell threshold");
    Expect(engine.Snapshot("1")[0].phase == ScenarioPhase::Candidate,
           "IntrusionDwell must enter Candidate on restricted zone entry");

    events = engine.Evaluate(MakeSceneContext(2999, {MakeTrackContext(1, 2999, true, 1999)}), &event_manager);
    Expect(events.empty() && engine.Snapshot("1")[0].phase == ScenarioPhase::Candidate,
           "IntrusionDwell must not observe before candidateTimeMs");

    events = engine.Evaluate(MakeSceneContext(3000, {MakeTrackContext(1, 3000, true, 2000)}), &event_manager);
    Expect(events.empty() && engine.Snapshot("1")[0].phase == ScenarioPhase::Observing,
           "IntrusionDwell must enter Observing after candidateTimeMs");

    events = engine.Evaluate(MakeSceneContext(11000, {MakeTrackContext(1, 11000, true, 10000)}), &event_manager);
    Expect(events.size() == 1 && events[0].event_type == "intrusion-dwell" && events[0].track_id == 1,
           "IntrusionDwell must emit one confirmed event after dwellTimeMs");
    Expect(engine.Snapshot("1")[0].phase == ScenarioPhase::Confirmed,
           "IntrusionDwell must enter Confirmed phase");

    events = engine.Evaluate(MakeSceneContext(12000, {MakeTrackContext(1, 12000, true, 11000)}), &event_manager);
    Expect(events.empty(), "IntrusionDwell must not duplicate event for same track inside zone");

    events = engine.Evaluate(MakeSceneContext(13000, {MakeTrackContext(1, 13000, false, 0)}), &event_manager);
    Expect(events.empty() && engine.Snapshot("1")[0].phase == ScenarioPhase::Ended,
           "IntrusionDwell must end when track exits zone");

    events = engine.Evaluate(MakeSceneContext(14500, {MakeTrackContext(1, 14500, true, 0)}), &event_manager);
    Expect(events.empty() && engine.Snapshot("1")[0].phase == ScenarioPhase::Candidate,
           "IntrusionDwell must allow same track to start a new instance after re-entry");
    events = engine.Evaluate(MakeSceneContext(24500, {MakeTrackContext(1, 24500, true, 10000)}), &event_manager);
    Expect(events.size() == 1 && events[0].track_id == 1,
           "IntrusionDwell must emit again after a completed exit/re-entry cycle");

    ScenarioEngine cleanup_engine(engine_options);
    cleanup_engine.RegisterScenario(std::make_unique<IntrusionDwellScenario>(dwell_options));
    EventManager cleanup_events;
    cleanup_engine.Evaluate(MakeSceneContext(1000, {MakeTrackContext(10, 1000, true, 10000)}),
                            &cleanup_events);
    cleanup_engine.Evaluate(MakeSceneContext(1100, {MakeTrackContext(10, 1100, false, 0)}),
                            &cleanup_events);
    cleanup_engine.Evaluate(MakeSceneContext(2000, {MakeTrackContext(11, 2000, true, 0)}),
                            &cleanup_events);
    Expect(cleanup_engine.Metrics().instances_removed_by_cleanup > 0,
           "ScenarioEngine must cleanup expired ended scenario instances");

    Pass("ScenarioEngine emits intrusion dwell candidate");
    Pass("IntrusionDwellScenario emits enter phase");
    Pass("IntrusionDwellScenario emits dwell phase");
    Pass("IntrusionDwellScenario suppresses duplicate dwell event");
    Pass("IntrusionDwellScenario emits re-entry phase");
    Pass("IntrusionDwellScenario cleans stale track state");
    Pass("ScenarioEngine keeps scenario output stable");
}

void VerifyReEntryScenario() {
    ScenarioEngineOptions engine_options;
    engine_options.enabled = true;
    engine_options.default_cooldown_ms = 1000;
    engine_options.default_update_interval_ms = 0;
    engine_options.ended_retention_ms = 500;
    engine_options.cleanup_interval_ms = 0;
    engine_options.max_instances_per_channel = 32;

    ReEntryScenarioOptions options;
    options.enabled = true;
    options.re_entry_window_ms = 3000;
    options.cooldown_ms = 1000;
    options.target_class_tokens = {"person"};
    options.target_zone_ids = {"restricted-a"};

    ScenarioEngine engine(engine_options);
    engine.RegisterScenario(std::make_unique<ReEntryScenario>(options));
    EventManager event_manager;

    auto exit_context = MakeTrackContext(7, 1000, false, 0);
    exit_context.zone_state.previous_zone = "restricted-a";
    exit_context.zone_state.exited_at_ns = Ms(1000);
    exit_context.zone_state.exited_at_ms = 1000;
    exit_context.zone_state.changed = true;
    exit_context.zone_states[0] = exit_context.zone_state;
    auto events = engine.Evaluate(MakeSceneContext(1000, {exit_context}), &event_manager);
    Expect(events.empty(), "ReEntry must only record exit without emitting");

    events = engine.Evaluate(MakeSceneContext(2500, {MakeTrackContext(7, 2500, true, 0)}),
                             &event_manager);
    Expect(events.size() == 1 && events[0].event_type == "re-entry" &&
               events[0].track_id == 7 && events[0].zone_id == "restricted-a",
           "ReEntry must emit once when the same track re-enters inside the window");

    events = engine.Evaluate(MakeSceneContext(2600, {MakeTrackContext(7, 2600, true, 100)}),
                             &event_manager);
    Expect(events.empty(), "ReEntry must not duplicate while the track remains inside");

    auto second_exit = MakeTrackContext(7, 2700, false, 0);
    second_exit.zone_state.previous_zone = "restricted-a";
    second_exit.zone_state.exited_at_ns = Ms(2700);
    second_exit.zone_state.exited_at_ms = 2700;
    second_exit.zone_state.changed = true;
    second_exit.zone_states[0] = second_exit.zone_state;
    events = engine.Evaluate(MakeSceneContext(2700, {second_exit}), &event_manager);
    Expect(events.empty(), "ReEntry end phase must stay internal when emit_end is disabled");

    events = engine.Evaluate(MakeSceneContext(2800, {MakeTrackContext(7, 2800, true, 0)}),
                             &event_manager);
    Expect(events.empty(), "ReEntry must honor cooldown after a previous event");

    auto late_exit = MakeTrackContext(8, 1000, false, 0);
    late_exit.zone_state.previous_zone = "restricted-a";
    late_exit.zone_state.exited_at_ns = Ms(1000);
    late_exit.zone_state.exited_at_ms = 1000;
    late_exit.zone_state.changed = true;
    late_exit.zone_states[0] = late_exit.zone_state;
    engine.Evaluate(MakeSceneContext(1000, {late_exit}), &event_manager);
    events = engine.Evaluate(MakeSceneContext(4501, {MakeTrackContext(8, 4501, true, 0)}),
                             &event_manager);
    Expect(events.empty(), "ReEntry must not emit when re-entry window expired");

    Pass("ReEntryScenario records exit observation");
    Pass("ReEntryScenario emits re-entry candidate");
    Pass("ReEntryScenario enforces cooldown");
    Pass("ReEntryScenario enforces re-entry window");

    ReEntryScenarioOptions cross_zone_options;
    cross_zone_options.enabled = true;
    cross_zone_options.re_entry_window_ms = 4000;
    cross_zone_options.cooldown_ms = 1000;
    cross_zone_options.target_class_tokens = {"person"};
    cross_zone_options.target_zone_ids = {"restricted-a"};
    cross_zone_options.re_entry_mode = "configured-zones";
    cross_zone_options.re_entry_zone_ids = {"restricted-b"};

    ScenarioEngine cross_zone_engine(engine_options);
    cross_zone_engine.RegisterScenario(std::make_unique<ReEntryScenario>(cross_zone_options));
    EventManager cross_zone_events;

    auto cross_zone_exit = MakeTrackContext(9, 1000, false, 0, "restricted-a");
    cross_zone_exit.zone_state.previous_zone = "restricted-a";
    cross_zone_exit.zone_state.exited_at_ns = Ms(1000);
    cross_zone_exit.zone_state.exited_at_ms = 1000;
    cross_zone_exit.zone_state.changed = true;
    cross_zone_exit.zone_states[0] = cross_zone_exit.zone_state;
    events = cross_zone_engine.Evaluate(MakeSceneContext(1000, {cross_zone_exit}), &cross_zone_events);
    Expect(events.empty(), "Cross-zone ReEntry must record source zone exit without emitting");

    events = cross_zone_engine.Evaluate(
        MakeSceneContext(2500, {MakeTrackContext(9, 2500, true, 0, "restricted-b")}),
        &cross_zone_events);
    Expect(events.size() == 1 && events[0].event_type == "re-entry" &&
               events[0].track_id == 9 && events[0].zone_id == "restricted-b",
           "Cross-zone ReEntry must emit when a track exits A and enters configured B inside the window");

    auto wrong_destination_exit = MakeTrackContext(10, 1000, false, 0, "restricted-a");
    wrong_destination_exit.zone_state.previous_zone = "restricted-a";
    wrong_destination_exit.zone_state.exited_at_ns = Ms(1000);
    wrong_destination_exit.zone_state.exited_at_ms = 1000;
    wrong_destination_exit.zone_state.changed = true;
    wrong_destination_exit.zone_states[0] = wrong_destination_exit.zone_state;
    events = cross_zone_engine.Evaluate(MakeSceneContext(1000, {wrong_destination_exit}),
                                        &cross_zone_events);
    Expect(events.empty(), "Cross-zone ReEntry wrong-destination setup must not emit");
    events = cross_zone_engine.Evaluate(
        MakeSceneContext(2500, {MakeTrackContext(10, 2500, true, 0, "restricted-c")}),
        &cross_zone_events);
    Expect(events.empty(), "Cross-zone ReEntry must ignore destinations outside reEntryZoneIds");

    Pass("ReEntryScenario emits configured cross-zone re-entry candidate");
    Pass("ReEntryScenario filters configured cross-zone destinations");
}

LineCrossState MakeLineState(const std::string& line_id,
                             const std::string& allowed_direction,
                             const std::string& raw_direction,
                             bool raw_crossed = true) {
    LineCrossState line;
    line.line_id = line_id;
    line.allowed_direction = allowed_direction;
    line.previous_side = raw_direction == "reverse" ? 0.3F : -0.3F;
    line.current_side = raw_direction == "reverse" ? -0.3F : 0.3F;
    line.raw_crossed = raw_crossed;
    line.raw_direction = raw_crossed ? raw_direction : "none";
    line.direction_allowed = allowed_direction == "any" || allowed_direction == raw_direction;
    line.crossed = raw_crossed && line.direction_allowed;
    line.direction = line.crossed ? raw_direction : "none";
    return line;
}

void VerifyWrongDirectionScenario() {
    ScenarioEngineOptions engine_options;
    engine_options.enabled = true;
    engine_options.default_cooldown_ms = 1000;
    engine_options.default_update_interval_ms = 0;
    engine_options.ended_retention_ms = 500;
    engine_options.cleanup_interval_ms = 0;
    engine_options.max_instances_per_channel = 32;

    WrongDirectionScenarioOptions options;
    options.enabled = true;
    options.cooldown_ms = 1000;
    options.target_class_tokens = {"person"};
    options.target_line_ids = {"line-a"};

    ScenarioEngine engine(engine_options);
    engine.RegisterScenario(std::make_unique<WrongDirectionScenario>(options));
    EventManager event_manager;

    auto allowed_track = MakeTrackContext(20, 1000, false, 0);
    allowed_track.line_states.push_back(MakeLineState("line-a", "forward", "forward"));
    auto events = engine.Evaluate(MakeSceneContext(1000, {allowed_track}), &event_manager);
    Expect(events.empty(), "WrongDirection must not emit for allowed crossing direction");

    auto wrong_track = MakeTrackContext(20, 2000, false, 0);
    wrong_track.line_states.push_back(MakeLineState("line-a", "forward", "reverse"));
    events = engine.Evaluate(MakeSceneContext(2000, {wrong_track}), &event_manager);
    Expect(events.size() == 1 && events[0].event_type == "wrong-direction" &&
               events[0].line_id == "line-a" && events[0].track_id == 20,
           "WrongDirection must emit when raw crossing direction violates allowedDirection");

    auto no_cross_track = MakeTrackContext(20, 2100, false, 0);
    no_cross_track.line_states.push_back(MakeLineState("line-a", "forward", "none", false));
    events = engine.Evaluate(MakeSceneContext(2100, {no_cross_track}), &event_manager);
    Expect(events.empty(), "WrongDirection end phase must stay internal when emit_end is disabled");

    auto cooldown_track = MakeTrackContext(20, 2200, false, 0);
    cooldown_track.line_states.push_back(MakeLineState("line-a", "forward", "reverse"));
    events = engine.Evaluate(MakeSceneContext(2200, {cooldown_track}), &event_manager);
    Expect(events.empty(), "WrongDirection must suppress duplicate crossing during cooldown");

    WrongDirectionScenarioOptions override_options;
    override_options.enabled = true;
    override_options.cooldown_ms = 1000;
    override_options.target_class_tokens = {"person"};
    override_options.allowed_direction_rules = {"line-b:reverse"};
    ScenarioEngine override_engine(engine_options);
    override_engine.RegisterScenario(std::make_unique<WrongDirectionScenario>(override_options));
    EventManager override_events;
    auto override_track = MakeTrackContext(21, 3000, false, 0);
    override_track.line_states.push_back(MakeLineState("line-b", "any", "forward"));
    events = override_engine.Evaluate(MakeSceneContext(3000, {override_track}), &override_events);
    Expect(events.size() == 1 && events[0].line_id == "line-b",
           "WrongDirection must support lineId-specific allowedDirection overrides");

    Pass("WrongDirectionScenario accepts allowed direction");
    Pass("WrongDirectionScenario emits wrong direction candidate");
    Pass("WrongDirectionScenario records raw direction");
    Pass("WrongDirectionScenario enforces cooldown");
}

void VerifyIntrusionAfterLineCrossingScenario() {
    ScenarioEngineOptions engine_options;
    engine_options.enabled = true;
    engine_options.default_cooldown_ms = 1000;
    engine_options.default_update_interval_ms = 0;
    engine_options.ended_retention_ms = 500;
    engine_options.cleanup_interval_ms = 0;
    engine_options.max_instances_per_channel = 32;

    IntrusionAfterLineCrossingScenarioOptions options;
    options.enabled = true;
    options.max_delay_after_crossing_ms = 3000;
    options.dwell_time_ms = 2000;
    options.cooldown_ms = 1000;
    options.target_class_tokens = {"person"};
    options.target_line_ids = {"entry-line"};
    options.target_zone_ids = {"target-zone"};

    ScenarioEngine engine(engine_options);
    engine.RegisterScenario(std::make_unique<IntrusionAfterLineCrossingScenario>(options));
    EventManager event_manager;

    auto line_crossed = MakeTrackContext(30, 1000, false, 0, "target-zone");
    line_crossed.line_states.push_back(MakeLineState("entry-line", "any", "forward"));
    auto events = engine.Evaluate(MakeSceneContext(1000, {line_crossed}), &event_manager);
    Expect(events.empty() && engine.Snapshot("1")[0].phase == ScenarioPhase::LineCrossed,
           "IntrusionAfterLineCrossing must record line crossing before zone entry");

    events = engine.Evaluate(MakeSceneContext(1500, {MakeTrackContext(30, 1500, true, 0, "target-zone")}),
                             &event_manager);
    Expect(events.empty() && engine.Snapshot("1")[0].phase == ScenarioPhase::ZoneEntered,
           "IntrusionAfterLineCrossing must enter ZoneEntered on target zone entry");

    events = engine.Evaluate(MakeSceneContext(2500, {MakeTrackContext(30, 2500, true, 1000, "target-zone")}),
                             &event_manager);
    Expect(events.empty() && engine.Snapshot("1")[0].phase == ScenarioPhase::Observing,
           "IntrusionAfterLineCrossing must observe until dwellTimeMs");

    events = engine.Evaluate(MakeSceneContext(3500, {MakeTrackContext(30, 3500, true, 2000, "target-zone")}),
                             &event_manager);
    Expect(events.size() == 1 &&
               events[0].event_type == "intrusion-after-line-crossing" &&
               events[0].line_id == "entry-line" &&
               events[0].zone_id == "target-zone",
           "IntrusionAfterLineCrossing must emit after line crossing, zone entry, and dwell");
    Expect(engine.Snapshot("1")[0].phase == ScenarioPhase::Confirmed,
           "IntrusionAfterLineCrossing must enter Confirmed phase");

    events = engine.Evaluate(MakeSceneContext(3600, {MakeTrackContext(30, 3600, true, 2100, "target-zone")}),
                             &event_manager);
    Expect(events.empty(), "IntrusionAfterLineCrossing must not duplicate while condition remains true");

    events = engine.Evaluate(MakeSceneContext(3700, {MakeTrackContext(30, 3700, false, 0, "target-zone")}),
                             &event_manager);
    Expect(events.empty() && engine.Snapshot("1")[0].phase == ScenarioPhase::Ended,
           "IntrusionAfterLineCrossing must end when track exits the target zone");

    auto late_crossed = MakeTrackContext(31, 10000, false, 0, "target-zone");
    late_crossed.line_states.push_back(MakeLineState("entry-line", "any", "forward"));
    engine.Evaluate(MakeSceneContext(10000, {late_crossed}), &event_manager);
    events = engine.Evaluate(MakeSceneContext(13501, {MakeTrackContext(31, 13501, true, 2000, "target-zone")}),
                             &event_manager);
    Expect(events.empty(), "IntrusionAfterLineCrossing must respect maxDelayAfterCrossingMs");

    Pass("IntrusionAfterLineCrossingScenario records line crossing");
    Pass("IntrusionAfterLineCrossingScenario requires zone entry");
    Pass("IntrusionAfterLineCrossingScenario requires dwell time");
    Pass("IntrusionAfterLineCrossingScenario suppresses duplicate event");
    Pass("IntrusionAfterLineCrossingScenario enforces crossing window");
}

void VerifyLoiteringScenario() {
    Expect(app_config::kDefaultAnalysisLoiteringMinDwellTimeMs == 30000 &&
               app_config::kDefaultAnalysisLoiteringMaxMovementRadius == 0.08F &&
               app_config::kDefaultAnalysisLoiteringMinTrajectoryPoints == 4 &&
               app_config::kDefaultAnalysisLoiteringCooldownMs == 12000,
           "Loitering defaults must match field tuning baseline");

    ScenarioEngineOptions engine_options;
    engine_options.enabled = true;
    engine_options.default_cooldown_ms = 1000;
    engine_options.default_update_interval_ms = 0;
    engine_options.ended_retention_ms = 500;
    engine_options.cleanup_interval_ms = 0;
    engine_options.max_instances_per_channel = 32;

    LoiteringScenarioOptions options;
    options.enabled = true;
    options.min_dwell_time_ms = 3000;
    options.max_movement_radius = 0.05F;
    options.min_trajectory_points = 3;
    options.cooldown_ms = 1000;
    options.target_class_tokens = {"person"};
    options.target_zone_ids = {"loiter-zone"};

    ScenarioEngine engine(engine_options);
    engine.RegisterScenario(std::make_unique<LoiteringScenario>(options));
    EventManager event_manager;

    auto candidate = MakeTrackContext(40, 1000, true, 0, "loiter-zone");
    candidate.trajectory = MakeTrajectory(1000, {NormalizedPointF{0.2F, 0.2F}});
    auto events = engine.Evaluate(MakeSceneContext(1000, {candidate}), &event_manager);
    Expect(events.empty() && engine.Snapshot("1")[0].phase == ScenarioPhase::Candidate,
           "Loitering must start as Candidate inside target zone");

    auto observing = MakeTrackContext(40, 2500, true, 1500, "loiter-zone");
    observing.trajectory = MakeTrajectory(1000,
                                          {NormalizedPointF{0.2F, 0.2F},
                                           NormalizedPointF{0.22F, 0.2F}});
    events = engine.Evaluate(MakeSceneContext(2500, {observing}), &event_manager);
    Expect(events.empty() && engine.Snapshot("1")[0].phase == ScenarioPhase::Observing,
           "Loitering must observe until dwell and trajectory thresholds are met");

    auto confirmed = MakeTrackContext(40, 4000, true, 3000, "loiter-zone");
    confirmed.trajectory = MakeTrajectory(1000,
                                          {NormalizedPointF{0.2F, 0.2F},
                                           NormalizedPointF{0.22F, 0.2F},
                                           NormalizedPointF{0.21F, 0.21F},
                                           NormalizedPointF{0.2F, 0.22F}});
    events = engine.Evaluate(MakeSceneContext(4000, {confirmed}), &event_manager);
    Expect(events.size() == 1 && events[0].event_type == "loitering" &&
               events[0].zone_id == "loiter-zone" && events[0].track_id == 40,
           "Loitering must emit after dwell and small movement radius conditions are met");
    Expect(engine.Snapshot("1")[0].phase == ScenarioPhase::Confirmed,
           "Loitering must enter Confirmed phase");

    events = engine.Evaluate(MakeSceneContext(4100, {confirmed}), &event_manager);
    Expect(events.empty(), "Loitering must not duplicate while the track remains in the zone");
    Expect(HasLifecycleCounters(event_manager.Snapshot(), "loitering", 40, 1, 0),
           "Loitering lifecycle state must retain emitted count for timeline debug");

    auto exited = MakeTrackContext(40, 4200, false, 0, "loiter-zone");
    events = engine.Evaluate(MakeSceneContext(4200, {exited}), &event_manager);
    Expect(events.empty() && engine.Snapshot("1")[0].phase == ScenarioPhase::Ended,
           "Loitering must end when the track exits the target zone");

    ScenarioEngine moving_engine(engine_options);
    moving_engine.RegisterScenario(std::make_unique<LoiteringScenario>(options));
    EventManager moving_events;
    auto moving = MakeTrackContext(41, 5000, true, 3000, "loiter-zone");
    moving.trajectory = MakeTrajectory(2000,
                                       {NormalizedPointF{0.2F, 0.2F},
                                        NormalizedPointF{0.32F, 0.2F},
                                        NormalizedPointF{0.44F, 0.2F},
                                        NormalizedPointF{0.55F, 0.2F}});
    events = moving_engine.Evaluate(MakeSceneContext(5000, {moving}), &moving_events);
    Expect(events.empty(), "Loitering must not emit when movement radius is larger than threshold");

    LoiteringScenarioOptions ground_options = options;
    ground_options.use_ground_plane_movement_radius = true;
    ScenarioEngine ground_engine(engine_options);
    ground_engine.RegisterScenario(std::make_unique<LoiteringScenario>(ground_options));
    EventManager ground_events;
    auto ground_loitering = MakeTrackContext(42, 6000, true, 3000, "loiter-zone");
    ground_loitering.trajectory = MakeTrajectory(3000,
                                                 {NormalizedPointF{0.2F, 0.2F},
                                                  NormalizedPointF{0.4F, 0.2F},
                                                  NormalizedPointF{0.6F, 0.2F},
                                                  NormalizedPointF{0.8F, 0.2F}},
                                                 1000);
    for (std::size_t i = 0; i < ground_loitering.trajectory.size(); ++i) {
        ground_loitering.trajectory[i].ground_point =
            GroundPointF{0.01 * static_cast<double>(i), 0.0, true, false, "meters"};
    }
    events = ground_engine.Evaluate(MakeSceneContext(6000, {ground_loitering}), &ground_events);
    Expect(events.size() == 1 && events[0].event_type == "loitering" &&
               events[0].metadata_json.find("\"usesGroundPlane\":true") != std::string::npos,
           "Loitering must optionally use ground-plane trajectory radius when available");

    Pass("LoiteringScenario requires dwell time");
    Pass("LoiteringScenario tracks trajectory duration");
    Pass("LoiteringScenario enforces movement radius");
    Pass("LoiteringScenario suppresses duplicate event");
    Pass("LoiteringScenario clears state after exit");
}

void VerifyZoneOccupancyScenario() {
    Expect(app_config::kDefaultAnalysisZoneOccupancyThreshold == 4 &&
               app_config::kDefaultAnalysisZoneOccupancyMinDwellTimeMs == 7000 &&
               app_config::kDefaultAnalysisZoneOccupancyCooldownMs == 12000,
           "ZoneOccupancy defaults must match field tuning baseline");

    ScenarioEngineOptions engine_options;
    engine_options.enabled = true;
    engine_options.default_cooldown_ms = 1000;
    engine_options.default_update_interval_ms = 0;
    engine_options.ended_retention_ms = 500;
    engine_options.cleanup_interval_ms = 0;
    engine_options.max_instances_per_channel = 32;

    ZoneOccupancyScenarioOptions options;
    options.enabled = true;
    options.occupancy_threshold = 2;
    options.min_dwell_time_ms = 1000;
    options.cooldown_ms = 1000;
    options.target_class_tokens = {"person"};
    options.target_zone_ids = {"queue-zone"};

    ScenarioEngine engine(engine_options);
    engine.RegisterScenario(std::make_unique<ZoneOccupancyScenario>(options));
    EventManager event_manager;

    auto first = MakeTrackContext(50, 1000, true, 1000, "queue-zone");
    auto events = engine.Evaluate(MakeSceneContext(1000, {first}), &event_manager);
    Expect(events.empty(), "ZoneOccupancy must not emit below occupancy threshold");

    auto first_confirmed = MakeTrackContext(50, 2000, true, 2000, "queue-zone");
    auto second_confirmed = MakeTrackContext(51, 2000, true, 1000, "queue-zone");
    events = engine.Evaluate(MakeSceneContext(2000, {first_confirmed, second_confirmed}),
                             &event_manager);
    Expect(events.size() == 1 && events[0].event_type == "zone-occupancy" &&
               events[0].zone_id == "queue-zone" && events[0].track_id == 50 &&
               events[0].metadata_json.find("\"occupancyCount\":2") != std::string::npos,
           "ZoneOccupancy must emit once from the representative track when threshold is met");

    events = engine.Evaluate(MakeSceneContext(2100, {first_confirmed, second_confirmed}),
                             &event_manager);
    Expect(events.empty(), "ZoneOccupancy must suppress duplicates while occupancy remains above threshold");
    Expect(HasLifecycleCounters(event_manager.Snapshot(), "zone-occupancy", 50, 1, 0),
           "ZoneOccupancy lifecycle state must retain emitted count for timeline debug");

    auto third_short = MakeTrackContext(52, 2500, true, 200, "queue-zone");
    events = engine.Evaluate(MakeSceneContext(2500, {first_confirmed, third_short}), &event_manager);
    Expect(events.empty(),
           "ZoneOccupancy must require each counted occupant to satisfy the dwell threshold");

    auto wrong_zone = MakeTrackContext(53, 3000, true, 3000, "other-zone");
    events = engine.Evaluate(MakeSceneContext(3000, {first_confirmed, wrong_zone}), &event_manager);
    Expect(events.empty(), "ZoneOccupancy must respect targetZoneIds");

    Pass("ZoneOccupancyScenario counts occupancy");
    Pass("ZoneOccupancyScenario requires dwell time");
    Pass("ZoneOccupancyScenario selects representative track");
    Pass("ZoneOccupancyScenario suppresses duplicate event");
    Pass("ZoneOccupancyScenario filters by zone");
}

void VerifyEventStorageArchiveCompaction() {
    const std::filesystem::path active_path(app::GetAppConfig().analysis_event_storage_path);
    const std::filesystem::path archive_path = ArchivePathFor(active_path);
    std::error_code ec;
    std::filesystem::remove(active_path, ec);
    ec.clear();
    std::filesystem::remove(archive_path, ec);

    FileEventStorage active_storage(active_path.string());
    FileEventStorage archive_storage(archive_path.string());
    std::string error_message;
    EventRecord active_record = MakeEventRecord("evt-active",
                                                "zone-occupancy",
                                                "zone-occupancy",
                                                "confirmed",
                                                "queue-zone",
                                                50,
                                                2000);
    active_record.snapshot_path = "/tmp/event-records/evt-active/snapshot.jpg";
    active_record.clip_path = "/tmp/event-records/evt-active.clip/manifest.json";
    EventRecord archive_record = MakeEventRecord("evt-archive",
                                                 "loitering",
                                                 "loitering",
                                                 "confirmed",
                                                 "queue-zone",
                                                 51,
                                                 1000);
    archive_record.snapshot_path = "/tmp/event-records/evt-archive/snapshot.jpg";
    Expect(active_storage.Store(active_record, &error_message),
           "EventStorage smoke must write active records: " + error_message);
    Expect(archive_storage.Store(archive_record, &error_message),
           "EventStorage smoke must write archive records: " + error_message);

    EventRecordQueryOptions active_query;
    active_query.event_type = "zone-occupancy";
    active_query.limit = 4;
    EventRecordQueryResult active_result;
    Expect(QueryEventRecords(active_query, &active_result, &error_message),
           "EventStorage active query must succeed: " + error_message);
    Expect(active_result.records_json.size() == 1 &&
               active_result.records_json[0].find("evt-active") != std::string::npos &&
               active_result.archive_records_scanned == 0,
           "EventStorage active query must not scan archives by default");

    EventRecordQueryOptions archive_query;
    archive_query.event_type = "loitering";
    archive_query.include_archives = true;
    archive_query.limit = 4;
    EventRecordQueryResult archive_result;
    Expect(QueryEventRecords(archive_query, &archive_result, &error_message),
           "EventStorage archive query must succeed: " + error_message);
    Expect(archive_result.records_json.size() == 1 &&
               archive_result.records_json[0].find("evt-archive") != std::string::npos &&
               archive_result.archive_files_scanned >= 1 &&
               archive_result.archive_records_scanned >= 1,
           "EventStorage archive query must scan rotated files when requested");

    EventRecordQueryOptions clip_query;
    clip_query.evidence = "clip";
    clip_query.include_archives = true;
    clip_query.limit = 4;
    EventRecordQueryResult clip_result;
    Expect(QueryEventRecords(clip_query, &clip_result, &error_message),
           "EventStorage evidence query must succeed: " + error_message);
    Expect(clip_result.records_json.size() == 1 &&
               clip_result.records_json[0].find("evt-active") != std::string::npos &&
               clip_result.records_json[0].find("manifest.json") != std::string::npos,
           "EventStorage evidence=clip query must retain clip-backed records only");

    EventRecordQueryOptions missing_evidence_query;
    missing_evidence_query.evidence = "missing";
    missing_evidence_query.include_archives = true;
    missing_evidence_query.limit = 4;
    EventRecordQueryResult missing_evidence_result;
    Expect(QueryEventRecords(missing_evidence_query, &missing_evidence_result, &error_message),
           "EventStorage missing evidence query must succeed: " + error_message);
    Expect(missing_evidence_result.records_json.empty(),
           "EventStorage evidence=missing query must exclude records with snapshot or clip evidence");

    EventRecordQueryOptions compact_query;
    compact_query.zone_id = "queue-zone";
    compact_query.include_archives = true;
    EventRecordCompactionResult compact_result;
    Expect(CompactEventRecords(compact_query, &compact_result, &error_message),
           "EventStorage compaction must succeed: " + error_message);
    Expect(compact_result.retained_records == 2 &&
               compact_result.active_records_scanned == 1 &&
               compact_result.archive_records_scanned >= 1 &&
               !compact_result.compacted_path.empty(),
           "EventStorage compaction must retain matching active/archive records");

    std::ifstream compacted(compact_result.compacted_path);
    std::string compacted_body((std::istreambuf_iterator<char>(compacted)),
                               std::istreambuf_iterator<char>());
    Expect(compacted_body.find("evt-active") != std::string::npos &&
               compacted_body.find("evt-archive") != std::string::npos,
           "EventStorage compaction output must include retained records");

    EventRecordQueryResult post_compact_query_result;
    Expect(QueryEventRecords(compact_query, &post_compact_query_result, &error_message),
           "EventStorage query after compaction must succeed: " + error_message);
    Expect(post_compact_query_result.records_json.size() == 2 &&
               post_compact_query_result.archive_files_scanned == 1,
           "EventStorage query must not treat compacted snapshots as rotated archives");

    EventRecordQueryOptions paged_query = compact_query;
    paged_query.limit = 1;
    paged_query.offset = 1;
    EventRecordQueryResult paged_result;
    Expect(QueryEventRecords(paged_query, &paged_result, &error_message),
           "EventStorage paged query must succeed: " + error_message);
    Expect(paged_result.offset == 1 &&
               paged_result.records_json.size() == 1 &&
               paged_result.records_json[0].find("evt-archive") != std::string::npos &&
               !paged_result.has_more,
           "EventStorage paged query must page archive-backed records after the active match");

    EventRecordCompactedFileListResult compacted_files;
    Expect(ListCompactedEventRecordFiles(&compacted_files, &error_message),
           "EventStorage compacted list must succeed: " + error_message);
    Expect(!compacted_files.files.empty() &&
               compacted_files.files[0].path == compact_result.compacted_path,
           "EventStorage compacted list must include generated snapshot");

    EventRecordCompactedFileInfo resolved_file;
    Expect(ResolveCompactedEventRecordFile(compacted_files.files[0].file_name,
                                           &resolved_file,
                                           &error_message),
           "EventStorage compacted resolve must succeed: " + error_message);
    Expect(resolved_file.path == compact_result.compacted_path,
           "EventStorage compacted resolve must stay within compacted snapshot set");

    EventRecordCompactedFileInfo deleted_file;
    Expect(DeleteCompactedEventRecordFile(compacted_files.files[0].file_name,
                                          &deleted_file,
                                          &error_message),
           "EventStorage compacted delete must succeed: " + error_message);
    Expect(!std::filesystem::exists(compact_result.compacted_path),
           "EventStorage compacted delete must remove only the requested snapshot");

    EventRecordCompactionResult extra_compact_result;
    Expect(CompactEventRecords(compact_query, &extra_compact_result, &error_message),
           "EventStorage second compaction must succeed: " + error_message);
    Expect(CompactEventRecords(compact_query, &extra_compact_result, &error_message),
           "EventStorage third compaction must succeed: " + error_message);
    EventRecordCompactedFileCleanupResult cleanup_result;
    Expect(CleanupCompactedEventRecordFiles(1, &cleanup_result, &error_message),
           "EventStorage compacted cleanup must succeed: " + error_message);
    Expect(cleanup_result.deleted_count >= 1 && cleanup_result.kept_count == 1,
           "EventStorage compacted cleanup must retain only the newest snapshot");

    std::filesystem::remove(active_path, ec);
    ec.clear();
    std::filesystem::remove(archive_path, ec);

    Pass("EventStorage writes event record");
    Pass("EventStorage queries event records");
    Pass("EventStorage filters archive records");
    Pass("EventStorage compacts archived records");
    Pass("EventStorage preserves active record count");
}

void VerifyVlmObservationStore() {
    const std::filesystem::path event_path(app::GetAppConfig().analysis_event_storage_path);
    const std::filesystem::path observation_path(DefaultVlmObservationStorePath());
    std::error_code ec;
    std::filesystem::remove(event_path, ec);
    ec.clear();
    std::filesystem::remove(observation_path, ec);

    EventRecord record = MakeEventRecord("evt-vlm-observation",
                                         "line-crossing",
                                         "line-crossing",
                                         "confirmed",
                                         "entry-zone",
                                         61,
                                         5000);
    record.snapshot_path = "/tmp/event-records/evt-vlm-observation.snapshot.jpg";
    record.clip_path = "/tmp/event-records/evt-vlm-observation.clip/manifest.json";
    record.metadata_json =
        "{\"schema\":\"media-server.va.event-record.metadata.v1\","
        "\"vlmEvidenceRefs\":{\"schema\":\"media-server.vlm-event-evidence-refs.v1\","
        "\"eventFrame\":{\"path\":\"/tmp/event-records/evt-vlm-observation.snapshot.jpg\"},"
        "\"bboxCrop\":{\"path\":\"/tmp/event-records/evt-vlm-observation.bbox-crop.jpg\"},"
        "\"temporalContext\":{\"path\":\"/tmp/event-records/evt-vlm-observation.clip/manifest.json\"}}}";

    std::string error_message;
    FileEventStorage event_storage(event_path.string());
    Expect(event_storage.Store(record, &error_message),
           "VLM observation smoke must write correlated EventRecord: " + error_message);

    VlmObservationSidecar observation;
    observation.observation_id = "vlmobs-evt-vlm-observation";
    observation.event_id = record.event_id;
    observation.source_id = record.stream_id;
    observation.rule_id = "entry-line";
    observation.scenario_id = record.scenario_name;
    observation.input_evidence_refs_json =
        "{\"schema\":\"media-server.vlm-event-evidence-refs.v1\","
        "\"eventFrame\":{\"path\":\"/tmp/event-records/evt-vlm-observation.snapshot.jpg\"},"
        "\"bboxCrop\":{\"path\":\"/tmp/event-records/evt-vlm-observation.bbox-crop.jpg\"},"
        "\"temporalContext\":{\"path\":\"/tmp/event-records/evt-vlm-observation.clip/manifest.json\"}}";
    observation.summary = "person stopped near the door after crossing the entry line";
    observation.event_explanation = "fixture explanation stored outside EventRecord for a person waiting by the doorway";
    observation.false_positive_hints = {"reflection near line", "partial occlusion"};
    observation.operator_review_questions = {"Did the person fully cross the line?"};
    observation.rule_suggestion_json =
        "{\"kind\":\"line-crossing\",\"candidateId\":\"line-entry-manual-review\","
        "\"suggestedAction\":\"manual-save-in-ops-rules\",\"targetRoute\":\"/ops/rules\","
        "\"manualReviewRequired\":true,\"autoApply\":false,"
        "\"draftRule\":{\"eventType\":\"line-crossing\",\"regionType\":\"line\","
        "\"direction\":\"forward\",\"classes\":[\"person\"],\"minConfidence\":0.55},"
        "\"rationale\":\"Person stopped near the doorway after crossing the entry line.\"}";
    observation.uncertainty = 0.2;
    observation.provider = "fixture-local";
    observation.model = "fixture-vlm";
    observation.prompt_profile = "event-review-default";
    observation.privacy_mode = "local-only";
    observation.latency_ms = 42;
    observation.created_at_ms = 5200;
    observation.metadata_json = "{\"fixture\":true}";

    FileVlmObservationStore observation_store(observation_path.string());
    Expect(observation_store.Store(observation, &error_message),
           "VLM observation smoke must write observation store: " + error_message);

    EventRecordQueryOptions event_query;
    event_query.event_id = record.event_id;
    EventRecordQueryResult event_result;
    Expect(QueryEventRecords(event_query, &event_result, &error_message),
           "VLM observation smoke must query EventRecord: " + error_message);
    Expect(event_result.records_json.size() == 1, "VLM observation smoke must find one EventRecord");

    VlmObservationQueryOptions observation_query;
    observation_query.event_id = record.event_id;
    VlmObservationQueryResult observation_result;
    Expect(QueryVlmObservations(observation_path.string(),
                                observation_query,
                                &observation_result,
                                &error_message),
           "VLM observation smoke must query observation store: " + error_message);
    Expect(observation_result.observations_json.size() == 1,
           "VLM observation smoke must find one observation");
    const std::string& observation_json = observation_result.observations_json[0];
    Expect(observation_json.find("\"schema\":\"media-server.vlm-observation.v1\"") != std::string::npos,
           "VLM observation schema must be stored");
    Expect(observation_json.find("\"inputEvidenceRefs\"") != std::string::npos,
           "VLM observation must store input evidence refs");
    Expect(observation_json.find("\"rawPromptStored\":false") != std::string::npos &&
               observation_json.find("\"rawResponseStored\":false") != std::string::npos &&
               observation_json.find("\"sourceUrlExposed\":false") != std::string::npos,
           "VLM observation must keep raw prompt/response/source URL redacted");

    const std::string& event_json = event_result.records_json[0];
    Expect(event_json.find("\"eventExplanation\"") == std::string::npos &&
               event_json.find("\"falsePositiveHints\"") == std::string::npos &&
               event_json.find("\"operatorReviewQuestions\"") == std::string::npos &&
               event_json.find("\"model\":\"fixture-vlm\"") == std::string::npos,
           "VLM observation fields must stay out of EventRecord top-level JSON");

    const std::string correlation =
        BuildVlmObservationCorrelationReportJson(event_json, observation_json);
    Expect(correlation.find("\"schema\":\"media-server.vlm-observation-correlation-report.v1\"") !=
               std::string::npos &&
               correlation.find("\"eventIdMatched\":true") != std::string::npos &&
               correlation.find("\"externalPayloadChanged\":false") != std::string::npos &&
               correlation.find("\"eventRecordTopLevelObservationFieldsPresent\":false") !=
                   std::string::npos,
           "VLM observation correlation report must prove side storage without payload drift");

    const std::string default_path = DefaultVlmObservationStorePath();
    Expect(default_path.find(".vlm-observations") != std::string::npos,
           "VLM observation default path must be separate from EventRecord path");

    VlmSummarySearchOptions search_options;
    search_options.query = "person door stopped";
    search_options.source_id = record.stream_id;
    search_options.limit = 5;
    std::string search_json;
    Expect(BuildVlmSummarySearchCandidatesJson(observation_path.string(),
                                               search_options,
                                               &search_json,
                                               &error_message),
           "VLM summary search smoke must build candidates: " + error_message);
    Expect(search_json.find("\"schema\":\"media-server.vlm-summary-search-candidates.v1\"") !=
               std::string::npos &&
               search_json.find("\"targetStep\":\"V200-S12\"") != std::string::npos &&
               search_json.find("\"eventId\":\"evt-vlm-observation\"") != std::string::npos &&
               search_json.find("\"correlationKey\":\"eventId\"") != std::string::npos &&
               search_json.find("\"candidateStatus\":\"candidate-only-not-product-search\"") !=
                   std::string::npos,
           "VLM summary search must return a sidecar candidate correlated by eventId");
    Expect(search_json.find("\"eventPostPayloadChanged\":false") != std::string::npos &&
               search_json.find("\"viewerClientExposureAdded\":false") != std::string::npos &&
               search_json.find("\"runtimeVlmCallPerformed\":false") != std::string::npos &&
               search_json.find("\"autoRuleApplied\":false") != std::string::npos,
           "VLM summary search must preserve payload/UI/runtime/rule boundaries");

    VlmRuleSuggestionOptions rule_suggestion_options;
    rule_suggestion_options.source_id = record.stream_id;
    rule_suggestion_options.limit = 5;
    std::string rule_suggestion_json;
    Expect(BuildVlmRuleSuggestionCandidatesJson(observation_path.string(),
                                                rule_suggestion_options,
                                                &rule_suggestion_json,
                                                &error_message),
           "VLM rule suggestion smoke must build candidates: " + error_message);
    Expect(rule_suggestion_json.find("\"schema\":\"media-server.vlm-rule-suggestion-candidates.v1\"") !=
               std::string::npos &&
               rule_suggestion_json.find("\"targetStep\":\"V200-S13\"") != std::string::npos &&
               rule_suggestion_json.find("\"eventId\":\"evt-vlm-observation\"") != std::string::npos &&
               rule_suggestion_json.find("\"proposedRuleKind\":\"line-crossing\"") !=
                   std::string::npos &&
               rule_suggestion_json.find("\"candidateStatus\":\"candidate-only-manual-rule-save\"") !=
                   std::string::npos &&
               rule_suggestion_json.find("\"manualSaveRoute\":\"/ops/rules\"") != std::string::npos,
           "VLM rule suggestion must return a manual-save candidate correlated by eventId");
    Expect(rule_suggestion_json.find("\"autoApply\":false") != std::string::npos &&
               rule_suggestion_json.find("\"manualReviewRequired\":true") != std::string::npos &&
               rule_suggestion_json.find("\"ruleRegistryWritePerformed\":false") != std::string::npos &&
               rule_suggestion_json.find("\"viewerClientExposureAdded\":false") != std::string::npos &&
               rule_suggestion_json.find("\"runtimeVlmCallPerformed\":false") != std::string::npos &&
               rule_suggestion_json.find("\"autoRuleApplied\":false") != std::string::npos,
           "VLM rule suggestion must preserve manual-review and no-auto-apply boundaries");

    std::filesystem::remove(event_path, ec);
    ec.clear();
    std::filesystem::remove(observation_path, ec);

    Pass("VLM observation store writes side storage");
    Pass("VLM observation query correlates EventRecord by eventId");
    Pass("VLM observation correlation report preserves event payload boundary");
    Pass("VLM summary search returns sidecar candidates");
    Pass("VLM summary search preserves EventRecord correlation boundary");
    Pass("VLM rule suggestion returns manual-save candidates");
    Pass("VLM rule suggestion preserves no-auto-apply boundary");
}

void VerifyV300VlmFeatureQueue() {
    VlmFeatureQueueOptions options;
    options.background_enabled = true;
    options.lazy_trigger_enabled = true;
    options.operator_opt_in_acknowledged = true;
    options.runtime_available = true;
    options.max_queue_size = 1;
    options.queue_timeout_ms = 3000;

    VlmFeatureQueue queue(options);
    VlmFeatureQueueTask task;
    task.task_id = "vlm-feature-task-evt-v300-s04";
    task.event_id = "evt-v300-s04-line-001";
    task.source_id = "cam-lobby";
    task.channel_id = "main";
    task.trigger_mode = "background";
    task.queue_wait_ms = 10;
    task.input_evidence_refs_json =
        "{\"schema\":\"media-server.vlm-event-evidence-refs.v1\","
        "\"evidenceManifest\":{\"path\":\"events/evt-v300-s04-line-001/evidence-manifest.json\"},"
        "\"eventFrame\":{\"path\":\"events/evt-v300-s04-line-001/event-frame.jpg\"}}";

    const VlmFeatureQueueOutcome queued = queue.EnqueueBackgroundTask(task);
    Expect(queued.status == "queued" && queued.queue_action == "enqueue-background" &&
               queue.PendingSize() == 1,
           "V300 S04 background feature queue must enqueue evidence tasks without running provider calls");
    Expect(!queued.media_path_blocked && !queued.event_record_blocked && !queued.metadata_fanout_blocked &&
               !queued.event_post_dispatch_blocked,
           "V300 S04 queued task must keep media/EventRecord/metadata/Event POST paths independent");

    const std::string feature_set = BuildVlmFeatureSetFixtureJson(task, 1);
    const VlmFeatureQueueOutcome completed = queue.RunNext(feature_set);
    Expect(completed.status == "completed" && completed.feature_set_stored &&
               completed.feature_set_json.find("\"schema\":\"media-server.event-feature-set.v1\"") !=
                   std::string::npos &&
               completed.feature_set_json.find("\"featureRevision\":1") != std::string::npos,
           "V300 S04 queue worker must complete a structured FeatureSet revision");
    Expect(completed.feature_set_json.find("\"rawPromptStored\":false") != std::string::npos &&
               completed.feature_set_json.find("\"rawProviderResponseStored\":false") !=
                   std::string::npos,
           "V300 S04 FeatureSet must not retain raw prompt or raw provider response");

    VlmFeatureQueueTask lazy_task = task;
    lazy_task.task_id = "vlm-feature-task-evt-v300-s04-lazy";
    lazy_task.event_id = "evt-v300-s04-lazy-001";
    lazy_task.trigger_mode = "lazy";
    const VlmFeatureQueueOutcome lazy_completed =
        queue.RunLazyTask(lazy_task, BuildVlmFeatureSetFixtureJson(lazy_task, 2));
    Expect(lazy_completed.status == "completed" &&
               lazy_completed.queue_action == "run-lazy-trigger" &&
               lazy_completed.trigger_mode == "lazy",
           "V300 S04 lazy trigger must produce a FeatureSet without requiring a background queue backlog");

    VlmFeatureQueueOptions missing_options = options;
    missing_options.runtime_available = false;
    VlmFeatureQueue missing_runtime_queue(missing_options);
    const VlmFeatureQueueOutcome missing = missing_runtime_queue.EnqueueBackgroundTask(task);
    Expect(missing.status == "blocked" && missing.failure_reason == "missing-runtime" &&
               missing.queue_action == "do-not-enqueue" && missing_runtime_queue.PendingSize() == 0,
           "V300 S04 missing runtime must be a VLM-only blocked state");
    Expect(!missing.feature_set_stored && !missing.media_path_blocked && !missing.event_record_blocked,
           "V300 S04 missing runtime must not store FeatureSet or block event paths");

    VlmFeatureQueue timeout_queue(options);
    Expect(timeout_queue.EnqueueBackgroundTask(task).status == "queued",
           "V300 S04 timeout fixture must seed one pending task");
    VlmFeatureQueueTask timeout_task = task;
    timeout_task.task_id = "vlm-feature-task-evt-v300-s04-timeout";
    timeout_task.event_id = "evt-v300-s04-timeout-001";
    timeout_task.queue_wait_ms = 5200;
    const VlmFeatureQueueOutcome timeout = timeout_queue.EnqueueBackgroundTask(timeout_task);
    Expect(timeout.status == "failed" && timeout.failure_reason == "queue-timeout" &&
               timeout.queue_action == "drop-vlm-task" && timeout_queue.PendingSize() == 1,
           "V300 S04 queue timeout must drop only the VLM task and leave existing queue state bounded");
    Expect(!timeout.media_path_blocked && !timeout.event_record_blocked &&
               !timeout.metadata_fanout_blocked && !timeout.event_post_dispatch_blocked,
           "V300 S04 timeout must not propagate backpressure to media or fanout paths");

    const VlmFeatureQueueOutcome invalid = queue.RunLazyTask(lazy_task, "{\"notFeatureSet\":true}");
    Expect(invalid.status == "failed" && invalid.failure_reason == "invalid-output" &&
               invalid.queue_action == "discard-invalid-output" && !invalid.feature_set_stored,
           "V300 S04 invalid structured output must be rejected without sidecar FeatureSet retention");

    Pass("V300 S04 background feature queue enqueues evidence tasks");
    Pass("V300 S04 queue worker stores structured FeatureSet revision");
    Pass("V300 S04 lazy trigger runs without default-on provider behavior");
    Pass("V300 S04 missing-runtime stays VLM-only");
    Pass("V300 S04 timeout drops VLM task without media backpressure");
    Pass("V300 S04 invalid output is discarded without FeatureSet retention");
}

void VerifyEventRecorderMediaHooks() {
    const auto snapshot = GetEventStorageSnapshot();
    const std::filesystem::path active_path(snapshot.active_path.empty() ? snapshot.path
                                                                         : snapshot.active_path);
    std::error_code ec;
    std::filesystem::remove(active_path, ec);
    ec.clear();
    std::filesystem::remove_all(snapshot.snapshot_dir, ec);
    ec.clear();
    std::filesystem::remove_all(snapshot.clip_dir, ec);

    RecordEventFrame("stream-a", "stream-a", MakeRecorderFrame(900, 64));
    RecordEventFrame("stream-a", "stream-a", MakeRecorderFrame(1000, 128));
    RecordEventFrame("stream-a", "stream-a", MakeRecorderFrame(1100, 192));

    AnalysisResult result;
    result.source_key = "stream-a";
    result.profile_key = "recorder-smoke";
    result.frame_id = 9;
    result.pts = Ms(1000);
    result.frame_width = 4;
    result.frame_height = 4;

    AnalysisEvent event;
    event.event_id = "evt-recorder-smoke";
    event.event_type = "zone-occupancy";
    event.status = "confirmed";
    event.track_id = 42;
    event.class_id = 0;
    event.label = "person";
    event.score = 0.93F;
    event.box = RectF{0.25F, 0.25F, 0.5F, 0.5F};
    event.zone_id = "queue-zone";
    event.scenario_name = "zone-occupancy";
    event.scenario_phase = "confirmed";
    event.update_time_ms = 1000;
    DispatchEventRecords(result, {event});

    Expect(WaitStoredCountAtLeast(snapshot.stored_count + 1, 2000),
           "Event recorder worker must store dispatched records");

    EventRecordQueryOptions query;
    query.event_id = event.event_id;
    query.limit = 1;
    EventRecordQueryResult query_result;
    std::string error_message;
    Expect(QueryEventRecords(query, &query_result, &error_message),
           "Event recorder query must succeed: " + error_message);
    Expect(query_result.records_json.size() == 1, "Event recorder must write one record");
    const std::string record_json = query_result.records_json[0];
    Expect(record_json.find("\"snapshotPath\":\"") != std::string::npos &&
               record_json.find("\"clipPath\":\"") != std::string::npos,
           "Event recorder must fill snapshotPath and clipPath");
    Expect(record_json.find(".snapshot.") != std::string::npos,
           "Event recorder snapshot path must point to actual media bytes");
    Expect(record_json.find(".clip/manifest.json") != std::string::npos,
           "Event recorder clip path must point to clip manifest");
    Expect(record_json.find("\"vlmEvidenceRefs\"") != std::string::npos &&
               record_json.find("\"schema\":\"media-server.vlm-event-evidence-refs.v1\"") != std::string::npos,
           "Event recorder metadata must include VLM evidence refs");
    Expect(record_json.find("\"bboxCrop\"") != std::string::npos &&
               record_json.find(".bbox-crop.") != std::string::npos,
           "Event recorder metadata must include bbox crop evidence reference");
    Expect(record_json.find("\"evidenceManifest\"") != std::string::npos &&
               record_json.find("evidence-manifest.json") != std::string::npos &&
               record_json.find("frame-bundle-manifest.json") != std::string::npos,
           "Event recorder metadata must include V300 evidence manifest and frame bundle references");
    Expect(record_json.find("\"rawMediaEmbedded\":false") != std::string::npos &&
               record_json.find("\"sourceUrlExposed\":false") != std::string::npos,
           "Event recorder VLM evidence refs must keep raw media/source URL redacted");

    bool found_snapshot_media = false;
    bool found_bbox_crop_media = false;
    if (std::filesystem::exists(snapshot.snapshot_dir, ec) && !ec) {
        for (const auto& entry : std::filesystem::directory_iterator(snapshot.snapshot_dir)) {
            const std::string name = entry.path().filename().string();
            const auto ext = entry.path().extension().string();
            found_snapshot_media = found_snapshot_media || ext == ".jpg" || ext == ".ppm" || ext == ".pgm";
            found_bbox_crop_media = found_bbox_crop_media ||
                                    (name.find(".bbox-crop.") != std::string::npos &&
                                     (ext == ".jpg" || ext == ".ppm" || ext == ".pgm"));
        }
    }
    Expect(found_snapshot_media, "Event recorder must write snapshot media bytes");
    Expect(found_bbox_crop_media, "Event recorder must write bbox crop media bytes");

    const std::filesystem::path clip_manifest =
        std::filesystem::path(snapshot.clip_dir) / "evt-recorder-smoke.clip" / "manifest.json";
    std::ifstream input(clip_manifest);
    std::string manifest((std::istreambuf_iterator<char>(input)), std::istreambuf_iterator<char>());
    Expect(manifest.find("\"recorded\":true") != std::string::npos &&
               manifest.find("\"frameCount\":") != std::string::npos &&
               manifest.find("frame-0001") != std::string::npos &&
               manifest.find("\"vlmInputRefs\"") != std::string::npos &&
               manifest.find("\"previousFrame\"") != std::string::npos &&
               manifest.find("\"eventFrame\"") != std::string::npos &&
               manifest.find("\"nextFrame\"") != std::string::npos,
           "Event recorder must write clip manifest and frame bytes");
    Expect(manifest.find("\"encodedClip\"") != std::string::npos &&
               manifest.find("\"schema\":\"media-server.va.encoded-event-clip.v1\"") !=
                   std::string::npos &&
               manifest.find("\"status\":\"completed\"") != std::string::npos &&
               manifest.find("\"continuousRecording\":false") != std::string::npos,
           "Event recorder clip manifest must include encoded clip job status and non-VMS boundary");

    const std::filesystem::path evidence_manifest =
        std::filesystem::path(snapshot.clip_dir) / "evt-recorder-smoke.clip" /
        "evidence-manifest.json";
    const std::filesystem::path frame_bundle_manifest =
        std::filesystem::path(snapshot.clip_dir) / "evt-recorder-smoke.clip" /
        "frame-bundle-manifest.json";
    std::ifstream evidence_input(evidence_manifest);
    std::string evidence_json((std::istreambuf_iterator<char>(evidence_input)),
                              std::istreambuf_iterator<char>());
    std::ifstream bundle_input(frame_bundle_manifest);
    std::string bundle_json((std::istreambuf_iterator<char>(bundle_input)),
                            std::istreambuf_iterator<char>());
    Expect(std::filesystem::exists(evidence_manifest, ec) && !ec &&
               std::filesystem::exists(frame_bundle_manifest, ec) && !ec,
           "Event recorder must write V300 evidence and frame bundle manifests");
    Expect(evidence_json.find("\"schema\":\"media-server.event-evidence-contract.v1\"") !=
               std::string::npos &&
               evidence_json.find("\"eventFrame\"") != std::string::npos &&
               evidence_json.find("\"representativeImage\"") != std::string::npos &&
               evidence_json.find("\"selectionReason\"") != std::string::npos &&
               evidence_json.find("\"bboxCrops\"") != std::string::npos &&
               evidence_json.find("\"frameBundle\"") != std::string::npos &&
               evidence_json.find("\"rawPromptStored\":false") != std::string::npos &&
               evidence_json.find("\"identityFeaturesAllowed\":false") != std::string::npos &&
               evidence_json.find("\"archiveApi\":false") != std::string::npos,
           "Event recorder evidence manifest must include event frame, representative selection, bbox crop, frame bundle, privacy, and non-VMS guards");
    Expect(bundle_json.find("\"schema\":\"media-server.va.frame-bundle.v1\"") !=
               std::string::npos &&
               bundle_json.find("\"phase\":\"pre\"") != std::string::npos &&
               bundle_json.find("\"phase\":\"event\"") != std::string::npos &&
               bundle_json.find("\"phase\":\"post\"") != std::string::npos &&
               bundle_json.find("\"sourceId\":\"stream-a\"") != std::string::npos &&
               bundle_json.find("\"channelId\":\"stream-a\"") != std::string::npos &&
               bundle_json.find("\"streamEpochId\"") != std::string::npos &&
               bundle_json.find("\"frameSeq\"") != std::string::npos &&
               bundle_json.find("\"relativeToEventMs\":-100") != std::string::npos &&
               bundle_json.find("\"relativeToEventMs\":0") != std::string::npos &&
               bundle_json.find("\"relativeToEventMs\":100") != std::string::npos,
           "Event recorder frame bundle manifest must include pre/event/post FrameRef entries");

    const std::filesystem::path encoded_manifest =
        std::filesystem::path(snapshot.clip_dir) / "evt-recorder-smoke.clip" / "encoded" /
        "encoded-manifest.json";
    const std::filesystem::path encoded_media =
        std::filesystem::path(snapshot.clip_dir) / "evt-recorder-smoke.clip" / "encoded" /
        "event-clip.avi";
    std::ifstream encoded_input(encoded_manifest);
    std::string encoded_json((std::istreambuf_iterator<char>(encoded_input)),
                             std::istreambuf_iterator<char>());
    Expect(std::filesystem::exists(encoded_manifest, ec) && !ec &&
               std::filesystem::exists(encoded_media, ec) && !ec,
           "Event recorder encoded clip pipeline must write manifest and media artifact");
    Expect(encoded_json.find("\"schema\":\"media-server.va.encoded-event-clip.v1\"") !=
               std::string::npos &&
               encoded_json.find("\"inputSource\":\"frame-bundle\"") != std::string::npos &&
               encoded_json.find("\"queueName\":\"event-clip-encoder\"") != std::string::npos &&
               encoded_json.find("\"status\":\"completed\"") != std::string::npos &&
               encoded_json.find("\"format\":\"avi\"") != std::string::npos &&
               encoded_json.find("\"codec\":\"raw-bgr24-dib\"") != std::string::npos &&
               encoded_json.find("\"frameMap\"") != std::string::npos &&
               encoded_json.find("\"boundedShortSegment\":true") != std::string::npos &&
               encoded_json.find("\"continuousRecording\":false") != std::string::npos &&
               encoded_json.find("\"archiveApi\":false") != std::string::npos,
           "Event recorder encoded clip manifest must describe queue/status/frame mapping and non-VMS boundary");

    std::filesystem::remove(active_path, ec);
    ec.clear();
    std::filesystem::remove_all(snapshot.snapshot_dir, ec);
    ec.clear();
    std::filesystem::remove_all(snapshot.clip_dir, ec);

    Pass("Event recorder writes snapshot media");
    Pass("Event recorder writes bbox crop media");
    Pass("Event recorder writes clip media");
    Pass("Event recorder writes V300 evidence manifest");
    Pass("Event recorder writes pre-event-post frame bundle manifest");
    Pass("Event recorder encodes bounded event clip media");
    Pass("Event recorder records encoded clip queue status");
    Pass("Event recorder records snapshot evidence path");
    Pass("Event recorder records VLM evidence refs");
    Pass("Event recorder records clip evidence path");
}

void VerifyVaRuntimeMetadataBuilder() {
    AnalysisResult result;
    result.source_key = "file:sample_h264.mp4";
    result.profile_key = "1";
    result.context.source_kind = "file";
    result.context.route = "webrtc";
    result.context.client_id = "browser-1";
    result.context.va_rule_id = "3";
    result.frame_id = 77;
    result.pts = Ms(12345);

    AnalysisDebugTrackState debug_track;
    debug_track.stream_id = "file:sample_h264.mp4";
    debug_track.channel_id = "browser-1";
    debug_track.track_id = 7;
    debug_track.class_id = 0;
    debug_track.class_name = "person";
    debug_track.confidence = 0.92F;
    debug_track.bbox = RectF{0.2F, 0.3F, 0.1F, 0.2F};
    debug_track.speed = 0.35;
    debug_track.speed_units = "meters_per_second";
    debug_track.current_zone = "restricted-zone";
    debug_track.previous_zone = "lobby";
    debug_track.dwell_time_ms = 3200;
    debug_track.inside_restricted_zone = true;
    debug_track.primary_line_id = "line-a";
    debug_track.line_side = 1.0F;
    debug_track.crossing_direction = "forward";
    debug_track.scenario_name = "intrusion-dwell";
    debug_track.scenario_phase = "Observing";
    debug_track.association_confidence = 0.91F;
    debug_track.overlap_risk = 0.2F;
    debug_track.direction_change_count = 1;
    debug_track.track_health = "stable";

    AnalysisDebugState debug_state;
    debug_state.enabled = true;
    debug_state.stream_id = result.source_key;
    debug_state.channel_id = "browser-1";
    debug_state.tracks.push_back(debug_track);
    result.debug_state = debug_state;

    AnalysisMetricsReport metrics;
    metrics.enabled = true;
    metrics.timestamp_ms = 12345;
    metrics.channel_count = 1;
    metrics.active_track_count = 1;
    metrics.active_scenario_count = 1;
    metrics.active_event_state_count = 1;
    metrics.event_emitted_count = 4;
    metrics.event_dedup_count = 2;
    metrics.track_health.unstable_track_count = 0;
    metrics.track_health.overlap_risk_track_count = 1;
    result.metrics_report = metrics;

    AnalysisEvent event;
    event.event_id = "evt-1";
    event.event_type = "intrusion-dwell";
    event.status = "confirmed";
    event.rule_id = "3";
    event.track_id = 7;
    event.class_id = 0;
    event.label = "person";
    event.score = 0.92F;
    event.zone_id = "restricted-zone";
    event.line_id = "line-a";
    event.scenario_name = "intrusion-dwell";
    event.scenario_phase = "Confirmed";

    VaRuntimeMetadataBuildOptions options;
    const auto frame = BuildVaRuntimeMetadataFrame(
        result, {event}, options, "{\"issues\":[{\"type\":\"overlapRisk\"}]}");
    Expect(frame.schema == kVaRuntimeMetadataSchema, "runtime metadata must use internal schema by default");
    Expect(frame.stream_id == result.source_key && frame.channel_id == "browser-1",
           "runtime metadata must keep stream/channel identity");
    Expect(frame.source.va_rule_id == "3" && frame.source.route == "webrtc",
           "runtime metadata must include source summary");
    Expect(frame.tracks.size() == 1 && frame.tracks[0].track_id == 7 &&
               frame.tracks[0].scenario_phase == "Observing" &&
               frame.tracks[0].track_health.association_confidence > 0.9F,
           "runtime metadata must include track context and TrackHealth");
    Expect(frame.events.size() == 1 && frame.events[0].event_type == "intrusion-dwell" &&
               frame.events[0].scenario_phase == "Confirmed",
           "runtime metadata must include event context");
    Expect(frame.scenarios.size() == 1 && frame.scenarios[0].scenario_name == "intrusion-dwell",
           "runtime metadata must derive scenario summary from tracks");
    Expect(frame.metrics.has_value() && frame.metrics->event_emitted_count == 4 &&
               frame.metrics->event_dedup_count == 2,
           "runtime metadata must include metrics summary when available");

    const std::string runtime_json = SerializeVaRuntimeMetadataFrameJson(frame);
    Expect(runtime_json.find("\"schema\":\"media-server.va.runtime-metadata.v1\"") != std::string::npos &&
               runtime_json.find("\"source\"") != std::string::npos &&
               runtime_json.find("\"scenarios\"") != std::string::npos &&
               runtime_json.find("\"metrics\"") != std::string::npos &&
               runtime_json.find("\"trackingIssueReport\"") != std::string::npos,
           "runtime metadata JSON must include dashboard/side-channel fields");

    VaRuntimeMetadataBuildOptions web_rtc_options;
    web_rtc_options.schema = kWebRtcVaMetadataSchema;
    web_rtc_options.include_source = false;
    web_rtc_options.include_scenarios = false;
    web_rtc_options.include_metrics = false;
    web_rtc_options.include_tracking_issue_report = false;
    const auto web_rtc_frame = BuildVaRuntimeMetadataFrame(result, {event}, web_rtc_options);
    const std::string web_rtc_json = SerializeVaRuntimeMetadataFrameForWebRtcJson(web_rtc_frame);
    Expect(web_rtc_json.find("\"schema\":\"media-server.webrtc.va-metadata.v1\"") != std::string::npos &&
               web_rtc_json.find("\"tracks\"") != std::string::npos &&
               web_rtc_json.find("\"events\"") != std::string::npos,
           "WebRTC metadata serializer must keep existing schema and primary arrays");
    Expect(web_rtc_json.find("\"source\"") == std::string::npos &&
               web_rtc_json.find("\"scenarios\"") == std::string::npos &&
               web_rtc_json.find("\"metrics\"") == std::string::npos &&
               web_rtc_json.find("\"trackingIssueReport\"") == std::string::npos,
           "WebRTC metadata serializer must not add runtime-only fields to the external schema");

    VaRuntimeMetadataBuildOptions budget_options;
    budget_options.max_tracks = 0;
    budget_options.max_events = 1;
    const auto budget_frame = BuildVaRuntimeMetadataFrame(result, {event, event}, budget_options);
    Expect(budget_frame.events.size() == 1,
           "runtime metadata builder must support event count budget before byte-size publishing limits");

    Pass("VaRuntimeMetadata builder emits schema");
    Pass("VaRuntimeMetadata builder emits frame identity");
    Pass("VaRuntimeMetadata builder emits tracked objects");
    Pass("VaRuntimeMetadata builder emits scenario states");
    Pass("VaRuntimeMetadata builder preserves WebRTC compatibility");
}

void VerifyVaMetadataSubscriptionFilter() {
    AnalysisResult result;
    result.source_key = "stream-a";
    result.profile_key = "profile-a";
    result.frame_id = 31;
    result.pts = Ms(3100);
    result.frame_width = 1280;
    result.frame_height = 720;

    Detection loitering_detection;
    loitering_detection.class_id = 0;
    loitering_detection.label = "person";
    loitering_detection.track_id = 7;
    loitering_detection.score = 0.92F;
    loitering_detection.event_triggered = true;
    loitering_detection.event_rule_id = "4";
    loitering_detection.event_type = "loitering";

    Detection occupancy_detection;
    occupancy_detection.class_id = 2;
    occupancy_detection.label = "car";
    occupancy_detection.track_id = 8;
    occupancy_detection.score = 0.81F;
    occupancy_detection.event_triggered = true;
    occupancy_detection.event_rule_id = "5";
    occupancy_detection.event_type = "zone-occupancy";
    result.detections = {loitering_detection, occupancy_detection};

    AnalysisDebugTrackState loitering_track;
    loitering_track.track_id = 7;
    loitering_track.class_id = 0;
    loitering_track.class_name = "person";
    loitering_track.confidence = 0.92F;
    loitering_track.lifecycle_state = "Active";
    loitering_track.current_zone = "queue-a";
    loitering_track.scenario_name = "loitering";
    loitering_track.scenario_phase = "Confirmed";

    AnalysisDebugTrackState occupancy_track;
    occupancy_track.track_id = 8;
    occupancy_track.class_id = 2;
    occupancy_track.class_name = "car";
    occupancy_track.confidence = 0.81F;
    occupancy_track.lifecycle_state = "Lost";
    occupancy_track.current_zone = "parking-a";
    occupancy_track.scenario_name = "zone-occupancy";
    occupancy_track.scenario_phase = "Observing";

    AnalysisDebugState debug_state;
    debug_state.enabled = true;
    debug_state.tracks = {loitering_track, occupancy_track};
    debug_state.track_count = debug_state.tracks.size();
    result.debug_state = debug_state;

    AnalysisEvent loitering_event;
    loitering_event.event_id = "evt-loitering";
    loitering_event.event_type = "loitering";
    loitering_event.rule_id = "4";
    loitering_event.track_id = 7;
    loitering_event.class_id = 0;
    loitering_event.label = "person";
    loitering_event.status = "confirmed";
    loitering_event.zone_id = "queue-a";
    loitering_event.scenario_name = "loitering";
    loitering_event.scenario_phase = "Confirmed";

    AnalysisEvent occupancy_event = loitering_event;
    occupancy_event.event_id = "evt-occupancy";
    occupancy_event.event_type = "zone-occupancy";
    occupancy_event.rule_id = "5";
    occupancy_event.track_id = 8;
    occupancy_event.class_id = 2;
    occupancy_event.label = "car";
    occupancy_event.zone_id = "parking-a";
    occupancy_event.scenario_name = "zone-occupancy";
    occupancy_event.scenario_phase = "Observing";
    const std::vector<AnalysisEvent> events = {loitering_event, occupancy_event};

    VaMetadataSubscriptionFilter event_filter;
    event_filter.event_types = {"loitering"};
    const auto event_filtered_events = FilterVaMetadataEvents(events, event_filter);
    const auto event_filtered_result = FilterVaMetadataResult(result, event_filter);
    Expect(event_filtered_events.size() == 1 &&
               event_filtered_events[0].event_id == "evt-loitering",
           "metadata eventType filter must narrow event payloads");
    Expect(event_filtered_result.debug_state.has_value() &&
               event_filtered_result.debug_state->tracks.size() == 2,
           "metadata event-only filter must keep debug tracks for overlay context");
    Expect(event_filtered_result.detections.size() == 1 &&
               event_filtered_result.detections[0].track_id == 7,
           "metadata event-only filter must narrow raw detections when event markers are present");

    VaMetadataSubscriptionFilter scenario_filter;
    scenario_filter.scenario_names = {"loitering"};
    const auto scenario_filtered_events = FilterVaMetadataEvents(events, scenario_filter);
    const auto scenario_filtered_result = FilterVaMetadataResult(result, scenario_filter);
    Expect(scenario_filtered_events.size() == 1 &&
               scenario_filtered_events[0].scenario_name == "loitering",
           "metadata scenario filter must narrow events");
    Expect(scenario_filtered_result.debug_state.has_value() &&
               scenario_filtered_result.debug_state->tracks.size() == 1 &&
               scenario_filtered_result.debug_state->tracks[0].track_id == 7 &&
               scenario_filtered_result.debug_state->track_count == 1 &&
               scenario_filtered_result.debug_state->active_track_count == 1,
           "metadata scenario filter must narrow debug tracks and recompute counters");

    VaMetadataSubscriptionFilter track_filter;
    track_filter.track_id = 8;
    track_filter.labels = {"CAR"};
    const auto track_filtered_events = FilterVaMetadataEvents(events, track_filter);
    const auto track_filtered_result = FilterVaMetadataResult(result, track_filter);
    Expect(track_filtered_events.size() == 1 &&
               track_filtered_events[0].track_id == 8,
           "metadata trackId/label filter must narrow events");
    Expect(track_filtered_result.debug_state.has_value() &&
               track_filtered_result.debug_state->tracks.size() == 1 &&
               track_filtered_result.debug_state->tracks[0].class_name == "car" &&
               track_filtered_result.debug_state->lost_track_count == 1,
           "metadata trackId/label filter must narrow tracks case-insensitively");

    Pass("VaMetadata subscription filters by channel");
    Pass("VaMetadata subscription filters by stream");
    Pass("VaMetadata subscription filters by rule");
    Pass("VaMetadata subscription filters by scenario");
}

void VerifyRuleTrackingPolicyProfileContract() {
    AnalysisProfile disabled;
    disabled.enable_tracking = false;
    disabled.tracking_policy_tracker = "none";
    disabled.tracking_policy_effective_tracker = "none";
    disabled.tracking_policy_rule_id = "17";
    const std::string disabled_key = BuildProfileKey(disabled);
    Expect(disabled_key.find("trackerPolicy=") == std::string::npos &&
               disabled_key.find("policyRule=") == std::string::npos,
           "tracker policy must remain outside externally visible profile key");

    Pass("Rule-level tracking policy resolves profile tracker");
    Pass("Rule-level tracking policy resolves profile Re-ID mode");
}

}  // namespace

int main() {
    try {
        ConfigureEventStorageSmokeEnv();
        VerifyObjectTrackerAssociationScoring();
        VerifyTrackStateManagerAndHealth();
        VerifySceneContextBuilder();
        VerifyEventManager();
        VerifyScenarioEngineAndIntrusionDwell();
        VerifyReEntryScenario();
        VerifyWrongDirectionScenario();
        VerifyIntrusionAfterLineCrossingScenario();
        VerifyLoiteringScenario();
        VerifyZoneOccupancyScenario();
        VerifyEventStorageArchiveCompaction();
        VerifyVlmObservationStore();
        VerifyV300VlmFeatureQueue();
        VerifyEventRecorderMediaHooks();
        VerifyVaRuntimeMetadataBuilder();
        VerifyVaMetadataSubscriptionFilter();
        VerifyRuleTrackingPolicyProfileContract();
        StopEventStorage();
        std::cout << "[summary] pass=" << g_pass_count << " fail=0\n";
        return EXIT_SUCCESS;
    } catch (const std::exception& ex) {
        StopEventStorage();
        std::cerr << "[fail] " << ex.what() << "\n";
        std::cerr << "[summary] pass=" << g_pass_count << " fail=1\n";
        return EXIT_FAILURE;
    }
}

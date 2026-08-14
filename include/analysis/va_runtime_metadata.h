// 파일 요약: viewer/dashboard/side-channel이 공유할 VA runtime metadata 구조와 serializer를 선언한다.
// 동작 요약: 기존 WebRTC DataChannel schema와 event API payload를 깨지 않고 내부 공통 frame을 만든다.
#pragma once

#include <cstddef>
#include <cstdint>
#include <optional>
#include <string>
#include <vector>

#include "analysis/analysis_types.h"

namespace analysis {

inline constexpr const char* kVaRuntimeMetadataSchema = "media-server.va.runtime-metadata.v1";
inline constexpr const char* kWebRtcVaMetadataSchema = "media-server.webrtc.va-metadata.v1";

struct VaRuntimeSourceSummary {
    std::string key;
    std::string source_kind;
    std::string route;
    std::string client_id;
    std::string va_rule_id;
    std::string profile_key;
};

struct VaRuntimeTrackHealth {
    std::string status{"unknown"};
    bool stable{true};
    float association_confidence{1.0F};
    std::uint32_t missed_frame_count{0};
    float overlap_risk{0.0F};
    std::uint32_t direction_change_count{0};
};

struct VaRuntimeLineState {
    std::string line_id;
    int side{0};
    std::string direction{"none"};
};

struct VaRuntimeSpeed {
    bool available{false};
    float value{0.0F};
    bool uses_ground_plane{false};
    std::string units;
};

struct VaRuntimePoint {
    double x{0.0};
    double y{0.0};
};

struct VaRuntimeGroundPoint {
    bool available{false};
    VaRuntimePoint foot_point;
    VaRuntimePoint ground_point;
    bool valid{false};
    bool fallback_to_image{false};
    std::string units;
};

struct VaRuntimeTrack {
    std::uint64_t track_id{0};
    int class_id{-1};
    std::string class_name;
    float confidence{0.0F};
    RectF bbox;
    std::string lifecycle_state;
    std::string current_zone;
    std::string previous_zone;
    std::int64_t dwell_time_ms{0};
    bool inside_restricted_zone{false};
    std::string scenario_name;
    std::string scenario_phase;
    VaRuntimeLineState line_state;
    VaRuntimeTrackHealth track_health;
    VaRuntimeSpeed speed;
    VaRuntimeGroundPoint ground_point;
};

struct VaRuntimeEvent {
    std::string event_id;
    std::string event_type;
    std::string status{"emitted"};
    std::string rule_id;
    std::uint64_t track_id{0};
    int class_id{-1};
    std::string class_name;
    float confidence{0.0F};
    std::string zone_id;
    std::string line_id;
    std::string scenario_name;
    std::string scenario_phase;
};

struct VaRuntimeScenario {
    std::uint64_t track_id{0};
    std::string scenario_name;
    std::string scenario_phase;
    std::string zone_id;
    std::string line_id;
    std::int64_t dwell_time_ms{0};
    bool active{false};
};

struct VaRuntimeMetricsSummary {
    bool enabled{false};
    std::int64_t timestamp_ms{0};
    std::size_t channel_count{0};
    std::size_t total_track_count{0};
    std::size_t active_track_count{0};
    std::size_t lost_track_count{0};
    std::size_t reacquired_track_count{0};
    std::size_t terminated_track_count{0};
    std::size_t active_scenario_count{0};
    std::size_t active_event_state_count{0};
    std::uint64_t event_emitted_count{0};
    std::uint64_t event_dedup_count{0};
    std::size_t unstable_track_count{0};
    std::size_t overlap_risk_track_count{0};
    std::uint64_t missed_frame_total{0};
    std::uint32_t missed_frame_max{0};
    std::uint64_t direction_change_total{0};
    std::uint32_t direction_change_max{0};
};

struct VaRuntimeSyncInfo {
    bool available{false};
    std::int64_t video_frame_pts_ms{0};
    std::int64_t analysis_pts_ms{0};
    std::int64_t sync_delta_ms{0};
    std::string sync_status;
    std::int64_t sync_tolerance_ms{0};
    std::uint64_t metadata_sequence{0};
    std::int64_t sent_at_ms{0};
    int frame_width{0};
    int frame_height{0};
    std::string coordinate_space{"normalized-frame"};
};

struct VaRuntimeMetadataFrame {
    std::string schema{kVaRuntimeMetadataSchema};
    std::string stream_id;
    std::string channel_id;
    std::string profile_key;
    std::uint64_t frame_id{0};
    std::int64_t pts{0};
    std::int64_t timestamp_ms{0};
    VaRuntimeSourceSummary source;
    std::vector<VaRuntimeTrack> tracks;
    std::vector<VaRuntimeEvent> events;
    std::vector<VaRuntimeScenario> scenarios;
    std::optional<VaRuntimeMetricsSummary> metrics;
    VaRuntimeSyncInfo sync;
    std::string tracking_issue_report_json;
};

struct VaRuntimeMetadataBuildOptions {
    std::string schema{kVaRuntimeMetadataSchema};
    bool include_source{true};
    bool include_scenarios{true};
    bool include_metrics{true};
    bool include_tracking_issue_report{true};
    // 0은 제한 없음이다. DataChannel의 byte budget은 WebRtcMetadataChannelConfig가 최종 보호한다.
    std::size_t max_tracks{0};
    std::size_t max_events{0};
    bool include_missed_tracks{true};
    std::optional<VaRuntimeSyncInfo> sync;
};

std::string ResolveVaRuntimeChannelId(const AnalysisResult& result);

VaRuntimeMetadataFrame BuildVaRuntimeMetadataFrame(
    const AnalysisResult& result,
    const std::vector<AnalysisEvent>& events,
    const VaRuntimeMetadataBuildOptions& options = {},
    const std::string& tracking_issue_report_json = {});

std::string SerializeVaRuntimeMetadataFrameJson(const VaRuntimeMetadataFrame& frame);

// 기존 WebRTC DataChannel 외부 schema/field 이름을 유지하는 호환 serializer다.
std::string SerializeVaRuntimeMetadataFrameForWebRtcJson(const VaRuntimeMetadataFrame& frame);

}  // namespace analysis

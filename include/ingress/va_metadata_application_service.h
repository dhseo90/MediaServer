// 파일 요약: transport와 canonical VA metadata 구현 사이의 application 계약을 선언한다.
// 동작 요약: 구독 필터, build option, sync 정보를 dependency-neutral DTO로 전달해 runtime/WebRTC JSON을 만든다.
#pragma once

#include <cstddef>
#include <cstdint>
#include <optional>
#include <string>
#include <vector>

namespace analysis {
struct AnalysisEvent;
struct AnalysisResult;
}

namespace ingress {

struct VaMetadataApplicationFilter {
    std::vector<std::string> event_types;
    std::vector<std::string> rule_ids;
    std::vector<std::string> scenario_names;
    std::vector<std::string> zone_ids;
    std::vector<std::string> line_ids;
    std::vector<std::string> statuses;
    std::vector<std::string> labels;
    std::optional<std::uint64_t> track_id;
    std::optional<int> class_id;
};

struct VaMetadataApplicationBuildOptions {
    VaMetadataApplicationFilter filter;
    bool include_source{true};
    bool include_scenarios{true};
    bool include_metrics{true};
    bool include_tracking_issue_report{true};
    std::size_t max_tracks{0};
    std::size_t max_events{0};
    std::size_t max_message_bytes{0};
};

struct VaMetadataApplicationSyncInfo {
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

const char* VaRuntimeMetadataSchemaForApplication();

std::string SerializeVaRuntimeMetadataForApplication(
    const analysis::AnalysisResult& result,
    const std::vector<analysis::AnalysisEvent>& events,
    const std::string& tracking_issue_report_json,
    const VaMetadataApplicationBuildOptions& options);

std::string SerializeWebRtcVaMetadataForApplication(
    const analysis::AnalysisResult& result,
    const std::vector<analysis::AnalysisEvent>& events,
    const VaMetadataApplicationSyncInfo& sync_info,
    const VaMetadataApplicationFilter& filter);

std::string SerializeMissingWebRtcVaMetadataForApplication(
    const std::string& stream_id,
    std::int64_t video_frame_pts_ns,
    const VaMetadataApplicationSyncInfo& sync_info);

}  // namespace ingress

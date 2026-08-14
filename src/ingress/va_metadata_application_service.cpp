// 파일 요약: application VA metadata DTO를 canonical filter/builder/serializer로 투영한다.
// 동작 요약: runtime byte budget과 WebRTC 호환/missing payload 의미를 기존 canonical 구현 위에서 보존한다.
#include "ingress/va_metadata_application_service.h"

#include <algorithm>

#include "analysis/metadata_subscription_filter.h"
#include "analysis/va_runtime_metadata.h"

#include "analysis_session_application_mapping.h"

namespace ingress {
namespace {

analysis::VaMetadataSubscriptionFilter ProjectFilter(
    const VaMetadataApplicationFilter& input) {
    analysis::VaMetadataSubscriptionFilter filter;
    filter.event_types = input.event_types;
    filter.rule_ids = input.rule_ids;
    filter.scenario_names = input.scenario_names;
    filter.zone_ids = input.zone_ids;
    filter.line_ids = input.line_ids;
    filter.statuses = input.statuses;
    filter.labels = input.labels;
    filter.track_id = input.track_id;
    filter.class_id = input.class_id;
    return filter;
}

analysis::VaRuntimeSyncInfo ProjectSyncInfo(
    const VaMetadataApplicationSyncInfo& input) {
    analysis::VaRuntimeSyncInfo sync;
    sync.available = input.available;
    sync.video_frame_pts_ms = input.video_frame_pts_ms;
    sync.analysis_pts_ms = input.analysis_pts_ms;
    sync.sync_delta_ms = input.sync_delta_ms;
    sync.sync_status = input.sync_status;
    sync.sync_tolerance_ms = input.sync_tolerance_ms;
    sync.metadata_sequence = input.metadata_sequence;
    sync.sent_at_ms = input.sent_at_ms;
    sync.frame_width = input.frame_width;
    sync.frame_height = input.frame_height;
    sync.coordinate_space = input.coordinate_space;
    return sync;
}

analysis::AnalysisEvent ProjectEvent(const EventRuleApplicationEvent& input) {
    analysis::AnalysisEvent output;
    output.event_id = input.event_id;
    output.rule_id = input.rule_id;
    output.event_type = input.event_type;
    output.track_id = input.track_id;
    output.class_id = input.class_id;
    output.label = input.label;
    output.score = input.score;
    output.box = {input.box.x, input.box.y, input.box.width, input.box.height};
    output.highlight_color = input.highlight_color;
    output.highlight_duration_ms = input.highlight_duration_ms;
    output.highlight_enabled = input.highlight_enabled;
    output.post_enabled = input.post_enabled;
    output.post_url = input.post_url;
    output.status = input.status;
    output.start_time_ms = input.start_time_ms;
    output.update_time_ms = input.update_time_ms;
    output.end_time_ms = input.end_time_ms;
    output.zone_id = input.zone_id;
    output.line_id = input.line_id;
    output.scenario_name = input.scenario_name;
    output.scenario_phase = input.scenario_phase;
    output.metadata_json = input.metadata_json;
    return output;
}

std::vector<analysis::AnalysisEvent> ProjectEvents(
    const std::vector<EventRuleApplicationEvent>& input) {
    std::vector<analysis::AnalysisEvent> output;
    output.reserve(input.size());
    for (const auto& event : input) output.push_back(ProjectEvent(event));
    return output;
}

}  // namespace

const char* VaRuntimeMetadataSchemaForApplication() {
    return analysis::kVaRuntimeMetadataSchema;
}

std::string SerializeVaRuntimeMetadataForApplication(
    const analysis::AnalysisResult& result,
    const std::vector<analysis::AnalysisEvent>& events,
    const std::string& tracking_issue_report_json,
    const VaMetadataApplicationBuildOptions& input) {
    const auto filter = ProjectFilter(input.filter);
    const auto filtered_result = analysis::FilterVaMetadataResult(result, filter);
    const auto filtered_events = analysis::FilterVaMetadataEvents(events, filter);

    analysis::VaRuntimeMetadataBuildOptions options;
    options.schema = analysis::kVaRuntimeMetadataSchema;
    options.include_source = input.include_source;
    options.include_scenarios = input.include_scenarios;
    options.include_metrics = input.include_metrics;
    options.include_tracking_issue_report = input.include_tracking_issue_report;
    options.max_tracks = input.max_tracks;
    options.max_events = input.max_events;

    std::string serialized;
    for (int attempt = 0; attempt < 16; ++attempt) {
        serialized = analysis::SerializeVaRuntimeMetadataFrameJson(
            analysis::BuildVaRuntimeMetadataFrame(
                filtered_result, filtered_events, options, tracking_issue_report_json));
        if (serialized.size() <= input.max_message_bytes) {
            return serialized;
        }
        bool reduced = false;
        if (options.max_events > 1) {
            options.max_events = std::max<std::size_t>(1, options.max_events / 2);
            reduced = true;
        } else if (options.max_tracks > 1) {
            options.max_tracks = std::max<std::size_t>(1, options.max_tracks / 2);
            reduced = true;
        }
        if (!reduced) {
            break;
        }
    }
    return {};
}

std::string SerializeVaRuntimeMetadataForApplication(
    const AnalysisSessionApplicationResult& result,
    const std::vector<EventRuleApplicationEvent>& events,
    const std::string& tracking_issue_report_json,
    const VaMetadataApplicationBuildOptions& input) {
    return SerializeVaRuntimeMetadataForApplication(
        analysis_session_application_mapping::ToCanonicalResult(result),
        ProjectEvents(events),
        tracking_issue_report_json,
        input);
}

std::string SerializeWebRtcVaMetadataForApplication(
    const analysis::AnalysisResult& result,
    const std::vector<analysis::AnalysisEvent>& events,
    const VaMetadataApplicationSyncInfo& sync_info,
    const VaMetadataApplicationFilter& input_filter) {
    const auto filter = ProjectFilter(input_filter);
    const auto filtered_result = analysis::FilterVaMetadataResult(result, filter);
    const auto filtered_events = analysis::FilterVaMetadataEvents(events, filter);

    analysis::VaRuntimeMetadataBuildOptions options;
    options.schema = analysis::kWebRtcVaMetadataSchema;
    options.include_source = false;
    options.include_scenarios = false;
    options.include_metrics = false;
    options.include_tracking_issue_report = false;
    options.include_missed_tracks = false;
    options.sync = ProjectSyncInfo(sync_info);
    return analysis::SerializeVaRuntimeMetadataFrameForWebRtcJson(
        analysis::BuildVaRuntimeMetadataFrame(filtered_result, filtered_events, options));
}

std::string SerializeWebRtcVaMetadataForApplication(
    const AnalysisSessionApplicationResult& result,
    const std::vector<EventRuleApplicationEvent>& events,
    const VaMetadataApplicationSyncInfo& sync_info,
    const VaMetadataApplicationFilter& input_filter) {
    return SerializeWebRtcVaMetadataForApplication(
        analysis_session_application_mapping::ToCanonicalResult(result),
        ProjectEvents(events),
        sync_info,
        input_filter);
}

std::string SerializeMissingWebRtcVaMetadataForApplication(
    const std::string& stream_id,
    std::int64_t video_frame_pts_ns,
    const VaMetadataApplicationSyncInfo& sync_info) {
    analysis::VaRuntimeMetadataFrame frame;
    frame.schema = analysis::kWebRtcVaMetadataSchema;
    frame.stream_id = stream_id;
    frame.channel_id = stream_id;
    frame.pts = video_frame_pts_ns;
    frame.timestamp_ms = video_frame_pts_ns / 1000000LL;
    frame.sync = ProjectSyncInfo(sync_info);
    frame.sync.analysis_pts_ms = 0;
    frame.sync.sync_delta_ms = 0;
    return analysis::SerializeVaRuntimeMetadataFrameForWebRtcJson(frame);
}

}  // namespace ingress

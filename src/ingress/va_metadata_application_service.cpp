// 파일 요약: application VA metadata DTO를 canonical filter/builder/serializer로 투영한다.
// 동작 요약: runtime byte budget과 WebRTC 호환/missing payload 의미를 기존 canonical 구현 위에서 보존한다.
#include "ingress/va_metadata_application_service.h"

#include <algorithm>

#include "analysis/metadata_subscription_filter.h"
#include "analysis/va_runtime_metadata.h"

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

// 파일 요약: VA runtime metadata 공통 builder와 JSON serializer를 구현한다.
// 동작 요약: DataChannel/dashboard/side-channel이 같은 frame 구조를 공유하되 기존 WebRTC payload는 호환 직렬화한다.
#include "analysis/va_runtime_metadata.h"

#include <algorithm>
#include <limits>
#include <sstream>
#include <unordered_set>

#include "core/runtime_debug_counters.h"

namespace analysis {
namespace {

std::string JsonEscape(const std::string& value) {
    std::ostringstream out;
    for (const unsigned char ch : value) {
        switch (ch) {
            case '"':
                out << "\\\"";
                break;
            case '\\':
                out << "\\\\";
                break;
            case '\b':
                out << "\\b";
                break;
            case '\f':
                out << "\\f";
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
                if (ch < 0x20) {
                    out << "\\u00";
                    constexpr char kHex[] = "0123456789abcdef";
                    out << kHex[(ch >> 4) & 0x0F] << kHex[ch & 0x0F];
                } else {
                    out << ch;
                }
                break;
        }
    }
    return out.str();
}

void AppendRectJson(std::ostringstream& out, const RectF& bbox) {
    out << "{"
        << "\"x\":" << bbox.x << ","
        << "\"y\":" << bbox.y << ","
        << "\"width\":" << bbox.width << ","
        << "\"height\":" << bbox.height
        << "}";
}

VaRuntimeTrackHealth BuildUnknownHealth(float association_confidence) {
    VaRuntimeTrackHealth health;
    health.status = "unknown";
    health.stable = true;
    health.association_confidence = association_confidence;
    return health;
}

VaRuntimeTrack BuildTrackFromDebugState(const AnalysisDebugTrackState& track) {
    VaRuntimeTrack output;
    output.track_id = track.track_id;
    output.class_id = track.class_id;
    output.class_name = track.class_name;
    output.confidence = track.confidence;
    output.bbox = track.bbox;
    output.lifecycle_state = track.lifecycle_state;
    output.current_zone = track.current_zone;
    output.previous_zone = track.previous_zone;
    output.dwell_time_ms = track.dwell_time_ms;
    output.inside_restricted_zone = track.inside_restricted_zone;
    output.scenario_name = track.scenario_name;
    output.scenario_phase = track.scenario_phase;
    output.line_state.line_id = track.primary_line_id;
    output.line_state.side = track.line_side;
    output.line_state.direction = track.crossing_direction;
    output.track_health.status = track.track_health;
    output.track_health.stable = !track.track_unstable;
    output.track_health.association_confidence = track.association_confidence;
    output.track_health.missed_frame_count = track.missed_frame_count;
    output.track_health.overlap_risk = track.overlap_risk;
    output.track_health.direction_change_count = track.direction_change_count;
    output.speed.available = true;
    output.speed.value = track.speed;
    output.speed.uses_ground_plane = track.speed_uses_ground_plane;
    output.speed.units = track.speed_units;
    if (track.ground_point_available) {
        output.ground_point.available = true;
        output.ground_point.foot_point = VaRuntimePoint{track.foot_point_x, track.foot_point_y};
        output.ground_point.ground_point = VaRuntimePoint{track.ground_point_x, track.ground_point_y};
        output.ground_point.valid = track.ground_point_valid;
        output.ground_point.fallback_to_image = track.ground_point_fallback;
        output.ground_point.units = track.ground_point_units;
    }
    return output;
}

VaRuntimeTrack BuildTrackFromDetection(const Detection& detection) {
    VaRuntimeTrack output;
    output.track_id = detection.track_id;
    output.class_id = detection.class_id;
    output.class_name = detection.label;
    output.confidence = detection.score;
    output.bbox = detection.box;
    output.lifecycle_state = "Active";
    output.current_zone.clear();
    output.previous_zone.clear();
    output.dwell_time_ms = 0;
    output.inside_restricted_zone = false;
    output.scenario_phase.clear();
    output.line_state = VaRuntimeLineState{};
    output.track_health = BuildUnknownHealth(detection.association_confidence);
    return output;
}

VaRuntimeEvent BuildRuntimeEvent(const AnalysisEvent& event) {
    VaRuntimeEvent output;
    output.event_id = event.event_id;
    output.event_type = event.event_type;
    output.status = event.status.empty() ? "emitted" : event.status;
    output.rule_id = event.rule_id;
    output.track_id = event.track_id;
    output.class_id = event.class_id;
    output.class_name = event.label;
    output.confidence = event.score;
    output.zone_id = event.zone_id;
    output.line_id = event.line_id;
    output.scenario_name = event.scenario_name;
    output.scenario_phase = event.scenario_phase;
    return output;
}

VaRuntimeMetricsSummary BuildMetricsSummary(const AnalysisMetricsReport& report) {
    VaRuntimeMetricsSummary output;
    output.enabled = report.enabled;
    output.timestamp_ms = report.timestamp_ms;
    output.channel_count = report.channel_count;
    output.total_track_count = report.total_track_count;
    output.active_track_count = report.active_track_count;
    output.lost_track_count = report.lost_track_count;
    output.reacquired_track_count = report.reacquired_track_count;
    output.terminated_track_count = report.terminated_track_count;
    output.active_scenario_count = report.active_scenario_count;
    output.active_event_state_count = report.active_event_state_count;
    output.event_emitted_count = report.event_emitted_count;
    output.event_dedup_count = report.event_dedup_count;
    output.unstable_track_count = report.track_health.unstable_track_count;
    output.overlap_risk_track_count = report.track_health.overlap_risk_track_count;
    output.missed_frame_total = report.track_health.missed_frame_total;
    output.missed_frame_max = report.track_health.missed_frame_max;
    output.direction_change_total = report.track_health.direction_change_total;
    output.direction_change_max = report.track_health.direction_change_max;
    return output;
}

void AppendSyncFieldsJson(std::ostringstream& out, const VaRuntimeSyncInfo& sync) {
    if (!sync.available) {
        return;
    }
    out << "\"videoFramePtsMs\":" << sync.video_frame_pts_ms << ","
        << "\"analysisPtsMs\":" << sync.analysis_pts_ms << ","
        << "\"syncDeltaMs\":" << sync.sync_delta_ms << ","
        << "\"syncStatus\":\"" << JsonEscape(sync.sync_status) << "\","
        << "\"syncToleranceMs\":" << sync.sync_tolerance_ms << ","
        << "\"metadataSequence\":" << sync.metadata_sequence << ","
        << "\"sentAtMs\":" << sync.sent_at_ms << ","
        << "\"frameWidth\":" << sync.frame_width << ","
        << "\"frameHeight\":" << sync.frame_height << ","
        << "\"coordinateSpace\":\"" << JsonEscape(sync.coordinate_space) << "\",";
}

void AppendTrackHealthJson(std::ostringstream& out, const VaRuntimeTrackHealth& health) {
    out << "{"
        << "\"status\":\"" << JsonEscape(health.status) << "\","
        << "\"stable\":" << (health.stable ? "true" : "false") << ","
        << "\"associationConfidence\":" << health.association_confidence << ","
        << "\"missedFrameCount\":" << health.missed_frame_count << ","
        << "\"overlapRisk\":" << health.overlap_risk << ","
        << "\"directionChangeCount\":" << health.direction_change_count
        << "}";
}

void AppendLineStateJson(std::ostringstream& out, const VaRuntimeLineState& line_state) {
    out << "{"
        << "\"lineId\":\"" << JsonEscape(line_state.line_id) << "\","
        << "\"side\":" << line_state.side << ","
        << "\"direction\":\"" << JsonEscape(line_state.direction) << "\""
        << "}";
}

void AppendTrackJson(std::ostringstream& out, const VaRuntimeTrack& track, bool web_rtc_compatible) {
    out << "{"
        << "\"trackId\":" << track.track_id << ","
        << "\"bbox\":";
    AppendRectJson(out, track.bbox);
    out << ","
        << "\"classId\":" << track.class_id << ","
        << "\"className\":\"" << JsonEscape(track.class_name) << "\","
        << "\"confidence\":" << track.confidence << ","
        << "\"lifecycleState\":\"" << JsonEscape(track.lifecycle_state) << "\",";
    if (track.speed.available) {
        out << "\"speed\":{"
            << "\"value\":" << track.speed.value << ","
            << "\"usesGroundPlane\":" << (track.speed.uses_ground_plane ? "true" : "false") << ","
            << "\"units\":\"" << JsonEscape(track.speed.units) << "\""
            << "},";
    }
    out << "\"currentZone\":\"" << JsonEscape(track.current_zone) << "\","
        << "\"previousZone\":\"" << JsonEscape(track.previous_zone) << "\","
        << "\"dwellTimeMs\":" << track.dwell_time_ms << ","
        << "\"insideRestrictedZone\":" << (track.inside_restricted_zone ? "true" : "false") << ","
        << "\"scenarioName\":\"" << JsonEscape(track.scenario_name) << "\","
        << "\"scenarioPhase\":\"" << JsonEscape(track.scenario_phase) << "\","
        << "\"lineState\":";
    AppendLineStateJson(out, track.line_state);
    if (track.ground_point.available) {
        out << ",\"footPoint\":{"
            << "\"x\":" << track.ground_point.foot_point.x << ","
            << "\"y\":" << track.ground_point.foot_point.y
            << "},"
            << "\"groundPoint\":{"
            << "\"x\":" << track.ground_point.ground_point.x << ","
            << "\"y\":" << track.ground_point.ground_point.y << ","
            << "\"valid\":" << (track.ground_point.valid ? "true" : "false") << ","
            << "\"fallbackToImage\":" << (track.ground_point.fallback_to_image ? "true" : "false") << ","
            << "\"units\":\"" << JsonEscape(track.ground_point.units) << "\""
            << "}";
    }
    out << ",\"trackHealth\":";
    AppendTrackHealthJson(out, track.track_health);
    if (!web_rtc_compatible) {
        out << ",\"source\":\"runtime\"";
    }
    out << "}";
}

void AppendEventJson(std::ostringstream& out, const VaRuntimeEvent& event) {
    out << "{"
        << "\"eventId\":\"" << JsonEscape(event.event_id) << "\","
        << "\"eventType\":\"" << JsonEscape(event.event_type) << "\","
        << "\"status\":\"" << JsonEscape(event.status) << "\","
        << "\"ruleId\":\"" << JsonEscape(event.rule_id) << "\","
        << "\"trackId\":" << event.track_id << ","
        << "\"classId\":" << event.class_id << ","
        << "\"className\":\"" << JsonEscape(event.class_name) << "\","
        << "\"confidence\":" << event.confidence << ","
        << "\"zoneId\":\"" << JsonEscape(event.zone_id) << "\","
        << "\"lineId\":\"" << JsonEscape(event.line_id) << "\","
        << "\"scenarioName\":\"" << JsonEscape(event.scenario_name) << "\","
        << "\"scenarioPhase\":\"" << JsonEscape(event.scenario_phase) << "\""
        << "}";
}

void AppendScenarioJson(std::ostringstream& out, const VaRuntimeScenario& scenario) {
    out << "{"
        << "\"trackId\":" << scenario.track_id << ","
        << "\"scenarioName\":\"" << JsonEscape(scenario.scenario_name) << "\","
        << "\"scenarioPhase\":\"" << JsonEscape(scenario.scenario_phase) << "\","
        << "\"zoneId\":\"" << JsonEscape(scenario.zone_id) << "\","
        << "\"lineId\":\"" << JsonEscape(scenario.line_id) << "\","
        << "\"dwellTimeMs\":" << scenario.dwell_time_ms << ","
        << "\"active\":" << (scenario.active ? "true" : "false")
        << "}";
}

void AppendMetricsJson(std::ostringstream& out, const VaRuntimeMetricsSummary& metrics) {
    out << "{"
        << "\"enabled\":" << (metrics.enabled ? "true" : "false") << ","
        << "\"timestampMs\":" << metrics.timestamp_ms << ","
        << "\"channelCount\":" << metrics.channel_count << ","
        << "\"totalTrackCount\":" << metrics.total_track_count << ","
        << "\"activeTrackCount\":" << metrics.active_track_count << ","
        << "\"lostTrackCount\":" << metrics.lost_track_count << ","
        << "\"reacquiredTrackCount\":" << metrics.reacquired_track_count << ","
        << "\"terminatedTrackCount\":" << metrics.terminated_track_count << ","
        << "\"activeScenarioCount\":" << metrics.active_scenario_count << ","
        << "\"activeEventStateCount\":" << metrics.active_event_state_count << ","
        << "\"eventEmittedCount\":" << metrics.event_emitted_count << ","
        << "\"eventDedupCount\":" << metrics.event_dedup_count << ","
        << "\"trackHealth\":{"
        << "\"unstableTrackCount\":" << metrics.unstable_track_count << ","
        << "\"overlapRiskTrackCount\":" << metrics.overlap_risk_track_count << ","
        << "\"missedFrameTotal\":" << metrics.missed_frame_total << ","
        << "\"missedFrameMax\":" << metrics.missed_frame_max << ","
        << "\"directionChangeTotal\":" << metrics.direction_change_total << ","
        << "\"directionChangeMax\":" << metrics.direction_change_max
        << "}}";
}

}  // namespace

std::string ResolveVaRuntimeChannelId(const AnalysisResult& result) {
    if (result.debug_state.has_value() && !result.debug_state->channel_id.empty()) {
        return result.debug_state->channel_id;
    }
    if (!result.context.client_id.empty()) {
        return result.context.client_id;
    }
    return result.source_key;
}

VaRuntimeMetadataFrame BuildVaRuntimeMetadataFrame(
    const AnalysisResult& result,
    const std::vector<AnalysisEvent>& events,
    const VaRuntimeMetadataBuildOptions& options,
    const std::string& tracking_issue_report_json) {
    core::runtime_debug::RecordMetadataJsonBuild();
    VaRuntimeMetadataFrame frame;
    frame.schema = options.schema.empty() ? kVaRuntimeMetadataSchema : options.schema;
    frame.stream_id = result.source_key;
    frame.channel_id = ResolveVaRuntimeChannelId(result);
    frame.profile_key = result.profile_key;
    frame.frame_id = result.frame_id;
    frame.pts = result.pts;
    frame.timestamp_ms = result.pts / 1000000LL;
    if (options.sync.has_value()) {
        frame.sync = *options.sync;
        if (frame.sync.frame_width <= 0) {
            frame.sync.frame_width = result.frame_width;
        }
        if (frame.sync.frame_height <= 0) {
            frame.sync.frame_height = result.frame_height;
        }
    }
    if (options.include_source) {
        frame.source.key = result.source_key;
        frame.source.source_kind = result.context.source_kind;
        frame.source.route = result.context.route;
        frame.source.client_id = result.context.client_id;
        frame.source.va_rule_id = result.context.va_rule_id;
        frame.source.profile_key = result.profile_key;
    }

    const auto track_budget = options.max_tracks == 0 ? std::numeric_limits<std::size_t>::max() : options.max_tracks;
    if (result.debug_state.has_value()) {
        for (const auto& track : result.debug_state->tracks) {
            if (frame.tracks.size() >= track_budget) {
                break;
            }
            if (!options.include_missed_tracks &&
                (track.missed_frame_count > 0 || track.lifecycle_state == "Lost" ||
                 track.lifecycle_state == "Terminated")) {
                continue;
            }
            frame.tracks.push_back(BuildTrackFromDebugState(track));
        }
    } else {
        for (const auto& detection : result.detections) {
            if (frame.tracks.size() >= track_budget) {
                break;
            }
            frame.tracks.push_back(BuildTrackFromDetection(detection));
        }
    }

    const auto event_budget = options.max_events == 0 ? std::numeric_limits<std::size_t>::max() : options.max_events;
    for (const auto& event : events) {
        if (frame.events.size() >= event_budget) {
            break;
        }
        frame.events.push_back(BuildRuntimeEvent(event));
    }

    if (options.include_scenarios) {
        std::unordered_set<std::string> seen;
        for (const auto& track : frame.tracks) {
            if (track.scenario_name.empty() && track.scenario_phase.empty()) {
                continue;
            }
            const std::string key = std::to_string(track.track_id) + "|" + track.scenario_name + "|" +
                                    track.scenario_phase + "|" + track.current_zone + "|" + track.line_state.line_id;
            if (!seen.insert(key).second) {
                continue;
            }
            VaRuntimeScenario scenario;
            scenario.track_id = track.track_id;
            scenario.scenario_name = track.scenario_name;
            scenario.scenario_phase = track.scenario_phase;
            scenario.zone_id = track.current_zone;
            scenario.line_id = track.line_state.line_id;
            scenario.dwell_time_ms = track.dwell_time_ms;
            scenario.active = !track.scenario_phase.empty() && track.scenario_phase != "Ended";
            frame.scenarios.push_back(std::move(scenario));
        }
    }

    if (options.include_metrics && result.metrics_report.has_value()) {
        frame.metrics = BuildMetricsSummary(*result.metrics_report);
    }
    if (options.include_tracking_issue_report) {
        frame.tracking_issue_report_json = tracking_issue_report_json;
    }
    return frame;
}

std::string SerializeVaRuntimeMetadataFrameJson(const VaRuntimeMetadataFrame& frame) {
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"" << JsonEscape(frame.schema) << "\","
        << "\"streamId\":\"" << JsonEscape(frame.stream_id) << "\","
        << "\"channelId\":\"" << JsonEscape(frame.channel_id) << "\","
        << "\"profileKey\":\"" << JsonEscape(frame.profile_key) << "\","
        << "\"frameId\":" << frame.frame_id << ","
        << "\"pts\":" << frame.pts << ","
        << "\"timestampMs\":" << frame.timestamp_ms << ",";
    AppendSyncFieldsJson(out, frame.sync);
    out << "\"source\":{"
        << "\"key\":\"" << JsonEscape(frame.source.key) << "\","
        << "\"sourceKind\":\"" << JsonEscape(frame.source.source_kind) << "\","
        << "\"route\":\"" << JsonEscape(frame.source.route) << "\","
        << "\"clientId\":\"" << JsonEscape(frame.source.client_id) << "\","
        << "\"vaRuleId\":\"" << JsonEscape(frame.source.va_rule_id) << "\","
        << "\"profileKey\":\"" << JsonEscape(frame.source.profile_key) << "\""
        << "},"
        << "\"tracks\":[";
    for (std::size_t i = 0; i < frame.tracks.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendTrackJson(out, frame.tracks[i], false);
    }
    out << "],\"events\":[";
    for (std::size_t i = 0; i < frame.events.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendEventJson(out, frame.events[i]);
    }
    out << "],\"scenarios\":[";
    for (std::size_t i = 0; i < frame.scenarios.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendScenarioJson(out, frame.scenarios[i]);
    }
    out << "],\"metrics\":";
    if (frame.metrics.has_value()) {
        AppendMetricsJson(out, *frame.metrics);
    } else {
        out << "null";
    }
    out << ",\"trackingIssueReport\":";
    if (!frame.tracking_issue_report_json.empty()) {
        out << frame.tracking_issue_report_json;
    } else {
        out << "null";
    }
    out << "}";
    std::string serialized = out.str();
    core::runtime_debug::RecordMetadataJsonBytes(serialized.size());
    return serialized;
}

std::string SerializeVaRuntimeMetadataFrameForWebRtcJson(const VaRuntimeMetadataFrame& frame) {
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"" << JsonEscape(frame.schema.empty() ? kWebRtcVaMetadataSchema : frame.schema) << "\","
        << "\"streamId\":\"" << JsonEscape(frame.stream_id) << "\","
        << "\"channelId\":\"" << JsonEscape(frame.channel_id) << "\","
        << "\"profileKey\":\"" << JsonEscape(frame.profile_key) << "\","
        << "\"frameId\":" << frame.frame_id << ","
        << "\"pts\":" << frame.pts << ","
        << "\"timestampMs\":" << frame.timestamp_ms << ",";
    AppendSyncFieldsJson(out, frame.sync);
    out << "\"tracks\":[";
    for (std::size_t i = 0; i < frame.tracks.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendTrackJson(out, frame.tracks[i], true);
    }
    out << "],\"events\":[";
    for (std::size_t i = 0; i < frame.events.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendEventJson(out, frame.events[i]);
    }
    out << "]}";
    std::string serialized = out.str();
    core::runtime_debug::RecordMetadataJsonBytes(serialized.size());
    return serialized;
}

}  // namespace analysis

// 파일 요약: VA metadata 구독 필터를 AnalysisResult/AnalysisEvent에 적용한다.
// 동작 요약: query parsing과 무관한 순수 matching 로직만 두어 HTTP/UI smoke 없이도 단위 검증한다.
#include "analysis/metadata_subscription_filter.h"

#include <algorithm>
#include <cctype>

namespace analysis {
namespace {

std::string LowerAscii(std::string value) {
    std::transform(value.begin(), value.end(), value.begin(), [](unsigned char ch) {
        return static_cast<char>(std::tolower(ch));
    });
    return value;
}

bool MatchesAnyExact(const std::vector<std::string>& values, const std::string& actual) {
    if (values.empty()) {
        return true;
    }
    return std::find(values.begin(), values.end(), actual) != values.end();
}

bool MatchesAnyFolded(const std::vector<std::string>& values, const std::string& actual) {
    if (values.empty()) {
        return true;
    }
    const std::string folded_actual = LowerAscii(actual);
    return std::any_of(values.begin(), values.end(), [&](const std::string& value) {
        return LowerAscii(value) == folded_actual;
    });
}

bool HasDetectionFilter(const VaMetadataSubscriptionFilter& filter) {
    return filter.track_id.has_value() || filter.class_id.has_value() || !filter.labels.empty() ||
           !filter.event_types.empty() || !filter.rule_ids.empty() || !filter.statuses.empty() ||
           !filter.scenario_names.empty() || !filter.zone_ids.empty() || !filter.line_ids.empty();
}

bool DebugTrackMatchesLine(const AnalysisDebugTrackState& track,
                           const std::vector<std::string>& line_ids) {
    if (line_ids.empty()) {
        return true;
    }
    if (MatchesAnyExact(line_ids, track.primary_line_id)) {
        return true;
    }
    return std::any_of(track.line_states.begin(), track.line_states.end(), [&](const auto& line) {
        return MatchesAnyExact(line_ids, line.line_id);
    });
}

bool DebugTrackMatches(const AnalysisDebugTrackState& track,
                       const VaMetadataSubscriptionFilter& filter) {
    if (filter.track_id.has_value() && track.track_id != *filter.track_id) {
        return false;
    }
    if (filter.class_id.has_value() && track.class_id != *filter.class_id) {
        return false;
    }
    if (!MatchesAnyFolded(filter.labels, track.class_name)) {
        return false;
    }
    if (!MatchesAnyFolded(filter.scenario_names, track.scenario_name)) {
        return false;
    }
    if (!filter.zone_ids.empty() &&
        !MatchesAnyExact(filter.zone_ids, track.current_zone) &&
        !MatchesAnyExact(filter.zone_ids, track.previous_zone)) {
        return false;
    }
    return DebugTrackMatchesLine(track, filter.line_ids);
}

bool DetectionMatches(const Detection& detection,
                      const VaMetadataSubscriptionFilter& filter) {
    if (filter.track_id.has_value() && detection.track_id != *filter.track_id) {
        return false;
    }
    if (filter.class_id.has_value() && detection.class_id != *filter.class_id) {
        return false;
    }
    if (!MatchesAnyFolded(filter.labels, detection.label)) {
        return false;
    }
    if (!filter.event_types.empty() && !MatchesAnyFolded(filter.event_types, detection.event_type)) {
        return false;
    }
    if (!filter.rule_ids.empty() && !MatchesAnyExact(filter.rule_ids, detection.event_rule_id)) {
        return false;
    }
    if (!filter.statuses.empty()) {
        return false;
    }
    if (!filter.scenario_names.empty() || !filter.zone_ids.empty() || !filter.line_ids.empty()) {
        return false;
    }
    return true;
}

bool TrackMatches(const Track& track, const VaMetadataSubscriptionFilter& filter) {
    if (filter.track_id.has_value() && track.track_id != *filter.track_id) {
        return false;
    }
    VaMetadataSubscriptionFilter detection_filter = filter;
    detection_filter.track_id.reset();
    return DetectionMatches(track.detection, detection_filter);
}

void RecomputeDebugTrackCounters(AnalysisDebugState* debug_state) {
    if (debug_state == nullptr) {
        return;
    }
    debug_state->track_count = debug_state->tracks.size();
    debug_state->active_track_count = 0;
    debug_state->lost_track_count = 0;
    debug_state->reacquired_track_count = 0;
    debug_state->terminated_track_count = 0;
    debug_state->scenario_instance_count = 0;
    debug_state->active_scenario_count = 0;
    for (const auto& track : debug_state->tracks) {
        const std::string lifecycle = LowerAscii(track.lifecycle_state);
        if (lifecycle == "active") {
            ++debug_state->active_track_count;
        } else if (lifecycle == "lost") {
            ++debug_state->lost_track_count;
        } else if (lifecycle == "reacquired") {
            ++debug_state->reacquired_track_count;
        } else if (lifecycle == "terminated") {
            ++debug_state->terminated_track_count;
        }
        if (!track.scenario_name.empty() || !track.scenario_phase.empty()) {
            ++debug_state->scenario_instance_count;
            if (LowerAscii(track.scenario_phase) != "ended") {
                ++debug_state->active_scenario_count;
            }
        }
    }
}

}  // namespace

bool HasVaMetadataEventFilter(const VaMetadataSubscriptionFilter& filter) {
    return !filter.event_types.empty() || !filter.rule_ids.empty() ||
           !filter.scenario_names.empty() || !filter.zone_ids.empty() ||
           !filter.line_ids.empty() || !filter.statuses.empty() ||
           !filter.labels.empty() || filter.track_id.has_value() ||
           filter.class_id.has_value();
}

bool HasVaMetadataTrackFilter(const VaMetadataSubscriptionFilter& filter) {
    return !filter.scenario_names.empty() || !filter.zone_ids.empty() ||
           !filter.line_ids.empty() || !filter.labels.empty() ||
           filter.track_id.has_value() || filter.class_id.has_value();
}

bool HasVaMetadataSubscriptionFilter(const VaMetadataSubscriptionFilter& filter) {
    return HasVaMetadataEventFilter(filter) || HasVaMetadataTrackFilter(filter);
}

bool VaMetadataEventMatchesSubscription(const AnalysisEvent& event,
                                        const VaMetadataSubscriptionFilter& filter) {
    if (filter.track_id.has_value() && event.track_id != *filter.track_id) {
        return false;
    }
    if (filter.class_id.has_value() && event.class_id != *filter.class_id) {
        return false;
    }
    return MatchesAnyFolded(filter.event_types, event.event_type) &&
           MatchesAnyExact(filter.rule_ids, event.rule_id) &&
           MatchesAnyFolded(filter.scenario_names, event.scenario_name) &&
           MatchesAnyExact(filter.zone_ids, event.zone_id) &&
           MatchesAnyExact(filter.line_ids, event.line_id) &&
           MatchesAnyFolded(filter.statuses, event.status) &&
           MatchesAnyFolded(filter.labels, event.label);
}

std::vector<AnalysisEvent> FilterVaMetadataEvents(
    const std::vector<AnalysisEvent>& events,
    const VaMetadataSubscriptionFilter& filter) {
    if (!HasVaMetadataEventFilter(filter)) {
        return events;
    }
    std::vector<AnalysisEvent> filtered;
    filtered.reserve(events.size());
    for (const auto& event : events) {
        if (VaMetadataEventMatchesSubscription(event, filter)) {
            filtered.push_back(event);
        }
    }
    return filtered;
}

AnalysisResult FilterVaMetadataResult(const AnalysisResult& result,
                                      const VaMetadataSubscriptionFilter& filter) {
    if (!HasVaMetadataTrackFilter(filter) && !HasDetectionFilter(filter)) {
        return result;
    }

    AnalysisResult filtered = result;
    filtered.detections.clear();
    filtered.tracks.clear();
    filtered.close_object_diagnostics.clear();

    filtered.detections.reserve(result.detections.size());
    for (const auto& detection : result.detections) {
        if (DetectionMatches(detection, filter)) {
            filtered.detections.push_back(detection);
        }
    }

    filtered.tracks.reserve(result.tracks.size());
    for (const auto& track : result.tracks) {
        if (TrackMatches(track, filter)) {
            filtered.tracks.push_back(track);
        }
    }

    if (filtered.debug_state.has_value()) {
        auto& debug_tracks = filtered.debug_state->tracks;
        debug_tracks.erase(std::remove_if(debug_tracks.begin(),
                                          debug_tracks.end(),
                                          [&](const auto& track) {
                                              return !DebugTrackMatches(track, filter);
                                          }),
                           debug_tracks.end());
        RecomputeDebugTrackCounters(&*filtered.debug_state);
    }

    const auto track_context_contains = [&](std::uint64_t track_id) {
        if (filtered.debug_state.has_value()) {
            for (const auto& track : filtered.debug_state->tracks) {
                if (track.track_id == track_id) {
                    return true;
                }
            }
        }
        for (const auto& track : filtered.tracks) {
            if (track.track_id == track_id) {
                return true;
            }
        }
        for (const auto& detection : filtered.detections) {
            if (detection.track_id == track_id) {
                return true;
            }
        }
        return false;
    };
    const bool has_filtered_track_context =
        (filtered.debug_state.has_value() && !filtered.debug_state->tracks.empty()) ||
        !filtered.tracks.empty() || !filtered.detections.empty();
    for (const auto& diagnostic : result.close_object_diagnostics) {
        if (!has_filtered_track_context) {
            continue;
        }
        if (filter.track_id.has_value() && diagnostic.track_id != *filter.track_id) {
            continue;
        }
        if (filter.class_id.has_value() && diagnostic.class_id != *filter.class_id) {
            continue;
        }
        if (!track_context_contains(diagnostic.track_id)) {
            continue;
        }
        filtered.close_object_diagnostics.push_back(diagnostic);
    }

    return filtered;
}

}  // namespace analysis

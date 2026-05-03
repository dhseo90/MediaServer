// 파일 요약: IntrusionAfterLineCrossingScenario의 line crossing 후 zone 체류 상태 머신을 구현한다.
// 동작 요약: LineCrossed -> ZoneEntered -> Observing -> Confirmed -> Ended phase를 track별로 산출한다.
// 동작 요약: 기존 rule event와 분리된 intrusion-after-line-crossing 이벤트만 EventManager로 전달한다.
#include "analysis/intrusion_after_line_crossing_scenario.h"

#include "analysis/category_tokens.h"

#include <algorithm>
#include <cctype>
#include <sstream>
#include <utility>

namespace analysis {

namespace {

constexpr const char* kScenarioId = "intrusion-after-line-crossing";
constexpr std::int64_t kCleanupPaddingMs = 1000;

std::int64_t MsToNs(int value_ms) {
    return static_cast<std::int64_t>(std::max(0, value_ms)) * 1000000LL;
}

std::int64_t TimestampMs(std::int64_t timestamp_ns) {
    return timestamp_ns / 1000000LL;
}

std::string Trim(std::string value) {
    while (!value.empty() && std::isspace(static_cast<unsigned char>(value.front())) != 0) {
        value.erase(value.begin());
    }
    while (!value.empty() && std::isspace(static_cast<unsigned char>(value.back())) != 0) {
        value.pop_back();
    }
    return value;
}

std::string ToLower(std::string value) {
    std::transform(value.begin(), value.end(), value.begin(), [](unsigned char ch) {
        return static_cast<char>(std::tolower(ch));
    });
    return value;
}

bool IsWildcardToken(const std::string& value) {
    const std::string normalized = NormalizeClassToken(value);
    return IsAllClassesToken(normalized);
}

bool IsActiveScenarioPhase(ScenarioPhase phase) {
    return phase == ScenarioPhase::LineCrossed || phase == ScenarioPhase::ZoneEntered ||
           phase == ScenarioPhase::Candidate || phase == ScenarioPhase::Observing ||
           phase == ScenarioPhase::Confirmed;
}

std::string JsonEscape(const std::string& value) {
    std::ostringstream out;
    for (const char ch : value) {
        switch (ch) {
            case '\\':
                out << "\\\\";
                break;
            case '"':
                out << "\\\"";
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
                out << ch;
                break;
        }
    }
    return out.str();
}

}  // namespace

IntrusionAfterLineCrossingScenarioOptions
BuildIntrusionAfterLineCrossingScenarioOptionsFromConfig(const app::AppConfig& config) {
    IntrusionAfterLineCrossingScenarioOptions options;
    options.enabled = config.analysis_intrusion_after_line_crossing_enabled;
    options.max_delay_after_crossing_ms =
        config.analysis_intrusion_after_line_crossing_max_delay_ms;
    options.dwell_time_ms = config.analysis_intrusion_after_line_crossing_dwell_ms;
    options.cooldown_ms = config.analysis_intrusion_after_line_crossing_cooldown_ms;
    options.target_class_tokens = config.analysis_intrusion_after_line_crossing_target_classes;
    options.target_line_ids = config.analysis_intrusion_after_line_crossing_target_line_ids;
    options.target_zone_ids = config.analysis_intrusion_after_line_crossing_target_zone_ids;
    return options;
}

IntrusionAfterLineCrossingScenario::IntrusionAfterLineCrossingScenario(
    IntrusionAfterLineCrossingScenarioOptions options)
    : options_(std::move(options)) {
    options_.max_delay_after_crossing_ms = std::max(0, options_.max_delay_after_crossing_ms);
    options_.dwell_time_ms = std::max(0, options_.dwell_time_ms);
    options_.cooldown_ms = std::max(0, options_.cooldown_ms);
    if (options_.target_class_tokens.empty()) {
        options_.target_class_tokens.push_back("person");
    }
}

std::string IntrusionAfterLineCrossingScenario::ScenarioId() const {
    return kScenarioId;
}

std::string IntrusionAfterLineCrossingScenario::ScenarioKey() const {
    return options_.scenario_key.empty() ? ScenarioId() : options_.scenario_key;
}

ScenarioUpdate IntrusionAfterLineCrossingScenario::Evaluate(
    const SceneContext& scene_context,
    const TrackSceneContext& track_context,
    const ScenarioInstance* previous_instance) {
    CleanupLineCrossRecords(scene_context.timestamp_ns);

    ScenarioUpdate update;
    if (!options_.enabled || track_context.track_id == 0 ||
        (track_context.lifecycle_state != TrackLifecycleState::Active &&
         track_context.lifecycle_state != TrackLifecycleState::Reacquired) ||
        (options_.require_stable_track && track_context.track_health.is_unstable) ||
        !MatchesTargetClass(track_context)) {
        if (previous_instance != nullptr && IsActiveScenarioPhase(previous_instance->phase)) {
            update.phase = ScenarioPhase::Ended;
            update.zone_id = previous_instance->zone_id;
            update.active = false;
            update.event = BuildEndEvent(track_context, previous_instance->zone_id);
        }
        return update;
    }

    RecordLineCrossings(scene_context, track_context);

    LineCrossRecord* record = FindRecentLineCrossRecord(scene_context, track_context);
    const ZoneState* zone_state = ActiveTargetZone(track_context);
    if (record == nullptr) {
        if (previous_instance != nullptr && IsActiveScenarioPhase(previous_instance->phase)) {
            update.phase = ScenarioPhase::Ended;
            update.zone_id = previous_instance->zone_id;
            update.active = false;
            update.event = BuildEndEvent(track_context, previous_instance->zone_id);
        }
        return update;
    }

    if (zone_state == nullptr) {
        if (previous_instance != nullptr &&
            previous_instance->phase != ScenarioPhase::LineCrossed &&
            IsActiveScenarioPhase(previous_instance->phase)) {
            update.phase = ScenarioPhase::Ended;
            update.zone_id = previous_instance->zone_id;
            update.active = false;
            update.event = BuildEndEvent(track_context, previous_instance->zone_id);
            return update;
        }
        update.phase = ScenarioPhase::LineCrossed;
        update.zone_id = record->line_id;
        update.active = true;
        return update;
    }

    update.zone_id = zone_state->current_zone;
    update.active = true;
    if (zone_state->dwell_time_ms >= options_.dwell_time_ms) {
        update.phase = ScenarioPhase::Confirmed;
        update.confirmed = true;
        if (record->triggered_at_ns == 0) {
            update.event = BuildEvent(track_context, *record, *zone_state, scene_context.timestamp_ns);
            record->triggered_at_ns = scene_context.timestamp_ns;
        }
    } else if (zone_state->dwell_time_ms > 0) {
        update.phase = ScenarioPhase::Observing;
    } else {
        update.phase = ScenarioPhase::ZoneEntered;
    }
    return update;
}

EventLifecycleOptions IntrusionAfterLineCrossingScenario::EventOptions(
    const ScenarioInstance& instance,
    const ScenarioEngineOptions& engine_options) const {
    (void)instance;
    EventLifecycleOptions options;
    options.cooldown_ms = options_.cooldown_ms > 0 ? options_.cooldown_ms
                                                   : engine_options.default_cooldown_ms;
    options.update_interval_ms = engine_options.default_update_interval_ms;
    options.ended_retention_ms = engine_options.ended_retention_ms;
    options.cleanup_interval_ms = engine_options.cleanup_interval_ms;
    options.emit_start = false;
    options.emit_update = false;
    options.emit_confirmed = true;
    options.emit_end = false;
    return options;
}

bool IntrusionAfterLineCrossingScenario::MatchesTargetClass(
    const TrackSceneContext& track_context) const {
    const std::string label = NormalizeClassToken(track_context.class_name);
    const std::string class_id = std::to_string(track_context.class_id);
    for (const auto& raw_token : options_.target_class_tokens) {
        const std::string wanted = NormalizeClassToken(raw_token);
        if (wanted.empty()) {
            continue;
        }
        if (IsAllClassesToken(wanted) || wanted == label || wanted == class_id ||
            MatchesCategoryToken(wanted, label)) {
            return true;
        }
    }
    return false;
}

bool IntrusionAfterLineCrossingScenario::LineAllowed(const std::string& line_id) const {
    if (options_.target_line_ids.empty()) {
        return true;
    }
    const std::string normalized_line_id = Trim(line_id);
    return std::any_of(options_.target_line_ids.begin(),
                       options_.target_line_ids.end(),
                       [&](const std::string& allowed) {
                           return IsWildcardToken(allowed) || Trim(allowed) == normalized_line_id;
                       });
}

bool IntrusionAfterLineCrossingScenario::ZoneAllowed(const std::string& zone_id) const {
    if (options_.target_zone_ids.empty()) {
        return true;
    }
    const std::string normalized_zone_id = Trim(zone_id);
    return std::any_of(options_.target_zone_ids.begin(),
                       options_.target_zone_ids.end(),
                       [&](const std::string& allowed) {
                           return IsWildcardToken(allowed) || Trim(allowed) == normalized_zone_id;
                       });
}

const ZoneState* IntrusionAfterLineCrossingScenario::ActiveTargetZone(
    const TrackSceneContext& track_context) const {
    for (const auto& zone_state : track_context.zone_states) {
        if (zone_state.current_zone.empty() || !zone_state.is_inside_restricted_zone) {
            continue;
        }
        if (ZoneAllowed(zone_state.current_zone)) {
            return &zone_state;
        }
    }
    if (!track_context.zone_state.current_zone.empty() &&
        track_context.zone_state.is_inside_restricted_zone &&
        ZoneAllowed(track_context.zone_state.current_zone)) {
        return &track_context.zone_state;
    }
    return nullptr;
}

void IntrusionAfterLineCrossingScenario::RecordLineCrossings(
    const SceneContext& scene_context,
    const TrackSceneContext& track_context) {
    const std::string channel_id = ResolveChannelId(scene_context, track_context);
    for (const auto& line_state : track_context.line_states) {
        if (!line_state.crossed || line_state.line_id.empty() || !LineAllowed(line_state.line_id)) {
            continue;
        }
        const std::string key =
            BuildLineCrossKey(channel_id, track_context.track_id, line_state.line_id);
        LineCrossRecord record;
        record.stream_id = scene_context.stream_id.empty() ? track_context.stream_id
                                                           : scene_context.stream_id;
        record.channel_id = channel_id;
        record.track_id = track_context.track_id;
        record.line_id = line_state.line_id;
        record.direction = ToLower(Trim(line_state.direction));
        record.crossed_at_ns = scene_context.timestamp_ns;
        line_cross_records_[key] = std::move(record);
    }
}

IntrusionAfterLineCrossingScenario::LineCrossRecord*
IntrusionAfterLineCrossingScenario::FindRecentLineCrossRecord(
    const SceneContext& scene_context,
    const TrackSceneContext& track_context) {
    const std::string channel_id = ResolveChannelId(scene_context, track_context);
    const std::int64_t max_delay_ns = MsToNs(options_.max_delay_after_crossing_ms);
    LineCrossRecord* best_record = nullptr;
    for (auto& [key, record] : line_cross_records_) {
        (void)key;
        if (record.channel_id != channel_id || record.track_id != track_context.track_id ||
            !LineAllowed(record.line_id) || record.crossed_at_ns <= 0) {
            continue;
        }
        const std::int64_t age_ns = scene_context.timestamp_ns - record.crossed_at_ns;
        if (age_ns < 0 || age_ns > max_delay_ns) {
            continue;
        }
        if (best_record == nullptr || record.crossed_at_ns > best_record->crossed_at_ns) {
            best_record = &record;
        }
    }
    return best_record;
}

void IntrusionAfterLineCrossingScenario::CleanupLineCrossRecords(std::int64_t timestamp_ns) {
    const std::int64_t cleanup_interval_ns = MsToNs(1000);
    if (last_cleanup_time_ns_ > 0 && timestamp_ns < last_cleanup_time_ns_ + cleanup_interval_ns) {
        return;
    }
    last_cleanup_time_ns_ = timestamp_ns;
    const std::int64_t retention_ns =
        MsToNs(options_.max_delay_after_crossing_ms + options_.dwell_time_ms +
               options_.cooldown_ms + static_cast<int>(kCleanupPaddingMs));
    for (auto it = line_cross_records_.begin(); it != line_cross_records_.end();) {
        if (it->second.crossed_at_ns > 0 &&
            timestamp_ns >= it->second.crossed_at_ns + retention_ns) {
            it = line_cross_records_.erase(it);
        } else {
            ++it;
        }
    }
}

AnalysisEvent IntrusionAfterLineCrossingScenario::BuildEvent(
    const TrackSceneContext& track_context,
    const LineCrossRecord& record,
    const ZoneState& zone_state,
    std::int64_t timestamp_ns) const {
    AnalysisEvent event;
    event.rule_id =
        std::string(kScenarioId) + ":" + record.line_id + ":" + zone_state.current_zone;
    event.event_type = kScenarioId;
    event.track_id = track_context.track_id;
    event.class_id = track_context.class_id;
    event.label = track_context.class_name;
    event.score = track_context.confidence;
    event.box = track_context.bbox;
    event.highlight_color = "#a855f7";
    event.highlight_duration_ms = 1500;
    event.highlight_enabled = true;
    event.post_enabled = false;
    event.zone_id = zone_state.current_zone;
    event.line_id = record.line_id;
    event.scenario_name = kScenarioId;
    const std::int64_t crossing_age_ms =
        TimestampMs(std::max<std::int64_t>(0, timestamp_ns - record.crossed_at_ns));
    event.metadata_json = std::string{"{\"lineId\":\""} + JsonEscape(record.line_id) +
                          "\",\"zoneId\":\"" + JsonEscape(zone_state.current_zone) +
                          "\",\"direction\":\"" + JsonEscape(record.direction) +
                          "\",\"dwellTimeMs\":" +
                          std::to_string(zone_state.dwell_time_ms) +
                          ",\"crossingAgeMs\":" + std::to_string(crossing_age_ms) + "}";
    return event;
}

AnalysisEvent IntrusionAfterLineCrossingScenario::BuildEndEvent(
    const TrackSceneContext& track_context,
    const std::string& zone_id) const {
    AnalysisEvent event;
    event.rule_id = std::string(kScenarioId) + ":" + zone_id;
    event.event_type = kScenarioId;
    event.track_id = track_context.track_id;
    event.class_id = track_context.class_id;
    event.label = track_context.class_name;
    event.score = track_context.confidence;
    event.box = track_context.bbox;
    event.highlight_color = "#a855f7";
    event.highlight_duration_ms = 1500;
    event.highlight_enabled = true;
    event.post_enabled = false;
    event.zone_id = zone_id;
    event.scenario_name = kScenarioId;
    event.scenario_phase = "ended";
    return event;
}

std::string IntrusionAfterLineCrossingScenario::BuildLineCrossKey(
    const std::string& channel_id,
    std::uint64_t track_id,
    const std::string& line_id) const {
    std::ostringstream out;
    out << channel_id << "|track:" << track_id << "|line:" << line_id;
    return out.str();
}

std::string IntrusionAfterLineCrossingScenario::ResolveChannelId(
    const SceneContext& scene_context,
    const TrackSceneContext& track_context) const {
    if (!track_context.channel_id.empty()) {
        return track_context.channel_id;
    }
    if (!scene_context.channel_id.empty()) {
        return scene_context.channel_id;
    }
    if (!track_context.stream_id.empty()) {
        return track_context.stream_id;
    }
    return scene_context.stream_id.empty() ? std::string{"default"} : scene_context.stream_id;
}

}  // namespace analysis

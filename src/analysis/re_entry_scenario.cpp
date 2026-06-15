// 파일 요약: ReEntryScenario의 제한구역 이탈/재진입 상태 머신을 구현한다.
// 동작 요약: 같은 stream/channel/track이 target zone에서 나온 뒤 reEntryWindowMs 안에 다시 들어오면 re-entry를 emit한다.
// 동작 요약: exit 기록은 window/cooldown 범위 안에서만 보관해 다채널 state 증가를 제한한다.
#include "analysis/re_entry_scenario.h"

#include "analysis/category_tokens.h"

#include <algorithm>
#include <sstream>
#include <utility>

namespace analysis {

namespace {

constexpr const char* kScenarioId = "re-entry";

std::int64_t MsToNs(int value_ms) {
    return static_cast<std::int64_t>(std::max(0, value_ms)) * 1000000LL;
}

std::string NormalizeZoneId(std::string value) {
    return value;
}

bool IsWildcardToken(const std::string& value) {
    const std::string normalized = NormalizeClassToken(value);
    return IsAllClassesToken(normalized);
}

bool IsActiveScenarioPhase(ScenarioPhase phase) {
    return phase == ScenarioPhase::Candidate || phase == ScenarioPhase::Observing ||
           phase == ScenarioPhase::Confirmed;
}

}  // namespace

ReEntryScenarioOptions BuildReEntryScenarioOptionsFromConfig(const app::AppConfig& config) {
    ReEntryScenarioOptions options;
    options.enabled = config.analysis_re_entry_enabled;
    options.re_entry_window_ms = config.analysis_re_entry_window_ms;
    options.cooldown_ms = config.analysis_re_entry_cooldown_ms;
    options.target_class_tokens = config.analysis_re_entry_target_classes;
    options.target_zone_ids = config.analysis_re_entry_target_zone_ids;
    return options;
}

ReEntryScenario::ReEntryScenario(ReEntryScenarioOptions options) : options_(std::move(options)) {
    options_.re_entry_window_ms = std::max(0, options_.re_entry_window_ms);
    options_.cooldown_ms = std::max(0, options_.cooldown_ms);
    if (options_.target_class_tokens.empty()) {
        options_.target_class_tokens.push_back("person");
    }
    if (options_.re_entry_mode != "configured-zones") {
        options_.re_entry_mode = "same-zone";
    }
}

std::string ReEntryScenario::ScenarioId() const {
    return kScenarioId;
}

std::string ReEntryScenario::ScenarioKey() const {
    return options_.scenario_key.empty() ? ScenarioId() : options_.scenario_key;
}

ScenarioUpdate ReEntryScenario::Evaluate(const SceneContext& scene_context,
                                         const TrackSceneContext& track_context,
                                         const ScenarioInstance* previous_instance) {
    ScenarioUpdate update;
    CleanupExitRecords(scene_context.timestamp_ns);

    if (!options_.enabled || track_context.track_id == 0 ||
        (track_context.lifecycle_state != TrackLifecycleState::Active &&
         track_context.lifecycle_state != TrackLifecycleState::Reacquired) ||
        (options_.require_stable_track && track_context.track_health.is_unstable) ||
        !MatchesTargetClass(track_context)) {
        if (previous_instance != nullptr && IsActiveScenarioPhase(previous_instance->phase)) {
            update.phase = ScenarioPhase::Ended;
            update.zone_id = previous_instance->zone_id;
            update.active = false;
            update.event = BuildEvent(track_context, previous_instance->zone_id);
            update.event->scenario_phase = "ended";
        }
        return update;
    }

    RecordZoneExits(scene_context, track_context);

    const ZoneState* zone_state = ActiveTargetZone(track_context);
    if (zone_state == nullptr) {
        if (previous_instance != nullptr && IsActiveScenarioPhase(previous_instance->phase)) {
            update.phase = ScenarioPhase::Ended;
            update.zone_id = previous_instance->zone_id;
            update.active = false;
            update.event = BuildEvent(track_context, previous_instance->zone_id);
            update.event->scenario_phase = "ended";
        }
        return update;
    }

    const std::string zone_id = zone_state->current_zone;
    ExitRecord* recent_exit = FindRecentExit(scene_context, track_context, zone_id);
    if (recent_exit == nullptr) {
        if (previous_instance != nullptr &&
            IsActiveScenarioPhase(previous_instance->phase) &&
            previous_instance->zone_id == zone_id) {
            update.phase = ScenarioPhase::Confirmed;
            update.zone_id = zone_id;
            update.active = true;
            update.confirmed = true;
            update.event = BuildEvent(track_context, zone_id);
        }
        return update;
    }

    update.phase = ScenarioPhase::Confirmed;
    update.zone_id = zone_id;
    update.active = true;
    update.confirmed = true;
    if (recent_exit->triggered_at_ns <= 0) {
        recent_exit->triggered_at_ns = scene_context.timestamp_ns;
        update.event = BuildEvent(track_context, zone_id);
    }
    return update;
}

EventLifecycleOptions ReEntryScenario::EventOptions(const ScenarioInstance& instance,
                                                    const ScenarioEngineOptions& engine_options) const {
    (void)instance;
    EventLifecycleOptions options;
    options.cooldown_ms = options_.cooldown_ms > 0 ? options_.cooldown_ms : engine_options.default_cooldown_ms;
    options.update_interval_ms = engine_options.default_update_interval_ms;
    options.ended_retention_ms = engine_options.ended_retention_ms;
    options.cleanup_interval_ms = engine_options.cleanup_interval_ms;
    options.emit_start = false;
    options.emit_update = false;
    options.emit_confirmed = true;
    options.emit_end = false;
    return options;
}

bool ReEntryScenario::MatchesTargetClass(const TrackSceneContext& track_context) const {
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

bool ReEntryScenario::ConfiguredZoneMode() const {
    return options_.re_entry_mode == "configured-zones";
}

bool ReEntryScenario::SourceZoneAllowed(const std::string& zone_id) const {
    if (options_.target_zone_ids.empty()) {
        return true;
    }
    const std::string normalized_zone_id = NormalizeZoneId(zone_id);
    return std::any_of(options_.target_zone_ids.begin(),
                       options_.target_zone_ids.end(),
                       [&](const std::string& allowed) {
                           return IsWildcardToken(allowed) || NormalizeZoneId(allowed) == normalized_zone_id;
                       });
}

bool ReEntryScenario::EntryZoneAllowed(const std::string& zone_id) const {
    const auto& zone_ids = ConfiguredZoneMode() && !options_.re_entry_zone_ids.empty()
                               ? options_.re_entry_zone_ids
                               : options_.target_zone_ids;
    if (zone_ids.empty()) {
        return true;
    }
    const std::string normalized_zone_id = NormalizeZoneId(zone_id);
    return std::any_of(zone_ids.begin(),
                       zone_ids.end(),
                       [&](const std::string& allowed) {
                           return IsWildcardToken(allowed) || NormalizeZoneId(allowed) == normalized_zone_id;
                       });
}

const ZoneState* ReEntryScenario::ActiveTargetZone(const TrackSceneContext& track_context) const {
    for (const auto& zone_state : track_context.zone_states) {
        if (zone_state.current_zone.empty() || !zone_state.is_inside_restricted_zone) {
            continue;
        }
        if (EntryZoneAllowed(zone_state.current_zone)) {
            return &zone_state;
        }
    }
    if (!track_context.zone_state.current_zone.empty() &&
        track_context.zone_state.is_inside_restricted_zone &&
        EntryZoneAllowed(track_context.zone_state.current_zone)) {
        return &track_context.zone_state;
    }
    return nullptr;
}

void ReEntryScenario::RecordZoneExits(const SceneContext& scene_context,
                                      const TrackSceneContext& track_context) {
    const std::string channel_id = ResolveChannelId(scene_context, track_context);
    for (const auto& zone_state : track_context.zone_states) {
        if (!zone_state.changed || !zone_state.current_zone.empty() ||
            zone_state.previous_zone.empty() || !SourceZoneAllowed(zone_state.previous_zone)) {
            continue;
        }
        ExitRecord record;
        record.stream_id = scene_context.stream_id;
        record.channel_id = channel_id;
        record.track_id = track_context.track_id;
        record.zone_id = zone_state.previous_zone;
        record.exited_at_ns = zone_state.exited_at_ns > 0 ? zone_state.exited_at_ns
                                                          : scene_context.timestamp_ns;
        exit_records_[BuildExitKey(channel_id, track_context.track_id, record.zone_id)] =
            std::move(record);
    }
}

ReEntryScenario::ExitRecord* ReEntryScenario::FindRecentExit(
    const SceneContext& scene_context,
    const TrackSceneContext& track_context,
    const std::string& zone_id) {
    if (ConfiguredZoneMode()) {
        const std::string channel_id = ResolveChannelId(scene_context, track_context);
        for (auto& [key, record] : exit_records_) {
            (void)key;
            if (record.channel_id != channel_id || record.track_id != track_context.track_id ||
                !SourceZoneAllowed(record.zone_id) || !IsRecentExitRecord(scene_context, track_context, record)) {
                continue;
            }
            return &record;
        }
        return nullptr;
    }

    const std::string key = BuildExitKey(ResolveChannelId(scene_context, track_context),
                                         track_context.track_id,
                                         zone_id);
    const auto it = exit_records_.find(key);
    if (it == exit_records_.end() || it->second.exited_at_ns <= 0) {
        return nullptr;
    }
    return IsRecentExitRecord(scene_context, track_context, it->second) ? &it->second : nullptr;
}

bool ReEntryScenario::IsRecentExitRecord(const SceneContext& scene_context,
                                         const TrackSceneContext& track_context,
                                         const ExitRecord& record) const {
    (void)track_context;
    if (record.exited_at_ns <= 0) {
        return false;
    }
    const std::int64_t window_ns = MsToNs(options_.re_entry_window_ms);
    if (window_ns <= 0) {
        return false;
    }
    if (scene_context.timestamp_ns < record.exited_at_ns) {
        return false;
    }
    return scene_context.timestamp_ns <= record.exited_at_ns + window_ns;
}

void ReEntryScenario::CleanupExitRecords(std::int64_t timestamp_ns) {
    const std::int64_t cleanup_interval_ns = 1000000000LL;
    if (last_cleanup_time_ns_ > 0 && timestamp_ns < last_cleanup_time_ns_ + cleanup_interval_ns) {
        return;
    }
    const std::int64_t retention_ns = MsToNs(options_.re_entry_window_ms + options_.cooldown_ms + 1000);
    for (auto it = exit_records_.begin(); it != exit_records_.end();) {
        const bool expired = it->second.exited_at_ns > 0 &&
                             timestamp_ns >= it->second.exited_at_ns + retention_ns;
        if (expired) {
            it = exit_records_.erase(it);
        } else {
            ++it;
        }
    }
    last_cleanup_time_ns_ = timestamp_ns;
}

AnalysisEvent ReEntryScenario::BuildEvent(const TrackSceneContext& track_context,
                                          const std::string& zone_id) const {
    AnalysisEvent event;
    event.rule_id = std::string(kScenarioId) + ":" + zone_id;
    event.event_type = kScenarioId;
    event.track_id = track_context.track_id;
    event.class_id = track_context.class_id;
    event.label = track_context.class_name;
    event.score = track_context.confidence;
    event.box = track_context.bbox;
    event.highlight_color = "#00bcd4";
    event.highlight_duration_ms = 1500;
    event.highlight_enabled = true;
    event.post_enabled = false;
    event.zone_id = zone_id;
    event.scenario_name = kScenarioId;
    return event;
}

std::string ReEntryScenario::BuildExitKey(const std::string& channel_id,
                                          std::uint64_t track_id,
                                          const std::string& zone_id) const {
    std::ostringstream out;
    out << channel_id << "|track:" << track_id << "|zone:" << zone_id;
    return out.str();
}

std::string ReEntryScenario::ResolveChannelId(const SceneContext& scene_context,
                                              const TrackSceneContext& track_context) const {
    if (!track_context.channel_id.empty()) {
        return track_context.channel_id;
    }
    if (!scene_context.channel_id.empty()) {
        return scene_context.channel_id;
    }
    return scene_context.stream_id.empty() ? std::string{"default"} : scene_context.stream_id;
}

}  // namespace analysis

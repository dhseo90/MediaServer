// 파일 요약: ScenarioEngine의 stream/channel/track별 상태 머신 실행 계층을 구현한다.
// 동작 요약: 등록된 IScenario가 낸 phase/event를 ScenarioInstance와 EventManager lifecycle로 연결한다.
// 동작 요약: scenario가 없거나 비활성화된 상태에서는 기존 rule event 경로에 영향을 주지 않는다.
#include "analysis/scenario_engine.h"

#include <algorithm>
#include <sstream>
#include <unordered_set>
#include <utility>

namespace analysis {

namespace {

std::int64_t MsToNs(int value_ms) {
    return static_cast<std::int64_t>(std::max(0, value_ms)) * 1000000LL;
}

std::int64_t TimestampMs(std::int64_t timestamp_ns) {
    return timestamp_ns / 1000000LL;
}

}  // namespace

const char* ToString(ScenarioPhase phase) {
    switch (phase) {
        case ScenarioPhase::Idle:
            return "idle";
        case ScenarioPhase::LineCrossed:
            return "line-crossed";
        case ScenarioPhase::ZoneEntered:
            return "zone-entered";
        case ScenarioPhase::Candidate:
            return "candidate";
        case ScenarioPhase::Observing:
            return "observing";
        case ScenarioPhase::Confirmed:
            return "confirmed";
        case ScenarioPhase::Cooldown:
            return "cooldown";
        case ScenarioPhase::Ended:
            return "ended";
    }
    return "unknown";
}

ScenarioEngineOptions BuildScenarioEngineOptionsFromConfig(const core::AnalysisRuntimeConfig& config) {
    ScenarioEngineOptions options;
    options.enabled = config.analysis_scenario_enabled ||
                      config.analysis_intrusion_dwell_enabled ||
                      config.analysis_re_entry_enabled ||
                      config.analysis_wrong_direction_enabled ||
                      config.analysis_intrusion_after_line_crossing_enabled ||
                      config.analysis_loitering_enabled ||
                      config.analysis_zone_occupancy_enabled;
    options.max_instances_per_channel = config.analysis_scenario_max_instances_per_channel;
    options.default_cooldown_ms = config.analysis_scenario_cooldown_ms;
    options.default_update_interval_ms = config.analysis_scenario_update_interval_ms;
    options.ended_retention_ms = config.analysis_scenario_retention_ms;
    options.cleanup_interval_ms = config.analysis_cleanup_interval_ms;
    return options;
}

std::string IScenario::ScenarioKey() const {
    return ScenarioId();
}

EventLifecycleOptions IScenario::EventOptions(const ScenarioInstance& instance,
                                              const ScenarioEngineOptions& engine_options) const {
    (void)instance;
    EventLifecycleOptions options;
    options.cooldown_ms = engine_options.default_cooldown_ms;
    options.update_interval_ms = engine_options.default_update_interval_ms;
    options.ended_retention_ms = engine_options.ended_retention_ms;
    options.cleanup_interval_ms = engine_options.cleanup_interval_ms;
    options.emit_start = true;
    options.emit_update = true;
    options.emit_confirmed = true;
    options.emit_end = false;
    return options;
}

ScenarioEngine::ScenarioEngine(ScenarioEngineOptions options) : options_(options) {
    options_.max_instances_per_channel = std::max<std::size_t>(1, options_.max_instances_per_channel);
    options_.default_cooldown_ms = std::max(0, options_.default_cooldown_ms);
    options_.default_update_interval_ms = std::max(0, options_.default_update_interval_ms);
    options_.ended_retention_ms = std::max(0, options_.ended_retention_ms);
    options_.cleanup_interval_ms = std::max(0, options_.cleanup_interval_ms);
}

void ScenarioEngine::RegisterScenario(std::unique_ptr<IScenario> scenario) {
    if (scenario == nullptr || scenario->ScenarioId().empty()) {
        return;
    }
    options_.enabled = true;
    scenarios_.push_back(std::move(scenario));
}

void ScenarioEngine::ReplaceScenarios(std::vector<std::unique_ptr<IScenario>> scenarios) {
    std::vector<std::unique_ptr<IScenario>> valid_scenarios;
    valid_scenarios.reserve(scenarios.size());
    std::unordered_set<std::string> active_keys;
    for (auto& scenario : scenarios) {
        if (scenario == nullptr || scenario->ScenarioId().empty()) {
            continue;
        }
        const std::string scenario_key = scenario->ScenarioKey();
        if (scenario_key.empty()) {
            continue;
        }
        active_keys.insert(scenario_key);
        valid_scenarios.push_back(std::move(scenario));
    }

    scenarios_ = std::move(valid_scenarios);
    options_.enabled = !scenarios_.empty();
    for (auto channel_it = instances_by_channel_.begin(); channel_it != instances_by_channel_.end();) {
        auto& instances = channel_it->second;
        for (auto instance_it = instances.begin(); instance_it != instances.end();) {
            const std::size_t split = instance_it->first.find(":track:");
            const std::string scenario_key =
                split == std::string::npos ? instance_it->first : instance_it->first.substr(0, split);
            if (active_keys.find(scenario_key) == active_keys.end()) {
                instance_it = instances.erase(instance_it);
            } else {
                ++instance_it;
            }
        }
        if (instances.empty()) {
            channel_it = instances_by_channel_.erase(channel_it);
        } else {
            ++channel_it;
        }
    }
}

std::vector<AnalysisEvent> ScenarioEngine::Evaluate(const SceneContext& scene_context,
                                                    EventManager* event_manager) {
    std::vector<AnalysisEvent> events;
    if (!options_.enabled || event_manager == nullptr || scenarios_.empty()) {
        return events;
    }

    const std::string channel_id = ResolveChannelId(scene_context.stream_id, scene_context.channel_id);
    auto& instances = instances_by_channel_[channel_id];

    for (const auto& scenario : scenarios_) {
        if (scenario == nullptr) {
            continue;
        }
        const std::string scenario_id = scenario->ScenarioId();
        const std::string scenario_key = scenario->ScenarioKey();
        if (scenario_id.empty() || scenario_key.empty()) {
            continue;
        }
        for (const auto& track_context : scene_context.tracks) {
            if (track_context.track_id == 0 ||
                track_context.lifecycle_state == TrackLifecycleState::Terminated) {
                continue;
            }

            const std::string instance_key = BuildInstanceKey(scenario_key, track_context.track_id);
            const auto previous_it = instances.find(instance_key);
            const ScenarioInstance* previous =
                previous_it == instances.end() ? nullptr : &previous_it->second;
            const ScenarioUpdate update = scenario->Evaluate(scene_context, track_context, previous);
            if (update.phase == ScenarioPhase::Idle && !update.event.has_value()) {
                if (previous_it != instances.end()) {
                    instances.erase(previous_it);
                }
                continue;
            }

            ScenarioInstance& instance = instances[instance_key];
            ApplyUpdate(&instance, scene_context, track_context, scenario_id, scenario_key, update);

            if (update.event.has_value()) {
                EventCandidate candidate;
                candidate.key.stream_id = scene_context.stream_id;
                candidate.key.channel_id = channel_id;
                candidate.key.scenario_id = scenario_key;
                candidate.key.zone_id = instance.zone_id;
                candidate.key.track_id = track_context.track_id;
                candidate.key.object_key = instance_key;
                candidate.event = *update.event;
                if (candidate.event.zone_id.empty() && candidate.event.line_id.empty()) {
                    candidate.event.zone_id = instance.zone_id;
                }
                candidate.event.scenario_name = scenario_id;
                candidate.event.scenario_phase = ToString(instance.phase);
                candidate.timestamp_ns = scene_context.timestamp_ns;
                candidate.active = update.active || IsActivePhase(update.phase);
                candidate.confirmed = update.confirmed || update.phase == ScenarioPhase::Confirmed;

                const auto decision =
                    event_manager->Update(candidate, scenario->EventOptions(instance, options_));
                if (decision.emit) {
                    events.push_back(decision.event);
                }
            }
        }
    }

    MaybeCleanupChannel(&instances, scene_context.timestamp_ns);
    EnforceChannelLimit(&instances);
    if (instances.empty()) {
        instances_by_channel_.erase(channel_id);
    }
    return events;
}

std::vector<ScenarioInstance> ScenarioEngine::Snapshot(const std::string& channel_id) const {
    std::vector<ScenarioInstance> snapshot;
    if (!channel_id.empty()) {
        const auto it = instances_by_channel_.find(channel_id);
        if (it == instances_by_channel_.end()) {
            return snapshot;
        }
        snapshot.reserve(it->second.size());
        for (const auto& [_, instance] : it->second) {
            snapshot.push_back(instance);
        }
        return snapshot;
    }

    for (const auto& [channel_key, instances] : instances_by_channel_) {
        (void)channel_key;
        snapshot.reserve(snapshot.size() + instances.size());
        for (const auto& [instance_key, instance] : instances) {
            (void)instance_key;
            snapshot.push_back(instance);
        }
    }
    return snapshot;
}

ScenarioEngineMetrics ScenarioEngine::Metrics() const {
    ScenarioEngineMetrics metrics;
    metrics.channel_count = instances_by_channel_.size();
    metrics.max_instances_per_channel = options_.max_instances_per_channel;
    metrics.cleanup_runs = cleanup_runs_;
    metrics.instances_removed_by_cleanup = instances_removed_by_cleanup_;
    metrics.last_cleanup_time_ns = last_cleanup_time_ns_;
    metrics.last_cleanup_time_ms = TimestampMs(last_cleanup_time_ns_);
    for (const auto& [channel_key, instances] : instances_by_channel_) {
        (void)channel_key;
        for (const auto& [instance_key, instance] : instances) {
            (void)instance_key;
            ++metrics.total_instances;
            if (IsActivePhase(instance.phase)) {
                ++metrics.active_instances;
            } else if (instance.phase == ScenarioPhase::Cooldown) {
                ++metrics.cooldown_instances;
            } else if (instance.phase == ScenarioPhase::Ended) {
                ++metrics.ended_instances;
            }
        }
    }
    return metrics;
}

void ScenarioEngine::Reset() {
    instances_by_channel_.clear();
    last_cleanup_time_ns_ = 0;
    cleanup_runs_ = 0;
    instances_removed_by_cleanup_ = 0;
}

std::string ScenarioEngine::ResolveChannelId(const std::string& stream_id, const std::string& channel_id) {
    if (!channel_id.empty()) {
        return channel_id;
    }
    return stream_id.empty() ? std::string{"default"} : stream_id;
}

std::string ScenarioEngine::BuildInstanceKey(const std::string& scenario_id, std::uint64_t track_id) {
    std::ostringstream out;
    out << scenario_id << ":track:" << track_id;
    return out.str();
}

bool ScenarioEngine::IsActivePhase(ScenarioPhase phase) {
    return phase == ScenarioPhase::LineCrossed || phase == ScenarioPhase::ZoneEntered ||
           phase == ScenarioPhase::Candidate || phase == ScenarioPhase::Observing ||
           phase == ScenarioPhase::Confirmed;
}

bool ScenarioEngine::IsTerminalPhase(ScenarioPhase phase) {
    return phase == ScenarioPhase::Cooldown || phase == ScenarioPhase::Ended;
}

void ScenarioEngine::ApplyUpdate(ScenarioInstance* instance,
                                 const SceneContext& scene_context,
                                 const TrackSceneContext& track_context,
                                 const std::string& scenario_id,
                                 const std::string& scenario_key,
                                 const ScenarioUpdate& update) const {
    if (instance == nullptr) {
        return;
    }

    const bool is_new = instance->scenario_id.empty();
    const bool reactivating = !is_new && IsTerminalPhase(instance->phase) && IsActivePhase(update.phase);
    if (is_new || reactivating) {
        instance->stream_id = scene_context.stream_id;
        instance->channel_id = ResolveChannelId(scene_context.stream_id, scene_context.channel_id);
        instance->scenario_id = scenario_id;
        instance->scenario_key = scenario_key;
        instance->track_id = track_context.track_id;
        instance->first_seen_ns = scene_context.timestamp_ns;
        instance->phase_entered_ns = scene_context.timestamp_ns;
        instance->previous_phase = ScenarioPhase::Idle;
        instance->confirmed_at_ns = 0;
        instance->cooldown_until_ns = 0;
        instance->ended_at_ns = 0;
    }

    if (instance->phase != update.phase) {
        instance->previous_phase = instance->phase;
        instance->phase_entered_ns = scene_context.timestamp_ns;
    }
    instance->last_seen_ns = scene_context.timestamp_ns;
    instance->zone_id = update.zone_id;
    instance->phase = update.phase;

    if (update.phase == ScenarioPhase::Confirmed && instance->confirmed_at_ns == 0) {
        instance->confirmed_at_ns = scene_context.timestamp_ns;
    }
    if (update.phase == ScenarioPhase::Cooldown) {
        instance->cooldown_until_ns =
            scene_context.timestamp_ns + MsToNs(options_.default_cooldown_ms);
    }
    if (update.phase == ScenarioPhase::Ended && instance->ended_at_ns == 0) {
        instance->ended_at_ns = scene_context.timestamp_ns;
    }
}

void ScenarioEngine::EnforceChannelLimit(InstanceMap* instances) {
    if (instances == nullptr || instances->size() <= options_.max_instances_per_channel) {
        return;
    }
    const std::size_t before = instances->size();
    for (auto it = instances->begin(); it != instances->end() &&
                                        instances->size() > options_.max_instances_per_channel;) {
        if (it->second.phase == ScenarioPhase::Ended || it->second.phase == ScenarioPhase::Cooldown) {
            it = instances->erase(it);
        } else {
            ++it;
        }
    }
    instances_removed_by_cleanup_ += before - instances->size();
}

bool ScenarioEngine::ShouldRunCleanup(std::int64_t timestamp_ns) const {
    const std::int64_t interval_ns = MsToNs(options_.cleanup_interval_ms);
    if (interval_ns <= 0) {
        return true;
    }
    if (last_cleanup_time_ns_ <= 0) {
        return true;
    }
    return timestamp_ns >= last_cleanup_time_ns_ + interval_ns;
}

void ScenarioEngine::MaybeCleanupChannel(InstanceMap* instances, std::int64_t timestamp_ns) {
    if (!ShouldRunCleanup(timestamp_ns)) {
        return;
    }
    instances_removed_by_cleanup_ += CleanupChannel(instances, timestamp_ns);
    ++cleanup_runs_;
    last_cleanup_time_ns_ = timestamp_ns;
}

std::size_t ScenarioEngine::CleanupChannel(InstanceMap* instances, std::int64_t timestamp_ns) const {
    if (instances == nullptr) {
        return 0;
    }
    const std::int64_t retention_ns = MsToNs(options_.ended_retention_ms);
    std::size_t removed = 0;
    for (auto it = instances->begin(); it != instances->end();) {
        const auto& instance = it->second;
        const bool ended_expired = instance.phase == ScenarioPhase::Ended &&
                                   instance.ended_at_ns > 0 &&
                                   timestamp_ns >= instance.ended_at_ns + retention_ns;
        const bool cooldown_expired = instance.phase == ScenarioPhase::Cooldown &&
                                      instance.cooldown_until_ns > 0 &&
                                      timestamp_ns >= instance.cooldown_until_ns + retention_ns;
        if (ended_expired || cooldown_expired) {
            it = instances->erase(it);
            ++removed;
        } else {
            ++it;
        }
    }
    return removed;
}

}  // namespace analysis

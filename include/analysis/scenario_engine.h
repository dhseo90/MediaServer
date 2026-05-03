// 파일 요약: 상태 머신 기반 상황 분석 ScenarioEngine 계약을 선언한다.
// 동작 요약: stream/channel/track별 ScenarioInstance를 관리하고 EventManager로 emit을 위임한다.
// 동작 요약: IntrusionDwellScenario 같은 구현체는 설정에 따라 별도 등록된다.
#pragma once

#include <cstdint>
#include <memory>
#include <optional>
#include <string>
#include <unordered_map>
#include <vector>

#include "app_config.h"
#include "analysis/event_manager.h"
#include "analysis/scene_context_builder.h"
#include "stdafx.h"

namespace analysis {

enum class ScenarioPhase {
    Idle,
    LineCrossed,
    ZoneEntered,
    Candidate,
    Observing,
    Confirmed,
    Cooldown,
    Ended,
};

const char* ToString(ScenarioPhase phase);

struct ScenarioEngineOptions {
    bool enabled{app_config::kDefaultAnalysisScenarioEnabled};
    std::size_t max_instances_per_channel{app_config::kDefaultAnalysisScenarioMaxInstancesPerChannel};
    int default_cooldown_ms{app_config::kDefaultAnalysisScenarioCooldownMs};
    int default_update_interval_ms{app_config::kDefaultAnalysisScenarioUpdateIntervalMs};
    int ended_retention_ms{app_config::kDefaultAnalysisScenarioEndedRetentionMs};
    int cleanup_interval_ms{app_config::kDefaultAnalysisCleanupIntervalMs};
};

ScenarioEngineOptions BuildScenarioEngineOptionsFromConfig(const app::AppConfig& config);

struct ScenarioInstance {
    std::string stream_id;
    std::string channel_id;
    std::string scenario_id;
    std::string zone_id;
    std::uint64_t track_id{0};
    ScenarioPhase phase{ScenarioPhase::Idle};
    std::int64_t first_seen_ns{0};
    std::int64_t last_seen_ns{0};
    std::int64_t phase_entered_ns{0};
    std::int64_t confirmed_at_ns{0};
    std::int64_t cooldown_until_ns{0};
    std::int64_t ended_at_ns{0};
};

struct ScenarioUpdate {
    ScenarioPhase phase{ScenarioPhase::Idle};
    std::string zone_id;
    bool active{false};
    bool confirmed{false};
    std::optional<AnalysisEvent> event;
};

struct ScenarioEngineMetrics {
    std::size_t channel_count{0};
    std::size_t total_instances{0};
    std::size_t active_instances{0};
    std::size_t cooldown_instances{0};
    std::size_t ended_instances{0};
    std::size_t max_instances_per_channel{0};
    std::size_t cleanup_runs{0};
    std::size_t instances_removed_by_cleanup{0};
    std::int64_t last_cleanup_time_ns{0};
    std::int64_t last_cleanup_time_ms{0};
};

class IScenario {
public:
    virtual ~IScenario() = default;

    virtual std::string ScenarioId() const = 0;
    virtual std::string ScenarioKey() const;
    virtual ScenarioUpdate Evaluate(const SceneContext& scene_context,
                                    const TrackSceneContext& track_context,
                                    const ScenarioInstance* previous_instance) = 0;
    virtual EventLifecycleOptions EventOptions(const ScenarioInstance& instance,
                                               const ScenarioEngineOptions& engine_options) const;
};

class ScenarioEngine {
public:
    explicit ScenarioEngine(ScenarioEngineOptions options = {});

    void RegisterScenario(std::unique_ptr<IScenario> scenario);
    void ReplaceScenarios(std::vector<std::unique_ptr<IScenario>> scenarios);
    std::vector<AnalysisEvent> Evaluate(const SceneContext& scene_context, EventManager* event_manager);
    std::vector<ScenarioInstance> Snapshot(const std::string& channel_id = {}) const;
    ScenarioEngineMetrics Metrics() const;
    void Reset();

private:
    using InstanceMap = std::unordered_map<std::string, ScenarioInstance>;

    static std::string ResolveChannelId(const std::string& stream_id, const std::string& channel_id);
    static std::string BuildInstanceKey(const std::string& scenario_id, std::uint64_t track_id);
    static bool IsActivePhase(ScenarioPhase phase);
    static bool IsTerminalPhase(ScenarioPhase phase);
    void ApplyUpdate(ScenarioInstance* instance,
                     const SceneContext& scene_context,
                     const TrackSceneContext& track_context,
                     const std::string& scenario_id,
                     const ScenarioUpdate& update) const;
    void EnforceChannelLimit(InstanceMap* instances);
    bool ShouldRunCleanup(std::int64_t timestamp_ns) const;
    void MaybeCleanupChannel(InstanceMap* instances, std::int64_t timestamp_ns);
    std::size_t CleanupChannel(InstanceMap* instances, std::int64_t timestamp_ns) const;

    ScenarioEngineOptions options_;
    std::vector<std::unique_ptr<IScenario>> scenarios_;
    std::unordered_map<std::string, InstanceMap> instances_by_channel_;
    std::int64_t last_cleanup_time_ns_{0};
    std::size_t cleanup_runs_{0};
    std::size_t instances_removed_by_cleanup_{0};
};

}  // namespace analysis

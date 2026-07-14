// 파일 요약: 제한구역 체류 기반 IntrusionDwellScenario 계약을 선언한다.
// 동작 요약: person track이 restricted zone에 들어온 뒤 candidate/observing/confirmed/end phase를 산출한다.
// 동작 요약: Confirmed 이벤트는 EventManager lifecycle을 통해 1회만 외부 emit된다.
#pragma once

#include <string>
#include <vector>

#include "analysis/scenario_engine.h"

namespace analysis {

struct IntrusionDwellScenarioOptions {
    bool enabled{core::analysis_runtime_defaults::kDefaultAnalysisIntrusionDwellEnabled};
    std::string scenario_key;
    int candidate_time_ms{core::analysis_runtime_defaults::kDefaultAnalysisIntrusionDwellCandidateMs};
    int dwell_time_ms{core::analysis_runtime_defaults::kDefaultAnalysisIntrusionDwellDwellMs};
    int cooldown_ms{core::analysis_runtime_defaults::kDefaultAnalysisIntrusionDwellCooldownMs};
    bool require_stable_track{false};
    std::vector<std::string> target_class_tokens{"person"};
    std::vector<std::string> restricted_zone_ids;
};

IntrusionDwellScenarioOptions BuildIntrusionDwellScenarioOptionsFromConfig(const core::AnalysisRuntimeConfig& config);

class IntrusionDwellScenario : public IScenario {
public:
    explicit IntrusionDwellScenario(IntrusionDwellScenarioOptions options = {});

    std::string ScenarioId() const override;
    std::string ScenarioKey() const override;
    ScenarioUpdate Evaluate(const SceneContext& scene_context,
                            const TrackSceneContext& track_context,
                            const ScenarioInstance* previous_instance) override;
    EventLifecycleOptions EventOptions(const ScenarioInstance& instance,
                                       const ScenarioEngineOptions& engine_options) const override;

private:
    bool MatchesTargetClass(const TrackSceneContext& track_context) const;
    bool ZoneAllowed(const std::string& zone_id) const;
    const ZoneState* ActiveRestrictedZone(const TrackSceneContext& track_context) const;
    AnalysisEvent BuildEvent(const TrackSceneContext& track_context, const ZoneState& zone_state) const;

    IntrusionDwellScenarioOptions options_;
};

}  // namespace analysis

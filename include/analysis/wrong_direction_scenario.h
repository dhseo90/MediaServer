// 파일 요약: 허용되지 않은 line crossing 방향을 감지하는 WrongDirectionScenario 계약을 선언한다.
// 동작 요약: LineCrossState의 raw crossing 방향과 line별 allowedDirection을 비교해 wrong-direction 이벤트를 1회 emit한다.
// 동작 요약: 기존 line-crossing rule event는 변경하지 않고 별도 scenario event로만 동작한다.
#pragma once

#include <string>
#include <unordered_map>
#include <vector>

#include "analysis/scenario_engine.h"

namespace analysis {

struct WrongDirectionScenarioOptions {
    bool enabled{core::analysis_runtime_defaults::kDefaultAnalysisWrongDirectionEnabled};
    std::string scenario_key;
    int cooldown_ms{core::analysis_runtime_defaults::kDefaultAnalysisWrongDirectionCooldownMs};
    bool require_stable_track{false};
    std::vector<std::string> target_class_tokens{"person"};
    std::vector<std::string> target_line_ids;
    std::vector<std::string> allowed_direction_rules;
};

WrongDirectionScenarioOptions BuildWrongDirectionScenarioOptionsFromConfig(const core::AnalysisRuntimeConfig& config);

class WrongDirectionScenario : public IScenario {
public:
    explicit WrongDirectionScenario(WrongDirectionScenarioOptions options = {});

    std::string ScenarioId() const override;
    std::string ScenarioKey() const override;
    ScenarioUpdate Evaluate(const SceneContext& scene_context,
                            const TrackSceneContext& track_context,
                            const ScenarioInstance* previous_instance) override;
    EventLifecycleOptions EventOptions(const ScenarioInstance& instance,
                                       const ScenarioEngineOptions& engine_options) const override;

private:
    bool MatchesTargetClass(const TrackSceneContext& track_context) const;
    bool LineAllowed(const std::string& line_id) const;
    std::string AllowedDirectionForLine(const LineCrossState& line_state) const;
    bool DirectionAllowed(const std::string& allowed, const std::string& actual) const;
    const LineCrossState* FindWrongDirectionLine(const TrackSceneContext& track_context) const;
    AnalysisEvent BuildEvent(const TrackSceneContext& track_context,
                             const LineCrossState& line_state,
                             const std::string& allowed_direction) const;
    AnalysisEvent BuildEndEvent(const TrackSceneContext& track_context,
                                const std::string& line_id) const;
    void ParseAllowedDirectionRules();

    WrongDirectionScenarioOptions options_;
    std::unordered_map<std::string, std::string> allowed_direction_by_line_;
};

}  // namespace analysis

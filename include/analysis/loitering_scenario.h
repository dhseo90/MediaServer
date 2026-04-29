// 파일 요약: 관심구역/제한구역 내 체류와 작은 반경 이동을 감지하는 LoiteringScenario 계약을 선언한다.
// 동작 요약: target zone dwell time과 downsampled trajectory radius를 기반으로 loitering event를 1회 emit한다.
// 동작 요약: 기존 intrusion/line-crossing 계열 이벤트와 별도 event type loitering을 사용한다.
#pragma once

#include <string>
#include <vector>

#include "analysis/scenario_engine.h"

namespace analysis {

struct LoiteringScenarioOptions {
    bool enabled{app_config::kDefaultAnalysisLoiteringEnabled};
    int min_dwell_time_ms{app_config::kDefaultAnalysisLoiteringMinDwellTimeMs};
    float max_movement_radius{app_config::kDefaultAnalysisLoiteringMaxMovementRadius};
    std::size_t min_trajectory_points{app_config::kDefaultAnalysisLoiteringMinTrajectoryPoints};
    int cooldown_ms{app_config::kDefaultAnalysisLoiteringCooldownMs};
    bool use_ground_plane_movement_radius{app_config::kDefaultAnalysisLoiteringUseGroundPlane};
    std::vector<std::string> target_class_tokens{"person"};
    std::vector<std::string> target_zone_ids;
};

LoiteringScenarioOptions BuildLoiteringScenarioOptionsFromConfig(const app::AppConfig& config);

class LoiteringScenario : public IScenario {
public:
    explicit LoiteringScenario(LoiteringScenarioOptions options = {});

    std::string ScenarioId() const override;
    ScenarioUpdate Evaluate(const SceneContext& scene_context,
                            const TrackSceneContext& track_context,
                            const ScenarioInstance* previous_instance) override;
    EventLifecycleOptions EventOptions(const ScenarioInstance& instance,
                                       const ScenarioEngineOptions& engine_options) const override;

private:
    struct MovementSummary {
        std::size_t point_count{0};
        float radius{0.0F};
        bool uses_ground_plane{false};
        std::string units{"image"};
    };

    bool MatchesTargetClass(const TrackSceneContext& track_context) const;
    bool ZoneAllowed(const std::string& zone_id) const;
    const ZoneState* ActiveTargetZone(const TrackSceneContext& track_context) const;
    MovementSummary CalculateMovementRadius(const TrackSceneContext& track_context,
                                            const ZoneState& zone_state) const;
    AnalysisEvent BuildEvent(const TrackSceneContext& track_context,
                             const ZoneState& zone_state,
                             const MovementSummary& movement) const;
    AnalysisEvent BuildEndEvent(const TrackSceneContext& track_context,
                                const std::string& zone_id) const;

    LoiteringScenarioOptions options_;
};

}  // namespace analysis

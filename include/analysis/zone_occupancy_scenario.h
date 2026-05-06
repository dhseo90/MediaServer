// 파일 요약: 제한구역 안 객체 수가 임계값을 넘는 상황을 감지하는 ZoneOccupancyScenario 계약을 선언한다.
// 동작 요약: 같은 zone의 동시 점유 수와 최소 dwell 조건을 기반으로 zone-occupancy event를 1회 emit한다.
// 동작 요약: per-track ScenarioEngine 위에서 zone 대표 track만 event를 내 중복 알림을 억제한다.
#pragma once

#include <cstdint>
#include <string>
#include <unordered_map>
#include <vector>

#include "analysis/scenario_engine.h"

namespace analysis {

struct ZoneOccupancyScenarioOptions {
    bool enabled{app_config::kDefaultAnalysisZoneOccupancyEnabled};
    std::string scenario_key;
    std::size_t occupancy_threshold{app_config::kDefaultAnalysisZoneOccupancyThreshold};
    int min_dwell_time_ms{app_config::kDefaultAnalysisZoneOccupancyMinDwellTimeMs};
    int cooldown_ms{app_config::kDefaultAnalysisZoneOccupancyCooldownMs};
    bool require_stable_track{false};
    std::vector<std::string> target_class_tokens{"person"};
    std::vector<std::string> target_zone_ids;
};

ZoneOccupancyScenarioOptions BuildZoneOccupancyScenarioOptionsFromConfig(
    const app::AppConfig& config);

class ZoneOccupancyScenario : public IScenario {
public:
    explicit ZoneOccupancyScenario(ZoneOccupancyScenarioOptions options = {});

    std::string ScenarioId() const override;
    std::string ScenarioKey() const override;
    ScenarioUpdate Evaluate(const SceneContext& scene_context,
                            const TrackSceneContext& track_context,
                            const ScenarioInstance* previous_instance) override;
    EventLifecycleOptions EventOptions(const ScenarioInstance& instance,
                                       const ScenarioEngineOptions& engine_options) const override;

private:
    struct OccupancySummary {
        std::string zone_id;
        std::size_t occupancy_count{0};
        std::size_t dwell_qualified_count{0};
        std::uint64_t representative_track_id{0};
        std::int64_t min_dwell_observed_ms{0};
        const ZoneState* representative_zone_state{nullptr};
    };

    struct ZoneRuntimeState {
        bool active{false};
        std::int64_t last_seen_ns{0};
        std::int64_t last_confirmed_ns{0};
    };

    bool MatchesTargetClass(const TrackSceneContext& track_context) const;
    bool TrackEligible(const TrackSceneContext& track_context) const;
    bool ZoneAllowed(const std::string& zone_id) const;
    const ZoneState* ActiveTargetZone(const TrackSceneContext& track_context) const;
    OccupancySummary BuildOccupancySummary(const SceneContext& scene_context,
                                           const std::string& zone_id) const;
    std::string RuntimeZoneKey(const SceneContext& scene_context,
                               const std::string& zone_id) const;
    AnalysisEvent BuildEvent(const TrackSceneContext& track_context,
                             const OccupancySummary& summary) const;
    AnalysisEvent BuildEndEvent(const TrackSceneContext& track_context,
                                const std::string& zone_id) const;

    ZoneOccupancyScenarioOptions options_;
    std::unordered_map<std::string, ZoneRuntimeState> states_by_zone_;
};

}  // namespace analysis

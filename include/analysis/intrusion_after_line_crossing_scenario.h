// 파일 요약: line crossing 후 제한구역 체류 조합을 감지하는 IntrusionAfterLineCrossingScenario 계약을 선언한다.
// 동작 요약: 특정 line crossing 기록 뒤 target zone 진입/체류 조건을 만족하면 별도 scenario event를 1회 emit한다.
// 동작 요약: 기존 Intrusion, LineCrossing, IntrusionDwell event 경로와 별도 event type을 사용한다.
#pragma once

#include <cstdint>
#include <string>
#include <unordered_map>
#include <vector>

#include "analysis/scenario_engine.h"

namespace analysis {

struct IntrusionAfterLineCrossingScenarioOptions {
    bool enabled{core::analysis_runtime_defaults::kDefaultAnalysisIntrusionAfterLineCrossingEnabled};
    std::string scenario_key;
    int max_delay_after_crossing_ms{
        core::analysis_runtime_defaults::kDefaultAnalysisIntrusionAfterLineCrossingMaxDelayMs};
    int dwell_time_ms{core::analysis_runtime_defaults::kDefaultAnalysisIntrusionAfterLineCrossingDwellMs};
    int cooldown_ms{core::analysis_runtime_defaults::kDefaultAnalysisIntrusionAfterLineCrossingCooldownMs};
    bool require_stable_track{false};
    std::vector<std::string> target_class_tokens{"person"};
    std::vector<std::string> target_line_ids;
    std::vector<std::string> target_zone_ids;
};

IntrusionAfterLineCrossingScenarioOptions BuildIntrusionAfterLineCrossingScenarioOptionsFromConfig(
    const core::AnalysisRuntimeConfig& config);

class IntrusionAfterLineCrossingScenario : public IScenario {
public:
    explicit IntrusionAfterLineCrossingScenario(
        IntrusionAfterLineCrossingScenarioOptions options = {});

    std::string ScenarioId() const override;
    std::string ScenarioKey() const override;
    ScenarioUpdate Evaluate(const SceneContext& scene_context,
                            const TrackSceneContext& track_context,
                            const ScenarioInstance* previous_instance) override;
    EventLifecycleOptions EventOptions(const ScenarioInstance& instance,
                                       const ScenarioEngineOptions& engine_options) const override;

private:
    struct LineCrossRecord {
        std::string stream_id;
        std::string channel_id;
        std::uint64_t track_id{0};
        std::string line_id;
        std::string direction;
        std::int64_t crossed_at_ns{0};
        std::int64_t triggered_at_ns{0};
    };

    bool MatchesTargetClass(const TrackSceneContext& track_context) const;
    bool LineAllowed(const std::string& line_id) const;
    bool ZoneAllowed(const std::string& zone_id) const;
    const ZoneState* ActiveTargetZone(const TrackSceneContext& track_context) const;
    void RecordLineCrossings(const SceneContext& scene_context,
                             const TrackSceneContext& track_context);
    LineCrossRecord* FindRecentLineCrossRecord(const SceneContext& scene_context,
                                               const TrackSceneContext& track_context);
    void CleanupLineCrossRecords(std::int64_t timestamp_ns);
    AnalysisEvent BuildEvent(const TrackSceneContext& track_context,
                             const LineCrossRecord& record,
                             const ZoneState& zone_state,
                             std::int64_t timestamp_ns) const;
    AnalysisEvent BuildEndEvent(const TrackSceneContext& track_context,
                                const std::string& zone_id) const;
    std::string BuildLineCrossKey(const std::string& channel_id,
                                  std::uint64_t track_id,
                                  const std::string& line_id) const;
    std::string ResolveChannelId(const SceneContext& scene_context,
                                 const TrackSceneContext& track_context) const;

    IntrusionAfterLineCrossingScenarioOptions options_;
    std::unordered_map<std::string, LineCrossRecord> line_cross_records_;
    std::int64_t last_cleanup_time_ns_{0};
};

}  // namespace analysis

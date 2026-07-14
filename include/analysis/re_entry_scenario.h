// 파일 요약: 제한구역 이탈 후 짧은 시간 내 재진입을 감지하는 ReEntryScenario 계약을 선언한다.
// 동작 요약: stream/channel/track/zone별 exit 기록을 제한적으로 보관하고 재진입 event를 1회 emit한다.
// 동작 요약: 기존 intrusion/line-crossing/intrusion-dwell event 경로와 별도 event type re-entry를 사용한다.
#pragma once

#include <cstdint>
#include <string>
#include <unordered_map>
#include <vector>

#include "analysis/scenario_engine.h"

namespace analysis {

struct ReEntryScenarioOptions {
    bool enabled{core::analysis_runtime_defaults::kDefaultAnalysisReEntryEnabled};
    std::string scenario_key;
    int re_entry_window_ms{core::analysis_runtime_defaults::kDefaultAnalysisReEntryWindowMs};
    int cooldown_ms{core::analysis_runtime_defaults::kDefaultAnalysisReEntryCooldownMs};
    bool require_stable_track{false};
    std::vector<std::string> target_class_tokens{"person"};
    std::vector<std::string> target_zone_ids;
    std::string re_entry_mode{"same-zone"};
    std::vector<std::string> re_entry_zone_ids;
};

ReEntryScenarioOptions BuildReEntryScenarioOptionsFromConfig(const core::AnalysisRuntimeConfig& config);

class ReEntryScenario : public IScenario {
public:
    explicit ReEntryScenario(ReEntryScenarioOptions options = {});

    std::string ScenarioId() const override;
    std::string ScenarioKey() const override;
    ScenarioUpdate Evaluate(const SceneContext& scene_context,
                            const TrackSceneContext& track_context,
                            const ScenarioInstance* previous_instance) override;
    EventLifecycleOptions EventOptions(const ScenarioInstance& instance,
                                       const ScenarioEngineOptions& engine_options) const override;

private:
    struct ExitRecord {
        std::string stream_id;
        std::string channel_id;
        std::uint64_t track_id{0};
        std::string zone_id;
        std::int64_t exited_at_ns{0};
        std::int64_t triggered_at_ns{0};
    };

    bool MatchesTargetClass(const TrackSceneContext& track_context) const;
    bool ConfiguredZoneMode() const;
    bool SourceZoneAllowed(const std::string& zone_id) const;
    bool EntryZoneAllowed(const std::string& zone_id) const;
    const ZoneState* ActiveTargetZone(const TrackSceneContext& track_context) const;
    void RecordZoneExits(const SceneContext& scene_context, const TrackSceneContext& track_context);
    ExitRecord* FindRecentExit(const SceneContext& scene_context,
                               const TrackSceneContext& track_context,
                               const std::string& zone_id);
    bool IsRecentExitRecord(const SceneContext& scene_context,
                            const TrackSceneContext& track_context,
                            const ExitRecord& record) const;
    void CleanupExitRecords(std::int64_t timestamp_ns);
    AnalysisEvent BuildEvent(const TrackSceneContext& track_context, const std::string& zone_id) const;
    std::string BuildExitKey(const std::string& channel_id,
                             std::uint64_t track_id,
                             const std::string& zone_id) const;
    std::string ResolveChannelId(const SceneContext& scene_context,
                                 const TrackSceneContext& track_context) const;

    ReEntryScenarioOptions options_;
    std::unordered_map<std::string, ExitRecord> exit_records_;
    std::int64_t last_cleanup_time_ns_{0};
};

}  // namespace analysis

// 파일 요약: TrackRuntimeState를 zone/line 기반 scene context로 변환하는 계약을 선언한다.
// 동작 요약: zone dwell, restricted zone 포함 여부, line crossing side/direction을 계산한다.
// 동작 요약: 이벤트는 발생시키지 않고 ScenarioEngine 입력용 context만 만든다.
#pragma once

#include <cstdint>
#include <optional>
#include <string>
#include <unordered_map>
#include <vector>

#include "analysis/track_state_manager.h"

namespace app {
struct AppConfig;
}

namespace analysis {

struct SceneGeometryPoint {
    float x{0.0F};
    float y{0.0F};
};

struct SceneZoneDefinition {
    std::string zone_id;
    std::string stream_id;
    std::string channel_id;
    bool restricted{true};
    std::vector<SceneGeometryPoint> polygon;
};

struct SceneLineDefinition {
    std::string line_id;
    std::string stream_id;
    std::string channel_id;
    std::string allowed_direction{"any"};
    std::vector<SceneGeometryPoint> points;
};

struct SceneGeometryConfig {
    std::vector<SceneZoneDefinition> zones;
    std::vector<SceneLineDefinition> lines;
};

struct ZoneState {
    std::string current_zone;
    std::string previous_zone;
    std::int64_t entered_at_ns{0};
    std::int64_t entered_at_ms{0};
    std::int64_t exited_at_ns{0};
    std::int64_t exited_at_ms{0};
    std::int64_t dwell_time_ms{0};
    bool is_inside_restricted_zone{false};
    bool had_previous_observation{false};
    bool has_observation{false};
    bool changed{false};
};

struct LineCrossState {
    std::string line_id;
    float previous_side{0.0F};
    float current_side{0.0F};
    bool crossed{false};
    std::string direction{"none"};
    std::int64_t last_cross_time_ns{0};
    std::int64_t last_cross_time_ms{0};
};

struct TrackSceneContext {
    std::string stream_id;
    std::string channel_id;
    std::uint64_t track_id{0};
    int class_id{-1};
    std::string class_name;
    float confidence{0.0F};
    TrackLifecycleState lifecycle_state{TrackLifecycleState::Active};
    TrackHealth track_health;
    std::optional<AppearanceProfile> appearance_profile;
    ObjectDirection direction;
    NormalizedPointF center;
    RectF bbox;
    ZoneState zone_state;
    std::vector<ZoneState> zone_states;
    std::vector<LineCrossState> line_states;
};

struct SceneContext {
    std::string stream_id;
    std::string channel_id;
    std::int64_t timestamp_ns{0};
    std::int64_t timestamp_ms{0};
    std::vector<TrackSceneContext> tracks;
};

struct SceneContextBuilderOptions {
    std::size_t max_track_contexts_per_channel{2048};
    std::int64_t retained_context_ms{5000};
    std::int64_t cleanup_interval_ms{1000};
};

class SceneContextBuilder {
public:
    explicit SceneContextBuilder(SceneContextBuilderOptions options = {});

    SceneContext Build(const std::string& stream_id,
                       const std::string& channel_id,
                       const std::vector<TrackRuntimeState>& track_states,
                       const std::vector<SceneZoneDefinition>& zones,
                       const std::vector<SceneLineDefinition>& lines,
                       std::int64_t timestamp_ns);
    SceneContext Build(const std::string& stream_id,
                       const std::string& channel_id,
                       const std::vector<TrackRuntimeState>& track_states,
                       const SceneGeometryConfig& geometry_config,
                       std::int64_t timestamp_ns);
    void Reset();

private:
    struct TrackSceneRuntime {
        std::unordered_map<std::string, ZoneState> zone_states;
        std::unordered_map<std::string, float> previous_line_side;
        std::unordered_map<std::string, std::int64_t> last_cross_time_ns;
        std::int64_t last_observed_ns{0};
    };

    using TrackContextMap = std::unordered_map<std::uint64_t, TrackSceneRuntime>;

    static std::string ResolveChannelId(const std::string& stream_id, const std::string& channel_id);
    bool ShouldRunCleanup(std::int64_t timestamp_ns) const;
    void CleanupChannel(TrackContextMap* contexts,
                        const std::vector<std::uint64_t>& observed_track_ids,
                        std::int64_t timestamp_ns);
    void EnforceChannelLimit(TrackContextMap* contexts,
                             const std::vector<std::uint64_t>& observed_track_ids);

    SceneContextBuilderOptions options_;
    std::unordered_map<std::string, TrackContextMap> contexts_by_channel_;
    std::int64_t last_cleanup_time_ns_{0};
};

SceneGeometryConfig BuildSceneGeometryConfigFromRuleDocuments(const std::vector<std::string>& rule_documents,
                                                              const AnalysisContext& context);
SceneContextBuilderOptions BuildSceneContextBuilderOptionsFromConfig(const app::AppConfig& config);

}  // namespace analysis

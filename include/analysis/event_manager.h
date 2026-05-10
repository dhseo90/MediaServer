// 파일 요약: rule/scenario 이벤트의 내부 lifecycle 상태를 관리하는 계약을 선언한다.
// 동작 요약: start/update/confirmed/cooldown/end 단계와 track/zone별 중복 억제를 처리한다.
// 동작 요약: 외부 이벤트 JSON 형식은 바꾸지 않고 AnalysisEvent emit 여부만 결정한다.
#pragma once

#include <cstdint>
#include <string>
#include <unordered_map>
#include <vector>

#include "analysis/event_rule_engine.h"

namespace analysis {

enum class EventLifecycleStage {
    None,
    Start,
    Update,
    Confirmed,
    Cooldown,
    End,
};

const char* ToString(EventLifecycleStage stage);

struct EventLifecycleKey {
    std::string stream_id;
    std::string channel_id;
    std::string scenario_id;
    std::string zone_id;
    std::uint64_t track_id{0};
    std::string object_key;
};

struct EventLifecycleOptions {
    std::int64_t cooldown_ms{0};
    std::int64_t update_interval_ms{0};
    std::int64_t ended_retention_ms{5000};
    std::int64_t cleanup_interval_ms{1000};
    bool emit_start{true};
    bool emit_update{true};
    bool emit_confirmed{true};
    bool emit_end{false};
};

struct EventCandidate {
    EventLifecycleKey key;
    AnalysisEvent event;
    std::int64_t timestamp_ns{0};
    bool active{true};
    bool confirmed{false};
};

struct EventLifecycleDecision {
    bool emit{false};
    bool suppressed{false};
    EventLifecycleStage stage{EventLifecycleStage::None};
    AnalysisEvent event;
};

struct EventManagerMetrics {
    std::size_t total_states{0};
    std::size_t active_states{0};
    std::size_t cooldown_states{0};
    std::size_t ended_states{0};
    std::uint64_t emitted_count{0};
    std::uint64_t suppressed_count{0};
    std::size_t cleanup_runs{0};
    std::size_t states_removed_by_cleanup{0};
    std::int64_t last_cleanup_time_ns{0};
    std::int64_t last_cleanup_time_ms{0};
};

struct EventManagerChannelMetrics {
    std::string stream_id;
    std::string channel_id;
    std::size_t total_states{0};
    std::size_t active_states{0};
    std::uint64_t emitted_count{0};
    std::uint64_t suppressed_count{0};
};

struct EventLifecycleStateSnapshot {
    std::string key;
    std::string stream_id;
    std::string channel_id;
    std::string scenario_id;
    std::string zone_id;
    std::uint64_t track_id{0};
    std::string object_key;
    EventLifecycleStage stage{EventLifecycleStage::None};
    bool active{false};
    bool confirmed{false};
    std::int64_t first_seen_ms{0};
    std::int64_t last_seen_ms{0};
    std::int64_t last_emitted_ms{0};
    std::int64_t cooldown_until_ms{0};
    std::int64_t ended_at_ms{0};
    std::uint64_t emitted_count{0};
    std::uint64_t suppressed_count{0};
    std::string last_event_id;
    std::string last_event_status;
};

class EventManager {
public:
    EventLifecycleDecision Update(const EventCandidate& candidate,
                                  const EventLifecycleOptions& options = {});
    void Reset();
    std::size_t ActiveStateCount() const;
    EventManagerMetrics Metrics() const;
    std::vector<EventManagerChannelMetrics> ChannelMetrics() const;
    std::vector<EventLifecycleStateSnapshot> Snapshot() const;

private:
    struct EventLifecycleState {
        EventLifecycleKey key;
        EventLifecycleStage stage{EventLifecycleStage::None};
        bool active{false};
        bool confirmed{false};
        std::int64_t first_seen_ns{0};
        std::int64_t last_seen_ns{0};
        std::int64_t last_emitted_ns{0};
        std::int64_t cooldown_until_ns{0};
        std::int64_t ended_at_ns{0};
        std::uint64_t emitted_count{0};
        std::uint64_t suppressed_count{0};
        std::string last_event_id;
        std::string last_event_status;
    };

    static std::string BuildStateKey(const EventLifecycleKey& key);
    static bool ShouldThrottleUpdate(const EventLifecycleState& state,
                                     const EventLifecycleOptions& options,
                                     std::int64_t timestamp_ns);
    bool ShouldRunCleanup(std::int64_t timestamp_ns, const EventLifecycleOptions& options) const;
    void MaybeCleanup(std::int64_t timestamp_ns, const EventLifecycleOptions& options);
    std::size_t Cleanup(std::int64_t timestamp_ns, const EventLifecycleOptions& options);

    std::unordered_map<std::string, EventLifecycleState> states_;
    std::unordered_map<std::string, EventManagerChannelMetrics> channel_metrics_;
    std::uint64_t emitted_count_{0};
    std::uint64_t suppressed_count_{0};
    std::int64_t last_cleanup_time_ns_{0};
    std::size_t cleanup_runs_{0};
    std::size_t states_removed_by_cleanup_{0};
};

}  // namespace analysis

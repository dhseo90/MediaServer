// 파일 요약: EventManager의 내부 lifecycle 상태 전이와 cooldown/중복 억제를 구현한다.
// 동작 요약: 동일 stream/scenario/zone/track key를 기준으로 start/update/confirmed/end emit 여부를 결정한다.
// 동작 요약: 기존 AnalysisEvent 구조를 그대로 반환해 외부 API 형식을 유지한다.
#include "analysis/event_manager.h"

#include <algorithm>
#include <sstream>

namespace analysis {

namespace {

std::int64_t MsToNs(std::int64_t value_ms) {
    return std::max<std::int64_t>(0, value_ms) * 1000000LL;
}

std::int64_t TimestampMs(std::int64_t timestamp_ns) {
    return timestamp_ns / 1000000LL;
}

std::int64_t ResolveTimestampNs(std::int64_t timestamp_ns) {
    return std::max<std::int64_t>(0, timestamp_ns);
}

bool StageShouldEmit(EventLifecycleStage stage, const EventLifecycleOptions& options) {
    switch (stage) {
        case EventLifecycleStage::Start:
            return options.emit_start;
        case EventLifecycleStage::Update:
            return options.emit_update;
        case EventLifecycleStage::Confirmed:
            return options.emit_confirmed;
        case EventLifecycleStage::End:
            return options.emit_end;
        case EventLifecycleStage::Cooldown:
        case EventLifecycleStage::None:
            return false;
    }
    return false;
}

std::string ChannelMetricKey(const EventLifecycleKey& key) {
    if (!key.channel_id.empty()) {
        return key.channel_id;
    }
    return key.stream_id;
}

}  // namespace

const char* ToString(EventLifecycleStage stage) {
    switch (stage) {
        case EventLifecycleStage::None:
            return "none";
        case EventLifecycleStage::Start:
            return "start";
        case EventLifecycleStage::Update:
            return "update";
        case EventLifecycleStage::Confirmed:
            return "confirmed";
        case EventLifecycleStage::Cooldown:
            return "cooldown";
        case EventLifecycleStage::End:
            return "end";
    }
    return "unknown";
}

EventLifecycleDecision EventManager::Update(const EventCandidate& candidate,
                                            const EventLifecycleOptions& options) {
    EventLifecycleDecision decision;
    decision.event = candidate.event;

    const std::int64_t timestamp_ns = ResolveTimestampNs(candidate.timestamp_ns);
    MaybeCleanup(timestamp_ns, options);

    const std::string key = BuildStateKey(candidate.key);
    EventLifecycleState& state = states_[key];
    state.key = candidate.key;
    auto record_decision = [this, &candidate, &state](const EventLifecycleDecision& item) {
        EventManagerChannelMetrics& channel = channel_metrics_[ChannelMetricKey(candidate.key)];
        channel.stream_id = candidate.key.stream_id;
        channel.channel_id = candidate.key.channel_id.empty() ? candidate.key.stream_id : candidate.key.channel_id;
        if (item.emit) {
            ++emitted_count_;
            ++channel.emitted_count;
            ++state.emitted_count;
            state.last_event_id = item.event.event_id;
            state.last_event_status = ToString(item.stage);
        }
        if (item.suppressed) {
            ++suppressed_count_;
            ++channel.suppressed_count;
            ++state.suppressed_count;
            state.last_event_status = ToString(item.stage);
        }
    };
    auto apply_metadata = [&candidate, &state](EventLifecycleDecision* item) {
        if (item == nullptr) {
            return;
        }
        AnalysisEvent& event = item->event;
        event.status = ToString(item->stage);
        event.start_time_ms = TimestampMs(state.first_seen_ns);
        event.update_time_ms = TimestampMs(state.last_seen_ns);
        if (item->stage == EventLifecycleStage::End) {
            event.end_time_ms = TimestampMs(state.ended_at_ns);
        }
        if (event.zone_id.empty() && event.line_id.empty() && event.event_type != "line-crossing") {
            event.zone_id = candidate.key.zone_id;
        }
        if (event.line_id.empty() && event.event_type == "line-crossing") {
            event.line_id = candidate.key.zone_id;
        }
        if (event.scenario_name.empty() &&
            event.event_type != "presence" &&
            event.event_type != "enter" &&
            event.event_type != "exit" &&
            event.event_type != "line-crossing") {
            event.scenario_name = candidate.key.scenario_id;
        }
        if (event.scenario_phase.empty() && !event.scenario_name.empty()) {
            event.scenario_phase = event.status;
        }
    };

    if (!candidate.active) {
        if (state.active) {
            state.active = false;
            state.stage = EventLifecycleStage::End;
            state.last_seen_ns = timestamp_ns;
            state.ended_at_ns = timestamp_ns;
            state.cooldown_until_ns = timestamp_ns + MsToNs(options.cooldown_ms);
            decision.stage = EventLifecycleStage::End;
            decision.emit = StageShouldEmit(decision.stage, options);
            if (decision.emit) {
                state.last_emitted_ns = timestamp_ns;
            }
            apply_metadata(&decision);
            record_decision(decision);
            return decision;
        }
        decision.stage = state.cooldown_until_ns > timestamp_ns ? EventLifecycleStage::Cooldown
                                                                : EventLifecycleStage::None;
        decision.suppressed = decision.stage == EventLifecycleStage::Cooldown;
        record_decision(decision);
        return decision;
    }

    if (!state.active && state.cooldown_until_ns > timestamp_ns) {
        state.last_seen_ns = timestamp_ns;
        decision.stage = EventLifecycleStage::Cooldown;
        decision.suppressed = true;
        record_decision(decision);
        return decision;
    }

    if (!state.active) {
        state.active = true;
        state.confirmed = candidate.confirmed;
        state.first_seen_ns = timestamp_ns;
        state.last_seen_ns = timestamp_ns;
        state.ended_at_ns = 0;
        state.stage = candidate.confirmed ? EventLifecycleStage::Confirmed : EventLifecycleStage::Start;
        decision.stage = state.stage;
    } else {
        state.last_seen_ns = timestamp_ns;
        if (candidate.confirmed && !state.confirmed) {
            state.confirmed = true;
            state.stage = EventLifecycleStage::Confirmed;
        } else {
            state.stage = EventLifecycleStage::Update;
        }
        decision.stage = state.stage;
    }

    decision.emit = StageShouldEmit(decision.stage, options);
    if (decision.emit && decision.stage == EventLifecycleStage::Update &&
        ShouldThrottleUpdate(state, options, timestamp_ns)) {
        decision.emit = false;
        decision.suppressed = true;
    }
    if (decision.emit) {
        state.last_emitted_ns = timestamp_ns;
    }
    apply_metadata(&decision);
    record_decision(decision);
    return decision;
}

void EventManager::Reset() {
    states_.clear();
    channel_metrics_.clear();
    emitted_count_ = 0;
    suppressed_count_ = 0;
    last_cleanup_time_ns_ = 0;
    cleanup_runs_ = 0;
    states_removed_by_cleanup_ = 0;
}

std::size_t EventManager::ActiveStateCount() const {
    return states_.size();
}

EventManagerMetrics EventManager::Metrics() const {
    EventManagerMetrics metrics;
    metrics.total_states = states_.size();
    metrics.emitted_count = emitted_count_;
    metrics.suppressed_count = suppressed_count_;
    metrics.cleanup_runs = cleanup_runs_;
    metrics.states_removed_by_cleanup = states_removed_by_cleanup_;
    metrics.last_cleanup_time_ns = last_cleanup_time_ns_;
    metrics.last_cleanup_time_ms = TimestampMs(last_cleanup_time_ns_);
    for (const auto& [key, state] : states_) {
        (void)key;
        if (state.active) {
            ++metrics.active_states;
        } else if (state.cooldown_until_ns > 0) {
            ++metrics.cooldown_states;
        } else if (state.ended_at_ns > 0) {
            ++metrics.ended_states;
        }
    }
    return metrics;
}

std::vector<EventManagerChannelMetrics> EventManager::ChannelMetrics() const {
    std::vector<EventManagerChannelMetrics> metrics;
    metrics.reserve(channel_metrics_.size());
    for (const auto& [_, channel] : channel_metrics_) {
        metrics.push_back(channel);
    }
    for (const auto& [_, state] : states_) {
        const EventLifecycleKey& key = state.key;
        EventManagerChannelMetrics* channel = nullptr;
        const std::string metric_key = ChannelMetricKey(key);
        for (auto& item : metrics) {
            if ((item.channel_id.empty() ? item.stream_id : item.channel_id) == metric_key) {
                channel = &item;
                break;
            }
        }
        if (channel == nullptr) {
            metrics.push_back(EventManagerChannelMetrics{});
            channel = &metrics.back();
            channel->stream_id = key.stream_id;
            channel->channel_id = key.channel_id.empty() ? key.stream_id : key.channel_id;
        }
        ++channel->total_states;
        if (state.active) {
            ++channel->active_states;
        }
    }
    std::sort(metrics.begin(), metrics.end(), [](const auto& lhs, const auto& rhs) {
        return lhs.channel_id < rhs.channel_id;
    });
    return metrics;
}

std::vector<EventLifecycleStateSnapshot> EventManager::Snapshot() const {
    std::vector<EventLifecycleStateSnapshot> snapshot;
    snapshot.reserve(states_.size());
    for (const auto& [key, state] : states_) {
        EventLifecycleStateSnapshot item;
        item.key = key;
        item.stream_id = state.key.stream_id;
        item.channel_id = state.key.channel_id;
        item.scenario_id = state.key.scenario_id;
        item.zone_id = state.key.zone_id;
        item.track_id = state.key.track_id;
        item.object_key = state.key.object_key;
        item.stage = state.stage;
        item.active = state.active;
        item.confirmed = state.confirmed;
        item.first_seen_ms = TimestampMs(state.first_seen_ns);
        item.last_seen_ms = TimestampMs(state.last_seen_ns);
        item.last_emitted_ms = TimestampMs(state.last_emitted_ns);
        item.cooldown_until_ms = TimestampMs(state.cooldown_until_ns);
        item.ended_at_ms = TimestampMs(state.ended_at_ns);
        item.emitted_count = state.emitted_count;
        item.suppressed_count = state.suppressed_count;
        item.last_event_id = state.last_event_id;
        item.last_event_status = state.last_event_status.empty()
                                     ? ToString(state.stage)
                                     : state.last_event_status;
        snapshot.push_back(std::move(item));
    }
    return snapshot;
}

std::string EventManager::BuildStateKey(const EventLifecycleKey& key) {
    std::ostringstream out;
    out << key.stream_id << "|" << key.channel_id << "|" << key.scenario_id << "|"
        << key.zone_id << "|";
    if (key.track_id > 0) {
        out << "track:" << key.track_id;
    } else {
        out << "object:" << key.object_key;
    }
    return out.str();
}

bool EventManager::ShouldThrottleUpdate(const EventLifecycleState& state,
                                        const EventLifecycleOptions& options,
                                        std::int64_t timestamp_ns) {
    const std::int64_t interval_ns = MsToNs(options.update_interval_ms);
    if (interval_ns <= 0 || state.last_emitted_ns <= 0) {
        return false;
    }
    return timestamp_ns < state.last_emitted_ns + interval_ns;
}

bool EventManager::ShouldRunCleanup(std::int64_t timestamp_ns,
                                    const EventLifecycleOptions& options) const {
    const std::int64_t interval_ns = MsToNs(options.cleanup_interval_ms);
    if (interval_ns <= 0) {
        return true;
    }
    if (last_cleanup_time_ns_ <= 0) {
        return true;
    }
    return timestamp_ns >= last_cleanup_time_ns_ + interval_ns;
}

void EventManager::MaybeCleanup(std::int64_t timestamp_ns, const EventLifecycleOptions& options) {
    if (!ShouldRunCleanup(timestamp_ns, options)) {
        return;
    }
    states_removed_by_cleanup_ += Cleanup(timestamp_ns, options);
    ++cleanup_runs_;
    last_cleanup_time_ns_ = timestamp_ns;
}

std::size_t EventManager::Cleanup(std::int64_t timestamp_ns, const EventLifecycleOptions& options) {
    const std::int64_t retention_ns = MsToNs(options.ended_retention_ms);
    std::size_t removed = 0;
    for (auto it = states_.begin(); it != states_.end();) {
        const auto& state = it->second;
        const bool ended_expired =
            !state.active && state.ended_at_ns > 0 &&
            timestamp_ns >= state.ended_at_ns + retention_ns;
        const bool cooldown_expired =
            !state.active && state.cooldown_until_ns > 0 &&
            timestamp_ns >= state.cooldown_until_ns + retention_ns;
        if (ended_expired || cooldown_expired) {
            it = states_.erase(it);
            ++removed;
        } else {
            ++it;
        }
    }
    return removed;
}

}  // namespace analysis

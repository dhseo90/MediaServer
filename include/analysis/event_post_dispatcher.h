// 파일 요약: 분석 이벤트 비동기 POST dispatcher를 선언한다.
// 동작 요약: bounded queue, worker lifecycle, status snapshot, enqueue API를 제공한다.
// 동작 요약: event rule engine 결과를 외부 HTTP endpoint로 opt-in 전송한다.
#pragma once

#include <cstddef>
#include <cstdint>
#include <vector>

#include "analysis/event_rule_engine.h"

namespace analysis {

struct EventPostDispatcherSnapshot {
    bool enabled{false};
    std::size_t queue_size{0};
    std::size_t max_queue_size{0};
    std::uint64_t enqueued_count{0};
    std::uint64_t sent_count{0};
    std::uint64_t failed_count{0};
    std::uint64_t dropped_count{0};
    std::uint64_t suppressed_count{0};
    std::string last_error;
};

void DispatchEventPosts(const AnalysisResult& result, const std::vector<AnalysisEvent>& events);
EventPostDispatcherSnapshot GetEventPostDispatcherSnapshot();
void StopEventPostDispatcher();

}  // namespace analysis

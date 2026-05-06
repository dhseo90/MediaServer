// 파일 요약: VA metadata 구독자가 요청할 수 있는 payload 필터 계약을 선언한다.
// 동작 요약: side-channel/DataChannel JSON 생성 전에 track/event 범위를 좁히는 순수 helper다.
#pragma once

#include <cstdint>
#include <optional>
#include <string>
#include <vector>

#include "analysis/event_rule_engine.h"

namespace analysis {

struct VaMetadataSubscriptionFilter {
    std::vector<std::string> event_types;
    std::vector<std::string> rule_ids;
    std::vector<std::string> scenario_names;
    std::vector<std::string> zone_ids;
    std::vector<std::string> line_ids;
    std::vector<std::string> statuses;
    std::vector<std::string> labels;
    std::optional<std::uint64_t> track_id;
    std::optional<int> class_id;
};

bool HasVaMetadataEventFilter(const VaMetadataSubscriptionFilter& filter);
bool HasVaMetadataTrackFilter(const VaMetadataSubscriptionFilter& filter);
bool HasVaMetadataSubscriptionFilter(const VaMetadataSubscriptionFilter& filter);

bool VaMetadataEventMatchesSubscription(const AnalysisEvent& event,
                                        const VaMetadataSubscriptionFilter& filter);
std::vector<AnalysisEvent> FilterVaMetadataEvents(
    const std::vector<AnalysisEvent>& events,
    const VaMetadataSubscriptionFilter& filter);
AnalysisResult FilterVaMetadataResult(const AnalysisResult& result,
                                      const VaMetadataSubscriptionFilter& filter);

}  // namespace analysis

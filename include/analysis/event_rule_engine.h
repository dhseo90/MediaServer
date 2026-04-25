// 파일 용도: 저장된 분석 룰 JSON을 detection 결과에 적용해 이벤트 발생 객체를 판정한다.
#pragma once

#include <memory>

#include "analysis/analysis_types.h"

namespace analysis {

struct AnalysisEvent {
    std::string rule_id;
    std::string event_type;
    std::uint64_t track_id{0};
    int class_id{-1};
    std::string label;
    float score{0.0F};
    RectF box;
    std::string highlight_color{"#ffcc00"};
    int highlight_duration_ms{1200};
    bool highlight_enabled{true};
    bool post_enabled{false};
    std::string post_url;
};

struct EventRuleEvaluation {
    AnalysisResult annotated_result;
    std::vector<AnalysisEvent> events;
    std::size_t active_rule_count{0};
    std::size_t matched_detection_count{0};
};

struct EventRuleRuntime;

std::shared_ptr<EventRuleRuntime> CreateEventRuleRuntime();

EventRuleEvaluation ApplyEventRulesToResult(const AnalysisResult& result,
                                            const std::vector<std::string>& rule_documents,
                                            const std::shared_ptr<EventRuleRuntime>& runtime);

}  // namespace analysis

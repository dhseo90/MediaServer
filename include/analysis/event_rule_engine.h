// 파일 요약: 저장된 분석 rule을 detection 결과에 적용하는 event engine API를 선언한다.
// 동작 요약: event metadata, runtime state, POST dispatch에 필요한 Event 구조를 제공한다.
// 동작 요약: presence/enter/exit/line-crossing 판정을 AnalysisResult에 반영한다.
#pragma once

#include <memory>

#include "analysis/analysis_types.h"

namespace analysis {

struct AnalysisEvent {
    std::string event_id;
    std::string rule_id;
    std::string event_type;
    std::uint64_t track_id{0};
    int class_id{-1};
    std::string label;
    float score{0.0F};
    RectF box;
    std::string highlight_color{"#ff0000"};
    int highlight_duration_ms{1200};
    bool highlight_enabled{true};
    bool post_enabled{false};
    std::string post_url;
    std::string status;
    std::int64_t start_time_ms{0};
    std::int64_t update_time_ms{0};
    std::int64_t end_time_ms{0};
    std::string zone_id;
    std::string line_id;
    std::string scenario_name;
    std::string scenario_phase;
    std::string metadata_json;
};

struct EventRuleEvaluation {
    AnalysisResult annotated_result;
    std::vector<AnalysisEvent> events;
    std::size_t active_rule_count{0};
    std::size_t matched_detection_count{0};
    std::optional<AnalysisMetricsReport> metrics_report;
    std::string tracking_issue_report_json;
};

struct EventRuleRuntime;

std::shared_ptr<EventRuleRuntime> CreateEventRuleRuntime();

EventRuleEvaluation ApplyEventRulesToResult(const AnalysisResult& result,
                                            const std::vector<std::string>& rule_documents,
                                            const std::shared_ptr<EventRuleRuntime>& runtime);

}  // namespace analysis

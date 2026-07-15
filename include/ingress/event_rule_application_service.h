#pragma once

#include "ingress/analysis_session_read_application_service.h"

#include <cstddef>
#include <memory>
#include <string>
#include <vector>

namespace analysis {
struct AnalysisEvent;
struct AnalysisMetricsReport;
struct AnalysisResult;
}  // namespace analysis

namespace ingress {

struct EventRuleApplicationEvent {
    std::string event_id;
    std::string rule_id;
    std::string event_type;
    std::uint64_t track_id{0};
    int class_id{-1};
    std::string label;
    float score{0.0F};
    AnalysisSessionApplicationBox box;
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

class EventRuleApplicationEvaluation;

class EventRuleApplicationRuntime {
public:
    ~EventRuleApplicationRuntime();

    EventRuleApplicationRuntime(const EventRuleApplicationRuntime&) = delete;
    EventRuleApplicationRuntime& operator=(const EventRuleApplicationRuntime&) = delete;
    EventRuleApplicationRuntime(EventRuleApplicationRuntime&&) = delete;
    EventRuleApplicationRuntime& operator=(EventRuleApplicationRuntime&&) = delete;

private:
    struct Impl;

    explicit EventRuleApplicationRuntime(std::unique_ptr<Impl> impl);

    std::unique_ptr<Impl> impl_;

    friend std::shared_ptr<EventRuleApplicationRuntime> CreateEphemeralEventRuleApplicationRuntime();
    friend std::shared_ptr<EventRuleApplicationRuntime> AcquireEventRuleApplicationRuntime(
        const std::string& key);
    friend EventRuleApplicationEvaluation EvaluateEventRulesForApplication(
        const analysis::AnalysisResult& result,
        const std::shared_ptr<EventRuleApplicationRuntime>& runtime);
    friend EventRuleApplicationEvaluation EvaluateEventRulesForApplication(
        const AnalysisSessionApplicationResult& result,
        const std::shared_ptr<EventRuleApplicationRuntime>& runtime);
    friend class EventRuleApplicationEvaluation;
};

class EventRuleApplicationEvaluation {
public:
    ~EventRuleApplicationEvaluation();

    EventRuleApplicationEvaluation(EventRuleApplicationEvaluation&&) noexcept;
    EventRuleApplicationEvaluation& operator=(EventRuleApplicationEvaluation&&) noexcept;
    EventRuleApplicationEvaluation(const EventRuleApplicationEvaluation&) = delete;
    EventRuleApplicationEvaluation& operator=(const EventRuleApplicationEvaluation&) = delete;

    const analysis::AnalysisResult& AnnotatedResult() const;
    const std::vector<analysis::AnalysisEvent>& Events() const;
    std::size_t ActiveRuleCount() const;
    std::size_t MatchedDetectionCount() const;
    const analysis::AnalysisMetricsReport* MetricsReport() const;
    const AnalysisSessionApplicationResult& ApplicationAnnotatedResult() const;
    const std::vector<EventRuleApplicationEvent>& ApplicationEvents() const;
    const AnalysisSessionApplicationMetrics* ApplicationMetricsReport() const;
    const std::string& TrackingIssueReportJson() const;

private:
    struct Impl;

    explicit EventRuleApplicationEvaluation(std::unique_ptr<Impl> impl);

    std::unique_ptr<Impl> impl_;

    friend EventRuleApplicationEvaluation EvaluateEventRulesForApplication(
        const analysis::AnalysisResult& result,
        const std::shared_ptr<EventRuleApplicationRuntime>& runtime);
    friend EventRuleApplicationEvaluation EvaluateEventRulesForApplication(
        const AnalysisSessionApplicationResult& result,
        const std::shared_ptr<EventRuleApplicationRuntime>& runtime);
};

std::shared_ptr<EventRuleApplicationRuntime> CreateEphemeralEventRuleApplicationRuntime();
std::shared_ptr<EventRuleApplicationRuntime> AcquireEventRuleApplicationRuntime(const std::string& key);
void ReleaseEventRuleApplicationRuntime(const std::string& key);

EventRuleApplicationEvaluation EvaluateEventRulesForApplication(
    const analysis::AnalysisResult& result,
    const std::shared_ptr<EventRuleApplicationRuntime>& runtime);

EventRuleApplicationEvaluation EvaluateEventRulesForApplication(
    const AnalysisSessionApplicationResult& result,
    const std::shared_ptr<EventRuleApplicationRuntime>& runtime);

analysis::AnalysisResult RestoreCanonicalResultForApplicationOutput(
    const AnalysisSessionApplicationResult& result);

}  // namespace ingress

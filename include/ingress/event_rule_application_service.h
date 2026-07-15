#pragma once

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
    const std::string& TrackingIssueReportJson() const;

private:
    struct Impl;

    explicit EventRuleApplicationEvaluation(std::unique_ptr<Impl> impl);

    std::unique_ptr<Impl> impl_;

    friend EventRuleApplicationEvaluation EvaluateEventRulesForApplication(
        const analysis::AnalysisResult& result,
        const std::shared_ptr<EventRuleApplicationRuntime>& runtime);
};

std::shared_ptr<EventRuleApplicationRuntime> CreateEphemeralEventRuleApplicationRuntime();
std::shared_ptr<EventRuleApplicationRuntime> AcquireEventRuleApplicationRuntime(const std::string& key);
void ReleaseEventRuleApplicationRuntime(const std::string& key);

EventRuleApplicationEvaluation EvaluateEventRulesForApplication(
    const analysis::AnalysisResult& result,
    const std::shared_ptr<EventRuleApplicationRuntime>& runtime);

}  // namespace ingress

#include "ingress/event_rule_application_service.h"

#include "analysis/event_rule_engine.h"
#include "ingress/analysis_rule_application_service.h"

#include <mutex>
#include <unordered_map>
#include <utility>

namespace ingress {

struct EventRuleApplicationRuntime::Impl {
    std::shared_ptr<analysis::EventRuleRuntime> runtime;
};

struct EventRuleApplicationEvaluation::Impl {
    explicit Impl(analysis::EventRuleEvaluation value) : evaluation(std::move(value)) {}

    analysis::EventRuleEvaluation evaluation;
};

namespace {

std::mutex& EventRuleApplicationRuntimeMapMutex() {
    static std::mutex mutex;
    return mutex;
}

std::unordered_map<std::string, std::shared_ptr<EventRuleApplicationRuntime>>&
EventRuleApplicationRuntimeMap() {
    static std::unordered_map<std::string, std::shared_ptr<EventRuleApplicationRuntime>> runtimes;
    return runtimes;
}

}  // namespace

EventRuleApplicationRuntime::EventRuleApplicationRuntime(std::unique_ptr<Impl> impl)
    : impl_(std::move(impl)) {}

EventRuleApplicationRuntime::~EventRuleApplicationRuntime() = default;

EventRuleApplicationEvaluation::EventRuleApplicationEvaluation(std::unique_ptr<Impl> impl)
    : impl_(std::move(impl)) {}

EventRuleApplicationEvaluation::~EventRuleApplicationEvaluation() = default;
EventRuleApplicationEvaluation::EventRuleApplicationEvaluation(EventRuleApplicationEvaluation&&) noexcept = default;
EventRuleApplicationEvaluation& EventRuleApplicationEvaluation::operator=(
    EventRuleApplicationEvaluation&&) noexcept = default;

const analysis::AnalysisResult& EventRuleApplicationEvaluation::AnnotatedResult() const {
    return impl_->evaluation.annotated_result;
}

const std::vector<analysis::AnalysisEvent>& EventRuleApplicationEvaluation::Events() const {
    return impl_->evaluation.events;
}

std::size_t EventRuleApplicationEvaluation::ActiveRuleCount() const {
    return impl_->evaluation.active_rule_count;
}

std::size_t EventRuleApplicationEvaluation::MatchedDetectionCount() const {
    return impl_->evaluation.matched_detection_count;
}

const analysis::AnalysisMetricsReport* EventRuleApplicationEvaluation::MetricsReport() const {
    return impl_->evaluation.metrics_report.has_value() ? &*impl_->evaluation.metrics_report : nullptr;
}

const std::string& EventRuleApplicationEvaluation::TrackingIssueReportJson() const {
    return impl_->evaluation.tracking_issue_report_json;
}

std::shared_ptr<EventRuleApplicationRuntime> CreateEphemeralEventRuleApplicationRuntime() {
    auto impl = std::make_unique<EventRuleApplicationRuntime::Impl>();
    impl->runtime = analysis::CreateEventRuleRuntime();
    return std::shared_ptr<EventRuleApplicationRuntime>(
        new EventRuleApplicationRuntime(std::move(impl)));
}

std::shared_ptr<EventRuleApplicationRuntime> AcquireEventRuleApplicationRuntime(const std::string& key) {
    std::lock_guard lock(EventRuleApplicationRuntimeMapMutex());
    auto& runtimes = EventRuleApplicationRuntimeMap();
    const auto it = runtimes.find(key);
    if (it != runtimes.end() && it->second != nullptr) {
        return it->second;
    }
    auto created = CreateEphemeralEventRuleApplicationRuntime();
    runtimes[key] = created;
    return created;
}

void ReleaseEventRuleApplicationRuntime(const std::string& key) {
    std::lock_guard lock(EventRuleApplicationRuntimeMapMutex());
    EventRuleApplicationRuntimeMap().erase(key);
}

EventRuleApplicationEvaluation EvaluateEventRulesForApplication(
    const analysis::AnalysisResult& result,
    const std::shared_ptr<EventRuleApplicationRuntime>& runtime) {
    const auto canonical_runtime = runtime != nullptr ? runtime->impl_->runtime : nullptr;
    return EventRuleApplicationEvaluation(std::make_unique<EventRuleApplicationEvaluation::Impl>(
        analysis::ApplyEventRulesToResult(
            result, ApplicationAnalysisRuleDocumentsSnapshot(), canonical_runtime)));
}

}  // namespace ingress

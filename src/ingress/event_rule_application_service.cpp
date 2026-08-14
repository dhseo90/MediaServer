#include "ingress/event_rule_application_service.h"
// 파일 용도: Event Rule runtime/evaluation application service를 구현한다.
#include "analysis/event_rule_engine.h"
#include "ingress/analysis_rule_application_service.h"

#include "analysis_session_application_mapping.h"

#include <mutex>
#include <unordered_map>
#include <utility>

namespace ingress {

namespace {

EventRuleApplicationEvent FromCanonical(const analysis::AnalysisEvent& input) {
    EventRuleApplicationEvent output;
    output.event_id = input.event_id;
    output.rule_id = input.rule_id;
    output.event_type = input.event_type;
    output.track_id = input.track_id;
    output.class_id = input.class_id;
    output.label = input.label;
    output.score = input.score;
    output.box = {input.box.x, input.box.y, input.box.width, input.box.height};
    output.highlight_color = input.highlight_color;
    output.highlight_duration_ms = input.highlight_duration_ms;
    output.highlight_enabled = input.highlight_enabled;
    output.post_enabled = input.post_enabled;
    output.post_url = input.post_url;
    output.status = input.status;
    output.start_time_ms = input.start_time_ms;
    output.update_time_ms = input.update_time_ms;
    output.end_time_ms = input.end_time_ms;
    output.zone_id = input.zone_id;
    output.line_id = input.line_id;
    output.scenario_name = input.scenario_name;
    output.scenario_phase = input.scenario_phase;
    output.metadata_json = input.metadata_json;
    return output;
}

}  // namespace

struct EventRuleApplicationRuntime::Impl {
    std::shared_ptr<analysis::EventRuleRuntime> runtime;
};

struct EventRuleApplicationEvaluation::Impl {
    explicit Impl(analysis::EventRuleEvaluation value) : evaluation(std::move(value)) {}

    void EnsureApplicationProjection() const {
        if (application_annotated_result.has_value()) return;
        application_annotated_result =
            analysis_session_application_mapping::FromCanonicalResult(evaluation.annotated_result);
        application_events.reserve(evaluation.events.size());
        for (const auto& event : evaluation.events) {
            application_events.push_back(FromCanonical(event));
        }
    }

    analysis::EventRuleEvaluation evaluation;
    mutable std::optional<AnalysisSessionApplicationResult> application_annotated_result;
    mutable std::vector<EventRuleApplicationEvent> application_events;
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

const AnalysisSessionApplicationResult&
EventRuleApplicationEvaluation::ApplicationAnnotatedResult() const {
    impl_->EnsureApplicationProjection();
    return *impl_->application_annotated_result;
}

const std::vector<EventRuleApplicationEvent>&
EventRuleApplicationEvaluation::ApplicationEvents() const {
    impl_->EnsureApplicationProjection();
    return impl_->application_events;
}

const AnalysisSessionApplicationMetrics*
EventRuleApplicationEvaluation::ApplicationMetricsReport() const {
    impl_->EnsureApplicationProjection();
    return impl_->application_annotated_result->metrics_report.has_value()
               ? &*impl_->application_annotated_result->metrics_report
               : nullptr;
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

EventRuleApplicationEvaluation EvaluateEventRulesForApplication(
    const AnalysisSessionApplicationResult& result,
    const std::shared_ptr<EventRuleApplicationRuntime>& runtime) {
    return EvaluateEventRulesForApplication(
        analysis_session_application_mapping::ToCanonicalResult(result), runtime);
}

analysis::AnalysisResult RestoreCanonicalResultForApplicationOutput(
    const AnalysisSessionApplicationResult& result) {
    return analysis_session_application_mapping::ToCanonicalResult(result);
}

}  // namespace ingress

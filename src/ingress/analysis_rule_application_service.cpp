// 파일 요약: transport callback과 domain-owned canonical registry API 사이의 application adapter를 소유한다.
// 동작 요약: callback bundle을 원자적으로 설정하고 domain port 및 transport wrapper에 같은 backend를 제공한다.
#include "ingress/analysis_rule_application_service.h"

#include <mutex>
#include <stdexcept>

#include "ingress/analysis_rule_registry.h"

namespace ingress {
namespace {

std::mutex& CallbackMutex() {
    static std::mutex mutex;
    return mutex;
}

AnalysisRuleApplicationCallbacks& Callbacks() {
    static AnalysisRuleApplicationCallbacks callbacks;
    return callbacks;
}

bool CallbacksAreComplete(const AnalysisRuleApplicationCallbacks& callbacks) {
    return callbacks.profile_documents_snapshot != nullptr &&
           callbacks.rule_documents_snapshot != nullptr &&
           callbacks.video_analysis_rule_documents_snapshot != nullptr &&
           callbacks.apply_video_analysis_rule_to_query != nullptr;
}

bool CallbacksAreEqual(const AnalysisRuleApplicationCallbacks& lhs,
                       const AnalysisRuleApplicationCallbacks& rhs) {
    return lhs.profile_documents_snapshot == rhs.profile_documents_snapshot &&
           lhs.rule_documents_snapshot == rhs.rule_documents_snapshot &&
           lhs.video_analysis_rule_documents_snapshot == rhs.video_analysis_rule_documents_snapshot &&
           lhs.apply_video_analysis_rule_to_query == rhs.apply_video_analysis_rule_to_query;
}

AnalysisRuleApplicationCallbacks CallbackSnapshot() {
    std::lock_guard lock(CallbackMutex());
    return Callbacks();
}

std::vector<std::string> ProfileDocumentsAdapter() {
    const auto callbacks = CallbackSnapshot();
    if (callbacks.profile_documents_snapshot == nullptr) {
        throw std::logic_error("analysis rule application service is not configured");
    }
    return callbacks.profile_documents_snapshot();
}

std::vector<std::string> RuleDocumentsAdapter() {
    const auto callbacks = CallbackSnapshot();
    if (callbacks.rule_documents_snapshot == nullptr) {
        throw std::logic_error("analysis rule application service is not configured");
    }
    return callbacks.rule_documents_snapshot();
}

std::vector<std::string> VideoAnalysisRuleDocumentsAdapter() {
    const auto callbacks = CallbackSnapshot();
    if (callbacks.video_analysis_rule_documents_snapshot == nullptr) {
        throw std::logic_error("analysis rule application service is not configured");
    }
    return callbacks.video_analysis_rule_documents_snapshot();
}

bool ApplyVideoAnalysisRuleAdapter(media::IngressRequest* request,
                                   std::string* error_message) {
    const auto callbacks = CallbackSnapshot();
    if (callbacks.apply_video_analysis_rule_to_query == nullptr) {
        if (error_message != nullptr) {
            *error_message = "analysis rule application service is not configured";
        }
        return false;
    }
    if (request == nullptr) {
        if (error_message != nullptr) {
            *error_message = "request is missing";
        }
        return false;
    }
    return callbacks.apply_video_analysis_rule_to_query(&request->query, error_message);
}

}  // namespace

bool ConfigureAnalysisRuleApplicationService(
    const AnalysisRuleApplicationCallbacks& callbacks,
    std::string* error_message) {
    if (!CallbacksAreComplete(callbacks)) {
        if (error_message != nullptr) {
            *error_message = "analysis rule application callbacks are incomplete";
        }
        return false;
    }
    const AnalysisRuleRegistryPort port{
        &ProfileDocumentsAdapter,
        &RuleDocumentsAdapter,
        &VideoAnalysisRuleDocumentsAdapter,
        &ApplyVideoAnalysisRuleAdapter,
    };
    std::lock_guard lock(CallbackMutex());
    auto& current = Callbacks();
    if (CallbacksAreComplete(current)) {
        if (!CallbacksAreEqual(current, callbacks)) {
            if (error_message != nullptr) {
                *error_message = "analysis rule application callbacks are already configured";
            }
            return false;
        }
        return true;
    }
    // Keep the callback mutex held across the registry bind and callback commit. Once the
    // adapter port becomes observable, concurrent adapter calls block until the callbacks
    // are published; a failed bind leaves the application state untouched.
    if (!BindAnalysisRuleRegistryPort(port, error_message)) {
        return false;
    }
    current = callbacks;
    return true;
}

std::vector<std::string> ApplicationAnalysisProfileDocumentsSnapshot() {
    return ProfileDocumentsAdapter();
}

std::vector<std::string> ApplicationAnalysisRuleDocumentsSnapshot() {
    return RuleDocumentsAdapter();
}

std::vector<std::string> ApplicationVideoAnalysisRuleDocumentsSnapshot() {
    return VideoAnalysisRuleDocumentsAdapter();
}

bool ApplyApplicationVideoAnalysisRuleToQuery(
    std::unordered_map<std::string, std::string>* query,
    std::string* error_message) {
    const auto callbacks = CallbackSnapshot();
    if (callbacks.apply_video_analysis_rule_to_query == nullptr) {
        if (error_message != nullptr) {
            *error_message = "analysis rule application service is not configured";
        }
        return false;
    }
    return callbacks.apply_video_analysis_rule_to_query(query, error_message);
}

}  // namespace ingress

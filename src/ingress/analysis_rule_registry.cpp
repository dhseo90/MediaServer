// 파일 요약: analysis service가 사용하는 rule registry domain port와 안정된 public API를 소유한다.
// 동작 요약: composition root가 결속한 backend 함수 포인터를 복사한 뒤 lock 밖에서 호출한다.
#include "ingress/analysis_rule_registry.h"

#include <mutex>
#include <stdexcept>

namespace ingress {
namespace {

std::mutex& RegistryPortMutex() {
    static std::mutex mutex;
    return mutex;
}

AnalysisRuleRegistryPort& RegistryPort() {
    static AnalysisRuleRegistryPort port;
    return port;
}

bool PortIsComplete(const AnalysisRuleRegistryPort& port) {
    return port.profile_documents_snapshot != nullptr &&
           port.rule_documents_snapshot != nullptr &&
           port.video_analysis_rule_documents_snapshot != nullptr &&
           port.apply_video_analysis_rule_to_request != nullptr;
}

bool PortsAreEqual(const AnalysisRuleRegistryPort& lhs,
                   const AnalysisRuleRegistryPort& rhs) {
    return lhs.profile_documents_snapshot == rhs.profile_documents_snapshot &&
           lhs.rule_documents_snapshot == rhs.rule_documents_snapshot &&
           lhs.video_analysis_rule_documents_snapshot == rhs.video_analysis_rule_documents_snapshot &&
           lhs.apply_video_analysis_rule_to_request == rhs.apply_video_analysis_rule_to_request;
}

AnalysisRuleRegistryPort RegistryPortSnapshot() {
    std::lock_guard lock(RegistryPortMutex());
    return RegistryPort();
}

}  // namespace

bool BindAnalysisRuleRegistryPort(const AnalysisRuleRegistryPort& port,
                                  std::string* error_message) {
    if (!PortIsComplete(port)) {
        if (error_message != nullptr) {
            *error_message = "analysis rule registry port is incomplete";
        }
        return false;
    }
    std::lock_guard lock(RegistryPortMutex());
    auto& current = RegistryPort();
    if (PortIsComplete(current) && !PortsAreEqual(current, port)) {
        if (error_message != nullptr) {
            *error_message = "analysis rule registry port is already bound";
        }
        return false;
    }
    current = port;
    return true;
}

std::vector<std::string> AnalysisProfileDocumentsSnapshot() {
    const auto port = RegistryPortSnapshot();
    if (port.profile_documents_snapshot == nullptr) {
        throw std::logic_error("analysis rule registry port is not bound");
    }
    return port.profile_documents_snapshot();
}

std::vector<std::string> AnalysisRuleDocumentsSnapshot() {
    const auto port = RegistryPortSnapshot();
    if (port.rule_documents_snapshot == nullptr) {
        throw std::logic_error("analysis rule registry port is not bound");
    }
    return port.rule_documents_snapshot();
}

std::vector<std::string> VideoAnalysisRuleDocumentsSnapshot() {
    const auto port = RegistryPortSnapshot();
    if (port.video_analysis_rule_documents_snapshot == nullptr) {
        throw std::logic_error("analysis rule registry port is not bound");
    }
    return port.video_analysis_rule_documents_snapshot();
}

bool ApplyVideoAnalysisRuleToRequest(media::IngressRequest* request,
                                     std::string* error_message) {
    const auto port = RegistryPortSnapshot();
    if (port.apply_video_analysis_rule_to_request == nullptr) {
        if (error_message != nullptr) {
            *error_message = "analysis rule registry port is not bound";
        }
        return false;
    }
    return port.apply_video_analysis_rule_to_request(request, error_message);
}

}  // namespace ingress

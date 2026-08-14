// 파일 요약: analysis rule registry backend를 application/domain 경계에 결속하는 dependency-free 계약이다.
// 동작 요약: composition root가 transport callback을 한 번 설정하고 transport는 application wrapper만 호출한다.
#pragma once

#include <string>
#include <unordered_map>
#include <vector>

namespace ingress {

struct AnalysisRuleApplicationCallbacks {
    std::vector<std::string> (*profile_documents_snapshot)(){nullptr};
    std::vector<std::string> (*rule_documents_snapshot)(){nullptr};
    std::vector<std::string> (*video_analysis_rule_documents_snapshot)(){nullptr};
    bool (*apply_video_analysis_rule_to_query)(
        std::unordered_map<std::string, std::string>*, std::string*){nullptr};
};

bool ConfigureAnalysisRuleApplicationService(
    const AnalysisRuleApplicationCallbacks& callbacks,
    std::string* error_message);

std::vector<std::string> ApplicationAnalysisProfileDocumentsSnapshot();
std::vector<std::string> ApplicationAnalysisRuleDocumentsSnapshot();
std::vector<std::string> ApplicationVideoAnalysisRuleDocumentsSnapshot();
bool ApplyApplicationVideoAnalysisRuleToQuery(
    std::unordered_map<std::string, std::string>* query,
    std::string* error_message);

}  // namespace ingress

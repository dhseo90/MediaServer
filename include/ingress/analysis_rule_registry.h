// 파일 요약: Lab에서 저장한 분석 profile/rule 문서 조회 API를 선언한다.
// 동작 요약: HTTP registry와 runtime analysis query/rule engine이 같은 JSON 문서를 공유한다.
// 동작 요약: built-in profile과 사용자 저장 문서를 분리해 제공한다.
#pragma once

#include <string>
#include <unordered_map>
#include <vector>

#include "media_types.h"

namespace ingress {

struct AnalysisRuleRegistryPort {
    std::vector<std::string> (*profile_documents_snapshot)(){nullptr};
    std::vector<std::string> (*rule_documents_snapshot)(){nullptr};
    std::vector<std::string> (*video_analysis_rule_documents_snapshot)(){nullptr};
    bool (*apply_video_analysis_rule_to_request)(media::IngressRequest*, std::string*){nullptr};
};

// Composition root가 transport-owned registry backend를 domain API에 한 번 결속한다.
bool BindAnalysisRuleRegistryPort(const AnalysisRuleRegistryPort& port,
                                  std::string* error_message);

std::vector<std::string> AnalysisProfileDocumentsSnapshot();
std::vector<std::string> AnalysisRuleDocumentsSnapshot();
std::vector<std::string> VideoAnalysisRuleDocumentsSnapshot();

bool ApplyVideoAnalysisRuleToRequest(media::IngressRequest* request, std::string* error_message);

}  // namespace ingress

// 파일 요약: Lab에서 저장한 분석 profile/rule 문서 조회 API를 선언한다.
// 동작 요약: HTTP registry와 runtime analysis query/rule engine이 같은 JSON 문서를 공유한다.
// 동작 요약: built-in profile과 사용자 저장 문서를 분리해 제공한다.
#pragma once

#include <string>
#include <vector>

namespace ingress {

std::vector<std::string> AnalysisProfileDocumentsSnapshot();
std::vector<std::string> AnalysisRuleDocumentsSnapshot();

}  // namespace ingress

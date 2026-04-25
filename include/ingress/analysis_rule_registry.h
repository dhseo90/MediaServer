// 파일 용도: Lab에서 저장한 분석 룰 문서를 RTSP/WebRTC 런타임이 공통 조회하도록 선언한다.
#pragma once

#include <string>
#include <vector>

namespace ingress {

std::vector<std::string> AnalysisRuleDocumentsSnapshot();

}  // namespace ingress

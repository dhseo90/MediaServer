#pragma once
// 파일 용도: canonical 분석 세션 타입을 application DTO로 변환하는 mapping을 선언한다.
#include "analysis/analysis_types.h"
#include "ingress/analysis_session_read_application_service.h"

namespace ingress::analysis_session_application_mapping {

AnalysisSessionApplicationResult FromCanonicalResult(const analysis::AnalysisResult& input);
analysis::AnalysisResult ToCanonicalResult(const AnalysisSessionApplicationResult& input);

}  // namespace ingress::analysis_session_application_mapping

#pragma once

#include "analysis/analysis_types.h"
#include "ingress/analysis_session_read_application_service.h"

namespace ingress::analysis_session_application_mapping {

AnalysisSessionApplicationResult FromCanonicalResult(const analysis::AnalysisResult& input);
analysis::AnalysisResult ToCanonicalResult(const AnalysisSessionApplicationResult& input);

}  // namespace ingress::analysis_session_application_mapping

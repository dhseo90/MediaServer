#pragma once
// 파일 용도: 분석 세션 attach/detach lifecycle application adapter를 선언한다.
#include <memory>

#include "analysis/analysis_session_service.h"
#include "ingress/analysis_session_lifecycle_application_service.h"

namespace ingress {

std::unique_ptr<AnalysisSessionLifecycleApplicationService>
MakeAnalysisSessionLifecycleApplicationAdapter(analysis::AnalysisSessionService& service);

}  // namespace ingress

#pragma once

#include <memory>

#include "analysis/analysis_session_service.h"
#include "ingress/analysis_session_lifecycle_application_service.h"

namespace ingress {

std::unique_ptr<AnalysisSessionLifecycleApplicationService>
MakeAnalysisSessionLifecycleApplicationAdapter(analysis::AnalysisSessionService& service);

}  // namespace ingress

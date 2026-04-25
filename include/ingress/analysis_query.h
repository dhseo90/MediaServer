// 파일 용도: HTTP/RTSP query에서 analysis profile과 overlay 옵션을 공통으로 해석한다.
#pragma once

#include <unordered_map>

#include "analysis/analysis_types.h"
#include "analysis/overlay_renderer.h"
#include "stdafx.h"

namespace ingress {

struct AnalysisOverlayTimingOptions {
    int sync_tolerance_ms{app_config::kDefaultAnalysisOverlaySyncToleranceMs};
    int wait_timeout_ms{app_config::kDefaultAnalysisOverlayWaitMs};
};

analysis::AnalysisProfile BuildAnalysisProfileFromQuery(const std::unordered_map<std::string, std::string>& query);
analysis::AnalysisProfile ResolveAnalysisProfileForContext(analysis::AnalysisProfile profile,
                                                           const analysis::AnalysisContext& context);
analysis::OverlayRenderOptions BuildOverlayRenderOptionsFromQuery(
    const std::unordered_map<std::string, std::string>& query);
AnalysisOverlayTimingOptions BuildAnalysisOverlayTimingOptionsFromQuery(
    const std::unordered_map<std::string, std::string>& query);
bool IsAnalysisOverlayRequested(const std::unordered_map<std::string, std::string>& query);

}  // namespace ingress

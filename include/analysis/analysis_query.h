// 파일 요약: query/registry 기반 AnalysisProfile과 overlay 옵션 생성 API를 선언한다.
// 동작 요약: request context별 profile/rule matching, query override, capabilities parsing 계약을 제공한다.
// 동작 요약: RTSP/WebRTC/HTTP analysis endpoint가 같은 해석 정책을 쓰게 한다.
#pragma once

#include <unordered_map>

#include "analysis/analysis_types.h"
#include "analysis/overlay_renderer.h"
#include "core/analysis_runtime_port.h"

namespace ingress {

struct AnalysisOverlayTimingOptions {
    int sync_tolerance_ms{core::analysis_runtime_defaults::kDefaultAnalysisOverlaySyncToleranceMs};
    int wait_timeout_ms{core::analysis_runtime_defaults::kDefaultAnalysisOverlayWaitMs};
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

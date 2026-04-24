// 파일 용도: 분석 결과를 raw frame 위에 그리는 overlay renderer API를 선언한다.
#pragma once

#include "analysis/analysis_types.h"

namespace analysis {

struct OverlayRenderOptions {
    int line_thickness{3};
    bool draw_labels{true};
};

bool RenderDetectionOverlay(const RawVideoFrame& frame,
                            const AnalysisResult& result,
                            const OverlayRenderOptions& options,
                            RawVideoFrame* output,
                            std::string* error_message = nullptr);

}  // namespace analysis

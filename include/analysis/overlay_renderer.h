// 파일 요약: 분석 결과를 raw frame 위에 그리는 renderer API를 선언한다.
// 동작 요약: label 언어, track id/trail, event highlight, line thickness 옵션을 제공한다.
// 동작 요약: snapshot JPEG와 live egress overlay가 같은 렌더러를 사용한다.
#pragma once

#include "analysis/analysis_types.h"

namespace analysis {

enum class OverlayLabelLanguage {
    Korean,
    English,
};

struct OverlayRenderOptions {
    int line_thickness{3};
    bool draw_labels{true};
    bool draw_event_highlight{true};
    bool draw_track_ids{false};
    bool draw_track_trails{false};
    OverlayLabelLanguage label_language{OverlayLabelLanguage::Korean};
};

bool RenderDetectionOverlay(const RawVideoFrame& frame,
                            const AnalysisResult& result,
                            const OverlayRenderOptions& options,
                            RawVideoFrame* output,
                            std::string* error_message = nullptr);

}  // namespace analysis

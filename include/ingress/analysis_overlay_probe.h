// 파일 요약: GStreamer raw video 구간에 분석 overlay probe를 붙이는 API를 선언한다.
// 동작 요약: stream key, analysis manager, overlay options를 pipeline element에 연결한다.
// 동작 요약: RTSP/WebRTC egress가 같은 overlay 합성 경로를 사용하게 한다.
#pragma once

#include <cstdint>
#include <functional>
#include <optional>

#include "analysis/analysis_types.h"
#include "analysis/overlay_renderer.h"
#include "core/media_analysis_port.h"
#include "stdafx.h"

#if MEDIA_SERVER_USE_GSTREAMER
struct _GstElement;
using GstElement = _GstElement;
#endif

namespace ingress {

struct AnalysisOverlayConfig {
    bool enabled{false};
    bool render_video_overlay{true};
    analysis::OverlayRenderOptions render_options;
    std::int64_t sync_tolerance_ns{
        static_cast<std::int64_t>(app_config::kDefaultAnalysisOverlaySyncToleranceMs) * 1000000};
    int wait_timeout_ms{app_config::kDefaultAnalysisOverlayWaitMs};
    std::function<std::optional<analysis::AnalysisResult>(std::int64_t frame_pts)> result_provider;
};

core::MediaPipelineAttachment MakeAnalysisOverlayAttachment(AnalysisOverlayConfig config);

#if MEDIA_SERVER_USE_GSTREAMER
bool AttachAnalysisOverlayProbe(GstElement* root,
                                AnalysisOverlayConfig config,
                                std::string* error_message = nullptr);
#endif

}  // namespace ingress

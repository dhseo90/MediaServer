// 파일 용도: RTSP/WebRTC egress GStreamer raw video 구간에 analysis overlay probe를 붙인다.
#pragma once

#include <cstdint>
#include <functional>
#include <optional>

#include "analysis/analysis_types.h"
#include "analysis/overlay_renderer.h"
#include "stdafx.h"

#if MEDIA_SERVER_USE_GSTREAMER
struct _GstElement;
using GstElement = _GstElement;
#endif

namespace ingress {

struct AnalysisOverlayConfig {
    bool enabled{false};
    analysis::OverlayRenderOptions render_options;
    std::int64_t sync_tolerance_ns{
        static_cast<std::int64_t>(app_config::kDefaultAnalysisOverlaySyncToleranceMs) * 1000000};
    int wait_timeout_ms{app_config::kDefaultAnalysisOverlayWaitMs};
    std::function<std::optional<analysis::AnalysisResult>(std::int64_t frame_pts)> result_provider;
};

#if MEDIA_SERVER_USE_GSTREAMER
bool AttachAnalysisOverlayProbe(GstElement* root,
                                AnalysisOverlayConfig config,
                                std::string* error_message = nullptr);
#endif

}  // namespace ingress

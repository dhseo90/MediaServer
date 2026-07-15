// 파일 요약: HTTP transport의 detector/tracker/overlay 실행을 application 경계로 분리한다.
// 동작 요약: analysis data contract는 forward declaration으로 유지하고 concrete service 호출과 옵션 mapping을 소유한다.
#pragma once

#include "ingress/analysis_session_read_application_service.h"

#include <cstddef>
#include <cstdint>
#include <functional>
#include <string>
#include <unordered_map>

namespace analysis {
struct AnalysisContext;
struct AnalysisProfile;
struct AnalysisResult;
struct RawVideoFrame;
}

namespace ingress {

struct AnalysisOverlayApplicationSettings {
    bool render_video_overlay{true};
    bool draw_debug_overlay{false};
    std::int64_t sync_tolerance_ns{0};
    int wait_timeout_ms{0};
};

using AnalysisResultProviderForApplication =
    std::function<bool(std::int64_t, analysis::AnalysisResult*)>;
using AnalysisPipelineAttachmentForApplication =
    std::function<bool(void*, std::string*)>;

struct AnalysisTrackingApplicationRuntimeConfig {
    float iou_weight{0.0F};
    float distance_weight{0.0F};
    float direction_weight{0.0F};
    float class_weight{0.0F};
    float min_association_score{0.0F};
    float smoothing_alpha{0.0F};
    std::string close_object_guard_mode;
    float close_object_distance_ratio{0.0F};
    float close_object_overlap_threshold{0.0F};
    float close_object_low_margin_threshold{0.0F};
    float close_object_center_jump_penalty{0.0F};
    float close_object_min_score_boost{0.0F};
    std::size_t max_close_object_diagnostics{0};
    std::uint32_t max_missed_frames{0};
};

struct CloseObjectGuardApplicationProjection {
    std::string mode;
    std::string label;
    bool score_mutation_enabled{false};
};

bool AnalyzeFrameForApplication(const analysis::AnalysisProfile& profile,
                                const analysis::RawVideoFrame& frame,
                                analysis::AnalysisResult* result,
                                double* analysis_ms,
                                std::string* error_message);

void TrackStaticImageForApplication(
    const analysis::AnalysisProfile& profile,
    const AnalysisTrackingApplicationRuntimeConfig& runtime_config,
    analysis::AnalysisResult* result);

CloseObjectGuardApplicationProjection ProjectCloseObjectGuardForApplication(
    const std::string& configured_mode);

bool RenderDetectionOverlayForApplication(
    const analysis::RawVideoFrame& frame,
    const analysis::AnalysisResult& result,
    const std::unordered_map<std::string, std::string>& query,
    analysis::RawVideoFrame* output,
    std::string* error_message);

bool RenderDetectionOverlayForApplication(
    ImageCodecFrame frame,
    const AnalysisSessionApplicationResult& result,
    const std::unordered_map<std::string, std::string>& query,
    ImageCodecFrame* output,
    std::string* error_message);

bool AnalysisOverlayDebugRequestedForApplication(
    const std::unordered_map<std::string, std::string>& query);

analysis::AnalysisProfile BuildAnalysisProfileForApplication(
    const std::unordered_map<std::string, std::string>& query);

analysis::AnalysisProfile ResolveAnalysisProfileForApplication(
    analysis::AnalysisProfile profile,
    const analysis::AnalysisContext& context);

bool IsAnalysisOverlayRequestedForApplication(
    const std::unordered_map<std::string, std::string>& query);

AnalysisOverlayApplicationSettings ResolveAnalysisOverlaySettingsForApplication(
    const std::unordered_map<std::string, std::string>& query,
    bool render_video_overlay);

AnalysisPipelineAttachmentForApplication MakeAnalysisOverlayAttachmentForApplication(
    const std::unordered_map<std::string, std::string>& query,
    bool render_video_overlay,
    AnalysisResultProviderForApplication result_provider);

}  // namespace ingress

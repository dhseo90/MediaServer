// 파일 요약: detector/tracker/overlay concrete analysis API를 application owner에서 실행한다.
// 동작 요약: transport가 제공한 runtime primitive를 기존 analysis 옵션에 1:1 mapping하고 호출 순서를 보존한다.
#include "ingress/analysis_frame_application_service.h"

#include <chrono>

#include "analysis/analysis_query.h"
#include "analysis/detector.h"
#include "analysis/object_tracker.h"
#include "analysis/overlay_renderer.h"
#include "ingress/analysis_overlay_probe.h"

namespace ingress {

bool AnalyzeFrameForApplication(const analysis::AnalysisProfile& profile,
                                const analysis::RawVideoFrame& frame,
                                analysis::AnalysisResult* result,
                                double* analysis_ms,
                                std::string* error_message) {
    auto detector = analysis::CreateDetector(profile);
    if (detector == nullptr) {
        if (error_message != nullptr) {
            *error_message = "failed to create image detector";
        }
        return false;
    }
    if (!detector->Start(error_message)) {
        return false;
    }

    const auto started_at = std::chrono::steady_clock::now();
    const bool analyzed = detector->Analyze(frame, result, error_message);
    if (analysis_ms != nullptr) {
        *analysis_ms =
            std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - started_at).count();
    }
    detector->Stop();
    return analyzed;
}

void TrackStaticImageForApplication(
    const analysis::AnalysisProfile& profile,
    const AnalysisTrackingApplicationRuntimeConfig& runtime_config,
    analysis::AnalysisResult* result) {
    if (!profile.enable_tracking || result == nullptr) {
        return;
    }
    analysis::ObjectTrackerOptions tracker_options;
    if (profile.tracking_policy_effective_tracker == "kalman-lite") {
        tracker_options.tracker_kind = analysis::ObjectTrackerKind::KalmanLite;
    } else if (profile.tracking_policy_effective_tracker == "bytetrack") {
        tracker_options.tracker_kind = analysis::ObjectTrackerKind::ByteTrack;
    } else {
        tracker_options.tracker_kind = analysis::ObjectTrackerKind::Lite;
    }
    tracker_options.class_labels = profile.tracking_class_labels;
    tracker_options.track_all_when_class_labels_empty = !profile.tracking_classes_specified;
    tracker_options.iou_weight = runtime_config.iou_weight;
    tracker_options.distance_weight = runtime_config.distance_weight;
    tracker_options.direction_weight = runtime_config.direction_weight;
    tracker_options.class_weight = runtime_config.class_weight;
    tracker_options.min_association_score = runtime_config.min_association_score;
    tracker_options.smoothing_alpha = runtime_config.smoothing_alpha;
    tracker_options.close_object_guard_mode =
        analysis::ParseCloseObjectGuardMode(runtime_config.close_object_guard_mode);
    tracker_options.close_object_distance_ratio = runtime_config.close_object_distance_ratio;
    tracker_options.close_object_overlap_threshold = runtime_config.close_object_overlap_threshold;
    tracker_options.close_object_low_margin_threshold = runtime_config.close_object_low_margin_threshold;
    tracker_options.close_object_center_jump_penalty = runtime_config.close_object_center_jump_penalty;
    tracker_options.close_object_min_score_boost = runtime_config.close_object_min_score_boost;
    tracker_options.max_close_object_diagnostics = runtime_config.max_close_object_diagnostics;
    tracker_options.max_missed_frames = runtime_config.max_missed_frames;
    analysis::ObjectTracker tracker(tracker_options);
    tracker.Update(result);
}

CloseObjectGuardApplicationProjection ProjectCloseObjectGuardForApplication(
    const std::string& configured_mode) {
    const auto mode = analysis::ParseCloseObjectGuardMode(configured_mode);
    CloseObjectGuardApplicationProjection projection;
    projection.mode = analysis::CloseObjectGuardModeToString(mode);
    projection.label = "guard off";
    if (mode == analysis::CloseObjectGuardMode::Diagnostic) {
        projection.label = "diagnostic-only · score 변경 없음";
    } else if (mode == analysis::CloseObjectGuardMode::Enforce) {
        projection.label = "score 보정 적용 중";
    }
    projection.score_mutation_enabled = mode == analysis::CloseObjectGuardMode::Enforce;
    return projection;
}

bool RenderDetectionOverlayForApplication(
    const analysis::RawVideoFrame& frame,
    const analysis::AnalysisResult& result,
    const std::unordered_map<std::string, std::string>& query,
    analysis::RawVideoFrame* output,
    std::string* error_message) {
    return analysis::RenderDetectionOverlay(
        frame, result, BuildOverlayRenderOptionsFromQuery(query), output, error_message);
}

bool AnalysisOverlayDebugRequestedForApplication(
    const std::unordered_map<std::string, std::string>& query) {
    return BuildOverlayRenderOptionsFromQuery(query).draw_debug_overlay;
}

void ConfigureAnalysisOverlayForApplication(
    const std::unordered_map<std::string, std::string>& query,
    bool render_video_overlay,
    AnalysisOverlayConfig* output) {
    if (output == nullptr) {
        return;
    }
    const auto timing_options = BuildAnalysisOverlayTimingOptionsFromQuery(query);
    output->enabled = true;
    output->render_video_overlay = render_video_overlay;
    output->render_options = BuildOverlayRenderOptionsFromQuery(query);
    output->sync_tolerance_ns =
        static_cast<std::int64_t>(timing_options.sync_tolerance_ms) * 1000000LL;
    output->wait_timeout_ms = timing_options.wait_timeout_ms;
}

}  // namespace ingress

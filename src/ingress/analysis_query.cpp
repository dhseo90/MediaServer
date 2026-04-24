// 파일 용도: analysis 관련 query 파라미터를 RTSP/WebRTC/HTTP lab 경로에서 동일하게 재사용한다.
#include "ingress/analysis_query.h"

#include <algorithm>

#include "app_config.h"

namespace ingress {

namespace {

bool ParseBoolQuery(const std::unordered_map<std::string, std::string>& query,
                    const std::string& key,
                    bool default_value) {
    const auto it = query.find(key);
    if (it == query.end()) {
        return default_value;
    }
    const std::string& value = it->second;
    return value == "1" || value == "true" || value == "yes" || value == "on";
}

int ParseClampedIntQuery(const std::unordered_map<std::string, std::string>& query,
                         const std::string& key,
                         int default_value,
                         int min_value,
                         int max_value) {
    const auto it = query.find(key);
    if (it == query.end()) {
        return default_value;
    }
    try {
        const int parsed = std::stoi(it->second);
        return std::max(min_value, std::min(max_value, parsed));
    } catch (...) {
        return default_value;
    }
}

float ParseClampedFloatQuery(const std::unordered_map<std::string, std::string>& query,
                             const std::string& key,
                             float default_value,
                             float min_value,
                             float max_value) {
    const auto it = query.find(key);
    if (it == query.end()) {
        return default_value;
    }
    try {
        const float parsed = std::stof(it->second);
        return std::max(min_value, std::min(max_value, parsed));
    } catch (...) {
        return default_value;
    }
}

}  // namespace

analysis::AnalysisProfile BuildAnalysisProfileFromQuery(const std::unordered_map<std::string, std::string>& query) {
    analysis::AnalysisProfile profile;
    const bool va_requested = ParseBoolQuery(query, "overlay", false) ||
                              ParseBoolQuery(query, "analysisOverlay", false) ||
                              ParseBoolQuery(query, "va", false) ||
                              ParseBoolQuery(query, "analysis", false);
    if (va_requested) {
        const auto& config = app::GetAppConfig();
        profile.detector_type = config.default_analysis_detector;
        profile.model_path = config.default_analysis_model_path;
        profile.labels_path = config.default_analysis_labels_path;
        profile.target_fps = config.default_analysis_fps;
        profile.max_queue_size = config.default_analysis_max_queue;
        profile.model_input_width = config.default_analysis_input_width;
        profile.model_input_height = config.default_analysis_input_height;
        profile.confidence_threshold = config.default_analysis_confidence;
        profile.nms_threshold = config.default_analysis_nms;
        profile.yolo_preprocess_mode = config.default_analysis_preprocess;
        profile.enable_overlay = true;
    }
    if (const auto it = query.find("profileId"); it != query.end() && !it->second.empty()) {
        profile.profile_id = it->second;
    } else if (const auto it = query.find("profile"); it != query.end() && !it->second.empty()) {
        profile.profile_id = it->second;
    }
    if (const auto it = query.find("detector"); it != query.end() && !it->second.empty()) {
        profile.detector_type = it->second;
    }
    if (const auto it = query.find("model"); it != query.end() && !it->second.empty()) {
        profile.model_path = it->second;
    }
    if (const auto it = query.find("labels"); it != query.end() && !it->second.empty()) {
        profile.labels_path = it->second;
    }
    profile.target_fps = ParseClampedIntQuery(query, "fps", profile.target_fps, 1, 60);
    profile.max_queue_size =
        static_cast<std::size_t>(ParseClampedIntQuery(query, "maxQueue", static_cast<int>(profile.max_queue_size), 1, 128));
    profile.model_input_width = ParseClampedIntQuery(query, "inputWidth", profile.model_input_width, 32, 4096);
    profile.model_input_height = ParseClampedIntQuery(query, "inputHeight", profile.model_input_height, 32, 4096);
    profile.max_detections = ParseClampedIntQuery(query, "maxDetections", profile.max_detections, 1, 1000);
    profile.confidence_threshold =
        ParseClampedFloatQuery(query, "confidence", profile.confidence_threshold, 0.0F, 1.0F);
    profile.nms_threshold = ParseClampedFloatQuery(query, "nms", profile.nms_threshold, 0.0F, 1.0F);
    profile.yolo_has_objectness = ParseBoolQuery(query, "objectness", profile.yolo_has_objectness);
    if (const auto it = query.find("preprocess"); it != query.end() && !it->second.empty()) {
        profile.yolo_preprocess_mode = it->second == "stretch" ? "stretch" : "letterbox";
    } else if (const auto it = query.find("yoloPreprocess"); it != query.end() && !it->second.empty()) {
        profile.yolo_preprocess_mode = it->second == "stretch" ? "stretch" : "letterbox";
    }
    profile.enable_object_detection = ParseBoolQuery(query, "detect", profile.enable_object_detection);
    profile.enable_tracking = ParseBoolQuery(query, "tracking", profile.enable_tracking);
    profile.enable_pose = ParseBoolQuery(query, "pose", profile.enable_pose);
    profile.enable_overlay = ParseBoolQuery(query, "overlay", profile.enable_overlay);
    profile.debug_detector_delay_ms =
        ParseClampedIntQuery(query, "detectorDelayMs", profile.debug_detector_delay_ms, 0, 5000);
    return profile;
}

analysis::OverlayRenderOptions BuildOverlayRenderOptionsFromQuery(
    const std::unordered_map<std::string, std::string>& query) {
    analysis::OverlayRenderOptions options;
    options.line_thickness = app::GetAppConfig().default_analysis_overlay_thickness;
    options.line_thickness = ParseClampedIntQuery(query, "thickness", options.line_thickness, 1, 16);
    options.draw_labels = ParseBoolQuery(query, "drawLabels", options.draw_labels);
    return options;
}

AnalysisOverlayTimingOptions BuildAnalysisOverlayTimingOptionsFromQuery(
    const std::unordered_map<std::string, std::string>& query) {
    AnalysisOverlayTimingOptions options;
    const auto& config = app::GetAppConfig();
    options.sync_tolerance_ms = config.default_analysis_overlay_sync_tolerance_ms;
    options.wait_timeout_ms = config.default_analysis_overlay_wait_ms;
    options.sync_tolerance_ms = ParseClampedIntQuery(query, "overlaySyncToleranceMs", options.sync_tolerance_ms, 0, 5000);
    options.wait_timeout_ms = ParseClampedIntQuery(query, "overlayWaitMs", options.wait_timeout_ms, 0, 2000);
    return options;
}

bool IsAnalysisOverlayRequested(const std::unordered_map<std::string, std::string>& query) {
    return ParseBoolQuery(query, "overlay", false) ||
           ParseBoolQuery(query, "analysisOverlay", false) ||
           ParseBoolQuery(query, "va", false) ||
           ParseBoolQuery(query, "analysis", false);
}

}  // namespace ingress

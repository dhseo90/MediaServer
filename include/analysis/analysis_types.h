// 파일 용도: 영상분석 모듈이 공유하는 프레임, 검출 결과, 분석 프로파일 타입을 정의한다.
#pragma once

#include <cstdint>
#include <sstream>

#include "stdafx.h"

namespace analysis {

enum class PixelFormat {
    Unknown,
    I420,
    RGB,
    BGR,
    Gray8,
};

struct RawVideoFrame {
    // raw decode hub가 compressed packet을 변환한 뒤 detector 입력으로 전달하는 frame이다.
    std::string source_key;
    std::string track_id;
    int width{0};
    int height{0};
    PixelFormat format{PixelFormat::Unknown};
    std::int64_t pts{0};
    std::vector<unsigned char> data;
};

struct RectF {
    // 좌표는 원본 frame 기준 normalized [0, 1] 값으로 저장한다.
    float x{0.0F};
    float y{0.0F};
    float width{0.0F};
    float height{0.0F};
};

struct Detection {
    int class_id{-1};
    std::string label;
    float score{0.0F};
    RectF box;
    // 룰 엔진에서 이벤트로 판단한 객체는 overlay renderer가 강조 표시한다.
    bool event_triggered{false};
    std::string event_rule_id;
    std::string event_type;
    std::string event_highlight_color{"#ffcc00"};
    int event_highlight_duration_ms{1200};
};

struct Track {
    std::uint64_t track_id{0};
    Detection detection;
    std::uint32_t age{0};
};

struct PoseKeypoint {
    std::string name;
    float x{0.0F};
    float y{0.0F};
    float score{0.0F};
};

struct AnalysisProfile {
    // 같은 source라도 profile이 다르면 detector/overlay 정책이 달라질 수 있으므로 별도 tap으로 다룬다.
    std::string profile_id{"default"};
    std::string detector_type{"dummy"};
    std::string model_path;
    std::string labels_path;
    int target_fps{5};
    std::size_t max_queue_size{2};
    int model_input_width{640};
    int model_input_height{640};
    int max_detections{50};
    float confidence_threshold{0.35F};
    float nms_threshold{0.45F};
    bool yolo_has_objectness{false};
    std::string yolo_preprocess_mode{"letterbox"};
    bool enable_object_detection{true};
    bool enable_tracking{false};
    bool enable_pose{false};
    bool enable_overlay{false};
    int debug_detector_delay_ms{0};
    bool adaptive_tuning_enabled{false};
    bool adaptive_input_size_enabled{false};
    int adaptive_min_fps{2};
    int adaptive_max_fps{0};
    int adaptive_min_input_width{320};
    int adaptive_min_input_height{320};
    int adaptive_max_input_width{0};
    int adaptive_max_input_height{0};
    int adaptive_input_step{128};
    int adaptive_cooldown_ms{3000};
    float adaptive_high_latency_ratio{0.85F};
    float adaptive_low_latency_ratio{0.35F};
};

inline std::string BuildProfileKey(const AnalysisProfile& profile) {
    std::ostringstream oss;
    oss << profile.profile_id << ":detector=" << profile.detector_type
        << ":model=" << (profile.model_path.empty() ? "default" : "custom")
        << ":fps=" << profile.target_fps << ":queue=" << profile.max_queue_size
        << ":input=" << profile.model_input_width << "x" << profile.model_input_height
        << ":conf=" << profile.confidence_threshold
        << ":nms=" << profile.nms_threshold
        << ":preprocess=" << profile.yolo_preprocess_mode
        << ":det=" << (profile.enable_object_detection ? 1 : 0)
        << ":track=" << (profile.enable_tracking ? 1 : 0)
        << ":pose=" << (profile.enable_pose ? 1 : 0)
        << ":overlay=" << (profile.enable_overlay ? 1 : 0)
        << ":adaptive=" << (profile.adaptive_tuning_enabled ? 1 : 0)
        << ":adaptiveInput=" << (profile.adaptive_input_size_enabled ? 1 : 0)
        << ":adaptiveFps=" << profile.adaptive_min_fps << "-" << profile.adaptive_max_fps
        << ":adaptiveInputBounds=" << profile.adaptive_min_input_width << "x" << profile.adaptive_min_input_height
        << "-" << profile.adaptive_max_input_width << "x" << profile.adaptive_max_input_height
        << ":adaptiveStep=" << profile.adaptive_input_step
        << ":adaptiveCooldown=" << profile.adaptive_cooldown_ms
        << ":delay=" << profile.debug_detector_delay_ms;
    return oss.str();
}

struct AnalysisResult {
    std::string source_key;
    std::string profile_key;
    std::int64_t pts{0};
    std::vector<Detection> detections;
    std::vector<Track> tracks;
    std::vector<PoseKeypoint> pose_keypoints;
};

}  // namespace analysis

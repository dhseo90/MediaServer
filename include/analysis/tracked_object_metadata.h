// 파일 요약: 후속 VA 상태/상황 계층이 사용할 객체 metadata adapter 계약을 선언한다.
// 동작 요약: AnalysisResult의 detection/tracking 결과를 stream별 TrackedObjectMetadata 목록으로 변환한다.
// 동작 요약: 기존 tracker/event 출력은 바꾸지 않고 TrackStateManager/SceneContextBuilder 입력만 정리한다.
#pragma once

#include "analysis/analysis_types.h"

namespace analysis {

struct NormalizedPointF {
    float x{0.0F};
    float y{0.0F};
};

struct GroundPointF {
    double x{0.0};
    double y{0.0};
    bool valid{false};
    bool fallback_to_image{true};
    std::string units{"image"};
};

struct ObjectDirection {
    std::string label{"unknown"};
    float dx{0.0F};
    float dy{0.0F};
};

struct TrackedObjectMetadata {
    std::string stream_id;
    std::string channel_id;
    std::uint64_t frame_id{0};
    std::int64_t timestamp_ns{0};
    std::int64_t timestamp_ms{0};
    std::uint64_t track_id{0};
    int class_id{-1};
    std::string class_name;
    float confidence{0.0F};
    float association_confidence{-1.0F};
    RectF bbox;
    NormalizedPointF center;
    std::optional<GroundPointF> ground_point;
    ObjectDirection direction;
    std::string track_state;
};

std::vector<TrackedObjectMetadata> BuildTrackedObjects(const AnalysisResult& result);

}  // namespace analysis

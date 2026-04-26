// 파일 용도: detector의 frame 단위 detection을 같은 객체 단위 track으로 연결하는 lightweight tracker를 선언한다.
#pragma once

#include "analysis/analysis_types.h"

namespace analysis {

struct ObjectTrackerOptions {
    float min_iou{0.30F};
    float max_center_distance{0.18F};
    float smoothing_alpha{0.65F};
    std::uint32_t min_confirmed_hits{2};
    std::uint32_t max_missed_frames{8};
    std::size_t max_trail_points{32};
    // 비어 있거나 "*"가 들어 있으면 모든 detection을 track 대상으로 본다. 기본값은 UI가 다루기 쉬운 카테고리 토큰이다.
    std::vector<std::string> class_labels{"person", "vehicle"};
};

class ObjectTracker {
public:
    explicit ObjectTracker(ObjectTrackerOptions options = {});

    // Detection 결과를 track과 매칭하고, Detection.track_id 및 result.tracks를 갱신한다.
    void Update(AnalysisResult* result);
    void Reset();

private:
    struct ActiveTrack {
        Track public_track;
    };

    ObjectTrackerOptions options_;
    std::uint64_t next_track_id_{1};
    std::vector<ActiveTrack> tracks_;
};

}  // namespace analysis

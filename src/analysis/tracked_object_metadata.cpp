// 파일 요약: AnalysisResult를 후속 상태/상황 분석용 TrackedObjectMetadata로 변환한다.
// 동작 요약: detection, track id, trail 기반 방향, stream/frame timestamp를 하나의 객체 metadata로 묶는다.
// 동작 요약: 기존 tracking id 생성과 event rule 평가는 변경하지 않는 read-only adapter다.
#include "analysis/tracked_object_metadata.h"

#include <algorithm>
#include <cmath>
#include <unordered_map>

namespace analysis {

namespace {

constexpr float kStationaryEpsilon = 0.0025F;

float Clamp01(float value) {
    return std::max(0.0F, std::min(1.0F, value));
}

NormalizedPointF CenterOf(const RectF& box) {
    return NormalizedPointF{
        Clamp01(box.x + box.width * 0.5F),
        Clamp01(box.y + box.height * 0.5F),
    };
}

ObjectDirection DirectionFromTrail(const Track& track) {
    if (track.trail.size() < 2) {
        return {};
    }

    const auto& previous = track.trail[track.trail.size() - 2];
    const auto& current = track.trail.back();
    ObjectDirection direction;
    direction.dx = current.x - previous.x;
    direction.dy = current.y - previous.y;

    if (std::fabs(direction.dx) < kStationaryEpsilon &&
        std::fabs(direction.dy) < kStationaryEpsilon) {
        direction.label = "stationary";
        return direction;
    }
    if (std::fabs(direction.dx) >= std::fabs(direction.dy)) {
        direction.label = direction.dx >= 0.0F ? "right" : "left";
        return direction;
    }
    direction.label = direction.dy >= 0.0F ? "down" : "up";
    return direction;
}

}  // namespace

std::vector<TrackedObjectMetadata> BuildTrackedObjects(const AnalysisResult& result) {
    std::unordered_map<std::uint64_t, const Track*> tracks_by_id;
    tracks_by_id.reserve(result.tracks.size());
    for (const auto& track : result.tracks) {
        if (track.track_id > 0) {
            tracks_by_id[track.track_id] = &track;
        }
    }

    std::vector<TrackedObjectMetadata> objects;
    objects.reserve(result.detections.size());
    for (const auto& detection : result.detections) {
        const Track* track = nullptr;
        if (detection.track_id > 0) {
            const auto it = tracks_by_id.find(detection.track_id);
            if (it != tracks_by_id.end()) {
                track = it->second;
            }
        }

        TrackedObjectMetadata object;
        object.stream_id = result.source_key;
        object.channel_id = result.source_key;
        object.frame_id = result.frame_id;
        object.timestamp_ns = result.pts;
        object.timestamp_ms = result.pts / 1000000LL;
        object.track_id = detection.track_id;
        object.class_id = detection.class_id;
        object.class_name = detection.label;
        object.confidence = detection.score;
        object.bbox = detection.box;
        object.center = CenterOf(detection.box);
        if (track != nullptr) {
            object.direction = DirectionFromTrail(*track);
            object.track_state = track->state;
        }
        objects.push_back(std::move(object));
    }
    return objects;
}

}  // namespace analysis

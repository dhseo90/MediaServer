// 파일 용도: IoU와 중심점 거리를 이용한 경량 객체 tracker를 구현한다.
#include "analysis/object_tracker.h"

#include <algorithm>
#include <cctype>
#include <cmath>

namespace analysis {

namespace {

float Clamp01(float value) {
    return std::max(0.0F, std::min(1.0F, value));
}

RectF ClampRect(RectF rect) {
    rect.x = Clamp01(rect.x);
    rect.y = Clamp01(rect.y);
    rect.width = std::max(0.0F, std::min(1.0F - rect.x, rect.width));
    rect.height = std::max(0.0F, std::min(1.0F - rect.y, rect.height));
    return rect;
}

float Area(const RectF& rect) {
    return std::max(0.0F, rect.width) * std::max(0.0F, rect.height);
}

float IoU(const RectF& lhs, const RectF& rhs) {
    const float x1 = std::max(lhs.x, rhs.x);
    const float y1 = std::max(lhs.y, rhs.y);
    const float x2 = std::min(lhs.x + lhs.width, rhs.x + rhs.width);
    const float y2 = std::min(lhs.y + lhs.height, rhs.y + rhs.height);
    const float intersection = std::max(0.0F, x2 - x1) * std::max(0.0F, y2 - y1);
    const float union_area = Area(lhs) + Area(rhs) - intersection;
    if (union_area <= 0.0F) {
        return 0.0F;
    }
    return intersection / union_area;
}

float CenterDistance(const RectF& lhs, const RectF& rhs) {
    const float lx = lhs.x + lhs.width * 0.5F;
    const float ly = lhs.y + lhs.height * 0.5F;
    const float rx = rhs.x + rhs.width * 0.5F;
    const float ry = rhs.y + rhs.height * 0.5F;
    const float dx = lx - rx;
    const float dy = ly - ry;
    return std::sqrt(dx * dx + dy * dy);
}

bool SameClass(const Detection& lhs, const Detection& rhs) {
    return lhs.class_id == rhs.class_id && lhs.label == rhs.label;
}

// class label/id 비교가 대소문자와 공백 표기에 흔들리지 않도록 정규화한다.
std::string NormalizeClassToken(std::string value) {
    value.erase(std::remove_if(value.begin(),
                               value.end(),
                               [](unsigned char ch) { return std::isspace(ch) != 0; }),
                value.end());
    std::transform(value.begin(), value.end(), value.begin(), [](unsigned char ch) {
        return static_cast<char>(std::tolower(ch));
    });
    return value;
}

// trackingClasses override에서 전체 추적을 뜻하는 토큰인지 확인한다.
bool IsAllClassesToken(const std::string& value) {
    return value == "*" || value == "all" || value == "any";
}

// 사람/차량/동물처럼 UI에 노출하는 카테고리 토큰을 실제 COCO label 묶음으로 확장한다.
bool MatchesCategoryToken(const std::string& wanted, const std::string& label) {
    if (wanted == "person" || wanted == "people" || wanted == "human" || wanted == "humans") {
        return label == "person";
    }
    if (wanted == "vehicle" || wanted == "vehicles") {
        return label == "bicycle" || label == "car" || label == "motorcycle" || label == "airplane" ||
               label == "bus" || label == "train" || label == "truck" || label == "boat";
    }
    if (wanted == "animal" || wanted == "animals") {
        return label == "bird" || label == "cat" || label == "dog" || label == "horse" ||
               label == "sheep" || label == "cow" || label == "elephant" || label == "bear" ||
               label == "zebra" || label == "giraffe";
    }
    return false;
}

// detection이 현재 tracker whitelist에 포함되는지 판단한다.
bool ShouldTrackDetection(const Detection& detection, const ObjectTrackerOptions& options) {
    if (options.class_labels.empty()) {
        return true;
    }

    const std::string label = NormalizeClassToken(detection.label);
    const std::string class_id = std::to_string(detection.class_id);
    for (const auto& raw_class : options.class_labels) {
        const std::string wanted = NormalizeClassToken(raw_class);
        if (wanted.empty()) {
            continue;
        }
        if (IsAllClassesToken(wanted) || wanted == label || wanted == class_id ||
            MatchesCategoryToken(wanted, label)) {
            return true;
        }
    }
    return false;
}

Track::TrailPoint CenterPoint(const Detection& detection, std::int64_t pts) {
    return Track::TrailPoint{
        Clamp01(detection.box.x + detection.box.width * 0.5F),
        Clamp01(detection.box.y + detection.box.height * 0.5F),
        pts,
    };
}

void AppendTrailPoint(Track* track, const Detection& detection, std::int64_t pts, std::size_t max_points) {
    if (track == nullptr || max_points == 0) {
        return;
    }
    track->trail.push_back(CenterPoint(detection, pts));
    while (track->trail.size() > max_points) {
        track->trail.erase(track->trail.begin());
    }
}

RectF SmoothRect(const RectF& previous, const RectF& current, float alpha) {
    const float previous_weight = std::max(0.0F, std::min(1.0F, alpha));
    const float current_weight = 1.0F - previous_weight;
    return ClampRect(RectF{
        previous.x * previous_weight + current.x * current_weight,
        previous.y * previous_weight + current.y * current_weight,
        previous.width * previous_weight + current.width * current_weight,
        previous.height * previous_weight + current.height * current_weight,
    });
}

std::string TrackState(const Track& track, const ObjectTrackerOptions& options) {
    if (track.missed > 0) {
        return "lost";
    }
    return track.hits >= options.min_confirmed_hits ? "confirmed" : "tentative";
}

}  // namespace

ObjectTracker::ObjectTracker(ObjectTrackerOptions options) : options_(options) {
    options_.min_iou = std::max(0.0F, std::min(1.0F, options_.min_iou));
    options_.max_center_distance = std::max(0.01F, std::min(1.0F, options_.max_center_distance));
    options_.smoothing_alpha = std::max(0.0F, std::min(0.95F, options_.smoothing_alpha));
    options_.min_confirmed_hits = std::max<std::uint32_t>(1, options_.min_confirmed_hits);
    options_.max_missed_frames = std::max<std::uint32_t>(1, options_.max_missed_frames);
    options_.max_trail_points = std::max<std::size_t>(2, std::min<std::size_t>(256, options_.max_trail_points));
    for (auto& label : options_.class_labels) {
        label = NormalizeClassToken(label);
    }
    options_.class_labels.erase(std::remove_if(options_.class_labels.begin(),
                                               options_.class_labels.end(),
                                               [](const std::string& label) { return label.empty(); }),
                                options_.class_labels.end());
}

void ObjectTracker::Reset() {
    tracks_.clear();
    next_track_id_ = 1;
}

void ObjectTracker::Update(AnalysisResult* result) {
    if (result == nullptr) {
        return;
    }

    struct Candidate {
        std::size_t track_index{0};
        std::size_t detection_index{0};
        float score{0.0F};
    };

    std::vector<Candidate> candidates;
    for (std::size_t track_index = 0; track_index < tracks_.size(); ++track_index) {
        const Detection& tracked = tracks_[track_index].public_track.detection;
        for (std::size_t detection_index = 0; detection_index < result->detections.size(); ++detection_index) {
            const Detection& detection = result->detections[detection_index];
            if (!ShouldTrackDetection(detection, options_)) {
                continue;
            }
            if (!SameClass(tracked, detection)) {
                continue;
            }

            const float iou = IoU(tracked.box, detection.box);
            const float center_distance = CenterDistance(tracked.box, detection.box);
            if (iou < options_.min_iou && center_distance > options_.max_center_distance) {
                continue;
            }

            // IoU가 낮아도 중심점이 충분히 가까우면 일시적인 box 흔들림으로 보고 약한 후보로 둔다.
            const float center_score =
                std::max(0.0F, 1.0F - center_distance / options_.max_center_distance) * options_.min_iou;
            candidates.push_back(Candidate{track_index, detection_index, std::max(iou, center_score)});
        }
    }

    std::sort(candidates.begin(), candidates.end(), [](const Candidate& lhs, const Candidate& rhs) {
        return lhs.score > rhs.score;
    });

    std::vector<bool> matched_tracks(tracks_.size(), false);
    std::vector<bool> matched_detections(result->detections.size(), false);
    for (const Candidate& candidate : candidates) {
        if (matched_tracks[candidate.track_index] || matched_detections[candidate.detection_index]) {
            continue;
        }

        ActiveTrack& track = tracks_[candidate.track_index];
        Detection detection = result->detections[candidate.detection_index];
        detection.track_id = track.public_track.track_id;
        detection.box = SmoothRect(track.public_track.detection.box, detection.box, options_.smoothing_alpha);

        track.public_track.detection = detection;
        ++track.public_track.age;
        ++track.public_track.hits;
        track.public_track.missed = 0;
        track.public_track.last_seen_pts = result->pts;
        track.public_track.state = TrackState(track.public_track, options_);
        AppendTrailPoint(&track.public_track, detection, result->pts, options_.max_trail_points);

        result->detections[candidate.detection_index] = detection;
        matched_tracks[candidate.track_index] = true;
        matched_detections[candidate.detection_index] = true;
    }

    for (std::size_t detection_index = 0; detection_index < result->detections.size(); ++detection_index) {
        if (matched_detections[detection_index]) {
            continue;
        }

        Detection detection = result->detections[detection_index];
        if (!ShouldTrackDetection(detection, options_)) {
            // whitelist 밖 객체는 detection overlay만 유지하고 trackId/trail 부하는 만들지 않는다.
            detection.track_id = 0;
            result->detections[detection_index] = detection;
            continue;
        }
        detection.track_id = next_track_id_++;
        Track public_track;
        public_track.track_id = detection.track_id;
        public_track.detection = detection;
        public_track.age = 1;
        public_track.hits = 1;
        public_track.missed = 0;
        public_track.first_seen_pts = result->pts;
        public_track.last_seen_pts = result->pts;
        public_track.state = TrackState(public_track, options_);
        AppendTrailPoint(&public_track, detection, result->pts, options_.max_trail_points);
        tracks_.push_back(ActiveTrack{public_track});
        result->detections[detection_index] = detection;
    }

    const std::size_t existing_track_count = matched_tracks.size();
    for (std::size_t track_index = 0; track_index < existing_track_count; ++track_index) {
        if (matched_tracks[track_index]) {
            continue;
        }
        ++tracks_[track_index].public_track.age;
        ++tracks_[track_index].public_track.missed;
        tracks_[track_index].public_track.state = TrackState(tracks_[track_index].public_track, options_);
    }

    tracks_.erase(std::remove_if(tracks_.begin(),
                                 tracks_.end(),
                                 [&](const ActiveTrack& track) {
                                     return track.public_track.missed > options_.max_missed_frames;
                                 }),
                  tracks_.end());

    result->tracks.clear();
    result->tracks.reserve(tracks_.size());
    for (const auto& track : tracks_) {
        if (track.public_track.missed == 0) {
            result->tracks.push_back(track.public_track);
        }
    }
}

}  // namespace analysis

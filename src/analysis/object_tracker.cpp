// 파일 요약: 경량 IoU/중심점 거리 기반 object tracker 구현이다.
// 동작 요약: frame별 detection을 기존 track과 매칭해 trackId, 상태, trail을 유지한다.
// 동작 요약: tracking category token을 적용해 필요한 객체에만 ID와 trail을 부여한다.
#include "analysis/object_tracker.h"

#include "analysis/category_tokens.h"

#include <algorithm>
#include <cctype>
#include <cmath>
#include <limits>

namespace analysis {

CloseObjectGuardMode ParseCloseObjectGuardMode(const std::string& value) {
    std::string normalized = value;
    std::transform(normalized.begin(),
                   normalized.end(),
                   normalized.begin(),
                   [](unsigned char ch) { return static_cast<char>(std::tolower(ch)); });
    if (normalized == "diagnostic" || normalized == "diagnostics" || normalized == "diag") {
        return CloseObjectGuardMode::Diagnostic;
    }
    if (normalized == "enforce" || normalized == "guard") {
        return CloseObjectGuardMode::Enforce;
    }
    return CloseObjectGuardMode::Off;
}

std::string CloseObjectGuardModeToString(CloseObjectGuardMode mode) {
    switch (mode) {
        case CloseObjectGuardMode::Diagnostic:
            return "diagnostic";
        case CloseObjectGuardMode::Enforce:
            return "enforce";
        case CloseObjectGuardMode::Off:
        default:
            return "off";
    }
}

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

float PointDistance(float lhs_x, float lhs_y, float rhs_x, float rhs_y) {
    const float dx = lhs_x - rhs_x;
    const float dy = lhs_y - rhs_y;
    return std::sqrt(dx * dx + dy * dy);
}

float DetectionCenterDistance(float center_x, float center_y, const Detection& detection) {
    return PointDistance(center_x,
                         center_y,
                         detection.box.x + detection.box.width * 0.5F,
                         detection.box.y + detection.box.height * 0.5F);
}

float PredictedCenterDistance(const Track& track, const Detection& detection) {
    constexpr float kPredictionEpsilon = 0.0005F;
    if (track.trail.size() < 2) {
        return CenterDistance(track.detection.box, detection.box);
    }

    const auto& previous = track.trail[track.trail.size() - 2];
    const auto& current = track.trail.back();
    const float dx = current.x - previous.x;
    const float dy = current.y - previous.y;
    if (std::sqrt(dx * dx + dy * dy) < kPredictionEpsilon) {
        return CenterDistance(track.detection.box, detection.box);
    }

    const float steps = static_cast<float>(std::min<std::uint32_t>(track.missed + 1, 3));
    const float predicted_x = Clamp01(current.x + dx * steps);
    const float predicted_y = Clamp01(current.y + dy * steps);
    return DetectionCenterDistance(predicted_x, predicted_y, detection);
}

float AssociationCenterDistance(const Track& track, const Detection& detection) {
    return std::min(CenterDistance(track.detection.box, detection.box),
                    PredictedCenterDistance(track, detection));
}

bool SameClass(const Detection& lhs, const Detection& rhs) {
    return lhs.class_id == rhs.class_id && lhs.label == rhs.label;
}

bool VehicleClassCompatible(const Detection& lhs, const Detection& rhs) {
    const std::string lhs_label = NormalizeClassToken(lhs.label);
    const std::string rhs_label = NormalizeClassToken(rhs.label);
    return MatchesCategoryToken("vehicle", lhs_label) && MatchesCategoryToken("vehicle", rhs_label);
}

bool TrackClassCompatible(const Detection& lhs, const Detection& rhs) {
    return SameClass(lhs, rhs) || VehicleClassCompatible(lhs, rhs);
}

// detection이 현재 tracker whitelist에 포함되는지 판단한다.
bool ShouldTrackDetection(const Detection& detection, const ObjectTrackerOptions& options) {
    if (options.class_labels.empty()) {
        return options.track_all_when_class_labels_empty;
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

float ClassConsistencyScore(const Detection& tracked, const Detection& detection) {
    if (SameClass(tracked, detection)) {
        return 1.0F;
    }
    return VehicleClassCompatible(tracked, detection) ? 0.65F : 0.0F;
}

float CenterDistanceScore(float center_distance, const ObjectTrackerOptions& options) {
    if (options.max_center_distance <= 0.0F) {
        return 0.0F;
    }
    return Clamp01(1.0F - center_distance / options.max_center_distance);
}

float DirectionScore(const Track& track, const Detection& detection) {
    if (track.trail.size() < 2) {
        return 0.5F;
    }

    constexpr float kDirectionEpsilon = 0.0005F;
    const auto& previous = track.trail[track.trail.size() - 2];
    const auto& current = track.trail.back();
    const float detection_center_x = Clamp01(detection.box.x + detection.box.width * 0.5F);
    const float detection_center_y = Clamp01(detection.box.y + detection.box.height * 0.5F);
    const float previous_dx = current.x - previous.x;
    const float previous_dy = current.y - previous.y;
    const float candidate_dx = detection_center_x - current.x;
    const float candidate_dy = detection_center_y - current.y;
    const float previous_norm = std::sqrt(previous_dx * previous_dx + previous_dy * previous_dy);
    const float candidate_norm = std::sqrt(candidate_dx * candidate_dx + candidate_dy * candidate_dy);
    if (previous_norm < kDirectionEpsilon && candidate_norm < kDirectionEpsilon) {
        return 1.0F;
    }
    if (previous_norm < kDirectionEpsilon || candidate_norm < kDirectionEpsilon) {
        return 0.75F;
    }
    const float cosine =
        (previous_dx * candidate_dx + previous_dy * candidate_dy) / (previous_norm * candidate_norm);
    return Clamp01((cosine + 1.0F) * 0.5F);
}

ObjectAssociationScore BuildAssociationScore(const Track& track,
                                             const Detection& detection,
                                             const ObjectTrackerOptions& options) {
    ObjectAssociationScore score;
    const Detection& tracked = track.detection;
    score.iou_score = IoU(tracked.box, detection.box);
    score.center_distance_score = CenterDistanceScore(AssociationCenterDistance(track, detection), options);
    score.direction_score = DirectionScore(track, detection);
    score.class_consistency_score = ClassConsistencyScore(tracked, detection);
    const float total_weight =
        options.iou_weight + options.distance_weight + options.direction_weight + options.class_weight;
    if (total_weight <= 0.0F) {
        score.final_score = std::max(score.iou_score,
                                     score.center_distance_score * options.min_iou);
        return score;
    }
    score.final_score =
        Clamp01((score.iou_score * options.iou_weight +
                 score.center_distance_score * options.distance_weight +
                 score.direction_score * options.direction_weight +
                 score.class_consistency_score * options.class_weight) /
                total_weight);
    return score;
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
    options_.iou_weight = std::max(0.0F, options_.iou_weight);
    options_.distance_weight = std::max(0.0F, options_.distance_weight);
    options_.direction_weight = std::max(0.0F, options_.direction_weight);
    options_.class_weight = std::max(0.0F, options_.class_weight);
    if (options_.iou_weight + options_.distance_weight + options_.direction_weight +
            options_.class_weight <=
        0.0F) {
        options_.iou_weight = app_config::kDefaultAnalysisTrackingIouWeight;
        options_.distance_weight = app_config::kDefaultAnalysisTrackingDistanceWeight;
        options_.direction_weight = app_config::kDefaultAnalysisTrackingDirectionWeight;
        options_.class_weight = app_config::kDefaultAnalysisTrackingClassWeight;
    }
    options_.min_association_score = std::max(0.0F, std::min(1.0F, options_.min_association_score));
    options_.smoothing_alpha = std::max(0.0F, std::min(0.95F, options_.smoothing_alpha));
    options_.close_object_distance_ratio =
        std::max(0.01F, std::min(4.0F, options_.close_object_distance_ratio));
    options_.close_object_overlap_threshold =
        std::max(0.0F, std::min(1.0F, options_.close_object_overlap_threshold));
    options_.close_object_low_margin_threshold =
        std::max(0.01F, std::min(1.0F, options_.close_object_low_margin_threshold));
    options_.close_object_center_jump_penalty =
        std::max(0.0F, std::min(1.0F, options_.close_object_center_jump_penalty));
    options_.close_object_min_score_boost =
        std::max(0.0F, std::min(1.0F, options_.close_object_min_score_boost));
    options_.max_close_object_diagnostics =
        std::max<std::size_t>(1, std::min<std::size_t>(256, options_.max_close_object_diagnostics));
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
    result->close_object_diagnostics.clear();

    struct Candidate {
        std::size_t track_index{0};
        std::size_t detection_index{0};
        ObjectAssociationScore score;
        float ranking_score{0.0F};
        CloseObjectAssociationDiagnostic diagnostic;
        bool has_diagnostic{false};
    };

    std::vector<Candidate> candidates;
    for (std::size_t track_index = 0; track_index < tracks_.size(); ++track_index) {
        const Detection& tracked = tracks_[track_index].public_track.detection;
        for (std::size_t detection_index = 0; detection_index < result->detections.size(); ++detection_index) {
            const Detection& detection = result->detections[detection_index];
            if (!ShouldTrackDetection(detection, options_)) {
                continue;
            }
            if (!TrackClassCompatible(tracked, detection)) {
                continue;
            }

            const float iou = IoU(tracked.box, detection.box);
            const float center_distance =
                AssociationCenterDistance(tracks_[track_index].public_track, detection);
            if (iou < options_.min_iou && center_distance > options_.max_center_distance) {
                continue;
            }

            const ObjectAssociationScore score =
                BuildAssociationScore(tracks_[track_index].public_track, detection, options_);
            if (score.class_consistency_score <= 0.0F ||
                score.final_score < options_.min_association_score) {
                continue;
            }
            candidates.push_back(Candidate{track_index, detection_index, score, score.final_score});
        }
    }

    const bool close_object_diagnostics_enabled =
        options_.close_object_guard_mode != CloseObjectGuardMode::Off;
    if (close_object_diagnostics_enabled) {
        const std::string guard_mode = CloseObjectGuardModeToString(options_.close_object_guard_mode);
        for (Candidate& candidate : candidates) {
            const ActiveTrack& track = tracks_[candidate.track_index];
            const Detection& detection = result->detections[candidate.detection_index];

            float best_score = 0.0F;
            float second_score = 0.0F;
            for (const Candidate& peer : candidates) {
                if (peer.detection_index != candidate.detection_index) {
                    continue;
                }
                const float score = peer.score.final_score;
                if (score > best_score) {
                    second_score = best_score;
                    best_score = score;
                } else if (score > second_score) {
                    second_score = score;
                }
            }
            const float score_margin = std::max(0.0F, best_score - second_score);

            float nearest_distance = std::numeric_limits<float>::max();
            float nearest_overlap = 0.0F;
            std::uint64_t nearest_track_id = 0;
            for (std::size_t track_index = 0; track_index < tracks_.size(); ++track_index) {
                if (track_index == candidate.track_index) {
                    continue;
                }
                const Track& peer = tracks_[track_index].public_track;
                if (!SameClass(peer.detection, detection)) {
                    continue;
                }
                const float distance = CenterDistance(peer.detection.box, detection.box);
                if (distance < nearest_distance) {
                    nearest_distance = distance;
                    nearest_track_id = peer.track_id;
                }
                nearest_overlap = std::max(nearest_overlap, IoU(peer.detection.box, detection.box));
            }

            const float center_jump = CenterDistance(track.public_track.detection.box, detection.box);
            const float association_jump = AssociationCenterDistance(track.public_track, detection);
            const bool direction_conflict =
                candidate.score.direction_score < 0.35F &&
                association_jump > options_.max_center_distance * 0.5F;
            const bool has_nearest = nearest_track_id > 0 &&
                                     nearest_distance < std::numeric_limits<float>::max();
            const float distance_threshold =
                std::max(0.001F, options_.max_center_distance * options_.close_object_distance_ratio);
            const float proximity_component =
                has_nearest ? Clamp01(1.0F - nearest_distance / distance_threshold) : 0.0F;
            const float overlap_component =
                options_.close_object_overlap_threshold > 0.0F
                    ? Clamp01(nearest_overlap / options_.close_object_overlap_threshold)
                    : (nearest_overlap > 0.0F ? 1.0F : 0.0F);
            const float spatial_component = std::max(proximity_component, overlap_component);
            const float low_margin_component =
                Clamp01(1.0F - score_margin / options_.close_object_low_margin_threshold);
            const float low_score_component = Clamp01(1.0F - candidate.score.final_score);
            const float jump_component = Clamp01(association_jump / options_.max_center_distance);
            const float ambiguity_component = std::max(low_margin_component, low_score_component);
            const float close_object_risk =
                spatial_component <= 0.0F
                    ? 0.0F
                    : Clamp01(spatial_component * 0.65F + ambiguity_component * 0.25F +
                              jump_component * 0.10F);

            CloseObjectAssociationDiagnostic diagnostic;
            diagnostic.track_id = track.public_track.track_id;
            diagnostic.detection_index = candidate.detection_index;
            diagnostic.class_id = detection.class_id;
            diagnostic.class_name = detection.label;
            diagnostic.mode = guard_mode;
            diagnostic.close_object_risk = close_object_risk;
            diagnostic.nearest_same_class_track_id = nearest_track_id;
            diagnostic.nearest_same_class_distance_available = has_nearest;
            diagnostic.nearest_same_class_distance = has_nearest ? nearest_distance : 0.0F;
            diagnostic.candidate_score = candidate.score.final_score;
            diagnostic.ranking_score = candidate.ranking_score;
            diagnostic.best_score = best_score;
            diagnostic.second_score = second_score;
            diagnostic.score_margin = score_margin;
            diagnostic.center_jump = center_jump;
            diagnostic.direction_conflict = direction_conflict;
            diagnostic.would_penalize =
                close_object_risk >= 0.25F &&
                (direction_conflict ||
                 association_jump >= options_.max_center_distance ||
                 score_margin <= options_.close_object_low_margin_threshold);
            diagnostic.would_hold_reacquire =
                track.public_track.missed > 0 &&
                close_object_risk >= 0.25F &&
                (candidate.score.final_score < 0.75F ||
                 score_margin <= options_.close_object_low_margin_threshold);
            diagnostic.guard_decision = "observe";

            if (options_.close_object_guard_mode == CloseObjectGuardMode::Enforce) {
                float adjusted_score = candidate.score.final_score;
                if (diagnostic.would_penalize) {
                    adjusted_score -= options_.close_object_center_jump_penalty * close_object_risk;
                    diagnostic.guard_decision = "enforce-penalize";
                }
                if (!direction_conflict && track.public_track.missed == 0 &&
                    track.public_track.hits >= options_.min_confirmed_hits &&
                    close_object_risk > 0.0F &&
                    score_margin <= options_.close_object_low_margin_threshold) {
                    adjusted_score += options_.close_object_min_score_boost * close_object_risk;
                    if (diagnostic.guard_decision == "observe") {
                        diagnostic.guard_decision = "enforce-continuity-bias";
                    }
                }
                candidate.ranking_score = Clamp01(adjusted_score);
                diagnostic.ranking_score = candidate.ranking_score;
            } else if (diagnostic.would_hold_reacquire) {
                diagnostic.guard_decision = "would-hold-reacquire";
            } else if (diagnostic.would_penalize) {
                diagnostic.guard_decision = "would-penalize";
            }

            candidate.diagnostic = std::move(diagnostic);
            candidate.has_diagnostic = true;
        }
    }

    std::sort(candidates.begin(), candidates.end(), [](const Candidate& lhs, const Candidate& rhs) {
        if (lhs.ranking_score == rhs.ranking_score) {
            return lhs.score.final_score > rhs.score.final_score;
        }
        return lhs.ranking_score > rhs.ranking_score;
    });

    std::vector<bool> matched_tracks(tracks_.size(), false);
    std::vector<bool> matched_detections(result->detections.size(), false);
    std::vector<bool> selected_candidates(candidates.size(), false);
    for (std::size_t candidate_index = 0; candidate_index < candidates.size(); ++candidate_index) {
        const Candidate& candidate = candidates[candidate_index];
        if (matched_tracks[candidate.track_index] || matched_detections[candidate.detection_index]) {
            continue;
        }

        ActiveTrack& track = tracks_[candidate.track_index];
        Detection detection = result->detections[candidate.detection_index];
        const bool was_lost_buffer_track = track.public_track.missed > 0;
        detection.track_id = track.public_track.track_id;
        detection.association_confidence = candidate.ranking_score;
        detection.box = SmoothRect(track.public_track.detection.box, detection.box, options_.smoothing_alpha);

        track.public_track.detection = detection;
        ++track.public_track.age;
        ++track.public_track.hits;
        track.public_track.missed = 0;
        track.public_track.last_seen_pts = result->pts;
        track.public_track.state =
            was_lost_buffer_track ? "reacquired" : TrackState(track.public_track, options_);
        AppendTrailPoint(&track.public_track, detection, result->pts, options_.max_trail_points);

        result->detections[candidate.detection_index] = detection;
        matched_tracks[candidate.track_index] = true;
        matched_detections[candidate.detection_index] = true;
        selected_candidates[candidate_index] = true;
    }

    if (close_object_diagnostics_enabled) {
        result->close_object_diagnostics.reserve(
            std::min(options_.max_close_object_diagnostics, candidates.size()));
        for (std::size_t candidate_index = 0; candidate_index < candidates.size(); ++candidate_index) {
            const Candidate& candidate = candidates[candidate_index];
            if (!candidate.has_diagnostic) {
                continue;
            }
            CloseObjectAssociationDiagnostic diagnostic = candidate.diagnostic;
            diagnostic.matched = selected_candidates[candidate_index];
            diagnostic.rejected =
                !diagnostic.matched &&
                (matched_tracks[candidate.track_index] || matched_detections[candidate.detection_index]);
            const bool emit =
                diagnostic.matched ||
                diagnostic.close_object_risk >= 0.05F ||
                diagnostic.score_margin <= options_.close_object_low_margin_threshold ||
                diagnostic.would_penalize ||
                diagnostic.would_hold_reacquire;
            if (!emit) {
                continue;
            }
            result->close_object_diagnostics.push_back(std::move(diagnostic));
            if (result->close_object_diagnostics.size() >= options_.max_close_object_diagnostics) {
                break;
            }
        }
    }

    for (std::size_t detection_index = 0; detection_index < result->detections.size(); ++detection_index) {
        if (matched_detections[detection_index]) {
            continue;
        }

        Detection detection = result->detections[detection_index];
        if (!ShouldTrackDetection(detection, options_)) {
            // whitelist 밖 객체는 detection overlay만 유지하고 trackId/trail 부하는 만들지 않는다.
            detection.track_id = 0;
            detection.association_confidence = 0.0F;
            result->detections[detection_index] = detection;
            continue;
        }
        detection.track_id = next_track_id_++;
        detection.association_confidence = 1.0F;
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

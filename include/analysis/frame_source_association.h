// 파일 용도: decoder 숫자 PTS 복원과 분리된 bounded 원본 관측 연관을 판정한다.
#pragma once

#include "analysis/analysis_types.h"
#include "media_types.h"
#include <algorithm>
#include <deque>
#include <limits>
#include <tuple>

namespace analysis {

struct FrameTimestampAssociation {
    std::int64_t decoder_pts{0};
    std::int64_t source_pts{0};
    std::optional<media::SampleObservation> observation;
    std::string track_id;
};

class TimestampAssociationHistory {
public:
    void Append(std::int64_t decoder_pts, std::int64_t source_pts, const media::Packet& packet) {
        mappings_.push_back({decoder_pts, source_pts, packet.observation, packet.track_id});
        if (mappings_.size() > 4096) {
            const auto value = mappings_.front().decoder_pts;
            if (!evicted_highwater_ || value > *evicted_highwater_) {
                evicted_highwater_ = value;
            }
            mappings_.pop_front();
        }
    }

    SourceAssociation Resolve(std::optional<std::int64_t> pts) const {
        if (!pts || *pts < 0 || mappings_.empty() ||
            (evicted_highwater_ && *pts <= *evicted_highwater_)) {
            return {};
        }
        const FrameTimestampAssociation* chosen = nullptr;
        bool invalid = false;
        bool exact = false;
        __int128 nearest = std::numeric_limits<std::int64_t>::max();
        for (const auto& entry : mappings_) {
            const __int128 delta = static_cast<__int128>(entry.decoder_pts) - *pts;
            nearest = std::min(nearest, delta < 0 ? -delta : delta);
            if (entry.decoder_pts != *pts) continue;
            exact = true;
            if (!Valid(entry)) {
                invalid = true;
                continue;
            }
            if (chosen && !Same(*chosen, entry)) {
                return {SourceAssociationQuality::Ambiguous, std::nullopt};
            }
            chosen = &entry;
        }
        if (chosen && invalid) return {SourceAssociationQuality::Ambiguous, std::nullopt};
        if (chosen) {
            const auto& observation = *chosen->observation;
            return {SourceAssociationQuality::TimestampMatch,
                    OriginalSampleIdentity{observation.source_generation, observation.generation_order,
                                           observation.ordinal, chosen->track_id, *observation.pts_ns}};
        }
        if (exact) return {};
        return nearest <= 500000000
            ? SourceAssociation{SourceAssociationQuality::Nearest, std::nullopt}
            : SourceAssociation{};
    }

    const std::deque<FrameTimestampAssociation>& mappings() const { return mappings_; }

    // 정확한 입력 연관의 원본 duration만 전달한다. 출력 프레임 고유성의 증명이 아니다.
    std::optional<std::uint64_t> ResolveDuration(std::optional<std::int64_t> pts) const {
        const auto association=Resolve(pts);
        if(association.quality!=SourceAssociationQuality::TimestampMatch||!association.original)return std::nullopt;
        for(const auto& entry:mappings_)if(entry.decoder_pts==*pts&&Valid(entry))return entry.observation->duration_ns;
        return std::nullopt;
    }

private:
    static bool Valid(const FrameTimestampAssociation& entry) {
        if (!entry.observation || entry.track_id.empty()) return false;
        const auto& observation = *entry.observation;
        return !observation.source_generation.empty() && observation.generation_order > 0 &&
               observation.ordinal > 0 && observation.pts_ns &&
               *observation.pts_ns <= static_cast<std::uint64_t>(std::numeric_limits<std::int64_t>::max());
    }

    static bool Same(const FrameTimestampAssociation& a, const FrameTimestampAssociation& b) {
        const auto& x = *a.observation;
        const auto& y = *b.observation;
        return a.source_pts == b.source_pts && a.track_id == b.track_id &&
               std::tie(x.source_generation, x.generation_order, x.ordinal, x.pts_ns, x.dts_ns,
                        x.duration_ns, x.clock_process_id, x.mono_before_ns, x.observed_utc_ns,
                        x.mono_after_ns, x.discont) ==
               std::tie(y.source_generation, y.generation_order, y.ordinal, y.pts_ns, y.dts_ns,
                        y.duration_ns, y.clock_process_id, y.mono_before_ns, y.observed_utc_ns,
                        y.mono_after_ns, y.discont);
    }

    std::deque<FrameTimestampAssociation> mappings_;
    std::optional<std::int64_t> evicted_highwater_;
};

} // namespace analysis

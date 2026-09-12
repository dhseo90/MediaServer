// 파일 용도: V2 writer의 원본 미디어 위치와 bounded UTC 대응을 보수적으로 축적한다.
#pragma once
#include "media_types.h"
#include "recording/recording_contracts.h"
#include <algorithm>
#include <limits>

namespace recording {
class RecordingWriterTimeState {
public:
    static bool Signed(const std::optional<std::uint64_t>& value) {
        return value && *value<=static_cast<std::uint64_t>(std::numeric_limits<std::int64_t>::max());
    }
    static bool ClockValid(const media::SampleObservation& o) {
        return !o.clock_process_id.empty() && o.mono_before_ns>=0 && o.mono_after_ns>=o.mono_before_ns &&
            static_cast<__int128>(o.mono_after_ns)-o.mono_before_ns<=5000000;
    }
    void Start(std::int64_t origin,const std::string& id) {
        origin_=origin;id_=id;maps_.clear();last_.reset();anchor_.reset();end_.reset();max_end_.reset();whole_unknown_=false;tail_=false;end_unknown_=false;
    }
    void Accept(const media::SampleObservation& o) {
        const auto pts=static_cast<std::int64_t>(*o.pts_ns);
        end_.reset();
        if(o.duration_ns && *o.duration_ns>0 &&
           static_cast<__int128>(pts)+*o.duration_ns<=std::numeric_limits<std::int64_t>::max())
            end_=pts+static_cast<std::int64_t>(*o.duration_ns);
        if(end_) {max_end_=std::max(max_end_.value_or(*end_),*end_);end_=max_end_;}
        else end_unknown_=true;
        if(last_ && pts<=static_cast<std::int64_t>(*last_->pts_ns))whole_unknown_=true;
        if(whole_unknown_) {
            maps_.clear();maps_.push_back(Unknown(origin_,"pts-reordering-or-duplicate"));
        } else if(!tail_) {
            const bool clock=ClockValid(o);
            if(maps_.empty()) {
                if(pts>origin_) {auto prefix=Unknown(origin_,"decode-preroll");prefix.end_pts=pts;maps_.push_back(prefix);}
                maps_.push_back(clock?Known(pts,o):Unknown(pts,"clock-unavailable"));anchor_=clock?std::optional<media::SampleObservation>(o):std::nullopt;
            } else {
                bool unknown=!clock;bool split=false;
                if(last_) {
                    if(!ClockValid(*last_) || last_->clock_process_id!=o.clock_process_id ||
                       o.mono_before_ns<last_->mono_after_ns)unknown=true;
                }
                if(anchor_ && clock && !unknown) {
                    const __int128 elapsed=Mid(o)-Mid(*anchor_);
                    const __int128 residual=static_cast<__int128>(o.observed_utc_ns)-anchor_->observed_utc_ns-elapsed;
                    const __int128 error=Half(o)+Half(*anchor_)+2000000;
                    split=Abs(residual)>50000000+error;
                    const __int128 media_elapsed=static_cast<__int128>(pts)-*anchor_->pts_ns;
                    if(Abs(media_elapsed-elapsed)>error) {
                        MakeUnknown(maps_.back(),"media-observation-divergence");unknown=true;
                    } else if(!split && maps_.back().provenance!="unknown") {
                        const __int128 uncertainty=Abs(static_cast<__int128>(o.observed_utc_ns)-anchor_->observed_utc_ns-media_elapsed)+error;
                        if(uncertainty>std::numeric_limits<std::int64_t>::max()) {
                            MakeUnknown(maps_.back(),"uncertainty-overflow");unknown=true;
                        } else maps_.back().uncertainty_ns=std::max(maps_.back().uncertainty_ns.value_or(0),static_cast<std::int64_t>(uncertainty));
                    }
                }
                split=split || unknown || maps_.back().provenance=="unknown";
                if(split && pts>maps_.back().start_pts) {
                    EndMap(maps_.back(),pts);
                    if(maps_.size()>=255) {maps_.push_back(Unknown(pts,"mapping-budget-exceeded"));tail_=true;}
                    else maps_.push_back(unknown?Unknown(pts,"clock-comparison-unavailable"):Known(pts,o));
                    anchor_=unknown?std::nullopt:std::optional<media::SampleObservation>(o);
                }
            }
        }
        last_=o;
    }
    void Finish(RecordingSegmentV2* segment) {
        if(end_unknown_)end_.reset();
        segment->media_start_pts=origin_;segment->media_end_pts=end_;segment->mappings=maps_;
        if(segment->mappings.empty())segment->mappings.push_back(Unknown(origin_,"no-accepted-observation"));
        auto& last=segment->mappings.back();
        if(end_ && *end_>last.start_pts)EndMap(last,*end_);
        else {
            segment->media_end_pts.reset();last.end_pts.reset();MakeUnknown(last,"end-duration-unavailable");
        }
    }
private:
    static __int128 Mid(const media::SampleObservation& o) {return (static_cast<__int128>(o.mono_before_ns)+o.mono_after_ns)/2;}
    static __int128 Half(const media::SampleObservation& o) {return (static_cast<__int128>(o.mono_after_ns)-o.mono_before_ns+1)/2;}
    static __int128 Abs(__int128 x) {return x<0?-x:x;}
    static void MakeUnknown(RecordingUtcMappingV1& m,const char* reason) {
        m.provenance="unknown";m.reason=reason;m.utc_start_ns.reset();m.utc_end_ns.reset();m.uncertainty_ns.reset();
    }
    static void EndMap(RecordingUtcMappingV1& m,std::int64_t end) {
        m.end_pts=end;
        if(m.provenance!="unknown") {
            const __int128 utc=static_cast<__int128>(*m.utc_start_ns)+end-m.start_pts;
            if(utc>std::numeric_limits<std::int64_t>::max() || utc<std::numeric_limits<std::int64_t>::min() || utc<=*m.utc_start_ns)
                MakeUnknown(m,"utc-end-overflow");
            else m.utc_end_ns=static_cast<std::int64_t>(utc);
        }
    }
    RecordingUtcMappingV1 Unknown(std::int64_t pts,const char* reason) const {
        RecordingUtcMappingV1 m;m.mapping_id=id_+"-m"+std::to_string(maps_.size());m.start_pts=pts;MakeUnknown(m,reason);return m;
    }
    RecordingUtcMappingV1 Known(std::int64_t pts,const media::SampleObservation& o) const {
        auto m=Unknown(pts,"server-clock-media-extrapolation");m.provenance="estimated";m.utc_start_ns=o.observed_utc_ns;
        m.uncertainty_ns=static_cast<std::int64_t>(Half(o))+1000000;return m;
    }
    std::int64_t origin_{0};std::string id_;std::vector<RecordingUtcMappingV1> maps_;
    std::optional<media::SampleObservation> last_,anchor_;std::optional<std::int64_t> end_,max_end_;
    bool whole_unknown_{false},tail_{false},end_unknown_{false};
};
}  // namespace recording

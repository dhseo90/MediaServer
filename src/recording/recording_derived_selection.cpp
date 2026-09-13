// 파일 용도: 실제 방출 frame의 직접 시간 대응만 원본 구간 후보로 선택한다.
#include "recording/recording_derived_selection.h"
#include <algorithm>
#include <limits>
#include <set>
#include <tuple>

namespace {
bool Int64(__int128 value,std::int64_t* out) {
    if(value<std::numeric_limits<std::int64_t>::min()||value>std::numeric_limits<std::int64_t>::max())return false;
    *out=static_cast<std::int64_t>(value);return true;
}
bool Direct(const analysis::DecodedIntervalEvidence& f,std::int64_t* end) {
    if(f.association.quality!=analysis::SourceAssociationQuality::TimestampMatch||!f.association.original||
       !f.duration_ns||*f.duration_ns==0||f.analysis_pts_ns<0)return false;
    const auto& o=*f.association.original;
    return !o.source_generation.empty()&&o.generation_order>0&&o.ordinal>0&&!o.track_id.empty()&&
        static_cast<std::uint64_t>(f.analysis_pts_ns)==o.pts_ns&&
        Int64(static_cast<__int128>(f.analysis_pts_ns)+*f.duration_ns,end);
}
}
namespace analysis {
void DecodedIntervalCollector::BeginNamespace(std::uint64_t minimum_sequence) {
    while(!frames_.empty()&&frames_.front().decoded_sequence<minimum_sequence)frames_.pop_front();
    if(discarded_sequence_<minimum_sequence) {
        incomplete_=false;discarded_end_ns_.reset();discarded_sequence_=0;
    } else {
        // 새 namespace의 자료도 reset 처리 전에 이미 소실됐으면 복원을 발명하지 않는다.
        incomplete_=true;discarded_end_ns_=std::numeric_limits<std::int64_t>::max();
    }
}
void DecodedIntervalCollector::Append(DecodedIntervalEvidence value) {
    value.decoded_sequence=++next_sequence_;
    std::int64_t end=0;value.direct=Direct(value,&end);
    value.reason=value.direct?"direct-observed-time-interval":"unconfirmed-decoder-time-or-duration";
    frames_.push_back(std::move(value));
    if(frames_.size()>4096) {
        incomplete_=true;
        discarded_sequence_=frames_.front().decoded_sequence;
        if(!Direct(frames_.front(),&end))end=std::numeric_limits<std::int64_t>::max();
        discarded_end_ns_=std::max(discarded_end_ns_.value_or(end),end);frames_.pop_front();
    }
}
std::shared_ptr<const DecodedIntervalSnapshot> DecodedIntervalCollector::Snapshot(const std::string& name,std::uint64_t minimum_sequence,std::uint64_t maximum_sequence) const {
    auto out=std::make_shared<DecodedIntervalSnapshot>();out->analysis_namespace=name;
    out->minimum_sequence=minimum_sequence;out->maximum_sequence=maximum_sequence;
    for(const auto& f:frames_)if(f.decoded_sequence>=minimum_sequence&&f.decoded_sequence<=maximum_sequence)out->frames.push_back(f);
    out->incomplete=incomplete_&&discarded_sequence_>=minimum_sequence;
    out->incomplete_reason=out->incomplete?"decoded-interval-cap":"";
    if(out->incomplete)out->discarded_end_ns=discarded_end_ns_;return out;
}
}
namespace recording {
namespace {
bool ToMedia(std::int64_t ns,const RecordingSegmentV2& s,std::int64_t* out) {
    if(s.time_base_num<=0||s.time_base_den<=0)return false;
    const __int128 n=static_cast<__int128>(ns)*s.time_base_den;
    const __int128 d=static_cast<__int128>(1000000000)*s.time_base_num;
    return n%d==0&&Int64(n/d,out);
}
bool SameGeneration(const analysis::OriginalSampleIdentity& a,const RecordingConsumerOriginalV1& b) {
    return a.source_generation==b.source_generation&&a.generation_order==b.generation_order&&a.track_id==b.track_id;
}
bool SourceValid(const DerivedSourceEvidence& s,const RecordingConsumerReferenceV1& r) {
    return s.available_for_selection&&s.segment.source_id==r.source_id&&s.segment.channel_id==r.channel_id&&ValidateRecordingSegmentV2(s.segment,nullptr);
}
bool Bound(const DerivedSourceEvidence& source,const analysis::OriginalSampleIdentity& o) {
    if(!source.binding)return false;const auto& b=*source.binding;
    if(b.source_generation!=o.source_generation||b.generation_order!=o.generation_order||b.track_id!=o.track_id)return false;
    const auto it=std::lower_bound(b.samples.begin(),b.samples.end(),o.ordinal,[](const auto& s,std::uint64_t ordinal){return s.ordinal<ordinal;});
    return it!=b.samples.end()&&it->ordinal==o.ordinal&&it->pts_ns==o.pts_ns;
}
void Boundary(std::vector<std::int64_t>& values,std::int64_t p,std::int64_t start,std::int64_t end) {
    if(p>start&&p<end)values.push_back(p);
}
void Sort(std::vector<std::int64_t>& values) {
    std::sort(values.begin(),values.end());values.erase(std::unique(values.begin(),values.end()),values.end());
}
DerivedSelectionCandidate Candidate(const DerivedSourceEvidence& source,std::int64_t a,std::int64_t b,
                                    const analysis::OriginalSampleIdentity* o=nullptr) {
    DerivedSelectionCandidate c;c.segment=source.segment;c.media_start_pts=a;c.media_end_pts=b;
    if(o)c.original=RecordingConsumerOriginalV1{o->source_generation,o->generation_order,o->ordinal,o->track_id,o->pts_ns};return c;
}
bool Media(const RecordingConsumerReferenceV1& r,const analysis::DecodedIntervalSnapshot& evidence,
           const std::vector<DerivedSourceEvidence>& sources,DerivedRecordingSelection& out) {
    std::vector<std::int64_t> boundaries{out.expanded_start_ns,out.expanded_end_ns};
    std::vector<bool> valid;
    for(const auto& s:sources)valid.push_back(SourceValid(s,r)&&s.binding&&ValidateRecordingSourceBindingForSegment(*s.binding,s.segment,nullptr));
    bool invalid_relevant_source=false;
    for(std::size_t i=0;i<sources.size();++i)if(sources[i].segment.source_id==r.source_id&&sources[i].segment.channel_id==r.channel_id&&!valid[i])invalid_relevant_source=true;
    for(const auto& f:evidence.frames) {std::int64_t end=0;if(Direct(f,&end)) {
        Boundary(boundaries,f.analysis_pts_ns,out.expanded_start_ns,out.expanded_end_ns);
        Boundary(boundaries,end,out.expanded_start_ns,out.expanded_end_ns);
    }}
    if(evidence.discarded_end_ns)Boundary(boundaries,*evidence.discarded_end_ns,out.expanded_start_ns,out.expanded_end_ns);
    Sort(boundaries);std::size_t work=0,candidate_count=0;
    for(std::size_t i=1;i<boundaries.size();++i) {
        DerivedSelectionSlice slice;slice.start_ns=boundaries[i-1];slice.end_ns=boundaries[i];
        bool unknown=invalid_relevant_source||evidence.analysis_namespace!=r.analysis_namespace||!r.original||r.association_quality!="timestamp-match";
        if(evidence.incomplete&&(!evidence.discarded_end_ns||slice.start_ns<*evidence.discarded_end_ns))unknown=true;
        bool direct=false,deleted=false;
        std::set<std::tuple<std::string,std::uint64_t,std::uint64_t,std::string>> identities;
        for(const auto& f:evidence.frames) {
            if(++work>2000000)return false;
            std::int64_t end=0;
            if(!Direct(f,&end)) {
                if(f.analysis_pts_ns>=slice.start_ns&&f.analysis_pts_ns<slice.end_ns)unknown=true;
                continue;
            }
            if(f.analysis_pts_ns>slice.start_ns||end<slice.end_ns)continue;
            if(!r.original||!SameGeneration(*f.association.original,*r.original)){unknown=true;continue;}
            direct=true;const auto& o=*f.association.original;
            const auto key=std::make_tuple(o.source_generation,o.generation_order,o.ordinal,o.track_id);
            if(!identities.insert(key).second)unknown=true;
            bool found=false;
            for(std::size_t si=0;si<sources.size();++si) {
                if(++work>2000000)return false;
                const auto& source=sources[si];if(!valid[si]||!Bound(source,o))continue;
                found=true;if(source.deleted){deleted=true;continue;}
                std::int64_t a=0,b=0;
                if(!ToMedia(slice.start_ns,source.segment,&a)||!ToMedia(slice.end_ns,source.segment,&b)||
                   !source.segment.media_end_pts||a<source.segment.media_start_pts||b>*source.segment.media_end_pts) {unknown=true;continue;}
                // media coverage와 UTC mapping 품질은 서로 다른 축이다.
                if(++candidate_count>4096)return false;
                slice.candidates.push_back(Candidate(source,a,b,&o));
            }
            if(!found)unknown=true;
        }
        if(slice.candidates.size()>1||identities.size()>1) {slice.state=DerivedSliceState::Ambiguous;slice.reason="multiple-time-or-recording-candidates";}
        else if(unknown||!direct) {slice.state=DerivedSliceState::Unknown;slice.reason="unconfirmed-interval-no-trusted-watermark";}
        else if(deleted) {slice.state=DerivedSliceState::Deleted;slice.reason="original-deleted";}
        else if(slice.candidates.empty()) {slice.state=DerivedSliceState::Unknown;slice.reason="original-coverage-unconfirmed";}
        else {slice.state=DerivedSliceState::Confirmed;slice.reason="direct-time-interval-only";}
        out.slices.push_back(std::move(slice));
    }
    return true;
}
bool Utc(const RecordingConsumerReferenceV1& r,const std::vector<DerivedSourceEvidence>& sources,
         const RecordingRangeResult* range,DerivedRecordingSelection& out) {
    std::vector<std::int64_t> boundaries{out.expanded_start_ns,out.expanded_end_ns};
    if(range) {out.unplaced=range->unplaced;for(const auto& s:range->slices) {
        Boundary(boundaries,s.start,out.expanded_start_ns,out.expanded_end_ns);Boundary(boundaries,s.end,out.expanded_start_ns,out.expanded_end_ns);
    }}
    Sort(boundaries);std::size_t work=0,candidate_count=0;
    for(std::size_t i=1;i<boundaries.size();++i) {
        DerivedSelectionSlice slice;slice.start_ns=boundaries[i-1];slice.end_ns=boundaries[i];
        bool unknown=!range,deleted=range&&range->deleted,located=false;
        if(range)for(const auto& s:range->slices) {
            if(++work>2000000)return false;
            if(s.start>slice.start_ns||s.end<slice.end_ns)continue;
            located=true;unknown|=s.coverage!=RecordingRangeCoverage::Confirmed;
            for(const auto& c:s.candidates) {
                if(++work>2000000||++candidate_count>4096)return false;
                const auto source=std::find_if(sources.begin(),sources.end(),[&](const auto& x){return x.segment.segment_id==c.segment_id&&
                    x.segment.store_id==c.store_id&&x.segment.media_epoch_id==c.media_epoch_id&&x.segment.order_sequence==c.order_sequence;});
                if(source==sources.end()||!SourceValid(*source,r)||!c.media_start_pts||!c.media_end_pts||
                   c.mapping.provenance=="unknown"||!c.mapping.utc_start_ns||!c.mapping.utc_end_ns||!c.mapping.end_pts||
                   c.time_base_num!=source->segment.time_base_num||c.time_base_den!=source->segment.time_base_den) {unknown=true;continue;}
                if(source->deleted){deleted=true;continue;}
                const auto found=std::find_if(source->segment.mappings.begin(),source->segment.mappings.end(),[&](const auto& m){return
                    m.mapping_id==c.mapping.mapping_id&&m.start_pts==c.mapping.start_pts&&m.end_pts==c.mapping.end_pts&&
                    m.utc_start_ns==c.mapping.utc_start_ns&&m.utc_end_ns==c.mapping.utc_end_ns&&m.provenance==c.mapping.provenance&&
                    m.uncertainty_ns==c.mapping.uncertainty_ns&&m.reason==c.mapping.reason;});
                if(found==source->segment.mappings.end()||s.start!=slice.start_ns||s.end!=slice.end_ns||
                   *c.media_start_pts<c.mapping.start_pts||*c.media_end_pts>*c.mapping.end_pts||*c.media_start_pts>=*c.media_end_pts) {unknown=true;continue;}
                auto candidate=Candidate(*source,*c.media_start_pts,*c.media_end_pts);candidate.utc_mapping=c.mapping;slice.candidates.push_back(std::move(candidate));
            }
        }
        if(slice.candidates.size()>1){slice.state=DerivedSliceState::Ambiguous;slice.reason="multiple-utc-candidates";}
        else if(unknown||!located||!out.unplaced.empty()){slice.state=DerivedSliceState::Unknown;slice.reason="unconfirmed-utc-mapping";}
        else if(deleted){slice.state=DerivedSliceState::Deleted;slice.reason="original-deleted";}
        else if(slice.candidates.size()==1){slice.state=DerivedSliceState::Confirmed;slice.reason="piecewise-utc-time-only";}
        else {slice.state=DerivedSliceState::Unknown;slice.reason="missing-original-identity";}
        out.slices.push_back(std::move(slice));
    }
    return true;
}
}
bool SelectDerivedRecording(const RecordingConsumerReferenceV1& reference,
    const analysis::DecodedIntervalSnapshot& evidence,const std::vector<DerivedSourceEvidence>& sources,
    const RecordingRangeResult* utc_range,DerivedRecordingSelection* output,std::string* error) {
    if(output)*output={};const auto fail=[&](const char* message){if(error)*error=message;return false;};
    if(!output||!ValidateRecordingConsumerReferenceV1(reference,error)||!reference.request)return fail("invalid-derived-request");
    if(evidence.frames.size()>4096||sources.size()>256||(utc_range&&(utc_range->slices.size()>4096||utc_range->unplaced.size()>4096)))
        return fail("derived-selection-input-cap");
    DerivedRecordingSelection out;out.reference=reference;const auto& r=*reference.request;
    if(!Int64((static_cast<__int128>(r.start_ms)-r.pre_ms)*1000000,&out.expanded_start_ns)||
       !Int64((static_cast<__int128>(r.end_ms)+r.post_ms)*1000000,&out.expanded_end_ns)||out.expanded_start_ns>=out.expanded_end_ns)
        return fail("derived-request-range-overflow-or-empty");
    const bool ok=r.time_basis=="utc-ms"?Utc(reference,sources,utc_range,out):Media(reference,evidence,sources,out);
    if(!ok)return fail("derived-selection-work-or-output-cap");
    out.complete=!out.slices.empty()&&out.unplaced.empty()&&std::all_of(out.slices.begin(),out.slices.end(),[](const auto& s){return s.state==DerivedSliceState::Confirmed;});
    out.reason=out.complete?"time-selection-only-not-playability":"interval-evidence-incomplete";
    *output=std::move(out);if(error)error->clear();return true;
}
} // namespace recording

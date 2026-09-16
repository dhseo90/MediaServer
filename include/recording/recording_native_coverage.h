#pragma once
// 새 내부 profile의 remux/Ready 공통 판정. 표시용 정수 범위는 coverage 근거가 아니다.
#include "recording/recording_derived_selection.h"
#include "recording/recording_derived_provenance.h"
#include <map>
#include <set>
namespace recording {
inline bool NativeTickFloor(std::int64_t tick,std::uint32_t scale,std::int64_t* out) {
    if(!out||tick<0||!scale)return false;const __int128 n=static_cast<__int128>(tick)*1000000000/scale;
    if(n>std::numeric_limits<std::int64_t>::max())return false;*out=static_cast<std::int64_t>(n);return true;
}
inline bool NativeAuInterval(const RecordingFileEvidenceV1& proof,const RecordingFileSampleEvidenceV1& sample,
                             const DerivedRemuxAu& au,PresentationInterval* interval) {
    std::int64_t pts=0,dts=0;
    return au.ordinal==sample.ordinal&&au.original_pts_ns==sample.original_pts_ns&&
        au.source_vcl_sha256==sample.vcl_sha256&&au.source_vcl_sha256==au.output_vcl_sha256&&
        NativeTickFloor(sample.native_pts,proof.timescale,&pts)&&pts==au.file_pts_ns&&
        NativeTickFloor(sample.native_dts,proof.timescale,&dts)&&au.file_dts_ns&&*au.file_dts_ns==dts&&
        MakePresentationInterval(proof.writer_origin_ns,proof.timescale,sample.native_pts,sample.native_duration,interval);
}
struct NativeCoverageResult {
    std::int64_t start{0},end{0};bool satisfied{false};std::vector<DerivedRemuxUnfulfilled> missing;
    std::vector<PresentationInterval> actual;
};
inline bool EvaluateNativeOutputCoverage(const DerivedRecordingSelection& selection,
    const RecordingSegmentV2& source,const RecordingSourceBindingV1& binding,
    const DerivedRemuxOutput& output,NativeCoverageResult* result) {
    if(result)*result={};
    if(!result||!selection.native_file_intervals||!binding.file_evidence||output.access_units.empty()||output.access_units.size()>4096)return false;
    const auto& proof=*binding.file_evidence;
    std::map<std::uint64_t,const RecordingFileSampleEvidenceV1*> samples;
    for(const auto& sample:proof.samples)if(!samples.emplace(sample.ordinal,&sample).second)return false;
    std::vector<PresentationInterval> actual;std::set<std::uint64_t> observed;
    for(const auto& au:output.access_units) {
        const auto found=samples.find(au.ordinal);PresentationInterval interval;
        if(found==samples.end()||!observed.insert(au.ordinal).second||!NativeAuInterval(proof,*found->second,au,&interval))return false;
        actual.push_back(interval);
    }
    std::vector<PresentationInterval> merged;if(!MergePresentationIntervals(actual,&merged)||merged.empty())return false;
    if(!PresentationEnvelope({merged.front().start,merged.back().end},&result->start,&result->end))return false;
    result->actual=merged;
    bool requested=false;std::vector<PresentationInterval> requested_ranges;
    for(const auto& slice:selection.slices)if(slice.state==DerivedSliceState::Confirmed) {
        if(slice.candidates.size()!=1||!slice.presentation)return false;
        const auto& c=slice.candidates.front();if(c.segment.segment_id!=source.segment_id)continue;
        requested=true;
        if(!c.original||!observed.count(c.original->ordinal)||c.original->source_generation!=binding.source_generation||c.original->generation_order!=binding.generation_order||c.original->track_id!=binding.track_id)return false;
        const auto found=samples.find(c.original->ordinal);PresentationInterval original;
        if(found==samples.end()||found->second->original_pts_ns<0||static_cast<std::uint64_t>(found->second->original_pts_ns)!=c.original->pts_ns||
           !MakePresentationInterval(proof.writer_origin_ns,proof.timescale,found->second->native_pts,found->second->native_duration,&original)||
           ComparePresentationTime(original.start,slice.presentation->start)>0||ComparePresentationTime(original.end,slice.presentation->end)<0)return false;
        requested_ranges.push_back(*slice.presentation);
    }
    std::vector<PresentationInterval> requests;
    if(!MergePresentationIntervals(std::move(requested_ranges),&requests))return false;
    // actual union은 한 번만 만든다. 각 slice마다 같은 AU 정렬/복제를 반복하지 않는다.
    std::size_t first=0;
    for(const auto& range:requests) {
        auto cursor=range.start;std::vector<PresentationInterval> missing;
        while(first<merged.size()&&ComparePresentationTime(merged[first].end,cursor)<=0)++first;
        for(auto index=first;index<merged.size()&&ComparePresentationTime(merged[index].start,range.end)<0;++index) {
            const auto& v=merged[index];
            if(ComparePresentationTime(v.start,cursor)>0)missing.push_back({cursor,v.start});
            cursor=ComparePresentationTime(v.end,range.end)<0?v.end:range.end;
            if(ComparePresentationTime(cursor,range.end)==0)break;
        }
        if(ComparePresentationTime(cursor,range.end)<0)missing.push_back({cursor,range.end});
        for(const auto& gap:missing){std::int64_t a=0,b=0;if(!PresentationEnvelope(gap,&a,&b)||result->missing.size()>=4096)return false;
            result->missing.push_back({source.segment_id,"original-pts-ns","native-file-interval-uncovered",a,b});}
    }
    result->satisfied=requested&&result->missing.empty();return requested;
}
}

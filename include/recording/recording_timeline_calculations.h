// 파일 용도: catalog 투영과 read-service가 함께 쓰는 순수 timeline 계산과 동일 상한.
#pragma once
#include "recording/recording_timeline.h"
#include <algorithm>
#include <utility>
namespace recording::detail::timeline {
using Interval=std::pair<std::int64_t,std::int64_t>;
constexpr std::size_t kBytes=64*1024*1024;
inline std::vector<Interval> Union(std::vector<Interval> values){
    std::sort(values.begin(),values.end());std::vector<Interval> result;
    for(const auto& value:values){if(value.first>=value.second)continue;
        if(!result.empty()&&value.first<=result.back().second)result.back().second=std::max(result.back().second,value.second);
        else result.push_back(value);}
    return result;
}
inline std::size_t Bytes(const RecordingTimelineItem& v){
    std::size_t size=sizeof(v)+256;
    for(const auto* s:{&v.segment_id,&v.channel_id,&v.kind,&v.event_id,&v.completeness,&v.playback_url,&v.content_type,
        &v.range_basis,&v.item_id,&v.reference_id,&v.job_id,&v.job_state,&v.catalog_state,&v.unavailable_reason,
        &v.mapping_provenance,&v.mapping_id,&v.media_axis})size+=s->size();
    if(v.request)size+=sizeof(*v.request)+v.request->time_basis.size();
    for(const auto& c:v.coverage)size+=sizeof(c)+c.source_id.size()+c.store_id.size()+c.epoch_id.size()+c.segment_id.size();
    for(const auto& m:v.members)size+=sizeof(m)+m.item_id.size()+m.mapping_id.size()+m.mapping_provenance.size()+m.reason.size()+
        m.unavailable_reason.size()+m.media_axis.size()+m.source_segment_id.size();
    // vector/string의 여유 capacity까지 보수적으로 계상하는 논리 workspace 예산이다.
    return size*2;
}
} // namespace recording::detail::timeline

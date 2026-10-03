// 파일 용도: 부분 이벤트 coverage를 분할하고 미포함 구간은 원본으로 유지한다.
#include "recording/recording_search_precedence.h"
#include <algorithm>
#include <stdexcept>
#include <tuple>
namespace recording {
namespace {
bool Fail(std::string* error,const char* reason){if(error)*error=reason;return false;}
bool Valid(const ConfirmedMediaInterval& i){return i.start_pts<i.end_pts&&i.time_base_num>0&&i.time_base_den>0&&!i.segment_id.empty();}
bool Proven(const ConfirmedMediaInterval& i){return !i.source_id.empty()&&!i.store_id.empty()&&!i.media_epoch_id.empty();}
bool Same(const ConfirmedMediaInterval& a,const ConfirmedMediaInterval& b){
    return Proven(a)&&Proven(b)&&std::tie(a.source_id,a.store_id,a.media_epoch_id,a.segment_id,a.time_base_num,a.time_base_den)==
        std::tie(b.source_id,b.store_id,b.media_epoch_id,b.segment_id,b.time_base_num,b.time_base_den);
}
}
bool SelectSearchPlayback(const ConfirmedMediaInterval& original,
    const std::vector<SearchPlaybackCandidate>& candidates,std::vector<SearchPlaybackSlice>* output,std::string* error){
    if(!output||!Valid(original))return Fail(error,"search-invalid-original-interval");
    if(candidates.size()>4096)return Fail(error,"search-playback-candidate-capacity");
    try {
        std::vector<const SearchPlaybackCandidate*> eligible;
        std::vector<std::int64_t> boundaries{original.start_pts,original.end_pts};
        for(const auto& c:candidates){
            if(!Valid(c.original))return Fail(error,"search-invalid-event-interval");
            if(!c.playable||!c.provenance_verified||c.event_id.empty()||c.output_segment_id.empty()||
                !Same(original,c.original))continue;
            const auto start=std::max(original.start_pts,c.original.start_pts),end=std::min(original.end_pts,c.original.end_pts);
            if(start>=end)continue;
            eligible.push_back(&c);boundaries.push_back(start);boundaries.push_back(end);
        }
        std::sort(eligible.begin(),eligible.end(),[](const auto* a,const auto* b){
            return std::tie(a->event_id,a->output_segment_id)<std::tie(b->event_id,b->output_segment_id);
        });
        std::sort(boundaries.begin(),boundaries.end());boundaries.erase(std::unique(boundaries.begin(),boundaries.end()),boundaries.end());
        std::vector<SearchPlaybackSlice> result;
        for(std::size_t i=1;i<boundaries.size();++i){
            SearchPlaybackSlice slice{original,original.segment_id,{}};
            slice.original.start_pts=boundaries[i-1];slice.original.end_pts=boundaries[i];
            for(const auto* c:eligible)if(c->original.start_pts<=slice.original.start_pts&&c->original.end_pts>=slice.original.end_pts){
                slice.playback_segment_id=c->output_segment_id;slice.event_id=c->event_id;slice.job_id=c->job_id;break;
            }
            if(!result.empty()&&result.back().playback_segment_id==slice.playback_segment_id&&result.back().event_id==slice.event_id&&result.back().job_id==slice.job_id)
                result.back().original.end_pts=slice.original.end_pts;
            else result.push_back(std::move(slice));
        }
        *output=std::move(result);if(error)error->clear();return true;
    }catch(const std::bad_alloc&){return Fail(error,"search-playback-candidate-capacity");}
     catch(const std::length_error&){return Fail(error,"search-playback-candidate-capacity");}
}
} // namespace recording

// 파일 용도: file evidence 기반 주기 sample 선택과 현재 원본에서의 실제 임베딩.
#include "recording/recording_visual_source.h"
#include "recording/visual_frame_decoder.h"
#include <algorithm>
#include <cmath>
#include <limits>
#include <set>
#include <tuple>
namespace recording {
namespace {
bool Fail(std::string* error,const char* reason){if(error)*error=reason;return false;}
std::optional<std::int64_t> Utc(const RecordingSegmentV2& segment,std::int64_t ns){
    std::optional<std::int64_t> result;
    unsigned matches=0;
    for(const auto& m:segment.mappings){
        if(!m.end_pts)continue;
        const __int128 tick=static_cast<__int128>(ns)*segment.time_base_den;
        const __int128 start=static_cast<__int128>(m.start_pts)*segment.time_base_num*1000000000;
        const __int128 end=static_cast<__int128>(*m.end_pts)*segment.time_base_num*1000000000;
        if(tick<start||tick>=end)continue;
        ++matches;
        if(m.provenance=="unknown"||!m.utc_start_ns||!m.utc_end_ns||(tick-start)%segment.time_base_den)continue;
        const auto value=static_cast<__int128>(*m.utc_start_ns)+(tick-start)/segment.time_base_den;
        if(value<0||value<*m.utc_start_ns||value>=*m.utc_end_ns||value>=std::numeric_limits<std::int64_t>::max())continue;
        result=static_cast<std::int64_t>(value);
    }
    return matches==1?result:std::nullopt;
}
}
std::optional<std::int64_t> RecordingVisualSource::SampleUtc(const RecordingSegmentV2& segment,std::int64_t ns){return Utc(segment,ns);}
bool RecordingVisualSource::SelectSamples(const RecordingSegmentV2& segment,const RecordingSourceBindingV1& binding,
    unsigned period,std::vector<VisualSearchDocument>* output,std::string* error,std::optional<std::int64_t> previous){
    if(!output||period<1||period>3600)return Fail(error,"visual-invalid-sample-period");
    if(segment.container!="mp4"||segment.video_codecs!=std::vector<std::string>{"h264"}||
        segment.size_bytes>512ULL*1024*1024||!binding.file_evidence||
        !ValidateRecordingSourceBindingForSegment(binding,segment,error))return Fail(error,"visual-unsupported-source");
    const auto& evidence=*binding.file_evidence;
    std::vector<const RecordingFileSampleEvidenceV1*> ordered;
    for(const auto& sample:evidence.samples)if(sample.original_pts_ns>=0&&sample.native_pts>=evidence.edit_media_time)ordered.push_back(&sample);
    std::sort(ordered.begin(),ordered.end(),[](const auto* a,const auto* b){return a->original_pts_ns<b->original_pts_ns;});
    for(std::size_t i=1;i<ordered.size();++i)if(ordered[i-1]->original_pts_ns==ordered[i]->original_pts_ns)return Fail(error,"visual-ambiguous-source-frame");
    std::vector<VisualSearchDocument> docs;
    if(ordered.empty())return Fail(error,"visual-unsupported-source");
    for(const auto* sample:ordered){
        if(previous&&static_cast<__int128>(sample->original_pts_ns)-*previous<static_cast<__int128>(period)*1000000000)continue;
        if(docs.size()>=20000)return Fail(error,"visual-index-capacity");
        VisualSearchDocument doc;
        doc.id="frame:"+std::to_string(segment.segment_id.size())+":"+segment.segment_id+":"+std::to_string(sample->original_pts_ns);
        doc.channel_id=segment.channel_id;doc.segment_id=segment.segment_id;doc.media_sha256=segment.checksum_sha256;
        // frame_sha256은 저장된 압축 AU의 hash다. RGB hash나 frame 고유성 주장으로 바꾸지 않는다.
        doc.frame_sha256=sample->sample_sha256;doc.media_pts=sample->original_pts_ns;
        doc.utc_ns=Utc(segment,doc.media_pts);docs.push_back(std::move(doc));previous=sample->original_pts_ns;
    }
    *output=std::move(docs);if(error)error->clear();return true;
}
bool RecordingVisualSource::Collect(const std::vector<std::string>& channels,unsigned period,
    std::vector<VisualSearchDocument>* output,std::map<std::string,VisualSourceCoverage>* coverage,
    std::string* error,const std::function<bool()>& cancelled)const{
    if(!output||!coverage||channels.empty()||channels.size()>8||period<1||period>3600)return Fail(error,"visual-invalid-source-scope");
    std::set<std::string> allowed(channels.begin(),channels.end());
    for(const auto& c:allowed)if(!ValidateRecordingReferenceId(c,nullptr))return Fail(error,"visual-invalid-source-scope");
    RecordingCatalogStatusSnapshot status;if(!catalog_.SnapshotStatus(&status,error))return false;
    std::map<std::string,VisualSourceCoverage> counts;for(const auto& c:allowed)counts[c]={};
    std::vector<VisualSearchDocument> docs;
    using Key=std::tuple<std::string,std::string,std::int64_t,std::string>;
    std::vector<Key> ordered;
    for(const auto& id:catalog_.FinalizedSegmentIdsForStartup()){
        if(cancelled&&cancelled())return Fail(error,"visual-cancelled");
        const auto segment=catalog_.FindSegmentV2ById(id);
        if(!segment){const auto legacy=catalog_.FindSegmentById(id);if(legacy&&allowed.count(legacy->channel_id)){
            ++counts[legacy->channel_id].examined_segments;++counts[legacy->channel_id].unsupported_segments;}continue;}
        if(!allowed.count(segment->channel_id))continue;
        if(ordered.size()>=100000)return Fail(error,"visual-index-capacity");
        ordered.emplace_back(segment->channel_id,segment->media_epoch_id,segment->media_start_pts,id);
    }
    std::sort(ordered.begin(),ordered.end());
    std::map<std::pair<std::string,std::string>,std::int64_t> last;
    for(const auto& key:ordered){
        if(cancelled&&cancelled())return Fail(error,"visual-cancelled");
        const auto& id=std::get<3>(key);const auto segment=catalog_.FindSegmentV2ById(id);
        if(!segment||segment->channel_id!=std::get<0>(key)||segment->media_epoch_id!=std::get<1>(key))return Fail(error,"visual-source-changed");
        auto& count=counts[segment->channel_id];++count.examined_segments;
        if(catalog_.SegmentLifecycleV2(id)!=RecordingLifecycle::Finalized)continue;
        const auto binding=catalog_.FindSourceBinding(id);std::vector<VisualSearchDocument> rows;std::string reason;
        const auto epoch=std::make_pair(segment->channel_id,segment->media_epoch_id);
        const auto previous=last.find(epoch);
        if(!binding||!SelectSamples(*segment,*binding,period,&rows,&reason,previous==last.end()?std::nullopt:std::optional<std::int64_t>(previous->second))){
            if(reason=="visual-index-capacity")return Fail(error,"visual-index-capacity");++count.unsupported_segments;continue;}
        if(rows.size()>20000-docs.size())return Fail(error,"visual-index-capacity");
        if(!rows.empty())last[epoch]=rows.back().media_pts;
        count.representative_frames+=rows.size();
        for(auto& row:rows)docs.push_back(std::move(row));
    }
    if(!catalog_.ValidateStatusSnapshot(status))return Fail(error,"visual-source-changed");
    *output=std::move(docs);*coverage=std::move(counts);if(error)error->clear();return true;
}
bool RecordingVisualSource::Resolve(const VisualSearchDocument& doc,SearchSeekTarget* seek,
    std::unique_ptr<ResolvedRecordingMedia>* output,std::string* error,const std::function<bool()>& cancelled,
    std::chrono::steady_clock::time_point deadline)const{
    const auto expired=[&]{return std::chrono::steady_clock::now()>=deadline||(cancelled&&cancelled());};
    if(expired())return Fail(error,"visual-cancelled");
    if(!seek||!output||doc.time_base_num!=1||doc.time_base_den!=1000000000)return Fail(error,"visual-invalid-frame-reference");
    if(!CurrentDocument(doc,error))return false;
    MediaInspectionOptions options;options.deadline=deadline;options.cancelled=cancelled;
    auto media=reader_.ResolveMedia(doc.channel_id,doc.segment_id,std::move(options));if(!media)return Fail(error,expired()?"visual-cancelled":"visual-source-unavailable");
    SearchSeekTarget target;RecordingSearchReader search(catalog_,reader_);
    if(!search.SourceSeek(doc.channel_id,doc.segment_id,doc.media_pts,1,1000000000,&target,error,media.get(),cancelled,deadline))return false;
    if(expired())return Fail(error,"visual-cancelled");
    *seek=std::move(target);*output=std::move(media);if(error)error->clear();return true;
}
bool RecordingVisualSource::CurrentDocument(const VisualSearchDocument& doc,std::string* error) const {
    if(!doc.event_id.empty()){
        VisualSearchDocument current;
        if(!SnapshotDocument(doc.event_id,doc.channel_id,&current,error)||current.id!=doc.id||current.segment_id!=doc.segment_id||
            current.media_sha256!=doc.media_sha256||current.frame_sha256!=doc.frame_sha256||current.media_pts!=doc.media_pts)
            return Fail(error,"visual-snapshot-changed");
    }
    const auto segment=catalog_.FindSegmentV2ById(doc.segment_id);
    if(!segment||segment->channel_id!=doc.channel_id||segment->checksum_sha256!=doc.media_sha256)return Fail(error,"visual-source-unavailable");
    const auto binding=catalog_.FindSourceBinding(doc.segment_id);
    if(!binding||!binding->file_evidence)return Fail(error,"visual-source-unavailable");
    unsigned found=0;
    for(const auto& sample:binding->file_evidence->samples)if(sample.original_pts_ns==doc.media_pts&&sample.sample_sha256==doc.frame_sha256)++found;
    if(found!=1)return Fail(error,"visual-source-unavailable");
    return true;
}
std::unique_ptr<RecordingVisualSource::PreparedSource> RecordingVisualSource::Prepare(const VisualSearchDocument& doc,
    std::string* error,const std::function<bool()>& cancelled,std::chrono::steady_clock::time_point deadline) const {
    RecordingSearchReader search(catalog_,reader_);return search.PrepareSource(doc.channel_id,doc.segment_id,error,cancelled,deadline);
}
bool RecordingVisualSource::ResolvePrepared(const VisualSearchDocument& doc,const PreparedSource& prepared,
    SearchSeekTarget* seek,std::string* error,const std::function<bool()>& cancelled,std::chrono::steady_clock::time_point deadline) const {
    if(std::chrono::steady_clock::now()>=deadline||(cancelled&&cancelled()))return Fail(error,"visual-cancelled");
    if(!seek||doc.time_base_num!=1||doc.time_base_den!=1000000000||!prepared.Matches(doc.channel_id,doc.segment_id,doc.media_sha256))
        return Fail(error,"visual-invalid-frame-reference");
    if(!prepared.MatchesFrame(doc.media_pts,doc.frame_sha256)||(!doc.event_id.empty()&&!CurrentDocument(doc,error)))return Fail(error,"visual-source-unavailable");
    RecordingSearchReader search(catalog_,reader_);
    return search.SourceSeekPrepared(prepared,doc.media_pts,1,1000000000,seek,error,cancelled,deadline);
}
bool RecordingVisualSource::Encode(VisualSearchDocument* doc,analysis::Siglip2Encoder& encoder,
    std::string* error,const std::function<bool()>& cancelled,const PreparedSource* prepared)const{
    if(!doc)return Fail(error,"visual-invalid-frame-reference");
    if(!doc->event_id.empty())return EncodeSnapshot(doc,encoder,error,cancelled);
    SearchSeekTarget seek;std::unique_ptr<ResolvedRecordingMedia> media;std::shared_ptr<const ResolvedRecordingMedia> held;
    if(prepared){
        if(!ResolvePrepared(*doc,*prepared,&seek,error,cancelled,std::chrono::steady_clock::time_point::max()))return false;held=prepared->Hold();
    }else if(!Resolve(*doc,&seek,&media,error,cancelled))return false;
    const auto* original=held?held.get():media.get();
    const long double ns=static_cast<long double>(seek.seconds)*1000000000;
    if(!std::isfinite(ns)||ns<0||ns>=std::ldexp(1.0L,63))return Fail(error,"visual-invalid-frame-reference");
    VisualRgbFrame frame;
    if(!DecodeVisualFrame(original->fd(),original->size_bytes(),std::llround(ns),&frame,error,cancelled))return false;
    if(cancelled&&cancelled())return Fail(error,"visual-cancelled");
    doc->embedding=encoder.EncodeRgb(frame.rgb.data(),frame.width,frame.height,std::size_t(frame.width)*3);
    if(error)error->clear();return true;
}
} // namespace recording

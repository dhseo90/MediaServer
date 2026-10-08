// 파일 용도: 기존 검색/녹화 의미를 보존하며 출처·대표 프레임·있을 때 clip을 독립 저장한다.
#include "recording/evidence_package_builder.h"
#include "recording/evidence_observation.h"
#include "recording/recording_selection_values.h"
#include <algorithm>
#include <set>
#include <tuple>

namespace recording {
namespace {
bool Fail(std::string* error,const char* code){if(error)*error=code;return false;}
bool Ns(std::int64_t pts,std::int32_t num,std::int32_t den,std::int64_t* output){
    if(pts<0||num<=0||den<=0)return false;
    const __int128 value=static_cast<__int128>(pts)*num*1000000000;
    if(value%den||value/den>INT64_MAX)return false;
    *output=static_cast<std::int64_t>(value/den);return true;
}
void Missing(EvidencePackageV1& v,const std::string& kind,const std::string& id,
    const std::string& state,const std::string& reason){
    v.references.push_back({kind,id.empty()?"unresolved":id,state,reason,"",{}});
    v.status="partial";
}
bool SelectVisualClip(RecordingCatalog& catalog,SearchDocument* hit,const std::string& expected,
    std::string* error,const std::function<bool()>& expired){
    if(hit->event_ids.empty())return true;
    std::int64_t pts=0;
    if(!hit->media_pts||!Ns(*hit->media_pts,hit->time_base_num,hit->time_base_den,&pts))return Fail(error,"evidence-frame-unplaced");
    using Choice=std::tuple<std::string,std::string,std::string>;
    std::optional<Choice> chosen;
    const auto current_binding=catalog.FindSourceBinding(hit->segment_id);
    const bool source_deleted=catalog.IsDeletedSegmentId(hit->segment_id);
    const auto choose=[&](const std::string& event,const std::string& segment,const std::string& job){
        const Choice next{event,segment,job};if(!chosen||next<*chosen)chosen=next;
    };
    for(const auto& event:hit->event_ids){
        std::vector<std::string> ids;
        if(!catalog.FindEventDerivedJobIds(hit->channel_id,event,hit->segment_id,&ids,error,expired))return false;
        for(const auto& id:ids){
            if(expired())return Fail(error,"evidence-timeout");
            std::optional<DerivedJobRecordV1> job;
            if(!catalog.FindDerivedJob(id,&job,error)||!job||job->state!=DerivedJobState::Complete||!job->ready||
                !job->ready->verified_output||job->intent.reference.kind!="event"||
                job->intent.reference.channel_id!=hit->channel_id||job->intent.reference.owner_id!=event)
                return Fail(error,"evidence-clip-association-changed");
            DerivedRecordingSelection selection;
            if(!RestoreDerivedJobSelection(job->intent,&selection,error))return false;
            for(const auto& output:job->ready->outputs){
                if(output.source_index>=job->intent.sources.size())return Fail(error,"evidence-clip-association-changed");
                const auto& source=job->intent.sources[output.source_index];const auto& original=source.segment;
                if(original.segment_id!=hit->segment_id)continue;
                const auto& proof=output.provenance;
                if(original.channel_id!=hit->channel_id||output.segment.channel_id!=hit->channel_id||
                    (!expected.empty()&&original.checksum_sha256!=expected)||
                    (!hit->store_id.empty()&&original.store_id!=hit->store_id)||
                    (!hit->media_epoch_id.empty()&&original.media_epoch_id!=hit->media_epoch_id)||
                    !proof.verified_output||proof.segment_id!=original.segment_id||proof.source_id!=original.source_id||
                    proof.store_id!=original.store_id||proof.media_epoch_id!=original.media_epoch_id)
                    return Fail(error,"evidence-clip-association-changed");
                const DerivedRemuxAu* sample=nullptr;
                for(const auto& au:proof.access_units){
                    if(expired())return Fail(error,"evidence-timeout");
                    if(au.original_pts_ns==pts){if(sample)return Fail(error,"evidence-frame-ambiguous");sample=&au;}
                }
                if(!sample)continue;
                bool requested=false;
                for(const auto& slice:selection.slices){
                    if(expired())return Fail(error,"evidence-timeout");
                    if(slice.state!=DerivedSliceState::Confirmed||slice.candidates.size()!=1||
                        slice.candidates.front().segment.segment_id!=original.segment_id)continue;
                    if(selection.native_file_intervals){
                        const auto& observed=slice.candidates.front().original;
                        if(!observed||!slice.presentation)return Fail(error,"evidence-clip-association-changed");
                        // 원본 정수 PTS와 native rational tick은 다른 축이다. 관측된
                        // 표본 identity로 결속해 반올림 경계와 GOP 의존 표본을 구분한다.
                        requested=requested||(observed->pts_ns==static_cast<std::uint64_t>(pts)&&observed->ordinal==sample->ordinal&&
                            observed->source_generation==source.binding.source_generation&&observed->generation_order==source.binding.generation_order&&
                            observed->track_id==source.binding.track_id);
                    }else{
                        std::int64_t start=0,end=0;const auto& candidate=slice.candidates.front();
                        if(!Ns(candidate.media_start_pts,original.time_base_num,original.time_base_den,&start)||
                            !Ns(candidate.media_end_pts,original.time_base_num,original.time_base_den,&end))return Fail(error,"evidence-clip-association-changed");
                        requested=requested||(start<=pts&&pts<end);
                    }
                }
                if(!requested)continue;
                if(sample->source_vcl_sha256!=sample->output_vcl_sha256)return Fail(error,"evidence-clip-association-changed");
                if(!current_binding&&!source_deleted)return Fail(error,"evidence-clip-association-changed");
                if(current_binding&&(!current_binding->file_evidence||current_binding->segment_id!=original.segment_id||
                    current_binding->channel_id!=original.channel_id||current_binding->source_id!=original.source_id||
                    current_binding->store_id!=original.store_id||current_binding->media_epoch_id!=original.media_epoch_id||
                    current_binding->source_generation!=source.binding.source_generation||
                    current_binding->generation_order!=source.binding.generation_order||current_binding->track_id!=source.binding.track_id))
                    return Fail(error,"evidence-clip-association-changed");
                unsigned original_matches=0;
                for(const auto& original_sample:source.binding.samples){
                    if(expired())return Fail(error,"evidence-timeout");
                    if(original_sample.pts_ns!=static_cast<std::uint64_t>(pts))continue;
                    if(original_sample.ordinal!=sample->ordinal)return Fail(error,"evidence-clip-association-changed");++original_matches;
                }
                // 삭제된 원본은 공개 binding 조회에서 제외된다. tombstone이 입증될 때만
                // 이미 검증되어 저장된 job의 sample/VCL 계보로 기존 clip 참조를 유지한다.
                unsigned matches=0;
                if(current_binding)for(const auto& native:current_binding->file_evidence->samples){
                    if(expired())return Fail(error,"evidence-timeout");
                    if(native.original_pts_ns!=pts)continue;
                    if(native.ordinal!=sample->ordinal||native.vcl_sha256!=sample->source_vcl_sha256)return Fail(error,"evidence-clip-association-changed");
                    ++matches;
                }
                if((current_binding&&matches!=1)||original_matches!=1)return Fail(error,"evidence-clip-association-changed");
                choose(event,output.segment.segment_id,id);
            }
        }
        // V1 clip은 알려진 UTC와 기존 overlap/actual 범위 모두가 입증할 때만 연결한다.
        const auto link=catalog.FindEventLinkByEventId(event);
        if(link&&link->channel_id==hit->channel_id&&link->derived_segment_id&&link->derived_actual_range&&hit->start_ns&&
            (link->status==EventRecordingLinkStatus::Complete||link->status==EventRecordingLinkStatus::Partial)){
            const auto inside=[&](const UtcRangeV1& range){return static_cast<__int128>(range.start_ms)*1000000<=*hit->start_ns&&
                *hit->start_ns<static_cast<__int128>(range.end_ms)*1000000;};
            if(inside(*link->derived_actual_range)&&std::any_of(link->ordered_overlaps.begin(),link->ordered_overlaps.end(),
                [&](const auto& overlap){return overlap.segment_id==hit->segment_id&&inside(overlap.range);}))
                choose(event,*link->derived_segment_id,{});
        }
    }
    if(chosen){hit->playback_event_id=std::get<0>(*chosen);hit->playback_segment_id=std::get<1>(*chosen);hit->playback_job_id=std::get<2>(*chosen);}
    return true;
}
} // namespace
bool EvidencePackageBuilder::SelectSamples(const SearchDocument& hit,const RecordingSourceBindingV1& binding,
    std::vector<std::int64_t>* output,std::string* error){
    if(!output||!binding.file_evidence||binding.segment_id!=hit.segment_id||binding.channel_id!=hit.channel_id)
        return Fail(error,"evidence-frame-unsupported");
    std::int64_t start=0,end=0;
    if(!hit.media_pts||!Ns(*hit.media_pts,hit.time_base_num,hit.time_base_den,&start)||
        (hit.media_end_pts&&!Ns(*hit.media_end_pts,hit.time_base_num,hit.time_base_den,&end)))
        return Fail(error,"evidence-frame-unplaced");
    if(hit.media_end_pts&&end<=start)return Fail(error,"evidence-invalid-frame-range");
    std::vector<std::int64_t> candidates;
    for(const auto& sample:binding.file_evidence->samples){
        if(sample.native_pts<binding.file_evidence->edit_media_time)continue;
        if(hit.media_end_pts?(sample.original_pts_ns>=start&&sample.original_pts_ns<end):sample.original_pts_ns==start)
            candidates.push_back(sample.original_pts_ns);
    }
    std::sort(candidates.begin(),candidates.end());
    if(std::adjacent_find(candidates.begin(),candidates.end())!=candidates.end())return Fail(error,"evidence-frame-ambiguous");
    if(candidates.empty())return Fail(error,"evidence-frame-not-found");
    std::vector<std::int64_t> selected;
    const auto count=std::min<std::size_t>(8,candidates.size());
    for(std::size_t i=0;i<count;++i)selected.push_back(candidates[count==1?0:i*(candidates.size()-1)/(count-1)]);
    *output=std::move(selected);if(error)error->clear();return true;
}
bool EvidencePackageBuilder::Create(const SearchDocument& hit,const std::string& kind,
    const std::string& expected,std::string* id,EvidencePackageV1* out,std::string* error,
    std::chrono::steady_clock::time_point deadline,const std::function<bool()>& cancelled,EvidenceFailure* diagnostic) const {
    return CreateImpl(false,hit,kind,expected,id,out,error,deadline,cancelled,diagnostic);
}
bool EvidencePackageBuilder::CreateWithObservations(const SearchDocument& hit,const std::string& kind,
    const std::string& expected,std::string* id,EvidencePackageV1* out,std::string* error,
    std::chrono::steady_clock::time_point deadline,const std::function<bool()>& cancelled,EvidenceFailure* diagnostic) const {
    return CreateImpl(true,hit,kind,expected,id,out,error,deadline,cancelled,diagnostic);
}
bool EvidencePackageBuilder::CreateImpl(bool observations,const SearchDocument& input,const std::string& kind,
    const std::string& expected,std::string* id,EvidencePackageV1* output,std::string* error,
    std::chrono::steady_clock::time_point deadline,const std::function<bool()>& cancelled,EvidenceFailure* diagnostic)const{
    EvidenceFailure local;auto& trace=diagnostic?*diagnostic:local;
    const char* stage="request";
    struct Result {
        EvidenceFailure& trace;const char*& stage;std::string* error;int exceptions=std::uncaught_exceptions();bool ok=false;
        ~Result(){if(!ok){const bool thrown=std::uncaught_exceptions()>exceptions;
            trace.Note(stage,thrown?"evidence-exception":error?EvidenceErrorCode(*error):"evidence-internal-error",thrown);
            trace.builder_code=thrown?"evidence-exception":error?EvidenceErrorCode(*error):"evidence-internal-error";}}
    } result{trace,stage,error};
    if(!id||!output||!ValidateRecordingReferenceId(input.channel_id,nullptr)||(kind!="structured"&&kind!="visual"))
        return Fail(error,"evidence-invalid-request");
    const auto expired=[&]{return std::chrono::steady_clock::now()>=deadline||(cancelled&&cancelled());};
    if(expired())return Fail(error,"evidence-timeout");
    auto hit=input;
    stage="clip-selection";
    if(kind=="visual"&&!SelectVisualClip(catalog_,&hit,expected,error,expired))return false;
    stage="capture";
    std::vector<ReferencedObservationV1> observation_rows;RecordingCatalog::EvidenceSnapshot observation_snapshot;
    if(observations&&!catalog_.CaptureEvidenceObservations(hit,&observation_rows,&observation_snapshot,error,deadline))return false;
    if(observations)trace.captured_revision=observation_snapshot.captured_revision();
    stage="source";
    EvidencePackageV1 package;package.channel_id=hit.channel_id;package.hit_id=hit.id;package.query_kind=kind;
    package.observation_id=hit.observation_id;package.track_id=hit.track_id;package.analysis_namespace=hit.analysis_namespace;
    package.store_id=hit.store_id;package.media_epoch_id=hit.media_epoch_id;
    if(observations){package.schema="media-server.evidence-package.v2";package.observation_source_id=hit.source_id;}
    package.start_ns=hit.start_ns;package.end_ns=hit.end_ns;package.time_provenance=hit.time_provenance.empty()?"unknown":hit.time_provenance;
    package.uncertainty_ns=hit.uncertainty_ns;package.status="complete";
    package.created_at_ms=std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count();
    package.event_ids=hit.event_ids;std::sort(package.event_ids.begin(),package.event_ids.end());
    package.event_ids.erase(std::unique(package.event_ids.begin(),package.event_ids.end()),package.event_ids.end());
    for(const auto& event:package.event_ids)package.references.push_back({"event",event,"referenced","search-observation-association","",{}});
    if(!hit.track_id.empty())package.references.push_back({"track",hit.track_id,"referenced","analysis-namespace-local","",{}});
    if(!hit.observation_id.empty())package.references.push_back({"observation",hit.observation_id,"referenced","search-snapshot","",{}});
    std::vector<EvidencePayload> payloads;
    const auto segment=catalog_.FindSegmentV2ById(hit.segment_id);
    const auto legacy=segment?std::optional<RecordingSegmentV1>{}:catalog_.FindSegmentById(hit.segment_id);
    const bool deleted=catalog_.IsDeletedSegmentId(hit.segment_id);
    // 원본 보호 FD는 모든 payload의 원자 게시가 끝날 때까지 소유한다.
    std::shared_ptr<ResolvedRecordingMedia> source;
    if(deleted||(!segment&&!legacy)){
        Missing(package,"recording",hit.segment_id,deleted?"deleted":"missing",deleted?"source-deleted":"source-unresolved");
        Missing(package,"frame",hit.segment_id,deleted?"deleted":"missing",deleted?"source-deleted":"source-unresolved");
    }else{
        const auto channel=segment?segment->channel_id:legacy->channel_id;
        const auto hash=segment?segment->checksum_sha256:legacy->checksum_sha256;
        if(channel!=hit.channel_id||(observations&&(!segment||segment->source_id!=hit.source_id))||(!expected.empty()&&expected!=hash)||
            (segment&&((!hit.store_id.empty()&&segment->store_id!=hit.store_id)||
                       (!hit.media_epoch_id.empty()&&segment->media_epoch_id!=hit.media_epoch_id))))
            return Fail(error,"evidence-source-changed");
        if(segment){package.store_id=segment->store_id;package.media_epoch_id=segment->media_epoch_id;}
        MediaInspectionOptions options;options.deadline=deadline;options.cancelled=expired;
        source=reader_.ResolveMedia(hit.channel_id,hit.segment_id,std::move(options));
        if(!source){
            if(catalog_.IsDeletedSegmentId(hit.segment_id)){
                Missing(package,"recording",hit.segment_id,"deleted","source-deleted");
                Missing(package,"frame",hit.segment_id,"deleted","source-deleted");
            }else return Fail(error,expired()?"evidence-timeout":"evidence-source-unavailable");
        }else{
            package.references.push_back({"recording",hit.segment_id,"referenced","original-not-copied",hash,{}});
            const auto binding=catalog_.FindSourceBinding(hit.segment_id);std::vector<std::int64_t> samples;std::string why;
            if(!segment||!binding||!binding->file_evidence||!SelectSamples(hit,*binding,&samples,&why)){
                if(why=="evidence-frame-ambiguous"||why=="evidence-invalid-frame-range")return Fail(error,why.c_str());
                Missing(package,"frame",hit.segment_id,"unsupported",why.empty()?"native-frame-proof-unavailable":why);
            }else{
                stage="frame";EvidenceFrameExtractor extractor(catalog_,reader_);
                for(const auto pts:samples){
                    EvidenceFrameV1 frame;
                    if(!extractor.ExtractMedia(hit.channel_id,hit.segment_id,pts,hash,&frame,&why,deadline,expired)){
                        if(why=="visual-frame-unsupported"||why=="visual-frame-disabled"){
                            Missing(package,"frame",hit.segment_id+":"+std::to_string(pts),"unsupported",why);continue;
                        }
                        return Fail(error,why.c_str());
                    }
                    const auto index=payloads.size();
                    if(kind=="visual"){package.time_provenance=frame.time_provenance;package.uncertainty_ns=frame.uncertainty_ns;}
                    package.assets.push_back({"asset-"+std::to_string(index),"image/png",frame.png_sha256,frame.png.size()});
                    package.references.push_back({"frame",hit.segment_id+":"+std::to_string(pts),"preserved","exact-source-sample",frame.png_sha256,index});
                    EvidencePayload payload;payload.bytes=std::move(frame.png);payloads.push_back(std::move(payload));package.frames.push_back(std::move(frame));
                }
            }
        }
    }
    // 기존 event 우선 선택에서 검증한 clip만 복사한다. 없으면 원본을 clip으로 재명명하지 않는다.
    stage="clip";
    if(!hit.playback_segment_id.empty()&&hit.playback_segment_id!=hit.segment_id){
        if(!hit.playback_job_id.empty()){
            std::optional<DerivedJobRecordV1> job;
            if(!catalog_.FindDerivedJob(hit.playback_job_id,&job,error)||!job||job->state!=DerivedJobState::Complete||
                !job->ready||!job->ready->verified_output||job->intent.reference.channel_id!=hit.channel_id||
                job->intent.reference.owner_id!=hit.playback_event_id)return Fail(error,"evidence-clip-association-changed");
            unsigned matches=0;
            for(const auto& output:job->ready->outputs)if(output.segment.segment_id==hit.playback_segment_id){
                if(output.source_index>=job->intent.sources.size()||output.segment.channel_id!=hit.channel_id||!output.provenance.verified_output)
                    return Fail(error,"evidence-clip-association-changed");
                const auto& original=job->intent.sources[output.source_index].segment;
                if(original.segment_id!=hit.segment_id||original.channel_id!=hit.channel_id||output.provenance.segment_id!=hit.segment_id||
                    output.provenance.store_id!=original.store_id||output.provenance.media_epoch_id!=original.media_epoch_id)
                    return Fail(error,"evidence-clip-association-changed");
                ++matches;
            }
            if(matches!=1)return Fail(error,"evidence-clip-association-changed");
        }else{
            const auto link=catalog_.FindEventLinkByEventId(hit.playback_event_id);
            if(!link||!link->derived_segment_id||*link->derived_segment_id!=hit.playback_segment_id||link->channel_id!=hit.channel_id)
                return Fail(error,"evidence-clip-association-changed");
            const bool overlap=std::any_of(link->ordered_overlaps.begin(),link->ordered_overlaps.end(),[&](const auto& v){return v.segment_id==hit.segment_id;});
            if(!overlap)return Fail(error,"evidence-clip-association-changed");
        }
        if(std::find(package.event_ids.begin(),package.event_ids.end(),hit.playback_event_id)==package.event_ids.end()){
            package.event_ids.push_back(hit.playback_event_id);std::sort(package.event_ids.begin(),package.event_ids.end());
            package.references.push_back({"event",hit.playback_event_id,"referenced","event-priority-selection","",{}});
        }else for(auto& reference:package.references)if(reference.kind=="event"&&reference.id==hit.playback_event_id)
            reference.reason="search-association-and-event-priority-selection";
        if(catalog_.IsDeletedSegmentId(hit.playback_segment_id))Missing(package,"clip",hit.playback_segment_id,"deleted","clip-deleted");
        else{
            MediaInspectionOptions options;options.deadline=deadline;options.cancelled=expired;
            std::shared_ptr<ResolvedRecordingMedia> clip=reader_.ResolveMedia(hit.channel_id,hit.playback_segment_id,std::move(options));
            if(!clip)return Fail(error,expired()?"evidence-timeout":"evidence-clip-unavailable");
            const auto clip_v2=catalog_.FindSegmentV2ById(hit.playback_segment_id);
            const auto clip_v1=catalog_.FindSegmentById(hit.playback_segment_id);
            const auto sha=clip_v2?clip_v2->checksum_sha256:clip_v1?clip_v1->checksum_sha256:std::string{};
            if(!EvidenceIsSha256(sha)||clip->content_type()!="video/mp4")return Fail(error,"evidence-clip-unsupported");
            const auto index=payloads.size();package.assets.push_back({"asset-"+std::to_string(index),"video/mp4",sha,clip->size_bytes()});
            package.references.push_back({"clip",hit.playback_segment_id,"preserved","event-priority",sha,index,hit.playback_job_id});
            EvidencePayload payload;payload.media=std::move(clip);payloads.push_back(std::move(payload));
        }
    }else package.references.push_back({"clip","none","not-applicable","no-associated-clip","",{}});
    if(expired())return Fail(error,"evidence-timeout");
    if(observations) {
        stage="observation-copy";
        if(!PopulateEvidenceObservations(&package,observation_rows,error))return false;
        const auto guard=[&](const std::function<bool()>& link){
            trace.dependencies_checked=true;std::string why;
            const bool ok=catalog_.GuardEvidenceSnapshot(observation_snapshot,link,&trace.captured_revision,
                &trace.checked_revision,&trace.dependencies_current,&why);
            if(!ok&&!why.empty())trace.Note("publish-guard",EvidenceErrorCode(why));
            return ok;
        };
        stage="publish";
        if(!store_.Publish(package,payloads,id,error,expired,guard,&trace)) {
            // 먼저 기록한 실패만 분류한다. 뒤늦은 catalog 변경으로 I/O/취소 원인을 덮지 않는다.
            if(error&&*error!="evidence-cleanup-failed"&&*error!="evidence-publication-uncertain"&&
                std::string(trace.first_code)=="evidence-source-changed")*error="evidence-source-changed";
            return false;
        }
    } else {stage="publish";if(!store_.Publish(package,payloads,id,error,expired,{},&trace))return false;}

    *output=std::move(package);if(error)error->clear();result.ok=true;return true;
}
} // namespace recording

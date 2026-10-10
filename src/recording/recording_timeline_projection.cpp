// 파일 용도: 같은 catalog 잠금의 V2 사실을 bounded 공개 timeline 값으로 투영한다.
#include "recording/recording_catalog.h"
#include "recording/recording_latency_trace.h"
#include "recording/recording_completion_trace.h"
#include "recording/recording_selection_values.h"
#include "recording/recording_timeline_calculations.h"
#include "recording/recording_native_coverage.h"
#include <algorithm>
#include <limits>
#include <queue>
#include <stdexcept>
#include <tuple>
#include <unordered_set>
namespace recording {
namespace {
using Wide=__int128;
using namespace detail::timeline;
constexpr std::size_t kKnownRows=4096;
bool Fit(Wide value,std::int64_t* out){
    if(value<std::numeric_limits<std::int64_t>::min()||value>std::numeric_limits<std::int64_t>::max())return false;
    *out=static_cast<std::int64_t>(value);return true;
}
bool PtsNs(const RecordingSegmentV2& source,std::int64_t pts,std::int64_t* out){
    const Wide value=static_cast<Wide>(pts)*source.time_base_num*1000000000;
    return source.time_base_den>0&&value%source.time_base_den==0&&Fit(value/source.time_base_den,out);
}
std::string Key(const std::string& value){return std::to_string(value.size())+":"+value;}
std::string State(RecordingLifecycle value){
    switch(value){case RecordingLifecycle::Finalized:return "finalized";case RecordingLifecycle::Corrupt:return "corrupt";
        case RecordingLifecycle::Deleted:return "deleted";case RecordingLifecycle::DeletionPending:return "deletion-pending";
        case RecordingLifecycle::Writing:return "writing";default:return "unknown";}
}
std::string State(DerivedJobState value){
    switch(value){case DerivedJobState::Intent:return "intent";case DerivedJobState::Ready:return "ready";
        case DerivedJobState::Committed:return "committed";case DerivedJobState::Complete:return "complete";default:return "failed";}
}
std::int64_t FloorMs(std::int64_t ns){return ns/1000000-(ns<0&&ns%1000000!=0?1:0);}
bool MappingBounds(const RecordingSegmentV2& source,const RecordingUtcMappingV1& mapping,std::int64_t* start,std::int64_t* end){
    if(mapping.provenance=="unknown"||!mapping.end_pts||!mapping.utc_start_ns||!mapping.utc_end_ns||
       !PtsNs(source,mapping.start_pts,start)||!PtsNs(source,*mapping.end_pts,end)||*start>=*end)return false;
    return static_cast<Wide>(*mapping.utc_end_ns)-*mapping.utc_start_ns==static_cast<Wide>(*end)-*start;
}
bool Map(const RecordingSegmentV2& source,const RecordingUtcMappingV1& mapping,std::int64_t ns,std::int64_t* utc){
    std::int64_t start=0,end=0;
    return MappingBounds(source,mapping,&start,&end)&&ns>=start&&ns<=end&&Fit(static_cast<Wide>(*mapping.utc_start_ns)+ns-start,utc);
}
const char* PublicMappingReason(const std::string& reason){
    // writer가 생성하는 고정 코드만 공개한다. 저장 원문의 임의 URL/자격증명은 공개하지 않는다.
    for(const auto* code:{"pts-reordering-or-duplicate","decode-preroll","clock-unavailable","media-observation-divergence",
        "uncertainty-overflow","mapping-budget-exceeded","clock-comparison-unavailable","no-accepted-observation",
        "end-duration-unavailable","utc-end-overflow","server-clock-media-extrapolation","derived-output-utc-unavailable"})
        if(reason==code)return code;
    return reason.empty()?"":"unclassified";
}
RecordingTimelineItem Base(const RecordingSegmentV2& s,RecordingLifecycle state){
    RecordingTimelineItem item;item.segment_id=s.segment_id;item.channel_id=s.channel_id;
    item.kind=s.retention_class==RecordingRetentionClass::Event?"event":"continuous";
    item.display_priority=item.kind=="event"?200:100;item.catalog_state=State(state);
    item.completeness=state==RecordingLifecycle::Finalized?"complete":"unknown";
    item.media_start_pts=s.media_start_pts;item.media_end_pts=s.media_end_pts;
    item.time_base_num=s.time_base_num;item.time_base_den=s.time_base_den;item.order_sequence=s.order_sequence;
    item.unavailable_reason=state==RecordingLifecycle::Finalized?"media-not-checked":"catalog-unavailable";
    return item;
}
class Collector {
public:
    explicit Collector(const RecordingTimelineQuery& q):query(q){
        if(q.offset>std::numeric_limits<std::size_t>::max()-q.limit)throw std::runtime_error("timeline-page-overflow");
        take=q.offset+q.limit;
    }
    void Add(RecordingTimelineItem item){
        if(item.utc_start_ns&&item.utc_end_ns){
            if(static_cast<Wide>(*item.utc_start_ns)>=static_cast<Wide>(query.end_ms)*1000000||
               static_cast<Wide>(*item.utc_end_ns)<=static_cast<Wide>(query.start_ms)*1000000)return;
            item.start_ms=FloorMs(*item.utc_start_ns);item.end_ms=FloorMs(*item.utc_end_ns);
            const auto bytes=Bytes(item);
            if(known.size()>=kKnownRows||bytes>kBytes-known_bytes)throw std::runtime_error("timeline-related-limit");
            CheckCombined(bytes);
            known_bytes+=bytes;known.push_back(std::move(item));return;
        }
        item.unplaced=true;item.utc_start_ns.reset();item.utc_end_ns.reset();item.coverage.clear();
        if(unknown_count==std::numeric_limits<std::size_t>::max())throw std::runtime_error("timeline-count-overflow");
        ++unknown_count;
        if(unknown.size()==take&&!unknown.empty()&&item.item_id>=unknown.top().item_id)return;
        if(unknown.size()==take&&!unknown.empty()){unknown_bytes-=Bytes(unknown.top());unknown.pop();}
        const auto bytes=Bytes(item);
        if(bytes>kBytes-unknown_bytes)throw std::runtime_error("timeline-unplaced-page-limit");
        CheckCombined(bytes);
        unknown_bytes+=bytes;unknown.push(std::move(item));
    }
    void Source(const RecordingSegmentV2& source,RecordingLifecycle state){
        std::optional<RecordingTimelineItem> group;
        for(const auto& mapping:source.mappings){
            auto item=Base(source,state);item.item_id="v2-source:"+Key(source.segment_id)+Key(mapping.mapping_id);
            item.mapping_id=mapping.mapping_id;item.mapping_provenance=mapping.provenance;item.uncertainty_ns=mapping.uncertainty_ns;
            item.media_start_pts=mapping.start_pts;item.media_end_pts=mapping.end_pts;
            std::int64_t a=0,b=0;
            if(MappingBounds(source,mapping,&a,&b)){
                item.utc_start_ns=mapping.utc_start_ns;item.utc_end_ns=mapping.utc_end_ns;
                item.coverage.push_back({source.source_id,source.store_id,source.media_epoch_id,source.segment_id,a,b});
            }else item.unavailable_reason=mapping.provenance=="unknown"?"utc-unavailable":"mapping-inconsistent";
            AddMapping(std::move(item),source,source,mapping,group);
        }
        FlushGroup(group);
    }
    void Reference(const RecordingConsumerReferenceV1& ref,const DerivedJobRecordV1* job){
        RecordingTimelineItem item;item.item_id=job?"job-state:"+Key(job->intent.job_id):"reference-state:"+Key(ref.reference_id);
        item.channel_id=ref.channel_id;item.kind="event";item.display_priority=200;item.event_id=ref.owner_id;
        item.reference_id=ref.reference_id;item.request=ref.request;item.completeness="unknown";item.catalog_state="absent";
        item.job_state=job?State(job->state):"not-created";item.job_id=job?job->intent.job_id:"";
        item.unavailable_reason=job?"output-not-created":"evidence-not-durable";Add(std::move(item));
    }
    void Output(const DerivedJobRecordV1& job,std::size_t index,RecordingLifecycle state,bool metadata_matches){
        const auto& ready=*job.ready;const auto& output=ready.outputs[index];const auto& source=job.intent.sources[index].segment;
        const auto& p=output.provenance;auto base=Base(output.segment,state);base.media_axis="output-file-pts";
        base.job_id=job.intent.job_id;base.job_state=State(job.state);base.reference_id=job.intent.reference.reference_id;
        base.event_id=job.intent.reference.owner_id;base.request=job.intent.reference.request;
        base.completeness=ready.request_fully_satisfied?"complete":"partial";base.range_basis="source-utc-mapping";
        if(!metadata_matches)base.unavailable_reason="output-binding-unavailable";
        else if(job.state!=DerivedJobState::Complete)base.unavailable_reason="job-not-complete";
        std::vector<Interval> actual;
        for(const auto& au:p.access_units){std::int64_t end=0;
            if(au.file_duration_ns>0&&Fit(static_cast<Wide>(au.original_pts_ns)+au.file_duration_ns,&end))actual.emplace_back(au.original_pts_ns,end);}
        actual=Union(std::move(actual));
        DerivedRecordingSelection selection;std::vector<Interval> requested;
        if(RestoreDerivedJobSelection(job.intent,&selection,nullptr))for(const auto& slice:selection.slices){
            if(slice.state!=DerivedSliceState::Confirmed||slice.candidates.size()!=1||slice.candidates[0].segment.segment_id!=source.segment_id)continue;
            std::int64_t a=0,b=0;
            if(PtsNs(source,slice.candidates[0].media_start_pts,&a)&&PtsNs(source,slice.candidates[0].media_end_pts,&b))requested.emplace_back(a,b);
        }
        requested=Union(std::move(requested));
        if(selection.native_file_intervals) {
            NativeCoverageResult coverage;
            if(!EvaluateNativeOutputCoverage(selection,source,job.intent.sources[index].binding,p,&coverage))throw std::runtime_error("timeline-native-coverage-invalid");
            // 공개 정수 축은 정확 union의 안쪽 표현만 사용한다. sub-ns gap을 채우지 않는다.
            const auto inward=[](const std::vector<PresentationInterval>& ranges){std::vector<Interval> result;for(const auto& r:ranges){const auto a=r.start.ns+(r.start.numerator?1:0),b=r.end.ns;if(a<b)result.emplace_back(a,b);}return result;};
            actual=inward(coverage.actual);
            std::vector<PresentationInterval> exact_requested,merged;
            for(const auto& slice:selection.slices)if(slice.state==DerivedSliceState::Confirmed&&slice.candidates.front().segment.segment_id==source.segment_id)exact_requested.push_back(*slice.presentation);
            if(!MergePresentationIntervals(std::move(exact_requested),&merged))throw std::runtime_error("timeline-native-range-cap");
            requested=inward(merged);
        }
        bool emitted=false;std::optional<RecordingTimelineItem> group;
        for(const auto& mapping:source.mappings){
            std::int64_t map_start=0,map_end=0;
            if(!mapping.end_pts||!PtsNs(source,mapping.start_pts,&map_start)||!PtsNs(source,*mapping.end_pts,&map_end)){
                auto item=base;item.item_id="v2-event-mapping-unplaced:"+Key(output.segment.segment_id)+Key(mapping.mapping_id);
                item.unavailable_reason="mapping-inconsistent";
                // 기존 mapping 응답은 그대로 두고 opt-in member에서 원 mapping 증거를 복원한다.
                if(query.unplaced_file_units){item.mapping_id=mapping.mapping_id;item.mapping_provenance=mapping.provenance;item.uncertainty_ns=mapping.uncertainty_ns;}
                AddMapping(std::move(item),output.segment,source,mapping,group);emitted=true;continue;
            }
            for(const auto& interval:actual){
                const auto a=std::max(interval.first,map_start),b=std::min(interval.second,map_end);if(a>=b)continue;
                auto item=base;item.item_id="v2-event:"+Key(output.segment.segment_id)+Key(mapping.mapping_id)+":"+std::to_string(a)+":"+std::to_string(b);
                item.mapping_id=mapping.mapping_id;item.mapping_provenance=mapping.provenance;item.uncertainty_ns=mapping.uncertainty_ns;
                std::int64_t utc_a=0,utc_b=0;
                if(Map(source,mapping,a,&utc_a)&&Map(source,mapping,b,&utc_b)&&utc_a<utc_b){
                    item.utc_start_ns=utc_a;item.utc_end_ns=utc_b;
                    for(const auto& range:requested){const auto x=std::max(a,range.first),y=std::min(b,range.second);
                        if(x<y)item.coverage.push_back({source.source_id,source.store_id,source.media_epoch_id,source.segment_id,x,y});}
                }else item.unavailable_reason=mapping.provenance=="unknown"?"utc-unavailable":"mapping-inconsistent";
                AddMapping(std::move(item),output.segment,source,mapping,group);emitted=true;
            }
        }
        if(!emitted){base.item_id="v2-event-unplaced:"+Key(output.segment.segment_id);base.unavailable_reason="utc-unavailable";Add(std::move(base));}
        if(group&&(!metadata_matches||job.state!=DerivedJobState::Complete)){
            CheckCombined(64); // guard 문자열 변경도 보유 중 group 예산 안에서 처리한다.
            group->unavailable_reason=!metadata_matches?"output-binding-unavailable":"job-not-complete";
        }
        FlushGroup(group);
    }
    void Finish(RecordingTimelineResult* result){
        result->items=std::move(known);result->total=result->items.size();result->unplaced_total=unknown_count;
        auto rows=unknown.Release();std::sort(rows.begin(),rows.end(),[](const auto& a,const auto& b){return a.item_id<b.item_id;});
        const auto start=std::min(query.offset,rows.size());
        for(std::size_t i=start;i<rows.size();++i){const auto bytes=Bytes(rows[i]);
            if(bytes>kBytes-known_bytes)throw std::runtime_error("timeline-snapshot-limit");
            known_bytes+=bytes;result->unplaced_items.push_back(std::move(rows[i]));}
    }
private:
    void CheckCombined(std::size_t additional) const {
        if(query.unplaced_file_units&&(known_bytes>kBytes-unknown_bytes||group_bytes>kBytes-known_bytes-unknown_bytes||
            additional>kBytes-known_bytes-unknown_bytes-group_bytes))throw std::runtime_error("timeline-group-workspace-limit");
    }
    void AddMapping(RecordingTimelineItem item,const RecordingSegmentV2& file,const RecordingSegmentV2& source,
                    const RecordingUtcMappingV1& mapping,std::optional<RecordingTimelineItem>& group){
        if(!query.unplaced_file_units||(item.utc_start_ns&&item.utc_end_ns)){Add(std::move(item));return;}
        if(!group){
            CheckCombined(Bytes(item)+2*(file.segment_id.size()+item.job_id.size()+64));
            group=item;group->item_id="v2-file-group:"+Key(file.segment_id)+Key(item.job_id);group->range_basis="file-group";
            group->media_start_pts=file.media_start_pts;group->media_end_pts=file.media_end_pts;
            group->time_base_num=file.time_base_num;group->time_base_den=file.time_base_den;
            group->mapping_id.clear();group->mapping_provenance.clear();group->uncertainty_ns.reset();group->coverage.clear();
            group_bytes=Bytes(*group);
        }
        const std::string reason=PublicMappingReason(mapping.reason);
        const auto bytes=2*(sizeof(RecordingTimelineMember)+item.item_id.size()+mapping.mapping_id.size()+mapping.provenance.size()+
            reason.size()+item.unavailable_reason.size()+item.media_axis.size()+source.segment_id.size());
        // 누적 member의 vector 성장과 retained known/unknown heap을 합쳐 append 전에 확인한다.
        CheckCombined(bytes);
        RecordingTimelineMember member;
        member.item_id=std::move(item.item_id);member.mapping_id=mapping.mapping_id;member.mapping_provenance=mapping.provenance;
        member.uncertainty_ns=mapping.uncertainty_ns;member.reason=reason;member.unavailable_reason=std::move(item.unavailable_reason);
        member.media_axis=std::move(item.media_axis);member.media_start_pts=item.media_start_pts;member.media_end_pts=item.media_end_pts;
        member.time_base_num=item.time_base_num;member.time_base_den=item.time_base_den;
        member.source_segment_id=source.segment_id;member.source_start_pts=mapping.start_pts;member.source_end_pts=mapping.end_pts;
        member.source_time_base_num=source.time_base_num;member.source_time_base_den=source.time_base_den;
        group->members.push_back(std::move(member));group_bytes+=bytes;
    }
    void FlushGroup(std::optional<RecordingTimelineItem>& group){
        if(!group)return;
        group_bytes=0;Add(std::move(*group));group.reset();
    }
    struct Less {bool operator()(const RecordingTimelineItem& a,const RecordingTimelineItem& b)const{return a.item_id<b.item_id;}};
    const RecordingTimelineQuery& query;std::size_t take{0},known_bytes{0},unknown_bytes{0},unknown_count{0},group_bytes{0};
    std::vector<RecordingTimelineItem> known;
    struct Heap:std::priority_queue<RecordingTimelineItem,std::vector<RecordingTimelineItem>,Less>{
        std::vector<RecordingTimelineItem> Release(){return std::move(this->c);}
    } unknown;
};
} // namespace
bool RecordingCatalog::SnapshotTimelineV2(const RecordingTimelineQuery& query,RecordingTimelineResult* result,std::string* error) const {
    return SnapshotTimelineWithContext(query,result,error,nullptr);
}
bool RecordingCatalog::SnapshotTimelineWithContext(const RecordingTimelineQuery& query,RecordingTimelineResult* result,std::string* error,JobReadContext* context,bool event_candidates_only) const {
    recording::latency::Lock lock(mu_,recording::latency::Source::Projection,__LINE__,true);
    if(!result||!opened_||!derived_job_state_authoritative_||(generation_backend_&&!CanReadLocked(error))){if(error)*error="timeline-catalog-unavailable";return false;}
    result->v2_projection=options_.enable_v2_storage;
    if(!result->v2_projection)return true;
    try {
        // 후보 복사는 선택적이다. 호출별 budget을 줄인 검사는 그대로 strict 경로를 사용한다.
        if(context&&context->entries.empty()){
            const bool current=source_snapshot_revision_valid_&&timeline_read_candidates_.source_revision_valid&&
                timeline_read_candidates_.source_revision==source_snapshot_revision_;
            const bool reusable=context->budget==timeline_read_candidates_.budget&&timeline_read_candidates_.owner==this&&
                timeline_read_candidates_.channel_id==query.channel_id&&current&&timeline_read_candidates_.charge<=context->budget;
            if(reusable)try {context->entries=timeline_read_candidates_.entries;context->charge=timeline_read_candidates_.charge;}
                catch(...){context->entries.clear();context->charge=0;}
            else timeline_read_candidates_={};
            context->owner=this;context->channel_id=query.channel_id;context->source_revision=source_snapshot_revision_;
            context->source_revision_valid=source_snapshot_revision_valid_;
        }
        Collector collector(query);
        // 출력/참조 소유권은 이 catalog snapshot 안에서 한 번만 색인한다.
        // 세그먼트마다 모든 작업을 재탐색하면 누적 원본·이벤트가 같은 잠금을 오래 점유한다.
        // Terminal ownership is authenticated scratch; only active job ownership remains resident.
        // Querying membership avoids an O(all completed outputs/references) request-local set.
        for(const auto& entry:segments_v2_){const auto& segment=entry.second;if(segment.channel_id!=query.channel_id)continue;
            if(segment.retention_class==RecordingRetentionClass::Continuous){
                if(!event_candidates_only)collector.Source(segment,EffectiveLifecycleV2Locked(entry.first));
                continue;
            }
            if(!JobOwnsLocked("job-output",entry.first)){auto row=Base(segment,EffectiveLifecycleV2Locked(entry.first));row.item_id="orphan-event:"+Key(entry.first);
                row.completeness="unknown";row.unavailable_reason="output-binding-unavailable";collector.Add(std::move(row));}
        }
        // 삭제 이력도 기존 공개 timeline 구성원이다. 영수증을 가짜 segment로 투영하지 않고
        // 한 건씩 검증된 원문을 재획득해 기존 mapping/ID/미배치 판정을 그대로 사용한다.
        if(!VisitRetiredLocked([&](const std::string& id,const RecordingRetiredV2Receipt& receipt,std::string*){if(receipt.channel_id!=query.channel_id)return true;
            // 이벤트는 아래의 현재 job/output 경로에서 원본 바인딩까지 strict 검증한다.
            // 검색이 소비하지 않는 continuous 삭제 이력의 재획득/행 생성만 생략한다.
            if(event_candidates_only&&receipt.retention_class==RecordingRetentionClass::Continuous)return true;
            if(receipt.retention_class!=RecordingRetentionClass::Continuous&&JobOwnsLocked("job-output",id))return true;
            RecordingSegmentV2 segment;if(!AcquireOriginalV2Locked(id,&segment,error))throw std::runtime_error("timeline-retired-unavailable");
            if(segment.retention_class==RecordingRetentionClass::Continuous){collector.Source(segment,RecordingLifecycle::Deleted);return true;}
            auto row=Base(segment,RecordingLifecycle::Deleted);row.item_id="orphan-event:"+Key(id);
            row.completeness="unknown";row.unavailable_reason="output-binding-unavailable";collector.Add(std::move(row));
            return true;
        },error,event_candidates_only))throw std::runtime_error("timeline-retired-history-unavailable");
        if(!VisitJobsLocked([&](const auto& job_id,const auto& entry,std::string*){if(!entry)throw std::runtime_error("timeline-job-unavailable");if(entry.channel!=query.channel_id)return true;
            DerivedJobHandle owned;if(!AcquireJobForReadLocked(job_id,&owned,context,error)||!owned)throw std::runtime_error("timeline-job-unavailable");const auto& job=*owned;
            if(!job.ready||job.ready->outputs.empty()){collector.Reference(job.intent.reference,&job);return true;}
            for(std::size_t i=0;i<job.ready->outputs.size();++i){
                if(i>=job.intent.sources.size())throw std::runtime_error("timeline-job-invalid");
                const auto& output=job.ready->outputs[i].segment;const auto current=segments_v2_.find(output.segment_id);
                bool same=current!=segments_v2_.end()&&SerializeRecordingSegmentV2(current->second)==SerializeRecordingSegmentV2(output);
                if(RetiredLocked(output.segment_id)) {
                    RecordingSegmentV2 original;if(!AcquireOriginalV2Locked(output.segment_id,&original,error))throw std::runtime_error("timeline-retired-output-unavailable");
                    same=SerializeRecordingSegmentV2(original)==SerializeRecordingSegmentV2(output);
                }
                const auto state=tombstones_.count(output.segment_id)||tombstones_v2_.count(output.segment_id)?
                    RecordingLifecycle::Deleted:EffectiveLifecycleV2Locked(output.segment_id);
                collector.Output(job,i,state,same);
            }
            return true;
        },error))throw std::runtime_error("timeline-job-history-unavailable");
        for(const auto& id:derived_accepted_references_){const auto ref=consumer_references_.find(id);
            if(ref==consumer_references_.end()||ref->second.channel_id!=query.channel_id)continue;
            if(!JobOwnsLocked("job-reference",id))collector.Reference(ref->second,nullptr);
        }
        collector.Finish(result);
        // 후보가 복사·할당되지 않아도 응답은 영향받지 않는다. 각 재사용은 AcquireJobForReadLocked의
        // 현재 원장 envelope/출처/상태 검사에서 다시 입증한다.
        if(context&&context->owner==this&&context->channel_id==query.channel_id&&context->source_revision_valid&&
           source_snapshot_revision_valid_&&context->source_revision==source_snapshot_revision_&&
           context->entries.size()<=8&&context->charge<=context->budget){
            try {timeline_read_candidates_=*context;}catch(...){}
        }
        if(error)error->clear();
        return true;
    }catch(const std::exception&){*result={};if(error)*error="timeline-projection-unavailable";return false;}
}
} // namespace recording

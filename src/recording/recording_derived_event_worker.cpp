// 파일 용도: bounded 이벤트 증거 대기와 내구 job 실행. 기본 production에는 자동 연결하지 않는다.
#include "recording/recording_derived_event_worker.h"
#include "recording/recording_completion_trace.h"
#include "analysis/decoded_interval_evidence.h"
#include "recording/recording_derived_selection.h"
#include "recording/recording_derived_job_service.h"
#include <algorithm>
#include <limits>
#include <set>
#include <sstream>
#include <stdexcept>
#include <type_traits>
#if MEDIA_SERVER_USE_OPENSSL
#include <openssl/evp.h>
#endif

namespace recording {
std::string SerializeDerivedEventAttemptDiagnostic(const RecordingConsumerReferenceV1& reference,
    const DerivedEventAttemptDiagnostic& value) {
#if MEDIA_SERVER_USE_OPENSSL
    const auto require=[](bool ok){if(!ok)throw std::runtime_error("derived-diagnostic-invalid");};
    require(!reference.reference_id.empty()&&value.sources.size()<=256&&value.unknown_ranges.size()<=8);
    const auto count=[&](std::size_t n){require(n<=9007199254740991ULL);return n;};
    const auto integer=[](auto n){return '"'+std::to_string(n)+'"';};
    const auto optional=[&](const std::optional<std::int64_t>& n){return n?integer(*n):std::string("null");};
    const auto hash=[&](const std::string& text){
        if(text.empty())return std::string("null");
        std::array<unsigned char,EVP_MAX_MD_SIZE> bytes{};unsigned int length=0;
        require(EVP_Digest(text.data(),text.size(),bytes.data(),&length,EVP_sha256(),nullptr)==1&&length==32);
        std::string result="\"";const char* hex="0123456789abcdef";for(unsigned int i=0;i<length;++i){result+=hex[bytes[i]>>4];result+=hex[bytes[i]&15];}return result+'"';
    };
    std::ostringstream out;out<<std::boolalpha<<"{\"reference_sha256\":"<<hash(reference.reference_id)
        <<",\"attempt\":"<<count(value.attempt)<<",\"attempt_limit\":"<<count(value.attempt_limit)<<",\"elapsed_ms\":"<<integer(value.elapsed_ms)<<",\"wait_ms\":"<<integer(value.wait_ms)
        <<",\"deadline_exhausted\":"<<value.deadline_exhausted<<",\"attempt_exhausted\":"<<value.attempt_exhausted<<",\"selection_complete\":"<<value.selection_complete
        <<",\"expanded_start_ns\":"<<integer(value.expanded_start_ns)<<",\"expanded_end_ns\":"<<integer(value.expanded_end_ns)<<",\"source_count\":"<<count(value.source_count)<<",\"unknown_count\":"<<count(value.unknown_count)
        <<",\"sources_truncated\":"<<value.sources_truncated<<",\"unknown_truncated\":"<<value.unknown_truncated<<",\"sources\":[";
    bool comma=false;for(const auto& s:value.sources){if(comma)out<<',';comma=true;const auto lifecycle=static_cast<int>(s.lifecycle);require(lifecycle>=0&&lifecycle<=5);
        out<<"{\"segment_id_sha256\":"<<hash(s.segment_id)<<",\"media_epoch_id_sha256\":"<<hash(s.media_epoch_id)<<",\"source_generation_sha256\":"<<hash(s.source_generation)<<",\"track_id_sha256\":"<<hash(s.track_id)
            <<",\"generation_order\":"<<integer(s.generation_order)<<",\"start_pts\":"<<integer(s.start_pts)<<",\"end_pts\":"<<optional(s.end_pts)<<",\"time_base_num\":"<<s.time_base_num<<",\"time_base_den\":"<<s.time_base_den
            <<",\"lifecycle\":"<<lifecycle<<",\"deleted\":"<<s.deleted<<",\"binding_present\":"<<s.binding_present<<",\"binding_valid\":"<<s.binding_valid<<",\"available_for_selection\":"<<s.available_for_selection<<'}';
    }
    const auto& d=value.decoded;out<<"],\"decoded\":{\"namespace_valid\":"<<d.namespace_valid<<",\"range_comparable\":"<<d.range_comparable<<",\"incomplete\":"<<d.incomplete<<",\"frames_truncated\":"<<d.frames_truncated
        <<",\"frame_count\":"<<count(d.frame_count)<<",\"relevant_count\":"<<count(d.relevant_count)<<",\"identity_matched\":"<<count(d.identity_matched)<<",\"identity_rejected\":"<<count(d.identity_rejected)
        <<",\"generation_mismatch\":"<<count(d.generation_mismatch)<<",\"pts_mismatch\":"<<count(d.pts_mismatch)<<",\"duration_invalid\":"<<count(d.duration_invalid)
        <<",\"minimum_pts_ns\":"<<optional(d.minimum_pts_ns)<<",\"maximum_pts_ns\":"<<optional(d.maximum_pts_ns)<<",\"maximum_valid_end_ns\":"<<optional(d.maximum_valid_end_ns)<<"},\"slice_state_counts\":[";
    comma=false;for(auto n:value.slice_state_counts){if(comma)out<<',';comma=true;out<<count(n);}out<<"],\"reason_counts\":[";comma=false;for(auto n:value.reason_counts){if(comma)out<<',';comma=true;out<<count(n);}out<<"],\"unknown_ranges\":[";
    comma=false;for(const auto& range:value.unknown_ranges){if(comma)out<<',';comma=true;const auto reason=static_cast<std::size_t>(range.reason);require(reason<static_cast<std::size_t>(DerivedEventDiagnosticReason::Count));out<<"{\"start_ns\":"<<integer(range.start_ns)<<",\"end_ns\":"<<integer(range.end_ns)<<",\"reason\":"<<reason<<'}';}
    out<<"]}";auto result=out.str();require(result.size()<=256*1024);return result;
#else
    (void)reference;(void)value;throw std::runtime_error("derived-diagnostic-crypto-unavailable");
#endif
}
DerivedEventAttemptDiagnostic BuildDerivedEventAttemptDiagnostic(
    const std::vector<RecordingDerivedSourceSnapshotEntry>& snapshot,
    const std::vector<DerivedSourceEvidence>& sources,const std::vector<bool>& valid,
    const analysis::DecodedIntervalSnapshot& evidence,const DerivedRecordingSelection& selection) {
    DerivedEventAttemptDiagnostic result;result.selection_complete=selection.complete;result.expanded_start_ns=selection.expanded_start_ns;result.expanded_end_ns=selection.expanded_end_ns;
    result.source_count=snapshot.size();result.sources_truncated=snapshot.size()>256;
    for(std::size_t i=0;i<std::min<std::size_t>(snapshot.size(),256);++i){const auto& s=snapshot[i];DerivedEventSourceDiagnostic item;item.segment_id=s.segment.segment_id;item.media_epoch_id=s.segment.media_epoch_id;item.start_pts=s.segment.media_start_pts;item.end_pts=s.segment.media_end_pts;item.time_base_num=s.segment.time_base_num;item.time_base_den=s.segment.time_base_den;item.lifecycle=s.lifecycle;item.deleted=s.deleted;item.binding_present=bool(s.binding);item.binding_valid=i<valid.size()&&valid[i];item.available_for_selection=i<sources.size()&&sources[i].available_for_selection;if(s.binding){item.source_generation=s.binding->source_generation;item.generation_order=s.binding->generation_order;item.track_id=s.binding->track_id;}result.sources.push_back(std::move(item));}
    auto& d=result.decoded;d.namespace_valid=evidence.analysis_namespace==selection.reference.analysis_namespace;d.incomplete=evidence.incomplete;d.frame_count=evidence.frames.size();d.frames_truncated=evidence.frames.size()>4096;d.range_comparable=selection.reference.request&&selection.reference.request->time_basis=="media-pts-ms";
    if(d.range_comparable)for(std::size_t i=0;i<std::min<std::size_t>(4096,evidence.frames.size());++i){const auto& frame=evidence.frames[i];const __int128 end=static_cast<__int128>(frame.analysis_pts_ns)+frame.duration_ns.value_or(0);const bool duration=frame.duration_ns&&*frame.duration_ns>0&&frame.analysis_pts_ns>=0&&end<=std::numeric_limits<std::int64_t>::max();
        if(frame.analysis_pts_ns>=selection.expanded_end_ns||(duration?end<=selection.expanded_start_ns:frame.analysis_pts_ns<selection.expanded_start_ns))continue;
        ++d.relevant_count;d.minimum_pts_ns=d.minimum_pts_ns?std::min(*d.minimum_pts_ns,frame.analysis_pts_ns):frame.analysis_pts_ns;d.maximum_pts_ns=d.maximum_pts_ns?std::max(*d.maximum_pts_ns,frame.analysis_pts_ns):frame.analysis_pts_ns;if(!duration)++d.duration_invalid;
        const auto& original=frame.association.original;const auto& expected=selection.reference.original;
        if(frame.association.quality!=analysis::SourceAssociationQuality::TimestampMatch||!original||!expected||original->source_generation.empty()||!original->generation_order||!original->ordinal||original->track_id.empty()){++d.identity_rejected;continue;}
        if(original->source_generation!=expected->source_generation||original->generation_order!=expected->generation_order||original->track_id!=expected->track_id){++d.generation_mismatch;continue;}
        if(frame.analysis_pts_ns<0||static_cast<std::uint64_t>(frame.analysis_pts_ns)!=original->pts_ns){++d.pts_mismatch;continue;}
        ++d.identity_matched;if(duration&&d.namespace_valid){const auto e=static_cast<std::int64_t>(end);d.maximum_valid_end_ns=d.maximum_valid_end_ns?std::max(*d.maximum_valid_end_ns,e):e;}
    }
    if(selection.slices.size()>8194)throw std::runtime_error("derived-diagnostic-slice-cap");
    static const std::array<const char*,9> reasons{{"multiple-time-or-recording-candidates","unconfirmed-interval-no-trusted-watermark","original-deleted","original-coverage-unconfirmed","direct-time-interval-only","multiple-utc-candidates","unconfirmed-utc-mapping","piecewise-utc-time-only","missing-original-identity"}};
    for(const auto& slice:selection.slices){const auto state=static_cast<std::size_t>(slice.state);if(state<result.slice_state_counts.size())++result.slice_state_counts[state];const auto found=std::find(reasons.begin(),reasons.end(),slice.reason);const auto index=static_cast<std::size_t>(found-reasons.begin());++result.reason_counts[index];if(slice.state!=DerivedSliceState::Confirmed){++result.unknown_count;if(result.unknown_ranges.size()<8)result.unknown_ranges.push_back({slice.start_ns,slice.end_ns,static_cast<DerivedEventDiagnosticReason>(index)});}}
    result.unknown_truncated=result.unknown_count>result.unknown_ranges.size();return result;
}
DerivedEventWorkerOptions RecordingRuntimeEventBudget(std::int64_t segment_ms,std::int64_t post_ms) {
    DerivedEventWorkerOptions options;
    const __int128 requested=static_cast<__int128>(std::max<std::int64_t>(0,segment_ms))+
        std::max<std::int64_t>(0,post_ms)+1000;
    options.wait_ms=static_cast<std::int64_t>(std::min<__int128>(60000,requested));
    options.retry_ms=500;
    options.max_attempts=static_cast<std::size_t>((options.wait_ms+499)/500+1);
    options.source_wait_ms=60000;options.source_max_attempts=121;
    if(requested>60000)options.budget_reason="runtime-evidence-budget-capped-60000ms";
    return options;
}
namespace {
bool EvidenceMatches(const RecordingConsumerReferenceV1& reference,
                     const analysis::DecodedIntervalSnapshot& evidence) {
    if(evidence.analysis_namespace!=reference.analysis_namespace||evidence.frames.size()>4096)return false;
    for(const auto& frame:evidence.frames)if(frame.association.original&&reference.original) {
        const auto& a=*frame.association.original;
        const auto& b=*reference.original;
        if(a.source_generation!=b.source_generation||a.generation_order!=b.generation_order||a.track_id!=b.track_id)
            return false;
    }
    return true;
}
bool NeedsSource(const RecordingConsumerReferenceV1& reference,const analysis::DecodedIntervalSnapshot& evidence,
                 const std::vector<RecordingDerivedSourceSnapshotEntry>& sources) {
    if(!reference.request||reference.request->time_basis!="media-pts-ms"||!reference.original||
       reference.association_quality!="timestamp-match"||evidence.analysis_namespace!=reference.analysis_namespace)return false;
    const auto& r=*reference.request;
    const __int128 begin=(static_cast<__int128>(r.start_ms)-r.pre_ms)*1000000,end=(static_cast<__int128>(r.end_ms)+r.post_ms)*1000000;
    for(const auto& source:sources)if(source.deleted||source.lifecycle==RecordingLifecycle::Corrupt||
        source.lifecycle==RecordingLifecycle::DeletionPending||source.lifecycle==RecordingLifecycle::Deleted||
        (source.binding&&!ValidateRecordingSourceBindingForSegment(*source.binding,source.segment,nullptr)))return false;
    bool missing=false;std::set<std::uint64_t> ordinals;
    for(const auto& frame:evidence.frames) {
        if(frame.analysis_pts_ns<0)return false;
        if(frame.analysis_pts_ns>=end||(frame.analysis_pts_ns<begin&&
            (!frame.duration_ns||!(*frame.duration_ns)||static_cast<__int128>(frame.analysis_pts_ns)+*frame.duration_ns<=begin||
             static_cast<__int128>(frame.analysis_pts_ns)+*frame.duration_ns>std::numeric_limits<std::int64_t>::max())))continue;
        if(frame.association.quality!=analysis::SourceAssociationQuality::TimestampMatch||!frame.association.original)return false;
        const auto& o=*frame.association.original;const auto& expected=*reference.original;
        if(o.source_generation!=expected.source_generation||o.generation_order!=expected.generation_order||o.track_id!=expected.track_id||
           !o.ordinal||o.pts_ns!=static_cast<std::uint64_t>(frame.analysis_pts_ns)||!ordinals.insert(o.ordinal).second)return false;
        bool found=false;
        for(const auto& source:sources) {
            if(!source.binding)continue;
            const auto& b=*source.binding;
            if(b.source_generation!=o.source_generation||b.generation_order!=o.generation_order||b.track_id!=o.track_id)continue;
            const auto sample=std::lower_bound(b.samples.begin(),b.samples.end(),o.ordinal,[](const auto& s,std::uint64_t n){return s.ordinal<n;});
            if(sample!=b.samples.end()&&sample->ordinal==o.ordinal) {
                if(sample->pts_ns!=o.pts_ns)return false;
                if(source.lifecycle==RecordingLifecycle::Finalized)found=true;
            } else if(source.lifecycle==RecordingLifecycle::Finalized&&source.segment.time_base_num==1&&source.segment.time_base_den==1000000000&&
                source.segment.media_end_pts&&frame.analysis_pts_ns>=source.segment.media_start_pts&&frame.analysis_pts_ns<*source.segment.media_end_pts)return false;
        }
        missing|=!found;
    }
    return missing;
}
}
DerivedEventWorker::DerivedEventWorker(RecordingCatalog& catalog,RetentionCoordinator& retention,
    DerivedJobService& service,DerivedEventWorkerOptions options)
    :catalog_(catalog),retention_(retention),service_(service),options_(std::move(options)) {
    options_.queue_capacity=std::clamp<std::size_t>(options_.queue_capacity,1,32);
    options_.max_attempts=std::clamp<std::size_t>(options_.max_attempts,1,121);
    options_.wait_ms=std::clamp<std::int64_t>(options_.wait_ms,0,60000);
    options_.retry_ms=std::clamp<std::int64_t>(options_.retry_ms,1,500);
    options_.source_wait_ms=std::clamp<std::int64_t>(options_.source_wait_ms,0,60000);
    options_.source_max_attempts=std::clamp<std::size_t>(options_.source_max_attempts,1,121);
    if(!options_.now_ms)options_.now_ms=[] {
        return std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::system_clock::now().time_since_epoch()).count();
    };
    if(!options_.reserved_bytes||options_.reserved_bytes>256ULL*1024*1024)
        startup_error_="derived-reservation-invalid";
    // 구성 시점의 단일 bounded 복구. 생산자 callback에서 실행하지 않는다.
    if(startup_error_.empty())for(const auto& recovered:service_.Reconcile())
        if(recovered.blocked) {startup_error_="derived-startup-reconcile-blocked:"+recovered.reason;break;}
    worker_=std::thread([this]{Loop();});
    try {renderer_=std::thread([this]{RenderLoop();});}
    catch(...) {stopped_=true;cv_.notify_all();worker_.join();throw;}
}
DerivedEventWorker::~DerivedEventWorker(){StopAndDrain();}
bool DerivedEventWorker::Submit(const RecordingConsumerReferenceV1& reference,
    std::shared_ptr<const analysis::DecodedIntervalSnapshot> evidence,std::string* error) {
    const auto reject=[&](const std::string& reason){if(error)*error=reason;return false;};
    if(stopped_)return reject("derived-worker-stopped");
    if(!evidence&&options_.latest_evidence) {
        DerivedEventEvidenceUpdate update;
        try {update=options_.latest_evidence(reference);}
        catch(...) {return reject("derived-evidence-provider-exception");}
        if(update.source_id!=reference.source_id||update.channel_id!=reference.channel_id)
            return reject("derived-evidence-provider-identity-mismatch");
        evidence=std::move(update.evidence);
    }
    std::lock_guard lock(mu_);
    if(stopped_)return reject("derived-worker-stopped");
    if(!startup_error_.empty())return reject(startup_error_);
    if(!evidence||!EvidenceMatches(reference,*evidence))return reject("derived-evidence-identity-mismatch");
    if(inflight_.count(reference.reference_id))return true;
    if(inflight_.size()>=options_.queue_capacity)return reject("derived-queue-full");
    // 잠금으로 슬롯을 예약한 채 내구 접수부터 확정한다. 실패한 슬롯은 worker에 보이지 않는다.
    if(!catalog_.AcceptDerivedReference(reference,error))return false;
    inflight_.insert(reference.reference_id);
    const auto submitted=std::chrono::steady_clock::now();
    try {queue_.push_back({reference,std::move(evidence),submitted+
        std::chrono::milliseconds(options_.wait_ms),submitted,submitted,
        submitted+std::chrono::milliseconds(std::max(options_.wait_ms,options_.source_wait_ms)),0,0});}
    catch(...) {inflight_.erase(reference.reference_id);throw;}
    statuses_[reference.reference_id]="pending";
    completion::Point(completion::Event::Submitted,reference.reference_id);
    cv_.notify_all();
    if(error)error->clear();
    return true;
}
void DerivedEventWorker::Status(const std::string& id,const std::string& reason) {
    std::lock_guard lock(mu_);
    if(std::find(status_order_.begin(),status_order_.end(),id)==status_order_.end())status_order_.push_back(id);
    statuses_[id]=reason;
    while(status_order_.size()>64) {
        const auto old=status_order_.front();status_order_.pop_front();
        if(!inflight_.count(old))statuses_.erase(old);
    }
}
RecordingDerivedReferenceResult DerivedEventWorker::Query(const std::string& id) {
    RecordingDerivedReferenceResult result;
    std::string error;
    if(!catalog_.QueryDerivedReferenceResult(id,&result,&error)) {result.reason=error;return result;}
    std::lock_guard lock(mu_);
    if(!startup_error_.empty()) {result.state="blocked";result.reason=startup_error_;}
    else if(inflight_.count(id)&&!result.truncated) {result.state="pending";result.reason="pending";}
    else if(!result.truncated) {
        const auto status=statuses_.find(id);
        if(status!=statuses_.end()) {
            result.reason=status->second;
            if(status->second=="pending"||status->second=="complete"||status->second=="partial")result.state=status->second;
            else if(status->second.find("blocked:")==0)result.state="blocked";
            else if(status->second.find("failed:")==0)result.state="failed";
            else result.state="unknown";
        }
    }
    if(!options_.budget_reason.empty())result.reason+=";"+options_.budget_reason;
    return result;
}
void DerivedEventWorker::Finish(Pending& pending) {
    if(pending.lease) {
        std::string error;
        if(!catalog_.ReleaseDerivedWaitLease(pending.lease,&error))Status(pending.reference.reference_id,"blocked:derived-wait-lease-release");
        pending.lease=0;
    }
    std::lock_guard lock(mu_);inflight_.erase(pending.reference.reference_id);
}
void DerivedEventWorker::Loop() {
    for(;;) {
        Pending pending;
        {
            std::unique_lock lock(mu_);
            for(;;) {
                if(stopped_)return;
                const auto now=std::chrono::steady_clock::now();
                const auto due=std::find_if(queue_.begin(),queue_.end(),[&](const auto& p){return p.next_due<=now;});
                if(due!=queue_.end()){pending=std::move(*due);queue_.erase(due);break;}
                if(queue_.empty())cv_.wait(lock);
                else {
                    const auto next=std::min_element(queue_.begin(),queue_.end(),[](const auto& a,const auto& b){return a.next_due<b.next_due;})->next_due;
                    cv_.wait_until(lock,next);
                }
            }
        }
        try {
            DerivedJobIntentV1 intent;
            const auto result=Process(pending,&intent);
            if(result!=Evaluation::Done) {
                std::lock_guard lock(mu_);
                if(!stopped_) {
                    // ID와 임대의 유일한 소유자가 이동하기 전에 할당이 성공해야 한다.
                    static_assert(std::is_nothrow_move_assignable_v<Pending>);
                    static_assert(std::is_nothrow_move_assignable_v<DerivedJobIntentV1>);
                    if(result==Evaluation::Retry){queue_.emplace_back();queue_.back()=std::move(pending);}
                    else {render_queue_.emplace_back();render_queue_.back().pending=std::move(pending);render_queue_.back().intent=std::move(intent);
                        completion::Point(completion::Event::Queued,render_queue_.back().pending.reference.reference_id,render_queue_.back().intent.job_id);}
                    cv_.notify_all();continue;
                }
            }
        } catch(...) {Status(pending.reference.reference_id,"derived-worker-exception");}
        if(stopped_)Status(pending.reference.reference_id,"derived-worker-stopped");
        Finish(pending);
    }
}
void DerivedEventWorker::RenderLoop() {
    for(;;) {
        RenderPending ready;
        {
            std::unique_lock lock(mu_);cv_.wait(lock,[&]{return stopped_||!render_queue_.empty();});
            if(stopped_)return;
            ready=std::move(render_queue_.front());render_queue_.pop_front();
        }
        const auto& id=ready.pending.reference.reference_id;
        completion::Point(completion::Event::Started,id,ready.intent.job_id);
        try {
            if(stopped_)Status(id,"derived-worker-stopped");
            else {
                DerivedJobAdmissionResult admission;
                {std::lock_guard gate(admission_mu_);
                    if(!stopped_)admission=retention_.AdmitDerivedJob(catalog_,ready.intent,options_.now_ms());
                    else admission.message="derived-worker-stopped";
                }
                if(!admission.accepted)Status(id,"derived-admission-rejected:"+admission.message);
                else {
                    completion::Point(completion::Event::Admitted,id,ready.intent.job_id);
                    // 이제 영속 Intent가 원본을 보호하므로 이 런타임 토큰을 해제할 수 있다.
                    std::string error;
                    if(!catalog_.ReleaseDerivedWaitLease(ready.pending.lease,&error))throw std::runtime_error("derived-wait-lease-release");
                    ready.pending.lease=0;
                    const auto run=[&]{try{return service_.Run(ready.intent.job_id,[this]{return stopped_.load();});}
                        catch(...){completion::Point(completion::Event::Ended,id,ready.intent.job_id,2);throw;}}();
                    completion::Point(completion::Event::Ended,id,ready.intent.job_id,run.complete?1:0);
                    if(run.complete)Status(id,run.job&&run.job->ready&&run.job->ready->request_fully_satisfied?"complete":"partial");
                    else Status(id,(run.blocked?"blocked:":"failed:")+run.reason);
                }
            }
        } catch(...) {Status(id,"derived-worker-exception");}
        Finish(ready.pending);
    }
}
DerivedEventWorker::Evaluation DerivedEventWorker::Process(Pending& pending,DerivedJobIntentV1* intent) {
    std::string error;
    {
        const auto attempt=pending.attempts++;
        if(stopped_) {Status(pending.reference.reference_id,"derived-worker-stopped");return Evaluation::Done;}
        // 대기열에서 이미 만료된 요청을 포함해 모든 판정 전에 갱신한다.
        // callback은 어떤 worker/catalog 잠금도 잡지 않은 상태에서만 실행한다.
        if(options_.latest_evidence) {
            DerivedEventEvidenceUpdate update;
            try {update=options_.latest_evidence(pending.reference);}
            catch(...) {Status(pending.reference.reference_id,"derived-evidence-provider-exception");return Evaluation::Done;}
            if(update.source_id!=pending.reference.source_id||update.channel_id!=pending.reference.channel_id||
               !update.evidence||!EvidenceMatches(pending.reference,*update.evidence)) {
                Status(pending.reference.reference_id,"derived-evidence-provider-identity-mismatch");return Evaluation::Done;
            }
            if(!update.evidence->incomplete||pending.evidence->incomplete)pending.evidence=std::move(update.evidence);
        }
        if(stopped_) {Status(pending.reference.reference_id,"derived-worker-stopped");return Evaluation::Done;}
        std::vector<RecordingDerivedSourceSnapshotEntry> snapshot;
        std::vector<RecordingConsumerOriginalV1> observed;
        std::vector<RecordingConsumerOriginalV1> native_overlap_only;
        if(pending.reference.request&&pending.reference.request->time_basis=="media-pts-ms") {
            const auto& r=*pending.reference.request;
            const __int128 begin=(static_cast<__int128>(r.start_ms)-r.pre_ms)*1000000,end=(static_cast<__int128>(r.end_ms)+r.post_ms)*1000000;
            for(const auto& f:pending.evidence->frames)if(f.analysis_pts_ns<end&&
                f.analysis_pts_ns>=0&&f.association.quality==analysis::SourceAssociationQuality::TimestampMatch&&f.association.original) {
                const auto& o=*f.association.original;
                if(o.pts_ns==static_cast<std::uint64_t>(f.analysis_pts_ns)) {
                    const bool overlaps=f.analysis_pts_ns>=begin||(f.duration_ns&&*f.duration_ns&&static_cast<__int128>(f.analysis_pts_ns)+*f.duration_ns>begin&&static_cast<__int128>(f.analysis_pts_ns)+*f.duration_ns<=std::numeric_limits<std::int64_t>::max());
                    (overlaps?observed:native_overlap_only).push_back({o.source_generation,o.generation_order,o.ordinal,o.track_id,o.pts_ns});
                }
            }
        }
        if(!catalog_.SnapshotDerivedSourcesWithWaitLease(pending.reference,observed,&pending.lease,&snapshot,&error,native_overlap_only)) {
            Status(pending.reference.reference_id,error);return Evaluation::Done;
        }
        std::vector<DerivedSourceEvidence> sources;
        RecordingLocationCatalogSnapshot locations;
        for(const auto& entry:snapshot) {
            auto binding=entry.binding;
            const bool available=(entry.lifecycle==RecordingLifecycle::Finalized||entry.deleted)&&binding&&
                ValidateRecordingSourceBindingForSegment(*binding,entry.segment,nullptr);
            sources.push_back({entry.segment,std::move(binding),entry.deleted,available});
            locations.segments.push_back(entry.segment);
            if(entry.deleted)locations.deleted_segment_ids.push_back(entry.segment.segment_id);
        }
        RecordingRangeResult utc;
        const RecordingRangeResult* utc_ptr=nullptr;
        if(pending.reference.request&&pending.reference.request->time_basis=="utc-ms") {
            std::size_t mappings=0;
            for(const auto& segment:locations.segments)mappings+=segment.mappings.size();
            if(mappings>4096) {Status(pending.reference.reference_id,"derived-utc-mapping-cap");return Evaluation::Done;}
            const auto& request=*pending.reference.request;
            const __int128 begin=(static_cast<__int128>(request.start_ms)-request.pre_ms)*1000000;
            const __int128 end=(static_cast<__int128>(request.end_ms)+request.post_ms)*1000000;
            if(begin<std::numeric_limits<std::int64_t>::min()||end>std::numeric_limits<std::int64_t>::max()||
               !ResolveUtcRangeFromSnapshot(locations,static_cast<std::int64_t>(begin),static_cast<std::int64_t>(end),&utc,&error,4096)) {
                Status(pending.reference.reference_id,"derived-utc-range-invalid:"+error);return Evaluation::Done;
            }
            utc_ptr=&utc;
        }
        DerivedRecordingSelection selection;
        if(!SelectDerivedRecording(pending.reference,*pending.evidence,sources,utc_ptr,&selection,&error,true)) {
            Status(pending.reference.reference_id,error);return Evaluation::Done;
        }
        const auto decision_time=std::chrono::steady_clock::now();
        const bool source_wait=options_.source_wait_ms>0&&NeedsSource(pending.reference,*pending.evidence,snapshot);
        const auto attempt_limit=source_wait?std::max(options_.max_attempts,options_.source_max_attempts):options_.max_attempts;
        const auto deadline=source_wait?pending.source_deadline:pending.deadline;
        const bool attempt_exhausted=attempt+1>=attempt_limit;
        const bool deadline_exhausted=decision_time>=deadline;
        const bool exhausted=attempt_exhausted||deadline_exhausted;
        if(options_.diagnostic)try {
            // 기존 확정 바인딩 검증을 재사용한다. 수명 상태상 이용 불가능한 후보만
            // 별도 유효성 검사가 필요하며 명시적으로 활성화한 진단에서만 수행한다.
            std::vector<bool> valid;valid.reserve(snapshot.size());
            for(std::size_t i=0;i<snapshot.size();++i){const auto& entry=snapshot[i];
                valid.push_back((entry.lifecycle==RecordingLifecycle::Finalized||entry.deleted)?sources[i].available_for_selection:
                    entry.binding&&ValidateRecordingSourceBindingForSegment(*entry.binding,entry.segment,nullptr));
            }
            auto diagnostic=BuildDerivedEventAttemptDiagnostic(snapshot,sources,valid,*pending.evidence,selection);
            diagnostic.attempt=attempt+1;diagnostic.attempt_limit=attempt_limit;diagnostic.wait_ms=source_wait?std::max(options_.wait_ms,options_.source_wait_ms):options_.wait_ms;
            diagnostic.elapsed_ms=std::chrono::duration_cast<std::chrono::milliseconds>(decision_time-pending.submitted).count();
            diagnostic.attempt_exhausted=attempt_exhausted;diagnostic.deadline_exhausted=deadline_exhausted;
            options_.diagnostic(pending.reference,diagnostic);
        }catch(...) { /* Observation must not change selection/admission/termination. */ }
        if(selection.complete||exhausted) {
            const bool confirmed=std::any_of(selection.slices.begin(),selection.slices.end(),[](const auto& slice){
                return slice.state==DerivedSliceState::Confirmed&&slice.candidates.size()==1;
            });
            if(!confirmed) {
                std::string reason="derived-evidence-wait-exhausted:"+selection.reason;
                std::unordered_set<std::string> reasons;
                for(const auto& slice:selection.slices)if(reasons.size()<8&&reasons.insert(slice.reason).second)
                    reason+=";"+slice.reason;
                Status(pending.reference.reference_id,reason);return Evaluation::Done;
            }
            if(!BuildDerivedJobIntent(selection,sources,options_.reserved_bytes,options_.now_ms(),intent,&error)) {
                Status(pending.reference.reference_id,error);return Evaluation::Done;
            }
            if(stopped_){Status(pending.reference.reference_id,"derived-worker-stopped");return Evaluation::Done;}
            if(!catalog_.RefreshDerivedWaitLeaseForIntent(*intent,pending.lease,&error)) {
                Status(pending.reference.reference_id,error);return Evaluation::Done;
            }
            return Evaluation::Ready;
        }
        pending.next_due=std::min(deadline,decision_time+std::chrono::milliseconds(options_.retry_ms));
        return Evaluation::Retry;
    }
}
void DerivedEventWorker::StopAndDrain() {
    std::lock_guard stop_lock(stop_mu_);
    {std::lock_guard gate(admission_mu_);stopped_=true;}
    {
        std::lock_guard lock(mu_);
        cv_.notify_all();
    }
    // resolution/provider 잠금을 보유하지 않은 상태에서 단일 join한다.
    if(worker_.joinable())worker_.join();
    if(renderer_.joinable())renderer_.join();
    std::deque<Pending> pending;std::deque<RenderPending> ready;
    {std::lock_guard lock(mu_);pending.swap(queue_);ready.swap(render_queue_);}
    for(auto& p:pending){Status(p.reference.reference_id,"derived-worker-stopped");Finish(p);}
    for(auto& r:ready){Status(r.pending.reference.reference_id,"derived-worker-stopped");Finish(r.pending);}
}
}

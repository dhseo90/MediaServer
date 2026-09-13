// 파일 용도: bounded 이벤트 증거 대기와 내구 job 실행. 기본 production에는 자동 연결하지 않는다.
#include "recording/recording_derived_event_worker.h"
#include "analysis/decoded_interval_evidence.h"
#include "recording/recording_derived_selection.h"
#include "recording/recording_derived_job_service.h"
#include <algorithm>
#include <limits>

namespace recording {
DerivedEventWorkerOptions RecordingRuntimeEventBudget(std::int64_t segment_ms,std::int64_t post_ms) {
    DerivedEventWorkerOptions options;
    const __int128 requested=static_cast<__int128>(std::max<std::int64_t>(0,segment_ms))+
        std::max<std::int64_t>(0,post_ms)+1000;
    options.wait_ms=static_cast<std::int64_t>(std::min<__int128>(60000,requested));
    options.retry_ms=500;
    options.max_attempts=static_cast<std::size_t>((options.wait_ms+499)/500+1);
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
}
DerivedEventWorker::DerivedEventWorker(RecordingCatalog& catalog,RetentionCoordinator& retention,
    DerivedJobService& service,DerivedEventWorkerOptions options)
    :catalog_(catalog),retention_(retention),service_(service),options_(std::move(options)) {
    options_.queue_capacity=std::clamp<std::size_t>(options_.queue_capacity,1,32);
    options_.max_attempts=std::clamp<std::size_t>(options_.max_attempts,1,121);
    options_.wait_ms=std::clamp<std::int64_t>(options_.wait_ms,0,60000);
    options_.retry_ms=std::clamp<std::int64_t>(options_.retry_ms,1,500);
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
    queue_.push_back({reference,std::move(evidence),std::chrono::steady_clock::now()+
        std::chrono::milliseconds(options_.wait_ms)});
    statuses_[reference.reference_id]="pending";
    cv_.notify_one();
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
void DerivedEventWorker::Loop() {
    for(;;) {
        Pending pending;
        {
            std::unique_lock lock(mu_);
            cv_.wait(lock,[this]{return stopped_||!queue_.empty();});
            if(stopped_)return;
            pending=std::move(queue_.front());queue_.pop_front();
        }
        const auto id=pending.reference.reference_id;
        try {Process(std::move(pending));}
        catch(const std::exception&) {Status(id,"derived-worker-exception");}
        catch(...) {Status(id,"derived-worker-exception");}
        std::lock_guard lock(mu_);
        inflight_.erase(id);
    }
}
void DerivedEventWorker::Process(Pending pending) {
    std::string error;
    for(std::size_t attempt=0;attempt<options_.max_attempts;++attempt) {
        if(stopped_) {Status(pending.reference.reference_id,"derived-worker-stopped");return;}
        std::vector<RecordingDerivedSourceSnapshotEntry> snapshot;
        if(!catalog_.SnapshotDerivedSources(pending.reference,&snapshot,&error)) {
            Status(pending.reference.reference_id,error);return;
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
            if(mappings>4096) {Status(pending.reference.reference_id,"derived-utc-mapping-cap");return;}
            const auto& request=*pending.reference.request;
            const __int128 begin=(static_cast<__int128>(request.start_ms)-request.pre_ms)*1000000;
            const __int128 end=(static_cast<__int128>(request.end_ms)+request.post_ms)*1000000;
            if(begin<std::numeric_limits<std::int64_t>::min()||end>std::numeric_limits<std::int64_t>::max()||
               !ResolveUtcRangeFromSnapshot(locations,static_cast<std::int64_t>(begin),static_cast<std::int64_t>(end),&utc,&error,4096)) {
                Status(pending.reference.reference_id,"derived-utc-range-invalid:"+error);return;
            }
            utc_ptr=&utc;
        }
        DerivedRecordingSelection selection;
        if(!SelectDerivedRecording(pending.reference,*pending.evidence,sources,utc_ptr,&selection,&error)) {
            Status(pending.reference.reference_id,error);return;
        }
        const bool exhausted=attempt+1==options_.max_attempts||std::chrono::steady_clock::now()>=pending.deadline;
        if(selection.complete||exhausted) {
            const bool confirmed=std::any_of(selection.slices.begin(),selection.slices.end(),[](const auto& slice){
                return slice.state==DerivedSliceState::Confirmed&&slice.candidates.size()==1;
            });
            if(!confirmed) {
                std::string reason="derived-evidence-wait-exhausted:"+selection.reason;
                std::unordered_set<std::string> reasons;
                for(const auto& slice:selection.slices)if(reasons.size()<8&&reasons.insert(slice.reason).second)
                    reason+=";"+slice.reason;
                Status(pending.reference.reference_id,reason);return;
            }
            DerivedJobIntentV1 intent;
            if(!BuildDerivedJobIntent(selection,sources,options_.reserved_bytes,options_.now_ms(),&intent,&error)) {
                Status(pending.reference.reference_id,error);return;
            }
            const auto admission=retention_.AdmitDerivedJob(catalog_,intent,options_.now_ms());
            if(!admission.accepted) {Status(pending.reference.reference_id,"derived-admission-rejected:"+admission.message);return;}
            const auto run=service_.Run(intent.job_id,[this]{return stopped_.load();});
            if(run.complete)Status(pending.reference.reference_id,
                run.job&&run.job->ready&&run.job->ready->request_fully_satisfied?"complete":"partial");
            else Status(pending.reference.reference_id,(run.blocked?"blocked:":"failed:")+run.reason);
            return;
        }
        // callback은 어떤 worker/catalog 잠금도 잡지 않은 상태에서만 실행한다.
        if(options_.latest_evidence) {
            DerivedEventEvidenceUpdate update;
            try {update=options_.latest_evidence(pending.reference);}
            catch(...) {Status(pending.reference.reference_id,"derived-evidence-provider-exception");return;}
            if(update.source_id!=pending.reference.source_id||update.channel_id!=pending.reference.channel_id||
               !update.evidence||!EvidenceMatches(pending.reference,*update.evidence)) {
                Status(pending.reference.reference_id,"derived-evidence-provider-identity-mismatch");return;
            }
            pending.evidence=std::move(update.evidence);
        }
        std::unique_lock lock(mu_);
        cv_.wait_until(lock,std::min(pending.deadline,std::chrono::steady_clock::now()+
            std::chrono::milliseconds(options_.retry_ms)),[this]{return stopped_.load();});
    }
}
void DerivedEventWorker::StopAndDrain() {
    std::lock_guard stop_lock(stop_mu_);
    stopped_=true;
    {
        std::lock_guard lock(mu_);
        for(const auto& pending:queue_) {
            statuses_.erase(pending.reference.reference_id);
            inflight_.erase(pending.reference.reference_id);
        }
        queue_.clear();
        cv_.notify_all();
    }
    // resolution/provider 잠금을 보유하지 않은 상태에서 단일 join한다.
    if(worker_.joinable())worker_.join();
}
}

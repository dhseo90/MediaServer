#include "recording/recording_evidence_observer.h"
#include "analysis/decoded_interval_evidence.h"
#include <algorithm>
namespace recording {
RecordingEvidenceObserver::RecordingEvidenceObserver(std::shared_ptr<analysis::AnalysisResultObserver> downstream,std::size_t capacity)
    :downstream_(std::move(downstream)),capacity_(std::clamp<std::size_t>(capacity,1,128)){}
analysis::AnalysisObservationContext RecordingEvidenceObserver::CaptureContext(const std::string& key,std::int64_t pts) {
    return downstream_?downstream_->CaptureContext(key,pts):analysis::AnalysisObservationContext{};
}
void RecordingEvidenceObserver::OnResult(const analysis::AnalysisResult& result) {
    if(stopped_)return;
    const auto& context=result.observation_context;
    if(result.decoded_intervals&&result.decoded_intervals->frames.size()<=4096&&
       result.decoded_intervals->analysis_namespace==result.observation_namespace&&
       ValidateRecordingReferenceId(context.source_id,nullptr)&&ValidateRecordingReferenceId(context.channel_id,nullptr)&&
       ValidateOpaqueId(result.observation_namespace,nullptr)) {
        std::unique_lock lock(mu_,std::try_to_lock);
        if(lock.owns_lock()&&!stopped_) {
            entries_.erase(std::remove_if(entries_.begin(),entries_.end(),[&](const auto& item){
                return item.source_id==context.source_id&&item.channel_id==context.channel_id&&
                    item.evidence->analysis_namespace==result.observation_namespace;
            }),entries_.end());
            entries_.push_back({context.source_id,context.channel_id,result.decoded_intervals});
            while(entries_.size()>capacity_)entries_.pop_front();
        }
    }
    if(downstream_)downstream_->OnResult(result);
}
void RecordingEvidenceObserver::OnStopped(const std::string& ns,const std::string& reason) {
    {
        std::lock_guard lock(mu_);
        entries_.erase(std::remove_if(entries_.begin(),entries_.end(),[&](const auto& item){
            return item.evidence->analysis_namespace==ns;
        }),entries_.end());
    }
    if(downstream_)downstream_->OnStopped(ns,reason);
}
DerivedEventEvidenceUpdate RecordingEvidenceObserver::Latest(const RecordingConsumerReferenceV1& reference) const {
    if(stopped_)return {};
    std::unique_lock lock(mu_,std::try_to_lock);
    if(!lock.owns_lock()||stopped_)return {};
    for(const auto& item:entries_)if(item.source_id==reference.source_id&&item.channel_id==reference.channel_id&&
        item.evidence->analysis_namespace==reference.analysis_namespace)return item;
    return {};
}
void RecordingEvidenceObserver::Stop(){stopped_=true;std::lock_guard lock(mu_);entries_.clear();}
}

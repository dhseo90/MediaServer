// 파일 용도: 분석 관측의 표본 선택과 비동기 원장 투영.
#include "recording/analysis_observation_projector.h"
#include <algorithm>
#include <limits>
#include <stdexcept>
#include <iomanip>
#include <sstream>
namespace recording {
namespace {
bool Has(const AnalysisObservationV2& o, const std::string& reason) {
    return std::find(o.selection_reasons.begin(),o.selection_reasons.end(),reason)!=o.selection_reasons.end();
}
void Add(AnalysisObservationV2* o,const std::string& reason) {
    if(!Has(*o,reason)) o->selection_reasons.push_back(reason);
}
std::string Key(const AnalysisObservationV2& o) {
    std::string key;
    for(const auto* field:{&o.analysis_namespace,&o.source_id,&o.channel_id,&o.track_id,&o.stream_epoch_id})
        key+=std::to_string(field->size())+":"+*field;
    return key;
}
std::string Id(const AnalysisObservationV2& o, const std::string& original = {}) {
    // 길이가 제한된 안정적 토큰이며, catalog는 같은 토큰에 다른 식별자가 결속되면 별도로 거부한다.
    const auto bytes=Key(o)+":"+std::to_string(o.pts)+original;
    std::uint64_t first=14695981039346656037ULL,second=7809847782465536322ULL;
    for(unsigned char ch:bytes) {
        first=(first^ch)*1099511628211ULL;
        second=(second^ch)*14029467366897019727ULL;
    }
    std::ostringstream out;
    out<<"obs-"<<std::hex<<std::setfill('0')<<std::setw(16)<<first<<std::setw(16)<<second;
    return out.str();
}
bool IntervalOnly(const AnalysisObservationV2& o) {
    return o.selection_reasons.size()==1 && Has(o,"interval");
}
bool SameReferencedIdentity(const AnalysisObservationV2& previous,
                            const std::optional<RecordingConsumerReferenceV1>& previous_reference,
                            const AnalysisObservationV2& next,
                            const std::optional<RecordingConsumerReferenceV1>& next_reference) {
    if (!previous_reference && !next_reference) return true; // 기존 경로의 병합 의미 유지.
    if (!previous_reference || !next_reference) return false;
    auto normalized = *next_reference;
    normalized.created_at_ms = previous_reference->created_at_ms;
    return SerializeRecordingConsumerReferenceV1(*previous_reference) ==
               SerializeRecordingConsumerReferenceV1(normalized) &&
           previous.class_label == next.class_label && previous.confidence == next.confidence &&
           previous.bbox.x == next.bbox.x && previous.bbox.y == next.bbox.y &&
           previous.bbox.width == next.bbox.width && previous.bbox.height == next.bbox.height;
}
AnalysisObservationV2 FromTrack(const analysis::AnalysisResult& result,const analysis::Track& track,bool ended) {
    AnalysisObservationV2 o;
    o.source_id=result.observation_context.source_id; o.channel_id=result.observation_context.channel_id;
    o.stream_epoch_id=result.observation_context.stream_epoch_id;
    o.analysis_namespace=result.observation_namespace;
    o.pts=ended ? track.last_seen_pts : result.pts;
    o.locator_reason=result.observation_context.locator_reason;
    if(o.locator_reason.empty()) o.locator_reason="pending";
    o.track_id="track-"+std::to_string(track.track_id); o.class_label=track.detection.label;
    o.confidence=track.detection.score;
    o.bbox={track.detection.box.x,track.detection.box.y,track.detection.box.width,track.detection.box.height};
    o.first_seen_pts=track.first_seen_pts; o.last_seen_pts=track.last_seen_pts;
    o.rule_ids=result.context.va_rule_ids;
    if(o.rule_ids.empty() && !result.context.va_rule_id.empty()) o.rule_ids.push_back(result.context.va_rule_id);
    o.created_at_ms=std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()).count();
    if(ended) { o.selection_reasons={"track-end"}; o.ended_reason="tracker-terminated"; }
    return o;
}
}
AnalysisObservationProjector::AnalysisObservationProjector(RecordingCatalog& catalog, Options options)
    : catalog_(catalog), options_(options) {
    if(options_.interval_ms<=0 || options_.interval_ms>std::numeric_limits<std::int64_t>::max()/1000000 ||
       options_.max_queue==0 || options_.max_tracks==0 || options_.max_pending==0)
        throw std::invalid_argument("observation-invalid-options");
    worker_=std::thread(&AnalysisObservationProjector::WorkerLoop,this);
}
AnalysisObservationProjector::~AnalysisObservationProjector() { StopAndDrain(); }
analysis::AnalysisObservationContext AnalysisObservationProjector::CaptureContext(const std::string& source,std::int64_t pts) {
    if(options_.resolve_context) return options_.resolve_context(source,pts);
    return {};
}
void AnalysisObservationProjector::OnResult(const analysis::AnalysisResult& result) {
    if(result.observation_context.channel_id.empty() || result.observation_namespace.empty()) return;
    for(const auto& track:result.tracks) SubmitResult(result,FromTrack(result,track,false),false);
    for(const auto& track:result.terminated_tracks) SubmitResult(result,FromTrack(result,track,true),true);
}
void AnalysisObservationProjector::SubmitResult(const analysis::AnalysisResult& result,
                                               AnalysisObservationV2 o, bool ended) {
    if (!options_.use_consumer_references) {
        Submit(std::move(o));
        return;
    }
    o.stream_epoch_id.clear();
    o.frame_locator.reset();
    o.locator_reason = "unresolved";
    RecordingConsumerReferenceV1 r;
    r.reference_id = "pending-reference"; r.kind = "observation"; r.owner_id = "pending-owner";
    r.source_id = o.source_id; r.channel_id = o.channel_id; r.analysis_namespace = o.analysis_namespace;
    r.analysis_track_id = o.track_id; r.analysis_pts = o.pts;
    r.created_at_ms = o.created_at_ms; r.association_quality = "unavailable";
    if(ended) {
        std::lock_guard lock(mu_);
        const auto previous = tracks_.find(Key(o));
        if (previous != tracks_.end() && previous->second.last.pts == o.pts && previous->second.reference)
            r = *previous->second.reference;
    } else {
        const auto& a=result.source_association;
        switch(a.quality) {
            case analysis::SourceAssociationQuality::TimestampMatch:r.association_quality="timestamp-match";break;
            case analysis::SourceAssociationQuality::Nearest:r.association_quality="nearest";break;
            case analysis::SourceAssociationQuality::Ambiguous:r.association_quality="ambiguous";break;
            case analysis::SourceAssociationQuality::Unavailable:break;
        }
        if(a.original) {
            const auto& x = *a.original;
            r.original = RecordingConsumerOriginalV1{x.source_generation, x.generation_order, x.ordinal, x.track_id, x.pts_ns};
        }
    }
    if(r.owner_id=="pending-owner") {
        auto identity = r;
        identity.created_at_ms = 0;
        o.observation_id = Id(o, SerializeRecordingConsumerReferenceV1(identity));
        r.owner_id = o.observation_id;
        r.reference_id = "ref-" + o.observation_id;
    } else o.observation_id = r.owner_id;
    SubmitInternal(std::move(o), std::move(r));
}
void AnalysisObservationProjector::OnStopped(const std::string& ns,const std::string& reason) { StopNamespace(ns,reason); }
void AnalysisObservationProjector::OnEvent(const analysis::AnalysisResult& result,const std::string& event_id,
    std::uint64_t track_id,const std::string& zone_id,const std::string& line_id,
    const std::string& rule_id,const std::string& scenario_id) {
    if(result.observation_context.channel_id.empty() || result.observation_namespace.empty()) return;
    const auto track=std::find_if(result.tracks.begin(),result.tracks.end(),[&](const auto& t){return t.track_id==track_id;});
    if(track==result.tracks.end()) return;
    auto observation=FromTrack(result,*track,false);
    observation.selection_reasons={"event"}; observation.event_ids={event_id};
    if(!zone_id.empty()) observation.zone_ids={zone_id};
    if(!line_id.empty()) observation.line_ids={line_id};
    if(!rule_id.empty() && std::find(observation.rule_ids.begin(),observation.rule_ids.end(),rule_id)==observation.rule_ids.end())
        observation.rule_ids.push_back(rule_id);
    if(!scenario_id.empty()) observation.scenario_ids={scenario_id};
    SubmitResult(result,std::move(observation),false);
}
bool AnalysisObservationProjector::EnqueueLocked(AnalysisObservationV2 observation,std::optional<RecordingConsumerReferenceV1> reference) {
    for(auto& item:queue_) {
        auto& queued=item.observation;
        if(queued.observation_id!=observation.observation_id) continue;
        if (!SameReferencedIdentity(queued, item.reference, observation, reference)) {
            ++status_.critical_rejected;
            status_.last_error = "observation-identity-conflict";
            return false;
        }
        auto combined=queued;
        for(const auto& reason:observation.selection_reasons) Add(&combined,reason);
        const auto merge=[](const auto& from,auto* to) {
            for(const auto& value:from)
                if(std::find(to->begin(),to->end(),value)==to->end()) to->push_back(value);
        };
        merge(observation.zone_ids,&combined.zone_ids); merge(observation.line_ids,&combined.line_ids);
        merge(observation.rule_ids,&combined.rule_ids); merge(observation.scenario_ids,&combined.scenario_ids);
        merge(observation.event_ids,&combined.event_ids);
        for(const auto* refs:{&combined.zone_ids,&combined.line_ids,&combined.rule_ids,&combined.scenario_ids,&combined.event_ids})
            if(refs->size()>64) { ++status_.critical_rejected; status_.last_error="observation-reference-limit"; return false; }
        if(observation.duration_ns) {
            combined.duration_ns=observation.duration_ns; combined.ended_reason=observation.ended_reason;
            combined.first_seen_pts=observation.first_seen_pts; combined.last_seen_pts=observation.last_seen_pts;
        }
        queued=std::move(combined);
        return true;
    }
    if(queue_.size()>=options_.max_queue) {
        const auto interval=std::find_if(queue_.begin(),queue_.end(),[](const auto& item){return IntervalOnly(item.observation);});
        if(interval!=queue_.end()) { queue_.erase(interval); ++status_.interval_dropped; }
        else {
            if(IntervalOnly(observation)) ++status_.interval_dropped;
            else { ++status_.critical_rejected; status_.last_error="critical-queue-full"; }
            return false;
        }
    }
    queue_.push_back({std::move(observation),std::move(reference)}); cv_.notify_one(); return true;
}
bool AnalysisObservationProjector::Submit(AnalysisObservationV2 observation) {
    return SubmitInternal(std::move(observation),std::nullopt);
}
bool AnalysisObservationProjector::SubmitInternal(AnalysisObservationV2 observation,std::optional<RecordingConsumerReferenceV1> reference) {
    std::lock_guard lock(mu_);
    if(options_.use_consumer_references&&!reference){++status_.critical_rejected;status_.last_error="missing-consumer-reference";return false;}
    if(stopping_) { ++status_.critical_rejected; status_.last_error="projector-stopped"; return false; }
    const auto key=Key(observation);
    auto found=tracks_.find(key);
    if (found != tracks_.end() && found->second.last.observation_id == observation.observation_id &&
        !SameReferencedIdentity(found->second.last, found->second.reference, observation, reference)) {
        ++status_.critical_rejected;
        status_.last_error = "observation-identity-conflict";
        return false;
    }
    // EventRecord는 다른 소비자에서 늦게 도착할 수 있다. 과거 state를 되돌리지 않고 독립 저장한다.
    if(Has(observation,"event") && (ended_.count(key) ||
        (found!=tracks_.end() && observation.pts<found->second.last.pts))) {
        if(!reference)observation.observation_id=Id(observation);
        AnalysisObservationV2 checked; std::string error;
        if(!ParseAnalysisObservationV2(SerializeAnalysisObservationV2(observation),&checked,&error)) {
            ++status_.critical_rejected; status_.last_error="invalid-observation"; return false;
        }
        return EnqueueLocked(std::move(observation),std::move(reference));
    }
    if(ended_.count(key)) return true;
    const bool first=found==tracks_.end();
    if(first && tracks_.size()>=options_.max_tracks) {
        ++status_.critical_rejected; status_.last_error="track-state-full"; return false;
    }
    if(!first && found->second.ended) return true;
    if(first) Add(&observation,"track-start");
    else if(observation.pts<found->second.last.pts) {
        ++status_.critical_rejected; status_.last_error="pts-rollback-needs-namespace"; return false;
    } else if(observation.pts-found->second.sampled_pts>=options_.interval_ms*1000000)
        Add(&observation,"interval");
    if(!first) observation.first_seen_pts=found->second.last.first_seen_pts;
    if(!reference)observation.observation_id=Id(observation);
    if(Has(observation,"track-end")) {
        observation.duration_ns=observation.last_seen_pts-observation.first_seen_pts;
        if(observation.ended_reason.empty()) observation.ended_reason="tracker-terminated";
    }
    auto candidate=observation;
    if(candidate.selection_reasons.empty()) Add(&candidate,"interval");
    AnalysisObservationV2 parsed; std::string error;
    if(!ParseAnalysisObservationV2(SerializeAnalysisObservationV2(candidate),&parsed,&error)) {
        ++status_.critical_rejected; status_.last_error="invalid-observation"; return false;
    }
    if(first) found=tracks_.emplace(key,TrackState{observation,observation.pts,false,reference}).first;
    found->second.last=observation;
    found->second.reference=reference;
    if(observation.selection_reasons.empty()) return true;
    const bool accepted=EnqueueLocked(observation,reference);
    if(accepted) {
        found->second.sampled_pts=observation.pts;
        found->second.ended=Has(observation,"track-end");
        if(found->second.ended) {
            tracks_.erase(found);
            if(ended_order_.size()>=options_.max_tracks) {
                ended_.erase(ended_order_.front()); ended_order_.pop_front();
            }
            ended_.insert(key); ended_order_.push_back(key);
        }
    }
    return accepted;
}
void AnalysisObservationProjector::StopNamespace(const std::string& value,const std::string& reason) {
    std::lock_guard lock(mu_);
    for(auto it=tracks_.begin();it!=tracks_.end();) {
        if(!value.empty() && it->second.last.analysis_namespace!=value) { ++it; continue; }
        if(!it->second.ended) {
            auto last=it->second.last;
            last.selection_reasons={"track-end"};
            last.ended_reason=reason;
            last.duration_ns=last.last_seen_pts-last.first_seen_pts;
            if(!it->second.reference)last.observation_id=Id(last);
            EnqueueLocked(std::move(last),it->second.reference);
        }
        it=tracks_.erase(it);
    }
}
void AnalysisObservationProjector::NotifyFinalized() {
    std::lock_guard lock(mu_); finalized_=true; cv_.notify_one();
}
void AnalysisObservationProjector::StopAndDrain() {
    std::lock_guard stop_lock(stop_mu_);
    { std::lock_guard lock(mu_); if(stopping_) return; }
    { std::lock_guard lock(mu_);
      stopping_=true;
      for(const auto& item:tracks_) {
          auto last=item.second.last; last.selection_reasons={"track-end"}; last.ended_reason="stream-stopped";
          last.duration_ns=last.last_seen_pts-last.first_seen_pts;
          if(!item.second.reference)last.observation_id=Id(last);
          EnqueueLocked(std::move(last),item.second.reference);
      }
      tracks_.clear(); cv_.notify_one(); }
    if(worker_.joinable()) worker_.join();
}
AnalysisObservationProjector::Status AnalysisObservationProjector::GetStatus() const {
    std::lock_guard lock(mu_);
    auto status=status_; status.queued=queue_.size(); status.tracks=tracks_.size(); status.pending=pending_.size();
    return status;
}
void AnalysisObservationProjector::WorkerLoop() {
    for(;;) {
        AnalysisObservationV2 observation;
        std::optional<RecordingConsumerReferenceV1> reference;
        {
            std::unique_lock lock(mu_);
            cv_.wait(lock,[&]{return stopping_ || finalized_ || !queue_.empty() || !retry_ids_.empty();});
            if(finalized_) {
                finalized_=false;
                retry_ids_.clear();
                for(const auto& item:pending_) retry_ids_.push_back(item.first);
            }
            if(!queue_.empty()) { observation=std::move(queue_.front().observation);reference=std::move(queue_.front().reference); queue_.pop_front(); }
            else if(stopping_ && !pending_.empty()) {
                auto pending=pending_.begin(); observation=std::move(pending->second); pending_.erase(pending);
            } else if(!retry_ids_.empty()) {
                const auto id=retry_ids_.front(); retry_ids_.pop_front();
                const auto pending=pending_.find(id);
                if(pending==pending_.end()) continue;
                observation=std::move(pending->second); pending_.erase(pending);
            } else {
                if(stopping_) return;
                continue;
            }
        }
        auto resolved=observation;
        std::string error;
        bool ok=false;
        try {
            if(reference)ok=catalog_.PutReferencedObservation(observation,*reference,&error);
            else {resolved=catalog_.ResolveObservationV2(observation);ok=catalog_.PutObservationV2(resolved,&error);}
        } catch(...) { ok=false; }
        {
            std::lock_guard lock(mu_);
            if(ok) ++status_.stored;
            else { ++status_.storage_errors; status_.last_error="observation-storage-failed"; }
            if(!stopping_ && !resolved.frame_locator && !resolved.stream_epoch_id.empty() &&
               (resolved.locator_reason=="gap" || resolved.locator_reason=="pending")) {
                if(pending_.size()<options_.max_pending || pending_.count(resolved.observation_id))
                    pending_[resolved.observation_id]=std::move(resolved);
                else { ++status_.critical_rejected; status_.last_error="pending-state-full"; }
            }
        }
    }
}
}

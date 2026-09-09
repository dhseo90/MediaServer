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
std::string Id(const AnalysisObservationV2& o) {
    // stable bounded token; catalog independently rejects any differing identity sharing a token.
    const auto bytes=Key(o)+":"+std::to_string(o.pts);
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
    for(const auto& track:result.tracks) Submit(FromTrack(result,track,false));
    for(const auto& track:result.terminated_tracks) Submit(FromTrack(result,track,true));
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
    Submit(std::move(observation));
}
bool AnalysisObservationProjector::EnqueueLocked(AnalysisObservationV2 observation) {
    for(auto& queued:queue_) {
        if(queued.observation_id!=observation.observation_id) continue;
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
        const auto interval=std::find_if(queue_.begin(),queue_.end(),IntervalOnly);
        if(interval!=queue_.end()) { queue_.erase(interval); ++status_.interval_dropped; }
        else {
            if(IntervalOnly(observation)) ++status_.interval_dropped;
            else { ++status_.critical_rejected; status_.last_error="critical-queue-full"; }
            return false;
        }
    }
    queue_.push_back(std::move(observation)); cv_.notify_one(); return true;
}
bool AnalysisObservationProjector::Submit(AnalysisObservationV2 observation) {
    std::lock_guard lock(mu_);
    if(stopping_) { ++status_.critical_rejected; status_.last_error="projector-stopped"; return false; }
    const auto key=Key(observation);
    auto found=tracks_.find(key);
    // EventRecord는 다른 소비자에서 늦게 도착할 수 있다. 과거 state를 되돌리지 않고 독립 저장한다.
    if(Has(observation,"event") && (ended_.count(key) ||
        (found!=tracks_.end() && observation.pts<found->second.last.pts))) {
        observation.observation_id=Id(observation);
        AnalysisObservationV2 checked; std::string error;
        if(!ParseAnalysisObservationV2(SerializeAnalysisObservationV2(observation),&checked,&error)) {
            ++status_.critical_rejected; status_.last_error="invalid-observation"; return false;
        }
        return EnqueueLocked(std::move(observation));
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
    observation.observation_id=Id(observation);
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
    if(first) found=tracks_.emplace(key,TrackState{observation,observation.pts,false}).first;
    found->second.last=observation;
    if(observation.selection_reasons.empty()) return true;
    const bool accepted=EnqueueLocked(observation);
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
            last.observation_id=Id(last);
            EnqueueLocked(std::move(last));
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
          last.duration_ns=last.last_seen_pts-last.first_seen_pts; last.observation_id=Id(last);
          EnqueueLocked(std::move(last));
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
        {
            std::unique_lock lock(mu_);
            cv_.wait(lock,[&]{return stopping_ || finalized_ || !queue_.empty() || !retry_ids_.empty();});
            if(finalized_) {
                finalized_=false;
                retry_ids_.clear();
                for(const auto& item:pending_) retry_ids_.push_back(item.first);
            }
            if(!queue_.empty()) { observation=std::move(queue_.front()); queue_.pop_front(); }
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
            resolved=catalog_.ResolveObservationV2(observation);
            ok=catalog_.PutObservationV2(resolved,&error);
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

#pragma once
// 검사 복제본 전용. payload 원문은 출력하지 않는다.
#include "recording/recording_derived_job.h"
#include "recording/recording_catalog.h"
#include <cstddef>
#include <string>
namespace proof_probe {
void Inspect(const recording::RecordingCatalog::DerivedJobContentProof&);
enum class Phase { None, Update, Reopen, Manual, Negative };
inline bool enabled=false,live_once=true;
inline Phase phase=Phase::None;
inline std::string target,last_complete;
inline std::size_t updates=0,live_parses=0,automatic_checkpoints=0,automatic_applications=0,automatic_parses=0,reopen_parses=0,manual_parses=0,checkpoint_depth=0;
inline std::size_t negative_parses=0;
inline recording::RecordingCatalog* fallback_owner=nullptr;
inline bool fallback_prior=false;
inline std::size_t fallback_forced=0,fallback_restored=0;
struct Update {
 bool active;std::size_t before;
 explicit Update(const recording::DerivedJobRecordV1& record):active(enabled),before(live_parses){if(active){target=recording::SerializeDerivedJobRecord(record);phase=Phase::Update;++updates;if(record.state==recording::DerivedJobState::Complete)last_complete=target;}}
 ~Update(){if(active){
   if(fallback_owner){fallback_owner->automatic_noop_eligible_=fallback_prior;fallback_owner=nullptr;++fallback_restored;}
   live_once=live_once&&live_parses==before+1;phase=Phase::None;target.clear();}}
};
struct Checkpoint {
 bool active;
 Checkpoint():active(enabled){if(active){++checkpoint_depth;if(phase==Phase::Update)++automatic_checkpoints;}}
 ~Checkpoint(){if(active)--checkpoint_depth;}
};
inline void Apply(const std::string& payload){if(enabled&&phase==Phase::Update&&checkpoint_depth&&payload==target)++automatic_applications;}
inline void Parse(const std::string& payload){if(!enabled||payload!=target)return;if(phase==Phase::Update){if(checkpoint_depth)++automatic_parses;else ++live_parses;}else if(phase==Phase::Reopen)++reopen_parses;else if(phase==Phase::Manual)++manual_parses;else if(phase==Phase::Negative)++negative_parses;}
}

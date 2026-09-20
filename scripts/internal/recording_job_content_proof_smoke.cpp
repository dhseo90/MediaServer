#include "recording_job_content_proof_counter.h"
#define main recording_proof_unused_reproduction_main
#include "recording_checkpoint_reproduction_smoke.cpp"
#undef main
namespace {
int proof_pass=2,proof_fail=0; // CheckpointCase가 직접 수행·출력하는 기존 CP01/CP02.
void ProofCheck(bool ok,const char* name){++(ok?proof_pass:proof_fail);std::cout<<(ok?"[pass] ":"[fail] ")<<name<<'\n';}
}
namespace proof_probe {
void Inspect(const RecordingCatalog::DerivedJobContentProof& minted){
 // 실행 조건은 총 원장 크기가 아니라 마지막 확인 이후 증가량이다. 실제 due인
 // Update에서만 no-op을 비적격으로 하여 제품의 주기·상한을 그대로 둔다.
 if(phase==Phase::Update){
  auto& live=*const_cast<RecordingCatalog*>(minted.owner);
  const bool due=live.journal_.CheckpointDue(&live);
  std::cout<<"[proof-boundary] state="<<static_cast<int>(minted.record->state)<<" due="<<due<<'\n';
  if(due){Need(fallback_owner==nullptr);fallback_owner=&live;fallback_prior=live.automatic_noop_eligible_;
   live.automatic_noop_eligible_=false;++fallback_forced;}
 }
 static bool checked_ready=false,checked_complete=false;
 const bool ready=minted.record->state==DerivedJobState::Ready;
 const bool complete=minted.record->state==DerivedJobState::Complete;
 if((!ready&&!complete)||(ready?checked_ready:checked_complete))return;
 (ready?checked_ready:checked_complete)=true;
 // 정상 strict Prepared 적용 직후의 실제 proof만 출발점으로 쓴다. 이 observer와
 // 접근 노출은 소유 복제본에만 주입되며 제품에는 proof 보관/검사 callback이 없다.
 const auto saved_phase=phase;const auto saved_target=target;phase=Phase::None;
 auto& live=*const_cast<RecordingCatalog*>(minted.owner);const auto mutation=*minted.envelope;const auto id=mutation.entity_id;
 RecordingCatalog::DerivedJobHandle prior;
 for(const auto& m:live.journal_.Replay().mutations){
  if(m.mutation_id==mutation.mutation_id)break;
  if(m.entity_id!=id)continue;
  DerivedJobRecordV1 parsed;if(ParseDerivedJobRecord(m.payload_json,&parsed,nullptr))prior=std::make_shared<const DerivedJobRecordV1>(std::move(parsed));
 }
 Need(static_cast<bool>(prior));
 const auto seed=[&](RecordingCatalog& out){out.derived_jobs_.emplace(id,prior);out.segments_v2_=live.segments_v2_;out.source_bindings_=live.source_bindings_;out.orders_v2_=live.orders_v2_;out.media_relpaths_=live.media_relpaths_;out.states_v2_=live.states_v2_;};
 const auto canonical=[&](const RecordingCatalog& out){const auto at=out.derived_jobs_.find(id);if(at==out.derived_jobs_.end())return std::string{};const auto owned=at->second.WarmOwned();Need(bool(owned));return SerializeDerivedJobRecord(*owned);};
 const auto fallback=[&](const RecordingMutationV1& input,const RecordingCatalog::DerivedJobContentProof& altered,const char* label,bool must_reject=false){
  RecordingCatalog expected(live.journal_,live.options_),actual(live.journal_,live.options_);seed(expected);seed(actual);phase=Phase::None;
  const bool old_ok=expected.ApplyMutationLocked(input,false,nullptr);const auto old_value=canonical(expected);
  target=input.payload_json;phase=Phase::Negative;const auto before=negative_parses;
  const bool new_ok=actual.ApplyMutationLocked(input,false,nullptr,nullptr,{},nullptr,nullptr,&altered);
  ProofCheck(old_ok==new_ok&&(!must_reject||!new_ok)&&old_value==canonical(actual)&&negative_parses==before+1,label);
 };
 if(complete){
  {RecordingCatalog out(live.journal_,live.options_);seed(out);target=mutation.payload_json;phase=Phase::Negative;const auto before=negative_parses;
   ProofCheck(out.ApplyMutationLocked(mutation,false,nullptr,nullptr,{},nullptr,nullptr,&minted)&&out.derived_jobs_.at(id).WarmOwned()==minted.record&&negative_parses==before,"LP18-V02 minted proof reuses owned content after state validation");}
  for(int field=0;field<6;++field){auto changed=mutation;
   switch(field){case 0:changed.schema="fixture-other-schema";break;case 1:changed.mutation_type=RecordingMutationType::DerivedJobReady;break;case 2:changed.mutation_id+="-other";break;case 3:changed.entity_id+="-other";break;case 4:++changed.occurred_at_ms;break;default:changed.payload_json=" "+changed.payload_json;break;}
   const char* labels[]={"LP18-V02 schema mismatch retains strict outcome","LP18-V02 type mismatch retains strict outcome","LP18-V02 mutation ID mismatch retains strict outcome","LP18-V02 entity mismatch retains strict outcome","LP18-V02 time mismatch retains strict outcome","LP18-V02 payload bytes mismatch retains strict outcome"};fallback(changed,minted,labels[field]);
  }
  {auto invalid=mutation;invalid.payload_json="{}";fallback(invalid,minted,"LP18-V03 invalid content rejects through strict fallback",true);}
  for(int field=0;field<4;++field){auto changed=minted;RecordingCatalog foreign(live.journal_,live.options_);
   switch(field){case 0:changed.owner=nullptr;break;case 1:changed.envelope.reset();break;case 2:changed.record.reset();break;default:changed.owner=&foreign;break;}
   const char* labels[]={"LP18-V02 null owner retains strict outcome","LP18-V02 null envelope retains strict outcome","LP18-V02 null record retains strict outcome","LP18-V02 foreign owner retains strict outcome"};fallback(mutation,changed,labels[field]);
  }
  {const auto saved=live.derived_jobs_.at(id);const auto owned=saved.WarmOwned();Need(bool(owned));live.derived_jobs_.at(id)=std::make_shared<const DerivedJobRecordV1>(*owned);fallback(mutation,minted,"LP18-V02 equal-content replacement invalidates current proof ownership");live.derived_jobs_.at(id)=saved;}
  {auto& slot=live.accepted_segment_state_mutations_.at(mutation.mutation_id);const auto saved=slot;RecordingMutationHandle owned;
   if(!live.journal_.AcquireMutationLink(saved,&owned,nullptr)||!live.journal_.MakeMutationLink({},*owned,std::make_shared<const RecordingMutationV1>(*owned),&slot,nullptr))throw std::runtime_error("PROOF_LINK");
   fallback(mutation,minted,"LP18-V02 equal-envelope replacement invalidates accepted proof ownership");slot=saved;}
  {RecordingCatalog out(live.journal_,live.options_);target=mutation.payload_json;phase=Phase::Negative;const auto before=negative_parses;
   ProofCheck(!out.ApplyMutationLocked(mutation,false,nullptr,nullptr,{},nullptr,nullptr,&minted)&&out.derived_jobs_.empty()&&negative_parses==before,"LP18-V03 valid content proof cannot bypass missing prior transition");}
 }else{
  for(int guard=0;guard<3;++guard){RecordingCatalog out(live.journal_,live.options_);seed(out);const auto source=minted.record->intent.sources.front().segment.segment_id;
   if(guard==0)out.orders_v2_.clear();else if(guard==1)out.states_v2_[source].lifecycle=RecordingLifecycle::DeletionPending;else out.media_relpaths_.erase(source);
   target=mutation.payload_json;phase=Phase::Negative;const auto before=negative_parses;
   const bool rejected=!out.ApplyMutationLocked(mutation,false,nullptr,nullptr,{},nullptr,nullptr,&minted)&&out.derived_jobs_.at(id).WarmOwned()==prior&&negative_parses==before;
   const char* labels[]={"LP18-V03 valid content proof cannot bypass output reservation","LP18-V03 valid content proof cannot bypass source deletion state","LP18-V03 valid content proof cannot bypass source media binding"};ProofCheck(rejected,labels[guard]);
  }
 }
 phase=saved_phase;target=saved_target;
}
}
int main(int argc,char** argv){if(argc!=2)return 2;gst_init(nullptr,nullptr);try{
 const auto root=std::filesystem::path(argv[1])/"proof";auto input=Encode(501,false,false,160,90,30,250);Shift(input,0);Need(input.packets[250].is_key_frame&&input.packets[500].is_key_frame);
 proof_probe::enabled=true;CheckpointCase(root,input);
 ProofCheck(proof_probe::updates>0&&proof_probe::live_once&&proof_probe::live_parses==proof_probe::updates,"LP18-V01 every normal update strictly parses content once");
 ProofCheck(proof_probe::automatic_checkpoints>0&&proof_probe::automatic_applications>0&&
     proof_probe::automatic_checkpoints==proof_probe::fallback_forced&&
     proof_probe::fallback_forced==proof_probe::fallback_restored&&proof_probe::fallback_owner==nullptr,
     "LP18-V01 automatic checkpoint applies current update payload");
 ProofCheck(proof_probe::automatic_parses==0,"LP18-V01 automatic checkpoint reuses current validated content without parsing");
 Need(!proof_probe::last_complete.empty());proof_probe::target=proof_probe::last_complete;proof_probe::phase=proof_probe::Phase::Reopen;
 {Store reopened(root);ProofCheck(proof_probe::reopen_parses>0,"LP18-V04 managed reopen retains strict content parsing");proof_probe::phase=proof_probe::Phase::Manual;std::string error;Need(reopened.catalog.Checkpoint(&error));ProofCheck(proof_probe::manual_parses>0,"LP18-V04 manual checkpoint retains strict content parsing");}
 proof_probe::enabled=false;proof_probe::phase=proof_probe::Phase::None;proof_probe::target.clear();
 std::cout<<"[proof-counts] updates="<<proof_probe::updates<<" liveParses="<<proof_probe::live_parses<<" automaticCheckpoints="<<proof_probe::automatic_checkpoints<<" automaticApplications="<<proof_probe::automatic_applications<<" automaticParses="<<proof_probe::automatic_parses<<" reopenParses="<<proof_probe::reopen_parses<<" manualParses="<<proof_probe::manual_parses<<" fallbackForced="<<proof_probe::fallback_forced<<" fallbackRestored="<<proof_probe::fallback_restored<<'\n';
 std::cout<<"[summary] LP18 pass="<<proof_pass<<" fail="<<proof_fail<<'\n';return proof_fail?1:0;
 }catch(...){std::cout<<"[setup-or-oracle-fail] LP18 fixed-proof-fixture-error\n";return 2;}}

// 실제 writer/job fixture를 재사용한다. 계측/접근 노출은 runner의 격리 복제본에만 존재한다.
#define main recording_service_reuse_unused_main
#include "recording_derived_job_service_smoke.cpp"
#undef main
#include "recording_derived_transition_counter.h"
bool BindingOracle(Store& store,const recording::DerivedJobIntentV1& intent){
 std::lock_guard lock(store.catalog.mu_);std::string error;
 auto next=*store.catalog.derived_jobs_.at(intent.job_id);next.state=recording::DerivedJobState::Failed;next.failure_reason="fixture";next.cleaned_at_ms=20;
 const auto payload=recording::SerializeDerivedJobRecord(next);
 recording::RecordingMutationV1 mutation;mutation.mutation_type=recording::RecordingMutationType::DerivedJobFailed;mutation.entity_id=intent.job_id;mutation.payload_json=payload;
 bool ok=true;
 for(const auto name:{"payload","type","entity","owner","prior"}){
  recording::RecordingCatalog::PreparedDerivedMutation prepared(&store.catalog,payload);
  if(!store.catalog.ApplyDerivedJobMutationLocked(mutation,&error,false,&prepared))throw std::runtime_error("binding-prepare");
  auto changed=mutation;const std::string test=name;
  if(test=="payload")changed.payload_json+=" ";
  if(test=="type")changed.mutation_type=recording::RecordingMutationType::DerivedJobComplete;
  if(test=="entity")changed.entity_id="foreign";
  if(test=="owner")prepared.owner=nullptr;
  const auto prior=store.catalog.derived_jobs_.at(intent.job_id);
  if(test=="prior"){auto changed_prior=*prior;changed_prior.state=recording::DerivedJobState::Ready;store.catalog.derived_jobs_.at(intent.job_id)=std::make_shared<const recording::DerivedJobRecordV1>(std::move(changed_prior));}
  const bool rejected=!store.catalog.ApplyDerivedJobMutationLocked(changed,&error,true,&prepared);
  if(test=="prior")store.catalog.derived_jobs_.at(intent.job_id)=prior;
  const bool pass=rejected&&store.catalog.derived_jobs_.at(intent.job_id)->state==recording::DerivedJobState::Intent;
  std::cout<<(pass?"[pass] ":"[fail] ")<<"LP14-C02 binding="<<test<<" rejected without apply\n";ok=ok&&pass;
 }
 // 이미 수락한 envelope의 duplicate bookkeeping은 context를 적용하지 않는다.
 mutation.mutation_id="fixture-duplicate";mutation.occurred_at_ms=20;
 recording::RecordingCatalog::PreparedDerivedMutation duplicate(&store.catalog,payload);
 if(!store.catalog.ApplyDerivedJobMutationLocked(mutation,&error,false,&duplicate))throw std::runtime_error("duplicate-prepare");
 store.catalog.mutation_ids_.insert(mutation.mutation_id);
 recording::RecordingMutationLink duplicate_link;
 if(!store.journal.MakeMutationLink({},mutation,std::make_shared<const recording::RecordingMutationV1>(mutation),&duplicate_link,&error))throw std::runtime_error("duplicate-link");
 store.catalog.accepted_segment_state_mutations_[mutation.mutation_id]=std::move(duplicate_link);
 const bool duplicate_ok=store.catalog.ApplyMutationLocked(mutation,false,&error,&duplicate)&&
  duplicate.phase==recording::RecordingCatalog::PreparedDerivedMutation::Phase::Validated&&
  store.catalog.derived_jobs_.at(intent.job_id)->state==recording::DerivedJobState::Intent;
 auto conflicting=mutation;conflicting.occurred_at_ms=21;
 const bool conflict=!store.catalog.ApplyMutationLocked(conflicting,false,&error,&duplicate);
 store.catalog.mutation_ids_.erase(mutation.mutation_id);store.catalog.accepted_segment_state_mutations_.erase(mutation.mutation_id);
 std::cout<<(duplicate_ok&&conflict?"[pass] ":"[fail] ")<<"LP14-C02 duplicate envelope no-apply/conflict rejection\n";ok=ok&&duplicate_ok&&conflict;
 recording::RecordingCatalog::PreparedDerivedMutation prepared(&store.catalog,payload);
 if(!store.catalog.ApplyDerivedJobMutationLocked(mutation,&error,false,&prepared))throw std::runtime_error("reuse-prepare");
 const bool applied=store.catalog.ApplyDerivedJobMutationLocked(mutation,&error,true,&prepared);
 const bool reuse=applied&&!store.catalog.ApplyDerivedJobMutationLocked(mutation,&error,true,&prepared);
 std::cout<<(reuse?"[pass] ":"[fail] ")<<"LP14-C02 one-shot apply/reuse rejection\n";
 return ok&&reuse;
}
int main(int argc,char** argv){
 if(argc!=2)return 2;
 try{
  gst_init(nullptr,nullptr);const std::filesystem::path root=argv[1];
  Store store(root/"store");auto input=Encode(30,false,false);Shift(input,7000000000ULL);const auto intent=Prepare(store,input);
  recording::DerivedJobService service(store.catalog,store.journal,{store.root,30000,{}});
  reuse_probe::enabled=true;const auto result=service.Run(intent.job_id);reuse_probe::enabled=false;
  if(!result.complete||!result.job)throw std::runtime_error("fixture-completion");
  const bool completed=CompletedOracle(store,*result.job,false);bool ok=completed;
  for(const auto state:{recording::DerivedJobState::Ready,recording::DerivedJobState::Committed,recording::DerivedJobState::Complete}){
   const auto index=static_cast<unsigned>(state);const auto count=reuse_probe::updates[index];const bool pass=count==1&&reuse_probe::parse_counts[index]==1;
   std::cout<<(pass?"[pass] ":"[fail] ")<<"LP14-C01 state="<<index<<" updates="<<count<<" full_parse="<<reuse_probe::parse_counts[index]<<" expected=1\n";ok=ok&&pass;
  }
  const auto canonical=recording::SerializeDerivedJobRecord(*result.job);sqlite3* db=nullptr;sqlite3_stmt* query=nullptr;
  if(sqlite3_open_v2((store.root/"recording-catalog.sqlite3").c_str(),&db,SQLITE_OPEN_READONLY,nullptr)!=SQLITE_OK)throw std::runtime_error("reuse-sql-open");
  if(sqlite3_prepare_v2(db,"SELECT payload_json FROM recording_derived_jobs",-1,&query,nullptr)!=SQLITE_OK||sqlite3_step(query)!=SQLITE_ROW)throw std::runtime_error("reuse-sql-query");
  const auto* value=sqlite3_column_text(query,0);const bool same=value&&canonical==reinterpret_cast<const char*>(value);sqlite3_finalize(query);sqlite3_close(db);
  std::cout<<(same&&completed?"[pass] ":"[fail] ")<<"LP14-C03 memory/sqlite canonical bytes and CompletedOracle\n";ok=ok&&same;
  Store binding(root/"binding");const auto binding_intent=Prepare(binding,input);ok=BindingOracle(binding,binding_intent)&&ok;
  return ok?0:1;
 }catch(...){std::cerr<<"[fail] LP14 transition fixture unavailable\n";return 1;}
}

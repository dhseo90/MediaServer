// 실제 소형 job과 독립 전이 입력으로 비교 최적화의 비용/의미를 분리한다.
#define main recording_comparison_unused_service_main
#include "recording_derived_job_service_smoke.cpp"
#undef main
#include "recording_job_transition_comparison_counter.h"
#include <fstream>
namespace {
using namespace recording;
int comparison_pass=0,comparison_fail=0;
#ifndef LP18_INTENT_COMPARISON
#define LP18_INTENT_COMPARISON 0
#endif
void ComparisonNeed(bool value){if(!value)throw std::runtime_error("LP18_COMPARISON_SETUP");}
void ComparisonCheck(bool value,const char* label){++(value?comparison_pass:comparison_fail);std::cout<<(value?"[pass] ":"[fail] ")<<label<<'\n';}
template<class F>transition_compare_probe::Counts MeasureComparison(F call){transition_compare_probe::counts={};transition_compare_probe::enabled=true;call();transition_compare_probe::enabled=false;return transition_compare_probe::counts;}
std::string ComparisonBytes(const std::filesystem::path& path){std::ifstream file(path,std::ios::binary);ComparisonNeed(static_cast<bool>(file));return {std::istreambuf_iterator<char>(file),{}};}
RecordingCatalog::DerivedJobHandle ComparisonOwned(RecordingCatalog& catalog,const std::string& id){RecordingCatalog::DerivedJobHandle owned;ComparisonNeed(catalog.AcquireDerivedJobOwnedLocked(id,&owned,nullptr)&&owned);return owned;}
void RunComparison(const std::filesystem::path& root){
 Store store(root);auto input=Encode(30,false,false);Shift(input,7000000000ULL);const auto intent=Prepare(store,input);
 DerivedJobService service(store.catalog,store.journal,{store.root,30000,{}});
 transition_compare_probe::watch_updates=true;const auto result=service.Run(intent.job_id);transition_compare_probe::watch_updates=false;
 ComparisonNeed(result.complete&&result.job&&result.job->ready);
 ComparisonCheck(CompletedOracle(store,*result.job,false),"LP18-T01 actual Complete retains file hash commit and protection release");
 bool parses=transition_compare_probe::used==5&&transition_compare_probe::dropped==0,update=true,apply=true;
 for(std::size_t i=0;i<transition_compare_probe::used;++i){const auto& row=transition_compare_probe::rows[i];parses=parses&&row.counts.parses==1;update=update&&row.counts.update==1;apply=apply&&row.counts.apply==0;
  std::cout<<"[comparison-counts] transition="<<i<<" state="<<row.state<<" files="<<row.files<<" updateSerializations="<<row.counts.update<<" applySerializations="<<row.counts.apply<<" fullParses="<<row.counts.parses<<'\n';}
 ComparisonCheck(parses,"LP18-T01 five normal updates retain exactly one public Parse each");
 ComparisonCheck(parses&&update,"LP18-T02 normal Update serializes only incoming record");
 ComparisonCheck(parses&&apply,"LP18-T02 normal Apply skips impossible duplicate Record serialization");
 if(LP18_INTENT_COMPARISON){
  bool strict=parses,json=parses;
  for(std::size_t i=0;i<transition_compare_probe::used;++i){const auto& c=transition_compare_probe::rows[i].counts;strict=strict&&c.validates==1&&c.restores==1;json=json&&c.jsons==3;
   std::cout<<"[intent-counts] transition="<<i<<" validates="<<c.validates<<" restores="<<c.restores<<" jsons="<<c.jsons<<'\n';}
  ComparisonCheck(strict,"LP18-C01 normal transitions validate and restore incoming Intent once");
  ComparisonCheck(json,"LP18-C01 normal transitions retain three full Intent canonical generations");
 }
 const auto terminal=ComparisonOwned(store.catalog,intent.job_id);const auto canonical=SerializeDerivedJobRecord(*terminal);const auto durable=ComparisonBytes(store.journal.path());std::string error;bool ok=false;
 auto measured=MeasureComparison([&]{ok=store.catalog.UpdateDerivedJob(&service,*terminal,&error);});
 ComparisonCheck(ok&&measured.update==2&&measured.apply==0&&measured.parses==1&&SerializeDerivedJobRecord(*ComparisonOwned(store.catalog,intent.job_id))==canonical&&ComparisonBytes(store.journal.path())==durable,"LP18-T03 identical cold public retry retains strict reacquisition and full comparison without append");
 auto changed=*terminal;++changed.cleaned_at_ms;
 measured=MeasureComparison([&]{ok=store.catalog.UpdateDerivedJob(&service,changed,&error);});
 ComparisonCheck(!ok&&measured.update==2&&measured.parses==3&&SerializeDerivedJobRecord(*ComparisonOwned(store.catalog,intent.job_id))==canonical&&ComparisonBytes(store.journal.path())==durable,"LP18-T03 cold same-shape terminal conflict remains rejected after strict reacquisition");
 RecordingMutationV1 complete_mutation,ready_mutation;DerivedJobRecordV1 committed,initial,files;
 for(const auto& mutation:store.journal.Replay().mutations){if(mutation.entity_id!=intent.job_id)continue;DerivedJobRecordV1 value;if(!ParseDerivedJobRecord(mutation.payload_json,&value,&error))continue;
  if(mutation.mutation_type==RecordingMutationType::DerivedJobIntent)initial=value;
  if(mutation.mutation_type==RecordingMutationType::DerivedJobFiles&&files.files.empty())files=value;
  if(mutation.mutation_type==RecordingMutationType::DerivedJobReady)ready_mutation=mutation;
  if(mutation.mutation_type==RecordingMutationType::DerivedJobCommitted)committed=value;
  if(mutation.mutation_type==RecordingMutationType::DerivedJobComplete)complete_mutation=mutation;
 }
 ComparisonNeed(!complete_mutation.mutation_id.empty()&&!ready_mutation.mutation_id.empty()&&files.files.size()==1&&committed.state==DerivedJobState::Committed);
 DerivedJobRecordV1 ready;ComparisonNeed(ParseDerivedJobRecord(ready_mutation.payload_json,&ready,&error));
 measured=MeasureComparison([&]{ok=store.catalog.UpdateDerivedJob(&service,ready,&error);});
 ComparisonCheck(!ok&&measured.parses==3&&SerializeDerivedJobRecord(*ComparisonOwned(store.catalog,intent.job_id))==canonical&&ComparisonBytes(store.journal.path())==durable,"LP18-T03 cold Ready after Complete rejects without canonical or bytes change");
 auto missing=*terminal;missing.files.pop_back();measured=MeasureComparison([&]{ok=store.catalog.UpdateDerivedJob(&service,missing,&error);});
 ComparisonCheck(!ok&&measured.update==1&&measured.parses==0&&ComparisonBytes(store.journal.path())==durable,"LP18-T03 malformed receipt closure rejected by incoming strict serialization");
 {
  RecordingCatalog target(store.journal,Store::Options(root));target.derived_jobs_.emplace(intent.job_id,terminal);
  measured=MeasureComparison([&]{ok=target.ApplyDerivedJobMutationLocked(complete_mutation,&error);});
  ComparisonCheck(ok&&measured.parses==1&&target.derived_jobs_.at(intent.job_id).WarmOwned()==terminal,"LP18-T03 direct identical Apply keeps prior owner and strict Parse");
  ComparisonCheck(ok&&measured.apply==1,"LP18-T02 identical Apply serializes only prior record");
  std::cout<<"[comparison-counts] directIdenticalApply="<<measured.apply<<'\n';
 }
 {
  RecordingCatalog target(store.journal,Store::Options(root));target.derived_jobs_.emplace(intent.job_id,std::make_shared<const DerivedJobRecordV1>(committed));
  measured=MeasureComparison([&]{ok=target.ApplyDerivedJobMutationLocked(complete_mutation,&error);});
  ComparisonCheck(ok&&measured.parses==1&&SerializeDerivedJobRecord(*ComparisonOwned(target,intent.job_id))==canonical,"LP18-T03 direct changed-state Apply preserves full terminal canonical");
  ComparisonCheck(ok&&measured.apply==0,"LP18-T02 changed-state direct Apply performs zero Record serializations");
  std::cout<<"[comparison-counts] directChangedApply="<<measured.apply<<'\n';
  if(LP18_INTENT_COMPARISON){
   ComparisonCheck(ok&&measured.parses==1&&measured.validates==1&&measured.restores==1,"LP18-C01 changed-state direct Apply validates and restores incoming Intent once");
   ComparisonCheck(ok&&measured.jsons==3,"LP18-C01 changed-state direct Apply retains three full Intent canonical generations");
   std::cout<<"[intent-counts] directChanged validates="<<measured.validates<<" restores="<<measured.restores<<" jsons="<<measured.jsons<<'\n';
  }
 }
 for(const bool different_state:{true,false}){
  RecordingCatalog::DerivedJobPool pool;const auto candidate=different_state?terminal:std::make_shared<const DerivedJobRecordV1>(files);pool.emplace(intent.job_id,candidate);RecordingCatalog::DerivedJobHandle shared;
  measured=MeasureComparison([&]{shared=RecordingCatalog::ShareValidatedJob(initial,&pool);});
  ComparisonCheck(shared&&shared!=candidate&&SerializeDerivedJobRecord(*shared)==SerializeDerivedJobRecord(initial),different_state?"LP18-T03 different-state pool preserves incoming canonical":"LP18-T03 different-files pool preserves incoming canonical");
  ComparisonCheck(shared&&measured.pool==0,different_state?"LP18-T02 different-state pool performs zero Record serializations":"LP18-T02 different-files pool performs zero Record serializations");
  std::cout<<"[comparison-counts] poolDifferent="<<(different_state?"state":"files")<<" serializations="<<measured.pool<<'\n';
 }
 {
  RecordingCatalog::DerivedJobPool pool{{intent.job_id,terminal}};RecordingCatalog::DerivedJobHandle shared;
  measured=MeasureComparison([&]{shared=RecordingCatalog::ShareValidatedJob(*terminal,&pool);});
  ComparisonCheck(shared==terminal&&measured.pool==2,"LP18-T03 equal-shape identical pool retains full canonical comparison and alias");
  measured=MeasureComparison([&]{shared=RecordingCatalog::ShareValidatedJob(changed,&pool);});
  ComparisonCheck(shared&&shared!=terminal&&measured.pool==2&&SerializeDerivedJobRecord(*shared)==SerializeDerivedJobRecord(changed),"LP18-T03 equal-shape changed pool retains full comparison without alias");
  pool[intent.job_id]={};measured=MeasureComparison([&]{shared=RecordingCatalog::ShareValidatedJob(*terminal,&pool);});
  const bool null_ok=shared&&measured.pool==0;pool.clear();measured=MeasureComparison([&]{shared=RecordingCatalog::ShareValidatedJob(*terminal,&pool);});
  ComparisonCheck(null_ok&&shared&&measured.pool==0,"LP18-T03 null and absent pool entries remain independent without serialization");
 }
 {
  RecordingCatalog target(store.journal,Store::Options(root));target.derived_jobs_.emplace(intent.job_id,terminal);auto malformed=complete_mutation;malformed.payload_json="{}";
  measured=MeasureComparison([&]{ok=target.ApplyDerivedJobMutationLocked(malformed,&error);});
  ComparisonCheck(!ok&&measured.parses==1&&target.derived_jobs_.at(intent.job_id).WarmOwned()==terminal,"LP18-T03 malformed direct payload still passes through strict rejection");
 }
 ++initial.intent.reserved_bytes;measured=MeasureComparison([&]{ok=store.catalog.UpdateDerivedJob(&service,initial,&error);});
 ComparisonCheck(!ok&&measured.parses==3&&error=="derived job immutable 충돌"&&SerializeDerivedJobRecord(*ComparisonOwned(store.catalog,intent.job_id))==canonical&&ComparisonBytes(store.journal.path())==durable,"LP18-T03 cold prefilter cannot bypass immutable Intent collision after strict reacquisition");
 if(LP18_INTENT_COMPARISON){
  RecordingCatalog target(store.journal,Store::Options(root));target.derived_jobs_.emplace(intent.job_id,terminal);
  auto noncanonical=complete_mutation;noncanonical.payload_json+=' ';
  measured=MeasureComparison([&]{ok=target.ApplyDerivedJobMutationLocked(noncanonical,&error);});
  ComparisonCheck(!ok&&measured.parses==1&&target.derived_jobs_.at(intent.job_id).WarmOwned()==terminal&&ComparisonBytes(store.journal.path())==durable,"LP18-C02 noncanonical payload rejects without owner or durable byte change");
  std::optional<DerivedJobRecordV1> public_copy;ComparisonNeed(store.catalog.FindDerivedJob(intent.job_id,&public_copy,&error)&&public_copy.has_value());++public_copy->intent.reserved_bytes;
  measured=MeasureComparison([&]{ok=store.catalog.UpdateDerivedJob(&service,*public_copy,&error);});
  // Complete의 manifest는 Intent 전체에 결박된다. 사본만 바꾸면 Apply 전에 strict Serialize가 거부한다.
  ComparisonCheck(!ok&&measured.update==1&&measured.parses==0&&error=="derived service record 거부"&&SerializeDerivedJobRecord(*terminal)==canonical&&SerializeDerivedJobRecord(*ComparisonOwned(store.catalog,intent.job_id))==canonical&&ComparisonBytes(store.journal.path())==durable,"LP18-C02 modified public Intent copy cannot change immutable current job");
  target.derived_jobs_.at(intent.job_id)={};
  measured=MeasureComparison([&]{ok=target.ApplyDerivedJobMutationLocked(complete_mutation,&error);});
  ComparisonCheck(!ok&&measured.parses==1&&!target.derived_jobs_.at(intent.job_id)&&ComparisonBytes(store.journal.path())==durable,"LP18-C02 null prior rejects after incoming strict Parse without publication");
 }
}
}
int main(int argc,char** argv){if(argc!=2)return 2;gst_init(nullptr,nullptr);try{RunComparison(std::filesystem::path(argv[1])/"transition-comparison");std::cout<<"[summary] LP18 pass="<<comparison_pass<<" fail="<<comparison_fail<<'\n';return comparison_fail?1:0;}catch(...){std::cout<<"[setup-or-oracle-fail] LP18 fixed-transition-comparison-error\n";return 2;}}

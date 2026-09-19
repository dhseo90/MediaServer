// 실제 소형 job과 독립 전이 입력으로 비교 최적화의 비용/의미를 분리한다.
#define main recording_comparison_unused_service_main
#include "recording_derived_job_service_smoke.cpp"
#undef main
#include "recording_job_transition_comparison_counter.h"
#include <fstream>
namespace {
using namespace recording;
int comparison_pass=0,comparison_fail=0;
void ComparisonNeed(bool value){if(!value)throw std::runtime_error("LP18_COMPARISON_SETUP");}
void ComparisonCheck(bool value,const char* label){++(value?comparison_pass:comparison_fail);std::cout<<(value?"[pass] ":"[fail] ")<<label<<'\n';}
template<class F>transition_compare_probe::Counts MeasureComparison(F call){transition_compare_probe::counts={};transition_compare_probe::enabled=true;call();transition_compare_probe::enabled=false;return transition_compare_probe::counts;}
std::string ComparisonBytes(const std::filesystem::path& path){std::ifstream file(path,std::ios::binary);ComparisonNeed(static_cast<bool>(file));return {std::istreambuf_iterator<char>(file),{}};}
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
 const auto terminal=store.catalog.derived_jobs_.at(intent.job_id);const auto canonical=SerializeDerivedJobRecord(*terminal);const auto durable=ComparisonBytes(store.journal.path());std::string error;bool ok=false;
 auto measured=MeasureComparison([&]{ok=store.catalog.UpdateDerivedJob(&service,*terminal,&error);});
 ComparisonCheck(ok&&measured.update==2&&measured.apply==0&&measured.parses==0&&store.catalog.derived_jobs_.at(intent.job_id)==terminal&&ComparisonBytes(store.journal.path())==durable,"LP18-T03 identical public retry retains full comparison without append");
 auto changed=*terminal;++changed.cleaned_at_ms;
 measured=MeasureComparison([&]{ok=store.catalog.UpdateDerivedJob(&service,changed,&error);});
 ComparisonCheck(!ok&&measured.update==2&&measured.parses==1&&store.catalog.derived_jobs_.at(intent.job_id)==terminal&&ComparisonBytes(store.journal.path())==durable,"LP18-T03 same-shape different canonical terminal transition remains rejected");
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
 ComparisonCheck(!ok&&measured.parses==1&&store.catalog.derived_jobs_.at(intent.job_id)==terminal&&ComparisonBytes(store.journal.path())==durable,"LP18-T03 Ready after Complete remains rejected without state or bytes change");
 auto missing=*terminal;missing.files.pop_back();measured=MeasureComparison([&]{ok=store.catalog.UpdateDerivedJob(&service,missing,&error);});
 ComparisonCheck(!ok&&measured.update==1&&measured.parses==0&&ComparisonBytes(store.journal.path())==durable,"LP18-T03 malformed receipt closure rejected by incoming strict serialization");
 {
  RecordingCatalog target(store.journal,Store::Options(root));target.derived_jobs_.emplace(intent.job_id,terminal);
  measured=MeasureComparison([&]{ok=target.ApplyDerivedJobMutationLocked(complete_mutation,&error);});
  ComparisonCheck(ok&&measured.parses==1&&target.derived_jobs_.at(intent.job_id)==terminal,"LP18-T03 direct identical Apply keeps prior owner and strict Parse");
  ComparisonCheck(ok&&measured.apply==1,"LP18-T02 identical Apply serializes only prior record");
  std::cout<<"[comparison-counts] directIdenticalApply="<<measured.apply<<'\n';
 }
 {
  RecordingCatalog target(store.journal,Store::Options(root));target.derived_jobs_.emplace(intent.job_id,std::make_shared<const DerivedJobRecordV1>(committed));
  measured=MeasureComparison([&]{ok=target.ApplyDerivedJobMutationLocked(complete_mutation,&error);});
  ComparisonCheck(ok&&measured.parses==1&&SerializeDerivedJobRecord(*target.derived_jobs_.at(intent.job_id))==canonical,"LP18-T03 direct changed-state Apply preserves full terminal canonical");
  ComparisonCheck(ok&&measured.apply==0,"LP18-T02 changed-state direct Apply performs zero Record serializations");
  std::cout<<"[comparison-counts] directChangedApply="<<measured.apply<<'\n';
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
  pool[intent.job_id].reset();measured=MeasureComparison([&]{shared=RecordingCatalog::ShareValidatedJob(*terminal,&pool);});
  const bool null_ok=shared&&measured.pool==0;pool.clear();measured=MeasureComparison([&]{shared=RecordingCatalog::ShareValidatedJob(*terminal,&pool);});
  ComparisonCheck(null_ok&&shared&&measured.pool==0,"LP18-T03 null and absent pool entries remain independent without serialization");
 }
 {
  RecordingCatalog target(store.journal,Store::Options(root));target.derived_jobs_.emplace(intent.job_id,terminal);auto malformed=complete_mutation;malformed.payload_json="{}";
  measured=MeasureComparison([&]{ok=target.ApplyDerivedJobMutationLocked(malformed,&error);});
  ComparisonCheck(!ok&&measured.parses==1&&target.derived_jobs_.at(intent.job_id)==terminal,"LP18-T03 malformed direct payload still passes through strict rejection");
 }
 ++initial.intent.reserved_bytes;measured=MeasureComparison([&]{ok=store.catalog.UpdateDerivedJob(&service,initial,&error);});
 ComparisonCheck(!ok&&measured.parses==1&&error=="derived job immutable 충돌"&&store.catalog.derived_jobs_.at(intent.job_id)==terminal&&ComparisonBytes(store.journal.path())==durable,"LP18-T03 state and files prefilter cannot bypass immutable Intent collision");
}
}
int main(int argc,char** argv){if(argc!=2)return 2;gst_init(nullptr,nullptr);try{RunComparison(std::filesystem::path(argv[1])/"transition-comparison");std::cout<<"[summary] LP18 pass="<<comparison_pass<<" fail="<<comparison_fail<<'\n';return comparison_fail?1:0;}catch(...){std::cout<<"[setup-or-oracle-fail] LP18 fixed-transition-comparison-error\n";return 2;}}

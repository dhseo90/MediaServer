// 진단 검증 전용: 실제 writer와 typed Catalog admission/failure API만 사용한다.
#define main recording_service_fixture_unused_main
#include "recording_derived_job_service_smoke.cpp"
#undef main
int main(int argc,char** argv){
 if(argc!=3)return 2;
 try{
  gst_init(nullptr,nullptr);const std::string mode=argv[2];
  const std::vector<std::string> reasons={"job-remux: file-original-timestamp-mismatch","job-remux: source-binding-incomplete","job-source-unavailable",
   "private failure /private/example/location?token=canary\nraw diagnostic", "job-source-unavailable /private/example/location", "",
   "job-cancelled-or-deadline", "job-attempt-create", "job-output-create", "job-remux: media-budget-exceeded", "job-remux: work-cancelled", "job-remux: output-byte-budget-exceeded"};
  const auto index=std::stoul(mode);if(index>=18)return 2;
  const bool failed=index!=5;const std::string reason=index<reasons.size()?reasons[index]:reasons[index-6]+" /private/example?token=canary";
  Store store(std::filesystem::path(argv[1])/"recordings");auto input=Encode(30,false,false);Shift(input,7000000000ULL);const auto job=Prepare(store,input);std::string error;
  if(failed&&!store.catalog.FailDerivedJobAfterCleanup(job.job_id,job.attempt_id,reason,20,&error))throw std::runtime_error("fixture-terminal-transition");
  std::optional<recording::DerivedJobRecordV1> saved;
  if(!store.catalog.FindDerivedJob(job.job_id,&saved,&error)||!saved||saved->state!=(failed?recording::DerivedJobState::Failed:recording::DerivedJobState::Intent))throw std::runtime_error("fixture-readback");
  std::cout<<"{\"fixtureTypedReadback\":true}\n";return 0;
 }catch(...){std::cerr<<"fixture-failed\n";return 1;}
}

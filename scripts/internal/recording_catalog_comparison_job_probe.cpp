// LP17-D08: 기존 CP01/CP02의 실제 2-job 입력·파일·보호 해제 oracle을 유지한다.
#define main recording_checkpoint_reproduction_unused_main
#include "recording_checkpoint_reproduction_smoke.cpp"
#undef main
#include "recording_catalog_cost_probe_timer.h"
#include "recording_catalog_comparison_ownership.h"
namespace {
unsigned job_passes=0;
const char* job_stage="setup";
void JobCheck(bool ok,const char* id){if(!ok){const char* fixed="unknown";for(const char* allowed:{"D08.input-keyframes","D08.source-shape","D08.expected-state","D08.canonical-intent","D08.files-receipt","D08.canonical-record-roundtrip","D08.canonical-ready-preserved","D08.ready-verified-proof","D08.protection-released","D08.selection-complete","D08.expected-intent-built","D08.admission","D08.run-complete","D08.actual-output-hash","CP01.actual-ready-complete-shape-canonical-files-reservation","CP02.two-jobs-over-1MiB-canonical-transitions"})if(std::string(id)==allowed){fixed=allowed;break;}std::cout<<"[lp17] {\"kind\":\"jobOracleFailure\",\"stage\":\""<<job_stage<<"\",\"check\":\""<<fixed<<"\"}\n";Need(false);}++job_passes;Pass(id);}
const char* CoverageReason(const std::string& reason){for(const char* allowed:{"file-duration-uncovered","unconfirmed-interval-no-trusted-watermark"})if(reason==allowed)return allowed;return "other-redacted";}
std::string JobBytes(const std::filesystem::path& p){std::ifstream f(p,std::ios::binary);Need(static_cast<bool>(f));return {std::istreambuf_iterator<char>(f),{}};}
void JobWrite(const std::filesystem::path& p,const std::string& value){std::ofstream f(p,std::ios::binary);f<<value;Need(static_cast<bool>(f));}
void JobComparison(const std::filesystem::path& root){
 auto input=Encode(501,false,false,160,90,30,250);Shift(input,0);JobCheck(input.packets[250].is_key_frame&&input.packets[500].is_key_frame,"D08.input-keyframes");
 // CP fixture의 생성 규칙이다. 완성된 segment/binding/UTC/PTS를 사후 수정하지 않는다.
 for(std::size_t i=0;i<input.packets.size();++i){auto& o=*input.packets[i].observation;o.mono_before_ns=1000000000LL+i*1000000LL;o.mono_after_ns=o.mono_before_ns+1000;o.observed_utc_ns=1789200000000000000LL+i*1000000LL;}
 std::string input_canonical;
 for(const auto& p:input.packets){const auto& o=*p.observation;input_canonical+=p.track_id+"|"+std::to_string(p.pts)+"|"+std::to_string(p.dts)+"|"+std::to_string(p.is_key_frame)+"|"+o.source_generation+"|"+std::to_string(o.generation_order)+"|"+std::to_string(o.ordinal)+"|"+std::to_string(*o.pts_ns)+"|"+std::to_string(*o.dts_ns)+"|"+std::to_string(o.duration_ns.value_or(-1))+"|"+o.clock_process_id+"|"+std::to_string(o.mono_before_ns)+"|"+std::to_string(o.mono_after_ns)+"|"+std::to_string(o.observed_utc_ns)+"|"+Hash(std::string(reinterpret_cast<const char*>(p.payload.data()),p.payload.size()))+"\n";}
 std::cout<<"[lp17] {\"kind\":\"jobInput\",\"samples\":"<<input.packets.size()<<",\"canonicalSha256\":\""<<Hash(input_canonical)<<"\"}\n";
 Store s(root);auto w=Writer(s,input);for(const auto& p:input.packets)w->Push(p,0);w->Stop();auto sources=Sources(s);
 JobCheck(sources.size()==3&&sources[0].binding->samples.size()==250&&sources[1].binding->samples.size()==250&&sources[0].segment.mappings.size()==250&&sources[1].segment.mappings.size()==250,"D08.source-shape");
 auto retention=Retention(s);std::string id,expected_intent;unsigned job_index=0,ready_count=0,complete_count=0;auto previous=std::chrono::steady_clock::now();
 const auto expected_ready=root/"lp17-expected-ready";
 auto observe=[&](const char* stage,DerivedJobState expected,bool require_files,bool preserve_ready){
  job_stage="transition";for(const char* allowed:{"job_intent","job_files","job_ready","job_committed","job_complete"})if(std::string(stage)==allowed){job_stage=allowed;break;}
  fc::enabled=false;const auto now=std::chrono::steady_clock::now();const auto elapsed=std::chrono::duration_cast<std::chrono::microseconds>(now-previous).count();fc::Dump(stage);
  const auto oracle_begin=std::chrono::steady_clock::now();std::optional<DerivedJobRecordV1> job;JobCheck(s.catalog.FindDerivedJob(id,&job,nullptr)&&job&&job->state==expected,"D08.expected-state");
  JobCheck(SerializeDerivedJobIntent(job->intent)==expected_intent,"D08.canonical-intent");if(require_files)JobCheck(!job->files.empty(),"D08.files-receipt");
  const auto canonical=SerializeDerivedJobRecord(*job);DerivedJobRecordV1 parsed;JobCheck(!canonical.empty()&&ParseDerivedJobRecord(canonical,&parsed,nullptr)&&SerializeDerivedJobRecord(parsed)==canonical,"D08.canonical-record-roundtrip");
  if(preserve_ready)JobCheck(job->ready&&SerializeDerivedJobReady(*job->ready)==JobBytes(expected_ready),"D08.canonical-ready-preserved");
  if(expected==DerivedJobState::Ready){
   // CP01의 작업 종결과 요청 구간 전체 충족은 별개다. canonical roundtrip은 기존 coverage 계약도 검증한다.
   JobCheck(job->ready&&job->ready->verified_output,"D08.ready-verified-proof");
   std::cout<<"[lp17] {\"kind\":\"jobCoverage\",\"stage\":\"job_ready\",\"jobIndex\":"<<job_index<<",\"verifiedOutput\":"<<(job->ready->verified_output?"true":"false")<<",\"requestFullySatisfied\":"<<(job->ready->request_fully_satisfied?"true":"false")<<",\"unfulfilledCount\":"<<job->ready->unfulfilled.size()<<"}\n";
   for(std::size_t i=0;i<job->ready->unfulfilled.size();++i){const auto& u=job->ready->unfulfilled[i];const char* axis=u.axis=="original-pts-ns"?"original-pts-ns":u.axis=="request-ns"?"request-ns":"other-redacted";std::cout<<"[lp17] {\"kind\":\"jobCoverageGap\",\"stage\":\"job_ready\",\"jobIndex\":"<<job_index<<",\"index\":"<<i<<",\"axis\":\""<<axis<<"\",\"reason\":\""<<CoverageReason(u.reason)<<"\",\"start\":"<<u.start<<",\"end\":"<<u.end<<"}\n";}
   JobWrite(expected_ready,SerializeDerivedJobReady(*job->ready));++ready_count;
  }
  if(expected==DerivedJobState::Complete){JobCheck(s.catalog.RetentionSnapshot().durable_reservations.empty(),"D08.protection-released");++complete_count;}
  lp17::Observe(stage,3,&s.catalog);lp17::Owned fixture;for(const auto& source:sources){lp17::Segment(fixture,source.segment);if(source.binding)lp17::Binding(fixture,*source.binding);}lp17::Emit(stage,"fixture",fixture);
  const auto oracle_us=std::chrono::duration_cast<std::chrono::microseconds>(std::chrono::steady_clock::now()-oracle_begin).count();
  std::cout<<"[lp17] {\"kind\":\"jobTransition\",\"stage\":\""<<stage<<"\",\"jobIndex\":"<<job_index<<",\"expectedState\":"<<static_cast<int>(expected)<<",\"observedState\":"<<static_cast<int>(job->state)<<",\"canonicalSha256\":\""<<Hash(canonical)<<"\",\"canonicalBytes\":"<<canonical.size()<<",\"productElapsedUs\":"<<elapsed<<",\"oracleElapsedUs\":"<<oracle_us<<"}\n";
  previous=std::chrono::steady_clock::now();fc::enabled=true;
 };
 DerivedJobService service(s.catalog,s.journal,{root,30000,[&](auto stage,auto){
  switch(stage){case DerivedJobProgress::ReceiptDurable:observe("job_files",DerivedJobState::Intent,true,false);break;
   case DerivedJobProgress::ReadyDurable:observe("job_ready",DerivedJobState::Ready,true,false);break;
   case DerivedJobProgress::CommittedDurable:observe("job_committed",DerivedJobState::Committed,true,true);break;
   case DerivedJobProgress::CompleteDurable:observe("job_complete",DerivedJobState::Complete,true,true);break;default:break;}
 }});
 for(job_index=0;job_index<2;++job_index){job_stage="selection";DerivedRecordingSelection selected;JobCheck(SelectDerivedRecording(Reference(job_index,3000,4500),*Evidence(input),sources,nullptr,&selected,nullptr)&&selected.complete,"D08.selection-complete");DerivedJobIntentV1 intent;JobCheck(BuildDerivedJobIntent(selected,sources,8*1024*1024,10+job_index,&intent,nullptr),"D08.expected-intent-built");id=intent.job_id;expected_intent=SerializeDerivedJobIntent(intent);
  previous=std::chrono::steady_clock::now();fc::enabled=true;const auto admitted=retention->AdmitDerivedJob(s.catalog,intent,10+job_index);fc::enabled=false;JobCheck(admitted.accepted,"D08.admission");observe("job_intent",DerivedJobState::Intent,false,false);
  auto result=service.Run(id);job_stage="job_run_complete";fc::enabled=false;fc::Dump("job_run_tail");JobCheck(result.complete&&result.job&&result.job->ready&&s.catalog.RetentionSnapshot().durable_reservations.empty(),"D08.run-complete");
  for(const auto& output:result.job->ready->outputs){const auto location=s.catalog.FindSegmentMediaLocation(output.segment.segment_id);JobCheck(location.has_value()&&Hash(JobBytes(location->first/location->second))==output.segment.checksum_sha256,"D08.actual-output-hash");}
 }
 job_stage="job_final";JobCheck(ready_count==2&&complete_count==2,"CP01.actual-ready-complete-shape-canonical-files-reservation");
 std::size_t journal_bytes=0;{const auto replay=s.journal.Replay();for(const auto& m:replay.mutations)journal_bytes+=SerializeRecordingMutationV1(m).size()+1;}
 JobCheck(journal_bytes>1024*1024,"CP02.two-jobs-over-1MiB-canonical-transitions");lp17::Observe("job_finished",3,&s.catalog);lp17::Provenance(s.journal);
}
}
int main(int argc,char** argv){gst_init(nullptr,nullptr);try{if(argc!=3)throw std::runtime_error("LP17_ARGUMENTS");const std::string arm=argv[2];if(arm!="B"&&arm!="C")throw std::runtime_error("LP17_ARM");lp17::cache_off=arm=="C";if(std::filesystem::exists(argv[1]))throw std::runtime_error("LP17_STORE_EXISTS");lp17::Observe("job_before",0);JobComparison(argv[1]);lp17::Observe("job_released",0);std::cout<<"[lp17] {\"kind\":\"summary\",\"mode\":\"job\",\"arm\":\""<<arm<<"\",\"samples\":501,\"count\":2,\"pass\":"<<job_passes<<",\"fail\":0}\n";return 0;}catch(...){fc::enabled=false;std::cout<<"[lp17] {\"kind\":\"error\",\"code\":\"LP17_JOB_ORACLE_OR_SETUP\"}\n";return 1;}}

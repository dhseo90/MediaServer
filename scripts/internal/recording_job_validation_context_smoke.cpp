// 파일 용도: 실제 소형 writer/service에서 얻은 증거를 사용한다. 전체 service fault 묶음은 실행하지 않는다.
#define main recording_context_unused_service_main
#include "recording_derived_job_service_smoke.cpp"
#undef main
#include "recording_job_validation_context_counter.h"
#include <map>
namespace {
int context_pass=0,context_fail=0;bool first_strict=true;
void ContextNeed(bool ok){if(!ok)throw std::runtime_error("LP18_CONTEXT_SETUP");}
void ContextCheck(bool ok,const std::string& label){++(ok?context_pass:context_fail);std::cout<<(ok?"[pass] ":"[fail] ")<<label<<'\n';}
template<class F>intent_context_probe::Counts Count(F call){
 intent_context_probe::counts={};intent_context_probe::enabled=true;call();intent_context_probe::enabled=false;
 const auto result=intent_context_probe::counts;first_strict=first_strict&&result.validate>0&&result.restore>0&&result.json>0;return result;
}
void Cost(const intent_context_probe::Counts& c,const std::string& operation){
 std::cout<<"[context-counts] operation="<<operation<<" validate="<<c.validate<<" restore="<<c.restore<<" json="<<c.json<<'\n';
 ContextCheck(c.validate==1&&c.restore==1&&c.json==1,"LP18-I02 single strict context "+operation);
}
void RunContext(const std::filesystem::path& root){
 using namespace recording;Store store(root);auto input=Encode(30,false,false);Shift(input,7000000000ULL);const auto intent=Prepare(store,input);
 DerivedJobService service(store.catalog,store.journal,{store.root,30000,{}});
 intent_context_probe::watch_build=true;const auto result=service.Run(intent.job_id);intent_context_probe::watch_build=false;
 ContextNeed(result.complete&&result.job&&result.job->ready);
 ContextCheck(CompletedOracle(store,*result.job,false),"LP18-I01 actual Complete retains files hashes commit and protection release");
 const auto built=intent_context_probe::build_counts;
 ContextCheck(intent_context_probe::builds==1&&built.validate>0&&built.restore>0&&built.json>0,"LP18-I01 actual BuildReady executes nonzero strict work once");
 Cost(built,"build-ready");
 std::string error,serialized_intent;DerivedJobIntentV1 parsed_intent;
 const auto expected_intent=SerializeDerivedJobIntent(intent);ContextNeed(!expected_intent.empty());
 const auto intent_serialize=Count([&]{serialized_intent=SerializeDerivedJobIntent(intent);});
 bool intent_ok=false;const auto intent_parse=Count([&]{intent_ok=ParseDerivedJobIntent(expected_intent,&parsed_intent,&error);});
 ContextCheck(intent_ok&&serialized_intent==expected_intent&&SerializeDerivedJobIntent(parsed_intent)==expected_intent,"LP18-I01 public Intent canonical roundtrip preserved");
 Cost(intent_serialize,"serialize-intent");Cost(intent_parse,"parse-intent");
 std::map<DerivedJobState,std::pair<DerivedJobRecordV1,std::string>> records;
 for(const auto& mutation:store.journal.Replay().mutations){
  if(mutation.entity_id!=intent.job_id)continue;DerivedJobRecordV1 record;
  if(ParseDerivedJobRecord(mutation.payload_json,&record,&error))records.emplace(record.state,std::make_pair(std::move(record),mutation.payload_json));
 }
 ContextNeed(records.count(DerivedJobState::Intent)&&records.count(DerivedJobState::Ready)&&records.count(DerivedJobState::Committed)&&records.count(DerivedJobState::Complete));
 auto failed=records.at(DerivedJobState::Intent).first;failed.state=DerivedJobState::Failed;failed.failure_reason="context-fixture-failed";failed.cleaned_at_ms=20;
 records.emplace(DerivedJobState::Failed,std::make_pair(failed,SerializeDerivedJobRecord(failed)));ContextNeed(!records.at(DerivedJobState::Failed).second.empty());
 for(const auto& entry:std::vector<std::pair<DerivedJobState,std::string>>{{DerivedJobState::Intent,"intent"},{DerivedJobState::Failed,"failed"},{DerivedJobState::Ready,"ready"},{DerivedJobState::Committed,"committed"},{DerivedJobState::Complete,"complete"}}){
  const auto& record=records.at(entry.first).first;const auto& expected=records.at(entry.first).second;std::string encoded;DerivedJobRecordV1 decoded;bool accepted=false;
  const auto serialize=Count([&]{encoded=SerializeDerivedJobRecord(record);});
  const auto parse=Count([&]{accepted=ParseDerivedJobRecord(expected,&decoded,&error);});
  ContextCheck(accepted&&!encoded.empty()&&encoded==expected&&SerializeDerivedJobRecord(decoded)==expected,"LP18-I01 record canonical roundtrip "+entry.second);
  Cost(serialize,"serialize-record-"+entry.second);Cost(parse,"parse-record-"+entry.second);
 }
 ContextCheck(first_strict,"LP18-I01 every measured public call retains first strict work");
 auto same_intent=intent;ContextNeed(!SerializeDerivedJobIntent(same_intent).empty());same_intent.job_id+="-changed";
 ContextCheck(SerializeDerivedJobIntent(same_intent).empty(),"LP18-I03 same-address changed Intent cannot reuse prior validation");
 auto same_record=*result.job;const auto canonical=SerializeDerivedJobRecord(same_record);ContextNeed(!canonical.empty());
 const auto manifest=same_record.ready->manifest_sha256;ContextNeed(!manifest.empty());same_record.ready->manifest_sha256[0]=manifest[0]=='a'?'b':'a';
 auto tampered=canonical;const auto at=tampered.find(manifest);ContextNeed(at!=std::string::npos);tampered.replace(at,manifest.size(),same_record.ready->manifest_sha256);DerivedJobRecordV1 cleared=*result.job;
 ContextCheck(SerializeDerivedJobRecord(same_record).empty()&&!ParseDerivedJobRecord(tampered,&cleared,&error)&&cleared.intent.job_id.empty()&&!cleared.ready,"LP18-I03 same-address manifest change rejects and Parse clears output");
 auto receipt=*result.job;ContextNeed(receipt.files.size()==2);receipt.files[1].device=receipt.files[0].device;receipt.files[1].inode=receipt.files[0].inode;
 ContextCheck(SerializeDerivedJobRecord(receipt).empty(),"LP18-I03 receipt alias remains rejected");
 auto before_ready=records.at(DerivedJobState::Ready).first;const auto ready=*before_ready.ready;before_ready.state=DerivedJobState::Intent;before_ready.ready.reset();
 DerivedRemuxResult remux;remux.verified_output=ready.verified_output;remux.request_fully_satisfied=ready.request_fully_satisfied;remux.unfulfilled=ready.unfulfilled;
 ContextNeed(RestoreDerivedJobSelection(before_ready.intent,&remux.selection,&error));std::vector<std::int64_t> orders;
 for(const auto& output:ready.outputs){remux.outputs.push_back(output.provenance);orders.push_back(output.segment.order_sequence);}
 DerivedJobRecordV1 reconstructed;
 ContextCheck(BuildDerivedJobReady(before_ready,remux,orders,ready.ready_at_ms,&reconstructed,&error)&&SerializeDerivedJobRecord(reconstructed)==records.at(DerivedJobState::Ready).second,"LP18-I03 reconstructed actual remux retains Ready canonical positive control");
 for(const std::string kind:{"au","coverage"}){
  auto changed=remux;ContextNeed(!changed.outputs.empty()&&!changed.outputs[0].access_units.empty());
  if(kind=="au")++changed.outputs[0].access_units[0].original_pts_ns;else changed.outputs[0].request_fully_satisfied=!changed.outputs[0].request_fully_satisfied;
  DerivedJobRecordV1 output=*result.job;
  ContextCheck(!BuildDerivedJobReady(before_ready,changed,orders,ready.ready_at_ms,&output,&error)&&output.intent.job_id.empty()&&!output.ready,"LP18-I03 BuildReady rejects altered "+kind+" and clears output");
 }
 {
  auto wrong=remux;wrong.selection.reference.reference_id+="-foreign";DerivedJobRecordV1 output=*result.job;
  ContextCheck(!BuildDerivedJobReady(*result.job,wrong,orders,ready.ready_at_ms,&output,&error)&&error=="job-ready-input"&&output.intent.job_id.empty()&&!output.ready,"LP18-I03 BuildReady input shape failure precedes selection validation");
  output=*result.job;
  ContextCheck(!BuildDerivedJobReady(before_ready,wrong,orders,ready.ready_at_ms,&output,&error)&&error=="job-ready-selection-conflict"&&output.intent.job_id.empty()&&!output.ready,"LP18-I03 BuildReady selection mismatch preserves failure mapping");
 }
 {
  auto invalid=expected_intent;const auto found=invalid.find(intent.job_id);ContextNeed(found!=std::string::npos);invalid.replace(found,intent.job_id.size(),"forged-context-job");DerivedJobIntentV1 output=intent;
  ContextCheck(!ParseDerivedJobIntent(invalid,&output,&error)&&error=="job-identity-conflict"&&output.job_id.empty(),"LP18-I03 public Intent parse preserves strict error and clears output");
 }
}
}
int main(int argc,char** argv){
 if(argc!=2)return 2;gst_init(nullptr,nullptr);
 try{RunContext(std::filesystem::path(argv[1])/"context");std::cout<<"[summary] LP18 pass="<<context_pass<<" fail="<<context_fail<<'\n';return context_fail?1:0;}
 catch(...){std::cout<<"[setup-or-oracle-fail] LP18 fixed-context-fixture-error\n";return 2;}
}

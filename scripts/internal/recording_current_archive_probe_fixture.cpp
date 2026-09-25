// 파일 용도: 진단 검증 전용: 실제 writer와 typed Catalog admission/failure API만 사용한다.
#define main recording_service_fixture_unused_main
#include "recording_derived_job_service_smoke.cpp"
#undef main
#include "recording/recording_runtime_composition.h"
static void CompletenessFixture(const std::filesystem::path& root,const std::string& mode){
 const bool proofMode=mode=="proof-legacy"||mode=="proof-native"||mode=="proof-candidate";
 const bool fractional=mode=="file";Store store(root/"recordings");auto input=proofMode?Encode(90,false,false,160,90,30,30):Encode(fractional?60:30,false,fractional);Shift(input,7000000000ULL);
 recording::GStreamerSegmentWriter::Options options(store.root,fractional?10000:1000);options.managed_journal=&store.journal;options.managed_catalog=&store.catalog;options.managed_store_id="probe-store";
 recording::GStreamerSegmentWriter writer(options);std::string error;
 if(!writer.Start("probe-channel","unused",input.descriptor,[](auto,auto,auto*){return false;},&error))throw std::runtime_error("complete-writer");
 for(const auto& p:input.packets)writer.Push(p,0);writer.Stop();
 std::vector<recording::DerivedSourceEvidence> sources;for(const auto& s:store.Segments())sources.push_back({s,store.catalog.FindSourceBinding(s.segment_id),false});
 analysis::DecodedIntervalCollector collector;
 for(std::size_t i=0;i<input.packets.size();++i){if((mode=="selection"||mode=="redacted")&&i==5)continue;const auto& p=input.packets[i];analysis::DecodedIntervalEvidence e;e.analysis_pts_ns=p.pts;e.duration_ns=p.observation->duration_ns;
  // 합성 직접 구간은 디코더 관측이 아닌 네이티브 파일 길이 충족 범위를 독립적으로 검사한다.
  if(fractional&&i+1<input.packets.size())e.duration_ns=input.packets[i+1].pts-p.pts;
  e.association={analysis::SourceAssociationQuality::TimestampMatch,analysis::OriginalSampleIdentity{p.observation->source_generation,p.observation->generation_order,p.observation->ordinal,p.track_id,*p.observation->pts_ns}};collector.Append(std::move(e));}
 recording::RecordingConsumerReferenceV1 ref;ref.reference_id="job-service-ref";ref.kind="event";ref.owner_id="job-service-event";ref.source_id="probe-channel";ref.channel_id="probe-channel";ref.analysis_namespace="complete-control";ref.analysis_track_id="track-1";ref.association_quality="timestamp-match";ref.original=recording::RecordingConsumerOriginalV1{"probe-generation-a",1,1,"video-0",7000000000ULL};ref.request=recording::RecordingConsumerRequestV1{"media-pts-ms",7000,fractional?8001:8500,0,0};
 recording::DerivedRecordingSelection selection;recording::DerivedJobIntentV1 intent;
 if(!recording::SelectDerivedRecording(ref,*collector.Snapshot(ref.analysis_namespace),sources,nullptr,&selection,&error,mode=="proof-native"))throw std::runtime_error("complete-selection");
 if(mode=="redacted"){selection.reason="private canary /private/location";for(auto& s:selection.slices)if(s.state!=recording::DerivedSliceState::Confirmed)s.reason="unconfirmed-interval-no-trusted-watermark /private/canary";}
 if(!recording::BuildDerivedJobIntent(selection,sources,8*1024*1024,10,&intent,&error))throw std::runtime_error("complete-intent");
 recording::RetentionCoordinator retention(store.catalog,[&]{return store.catalog.RetentionSnapshot();},[](auto* bytes,auto*){*bytes=1024ULL*1024*1024;return true;},[](const auto&,auto*){return false;},{0,1,store.root});
 if(!retention.UpdateChannelPolicy("probe-channel",{1024ULL*1024*1024,0,1024ULL*1024*1024,0},&error)||!retention.AdmitDerivedJob(store.catalog,intent,10).accepted)throw std::runtime_error("complete-admit");
 if(proofMode){
  for(const auto& source:intent.sources){const auto binding=store.catalog.FindSourceBinding(source.segment.segment_id);if(!binding||!binding->file_evidence||!recording::ValidateRecordingFileEvidence(*binding,&error))throw std::runtime_error("proof-fixture-precondition");if(bool(source.binding.file_evidence)!=(mode=="proof-native"))throw std::runtime_error("proof-intent-precondition");}
  if(!store.catalog.FailDerivedJobAfterCleanup(intent.job_id,intent.attempt_id,"job-remux: file-original-timestamp-mismatch",20,&error))throw std::runtime_error("proof-failure-transition");
  if(mode=="proof-candidate"){
   auto segment=intent.sources.front().segment;auto binding=*store.catalog.FindSourceBinding(segment.segment_id);const auto original=store.root/(segment.channel_id+"/"+segment.segment_id+".mp4");
   segment.segment_id="unselected-proofless-control";segment.order_request_id="unselected-proofless-order";binding.segment_id=segment.segment_id;binding.file_evidence.reset();
   recording::RecordingOrderReservationV1 order;if(!store.journal.ReserveRecordingOrder(segment.store_id,segment.order_request_id,segment.segment_id,segment.channel_id,&order,&error))throw std::runtime_error("candidate-order");segment.order_sequence=order.sequence;
   const auto target=store.root/(segment.channel_id+"/"+segment.segment_id+".mp4");std::filesystem::copy_file(original,target);
   if(!store.catalog.FinalizeBoundSegmentV2(segment,binding,target.string(),&error))throw std::runtime_error("candidate-finalize");
  }
  std::cout<<"{\"fixtureTypedReadback\":true}\n";return;
 }
 recording::DerivedJobService service(store.catalog,store.journal,{store.root,30000,{}});const auto result=service.Run(intent.job_id);
 if(!result.complete||!result.job||result.job->state!=recording::DerivedJobState::Complete||!result.job->ready||!result.job->ready->verified_output)throw std::runtime_error("complete-run");
 const bool full=mode=="full";if(result.job->ready->request_fully_satisfied!=full||selection.complete!=(full||fractional))throw std::runtime_error("complete-classification");
 std::cout<<"{\"fixtureTypedReadback\":true}\n";
}
int ArchiveFixtureMain(int argc,char** argv){
 if(argc!=3)return 2;
 try{
  gst_init(nullptr,nullptr);const std::string mode=argv[2];
  if(mode=="ready"||mode=="committed"){
   Store store(std::filesystem::path(argv[1])/"recordings");auto input=Encode(30,false,false);Shift(input,7000000000ULL);const auto job=Prepare(store,input);
   const auto target=mode=="ready"?recording::DerivedJobProgress::ReadyDurable:recording::DerivedJobProgress::CommittedDurable;
   recording::DerivedJobService service(store.catalog,store.journal,{store.root,30000,[&](auto stage,std::size_t){if(stage==target){std::cout<<"{\"fixtureTypedReadback\":true}"<<std::endl;::_exit(0);}}});
   service.Run(job.job_id);throw std::runtime_error("fixture-state-not-observed");
  }
  if(mode=="full"||mode=="file"||mode=="selection"||mode=="redacted"||mode=="proof-legacy"||mode=="proof-native"||mode=="proof-candidate"){CompletenessFixture(argv[1],mode);return 0;}
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
int main(int argc,char** argv){
 if(argc!=3)return 2;
 const std::string requested=argv[2];
 if(requested.rfind("b-",0)!=0)return ArchiveFixtureMain(argc,argv);
 std::string mode=requested.substr(2);char* args[]={argv[0],argv[1],mode.data()};
 const int result=ArchiveFixtureMain(argc,args);if(result)return result;
 try{
  recording::RecordingRuntimeStorage storage(std::filesystem::path(argv[1])/"recordings");std::string error;
  if(!storage.Open(&error)||!std::filesystem::exists(std::filesystem::path(argv[1])/"recordings/recording-generation.json"))return 1;
  return 0;
 }catch(...){return 1;}
}

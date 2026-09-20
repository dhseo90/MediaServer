// LP18-J01~04: encoder 없는 기존 source/selection/Intent→Failed 계약의 소유 검사.
#include "recording/recording_derived_job.h"
#include "recording/recording_derived_selection.h"
#include "recording/recording_catalog.h"
#include "recording/retention_coordinator.h"
#include <cstdint>
#include <fstream>
#include <iostream>
#include <stdexcept>
using namespace recording;
namespace ownership_probe {void ResetJobPoolCounts();std::size_t JobPoolLookups();std::size_t JobPoolComparisons();}
namespace {
int passed=0,failed=0;
void Need(bool ok){if(!ok)throw std::runtime_error("LP18_JOB_SETUP");}
void Check(bool ok,const char* label){++(ok?passed:failed);std::cout<<(ok?"[pass] ":"[fail] ")<<label<<'\n';}
[[maybe_unused]] const DerivedJobRecordV1* Job(const DerivedJobRecordV1& value){return &value;}
[[maybe_unused]] const DerivedJobRecordV1* Job(const DerivedJobRecordV1* value){return value;}
[[maybe_unused]] const DerivedJobRecordV1* Job(const std::shared_ptr<const DerivedJobRecordV1>& value){return value.get();}
RecordingCatalog::DerivedJobHandle JobOwned(RecordingCatalog& catalog,const std::string& id){RecordingCatalog::DerivedJobHandle out;Need(catalog.AcquireDerivedJobOwnedLocked(id,&out,nullptr)&&out);return out;}
std::string Bytes(const std::filesystem::path& path){std::ifstream in(path,std::ios::binary);Need(static_cast<bool>(in));return {std::istreambuf_iterator<char>(in),{}};}
RecordingCatalog::Options Options(const std::filesystem::path& root,bool sql=true){RecordingCatalog::Options o(root/"recording-catalog.sqlite3",root,sql);o.enable_v2_storage=true;return o;}
struct Input {DerivedSourceEvidence source;DerivedJobIntentV1 intent;};
Input Fixture(){
 Input f;auto& s=f.source.segment;s.segment_id="segment";s.source_id="source";s.channel_id="channel";s.store_id="store";s.order_request_id="order";s.order_sequence=1;s.media_epoch_id="epoch";s.media_end_pts=20000000;s.container="mp4";s.video_codecs={"h264"};s.audio_omitted_reason="source-no-audio";s.size_bytes=12;s.checksum_sha256=std::string(64,'a');s.created_at_ms=1;s.finalized_at_ms=2;s.mappings={{"media-server.recording-utc-mapping.v1","map",0,20000000,"server-observation",100000000,120000000,1,"observed"}};
 RecordingSourceBindingV1 b;b.segment_id=s.segment_id;b.source_id=s.source_id;b.channel_id=s.channel_id;b.store_id=s.store_id;b.media_epoch_id=s.media_epoch_id;b.source_generation="gen";b.generation_order=1;b.track_id="video/0";b.samples={{1,0},{2,10000000}};b.last_accepted_ordinal=2;f.source.binding=b;
 RecordingConsumerReferenceV1 ref;ref.reference_id="request";ref.kind="event";ref.owner_id="event";ref.source_id=s.source_id;ref.channel_id=s.channel_id;ref.analysis_namespace="tap-r0";ref.analysis_track_id="track-1";ref.association_quality="timestamp-match";ref.original=RecordingConsumerOriginalV1{"gen",1,1,"video/0",0};ref.request=RecordingConsumerRequestV1{"media-pts-ms",0,20,0,0};
 analysis::DecodedIntervalCollector collector;for(int i=0;i<2;++i){analysis::DecodedIntervalEvidence e;e.analysis_pts_ns=i*10000000;e.duration_ns=10000000;e.association={analysis::SourceAssociationQuality::TimestampMatch,analysis::OriginalSampleIdentity{"gen",1,static_cast<std::uint64_t>(i+1),"video/0",static_cast<std::uint64_t>(i*10000000)}};collector.Append(e);}
 DerivedRecordingSelection selection;std::string error;Need(SelectDerivedRecording(ref,*collector.Snapshot("tap-r0"),{f.source},nullptr,&selection,&error));Need(BuildDerivedJobIntent(selection,{f.source},4096,10,&f.intent,&error));return f;
}
#if LP18_JOB_SHARED
void Safety(RecordingCatalog& live,RecordingJournal& journal,const std::filesystem::path& root,const RecordingJournalReplayResult& history,const RecordingMutationV1& transition){
 using Pool=RecordingCatalog::DerivedJobPool;const auto id=transition.entity_id;std::string error;DerivedJobRecordV1 terminal;Need(ParseDerivedJobRecord(transition.payload_json,&terminal,&error));const auto canonical=SerializeDerivedJobRecord(terminal);
 const auto seed=[&](RecordingCatalog& catalog){for(const auto& m:history.mutations)Need(catalog.ApplyMutationLocked(m,false,&error));};
 for(const char* label:{"null","different-content","different-id"}){RecordingCatalog target(journal,Options(root));seed(target);Pool pool;auto changed=terminal;changed.failure_reason="other-fixture";RecordingCatalog::DerivedJobHandle candidate=std::make_shared<const DerivedJobRecordV1>(changed);const std::string name=label;if(name=="null")candidate.reset();pool.emplace(name=="different-id"?"foreign":id,candidate);const bool ok=target.ApplyMutationLocked(transition,false,&error,nullptr,{},nullptr,&pool);const auto current=JobOwned(target,id);
  Check(ok&&current&&current!=candidate&&SerializeDerivedJobRecord(*current)==canonical,name=="null"?"LP18-J03 null job pool uses independent strict value":name=="different-content"?"LP18-J03 different-content job pool uses independent strict value":"LP18-J03 different-id job pool uses independent strict value");}
 {RecordingCatalog target(journal,Options(root));seed(target);const auto payload=transition.payload_json;RecordingCatalog::PreparedDerivedMutation prepared(&target,payload);Need(target.ApplyDerivedJobMutationLocked(transition,&error,false,&prepared));const auto original=JobOwned(target,id);target.derived_jobs_.at(id)=std::make_shared<const DerivedJobRecordV1>(*original);
  Check(!target.ApplyDerivedJobMutationLocked(transition,&error,true,&prepared)&&target.derived_jobs_.at(id).WarmOwned()!=original&&SerializeDerivedJobRecord(*JobOwned(target,id))==SerializeDerivedJobRecord(*original),"LP18-J02 equal-content replacement invalidates Prepared prior ownership");}
 {auto owner=std::make_unique<RecordingCatalog>(journal,Options(root));seed(*owner);Need(owner->ApplyMutationLocked(transition,false,&error));RecordingCatalog target(journal,Options(root));seed(target);auto retained=JobOwned(*owner,id);std::weak_ptr<const DerivedJobRecordV1> weak=retained;Need(target.ApplyMutationLocked(transition,false,&error,nullptr,{},nullptr,&owner->derived_jobs_));const bool alias=target.derived_jobs_.at(id).WarmOwned()==retained;owner.reset();retained.reset();Check(alias&&!weak.expired()&&SerializeDerivedJobRecord(*JobOwned(target,id))==canonical,"LP18-J01 shared job survives pool owner destruction");}
 {const auto current=JobOwned(live,id);const auto shadow=JobOwned(*live.checkpoint_cache_->shadow,id);ownership_probe::ResetJobPoolCounts();Need(live.Checkpoint(&error));Check(ownership_probe::JobPoolLookups()==0&&ownership_probe::JobPoolComparisons()==0&&live.derived_jobs_.at(id).WarmOwned()==current&&live.checkpoint_cache_->shadow->derived_jobs_.at(id).WarmOwned()==shadow,"LP18-J01 no-op checkpoint preserves owned readers without pool comparisons");}
 {const auto pool_reader=JobOwned(live,id);RecordingCatalog target(journal,Options(root));seed(target);ownership_probe::ResetJobPoolCounts();Need(target.ApplyMutationLocked(transition,false,&error,nullptr,{},nullptr,&live.derived_jobs_));Check(ownership_probe::JobPoolLookups()==1&&ownership_probe::JobPoolComparisons()==1&&target.derived_jobs_.at(id).WarmOwned()==pool_reader,"LP18-J01 newly applied job compares only matching current pool entry");ownership_probe::ResetJobPoolCounts();Need(target.ApplyMutationLocked(transition,false,&error,nullptr,{},nullptr,&live.derived_jobs_));Check(ownership_probe::JobPoolLookups()==0&&ownership_probe::JobPoolComparisons()==0,"LP18-J01 duplicate job mutation performs no pool comparison");}
 {RecordingCatalog target(journal,Options(root));for(const auto& m:history.mutations)Need(target.ApplyMutationLocked(m,false,&error,nullptr,{},nullptr,&live.derived_jobs_));Check(target.derived_jobs_.at(id).WarmOwned()!=live.derived_jobs_.at(id).WarmOwned()&&target.derived_jobs_.at(id).state==DerivedJobState::Intent,"LP18-J03 latest terminal pool cannot replace historical Intent");auto invalid=transition;invalid.mutation_type=RecordingMutationType::DerivedJobComplete;Check(!target.ApplyMutationLocked(invalid,false,&error,nullptr,{},nullptr,&live.derived_jobs_)&&target.derived_jobs_.at(id).state==DerivedJobState::Intent,"LP18-J03 matching job pool cannot bypass strict state validation");}
 {const auto saved=live.derived_jobs_.at(id);live.derived_jobs_.at(id)={};std::optional<DerivedJobRecordV1> one;std::vector<DerivedJobRecordV1> all,active;bool more=false;const bool denied=!live.FindDerivedJob(id,&one,&error)&&!one&&!live.SnapshotDerivedJobs(&all,&error)&&all.empty()&&!live.SnapshotActiveDerivedJobs(1,&active,&more,&error)&&active.empty()&&!more&&!live.RetentionSnapshot().authoritative&&live.DerivedJobProtectsLocked("segment");live.derived_jobs_.at(id)=saved;live.derived_job_state_authoritative_=true;Check(denied,"LP18-J03 null resident job rejects snapshots and retention authority");}
}
#endif
void Run(const std::filesystem::path& root){
 const auto input=Fixture();const auto id=input.intent.job_id;std::string expected,durable,error;
 {RecordingJournal journal(RecordingJournal::ManagedOptions{root,"store"});Need(journal.Open(&error));RecordingCatalog catalog(journal,Options(root));Need(catalog.Open(&error));RecordingOrderReservationV1 order;Need(journal.ReserveRecordingOrder("store","order","segment","channel",&order,&error));Need(order.sequence==1);std::filesystem::create_directories(root/"channel");Need(WriteContainedFileDurably(root,root/"channel/segment.mp4","0123456789ab",&error));Need(catalog.FinalizeBoundSegmentV2(input.source.segment,*input.source.binding,(root/"channel/segment.mp4").string(),&error));bool inserted=false;Need(catalog.BeginDerivedJobIntent(input.intent,&inserted,&error));Need(inserted);
  const auto initial=SerializeDerivedJobRecord(*JobOwned(catalog,id));DerivedJobRecordV1 parsed;Check(ParseDerivedJobRecord(initial,&parsed,&error)&&SerializeDerivedJobRecord(parsed)==initial&&catalog.DerivedJobProtectsLocked("segment"),"LP18-J03 initial canonical and active source protection preserved");
  std::optional<DerivedJobRecordV1> found;Need(catalog.FindDerivedJob(id,&found,&error)&&found.has_value());found->intent.sources[0].binding.samples[0].pts_ns=11;
  Check(SerializeDerivedJobRecord(*JobOwned(catalog,id))==initial,"LP18-J03 FindDerivedJob returns independent value");
  std::vector<DerivedJobRecordV1> all,active;bool more=false;Need(catalog.SnapshotDerivedJobs(&all,&error)&&all.size()==1);Need(catalog.SnapshotActiveDerivedJobs(1,&active,&more,&error)&&active.size()==1&&!more);all[0].intent.selection_json="{}";active[0].intent.sources[0].binding.samples.clear();
  Check(SerializeDerivedJobRecord(*JobOwned(catalog,id))==initial,"LP18-J03 full and active snapshots return independent values");
  const auto intent_history=journal.Replay();DerivedJobRecordV1 next=*JobOwned(catalog,id);next.state=DerivedJobState::Failed;next.failure_reason="fixture-no-files";next.cleaned_at_ms=5;const auto payload=SerializeDerivedJobRecord(next);Need(!payload.empty());RecordingMutationV1 mutation;mutation.mutation_type=RecordingMutationType::DerivedJobFailed;mutation.entity_id=id;mutation.payload_json=payload;
  RecordingCatalog::PreparedDerivedMutation prepared(&catalog,payload);Need(catalog.ApplyDerivedJobMutationLocked(mutation,&error,false,&prepared));Need(static_cast<bool>(prepared.record));const auto candidate_address=reinterpret_cast<std::uintptr_t>(&*prepared.record);
  prepared.owner=nullptr;const auto before=Bytes(journal.path());const bool rejected=!catalog.ApplyDerivedJobMutationLocked(mutation,&error,true,&prepared);prepared.owner=&catalog;
  Check(rejected&&SerializeDerivedJobRecord(*JobOwned(catalog,id))==initial&&Bytes(journal.path())==before,"LP18-J03 foreign Prepared owner rejected without transition");
  Need(catalog.AppendAndApplyLocked(mutation,&error,&prepared));const auto published=catalog.derived_jobs_.at(id).WarmOwned();Need(bool(published));expected=SerializeDerivedJobRecord(*published);
  Check(candidate_address==reinterpret_cast<std::uintptr_t>(published.get())&&expected==payload,"LP18-J02 validated record is published as the same owned object");
  Check(Job(prepared.prior)&&SerializeDerivedJobRecord(*Job(prepared.prior))==initial,"LP18-J02 Prepared prior retains pre-publication canonical value");
  Check(!catalog.ApplyDerivedJobMutationLocked(mutation,&error,true,&prepared)&&SerializeDerivedJobRecord(*JobOwned(catalog,id))==expected,"LP18-J03 consumed Prepared cannot apply twice");
  int owner=0;Need(catalog.BindDerivedService(&owner));auto invalid=next;invalid.state=DerivedJobState::Ready;const auto failed_bytes=Bytes(journal.path());
  Check(!catalog.UpdateDerivedJob(&owner,invalid,&error)&&Bytes(journal.path())==failed_bytes&&SerializeDerivedJobRecord(*JobOwned(catalog,id))==expected,"LP18-J03 invalid terminal transition preserves state and bytes");catalog.UnbindDerivedService(&owner);
  Check(!catalog.derived_service_owner_&&!catalog.DerivedJobProtectsLocked("segment")&&catalog.RetentionSnapshot().durable_reservations.empty(),"LP18-J03 terminal protection and service owner released");
  const auto warm_reader=JobOwned(catalog,id);Need(catalog.Checkpoint(&error));Need(catalog.checkpoint_cache_&&catalog.checkpoint_cache_->shadow);
  const auto warm_shadow=catalog.checkpoint_cache_->shadow->derived_jobs_.at(id).WarmOwned();Check(warm_reader==warm_shadow&&warm_shadow&&SerializeDerivedJobRecord(*warm_shadow)==expected,"LP18-J01 checkpoint shares warm owned job reader");
#if LP18_JOB_SHARED
  Safety(catalog,journal,root,intent_history,journal.Replay().mutations.back());
#else
  (void)intent_history;
#endif
  durable=Bytes(journal.path());std::string replay;for(const auto& m:journal.Replay().mutations)replay+=SerializeRecordingMutationV1(m)+"\n";
  Check(replay==durable&&ParseDerivedJobRecord(expected,&parsed,&error)&&SerializeDerivedJobRecord(parsed)==expected,"LP18-J04 full journal bytes and terminal record roundtrip preserved");
 }
 for(bool sql:{true,false}){RecordingJournal journal(RecordingJournal::ManagedOptions{root,"store"});Need(journal.Open(&error));RecordingCatalog catalog(journal,Options(root,sql));Need(catalog.Open(&error));std::optional<DerivedJobRecordV1> found;const bool ok=catalog.FindDerivedJob(id,&found,&error)&&found&&SerializeDerivedJobRecord(*found)==expected&&Bytes(journal.path())==durable&&!catalog.DerivedJobProtectsLocked("segment")&&catalog.catalog_mode_==(sql?"sqlite-primary":"jsonl-fallback");Check(ok,sql?"LP18-J04 SQLite reopen preserves terminal canonical and release":"LP18-J04 JSONL reopen preserves terminal canonical and release");}
}
}
int main(int argc,char** argv){if(argc!=2)return 2;try{Run(std::filesystem::path(argv[1])/"job");std::cout<<"[summary] LP18 pass="<<passed<<" fail="<<failed<<'\n';return failed?1:0;}catch(...){std::cout<<"[setup-or-oracle-fail] LP18 fixed-job-fixture-error\n";return 2;}}

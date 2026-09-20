// 상세 typed/journal 상주의 자동 종료를 관측한다. encoder 없는 기존 job fixture 입력을 재사용한다.
#include "recording/recording_derived_job.h"
#include "recording/recording_derived_selection.h"
#include "recording/recording_catalog.h"
#include "recording/retention_coordinator.h"
#include "recording/recording_timeline.h"
#include "recording_journal_location_counter.h"
#include <fstream>
#include <iostream>
#include <stdexcept>
#ifndef LP18_TYPED_LIFETIME
#define LP18_TYPED_LIFETIME 0
#endif
#if LP18_TYPED_LIFETIME
#include "recording_catalog_comparison_ownership.h"
#endif
using namespace recording;
namespace {
int passed=0,failed=0;
void Need(bool value){if(!value)throw std::runtime_error("LP18_TYPED_SETUP");}
void Check(bool value,const char* label){++(value?passed:failed);std::cout<<(value?"[pass] ":"[fail] ")<<label<<'\n';}
std::string Bytes(const std::filesystem::path& file){std::ifstream in(file,std::ios::binary);Need(static_cast<bool>(in));return {std::istreambuf_iterator<char>(in),{}};}
RecordingCatalog::Options Options(const std::filesystem::path& root){RecordingCatalog::Options out(root/"recording-catalog.sqlite3",root,true);out.enable_v2_storage=true;return out;}
RecordingCatalog::DerivedJobHandle OwnedJob(RecordingCatalog& catalog,const std::string& id){
#if LP18_TYPED_LIFETIME
 RecordingCatalog::DerivedJobHandle out;Need(catalog.AcquireDerivedJobOwnedLocked(id,&out,nullptr)&&out);return out;
#else
 const auto found=catalog.derived_jobs_.find(id);Need(found!=catalog.derived_jobs_.end()&&found->second);return found->second;
#endif
}
struct Input {DerivedSourceEvidence source;DerivedJobIntentV1 intent;};
Input Fixture(const std::string& suffix={}){
 Input f;auto& s=f.source.segment;s.segment_id="segment";s.source_id="source";s.channel_id="channel";s.store_id="store";s.order_request_id="order";s.order_sequence=1;s.media_epoch_id="epoch";s.media_end_pts=20000000;s.container="mp4";s.video_codecs={"h264"};s.audio_omitted_reason="source-no-audio";s.size_bytes=12;s.checksum_sha256=std::string(64,'a');s.created_at_ms=1;s.finalized_at_ms=2;s.mappings={{"media-server.recording-utc-mapping.v1","map",0,20000000,"server-observation",100000000,120000000,1,"observed"}};
 RecordingSourceBindingV1 b;b.segment_id=s.segment_id;b.source_id=s.source_id;b.channel_id=s.channel_id;b.store_id=s.store_id;b.media_epoch_id=s.media_epoch_id;b.source_generation="gen";b.generation_order=1;b.track_id="video/0";b.samples={{1,0},{2,10000000}};b.last_accepted_ordinal=2;f.source.binding=b;
 RecordingConsumerReferenceV1 ref;ref.reference_id="request"+suffix;ref.kind="event";ref.owner_id="event";ref.source_id=s.source_id;ref.channel_id=s.channel_id;ref.analysis_namespace="tap-r0";ref.analysis_track_id="track-1";ref.association_quality="timestamp-match";ref.original=RecordingConsumerOriginalV1{"gen",1,1,"video/0",0};ref.request=RecordingConsumerRequestV1{"media-pts-ms",0,20,0,0};
 analysis::DecodedIntervalCollector collector;for(int i=0;i<2;++i){analysis::DecodedIntervalEvidence e;e.analysis_pts_ns=i*10000000;e.duration_ns=10000000;e.association={analysis::SourceAssociationQuality::TimestampMatch,analysis::OriginalSampleIdentity{"gen",1,static_cast<std::uint64_t>(i+1),"video/0",static_cast<std::uint64_t>(i*10000000)}};collector.Append(e);}
 DerivedRecordingSelection selection;std::string error;Need(SelectDerivedRecording(ref,*collector.Snapshot("tap-r0"),{f.source},nullptr,&selection,&error));Need(BuildDerivedJobIntent(selection,{f.source},4096,10,&f.intent,&error));return f;
}

[[maybe_unused]] void Run(const std::filesystem::path& root){
 const auto input=Fixture();const auto& id=input.intent.job_id;std::string error;
 RecordingJournal journal(RecordingJournal::ManagedOptions{root,"store"});Need(journal.Open(&error));
 RecordingCatalog catalog(journal,Options(root));Need(catalog.Open(&error));
 RecordingOrderReservationV1 order;Need(journal.ReserveRecordingOrder("store","order","segment","channel",&order,&error));Need(order.sequence==1);
 std::filesystem::create_directories(root/"channel");Need(WriteContainedFileDurably(root,root/"channel/segment.mp4","0123456789ab",&error));
 Need(catalog.FinalizeBoundSegmentV2(input.source.segment,*input.source.binding,(root/"channel/segment.mp4").string(),&error));
 // getter가 돌려준 독자만 잠깐 보유한다. fixture input은 값이며 제품 shared 객체와 별개다.
 std::weak_ptr<const RecordingSourceBindingV1> binding_lifetime;
 {const auto owned=catalog.FindSourceBindingOwnedLocked("segment");Need(static_cast<bool>(owned));binding_lifetime=owned;}
 Check(binding_lifetime.expired(),"LP18-R01 inactive binding releases resident detail after durable append");
#if LP18_TYPED_LIFETIME
 {lp17::Owned n;lp17::Catalog(n,catalog);Check(n.coldBindings==1&&n.residentBindings==0&&n.logicalBindingSamples==2&&n.uniqueBindingObjects==0&&n.entryStorageBytes>0,"LP18-R10 cold binding metrics retain logical samples without strong ownership");}
#endif
 bool inserted=false;Need(catalog.BeginDerivedJobIntent(input.intent,&inserted,&error)&&inserted);
 std::string initial;std::weak_ptr<const DerivedJobRecordV1> active_lifetime;
 {const auto owned=OwnedJob(catalog,id);initial=SerializeDerivedJobRecord(*owned);active_lifetime=owned;}
 Check(!active_lifetime.expired()&&catalog.DerivedJobProtectsLocked("segment")&&catalog.RetentionSnapshot().durable_reservations.size()==1,"LP18-R02 active job retains owned detail and source protection");
#if LP18_TYPED_LIFETIME
 {lp17::Owned n;lp17::Catalog(n,catalog);Check(n.residentJobs==1&&n.coldJobs==0,"LP18-R10 active job metrics count resident ownership");}
#endif
 {const auto replay=journal.Replay();std::string canonical;for(const auto& m:replay.mutations)canonical+=SerializeRecordingMutationV1(m)+"\n";
  Check(replay.io_error_count==0&&canonical==Bytes(journal.path()),"LP18-R03 durable journal preserves complete canonical bytes");}
 {std::optional<DerivedJobRecordV1> copy;Need(catalog.FindDerivedJob(id,&copy,&error)&&copy);copy->intent.sources[0].binding.samples.clear();
  const auto owned=OwnedJob(catalog,id);Check(SerializeDerivedJobRecord(*owned)==initial,"LP18-R03 public job value mutation remains isolated");}
 Need(catalog.Checkpoint(&error));Need(catalog.checkpoint_cache_&&catalog.checkpoint_cache_->shadow);
 std::weak_ptr<const DerivedJobRecordV1> shadow_lifetime;
 {const auto owned=OwnedJob(*catalog.checkpoint_cache_->shadow,id);shadow_lifetime=owned;}
 // 이전 상태 독자는 전이 후까지 생존하지만 resident 만료 판정 전에 반드시 해제한다.
 auto reader=OwnedJob(catalog,id);DerivedJobRecordV1 terminal=*reader;terminal.state=DerivedJobState::Failed;terminal.failure_reason="fixture-no-files";terminal.cleaned_at_ms=5;
 int service=0;Need(catalog.BindDerivedService(&service));Need(catalog.UpdateDerivedJob(&service,terminal,&error));catalog.UnbindDerivedService(&service);
 Check(reader&&SerializeDerivedJobRecord(*reader)==initial,"LP18-R02 previously returned owned reader survives terminal publication");
#if LP18_TYPED_LIFETIME
 {const auto terminal_reader=OwnedJob(catalog,id);lp17::Owned n;lp17::Catalog(n,catalog);Check(terminal_reader&&n.coldJobs==1&&n.residentJobs==0&&n.uniqueJobObjects==0,"LP18-R10 terminal job metrics exclude external reader ownership");}
#endif
 reader.reset();
 std::weak_ptr<const DerivedJobRecordV1> terminal_lifetime;
 {const auto owned=OwnedJob(catalog,id);Need(owned->state==DerivedJobState::Failed);terminal_lifetime=owned;}
 Check(terminal_lifetime.expired()&&active_lifetime.expired()&&shadow_lifetime.expired(),"LP18-R01 terminal live and historical active shadow release resident detail");
 std::weak_ptr<const RecordingMutationV1> envelope_lifetime;
 {const auto history=journal.Replay();Need(!history.mutations.empty());const auto& last=history.mutations.back();
  RecordingMutationHandle owned;Need(journal.AcquireMutationLink(catalog.accepted_segment_state_mutations_.at(last.mutation_id),&owned,&error)&&owned);envelope_lifetime=owned;}
 Check(envelope_lifetime.expired(),"LP18-R01 normal append releases reloadable journal envelope resident");
 const auto durable=Bytes(journal.path());{std::optional<DerivedJobRecordV1> value;Need(catalog.FindDerivedJob(id,&value,&error)&&value);const auto binding=catalog.FindSourceBinding("segment");Need(binding.has_value());}
 Check(Bytes(journal.path())==durable,"LP18-R03 owned reads do not rewrite durable evidence");
}
#if LP18_TYPED_LIFETIME
struct Store {
 std::filesystem::path root;Input input=Fixture();RecordingJournal journal;RecordingCatalog catalog;std::string error;
 explicit Store(const std::filesystem::path& path,bool seed=true):root(path),journal(RecordingJournal::ManagedOptions{root,"store"}),catalog(journal,Options(root)){
  Need(journal.Open(&error)&&catalog.Open(&error));if(!seed)return;
  RecordingOrderReservationV1 order;Need(journal.ReserveRecordingOrder("store","order","segment","channel",&order,&error));
  std::filesystem::create_directories(root/"channel");Need(WriteContainedFileDurably(root,root/"channel/segment.mp4","0123456789ab",&error));
  Need(catalog.FinalizeBoundSegmentV2(input.source.segment,*input.source.binding,(root/"channel/segment.mp4").string(),&error));
 }
 void Job(const Input& value,bool terminal){bool inserted=false;Need(catalog.BeginDerivedJobIntent(value.intent,&inserted,&error)&&inserted);if(!terminal)return;
  auto record=*OwnedJob(catalog,value.intent.job_id);record.state=DerivedJobState::Failed;record.failure_reason="fixture-no-files";record.cleaned_at_ms=5;
  int owner=0;Need(catalog.BindDerivedService(&owner));Need(catalog.UpdateDerivedJob(&owner,record,&error));catalog.UnbindDerivedService(&owner);
 }
};
void Tamper(const std::filesystem::path& path,const std::string& needle){auto bytes=Bytes(path);const auto at=bytes.find(needle);Need(at!=std::string::npos);bytes[at]=bytes[at]=='x'?'y':'x';std::ofstream out(path,std::ios::binary|std::ios::trunc);out.write(bytes.data(),static_cast<std::streamsize>(bytes.size()));out.close();Need(!out.fail());}
[[maybe_unused]] void Extended(const std::filesystem::path& root){
 {Store s(root/"reads");s.Job(s.input,true);const auto id=s.input.intent.job_id;const auto canonical=SerializeDerivedJobRecord(*OwnedJob(s.catalog,id));const auto disk=Bytes(s.journal.path());
  std::weak_ptr<const RecordingSourceBindingV1> weak_binding;location_probe::raw_reads=0;bool exact=false;
  {auto owned=s.catalog.FindSourceBindingOwnedLocked("segment");Need(bool(owned));weak_binding=owned;exact=SerializeRecordingSourceBindingV1(*owned)==SerializeRecordingSourceBindingV1(*s.input.source.binding);}
  Check(exact&&weak_binding.expired()&&location_probe::raw_reads==1&&!s.catalog.source_bindings_.at("segment").ResidentOwned(),"LP18-R04 cold binding reacquires complete canonical detail transiently");
  std::weak_ptr<const DerivedJobRecordV1> weak_job;location_probe::raw_reads=0;
  {auto owned=OwnedJob(s.catalog,id);weak_job=owned;exact=SerializeDerivedJobRecord(*owned)==canonical;}
  Check(exact&&weak_job.expired()&&location_probe::raw_reads==1&&!s.catalog.derived_jobs_.at(id).ResidentOwned(),"LP18-R04 cold terminal job reacquires complete canonical detail transiently");
  {const auto reader=OwnedJob(s.catalog,id);location_probe::raw_reads=0;const auto second=OwnedJob(s.catalog,id);Check(reader!=second&&SerializeDerivedJobRecord(*reader)==SerializeDerivedJobRecord(*second)&&location_probe::raw_reads==1,"LP18-R04 external owned reader does not bypass cold durable validation");}
  std::vector<DerivedJobRecordV1> snapshot;Need(s.catalog.SnapshotDerivedJobs(&snapshot,&s.error)&&snapshot.size()==1);snapshot[0].intent.sources[0].binding.samples.clear();
  Check(SerializeDerivedJobRecord(*OwnedJob(s.catalog,id))==canonical&&!s.catalog.derived_jobs_.at(id).ResidentOwned()&&Bytes(s.journal.path())==disk,"LP18-R04 full public snapshot owns independent values without resident refill");
  auto other_segment=s.input.source.segment;other_segment.segment_id="other-segment";other_segment.order_request_id="other-order";other_segment.order_sequence=2;auto other_binding=*s.input.source.binding;other_binding.segment_id=other_segment.segment_id;other_binding.source_generation="other-generation";
  RecordingOrderReservationV1 reservation;Need(s.journal.ReserveRecordingOrder("store","other-order","other-segment","channel",&reservation,&s.error));Need(WriteContainedFileDurably(s.root,s.root/"channel/other.mp4","0123456789ab",&s.error));Need(s.catalog.FinalizeBoundSegmentV2(other_segment,other_binding,(s.root/"channel/other.mp4").string(),&s.error));
  RecordingOriginalResult original;location_probe::raw_reads=0;Need(s.catalog.ResolveOriginalSample("channel","source","gen",1,"video/0",1,0,&original,&s.error));
  Check(original.exact.size()==1&&location_probe::raw_reads==1,"LP18-R05 original lookup acquires only matching binding metadata");
  const auto second=Fixture("-second");s.Job(second,true);location_probe::raw_reads=0;std::optional<DerivedJobRecordV1> found;Need(s.catalog.FindDerivedJob(id,&found,&s.error));
  Check(found&&found->intent.job_id==id&&location_probe::raw_reads==1,"LP18-R05 job lookup acquires only requested terminal record");
  location_probe::raw_reads=0;Check(!s.catalog.DerivedJobProtectsLocked("segment")&&s.catalog.RetentionSnapshot().durable_reservations.empty()&&location_probe::raw_reads==0,"LP18-R05 protection and reservation filters avoid terminal detail reads");
  const auto projection=s.catalog.ProjectionSignatureLocked();const auto before=Bytes(s.journal.path());location_probe::raw_reads=0;Need(s.catalog.Checkpoint(&s.error));const auto reads=location_probe::raw_reads;
  Check(reads>0&&Bytes(s.journal.path())==before&&s.catalog.ProjectionSignatureLocked()==projection,"LP18-R08 counts cold checkpoint durable reacquisition without semantic change");std::cout<<"[typed-observation] cold_checkpoint_raw_reads="<<reads<<'\n';
 }
 {const auto path=root/"reopen";Input input;{Store s(path);input=s.input;s.Job(input,true);}
  for(bool sql:{true,false}){RecordingJournal journal(RecordingJournal::ManagedOptions{path,"store"});Need(journal.Open(nullptr));auto options=Options(path);options.prefer_sqlite=sql;RecordingCatalog catalog(journal,options);Need(catalog.Open(nullptr));const auto& binding=catalog.source_bindings_.at("segment");const auto& job=catalog.derived_jobs_.at(input.intent.job_id);
   Check(!binding.ResidentOwned()&&!job.ResidentOwned()&&catalog.FindSourceBinding("segment").has_value()&&SerializeDerivedJobRecord(*OwnedJob(catalog,input.intent.job_id)).size()>0&&catalog.catalog_mode_==(sql?"sqlite-primary":"jsonl-fallback"),sql?"LP18-R06 SQLite reopen leaves inactive typed detail nonresident":"LP18-R06 JSONL fallback reopen leaves inactive typed detail nonresident");}
 }
 {const auto path=root/"active-reopen";std::string id;{Store s(path);s.Job(s.input,false);id=s.input.intent.job_id;}RecordingJournal journal(RecordingJournal::ManagedOptions{path,"store"});Need(journal.Open(nullptr));RecordingCatalog catalog(journal,Options(path));Need(catalog.Open(nullptr));Check(catalog.derived_jobs_.at(id).ResidentOwned()&&catalog.DerivedJobProtectsLocked("segment")&&catalog.RetentionSnapshot().durable_reservations.size()==1,"LP18-R06 reopen retains active job detail and protection");}
 {Store s(root/"deleted");const auto canonical=SerializeRecordingSourceBindingV1(*s.input.source.binding);Need(s.catalog.RequestDeletion("segment","continuous-capacity",&s.error));Need(std::filesystem::remove(s.root/"channel/segment.mp4"));RecordingTombstoneV2 deleted;deleted.tombstone_id="deleted";deleted.segment=s.input.source.segment;deleted.deletion_reason="continuous-capacity";deleted.deleted_at_ms=9;Need(s.catalog.CompleteDeletionV2(deleted,&s.error));const auto owned=s.catalog.FindSourceBindingOwnedLocked("segment");Check(owned&&SerializeRecordingSourceBindingV1(*owned)==canonical&&!s.catalog.FindSourceBinding("segment")&&!s.catalog.source_bindings_.at("segment").ResidentOwned(),"LP18-R06 deleted binding remains internally reacquirable and publicly hidden");}
 {Store s(root/"detached");s.Job(s.input,true);auto out=OwnedJob(s.catalog,s.input.intent.job_id);s.journal.DetachCatalog(&s.catalog);Check(!s.catalog.AcquireDerivedJobOwnedLocked(s.input.intent.job_id,&out,&s.error)&&!out&&!s.catalog.derived_job_state_authoritative_,"LP18-R07 detached authority clears typed output and marks uncertainty");}
 {Store s(root/"binding-corrupt");Tamper(s.journal.path(),"sourceBinding");Check(!s.catalog.FindSourceBinding("segment")&&!s.catalog.derived_job_state_authoritative_&&s.journal.poisoned_,"LP18-R07 cold binding corruption returns no value and marks uncertainty");}
 {Store s(root/"job-corrupt");s.Job(s.input,true);Tamper(s.journal.path(),"fixture-no-files");std::vector<DerivedJobRecordV1> out(1);Check(!s.catalog.SnapshotDerivedJobs(&out,&s.error)&&out.empty()&&!s.catalog.derived_job_state_authoritative_&&s.journal.poisoned_,"LP18-R07 cold job corruption clears public snapshot and marks uncertainty");}
 {Store s(root/"exception");s.Job(s.input,true);auto out=OwnedJob(s.catalog,s.input.intent.job_id);location_probe::throw_acquire=true;Check(!s.catalog.AcquireDerivedJobOwnedLocked(s.input.intent.job_id,&out,&s.error)&&!out&&!s.catalog.derived_job_state_authoritative_&&s.journal.poisoned_,"LP18-R07 cold acquisition exception clears output and marks uncertainty");}
 {Store s(root/"checkpoint-corrupt");Need(s.catalog.Checkpoint(&s.error));Tamper(s.journal.path(),"sourceBinding");bool escaped=false,ok=true;try{ok=s.catalog.Checkpoint(&s.error);}catch(...){escaped=true;}
  Check(!escaped&&!ok&&!s.catalog.checkpoint_cache_&&!s.catalog.derived_job_state_authoritative_,"LP18-R07 public checkpoint cold projection failure returns false without escaping exception");}
 {Store s(root/"suffix");location_probe::release_visits=0;Need(s.journal.ReleaseRecordResidents(&s.catalog,&s.error));Need(s.journal.ReleaseRecordResidents(&s.catalog,&s.error));Check(location_probe::release_visits==0,"LP18-R08 repeated resident release visits no previously checked rows");
  RecordingOrderReservationV1 order;Need(s.journal.ReserveRecordingOrder("store","suffix-order","suffix-segment","channel",&order,&s.error));location_probe::release_visits=0;Need(s.journal.ReleaseRecordResidents(&s.catalog,&s.error));Check(location_probe::release_visits==1,"LP18-R08 append resident release visits only new suffix rows");}
 {const auto path=root/"cursor-swap";RecordingJournal journal(RecordingJournal::ManagedOptions{path,"store"});int owner=0;std::string error;Need(journal.Open(&error)&&journal.AttachCatalog(&owner,path,path/"recording-catalog.sqlite3",true,&error));
  for(int i=0;i<2;++i){RecordingMutationV1 m;m.mutation_id="event-"+std::to_string(i);m.entity_id="event";m.mutation_type=RecordingMutationType::EventLinkCreated;m.occurred_at_ms=1;m.payload_json="{\"padding\":\""+std::string(2000,'x')+"\"}";Need(journal.AppendOwned(m,&owner,&error));}
  Need(journal.ReleaseRecordResidents(&owner,&error));RecordingJournalRecordLocations before_locations;Need(journal.ReadRecordLocations(&owner,&before_locations,&error));const auto before=Bytes(journal.path());RecordingMutationHandles candidate;Need(journal.PrepareCheckpoint(&owner,&candidate,&error));Need(candidate.size()==2&&candidate[0]->mutation_type==RecordingMutationType::EventLinkReceipt);std::string expected;for(const auto& m:candidate)expected+=SerializeRecordingMutationV1(*m)+"\n";Need(expected.size()<before.size());Need(journal.CommitCheckpoint(&owner,candidate,false,&error));RecordingJournalRecordLocations after_locations;Need(journal.ReadRecordLocations(&owner,&after_locations,&error));location_probe::release_visits=0;Need(journal.ReleaseRecordResidents(&owner,&error));Check(location_probe::release_visits==2&&after_locations.size()==before_locations.size()&&after_locations[0]!=before_locations[0]&&Bytes(journal.path())==expected&&expected!=before,"LP18-R08 checkpoint replacement resets release cursor for new generation");journal.DetachCatalog(&owner);}
 {Store s(root/"timeline-limit");
  for(int n=0;n<17;++n){auto segment=s.input.source.segment;const auto id="mapped-"+std::to_string(n);segment.segment_id=id;segment.order_request_id=id+"-order";segment.media_epoch_id=id+"-epoch";segment.media_start_pts=0;segment.media_end_pts=256;segment.mappings.clear();
   RecordingOrderReservationV1 order;Need(s.journal.ReserveRecordingOrder("store",segment.order_request_id,id,"channel",&order,&s.error));segment.order_sequence=order.sequence;
   for(int i=0;i<256;++i)segment.mappings.push_back({"media-server.recording-utc-mapping.v1",id+"-map-"+std::to_string(i),i,i+1,"source-capture",1000000000LL+i,1000000001LL+i,0,""});
   Need(ValidateRecordingSegmentV2(segment,&s.error));const auto path=s.root/"channel"/(id+".mp4");Need(WriteContainedFileDurably(s.root,path,"0123456789ab",&s.error));Need(s.catalog.FinalizeSegmentV2(segment,path.string(),&s.error));
  }
  RecordingTimelineResult result;const bool limited=!s.catalog.SnapshotTimelineV2({"channel",1000,1001,0,100},&result,&s.error)&&result.items.empty()&&result.unplaced_items.empty();const auto before=Bytes(s.journal.path());bool inserted=false;
  Check(limited&&s.catalog.derived_job_state_authoritative_&&s.catalog.BeginDerivedJobIntent(s.input.intent,&inserted,&s.error)&&inserted&&Bytes(s.journal.path()).size()>before.size(),"LP18-R11 timeline collector limit does not poison catalog or block subsequent append");
 }
 {Store s(root/"raw");s.Job(s.input,true);RecordingCatalog raw(s.journal,Options(s.root));for(const auto& m:s.journal.Replay().mutations)Need(raw.ApplyMutationLocked(m,false,&s.error));Check(raw.source_bindings_.at("segment").ResidentOwned()&&raw.derived_jobs_.at(s.input.intent.job_id).ResidentOwned()&&!s.journal.CanReleaseMutationLink(raw.source_bindings_.at("segment").mutation)&&!s.journal.CanReleaseMutationLink(raw.derived_jobs_.at(s.input.intent.job_id).mutation),"LP18-R09 raw Apply preserves typed resident fallback");}
 {Store s(root/"oversize",false);RecordingOrderReservationV1 order;Need(s.journal.ReserveRecordingOrder("store","order","segment","channel",&order,&s.error));for(const auto& m:s.journal.Replay().mutations)Need(s.catalog.ApplyMutationLocked(m,false,&s.error));
  std::filesystem::create_directories(s.root/"channel");Need(WriteContainedFileDurably(s.root,s.root/"channel/segment.mp4","0123456789ab",&s.error));
  RecordingMutationV1 mutation;mutation.mutation_id="oversize-bound";mutation.entity_id="segment";mutation.mutation_type=RecordingMutationType::SegmentV2BoundFinalized;mutation.occurred_at_ms=1;
  mutation.payload_json="{"+std::string(16U*1024*1024,' ')+"\"segment\":"+SerializeRecordingSegmentV2(s.input.source.segment)+",\"mediaRelpath\":\"channel/segment.mp4\",\"sourceBinding\":"+SerializeRecordingSourceBindingV1(*s.input.source.binding)+"}";
  Need(s.catalog.AppendAndApplyLocked(mutation,&s.error));RecordingMutationHandle owned;Need(s.journal.AcquireMutationLink(s.catalog.source_bindings_.at("segment").mutation,&owned,&s.error));
  Check(s.catalog.source_bindings_.at("segment").ResidentOwned()&&!s.journal.CanReleaseMutationLink(s.catalog.source_bindings_.at("segment").mutation)&&owned&&SerializeRecordingMutationV1(*owned)==SerializeRecordingMutationV1(mutation)&&Bytes(s.journal.path()).find(SerializeRecordingMutationV1(mutation)+"\n")!=std::string::npos,"LP18-R09 oversized physical row preserves typed resident fallback");}
}
[[maybe_unused]] void Crypto(const std::filesystem::path& root){Store s(root);s.Job(s.input,true);const auto bytes=Bytes(s.journal.path());const auto id=s.input.intent.job_id;const auto owned=OwnedJob(s.catalog,id);Need(s.journal.ReleaseRecordResidents(&s.catalog,&s.error));
 Check(s.catalog.source_bindings_.at("segment").ResidentOwned()&&s.catalog.derived_jobs_.at(id).ResidentOwned()&&!s.journal.CanReleaseMutationLink(s.catalog.source_bindings_.at("segment").mutation)&&!s.catalog.Checkpoint(&s.error)&&Bytes(s.journal.path())==bytes&&SerializeDerivedJobRecord(*OwnedJob(s.catalog,id))==SerializeDerivedJobRecord(*owned),"LP18-R09 crypto-off preserves typed resident fallback and checkpoint rejection");}
#endif
}
int main(int argc,char** argv){if(argc!=2)return 2;try{
#if LP18_TYPED_LIFETIME && !MEDIA_SERVER_USE_OPENSSL
 Crypto(std::filesystem::path(argv[1])/"typed-crypto");
#else
 Run(std::filesystem::path(argv[1])/"typed");
#if LP18_TYPED_LIFETIME
 Extended(std::filesystem::path(argv[1])/"typed-extended");
#endif
#endif
 std::cout<<"[summary] LP18 pass="<<passed<<" fail="<<failed<<'\n';return failed?1:0;}catch(...){std::cout<<"[setup-or-oracle-fail] LP18 fixed-typed-lifetime-error\n";return 2;}}

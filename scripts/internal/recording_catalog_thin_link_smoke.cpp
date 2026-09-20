// LP18 accepted/prefix 소비 연결만 검사한다. typed/자동 해제는 이 검사의 범위가 아니다.
#include "recording/recording_catalog.h"
#include "recording_journal_location_counter.h"
#include <fstream>
#include <iostream>
#include <stdexcept>
#include <sqlite3.h>
#ifndef LP18_THIN_LINKS
#define LP18_THIN_LINKS 0
#endif
#if LP18_THIN_LINKS
#include "recording_catalog_comparison_ownership.h"
#endif
using namespace recording;
namespace {
int passed=0,failed=0;
void Need(bool ok){if(!ok)throw std::runtime_error("LP18_THIN_SETUP");}
void Check(bool ok,const std::string& label){++(ok?passed:failed);std::cout<<(ok?"[pass] ":"[fail] ")<<label<<'\n';}
std::string Bytes(const std::filesystem::path& path){std::ifstream in(path,std::ios::binary);Need(static_cast<bool>(in));return {std::istreambuf_iterator<char>(in),{}};}
struct Store {
 std::filesystem::path root;RecordingJournal journal;RecordingCatalog catalog;
 static RecordingCatalog::Options Options(const std::filesystem::path& root,bool sql=true){RecordingCatalog::Options o(root/"recording-catalog.sqlite3",root,sql);o.enable_v2_storage=true;return o;}
 explicit Store(std::filesystem::path path,bool sql=true):root(std::move(path)),journal(RecordingJournal::ManagedOptions{root,"thin-store"}),catalog(journal,Options(root,sql)){std::string error;Need(journal.Open(&error)&&catalog.Open(&error));}
};
void Seed(Store& s){const unsigned char bytes[]={0,0,0,12,'f','t','y','p','i','s','o','m'};{std::ofstream out(s.root/"original.mp4",std::ios::binary);out.write(reinterpret_cast<const char*>(bytes),sizeof(bytes));Need(static_cast<bool>(out));}
 RecordingSegmentV1 v;v.segment_id="thin-segment";v.source_id=v.channel_id="thin-channel";v.stream_epoch_id="thin-epoch";v.start={1000,0,1,1000000000};v.end={2000,1000000000,1,1000000000};v.container="mp4";v.video_codecs={"h264"};v.audio_omitted_reason="source-no-audio";v.size_bytes=12;v.checksum_sha256=std::string(64,'a');v.retention_class=RecordingRetentionClass::Continuous;v.lifecycle=RecordingLifecycle::Finalized;v.created_at_ms=1000;v.finalized_at_ms=2000;std::string error;Need(s.catalog.FinalizeSegment(v,(s.root/"original.mp4").string(),&error));}
#if LP18_THIN_LINKS
using View=RecordingJournalOwnedViewHandle;
using Views=RecordingJournalOwnedViews;
RecordingMutationHandle Acquire(Store& s,const RecordingMutationLink& link){RecordingMutationHandle out;std::string error;Need(s.journal.AcquireMutationLink(link,&out,&error)&&out);return out;}
RecordingMutationLink Bind(Store& s,const View& view,const RecordingMutationV1& m,const RecordingMutationHandle& owned){RecordingMutationLink link;std::string error;Need(s.journal.MakeMutationLink(view,m,owned,&link,&error));return link;}
void Read(Store& s,RecordingMutationHandles* owned,Views* views){std::string error;Need(s.journal.ReadCheckpointRecords(&s.catalog,owned,&error,nullptr,views));}
void OwnershipMetrics(const std::filesystem::path& root){
 Store s(root/"metrics");Seed(s);RecordingMutationHandles owned;Views views;Read(s,&owned,&views);Need(owned.size()==1);
 const auto weak=Bind(s,views[0],*owned[0],owned[0]);const auto fallback=Bind(s,{},*owned[0],owned[0]);
 lp17::Owned weak_counts;lp17::EnvelopeOwners weak_seen;lp17::Envelope(weak_counts,weak,weak_seen);
 Check(weak_counts.records==1&&weak_counts.logicalEnvelopeBytes==weak.LogicalCharge()&&weak_counts.logicalEnvelopeBytes>0&&weak_counts.logicalLinkCount==1&&weak_counts.logicalEnvelopeChargeBytes==weak.LogicalCharge()&&weak_counts.weakLinkCount==1&&weak_counts.residentFallbackLinkCount==0&&weak_counts.uniqueEnvelopes==0&&weak_counts.sharedEnvelopeReferences==0&&weak_counts.stringBytes==0&&weak_counts.stringCapacity==0,"LP18-L31 weak link logical charge excludes strong payload");
 lp17::Owned strong;lp17::EnvelopeOwners seen;lp17::Envelope(strong,fallback,seen);
 Check(strong.records==1&&strong.logicalEnvelopeBytes==fallback.LogicalCharge()&&strong.logicalLinkCount==1&&strong.residentFallbackLinkCount==1&&strong.weakLinkCount==0&&strong.uniqueEnvelopes==1&&strong.sharedEnvelopeReferences==0&&strong.stringBytes>0,"LP18-L31 resident fallback counts one strong envelope");
 const auto bytes=strong.stringBytes,capacity=strong.stringCapacity;lp17::Envelope(strong,fallback,seen);
 Check(strong.records==2&&strong.logicalEnvelopeBytes==2*fallback.LogicalCharge()&&strong.logicalLinkCount==2&&strong.logicalEnvelopeChargeBytes==2*fallback.LogicalCharge()&&strong.residentFallbackLinkCount==2&&strong.uniqueEnvelopes==1&&strong.sharedEnvelopeReferences==1&&strong.stringBytes==bytes&&strong.stringCapacity==capacity,"LP18-L31 shared fallback counts two logical links and one payload");
}
int SqlCount(RecordingCatalog& catalog){sqlite3_stmt* statement=nullptr;Need(sqlite3_prepare_v2(catalog.sqlite_db_,"SELECT count(*) FROM recording_segments",-1,&statement,nullptr)==SQLITE_OK);Need(sqlite3_step(statement)==SQLITE_ROW);const int count=sqlite3_column_int(statement,0);sqlite3_finalize(statement);return count;}
void ThinCases(const std::filesystem::path& root){
 RecordingMutationV1 durable;
 {const auto path=root/"physical-views";std::filesystem::path journal_path;RecordingMutationV1 first,second;
  {Store s(path);Seed(s);RecordingOrderReservationV1 order;std::string error;Need(s.journal.ReserveRecordingOrder("thin-store","view-request","view-segment","thin-channel",&order,&error));const auto replay=s.journal.Replay();Need(replay.io_error_count==0&&replay.mutations.size()==2);first=replay.mutations[0];second=replay.mutations[1];journal_path=s.journal.path();}
  auto spaced=SerializeRecordingMutationV1(first);spaced.insert(1," \t");const auto raw="\n"+spaced+"\n\n"+SerializeRecordingMutationV1(second)+"\n"+spaced+"\n";{std::ofstream out(journal_path,std::ios::binary|std::ios::trunc);out.write(raw.data(),raw.size());Need(static_cast<bool>(out));}
  Store s(path);RecordingMutationHandles owned;Views views;Read(s,&owned,&views);Need(owned.size()==3&&views.size()==3);const auto original=std::make_shared<const RecordingMutationV1>(first);auto changed=first;changed.payload_json="{}";owned[0]=std::make_shared<const RecordingMutationV1>(changed);
  const auto a=Acquire(s,Bind(s,views[0],first,original));const auto b=Acquire(s,Bind(s,views[1],second,owned[1]));const auto c=Acquire(s,Bind(s,views[2],first,original));
  Check(views[0]!=views[2]&&SerializeRecordingMutationV1(*a)==SerializeRecordingMutationV1(first)&&SerializeRecordingMutationV1(*b)==SerializeRecordingMutationV1(second)&&SerializeRecordingMutationV1(*c)==SerializeRecordingMutationV1(first)&&Bytes(journal_path)==raw,"LP18-L26 same-read views preserve physical duplicate order and resist external owned-vector mutation");
 }
 {Store s(root/"read-exception");Seed(s);RecordingMutationHandles owned;Views views;Read(s,&owned,&views);Need(!owned.empty()&&!views.empty());std::string error;Need(s.journal.ReleaseRecordResidents(&s.catalog,&error));location_probe::throw_acquire=true;
  Check(!s.journal.ReadCheckpointRecords(&s.catalog,&owned,&error,nullptr,&views)&&owned.empty()&&views.empty()&&!location_probe::throw_acquire&&s.journal.poisoned_,"LP18-L30 cold Read exception clears prefilled owned and view outputs and poisons");
 }
 {Store s(root/"prefix-read-cost");Seed(s);std::string error;Need(s.catalog.Checkpoint(&error));Need(s.catalog.checkpoint_cache_&&s.catalog.checkpoint_cache_->shadow);const auto projection=s.catalog.checkpoint_cache_->shadow->ProjectionSignatureLocked();const auto before=Bytes(s.journal.path());const auto count=s.journal.Replay().mutations.size();Need(count==1);Need(s.journal.ReleaseRecordResidents(&s.catalog,&error));location_probe::raw_reads=0;const bool ok=s.catalog.Checkpoint(&error);
  Check(ok&&location_probe::raw_reads==count&&Bytes(s.journal.path())==before&&s.catalog.checkpoint_cache_&&s.catalog.checkpoint_cache_->shadow&&s.catalog.checkpoint_cache_->shadow->ProjectionSignatureLocked()==projection,"LP18-L30 primed cold prefix reuses current read once with exact bytes and projection");
 }
 {Store s(root/"main");Seed(s);RecordingMutationHandles owned;Views views;Read(s,&owned,&views);Need(owned.size()==1&&views.size()==1);durable=*owned[0];std::string error;
  auto link=Bind(s,views[0],durable,owned[0]);bool current_view=false;
  // cold Acquire는 파일을 엄격히 다시 읽으므로 새 객체일 수 있다. 같은 읽기의
  // 원본 포인터 결박은 Owns로, 물리 출처는 sealed view로 각각 확인한다.
  const auto equal_copy=std::make_shared<const RecordingMutationV1>(durable);
  Check(s.journal.MutationLinkOwns(link,owned[0])&&!s.journal.MutationLinkOwns(link,equal_copy)&&
        s.journal.MatchMutationLinkView(link,views[0],&current_view,&error)&&current_view&&
        SerializeRecordingMutationV1(*Acquire(s,link))==SerializeRecordingMutationV1(durable),
        "LP18-L26 same-read sealed view binds exact owned envelope");
  auto next=durable;next.mutation_id="thin-new-row";RecordingMutationHandle appended;View appended_view;Need(s.journal.AppendOwned(next,&s.catalog,&error,&appended,&appended_view));
  Check(appended_view&&Acquire(s,Bind(s,appended_view,next,appended))==appended,"LP18-L26 same-append sealed view binds exact new envelope");
  // 직접 append는 아직 live에 적용하지 않았으므로 이 검사에서만 보관한 뒤 닫는다.
 }
 {Store s(root/"lifetime");Seed(s);RecordingMutationHandles owned;Views views;Read(s,&owned,&views);const auto m=*owned[0];const auto canonical=SerializeRecordingMutationV1(m);const auto before=Bytes(s.journal.path());std::string error;Need(s.catalog.Checkpoint(&error));Need(s.catalog.checkpoint_cache_&&s.catalog.checkpoint_cache_->shadow);std::weak_ptr<const RecordingMutationV1> weak=owned[0];owned.clear();views.clear();Need(s.journal.ReleaseRecordResidents(&s.catalog,&error));
  Check(weak.expired(),"LP18-L27 accepted live shadow and prefix release detailed envelope ownership");
  const auto& live=s.catalog.accepted_segment_state_mutations_.at(m.mutation_id);auto current=Acquire(s,live);std::weak_ptr<const RecordingMutationV1> transient=current;
  Check(SerializeRecordingMutationV1(*current)==canonical&&Bytes(s.journal.path())==before,"LP18-L27 accepted cold acquisition preserves canonical and durable bytes");current.reset();Check(transient.expired(),"LP18-L27 accepted cold acquisition remains transient");
  Check(SerializeRecordingMutationV1(*Acquire(s,s.catalog.checkpoint_cache_->shadow->accepted_segment_state_mutations_.at(m.mutation_id)))==canonical,"LP18-L28 shadow reads through current attachment authority");
  Check(SerializeRecordingMutationV1(*Acquire(s,s.catalog.checkpoint_cache_->prefix.at(0)))==canonical,"LP18-L27 prefix cold acquisition preserves full envelope");
  auto changed=m;++changed.occurred_at_ms;const bool duplicate=s.catalog.ApplyMutationLocked(m,true,&error);const bool rejected=!s.catalog.ApplyMutationLocked(changed,true,&error);
  Check(duplicate&&rejected&&s.catalog.accepted_segment_state_mutations_.size()==1&&SerializeRecordingMutationV1(*Acquire(s,live))==canonical,"LP18-L29 accepted duplicate retains full canonical collision rejection");
  auto wrong=std::make_shared<const RecordingMutationV1>(changed);s.catalog.checkpoint_cache_->prefix[0]=Bind(s,{},changed,wrong);Need(s.catalog.Checkpoint(&error));
  Check(SerializeRecordingMutationV1(*Acquire(s,s.catalog.checkpoint_cache_->prefix[0]))==canonical&&Bytes(s.journal.path())==before,"LP18-L30 prefix mismatch falls back to full replay without rejecting valid input");
 }
 {Store s(root/"view-reject");Seed(s);RecordingMutationHandles owned;Views views;Read(s,&owned,&views);const auto m=*owned[0];std::string error;
  for(const char* field:{"schema","type","id","entity","time","payload"}){auto changed=m;const std::string name=field;if(name=="schema")changed.schema+="x";if(name=="type")changed.mutation_type=RecordingMutationType::Unknown;if(name=="id")changed.mutation_id+="x";if(name=="entity")changed.entity_id+="x";if(name=="time")++changed.occurred_at_ms;if(name=="payload")changed.payload_json+=" ";RecordingCatalog scratch(s.journal,Store::Options(s.root));const auto changed_owned=std::make_shared<const RecordingMutationV1>(changed);
   Check(!scratch.ApplyMutationLocked(changed,false,&error,nullptr,changed_owned,nullptr,nullptr,nullptr,views[0])&&scratch.mutation_ids_.empty()&&scratch.accepted_segment_state_mutations_.empty(),"LP18-L26 mismatched sealed view rejects before registration "+name);
  }
  RecordingCatalog scratch(s.journal,Store::Options(s.root));Need(scratch.ApplyMutationLocked(m,false,&error,nullptr,owned[0]));auto retained=owned[0];std::weak_ptr<const RecordingMutationV1> weak=retained;owned.clear();views.clear();retained.reset();Need(s.journal.ReleaseRecordResidents(&s.catalog,&error));
  Check(!weak.expired()&&SerializeRecordingMutationV1(*Acquire(s,scratch.accepted_segment_state_mutations_.at(m.mutation_id)))==SerializeRecordingMutationV1(m),"LP18-L26 raw Apply without view preserves resident fallback");
 }
 {Store s(root/"authority"),foreign(root/"foreign");Seed(s);Seed(foreign);RecordingMutationHandles owned;Views views;Read(s,&owned,&views);const auto m=*owned[0];auto link=Bind(s,views[0],m,owned[0]);auto reader=Acquire(s,link);std::string error;RecordingMutationLink denied;
  Check(!foreign.journal.MakeMutationLink(views[0],m,owned[0],&denied,&error),"LP18-L28 foreign sealed authority cannot become fallback provenance");s.journal.DetachCatalog(&s.catalog);RecordingMutationHandle out=reader;
  Check(!s.journal.AcquireMutationLink(link,&out,&error)&&!out&&SerializeRecordingMutationV1(*reader)==SerializeRecordingMutationV1(m),"LP18-L28 detached authority blocks cold read while owned reader survives");Need(s.journal.AttachCatalog(&s.catalog,s.root,s.root/"recording-catalog.sqlite3",true,&error));out=reader;
  Check(!s.journal.AcquireMutationLink(link,&out,&error)&&!out,"LP18-L28 same-address reattach does not revive old authority");
 }
 for(bool sql:{true,false}){const auto path=root/(sql?"reopen-sql":"reopen-json");{Store s(path);Seed(s);}Store s(path,sql);RecordingMutationHandles owned;Views views;Read(s,&owned,&views);Need(owned.size()==1);const auto m=*owned[0];const auto canonical=SerializeRecordingMutationV1(m);owned.clear();views.clear();std::string error;Need(s.journal.ReleaseRecordResidents(&s.catalog,&error));
  Check(SerializeRecordingMutationV1(*Acquire(s,s.catalog.accepted_segment_state_mutations_.at(m.mutation_id)))==canonical&&s.catalog.accepted_segment_state_replay_ordinals_.count(0)==1&&s.catalog.catalog_mode_==(sql?"sqlite-primary":"jsonl-fallback"),std::string("LP18-L29 reopen preserves thin canonical ordinal and projection ")+(sql?"sqlite":"fallback"));
  if(sql){const auto saved=s.catalog.accepted_segment_state_mutations_.at(m.mutation_id);s.catalog.accepted_segment_state_replay_ordinals_.clear();Need(s.catalog.RebuildSqliteLocked(&error));Check(SqlCount(s.catalog)==0,"LP18-L29 SQLite rebuild keeps ordinal gate with thin links");s.catalog.accepted_segment_state_replay_ordinals_.insert(0);auto changed=m;++changed.occurred_at_ms;s.catalog.accepted_segment_state_mutations_[m.mutation_id]=Bind(s,{},changed,std::make_shared<const RecordingMutationV1>(changed));Need(s.catalog.RebuildSqliteLocked(&error));Check(SqlCount(s.catalog)==0,"LP18-L29 SQLite rebuild keeps full canonical gate with thin links");s.catalog.accepted_segment_state_mutations_[m.mutation_id]=saved;Need(s.catalog.RebuildSqliteLocked(&error));}
 }
 {Store s(root/"receipt");EventRecordingLinkV1 link;link.link_id="thin-link";link.event_id="thin-event";link.source_id=link.channel_id="thin-channel";link.time_basis="utc-ms";link.status=EventRecordingLinkStatus::Pending;link.created_at_ms=1000;link.requested_range={1000,2000};std::string error;for(int i=0;i<2;++i){link.updated_at_ms=1000+i;link.completeness_reason=std::string(200,'x');Need(s.catalog.PutEventLink(link,&error));}const auto original=s.journal.Replay().mutations.at(0);Need(s.catalog.Checkpoint(&error));const auto before=Bytes(s.journal.path());RecordingMutationHandle owned;View view;Need(s.journal.AppendOwned(original,&s.catalog,&error,&owned,&view));
  Check(!view&&owned&&SerializeRecordingMutationV1(*owned)==SerializeRecordingMutationV1(original)&&Bytes(s.journal.path())==before,"LP18-L26 receipt retry returns original without binding receipt view");
 }
 {Store s(root/"tamper");Seed(s);RecordingMutationHandles owned;Views views;Read(s,&owned,&views);const auto m=*owned[0];auto link=Bind(s,views[0],m,owned[0]);owned.clear();views.clear();std::string error;Need(s.journal.ReleaseRecordResidents(&s.catalog,&error));auto bytes=Bytes(s.journal.path());const auto at=bytes.find("thin-epoch");Need(at!=std::string::npos);bytes[at]='x';{std::ofstream out(s.journal.path(),std::ios::binary|std::ios::trunc);out.write(bytes.data(),bytes.size());Need(static_cast<bool>(out));}RecordingMutationHandle out;
  Check(!s.journal.AcquireMutationLink(link,&out,&error)&&!out&&s.journal.poisoned_,"LP18-L30 cold thin-link corruption fails closed instead of cache fallback");
 }
}
#endif
}
int main(int argc,char** argv){if(argc!=2&&argc!=3)return 2;try{const std::filesystem::path root=argv[1];
#if LP18_THIN_LINKS
 if(argc==3){if(std::string(argv[2])!="ownership-metrics")return 2;OwnershipMetrics(root);std::cout<<"[summary] LP18 pass="<<passed<<" fail="<<failed<<'\n';return failed?1:0;}
#else
 if(argc==3)return 2;
#endif
 {Store s(root/"baseline");Seed(s);const auto replay=s.journal.Replay();Check(replay.io_error_count==0&&replay.mutations.size()==1&&Bytes(s.journal.path())==SerializeRecordingMutationV1(replay.mutations[0])+"\n","LP18-L26 thin-link baseline preserves complete canonical journal bytes");}Check(LP18_THIN_LINKS!=0,"LP18-L26 sealed view and thin-link capability exists");
#if LP18_THIN_LINKS
 ThinCases(root/"thin");
#else
 std::cout<<"[not-run] LP18 thin-link scenarios=28 reason=capability-unavailable\n";
#endif
 std::cout<<"[summary] LP18 pass="<<passed<<" fail="<<failed<<'\n';return failed?1:0;
 }catch(...){std::cout<<"[setup-or-oracle-fail] LP18 fixed-thin-link-error\n";return 2;}}

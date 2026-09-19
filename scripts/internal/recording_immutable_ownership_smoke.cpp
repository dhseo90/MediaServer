// LP18-O01~05: 값/공유 핸들 표현 모두 컴파일 가능한 검사 소유 adapter.
#include "recording/recording_catalog.h"
#include "recording_checkpoint_validation.h"
#include <fstream>
#include <iostream>
#include <stdexcept>
#include <type_traits>
#include <sqlite3.h>
using namespace recording;
namespace ownership_probe {
using History=decltype(std::declval<RecordingCatalog::CheckpointProjectionCache>().prefix);
History JournalView(const RecordingJournal&);
inline const RecordingMutationV1* Get(const RecordingMutationV1& v){return &v;}
inline const RecordingMutationV1* Get(const std::shared_ptr<const RecordingMutationV1>& v){return v.get();}
inline void Set(RecordingMutationV1& slot,RecordingMutationV1 v){slot=std::move(v);}
inline void Set(std::shared_ptr<const RecordingMutationV1>& slot,RecordingMutationV1 v){slot=std::make_shared<const RecordingMutationV1>(std::move(v));}
}
namespace {
// 이 검사는 encoder/미디어 pipeline을 실행하지 않고 기존 managed Store 생성 규칙만 사용한다.
struct Store {
 std::filesystem::path root;RecordingJournal journal;RecordingCatalog catalog;
 static RecordingCatalog::Options Options(const std::filesystem::path& root){RecordingCatalog::Options o(root/"recording-catalog.sqlite3",root,true);o.enable_v2_storage=true;return o;}
 explicit Store(std::filesystem::path path):root(std::move(path)),journal(RecordingJournal::ManagedOptions{root,"probe-store"}),catalog(journal,Options(root)){std::string error;if(!journal.Open(&error)||!catalog.Open(&error))throw std::runtime_error("LP18_STORE");}
};
int passed=0,failed=0;
void Check(bool ok,const std::string& label){++(ok?passed:failed);std::cout<<(ok?"[pass] ":"[fail] ")<<label<<'\n';}
void Need(bool ok){if(!ok)throw std::runtime_error("LP18_SETUP");}
void Reserve(Store& s,const std::string& id){RecordingOrderReservationV1 order;std::string error;Need(s.journal.ReserveRecordingOrder("probe-store",id,id,"probe-channel",&order,&error));}
std::string Canonical(const ownership_probe::History& values){std::string out;for(const auto& p:values){const auto* m=ownership_probe::Get(p);Need(m!=nullptr);out+=SerializeRecordingMutationV1(*m)+"\n";}return out;}
std::string Bytes(const std::filesystem::path& file){std::ifstream in(file,std::ios::binary);Need(static_cast<bool>(in));return {std::istreambuf_iterator<char>(in),{}};}
void AliasAndValue(const std::filesystem::path& root){
 Store s(root);Reserve(s,"owner-first");std::string error;auto original=ownership_probe::JournalView(s.journal);ownership_probe::History candidate;
#if LP18_SHARED_RECORDS
 ownership_probe::History read;Need(s.journal.ReadCheckpointRecords(&s.catalog,&read,&error));
 Check(read.size()==original.size()&&ownership_probe::Get(read[0])==ownership_probe::Get(original[0]),"LP18-O01 owner checked read view shares journal envelope");
#endif
 Need(s.journal.PrepareCheckpoint(&s.catalog,&candidate,&error));Need(original.size()==1&&candidate.size()==1);
 const auto durable=Canonical(original);auto copy=candidate;
 Check(ownership_probe::Get(original[0])==ownership_probe::Get(candidate[0])&&ownership_probe::Get(candidate[0])==ownership_probe::Get(copy[0]),"LP18-O01 shared journal original candidate envelopes");
 auto replay=s.journal.Replay();replay.mutations[0].payload_json="{}";
 Check(Canonical(ownership_probe::JournalView(s.journal))==durable&&Bytes(s.journal.path())==durable,"LP18-O01 public Replay value mutation remains isolated");
 Need(s.catalog.Checkpoint(&error));Need(s.catalog.checkpoint_cache_&&s.catalog.checkpoint_cache_->prefix.size()==1);
 Check(ownership_probe::Get(original[0])==ownership_probe::Get(s.catalog.checkpoint_cache_->prefix[0]),"LP18-O01 retained prefix shares journal envelope");
 RecordingCatalog full(s.journal,Store::Options(root));bool valid=true;for(const auto& m:s.journal.Replay().mutations)valid=full.ApplyMutationLocked(m,false,&error)&&valid;
 Check(valid&&Canonical(s.catalog.checkpoint_cache_->prefix)==durable&&s.catalog.checkpoint_cache_->shadow->ProjectionSignatureLocked()==full.ProjectionSignatureLocked(),"LP18-O01 full canonical and projection oracle");
 Reserve(s,"owner-second");Check(!s.journal.CommitCheckpoint(&s.catalog,candidate,false,&error),"LP18-O03 stale candidate after reservation rejected");
 ownership_probe::History current;Need(s.journal.PrepareCheckpoint(&s.catalog,&current,&error));int wrong_owner=0;
 Check(!s.journal.CommitCheckpoint(&wrong_owner,current,false,&error),"LP18-O03 foreign owner candidate rejected");
 for(const char* field:{"schema","type","id","entity","time","payload","reorder","shrink"}){
  auto changed=current;auto m=*ownership_probe::Get(changed[0]);const std::string which=field;
  if(which=="schema")m.schema+="x";if(which=="type")m.mutation_type=RecordingMutationType::Unknown;if(which=="id")m.mutation_id+="x";if(which=="entity")m.entity_id+="x";if(which=="time")++m.occurred_at_ms;if(which=="payload")m.payload_json+=" ";ownership_probe::Set(changed[0],std::move(m));
  if(which=="reorder")std::swap(changed[0],changed[1]);if(which=="shrink")changed.push_back(changed[0]);
  Check(!detail::SameCheckpointSequence(current,changed)&&!detail::SameCheckpointPrefix(changed,current),"LP18-O04 exact field order or prefix mutation rejected "+which);
#if LP18_SHARED_RECORDS
  const auto disk=Bytes(s.journal.path());Check(!s.journal.CommitCheckpoint(&s.catalog,changed,false,&error)&&Bytes(s.journal.path())==disk,"LP18-O04 standalone candidate fields rejected without disk change "+which);
#endif
 }
#if LP18_SHARED_RECORDS
 auto nulls=current;nulls[0].reset();
 Check(!detail::CheckpointCacheAdmissible(nulls)&&!detail::SameCheckpointPrefix(nulls,current)&&!detail::SameCheckpointSequence(nulls,current)&&!s.journal.CommitCheckpoint(&s.catalog,nulls,false,&error),"LP18-O04 null envelope safely rejected");
#endif
}
void Receipts(const std::filesystem::path& root){
 Store s(root);Reserve(s,"receipt-reservation");EventRecordingLinkV1 link;link.link_id="owner-link";link.event_id="owner-event";link.source_id=link.channel_id="probe-channel";link.time_basis="utc-ms";link.status=EventRecordingLinkStatus::Pending;link.created_at_ms=1000;link.requested_range={1000,2000};std::string error;
 for(unsigned i=0;i<3;++i){link.updated_at_ms=1000+i;link.completeness_reason=std::string(200,'x');Need(s.catalog.PutEventLink(link,&error));}
 auto original=ownership_probe::JournalView(s.journal);const auto before=Canonical(original);ownership_probe::History candidate;Need(s.journal.PrepareCheckpoint(&s.catalog,&candidate,&error));Need(original.size()==candidate.size());unsigned changed=0;bool copies=true;
 for(std::size_t i=0;i<original.size();++i){const auto* a=ownership_probe::Get(original[i]);const auto* b=ownership_probe::Get(candidate[i]);if(a->mutation_type!=b->mutation_type){++changed;copies=copies&&a!=b&&a->mutation_type==RecordingMutationType::EventLinkCreated&&b->mutation_type==RecordingMutationType::EventLinkReceipt;}else copies=copies&&a==b;}
 Check(changed==2&&copies,"LP18-O02 only transformed receipts own new envelopes");Check(Canonical(original)==before,"LP18-O02 prepared receipts preserve original canonical bytes");
 const auto expected=Canonical(candidate);Need(s.catalog.Checkpoint(&error));Check(Bytes(s.journal.path())==expected&&Canonical(original)==before,"LP18-O02 publication bytes and prior owned snapshot remain exact");
#if LP18_SHARED_RECORDS
 const auto published=ownership_probe::JournalView(s.journal);bool aliases=s.catalog.checkpoint_cache_&&published.size()==s.catalog.checkpoint_cache_->prefix.size();
 if(aliases)for(std::size_t i=0;i<published.size();++i)aliases=aliases&&ownership_probe::Get(published[i])==ownership_probe::Get(s.catalog.checkpoint_cache_->prefix[i]);
 Check(aliases,"LP18-O02 published journal and prefix share transformed receipt envelopes");
#endif
 RecordingCatalog full(s.journal,Store::Options(root));bool ok=true;for(const auto& m:s.journal.Replay().mutations)ok=full.ApplyMutationLocked(m,false,&error)&&ok;
 Check(ok&&s.catalog.checkpoint_cache_&&s.catalog.checkpoint_cache_->shadow&&full.ProjectionSignatureLocked()==s.catalog.checkpoint_cache_->shadow->ProjectionSignatureLocked(),"LP18-O02 receipt independent full projection equality");
 auto stale=ownership_probe::JournalView(s.journal);link.updated_at_ms++;Need(s.catalog.PutEventLink(link,&error));Check(!s.journal.CommitCheckpoint(&s.catalog,stale,false,&error),"LP18-O03 stale candidate after ordinary append rejected");
}
void Bounds(){
 using namespace recording::detail;ownership_probe::History h(kCheckpointCacheRecords);RecordingMutationV1 value;for(auto& p:h)ownership_probe::Set(p,value);
 Check(CheckpointCacheAdmissible(h),"LP18-O05 8192 logical records admitted");h.push_back(h[0]);Check(!CheckpointCacheAdmissible(h),"LP18-O05 8193 aliases still rejected");h.resize(1);
 const auto overhead=sizeof(RecordingMutationV1)+value.schema.size()+value.mutation_id.size()+value.entity_id.size();value.payload_json.assign(kCheckpointCacheBytes-overhead,'x');ownership_probe::Set(h[0],value);
 Check(CheckpointCacheAdmissible(h),"LP18-O05 64MiB logical bytes admitted");value.payload_json.push_back('x');ownership_probe::Set(h[0],std::move(value));Check(!CheckpointCacheAdmissible(h),"LP18-O05 64MiB plus one rejected");
}
// baseline 문자열과 GREEN envelope 표현을 모두 실제 동작으로 검사한다.
using Accepted=typename decltype(std::declval<RecordingCatalog>().accepted_segment_state_mutations_)::mapped_type;
std::string AcceptedBytes(const Accepted& value){
#if LP18_ACCEPTED_SHARED
 return value?SerializeRecordingMutationV1(*value):std::string();
#else
 return value;
#endif
}
const RecordingMutationV1* AcceptedAddress(const Accepted& value){
#if LP18_ACCEPTED_SHARED
 return value.get();
#else
 (void)value;return nullptr;
#endif
}
Accepted AcceptedValue(const RecordingMutationV1& value){
#if LP18_ACCEPTED_SHARED
 return std::make_shared<const RecordingMutationV1>(value);
#else
 return SerializeRecordingMutationV1(value);
#endif
}
bool ApplyOwned(RecordingCatalog& catalog,const RecordingMutationV1& value,const RecordingMutationHandle& owned,std::string* error){
#if LP18_ACCEPTED_SHARED
 return catalog.ApplyMutationLocked(value,false,error,nullptr,owned);
#else
 (void)owned;return catalog.ApplyMutationLocked(value,false,error);
#endif
}
RecordingSegmentV1 AcceptedSegment(){RecordingSegmentV1 s;s.segment_id="accepted-segment";s.source_id=s.channel_id="probe-channel";s.stream_epoch_id="probe-epoch";s.start={1000,0,1,1000000000};s.end={2000,1000000000,1,1000000000};s.container="mp4";s.video_codecs={"h264"};s.audio_omitted_reason="source-no-audio";s.size_bytes=12;s.checksum_sha256=std::string(64,'a');s.retention_class=RecordingRetentionClass::Continuous;s.lifecycle=RecordingLifecycle::Finalized;s.created_at_ms=1000;s.finalized_at_ms=2000;return s;}
void SeedAccepted(Store& store){const unsigned char bytes[]={0,0,0,12,'f','t','y','p','i','s','o','m'};{std::ofstream out(store.root/"accepted.mp4",std::ios::binary);out.write(reinterpret_cast<const char*>(bytes),sizeof(bytes));Need(static_cast<bool>(out));}std::string error;Need(store.catalog.FinalizeSegment(AcceptedSegment(),(store.root/"accepted.mp4").string(),&error));}
int SqlSegments(RecordingCatalog& catalog){sqlite3_stmt* stmt=nullptr;Need(sqlite3_prepare_v2(catalog.sqlite_db_,"SELECT count(*) FROM recording_segments",-1,&stmt,nullptr)==SQLITE_OK);Need(sqlite3_step(stmt)==SQLITE_ROW);const int result=sqlite3_column_int(stmt,0);sqlite3_finalize(stmt);return result;}
void AcceptedSharing(const std::filesystem::path& root){
 RecordingMutationV1 durable;
 {Store s(root);SeedAccepted(s);auto records=ownership_probe::JournalView(s.journal);Need(records.size()==1);durable=*records[0];const auto& live=s.catalog.accepted_segment_state_mutations_.at(durable.mutation_id);
  Check(AcceptedAddress(live)==records[0].get(),"LP18-O07 append accepted shares journal envelope");
#if LP18_ACCEPTED_SHARED
  std::string error;RecordingMutationHandle retry=records[0];const auto disk=Bytes(s.journal.path());
  const bool retried=s.journal.AppendOwned(durable,&s.catalog,&error,&retry);
  Check(retried&&retry&&detail::SameCheckpointPrefix(RecordingMutationHandles{retry},records)&&Bytes(s.journal.path())==disk,"LP18-O09 successful append retry returns exact input envelope");
  auto conflict=durable;++conflict.occurred_at_ms;
  Check(!s.journal.AppendOwned(conflict,&s.catalog,&error,&retry)&&!retry&&Bytes(s.journal.path())==disk,"LP18-O09 failed append clears prior output handle");
  auto alias=std::make_shared<const RecordingMutationV1>(durable);
  const bool alias_retry=s.journal.AppendOwned(*alias,&s.catalog,&error,&alias);
  Check(alias_retry&&alias&&detail::SameCheckpointPrefix(RecordingMutationHandles{alias},records)&&Bytes(s.journal.path())==disk,"LP18-O09 borrowed input survives aliased output reset");
#endif
  Need(s.catalog.Checkpoint(nullptr));Need(s.catalog.checkpoint_cache_&&s.catalog.checkpoint_cache_->shadow);const auto& shadow=s.catalog.checkpoint_cache_->shadow->accepted_segment_state_mutations_.at(durable.mutation_id);
  Check(AcceptedAddress(shadow)==records[0].get()&&AcceptedAddress(live)==AcceptedAddress(shadow),"LP18-O07 checkpoint accepted shares live journal envelope");
  Check(AcceptedBytes(live)==SerializeRecordingMutationV1(durable)&&AcceptedBytes(shadow)==AcceptedBytes(live)&&Bytes(s.journal.path())==Canonical(records),"LP18-O07 accepted full canonical and durable bytes unchanged");}
 for(bool sql:{true,false}){RecordingJournal journal(RecordingJournal::ManagedOptions{root,"probe-store"});std::string error;Need(journal.Open(&error));auto options=Store::Options(root);options.prefer_sqlite=sql;RecordingCatalog catalog(journal,options);Need(catalog.Open(&error));auto records=ownership_probe::JournalView(journal);Need(records.size()==1);const auto id=durable.mutation_id;const auto& accepted=catalog.accepted_segment_state_mutations_.at(id);const std::string mode=sql?"sqlite":"fallback";
  Check(AcceptedAddress(accepted)==records[0].get(),"LP18-O08 reopen accepted shares journal envelope "+mode);
  Check(catalog.catalog_mode_==(sql?"sqlite-primary":"jsonl-fallback")&&AcceptedBytes(accepted)==SerializeRecordingMutationV1(durable)&&catalog.accepted_segment_state_replay_ordinals_.count(0)==1&&catalog.segments_.count(durable.entity_id)==1,"LP18-O08 reopen canonical ordinal and projection preserved "+mode);
  if(sql){const auto saved=accepted;bool gates=SqlSegments(catalog)==1;catalog.accepted_segment_state_replay_ordinals_.clear();Need(catalog.RebuildSqliteLocked(&error));gates=gates&&SqlSegments(catalog)==0;catalog.accepted_segment_state_replay_ordinals_.insert(0);auto changed=durable;++changed.occurred_at_ms;catalog.accepted_segment_state_mutations_[id]=AcceptedValue(changed);Need(catalog.RebuildSqliteLocked(&error));gates=gates&&SqlSegments(catalog)==0;catalog.accepted_segment_state_mutations_[id]=saved;Need(catalog.RebuildSqliteLocked(&error));gates=gates&&SqlSegments(catalog)==1;Check(gates,"LP18-O08 SQLite rebuild requires canonical and ordinal gates");}
 }
 RecordingJournal journal(RecordingJournal::ManagedOptions{root,"probe-store"});std::string error;Need(journal.Open(&error));
 for(const char* field:{"schema","type","id","entity","time","payload"}){RecordingCatalog catalog(journal,Store::Options(root));auto altered=durable;const std::string name=field;if(name=="schema")altered.schema+="x";if(name=="type")altered.mutation_type=RecordingMutationType::Unknown;if(name=="id")altered.mutation_id+="x";if(name=="entity")altered.entity_id+="x";if(name=="time")++altered.occurred_at_ms;if(name=="payload")altered.payload_json+=" ";const auto handle=std::make_shared<const RecordingMutationV1>(altered);
  Check(!ApplyOwned(catalog,durable,handle,&error)&&catalog.mutation_ids_.empty()&&catalog.accepted_segment_state_mutations_.empty()&&catalog.segments_.empty(),"LP18-O09 supplied envelope mismatch rejected "+name);}
 {RecordingCatalog catalog(journal,Store::Options(root));auto invalid=durable;invalid.payload_json="{}";const auto handle=std::make_shared<const RecordingMutationV1>(invalid);Check(!ApplyOwned(catalog,invalid,handle,&error)&&catalog.mutation_ids_.empty()&&catalog.accepted_segment_state_mutations_.empty(),"LP18-O09 failed apply registers no accepted envelope");}
 {RecordingCatalog catalog(journal,Store::Options(root));auto handle=std::make_shared<const RecordingMutationV1>(durable);Need(ApplyOwned(catalog,durable,handle,&error));Check(AcceptedAddress(catalog.accepted_segment_state_mutations_.at(durable.mutation_id))==handle.get(),"LP18-O09 supplied exact envelope is retained");auto different=durable;++different.occurred_at_ms;const bool duplicate=catalog.ApplyMutationLocked(durable,true,&error);const bool conflict=catalog.ApplyMutationLocked(different,true,&error);Check(duplicate&&!conflict&&catalog.accepted_segment_state_mutations_.size()==1&&AcceptedBytes(catalog.accepted_segment_state_mutations_.at(durable.mutation_id))==SerializeRecordingMutationV1(durable),"LP18-O09 duplicate full canonical acceptance and collision rejection preserved");}
#if LP18_ACCEPTED_SHARED
 {Store s(root/"retry-receipt");EventRecordingLinkV1 link;link.link_id="retry-link";link.event_id="retry-event";link.source_id=link.channel_id="probe-channel";link.time_basis="utc-ms";link.status=EventRecordingLinkStatus::Pending;link.created_at_ms=1000;link.requested_range={1000,2000};
  for(unsigned i=0;i<3;++i){link.updated_at_ms=1000+i;link.completeness_reason=std::string(200,'x');Need(s.catalog.PutEventLink(link,&error));}
  const auto original=ownership_probe::JournalView(s.journal);Need(original.size()==3);Need(s.catalog.Checkpoint(&error));const auto compact=ownership_probe::JournalView(s.journal);Need(compact.size()==3&&compact[0]->mutation_type==RecordingMutationType::EventLinkReceipt);const auto disk=Bytes(s.journal.path());RecordingMutationHandle retried;
  const bool ok=s.journal.AppendOwned(*original[0],&s.catalog,&error,&retried);
  Check(ok&&retried&&retried->mutation_type==RecordingMutationType::EventLinkCreated&&detail::SameCheckpointPrefix(RecordingMutationHandles{retried},original)&&Bytes(s.journal.path())==disk&&Canonical(ownership_probe::JournalView(s.journal))==Canonical(compact),"LP18-O09 compacted receipt retry returns original input envelope");}
#endif
}
}
int main(int argc,char** argv){if(argc!=2&&(argc!=3||std::string(argv[2])!="accepted"))return 2;try{const std::filesystem::path root=argv[1];AliasAndValue(root/"alias");Receipts(root/"receipt");Bounds();if(argc==3)AcceptedSharing(root/"accepted");std::cout<<"[summary] LP18 pass="<<passed<<" fail="<<failed<<'\n';return failed?1:0;}catch(...){std::cout<<"[setup-or-oracle-fail] LP18 fixed-fixture-error\n";return 2;}}

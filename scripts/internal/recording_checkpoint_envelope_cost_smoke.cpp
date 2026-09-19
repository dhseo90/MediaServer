// LP18 checkpoint envelope 비용: encoder 없는 기존 managed Store와 oracle helper 재사용.
// 계측은 빌더가 소유한 journal 복제본에서만 제공하며 제품 분기를 바꾸지 않는다.
#define main recording_envelope_unused_ownership_main
#include "recording_immutable_ownership_smoke.cpp"
#undef main
#include <limits>

namespace envelope_cost_probe {
void Reset();
std::size_t Serializations();
std::size_t JournalBytesCalls();
}
namespace {
RecordingMutationHandles Owned(const std::vector<RecordingMutationV1>& records){
 RecordingMutationHandles result;
 for(const auto& record:records)result.push_back(std::make_shared<const RecordingMutationV1>(record));
 return result;
}
bool Both(const std::vector<RecordingMutationV1>& a,const std::vector<RecordingMutationV1>& b){
 const bool values=detail::SameCheckpointSequence(a,b);
 const bool handles=detail::SameCheckpointSequence(Owned(a),Owned(b));
 return values&&handles;
}
bool Neither(const std::vector<RecordingMutationV1>& a,const std::vector<RecordingMutationV1>& b){
 const bool values=detail::SameCheckpointSequence(a,b);
 const bool handles=detail::SameCheckpointSequence(Owned(a),Owned(b));
 return !values&&!handles;
}
void SequenceCases(){
 RecordingMutationV1 a;a.mutation_id="envelope-a";a.entity_id="entity-a";a.mutation_type=RecordingMutationType::EventLinkCreated;a.payload_json="{\"x\":1}";
 auto b=a;b.mutation_id="envelope-b";
 const auto independent_a=Owned({a,b}),independent_b=Owned({a,b});
 Check(independent_a[0]!=independent_b[0]&&Both({a,b},{a,b})&&detail::SameCheckpointSequence(independent_a,independent_b),"LP18-E01 independent value and owned sequences compare equal");
 for(const char* field:{"schema","type","id","entity","time","payload"}){
  auto changed=a;const std::string name=field;
  if(name=="schema")changed.schema+="x";
  if(name=="type")changed.mutation_type=RecordingMutationType::Unknown;
  if(name=="id")changed.mutation_id+="x";
  if(name=="entity")changed.entity_id+="x";
  if(name=="time")++changed.occurred_at_ms;
  if(name=="payload")changed.payload_json="{\"x\":2}";
  Check(Neither({a},{changed}),"LP18-E01 full field mismatch rejected "+name);
 }
 Check(Neither({a,b},{b,a}),"LP18-E01 sequence order remains significant");
 Check(Neither({a},{a,b}),"LP18-E01 sequence count remains significant");
 const RecordingMutationHandles nulls{RecordingMutationHandle{}};
 Check(!detail::SameCheckpointSequence(nulls,Owned({a}))&&!detail::SameCheckpointSequence(Owned({a}),nulls)&&!detail::SameCheckpointSequence(nulls,nulls),"LP18-E01 null on either side remains rejected");
 auto invalid=a;invalid.schema="fixture-invalid-schema";
 Check(Both({invalid},{invalid}),"LP18-E01 identical invalid schema retains comparison result");
 invalid=a;invalid.mutation_type=static_cast<RecordingMutationType>(999);
 Check(Both({invalid},{invalid}),"LP18-E01 identical invalid enum retains comparison result");
 auto unknown=invalid;unknown.mutation_type=RecordingMutationType::Unknown;
 Check(SerializeRecordingMutationV1(unknown)==SerializeRecordingMutationV1(invalid)&&Neither({unknown},{invalid}),"LP18-E01 enum canonical collision remains rejected");
 auto escaped=a;escaped.mutation_id="quote\"slash\\\n\r\t";escaped.mutation_id.push_back('\0');escaped.mutation_id.push_back('\1');escaped.entity_id=escaped.mutation_id;
 auto other_control=escaped;other_control.mutation_id.back()='\2';
 Check(Both({escaped},{escaped})&&Neither({escaped},{other_control}),"LP18-E01 escape and control bytes retain exact comparison");
 auto low=a,high=a;low.occurred_at_ms=std::numeric_limits<std::int64_t>::min();high.occurred_at_ms=std::numeric_limits<std::int64_t>::max();
 Check(Both({low,high},{low,high})&&Neither({low},{high}),"LP18-E01 int64 boundaries retain exact comparison");
 auto spaced=a;spaced.payload_json=" "+a.payload_json;
 Check(Neither({a},{spaced}),"LP18-E01 payload whitespace remains significant");
 envelope_cost_probe::Reset();
 const bool equality=Both({a,b},{a,b});const auto serialized=envelope_cost_probe::Serializations();
 Check(equality&&serialized==0,"LP18-E02 SameSequence performs zero envelope serializations");
 std::cout<<"[envelope-counts] sequenceSerializations="<<serialized<<'\n';
}
void CommitCases(const std::filesystem::path& root){
 Store store(root);Reserve(store,"envelope-reservation-a");Reserve(store,"envelope-reservation-b");
 EventRecordingLinkV1 link;link.link_id="envelope-link";link.event_id="envelope-event";link.source_id=link.channel_id="probe-channel";link.time_basis="utc-ms";link.status=EventRecordingLinkStatus::Pending;link.created_at_ms=1000;link.requested_range={1000,2000};std::string error;
 for(unsigned i=0;i<3;++i){link.updated_at_ms=1000+i;link.completeness_reason=std::string(200,'x');Need(store.catalog.PutEventLink(link,&error));}
 const auto original=ownership_probe::JournalView(store.journal);const auto original_bytes=Canonical(original);
 // 예약은 원장에 직접 append한 fixture다. 아직 reconcile하지 않은 live가 아닌
 // 동일 원본 이력의 독립 full replay를 압축 후 projection과 대조한다.
 RecordingCatalog before(store.journal,Store::Options(root));
 for(const auto& m:original)Need(before.ApplyMutationLocked(*m,false,&error));
 const auto original_projection=before.ProjectionSignatureLocked();
 RecordingMutationHandles candidate;Need(store.journal.PrepareCheckpoint(&store.catalog,&candidate,&error));
 std::size_t receipts=0;for(auto& handle:candidate){receipts+=handle->mutation_type==RecordingMutationType::EventLinkReceipt;handle=std::make_shared<const RecordingMutationV1>(*handle);}
 const auto expected=Canonical(candidate);Need(expected.size()<original_bytes.size());
 Check(receipts==2&&Bytes(store.journal.path())==original_bytes,"LP18-E03 receipt candidate preparation preserves original bytes");
 envelope_cost_probe::Reset();const bool committed=store.journal.CommitCheckpoint(&store.catalog,candidate,false,&error);const auto calls=envelope_cost_probe::JournalBytesCalls();
 Check(committed&&calls==1,"LP18-E04 CommitCheckpoint builds JournalBytes exactly once");
 Need(committed);
 Check(Bytes(store.journal.path())==expected&&Canonical(original)==original_bytes,"LP18-E03 independent candidate publishes exact bytes and preserves prior owner");
 RecordingCatalog replayed(store.journal,Store::Options(root));bool valid=true;for(const auto& m:store.journal.Replay().mutations)valid=replayed.ApplyMutationLocked(m,false,&error)&&valid;
 Check(valid&&replayed.ProjectionSignatureLocked()==original_projection,"LP18-E03 compacted bytes retain independent full projection");
 std::cout<<"[envelope-counts] commitJournalBytes="<<calls<<'\n';
 for(const char* field:{"schema","type","id","entity","time","payload","order","count","null"}){
  auto changed=candidate;auto mutation=*changed[0];const std::string name=field;
  if(name=="schema")mutation.schema+="x";
  if(name=="type")mutation.mutation_type=RecordingMutationType::Unknown;
  if(name=="id")mutation.mutation_id+="x";
  if(name=="entity")mutation.entity_id+="x";
  if(name=="time")++mutation.occurred_at_ms;
  if(name=="payload")mutation.payload_json+=" ";
  changed[0]=std::make_shared<const RecordingMutationV1>(std::move(mutation));
  if(name=="order")std::swap(changed[0],changed[1]);
  if(name=="count")changed.pop_back();
  if(name=="null")changed[0].reset();
  envelope_cost_probe::Reset();const bool rejected=!store.journal.CommitCheckpoint(&store.catalog,changed,false,&error);const auto rejected_calls=envelope_cost_probe::JournalBytesCalls();
  Check(rejected&&rejected_calls==0&&Bytes(store.journal.path())==expected,"LP18-E03 invalid candidate rejected before byte building "+name);
 }
}
}
int main(int argc,char** argv){
 if(argc!=2)return 2;
 try{SequenceCases();CommitCases(std::filesystem::path(argv[1])/"envelope-cost");std::cout<<"[summary] LP18 pass="<<passed<<" fail="<<failed<<'\n';return failed?1:0;}
 catch(...){std::cout<<"[setup-or-oracle-fail] LP18 fixed-envelope-cost-error\n";return 2;}
}

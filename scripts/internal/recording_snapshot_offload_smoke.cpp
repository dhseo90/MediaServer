// 기존 유효 원본 fixture를 재사용하고 실제 cold 파싱 경계의 mutex 점유를 확인한다.
#define main lp20_unused_typed_main
#include "recording_typed_lifetime_smoke.cpp"
#undef main
#include "recording_snapshot_offload_counter.h"
#include <future>
#include <thread>
#include <functional>
namespace {
std::vector<std::string> Canonical(const std::vector<RecordingDerivedSourceSnapshotEntry>& rows){
 std::vector<std::string> out;for(const auto& row:rows)out.push_back(SerializeRecordingSegmentV2(row.segment)+"|"+(row.binding?SerializeRecordingSourceBindingV1(*row.binding):"unbound")+"|"+std::to_string(static_cast<int>(row.lifecycle))+"|"+std::to_string(row.deleted));return out;
}
void SnapshotCases(const std::filesystem::path& root){
 Store s(root);const auto reference=s.input.intent.reference;std::vector<RecordingDerivedSourceSnapshotEntry> expected;
 Need(s.catalog.SnapshotDerivedSourcesLocked(reference,&expected,&s.error));const auto canonical=Canonical(expected);const auto bytes=Bytes(s.journal.path());
 snapshot_probe::Arm();std::vector<RecordingDerivedSourceSnapshotEntry> actual;std::string query_error;bool ok=false;
 std::thread query([&]{try{ok=s.catalog.SnapshotDerivedSources(reference,&actual,&query_error);}catch(...){ok=false;}});
 const bool entered=snapshot_probe::Entered();std::promise<void> done;auto completed=done.get_future();
 std::thread independent([&]{s.catalog.ListEventLinks(EventRecordingLinkStatus::Pending);done.set_value();});
 const bool progressed=completed.wait_for(std::chrono::milliseconds(500))==std::future_status::ready;
 // 실패 경로에서도 barrier와 두 스레드를 반드시 정리한다.
 snapshot_probe::Release();query.join();independent.join();
 Check(entered,"LP20-Q01 snapshot reaches actual cold binding parse barrier");
 Check(entered&&progressed,"LP20-Q01 independent query completes while snapshot binding parse is paused");
 Check(ok&&Canonical(actual)==canonical&&Bytes(s.journal.path())==bytes,"LP20-Q01 complete snapshot preserves locked canonical projection and durable bytes");
 Need(!actual.empty()&&actual[0].binding);actual[0].binding->samples.clear();std::vector<RecordingDerivedSourceSnapshotEntry> again;
 Check(s.catalog.SnapshotDerivedSources(reference,&again,&s.error)&&Canonical(again)==canonical,"LP20-Q01 public snapshot values remain independent across calls");
 std::uint64_t token=0;std::vector<RecordingDerivedSourceSnapshotEntry> leased;
 const bool lease=s.catalog.SnapshotDerivedSourcesWithWaitLease(reference,{*reference.original},&token,&leased,&s.error);
 Check(lease&&token&&Canonical(leased)==canonical&&s.catalog.derived_wait_leases_.at(token).source_ids.count("segment")==1&&s.catalog.ReleaseDerivedWaitLease(token,&s.error),"LP20-Q02 wait lease atomically protects the returned source snapshot");
}
#if LP20_SNAPSHOT_OFFLOAD
void AddSource(Store& s,const std::string& id,const std::string& generation="gen"){
 auto segment=s.input.source.segment;segment.segment_id=id;segment.order_request_id=id+"-order";
 RecordingOrderReservationV1 order;Need(s.journal.ReserveRecordingOrder("store",segment.order_request_id,id,"channel",&order,&s.error));segment.order_sequence=order.sequence;
 auto binding=*s.input.source.binding;binding.segment_id=id;binding.source_generation=generation;
 const auto file=s.root/"channel"/(id+".mp4");Need(WriteContainedFileDurably(s.root,file,"0123456789ab",&s.error));Need(s.catalog.FinalizeBoundSegmentV2(segment,binding,file.string(),&s.error));
}
struct RaceResult {bool entered=false,progress=false,ok=false;std::vector<RecordingDerivedSourceSnapshotEntry> rows;};
RaceResult Race(Store& s,const std::function<void()>& change,std::uint64_t* lease=nullptr){
 RaceResult r;std::string error;snapshot_probe::Arm();
 std::thread query([&]{try{r.ok=lease?s.catalog.SnapshotDerivedSourcesWithWaitLease(s.input.intent.reference,{*s.input.intent.reference.original},lease,&r.rows,&error):s.catalog.SnapshotDerivedSources(s.input.intent.reference,&r.rows,&error);}catch(...){r.ok=false;}});
 r.entered=snapshot_probe::Entered();std::promise<bool> done;auto completed=done.get_future();
 std::thread writer([&]{try{change();done.set_value(true);}catch(...){done.set_value(false);}});
 r.progress=completed.wait_for(std::chrono::milliseconds(500))==std::future_status::ready;
 snapshot_probe::Release();query.join();writer.join();r.progress=r.progress&&completed.get();return r;
}
void ChangedReference(Store& s){auto reference=s.input.intent.reference;reference.reference_id="other-request";Need(s.catalog.PutConsumerReference(reference,&s.error));}
void SnapshotSafety(const std::filesystem::path& root){
 {Store s(root/"acquire-exception");snapshot_probe::throw_acquire=true;std::vector<RecordingDerivedSourceSnapshotEntry> rows(1);bool returned=false,escaped=false;try{returned=s.catalog.SnapshotDerivedSources(s.input.intent.reference,&rows,&s.error);}catch(...){escaped=true;}
  Check(!escaped&&!returned&&rows.empty()&&!s.catalog.derived_job_state_authoritative_,"LP20-Q02 acquisition exception clears output and returns uncertainty without throwing");}
 {Store s(root/"resident");const auto owned=s.catalog.FindSourceBindingOwnedLocked("segment");Need(static_cast<bool>(owned));s.catalog.source_bindings_.at("segment").resident=owned;snapshot_probe::parses=0;std::vector<RecordingDerivedSourceSnapshotEntry> rows;
  Check(s.catalog.SnapshotDerivedSources(s.input.intent.reference,&rows,&s.error)&&rows.size()==1&&rows[0].binding&&SerializeRecordingSourceBindingV1(*rows[0].binding)==SerializeRecordingSourceBindingV1(*owned)&&snapshot_probe::parses==0,"LP20-Q01 resident fallback retains binding validation and canonical value");}
 {Store s(root/"all");AddSource(s,"second");std::vector<RecordingDerivedSourceSnapshotEntry> old,rows;Need(s.catalog.SnapshotDerivedSourcesLocked(s.input.intent.reference,&old,&s.error));
  Check(s.catalog.SnapshotDerivedSources(s.input.intent.reference,&rows,&s.error)&&rows.size()==2&&Canonical(rows)==Canonical(old)&&rows[0].segment.order_sequence<rows[1].segment.order_sequence,"LP20-Q01 all relevant candidates preserve deterministic ordering");}
 {Store s(root/"resident-invalid");auto invalid=*s.input.source.binding;invalid.segment_id="other";s.catalog.source_bindings_.at("segment").resident=std::make_shared<const RecordingSourceBindingV1>(invalid);std::vector<RecordingDerivedSourceSnapshotEntry> rows(1);
  Check(!s.catalog.SnapshotDerivedSources(s.input.intent.reference,&rows,&s.error)&&rows.empty()&&!s.catalog.derived_job_state_authoritative_,"LP20-Q02 resident binding mismatch is rejected by unchanged segment validation");}
 {Store s(root/"filter");AddSource(s,"unrelated","other-generation");snapshot_probe::parses=0;std::vector<RecordingDerivedSourceSnapshotEntry> rows;
  Check(s.catalog.SnapshotDerivedSources(s.input.intent.reference,&rows,&s.error)&&rows.size()==1&&snapshot_probe::parses==1,"LP20-Q01 unrelated generation is filtered before cold materialization");}
 {Store s(root/"deletion");snapshot_probe::locked_snapshots=0;auto r=Race(s,[&]{Need(s.catalog.RequestDeletion("segment","continuous-capacity",&s.error));});std::vector<RecordingDerivedSourceSnapshotEntry> expected;const auto fallbacks=snapshot_probe::locked_snapshots.load();Need(s.catalog.SnapshotDerivedSourcesLocked(s.input.intent.reference,&expected,&s.error));
  Check(r.entered&&r.progress&&r.ok&&fallbacks==1&&Canonical(r.rows)==Canonical(expected)&&r.rows[0].lifecycle==RecordingLifecycle::DeletionPending,"LP20-Q02 concurrent deletion falls back once to current lifecycle");}
 {Store s(root/"apply");snapshot_probe::locked_snapshots=0;auto r=Race(s,[&]{ChangedReference(s);});
  Check(r.entered&&r.progress&&r.ok&&snapshot_probe::locked_snapshots==1&&r.rows.size()==1,"LP20-Q02 successful Apply invalidates prepared snapshot and falls back once");}
 {Store s(root/"failed-apply");snapshot_probe::locked_snapshots=0;const auto revision=s.catalog.source_snapshot_revision_;auto r=Race(s,[&]{std::lock_guard<std::mutex> lock(s.catalog.mu_);RecordingMutationV1 bad;bad.mutation_id="invalid";bad.entity_id="invalid";bad.mutation_type=RecordingMutationType::ConsumerReferencePut;bad.payload_json="{}";Need(!s.catalog.ApplyMutationLocked(bad,false,&s.error));});
  Check(r.entered&&r.progress&&r.ok&&s.catalog.source_snapshot_revision_>revision&&snapshot_probe::locked_snapshots==1,"LP20-Q02 failed Apply also invalidates prepared snapshot");}
 {Store s(root/"lease-release");std::uint64_t token=0;std::vector<RecordingDerivedSourceSnapshotEntry> initial;Need(s.catalog.SnapshotDerivedSourcesWithWaitLease(s.input.intent.reference,{*s.input.intent.reference.original},&token,&initial,&s.error));const auto old=token;
  auto r=Race(s,[&]{Need(s.catalog.ReleaseDerivedWaitLease(old,&s.error));},&token);
  Check(r.entered&&r.progress&&!r.ok&&r.rows.empty()&&token==old&&s.catalog.derived_wait_leases_.empty(),"LP20-Q02 released wait token is rejected at final atomic publication");}
 {Store s(root/"lease-cap-race");std::uint64_t token=0;auto r=Race(s,[&]{for(int i=0;i<32;++i){std::uint64_t other=0;std::vector<RecordingDerivedSourceSnapshotEntry> rows;Need(s.catalog.SnapshotDerivedSourcesWithWaitLease(s.input.intent.reference,{},&other,&rows,&s.error));}},&token);
  Check(r.entered&&r.progress&&!r.ok&&r.rows.empty()&&!token&&s.catalog.derived_wait_leases_.size()==32,"LP20-Q02 concurrent wait lease cap is rechecked before registration");}
 {Store s(root/"lease-input");std::uint64_t token=0;std::vector<RecordingDerivedSourceSnapshotEntry> rows(1);snapshot_probe::parses=0;
  Check(!s.catalog.SnapshotDerivedSourcesWithWaitLease(s.input.intent.reference,std::vector<RecordingConsumerOriginalV1>(4097),&token,&rows,&s.error)&&rows.empty()&&!token&&snapshot_probe::parses==0,"LP20-Q02 wait input cap rejects before any detail parsing");}
 {Store s(root/"lease-reference");std::uint64_t token=0;std::vector<RecordingDerivedSourceSnapshotEntry> rows;Need(s.catalog.SnapshotDerivedSourcesWithWaitLease(s.input.intent.reference,{},&token,&rows,&s.error));auto other=s.input.intent.reference;other.reference_id="different";snapshot_probe::parses=0;
  Check(!s.catalog.SnapshotDerivedSourcesWithWaitLease(other,{},&token,&rows,&s.error)&&rows.empty()&&snapshot_probe::parses==0,"LP20-Q02 wait reference mismatch preserves original lease");}
 {Store s(root/"detach");auto r=Race(s,[&]{std::lock_guard<std::mutex> lock(s.catalog.mu_);s.journal.DetachCatalog(&s.catalog);});
  Check(r.entered&&r.progress&&!r.ok&&r.rows.empty(),"LP20-Q02 detached owner cannot publish prepared snapshot");}
 {Store s(root/"tamper");Tamper(s.journal.path(),"video/0");std::vector<RecordingDerivedSourceSnapshotEntry> rows(1);
  Check(!s.catalog.SnapshotDerivedSources(s.input.intent.reference,&rows,&s.error)&&rows.empty()&&!s.catalog.derived_job_state_authoritative_,"LP20-Q02 strict cold tamper clears output and marks uncertainty");}
 {Store s(root/"authority");auto r=Race(s,[&]{std::lock_guard<std::mutex> lock(s.catalog.mu_);s.catalog.derived_job_state_authoritative_=false;});
  Check(r.entered&&r.progress&&!r.ok&&r.rows.empty(),"LP20-Q02 lost authority prevents prepared snapshot publication");}
 {Store s(root/"overflow");s.catalog.source_snapshot_revision_=std::numeric_limits<std::uint64_t>::max();ChangedReference(s);snapshot_probe::locked_snapshots=0;std::vector<RecordingDerivedSourceSnapshotEntry> rows;
  Check(!s.catalog.source_snapshot_revision_valid_&&s.catalog.SnapshotDerivedSources(s.input.intent.reference,&rows,&s.error)&&rows.size()==1&&snapshot_probe::locked_snapshots==1,"LP20-Q02 saturated revision permanently uses locked snapshot fallback");}
 {Store s(root/"candidate-cap");for(int i=0;i<256;++i)AddSource(s,"cap"+std::to_string(i));std::vector<RecordingDerivedSourceSnapshotEntry> rows(1);
  Check(!s.catalog.SnapshotDerivedSources(s.input.intent.reference,&rows,&s.error)&&rows.empty()&&s.catalog.derived_job_state_authoritative_,"LP20-Q02 full candidate cap rejects without partial output or poisoning");}
 {Store s(root/"lease-source-cap");for(int i=0;i<8;++i)AddSource(s,"lease"+std::to_string(i));std::uint64_t token=0;std::vector<RecordingDerivedSourceSnapshotEntry> rows(1);
  Check(!s.catalog.SnapshotDerivedSourcesWithWaitLease(s.input.intent.reference,{*s.input.intent.reference.original},&token,&rows,&s.error)&&rows.empty()&&!token&&s.catalog.derived_wait_leases_.empty(),"LP20-Q02 source protection cap rejects without partial lease registration");}
}
#endif
}
int main(int argc,char** argv){if(argc!=2)return 2;try{SnapshotCases(std::filesystem::path(argv[1])/"snapshot");
#if LP20_SNAPSHOT_OFFLOAD
 SnapshotSafety(std::filesystem::path(argv[1])/"safety");
#endif
 }catch(...){snapshot_probe::Release();std::cout<<"[error] LP20_SNAPSHOT_SETUP\n";return 2;}std::cout<<"[summary] LP18 pass="<<passed<<" fail="<<failed<<'\n';return failed?1:0;}

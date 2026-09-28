// 파일 용도: 제품 캐시의 존재를 가정하지 않는 행위 검증. 계측은 runner 소유 복제본에만 삽입한다.
#define main recording_checkpoint_reproduction_unused_main
#include "recording_checkpoint_reproduction_smoke.cpp"
#undef main
#include "recording_checkpoint_cache_counter.h"
#include "recording_checkpoint_validation.h"
#include <sys/resource.h>

namespace {
int passed=0,failed=0;
void Check(bool ok,const std::string& label){(ok?passed:failed)++;std::cout<<(ok?"[pass] ":"[fail] ")<<label<<'\n';}
void CheckCount(Store& store,const char* label,std::size_t expected){
 cache_probe::applied=0;std::string error;
 const bool checkpoint=store.catalog.Checkpoint(&error);
 if(!checkpoint)throw std::runtime_error("checkpoint-fixture");
 const bool ok=cache_probe::applied==expected;(ok?passed:failed)++;
 std::cout<<(ok?"[pass] ":"[fail] ")<<label<<" applied="<<cache_probe::applied<<" expected="<<expected<<'\n';
}
void Suffix(Store& store,const char* request){
 RecordingOrderReservationV1 order;std::string error;
 Need(store.journal.ReserveRecordingOrder("probe-store",request,request,"probe-channel",&order,&error));
}
void FullOracle(Store& store,const char* label){
 RecordingCatalog fresh(store.journal,Store::Options(store.root));std::string error;bool valid=true;
 for(const auto& m:store.journal.Replay().mutations)valid=fresh.ApplyMutationLocked(m,false,&error)&&valid;
 Check(valid&&store.catalog.checkpoint_cache_&&store.catalog.checkpoint_cache_->shadow&&
  fresh.ProjectionSignatureLocked()==store.catalog.checkpoint_cache_->shadow->ProjectionSignatureLocked(),label);
}
void PrefixCases(const std::filesystem::path& root){
 Store store(root);Suffix(store,"cache-first");
 CheckCount(store,"LP15-C01 cold full",store.journal.Replay().mutations.size());
 CheckCount(store,"LP15-C01 unchanged prefix",0);
 Suffix(store,"cache-suffix");CheckCount(store,"LP15-C01 exact prefix suffix only",1);
 FullOracle(store,"LP15-C01 independent prefix shadow/full projection equality");
 for(const std::string field:{"schema","type","id","entity","time","payload","reorder","shrink","null-shadow","null-handle"}){
  Need(store.catalog.checkpoint_cache_!=nullptr);auto& cache=*store.catalog.checkpoint_cache_;
  RecordingMutationHandle prefix_owned;Need(store.journal.AcquireMutationLink(cache.prefix[0],&prefix_owned,nullptr));
  auto changed=*prefix_owned;
  if(field=="schema")changed.schema+="x";
  if(field=="type")changed.mutation_type=RecordingMutationType::Unknown;
  if(field=="id")changed.mutation_id+="x";
  if(field=="entity")changed.entity_id+="x";
  if(field=="time")++changed.occurred_at_ms;
  if(field=="payload")changed.payload_json[0]='[';
  Need(store.journal.MakeMutationLink({},changed,std::make_shared<const RecordingMutationV1>(changed),&cache.prefix[0],nullptr));
  if(field=="reorder")std::swap(cache.prefix[0],cache.prefix[1]);
  if(field=="shrink")cache.prefix.push_back(cache.prefix[0]);
  if(field=="null-shadow")cache.shadow.reset();
  if(field=="null-handle")cache.prefix[0]={};
  CheckCount(store,("LP15-C01 full fallback "+field).c_str(),2);
 }
 std::string error;Need(store.catalog.Open(&error));CheckCount(store,"LP15-C01 Open clears cache",2);
 cache_probe::applied=0;bool recovered=false;
 {std::lock_guard lock(store.catalog.mu_);recovered=store.catalog.CheckpointLocked(true,&error);}
 Check(recovered&&cache_probe::applied==2&&!store.catalog.checkpoint_cache_,"LP15-C03 recover full/no-cache");
 CheckCount(store,"LP15-C03 after recover full",2);
 cache_probe::fail_commit=true;const bool refused=!store.catalog.Checkpoint(&error);cache_probe::fail_commit=false;
 Check(refused&&!store.catalog.checkpoint_cache_,"LP15-C03 injected commit refusal discards cache");
 CheckCount(store,"LP15-C03 after commit refusal full",2);
 Suffix(store,"exception-suffix");cache_probe::throw_apply=true;bool threw=false;
 try{store.catalog.Checkpoint(&error);}catch(...){threw=true;}cache_probe::throw_apply=false;
 Check(threw&&!store.catalog.checkpoint_cache_,"LP15-C03 suffix exception discards cache");
 CheckCount(store,"LP15-C03 after exception full",3);
 store.catalog.derived_job_state_authoritative_=false;const bool poison=!store.catalog.Checkpoint(&error);
 Check(poison&&!store.catalog.checkpoint_cache_,"LP15-C03 public poisoned entry discards cache");
 store.catalog.derived_job_state_authoritative_=true;
 CheckCount(store,"LP15-C03 after restored fixture full",3);
}
void Bounds(){
 using namespace recording::detail;
 std::size_t bytes=kCheckpointCacheBytes-1;
 Check(AddCheckpointCacheCharge(1,&bytes)&&bytes==kCheckpointCacheBytes&&!AddCheckpointCacheCharge(1,&bytes),"LP15-C04 exact byte charge boundary");
 Check(!AddCheckpointCacheCharge(std::numeric_limits<std::size_t>::max(),&bytes),"LP15-C04 overflow charge rejected");
 std::vector<RecordingMutationV1> records(kCheckpointCacheRecords);
 Check(CheckpointCacheAdmissible(records),"LP15-C04 8192 records admitted");records.emplace_back();
 Check(!CheckpointCacheAdmissible(records),"LP15-C04 8193 records rejected");records.clear();records.emplace_back();auto& m=records[0];
 const auto overhead=sizeof(m)+m.schema.size()+m.mutation_id.size()+m.entity_id.size();m.payload_json.assign(kCheckpointCacheBytes-overhead,'x');
 Check(CheckpointCacheAdmissible(records),"LP15-C04 64MiB record charge admitted");m.payload_json.push_back('x');
 Check(!CheckpointCacheAdmissible(records),"LP15-C04 64MiB plus one rejected");
}
void ChangedCandidate(const std::filesystem::path& root){
 Store store(root);Suffix(store,"changed-first");CheckCount(store,"LP15-C03 changed candidate prime",1);
 EventRecordingLinkV1 link;link.link_id="cache-link";link.event_id="cache-event";link.source_id=link.channel_id="probe-channel";
 link.time_basis="utc-ms";link.status=EventRecordingLinkStatus::Pending;link.created_at_ms=1000;link.requested_range={1000,2000};
 std::string error;for(int i=0;i<12;++i){link.updated_at_ms=1000+i;link.completeness_reason=std::string(200,'x');Need(store.catalog.PutEventLink(link,&error));}
 CheckCount(store,"LP15-C03 changed candidate suffix12 plus full candidate13",25);
 const auto original=store.journal.Replay();std::size_t receipts=0;for(const auto& m:original.mutations)receipts+=m.mutation_type==RecordingMutationType::EventLinkReceipt;
 RecordingCatalog full(store.journal,Store::Options(root));bool valid=true;
 for(const auto& m:original.mutations)valid=full.ApplyMutationLocked(m,false,&error)&&valid;
 Check(valid&&receipts==11&&store.catalog.checkpoint_cache_&&
  full.ProjectionSignatureLocked()==store.catalog.checkpoint_cache_->shadow->ProjectionSignatureLocked(),"LP15-C03 changed candidate cache equals independent full projection");
 CheckCount(store,"LP15-C03 compacted candidate prefix reused",0);
 link.updated_at_ms++;Need(store.catalog.PutEventLink(link,&error));cache_probe::mismatch=true;
 const bool mismatch=!store.catalog.Checkpoint(&error);cache_probe::mismatch=false;
 Check(mismatch&&!store.catalog.checkpoint_cache_,"LP15-C03 forced projection mismatch discards cache");
}
std::string ProjectionBytes(const std::filesystem::path& path){
 std::ifstream file(path,std::ios::binary);Need(static_cast<bool>(file));return {std::istreambuf_iterator<char>(file),{}};
}
void ProjectionExceptions(const std::filesystem::path& root){
 for(unsigned mode:{1U,2U}){
  Store store(root/(mode==1?"ordinary":"uncertain"));Suffix(store,"projection-prime");std::string error;
  Need(store.catalog.Checkpoint(&error)&&store.catalog.checkpoint_cache_);
  EventRecordingLinkV1 link;link.link_id="projection-link";link.event_id="projection-event";link.source_id=link.channel_id="probe-channel";
  link.time_basis="utc-ms";link.status=EventRecordingLinkStatus::Pending;link.created_at_ms=1000;link.requested_range={1000,2000};
  for(int i=0;i<3;++i){link.updated_at_ms=1000+i;link.completeness_reason=std::string(2000,'x');Need(store.catalog.PutEventLink(link,&error));}
  const auto before=ProjectionBytes(store.journal.path());RecordingMutationHandles candidate;
  Need(store.journal.PrepareCheckpoint(&store.catalog,&candidate,&error));std::string expected;std::size_t receipts=0;
  for(const auto& record:candidate){Need(bool(record));receipts+=record->mutation_type==RecordingMutationType::EventLinkReceipt;expected+=SerializeRecordingMutationV1(*record)+"\n";}
  // 서로 독립된 실제 변경 후보만 사용한다. 주입은 복제본 projection 진입 한 번에 한정한다.
  Need(receipts==2&&expected!=before&&expected.size()<before.size());
  cache_probe::projection_exceptions=0;cache_probe::projection_exception=mode;bool threw=false,ok=false;
  try{ok=store.catalog.Checkpoint(&error);}catch(...){threw=true;}
  cache_probe::projection_exception=0;
  const bool intact=ProjectionBytes(store.journal.path())==before&&!store.catalog.checkpoint_cache_&&cache_probe::projection_exceptions==1;
  if(mode==1){
   const bool authority=store.catalog.derived_job_state_authoritative_;bool retry=false,retry_threw=false;
   try{retry=store.catalog.Checkpoint(&error);}catch(...){retry_threw=true;}
   Check(threw&&intact&&authority&&!retry_threw&&retry&&store.catalog.derived_job_state_authoritative_&&
         store.catalog.checkpoint_cache_&&ProjectionBytes(store.journal.path())==expected,
         "LP18-R07 ordinary projection exception preserves authority and retry eligibility");
  }else{
   Check(!threw&&!ok&&intact&&!store.catalog.derived_job_state_authoritative_,
         "LP18-R07 uncertain projection returns false and preserves durable bytes");
  }
 }
}
void OverRecordLimit(const std::filesystem::path& root){
 Store store(root);Suffix(store,"limit-first");CheckCount(store,"LP15-C04 overlimit prime",1);
 for(std::size_t i=0;i<8192;++i)Suffix(store,("limit-"+std::to_string(i)).c_str());
 CheckCount(store,"LP15-C04 existing cache ignored for oversized original",8193);
 Check(!store.catalog.checkpoint_cache_,"LP15-C04 oversized candidate not retained");
 CheckCount(store,"LP15-C04 next oversized checkpoint full",8193);
}
void ActualCases(const std::filesystem::path& root){
 auto input=Encode(501,false,false,160,90,30,250);Shift(input,0);
 Need(input.packets[250].is_key_frame&&input.packets[500].is_key_frame);
 cache_probe::count=cache_probe::dropped=cache_probe::holds=0;cache_probe::max_hold_us=0;
 cache_probe::automatic_attempts=cache_probe::automatic_noops=cache_probe::automatic_fallbacks=cache_probe::automatic_strict=cache_probe::noop_dropped=0;
 CheckpointCase(root,input);
 for(std::size_t i=0;i<cache_probe::count;++i){const auto& row=cache_probe::rows[i];std::cout<<"[automatic-checkpoint] index="<<i<<" original_records="<<row.records<<" reused_prefix="<<row.first<<" original_applied="<<row.records-row.first<<" total_applied="<<row.applied<<" duration_us="<<row.us<<'\n';}
 for(std::size_t i=0;i<cache_probe::automatic_noops&&i<cache_probe::noop_us.size();++i)std::cout<<"[automatic-checkpoint-noop] index="<<i<<" duration_us="<<cache_probe::noop_us[i]<<'\n';
 std::cout<<"[automatic-checkpoint-paths] attempts="<<cache_probe::automatic_attempts<<" noop="<<cache_probe::automatic_noops<<" fallback="<<cache_probe::automatic_fallbacks<<" strict="<<cache_probe::automatic_strict<<'\n';
 std::cout<<"[transition-hold] count="<<cache_probe::holds<<" max_us="<<cache_probe::max_hold_us<<" scope=UpdateDerivedJob-lock-acquired-to-before-unlock\n";
 Check(cache_probe::automatic_attempts>0&&cache_probe::automatic_attempts==cache_probe::automatic_noops+cache_probe::automatic_fallbacks&&cache_probe::automatic_strict==cache_probe::automatic_fallbacks&&cache_probe::dropped==0&&cache_probe::noop_dropped==0&&cache_probe::holds>0,"LP15-C02 bounded automatic checkpoint and whole transition measurement");
 Store store(root);const auto history=store.journal.Replay();
 std::size_t ready=0,committed=0,complete=0,bytes=0;
 for(const auto& mutation:history.mutations){
  ready+=mutation.mutation_type==RecordingMutationType::DerivedJobReady;
  committed+=mutation.mutation_type==RecordingMutationType::DerivedJobCommitted;
  complete+=mutation.mutation_type==RecordingMutationType::DerivedJobComplete;
  bytes+=SerializeRecordingMutationV1(mutation).size()+1;
 }
 Need(ready==2&&committed==2&&complete==2&&bytes>1024*1024);
 std::cout<<"[shape] LP15-C02 records="<<history.mutations.size()<<" bytes="<<bytes<<" ready="<<ready<<" committed="<<committed<<" complete="<<complete<<'\n';
 CheckCount(store,"LP15-C02 reopened full",history.mutations.size());
 CheckCount(store,"LP15-C02 actual unchanged prefix",0);
 Suffix(store,"actual-cache-suffix");CheckCount(store,"LP15-C02 actual suffix only",1);
 FullOracle(store,"LP15-C02 actual job shadow/full projection equality");
 auto bad=history.mutations.front();bool found=false;
 for(const auto& m:history.mutations)if(m.mutation_type==RecordingMutationType::DerivedJobReady){bad=m;found=true;break;}
 Need(found);bad.mutation_id="illegal-ready-after-complete";
 RecordingCatalog fresh(store.journal,Store::Options(root));std::string error;bool valid=true;
 for(const auto& m:store.journal.Replay().mutations)valid=fresh.ApplyMutationLocked(m,false,&error)&&valid;
 const bool full_rejected=valid&&!fresh.ApplyMutationLocked(bad,false,&error);
 cache_probe::bad_suffix=bad;const bool cached_rejected=!store.catalog.Checkpoint(&error);cache_probe::bad_suffix.reset();
 Check(full_rejected&&cached_rejected&&!store.catalog.checkpoint_cache_,"LP15-C03 illegal Ready after Complete suffix rejected by cached/full paths");
}
}
int main(int argc,char** argv){
 if(argc!=2)return 2;
 try{
  gst_init(nullptr,nullptr);const std::filesystem::path root=argv[1];PrefixCases(root/"independent");Bounds();ChangedCandidate(root/"changed");ProjectionExceptions(root/"projection-exceptions");OverRecordLimit(root/"overlimit");ActualCases(root/"actual-jobs");
  std::cout<<"[summary] LP15 pass="<<passed<<" fail="<<failed<<'\n';
  struct rusage usage{};
  if(::getrusage(RUSAGE_SELF,&usage)!=0||usage.ru_maxrss<=0)throw std::runtime_error("peak-rss-unavailable");
  const auto peak=static_cast<std::uint64_t>(usage.ru_maxrss)
#if defined(__APPLE__)
      ;
#else
      *1024ULL;
#endif
  std::cout<<"[peak-rss] bytes="<<peak<<" source=getrusage-self\n";
  return failed?1:0;
 }catch(...){std::cerr<<"[setup-or-oracle-fail] LP15 fixture unavailable\n";return 2;}
}

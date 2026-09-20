// 기존 유효 bound fixture를 재사용하고 자동 checkpoint 비용만 별도로 계수한다.
#define main lp20_unused_typed_main
#include "recording_typed_lifetime_smoke.cpp"
#undef main
#include "recording_checkpoint_noop_counter.h"
#ifndef LP20_AUTO_NOOP
#define LP20_AUTO_NOOP 0
#endif
namespace {
RecordingMutationV1 NoopInput(const std::string& id,std::size_t padding=0){
 auto ref=Fixture(id).intent.reference;RecordingMutationV1 m;m.mutation_id=id;m.entity_id=ref.reference_id;
 m.mutation_type=RecordingMutationType::ConsumerReferencePut;m.occurred_at_ms=10;
 m.payload_json="{"+std::string(padding,' ')+"\"reference\":"+SerializeRecordingConsumerReferenceV1(ref)+"}";return m;
}
[[maybe_unused]] void NoopWrite(const std::filesystem::path& path,const std::string& bytes){std::ofstream out(path,std::ios::binary|std::ios::trunc);out.write(bytes.data(),bytes.size());out.close();Need(!out.fail());}
[[maybe_unused]] bool NoopTry(Store& s,bool* handled,const void* owner=nullptr){
#if LP20_AUTO_NOOP
 return s.journal.TryAutomaticCheckpointNoop(owner?owner:&s.catalog,s.catalog.mutation_ids_,handled,&s.error);
#else
 (void)s;(void)owner;*handled=false;return true;
#endif
}
[[maybe_unused]] void NoopAutomatic(const std::filesystem::path& root){
 Store s(root);const auto m=NoopInput("automatic",1024*1024);const auto expected=Bytes(s.journal.path())+SerializeRecordingMutationV1(m)+"\n";
 RecordingCatalog expected_full(s.journal,Options(root));for(const auto& row:s.journal.Replay().mutations)Need(expected_full.ApplyMutationLocked(row,false,&s.error));Need(expected_full.ApplyMutationLocked(m,false,&s.error));const auto expected_projection=expected_full.ProjectionSignatureLocked();
 noop_probe::Reset();Need(s.catalog.AppendAndApplyLocked(m,&s.error));const auto parses=noop_probe::parses,serializes=noop_probe::serializes,reads=noop_probe::reads,bytes=noop_probe::bytes;
 RecordingCatalog fresh(s.journal,Options(root));for(const auto& row:s.journal.Replay().mutations)Need(fresh.ApplyMutationLocked(row,false,&s.error));
 auto expected_live=expected_projection;
 // Reserve는 journal 전용이다. 실제 예약 ID 한 개의 수용집합 차이만 정규화한다.
 Need(!s.catalog.mutation_ids_.count("order"));const std::string reservation_id="id5:order";
 Need(std::count(expected_live.begin(),expected_live.end(),reservation_id)==1);expected_live.erase(std::find(expected_live.begin(),expected_live.end(),reservation_id));
 Check(Bytes(s.journal.path())==expected&&fresh.ProjectionSignatureLocked()==expected_projection&&s.catalog.ProjectionSignatureLocked()==expected_live,"LP20-C01 automatic checkpoint preserves exact bytes and full projection");
 Check(reads>0&&bytes>0,"LP20-C01 automatic checkpoint still reads durable raw evidence");
 Check(!s.catalog.source_bindings_.at("segment").ResidentOwned(),"LP20-C04 automatic checkpoint leaves inactive binding detail nonresident");
 Check(parses==0&&serializes==0&&bytes>=expected.size(),"LP20-C01 canonical automatic checkpoint skips historical envelope Parse and Serialize");
 std::cout<<"[noop-cost] parses="<<parses<<" serializes="<<serializes<<" reads="<<reads<<" bytes="<<bytes<<'\n';
}
#if LP20_AUTO_NOOP
[[maybe_unused]] void NoopCases(const std::filesystem::path& root){
 for(int kind=0;kind<3;++kind){Store s(root/("tamper"+std::to_string(kind)));auto bytes=Bytes(s.journal.path());
  if(kind==0){const auto at=bytes.find("segment");Need(at!=std::string::npos);bytes[at]='x';NoopWrite(s.journal.path(),bytes);}
  else if(kind==1)std::filesystem::resize_file(s.journal.path(),bytes.size()-1);
  else{std::filesystem::rename(s.journal.path(),s.root/"old.jsonl");NoopWrite(s.journal.path(),bytes);}
  bool handled=true;Check(!NoopTry(s,&handled)&&!handled&&s.journal.poisoned_,kind==0?"LP20-C02 same-size raw tamper rejects automatic no-op":kind==1?"LP20-C02 truncated raw evidence rejects automatic no-op":"LP20-C02 replaced inode rejects automatic no-op");
 }
 {Store s(root/"owner");int other=0;bool handled=true;Check(!NoopTry(s,&handled,&other)&&!handled&&!s.journal.poisoned_,"LP20-C02 foreign owner cannot claim automatic no-op");s.journal.DetachCatalog(&s.catalog);handled=true;Check(!NoopTry(s,&handled)&&!handled,"LP20-C02 detached owner cannot claim automatic no-op");}
 {Store s(root/"not-applied");const auto m=NoopInput("unapplied");Need(s.journal.AppendOwned(m,&s.catalog,&s.error));bool handled=true;const auto before=Bytes(s.journal.path());Check(NoopTry(s,&handled)&&!handled&&Bytes(s.journal.path())==before,"LP20-C03 durable but unapplied mutation requires strict fallback");}
 for(int kind=0;kind<3;++kind){const auto dir=root/("physical"+std::to_string(kind));std::filesystem::path file;std::string bytes;
  {Store s(dir);file=s.journal.path();bytes=Bytes(file);}if(kind==0)bytes.insert(1," \t");if(kind==1)bytes="\n"+bytes;if(kind==2)bytes+=bytes;NoopWrite(file,bytes);
  Store s(dir,false);bool handled=false;const auto before=Bytes(file);Need(NoopTry(s,&handled));
  if(kind<2){Need(!handled&&s.catalog.Checkpoint(&s.error));Check(Bytes(file).size()<before.size(),kind==0?"LP20-C03 noncanonical envelope retains strict rewrite":"LP20-C03 blank lines retain strict rewrite");}
  else Check(handled&&Bytes(file)==before,"LP20-C03 identical duplicate physical rows preserve ordinal bytes");
 }
 {Store s(root/"events");EventRecordingLinkV1 link;link.link_id="link";link.event_id="event";link.source_id=link.channel_id="channel";link.time_basis="utc-ms";link.status=EventRecordingLinkStatus::Pending;link.created_at_ms=link.updated_at_ms=1000;link.requested_range={1000,2000};link.completeness_reason=std::string(2000,'x');
  Need(s.catalog.PutEventLink(link,&s.error));bool handled=false;Need(NoopTry(s,&handled));Check(handled,"LP20-C03 latest single EventLink remains no-op eligible");
  ++link.updated_at_ms;Need(s.catalog.PutEventLink(link,&s.error));handled=true;Need(NoopTry(s,&handled));Check(!handled,"LP20-C03 superseded EventLink requires strict receipt candidate");
  const auto before=Bytes(s.journal.path());Need(s.catalog.Checkpoint(&s.error));handled=false;Need(NoopTry(s,&handled));Check(handled&&Bytes(s.journal.path()).size()<before.size(),"LP20-C03 committed receipt and latest EventLink regain no-op eligibility");
 }
 for(bool valid:{true,false}){Store s(root/(valid?"pending-valid":"pending-invalid"));const auto before=Bytes(s.journal.path());NoopWrite(s.root/".recording-checkpoint.tmp",valid?before.substr(0,10):"invalid");bool handled=true;Need(NoopTry(s,&handled));Need(!handled);const bool ok=s.catalog.Checkpoint(&s.error);
  Check(valid?(ok&&Bytes(s.journal.path())==before&&!std::filesystem::exists(s.root/".recording-checkpoint.tmp")):(!ok&&s.journal.poisoned_&&Bytes(s.journal.path())==before),valid?"LP20-C03 pending prefix uses existing strict recovery":"LP20-C03 mismatched pending prefix preserves original and rejects");
 }
 {Store s(root/"manual");noop_probe::Reset();{noop_probe::Scope scope;Need(s.catalog.Checkpoint(&s.error));}Check(noop_probe::parses>0&&noop_probe::serializes>0,"LP20-C03 manual checkpoint remains strict");}
 {Store s(root/"exception");const auto m=NoopInput("exception");noop_probe::throw_apply=true;bool escaped=false;try{s.catalog.AppendAndApplyLocked(m,&s.error);}catch(...){escaped=true;}bool handled=true;
  Check(escaped&&s.catalog.derived_job_state_authoritative_&&NoopTry(s,&handled)&&!handled,"LP20-C03 Apply exception preserves authority but disables automatic no-op");}
 {Store s(root/"apply-false");auto m=NoopInput("invalid-reference");m.payload_json="{}";const bool refused=!s.catalog.AppendAndApplyLocked(m,&s.error);bool handled=true;
  Check(refused&&!s.catalog.automatic_noop_eligible_&&s.catalog.derived_job_state_authoritative_&&NoopTry(s,&handled)&&!handled,"LP20-C03 failed Apply disables automatic no-op without changing authority");}
 for(bool exceptional:{false,true}){const auto dir=root/(exceptional?"open-throw":"open-false");{Store seed(dir);}
  RecordingJournal journal(RecordingJournal::ManagedOptions{dir,"store"});std::string error;Need(journal.Open(&error));auto options=Options(dir);if(!exceptional)options.enable_v2_storage=false;RecordingCatalog catalog(journal,options);bool rejected=false;
  if(exceptional){noop_probe::throw_owner=&catalog;noop_probe::throw_apply=true;try{catalog.Open(&error);}catch(...){rejected=true;}noop_probe::throw_owner=nullptr;noop_probe::throw_apply=false;
   // 기존 Open 예외는 attachment를 남긴다. 재시도 거부를 먼저 확인한 뒤 시험 소유권만 정리한다.
   Need(rejected&&!catalog.Open(&error));journal.DetachCatalog(&catalog);
  }
  else{rejected=!catalog.Open(&error);catalog.options_.enable_v2_storage=true;}
  Need(rejected&&catalog.Open(&error));noop_probe::Reset();Need(catalog.AppendAndApplyLocked(NoopInput("after-open",1024*1024),&error));
  Check(!catalog.automatic_noop_eligible_&&noop_probe::parses>0&&catalog.derived_job_state_authoritative_,exceptional?"LP20-C03 exceptional Open retry remains strict on the same catalog instance":"LP20-C03 failed Open retry remains strict on the same catalog instance");
 }
 {Store s(root/"oversize");const auto m=NoopInput("oversize",16*1024*1024);Need(s.catalog.AppendAndApplyLocked(m,&s.error));bool handled=true;const auto before=Bytes(s.journal.path());Need(NoopTry(s,&handled));Check(!handled&&Bytes(s.journal.path())==before&&s.journal.Replay().io_error_count==0,"LP20-C03 oversized accepted row preserves resident strict fallback");}
}
#endif
}
int main(int argc,char** argv){if(argc!=2)return 2;try{const std::filesystem::path root=argv[1];
#if !MEDIA_SERVER_USE_OPENSSL
 Store s(root/"crypto");bool handled=true;const auto before=Bytes(s.journal.path());Check(NoopTry(s,&handled)&&!handled&&!s.catalog.Checkpoint(&s.error)&&Bytes(s.journal.path())==before,"LP20-C03 crypto-off preserves checkpoint rejection and resident support");
#else
 NoopAutomatic(root/"automatic");
#if LP20_AUTO_NOOP
 NoopCases(root/"cases");
#else
 std::cout<<"[not-run] LP20 automatic no-op scenarios=20 reason=capability-unavailable\n";
#endif
#endif
 std::cout<<"[summary] LP18 pass="<<passed<<" fail="<<failed<<'\n';return failed?1:0;
 }catch(...){std::cout<<"[error] LP20_NOOP_SETUP\n";return 2;}}

// 파일 용도: LP18 locator 기반만 검사한다. resident 해제나 전체 RAM 절감을 주장하지 않는다.
#include "recording/recording_journal.h"
#include "recording/recording_catalog.h"
#include "recording_journal_location_counter.h"
#include <filesystem>
#include <fstream>
#include <iostream>
#include <stdexcept>
#include <sys/wait.h>
#include <unistd.h>
#ifndef LP18_LOCATED_RECORDS
#define LP18_LOCATED_RECORDS 0
#endif
#ifndef LP18_LOCATION_CRYPTO_OFF
#define LP18_LOCATION_CRYPTO_OFF 0
#endif
#ifndef LP18_COLD_SUITE
#define LP18_COLD_SUITE 0
#endif
#ifndef LP18_COLD_RECORDS
#define LP18_COLD_RECORDS 0
#endif
#ifndef LP18_CHECKPOINT_SNAPSHOT_SUITE
#define LP18_CHECKPOINT_SNAPSHOT_SUITE 0
#endif
#ifndef LP18_CHECKPOINT_SNAPSHOT
#define LP18_CHECKPOINT_SNAPSHOT 0
#endif
#ifndef LP18_LOGICAL_SUITE
#define LP18_LOGICAL_SUITE 0
#endif
#ifndef LP18_LOGICAL_REFS
#define LP18_LOGICAL_REFS 0
#endif
using namespace recording;
namespace ownership_probe { bool CorruptCheckpointGeneration(RecordingJournal&); }
namespace {
int passed=0,failed=0;
void Need(bool value){if(!value)throw std::runtime_error("LP18_LOCATION_SETUP");}
void Check(bool value,const char* label){++(value?passed:failed);std::cout<<(value?"[pass] ":"[fail] ")<<label<<'\n';}
struct Store {
 std::filesystem::path root;RecordingJournal journal;int owner=0;
 explicit Store(std::filesystem::path path):root(std::move(path)),journal(RecordingJournal::ManagedOptions{root,"location-store"}){
  std::string error;Need(journal.Open(&error));Need(journal.AttachCatalog(&owner,root,root/"recording-catalog.sqlite3",true,&error));
 }
 ~Store(){journal.DetachCatalog(&owner);}
};
RecordingMutationV1 Mutation(const std::string& id,std::size_t padding=32){RecordingMutationV1 m;m.mutation_id=id;m.entity_id="location-link";m.mutation_type=RecordingMutationType::EventLinkCreated;m.occurred_at_ms=1000;m.payload_json="{\"padding\":\""+std::string(padding,'x')+"\"}";return m;}
void Append(Store& s,const RecordingMutationV1& m){std::string error;Need(s.journal.AppendOwned(m,&s.owner,&error));}
std::string Canonical(const RecordingMutationV1& m){return SerializeRecordingMutationV1(m);}
#if LP18_LOCATED_RECORDS
using Token=std::shared_ptr<const RecordingJournalRecordLocation>;
using Tokens=std::vector<Token>;
std::string Bytes(const std::filesystem::path& path){std::ifstream in(path,std::ios::binary);Need(static_cast<bool>(in));return {std::istreambuf_iterator<char>(in),{}};}
// 닫힌 fixture 준비 또는 의도한 불법 외부변조에만 사용한다. 운영 경로는 받지 않는다.
void Write(const std::filesystem::path& path,const std::string& bytes){std::ofstream out(path,std::ios::binary|std::ios::trunc);out.write(bytes.data(),static_cast<std::streamsize>(bytes.size()));out.close();Need(!out.fail());}
Tokens Locations(Store& s){Tokens rows;std::string error;Need(s.journal.ReadRecordLocations(&s.owner,&rows,&error));return rows;}
RecordingMutationHandle Acquire(Store& s,const Token& token){RecordingMutationHandle value;std::string error;Need(s.journal.AcquireLocatedRecord(&s.owner,token,&value,&error)&&value);return value;}
bool Reject(Store& s,const void* owner,const Token& token){std::string error;RecordingMutationHandle out=std::make_shared<const RecordingMutationV1>(Mutation("sentinel"));return !s.journal.AcquireLocatedRecord(owner,token,&out,&error)&&!out;}
void Basic(const std::filesystem::path& root){
 const auto m=Mutation("basic-record");
 {Store s(root);Append(s,m);const auto rows=Locations(s);Need(rows.size()==1);const auto acquired=Acquire(s,rows[0]);
  Check(Canonical(*acquired)==Canonical(m),"LP18-L02 acquired record retains complete canonical value");
  auto replay=s.journal.Replay();Need(replay.mutations.size()==1);replay.mutations[0].payload_json="{}";
  Check(Canonical(*Acquire(s,rows[0]))==Canonical(m),"LP18-L02 public Replay mutation cannot alter acquired immutable value");
  const auto bytes=Bytes(s.journal.path());RecordingMutationHandle retry;std::string error;Need(s.journal.AppendOwned(m,&s.owner,&error,&retry));
  Check(retry&&Canonical(*retry)==Canonical(m)&&Locations(s).size()==1&&Bytes(s.journal.path())==bytes,"LP18-L03 Append retry preserves physical row count and original value");
  RecordingOrderReservationV1 order,again;Need(s.journal.ReserveRecordingOrder("location-store","location-request","location-segment","location-channel",&order,&error));const auto reserved=Bytes(s.journal.path());
  Need(s.journal.ReserveRecordingOrder("location-store","location-request","location-segment","location-channel",&again,&error));
  Check(order.sequence==again.sequence&&Locations(s).size()==2&&Bytes(s.journal.path())==reserved,"LP18-L03 Reserve retry preserves physical row count and sequence");
 }
 {Store s(root);const auto rows=Locations(s);Check(rows.size()==2&&Canonical(*Acquire(s,rows[0]))==Canonical(m)&&Acquire(s,rows[1])->mutation_type==RecordingMutationType::RecordingOrderReserved,"LP18-L02 reopen reconstructs located original and reservation records");}
}
void PhysicalRows(const std::filesystem::path& root){
 const auto small=Mutation("physical-small"),large=Mutation("physical-large",70000);std::filesystem::path path;
 {Store s(root);path=s.journal.path();}
 auto spaced=Canonical(small);spaced.insert(1," \t");const auto raw="\n"+spaced+"\n\n"+Canonical(large)+"\n"+spaced+"\n";Write(path,raw);
 Store s(root);const auto rows=Locations(s);Need(rows.size()==3);
 Check(Canonical(*Acquire(s,rows[0]))==Canonical(small)&&Canonical(*Acquire(s,rows[1]))==Canonical(large)&&Canonical(*Acquire(s,rows[2]))==Canonical(small),"LP18-L04 blank lines whitespace and 64KiB crossing retain exact row order");
 Check(rows[0]&&rows[2]&&rows[0]!=rows[2]&&s.journal.Replay().mutations.size()==3,"LP18-L04 repeated mutation ID retains separate physical row tokens");
 Check(Bytes(path)==raw,"LP18-L04 located reads preserve accepted noncanonical envelope bytes");
}
void Checkpoints(const std::filesystem::path& root){
 Store s(root);std::string error;const auto first=Mutation("checkpoint-first",2000);Append(s,first);auto rows=Locations(s);const auto old_token=rows[0];auto retained=Acquire(s,old_token);RecordingMutationHandles candidate;
 Need(s.journal.PrepareCheckpoint(&s.owner,&candidate,&error));const auto original=Bytes(s.journal.path());Need(s.journal.CommitCheckpoint(&s.owner,candidate,false,&error));
 Check(Canonical(*Acquire(s,old_token))==Canonical(first)&&Bytes(s.journal.path())==original,"LP18-L05 no-write checkpoint keeps existing location generation usable");
 Write(root/".recording-checkpoint.tmp",original.substr(0,10));Need(s.journal.CommitCheckpoint(&s.owner,candidate,true,&error));
 Check(Canonical(*Acquire(s,old_token))==Canonical(first)&&Bytes(s.journal.path())==original&&!std::filesystem::exists(root/".recording-checkpoint.tmp"),"LP18-L05 recover-only pending cleanup keeps existing generation usable");
 Append(s,Mutation("checkpoint-second",2000));Need(s.journal.PrepareCheckpoint(&s.owner,&candidate,&error));Need(candidate.size()==2&&candidate[0]->mutation_type==RecordingMutationType::EventLinkReceipt);const auto expected=Canonical(*candidate[0])+"\n"+Canonical(*candidate[1])+"\n";
 Need(s.journal.CommitCheckpoint(&s.owner,candidate,false,&error));rows=Locations(s);Need(rows.size()==2);
 Check(Bytes(s.journal.path())==expected&&Canonical(*Acquire(s,rows[0]))==Canonical(*candidate[0])&&Canonical(*Acquire(s,rows[1]))==Canonical(*candidate[1]),"LP18-L05 receipt swap rebinds all locations to exact committed bytes");
 Check(Reject(s,&s.owner,old_token)&&!s.journal.poisoned_,"LP18-L05 stale location rejects and clears output without poisoning current journal");
 Check(Canonical(*retained)==Canonical(first),"LP18-L05 previously acquired owned record survives receipt file replacement");
 RecordingMutationHandle retried;Need(s.journal.AppendOwned(first,&s.owner,&error,&retried));
 Check(retried&&retried->mutation_type==RecordingMutationType::EventLinkCreated&&Canonical(*retried)==Canonical(first)&&Locations(s).size()==2&&Bytes(s.journal.path())==expected,"LP18-L05 retry after receipt returns original type without new location");
}
void Rejections(const std::filesystem::path& root){
 Store s(root/"one"),other(root/"two");Append(s,Mutation("owner-one"));Append(other,Mutation("owner-two"));const auto rows=Locations(s),foreign=Locations(other);int wrong=0;
 Check(Reject(s,&s.owner,{})&&!s.journal.poisoned_,"LP18-L06 null token clears output without poisoning");
 Check(Reject(s,&wrong,rows[0])&&Reject(s,nullptr,rows[0])&&!s.journal.poisoned_,"LP18-L06 foreign or null owner rejects without poisoning");
 Check(Reject(s,&s.owner,foreign[0])&&!s.journal.poisoned_,"LP18-L06 other journal token rejects without poisoning");
 const pid_t pid=::fork();Need(pid>=0);if(pid==0){Tokens denied;std::string error;const bool ok=Reject(s,&s.owner,rows[0])&&!s.journal.ReadRecordLocations(&s.owner,&denied,&error);::_exit(ok?0:1);}int status=0;Need(::waitpid(pid,&status,0)==pid);
 Check(WIFEXITED(status)&&WEXITSTATUS(status)==0&&Acquire(s,rows[0])&&!s.journal.poisoned_,"LP18-L06 fork rejects located access while parent retains valid ownership");
}
void Tamper(const std::filesystem::path& root,int kind){
 Store s(root);Append(s,Mutation("tamper-record"));const auto rows=Locations(s);const auto retained=Acquire(s,rows[0]);auto bytes=Bytes(s.journal.path());
 if(kind==0){const auto at=bytes.find("xxx");Need(at!=std::string::npos);bytes[at]='y';Write(s.journal.path(),bytes);}
 else if(kind==1){Need(::truncate(s.journal.path().c_str(),static_cast<off_t>(bytes.size()-1))==0);}
 else {std::filesystem::rename(s.journal.path(),root/"original-owned.jsonl");Write(s.journal.path(),bytes);}
 const bool rejected=Reject(s,&s.owner,rows[0]);
 Check(rejected&&s.journal.poisoned_&&s.journal.Replay().io_error_count>0&&retained&&Canonical(*retained)==Canonical(Mutation("tamper-record")),kind==0?"LP18-L07 same-size raw tamper poisons and clears output despite resident handle":kind==1?"LP18-L07 truncation poisons and clears output":"LP18-L07 inode replacement poisons and clears output");
}
void LargeResident(const std::filesystem::path& root){
 Store s(root);const auto m=Mutation("large-resident",16*1024*1024);const auto canonical=Canonical(m);Need(canonical.size()+1>16*1024*1024+1);Append(s,m);auto rows=Locations(s);Need(rows.size()==1);
 Check(Canonical(*Acquire(s,rows[0]))==canonical,"LP18-L08 oversized append remains available through resident fallback only");
 const auto before=Bytes(s.journal.path());RecordingMutationHandle out;std::string error;Need(s.journal.AppendOwned(m,&s.owner,&error,&out));
 Check(out&&Canonical(*out)==canonical&&Locations(s).size()==1&&Bytes(s.journal.path())==before,"LP18-L08 oversized retry preserves original value and durable row count");
}
void CryptoResident(const std::filesystem::path& root){
 Store s(root);const auto m=Mutation("crypto-resident");Append(s,m);auto rows=Locations(s);Need(rows.size()==1);const auto value=Acquire(s,rows[0]);
#if LP18_COLD_RECORDS
 std::string release_error;Need(s.journal.ReleaseRecordResidents(&s.owner,&release_error));
 Need(Canonical(*Acquire(s,rows[0]))==Canonical(m));
#endif
#if LP18_LOGICAL_REFS
 RecordingJournalRecordRefs refs;RecordingMutationHandle logical;std::string ref_error;
 Need(s.journal.ReadRecordRefs(&s.owner,&refs,&ref_error)&&refs.size()==1&&s.journal.AcquireRecordRef(&s.owner,refs[0],&logical,&ref_error)&&logical&&Canonical(*logical)==Canonical(m));
#endif
 Check(!MEDIA_SERVER_USE_OPENSSL&&Canonical(*value)==Canonical(m)&&s.journal.OwnsCatalog(&s.owner),"LP18-L10 crypto-off managed append acquires exact resident value only");
 const auto before=Bytes(s.journal.path());RecordingMutationHandle out;std::string error;Need(s.journal.AppendOwned(m,&s.owner,&error,&out));
 Check(out&&Canonical(*out)==Canonical(m)&&Locations(s).size()==1&&Bytes(s.journal.path())==before,"LP18-L10 crypto-off retry preserves resident value and physical row count");
 RecordingMutationHandles candidate;Need(s.journal.ReadCheckpointRecords(&s.owner,&candidate,&error));
 Check(!s.journal.CommitCheckpoint(&s.owner,candidate,false,&error)&&!s.journal.poisoned_&&s.journal.OwnsCatalog(&s.owner)&&Bytes(s.journal.path())==before&&Canonical(*Acquire(s,rows[0]))==Canonical(m),"LP18-L10 crypto-off checkpoint remains rejected with owner and resident value intact");
}
void LocationExceptions(const std::filesystem::path& root){
 const auto m=Mutation("exception-append");
 {Store s(root/"append");RecordingMutationHandle out=std::make_shared<const RecordingMutationV1>(m);std::string error;location_probe::throw_location=true;
  const bool ok=s.journal.AppendOwned(m,&s.owner,&error,&out);
  Check(!ok&&!location_probe::throw_location&&!out&&s.journal.poisoned_&&s.journal.Replay().io_error_count>0&&Bytes(s.journal.path())==Canonical(m)+"\n","LP18-L09 append location exception clears output and poisons after durable write");
 }
 {Store s(root/"append");auto rows=Locations(s);Check(rows.size()==1&&Canonical(*Acquire(s,rows[0]))==Canonical(m),"LP18-L09 append exception reopens exactly one durable original record");}
 {Store s(root/"reserve");RecordingOrderReservationV1 out;std::string error;location_probe::throw_location=true;
  const bool ok=s.journal.ReserveRecordingOrder("location-store","exception-request","exception-segment","location-channel",&out,&error);
  Check(!ok&&!location_probe::throw_location&&out.sequence==0&&s.journal.poisoned_&&s.journal.Replay().io_error_count>0&&!Bytes(s.journal.path()).empty(),"LP18-L09 reserve location exception withholds result and poisons after durable write");
 }
 {Store s(root/"reserve");auto rows=Locations(s);Need(rows.size()==1);const auto value=Acquire(s,rows[0]);RecordingOrderReservationV1 out;std::string error;const auto before=Bytes(s.journal.path());
  const bool ok=s.journal.ReserveRecordingOrder("location-store","exception-request","exception-segment","location-channel",&out,&error);
  Check(ok&&out.sequence==1&&value->mutation_type==RecordingMutationType::RecordingOrderReserved&&Locations(s).size()==1&&Bytes(s.journal.path())==before,"LP18-L09 reserve exception reopens reservation and retry does not duplicate it");
 }
 {Store s(root/"checkpoint");Append(s,Mutation("exception-cp-first",2000));Append(s,Mutation("exception-cp-second",2000));const auto rows=Locations(s);const auto old=Acquire(s,rows[0]);const auto before=Bytes(s.journal.path());RecordingMutationHandles candidate;std::string error;Need(s.journal.PrepareCheckpoint(&s.owner,&candidate,&error));location_probe::throw_location=true;
  const bool ok=s.journal.CommitCheckpoint(&s.owner,candidate,false,&error);
  Check(!ok&&!location_probe::throw_location&&!s.journal.poisoned_&&Bytes(s.journal.path())==before&&!std::filesystem::exists(s.root/".recording-checkpoint.tmp")&&Canonical(*Acquire(s,rows[0]))==Canonical(*old),"LP18-L09 checkpoint location exception preserves bytes and usable generation without poison");
  Need(s.journal.CommitCheckpoint(&s.owner,candidate,false,&error));const auto current=Locations(s);
  Check(current.size()==2&&Acquire(s,current[0])->mutation_type==RecordingMutationType::EventLinkReceipt&&Reject(s,&s.owner,rows[0])&&!s.journal.poisoned_&&Canonical(*old)==Canonical(Mutation("exception-cp-first",2000)),"LP18-L09 checkpoint retries successfully after location preparation exception");
 }
 {Store s(root/"acquire");Append(s,m);const auto rows=Locations(s);const auto retained=Acquire(s,rows[0]);location_probe::throw_acquire=true;
  Check(Reject(s,&s.owner,rows[0])&&!location_probe::throw_acquire&&s.journal.poisoned_&&s.journal.Replay().io_error_count>0&&Canonical(*retained)==Canonical(m),"LP18-L09 acquire allocation exception poisons clears output and retains old owned value");
 }
}
#if LP18_COLD_RECORDS
void Release(Store& s){std::string error;Need(s.journal.ReleaseRecordResidents(&s.owner,&error));}
void CheckpointBindingBatch(const std::filesystem::path& root){
 {Store s(root/"batch");for(const char* id:{"batch-one","batch-two","batch-three"})Append(s,Mutation(id,2000));Release(s);RecordingMutationHandles original,candidate;std::string error;location_probe::raw_reads=0;location_probe::ResetManagedStateChecks();
  Need(s.journal.ReadCheckpointRecords(&s.owner,&original,&error));Need(s.journal.PrepareCheckpoint(&s.owner,&candidate,&error));Need(s.journal.CommitCheckpoint(&s.owner,candidate,false,&error));
  Check(original.size()==3&&candidate.size()==3&&location_probe::raw_reads==9&&location_probe::managed_state_checks==7,"LP18-L14 checkpoint batch keeps every cold raw parse while binding checks are start/end only");
 }
 for(int kind=0;kind<3;++kind){Store s(root/("batch-reject-"+std::to_string(kind)));Append(s,Mutation("batch-reject",2000));Release(s);auto bytes=Bytes(s.journal.path());
  if(kind==0){const auto at=bytes.find("xxx");Need(at!=std::string::npos);bytes[at]='y';Write(s.journal.path(),bytes);}
  else if(kind==1){std::filesystem::rename(s.journal.path(),s.root/"old.jsonl");Write(s.journal.path(),bytes);}
  else Need(ownership_probe::CorruptCheckpointGeneration(s.journal));
  RecordingMutationHandles records;std::string error;const bool rejected=!s.journal.ReadCheckpointRecords(&s.owner,&records,&error);
  Check(rejected&&records.empty()&&(kind<2?s.journal.poisoned_:!s.journal.poisoned_),kind==0?"LP18-L15 checkpoint batch same-size tamper poisons":(kind==1?"LP18-L15 checkpoint batch inode replacement poisons":"LP18-L15 checkpoint batch generation mismatch rejects without poison"));
 }
}
void ColdRecords(const std::filesystem::path& root){
 const auto m=Mutation("cold-original");
 {Store s(root/"basic");Append(s,m);const auto rows=Locations(s);const auto before=Bytes(s.journal.path());
  std::weak_ptr<const RecordingMutationV1> weak;{auto value=Acquire(s,rows[0]);weak=value;}
  Release(s);
  Check(weak.expired(),"LP18-L11 release expires unowned reloadable resident");
  Check(Locations(s)==rows&&Bytes(s.journal.path())==before,"LP18-L11 release preserves tokens and durable bytes");
  auto reader=Acquire(s,rows[0]);const bool canonical=reader&&Canonical(*reader)==Canonical(m);std::weak_ptr<const RecordingMutationV1> transient=reader;reader.reset();
  Check(canonical&&transient.expired(),"LP18-L12 cold acquire restores complete canonical value");reader=Acquire(s,rows[0]);
  Release(s);Check(Canonical(*reader)==Canonical(m)&&Canonical(*Acquire(s,rows[0]))==Canonical(m),"LP18-L12 active owned reader survives release and reacquisition");
  reader.reset();Release(s);const auto replay=s.journal.Replay();
  Check(replay.io_error_count==0&&replay.mutations.size()==1&&Canonical(replay.mutations[0])==Canonical(m),"LP18-L12 public Replay restores cold records as independent values");
  RecordingMutationHandle retry;std::string error;Need(s.journal.AppendOwned(m,&s.owner,&error,&retry));
  Check(retry&&Canonical(*retry)==Canonical(m)&&Locations(s)==rows&&Bytes(s.journal.path())==before,"LP18-L13 cold Append retry preserves identity bytes and row count");
  auto conflict=m;conflict.payload_json="{}";retry=std::make_shared<const RecordingMutationV1>(m);
  Check(!s.journal.AppendOwned(conflict,&s.owner,&error,&retry)&&!retry&&Bytes(s.journal.path())==before&&!s.journal.poisoned_,"LP18-L13 cold original ID collision rejects without mutation");
  int foreign=0;Check(!s.journal.ReleaseRecordResidents(&foreign,&error)&&!s.journal.ReleaseRecordResidents(nullptr,&error)&&!s.journal.poisoned_&&Canonical(*Acquire(s,rows[0]))==Canonical(m),"LP18-L11 release rejects foreign and null owners without poison");
 }
 {Store s(root/"basic");Release(s);const auto rows=Locations(s);Check(rows.size()==1&&Canonical(*Acquire(s,rows[0]))==Canonical(m),"LP18-L12 reopened records support explicit release and cold acquire");}
 {Store s(root/"checkpoint");const auto first=Mutation("cold-first",2000);Append(s,first);auto rows=Locations(s);const auto token=rows[0];auto reader=Acquire(s,token);Release(s);RecordingMutationHandles candidate;std::string error;
  Need(s.journal.ReadCheckpointRecords(&s.owner,&candidate,&error));Check(candidate.size()==1&&Canonical(*candidate[0])==Canonical(first),"LP18-L14 checkpoint record view restores cold full values");candidate.clear();
  Need(s.journal.PrepareCheckpoint(&s.owner,&candidate,&error));const auto before=Bytes(s.journal.path());Need(s.journal.CommitCheckpoint(&s.owner,candidate,false,&error));
  Check(Locations(s)==rows&&Bytes(s.journal.path())==before&&Canonical(*Acquire(s,token))==Canonical(first),"LP18-L14 cold no-write checkpoint preserves generation");candidate.clear();Release(s);
  Write(s.root/".recording-checkpoint.tmp",before.substr(0,10));Need(s.journal.PrepareCheckpoint(&s.owner,&candidate,&error));Need(s.journal.CommitCheckpoint(&s.owner,candidate,true,&error));
  Check(Locations(s)==rows&&Bytes(s.journal.path())==before&&!std::filesystem::exists(s.root/".recording-checkpoint.tmp"),"LP18-L14 cold recover-only cleanup preserves generation");candidate.clear();
  Append(s,Mutation("cold-second",2000));Release(s);Need(s.journal.PrepareCheckpoint(&s.owner,&candidate,&error));Need(candidate.size()==2);const auto expected=Canonical(*candidate[0])+"\n"+Canonical(*candidate[1])+"\n";Need(s.journal.CommitCheckpoint(&s.owner,candidate,false,&error));candidate.clear();Release(s);rows=Locations(s);
  Check(rows.size()==2&&Acquire(s,rows[0])->mutation_type==RecordingMutationType::EventLinkReceipt&&Bytes(s.journal.path())==expected&&Reject(s,&s.owner,token)&&!s.journal.poisoned_&&Canonical(*reader)==Canonical(first),"LP18-L14 cold receipt swap rebinds tokens and preserves old reader");
  RecordingMutationHandle retry;Need(s.journal.AppendOwned(first,&s.owner,&error,&retry));Check(retry&&Canonical(*retry)==Canonical(first)&&Locations(s)==rows&&Bytes(s.journal.path())==expected,"LP18-L13 cold receipt retry retains original envelope without append");
 }
 for(int kind=0;kind<3;++kind){Store s(root/("tamper-"+std::to_string(kind)));Append(s,m);const auto rows=Locations(s);Release(s);auto bytes=Bytes(s.journal.path());
  if(kind==0){const auto at=bytes.find("xxx");Need(at!=std::string::npos);bytes[at]='y';Write(s.journal.path(),bytes);}else if(kind==1){Need(::truncate(s.journal.path().c_str(),static_cast<off_t>(bytes.size()-1))==0);}else{std::filesystem::rename(s.journal.path(),s.root/"old.jsonl");Write(s.journal.path(),bytes);}
  Check(Reject(s,&s.owner,rows[0])&&s.journal.poisoned_&&s.journal.Replay().io_error_count>0,kind==0?"LP18-L15 cold same-size tamper poisons and clears output":kind==1?"LP18-L15 cold truncation poisons and clears output":"LP18-L15 cold inode replacement poisons and clears output");
 }
 {Store s(root/"allocation");Append(s,m);const auto rows=Locations(s);Release(s);location_probe::throw_acquire=true;Check(Reject(s,&s.owner,rows[0])&&!location_probe::throw_acquire&&s.journal.poisoned_,"LP18-L15 cold allocation failure clears output and poisons");}
 {Store s(root/"large");const auto large=Mutation("cold-large",16*1024*1024);Append(s,large);const auto rows=Locations(s);std::weak_ptr<const RecordingMutationV1> weak;{auto value=Acquire(s,rows[0]);weak=value;}const auto before=Bytes(s.journal.path());Release(s);Check(!weak.expired()&&Canonical(*Acquire(s,rows[0]))==Canonical(large)&&Bytes(s.journal.path())==before,"LP18-L16 oversized resident fallback survives release unchanged");}
 {Store s(root/"reservation");RecordingOrderReservationV1 first,again;std::string error;Need(s.journal.ReserveRecordingOrder("location-store","cold-request","cold-segment","cold-channel",&first,&error));const auto rows=Locations(s);const auto before=Bytes(s.journal.path());Release(s);Need(s.journal.ReserveRecordingOrder("location-store","cold-request","cold-segment","cold-channel",&again,&error));Check(first.sequence==again.sequence&&Locations(s)==rows&&Bytes(s.journal.path())==before&&Acquire(s,rows[0])->mutation_type==RecordingMutationType::RecordingOrderReserved,"LP18-L13 cold Reserve retry preserves sequence and physical row count");}
 CheckpointBindingBatch(root/"checkpoint-binding");
}
#if LP18_LOGICAL_REFS
RecordingJournalRecordRefs Refs(Store& s){RecordingJournalRecordRefs refs;std::string error;Need(s.journal.ReadRecordRefs(&s.owner,&refs,&error));return refs;}
RecordingMutationHandle RefAcquire(Store& s,const RecordingJournalRecordRefHandle& ref){RecordingMutationHandle value;std::string error;Need(s.journal.AcquireRecordRef(&s.owner,ref,&value,&error)&&value);return value;}
bool RefReject(Store& s,const void* owner,const RecordingJournalRecordRefHandle& ref){auto value=std::make_shared<const RecordingMutationV1>(Mutation("ref-sentinel"));std::string error;return !s.journal.AcquireRecordRef(owner,ref,&value,&error)&&!value;}
void LogicalRecords(const std::filesystem::path& root){
 const auto m=Mutation("logical-one");
 {Store s(root/"basic"),other(root/"foreign");Append(s,m);Append(other,m);auto refs=Refs(s);Need(refs.size()==1);Release(s);auto reader=RefAcquire(s,refs[0]);
  Check(Canonical(*reader)==Canonical(m),"LP18-L21 logical ref cold acquire preserves complete canonical value");
  std::weak_ptr<const RecordingMutationV1> weak=reader;reader.reset();Check(weak.expired(),"LP18-L21 logical ref acquisition does not retain a strong resident");reader=RefAcquire(s,refs[0]);Release(s);
  Check(Canonical(*reader)==Canonical(m),"LP18-L21 logical ref reader survives resident release");
  Append(s,Mutation("logical-two"));RecordingOrderReservationV1 order;std::string error;Need(s.journal.ReserveRecordingOrder("location-store","logical-request","logical-segment","logical-channel",&order,&error));auto current=Refs(s);
  Check(current.size()==3&&current[0]==refs[0],"LP18-L22 logical refs remain unchanged after append and Reserve");const auto before=Bytes(s.journal.path());Append(s,m);RecordingOrderReservationV1 again;Need(s.journal.ReserveRecordingOrder("location-store","logical-request","logical-segment","logical-channel",&again,&error));
  Check(Refs(s)==current&&Bytes(s.journal.path())==before&&again.sequence==order.sequence,"LP18-L22 logical ref retries preserve row count and durable bytes");int foreign=0;
  Check(RefReject(s,&s.owner,{})&&RefReject(s,&foreign,refs[0])&&RefReject(s,nullptr,refs[0])&&RefReject(s,&s.owner,Refs(other)[0])&&!s.journal.poisoned_,"LP18-L24 null and foreign logical refs clear output without poisoning");
 }
 {const auto path=root/"physical";std::filesystem::path file;{Store s(path);file=s.journal.path();}const auto bytes=Canonical(m)+"\n"+Canonical(m)+"\n";Write(file,bytes);Store s(path);auto refs=Refs(s);Release(s);
  Check(refs.size()==2&&refs[0]!=refs[1]&&Canonical(*RefAcquire(s,refs[0]))==Canonical(m)&&Canonical(*RefAcquire(s,refs[1]))==Canonical(m)&&Bytes(file)==bytes,"LP18-L21 logical refs distinguish duplicate IDs by physical row ordinal");
 }
 {Store s(root/"checkpoint");const auto first=Mutation("logical-first",2000);Append(s,first);auto refs=Refs(s);auto reader=RefAcquire(s,refs[0]);RecordingMutationHandles candidate;std::string error;Need(s.journal.PrepareCheckpoint(&s.owner,&candidate,&error));const auto before=Bytes(s.journal.path());Need(s.journal.CommitCheckpoint(&s.owner,candidate,false,&error));
  Check(Refs(s)==refs&&Bytes(s.journal.path())==before,"LP18-L23 no-write checkpoint preserves logical refs");Write(s.root/".recording-checkpoint.tmp",before.substr(0,10));Need(s.journal.CommitCheckpoint(&s.owner,candidate,true,&error));
  Check(Refs(s)==refs&&Bytes(s.journal.path())==before&&!std::filesystem::exists(s.root/".recording-checkpoint.tmp"),"LP18-L23 recover-only checkpoint preserves logical refs");Append(s,Mutation("logical-last",2000));refs=Refs(s);Need(s.journal.PrepareCheckpoint(&s.owner,&candidate,&error));const auto unswapped=Bytes(s.journal.path());location_probe::throw_ref=true;
  Check(!s.journal.CommitCheckpoint(&s.owner,candidate,false,&error)&&!location_probe::throw_ref&&!s.journal.poisoned_&&Refs(s)==refs&&Bytes(s.journal.path())==unswapped&&!std::filesystem::exists(s.root/".recording-checkpoint.tmp"),"LP18-L25 checkpoint ref preparation failure preserves bytes and current refs");
  const auto expected=Canonical(*candidate[0])+"\n"+Canonical(*candidate[1])+"\n";Need(s.journal.CommitCheckpoint(&s.owner,candidate,false,&error));auto after=Refs(s);Release(s);
  Check(after.size()==2&&after[0]!=refs[0]&&after[1]==refs[1]&&RefAcquire(s,after[0])->mutation_type==RecordingMutationType::EventLinkReceipt&&Canonical(*RefAcquire(s,after[1]))==Canonical(*candidate[1])&&Bytes(s.journal.path())==expected,"LP18-L23 receipt swap preserves refs only for full-field identical rows");
  Check(RefReject(s,&s.owner,refs[0])&&!s.journal.poisoned_,"LP18-L23 changed receipt rejects old logical ref without poisoning");
  Check(Canonical(*reader)==Canonical(first),"LP18-L23 old owned original survives changed logical ref replacement");
 }
 {const auto path=root/"reopen";RecordingJournalRecordRefHandle old;{Store s(path);Append(s,m);old=Refs(s)[0];}Store s(path);Check(RefReject(s,&s.owner,old)&&!s.journal.poisoned_&&Canonical(*RefAcquire(s,Refs(s)[0]))==Canonical(m),"LP18-L24 reopen rejects prior journal lineage without poisoning");}
 {Store s(root/"large");const auto large=Mutation("logical-large",16*1024*1024);Append(s,large);auto refs=Refs(s);Release(s);Check(Canonical(*RefAcquire(s,refs[0]))==Canonical(large),"LP18-L21 resident fallback remains available through logical refs");}
 for(int kind=0;kind<3;++kind){Store s(root/("tamper-"+std::to_string(kind)));Append(s,m);auto refs=Refs(s);Release(s);auto bytes=Bytes(s.journal.path());if(kind==0){const auto at=bytes.find("xxx");Need(at!=std::string::npos);bytes[at]='y';Write(s.journal.path(),bytes);}else if(kind==1){Need(::truncate(s.journal.path().c_str(),static_cast<off_t>(bytes.size()-1))==0);}else{std::filesystem::rename(s.journal.path(),s.root/"old.jsonl");Write(s.journal.path(),bytes);}
  Check(RefReject(s,&s.owner,refs[0])&&s.journal.poisoned_&&s.journal.Replay().io_error_count>0,kind==0?"LP18-L24 logical ref acquire detects same-size raw tamper and poisons":kind==1?"LP18-L24 logical ref truncation clears output and poisons":"LP18-L24 logical ref inode replacement clears output and poisons");
 }
 {Store s(root/"acquire-exception");Append(s,m);auto refs=Refs(s);Release(s);location_probe::throw_acquire=true;Check(RefReject(s,&s.owner,refs[0])&&!location_probe::throw_acquire&&s.journal.poisoned_,"LP18-L25 logical ref Acquire exception clears output and poisons");}
 {Store s(root/"fork");Append(s,m);auto refs=Refs(s);const pid_t pid=::fork();Need(pid>=0);if(pid==0){RecordingJournalRecordRefs denied;std::string error;const bool ok=RefReject(s,&s.owner,refs[0])&&!s.journal.ReadRecordRefs(&s.owner,&denied,&error);::_exit(ok?0:1);}int status=0;Need(::waitpid(pid,&status,0)==pid);Check(WIFEXITED(status)&&WEXITSTATUS(status)==0&&!s.journal.poisoned_&&Canonical(*RefAcquire(s,refs[0]))==Canonical(m),"LP18-L24 logical ref fork rejects while parent remains valid");}
 {Store s(root/"append-exception");RecordingMutationHandle out;std::string error;location_probe::throw_ref=true;Check(!s.journal.AppendOwned(m,&s.owner,&error,&out)&&!location_probe::throw_ref&&!out&&s.journal.poisoned_&&s.journal.Replay().io_error_count>0&&Bytes(s.journal.path())==Canonical(m)+"\n","LP18-L25 append ref mint exception poisons after durable write");}
 {Store s(root/"append-exception");auto refs=Refs(s);Check(refs.size()==1&&Canonical(*RefAcquire(s,refs[0]))==Canonical(m),"LP18-L25 append ref exception reopens exactly one durable record");}
 {Store s(root/"reserve-exception");RecordingOrderReservationV1 out;std::string error;location_probe::throw_ref=true;Check(!s.journal.ReserveRecordingOrder("location-store","ref-request","ref-segment","ref-channel",&out,&error)&&!location_probe::throw_ref&&out.sequence==0&&s.journal.poisoned_&&s.journal.Replay().io_error_count>0,"LP18-L25 Reserve ref mint exception withholds result and poisons");}
 {Store s(root/"reserve-exception");auto refs=Refs(s);const auto before=Bytes(s.journal.path());RecordingOrderReservationV1 out;std::string error;Need(s.journal.ReserveRecordingOrder("location-store","ref-request","ref-segment","ref-channel",&out,&error));Check(refs.size()==1&&Refs(s)==refs&&out.sequence==1&&RefAcquire(s,refs[0])->mutation_type==RecordingMutationType::RecordingOrderReserved&&Bytes(s.journal.path())==before,"LP18-L25 Reserve ref exception reopens and retries the same reservation");}
}
#endif
#if LP18_CHECKPOINT_SNAPSHOT
void CheckpointSnapshots(const std::filesystem::path& root){
 using Snapshot=RecordingCheckpointReadSnapshotHandle;
 {Store s(root/"local");const auto m=Mutation("snapshot-one");Append(s,m);const auto rows=Locations(s);const auto before=Bytes(s.journal.path());Release(s);RecordingMutationHandles owned,candidate;Snapshot snapshot;std::string error;location_probe::raw_reads=0;
  Need(s.journal.ReadCheckpointRecords(&s.owner,&owned,&error,&snapshot));
  Check(snapshot&&owned.size()==1&&Canonical(*owned[0])==Canonical(m),"LP18-L17 snapshot binds complete immutable original values");
  Check(location_probe::raw_reads==1,"LP18-L18 snapshot reads each cold original exactly once");
  std::weak_ptr<const RecordingMutationV1> weak=owned[0];owned[0]=std::make_shared<const RecordingMutationV1>(Mutation("outside-copy"));
  Need(s.journal.PrepareCheckpoint(&s.owner,&candidate,&error,snapshot));
  Check(candidate.size()==1&&Canonical(*candidate[0])==Canonical(m),"LP18-L17 external owned vector mutation cannot alter snapshot original");
  Need(s.journal.CommitCheckpoint(&s.owner,candidate,false,&error,snapshot));
  Check(location_probe::raw_reads==1,"LP18-L18 Prepare and Commit reuse snapshot without repeated cold reads");
  Check(Locations(s)==rows&&Bytes(s.journal.path())==before,"LP18-L19 snapshot no-write checkpoint preserves exact bytes and tokens");
  Write(s.root/".recording-checkpoint.tmp",before.substr(0,10));Need(s.journal.CommitCheckpoint(&s.owner,candidate,true,&error,snapshot));
  Check(location_probe::raw_reads==1&&Locations(s)==rows&&Bytes(s.journal.path())==before&&!std::filesystem::exists(s.root/".recording-checkpoint.tmp"),"LP18-L19 recover-only snapshot cleanup retains generation and exact bytes");
  candidate.clear();owned.clear();snapshot.reset();Check(weak.expired(),"LP18-L17 snapshot release leaves no journal or cache strong resident");
 }
 {Store s(root/"default");Append(s,Mutation("default-one",2000));Append(s,Mutation("default-two",2000));Release(s);RecordingMutationHandles owned,candidate;std::string error;location_probe::raw_reads=0;
  Need(s.journal.ReadCheckpointRecords(&s.owner,&owned,&error));Need(s.journal.PrepareCheckpoint(&s.owner,&candidate,&error));const auto expected=Canonical(*candidate[0])+"\n"+Canonical(*candidate[1])+"\n";Need(s.journal.CommitCheckpoint(&s.owner,candidate,false,&error,{}));
  Check(location_probe::raw_reads==6&&Bytes(s.journal.path())==expected,"LP18-L18 null snapshot retains strict repeated-read fallback and exact receipt bytes");
 }
 for(int kind=0;kind<2;++kind){Store s(root/("stale-"+std::to_string(kind)));Append(s,Mutation("stale-one"));Release(s);RecordingMutationHandles owned,candidate;Snapshot snapshot;std::string error;Need(s.journal.ReadCheckpointRecords(&s.owner,&owned,&error,&snapshot));Need(s.journal.PrepareCheckpoint(&s.owner,&candidate,&error,snapshot));
  if(kind==0)Append(s,Mutation("stale-two"));else{RecordingOrderReservationV1 order;Need(s.journal.ReserveRecordingOrder("location-store","snapshot-request","snapshot-segment","snapshot-channel",&order,&error));}
  Release(s);const auto before=Bytes(s.journal.path());location_probe::raw_reads=0;const bool ok=s.journal.CommitCheckpoint(&s.owner,candidate,false,&error,snapshot);
  Check(!ok&&location_probe::raw_reads==2&&Bytes(s.journal.path())==before&&!s.journal.poisoned_,kind==0?"LP18-L19 appended history invalidates snapshot and rejects stale candidate":"LP18-L19 reserved history invalidates snapshot and rejects stale candidate");
 }
 {Store s(root/"detach");Append(s,Mutation("detach-one"));Release(s);RecordingMutationHandles owned,candidate;Snapshot snapshot;std::string error;Need(s.journal.ReadCheckpointRecords(&s.owner,&owned,&error,&snapshot));Need(s.journal.PrepareCheckpoint(&s.owner,&candidate,&error,snapshot));s.journal.DetachCatalog(&s.owner);Need(s.journal.AttachCatalog(&s.owner,s.root,s.root/"recording-catalog.sqlite3",true,&error));location_probe::raw_reads=0;
  Check(s.journal.CommitCheckpoint(&s.owner,candidate,false,&error,snapshot)&&location_probe::raw_reads==1,"LP18-L19 detach and same-owner reattach require strict snapshot fallback");
 }
 {Store s(root/"foreign-a"),other(root/"foreign-b");const auto m=Mutation("foreign-same");Append(s,m);Append(other,m);Release(s);Release(other);RecordingMutationHandles owned,candidate;Snapshot snapshot;std::string error;Need(s.journal.ReadCheckpointRecords(&s.owner,&owned,&error,&snapshot));Need(s.journal.PrepareCheckpoint(&s.owner,&candidate,&error,snapshot));location_probe::raw_reads=0;
  Check(other.journal.CommitCheckpoint(&other.owner,candidate,false,&error,snapshot)&&location_probe::raw_reads==1,"LP18-L19 identical foreign journal snapshot uses strict local fallback");
 }
 {Store s(root/"candidate");Append(s,Mutation("candidate-one",2000));Append(s,Mutation("candidate-two",2000));Release(s);RecordingMutationHandles owned,candidate;Snapshot snapshot;std::string error;Need(s.journal.ReadCheckpointRecords(&s.owner,&owned,&error,&snapshot));Need(s.journal.PrepareCheckpoint(&s.owner,&candidate,&error,snapshot));const auto before=Bytes(s.journal.path());
  const char* fields[]={"schema","id","entity","time","type","payload","order","count","null"};
  for(int field=0;field<9;++field){auto bad=candidate;auto m=*bad[0];if(field==0)m.schema="wrong";if(field==1)m.mutation_id+="x";if(field==2)m.entity_id+="x";if(field==3)++m.occurred_at_ms;if(field==4)m.mutation_type=RecordingMutationType::Unknown;if(field==5)m.payload_json="{}";bad[0]=std::make_shared<const RecordingMutationV1>(m);if(field==6)std::swap(bad[0],bad[1]);if(field==7)bad.pop_back();if(field==8)bad[0].reset();Check(!s.journal.CommitCheckpoint(&s.owner,bad,false,&error,snapshot)&&Bytes(s.journal.path())==before&&!s.journal.poisoned_,(std::string("LP18-L19 snapshot does not bypass complete candidate field and order comparison ")+fields[field]).c_str());}
  const auto expected=Canonical(*candidate[0])+"\n"+Canonical(*candidate[1])+"\n";for(auto& handle:candidate)handle=std::make_shared<const RecordingMutationV1>(*handle);Need(s.journal.CommitCheckpoint(&s.owner,candidate,false,&error,snapshot));Release(s);location_probe::raw_reads=0;RecordingMutationHandles current;Need(s.journal.PrepareCheckpoint(&s.owner,&current,&error,snapshot));
  Check(location_probe::raw_reads==2&&Bytes(s.journal.path())==expected&&current[0]->mutation_type==RecordingMutationType::EventLinkReceipt&&owned[0]->mutation_type==RecordingMutationType::EventLinkCreated,"LP18-L19 receipt swap invalidates snapshot while old owned original survives");
 }
 {Store s(root/"tamper");Append(s,Mutation("snapshot-tamper"));Release(s);RecordingMutationHandles owned;Snapshot snapshot;std::string error;Need(s.journal.ReadCheckpointRecords(&s.owner,&owned,&error,&snapshot));const auto rows=Locations(s);auto bytes=Bytes(s.journal.path());const auto at=bytes.find("xxx");Need(at!=std::string::npos);bytes[at]='y';Write(s.journal.path(),bytes);
  Check(Reject(s,&s.owner,rows[0])&&s.journal.poisoned_&&owned.size()==1,"LP18-L20 explicit Acquire rechecks same-size raw tamper despite owned snapshot");
 }
 {Store s(root/"exception");Append(s,Mutation("snapshot-exception"));Release(s);RecordingMutationHandles owned;Snapshot snapshot;std::string error;Need(s.journal.ReadCheckpointRecords(&s.owner,&owned,&error,&snapshot));location_probe::throw_acquire=true;
  Check(!s.journal.ReadCheckpointRecords(&s.owner,&owned,&error,&snapshot)&&!snapshot&&owned.empty()&&s.journal.poisoned_&&!location_probe::throw_acquire,"LP18-L20 snapshot acquisition exception clears both outputs and poisons");
 }
 {const auto path=root/"physical";std::filesystem::path journal;{Store s(path);journal=s.journal.path();}const auto m=Mutation("snapshot-physical",70000);auto text=Canonical(m);text.insert(1," \t");const auto bytes="\n"+text+"\n\n"+text+"\n";Write(journal,bytes);Store s(path);Release(s);RecordingMutationHandles owned,candidate;Snapshot snapshot;std::string error;location_probe::raw_reads=0;Need(s.journal.ReadCheckpointRecords(&s.owner,&owned,&error,&snapshot));Need(s.journal.PrepareCheckpoint(&s.owner,&candidate,&error,snapshot));
  Check(location_probe::raw_reads==2&&owned.size()==2&&Canonical(*owned[0])==Canonical(m)&&Canonical(*owned[1])==Canonical(m)&&Bytes(journal)==bytes,"LP18-L17 snapshot preserves duplicate physical rows and noncanonical envelope bytes");
 }
 {const auto path=root/"catalog";RecordingJournal journal(RecordingJournal::ManagedOptions{path,"snapshot-store"});RecordingCatalog::Options options(path/"recording-catalog.sqlite3",path,true);options.enable_v2_storage=true;RecordingCatalog catalog(journal,options);std::string error;Need(journal.Open(&error)&&catalog.Open(&error));
  for(const char* id:{"snapshot-order-one","snapshot-order-two"}){RecordingOrderReservationV1 order;Need(journal.ReserveRecordingOrder("snapshot-store",id,id,"snapshot-channel",&order,&error));}
  const auto replay=journal.Replay();Need(replay.io_error_count==0&&replay.mutations.size()==2);RecordingCatalog full(journal,options);for(const auto& m:replay.mutations)Need(full.ApplyMutationLocked(m,false,&error));const auto projection=full.ProjectionSignatureLocked();const auto before=Bytes(journal.path());
  Need(journal.ReleaseRecordResidents(&catalog,&error));location_probe::raw_reads=0;const bool ok=catalog.Checkpoint(&error);
  Check(ok&&location_probe::raw_reads==replay.mutations.size()&&Bytes(journal.path())==before&&catalog.checkpoint_cache_&&catalog.checkpoint_cache_->shadow&&catalog.checkpoint_cache_->shadow->ProjectionSignatureLocked()==projection,"LP18-L18 catalog Checkpoint reuses one cold snapshot with exact bytes and projection");
 }
}
#endif
#endif
#endif
}
int main(int argc,char** argv){if(argc!=2)return 2;try{const std::filesystem::path root=argv[1];
 if(LP18_LOGICAL_SUITE){
  {Store s(root/"logical-baseline");const auto m=Mutation("logical-baseline");Append(s,m);auto replay=s.journal.Replay();const bool valid=replay.io_error_count==0&&replay.mutations.size()==1&&Canonical(replay.mutations[0])==Canonical(m);if(!replay.mutations.empty())replay.mutations[0].payload_json="{}";Check(valid&&Bytes(s.journal.path())==Canonical(m)+"\n"&&Canonical(s.journal.Replay().mutations.at(0))==Canonical(m),"LP18-L21 logical ref baseline preserves raw bytes and independent Replay value");}
  Check(LP18_LOGICAL_REFS!=0,"LP18-L21 journal logical record ref capability exists");
#if LP18_LOGICAL_REFS
  LogicalRecords(root/"logical");
#else
  std::cout<<"[not-run] LP18 logical ref scenarios=24 reason=capability-unavailable\n";
#endif
  std::cout<<"[summary] LP18 pass="<<passed<<" fail="<<failed<<'\n';return failed?1:0;
 }
 if(LP18_CHECKPOINT_SNAPSHOT_SUITE){
  {Store s(root/"snapshot-baseline");const auto m=Mutation("snapshot-baseline");Append(s,m);const auto replay=s.journal.Replay();Check(replay.io_error_count==0&&replay.mutations.size()==1&&Canonical(replay.mutations[0])==Canonical(m),"LP18-L17 snapshot baseline Replay preserves complete canonical value");}
  Check(LP18_CHECKPOINT_SNAPSHOT!=0,"LP18-L17 checkpoint read snapshot capability exists");
#if LP18_CHECKPOINT_SNAPSHOT
  CheckpointSnapshots(root/"snapshot");
#else
  std::cout<<"[not-run] LP18 checkpoint snapshot scenarios=26 reason=capability-unavailable\n";
#endif
  std::cout<<"[summary] LP18 pass="<<passed<<" fail="<<failed<<'\n';return failed?1:0;
 }
 if(LP18_COLD_SUITE){
  {Store s(root/"cold-baseline");const auto m=Mutation("cold-baseline");Append(s,m);const auto replay=s.journal.Replay();Check(replay.io_error_count==0&&replay.mutations.size()==1&&Canonical(replay.mutations[0])==Canonical(m),"LP18-L11 cold baseline Replay preserves complete canonical value");}
  Check(LP18_COLD_RECORDS!=0,"LP18-L11 explicit resident release capability exists");
#if LP18_COLD_RECORDS
  ColdRecords(root/"cold");
#else
  std::cout<<"[not-run] LP18 cold record scenarios=20 reason=capability-unavailable\n";
#endif
  std::cout<<"[summary] LP18 pass="<<passed<<" fail="<<failed<<'\n';return failed?1:0;
 }
 if(LP18_LOCATION_CRYPTO_OFF){
#if LP18_LOCATED_RECORDS
  CryptoResident(root/"location-crypto-off");
#else
  Check(false,"LP18-L01 journal located record capability exists");
#endif
  std::cout<<"[summary] LP18 pass="<<passed<<" fail="<<failed<<'\n';return failed?1:0;
 }
 {Store s(root/"location-baseline");const auto m=Mutation("baseline-record");Append(s,m);const auto replay=s.journal.Replay();Check(replay.io_error_count==0&&replay.mutations.size()==1&&Canonical(replay.mutations[0])==Canonical(m),"LP18-L01 baseline managed Replay preserves full canonical record");}
 Check(LP18_LOCATED_RECORDS!=0,"LP18-L01 journal located record capability exists");
#if LP18_LOCATED_RECORDS
 Basic(root/"location-basic");PhysicalRows(root/"location-rows");Checkpoints(root/"location-checkpoints");Rejections(root/"location-reject");for(int i=0;i<3;++i)Tamper(root/("location-tamper-"+std::to_string(i)),i);
 LargeResident(root/"location-large");LocationExceptions(root/"location-exceptions");
#else
 std::cout<<"[not-run] LP18 located record scenarios=30 reason=capability-unavailable\n";
#endif
 std::cout<<"[summary] LP18 pass="<<passed<<" fail="<<failed<<'\n';return failed?1:0;
 }catch(...){std::cout<<"[setup-or-oracle-fail] LP18 fixed-location-error\n";return 2;}}

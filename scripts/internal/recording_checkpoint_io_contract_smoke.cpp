// 파일 용도: O29 checkpoint I/O 계약을 작은 managed fixture로 독립 검증한다.
#define main o29_unused_ownership_main
#include "recording_immutable_ownership_smoke.cpp"
#undef main
#include "recording_journal_location_counter.h"
#include <sys/stat.h>

namespace {
struct FileIdentity { std::uint64_t device{0},inode{0}; };
FileIdentity Identity(const std::filesystem::path& path){
 struct stat value{};Need(::stat(path.c_str(),&value)==0);
 return {static_cast<std::uint64_t>(value.st_dev),static_cast<std::uint64_t>(value.st_ino)};
}
bool Same(const FileIdentity& a,const FileIdentity& b){return a.device==b.device&&a.inode==b.inode;}
void WriteExact(const std::filesystem::path& path,const std::string& bytes){
 std::ofstream out(path,std::ios::binary|std::ios::trunc);out.write(bytes.data(),static_cast<std::streamsize>(bytes.size()));out.close();Need(!out.fail());
}
std::string OwnedBytes(const RecordingMutationHandles& rows){return Canonical(rows);}

void WarmAndCold(const std::filesystem::path& root){
 {Store s(root/"warm");Reserve(s,"warm-one");Reserve(s,"warm-two");const auto before=Bytes(s.journal.path());
  RecordingMutationHandles rows;std::string error;location_probe::raw_reads=0;
  Need(s.journal.ReadCheckpointRecords(&s.catalog,&rows,&error));
  Check(rows.size()==2&&location_probe::raw_reads==0&&OwnedBytes(rows)==before&&Bytes(s.journal.path())==before,
        "O29-C01 warm ReadCheckpointRecords reuses resident strict values without raw reacquire");
 }
 {Store s(root/"cold");Reserve(s,"cold-one");Reserve(s,"cold-two");const auto before=Bytes(s.journal.path());std::string error;
  Need(s.journal.ReleaseRecordResidents(&s.catalog,&error));RecordingMutationHandles rows;location_probe::raw_reads=0;
  Need(s.journal.ReadCheckpointRecords(&s.catalog,&rows,&error));
  Check(rows.size()==2&&location_probe::raw_reads==2&&OwnedBytes(rows)==before&&Bytes(s.journal.path())==before,
        "O29-C02 cold ReadCheckpointRecords strictly reacquires every raw row once");
 }
}

void AutomaticNoop(const std::filesystem::path& root){
 {Store s(root/"valid");Reserve(s,"noop-valid");const auto before=Bytes(s.journal.path());bool handled=false;std::string error;
  Need(s.journal.TryAutomaticCheckpointNoop(&s.catalog,s.catalog.mutation_ids_,&handled,&error));
  Check(handled&&Bytes(s.journal.path())==before&&!s.journal.poisoned_,
        "O29-C03 automatic no-op validates complete canonical raw bytes without rewrite");
 }
 {Store s(root/"tamper");Reserve(s,"noop-tamper");auto changed=Bytes(s.journal.path());const auto at=changed.find("noop-tamper");Need(at!=std::string::npos);changed[at]='x';WriteExact(s.journal.path(),changed);
  bool handled=true;std::string error;const bool accepted=s.journal.TryAutomaticCheckpointNoop(&s.catalog,s.catalog.mutation_ids_,&handled,&error);
  Check(!accepted&&!handled&&s.journal.poisoned_&&Bytes(s.journal.path())==changed,
        "O29-C03 automatic no-op rejects same-length raw hash mismatch without rewriting evidence");
 }
}

void CommitNoWrite(const std::filesystem::path& root){
 Store s(root);Reserve(s,"no-write");std::string error;RecordingMutationHandles original,candidate;RecordingCheckpointReadSnapshotHandle snapshot;
 Need(s.journal.ReadCheckpointRecords(&s.catalog,&original,&error,&snapshot));Need(s.journal.PrepareCheckpoint(&s.catalog,&candidate,&error,snapshot));
 const auto before=Bytes(s.journal.path());const auto identity=Identity(s.journal.path());Need(OwnedBytes(candidate).size()>=before.size());
 Need(s.journal.CommitCheckpoint(&s.catalog,candidate,false,&error,snapshot));
 Check(Bytes(s.journal.path())==before&&Same(identity,Identity(s.journal.path()))&&!std::filesystem::exists(root/".recording-checkpoint.tmp"),
       "O29-C04 non-shrinking checkpoint candidate returns success without replacing storage");
}

void CommitReplacement(const std::filesystem::path& root){
 Store s(root);EventRecordingLinkV1 link;link.link_id="replace-link";link.event_id="replace-event";link.source_id=link.channel_id="replace-channel";
 link.time_basis="utc-ms";link.status=EventRecordingLinkStatus::Pending;link.created_at_ms=1000;link.requested_range={1000,2000};std::string error;
 for(unsigned i=0;i<2;++i){link.updated_at_ms=1000+i;link.completeness_reason=std::string(2048,'x');Need(s.catalog.PutEventLink(link,&error));}
 RecordingMutationHandles original,candidate;RecordingCheckpointReadSnapshotHandle snapshot;
 Need(s.journal.ReadCheckpointRecords(&s.catalog,&original,&error,&snapshot));const auto original_owned=OwnedBytes(original);
 Need(s.journal.PrepareCheckpoint(&s.catalog,&candidate,&error,snapshot));const auto expected=OwnedBytes(candidate);const auto before=Bytes(s.journal.path());const auto identity=Identity(s.journal.path());
 Need(expected.size()<before.size());Need(s.journal.CommitCheckpoint(&s.catalog,candidate,false,&error,snapshot));
 Check(Bytes(s.journal.path())==expected&&!Same(identity,Identity(s.journal.path()))&&OwnedBytes(original)==original_owned&&
       !std::filesystem::exists(root/".recording-checkpoint.tmp"),
       "O29-C05 shrinking checkpoint atomically replaces exact bytes and preserves prior owned snapshot");
}
}

int main(int argc,char** argv){
 if(argc!=2)return 2;
 try{const std::filesystem::path root=argv[1];WarmAndCold(root/"read");AutomaticNoop(root/"noop");CommitNoWrite(root/"no-write");CommitReplacement(root/"replace");
  std::cout<<"[summary] O29 pass="<<passed<<" fail="<<failed<<'\n';return failed?1:0;
 }catch(...){std::cout<<"[setup-or-oracle-fail] O29 checkpoint-io-contract\n";return 2;}
}

// 파일 용도: 녹화 세대 자료구조의 규모별 비용을 격리 probe로 관측한다.
// 검증 전용 실제 B 누적. 준비용 legacy template와 제품 B 비용을 분리한다.
#define main file_evidence_unused_main
#include "recording_file_evidence_smoke.cpp"
#undef main
#include "recording/recording_runtime_composition.h"
#include "recording/recording_latency_trace.h"
#include "domain/strict_json.h"
#include <openssl/evp.h>
#include <sys/resource.h>
#include <sys/wait.h>
#include <sys/stat.h>
#include <signal.h>
#include <sstream>
#include "recording_generation_observation.h"

namespace scale {
constexpr std::uint64_t RootCap=448ULL*1024*1024,RssCap=1024ULL*1024*1024;
std::string phase="arguments";
std::string program;
void Need(bool ok,const char* code){if(!ok){phase=code;throw std::runtime_error("scale-failed");}}
std::uint64_t Rss(){struct rusage r{};Need(::getrusage(RUSAGE_SELF,&r)==0,"rss-read");
#ifdef __APPLE__
return r.ru_maxrss;
#else
return static_cast<std::uint64_t>(r.ru_maxrss)*1024;
#endif
}
void Metric(const std::string& op,std::size_t n,Clock::time_point start){
 const auto rss=Rss();std::cout<<"[measure] op="<<op<<" count="<<n<<" us="<<Us(start)<<" rss_peak_bytes="<<rss<<'\n';Need(rss<=RssCap,"rss-cap");
}
std::map<std::string,std::string> Sealed(const std::filesystem::path& root){
 std::map<std::string,std::string> result;
 for(const auto& e:std::filesystem::directory_iterator(root)){
  const auto name=e.path().filename().string();if((name.rfind("active-",0)==0||name.rfind("evidence-",0)==0)&&e.is_regular_file())result[name]=Digest(Bytes(e.path()));
 }return result;
}
void Preserved(const std::filesystem::path& root,const std::map<std::string,std::string>& before){
 for(const auto& x:before)Need(Digest(Bytes(root/x.first))==x.second,"sealed-changed");
}
void Size(const std::filesystem::path& base,std::size_t count){
 std::map<std::string,std::uint64_t> categories;std::uint64_t total=0;
 for(const auto& e:std::filesystem::recursive_directory_iterator(base)){
  struct stat s{};Need(::lstat(e.path().c_str(),&s)==0&&!S_ISLNK(s.st_mode),"root-stat");if(S_ISDIR(s.st_mode))continue;
  Need(S_ISREG(s.st_mode)&&s.st_nlink==1&&s.st_size>=0,"root-file");const auto name=e.path().filename().string();std::string kind="other";
  for(const auto* k:{"active","snapshot","identity","evidence"})if(name.rfind(std::string(k)+"-",0)==0)kind=k;
  if(name.find("sqlite3")!=std::string::npos)kind="sqlite";if(e.path().extension()==".mp4")kind="media";
  total+=static_cast<std::uint64_t>(s.st_size);categories[kind]+=s.st_size;
 }
 for(const auto& x:categories)std::cout<<"[bytes] count="<<count<<" kind="<<x.first<<" bytes="<<x.second<<'\n';
 std::cout<<"[bytes] count="<<count<<" kind=total bytes="<<total<<'\n';Need(total<=RootCap,"root-cap");
}
Output Expected(const Output& input,const std::filesystem::path& root,const std::string& store,std::size_t index){
 auto out=input;out.root=root;out.segment.store_id=store;out.binding.store_id=store;
 out.segment.segment_id="scale-"+std::to_string(index);out.segment.order_request_id="scale-order-"+std::to_string(index);
 out.segment.order_sequence=index;out.binding.segment_id=out.segment.segment_id;
 out.file=root/"probe-channel"/(out.segment.segment_id+".mp4");return out;
}
void Current(RecordingCatalog& catalog,const Output& input,const std::filesystem::path& root,const std::string& store,std::size_t count,bool deleted){
 const auto start=Clock::now();std::string error;
 for(std::size_t i=1;i<=count;++i){const auto expected=Expected(input,root,store,i);
  if(deleted){Need(catalog.IsDeletedSegmentId(expected.segment.segment_id)&&!catalog.FindSegmentMediaLocation(expected.segment.segment_id)&&!std::filesystem::exists(expected.file),"deleted-state");continue;}
  const auto segment=catalog.FindSegmentV2ById(expected.segment.segment_id);const auto binding=catalog.FindSourceBinding(expected.segment.segment_id);
  Need(segment&&binding&&Digest(SerializeRecordingSegmentV2(*segment))==Digest(SerializeRecordingSegmentV2(expected.segment))&&
   Digest(SerializeRecordingSourceBindingV1(*binding))==Digest(SerializeRecordingSourceBindingV1(expected.binding)),"independent-current-value");
  Need(Digest(Bytes(expected.file))==input.segment.checksum_sha256,"independent-media-hash");
 }
 RecordingCatalogStatusSnapshot status;Need(catalog.SnapshotStatus(&status,&error),"status-query");
 const auto c=status.channels.find("probe-channel");const auto actual=c==status.channels.end()?0:c->second.continuous_bytes;
 Need(actual==(deleted?0:count*input.segment.size_bytes),"independent-status-bytes");
 std::cout<<"[pass] B07-S0"<<(deleted?2:1)<<" independent-current count="<<count<<" deleted="<<deleted<<'\n';Metric("query-and-independent-hash-outside-product-timing",count,start);
}
void ChildWait(pid_t child,const char* code){
 int status=0;while(::waitpid(child,&status,0)<0){Need(errno==EINTR,"waitpid");}
 std::cout<<"[child] exit="<<(WIFEXITED(status)?WEXITSTATUS(status):-1)
          <<" signal="<<(WIFSIGNALED(status)?WTERMSIG(status):0)<<'\n';
 Need(WIFEXITED(status)&&WEXITSTATUS(status)==0,code);
}
void ReopenWorker(const Output& input,const std::filesystem::path& root,const std::string& store,std::size_t count,bool deleted,bool sql){
   ::alarm(15);const auto start=Clock::now();
   const auto natural=std::numeric_limits<std::size_t>::max();RecordingJournal j(RecordingJournal::ManagedOptions{root,store,{1ULL<<30,1ULL<<30,1ULL<<30,16ULL*1024*1024+1,natural,natural}});
   std::string error;Need(j.Open(&error),"reopen-journal");RecordingCatalog::Options options(root/"recording-catalog.sqlite3",root,sql);options.enable_v2_storage=true;
   RecordingCatalog c(j,options);Need(c.Open(&error),"reopen-catalog");::alarm(0);Metric(sql?"reopen-sqlite":"reopen-jsonl",count,start);
   Current(c,input,root,store,count,deleted);Need(!c.RequestDeletion("absent","continuous-age",&error),"reopen-readonly");
}
void Reopen(const std::filesystem::path& input,const std::filesystem::path& root,const std::string& store,std::size_t count,bool deleted,bool sql){
 const auto size=std::to_string(count);const std::string state=deleted?"deleted":"alive",cache=sql?"sql":"jsonl";
 std::cout.flush();std::cerr.flush();const auto child=::fork();Need(child>=0,"reopen-fork");
 if(!child){::execl(program.c_str(),program.c_str(),"--reopen",root.c_str(),input.c_str(),store.c_str(),size.c_str(),state.c_str(),cache.c_str(),nullptr);::_exit(127);}
 ChildWait(child,"reopen-child-failure");
}
void ObserveWorker(const std::filesystem::path& root,std::size_t seen){
 ::alarm(3);std::size_t added=0;auto result=generation_observation::Observe(root,seen,[&](const std::string&){++added;return "{}";});
 Need(!result.empty()&&result.back()=='}',"observe-json");result.pop_back();result+=",\"newRows\":"+std::to_string(added)+"}";
 std::cout<<result;std::cout.flush();::alarm(0);
}
void Observe(const std::filesystem::path& root,std::size_t& seen,std::string& prefix,bool bounded=false){
 int pipes[2];Need(::pipe(pipes)==0,"observe-pipe");const auto size=std::to_string(seen);std::cout.flush();std::cerr.flush();const auto start=Clock::now();const auto child=::fork();Need(child>=0,"observe-fork");
 if(!child){::close(pipes[0]);if(::dup2(pipes[1],STDOUT_FILENO)<0)::_exit(127);::close(pipes[1]);::execl(program.c_str(),program.c_str(),"--observe",root.c_str(),size.c_str(),nullptr);::_exit(127);}
 ::close(pipes[1]);std::string bytes;char buffer[65536];for(;;){const auto n=::read(pipes[0],buffer,sizeof(buffer));if(n<0&&errno==EINTR)continue;if(n<=0)break;bytes.append(buffer,n);Need(bytes.size()<=32ULL*1024*1024,"observe-output-cap");}::close(pipes[0]);ChildWait(child,"observe-child-failure");
 ingress::StrictJsonObjectDocument d;Need(ingress::ParseStrictJsonObjectDocument(bytes,&d,nullptr)&&ingress::StrictJsonBoolField(d,"busy")==false&&ingress::StrictJsonBoolField(d,"backlog")==false,"observe-complete");
 const auto* p=d.Find("prefix");const auto* n=d.Find("newRows");const auto* partial=d.Find("partialBytes");Need(p&&n&&partial&&partial->raw=="0","observe-fields");
 Need(prefix.empty()||p->raw==prefix||p->raw.rfind(prefix.substr(0,prefix.size()-1)+",",0)==0,"observe-prefix");prefix=p->raw;seen+=std::stoull(n->raw);
 if(bounded)Need(Us(start)<=3000000,"observe-parent-deadline");
 Metric("incremental-native-observe",seen,start);
}
void SingleSnapshot(const std::filesystem::path& root,std::size_t count){
 RecordingGenerationManifest manifest;std::string error;
 Need(ParseRecordingGenerationManifest(Bytes(root/"recording-generation.json"),&manifest,&error),"snapshot-manifest");
 std::size_t snapshots=0;std::uint64_t bytes=0;
 for(const auto& entry:std::filesystem::directory_iterator(root)){
  if(entry.path().filename().string().rfind("snapshot-",0)!=0)continue;
  struct stat status{};Need(::lstat(entry.path().c_str(),&status)==0&&S_ISREG(status.st_mode)&&status.st_nlink==1&&status.st_size>=0,"snapshot-file");
  ++snapshots;bytes+=static_cast<std::uint64_t>(status.st_size);
  Need(entry.path().filename()==manifest.snapshot.name,"snapshot-stale-name");
 }
 const auto current=Bytes(root/manifest.snapshot.name);
 Need(snapshots==1&&bytes==manifest.snapshot.size&&current.size()==bytes&&Digest(current)==manifest.snapshot.sha256,"snapshot-single-current");
 std::cout<<"[pass] B08-C01 snapshot-count=1 count="<<count<<" bytes="<<bytes<<" generation="<<manifest.generation<<'\n';
}
// B10 종료 후 metadata 사본만 사용한다. 미디어가 없으므로 실제 재생/완전 복구 PASS가 아니다.
void RetiredCompatibility(const std::filesystem::path& base) {
 const auto root=base/"recordings";std::string error;
 struct ExpectedRow {std::string id,channel,checksum;bool deleted;std::size_t mappings;};
 std::vector<ExpectedRow> expected;std::ifstream input(base/"expected.tsv");std::string line;
 while(std::getline(input,line)) {
  std::istringstream fields(line);ExpectedRow row;std::string state,count;
  Need(bool(std::getline(fields,row.id,'\t'))&&bool(std::getline(fields,row.channel,'\t'))&&
   bool(std::getline(fields,state,'\t'))&&bool(std::getline(fields,row.checksum,'\t'))&&
   bool(std::getline(fields,count))&&(state=="live"||state=="deleted"),"B11-expected-fields");
  row.deleted=state=="deleted";row.mappings=std::stoull(count);expected.push_back(std::move(row));
 }
 Need(input.eof()&&expected.size()==1116,"B11-expected-count");
 RecordingGenerationManifest initial;
 Need(ParseRecordingGenerationManifest(Bytes(root/"recording-generation.json"),&initial,&error),"B11-initial-manifest");
 const auto sealed=Sealed(root);std::size_t deleted=0;for(const auto& r:expected)deleted+=r.deleted;
 Need(deleted==1110,"B11-expected-deleted-count");
 const auto check=[&](RecordingCatalog& catalog,const std::string& phase) {
  std::map<std::string,std::size_t> live_counts,deleted_counts;
  for(const auto& row:expected) {
   Need(catalog.IsDeletedSegmentId(row.id)==row.deleted,"B11-deleted-membership");
   Need(catalog.SegmentLifecycleV2(row.id)==(row.deleted?RecordingLifecycle::Deleted:RecordingLifecycle::Finalized),"B11-lifecycle");
   const auto value=catalog.FindSegmentV2ById(row.id);
   if(row.deleted) {Need(!value&&!catalog.FindSegmentMediaLocation(row.id),"B11-deleted-no-media");++deleted_counts[row.channel];}
   else {Need(value&&value->channel_id==row.channel&&value->checksum_sha256==row.checksum&&value->mappings.size()==row.mappings,"B11-live-detail");++live_counts[row.channel];}
  }
  std::set<std::string> channels;for(const auto& r:expected)channels.insert(r.channel);
  for(const auto& channel:channels) {
   RecordingLocationCatalogSnapshot locations;Need(catalog.SnapshotLocationsV2(channel,&locations,&error),"B11-location-read");
   Need(locations.deleted_segment_ids.size()==deleted_counts[channel]&&locations.segments.size()==live_counts[channel],"B11-location-counts");
   RecordingTimelineResult timeline;const auto begin=Clock::now();
   std::cout<<"[start] B11-P03-T phase="<<phase<<" timeline\n";std::cout.flush();
   ::alarm(15);const bool ok=catalog.SnapshotTimelineV2({channel,0,9000000000000LL,0,100,true},&timeline,&error);::alarm(0);
   Metric("B11-"+phase+"-timeline",expected.size(),begin);Need(ok,"B11-timeline-read");
   const auto channel_count=live_counts[channel]+deleted_counts[channel];
   std::cout<<"[timeline] channel="<<channel<<" expected_segments="<<channel_count<<" known="<<timeline.total<<" unplaced="<<timeline.unplaced_total<<'\n';
   Need(timeline.total+timeline.unplaced_total>=channel_count&&!timeline.unplaced_items.empty(),"B11-timeline-history-count");
   for(const auto& item:timeline.unplaced_items) {
    const auto found=std::find_if(expected.begin(),expected.end(),[&](const auto& r){return r.id==item.segment_id;});
    Need(found!=expected.end()&&!item.members.empty()&&item.members.size()<=found->mappings,"B11-timeline-members");
    if(found->deleted)Need(item.catalog_state=="deleted"&&!item.playable,"B11-timeline-deleted-unavailable");
   }
   std::cout<<"[pass] B11-P03-T total="<<timeline.total<<" unplaced_total="<<timeline.unplaced_total<<" page="<<timeline.unplaced_items.size()<<'\n';
  }
  std::cout<<"[pass] B11-P02 phase="<<phase<<" expected="<<expected.size()<<" deleted="<<deleted<<" live="<<expected.size()-deleted<<" metadata_only=true\n";
 };
 const auto open=[&](bool sqlite,bool write,const std::string& phase) {
  const auto start=Clock::now();::alarm(15);
  const auto natural=std::numeric_limits<std::size_t>::max();
  RecordingJournal journal(RecordingJournal::ManagedOptions{root,initial.store_id,{1ULL<<30,1ULL<<30,1ULL<<30,16ULL*1024*1024+1,natural,natural}});
  Need(journal.Open(&error),"B11-journal-open");RecordingCatalog::Options options(root/"recording-catalog.sqlite3",root,sqlite);
  options.enable_v2_storage=true;options.enable_generation_writes=write;RecordingCatalog catalog(journal,options);
  const bool opened=catalog.Open(&error);if(!opened)std::cerr<<"[diagnostic] stage=catalog-open error_sha256="<<Digest(error)<<'\n';
  Need(opened,"B11-catalog-open");::alarm(0);Metric("B11-"+phase+"-open",expected.size(),start);check(catalog,phase);
  if(write){const auto checkpoint=Clock::now();::alarm(15);Need(catalog.Checkpoint(&error),"B11-checkpoint");::alarm(0);Metric("B11-checkpoint",expected.size(),checkpoint);}
 };
 open(true,true,"old-full");Preserved(root,sealed);
 RecordingGenerationManifest current;RecordingCatalogSnapshot snapshot;
 Need(ParseRecordingGenerationManifest(Bytes(root/"recording-generation.json"),&current,&error)&&
  ParseRecordingCatalogSnapshot(Bytes(root/current.snapshot.name),1ULL<<30,&snapshot,&error),"B11-current-snapshot");
 std::size_t receipts=0,live=0,full_tombs=0;for(const auto& row:snapshot.rows){receipts+=row.kind=="retired-v2";live+=row.kind=="segment-v2";full_tombs+=row.kind=="tombstone-v2";}
 Need(current.generation>initial.generation&&receipts==deleted&&live==expected.size()-deleted&&full_tombs==0,"B11-current-details-retired");
 Need(current.snapshot.size<initial.snapshot.size,"B11-current-snapshot-reduced");
 std::cout<<"[pass] B11-P02 snapshot_before="<<initial.snapshot.size<<" snapshot_after="<<current.snapshot.size<<" receipts="<<receipts<<" full_tombstones="<<full_tombs<<'\n';
 open(true,false,"receipt-sqlite");open(false,false,"receipt-fallback");Preserved(root,sealed);
 std::cout<<"[summary] B11_actual_metadata_compatibility=true media_playback=not-run longrun=not-run\n";
}
void Run(const std::filesystem::path& base,bool deleted,bool bounded){
 const std::size_t interval=bounded&&deleted?32:1;
 std::cout<<"[scope] bounded="<<bounded<<" observer_interval="<<interval<<" observer_batch_limit=128 complete_drain_at_checkpoint=true\n";
 phase="template";const auto prepare=Clock::now();Output input;
 {auto packets=Encode(deleted?60:4096,false,false,160,90,30,10000);auto outputs=Record(base/"template",packets);Need(outputs.size()==1,"template-single");input=std::move(outputs.front());}
 Need(input.binding.samples.size()==(deleted?60:4096)&&input.binding.file_evidence&&Verify(input),"template-actual-evidence");Metric("legacy-template-preparation",1,prepare);
 const auto expected_file=base/"expected-template.jsonl";Write(expected_file,SerializeRecordingSegmentV2(input.segment)+"\n"+SerializeRecordingSourceBindingV1(input.binding)+"\n");
 std::cout<<"[template] samples="<<input.binding.samples.size()<<" file_bytes="<<input.segment.size_bytes<<" binding_bytes="<<SerializeRecordingSourceBindingV1(input.binding).size()<<" sha256="<<input.segment.checksum_sha256<<'\n';
 const auto root=base/"product";std::string store,error;std::size_t index=0,seen=0;std::string prefix;
 for(const auto count:deleted?std::vector<std::size_t>{1020,2049}:std::vector<std::size_t>{1,16,32}){
  {RecordingRuntimeStorage runtime(root);phase="runtime-open";const auto opened=Clock::now();Need(runtime.Open(&error),"runtime-open");Metric("runtime-open",index,opened);store=runtime.journal().ManagedStoreId();auto& c=runtime.catalog();std::filesystem::create_directories(root/"probe-channel");
   for(;index<count;){++index;auto expected=Expected(input,root,store,index);std::filesystem::copy_file(input.file,expected.file);Need(Verify(expected),"copied-evidence");
    const auto begin=Clock::now();RecordingOrderReservationV1 order;Need(c.ReserveRecordingOrder(store,expected.segment.order_request_id,expected.segment.segment_id,expected.segment.channel_id,&order,&error)&&order.sequence==static_cast<std::int64_t>(index),"reserve-order");
    Need(c.FinalizeBoundSegmentV2(expected.segment,expected.binding,expected.file.string(),&error),"finalize-bound");Metric("reserve-finalize",index,begin);
    if(index==1){Need(!c.ReserveRecordingOrder(store,expected.segment.order_request_id,"different",expected.segment.channel_id,&order,&error),"order-conflict");
     Need(c.AdjustHoldCount(expected.segment.segment_id,1,&error)&&!c.RequestDeletion(expected.segment.segment_id,"continuous-age",&error)&&c.AdjustHoldCount(expected.segment.segment_id,-1,&error),"hold-protection");}
    if(deleted){const auto start=Clock::now();RecordingTombstoneV2 tomb;tomb.tombstone_id="deleted-"+std::to_string(index);tomb.segment=expected.segment;tomb.deletion_reason="continuous-age";tomb.deleted_at_ms=1000+index;
     Need(c.RequestDeletion(expected.segment.segment_id,tomb.deletion_reason,&error)&&std::filesystem::remove(expected.file)&&c.CompleteDeletionV2(tomb,&error),"delete-complete");Metric("delete",index,start);}
    if(index%interval==0)Observe(root,seen,prefix,bounded);
   }
   Current(c,input,root,store,count,deleted);const auto before=Sealed(root);const auto checkpoint=Clock::now();Need(c.Checkpoint(&error),"checkpoint");Metric("checkpoint",count,checkpoint);Preserved(root,before);Observe(root,seen,prefix,bounded);
   if(bounded){
    Need(seen==count*(deleted?4:2),"complete-drain-count");
    std::cout<<"[pass] B08-C01 complete-drain count="<<count<<" mutations="<<seen<<'\n';
    SingleSnapshot(root,count);
   }
   std::cout<<"[pass] B07-S03 checkpoint-old-detail-unchanged count="<<count<<'\n';
  }
  Reopen(expected_file,root,store,count,deleted,true);Reopen(expected_file,root,store,count,deleted,false);Size(base,count);
 }
 phase="pin-fixture";{RecordingRuntimeStorage runtime(base/"pin");Need(runtime.Open(&error),"pin-runtime");auto p=Expected(input,base/"pin",runtime.journal().ManagedStoreId(),1);p.segment.pinned=true;std::filesystem::create_directories(p.file.parent_path());std::filesystem::copy_file(input.file,p.file);RecordingOrderReservationV1 order;
  Need(runtime.catalog().ReserveRecordingOrder(p.segment.store_id,p.segment.order_request_id,p.segment.segment_id,p.segment.channel_id,&order,&error)&&runtime.catalog().FinalizeBoundSegmentV2(p.segment,p.binding,p.file.string(),&error)&&!runtime.catalog().RequestDeletion(p.segment.segment_id,"continuous-age",&error),"pin-protection");}
 std::cout<<"[pass] B07-S03 isolated-pin-protection\n[summary] generation_scale_pass=true mode="<<(bounded?"bounded-":"")<<(deleted?"deleted":"small")<<" template_only=true fresh_full_observer_drain=not-run\n";
}
}
int main(int argc,char** argv){std::cout.setf(std::ios::unitbuf);try{
 scale::program=std::filesystem::canonical(argv[0]).string();
 if(argc==3&&std::string(argv[2])=="receipt-compat"){scale::RetiredCompatibility(argv[1]);return 0;}
 if(argc==4&&std::string(argv[1])=="--observe"){scale::ObserveWorker(argv[2],std::stoull(argv[3]));return 0;}
 if(argc==8&&std::string(argv[1])=="--reopen"){
  Output input;std::ifstream file(argv[3]);std::string segment,binding,error;scale::Need(bool(std::getline(file,segment))&&bool(std::getline(file,binding))&&ParseRecordingSegmentV2(segment,&input.segment,&error)&&ParseRecordingSourceBindingV1(binding,&input.binding,&error),"expected-template-read");
  scale::ReopenWorker(input,argv[2],argv[4],std::stoull(argv[5]),std::string(argv[6])=="deleted",std::string(argv[7])=="sql");return 0;
 }
 if(argc!=3)return 2;gst_init(nullptr,nullptr);const std::string mode=argv[2];scale::Need(mode=="small"||mode=="deleted"||mode=="bounded-small"||mode=="bounded-deleted","mode");scale::Run(argv[1],mode=="deleted"||mode=="bounded-deleted",mode.rfind("bounded-",0)==0);return 0;
 }catch(...){std::cerr<<"[fail] code="<<scale::phase<<'\n';return 1;}}

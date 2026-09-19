// LP17 독립 seed/기대값을 사용하는 비교 전용 실행 파일. 제품/기존 LP16 판정은 변경하지 않는다.
#define main recording_file_evidence_unused_main
#include "recording_file_evidence_smoke.cpp"
#undef main
#include "recording_catalog_cost_probe_timer.h"
#include "recording_catalog_comparison_ownership.h"
namespace {
const char* diagnostic_stage="arguments";
const char* diagnostic_check="none";
void DiagnosticCheck(const char* label){diagnostic_check="unknown";for(const char* allowed:{"LP02.actual4096-prerequisite","seed.input-count","seed.input-identity-all-samples","seed.physical-evidence","LP02.reserve","LP02.actual-file-outside-catalog","LP02.commit","LP02.snapshot-exact-count","snapshot.canonical-all","LP02.explicit-checkpoint","LP02.reservation-bound-mutation-count","delete.original-canonical","delete.pending","delete.unlink","delete.tombstone","delete.checkpoint","delete.binding-preserved","deleted.public-hidden","LP02.journal-reopen","LP02.catalog-reopen","LP02.exact-source","reopen.deleted-state","reopen.remaining-media"})if(std::string(label)==allowed){diagnostic_check=allowed;return;}}
// label을 식 평가 전에 기록한다. include된 기존 fixture의 Check 구현/출력은 그대로 사용한다.
#define Check(value,label) (DiagnosticCheck(label),Check((value),(label)))
// 준비 입력은 고정 byte-stream H.264다. 실제 입력 VCL을 길이-prefix로 정규화해 발급 증거와 교차 확인한다.
std::string InputVcl(const std::vector<unsigned char>& bytes){std::vector<std::pair<std::size_t,std::size_t>> starts;for(std::size_t i=0;i+3<=bytes.size();){std::size_t width=0;if(i+4<=bytes.size()&&bytes[i]==0&&bytes[i+1]==0&&bytes[i+2]==0&&bytes[i+3]==1)width=4;else if(bytes[i]==0&&bytes[i+1]==0&&bytes[i+2]==1)width=3;if(width){starts.push_back({i,i+width});i+=width;}else ++i;}std::string canonical;for(std::size_t i=0;i<starts.size();++i){const auto first=starts[i].second;auto end=i+1<starts.size()?starts[i+1].first:bytes.size();while(end>first&&bytes[end-1]==0)--end;if(end<=first)throw std::runtime_error("LP17_INPUT_NAL");const auto type=bytes[first]&31;if(type!=1&&type!=5)continue;const auto size=end-first;if(size>UINT32_MAX)throw std::runtime_error("LP17_INPUT_NAL");for(int shift=24;shift>=0;shift-=8)canonical.push_back(static_cast<char>((size>>shift)&255));canonical.append(reinterpret_cast<const char*>(bytes.data()+first),size);}if(canonical.empty())throw std::runtime_error("LP17_INPUT_VCL");return Digest(canonical);}
void Timing(const char* stage,const char* domain,long long us){std::cout<<"[lp17] {\"kind\":\"timing\",\"stage\":\""<<stage<<"\",\"domain\":\""<<domain<<"\",\"elapsedUs\":"<<us<<"}\n";}
template<class F> auto Product(const char* stage,F&& f){diagnostic_stage="product";for(const char* allowed:{"reserve","commit","snapshot","explicit_checkpoint","delete_pending","delete_tombstone","delete_checkpoint","journal_open","catalog_open"})if(std::string(stage)==allowed){diagnostic_stage=allowed;break;}fc::enabled=true;const auto t=Clock::now();auto result=f();const auto elapsed=Us(t);fc::enabled=false;Timing(stage,"product",elapsed);fc::Dump(stage);return result;}
std::string LoadCanonical(const std::filesystem::path& file){const auto t=Clock::now();auto text=Bytes(file);if(text.empty()||Digest(text)!=Bytes(file.string()+".sha256"))throw std::runtime_error("LP17_EXPECTED_HASH");Timing("expected_read","oracle",Us(t));return text;}
void SaveCanonical(const std::filesystem::path& file,const std::string& text){if(text.empty()||std::filesystem::exists(file)||std::filesystem::exists(file.string()+".sha256"))throw std::runtime_error("LP17_EXPECTED_WRITE");Write(file,text);Write(file.string()+".sha256",Digest(text));}
Output Expected(const std::filesystem::path& seed,const std::filesystem::path& root,unsigned i){Output o;o.root=root;const auto base=seed/("expected-"+std::to_string(i));auto s=LoadCanonical(base.string()+".segment"),b=LoadCanonical(base.string()+".binding");const auto t=Clock::now();if(!ParseRecordingSegmentV2(s,&o.segment,nullptr)||!ParseRecordingSourceBindingV1(b,&o.binding,nullptr)||SerializeRecordingSegmentV2(o.segment)!=s||SerializeRecordingSourceBindingV1(o.binding)!=b)throw std::runtime_error("LP17_EXPECTED_CANONICAL");if(o.segment.segment_id!="scale-"+std::to_string(i)||o.segment.order_request_id!="scale-order-"+std::to_string(i)||o.segment.order_sequence!=i+1||o.binding.segment_id!=o.segment.segment_id)throw std::runtime_error("LP17_EXPECTED_ID");o.file=root/(o.segment.segment_id+".mp4");Timing("expected_parse","oracle",Us(t));return o;}
void FixtureOwners(const char* stage,const std::vector<Output>& retained,const Output* current=nullptr){lp17::Owned n;lp17::Vector(n,retained);for(const auto& o:retained){lp17::Segment(n,o.segment);lp17::Binding(n,o.binding);}if(current){lp17::Segment(n,current->segment);lp17::Binding(n,current->binding);}lp17::Emit(stage,"fixture",n);}
void Exact(RecordingCatalog& c,const Output& o,const char* label){
 diagnostic_stage="canonical_compare";DiagnosticCheck(label);const auto t=Clock::now();const auto& id=o.segment.segment_id;
 const auto s=c.FindSegmentV2ById(id);const auto b=c.FindSourceBinding(id);const bool deleted=c.IsDeletedSegmentId(id);
 if(deleted){
  const auto tombstone=c.tombstones_v2_.find(id);const auto retained=c.source_bindings_.find(id);
  Check(tombstone!=c.tombstones_v2_.end()&&retained!=c.source_bindings_.end()&&SerializeRecordingSegmentV2(tombstone->second.segment)==SerializeRecordingSegmentV2(o.segment)&&SerializeRecordingSourceBindingV1(retained->second)==SerializeRecordingSourceBindingV1(o.binding),label);
  Check(!s&&!b&&!c.FindSegmentMediaLocation(id)&&!c.FindSegmentMediaPath(id),"deleted.public-hidden");
 }else Check(s&&b&&SerializeRecordingSegmentV2(*s)==SerializeRecordingSegmentV2(o.segment)&&SerializeRecordingSourceBindingV1(*b)==SerializeRecordingSourceBindingV1(o.binding),label);
 Timing("canonical_compare","oracle",Us(t));
}
void Prepare(const std::filesystem::path& seed,unsigned samples,unsigned count){
 diagnostic_stage="prepare";
 if(std::filesystem::exists(seed))throw std::runtime_error("LP17_SEED_EXISTS");std::filesystem::create_directory(seed);lp17::Observe("prepare_before",0);
 auto input=Encode(samples,false,false,160,90,30,10000);const auto originals=Record(seed/"recorded",input);context="LP17/prepare";
 Check(originals.size()==1&&originals[0].binding.file_evidence.has_value(),"LP02.actual4096-prerequisite");const auto& o=originals.front();
 Check(input.packets.size()==samples&&o.binding.samples.size()==samples&&o.binding.file_evidence->samples.size()==samples,"seed.input-count");
 std::string input_rows;
 for(unsigned i=0;i<samples;++i){const auto& p=input.packets[i];const auto& b=o.binding.samples[i];const auto& f=o.binding.file_evidence->samples[i];if(!p.observation||b.ordinal!=p.observation->ordinal||b.pts_ns!=*p.observation->pts_ns||f.ordinal!=b.ordinal||f.original_pts_ns!=p.pts||f.original_dts_ns!=p.dts||f.vcl_sha256!=InputVcl(p.payload)||o.binding.source_generation!=p.observation->source_generation||o.binding.generation_order!=p.observation->generation_order||o.binding.track_id!=p.track_id)throw std::runtime_error("LP17_SEED_IDENTITY");input_rows+=std::to_string(i)+" "+std::to_string(b.ordinal)+" "+std::to_string(p.pts)+" "+std::to_string(p.dts)+" "+Digest(std::string(reinterpret_cast<const char*>(p.payload.data()),p.payload.size()))+"\n";}
 Check(true,"seed.input-identity-all-samples");Check(Verify(o)&&Digest(Bytes(o.file))==o.segment.checksum_sha256,"seed.physical-evidence");
 SaveCanonical(seed/"input-identity",input_rows);SaveCanonical(seed/"seed.segment",SerializeRecordingSegmentV2(o.segment));SaveCanonical(seed/"seed.binding",SerializeRecordingSourceBindingV1(o.binding));std::filesystem::copy_file(o.file,seed/"seed.mp4");SaveCanonical(seed/"configuration",std::to_string(samples)+" "+std::to_string(count));
 for(unsigned i=0;i<count;++i){auto expected=o;expected.segment.segment_id="scale-"+std::to_string(i);expected.segment.order_request_id="scale-order-"+std::to_string(i);expected.segment.order_sequence=i+1;expected.binding.segment_id=expected.segment.segment_id;SaveCanonical(seed/("expected-"+std::to_string(i)+".segment"),SerializeRecordingSegmentV2(expected.segment));SaveCanonical(seed/("expected-"+std::to_string(i)+".binding"),SerializeRecordingSourceBindingV1(expected.binding));}
 lp17::Observe("prepare_after",count);
}
void Configuration(const std::filesystem::path& seed,unsigned samples,unsigned count){if(LoadCanonical(seed/"configuration")!=std::to_string(samples)+" "+std::to_string(count))throw std::runtime_error("LP17_CONFIGURATION");}
void Scale(const std::filesystem::path& seed,const std::filesystem::path& root,const std::string& arm,unsigned samples,unsigned count){
 diagnostic_stage="scale";
 Configuration(seed,samples,count);if(std::filesystem::exists(root))throw std::runtime_error("LP17_STORE_EXISTS");std::vector<Output> retained;lp17::Observe("fixture_before",0);
 // A는 기존 outputs처럼 commit 순서로 전체 객체를 누적 보관한다. B/C는 같은 canonical 파일을 하나씩 읽는다.
 {
 Store store(root);lp17::Observe("store_after",0,&store.catalog);std::string error;
 for(unsigned i=0;i<count;++i){context="LP17/commit"+std::to_string(i+1);auto o=Expected(seed,root,i);RecordingOrderReservationV1 order;
 Check(Product("reserve",[&]{return store.journal.ReserveRecordingOrder("probe-store",o.segment.order_request_id,o.segment.segment_id,o.segment.channel_id,&order,&error);})&&order.sequence==o.segment.order_sequence,"LP02.reserve");
 std::filesystem::copy_file(seed/"seed.mp4",o.file);const auto verify=Clock::now();Check(Verify(o),"LP02.actual-file-outside-catalog");Timing("physical_verify","oracle",Us(verify));
 lp17::Observe("commit_before",i+1,&store.catalog);Check(Product("commit",[&]{return store.catalog.FinalizeBoundSegmentV2(o.segment,o.binding,o.file.string(),&error);}),"LP02.commit");
 if(arm=="A")retained.push_back(o);FixtureOwners("commit_after",retained,&o);lp17::Observe("commit_after",i+1,&store.catalog);
 if(i+1==16||i+1==count){context="LP17/snapshot"+std::to_string(i+1);std::vector<RecordingDerivedSourceSnapshotEntry> snapshot;auto first=Expected(seed,root,0);const auto ref=Job(first).reference;
 lp17::Observe("snapshot_before",i+1,&store.catalog);Check(Product("snapshot",[&]{return store.catalog.SnapshotDerivedSources(ref,&snapshot,&error);})&&snapshot.size()==i+1,"LP02.snapshot-exact-count");
 lp17::Owned n;lp17::Vector(n,snapshot);for(const auto& s:snapshot){lp17::Segment(n,s.segment);if(s.binding)lp17::Binding(n,*s.binding);}lp17::Emit("snapshot_after","snapshot",n);lp17::Observe("snapshot_after",i+1,&store.catalog);
 const auto t=Clock::now();for(unsigned j=0;j<=i;++j){auto expected=Expected(seed,root,j);const auto found=std::find_if(snapshot.begin(),snapshot.end(),[&](const auto& s){return s.segment.segment_id==expected.segment.segment_id;});if(found==snapshot.end()||!found->binding||SerializeRecordingSegmentV2(found->segment)!=SerializeRecordingSegmentV2(expected.segment)||SerializeRecordingSourceBindingV1(*found->binding)!=SerializeRecordingSourceBindingV1(expected.binding))throw std::runtime_error("LP17_SNAPSHOT_CANONICAL");}Check(true,"snapshot.canonical-all");Timing("snapshot_compare","oracle",Us(t));
 lp17::Observe("checkpoint_before",i+1,&store.catalog);Check(Product("explicit_checkpoint",[&]{return store.catalog.Checkpoint(&error);}),"LP02.explicit-checkpoint");lp17::Observe("checkpoint_after",i+1,&store.catalog);Check(lp17::Journal(store.journal).records==2*(i+1),"LP02.reservation-bound-mutation-count");
 }
 }
 context="LP17/delete";lp17::Observe("delete_before",count,&store.catalog);auto first=Expected(seed,root,0);Exact(store.catalog,first,"delete.original-canonical");
 Check(Product("delete_pending",[&]{return store.catalog.RequestDeletion(first.segment.segment_id,"continuous-capacity",&error);})&&store.catalog.SegmentLifecycleV2(first.segment.segment_id)==RecordingLifecycle::DeletionPending,"delete.pending");
 Check(std::filesystem::remove(first.file)&&!std::filesystem::exists(first.file),"delete.unlink");RecordingTombstoneV2 tombstone;tombstone.tombstone_id="lp17-tombstone-0";tombstone.segment=first.segment;tombstone.deletion_reason="continuous-capacity";tombstone.deleted_at_ms=first.segment.finalized_at_ms+1;
 Check(Product("delete_tombstone",[&]{return store.catalog.CompleteDeletionV2(tombstone,&error);})&&store.catalog.IsDeletedSegmentId(first.segment.segment_id),"delete.tombstone");
 Check(Product("delete_checkpoint",[&]{return store.catalog.Checkpoint(&error);}),"delete.checkpoint");Exact(store.catalog,first,"delete.binding-preserved");FixtureOwners("delete_after",retained);lp17::Observe("delete_after",count,&store.catalog);lp17::Provenance(store.journal);
 }
 FixtureOwners("store_released",retained);lp17::Observe("store_released",count);
}
void Recovery(const std::filesystem::path& seed,const std::filesystem::path& root,const std::string& arm,unsigned samples,unsigned count,bool sql){
 diagnostic_stage="reopen";
 Configuration(seed,samples,count);context=sql?"LP17/reopen/sqlite":"LP17/reopen/jsonl";std::vector<Output> retained;if(arm=="A")for(unsigned i=0;i<count;++i)retained.push_back(Expected(seed,root,i));
 {
 RecordingJournal journal(RecordingJournal::ManagedOptions{root,"probe-store"});std::string error;Check(Product("journal_open",[&]{return journal.Open(&error);}),"LP02.journal-reopen");auto opts=Store::Options(root);opts.prefer_sqlite=sql;RecordingCatalog c(journal,opts);
 lp17::Observe("reopen_before",count);Check(Product("catalog_open",[&]{return c.Open(&error);}),"LP02.catalog-reopen");lp17::Observe("reopen_after",count,&c);
 for(unsigned i=0;i<count;++i){std::optional<Output> one;if(arm!="A")one=Expected(seed,root,i);const auto& o=one?*one:retained[i];context="LP17/reopen/"+std::string(sql?"sqlite/":"jsonl/")+std::to_string(i);Exact(c,o,"LP02.exact-source");if(!i)Check(c.IsDeletedSegmentId(o.segment.segment_id)&&c.SegmentLifecycleV2(o.segment.segment_id)==RecordingLifecycle::Deleted&&!c.FindSegmentMediaLocation(o.segment.segment_id)&&!std::filesystem::exists(o.file),"reopen.deleted-state");else Check(!c.IsDeletedSegmentId(o.segment.segment_id)&&Verify(o),"reopen.remaining-media");}
 FixtureOwners("reopen_verified",retained);lp17::Observe("reopen_verified",count,&c);lp17::Provenance(journal);
 }
 lp17::Observe("reopen_released",count);
}
}
int main(int argc,char** argv){gst_init(nullptr,nullptr);try{
 if(argc<5)throw std::runtime_error("LP17_ARGUMENTS");const std::string mode=argv[1];std::string arm="seed";unsigned samples=0,count=0;
 if(mode=="prepare"&&argc==5){samples=std::stoul(argv[3]);count=std::stoul(argv[4]);}else if((mode=="scale"&&argc==7)||(mode=="reopen"&&argc==8)){arm=argv[4];samples=std::stoul(argv[5]);count=std::stoul(argv[6]);if(arm!="A"&&arm!="B"&&arm!="C")throw std::runtime_error("LP17_ARM");}else throw std::runtime_error("LP17_ARGUMENTS");
 if(!((samples==32&&count==2)||(samples==4096&&count==32)))throw std::runtime_error("LP17_SIZE");lp17::cache_off=arm=="C";
 if(mode=="prepare")Prepare(argv[2],samples,count);else if(mode=="scale")Scale(argv[2],argv[3],arm,samples,count);else {const std::string backend=argv[7];if(backend!="sqlite"&&backend!="jsonl")throw std::runtime_error("LP17_BACKEND");Recovery(argv[2],argv[3],arm,samples,count,backend=="sqlite");}
 std::cout<<"[lp17] {\"kind\":\"summary\",\"mode\":\""<<mode<<"\",\"arm\":\""<<arm<<"\",\"samples\":"<<samples<<",\"count\":"<<count<<",\"pass\":"<<passes<<",\"fail\":0}\n";return 0;
 }catch(...){fc::enabled=false;std::cout<<"[lp17] {\"kind\":\"error\",\"code\":\"LP17_ORACLE_OR_SETUP\",\"stage\":\""<<diagnostic_stage<<"\",\"check\":\""<<diagnostic_check<<"\"}\n";return 1;}}
#undef Check

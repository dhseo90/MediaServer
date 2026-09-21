// 파일 용도: 기존 prepare의 실제 AU/native 증거 seed를 읽는다. 원본 cpp는 수정하지 않는다.
#include "recording_catalog_query_seed.h"
#undef Check
#include "recording_catalog_query_counter.h"
#include <future>
#include <thread>
namespace {
using Rows=std::vector<RecordingDerivedSourceSnapshotEntry>;
int passed=0,failed=0;
void Need(bool ok){if(!ok)throw std::runtime_error("LP21_QUERY_SETUP");}
void QCheck(bool ok,const char* name){++(ok?passed:failed);std::cout<<(ok?"[pass] ":"[fail] ")<<name<<'\n';if(!ok)throw std::runtime_error("LP21_QUERY_ORACLE");}
std::vector<std::string> Canonical(const Rows& rows){std::vector<std::string> out;for(const auto& row:rows){Need(row.binding.has_value());out.push_back(SerializeRecordingSegmentV2(row.segment)+"|"+SerializeRecordingSourceBindingV1(*row.binding)+"|"+std::to_string(static_cast<int>(row.lifecycle))+"|"+std::to_string(row.deleted));}return out;}
struct QueryStore {
 Store store;Rows expected;RecordingConsumerReferenceV1 reference;std::string error;std::vector<std::pair<std::filesystem::path,std::string>> original_files;
 QueryStore(const std::filesystem::path& seed,const std::filesystem::path& root,unsigned total):store(root){
  Configuration(seed,4096,32);Need(!LoadCanonical(seed/"input-identity").empty());
  for(unsigned i=0;i<total;++i){auto output=Expected(seed,root,i);auto& segment=output.segment;auto& binding=output.binding;
   if(i==0)reference=Job(output).reference;
   if(i>=2)binding.source_generation="query-unrelated-generation";
   Need(binding.file_evidence&&binding.samples.size()==4096&&binding.file_evidence->samples.size()==4096);
   Need(ValidateRecordingSourceBindingForSegment(binding,segment,&error));
   RecordingOrderReservationV1 order;Need(store.journal.ReserveRecordingOrder("probe-store",segment.order_request_id,segment.segment_id,segment.channel_id,&order,&error)&&order.sequence==segment.order_sequence);
   std::filesystem::copy_file(seed/"seed.mp4",output.file);Need(Verify(output));
   original_files.push_back({output.file,segment.checksum_sha256});
   Need(store.catalog.FinalizeBoundSegmentV2(segment,binding,output.file.string(),&error));
   if(i<2){RecordingDerivedSourceSnapshotEntry row;row.segment=segment;row.binding=binding;row.lifecycle=RecordingLifecycle::Finalized;row.deleted=false;expected.push_back(row);}
  }
 }
 bool Cold() const{for(const auto& [id,entry]:store.catalog.source_bindings_){(void)id;if(entry.ResidentOwned())return false;}return true;}
 bool Exact(const Rows& rows)const{return Canonical(rows)==Canonical(expected);}
 bool Physical()const{for(const auto& [file,sha]:original_files)if(Digest(Bytes(file))!=sha)return false;return true;}
 bool Query(std::uint64_t* token,Rows* rows,std::string* error){return store.catalog.SnapshotDerivedSourcesWithWaitLease(reference,{*reference.original},token,rows,error);}
 void Write(unsigned n){auto ref=reference;ref.reference_id="unrelated-reference-"+std::to_string(n);std::string error;Need(store.catalog.PutConsumerReference(ref,&error));}
};
struct ThreadResult {std::map<std::string,fc::Metric> metrics;unsigned attempts=0,fallbacks=0,writes=0;bool ok=true;};
void EmitThread(const char* stage,const char* thread,const ThreadResult& r){
 const auto call=query_probe::Suffix(r.metrics,"query.call"),wait=query_probe::Suffix(r.metrics,"catalog.lock.wait"),hold=query_probe::Suffix(r.metrics,"catalog.lock.hold"),off=query_probe::Suffix(r.metrics,"query.materialize",true),protect=query_probe::Suffix(r.metrics,"query.protection");
 std::cout<<"[query] {\"kind\":\"thread\",\"stage\":\""<<stage<<"\",\"thread\":\""<<thread<<"\",\"attempts\":"<<r.attempts<<",\"fallbacks\":"<<r.fallbacks<<",\"writes\":"<<r.writes<<",\"callCount\":"<<call.count<<",\"wallNs\":"<<call.inclusive<<",\"maxCallNs\":"<<call.maximum<<",\"waitCount\":"<<wait.count<<",\"waitNs\":"<<wait.inclusive<<",\"maxWaitNs\":"<<wait.maximum<<",\"holdCount\":"<<hold.count<<",\"holdNs\":"<<hold.inclusive<<",\"maxHoldNs\":"<<hold.maximum<<",\"offlockCalls\":"<<off.count<<",\"offlockNs\":"<<off.inclusive<<",\"protectionCalls\":"<<protect.count<<",\"protectionNs\":"<<protect.inclusive<<",\"metricRows\":"<<r.metrics.size()<<"}\n";
 // 각 스레드의 전체 inclusive/exclusive도 합류 후 순서대로 보존한다.
 for(const auto& [scope,m]:r.metrics)std::cout<<"[query] {\"kind\":\"cost\",\"stage\":\""<<stage<<"\",\"thread\":\""<<thread<<"\",\"scope\":\""<<scope<<"\",\"count\":"<<m.count<<",\"inclusiveNs\":"<<m.inclusive<<",\"exclusiveNs\":"<<m.exclusive<<",\"maximumNs\":"<<m.maximum<<"}\n";
}
void ReadWork(QueryStore& s,ThreadResult& r){
 query_probe::Begin();fc::metrics.clear();
 try{for(unsigned i=0;i<8;++i){std::uint64_t token=0;Rows rows;std::string error;
  fc::enabled=true;const bool ok=s.Query(&token,&rows,&error);fc::enabled=false;
  Need(ok&&token&&s.Exact(rows));{std::lock_guard<std::mutex> lock(s.store.catalog.mu_);Need(s.store.catalog.derived_wait_leases_.at(token).source_ids.size()==2);}Need(s.store.catalog.ReleaseDerivedWaitLease(token,&error));
 }}catch(...){fc::enabled=false;r.ok=false;}
 r.attempts=query_probe::attempts;r.fallbacks=query_probe::fallbacks;query_probe::observing=false;r.metrics=fc::Take();
}
void Phase(QueryStore& s,unsigned total,bool overlap){
 const auto before=Bytes(s.store.journal.path());ThreadResult reader,writer;std::promise<void> gate;auto start=gate.get_future().share();
 std::thread reading([&]{start.wait();ReadWork(s,reader);});
 std::thread writing;
 if(overlap)writing=std::thread([&]{start.wait();fc::metrics.clear();try{for(unsigned i=0;i<16;++i){fc::enabled=true;s.Write(i);fc::enabled=false;++writer.writes;}}catch(...){fc::enabled=false;writer.ok=false;}writer.metrics=fc::Take();});
 gate.set_value();reading.join();if(writing.joinable())writing.join();
 const char* stage=overlap?"overlap":"quiet";Need(reader.ok&&writer.ok);
 const auto replay=s.store.journal.Replay();std::string full;for(const auto& m:replay.mutations)full+=SerializeRecordingMutationV1(m)+"\n";
 const auto after=Bytes(s.store.journal.path());bool writes=after.compare(0,before.size(),before)==0;
 if(overlap){
  unsigned matched=0;
  for(const auto& mutation:replay.mutations){
   if(mutation.mutation_type==RecordingMutationType::ConsumerReferencePut){
    for(unsigned i=0;i<16;++i){auto ref=s.reference;ref.reference_id="unrelated-reference-"+std::to_string(i);if(mutation.entity_id==ref.reference_id&&mutation.payload_json=="{\"reference\":"+SerializeRecordingConsumerReferenceV1(ref)+"}")++matched;}
   }
  }
  writes&=matched==16&&s.store.catalog.consumer_references_.size()==16;
 }
 QCheck(reader.attempts==8&&reader.fallbacks<=8&&writer.writes==(overlap?16U:0U)&&full==after&&(overlap?after.size()>before.size():after==before)&&writes&&s.Cold()&&s.Physical(),overlap?"LP21-Q02 natural overlap preserves exact snapshots and all normal writes":"LP21-Q01 quiet wait queries preserve canonical bytes and cold detail");
 std::cout<<"[query] {\"kind\":\"phase\",\"stage\":\""<<stage<<"\",\"total\":"<<total<<",\"relevant\":2,\"protected\":2,\"samples\":4096,\"attempts\":"<<reader.attempts<<",\"fallbacks\":"<<reader.fallbacks<<",\"writes\":"<<writer.writes<<"}\n";
 EmitThread(stage,"reader",reader);if(overlap)EmitThread(stage,"writer",writer);
 lp17::Observe(overlap?"query_overlap_after":"query_quiet_after",total);
}
void Forced(QueryStore& s,unsigned total){
 query_probe::Arm();std::uint64_t token=0;Rows rows;ThreadResult reader;std::string error;
 std::thread reading([&]{query_probe::Begin();try{reader.ok=s.Query(&token,&rows,&error);}catch(...){reader.ok=false;}reader.attempts=query_probe::attempts;reader.fallbacks=query_probe::fallbacks;query_probe::observing=false;});
 const bool reached=query_probe::Wait();std::promise<bool> done;auto completed=done.get_future();
 std::thread writing([&]{try{s.Write(100);done.set_value(true);}catch(...){done.set_value(false);}});
 const bool progressed=completed.wait_for(std::chrono::seconds(3))==std::future_status::ready;
 query_probe::Release();reading.join();writing.join();const bool wrote=completed.get();
 QCheck(reached&&progressed&&wrote&&reader.ok&&reader.attempts==1&&reader.fallbacks==1&&token&&s.Exact(rows)&&s.Cold()&&s.Physical(),"LP21-Q02 forced unrelated Apply falls back once without performance timing");
 bool blocked=true;for(unsigned i=0;i<2;++i)blocked&=!s.store.catalog.RequestDeletion("scale-"+std::to_string(i),"continuous-capacity",&error);
 QCheck(blocked&&s.store.catalog.ReleaseDerivedWaitLease(token,&error),"LP21-Q03 both selected sources stay protected until exact lease release");
 bool deleted=true;for(unsigned i=0;i<2;++i)deleted&=s.store.catalog.RequestDeletion("scale-"+std::to_string(i),"continuous-capacity",&error);
 QCheck(deleted&&s.Physical(),"LP21-Q03 released sources regain the existing deletion behavior");
 std::cout<<"[query] {\"kind\":\"forced\",\"total\":"<<total<<",\"attempts\":1,\"fallbacks\":1,\"writes\":1,\"timed\":false}\n";
}
}
int main(int argc,char** argv){if(argc!=4)return 2;gst_init(nullptr,nullptr);try{const unsigned total=static_cast<unsigned>(std::stoul(argv[3]));if(total!=16&&total!=32)return 2;QueryStore s(argv[1],argv[2],total);
 QCheck(s.Cold()&&s.expected.size()==2&&s.expected[0].binding->samples.size()==4096&&s.store.catalog.source_bindings_.size()==total,"LP21-Q01 fixture separates total sources from two relevant 4096-sample bindings");
 lp17::Observe("query_ready",total);
 Phase(s,total,false);Phase(s,total,true);Forced(s,total);
 std::cout<<"[query] {\"kind\":\"summary\",\"total\":"<<total<<",\"relevant\":2,\"protected\":2,\"samples\":4096,\"pass\":"<<passed<<",\"fail\":"<<failed<<",\"nativeFileEvidence\":true}\n";
 }catch(...){query_probe::Release();std::cout<<"[error] LP21_QUERY_PREPARATION_OR_ORACLE\n";return 1;}return failed?1:0;}

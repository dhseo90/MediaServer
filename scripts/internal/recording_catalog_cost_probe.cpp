#define main recording_file_evidence_unused_main
#include "recording_file_evidence_smoke.cpp"
#undef main
#include "recording_catalog_cost_probe_timer.h"
namespace {
void Cost(const Output& original,const std::filesystem::path& root,bool legacy,unsigned count){
 context="FC01/"+std::string(legacy?"legacy":"evidence")+"/sources"+std::to_string(count);
 std::vector<Output> outputs;std::string error;
 {
  Store store(root);
  for(unsigned i=0;i<count;++i){auto o=original;o.root=root;o.segment.segment_id="cost-"+std::to_string(i);o.segment.order_request_id="cost-order-"+std::to_string(i);o.binding.segment_id=o.segment.segment_id;o.file=root/(o.segment.segment_id+".mp4");
   RecordingOrderReservationV1 order;Check(store.journal.ReserveRecordingOrder("probe-store",o.segment.order_request_id,o.segment.segment_id,o.segment.channel_id,&order,&error),"reserve"+std::to_string(i));o.segment.order_sequence=order.sequence;
   std::filesystem::copy_file(original.file,o.file);Check(Verify(o),"actual file verified outside catalog"+std::to_string(i));if(legacy)o.binding.file_evidence.reset();
   std::cout<<"[fixture] case="<<context<<" index="<<i<<" binding_bytes="<<SerializeRecordingSourceBindingV1(o.binding).size()<<" file_sha256="<<o.segment.checksum_sha256<<'\n';
   fc::enabled=true;const auto begin=Clock::now();const bool ok=store.catalog.FinalizeBoundSegmentV2(o.segment,o.binding,o.file.string(),&error);const auto elapsed=Us(begin);fc::enabled=false;fc::Dump(context+"/commit"+std::to_string(i));Check(ok,"commit"+std::to_string(i)+" "+error);std::cout<<"[wall] case="<<context<<" commit="<<i<<" us="<<elapsed<<'\n';outputs.push_back(o);
  }
  std::vector<RecordingDerivedSourceSnapshotEntry> snapshot;const auto ref=Job(outputs.front()).reference;
  fc::enabled=true;const bool found=store.catalog.SnapshotDerivedSources(ref,&snapshot,&error);fc::enabled=false;fc::Dump(context+"/snapshot");Check(found&&snapshot.size()==count,"snapshot count");
  fc::enabled=true;const bool checkpoint=store.catalog.Checkpoint(&error);fc::enabled=false;fc::Dump(context+"/explicit-checkpoint");Check(checkpoint,"checkpoint "+error);
 }
 for(bool sql:{true,false}){
  RecordingJournal journal(RecordingJournal::ManagedOptions{root,"probe-store"});Check(journal.Open(&error),"reopen journal sql"+std::to_string(sql));auto opts=Store::Options(root);opts.prefer_sqlite=sql;RecordingCatalog catalog(journal,opts);Check(catalog.Open(&error),"reopen catalog sql"+std::to_string(sql));
  for(const auto& o:outputs){const auto b=catalog.FindSourceBinding(o.segment.segment_id);const auto s=catalog.FindSegmentV2ById(o.segment.segment_id);Check(b&&s&&SerializeRecordingSourceBindingV1(*b)==SerializeRecordingSourceBindingV1(o.binding)&&SerializeRecordingSegmentV2(*s)==SerializeRecordingSegmentV2(o.segment),"exact recovered segment+binding sql"+std::to_string(sql)+" "+o.segment.segment_id);}
 }
}
}
int main(int argc,char** argv){if(argc!=2)return 2;gst_init(nullptr,nullptr);try{
 const std::filesystem::path root=argv[1];auto input=Encode(4096,false,false,160,90,30,10000);const auto outputs=Record(root/"actual4096",input);Check(outputs.size()==1&&outputs[0].binding.file_evidence.has_value(),"FC01 actual4096 evidence prerequisite");
 std::cout<<"[mode] optimization=none sqlite=enabled clocks=steady single_thread_catalog=true nested=inclusive-and-exclusive instrument_overhead=not-subtracted write_branch=observed-only\n";
 for(unsigned count:{1U,8U})for(bool legacy:{true,false})Cost(outputs[0],root/(std::string(legacy?"legacy":"evidence")+std::to_string(count)),legacy,count);
 std::cout<<"[summary] FC01 passed="<<passes<<" performance_improvement_claim=false\n";return 0;
 }catch(const std::exception& e){std::cerr<<"[fail] "<<e.what()<<'\n';return 1;}}

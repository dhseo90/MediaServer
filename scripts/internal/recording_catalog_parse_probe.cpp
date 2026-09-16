// FC02: 실제 strict parser 호출 횟수와 두 catalog 분기의 수락/거부 동등성.
#define main recording_file_evidence_unused_main
#include "recording_file_evidence_smoke.cpp"
#undef main
#include "recording_catalog_cost_probe_timer.h"
#include <sqlite3.h>
namespace {
std::string Payload(const Output& o,bool bound,const std::string& segment={},const std::string& relative="\"media.mp4\"",const std::string& binding={}){
 return "{\"segment\":"+(segment.empty()?SerializeRecordingSegmentV2(o.segment):segment)+",\"mediaRelpath\":"+relative+(bound?",\"sourceBinding\":"+(binding.empty()?SerializeRecordingSourceBindingV1(o.binding):binding):"")+"}";
}
int SqlRows(RecordingCatalog& c,const char* table){sqlite3_stmt* statement=nullptr;const auto sql=std::string("SELECT COUNT(*) FROM ")+table;if(sqlite3_prepare_v2(c.sqlite_db_,sql.c_str(),-1,&statement,nullptr)!=SQLITE_OK)throw std::runtime_error("count prepare");const auto step=sqlite3_step(statement);const int count=step==SQLITE_ROW?sqlite3_column_int(statement,0):-1;sqlite3_finalize(statement);return count;}
void Case(const Output& o,const std::filesystem::path& root,bool bound,bool sql,const std::string& name,const std::string& payload,bool expected,bool count_parse,int* failures){
 context="FC02/"+std::string(bound?"bound":"unbound")+"/"+(sql?"sql":"apply")+"/"+name;Store store(root);std::string error;
 RecordingOrderReservationV1 order;Check(store.journal.ReserveRecordingOrder(o.segment.store_id,o.segment.order_request_id,o.segment.segment_id,o.segment.channel_id,&order,&error)&&order.sequence==o.segment.order_sequence,"valid reservation prerequisite");
 const auto replay=store.journal.Replay();Check(replay.mutations.size()==1&&store.catalog.ApplyMutationLocked(replay.mutations.front(),false,&error),"actual reservation replay prerequisite");
 RecordingMutationV1 mutation;mutation.mutation_id="fc-mutation";mutation.mutation_type=bound?RecordingMutationType::SegmentV2BoundFinalized:RecordingMutationType::SegmentV2Finalized;mutation.entity_id=o.segment.segment_id;mutation.occurred_at_ms=2;mutation.payload_json=payload;
 fc::target_payload=payload;fc::target_parses=0;const bool accepted=sql?store.catalog.ProjectMutationSqliteLocked(mutation,&error):store.catalog.ApplyMutationLocked(mutation,false,&error);fc::target_payload.clear();
 Check(accepted==expected,"acceptance expected"+std::to_string(expected));
 if(!accepted){if(sql)Check(SqlRows(store.catalog,"recording_segments_v2")==0&&SqlRows(store.catalog,"recording_source_bindings")==0&&SqlRows(store.catalog,"recording_mutations")==0,"rollback no partial SQL rows");else Check(!store.catalog.FindSegmentV2ById(o.segment.segment_id)&&!store.catalog.FindSourceBinding(o.segment.segment_id),"no partial memory projection");}
 else if(sql)Check(SqlRows(store.catalog,"recording_segments_v2")==1&&SqlRows(store.catalog,"recording_source_bindings")==int(bound),"positive SQL rows");
 else{const auto s=store.catalog.FindSegmentV2ById(o.segment.segment_id);const auto b=store.catalog.FindSourceBinding(o.segment.segment_id);Check(s&&SerializeRecordingSegmentV2(*s)==SerializeRecordingSegmentV2(o.segment)&&b.has_value()==bound&&(!bound||SerializeRecordingSourceBindingV1(*b)==SerializeRecordingSourceBindingV1(o.binding)),"positive exact memory projection");}
 if(count_parse){std::cout<<"[parse-count] case="<<context<<" expected=1 actual="<<fc::target_parses<<'\n';if(fc::target_parses!=1){++*failures;std::cout<<"[fail] "<<context<<" original payload parsed more than once\n";}else Check(true,"original payload parsed once");}
}
}
int main(int argc,char** argv){if(argc!=2)return 2;gst_init(nullptr,nullptr);try{
 const std::filesystem::path root=argv[1];auto input=Encode(12,false,false,160,90,30,250);const auto outputs=Record(root/"actual12",input);Check(outputs.size()==1&&outputs[0].binding.file_evidence.has_value(),"FC02 actual file evidence prerequisite");const auto& o=outputs[0];int failures=0;unsigned index=0;
 for(bool bound:{false,true})for(bool sql:{false,true}){
  const auto valid=Payload(o,bound);
  Case(o,root/("case"+std::to_string(index++)),bound,sql,"positive",valid,true,true,&failures);
  const std::vector<std::pair<std::string,std::string>> bad={
   {"truncated",valid.substr(0,valid.size()-1)},{"duplicate-key",valid.substr(0,valid.size()-1)+",\"mediaRelpath\":\"media.mp4\"}"},
   {"segment-wrong-type",Payload(o,bound,"[]")},{"relative-wrong-type",Payload(o,bound,{},"7")},
   {"missing-segment","{\"mediaRelpath\":\"media.mp4\"}"},{"missing-relative","{\"segment\":"+SerializeRecordingSegmentV2(o.segment)+"}"}
  };
  for(const auto& [name,payload]:bad)Case(o,root/("case"+std::to_string(index++)),bound,sql,name,payload,false,false,&failures);
  if(bound)Case(o,root/("case"+std::to_string(index++)),bound,sql,"binding-wrong-type",Payload(o,true,{},"\"media.mp4\"","[]"),false,false,&failures);
  Case(o,root/("case"+std::to_string(index++)),bound,sql,"unknown-extra-existing-boundary",valid.substr(0,valid.size()-1)+",\"extra\":0}",sql,false,&failures);
 }
 std::cout<<"[summary] FC02 passed="<<passes<<" parse_assertion_failures="<<failures<<" cases="<<index<<'\n';return failures?1:0;
 }catch(const std::exception& e){std::cerr<<"[fail] "<<e.what()<<'\n';return 1;}}

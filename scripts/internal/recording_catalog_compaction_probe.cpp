// 파일 용도: 실제 녹화 증거로 카탈로그 체크포인트 압축의 비용과 원장 의미 보존을 관측한다.
#define main recording_file_evidence_unused_main
#include "recording_file_evidence_smoke.cpp"
#undef main
#include "recording_catalog_cost_probe_timer.h"
namespace {
std::uint64_t Count(const std::string& suffix){std::uint64_t result=0;for(const auto& [key,m]:fc::metrics)if(key.size()>=suffix.size()&&key.compare(key.size()-suffix.size(),suffix.size(),suffix)==0)result+=m.count;return result;}
}
int main(int argc,char** argv){if(argc!=2)return 2;gst_init(nullptr,nullptr);try{
 const std::filesystem::path root=std::filesystem::path(argv[1])/"actual12";auto input=Encode(12,false,false,160,90,30,250);const auto outputs=Record(root,input);Check(outputs.size()==1&&outputs[0].binding.file_evidence.has_value(),"FC03 actual source evidence prerequisite");const auto& o=outputs[0];context="FC03/different-candidate";std::string error,expected_link;
 {
  Store store(root);EventRecordingLinkV1 link;link.link_id="cost-link";link.event_id="cost-event";link.source_id=link.channel_id="probe-channel";link.time_basis="utc-ms";link.status=EventRecordingLinkStatus::Pending;link.created_at_ms=1000;link.requested_range={1000,2000};
  for(int i=0;i<12;++i){link.updated_at_ms=1000+i;link.completeness_reason=std::string(200,'x');Check(store.catalog.PutEventLink(link,&error),"event revision"+std::to_string(i));}
  expected_link=SerializeEventRecordingLinkV1(link);const auto before=store.journal.Replay();const auto original_bytes=std::filesystem::file_size(store.journal.path());
  fc::enabled=true;const bool checkpoint=store.catalog.Checkpoint(&error);fc::enabled=false;
  Check(checkpoint,"actual checkpoint "+error);Check(Count("candidate.different")==1&&Count("candidate.identical")==0,"different candidate observed");Check(Count("checkpoint.originalSemantic")==1&&Count("checkpoint.candidateSemantic")==1,"both semantic replays observed");Check(Count("checkpoint.write")==1&&Count("checkpoint.noWrite")==0,"actual write branch observed");fc::Dump(context);
  const auto after=store.journal.Replay();const auto compact_bytes=std::filesystem::file_size(store.journal.path());Check(after.mutations.size()==before.mutations.size()&&compact_bytes<original_bytes,"record count preserved and journal reduced");unsigned receipts=0;for(std::size_t i=0;i<after.mutations.size();++i){const auto& a=after.mutations[i];const auto& b=before.mutations[i];Check(a.mutation_id==b.mutation_id&&a.entity_id==b.entity_id&&a.occurred_at_ms==b.occurred_at_ms,"mutation identity ordinal"+std::to_string(i));if(a.mutation_type==RecordingMutationType::EventLinkReceipt)++receipts;}Check(receipts==11,"exact11 superseded receipts");
  std::cout<<"[compaction] before_bytes="<<original_bytes<<" after_bytes="<<compact_bytes<<" before_records="<<before.mutations.size()<<" after_records="<<after.mutations.size()<<" receipts="<<receipts<<'\n';
 }
 for(bool sql:{true,false}){RecordingJournal journal(RecordingJournal::ManagedOptions{root,"probe-store"});Check(journal.Open(&error),"reopen journal sql"+std::to_string(sql));auto opts=Store::Options(root);opts.prefer_sqlite=sql;RecordingCatalog catalog(journal,opts);Check(catalog.Open(&error),"reopen catalog sql"+std::to_string(sql));const auto b=catalog.FindSourceBinding(o.segment.segment_id);const auto s=catalog.FindSegmentV2ById(o.segment.segment_id);const auto link=catalog.FindEventLinkByEventId("cost-event");Check(b&&s&&link&&SerializeRecordingSourceBindingV1(*b)==SerializeRecordingSourceBindingV1(o.binding)&&SerializeRecordingSegmentV2(*s)==SerializeRecordingSegmentV2(o.segment)&&SerializeEventRecordingLinkV1(*link)==expected_link,"exact source and latest event recovery sql"+std::to_string(sql));}
 std::cout<<"[summary] FC03 compaction passed="<<passes<<'\n';return 0;
 }catch(const std::exception& e){std::cerr<<"[fail] "<<e.what()<<'\n';return 1;}}

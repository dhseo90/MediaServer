// 파일 용도: 검증 전용: 현행 제품 parser의 bounded 관측 투영. catalog 수용/내구성 판정이 아니다.
#include "recording/recording_journal.h"
#include "recording/recording_contracts.h"
#include "recording/recording_catalog.h"
#include "recording/recording_read_service.h"
#include "recording/recording_runtime_composition.h"
#include "domain/strict_json.h"
#include "recording_media_test_fixture.h"
#include "recording_archive_phase_trace.h"
#include <openssl/evp.h>
#include <iostream>
#include <sstream>
#include <iomanip>
#include <filesystem>
#include <fstream>
#include <memory>
#include <stdexcept>
#include "recording_generation_observation.h"

namespace {
thread_local const char* failure_code="native-observation-invalid";
void Require(bool value,const char* code="native-observation-invalid"){if(!value){failure_code=code;throw std::runtime_error("native-observation-invalid");}}
std::string Quote(const std::string& value){std::ostringstream out;out<<std::quoted(value);return out.str();}
std::string Hash(const std::string& text){unsigned char digest[EVP_MAX_MD_SIZE];unsigned int size=0;
    Require(EVP_Digest(text.data(),text.size(),digest,&size,EVP_sha256(),nullptr)==1&&size==32);
    std::ostringstream out;for(unsigned int i=0;i<size;++i)out<<std::hex<<std::setfill('0')<<std::setw(2)<<unsigned(digest[i]);return out.str();}
std::string Segment(const recording::RecordingSegmentV2& s){
    std::size_t known=0,unknown=0;for(const auto& m:s.mappings){if(m.utc_start_ns&&m.utc_end_ns)++known;else ++unknown;}
    std::ostringstream out;out<<"{\"id\":"<<Quote(s.segment_id)<<",\"channel\":"<<Quote(s.channel_id)
      <<",\"storeHash\":"<<Quote(Hash(s.store_id))<<",\"epochHash\":"<<Quote(Hash(s.media_epoch_id))
      <<",\"order\":"<<Quote(std::to_string(s.order_sequence))<<",\"startPts\":"<<Quote(std::to_string(s.media_start_pts))
      <<",\"endPts\":"<<(s.media_end_pts?Quote(std::to_string(*s.media_end_pts)):"null")
      <<",\"timeBaseNum\":"<<s.time_base_num<<",\"timeBaseDen\":"<<s.time_base_den
      <<",\"continuous\":"<<(s.retention_class==recording::RecordingRetentionClass::Continuous?"true":"false")
      <<",\"sizeBytes\":"<<Quote(std::to_string(s.size_bytes))<<",\"sha256\":"<<Quote(s.checksum_sha256)
      <<",\"metadataHash\":"<<Quote(Hash(recording::SerializeRecordingSegmentV2(s)))
      <<",\"knownMappings\":"<<known<<",\"unknownMappings\":"<<unknown<<'}';return out.str();
}
std::string Normalize(const std::string& raw){
    recording::RecordingMutationV1 m;Require(recording::ParseRecordingMutationV1(raw,&m,nullptr));
    ingress::StrictJsonObjectDocument payload;Require(ingress::ParseStrictJsonObjectDocument(m.payload_json,&payload,nullptr));
    const auto type=recording::RecordingMutationTypeName(m.mutation_type);
    std::string identity=Hash(recording::SerializeRecordingMutationV1(m));
    if(m.mutation_type==recording::RecordingMutationType::EventLinkReceipt)
      identity=ingress::StrictJsonStringField(payload,"originalSha256").value_or("");
    std::ostringstream out;out<<"{\"id\":"<<Quote(m.mutation_id)<<",\"entity\":"<<Quote(m.entity_id)
      <<",\"type\":"<<Quote(type)<<",\"identity\":"<<Quote(identity)<<",\"occurredAtMs\":"<<Quote(std::to_string(m.occurred_at_ms));
    if(m.mutation_type==recording::RecordingMutationType::SegmentV2Finalized||m.mutation_type==recording::RecordingMutationType::SegmentV2BoundFinalized){
      recording::RecordingSegmentV2 s;const auto json=ingress::StrictJsonObjectField(payload,"segment");
      Require(json&&recording::ParseRecordingSegmentV2(*json,&s,nullptr)&&s.segment_id==m.entity_id);
      const auto media=ingress::StrictJsonStringField(payload,"mediaRelpath");Require(media&&!media->empty());
      out<<",\"segment\":"<<Segment(s)<<",\"mediaRelpath\":"<<Quote(*media);
    }else if(m.mutation_type==recording::RecordingMutationType::SegmentV2State){
      recording::RecordingSegmentStateV2 state;Require(recording::ParseRecordingSegmentStateV2(m.payload_json,&state,nullptr));
      out<<",\"state\":"<<Quote(ingress::StrictJsonStringField(payload,"lifecycle").value_or("unknown"));
    }else if(m.mutation_type==recording::RecordingMutationType::SegmentV2Deleted){
      recording::RecordingTombstoneV2 tombstone;Require(recording::ParseRecordingTombstoneV2(m.payload_json,&tombstone,nullptr));
      out<<",\"segment\":"<<Segment(tombstone.segment);
    }
    out<<'}';return out.str();
}
}
int main(int argc,char** argv){try{
    if(argc==4&&std::string(argv[1])=="--observe-generation"){
      const std::string value(argv[3]);Require(!value.empty()&&value.size()<7&&value.find_first_not_of("0123456789")==std::string::npos);
      const auto seen=std::stoull(value);Require(seen<=100000&&std::to_string(seen)==value);
      std::cout<<generation_observation::Observe(argv[2],seen,Normalize)<<'\n';return 0;
    }
    if(argc==4&&std::string(argv[1])=="--generation-fixture"){
      const std::filesystem::path root(argv[2]);Require(root.is_absolute()&&root.parent_path().filename().string().rfind("media-server-current-observer-",0)==0,"fixture-root");
      recording::RecordingRuntimeStorage storage(root);std::string error;Require(storage.Open(&error),"fixture-open");
      if(std::string(argv[3])=="checkpoint")Require(storage.catalog().Checkpoint(&error),"fixture-checkpoint");
      else if(std::string(argv[3])=="batch") {for(int n=1;n<=130;++n){recording::RecordingOrderReservationV1 order;const auto key=std::to_string(n);
        Require(storage.catalog().ReserveRecordingOrder(storage.journal().ManagedStoreId(),"observe-batch-"+key,"segment-batch-"+key,"9101",&order,&error),"fixture-order");}}
      else {const auto key=std::string(argv[3]);Require(key=="one"||key=="two"||key=="three","fixture-key");recording::RecordingOrderReservationV1 order;
        Require(storage.catalog().ReserveRecordingOrder(storage.journal().ManagedStoreId(),"observe-"+key,"segment-"+key,"9101",&order,&error),"fixture-order");}
      std::cout<<"{\"fixture\":true}\n";return 0;
    }
    if(argc==3&&std::string(argv[1])=="--snapshot"){
      const std::filesystem::path root(argv[2]);Require(root.filename()=="recordings"&&std::filesystem::canonical(root)==root&&
        root.parent_path().filename().string().rfind("media-server-current-observer-",0)==0&&std::filesystem::exists(root/".recording-store-format"),"snapshot-input-invalid");
      auto journal_owner=std::make_unique<recording::RecordingJournal>(recording::RecordingJournal::ManagedOptions{root,{},
        {448ULL*1024*1024,448ULL*1024*1024,448ULL*1024*1024,16ULL*1024*1024+1,100000,4096}});auto& journal=*journal_owner;
      std::unique_ptr<recording::RecordingCatalog> catalog_owner;auto teardown=archive_phase::OnExit([&]{archive_phase::Scope scope(archive_phase::Phase::Destruct);catalog_owner.reset();journal_owner.reset();});
      recording::RecordingCatalog::Options options(root/"recording-catalog.sqlite3",root,true);options.enable_v2_storage=true;
      catalog_owner=std::make_unique<recording::RecordingCatalog>(journal,options);auto& catalog=*catalog_owner;std::string error;
      Require(archive_phase::Call(archive_phase::Phase::JournalOpen,[&]{return journal.Open(&error);}),"journal-open");
      Require(archive_phase::Call(archive_phase::Phase::CatalogOpen,[&]{return catalog.Open(&error);}),"catalog-open");
      const auto report=catalog.recovery_report();Require(report.corrupt_line_count==0&&report.projection_error_count==0&&report.writer_cleanup_error_count==0,"recovery-errors");
      recording::RecordingReadService reader(catalog);std::vector<std::string> evidence;std::size_t deleted=0,available=0;
      std::vector<std::pair<std::string,recording::RecordingLocationCatalogSnapshot>> snapshots;
      {archive_phase::Scope query(archive_phase::Phase::Query);for(const auto& channel:{"9101","9201"}){snapshots.emplace_back(channel,recording::RecordingLocationCatalogSnapshot{});Require(catalog.SnapshotLocationsV2(channel,&snapshots.back().second,&error),"query");}}
      {archive_phase::Scope media_scope(archive_phase::Phase::Media);
      for(const auto& [channel,snapshot]:snapshots){
        for(const auto& s:snapshot.segments){const bool removed=catalog.IsDeletedSegmentId(s.segment_id);const auto media=reader.ResolveMedia(channel,s.segment_id);
          Require(removed?!media:bool(media),removed?"deleted-media-visible":"live-media-unavailable");if(removed)++deleted;else ++available;
          evidence.push_back(Segment(s)+(removed?"deleted":"available"));}
        for(const auto& id:snapshot.deleted_segment_ids){Require(catalog.IsDeletedSegmentId(id),"deleted-state-missing");Require(!reader.ResolveMedia(channel,id),"deleted-media-visible");++deleted;evidence.push_back(Hash(id)+"deleted");}
      }}
      std::string digest;{archive_phase::Scope digest_scope(archive_phase::Phase::Digest);std::sort(evidence.begin(),evidence.end());std::string joined;for(const auto& e:evidence)joined+=e+'\n';digest=Hash(joined);}
      {archive_phase::Scope output_scope(archive_phase::Phase::Output);std::cout<<"{\"digest\":"<<Quote(digest)<<",\"segments\":"<<evidence.size()<<",\"deleted\":"<<deleted<<",\"available\":"<<available<<",\"catalogRecovered\":true}"<<'\n';std::cout.flush();Require(bool(std::cout),"output");}return 0;
    }
    if(argc==3&&(std::string(argv[1])=="--fixture"||std::string(argv[1])=="--generation-media-fixture")){
      const std::filesystem::path root(argv[2]);Require(root.filename()=="recordings"&&std::filesystem::canonical(root.parent_path())==root.parent_path()&&
        root.parent_path().filename().string().rfind("media-server-current-observer-",0)==0&&!std::filesystem::exists(root));
      gst_init(nullptr,nullptr);const bool generation=std::string(argv[1])=="--generation-media-fixture";
      std::unique_ptr<Store> legacy;std::unique_ptr<recording::RecordingRuntimeStorage> runtime;std::string error;
      if(generation){runtime=std::make_unique<recording::RecordingRuntimeStorage>(root);Require(runtime->Open(&error));}else legacy=std::make_unique<Store>(root);
      auto& journal=generation?runtime->journal():legacy->journal;auto& catalog=generation?runtime->catalog():legacy->catalog;
      auto input=Encode(30,false,false);Shift(input,0);
      for(const auto& channel:{"9101","9201"}){
        recording::GStreamerSegmentWriter::Options options(root,1000);options.managed_journal=&journal;options.managed_catalog=&catalog;options.managed_store_id=journal.ManagedStoreId();
        recording::GStreamerSegmentWriter writer(options);Require(writer.Start(channel,"unused",input.descriptor,[](auto,auto,auto*){return false;},&error));
        for(const auto& packet:input.packets)writer.Push(packet,0);writer.Stop();
      }
      std::vector<recording::RecordingSegmentV2> segments;
      for(const auto& channel:{"9101","9201"}){recording::RecordingLocationCatalogSnapshot values;Require(catalog.SnapshotLocationsV2(channel,&values,&error));segments.insert(segments.end(),values.segments.begin(),values.segments.end());}
      Require(segments.size()>=4);
      for(const auto& channel:{"9101","9201"}){const auto it=std::find_if(segments.begin(),segments.end(),[&](const auto& s){return s.channel_id==channel;});Require(it!=segments.end());
        const auto location=catalog.FindSegmentMediaLocation(it->segment_id);Require(bool(location)&&catalog.RequestDeletion(it->segment_id,"continuous-capacity",&error));
        Require(std::filesystem::remove(location->first/location->second));
        recording::RecordingTombstoneV2 tombstone;tombstone.tombstone_id=std::string("observer-deleted-")+channel;tombstone.segment=*it;tombstone.deletion_reason="continuous-capacity";tombstone.deleted_at_ms=1;
        Require(catalog.CompleteDeletionV2(tombstone,&error));
      }
      Require(catalog.Checkpoint(&error));
      if(generation){std::cout<<"{\"fixture\":true}\n";return 0;}
      const auto replay=journal.Replay();Require(replay.io_error_count==0&&!replay.mutations.empty());
      std::ifstream physical(journal.path(),std::ios::binary);Require(bool(physical));
      std::cout<<physical.rdbuf();Require(bool(std::cout));return 0;
    }
    Require(argc==2&&std::string(argv[1])=="--normalize");
    std::string line;line.reserve(65536);std::size_t total=0;char c;
    while(std::cin.get(c)){Require(++total<=32*1024*1024);if(c=='\n'){Require(!line.empty());std::cout<<Normalize(line)<<'\n';line.clear();}
      else{Require(line.size()<16*1024*1024);line.push_back(c);}}
    Require(std::cin.eof()&&line.empty());return 0;
}catch(...){std::cerr<<failure_code<<'\n';return 1;}}

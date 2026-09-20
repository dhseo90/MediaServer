// 검증 전용: 현행 제품 parser의 bounded 관측 투영. catalog 수용/내구성 판정이 아니다.
#include "recording/recording_journal.h"
#include "recording/recording_contracts.h"
#include "recording/recording_catalog.h"
#include "recording/recording_read_service.h"
#include "domain/strict_json.h"
#include "recording_media_test_fixture.h"
#include <openssl/evp.h>
#include <iostream>
#include <sstream>
#include <iomanip>
#include <filesystem>
#include <stdexcept>

namespace {
void Require(bool value){if(!value)throw std::runtime_error("native-observation-invalid");}
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
      <<",\"type\":"<<Quote(type)<<",\"identity\":"<<Quote(identity);
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
    if(argc==3&&std::string(argv[1])=="--snapshot"){
      const std::filesystem::path root(argv[2]);Require(root.filename()=="recordings"&&std::filesystem::canonical(root)==root&&
        root.parent_path().filename().string().rfind("media-server-current-observer-",0)==0&&std::filesystem::exists(root/".recording-store-format"));
      recording::RecordingJournal journal(recording::RecordingJournal::ManagedOptions{root,{}});
      recording::RecordingCatalog::Options options(root/"recording-catalog.sqlite3",root,true);options.enable_v2_storage=true;
      recording::RecordingCatalog catalog(journal,options);std::string error;Require(journal.Open(&error)&&catalog.Open(&error));
      const auto report=catalog.recovery_report();Require(report.corrupt_line_count==0&&report.projection_error_count==0&&report.writer_cleanup_error_count==0);
      recording::RecordingReadService reader(catalog);std::vector<std::string> evidence;std::size_t deleted=0,available=0;
      for(const auto& channel:{"9101","9201"}){recording::RecordingLocationCatalogSnapshot snapshot;Require(catalog.SnapshotLocationsV2(channel,&snapshot,&error));
        for(const auto& s:snapshot.segments){const bool removed=catalog.IsDeletedSegmentId(s.segment_id);const auto media=reader.ResolveMedia(channel,s.segment_id);
          Require(removed?!media:bool(media));if(removed)++deleted;else ++available;
          evidence.push_back(Segment(s)+(removed?"deleted":"available"));}
        for(const auto& id:snapshot.deleted_segment_ids){Require(catalog.IsDeletedSegmentId(id)&&!reader.ResolveMedia(channel,id));++deleted;evidence.push_back(Hash(id)+"deleted");}
      }
      std::sort(evidence.begin(),evidence.end());std::string joined;for(const auto& e:evidence)joined+=e+'\n';
      std::cout<<"{\"digest\":"<<Quote(Hash(joined))<<",\"segments\":"<<evidence.size()<<",\"deleted\":"<<deleted<<",\"available\":"<<available<<",\"catalogRecovered\":true}"<<'\n';return 0;
    }
    if(argc==3&&std::string(argv[1])=="--fixture"){
      const std::filesystem::path root(argv[2]);Require(root.filename()=="recordings"&&std::filesystem::canonical(root.parent_path())==root.parent_path()&&
        root.parent_path().filename().string().rfind("media-server-current-observer-",0)==0&&!std::filesystem::exists(root));
      gst_init(nullptr,nullptr);Store store(root);auto input=Encode(30,false,false);Shift(input,0);std::string error;
      for(const auto& channel:{"9101","9201"}){
        recording::GStreamerSegmentWriter::Options options(root,1000);options.managed_journal=&store.journal;options.managed_catalog=&store.catalog;options.managed_store_id="probe-store";
        recording::GStreamerSegmentWriter writer(options);Require(writer.Start(channel,"unused",input.descriptor,[](auto,auto,auto*){return false;},&error));
        for(const auto& packet:input.packets)writer.Push(packet,0);writer.Stop();
      }
      const auto segments=store.Segments();Require(segments.size()>=4);
      for(const auto& channel:{"9101","9201"}){const auto it=std::find_if(segments.begin(),segments.end(),[&](const auto& s){return s.channel_id==channel;});Require(it!=segments.end());
        const auto location=store.catalog.FindSegmentMediaLocation(it->segment_id);Require(bool(location)&&store.catalog.RequestDeletion(it->segment_id,"continuous-capacity",&error));
        Require(std::filesystem::remove(location->first/location->second));
        recording::RecordingTombstoneV2 tombstone;tombstone.tombstone_id=std::string("observer-deleted-")+channel;tombstone.segment=*it;tombstone.deletion_reason="continuous-capacity";tombstone.deleted_at_ms=1;
        Require(store.catalog.CompleteDeletionV2(tombstone,&error));
      }
      const auto replay=store.journal.Replay();Require(replay.io_error_count==0&&!replay.mutations.empty());
      for(const auto& m:replay.mutations)std::cout<<recording::SerializeRecordingMutationV1(m)<<'\n';return 0;
    }
    Require(argc==2&&std::string(argv[1])=="--normalize");
    std::string line;line.reserve(65536);std::size_t total=0;char c;
    while(std::cin.get(c)){Require(++total<=32*1024*1024);if(c=='\n'){Require(!line.empty());std::cout<<Normalize(line)<<'\n';line.clear();}
      else{Require(line.size()<16*1024*1024);line.push_back(c);}}
    Require(std::cin.eof()&&line.empty());return 0;
}catch(...){std::cerr<<"native-observation-invalid\n";return 1;}}

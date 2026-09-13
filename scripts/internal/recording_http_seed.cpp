// 파일 용도: HTTP 검증 소유 root에 실제 V2 원본/파생 출력을 준비한다. 운영 root는 사용하지 않는다.
#include "recording_media_test_fixture.h"
#include "recording/recording_derived_job_service.h"
#include "recording/recording_derived_selection.h"
#include <fstream>
#include <iomanip>
#include <sstream>
#include <fcntl.h>
#include <unistd.h>
#include <openssl/evp.h>
std::string Hash(const std::filesystem::path& path){
    std::ifstream input(path,std::ios::binary);auto* ctx=EVP_MD_CTX_new();
    if(!input||!ctx||EVP_DigestInit_ex(ctx,EVP_sha256(),nullptr)!=1)throw std::runtime_error("hash-init");
    char bytes[65536];while(input){input.read(bytes,sizeof(bytes));if(input.gcount()>0&&EVP_DigestUpdate(ctx,bytes,input.gcount())!=1)throw std::runtime_error("hash-update");}
    unsigned char digest[EVP_MAX_MD_SIZE];unsigned size=0;if(!input.eof()||EVP_DigestFinal_ex(ctx,digest,&size)!=1)throw std::runtime_error("hash-final");EVP_MD_CTX_free(ctx);
    std::ostringstream out;for(unsigned i=0;i<size;++i)out<<std::hex<<std::setfill('0')<<std::setw(2)<<unsigned(digest[i]);return out.str();
}
void ManifestFile(std::ostream& out,Store& store,const recording::RecordingSegmentV2& segment){
    const auto location=store.catalog.FindSegmentMediaLocation(segment.segment_id);
    if(!location||location->first!=store.root)throw std::runtime_error("manifest-location");
    out<<"{\"id\":"<<std::quoted(segment.segment_id)<<",\"relativePath\":"<<std::quoted(location->second.string())
        <<",\"sizeBytes\":"<<segment.size_bytes<<",\"sha256\":"<<std::quoted(segment.checksum_sha256)
        <<",\"contentType\":"<<std::quoted(segment.container=="mpegts"?"video/mp2t":"video/mp4")<<"}";
}
int main(int argc,char** argv){
    if(argc!=4)return 2;gst_init(nullptr,nullptr);
    try{
        const std::filesystem::path root(argv[1]),manifest(argv[2]);
        const auto parent=std::filesystem::canonical(root.parent_path());const auto name=parent.filename().string();
        if(root.filename()!="recordings"||root.parent_path()!=parent||manifest.parent_path()!=parent||
           (name.rfind("media-server-v410-s06-",0)!=0&&name.rfind("media-server-http-seed.",0)!=0)||
           (std::filesystem::exists(root)&&(!std::filesystem::is_directory(root)||std::filesystem::is_symlink(root)||!std::filesystem::is_empty(root)))||
           std::filesystem::exists(manifest)||(std::string(argv[3])!="0"&&std::string(argv[3])!="1"))throw std::runtime_error("seed-owned-root");
        Store store(root);auto input=Encode(30,false,false);Shift(input,7000000000ULL);std::string error;
        recording::GStreamerSegmentWriter::Options options(root,1000);options.managed_journal=&store.journal;
        options.managed_catalog=&store.catalog;options.managed_store_id="probe-store";
        recording::GStreamerSegmentWriter writer(options);
        if(!writer.Start("1","unused",input.descriptor,[](auto,auto,auto*){return false;},&error))throw std::runtime_error(error);
        for(const auto& packet:input.packets)writer.Push(packet,0);writer.Stop();
        const auto originals=store.Segments();std::vector<recording::DerivedSourceEvidence> sources;
        for(const auto& source:originals)sources.push_back({source,store.catalog.FindSourceBinding(source.segment_id),false});
        analysis::DecodedIntervalCollector collector;
        for(const auto& packet:input.packets){analysis::DecodedIntervalEvidence item;item.analysis_pts_ns=packet.pts;item.duration_ns=packet.observation->duration_ns;
            item.association={analysis::SourceAssociationQuality::TimestampMatch,analysis::OriginalSampleIdentity{packet.observation->source_generation,
                packet.observation->generation_order,packet.observation->ordinal,packet.track_id,*packet.observation->pts_ns}};collector.Append(std::move(item));}
        recording::RecordingConsumerReferenceV1 reference;reference.reference_id="http-reference";reference.kind="event";reference.owner_id="http-event-id";
        reference.source_id="1";reference.channel_id="1";reference.analysis_namespace="http-evidence-ns";reference.analysis_track_id="track-1";
        reference.association_quality="timestamp-match";reference.original=recording::RecordingConsumerOriginalV1{"probe-generation-a",1,1,"video-0",7000000000ULL};
        reference.request=recording::RecordingConsumerRequestV1{"media-pts-ms",7000,8500,0,0};
        recording::DerivedRecordingSelection selected;recording::DerivedJobIntentV1 intent;
        if(!recording::SelectDerivedRecording(reference,*collector.Snapshot(reference.analysis_namespace),sources,nullptr,&selected,&error)||
           !recording::BuildDerivedJobIntent(selected,sources,8*1024*1024,10,&intent,&error))throw std::runtime_error(error);
        recording::RetentionCoordinator retention(store.catalog,[&]{return store.catalog.RetentionSnapshot();},[](auto* bytes,auto*){*bytes=1024ULL*1024*1024;return true;},[](const auto&,auto*){return false;},{0,1,root});
        if(!retention.UpdateChannelPolicy("1",{1024ULL*1024*1024,0,1024ULL*1024*1024,0},&error)||
           !retention.AdmitDerivedJob(store.catalog,intent,10).accepted)throw std::runtime_error("seed-intent-admission");
        recording::DerivedJobService service(store.catalog,store.journal,{root,30000,{}});const auto result=service.Run(intent.job_id);
        if(!result.complete||!result.job||!result.job->ready||result.job->ready->outputs.size()!=2)throw std::runtime_error("seed-job-incomplete");
        auto pending=reference;pending.reference_id="http-accepted-only";pending.owner_id="http-pending-event";
        if(!store.catalog.PutConsumerReference(pending,&error)||!store.catalog.AcceptDerivedReference(pending,&error))throw std::runtime_error(error);
        std::optional<recording::RecordingSegmentV2> transport;
        if(std::string(argv[3])=="1"){
            auto segment=originals.front();const auto old=*store.catalog.FindSegmentMediaLocation(segment.segment_id);
            segment.segment_id="http-transport-continuous";segment.order_request_id="http-transport-order";segment.media_epoch_id="http-transport-epoch";
            recording::RecordingOrderReservationV1 order;
            if(!store.journal.ReserveRecordingOrder(segment.store_id,segment.order_request_id,segment.segment_id,"1",&order,&error))throw std::runtime_error(error);
            segment.order_sequence=order.sequence;const auto file=root/"1"/"http-transport-continuous.mp4";
            std::filesystem::copy_file(old.first/old.second,file);
            const std::uint64_t target=64ULL*1024*1024,original=std::filesystem::file_size(file),free_size=target-original;
            if(free_size<8||free_size>0xffffffffULL)throw std::runtime_error("free-atom-size");
            std::ofstream padded(file,std::ios::binary|std::ios::app);const char header[]={char(free_size>>24),char(free_size>>16),char(free_size>>8),char(free_size),'f','r','e','e'};
            padded.write(header,8);char zeros[65536]{};
            for(std::uint64_t remaining=free_size-8;remaining;){const auto count=std::min<std::uint64_t>(remaining,sizeof(zeros));padded.write(zeros,count);remaining-=count;}
            padded.close();if(!padded)throw std::runtime_error("free-atom-write");
            segment.size_bytes=std::filesystem::file_size(file);segment.checksum_sha256=Hash(file);
            if(!store.catalog.FinalizeSegmentV2(segment,file.string(),&error))throw std::runtime_error(error);transport=segment;
        }
        recording::RecordingReadService reader(store.catalog);
        for(const auto& output:result.job->ready->outputs)if(!reader.ResolveMedia("1",output.segment.segment_id))throw std::runtime_error("seed-output-physical");
        if(transport&&!reader.ResolveMedia("1",transport->segment_id))throw std::runtime_error("seed-transport-physical");
        std::ostringstream json;json<<"{\"schema\":\"recording-http-fixture.v1\",\"channelId\":\"1\",\"startTimeMs\":\"1789200000000\",\"endTimeMs\":\"1789200003000\",\"jobId\":"<<std::quoted(intent.job_id)<<",\"outputs\":[";
        for(std::size_t i=0;i<result.job->ready->outputs.size();++i){if(i)json<<',';ManifestFile(json,store,result.job->ready->outputs[i].segment);}json<<"],\"transport\":";
        if(transport)ManifestFile(json,store,*transport);else json<<"null";json<<"}";
        const int fd=::open(manifest.c_str(),O_WRONLY|O_CREAT|O_EXCL|O_NOFOLLOW,0600);if(fd<0)throw std::runtime_error("manifest-create");
        const auto text=json.str();const auto wrote=::write(fd,text.data(),text.size());const int synced=::fsync(fd);::close(fd);
        if(wrote!=static_cast<ssize_t>(text.size())||synced)throw std::runtime_error("manifest-write");
        std::cout<<"[pass] D3D-01 actual managed 원본과 jobComplete2출력·physical 검증\n";
        if(transport)std::cout<<"[pass] D3D-07 valid MP4 free atom64MiB·최종 physical/hash 검증\n";
        return 0;
    }catch(const std::exception& error){std::cerr<<"[fail] HTTP seed: "<<error.what()<<'\n';return 1;}
}

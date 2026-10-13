// 파일 용도: 고정된 종료 원본의 실제 timeline 소비 경로 비용 대조. HTTP gate와 별개다.
#include "recording/recording_runtime_composition.h"
#include "recording/recording_read_service.h"
#include "recording/recording_latency_trace.h"
#include "recording_writer_test_isolation.h"
#include <iostream>
#include <chrono>
#include <openssl/evp.h>
#include <sstream>
#include <iomanip>
using namespace recording;
int main(int argc,char** argv){
    if(argc!=2||!RecordingWriterTestIsolation(argv[1]))return 2;
    try {
        RecordingRuntimeStorage storage(std::filesystem::path(argv[1])/"recording");std::string error;
        if(!storage.Open(&error))throw std::runtime_error(error);
        RecordingReadService service(storage.catalog());
        // Public full timeline for both channels, fixed order and no warmup.
        // The private event-only consumer is exercised by the real HTTP fixture.
        for(const char* channel:{"9101","9201"})for(unsigned i=0;i<3;++i){
            const auto begin=std::chrono::steady_clock::now();const auto reads=latency::history_node_reads;
            RecordingTimelineResult result;
            const bool ok=service.QuerySearchTimeline(channel,1791800000000LL,1791900000000LL,&result,&error);
            const auto elapsed=std::chrono::duration_cast<std::chrono::nanoseconds>(std::chrono::steady_clock::now()-begin).count();
            if(!ok)throw std::runtime_error(error);
            std::cout<<"[timeline-cost] {\"eventsOnly\":"<<"false"<<",\"channel\":\""<<channel<<"\",\"iteration\":"<<i
                <<",\"elapsedNs\":"<<elapsed<<",\"nodeReads\":"<<latency::history_node_reads-reads<<",\"total\":"<<result.total
                <<",\"unplacedTotal\":"<<result.unplaced_total<<",\"items\":"<<result.items.size()<<",\"unplaced\":"<<result.unplaced_items.size()
                <<",\"ramUsed\":"<<storage.catalog().SearchResidency()->used()<<"}\n";
            // Stable identities/order are an additional cross-binary oracle, not
            // a substitute for the existing field/permission/seek regressions.
            std::unique_ptr<EVP_MD_CTX,decltype(&EVP_MD_CTX_free)> digest(EVP_MD_CTX_new(),EVP_MD_CTX_free);
            if(!digest||EVP_DigestInit_ex(digest.get(),EVP_sha256(),nullptr)!=1)throw std::runtime_error("digest-init");
            for(const auto* rows:{&result.items,&result.unplaced_items})for(const auto& row:*rows){
                std::ostringstream line;line<<row.item_id<<' '<<row.segment_id<<' '<<row.catalog_state<<' '
                    <<row.playable<<' '<<row.unplaced<<' '<<row.start_ms<<' '<<row.end_ms<<'\n';
                const auto bytes=line.str();if(EVP_DigestUpdate(digest.get(),bytes.data(),bytes.size())!=1)throw std::runtime_error("digest-update");
            }
            unsigned char hash[32];unsigned length=0;
            if(EVP_DigestFinal_ex(digest.get(),hash,&length)!=1||length!=32)throw std::runtime_error("digest-final");
            std::ostringstream hex;for(auto byte:hash)hex<<std::hex<<std::setw(2)<<std::setfill('0')<<unsigned(byte);
            std::cout<<"[timeline-digest] "<<channel<<' '<<i<<' '<<hex.str()<<'\n';
        }
        if(!storage.Finish(&error))throw std::runtime_error(error);
        std::cout<<"[finish] true\n";return 0;
    }catch(const std::exception& e){std::cerr<<"[fail] "<<e.what()<<'\n';return 1;}
}

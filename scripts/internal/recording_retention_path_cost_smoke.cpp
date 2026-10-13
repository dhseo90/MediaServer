// 파일 용도: 닫힌 혼합 원본의 소유 복제본에서 실제 retention 조회 비용/결과를 비교한다.
#include "recording/recording_runtime_composition.h"
#include "recording/recording_latency_trace.h"
#include "recording_writer_test_isolation.h"
#include <openssl/evp.h>
#include <chrono>
#include <iostream>
#include <iomanip>
#include <sstream>
#include <sys/resource.h>
using namespace recording;
std::string Digest(const RetentionSnapshot& snapshot,const std::filesystem::path& root) {
    std::unique_ptr<EVP_MD_CTX,decltype(&EVP_MD_CTX_free)> ctx(EVP_MD_CTX_new(),EVP_MD_CTX_free);
    if(!ctx||EVP_DigestInit_ex(ctx.get(),EVP_sha256(),nullptr)!=1)throw std::runtime_error("digest-init");
    for(const auto& c:snapshot.candidates){
        const auto row=(c.segment_v2?SerializeRecordingSegmentV2(*c.segment_v2):SerializeRecordingSegmentV1(c.segment))+"|"+
            c.media_path.lexically_relative(root).generic_string()+"|"+std::to_string(c.hold_count)+"|"+
            std::to_string(static_cast<unsigned>(c.effective_lifecycle))+"|"+c.deletion_reason+"\n";
        if(EVP_DigestUpdate(ctx.get(),row.data(),row.size())!=1)throw std::runtime_error("digest-update");
    }
    unsigned char hash[32];unsigned size=0;if(EVP_DigestFinal_ex(ctx.get(),hash,&size)!=1||size!=32)throw std::runtime_error("digest-final");
    std::ostringstream out;for(auto b:hash)out<<std::hex<<std::setw(2)<<std::setfill('0')<<unsigned(b);return out.str();
}
int main(int argc,char** argv){
    if(argc!=2||!RecordingWriterTestIsolation(argv[1]))return 2;
    try {
        const auto root=std::filesystem::path(argv[1])/"recording";std::string error;
        RecordingRuntimeStorage storage(root);if(!storage.Open(&error))throw std::runtime_error("open:"+error);
        auto& catalog=storage.catalog();auto all=catalog.RetentionSnapshot();if(!all.authoritative)throw std::runtime_error("all:"+all.error);
        for(const auto* channel:{"9101","9201"}){
            RetentionSnapshot expected;for(const auto& c:all.candidates)if(c.Channel()==channel)expected.candidates.push_back(c);
            const auto digest=Digest(expected,root); // same-run All consistency only; independent equality is frozen before/after digest
            for(unsigned i=0;i<3;++i){
                // Diagnostic fixture request, not an HTTP latency result. Keeps
                // the first three actual Catalog holder intervals for subcosts.
                latency::VisualRequestSummary diagnostic_request;
                const auto decode=latency::segment_decode_cost;
                const auto reads=latency::history_node_reads;const auto begin=std::chrono::steady_clock::now();
                auto actual=catalog.RetentionSnapshot(RetentionSnapshotSelection::Channel,channel);
                const auto elapsed=std::chrono::duration_cast<std::chrono::nanoseconds>(std::chrono::steady_clock::now()-begin).count();
                if(!actual.authoritative||Digest(actual,root)!=digest)throw std::runtime_error("channel-result-mismatch");
                latency::VisualRequestSummary::Result(200,"ok");
                std::cout<<"[retention-path-cost] {\"channel\":\""<<channel<<"\",\"iteration\":"<<i<<",\"rows\":"<<actual.candidates.size()
                    <<",\"elapsedNs\":"<<elapsed<<",\"nodeReads\":"<<latency::history_node_reads-reads<<",\"digest\":\""<<digest<<"\",\"ramUsed\":"<<catalog.SearchResidency()->used()<<",\"decode\":[";
                for(unsigned n=0;n<4;++n)std::cout<<(n?",":"")<<latency::segment_decode_cost[n]-decode[n];
                std::cout<<"]}\n";
            }
        }
        all={};if(!storage.Finish(&error))throw std::runtime_error("finish:"+error);std::cout<<"[finish] true\n";return 0;
    }catch(const std::exception& e){std::cerr<<"[fail] "<<e.what()<<'\n';return 1;}
}

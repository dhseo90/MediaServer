// 파일 용도: 보존된 닫힌 혼합 자료의 별도 복사본에서 source 읽기 하위 비용을 분해한다.
#include "recording/recording_runtime_composition.h"
#include "recording/recording_visual_source.h"
#include "recording/recording_latency_trace.h"
#include "recording_writer_test_isolation.h"
#include <iostream>
#include <chrono>
using namespace recording;
int main(int argc,char** argv){
 if((argc!=2&&argc!=3)||!RecordingWriterTestIsolation(argv[1]))return 2;
 try {
  std::string error;RecordingRuntimeStorage runtime(std::filesystem::path(argv[1])/"recording");
  if(!runtime.Open(&error))throw std::runtime_error("open:"+error);
  auto& catalog=runtime.catalog();RecordingReadService reader(catalog);RecordingVisualSource source(catalog,reader);
  std::unique_ptr<analysis::Siglip2Encoder> encoder;if(argc==3)encoder=std::make_unique<analysis::Siglip2Encoder>(argv[2]);
  for(unsigned round=0;round<(encoder?1U:3U);++round){
   std::vector<VisualSearchDocument> docs;std::map<std::string,VisualSourceCoverage> coverage;
   {
    latency::WorkScope work(latency::Work::Index);latency::VisualRequestSummary diagnostic;
    if(!source.Collect({"9101","9201"},1,&docs,&coverage,&error))throw std::runtime_error("collect:"+error);
    latency::VisualRequestSummary::Result(200,"ok");
    std::cout<<"[source-read-cost] round="<<round<<" phase=collect documents="<<docs.size()<<" ram="<<catalog.SearchResidency()->used()<<std::endl;
   }
   if(encoder){
    for(unsigned encode_round=0;encode_round<3;++encode_round){auto doc=docs.front();const auto begin=std::chrono::steady_clock::now();
    if(!source.Encode(&doc,*encoder,&error))throw std::runtime_error("encode:"+error);
    std::cout<<"[source-encode-cost] round="<<encode_round<<" elapsedMs="<<std::chrono::duration<double,std::milli>(std::chrono::steady_clock::now()-begin).count()<<std::endl;
    }
    continue;
   }
   {
    latency::WorkScope work(latency::Work::Visual);latency::VisualRequestSummary diagnostic;
    unsigned resolved=0;std::string prior;std::unique_ptr<RecordingVisualSource::PreparedSource> prepared;
    const auto deadline=std::chrono::steady_clock::now()+std::chrono::seconds(5);
    for(const auto& doc:docs){if(resolved==20)break;
     if(doc.segment_id!=prior){prepared=source.Prepare(doc,&error,{},deadline);prior=doc.segment_id;}
     SearchSeekTarget target;if(!prepared||!source.ResolvePrepared(doc,*prepared,&target,&error,{},deadline))throw std::runtime_error("resolve:"+error);
     ++resolved;
    }
    latency::VisualRequestSummary::Result(200,"ok");
    std::cout<<"[source-read-cost] round="<<round<<" phase=resolve completed="<<resolved<<" ram="<<catalog.SearchResidency()->used()<<std::endl;
   }
  }
  if(!runtime.Finish(&error))throw std::runtime_error("finish:"+error);
  std::cout<<"[finish] true\n";return 0;
 }catch(const std::exception& error){std::cerr<<"[fail] "<<error.what()<<std::endl;return 1;}
}

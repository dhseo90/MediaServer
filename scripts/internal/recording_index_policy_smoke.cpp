// 실제 누적 source의 같은 순서를 한 프로세스에서 정책별 한 번씩 읽는 제한 대조.
#include "recording_writer_test_isolation.h"
#include "recording/recording_runtime_composition.h"
#include "recording/recording_visual_source.h"
#include "recording/visual_frame_decoder.h"
#include "recording/evidence_frame_extractor.h"
#include <gst/gst.h>
#include <iostream>
#include <cmath>
#include <chrono>
int main(int argc,char**argv){try{
 if(argc!=2||!RecordingWriterTestIsolation(argv[1]))return 2;gst_init(nullptr,nullptr);
 recording::RecordingRuntimeStorage runtime(std::filesystem::path(argv[1])/"recording");std::string error;
 if(!runtime.Open(&error))throw std::runtime_error(error);
 recording::RecordingReadService reader(runtime.catalog());recording::RecordingVisualSource source(runtime.catalog(),reader);
 std::vector<recording::VisualSearchDocument> docs;std::map<std::string,recording::VisualSourceCoverage> coverage;
 if(!source.Collect({"9101","9201"},1,&docs,&coverage,&error))throw std::runtime_error(error);
 const auto start=std::chrono::steady_clock::now();unsigned counts[2]{},failures[2]{};
 for(unsigned policy=0;policy<2;++policy)for(std::size_t i=0;i<docs.size();++i){const auto& d=docs[i];
  const bool historical=d.segment_id=="d97a90bc-b393-4a70-8a45-8044cde110f7"||d.segment_id=="c29c6958-aac4-4c67-9909-b235339005d4"||d.segment_id=="fbb3074b-9328-4b87-bb5e-313e1805b5f3";
  if(i>=320&&!historical)continue;
  const auto cancel=[&]{return std::chrono::steady_clock::now()-start>std::chrono::seconds(180);};
  if(cancel())throw std::runtime_error("comparison-total-deadline");
  recording::SearchSeekTarget seek;std::unique_ptr<recording::ResolvedRecordingMedia> held;
  if(!source.Resolve(d,&seek,&held,&error,cancel))throw std::runtime_error(error);
  const auto ns=std::llround(seek.seconds*1e9);const auto before=std::chrono::steady_clock::now();
  recording::VisualRgbFrame frame;const bool ok=recording::DecodeVisualFrame(held->fd(),held->size_bytes(),ns,&frame,&error,cancel,5000,policy?recording::VisualDecodePolicy::SoftwareOnly:recording::VisualDecodePolicy::Automatic);
  ++counts[policy];if(!ok)++failures[policy];
  std::cout<<"{\"policy\":"<<policy<<",\"row\":"<<i+1<<",\"segment\":\""<<d.segment_id<<"\",\"fileHash\":\""<<d.media_sha256<<"\",\"auHash\":\""<<d.frame_sha256<<"\",\"target\":"<<ns<<",\"ok\":"<<ok<<",\"actual\":"<<frame.presentation_ns<<",\"width\":"<<frame.width<<",\"height\":"<<frame.height<<",\"rgbHash\":\""<<recording::EvidenceSha256(frame.rgb.data(),frame.rgb.size())<<"\",\"us\":"<<std::chrono::duration_cast<std::chrono::microseconds>(std::chrono::steady_clock::now()-before).count()<<",\"error\":\""<<error<<"\"}\n";
 }
 if(!runtime.Finish(&error))throw std::runtime_error(error);
 std::cout<<"comparison-complete calls="<<counts[0]<<","<<counts[1]<<" failures="<<failures[0]<<","<<failures[1]<<" explicitFinish=1\n";
 return 0;
}catch(const std::exception& e){std::cerr<<"comparison-failed "<<e.what()<<'\n';return 1;}}

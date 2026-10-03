// 파일 용도: 제품 writer의 실제 sample 증명→대표 frame→현재 재생/디코딩 연결.
#include "recording_media_test_fixture.h"
#include "recording/recording_visual_source.h"
#include "recording/visual_frame_decoder.h"
#include "recording/recording_runtime_composition.h"
#include <iostream>
#include <cmath>
#include <sys/resource.h>
namespace{int checks=0;void Check(bool b,const std::string& name){++checks;if(!b)throw std::runtime_error(name);}}
int main(int argc,char**argv){try{
    if(argc!=2&&argc!=3)return 2;gst_init(nullptr,nullptr);const auto root=std::filesystem::weakly_canonical(argv[1]);
    recording::RecordingRuntimeStorage runtime(root);std::string error;Check(runtime.Open(&error),"B storage open");
    auto input=Encode(90,false,false,160,90,30,30);Shift(input,7000000000ULL);
    recording::GStreamerSegmentWriter writer(runtime.WriterOptions(1000));
    Check(writer.Start("visual-channel","unused",input.descriptor,[](auto,auto,auto*){return false;},&error),"writer start");
    for(const auto& packet:input.packets)writer.Push(packet,0);writer.Stop();
    recording::RecordingReadService reader(runtime.catalog());recording::RecordingVisualSource source(runtime.catalog(),reader);
    std::vector<recording::VisualSearchDocument> docs;std::map<std::string,recording::VisualSourceCoverage> coverage;
    Check(source.Collect({"visual-channel"},1,&docs,&coverage,&error),"collect: "+error);
    Check(docs.size()==3&&coverage.at("visual-channel").examined_segments==3&&coverage.at("visual-channel").unsupported_segments==0,"three complete representative frames");
    for(const auto& doc:docs){
        Check(doc.media_pts>=7000000000LL&&doc.time_base_num==1&&doc.time_base_den==1000000000,"original PTS retained");
        recording::SearchSeekTarget seek;std::unique_ptr<recording::ResolvedRecordingMedia> media;
        Check(source.Resolve(doc,&seek,&media,&error),"resolve: "+error);
        Check(seek.seconds>=0&&seek.seconds<.04&&seek.basis=="verified-native-file-presentation","file clock differs from original");
        recording::VisualRgbFrame rgb;
        Check(recording::DecodeVisualFrame(media->fd(),media->size_bytes(),std::llround(seek.seconds*1e9),&rgb,&error),"decode bound source: "+error);
        Check(rgb.width==160&&rgb.height==90&&rgb.rgb.size()==160*90*3,"actual RGB source frame");
        auto altered=doc;altered.media_sha256=std::string(64,'f');Check(!source.Resolve(altered,&seek,&media,&error),"changed media hash denied");
        altered=doc;altered.frame_sha256=std::string(64,'f');Check(!source.Resolve(altered,&seek,&media,&error),"changed AU hash denied");
        altered=doc;altered.channel_id="other";Check(!source.Resolve(altered,&seek,&media,&error),"wrong channel denied");
        auto segment=*runtime.catalog().FindSegmentV2ById(doc.segment_id);auto binding=*runtime.catalog().FindSourceBinding(doc.segment_id);
        for(auto& mapping:segment.mappings){mapping.provenance="unknown";mapping.utc_start_ns.reset();mapping.utc_end_ns.reset();mapping.uncertainty_ns.reset();mapping.reason="fixture-unknown";}std::vector<recording::VisualSearchDocument> unmapped;
        Check(recording::RecordingVisualSource::SelectSamples(segment,binding,1,&unmapped,&error)&&!unmapped.front().utc_ns,"unknown UTC remains absent");
        binding.file_evidence.reset();Check(!recording::RecordingVisualSource::SelectSamples(segment,binding,1,&unmapped,&error),"missing evidence unsupported");
    }
    std::vector<recording::VisualSearchDocument> sparse;
    Check(source.Collect({"visual-channel"},10,&sparse,&coverage,&error)&&sparse.size()==1,"sample period spans file boundaries in the same epoch");
    Check(!source.Collect({"visual-channel"},0,&docs,&coverage,&error),"invalid period");
    Check(!source.Collect({"visual-channel"},1,&docs,&coverage,&error,[]{return true;}),"cancel collection");
    const auto id=docs.front().segment_id;Check(runtime.catalog().MarkSegmentCorrupt(id,"container-invalid",&error),"corrupt current original");
    recording::SearchSeekTarget seek;std::unique_ptr<recording::ResolvedRecordingMedia> media;
    Check(!source.Resolve(docs.front(),&seek,&media,&error),"current unavailable cannot replay old index");
    Check(source.Collect({"visual-channel"},1,&docs,&coverage,&error)&&docs.size()==2,"current unavailable leaves new index");
    const auto retiring=docs.front();Check(source.Resolve(retiring,&seek,&media,&error),"hold current source");
    Check(!runtime.catalog().RequestDeletion(retiring.segment_id,"continuous-capacity",&error),"index frame lease preserves retention guard");
    media.reset();Check(runtime.catalog().RequestDeletion(retiring.segment_id,"continuous-capacity",&error),"retention allowed after lease release");
    Check(!source.Resolve(retiring,&seek,&media,&error),"pending deletion rejects prior index reference");
    Check(source.Collect({"visual-channel"},1,&docs,&coverage,&error)&&docs.size()==1,"pending deletion excluded on rebuild");
    if(argc==3){
        analysis::Siglip2Encoder encoder(argv[2]);auto actual=docs.front();
        Check(source.Encode(&actual,encoder,&error),"actual source RGB to embedding");
        double norm=0;for(float value:actual.embedding){Check(std::isfinite(value),"finite actual source embedding");norm+=double(value)*value;}
        Check(actual.embedding.size()==768&&std::abs(norm-1)<1e-5,"actual source embedding contract");
        struct rusage usage{};Check(::getrusage(RUSAGE_SELF,&usage)==0,"resource observation");
        std::uint64_t rss=usage.ru_maxrss;
#ifndef __APPLE__
        rss*=1024;
#endif
        Check(rss<=4ULL*1024*1024*1024,"actual source process RSS budget");
        std::cout<<"[source-model] peakRssBytes="<<rss<<" originalPts="<<actual.media_pts<<" dimension="<<actual.embedding.size()<<"\n";
    }
    std::cout<<"PASS recording visual source checks="<<checks<<"\n";return 0;
}catch(const std::exception& e){std::cerr<<"FAIL "<<e.what()<<" checks="<<checks<<"\n";return 1;}}

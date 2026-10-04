#include "recording_media_test_fixture.h"
#include "recording/recording_runtime_composition.h"
#include "recording/recording_visual_source.h"
#include "analysis/siglip2_encoder.h"
#include <iostream>
#include <cmath>
#include "recording_process_memory_probe.h"

#include <malloc/malloc.h>
#include <mach/mach.h>
void Memory(const char* phase,unsigned queries){
    recording_memory_probe::Sample rss; if(!recording_memory_probe::Read(&rss))throw std::runtime_error("memory-observation");
    vm_address_t* zones=nullptr;unsigned count=0;
    if(malloc_get_all_zones(mach_task_self(),nullptr,&zones,&count)!=KERN_SUCCESS)throw std::runtime_error("heap-zones");
    std::size_t used=0,reserved=0,blocks=0;
    for(unsigned i=0;i<count;++i){malloc_statistics_t stats{};malloc_zone_statistics(reinterpret_cast<malloc_zone_t*>(zones[i]),&stats);used+=stats.size_in_use;reserved+=stats.size_allocated;blocks+=stats.blocks_in_use;}
    std::cout<<"[fixed-memory] {\"phase\":\""<<phase<<"\",\"queries\":"<<queries<<",\"rssBytes\":"<<rss.current<<",\"peakRssBytes\":"<<rss.peak<<",\"heapUsedBytes\":"<<used<<",\"heapReservedBytes\":"<<reserved<<",\"blocks\":"<<blocks<<",\"zones\":"<<count<<"}"<<std::endl;
}

void Need(bool ok,const std::string& error){if(!ok)throw std::runtime_error(error);}
int main(int argc,char** argv){try{
 if(argc!=3)return 2;gst_init(nullptr,nullptr);auto root=std::filesystem::weakly_canonical(argv[1]);
 auto input=Encode(90,false,false,160,90,30,30);Shift(input,7000000000ULL);
 recording::RecordingRuntimeStorage runtime(root);std::string error;Need(runtime.Open(&error),error);
 {recording::GStreamerSegmentWriter writer(runtime.WriterOptions(1000));Need(writer.Start("decode","unused",input.descriptor,[](auto,auto,auto*){return false;},&error),error);for(const auto& p:input.packets)writer.Push(p,0);writer.Stop();}
 recording::RecordingReadService reader(runtime.catalog());recording::RecordingVisualSource source(runtime.catalog(),reader);
 std::vector<recording::VisualSearchDocument> docs;std::map<std::string,recording::VisualSourceCoverage> coverage;
 Need(source.Collect({"decode"},1,&docs,&coverage,&error)&&docs.size()==3,"three original frames");
 Memory("source-ready",0);
 {analysis::Siglip2Encoder encoder(argv[2]);Memory("encoder-loaded",0);
 for(unsigned i=1;i<=100;++i){
 {auto doc=docs[(i-1)%docs.size()];Need(doc.embedding.empty(),"uncached document");Need(source.Encode(&doc,encoder,&error),error);
 double norm=0;for(float v:doc.embedding){Need(std::isfinite(v),"finite embedding");norm+=double(v)*v;}Need(doc.embedding.size()==768&&std::abs(norm-1)<1e-5,"normalized768");}
 if(i==1||i==5||i==10||i%25==0)Memory("decoded-result-released",i);
 }
 }Memory("encoder-destroyed",100);std::cout<<"PASS100 fresh DecodeVisualFrame/EncodeRgb calls from3 fixed original references; no worker embedding cache"<<std::endl;
 }catch(const std::exception& e){std::cerr<<"FAIL "<<e.what()<<std::endl;return 1;}return 0;}

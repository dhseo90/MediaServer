#include "recording_media_test_fixture.h"
#include "recording/recording_runtime_composition.h"
#include <iostream>
#include <fstream>
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
 if(argc!=2)return 2;gst_init(nullptr,nullptr);auto root=std::filesystem::weakly_canonical(argv[1]);
 auto input=Encode(60,false,false,160,90,30,30);Shift(input,7000000000ULL);Memory("encoded-input-only",0);
 {recording::RecordingRuntimeStorage runtime(root);std::string error;Need(runtime.Open(&error),error);
 {recording::GStreamerSegmentWriter writer(runtime.WriterOptions(2000));Need(writer.Start("history","unused",input.descriptor,[](auto,auto,auto*){return false;},&error),error);for(const auto& p:input.packets)writer.Push(p,0);writer.Stop();}
 recording::RecordingSegmentV2 seed;{recording::RecordingLocationCatalogSnapshot locations;Need(runtime.catalog().SnapshotLocationsV2("history",&locations,&error),error);Need(locations.segments.size()==1,"one seed segment");seed=locations.segments.front();}
 auto binding=runtime.catalog().FindSourceBinding(seed.segment_id);Need(bool(binding),"seed binding");const auto location=runtime.catalog().FindSegmentMediaLocation(seed.segment_id);Need(bool(location),"seed location");const auto seed_path=location->first/location->second;
 Memory("seed-runtime",0);
 for(unsigned i=1;i<=200;++i){
 {auto segment=seed;segment.segment_id="history-clone-"+std::to_string(i);segment.order_request_id=segment.segment_id+"-order";segment.media_epoch_id=segment.segment_id+"-epoch";
 recording::RecordingOrderReservationV1 order;Need(runtime.journal().ReserveRecordingOrder(segment.store_id,segment.order_request_id,segment.segment_id,segment.channel_id,&order,&error),error);segment.order_sequence=order.sequence;
 auto bound=*binding;bound.segment_id=segment.segment_id;
 auto file=root/segment.channel_id/(segment.segment_id+".mp4");std::filesystem::copy_file(seed_path,file);
 Need(runtime.catalog().FinalizeBoundSegmentV2(segment,bound,file.string(),&error),error);
 recording::RecordingTombstoneV2 tomb;tomb.tombstone_id=segment.segment_id+"-deleted";tomb.segment=segment;tomb.deletion_reason="continuous-capacity";tomb.deleted_at_ms=20;
 Need(runtime.catalog().RequestDeletion(segment.segment_id,tomb.deletion_reason,&error),error);Need(std::filesystem::remove(file),"owned unlink");Need(runtime.catalog().CompleteDeletionV2(tomb,&error),error);
 }
 if(i%50==0){
 {recording::RecordingLocationCatalogSnapshot locations;Need(runtime.catalog().SnapshotLocationsV2("history",&locations,&error),error);Need(locations.segments.size()==1&&locations.deleted_segment_ids.size()==i,"fixed live and cumulative deleted membership");std::cout<<"[history-count] live="<<locations.segments.size()<<" deleted="<<locations.deleted_segment_ids.size()<<std::endl;}
 Memory("deleted-batch",i);
 }
 }
 {const auto replay=runtime.journal().Replay();Need(replay.corrupt_line_count==0&&replay.io_error_count==0&&replay.truncated_tail_count==0,"strict replay");std::cout<<"[history-mutations] rows="<<replay.mutations.size()<<std::endl;}
 Memory("replay-released",200);
 }Memory("runtime-destroyed",200);std::cout<<"PASS history diagnostic; no model, search worker, HTTP, package or new decoding per clone"<<std::endl;
 }catch(const std::exception& e){std::cerr<<"FAIL "<<e.what()<<std::endl;return 1;}return 0;}

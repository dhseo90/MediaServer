// 파일 용도: R138 고정 ticket witness와 실제 History/Evidence owner의 짧은 직접 검사.
#define MEDIA_SERVER_RECORDING_GENERATION_TESTING 1
#include "recording_media_test_fixture.h"
#include "recording/recording_memory_diagnostic_output.h"
#include "recording/recording_runtime_composition.h"
#include "recording/evidence_frame_extractor.h"
#include "../../src/recording/recording_catalog_history.h"
#include <iostream>
#include <numeric>
#include <zlib.h>
#include <cstring>
namespace d=recording::memory_diagnostic;
using R=recording::SearchModelResidency;using C=R::Category;using S=R::Site;
static_assert(sizeof(R::Reservation)==sizeof(std::shared_ptr<void>)+sizeof(std::size_t));
namespace {
unsigned checks=0;void Need(bool b,const char* label){if(!b)throw std::runtime_error(label);++checks;std::cout<<"[pass] "<<label<<'\n';}
bool Sink(const char* p,std::size_t n){return std::fwrite(p,1,n,stdout)==n&&std::fflush(stdout)==0;}
std::uint64_t SiteLive(const R& r,S site){return r.DiagnosticSnapshot().sites[unsigned(site)].live;}
void Emit(const R& r){Need(d::Emit(r,"sample",Sink),"bounded numeric output");}
void Ledger(){R r(1000);auto a=r.ReserveOwned(700,C::Model);a.reset();
 {auto b=r.ReserveOwned(200,C::Unattributed,S::JournalProof);auto copy=*b;auto moved=std::move(copy);
  auto split=moved.Split(50);split.DiagnosticCategory(C::CatalogRow);auto v=r.DiagnosticSnapshot();
  Need(v.used==400&&v.unattributed==350&&v.unknownLive[unsigned(S::JournalProof)]==350,"split/reclass orthogonal site/category");
  Need(v.unknownPeak==400&&v.ticketPeak==700&&v.atUnknownPeak[unsigned(S::JournalProof)]==400,"unknown peak below earlier total peak preserved");
  Need(v.sites[unsigned(S::JournalProof)].largest==200&&v.sites[unsigned(S::JournalProof)].peak==400,"largest ticket distinct from simultaneous peak");
  Need(!r.ReserveOwned(601)&&r.used()==400,"failed admission no witness charge");
  split.DiagnosticCategory(C::Unattributed);Need(r.DiagnosticSnapshot().unattributed==400,"reclass back preserves owner");
  try{auto tmp=r.ReserveOwned(400,C::Unattributed,S::HistoryRaw);auto impossible=*tmp;(void)impossible;}catch(const recording::RecordingResourceUnavailable&){}
  Need(r.used()==400,"exception unwinds before copy storage");
 }
 auto v=r.DiagnosticSnapshot();Need(v.used==0&&v.sites[2].tickets==0&&v.sites[2].zeroNs>0,"last split owner release");
 for(auto w:v.sites)Need(w.acquires+w.splits==w.releases&&w.live==0,"balanced acquire split release");
 R independent(1000);auto other=independent.ReserveOwned(90);Need(r.used()==0&&independent.used()==90,"distinct domain not merged");Emit(r);
}
void History(){
 auto memory=std::make_shared<R>();auto scratch=std::make_shared<recording::RecordingScratchResidency>(recording::RecordingScratchResidency::Usage{64*1024*1024,32,R::kDefaultBytes},memory);
 recording::RecordingScratchResidency::Scope scope(scratch);std::string error;
 {recording::RecordingCatalogHistoryRows rows;Need(rows.Create(&error),"actual history create");Need(rows.MemoryOwner()==memory,"history uses selected shared domain");
  std::string json="{";for(unsigned i=0;i<1024;++i)json+=(i?",":"")+std::string("\"k")+std::to_string(i)+"\":\"v\"";json+='}';
  Need(rows.Put("source-binding","owned-row",json,&error),"authenticated history input");
  const auto base=memory->used();
  {recording::RecordingColdRow row;bool found=false;Need(rows.GetOwned("source-binding","owned-row",&row,&found,&error)&&found&&row.bytes==json,"actual owned read");
   Need(row.memory.bytes()==json.size()+65537&&SiteLive(*memory,S::HistoryRaw)==row.memory.bytes(),"held raw versus reserved overhead");
   std::cout<<"[history-size] {\"raw\":"<<row.bytes.size()<<",\"capacity\":"<<row.bytes.capacity()<<",\"reserved\":"<<row.memory.bytes()<<"}\n";Emit(*memory);}
  Need(memory->used()==base&&SiteLive(*memory,S::HistoryRaw)==0,"owned raw release");
  Need(rows.Visit("source-binding",[&](const std::string&,const std::string& raw,std::string*){Need(raw==json&&SiteLive(*memory,S::HistoryVisitor)>raw.size(),"visitor parse reservation held");return true;},&error),"full verified visitor");
  Need(!rows.Visit("source-binding",[](const auto&,const auto&,auto*){return false;},&error)&&memory->used()==base,"consumer cancellation release");
  bool caught=false;try{rows.Visit("source-binding",[](const auto&,const auto&,auto*)->bool{throw std::bad_alloc();},&error);}catch(const std::bad_alloc&){caught=true;}
  Need(caught&&memory->used()==base,"visitor exception release");
  Need(::ftruncate(rows.ProbeIndexFd(),1)==0,"owned fixture partial index");recording::RecordingColdRow failed;bool found=false;
  Need(!rows.GetOwned("source-binding","owned-row",&failed,&found,&error)&&SiteLive(*memory,S::HistoryRaw)==0,"partial retained read fails without owner leak");
 }
 Need(memory->used()==0&&scratch->usage().file_descriptors==0&&scratch->usage().disk_bytes==0,"history destruction RAM scratch FD zero");Emit(*memory);
}
void Evidence(const std::filesystem::path& root){
 std::shared_ptr<R> memory;std::shared_ptr<recording::RecordingScratchResidency> scratch;
 {recording::RecordingRuntimeStorage runtime(root/"recordings");std::string error;Need(runtime.Open(&error),"evidence runtime Open");memory=runtime.catalog().SearchResidency();scratch=runtime.catalog().ScratchResidency();
  {auto input=Encode(30,false,false,160,90,30,30);Shift(input,7000000000ULL);
   recording::GStreamerSegmentWriter writer(runtime.WriterOptions(1000));Need(writer.Start("1","unused",input.descriptor,[](auto,auto,auto*){return false;},&error),"actual writer start");for(const auto& packet:input.packets)writer.Push(packet,0);writer.Stop();
   const auto ids=runtime.catalog().FinalizedSegmentIdsForStartup();Need(ids.size()==1,"one finalized source");
   const auto segment=runtime.catalog().FindSegmentV2ById(ids[0]);const auto binding=runtime.catalog().FindSourceBinding(ids[0]);Need(segment&&binding&&binding->file_evidence&&binding->file_evidence->samples.size()==30,"source samples bound");
   const auto pts=binding->file_evidence->samples.front().original_pts_ns;
   recording::RecordingReadService reader(runtime.catalog());recording::EvidenceFrameExtractor extractor(runtime.catalog(),reader);recording::EvidenceFrameV1 frame;
   const std::size_t raw=(4096ULL*3+1)*2160,budget=4096ULL*2160*3+raw+3*compressBound(raw)+65536;
   bool held=false;auto observe=[&]{held=held||SiteLive(*memory,S::EvidenceImage)==budget;return false;};
   auto deadline=[] {return std::chrono::steady_clock::now()+std::chrono::seconds(5);};
   Need(extractor.ExtractMedia("1",ids[0],pts,segment->checksum_sha256,&frame,&error,deadline(),observe),"actual exact evidence Extract");
   Need(held&&frame.width==160&&frame.height==90&&frame.pts_ns==pts,"actual image owner held at decoder and exact output");
   auto witness=memory->DiagnosticSnapshot().sites[unsigned(S::EvidenceImage)];
   Need(witness.largest==budget&&witness.live==frame.memory.bytes()&&witness.splits==1,"image workspace splits result owner");
   std::cout<<"[evidence-size] {\"reservation\":"<<budget<<",\"rgbBytes\":"<<160*90*3<<",\"pngBytes\":"<<frame.png.size()<<",\"pngCapacity\":"<<frame.png.capacity()<<",\"resultReservation\":"<<frame.memory.bytes()<<"}\n";Emit(*memory);frame={};
   Need(SiteLive(*memory,S::EvidenceImage)==0,"last PNG result release");
   Need(!extractor.ExtractMedia("1",ids[0],pts,segment->checksum_sha256,&frame,&error,deadline(),[&]{return SiteLive(*memory,S::EvidenceImage)>0;})&&SiteLive(*memory,S::EvidenceImage)==0&&frame.png.empty(),"cancel after image admission releases unpublished result");
   {auto filler=memory->ReserveOwned(memory->limit()-memory->used()-16*1024*1024);Need(bool(filler),"explicit focused shared saturation");Need(!extractor.ExtractMedia("1",ids[0],pts,segment->checksum_sha256,&frame,&error,deadline())&&error=="evidence-resource-unavailable"&&SiteLive(*memory,S::EvidenceImage)==0,"image budget rejection not decode retry");}
  }
  Need(runtime.Finish(&error),"explicit Finish");
 }
 Need(memory->used()==0&&scratch->usage().file_descriptors==0&&scratch->usage().disk_bytes==0,"last evidence storage owner RAM scratch FD zero");Emit(*memory);
}
void Allocator(){
 auto before=d::AllocatorStatistics();auto* data=static_cast<unsigned char*>(std::malloc(1024*1024));Need(data!=nullptr,"allocator probe allocation");
 volatile unsigned char* touch=data;for(unsigned i=0;i<1024*1024;++i)touch[i]=static_cast<unsigned char>(i);
 auto held=d::AllocatorStatistics();std::free(data);auto after=d::AllocatorStatistics();
 for(auto s:{before,held,after})std::cout<<"[allocator] {\"supported\":"<<s.supported<<",\"called\":"<<s.called<<",\"beginNs\":"<<s.beginNs<<",\"endNs\":"<<s.endNs<<",\"inUse\":"<<s.sizeInUse<<",\"allocated\":"<<s.sizeAllocated<<",\"touchedHwm\":"<<s.maxSizeInUse<<",\"blocks\":"<<s.blocksInUse<<"}\n";
#ifdef __APPLE__
 Need(before.called&&held.called&&after.called&&held.sizeInUse>=before.sizeInUse+1024*1024&&held.sizeInUse>=after.sizeInUse+1024*1024,"malloc in-use observes real allocation and free");
#else
 Need(!before.supported&&!before.called,"nonmac allocator coverage explicitly unavailable");
#endif
}
}
int main(int argc,char** argv){try{
 if(argc==2&&std::string(argv[1])=="--disabled"){R r;auto t=r.ReserveOwned(10,C::Page,S::HistoryRaw);Need(r.used()==10&&r.DiagnosticSnapshot().sites[3].live==0&&!d::AllocatorStatistics().called,"disabled ledger remains inert");return 0;}
 Need(argc==2&&d::Enabled(),"owned root and diagnostic opt-in");Ledger();History();gst_init(nullptr,nullptr);Evidence(std::filesystem::canonical(argv[1]));Allocator();
 std::cout<<"[result] ticket-owner checks="<<checks<<" fail=0\n";return 0;
 }catch(const std::exception& e){std::cerr<<"[fail] "<<e.what()<<'\n';return 1;}}

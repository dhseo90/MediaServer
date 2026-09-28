// 파일 용도: 녹화 카탈로그 누적 규모별 실제 파일·체크포인트 비용과 프로세스 메모리를 관측한다.
#define main recording_file_evidence_unused_main
#include "recording_file_evidence_smoke.cpp"
#undef main
#include "recording_catalog_cost_probe_timer.h"
#include "recording_process_memory_probe.h"
namespace {
using MemoryStage=recording_memory_probe::Stage;
void Memory(MemoryStage stage,unsigned sources=0){if(!recording_memory_probe::Emit(stage,sources))throw std::runtime_error("scale memory measurement unavailable");}
std::uint64_t Size(const std::filesystem::path& p){if(!std::filesystem::exists(p))return 0;if(std::filesystem::is_symlink(p))throw std::runtime_error("scale symlink");if(!std::filesystem::is_directory(p))return std::filesystem::file_size(p);std::uint64_t n=0;for(const auto& e:std::filesystem::directory_iterator(p))n+=Size(e.path());return n;}
void Capacity(const std::filesystem::path& root,unsigned n){const auto bytes=Size(root);std::cout<<"[scale-size] sources="<<n<<" owned_bytes="<<bytes<<'\n';if(bytes>512ULL*1024*1024)throw std::runtime_error("scale resource disk cap");}
std::uint64_t Calls(const std::string& suffix){std::uint64_t n=0;for(const auto& [key,m]:fc::metrics)if(key.size()>=suffix.size()&&key.compare(key.size()-suffix.size(),suffix.size(),suffix)==0)n+=m.count;return n;}
}
int main(int argc,char** argv){if(argc!=2)return 2;gst_init(nullptr,nullptr);try{
 const std::filesystem::path root=argv[1];Memory(MemoryStage::InputBefore);auto input=Encode(4096,false,false,160,90,30,10000);Memory(MemoryStage::InputAfter);Memory(MemoryStage::SourceBefore);const auto originals=Record(root/"actual4096",input);Memory(MemoryStage::SourceAfter);Check(originals.size()==1&&originals[0].binding.file_evidence.has_value(),"LP02 actual4096 prerequisite");const auto& original=originals[0];const auto store_root=root/"scale32";std::vector<Output> outputs;std::string error;std::uint64_t checkpoints=0;
 std::cout<<"[mode] LP02 one_accumulating_store=true optimization=none sqlite=enabled timer_overhead=not-subtracted runtime_cap_seconds=180 disk_cap_bytes=536870912 performance_threshold=none\n";
 {
 Memory(MemoryStage::StoreBefore);Store store(store_root);Memory(MemoryStage::StoreAfter);
 for(unsigned i=0;i<32;++i){context="LP02/commit"+std::to_string(i+1);Capacity(root,i);auto o=original;o.root=store_root;o.segment.segment_id="scale-"+std::to_string(i);o.segment.order_request_id="scale-order-"+std::to_string(i);o.binding.segment_id=o.segment.segment_id;o.file=store_root/(o.segment.segment_id+".mp4");
 RecordingOrderReservationV1 order;Check(store.journal.ReserveRecordingOrder("probe-store",o.segment.order_request_id,o.segment.segment_id,o.segment.channel_id,&order,&error),"reserve");o.segment.order_sequence=order.sequence;std::filesystem::copy_file(original.file,o.file);Check(Verify(o),"actual file outside catalog");
 const bool milestone=i+1==1||i+1==16||i+1==32;if(milestone)Memory(MemoryStage::CommitBefore,i+1);
 fc::enabled=true;const auto begin=Clock::now();const bool ok=store.catalog.FinalizeBoundSegmentV2(o.segment,o.binding,o.file.string(),&error);const auto elapsed=Us(begin);fc::enabled=false;const auto automatic=Calls("catalog.CheckpointLocked");checkpoints+=automatic;
 if(milestone)Memory(MemoryStage::CommitAfter,i+1);
 std::cout<<"[scale-commit] sources="<<i+1<<" wall_us="<<elapsed<<" automatic_checkpoints="<<automatic<<" automatic_total="<<checkpoints<<" binding_bytes="<<SerializeRecordingSourceBindingV1(o.binding).size()<<" file_bytes="<<o.segment.size_bytes<<" journal_bytes="<<Size(store.journal.path())<<" sqlite_bytes="<<Size(store_root/"recording-catalog.sqlite3")<<" wal_bytes="<<Size(store_root/"recording-catalog.sqlite3-wal")<<'\n';fc::Dump(context);Check(ok,"commit "+error);outputs.push_back(o);Capacity(root,i+1);
 if(i+1==16||i+1==32){context="LP02/sources"+std::to_string(i+1);std::vector<RecordingDerivedSourceSnapshotEntry> snapshot;const auto reference=Job(outputs.front()).reference;Memory(MemoryStage::SnapshotBefore,i+1);fc::enabled=true;const bool found=store.catalog.SnapshotDerivedSources(reference,&snapshot,&error);fc::enabled=false;Memory(MemoryStage::SnapshotAfter,i+1);fc::Dump(context+"/snapshot");Check(found&&snapshot.size()==i+1,"snapshot exact count");
 Memory(MemoryStage::CheckpointBefore,i+1);fc::enabled=true;const bool cp=store.catalog.Checkpoint(&error);fc::enabled=false;Memory(MemoryStage::CheckpointAfter,i+1);fc::Dump(context+"/explicit-checkpoint");Check(cp,"explicit checkpoint");const auto replay=store.journal.Replay();Check(replay.mutations.size()==2*(i+1),"reservation and bound mutation count");std::cout<<"[scale-milestone] sources="<<i+1<<" records="<<replay.mutations.size()<<" samples="<<4096*(i+1)<<" journal_bytes="<<Size(store.journal.path())<<" explicit_checkpoint_resets_checked_bytes=true subsequent_auto_observed=true\n";}
 }
 }
 Memory(MemoryStage::StoreReleased,32);
 for(bool sql:{true,false}){context="LP02/recovery/sql"+std::to_string(sql);{RecordingJournal journal(RecordingJournal::ManagedOptions{store_root,"probe-store"});Check(journal.Open(&error),"journal reopen");auto opts=Store::Options(store_root);opts.prefer_sqlite=sql;RecordingCatalog catalog(journal,opts);Memory(sql?MemoryStage::SqliteOpenBefore:MemoryStage::JsonlOpenBefore,32);const auto begin=Clock::now();Check(catalog.Open(&error),"catalog reopen");const auto elapsed=Us(begin);Memory(sql?MemoryStage::SqliteOpenAfter:MemoryStage::JsonlOpenAfter,32);std::cout<<"[scale-recovery] sql="<<sql<<" open_us="<<elapsed<<'\n';for(const auto& o:outputs){const auto b=catalog.FindSourceBinding(o.segment.segment_id);const auto s=catalog.FindSegmentV2ById(o.segment.segment_id);Check(b&&s&&SerializeRecordingSourceBindingV1(*b)==SerializeRecordingSourceBindingV1(o.binding)&&SerializeRecordingSegmentV2(*s)==SerializeRecordingSegmentV2(o.segment),"exact source "+o.segment.segment_id);}Capacity(root,32);}Memory(sql?MemoryStage::SqliteReleased:MemoryStage::JsonlReleased,32);}
 Memory(MemoryStage::Finish,32);
 std::cout<<"[summary] LP02 passes="<<passes<<" automatic_checkpoints="<<checkpoints<<" operational_latency_acceptance=not_assessed\n";return 0;
 }catch(const std::exception& e){std::cerr<<"[fail] "<<e.what()<<'\n';return 1;}}

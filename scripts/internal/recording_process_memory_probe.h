#pragma once
// 테스트 전용 macOS 자기 프로세스 관측. peak는 누적 high-water이며 구간 할당량이 아니다.
#include <cstdint>
#include <iostream>
#if defined(__APPLE__)
#include <mach/mach.h>
#include <sys/resource.h>
#endif
namespace recording_memory_probe {
enum class Stage { InputBefore,InputAfter,SourceBefore,SourceAfter,StoreBefore,StoreAfter,
 CommitBefore,CommitAfter,SnapshotBefore,SnapshotAfter,CheckpointBefore,CheckpointAfter,
 StoreReleased,SqliteOpenBefore,SqliteOpenAfter,SqliteReleased,JsonlOpenBefore,JsonlOpenAfter,
 JsonlReleased,Finish,Count };
struct Sample { std::uint64_t current=0,peak=0; };
inline bool Read(Sample* out){
#if defined(__APPLE__)
 if(!out)return false;
 mach_task_basic_info_data_t info{};mach_msg_type_number_t count=MACH_TASK_BASIC_INFO_COUNT;
 if(task_info(mach_task_self(),MACH_TASK_BASIC_INFO,reinterpret_cast<task_info_t>(&info),&count)!=KERN_SUCCESS)return false;
 rusage usage{};if(getrusage(RUSAGE_SELF,&usage)!=0||usage.ru_maxrss<=0)return false;
 *out={static_cast<std::uint64_t>(info.resident_size),static_cast<std::uint64_t>(usage.ru_maxrss)};return true;
#else
 (void)out;return false;
#endif
}
inline bool Emit(Stage stage,unsigned sources=0,bool(*read)(Sample*)=Read){
 const auto id=static_cast<unsigned>(stage);
 if(id>=static_cast<unsigned>(Stage::Count)||(sources!=0&&sources!=1&&sources!=16&&sources!=32)){
  std::cout<<"[memory-error] code=invalid-stage\n";return false;
 }
 Sample sample;constexpr std::uint64_t max=9007199254740991ULL;
 if(!read||!read(&sample)||!sample.current||!sample.peak||sample.current>max||sample.peak>max){
  std::cout<<"[memory-error] code=unavailable stage="<<id<<'\n';return false;
 }
 std::cout<<"[memory] {\"stage\":"<<id<<",\"sources\":"<<sources<<",\"currentRssBytes\":"<<sample.current
  <<",\"peakRssBytes\":"<<sample.peak<<",\"unit\":\"bytes\",\"peakScope\":\"process-lifetime\"}\n";
 return true;
}
}

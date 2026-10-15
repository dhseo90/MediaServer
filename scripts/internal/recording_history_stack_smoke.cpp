// 파일 용도: 실제 history index의 깊이 의존 스택 사용과 인증/종료 계약을 확인한다.
#include "../../src/recording/recording_history_index.h"
#include <pthread.h>
#include <iostream>
#include <map>
#include <filesystem>
#include <stdexcept>
using Index=recording::RecordingHistoryIndex;
struct Input {std::string root;bool constrained=true;bool ok=false;std::string error;};
static void Need(bool ok,const std::string& error){if(!ok)throw std::runtime_error(error);}
static void* Run(void* p){auto& input=*static_cast<Input*>(p);try{
 auto ram=std::make_shared<recording::SearchModelResidency>(4*1024*1024);
 auto budget=std::make_shared<recording::RecordingScratchResidency>(recording::RecordingScratchResidency::Usage{64*1024*1024,8,ram->limit()},ram);
 std::string error,value;
 for(unsigned mode=0;mode<3;++mode){
  Index index;Need(index.Create(input.root,Index::BytesForRows(4096),&error,budget),error);
  if(mode==2)Need(index.BeginBufferedBuild(&error),error);
  std::map<std::string,std::string> expected;
  for(unsigned i=0;i<4096;++i){const unsigned n=mode==0?i:mode==1?4095-i:(i*2053)%4096;
   const auto key=std::to_string(100000+n);const std::string v(n%3==0?2048:n%3==1?112:0,char('a'+n%20));
   Need(index.Put(key,v,false,&error),error);expected.emplace(key,v);
  }
  if(input.constrained){Need(index.Close(&error),error);Need(ram->used()==0,"bounded insertion owner0");input.ok=true;std::cout<<"[pass] bounded insertion4096 owner0"<<std::endl;return nullptr;}
  if(mode==2)Need(index.SealBufferedBuild(&error),error);
  for(unsigned i=0;i<128;++i){auto& v=expected.at(std::to_string(100000+i));v="updated";Need(index.Put(std::to_string(100000+i),v,true,&error),error);}
  for(const auto& [k,v]:expected)Need(index.Get(k,&value,&error)==Index::Lookup::Found&&value==v,"exact lookup");
  auto next=expected.begin();Need(index.Visit([&](const auto& k,const auto& v,auto*){if(next==expected.end()||next->first!=k||next->second!=v)return false;++next;return true;},&error)&&next==expected.end(),"ordered independent map");
  value="unchanged";Need(index.Get("absent",&value,&error)==Index::Lookup::Absent&&value=="unchanged","negative proof");
  Index clone;Need(clone.Create(input.root,Index::BytesForRows(4096),&error,budget)&&clone.CopyFrom(index,&error),error);
  Need(index.Close(&error),error);Need(clone.Get("100000",&value,&error)==Index::Lookup::Found&&value=="updated","last clone read");Need(clone.Close(&error),error);
  std::cout<<"[pass] order="<<mode<<" rows=4096 lookup/overwrite/visit/clone/close\n";
 }
 for(unsigned fault=0;fault<2;++fault){Index index;Need(index.Create(input.root,Index::BytesForRows(8),&error,budget),error);Need(index.Put("a","a",false,&error),error);
  if(fault==0){Index::probe_fault=3;Need(!index.Put("b","b",false,&error),"partial write rejected");Index::probe_fault=0;}
  else {const char v='x';Need(pwrite(index.ProbeFd(),&v,1,512+144)==1,"corrupt node");Need(!index.Put("b","b",false,&error),"tamper rejected");}
  Need(index.Get("absent",&value,&error)==Index::Lookup::Error,"poison retained");Need(index.Close(&error),error);
 }
 Need(ram->used()==0&&budget->usage().disk_bytes==0&&budget->usage().file_descriptors==0,"all owners released");
 std::cout<<"[pass] faults/owner0 peakRam="<<ram->peak()<<std::endl;input.ok=true;
 }catch(const std::exception& e){input.error=e.what();}return nullptr;}
int main(int argc,char** argv){if(argc!=2)return 2;Input input{argv[1],true,false,{}};std::filesystem::create_directories(input.root);
 const long platform_min=sysconf(_SC_THREAD_STACK_MIN);Need(platform_min>0,"platform stack minimum");const auto stack_bytes=std::max<std::size_t>(64*1024,static_cast<std::size_t>(platform_min));std::cout<<"[stack] requestedBytes="<<stack_bytes<<" platformMinimum="<<platform_min<<std::endl;
 pthread_attr_t attr;Need(!pthread_attr_init(&attr),"attr");Need(!pthread_attr_setstacksize(&attr,stack_bytes),"stacksize");pthread_t thread;Need(!pthread_create(&thread,&attr,Run,&input),"thread");pthread_attr_destroy(&attr);Need(!pthread_join(thread,nullptr),"join");if(!input.ok){std::cerr<<input.error<<std::endl;return 1;}input.constrained=false;input.ok=false;Run(&input);if(!input.ok){std::cerr<<input.error<<std::endl;return 1;}return 0;}

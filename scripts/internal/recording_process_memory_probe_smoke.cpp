#include "recording_process_memory_probe.h"
#include <limits>
using namespace recording_memory_probe;
bool Good(Sample* value){*value={100,200};return true;}
bool Missing(Sample*){return false;}
bool Zero(Sample* value){*value={0,0};return true;}
bool Overflow(Sample* value){*value={std::numeric_limits<std::uint64_t>::max(),1};return true;}
int main(){
 int fail=0;const auto check=[&](bool ok,const char* name){std::cout<<(ok?"[pass] ":"[fail] ")<<name<<'\n';if(!ok)++fail;};
 Sample measured;check(Read(&measured)&&measured.current>0&&measured.peak>0,"LP16-M01 macOS 자기 current/peak bytes");
 check(Emit(Stage::Finish,32),"LP16-M01 실제 고정 stage 출력");
 check(Emit(Stage::CommitAfter,1,Good),"LP16-M01 정상 주입값");
 check(!Emit(static_cast<Stage>(999),0,Good),"LP16-M01 잘못된 stage 거부");
 check(!Emit(Stage::CommitAfter,2,Good),"LP16-M01 잘못된 source count 거부");
 check(!Emit(Stage::Finish,0,Missing),"LP16-M01 측정 실패 거부");
 check(!Emit(Stage::Finish,0,Zero),"LP16-M01 누락/zero 거부");
 check(!Emit(Stage::Finish,0,Overflow),"LP16-M01 안전 정수 초과 거부");
 return fail?1:0;
}

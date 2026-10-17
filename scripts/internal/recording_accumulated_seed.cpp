// 기존 confirmed seed의 단일 finalized 기대값을 그대로 사용하는 격리 진입점.
#define main ReviewFixtureMain
#include "va_review_smoke.cpp"
#undef main
#include "recording_writer_test_isolation.h"
int main(int argc,char** argv){
 if(argc!=2||!RecordingWriterTestIsolation(argv[1]))return 2;
 try{gst_init(nullptr,nullptr);const auto store=std::filesystem::path(argv[1])/"recording";
 if(!std::filesystem::is_empty(store))throw std::runtime_error("seed requires empty canonical store");
 ConfirmedSeed(store);return 0;
 }catch(const std::exception& e){std::cerr<<"[R152-seed-failure] "<<e.what()<<std::endl;return 1;}
}

// 파일 용도: 동일 TP01~04 fixture와 실제 writer를 재사용한다. 기존 계측은 수정하지 않는다.
#define main TimingProbeOriginalMain
#include "recording_timing_probe.cpp"
#undef main
void ForwardProbeBegin(const std::filesystem::path&);
void ForwardProbeEnd();
int main(int argc,char** argv) {
    if(argc!=2)return 2;
    gst_init(nullptr,nullptr);
    std::cout<<"[gstreamer] "<<gst_version_string()<<'\n';
    try {
        for(int i=1;i<=4;++i) {
            const auto dest=std::filesystem::path(argv[1])/("TP0"+std::to_string(i));
            std::filesystem::create_directories(dest);ForwardProbeBegin(dest);Run(argv[1],i);ForwardProbeEnd();
        }
        return 0;
    } catch(const std::exception& e){std::cerr<<"[fail] "<<e.what()<<'\n';return 1;}
}

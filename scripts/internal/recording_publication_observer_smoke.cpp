// Test-only executable interposition: actual native writer/linkat, one bounded publication latch.
#define main ExistingManagedWriterFixtureMain
#include "recording_managed_writer_smoke.cpp"
#undef main
#include "recording_writer_test_isolation.h"
#include <dlfcn.h>
#include <poll.h>
#include <unistd.h>
#include <cstring>
namespace { bool publication_armed=false,publication_timeout=false;unsigned publications=0; }
extern "C" int linkat(int a,const char* from,int b,const char* to,int flags){
    using Link=int(*)(int,const char*,int,const char*,int);
    static const auto actual=reinterpret_cast<Link>(dlsym(RTLD_NEXT,"linkat"));
    if(!actual){errno=ENOSYS;return -1;}const int result=actual(a,from,b,to,flags);
    if(result==0&&publication_armed&&a==b&&std::strstr(from,".mp4.partial.")&&std::string(to).size()>4&&std::string(to).substr(std::string(to).size()-4)==".mp4"){
        publication_armed=false;++publications;struct stat x{},y{};
        const bool same=::fstatat(a,from,&x,AT_SYMLINK_NOFOLLOW)==0&&::fstatat(b,to,&y,AT_SYMLINK_NOFOLLOW)==0&&x.st_dev==y.st_dev&&x.st_ino==y.st_ino&&x.st_nlink==2&&y.st_nlink==2;
        std::cout<<"[R135-linked] same="<<same<<" nlink="<<x.st_nlink<<std::endl;
        pollfd p{STDIN_FILENO,POLLIN,0};char release=0;
        if(::poll(&p,1,5000)!=1||::read(STDIN_FILENO,&release,1)!=1||release!='g')publication_timeout=true;
    }
    return result;
}
int main(int argc,char** argv){
    try{
        if(argc!=2||!RecordingWriterTestIsolation(argv[1]))return 2;
        gst_init(nullptr,nullptr);const auto input=Encode(true,30);std::string error;
        recording::RecordingRuntimeStorage storage(std::filesystem::path(argv[1])/"recording");
        if(!storage.Open(&error))throw std::runtime_error(error);
        unsigned completed=0;auto options=storage.WriterOptions(10000);
        options.admit_segment=[](const auto&,std::uint64_t minimum){return recording::SegmentAdmissionDecision{minimum<=64ULL*1024*1024,false,64ULL*1024*1024};};
        options.complete_segment=[&](const auto&,std::uint64_t bytes){if(bytes)++completed;};
        recording::GStreamerSegmentWriter writer(options);
        if(!writer.Start("9101","unused",input.descriptor,[](auto,auto,auto*){return false;},&error))throw std::runtime_error(error);
        publication_armed=true;for(const auto& packet:input.packets)writer.Push(packet,1000+packet.pts/1000000);writer.Stop();
        if(publications!=1||publication_timeout||completed!=1||!storage.Finish(&error))throw std::runtime_error("writer-publication-or-finish");
        std::cout<<"[R135-writer] input=30 publications=1 durable=1 finish=1 latchTimeout=0"<<std::endl;return 0;
    }catch(const std::exception& e){std::cerr<<"[R135-writer-fail] "<<e.what()<<std::endl;return 1;}
}

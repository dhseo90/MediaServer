// 파일 용도: R149-Prep 실제 OS 한 쌍 대조 전용. collector의 시도로 child를 제어하지 않는다.
// R148 baseline은 동일한 TESTING round 종료 관측만 삽입한 소유 사본을 include한다.
#define RECORDING_METRICS_TESTING
#define main MetricsMain
#ifndef R149_COLLECTOR_SOURCE
#error R149_COLLECTOR_SOURCE must name the bound collector source
#endif
#include R149_COLLECTOR_SOURCE
#undef main
#include <fcntl.h>
#include <poll.h>
#include <csignal>
#include <sys/wait.h>
#include <thread>

#ifdef __APPLE__
namespace {
using Clock=std::chrono::steady_clock;
long long Ns(){return std::chrono::duration_cast<std::chrono::nanoseconds>(Clock::now().time_since_epoch()).count();}
struct ChildStats {long long start=0,end=0;unsigned opens=0,closes=0;int error=0;};
struct Round {long long start=0,end=0,lastDetail=0;};
struct Sleep {long long target=0,start=0,end=0;};
bool Transfer(int fd,void* buffer,std::size_t size,bool writing){
    auto* bytes=static_cast<char*>(buffer);std::size_t done=0;
    while(done<size){const auto n=writing?write(fd,bytes+done,size-done):read(fd,bytes+done,size-done);
        if(n<0&&errno==EINTR)continue;if(n<=0)return false;done+=static_cast<std::size_t>(n);}
    return true;
}
int Child(int commands,int replies){
    char name[]="os-timing-anonymous-XXXXXX";const int stable=mkstemp(name);if(stable<0)return 2;
    unlink(name);const int duplicate=dup(stable);const std::string bytes(8192,'x');
    if(duplicate<0||write(stable,bytes.data(),bytes.size())!=static_cast<ssize_t>(bytes.size()))return 2;
    std::array<int,128> slots;slots.fill(-1);
    for(auto& fd:slots){fd=open("/dev/null",O_RDONLY);if(fd<0)return 2;}
    char ready='r';if(!Transfer(replies,&ready,1,true))return 2;
    pollfd command{commands,POLLIN,0};if(poll(&command,1,2000)<=0||!Transfer(commands,&ready,1,false)||ready!='g')return 2;
    ChildStats stats;stats.start=Ns();
    // Independent monotonic window. No collector round/callback information reaches this process.
    while(Ns()-stats.start<75000000){
        for(auto& fd:slots){if(close(fd)!=0){stats.error=1;break;}fd=-1;++stats.closes;}
        if(stats.error)break;
        std::this_thread::sleep_for(std::chrono::microseconds(100));
        for(auto& fd:slots){fd=open("/dev/null",O_RDONLY);if(fd<0){stats.error=2;break;}++stats.opens;}
        if(stats.error)break;
        std::this_thread::sleep_for(std::chrono::microseconds(100));
    }
    for(auto& fd:slots)if(fd>=0){close(fd);fd=-1;++stats.closes;}
    stats.end=Ns();if(!Transfer(replies,&stats,sizeof(stats),true))return 2;
    // A killed parent cannot leave a child waiting indefinitely.
    command.revents=0;const int polled=poll(&command,1,2000);
    const bool quit=polled>0&&Transfer(commands,&ready,1,false)&&ready=='q';
    close(duplicate);close(stable);close(commands);close(replies);return quit&&!stats.error?0:2;
}
}
int main(int argc,char** argv){
    if(argc!=2)return 2;
    signal(SIGPIPE,SIG_IGN);
    int commands[2],replies[2];if(pipe(commands)!=0)return 2;
    if(pipe(replies)!=0){close(commands[0]);close(commands[1]);return 2;}
    const auto child=fork();if(child<0)return 2;
    if(child==0){close(commands[1]);close(replies[0]);_exit(Child(commands[0],replies[1]));}
    close(commands[0]);close(replies[1]);
    std::array<Round,4> rounds{};std::array<Sleep,3> sleeps{};unsigned active=0,sleep_count=0;
    recording_metrics::before_fd_round=[&](unsigned i){active=i;rounds.at(i).start=Ns();};
    recording_metrics::after_fd_round=[&](unsigned i){rounds.at(i).end=Ns();};
    recording_metrics::detail_result_override=[&](int&,int&){rounds.at(active).lastDetail=Ns();};
    long long anchor=0;
#ifdef R149_CANDIDATE
    recording_metrics::retry_now_override=[&]{const auto now=Clock::now();if(!anchor)anchor=std::chrono::duration_cast<std::chrono::nanoseconds>(now.time_since_epoch()).count();return now;};
    recording_metrics::retry_sleep_override=[&](auto target){auto& s=sleeps.at(sleep_count++);s.target=std::chrono::duration_cast<std::chrono::nanoseconds>(target.time_since_epoch()).count();s.start=Ns();std::this_thread::sleep_until(target);s.end=Ns();};
#endif
    char ready=0;pollfd response{replies[0],POLLIN,0};
    int result=2;long long begin=0,end=0,go_at=0;ChildStats stats;std::ostringstream native_output;
    if(poll(&response,1,1000)>0&&Transfer(replies[0],&ready,1,false)&&ready=='r'){
        ready='g';go_at=Ns();
        if(Transfer(commands[1],&ready,1,true)){
            std::string pid=std::to_string(child);char* native_args[]={argv[0],pid.data(),nullptr};
            auto* original=std::cout.rdbuf(native_output.rdbuf());
            begin=Ns();result=MetricsMain(2,native_args);end=Ns();
            std::cout.rdbuf(original);std::cout<<native_output.str();
        }
    }
    response.revents=0;const bool stats_read=poll(&response,1,500)>0&&Transfer(replies[0],&stats,sizeof(stats),false);
    ready='q';if(!Transfer(commands[1],&ready,1,true))result=2;
    close(commands[1]);close(replies[0]);int status=0;while(waitpid(child,&status,0)<0&&errno==EINTR){}
    const bool clean=WIFEXITED(status)&&WEXITSTATUS(status)==0;
    if(!clean||!stats_read||stats.error)result=2;
    if(!anchor)anchor=rounds[0].start;
    std::ostringstream out;out<<"{\"pid\":"<<child<<",\"goNs\":"<<go_at<<",\"anchorNs\":"<<anchor
      <<",\"nativeStartedNs\":"<<begin<<",\"nativeCompletedNs\":"<<end<<",\"nativeElapsedMs\":"<<(end-begin)/1e6
      <<",\"childStartNs\":"<<stats.start<<",\"childEndNs\":"<<stats.end<<",\"opens\":"<<stats.opens
      <<",\"closes\":"<<stats.closes<<",\"childError\":"<<stats.error<<",\"childExitedZero\":"<<(clean?"true":"false")<<",\"rounds\":[";
    bool comma=false;for(const auto& r:rounds)if(r.start){if(comma)out<<',';comma=true;out<<"{\"startNs\":"<<r.start<<",\"endNs\":"<<r.end<<",\"lastDetailNs\":"<<r.lastDetail<<'}';}
    out<<"],\"sleeps\":[";for(unsigned i=0;i<sleep_count;++i){if(i)out<<',';const auto& s=sleeps[i];out<<"{\"targetNs\":"<<s.target<<",\"startNs\":"<<s.start<<",\"endNs\":"<<s.end<<'}';}out<<"]}\n";
    const auto text=out.str();if(text.size()>8192)return 2;
    const auto trace=std::string(argv[0])+".trace.json";const int fd=open(trace.c_str(),O_WRONLY|O_CREAT|O_EXCL,0600);
    if(fd<0)return 2;const bool stored=Transfer(fd,const_cast<char*>(text.data()),text.size(),true);close(fd);
    const auto raw=native_output.str();if(raw.size()>16384)return 2;
    const int rawfd=open((std::string(argv[0])+".native.json").c_str(),O_WRONLY|O_CREAT|O_EXCL,0600);
    if(rawfd<0)return 2;const bool rawstored=Transfer(rawfd,const_cast<char*>(raw.data()),raw.size(),true);close(rawfd);
    return stored&&rawstored?result:2;
}
#else
int main(){return 2;}
#endif

// 파일 용도: 단조 시간창과 retry 원인의 독립적인 결정적 대조. 실제 FD churn 증거가 아니다.
#define RECORDING_METRICS_TESTING
#define RECORDING_METRICS_NO_MAIN
#include "recording_process_metrics.cpp"
#include <fcntl.h>

#ifdef __APPLE__
using namespace recording_metrics;
struct Result {
    Sample sample; Observation observation; std::string error;
    std::vector<long long> starts, sleeps;
    long long elapsed=0;
};
Result Run(int window, bool slow=false, std::vector<int> capacity={}, int hard=0,
           bool identity=false, bool short_read=false, int churn_errno=EBADF) {
    Result r;long long now=0;unsigned attempt=0,identities=0;
    const RetryClock::time_point epoch{};
    retry_now_override=[&]{return epoch+std::chrono::milliseconds(now);};
    retry_sleep_override=[&](auto until){const auto end=std::chrono::duration_cast<std::chrono::milliseconds>(until-epoch).count();
        if(end<=now)throw std::runtime_error("unnecessary-sleep");
        r.sleeps.push_back(end-now);now=end;};
    before_fd_round=[&](unsigned value){attempt=value;r.starts.push_back(now);};
    fd_list_result_override=[&](int& read,std::size_t size){
        if(std::find(capacity.begin(),capacity.end(),static_cast<int>(attempt))!=capacity.end())read=static_cast<int>(size);};
    detail_result_override=[&](int& returned,int& error){
        if(hard){returned=0;error=hard;return;}
        if(short_read){returned=1;error=0;return;}
        // The window is defined solely by elapsed monotonic time, not attempt number.
        if(now<window){returned=0;error=churn_errno;now+=(slow&&now==0)?160:1;}
    };
    identity_result_override=[&](std::string& value){if(identity&&++identities==2)value+="-changed";};
    try{r.sample=Collect(getpid(),&r.observation);}catch(const std::exception& e){r.error=e.what();}
    r.elapsed=now;
    retry_now_override={};retry_sleep_override={};before_fd_round={};fd_list_result_override={};
    detail_result_override={};identity_result_override={};
    return r;
}
void List(const std::vector<long long>& v){std::cout<<'[';for(std::size_t i=0;i<v.size();++i){if(i)std::cout<<',';std::cout<<v[i];}std::cout<<']';}
int main(int argc,char** argv){
    if(argc!=2||(std::string(argv[1])!="baseline"&&std::string(argv[1])!="candidate"))return 2;
    const bool candidate=std::string(argv[1])=="candidate";
    char name[]="timing-anonymous-XXXXXX";const int fd=mkstemp(name);
    if(fd<0)return 2;
    unlink(name);const int duplicate=dup(fd);
    const std::string bytes(8192,'x');
    if(duplicate<0||write(fd,bytes.data(),bytes.size())!=static_cast<ssize_t>(bytes.size()))return 2;
    int passed=0,failed=0;
    auto check=[&](bool ok,const char* name,const Result& r){
        std::cout<<(ok?"[pass] ":"[fail] ")<<name<<'\n';if(ok)++passed;else ++failed;
        std::cout<<"[timing] {\"case\":\""<<name<<"\",\"startsMs\":";List(r.starts);
        std::cout<<",\"sleepMs\":";List(r.sleeps);std::cout<<",\"elapsedMs\":"<<r.elapsed
            <<",\"rounds\":"<<r.observation.rounds<<",\"closed\":"<<r.observation.closed
            <<",\"capacity\":"<<r.observation.capacity<<",\"detailCalls\":"<<r.observation.detailCalls
            <<",\"anonymousBytes\":"<<r.sample.anonymousBytes<<",\"anonymousFiles\":"<<r.sample.anonymousFiles
            <<",\"error\":\""<<r.error<<"\"}\n";
    };
    const auto short_window=Run(75);
    check(candidate?(short_window.error.empty()&&short_window.starts==std::vector<long long>{0,25,100}&&short_window.sleeps==std::vector<long long>{24,74}):
        (short_window.error==FdExhaustionError(0,4)&&short_window.starts==std::vector<long long>{0,1,2,3}&&short_window.sleeps.empty()),"window75",short_window);
    const auto long_window=Run(300);
    check(long_window.error==FdExhaustionError(0,4)&&long_window.observation.roundCompleted==0&&
        long_window.starts==(candidate?std::vector<long long>{0,25,100,250}:std::vector<long long>{0,1,2,3}),"window300-fail-closed",long_window);
    const auto slow=Run(200,true);
    check(candidate?(slow.error.empty()&&slow.starts==std::vector<long long>{0,160,161,250}&&slow.sleeps==std::vector<long long>{88}):
        (slow.error==FdExhaustionError(0,4)&&slow.starts==std::vector<long long>{0,160,161,162}&&slow.sleeps.empty()),"slow160-no-past-sleep",slow);
    const auto success=Run(0);
    check(success.error.empty()&&success.starts==std::vector<long long>{0}&&success.sleeps.empty()&&
        success.sample.anonymousBytes==8192&&success.sample.anonymousFiles==1,"first-success-duplicate-inode",success);
    for(int code:{EACCES,EPERM}){const auto hard=Run(75,false,{},code);check(hard.error=="permission-denied"&&hard.observation.rounds==1&&hard.sleeps.empty(),"hard-permission-immediate",hard);}
    const auto short_read=Run(0,false,{},0,false,true);
    check(short_read.error=="anonymous-fd-read-incomplete"&&short_read.observation.rounds==1&&short_read.sleeps.empty(),"short-structure-immediate",short_read);
    const auto capacities=Run(0,false,{0,1,2,3});
    check(capacities.error==FdExhaustionError(4,0)&&capacities.sleeps.empty()&&capacities.starts==std::vector<long long>{0,0,0,0},"capacity-no-spread",capacities);
    const auto mixed=Run(75,false,{0,2});
    check(candidate?(mixed.error.empty()&&mixed.starts==std::vector<long long>{0,0,100,100}&&mixed.observation.capacity==2&&mixed.observation.closed==1):
        (mixed.error==FdExhaustionError(2,2)&&mixed.starts==std::vector<long long>{0,0,1,1}),"mixed-common-attempt",mixed);
    const auto noent=Run(75,false,{},0,false,false,ENOENT);
    check(candidate?(noent.error.empty()&&noent.starts==std::vector<long long>{0,25,100}):noent.error==FdExhaustionError(0,4),"enoent-same-timing",noent);
    const auto identity=Run(75,false,{},0,true);
    check(candidate?(identity.error=="process-identity-changed"&&identity.observation.rounds==3&&identity.observation.roundCompleted==0):
        identity.error==FdExhaustionError(0,4),"identity-after-retry",identity);
    if(candidate)check(short_window.sample.anonymousBytes==8192&&short_window.sample.anonymousFiles==1,"successful-round-accounting",short_window);
    close(duplicate);close(fd);
    std::cout<<"{\"passed\":"<<passed<<",\"failed\":"<<failed<<",\"clock\":\"simulated-monotonic\",\"osBenefit\":false}\n";
    return failed?1:0;
}
#else
int main(){std::cout<<"macOS-only timing fixture; Linux collector unchanged\n";return 0;}
#endif

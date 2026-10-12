// 파일 용도: collector와 별도 프로세스로 실행하는 제어 가능한 자원 fixture.
#define RECORDING_METRICS_NO_MAIN
#define RECORDING_METRICS_TESTING
#include "recording_process_metrics.cpp"
#include <atomic>
#include <condition_variable>
#include <fcntl.h>
#include <mutex>
#include <sys/mman.h>
#include <thread>
#include <sys/wait.h>
#ifdef __linux__
#include <sys/prctl.h>
#endif
int Parsers() {
    using namespace recording_metrics;
    int failures = 0, pid = 0;
    std::uint64_t value = 0;
    std::string identity;
    auto check = [&](bool ok, const char* name) {
        std::cout << (ok ? "[pass] " : "[fail] ") << "PM04 " << name << std::endl;
        if (!ok) ++failures;
    };
    check(FdExhaustionError(4,0)=="fd-observation-incomplete:capacity=4:closed=0", "capacity exhaustion distinct");
    check(FdExhaustionError(0,4)=="fd-observation-incomplete:capacity=0:closed=4", "descriptor race exhaustion distinct");
    check(FdExhaustionError(2,2)=="fd-observation-incomplete:capacity=2:closed=2", "mixed exhaustion distinct");
    check(ParsePid("123", pid) && pid == 123, "positive PID");
    check(!ParsePid("0", pid), "zero PID rejected");
    check(!ParsePid("-1", pid), "negative PID rejected");
    check(!ParsePid("12x", pid), "partial PID rejected");
    check(!ParsePid("2147483648", pid), "PID range rejected");
    check(!ParsePid("", pid), "missing PID rejected");
    check(ResidentBytes("100 2 3 4 5 6 7", 4096, value) && value == 8192, "resident pages converted");
    check(!ResidentBytes("100", 4096, value), "partial statm rejected");
    check(!ResidentBytes("100 18446744073709551615", 4096, value), "resident overflow rejected");
    check(!ResidentBytes("100 2", 0, value), "page size missing rejected");
    const std::string stat = "123 (space ) name) S 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 999";
    check(StatStart(stat, 123, identity) && identity == "linux:999", "stat comm parentheses and start field");
    check(!StatStart(stat, 124, identity), "wrong PID stat rejected");
    check(!StatStart("123 (short) S 1", 123, identity), "partial stat rejected");
    check(CompleteFdRead(24, 64, 8), "complete FD bytes accepted");
    check(!CompleteFdRead(23, 64, 8), "partial FD bytes rejected");
    check(!CompleteFdRead(64, 64, 8), "saturated FD bytes rejected");
    check(!CompleteFdRead(-1, 64, 8), "failed FD read rejected");
    check(ClassifyError(EACCES, "stage") == "permission-denied", "EACCES classified");
    check(ClassifyError(EPERM, "stage") == "permission-denied", "EPERM classified");
    check(ClassifyError(ENOENT, "stage") == "process-exited-or-absent", "ENOENT classified");
    check(ClassifyError(ESRCH, "stage") == "process-exited-or-absent", "ESRCH classified");
    check(ClassifyError(EIO, "stage") == "stage", "unknown error preserves stage");
    check(ClassifyError(0, "stage") == "stage", "zero error preserves stage");
    return failures ? 1 : 0;
}
int Transitions() {
    using namespace recording_metrics;
    int commands[2],acks[2];if(pipe(commands)||pipe(acks))return 2;
    const auto child=fork();if(child<0)return 2;
    if(!child){
        close(commands[1]);close(acks[0]);char name[]="metrics-transition-XXXXXX";
        const int file=mkstemp(name);if(file<0||unlink(name)||dup2(file,201)!=201)return 2;close(file);
        char named[] = "metrics-named-XXXXXX";bool named_live=false;
        char c='r';if(write(acks[1],&c,1)!=1)return 2;
        while(read(commands[0],&c,1)==1){
            if(c=='q')break;
#ifdef __linux__
            if(c=='d'&&prctl(PR_SET_DUMPABLE,0))return 2;
            if(c=='e'&&prctl(PR_SET_DUMPABLE,1))return 2;
#endif
            if(c=='v'){if(dup2(201,200)!=200||ftruncate(201,8192))return 2;}
            if(c=='c'&&close(200))return 2;
            if(c=='g'&&ftruncate(201,16384))return 2;
            if(c=='t'&&ftruncate(201,4096))return 2;
            if(c=='n'||c=='w'){char other[]="metrics-other-XXXXXX";const int f=mkstemp(c=='n'?other:named);if(f<0||ftruncate(f,4096)||dup2(f,200)!=200)return 2;close(f);if(c=='n'){if(unlink(other))return 2;}else named_live=true;}
            if(c=='u'){if(!named_live||unlink(named))return 2;named_live=false;}
            if(c=='p'){int f[2];if(pipe(f)||dup2(f[0],200)!=200)return 2;close(f[0]);close(f[1]);}
            if(write(acks[1],&c,1)!=1)return 2;
        }
        if(named_live&&unlink(named)){return 2;}
        close(200);close(201);return 0;
    }
    close(commands[0]);close(acks[1]);char ack;if(read(acks[0],&ack,1)!=1)return 2;
    auto send=[&](char c){if(write(commands[1],&c,1)!=1||read(acks[0],&ack,1)!=1)throw std::runtime_error("transition handshake");};
    int failed=0;
    auto check=[&](bool ok,const char* name){std::cout<<(ok?"[pass] ":"[fail] ")<<"PM07 "<<name<<std::endl;if(!ok)++failed;};
    try {
        for(char transition:std::string("cp")){
            send('v');bool changed=false;before_fd_detail=[&](int fd){if(fd==200&&!changed){changed=true;send(transition);}};
            Observation d;const auto s=Collect(child,&d);before_fd_detail={};
            check(changed&&s.anonymousBytes==8192&&s.anonymousFiles==1,"close/type transition retains surviving anonymous inode");
#ifdef __APPLE__
            check(d.closed==1&&d.rounds==2&&d.failures[0].error==EBADF,"macOS actual listed vnode EBADF then independent complete round");
            check(d.failures[0].nextType==(transition=='c'?0:PROX_FDTYPE_PIPE),"next list classifies absence/type only, not old bytes");
#else
            check(transition=='p'||(d.closed==1&&d.rounds==2&&d.failures[0].error==ENOENT),"Linux stat target transition contract");
#endif
            std::cout<<"[transition] kind="<<transition<<" rounds="<<d.rounds<<" closed="<<d.closed<<" errno="<<d.failures[0].error<<std::endl;
        }
        send('v');bool replaced=false;before_fd_detail=[&](int fd){if(fd==200&&!replaced){replaced=true;send('n');}};
        const auto replacement=Collect(child);before_fd_detail={};check(replaced&&replacement.anonymousBytes==12288&&replacement.anonymousFiles==2,"same FD new vnode counted as distinct inode, not old identity");
        send('w');check(Collect(child).anonymousBytes==8192,"named file excluded before unlink");send('u');check(Collect(child).anonymousBytes==12288,"same named file after unlink enters anonymous scope");
        send('v');bool grown=false;before_fd_detail=[&](int fd){if(fd==201&&!grown){grown=true;send('g');}};
        const auto grown_sample=Collect(child);before_fd_detail={};check(grown_sample.anonymousFiles==1&&grown_sample.anonymousBytes==16384,"duplicate inode growth uses maximum measured bytes");
        send('t');check(Collect(child).anonymousBytes==4096,"next round truncate measured, previous maximum not copied");
        before_fd_round=[&](unsigned){send('v');};before_fd_detail=[&](int fd){if(fd==200)send('c');};
        Observation d;bool rejected=false;try{(void)Collect(child,&d);}catch(const std::runtime_error& e){rejected=std::string(e.what())==FdExhaustionError(0,4);}
        before_fd_round={};before_fd_detail={};check(rejected&&d.closed==4&&d.rounds==4,"four actual close races remain incomplete, no partial promotion");
#ifdef __APPLE__
        send('v');bool first_closed=false;int first_detail=-1;
        before_fd_round=[&](unsigned attempt){if(attempt==1)send('n');};
        after_fd_list=[&](unsigned attempt){if(attempt==1)first_detail=-2;};
        before_fd_detail=[&](int fd){if(first_detail==-2)first_detail=fd;if(fd==200&&!first_closed){first_closed=true;send('c');}};
        Observation priority;const auto priority_sample=Collect(child,&priority);before_fd_round={};after_fd_list={};before_fd_detail={};
        check(first_detail==200&&priority.rounds==2&&priority_sample.anonymousBytes==12288,"raced slot prioritized on new full roster; replacement vnode measured");
#endif
        for(const auto error_code:{EACCES,EPERM}){
            detail_result_override=[&](int& returned,int& error){returned=-1;error=error_code;};
            Observation hard;bool denied=false;try{(void)Collect(child,&hard);}catch(const std::runtime_error& e){denied=std::string(e.what())=="permission-denied";}
            detail_result_override={};check(denied&&hard.rounds==1&&hard.closed==0,"injected syscall permission failure never churn");
        }
#ifdef __APPLE__
        detail_result_override=[](int& returned,int& error){returned=1;error=EBADF;};
        Observation short_read;bool incomplete=false;try{(void)Collect(child,&short_read);}catch(const std::runtime_error& e){incomplete=std::string(e.what())=="anonymous-fd-read-incomplete";}
        detail_result_override={};check(incomplete&&short_read.rounds==1&&short_read.closed==0,"injected positive short vnode structure never close race");
#else
        send('d');bool denied=false;try{(void)Collect(child);}catch(const std::runtime_error& e){denied=std::string(e.what())=="permission-denied";}send('e');check(denied,"actual Linux nondumpable child denies proc FD observation");
#endif
        Sample aggregate;std::vector<ObservedFile> seen;AddObserved(aggregate,seen,1,2,8,1,4);AddObserved(aggregate,seen,1,2,16,2,4);AddObserved(aggregate,seen,1,2,4,1,4);
        check(aggregate.anonymousFiles==1&&aggregate.anonymousBytes==16&&aggregate.anonymousAllocated==1024,"duplicate maxima same round only");
        bool overflow=false;try{AddObserved(aggregate,seen,1,3,UINT64_MAX,1,4);}catch(const std::runtime_error&){overflow=true;}check(overflow,"maxima sum overflow rejects");
    }catch(const std::exception& e){++failed;std::cout<<"[fail] PM07 "<<e.what()<<std::endl;}
    before_fd_round={};after_fd_list={};before_fd_detail={};detail_result_override={};const char quit='q';write(commands[1],&quit,1);close(commands[1]);close(acks[0]);int status=0;waitpid(child,&status,0);check(WIFEXITED(status)&&WEXITSTATUS(status)==0,"transition child normal exit");
    return failed?1:0;
}
int main(int argc, char** argv) {
    if (argc == 2 && std::string(argv[1]) == "--transitions") return Transitions();
    if (argc == 2 && std::string(argv[1]) == "--parsers") return Parsers();
    std::vector<int> fds;
    std::vector<std::thread> threads;
    std::mutex mutex;
    std::condition_variable condition;
    bool release = false;
    std::atomic<int> ready{0};
    void* memory = MAP_FAILED;
    constexpr std::size_t size = 64 * 1024 * 1024;
    auto clear = [&] {
        { std::lock_guard<std::mutex> lock(mutex); release = true; }
        condition.notify_all();
        for (auto& thread : threads) thread.join();
        threads.clear();
        for (int fd : fds) close(fd);
        fds.clear();
        if (memory != MAP_FAILED) { munmap(memory, size); memory = MAP_FAILED; }
    };
    std::cout << "ready " << getpid() << std::endl;
    std::string command;
    while (std::getline(std::cin, command)) {
        if (command == "quit") break;
        if (command == "grow") {
            for (int i = 0; i < 16; ++i) {
                const int fd = open("/dev/null", O_RDONLY);
                if (fd < 0) { clear(); return 2; }
                fds.push_back(fd);
            }
            for (int i = 0; i < 3; ++i) threads.emplace_back([&] {
                std::unique_lock<std::mutex> lock(mutex);
                ++ready;
                condition.wait(lock, [&] { return release; });
            });
            memory = mmap(nullptr, size, PROT_READ | PROT_WRITE, MAP_PRIVATE | MAP_ANON, -1, 0);
            if (memory == MAP_FAILED) { clear(); return 2; }
            auto* bytes = static_cast<volatile unsigned char*>(memory);
            for (std::size_t i = 0; i < size; i += 4096) bytes[i] = static_cast<unsigned char>((i / 4096) % 251 + 1);
            while (ready.load() != 3) std::this_thread::yield();
            std::cout << "grown" << std::endl;
        } else if (command == "anonymous") {
            char name[]="metrics-anonymous-XXXXXX";const int fd=mkstemp(name);
            if(fd<0){clear();return 2;}fds.push_back(fd);
            const std::string payload(8192,'x');
            if(unlink(name)!=0||write(fd,payload.data(),payload.size())!=static_cast<ssize_t>(payload.size())){clear();return 2;}
            for(int i=0;i<2;++i){const int copy=dup(fd);if(copy<0){clear();return 2;}fds.push_back(copy);}
            std::cout<<"anonymous"<<std::endl;
        } else if (command == "release") {
            clear();
            std::cout << "released" << std::endl;
        } else { clear(); return 2; }
    }
    clear();
}

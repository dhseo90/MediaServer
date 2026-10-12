// 파일 용도: 외부 PID 자원 관측기. 순차 관측이며 카운터 전체의 원자적 스냅샷은 아니다.
#include <algorithm>
#include <array>
#ifdef RECORDING_METRICS_TESTING
#include <functional>
#endif
#include <charconv>
#include <cerrno>
#include <chrono>
#include <cstdint>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <limits>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>
#include <sys/stat.h>
#include <unistd.h>
#ifdef __APPLE__
#include <libproc.h>
#include <sys/proc_info.h>
#endif
namespace recording_metrics {
std::string ClassifyError(int code, const char* stage) {
    if (code == EACCES || code == EPERM) return "permission-denied";
    if (code == ESRCH || code == ENOENT) return "process-exited-or-absent";
    return stage;
}
std::string IoError(const char* stage) { return ClassifyError(errno, stage); }
bool Unsigned(const std::string& text, std::uint64_t& value) {
    if (text.empty() || text.find_first_not_of("0123456789") != std::string::npos) return false;
    const auto result = std::from_chars(text.data(), text.data() + text.size(), value);
    return result.ec == std::errc{} && result.ptr == text.data() + text.size();
}
bool ParsePid(const std::string& text, int& pid) {
    std::uint64_t number = 0;
    if (!Unsigned(text, number) || number == 0 || number > std::numeric_limits<int>::max()) return false;
    pid = static_cast<int>(number);
    return true;
}
bool ResidentBytes(const std::string& text, std::uint64_t page, std::uint64_t& bytes) {
    std::istringstream stream(text);
    std::string total, resident;
    std::uint64_t total_pages = 0, resident_pages = 0;
    if (!(stream >> total >> resident) || !Unsigned(total, total_pages) || !Unsigned(resident, resident_pages) ||
        page == 0 || resident_pages > std::numeric_limits<std::uint64_t>::max() / page) return false;
    bytes = resident_pages * page;
    return bytes > 0;
}
bool StatStart(const std::string& text, int pid, std::string& identity) {
    const auto open = text.find('('), close = text.rfind(')');
    if (open == std::string::npos || close == std::string::npos || close <= open || open < 2) return false;
    int observed = 0;
    if (!ParsePid(text.substr(0, open - 1), observed) || observed != pid) return false;
    std::istringstream fields(text.substr(close + 1));
    std::string field;
    for (int i = 3; i <= 22; ++i) if (!(fields >> field)) return false;
    std::uint64_t start = 0;
    if (!Unsigned(field, start) || start == 0) return false;
    identity = "linux:" + std::to_string(start);
    return true;
}
bool CompleteFdRead(int bytes, std::size_t capacity, std::size_t entry) {
    return bytes > 0 && entry > 0 && static_cast<std::size_t>(bytes) < capacity &&
        static_cast<std::size_t>(bytes) % entry == 0;
}
std::string FdExhaustionError(unsigned capacity, unsigned closed) {
    return "fd-observation-incomplete:capacity=" + std::to_string(capacity) + ":closed=" + std::to_string(closed);
}
// A failed round is diagnostic only. No partial cost is promoted to a sample.
std::uint64_t ClockMs() { return std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count(); }
struct FdFailure { int fd=-1, listedType=0, returned=0, error=0, nextType=-1; std::uint64_t at=0; };
struct Observation {
    std::uint64_t started=ClockMs(),completed=0,roundStarted=0,roundCompleted=0,detailCalls=0;
    unsigned rounds=0,capacity=0,closed=0;int lastFailure=-1;
    std::string start;
    std::array<FdFailure,4> failures{};
};
#ifdef RECORDING_METRICS_TESTING
inline std::function<void(unsigned)> before_fd_round;
inline std::function<void(unsigned)> after_fd_list;
inline std::function<void(int)> before_fd_detail;
inline std::function<void(int&,int&)> detail_result_override;
#endif
struct Sample { std::string start; std::uint64_t rss{0}, threads{0}, fds{0};
    bool anonymousMeasured{false},footprintMeasured{false};
    std::uint64_t anonymousBytes{0},anonymousAllocated{0},anonymousFiles{0},footprint{0};
};
struct ObservedFile {std::uint64_t dev,ino,bytes,allocated;};
void AddObserved(Sample& sample,std::vector<ObservedFile>& seen,std::uint64_t dev,std::uint64_t ino,std::uint64_t bytes,std::uint64_t blocks,std::size_t limit) {
    if(blocks>UINT64_MAX/512)throw std::runtime_error("anonymous-fd-size-overflow");
    const auto allocated=blocks*512;
    auto it=std::find_if(seen.begin(),seen.end(),[&](const auto& f){return f.dev==dev&&f.ino==ino;});
    const auto more=it==seen.end()?bytes:(bytes>it->bytes?bytes-it->bytes:0);
    const auto more_allocated=it==seen.end()?allocated:(allocated>it->allocated?allocated-it->allocated:0);
    if(more>UINT64_MAX-sample.anonymousBytes||more_allocated>UINT64_MAX-sample.anonymousAllocated)throw std::runtime_error("anonymous-fd-size-overflow");
    if(it==seen.end()){
        if(seen.size()>=limit)throw std::runtime_error("fd-capacity-limit");
        if(seen.size()==seen.capacity())seen.reserve(std::min(limit,std::max(std::size_t(64),seen.capacity()*2)));
        seen.push_back({dev,ino,bytes,allocated});++sample.anonymousFiles;
    }else{it->bytes=std::max(it->bytes,bytes);it->allocated=std::max(it->allocated,allocated);}
    sample.anonymousBytes+=more;sample.anonymousAllocated+=more_allocated;
}
#ifdef __APPLE__
std::string Identity(int pid) {
    proc_bsdinfo value{};
    errno = 0;
    const int read = proc_pidinfo(pid, PROC_PIDTBSDINFO, 0, &value, sizeof(value));
    if (read != sizeof(value) || value.pbi_pid != static_cast<unsigned>(pid) || value.pbi_start_tvsec == 0 || value.pbi_start_tvusec >= 1000000)
        throw std::runtime_error(IoError("process-identity-unavailable"));
    return "macos:" + std::to_string(value.pbi_start_tvsec) + ":" + std::to_string(value.pbi_start_tvusec);
}
Sample Collect(int pid, Observation* observation=nullptr) {
    Observation local;auto& diagnostic=observation?*observation:local;
    Sample sample;
    sample.start = Identity(pid);diagnostic.start=sample.start;
    proc_taskinfo info{};
    errno = 0;
    if (proc_pidinfo(pid, PROC_PIDTASKINFO, 0, &info, sizeof(info)) != sizeof(info) ||
        info.pti_resident_size == 0 || info.pti_threadnum <= 0) throw std::runtime_error(IoError("task-info-unavailable"));
    sample.rss = info.pti_resident_size;
    sample.threads = info.pti_threadnum;
    constexpr std::size_t max_bytes = 8 * 1024 * 1024;
    bool complete = false;
    unsigned capacity_retries=0, closed_retries=0;
    std::size_t minimum = 64 * sizeof(proc_fdinfo);
    for (int attempt = 0; attempt < 4; ++attempt) {
        diagnostic.rounds=attempt+1;diagnostic.roundStarted=ClockMs();
#ifdef RECORDING_METRICS_TESTING
        if(before_fd_round)before_fd_round(attempt);
#endif
        errno = 0;
        const int needed = proc_pidinfo(pid, PROC_PIDLISTFDS, 0, nullptr, 0);
        if (needed <= 0) throw std::runtime_error(IoError("fd-list-unavailable"));
        const auto requested = std::max(minimum, static_cast<std::size_t>(needed) * 2);
        if (requested > max_bytes) throw std::runtime_error("fd-capacity-limit");
        std::vector<proc_fdinfo> entries((requested + sizeof(proc_fdinfo) - 1) / sizeof(proc_fdinfo));
        const auto capacity = entries.size() * sizeof(proc_fdinfo);
        errno = 0;
        const int read = proc_pidinfo(pid, PROC_PIDLISTFDS, 0, entries.data(), static_cast<int>(capacity));
        if (read <= 0) throw std::runtime_error(IoError("fd-read-unavailable"));
        if (static_cast<std::size_t>(read) % sizeof(proc_fdinfo) != 0) throw std::runtime_error("fd-read-incomplete");
        if (CompleteFdRead(read, capacity, sizeof(proc_fdinfo))) {
            sample.fds = read / sizeof(proc_fdinfo);
            if(diagnostic.lastFailure>=0){
                auto& last=diagnostic.failures[diagnostic.lastFailure];last.nextType=0;
                for(std::size_t i=0;i<sample.fds;++i)if(static_cast<int>(entries[i].proc_fd)==last.fd){
                    last.nextType=entries[i].proc_fdtype;
                    // Prioritize the raced slot, but still re-read the ENTIRE new
                    // roster. Its FD number is not proof of object identity.
                    if(entries[i].proc_fdtype==PROX_FDTYPE_VNODE){std::swap(entries[0],entries[i]);}
                    break;
                }
            }
#ifdef RECORDING_METRICS_TESTING
            if(after_fd_list)after_fd_list(attempt);
#endif
            sample.anonymousBytes=sample.anonymousAllocated=sample.anonymousFiles=0;
            bool raced=false;
            // Each regular unlinked inode is counted once; these bytes are absent from root traversal.
            std::vector<ObservedFile> seen;
            // The roster and identity buffer share the existing8MiB ceiling.
            if(capacity>max_bytes-sizeof(Observation))throw std::runtime_error("fd-capacity-limit");
            const auto max_seen=(max_bytes-capacity-sizeof(Observation))/sizeof(ObservedFile);
            if(sample.fds>max_seen)throw std::runtime_error("fd-capacity-limit");
            seen.reserve(static_cast<std::size_t>(sample.fds));
            for(std::size_t i=0;i<sample.fds;++i){
                if(entries[i].proc_fdtype!=PROX_FDTYPE_VNODE)continue;
#ifdef RECORDING_METRICS_TESTING
                if(before_fd_detail)before_fd_detail(entries[i].proc_fd);
#endif
                vnode_fdinfo node{};errno=0;++diagnostic.detailCalls;
                int returned=proc_pidfdinfo(pid,entries[i].proc_fd,PROC_PIDFDVNODEINFO,&node,sizeof(node));
                int immediate_errno=errno;
#ifdef RECORDING_METRICS_TESTING
                if(detail_result_override)detail_result_override(returned,immediate_errno);
#endif
                if(returned!=sizeof(node)) {
                    diagnostic.lastFailure=attempt;diagnostic.failures[attempt]={static_cast<int>(entries[i].proc_fd),static_cast<int>(entries[i].proc_fdtype),returned,immediate_errno,-1,ClockMs()};
                    // A listed FD may close/reuse before inspection. Restart the complete
                    // bounded observation; never treat an unread descriptor as zero bytes.
                    if(returned<=0&&(immediate_errno==EBADF||immediate_errno==ENOENT)){raced=true;break;}
                    throw std::runtime_error(ClassifyError(immediate_errno,"anonymous-fd-read-incomplete"));
                }
                const auto& st=node.pvi.vi_stat;
                if(!S_ISREG(st.vst_mode)||st.vst_nlink!=0)continue;
                if(st.vst_size<0||st.vst_blocks<0)throw std::runtime_error("anonymous-fd-size-invalid");
                AddObserved(sample,seen,static_cast<std::uint64_t>(st.vst_dev),static_cast<std::uint64_t>(st.vst_ino),
                    static_cast<std::uint64_t>(st.vst_size),static_cast<std::uint64_t>(st.vst_blocks),max_seen);
            }
            if(raced){++closed_retries;diagnostic.closed=closed_retries;continue;}
            sample.anonymousMeasured=true;
            rusage_info_v2 usage{};
            if(proc_pid_rusage(pid,RUSAGE_INFO_V2,reinterpret_cast<rusage_info_t*>(&usage))==0){sample.footprintMeasured=true;sample.footprint=usage.ri_phys_footprint;}
            complete = true;
            break;
        }
        ++capacity_retries;diagnostic.capacity=capacity_retries;minimum = capacity * 2;
    }
    if (!complete) throw std::runtime_error(FdExhaustionError(capacity_retries,closed_retries));
    if (Identity(pid) != sample.start) throw std::runtime_error("process-identity-changed");
    diagnostic.roundCompleted=ClockMs();diagnostic.completed=diagnostic.roundCompleted;
    return sample;
}
#elif defined(__linux__)
std::string Read(const std::string& path) {
    errno = 0;
    std::ifstream input(path);
    if (!input) throw std::runtime_error(IoError("proc-read-unavailable"));
    std::string value(8192, '\0');
    input.read(value.data(), value.size());
    const auto read = input.gcount();
    if (input.bad() || read == 8192) throw std::runtime_error("proc-read-incomplete");
    value.resize(static_cast<std::size_t>(read));
    return value;
}
std::string Identity(int pid) {
    std::string value;
    if (!StatStart(Read("/proc/" + std::to_string(pid) + "/stat"), pid, value)) throw std::runtime_error("process-identity-unavailable");
    return value;
}
std::uint64_t Count(const std::string& path) {
    std::uint64_t count = 0;
    std::error_code error;
    std::filesystem::directory_iterator it(path, error), end;
    if (error) throw std::runtime_error(ClassifyError(error.value(), "proc-directory-unavailable"));
    for (; it != end; it.increment(error)) {
        if (error) throw std::runtime_error(ClassifyError(error.value(), "proc-directory-incomplete"));
        std::uint64_t number = 0;
        if (Unsigned(it->path().filename().string(), number)) ++count;
        if (count > 1048576) throw std::runtime_error("proc-directory-limit");
    }
    if (error) throw std::runtime_error(ClassifyError(error.value(), "proc-directory-incomplete"));
    return count; // 외부 PID이므로 관측기 자신의 directory FD를 차감하지 않는다.
}
Sample Collect(int pid, Observation* observation=nullptr) {
    Observation local;auto& diagnostic=observation?*observation:local;
    Sample sample;
    sample.start = Identity(pid);diagnostic.start=sample.start;
    const auto base = "/proc/" + std::to_string(pid);
    const long page = sysconf(_SC_PAGESIZE);
    if (page <= 0 || !ResidentBytes(Read(base + "/statm"), static_cast<std::uint64_t>(page), sample.rss)) throw std::runtime_error("rss-unavailable");
    sample.threads = Count(base + "/task");
    bool complete=false;
    for(unsigned attempt=0;attempt<4;++attempt){
        diagnostic.rounds=attempt+1;diagnostic.roundStarted=ClockMs();
#ifdef RECORDING_METRICS_TESTING
        if(before_fd_round)before_fd_round(attempt);
#endif
        sample.fds=sample.anonymousBytes=sample.anonymousAllocated=sample.anonymousFiles=0;
        std::vector<ObservedFile> seen;
        bool raced=false;std::error_code error;
        std::filesystem::directory_iterator it(base+"/fd",error),end;
        if(error)throw std::runtime_error(ClassifyError(error.value(),"proc-directory-unavailable"));
        for(;it!=end;it.increment(error)){
            if(error)throw std::runtime_error(ClassifyError(error.value(),"proc-directory-incomplete"));
            std::uint64_t number=0;if(!Unsigned(it->path().filename().string(),number))continue;
            if(++sample.fds>1048576)throw std::runtime_error("proc-directory-limit");
            // proc fd 링크를 따라 해당 열린 inode를 stat한다. leaf 이름의 '(deleted)' 문자열은 권위가 아니다.
            struct stat st{};
#ifdef RECORDING_METRICS_TESTING
            if(before_fd_detail)before_fd_detail(static_cast<int>(number));
#endif
            ++diagnostic.detailCalls;
            errno=0;int returned=stat(it->path().c_str(),&st);int immediate_errno=errno;
#ifdef RECORDING_METRICS_TESTING
            if(detail_result_override)detail_result_override(returned,immediate_errno);
#endif
            if(returned!=0){diagnostic.lastFailure=attempt;diagnostic.failures[attempt]={static_cast<int>(number),-1,returned,immediate_errno,-1,ClockMs()};if(immediate_errno==ENOENT){raced=true;++diagnostic.closed;break;}throw std::runtime_error(ClassifyError(immediate_errno,"anonymous-fd-read-incomplete"));}
            if(!S_ISREG(st.st_mode)||st.st_nlink!=0)continue;
            if(st.st_size<0||st.st_blocks<0)throw std::runtime_error("anonymous-fd-size-invalid");
            AddObserved(sample,seen,static_cast<std::uint64_t>(st.st_dev),static_cast<std::uint64_t>(st.st_ino),
                static_cast<std::uint64_t>(st.st_size),static_cast<std::uint64_t>(st.st_blocks),(8*1024*1024-sizeof(Observation))/sizeof(ObservedFile));
        }
        if(error)throw std::runtime_error(ClassifyError(error.value(),"proc-directory-incomplete"));
        if(!raced){complete=true;sample.anonymousMeasured=true;break;}
    }
    if(!complete)throw std::runtime_error(FdExhaustionError(0,4));
    if (sample.threads == 0) throw std::runtime_error("thread-count-unavailable");
    if (Identity(pid) != sample.start) throw std::runtime_error("process-identity-changed");
    diagnostic.roundCompleted=ClockMs();diagnostic.completed=diagnostic.roundCompleted;
    return sample;
}
#else
Sample Collect(int, Observation* =nullptr) { throw std::runtime_error("unsupported-platform"); }
#endif
} // namespace recording_metrics
#ifndef RECORDING_METRICS_NO_MAIN
int main(int argc, char** argv) {
    int pid = 0;
    recording_metrics::Sample sample;
    recording_metrics::Observation observation;
    std::string error;
    if (argc != 2 || !recording_metrics::ParsePid(argv[1], pid)) error = "invalid-pid";
    else {
        try { sample = recording_metrics::Collect(pid,&observation); }
        catch (const std::runtime_error& e) { error = e.what(); }
        catch (const std::exception&) { error = "measurement-unavailable"; }
    }
    const auto now = std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count();
    const bool valid = error.empty();
    observation.completed=recording_metrics::ClockMs();
    std::cout << "{\"pid\":" << (pid ? std::to_string(pid) : "null")
        << ",\"startIdentity\":" << (valid ? "\"" + sample.start + "\"" : "null")
        << ",\"rssBytes\":" << (valid ? std::to_string(sample.rss) : "null")
        << ",\"threadCount\":" << (valid ? std::to_string(sample.threads) : "null")
        << ",\"fdCount\":" << (valid ? std::to_string(sample.fds) : "null")
        << ",\"anonymousFileBytes\":" << (valid&&sample.anonymousMeasured?std::to_string(sample.anonymousBytes):"null")
        << ",\"anonymousAllocatedBytes\":" << (valid&&sample.anonymousMeasured?std::to_string(sample.anonymousAllocated):"null")
        << ",\"anonymousFiles\":" << (valid&&sample.anonymousMeasured?std::to_string(sample.anonymousFiles):"null")
        << ",\"footprintBytes\":" << (valid&&sample.footprintMeasured?std::to_string(sample.footprint):"null")
        << ",\"sampledAt\":" << now << ",\"valid\":" << (valid ? "true" : "false")
        << ",\"error\":" << (valid ? "null" : "\"" + error + "\"")
        << ",\"fdObservation\":{\"scope\":\"complete-round-sequential-v1\",\"complete\":" << (valid?"true":"false")
        << ",\"startIdentity\":" << (observation.start.empty()?"null":"\""+observation.start+"\"")
        << ",\"startedAt\":" << observation.started << ",\"completedAt\":" << observation.completed
        << ",\"roundStartedAt\":" << observation.roundStarted << ",\"roundCompletedAt\":" << observation.roundCompleted
        << ",\"rounds\":" << observation.rounds << ",\"capacityRetries\":" << observation.capacity << ",\"closedRetries\":" << observation.closed
        << ",\"detailCalls\":" << observation.detailCalls << ",\"failures\":[";
    bool comma=false;for(const auto& f:observation.failures)if(f.fd>=0){
        if(comma){std::cout<<",";}comma=true;
        std::cout<<"{\"fd\":"<<f.fd<<",\"listedType\":"<<f.listedType<<",\"returned\":"<<f.returned<<",\"errno\":"<<f.error<<",\"nextType\":"<<f.nextType<<",\"at\":"<<f.at<<"}";
    }
    std::cout<<"]}}\n";
    return valid ? 0 : 1;
}
#endif

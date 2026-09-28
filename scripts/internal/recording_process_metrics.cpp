// 파일 용도: 외부 PID 자원 관측기. 순차 관측이며 카운터 전체의 원자적 스냅샷은 아니다.
#include <algorithm>
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
struct Sample { std::string start; std::uint64_t rss{0}, threads{0}, fds{0}; };
#ifdef __APPLE__
std::string Identity(int pid) {
    proc_bsdinfo value{};
    errno = 0;
    const int read = proc_pidinfo(pid, PROC_PIDTBSDINFO, 0, &value, sizeof(value));
    if (read != sizeof(value) || value.pbi_pid != static_cast<unsigned>(pid) || value.pbi_start_tvsec == 0 || value.pbi_start_tvusec >= 1000000)
        throw std::runtime_error(IoError("process-identity-unavailable"));
    return "macos:" + std::to_string(value.pbi_start_tvsec) + ":" + std::to_string(value.pbi_start_tvusec);
}
Sample Collect(int pid) {
    Sample sample;
    sample.start = Identity(pid);
    proc_taskinfo info{};
    errno = 0;
    if (proc_pidinfo(pid, PROC_PIDTASKINFO, 0, &info, sizeof(info)) != sizeof(info) ||
        info.pti_resident_size == 0 || info.pti_threadnum <= 0) throw std::runtime_error(IoError("task-info-unavailable"));
    sample.rss = info.pti_resident_size;
    sample.threads = info.pti_threadnum;
    constexpr std::size_t max_bytes = 8 * 1024 * 1024;
    bool complete = false;
    std::size_t minimum = 64 * sizeof(proc_fdinfo);
    for (int attempt = 0; attempt < 4; ++attempt) {
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
            complete = true;
            break;
        }
        minimum = capacity * 2;
    }
    if (!complete) throw std::runtime_error("fd-list-saturated");
    if (Identity(pid) != sample.start) throw std::runtime_error("process-identity-changed");
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
Sample Collect(int pid) {
    Sample sample;
    sample.start = Identity(pid);
    const auto base = "/proc/" + std::to_string(pid);
    const long page = sysconf(_SC_PAGESIZE);
    if (page <= 0 || !ResidentBytes(Read(base + "/statm"), static_cast<std::uint64_t>(page), sample.rss)) throw std::runtime_error("rss-unavailable");
    sample.threads = Count(base + "/task");
    sample.fds = Count(base + "/fd");
    if (sample.threads == 0) throw std::runtime_error("thread-count-unavailable");
    if (Identity(pid) != sample.start) throw std::runtime_error("process-identity-changed");
    return sample;
}
#else
Sample Collect(int) { throw std::runtime_error("unsupported-platform"); }
#endif
} // namespace recording_metrics
#ifndef RECORDING_METRICS_NO_MAIN
int main(int argc, char** argv) {
    int pid = 0;
    recording_metrics::Sample sample;
    std::string error;
    if (argc != 2 || !recording_metrics::ParsePid(argv[1], pid)) error = "invalid-pid";
    else {
        try { sample = recording_metrics::Collect(pid); }
        catch (const std::runtime_error& e) { error = e.what(); }
        catch (const std::exception&) { error = "measurement-unavailable"; }
    }
    const auto now = std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count();
    const bool valid = error.empty();
    std::cout << "{\"pid\":" << (pid ? std::to_string(pid) : "null")
        << ",\"startIdentity\":" << (valid ? "\"" + sample.start + "\"" : "null")
        << ",\"rssBytes\":" << (valid ? std::to_string(sample.rss) : "null")
        << ",\"threadCount\":" << (valid ? std::to_string(sample.threads) : "null")
        << ",\"fdCount\":" << (valid ? std::to_string(sample.fds) : "null")
        << ",\"sampledAt\":" << now << ",\"valid\":" << (valid ? "true" : "false")
        << ",\"error\":" << (valid ? "null" : "\"" + error + "\"") << "}\n";
    return valid ? 0 : 1;
}
#endif

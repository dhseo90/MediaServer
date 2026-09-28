// 파일 용도: collector와 별도 프로세스로 실행하는 제어 가능한 자원 fixture.
#define RECORDING_METRICS_NO_MAIN
#include "recording_process_metrics.cpp"
#include <atomic>
#include <condition_variable>
#include <fcntl.h>
#include <mutex>
#include <sys/mman.h>
#include <thread>
int Parsers() {
    using namespace recording_metrics;
    int failures = 0, pid = 0;
    std::uint64_t value = 0;
    std::string identity;
    auto check = [&](bool ok, const char* name) {
        std::cout << (ok ? "[pass] " : "[fail] ") << "PM04 " << name << std::endl;
        if (!ok) ++failures;
    };
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
int main(int argc, char** argv) {
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
        } else if (command == "release") {
            clear();
            std::cout << "released" << std::endl;
        } else { clear(); return 2; }
    }
    clear();
}

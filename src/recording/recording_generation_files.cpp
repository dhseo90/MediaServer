#include "recording/recording_generation_files.h"
#include <algorithm>
#include <array>
#include <cerrno>
#include <memory>
#include <unordered_set>
#ifndef MEDIA_SERVER_USE_OPENSSL
#define MEDIA_SERVER_USE_OPENSSL 0
#endif
#if MEDIA_SERVER_USE_OPENSSL
#include <openssl/evp.h>
#endif
#if !defined(_WIN32)
#include <fcntl.h>
#include <sys/file.h>
#include <sys/stat.h>
#include <unistd.h>
#endif

namespace recording {
namespace {
[[maybe_unused]] constexpr std::uint64_t kFileLimit = 1024ULL * 1024 * 1024;
[[maybe_unused]] constexpr std::size_t kSourceLimit = 64;
bool Fail(std::string* error, const char* message) {
    if (error) *error = message;
    return false;
}
[[maybe_unused]] bool SourceName(const std::string& name) {
    return !name.empty() && name.size() <= 255 && name != "." && name != ".." &&
        name != "recording-generation.json" && name.rfind(".recording-", 0) != 0 &&
        name.rfind("evidence-", 0) != 0 && name.rfind("snapshot-", 0) != 0 &&
        std::all_of(name.begin(), name.end(), [](unsigned char c) {
            return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
                (c >= '0' && c <= '9') || c == '-' || c == '_' || c == '.';
        });
}
#if !defined(_WIN32) && MEDIA_SERVER_USE_OPENSSL
struct Fd {
    int value{-1};
    explicit Fd(int fd = -1) : value(fd) {}
    ~Fd() { if (value >= 0) ::close(value); }
    Fd(const Fd&) = delete;
    Fd& operator=(const Fd&) = delete;
};
bool Sync(int fd) {
    int status;
    do { status = ::fsync(fd); } while (status < 0 && errno == EINTR);
    return status == 0;
}
int OpenRoot(const std::filesystem::path& root) {
    if (!root.is_absolute() || root == root.root_path()) return -1;
    for (const auto& part : root) if (part == ".." || part == ".") return -1;
    int fd = ::open("/", O_RDONLY | O_DIRECTORY | O_CLOEXEC);
    for (const auto& part : root.relative_path()) {
        if (fd < 0) return -1;
        const int next = ::openat(fd, part.c_str(), O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_CLOEXEC);
        ::close(fd);
        fd = next;
    }
    return fd;
}
bool RootSame(const std::filesystem::path& root, int fd) {
    Fd fresh(OpenRoot(root));
    struct stat a{}, b{};
    return fresh.value >= 0 && ::fstat(fd, &a) == 0 && ::fstat(fresh.value, &b) == 0 &&
        a.st_dev == b.st_dev && a.st_ino == b.st_ino;
}
bool Regular(int fd, struct stat* value) {
    return ::fstat(fd, value) == 0 && S_ISREG(value->st_mode) &&
        value->st_nlink == 1 && value->st_size >= 0;
}
bool Same(int root, const std::string& name, int fd, const struct stat& expected) {
    struct stat actual{}, named{};
    if (!Regular(fd, &actual) || ::fstatat(root, name.c_str(), &named, AT_SYMLINK_NOFOLLOW) != 0)
        return false;
    return S_ISREG(named.st_mode) && named.st_nlink == 1 &&
        actual.st_dev == expected.st_dev && actual.st_ino == expected.st_ino &&
        actual.st_size == expected.st_size && named.st_dev == actual.st_dev &&
        named.st_ino == actual.st_ino && named.st_size == actual.st_size;
}
bool TimeSame(const struct stat& a, const struct stat& b) {
#if defined(__APPLE__)
    return a.st_mtimespec.tv_sec == b.st_mtimespec.tv_sec &&
        a.st_mtimespec.tv_nsec == b.st_mtimespec.tv_nsec &&
        a.st_ctimespec.tv_sec == b.st_ctimespec.tv_sec &&
        a.st_ctimespec.tv_nsec == b.st_ctimespec.tv_nsec;
#else
    return a.st_mtim.tv_sec == b.st_mtim.tv_sec && a.st_mtim.tv_nsec == b.st_mtim.tv_nsec &&
        a.st_ctim.tv_sec == b.st_ctim.tv_sec && a.st_ctim.tv_nsec == b.st_ctim.tv_nsec;
#endif
}
bool Lock(int root, Fd* lock) {
    constexpr const char* name = ".recording-generation.lock";
    lock->value = ::openat(root, name, O_RDWR | O_CREAT | O_NOFOLLOW | O_CLOEXEC | O_NONBLOCK, 0600);
    struct stat state{};
    return lock->value >= 0 && Regular(lock->value, &state) && state.st_size == 0 &&
        ::flock(lock->value, LOCK_EX | LOCK_NB) == 0 && Same(root, name, lock->value, state);
}
class Digest {
public:
    Digest() : context_(EVP_MD_CTX_new(), EVP_MD_CTX_free) {}
    bool Start() { return context_ && EVP_DigestInit_ex(context_.get(), EVP_sha256(), nullptr) == 1; }
    bool Add(const void* bytes, std::size_t size) {
        return EVP_DigestUpdate(context_.get(), bytes, size) == 1;
    }
    bool Finish(std::string* result) {
        unsigned char bytes[32];
        unsigned count = 0;
        if (EVP_DigestFinal_ex(context_.get(), bytes, &count) != 1 || count != 32) return false;
        constexpr char hex[] = "0123456789abcdef";
        result->clear();
        for (auto byte : bytes) { *result += hex[byte >> 4]; *result += hex[byte & 15]; }
        return true;
    }
private:
    std::unique_ptr<EVP_MD_CTX, decltype(&EVP_MD_CTX_free)> context_;
};
bool WriteAll(int fd, const char* bytes, std::size_t size) {
    std::size_t offset = 0;
    while (offset < size) {
        ssize_t count;
        do { count = ::write(fd, bytes + offset, size - offset); } while (count < 0 && errno == EINTR);
        if (count <= 0) return false;
        offset += static_cast<std::size_t>(count);
    }
    return true;
}
// 출처 bytes를 순차 읽고 필요할 때만 출력한다. caller FD offset은 변경하지 않는다.
bool Stream(int source, std::uint64_t size, int output, std::string* hash) {
    Digest digest;
    if (!digest.Start()) return false;
    std::array<char, 65536> buffer{};
    std::uint64_t offset = 0;
    while (offset < size) {
        const auto wanted = static_cast<std::size_t>(std::min<std::uint64_t>(buffer.size(), size - offset));
        ssize_t count;
        do { count = ::pread(source, buffer.data(), wanted, static_cast<off_t>(offset)); }
        while (count < 0 && errno == EINTR);
        if (count <= 0 || !digest.Add(buffer.data(), static_cast<std::size_t>(count))) return false;
        if (output >= 0 && !WriteAll(output, buffer.data(), static_cast<std::size_t>(count))) return false;
        offset += static_cast<std::uint64_t>(count);
    }
    return digest.Finish(hash);
}
void Observe(int fd, RecordingGenerationCreatedFile* report) {
    struct stat state{};
    if (Regular(fd, &state)) {
        report->device = static_cast<std::uint64_t>(state.st_dev);
        report->inode = static_cast<std::uint64_t>(state.st_ino);
        report->size = static_cast<std::uint64_t>(state.st_size);
    }
}
int Create(int root, RecordingGenerationCreatedFile* report) {
    const int fd = ::openat(root, report->name.c_str(), O_RDWR | O_CREAT | O_EXCL | O_NOFOLLOW | O_CLOEXEC, 0600);
    if (fd >= 0) { report->created = true; Observe(fd, report); }
    return fd;
}
bool FinishFile(int root, int fd, RecordingGenerationCreatedFile* report, std::uint64_t expected_size) {
    Observe(fd, report);
    struct stat state{};
    if (!Regular(fd, &state) || static_cast<std::uint64_t>(state.st_size) != expected_size ||
        !Sync(fd) || !Same(root, report->name, fd, state)) return false;
    report->complete = true;
    return true;
}
#endif
} // namespace

bool PrepareRecordingGenerationFiles(const std::filesystem::path& root,
    const std::string& store_id, std::uint64_t generation, std::uint64_t cut_ordinal,
    std::string_view snapshot, const std::vector<RecordingGenerationSource>& sources,
    RecordingGenerationPreparation* result, std::string* error) {
    if (!result) return Fail(error, "generation preparation output missing");
    // 이미 소유권 보고가 있는 객체를 덮어쓰면 정리 근거를 잃는다.
    if (result->ready || !result->files.empty()) return Fail(error, "generation preparation requires fresh output");
#if !defined(_WIN32) && MEDIA_SERVER_USE_OPENSSL
    if (snapshot.size() > kFileLimit || sources.size() > kSourceLimit)
        return Fail(error, "generation preparation size/count limit");
    RecordingGenerationManifest manifest;
    manifest.store_id = store_id;
    manifest.generation = generation;
    manifest.cut_ordinal = cut_ordinal;
    const auto suffix = std::to_string(generation);
    manifest.snapshot = {"snapshot-" + suffix + ".jsonl", snapshot.size(), std::string(64, '0')};
    manifest.active = {"active-" + suffix + ".jsonl", 0, std::string(64, '0')};
    std::unordered_set<std::string> names{manifest.snapshot.name, manifest.active.name};
    for (std::size_t i = 0; i < sources.size(); ++i) {
        const auto name = "evidence-" + suffix + "-" + std::to_string(i) + ".jsonl";
        manifest.evidence.push_back({name, sources[i].expected_size, sources[i].expected_sha256});
        names.insert(name);
    }
    std::string canonical;
    if (!SerializeRecordingGenerationManifest(manifest, &canonical, error)) return false;
    std::unordered_set<std::string> source_names;
    for (const auto& source : sources) {
        if (source.fd < 0 || !SourceName(source.source_name) || names.count(source.source_name) ||
            !source_names.insert(source.source_name).second)
            return Fail(error, "generation source fd/name/collision invalid");
    }
    Fd directory(OpenRoot(root)), lock;
    if (directory.value < 0 || !Lock(directory.value, &lock))
        return Fail(error, "generation root/lock unsafe");
    std::vector<struct stat> source_states(sources.size());
    for (std::size_t i = 0; i < sources.size(); ++i) {
        const auto& source = sources[i];
        auto& state = source_states[i];
        std::string hash;
        if (!Regular(source.fd, &state) || static_cast<std::uint64_t>(state.st_size) != source.expected_size ||
            !Same(directory.value, source.source_name, source.fd, state) ||
            !Stream(source.fd, source.expected_size, -1, &hash) || hash != source.expected_sha256)
            return Fail(error, "generation source initial identity/hash failed");
    }
    // 파일명과 소유권 보고용 할당을 모두 출력 생성 전에 마친다.
    result->files.reserve(sources.size() + 2);
    result->files.push_back({manifest.snapshot.name});
    for (const auto& evidence : manifest.evidence) result->files.push_back({evidence.name});
    result->files.push_back({manifest.active.name});
    {
        auto& report = result->files.front();
        Fd output(Create(directory.value, &report));
        Digest digest;
        bool ok = output.value >= 0 && digest.Start();
        for (std::size_t offset = 0; ok && offset < snapshot.size();) {
            const auto size = std::min<std::size_t>(65536, snapshot.size() - offset);
            ok = digest.Add(snapshot.data() + offset, size) && WriteAll(output.value, snapshot.data() + offset, size);
            offset += size;
        }
        if (output.value >= 0) Observe(output.value, &report);
        if (!ok || !digest.Finish(&manifest.snapshot.sha256) ||
            !FinishFile(directory.value, output.value, &report, snapshot.size()))
            return Fail(error, "generation snapshot prepare failed; created files preserved");
    }
    for (std::size_t i = 0; i < sources.size(); ++i) {
        auto& report = result->files[i + 1];
        const auto& source = sources[i];
        Fd output(Create(directory.value, &report));
        std::string copied_hash, final_hash;
        const bool copied = output.value >= 0 && Stream(source.fd, source.expected_size, output.value, &copied_hash);
        if (output.value >= 0) Observe(output.value, &report);
        struct stat after{};
        if (!copied || copied_hash != source.expected_sha256 ||
            !Stream(source.fd, source.expected_size, -1, &final_hash) || final_hash != source.expected_sha256 ||
            !Regular(source.fd, &after) || !TimeSame(source_states[i], after) ||
            !Same(directory.value, source.source_name, source.fd, source_states[i]) ||
            !FinishFile(directory.value, output.value, &report, source.expected_size))
            return Fail(error, "generation evidence prepare/source changed; created files preserved");
    }
    {
        auto& report = result->files.back();
        Fd output(Create(directory.value, &report));
        Digest digest;
        if (output.value < 0 || !digest.Start() || !digest.Finish(&manifest.active.sha256) ||
            !FinishFile(directory.value, output.value, &report, 0))
            return Fail(error, "generation active prepare failed; created files preserved");
    }
    if (!Sync(directory.value) || !RootSame(root, directory.value))
        return Fail(error, "generation preparation directory durability/binding uncertain; files preserved");
    result->manifest = std::move(manifest);
    result->ready = true;
    if (error) error->clear();
    return true;
#else
    (void)root; (void)store_id; (void)generation; (void)cut_ordinal; (void)snapshot; (void)sources;
    return Fail(error, "generation files unsupported: POSIX/OpenSSL required");
#endif
}

} // namespace recording

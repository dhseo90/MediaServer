// 파일 용도: 녹화 세대 파일 생성·검증·소유권 계약을 smoke로 검증한다.
// B-02 파일 준비 단위 fixture. snapshot 의미/실제 catalog 통합 검증은 아니다.
#include "recording/recording_generation_files.h"
#include <array>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <iterator>
#include <string>
#include <vector>
#if !defined(_WIN32)
#include <fcntl.h>
#include <sys/stat.h>
#include <unistd.h>
#endif
#ifndef MEDIA_SERVER_USE_OPENSSL
#define MEDIA_SERVER_USE_OPENSSL 0
#endif
namespace {
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
const std::string abc_hash = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
void Write(const std::filesystem::path& path, const std::string& bytes) {
    std::ofstream output(path, std::ios::binary);
    output << bytes;
    if (!output) throw std::runtime_error("fixture write failed");
}
std::string Read(const std::filesystem::path& path) {
    std::ifstream input(path, std::ios::binary);
    if (!input) throw std::runtime_error("fixture read failed");
    return std::string(std::istreambuf_iterator<char>(input), {});
}
#endif
} // namespace
int main() {
    using namespace recording;
    std::array<bool, 6> results{true, true, true, true, true, true};
    std::array<unsigned, 6> assertions{};
    const std::array<const char*, 6> titles{
        "B02-F01 preparation", "B02-F02 input bounds", "B02-F03 source binding",
        "B02-F04 interrupted files and cleanup", "B02-F05 publication and reopen", "B02-F06 crypto-off"};
    const auto check = [&](unsigned group, bool ok, const char* description) {
        ++assertions[group - 1];
        results[group - 1] = results[group - 1] && ok;
        if (!ok) std::cout << "[assertion] " << titles[group - 1] << ": " << description << '\n';
    };
    std::string error;
#if !MEDIA_SERVER_USE_OPENSSL || defined(_WIN32)
    RecordingGenerationPreparation result;
    check(6, !PrepareRecordingGenerationFiles("/invalid", "store-test", 1, 1, "abc", {}, &result, &error) &&
        error.find("unsupported") != std::string::npos, "prepare unsupported");
    check(6, !result.ready && result.files.empty(), "no preparation reported");
#else
    const auto parent = std::filesystem::canonical(std::filesystem::temp_directory_path());
    const auto pattern = (parent / "recording-generation-files-XXXXXX").string();
    std::vector<char> buffer(pattern.begin(), pattern.end()); buffer.push_back('\0');
    const char* created = ::mkdtemp(buffer.data());
    if (!created) { std::cerr << "fixture root failed\n"; return 1; }
    const std::filesystem::path root(created);
    struct stat original{}, original_parent{};
    const bool owned = ::lstat(root.c_str(), &original) == 0 && S_ISDIR(original.st_mode) &&
        original.st_uid == ::geteuid() && ::lstat(parent.c_str(), &original_parent) == 0 &&
        S_ISDIR(original_parent.st_mode);
    int source_fd = -1, other_fd = -1;
    try {
        if (!owned) throw std::runtime_error("fixture ownership failed");
        Write(root / "source.jsonl", "abc");
        Write(root / "other.jsonl", "abc");
        source_fd = ::open((root / "source.jsonl").c_str(), O_RDONLY | O_NOFOLLOW);
        other_fd = ::open((root / "other.jsonl").c_str(), O_RDONLY | O_NOFOLLOW);
        if (source_fd < 0 || other_fd < 0) throw std::runtime_error("fixture source open failed");
        const RecordingGenerationSource source{source_fd, "source.jsonl", 3, abc_hash};
        const auto prepare = [&](std::uint64_t generation, const std::vector<RecordingGenerationSource>& sources,
                                 RecordingGenerationPreparation* result) {
            return PrepareRecordingGenerationFiles(root, "store-test", generation, generation,
                "abc", sources, result, &error);
        };
        ::lseek(source_fd, 1, SEEK_SET);
        RecordingGenerationPreparation prepared;
        check(1, prepare(1, {source}, &prepared), "prepare succeeds");
        check(1, prepared.ready && prepared.files.size() == 3 && prepared.manifest.evidence.size() == 1,
              "preparation report complete");
        check(1, Read(root / "snapshot-1.jsonl") == "abc" && Read(root / "evidence-1-0.jsonl") == "abc" &&
            Read(root / "active-1.jsonl").empty(), "exact output bytes");
        check(1, prepared.manifest.snapshot.sha256 == abc_hash && prepared.manifest.evidence[0].sha256 == abc_hash &&
            prepared.manifest.active.size == 0, "descriptors match");
        check(1, ::lseek(source_fd, 0, SEEK_CUR) == 1 && Read(root / "source.jsonl") == "abc", "source unchanged");
        bool reports = true;
        for (const auto& item : prepared.files) {
            struct stat actual{};
            reports = reports && item.created && item.complete && ::lstat((root / item.name).c_str(), &actual) == 0 &&
                item.inode == static_cast<std::uint64_t>(actual.st_ino) && item.device == static_cast<std::uint64_t>(actual.st_dev) &&
                item.size == static_cast<std::uint64_t>(actual.st_size);
        }
        check(1, reports, "created file ownership report");
        check(5, !std::filesystem::exists(root / "recording-generation.json"), "prepare does not publish");
        check(5, PublishRecordingGenerationManifest(root, prepared.manifest, &error) ==
            RecordingGenerationPublishResult::Published, "publish prepared files");
        RecordingGenerationReadResult reopened;
        check(5, ReadRecordingGenerationManifest(root, &reopened, &error) && reopened.manifest.generation == 1,
              "reopen published manifest");
        const auto old_manifest = Read(root / "recording-generation.json");
        const auto rejected = [&](unsigned group, std::uint64_t generation,
                                  std::vector<RecordingGenerationSource> sources, const char* title) {
            RecordingGenerationPreparation output;
            check(group, !prepare(generation, sources, &output) && !output.ready && output.files.empty(), title);
        };
        rejected(2, 0, {source}, "zero generation");
        auto invalid = source; invalid.expected_size = 1024ULL * 1024 * 1024 + 1;
        rejected(2, 2, {invalid}, "source size bound");
        rejected(2, 2, std::vector<RecordingGenerationSource>(65, source), "source count bound");
        invalid = source; invalid.source_name = "../source.jsonl";
        rejected(2, 2, {invalid}, "source path traversal");
        invalid = source; invalid.source_name = "snapshot-2.jsonl";
        rejected(2, 2, {invalid}, "output and archived snapshot source rejected");
        invalid = source; invalid.source_name = "evidence-1-0.jsonl";
        rejected(2, 2, {invalid}, "old archive is not copied");
        invalid = source; invalid.source_name = "identity-1.jsonl";
        rejected(2, 2, {invalid}, "old identity shard is not copied");
        rejected(2, 2, {source, source}, "duplicate source name");
        invalid = source; invalid.expected_sha256 = "bad";
        rejected(2, 2, {invalid}, "hash encoding");
        invalid = source; invalid.fd = -1;
        rejected(3, 2, {invalid}, "invalid FD");
        invalid = source; invalid.fd = other_fd;
        rejected(3, 2, {invalid}, "FD and path mismatch");
        invalid = source; invalid.expected_size = 2;
        rejected(3, 2, {invalid}, "source size mismatch");
        invalid = source; invalid.expected_sha256 = std::string(64, '0');
        rejected(3, 2, {invalid}, "source hash mismatch");
        std::filesystem::create_symlink(root / "source.jsonl", root / "source-link.jsonl");
        invalid = source; invalid.source_name = "source-link.jsonl";
        rejected(3, 2, {invalid}, "source symlink");
        std::filesystem::create_hard_link(root / "source.jsonl", root / "hardlink.jsonl");
        rejected(3, 2, {source}, "source hardlink");
        std::filesystem::remove(root / "hardlink.jsonl");
        std::filesystem::create_directory_symlink(root, root / "alias");
        RecordingGenerationPreparation unsafe;
        check(3, !PrepareRecordingGenerationFiles(root / "alias", "store-test", 2, 2, "abc", {source}, &unsafe, &error),
              "symlink root");
        std::filesystem::remove(root / "alias");
        check(4, !prepare(2, {source}, &prepared), "owned result cannot be overwritten");
        Write(root / "active-2.jsonl", "interrupted");
        RecordingGenerationPreparation partial;
        check(4, !prepare(2, {source}, &partial) && !partial.ready, "interrupted active blocks preparation");
        check(4, partial.files.size() == 3 && partial.files[0].created && partial.files[0].complete &&
            partial.files[1].created && partial.files[1].complete && !partial.files[2].created,
              "partial ownership report retained");
        check(4, Read(root / "active-2.jsonl") == "interrupted" && Read(root / "snapshot-2.jsonl") == "abc" &&
            Read(root / "recording-generation.json") == old_manifest, "partial files and old manifest preserved");
        RecordingGenerationPreparation retry;
        check(4, !prepare(2, {source}, &retry) && !retry.files.empty() && !retry.files[0].created,
              "O_EXCL retry refuses overwrite");
        std::filesystem::create_symlink(root / "source.jsonl", root / "snapshot-5.jsonl");
        RecordingGenerationPreparation linked_output;
        check(4, !prepare(5, {source}, &linked_output) && !linked_output.files.empty() && !linked_output.files[0].created &&
            std::filesystem::is_symlink(root / "snapshot-5.jsonl"), "output symlink preserved and rejected");
        std::filesystem::create_hard_link(root / "other.jsonl", root / "snapshot-6.jsonl");
        RecordingGenerationPreparation hardlinked_output;
        check(4, !prepare(6, {source}, &hardlinked_output) && !hardlinked_output.files.empty() && !hardlinked_output.files[0].created &&
            Read(root / "snapshot-6.jsonl") == "abc", "output hardlink preserved and rejected");
        std::filesystem::remove(root / "snapshot-6.jsonl");
        RecordingGenerationPreparation next;
        const RecordingGenerationSource next_source{other_fd, "other.jsonl", 3, abc_hash};
        check(5, prepare(3, {next_source}, &next), "prepare next generation");
        check(5, PublishRecordingGenerationManifest(root, next.manifest, &error) ==
            RecordingGenerationPublishResult::Published, "explicit publish of fixture-validated bytes");
        check(5, ReadRecordingGenerationManifest(root, &reopened, &error) && reopened.manifest.generation == 3 &&
            reopened.manifest.evidence.size() == 1 && reopened.manifest.evidence[0].name == "evidence-3-0.jsonl" &&
            Read(root / "evidence-1-0.jsonl") == "abc", "new evidence only; old archive preserved");
#if defined(MEDIA_SERVER_RECORDING_GENERATION_TESTING)
        RecordingGenerationPreparation uncertain;
        check(5, prepare(4, {}, &uncertain), "prepare before explicit uncertain publish");
        RecordingGenerationFailNextDirectorySyncForTest();
        check(5, PublishRecordingGenerationManifest(root, uncertain.manifest, &error) ==
            RecordingGenerationPublishResult::DurabilityUncertain && uncertain.ready, "uncertain publish is not success");
        check(5, ReadRecordingGenerationManifest(root, &reopened, &error) && reopened.manifest.generation == 4,
              "uncertain published generation can be reopened");
#else
        check(5, false, "fixture requires test fault hook");
#endif
        check(3, Read(root / "source.jsonl") == "abc" && ::lseek(source_fd, 0, SEEK_CUR) == 1,
              "all rejection paths preserve source bytes and offset");
    } catch (const std::exception& exception) {
        std::cerr << exception.what() << '\n';
        for (unsigned group : {1, 2, 3, 4, 5}) check(group, false, "fixture aborted");
    }
    if (source_fd >= 0) ::close(source_fd);
    if (other_fd >= 0) ::close(other_fd);
    struct stat current{}, current_parent{};
    const bool still_owned = owned && root.parent_path() == parent &&
        root.filename().string().rfind("recording-generation-files-", 0) == 0 &&
        ::lstat(parent.c_str(), &current_parent) == 0 && S_ISDIR(current_parent.st_mode) &&
        current_parent.st_dev == original_parent.st_dev && current_parent.st_ino == original_parent.st_ino &&
        ::lstat(root.c_str(), &current) == 0 && S_ISDIR(current.st_mode) &&
        current.st_dev == original.st_dev && current.st_ino == original.st_ino &&
        current.st_uid == original.st_uid && current.st_uid == ::geteuid();
    std::error_code cleanup;
    if (still_owned) std::filesystem::remove_all(root, cleanup);
    check(4, still_owned && !cleanup && !std::filesystem::exists(root), "owned fixture cleanup");
#endif
    unsigned passed = 0, failed = 0;
    for (std::size_t i = 0; i < results.size(); ++i) {
        if (!assertions[i]) continue;
        (results[i] ? passed : failed)++;
        std::cout << (results[i] ? "[pass] " : "[fail] ") << titles[i] << " assertions=" << assertions[i] << '\n';
    }
    std::cout << "[summary] pass=" << passed << " fail=" << failed << '\n';
    return failed ? 1 : 0;
}

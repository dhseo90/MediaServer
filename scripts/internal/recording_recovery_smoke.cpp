// 파일 용도: 실제 journal I/O를 통해 S08-B1 미commit tail의 append 유실을 재현한다.
#include "recording/recording_journal.h"
#include "recording/recording_catalog.h"
#include <filesystem>
#include <fstream>
#include <iostream>
#include <iterator>
#include <string>

namespace fs = std::filesystem;
int passed = 0, failed = 0;
void Expect(bool ok, const std::string& label) {
    std::cout << (ok ? "[pass] " : "[fail] ") << label << '\n';
    ok ? ++passed : ++failed;
}
std::string Read(const fs::path& path) {
    std::ifstream in(path, std::ios::binary);
    return {std::istreambuf_iterator<char>(in), std::istreambuf_iterator<char>()};
}
void Write(const fs::path& path, const std::string& bytes) {
    std::ofstream out(path, std::ios::binary); out << bytes;
    if (!out) throw std::runtime_error("test fixture write failed");
}
recording::RecordingMutationV1 Mutation(const std::string& id) {
    recording::RecordingMutationV1 m;
    m.mutation_id = id; m.mutation_type = recording::RecordingMutationType::CorruptionDetected;
    m.occurred_at_ms = 1000; m.entity_id = "segment-one"; return m;
}
int main(int argc, char** argv) {
    if (argc < 2 || argc > 3) return 2;
    const std::string mode = argc == 3 ? argv[2] : "";
    if (!mode.empty() && mode != "--red-tail" && mode != "--red-io") return 2;
    const fs::path root(argv[1]);
    const auto first = Mutation("mutation-first"), next = Mutation("mutation-next");
    const std::string prefix = recording::SerializeRecordingMutationV1(first) + "\n";
    if (mode == "--red-io") {
        const auto path = root / "catalog-io.jsonl";
        recording::RecordingJournal journal(path); std::string error;
        Expect(journal.Open(&error), "catalog IO journal open");
        fs::rename(path, root / "catalog-old.jsonl"); Write(path, "replacement");
        recording::RecordingCatalog catalog(journal, {root / "catalog.db", root, false});
        Expect(!catalog.Open(&error), "catalog refuses failed journal Replay");
        std::cout << "[recording-recovery] pass=" << passed << " fail=" << failed << '\n';
        return failed == 0 ? 0 : 1;
    }
    for (const auto& name : {"truncated", "complete-no-lf"}) {
        const fs::path path = root / (std::string(name) + ".jsonl");
        const std::string tail = std::string(name) == "truncated" ? "{\"schema\":\"cut" :
            recording::SerializeRecordingMutationV1(Mutation("mutation-uncommitted"));
        Write(path, prefix + tail);
        recording::RecordingJournal journal(path); std::string error;
        Expect(journal.Open(&error), std::string(name) + " open");
        Expect(journal.Replay().truncated_tail_count == 1, std::string(name) + " uncommitted before append");
        Expect(journal.Append(next, &error), std::string(name) + " append: " + error);
        const auto replay = journal.Replay();
        Expect(replay.mutations.size() == 2 && replay.mutations.back().mutation_id == "mutation-next",
               std::string(name) + " valid2 and next ID preserved");
        if (mode.empty()) {
            const auto archive = fs::path(path.string() + ".tail-" + std::to_string(prefix.size()) + "-" + std::to_string(tail.size()) + "-0");
            Expect(Read(archive) == tail, std::string(name) + " quarantine byte exact");
            const auto before = Read(path);
            recording::RecordingJournal restart(path);
            Expect(restart.Open(&error) && restart.Replay().mutations.size() == 2 && Read(path) == before,
                   std::string(name) + " restart no mutation");
            Expect(restart.Append(Mutation("mutation-third"), &error) && restart.Replay().mutations.size() == 3,
                   std::string(name) + " second append retained");
            Expect(!fs::exists(archive.string().substr(0, archive.string().size() - 1) + "1"), std::string(name) + " no redundant archive");
        }
    }
    if (mode.empty()) {
        std::string error;
        const auto empty_path = root / "empty.jsonl";
        recording::RecordingJournal empty(empty_path);
        Expect(empty.Open(&error) && empty.Replay().mutations.empty() && empty.Replay().io_error_count == 0,
               "empty journal is valid");
        Expect(empty.Append(first, &error) && empty.Replay().mutations.size() == 1, "empty append retained");
        std::string large;
        for (int i = 0; i < 10000; ++i) large += prefix;
        const auto normal_path = root / "normal.jsonl"; Write(normal_path, large);
        recording::RecordingJournal normal(normal_path);
        Expect(normal.Open(&error) && normal.Append(next, &error) && Read(normal_path) == large + recording::SerializeRecordingMutationV1(next) + "\n",
               "large newline prefix byte preserved");
        const auto middle_path = root / "middle.jsonl"; Write(middle_path, prefix + "broken-line\n" + prefix);
        recording::RecordingJournal middle(middle_path);
        Expect(middle.Open(&error) && middle.Append(next, &error) && middle.Replay().mutations.size() == 3 &&
               middle.Replay().corrupt_line_count == 1 && Read(middle_path).find("broken-line\n") == prefix.size(),
               "middle corrupt line preserved and valid entries read");
        for (const auto& kind : {"directory", "symlink", "hardlink", "exact"}) {
            const auto path = root / (std::string("quarantine-") + kind + ".jsonl");
            const std::string tail = "uncommitted-tail"; Write(path, prefix + tail);
            const auto archive = fs::path(path.string() + ".tail-" + std::to_string(prefix.size()) + "-" + std::to_string(tail.size()) + "-0");
            if (std::string(kind) == "directory") fs::create_directory(archive);
            if (std::string(kind) == "symlink") fs::create_symlink(normal_path, archive);
            if (std::string(kind) == "hardlink") fs::create_hard_link(normal_path, archive);
            if (std::string(kind) == "exact") Write(archive, tail);
            recording::RecordingJournal journal(path);
            Expect(journal.Open(&error), std::string(kind) + " quarantine journal open");
            const bool appended = journal.Append(next, &error);
            if (std::string(kind) == "exact") {
                Expect(appended && Read(archive) == tail && journal.Replay().mutations.size() == 2,
                       "existing exact quarantine restart reuse");
            } else Expect(!appended && Read(path) == prefix + tail, std::string(kind) + " quarantine failure original unchanged");
            fs::remove(archive);
        }
        const auto target = root / "target.jsonl"; Write(target, prefix);
        const auto sym = root / "symlink.jsonl"; fs::create_symlink(target, sym);
        recording::RecordingJournal symlink(sym);
        Expect(!symlink.Open(&error) && symlink.Replay().io_error_count == 1 && Read(target) == prefix, "journal symlink refused");
        const auto hard = root / "hardlink.jsonl"; fs::create_hard_link(target, hard);
        recording::RecordingJournal hardlink(hard);
        Expect(!hardlink.Open(&error) && Read(target) == prefix, "journal hardlink refused");
        fs::remove(hard);
        recording::RecordingJournal replaced(target); Expect(replaced.Open(&error), "inode pin open");
        fs::rename(target, root / "old-inode.jsonl"); Write(target, "new-inode");
        Expect(!replaced.Append(next, &error) && !replaced.Open(&error) && replaced.Replay().io_error_count == 1 && Read(target) == "new-inode",
               "replacement inode append/reopen/replay refused");
        recording::RecordingCatalog catalog(replaced, {root / "catalog.db", root, false});
        Expect(!catalog.Open(&error), "catalog refuses failed journal Replay");
        fs::create_directory(root / "real-parent"); fs::create_directory_symlink(root / "real-parent", root / "linked-parent");
        recording::RecordingJournal parent_link(root / "linked-parent/journal.jsonl");
        Expect(!parent_link.Open(&error) && !fs::exists(root / "real-parent/journal.jsonl"), "user parent symlink refused");
        recording::RecordingJournal traversal(root / "real-parent/../escape.jsonl");
        Expect(!traversal.Open(&error), "parent traversal refused");
        const auto deleted = root / "deleted-parent/journal.jsonl";
        recording::RecordingJournal reopen(deleted);
        Expect(reopen.Open(&error), "deleted journal initial open");
        fs::remove(deleted);
        Expect(!reopen.Open(&error) && !fs::exists(deleted), "deleted journal reopen does not recreate");
        fs::remove(deleted.parent_path());
        Expect(!reopen.Open(&error) && !fs::exists(deleted.parent_path()), "deleted parent reopen does not recreate");
#if defined(__APPLE__)
        recording::RecordingJournal alias(fs::path("/tmp") / root.filename() / "alias.jsonl");
        Expect(alias.Open(&error) && alias.Append(first, &error) && alias.Replay().mutations.size() == 1, "macOS tmp system alias allowed");
#endif
        const auto bounded_path = root / "oversize.jsonl";
        const std::string oversized(16 * 1024 * 1024 + 1, 'x'); Write(bounded_path, prefix + oversized);
        recording::RecordingJournal bounded(bounded_path);
        Expect(bounded.Open(&error) && !bounded.Append(next, &error) && Read(bounded_path) == prefix + oversized,
               "oversized tail fails closed with original bytes");
    }
    std::cout << "[recording-recovery] pass=" << passed << " fail=" << failed << '\n';
    return failed == 0 ? 0 : 1;
}

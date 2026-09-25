// 독립 B manifest fixture. 실제 journal migration/append/제품 복구 검증이 아니다.
#include "recording/recording_generation_manifest.h"
#include <array>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <limits>
#include <string>
#include <vector>
#if !defined(_WIN32)
#include <fcntl.h>
#include <sys/file.h>
#include <sys/stat.h>
#include <unistd.h>
#endif
#ifndef MEDIA_SERVER_USE_OPENSSL
#define MEDIA_SERVER_USE_OPENSSL 0
#endif
#if MEDIA_SERVER_USE_OPENSSL
#include <openssl/evp.h>
#endif
namespace {
const std::string abc_hash = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
void Write(const std::filesystem::path& path, const std::string& bytes) {
    std::ofstream file(path, std::ios::binary);
    file << bytes;
    if (!file) throw std::runtime_error("fixture write failed");
}
std::string FixtureHash(const std::string& bytes) {
    unsigned char digest[32];unsigned length=0;
    if(EVP_Digest(bytes.data(),bytes.size(),digest,&length,EVP_sha256(),nullptr)!=1||length!=32)
        throw std::runtime_error("fixture digest failed");
    constexpr char hex[]="0123456789abcdef";
    std::string hash;
    for(auto c:digest){hash+=hex[c>>4];hash+=hex[c&15];}
    return hash;
}
#if defined(MEDIA_SERVER_RECORDING_GENERATION_TESTING)
std::filesystem::path immutable_hook_path;
bool immutable_hook_root=false, immutable_hook_ran=false;
void ReplaceImmutableFixture() {
    std::filesystem::rename(immutable_hook_path,immutable_hook_path.string()+".saved");
    if(immutable_hook_root)std::filesystem::create_directory(immutable_hook_path);
    else Write(immutable_hook_path,"abc");
    immutable_hook_ran=true;
}
#endif
#endif
recording::RecordingGenerationManifest Manifest(std::uint64_t generation) {
    recording::RecordingGenerationManifest m;
    m.store_id = "store-test";
    m.generation = generation;
    m.cut_ordinal = generation;
    const auto suffix = std::to_string(generation);
    m.snapshot = {"snapshot-" + suffix + ".jsonl", 3, abc_hash};
    m.active = {"active-" + suffix + ".jsonl", 3, abc_hash};
    m.evidence = {{"evidence-" + suffix + "-0.jsonl", 3, abc_hash}};
    return m;
}
} // namespace
int main() {
    using namespace recording;
    std::array<bool, 14> results{};results.fill(true);
    std::array<unsigned, 14> assertions{};
    const std::array<const char*, 14> names{
        "B02-M01 canonical roundtrip", "B02-M02 invalid values and paths",
        "B02-M03 file binding", "B02-M04 publication",
        "B02-M05 failure preservation and cleanup", "B02-M06 crypto-off",
        "B02-I01 verified immutable bytes", "B02-I02 immutable name and admission",
        "B02-I03 immutable file and root binding", "B02-I04 immutable crypto-off",
        "B02-I05 verified immutable ranges", "B02-I06 immutable range crypto-off",
        "B02-M07 Open-only component boundary", "B02-M08 sealed old active range"};
    const auto check = [&](unsigned group, bool ok, const char* detail) {
        ++assertions[group - 1];
        results[group - 1] = results[group - 1] && ok;
        if (!ok) std::cout << "[assertion] " << names[group - 1] << ": " << detail << '\n';
    };
    std::string error, raw;
    auto manifest = Manifest(1);
    RecordingGenerationManifest parsed;
    RecordingGenerationReadResult read;
#if !MEDIA_SERVER_USE_OPENSSL || defined(_WIN32)
    check(6, !SerializeRecordingGenerationManifest(manifest, &raw, &error) &&
                 error.find("unsupported") != std::string::npos, "serialize unsupported");
    check(6, !ParseRecordingGenerationManifest("{}", &parsed, &error), "parse unsupported");
    check(6, PublishRecordingGenerationManifest("/invalid", manifest, &error) ==
                 RecordingGenerationPublishResult::NotPublished, "publish unsupported");
    check(6, !ReadRecordingGenerationManifest("/invalid", &read, &error), "read unsupported");
    check(13, !ReadRecordingGenerationManifestForOpen("/invalid", &read, &error) &&
        error.find("unsupported") != std::string::npos, "Open-only read unsupported");
    std::string sealed="unchanged";
    check(14,!ReadVerifiedRecordingGenerationSealedActiveRange("/invalid",{"active-1.jsonl",3,abc_hash},
        2,1,1,1,&sealed,&error)&&sealed=="unchanged"&&
        error.find("unsupported")!=std::string::npos,"sealed active unsupported and unchanged");
    std::string immutable="unchanged";
    check(10,!ReadVerifiedRecordingGenerationImmutable("/invalid",manifest.snapshot,3,&immutable,&error)&&
        immutable=="unchanged"&&error.find("unsupported")!=std::string::npos,"immutable unsupported and unchanged");
    check(12,!ReadVerifiedRecordingGenerationImmutableRange("/invalid",manifest.snapshot,1,1,1,&immutable,&error)&&
        immutable=="unchanged"&&error.find("unsupported")!=std::string::npos,"range unsupported and unchanged");
#else
    check(1, SerializeRecordingGenerationManifest(manifest, &raw, &error), "serialize");
    check(1, ParseRecordingGenerationManifest(raw, &parsed, &error), "parse");
    check(1, parsed.store_id == manifest.store_id && parsed.generation == 1 &&
                 parsed.evidence.size() == 1, "decoded fields");
    check(2, !ParseRecordingGenerationManifest(" " + raw, &parsed, &error), "noncanonical");
    auto duplicate = raw;
    duplicate.insert(1, "\"storeId\":\"other\",");
    check(2, !ParseRecordingGenerationManifest(duplicate, &parsed, &error), "duplicate key");
    auto invalid = manifest;
    invalid.evidence.push_back(invalid.evidence.front());
    check(2, !SerializeRecordingGenerationManifest(invalid, &raw, &error), "duplicate evidence");
    invalid = manifest; invalid.active.name = "active-2.jsonl";
    check(2, !SerializeRecordingGenerationManifest(invalid, &raw, &error), "mixed generation");
    invalid = manifest; invalid.snapshot.name = "../snapshot-1.jsonl";
    check(2, !SerializeRecordingGenerationManifest(invalid, &raw, &error), "descriptor traversal");
    invalid = manifest; invalid.generation = 0;
    check(2, !SerializeRecordingGenerationManifest(invalid, &raw, &error), "zero generation");
    invalid = manifest; invalid.snapshot.size = 1024ULL * 1024 * 1024 + 1;
    check(2, !SerializeRecordingGenerationManifest(invalid, &raw, &error), "file size bound");
    invalid = manifest; invalid.evidence.resize(65);
    check(2, !SerializeRecordingGenerationManifest(invalid, &raw, &error), "evidence count bound");
    check(2, !ParseRecordingGenerationManifest(std::string(65537, ' '), &parsed, &error), "manifest size bound");
    SerializeRecordingGenerationManifest(manifest, &raw, &error);
    auto overflow = raw;
    overflow.replace(overflow.find("\"generation\":1"), 14, "\"generation\":18446744073709551616");
    check(2, !ParseRecordingGenerationManifest(overflow, &parsed, &error), "integer overflow");

    const auto parent = std::filesystem::canonical(std::filesystem::temp_directory_path());
    const auto pattern = (parent / "recording-generation-XXXXXX").string();
    std::vector<char> buffer(pattern.begin(), pattern.end()); buffer.push_back('\0');
    const auto created = ::mkdtemp(buffer.data());
    if (!created) { std::cerr << "fixture root failed\n"; return 1; }
    const std::filesystem::path root(created);
    struct stat original{}, original_parent{};
    const bool owned = ::lstat(root.c_str(), &original) == 0 && S_ISDIR(original.st_mode) &&
        original.st_uid == ::geteuid() && ::lstat(parent.c_str(), &original_parent) == 0 &&
        S_ISDIR(original_parent.st_mode);
    check(5, owned, "initial fixture ownership");
    try {
        if (!owned) throw std::runtime_error("fixture ownership unavailable");
        const auto immutable_root=root/"immutable";
        std::filesystem::create_directory(immutable_root);
        std::string immutable;
        for(const char* name:{"snapshot-1.jsonl","identity-1.jsonl","evidence-1-0.jsonl"}) {
            Write(immutable_root/name,"abc");
            check(7,ReadVerifiedRecordingGenerationImmutable(immutable_root,{name,3,abc_hash},3,&immutable,&error)&&
                immutable=="abc","three fixed immutable families");
        }
        Write(immutable_root/"active-1.jsonl","abc");
        std::string sealed;
        const RecordingGenerationFile sealed_file{"active-1.jsonl",3,abc_hash};
        const auto read_sealed=[&](const RecordingGenerationFile& descriptor,
            std::uint64_t current,std::uint64_t offset=1,std::uint64_t length=1,
            std::uint64_t admission=1) {
            return ReadVerifiedRecordingGenerationSealedActiveRange(immutable_root,descriptor,
                current,offset,length,admission,&sealed,&error);
        };
        check(14,read_sealed(sealed_file,2)&&sealed=="b","sealed prior active one range");
        sealed="unchanged";
        check(14,!ReadVerifiedRecordingGenerationImmutableRange(immutable_root,sealed_file,1,1,1,&sealed,&error)&&
            sealed=="unchanged","ordinary immutable API still excludes active");
        for(const auto current:{std::uint64_t{0},std::uint64_t{1}}) {
            sealed="unchanged";
            check(14,!read_sealed(sealed_file,current)&&sealed=="unchanged","current/future active rejected");
        }
        sealed="unchanged";
        check(14,!read_sealed({"active-01.jsonl",3,abc_hash},2)&&sealed=="unchanged","noncanonical active name");
        sealed="unchanged";
        check(14,!read_sealed({"active-1.jsonl",3,std::string(64,'a')},2)&&sealed=="unchanged","sealed hash mismatch");
        sealed="unchanged";
        check(14,!read_sealed({"active-1.jsonl",2,abc_hash},2)&&sealed=="unchanged","sealed exact size");
        sealed="unchanged";
        check(14,!read_sealed(sealed_file,2,1,1,0)&&sealed=="unchanged","sealed admission");
        std::filesystem::create_symlink("active-1.jsonl",immutable_root/"active-2.jsonl");
        sealed="unchanged";
        check(14,!read_sealed({"active-2.jsonl",3,abc_hash},3)&&sealed=="unchanged","sealed file symlink");
        std::filesystem::create_hard_link(immutable_root/"active-1.jsonl",immutable_root/"active-hardlink");
        sealed="unchanged";
        check(14,!read_sealed(sealed_file,2)&&sealed=="unchanged","sealed file hardlink");
        std::filesystem::remove(immutable_root/"active-hardlink");
        Write(immutable_root/"identity-2.jsonl","");
        check(7,ReadVerifiedRecordingGenerationImmutable(immutable_root,{"identity-2.jsonl",0,
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"},1,&immutable,&error)&&immutable.empty(),"empty immutable digest");
        const auto reject_immutable=[&](const RecordingGenerationFile& file,std::uint64_t admission=3) {
            immutable="unchanged";
            return !ReadVerifiedRecordingGenerationImmutable(immutable_root,file,admission,&immutable,&error)&&immutable=="unchanged";
        };
        for(const char* name:{"active-1.jsonl","../identity-1.jsonl","/identity-1.jsonl","identity-0.jsonl",
            "identity-01.jsonl","snapshot-+1.jsonl","evidence-1-00.jsonl","evidence-1--1.jsonl",
            "identity-18446744073709551616.jsonl","evidence-1-18446744073709551616.jsonl"})
            check(8,reject_immutable({name,3,abc_hash}),"unsafe/noncanonical basename");
        check(8,reject_immutable({"identity-1.jsonl",3,abc_hash},2),"caller byte admission");
        check(8,reject_immutable({"identity-1.jsonl",0,abc_hash},0),"zero admission");
        check(8,reject_immutable({"identity-1.jsonl",1024ULL*1024*1024+1,abc_hash},1024ULL*1024*1024+1),"1GiB bound before allocation");
        check(8,reject_immutable({"identity-1.jsonl",3,std::string(64,'A')}),"lowercase digest");
        check(9,reject_immutable({"identity-1.jsonl",2,abc_hash}),"exact file size");
        check(9,reject_immutable({"identity-1.jsonl",3,std::string(64,'a')}),"digest mismatch");
        check(9,reject_immutable({"identity-9.jsonl",3,abc_hash}),"missing file");
        std::filesystem::create_symlink("identity-1.jsonl",immutable_root/"identity-3.jsonl");
        check(9,reject_immutable({"identity-3.jsonl",3,abc_hash}),"file symlink");
        std::filesystem::create_hard_link(immutable_root/"identity-1.jsonl",immutable_root/"hardlink");
        check(9,reject_immutable({"identity-1.jsonl",3,abc_hash}),"file hardlink");
        std::filesystem::remove(immutable_root/"hardlink");
        std::filesystem::create_directory(immutable_root/"identity-4.jsonl");
        check(9,reject_immutable({"identity-4.jsonl",0,abc_hash}),"nonregular directory");
        std::filesystem::create_directory_symlink(immutable_root,root/"immutable-alias");
        immutable="unchanged";
        check(9,!ReadVerifiedRecordingGenerationImmutable(root/"immutable-alias",{"identity-1.jsonl",3,abc_hash},3,&immutable,&error)&&
            immutable=="unchanged","root symlink");
        sealed="unchanged";
        check(14,!ReadVerifiedRecordingGenerationSealedActiveRange(root/"immutable-alias",sealed_file,
            2,1,1,1,&sealed,&error)&&sealed=="unchanged","sealed active root symlink");
#if defined(MEDIA_SERVER_RECORDING_GENERATION_TESTING)
        immutable_hook_path=immutable_root/"identity-1.jsonl";immutable_hook_root=false;immutable_hook_ran=false;
        RecordingGenerationImmutableBeforeBindingForTest(ReplaceImmutableFixture);
        check(9,reject_immutable({"identity-1.jsonl",3,abc_hash})&&immutable_hook_ran,"same-bytes inode replacement after read");
        std::filesystem::remove(immutable_hook_path);
        std::filesystem::rename(immutable_hook_path.string()+".saved",immutable_hook_path);
        immutable_hook_path=immutable_root/"active-1.jsonl";immutable_hook_root=false;immutable_hook_ran=false;
        RecordingGenerationImmutableBeforeBindingForTest(ReplaceImmutableFixture);
        sealed="unchanged";
        check(14,!read_sealed(sealed_file,2)&&sealed=="unchanged"&&immutable_hook_ran,
            "sealed active final inode binding");
        std::filesystem::remove(immutable_hook_path);
        std::filesystem::rename(immutable_hook_path.string()+".saved",immutable_hook_path);
        immutable_hook_path=immutable_root;immutable_hook_root=true;immutable_hook_ran=false;
        RecordingGenerationImmutableBeforeBindingForTest(ReplaceImmutableFixture);
        check(9,reject_immutable({"identity-1.jsonl",3,abc_hash})&&immutable_hook_ran,"root replacement after read");
        std::filesystem::remove(immutable_hook_path);
        std::filesystem::rename(immutable_hook_path.string()+".saved",immutable_hook_path);
#else
        check(9,false,"fixture requires immutable binding hook");
#endif
        std::string large(131072,'x');large.replace(65530,16,"0123456789abcdef");
        const RecordingGenerationFile range_file{"evidence-5-0.jsonl",static_cast<std::uint64_t>(large.size()),FixtureHash(large)};
        Write(immutable_root/range_file.name,large);
        check(11,ReadVerifiedRecordingGenerationImmutableRange(immutable_root,range_file,65530,16,16,&immutable,&error)&&
            immutable=="0123456789abcdef","cross-block range with admission smaller than file");
        check(11,ReadVerifiedRecordingGenerationImmutableRange(immutable_root,range_file,large.size()-1,1,1,&immutable,&error)&&
            immutable=="x","last byte");
        check(11,ReadVerifiedRecordingGenerationImmutableRange(immutable_root,range_file,large.size(),0,0,&immutable,&error)&&
            immutable.empty(),"empty EOF range still validates file");
        check(11,ReadVerifiedRecordingGenerationImmutableRange(immutable_root,range_file,0,large.size(),large.size(),&immutable,&error)&&
            immutable==large,"full range parity");
        const auto reject_range=[&](const RecordingGenerationFile& file,std::uint64_t offset,std::uint64_t length,std::uint64_t admission) {
            immutable="unchanged";
            return !ReadVerifiedRecordingGenerationImmutableRange(immutable_root,file,offset,length,admission,&immutable,&error)&&
                immutable=="unchanged";
        };
        check(11,reject_range(range_file,large.size()+1,0,0),"offset past EOF");
        check(11,reject_range(range_file,large.size(),1,1),"range past EOF");
        check(11,reject_range(range_file,std::numeric_limits<std::uint64_t>::max(),1,1),"offset overflow");
        check(11,reject_range(range_file,1,std::numeric_limits<std::uint64_t>::max(),std::numeric_limits<std::uint64_t>::max()),"length overflow");
        check(11,reject_range(range_file,65530,16,15),"result admission");
        auto excessive=range_file;excessive.size=1024ULL*1024*1024+1;
        check(11,reject_range(excessive,0,1,1),"descriptor limit before large allocation");
        auto corrupted=large;corrupted.back()='y';Write(immutable_root/range_file.name,corrupted);
        check(11,reject_range(range_file,65530,16,16),"corruption outside requested range");
        check(11,reject_range(range_file,0,0,0),"empty range does not bypass full digest");
        Write(immutable_root/range_file.name,large);
        check(11,reject_range({"identity-3.jsonl",3,abc_hash},1,1,1),"range file symlink");
        std::filesystem::create_hard_link(immutable_root/range_file.name,immutable_root/"range-hardlink");
        check(11,reject_range(range_file,1,1,1),"range file hardlink");
        std::filesystem::remove(immutable_root/"range-hardlink");
#if defined(MEDIA_SERVER_RECORDING_GENERATION_TESTING)
        immutable_hook_path=immutable_root/"identity-1.jsonl";immutable_hook_root=false;immutable_hook_ran=false;
        RecordingGenerationImmutableBeforeBindingForTest(ReplaceImmutableFixture);
        check(11,reject_range({"identity-1.jsonl",3,abc_hash},1,1,1)&&immutable_hook_ran,"range final inode binding");
        std::filesystem::remove(immutable_hook_path);
        std::filesystem::rename(immutable_hook_path.string()+".saved",immutable_hook_path);
        immutable_hook_path=immutable_root;immutable_hook_root=true;immutable_hook_ran=false;
        RecordingGenerationImmutableBeforeBindingForTest(ReplaceImmutableFixture);
        check(11,reject_range(range_file,65530,16,16)&&immutable_hook_ran,"range final root binding");
        std::filesystem::remove(immutable_hook_path);
        std::filesystem::rename(immutable_hook_path.string()+".saved",immutable_hook_path);
#else
        check(11,false,"fixture requires range binding hook");
#endif
        for (std::uint64_t generation : {1, 2, 3}) {
            const auto item = Manifest(generation);
            Write(root / item.snapshot.name, "abc"); Write(root / item.active.name, "abc");
            Write(root / item.evidence.front().name, "abc");
        }
        const auto publish = [&](const RecordingGenerationManifest& m) {
            return PublishRecordingGenerationManifest(root, m, &error);
        };
        const auto reread = [&] { return ReadRecordingGenerationManifest(root, &read, &error); };
        using Result = RecordingGenerationPublishResult;
        check(4, publish(manifest) == Result::Published, "first publish");
        check(4, reread(), "first read");
        check(4, read.manifest.generation == 1 && read.active_tail_bytes == 0 &&
            read.validation == RecordingGenerationValidation::PrefixOnly, "prefix-only result");
        RecordingGenerationReadResult open_read;
        const auto read_open = [&] {
            return ReadRecordingGenerationManifestForOpen(root, &open_read, &error);
        };
        check(13, read_open() && open_read.manifest.generation == 1 &&
            open_read.validation == RecordingGenerationValidation::OpenComponentsOnly,
            "Open-only manifest/snapshot/active prefix");
        std::filesystem::remove(root / manifest.evidence.front().name);
        check(13, read_open(), "cold evidence raw is deferred");
        check(13, !reread(), "full reader still rejects missing evidence");
        Write(root / manifest.evidence.front().name, "abc");
        check(13, reread(), "full reader restored");
        check(5, publish(manifest) == Result::NotPublished, "same generation");
        auto next = Manifest(2); next.store_id = "other";
        check(5, publish(next) == Result::NotPublished, "different store");
        next = Manifest(2); next.cut_ordinal = 0;
        check(5, publish(next) == Result::NotPublished, "cut regression");
        next = Manifest(2);
        Write(root / next.snapshot.name, "abd");
        check(3, publish(next) == Result::NotPublished, "same-size corruption");
        check(5, reread() && read.manifest.generation == 1, "old manifest preserved");
        Write(root / next.snapshot.name, "abc");
        std::filesystem::remove(root / next.evidence.front().name);
        check(3, publish(next) == Result::NotPublished, "missing evidence");
        std::filesystem::create_symlink(root / manifest.snapshot.name, root / next.evidence.front().name);
        check(3, publish(next) == Result::NotPublished, "symlink component");
        std::filesystem::remove(root / next.evidence.front().name);
        Write(root / next.evidence.front().name, "abc");
        Write(root / ".recording-generation.stage", "partial");
        check(5, publish(next) == Result::NotPublished, "interrupted stage blocks publish");
        check(5, std::filesystem::file_size(root / ".recording-generation.stage") == 7, "stage retained");
        check(5, reread() && read.manifest.generation == 1, "committed read after interruption");
        std::filesystem::remove(root / ".recording-generation.stage");
        const int lock = ::open((root / ".recording-generation.lock").c_str(), O_RDWR);
        check(5, lock >= 0 && ::flock(lock, LOCK_EX | LOCK_NB) == 0, "fixture publisher lock");
        check(5, publish(next) == Result::NotPublished, "competing publisher blocked");
        if (lock >= 0) ::close(lock);
        check(2, !ReadRecordingGenerationManifest(root / ".." / root.filename(), &read, &error), "root traversal");
        std::filesystem::create_directory_symlink(root, root / "alias");
        check(2, !ReadRecordingGenerationManifest(root / "alias", &read, &error), "symlink root");
        std::filesystem::remove(root / "alias");
        Write(root / manifest.active.name, "abcunvalidated-tail");
        check(3, reread() && read.active_tail_bytes == 16 &&
            read.validation == RecordingGenerationValidation::PrefixOnly, "appended tail unvalidated");
        Write(root / next.active.name, "abcnew-tail");
        check(4, publish(next) == Result::Published, "rotation accepts active tails");
        check(4, reread() && read.manifest.generation == 2 && read.active_tail_bytes == 8, "tail reported");
        check(4, !std::filesystem::exists(root / ".recording-generation.stage"), "stage renamed");
        Write(root / next.active.name, "ab");
        check(3, !reread(), "truncated prefix rejected");
        open_read.manifest.generation = 999;
        check(13, !read_open() && open_read.manifest.generation == 999,
            "Open-only truncated prefix rejected without partial output");
        Write(root / next.active.name, "abdnew-tail");
        check(3, !reread(), "prefix hash corruption rejected");
        Write(root / next.active.name, "abc"); Write(root / next.snapshot.name, "abd");
        read.manifest.generation = 999;
        check(3, !reread(), "snapshot corruption rejected");
        check(3, read.manifest.generation == 999, "no partial read output");
        check(13, !read_open() && open_read.manifest.generation == 999,
            "Open-only snapshot corruption rejected without partial output");
        Write(root / next.snapshot.name, "abc");
        std::filesystem::create_hard_link(root / next.snapshot.name, root / "hardlink");
        check(3, !reread(), "hardlink rejected");
        std::filesystem::remove(root / "hardlink");
#if defined(MEDIA_SERVER_RECORDING_GENERATION_TESTING)
        RecordingGenerationFailNextDirectorySyncForTest();
        check(4, publish(Manifest(3)) == Result::DurabilityUncertain, "post-rename fsync failure uncertain");
        check(4, reread() && read.manifest.generation == 3, "uncertain result reopens new generation");
#else
        check(4, false, "fixture requires MEDIA_SERVER_RECORDING_GENERATION_TESTING");
#endif
        std::filesystem::remove(root / "recording-generation.json");
        std::filesystem::create_symlink(root / next.snapshot.name, root / "recording-generation.json");
        check(3, !reread(), "symlink manifest rejected");
    } catch (const std::exception& exception) {
        std::cerr << exception.what() << '\n';
        for (unsigned group : {3, 4, 5, 7, 8, 9, 11, 13, 14}) check(group, false, "fixture aborted");
    }
    struct stat current{}, current_parent{};
    const bool still_owned = owned && root.parent_path() == parent &&
        root.filename().string().rfind("recording-generation-", 0) == 0 &&
        ::lstat(parent.c_str(), &current_parent) == 0 && S_ISDIR(current_parent.st_mode) &&
        current_parent.st_dev == original_parent.st_dev && current_parent.st_ino == original_parent.st_ino &&
        ::lstat(root.c_str(), &current) == 0 && S_ISDIR(current.st_mode) &&
        current.st_dev == original.st_dev && current.st_ino == original.st_ino &&
        current.st_uid == original.st_uid && current.st_uid == ::geteuid();
    std::error_code cleanup;
    if (still_owned) std::filesystem::remove_all(root, cleanup);
    check(5, still_owned && !cleanup && !std::filesystem::exists(root), "owned root cleanup");
#endif
    unsigned passed = 0, failed = 0;
    for (std::size_t i = 0; i < results.size(); ++i) {
        if (!assertions[i]) continue;
        (results[i] ? passed : failed)++;
        std::cout << (results[i] ? "[pass] " : "[fail] ") << names[i]
                  << " assertions=" << assertions[i] << '\n';
    }
    std::cout << "[summary] pass=" << passed << " fail=" << failed << '\n';
    return failed ? 1 : 0;
}
